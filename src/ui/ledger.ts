import { gsap } from 'gsap';
import { sparklePath } from '../art/kit';
import { awardBadges, type Badge } from '../core/badges';
import type { DayLog, Ledger } from '../core/day';
import { TEXT } from '../core/serve';
import { avgStars, ECON, nextDebt } from '../core/state';
import { sfx } from './audio';
import { shake } from './fx';
import { scrollThumb } from './phone';
import type { Game } from './game';
import '../styles/insp-ledger.css';

const WALL_MAX = 8;

/** Tối: tờ hoá đơn dài in ra từng dòng + sắm đồ + đi ngủ. */
export function showLedger(g: Game, l: Ledger, log: DayLog | null, next: () => void) {
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'evening';
  const dayAvg = log && log.stars.length ? log.stars.reduce((a, b) => a + b, 0) / log.stars.length : 0;
  const title = TEXT.titles.find((t) => dayAvg >= t.min)?.text ?? '';
  const best = s.reviews.filter((r) => r.day === s.day).sort((a, b) => a.stars - b.stars)[0];
  const debt = nextDebt(s);
  if (awardBadges(s, log, l).length) g.save();
  root.innerHTML = `
    <div class="ev-sky"></div>
    <svg class="ev-room" viewBox="0 0 390 844" width="390" height="844">
      <!-- cửa sổ đêm -->
      <g transform="translate(276 40)">
        <rect x="0" y="0" width="100" height="130" fill="#1E1B44" stroke="#2A1A16" stroke-width="5"/>
        <circle cx="66" cy="34" r="16" fill="#FFF3B0"/><circle cx="74" cy="28" r="14" fill="#1E1B44"/>
        <circle cx="20" cy="22" r="1.6" fill="#fff"/><circle cx="40" cy="60" r="1.4" fill="#fff"/><circle cx="84" cy="80" r="1.6" fill="#fff"/>
        <path d="M 50 0 V 130 M 0 65 H 100" stroke="#2A1A16" stroke-width="5"/>
        <path d="M -6 -6 C 20 10 18 60 -2 130 L -12 130 L -12 -6 Z" fill="url(#pt-flower-n)" stroke="#2A1A16" stroke-width="3"/>
      </g>
      <defs><pattern id="pt-flower-n" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#B5527A"/><circle cx="6" cy="6" r="3" fill="#E9A6C0"/><circle cx="15" cy="15" r="2.2" fill="#E9A6C0"/></pattern></defs>
      <!-- quạt máy quay -->
      <g transform="translate(70 640)">
        <path d="M -6 40 L -10 150 M 6 40 L 10 150" stroke="#2A1A16" stroke-width="7"/>
        <ellipse cx="0" cy="152" rx="44" ry="12" fill="#2F7FD8" stroke="#2A1A16" stroke-width="4"/>
        <circle r="54" fill="#8FC9F0" fill-opacity=".35" stroke="#2A1A16" stroke-width="4"/>
        <g class="fan-blades"><path d="M 0 0 C -10 -40 20 -48 24 -16 Z M 0 0 C 40 -6 40 26 10 26 Z M 0 0 C -24 28 -48 6 -30 -16 Z" fill="#2F7FD8" stroke="#2A1A16" stroke-width="3"/></g>
        <circle r="9" fill="#FFC53D" stroke="#2A1A16" stroke-width="3"/>
        ${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<path d="M 0 0 L ${Math.cos(a) * 54} ${Math.sin(a) * 54}" stroke="#2A1A16" stroke-width="1.5" opacity=".5"/>`; }).join('')}
      </g>
    </svg>
    <div class="ev-col">
    <div class="receipt">
      <div class="rc-h">SỔ CHI TIÊU<small>Ngày ${s.day} · ${s.shopName}</small></div>
      <div class="rc-lines"></div>
      <div class="rc-total"><span>${l.net >= 0 ? 'LÃI' : 'LỖ'}</span><b>${l.net >= 0 ? '+' : ''}${Math.round(l.net)}k</b></div>
      <div class="rc-cash">Hộp bánh quy còn: <b>${Math.round(s.money)}k</b></div>
      ${l.debt ? `<div class="rc-debt ${l.debt.paid ? 'ok' : 'bad'}">${l.debt.paid ? `Đã trả ${l.debt.name}!` : `Chưa đủ tiền trả hụi. Chị Bảy cho khất tới ngày ${s.debts.find((d) => d.name === l.debt!.name)?.day}, lãi 10%.`}</div>` : debt ? `<div class="rc-debt">Kỳ hụi tới: ${debt.amount}k — ngày ${debt.day}</div>` : ''}
      <div class="rc-stamp">${l.net >= 0 ? 'LÃI' : 'LỖ'}</div>
    </div>
    <div class="ev-side">
      ${title && log?.stars.length ? `<div class="ev-title">Danh hiệu hôm nay<b>${title}</b><small>${dayAvg.toFixed(1)} sao trung bình · ${log.served} khách${log.exploded ? ` · nổ ${log.exploded} thau` : ''}</small></div>` : ''}
      ${l.followerGain ? `<div class="ev-pill">+${l.followerGain} follower (đang có ${s.followers})</div>` : ''}
      ${best ? `<div class="ev-review"><small class="ev-rv-h">${best.stars <= 2 ? 'Câu chửi đau nhất hôm nay' : 'Review hôm nay'}</small>${'★'.repeat(Math.floor(best.stars))}${best.stars % 1 ? '⯪' : ''}${'☆'.repeat(5 - Math.ceil(best.stars))}<span>"${best.text}"</span><small>— ${best.who}</small></div>` : ''}
    </div>
    <div class="ev-wall"></div>
    </div>
    <div class="ev-actions">
      <button class="ev-shop">Sắm đồ</button>
      <button class="ev-sleep">Đi ngủ →</button>
    </div>`;
  g.modal.appendChild(root);
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  const blades = root.querySelector('.fan-blades') as SVGGElement;
  let fanA = 0;
  const fan = () => { if (!root.isConnected) { gsap.ticker.remove(fan); return; } fanA = (fanA + 14) % 360; blades.setAttribute('transform', `rotate(${fanA})`); };
  gsap.ticker.add(fan);
  const linesEl = root.querySelector('.rc-lines') as HTMLElement;
  const rows = l.lines.filter((x) => x.amount !== 0 || x.label.includes('khất'));
  rows.forEach((x, i) => {
    const d = document.createElement('div');
    d.className = 'rc-row';
    d.innerHTML = `<span>${x.label}</span><b class="${x.amount < 0 ? 'neg' : ''}">${x.amount > 0 ? '+' : ''}${Math.round(x.amount)}k</b>`;
    linesEl.appendChild(d);
    gsap.fromTo(d, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.15, delay: 0.25 + i * 0.16, onStart: () => sfx('tick') });
  });
  const tEnd = 0.25 + rows.length * 0.16;
  gsap.fromTo(root.querySelector('.rc-total'), { scale: 0 }, { scale: 1, duration: 0.3, delay: tEnd, ease: 'back.out(2)' });
  gsap.fromTo(root.querySelector('.rc-stamp'), { scale: 2.4, opacity: 0, rotation: -30 }, { scale: 1, opacity: 0.9, rotation: -12, duration: 0.12, delay: tEnd + 0.35, ease: 'power4.in', onComplete: () => {
    sfx('slap');
    gsap.fromTo(root.querySelector('.receipt'), { x: -3 }, { x: 0, duration: 0.3, ease: 'elastic.out(1,0.3)' });
  } });
  const sideN = root.querySelectorAll('.ev-side > *').length;
  root.querySelectorAll('.ev-side > *').forEach((e, i) => gsap.fromTo(e, { x: 300 }, { x: 0, duration: 0.35, delay: tEnd + 0.5 + i * 0.15, ease: 'back.out(1.6)' }));
  buildWall(root.querySelector('.ev-wall') as HTMLElement, s.badges ?? [], s.day, tEnd + 0.7 + sideN * 0.15);

  root.querySelector('.ev-shop')!.addEventListener('click', () => openUpgrades(g, root));
  root.querySelector('.ev-sleep')!.addEventListener('click', () => {
    sfx('click');
    const night = document.createElement('div');
    night.className = 'night';
    night.innerHTML = `<div>Khò khò…</div>`;
    g.modal.appendChild(night);
    gsap.fromTo(night, { opacity: 0 }, { opacity: 1, duration: 0.5, onComplete: () => {
      root.remove();
      gsap.to(night, { opacity: 0, duration: 0.6, delay: 0.5, onComplete: () => night.remove() });
      next();
    } });
  });
  void avgStars;
}

/** Tường giấy khen: mỗi huy hiệu 1 tờ giấy khen nhỏ dán băng keo / ghim; huy hiệu hôm nay bay vào đập dán. */
function buildWall(wall: HTMLElement, all: Badge[], day: number, delay: number) {
  // tối đa 8 ô: dư thì 7 tờ mới nhất + 1 nhãn "+N"
  const shown = all.length > WALL_MAX ? all.slice(-(WALL_MAX - 1)) : all;
  const more = all.length - shown.length;
  if (!shown.length) {
    wall.innerHTML = `<div class="bw-empty">Chỗ này để dán giấy khen…</div>`;
    return;
  }
  const cells = shown.length + (more > 0 ? 1 : 0);
  wall.innerHTML = `<div class="bw-grid">${shown.map((b, i) => `<div class="bw-cell${i % 2 ? ' low' : ''}" data-i="${all.indexOf(b)}" style="--r:${paperRot(b, i).toFixed(1)}deg">${paperHtml(b, i)}</div>`).join('')}${more > 0 ? `<div class="bw-cell bw-more-cell"><button class="bw-more">+${more}<small>giấy khen cũ</small></button></div>` : ''}</div>`;
  fitWall(wall, cells);
  // chạm 1 tờ → xem to; chạm "+N" → mở cả xấp giấy khen
  wall.querySelectorAll<HTMLElement>('.bw-cell[data-i]').forEach((c) => c.addEventListener('click', () => zoomPaper(wall, all[Number(c.dataset.i)], Number(c.dataset.i))));
  wall.querySelector('.bw-more')?.addEventListener('click', () => openAlbum(wall, all));
  const papers = Array.from(wall.querySelectorAll<HTMLElement>('.bw-paper'));
  let k = 0;
  shown.forEach((b, i) => {
    if (b.day !== day) return;
    const p = papers[i];
    const t = delay + k++ * 0.55;
    const tape = p.querySelector('i')!;
    gsap.set(p, { opacity: 0 });
    gsap.set(tape, { opacity: 0 });
    gsap.timeline({ delay: t })
      .fromTo(p, { opacity: 1, x: 220, y: -260, rotation: 40, scale: 1.8 }, { x: 0, y: 0, rotation: -4, scale: 1.25, duration: 0.42, ease: 'power2.in' })
      .to(p, { scale: 1, rotation: 0, duration: 0.35, ease: 'elastic.out(1.2,0.4)', onStart: () => { sfx('slap'); shake(0.15); sparkle(p); } })
      .fromTo(tape, { opacity: 0, scaleX: 0.2 }, { opacity: 1, scaleX: 1, duration: 0.18, ease: 'back.out(2)' }, '<0.05');
  });
  const tag = wall.querySelector('.bw-more');
  if (tag) gsap.fromTo(tag, { scale: 0 }, { scale: 1, duration: 0.3, delay: delay + k * 0.55, ease: 'back.out(2)' });
}

const paperRot = (b: Badge, i: number) => (((i * 37 + b.id.length * 11) % 13) - 6) * 0.9;

function paperHtml(b: Badge, i: number): string {
  const pin = i % 3 === 1 ? 'pin' : 'tape';
  const tone = b.id.startsWith('title:') ? 'gold' : i % 2 ? 'mint' : 'cream';
  return `<div class="bw-paper ${tone}">
      <i class="bw-${pin}"></i>
      <div class="bw-in"><small>GIẤY KHEN</small><svg class="bw-seal" viewBox="-12 -12 24 24" width="18" height="18"><circle r="8" fill="#E63B2E" stroke="#2A1A16" stroke-width="2"/><path d="M -5 7 L -7 13 L -2 10 L 0 13 L 1 8 M 5 7 L 7 13 L 2 10" fill="#E63B2E" stroke="#2A1A16" stroke-width="1.5" stroke-linejoin="round"/><path d="${sparklePath(0, 0, 5)}" fill="#FFC53D"/></svg><b class="${b.name.length > 15 ? 'long' : ''}">${b.name}</b><em>ngày ${b.day}</em></div>
    </div>`;
}

/** Xem 1 tờ giấy khen phóng to giữa màn; chạm đâu cũng đóng. */
function zoomPaper(wall: HTMLElement, b: Badge, i: number) {
  const host = wall.closest('.evening') as HTMLElement;
  const z = document.createElement('div');
  z.className = 'bw-zoom';
  z.innerHTML = `<div class="bw-zoom-in">${paperHtml(b, i)}</div><div class="bw-zoom-hint">Chạm để đóng</div>`;
  host.appendChild(z);
  sfx('pop');
  gsap.fromTo(z, { opacity: 0 }, { opacity: 1, duration: 0.15 });
  gsap.fromTo(z.querySelector('.bw-zoom-in'), { scale: 1, rotation: paperRot(b, i) }, { scale: 3.2, rotation: -2, duration: 0.35, ease: 'back.out(1.6)' });
  z.addEventListener('click', () => gsap.to(z, { opacity: 0, duration: 0.15, onComplete: () => z.remove() }));
}

/** Cả xấp giấy khen (mọi ngày), lưới cuộn dọc; chạm 1 tờ để xem to. */
function openAlbum(wall: HTMLElement, all: Badge[]) {
  const host = wall.closest('.evening') as HTMLElement;
  const a = document.createElement('div');
  a.className = 'bw-album';
  a.innerHTML = `<div class="bwa-card"><div class="bwa-h">GIẤY KHEN CỦA TIỆM<small>${all.length} tờ</small></div>
    <div class="bwa-wrap"><div class="bwa-grid">${all.map((b, i) => `<div class="bw-cell" data-i="${i}" style="--r:${paperRot(b, i).toFixed(1)}deg">${paperHtml(b, i)}</div>`).join('')}</div><i class="cl-thumb"></i></div>
    <button class="bwa-x">Đóng</button></div>`;
  host.appendChild(a);
  sfx('pop');
  gsap.fromTo(a.querySelector('.bwa-card'), { y: 500 }, { y: 0, duration: 0.3, ease: 'back.out(1.4)' });
  scrollThumb(a.querySelector('.bwa-grid') as HTMLElement, a.querySelector('.cl-thumb') as HTMLElement);
  a.querySelectorAll<HTMLElement>('.bw-cell').forEach((c) => c.addEventListener('click', () => zoomPaper(wall, all[Number(c.dataset.i)], Number(c.dataset.i))));
  a.querySelector('.bwa-x')!.addEventListener('click', () => gsap.to(a.querySelector('.bwa-card'), { y: 600, duration: 0.25, onComplete: () => a.remove() }));
}

/** Chọn số cột + tỉ lệ thu nhỏ để n tờ vừa khoảng tường còn trống (sổ dài / có review thì tường thấp lại). */
function fitWall(wall: HTMLElement, n: number) {
  const grid = wall.querySelector('.bw-grid') as HTMLElement;
  const W = wall.clientWidth;
  const H = wall.clientHeight;
  const CW = 65, CH = 84, GX = 4, GY = 8, LOW = 16, TOP = 14;
  const opts = Array.from({ length: Math.min(8, n) }, (_, i) => {
    const c = i + 1;
    const rows = Math.ceil(n / c);
    const w = c * CW + (c - 1) * GX + 8;
    const h = rows * CH + (rows - 1) * GY + (c > 1 ? LOW : 0) + TOP;
    return { c, k: Math.min(1, W / w, H > 0 ? H / h : 1) };
  });
  // ưu tiên ~4 cột (xếp so le đẹp nhất) nếu không phải thu nhỏ quá nhiều so với phương án lớn nhất
  const maxK = Math.max(...opts.map((o) => o.k));
  const best = opts.filter((o) => o.k >= maxK - 0.12).sort((a, b) => Math.abs(a.c - 4) - Math.abs(b.c - 4) || b.k - a.k)[0];
  wall.style.setProperty('--cols', String(best.c));
  grid.style.transform = best.k < 1 ? `scale(${best.k.toFixed(3)})` : '';
}

/** Lấp lánh quanh tờ giấy khen vừa dán. */
function sparkle(p: HTMLElement) {
  const host = p.parentElement!;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const sp = document.createElement('div');
    sp.className = 'bw-spark';
    sp.innerHTML = `<svg viewBox="-10 -10 20 20" width="18" height="18"><path d="${sparklePath(0, 0, 9)}" fill="${i % 2 ? '#FFF3B0' : '#FFC53D'}" stroke="#2A1A16" stroke-width="1.2"/></svg>`;
    host.appendChild(sp);
    gsap.fromTo(sp, { x: 0, y: 0, scale: 0.3, opacity: 1, rotation: 0 }, { x: Math.cos(a) * 52, y: Math.sin(a) * 46, scale: 1, rotation: 90, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => sp.remove() });
  }
}

function openUpgrades(g: Game, parent: HTMLElement) {
  const s = g.s;
  const p = document.createElement('div');
  p.className = 'upgrades';
  const render = () => {
    const list = ECON.upgrades.filter((u) => u.day <= s.day);
    p.innerHTML = `<div class="up-h">TIỆM TẠP HOÁ ĐẦU HẺM<small>Có ${Math.round(s.money)}k</small></div>
      <div class="up-wrap"><div class="up-list">${list.map((u) => {
        const own = s.upgrades.includes(u.id);
        return `<button class="up-row ${own ? 'own' : ''}" data-id="${u.id}" ${own ? 'disabled' : ''}><span><b>${u.name}</b><small>${u.desc}</small></span><em>${own ? 'ĐÃ CÓ' : u.price + 'k'}</em></button>`;
      }).join('')}
      ${ECON.upgrades.filter((u) => u.day > s.day).length ? `<div class="up-more">Còn ${ECON.upgrades.filter((u) => u.day > s.day).length} món mở ở các ngày sau…</div>` : ''}</div><i class="cl-thumb"></i></div>
      <button class="up-x">Xong</button>`;
    scrollThumb(p.querySelector('.up-list') as HTMLElement, p.querySelector('.cl-thumb') as HTMLElement);
    p.querySelectorAll<HTMLButtonElement>('.up-row:not(.own)').forEach((b) => b.addEventListener('click', () => {
      const u = ECON.upgrades.find((x) => x.id === b.dataset.id)!;
      if (s.money < u.price) { sfx('starBad'); g.toast('Không đủ tiền!', 'bad'); return; }
      s.money -= u.price;
      s.upgrades.push(u.id);
      sfx('cashout');
      g.toast(`Đã sắm ${u.name}!`, 'good');
      g.save();
      render();
      const cash = parent.querySelector('.rc-cash b');
      if (cash) cash.textContent = `${Math.round(s.money)}k`;
    }));
    p.querySelector('.up-x')!.addEventListener('click', () => gsap.to(p, { y: 500, duration: 0.25, onComplete: () => p.remove() }));
  };
  render();
  parent.appendChild(p);
  gsap.fromTo(p, { y: 500 }, { y: 0, duration: 0.3, ease: 'back.out(1.4)' });
}
