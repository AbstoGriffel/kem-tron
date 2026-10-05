import { P } from '../kit';

/**
 * Icon nguyên liệu MẪU — chuẩn phong cách cho mọi icon khác.
 * Khung 80×80, vật đặt giữa, chạm đáy ở y≈70, bóng đổ elip mờ ở y=72.
 * Viền mực 3px (#2A1A16) quanh khối chính, 1 mảng bóng cứng (màu đậm hơn 15–25%) + 1 highlight trắng.
 * Có "tính cách": hơi nghiêng, hơi méo, chi tiết hài nhỏ (nhãn, chữ nguệch ngoạc...).
 */
const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = `<ellipse cx="40" cy="72" rx="26" ry="5" fill="${P.ink}" opacity=".18"/>`;

export const REF_ICONS: Record<string, string> = {
  dua_leo: `${shadow}
  <g transform="rotate(-28 40 44)">
    <path d="M 14 44 C 14 32 24 30 40 30 C 56 30 66 32 66 44 C 66 56 56 58 40 58 C 24 58 14 56 14 44 Z" fill="#5FA83A" ${S}/>
    <path d="M 18 48 C 24 55 56 56 63 48 C 60 54 50 57 40 57 C 28 57 20 54 18 48 Z" fill="#3F7F26"/>
    <path d="M 24 37 C 32 34 46 34 54 36" stroke="#A6DB7A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="28" cy="46" r="1.6" fill="#2E5E1B"/><circle cx="38" cy="50" r="1.6" fill="#2E5E1B"/><circle cx="48" cy="45" r="1.6" fill="#2E5E1B"/><circle cx="56" cy="50" r="1.6" fill="#2E5E1B"/>
    <path d="M 66 44 l 6 -3 l -1 6 z" fill="#8A6A2A" ${S}/>
    <circle cx="15" cy="44" r="3.5" fill="#F5E27A" stroke="${P.ink}" stroke-width="2"/>
  </g>`,

  chanh: `${shadow}
  <g>
    <circle cx="34" cy="46" r="20" fill="#7CC23A" ${S}/>
    <path d="M 18 54 C 24 64 44 66 52 54 C 48 62 40 66 34 66 C 26 66 20 62 18 54 Z" fill="#5A9A24"/>
    <path d="M 24 38 C 27 33 32 31 37 31" stroke="#C8EE8A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 34 26 C 36 20 42 18 46 20 C 44 25 39 27 34 26 Z" fill="#4E9A2C" ${S}/>
    <!-- nửa trái chanh bổ đôi -->
    <g transform="translate(56 54) rotate(14)">
      <circle r="13" fill="#7CC23A" ${S}/>
      <circle r="9.5" fill="#E9F7A8"/>
      <path d="M0 0 L0 -8 M0 0 L7 -4 M0 0 L7 4 M0 0 L0 8 M0 0 L-7 4 M0 0 L-7 -4" stroke="#B9DD5A" stroke-width="2"/>
      <circle r="1.8" fill="#B9DD5A"/>
    </g>
  </g>`,

  bot_trang_dom: `${shadow}
  <g transform="rotate(8 40 46)">
    <path d="M 20 22 H 60 L 62 66 C 62 70 18 70 18 66 Z" fill="#EEF4FA" opacity=".95" ${S}/>
    <path d="M 20 22 H 60 V 28 H 20 Z" fill="${P.red}" ${S}/>
    <path d="M 20 44 C 30 40 50 46 61 42 L 62 66 C 62 70 18 70 18 66 Z" fill="${P.white}"/>
    <path d="M 20 44 C 30 40 50 46 61 42" stroke="#C9D6E2" stroke-width="2" fill="none"/>
    <path d="M 26 32 L 26 60" stroke="${P.white}" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    <!-- chữ nguệch ngoạc bằng bút lông -->
    <text x="41" y="58" font-family="Paytone One" font-size="10" fill="${P.ink}" text-anchor="middle" transform="rotate(-6 41 58)">???</text>
    <path d="M 46 50 l 8 -6 M 54 50 l -8 -6" stroke="${P.red}" stroke-width="2.4" stroke-linecap="round"/>
  </g>`,
};
