import { gsap } from 'gsap';
import { beanSvg, type Accessory } from '../art/bean';
import { P } from '../art/kit';
import { jarSvg } from './jar';
import { sfx, unlockAudio, isMuted, setMuted } from './audio';
import '../styles/title-morning.css';
import { ex, watchLayout } from './stage';
import { canOfferInstall, installApp, INSTALL_ICON, onInstallChange } from './install';
import { openCloud } from './cloud';

/** Tâm hũ kem trên màn tiêu đề — tia sáng xoay quanh đúng điểm này. */
const JAR_C: [number, number] = [195, 440];

/** Path bánh răng 8 răng + lỗ tròn giữa (evenodd), tâm (0,0). */
function gearPath(rOut = 15.5, rIn = 11.5, hole = 5.2): string {
  const pts: string[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * 45 * Math.PI) / 180;
    for (const [da, r] of [[-15, rIn], [-9, rOut], [9, rOut], [15, rIn]] as const) {
      const t = a + (da * Math.PI) / 180;
      pts.push(`${(Math.cos(t) * r).toFixed(2)} ${(Math.sin(t) * r).toFixed(2)}`);
    }
  }
  return `M ${pts.join(' L ')} Z M ${hole} 0 A ${hole} ${hole} 0 1 0 ${-hole} 0 A ${hole} ${hole} 0 1 0 ${hole} 0 Z`;
}

/** Nút bánh răng cài đặt góc trên trái (dùng chung màn tiêu đề + buổi sáng): bấm mở bảng bật/tắt tiếng. */
export function settingsGear(host: HTMLElement): HTMLElement {
  const w = document.createElement('div');
  w.className = 'gear-wrap';
  w.innerHTML = `<button class="gear-btn" aria-label="Cài đặt"><svg viewBox="-18 -18 36 36" width="34" height="34"><g class="gear-rot"><path d="${gearPath()}" fill="${P.yellow}" fill-rule="evenodd" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/></g></svg></button>
    <div class="gear-pop" hidden><div class="gp-h">Cài đặt</div><button class="gp-mute"></button>
      <button class="gp-mute gp-cloud">Lưu lên mây</button>
      <button class="gp-mute gp-install">Lưu vào màn hình chính</button></div>`;
  host.appendChild(w);
  const btn = w.querySelector('.gear-btn') as HTMLButtonElement;
  const pop = w.querySelector('.gear-pop') as HTMLElement;
  const mute = w.querySelector('.gp-mute') as HTMLButtonElement;
  const paint = () => {
    mute.textContent = isMuted() ? 'Âm thanh: TẮT' : 'Âm thanh: BẬT';
    mute.classList.toggle('off', isMuted());
  };
  paint();
  const close = () => { pop.hidden = true; };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    gsap.fromTo(w.querySelector('.gear-rot'), { rotation: 0 }, { rotation: 90, duration: 0.4, ease: 'back.out(2)', svgOrigin: '0 0' });
    pop.hidden = !pop.hidden;
    if (!pop.hidden) gsap.fromTo(pop, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)', transformOrigin: '0% 0%' });
    sfx('click');
  });
  mute.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudio();
    setMuted(!isMuted());
    paint();
    sfx('click');
  });
  const inst = w.querySelector('.gp-install') as HTMLButtonElement;
  const offInst = onInstallChange(() => { if (!w.isConnected) offInst(); else paintInst(); });
  const paintInst = () => { inst.hidden = !canOfferInstall(); };
  paintInst();
  inst.addEventListener('click', (e) => { e.stopPropagation(); close(); installApp(host); });
  w.querySelector('.gp-cloud')!.addEventListener('click', (e) => { e.stopPropagation(); close(); sfx('click'); openCloud(host); });
  pop.addEventListener('pointerdown', (e) => e.stopPropagation());
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  host.addEventListener('pointerdown', close);
  return w;
}

/** Đỉnh vạch kem (toạ độ trong .ts-logo, không bị transform ảnh hưởng). */
function dripTop(d: HTMLElement) {
  const logo = d.querySelector('.ts-logo') as HTMLElement;
  const drip = d.querySelector('.ts-drip') as SVGSVGElement;
  const k = logo.getBoundingClientRect().width / logo.offsetWidth;
  return (drip.getBoundingClientRect().top - logo.getBoundingClientRect().top) / k;
}

/** Màn tiêu đề. */
export function showTitle(modal: HTMLElement, o: { canContinue: boolean; day: number; onNew: () => void; onContinue: () => void }) {
  const d = document.createElement('div');
  d.className = 'title-screen';
  const beans: [string, Accessory[], number, number, number, string][] = [
    ['#FF8A3D', ['non_bao_hiem'], 60, 990, 0.95, 'happy'],
    ['#B9A3F0', ['khau_trang', 'kep_cang_cua'], 196, 1010, 1.1, 'shock'],
    ['#7FDCC6', ['toc_uon', 'vong_vang', 'kinh_ram'], 330, 995, 1, 'glow'],
  ];
  d.innerHTML = `
    <svg class="ts-bg" viewBox="0 0 390 844" width="390" height="844">
      <defs><pattern id="ts-tile" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="#FFD9E6"/><path d="M24 4 L44 24 L24 44 L4 24 Z" fill="#FFC2D6"/><circle cx="24" cy="24" r="5" fill="#FF8DB0"/></pattern></defs>
      <rect y="-500" width="390" height="1900" fill="url(#ts-tile)"/>
      <g class="ts-rays-pos"><g class="ts-rays">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; const [cx, cy] = JAR_C; return `<path d="M${cx} ${cy} L ${(cx + Math.cos(a) * 700).toFixed(1)} ${(cy + Math.sin(a) * 700).toFixed(1)} L ${(cx + Math.cos(a + 0.2) * 700).toFixed(1)} ${(cy + Math.sin(a + 0.2) * 700).toFixed(1)} Z" fill="#fff" opacity=".35"/>`; }).join('')}</g></g>
      <g class="ts-jar-pos" transform="translate(${JAR_C[0]} ${JAR_C[1]}) scale(.95)"><g class="ts-jar"><g class="ts-bob">
        <g transform="translate(-110 -130) scale(2.75)">${jarSvg('ma_vang', '#FFF0F5', 'decal')}</g>
        <g class="jar-face" transform="translate(0 -64)">
          <ellipse cx="-26" cy="-6" rx="11" ry="13" fill="#fff" stroke="${P.ink}" stroke-width="3"/><circle cx="-23" cy="-3" r="5" fill="${P.ink}"/>
          <ellipse cx="26" cy="-6" rx="11" ry="13" fill="#fff" stroke="${P.ink}" stroke-width="3"/><circle cx="29" cy="-3" r="5" fill="${P.ink}"/>
          <path d="M -9 4 q 9 9 18 0" stroke="${P.ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        </g>
      </g></g></g>
      <g class="ts-beans">${beans.map(([c, acc, x, y, sc, e]) => `<g transform="translate(${x} ${y}) scale(${sc})"><g class="ts-bean">${beanSvg({ color: c, acc }).replace(`face-${e}" style="display:none"`, `face-${e}"`)}</g></g>`).join('')}</g>
    </svg>
    <div class="ts-logo">
      <div class="ts-k">KEM</div><div class="ts-t">TR<span class="ts-o">Ô</span>N</div>
      <svg class="ts-drip" viewBox="0 0 300 40" width="300" height="40"><path d="M 0 0 H 300 V 6 q -10 0 -12 14 q -2 14 -10 0 q -4 -12 -20 -8 q -10 4 -10 24 q -2 14 -12 0 q -4 -24 -30 -20 q -16 4 -16 12 q -4 10 -12 0 q -6 -12 -34 -10 q -20 2 -22 22 q -4 12 -12 0 q -4 -20 -30 -16 q -14 2 -16 6 q -4 10 -12 0 q -8 -14 -20 -8 q -14 -14 -32 -16 V 0 Z" fill="#FFF0F5" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/></svg>
      <span class="ts-dot"></span>
      <div class="ts-sub">tiệm kem nhà làm <i>(có tâm?)</i></div>
    </div>
    <div class="ts-btns">
      ${o.canContinue ? `<button class="b-cont">Bán tiếp — ngày ${o.day}</button>` : ''}
      <button class="b-new ${o.canContinue ? 'alt' : ''}">${o.canContinue ? 'Mở tiệm mới' : 'MỞ TIỆM!'}</button>
    </div>
    <button class="ts-install" hidden>${INSTALL_ICON}<span>Lưu vào màn hình chính</span></button>
    <div class="ts-foot">Game vui vẻ, mọi nhân vật và thương hiệu đều là chế.<br>Ngoài đời đừng xài kem trộn nha!</div>`;
  modal.appendChild(d);
  settingsGear(d);
  const inst = d.querySelector('.ts-install') as HTMLButtonElement;
  const paintInst = () => { inst.hidden = !canOfferInstall(); };
  paintInst();
  const offInst = onInstallChange(paintInst);
  inst.addEventListener('click', (e) => { e.stopPropagation(); unlockAudio(); installApp(d); });
  // máy dài/ngắn: logo neo trên, nút + 3 bạn đậu neo dưới; hũ kem nằm giữa khoảng trống còn lại (thu nhỏ nếu chật)
  const logo = d.querySelector('.ts-logo') as HTMLElement, btns = d.querySelector('.ts-btns') as HTMLElement;
  watchLayout(d, () => {
    const lb = logo.offsetTop + logo.offsetHeight, bt = btns.offsetTop;
    const k = Math.max(0.55, Math.min(1, (bt - lb - 16) / 200));
    // V6-10: hũ nhún lên 8px và có bóng dưới chân → hạ tâm hũ xuống chút, khe trên/dưới đều nhau
    const cy = Math.round((lb + bt) / 2 + 12 * k);
    d.querySelector('.ts-jar-pos')!.setAttribute('transform', `translate(${JAR_C[0]} ${cy}) scale(${(0.95 * k).toFixed(3)})`);
    d.querySelector('.ts-rays-pos')!.setAttribute('transform', `translate(0 ${cy - JAR_C[1]})`);
    d.querySelector('.ts-beans')!.setAttribute('transform', `translate(0 ${ex()})`);
  });
  // svgOrigin = toạ độ SVG tuyệt đối → xoay quanh đúng tâm hũ (transformOrigin trên SVG tính theo bbox nên bị lệch)
  gsap.to(d.querySelector('.ts-rays'), { rotation: 360, duration: 40, repeat: -1, ease: 'none', svgOrigin: `${JAR_C[0]} ${JAR_C[1]}` });
  // đặt origin TRƯỚC khi tween: truyền transformOrigin trong fromTo khiến GSAP (smoothOrigin) giữ lại độ lệch của scale ban đầu
  const jarG = d.querySelector('.ts-jar');
  gsap.set(jarG, { transformOrigin: '50% 100%' });
  gsap.fromTo(jarG, { y: 30, scale: 0.6 }, { y: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1,0.45)' });
  // nhún lên xuống ở <g> trong riêng, để không cộng dồn origin với tween scale ở .ts-jar (bị lệch tâm)
  gsap.to(d.querySelector('.ts-bob'), { y: -8, duration: 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.7 });
  d.querySelectorAll('.ts-bean').forEach((b, i) => {
    gsap.fromTo(b, { y: 160 }, { y: -68 - i * 10, duration: 0.5, delay: 0.3 + i * 0.15, ease: 'back.out(2)' });
  });
  // logo: KEM bật → TRÔN bật → kem chảy giọt → dấu nặng rơi xuống dưới chữ Ô thành TRỘN
  // dấu nặng nằm ngoài chữ TRÔN (chữ phóng to từ 0 sẽ kéo dấu theo ra giữa màn): đặt ngay dưới chữ Ô, tâm nằm trên vạch kem
  const dot = d.querySelector('.ts-dot') as HTMLElement;
  const oEl = d.querySelector('.ts-o') as HTMLElement, t = d.querySelector('.ts-t') as HTMLElement;
  dot.style.left = `${t.offsetLeft + oEl.offsetLeft + oEl.offsetWidth / 2 - 11}px`;
  dot.style.top = `${dripTop(d) + 18}px`;
  gsap.set(dot, { opacity: 0 });
  gsap.timeline()
    .fromTo(d.querySelector('.ts-k'), { scale: 0, rotation: -12 }, { scale: 1, rotation: -4, duration: 0.45, ease: 'back.out(3)' })
    .fromTo(d.querySelector('.ts-t'), { scale: 0, rotation: -12 }, { scale: 1, rotation: 3, duration: 0.45, ease: 'back.out(3)' }, '+=0.05')
    // rạch 1 đường ngang trước, rồi kem mới chảy xuống (không nảy, không fade)
    .fromTo(d.querySelector('.ts-drip'), { scaleX: 0, scaleY: 0.08, transformOrigin: '0% 0%' }, { scaleX: 1, duration: 0.28, ease: 'power2.out' }, '-=0.1')
    .to(d.querySelector('.ts-drip'), { scaleY: 1, duration: 0.7, ease: 'power1.out' })
    .fromTo(dot, { y: -460, opacity: 1, scaleX: 0.8, scaleY: 1.3 }, { y: 0, scaleX: 0.8, scaleY: 1.3, duration: 0.5, ease: 'power2.in', immediateRender: false }, '-=0.25')
    .call(() => sfx('plop'))
    .to(dot, { scaleX: 1.4, scaleY: 0.6, duration: 0.07, transformOrigin: '50% 100%' })
    .to(dot, { y: -16, scaleX: 0.9, scaleY: 1.12, duration: 0.16, ease: 'power2.out' })
    .to(dot, { y: 0, scaleX: 1, scaleY: 1, duration: 0.16, ease: 'power2.in' })
    .to(dot, { scaleX: 1.15, scaleY: 0.85, duration: 0.06, yoyo: true, repeat: 1 });
  gsap.fromTo(inst, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 1 });
  gsap.fromTo(d.querySelectorAll('.ts-btns button'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.08, delay: 0.6, ease: 'back.out(2)' });
  // chớp mắt hũ
  const blink = () => {
    const f = d.querySelector('.jar-face');
    if (!f) return;
    gsap.fromTo(f.querySelectorAll('ellipse, circle'), { scaleY: 1 }, { scaleY: 0.1, duration: 0.06, yoyo: true, repeat: 1, transformOrigin: '50% 50%' });
    setTimeout(blink, 2500 + Math.random() * 2000);
  };
  setTimeout(blink, 1500);
  const go = (fn: () => void) => {
    unlockAudio();
    sfx('ding');
    offInst();
    gsap.to(d, { opacity: 0, scale: 1.1, duration: 0.3, onComplete: () => { d.remove(); fn(); } });
  };
  d.querySelector('.b-new')!.addEventListener('click', () => go(o.onNew));
  d.querySelector('.b-cont')?.addEventListener('click', () => go(o.onContinue));
}
