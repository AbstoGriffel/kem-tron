import { P } from '../kit';

/** Nguyên liệu chợ / tạp hoá — theo chuẩn REF_ICONS (80×80, viền mực 3px, 1 bóng cứng + 1 highlight). */
const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = `<ellipse cx="40" cy="72" rx="26" ry="5" fill="${P.ink}" opacity=".18"/>`;

export const ICONS_B: Record<string, string> = {
  // Chai nhựa cắt nửa đựng nước vo gạo đục, dây thun quấn ngang, hạt gạo trôi
  nuoc_vo_gao: `${shadow}
  <g transform="rotate(-6 40 46)">
    <path d="M 20 26 L 25 23 L 29 27 L 34 22 L 39 26 L 44 22 L 49 27 L 54 23 L 60 26 L 58 64 C 58 70 22 70 22 64 Z" fill="#E4EEF2" ${S}/>
    <path d="M 21.5 36 C 30 33 50 39 59 35 L 58 64 C 58 69 22 69 22 64 Z" fill="#F1EEE6"/>
    <path d="M 44 37 C 50 38 55 37 59 35 L 58 64 C 58 69 46 69.5 40 69 C 48 66 46 50 44 37 Z" fill="#D9D2C1"/>
    <path d="M 21.5 36 C 30 33 50 39 59 35" stroke="#C9C1AE" stroke-width="2" fill="none"/>
    <path d="M 26 40 L 27 62" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 20.6 50 C 30 53 50 53 59.4 50" stroke="${P.red}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="34" cy="44" rx="2.6" ry="1.3" fill="${P.white}" stroke="#B8AE98" stroke-width="1" transform="rotate(25 34 44)"/>
    <ellipse cx="45" cy="58" rx="2.6" ry="1.3" fill="${P.white}" stroke="#B8AE98" stroke-width="1" transform="rotate(-30 45 58)"/>
    <ellipse cx="36" cy="62" rx="2.6" ry="1.3" fill="${P.white}" stroke="#B8AE98" stroke-width="1" transform="rotate(10 36 62)"/>
    <ellipse cx="50" cy="44" rx="2.6" ry="1.3" fill="${P.white}" stroke="#B8AE98" stroke-width="1" transform="rotate(-60 50 44)"/>
  </g>`,

  // Trứng gà vỏ nâu có vết nứt + chén nhỏ đựng lòng trắng
  trung: `${shadow}
  <g transform="rotate(-10 28 46)">
    <path d="M 28 20 C 40 20 44 42 44 52 C 44 63 37 68 28 68 C 19 68 12 63 12 52 C 12 42 16 20 28 20 Z" fill="#E6B98C" ${S}/>
    <path d="M 40 46 C 43 58 38 67 28 67 C 21 67 16 64 14 58 C 22 64 36 62 40 46 Z" fill="#C8935F"/>
    <path d="M 20 34 C 21 29 23 26 26 25" stroke="#FBE3C8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 33 28 L 30 33 L 35 36 L 31 41" stroke="${P.ink}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="22" cy="50" r="1.3" fill="#B07C4C"/><circle cx="34" cy="56" r="1.3" fill="#B07C4C"/>
  </g>
  <g transform="rotate(5 56 58)">
    <path d="M 38 52 L 74 52 C 73 64 66 70 56 70 C 46 70 39 64 38 52 Z" fill="${P.sky}" ${S}/>
    <path d="M 60 69 C 68 67 72 61 73 54 L 74 52 C 73 64 66 70 56 70 Z" fill="#6FB6DA"/>
    <ellipse cx="56" cy="52" rx="18" ry="5" fill="#FFFDF2" ${S}/>
    <path d="M 46 52 C 50 49.5 58 49.5 64 51" stroke="${P.white}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M 42 59 C 44 64 48 66 52 67" stroke="#D3EEFB" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`,

  // Cục phèn chua tinh thể xanh nhạt, góc cạnh, kèm 2 cục nhỏ
  phen_chua: `${shadow}
  <g transform="rotate(-8 38 46)">
    <path d="M 22 40 L 32 20 L 50 18 L 60 34 L 56 62 L 34 68 L 18 58 Z" fill="#EAF4F7" ${S}/>
    <path d="M 46 40 L 60 34 L 56 62 L 34 68 Z" fill="#BFD9E2"/>
    <path d="M 32 20 L 38 38 L 46 40 L 50 18 M 38 38 L 22 40 M 38 38 L 34 68 M 46 40 L 60 34" stroke="#8FB7C5" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
    <path d="M 22 40 L 32 20 L 50 18 L 60 34 L 56 62 L 34 68 L 18 58 Z" fill="none" ${S}/>
    <path d="M 28 34 L 33 25" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 26 46 L 26 52" stroke="${P.white}" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g transform="rotate(18 64 62)">
    <path d="M 58 58 L 64 52 L 72 56 L 70 66 L 60 68 Z" fill="#EAF4F7" ${S}/>
    <path d="M 66 59 L 72 56 L 70 66 L 62 67.5 Z" fill="#BFD9E2"/>
    <path d="M 61 59 L 64 55" stroke="${P.white}" stroke-width="2" stroke-linecap="round"/>
  </g>
  <path d="M 8 64 L 12 59 L 17 62 L 15 68 L 10 68 Z" fill="#EAF4F7" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`,

  // Tuýp kem đánh răng bị bóp méo, sọc xanh-trắng-đỏ, nắp trắng rơi bên cạnh, đụn kem bạc hà
  kem_danh_rang: `${shadow}
  <g transform="rotate(-10 40 46)">
    <path d="M 8 32 L 14 32 L 16 35 C 30 34 34 40 42 38 C 50 36 54 35 58 37 L 60 39 L 60 55 L 58 57 C 54 59 50 58 42 56 C 34 54 30 60 16 59 L 14 62 L 8 62 Z" fill="${P.white}" ${S}/>
    <path d="M 16 35 C 30 34 34 40 42 38 C 50 36 54 35 58 37 L 58 42 C 50 41 46 43 42 43.5 C 34 44.5 28 41 16 41 Z" fill="${P.blue}"/>
    <path d="M 16 53 C 28 53 34 51 42 51.5 C 48 52 54 54 58 53 L 58 57 C 54 59 50 58 42 56 C 34 54 30 60 16 59 Z" fill="${P.red}"/>
    <path d="M 8 32 L 14 32 L 16 35 C 30 34 34 40 42 38 C 50 36 54 35 58 37 L 60 39 L 60 55 L 58 57 C 54 59 50 58 42 56 C 34 54 30 60 16 59 L 14 62 L 8 62 Z" fill="none" ${S}/>
    <path d="M 11 35 L 11 59" stroke="${P.inkSoft}" stroke-width="1.5" stroke-dasharray="2 2"/>
    <text x="37" y="50.5" font-family="Paytone One" font-size="8" fill="${P.ink}" text-anchor="middle" textLength="36" lengthAdjust="spacingAndGlyphs">CƯỜI TƯƠI</text>
    <path d="M 60 42 L 65 43 L 65 51 L 60 52 Z" fill="${P.steel}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M 65 44 C 64 36 70 30 74 34 C 79 33 80 40 76 42 C 79 46 74 52 68 50 C 66 49.5 65 48 65 47 Z" fill="#7FD3E8" ${S}/>
    <path d="M 72 42 C 76 43 76 47 72 49 C 70 49.5 68 49 67 48.5 C 71 47 72 45 72 42 Z" fill="#4FB2CC"/>
    <path d="M 68 36 C 69 34.5 71 34 72.5 34.5" stroke="${P.white}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>
  <g transform="rotate(20 58 66)">
    <rect x="52" y="60" width="11" height="9" rx="2" fill="${P.white}" stroke="${P.ink}" stroke-width="2.4"/>
    <path d="M 58 61.5 L 61.5 61.5 L 61.5 67.5 L 58 67.5 Z" fill="${P.steel}"/>
  </g>`,

  // Cục đất sét trắng xám trong chén sành, có dấu tay ấn
  dat_set: `${shadow}
  <g transform="rotate(-4 40 50)">
    <path d="M 18 46 C 14 36 20 28 28 30 C 30 22 42 20 48 26 C 56 24 64 32 62 46 Z" fill="#DCD3C8" ${S}/>
    <path d="M 50 28 C 58 30 63 36 62 46 L 46 46 C 54 42 55 34 50 28 Z" fill="#BCB0A2"/>
    <path d="M 22 36 C 23 33 25 32 27 32.5" stroke="#F4EFE8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="38" cy="36" rx="7" ry="4.6" fill="#B3A698" transform="rotate(-12 38 36)"/>
    <path d="M 32 38.5 C 35 41 41 41 44 38" stroke="#F4EFE8" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="35" rx="3.2" ry="2.4" fill="#B3A698"/>
    <ellipse cx="27" cy="40" rx="3" ry="2.2" fill="#B3A698"/>
    <path d="M 14 44 L 66 44 C 66 60 56 70 40 70 C 24 70 14 60 14 44 Z" fill="${P.brown}" ${S}/>
    <path d="M 50 46 L 65.5 46 C 64 60 55 69 40 69.5 C 52 64 54 56 50 46 Z" fill="${P.brownDark}"/>
    <path d="M 16 50 C 30 53 50 53 64.5 50" stroke="#D9C27A" stroke-width="2.5" fill="none"/>
    <path d="M 21 54 C 22 58 24 61 27 63" stroke="#E08A6E" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M 12 44 L 68 44" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>
  </g>`,

  // Hộp phấn rôm em bé hình trụ, nắp lỗ rắc, bụi phấn bay
  phan_rom: `${shadow}
  <g transform="rotate(10 40 46)">
    <path d="M 24 28 L 56 28 L 56 64 C 56 69 24 69 24 64 Z" fill="${P.white}" ${S}/>
    <path d="M 46 28 L 56 28 L 56 64 C 56 67 50 68.5 46 68.6 Z" fill="#E7DED0"/>
    <path d="M 24 40 L 56 40 L 56 56 L 24 56 Z" fill="${P.pink}"/>
    <path d="M 46 40 L 56 40 L 56 56 L 46 56 Z" fill="${P.pinkDark}"/>
    <path d="M 24 28 L 56 28 L 56 64 C 56 69 24 69 24 64 Z" fill="none" ${S}/>
    <text x="40" y="51" font-family="Paytone One" font-size="8.5" fill="${P.white}" text-anchor="middle" stroke="${P.ink}" stroke-width=".8" paint-order="stroke">BÉ YÊU</text>
    <path d="M 29 33 L 29 37 M 29 59 L 29 63" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>
    <path d="M 22 22 C 22 18 58 18 58 22 L 58 28 L 22 28 Z" fill="${P.sky}" ${S}/>
    <path d="M 48 19 C 54 19.5 58 20.5 58 22 L 58 28 L 48 28 Z" fill="#6FB6DA"/>
    <ellipse cx="40" cy="21" rx="18" ry="3" fill="${P.sky}" ${S}/>
    <circle cx="34" cy="21" r="1.2" fill="${P.ink}"/><circle cx="40" cy="20.4" r="1.2" fill="${P.ink}"/><circle cx="46" cy="21" r="1.2" fill="${P.ink}"/><circle cx="37" cy="22.2" r="1" fill="${P.ink}"/><circle cx="43" cy="22.2" r="1" fill="${P.ink}"/>
  </g>
  <circle cx="20" cy="12" r="4" fill="${P.white}" stroke="#D8D2C6" stroke-width="1.5"/>
  <circle cx="13" cy="20" r="3" fill="${P.white}" stroke="#D8D2C6" stroke-width="1.5"/>
  <circle cx="27" cy="7" r="2.5" fill="${P.white}" stroke="#D8D2C6" stroke-width="1.5"/>
  <circle cx="9" cy="11" r="2" fill="${P.white}" stroke="#D8D2C6" stroke-width="1.5"/>`,
};
