import { beanSvg, EXPRS, type Accessory } from '../art/bean';

const SETS: { color: string; acc: Accessory[] }[] = [
  { color: '#FF8A3D', acc: ['non_bao_hiem'] },
  { color: '#7FDCC6', acc: ['toc_uon', 'vong_vang', 'kinh_ram'] },
  { color: '#B9A3F0', acc: ['khau_trang', 'kep_cang_cua'] },
  { color: '#FF8DB0', acc: ['non_la'] },
  { color: '#F7D046', acc: ['mu_phot', 'kinh_ram', 'cavat'] },
  { color: '#6CC3F0', acc: ['kinh_can', 'balo', 'toc_buoi'] },
  { color: '#9ED36A', acc: ['ao_chong_nang'] },
  { color: '#C9A27A', acc: ['rau'] },
];

/** /#beans — xem rig hạt đậu: mỗi ô 1 phụ kiện + 1 biểu cảm. */
export function beanSheet() {
  const stage = document.getElementById('stage')!;
  stage.style.background = '#BFE3D3';
  const cells: string[] = [];
  let i = 0;
  for (const e of EXPRS) {
    const s = SETS[i++ % SETS.length];
    const svg = beanSvg(s).replace(`face-${e}" style="display:none"`, `face-${e}"`);
    cells.push(`<div style="text-align:center"><svg viewBox="-75 -230 150 240" width="120" height="192">${svg}</svg><div style="font:700 11px 'Baloo 2'">${e}</div></div>`);
  }
  stage.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0 4px;padding:6px">${cells.join('')}</div>`;
}
