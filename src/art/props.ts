import { ink, P } from './kit';

/** Hằng số hình học dùng chung giữa art và logic tương tác. */
export const BOWL = { cx: 188, cy: 370, rx: 112, ry: 40, irx: 98, iry: 33, bottomY: 452, brx: 70 };
export const BLENDER = { x: 277, jarTop: 304, jarBottom: 430, baseBottom: 508, cx: 319 };
export const MORTAR = { cx: 47, cy: 442, rx: 42, ry: 13 };
export const STOVE = { knobX: 253, knobY: 488, ox: -17, oy: 12 };

/** Dời toàn bộ trạm trên bàn theo độ co giãn dọc (gọi 1 lần trước khi vẽ). */
let appliedMid = 0;
export function applyStationLayout(midY: number) {
  const d = midY - appliedMid;
  if (!d) return;
  appliedMid = midY;
  BOWL.cy += d; BOWL.bottomY += d;
  BLENDER.jarTop += d; BLENDER.jarBottom += d; BLENDER.baseBottom += d;
  MORTAR.cy += d;
  STOVE.knobY += d; STOVE.oy += d;
}

/** Thau nhôm: thân sau (vẽ trước kem) và vành trước (vẽ sau kem). */
export function bowlBack(): string {
  const { cx, cy, rx, ry, bottomY, brx } = BOWL;
  return `
  <g id="bowl-body">
    <ellipse cx="${cx}" cy="${bottomY + 6}" rx="${brx + 18}" ry="10" fill="${P.ink}" opacity=".18"/>
    <path d="M ${cx - rx + 6} ${cy + 4} C ${cx - rx + 18} ${cy + 50} ${cx - brx - 6} ${bottomY - 10} ${cx - brx} ${bottomY}
             A ${brx} 16 0 0 0 ${cx + brx} ${bottomY}
             C ${cx + brx + 6} ${bottomY - 10} ${cx + rx - 18} ${cy + 50} ${cx + rx - 6} ${cy + 4} Z"
          fill="${P.steel}" ${ink()}/>
    <path d="M ${cx - 70} ${cy + 26} C ${cx - 67} ${cy + 42} ${cx - 62} ${cy + 54} ${cx - 58} ${cy + 62}" stroke="${P.steelHi}" stroke-width="9" fill="none" opacity=".9" stroke-linecap="round"/>
    <path d="M ${cx + 62} ${cy + 30} C ${cx + 59} ${cy + 46} ${cx + 55} ${cy + 56} ${cx + 52} ${cy + 64}" stroke="${P.steelDark}" stroke-width="6" fill="none" opacity=".45" stroke-linecap="round"/>
    <path d="M ${cx - brx - 2} ${bottomY - 16} A ${brx + 4} 15 0 0 0 ${cx + brx + 2} ${bottomY - 16}" stroke="${P.steelDark}" stroke-width="2" fill="none" opacity=".6"/>
  </g>
  <g id="bowl-rim-back">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${P.steelDark}" ${ink()}/>
    <ellipse cx="${cx}" cy="${cy + 3}" rx="${rx - 9}" ry="${ry - 6}" fill="${P.steelDeep}"/>
  </g>`;
}

export function bowlFront(): string {
  const { cx, cy, rx, ry } = BOWL;
  // nửa trước của vành cuộn
  return `
  <g id="bowl-rim-front">
    <path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L ${cx + rx - 8} ${cy}
             A ${rx - 8} ${ry - 6} 0 0 1 ${cx - rx + 8} ${cy} Z" fill="${P.steel}" ${ink()}/>
    <path d="M ${cx - rx + 14} ${cy + 14} A ${rx - 6} ${ry - 4} 0 0 0 ${cx - 20} ${cy + ry - 1}" stroke="${P.steelHi}" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`;
}

/** Bếp ga mini dưới thau. */
export function stove(): string {
  const knobX = 270, knobY = 476;
  return `
  <g id="stove" transform="translate(${STOVE.ox} ${STOVE.oy})">
    <path d="M 112 440 H 298 L 304 506 H 106 Z" fill="${P.ink}" ${ink(2.2)}/>
    <path d="M 118 448 H 292 L 296 500 H 114 Z" fill="${P.red}"/>
    <path d="M 118 448 H 292 L 293 458 H 117 Z" fill="${P.redDark}"/>
    <!-- V3-23: nhãn hạ 6px → đáy thau (máy cao) không che viền trên nhãn; vẫn nằm trong mặt đỏ của đế (448–500) -->
    <!-- V7-13: chưa mở bếp (chưa có núm) thì shop.ts dời nhãn vào giữa mặt đế (tâm x 205) -->
    <g id="ga-tag"><rect x="128" y="474" width="100" height="21" rx="4" fill="${P.white}" ${ink(1.8)}/>
    <text x="178" y="489" font-family="Paytone One" font-size="11" fill="${P.red}" text-anchor="middle">GA MINI</text></g>
    <g id="flame" opacity="0">
      <path d="M150 440 q 6 -18 12 0 q 6 -14 12 0 q 6 -20 12 0 q 6 -14 12 0 q 6 -18 12 0 q 6 -14 12 0 q 6 -20 12 0 q 6 -14 12 0 q 6 -18 12 0 z" fill="${P.blue}"/>
      <path d="M156 440 q 4 -10 8 0 q 4 -8 8 0 q 4 -12 8 0 q 4 -8 8 0 q 4 -10 8 0 q 4 -8 8 0 q 4 -12 8 0 q 4 -8 8 0 q 4 -10 8 0 q 4 -8 8 0 q 4 -10 8 0 q 4 -8 8 0 z" fill="${P.sky}"/>
    </g>
    <g id="knob" transform="translate(${knobX} ${knobY})">
      <circle r="17" fill="${P.ink}"/>
      <circle r="14" fill="${P.steel}" ${ink(1.8)}/>
      <rect x="-3.5" y="-13" width="7" height="16" rx="3" fill="${P.ink}"/>
    </g>
  </g>`;
}

/** Máy xay sinh tố. */
export function blender(): string {
  const { x, jarTop, jarBottom, baseBottom, cx } = BLENDER;
  return `
  <g id="blender">
    <ellipse cx="${cx}" cy="${baseBottom + 2}" rx="44" ry="8" fill="${P.ink}" opacity=".2"/>
    <g id="blender-jar">
      <path d="M ${x + 6} ${jarTop + 10} H ${x + 78} L ${x + 70} ${jarBottom} H ${x + 14} Z" fill="#D8F0FA" opacity=".75" ${ink()}/>
      <path d="M ${x + 78} ${jarTop + 24} q 12 6 10 36 q -3 26 -12 30" stroke="${P.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M ${x + 78} ${jarTop + 24} q 12 6 10 36 q -3 26 -12 30" stroke="#D8F0FA" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g id="blender-content"></g>
      <path d="M ${x + 16} ${jarTop + 22} L ${x + 22} ${jarBottom - 10}" stroke="${P.white}" stroke-width="5" opacity=".8" stroke-linecap="round"/>
      <path d="M ${x + 58} ${jarTop + 40} h 10 M ${x + 58} ${jarTop + 62} h 10 M ${x + 58} ${jarTop + 84} h 10" stroke="${P.blueDark}" stroke-width="2"/>
      <g id="blender-blade" transform="translate(${cx} ${jarBottom - 8})">
        <path d="M -16 0 L 16 0 M 0 -4 L 0 4" stroke="${P.steelDeep}" stroke-width="4" stroke-linecap="round"/>
      </g>
      <rect id="blender-lid" x="${x + 2}" y="${jarTop}" width="80" height="14" rx="5" fill="${P.ink}"/>
      <rect x="${x + 30}" y="${jarTop - 8}" width="24" height="10" rx="4" fill="${P.ink}"/>
    </g>
    <path d="M ${x + 8} ${jarBottom} H ${x + 76} L ${x + 84} ${baseBottom} H ${x} Z" fill="${P.pink}" ${ink()}/>
    <path d="M ${x + 8} ${jarBottom} H ${x + 76} L ${x + 77} ${jarBottom + 10} H ${x + 7} Z" fill="${P.pinkDark}"/>
    <g id="blender-btn" transform="translate(${cx} ${jarBottom + 44})">
      <circle r="20" fill="${P.ink}"/>
      <circle id="blender-btn-cap" r="16" fill="${P.yellow}" ${ink(2)}/>
      <text y="5" font-family="Paytone One" font-size="12" fill="${P.ink}" text-anchor="middle">XAY</text>
    </g>
  </g>`;
}

/** Cối đá + chày. */
export function mortar(): string {
  const { cx, cy, rx, ry } = MORTAR;
  return `
  <g id="mortar">
    <ellipse cx="${cx}" cy="${cy + 58}" rx="${rx + 4}" ry="9" fill="${P.ink}" opacity=".2"/>
    <path d="M ${cx - rx} ${cy} C ${cx - rx + 2} ${cy + 40} ${cx - 24} ${cy + 56} ${cx} ${cy + 56} C ${cx + 24} ${cy + 56} ${cx + rx - 2} ${cy + 40} ${cx + rx} ${cy} Z" fill="#A79B90" ${ink()}/>
    <path d="M ${cx - rx + 8} ${cy + 12} C ${cx - rx + 12} ${cy + 34} ${cx - 22} ${cy + 46} ${cx - 8} ${cy + 48}" stroke="#C9BEB3" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="${cx + 20}" cy="${cy + 30}" r="2" fill="#7E7268"/><circle cx="${cx + 10}" cy="${cy + 40}" r="1.6" fill="#7E7268"/><circle cx="${cx - 18}" cy="${cy + 24}" r="1.6" fill="#7E7268"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#8C8076" ${ink()}/>
    <ellipse cx="${cx}" cy="${cy + 2}" rx="${rx - 8}" ry="${ry - 5}" fill="#6E6359"/>
    <g id="mortar-content"></g>
    <!-- V7-12: chày nghiêng ít hơn (−16°) → đầu chày cách mép trái màn ≥ 6px -->
    <g transform="translate(${cx - 10} ${cy + 2})"><g id="pestle" transform="rotate(-16)">
      <path d="M -8 -70 C -10 -40 -12 -14 -12 0 C -12 8 12 8 12 0 C 12 -14 10 -40 8 -70 C 8 -78 -8 -78 -8 -70 Z" fill="#B8ACA1" ${ink()}/>
      <path d="M -3 -64 L -5 -6" stroke="#D8CEC4" stroke-width="3" stroke-linecap="round"/>
    </g></g>
  </g>`;
}

/** Điện thoại trên chân máy + đèn ring. */
export function livePhone(): string {
  return `
  <g id="live-rig">
    <path d="M 64 214 L 30 338 M 64 214 L 98 338 M 64 214 L 64 338" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
    <g id="ring-light">
      <circle cx="64" cy="124" r="52" fill="none" stroke="${P.ink}" stroke-width="15"/>
      <circle id="ring-glow" cx="64" cy="124" r="52" fill="none" stroke="${P.white}" stroke-width="10" opacity=".55"/>
    </g>
    <g transform="translate(64 153) scale(1.16) translate(-64 -97)"><g id="phone">
      <rect x="33" y="40" width="62" height="114" rx="10" fill="${P.ink}"/>
      <rect id="phone-screen" x="37" y="47" width="54" height="100" rx="6" fill="#3B2E2A"/>
      <rect x="54" y="42" width="20" height="3" rx="1.5" fill="#5A4A45"/>
      <g id="phone-off">
        <circle cx="64" cy="92" r="15" fill="${P.red}" ${ink(2)}/>
        <circle cx="64" cy="92" r="6" fill="${P.white}"/>
        <text x="64" y="126" font-family="Paytone One" font-size="10" fill="${P.white}" text-anchor="middle">BẬT LIVE</text>
      </g>
    </g></g>
  </g>`;
}

/** Đồng hồ treo tường (góc phải trên). Kim xoay quanh (0,0). */
export function clock(): string {
  return `
  <g transform="translate(369 53)"><g id="clock">
    <circle r="15" fill="${P.white}" ${ink()}/>
    <path d="M0 -11 v3 M11 0 h-3 M0 11 v-3 M-11 0 h3" stroke="${P.ink}" stroke-width="2"/>
    <g id="clock-h"><path d="M0 0 V -7" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/></g>
    <g id="clock-m"><path d="M0 0 V -10" stroke="${P.red}" stroke-width="2" stroke-linecap="round"/></g>
    <circle r="2.2" fill="${P.ink}"/>
  </g></g>`;
}

/** Lịch xé (ngày). */
export function calendar(): string {
  return `
  <g id="calendar" transform="translate(352 78)">
    <path d="M 0 0 H 34 V 50 H 0 Z" fill="${P.white}" ${ink(2)}/>
    <rect x="0" y="0" width="34" height="11" fill="${P.red}" ${ink(2)}/>
    <circle cx="17" cy="-4" r="3" fill="none" stroke="${P.ink}" stroke-width="2"/>
    <text x="17" y="9" font-family="Paytone One" font-size="7" fill="${P.white}" text-anchor="middle">NGÀY</text>
    <text id="calendar-day" x="17" y="38" font-family="Paytone One" font-size="22" fill="${P.red}" text-anchor="middle">1</text>
    <path d="M3 47 H31" stroke="${P.steelDark}" stroke-width="1" stroke-dasharray="2 2"/>
  </g>`;
}

/** Hộp bánh quy đựng tiền, đặt trên bệ cửa. */
export function moneyTin(): string {
  return `
  <g id="tin" transform="translate(174 796)">
    <ellipse cx="0" cy="22" rx="34" ry="6" fill="${P.ink}" opacity=".2"/>
    <path d="M -32 0 V 16 A 32 9 0 0 0 32 16 V 0 Z" fill="${P.blue}" ${ink()}/>
    <path d="M -32 6 A 32 9 0 0 0 32 6" stroke="${P.white}" stroke-width="2" fill="none" stroke-dasharray="3 4"/>
    <g id="tin-lid">
      <ellipse cx="0" cy="0" rx="34" ry="10" fill="${P.blueDark}" ${ink()}/>
      <ellipse cx="0" cy="-2" rx="27" ry="7" fill="${P.blue}"/>
      <text id="tin-money" x="0" y="2" font-family="Paytone One" font-size="11" fill="${P.white}" text-anchor="middle">0k</text>
    </g>
  </g>`;
}

/** Giấy "mời lên phường" dán tường — số tờ theo mức nghi ngờ. */
export function noticeSheet(i: number): string {
  const rot = [-8, 6, -3, 10, -12][i % 5];
  const y = 196 + i * 26;
  const tint = i >= 3 ? P.red : i >= 2 ? P.yellow : P.white;
  return `<g class="notice" transform="translate(${368 + (i % 2 ? 3 : -2)} ${y}) rotate(${rot})">
    <rect x="-16" y="-14" width="32" height="40" fill="${tint === P.white ? P.white : tint}" ${ink(2)}/>
    <rect x="-6" y="-17" width="12" height="6" fill="${P.paper}" opacity=".9"/>
    <path d="M-10 -4 H10 M-10 2 H10 M-10 8 H4" stroke="${P.ink}" stroke-width="1.6"/>
    <text x="0" y="22" font-family="Paytone One" font-size="6" fill="${P.ink}" text-anchor="middle">GIẤY MỜI</text>
  </g>`;
}
