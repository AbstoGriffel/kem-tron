import { gsap } from 'gsap';
import { beanSvg, type Accessory } from '../art/bean';
import { ICONS } from '../art/icons';
import { ink, P } from '../art/kit';
import type { MorningNews } from '../core/day';
import { ECON, emptyPot, nextDebt, unlocked, type Pot } from '../core/state';
import { sfx } from './audio';
import { sparkles } from './fx';
import type { Game } from './game';
import { openPhone } from './phone';
import { settingsGear } from './title';

const POT_POS: [number, number][] = [[70, 470], [195, 470], [320, 470], [70, 610], [195, 610], [320, 610]];

/** Buổi sáng trên ban công: tin tức, vườn, gọi mối, rồi xuống mở tiệm. */
export function showMorning(g: Game, news: MorningNews | null, done: () => void) {
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'morning';
  g.modal.appendChild(root);
  const gardenOn = unlocked(s, 'garden');
  root.innerHTML = `
    <svg class="balcony" viewBox="0 0 390 844" width="390" height="844">${balconySvg(s.day)}<g id="pots"></g>${frontSvg()}<g id="water-fx"></g><g id="can-g" style="cursor:grab">${CAN_HOME}</g></svg>
    <div class="mo-head"><span class="mo-day">NGÀY ${s.day}</span><span class="mo-sub">${s.day === 1 ? 'Ngày đầu mở tiệm!' : greeting(s.day)}</span></div>
    <div class="mo-news"></div>
    <div class="mo-actions">
      ${unlocked(s, 'phone') ? '<button class="mo-btn phone">Gọi mối nhập hàng</button>' : ''}
      <button class="mo-btn go">Xuống mở tiệm →</button>
    </div>`;
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.35 });
  settingsGear(root);
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
  const newsEl = root.querySelector('.mo-news') as HTMLElement;

  // ---- tin buổi sáng
  const cards: string[] = [];
  const debt = nextDebt(s);
  if (debt) cards.push(`<div class="mo-card debt"><b>${debt.name}</b> ${debt.amount}k — hạn cuối ngày ${debt.day}${debt.day === s.day ? ' (HÔM NAY!)' : ''}. Đang có ${Math.round(s.money)}k.</div>`);
  if (news?.late.length) {
    for (const l of news.late) cards.push(`<div class="mo-card late"><svg viewBox="-75 -230 150 240" width="36" height="58">${beanSvg({ color: '#F2675A', acc: l.acc as Accessory[] }).replace('face-sick" style="display:none"', 'face-sick"')}</svg><span><b>${l.who}</b> quay lại ★☆☆☆☆ "${l.text}" <em>hoàn ${l.refund}k</em></span></div>`);
  }
  if (s.day === ECON.unlocks.garden) cards.push(`<div class="mo-card new">MỚI: <b>Vườn ban công</b> — gieo hạt, tưới mỗi sáng, hái miễn phí.</div>`);
  if (s.day === ECON.unlocks.live) cards.push(`<div class="mo-card new">MỚI: <b>Livestream</b> — chạm cái điện thoại trên chân máy để lên sóng.</div>`);
  if (s.day === ECON.unlocks.mortar) cards.push(`<div class="mo-card new">MỚI: <b>Cối đá</b> — thả đồ vô cối, gõ 5 nhát để nghiền (mạnh ×1,5).</div>`);
  if (s.day === ECON.unlocks.phone) cards.push(`<div class="mo-card new">MỚI: <b>Gọi mối</b> — nhập hàng, nhớ trả giá kiểu giả vờ cúp máy.</div>`);
  if (s.day === ECON.unlocks.blender) cards.push(`<div class="mo-card new">MỚI: <b>Máy xay</b> (xoá chỉ số âm, +1 Mịn) + <b>Sổ bí kíp</b> (lưu công thức, đơn online lấy từ đây).</div>`);
  if (s.day === ECON.unlocks.stove) cards.push(`<div class="mo-card new">MỚI: <b>Bếp ga</b> (đun: Độc ÷2, mất Che nắng) + <b>Shop Sỉ</b> hàng siêu rẻ… và chú Quản Lý bắt đầu để ý.</div>`);
  if (news?.harvestReady) cards.push(`<div class="mo-card good">Vườn có <b>${news.harvestReady}</b> thùng chín, hái đi!</div>`);
  newsEl.innerHTML = cards.join('');
  newsEl.querySelectorAll('.mo-card').forEach((c, i) => gsap.fromTo(c, { x: -380 }, { x: 0, duration: 0.35, delay: 0.2 + i * 0.12, ease: 'back.out(1.5)' }));
  if (news?.late.length) setTimeout(() => sfx('angry'), 400);

  // ---- vườn
  const renderPots = () => {
    potsG.innerHTML = '';
    if (!gardenOn) {
      potsG.innerHTML = [70, 195].map((x) => `<g transform="translate(${x} 520)">
          <path d="M -50 -30 H 50 L 44 32 H -44 Z" fill="#F7F5F0" ${ink()}/>
          <path d="M -58 -34 Q 0 -60 58 -34 L 52 -6 Q 0 6 -52 -6 Z" fill="#2F7FD8" ${ink()}/>
          <path d="M -40 -30 q 20 -10 40 -6 M 0 -38 q 20 -6 36 2" stroke="#8FC9F0" stroke-width="3" fill="none"/>
        </g>`).join('') + `<g transform="translate(300 492)">
          <ellipse cx="0" cy="96" rx="18" ry="5" fill="${P.ink}" opacity=".22"/>
          <path d="M -8 94 l -6 4 M 8 94 l 7 3 M 0 96 v 5" stroke="${P.woodDark}" stroke-width="2" stroke-linecap="round"/>
          <g transform="rotate(-5 0 94)">
            <rect x="-5" y="20" width="10" height="76" rx="2" fill="${P.red}" ${ink(2.5)}/>
            <path d="M -1 36 V 88" stroke="#FF8A7E" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="-62" y="-30" width="124" height="62" rx="4" fill="${P.paperHi}" ${ink()}/>
            <circle cx="0" cy="-20" r="3" fill="${P.steelDark}" ${ink(1.5)}/>
            <text y="-1" font-family="Baloo 2" font-weight="800" font-size="15" fill="${P.blueDark}" text-anchor="middle">Vườn rau</text>
            <text y="20" font-family="Baloo 2" font-weight="800" font-size="15" fill="${P.red}" text-anchor="middle">mở ngày ${ECON.unlocks.garden}!</text>
          </g></g>`;
      return;
    }
    POT_POS.forEach(([x, y], i) => {
      const pot = s.pots[i];
      if (!pot && i > s.pots.length) return;
      const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g2.setAttribute('transform', `translate(${x} ${y})`);
      g2.style.cursor = 'pointer';
      g2.innerHTML = pot ? potSvg(pot) : buyPotSvg();
      g2.addEventListener('pointerdown', (e) => { e.stopPropagation(); potTap(i, g2); });
      potsG.appendChild(g2);
    });
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
      sparkles(POT_POS[i][0], POT_POS[i][1] - 60, 5, P.yellow, 40);
      for (let k = 0; k < seed.yield; k++) flyProduce(root, seed.id, POT_POS[i][0], POT_POS[i][1] - 60, k);
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
        if (Math.abs(land.x - x) < 46 && land.y > y - 60 && land.y < y - 20) {
          pour[i] = (pour[i] ?? 0) + dt;
          if (Math.random() < 0.5) splash(fx, land.x, y - 40);
          if (pour[i] > 0.7) {
            pot.watered = true;
            sfx('splash');
            sparkles(x, y - 60, 4, P.sky, 30);
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
      gsap.to(pos, { x: HOME.x, y: HOME.y, duration: 0.35, ease: 'power2.inOut', onUpdate: place, onComplete: () => { sfx('thud'); gsap.to(canG.querySelector('.can-shadow'), { opacity: 0.2, duration: 0.15 }); } });
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

  root.querySelector('.phone')?.addEventListener('click', () => openPhone(g, () => g.shop?.stockChanged(), { morning: true }));
  root.querySelector('.go')!.addEventListener('click', () => {
    sfx('click');
    gsap.to(root, { y: -844, duration: 0.45, ease: 'power2.in', onComplete: () => { root.remove(); done(); } });
  });
}

const ICONNAME: Record<string, string> = { dua_leo: 'dưa leo', ca_chua: 'cà chua', nha_dam: 'nha đam', tra_xanh: 'lá trà xanh' };

function greeting(day: number) {
  // ngắn để không rớt dòng cạnh thẻ NGÀY
  return ['', '', 'Hàng xóm hỏi thăm.', 'Tiệm lên nhóm Zalo!', 'Mối Sỉ nhắn mời chào…', 'Hạn hụi tới rồi đó!', 'Tiệm có tiếng rồi nha.', 'Khách quen quay lại.', 'Tin đồn lan khắp hẻm.', 'Sắp hết chương rồi!', 'Ngày cuối, trả hụi!'][day] ?? 'Ngày mới, mẻ mới.';
}

function flyProduce(root: HTMLElement, id: string, x: number, y: number, k: number) {
  const d = document.createElement('div');
  d.className = 'produce';
  d.innerHTML = `<svg viewBox="0 0 80 80" width="40" height="40">${ICONS[id]}</svg>`;
  d.style.left = `${x - 20}px`;
  d.style.top = `${y - 20}px`;
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
  <rect width="390" height="844" fill="#9ED8F5"/>
  <circle cx="320" cy="110" r="38" fill="#FFE07A"/><circle cx="320" cy="110" r="52" fill="#FFE07A" opacity=".3"/>
  ${cloudSvg(150, 1, 70)}${cloudSvg(72, 0.62, 95)}${cloudSvg(196, 0.8, 80)}
  <!-- nhà hàng xóm + cột điện -->
  <rect x="-10" y="190" width="160" height="230" fill="#FFB5C8" stroke="${P.ink}" stroke-width="3"/>
  <rect x="20" y="220" width="40" height="46" fill="#7FB8D9" stroke="${P.ink}" stroke-width="2.5"/><rect x="88" y="220" width="40" height="46" fill="#7FB8D9" stroke="${P.ink}" stroke-width="2.5"/>
  <rect x="250" y="230" width="160" height="200" fill="#FFD37A" stroke="${P.ink}" stroke-width="3"/>
  <rect x="280" y="260" width="34" height="40" fill="#7FB8D9" stroke="${P.ink}" stroke-width="2.5"/>
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
  <g transform="translate(330 196)"><rect x="-34" y="-30" width="68" height="40" rx="18" fill="${P.steel}" stroke="${P.ink}" stroke-width="3"/><path d="M -30 -18 H 30 M -30 -4 H 30" stroke="${P.steelDark}" stroke-width="2"/><path d="M -24 10 V 34 M 24 10 V 34" stroke="${P.ink}" stroke-width="4"/></g>
  <!-- chị Bảy thò đầu cửa sổ nhà hồng -->
  <clipPath id="clip-cb"><rect x="88" y="220" width="40" height="46"/></clipPath><g clip-path="url(#clip-cb)"><g id="chi-bay"></g></g>
  <!-- ghế nhựa đỏ + dép tổ ong + chổi + mèo ngủ -->
  <g transform="translate(316 734)"><path d="M -30 -40 H 30 L 26 -30 H -26 Z" fill="${P.red}" stroke="${P.ink}" stroke-width="3"/><path d="M -24 -30 L -30 20 M 24 -30 L 30 20 M -10 -30 L -12 20 M 10 -30 L 12 20" stroke="${P.red}" stroke-width="7"/><path d="M -24 -30 L -30 20 M 24 -30 L 30 20" stroke="${P.ink}" stroke-width="2" opacity=".4"/>
    <g class="cat-sleep" transform="translate(0 -46)"><path d="M -30 0 C -30 -22 30 -22 30 0 Z" fill="#F2A65A" stroke="${P.ink}" stroke-width="3"/><path d="M -26 -6 l -6 -12 l 12 6 M -12 -10" fill="#F2A65A" stroke="${P.ink}" stroke-width="2.5"/><path d="M -20 -8 q 4 3 8 0" stroke="${P.ink}" stroke-width="2" fill="none"/><path d="M 30 0 q 14 -2 10 -14" stroke="${P.ink}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M 30 0 q 14 -2 10 -14" stroke="#F2A65A" stroke-width="4" fill="none" stroke-linecap="round"/>
      <text class="zzz" x="-10" y="-26" font-family="Paytone One" font-size="12" fill="${P.ink}">z</text></g></g>
  <g transform="translate(36 720) rotate(-8)"><ellipse cx="0" cy="0" rx="12" ry="22" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2.5"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${i % 2 ? 4 : -4}" cy="${-14 + i * 6}" r="2.6" fill="${P.steel}"/>`).join('')}<rect x="-10" y="-8" width="20" height="5" fill="${P.blue}"/></g>
  <g transform="translate(62 726) rotate(10)"><ellipse cx="0" cy="0" rx="12" ry="22" fill="#FFFFFF" stroke="${P.ink}" stroke-width="2.5"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${i % 2 ? 4 : -4}" cy="${-14 + i * 6}" r="2.6" fill="${P.steel}"/>`).join('')}<rect x="-10" y="-8" width="20" height="5" fill="${P.blue}"/></g>
`;
}

/** Mây theo Figma: trắng trơn, đáy phẳng, 3 múi thấp (~110×35). Bọc <g> ngoài giữ vị trí, <g class="cloud"> trong để GSAP tween x. */
function cloudSvg(y: number, sc: number, sp: number): string {
  return `<g transform="translate(0 ${y}) scale(${sc})"><g class="cloud" data-sp="${sp}" fill="#FFFFFF">
    <circle cx="-34" cy="-8" r="14"/><circle cx="-6" cy="-14" r="20"/><circle cx="26" cy="-11" r="17"/>
    <rect x="-55" y="-14" width="110" height="18" rx="9"/></g></g>`;
}

/** Lớp trước thùng xốp: chổi dựa lan can trái + bình tưới đặt giữa sàn. */
function frontSvg(): string {
  return `
  <g transform="translate(10 428) rotate(-8)" pointer-events="none">
    <path d="M 0 0 V 126" stroke="${P.ink}" stroke-width="10" stroke-linecap="round"/>
    <path d="M 0 0 V 126" stroke="${P.blue}" stroke-width="5" stroke-linecap="round"/>
    <path d="M -1 6 V 118" stroke="#8FC9F0" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M -18 130 L 18 130 L 25 184 L -25 184 Z" fill="#E8C34A" ${ink()}/>
    <path d="M -12 140 L -16 180 M -4 140 L -5 181 M 4 140 L 5 181 M 12 140 L 16 180" stroke="#B8942A" stroke-width="2"/>
    <rect x="-11" y="122" width="22" height="11" rx="3" fill="${P.blueDark}" ${ink(2.5)}/>
  </g>`;
}

function buyPotSvg() {
  return `<g opacity=".7"><path d="M -48 -30 H 48 L 42 30 H -42 Z" fill="none" stroke="${P.paperHi}" stroke-width="3" stroke-dasharray="7 6"/>
    <text y="-2" font-family="Paytone One" font-size="14" fill="${P.paperHi}" text-anchor="middle">+ thùng</text>
    <text y="16" font-family="Paytone One" font-size="11" fill="${P.paperHi}" text-anchor="middle">${ECON.potPrice}k</text></g>`;
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
  let hidden = true, timer = 0;
  const show = () => {
    if (!root.isConnected) return;
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
