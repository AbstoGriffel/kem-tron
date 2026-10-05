import { gsap } from 'gsap';
import { ICONS } from '../art/icons';
import { el, P } from '../art/kit';
import { moneyTin } from '../art/props';
import { BASES, INGREDIENTS } from '../core/db';
import { loadJSON, saveJSON } from '../core/storage';
import type { SaveState } from '../core/state';
import { toStage } from './stage';

/** Tab ngăn kéo: cốt kem / rau củ (đồ ăn được) / hoá chất (đồ tạp hoá, hàng mạng, hàng sỉ). */
export type Tab = 'cot' | 'rau' | 'hoa';
const TAB_LABEL: Record<Tab, string> = { cot: 'CỐT KEM', rau: 'RAU CỦ', hoa: 'HÓA CHẤT' };
const TAB_COLOR: Record<Tab, string> = { cot: '#FFF6EE', rau: P.yellow, hoa: '#B9D8FF' };
const RAU = new Set(['dua_leo', 'ca_chua', 'nha_dam', 'tra_xanh', 'nghe', 'chanh', 'mat_ong', 'bot_gao', 'nuoc_vo_gao', 'trung']);
export const tabOfIng = (id: string): Tab => (BASES.some((b) => b.id === id) ? 'cot' : RAU.has(id) ? 'rau' : 'hoa');

/** Vùng lưới (toạ độ zone-bottom = toạ độ thiết kế). */
const GX = 138, GY = 610, GW = 242, GH = 128;
const PREF_KEY = 'kem-tron.roomy';

export const roomyPref = { get: () => loadJSON(PREF_KEY, false), set: (v: boolean) => saveJSON(PREF_KEY, v) };

export class Drawer {
  g: SVGGElement;
  private tabsG: SVGGElement;
  private gridClip: SVGGElement;
  private grid: SVGGElement;
  private storage: SVGGElement;
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
    const frame = el('g');
    const sy = GY + GH + 10, sh = 832 - sy;
    frame.innerHTML = `
      <rect x="${GX - 4}" y="${GY - 4}" width="${GW + 8}" height="${GH + 8}" rx="8" fill="#5E361E"/>
      <!-- ngăn kệ đồ: lòng ngăn tối + gờ kệ sáng ở đáy để đặt đồ -->
      <rect x="${GX - 4}" y="${sy}" width="${GW + 8}" height="${sh}" rx="10" fill="#5E361E"/>
      <path d="M ${GX - 4} ${sy + 12} Q ${GX - 4} ${sy} ${GX + 8} ${sy} H ${GX + GW - 8} Q ${GX + GW + 4} ${sy} ${GX + GW + 4} ${sy + 12}" fill="none" stroke="#3E2414" stroke-width="3" opacity=".6"/>
      <rect x="${GX - 4}" y="${sy + sh - 30}" width="${GW + 8}" height="30" rx="8" fill="#8E5A36"/>
      <path d="M ${GX - 4} ${sy + sh - 30} H ${GX + GW + 4}" stroke="#A86E46" stroke-width="3"/>`;
    this.g.appendChild(frame);
    this.tabsG = el('g');
    const defs = el('defs');
    defs.innerHTML = `<clipPath id="clip-grid"><rect x="${GX}" y="${GY}" width="${GW}" height="${GH}" rx="4"/></clipPath>`;
    this.gridClip = el('g', { 'clip-path': 'url(#clip-grid)' });
    const hit = el('rect', { x: GX, y: GY, width: GW, height: GH, fill: 'transparent' });
    this.grid = el('g');
    this.gridClip.append(hit, this.grid);
    this.storage = el('g');
    this.g.append(defs, this.tabsG, this.gridClip, this.storage);
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
    tabs.forEach((t, i) => {
      const on = t === this.tab;
      const x = GX - 2 + i * 82;
      const tg = el('g', { transform: `translate(${x} ${GY - 26})`, style: 'cursor:pointer' });
      tg.innerHTML = `<path d="M 0 24 L 5 3 Q 6 0 10 0 H 70 Q 74 0 75 3 L 80 24 Z" fill="${on ? TAB_COLOR[t] : '#9C6A47'}" stroke="${P.ink}" stroke-width="2.4"/>
        <text x="40" y="17" font-family="Paytone One" font-size="12" fill="${on ? P.ink : '#F3D9BF'}" text-anchor="middle">${TAB_LABEL[t]}</text>`;
      tg.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.tab === t) return;
        this.tab = t;
        this.scrollX = 0;
        this.renderTabs();
        this.renderGrid(true);
      });
      this.tabsG.appendChild(tg);
    });
  }

  private items() {
    const s = this.s;
    const has = (id: string) => (s.stock[id] ?? 0) > 0 || this.selectedBase === id;
    if (this.tab === 'cot') return BASES.filter((b) => b.unlockDay <= s.day && (!b.fake || this.flags.si) && has(b.id)).map((b) => ({ id: b.id, name: b.name, fake: !!b.fake, base: true }));
    return INGREDIENTS.filter((i) => i.unlockDay <= s.day && tabOfIng(i.id) === this.tab && has(i.id)).map((i) => ({ id: i.id, name: i.name, fake: !!i.fake, base: false }));
  }

  /** Ô gọn (2 hàng) / rộng rãi (1 hàng có tên). Cột cuối lấp ló ở mép để biết cuộn được. */
  private cellGeom() {
    return this.roomy ? { cw: 76, ch: 120, gap: 8, rows: 1, icon: 62 } : { cw: 56, ch: 58, gap: 7, rows: 2, icon: 48 };
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

  private renderGrid(anim = false) {
    const s = this.s;
    const list = this.items();
    const { cw, ch, gap, rows, icon } = this.cellGeom();
    const cols = Math.max(Math.ceil(list.length / rows), Math.ceil(GW / (cw + gap)));
    this.maxScroll = Math.max(0, cols * (cw + gap) + 4 - GW);
    this.scrollX = Math.min(this.scrollX, this.maxScroll);
    this.grid.innerHTML = '';
    if (!list.length) {
      // ngăn trống: không vẽ ô, chỉ 2 dòng chữ căn giữa
      this.maxScroll = 0;
      this.scrollX = 0;
      const cx = GX + GW / 2, cy = GY + GH / 2;
      this.grid.innerHTML = `<text x="${cx}" y="${cy - 4}" font-family="Paytone One" font-size="14" fill="#FFF4DC" text-anchor="middle">Hết sạch rồi!</text>
        <text x="${cx}" y="${cy + 15}" font-family="Baloo 2" font-weight="700" font-size="11.5" fill="#F3D9BF" text-anchor="middle">Bấm điện thoại để gọi mối nhập thêm</text>`;
      gsap.set(this.grid, { x: 0 });
      return;
    }
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const k = c * rows + r;
      const it = list[k];
      const x = GX + 4 + c * (cw + gap), y = GY + 4 + r * (ch + gap);
      const cell = el('g', { transform: `translate(${x} ${y})` });
      const sel = !!it && it.base && this.selectedBase === it.id;
      // viền nằm TRONG ô để nội dung không mất pixel ở mép
      cell.innerHTML = `<rect x="1.25" y="1.25" width="${cw - 2.5}" height="${ch - 2.5}" rx="7" fill="${sel ? P.yellow : '#8E5A36'}" stroke="${sel ? P.ink : '#4A2A16'}" stroke-width="2.5"/>
        <path d="M 5 ${ch - (this.roomy ? 30 : 13)} H ${cw - 5}" stroke="${sel ? P.yellowDark : '#A86E46'}" stroke-width="2"/>`;
      if (it) {
        const n = s.stock[it.id] ?? 0;
        cell.innerHTML += `<svg x="${(cw - icon) / 2}" y="${this.roomy ? 8 : 3}" width="${icon}" height="${icon}" viewBox="0 0 80 80" opacity="${n ? 1 : 0.32}">${ICONS[it.id]}</svg>
          ${this.roomy ? `<text x="${cw / 2}" y="${ch - 36}" font-family="Paytone One" font-size="10.5" fill="#FFF4DC" stroke="${P.ink}" stroke-width="2.5" paint-order="stroke" text-anchor="middle">${shortName(it.name)}</text>` : ''}
          ${n ? badge(cw - 11, ch - 11, n) : `<text x="${cw / 2}" y="${ch - 15}" font-family="Paytone One" font-size="12" fill="#FFF4DC" stroke="${P.ink}" stroke-width="2.5" paint-order="stroke" text-anchor="middle" transform="rotate(-8 ${cw / 2} ${ch - 18})">HẾT</text>`}
          ${it.fake ? `<rect x="3" y="3" width="22" height="13" rx="3" fill="${P.purple}" stroke="${P.ink}" stroke-width="1.5"/><text x="14" y="13" font-family="Paytone One" font-size="10" fill="#fff" text-anchor="middle">SỈ</text>` : ''}`;
        cell.dataset.id = it.id;
        cell.dataset.base = it.base ? '1' : '';
        cell.style.cursor = 'grab';
      }
      this.grid.appendChild(cell);
      if (anim && it) gsap.from(cell, { y: '+=12', opacity: 0, duration: 0.2, delay: k * 0.015, ease: 'back.out(2)' });
    }
    gsap.set(this.grid, { x: -this.scrollX });
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
      };
      const up = () => {
        end();
        if (!decided && id) this.firePick(id, isBase, e, false);
        if (decided === 'scroll') {
          this.scrollX = Math.max(0, Math.min(this.maxScroll, this.scrollX));
          gsap.to(this.grid, { x: -this.scrollX, duration: 0.25, ease: 'back.out(1.5)' });
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
    const ph = el('g', { transform: 'translate(214 746)', style: `cursor:pointer;opacity:${this.flags.phone ? 1 : 0.35}` });
    ph.innerHTML = `
      <ellipse cx="32" cy="86" rx="30" ry="6" fill="${P.ink}" opacity=".25"/>
      <path d="M 4 84 L 11 38 H 53 L 60 84 Z" fill="${P.teal}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="32" cy="62" r="16" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2.5"/>
      ${Array.from({ length: 8 }, (_, i) => { const a = -Math.PI * 0.9 + i * 0.27 * Math.PI; return `<circle cx="${32 + Math.cos(a) * 10}" cy="${62 + Math.sin(a) * 10}" r="2.4" fill="${P.ink}"/>`; }).join('')}
      <circle cx="32" cy="62" r="4" fill="${P.teal}" stroke="${P.ink}" stroke-width="1.5"/>
      <g class="handset"><path d="M 0 32 C 0 20 8 16 14 22 H 50 C 56 16 64 20 64 32 C 64 38 54 38 52 32 H 12 C 10 38 0 38 0 32 Z" fill="${P.teal}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/></g>`;
    ph.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.flags.phone) this.onPhone?.(); });
    const book = el('g', { transform: 'translate(288 748) rotate(5)', style: `cursor:pointer;opacity:${this.flags.book ? 1 : 0.35}` });
    book.innerHTML = `
      <path d="M 6 8 L 82 4 L 84 80 L 8 84 Z" fill="${P.ink}" opacity=".25"/>
      <path d="M 2 4 L 78 0 L 80 76 L 4 80 Z" fill="${P.red}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 70 1 L 72 77" stroke="${P.redDark}" stroke-width="5"/>
      <rect x="14" y="16" width="44" height="40" rx="3" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2" transform="rotate(-3 36 36)"/>
      <text x="36" y="33" font-family="Paytone One" font-size="12" fill="${P.red}" text-anchor="middle" transform="rotate(-3 36 36)">BÍ</text>
      <text x="36" y="48" font-family="Paytone One" font-size="12" fill="${P.red}" text-anchor="middle" transform="rotate(-3 36 36)">KÍP</text>
      <path d="M 58 76 l 0 12 l 5 -4 l 5 4 l 0 -12" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2"/>`;
    book.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.flags.book) this.onBook?.(); });
    this.storage.append(ph, book);
  }

  refresh() {
    this.renderGrid();
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

function shortName(n: string) {
  return n.replace('Kem chống nắng', 'KCN').replace(' gói chữ lạ', '').replace('Tinh chất ', '').replace(' không nhãn', ' ??').replace('Lòng trắng ', '').replace('Cốt kem ', '').toUpperCase().slice(0, 12);
}

function badge(x: number, y: number, n: number) {
  return `<g transform="translate(${x} ${y})"><circle r="9" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2"/><text y="3.6" font-family="Paytone One" font-size="10" fill="${P.ink}" text-anchor="middle">${n}</text></g>`;
}
