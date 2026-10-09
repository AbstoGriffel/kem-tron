import { P } from './kit';

/** Chị Bảy chủ hụi (T22): tóc búi, vòng vàng, kẹp sổ hụi đỏ tay trái, quạt nan tay phải. */
export const BAY_LOOK = { color: '#E9A06B', acc: ['toc_buoi', 'vong_vang'] };

/** Sổ hụi đỏ, tâm (0,0). */
export function soHui(rot = -8) {
  return `<g transform="rotate(${rot})">
    <rect x="-24" y="-30" width="48" height="60" rx="4" fill="${P.red}" stroke="${P.ink}" stroke-width="3"/>
    <rect x="-18" y="-24" width="36" height="20" rx="2" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2"/>
    <text x="0" y="-10" font-family="Paytone One" font-size="10" fill="${P.ink}" text-anchor="middle">SỔ HỤI</text>
    <path d="M -16 6 H 16 M -16 14 H 10" stroke="${P.paperHi}" stroke-width="2.5" stroke-linecap="round"/>
  </g>`;
}

/** Quạt nan hồng, cán ở (0,0) xoè lên trên. */
export function fanNan(rot = 20) {
  return `<g transform="rotate(${rot})"><path d="M 0 0 L -26 -40 A 48 48 0 0 1 26 -40 Z" fill="${P.pink}" stroke="${P.ink}" stroke-width="3"/>${[-18, -9, 0, 9, 18].map((x) => `<path d="M 0 0 L ${x} -42" stroke="${P.pinkDark}" stroke-width="1.8"/>`).join('')}</g>`;
}
