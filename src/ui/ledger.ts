import { gsap } from 'gsap';
import { awardBadges } from '../core/badges';
import type { DayLog, Ledger } from '../core/day';
import { TEXT } from '../core/serve';
import { avgStars, ECON, nextDebt, unlocked, upgradeDay } from '../core/state';
import { BASES, INGREDIENTS } from '../core/db';
import { sfx } from './audio';
import { watchLayout } from './stage';
import { scrollThumb } from './phone';
import type { Game } from './game';
import { noOrphan } from './copy';
import '../styles/insp-ledger.css';

/** Tiến độ kỳ hụi sắp tới (T23): thanh đầy dần theo tiền trong hộp bánh quy. */
function debtBar(money: number, debt: { amount: number; day: number; name: string }, day: number) {
  const left = Math.max(0, debt.day - day);
  const short = Math.max(0, debt.amount - money);
  const pct = Math.max(0, Math.min(100, (money / debt.amount) * 100));
  const per = left ? Math.ceil(short / left / 5) * 5 : short;
  return `<div class="rc-hui${short ? '' : ' ok'}">
    <div class="hui-h"><b>${debt.name}</b><span>${left ? `còn ${left} ngày` : 'hạn hôm nay'}</span></div>
    <div class="hui-bar"><i style="width:${pct.toFixed(0)}%"></i><em><span>${money}k / ${debt.amount}k</span></em></div>
    <small>${short ? (left ? `Mỗi ngày cần lời thêm khoảng <b>${per}k</b>` : `Còn thiếu <b>${short}k</b>`) : 'Đủ tiền trả kỳ này rồi!'}</small>
  </div>`;
}

/** Tối: tờ hoá đơn dài in ra từng dòng + sắm đồ + đi ngủ. */
export function showLedger(g: Game, l: Ledger, log: DayLog | null, next: () => void) {
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'evening';
  const best = s.reviews.filter((r) => r.day === s.day).sort((a, b) => a.stars - b.stars)[0];
  const debt = nextDebt(s);
  // giấy khen / danh hiệu: vẫn ghi vào save (save cũ không vỡ) nhưng không hiện nữa
  if (awardBadges(s, log, l).length) g.save();
  const G = TEXT.guide;
  // T16: món còn ≤ 2 phần (kể cả vừa hết) để sáng mai nhớ gọi mối
  const low = Object.entries(s.stock).filter(([id, n]) => n <= 2 && (BASES.some((b) => b.id === id) || INGREDIENTS.some((i) => i.id === id && i.unlockDay <= s.day)))
    .sort((a, b) => a[1] - b[1]).slice(0, 4).map(([id, n]) => `${nameOf(id)}\u00A0(${n})`); // V2-12: tên món + số lượng không tách dòng
  // T61: lời / lỗ cộng từ từng hũ (tiền khách trả − vốn hũ), tách khỏi tiền nhập hàng
  const profit = log ? Math.round(log.profit ?? 0) : 0;
  // giấy nhớ: tối đa 3 dòng nhắc (đơn online lần đầu, chưa live ngày mở live, sắp hết hàng)
  const notes: string[] = [];
  // AC2.5: chỉ hiện "Sắm đồ" khi hôm nay có ít nhất 1 món mua được
  const canShop = ECON.upgrades.some((u) => upgradeDay(u) <= s.day && !s.upgrades.includes(u.id));
  // V8-15: nhắc sắp hết hàng (việc phải làm sáng mai) lên đầu — máy ngắn chỉ thấy được giấy nhớ đầu
  if (low.length && unlocked(s, 'phone')) notes.push(G.c14.replace('{list}', low.slice(0, 3).join(', ')));
  if (l.online.length && !s.tutorialSeen.includes('online1')) { s.tutorialSeen.push('online1'); notes.push(unlocked(s, 'book') ? G.c25 : G.c25b); }
  if (s.day === ECON.unlocks.live && !s.tutorialSeen.includes('live')) notes.push(G.c13);
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
      <g class="ev-fan" transform="translate(70 640)">
        <path d="M -6 40 L -9 100 M 6 40 L 9 100" stroke="#2A1A16" stroke-width="7"/>
        <ellipse cx="0" cy="102" rx="40" ry="11" fill="#2F7FD8" stroke="#2A1A16" stroke-width="4"/>
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
      ${log && log.served ? `<div class="rc-profit ${profit >= 0 ? '' : 'neg'}">${profit >= 0 ? 'Lời' : 'Lỗ'} trên ${log.served} hũ bán: <b>${profit >= 0 ? '+' : '−'}${Math.abs(profit)}k</b> <small>(tiền khách trả trừ vốn từng hũ)</small></div>` : ''}
      ${l.debt ? `<div class="rc-debt ${l.debt.paid ? 'ok' : 'bad'}">${l.debt.paid ? `Đã trả ${l.debt.name}!` : `Chưa đủ tiền trả hụi. Chị Bảy cho khất tới ngày ${s.debts.find((d) => d.name === l.debt!.name)?.day}, lãi 10%.`}</div>` : debt ? debtBar(Math.round(s.money), debt, s.day) : ''}
      <div class="rc-stamp">${l.net >= 0 ? 'LÃI' : 'LỖ'}</div>
    </div>
    <div class="ev-side">
      <!-- câu chửi / review đứng ngay dưới sổ: máy ngắn vẫn thấy liền, ghi chú nhắc việc xếp sau -->
      ${best ? `<div class="ev-review"><small class="ev-rv-h">${best.stars <= 2 ? 'Câu chửi đau nhất hôm nay' : 'Review hôm nay'}</small>${'★'.repeat(Math.floor(best.stars))}${best.stars % 1 ? '⯪' : ''}${'☆'.repeat(5 - Math.ceil(best.stars))}<span>${noOrphan(`"${best.text}"`)}</span><small>— ${best.who}</small></div>` : ''}
      ${l.followerGain ? `<div class="ev-pill">+${l.followerGain} follower (đang có ${s.followers})</div>` : ''}
      ${notes.length ? `<div class="ev-memo">${notes.slice(0, 3).map((n) => `<p>${noOrphan(dashKeep(n))}</p>`).join('')}</div>` : ''}
    </div>
    </div>
    <i class="cl-thumb ev-thumb"></i>
    <div class="ev-more">Kéo xem thêm ▾</div>
    <div class="ev-actions">
      ${canShop ? '<button class="ev-shop">Sắm đồ</button>' : ''}
      <button class="ev-sleep">Đi ngủ →</button>
    </div>`;
  g.modal.appendChild(root);
  // sổ dài hơn màn (máy ngắn, nhiều ghi chú) thì cột giữa cuộn, nút giữ ở đáy
  const col = root.querySelector('.ev-col') as HTMLElement;
  scrollThumb(col, root.querySelector('.ev-thumb') as HTMLElement);
  // còn chữ phía dưới / phía trên thì mờ dần mép đó (dấu hiệu cuộn)
  const reThumb = () => col.dispatchEvent(new Event('scroll'));
  col.addEventListener('scroll', () => {
    col.classList.toggle('more', col.scrollTop + col.clientHeight < col.scrollHeight - 2);
    col.classList.toggle('up', col.scrollTop > 2);
    // nhãn "Kéo xem thêm" ở mép mờ dưới: thanh cuộn 4px khó thấy trên máy ngắn
    root.classList.toggle('col-more', col.scrollTop + col.clientHeight < col.scrollHeight - 2);
  }, { passive: true });
  // V2-22: quạt đứng ngay trên hàng nút (đế cách đỉnh nút 8px); chồng lên sổ / review / giấy nhớ đang thấy thì ẩn quạt.
  // V3-16: đo bằng hộp CHƯA xoay (offset*, toạ độ design) + chừa lề 10px; chồng thì thử quạt nhỏ (×0,8, dời sát trái) rồi mới ẩn.
  const fanEl = root.querySelector('.ev-fan') as SVGGElement;
  const box = (e: HTMLElement) => {
    let x = 0, y = 0;
    for (let n: HTMLElement | null = e; n && n !== root; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft; y += n.offsetTop;
      if (n.offsetParent === col) y -= col.scrollTop;
    }
    return { l: x, t: y, r: x + e.offsetWidth, b: y + e.offsetHeight };
  };
  const fanFit = () => {
    if (!root.isConnected) return;
    const acts = root.querySelector('.ev-actions') as HTMLElement;
    // V7-15: máy dài — sổ + quạt ngắn hơn nhiều so với chỗ trống → hạ cột sổ xuống và kéo quạt lên sát sổ,
    // cả cụm nằm giữa (không để một khoảng tím trống 240–300px giữa sổ và quạt). Cột đang cuộn / tràn thì thôi.
    col.style.paddingTop = '';
    let lift = 0;
    // chiều cao nội dung thật (scrollHeight không nhỏ hơn khung cột nên không dùng được): đáy khối con thấp nhất + đệm đáy 12
    const content = Math.max(0, ...[...col.children].map((e) => (e as HTMLElement).offsetTop + (e as HTMLElement).offsetHeight)) + 12;
    if (col.scrollTop <= 0 && content <= col.clientHeight + 1) {
      const free = acts.offsetTop - 8 - col.offsetTop - content - 181;
      if (free > 40) {
        lift = Math.floor(free / 2);
        col.style.paddingTop = `${6 + lift}px`;
      }
    }
    // V8-16: quạt luôn neo đáy (sát hàng nút như máy ngắn), chỉ cột sổ được hạ vào giữa khoảng trống
    const baseY = acts.offsetTop - 8; // đáy đế quạt (đế ở y +113 so với tâm cánh, bán kính lồng 54 + nét)
    const cTop = col.offsetTop, cBot = cTop + col.clientHeight;
    const blocks = [...col.querySelectorAll<HTMLElement>('.receipt, .ev-side > *')].map(box)
      .map((b) => ({ ...b, t: Math.max(b.t, cTop), b: Math.min(b.b, cBot) })).filter((b) => b.b > b.t);
    const M = 10;
    for (const [cx, k] of [[70, 1], [58, 0.8]] as const) {
      const f = { l: cx - 56 * k, r: cx + 56 * k, t: baseY - 169 * k, b: baseY };
      if (blocks.some((b) => b.l < f.r + M && b.r > f.l - M && b.t < f.b + M && b.b > f.t - M)) continue;
      fanEl.setAttribute('transform', `translate(${cx} ${baseY}) scale(${k}) translate(0 -113)`);
      fanEl.style.visibility = '';
      return;
    }
    fanEl.style.visibility = 'hidden';
  };
  col.addEventListener('scroll', fanFit, { passive: true });
  // V4-03: máy ngắn — lướt hết cỡ (tiêu đề chạm vùng mờ trên) mà câu chửi vẫn lọt vào vùng mờ dưới → thu gọn sổ
  // (bớt khoảng cách khối, ẩn dòng chú thích lời/lỗ, bóp khối hụi) cho câu chửi hiện trọn.
  const tightFit = () => {
    const rvEl = col.querySelector('.ev-review') as HTMLElement | null;
    const head = col.querySelector('.rc-h') as HTMLElement | null;
    col.classList.remove('tight');
    if (!rvEl || !head || !root.isConnected) return;
    const need = () => {
      const cr = col.getBoundingClientRect();
      const k = cr.height / col.offsetHeight || 1;
      const over = (rvEl.getBoundingClientRect().bottom - cr.bottom) / k + 30 + col.scrollTop;
      const room = (head.getBoundingClientRect().top - cr.top) / k - 24 + col.scrollTop;
      return over - room;
    };
    if (need() > 0) col.classList.add('tight');
  };
  watchLayout(root, () => { tightFit(); fanFit(); reThumb(); });
  // review / giấy nhớ trượt vào sau → đo lại khi đã vào chỗ
  for (const t of [600, 1400, 2600, 4000]) window.setTimeout(fanFit, t);
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
  const side = root.querySelectorAll('.ev-side > *');
  side.forEach((e, i) => gsap.fromTo(e, { x: 300 }, { x: 0, duration: 0.35, delay: tEnd + 0.5 + i * 0.15, ease: 'back.out(1.6)' }));
  // dòng sổ vừa thêm đổi chiều cao cột → đặt lại cụm sổ + quạt ngay (trước khung hình đầu)
  fanFit();
  reThumb();
  // máy ngắn: câu chửi / review bị khuất dưới đáy thì tự lướt xuống cho đọc trọn (người chơi đã tự cuộn thì thôi)
  const rv = root.querySelector('.ev-review') as HTMLElement | null;
  let touched = false;
  ['wheel', 'touchstart', 'pointerdown'].forEach((t) => col.addEventListener(t, () => { touched = true; }, { passive: true }));
  if (rv) gsap.delayedCall(tEnd + 0.9 + side.length * 0.15, () => {
    if (!root.isConnected) return;
    // khối đã vào chỗ hết → đo lại: thiếu chỗ cho câu chửi thì thu gọn sổ (V4-03)
    tightFit(); fanFit(); reThumb();
    if (touched) return;
    const cr = col.getBoundingClientRect();
    const k = cr.height / col.offsetHeight || 1; // stage bị scale theo máy
    let over = (rv.getBoundingClientRect().bottom - cr.bottom) / k + 30; // chừa đúng vùng mờ mép dưới (30px)
    // V3-03: không lướt quá mức đẩy tiêu đề "SỔ CHI TIÊU" + mộc LÃI/LỖ vào vùng mờ mép trên (24px khi đã cuộn).
    // Không đủ chỗ thì câu chửi nằm một phần dưới mép mờ, nhãn "Kéo xem thêm" báo còn chữ.
    const head = root.querySelector('.rc-h') as HTMLElement | null;
    if (head) over = Math.min(over, (head.getBoundingClientRect().top - cr.top) / k - 24);
    if (over > 2) gsap.to(col, { scrollTop: col.scrollTop + over, duration: 0.5, ease: 'power2.inOut' });
  });

  root.querySelector('.ev-shop')?.addEventListener('click', () => openUpgrades(g, root));
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

function openUpgrades(g: Game, parent: HTMLElement) {
  const s = g.s;
  const p = document.createElement('div');
  p.className = 'upgrades';
  const render = () => {
    const list = ECON.upgrades.filter((u) => upgradeDay(u) <= s.day);
    p.innerHTML = `<div class="up-h">TIỆM TẠP HOÁ ĐẦU HẺM<small>Có ${Math.round(s.money)}k</small></div>
      <div class="up-wrap"><div class="up-list">${list.map((u) => {
        const own = s.upgrades.includes(u.id);
        return `<button class="up-row ${own ? 'own' : ''}" data-id="${u.id}" ${own ? 'disabled' : ''}><span><b>${u.name}</b><small>${u.desc}</small></span><em>${own ? 'ĐÃ CÓ' : u.price + 'k'}</em></button>`;
      }).join('')}
      ${ECON.upgrades.filter((u) => upgradeDay(u) > s.day).length ? `<div class="up-more">Còn ${ECON.upgrades.filter((u) => upgradeDay(u) > s.day).length} món mở ở các ngày sau…</div>` : ''}</div><i class="cl-thumb"></i></div>
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

/** Gạch ngang giữa câu ("— sáng mai…") không được rớt xuống đầu dòng: nối với từ đứng trước bằng NBSP. */
const dashKeep = (t: string) => t.replace(/ ([—−])/g, '\u00A0$1');

const nameOf = (id: string) => (INGREDIENTS.find((i) => i.id === id) ?? BASES.find((b) => b.id === id))?.name ?? id;
