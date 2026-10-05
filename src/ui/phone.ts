import { gsap } from 'gsap';
import { beanSvg, type Accessory } from '../art/bean';
import { ICONS } from '../art/icons';
import { P } from '../art/kit';
import { BASES, INGREDIENTS } from '../core/db';
import { buyPrice, ECON, hasUp, type SaveState } from '../core/state';
import '../styles/book-phone.css';
import { sfx, buzz } from './audio';
import type { Game } from './game';

type Vendor = (typeof ECON.vendors)[number];

const VENDOR_LINES: Record<string, { hello: string; warn: string; mad: string; deal: string; }> = {
  co_sau: { hello: 'Alo, Sáu nghe nè! Lấy gì con?', warn: 'Thôi được rồi… thôi được rồi…', mad: 'Ừ cúp đi! Gọi lại cô lấy thêm 10%!', deal: 'Rồi rồi, giá đó cô lỗ vốn á!' },
  anh_teo: { hello: 'Tèo đây, hàng xách tay chuẩn auth nha em.', warn: 'Khoan khoan khoan!', mad: 'Ok cúp! Gọi lại là giá cũ +10% nha.', deal: 'Chốt! Đừng nói ai giá này nha.' },
  shop_si: { hello: '[Tin nhắn tự động] Shop Sỉ Giá Gốc xin chào. Hàng về liên tục.', warn: '[Tự động] Vui lòng đợi…', mad: '[Tự động] Cuộc gọi bị từ chối.', deal: '[Tự động] Đơn đã được ghi nhận. Không xuất hoá đơn.' },
};

/** Gọi điện nhập hàng: danh bạ → cuộc gọi (chọn hàng) → trả giá "Giả Vờ Cúp Máy" → chốt. */
export function openPhone(g: Game, changed: () => void, opts: { morning?: boolean; onClose?: () => void } = {}) {
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'phone-modal';
  g.modal.appendChild(root);
  const close = () => {
    gsap.to(root, { opacity: 0, duration: 0.2, onComplete: () => { root.remove(); opts.onClose?.(); } });
  };
  showContacts();
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2 });

  function showContacts() {
    const vendors = ECON.vendors.filter((v) => v.unlockDay <= s.day);
    root.innerHTML = `
      <div class="pb">
        <div class="pb-spiral">${'<i></i>'.repeat(11)}</div>
        <div class="pb-h">DANH BẠ MỐI HÀNG</div>
        ${vendors.map((v) => `<button class="pb-row" data-id="${v.id}">
            <svg viewBox="-75 -230 150 240" width="54" height="80">${beanSvg({ color: v.color, acc: v.acc as Accessory[] }).replace('face-idle" style="display:none"', 'face-idle"')}</svg>
            <span><b>${v.name}</b><small>${describe(v)}</small></span>
            <em>${s.priceMods[v.id] ? (s.priceMods[v.id] < 1 ? `đã bớt ${Math.round((1 - s.priceMods[v.id]) * 100)}%` : 'đang giận') : 'gọi'}</em>
          </button>`).join('')}
        ${ECON.vendors.filter((v) => v.unlockDay > s.day).map((v) => `<div class="pb-row locked"><span><b>??? </b><small>Mở ngày ${v.unlockDay}</small></span></div>`).join('')}
        <button class="pb-close">${opts.morning ? 'Đóng' : 'Gác máy'}</button>
      </div>`;
    root.querySelectorAll<HTMLButtonElement>('.pb-row[data-id]').forEach((b) => b.addEventListener('click', () => call(ECON.vendors.find((v) => v.id === b.dataset.id)!)));
    root.querySelector('.pb-close')!.addEventListener('click', close);
  }

  function call(v: Vendor) {
    sfx('phoneRing');
    const cart: Record<string, number> = {};
    const lines = VENDOR_LINES[v.id];
    const items = v.sells.map((id) => INGREDIENTS.find((i) => i.id === id) ?? BASES.find((b) => b.id === id)!).filter((x) => x.unlockDay <= s.day);
    root.innerHTML = `
      <div class="call">
        <div class="call-top">
          <div class="cord"></div>
          <div class="call-av"><svg viewBox="-80 -240 160 250" width="92" height="140">${beanSvg({ color: v.color, acc: v.acc as Accessory[] })}</svg></div>
          <div class="call-bub">${lines.hello}</div>
        </div>
        <div class="cl-wrap"><div class="call-list sap sap2">${items.map((it) => `
          <div class="cl-row" data-id="${it.id}">
            <button class="st minus" aria-label="bớt"><i></i></button>
            <svg class="plus" viewBox="0 0 80 80" width="58" height="58">${ICONS[it.id]}</svg>
            <span class="cl-name">${it.name}</span>
            <span class="cl-price" data-base="${it.price}">${buyPrice(s, v.id, it.id)}k</span>
            <b class="qty">0</b>
            <small class="have">nhà còn ${s.stock[it.id] ?? 0}</small>
          </div>`).join('')}</div><i class="cl-thumb"></i></div>
        <div class="call-foot">
          <div class="total">Tổng: <b>0k</b> <small>/ có ${Math.round(s.money)}k</small></div>
          <button class="haggle">Trả giá</button>
          <button class="buy">Chốt đơn</button>
          <button class="back">Quay về</button>
        </div>
      </div>`;
    const setBubble = (t: string) => {
      const b = root.querySelector('.call-bub') as HTMLElement;
      b.textContent = t;
      gsap.fromTo(b, { scale: 0.7 }, { scale: 1, duration: 0.25, ease: 'back.out(2.5)' });
    };
    const av = root.querySelector('.call-av') as HTMLElement;
    setExpr(av, 'talk');
    setTimeout(() => setExpr(av, 'idle'), 900);
    const total = () => Object.entries(cart).reduce((a, [id, n]) => a + n * buyPrice(s, v.id, id), 0);
    const refresh = () => {
      root.querySelectorAll<HTMLElement>('.cl-row').forEach((r) => {
        const id = r.dataset.id!;
        const q = cart[id] ?? 0;
        r.querySelector('.qty')!.textContent = q ? `x${q}` : '';
        r.classList.toggle('picked', q > 0);
        const pe = r.querySelector('.cl-price') as HTMLElement;
        const p = buyPrice(s, v.id, id);
        const base = Number(pe.dataset.base);
        pe.innerHTML = p < base ? `<s>${base}k</s> ${p}k` : p > base ? `<u>${p}k</u>` : `${p}k`;
      });
      const t = total();
      const tt = root.querySelector('.total b') as HTMLElement;
      tt.textContent = `${t}k`;
      tt.style.color = t > s.money ? P.red : P.ink;
      const hg = root.querySelector('.haggle') as HTMLButtonElement;
      const limit = hasUp(s, 'sim2') ? 2 : 1;
      hg.disabled = (s.haggled[v.id] ?? 0) >= limit;
      hg.textContent = hg.disabled ? 'Trả giá rồi' : 'Trả giá';
    };
    root.querySelectorAll<HTMLElement>('.cl-row').forEach((r) => {
      const id = r.dataset.id!;
      r.addEventListener('click', (e) => {
        if ((e.target as Element).closest('.minus')) return;
        cart[id] = (cart[id] ?? 0) + 1;
        sfx('pop', { pitch: 1 + Math.random() * 0.2 });
        const ic = r.querySelector('.plus') as SVGElement;
        gsap.fromTo(ic, { scale: 0.8, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(3)', transformOrigin: '50% 80%' });
        refresh();
      });
      r.querySelector('.minus')!.addEventListener('click', (e) => { e.stopPropagation(); cart[id] = Math.max(0, (cart[id] ?? 0) - 1); sfx('tick'); refresh(); });
    });
    refresh();
    scrollThumb(root.querySelector('.call-list') as HTMLElement, root.querySelector('.cl-thumb') as HTMLElement);
    // quay về thẳng màn đang đứng (sân thượng / tiệm), không mở lại danh bạ
    root.querySelector('.back')!.addEventListener('click', () => { sfx('hangup'); close(); });
    root.querySelector('.buy')!.addEventListener('click', () => {
      const t = total();
      if (!t) return setBubble('Ủa lấy gì nói đi chứ?');
      if (t > s.money) { sfx('starBad'); return setBubble('Không đủ tiền thì đừng gọi nha!'); }
      s.money -= t;
      for (const [id, n] of Object.entries(cart)) s.stock[id] = (s.stock[id] ?? 0) + n;
      if (g.shop) g.shop.log.ingredientSpend += t;
      sfx('cashout');
      setBubble(lines.deal);
      setExpr(av, 'happy');
      g.save();
      changed();
      // shipper ném bịch hàng qua cửa sổ
      setTimeout(() => {
        sfx('thud');
        g.toast(`Shipper quăng bịch hàng qua cửa sổ! -${t}k`, 'good');
        showContacts();
      }, 900);
    });
    root.querySelector('.haggle')!.addEventListener('click', () => haggle(v, setBubble, refresh, av));
  }

  function haggle(v: Vendor, setBubble: (t: string) => void, refresh: () => void, av: HTMLElement) {
    const lines = VENDOR_LINES[v.id];
    const H = ECON.haggle;
    const panel = document.createElement('div');
    panel.className = 'haggle-panel';
    const ops = ECON.openers[v.id as keyof typeof ECON.openers];
    // xáo thứ tự theo ngày để câu "trúng ý" không luôn nằm đầu
    const order = ops.map((_, i) => i).sort((a, b) => ((a * 7 + s.day * 3) % 5) - ((b * 7 + s.day * 3) % 5));
    panel.innerHTML = `<div class="hg-h">Mở lời trước đã:</div>${order.map((i) => `<button class="op" data-i="${i}">"${ops[i].text}"</button>`).join('')}`;
    root.querySelector('.call')!.appendChild(panel);
    gsap.fromTo(panel, { y: 200 }, { y: 0, duration: 0.3, ease: 'back.out(1.6)' });
    panel.querySelectorAll<HTMLButtonElement>('.op').forEach((b) => b.addEventListener('click', () => {
      const op = ops[Number(b.dataset.i)];
      setBubble(op.reply);
      setExpr(av, op.eff === 'like' ? 'happy' : op.eff === 'bad' ? 'angry' : 'meh');
      sfx(op.eff === 'like' ? 'happy' : op.eff === 'bad' ? 'starBad' : 'tick');
      const pat = v.patience[0] + ((s.day * 7 + v.id.length) % 10) / 10 * (v.patience[1] - v.patience[0]);
      // câu mở lời quyết định mối nhẫn nại được bao lâu: trúng ý +30%, chạm tự ái -35%
      const patience = pat * (op.eff === 'like' ? 1 + H.likedBonus : op.eff === 'bad' ? 1 - H.badPenalty : 1);
      setTimeout(() => holdPhase(patience), 700);
    }));

    function holdPhase(patience: number) {
      panel.innerHTML = `
        <div class="hg-h">GIỮ nút để <b>giả vờ cúp máy</b>. Thả ra trước khi mối nổi điên!</div>
        <div class="hg-drop"><span>Giảm</span><b>0%</b></div>
        <button class="hangup"><svg viewBox="0 0 60 30" width="70" height="35"><path d="M4 18 C4 6 56 6 56 18 L50 24 L42 18 L42 13 C34 10 26 10 18 13 L18 18 L10 24 Z" fill="#fff" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/></svg><i>GIỮ ĐỂ CÚP</i></button>`;
      const btn = panel.querySelector('.hangup') as HTMLButtonElement;
      const dropEl = panel.querySelector('.hg-drop b') as HTMLElement;
      let held = 0, running = false, warned = false, over = false, finished = false, beepT = 0;
      const tick = (_t: number, dt: number) => {
        if (!running) return;
        held += dt / 1000;
        const drop = Math.min(H.maxDrop, Math.floor(held / 0.5) * H.dropPerHalfSec);
        dropEl.textContent = `${Math.round(drop * 100)}%`;
        const k = Math.min(1, held / patience);
        // mặt đỏ dần + mồ hôi
        (av.querySelector('.silhouette') as SVGPathElement | null)?.setAttribute('fill', mix(v.color, '#E63B2E', k * 0.85));
        if (Math.random() < k * 0.3) sweat(av);
        const amp = warned ? 14 : k * 6;
        gsap.set(av, { x: (Math.random() - 0.5) * amp, rotation: (Math.random() - 0.5) * (warned ? 8 : k * 4) });
        if (warned) { beepT += dt / 1000; if (beepT > 0.18) { beepT = 0; sfx('warn', { pitch: 1 + held * 0.05 }); buzz(15); } av.style.outline = Math.floor(held * 10) % 2 ? '4px solid #E63B2E' : 'none'; }
        if (!warned && held > patience - H.warnLead) {
          warned = true;
          setBubble(lines.warn);
          setExpr(av, 'angry');
          sfx('warn');
          buzz(30);
        }
        if (held >= patience) { over = true; end(); }
      };
      const end = () => {
        if (finished) return;
        finished = true;
        running = false;
        gsap.ticker.remove(tick);
        gsap.set(av, { x: 0, rotation: 0 });
        av.style.outline = 'none';
        s.haggled[v.id] = (s.haggled[v.id] ?? 0) + 1;
        if (over) {
          s.priceMods[v.id] = 1 + H.failPenalty;
          setBubble(lines.mad);
          setExpr(av, 'angry');
          sfx('hangup');
          setTimeout(() => sfx('hangup'), 220);
          g.toast(`Mối giận! Giá +${Math.round(H.failPenalty * 100)}% cả ngày.`, 'bad');
        } else {
          const drop = Math.min(H.maxDrop, Math.floor(held / 0.5) * H.dropPerHalfSec);
          s.priceMods[v.id] = 1 - drop;
          setBubble(drop > 0 ? `${lines.deal} (bớt ${Math.round(drop * 100)}%)` : 'Ủa giữ có xíu vậy? Giá cũ nha.');
          setExpr(av, drop > 0.15 ? 'cry' : 'meh');
          sfx(drop > 0 ? 'coin' : 'tick');
        }
        refresh();
        gsap.to(panel, { y: 240, duration: 0.25, delay: 0.6, onComplete: () => panel.remove() });
      };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (finished || running) return;
        running = true;
        sfx('click');
        setBubble('Ê ê khoan! Khoan cúp!');
        setExpr(av, 'shock');
        gsap.ticker.add(tick);
        const up = () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); if (running) end(); };
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    }
  }
}

/** Thanh cuộn tự vẽ: viên bo tròn mờ chạy dọc mép phải, thay scrollbar mặc định. */
export function scrollThumb(list: HTMLElement, thumb: HTMLElement) {
  const upd = () => {
    const { scrollTop: t, scrollHeight: sh, clientHeight: ch } = list;
    if (sh <= ch + 1) { thumb.style.display = 'none'; return; }
    thumb.style.display = '';
    const h = Math.max(36, (ch / sh) * (ch - 12));
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translateY(${6 + (t / (sh - ch)) * (ch - 12 - h)}px)`;
  };
  list.addEventListener('scroll', upd, { passive: true });
  requestAnimationFrame(upd);
}

function describe(v: Vendor) {
  return v.id === 'co_sau' ? 'rau củ, đồ chợ, đồ tạp hoá' : v.id === 'anh_teo' ? 'cốt kem, hàng xách tay xịn' : 'hàng sỉ siêu rẻ, không hoá đơn';
}

function setExpr(av: HTMLElement, e: string) {
  av.querySelectorAll<SVGGElement>('.face').forEach((f) => (f.style.display = f.classList.contains(`face-${e}`) ? '' : 'none'));
  const eyes = av.querySelector<SVGGElement>('.eyes');
  if (eyes) eyes.style.display = e === 'ecstatic' || e === 'glow' ? 'none' : '';
}

function sweat(av: HTMLElement) {
  const d = document.createElement('i');
  d.className = 'sweat';
  d.style.left = `${30 + Math.random() * 40}px`;
  av.appendChild(d);
  gsap.fromTo(d, { y: 10, opacity: 1 }, { y: 70, opacity: 0, duration: 0.7, ease: 'power2.in', onComplete: () => d.remove() });
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const gg = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bb = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${gg},${bb})`;
}

export type { SaveState };
