import { ICONS_BASE } from './cot_kem';
import { ICONS_B } from './cho_tapHoa';
import { ICONS_C } from './hang_mang';
import { REF_ICONS } from './ref';
import { ICONS_A } from './vuon_cho';

/** Mọi icon nguyên liệu + cốt kem (nội dung bên trong viewBox 0 0 80 80). */
export const ICONS: Record<string, string> = { ...REF_ICONS, ...ICONS_A, ...ICONS_B, ...ICONS_C, ...ICONS_BASE };

export const iconSvg = (id: string, size = 56, extra = '') =>
  `<svg viewBox="0 0 80 80" width="${size}" height="${size}" ${extra}>${ICONS[id] ?? ''}</svg>`;
