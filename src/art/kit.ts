/** Bảng màu + helper vẽ SVG dùng chung. Phong cách: phẳng, viền mực nâu-đen, 1 bóng cứng + 1 highlight. */
export const P = {
  ink: '#2A1A16',
  inkSoft: '#5A4038',
  paper: '#F4E7C5',
  paperHi: '#FFF8E6',
  teal: '#2FB5A6',
  tealDark: '#1E8C80',
  red: '#E63B2E',
  redDark: '#B02A20',
  blue: '#2F7FD8',
  blueDark: '#2160A8',
  steel: '#CFD6DB',
  steelHi: '#EEF2F4',
  steelDark: '#7E8B94',
  steelDeep: '#56636B',
  yellow: '#FFC53D',
  yellowDark: '#E09A12',
  pink: '#FF8DB0',
  pinkDark: '#E0587F',
  green: '#62B94E',
  greenDark: '#3F8A33',
  purple: '#7D2FBF',
  brown: '#B4513A',
  brownDark: '#8A3826',
  wood: '#D9945A',
  woodDark: '#A9663A',
  white: '#FFFDF6',
  mint: '#BFE3D3',
  mintDark: '#94C9B4',
  sky: '#9ED8F5',
  skin: '#F6C9A0',
  skinDark: '#E0A57A',
};

export const SW = 3; // nét viền chuẩn

export const svg = (w: number, h: number, body: string, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${extra}>${body}</svg>`;

/** Path hạt đậu dọc (rộng w, cao h), gốc ở đáy giữa (0,0) → vẽ lên trên. */
export function beanPath(w: number, h: number): string {
  const r = w / 2;
  const top = -h;
  return `M ${-r} ${top + r} C ${-r} ${top - r * 0.08} ${r} ${top - r * 0.08} ${r} ${top + r} L ${r * 1.02} ${-r * 0.9} C ${r * 1.04} ${r * 0.12} ${-r * 1.04} ${r * 0.12} ${-r * 1.02} ${-r * 0.9} Z`;
}

/** Hình chữ nhật bo góc dạng path (để squash quanh tâm khác dễ hơn). */
export const rr = (x: number, y: number, w: number, h: number, r: number, attrs: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${attrs}/>`;

export const ink = (w = SW) => `stroke="${P.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Ngôi sao 5 cánh, tâm (cx,cy), bán kính ngoài R. */
export function starPath(cx: number, cy: number, R: number, r = R * 0.48): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'} ${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)} `;
  }
  return d + 'Z';
}

/** Sao lấp lánh 4 cánh. */
export function sparklePath(cx: number, cy: number, R: number): string {
  const r = R * 0.22;
  return `M ${cx} ${cy - R} Q ${cx + r} ${cy - r} ${cx + R} ${cy} Q ${cx + r} ${cy + r} ${cx} ${cy + R} Q ${cx - r} ${cy + r} ${cx - R} ${cy} Q ${cx - r} ${cy - r} ${cx} ${cy - R} Z`;
}

/** Răng cưa "BÙM". */
export function burstPath(cx: number, cy: number, R: number, n = 12, inner = 0.62): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n;
    const rad = i % 2 ? R * inner : R * (0.9 + ((i * 7) % 5) * 0.04);
    d += `${i ? 'L' : 'M'} ${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)} `;
  }
  return d + 'Z';
}

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, html = ''): SVGElementTagNameMap[K] {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (html) e.innerHTML = html;
  return e;
}
