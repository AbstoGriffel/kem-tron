import { gsap } from 'gsap';
import { beanSvg, type Accessory, type Expr } from '../art/bean';
import { ICONS } from '../art/icons';
import { el, P, starPath } from '../art/kit';
import { applyStationLayout, BLENDER, blender, BOWL, calendar, clock, livePhone, MORTAR, mortar, noticeSheet, stove } from '../art/props';
import { colorName, shade } from '../core/color';
import { base as getBase, ing, isBase, RULES } from '../core/db';
import { newDayLog, type DayLog } from '../core/day';
import { liveEvent, liveTick, newLive, type LiveState } from '../core/live';
import { canProcess, computeMix } from '../core/mix';
import { pick, type Rng } from '../core/rng';
import { serve, TEXT, usesGarden, type ServeOutcome } from '../core/serve';
import { customersForDay, dayRng, ECON, hasUp, JARS, LABELS, unlocked, type Customer, type SaveState } from '../core/state';
import type { BowlItem, MixResult } from '../core/types';
import { blenderLoop, buzz, sfx } from './audio';
import { BowlView, StirArm } from './bowlView';
import { Bean } from './customer';
import { DragManager } from './drag';
import { Drawer } from './drawer';
import { boomBurst, bubble, coinsTo, crumbs, flash, hitstop, popText, shake, smoke, sparkles, splash } from './fx';
import { jarSvg, labelSvg } from './jar';
import { music } from './music';
import { runCat } from './cat';
import { Speech } from './speech';
import { LAYOUT, toStage } from './stage';
import { pauseState } from './settings';
import { STAT_META, Ticket } from './ticket';

export interface ShopHooks {
  save: () => void;
  onDayEnd: (log: DayLog, live: LiveState) => void;
  openBook: (onPick: (r: { base: string; items: BowlItem[]; heated: boolean }) => void) => void;
  openPhone: () => void;
  toast: (msg: string, kind?: 'info' | 'bad' | 'good') => void;
}

type Phase = 'idle' | 'enter' | 'prep' | 'stir' | 'pack' | 'deliver' | 'react' | 'closed';

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

    this.drawer.onPickBase = (id, e, pos) => {
      if (this.phase !== 'prep') return;
      this.drag.start(e, id, pos, { onDrop: (zone) => { if (zone !== 'bowl') return false; this.pickBase(id, e, true); return true; } });
    };
    this.drawer.onPickIng = (id, e, pos) => this.pickIngredient(id, e, pos);
    this.drawer.onTapIng = (id) => this.infoCard(id);
    this.drawer.onBook = () => this.openBook();
    this.drawer.onPhone = () => this.hooks.openPhone();

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
    const knobHit = el('circle', { cx: 270, cy: 476, r: 30, fill: 'transparent' });
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

    this.lockStations();
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

  private lockStations() {
    const dim = (id: string, on: boolean, label: string) => {
      const g = this.svg.querySelector('#' + id) as SVGGElement;
      g.style.opacity = on ? '1' : '0.45';
      g.querySelector('.lock-tag')?.remove();
      if (!on) {
        const bb = g.getBBox();
        const t = el('g', { class: 'lock-tag', transform: `translate(${bb.x + bb.width / 2} ${bb.y + bb.height / 2}) rotate(-8)` });
        t.innerHTML = `<rect x="-42" y="-13" width="84" height="24" rx="4" fill="${P.paperHi}" stroke="${P.ink}" stroke-width="2"/><text y="5" font-family="Paytone One" font-size="12" fill="${P.ink}" text-anchor="middle">${label}</text>`;
        g.appendChild(t);
      }
    };
    dim('station-mortar', unlocked(this.s, 'mortar'), `MỞ NGÀY ${ECON.unlocks.mortar}`);
    dim('station-blender', unlocked(this.s, 'blender'), `MỞ NGÀY ${ECON.unlocks.blender}`);
    const knob = this.svg.querySelector('#knob') as SVGGElement;
    knob.style.opacity = unlocked(this.s, 'stove') ? '1' : '0.4';
    const live = this.svg.querySelector('#live-rig') as SVGGElement;
    live.style.opacity = unlocked(this.s, 'live') ? '1' : '0.5';
  }

  private hoverZone(id: string, on: boolean) {
    const g = this.svg.querySelector('#' + id) as SVGGElement;
    gsap.to(g, { scale: on ? 1.04 : 1, duration: 0.15, ease: 'back.out(3)', transformOrigin: '50% 80%' });
    if (id === 'station-bowl') this.ghostPreview(on);
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
    if (unlocked(this.s, 'phone') && !this.s.tutorialSeen.includes('hintPhone')) hint('hintPhone', 'Hết hàng thì bấm cái điện thoại bàn để gọi mối nhập thêm (trả giá được đó)!', { x: 246, y: 744 + LAYOUT.dy }, true);
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
    const c = this.customers[this.ci];
    this.phase = 'enter';
    const slot = this.svg.querySelector('#customer-slot') as SVGGElement;
    this.bean = new Bean(slot, { color: c.color, acc: c.acc }, 236, 274, 0.8);
    sfx('ding');
    await this.bean.enter(420);
    this.bean.setExpr(c.order.special === 'thanh_tra' ? 'sus' : 'idle');
    this.bean.startFidget(() => this.lastPointer);
    music.play(c.order.special === 'thanh_tra' ? 'tense' : 'chill');
    this.ticket.show(c, false);
    this.askedClear = false;
    this.bean.talk(1800);
    this.speech.say(c.order.say, { compactAfter: 5200 });
    this.speech.setActions(true, c.order.clarity !== 1);
    this.phase = 'prep';
    this.drawer.setTab('cot');
    this.waitT = 0;
    this.impatient = 0;
    this.drawer.refresh();
    this.liveChat('idle');
    if (this.live.on && this.s.day >= 3 && this.rng() < 0.18) window.setTimeout(() => this.catVisit(), 7000);
    if (this.s.day === 1 && this.ci === 0) this.hooks.toast('Kéo 1 hộp cốt kem vào thau trước, rồi kéo nguyên liệu vào.', 'info');
    this.updatePreview();
  }

  private closeShop() {
    this.phase = 'closed';
    this.ticket.hide();
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
      if (this.s.day === 1 && this.ci === 0 && !this.items.length) window.setTimeout(() => { const from = this.drawer.cellCenter('chanh'); if (from) this.hintDrag(from, { x: BOWL.cx, y: BOWL.cy }); }, 500);
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
      if (!this.s.tutorialSeen.includes('blender')) { this.s.tutorialSeen.push('blender'); this.hooks.toast('Giữ nút XAY tới khi đầy vạch rồi thả!', 'info'); }
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
    this.bowl.spoonRest.style.display = this.canStir() ? '' : 'none';
    if (this.canStir() && !this.s.tutorialSeen.includes('stir')) {
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
    if (prev && diff.d && diff.d > 0) {
      if (this.mix.stats.d >= 6) this.bean?.wince();
      popText(BOWL.cx + 60, BOWL.cy - 50, `+${diff.d} ĐỘC`, STAT_META.d.color, 16);
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
    if (!unlocked(this.s, 'mortar')) return this.hooks.toast(`Cối mở từ ngày ${ECON.unlocks.mortar}.`, 'info');
    const pestle = this.svg.querySelector('#pestle') as SVGGElement;
    const m = this.mortarItem;
    // chày: nhấc rồi giã (smear 1 khung)
    gsap.timeline()
      .to(pestle, { y: -26, rotation: -32, duration: 0.07, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(pestle, { y: 4, rotation: -24, scaleY: 1.25, duration: 0.05, ease: 'power4.in' })
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
    if (!unlocked(this.s, 'blender')) return this.hooks.toast(`Máy xay mở từ ngày ${ECON.unlocks.blender}.`, 'info');
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
    if (!unlocked(this.s, 'stove')) return this.hooks.toast(`Bếp mở từ ngày ${ECON.unlocks.stove}.`, 'info');
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
        if (sndT > 0.9) { sndT = 0; sfx('stir', { pitch: 0.8 + Math.min(0.5, Math.abs(speed) * 0.1) + Math.min(0.6, acc / need * 0.6) }); }
        // thau lắc ngược pha với vá
        const bowlG = this.svg.querySelector('#station-bowl') as SVGGElement;
        gsap.set(bowlG, { rotation: -Math.sin(spoonA) * Math.min(2, Math.abs(speed) * 0.8), transformOrigin: `${BOWL.cx}px ${BOWL.bottomY}px` });
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
    this.speech.setActions(true, !this.ticket.isRevealed);
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
    ui.innerHTML = `<svg viewBox="0 0 390 266" width="390" height="266">
      <defs><pattern id="pk-wood" width="80" height="22" patternUnits="userSpaceOnUse"><rect width="80" height="22" fill="#C98A55"/><path d="M0 7 C 20 4 40 10 80 6 M0 16 C 25 19 50 13 80 17" stroke="#A9663A" stroke-width="1.3" fill="none" opacity=".6"/></pattern></defs>
      <rect width="390" height="266" fill="#BFE3D3"/>
      <rect y="0" width="390" height="5" fill="${P.ink}" opacity=".25"/>
      <!-- kệ gỗ treo tường -->
      <rect x="6" y="104" width="196" height="12" fill="url(#pk-wood)" ${ink2}/>
      <path d="M 24 116 l 10 14 M 184 116 l -10 14" stroke="${P.ink}" stroke-width="4"/>
      <text x="12" y="22" font-family="Paytone One" font-size="15" fill="${P.ink}">1. Chọn hũ</text>
      ${jars.map((j, i) => `<g class="pk-jar" data-id="${j.id}" transform="translate(${10 + i * 64} 34)" style="cursor:pointer">
          <svg width="60" height="60" viewBox="0 0 80 80">${jarSvg(j.id, '#E9E2DA', null)}</svg>
          <g transform="translate(46 2) rotate(10)"><path d="M -4 -6 L 0 -12 L 4 -6" stroke="${P.ink}" stroke-width="1.4" fill="none"/><rect x="-11" y="-6" width="22" height="13" rx="2" fill="${P.paperHi}" ${ink2}/><text y="4.5" font-family="Paytone One" font-size="9.5" text-anchor="middle" fill="${P.ink}">${j.price}k</text></g>
        </g>`).join('')}
      <!-- tờ decal treo móc -->
      <g transform="translate(212 6)">
        <circle cx="86" cy="2" r="4" fill="${P.steelDark}" ${ink2}/>
        <path d="M 0 8 H 172 V 150 L 160 156 L 148 150 L 136 156 L 124 150 L 112 156 L 100 150 L 88 156 L 76 150 L 64 156 L 52 150 L 40 156 L 28 150 L 16 156 L 4 150 L 0 152 Z" fill="#FFFDF6" ${ink2}/>
        <text x="10" y="28" font-family="Paytone One" font-size="15" fill="${P.ink}">2. Dán nhãn</text>
        ${labels.map((l, i) => `<g class="pk-label" data-id="${l.id}" transform="translate(${8 + (i % 2) * 82} ${40 + Math.floor(i / 2) * 54})" style="cursor:pointer">
            <rect x="-2" y="-2" width="80" height="50" rx="6" fill="none" stroke="${P.steelDark}" stroke-width="1.4" stroke-dasharray="4 3"/>
            <svg x="0" y="0" width="76" height="38" viewBox="16 40 48 22">${labelOnly(l.id)}</svg>
            <text x="38" y="44" font-family="Baloo 2" font-weight="800" font-size="11" text-anchor="middle" fill="${P.blueDark}">${l.price ? l.price + 'k' : 'free'}</text>
          </g>`).join('')}
      </g>
      <!-- đế đặt hũ thành phẩm -->
      <ellipse cx="74" cy="250" rx="64" ry="12" fill="${P.ink}" opacity=".18"/>
      <ellipse cx="74" cy="244" rx="62" ry="11" fill="#E9E2DA" ${ink2}/>
      <g class="pk-slot"><ellipse cx="74" cy="200" rx="34" ry="34" fill="none" stroke="${P.inkSoft}" stroke-width="2.5" stroke-dasharray="6 5"/><text x="74" y="205" font-family="Paytone One" font-size="11" text-anchor="middle" fill="${P.inkSoft}">hũ ở đây</text></g>
      <svg class="pack-jar" x="8" y="114" width="132" height="132" viewBox="0 0 80 80" style="cursor:grab;overflow:visible"></svg>
      <g class="pk-arrow" opacity="0"><path d="M 150 210 C 190 200 196 170 196 150" stroke="${P.red}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="2 9"/><path d="M 186 156 L 196 140 L 206 156" stroke="${P.red}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="150" y="232" font-family="Paytone One" font-size="14" fill="${P.red}"><tspan x="150">3. Hất hũ</tspan><tspan x="164" dy="17">lên khách</tspan></text></g>
      <!-- ghim bí kíp -->
      <g class="pk-pin" transform="translate(282 186) rotate(-4)" style="cursor:${bookOn ? 'pointer' : 'default'};opacity:${bookOn ? 1 : 0.45}">
        <rect x="0" y="0" width="98" height="58" fill="${P.yellow}" ${ink2}/>
        <circle cx="49" cy="2" r="6" fill="${P.red}" ${ink2}/>
        <text x="49" y="26" font-family="Paytone One" font-size="11" text-anchor="middle" fill="${P.ink}">${bookOn ? 'Ghi vô' : 'Sổ mở'}</text>
        <text x="49" y="42" font-family="Paytone One" font-size="11" text-anchor="middle" fill="${P.ink}">${bookOn ? 'bí kíp?' : 'ngày ' + ECON.unlocks.book}</text>
        <g class="pk-tick" opacity="0"><circle cx="86" cy="48" r="14" fill="${P.green}" ${ink2}/><path d="M 79 48 l 5 5 l 9 -10" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      </g>
    </svg>`;
    this.hud.appendChild(ui);
    gsap.fromTo(ui, { y: 300 }, { y: 0, duration: 0.35, ease: 'back.out(1.4)' });
    const jarEl = ui.querySelector('.pack-jar') as SVGSVGElement;
    const slot = ui.querySelector('.pk-slot') as SVGGElement;
    const arrow = ui.querySelector('.pk-arrow') as SVGGElement;
    const redraw = () => {
      jarEl.innerHTML = this.jar ? jarSvg(this.jar, color, this.label) : '';
      slot.style.display = this.jar ? 'none' : '';
      if (this.jar && this.label) {
        gsap.to(arrow, { opacity: 1, duration: 0.2 });
        gsap.fromTo(arrow, { y: 6 }, { y: -4, duration: 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }
    };
    redraw();
    ui.querySelectorAll<SVGGElement>('.pk-jar').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.jar = b.dataset.id!;
      ui.querySelectorAll<SVGGElement>('.pk-jar').forEach((x) => (x.style.opacity = x === b ? '0.25' : '1'));
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
      ui.querySelectorAll<SVGGElement>('.pk-label').forEach((x) => (x.style.opacity = x === b ? '0.3' : '1'));
      sfx('slap');
      redraw();
      gsap.fromTo(jarEl, { scale: 1.12, rotation: -5, transformOrigin: '50% 80%' }, { scale: 1, rotation: 0, duration: 0.35, ease: 'back.out(3)' });
      const lbl = jarEl.lastElementChild as SVGElement | null;
      if (lbl) gsap.from(lbl, { skewX: 25, scaleX: 0.3, duration: 0.25, ease: 'back.out(2)', transformOrigin: '50% 50%' });
    }));
    const pin = ui.querySelector('.pk-pin') as SVGGElement;
    pin.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!bookOn) return;
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
    // hất: chỉ cần kéo hũ lên khỏi vùng đóng gói (hoặc vung nhanh lên) là hũ văng vào khách
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
      const p = toStage(ev.clientX, ev.clientY);
      if (p.y < packTop - 10 || vy < -0.8) {
        // văng theo cung lên cửa sổ, xoay vòng
        const tx = 236, ty = 190 + LAYOUT.topY;
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
    if (!this.s.tutorialSeen.includes('deliver')) { this.s.tutorialSeen.push('deliver'); this.hooks.toast('Hất hũ lên là hũ bay qua cho khách!', 'info'); }
  }

  // ---------------------------------------------------------------- giao + phản ứng
  private async deliver() {
    this.phase = 'react';
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
    this.ticket.reveal();
    this.speech.hide();
    await this.react(out, c);
  }

  private storeRecipe(c: Customer) {
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
    this.hooks.toast('Đã ghi vô sổ bí kíp!', 'good');
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
          if (out.expr === 'glow') { b.glow(); sfx('ding'); sparkles(236, 120, 6, P.white, 80); }
          if (out.expr === 'ecstatic' || out.expr === 'glow') { b.hop(26); sfx('happy'); }
          if (out.expr === 'happy') b.hop(12);
          if (out.expr === 'sick') { b.swell(); sfx('angry'); shake(0.4); }
          if (out.expr === 'angry') { b.shakeNo(); sfx('angry'); shake(0.3); }
          if (out.expr === 'disgust') { b.shakeNo(); }
          if (out.caughtByInspector) { b.setExpr('sus'); sfx('siren'); }
          const tone = out.score.stars >= 4 ? 'happy' : out.score.stars < 3 ? 'angry' : 'normal';
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
          this.ticket.hide();
          this.clearStars();
          this.s.progress = { day: this.s.day, served: this.ci + 1, log: { ...this.log, stars: this.log.stars.slice() }, peak: this.live.peak, customers: this.customers };
          this.hooks.save();
          b.exit(-120).then(() => {
            this.bean = undefined;
            if (out.caughtByInspector) this.hooks.toast('Anh khách lạ là thanh tra! Nghi ngờ tăng vọt.', 'bad');
            window.setTimeout(() => this.nextCustomer(), 350);
          });
        });
    });
  }

  /** Ảnh "trước – sau" kiểu quảng cáo kem trộn. */
  private beforeAfter(c: Customer, out: ServeOutcome) {
    const after: Expr = out.expr === 'glow' ? 'glow' : out.expr;
    const glow = out.expr === 'glow' || out.expr === 'ecstatic';
    const sick = out.expr === 'sick';
    const bean = (e: Expr, extra: string) => `<svg viewBox="-80 -235 160 200" width="118" height="148">${extra}${beanSvg({ color: sick && e !== 'idle' ? '#F2675A' : c.color, acc: c.acc as Accessory[] }).replace(`face-${e}" style="display:none"`, `face-${e}"`)}</svg>`;
    const rays = `<g opacity=".7">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M 0 -130 L ${Math.cos(a) * 160} ${-130 + Math.sin(a) * 160} L ${Math.cos(a + 0.2) * 160} ${-130 + Math.sin(a + 0.2) * 160} Z" fill="#FFF7C2"/>`; }).join('')}</g>`;
    const d = document.createElement('div');
    d.className = 'polaroid';
    d.innerHTML = `<div class="pl-pics">
        <figure><div class="pl-ph">${bean('idle', '')}</div><figcaption>TRƯỚC</figcaption></figure>
        <figure class="${sick ? 'bad' : glow ? 'good' : ''}"><div class="pl-ph">${bean(after, glow ? rays : '')}</div><figcaption>SAU</figcaption></figure>
      </div>
      <div class="pl-cap">"${out.review.text}"</div>
      <div class="pl-tag">${'★'.repeat(out.review.stars)}${'☆'.repeat(5 - out.review.stars)} — ${c.name}</div>`;
    this.hud.appendChild(d);
    gsap.fromTo(d, { x: 420, rotation: 14 }, { x: 0, rotation: -3, duration: 0.45, ease: 'back.out(1.5)', delay: 0.3 });
    gsap.to(d, { x: -440, rotation: -14, duration: 0.35, ease: 'power2.in', delay: 3.4, onComplete: () => d.remove() });
    d.addEventListener('pointerdown', () => gsap.to(d, { x: -440, duration: 0.25, onComplete: () => d.remove() }));
  }

  private starsG?: SVGGElement;
  private dropStars(stars: number) {
    this.starsG?.remove();
    const g = el('g');
    this.over.appendChild(g);
    this.starsG = g;
    const x0 = BOWL.cx - 60, y0 = BOWL.cy - 74;
    for (let i = 0; i < 5; i++) {
      const full = stars >= i + 1;
      const half = !full && stars >= i + 0.5;
      const holder = el('g', { transform: `translate(${x0 + i * 30} ${y0})` });
      const s = el('g');
      holder.appendChild(s);
      s.innerHTML = `<path d="${starPath(0, 0, 14)}" fill="${full ? P.yellow : half ? '#FFE39A' : '#D8CFC0'}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
        ${half ? `<path d="M 0 -14 L 0 11 L -8 13 L -6 4 L -13 -4 L -4 -5 Z" fill="${P.yellow}"/>` : ''}`;
      g.appendChild(holder);
      gsap.fromTo(s, { y: -120, rotation: full ? -180 : 0, opacity: 0 }, {
        y: 0, rotation: 0, opacity: 1, duration: 0.5, delay: i * 0.12, ease: full ? 'bounce.out' : 'power3.in',
        onComplete: () => { sfx(full ? 'star' : 'starBad', { pitch: 1 + i * 0.08 }); if (full) sparkles(x0 + i * 30, y0, 2, P.yellow, 18); },
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
      this.ticket.hide();
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
    this.speech.say(`Trời, nói vậy mà không hiểu. ${c.order.clear} (Khỏi boa nha!)`, { tone: 'angry', compactAfter: 5000 });
    this.bean?.shakeNo();
    this.updatePreview(false);
    window.setTimeout(() => this.bean?.setExpr('idle'), 1400);
  }

  // ---------------------------------------------------------------- livestream
  private toggleLive() {
    if (!unlocked(this.s, 'live')) return this.hooks.toast(`Livestream mở từ ngày ${ECON.unlocks.live}.`, 'info');
    this.live.on = !this.live.on;
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
      if (!this.s.tutorialSeen.includes('live')) {
        this.s.tutorialSeen.push('live');
        this.hooks.toast('Đang LIVE! Drama càng to mắt xem càng đông, có quà. Nhưng ăn gian lúc live thì bị soi gấp bội.', 'info');
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
      <rect x="40" y="51" width="22" height="10" rx="2" fill="${P.red}"/>
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

  private pumpChat() {
    if (this.chatBusy || !this.chatQueue.length) return;
    this.chatBusy = true;
    const m = this.chatQueue.shift()!;
    const d = document.createElement('div');
    d.className = 'chat-pop';
    d.innerHTML = `<b>${m.name}</b> ${m.text}`;
    this.hud.appendChild(d);
    gsap.fromTo(d, { y: 20, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' });
    gsap.to(d, { y: -40, opacity: 0, duration: 0.4, delay: 1.5, onComplete: () => { d.remove(); this.chatBusy = false; this.pumpChat(); } });
    // tim bay từ điện thoại
    for (let i = 0; i < 3; i++) this.heart(i * 0.12);
  }

  private heart(delay: number) {
    const h = el('path', { d: 'M 0 4 C -8 -4 -4 -10 0 -5 C 4 -10 8 -4 0 4 Z', fill: [P.pink, P.red, P.yellow][Math.floor(Math.random() * 3)], stroke: P.ink, 'stroke-width': 1.2 });
    h.setAttribute('transform', `translate(96 ${200 + LAYOUT.topY})`);
    this.over.appendChild(h);
    gsap.to(h, { x: `+=${(Math.random() - 0.5) * 30}`, y: `-=${80 + Math.random() * 40}`, scale: 1.5, opacity: 0, duration: 1.4, delay, ease: 'power1.out', onComplete: () => h.remove() });
  }

  private pitch() {
    if (this.pitchOpen || this.phase === 'closed') return;
    this.pitchOpen = true;
    const card = document.createElement('div');
    card.className = 'pitch';
    card.innerHTML = `<div class="pitch-h">Mắt xem đang chờ! Chốt đơn câu gì?</div>${TEXT.pitches.map((p) => `<button data-id="${p.id}" class="p-${p.id}">${p.text}</button>`).join('')}<div class="pitch-timer"><i></i></div>`;
    this.hud.appendChild(card);
    gsap.fromTo(card, { x: -380 }, { x: 0, duration: 0.3, ease: 'back.out(1.4)' });
    const close = () => {
      this.pitchOpen = false;
      gsap.to(card, { x: -400, duration: 0.25, onComplete: () => card.remove() });
    };
    const bar = card.querySelector('.pitch-timer i') as HTMLElement;
    const tw = gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: 4.5, ease: 'none', transformOrigin: 'left', onComplete: close });
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
        if (out.pitch && (this.phase === 'react' || this.phase === 'enter' || (this.phase === 'prep' && !this.baseId))) this.pitch();
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
    const holder = el('g', { transform: `translate(352 ${89 + LAYOUT.topY})` });
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
  private hintDrag(a: { x: number; y: number }, b: { x: number; y: number }) {
    if (this.items.length) return;
    const g = el('g');
    g.innerHTML = `<g transform="translate(-8 -4) rotate(-20)">
      <path d="M 0 0 C -4 -10 -4 -26 0 -34 C 4 -40 12 -36 11 -28 L 10 -10 C 18 -14 26 -10 26 -4 C 32 -6 38 -2 37 4 C 43 4 46 10 44 16 C 42 30 34 40 18 42 C 4 42 -4 34 -8 22 C -12 12 -6 4 0 0 Z" fill="${P.white}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M 10 -10 L 10 6 M 26 -4 L 25 8 M 37 4 L 36 12" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/></g>`;
    this.over.appendChild(g);
    const tl = gsap.timeline({ repeat: 2, onComplete: () => g.remove() });
    tl.set(g, { x: a.x, y: a.y, opacity: 0, scale: 1 })
      .to(g, { opacity: 1, duration: 0.15 })
      .to(g, { scale: 0.85, duration: 0.12 })
      .to(g, { x: b.x, y: b.y, duration: 0.8, ease: 'power1.inOut' })
      .to(g, { scale: 1, duration: 0.12 })
      .to(g, { opacity: 0, duration: 0.2, delay: 0.2 });
    const kill = () => { tl.kill(); g.remove(); window.removeEventListener('pointerdown', kill, true); };
    window.addEventListener('pointerdown', kill, true);
  }

  private catVisit() {
    if (this.phase !== 'prep') return;
    liveEvent(this.live, 20);
    this.liveChat('cat', 0);
    this.liveChat('cat', 0);
    this.s.followers += 3;
    this.hooks.toast('Mèo nhà bên nhảy lên nằm đè cái ticket! Chạm để đuổi.', 'info');
    runCat(this.over, this.hud, { x: 70, y: 700 + LAYOUT.dy }, () => liveEvent(this.live, 6), 8000);
  }

  private giftPop(name: string, value: number) {
    const d = document.createElement('div');
    d.className = 'gift-pop';
    d.innerHTML = `<b>${pick(this.rng, TEXT.chatNames)}</b> tặng <i>${name}</i> <em>+${value}k</em>`;
    this.hud.appendChild(d);
    gsap.fromTo(d, { x: -200 }, { x: 0, duration: 0.3, ease: 'back.out(1.6)' });
    gsap.to(d, { opacity: 0, y: -20, delay: 2, duration: 0.3, onComplete: () => d.remove() });
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
    const isB = isBase(id);
    const def = isB ? getBase(id) : ing(id);
    const d = document.createElement('div');
    d.className = 'info-card';
    const stats = (['t', 'm', 'n', 'k', 'd'] as const).filter((k) => def.stats[k]).map((k) => {
      const v = def.stats[k];
      return `<span class="chip" style="--c:${STAT_META[k].color}">${isB ? '' : v > 0 ? '+' : ''}${v} ${STAT_META[k].label}</span>`;
    }).join('');
    const cap = isB ? (def as { capacity: number }).capacity + (hasUp(this.s, 'thau_to') ? 1 : 0) : 0;
    const procs = isB ? `Chứa được ${cap} phần nguyên liệu` : ing(id).process.length ? ing(id).process.map((p) => (p === 'nghien' ? 'Nghiền được' : 'Xay được')).join(' · ') : 'Bỏ thẳng vô thau';
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
    // chạm bất cứ đâu (kể cả ngoài thẻ) cũng tắt
    const outside = () => close();
    window.setTimeout(() => window.addEventListener('pointerdown', outside, true), 0);
    window.setTimeout(close, 5000);
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
    window.setTimeout(() => this.hooks.toast(r.heated ? 'Công thức này có đun — vặn bếp nha!' : 'Đủ món rồi, khuấy thôi!', 'info'), 300 + r.items.length * 220);
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
