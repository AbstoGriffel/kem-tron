/**
 * /#review — các bảng thử để duyệt trên Figma trước khi làm thật (đợt 06/10).
 * Mỗi <section class="rv-frame"> = 1 frame Figma. Chỉ vẽ (không đụng luồng game).
 */
import { beanSvg, type Accessory, type Expr } from '../art/bean';
import { P, sparklePath } from '../art/kit';
import { MISS_SKIN, skinLayer, withSkin, type Skin } from '../art/skin';
import { TEXT } from '../core/serve';
import { STAT_META, statIcon } from './ticket';
import { noOrphan } from './copy';
import { BASES, INGREDIENTS } from '../core/db';
import { computeMix } from '../core/mix';
import type { BowlItem, Proc } from '../core/types';
import { physicsSvg, type Physics } from './bowlView';
import { bayBean, panelBay, panelFridge, panelHospital, panelResolve, panelShop } from '../art/story';

const css = `
body { margin: 0; background: #E9E1CF; }
#app, #stage { all: unset; }
.rv-wrap { display: flex; flex-direction: column; gap: 60px; padding: 40px; align-items: flex-start; }
.rv-frame { position: relative; box-sizing: border-box; background: #FFF8E6; border: 3px solid ${P.ink}; border-radius: 18px; padding: 28px 32px; font-family: 'Baloo 2'; color: ${P.ink}; overflow: hidden; }
.rv-h { font: 30px/1.1 'Paytone One'; margin: 0 0 4px; }
.rv-sub { font: 600 16px/1.4 'Baloo 2'; color: ${P.inkSoft}; margin: 0 0 20px; max-width: 1080px; }
.rv-grid { display: grid; gap: 14px; }
.rv-cell { background: #fff; border: 2.5px solid ${P.ink}; border-radius: 12px; padding: 10px 10px 12px; text-align: center; box-shadow: 0 4px 0 ${P.ink}; }
.rv-cell .ph { height: 186px; display: grid; place-items: end center; background: #CFE8DD; border: 2px solid ${P.ink}; border-radius: 8px; overflow: hidden; }
.rv-cell .ph.good { background: #FFE07A; } .rv-cell .ph.bad { background: #FFB4A6; } .rv-cell .ph.mid { background: #F4E7C5; }
.rv-cell b { display: block; font: 17px/1.15 'Paytone One'; margin-top: 8px; }
.rv-cell .need { display: inline-flex; align-items: center; gap: 3px; font: 700 14px 'Baloo 2'; margin-top: 2px; }
.rv-cell q, .rv-cell .line { display: block; font: 600 14px/1.3 'Baloo 2'; color: ${P.inkSoft}; margin-top: 5px; quotes: '"' '"'; }
.rv-cell .key { display: inline-block; font: 12px 'Paytone One'; background: ${P.ink}; color: #fff; border-radius: 4px; padding: 1px 7px; margin-top: 6px; }
.rv-rowlab { display: flex; flex-direction: column; justify-content: center; padding: 6px 10px; background: #FFF3C4; border: 2.5px solid ${P.ink}; border-radius: 12px; }
.rv-rowlab b { font: 18px/1.15 'Paytone One'; } .rv-rowlab span { font: 600 13px/1.3 'Baloo 2'; color: ${P.inkSoft}; }
.rv-colh { font: 15px 'Paytone One'; text-align: center; align-self: end; padding-bottom: 2px; }
.rv-colh small { display: block; font: 600 12px 'Baloo 2'; color: ${P.inkSoft}; }
.rv-rule { background: #fff; border: 2.5px dashed ${P.ink}; border-radius: 12px; padding: 14px 18px; font: 600 15px/1.45 'Baloo 2'; }
.rv-rule b { font-family: 'Paytone One'; font-weight: 400; }
.rv-rule ol { margin: 6px 0 0; padding-left: 22px; }
.rv-note { font: 600 13px/1.4 'Baloo 2'; color: ${P.inkSoft}; }
.rv-phone { width: 390px; height: 844px; padding: 0; border-radius: 0; border: none; }
.rv-phone .polaroid { position: relative; left: auto; top: 0 !important; margin: 0 auto; }
.sb-panel { width: 390px; display: flex; flex-direction: column; gap: 10px; }
.sb-art { width: 390px; height: 600px; border: 3px solid ${P.ink}; border-radius: 6px; overflow: hidden; background: #fff; }
.sb-cap { font: 19px/1.25 'Paytone One'; }
.sb-cam { background: #fff; border: 2px solid ${P.ink}; border-radius: 10px; padding: 8px 12px; font: 600 13.5px/1.4 'Baloo 2'; }
.sb-cam b { font-family: 'Paytone One'; font-weight: 400; }
.sw { background: #fff; border: 2px solid ${P.ink}; border-radius: 10px; padding: 4px 4px 6px; text-align: center; }
.sw svg { display: block; margin: 0 auto; }
.sw span { font: 700 12.5px/1.2 'Baloo 2'; color: ${P.inkSoft}; }
`;

// ---------------------------------------------------------------- hạt đậu + da
type Face = { color: string; acc: Accessory[]; expr: Expr; skins?: [Skin, number][] };
function bean(f: Face, w = 150, h = 190) {
  let svg = beanSvg({ color: f.color, acc: f.acc }).replace(`face-${f.expr}" style="display:none"`, `face-${f.expr}"`);
  if (f.skins?.length) svg = withSkin(svg, f.skins.map(([k, st]) => skinLayer(k, f.color, st)).join(''));
  return `<svg viewBox="-80 -235 160 240" width="${w}" height="${h}">${svg}</svg>`;
}
const needIcon = (k: 't' | 'm' | 'n' | 'k' | 'd', size = 18) =>
  `<svg viewBox="-10 -10 20 20" width="${size}" height="${size}">${statIcon(STAT_META[k].icon, STAT_META[k].color)}</svg>`;
const STAT_NAME = { t: 'Trắng', m: 'Mịn', n: 'Nắng', k: 'Khô', d: 'Độc' } as const;

const DISEASES = [
  { id: 'sam' as const, name: 'Da sạm', need: 't' as const, color: '#FF8A3D', acc: ['non_bao_hiem'] as Accessory[], line: 'Da chị sạm quá, tuần sau đi đám cưới rồi.' },
  { id: 'san' as const, name: 'Da sần sùi', need: 'm' as const, color: '#7FDCC6', acc: ['toc_uon'] as Accessory[], line: 'Mặt em sần như vỏ mít, làm sao cho láng.' },
  { id: 'chay' as const, name: 'Cháy nắng', need: 'n' as const, color: '#F7D046', acc: ['kinh_ram'] as Accessory[], line: 'Chạy Grab cả ngày, mặt cháy như bánh tráng.' },
  { id: 'dau' as const, name: 'Bóng dầu', need: 'k' as const, color: '#B9A3F0', acc: ['kinh_can'] as Accessory[], line: 'Mặt anh dầu tới mức chiên được trứng.' },
];

// ---------------------------------------------------------------- T32
function frameDiseases() {
  const cells = DISEASES.map((d) => `<div class="rv-cell"><div class="ph">${bean({ color: d.color, acc: d.acc, expr: 'idle', skins: [[d.id, 1]] })}</div>
    <b>${d.name}</b><span class="need">Cần ${needIcon(d.need)} ${STAT_NAME[d.need]}</span><q>${d.line}</q></div>`);
  cells.push(`<div class="rv-cell"><div class="ph">${bean({ color: '#FF8DB0', acc: ['non_la'], expr: 'idle' })}</div>
    <b>Không bệnh</b><span class="need">Đơn "tự nhiên" (Trắng 0–3)</span><q>Tự nhiên thôi, không trắng, mà se khít nha.</q></div>`);
  cells.push(`<div class="rv-cell"><div class="ph">${bean({ color: '#9ED36A', acc: ['mu_phot'], expr: 'idle', skins: [['sam', 1], ['dau', 1]] })}</div>
    <b>2 bệnh cùng lúc</b><span class="need">Cần ${needIcon('t')} ${needIcon('k')} — đơn nhiều chỉ số</span><q>Vừa đen vừa dầu, một hũ cân hết giùm chị.</q></div>`);
  return `<section class="rv-frame" data-name="T32 · Bệnh trên mặt khách lúc bước vào" style="width:1240px">
    <h2 class="rv-h">T32 · Bệnh trên mặt khách lúc bước vào</h2>
    <p class="rv-sub">Mỗi bệnh ứng với 1 chỉ số cần chữa, người chơi nhìn mặt là biết cần bỏ gì. Đơn "tự nhiên" không vẽ bệnh. Đơn nhiều chỉ số chỉ vẽ tối đa 2 bệnh nặng nhất để mặt không rối. Câu thoại là lời đặt hàng mẫu theo bệnh (T34).</p>
    <div class="rv-grid" style="grid-template-columns:repeat(6,minmax(0,1fr))">${cells.join('')}</div>
  </section>`;
}

// ---------------------------------------------------------------- T33 — chữa đúng bệnh
function frameCure() {
  const head = `<div></div><div class="rv-colh">TRƯỚC</div><div class="rv-colh">SAU · 4,5–5★<small>khỏi hẳn</small></div><div class="rv-colh">SAU · 3–4★<small>đỡ một nửa</small></div><div class="rv-colh">SAU · 1–2★<small>thiếu chỉ số → bệnh y nguyên</small></div>`;
  const rows = DISEASES.map((d) => {
    const f = (expr: Expr, st: number, cls: string, extra = '') => `<div class="rv-cell" style="padding:6px"><div class="ph ${cls}" style="height:170px">${bean({ color: d.color, acc: d.acc, expr, skins: st ? [[d.id, st]] : [] }, 130, 166)}</div>${extra}</div>`;
    return `<div class="rv-rowlab"><b>${d.name}</b><span>cần ${STAT_NAME[d.need]}</span></div>
      ${f('idle', 1, '')}${f(d.need === 't' ? 'glow' : 'ecstatic', 0, 'good')}${f('happy', 0.45, 'mid')}${f(d.need === 't' ? 'meh' : 'disgust', 1, 'bad', `<span class="key">${d.need}−</span>`)}`;
  }).join('');
  return `<section class="rv-frame" data-name="T33a · Chữa đúng bệnh: TRƯỚC → SAU theo số sao" style="width:1000px">
    <h2 class="rv-h">T33a · Chữa đúng bệnh: TRƯỚC → SAU theo số sao</h2>
    <p class="rv-sub">Bệnh mờ dần theo mức đạt chỉ số cần chữa. 5 sao + Trắng từ 8 trở lên thì đeo kính phát sáng như hiện tại. Thiếu chỉ số (lỗi "−" của đúng chỉ số đó) thì bệnh giữ nguyên.</p>
    <div class="rv-grid" style="grid-template-columns:150px repeat(4,minmax(0,1fr))">${head}${rows}</div>
  </section>`;
}

// ---------------------------------------------------------------- T33 — lỗi chính
function frameMiss() {
  const ML = TEXT.missLines as Record<string, string>;
  const C = [
    { k: 't+', name: 'Trắng lố', expr: 'shock' as Expr, color: '#FF8A3D', acc: ['non_bao_hiem'] as Accessory[], base: 'sam' as Skin },
    { k: 't-', name: 'Thiếu Trắng', expr: 'meh' as Expr, color: '#FF8A3D', acc: ['non_bao_hiem'] as Accessory[], base: null },
    { k: 'm+', name: 'Mịn lố', expr: 'shock' as Expr, color: '#7FDCC6', acc: ['khau_trang'] as Accessory[], base: null },
    { k: 'm-', name: 'Thiếu Mịn', expr: 'disgust' as Expr, color: '#7FDCC6', acc: ['toc_uon'] as Accessory[], base: null },
    { k: 'n+', name: 'Nắng lố', expr: 'cry' as Expr, color: '#F7D046', acc: ['kinh_ram'] as Accessory[], base: null },
    { k: 'n-', name: 'Thiếu Nắng', expr: 'angry' as Expr, color: '#F7D046', acc: ['non_la'] as Accessory[], base: null },
    { k: 'k+', name: 'Khô lố', expr: 'cry' as Expr, color: '#B9A3F0', acc: ['kinh_can'] as Accessory[], base: null },
    { k: 'k-', name: 'Thiếu Khô', expr: 'disgust' as Expr, color: '#B9A3F0', acc: ['mu_phot'] as Accessory[], base: null },
    { k: 'kich_ung', name: 'Kích ứng (Độc)', expr: 'sick' as Expr, color: '#9ED36A', acc: ['ao_chong_nang'] as Accessory[], base: null },
  ];
  const lineOf = (k: string) => k === 'kich_ung' ? 'Rát như thoa ớt hiểm, mặt nổi mẩn đỏ rần!' : ML[k];
  const cells = C.map((c) => `<div class="rv-cell"><div class="ph bad">${bean({ color: c.color, acc: c.acc, expr: c.expr, skins: [[MISS_SKIN[c.k], 1]] }, 140, 178)}</div>
    <b>${c.name}</b><span class="key">${c.k === 'kich_ung' ? 'kích ứng · câu mới' : c.k}</span><q>${lineOf(c.k)}</q></div>`).join('');
  const glow = `<div class="rv-cell"><div class="ph good">${bean({ color: '#FF8DB0', acc: ['toc_buoi'], expr: 'glow' }, 140, 178)}</div><b>Trúng hết · 5★</b><span class="key">glow / ecstatic</span><q>${TEXT.react['5'][0]}</q></div>`;
  return `<section class="rv-frame" data-name="T33b · Lỗi chính → ảnh SAU + câu chê (T10)" style="width:1240px">
    <h2 class="rv-h">T33b · Lỗi chính → ảnh SAU và câu chê dùng chung 1 lỗi</h2>
    <p class="rv-sub">Đủ các lỗi game đang chấm (8 câu chê trong missLines + kích ứng) và ca trúng hết. "Thiếu" của chỉ số chữa bệnh thì ảnh SAU là bệnh cũ giữ nguyên (xem T33a).</p>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start">
      <div class="rv-grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">${cells}${glow}</div>
      <div class="rv-rule"><b>Quy tắc chọn 1 lỗi chính (T10)</b>
        <ol>
          <li>Có kích ứng (Độc vượt ngưỡng) → mặt mẩn đỏ, câu chê về kích ứng.</li>
          <li>Không kích ứng → chỉ số lệch xa mục tiêu nhất → hình và câu theo bảng bên trái.</li>
          <li>Trúng mục tiêu hết → khỏi bệnh; 5★ và Trắng ≥ 8 thì đeo kính phát sáng.</li>
        </ol>
        <p style="margin:10px 0 0">Ảnh SAU = bệnh gốc (mờ theo mức chữa ở T33a) + lớp lỗi chính vẽ đè.</p>
        <p class="rv-note" style="margin:8px 0 0">Ví dụ lỗi người chơi báo: hũ siêu trắng có hàng sỉ → kích ứng thắng → ảnh mẩn đỏ VÀ câu "Rát như thoa ớt hiểm…", không còn câu "trắng quá" đi kèm mặt đỏ.</p>
      </div>
    </div>
  </section>`;
}

// ---------------------------------------------------------------- T33 — trong game (polaroid)
function polaroid(before: Face, after: Face, cls: string, cap: string, stars: number, who: string) {
  const ph = (f: Face) => bean(f, 118, 148);
  return `<div class="polaroid"><div class="pl-pics">
      <figure><div class="pl-ph">${ph(before)}</div><figcaption>TRƯỚC</figcaption></figure>
      <figure class="${cls}"><div class="pl-ph">${ph(after)}</div><figcaption>SAU</figcaption></figure>
    </div><div class="pl-cap">${noOrphan(`"${cap}"`)}</div><div class="pl-tag">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} — ${who}</div></div>`;
}
function framePolaroid() {
  const a = polaroid({ color: '#FF8A3D', acc: ['non_bao_hiem'], expr: 'idle', skins: [['sam', 1]] }, { color: '#FF8A3D', acc: ['non_bao_hiem'], expr: 'shock', skins: [['sam', 0.4], ['trang_bech', 1]] }, 'bad', (TEXT.missLines as Record<string, string>)['t+'], 2, 'Chị Hoa');
  const b = polaroid({ color: '#7FDCC6', acc: ['toc_uon'], expr: 'idle', skins: [['san', 1]] }, { color: '#7FDCC6', acc: ['toc_uon'], expr: 'ecstatic' }, 'good', TEXT.react['5'][1], 5, 'Cô Út');
  const c = polaroid({ color: '#F7D046', acc: ['kinh_ram'], expr: 'idle', skins: [['chay', 1]] }, { color: '#F7D046', acc: ['kinh_ram'], expr: 'sick', skins: [['chay', 0.5], ['man_do', 1]] }, 'bad', 'Rát như thoa ớt hiểm, mặt nổi mẩn đỏ rần!', 1, 'Anh Tư');
  return `<section class="rv-frame rv-phone" data-name="T33c · Ảnh TRƯỚC/SAU trong game" style="background:#2A1A16;display:flex;flex-direction:column;gap:16px;justify-content:center">
    <div style="color:#FFF4DC;font:20px 'Paytone One';text-align:center">T33c · Tấm ảnh trong game</div>
    ${a}${b}${c}
  </section>`;
}

// ---------------------------------------------------------------- T22 chị Bảy
function frameBay() {
  const L = [
    { e: 'happy' as Expr, when: 'Ngày 1 · ghé giới thiệu', line: 'Chị Bảy chủ hụi nè. Mẹ em dặn rồi, chị đợi được, mà đúng hẹn nha cưng.' },
    { e: 'talk' as Expr, when: 'Ngày 4 · nhắc kỳ 1', line: 'Mai tới kỳ hụi rồi đó. Chị không hối, chị chỉ… nhắc.' },
    { e: 'sus' as Expr, when: 'Khi tiền còn xa mục tiêu', line: 'Bán kiểu này tới Tết mới đủ hả em?' },
    { e: 'angry' as Expr, when: 'Ngày 9 · nhắc kỳ cuối', line: 'Kỳ cuối nha. Trễ nữa là chị dọn ra đây bán phụ luôn đó.' },
  ];
  return `<section class="rv-frame" data-name="T22 · Chị Bảy — chủ hụi" style="width:1240px">
    <h2 class="rv-h">T22 · Chị Bảy — chủ hụi ghé cửa sổ</h2>
    <p class="rv-sub">Tóc búi, vòng vàng, quạt nan, kẹp sổ hụi đỏ. Không mua kem, chỉ ló cửa sổ nói 1 câu rồi đi. Thoại không nêu số tiền — số chỉ hiện ở sổ tối (T23).</p>
    <div class="rv-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${L.map((l) => `<div class="rv-cell"><div class="ph" style="height:230px">${bayBean(l.e)}</div><b>${l.when}</b><q>${l.line}</q></div>`).join('')}</div>
  </section>`;
}

// ---------------------------------------------------------------- T30 kem trong thau
type Fx = { fill: string; alpha?: number; grain?: number; gloss?: number; ripple?: boolean; swirl?: number; peaks?: number; oil?: number; crack?: number; matte?: boolean; bubbles?: number; smoke?: boolean; tint?: string; clumps?: number; powder?: number; split?: boolean; curd?: boolean; foam?: boolean; steam?: boolean };
let swUid = 0;
function bowlSwatch(fx: Fx, w = 170) {
  const id = `sw${++swUid}`;
  const cx = 100, cy = 58, rx = 80, ry = 33;
  let srnd = 17 + swUid * 13;
  const rnd = () => ((srnd = (srnd * 9301 + 49297) % 233280) / 233280);
  const inEl = () => { for (;;) { const x = cx + (rnd() * 2 - 1) * rx * 0.9, y = cy + (rnd() * 2 - 1) * ry * 0.85; if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.8) return [x, y]; } };
  let s = '';
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fx.fill}" fill-opacity="${fx.alpha ?? 1}"/>`;
  if (fx.tint) s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fx.tint}" opacity=".35"/>`;
  if (fx.split) s += `<path d="M ${cx - rx} ${cy} q 20 -10 40 -2 q 20 8 40 0 q 20 -8 40 2 q 20 8 40 0 V ${cy - ry - 2} H ${cx - rx} Z" fill="#F2C94C" opacity=".6"/><path d="M ${cx - rx} ${cy} q 20 -10 40 -2 q 20 8 40 0 q 20 -8 40 2 q 20 8 40 0" stroke="#B88A1E" stroke-width="2" fill="none"/>`;
  if (fx.matte) s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#C8BBA0" opacity=".25"/>`;
  for (let i = 0; i < (fx.grain ?? 0); i++) { const [x, y] = inEl(); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + rnd() * 1.4).toFixed(1)}" fill="#A67C52" opacity=".75"/>`; }
  for (let i = 0; i < (fx.powder ?? 0); i++) { const [x, y] = inEl(); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd()).toFixed(1)}" fill="#DCD3C2"/>`; }
  for (let i = 0; i < (fx.clumps ?? 0); i++) { const [x, y] = inEl(); const r = 4 + rnd() * 4; s += `<path d="M ${x - r} ${y} q ${r * 0.3} ${-r} ${r} ${-r * 0.8} q ${r} 0 ${r} ${r * 0.8} q -${r * 0.4} ${r * 0.7} -${r} ${r * 0.6} q -${r * 0.7} 0 -${r} -${r * 0.6} z" fill="#FFFFFF" stroke="#CFC5AE" stroke-width="1.5"/>`; }
  if (fx.curd) for (let i = 0; i < 9; i++) { const [x, y] = inEl(); const r = 3 + rnd() * 4; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#F3EBD2" stroke="#9A8A5A" stroke-width="1.4"/>`; }
  if (fx.ripple) s += [0.35, 0.6, 0.85].map((k) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx * k}" ry="${ry * k}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>`).join('');
  if (fx.swirl) s += `<path d="M ${cx - 46} ${cy + 4} q 20 -22 46 -12 q 30 12 6 22 q -24 8 -28 -6 q 0 -10 16 -8" stroke="#E2D5BA" stroke-width="${fx.swirl * 3}" fill="none" stroke-linecap="round"/><path d="M ${cx - 46} ${cy + 2} q 20 -16 46 -8" stroke="#fff" stroke-width="${fx.swirl * 1.4}" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < (fx.oil ?? 0); i++) { const [x, y] = inEl(); const r = 2.5 + rnd() * 4; s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.6).toFixed(1)}" fill="#F2C94C" fill-opacity=".75" stroke="#B88A1E" stroke-width="1"/><circle cx="${(x - r * 0.3).toFixed(1)}" cy="${(y - r * 0.2).toFixed(1)}" r="1" fill="#fff"/>`; }
  if (fx.crack) { const n = fx.crack; for (let i = 0; i < n; i++) { const [x, y] = inEl(); s += `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} l ${(rnd() * 14 - 7).toFixed(1)} ${(rnd() * 6 - 3).toFixed(1)} l ${(rnd() * 12).toFixed(1)} ${(rnd() * 6 - 1).toFixed(1)} M ${x.toFixed(1)} ${y.toFixed(1)} l ${(-rnd() * 10).toFixed(1)} ${(rnd() * 6).toFixed(1)}" stroke="#7A5A3A" stroke-width="1.5" fill="none" stroke-linecap="round"/>`; } }
  if (fx.gloss) s += `<ellipse cx="${cx - 26}" cy="${cy - 9}" rx="${18 * fx.gloss}" ry="${4 * fx.gloss}" fill="#fff" opacity=".95"/><path d="M ${cx + 14} ${cy - 14} q 18 -2 30 4" stroke="#fff" stroke-width="${2 * fx.gloss}" fill="none" stroke-linecap="round" opacity=".9"/>${fx.gloss > 1.2 ? `<path d="${sparklePath(cx + 44, cy - 14, 7)}" fill="#fff"/>` : ''}`;
  for (let i = 0; i < (fx.bubbles ?? 0); i++) { const [x, y] = inEl(); const r = 1.6 + rnd() * (fx.bubbles! > 10 ? 4 : 2.5); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" fill-opacity=".5" stroke="#7D2FBF" stroke-width="1.2"/>`; }
  if (fx.foam) s += `<path d="M ${cx - 50} ${cy - 6} q 6 -20 18 -10 q 6 -18 18 -6 q 10 -16 20 -2 q 12 -14 18 2 q 10 -6 10 8 q -40 12 -84 8 z" fill="#F4ECFF" stroke="#7D2FBF" stroke-width="2"/>`;
  // phần nhô lên trên mặt (đỉnh kem, khói, hơi) vẽ ngoài clip
  let up = '';
  if (fx.peaks) for (let i = 0; i < fx.peaks; i++) { const x = cx - 42 + i * (84 / Math.max(1, fx.peaks - 1)), y = cy + 8 - (i % 2) * 6, h = 20 + (i % 2) * 8; up += `<path d="M ${x - 17} ${y} C ${x - 17} ${y - h * 0.6} ${x - 5} ${y - h} ${x + 1} ${y - h - 4} C ${x + 3} ${y - h} ${x + 17} ${y - h * 0.6} ${x + 17} ${y} Z" fill="${fx.fill}" stroke="#BDB29A" stroke-width="1.8"/><path d="M ${x - 9} ${y - 4} C ${x - 9} ${y - h * 0.5} ${x - 3} ${y - h * 0.8} ${x} ${y - h}" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>`; }
  if (fx.smoke) up += [cx - 24, cx + 6, cx + 34].map((x, i) => `<path d="M ${x} ${cy - 8} q -10 -12 0 -22 q 10 -10 0 -22" stroke="#6A5A78" stroke-width="${4 - i * 0.6}" fill="none" stroke-linecap="round" opacity=".6"/>`).join('');
  if (fx.steam) up += [cx - 20, cx + 18].map((x) => `<path d="M ${x} ${cy - 8} q -8 -10 0 -20 q 8 -10 0 -20" stroke="#B9C7CF" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".9"/>`).join('');
  const bowl = `<path d="M 8 56 Q 16 128 100 134 Q 184 128 192 56" fill="#CFD6DB" stroke="${P.ink}" stroke-width="3"/>
    <ellipse cx="100" cy="56" rx="92" ry="40" fill="#EEF2F4" stroke="${P.ink}" stroke-width="3"/>
    <ellipse cx="100" cy="58" rx="83" ry="34" fill="#9AA6AE"/>`;
  return `<svg viewBox="0 -6 200 146" width="${w}" height="${(w * 146) / 200}" overflow="visible"><defs><clipPath id="${id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath></defs>${bowl}<g clip-path="url(#${id})">${s}</g>${up}</svg>`;
}

function framePhysics() {
  const base = '#FBF3E2';
  const R: { name: string; ch: string; real: string; cols: [string, Fx][] }[] = [
    { name: 'Trắng', ch: 'độ đục + độ sáng', real: 'Bột màu (bột gạo, đất sét, "bột trắng") càng nhiều kem càng đục, sáng. Lố thì bột không tan, vón và để lại vệt phấn.', cols: [
      ['thấp · trong, ngả vàng', { fill: '#E9CFA0', alpha: 0.55 }], ['vừa · trắng ngà', { fill: '#F7EEDB' }], ['cao · trắng đục', { fill: '#FFFFFF', matte: false }], ['lố · bột vón, lấm tấm phấn', { fill: '#FFFFFF', clumps: 6, powder: 26 }]] },
    { name: 'Mịn', ch: 'độ bóng mặt kem', real: 'Gel, dầu, mật ong làm mặt kem láng và phản chiếu. Thiếu thì còn hạt lợn cợn như bột chưa tan.', cols: [
      ['thấp · lợn cợn hạt', { fill: base, grain: 42 }], ['vừa · hơi láng', { fill: base, grain: 8, gloss: 0.6 }], ['cao · láng bóng', { fill: base, gloss: 1.1 }], ['lố · bóng như gương, trơn', { fill: base, gloss: 1.6, ripple: true }]] },
    { name: 'Nắng', ch: 'độ đặc', real: 'Kem chống nắng vật lý (kẽm, titan) đặc như hồ. Ít thì kem lỏng, gợn sóng. Nhiều thì đứng chóp khi khuấy.', cols: [
      ['thấp · lỏng, gợn sóng', { fill: base, ripple: true }], ['vừa · sệt, vệt khuấy', { fill: base, swirl: 1 }], ['cao · đặc, vệt khuấy dày', { fill: base, swirl: 2 }], ['lố · đứng chóp như trát vữa', { fill: base, peaks: 4, swirl: 2 }]] },
    { name: 'Khô', ch: 'váng dầu ↔ mặt khô', real: 'Thiếu chất hút dầu thì dầu nổi váng thành giọt. Đất sét, phấn rôm hút dầu → mặt khô ráo, lố thì nứt như đất sét phơi nắng.', cols: [
      ['âm · váng dầu loang', { fill: base, oil: 12 }], ['vừa · ráo', { fill: base }], ['cao · mặt lì, xỉn', { fill: base, matte: true, crack: 2 }], ['lố · nứt nẻ', { fill: '#EFE3C6', matte: true, crack: 9 }]] },
    { name: 'Độc', ch: 'bọt + khói + đổi màu', real: 'Axit (chanh) gặp kiềm (kem đánh răng, phèn) thì sủi khí. Càng độc càng sủi mạnh, bốc khói, ngả tím xanh. Từ 15 là nổ thau.', cols: [
      ['1–5 · bọt li ti', { fill: base, bubbles: 6 }], ['6–9 · sủi lăn tăn', { fill: base, bubbles: 14, tint: '#C9A6F0' }], ['10–14 · sủi + khói', { fill: base, bubbles: 22, tint: '#9AD27A', smoke: true }], ['15+ · sôi trào, sắp nổ', { fill: base, bubbles: 26, tint: '#7D2FBF', smoke: true, foam: true }]] },
    { name: 'Phản ứng riêng', ch: 'hiện tượng thật, dễ nhớ', real: 'Mấy cảnh "hoá học bếp" có thật, mỗi cảnh gắn với 1 luật đang có trong game.', cols: [
      ['bỏ quá tay → tách lớp', { fill: base, split: true }], ['chanh + lòng trắng trứng → vón cục', { fill: base, curd: true }], ['chanh + kem đánh răng → núi lửa bọt', { fill: base, foam: true, bubbles: 10 }], ['đun → lỏng ra, bốc hơi', { fill: base, ripple: true, steam: true }]] },
  ];
  const rows = R.map((r) => `<div class="rv-rowlab"><b>${r.name}</b><span style="font-weight:800;color:${P.ink}">${r.ch}</span><span>${r.real}</span></div>
    ${r.cols.map(([lab, fx]) => `<div class="sw">${bowlSwatch(fx, 196)}<span>${lab}</span></div>`).join('')}`).join('');
  const sample = bowlSwatch({ fill: '#FFFFFF', gloss: 1.1, oil: 6, bubbles: 7 }, 300);
  return `<section class="rv-frame" data-name="T30 · Kem trong thau: mỗi chỉ số một trạng thái vật lý" style="width:1240px">
    <h2 class="rv-h">T30 · Kem trong thau: mỗi chỉ số là một trạng thái vật lý</h2>
    <p class="rv-sub">Mỗi chỉ số dùng một "kênh" hình riêng nên đọc được nhiều chỉ số cùng lúc: màu/độ đục = Trắng, độ bóng = Mịn, độ đặc = Nắng, váng dầu hoặc nứt = Khô, bọt/khói = Độc. Không dùng icon hay chữ trên thau. Số liệu vẫn nằm trong ticket.</p>
    <div class="rv-grid" style="grid-template-columns:250px repeat(4,minmax(0,1fr))">
      <div></div><div class="rv-colh">thấp</div><div class="rv-colh">vừa</div><div class="rv-colh">cao</div><div class="rv-colh">lố</div>
      ${rows}
    </div>
    <div class="rv-rule" style="margin-top:18px;display:grid;grid-template-columns:320px 1fr;gap:20px;align-items:center">${sample}
      <div><b>Ví dụ đọc 1 mẻ</b>
        <p style="margin:6px 0 0">Trắng đục + bóng loáng + vài giọt dầu + bọt li ti → <b>Trắng cao, Mịn cao, Khô âm, Độc nhẹ</b>. Khách da dầu mà thấy váng dầu là biết phải thêm đồ hút dầu.</p>
        <p class="rv-note" style="margin:8px 0 0">Hiển thị cập nhật mỗi lần thả món, chuyển mượt (độ đục, bóng, bọt tăng dần), không có số bay lên trên thau.</p></div>
    </div>
  </section>`;
}

function frameStoryboard() {
  const P5 = [
    { art: panelHospital(), cap: '1. Mẹ trượt chân ngoài chợ, bó bột nằm nhà, nghỉ bán.', cam: '<b>Mở:</b> cận cái chân bó bột, máy kéo lùi (pull-out) lộ cả giường + đôi nạng + chén cháo. <b>Lặp nhỏ:</b> hơi cháo bốc, mẹ chớp mắt. Bong bóng thoại bật khi máy dừng. Khớp với ngày 1: mẹ vẫn là khách đầu tiên (bó chân nhưng mặt vẫn phải đẹp đi đám giỗ).' },
    { art: panelBay(), cap: '2. Nhà còn đang góp hụi chị Bảy.', cam: '<b>Chuyển khung:</b> cửa trượt mở (wipe ngang) thay khung 1. Chị Bảy ló vào, quạt phe phẩy. <b>Nhấn:</b> sổ hụi đỏ zoom nhẹ 1 nhịp. Không nêu số tiền.' },
    { art: panelFridge(), cap: '3. Lục tủ lạnh: còn hộp kem trơn, ít rau củ.', cam: '<b>Mở:</b> cửa tủ lạnh bật, ánh sáng lạnh quét ra. <b>Lớp parallax:</b> từng món bật lên lần lượt theo nhịp (đúng hàng đầu game: kem trơn, dưa leo, cà chua, chanh, nghệ, nước vo gạo). Thau nhôm nằm ở khung 4 trên bàn tiệm.' },
    { art: panelShop(), cap: '4. Dựng tiệm kem trộn ngay đầu hẻm.', cam: '<b>Máy:</b> lia ngang dọc hẻm (pan), bảng hiệu bìa giấy rơi xuống, lắc lư rồi đứng. Cờ dây đung đưa. <b>Chi tiết hài:</b> dấu * "không bao" nhỏ dưới góc.' },
    { art: panelResolve(), cap: '5. Bán kem. Trả hụi. Làm giàu!', cam: '<b>Nhấn mạnh:</b> zoom giật vào nắm tay giơ muỗng khuấy, tia sáng xoay, tiền rơi. Chữ "LÀM GIÀU!" đập xuống rồi chuyển thẳng sang màn tiêu đề KEM TRỘN.' },
  ];
  return `<section class="rv-frame" data-name="T21 · Storyboard mở đầu (moving comic)" style="width:2230px">
    <h2 class="rv-h">T21 · Mở đầu kiểu truyện tranh chuyển động — 5 khung</h2>
    <p class="rv-sub" style="max-width:1900px">Chạm để sang khung, mỗi khung tự chạy 2–4 giây (máy đẩy/kéo, parallax 2–3 lớp, chuyển khung bằng trượt/che), có nút "Bỏ qua" góc trên. Kỹ thuật tham khảo motion comic: tách nền / nhân vật / chữ thành lớp chạy lệch tốc độ; giữ 1 chuyển động lặp nhỏ để khung không đứng hình; chữ thoại bật theo nhịp chạm (kiểu Florence trên điện thoại). Không nêu số ngày, không nêu số tiền hụi. Nhân vật chính chỉ lộ tay — không đặt mặt/giới tính.</p>
    <div style="display:flex;gap:46px;align-items:flex-start">${P5.map((p) => `<div class="sb-panel"><div class="sb-art">${p.art}</div><div class="sb-cap">${p.cap}</div><div class="sb-cam">${p.cam}</div></div>`).join('')}</div>
  </section>`;
}

export function bootReview() {
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
  const wrap = document.createElement('div');
  wrap.className = 'rv-wrap';
  wrap.innerHTML = [frameDiseases(), frameCure(), frameMiss(), framePolaroid(), frameBay(), framePhysics(), frameStoryboard()].join('');
  document.body.innerHTML = '';
  document.body.appendChild(wrap);
}

/** /#bowl-lab — T30: xem bằng mắt các trạng thái thau rối nhất + một số trạng thái nhẹ (lấy từ mọi mẻ tới 3 món). */
export function bootBowlLab() {
  const st = document.createElement('style');
  st.textContent = css + `.bl-grid{display:grid;grid-template-columns:repeat(8,170px);gap:8px;padding:16px}.bl-grid .sw span{font-size:10.5px}`;
  document.head.appendChild(st);
  const variants: BowlItem[] = [];
  for (const it of INGREDIENTS) for (const p of ['raw', ...it.process] as Proc[]) variants.push({ id: it.id, proc: p });
  const seen = new Map<string, { p: Physics; label: string; n: number }>();
  for (const b of BASES) {
    const cur: BowlItem[] = [];
    const rec = (start: number) => {
      for (const heat of [false, true]) {
        const m = computeMix(b.id, cur, heat, false);
        const has = (id: string) => cur.some((i) => i.id === id);
        const p: Physics = { t: m.stats.t, m: m.stats.m, n: m.stats.n, k: m.stats.k, d: m.stats.d, kRaw: m.raw.k, split: m.overused.length > 0, curd: has('chanh') && has('trung'), foam: m.combos.some((c) => c.fx === 'nui_lua') || m.fakeClash, steam: heat };
        const r = physicsSvg(p, 100, 58, 83, 34);
        const n = (r.in + r.up).split('<').length;
        const key = `${p.t}|${p.m}|${p.n}|${Math.sign(p.kRaw ?? 0)}${p.k}|${p.d}|${+!!p.split}${+!!p.curd}${+!!p.foam}${+!!p.steam}`;
        if (!seen.has(key)) seen.set(key, { p, n, label: `${b.id.replace('_', ' ')}+${cur.map((i) => i.id + (i.proc !== 'raw' ? '/' + i.proc[0] : '')).join('+')}${heat ? ' 🔥' : ''}` });
      }
      if (cur.length >= 3) return;
      for (let i = start; i < variants.length; i++) { cur.push(variants[i]); rec(i); cur.pop(); }
    };
    rec(0);
  }
  const all = [...seen.values()].sort((a, b) => b.n - a.n);
  const pick = [...all.slice(0, 64), ...all.filter((_, i) => i % Math.floor(all.length / 32) === 0).slice(0, 32)];
  const sw = (x: { p: Physics; label: string }) => {
    const r = physicsSvg(x.p, 100, 58, 83, 34);
    const id = `bl${Math.random().toString(36).slice(2)}`;
    return `<div class="sw"><svg viewBox="0 -40 200 180" width="160" height="144" overflow="visible"><defs><clipPath id="${id}"><ellipse cx="100" cy="58" rx="83" ry="34"/></clipPath></defs>
      <path d="M 8 56 Q 16 128 100 134 Q 184 128 192 56" fill="#CFD6DB" stroke="${P.ink}" stroke-width="3"/><ellipse cx="100" cy="56" rx="92" ry="40" fill="#EEF2F4" stroke="${P.ink}" stroke-width="3"/>
      <g clip-path="url(#${id})"><ellipse cx="100" cy="58" rx="83" ry="34" fill="#FBF3E2"/>${r.in}</g>${r.up}</svg>
      <span>T${x.p.t} M${x.p.m} N${x.p.n} K${x.p.k}${(x.p.kRaw ?? 0) < 0 ? '(' + x.p.kRaw + ')' : ''} Đ${x.p.d}<br>${x.label}</span></div>`;
  };
  document.body.innerHTML = `<div style="padding:16px;font:700 16px 'Baloo 2'">${seen.size} trạng thái (cốt × tới 3 món, có chế biến/đun). 64 rối nhất + 32 rải đều.</div><div class="bl-grid">${pick.map(sw).join('')}</div>`;
}
