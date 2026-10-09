import { gsap } from 'gsap';
import { beanSvg, type Accessory } from '../art/bean';
import { ICONS } from '../art/icons';
import { ink, P } from '../art/kit';
import type { MorningNews } from '../core/day';
import { ECON, emptyPot, nextDebt, unlocked, type Pot, type SaveState } from '../core/state';
import { sfx } from './audio';
import { sparkles } from './fx';
import type { Game } from './game';
import { openPhone } from './phone';
import { settingsGear } from './title';
import { ex, watchLayout } from './stage';
import { noOrphan } from './copy';

const POT_POS: [number, number][] = [[70, 470], [195, 470], [320, 470], [70, 610], [195, 610], [320, 610]];

/** Buổi sáng trên ban công: tin tức, vườn, gọi mối, rồi xuống mở tiệm. */
export function showMorning(g: Game, news: MorningNews | null, done: () => void) {
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'morning';
  g.modal.appendChild(root);
  const gardenOn = unlocked(s, 'garden');
  if (gardenOn) root.classList.add('garden');
  root.innerHTML = `
    <svg class="balcony" viewBox="0 0 390 844" width="390" height="844">${balconySvg(s.day)}<g id="broom">${frontSvg()}</g><g id="pots"></g><g id="can-g" style="cursor:grab${gardenOn ? '' : ';display:none'}">${CAN_HOME}</g><g id="pots-buy"></g><g id="water-fx"></g></svg>
    <div class="mo-head"><span class="mo-day">NGÀY ${s.day}</span><span class="mo-sub">${s.day === 1 ? 'Ngày đầu mở tiệm!' : greeting(s)}</span></div>
    <div class="mo-news"></div>
    <button class="mo-more" hidden></button>
    <div class="mo-actions">
      ${unlocked(s, 'phone') ? '<button class="mo-btn phone">Gọi mối nhập hàng</button>' : ''}
      <button class="mo-btn go">Xuống mở tiệm →</button>
    </div>`;
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.35 });
  settingsGear(root);
  // ban công neo đáy (vườn + nút luôn đủ chỗ); máy ngắn thì trời phía trên lấp sau thẻ tin, máy dài thì lộ thêm trời
  const balcony = root.querySelector('.balcony') as SVGSVGElement;
  // V7-04: máy ngắn — thẻ tin / câu chào che một phần 2 ô cửa sổ nhà hồng → dời cửa sổ xuống ngay dưới mép thẻ
  // (không quá dây phơi); không đủ chỗ thì ẩn trọn cửa sổ (kể cả chị Bảy), không để lòi mẩu xanh dưới thẻ
  // V8-03: tổng quát cho cả cửa sổ nhà vàng (#mo-yellowwin) — mỗi cửa sổ có hộp toạ độ + đáy tối đa (trên dây phơi) riêng
  const WINS: [string, { t: number; b: number; l: number; r: number; max: number }][] = [
    ['#mo-pinkwin', { t: 220, b: 266, l: 20, r: 128, max: 306 }],
    ['#mo-yellowwin', { t: 260, b: 300, l: 280, r: 314, max: 308 }],
  ];
  const fitWin = () => {
    const m = balcony.getScreenCTM();
    for (const [sel, box] of WINS) {
      const w = balcony.querySelector(sel) as SVGGElement | null;
      if (!w) continue;
      w.removeAttribute('transform');
      w.style.visibility = '';
      if (!m || !m.d) continue;
      const win = { t: m.d * box.t + m.f, b: m.d * box.b + m.f, l: m.a * box.l + m.e, r: m.a * box.r + m.e };
      let cover = -Infinity;
      for (const e of root.querySelectorAll('.mo-news, .mo-more:not([hidden]), .mo-head')) {
        const q = e.getBoundingClientRect();
        if (q.height && q.left < win.r && q.right > win.l && q.top < win.b + 6 && q.bottom > win.t) cover = Math.max(cover, q.bottom);
      }
      if (cover === -Infinity) continue;
      const d = (cover - win.t) / m.d + 6;
      if (box.b + d <= box.max) w.setAttribute('transform', `translate(0 ${d.toFixed(1)})`);
      else w.style.visibility = 'hidden';
    }
  };
  // gShift: hạ hàng thùng xốp (vườn) xuống khi danh sách tin không đủ chỗ cho 2 thẻ đầu (V2-05)
  let gShift = 0;
  const placeBalcony = () => {
    balcony.style.top = `${ex()}px`;
    // V2-10: bồn nước trên mái nhà vàng chồng lên câu chào ở máy ngắn → ẩn bồn
    const tank = balcony.querySelector('#mo-tank') as SVGGElement | null;
    const head = root.querySelector('.mo-head');
    if (tank && head) {
      tank.style.visibility = '';
      const a = tank.getBoundingClientRect(), b = head.getBoundingClientRect();
      tank.style.visibility = a.top < b.bottom + 2 && a.bottom > b.top && a.left < b.right && a.right > b.left ? 'hidden' : '';
    }
  };
  watchLayout(root, () => { placeBalcony(); fitWin(); });
  // mây trôi ngang chậm, ra khỏi khung bên phải thì vòng lại từ bên trái
  root.querySelectorAll<SVGGElement>('.cloud').forEach((c, i) => {
    const sp = Number(c.dataset.sp);
    gsap.fromTo(c, { x: -110 }, { x: 500, duration: sp, ease: 'none', repeat: -1 }).progress([0.22, 0.62, 0.86][i] ?? 0.5);
  });
  root.querySelectorAll('.sway > *').forEach((c, i) => gsap.to(c, { rotation: i % 2 ? 4 : -4, duration: 1.2 + i * 0.2, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 0%' }));
  const zz = root.querySelector('.zzz');
  if (zz) gsap.to(zz, { y: -14, x: 6, opacity: 0, duration: 1.6, repeat: -1, ease: 'power1.out' });
  const dbt = nextDebt(s);
  if (dbt && dbt.day - s.day <= 2) root.dataset.debtSoon = '1';
  peekNeighbor(root, s.day);
  const potsG = root.querySelector('#pots') as SVGGElement;
  // ô "+ thùng" vẽ SAU lớp chổi/bình tưới → luôn nằm trên, không bị đầu chổi / quai bình che (V7-02)
  const buyG = root.querySelector('#pots-buy') as SVGGElement;
  // V3-02: chổi vẽ SAU lớp thùng (thùng + thẻ HÁI! luôn nằm trên) và dời xuống cùng hàng thùng khi hạ vườn
  const broomG = root.querySelector('#broom') as SVGGElement;
  // V3-13: đôi dép là đồ trang trí đứng yên → hàng thùng / ô "+ thùng" hạ xuống chạm dép thì cất dép đi
  const slippers = root.querySelector('#slippers') as SVGGElement | null;
  const fitSlippers = () => {
    if (!slippers) return;
    slippers.style.display = '';
    const a = slippers.getBoundingClientRect();
    const hit = [...potsG.children, ...buyG.children].some((e) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
    });
    if (hit) slippers.style.display = 'none';
  };
  const newsEl = root.querySelector('.mo-news') as HTMLElement;

  // ---- tin buổi sáng
  // T18: tính năng MỚI mở hôm nay lên đầu, to, có hình trạm, chạm để đóng; sau đó mới tới nợ / review trễ / vườn
  const cards: string[] = [];
  const NEW: [keyof typeof ECON.unlocks, string, string][] = [
    ['mortar', 'Cối đá', 'Thả đồ vô cối, gõ 5 nhát: chỉ số mạnh nhất ×1,5 (không nhân Độc).'],
    ['phone', 'Gọi mối', 'Bấm điện thoại bàn để nhập hàng. Nhớ trả giá kiểu giả vờ cúp máy.'],
    ['live', 'Livestream', 'Chạm cái điện thoại trên chân máy để lên sóng, đông người xem thì có quà.'],
    ['garden', 'Vườn ban công', 'Gieo hạt, tưới mỗi sáng, chín thì hái miễn phí.'],
    ['blender', 'Máy xay', 'Giữ nút XAY tới vạch rồi thả: xoá chỉ số âm, +1\u00a0Mịn.'],
    ['book', 'Sổ bí kíp', 'Chạm cuốn sổ đỏ để trộn nhanh công thức đã ghi; đơn online cũng làm từ sổ này.'],
    ['stove', 'Bếp ga', 'Giữ núm bếp tới khi thanh xanh rồi thả: Độc giảm một\u00a0nửa, mất Che nắng.'],
    ['si', 'Shop Sỉ', 'Hàng siêu rẻ, mạnh… mà độc, và chú Quản Lý bắt đầu để ý.'],
  ];
  for (const [k, name, desc] of NEW) if (s.day === ECON.unlocks[k] && s.day > 1) cards.push(`<div class="mo-card new big" data-close="1"><svg class="mo-ic" viewBox="-30 -30 60 60" width="58" height="58">${newIcon(k)}</svg><span><i>MỚI</i><b>${name}</b><small>${noOrphan(desc)}</small></span><button class="mo-x" aria-label="Đóng">×</button></div>`);
  const debt = nextDebt(s);
  if (debt) cards.push(`<div class="mo-card debt"><b>${debt.name}</b> ${debt.amount}k — hạn cuối ngày ${debt.day}${debt.day === s.day ? ' (HÔM NAY!)' : ''}. Đang có ${Math.round(s.money)}k.</div>`);
  if (news?.late.length) {
    for (const l of news.late) cards.push(`<div class="mo-card late"><svg viewBox="-75 -230 150 240" width="36" height="58">${beanSvg({ color: '#F2675A', acc: l.acc as Accessory[] }).replace('face-sick" style="display:none"', 'face-sick"')}</svg><span><b>${l.who}</b> quay lại ★☆☆☆☆ "${l.text}" <em>hoàn ${l.refund}k</em></span></div>`);
  }
  if (news?.harvestReady) cards.push(`<div class="mo-card good">Vườn có <b>${news.harvestReady}</b> thùng chín, hái đi!</div>`);
  newsEl.innerHTML = cards.join('');
  newsEl.querySelectorAll('.mo-card').forEach((c, i) => gsap.fromTo(c, { x: -380 }, { x: 0, duration: 0.35, delay: 0.2 + i * 0.12, ease: 'back.out(1.5)' }));
  // R4: còn tin phía dưới (hoặc đã cuộn qua tin phía trên) thì mép đó mờ dần → biết là cuộn được;
  // kèm nhãn "còn N thẻ ▾" nằm ngay mép dưới khung danh sách (chạm để cuộn xuống)
  const moreEl = root.querySelector('.mo-more') as HTMLButtonElement;
  // V2-05: khung tin dừng trên NGỌN cây cao nhất (không phải mép thùng) − 8px, chừa chỗ nhãn "còn N thẻ" treo dưới khung;
  // máy ngắn không đủ chỗ cho 2 thẻ đầu thì hạ hàng thùng xốp xuống sàn (tới sát hàng nút) thay vì cho thẻ đè cây
  const shiftPots = (v: number) => {
    gShift = v;
    for (const e of [potsG, buyG, broomG]) e.setAttribute('transform', v ? `translate(0 ${v})` : '');
    fitSlippers();
  };
  const fitGarden = () => {
    if (!gardenOn || !potsG.firstElementChild) {
      if (gShift) shiftPots(0);
      newsEl.style.maxHeight = '';
      return;
    }
    const sc = root.getBoundingClientRect().height / Math.max(1, root.offsetHeight);
    const plantTop0 = (potsG.getBoundingClientRect().top - root.getBoundingClientRect().top) / sc - gShift;
    const cs = [...newsEl.querySelectorAll<HTMLElement>('.mo-card')].filter((c) => !c.dataset.closing);
    const two = cs[Math.min(cs.length, 2) - 1];
    const want = two ? two.offsetTop + two.offsetHeight + 2 : 0;
    const chip = newsEl.scrollHeight > want + 1 ? 16 : 0;
    const top = newsEl.offsetTop;
    // hạ tối đa tới khi đáy hàng thùng (kể cả ô "+ thùng") còn cách hàng nút 8px
    const btn = root.querySelector('.mo-actions')?.getBoundingClientRect().top ?? Infinity;
    const potsBottom = Math.max(potsG.getBoundingClientRect().bottom, buyG.firstElementChild ? buyG.getBoundingClientRect().bottom : 0);
    const room = (btn - potsBottom) / sc + gShift - 8;
    const next = Math.max(0, Math.min(Math.floor(room), Math.ceil(top + want + chip + 8 - plantTop0)));
    if (next !== gShift) shiftPots(next);
    newsEl.style.maxHeight = `${Math.max(60, Math.min(300, Math.floor(plantTop0 + gShift - 8 - chip - top)))}px`;
  };
  const fade = () => {
    if (!newsEl.isConnected) return;
    fitGarden();
    fitWin();
    // chiều cao khung = trọn số thẻ vừa chỗ (không thẻ nào bị cắt ngang ở mép dưới lúc chưa cuộn); max-height trong CSS là chỗ tối đa
    const cs = [...newsEl.querySelectorAll<HTMLElement>('.mo-card')].filter((c) => !c.dataset.closing);
    const avail = parseFloat(getComputedStyle(newsEl).maxHeight) || 300;
    let fit = 0;
    for (const c of cs) { const b = c.offsetTop + c.offsetHeight; if (b <= avail + 0.5) fit = b; else break; }
    const h = cs.length && fit && newsEl.scrollHeight > avail + 1 ? `${Math.ceil(fit) + 2}px` : '';
    if (newsEl.style.height !== h) newsEl.style.height = h;
    const bottom = newsEl.scrollTop + newsEl.clientHeight;
    newsEl.classList.toggle('more-b', bottom < newsEl.scrollHeight - 2);
    newsEl.classList.toggle('more-t', newsEl.scrollTop > 2);
    // thẻ còn khuất (không thấy trọn) phía dưới
    const n = [...newsEl.querySelectorAll<HTMLElement>('.mo-card')].filter((c) => !c.dataset.closing && c.offsetTop + c.offsetHeight > bottom + 2).length;
    moreEl.hidden = !n;
    if (n) {
      moreEl.textContent = `còn ${n} thẻ ▾`;
      moreEl.style.top = `${newsEl.offsetTop + newsEl.clientHeight - 6}px`;
    }
  };
  moreEl.addEventListener('click', (e) => { e.stopPropagation(); newsEl.scrollBy({ top: newsEl.clientHeight * 0.7, behavior: 'smooth' }); });
  newsEl.addEventListener('scroll', fade, { passive: true });
  const ro = new ResizeObserver(fade);
  ro.observe(newsEl);
  newsEl.querySelectorAll('.mo-card').forEach((c) => ro.observe(c));
  watchLayout(root, fade);
  // R6: thẻ MỚI chỉ đóng khi chạm thật (nhả tay, xê dịch < 8px, danh sách không cuộn) — chạm để cuộn thì giữ thẻ
  newsEl.querySelectorAll<HTMLElement>('.mo-card[data-close]').forEach((c) => {
    let down: { id: number; x: number; y: number; top: number } | null = null;
    c.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, top: newsEl.scrollTop };
    });
    c.addEventListener('pointercancel', () => { down = null; });
    c.addEventListener('pointerup', (e) => {
      const d = down;
      down = null;
      if (!d || d.id !== e.pointerId || c.dataset.closing) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 8 || Math.abs(newsEl.scrollTop - d.top) > 1) return;
      e.stopPropagation();
      c.dataset.closing = '1';
      sfx('pop');
      // trượt ra phải rồi thu chiều cao lại cho thẻ dưới trôi lên êm, không giật
      gsap.to(c, { x: 400, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => {
        gsap.to(c, { height: 0, marginTop: -6, overflow: 'hidden', paddingTop: 0, paddingBottom: 0, borderWidth: 0, duration: 0.18, ease: 'power1.in', onComplete: () => { c.remove(); fade(); } });
      } });
    });
  });
  if (news?.late.length) setTimeout(() => sfx('angry'), 400);

  // ---- vườn
  const renderPots = () => {
    potsG.innerHTML = '';
    buyG.innerHTML = '';
    // R2: vườn chưa mở thì ban công trống, không biển báo trước
    if (!gardenOn) return;
    POT_POS.forEach(([x, y], i) => {
      const pot = s.pots[i];
      if (!pot && i > s.pots.length) return;
      const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g2.setAttribute('transform', `translate(${x} ${y})`);
      g2.style.cursor = 'pointer';
      g2.innerHTML = pot ? potSvg(pot) : buyPotSvg();
      g2.addEventListener('pointerdown', (e) => { e.stopPropagation(); potTap(i, g2); });
      (pot ? potsG : buyG).appendChild(g2);
    });
    fitSlippers();
  };
  const potTap = (i: number, el2: SVGGElement) => {
    const pot = s.pots[i];
    if (!pot) {
      if (s.pots.length >= ECON.maxPots) return;
      if (s.money < ECON.potPrice) return g.toast(`Thùng xốp ${ECON.potPrice}k, không đủ tiền.`, 'bad');
      s.money -= ECON.potPrice;
      s.pots.push(emptyPot());
      sfx('thud');
      g.save();
      renderPots();
      return;
    }
    if (pot.seed === 'heo') {
      Object.assign(pot, emptyPot());
      sfx('unplop');
      renderPots();
      g.toast('Nhổ cây héo rồi. Nhớ tưới mỗi ngày nha!', 'info');
      return;
    }
    if (!pot.seed) return seedPicker(i);
    if (pot.ready) {
      const seed = ECON.seeds.find((x) => x.id === pot.seed)!;
      s.stock[seed.id] = (s.stock[seed.id] ?? 0) + seed.yield;
      sfx('pop');
      sparkles(POT_POS[i][0], POT_POS[i][1] - 60 + ex() + gShift, 5, P.yellow, 40);
      for (let k = 0; k < seed.yield; k++) flyProduce(root, seed.id, POT_POS[i][0], POT_POS[i][1] - 60 + gShift, k);
      pot.harvests++;
      if (seed.regrow && pot.harvests < 3) { pot.ready = false; pot.age = seed.days - seed.regrow; }
      else Object.assign(pot, emptyPot());
      g.toast(`Hái được ${seed.yield} ${ICONNAME[seed.id]}! (miễn phí, đồ nhà trồng)`, 'good');
      g.save();
      setTimeout(renderPots, 300);
      return;
    }
    if (!pot.watered) {
      // tưới bằng cách nhấc bình: chạm thùng chỉ nhắc + bình nhún nhảy
      g.toast('Nhấc bình tưới lên, đưa qua thùng để tưới!', 'info');
      gsap.fromTo(canBody, { y: 0 }, { y: -14, duration: 0.18, yoyo: true, repeat: 3, ease: 'power1.out' });
      return;
    }
    void el2;
    g.toast('Tưới rồi, mai nó lớn.', 'info');
  };
  // ---- bình tưới: nhấc lên → tự nghiêng, tia nước vòng cung rơi xuống; đưa qua thùng cần tưới để tưới
  const svgEl = root.querySelector('svg.balcony') as SVGSVGElement;
  const canG = root.querySelector('#can-g') as SVGGElement;
  const canBody = canG.querySelector('.can-body') as SVGGElement;
  const fx = root.querySelector('#water-fx') as SVGGElement;
  const toSvg = (cx: number, cy: number) => {
    const pt = svgEl.createSVGPoint();
    pt.x = cx; pt.y = cy;
    return pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
  };
  const HOME = { x: CAN_X, y: CAN_Y };
  const pos = { ...HOME, tilt: 0 };
  const place = () => canG.setAttribute('transform', `translate(${pos.x - HOME.x} ${pos.y - HOME.y})`);
  canG.addEventListener('pointerdown', (e) => {
    if (!gardenOn) return;
    e.preventDefault();
    e.stopPropagation();
    // nhấc lên thì nổi trên ô "+ thùng" (đặt về chỗ cũ lại nằm dưới) — dời nút trước khi bắt con trỏ
    svgEl.insertBefore(canG, fx);
    canG.setPointerCapture?.(e.pointerId);
    canG.style.cursor = 'grabbing';
    const p0 = toSvg(e.clientX, e.clientY);
    const off = { x: pos.x - p0.x, y: pos.y - p0.y - 40 };
    sfx('pick');
    gsap.killTweensOf(pos);
    gsap.to(pos, { y: pos.y - 40, duration: 0.15, onUpdate: place });
    gsap.to(canG.querySelector('.can-shadow'), { opacity: 0, duration: 0.1 });
    gsap.to(canBody, { rotation: -38, duration: 0.3, ease: 'back.out(2)', transformOrigin: '50% 50%' });
    const streams = startStreams();
    const pour: Record<number, number> = {};
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const land = streams.update(pos.x, pos.y);
      // tia nước rơi trúng lòng đất thùng nào thì tính giờ tưới thùng đó
      POT_POS.forEach(([x, y], i) => {
        const pot = s.pots[i];
        if (!pot || !pot.seed || pot.seed === 'heo' || pot.watered || pot.ready) return;
        if (Math.abs(land.x - x) < 46 && land.y > y + gShift - 60 && land.y < y + gShift - 20) {
          pour[i] = (pour[i] ?? 0) + dt;
          if (Math.random() < 0.5) splash(fx, land.x, y + gShift - 40);
          if (pour[i] > 0.7) {
            pot.watered = true;
            sfx('splash');
            sparkles(x, y - 60 + ex() + gShift, 4, P.sky, 30);
            g.save();
            const el2 = potsG.children[i] as SVGGElement | undefined;
            if (el2) el2.innerHTML = potSvg(pot);
          }
        }
      });
    };
    gsap.ticker.add(tick);
    sfx('splash');
    const move = (ev: PointerEvent) => {
      const p = toSvg(ev.clientX, ev.clientY);
      pos.x = Math.max(70, Math.min(380, p.x + off.x));
      pos.y = Math.max(300, Math.min(760, p.y + off.y));
      place();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      gsap.ticker.remove(tick);
      streams.stop();
      canG.style.cursor = 'grab';
      gsap.to(canBody, { rotation: 0, duration: 0.25, transformOrigin: '50% 50%' });
      gsap.to(pos, { x: HOME.x, y: HOME.y, duration: 0.35, ease: 'power2.inOut', onUpdate: place, onComplete: () => { sfx('thud'); svgEl.insertBefore(canG, buyG); gsap.to(canG.querySelector('.can-shadow'), { opacity: 0.2, duration: 0.15 }); } });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });

  /** 3 tia nước cong từ đầu sen (bên trái bình) rơi xuống, có hạt nước bắn ở đầu tia. */
  const startStreams = () => {
    const gS = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    fx.appendChild(gS);
    const paths = [0, 1, 2].map((k) => {
      const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pth.setAttribute('fill', 'none');
      pth.setAttribute('stroke', k === 1 ? '#CDEBFA' : P.sky);
      pth.setAttribute('stroke-width', k === 1 ? '2.5' : '3.5');
      pth.setAttribute('stroke-linecap', 'round');
      pth.setAttribute('stroke-dasharray', '9 7');
      gS.appendChild(pth);
      return pth;
    });
    let ph = 0, on = true;
    gsap.fromTo(gS, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    return {
      update(cx: number, cy: number) {
        // đầu sen sau khi lật + nghiêng: lệch trái-trên so với tâm bình (scale 1.2)
        const nx = cx - 60, ny = cy + 2;
        ph -= 2.2;
        let land = { x: nx - 40, y: ny + 70 };
        paths.forEach((pth, k) => {
          if (!on) return;
          // 3 tia toả ra như vòi sen: bắn ngang sang trái rồi cong rơi xuống
          const reach = 18 + k * 14 + Math.sin(ph * 0.05 + k * 2) * 2;
          const ex = nx - reach, ey = ny + 62 + k * 4;
          pth.setAttribute('d', `M ${nx} ${ny} Q ${nx - reach * 1.15} ${ny - 4} ${ex} ${ey}`);
          pth.setAttribute('stroke-dashoffset', String(ph + k * 5));
          if (k === 1) land = { x: ex, y: ey };
        });
        return land;
      },
      stop() {
        on = false;
        gsap.to(gS, { opacity: 0, duration: 0.2, onComplete: () => gS.remove() });
      },
    };
  };
  const seedPicker = (i: number) => {
    const pk = document.createElement('div');
    pk.className = 'seed-picker';
    pk.innerHTML = `<div class="sp-h">Gieo hạt gì?</div>${ECON.seeds.map((sd) => `<button data-id="${sd.id}"><svg viewBox="0 0 80 80" width="44" height="44">${ICONS[sd.id]}</svg><span><b>${ICONNAME[sd.id]}</b><small>${sd.days} ngày · ra ${sd.yield}${sd.regrow ? ' · hái 3 lần' : ''}</small></span><em>${sd.price}k</em></button>`).join('')}<button class="sp-x">Thôi</button>`;
    root.appendChild(pk);
    gsap.fromTo(pk, { y: 300 }, { y: 0, duration: 0.3, ease: 'back.out(1.5)' });
    pk.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach((b) => b.addEventListener('click', () => {
      const sd = ECON.seeds.find((x) => x.id === b.dataset.id)!;
      if (s.money < sd.price) { g.toast('Không đủ tiền mua hạt.', 'bad'); return; }
      s.money -= sd.price;
      Object.assign(s.pots[i], emptyPot(), { seed: sd.id, watered: true });
      sfx('plop');
      g.save();
      pk.remove();
      renderPots();
      g.toast('Gieo xong, tưới luôn rồi. Mai nhớ tưới tiếp!', 'good');
    }));
    pk.querySelector('.sp-x')!.addEventListener('click', () => pk.remove());
  };
  renderPots();
  // đo lại khung tin theo ngọn cây vừa vẽ (và sau khi hoạt cảnh nảy thùng ngày mở vườn xong)
  fade();
  window.setTimeout(fade, 900);
  // ngày mở vườn: thùng xốp + bình tưới nảy lên (bọc <g> trong, giữ translate)
  if (gardenOn && s.day === ECON.unlocks.garden) {
    [...potsG.children, ...buyG.children, canG].forEach((c, i) => {
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      while (c.firstChild) inner.appendChild(c.firstChild);
      c.appendChild(inner);
      gsap.fromTo(inner, { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.55, delay: 0.6 + i * 0.15, ease: 'back.out(2.2)', onStart: () => sfx('pop') });
    });
  }

  root.querySelector('.phone')?.addEventListener('click', () => openPhone(g, () => g.shop?.stockChanged(), { morning: true }));
  root.querySelector('.go')!.addEventListener('click', () => {
    sfx('click');
    gsap.to(root, { y: -844, duration: 0.45, ease: 'power2.in', onComplete: () => { root.remove(); done(); } });
  });
}

const ICONNAME: Record<string, string> = { dua_leo: 'dưa leo', ca_chua: 'cà chua', nha_dam: 'nha đam', tra_xanh: 'lá trà xanh' };

/** Lời chào cạnh thẻ NGÀY: theo hạn hụi / ngày mở khoá trong economy.json, không viết cứng số ngày. */
function greeting(s: SaveState) {
  // ngắn để không rớt dòng cạnh thẻ NGÀY
  const U = ECON.unlocks, last = Math.max(...ECON.debts.map((d) => d.day));
  if (s.debts.some((d) => d.day === s.day && !s.debtsPaid.includes(d.day))) return s.day >= last ? 'Ngày cuối, trả hụi!' : 'Hạn hụi tới rồi đó!';
  if (s.day === U.si) return 'Mối Sỉ nhắn mời chào…';
  if (s.day === U.live) return 'Tiệm lên nhóm Zalo!';
  if (s.day === last - 1) return 'Sắp hết chương rồi!';
  const pool = ['Hàng xóm hỏi thăm.', 'Tiệm có tiếng rồi nha.', 'Khách quen quay lại.', 'Tin đồn lan khắp hẻm.', 'Ngày mới, mẻ mới.'];
  return pool[Math.max(0, s.day - 2) % pool.length];
}

function flyProduce(root: HTMLElement, id: string, x: number, y: number, k: number) {
  const d = document.createElement('div');
  d.className = 'produce';
  d.innerHTML = `<svg viewBox="0 0 80 80" width="40" height="40">${ICONS[id]}</svg>`;
  d.style.left = `${x - 20}px`;
  d.style.top = `${y - 20 + ex()}px`;
  root.appendChild(d);
  gsap.timeline({ onComplete: () => d.remove() })
    .to(d, { y: -60 - k * 10, x: (k - 1) * 30, rotation: 180, duration: 0.3, ease: 'power2.out' })
    .to(d, { y: 330, x: 0, scale: 0.5, duration: 0.45, ease: 'power2.in' });
}

function balconySvg(day: number): string {
  void day;
  return `
  <defs>
    <pattern id="pt-sleeve2" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#5BB6E8"/><circle cx="6" cy="6" r="3" fill="#fff"/><circle cx="15" cy="15" r="2.4" fill="${P.pink}"/></pattern>
    <pattern id="pt-tile2" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#D9945A"/><rect width="40" height="40" fill="none" stroke="#A9663A" stroke-width="2"/><path d="M0 20 H40 M20 0 V40" stroke="#C4824C" stroke-width="1"/></pattern>
  </defs>
  <rect y="-500" width="390" height="1344" fill="#9ED8F5"/>
  <circle cx="320" cy="110" r="38" fill="#FFE07A"/><circle cx="320" cy="110" r="52" fill="#FFE07A" opacity=".3"/>
  ${cloudSvg(150, 1, 70)}${cloudSvg(72, 0.62, 95)}${cloudSvg(196, 0.8, 80)}
  <!-- nhà hàng xóm + cột điện -->
  <rect x="-10" y="190" width="160" height="230" fill="#FFB5C8" stroke="${P.ink}" stroke-width="3"/>
  <g id="mo-pinkwin"><rect x="20" y="220" width="40" height="46" fill="#7FB8D9" stroke="${P.ink}" stroke-width="2.5"/><rect class="cb-win" x="88" y="220" width="40" height="46" fill="#7FB8D9" stroke="${P.ink}" stroke-width="2.5"/>
    <!-- chị Bảy thò đầu cửa sổ nhà hồng -->
    <clipPath id="clip-cb"><rect x="88" y="220" width="40" height="46"/></clipPath><g clip-path="url(#clip-cb)"><g id="chi-bay"></g></g></g>
  <rect x="250" y="230" width="160" height="200" fill="#FFD37A" stroke="${P.ink}" stroke-width="3"/>
  <g id="mo-yellowwin"><rect x="280" y="260" width="34" height="40" fill="#7FB8D9" stroke="${P.ink}" stroke-width="2.5"/></g>
  <path d="M 196 120 V 420" stroke="#7E8B94" stroke-width="10"/><path d="M 176 140 H 216" stroke="#7E8B94" stroke-width="6"/>
  <path d="M 0 150 Q 100 190 196 140 Q 290 180 390 150" stroke="${P.ink}" stroke-width="2" fill="none"/>
  <path d="M 0 162 Q 110 210 196 150 Q 300 200 390 166" stroke="${P.ink}" stroke-width="2" fill="none"/>
  <!-- dây phơi đồ -->
  <path d="M -4 300 Q 195 340 394 296" stroke="${P.ink}" stroke-width="2.5" fill="none"/>
  <g class="sway" transform="translate(60 312) rotate(4)"><path d="M -24 0 h 48 l 8 16 l -10 4 v 40 h -36 v -40 l -10 -4 z" fill="url(#pt-sleeve2)" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/></g>
  <g class="sway" transform="translate(140 324) rotate(1)"><path d="M -16 0 h 32 v 52 l -8 0 l -8 -30 l -8 30 h -8 z" fill="url(#pt-sleeve2)" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/></g>
  <g class="sway" transform="translate(250 320) rotate(-3)"><path d="M -20 0 h 40 v 30 q -20 10 -40 0 z" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2.5"/></g>
  <g class="sway" transform="translate(330 306) rotate(-6)"><rect x="-14" y="0" width="28" height="36" fill="${P.red}" stroke="${P.ink}" stroke-width="2.5"/></g>
  <!-- sàn ban công -->
  <rect x="0" y="400" width="390" height="444" fill="url(#pt-tile2)"/>
  <path d="M 0 400 H 390" stroke="${P.ink}" stroke-width="3"/>
  <!-- lan can sắt -->
  <path d="M 0 380 H 390" stroke="${P.blue}" stroke-width="8"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M ${14 + i * 28} 380 V 404" stroke="${P.blue}" stroke-width="5"/>`).join('')}
  <path d="M 0 380 H 390" stroke="${P.ink}" stroke-width="2" opacity=".5"/>
  <!-- bồn nước inox trên mái nhà vàng -->
  <g id="mo-tank" transform="translate(330 196)"><rect x="-34" y="-30" width="68" height="40" rx="18" fill="${P.steel}" stroke="${P.ink}" stroke-width="3"/><path d="M -30 -18 H 30 M -30 -4 H 30" stroke="${P.steelDark}" stroke-width="2"/><path d="M -24 10 V 34 M 24 10 V 34" stroke="${P.ink}" stroke-width="4"/></g>
  <!-- ghế nhựa đỏ + dép tổ ong + chổi + mèo ngủ -->
  <g transform="translate(316 734)"><path d="M -30 -40 H 30 L 26 -30 H -26 Z" fill="${P.red}" stroke="${P.ink}" stroke-width="3"/><path d="M -24 -30 L -30 20 M 24 -30 L 30 20 M -10 -30 L -12 20 M 10 -30 L 12 20" stroke="${P.red}" stroke-width="7"/><path d="M -24 -30 L -30 20 M 24 -30 L 30 20" stroke="${P.ink}" stroke-width="2" opacity=".4"/>
    <g class="cat-sleep" transform="translate(0 -46)"><path d="M -30 0 C -30 -22 30 -22 30 0 Z" fill="#F2A65A" stroke="${P.ink}" stroke-width="3"/><path d="M -26 -6 l -6 -12 l 12 6 M -12 -10" fill="#F2A65A" stroke="${P.ink}" stroke-width="2.5"/><path d="M -20 -8 q 4 3 8 0" stroke="${P.ink}" stroke-width="2" fill="none"/><path d="M 30 0 q 14 -2 10 -14" stroke="${P.ink}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M 30 0 q 14 -2 10 -14" stroke="#F2A65A" stroke-width="4" fill="none" stroke-linecap="round"/>
      <text class="zzz" x="-10" y="-26" font-family="Paytone One" font-size="12" fill="${P.ink}">z</text></g></g>
  <g id="slippers"><g transform="translate(36 720) rotate(-8)"><ellipse cx="0" cy="0" rx="12" ry="22" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2.5"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${i % 2 ? 4 : -4}" cy="${-14 + i * 6}" r="2.6" fill="${P.steel}"/>`).join('')}<rect x="-10" y="-8" width="20" height="5" fill="${P.blue}"/></g>
  <g transform="translate(62 726) rotate(10)"><ellipse cx="0" cy="0" rx="12" ry="22" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2.5"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${i % 2 ? 4 : -4}" cy="${-14 + i * 6}" r="2.6" fill="${P.steel}"/>`).join('')}<rect x="-10" y="-8" width="20" height="5" fill="${P.blue}"/></g></g>
`;
}

/** Mây theo Figma: trắng trơn, đáy phẳng, 3 múi thấp (~110×35). Bọc <g> ngoài giữ vị trí, <g class="cloud"> trong để GSAP tween x. */
function cloudSvg(y: number, sc: number, sp: number): string {
  return `<g transform="translate(0 ${y}) scale(${sc})"><g class="cloud" data-sp="${sp}" fill="#FFFFFF">
    <circle cx="-34" cy="-8" r="14"/><circle cx="-6" cy="-14" r="20"/><circle cx="26" cy="-11" r="17"/>
    <rect x="-55" y="-14" width="110" height="18" rx="9"/></g></g>`;
}

/** Chổi dựa góc lan can trái (V3-02/V3-13: nằm sau lớp thùng, đầu chổi sát mép trái → không đụng thẻ HÁI! / ô "+ thùng").
 * V7-03: cán tựa ngay thanh lan can, đầu chổi nằm giữa 2 hàng thùng → cách ô "+ thùng" hàng dưới ≥ 8px. */
function frontSvg(): string {
  return `
  <g transform="translate(10 370) rotate(5)" pointer-events="none">
    <path d="M 0 0 V 126" stroke="${P.ink}" stroke-width="10" stroke-linecap="round"/>
    <path d="M 0 0 V 126" stroke="${P.blue}" stroke-width="5" stroke-linecap="round"/>
    <path d="M -1 6 V 118" stroke="#8FC9F0" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M -18 130 L 18 130 L 25 184 L -25 184 Z" fill="#E8C34A" ${ink()}/>
    <path d="M -12 140 L -16 180 M -4 140 L -5 181 M 4 140 L 5 181 M 12 140 L 16 180" stroke="#B8942A" stroke-width="2"/>
    <rect x="-11" y="122" width="22" height="11" rx="3" fill="${P.blueDark}" ${ink(2.5)}/>
  </g>`;
}

function buyPotSvg() {
  // ô mua thùng: nền giấy ĐẶC (V2-11: chổi / vạch gạch không lộ qua) + viền đứt + chữ mực → đọc rõ trên nền gạch cam (nằm trên chổi)
  return `<g><path d="M -48 -30 H 48 L 42 30 H -42 Z" fill="#FFF8E6" stroke="${P.ink}" stroke-width="2.5" stroke-dasharray="7 6"/>
    <text y="-2" font-family="Paytone One" font-size="14" fill="${P.ink}" text-anchor="middle">+ thùng</text>
    <text y="16" font-family="Paytone One" font-size="11" fill="${P.ink}" text-anchor="middle">${ECON.potPrice}k</text></g>`;
}

function potSvg(p: Pot): string {
  // theo Figma: thân thùng + đai trên + vành nắp hình thang + lòng đất chữ nhật
  const box = `<path d="M -50 -30 H 50 L 44 32 H -44 Z" fill="#F7F5F0" ${ink()}/>
    <path d="M -50 -30 H 50 V -20 H -50 Z" fill="#E4E0D6" ${ink(2)}/>
    <path d="M -46 -47 H 46 L 50 -31 H -50 Z" fill="#E4E0D6" ${ink(2)}/>
    <path d="M -42.6 -43 H 42.6 L 44 -35 H -44 Z" fill="#7A4A2A" ${ink(2)}/>
    <path d="M -40 -8 L -38 24 M -20 -8 L -19 24 M 0 -8 V 24 M 20 -8 L 19 24 M 40 -8 L 38 24" stroke="#E4E0D6" stroke-width="2"/>
    <text x="0" y="16" font-family="Paytone One" font-size="9" fill="#C9C1B0" text-anchor="middle">THÙNG XỐP</text>`;
  let plant = '';
  const status = !p.seed ? 'gieo hạt' : p.seed === 'heo' ? 'héo rồi' : p.ready ? 'HÁI!' : p.watered ? 'đã tưới' : 'cần tưới';
  if (p.seed === 'heo') {
    plant = `<path d="M 0 -32 q -4 -20 -20 -22 M 0 -32 q 6 -16 18 -12" stroke="#8A6A3A" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M -20 -54 q -10 4 -12 14 q 10 -2 12 -14 z M 18 -44 q 12 2 12 12 q -10 0 -12 -12 z" fill="#B0905A" ${ink(1.5)}/>`;
  } else if (p.seed) {
    const seed = ECON.seeds.find((x) => x.id === p.seed)!;
    const k = p.ready ? 1 : Math.min(0.85, (p.age + 0.4) / seed.days);
    const h = 18 + k * 64;
    const B = -39; // gốc cây = tâm ô đất trên miệng thùng (đất y -43..-35)
    const L = 16 + k * 14; // dài lá
    plant = `<path d="M 0 ${B} C -3 ${B - h * 0.4} 3 ${B - h * 0.7} 0 ${B - h}" stroke="${P.ink}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M 0 ${B} C -3 ${B - h * 0.4} 3 ${B - h * 0.7} 0 ${B - h}" stroke="${P.greenDark}" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${leafSvg(0, B - h * 0.32, 22, L, -1)}${leafSvg(0, B - h * 0.38, 26, L, 1)}
      ${k > 0.35 ? leafSvg(0, B - h * 0.62, 30, L * 0.9, -1) + leafSvg(0, B - h * 0.68, 34, L * 0.9, 1) : ''}
      ${leafSvg(0, B - h, 58, L * 0.62, -1)}${leafSvg(0, B - h, 62, L * 0.62, 1)}`;
    if (p.ready) {
      plant += [[-22, B - h * 0.45], [22, B - h * 0.55], [0, B - h - 8]].map(([x, y]) => `<svg x="${x - 18}" y="${y - 18}" width="36" height="36" viewBox="0 0 80 80">${ICONS[seed.id]}</svg>`).join('');
    }
  }
  const tagC = status === 'HÁI!' ? P.yellow : status === 'cần tưới' ? '#9ED8F5' : status === 'héo rồi' ? '#D9B48A' : P.paperHi;
  return `${box}${plant}<g transform="translate(0 44) rotate(-3)"><rect x="-34" y="-11" width="68" height="20" rx="5" fill="${tagC}" ${ink(2)}/><text y="4" font-family="Paytone One" font-size="11" fill="${P.ink}" text-anchor="middle">${status}</text></g>`;
}

/** Lá có khối: nửa trên sáng, nửa dưới tối, gân giữa, viền mực. Gốc (x,y), nghiêng ang độ lên trên, flip=-1 mọc sang trái. */
function leafSvg(x: number, y: number, ang: number, len: number, flip: number): string {
  const w = len * 0.34;
  const shape = `M 0 0 C ${len * 0.25} ${-w} ${len * 0.75} ${-w} ${len} 0 C ${len * 0.75} ${w} ${len * 0.25} ${w} 0 0 Z`;
  return `<g transform="translate(${x} ${y}) scale(${flip} 1) rotate(${-ang})">
    <path d="${shape}" fill="#7CCB5F"/>
    <path d="M 0 0 C ${len * 0.25} ${w} ${len * 0.75} ${w} ${len} 0 Z" fill="${P.green}"/>
    <path d="M 0 0 C ${len * 0.25} ${w} ${len * 0.75} ${w} ${len} 0" fill="none" stroke="${P.greenDark}" stroke-width="2" opacity=".55" transform="translate(0 ${-w * 0.25})"/>
    <path d="M 2 0 Q ${len * 0.5} ${-w * 0.15} ${len * 0.92} 0" stroke="${P.greenDark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="${shape}" fill="none" ${ink(2)}/></g>`;
}

const CAN_X = 196, CAN_Y = 724;
/** Bình tưới đặt trên sàn, lật ngang cho vòi chĩa sang trái. .can-body xoay quanh tâm bình khi nhấc. */
const CAN_HOME = `<g transform="translate(${CAN_X} ${CAN_Y})"><ellipse class="can-shadow" cx="-2" cy="28" rx="40" ry="7" fill="${P.ink}" opacity=".2"/><g class="can-body"><g transform="scale(-1.2 1.2)">${canSvg()}</g></g></g>`;

/** Lấm tấm nước bắn lên ở chỗ tia nước rơi. */
function splash(fx: SVGGElement, x: number, y: number) {
  const d = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  d.setAttribute('cx', String(x)); d.setAttribute('cy', String(y)); d.setAttribute('r', '2.4');
  d.setAttribute('fill', P.sky); d.setAttribute('stroke', P.blueDark); d.setAttribute('stroke-width', '1');
  fx.appendChild(d);
  gsap.to(d, { attr: { cx: x + (Math.random() - 0.5) * 30, cy: y - 8 - Math.random() * 10 }, opacity: 0, duration: 0.35, ease: 'power1.out', onComplete: () => d.remove() });
}

/** Hàng xóm cửa sổ đối diện: ló ra nhìn, chạm thì thụt xuống trốn, lát sau lại ló. Sắp tới hạn hụi thì mặt quạu. */
function peekNeighbor(root: HTMLElement, day: number) {
  void day;
  const cb = root.querySelector('#chi-bay') as SVGGElement;
  const angry = !!root.dataset.debtSoon;
  const face = angry ? 'face-angry' : 'face-idle';
  cb.innerHTML = `<g class="cb-in" style="cursor:pointer">${beanSvg({ color: '#F7D046', acc: ['toc_uon', 'vong_vang'] as Accessory[] }).replace(`${face}" style="display:none"`, `${face}"`)}</g>`;
  cb.setAttribute('transform', 'translate(108 300) scale(.36)');
  const inner = cb.querySelector('.cb-in') as SVGGElement;
  // V2-10: ô cửa sổ bị thẻ tin / nhãn "còn N thẻ" / câu chào che quá 1/3 thì chị Bảy không ló đầu (khỏi lòi mắt giữa 2 thẻ)
  const win = cb.closest('g[clip-path]') as SVGGElement | null;
  const winCovered = () => {
    const pw = win?.ownerSVGElement?.querySelector('#mo-pinkwin') as SVGGElement | null;
    if (pw && pw.style.visibility === 'hidden') return true;
    const cr = win?.ownerSVGElement?.querySelector('.cb-win') as SVGRectElement | null;
    if (!cr) return false;
    const r = cr.getBoundingClientRect();
    let cov = 0;
    for (const e of root.querySelectorAll('.mo-news, .mo-more:not([hidden]), .mo-head')) {
      const q = e.getBoundingClientRect();
      if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) cov = Math.max(cov, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
    }
    return cov > r.height / 3;
  };
  let hidden = true, timer = 0;
  const show = () => {
    if (!root.isConnected) return;
    // máy ngắn: cửa sổ nhà hồng nằm sau thẻ NGÀY / thanh tin (hoặc đã ẩn — V7-04) → không ló đầu ra để bị che mặt
    if (winCovered()) { timer = window.setTimeout(show, 3000); return; }
    hidden = false;
    gsap.to(inner, { y: 0, duration: 0.5, ease: 'back.out(2)' });
  };
  const hide = () => {
    hidden = true;
    sfx('tick');
    gsap.to(inner, { y: 210, duration: 0.22, ease: 'power2.in' });
    window.clearTimeout(timer);
    timer = window.setTimeout(show, 3500 + Math.random() * 4000);
  };
  gsap.set(inner, { y: 210 });
  timer = window.setTimeout(show, 600);
  cb.closest('g[clip-path]')?.setAttribute('style', 'cursor:pointer');
  inner.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!hidden) hide(); });
}

/** Bình tưới xanh lá. Vẽ vòi hướng lên phải, đầu sen ~(47,-24); bình trên sàn lật ngang bằng scale(-1). */
function canSvg() {
  return `<g>
    <path d="M -20 -8 C -40 -10 -40 -36 -12 -28" stroke="${P.ink}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M -20 -8 C -40 -10 -40 -36 -12 -28" stroke="${P.greenDark}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M 14 6 L 42 -20" stroke="${P.ink}" stroke-width="10" stroke-linecap="round"/>
    <path d="M 14 6 L 42 -20" stroke="${P.green}" stroke-width="5" stroke-linecap="round"/>
    <g transform="rotate(-42 46 -24)"><rect x="40" y="-33" width="12" height="18" rx="3" fill="${P.greenDark}" ${ink(2.5)}/><path d="M 43 -27 H 49 M 43 -21 H 49" stroke="#9BDB7E" stroke-width="1.6"/></g>
    <path d="M -22 22 L -19 -12 Q 0 -19 19 -12 L 22 22 Q 0 28 -22 22 Z" fill="${P.green}" ${ink()}/>
    <path d="M 9 -15 Q 15 -14 19 -12 L 22 22 Q 16 24.5 10 25.5 Z" fill="${P.greenDark}" opacity=".55"/>
    <path d="M -13 -4 L -12 15" stroke="#9BDB7E" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-13" rx="17" ry="4" fill="${P.greenDark}" ${ink(2.5)}/>
    <path d="M -18 6 Q 0 11 20 6" stroke="${P.greenDark}" stroke-width="2" fill="none"/>
  </g>`;
}

/** Hình nhỏ cho thẻ MỚI (tâm 0,0, khung 60). */
function newIcon(k: string): string {
  const S = `stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  switch (k) {
    case 'mortar': return `<path d="M -20 0 Q -18 20 0 21 Q 18 20 20 0 Z" fill="#A79B90" ${S}/><ellipse cx="0" cy="0" rx="20" ry="6" fill="#8A7E74" ${S}/><rect x="4" y="-26" width="8" height="26" rx="4" fill="#C9B9A8" transform="rotate(25 8 -13)" ${S}/>`;
    case 'phone': return `<path d="M -20 18 L -15 -2 H 15 L 20 18 Z" fill="${P.teal}" ${S}/><circle cy="9" r="7" fill="${P.paperHi}" ${S}/><path d="M -22 -6 C -22 -16 -14 -18 -10 -12 H 10 C 14 -18 22 -16 22 -6 C 22 -2 14 -2 12 -6 H -12 C -14 -2 -22 -2 -22 -6 Z" fill="${P.teal}" ${S}/>`;
    case 'live': return `<rect x="-11" y="-24" width="22" height="34" rx="4" fill="#4A3732" ${S}/><rect x="-8" y="-20" width="11" height="6" rx="1" fill="${P.red}"/><path d="M 0 10 V 16 M 0 16 L -12 26 M 0 16 L 12 26 M 0 16 V 26" ${S} fill="none"/><circle cy="-6" r="16" fill="none" stroke="#FFF7C2" stroke-width="3"/>`;
    case 'garden': return `<path d="M -18 4 H 18 L 15 22 H -15 Z" fill="#F7F5F0" ${S}/><path d="M 0 4 V -10" ${S} fill="none"/><path d="M 0 -6 C -14 -8 -16 -20 -4 -18 C -2 -14 0 -10 0 -6 Z M 0 -10 C 12 -14 16 -24 4 -24 C 2 -18 0 -14 0 -10 Z" fill="${P.green}" ${S}/>`;
    case 'blender': return `<path d="M -12 -24 H 12 L 9 6 H -9 Z" fill="#DDF1FF" fill-opacity=".8" ${S}/><rect x="-14" y="6" width="28" height="18" rx="4" fill="${P.pink}" ${S}/><circle cy="15" r="4" fill="${P.red}" ${S}/><path d="M -8 -6 L 8 -10 M -8 -10 L 8 -6" ${S} fill="none"/>`;
    case 'book': return `<path d="M -16 -22 L 14 -24 L 16 22 L -14 24 Z" fill="${P.red}" ${S}/><rect x="-9" y="-14" width="16" height="14" rx="2" fill="${P.paperHi}" ${S}/><path d="M 8 22 l 0 6 l 3 -2 l 3 2 l 0 -6" fill="${P.yellow}" ${S}/>`;
    case 'stove': return `<rect x="-22" y="4" width="44" height="16" rx="3" fill="#5A5560" ${S}/><path d="M -10 4 C -12 -6 -4 -10 -6 -18 C 2 -12 4 -8 2 -2 C 6 -6 8 -10 8 -14 C 14 -6 12 0 10 4 Z" fill="#FF9F4A" ${S}/><circle cx="14" cy="12" r="4" fill="${P.yellow}" ${S}/>`;
    case 'si': return `<path d="M -20 -12 L 0 -20 L 20 -12 V 14 L 0 22 L -20 14 Z" fill="#D9A866" ${S}/><path d="M -20 -12 L 0 -4 L 20 -12 M 0 -4 V 22" ${S} fill="none"/><text x="-10" y="12" font-family="Paytone One" font-size="11" fill="${P.purple}" text-anchor="middle">SỈ</text>`;
  }
  return '';
}
