import { P } from '../kit';

/**
 * Icon nguyên liệu "vườn + chợ" — cà chua, nha đam, trà xanh, nghệ, mật ong, bột gạo.
 * Cùng chuẩn ref.ts: khung 80×80, chạm đáy y≈70, viền mực 3px, 1 bóng cứng + 1 highlight.
 */
const S = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = `<ellipse cx="40" cy="72" rx="26" ry="5" fill="${P.ink}" opacity=".18"/>`;

export const ICONS_A: Record<string, string> = {
  ca_chua: `${shadow}
  <g>
    <!-- quả nguyên -->
    <path d="M 14 46 C 14 32 24 26 34 27 C 46 26 55 33 54 46 C 54 60 45 68 34 68 C 22 68 14 60 14 46 Z" fill="#E8483B" ${S}/>
    <path d="M 17 54 C 22 64 42 67 51 55 C 47 64 41 67 34 67 C 25 67 19 62 17 54 Z" fill="#B8302A"/>
    <path d="M 21 40 C 23 35 27 32 31 31" stroke="#FFB3A6" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M 34 29 L 27 24 L 32 31 L 24 33 L 33 33 L 30 38 L 36 33 L 42 37 L 39 31 L 46 29 L 37 29 L 38 23 Z" fill="#4E9A2C" ${S} stroke-width="2.4"/>
    <path d="M 35 25 C 35 21 37 18 40 17" stroke="${P.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <!-- nửa quả bổ đôi -->
    <g transform="translate(58 58) rotate(-12)">
      <circle r="13" fill="#E8483B" ${S}/>
      <circle r="9.5" fill="#F7836F"/>
      <path d="M -9 0 H 9 M 0 -9 V 9" stroke="#E8483B" stroke-width="2.4"/>
      <circle r="2.6" fill="#E8483B"/>
      <ellipse cx="-4.5" cy="-4.5" rx="1.5" ry="2.3" fill="#FFE07A" transform="rotate(45 -4.5 -4.5)"/>
      <ellipse cx="4.5" cy="-4.5" rx="1.5" ry="2.3" fill="#FFE07A" transform="rotate(-45 4.5 -4.5)"/>
      <ellipse cx="-4.5" cy="4.5" rx="1.5" ry="2.3" fill="#FFE07A" transform="rotate(-45 -4.5 4.5)"/>
      <ellipse cx="4.5" cy="4.5" rx="1.5" ry="2.3" fill="#FFE07A" transform="rotate(45 4.5 4.5)"/>
    </g>
  </g>`,

  nha_dam: `${shadow}
  <g>
    <!-- bẹ sau đứng, nhọn -->
    <g transform="rotate(-20 30 62)">
      <path d="M 18 62 C 18 46 22 28 30 14 C 38 28 42 46 42 62 Z" fill="#4E9A3C" ${S}/>
      <path d="M 34 60 C 36 46 34 30 31 18 C 38 32 41 48 41 62 Z" fill="#35702A"/>
      <path d="M 20 50 l -3 -1 l 2 -3 M 22 38 l -3 -1 l 2 -3 M 25 26 l -3 -1 l 2 -3 M 40 50 l 3 -1 l -2 -3 M 38 38 l 3 -1 l -2 -3 M 35 26 l 3 -1 l -2 -3" fill="#4E9A3C" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
    </g>
    <!-- khúc bẹ trước, dày, đầu cắt lộ gel -->
    <g transform="rotate(-14 40 54)">
      <path d="M 14 56 C 22 44 40 42 56 44 L 56 66 C 40 68 24 66 14 56 Z" fill="#62AE48" ${S}/>
      <path d="M 20 60 C 30 64 44 65 55 63 L 55 66 C 40 68 26 66 20 60 Z" fill="#3F8A33"/>
      <path d="M 22 51 C 30 47 40 46 48 46" stroke="#B6E59A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 20 49 l 1 -4 l 3 3 M 32 44.5 l 1 -4 l 3 3 M 44 43 l 1 -4 l 3 3 M 22 64 l 1 4 l 3 -3 M 36 67 l 1 4 l 3 -3" fill="#62AE48" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>
      <ellipse cx="57" cy="55" rx="8" ry="11.5" fill="#3F8A33" ${S}/>
      <ellipse cx="57" cy="55" rx="5.5" ry="9" fill="#E3F6D8"/>
      <path d="M 55 49 C 56 47 58 47 59 49" stroke="${P.white}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 60 64 C 63 67 64 70 62.5 72 C 61 74 57.5 73.5 58 71 C 58.3 69 59 67 60 64 Z" fill="#F2C230" stroke="${P.ink}" stroke-width="2"/>
    </g>
  </g>`,

  tra_xanh: `${shadow}
  <g transform="rotate(-6 40 46)">
    <!-- cành -->
    <path d="M 38 70 C 38 60 38 52 38 44 M 42 70 C 42 60 44 50 48 42" stroke="#7A5A2A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- lá sau -->
    <path d="M 38 44 C 24 40 16 28 18 14 C 32 18 40 30 38 44 Z" fill="#4F8A29" ${S}/>
    <path d="M 46 42 C 50 26 60 18 70 18 C 70 32 60 42 46 42 Z" fill="#4F8A29" ${S}/>
    <!-- lá giữa -->
    <path d="M 40 46 C 30 34 32 18 42 8 C 52 18 52 34 40 46 Z" fill="#6BA539" ${S}/>
    <path d="M 40 46 C 46 38 50 26 46 14 C 50 22 50 36 40 46 Z" fill="#4F8A29"/>
    <path d="M 40 44 C 38 32 40 20 42 12" stroke="#2F5E17" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M 36 32 C 36 26 38 20 40 16" stroke="#C3EA8C" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <!-- lá trước trái/phải -->
    <path d="M 38 50 C 24 52 12 46 8 36 C 22 32 34 40 38 50 Z" fill="#6BA539" ${S}/>
    <path d="M 14 38 C 22 38 30 42 34 47" stroke="#C3EA8C" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M 44 50 C 54 40 66 38 74 44 C 66 54 54 54 44 50 Z" fill="#6BA539" ${S}/>
    <path d="M 48 50 C 56 50 66 50 72 45 C 66 52 56 54 48 50 Z" fill="#4F8A29"/>
    <!-- dây thun đỏ buộc -->
    <ellipse cx="40" cy="58" rx="7" ry="3.2" fill="none" stroke="${P.ink}" stroke-width="5.5"/>
    <ellipse cx="40" cy="58" rx="7" ry="3.2" fill="none" stroke="${P.red}" stroke-width="2.6"/>
  </g>`,

  nghe: `${shadow}
  <g>
    <!-- vết nhuộm vàng dưới đất -->
    <ellipse cx="54" cy="70" rx="10" ry="3" fill="#F2A900" opacity=".7"/>
    <!-- củ chính xù xì -->
    <g transform="rotate(-14 34 52)">
      <path d="M 8 52 C 8 44 14 42 20 44 C 22 36 30 36 32 42 C 36 38 44 40 44 46 L 48 46 L 48 60 C 40 64 30 64 22 62 C 18 64 8 62 8 52 Z" fill="#C98A3A" ${S}/>
      <path d="M 11 56 C 16 61 30 62 46 58 L 47 60 C 40 63 30 63 22 61 C 17 63 12 61 11 56 Z" fill="#9A6224"/>
      <path d="M 14 48 C 16 46 18 46 20 47 M 25 41 C 27 40 29 40 30 41" stroke="#E8B872" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M 16 54 h 4 M 28 50 h 5 M 36 56 h 4 M 24 58 h 3" stroke="#8A5520" stroke-width="1.8" stroke-linecap="round"/>
      <!-- mặt bẻ -->
      <ellipse cx="48" cy="53" rx="4.5" ry="7.5" fill="#F2A900" ${S}/>
      <ellipse cx="48" cy="53" rx="2" ry="4" fill="#FFD24A"/>
    </g>
    <!-- khúc bẻ đôi -->
    <g transform="translate(60 52) rotate(22)">
      <path d="M -6 -9 C 4 -11 12 -8 13 -2 C 14 6 6 10 -6 9 Z" fill="#C98A3A" ${S}/>
      <path d="M -4 6 C 4 8 10 5 12 1 C 12 7 4 10 -6 9 Z" fill="#9A6224"/>
      <ellipse cx="-6" cy="0" rx="4.5" ry="9" fill="#F2A900" ${S}/>
      <ellipse cx="-6" cy="0" rx="2" ry="4.5" fill="#FFD24A"/>
      <circle cx="-9" cy="12" r="1.6" fill="#F2A900"/>
    </g>
  </g>`,

  mat_ong: `${shadow}
  <g transform="rotate(5 40 46)">
    <!-- chai nước suối cũ đựng mật -->
    <path d="M 33 18 H 47 V 23 C 56 26 59 31 59 37 V 64 C 59 70 21 70 21 64 V 37 C 21 31 24 26 33 23 Z" fill="#E6A12E" ${S}/>
    <path d="M 47 28 C 54 31 56 34 56 39 V 64 C 56 67 46 68 42 68 C 50 66 52 62 52 58 V 40 C 52 35 51 32 47 28 Z" fill="#B8761C"/>
    <path d="M 26 34 L 26 36 M 26 58 L 26 63" stroke="#FFE0A0" stroke-width="3" stroke-linecap="round"/>
    <!-- nắp đỏ -->
    <rect x="31" y="10" width="18" height="9" rx="2" fill="${P.red}" ${S}/>
    <path d="M 35 12 V 17 M 40 12 V 17 M 45 12 V 17" stroke="${P.redDark}" stroke-width="1.8"/>
    <!-- nhãn giấy viết tay -->
    <path d="M 22 39 L 58 37 L 58 56 L 22 56 Z" fill="${P.white}" ${S} stroke-width="2.4"/>
    <text x="40" y="46" font-family="Baloo 2" font-weight="800" font-size="9" textLength="30" lengthAdjust="spacingAndGlyphs" fill="${P.ink}" text-anchor="middle" transform="rotate(-4 40 46)">MẬT ONG</text>
    <text x="40" y="54.5" font-family="Baloo 2" font-weight="800" font-size="9.5" textLength="28" lengthAdjust="spacingAndGlyphs" fill="${P.redDark}" text-anchor="middle" transform="rotate(-4 40 54)">RỪNG!</text>
    <!-- con kiến bò lên vai chai -->
    <g transform="translate(54 30) rotate(-55)">
      <path d="M 0 0 L -3 -3.5 M 0 0 L -3 3.5 M 0 0 L 0 -3.5 M 0 0 L 0 3.5 M 0 0 L 3 -3.5 M 0 0 L 3 3.5 M 6 -1 L 8.5 -3 M 6 1 L 8.5 3" stroke="${P.ink}" stroke-width="1.3" stroke-linecap="round"/>
      <ellipse cx="-4.5" cy="0" rx="3" ry="2.4" fill="${P.ink}"/>
      <ellipse cx="0.5" cy="0" rx="1.8" ry="1.5" fill="${P.ink}"/>
      <circle cx="5" cy="0" r="2" fill="${P.ink}"/>
    </g>
  </g>`,

  bot_gao: `${shadow}
  <g transform="rotate(-5 40 46)">
    <!-- túi giấy -->
    <path d="M 22 30 C 20 40 18 56 18 64 C 18 69 58 69 58 64 C 58 56 56 40 54 30 Z" fill="#F7F3EA" ${S}/>
    <path d="M 48 34 C 52 44 54 56 54 66 C 50 68 44 68 40 68 C 48 66 50 60 50 52 C 50 44 49 38 48 34 Z" fill="#DDD2BA"/>
    <path d="M 25 38 C 24 44 23 52 23 58" stroke="${P.white}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <!-- miệng túi nhúm + dây buộc -->
    <path d="M 26 30 C 24 22 28 14 32 12 C 34 16 36 16 38 11 C 40 15 43 15 45 12 C 49 16 52 22 50 30 Z" fill="#F7F3EA" ${S}/>
    <path d="M 33 18 L 35 28 M 42 17 L 41 28" stroke="#DDD2BA" stroke-width="2" stroke-linecap="round"/>
    <path d="M 23 30 C 32 27 44 27 53 30" stroke="#B4513A" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 52 30 C 58 30 60 26 58 22 M 52 30 C 58 32 62 36 60 40" stroke="#B4513A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <!-- chữ BỘT GẠO -->
    <text x="38" y="50" font-family="Paytone One" font-size="11" fill="${P.ink}" text-anchor="middle" transform="rotate(-4 38 50)">BỘT</text>
    <text x="38" y="61" font-family="Paytone One" font-size="11" fill="${P.ink}" text-anchor="middle" transform="rotate(-4 38 61)">GẠO</text>
    <!-- bột rơi -->
    <path d="M 56 68 C 58 63 64 62 68 64 C 72 64 74 68 72 70 C 66 71 60 71 56 68 Z" fill="${P.white}" stroke="${P.ink}" stroke-width="2"/>
    <circle cx="64" cy="58" r="1.4" fill="${P.white}" stroke="${P.ink}" stroke-width="1"/>
    <circle cx="69" cy="61" r="1" fill="${P.white}" stroke="${P.ink}" stroke-width="1"/>
  </g>`,
};
