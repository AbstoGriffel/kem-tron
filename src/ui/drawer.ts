import { gsap } from 'gsap';
import { ICONS } from '../art/icons';
import { el, P } from '../art/kit';
import { moneyTin } from '../art/props';
import { BASES, INGREDIENTS } from '../core/db';
import { loadJSON, saveJSON } from '../core/storage';
import { ECON, type SaveState } from '../core/state';
import { toStage } from './stage';
import { STAT_META, statIcon } from './ticket';

/** Tab ngăn kéo: cốt kem / rau củ (đồ ăn được) / hoá chất (đồ tạp hoá, hàng mạng, hàng sỉ). */
export type Tab = 'cot' | 'rau' | 'hoa';
const TAB_LABEL: Record<Tab, string> = { cot: 'CỐT KEM', rau: 'RAU CỦ', hoa: 'HOÁ CHẤT' };
/** Tab nằm SAU khung hộc tủ (Figma 438:2): phần chìm dưới khung, tab đang chọn vàng + nhô cao hơn. */
const TAB_W = 80, TAB_SINK = 12, TAB_UP = 22, TAB_UP_ON = 27;
const RAU = new Set(['dua_leo', 'ca_chua', 'nha_dam', 'tra_xanh', 'nghe', 'chanh', 'mat_ong', 'bot_gao', 'nuoc_vo_gao', 'trung']);
export const tabOfIng = (id: string): Tab => (BASES.some((b) => b.id === id) ? 'cot' : RAU.has(id) ? 'rau' : 'hoa');

/** Vùng lưới (toạ độ zone-bottom = toạ độ thiết kế). */
const GX = 138, GY = 610, GW = 242, GH = 128;
/** bề rộng dải mờ mép + nút ‹ › của lưới */
const HINT_W = 22;
const PREF_KEY = 'kem-tron.roomy';

export const roomyPref = { get: () => loadJSON(PREF_KEY, false), set: (v: boolean) => saveJSON(PREF_KEY, v) };

export class Drawer {
  g: SVGGElement;
  private tabsG: SVGGElement;
  private tabsHit: SVGGElement;
  private gridClip: SVGGElement;
  private grid: SVGGElement;
  private storage: SVGGElement;
  private hints: SVGGElement;
  tab: Tab = 'rau';
  selectedBase: string | null = null;
  roomy = roomyPref.get();
  onPickBase?: (id: string, e: PointerEvent, pos: { x: number; y: number }) => void;
  onPickIng?: (id: string, e: PointerEvent, pos: { x: number; y: number }) => void;
  onBook?: () => void;
  onPhone?: () => void;
  private s!: SaveState;
  private flags = { book: false, phone: false, si: false };
  private scrollX = 0;
  private maxScroll = 0;

  /** dy = độ lệch zone-bottom → stage */
  constructor(parent: SVGGElement, private dy: number) {
    this.g = el('g', { id: 'drawer-ui' });
    parent.appendChild(this.g);
    // tab vẽ trước khung → khung che đáy tab
    this.tabsG = el('g', { class: 'dr-tabs' });
    this.g.appendChild(this.tabsG);
    const frame = el('g', { id: 'drawer-frame' });
    const sy = GY + GH + 10, sh = 832 - sy;
    frame.innerHTML = `
      <rect x="${GX - 4}" y="${GY - 4}" width="${GW + 8}" height="${GH + 8}" rx="8" fill="#5E361E"/>
      <!-- ngăn kệ đồ: lòng ngăn tối + gờ kệ sáng ở đáy để đặt đồ -->
      <rect x="${GX - 4}" y="${sy}" width="${GW + 8}" height="${sh}" rx="10" fill="#5E361E"/>
      <path d="M ${GX - 4} ${sy + 12} Q ${GX - 4} ${sy} ${GX + 8} ${sy} H ${GX + GW - 8} Q ${GX + GW + 4} ${sy} ${GX + GW + 4} ${sy + 12}" fill="none" stroke="#3E2414" stroke-width="3" opacity=".6"/>
      <rect x="${GX - 4}" y="${sy + sh - 30}" width="${GW + 8}" height="30" rx="8" fill="#8E5A36"/>
      <path d="M ${GX - 4} ${sy + sh - 30} H ${GX + GW + 4}" stroke="#A86E46" stroke-width="3"/>`;
    this.g.appendChild(frame);
    // vùng chạm tab nằm trên khung, chỉ phủ phần tab ló ra (không lấn xuống lưới)
    this.tabsHit = el('g', { class: 'dr-tabs-hit' });
    const defs = el('defs');
    defs.innerHTML = `<clipPath id="clip-grid"><rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" rx="4"/></clipPath>
      <linearGradient id="dr-fade-r" x1="0" x2="1"><stop offset="0" stop-color="#5E361E" stop-opacity="0"/><stop offset="1" stop-color="#5E361E" stop-opacity=".85"/></linearGradient>
      <linearGradient id="dr-fade-l" x1="1" x2="0"><stop offset="0" stop-color="#5E361E" stop-opacity="0"/><stop offset="1" stop-color="#5E361E" stop-opacity=".85"/></linearGradient>`;
    this.gridClip = el('g', { 'clip-path': 'url(#clip-grid)' });
    const hit = el('rect', { x: GX, y: GY, width: GW, height: GH, fill: 'transparent' });
    this.grid = el('g');
    this.gridClip.append(hit, this.grid);
    this.storage = el('g');
    this.hints = el('g', { class: 'dr-hints', style: 'pointer-events:none' });
    this.g.append(defs, this.tabsHit, this.gridClip, this.hints, this.storage);
    this.bindScroll();
  }

  render(s: SaveState, flags: { book: boolean; phone: boolean; si: boolean }) {
    this.s = s;
    this.flags = flags;
    this.renderTabs();
    this.renderGrid();
    this.renderStorage();
  }

  setRoomy(v: boolean) {
    this.roomy = v;
    roomyPref.set(v);
    this.scrollX = 0;
    this.renderGrid(true);
  }

  private renderTabs() {
    const tabs: Tab[] = ['cot', 'rau', 'hoa'];
    this.tabsG.innerHTML = '';
    this.tabsHit.innerHTML = '';
    const top = GY - 4;
    tabs.forEach((t, i) => {
      const on = t === this.tab;
      const x = GX - 2 + i * 82;
      const up = on ? TAB_UP_ON : TAB_UP, h = up + TAB_SINK;
      const tg = el('g', { class: `dr-tab${on ? ' on' : ''}`, 'data-tab': t, transform: `translate(${x} ${top - up})`, style: 'pointer-events:none' });
      tg.innerHTML = `<path d="M 0 ${h} L 5 3 Q 6 0 10 0 H ${TAB_W - 10} Q ${TAB_W - 6} 0 ${TAB_W - 5} 3 L ${TAB_W} ${h} Z" fill="${on ? P.yellow : '#9C6A47'}" stroke="${P.ink}" stroke-width="2.4"/>
        <text x="${TAB_W / 2}" y="${up / 2 + 5}" font-family="Paytone One" font-size="12" fill="${on ? P.ink : '#F3D9BF'}" text-anchor="middle">${TAB_LABEL[t]}</text>`;
      this.tabsG.appendChild(tg);
      const hit = el('rect', { 'data-tab': t, x, y: top - TAB_UP_ON - 4, width: TAB_W, height: TAB_UP_ON + 4, fill: 'transparent', style: 'cursor:pointer' });
      hit.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.tab === t) return;
        this.tab = t;
        this.scrollX = 0;
        this.renderTabs();
        this.renderGrid(true);
      });
      this.tabsHit.appendChild(hit);
    });
  }

  private items() {
    const s = this.s;
    const has = (id: string) => (s.stock[id] ?? 0) > 0 || this.selectedBase === id;
    if (this.tab === 'cot') return BASES.filter((b) => b.unlockDay <= s.day && (!b.fake || this.flags.si) && has(b.id)).map((b) => ({ id: b.id, name: b.name, fake: !!b.fake, base: true }));
    return INGREDIENTS.filter((i) => i.unlockDay <= s.day && tabOfIng(i.id) === this.tab && has(i.id)).map((i) => ({ id: i.id, name: i.name, fake: !!i.fake, base: false }));
  }

  /**
   * Ô gọn (2 hàng × 4 cột) / rộng rãi (1 hàng × 3 cột có tên). Bề ngang ô tính cho số cột vừa khít khung lưới
   * (không còn cột bị cắt mép giả làm dấu cuộn); còn món ngoài khung thì có mũi tên ‹ › + mờ mép (scrollHints).
   */
  private cellGeom() {
    const g = this.roomy ? { cols: 3, ch: 120, gap: 8, rows: 1, icon: 62 } : { cols: 4, ch: 58, gap: 7, rows: 2, icon: 48 };
    // V2-18: còn món ngoài khung (có nút ›) thì chừa chỗ cho nút + mờ mép bên phải → cột cuối nằm trọn bên trái nút
    const pad = this.s && Math.ceil(this.items().length / g.rows) > g.cols ? HINT_W + 4 : 0;
    const cw = (GW - pad - 8 - (g.cols - 1) * g.gap) / g.cols;
    return { ...g, cw, pad, icon: Math.min(g.icon, Math.floor(cw - 4)) };
  }

  /** Toạ độ stage của tâm ô chứa id (hoặc null). */
  cellCenter(id: string): { x: number; y: number } | null {
    const list = this.items();
    const k = list.findIndex((x) => x.id === id);
    if (k < 0) return null;
    const { cw, ch, gap, rows } = this.cellGeom();
    const c = Math.floor(k / rows), r = k % rows;
    return { x: GX + 4 + c * (cw + gap) + cw / 2 - this.scrollX, y: GY + 4 + r * (ch + gap) + ch / 2 + this.dy };
  }

  /** Tab đang mở không có món nào (đang hiện câu ngăn trống). */
  isEmpty() {
    return !!this.s && this.items().length === 0;
  }

  /** Toạ độ stage của chấm đỏ "mới" trên ô id (null nếu ô không có chấm). */
  newDotAt(id: string): { x: number; y: number } | null {
    const c = this.cellCenter(id);
    if (!c || !unseen(this.s, id)) return null;
    const { cw, ch } = this.cellGeom();
    return { x: c.x + cw / 2 - 4, y: c.y - ch / 2 + 4 };
  }

  private renderGrid(anim = false) {
    const s = this.s;
    const list = this.items();
    const { cw, ch, gap, rows, icon, cols: fit, pad } = this.cellGeom();
    const cols = Math.max(Math.ceil(list.length / rows), fit);
    this.maxScroll = Math.max(0, 8 + cols * (cw + gap) - gap - (GW - pad));
    this.scrollX = Math.min(this.scrollX, this.maxScroll);
    // V3-19: có nút › thì khung nhìn lưới cắt ngay sau cột cuối vừa khít (GW − pad) → thẻ kế không hé dải dưới nút ›
    this.g.querySelector('#clip-grid rect')?.setAttribute('width', String(GW - pad));
    this.grid.innerHTML = '';
    if (!list.length) {
      // ngăn trống: không vẽ ô, chỉ 2 dòng chữ căn giữa
      this.maxScroll = 0;
      this.scrollX = 0;
      const cx = GX + GW / 2, cy = GY + GH / 2;
      // R2: chưa có điện thoại thì không bảo bấm điện thoại
      const [l1, l2] = this.flags.phone ? ['Hết sạch rồi!', 'Bấm điện thoại để gọi mối nhập thêm.']
        : [this.tab === 'hoa' ? 'Chưa có hoá chất.' : 'Hết sạch rồi!', ECON.unlocks.phone - s.day === 1 ? 'Ngày mai gọi mối nhập được.' : 'Ráng xài đỡ đồ đang có nha.'];
      this.grid.innerHTML = `<text x="${cx}" y="${cy - 4}" font-family="Paytone One" font-size="14" fill="#FFF4DC" text-anchor="middle">${l1}</text>
        <text x="${cx}" y="${cy + 15}" font-family="Baloo 2" font-weight="700" font-size="11.5" fill="#F3D9BF" text-anchor="middle">${l2}</text>`;
      gsap.set(this.grid, { x: 0 });
      this.scrollHints();
      return;
    }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const k = c * rows + r;
      const it = list[k];
      const x = GX + 4 + c * (cw + gap), y = GY + 4 + r * (ch + gap);
      const cell = el('g', { transform: `translate(${x} ${y})` });
      const sel = !!it && it.base && this.selectedBase === it.id;
      // T16: còn ≤ 2 phần → viền đỏ + số đỏ để biết sắp hết
      const low = !!it && !sel && (s.stock[it.id] ?? 0) > 0 && (s.stock[it.id] ?? 0) <= 2;
      // viền nằm TRONG ô để nội dung không mất pixel ở mép
      cell.innerHTML = `<rect x="1.25" y="1.25" width="${cw - 2.5}" height="${ch - 2.5}" rx="7" fill="${sel ? P.yellow : '#8E5A36'}" stroke="${sel ? P.ink : low ? P.red : '#4A2A16'}" stroke-width="${low ? 3.5 : 2.5}"/>
        <path d="M 5 ${ch - (this.roomy ? 30 : 13)} H ${cw - 5}" stroke="${sel ? P.yellowDark : '#A86E46'}" stroke-width="2"/>`;
      if (it) {
        const n = s.stock[it.id] ?? 0;
        cell.innerHTML += `<svg x="${(cw - icon) / 2}" y="${this.roomy ? 8 : 3}" width="${icon}" height="${icon}" viewBox="0 0 80 80" opacity="${n ? 1 : 0.32}">${ICONS[it.id]}</svg>
          ${this.roomy ? `<text class="dr-name" x="${cw / 2}" y="${ch - 36}" font-family="Paytone One" font-size="10.5" fill="#FFF4DC" stroke="${P.ink}" stroke-width="2.5" paint-order="stroke" text-anchor="middle">${shortName(it.id, it.name)}</text>` : ''}
          ${n ? badge(cw - 11, ch - 11, n, n <= 2 && !sel) : `<text x="${cw / 2}" y="${ch - 15}" font-family="Paytone One" font-size="12" fill="#FFF4DC" stroke="${P.ink}" stroke-width="2.5" paint-order="stroke" text-anchor="middle" transform="rotate(-8 ${cw / 2} ${ch - 18})">HẾT</text>`}
          ${it.fake ? `<g transform="translate(${this.roomy ? cw - 28 : 0} 0)"><rect x="3" y="3" width="22" height="13" rx="3" fill="${P.purple}" stroke="${P.ink}" stroke-width="1.5"/><text x="14" y="13" font-family="Paytone One" font-size="10" fill="#fff" text-anchor="middle">SỈ</text></g>` : ''}
          ${this.roomy ? mainStatIcon(it.id) : ''}
          ${unseen(s, it.id) ? `<circle class="new-dot" cx="${cw - 4}" cy="4" r="6" fill="${P.red}" stroke="${P.white}" stroke-width="2"/>` : ''}`;
        cell.dataset.id = it.id;
        cell.dataset.base = it.base ? '1' : '';
        cell.style.cursor = 'grab';
      }
      this.grid.appendChild(cell);
      // tên dài hơn ô thì ép vừa bề ngang ô (không tràn qua viền)
      const nm = cell.querySelector('.dr-name') as SVGTextElement | null;
      if (nm && nm.getComputedTextLength() > cw - 8) {
        nm.setAttribute('textLength', String(cw - 8));
        nm.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
      if (anim && it) gsap.from(cell, { y: '+=12', opacity: 0, duration: 0.2, delay: k * 0.015, ease: 'back.out(2)' });
    }
    gsap.set(this.grid, { x: -this.scrollX });
    this.scrollHints();
  }

  /** R4: còn món ngoài khung lưới → mũi tên ‹ / › trên nền mờ ở mép tương ứng (không bắt chạm). */
  private scrollHints() {
    this.hints.innerHTML = '';
    if (this.maxScroll <= 0) return;
    const y = GY + GH / 2, more = (left: boolean) => {
      const x = left ? GX : GX + GW;
      const k = left ? 1 : -1;
      return `<rect x="${left ? GX : GX + GW - 22}" y="${GY}" width="22" height="${GH}" fill="url(#dr-fade-${left ? 'l' : 'r'})"/>
        <g transform="translate(${x + k * 11} ${y})"><circle r="10" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2"/>
        <path d="M ${k * 2.5} -5 L ${-k * 2.5} 0 L ${k * 2.5} 5" fill="none" stroke="${P.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    };
    this.hints.innerHTML = (this.scrollX > 2 ? more(true) : '') + (this.scrollX < this.maxScroll - 2 ? more(false) : '');
  }

  /** Kéo ngang → cuộn lưới; kéo dọc hoặc chạm → nhặt nguyên liệu. */
  private bindScroll() {
    this.gridClip.addEventListener('pointerdown', (e) => {
      const cell = (e.target as Element).closest('g[data-id]') as SVGGElement | null;
      const p0 = toStage(e.clientX, e.clientY);
      const sx0 = this.scrollX;
      let decided: 'scroll' | 'pick' | null = null;
      const id = cell?.dataset.id;
      const isBase = cell?.dataset.base === '1';
      e.stopPropagation();
      const end = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      const move = (ev: PointerEvent) => {
        const p = toStage(ev.clientX, ev.clientY);
        const dx = p.x - p0.x, dy = p.y - p0.y;
        if (!decided) {
          if (Math.hypot(dx, dy) < 7) return;
          decided = Math.abs(dx) > Math.abs(dy) * 1.2 && this.maxScroll > 0 ? 'scroll' : 'pick';
          if (decided === 'pick') {
            end();
            if (id) this.firePick(id, isBase, e, true);
            return;
          }
        }
        this.scrollX = Math.max(-20, Math.min(this.maxScroll + 20, sx0 - dx));
        gsap.set(this.grid, { x: -this.scrollX });
        this.scrollHints();
      };
      const up = () => {
        end();
        if (!decided && id) this.firePick(id, isBase, e, false);
        if (decided === 'scroll') {
          this.scrollX = Math.max(0, Math.min(this.maxScroll, this.scrollX));
          gsap.to(this.grid, { x: -this.scrollX, duration: 0.25, ease: 'back.out(1.5)' });
          this.scrollHints();
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  /** dragging=true: đang kéo (bắt đầu drag ngay); false: chỉ chạm (xem thẻ / chọn cốt). */
  onTapIng?: (id: string) => void;
  private firePick(id: string, isBase: boolean, e: PointerEvent, dragging: boolean) {
    const c = this.cellCenter(id) ?? { x: 200, y: 680 + this.dy };
    if (!dragging) this.onTapIng?.(id);
    else if (isBase) this.onPickBase?.(id, e, { x: c.x, y: c.y - 6 });
    else this.onPickIng?.(id, e, { x: c.x, y: c.y - 6 });
  }

  /** Hàng đồ dưới cùng: hộp bánh quy đựng tiền, điện thoại bàn, sổ bí kíp. */
  private renderStorage() {
    this.storage.innerHTML = '';
    const tin = el('g');
    tin.innerHTML = moneyTin();
    this.storage.appendChild(tin);
    // R2: chưa mở khoá thì không vẽ (không làm mờ). V3-25: chỗ đó đặt đồ lặt vặt KHÔNG bấm được (khăn lau, chai nước)
    // để hàng dưới không trống trơn như thiếu món — không viền đứt, không gợi ý ô trống.
    if (!this.flags.phone) {
      const towel = el('g', { class: 'st-deco', transform: 'translate(246 806)', style: 'pointer-events:none' });
      towel.innerHTML = `
        <ellipse cx="0" cy="16" rx="32" ry="5" fill="${P.ink}" opacity=".2"/>
        <path d="M -30 -4 Q -31 -12 -22 -12 H 24 Q 31 -12 30 -4 L 28 12 Q 27 16 22 16 H -24 Q -29 16 -29 12 Z" fill="#EAF3F8" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M -27 -3 H 27 M -28 5 H 28" stroke="${P.blue}" stroke-width="3" opacity=".75"/>
        <path d="M -12 -12 V 16 M 6 -12 V 16" stroke="${P.blue}" stroke-width="2" opacity=".45"/>
        <path d="M 30 -4 Q 36 2 28 10" fill="none" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>`;
      this.storage.append(towel);
    }
    if (!this.flags.book) {
      const bottle = el('g', { class: 'st-deco', transform: 'translate(322 796) rotate(4)', style: 'pointer-events:none' });
      bottle.innerHTML = `
        <ellipse cx="0" cy="30" rx="18" ry="4.5" fill="${P.ink}" opacity=".2"/>
        <rect x="-6" y="-31" width="12" height="9" rx="2" fill="${P.blue}" stroke="${P.ink}" stroke-width="2.2"/>
        <path d="M -6 -22 Q -14 -18 -14 -8 V 24 Q -14 30 -8 30 H 8 Q 14 30 14 24 V -8 Q 14 -18 6 -22 Z" fill="#D7F1F6" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="-14" y="0" width="28" height="13" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2"/>
        <path d="M -8 -12 V -4 M -8 18 V 24" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
      this.storage.append(bottle);
    }
    if (this.flags.phone) {
      const ph = el('g', { class: 'st-phone', transform: 'translate(214 746)', style: 'cursor:pointer' });
      ph.innerHTML = `
        <ellipse cx="32" cy="86" rx="30" ry="6" fill="${P.ink}" opacity=".25"/>
        <path d="M 4 84 L 11 38 H 53 L 60 84 Z" fill="${P.teal}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
        <circle cx="32" cy="62" r="16" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2.5"/>
        ${Array.from({ length: 8 }, (_, i) => { const a = -Math.PI * 0.9 + i * 0.27 * Math.PI; return `<circle cx="${32 + Math.cos(a) * 10}" cy="${62 + Math.sin(a) * 10}" r="2.4" fill="${P.ink}"/>`; }).join('')}
        <circle cx="32" cy="62" r="4" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.5"/>
        <g class="handset"><path d="M 0 32 C 0 20 8 16 14 22 H 50 C 56 16 64 20 64 32 C 64 38 54 38 52 32 H 12 C 10 38 0 38 0 32 Z" fill="${P.teal}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/></g>`;
      ph.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onPhone?.(); });
      this.storage.append(ph);
    }
    if (this.flags.book) {
      // V3-07: sổ nhích lên 6px + dải bookmark ngắn lại → đáy bookmark nằm trên viền trong khung ngăn (≈ 830 < 832)
      const book = el('g', { class: 'st-book', transform: 'translate(288 742) rotate(5)', style: 'cursor:pointer' });
      book.innerHTML = `
        <path d="M 6 8 L 82 4 L 84 80 L 8 84 Z" fill="${P.ink}" opacity=".25"/>
        <path d="M 2 4 L 78 0 L 80 76 L 4 80 Z" fill="${P.red}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M 70 1 L 72 77" stroke="${P.redDark}" stroke-width="5"/>
        <rect x="14" y="16" width="44" height="40" rx="3" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2" transform="rotate(-3 36 36)"/>
        <text x="36" y="33" font-family="Paytone One" font-size="12" fill="${P.red}" text-anchor="middle" transform="rotate(-3 36 36)">BÍ</text>
        <text x="36" y="48" font-family="Paytone One" font-size="12" fill="${P.red}" text-anchor="middle" transform="rotate(-3 36 36)">KÍP</text>
        <path d="M 58 76 l 0 7 l 5 -3 l 5 3 l 0 -7" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2"/>`;
      book.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBook?.(); });
      this.storage.append(book);
    }
  }

  refresh() {
    this.renderGrid();
  }

  /** T17: điện thoại bàn sáng lên (vòng sáng nhấp nháy) khi kho không làm nổi đơn. */
  glowPhone(on: boolean) {
    this.storage.querySelector('.ph-glow')?.remove();
    if (!on) return;
    const g = el('g', { class: 'ph-glow', style: 'pointer-events:none' });
    g.innerHTML = `<ellipse cx="246" cy="802" rx="44" ry="32" fill="#FFF3B0" opacity=".55"/><ellipse cx="246" cy="802" rx="44" ry="32" fill="none" stroke="${P.yellow}" stroke-width="5"/>`;
    this.storage.insertBefore(g, this.storage.firstChild);
    gsap.fromTo(g, { opacity: 0.25 }, { opacity: 1, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  /** Ngày mở khoá: điện thoại / sổ nảy lên tại chỗ (bọc <g> trong để giữ translate). */
  popIn(which: 'phone' | 'book', delay = 0) {
    const g = this.storage.querySelector(which === 'phone' ? '.st-phone' : '.st-book');
    if (!g) return;
    const inner = el('g');
    while (g.firstChild) inner.appendChild(g.firstChild);
    g.appendChild(inner);
    gsap.fromTo(inner, { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.6, delay, ease: 'back.out(2.2)' });
  }

  ringPhone(on: boolean) {
    const hs = this.storage.querySelector('.handset');
    if (!hs) return;
    gsap.killTweensOf(hs);
    if (on) gsap.to(hs, { y: -4, rotation: 4, duration: 0.06, yoyo: true, repeat: -1, transformOrigin: '50% 100%' });
    else gsap.set(hs, { y: 0, rotation: 0 });
  }

  setTab(t: Tab) {
    if (t === this.tab) return;
    this.tab = t;
    this.scrollX = 0;
    this.renderTabs();
    this.renderGrid(true);
  }

  showTabOf(id: string) {
    const t = tabOfIng(id);
    if (t === this.tab) return;
    this.tab = t;
    this.scrollX = 0;
    this.renderTabs();
    this.renderGrid();
  }

  /** Toạ độ stage của điện thoại bàn (cho gợi ý). */
  phonePos() {
    return { x: 246, y: 790 + this.dy };
  }
}

/** Tên ngắn trên ô rộng rãi: đặt tay cho món tên dài (không cắt cứng giữa chữ), còn lại rút theo luật cũ. */
const SHORT: Record<string, string> = {
  kem_tron: 'Kem trơn', sua_duong: 'Sữa dưỡng', sap_ne: 'Sáp ẩm', gel_nha_dam: 'Gel nha đam', kem_thung: 'Kem thùng', tra_xanh: 'Trà xanh',
  nuoc_vo_gao: 'Nước vo gạo', kem_danh_rang: 'Kem đ.răng', dat_set: 'Đất sét', kcn_xin: 'KCN xách tay', kcn_dom: 'Sun Pờ-rồ',
  bot_bat_tong: 'Bật Tông', bot_trang_dom: 'Bột trắng ??', collagen_dom: 'Collagen',
};
function shortName(id: string, n: string) {
  return (SHORT[id] ?? n.replace('Tinh chất ', '').replace('Lòng trắng ', '').replace('Cốt kem ', '')).toUpperCase();
}

/** T12: món chưa từng chạm xem thẻ → chấm đỏ kiểu "mới", chạm 1 lần là tắt. */
export const unseen = (s: SaveState, id: string) => !s.tutorialSeen.includes(`seen:${id}`);

/** Q10: chế độ ô rộng rãi — 1 icon chỉ số nổi bật nhất của món ở góc trên. */
function mainStatIcon(id: string) {
  const def = INGREDIENTS.find((i) => i.id === id) ?? BASES.find((b) => b.id === id);
  if (!def) return '';
  const st = def.stats as Record<string, number>;
  let best: 't' | 'm' | 'n' | 'k' | 'd' | null = null;
  for (const k of ['t', 'm', 'n', 'k'] as const) if (st[k] > 0 && (!best || st[k] > st[best])) best = k;
  if (!best) best = st.d > 0 ? 'd' : null;
  if (!best) return '';
  const m = STAT_META[best];
  return `<g transform="translate(15 15)"><circle r="11" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2"/><g transform="scale(.82)">${statIcon(m.icon, m.color)}</g></g>`;
}

function badge(x: number, y: number, n: number, low = false) {
  return `<g transform="translate(${x} ${y})"><circle r="9" fill="${low ? P.red : P.paperHi}" stroke="${P.ink}" stroke-width="2"/><text y="3.6" font-family="Paytone One" font-size="10" fill="${low ? P.white : P.ink}" text-anchor="middle">${n}</text></g>`;
}
