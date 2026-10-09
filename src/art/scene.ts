import { ink, P } from './kit';

/**
 * Màn chính 390×844 — các lớp tĩnh + chỗ cắm (slot) cho vật động.
 * Thứ tự lớp: ngoài cửa sổ → khách → khung cửa/rèm/bệ → tường trái/phải → bàn → dụng cụ → ngăn kéo.
 */

const flowers = `
<pattern id="pt-flower" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
  <rect width="26" height="26" fill="${P.pink}"/>
  <g transform="translate(7 7)">
    <circle r="2.6" cx="0" cy="-3.4" fill="${P.white}"/><circle r="2.6" cx="3.2" cy="-1" fill="${P.white}"/>
    <circle r="2.6" cx="2" cy="2.8" fill="${P.white}"/><circle r="2.6" cx="-2" cy="2.8" fill="${P.white}"/>
    <circle r="2.6" cx="-3.2" cy="-1" fill="${P.white}"/><circle r="1.9" fill="${P.yellow}"/>
  </g>
  <g transform="translate(20 19)">
    <circle r="1.9" cx="0" cy="-2.5" fill="${P.red}"/><circle r="1.9" cx="2.4" cy="-.7" fill="${P.red}"/>
    <circle r="1.9" cx="1.5" cy="2" fill="${P.red}"/><circle r="1.9" cx="-1.5" cy="2" fill="${P.red}"/>
    <circle r="1.9" cx="-2.4" cy="-.7" fill="${P.red}"/><circle r="1.2" fill="${P.yellow}"/>
  </g>
  <path d="M 15 5 q 3 -3 5 0" stroke="${P.greenDark}" stroke-width="1.6" fill="none"/>
</pattern>`;

const tile = `
<pattern id="pt-tile" width="34" height="34" patternUnits="userSpaceOnUse">
  <rect width="34" height="34" fill="${P.paper}"/>
  <path d="M17 3 L31 17 L17 31 L3 17 Z" fill="${P.teal}"/>
  <path d="M17 10 L24 17 L17 24 L10 17 Z" fill="${P.paper}"/>
  <circle cx="17" cy="17" r="3.4" fill="${P.red}"/>
  <path d="M0 0 L6 0 L0 6 Z M34 0 L28 0 L34 6 Z M0 34 L6 34 L0 28 Z M34 34 L28 34 L34 28 Z" fill="${P.red}"/>
  <rect width="34" height="34" fill="none" stroke="${P.tealDark}" stroke-width="1" opacity=".5"/>
</pattern>`;

const steelBrush = `
<pattern id="pt-steel" width="390" height="14" patternUnits="userSpaceOnUse">
  <rect width="390" height="14" fill="${P.steel}"/>
  <path d="M0 3 H120 M160 3 H300 M20 9 H90 M140 9 H260 M300 9 H390" stroke="${P.steelHi}" stroke-width="1.4" opacity=".75"/>
</pattern>`;

const woodGrain = `
<pattern id="pt-wood" width="80" height="22" patternUnits="userSpaceOnUse">
  <rect width="80" height="22" fill="${P.wood}"/>
  <path d="M0 6 C 20 3 40 9 80 5 M0 15 C 25 18 50 12 80 16" stroke="${P.woodDark}" stroke-width="1.3" fill="none" opacity=".55"/>
</pattern>`;

const gingham = `
<pattern id="pt-gingham" width="36" height="36" patternUnits="userSpaceOnUse">
  <rect width="36" height="36" fill="#FFF6EE"/>
  <rect width="18" height="36" fill="#E63B2E" opacity=".55"/>
  <rect width="36" height="18" fill="#E63B2E" opacity=".55"/>
  <path d="M 3 27 h 10 M 21 9 h 10" stroke="#fff" stroke-width="1.5" opacity=".35"/>
</pattern>`;

export const DEFS = `<defs>${flowers}${tile}${steelBrush}${woodGrain}${gingham}
  <clipPath id="clip-window"><rect x="136" y="30" width="200" height="186"/></clipPath>
</defs>`;

/** Ngoài cửa sổ: trời, dây điện, nhà đối diện. */
export const OUTSIDE = `
<g id="outside" clip-path="url(#clip-window)">
  <rect x="130" y="24" width="214" height="200" fill="${P.sky}"/>
  <circle cx="300" cy="58" r="16" fill="${P.white}" opacity=".9"/>
  <g id="clouds">
    <g class="cloud" transform="translate(160 62)"><path d="M -24 8 Q -26 -4 -14 -6 Q -12 -18 2 -16 Q 10 -26 22 -16 Q 34 -16 32 -4 Q 40 0 34 8 Z" fill="#fff"/><path d="M -18 8 Q 4 2 30 8" stroke="#D6EEF9" stroke-width="3" fill="none" stroke-linecap="round"/></g>
    <g class="cloud" transform="translate(290 86) scale(.7)"><path d="M -24 8 Q -26 -4 -14 -6 Q -12 -18 2 -16 Q 10 -26 22 -16 Q 34 -16 32 -4 Q 40 0 34 8 Z" fill="#fff"/><path d="M -18 8 Q 4 2 30 8" stroke="#D6EEF9" stroke-width="3" fill="none" stroke-linecap="round"/></g>
  </g>
  <g id="sky-birds"></g>
  <!-- nhà đối diện -->
  <rect x="130" y="96" width="120" height="130" fill="#FFD37A"/>
  <rect x="130" y="96" width="120" height="8" fill="#F2B84B"/>
  <rect x="146" y="116" width="30" height="34" fill="#7FB8D9" ${ink(2)}/>
  <path d="M146 133 H176 M161 116 V150" stroke="${P.ink}" stroke-width="1.6"/>
  <rect x="198" y="112" width="40" height="18" fill="${P.red}" ${ink(2)}/>
  <text x="218" y="125" font-family="Paytone One" font-size="9" fill="${P.white}" text-anchor="middle">CẮT TÓC</text>
  <rect x="250" y="84" width="96" height="142" fill="#F7A6B9"/>
  <rect x="250" y="84" width="96" height="8" fill="#E68AA0"/>
  <rect x="266" y="104" width="26" height="30" fill="#7FB8D9" ${ink(2)}/>
  <rect x="306" y="104" width="26" height="30" fill="#7FB8D9" ${ink(2)}/>
  <path d="M262 150 H340" stroke="${P.ink}" stroke-width="2"/>
  <path d="M266 150 V170 M280 150 V170 M294 150 V170 M308 150 V170 M322 150 V170 M336 150 V170" stroke="${P.ink}" stroke-width="1.6"/>
  <!-- dây điện chằng chịt -->
  <path d="M 128 52 Q 230 92 346 60" stroke="${P.ink}" stroke-width="1.6" fill="none"/>
  <path d="M 128 60 Q 220 104 346 70" stroke="${P.ink}" stroke-width="1.6" fill="none"/>
  <path d="M 128 44 Q 250 70 346 80" stroke="${P.ink}" stroke-width="1.6" fill="none"/>
  <path d="M 210 82 q 6 10 2 20 q -4 6 3 10" stroke="${P.ink}" stroke-width="1.6" fill="none"/>
  <!-- chim hạt đậu đậu trên dây -->
  <g id="bird" transform="translate(262 72)">
    <ellipse cx="0" cy="-6" rx="7" ry="6" fill="${P.inkSoft}"/>
    <circle cx="3" cy="-8" r="1.6" fill="${P.white}"/><circle cx="3.4" cy="-8" r=".8" fill="${P.ink}"/>
    <path d="M7 -7 l4 1 l-4 1 z" fill="${P.yellow}"/>
  </g>
  <rect x="130" y="196" width="214" height="30" fill="#8E9AA3"/>
  <path d="M130 200 H344" stroke="#6E7A83" stroke-width="2" stroke-dasharray="14 10"/>
</g>`;

/** Khung cửa sổ, rèm hoa, bệ gỗ — vẽ ĐÈ lên khách. */
export const WINDOW_FRONT = `
<g id="window-front">
  <!-- khung sắt sơn xanh -->
  <path d="M124 20 H348 V228 H124 Z M136 30 V216 H336 V30 Z" fill="${P.blue}" fill-rule="evenodd" ${ink()}/>
  <path d="M127 23 H345" stroke="${P.white}" stroke-width="2" opacity=".5"/>
  <!-- mái tôn nhỏ -->
  <path d="M116 8 H356 L348 26 H124 Z" fill="${P.teal}" ${ink()}/>
  <path d="M140 10 l-3 14 M165 10 l-3 14 M190 10 l-3 14 M215 10 l-2 14 M240 10 l-2 14 M265 10 l-2 14 M290 10 l-1 14 M315 10 l-1 14 M338 10 l-1 14" stroke="${P.tealDark}" stroke-width="2"/>
  <!-- rèm trái -->
  <path d="M136 30 C 152 30 166 30 176 30 C 172 70 160 98 168 124 C 160 132 150 136 140 130 C 142 98 140 60 136 30 Z" fill="url(#pt-flower)" ${ink()}/>
  <path d="M137 132 C 140 160 136 190 140 216 L 152 216 C 150 190 154 156 150 134 Z" fill="url(#pt-flower)" ${ink()}/>
  <path d="M138 124 q 16 10 32 0" stroke="${P.yellow}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- rèm phải -->
  <path d="M336 30 C 320 30 306 30 296 30 C 300 70 312 98 304 124 C 312 132 322 136 332 130 C 330 98 332 60 336 30 Z" fill="url(#pt-flower)" ${ink()}/>
  <path d="M335 132 C 332 160 336 190 332 216 L 320 216 C 322 190 318 156 322 134 Z" fill="url(#pt-flower)" ${ink()}/>
  <path d="M334 124 q -16 10 -32 0" stroke="${P.yellow}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- thanh treo rèm -->
  <rect x="130" y="27" width="212" height="6" rx="3" fill="${P.wood}" ${ink(2)}/>
  <!-- bệ gỗ -->
  <path d="M112 212 H360 L366 226 H106 Z" fill="${P.wood}" ${ink()}/>
  <path d="M106 226 H366 V236 H106 Z" fill="${P.woodDark}" ${ink()}/>
  <path d="M124 218 H250" stroke="${P.paperHi}" stroke-width="2" opacity=".5" stroke-linecap="round"/>
</g>`;

/** Tường bạc hà + mảng gạch bông cao tới mép bàn (y 186→337). */
export const WALL = `
<g id="wall">
  <rect x="0" y="-400" width="390" height="587" fill="${P.mint}"/>
  <path d="M0 -400 H390 V6 H0 Z" fill="${P.mintDark}" opacity=".5"/>
  <!-- vệt ố, vết nứt cho có không khí phòng trọ -->
  <path d="M352 120 q 10 6 6 18 q -6 10 4 22 q 8 10 -2 20 l 30 0 l 0 -64 z" fill="${P.mintDark}" opacity=".55"/>
  <rect x="0" y="186" width="390" height="152" fill="url(#pt-tile)"/>
  <path d="M0 186 H390" stroke="${P.tealDark}" stroke-width="3"/>
  <path d="M18 330 l 12 -18 l -6 -10 l 10 -14" stroke="${P.tealDark}" stroke-width="2" fill="none" opacity=".5"/>
</g>`;

/** Bàn phủ khăn nhựa caro (vùng co giãn): từ t0 tới t1. */
export function tableSvg(t0: number, t1: number): string {
  const f = t1 - 19;
  let frill = `M-4 ${f} H394 V${f + 14}`;
  for (let x = 394; x > -4; x -= 28) frill += ` Q ${x - 7} ${f + 22} ${x - 14} ${f + 14} Q ${x - 21} ${f + 24} ${x - 28} ${f + 14}`;
  frill += ` L -4 ${f + 14} Z`;
  return `
<g id="table">
  <path d="M-4 ${t0} H394 V${f} H-4 Z" fill="url(#pt-gingham)"/>
  <path d="M-4 ${t0} H394 V${t0 + 12} H-4 Z" fill="${P.ink}" opacity=".12"/>
  <path d="M-4 ${t0} H394" stroke="${P.ink}" stroke-width="3"/>
  <path d="M 30 ${t0 + 60} q 40 -6 70 4 M 290 ${f - 30} q 40 -8 90 2 M 120 ${f - 12} q 20 -4 40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>
  <path d="M 20 ${t0 + 14} L 70 ${t0 + 14} L 10 ${f - 10} L -4 ${f - 10} L -4 ${t0 + 120} Z" fill="#fff" opacity=".16"/>
  <ellipse cx="350" cy="${f - 18}" rx="7" ry="4" fill="#8A3826" opacity=".5"/>
  <path d="${frill}" fill="url(#pt-gingham)" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
</g>`;
}

/** Ngăn kéo gỗ (khung) từ y0 tới đáy H. */
export function drawerSvg(y0: number, H: number, padB = 0): string {
  // tủ gỗ: nền + khung viền mực bo góc bao toàn bộ ngăn dưới (như bản Figma)
  return `
<g id="drawer">
  <path d="M-4 ${y0} H394 V${H + 10} H-4 Z" fill="${P.woodDark}"/>
  <path d="M-4 ${y0} H394" stroke="${P.ink}" stroke-width="3"/>
  <rect x="5" y="${y0 + 10}" width="380" height="${H - padB - y0 - 18}" rx="10" fill="#7A4A2A" stroke="${P.ink}" stroke-width="3"/>
</g>`;
}

/**
 * Ổ điện + dây điện chằng chịt trên tường phải (nối máy xay), kéo dài tới mép bàn.
 * Ổ điện ghim theo đồ treo tường (pinY, cùng hệ với lịch) để máy ngắn không bị lịch che; dây giãn theo tới mép bàn.
 */
export function cords(pinY = 0): string {
  const y0 = 168 + pinY, k = (342 - y0) / 174;
  return `
<g id="cords">
  <g transform="translate(0 ${pinY})">
    <rect x="356" y="150" width="28" height="18" rx="3" fill="${P.white}" ${ink(2)}/>
    <circle cx="364" cy="159" r="2" fill="${P.ink}"/><circle cx="376" cy="159" r="2" fill="${P.ink}"/>
  </g>
  <g transform="translate(0 ${y0}) scale(1 ${k.toFixed(3)}) translate(0 -168)">
    <path d="M370 168 C 372 196 384 210 376 236 C 370 256 386 280 378 300 C 372 316 384 326 380 342" stroke="${P.ink}" stroke-width="3" fill="none" vector-effect="non-scaling-stroke"/>
    <path d="M362 168 C 356 190 350 196 356 214 C 362 236 350 262 358 290 C 362 306 354 322 360 342" stroke="${P.red}" stroke-width="3" fill="none" vector-effect="non-scaling-stroke"/>
  </g>
</g>`;
}

export function sceneSvg(L: { H: number; dy: number; topY: number; pinY?: number; padB?: number } = { H: 844, dy: 0, topY: 0 }): string {
  const { H, dy, topY, pinY = 0, padB = 0 } = L;
  return `<svg id="scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 ${H}" width="390" height="${H}">
  ${DEFS}
  ${tableSvg(337 + topY, 571 + dy)}
  <g id="zone-top" transform="translate(0 ${topY})">
    ${WALL}
    ${OUTSIDE}
    <g id="customer-slot" clip-path="url(#clip-window)"></g>
    ${WINDOW_FRONT}
    ${cords(pinY)}
    <g id="wall-left" transform="translate(0 ${pinY})"></g>
    <g id="wall-right" transform="translate(0 ${pinY})"></g>
  </g>
  <g id="table-back"></g>
  <g id="station-blender"></g>
  <g id="station-mortar"></g>
  <g id="station-stove"></g>
  <g id="station-bowl"></g>
  ${drawerSvg(576 + dy, H, padB)}
  <g id="zone-bottom" transform="translate(0 ${dy})">
    <g id="drawer-content"></g>
    <g id="table-front"></g>
  </g>
</svg>`;
}
