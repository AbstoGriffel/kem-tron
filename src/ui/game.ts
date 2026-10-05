import { gsap } from 'gsap';
import { sceneSvg } from '../art/scene';
import { LAYOUT } from './stage';
import { openSettings } from './settings';
import { endDay, startNextDay, type DayLog, type Ledger, type MorningNews } from '../core/day';
import { liveEndDay, type LiveState } from '../core/live';
import { loadJSON, saveJSON, SAVE_KEY, removeKey } from '../core/storage';
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

export class Game {
  s!: SaveState;
  stage = document.getElementById('stage')!;
  world!: HTMLElement;
  modal!: HTMLElement;
  drag!: SVGSVGElement;
  shop?: Shop;

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
      <div id="modal"></div>`;
    this.world = this.stage.querySelector('#world')!;
    this.modal = this.stage.querySelector('#modal')!;
    this.drag = this.stage.querySelector('#drag') as SVGSVGElement;
    initFx(this.world, this.stage.querySelector('#fx') as SVGSVGElement);
    this.stage.querySelector('#gear')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); openSettings(this); });
    if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = this;
    window.addEventListener('pointerdown', unlockAudio, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { gsap.globalTimeline.pause(); this.save(); }
      else gsap.globalTimeline.resume();
    });
    window.addEventListener('pagehide', () => this.save());

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
        this.beginDay(force);
      },
      onContinue: () => {
        this.s = saved!;
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
    if (this.s) saveJSON(SAVE_KEY, this.s);
  }

  toast = (msg: string, kind: 'info' | 'bad' | 'good' = 'info') => {
    this.stage.querySelectorAll('.note').forEach((n) => n.remove());
    const d = document.createElement('div');
    d.className = `note ${kind}`;
    d.textContent = msg;
    this.stage.appendChild(d);
    gsap.fromTo(d, { y: 30, rotation: -8, opacity: 0 }, { y: 0, rotation: -1.5, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
    gsap.to(d, { opacity: 0, y: -10, delay: Math.min(5, 1.8 + msg.length * 0.035), duration: 0.3, onComplete: () => d.remove() });
  };

  /** Buổi sáng (tin tức, vườn, gọi điện) → mở bán. */
  private beginDay(news: MorningNews | null) {
    if (this.s.day > 10 && !this.s.ended) {
      this.finishChapter();
      return;
    }
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
      this.shop!.startDay();
    });
  }

  /** Mở lại app giữa ngày: vào thẳng tiệm, đi tiếp khách kế. */
  private resumeDay() {
    this.mountShop();
    this.toast(`Bán tiếp ngày ${this.s.day} — còn khách đang chờ!`, 'info');
    this.shop!.refreshHud();
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
