import { gsap } from 'gsap';
import { STAT_META } from './ticket';
import { noOrphan } from './copy';
import { BOWL } from '../art/props';
import { toStage } from './stage';

/** Bong bóng thoại của khách (HTML). Cú pháp từ khoá: {chữ|t} {chữ|k-} → tô dạ quang màu chỉ số. */
export function renderSay(s: string): string {
  return s.replace(/\{([^|}]+)\|([tmnkd])(-?)\}/g, (_m, txt, k, neg) => {
    const c = STAT_META[k as keyof typeof STAT_META].color;
    // V7-11: cụm tô ngắn (≤ 4 từ) không bị ngắt giữa chừng ("đừng / nhờn như mỡ" đọc riêng thì lật nghĩa)
    const w = txt.trim().split(/\s+/);
    const t = w.length <= 4 ? w.join('\u00A0') : txt;
    return `<mark style="--hl:${c}" class="${neg ? 'neg' : ''}">${t}</mark>`;
  });
}

export class Speech {
  el: HTMLDivElement;
  private body: HTMLDivElement;
  private full = '';
  private collapsed = false;
  private typing?: number;
  /** lúc câu hiện tại gõ xong (0 = đang gõ) */
  private doneAt = 0;
  private acts!: HTMLDivElement;
  onAsk?: () => void;
  onBye?: () => void;

  /** Hiện/ẩn nút trên bong bóng. ask=false khi khách đã nói rõ. Nút từ chối luôn ghi "Tiễn" (rõ nghĩa đuổi khách, không đổi giữa các lần). */
  setActions(on: boolean, ask = true) {
    this.acts.style.display = on ? '' : 'none';
    this.el.classList.toggle('has-acts', on);
    (this.acts.querySelector('.sp-ask') as HTMLElement).style.display = ask ? '' : 'none';
    this.fit();
  }

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'speech';
    this.el.innerHTML = `<div class="speech-body"></div><div class="speech-tail"></div><div class="speech-acts"><button class="sp-ask">Hả?</button><button class="sp-bye">Tiễn</button></div>`;
    this.body = this.el.querySelector('.speech-body')!;
    this.acts = this.el.querySelector('.speech-acts') as HTMLDivElement;
    // V5-04: Hả?/Tiễn chỉ chạy khi là cú chạm thật (nhả tay, di chuyển < 8px — R6) → bắt đầu khuấy/chạm món sát vành thau
    // lỡ đè trúng nút cũng không mất đơn
    tapOnly(this.acts.querySelector('.sp-ask') as HTMLElement, () => this.onAsk?.());
    tapOnly(this.acts.querySelector('.sp-bye') as HTMLElement, () => this.onBye?.());
    parent.appendChild(this.el);
    this.el.style.display = 'none';
    // giữ đầy đủ suốt; chạm để thu gọn / mở lại
    this.el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (this.collapsed) this.expand();
      else this.collapse();
    });
  }

  say(text: string, opts: { compactAfter?: number; tone?: 'normal' | 'angry' | 'happy' } = {}) {
    window.clearInterval(this.typing);
    this.doneAt = 0;
    this.full = noOrphan(renderSay(text));
    this.collapsed = false;
    this.el.classList.remove('compact', 'angry', 'happy');
    if (opts.tone && opts.tone !== 'normal') this.el.classList.add(opts.tone);
    this.el.style.display = '';
    // gõ từng chữ: dựng sẵn đủ câu, phần chưa gõ để ẩn → chữ không nhảy dòng lúc gõ (giữ nguyên thẻ mark)
    const plainLen = this.full.replace(/<[^>]*>/g, '').length;
    let shown = 0;
    this.body.innerHTML = typedHtml(this.full, 0);
    this.fit();
    gsap.fromTo(this.el, { scale: 0.4, opacity: 0, transformOrigin: '70% 0%' }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.8)' });
    this.typing = window.setInterval(() => {
      shown += 2;
      this.body.innerHTML = typedHtml(this.full, shown);
      if (shown >= plainLen) {
        window.clearInterval(this.typing);
        this.body.innerHTML = this.full;
        this.doneAt = performance.now();
      }
    }, 28);
    void opts.compactAfter;
  }

  /** Câu đã gõ xong và đã hiện đủ `ms` (mới cho thu gọn, để người chơi đọc kịp). */
  readFor(ms = 2000) {
    return this.doneAt > 0 && performance.now() - this.doneAt >= ms;
  }

  get isCollapsed() {
    return this.collapsed && this.el.style.display !== 'none';
  }

  collapse() {
    if (this.el.style.display === 'none') return;
    window.clearInterval(this.typing);
    this.body.innerHTML = this.full;
    this.collapsed = true;
    this.el.classList.add('compact');
    this.fit();
  }

  expand() {
    this.collapsed = false;
    this.el.classList.remove('compact');
    this.fit();
    gsap.fromTo(this.el, { scale: 0.9 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
  }

  /**
   * V2-07: máy ngắn (tường trượt lên nhiều hơn bàn) đáy bong bóng lấn xuống miệng thau → nâng bong bóng lên đúng phần dư
   * (tối đa 48px và không cao hơn đáy tờ lịch + 4px — V3-01). Không đổi bề rộng → chỗ ngắt dòng giống nhau ở mọi cỡ máy (AC4.3).
   * Còn lấn thì bong bóng cho chạm xuyên (chỉ nút Hả?/Tiễn nhận chạm) → chạm trúng món trong thau.
   */
  fit() {
    const el = this.el;
    const tail = el.querySelector('.speech-tail') as HTMLElement;
    el.style.marginTop = '';
    el.style.marginLeft = '';
    tail.style.marginLeft = '';
    el.style.removeProperty('padding-bottom');
    el.classList.remove('thru', 'tight', 'acts-in');
    // V5-07: bong bóng thu gọn cũng được nâng + giới hạn theo tờ lịch như bong bóng đủ (không tụt xuống đè thau)
    if (el.style.display === 'none') return;
    // V6-03: chừa thêm bóng đổ (box-shadow y 5px) + nửa nét vành thau → đáy bong bóng không dính vành thau
    const lim = BOWL.cy - BOWL.ry - 12;
    // nút Hả?/Tiễn treo dưới mép bong bóng (bottom −14px) và nằm trên vành thau → tính cả phần thò
    const hasActs = this.acts.style.display !== 'none';
    let acts = hasActs ? Math.max(0, this.acts.offsetTop + this.acts.offsetHeight - el.offsetHeight) : 0;
    const over = () => el.offsetTop + el.offsetHeight + acts - lim;
    if (over() <= 0) return;
    const o = over();
    // V3-01: không nâng quá đáy tờ lịch NGÀY (góc phải trên, bong bóng rộng tới x 377 > mép trái lịch 352) + 4px
    // → số ngày luôn đọc được; nâng ít đi thì cũng bớt che miệng/cằm khách. Phần còn lấn thau → chạm xuyên ('thru').
    const cal = document.getElementById('calendar');
    let besideCal = false;
    const maxLift = (ov: number) => {
      let lift = Math.min(ov, 48);
      if (!besideCal && cal && cal.getBoundingClientRect().height) {
        const calBottom = toStage(0, cal.getBoundingClientRect().bottom).y;
        lift = Math.max(0, Math.min(lift, el.offsetTop - (calBottom + 4)));
      }
      return lift;
    };
    let ov = o, lift = maxLift(ov);
    // V7-10: tờ lịch chặn không cho nâng đủ (máy ngắn, câu 2–4 dòng) → dời cả bong bóng sang trái cho qua khỏi mép trái lịch
    // (giữ nguyên bề rộng → chỗ ngắt dòng không đổi; đuôi dời ngược lại để vẫn chỉ đúng miệng khách) rồi nâng tiếp
    if (ov > lift && cal && !el.classList.contains('compact')) {
      const cr = cal.getBoundingClientRect();
      const calL = cr.height ? toStage(cr.left, cr.top).x : Infinity;
      const dx = Math.ceil(el.offsetLeft + el.offsetWidth - (calL - 4));
      if (dx > 0 && dx <= 40) {
        el.style.marginLeft = `${-dx}px`;
        tail.style.marginLeft = `${dx}px`;
        besideCal = true;
        lift = maxLift(ov);
      }
    }
    // V4-08: nâng không đủ → bóp bong bóng cho thấp lại (padding + line-height), đo lại phần còn lấn
    if (ov > lift) { el.classList.add('tight'); ov = Math.max(0, over()); lift = maxLift(ov); }
    // V5-04: nâng tối đa mà nút Hả?/Tiễn vẫn thò xuống vành thau → thu nút vào góc dưới phải trong bong bóng
    // (ngồi cạnh dòng cuối nếu dòng cuối ngắn, không thì thêm một khoảng đáy vừa nút) — không hạ bong bóng xuống
    if (hasActs && ov > lift) {
      this.actsInside();
      acts = 0;
      ov = Math.max(0, over());
      lift = maxLift(ov);
    }
    el.style.marginTop = `${-lift}px`;
    if (ov > lift) el.classList.add('thru');
  }

  /** Đưa hàng nút vào trong bong bóng (class acts-in) và chừa đáy vừa đủ: dòng cuối ngắn thì nút ngồi cạnh dòng cuối. */
  private actsInside() {
    const el = this.el;
    el.classList.add('acts-in');
    const GAP = 5;
    const er = el.getBoundingClientRect(), ar = this.acts.getBoundingClientRect();
    const sc = er.width / (el.offsetWidth || 1) || 1; // stage có thể bị scale
    const br = this.body.getBoundingClientRect();
    const rg = document.createRange();
    rg.selectNodeContents(this.body);
    // dòng cuối đang thấy (bong bóng gọn cắt 2 dòng → bỏ các dòng nằm dưới đáy khung chữ)
    const rects = [...rg.getClientRects()].filter((r) => r.width > 0 && r.top < br.bottom - 2);
    const lastTop = rects.length ? Math.max(...rects.map((r) => r.top)) : br.bottom;
    const lastRight = Math.max(br.left, ...rects.filter((r) => r.top >= lastTop - 2).map((r) => r.right));
    const actsH = ar.height / sc, bodyBottom = (br.bottom - er.top) / sc;
    const actsLeft = (er.right - er.left) / sc - 8 - ar.width / sc;
    const lastLineTop = (lastTop - er.top) / sc;
    const short = (lastRight - er.left) / sc + 6 <= actsLeft;
    // V6-02: dòng ngay trên dòng cuối mà dài lấn qua cột nút → đỉnh nút hạ xuống dưới đáy dòng đó (chừa chân chữ g/y + dải dạ quang)
    const aboveIntoActs = rects.filter((r) => r.top < lastTop - 2 && (r.right - er.left) / sc + 6 > actsLeft);
    const aboveBottom = aboveIntoActs.length ? (Math.max(...aboveIntoActs.map((r) => r.bottom)) - er.top) / sc + 1 : 0;
    // đáy nút = đáy bong bóng − GAP; đỉnh nút không cao hơn đỉnh dòng cuối (dòng ngắn) / đáy khung chữ (dòng dài)
    const need = (short ? Math.max(lastLineTop, aboveBottom) : bodyBottom + 2) + actsH + GAP;
    const pad = Math.max(6, Math.ceil(need - bodyBottom));
    el.style.setProperty('padding-bottom', `${pad}px`, 'important');
  }

  hide() {
    window.clearInterval(this.typing);
    gsap.to(this.el, { scale: 0.5, opacity: 0, duration: 0.15, onComplete: () => { this.el.style.display = 'none'; } });
  }
}

/** R6: chỉ gọi fn khi nhả tay trên nút và ngón tay di chuyển dưới 8px (chạm thật, không phải đang kéo/khuấy). */
function tapOnly(btn: HTMLElement, fn: () => void) {
  let id = -1, sx = 0, sy = 0;
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    id = e.pointerId; sx = e.clientX; sy = e.clientY;
  });
  btn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    if (e.pointerId !== id) return;
    id = -1;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) < 8) fn();
  });
  btn.addEventListener('pointercancel', () => { id = -1; });
  btn.addEventListener('pointerleave', () => { id = -1; });
}

/**
 * Đủ cả câu, chỉ hiện n ký tự đầu; phần còn lại bọc span `visibility:hidden` (vẫn chiếm chỗ → không reflow).
 * Mark đang gõ dở: cả mark ẩn (ẩn luôn nền dạ quang + mũi tên ↓), phần đã gõ bên trong hiện lại → mark không bị tách đôi.
 */
function typedHtml(html: string, n: number): string {
  let out = '', count = 0;
  for (const part of html.split(/(<mark[^>]*>[^<]*<\/mark>)/)) {
    const m = part.match(/^(<mark[^>]*>)([^<]*)<\/mark>$/);
    const txt = m ? m[2] : part;
    const k = Math.max(0, Math.min(txt.length, n - count));
    count += txt.length;
    if (k === txt.length) out += part;
    else if (!m) out += `${txt.slice(0, k)}<span class="sp-rest">${txt.slice(k)}</span>`;
    else out += `<span class="sp-rest">${m[1]}${k ? `<span class="sp-shown">${txt.slice(0, k)}</span>` : ''}${txt.slice(k)}</mark></span>`;
  }
  return out;
}
