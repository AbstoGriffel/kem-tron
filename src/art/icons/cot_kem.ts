import { P } from '../kit';

/**
 * Icon CỐT KEM — 5 loại kem nền (hộp/hũ to, nhìn 3/4 hơi trên xuống, nắp mở thấy kem).
 * Cùng chuẩn với ref.ts: khung 80×80, chạm đáy y≈70, bóng đổ elip y=72, viền mực 3px.
 */
const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = `<ellipse cx="40" cy="72" rx="26" ry="5" fill="${P.ink}" opacity=".18"/>`;

export const ICONS_BASE: Record<string, string> = {
  // Hộp kem trơn tròn to, nắp trắng dựng bên cạnh
  kem_tron: `${shadow}
  <g transform="rotate(-4 40 50)">
    <!-- nắp dựng nghiêng bên phải, sau hộp -->
    <g transform="rotate(14 64 46)">
      <rect x="56" y="24" width="14" height="42" rx="7" fill="${P.white}" ${S}/>
      <rect x="64" y="27" width="4" height="36" rx="2" fill="#DCD0C2"/>
      <path d="M 60 30 L 60 44" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>
    </g>
    <!-- thân hộp -->
    <path d="M 12 34 L 14 62 C 14 70 56 70 56 62 L 58 34 Z" fill="${P.white}" ${S}/>
    <path d="M 46 36 L 57 35 L 55.5 62 C 55 66 50 67.5 44 68 Z" fill="#E3D6C8"/>
    <!-- vệt sáng thân hộp nằm dưới dải nhãn (không đè chữ K) -->
    <path d="M 18 40 L 19 60" stroke="${P.white}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <!-- nhãn -->
    <path d="M 13 44 C 26 47 44 47 57 44 L 56.5 55 C 44 58 26 58 13.6 55 Z" fill="${P.teal}" ${S}/>
    <!-- V7-05: chữ nhãn gần cỡ tự nhiên (ép 92% thay vì 75%) → móc chữ Ơ không dính vào chữ N khi icon nhỏ -->
    <text x="35" y="54" font-family="Paytone One" font-size="8" fill="${P.white}" text-anchor="middle" textLength="38" lengthAdjust="spacingAndGlyphs">KEM TRƠN</text>
    <!-- miệng hộp + kem -->
    <ellipse cx="35" cy="34" rx="23" ry="8" fill="${P.white}" ${S}/>
    <ellipse cx="35" cy="34.5" rx="18" ry="5.5" fill="#FFF6EE"/>
    <path d="M 18 35 C 26 40 46 40 52 35 C 48 38.5 40 40 35 40 C 28 40 21 38 18 35 Z" fill="#EADBC8"/>
    <!-- chóp kem xoáy -->
    <path d="M 28 34 C 28 28 34 25 37 28 C 41 26 44 31 41 34 C 38 36 31 36 28 34 Z" fill="#FFF6EE" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 32 31 C 34 29 37 29 38 30" stroke="${P.white}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`,

  // Hộp sắt dẹt nhỏ kiểu sáp dưỡng ẩm, nắp in hoa dựng phía sau
  sap_ne: `<ellipse cx="40" cy="72" rx="21" ry="4.5" fill="${P.ink}" opacity=".18"/>
  <g transform="rotate(5 40 56)">
    <!-- nắp in hoa dựng sau -->
    <g transform="rotate(-10 46 38)">
      <ellipse cx="46" cy="38" rx="17" ry="15" fill="${P.red}" ${S}/>
      <path d="M 31 44 C 36 52 56 53 62 43 C 60 50 52 53 46 53 C 38 53 33 50 31 44 Z" fill="${P.redDark}"/>
      <circle cx="46" cy="37" r="6" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2"/>
      <circle cx="46" cy="37" r="2.2" fill="${P.yellowDark}"/>
      <circle cx="36" cy="32" r="3.2" fill="${P.white}" stroke="${P.ink}" stroke-width="1.6"/>
      <circle cx="56" cy="31" r="3.2" fill="${P.white}" stroke="${P.ink}" stroke-width="1.6"/>
      <circle cx="54" cy="45" r="3" fill="${P.white}" stroke="${P.ink}" stroke-width="1.6"/>
      <path d="M 36 26 C 39 24 43 23 46 23.5" stroke="#FF8A7E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </g>
    <!-- thân hộp dẹt -->
    <path d="M 20 56 L 20 64 C 20 70 54 70 54 64 L 54 56 Z" fill="${P.steel}" ${S}/>
    <path d="M 44 57 L 53 57 L 53 64 C 53 67 49 68.5 44 69 Z" fill="${P.steelDark}"/>
    <path d="M 24 60 L 24 65" stroke="${P.steelHi}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- miệng + sáp -->
    <ellipse cx="37" cy="56" rx="17" ry="6" fill="${P.steel}" ${S}/>
    <ellipse cx="37" cy="56.3" rx="13.5" ry="4" fill="#FFF3C4"/>
    <!-- vết ngón tay quẹt -->
    <path d="M 33 55 C 36 53.5 41 54 43 56 C 40 57.5 35 57.5 33 55 Z" fill="#EBD58E"/>
    <path d="M 27 55 C 28 54 30 53.4 32 53.3" stroke="${P.white}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </g>`,

  // Chai sữa dưỡng thể vòi nhấn, hồng sữa
  sua_duong: `${shadow}
  <g transform="rotate(6 40 46)">
    <!-- vòi nhấn -->
    <rect x="34" y="18" width="10" height="10" rx="2" fill="${P.white}" ${S}/>
    <path d="M 26 10 L 48 10 C 50 10 50 16 48 16 L 26 16 L 22 14 Z" fill="${P.white}" ${S}/>
    <path d="M 22 14 L 18 14" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>
    <!-- giọt sữa trào ra vòi -->
    <path d="M 16 15 C 13 18 13 22 15.5 23 C 18 22 18.5 18 16 15 Z" fill="#FFE4EE" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    <!-- vai + thân chai -->
    <path d="M 30 28 L 48 28 C 56 30 58 34 58 40 L 57 63 C 57 69 21 69 21 63 L 20 40 C 20 34 22 30 30 28 Z" fill="#FFE4EE" ${S}/>
    <path d="M 47 30 C 54 32 56.5 35 56.5 40 L 55.5 63 C 55 66 51 67.5 46 68 Z" fill="#F0BDD0"/>
    <path d="M 25 38 L 25 60" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- nhãn -->
    <rect x="23.5" y="42" width="31" height="17" rx="3" fill="${P.white}" ${S}/>
    <text x="39" y="50" font-family="Paytone One" font-size="8" fill="${P.pinkDark}" text-anchor="middle">BODY</text>
    <text x="39" y="57.5" font-family="Paytone One" font-size="8" fill="${P.pinkDark}" text-anchor="middle">SỮA</text>
  </g>`,

  // Hũ gel nha đam trong suốt xanh lá nhạt
  gel_nha_dam: `${shadow}
  <g transform="rotate(-5 40 50)">
    <!-- nắp xanh dựng nghiêng bên trái, sau hũ -->
    <g transform="rotate(-16 16 44)">
      <rect x="9" y="26" width="13" height="38" rx="6.5" fill="${P.green}" ${S}/>
      <rect x="10.5" y="29" width="4" height="32" rx="2" fill="${P.greenDark}"/>
    </g>
    <!-- thân hũ trong -->
    <path d="M 18 36 L 21 63 C 21 70 61 70 61 63 L 64 36 Z" fill="#D9F5D0" ${S}/>
    <!-- gel bên trong đậm hơn -->
    <path d="M 21 42 C 32 45 50 45 62 42 L 60 63 C 60 67.5 22 67.5 22 63 Z" fill="#B8E6A8"/>
    <circle cx="28" cy="58" r="2" fill="${P.white}" opacity=".85"/><circle cx="52" cy="61" r="1.5" fill="${P.white}" opacity=".85"/><circle cx="47" cy="49" r="1.2" fill="${P.white}" opacity=".85"/>
    <path d="M 23 40 L 25 62" stroke="${P.white}" stroke-width="3" stroke-linecap="round" opacity=".9"/>
    <!-- nhãn trắng có lá nha đam -->
    <path d="M 31 46 L 51 46 L 50.5 62 L 31.5 62 Z" fill="${P.white}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 41 61 C 36 56 35 50 37 47 C 39 52 40.5 56 41 61 Z" fill="${P.green}" stroke="${P.ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M 41 61 C 41 54 42 49 44 46 C 45 52 43.5 57 41 61 Z" fill="${P.greenDark}" stroke="${P.ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M 41 61 C 44 57 47 55 49 54 C 48 58 45 60 41 61 Z" fill="${P.green}" stroke="${P.ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- miệng + mặt gel lung linh -->
    <ellipse cx="41" cy="36" rx="23" ry="8" fill="#D9F5D0" ${S}/>
    <path d="M 22 37 C 26 33 32 39 38 35 C 44 31 50 38 60 36 C 56 41 46 42 41 42 C 32 42 25 40 22 37 Z" fill="#A9DE96"/>
    <path d="M 26 34 C 29 32 33 31 37 31" stroke="${P.white}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="49" cy="34" r="1.6" fill="${P.white}"/>
  </g>`,

  // DỎM: thùng nhựa 20 ký, không nhãn, nắp cạy, kem tràn
  kem_thung: `${shadow}
  <g transform="rotate(4 40 48)">
    <!-- quai xách -->
    <path d="M 13 30 C 12 8 66 8 65 30" fill="none" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 13 30 C 12 8 66 8 65 30" fill="none" stroke="${P.steelDark}" stroke-width="2.4" stroke-linecap="round"/>
    <!-- nắp bị cạy, dựng ngược phía sau -->
    <g transform="rotate(-22 22 24)">
      <ellipse cx="26" cy="20" rx="17" ry="6" fill="${P.steelHi}" ${S}/>
      <path d="M 11 21 C 18 26 34 26 41 21 C 38 25 32 26.5 26 26.5 C 20 26.5 14 25 11 21 Z" fill="${P.steel}"/>
    </g>
    <!-- thân thùng -->
    <path d="M 11 30 L 16 64 C 16 70 62 70 62 64 L 67 30 Z" fill="#F3F3EF" ${S}/>
    <path d="M 52 31 L 66 31 L 61.5 64 C 61 67 57 68.5 50 69 Z" fill="#D3D5CF"/>
    <path d="M 14 38 L 46 38 M 15 46 L 44 46" stroke="#D3D5CF" stroke-width="2"/>
    <path d="M 18 36 L 21 62" stroke="${P.white}" stroke-width="3.5" stroke-linecap="round"/>
    <!-- chữ bút lông -->
    <text x="40" y="53" font-family="Baloo 2" font-weight="800" font-size="9" fill="${P.ink}" text-anchor="middle" textLength="38" lengthAdjust="spacingAndGlyphs" transform="rotate(-7 40 53)">KEM TRẮNG</text>
    <text x="36" y="63" font-family="Baloo 2" font-weight="800" font-size="10" fill="${P.red}" text-anchor="middle" transform="rotate(-4 36 63)">20KG</text>
    <!-- vết bẩn -->
    <path d="M 52 58 C 55 55 59 57 57 60 C 59 62 54 64 52 61 Z" fill="#8A6A3A" opacity=".65"/>
    <circle cx="23" cy="66" r="1.8" fill="#8A6A3A" opacity=".65"/>
    <!-- miệng thùng + kem tràn -->
    <ellipse cx="39" cy="30" rx="28" ry="7" fill="${P.steel}" ${S}/>
    <path d="M 13 30 C 13 22 22 24 28 22 C 34 18 46 19 50 22 C 58 22 66 24 65 30 C 58 34 20 34 13 30 Z" fill="#FFFFFF" ${S}/>
    <path d="M 44 33 C 46 34 47 37 46 40 C 45 43 42 42 42.5 38 Z" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 20 32 C 21 34 21 36 19.5 37.5 C 18 36 18 34 18.5 32 Z" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M 24 26 C 28 24 33 23 37 23" stroke="${P.steelHi}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M 56 27 C 59 27 61 28 62 30 C 58 31 54 30 52 29 Z" fill="#E6E6E6"/>
  </g>`,
};
