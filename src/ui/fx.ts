import { gsap } from 'gsap';
import { burstPath, el, P, sparklePath } from '../art/kit';

/** Lớp hiệu ứng: rung theo trauma, hitstop, hạt, chữ nổi. */
let trauma = 0;
let world: HTMLElement;
let fxSvg: SVGSVGElement;
let reduced = false;

export function initFx(worldEl: HTMLElement, fxLayer: SVGSVGElement) {
  world = worldEl;
  fxSvg = fxLayer;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reduced = false;
  }
  gsap.ticker.add((_t, dt) => {
    if (trauma <= 0) return;
    trauma = Math.max(0, trauma - 1.2 * (dt / 1000));
    const k = trauma * trauma;
    if (reduced) return;
    gsap.set(world, {
      x: (Math.random() * 2 - 1) * 8 * k,
      y: (Math.random() * 2 - 1) * 8 * k,
      rotation: (Math.random() * 2 - 1) * 2.5 * k,
    });
    if (trauma === 0) gsap.set(world, { x: 0, y: 0, rotation: 0 });
  });
}

export const shake = (v: number) => (trauma = Math.min(1, trauma + v));

/** Dừng hình ngắn (hitstop). */
export function hitstop(ms = 70) {
  gsap.globalTimeline.timeScale(0.02);
  window.setTimeout(() => gsap.globalTimeline.timeScale(1), ms);
}

export function flash(color = '#fff', opacity = 0.8, dur = 0.12) {
  const r = el('rect', { x: -20, y: -20, width: 430, height: 884, fill: color, opacity });
  fxSvg.appendChild(r);
  gsap.to(r, { opacity: 0, duration: dur, ease: 'power1.out', onComplete: () => r.remove() });
}

/** Giọt bắn tung toé. */
export function splash(x: number, y: number, color: string, n = 8, spread = 1) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9 * spread;
    const dist = 28 + Math.random() * 46;
    const r = 3 + Math.random() * 5;
    const c = el('ellipse', { cx: x, cy: y, rx: r, ry: r * 1.25, fill: color, stroke: P.ink, 'stroke-width': 1.5 });
    fxSvg.appendChild(c);
    const tx = x + Math.cos(a) * dist, ty = y + Math.sin(a) * dist;
    gsap.timeline({ onComplete: () => c.remove() })
      .to(c, { attr: { cx: tx, cy: ty - 10 }, duration: 0.22, ease: 'power2.out' })
      .to(c, { attr: { cy: ty + 26 }, opacity: 0, duration: 0.3, ease: 'power2.in' });
  }
}

/** Bụi vụn (nghiền). */
export function crumbs(x: number, y: number, color: string, n = 5) {
  for (let i = 0; i < n; i++) {
    const s = 3 + Math.random() * 4;
    const c = el('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, fill: color, stroke: P.ink, 'stroke-width': 1 });
    fxSvg.appendChild(c);
    gsap.to(c, {
      x: (Math.random() - 0.5) * 70, y: -10 - Math.random() * 30, rotation: Math.random() * 360,
      duration: 0.3, ease: 'power2.out', transformOrigin: '50% 50%',
      onComplete: () => gsap.to(c, { y: '+=30', opacity: 0, duration: 0.25, onComplete: () => c.remove() }),
    });
  }
}

export function sparkles(x: number, y: number, n = 4, color = P.white, R = 34) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random();
    const px = x + Math.cos(a) * R * (0.6 + Math.random() * 0.6);
    const py = y + Math.sin(a) * R * (0.6 + Math.random() * 0.6);
    const s = el('path', { d: sparklePath(0, 0, 7 + Math.random() * 5), fill: color, stroke: P.ink, 'stroke-width': 1.5 });
    s.setAttribute('transform', `translate(${px} ${py})`);
    fxSvg.appendChild(s);
    gsap.fromTo(s, { scale: 0, rotation: 0, transformOrigin: '50% 50%' }, {
      scale: 1, rotation: 90, duration: 0.25, ease: 'back.out(3)', delay: i * 0.05,
      onComplete: () => gsap.to(s, { scale: 0, duration: 0.2, delay: 0.15, onComplete: () => s.remove() }),
    });
  }
}

/** Bong bóng độc nổi lên. */
export function bubble(x: number, y: number, color: string) {
  const r = 4 + Math.random() * 6;
  const b = el('circle', { cx: x, cy: y, r, fill: color, stroke: P.ink, 'stroke-width': 1.5 });
  const h = el('circle', { cx: x - r * 0.35, cy: y - r * 0.35, r: r * 0.28, fill: '#fff', opacity: 0.8 });
  const g = el('g');
  g.append(b, h);
  fxSvg.appendChild(g);
  gsap.to(g, {
    y: -18 - Math.random() * 14, duration: 0.8, ease: 'sine.out',
    onComplete: () => gsap.to(g, { scale: 1.5, opacity: 0, duration: 0.08, transformOrigin: `${x}px ${y}px`, onComplete: () => g.remove() }),
  });
}

/** Cụm khói cuộn. */
export function smoke(x: number, y: number, color = '#9AD27A', n = 3) {
  for (let i = 0; i < n; i++) {
    const c = el('circle', { cx: x + (Math.random() - 0.5) * 30, cy: y, r: 10 + Math.random() * 8, fill: color, opacity: 0.75, stroke: P.ink, 'stroke-width': 1.5 });
    fxSvg.appendChild(c);
    gsap.to(c, {
      y: -60 - Math.random() * 30, x: (Math.random() - 0.5) * 30, scale: 1.7, opacity: 0, duration: 1.3, delay: i * 0.12,
      ease: 'power1.out', transformOrigin: '50% 50%', onComplete: () => c.remove(),
    });
  }
}

export function boomBurst(x: number, y: number) {
  const g = el('g');
  g.innerHTML = `<path d="${burstPath(0, 0, 110, 14, 0.6)}" fill="${P.yellow}" stroke="${P.ink}" stroke-width="4"/>
    <path d="${burstPath(0, 0, 70, 11, 0.6)}" fill="${P.red}" stroke="${P.ink}" stroke-width="3"/>
    <text y="12" font-family="Paytone One" font-size="34" fill="${P.white}" stroke="${P.ink}" stroke-width="2" paint-order="stroke" text-anchor="middle">BÙM!</text>`;
  g.setAttribute('transform', `translate(${x} ${y})`);
  fxSvg.appendChild(g);
  gsap.fromTo(g, { scale: 0, rotation: -20, transformOrigin: '0 0' }, {
    scale: 1.15, rotation: 0, duration: 0.18, ease: 'expo.out',
    onComplete: () => gsap.to(g, { scale: 1.3, opacity: 0, duration: 0.35, delay: 0.35, onComplete: () => g.remove() }),
  });
}

/** Chữ nổi kiểu "+15k", "ĐỘC QUÁ". */
export function popText(x: number, y: number, text: string, color = P.yellow, size = 22, rise = 40) {
  const t = el('text', {
    x, y, 'font-family': 'Paytone One', 'font-size': size, fill: color, stroke: P.ink, 'stroke-width': 4,
    'paint-order': 'stroke', 'text-anchor': 'middle', 'stroke-linejoin': 'round',
  });
  t.textContent = text;
  fxSvg.appendChild(t);
  gsap.timeline({ onComplete: () => t.remove() })
    .fromTo(t, { scale: 0.2, transformOrigin: `${x}px ${y}px` }, { scale: 1, duration: 0.28, ease: 'back.out(2.6)' })
    .to(t, { y: -rise, duration: 0.7, ease: 'power1.out' }, '<0.1')
    .to(t, { opacity: 0, duration: 0.25 }, '-=0.25');
}

/** Chữ bay lên chậm và mờ dần trong `dur` giây (vd "+3 ĐỘC" 2 s, "lời 7k" 3 s). */
export function floatText(x: number, y: number, text: string, color = P.yellow, size = 16, dur = 2, rise = 46) {
  const t = el('text', {
    x, y, 'font-family': 'Paytone One', 'font-size': size, fill: color, stroke: P.ink, 'stroke-width': 4,
    'paint-order': 'stroke', 'text-anchor': 'middle', 'stroke-linejoin': 'round',
  });
  t.textContent = text;
  fxSvg.appendChild(t);
  gsap.timeline({ onComplete: () => t.remove() })
    .fromTo(t, { scale: 0.3, transformOrigin: `${x}px ${y}px` }, { scale: 1, duration: 0.25, ease: 'back.out(2.6)' })
    .to(t, { y: -rise, duration: dur, ease: 'power1.out' }, 0)
    .to(t, { opacity: 0, duration: dur * 0.75, ease: 'power1.in' }, dur * 0.25);
}

/** Đồng xu bay theo cung tới đích. */
export function coinsTo(from: { x: number; y: number }, to: { x: number; y: number }, n: number, onEach?: (i: number) => void, color = P.yellow) {
  for (let i = 0; i < n; i++) {
    const g = el('g');
    // tờ tiền polymer gấp tư (xanh lá / hồng / xanh dương xen kẽ)
    const note = color === P.yellow ? ['#9ED36A', '#F7A6B9', '#8FC9F0'][i % 3] : color;
    g.innerHTML = `<rect x="-11" y="-6.5" width="22" height="13" rx="2" fill="${note}" stroke="${P.ink}" stroke-width="2"/>
      <circle cx="-4" cy="0" r="3.2" fill="#fff" opacity=".55"/><path d="M 3 -3 h 5 M 3 1 h 5" stroke="${P.ink}" stroke-width="1.2" opacity=".6"/>`;
    fxSvg.appendChild(g);
    const cx = (from.x + to.x) / 2 + (Math.random() - 0.5) * 60;
    const cy = Math.min(from.y, to.y) - 80 - Math.random() * 60;
    const o = { t: 0 };
    gsap.to(o, {
      t: 1, duration: 0.5 + Math.random() * 0.12, delay: i * 0.05, ease: 'power2.in',
      onUpdate: () => {
        const t = o.t, u = 1 - t;
        const x = u * u * from.x + 2 * u * t * cx + t * t * to.x;
        const y = u * u * from.y + 2 * u * t * cy + t * t * to.y;
        g.setAttribute('transform', `translate(${x} ${y}) scale(${0.6 + 0.4 * Math.abs(Math.cos(t * 9))} 1)`);
      },
      onComplete: () => {
        g.remove();
        onEach?.(i);
      },
    });
  }
}

export function fxLayer() {
  return fxSvg;
}
