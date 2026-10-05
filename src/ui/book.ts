import { gsap } from 'gsap';
import { ICONS } from '../art/icons';
import { P } from '../art/kit';
import { base as getBase, ing } from '../core/db';
import { hasStockFor } from '../core/day';
import type { BowlItem } from '../core/types';
import '../styles/book-phone.css';
import { sfx } from './audio';
import type { Game } from './game';
import { jarSvg } from './jar';
import { STAT_META } from './ticket';

/** Mũi tên lật trang: tam giác viền mực + 1 vệt sáng, vẽ hướng phải rồi lật bằng scale(-1). */
const arrowSvg = (dir: -1 | 1) => `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
  <g transform="${dir < 0 ? 'translate(32 0) scale(-1 1)' : ''}">
    <path d="M10 6.5 L25 16 L10 25.5 Z" fill="${P.blue}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M13 11.5 L13 15" stroke="${P.white}" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
  </g></svg>`;

const SWIPE_MIN = 40;

/** Bút chì nhỏ cạnh tên: báo hiệu chạm để đổi tên. */
const PEN = `<svg class="bk-pen" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M3 17 L4.2 12.6 L13.4 3.4 L16.6 6.6 L7.4 15.8 Z" fill="${P.yellow}" stroke="${P.ink}" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 17 L4.2 12.6 L7.4 15.8 Z" fill="${P.ink}"/><path d="M11.6 5.2 L14.8 8.4" stroke="${P.ink}" stroke-width="1.6"/></svg>`;

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Nhãn decal hồng in đúng tên hũ (tự ngắt 2 dòng). */
function nameLabel(name: string): string {
  const w = name.toUpperCase().split(' ');
  const cut = Math.max(1, Math.floor(w.length / 2));
  const l1 = esc(w.slice(0, cut).join(' ')), l2 = esc(w.slice(cut).join(' '));
  const fs = Math.min(6, 36 / Math.max(6, Math.max(l1.length, l2.length) * 0.66));
  return `<g><rect x="19" y="42" width="42" height="18" rx="9" fill="${P.pink}" stroke="${P.ink}" stroke-width="1.8"/>
    <text x="40" y="${l2 ? 50 : 53}" font-family="Paytone One" font-size="${fs.toFixed(2)}" fill="#fff" text-anchor="middle">${l1}</text>
    ${l2 ? `<text x="40" y="57.5" font-family="Paytone One" font-size="${fs.toFixed(2)}" fill="${P.ink}" text-anchor="middle">${l2}</text>` : ''}
    <path d="M 24 46 l 3 0" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`;
}

/** Sổ bí kíp gia truyền: lật trang (nút góc dưới hoặc vuốt ngang), đổ nhanh nếu đủ hàng. */
export function openBook(g: Game, onPick: (r: { base: string; items: BowlItem[]; heated: boolean }) => void) {
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'book-modal bk2';
  root.innerHTML = `
    <div class="bk-stage">
      <div class="book"></div>
      <button class="bk-turn prev" aria-label="Trang trước">${arrowSvg(-1)}</button>
      <button class="bk-turn next" aria-label="Trang sau">${arrowSvg(1)}</button>
    </div>
    <button class="bk-x">Đóng sổ</button>`;
  g.modal.appendChild(root);
  const book = root.querySelector('.book') as HTMLElement;
  const prevBtn = root.querySelector('.bk-turn.prev') as HTMLButtonElement;
  const nextBtn = root.querySelector('.bk-turn.next') as HTMLButtonElement;
  let page = 0;
  let busy = false;
  const total = () => s.recipes.length;

  const close = () => gsap.to(root, { opacity: 0, duration: 0.2, onComplete: () => root.remove() });

  const pagesHtml = (i: number) => {
    const r = s.recipes[i];
    if (!r) {
      return `<div class="bk-top bk-empty"><div class="bk-h">BÍ KÍP GIA TRUYỀN</div><p>Sổ còn trắng tinh. Lúc đóng hũ, tick ô <b>"Ghi vô bí kíp"</b> để lưu công thức. Lần sau trộn nhanh 1 chạm, đơn online cũng lấy công thức từ đây.</p></div>
        <div class="bk-bot bk-empty"><p class="bk-gen">Đời thứ 1: hôm qua.<br/>Đời thứ 2: hôm nay.<br/>Đời thứ 3: bạn.</p></div>`;
    }
    const ok = hasStockFor(s, r.base, r.items.map((x) => x.id));
    // mỗi món 1 thẻ (gộp trùng id + cách sơ chế), cốt kem đứng đầu
    const cards: { id: string; proc: string; n: number }[] = [{ id: r.base, proc: 'raw', n: 1 }];
    for (const it of r.items) {
      const c = cards.find((x) => x.id === it.id && x.proc === it.proc);
      if (c) c.n++; else cards.push({ id: it.id, proc: it.proc, n: 1 });
    }
    const need = new Map<string, number>();
    for (const c of cards) need.set(c.id, (need.get(c.id) ?? 0) + c.n);
    const cardHtml = cards.map((c) => {
      const name = c.id === r.base ? getBase(c.id).name : ing(c.id).name;
      const lack = (s.stock[c.id] ?? 0) < (need.get(c.id) ?? 0);
      return `<div class="bk-card${lack ? ' lack' : ''}"><svg viewBox="0 0 80 80" width="64" height="64">${ICONS[c.id]}</svg><b>${name}</b>${c.proc !== 'raw' ? `<small>(${c.proc === 'nghien' ? 'nghiền' : 'xay'})</small>` : ''}<i>${c.n}</i></div>`;
    }).join('');
    const bars = (['t', 'm', 'n', 'k', 'd'] as const).map((k) => `<div class="bk-bar"><span>${STAT_META[k].label}</span><i style="--w:${Math.min(100, (r.stats[k] / (k === 'd' ? 15 : 10)) * 100)}%;--c:${STAT_META[k].color}"></i><b>${r.stats[k]}</b></div>`).join('');
    return `
      <div class="bk-top">
        <div class="bk-head"><button class="bk-name" aria-label="Đổi tên"><span>${esc(r.name)}</span>${PEN}</button><span class="bk-no">#${i + 1}/${total()}</span></div>
        <div class="bk-body">
          <div class="bk-jar"><svg viewBox="0 0 80 80" width="114" height="114">${jarSvg('thuy_tinh', r.color, null)}${nameLabel(r.name)}</svg><div class="bk-sold">Bán online: ${r.sold} hũ</div></div>
          <div class="bk-bars">${bars}</div>
        </div>
      </div>
      <div class="bk-bot">
        <div class="bk-no2">#${i + 1}/${total()}</div>
        <div class="bk-cards">${cardHtml}</div>
        ${r.heated ? '<div class="bk-heat">+ vặn bếp đun</div>' : ''}
        <button class="bk-use" ${ok ? '' : 'disabled'}>${ok ? 'Đổ vô thau' : 'Thiếu hàng'}</button>
      </div>`;
  };

  const render = () => {
    book.innerHTML = pagesHtml(page);
    prevBtn.disabled = page <= 0;
    nextBtn.disabled = page >= total() - 1;
    const r = s.recipes[page];
    book.querySelector('.bk-use')?.addEventListener('click', () => {
      if (!r || busy) return;
      sfx('pop');
      root.remove();
      onPick({ base: r.base, items: r.items.map((x) => ({ ...x })), heated: r.heated });
    });
    book.querySelector('.bk-name')?.addEventListener('click', () => r && rename(r));
  };

  /** Đổi tên hũ: ô nhập ngay trên dòng tên, Enter / chạm ra ngoài để lưu. */
  const rename = (r: (typeof s.recipes)[number]) => {
    const btn = book.querySelector('.bk-name') as HTMLElement;
    const inp = document.createElement('input');
    inp.className = 'bk-name-in';
    inp.value = r.name;
    inp.maxLength = 24;
    btn.replaceWith(inp);
    inp.focus();
    inp.select();
    let done = false;
    const commit = (save: boolean) => {
      if (done) return;
      done = true;
      const v = inp.value.replace(/\s+/g, ' ').trim();
      if (save && v && v !== r.name) { r.name = v; g.save(); sfx('pop'); }
      render();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); });
    inp.addEventListener('blur', () => commit(true));
  };

  /** Đặt 1 lớp tuyệt đối khớp đúng khung trang `el` bên trong .book. */
  const placeOver = (layer: HTMLElement, el: HTMLElement) => {
    Object.assign(layer.style, { left: `${el.offsetLeft}px`, top: `${el.offsetTop}px`, width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px` });
  };
  const face = (pageEl: HTMLElement, cls: string) => {
    const f = document.createElement('div');
    f.className = `bk-face ${cls}`;
    const c = pageEl.cloneNode(true) as HTMLElement;
    f.appendChild(c);
    const shade = document.createElement('i');
    shade.className = 'bk-shade';
    f.appendChild(shade);
    return f;
  };

  /**
   * Lật trang thật, sổ mở dọc (gáy nằm ngang giữa 2 trang).
   * Sau (dir=1): tờ dưới cũ lật lên trên, mặt sau là trang trên mới.
   * Trước (dir=-1): tờ trên cũ lật xuống dưới, mặt sau là trang dưới mới.
   */
  const flip = (dir: -1 | 1) => {
    const to = page + dir;
    if (busy || to < 0 || to >= total()) return;
    busy = true;
    sfx('tick');
    const oldT = book.querySelector('.bk-top') as HTMLElement;
    const oldB = book.querySelector('.bk-bot') as HTMLElement;
    const oldMoving = dir > 0 ? oldB : oldT;
    const oldStay = dir > 0 ? oldT : oldB;
    const frontFace = face(oldMoving, 'front');
    const underFace = face(oldStay, 'under');
    page = to;
    render();
    const newT = book.querySelector('.bk-top') as HTMLElement;
    const newB = book.querySelector('.bk-bot') as HTMLElement;
    const newLanding = dir > 0 ? newT : newB;
    const newRevealed = dir > 0 ? newB : newT;
    const backFace = face(newLanding, 'back');

    const under = document.createElement('div');
    under.className = 'bk-under';
    under.appendChild(underFace);
    placeOver(under, newLanding);

    const leaf = document.createElement('div');
    leaf.className = `bk-leaf ${dir > 0 ? 'to-top' : 'to-bot'}`;
    leaf.append(frontFace, backFace);
    placeOver(leaf, newRevealed);
    const cast = document.createElement('i');
    cast.className = `bk-cast ${dir > 0 ? 'from-top' : 'from-bot'}`;
    placeOver(cast, newRevealed);
    book.append(under, cast, leaf);

    const fShade = frontFace.querySelector('.bk-shade') as HTMLElement;
    const bShade = backFace.querySelector('.bk-shade') as HTMLElement;
    const uShade = underFace.querySelector('.bk-shade') as HTMLElement;
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => { leaf.remove(); under.remove(); cast.remove(); busy = false; },
    });
    const D = 0.62;
    tl.fromTo(leaf, { rotationX: 0 }, { rotationX: 180 * dir, duration: D, ease: 'power2.inOut' }, 0)
      .fromTo(fShade, { opacity: 0 }, { opacity: 0.55, duration: D / 2, ease: 'power1.in' }, 0)
      .fromTo(bShade, { opacity: 0.55 }, { opacity: 0, duration: D / 2, ease: 'power1.out' }, D / 2)
      .fromTo(cast, { opacity: 0.6 }, { opacity: 0, duration: D * 0.9, ease: 'power1.out' }, 0)
      .fromTo(uShade, { opacity: 0 }, { opacity: 0.35, duration: D / 2, ease: 'power1.in' }, D / 2)
      .fromTo(book, { rotation: -1 }, { rotation: -1 + dir * 0.6, duration: D / 2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
  };

  prevBtn.addEventListener('click', () => flip(-1));
  nextBtn.addEventListener('click', () => flip(1));
  root.querySelector('.bk-x')!.addEventListener('click', close);

  // vuốt ngang để lật: kéo sang trái = trang sau, sang phải = trang trước
  let sx = 0, sy = 0, pid = -1;
  book.addEventListener('pointerdown', (e) => {
    // vuốt trong hàng thẻ nguyên liệu là cuộn hàng thẻ, không lật trang
    if ((e.target as Element).closest('.bk-cards, .bk-name-in')) return;
    pid = e.pointerId; sx = e.clientX; sy = e.clientY;
  });
  const endSwipe = (e: PointerEvent) => {
    if (e.pointerId !== pid) return;
    pid = -1;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    const dir: -1 | 1 = dx < 0 ? 1 : -1;
    if ((dir > 0 && page >= total() - 1) || (dir < 0 && page <= 0)) {
      gsap.fromTo(book, { x: -dir * 10 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.4)' });
      return;
    }
    flip(dir);
  };
  window.addEventListener('pointerup', endSwipe);
  window.addEventListener('pointercancel', () => { pid = -1; });
  // dọn listener toàn cục khi modal bị gỡ
  new MutationObserver((_, obs) => { if (!root.isConnected) { window.removeEventListener('pointerup', endSwipe); obs.disconnect(); } })
    .observe(g.modal, { childList: true });

  render();
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  gsap.fromTo(root.querySelector('.bk-stage'), { y: 200, rotation: -6 }, { y: 0, rotation: 0, duration: 0.35, ease: 'back.out(1.5)' });
  gsap.set(book, { rotation: -1 });
}
