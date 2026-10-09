import { gsap } from 'gsap';
import { beanSvg, type Accessory, type Expr } from '../art/bean';
import { el, P } from '../art/kit';

/** Điều khiển 1 nhân vật hạt đậu: vào/ra, thở, chớp mắt, đổi biểu cảm (pose cứng). */
export class Bean {
  g: SVGGElement;
  private body: SVGGElement;
  private idleTl?: gsap.core.Timeline;
  private blinkCall?: gsap.core.Tween;
  private expr: Expr = 'idle';
  private alive = true;

  constructor(parent: SVGGElement, spec: { color: string; acc: string[] }, public x: number, public y: number, scale = 1) {
    this.g = el('g', { class: 'bean-root' });
    this.g.innerHTML = beanSvg({ color: spec.color, acc: spec.acc as Accessory[] });
    parent.appendChild(this.g);
    this.body = this.g.querySelector('.bean-body') as SVGGElement;
    gsap.set(this.g, { x, y, scale });
    this.setExpr('idle');
    this.startIdle();
  }

  setExpr(e: Expr) {
    this.expr = e;
    this.g.querySelectorAll<SVGGElement>('.face').forEach((f) => (f.style.display = f.classList.contains(`face-${e}`) ? '' : 'none'));
    const eyesHidden = e === 'ecstatic' || e === 'glow';
    const eyes = this.g.querySelector<SVGGElement>('.eyes');
    if (eyes) eyes.style.display = eyesHidden ? 'none' : '';
  }

  get current() {
    return this.expr;
  }

  /** Nhìn về một điểm (toạ độ cảnh) — đồng tử nhảy cóc, không trượt. */
  look(tx: number, ty: number) {
    const dx = Math.max(-1, Math.min(1, (tx - this.x) / 160));
    const dy = Math.max(-1, Math.min(1, (ty - (this.y - 140)) / 160));
    gsap.set(this.g.querySelectorAll('.pupil'), { x: dx * 5, y: dy * 5 });
  }

  private startIdle() {
    this.idleTl = gsap.timeline({ repeat: -1, yoyo: true });
    this.idleTl.to(this.body, { scaleY: 1.03, scaleX: 0.985, duration: 0.9 + Math.random() * 0.3, ease: 'sine.inOut', transformOrigin: '50% 100%' });
    const blink = () => {
      if (!this.alive) return;
      const lids = this.g.querySelectorAll('.lid');
      const twice = Math.random() < 0.15;
      const tl = gsap.timeline();
      tl.set(lids, { attr: { transform: 'scale(1 1)' } }).set(lids, { attr: { transform: 'scale(1 0)' } }, 0.09);
      if (twice) tl.set(lids, { attr: { transform: 'scale(1 1)' } }, 0.2).set(lids, { attr: { transform: 'scale(1 0)' } }, 0.29);
      this.blinkCall = gsap.delayedCall(2 + Math.random() * 3, blink);
    };
    this.blinkCall = gsap.delayedCall(1 + Math.random() * 2, blink);
  }

  /** Bước vào: nhảy cóc từ ngoài khung (on twos). */
  enter(fromX: number): Promise<void> {
    gsap.set(this.g, { x: fromX });
    return new Promise((res) => {
      const tl = gsap.timeline({ onComplete: res });
      const hops = 4;
      for (let i = 1; i <= hops; i++) {
        const x = fromX + ((this.x - fromX) * i) / hops;
        tl.to(this.g, { x, duration: 0.16, ease: 'steps(2)' })
          .to(this.body, { scaleY: 1.12, scaleX: 0.92, y: -14, duration: 0.08, ease: 'steps(1)', transformOrigin: '50% 100%' }, '<')
          .to(this.body, { scaleY: 0.9, scaleX: 1.1, y: 0, duration: 0.08, ease: 'steps(1)' });
      }
      tl.to(this.body, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'elastic.out(1,0.4)' });
    });
  }

  exit(toX: number): Promise<void> {
    this.fidgetOff = true;
    return new Promise((res) => {
      const tl = gsap.timeline({ onComplete: () => { this.destroy(); res(); } });
      const from = this.x;
      for (let i = 1; i <= 3; i++) {
        tl.to(this.g, { x: from + ((toX - from) * i) / 3, duration: 0.14, ease: 'steps(2)' })
          .to(this.body, { scaleY: 1.12, scaleX: 0.9, y: -16, duration: 0.07, ease: 'steps(1)', transformOrigin: '50% 100%' }, '<')
          .to(this.body, { scaleY: 0.9, scaleX: 1.1, y: 0, duration: 0.07, ease: 'steps(1)' });
      }
    });
  }

  private fidgetOff = false;
  /** Cử động vặt khi chờ: liếc, gõ tay, nhìn đồng hồ, ngáp. */
  startFidget(getPointer: () => { x: number; y: number } | null) {
    const loop = () => {
      if (!this.alive || this.fidgetOff) return;
      const r = Math.random();
      const p = getPointer();
      if (p && r < 0.45) this.look(p.x, p.y);
      else if (r < 0.6) {
        const arm = this.g.querySelector('.arm-l');
        gsap.timeline().to(arm, { rotation: 25, duration: 0.08, ease: 'steps(1)', transformOrigin: '0 0' }).to(arm, { rotation: 15, duration: 0.08, ease: 'steps(1)' }).to(arm, { rotation: 25, duration: 0.08, ease: 'steps(1)' }).to(arm, { rotation: 0, duration: 0.1, ease: 'steps(1)' });
      } else if (r < 0.75) {
        this.look(20, 20);
      } else if (r < 0.85 && this.expr === 'idle') {
        this.setExpr('shock');
        gsap.delayedCall(0.5, () => { if (this.expr === 'shock') this.setExpr('idle'); });
      } else this.look(this.x, this.y - 100);
      gsap.delayedCall(1.4 + Math.random() * 2.6, loop);
    };
    gsap.delayedCall(1.5, loop);
  }

  /** Nhăn mặt nhẹ (vd khi độc tăng). */
  wince() {
    if (this.fidgetOff) return;
    const keep = this.expr;
    this.setExpr('disgust');
    gsap.fromTo(this.body, { scaleX: 1.06, scaleY: 0.95, transformOrigin: '50% 100%' }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1,0.4)' });
    gsap.delayedCall(0.6, () => { if (this.expr === 'disgust') this.setExpr(keep); });
  }

  /** Nheo mắt nghi ngờ + run rẩy (trước khi bùng biểu cảm). */
  squint(): gsap.core.Timeline {
    this.fidgetOff = true;
    this.setExpr('meh');
    const tl = gsap.timeline();
    for (let i = 0; i < 4; i++) tl.to(this.body, { x: i % 2 ? 1.8 : -1.8, duration: 0.05, ease: 'steps(1)' });
    tl.to(this.body, { x: 0, duration: 0.05 }).to({}, { duration: 0.15 });
    return tl;
  }

  /** Bùng biểu cảm: squash → stretch → đàn hồi. */
  burst(e: Expr) {
    this.setExpr(e);
    gsap.timeline()
      .to(this.body, { scaleX: 1.25, scaleY: 0.8, duration: 0.06, ease: 'steps(1)', transformOrigin: '50% 100%' })
      .to(this.body, { scaleX: 0.85, scaleY: 1.18, duration: 0.1, ease: 'steps(1)' })
      .to(this.body, { scaleX: 1, scaleY: 1, duration: 0.4, ease: 'elastic.out(1,0.35)' });
  }

  /** Cầm đồ vật (chuỗi SVG, tâm ở bàn tay) ở tay trái / phải. */
  holdProp(side: 'l' | 'r', svgInner: string) {
    const arm = this.g.querySelector(side === 'l' ? '.arm-l' : '.arm-r') as SVGGElement;
    const j = el('g', { class: 'held-prop', transform: `translate(${side === 'l' ? -16 : 16} 44)` });
    j.innerHTML = svgInner;
    arm.appendChild(j);
    return j;
  }

  /** Cầm hũ trên tay phải. */
  holdJar(svgInner: string) {
    const arm = this.g.querySelector('.arm-r') as SVGGElement;
    const j = el('g', { class: 'held-jar', transform: 'translate(16 40) rotate(0)' });
    j.innerHTML = `<svg x="-26" y="-34" width="52" height="52" viewBox="0 0 80 80">${svgInner}</svg>`;
    arm.appendChild(j);
    return j;
  }

  /** T19: vệt kem quẹt lên 2 gò má (giữa mắt và miệng, lệch ra 2 bên), quẹt má phải trước rồi má trái. */
  smear(color: string) {
    const head = this.g.querySelector('.head')!;
    const s = el('g', { class: 'smear' });
    const one = (x: number, flip: number) => `<g transform="translate(${x} -119) scale(${flip} 1)">
      <path d="M -9 -2 q 9 -6 19 -2 q 3 3 -1 5 q -4 2 -4 6 q -2 4 -4 0 q -1 -3 -4 -4 q -5 0 -7 -1 q -2 -2 1 -4 z" fill="${color}" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M -5 -3 q 5 -2 10 -1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/></g>`;
    s.innerHTML = `<g class="sm-r">${one(38, 1)}</g><g class="sm-l">${one(-38, -1)}</g>`;
    head.appendChild(s);
    gsap.from(s.querySelector('.sm-r'), { scaleX: 0, transformOrigin: '30px -119px', duration: 0.16, ease: 'power2.out' });
    gsap.from(s.querySelector('.sm-l'), { scaleX: 0, transformOrigin: '-30px -119px', duration: 0.16, delay: 0.14, ease: 'power2.out' });
    return s;
  }

  /** T32/T33: vẽ lớp da (bệnh / lỗi) lên mặt — nằm dưới mắt, miệng, phụ kiện. Gọi lại để thay. */
  setSkin(layers: string, fade = false) {
    const head = this.g.querySelector('.head')!;
    const old = head.querySelector(':scope > .skin-wrap');
    const w = el('g', { class: 'skin-wrap' });
    w.innerHTML = layers;
    head.insertBefore(w, head.firstChild);
    if (fade) {
      gsap.fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      if (old) gsap.to(old, { opacity: 0, duration: 0.5, onComplete: () => old.remove() });
    } else old?.remove();
  }

  /** Mặt nhọ (sau vụ nổ). */
  soot() {
    const head = this.g.querySelector('.head')!;
    const s = el('g', { class: 'soot' });
    s.innerHTML = `<ellipse cx="0" cy="-130" rx="50" ry="44" fill="#3A2E2A" opacity=".55"/>
      <path d="M -40 -186 l 6 -22 l 8 18 l 6 -24 l 8 22 l 8 -20 l 6 22 l 8 -18 l 6 22" stroke="#3A2E2A" stroke-width="5" fill="none" stroke-linejoin="round"/>`;
    head.insertBefore(s, head.firstChild);
    gsap.to(s, { opacity: 0, duration: 0.8, delay: 2.4, onComplete: () => s.remove() });
  }

  /** Nhảy "mừng" / "giật mình". */
  hop(height = 20, squash = 1.15) {
    gsap.timeline()
      .to(this.body, { scaleY: 0.85, scaleX: 1.12, duration: 0.06, ease: 'steps(1)', transformOrigin: '50% 100%' })
      .to(this.body, { y: -height, scaleY: squash, scaleX: 1 / squash, duration: 0.14, ease: 'power2.out' })
      .to(this.body, { y: 0, scaleY: 1, scaleX: 1, duration: 0.3, ease: 'bounce.out' });
  }

  shakeNo() {
    gsap.timeline().to(this.body, { rotation: -6, duration: 0.07, ease: 'steps(1)', transformOrigin: '50% 100%' })
      .to(this.body, { rotation: 6, duration: 0.07, ease: 'steps(1)' }).repeat(2).yoyo(true)
      .then(() => gsap.set(this.body, { rotation: 0 }));
  }

  /** Nói: miệng mở/đóng xen kẽ theo nhịp. */
  talk(ms = 1400) {
    const keep = this.expr === 'talk' ? 'idle' : this.expr;
    if (keep !== 'idle') {
      // biểu cảm đặc biệt: giữ mặt, chỉ nhún người theo nhịp nói
      gsap.fromTo(this.body, { y: 0 }, { y: -4, duration: 0.12, yoyo: true, repeat: Math.max(1, Math.round(ms / 240)), ease: 'steps(1)' });
      return;
    }
    const n = Math.max(2, Math.round(ms / 160));
    const tl = gsap.timeline();
    for (let i = 0; i < n; i++) tl.call(() => this.setExpr(i % 2 ? keep : 'talk'), [], i * 0.16);
    tl.call(() => this.setExpr(keep), [], n * 0.16);
  }

  /** Lớp phát sáng (bật tông quá đà) — vầng sáng sau lưng. */
  glow() {
    const halo = el('g');
    halo.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return `<path d="M 0 -120 L ${Math.cos(a) * 130} ${-120 + Math.sin(a) * 130} L ${Math.cos(a + 0.18) * 130} ${-120 + Math.sin(a + 0.18) * 130} Z" fill="${P.white}" opacity=".6"/>`;
    }).join('');
    this.g.insertBefore(halo, this.g.firstChild);
    gsap.fromTo(halo, { scale: 0, transformOrigin: '0px -120px' }, { scale: 1, rotation: 30, duration: 0.6, ease: 'back.out(2)' });
    gsap.to(halo, { rotation: '+=360', duration: 8, repeat: -1, ease: 'none', transformOrigin: '0px -120px' });
  }

  /** Mặt đỏ phồng (kích ứng). */
  swell() {
    gsap.timeline()
      .to(this.body, { scaleX: 1.18, scaleY: 1.06, duration: 0.08, ease: 'steps(1)', transformOrigin: '50% 100%' })
      .to(this.body, { scaleX: 1.35, scaleY: 1.12, duration: 0.6, ease: 'elastic.out(1,0.3)' })
      .to(this.body, { scaleX: 1.12, scaleY: 1.04, duration: 0.8, ease: 'power2.inOut' });
    gsap.to(this.g.querySelector('.silhouette'), { attr: { fill: '#F2675A' }, duration: 0.01, delay: 0.16 });
  }

  destroy() {
    this.alive = false;
    this.idleTl?.kill();
    this.blinkCall?.kill();
    gsap.killTweensOf(this.body);
    this.g.remove();
  }
}
