import { gsap } from 'gsap';
import { ICONS } from '../art/icons';
import { el, P } from '../art/kit';
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
    creamG.append(this.blobs, this.swirlOuter, this.shine, depth);
    this.root.appendChild(creamG);

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
  }

  /** Xong mẻ: kem nảy, đều màu. */
  finish(color: string) {
    this.items.innerHTML = '';
    this.blobs.innerHTML = '';
    this.blobs.setAttribute('opacity', '1');
    this.swirl.setAttribute('opacity', '0');
    this.cream.setAttribute('fill', color);
    gsap.fromTo(this.cream, { attr: { ry: IRY * 1.18 } }, { attr: { ry: IRY }, duration: 0.6, ease: 'elastic.out(1,0.35)' });
    // vân xoáy mỏng trên mặt kem thành phẩm
    const swirlTop = el('path', { d: `M ${cx - 40} ${CY} q 20 -16 40 0 q 20 16 34 -2`, stroke: shade(color, 0.35), 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' });
    this.blobs.appendChild(swirlTop);
  }

  /** Thau trống trơn (sau khi đổ vào hũ / nổ). */
  clear() {
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
