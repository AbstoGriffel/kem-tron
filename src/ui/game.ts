import { gsap } from 'gsap';
import { sceneSvg } from '../art/scene';
import { flushRelayout, LAYOUT, onRelayout, setRelayoutGuard, toStage } from './stage';
import { BOWL, STOVE } from '../art/props';
import { openSettings } from './settings';
import { endDay, startNextDay, type DayLog, type Ledger, type MorningNews } from '../core/day';
import { liveEndDay, type LiveState } from '../core/live';
import { loadJSON, saveJSON, SAVE_KEY, removeKey, saveLock } from '../core/storage';
import { cloudAfterSave, cloudFlush } from './cloud';
import { dayRng, newGame, type SaveState } from '../core/state';
import { sfx, unlockAudio } from './audio';
import { initFx } from './fx';
import { Shop } from './shop';
import { music } from './music';
import { showTitle } from './title';
import { showLedger } from './ledger';
import { showMorning } from './morning';
import { openBook } from './book';
import { openPhone } from './phone';
import { runInspection, showRaidNews, showTotruong } from './inspection';
import { showEnding } from './ending';
import { showIntro } from './intro';
import { BASES, INGREDIENTS } from '../core/db';
import { noOrphan } from './copy';

export type ToastAt = { side?: 'left' | 'right'; top?: number };
/** bề rộng giấy note trong tiệm (canh giữa thau) */
const TOAST_BENCH_W = 270;

export class Game {
  s!: SaveState;
  stage = document.getElementById('stage')!;
  world!: HTMLElement;
  modal!: HTMLElement;
  drag!: SVGSVGElement;
  shop?: Shop;
  /** đang trong ca bán (khách ra vào) → không dựng lại cảnh, đợi sang ngày */
  private selling = false;

  boot() {
    this.stage.innerHTML = `
      <div id="world">${sceneSvg(LAYOUT)}
        <svg id="over" viewBox="0 0 390 ${LAYOUT.H}" width="390" height="${LAYOUT.H}"></svg>
        <div id="hud"></div>
        <svg id="fx" viewBox="0 0 390 ${LAYOUT.H}" width="390" height="${LAYOUT.H}"></svg>
      </div>
      <svg id="drag" viewBox="0 0 390 ${LAYOUT.H}" width="390" height="${LAYOUT.H}"></svg>
      <button id="gear" aria-label="Cài đặt"><svg viewBox="-20 -20 40 40" width="36" height="36"><path d="${gearPath()}" fill="#FFC53D" stroke="#2A1A16" stroke-width="3" stroke-linejoin="round"/><circle r="5.5" fill="#BFE3D3" stroke="#2A1A16" stroke-width="3"/></svg></button>
      <div id="modal-bg"></div>
      <div id="modal-dim"></div>
      <div id="modal"></div>`;
    this.world = this.stage.querySelector('#world')!;
    this.modal = this.stage.querySelector('#modal')!;
    this.drag = this.stage.querySelector('#drag') as SVGSVGElement;
    initFx(this.world, this.stage.querySelector('#fx') as SVGSVGElement);
    setRelayoutGuard(() => !this.selling);
    onRelayout(() => this.relayout());
    this.stage.querySelector('#gear')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); openSettings(this); });
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = this;
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { gsap.globalTimeline.pause(); this.save(); cloudFlush(); }
      else gsap.globalTimeline.resume();
    });
    window.addEventListener('pagehide', () => { this.save(); cloudFlush(); });

    const saved = loadJSON<SaveState | null>(SAVE_KEY, null);
    const params = new URLSearchParams(location.search);
    const jump = Number(params.get('day'));
    showTitle(this.modal, {
      canContinue: !!saved && saved.v === 1 && !saved.ended,
      day: saved?.day ?? 1,
      onNew: () => {
        this.s = newGame(Math.floor(Math.random() * 1e9));
        if (jump > 1) this.devJump(jump);
        this.save();
        const force = params.get('insp') ? { late: [], harvestReady: 0, inspection: true, warn: false } : params.get('warn') ? { late: [], harvestReady: 0, inspection: false, warn: true } : null;
        // T21: ván mới (ngày 1) xem mở đầu trước; nhảy ngày khi thử thì bỏ qua
        if (jump > 1 || params.get('nointro')) this.beginDay(force);
        else showIntro(this.modal, () => this.beginDay(force));
      },
      onContinue: () => {
        this.s = saved!;
        this.migrateSave();
        const pr = this.s.progress;
        if (pr && pr.day === this.s.day && pr.closed && pr.ledger) this.showStoredLedger(pr.ledger as Ledger);
        else if (pr && pr.day === this.s.day && pr.customers) this.resumeDay();
        else this.beginDay((this.s.news as MorningNews | undefined) ?? null);
      },
    });
  }

  /** ?day=N — nhảy tới ngày N để thử nhanh (cho đủ hàng + tiền). */
  private devJump(day: number) {
    this.s.day = day;
    this.s.money = 400;
    for (const k of ['kem_tron', 'sap_ne', 'sua_duong', 'gel_nha_dam', 'kem_thung']) this.s.stock[k] = 4;
    for (const k of ['dua_leo', 'ca_chua', 'nha_dam', 'tra_xanh', 'nghe', 'chanh', 'mat_ong', 'bot_gao', 'nuoc_vo_gao', 'trung', 'phen_chua', 'kem_danh_rang', 'dat_set', 'phan_rom', 'kcn_xin', 'kcn_dom', 'bot_bat_tong', 'bot_trang_dom', 'oc_sen', 'collagen_dom']) this.s.stock[k] = 4;
    this.s.followers = 120;
  }

  save() {
    if (!this.s || saveLock.on) return;
    if (saveJSON(SAVE_KEY, this.s)) cloudAfterSave();
  }

  /** Save cũ (trước đợt 06/10): chưa có dấu "đã xem" từng món → đánh dấu sẵn để không chấm đỏ mọi ô; qua ngày 1 thì coi như đã học xong. */
  private migrateSave() {
    const t = this.s.tutorialSeen;
    if (t.includes('mig:0610')) return;
    t.push('mig:0610');
    if (this.s.day > 1 || t.includes('stir')) {
      for (const x of [...INGREDIENTS, ...BASES]) if (x.unlockDay < this.s.day && !t.includes(`seen:${x.id}`)) t.push(`seen:${x.id}`);
      for (const k of ['tut1', 'bay:1']) if (!t.includes(k)) t.push(k);
    }
    this.save();
  }

  /**
   * Giấy note. `at` (toast demo trạm): side = dán hẹp bên trái/phải (né trạm đang demo), top = toạ độ stage đỉnh giấy.
   * Không truyền top → tự neo theo màn đang mở (V2-01/V2-02): sắm đồ = trên khung tiệm tạp hoá, thanh tra = dưới
   * banner đỏ, buổi sáng = trên hàng nút, trong tiệm = đáy giấy nằm trên biển GA MINI (né dải nhãn trạm).
   */
  toast = (msg: string, kind: 'info' | 'bad' | 'good' = 'info', at?: ToastAt) => {
    this.stage.querySelectorAll('.note').forEach((n) => n.remove());
    const d = document.createElement('div');
    d.className = `note ${kind}`;
    d.textContent = noOrphan(msg);
    const bench = !this.fullScreenOpen();
    // V5-05: màn thanh tra → giấy hẹp dán một bên (mặc định trái, trên cánh cửa), né các ô giấu đồ (tủ lạnh, nồi cơm…)
    const insp = at ? null : this.modal.querySelector(':scope > .insp');
    const side = at?.side ?? (insp ? 'left' : undefined);
    const setSide = (sd: 'left' | 'right') => { d.style.left = sd === 'left' ? '10px' : `${390 - 10 - 214}px`; };
    if (side) {
      d.classList.add('side');
      d.style.width = '214px';
      d.style.marginLeft = '0';
      setSide(side);
    } else if (bench) {
      // trong tiệm: giấy hẹp hơn, canh giữa thau
      d.style.width = `${TOAST_BENCH_W}px`;
      d.style.marginLeft = '0';
      d.style.left = `${Math.round(BOWL.cx - TOAST_BENCH_W / 2)}px`;
    }
    this.stage.appendChild(d);
    const top = at?.top ?? this.toastTop(d.offsetHeight, bench);
    if (top !== undefined) d.style.setProperty('top', `${Math.round(top)}px`, 'important');
    if (insp) {
      const spots = [...insp.querySelectorAll('#spots > g')].map((g) => g.getBoundingClientRect());
      const hits = () => { const r = d.getBoundingClientRect(); return spots.some((q) => r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top); };
      if (hits()) { setSide('right'); if (hits()) setSide('left'); }
    }
    gsap.fromTo(d, { y: 30, rotation: -8, opacity: 0 }, { y: 0, rotation: -1.5, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
    gsap.to(d, { opacity: 0, y: -10, delay: Math.min(5, 1.8 + msg.length * 0.035), duration: 0.3, onComplete: () => d.remove() });
  };

  /** Đang mở màn phủ toàn bộ (sổ cuối ngày, thanh tra, buổi sáng…) → giấy note không neo theo bàn. */
  private fullScreenOpen() {
    return !!this.modal.querySelector(':scope > .evening, :scope > .insp, :scope > .morning, :scope > .ending, :scope > .night, :scope > .title-screen, :scope > .news, :scope > .intro');
  }

  /** Đỉnh giấy note (toạ độ stage) theo màn đang mở; undefined = giữ vị trí CSS mặc định. */
  private toastTop(h: number, bench: boolean): number | undefined {
    const y = (el: Element | null, edge: 'top' | 'bottom') => {
      if (!el) return undefined;
      const r = el.getBoundingClientRect();
      return r.height ? toStage(0, r[edge]).y : undefined;
    };
    const clampTop = (t: number | undefined) => (t === undefined ? undefined : Math.max(8, Math.min(LAYOUT.H - h - 8, t)));
    const m = this.modal;
    const up = y(m.querySelector(':scope > .evening .upgrades'), 'top');
    if (up !== undefined) return clampTop(up - h - 8);
    const insp = m.querySelector(':scope > .insp');
    if (insp) {
      const b = y(insp.querySelector('.insp-timer'), 'bottom') ?? y(insp.querySelector('.insp-banner'), 'bottom');
      return clampTop(b === undefined ? undefined : b + 10);
    }
    const mo = m.querySelector(':scope > .morning');
    if (mo) {
      // dưới hàng thùng xốp (khoảng sàn trống), không che bình tưới / cuốc; không có vườn thì trên hàng nút
      const btn = y(mo.querySelector('.mo-btn'), 'top');
      const pots = Math.max(y(mo.querySelector('#pots'), 'bottom') ?? 0, y(mo.querySelector('#pots-buy'), 'bottom') ?? 0);
      if (btn === undefined) return undefined;
      return clampTop(pots ? Math.min(pots + 18, btn - h - 12) : btn - h - 12);
    }
    if (!bench) return undefined;
    // trong tiệm: đáy giấy cách mép trên biển GA MINI 6px → không đè dải nhãn GÕ ×5 / GA MINI / GIỮ XAY
    return clampTop(STOVE.oy + 468 - 6 - h);
  }

  /** Buổi sáng (tin tức, vườn, gọi điện) → mở bán. */
  private beginDay(news: MorningNews | null) {
    if (this.s.day > 10 && !this.s.ended) {
      this.finishChapter();
      return;
    }
    this.selling = false;
    flushRelayout();
    this.mountShop();
    music.play(news?.inspection ? 'tense' : 'chill');
    showMorning(this, news, async () => {
      this.s.news = undefined;
      this.save();
      if (news?.inspection) {
        music.play('tense');
        const res = await runInspection(this);
        music.play('chill');
        if (res === 'raid') {
          await showRaidNews(this);
          this.save();
          this.toast('Bị đóng cửa 1 ngày. Làm lại cuộc đời thôi…', 'bad');
          this.afterDay(null);
          return;
        }
      } else if (news?.warn) {
        await showTotruong(this);
      }
      this.shop!.refreshHud();
      this.selling = true;
      this.shop!.startDay();
    });
  }

  /** Bố cục co giãn đổi (viewport đổi thật): cập nhật kích thước các lớp + dựng lại cảnh tiệm. */
  private relayout() {
    const H = LAYOUT.H;
    for (const id of ['over', 'fx', 'drag']) {
      const svg = this.stage.querySelector('#' + id) as SVGSVGElement;
      svg.setAttribute('viewBox', `0 0 390 ${H}`);
      svg.setAttribute('height', String(H));
    }
    if (this.shop) this.mountShop();
    else this.world.querySelector('#scene')!.outerHTML = sceneSvg(LAYOUT);
  }

  /** Mở lại app giữa ngày: vào thẳng tiệm, đi tiếp khách kế. */
  private resumeDay() {
    flushRelayout();
    this.mountShop();
    this.toast(`Bán tiếp ngày ${this.s.day} — còn khách đang chờ!`, 'info');
    this.shop!.refreshHud();
    this.selling = true;
    this.shop!.startDay();
  }

  private mountShop() {
    this.shop?.unmount();
    // dựng lại cảnh sạch
    const sceneHost = this.world;
    sceneHost.querySelector('#scene')!.outerHTML = sceneSvg(LAYOUT);
    (sceneHost.querySelector('#over') as SVGSVGElement).innerHTML = '';
    (sceneHost.querySelector('#hud') as HTMLElement).innerHTML = '';
    this.shop = new Shop(this.stage, this.world, this.s, {
      save: () => this.save(),
      onDayEnd: (log, live) => this.afterDay({ log, live }),
      openBook: (onPick) => openBook(this, onPick),
      openPhone: () => openPhone(this, () => this.shop?.stockChanged()),
      toast: this.toast,
    }, this.drag);
    this.shop.mount();
  }

  private afterDay(r: { log: DayLog; live: LiveState } | null) {
    this.selling = false;
    flushRelayout();
    const rng = dayRng(this.s, 'end');
    const gain = r ? liveEndDay(this.s, r.live) : 0;
    const ledger = endDay(this.s, r?.log ?? emptyLog(), gain, rng);
    this.s.progress = { ...(this.s.progress ?? { served: 0, log: emptyLog(), peak: 0 }), day: this.s.day, closed: true, ledger };
    this.save();
    sfx('cashout');
    this.showStoredLedger(ledger, r?.log ?? null);
  }

  /** Hiện sổ (mới chốt hoặc mở lại app ở màn sổ) rồi sang ngày. endDay không chạy lại. */
  private showStoredLedger(ledger: Ledger, log: DayLog | null = null) {
    showLedger(this, ledger, log ?? (this.s.progress?.log as DayLog | undefined) ?? null, () => {
      if (ledger.bankrupt) {
        this.s.ended = 'vo_no';
        this.save();
        showEnding(this, 'vo_no');
        return;
      }
      const news = startNextDay(this.s, dayRng(this.s, 'morning'));
      this.s.news = news;
      this.save();
      this.beginDay(news);
    });
  }

  private finishChapter() {
    const owe = this.s.debts.some((d) => !this.s.debtsPaid.includes(d.day));
    const kind = this.s.raids >= 2 ? 'lenbao' : owe ? 'con_no' : this.s.stats.fakeServed > this.s.stats.served * 0.4 ? 'ong_trum' : 'tu_te';
    this.s.ended = kind;
    this.save();
    showEnding(this, kind);
  }

  newGameFromEnding() {
    removeKey(SAVE_KEY);
    location.reload();
  }
}

/** Bánh răng 8 răng (tâm 0,0). */
export function gearPath() {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 16;
    const r = i % 2 ? 12 : 16.5;
    const a2 = a + Math.PI / 8;
    d += `${i ? 'L' : 'M'} ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} L ${(Math.cos(a2) * r).toFixed(1)} ${(Math.sin(a2) * r).toFixed(1)} `;
  }
  return d + 'Z';
}

function emptyLog(): DayLog {
  return { sales: 0, tips: 0, refunds: 0, ingredientSpend: 0, gifts: 0, served: 0, stars: [], usedFake: false, exploded: 0 };
}
