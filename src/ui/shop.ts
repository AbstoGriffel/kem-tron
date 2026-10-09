import { gsap } from 'gsap';
import { beanSvg, type Accessory, type Expr } from '../art/bean';
import { afterSkins, skinLayers, type Disease, type Skin } from '../art/skin';
import { ICONS } from '../art/icons';
import { el, P, starPath } from '../art/kit';
import { applyStationLayout, BLENDER, blender, BOWL, calendar, clock, livePhone, MORTAR, mortar, noticeSheet, STOVE, stove } from '../art/props';
import { colorName, shade } from '../core/color';
import { base as getBase, ing, INGREDIENTS, isBase, RULES } from '../core/db';
import { newDayLog, type DayLog } from '../core/day';
import { liveEvent, liveTick, newLive, type LiveState } from '../core/live';
import { canProcess, computeMix, processedStats } from '../core/mix';
import { canMakeFromStock } from '../core/solver';
import { inTarget } from '../core/score';
import { hasStockFor } from '../core/day';
import { BAY_LOOK, fanNan, soHui } from '../art/bay';
import { pick, type Rng } from '../core/rng';
import { serve, TEXT, usesGarden, type ServeOutcome } from '../core/serve';
import { availableBases, availableIngredients, customersForDay, dayRng, ECON, hasUp, JARS, LABELS, nextDebt, unlocked, type Customer, type SaveState } from '../core/state';
import type { BowlItem, MixResult } from '../core/types';
import { blenderLoop, buzz, sfx } from './audio';
import { BowlView, StirArm, type Physics } from './bowlView';
import { sharePhoto } from './share';
import { noOrphan, TEXT_UI } from './copy';
import { Bean } from './customer';
import { DragManager } from './drag';
import { Drawer } from './drawer';
import { boomBurst, bubble, coinsTo, crumbs, flash, floatText, hitstop, popText, shake, smoke, sparkles, splash } from './fx';
import { jarSvg, labelSvg } from './jar';
import { music } from './music';
import { runCat } from './cat';
import { Speech } from './speech';
import { LAYOUT, toStage } from './stage';

/**
 * Chân khách trong khung cửa sổ (toạ độ zone-top). Máy ngắn tường trượt lên (topY âm) làm đỉnh đầu / chóp nón
 * lố mép trên màn → hạ khách xuống đúng phần bị lố (chỉ dời khách, không đổi topY chung để bong bóng giữ chỗ).
 */
const custY = () => 274 + Math.max(0, -LAYOUT.topY - 44);
import { pauseState } from './settings';
import { STAT_META, Ticket } from './ticket';

export interface ShopHooks {
  save: () => void;
  onDayEnd: (log: DayLog, live: LiveState) => void;
  openBook: (onPick: (r: { base: string; items: BowlItem[]; heated: boolean }) => void) => void;
  openPhone: () => void;
  toast: (msg: string, kind?: 'info' | 'bad' | 'good', at?: { side?: 'left' | 'right'; top?: number }) => void;
}

type Phase = 'idle' | 'enter' | 'prep' | 'stir' | 'pack' | 'deliver' | 'react' | 'closed';

/** Chỗ hũ bay tới khi giao = mặt khách đứng ở cửa sổ (chưa cộng LAYOUT.topY). */
const CUST_AT = { x: 236, y: 190 };

/** Hộp chữ nhật toạ độ stage. */
type Box = { l: number; t: number; r: number; b: number; w?: number };

export class Shop {
  private svg!: SVGSVGElement;
  private over!: SVGSVGElement;
  private hud!: HTMLElement;
  private ticket!: Ticket;
  private bowl!: BowlView;
  private arm!: StirArm;
  private drawer!: Drawer;
  private speech!: Speech;
  private drag: DragManager;
  private rng: Rng;

  private customers: Customer[] = [];
  private ci = -1;
  private bean?: Bean;
  private phase: Phase = 'idle';

  // mẻ hiện tại
  private baseId: string | null = null;
  private items: BowlItem[] = [];
  private heated = false;
  private locked = false;
  private mix: MixResult | null = null;
  private askedClear = false;
  private mortarItem: { id: string; taps: number } | null = null;
  private blenderItem: { id: string; held: number } | null = null;
  private heat = 0;
  private jar: string | null = null;
  private label: string | null = null;
  private saveRecipe = false;

  log: DayLog = newDayLog();
  live: LiveState = newLive();
  private liveTimer = 0;
  private toxTimer = 0;
  private chatQueue: { name: string; text: string }[] = [];
  private chatBusy = false;
  private tickFn?: (t: number, dt: number) => void;
  private pitchOpen = false;
  /** hẹn nói câu đặt hàng sau câu nhắc live (huỷ khi người chơi bật live sớm) */
  private nagT?: number;
  private nagSay?: () => void;
  private lastPointer: { x: number; y: number } | null = null;
  private waitT = 0;
  private impatient = 0;

  constructor(private stage: HTMLElement, private world: HTMLElement, private s: SaveState, private hooks: ShopHooks, dragLayer: SVGSVGElement) {
    this.drag = new DragManager(dragLayer);
    this.rng = dayRng(s, 'shop');
  }

  // ---------------------------------------------------------------- dựng cảnh
  mount() {
    applyStationLayout(LAYOUT.midY);
    const scene = this.world.querySelector('#scene') as SVGSVGElement;
    this.svg = scene;
    this.over = this.world.querySelector('#over') as SVGSVGElement;
    this.hud = this.world.querySelector('#hud') as HTMLElement;
    const q = (id: string) => scene.querySelector('#' + id) as SVGGElement;
    q('wall-left').innerHTML = livePhone() + clock();
    q('wall-right').innerHTML = calendar() + '<g id="notices"></g>';
    q('station-stove').innerHTML = stove();
    q('station-blender').innerHTML = blender();
    q('station-mortar').innerHTML = mortar();
    this.bowl = new BowlView(q('station-bowl'));
    this.ticket = new Ticket(q('table-front'));
    this.drawer = new Drawer(q('drawer-content'), LAYOUT.dy);
    this.arm = new StirArm(this.over);
    this.speech = new Speech(this.hud);
    this.ticket.onAsk = () => this.askClear();
    this.speech.onAsk = () => this.askClear();
    this.speech.onBye = () => this.refuseCustomer();
    this.ticket.onZoom = () => this.ticket.zoom(this.hud, this.mix?.stats ?? null);
    this.bowl.onItemPointer = (i, e) => this.dragOutOfBowl(i, e);
    // máy ngắn: bong bóng thoại đè lên miệng thau → bắt đầu bốc nguyên liệu thì tự thu gọn (chạm để mở lại).
    // Không thu khi Mẹ đang dạy, và chỉ thu khi câu đã gõ xong + hiện đủ 2 giây (đọc kịp).
    q('drawer-content').addEventListener('pointerdown', () => { if (LAYOUT.dy < -100 && !this.tutOn && this.speech.readFor(2000)) this.speech.collapse(); }, true);

    this.drawer.onPickBase = (id, e, pos) => {
      if (this.phase !== 'prep') return;
      this.drag.start(e, id, pos, { onDrop: (zone) => { if (zone !== 'bowl') return false; this.pickBase(id, e, true); return true; } });
    };
    this.drawer.onPickIng = (id, e, pos) => this.pickIngredient(id, e, pos);
    this.drawer.onTapIng = (id) => this.infoCard(id);
    this.drawer.onBook = () => this.openBook();
    this.drawer.onPhone = () => { this.hidePhoneTip(); this.hooks.openPhone(); };

    // vùng thả
    this.drag.zones = [
      { id: 'bowl', hit: (x, y) => ((x - BOWL.cx) / (BOWL.rx + 16)) ** 2 + ((y - BOWL.cy) / (BOWL.ry + 40)) ** 2 < 1, onHover: (o) => this.hoverZone('station-bowl', o) },
      { id: 'mortar', hit: (x, y) => this.s.day >= ECON.unlocks.mortar && Math.hypot(x - MORTAR.cx, (y - MORTAR.cy - 20) * 1.2) < 58, onHover: (o) => this.hoverZone('station-mortar', o) },
      { id: 'blender', hit: (x, y) => this.s.day >= ECON.unlocks.blender && x > BLENDER.x - 6 && x < BLENDER.x + 92 && y > BLENDER.jarTop - 20 && y < BLENDER.baseBottom, onHover: (o) => this.hoverZone('station-blender', o) },
    ];

    // trạm chế biến
    const mortarEl = q('station-mortar');
    mortarEl.addEventListener('pointerdown', (e) => this.poundMortar(e));
    const btn = scene.querySelector('#blender-btn') as SVGGElement;
    btn.style.cursor = 'pointer';
    btn.addEventListener('pointerdown', (e) => this.holdBlender(e));
    const knob = scene.querySelector('#knob') as SVGGElement;
    knob.style.cursor = 'pointer';
    knob.addEventListener('pointerdown', (e) => this.holdKnob(e));
    // vùng chạm rộng hơn cho núm
    const knobHit = el('circle', { id: 'knob-hit', cx: 270, cy: 476, r: 30, fill: 'transparent' });
    knob.parentElement!.appendChild(knobHit);
    knobHit.addEventListener('pointerdown', (e) => this.holdKnob(e));
    // vá + khuấy
    this.bowl.spoonRest.addEventListener('pointerdown', (e) => this.startStir(e));
    q('station-bowl').addEventListener('pointerdown', (e) => {
      if (this.phase === 'prep' && this.canStir() && (e.target as Element).closest('.float-item') == null) this.startStir(e);
    });
    // live
    const phone = scene.querySelector('#phone') as SVGGElement;
    phone.style.cursor = 'pointer';
    phone.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.toggleLive(); });
    // Q7: máy ngắn bong bóng tự thu gọn → chạm vào khách để mở lại
    (scene.querySelector('#customer-slot') as SVGGElement).addEventListener('pointerdown', () => { if (this.speech.isCollapsed) this.speech.expand(); });
    // T14: đang cầm món → trạm làm được sáng lên, trạm không làm được mờ đi
    this.drag.onStart = (id) => this.stationGlow(id);
    this.drag.onEnd = () => this.stationGlow(null);

    this.lockStations();
    this.stationTags();
    this.livePulse();
    this.refreshHud();
    this.drawer.tab = 'cot';
    this.drawer.render(this.s, this.drawerFlags());

    window.addEventListener('pointermove', (e) => (this.lastPointer = toStage(e.clientX, e.clientY)));
    this.tickFn = (_t, dt) => this.tick(dt / 1000);
    gsap.ticker.add(this.tickFn);
    this.ambient();
  }

  /** Ngoài cửa sổ: mây trôi, chim bay ngang, chim trên dây bay đi rồi về. */
  private ambient() {
    this.svg.querySelectorAll<SVGGElement>('#clouds .cloud').forEach((c, i) => {
      const inner = el('g');
      while (c.firstChild) inner.appendChild(c.firstChild);
      c.appendChild(inner);
      gsap.fromTo(inner, { x: i ? -40 : 0 }, { x: '+=240', duration: i ? 46 : 64, ease: 'none', repeat: -1, modifiers: { x: (x: string) => `${((parseFloat(x) + 120) % 260) - 120}` } });
    });
    const birds = this.svg.querySelector('#sky-birds') as SVGGElement;
    const flyBy = () => {
      if (!birds.isConnected) return;
      const b = el('g');
      const y = 40 + Math.random() * 50;
      b.innerHTML = `<g class="wing-up"><path d="M -8 0 Q -4 -6 0 0 Q 4 -6 8 0" stroke="${P.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g><g class="wing-down" style="display:none"><path d="M -8 -2 Q -4 3 0 0 Q 4 3 8 -2" stroke="${P.ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
      birds.appendChild(b);
      const dir = Math.random() < 0.5 ? 1 : -1;
      gsap.fromTo(b, { x: dir > 0 ? 120 : 350, y }, { x: dir > 0 ? 350 : 120, y: y + (Math.random() - 0.5) * 30, duration: 5 + Math.random() * 3, ease: 'none', onComplete: () => b.remove() });
      let up = true;
      const flap = window.setInterval(() => {
        if (!b.isConnected) { window.clearInterval(flap); return; }
        up = !up;
        (b.querySelector('.wing-up') as SVGGElement).style.display = up ? '' : 'none';
        (b.querySelector('.wing-down') as SVGGElement).style.display = up ? 'none' : '';
      }, 180);
      window.setTimeout(flyBy, 7000 + Math.random() * 9000);
    };
    window.setTimeout(flyBy, 2500);
    // chim đậu dây điện thỉnh thoảng bay đi rồi bay về
    const perched = this.svg.querySelector('#bird') as SVGGElement | null;
    if (perched) {
      const hold = el('g');
      perched.parentNode!.insertBefore(hold, perched);
      hold.appendChild(perched);
      const hop = () => {
        if (!hold.isConnected) return;
        gsap.timeline()
          .to(hold, { y: -4, duration: 0.08, yoyo: true, repeat: 1 })
          .to(hold, { x: 130, y: -70, rotation: -20, duration: 1.4, ease: 'power1.in', delay: 0.6 })
          .set(hold, { x: -150, y: -40, rotation: 10 })
          .to(hold, { x: 0, y: 0, rotation: 0, duration: 1.8, ease: 'power2.out', delay: 4 });
        window.setTimeout(hop, 16000 + Math.random() * 12000);
      };
      window.setTimeout(hop, 9000);
    }
  }

  setRoomy(v: boolean) {
    this.drawer.setRoomy(v);
  }

  unmount() {
    if (this.tickFn) gsap.ticker.remove(this.tickFn);
    this.bean?.destroy();
  }

  private drawerFlags() {
    return { book: unlocked(this.s, 'book'), phone: unlocked(this.s, 'phone'), si: unlocked(this.s, 'si') };
  }

  /** R2: trạm chưa mở khoá thì ẩn hẳn (không mờ, không tag). Ga mini là đế dưới thau nên giữ, chỉ ẩn núm. */
  private lockStations() {
    const show = (sel: string, on: boolean) => { const g = this.svg.querySelector(sel) as SVGGElement | null; if (g) g.style.display = on ? '' : 'none'; };
    show('#station-mortar', unlocked(this.s, 'mortar'));
    show('#station-blender', unlocked(this.s, 'blender'));
    // ổ điện + dây nối máy xay: chưa có máy xay thì chưa có dây
    show('#cords', unlocked(this.s, 'blender'));
    show('#knob', unlocked(this.s, 'stove'));
    this.svg.querySelector('#ga-tag')?.setAttribute('transform', unlocked(this.s, 'stove') ? '' : 'translate(27 0)');
    show('#knob-hit', unlocked(this.s, 'stove'));
    show('#live-rig', unlocked(this.s, 'live'));
  }

  /** Ngày mở khoá: món mới nảy lên + vòng sáng (1 lần, sau khi xuống tiệm). */
  private appearNew() {
    const ring = (x: number, y: number, r: number, delay: number) => {
      const c = el('ellipse', { cx: x, cy: y, rx: r, ry: r, fill: 'none', stroke: P.yellow, 'stroke-width': 6, style: 'pointer-events:none' });
      this.over.appendChild(c);
      gsap.fromTo(c, { opacity: 1 }, { attr: { rx: r * 1.8, ry: r * 1.8 }, opacity: 0, duration: 0.8, delay, repeat: 2, repeatDelay: 0.2, ease: 'sine.out', onComplete: () => c.remove() });
    };
    // bọc 1 <g> trong để không đè translate sẵn có (bẫy GSAP)
    const pop = (g: Element | null, delay: number) => {
      if (!g) return;
      const inner = el('g');
      while (g.firstChild) inner.appendChild(g.firstChild);
      g.appendChild(inner);
      gsap.fromTo(inner, { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.6, delay, ease: 'back.out(2.2)', onStart: () => sfx('pop') });
    };
    let k = 0;
    const once = (key: keyof typeof ECON.unlocks, fn: (delay: number) => void) => {
      if (this.s.day !== ECON.unlocks[key] || this.seen(`appear:${key}`)) return;
      this.s.tutorialSeen.push(`appear:${key}`);
      fn(0.3 + k++ * 0.5);
    };
    once('mortar', (d) => { pop(this.svg.querySelector('#mortar'), d); ring(MORTAR.cx, MORTAR.cy + 10, 50, d); });
    once('blender', (d) => { pop(this.svg.querySelector('#blender'), d); ring(BLENDER.cx, (BLENDER.jarTop + BLENDER.baseBottom) / 2, 70, d); });
    once('stove', (d) => { pop(this.svg.querySelector('#knob'), d); ring(STOVE.knobX, STOVE.knobY, 28, d); });
    once('live', (d) => { pop(this.svg.querySelector('#live-rig'), d); ring(64, 150 + LAYOUT.topY + LAYOUT.pinY, 60, d); });
    once('phone', (d) => { this.drawer.popIn('phone', d); ring(246, 790 + LAYOUT.dy, 46, d); });
    once('book', (d) => { this.drawer.popIn('book', d); ring(330, 790 + LAYOUT.dy, 46, d); });
  }

  private hoverZone(id: string, on: boolean) {
    const g = this.svg.querySelector('#' + id) as SVGGElement;
    gsap.to(g, { scale: on ? 1.04 : 1, duration: 0.15, ease: 'back.out(3)', transformOrigin: '50% 80%' });
    if (id === 'station-bowl') this.ghostPreview(on);
    if (id === 'station-mortar') this.peekProc('mortar', on);
    if (id === 'station-blender') this.peekProc('blender', on);
  }

  // ---------------------------------------------------------------- vòng ngày
  startDay() {
    music.play('chill');
    this.ci = -1;
    this.log = newDayLog();
    const pr = this.s.progress;
    if (pr && pr.day === this.s.day && pr.customers) {
      // mở lại giữa ngày: dùng đúng danh sách đã chụp, đi tiếp từ khách kế
      this.customers = pr.customers;
      this.ci = pr.served - 1;
      this.log = { ...pr.log, stars: pr.log.stars.slice() };
      this.live.peak = pr.peak;
    } else {
      this.customers = customersForDay(this.s);
      this.s.progress = { day: this.s.day, served: 0, log: { ...this.log, stars: [] }, peak: 0, customers: this.customers };
      this.hooks.save();
      if (this.s.day > 1) this.tearCalendar(this.s.day - 1);
    }
    this.updateClock(0);
    this.nextCustomer();
    this.appearNew();
    this.storageHints();
  }

  /** Gợi ý bấm điện thoại bàn / sổ bí kíp ở ngày mở khoá (thay cho nhãn chữ). */
  private storageHints() {
    const hint = (key: string, msg: string, at: { x: number; y: number }, ring: boolean) => {
      if (this.s.tutorialSeen.includes(key)) return;
      this.s.tutorialSeen.push(key);
      window.setTimeout(() => {
        this.hooks.toast(msg, 'info');
        if (ring) { this.drawer.ringPhone(true); sfx('phoneRing'); window.setTimeout(() => this.drawer.ringPhone(false), 2200); }
        const arrow = el('g', { transform: `translate(${at.x} ${at.y})` });
        arrow.innerHTML = `<path d="M 0 0 l -12 -16 h 7 v -22 h 10 v 22 h 7 z" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
        this.over.appendChild(arrow);
        gsap.fromTo(arrow, { y: -10 }, { y: 0, duration: 0.4, yoyo: true, repeat: 7, ease: 'sine.inOut', onComplete: () => arrow.remove() });
      }, 6500);
    };
    if (unlocked(this.s, 'phone') && !this.s.tutorialSeen.includes('hintPhone')) {
      // T16: đầu ngày 2 hàng đầu game sắp hết → bong bóng trên điện thoại bàn + chuông reo
      this.s.tutorialSeen.push('hintPhone');
      window.setTimeout(() => {
        // V3-06: "Sắp hết hàng!" chỉ khi thật có món ở ngưỡng sắp hết (cùng ngưỡng viền đỏ ô ngăn tủ: còn 1–2 phần)
        const shown = [...availableIngredients(this.s), ...availableBases(this.s)];
        const low = shown.some((it) => { const n = this.s.stock[it.id] ?? 0; return n > 0 && n <= 2; });
        this.phoneTip(low ? TEXT_UI.c15 : TEXT_UI.c15new);
        this.drawer.ringPhone(true); sfx('phoneRing'); window.setTimeout(() => this.drawer.ringPhone(false), 2200);
      }, 2500);
    }
    else if (unlocked(this.s, 'book')) hint('hintBook', 'Ghi công thức ngon vô sổ bí kíp — lần sau bấm cuốn sổ đỏ để trộn nhanh.', { x: 326, y: 746 + LAYOUT.dy }, false);
  }

  private async nextCustomer() {
    this.ci++;
    this.resetBatch();
    this.updateClock(this.ci / Math.max(1, this.customers.length));
    if (this.ci >= this.customers.length) {
      this.closeShop();
      return;
    }
    // T22: chị Bảy ghé cửa sổ (ngày 1 sau Mẹ, ngày 4 và 9 đầu ngày)
    const bayDay = (this.s.day === 1 && this.ci === 1) || ((this.s.day === 4 || this.s.day === 9) && this.ci === 0);
    if (bayDay && !this.s.tutorialSeen.includes(`bay:${this.s.day}`)) await this.bayVisit();
    const c = this.customers[this.ci];
    this.phase = 'enter';
    const slot = this.svg.querySelector('#customer-slot') as SVGGElement;
    this.bean = new Bean(slot, { color: c.color, acc: c.acc }, 236, custY(), 0.8);
    this.bean.setSkin(skinLayers((c.order.skin ?? []).map((d) => [d as Skin, 1]), c.color));
    sfx('ding');
    await this.bean.enter(420);
    this.bean.setExpr(c.order.special === 'thanh_tra' ? 'sus' : 'idle');
    this.bean.startFidget(() => this.lastPointer);
    music.play(c.order.special === 'thanh_tra' ? 'tense' : 'chill');
    this.ticket.show(c, false);
    this.askedClear = false;
    this.bean.talk(1800);
    const tut = this.s.day === 1 && this.ci === 0 && c.order.special === 'me' && !this.s.tutorialSeen.includes('tut1');
    // T15: ngày mở live mà chưa bật → khách đầu ngày nhắc trước rồi mới đặt hàng
    const nagLive = this.s.day === ECON.unlocks.live && this.ci === 0 && !this.live.on && !this.s.tutorialSeen.includes('live');
    if (tut) this.speech.say(TEXT_UI.c01);
    else if (nagLive) {
      this.speech.say(TEXT_UI.c12);
      this.nagSay = () => { this.nagT = undefined; this.nagSay = undefined; if (this.phase === 'prep' && this.customers[this.ci] === c) this.speech.say(c.order.say); };
      this.nagT = window.setTimeout(() => this.nagSay?.(), 3200);
    } else this.speech.say(c.order.say, { compactAfter: 5200 });
    // hướng dẫn ngày 1: Mẹ đang dạy thì không để nút Tiễn nằm ngay dưới câu dạy (chạm nhầm là mất cả buổi)
    this.speech.setActions(!tut, c.order.clarity !== 1);
    this.phase = 'prep';
    this.drawer.setTab('cot');
    this.waitT = 0;
    this.impatient = 0;
    this.drawer.refresh();
    this.liveChat('idle');
    if (this.live.on && this.s.day >= 3 && this.rng() < 0.18) window.setTimeout(() => this.catVisit(), 7000);
    if (tut) this.tutStart(c);
    else if (this.s.day === 1 && this.ci <= 1 && !this.s.tutorialSeen.includes('tut1')) this.hooks.toast('Kéo 1 hộp cốt kem vào thau trước, rồi kéo nguyên liệu vào.', 'info');
    this.updatePreview();
    window.setTimeout(() => this.checkStock(), 900);
    this.bookHint(c);
  }

  private closeShop() {
    this.phase = 'closed';
    this.ticket.clear();
    this.speech.hide();
    if (this.live.on) this.toggleLive();
    this.hooks.onDayEnd(this.log, this.live);
  }

  private resetBatch() {
    this.baseId = null;
    this.items = [];
    this.heated = false;
    this.locked = false;
    this.mix = null;
    this.mortarItem = null;
    this.blenderItem = null;
    this.heat = 0;
    this.jar = null;
    this.label = null;
    this.saveRecipe = false;
    this.drawer.selectedBase = null;
    this.bowl.clear();
    this.bowl.spoonRest.style.display = 'none';
    (this.svg.querySelector('#mortar-content') as SVGGElement).innerHTML = '';
    (this.svg.querySelector('#blender-content') as SVGGElement).innerHTML = '';
    gsap.set(this.svg.querySelector('#flame'), { opacity: 0 });
    this.hud.querySelector('.pack')?.remove();
  }

  // ---------------------------------------------------------------- chọn cốt / nguyên liệu
  private pickBase(id: string, e: PointerEvent, dropped = false) {
    e.stopPropagation();
    if (this.phase !== 'prep') return;
    if (this.locked) return this.scold('locked');
    if (this.baseId === id) return;
    if ((this.s.stock[id] ?? 0) <= 0) return this.scold('noStock');
    const b = getBase(id);
    const cap = b.capacity + (hasUp(this.s, 'thau_to') ? 1 : 0);
    if (this.items.length > cap) return this.hooks.toast(`Cốt này chỉ chứa ${cap} phần, bỏ bớt ra đã.`, 'bad');
    if (this.baseId) this.s.stock[this.baseId] = (this.s.stock[this.baseId] ?? 0) + 1;
    this.s.stock[id]--;
    this.baseId = id;
    this.drawer.selectedBase = id;
    this.drawer.refresh();
    // có cốt rồi thì nhảy sang tab rau củ
    window.setTimeout(() => this.drawer.setTab('rau'), 350);
    // hộp cốt bay vào thau rồi đổ (thả trúng thau thì đổ luôn)
    const from = dropped ? { x: BOWL.cx, y: BOWL.cy - 40 } : toStage(e.clientX, e.clientY);
    this.flyIcon(id, from, { x: BOWL.cx, y: BOWL.cy - 30 }, () => {
      sfx('plop', { pitch: 0.8 });
      this.tutEvent('base');
      window.setTimeout(() => this.stationDemo(), 700);
      this.bowl.setBase(b.color);
      this.bowl.squash();
      splash(BOWL.cx, BOWL.cy, b.color, 6);
      this.afterChange();
    });
    if (b.fake) this.liveChat('fake_drop', 6);
  }

  private capacity() {
    if (!this.baseId) return 0;
    return getBase(this.baseId).capacity + (hasUp(this.s, 'thau_to') ? 1 : 0);
  }

  private pendingCount() {
    return this.items.length + (this.mortarItem ? 1 : 0) + (this.blenderItem ? 1 : 0);
  }

  private pickIngredient(id: string, e: PointerEvent, pos: { x: number; y: number }) {
    e.stopPropagation();
    if (this.phase !== 'prep') {
      this.infoCard(id);
      return;
    }
    if ((this.s.stock[id] ?? 0) <= 0) {
      this.infoCard(id);
      return this.scold('noStock');
    }
    this.dragId = id;
    this.drag.start(e, id, pos, {
      onTap: () => this.infoCard(id),
      onDrop: (zone) => this.dropIngredient(id, zone),
    });
  }

  private dragId: string | null = null;

  private dropIngredient(id: string, zone: string | null): boolean {
    this.dragId = null;
    if (!zone) return false;
    if (this.locked) { this.scold('locked'); return false; }
    if (!this.baseId) { this.scold('noBase'); return false; }
    if (this.pendingCount() >= this.capacity()) { this.scold('full'); return false; }
    if (zone === 'bowl') {
      this.s.stock[id]--;
      this.addToBowl({ id, proc: 'raw' });
      return true;
    }
    if (zone === 'mortar') {
      if (this.mortarItem) { this.hooks.toast('Cối đang bận nghiền món khác!', 'bad'); return false; }
      if (!canProcess(id, 'nghien')) { this.scold('cantProcess'); return false; }
      this.s.stock[id]--;
      this.mortarItem = { id, taps: 0 };
      this.renderStationItem('mortar-content', id, MORTAR.cx, MORTAR.cy - 6, 40);
      sfx('plop', { pitch: 1.3 });
      this.drawer.refresh();
      if (!this.s.tutorialSeen.includes('mortar')) { this.s.tutorialSeen.push('mortar'); this.hooks.toast('Gõ vào cối 5 nhát để nghiền!', 'info'); }
      return true;
    }
    if (zone === 'blender') {
      if (this.blenderItem) { this.hooks.toast('Máy xay đang có đồ rồi!', 'bad'); return false; }
      if (!canProcess(id, 'xay')) { this.scold('cantProcess'); return false; }
      this.s.stock[id]--;
      this.blenderItem = { id, held: 0 };
      this.renderStationItem('blender-content', id, BLENDER.cx, BLENDER.jarBottom - 34, 44);
      sfx('plop', { pitch: 1.2 });
      this.drawer.refresh();
      if (!this.s.tutorialSeen.includes('blender')) { this.s.tutorialSeen.push('blender'); this.hooks.toast('Giữ nút XAY tới vạch rồi thả!', 'info'); }
      return true;
    }
    return false;
  }

  private addToBowl(item: BowlItem, from?: { x: number; y: number }) {
    const go = () => {
      this.items.push(item);
      this.bowl.squash();
      const def = ing(item.id);
      splash(BOWL.cx + (Math.random() - 0.5) * 60, BOWL.cy, def.color, 7);
      if (item.proc === 'raw') this.dropFeel(item.id);
      sfx('plop', { pitch: 0.9 + Math.random() * 0.2 });
      buzz(12);
      this.afterChange(this.items.length - 1);
      this.liveChat(def.fake ? 'fake_drop' : ['kem_danh_rang', 'phen_chua', 'phan_rom', 'trung'].includes(def.id) ? 'weird' : 'drop', def.fake ? 6 : 3);
      if (def.fake && this.live.on) {
        const ring = this.svg.querySelector('#ring-glow') as SVGElement;
        gsap.timeline().set(ring, { attr: { stroke: P.red } }).to(ring, { opacity: 1, duration: 0.08, yoyo: true, repeat: 3 }).set(ring, { attr: { stroke: '#FFF7C2' } });
      }
      if (def.fake && !this.s.tutorialSeen.includes('fake')) {
        this.s.tutorialSeen.push('fake');
        this.hooks.toast('Hàng sỉ rẻ, mạnh… nhưng độc và chú Quản Lý để ý đó nha.', 'bad');
      }
    };
    if (from) this.flyIcon(item.id, from, { x: BOWL.cx, y: BOWL.cy - 10 }, go);
    else go();
    this.drawer.refresh();
  }

  private dragOutOfBowl(i: number, e: PointerEvent) {
    e.stopPropagation();
    if (this.phase !== 'prep') return;
    if (this.locked) return this.scold('locked');
    if (this.canStir()) {
      // chờ hướng di chuyển đầu tiên: đi tiếp tuyến quanh thau = khuấy, đi ra ngoài = lấy món
      const p0 = toStage(e.clientX, e.clientY);
      const c = this.bowl.creamCenter;
      const decide = (ev: PointerEvent) => {
        const p = toStage(ev.clientX, ev.clientY);
        const dx = p.x - p0.x, dy = p.y - p0.y;
        if (Math.hypot(dx, dy) < 10) return;
        window.removeEventListener('pointermove', decide);
        window.removeEventListener('pointerup', cancel);
        const rx = p0.x - c.x, ry = (p0.y - c.y) * 3;
        const rl = Math.hypot(rx, ry) || 1;
        const radial = (dx * rx + dy * 3 * ry) / rl;
        const tang = Math.abs((dx * -ry + dy * 3 * rx) / rl);
        if (tang > Math.abs(radial)) this.startStir(ev);
        else this.dragItemOut(i, e);
      };
      const cancel = () => { window.removeEventListener('pointermove', decide); window.removeEventListener('pointerup', cancel); this.takeOut(i); };
      window.addEventListener('pointermove', decide);
      window.addEventListener('pointerup', cancel);
      return;
    }
    this.dragItemOut(i, e);
  }

  /** Chạm 1 món trong thau → món bật ngược về ngăn kéo. */
  private takeOut(i: number) {
    if (this.locked || this.phase !== 'prep') return;
    const it = this.items[i];
    if (!it) return;
    const from = this.bowl.itemPos(i);
    this.items.splice(i, 1);
    this.s.stock[it.id] = (this.s.stock[it.id] ?? 0) + 1;
    sfx('unplop');
    this.afterChange();
    this.drawer.showTabOf(it.id);
    this.drawer.refresh();
    const to = this.drawer.cellCenter(it.id) ?? { x: 250, y: 680 + LAYOUT.dy };
    this.flyIcon(it.id, from, to, () => sfx('pop', { pitch: 1.3 }));
  }

  private dragItemOut(i: number, e: PointerEvent) {
    const it = this.items[i];
    const pos = this.bowl.itemPos(i);
    this.drag.start(e, it.id, pos, {
      size: 44,
      onTap: () => this.takeOut(i),
      onDrop: (zone) => {
        if (zone === 'bowl') return false;
        this.items.splice(i, 1);
        this.s.stock[it.id] = (this.s.stock[it.id] ?? 0) + 1;
        sfx('unplop');
        this.afterChange();
        this.drawer.refresh();
        return true;
      },
    });
    // ẩn tạm icon trong thau khi kéo
    const g = this.svg.querySelectorAll('.float-item')[i] as SVGGElement | undefined;
    if (g) g.style.opacity = '0.25';
    window.addEventListener('pointerup', () => { if (g) g.style.opacity = '1'; }, { once: true });
  }

  private afterChange(justAdded?: number) {
    this.bowl.setItems(this.items, this.items.map((x) => ing(x.id).color), justAdded);
    this.updatePreview();
    this.tutEvent('items', undefined, justAdded !== undefined);
    if (this.items.length) this.stationDemo();
    this.bowl.spoonRest.style.display = this.canStir() ? '' : 'none';
    if (this.canStir() && !this.s.tutorialSeen.includes('stir') && !this.tutOn) {
      this.s.tutorialSeen.push('stir');
      this.hooks.toast('Ưng rồi thì cầm cái vá, xoay vòng tròn để khuấy. Khuấy là CHỐT!', 'info');
      gsap.fromTo(this.bowl.spoonRest, { scale: 1.25, transformOrigin: '0 0' }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.3)', repeat: 2, repeatDelay: 0.4 });
    }
  }

  private canStir() {
    return !!this.baseId && this.items.length > 0 && !this.mortarItem && !this.blenderItem && this.phase === 'prep';
  }

  private updatePreview(pulse = true) {
    if (!this.baseId) {
      this.mix = null;
      this.ticket.update(null);
      return;
    }
    const prev = this.mix?.stats;
    this.mix = computeMix(this.baseId, this.items, this.heated);
    const diff: Record<string, number> = {};
    if (prev && pulse) for (const k of ['t', 'm', 'n', 'k', 'd'] as const) if (prev[k] !== this.mix.stats[k]) diff[k] = this.mix.stats[k] - prev[k];
    this.ticket.update(this.mix.stats, diff);
    this.bowl.setPhysics(physicsOf(this.mix, this.items, this.heated));
    if (prev && diff.d && diff.d > 0) {
      if (this.mix.stats.d >= 6) this.bean?.wince();
      floatText(BOWL.cx + 62, BOWL.cy - 50, `+${diff.d} ĐỘC`, STAT_META.d.color, 16, 2);
      if (this.mix.stats.d >= 10) sfx('warn');
    }
    for (const c of this.mix.combos) {
      if ((c.d ?? 0) > 0) { popText(BOWL.cx, BOWL.cy - 70, c.name.toUpperCase() + '!', P.purple, 18, 30); this.liveChat('toxic', 8); }
      else popText(BOWL.cx, BOWL.cy - 70, c.name + '!', P.green, 16, 30);
    }
    if (this.mix.fakeClash && prev && diff.d) { popText(BOWL.cx, BOWL.cy - 90, '2 MÓN SỈ CÃI NHAU! +6 ĐỘC', P.purple, 15, 26); shake(0.3); }
    if (this.mix.overused.length && diff.d) popText(BOWL.cx - 40, BOWL.cy - 30, 'Bỏ nhiều cho mạnh hả má?', P.red, 13, 26);
  }

  /** Khi đang kéo nguyên liệu qua thau: ticket hiện kết quả nếu thả. */
  private ghostPreview(on: boolean) {
    if (!this.baseId || this.locked) return;
    if (on && this.dragId) {
      const m = computeMix(this.baseId, [...this.items, { id: this.dragId, proc: 'raw' }], this.heated, false);
      this.ticket.update(m.stats);
    } else if (this.mix) this.ticket.update(this.mix.stats);
  }

  // ---------------------------------------------------------------- trạm chế biến
  private renderStationItem(slot: string, id: string, x: number, y: number, size: number, cls = '') {
    const g = this.svg.querySelector('#' + slot) as SVGGElement;
    g.innerHTML = `<g class="st-item ${cls}" transform="translate(${x} ${y})"><svg x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" viewBox="0 0 80 80">${ICONS[id]}</svg></g>`;
    gsap.fromTo(g.firstElementChild, { y: -30, scale: 1.2 }, { y: 0, scale: 1, duration: 0.3, ease: 'bounce.out', transformOrigin: '50% 50%' });
  }

  private poundMortar(e: PointerEvent) {
    e.stopPropagation();
    if (!unlocked(this.s, 'mortar')) return;
    const pestle = this.svg.querySelector('#pestle') as SVGGElement;
    const m = this.mortarItem;
    // chày: nhấc rồi giã (smear 1 khung)
    gsap.timeline()
      .to(pestle, { y: -26, rotation: -24, duration: 0.07, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(pestle, { y: 4, rotation: -16, scaleY: 1.25, duration: 0.05, ease: 'power4.in' })
      .add(() => {
        sfx('grind', { pitch: 1 + (m?.taps ?? 0) * 0.06 });
        shake(0.18);
        const st = this.svg.querySelector('#mortar') as SVGGElement;
        gsap.fromTo(st, { scaleX: 1.08, scaleY: 0.9, transformOrigin: '50% 100%' }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1,0.3)' });
        if (m) crumbs(MORTAR.cx, MORTAR.cy - 4, ing(m.id).color, 5);
      })
      .to(pestle, { y: 0, scaleY: 1, duration: 0.12, ease: 'power2.out' });
    if (!m) return;
    m.taps++;
    const it = this.svg.querySelector('#mortar-content .st-item svg') as SVGElement | null;
    if (it) gsap.to(it, { attr: { height: 40 - m.taps * 5, y: -20 + m.taps * 4 }, duration: 0.08, ease: 'steps(1)' });
    popText(MORTAR.cx, MORTAR.cy - 50, `${m.taps}/5`, P.paperHi, 14, 18);
    if (m.taps >= 5) {
      const id = m.id;
      this.mortarItem = null;
      this.markUsed('mortar');
      hitstop(60);
      sparkles(MORTAR.cx, MORTAR.cy - 10, 4);
      sfx('done', { pitch: 1.3 });
      window.setTimeout(() => {
        (this.svg.querySelector('#mortar-content') as SVGGElement).innerHTML = '';
        this.addToBowl({ id, proc: 'nghien' }, { x: MORTAR.cx, y: MORTAR.cy - 10 });
      }, 260);
    }
  }

  private holdBlender(e: PointerEvent) {
    e.stopPropagation();
    if (!unlocked(this.s, 'blender')) return;
    const cap = this.svg.querySelector('#blender-btn-cap') as SVGElement;
    const body = this.svg.querySelector('#blender') as SVGGElement;
    const blade = this.svg.querySelector('#blender-blade') as SVGGElement;
    gsap.to(cap, { scale: 0.85, duration: 0.06, transformOrigin: '50% 50%' });
    const fast = hasUp(this.s, 'may_xay_xin');
    const need = fast ? 0.6 : 1.2;
    let held = 0;
    let running = true;
    sfx('click');
    gsap.fromTo(body, { y: -8, scaleY: 1.06 }, { y: 0, scaleY: 1, duration: 0.25, ease: 'back.out(4)', transformOrigin: '50% 100%' });
    const meter = el('g', { transform: `translate(${BLENDER.cx} ${BLENDER.jarTop - 22})` });
    meter.innerHTML = `<rect x="-34" y="-7" width="68" height="14" rx="7" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2"/><rect class="fill" x="-31" y="-4" width="0" height="8" rx="4" fill="${P.green}"/><path d="M ${-31 + 62 * (1 / 2.5)} -9 v 18" stroke="${P.ink}" stroke-width="2"/>`;
    this.over.appendChild(meter);
    let soundT = 0;
    const motor = blenderLoop();
    const tick = (_t: number, dt: number) => {
      if (!running) return;
      held += dt / 1000;
      soundT += dt / 1000;
      motor.set(Math.min(1, held / (need * 2)));
      if (soundT > 0.18) { soundT = 0; if (Math.random() < 0.5) this.sparks(); }
      gsap.set(body, { x: (Math.random() - 0.5) * 3, rotation: (Math.random() - 0.5) * 2, transformOrigin: '50% 100%' });
      gsap.set(blade, { rotation: `+=${40}` });
      const st = this.svg.querySelector('#blender-content .st-item') as SVGGElement | null;
      if (st) gsap.set(st, { rotation: `+=${24}`, transformOrigin: '50% 50%' });
      (meter.querySelector('.fill') as SVGRectElement).setAttribute('width', String(Math.min(62, (held / (need * 2.5)) * 62)));
      (meter.querySelector('.fill') as SVGRectElement).setAttribute('fill', held >= need ? (held > need * 2.2 ? P.red : P.green) : P.yellow);
      if (held > 0.6 && Math.random() < 0.1) shake(0.06);
      if (!fast && held > 3 && this.blenderItem) {
        // máy bốc khói, mất món
        stop();
        smoke(BLENDER.cx, BLENDER.jarTop, '#555', 5);
        sfx('fire');
        this.hooks.toast('Xay lâu quá máy bốc khói! Mất món luôn.', 'bad');
        this.blenderItem = null;
        (this.svg.querySelector('#blender-content') as SVGGElement).innerHTML = '';
        liveEvent(this.live, 20);
        this.liveChat('fire', 0);
        this.afterChange();
      }
    };
    const stop = () => {
      if (!running) return;
      running = false;
      motor.stop();
      gsap.ticker.remove(tick);
      gsap.to(cap, { scale: 1, duration: 0.15, ease: 'back.out(3)' });
      gsap.to(body, { x: 0, rotation: 0, duration: 0.3, ease: 'power2.out' });
      gsap.to(meter, { opacity: 0, duration: 0.2, onComplete: () => meter.remove() });
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      const it = this.blenderItem;
      if (it && held >= need) {
        this.blenderItem = null;
        this.markUsed('blender');
        sparkles(BLENDER.cx, BLENDER.jarBottom - 40, 4);
        sfx('done', { pitch: 1.15 });
        const ctn = this.svg.querySelector('#blender-content') as SVGGElement;
        ctn.innerHTML = `<rect x="${BLENDER.x + 15}" y="${BLENDER.jarBottom - 46}" width="56" height="44" fill="${ing(it.id).color}" opacity=".9"/>`;
        window.setTimeout(() => {
          ctn.innerHTML = '';
          this.addToBowl({ id: it.id, proc: 'xay' }, { x: BLENDER.cx, y: BLENDER.jarTop + 30 });
        }, 300);
      }
    };
    gsap.ticker.add(tick);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  private holdKnob(e: PointerEvent) {
    e.stopPropagation();
    if (!unlocked(this.s, 'stove')) return;
    if (this.phase !== 'prep' || !this.baseId || !this.items.length) return this.hooks.toast('Đổ cốt với nguyên liệu vô thau rồi mới đun!', 'info');
    if (this.heated) return this.hooks.toast('Đun rồi, đun nữa là cháy!', 'bad');
    if (this.mortarItem || this.blenderItem) return this.hooks.toast('Đợi chế biến xong đã!', 'info');
    const knob = this.svg.querySelector('#knob') as SVGGElement;
    const flame = this.svg.querySelector('#flame') as SVGGElement;
    gsap.to(knob, { rotation: -90, duration: 0.15, transformOrigin: '0 0' });
    sfx('click');
    let running = true;
    this.heat = 0;
    const meter = el('g', { transform: `translate(${BOWL.cx} ${BOWL.bottomY + 92})` });
    meter.innerHTML = `<rect x="-60" y="-8" width="120" height="16" rx="8" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2"/>
      <rect x="${-57 + 114 / 1.4}" y="-5" width="${114 * 0.4 / 1.4}" height="10" fill="#FFD0C8"/>
      <rect class="fill" x="-57" y="-5" width="0" height="10" rx="5" fill="${P.yellow}"/>
      <path d="M ${-57 + 114 / 1.4} -11 v 22" stroke="${P.ink}" stroke-width="2.5"/>
      <text y="-14" font-family="Paytone One" font-size="10" fill="${P.ink}" text-anchor="middle">ĐUN: Độc ÷2, mất Che nắng</text>`;
    this.over.appendChild(meter);
    let sz = 0;
    const tick = (_t: number, dt: number) => {
      if (!running) return;
      this.heat += dt / 1000 / 1.6;
      sz += dt / 1000;
      gsap.set(flame, { opacity: Math.min(1, 0.4 + this.heat), scaleY: 0.8 + Math.random() * 0.5 + this.heat * 0.6, transformOrigin: `50% 100%` });
      (meter.querySelector('.fill') as SVGRectElement).setAttribute('width', String(Math.min(114, (this.heat / 1.4) * 114)));
      (meter.querySelector('.fill') as SVGRectElement).setAttribute('fill', this.heat >= 1 ? (this.heat > 1.25 ? P.red : P.green) : P.yellow);
      if (sz > 0.25) { sz = 0; sfx('sizzle'); if (this.heat > 0.5) smoke(BOWL.cx + (Math.random() - 0.5) * 120, BOWL.cy - 10, '#fff', 1); }
      if (this.heat > 1.4) {
        stop();
        this.fire();
      }
    };
    const stop = () => {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
      gsap.to(knob, { rotation: 0, duration: 0.2 });
      gsap.to(flame, { opacity: 0, duration: 0.3 });
      gsap.to(meter, { opacity: 0, duration: 0.2, onComplete: () => meter.remove() });
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      if (this.heat >= 1 && this.heat <= 1.4) {
        this.heated = true;
        this.locked = true;
        this.markUsed('stove');
        this.ticket.stampLocked();
        sfx('done');
        popText(BOWL.cx, BOWL.cy - 60, 'ĐUN XONG!', P.yellow, 20);
        this.updatePreview();
        this.bowl.spoonRest.style.display = '';
        this.hooks.toast('Đun rồi là chốt. Giờ khuấy cho đều!', 'info');
      } else if (this.heat < 1) {
        this.hooks.toast('Chưa đủ lửa, giữ lâu hơn chút.', 'info');
      }
    };
    gsap.ticker.add(tick);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  private fire() {
    if (hasUp(this.s, 'binh_xit')) {
      smoke(BOWL.cx, BOWL.cy, '#EEE', 6);
      sfx('splash');
      this.hooks.toast('Bình chữa cháy cứu kịp! Nhưng mẻ thì khét rồi, độc +3.', 'bad');
      this.heated = true;
      this.locked = true;
      this.updatePreview();
      this.bowl.spoonRest.style.display = '';
      return;
    }
    sfx('fire');
    sfx('boom');
    flash('#FF9F4A', 0.7);
    shake(0.9);
    buzz([80, 50, 200]);
    for (let i = 0; i < 4; i++) setTimeout(() => smoke(BOWL.cx + (Math.random() - 0.5) * 100, BOWL.cy - 20, '#3A3A3A', 3), i * 150);
    liveEvent(this.live, 30);
    this.liveChat('fire', 0);
    this.liveChat('fire', 0);
    this.hooks.toast('CHÁY! Đun quá tay, mẻ kem thành than.', 'bad');
    this.log.exploded++;
    this.s.stats.exploded++;
    this.bean?.setExpr('shock');
    this.bean?.hop(24);
    this.bowl.tint('#3A2A26');
    window.setTimeout(() => {
      this.bowl.clear();
      this.resetAfterFail();
    }, 1200);
  }

  // ---------------------------------------------------------------- khuấy
  private startStir(e: PointerEvent) {
    e.stopPropagation();
    if (!this.canStir()) return;
    const c = this.bowl.creamCenter;
    const startColor = shade(getBase(this.baseId!).color, -0.02);
    const final = this.mix!.color;
    this.bowl.prepareSwirl(this.items.map((x) => ing(x.id).color));
    this.bowl.spoonRest.style.display = 'none';
    this.arm.show(true);
    this.speech.setActions(false);
    this.speech.hide();
    this.tutEvent('stir');
    this.phase = 'stir';
    let acc = 0;
    let lastA: number | null = null;
    let lastT = performance.now();
    let speed = 0;
    let committed = false;
    let done = false;
    let sndT = 0;
    let spoonA = Math.PI * 0.2;
    const need = Math.PI * 2 * 3.2;
    const ruined = this.mix!.ruined;
    // T51: kem càng đặc (Nắng cao, Mịn cao) thì thau lắc ít, tiếng khuấy trầm và kem gợn nặng; lỏng thì lắc nhiều, tiếng cao
    const thick = Math.min(1, (this.mix!.stats.n + this.mix!.stats.m * 0.5) / 12);
    const place = () => {
      const tx = c.x + Math.cos(spoonA) * BOWL.irx * 0.55;
      const ty = c.y + Math.sin(spoonA) * BOWL.iry * 0.55;
      this.arm.place(tx, ty, Math.max(-2, Math.min(2, speed * 0.25)));
    };
    place();
    gsap.fromTo(this.arm.g, { x: 120, y: 160 }, { x: 0, y: 0, duration: 0.25, ease: 'back.out(1.6)' });
    const move = (ev: PointerEvent) => {
      const p = toStage(ev.clientX, ev.clientY);
      const a = Math.atan2((p.y - c.y) / BOWL.iry, (p.x - c.x) / BOWL.irx);
      const now = performance.now();
      if (lastA !== null) {
        let d = a - lastA;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        const dt = Math.max(1, now - lastT) / 1000;
        speed = speed * 0.7 + (d / dt / (Math.PI * 2)) * 0.3; // vòng/giây
        acc += Math.abs(d);
        spoonA += d;
        if (!committed && acc > 0.5) {
          committed = true;
          this.locked = true;
          this.ticket.stampLocked();
          sfx('slap');
          buzz(20);
        }
        sndT += Math.abs(d);
        if (sndT > 0.9) { sndT = 0; sfx('stir', { pitch: (0.8 + Math.min(0.5, Math.abs(speed) * 0.1) + Math.min(0.6, acc / need * 0.6)) * (1.15 - thick * 0.4) }); }
        // thau lắc ngược pha với vá
        const bowlG = this.svg.querySelector('#station-bowl') as SVGGElement;
        gsap.set(bowlG, { rotation: -Math.sin(spoonA) * Math.min(2, Math.abs(speed) * 0.8) * (1.2 - thick * 0.7), transformOrigin: `${BOWL.cx}px ${BOWL.bottomY}px` });
        this.bowl.wobble(spoonA, thick);
        // mỗi vòng văng 1–2 giọt
        if (Math.floor(acc / (Math.PI * 2)) !== Math.floor((acc - Math.abs(d)) / (Math.PI * 2))) splash(c.x + Math.cos(spoonA) * BOWL.irx * 0.8, c.y - 4, final, 2, 0.4);
        if (Math.abs(speed) > 3.4 && Math.random() < 0.18) {
          splash(c.x + Math.cos(spoonA) * BOWL.irx, c.y + Math.sin(spoonA) * BOWL.iry - 6, final, 3, 0.5);
          if (Math.random() < 0.15) this.liveChat('stir', 2);
        }
        const p01 = Math.min(1, acc / need);
        this.bowl.stirProgress(p01, spoonA, startColor, ruined ? '#6B3FA0' : final);
        if (ruined && p01 > 0.25 && Math.random() < 0.3) bubble(c.x + (Math.random() - 0.5) * 140, c.y, '#9AD27A');
        if (ruined && p01 > 0.5 && !done) {
          done = true;
          end();
          this.explode();
          return;
        }
        if (p01 >= 1 && !done) {
          done = true;
          end();
          this.stirDone(final);
          return;
        }
      }
      lastA = a;
      lastT = now;
      place();
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    const up = () => {
      end();
      if (done) return;
      if (!committed) {
        // chưa chốt: đặt vá xuống, vẫn còn hoàn tác
        this.arm.show(false);
        this.phase = 'prep';
        this.bowl.setItems(this.items, this.items.map((x) => ing(x.id).color));
        this.bowl.spoonRest.style.display = '';
        return;
      }
      // đã chốt: buông tay giữa chừng thì vẫn ở trạng thái khuấy, chạm lại để khuấy tiếp
      const resume = (ev: PointerEvent) => {
        lastA = null;
        lastT = performance.now();
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        move(ev);
      };
      this.svg.querySelector('#station-bowl')!.addEventListener('pointerdown', resume as EventListener, { once: true });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    if (!this.s.tutorialSeen.includes('stir2')) {
      this.s.tutorialSeen.push('stir2');
      this.hooks.toast('Xoay ngón tay vòng tròn quanh thau!', 'info');
    }
  }

  private stirDone(final: string) {
    gsap.to(this.svg.querySelector('#station-bowl'), { rotation: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    hitstop(80);
    sfx('done');
    buzz(30);
    this.arm.show(false);
    this.bowl.finish(final);
    flash('#fff', 0.5, 0.1);
    sparkles(BOWL.cx, BOWL.cy - 10, 6, P.white, 70);
    popText(BOWL.cx, BOWL.cy - 50, 'XONG MẺ!', P.yellow, 26, 30);
    const nm = colorName(final);
    window.setTimeout(() => popText(BOWL.cx, BOWL.cy - 20, `màu "${nm}"`, P.paperHi, 13, 20), 350);
    liveEvent(this.live, 4);
    if (this.mix && this.mix.stats.d >= 10) { this.liveChat('toxic', 10); }
    window.setTimeout(() => this.openPack(), 650);
  }

  private explode() {
    this.arm.show(false);
    const bowlG = this.svg.querySelector('#station-bowl') as SVGGElement;
    // lấy đà: thau phình 3 nhịp nhanh dần, bong bóng to
    const tl = gsap.timeline();
    [0.16, 0.12, 0.08].forEach((d) => {
      tl.to(bowlG, { scaleX: 1.06, scaleY: 0.94, duration: d, ease: 'power2.out', transformOrigin: `${BOWL.cx}px ${BOWL.bottomY}px` })
        .to(bowlG, { scaleX: 1, scaleY: 1, duration: d, ease: 'power2.in' })
        .call(() => { sfx('warn'); bubble(BOWL.cx + (Math.random() - 0.5) * 120, BOWL.cy, '#B48BE0'); bubble(BOWL.cx + (Math.random() - 0.5) * 120, BOWL.cy, '#9AD27A'); });
    });
    tl.call(() => {
      hitstop(90);
      flash('#FFE14D', 0.55, 0.05);
      sfx('boom');
      buzz([80, 50, 200]);
      shake(1);
      boomBurst(BOWL.cx, BOWL.cy - 30);
      for (let i = 0; i < 3; i++) splash(BOWL.cx, BOWL.cy, '#B48BE0', 10, 1.6);
      smoke(BOWL.cx, BOWL.cy - 30, '#5A5560', 6);
      // chim trên dây điện bay mất
      const bird = this.svg.querySelector('#bird');
      if (bird?.parentElement) gsap.to(bird.parentElement, { x: 160, y: -90, rotation: -30, duration: 0.6, ease: 'power2.in' });
      // vệt kem tím dính kính + bàn
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('div');
        d.className = 'glass-splat';
        d.style.left = `${20 + Math.random() * 300}px`;
        d.style.top = `${60 + Math.random() * 400}px`;
        d.style.setProperty('--c', i % 2 ? '#B48BE0' : '#C9EE9A');
        this.stage.appendChild(d);
        gsap.fromTo(d, { scale: 0 }, { scale: 1, duration: 0.12, ease: 'back.out(3)', delay: 0.05 + i * 0.05 });
        gsap.to(d, { y: 80, opacity: 0, duration: 1.4, delay: 2.4, ease: 'power1.in', onComplete: () => d.remove() });
      }
      const tablePuddles = el('g');
      tablePuddles.innerHTML = [[120, 520], [300, 500], [60, 380], [250, 545]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${18 + i * 4}" ry="${7 + i}" fill="#B48BE0" stroke="${P.ink}" stroke-width="2" opacity=".9"/>`).join('');
      (this.svg.querySelector('#table-front') as SVGGElement).appendChild(tablePuddles);
      gsap.to(tablePuddles, { opacity: 0, duration: 0.6, delay: 2.6, onComplete: () => tablePuddles.remove() });
      // thau bật lên rồi rơi kêu keng
      gsap.timeline()
        .to(bowlG, { y: -40, rotation: 25, duration: 0.22, ease: 'power2.out', transformOrigin: `${BOWL.cx}px ${BOWL.bottomY}px` })
        .to(bowlG, { y: 0, rotation: 0, duration: 0.5, ease: 'bounce.out' })
        .call(() => sfx('glass', { pitch: 1.6 }));
      this.bowl.tint('#6B3FA0');
      liveEvent(this.live, 20);
      this.liveChat('boom', 0);
      this.liveChat('boom', 0);
      if (this.bean) { this.bean.setExpr('shock'); this.bean.soot(); this.bean.hop(30, 1.25); }
      this.log.exploded++;
      this.s.stats.exploded++;
      this.hooks.toast('NỔ THAU! Độc vượt 15 rồi má ơi. Mất trắng nguyên liệu.', 'bad');
    });
    tl.to({}, { duration: 2.4 }).call(() => {
      const bird = this.svg.querySelector('#bird');
      if (bird?.parentElement) gsap.to(bird.parentElement, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'back.out(1.5)' });
      this.bowl.clear();
      this.resetAfterFail();
    });
  }

  private resetAfterFail() {
    this.baseId = null;
    this.items = [];
    this.heated = false;
    this.locked = false;
    this.mix = null;
    this.drawer.selectedBase = null;
    this.drawer.refresh();
    this.ticket.show(this.customers[this.ci], this.ticket.isRevealed);
    this.ticket.update(null);
    this.phase = 'prep';
    this.bean?.setExpr('meh');
    this.speech.say('Ủa… rồi kem tui đâu? Làm lại đi em.', { compactAfter: 3000 });
    this.speech.setActions(!this.tutOn, !this.ticket.isRevealed);
    this.drawer.setTab('cot');
  }

  // ---------------------------------------------------------------- đóng hũ
  private openPack() {
    this.phase = 'pack';
    const ui = document.createElement('div');
    ui.className = 'pack';
    const jars = JARS.filter((j) => !j.unlockDay || j.unlockDay <= this.s.day);
    const labels = LABELS.filter((l) => !l.unlockDay || l.unlockDay <= this.s.day);
    const color = this.mix!.color;
    const bookOn = unlocked(this.s, 'book');
    const ink2 = `stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"`;
    // V2-04: khay chỉ phủ phần ngăn tủ (x 132–390) → tờ đơn bên trái vẫn thấy ("khách đưa", chỉ số) suốt pha đóng hũ.
    // Bố cục 258×266: hàng hũ + kệ ở trên, nhãn 2×2 bên trái, đĩa hũ thành phẩm bên phải; mũi tên "3." vượt mép trên khay.
    const sel = (w: number, h: number) => `<g class="pk-on" style="display:none"><rect x="-3" y="-3" width="${w + 6}" height="${h + 6}" rx="8" fill="#FFF3B0" fill-opacity=".55" stroke="${P.green}" stroke-width="2.5" stroke-dasharray="6 4"/><g transform="translate(${w - 2} ${h - 4})"><circle r="9" fill="${P.green}" ${ink2}/><path d="M -4.5 0 l 3 3 l 6 -6.5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
    ui.innerHTML = `<svg viewBox="0 0 258 266" width="258" height="266" style="overflow:visible">
      <defs><pattern id="pk-wood" width="80" height="22" patternUnits="userSpaceOnUse"><rect width="80" height="22" fill="#C98A55"/><path d="M0 7 C 20 4 40 10 80 6 M0 16 C 25 19 50 13 80 17" stroke="#A9663A" stroke-width="1.3" fill="none" opacity=".6"/></pattern></defs>
      <rect x="10" y="0" width="248" height="5" fill="${P.ink}" opacity=".25"/>
      <text x="8" y="18" font-family="Paytone One" font-size="15" fill="${P.ink}">1. Chọn hũ</text>
      <!-- kệ gỗ treo tường: đáy hũ chạm mặt kệ -->
      <rect x="4" y="88" width="${Math.max(130, 12 + jars.length * 62)}" height="11" fill="url(#pk-wood)" ${ink2}/>
      <path d="M 20 99 l 9 12 M ${Math.max(130, 12 + jars.length * 62) - 12} 99 l -9 12" stroke="${P.ink}" stroke-width="4"/>
      ${jars.map((j, i) => `<g class="pk-jar" data-id="${j.id}" transform="translate(${8 + i * 62} 34)" style="cursor:pointer">
          ${sel(56, 52)}
          <svg x="-2" y="0" width="60" height="60" viewBox="0 0 80 80">${jarSvg(j.id, '#E9E2DA', null)}</svg>
          <g transform="translate(44 0) rotate(10)"><path d="M -4 -6 L 0 -10 L 4 -6" stroke="${P.ink}" stroke-width="1.4" fill="none"/><rect x="-12" y="-6" width="24" height="14" rx="2" fill="${P.paperHi}" ${ink2}/><text y="5" font-family="Paytone One" font-size="10" text-anchor="middle" fill="${P.ink}">${j.price}k</text></g>
        </g>`).join('')}
      <!-- tờ decal -->
      <path d="M 2 112 H 170 V 256 L 160 262 L 150 256 L 140 262 L 130 256 L 120 262 L 110 256 L 100 262 L 90 256 L 80 262 L 70 256 L 60 262 L 50 256 L 40 262 L 30 256 L 20 262 L 10 256 L 2 260 Z" fill="#FFFDF6" ${ink2}/>
      <text x="10" y="134" font-family="Paytone One" font-size="15" fill="${P.ink}">2. Chọn nhãn</text>
      ${labels.map((l, i) => `<g class="pk-label" data-id="${l.id}" transform="translate(${8 + (i % 2) * 82} ${146 + Math.floor(i / 2) * 57})" style="cursor:pointer">
          ${sel(74, 50)}
          <rect x="-2" y="-2" width="78" height="54" rx="6" fill="none" stroke="${P.steelDark}" stroke-width="1.4" stroke-dasharray="4 3"/>
          <svg x="-3" y="0" width="80" height="36" viewBox="18 41 44 20">${labelOnly(l.id)}</svg>
          <text x="37" y="48" font-family="Baloo 2" font-weight="800" font-size="12" text-anchor="middle" fill="${P.blueDark}">${l.price ? l.price + 'k' : 'free'}</text>
        </g>`).join('')}
      <!-- đĩa đặt hũ thành phẩm -->
      <ellipse cx="214" cy="246" rx="40" ry="9" fill="${P.ink}" opacity=".18"/>
      <ellipse cx="214" cy="241" rx="39" ry="8.5" fill="#E9E2DA" ${ink2}/>
      <g class="pk-slot"><ellipse cx="214" cy="204" rx="30" ry="30" fill="none" stroke="${P.inkSoft}" stroke-width="2.5" stroke-dasharray="6 5"/><text x="214" y="208" font-family="Paytone One" font-size="11" text-anchor="middle" fill="${P.inkSoft}">hũ ở đây</text></g>
      <svg class="pack-jar" x="166" y="150" width="96" height="96" viewBox="0 0 80 80" style="cursor:grab;overflow:visible"></svg>
      <!-- bước 3: mũi tên từ hũ chạy lên mép phải (không cắt nhãn) tới ngay dưới chỗ khách đứng; đường vẽ lúc hiện (fitArrow) -->
      <g class="pk-arrow" opacity="0" style="pointer-events:none">
        <path class="pk-ar-line" d="" stroke="${P.red}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="2 9"/>
        <path class="pk-ar-head" d="" stroke="${P.red}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text font-family="Paytone One" font-size="12" letter-spacing="-0.3" fill="${P.red}" text-anchor="end" paint-order="stroke" stroke="#BFE3D3" stroke-width="3"><tspan x="238" y="122">3. Kéo hũ</tspan><tspan x="238" dy="15">đưa khách</tspan></text>
      </g>
      <!-- ghim bí kíp (chỉ khi đã có sổ): tờ giấy vàng ghim góc tờ decal -->
      ${bookOn ? `
      <g class="pk-pin" transform="translate(118 102) rotate(4)" style="cursor:pointer">
        <rect x="0" y="0" width="50" height="38" fill="${P.yellow}" ${ink2}/>
        <circle cx="25" cy="2" r="4.5" fill="${P.red}" ${ink2}/>
        <text x="25" y="19" font-family="Paytone One" font-size="10.5" text-anchor="middle" fill="${P.ink}">Ghi vô</text>
        <text x="25" y="32" font-family="Paytone One" font-size="10.5" text-anchor="middle" fill="${P.ink}">bí kíp?</text>
        <g class="pk-tick" opacity="0"><circle cx="48" cy="34" r="10" fill="${P.green}" ${ink2}/><path d="M 43 34 l 3.5 3.5 l 6.5 -7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      </g>` : ''}
    </svg>`;
    this.hud.appendChild(ui);
    gsap.fromTo(ui, { y: 300 }, { y: 0, duration: 0.35, ease: 'back.out(1.4)' });
    this.tutEvent('pack');
    const jarEl = ui.querySelector('.pack-jar') as SVGSVGElement;
    const slot = ui.querySelector('.pk-slot') as SVGGElement;
    const arrow = ui.querySelector('.pk-arrow') as SVGGElement;
    // V3-08: mũi tên đi dọc mép phải khay (bên phải nhãn "3.") rồi bẻ vào, đầu mũi tên chỉ ngay dưới khách
    // (dưới đáy bong bóng nếu bong bóng đang mở) → cùng chỗ với tay chỉ hướng dẫn, không dừng lửng ở mép khay.
    this.packArrowFit = () => {
      const sv = ui.querySelector('svg') as SVGSVGElement | null;
      if (!sv || !sv.isConnected) return;
      const r = sv.getBoundingClientRect();
      const o = toStage(r.left, r.top);
      let ty = CUST_AT.y + LAYOUT.topY + 40;
      const sp = this.speech.el;
      if (sp.style.display !== 'none') {
        // đo bằng offset* (toạ độ stage, không dính scale lúc bong bóng đang nảy ra)
        const acts = sp.querySelector('.speech-acts') as HTMLElement | null;
        const tail = acts && acts.style.display !== 'none' ? Math.max(0, acts.offsetTop + acts.offsetHeight - sp.offsetHeight) : 0;
        ty = Math.max(ty, sp.offsetTop + sp.offsetHeight + tail + 10);
      }
      // V7-06: đầu mũi tên nhắm đúng chỗ tay chỉ hướng dẫn (CUST_AT.x — mặt khách), không lệch sang góc bong bóng
      const T = { x: CUST_AT.x - o.x, y: Math.min(ty - o.y, -24) };
      // V4-04: đầu mũi tên tính theo ĐÚNG điểm điều khiển thứ 2 của đường cong (đã kẹp ≥ 60) → không méo khi T.y âm;
      // điểm điều khiển 1 kéo vào trong (x 258) để đường không dính mép phải màn; V6-09: đường bắt đầu ở x 254
      // → cột chấm đỏ cách đuôi nhãn "3. Kéo hũ / đưa khách" (mép phải x 244) khoảng 10px, không dính vào chữ
      // V7-06: cột chấm chạy ở x ≤ 248 (mép phải màn 258) → không cắt mất nửa chấm ở mép màn
      const c2 = { x: 246, y: Math.max(60, T.y + 46) };
      (arrow.querySelector('.pk-ar-line') as SVGPathElement).setAttribute('d', `M 246 148 C 248 104 ${c2.x} ${c2.y.toFixed(1)} ${T.x.toFixed(1)} ${T.y.toFixed(1)}`);
      // đầu mũi tên: 2 cánh quanh hướng tiếp tuyến cuối (c2 → T)
      const dx = T.x - c2.x, dy = T.y - c2.y, L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L, w = (a: number) => ({ x: T.x - 14 * (ux * Math.cos(a) - uy * Math.sin(a)), y: T.y - 14 * (uy * Math.cos(a) + ux * Math.sin(a)) });
      const h1 = w(0.55), h2 = w(-0.55);
      (arrow.querySelector('.pk-ar-head') as SVGPathElement).setAttribute('d', `M ${h1.x.toFixed(1)} ${h1.y.toFixed(1)} L ${T.x.toFixed(1)} ${T.y.toFixed(1)} L ${h2.x.toFixed(1)} ${h2.y.toFixed(1)}`);
    };
    const redraw = () => {
      jarEl.innerHTML = this.jar ? jarSvg(this.jar, color, this.label) : '';
      slot.style.display = this.jar ? 'none' : '';
      if (this.jar && this.label) {
        this.tutEvent('packed', jarEl);
        this.packArrowFit?.();
        gsap.to(arrow, { opacity: 1, duration: 0.2 });
        gsap.fromTo(arrow, { y: 6 }, { y: -4, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }
    };
    redraw();
    ui.querySelectorAll<SVGGElement>('.pk-jar').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.jar = b.dataset.id!;
      // V2-19: món đã chọn sáng + viền nét đứt + dấu ✓ (không làm mờ như nút bị khoá)
      ui.querySelectorAll<SVGGElement>('.pk-jar').forEach((x) => ((x.querySelector('.pk-on') as SVGGElement).style.display = x === b ? '' : 'none'));
      sfx('pop');
      redraw();
      // hũ nhảy xuống đế, kem dâng lên
      gsap.fromTo(jarEl, { y: -70, scaleX: 0.8, scaleY: 1.2 }, { y: 0, scaleX: 1, scaleY: 1, duration: 0.45, ease: 'bounce.out', transformOrigin: '50% 100%' });
      const cream = jarEl.querySelector('path') as SVGPathElement | null;
      if (cream) gsap.from(cream, { scaleY: 0, duration: 0.5, delay: 0.25, ease: 'back.out(2)', transformOrigin: '50% 100%' });
    }));
    ui.querySelectorAll<SVGGElement>('.pk-label').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.jar) { this.hooks.toast('Chọn hũ trước rồi mới dán nhãn!', 'info'); return; }
      this.label = b.dataset.id!;
      ui.querySelectorAll<SVGGElement>('.pk-label').forEach((x) => ((x.querySelector('.pk-on') as SVGGElement).style.display = x === b ? '' : 'none'));
      sfx('slap');
      redraw();
      gsap.fromTo(jarEl, { scale: 1.12, rotation: -5, transformOrigin: '50% 80%' }, { scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(3)' });
      const lbl = jarEl.lastElementChild as SVGElement | null;
      if (lbl) gsap.from(lbl, { skewX: 25, scaleX: 0.3, duration: 0.25, ease: 'back.out(2)', transformOrigin: '50% 50%' });
    }));
    const pin = ui.querySelector('.pk-pin') as SVGGElement | null;
    pin?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.saveRecipe = !this.saveRecipe;
      sfx(this.saveRecipe ? 'ding' : 'tick');
      gsap.to(pin.querySelector('.pk-tick'), { opacity: this.saveRecipe ? 1 : 0, duration: 0.15 });
      gsap.fromTo(pin, { rotation: -10, transformOrigin: '50% 0%' }, { rotation: -4, duration: 0.4, ease: 'elastic.out(1,0.3)' });
    });
    jarEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!this.jar || !this.label) {
        this.hooks.toast('Chọn hũ và nhãn trước đã!', 'info');
        return;
      }
      this.dragJar(e, jarEl);
    });
  }

  private dragJar(e: PointerEvent, jarEl: SVGSVGElement) {
    const rect = jarEl.getBoundingClientRect();
    const start = toStage(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const g = el('g');
    g.innerHTML = `<svg x="-44" y="-44" width="88" height="88" viewBox="0 0 80 80">${jarSvg(this.jar!, this.mix!.color, this.label)}</svg>`;
    const layer = this.stage.querySelector('#drag') as SVGSVGElement;
    layer.appendChild(g);
    gsap.set(g, { x: start.x, y: start.y });
    jarEl.style.opacity = '0.2';
    this.jarDragging = true;
    // đưa hũ: kéo hũ lên khỏi khay đóng gói rồi thả (chậm hay vung nhanh đều được) là hũ bay tới khách
    const packTop = 578 + LAYOUT.dy;
    let last = { x: start.x, y: start.y, t: performance.now() };
    let vy = 0;
    const move = (ev: PointerEvent) => {
      const p = toStage(ev.clientX, ev.clientY);
      const now = performance.now();
      vy = vy * 0.6 + ((p.y - last.y) / Math.max(1, now - last.t)) * 0.4;
      last = { x: p.x, y: p.y, t: now };
      gsap.to(g, { x: p.x, y: p.y - 40, duration: 0.08 });
      this.bean?.look(p.x, p.y);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      this.jarDragging = false;
      const p = toStage(ev.clientX, ev.clientY);
      if (p.y < packTop - 10 || vy < -0.8) {
        // văng theo cung lên cửa sổ, xoay vòng
        const tx = CUST_AT.x, ty = CUST_AT.y + LAYOUT.topY;
        const cx = (p.x + tx) / 2, cy = Math.min(p.y, ty) - 90;
        const o = { t: 0 };
        sfx('pick');
        gsap.to(o, {
          t: 1, duration: 0.42, ease: 'power1.in',
          onUpdate: () => {
            const t = o.t, u = 1 - t;
            const x = u * u * p.x + 2 * u * t * cx + t * t * tx;
            const y = u * u * (p.y - 40) + 2 * u * t * cy + t * t * ty;
            gsap.set(g, { x, y, rotation: t * 540, scale: 1 - t * 0.4 });
          },
          onComplete: () => { g.remove(); sfx('slap'); shake(0.15); this.deliver(); },
        });
      } else {
        jarEl.style.opacity = '1';
        gsap.to(g, { x: start.x, y: start.y, duration: 0.25, ease: 'back.in(1.4)', onComplete: () => g.remove() });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    if (!this.s.tutorialSeen.includes('deliver')) { this.s.tutorialSeen.push('deliver'); this.hooks.toast('Kéo hũ lên đưa khách, thả tay là xong!', 'info'); }
  }

  // ---------------------------------------------------------------- giao + phản ứng
  private async deliver() {
    this.phase = 'react';
    // hũ đã giao: tắt tay chỉ của bước 6 để không chạy đè lên phản ứng của khách
    if (this.tutOn) this.tutClear();
    const c = this.customers[this.ci];
    const pack = this.hud.querySelector('.pack') as HTMLElement | null;
    if (pack) gsap.to(pack, { y: 320, duration: 0.25, onComplete: () => pack.remove() });
    this.bowl.clear();
    const jar = JARS.find((j) => j.id === this.jar)!;
    const label = LABELS.find((l) => l.id === this.label)!;
    this.log.ingredientSpend += 0;
    this.s.money -= jar.price + label.price;
    this.log.ingredientSpend += jar.price + label.price;
    const mix = this.mix!;
    if (mix.fakeCount) this.log.usedFake = true;
    const out = serve(this.s, {
      customer: c, mix, items: this.items, baseId: this.baseId!, jar: this.jar!, label: this.label!,
      askedClear: this.askedClear, viewers: this.live.on ? this.live.viewers : 0, garden: usesGarden(this.items), slow: this.impatient >= 2,
    }, this.rng);
    if (this.saveRecipe && this.baseId) this.storeRecipe(c);
    this.log.served++;
    this.log.sales += out.paid;
    this.log.tips += out.tip;
    this.log.refunds += out.refund > 0 && out.score.refund !== 'none' ? 0 : 0;
    this.log.stars.push(out.score.stars);
    if (c.order.special !== 'me') this.log.profit = (this.log.profit ?? 0) + out.profit;
    this.ticket.reveal();
    this.speech.hide();
    await this.react(out, c);
  }

  private storeRecipe(c: Customer, msg = 'Đã ghi vô sổ bí kíp!') {
    const sig = this.baseId + '|' + this.items.map((i) => i.id + ':' + i.proc).sort().join(',') + '|' + this.heated;
    if (this.s.recipes.some((r) => r.base + '|' + r.items.map((i) => i.id + ':' + i.proc).sort().join(',') + '|' + r.heated === sig)) return;
    const n = this.s.recipes.length + 1;
    this.s.recipes.push({
      id: `r${n}-${this.s.day}`,
      name: recipeName(this.mix!, c, n),
      base: this.baseId!,
      items: this.items.slice(),
      heated: this.heated,
      color: this.mix!.color,
      stats: { ...this.mix!.stats },
      sold: 0,
    });
    this.hooks.toast(msg, 'good');
  }

  private react(out: ServeOutcome, c: Customer): Promise<void> {
    return new Promise((res) => {
      const b = this.bean!;
      const tl = gsap.timeline({ onComplete: () => res() });
      // khách cầm hũ lên, bật nắp, quẹt kem dưới mắt, nheo mắt… rồi bùng biểu cảm
      const held = b.holdJar(jarSvg(this.jar!, this.mix!.color, this.label));
      const armR = b.g.querySelector('.arm-r') as SVGGElement;
      tl.call(() => { b.setExpr('talk'); sfx('pop'); })
        .fromTo(armR, { rotation: 0 }, { rotation: -150, duration: 0.18, ease: 'steps(3)', transformOrigin: '0 0' })
        .call(() => {
          // nắp bật xoay 540° rồi rơi
          const lid = el('ellipse', { cx: 0, cy: 0, rx: 12, ry: 4, fill: P.steel, stroke: P.ink, 'stroke-width': 2 });
          const lidG = el('g', { transform: 'translate(250 120)' });
          lidG.appendChild(lid);
          this.over.appendChild(lidG);
          gsap.timeline({ onComplete: () => lidG.remove() })
            .to(lid, { attr: { cy: -50 }, rotation: 540, duration: 0.3, ease: 'power2.out', transformOrigin: '50% 50%' })
            .to(lid, { attr: { cy: 140 }, duration: 0.4, ease: 'power2.in' });
          sfx('pop', { pitch: 1.4 });
        })
        .to({}, { duration: 0.2 })
        .call(() => { held.remove(); b.smear(this.mix!.color); sfx('slap'); })
        .to(armR, { rotation: 0, duration: 0.15, ease: 'steps(2)' })
        .add(b.squint())
        .call(() => {
          b.burst(out.expr === 'glow' ? 'glow' : out.expr);
          b.setSkin(skinLayers(afterSkins((c.order.skin ?? []) as Disease[], out.mainErr, out.score.stars), c.color), true);
          if (out.expr === 'glow') { b.glow(); sfx('ding'); sparkles(236, 120, 6, P.white, 80); }
          if (out.expr === 'ecstatic' || out.expr === 'glow') { b.hop(26); sfx('happy'); }
          if (out.expr === 'happy') b.hop(12);
          if (out.expr === 'sick') { b.swell(); sfx('angry'); shake(0.4); }
          if (out.expr === 'angry') { b.shakeNo(); sfx('angry'); shake(0.3); }
          if (out.expr === 'disgust') { b.shakeNo(); }
          if (out.caughtByInspector) { b.setExpr('sus'); sfx('siren'); }
          const tone = out.score.stars >= 4 ? 'happy' : out.score.stars < 3 ? 'angry' : 'normal';
          if (this.tutOn && out.score.stars >= 3) { this.tutDone(); this.speech.say(TEXT_UI.c08, { tone: 'happy' }); } else
          this.speech.say(out.missLine && out.score.stars < 4 ? `${out.line} ${out.missLine}` : out.line, { tone });
        })
        .to({}, { duration: 0.5 })
        .call(() => b.talk(1200))
        .to({}, { duration: 0.6 })
        .call(() => { this.dropStars(out.score.stars); this.beforeAfter(c, out); })
        .to({}, { duration: 1.2 })
        .call(() => {
          if (out.paid + out.tip > 0) {
            const n = Math.max(3, Math.min(14, Math.round((out.paid + out.tip) / 5)));
            let got = 0;
            coinsTo({ x: 236, y: 150 + LAYOUT.topY }, { x: 174, y: 792 + LAYOUT.dy }, n, () => {
              got++;
              sfx('coin', { pitch: 1 + got * 0.03 });
              const lid = this.svg.querySelector('#tin-lid');
              gsap.fromTo(lid, { y: -4 }, { y: 0, duration: 0.12 });
              this.refreshHud();
            });
            popText(174, 760 + LAYOUT.dy, `+${out.paid + out.tip}k`, P.yellow, 22);
            if (out.tip) window.setTimeout(() => popText(174, 740 + LAYOUT.dy, `boa ${out.tip}k`, P.green, 14), 400);
          } else if (c.order.special !== 'me') {
            sfx('cashout');
            popText(174, 760 + LAYOUT.dy, out.score.refund === 'full' ? 'HOÀN TIỀN' : 'TRẢ NỬA', P.red, 18);
          }
          // T61: lời / lỗ của riêng hũ này bay lên từ hộp bánh quy, mờ dần 3 giây
          if (c.order.special !== 'me') window.setTimeout(() => floatText(174, 742 + LAYOUT.dy, out.profit >= 0 ? `lời ${out.profit}k` : `lỗ ${-out.profit}k`, out.profit >= 0 ? P.green : P.red, 17, 3, 60), 700);
          if (out.suspicion > 0.5) window.setTimeout(() => { this.bumpNotices(); popText(368, 150, 'nghi ngờ ↑', P.red, 11, 20); }, 600);
          // livestream phản ứng
          if (out.score.stars >= 5) { liveEvent(this.live, 8); this.liveChat('five', 0); }
          else if (out.score.stars <= 2) { liveEvent(this.live, 15); this.liveChat('angry', 0); }
          if (out.caughtByInspector) { liveEvent(this.live, 35); this.liveChat('police', 0); }
          this.refreshHud();
          this.hooks.save();
        })
        .to({}, { duration: 2.4 })
        .call(() => {
          this.speech.hide();
          this.ticket.clear();
          this.clearStars();
          this.s.progress = { day: this.s.day, served: this.ci + 1, log: { ...this.log, stars: this.log.stars.slice() }, peak: this.live.peak, customers: this.customers };
          this.hooks.save();
          if (this.tutOn) this.tutDone();
          b.exit(-120).then(() => {
            this.bean = undefined;
            if (out.caughtByInspector) this.hooks.toast('Anh khách lạ là thanh tra! Nghi ngờ tăng vọt.', 'bad');
            window.setTimeout(() => this.nextCustomer(), 350);
          });
        });
    });
  }

  /** Ảnh "trước – sau" kiểu quảng cáo kem trộn (T33): TRƯỚC = mặt bệnh, SAU = bệnh mờ theo sao + lớp lỗi chính. */
  private beforeAfter(c: Customer, out: ServeOutcome) {
    const after: Expr = out.expr === 'glow' ? 'glow' : out.expr;
    const glow = out.expr === 'glow' || out.expr === 'ecstatic';
    const sick = out.expr === 'sick';
    const skins = (c.order.skin ?? []) as Disease[];
    const beforeL = skinLayers(skins.map((d) => [d, 1] as [Skin, number]), c.color);
    const afterL = skinLayers(afterSkins(skins, out.mainErr, out.score.stars), c.color);
    const bean = (e: Expr, extra: string, layers: string) => `<svg viewBox="-80 -235 160 200" width="118" height="148">${extra}${beanSvg({ color: c.color, acc: c.acc as Accessory[] }).replace(`face-${e}" style="display:none"`, `face-${e}"`).replace('<g class="head">', `<g class="head">${layers}`)}</svg>`;
    const rays = `<g opacity=".7">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M 0 -130 L ${Math.cos(a) * 160} ${-130 + Math.sin(a) * 160} L ${Math.cos(a + 0.2) * 160} ${-130 + Math.sin(a + 0.2) * 160} Z" fill="#FFF7C2"/>`; }).join('')}</g>`;
    const d = document.createElement('div');
    d.className = 'polaroid';
    const canBook = unlocked(this.s, 'book') && out.score.stars >= 4 && !!this.baseId && !this.s.tutorialSeen.includes('bookBtn') && !this.recipeSaved();
    d.innerHTML = `<div class="pl-pics">
        <figure><div class="pl-ph">${bean('idle', '', beforeL)}</div><figcaption>TRƯỚC</figcaption></figure>
        <figure class="${sick ? 'bad' : glow ? 'good' : ''}"><div class="pl-ph">${bean(after, glow ? rays : '', afterL)}</div><figcaption>SAU</figcaption></figure>
      </div>
      <div class="pl-cap">${noOrphan(`"${out.review.text}"`)}</div>
      <div class="pl-tag">${'★'.repeat(Math.floor(out.review.stars))}${out.review.stars % 1 ? '⯪' : ''}${'☆'.repeat(5 - Math.ceil(out.review.stars))} — ${c.name}</div>
      <div class="pl-btns">${canBook ? '<button class="pl-book">Ghi vô sổ bí kíp</button>' : ''}<button class="pl-share" aria-label="Lưu ảnh">Lưu ảnh</button></div>`;
    // V2-09: lớp mờ phủ vùng tờ đơn + ngăn tủ phía sau ảnh → chữ phía sau chìm hẳn, không lòi mẩu chữ bị cắt
    const dim = document.createElement('div');
    dim.className = 'pl-dim';
    this.hud.appendChild(dim);
    gsap.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.3 });
    const dimOff = () => { if (dim.isConnected) gsap.to(dim, { opacity: 0, duration: 0.25, onComplete: () => dim.remove() }); };
    new MutationObserver((_, ob) => { if (!d.isConnected) { ob.disconnect(); dimOff(); } }).observe(this.hud, { childList: true });
    this.hud.appendChild(d);
    const jarName = this.recipeNameNow(c);
    const shot = { c, out, before: bean('idle', '', beforeL), after: bean(after, glow ? rays : '', afterL), jar: jarName, good: glow, bad: sick };
    gsap.fromTo(d, { x: 420, rotation: 14 }, { x: 0, rotation: -3, duration: 0.45, ease: 'back.out(1.5)', delay: 0.3 });
    // T40: vẫn tự bay đi như cũ (giữ lâu hơn chút nếu có nút sổ)
    const away = gsap.to(d, { x: -440, rotation: -14, duration: 0.35, ease: 'power2.in', delay: canBook ? 5 : 3.6, onComplete: () => d.remove() });
    d.addEventListener('pointerdown', (e) => {
      const btn = (e.target as Element).closest('button');
      if (btn) return;
      away.kill();
      gsap.to(d, { x: -440, duration: 0.25, onComplete: () => d.remove() });
    });
    d.querySelector('.pl-share')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); sfx('click'); void sharePhoto(shot, this.hooks.toast); });
    const bb = d.querySelector('.pl-book');
    if (bb) {
      gsap.fromTo(bb, { scale: 0.7 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)', delay: 0.8 });
      bb.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.s.tutorialSeen.push('bookBtn');
        this.saveRecipe = true;
        this.storeRecipe(c, TEXT_UI.c23);
        bb.remove();
      });
    }
  }

  /** Công thức trong thau đã có trong sổ chưa. */
  private recipeSaved() {
    const sig = this.baseId + '|' + this.items.map((i) => i.id + ':' + i.proc).sort().join(',') + '|' + this.heated;
    return this.s.recipes.some((r) => r.base + '|' + r.items.map((i) => i.id + ':' + i.proc).sort().join(',') + '|' + r.heated === sig);
  }

  /** Tên hũ hiện tại: tên công thức trong sổ (người chơi có thể đã đổi tên) hoặc tên tự đặt. */
  private recipeNameNow(c: Customer) {
    const sig = this.baseId + '|' + this.items.map((i) => i.id + ':' + i.proc).sort().join(',') + '|' + this.heated;
    const r = this.s.recipes.find((x) => x.base + '|' + x.items.map((i) => i.id + ':' + i.proc).sort().join(',') + '|' + x.heated === sig);
    return r?.name ?? (this.mix ? recipeName(this.mix, c, this.s.recipes.length + 1) : 'Kem Nhà Làm');
  }

  private starsG?: SVGGElement;
  private dropStars(stars: number) {
    this.starsG?.remove();
    const g = el('g');
    this.over.appendChild(g);
    this.starsG = g;
    // hàng sao nằm dưới đáy thật của bong bóng thoại (máy ngắn bong bóng phủ xuống thấp, sao cũ bị che mất)
    let y0 = BOWL.cy - 74, k = 1;
    // đo bằng hộp layout (px stage, không bị tween scale lúc bong bóng đang nảy ra làm lệch)
    const sp = this.speech.el;
    if (sp.style.display !== 'none' && sp.offsetHeight) {
      // V7-09: sao không đứng đè vành thau — nằm giữa đáy bong bóng và vành sau thau; khe hẹp thì thu nhỏ sao
      const bub = sp.offsetTop + sp.offsetHeight + 5, rim = BOWL.cy - BOWL.ry - 3;
      if (bub + 22 > y0) {
        y0 = Math.max(y0, (bub + rim) / 2);
        k = Math.min(1, ((rim - bub) / 2 - 2) / 15);
        // khe quá hẹp (sao nhỏ hơn 0,8) → dán hàng sao cỡ thật lên thân trước thau, dưới vành
        if (k < 0.8) { y0 = BOWL.cy + BOWL.ry + 22; k = 1; }
      }
    }
    const x0 = BOWL.cx - 60 * k;
    for (let i = 0; i < 5; i++) {
      const full = stars >= i + 1;
      const half = !full && stars >= i + 0.5;
      const holder = el('g', { transform: `translate(${x0 + i * 30 * k} ${y0}) scale(${k.toFixed(3)})` });
      const s = el('g');
      holder.appendChild(s);
      s.innerHTML = `<path d="${starPath(0, 0, 14)}" fill="${full ? P.yellow : half ? '#FFE39A' : '#D8CFC0'}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
        ${half ? `<path d="M 0 -14 L 0 11 L -8 13 L -6 4 L -13 -4 L -4 -5 Z" fill="${P.yellow}"/>` : ''}`;
      g.appendChild(holder);
      gsap.fromTo(s, { y: -120, rotation: full ? -180 : 0, opacity: 0 }, {
        y: 0, rotation: 0, opacity: 1, duration: 0.5, delay: i * 0.12, ease: full ? 'bounce.out' : 'power3.in',
        onComplete: () => { sfx(full ? 'star' : 'starBad', { pitch: 1 + i * 0.08 }); if (full) sparkles(x0 + i * 30 * k, y0, 2, P.yellow, 18); },
      });
    }
    if (stars >= 5) {
      window.setTimeout(() => popText(BOWL.cx, BOWL.cy + 6, '5 SAO NHƯ PHIM!', P.yellow, 22, 20), 750);
      window.setTimeout(() => { popText(262, 60, '♪', P.ink, 16, 24); popText(272, 54, '♫', P.ink, 14, 30); sfx('heart', { pitch: 1.6 }); }, 1000);
    }
    if (stars <= 1) window.setTimeout(() => sfx('glass'), 700);
  }

  private clearStars() {
    if (this.starsG) gsap.to(this.starsG, { opacity: 0, duration: 0.3, onComplete: () => this.starsG?.remove() });
  }

  /** Từ chối tiếp khách: trả lại mẻ đang dở, khách bỏ đi, có thể review xấu. */
  private refuseCustomer() {
    if (this.phase !== 'prep' || this.locked || !this.bean) return;
    if (this.tutOn) this.tutDone();
    this.drawer.glowPhone(false);
    const c = this.customers[this.ci];
    this.phase = 'react';
    // trả hàng về kho
    if (this.baseId) this.s.stock[this.baseId] = (this.s.stock[this.baseId] ?? 0) + 1;
    for (const it of this.items) this.s.stock[it.id] = (this.s.stock[it.id] ?? 0) + 1;
    if (this.mortarItem) this.s.stock[this.mortarItem.id]++;
    if (this.blenderItem) this.s.stock[this.blenderItem.id]++;
    this.bowl.clear();
    this.speech.setActions(false);
    const b = this.bean;
    const mad = c.order.special !== 'me' && this.rng() < 0.6;
    b.setExpr(mad ? 'angry' : 'meh');
    b.shakeNo();
    sfx(mad ? 'angry' : 'tick');
    this.speech.say(mad ? pick(this.rng, ['Đuổi khách hả? Để tui lên mạng nói!', 'Bán vậy ai mua!', 'Thái độ vậy là 1 sao nha!']) : pick(this.rng, ['Thôi khỏi, đi chỗ khác.', 'Ờ, không bán thì thôi.']), { tone: mad ? 'angry' : 'normal' });
    if (c.order.special === 'me') this.speech.say('Con đuổi cả mẹ luôn hả?! Tối nay khỏi ăn cơm!', { tone: 'angry' });
    if (mad) {
      this.s.reviews.push({ day: this.s.day, stars: 1, text: pick(this.rng, ['Ghé mua mà bị đuổi về, thái độ quá tệ.', 'Shop chảnh, không thèm bán.', 'Hỏi có câu mà bị tiễn khách luôn.']), who: c.name });
      liveEvent(this.live, 12);
      this.liveChat('angry', 0);
    }
    if (c.order.special === 'thanh_tra') this.hooks.toast('Anh khách lạ nhìn quanh tiệm rồi ghi gì đó vô sổ…', 'info');
    this.drawer.selectedBase = null;
    this.baseId = null; this.items = []; this.mix = null;
    this.drawer.refresh();
    this.ticket.update(null);
    this.hooks.save();
    window.setTimeout(() => {
      this.speech.hide();
      this.ticket.clear();
      b.exit(-120).then(() => {
        this.bean = undefined;
        this.s.progress = { day: this.s.day, served: this.ci + 1, log: { ...this.log, stars: this.log.stars.slice() }, peak: this.live.peak, customers: this.customers };
        this.hooks.save();
        window.setTimeout(() => this.nextCustomer(), 350);
      });
    }, 1500);
  }

  private askClear() {
    if (this.phase !== 'prep' && this.phase !== 'stir') return;
    const c = this.customers[this.ci];
    this.speech.setActions(true, false);
    this.askedClear = true;
    this.ticket.reveal();
    this.bean?.setExpr('meh');
    this.bean?.talk(1200);
    // tên chỉ số + khoảng giá trị không bị tách dòng ("Trắng 5–7", "Khô ráo 5–7")
    const clear = c.order.clear.replace(/ (\d+(?:–\d+)?)/g, '\u00A0$1').replace(/Khô ráo/g, 'Khô\u00A0ráo');
    this.speech.say(`Trời, nói vậy mà không hiểu. ${clear} (Khỏi boa nha!)`, { tone: 'angry', compactAfter: 5000 });
    this.bean?.shakeNo();
    this.updatePreview(false);
    window.setTimeout(() => this.bean?.setExpr('idle'), 1400);
  }

  // ---------------------------------------------------------------- livestream
  private toggleLive() {
    if (!unlocked(this.s, 'live')) return;
    this.live.on = !this.live.on;
    this.livePulse(true);
    const off = this.svg.querySelector('#phone-off') as SVGGElement;
    off.style.display = this.live.on ? 'none' : '';
    sfx(this.live.on ? 'ding' : 'click');
    const ring = this.svg.querySelector('#ring-glow') as SVGElement;
    gsap.to(ring, { opacity: this.live.on ? 1 : 0.55, duration: 0.2 });
    ring.setAttribute('stroke', this.live.on ? '#FFF7C2' : P.white);
    this.renderPhoneScreen();
    if (this.live.on) {
      liveEvent(this.live, 15);
      this.liveChat('idle', 0);
      // khách đang nhắc "chưa live hả?" mà mình bật rồi → thôi nhắc, đặt hàng luôn
      if (this.nagT !== undefined) { window.clearTimeout(this.nagT); this.nagSay?.(); }
      if (!this.s.tutorialSeen.includes('live')) {
        this.s.tutorialSeen.push('live');
        this.hooks.toast('Đang LIVE! Drama càng to, mắt xem càng đông, có quà. Nhưng ăn gian lúc live thì bị soi gấp bội.', 'info');
      }
    } else {
      this.chatQueue = [];
    }
  }

  private phoneScreen?: SVGGElement;
  private renderPhoneScreen() {
    if (!this.phoneScreen) {
      this.phoneScreen = el('g', { id: 'phone-live' });
      (this.svg.querySelector('#phone') as SVGGElement).appendChild(this.phoneScreen);
    }
    if (!this.live.on) {
      this.phoneScreen.innerHTML = '';
      return;
    }
    const v = Math.round(this.live.viewers);
    this.phoneScreen.innerHTML = `
      <rect x="37" y="47" width="54" height="100" rx="6" fill="#4A3732"/>
      <circle cx="64" cy="90" r="14" fill="${P.skin}"/><circle cx="59" cy="88" r="2" fill="${P.ink}"/><circle cx="69" cy="88" r="2" fill="${P.ink}"/>
      <path d="M 58 95 q 6 5 12 0" stroke="${P.ink}" stroke-width="2" fill="none"/>
      <path d="M 50 80 q 14 -16 28 0 v -6 q -14 -14 -28 0 z" fill="#3A2620"/>
      <path d="M 46 147 q 18 -30 36 0 z" fill="#5BB6E8"/>
      <rect class="lv-badge" x="40" y="51" width="22" height="10" rx="2" fill="${P.red}"/>
      <text x="51" y="59" font-family="Paytone One" font-size="7" fill="#fff" text-anchor="middle">LIVE</text>
      <rect x="64" y="51" width="24" height="10" rx="2" fill="rgba(0,0,0,.45)"/>
      <path d="M 67 56 q 3 -3 6 0 q -3 3 -6 0 z" fill="#fff"/>
      <text x="83" y="59" font-family="Paytone One" font-size="7" fill="#fff" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}</text>
      <rect x="40" y="118" width="40" height="5" rx="2" fill="rgba(255,255,255,.35)"/>
      <rect x="40" y="127" width="30" height="5" rx="2" fill="rgba(255,255,255,.25)"/>
      <rect x="40" y="136" width="36" height="5" rx="2" fill="rgba(255,255,255,.3)"/>`;
  }

  private liveChat(tag: keyof typeof TEXT.chat, hype = 3) {
    if (!this.live.on) return;
    if (hype) liveEvent(this.live, hype);
    const lines = TEXT.chat[tag];
    if (!lines) return;
    this.chatQueue.push({ name: pick(this.rng, TEXT.chatNames), text: pick(this.rng, lines) });
    if (this.chatQueue.length > 3) this.chatQueue.shift();
    this.pumpChat();
  }

  /** Hộp (toạ độ stage) của một phần tử đang hiện; part < 1 lấy phần trên của hộp. */
  private stageBox(e: Element | null | undefined, part = 1): Box | null {
    if (!e || (e instanceof HTMLElement && e.style.display === 'none')) return null;
    const r = e.getBoundingClientRect();
    if (!r.height) return null;
    const a = toStage(r.left, r.top), z = toStage(r.right, r.bottom);
    return { l: a.x, t: a.y, r: z.x, b: a.y + (z.y - a.y) * part };
  }

  /** Những thứ lớp phủ live (bình luận, viên quà) phải né: mặt người trên điện thoại, mặt khách, bong bóng, miệng thau, cối. */
  private liveAvoid(): Box[] {
    const fc = this.stageBox([...(this.bean?.g.querySelectorAll('.face') ?? [])].find((e) => (e as SVGElement).style.display !== 'none'));
    const head: Box | null = fc && { l: fc.l - 8, t: fc.t - 8, r: fc.r + 8, b: fc.b + 8, w: 5 };
    const wt = (b: Box | null, w: number): Box | null => b && { ...b, w };
    // trọng số khi buộc phải đè: chữ thoại + mặt người nặng nhất, vành thau/cối nhẹ nhất
    const all: (Box | null)[] = [
      wt(this.stageBox(this.phoneScreen?.querySelector('circle')), 3),
      wt(this.stageBox(this.speech.el), 5),
      head,
      // cả dáng khách (tóc, nón) — chỉ phần trên, ngang vai
      wt(this.stageBox(this.bean?.g, 0.55), 3),
      wt(this.stageBox(this.svg.querySelector('#station-bowl'), 0.45), 1),
      wt(this.stageBox(this.svg.querySelector('#station-mortar')), 1),
    ];
    return all.filter((x): x is Box => !!x);
  }

  /** Chọn mốc top ít đè nhất (diện tích giao với các hộp cần né) cho phần tử d; hoà thì giữ mốc đứng trước. */
  private leastOverlapTop(d: HTMLElement, tops: number[], avoid: Box[]) {
    const cost = (t: number) => {
      const l = d.offsetLeft, r = l + d.offsetWidth, b = t + d.offsetHeight;
      return avoid.reduce((a, q) => a + (q.w ?? 2) * Math.max(0, Math.min(r, q.r + 2) - Math.max(l, q.l - 2)) * Math.max(0, Math.min(b, q.b + 2) - Math.max(t, q.t - 2)), 0);
    };
    let best = tops[0], bc = Infinity;
    for (const t of tops) { const c = cost(t); if (c < bc - 0.5) { best = t; bc = c; } }
    return best;
  }

  private pumpChat() {
    if (this.chatBusy || !this.chatQueue.length) return;
    this.chatBusy = true;
    const m = this.chatQueue.shift()!;
    const d = document.createElement('div');
    d.className = 'chat-pop';
    // V6-04: tên dài liền một chuỗi → cho ngắt sau dấu _ (CSS overflow-wrap:anywhere chỉ là dự phòng)
    d.innerHTML = `<b>${m.name.replace(/_/g, '_<wbr>')}</b> ${m.text}`;
    this.hud.appendChild(d);
    // V6-12: bình luận không che mặt người đang live trên điện thoại (máy ngắn) → hạ xuống phần dưới màn điện thoại
    // (chỗ bình luận của app live), hoặc dưới điện thoại; chọn mốc ít đè nhất
    const face = this.stageBox(this.phoneScreen?.querySelector('circle'));
    const screen = this.stageBox(this.phoneScreen?.firstElementChild);
    const ctops = [d.offsetTop];
    if (face) ctops.push(face.b + 4);
    if (screen) ctops.push(screen.b + 4);
    const ct = this.leastOverlapTop(d, ctops, this.liveAvoid());
    if (ct !== d.offsetTop) d.style.setProperty('top', `${Math.round(ct)}px`, 'important');
    gsap.fromTo(d, { y: 20, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' });
    gsap.to(d, { y: -40, opacity: 0, duration: 0.4, delay: 1.5, onComplete: () => { d.remove(); this.chatBusy = false; this.pumpChat(); } });
    // tim bay từ điện thoại
    for (let i = 0; i < 3; i++) this.heart(i * 0.12);
  }

  private heart(delay: number) {
    const h = el('path', { d: 'M 0 4 C -8 -4 -4 -10 0 -5 C 4 -10 8 -4 0 4 Z', fill: [P.pink, P.red, P.yellow][Math.floor(Math.random() * 3)], stroke: P.ink, 'stroke-width': 1.2 });
    h.setAttribute('transform', `translate(96 ${200 + LAYOUT.topY + LAYOUT.pinY})`);
    this.over.appendChild(h);
    gsap.to(h, { x: `+=${(Math.random() - 0.5) * 30}`, y: `-=${80 + Math.random() * 40}`, scale: 1.5, opacity: 0, duration: 1.4, delay, ease: 'power1.out', onComplete: () => h.remove() });
  }

  /** T25: bảng chốt đơn live — nhãn rủi ro trong ngoặc ở đầu câu, 8 giây; lần đầu dừng 1 nhịp giải thích. */
  private pitch() {
    if (this.pitchOpen || this.phase === 'closed') return;
    this.pitchOpen = true;
    const first = !this.s.tutorialSeen.includes('pitch1');
    if (first) this.s.tutorialSeen.push('pitch1');
    const card = document.createElement('div');
    card.className = 'pitch';
    card.innerHTML = `<div class="pitch-h">${TEXT_UI.c17}</div>${TEXT.pitches.map((p) => `<button data-id="${p.id}" class="p-${p.id}"><i>(${p.tag})</i> ${p.text}</button>`).join('')}${first ? `<div class="pitch-note">${TEXT_UI.c21}</div>` : ''}<div class="pitch-timer"><i></i></div>`;
    this.hud.appendChild(card);
    gsap.fromTo(card, { x: -380 }, { x: 0, duration: 0.3, ease: 'back.out(1.4)' });
    // thẻ chốt đơn che gần hết bong bóng khách → ẩn hẳn bong bóng (khỏi lòi mẩu chữ + nút Hả?/Tiễn), đóng thẻ thì hiện lại
    this.speech.el.style.visibility = 'hidden';
    // V3-27: điện thoại live ló mẩu "LIVE 54" + vòng đèn trên mép thẻ (máy cao) → mờ hẳn giá live lúc thẻ mở
    const rig = this.svg.querySelector('#live-rig') as SVGGElement | null;
    if (rig) gsap.to(rig, { opacity: 0, duration: 0.2 });
    const close = () => {
      this.pitchOpen = false;
      this.speech.el.style.visibility = '';
      if (rig) gsap.to(rig, { opacity: 1, duration: 0.25 });
      gsap.to(card, { x: -400, duration: 0.25, onComplete: () => card.remove() });
    };
    const bar = card.querySelector('.pitch-timer i') as HTMLElement;
    const tw = gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: ECON.live.pitchSeconds, delay: first ? 2.5 : 0, ease: 'none', transformOrigin: 'left', onComplete: close });
    card.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const p = TEXT.pitches.find((x) => x.id === b.dataset.id)!;
      tw.kill();
      liveEvent(this.live, p.hype);
      if (p.sus) {
        const before = this.s.suspicion;
        const a = p.sus * (1 + this.live.viewers / ECON.suspicion.liveDiv) * (hasUp(this.s, 'giay_cong_bo') ? 0.7 : 1);
        this.s.suspicion = Math.min(120, before + a);
        this.bumpNotices();
      }
      this.liveChat(p.id === 'honest' ? 'pitch_honest' : 'pitch_lie', 0);
      sfx(p.id === 'honest' ? 'ding' : 'gift');
      close();
    }));
  }

  // ---------------------------------------------------------------- tick
  private tick(dt: number) {
    if (this.phase === 'closed' || pauseState.on) return;
    // live 0,5 s
    this.liveTimer += dt;
    if (this.liveTimer >= 0.5) {
      this.liveTimer = 0;
      const out = liveTick(this.s, this.live, this.rng, this.log.sales);
      music.play(this.live.on && this.live.hype > 50 ? 'vina' : 'chill');
      if (this.live.on) {
        this.renderPhoneScreen();
        if (out.gift) {
          this.log.gifts += out.gift.value;
          sfx('gift');
          this.giftPop(out.gift.name, out.gift.value);
          this.refreshHud();
        }
        if (out.bored) this.liveChat('bored', 0);
        else if (Math.random() < 0.06) this.liveChat('idle', 0);
        // chỉ bật khi tay rảnh: không đang cầm món, không khuấy / đóng hũ
        if (out.pitch && !this.drag.busy && (this.phase === 'react' || this.phase === 'enter' || this.phase === 'prep')) this.pitch();
        else if (out.pitch) this.live.pitchTimer = ECON.live.pitchEvery - 3;
        if (Math.random() < this.live.viewers / 600) this.heart(0);
      }
    }
    // khách sốt ruột
    if ((this.phase === 'prep' || this.phase === 'stir' || this.phase === 'pack') && this.customers[this.ci]?.order.special !== 'me') {
      this.waitT += dt;
      if (this.impatient === 0 && this.waitT > 40) {
        this.impatient = 1;
        this.bean?.setExpr('meh');
        this.speech.say(pick(this.rng, ['Lâu dữ vậy em?', 'Em ơi chị còn đi đón con…', 'Trộn kem hay nấu cơm vậy?']), { compactAfter: 2500 });
        const say = this.customers[this.ci].order.say;
        window.setTimeout(() => { if (this.phase === 'prep') { this.speech.say(say, { compactAfter: 50 }); this.bean?.setExpr('idle'); } }, 2800);
      } else if (this.impatient === 1 && this.waitT > 70) {
        this.impatient = 2;
        this.bean?.setExpr('angry');
        this.bean?.shakeNo();
        this.speech.say('Thôi lẹ đi, boa ít lại à nha!', { tone: 'angry', compactAfter: 2500 });
        const say2 = this.customers[this.ci].order.say;
        window.setTimeout(() => { if (this.phase === 'prep') this.speech.say(say2, { compactAfter: 50 }); }, 2800);
        this.hooks.toast('Khách đợi lâu quá — tiền boa giảm một nửa.', 'bad');
      }
    }
    // độc tố: bong bóng/khói theo mức
    this.toxTimer += dt;
    if (this.mix && this.phase === 'prep' && this.toxTimer > 0.35) {
      this.toxTimer = 0;
      const d = this.mix.stats.d;
      const c = this.bowl.creamCenter;
      if (d >= 6 && Math.random() < (d >= 10 ? 0.9 : 0.4)) { bubble(c.x + (Math.random() - 0.5) * 150, c.y + (Math.random() - 0.3) * 30, d >= 10 ? '#9AD27A' : '#E9F7A8'); sfx('bubble', { vol: 0.5 }); }
      if (d >= 10 && Math.random() < 0.35) smoke(c.x + (Math.random() - 0.5) * 120, c.y - 20, '#9AD27A', 1);
      if (d >= RULES.docMax) {
        shake(0.12);
        if (Math.random() < 0.3) { sfx('warn'); popText(c.x, c.y - 70, 'SẮP NỔ!', P.red, 18, 14); }
      }
      if (d >= 10 && Math.random() < 0.08) this.liveChat('toxic', 2);
    }
  }

  private tearCalendar(prev: number) {
    const holder = el('g', { transform: `translate(352 ${89 + LAYOUT.topY + LAYOUT.pinY})` });
    const page = el('g');
    page.innerHTML = `<rect x="0" y="0" width="34" height="39" fill="${P.white}" stroke="${P.ink}" stroke-width="2"/><text x="17" y="27" font-family="Paytone One" font-size="22" fill="${P.red}" text-anchor="middle">${prev}</text>`;
    holder.appendChild(page);
    this.over.appendChild(holder);
    sfx('tick');
    gsap.timeline({ delay: 0.5, onComplete: () => holder.remove() })
      .to(page, { rotation: -14, duration: 0.12, transformOrigin: '0 0', ease: 'power2.out' })
      .to(page, { x: -60, y: 320, rotation: 220, duration: 1.1, ease: 'power1.in' })
      .to(page, { opacity: 0, duration: 0.2 }, '-=0.2');
  }

  /** Ổ điện tóe lửa. */
  private sparks() {
    for (let i = 0; i < 3; i++) {
      const sp = el('path', { d: 'M 0 0 l 3 -6 l 2 5 l 4 -3 l -2 6 Z', fill: P.yellow, stroke: P.ink, 'stroke-width': 1 });
      sp.setAttribute('transform', 'translate(370 162)');
      this.over.appendChild(sp);
      gsap.to(sp, { x: `+=${(Math.random() - 0.5) * 30}`, y: `+=${10 + Math.random() * 20}`, opacity: 0, duration: 0.35, onComplete: () => sp.remove() });
    }
  }

  /** Bàn tay chỉ đường: kéo từ A tới B, lặp 3 lần. */
  private hintDrag(a: { x: number; y: number }, b: { x: number; y: number }, force = false, layer: SVGElement = this.over) {
    if (this.items.length && !force) return () => {};
    const g = el('g');
    g.innerHTML = `<g transform="translate(-8 -4) rotate(-20)">
      <path d="M 0 0 C -4 -10 -4 -26 0 -34 C 4 -40 12 -36 11 -28 L 10 -10 C 18 -14 26 -10 26 -4 C 32 -6 38 -2 37 4 C 43 4 46 10 44 16 C 42 30 34 40 18 42 C 4 42 -4 34 -8 22 C -12 12 -6 4 0 0 Z" fill="${P.white}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 10 -10 L 10 6 M 26 -4 L 25 8 M 37 4 L 36 12" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/></g>`;
    // đặt sẵn chỗ + ẩn trước khi gắn vào cây: timeline chỉ render ở tick sau → tránh 1 khung hình tay hiện ở (0,0)
    gsap.set(g, { x: a.x, y: a.y, opacity: 0 });
    layer.appendChild(g);
    const tl = gsap.timeline({ repeat: 2, onComplete: () => g.remove() });
    tl.set(g, { x: a.x, y: a.y, opacity: 0, scale: 1 })
      .to(g, { opacity: 1, duration: 0.15 })
      .to(g, { scale: 0.85, duration: 0.12 })
      .to(g, { x: b.x, y: b.y, duration: 0.8, ease: 'power1.inOut' })
      .to(g, { scale: 1, duration: 0.12 })
      .to(g, { opacity: 0, duration: 0.2, delay: 0.2 });
    const kill = () => { tl.kill(); g.remove(); window.removeEventListener('pointerdown', kill, true); };
    window.addEventListener('pointerdown', kill, true);
    return kill;
  }

  private catVisit() {
    if (this.phase !== 'prep') return;
    liveEvent(this.live, 20);
    this.liveChat('cat', 0);
    this.liveChat('cat', 0);
    this.s.followers += 3;
    this.hooks.toast('Mèo nhà bên nhảy lên nằm đè tờ đơn! Chạm để đuổi.', 'info');
    runCat(this.over, this.hud, { x: 70, y: 700 + LAYOUT.dy }, () => liveEvent(this.live, 6), 8000);
  }

  private giftPop(name: string, value: number) {
    // viên quà mới thay viên cũ (không chồng 2 viên cùng chỗ lòi mẩu chữ)
    this.hud.querySelectorAll('.gift-pop').forEach((n) => { gsap.killTweensOf(n); n.remove(); });
    const d = document.createElement('div');
    d.className = 'gift-pop';
    // V6-08: tên quà không bị xuống dòng cắt đôi ("Ly trà / sữa"); V7-17: "tặng" dính với tên quà, không đứng một mình một dòng
    const who = pick(this.rng, TEXT.chatNames);
    const gift = `tặng\u00A0<i>${name.replace(/ /g, '\u00A0')}</i>`;
    d.innerHTML = `<b>${who.replace(/_/g, '_<wbr>')}</b> ${gift}\u00A0<em>+${value}k</em>`;
    this.hud.appendChild(d);
    // V2-24: máy ngắn đồ treo tường được ghim (pinY) nên huy hiệu LIVE lọt vào mốc CSS của viên quà → dời viên quà lên
    // trên huy hiệu (khe giữa bánh răng và điện thoại), không đủ chỗ thì xuống dưới huy hiệu
    // V5-14: né thêm bong bóng thoại, mặt khách và mặt người trên điện thoại live; không chỗ nào trống
    // thì xuống dưới điện thoại, cạnh trái thau, bề ngang tối đa 108px (cột trái, né bong bóng)
    const badge = this.stageBox(this.svg.querySelector('.lv-badge'));
    const screen = this.stageBox(this.phoneScreen?.firstElementChild);
    // V6-12: né thêm miệng thau, cối và khung bình luận đang hiện; không mốc nào trống thì lấy mốc ít đè nhất
    // (thử cả bản hẹp 2 dòng ≤ 108px, cùng cột với khung bình luận)
    const chat = [...this.hud.querySelectorAll('.chat-pop')].map((c) => this.stageBox(c)).filter((x): x is Box => !!x);
    // V7-17: huy hiệu LIVE + số người xem nặng ký (w 8) → mốc ít đè nhất không chọn chỗ che huy hiệu
    const avoid = [...(badge ? [{ ...badge, w: 8 }] : []), ...this.liveAvoid(), ...chat];
    const tops = [d.offsetTop];
    if (badge) tops.push(badge.t - 4 - d.offsetHeight, badge.b + 6);
    const okTops = tops.filter((t) => t >= 55);
    const free = (t: number) => {
      const l = d.offsetLeft, r = l + d.offsetWidth, b = t + d.offsetHeight;
      return !avoid.some((q) => l < q.r + 2 && r > q.l - 2 && t < q.b + 2 && b > q.t - 2);
    };
    let top = okTops.find(free);
    if (top === undefined) {
      d.classList.add('narrow');
      // V7-17: bản hẹp = 2 dòng "tên" / "tặng quà +Nk"; tên ngắn (≤ 13 ký tự) không ngắt giữa chừng ở dấu _
      d.innerHTML = `<b${who.length <= 13 ? ' class="nw"' : ''}>${who.length <= 13 ? who : who.replace(/_/g, '_<wbr>')}</b><span class="gp-g">${gift}</span> <em>+${value}k</em>`;
      const below = Math.max(screen?.b ?? 0, badge?.b ?? 0) + 6;
      const more = chat.map((c) => c.b + 4);
      top = this.leastOverlapTop(d, [below, ...tops.filter((t) => t >= 55), ...more], avoid);
    }
    if (top !== d.offsetTop) d.style.setProperty('top', `${Math.round(top)}px`, 'important');
    gsap.fromTo(d, { x: -200 }, { x: 0, duration: 0.3, ease: 'back.out(1.6)' });
    gsap.to(d, { opacity: 0, y: -20, delay: 2, duration: 0.3, onComplete: () => d.remove() });
  }

  // ---------------------------------------------------------------- T14: trạm chế biến dạy lần đầu
  private stationFx?: SVGGElement;
  private tagsG?: SVGGElement;
  private seen = (k: string) => this.s.tutorialSeen.includes(k);

  /** Đang cầm món: trạm xử lý được món đó sáng viền vàng nhấp nháy, trạm không xử lý được mờ đi. id=null → trả lại như cũ. */
  private stationGlow(id: string | null) {
    this.stationFx?.remove();
    this.stationFx = undefined;
    const sts = [{ key: 'mortar' as const, proc: 'nghien' as const, el: 'station-mortar' }, { key: 'blender' as const, proc: 'xay' as const, el: 'station-blender' }];
    for (const st of sts) if (unlocked(this.s, st.key)) (this.svg.querySelector('#' + st.el) as SVGGElement).style.opacity = '1';
    if (!id || isBase(id) || this.phase !== 'prep') return;
    const fx = el('g', { style: 'pointer-events:none' });
    for (const st of sts) {
      if (!unlocked(this.s, st.key)) continue;
      const ok = canProcess(id, st.proc);
      (this.svg.querySelector('#' + st.el) as SVGGElement).style.opacity = ok ? '1' : '0.4';
      if (!ok) continue;
      const c = st.key === 'mortar' ? { x: MORTAR.cx + 2, y: MORTAR.cy - 18, rx: 48, ry: 52 } : { x: BLENDER.cx, y: (BLENDER.jarTop + BLENDER.baseBottom) / 2 - 4, rx: 52, ry: 118 };
      const ring = el('ellipse', { cx: c.x, cy: c.y, rx: c.rx, ry: c.ry, fill: '#FFF3B0', 'fill-opacity': 0.22, stroke: P.yellow, 'stroke-width': 4, 'stroke-dasharray': '10 6' });
      fx.appendChild(ring);
      gsap.fromTo(ring, { opacity: 0.35 }, { opacity: 1, duration: 0.45, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }
    this.over.insertBefore(fx, this.over.firstChild);
    this.stationFx = fx;
  }

  /** Nhãn "GÕ ×5" / "GIỮ XAY" / "VẶN BẾP" dán cố định trên trạm tới khi dùng xong lần đầu. */
  private stationTags() {
    this.tagsG?.remove();
    const g = el('g', { class: 'st-tags', style: 'pointer-events:none' });
    const tag = (x: number, y: number, text: string, rot: number) => `<g transform="translate(${x} ${y})"><g class="tg" transform="rotate(${rot})"><rect x="-36" y="-12" width="72" height="22" rx="4" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2.2"/><text y="4.5" font-family="Paytone One" font-size="12" fill="${P.ink}" text-anchor="middle">${text}</text></g></g>`;
    let h = '';
    // neo theo thân trạm (dưới đáy cối / dưới đế máy xay) → máy ngắn không trôi lên đuôi bong bóng hay chân giá live
    // V7-12: nhãn cối dời trái 8px → cách viền đế bếp ≥ 6px, mép trái vẫn cách mép màn ≥ 6px
    if (unlocked(this.s, 'mortar') && !this.seen('used:mortar')) h += tag(MORTAR.cx - 2, MORTAR.cy + 66, TEXT_UI.c09tag, -6);
    if (unlocked(this.s, 'blender') && !this.seen('used:blender')) h += tag(BLENDER.cx + 12, BLENDER.baseBottom + 16, TEXT_UI.c10tag, 4);
    if (unlocked(this.s, 'stove') && !this.seen('used:stove')) h += tag(STOVE.knobX - 6, STOVE.knobY + 30, TEXT_UI.c11tag, -4);
    g.innerHTML = h;
    this.over.appendChild(g);
    this.tagsG = g;
    g.querySelectorAll('.tg').forEach((t, i) => gsap.to(t, { y: -3, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.2 }));
  }

  private markUsed(key: 'mortar' | 'blender' | 'stove') {
    if (this.seen(`used:${key}`)) return;
    this.s.tutorialSeen.push(`used:${key}`);
    this.stationTags();
  }

  /** Ngày mở cối / máy xay / bếp: bàn tay kéo mẫu 1 món xử lý được vào trạm (1 lần), kèm gợi ý công dụng. */
  private stationDemo() {
    if (this.phase !== 'prep' || this.tutOn) return;
    // toast demo dán phía đối diện trạm đang demo (không che trạm + nhãn trạm)
    const demo = (key: 'mortar' | 'blender', proc: 'nghien' | 'xay', to: { x: number; y: number }, text: string, prefer: string[], side: 'left' | 'right') => {
      if (this.s.day !== ECON.unlocks[key] || this.seen(`demo:${key}`) || !this.baseId) return false;
      const ids = [...prefer, ...INGREDIENTS.map((i) => i.id)].filter((id) => canProcess(id, proc) && (this.s.stock[id] ?? 0) > 0);
      const id = ids[0];
      if (!id) return false;
      this.s.tutorialSeen.push(`demo:${key}`);
      this.drawer.showTabOf(id);
      window.setTimeout(() => {
        const from = this.drawer.cellCenter(id);
        if (from) this.hintDrag(from, to, true);
        this.hooks.toast(text, 'info', { side });
      }, 400);
      return true;
    };
    if (demo('mortar', 'nghien', { x: MORTAR.cx, y: MORTAR.cy - 20 }, TEXT_UI.c09, ['tra_xanh', 'nghe', 'chanh'], 'right')) return;
    if (demo('blender', 'xay', { x: BLENDER.cx, y: BLENDER.jarTop + 40 }, TEXT_UI.c10, ['dua_leo', 'ca_chua', 'bot_gao'], 'left')) return;
    if (this.s.day === ECON.unlocks.stove && !this.seen('demo:stove') && this.items.length) {
      this.s.tutorialSeen.push('demo:stove');
      // đợi gợi ý khuấy (nếu có) đọc xong rồi mới chỉ bếp
      // giấy note dán TRÊN núm (trên thân thau), mũi tên chỉ núm nằm giữa; nhãn VẶN BẾP dưới núm để trống
      window.setTimeout(() => { this.hooks.toast(TEXT_UI.c11, 'info', { top: STOVE.knobY - 104 }); this.pointAt({ x: STOVE.knobX, y: STOVE.knobY - 8 }); }, 2600);
    }
  }

  /** Mũi tên vàng nhún nhảy chỉ vào 1 điểm (vài giây). */
  private pointAt(at: { x: number; y: number }, reps = 7) {
    const arrow = el('g', { transform: `translate(${at.x} ${at.y})`, style: 'pointer-events:none' });
    arrow.innerHTML = `<g><path d="M 0 0 l -12 -16 h 7 v -22 h 10 v 22 h 7 z" fill="${P.yellow}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/></g>`;
    this.over.appendChild(arrow);
    gsap.fromTo(arrow.firstElementChild, { y: -10 }, { y: 0, duration: 0.4, yoyo: true, repeat: reps, ease: 'sine.inOut', onComplete: () => arrow.remove() });
    return arrow;
  }

  // ---------------------------------------------------------------- T27: xem trước chế biến khi kéo qua cối / máy xay
  private procPeek?: SVGGElement;
  private peekProc(station: 'mortar' | 'blender', on: boolean) {
    this.procPeek?.remove();
    this.procPeek = undefined;
    if (!on || !this.dragId || this.phase !== 'prep') return;
    const id = this.dragId;
    const proc = station === 'mortar' ? 'nghien' : 'xay';
    const ok = canProcess(id, proc);
    const a = processedStats(id, 'raw'), b = ok ? processedStats(id, proc) : a;
    const ch = (['t', 'm', 'n', 'k', 'd'] as const).filter((k) => a[k] !== b[k]);
    const verb = proc === 'nghien' ? 'GIÃ' : 'XAY';
    const parts = ok ? ch.map((k) => `<tspan fill="${k === 'd' ? P.purple : P.ink}">${STAT_META[k].label} ${a[k]}→${b[k]}</tspan>`) : [];
    const plain = ok ? `${verb}: ` + ch.map((k) => `${STAT_META[k].label} ${a[k]}→${b[k]}`).join(' · ') : `Không ${verb.toLowerCase()} được món này`;
    const w = Math.min(330, plain.length * 6.6 + 22);
    const cx = Math.max(w / 2 + 6, Math.min(384 - w / 2, station === 'mortar' ? MORTAR.cx + 40 : BLENDER.cx - 30));
    const cy = station === 'mortar' ? MORTAR.cy - 112 : BLENDER.jarTop - 58;
    const g = el('g', { style: 'pointer-events:none', transform: `translate(${cx} ${cy})` });
    g.innerHTML = `<rect x="${-w / 2}" y="-14" width="${w}" height="26" rx="8" fill="${ok ? '#FFFDF6' : '#FFB4A6'}" stroke="${P.ink}" stroke-width="2.4"/>
      <text y="4.5" font-family="Baloo 2" font-weight="800" font-size="12.5" fill="${P.ink}" text-anchor="middle">${ok ? `<tspan font-family="Paytone One" font-weight="400">${verb}:</tspan> ${parts.join('<tspan> · </tspan>') || 'không đổi'}` : plain}</text>`;
    this.over.appendChild(g);
    gsap.fromTo(g, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(2)' });
    this.procPeek = g;
  }

  // ---------------------------------------------------------------- T15: livestream ngày mở
  private livePulseTl?: gsap.core.Timeline;
  /** Ngày mở live: điện thoại trên chân máy nhấp nháy + rung nhẹ tới lần bấm đầu. stop=true → tắt. */
  private livePulse(stop = false) {
    const phone = this.svg.querySelector('#phone') as SVGGElement;
    const ring = this.svg.querySelector('#ring-glow') as SVGElement;
    if (stop || !unlocked(this.s, 'live') || this.seen('live')) {
      if (this.livePulseTl) { this.livePulseTl.kill(); this.livePulseTl = undefined; gsap.set(phone, { rotation: 0 }); ring.setAttribute('stroke', P.white); }
      return;
    }
    ring.setAttribute('stroke', P.yellow);
    this.livePulseTl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
      .to(ring, { opacity: 1, duration: 0.25, yoyo: true, repeat: 3 }, 0)
      .to(phone, { rotation: 5, duration: 0.06, yoyo: true, repeat: 7, ease: 'steps(1)', transformOrigin: '50% 100%' }, 0)
      .set(phone, { rotation: 0 });
  }

  // ---------------------------------------------------------------- T16 / T17: gọi mối khi hết đồ
  private tipEl?: HTMLElement;
  /** Bong bóng nhỏ trên điện thoại bàn (tự tắt sau 6 giây hoặc khi chạm). */
  private phoneTip(text: string) {
    this.tipEl?.remove();
    // ngăn đang trống thì câu ngăn trống đã bảo bấm điện thoại rồi → khỏi nhắc chồng; danh bạ đang mở thì khỏi nhắc bấm điện thoại
    if (this.drawer.isEmpty() || this.stage.querySelector('#modal > .phone-modal')) return;
    const d = document.createElement('div');
    d.className = 'phone-tip';
    d.textContent = noOrphan(text);
    this.hud.appendChild(d);
    this.tipEl = d;
    gsap.fromTo(d, { scale: 0.4, opacity: 0, transformOrigin: '70% 100%' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
    // không chặn thao tác bên dưới (nằm đè ngăn kéo): chạm bất cứ đâu sau 1 giây hoặc đợi 6 giây là tắt
    const off = () => { window.removeEventListener('pointerdown', off, true); gsap.to(d, { opacity: 0, duration: 0.2, onComplete: () => d.remove() }); };
    window.setTimeout(() => { if (d.isConnected) window.addEventListener('pointerdown', off, true); }, 1000);
    window.setTimeout(off, 6000);
  }

  private hidePhoneTip() {
    this.tipEl?.remove();
    this.tipEl = undefined;
  }

  private shortFor = '';
  /** Kho hiện tại không làm nổi đơn đang có → điện thoại sáng lên + gợi ý gọi mối (không ép, không nói thua). */
  private checkStock() {
    const c = this.customers[this.ci];
    if (!c || this.phase !== 'prep' || !unlocked(this.s, 'phone')) { this.drawer.glowPhone(false); return; }
    const stock = { ...this.s.stock };
    if (this.baseId) stock[this.baseId] = (stock[this.baseId] ?? 0) + 1;
    for (const it of this.items) stock[it.id] = (stock[it.id] ?? 0) + 1;
    const ok = canMakeFromStock(c.order.target, stock, this.s.day);
    this.drawer.glowPhone(!ok);
    if (!ok && this.shortFor !== c.uid) { this.shortFor = c.uid; this.phoneTip(TEXT_UI.c16); }
  }

  // ---------------------------------------------------------------- T28: dạy sổ bí kíp
  private bookHint(c: Customer) {
    if (!unlocked(this.s, 'book') || this.seen('hintBook2') || !this.s.recipes.length) return;
    const r = this.s.recipes.find((x) => inTarget(x.stats as never, c.order.target) && hasStockFor(this.s, x.base, x.items.map((i) => i.id)));
    if (!r) return;
    this.s.tutorialSeen.push('hintBook2');
    window.setTimeout(() => {
      if (this.phase !== 'prep' || this.customers[this.ci] !== c) return;
      this.hooks.toast(TEXT_UI.c24, 'info');
      this.pointAt({ x: 326, y: 746 + LAYOUT.dy }, 9);
    }, 2600);
  }

  // ---------------------------------------------------------------- T22: chị Bảy ghé cửa sổ
  private bayVisit(): Promise<void> {
    this.s.tutorialSeen.push(`bay:${this.s.day}`);
    this.hooks.save();
    return new Promise((res) => {
      const slot = this.svg.querySelector('#customer-slot') as SVGGElement;
      const b = new Bean(slot, BAY_LOOK, 236, custY(), 0.8);
      b.holdProp('l', `<g transform="translate(-4 -6) scale(.8)">${soHui(-10)}</g>`);
      const fan = b.holdProp('r', `<g transform="translate(4 -4)">${fanNan(24)}</g>`);
      const debt = nextDebt(this.s);
      const ratio = debt ? Math.max(0, this.s.money) / debt.amount : 1;
      let line = TEXT_UI.c26, expr: Expr = 'happy';
      if (this.s.day === 4) { line = ratio < 0.4 ? TEXT_UI.c28 : TEXT_UI.c27; expr = ratio < 0.4 ? 'angry' : ratio < 0.7 ? 'sus' : 'talk'; }
      if (this.s.day === 9) { line = TEXT_UI.c29; expr = ratio < 0.4 ? 'angry' : ratio < 0.7 ? 'sus' : 'talk'; }
      this.phase = 'enter';
      sfx('ding');
      b.enter(420).then(() => {
        b.setExpr(expr);
        gsap.to(fan.firstElementChild, { rotation: 18, duration: 0.25, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '0 0' });
        if (expr === 'angry') { b.shakeNo(); sfx('angry'); }
        this.speech.setActions(false);
        this.speech.say(line, { tone: expr === 'angry' ? 'angry' : 'normal' });
        let gone = false;
        const leave = () => {
          if (gone) return;
          gone = true;
          slot.removeEventListener('pointerdown', leave);
          this.speech.hide();
          b.exit(-120).then(() => res());
        };
        slot.addEventListener('pointerdown', leave);
        window.setTimeout(leave, 4200);
      });
    });
  }

  // ---------------------------------------------------------------- T11: đơn hướng dẫn ngày 1 của Mẹ
  private tutOn = false;
  private tutStep = 0;
  private tutLoop?: number;
  private tutFx?: SVGGElement;
  private tutOver = false;
  private tutHand?: () => void;
  private tutC04At = 0;
  private tutMoreT?: number;
  private jarDragging = false;
  private packArrowFit?: () => void;

  private tutStart(c: Customer) {
    this.tutOn = true;
    this.tutStep = 0;
    this.tutOver = false;
    // các gợi ý chữ rời rạc đã có bong bóng của Mẹ thay
    for (const k of ['stir', 'stir2', 'deliver']) if (!this.seen(k)) this.s.tutorialSeen.push(k);
    window.setTimeout(() => { if (this.tutOn && this.customers[this.ci] === c) this.tutGo(1); }, 3800);
  }

  private tutClear() {
    window.clearInterval(this.tutLoop);
    window.clearTimeout(this.tutMoreT);
    this.tutMoreT = undefined;
    this.tutHand?.();
    this.tutHand = undefined;
    this.tutFx?.remove();
    this.tutFx = undefined;
  }

  /** Vòng sáng quanh thứ cần bấm. */
  private tutRing(x: number, y: number, rx: number, ry: number) {
    const g = el('g', { style: 'pointer-events:none' });
    g.innerHTML = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${P.yellow}" stroke-width="5"/><ellipse cx="${x}" cy="${y}" rx="${rx + 6}" ry="${ry + 6}" fill="none" stroke="${P.ink}" stroke-width="2" opacity=".5"/>`;
    this.over.appendChild(g);
    gsap.fromTo(g, { opacity: 0.3 }, { opacity: 1, duration: 0.5, yoyo: true, repeat: -1 });
    return g;
  }

  private tutGo(step: number) {
    if (!this.tutOn || step <= this.tutStep) return;
    this.tutStep = step;
    this.tutClear();
    const say = (t: string) => { this.bean?.talk(1200); this.speech.say(t); };
    const repeat = (fn: () => void) => { fn(); this.tutLoop = window.setInterval(() => { if (!this.drag.busy) fn(); }, 4200); };
    // tay chỉ kéo vô thau: vẽ trên lớp kéo (trên bong bóng + thẻ ghi chú); máy ngắn bong bóng phủ miệng thau → nhắm thấp hơn
    const dragLayer = this.stage.querySelector('#drag') as SVGSVGElement;
    const intoBowl = () => {
      const c = this.bowl.creamCenter;
      return LAYOUT.dy < -100 ? { x: c.x, y: c.y + 25 } : { x: BOWL.cx, y: BOWL.cy };
    };
    if (step === 1) {
      say(TEXT_UI.c02);
      this.drawer.setTab('cot');
      repeat(() => { const a = this.drawer.cellCenter('kem_tron'); if (a) this.tutHand = this.hintDrag(a, intoBowl(), true, dragLayer); });
    } else if (step === 2) {
      say(TEXT_UI.c03);
      this.drawer.setTab('rau');
      window.setTimeout(() => {
        const id = this.drawer.cellCenter('ca_chua') ? 'ca_chua' : 'nuoc_vo_gao';
        const a = this.drawer.cellCenter(id);
        if (a) {
          this.tutFx = this.tutRing(a.x, a.y, 32, 32);
          // chấm đỏ "MỚI" của ô nằm đúng trên vòng sáng → vẽ lại chấm lên trên vòng
          const d = this.drawer.newDotAt(id);
          if (d) this.tutFx.appendChild(el('circle', { cx: d.x, cy: d.y, r: 6, fill: P.red, stroke: P.white, 'stroke-width': 2 }));
        }
      }, 250);
    } else if (step === 3) {
      say(TEXT_UI.c04);
      this.tutC04At = performance.now();
      const id = (this.s.stock.ca_chua ?? 0) > 0 ? 'ca_chua' : 'nuoc_vo_gao';
      this.drawer.showTabOf(id);
      repeat(() => { const a = this.drawer.cellCenter(id); if (a && this.tutStep === 3) this.tutHand = this.hintDrag(a, intoBowl(), true, dragLayer); });
    } else if (step === 4) {
      say(TEXT_UI.c05);
      const c = this.bowl.creamCenter;
      this.tutFx = el('g', { style: 'pointer-events:none' });
      // V7-08: vòng gợi ý khuấy nét mực đậm trên viền trắng (vàng lẫn vào hạt vàng trên mặt kem), nằm trên cùng lớp over
      const ring = `M ${c.x - 60} ${c.y} a 60 20 0 1 0 120 0 a 60 20 0 1 0 -120 0`;
      this.tutFx.innerHTML = `<path d="${ring}" fill="none" stroke="#fff" stroke-width="8" stroke-opacity=".9"/><path class="tut-ring" d="${ring}" fill="none" stroke="${P.ink}" stroke-width="4" stroke-dasharray="9 7" stroke-linecap="round"/>`;
      this.over.appendChild(this.tutFx);
      gsap.to(this.tutFx.querySelector('.tut-ring'), { attr: { 'stroke-dashoffset': -64 }, duration: 1, repeat: -1, ease: 'none' });
    } else if (step === 5) {
      say(TEXT_UI.c06);
    } else if (step === 6) {
      say(TEXT_UI.c07);
    }
  }

  private tutEvent(ev: 'base' | 'info' | 'items' | 'stir' | 'pack' | 'packed', at?: Element, added = false) {
    if (!this.tutOn) return;
    if (ev === 'base') this.tutGo(2);
    else if (ev === 'info' && this.tutStep === 2) this.tutGo(3);
    else if (ev === 'items' && this.mix) {
      const r = this.customers[this.ci]?.order.target.t;
      // thả món mà chưa chạm thẻ cũng tính là đã biết bốc — lần thả này để c04 nói trọn, chưa nhắc "chưa đủ"
      const first = this.tutStep === 2 && this.items.length > 0;
      if (first) this.tutGo(3);
      if (r && this.tutStep >= 3 && this.mix.stats.t >= r[0] && this.mix.stats.t <= r[1]) {
        // lấy bớt về lại vừa trắng thì Mẹ nhắc khuấy lần nữa
        if (this.tutStep >= 4 && this.tutOver) { this.bean?.talk(1200); this.speech.say(TEXT_UI.c05); }
        this.tutOver = false;
        this.tutGo(4);
      } else if (r && this.tutStep >= 3 && this.mix.stats.t > r[1]) { this.tutOver = true; this.speech.say(TEXT_UI.c04over); }
      // c04 chưa gõ xong thì để Mẹ nói trọn câu đã, rồi mới nhắc "chưa đủ" (hẹn bù, không bỏ)
      else if (r && this.tutStep === 3 && added && !first) {
        const wait = 1800 - (performance.now() - this.tutC04At);
        window.clearTimeout(this.tutMoreT);
        const more = () => {
          this.tutMoreT = undefined;
          const t = this.mix?.stats.t ?? 0;
          if (this.tutOn && this.tutStep === 3 && t < r[0]) { this.bean?.talk(1000); this.speech.say(TEXT_UI.c04more); }
        };
        if (wait > 0) this.tutMoreT = window.setTimeout(more, wait);
        else more();
      }
    } else if (ev === 'stir') this.tutClear();
    else if (ev === 'pack') { this.speech.el.style.display = ''; this.tutGo(5); }
    else if (ev === 'packed' && at) {
      if (this.tutStep >= 6) return;
      this.tutGo(6);
      // tay chỉ kéo từ hũ lên tới mặt khách (đúng chỗ hũ bay tới khi giao), vẽ trên lớp kéo để không bị khay che.
      // V3-09: mặt Mẹ nằm ngay trên bong bóng → đợi đọc xong câu c07 rồi thu gọn bong bóng sang phải, tay mới chạy
      // (nhắm cao hơn mặt một chút để bàn tay không phủ lên bong bóng đã thu gọn).
      const hint = () => {
        const r = (at as SVGSVGElement).getBoundingClientRect();
        if (!r.width || this.tutStep !== 6 || this.jarDragging || this.phase !== 'pack') return;
        if (!this.speech.isCollapsed) { this.speech.collapse(); this.packArrowFit?.(); }
        const p = toStage(r.left + r.width / 2, r.top + r.height / 2);
        this.tutHand = this.hintDrag(p, { x: CUST_AT.x, y: CUST_AT.y + LAYOUT.topY - 30 }, true, this.stage.querySelector('#drag') as SVGSVGElement);
      };
      const start = () => {
        if (this.tutStep !== 6 || this.phase !== 'pack') return;
        if (!this.speech.readFor(1200)) { this.tutMoreT = window.setTimeout(start, 200); return; }
        hint();
        this.tutLoop = window.setInterval(() => { if (!this.drag.busy) hint(); }, 5200);
      };
      start();
    }
  }

  private tutDone() {
    this.tutOn = false;
    this.tutClear();
    if (!this.seen('tut1')) this.s.tutorialSeen.push('tut1');
    this.hooks.save();
  }

  // ---------------------------------------------------------------- T50: mỗi nguyên liệu một cảm giác (thử 3 kiểu)
  private dropFeel(id: string) {
    const x = BOWL.cx + (Math.random() - 0.5) * 60, y = BOWL.cy;
    if (id === 'chanh') {
      // chanh bắn nước: tia nước vàng văng xa + tiếng xèo nhỏ
      splash(x, y - 4, '#F7E35A', 10, 1.6);
      sfx('splash', { pitch: 1.6, vol: 0.6 });
    } else if (['bot_gao', 'bot_trang_dom', 'bot_bat_tong', 'dat_set', 'phan_rom'].includes(id)) {
      // bột bay bụi
      smoke(x, y - 12, '#F3EEE4', 3);
      crumbs(x, y - 6, '#FFFFFF', 6);
    } else if (id === 'mat_ong') {
      // mật ong chảy dẻo: dòng mật kéo dài từ trên xuống rồi đứt
      const g = el('path', { d: `M ${x} ${y - 90} C ${x - 4} ${y - 60} ${x + 4} ${y - 30} ${x} ${y}`, stroke: '#E9A23B', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round', opacity: 0.95 });
      this.over.appendChild(g);
      gsap.fromTo(g, { attr: { 'stroke-dasharray': '0 200' } }, { attr: { 'stroke-dasharray': '120 200' }, duration: 0.45, ease: 'power1.in' });
      gsap.to(g, { opacity: 0, duration: 0.3, delay: 0.7, onComplete: () => g.remove() });
    }
  }

  // ---------------------------------------------------------------- tiện ích
  private flyIcon(id: string, from: { x: number; y: number }, to: { x: number; y: number }, done: () => void) {
    const g = el('g');
    g.innerHTML = `<svg x="-26" y="-26" width="52" height="52" viewBox="0 0 80 80">${ICONS[id]}</svg>`;
    this.over.appendChild(g);
    const o = { t: 0 };
    const cx = (from.x + to.x) / 2, cy = Math.min(from.y, to.y) - 60;
    gsap.to(o, {
      t: 1, duration: 0.32, ease: 'power1.in',
      onUpdate: () => {
        const t = o.t, u = 1 - t;
        const x = u * u * from.x + 2 * u * t * cx + t * t * to.x;
        const y = u * u * from.y + 2 * u * t * cy + t * t * to.y;
        g.setAttribute('transform', `translate(${x} ${y}) rotate(${t * 200}) scale(${1 - t * 0.3})`);
      },
      onComplete: () => { g.remove(); done(); },
    });
  }

  private scold(kind: keyof typeof TEXT.scold) {
    sfx('starBad');
    this.hooks.toast(pick(this.rng, TEXT.scold[kind]), 'bad');
  }

  private infoCard(id: string) {
    this.hud.querySelector('.info-card')?.remove();
    this.tutEvent('info');
    if (!this.s.tutorialSeen.includes(`seen:${id}`)) { this.s.tutorialSeen.push(`seen:${id}`); this.drawer.refresh(); }
    const isB = isBase(id);
    const def = isB ? getBase(id) : ing(id);
    const d = document.createElement('div');
    d.className = 'info-card';
    const stats = (['t', 'm', 'n', 'k', 'd'] as const).filter((k) => def.stats[k]).map((k) => {
      const v = def.stats[k];
      return `<span class="chip" style="--c:${STAT_META[k].color}">${isB ? '' : v > 0 ? '+' : ''}${v} ${STAT_META[k].label}</span>`;
    }).join('');
    const cap = isB ? (def as { capacity: number }).capacity + (hasUp(this.s, 'thau_to') ? 1 : 0) : 0;
    const procs = isB ? `Chứa được ${cap} phần nguyên liệu` : procNames(ing(id).process.filter((p) => unlocked(this.s, p === 'nghien' ? 'mortar' : 'blender'))) || 'Bỏ thẳng vô thau';
    d.innerHTML = `<em class="ic-price">${def.price}k</em><div class="ic-top"><svg viewBox="0 0 80 80" width="54" height="54">${ICONS[id]}</svg><div><b>${def.name}</b><small>${procs}${def.fake ? ' · <u>HÀNG SỈ</u>' : ''}</small></div></div>
      <div class="chips">${stats || '<span class="chip">không làm gì cả</span>'}</div>
      <i>"${def.tip}"</i>`;
    this.hud.appendChild(d);
    gsap.fromTo(d, { y: 20, scale: 0.8, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.22, ease: 'back.out(2)' });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener('pointerdown', outside, true);
      gsap.to(d, { opacity: 0, y: 10, duration: 0.15, onComplete: () => d.remove() });
    };
    // T12: không tự tắt — chạm ra ngoài thẻ mới tắt (chạm món khác thì thẻ mới thay thẻ cũ)
    const outside = (ev: PointerEvent) => { if (!d.contains(ev.target as Node)) close(); };
    window.setTimeout(() => window.addEventListener('pointerdown', outside, true), 0);
  }

  private openBook() {
    if (this.phase !== 'prep' || this.locked) return this.hooks.toast('Đang làm dở, mở sổ sau nha.', 'info');
    this.hooks.openBook((r) => this.applyRecipe(r));
  }

  /** Trộn nhanh từ sổ: tay tự thả đúng món. */
  private applyRecipe(r: { base: string; items: BowlItem[]; heated: boolean }) {
    // trả lại mẻ đang dở
    if (this.baseId) this.s.stock[this.baseId]++;
    for (const it of this.items) this.s.stock[it.id]++;
    this.items = [];
    this.baseId = r.base;
    this.s.stock[r.base]--;
    this.drawer.selectedBase = r.base;
    this.bowl.setBase(getBase(r.base).color);
    this.drawer.refresh();
    r.items.forEach((it, i) => {
      this.s.stock[it.id]--;
      window.setTimeout(() => this.addToBowl({ ...it }, { x: 60 + (i % 4) * 60, y: 720 }), 200 + i * 220);
    });
    window.setTimeout(() => this.hooks.toast(r.heated ? 'Công thức này có đun — giữ núm bếp nha!' : 'Đủ món rồi, khuấy thôi!', 'info'), 300 + r.items.length * 220);
  }

  refreshHud() {
    const t = this.svg.querySelector('#tin-money');
    if (t) t.textContent = `${Math.round(this.s.money)}k`;
    const cal = this.svg.querySelector('#calendar-day');
    if (cal) cal.textContent = String(this.s.day);
    this.bumpNotices(false);
  }

  private noticeCount = -1;
  private bumpNotices(anim = true) {
    const n = Math.min(5, Math.floor(this.s.suspicion / 20));
    if (n === this.noticeCount) return;
    const g = this.svg.querySelector('#notices') as SVGGElement;
    g.innerHTML = Array.from({ length: n }, (_, i) => noticeSheet(i)).join('');
    if (anim && n > this.noticeCount && g.lastElementChild) {
      gsap.fromTo(g.lastElementChild, { scale: 2, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
      sfx('slap');
    }
    this.noticeCount = n;
  }

  private updateClock(p: number) {
    const hours = 8 + p * 12;
    const h = this.svg.querySelector('#clock-h') as SVGGElement | null;
    const m = this.svg.querySelector('#clock-m') as SVGGElement | null;
    // xoay quanh tâm mặt đồng hồ (0,0 cục bộ) bằng attribute rotate(): transformOrigin của GSAP tính theo bbox nét kim nên kim bị lệch
    const turn = (el: SVGGElement, to: number, ease: string) => {
      const o = { a: Number(el.dataset.a ?? 0) };
      gsap.to(o, { a: to, duration: 0.6, ease, onUpdate: () => { el.dataset.a = String(o.a); el.setAttribute('transform', `rotate(${o.a})`); } });
    };
    if (h) turn(h, (hours % 12) * 30, 'back.out(2)');
    if (m) turn(m, hours * 360, 'power2.out');
  }

  /** Hàng tồn mua thêm giữa ngày (gọi điện) → vẽ lại ngăn. */
  stockChanged() {
    this.drawer.refresh();
    this.refreshHud();
    this.checkStock();
  }

  get dayCustomers() {
    return this.customers;
  }
}

function labelOnly(id: string) {
  return labelSvg(id);
}

function recipeName(mix: MixResult, c: Customer, n: number) {
  const st = mix.stats;
  const top = (['t', 'm', 'n', 'k'] as const).reduce((a, b) => (st[b] > st[a] ? b : a), 't');
  const head = { t: 'Trắng', m: 'Mịn', n: 'Che Nắng', k: 'Khô Ráo' }[top];
  const tail = ['Thần Sầu', 'Bất Tử', 'Gia Truyền', 'Cấp Tốc', 'Như Phim', 'Hết Nước Chấm'][n % 6];
  void c;
  return `${head} ${tail}`;
}

/** Chỉ số mẻ → trạng thái vật lý vẽ trên thau (T30). */
function physicsOf(mix: MixResult, items: BowlItem[], heated: boolean): Physics {
  const has = (id: string) => items.some((i) => i.id === id);
  return {
    t: mix.stats.t, m: mix.stats.m, n: mix.stats.n, k: mix.stats.k, d: mix.stats.d, kRaw: mix.raw.k,
    split: mix.overused.length > 0,
    curd: has('chanh') && has('trung'),
    foam: mix.combos.some((c) => c.fx === 'nui_lua') || mix.fakeClash,
    steam: heated,
  };
}

/** Tên cách chế biến cho thẻ ghi chú (chỉ trạm đã mở). */
function procNames(ps: string[]) {
  return ps.map((p) => (p === 'nghien' ? 'Nghiền được' : 'Xay được')).join(' · ');
}
