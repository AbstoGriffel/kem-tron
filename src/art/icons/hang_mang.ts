import { P, sparklePath } from '../kit';

/**
 * Icon nhóm HÀNG MẠNG — 3 cặp xịn ↔ dỏm. Cùng chuẩn ref.ts:
 * khung 80×80, chạm đáy y≈70, bóng elip y=72, viền mực 3px, 1 bóng cứng + 1 highlight.
 */
const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = `<ellipse cx="40" cy="72" rx="26" ry="5" fill="${P.ink}" opacity=".18"/>`;

/** Tuýp dẹt đứng trên nắp: thân rộng dần lên đến mép gấp ở trên. */
const TUBE = 'M 28 56 L 21 20 H 59 L 52 56 Z';
const TUBE_SHADE = 'M 46 56 L 52 20 H 59 L 52 56 Z';
const CRIMP = 'M 20 13 H 60 V 21 H 20 Z';

export const ICONS_C: Record<string, string> = {
  kcn_xin: `${shadow}
  <g transform="rotate(-8 40 44)">
    <path d="${TUBE}" fill="#FFE9C9" ${S}/>
    <path d="${TUBE_SHADE}" fill="#EBCB9E"/>
    <path d="${CRIMP}" fill="#FFE9C9" ${S}/>
    <path d="M 26 15 V 19 M 31 15 V 19 M 36 15 V 19 M 41 15 V 19 M 46 15 V 19 M 51 15 V 19 M 56 15 V 19" stroke="#D9B27A" stroke-width="1.6"/>
    <path d="M 26 25 L 30 50" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- mặt trời -->
    <g transform="translate(39 33)">
      <path d="M 0 -10 V -7 M 0 10 V 7 M -10 0 H -7 M 10 0 H 7 M -7 -7 L -5 -5 M 7 -7 L 5 -5 M -7 7 L -5 5 M 7 7 L 5 5" stroke="#F08A1C" stroke-width="2.2" stroke-linecap="round"/>
      <circle r="5" fill="#FFB42E" stroke="#F08A1C" stroke-width="1.6"/>
    </g>
    <text x="39.5" y="52" font-family="Paytone One" font-size="9" fill="${P.ink}" text-anchor="middle" textLength="24" lengthAdjust="spacingAndGlyphs">SUN PRO</text>
    <!-- tem bạc -->
    <circle cx="50" cy="25" r="4.2" fill="${P.steel}" stroke="${P.steelDark}" stroke-width="1.5"/>
    <path d="M 48 24 L 50 22.5" stroke="${P.white}" stroke-width="1.4" stroke-linecap="round"/>
    <!-- nắp vàng cam -->
    <path d="M 27 56 H 53 L 54 68 C 54 70 26 70 26 68 Z" fill="#FFA31A" ${S}/>
    <path d="M 46 57 H 52 L 53 68 C 51 69 48 69 46 69 Z" fill="#D9800A"/>
    <path d="M 30 59 V 66" stroke="#FFD27A" stroke-width="2.5" stroke-linecap="round"/>
  </g>`,

  kcn_dom: `${shadow}
  <g transform="rotate(-8 40 44)">
    <path d="${TUBE}" fill="#FFE0B0" ${S}/>
    <path d="${TUBE_SHADE}" fill="#E8BE80"/>
    <path d="M 20 14 H 60 V 21 H 20 Z" fill="#FFE0B0" ${S} transform="rotate(-4 40 17)"/>
    <path d="M 26 25 L 30 50" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- mặt trời vẽ méo -->
    <g transform="translate(39 35) rotate(12)">
      <path d="M 0 -10 V -6 M 0 9 V 6 M -10 1 H -6 M 10 -1 H 6 M -7 -6 L -5 -4 M 6 6 L 4 4" stroke="#E0701A" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse rx="6" ry="4.4" fill="#FF9E3D" stroke="#E0701A" stroke-width="1.6"/>
    </g>
    <text x="39.5" y="52" font-family="Paytone One" font-size="8" fill="${P.ink}" text-anchor="middle" textLength="25" lengthAdjust="spacingAndGlyphs" transform="rotate(-5 39 52)">SUN PỜ-RỒ</text>
    <!-- băng keo quấn ngang -->
    <g transform="rotate(-12 40 26)">
      <rect x="17" y="23" width="46" height="7" fill="#F2DC8A" opacity=".85" stroke="${P.ink}" stroke-width="2"/>
      <path d="M 17 23 l -2 3.5 l 2 3.5" fill="none" stroke="${P.ink}" stroke-width="1.6"/>
      <path d="M 22 25 H 34" stroke="${P.white}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
    </g>
    <!-- nắp lệch màu, vặn xiên -->
    <g transform="rotate(7 40 62)">
      <path d="M 27 56 H 53 L 54 68 C 54 70 26 70 26 68 Z" fill="#7FC7A8" ${S}/>
      <path d="M 46 57 H 52 L 53 68 C 51 69 48 69 46 69 Z" fill="#5AA586"/>
      <path d="M 30 59 V 66" stroke="#C6EBDB" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  </g>`,

  bot_bat_tong: `${shadow}
  <g transform="rotate(5 40 46)">
    <!-- lọ thuỷ tinh -->
    <path d="M 18 34 C 18 30 22 28 26 28 H 54 C 58 28 62 30 62 34 V 64 C 62 69 58 70 54 70 H 26 C 22 70 18 69 18 64 Z" fill="#E2EEF5" ${S}/>
    <!-- bột trắng tinh -->
    <path d="M 20 44 C 28 40 40 44 48 41 C 54 39 58 41 60 42 V 64 C 60 67 57 68 54 68 H 26 C 23 68 20 67 20 64 Z" fill="#FDFDFF"/>
    <path d="M 20 44 C 28 40 40 44 48 41 C 54 39 58 41 60 42" stroke="#C9D6E2" stroke-width="2" fill="none"/>
    <path d="M 52 44 C 58 44 60 50 60 56 V 64 C 60 67 57 68 54 68 H 50 C 55 64 56 52 52 44 Z" fill="#DCE6F0"/>
    <path d="M 23 36 V 60" stroke="${P.white}" stroke-width="4" stroke-linecap="round"/>
    <!-- nhãn sang trọng -->
    <rect x="22" y="49" width="37" height="13" rx="2" fill="#3B2A5A" stroke="#D9A93A" stroke-width="2"/>
    <text x="40.5" y="58.5" font-family="Paytone One" font-size="8" fill="#FFD66B" text-anchor="middle" textLength="32" lengthAdjust="spacingAndGlyphs">BẬT TÔNG</text>
    <!-- nắp bạc -->
    <path d="M 22 18 C 22 15 24 14 27 14 H 53 C 56 14 58 15 58 18 V 29 H 22 Z" fill="${P.steel}" ${S}/>
    <path d="M 48 15 H 53 C 56 15 57 16 57 18 V 28 H 48 Z" fill="${P.steelDark}"/>
    <path d="M 27 18 H 40" stroke="${P.steelHi}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M 22 24 H 58" stroke="${P.ink}" stroke-width="1.6"/>
    <!-- lấp lánh -->
    <path d="${sparklePath(66, 18, 6)}" fill="${P.yellow}" stroke="${P.ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="${sparklePath(13, 30, 4.5)}" fill="${P.yellow}" stroke="${P.ink}" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="${sparklePath(36, 45, 3)}" fill="#BFD2FF"/>
  </g>`,

  oc_sen: `${shadow}
  <g transform="rotate(-6 40 46)">
    <!-- chai -->
    <path d="M 33 34 V 38 C 26 39 24 43 24 48 V 66 C 24 69 26 70 29 70 H 51 C 54 70 56 69 56 66 V 48 C 56 43 54 39 47 38 V 34 Z" fill="#E8E2F2" ${S}/>
    <path d="M 48 41 C 53 43 54 46 54 49 V 66 C 54 68 53 68 51 68 H 46 C 50 62 51 50 48 41 Z" fill="#C9BEE0"/>
    <path d="M 28 47 V 62" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- nhãn ốc sên -->
    <rect x="30" y="49" width="21" height="16" rx="2" fill="${P.white}" stroke="${P.ink}" stroke-width="2"/>
    <path d="M 33 62 H 47 C 49 62 49 60 47 60 H 45" fill="#B8E07A" stroke="${P.ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="39" cy="57" r="4.2" fill="#F2A65A" stroke="${P.ink}" stroke-width="1.5"/>
    <path d="M 39 57 m -1.6 0 a 1.6 1.6 0 1 1 1.6 1.6" fill="none" stroke="${P.ink}" stroke-width="1.2"/>
    <path d="M 45 60 L 46 55 M 47 60 L 49 56" stroke="${P.ink}" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="46" cy="55" r="1" fill="${P.ink}"/><circle cx="49" cy="56" r="1" fill="${P.ink}"/>
    <!-- khoen + bóp cao su -->
    <path d="M 30 28 H 50 V 36 H 30 Z" fill="${P.steelDark}" ${S}/>
    <path d="M 33 30 V 34" stroke="${P.steel}" stroke-width="2" stroke-linecap="round"/>
    <path d="M 34 28 C 33 20 33 12 40 11 C 47 12 47 20 46 28 Z" fill="#9A6AC8" ${S}/>
    <path d="M 42 13 C 45 15 45 22 44 28 H 46 C 47 20 47 13 42 13 Z" fill="#7A4AA8"/>
    <path d="M 37 15 C 36 18 36 21 36.5 24" stroke="#C9A8EA" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- giọt rơi -->
    <path d="M 63 40 C 60 45 60 48 63 48 C 66 48 66 45 63 40 Z" fill="#E8E2F2" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
  </g>`,

  collagen_dom: `${shadow}
  <g transform="rotate(7 40 44)">
    <!-- gói zip đứng -->
    <path d="M 20 12 H 60 L 62 60 C 62 66 58 70 52 70 H 28 C 22 70 18 66 18 60 Z" fill="#FFC2D6" ${S}/>
    <path d="M 52 22 L 60 22 L 62 60 C 62 66 58 70 52 70 H 46 C 54 64 56 40 52 22 Z" fill="#EE97B5"/>
    <path d="M 20 20 H 60" stroke="${P.ink}" stroke-width="2"/>
    <path d="M 20 23 H 60" stroke="#E07FA0" stroke-width="1.6" stroke-dasharray="2 2"/>
    <path d="M 60 15 l -3 2 l 3 2" fill="none" stroke="${P.ink}" stroke-width="1.6"/>
    <path d="M 24 28 V 58" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- chữ lạ nguệch ngoạc -->
    <path d="M 28 31 q 2 -4 4 0 t 4 0 q 1 -3 3 1 l 2 -3 q 2 3 4 -1 t 4 2 l 3 -2" fill="none" stroke="${P.redDark}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 29 37 c 2 -2 3 2 5 0 s 2 -3 4 0 m 3 0 l 1 -3 l 2 4 c 1 -2 3 -2 4 0" fill="none" stroke="${P.ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- cô gái mặt hạt đậu -->
    <path d="M 33 64 C 30 56 31 44 40 43 C 49 44 50 56 47 64 Z" fill="#3A2420" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="40" cy="54" rx="6.5" ry="8" fill="#F8D8C0" stroke="${P.ink}" stroke-width="2"/>
    <path d="M 33.5 50 C 35 45 45 45 46.5 50 C 43 48 37 48 33.5 50 Z" fill="#3A2420"/>
    <circle cx="37.5" cy="53" r="1.1" fill="${P.ink}"/><circle cx="42.5" cy="53" r="1.1" fill="${P.ink}"/>
    <path d="M 38 57.5 q 2 1.6 4 0" fill="none" stroke="${P.ink}" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="35.8" cy="55.5" rx="1.4" ry=".9" fill="${P.pink}"/><ellipse cx="44.2" cy="55.5" rx="1.4" ry=".9" fill="${P.pink}"/>
    <!-- lấp lánh dỏm + chữ lạ -->
    <path d="${sparklePath(52, 46, 3.5)}" fill="${P.white}" stroke="${P.ink}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 49 64 l 2 -3 l 2 3 l 2 -3" fill="none" stroke="${P.redDark}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`,
};
