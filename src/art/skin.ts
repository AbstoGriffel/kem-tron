import { beanPath, P, sparklePath } from './kit';
import { BEAN_H, BEAN_W } from './bean';

/**
 * Lớp da vẽ đè lên mặt hạt đậu (gốc toạ độ = đáy giữa thân, như bean.ts).
 * - Bệnh lúc khách vào (TRƯỚC): sam / san / chay / dau — mỗi bệnh ứng 1 chỉ số cần chữa.
 * - Lỗi sau khi bôi (SAU): ứng với các khoá missLines (t+, t-, m+, m-, n+, n-, k+, k-) + kích ứng.
 * strength 0..1: 1 = bệnh nặng, 0.5 = đỡ một nửa (khỏi một phần).
 */
export type Skin =
  | 'sam' | 'san' | 'chay' | 'dau'
  | 'trang_bech' | 'lang_bong' | 'trat_vua' | 'chay_nuong' | 'nut_ne' | 'bet_mo' | 'man_do';

/** Bệnh lúc vào → chỉ số cần chữa (để ticket/đơn khách đọc). */
export const SKIN_NEED: Record<'sam' | 'san' | 'chay' | 'dau', 't' | 'm' | 'n' | 'k'> = { sam: 't', san: 'm', chay: 'n', dau: 'k' };

/** Lỗi chính (khoá missLines) → lớp da SAU. t- và m- dùng lại bệnh gốc (chưa chữa được). */
export const MISS_SKIN: Record<string, Skin> = {
  't+': 'trang_bech', 't-': 'sam', 'm+': 'lang_bong', 'm-': 'san',
  'n+': 'trat_vua', 'n-': 'chay_nuong', 'k+': 'nut_ne', 'k-': 'bet_mo', kich_ung: 'man_do',
};

const EY = -142;
const MY = -112;
let uid = 0;

/** Rải điểm giả ngẫu nhiên cố định (không dùng Math.random để ảnh ổn định). */
function scatter(n: number, seed: number, box: { x0: number; x1: number; y0: number; y1: number }, avoidEyes = true) {
  const out: { x: number; y: number; r: number }[] = [];
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const x = box.x0 + rnd() * (box.x1 - box.x0);
    const y = box.y0 + rnd() * (box.y1 - box.y0);
    if (avoidEyes && Math.abs(Math.abs(x) - 21) < 18 && Math.abs(y - EY) < 20) continue;
    if (Math.abs(x) < 16 && Math.abs(y - MY) < 10) continue;
    out.push({ x, y, r: rnd() });
  }
  return out;
}

export function skinLayer(kind: Skin, color: string, strength = 1): string {
  const id = `skin-clip-${++uid}`;
  const clip = `<clipPath id="${id}"><path d="${beanPath(BEAN_W, BEAN_H)}"/></clipPath>`;
  const o = (v: number) => (v * strength).toFixed(2);
  const face = { x0: -48, x1: 48, y0: -182, y1: -92 };
  let body = '';
  switch (kind) {
    case 'sam': {
      // da sạm: phủ nâu cả mặt + đốm nám ở gò má, trán
      body = `<ellipse cx="0" cy="-140" rx="60" ry="58" fill="#5A3020" opacity="${o(0.32)}"/>
        ${scatter(16, 7, { x0: -46, x1: 46, y0: -170, y1: -100 }).map((p) => `<ellipse cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" rx="${(3 + p.r * 4).toFixed(1)}" ry="${(2.4 + p.r * 3).toFixed(1)}" fill="#5A3020" opacity="${o(0.55)}"/>`).join('')}`;
      break;
    }
    case 'san': {
      // da sần: nốt sần nhỏ có bóng + viền
      body = scatter(26, 3, face).map((p) => {
        const r = (2.4 + p.r * 2.2).toFixed(1);
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" stroke="#7A4A36" stroke-width="1.6" opacity="${o(1)}"/><circle cx="${(p.x - 0.8).toFixed(1)}" cy="${(p.y - 0.9).toFixed(1)}" r="${(+r * 0.35).toFixed(1)}" fill="#fff" opacity="${o(0.7)}"/>`;
      }).join('');
      break;
    }
    case 'chay': {
      // cháy nắng: dải đỏ ngang mũi + 2 má, da tróc ở trán
      body = `<ellipse cx="0" cy="${MY - 14}" rx="54" ry="15" fill="${P.red}" opacity="${o(0.5)}"/>
        <ellipse cx="0" cy="${EY - 34}" rx="34" ry="12" fill="${P.red}" opacity="${o(0.3)}"/>
        ${[-26, -6, 16, 32].map((x, i) => `<path d="M ${x} ${EY - 40 + (i % 2) * 6} q 4 -5 8 0 q -2 4 -8 0 z" fill="#FFF4E8" stroke="#B85A3E" stroke-width="1.4" opacity="${o(1)}"/>`).join('')}`;
      break;
    }
    case 'dau': {
      // bóng dầu: vệt bóng trán + mũi + giọt dầu, ánh vàng
      body = `<ellipse cx="0" cy="-140" rx="58" ry="56" fill="#FFE27A" opacity="${o(0.22)}"/>
        <path d="M -30 ${EY - 34} q 30 -14 60 0" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="${o(0.85)}"/>
        <ellipse cx="0" cy="${MY - 14}" rx="5" ry="9" fill="#fff" opacity="${o(0.85)}"/>
        <ellipse cx="-40" cy="${MY - 12}" rx="7" ry="4" fill="#fff" opacity="${o(0.7)}"/><ellipse cx="40" cy="${MY - 12}" rx="7" ry="4" fill="#fff" opacity="${o(0.7)}"/>
        ${[[-44, EY - 22], [42, EY - 26]].map(([x, y]) => `<path d="M ${x} ${y} q 5 8 0 12 q -5 -4 0 -12 z" fill="#FFE27A" stroke="#C99A2E" stroke-width="1.5" opacity="${o(1)}"/>`).join('')}`;
      break;
    }
    case 'trang_bech': {
      // trắng lố: mặt trắng như tượng sáp, CỔ VẪN ĐEN (đường ranh lượn sóng), bột mốc lấm tấm
      body = `<path d="M -70 -260 H 70 V -98 q -12 8 -24 0 q -12 -8 -24 0 q -11 8 -22 0 q -12 -8 -24 0 q -12 8 -24 0 q -10 -6 -22 0 Z" fill="#F7F4EC" opacity="${o(0.94)}"/>
        <path d="M -70 -98 q 12 -6 22 0 q 12 8 24 0 q 12 -8 24 0 q 11 8 22 0 q 12 -8 24 0 q 12 8 24 0" stroke="#D9D2C2" stroke-width="2.5" fill="none" opacity="${o(1)}"/>
        ${scatter(14, 11, face).map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1.4 + p.r * 1.6).toFixed(1)}" fill="#E4DCCB" opacity="${o(1)}"/>`).join('')}`;
      break;
    }
    case 'lang_bong': {
      // mịn lố: láng bóng như sáp, trượt cả mắt kính/khẩu trang
      body = `<ellipse cx="0" cy="-140" rx="58" ry="56" fill="#fff" opacity="${o(0.16)}"/>
        <path d="M -40 ${EY - 30} q 40 -22 80 0" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity="${o(0.9)}"/>
        <path d="M -46 ${MY - 4} q -4 -16 6 -26 M 46 ${MY - 4} q 4 -16 -6 -26" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity="${o(0.85)}"/>
        <path d="${sparklePath(-34, EY - 44, 9)}" fill="#fff" opacity="${o(1)}"/><path d="${sparklePath(38, MY - 24, 7)}" fill="#fff" opacity="${o(1)}"/>`;
      break;
    }
    case 'trat_vua': {
      // che nắng lố: kem dày như trát vữa, mảng cộm + giọt mồ hôi
      const blobs = [[-30, EY + 22, 18, 13], [28, EY + 20, 17, 12], [0, EY - 40, 26, 10], [-6, MY + 14, 20, 8]];
      body = blobs.map(([x, y, rx, ry]) => `<path d="M ${x - rx} ${y} q 0 ${-ry} ${rx * 0.6} ${-ry} q ${rx * 0.5} -4 ${rx * 0.9} 2 q ${rx * 0.6} 4 ${rx * 0.5} ${ry} q -2 ${ry * 0.6} -${rx * 0.5} ${ry * 0.5} q -${rx * 0.4} 6 -${rx * 0.9} 0 q -${rx * 0.4} 2 -${rx * 0.5} -${ry * 0.9} z" fill="#FBF6EA" stroke="#CFC5AE" stroke-width="2" opacity="${o(1)}"/>`).join('')
        + `<path d="M 50 ${EY - 18} q 6 10 0 14 q -6 -4 0 -14 z M -52 ${EY - 6} q 5 8 0 11 q -5 -3 0 -11 z" fill="${P.sky}" stroke="${P.blueDark}" stroke-width="1.6" opacity="${o(1)}"/>`;
      break;
    }
    case 'chay_nuong': {
      // chống nắng thiếu: cháy như bánh tráng nướng — đỏ nâu + vạch vỉ nướng
      body = `<ellipse cx="0" cy="-138" rx="60" ry="58" fill="#B5462A" opacity="${o(0.45)}"/>
        <g opacity="${o(0.55)}" stroke="#5A2010" stroke-width="3" stroke-linecap="round">
          ${[-36, -18, 0, 18, 36].map((x) => `<path d="M ${x - 10} -186 L ${x + 14} -96"/>`).join('')}
        </g>
        ${[[-34, EY - 36], [24, EY - 40], [40, MY - 6]].map(([x, y]) => `<path d="M ${x} ${y} q 5 -6 10 0 q -3 5 -10 0 z" fill="#FFF4E8" stroke="#8A3826" stroke-width="1.4" opacity="${o(1)}"/>`).join('')}`;
      break;
    }
    case 'nut_ne': {
      // khô lố: nứt nẻ như ruộng hạn
      body = `<ellipse cx="0" cy="-140" rx="58" ry="56" fill="#E9D9B0" opacity="${o(0.3)}"/>
        <g stroke="#6B3E22" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${o(0.9)}">
          <path d="M -46 ${EY - 30} l 10 8 l 4 12 l 12 4 M -36 ${EY - 22} l -8 10"/>
          <path d="M 44 ${EY - 34} l -10 10 l 2 12 l -12 6 M 34 ${EY - 24} l 10 8"/>
          <path d="M -40 ${MY - 10} l 10 -4 l 6 10 l 10 0 M -30 ${MY - 14} l -4 -10"/>
          <path d="M 40 ${MY - 14} l -10 2 l -4 10 M 30 ${MY - 12} l 4 -10 l 8 -2"/>
          <path d="M -8 ${EY - 48} l 6 10 l 10 -2 l 4 10"/>
        </g>`;
      break;
    }
    case 'bet_mo': {
      // khô thiếu: bết dính như mỡ hành — vệt dầu chảy + cọng hành
      body = `<ellipse cx="0" cy="-140" rx="58" ry="56" fill="#F2C94C" opacity="${o(0.28)}"/>
        ${[[-40, EY + 10, 26], [36, EY + 6, 32], [-4, EY - 36, 18]].map(([x, y, h]) => `<path d="M ${x - 6} ${y} q 6 -6 12 0 v ${h} q -6 8 -12 0 z" fill="#F2C94C" stroke="#B88A1E" stroke-width="1.6" opacity="${o(0.95)}"/>`).join('')}
        ${[[-24, MY + 8, 20], [20, EY - 28, -25], [42, MY - 4, 40]].map(([x, y, a]) => `<rect x="${x - 7}" y="${y - 2.5}" width="14" height="5" rx="2.5" fill="${P.green}" stroke="${P.greenDark}" stroke-width="1.4" transform="rotate(${a} ${x} ${y})" opacity="${o(1)}"/>`).join('')}`;
      break;
    }
    case 'man_do': {
      // kích ứng: mẩn đỏ, sưng
      body = `<ellipse cx="0" cy="-140" rx="60" ry="58" fill="${P.red}" opacity="${o(0.22)}"/>
        ${scatter(12, 5, face).map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(3.5 + p.r * 4.5).toFixed(1)}" fill="${P.red}" opacity="${o(0.75)}"/><circle cx="${(p.x - 1).toFixed(1)}" cy="${(p.y - 1.2).toFixed(1)}" r="1.4" fill="#FFB3A8" opacity="${o(0.9)}"/>`).join('')}`;
      break;
    }
  }
  return `<g class="skin skin-${kind}">${clip}<g clip-path="url(#${id})">${body}</g></g>`;
}

/** Chèn lớp da vào SVG hạt đậu: dưới mắt/miệng, trên thân. */
export function withSkin(bean: string, layers: string): string {
  return bean.replace('<g class="head">', `<g class="head">${layers}`);
}

export type Disease = 'sam' | 'san' | 'chay' | 'dau';

/** Mức bệnh còn lại sau khi bôi theo số sao (T33a): 4,5★+ khỏi hẳn, 3–4★ đỡ một nửa, dưới 3★ y nguyên. */
export const cureLeft = (stars: number) => (stars >= 4.5 ? 0 : stars >= 3 ? 0.45 : 1);

/**
 * T33 — ảnh SAU = bệnh gốc mờ theo số sao + lớp lỗi chính vẽ đè (T10).
 *  - thiếu đúng chỉ số chữa bệnh (vd sạm mà t−) → bệnh đó giữ nguyên, không vẽ thêm lớp.
 *  - kích ứng → bệnh còn một nửa + mẩn đỏ.
 */
export function afterSkins(skins: Disease[], mainErr: string | null, stars: number): [Skin, number][] {
  const out: [Skin, number][] = [];
  const left = mainErr === 'kich_ung' ? 0.5 : cureLeft(stars);
  for (const d of skins) {
    const stuck = mainErr === `${SKIN_NEED[d]}-`;
    const v = stuck ? 1 : left;
    if (v > 0) out.push([d, v]);
  }
  if (mainErr) {
    const k = MISS_SKIN[mainErr];
    const dup = out.some(([x]) => x === k);
    if (k && !dup) out.push([k, 1]);
  }
  return out;
}

/** Lớp da (đã kẹp trong thân) cho 1 danh sách bệnh/lỗi. */
export const skinLayers = (list: [Skin, number][], color: string) => list.map(([k, v]) => skinLayer(k, color, v)).join('');
