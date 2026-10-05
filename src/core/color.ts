import { Color, mix } from 'spectral.js';

/** Trộn màu kiểu sơn (Kubelka-Munk) — bọc lại để đổi thư viện không ảnh hưởng chỗ khác. */
const cache = new Map<string, string>();

export function mixColors(list: { hex: string; w: number }[]): string {
  const items = list.filter((x) => x.w > 0);
  if (!items.length) return '#FFF6EE';
  if (items.length === 1) return items[0].hex.toUpperCase();
  const key = items.map((x) => `${x.hex}:${x.w}`).join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const out = mix(...items.map((x) => [new Color(x.hex), x.w] as [Color, number])).toString().toUpperCase();
  cache.set(key, out);
  return out;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Nội suy tuyến tính trong sRGB — chỉ dùng cho hiệu ứng chuyển màu ngắn. */
export function lerpHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

/** Đậm/nhạt một màu: amt < 0 tối đi, > 0 sáng lên. */
export function shade(hex: string, amt: number): string {
  const c = hexToRgb(hex);
  return rgbToHex(c.map((v) => (amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
}

/** Tên màu hài cho kem thành phẩm. */
export function colorName(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;
  const s = max === min ? 0 : (max - min) / 255;
  let h = 0;
  if (max !== min) {
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h = (h * 60 + 360) % 360;
  }
  if (l > 0.9 && s < 0.12) return 'Trắng Bật Tông';
  if (s < 0.12) return l > 0.5 ? 'Xám Lương Tâm' : 'Đen Thui Như Ví';
  if (h < 20 || h >= 340) return l > 0.75 ? 'Hồng Phấn Livestream' : 'Đỏ Tôm Luộc';
  if (h < 45) return l > 0.75 ? 'Cam Sữa Đá' : 'Cam Cháy Nắng';
  if (h < 70) return l > 0.75 ? 'Vàng Bơ Sữa' : 'Vàng Nghệ Bất Tử';
  if (h < 160) return l > 0.75 ? 'Xanh Dưa Leo Mát Rượi' : 'Xanh Rêu Chằn Tinh';
  if (h < 250) return l > 0.75 ? 'Xanh Bạc Hà Kem Đánh Răng' : 'Xanh Lam Phóng Xạ';
  return l > 0.75 ? 'Tím Mộng Mơ' : 'Tím Bầm Tình Yêu';
}
