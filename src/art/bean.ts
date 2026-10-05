import { beanPath, P, sparklePath } from './kit';
import { shade } from '../core/color';

/**
 * Nhân vật hạt đậu (khách). Gốc toạ độ = đáy giữa thân. Thân KHÔNG viền (kiểu DWtD), phụ kiện có viền.
 * Biểu cảm = bật/tắt nhóm .face-* (pose cứng), không morph.
 */
export const BEAN_W = 112;
export const BEAN_H = 196;
const EY = -142; // tâm mắt
const MY = -112; // miệng

export type Expr =
  | 'idle' | 'talk' | 'happy' | 'ecstatic' | 'meh' | 'angry' | 'disgust' | 'shock' | 'sick' | 'glow' | 'sus' | 'cry';

export const EXPRS: Expr[] = ['idle', 'talk', 'happy', 'ecstatic', 'meh', 'angry', 'disgust', 'shock', 'sick', 'glow', 'sus', 'cry'];

export type Accessory =
  | 'non_bao_hiem' | 'non_la' | 'kep_cang_cua' | 'khau_trang' | 'kinh_ram' | 'kinh_can' | 'ao_chong_nang'
  | 'toc_uon' | 'mu_phot' | 'vong_vang' | 'cavat' | 'balo' | 'toc_buoi' | 'rau';

export interface BeanSpec {
  color: string;
  acc: Accessory[];
  /** mắt to tròn (DWtD) hay mắt hột (chấm) */
  eyes?: 'round' | 'dot';
}

const S2 = `stroke="${P.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function eyes(kind: 'round' | 'dot') {
  if (kind === 'dot') {
    return `<g class="eyes">
      <g class="eye" transform="translate(-20 ${EY})"><ellipse class="pupil" rx="6" ry="8" fill="${P.ink}"/><circle cx="2" cy="-3" r="2" fill="${P.white}"/></g>
      <g class="eye" transform="translate(20 ${EY})"><ellipse class="pupil" rx="6" ry="8" fill="${P.ink}"/><circle cx="2" cy="-3" r="2" fill="${P.white}"/></g>
    </g>`;
  }
  return `<g class="eyes">
    <g class="eye" transform="translate(-21 ${EY})"><ellipse rx="15" ry="17" fill="${P.white}"/><g class="pupil"><circle r="6.5" fill="${P.ink}"/><circle cx="2.4" cy="-2.6" r="2.2" fill="${P.white}"/></g></g>
    <g class="eye" transform="translate(21 ${EY})"><ellipse rx="15" ry="17" fill="${P.white}"/><g class="pupil"><circle r="6.5" fill="${P.ink}"/><circle cx="2.4" cy="-2.6" r="2.2" fill="${P.white}"/></g></g>
  </g>`;
}

function lids(color: string) {
  // mí mắt (chớp): hình elip màu thân phủ lên mắt, scaleY 0 → 1
  return `<g class="lids">
    <ellipse class="lid" cx="-21" cy="${EY}" rx="16" ry="18" fill="${color}" transform="scale(1 0)" style="transform-box:fill-box;transform-origin:50% 0%"/>
    <ellipse class="lid" cx="21" cy="${EY}" rx="16" ry="18" fill="${color}" transform="scale(1 0)" style="transform-box:fill-box;transform-origin:50% 0%"/>
  </g>`;
}

/** Từng biểu cảm = mày + miệng + phụ trợ. Mắt dùng chung, có thể bị thay. */
function faces(color: string): string {
  const dark = shade(color, -0.45);
  const mouthIn = '#7A1F2B';
  const tongue = '#FF7A8A';
  const f = (name: Expr, body: string) => `<g class="face face-${name}" style="display:none">${body}</g>`;
  return [
    f('idle', `
      <path d="M -12 ${MY} q 12 9 24 0" stroke="${P.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
    f('talk', `
      <path d="M -12 ${MY - 4} q 12 20 24 0 z" fill="${mouthIn}" ${S2}/>
      <path d="M -6 ${MY + 4} q 6 5 12 0" fill="${tongue}"/>`),
    f('happy', `
      <path d="M -36 ${EY - 26} q 12 -8 24 -2 M 12 ${EY - 28} q 12 -6 24 2" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M -20 ${MY - 6} q 20 30 40 0 z" fill="${mouthIn}" ${S2}/>
      <path d="M -10 ${MY + 6} q 10 8 20 0" fill="${tongue}"/>
      <ellipse cx="-38" cy="${MY - 8}" rx="9" ry="5" fill="${P.pink}" opacity=".7"/><ellipse cx="38" cy="${MY - 8}" rx="9" ry="5" fill="${P.pink}" opacity=".7"/>`),
    f('ecstatic', `
      <g class="star-eyes">
        <path d="${starPath5(-21, EY, 17)}" fill="${P.yellow}" ${S2}/>
        <path d="${starPath5(21, EY, 17)}" fill="${P.yellow}" ${S2}/>
      </g>
      <path d="M -28 ${MY - 8} q 28 44 56 0 z" fill="${mouthIn}" ${S2}/>
      <path d="M -14 ${MY + 10} q 14 12 28 0" fill="${tongue}"/>
      <ellipse cx="-40" cy="${MY - 8}" rx="10" ry="6" fill="${P.pink}"/><ellipse cx="40" cy="${MY - 8}" rx="10" ry="6" fill="${P.pink}"/>`),
    f('meh', `
      <path d="M -34 ${EY - 22} h 22 M 12 ${EY - 22} h 22" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>
      <rect class="half-lid" x="-37" y="${EY - 18}" width="32" height="15" fill="${color}"/>
      <rect class="half-lid" x="5" y="${EY - 18}" width="32" height="15" fill="${color}"/>
      <path d="M -12 ${MY} h 24" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>`),
    f('angry', `
      <path d="M -38 ${EY - 30} L -8 ${EY - 18} M 38 ${EY - 30} L 8 ${EY - 18}" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>
      <path d="M -18 ${MY + 6} q 18 -18 36 0 z" fill="${mouthIn}" ${S2}/>
      <path d="M -12 ${MY + 1} h 24" stroke="${P.white}" stroke-width="4"/>
      <g transform="translate(34 ${EY - 46})"><path d="M -8 -2 q 4 -4 8 0 q 4 -4 8 0 M -8 6 q 4 4 8 0 q 4 4 8 0" stroke="${P.red}" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>`),
    f('disgust', `
      <path d="M -36 ${EY - 22} q 12 6 24 -4 M 12 ${EY - 26} q 12 -6 24 6" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M -16 ${MY} q 8 -8 16 0 q 8 8 16 -2" stroke="${P.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 4 ${MY + 1} q 2 16 10 14 q 6 -2 2 -14 z" fill="${tongue}" ${S2}/>
      <path d="M -54 ${EY - 10} q -8 -10 0 -18 q 8 -8 0 -18 M -64 ${EY} q -8 -10 0 -18 q 8 -8 0 -18" stroke="${P.greenDark}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`),
    f('shock', `
      <path d="M -36 ${EY - 34} q 12 -8 24 0 M 12 ${EY - 34} q 12 -8 24 0" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="${MY + 2}" rx="11" ry="15" fill="${mouthIn}" ${S2}/>`),
    f('sick', `
      <g class="spots">
        <circle cx="-40" cy="${EY + 18}" r="7" fill="${P.red}" opacity=".8"/><circle cx="-28" cy="${EY + 30}" r="4" fill="${P.red}" opacity=".8"/>
        <circle cx="38" cy="${EY + 22}" r="8" fill="${P.red}" opacity=".8"/><circle cx="30" cy="${EY - 38}" r="5" fill="${P.red}" opacity=".8"/>
        <circle cx="-8" cy="${EY - 40}" r="4" fill="${P.red}" opacity=".8"/>
      </g>
      <path d="M -20 ${MY + 4} q 5 -8 10 0 q 5 8 10 0 q 5 -8 10 0 q 5 8 10 0" stroke="${P.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 46 ${EY - 6} q 6 10 0 14 q -6 -4 0 -14 z" fill="${P.sky}" ${S2}/>`),
    f('glow', `
      <path d="M -20 ${MY - 4} q 20 22 40 0 z" fill="${mouthIn}" ${S2}/>
      <g class="sunglass">
        <path d="M -40 ${EY - 10} h 32 q 0 22 -16 22 q -16 0 -16 -22 z M 8 ${EY - 10} h 32 q 0 22 -16 22 q -16 0 -16 -22 z" fill="${P.ink}"/>
        <path d="M -8 ${EY - 8} q 8 -6 16 0" stroke="${P.ink}" stroke-width="4" fill="none"/>
        <path d="M -32 ${EY - 6} l 8 0" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>
      </g>`),
    f('sus', `
      <path d="M -36 ${EY - 18} L -8 ${EY - 22} M 10 ${EY - 28} q 14 -8 26 0" stroke="${P.ink}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect class="half-lid" x="-37" y="${EY - 18}" width="32" height="12" fill="${color}"/>
      <path d="M -10 ${MY + 2} q 10 -6 22 -2" stroke="${P.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`),
    f('cry', `
      <path d="M -36 ${EY - 20} q 12 -12 24 -4 M 12 ${EY - 24} q 12 -8 24 4" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M -18 ${MY + 8} q 18 -22 36 0 z" fill="${mouthIn}" ${S2}/>
      <path class="tear" d="M -30 ${EY + 14} q -4 16 0 30 q 6 -4 4 -30 z" fill="${P.sky}" stroke="${P.blueDark}" stroke-width="2"/>
      <path class="tear" d="M 30 ${EY + 14} q 4 16 0 30 q -6 -4 -4 -30 z" fill="${P.sky}" stroke="${P.blueDark}" stroke-width="2"/>`),
  ].join('');
}

function starPath5(cx: number, cy: number, R: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.5 : R;
    d += `${i ? 'L' : 'M'} ${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return d + 'Z';
}

/** Phụ kiện vẽ SAU mặt (đội lên đầu, đeo trước mặt...). */
function accFront(a: Accessory, color: string): string {
  const top = -BEAN_H;
  switch (a) {
    case 'non_bao_hiem':
      return `<g class="acc" transform="translate(0 -20)">
        <path d="M -60 ${top + 52} C -60 ${top - 4} 60 ${top - 4} 60 ${top + 52} Z" fill="${P.green}" ${S2}/>
        <path d="M -62 ${top + 52} H 66 q 6 0 6 6 H -62 z" fill="${P.greenDark}" ${S2}/>
        <path d="M -30 ${top + 14} q 30 -16 60 0" stroke="${P.white}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
        <path d="M -54 ${top + 56} q -10 50 6 80 M 54 ${top + 56} q 10 50 -6 80" stroke="${P.ink}" stroke-width="3" fill="none"/>
      </g>`;
    case 'non_la':
      return `<g class="acc">
        <path d="M 0 ${top - 30} L 86 ${top + 40} Q 0 ${top + 56} -86 ${top + 40} Z" fill="#F2D58A" ${S2}/>
        <path d="M 0 ${top - 30} L -30 ${top + 50} M 0 ${top - 30} L 30 ${top + 50} M 0 ${top - 30} L 60 ${top + 44} M 0 ${top - 30} L -60 ${top + 44}" stroke="#C9A85A" stroke-width="2"/>
        <path d="M -80 ${top + 42} Q 0 ${top + 58} 80 ${top + 42}" stroke="${P.red}" stroke-width="4" fill="none"/>
      </g>`;
    case 'kep_cang_cua':
      return `<g class="acc" transform="translate(30 ${top + 14}) rotate(18)">
        <path d="M -14 -10 q 14 -14 28 0 l -4 18 q -10 6 -20 0 z" fill="${P.pink}" ${S2}/>
        <path d="M -10 -4 v 12 M -3 -6 v 14 M 4 -6 v 14 M 10 -4 v 12" stroke="${P.pinkDark}" stroke-width="2"/>
      </g>`;
    case 'khau_trang':
      return `<g class="acc">
        <path d="M -38 ${MY - 12} C -38 ${MY - 18} 38 ${MY - 18} 38 ${MY - 12} L 34 ${MY + 16} C 18 ${MY + 26} -18 ${MY + 26} -34 ${MY + 16} Z" fill="${P.blue}" ${S2}/>
        <path d="M -28 ${MY - 4} H 28 M -28 ${MY + 6} H 28" stroke="${P.blueDark}" stroke-width="2.5"/>
        <path d="M -38 ${MY - 10} L -56 ${EY + 2} M 38 ${MY - 10} L 56 ${EY + 2}" stroke="${P.white}" stroke-width="3"/>
        <circle cx="10" cy="${MY + 1}" r="3" fill="${P.white}" opacity=".7"/><circle cx="-14" cy="${MY + 10}" r="2.5" fill="${P.white}" opacity=".7"/>
      </g>`;
    case 'kinh_ram':
      return `<g class="acc">
        <path d="M -42 ${EY - 12} h 34 q 2 24 -17 24 q -17 0 -17 -24 z M 8 ${EY - 12} h 34 q 0 24 -17 24 q -19 0 -17 -24 z" fill="${P.ink}"/>
        <path d="M -8 ${EY - 10} q 8 -6 16 0 M -42 ${EY - 10} l -14 -4 M 42 ${EY - 10} l 14 -4" stroke="${P.ink}" stroke-width="4" fill="none"/>
        <path d="M -34 ${EY - 6} l 9 0 M 16 ${EY - 6} l 9 0" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    case 'kinh_can':
      return `<g class="acc">
        <circle cx="-21" cy="${EY}" r="19" fill="${P.white}" fill-opacity=".18" ${S2}/>
        <circle cx="21" cy="${EY}" r="19" fill="${P.white}" fill-opacity=".18" ${S2}/>
        <path d="M -2 ${EY - 2} h 4" stroke="${P.ink}" stroke-width="3"/>
        <path d="M -30 ${EY - 10} l 6 -4" stroke="${P.white}" stroke-width="3" stroke-linecap="round"/>
      </g>`;
    case 'ao_chong_nang': {
      // áo khoác chống nắng trùm kín: ôm dáng hạt đậu, lỗ hở mặt, khoá kéo, vành mũ lưỡi trai
      const outer = beanPath(BEAN_W + 12, BEAN_H + 8);
      return `<g class="acc">
        <path d="${outer} M -36 ${EY - 26} C -36 ${EY - 44} 36 ${EY - 44} 36 ${EY - 26} L 36 ${MY - 6} C 26 ${MY + 8} -26 ${MY + 8} -36 ${MY - 6} Z" transform="translate(0 4)" fill="#FF9F4A" fill-rule="evenodd" ${S2}/>
        <path d="M -36 ${MY - 4} C -26 ${MY + 10} 26 ${MY + 10} 36 ${MY - 4} L 40 ${MY + 22} C 20 ${MY + 36} -20 ${MY + 36} -40 ${MY + 22} Z" fill="#FFB36E" ${S2}/>
        <path d="M 0 ${MY + 30} V -8" stroke="${P.ink}" stroke-width="2.5" stroke-dasharray="3 3"/>
        <rect x="-4" y="${MY + 40}" width="8" height="12" rx="2" fill="${P.steel}" ${S2}/>
        <path d="M -44 ${EY - 40} Q 0 ${EY - 70} 44 ${EY - 40} L 52 ${EY - 32} Q 0 ${EY - 52} -52 ${EY - 32} Z" fill="#E87F2A" ${S2}/>
        <path d="M -30 ${-BEAN_H + 30} q 30 -18 60 0" stroke="#FFD1A6" stroke-width="5" fill="none" stroke-linecap="round"/>
      </g>`;
    }
    case 'toc_uon':
      return `<g class="acc">
        ${[-44, -26, -8, 10, 28, 46].map((x, i) => `<circle cx="${x}" cy="${top + 22 + (i % 2) * 8}" r="18" fill="#5B3A2E"/>`).join('')}
        <circle cx="-54" cy="${top + 52}" r="14" fill="#5B3A2E"/><circle cx="54" cy="${top + 52}" r="14" fill="#5B3A2E"/>
        <circle cx="-14" cy="${top + 14}" r="5" fill="#8A5A44"/>
      </g>`;
    case 'toc_buoi':
      return `<g class="acc">
        <path d="M -54 ${top + 56} C -60 ${top + 6} 60 ${top + 6} 54 ${top + 56} C 30 ${top + 36} -30 ${top + 36} -54 ${top + 56} Z" fill="#3A2620"/>
        <circle cx="0" cy="${top + 4}" r="20" fill="#3A2620"/>
        <path d="M -14 ${top + 4} q 14 -10 28 0" stroke="${P.red}" stroke-width="4" fill="none"/>
      </g>`;
    case 'mu_phot':
      return `<g class="acc">
        <path d="M -40 ${top + 40} C -40 ${top} 40 ${top} 40 ${top + 40} Z" fill="#4A4A52" ${S2}/>
        <path d="M -40 ${top + 30} h 80 v 10 h -80 z" fill="${P.ink}"/>
        <path d="M -66 ${top + 44} q 66 -16 132 0 q -66 14 -132 0 z" fill="#4A4A52" ${S2}/>
      </g>`;
    case 'vong_vang':
      return `<g class="acc">
        <path d="M -40 -64 Q 0 -30 40 -64" stroke="${P.yellow}" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M -40 -64 Q 0 -30 40 -64" stroke="${P.yellowDark}" stroke-width="7" fill="none" stroke-dasharray="2 6"/>
        <circle cx="0" cy="-44" r="9" fill="${P.yellow}" ${S2}/>
        <path d="${sparklePath(28, -76, 8)}" fill="${P.white}"/>
      </g>`;
    case 'cavat':
      return `<g class="acc">
        <path d="M -30 -70 L 0 -56 L 30 -70 L 30 -30 L -30 -30 Z" fill="${P.white}" ${S2}/>
        <path d="M -6 -58 h 12 l 4 34 l -10 12 l -10 -12 z" fill="${P.red}" ${S2}/>
      </g>`;
    case 'balo':
      return `<g class="acc">
        <path d="M -42 -96 q -6 40 -2 86 M 42 -96 q 6 40 2 86" stroke="${P.blue}" stroke-width="10" fill="none" stroke-linecap="round"/>
        <path d="M -42 -96 q -6 40 -2 86 M 42 -96 q 6 40 2 86" stroke="${P.ink}" stroke-width="2" fill="none" stroke-dasharray="3 5"/>
      </g>`;
    case 'rau':
      return `<g class="acc">
        <path d="M -30 ${MY + 14} q 30 18 60 0 q -10 30 -30 30 q -20 0 -30 -30 z" fill="${shade(color, -0.35)}"/>
        <path d="M -22 ${MY + 22} l 4 10 M -6 ${MY + 28} l 2 10 M 10 ${MY + 28} l -2 10 M 24 ${MY + 22} l -4 10" stroke="${shade(color, -0.55)}" stroke-width="2"/>
      </g>`;
  }
}

/** SVG hạt đậu đầy đủ (chuỗi), mặc định biểu cảm idle. */
let beanUid = 0;
export function beanSvg(spec: BeanSpec): string {
  const uid = ++beanUid;
  const c = spec.color;
  const dark = shade(c, -0.18);
  const hi = shade(c, 0.35);
  const accBack = spec.acc.includes('balo')
    ? `<path d="M -60 -150 h 120 v 120 h -120 z" fill="${P.blueDark}" ${S2}/>`
    : '';
  return `<g class="bean">
    <g class="bean-body">
      ${accBack}
      <clipPath id="bean-clip-${uid}"><path d="${beanPath(BEAN_W, BEAN_H)}"/></clipPath>
      <path class="silhouette" d="${beanPath(BEAN_W, BEAN_H)}" fill="${c}"/>
      <g clip-path="url(#bean-clip-${uid})">
        <ellipse cx="${BEAN_W * 0.5}" cy="${-BEAN_H * 0.45}" rx="${BEAN_W * 0.2}" ry="${BEAN_H * 0.62}" fill="${dark}"/>
        <ellipse cx="0" cy="6" rx="${BEAN_W * 0.62}" ry="18" fill="${dark}"/>
      </g>
      <path d="M ${-BEAN_W / 2 + 16} ${-BEAN_H + 56} q 4 -22 22 -34" stroke="${hi}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <g class="arm arm-l" transform="translate(${-BEAN_W / 2 + 4} -70)"><path d="M 0 0 C -14 10 -20 30 -16 50" stroke="${c}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="-16" cy="52" r="7.5" fill="${c}"/></g>
      <g class="arm arm-r" transform="translate(${BEAN_W / 2 - 4} -70)"><path d="M 0 0 C 14 10 20 30 16 50" stroke="${dark}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="16" cy="52" r="7.5" fill="${dark}"/></g>
      <g class="head">
        ${eyes(spec.eyes ?? 'round')}
        ${lids(c)}
        ${faces(c)}
        ${spec.acc.map((a) => accFront(a, c)).join('')}
      </g>
      <g class="fx"></g>
    </g>
  </g>`;
}

export const BEAN_COLORS = ['#FF8A3D', '#7FDCC6', '#B9A3F0', '#FF8DB0', '#F7D046', '#6CC3F0', '#9ED36A', '#F28E8E', '#C9A27A'];
