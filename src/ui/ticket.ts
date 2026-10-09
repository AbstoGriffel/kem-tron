import { gsap } from 'gsap';
import { el, P } from '../art/kit';
import { distToRange } from '../core/score';
import type { Customer } from '../core/state';
import type { Stats, StatKey } from '../core/types';

export const STAT_META: Record<StatKey | 'd', { label: string; color: string; icon: string }> = {
  t: { label: 'TRẮNG', color: P.yellow, icon: 'bulb' },
  m: { label: 'MỊN', color: P.pink, icon: 'iron' },
  n: { label: 'NẮNG', color: '#FF9F4A', icon: 'umbrella' },
  k: { label: 'KHÔ', color: P.teal, icon: 'fan' },
  d: { label: 'ĐỘC', color: P.purple, icon: 'skull' },
};

/** Icon chỉ số 18×18, tâm (0,0). */
export function statIcon(kind: string, color: string): string {
  const s = `stroke="${P.ink}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
  switch (kind) {
    case 'bulb': return `<path d="M -5 2 C -9 -2 -7 -9 0 -9 C 7 -9 9 -2 5 2 L 4 5 H -4 Z" fill="${color}" ${s}/><path d="M -3 7 H 3" ${s}/><path d="M -2 -5 q 2 -2 4 0" stroke="#fff" stroke-width="1.6" fill="none"/>`;
    case 'iron': return `<path d="M -9 5 C -9 -2 -3 -6 6 -6 L 9 5 Z" fill="${color}" ${s}/><path d="M -2 -6 V -9 H 6" ${s} fill="none"/>`;
    case 'umbrella': return `<path d="M -9 0 C -9 -10 9 -10 9 0 Z" fill="${color}" ${s}/><path d="M 0 0 V 7 q 0 3 -3 2" ${s} fill="none"/>`;
    case 'fan': return `<circle r="8.5" fill="#fff" ${s}/><path d="M0 0 C -2 -7 4 -8 4 -4 Z M0 0 C 7 -1 7 5 3 4 Z M0 0 C -2 7 -8 3 -5 1 Z" fill="${color}" ${s}/><circle r="1.6" fill="${P.ink}"/>`;
    case 'skull': return `<path d="M -7 2 C -9 -8 9 -8 7 2 L 5 3 V 7 H -5 V 3 Z" fill="#fff" ${s}/><circle cx="-3" cy="-1" r="2" fill="${color}"/><circle cx="3" cy="-1" r="2" fill="${color}"/><path d="M -2 7 V 5 M 0 7 V 5 M 2 7 V 5" stroke="${P.ink}" stroke-width="1"/>`;
  }
  return '';
}

// X + góc nghiêng chọn để mép phải (cả bóng) không lấn qua khung hộc tủ (GX - 4 = 134)
const X = 4, Y = 584, W = 120, H = 222, TILT = -1.5;
const BAR_X = 27, BAR_W = 78, ROW_Y0 = 62, ROW_H = 24;

/** Tờ order kẹp trên bàn: chỉ số + vạch mục tiêu + preview. */
export class Ticket {
  g: SVGGElement;
  private rows: Record<string, { cells: SVGRectElement[]; band: SVGRectElement; mark: SVGTextElement; row: SVGGElement }> = {};
  private revealed = false;
  private customer?: Customer;
  private budgetText!: SVGTextElement;
  private budgetLbl!: SVGTextElement;
  private stamp!: SVGGElement;
  private nameText!: SVGTextElement;
  onAsk?: () => void;
  onZoom?: () => void;
  private askBtn!: SVGGElement;
  /** Phần chữ/thanh trên giấy (giấy đứng yên, chỉ phần này nhá lên khi khách mới tới). */
  private body!: SVGGElement;
  private note!: SVGGElement;
  private more!: SVGGElement;
  private zoomEl?: HTMLElement;

  constructor(parent: SVGGElement) {
    const holder = el('g', { transform: `translate(${X} ${Y}) rotate(${TILT} ${W / 2} 0)` });
    parent.appendChild(holder);
    this.g = el('g', { id: 'ticket' });
    holder.appendChild(this.g);
    this.build();
    // R3: tờ đơn luôn nằm trên bàn từ lúc mở tiệm — chưa có khách thì để trống
    this.clear();
  }

  private build() {
    const paper = el('g');
    paper.innerHTML = `
      <path d="M 4 6 H ${W + 4} V ${H + 6} H 4 Z" fill="${P.ink}" opacity=".15"/>
      <path d="M 0 0 H ${W} V ${H - 6} l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -6 -6 l -6 6 l -4 -4 Z" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="${W / 2 - 22}" y="-8" width="44" height="14" fill="${P.yellow}" opacity=".85" transform="rotate(3 ${W / 2} 0)"/>
      <path d="M 8 22 H ${W - 8}" stroke="${P.red}" stroke-width="1.2" opacity=".6"/>
      <path d="M 8 44 H ${W - 8}" stroke="${P.blue}" stroke-width="1" opacity=".35" stroke-dasharray="3 3"/>`;
    this.g.appendChild(paper);
    this.body = el('g');
    this.g.appendChild(this.body);
    // tờ trống (không có khách) thì chạm không làm gì
    this.g.addEventListener('pointerdown', (e) => { if (!(e.target as Element).closest('.ask')) { e.stopPropagation(); if (this.customer) this.onZoom?.(); } });
    this.nameText = el('text', { x: 8, y: 17, 'font-family': 'Baloo 2', 'font-weight': 800, 'font-size': 12, fill: P.ink });
    this.body.appendChild(this.nameText);
    // tờ tiền budget
    const note = this.note = el('g', { transform: `translate(58 29) rotate(-3)` });
    note.innerHTML = `<rect width="46" height="16" rx="2" fill="#9ED36A" stroke="${P.ink}" stroke-width="1.6"/><circle cx="8" cy="8" r="4.5" fill="#C9EE9A" stroke="${P.greenDark}" stroke-width="1"/>`;
    // chữ neo trái ngay sau đồng xu (chữ dài như "tình iu" không lấn vào xu), tờ tiền nới theo chữ
    this.budgetText = el('text', { x: 16, y: 12.5, 'font-family': 'Paytone One', 'font-size': 10.5, fill: P.ink, 'text-anchor': 'start' });
    note.appendChild(this.budgetText);
    this.body.appendChild(note);
    const lbl = this.budgetLbl = el('text', { x: 8, y: 40, 'font-family': 'Baloo 2', 'font-weight': 700, 'font-size': 9.5, fill: P.inkSoft });
    lbl.textContent = 'khách đưa:';
    this.g.appendChild(lbl);

    (['t', 'm', 'n', 'k', 'd'] as const).forEach((k, i) => {
      const meta = STAT_META[k];
      const row = el('g', { transform: `translate(0 ${ROW_Y0 + i * ROW_H})` });
      const n = k === 'd' ? 15 : 10;
      const cw = BAR_W / n;
      let cells = '';
      row.innerHTML = `<g transform="translate(15 0)">${statIcon(meta.icon, meta.color)}</g>`;
      const band = el('rect', { x: BAR_X - 1.5, y: -9, height: 18, width: 0, rx: 3, fill: '#B7F0A0', stroke: P.greenDark, 'stroke-width': 1.6, 'stroke-dasharray': '0' });
      row.appendChild(band);
      const cellEls: SVGRectElement[] = [];
      for (let c = 0; c < n; c++) {
        let zone = 'none';
        if (k === 'd') zone = c < 5 ? '#E6F5DA' : c < 9 ? '#FFF0B8' : c < 14 ? '#FFD0C8' : '#E0C8F5';
        const r = el('rect', { x: BAR_X + c * cw + 0.8, y: -6, width: cw - 1.6, height: 12, rx: 1.5, fill: zone === 'none' ? '#fff' : zone, stroke: P.ink, 'stroke-width': 1 });
        row.appendChild(r);
        cellEls.push(r);
      }
      void cells;
      const mark = el('text', { x: BAR_X + BAR_W + 3, y: 4.5, 'font-family': 'Paytone One', 'font-size': 10, fill: P.ink, 'text-anchor': 'start' });
      row.appendChild(mark);
      this.body.appendChild(row);
      this.rows[k] = { cells: cellEls, band, mark, row };
    });

    // nút "Hả em?" (hỏi lại khách)
    this.askBtn = el('g', { class: 'ask', transform: `translate(${W - 48} ${H - 52})`, style: 'cursor:pointer' });
    this.askBtn.innerHTML = `<rect x="-6" y="-12" width="44" height="22" rx="11" fill="${P.blue}" stroke="${P.ink}" stroke-width="2"/><text x="16" y="4" font-family="Paytone One" font-size="10" fill="#fff" text-anchor="middle">Hả em?</text>`;
    this.askBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onAsk?.(); });
    this.g.appendChild(this.askBtn);
    const more = this.more = el('g', { class: 'tk-more', transform: `translate(${W / 2} ${H - 22})` });
    more.innerHTML = `<rect x="-38" y="-12" width="76" height="24" rx="8" fill="#fff" stroke="${P.ink}" stroke-width="2.4"/><text y="5" font-family="Paytone One" font-size="11" fill="${P.ink}" text-anchor="middle">CHI TIẾT</text>`;
    this.g.appendChild(more);

    this.stamp = el('g', { transform: `translate(${W / 2} ${H / 2}) rotate(-14)`, opacity: 0 });
    this.stamp.innerHTML = `<rect x="-50" y="-16" width="100" height="32" rx="5" fill="none" stroke="${P.red}" stroke-width="3.5"/><text y="8" font-family="Paytone One" font-size="18" fill="${P.red}" text-anchor="middle">ĐÃ CHỐT</text>`;
    this.body.appendChild(this.stamp);
  }

  /** Tờ tiền ôm vừa chữ: rộng = lề xu + chữ + lề phải (tối thiểu 46). */
  private fitNote() {
    let w = 0;
    try { w = this.budgetText.getComputedTextLength(); } catch { /* chưa vẽ */ }
    (this.note.querySelector('rect') as SVGRectElement).setAttribute('width', String(Math.max(46, Math.ceil(16 + w + 6))));
  }

  /** Giữa hai khách: giữ khung giấy, xoá nội dung, khoá nút CHI TIẾT. */
  clear() {
    this.customer = undefined;
    this.revealed = false;
    this.zoomEl?.remove();
    gsap.killTweensOf([this.body, this.stamp]);
    gsap.set(this.body, { opacity: 1, y: 0 });
    gsap.set(this.stamp, { opacity: 0 });
    this.nameText.textContent = 'Đang chờ khách…';
    this.nameText.setAttribute('fill', P.inkSoft);
    this.nameText.setAttribute('font-weight', '700');
    this.nameText.setAttribute('opacity', '.6');
    this.note.style.display = 'none';
    // V2-17: chưa có khách thì ẩn luôn nhãn "khách đưa:" (giữ chỗ, không giật bố cục)
    this.budgetLbl.style.visibility = 'hidden';
    this.askBtn.style.display = 'none';
    for (const r of Object.values(this.rows)) {
      r.row.setAttribute('opacity', '0.5');
      r.band.setAttribute('width', '0');
      r.mark.textContent = '';
    }
    this.update(null);
    this.more.setAttribute('opacity', '.4');
    this.more.style.cursor = 'default';
    this.g.style.cursor = 'default';
    this.g.setAttribute('data-empty', '1');
  }

  show(c: Customer, revealed: boolean) {
    this.customer = c;
    this.revealed = revealed || c.order.clarity === 1;
    this.nameText.textContent = c.name;
    this.nameText.setAttribute('fill', P.ink);
    this.nameText.setAttribute('font-weight', '800');
    this.nameText.removeAttribute('opacity');
    this.note.style.display = '';
    this.budgetLbl.style.visibility = '';
    this.more.removeAttribute('opacity');
    this.more.style.cursor = 'pointer';
    this.g.style.cursor = 'zoom-in';
    this.g.removeAttribute('data-empty');
    this.budgetText.textContent = c.order.special === 'me' ? 'tình iu' : `${c.budget}k`;
    if (c.order.special === 'me') this.budgetText.setAttribute('font-size', '9.5');
    else this.budgetText.setAttribute('font-size', '10.5');
    this.fitNote();
    gsap.killTweensOf(this.stamp);
    gsap.set(this.stamp, { opacity: 0 });
    this.layoutBands();
    this.askBtn.style.display = 'none';
    // giấy đứng yên, chỉ chữ + thanh nhá xuống nhẹ
    gsap.fromTo(this.body, { y: -6, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
  }

  reveal() {
    this.revealed = true;
    this.askBtn.style.display = 'none';
    this.layoutBands();
    for (const r of Object.values(this.rows)) gsap.fromTo(r.band, { scaleX: 0.2, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.3, ease: 'back.out(2)' });
  }

  get isRevealed() {
    return this.revealed;
  }

  private layoutBands() {
    const t = this.customer!.order.target;
    for (const k of ['t', 'm', 'n', 'k', 'd'] as const) {
      const r = this.rows[k];
      const n = k === 'd' ? 15 : 10;
      const cw = BAR_W / n;
      let lo: number, hi: number;
      let used = true;
      if (k === 'd') {
        const md = t.maxDoc ?? 9;
        lo = 0; hi = md;
      } else if (t[k]) {
        [lo, hi] = t[k]!;
      } else {
        used = false; lo = 0; hi = 0;
      }
      r.row.setAttribute('opacity', used ? '1' : '0.38');
      if (!used) {
        r.band.setAttribute('width', '0');
        r.mark.textContent = '';
        continue;
      }
      const fuzzy = !this.revealed && k !== 'd';
      const clarity = this.customer!.order.clarity;
      if (fuzzy && clarity === 3) {
        // chỉ biết chỉ số nào quan trọng
        r.band.setAttribute('width', String(BAR_W + 3));
        r.band.setAttribute('x', String(BAR_X - 1.5));
        r.band.setAttribute('fill', '#FFF3B0');
        r.band.setAttribute('stroke-dasharray', '3 3');
        r.mark.textContent = '?';
        continue;
      }
      const pad = fuzzy ? 1 : 0;
      // giá trị v tô ô 0..v-1 → vùng đạt [lo,hi] là ô lo-1..hi-1 (hàng Độc lo=0 → đúng md ô)
      const a = Math.max(0, lo - 1 - pad), b = Math.min(n, hi + pad);
      r.band.setAttribute('x', String(BAR_X + a * cw - 1.5));
      r.band.setAttribute('width', String((b - a) * cw + 3));
      r.band.setAttribute('fill', k === 'd' ? 'none' : fuzzy ? '#E4F7D8' : '#B7F0A0');
      r.band.setAttribute('stroke-dasharray', fuzzy ? '3 3' : '0');
      r.mark.textContent = fuzzy ? '~' : '';
      r.mark.setAttribute('font-size', fuzzy ? '13' : '10');
    }
  }

  /** Cập nhật thanh preview theo chỉ số. */
  update(stats: Stats | null, pulse?: Partial<Record<keyof Stats, number>>) {
    const t = this.customer?.order.target;
    for (const k of ['t', 'm', 'n', 'k', 'd'] as const) {
      const r = this.rows[k];
      const v = stats ? stats[k] : 0;
      const n = k === 'd' ? 15 : 10;
      const range = k === 'd' ? ([0, t?.maxDoc ?? 9] as [number, number]) : t?.[k];
      const ok = range ? distToRange(v, range) === 0 : true;
      r.cells.forEach((c, i) => {
        const filled = i < v;
        let fill = '#fff';
        if (k === 'd') fill = filled ? (i < 5 ? P.green : i < 9 ? P.yellow : i < 14 ? P.red : P.purple) : i < 5 ? '#E6F5DA' : i < 9 ? '#FFF0B8' : i < 14 ? '#FFD0C8' : '#E0C8F5';
        else if (filled) fill = range && !ok && this.revealed ? '#E86A5A' : STAT_META[k].color;
        c.setAttribute('fill', fill);
      });
      if (stats && k !== 'd' && range && this.revealed) r.mark.textContent = ok ? '✓' : v < range[0] ? '↑' : '↓';
      if (stats && k === 'd') r.mark.textContent = v >= 15 ? '!!' : v >= 10 ? '!' : '';
      // mũi tên thiếu/thừa to + đỏ cho dễ thấy (gợi ý "Trắng còn thiếu" của bước 3); dấu khác giữ cỡ nhỏ màu mực
      const arrow = r.mark.textContent === '↑' || r.mark.textContent === '↓';
      r.mark.setAttribute('font-size', arrow ? '14' : r.mark.textContent === '~' ? '13' : '10');
      r.mark.setAttribute('fill', arrow ? P.red : P.ink);
      r.mark.setAttribute('font-family', arrow ? 'Baloo 2' : 'Paytone One');
      r.mark.setAttribute('font-weight', '800');
      if (pulse?.[k]) gsap.fromTo(r.row, { x: pulse[k]! > 0 ? 4 : -4 }, { x: 0, duration: 0.3, ease: 'elastic.out(1,0.35)' });
      void n;
    }
  }

  /** Bản phóng to dễ đọc (HTML). */
  zoom(hud: HTMLElement, stats: Stats | null) {
    hud.querySelector('.ticket-zoom')?.remove();
    const c = this.customer;
    if (!c) return;
    const t = c.order.target;
    const rows = (['t', 'm', 'n', 'k', 'd'] as const).map((k) => {
      const meta = STAT_META[k];
      const n = k === 'd' ? 15 : 10;
      const range = k === 'd' ? ([0, t.maxDoc ?? 9] as [number, number]) : t[k];
      const used = k === 'd' || !!t[k];
      const v = stats ? stats[k] : 0;
      const showBand = used && (this.revealed || k === 'd' || c.order.clarity === 2);
      const fuzzy = !this.revealed && k !== 'd';
      const cells = Array.from({ length: n }, (_, i) => {
        const inBand = range && showBand && (fuzzy ? i >= range[0] - 2 && i <= range[1] : i >= range[0] - 1 && i <= range[1] - 1);
        const filled = i < v;
        let bg = '#fff';
        if (k === 'd') bg = filled ? (i < 5 ? P.green : i < 9 ? P.yellow : i < 14 ? P.red : P.purple) : '#f1ebe0';
        else if (filled) bg = meta.color;
        return `<i class="${inBand ? 'band' : ''} ${fuzzy && inBand ? 'fz' : ''}" style="background:${bg}"></i>`;
      }).join('');
      const goal = !used ? 'không cần' : k === 'd' ? `tối đa ${range![1]}` : showBand ? (fuzzy ? `khoảng ${range![0]}–${range![1]}` : `${range![0]}–${range![1]}`) : '???';
      return `<div class="tz-row ${used ? '' : 'off'}"><svg viewBox="-10 -10 20 20" width="26" height="26">${statIcon(meta.icon, meta.color)}</svg><span class="tz-l">${meta.label}</span><div class="tz-bar">${cells}</div><b>${v}</b><small>${goal}</small></div>`;
    }).join('');
    const d = document.createElement('div');
    d.className = 'ticket-zoom';
    d.innerHTML = `<button class="tz-x" aria-label="Đóng"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M4 4 L16 16 M16 4 L4 16" stroke="#2A1A16" stroke-width="3.2" stroke-linecap="round"/></svg></button><div class="tz-h">${c.name} <em>${c.order.special === 'me' ? 'tình iu' : c.budget + 'k'}</em></div>${rows}<div class="tz-foot">Vạch xanh = khách muốn. Thanh màu = mẻ hiện tại. Độc ≥10 là kích ứng, ≥15 nổ thau.</div>`;
    hud.appendChild(d);
    this.zoomEl = d;
    gsap.fromTo(d, { scale: 0.3, x: -120, y: -60, opacity: 0, rotation: -6 }, { scale: 1, x: 0, y: 0, opacity: 1, rotation: -1, duration: 0.3, ease: 'back.out(1.8)' });
    const close = () => gsap.to(d, { scale: 0.3, x: -120, y: -60, opacity: 0, duration: 0.2, onComplete: () => d.remove() });
    d.querySelector('.tz-x')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); close(); });
    // chạm ra ngoài cũng đóng
    const outside = (e: PointerEvent) => { if (!d.contains(e.target as Node)) { window.removeEventListener('pointerdown', outside, true); close(); } };
    window.setTimeout(() => window.addEventListener('pointerdown', outside, true), 0);
  }

  stampLocked() {
    gsap.fromTo(this.stamp, { opacity: 0, scale: 2.2, transformOrigin: '0 0' }, { opacity: 0.9, scale: 1, duration: 0.18, ease: 'power4.in' });
  }

  center() {
    return { x: X + W / 2, y: Y + H / 2 };
  }
}
