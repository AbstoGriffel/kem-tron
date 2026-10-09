import { gsap } from 'gsap';
import { ICONS } from '../art/icons';
import { el, P, sparklePath } from '../art/kit';
import { BOWL, bowlBack, bowlFront } from '../art/props';
import { lerpHex, shade } from '../core/color';
import type { BowlItem } from '../core/types';

let cx = BOWL.cx, cy = BOWL.cy;
let CY = cy + 3; // tâm mặt kem
const IRX = BOWL.irx, IRY = BOWL.iry;
/** đồng bộ lại toạ độ sau khi bố cục co giãn dời thau */
function syncBowl() {
  cx = BOWL.cx; cy = BOWL.cy; CY = cy + 3;
}

/** Vị trí nổi của nguyên liệu (toạ độ chuẩn hoá trên elip). */
const SLOTS: [number, number][] = [[-0.42, -0.05], [0.4, 0.12], [-0.02, -0.38], [0.02, 0.42], [-0.62, 0.32], [0.62, -0.3], [0.3, -0.5]];

export class BowlView {
  root: SVGGElement;
  private cream: SVGEllipseElement;
  private blobs: SVGGElement;
  private swirlOuter: SVGGElement;
  private swirl: SVGGElement;
  private items: SVGGElement;
  private shine: SVGGElement;
  private phys: SVGGElement;
  private physUp: SVGGElement;
  private physKey = '';
  spoonRest: SVGGElement;
  private baseColor = '#E9E2DA';
  private hasBase = false;
  private floatEls: SVGGElement[] = [];
  onItemPointer?: (index: number, e: PointerEvent) => void;

  constructor(parent: SVGGElement) {
    syncBowl();
    this.root = el('g', { id: 'bowl' });
    parent.appendChild(this.root);
    const back = el('g');
    back.innerHTML = bowlBack();
    this.root.appendChild(back);

    const defs = el('defs');
    defs.innerHTML = `<clipPath id="clip-cream"><ellipse cx="${cx}" cy="${CY}" rx="${IRX}" ry="${IRY}"/></clipPath>`;
    this.root.appendChild(defs);

    const creamG = el('g', { 'clip-path': 'url(#clip-cream)' });
    this.cream = el('ellipse', { cx, cy: CY, rx: IRX, ry: IRY, fill: P.steelDeep });
    creamG.appendChild(this.cream);
    // viền tối phía trong vành (chiều sâu)
    const depth = el('ellipse', { cx, cy: CY - 7, rx: IRX + 4, ry: IRY + 2, fill: 'none', stroke: P.ink, 'stroke-width': 10, opacity: 0.12 });
    this.blobs = el('g');
    this.swirlOuter = el('g', { transform: `translate(${cx} ${CY}) scale(1 ${IRY / IRX})` });
    this.swirl = el('g');
    this.swirlOuter.appendChild(this.swirl);
    this.shine = el('g');
    this.shine.innerHTML = `<path d="M ${cx - 70} ${CY - 14} q 30 -14 70 -16" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".5"/>
      <circle cx="${cx + 22}" cy="${CY - 24}" r="3.5" fill="#fff" opacity=".55"/>`;
    this.shine.style.display = 'none';
    // T30: trạng thái vật lý của khối kem (độ đục, bóng, đặc, váng dầu/nứt, bọt) — trong lòng thau
    this.phys = el('g', { class: 'phys', style: 'pointer-events:none' });
    creamG.append(this.blobs, this.phys, this.swirlOuter, this.shine, depth);
    this.root.appendChild(creamG);
    // phần nhô lên khỏi mặt kem (chóp kem, khói, hơi nước) — ngoài clip
    this.physUp = el('g', { class: 'phys-up', style: 'pointer-events:none' });
    this.root.appendChild(this.physUp);

    this.items = el('g', { id: 'bowl-items' });
    const front = el('g');
    front.innerHTML = bowlFront();
    this.root.appendChild(front);
    this.root.appendChild(this.items);

    // vá gỗ gác trên vành thau
    this.spoonRest = el('g', { id: 'spoon-rest', style: 'cursor:grab' });
    this.spoonRest.innerHTML = spoonSvg();
    this.spoonRest.setAttribute('transform', `translate(${cx + 78} ${cy - 22}) rotate(32)`);
    this.root.appendChild(this.spoonRest);
    this.spoonRest.style.display = 'none';
  }

  setBase(color: string | null) {
    this.hasBase = !!color;
    this.baseColor = color ?? '#E9E2DA';
    this.shine.style.display = color ? '' : 'none';
    if (color) {
      // đổ cốt: kem dâng lên
      gsap.fromTo(this.cream, { attr: { ry: 4, rx: 30 } }, { attr: { ry: IRY, rx: IRX }, duration: 0.45, ease: 'back.out(1.6)' });
      this.cream.setAttribute('fill', color);
    } else {
      this.cream.setAttribute('fill', P.steelDeep);
    }
  }

  get base() {
    return this.hasBase;
  }

  /** Vẽ lại các nguyên liệu nổi + vệt màu chưa tan. */
  setItems(list: BowlItem[], colors: string[], justAdded?: number) {
    this.items.innerHTML = '';
    this.blobs.innerHTML = '';
    this.floatEls = [];
    list.forEach((it, i) => {
      const [nx, ny] = SLOTS[i % SLOTS.length];
      const x = cx + nx * IRX * 0.95, y = CY + ny * IRY * 0.95;
      const col = colors[i];
      // vệt màu loang (elip mềm) dưới nguyên liệu
      const blob = el('ellipse', { cx: x, cy: y + 2, rx: 24 + (i % 3) * 3, ry: 8 + (i % 2) * 2, fill: col, opacity: 0.8, transform: `rotate(${(i % 2 ? 6 : -8)} ${x} ${y})` });
      this.blobs.appendChild(blob);
      const sz = 46;
      const g = el('g', { class: 'float-item', style: 'cursor:grab' });
      // chìm ~40%: cắt phần dưới mặt kem + viền kem ôm quanh
      const clipId = `sink-${i}-${Math.round(x)}`;
      g.innerHTML = `<defs><clipPath id="${clipId}"><rect x="${-sz}" y="${-sz * 1.4}" width="${sz * 2}" height="${sz * 1.4 - 2}"/></clipPath></defs>
        <g class="fi-in"><g clip-path="url(#${clipId})"><svg x="${-sz / 2}" y="${-sz + 14}" width="${sz}" height="${sz}" viewBox="0 0 80 80" overflow="visible">${ICONS[it.id] ?? ''}</svg></g>
        <ellipse cx="0" cy="0" rx="${sz * 0.42}" ry="5" fill="${shade(col, 0.15)}" stroke="${P.ink}" stroke-width="1.6" opacity=".95"/>
        <path d="M ${-sz * 0.3} -1 q ${sz * 0.3} 4 ${sz * 0.6} 0" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/></g>`;
      if (it.proc !== 'raw') g.innerHTML += procTag(it.proc);
      g.setAttribute('transform', `translate(${x} ${y})`);
      g.addEventListener('pointerdown', (e) => this.onItemPointer?.(i, e));
      this.items.appendChild(g);
      this.floatEls.push(g);
      const inner = g.querySelector('.fi-in') as SVGGElement;
      gsap.to(inner, { y: -2, duration: 0.8 + (i % 3) * 0.15, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      if (i === justAdded) {
        gsap.fromTo(inner, { scaleX: 1.35, scaleY: 0.7, transformOrigin: '50% 100%' }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1,0.35)' });
        gsap.fromTo(blob, { scale: 0.2, transformOrigin: `${x}px ${y}px` }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
        for (let k = 0; k < 2; k++) {
          const ring = el('ellipse', { cx: x, cy: y + 2, rx: 8, ry: 3, fill: 'none', stroke: shade(col, -0.25), 'stroke-width': 2.5, opacity: 0.9 });
          this.blobs.appendChild(ring);
          gsap.to(ring, { attr: { rx: 46 + k * 16, ry: 14 + k * 5 }, opacity: 0, duration: 0.55, delay: k * 0.12, ease: 'sine.out', onComplete: () => ring.remove() });
        }
      }
    });
  }

  itemPos(i: number) {
    const [nx, ny] = SLOTS[i % SLOTS.length];
    return { x: cx + nx * IRX * 0.95, y: CY + ny * IRY * 0.95 - 14 };
  }

  /** Squash thau khi đồ rơi vào. */
  squash() {
    gsap.timeline()
      .to(this.root, { scaleX: 1.05, scaleY: 0.95, duration: 0.09, ease: 'power3.out', transformOrigin: `${cx}px ${BOWL.bottomY}px` })
      .to(this.root, { scaleX: 1, scaleY: 1, duration: 0.35, ease: 'elastic.out(1,0.4)' });
    const rip = el('ellipse', { cx, cy: CY, rx: 6, ry: 2, fill: 'none', stroke: '#fff', 'stroke-width': 2.5, opacity: 0.7 });
    this.blobs.appendChild(rip);
    gsap.to(rip, { attr: { rx: 60, ry: 20 }, opacity: 0, duration: 0.45, ease: 'sine.out', onComplete: () => rip.remove() });
  }

  /** Chuẩn bị xoáy: tạo nhánh xoắn ốc theo màu nguyên liệu. */
  prepareSwirl(colors: string[]) {
    this.swirl.innerHTML = '';
    const uniq = [...new Set(colors)].slice(0, 6);
    uniq.forEach((c, i) => {
      const off = (i / uniq.length) * Math.PI * 2;
      let d = '';
      for (let s = 0; s <= 40; s++) {
        const th = (s / 40) * Math.PI * 3.2;
        const r = 8 + (s / 40) * (IRX - 12);
        const x = Math.cos(th + off) * r, y = Math.sin(th + off) * r;
        d += `${s ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      this.swirl.appendChild(el('path', { d, stroke: c, 'stroke-width': 13, fill: 'none', 'stroke-linecap': 'round', opacity: 0.95 }));
      this.swirl.appendChild(el('path', { d, stroke: shade(c, -0.2), 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0.5, transform: 'translate(3 4)' }));
    });
    this.swirl.setAttribute('opacity', '0');
  }

  /** Tiến độ khuấy p∈[0,1], góc muỗng a (rad). */
  stirProgress(p: number, angle: number, startColor: string, finalColor: string) {
    const e = Math.min(1, p);
    this.swirl.setAttribute('opacity', String(Math.min(1, e * 6) * (1 - Math.pow(e, 1.4))));
    this.swirl.setAttribute('transform', `rotate(${(angle * 0.6 * 180) / Math.PI})`);
    this.swirl.querySelectorAll('path').forEach((p2, i) => p2.setAttribute('stroke-width', String(i % 2 ? 3 : 13 * (1 - e * 0.7))));
    this.cream.setAttribute('fill', lerpHex(startColor, finalColor, Math.pow(e, 0.8)));
    const k = Math.max(0, 1 - e * 2.2);
    this.floatEls.forEach((g) => {
      const fi = g.querySelector('.fi-in') as SVGElement;
      fi.style.opacity = String(k);
      gsap.set(fi, { scale: 0.4 + 0.6 * k, y: (1 - k) * 8, transformOrigin: '50% 100%' });
    });
    this.blobs.setAttribute('opacity', String(Math.max(0, 1 - e * 1.6)));
    this.phys.setAttribute('opacity', String(Math.max(0, 1 - e * 2)));
    this.physUp.setAttribute('opacity', String(Math.max(0, 1 - e * 2)));
  }

  /** T51: mặt kem gợn theo vá — kem lỏng gợn nhanh, nhẹ; kem đặc nhô lên thành gờ chậm, rõ. */
  wobble(angle: number, thick: number) {
    const k = 0.025 + thick * 0.05;
    this.cream.setAttribute('ry', String(IRY * (1 + Math.sin(angle * (2 - thick)) * k)));
    this.cream.setAttribute('rx', String(IRX * (1 - Math.sin(angle * (2 - thick)) * k * 0.3)));
  }

  /** Xong mẻ: kem nảy, đều màu. */
  finish(color: string) {
    this.items.innerHTML = '';
    this.blobs.innerHTML = '';
    this.blobs.setAttribute('opacity', '1');
    this.swirl.setAttribute('opacity', '0');
    this.cream.setAttribute('fill', color);
    gsap.to([this.phys, this.physUp], { opacity: 1, duration: 0.4 });
    this.cream.setAttribute('rx', String(IRX));
    gsap.fromTo(this.cream, { attr: { ry: IRY * 1.18 } }, { attr: { ry: IRY }, duration: 0.6, ease: 'elastic.out(1,0.35)' });
    // vân xoáy mỏng trên mặt kem thành phẩm
    const swirlTop = el('path', { d: `M ${cx - 40} ${CY} q 20 -16 40 0 q 20 16 34 -2`, stroke: shade(color, 0.35), 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' });
    this.blobs.appendChild(swirlTop);
  }

  /**
   * T30 — vẽ trạng thái vật lý theo chỉ số thật (mỗi chỉ số 1 kênh hình riêng nên đọc được cùng lúc):
   * Trắng = độ đục (thấp: trong ngả vàng · cao: đục trắng · lố: bột vón lấm tấm), Mịn = độ bóng (thấp: lợn cợn hạt),
   * Nắng = độ đặc (vệt khuấy dày, lố: đứng chóp), Khô = váng dầu (0) ↔ mặt lì nứt (cao), Độc = bọt → khói → ngả tím.
   * Riêng: quá tay = tách lớp, chanh + lòng trắng = vón cục, núi lửa / 2 món sỉ = trào bọt, đun = hơi nước.
   */
  setPhysics(p: Physics | null) {
    const key = p ? JSON.stringify(p) : '';
    if (key === this.physKey) return;
    this.physKey = key;
    gsap.killTweensOf(this.physUp.querySelectorAll('*'));
    gsap.killTweensOf(this.phys.querySelectorAll('*'));
    this.phys.setAttribute('opacity', '1');
    this.physUp.setAttribute('opacity', '1');
    if (!p || !this.hasBase) {
      this.phys.innerHTML = '';
      this.physUp.innerHTML = '';
      return;
    }
    this.shine.style.display = 'none';
    const r = physicsSvg(p, cx, CY, IRX, IRY);
    this.phys.innerHTML = r.in;
    this.physUp.innerHTML = r.up;
    gsap.fromTo(this.phys, { opacity: 0.4 }, { opacity: 1, duration: 0.35 });
    // bọt lăn tăn nổi lên, khói/hơi bốc lên lặp lại
    this.phys.querySelectorAll<SVGCircleElement>('.bub').forEach((b, i) => gsap.to(b, { attr: { cy: `-=${2 + (i % 3)}` }, opacity: 0.35, duration: 0.6 + (i % 5) * 0.15, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: (i % 7) * 0.1 }));
    this.physUp.querySelectorAll<SVGPathElement>('.puff').forEach((b, i) => gsap.fromTo(b, { y: 4, opacity: 0 }, { y: -16, opacity: 0.85, duration: 1.4, repeat: -1, ease: 'sine.out', delay: i * 0.45 }));
  }

  /** Thau trống trơn (sau khi đổ vào hũ / nổ). */
  clear() {
    this.setPhysics(null);
    this.items.innerHTML = '';
    this.blobs.innerHTML = '';
    this.swirl.innerHTML = '';
    this.setBase(null);
    this.floatEls = [];
  }

  /** Độc cao: kem ngả màu, thau rung nhẹ. */
  tint(color: string | null) {
    if (!this.hasBase) return;
    this.cream.setAttribute('fill', color ?? this.baseColor);
  }

  get creamCenter() {
    return { x: cx, y: CY };
  }
}

function procTag(p: string) {
  const txt = p === 'nghien' ? 'NGHIỀN' : 'XAY';
  const c = p === 'nghien' ? '#A79B90' : P.pink;
  return `<g transform="translate(0 10)"><rect x="-19" y="-7" width="38" height="13" rx="6" fill="${c}" stroke="${P.ink}" stroke-width="1.6"/><text y="3.5" font-family="Paytone One" font-size="8" fill="${P.ink}" text-anchor="middle">${txt}</text></g>`;
}

/** Vá gỗ: gốc (0,0) = đầu múc; cán đi lên trên. */
export function spoonSvg() {
  return `<g>
    <path d="M -4 -18 L -7 -112 Q 0 -120 7 -112 L 4 -18 Z" fill="#D9945A" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M -3 -40 L -4.5 -104" stroke="#F2C08E" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-2" rx="15" ry="20" fill="#C98448" stroke="${P.ink}" stroke-width="3"/>
    <ellipse cx="-3" cy="-6" rx="7" ry="10" fill="#E3A970"/>
    <circle cx="0" cy="-110" r="3" fill="${P.ink}"/>
  </g>`;
}

/** Cánh tay áo bộ hoa + nắm tay cầm vá. Vẽ theo điểm đầu vá T (toạ độ cảnh). */
export class StirArm {
  g: SVGGElement;
  private sleeve: SVGPathElement;
  private sleeveIn: SVGPathElement;
  private cuff: SVGPathElement;
  private hand: SVGGElement;
  private spoon: SVGGElement;
  private shoulder = { x: 452, y: BOWL.cy + 150 };

  constructor(parent: SVGElement) {
    this.g = el('g', { id: 'stir-arm', style: 'pointer-events:none' });
    this.g.innerHTML = `<defs><pattern id="pt-sleeve" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
        <rect width="24" height="24" fill="#5BB6E8"/>
        <g transform="translate(6 6)"><circle r="3" cy="-3.6" fill="#FFF"/><circle r="3" cx="3.4" cy="-1" fill="#FFF"/><circle r="3" cx="2" cy="3" fill="#FFF"/><circle r="3" cx="-2" cy="3" fill="#FFF"/><circle r="3" cx="-3.4" cy="-1" fill="#FFF"/><circle r="2" fill="${P.yellow}"/></g>
        <g transform="translate(18 17)"><circle r="2.2" cy="-2.6" fill="${P.pink}"/><circle r="2.2" cx="2.5" cy="-.8" fill="${P.pink}"/><circle r="2.2" cx="1.6" cy="2.2" fill="${P.pink}"/><circle r="2.2" cx="-1.6" cy="2.2" fill="${P.pink}"/><circle r="2.2" cx="-2.5" cy="-.8" fill="${P.pink}"/></g>
      </pattern></defs>`;
    this.spoon = el('g');
    this.spoon.innerHTML = spoonSvg();
    this.sleeve = el('path', { fill: 'none', stroke: P.ink, 'stroke-width': 50, 'stroke-linecap': 'round' });
    this.sleeveIn = el('path', { fill: 'none', stroke: 'url(#pt-sleeve)', 'stroke-width': 44, 'stroke-linecap': 'round' });
    this.cuff = el('path', { fill: 'none', stroke: P.ink, 'stroke-width': 3, 'stroke-linecap': 'round' });
    this.hand = el('g');
    this.hand.innerHTML = `<ellipse cx="0" cy="0" rx="21" ry="18" fill="${P.skin}" stroke="${P.ink}" stroke-width="3"/>
      <path d="M -14 -6 q 8 -6 16 0 M -14 2 q 8 -6 16 0 M -12 9 q 7 -5 14 0" stroke="${P.skinDark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <ellipse cx="12" cy="-4" rx="7" ry="9" fill="${P.skin}" stroke="${P.ink}" stroke-width="2.6"/>`;
    this.g.append(this.spoon, this.sleeve, this.sleeveIn, this.cuff, this.hand);
    parent.appendChild(this.g);
    this.g.style.display = 'none';
  }

  show(on: boolean) {
    this.g.style.display = on ? '' : 'none';
  }

  /** Đặt đầu vá tại T, nghiêng theo vận tốc góc (follow-through). */
  place(tx: number, ty: number, lean: number) {
    const hx = tx + 30 + lean * 10, hy = ty - 92;
    const ang = Math.atan2(hx - tx, -(hy - ty)) * (180 / Math.PI);
    const smear = 1 + Math.min(0.3, Math.abs(lean) * 0.12);
    this.spoon.setAttribute('transform', `translate(${tx} ${ty}) rotate(${ang}) scale(${smear} 1)`);
    const s = this.shoulder;
    // khuỷu tay chĩa ra ngoài (kiểu tay cao su)
    // khuỷu tay chĩa xuống dưới-phải (tay cao su 2 đốt)
    const ex = Math.min(370, Math.max(hx + 90, 320)), ey = Math.max(hy + 110, 400);
    const d = `M ${s.x} ${s.y} Q ${ex + 30} ${ey + 30} ${ex} ${ey} Q ${hx + 40} ${hy + 60} ${hx + 18} ${hy + 14}`;
    this.sleeve.setAttribute('d', d);
    this.sleeveIn.setAttribute('d', d);
    // viền cổ tay áo
    const cuffD = `M ${hx + 2} ${hy + 30} Q ${hx + 30} ${hy + 22} ${hx + 36} ${hy - 4}`;
    this.cuff.setAttribute('d', cuffD);
    this.hand.setAttribute('transform', `translate(${hx} ${hy}) rotate(${ang * 0.4 - 10})`);
  }
}

export interface Physics {
  t: number; m: number; n: number; k: number; d: number;
  /** k thô (trước kẹp 0) âm → váng dầu */
  kRaw?: number;
  split?: boolean;
  curd?: boolean;
  foam?: boolean;
  steam?: boolean;
}

/** Mức 0–3 của 1 chỉ số (thấp / vừa / cao / lố) theo ngưỡng. */
const lv = (v: number, a: number, b: number, c: number) => (v >= c ? 3 : v >= b ? 2 : v >= a ? 1 : 0);

/** Hình trạng thái vật lý trên mặt kem (elip tâm X,Y bán trục RX,RY). Deterministic theo chỉ số. */
export function physicsSvg(p: Physics, X: number, Y: number, RX: number, RY: number): { in: string; up: string } {
  let seed = 7 + p.t * 13 + p.m * 31 + p.n * 57 + p.k * 101 + p.d * 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const inEl = (k = 0.8) => { for (let g = 0; g < 40; g++) { const x = X + (rnd() * 2 - 1) * RX * 0.92, y = Y + (rnd() * 2 - 1) * RY * 0.86; if (((x - X) / RX) ** 2 + ((y - Y) / RY) ** 2 < k) return [x, y]; } return [X, Y]; };
  const sx = RX / 80; // swatch duyệt trên Figma vẽ ở rx 80
  let s = '';
  let up = '';
  const t = lv(p.t, 2, 6, 9);
  // Trắng: độ đục
  if (p.t <= 1) s += `<ellipse cx="${X}" cy="${Y}" rx="${RX}" ry="${RY}" fill="#E9CFA0" opacity=".38"/>`;
  else if (t >= 2) s += `<ellipse cx="${X}" cy="${Y}" rx="${RX}" ry="${RY}" fill="#FFFFFF" opacity="${t === 3 ? 0.62 : 0.4}"/>`;
  if (p.foam) s += `<ellipse cx="${X}" cy="${Y}" rx="${RX}" ry="${RY}" fill="#7D2FBF" opacity=".18"/>`;
  // Độc: ngả màu
  const d = p.d >= 15 ? 3 : p.d >= 10 ? 2 : p.d >= 6 ? 1 : 0;
  if (d) s += `<ellipse cx="${X}" cy="${Y}" rx="${RX}" ry="${RY}" fill="${['', '#C9A6F0', '#9AD27A', '#7D2FBF'][d]}" opacity="${[0, 0.26, 0.3, 0.38][d]}"/>`;
  // Quá tay: tách lớp (dầu vàng nổi nửa trên)
  if (p.split) s += `<path d="M ${X - RX} ${Y} q ${20 * sx} -10 ${40 * sx} -2 q ${20 * sx} 8 ${40 * sx} 0 q ${20 * sx} -8 ${40 * sx} 2 q ${20 * sx} 8 ${40 * sx} 0 V ${Y - RY - 2} H ${X - RX} Z" fill="#F2C94C" opacity=".55"/><path d="M ${X - RX} ${Y} q ${20 * sx} -10 ${40 * sx} -2 q ${20 * sx} 8 ${40 * sx} 0 q ${20 * sx} -8 ${40 * sx} 2 q ${20 * sx} 8 ${40 * sx} 0" stroke="#B88A1E" stroke-width="2" fill="none"/>`;
  // Khô: mặt lì / nứt; Khô thô âm → váng dầu
  const k = lv(p.k, 1, 5, 8);
  if (k >= 2) s += `<ellipse cx="${X}" cy="${Y}" rx="${RX}" ry="${RY}" fill="${k === 3 ? '#E2D3AE' : '#C8BBA0'}" opacity="${k === 3 ? 0.45 : 0.25}"/>`;
  // Mịn: hạt lợn cợn khi thấp
  const m = lv(p.m, 2, 5, 8);
  const grains = m === 0 ? 46 : m === 1 ? 10 : 0;
  for (let i = 0; i < grains; i++) { const [x, y] = inEl(); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + rnd() * 1.4).toFixed(1)}" fill="#A67C52" opacity=".7"/>`; }
  // Trắng lố: bột vón + phấn lấm tấm
  if (t === 3) {
    for (let i = 0; i < 28; i++) { const [x, y] = inEl(); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd()).toFixed(1)}" fill="#DCD3C2"/>`; }
    for (let i = 0; i < 6; i++) { const [x, y] = inEl(0.6); const r = 4 + rnd() * 4; s += `<path d="M ${(x - r).toFixed(1)} ${y.toFixed(1)} q ${r * 0.3} ${-r} ${r} ${-r * 0.8} q ${r} 0 ${r} ${r * 0.8} q ${-r * 0.4} ${r * 0.7} ${-r} ${r * 0.6} q ${-r * 0.7} 0 ${-r} ${-r * 0.6} z" fill="#FFFFFF" stroke="#CFC5AE" stroke-width="1.5"/>`; }
  }
  // Chanh + lòng trắng trứng: vón cục
  if (p.curd) for (let i = 0; i < 9; i++) { const [x, y] = inEl(); const r = 3 + rnd() * 4; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#F3EBD2" stroke="#9A8A5A" stroke-width="1.4"/>`; }
  // Nắng: vệt khuấy đặc dần
  const n = lv(p.n, 2, 5, 8);
  if (n >= 1) {
    const w = n >= 2 ? 2 : 1;
    s += `<path d="M ${X - 46 * sx} ${Y + 4} q ${20 * sx} -22 ${46 * sx} -12 q ${30 * sx} 12 ${6 * sx} 22 q ${-24 * sx} 8 ${-28 * sx} -6 q 0 -10 ${16 * sx} -8" stroke="#E2D5BA" stroke-width="${w * 3}" fill="none" stroke-linecap="round" opacity=".9"/><path d="M ${X - 46 * sx} ${Y + 2} q ${20 * sx} -16 ${46 * sx} -8" stroke="#fff" stroke-width="${w * 1.4}" fill="none" stroke-linecap="round" opacity=".8"/>`;
  }
  // Khô thô âm: váng dầu loang
  if ((p.kRaw ?? p.k) <= 0) for (let i = 0; i < 11; i++) { const [x, y] = inEl(); const r = 2.5 + rnd() * 4; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.6).toFixed(1)}" fill="#F2C94C" fill-opacity=".75" stroke="#B88A1E" stroke-width="1"/><circle cx="${(x - r * 0.3).toFixed(1)}" cy="${(y - r * 0.2).toFixed(1)}" r="1" fill="#fff"/>`; }
  if (k >= 2) for (let i = 0; i < (k === 3 ? 9 : 2); i++) { const [x, y] = inEl(); s += `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} l ${(rnd() * 14 - 7).toFixed(1)} ${(rnd() * 6 - 3).toFixed(1)} l ${(rnd() * 12).toFixed(1)} ${(rnd() * 6 - 1).toFixed(1)} M ${x.toFixed(1)} ${y.toFixed(1)} l ${(-rnd() * 10).toFixed(1)} ${(rnd() * 6).toFixed(1)}" stroke="#7A5A3A" stroke-width="1.5" fill="none" stroke-linecap="round"/>`; }
  // Mịn: độ bóng
  const gloss = m === 1 ? 0.6 : m === 2 ? 1.1 : m === 3 ? 1.6 : 0;
  if (gloss) {
    s += `<ellipse cx="${X - 26 * sx}" cy="${Y - 9}" rx="${18 * gloss * sx}" ry="${4 * gloss}" fill="#fff" opacity=".9"/><path d="M ${X + 14 * sx} ${Y - 14} q ${18 * sx} -2 ${30 * sx} 4" stroke="#fff" stroke-width="${2 * gloss}" fill="none" stroke-linecap="round" opacity=".85"/>`;
    if (m === 3) s += `<path d="${sparklePath(X + 44 * sx, Y - 14, 7)}" fill="#fff"/>` + [0.35, 0.6, 0.85].map((q) => `<ellipse cx="${X}" cy="${Y}" rx="${RX * q}" ry="${RY * q}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".55"/>`).join('');
  }
  // Độc: bọt
  const bubbles = p.d >= 15 ? 26 : p.d >= 10 ? 20 : p.d >= 6 ? 13 : p.d >= 1 ? 5 : 0;
  for (let i = 0; i < bubbles; i++) { const [x, y] = inEl(); const r = 1.6 + rnd() * (bubbles > 10 ? 3.6 : 2.4); s += `<circle class="bub" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" fill-opacity=".5" stroke="#7D2FBF" stroke-width="1.2"/>`; }
  if (p.foam || p.d >= 15) s += `<path d="M ${X - 50 * sx} ${Y - 6} q ${6 * sx} -20 ${18 * sx} -10 q ${6 * sx} -18 ${18 * sx} -6 q ${10 * sx} -16 ${20 * sx} -2 q ${12 * sx} -14 ${18 * sx} 2 q ${10 * sx} -6 ${10 * sx} 8 q ${-40 * sx} 12 ${-84 * sx} 8 z" fill="#F4ECFF" stroke="#7D2FBF" stroke-width="2"/>`;
  // nhô lên khỏi mặt: chóp kem (Nắng lố), khói (Độc ≥10), hơi nước (đun)
  if (n === 3) for (let i = 0; i < 4; i++) { const x = X - 52 * sx + i * (104 * sx / 3), y = Y + 8 - (i % 2) * 6, h = 18 + (i % 2) * 7; up += `<path d="M ${x - 15} ${y} C ${x - 15} ${y - h * 0.6} ${x - 4} ${y - h} ${x + 1} ${y - h - 4} C ${x + 3} ${y - h} ${x + 15} ${y - h * 0.6} ${x + 15} ${y} Z" fill="#FBF6EA" stroke="#BDB29A" stroke-width="1.8"/><path d="M ${x - 8} ${y - 4} C ${x - 8} ${y - h * 0.5} ${x - 3} ${y - h * 0.8} ${x} ${y - h}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; }
  if (p.d >= 10) up += [X - 30, X + 8, X + 40].map((x, i) => `<path class="puff" d="M ${x} ${Y - 8} q -10 -12 0 -22 q 10 -10 0 -22" stroke="#6A5A78" stroke-width="${4 - i * 0.6}" fill="none" stroke-linecap="round" opacity=".6"/>`).join('');
  if (p.steam) up += [X - 24, X + 22].map((x) => `<path class="puff" d="M ${x} ${Y - 8} q -8 -10 0 -20 q 8 -10 0 -20" stroke="#B9C7CF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".9"/>`).join('');
  return { in: s, up };
}
