import { P } from '../art/kit';
import { shade } from '../core/color';

const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"`;

/** Hũ kem (khung 80×80) với màu kem + nhãn. */
export function jarSvg(jar: string, cream: string, label: string | null): string {
  const shadow = `<ellipse cx="40" cy="72" rx="26" ry="5" fill="${P.ink}" opacity=".2"/>`;
  const creamTop = `<path d="M 18 30 C 18 18 30 14 40 20 C 48 12 62 18 62 30 Z" fill="${cream}" ${S}/>
    <path d="M 28 24 q 8 -6 14 0 q 6 -6 12 0" stroke="${shade(cream, 0.4)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  let body = '';
  if (jar === 'nhua') {
    body = `${creamTop}
      <path d="M 16 30 H 64 L 61 68 Q 40 74 19 68 Z" fill="#F4F1EA" ${S}/>
      <path d="M 22 36 L 23 62" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <path d="M 16 30 H 64 V 36 H 16 Z" fill="#E2DCCF" ${S}/>`;
  } else if (jar === 'thuy_tinh') {
    body = `${creamTop}
      <path d="M 16 30 H 64 L 64 66 Q 40 74 16 66 Z" fill="${cream}" ${S}/>
      <path d="M 16 30 H 64 L 64 66 Q 40 74 16 66 Z" fill="#BFE6F2" opacity=".45"/>
      <path d="M 21 34 L 21 62" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <path d="M 58 36 L 58 60" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <rect x="14" y="26" width="52" height="7" rx="3" fill="${P.steel}" ${S}/>`;
  } else {
    body = `${creamTop}
      <path d="M 14 30 H 66 L 62 68 Q 40 76 18 68 Z" fill="${P.yellow}" ${S}/>
      <path d="M 18 66 Q 40 74 62 66 L 62 68 Q 40 76 18 68 Z" fill="${P.yellowDark}"/>
      <path d="M 20 36 L 22 62" stroke="#FFF2B8" stroke-width="5" stroke-linecap="round"/>
      <path d="M 14 30 H 66 V 36 H 14 Z" fill="${P.yellowDark}" ${S}/>
      <circle cx="24" cy="33" r="1.6" fill="#fff"/><circle cx="34" cy="33" r="1.6" fill="#fff"/><circle cx="46" cy="33" r="1.6" fill="#fff"/><circle cx="56" cy="33" r="1.6" fill="#fff"/>`;
  }
  return shadow + body + (label ? labelSvg(label) : '');
}

export function labelSvg(id: string): string {
  switch (id) {
    case 'viet_tay':
      // nhãn nới ra 40 + chữ ép vừa trong lòng nhãn (textLength) → chữ không trồi qua viền
      return `<g transform="rotate(-4 40 52)"><rect x="20" y="43" width="40" height="17" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="1.6"/>
        <text x="40" y="54.5" font-family="Baloo 2" font-weight="700" font-size="7" fill="${P.blueDark}" text-anchor="middle" textLength="34" lengthAdjust="spacingAndGlyphs">kem nhà làm</text></g>`;
    case 'decal':
      // V7-07: chữ nhỏ lại + hạ xuống → dấu Ắ không chạm viền trên viên thuốc, dòng 2 không dính chân dòng 1
      return `<g><rect x="19" y="40.5" width="42" height="20.5" rx="10" fill="${P.pink}" stroke="${P.ink}" stroke-width="1.8"/>
        <text x="40" y="50.6" font-family="Paytone One" font-size="5.5" fill="#fff" stroke="${P.ink}" stroke-width="1.2" paint-order="stroke" text-anchor="middle">TRẮNG</text>
        <text x="40" y="58.6" font-family="Paytone One" font-size="5.5" fill="${P.ink}" text-anchor="middle">THẦN SẦU</text>
        <path d="M 24 46 l 3 0" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`;
    case 'thien_nhien':
      return `<g><rect x="20" y="42" width="40" height="18" rx="3" fill="${P.green}" stroke="${P.ink}" stroke-width="1.8"/>
        <path d="M 22.5 55 q 0 -8 7 -9 q 0 8 -7 9 z" fill="#C9EE9A" stroke="${P.ink}" stroke-width="1"/>
        <text x="45" y="49.5" font-family="Paytone One" font-size="6.5" fill="#fff" text-anchor="middle">100%</text>
        <text x="45" y="57.5" font-family="Paytone One" font-size="5.2" fill="#fff" text-anchor="middle" textLength="26" lengthAdjust="spacingAndGlyphs">THIÊN NHIÊN</text></g>`;
    case 'nhap_khau':
      return `<g transform="rotate(3 40 52)"><rect x="18" y="42" width="44" height="18" fill="${P.white}" stroke="${P.ink}" stroke-width="1.8"/>
        <rect x="20" y="44" width="9" height="6" fill="${P.blue}"/><path d="M 20 47 h 9" stroke="${P.red}" stroke-width="2"/>
        <text x="46" y="49.5" font-family="Paytone One" font-size="5.2" fill="${P.ink}" text-anchor="middle">WHITTE MAJIC</text>
        <text x="40" y="57" font-family="Paytone One" font-size="5.8" fill="${P.red}" text-anchor="middle">KREAM 100%</text></g>`;
  }
  return '';
}
