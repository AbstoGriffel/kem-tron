import { gsap } from 'gsap';
import { el, P } from '../art/kit';
import { sfx } from './audio';

/** Mèo mướp nhảy lên bàn nằm đè ticket — chạm để đuổi. */
export function catSvg(): string {
  const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  return `<g class="cat">
    <ellipse cx="0" cy="34" rx="56" ry="9" fill="${P.ink}" opacity=".2"/>
    <path class="tail" d="M 44 18 C 80 10 84 -30 66 -40" stroke="${P.ink}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path class="tail" d="M 44 18 C 80 10 84 -30 66 -40" stroke="#F2A65A" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M -50 30 C -56 -6 -20 -18 10 -14 C 40 -10 56 4 50 30 Z" fill="#F2A65A" ${S}/>
    <path d="M -30 -8 q 6 14 0 34 M -10 -12 q 6 18 0 40 M 12 -12 q 6 18 0 40 M 32 -6 q 4 14 0 32" stroke="#C97A34" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- V3-20: đầu nhích vào 14px (mép trái đầu ≈ x−58) → mèo nằm đè tờ đơn (gốc x 70) không bị mép màn cắt tai/ria trái -->
    <g class="cat-head" transform="translate(-30 -16)">
      <path d="M -26 -6 L -24 -38 L -8 -22 Q 0 -26 8 -22 L 24 -38 L 26 -6 C 28 14 -28 14 -26 -6 Z" fill="#F2A65A" ${S}/>
      <path d="M -20 -30 l 6 10 M 20 -30 l -6 10" stroke="#FFB4A6" stroke-width="4" stroke-linecap="round"/>
      <g class="cat-eyes"><ellipse cx="-10" cy="-8" rx="5" ry="6" fill="#fff" ${S}/><ellipse cx="10" cy="-8" rx="5" ry="6" fill="#fff" ${S}/><circle cx="-9" cy="-7" r="2.6" fill="${P.ink}"/><circle cx="11" cy="-7" r="2.6" fill="${P.ink}"/></g>
      <path d="M -4 2 l 4 3 l 4 -3" stroke="${P.ink}" stroke-width="2.5" fill="none"/>
      <path d="M -14 2 h -14 M -14 6 l -12 3 M 14 2 h 14 M 14 6 l 12 3" stroke="${P.ink}" stroke-width="1.5"/>
    </g>
  </g>`;
}

export function runCat(over: SVGSVGElement, hud: HTMLElement, at: { x: number; y: number }, onShoo: () => void, autoLeave = 0) {
  const holder = el('g', { transform: `translate(${at.x} ${at.y})` });
  const g = el('g');
  g.innerHTML = catSvg();
  holder.appendChild(g);
  over.appendChild(holder);
  sfx('meow');
  gsap.fromTo(g, { x: 260, y: -160, rotation: -30 }, { x: 0, y: 0, rotation: 0, duration: 0.5, ease: 'power2.in', onComplete: () => {
    gsap.fromTo(g, { scaleY: 0.7, scaleX: 1.2, transformOrigin: '50% 100%' }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1,0.35)' });
    sfx('thud');
  } });
  const tails = g.querySelectorAll('.tail');
  gsap.to(tails, { rotation: 18, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '44px 18px' });
  // vùng chạm HTML để đuổi mèo (lớp over không nhận chạm)
  const hit = document.createElement('div');
  hit.className = 'cat-hit';
  hit.style.left = `${at.x - 80}px`;
  hit.style.top = `${at.y - 70}px`;
  hud.appendChild(hit);
  const leave = () => {
    if (!hit.isConnected) return;
    hit.remove();
    gsap.killTweensOf(tails);
    gsap.to(g, { x: 300, y: -40, duration: 0.6, ease: 'steps(5)', onComplete: () => holder.remove() });
  };
  if (autoLeave) window.setTimeout(leave, autoLeave);
  hit.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    hit.remove();
    sfx('meow', { pitch: 1.4 });
    gsap.killTweensOf(tails);
    gsap.timeline({ onComplete: () => holder.remove() })
      .to(g, { scaleY: 1.3, scaleX: 0.8, duration: 0.08, transformOrigin: '50% 100%' })
      .to(g, { x: -320, y: -60, rotation: -20, duration: 0.45, ease: 'power2.in' });
    onShoo();
  });
}
