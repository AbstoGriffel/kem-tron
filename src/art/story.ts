/**
 * T21 — tranh 5 khung mở đầu (moving comic), vẽ bằng code. Mỗi khung 390×600, các lớp có class để intro.ts tạo chuyển động.
 */
import { beanSvg, type Expr } from './bean';
import { ICONS } from './icons';
import { P, sparklePath } from './kit';
import { BAY_LOOK, fanNan, soHui } from './bay';

const MOM = { color: '#F28E8E', acc: ['toc_uon'] as const };

export function bayBean(expr: Expr, w = 170, h = 215) {
  const svg = beanSvg({ color: BAY_LOOK.color, acc: BAY_LOOK.acc as never }).replace(`face-${expr}" style="display:none"`, `face-${expr}"`);
  return `<svg viewBox="-95 -240 190 250" width="${w}" height="${h}">${svg}<g transform="translate(-62 -30)">${soHui(-8)}</g><g class="sb-fan" transform="translate(62 -40)">${fanNan(20)}</g></svg>`;
}
export function panelHospital() {
  const m = beanSvg({ color: MOM.color, acc: [...MOM.acc] }).replace('face-meh" style="display:none"', 'face-meh"');
  return `<svg viewBox="0 0 390 600" width="390" height="600">
    <rect width="390" height="600" fill="#F6D7A8"/><rect y="420" width="390" height="180" fill="#D9945A"/>
    <rect x="250" y="60" width="110" height="140" fill="#E6F4FA" stroke="${P.ink}" stroke-width="5"/><path d="M 305 60 V 200 M 250 130 H 360" stroke="${P.ink}" stroke-width="4"/>
    <g transform="translate(40 250) rotate(-8)"><path d="M 0 0 L 6 250 M 26 0 L 20 250" stroke="${P.steelDark}" stroke-width="7" stroke-linecap="round"/><rect x="-6" y="-8" width="38" height="14" rx="7" fill="${P.ink}"/><rect x="2" y="110" width="22" height="10" rx="4" fill="${P.ink}"/></g>
<g class="sb-chao"><g transform="translate(300 312)"><rect x="-26" y="0" width="52" height="40" rx="6" fill="${P.white}" stroke="${P.ink}" stroke-width="4"/><path d="M -10 -4 q 4 -14 0 -26 M 6 -4 q 4 -14 0 -26" stroke="#B9C7CF" stroke-width="4" fill="none" stroke-linecap="round"/><text x="0" y="27" font-family="Paytone One" font-size="12" fill="${P.ink}" text-anchor="middle">CHÁO</text></g></g>
    <rect x="70" y="414" width="310" height="22" fill="${P.steel}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M 90 436 V 520 M 360 436 V 520" stroke="${P.steelDark}" stroke-width="7"/>
    <g transform="translate(170 392) scale(1.15)">${m}</g>
    <rect x="80" y="380" width="290" height="40" rx="8" fill="#DDF1FF" stroke="${P.ink}" stroke-width="4"/>
    <rect x="236" y="350" width="120" height="42" rx="21" fill="#FFFDF6" stroke="${P.ink}" stroke-width="4"/>
    <path d="M 284 360 v 22 M 273 371 h 22" stroke="${P.red}" stroke-width="5"/>
<g class="sb-bub"><g transform="translate(234 182)"><rect x="-30" y="-24" width="150" height="56" rx="14" fill="#fff" stroke="${P.ink}" stroke-width="4"/><path d="M -2 32 l -10 18 l 22 -18" fill="#fff" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/><text x="45" y="10" font-family="Baloo 2" font-weight="800" font-size="17" fill="${P.ink}" text-anchor="middle">Ui da… cái chân!</text></g></g>
  </svg>`;
}
export function panelBay() {
  return `<svg viewBox="0 0 390 600" width="390" height="600">
    <rect width="390" height="600" fill="#FFE2B8"/><rect y="460" width="390" height="140" fill="#D9945A"/>
    <rect x="60" y="70" width="230" height="420" fill="#7A4A2E" stroke="${P.ink}" stroke-width="6"/>
    <rect x="80" y="90" width="190" height="390" fill="#2A1A16"/>
<g class="sb-bay"><g transform="translate(180 470) scale(1.35)">${bayBean('talk', 190, 250).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></g>
    <g class="sb-bub"><g transform="translate(250 110)"><rect x="-90" y="-30" width="190" height="66" rx="16" fill="#fff" stroke="${P.ink}" stroke-width="4"/><path d="M -40 36 l -8 22 l 26 -22" fill="#fff" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
      <text x="5" y="-2" font-family="Baloo 2" font-weight="800" font-size="17" fill="${P.ink}" text-anchor="middle">Tới kỳ hụi rồi nha em.</text>
      <text x="5" y="22" font-family="Baloo 2" font-weight="700" font-size="14" fill="${P.inkSoft}" text-anchor="middle">Chị đợi được… mà đừng lâu.</text></g></g>
  </svg>`;
}
export function panelFridge() {
  // đúng hàng đầu game (economy.startStock): 1 loại cốt kem trơn + rau củ; thau nhôm không nằm trong tủ
  // V7-05: hộp kem trơn một mình ngăn trên → vẽ to (100) cho đọc được nhãn "KEM TRƠN" trên máy nhỏ
  const items: [string, number, number][] = [['kem_tron', 156, 190], ['dua_leo', 112, 300], ['ca_chua', 190, 300], ['chanh', 262, 300], ['nghe', 136, 410], ['nuoc_vo_gao', 236, 405]];
  return `<svg viewBox="0 0 390 600" width="390" height="600">
    <rect width="390" height="600" fill="#2E2A4A"/>
    <path class="sb-light" d="M 195 120 L -40 600 H 430 Z" fill="#FFF7C2" opacity=".18"/>
    <rect x="70" y="110" width="250" height="400" rx="16" fill="#EEF2F4" stroke="${P.ink}" stroke-width="6"/>
    <rect x="86" y="126" width="218" height="368" rx="8" fill="#FFFBEA"/>
    <path d="M 86 250 H 304 M 86 360 H 304" stroke="${P.steelDark}" stroke-width="5"/>
    ${items.map(([id, x, y]) => { const z = id === 'kem_tron' ? 100 : 72; return `<g class="sb-item"><svg x="${x - z * 0.47}" y="${y - z * 0.55}" width="${z}" height="${z}" viewBox="0 0 80 80">${ICONS[id]}</svg></g>`; }).join('')}
    <path class="sb-door" d="M 320 110 L 384 80 V 560 L 320 510 Z" fill="#DDE3E7" stroke="${P.ink}" stroke-width="6" stroke-linejoin="round"/>
    <path d="${sparklePath(110, 150, 10)}" fill="#fff"/><path d="${sparklePath(285, 240, 8)}" fill="#fff"/>
  </svg>`;
}

export function panelShop() {
  return `<svg viewBox="0 0 390 600" width="390" height="600">
    <rect width="390" height="600" fill="#9FD8F0"/>
    <rect x="0" y="120" width="120" height="380" fill="#F2B880" stroke="${P.ink}" stroke-width="5"/><rect x="290" y="80" width="100" height="420" fill="#C9E3A0" stroke="${P.ink}" stroke-width="5"/>
    <path d="M 0 500 H 390 V 600 H 0 Z" fill="#B9AFA0"/><path d="M 120 500 L 160 300 H 250 L 290 500 Z" fill="#CFC6B6"/>
    ${[150, 200, 250].map((x, i) => `<path d="M ${x - 30} 70 q 15 20 30 0 q 15 20 30 0" stroke="${[P.red, P.yellow, P.teal][i]}" stroke-width="5" fill="none"/>`).join('')}
    <g class="sb-sign"><g transform="translate(195 250) rotate(-4)"><rect x="-120" y="-50" width="240" height="96" rx="6" fill="#E3C08A" stroke="${P.ink}" stroke-width="5"/>
      <text x="0" y="10" font-family="Paytone One" font-size="44" fill="${P.red}" text-anchor="middle" stroke="${P.ink}" stroke-width="2" paint-order="stroke">KEM TRỘN</text>
      <text x="0" y="36" font-family="Baloo 2" font-weight="800" font-size="15" fill="${P.ink}" text-anchor="middle">trộn tại chỗ — bao trắng*</text>
      <path d="M -90 -50 L -70 -110 M 90 -50 L 70 -110" stroke="${P.ink}" stroke-width="3"/></g></g>
    <rect x="110" y="400" width="200" height="22" fill="${P.wood}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M 120 422 V 500 M 300 422 V 500" stroke="${P.woodDark}" stroke-width="8"/>
    <g transform="translate(210 392)"><path d="M -44 0 Q -38 26 0 28 Q 38 26 44 0" fill="${P.steel}" stroke="${P.ink}" stroke-width="3" transform="translate(0 -26)"/><ellipse cx="0" cy="-26" rx="44" ry="12" fill="${P.steelHi}" stroke="${P.ink}" stroke-width="3"/></g>
    <text x="240" y="590" font-family="Baloo 2" font-weight="700" font-size="11" fill="${P.inkSoft}">*không bao</text>
  </svg>`;
}
export function panelResolve() {
  const rays = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<path d="M 195 300 L ${195 + Math.cos(a) * 520} ${300 + Math.sin(a) * 520} L ${195 + Math.cos(a + 0.18) * 520} ${300 + Math.sin(a + 0.18) * 520} Z" fill="${i % 2 ? '#FFC53D' : '#FF8A3D'}"/>`; }).join('');
  const coin = (x: number, y: number, r: number) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="16" ry="16" fill="${P.yellow}" stroke="${P.ink}" stroke-width="3"/><text y="6" font-family="Paytone One" font-size="15" fill="${P.yellowDark}" text-anchor="middle">đ</text></g>`;
  const bill = (x: number, y: number, r: number) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-26" y="-13" width="52" height="26" rx="3" fill="#9ED36A" stroke="${P.ink}" stroke-width="3"/><circle r="7" fill="#C9EE9A" stroke="${P.ink}" stroke-width="2"/></g>`;
  return `<svg viewBox="0 0 390 600" width="390" height="600">
    <rect width="390" height="600" fill="#FF8A3D"/><g class="sb-rays" style="transform-origin:195px 300px">${rays}</g>
    <g class="sb-money">${coin(60, 90, -10)}${coin(330, 130, 20)}${bill(90, 470, -24)}${bill(310, 430, 18)}${coin(318, 472, 8)}${bill(70, 230, 30)}</g>
    <g class="sb-fist"><g transform="translate(195 380)">
      <path d="M -52 240 L -46 40 H 50 L 56 240 Z" fill="#6CC3F0" stroke="${P.ink}" stroke-width="5"/>
      <rect x="-12" y="-250" width="24" height="330" rx="10" fill="${P.wood}" stroke="${P.ink}" stroke-width="5"/>
      <ellipse cx="0" cy="-262" rx="34" ry="44" fill="${P.wood}" stroke="${P.ink}" stroke-width="5"/>
      <ellipse cx="-8" cy="-272" rx="10" ry="16" fill="#E9B27E"/>
      <rect x="-58" y="-70" width="116" height="112" rx="30" fill="#F2B880" stroke="${P.ink}" stroke-width="5"/>
      <path d="M -58 -38 H 30 M -58 -8 H 30 M -58 20 H 30" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
      <path d="M -40 -70 q 60 -6 84 18 q 10 16 -8 26 h -46" fill="#F2B880" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
      <rect x="-56" y="30" width="112" height="32" rx="6" fill="${P.red}" stroke="${P.ink}" stroke-width="4"/>
      <text x="0" y="54" font-family="Paytone One" font-size="17" fill="#fff" text-anchor="middle">QUYẾT TÂM</text>
      <path d="M 56 44 l 26 -10 l -6 22 z M 56 52 l 24 18 l -26 0 z" fill="${P.red}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
    </g></g>
    <text class="sb-title" x="195" y="46" font-family="Paytone One" font-size="34" fill="#fff" stroke="${P.ink}" stroke-width="3" paint-order="stroke" text-anchor="middle">LÀM GIÀU!</text>
  </svg>`;
}
