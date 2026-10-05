import { gsap } from 'gsap';
import { STAT_META } from './ticket';

/** Bong bóng thoại của khách (HTML). Cú pháp từ khoá: {chữ|t} {chữ|k-} → tô dạ quang màu chỉ số. */
export function renderSay(s: string): string {
  return s.replace(/\{([^|}]+)\|([tmnkd])(-?)\}/g, (_m, txt, k, neg) => {
    const c = STAT_META[k as keyof typeof STAT_META].color;
    return `<mark style="--hl:${c}" class="${neg ? 'neg' : ''}">${txt}</mark>`;
  });
}

export class Speech {
  el: HTMLDivElement;
  private body: HTMLDivElement;
  private full = '';
  private collapsed = false;
  private typing?: number;
  private acts!: HTMLDivElement;
  onAsk?: () => void;
  onBye?: () => void;

  /** Hiện/ẩn nút trên bong bóng. ask=false khi khách đã nói rõ. Nhãn nút từ chối đổi ngẫu nhiên. */
  setActions(on: boolean, ask = true) {
    this.acts.style.display = on ? '' : 'none';
    (this.acts.querySelector('.sp-ask') as HTMLElement).style.display = ask ? '' : 'none';
    const byes = ['Tiễn', 'Lượn', 'Bye', 'Next', 'Thôi', 'Né'];
    (this.acts.querySelector('.sp-bye') as HTMLElement).textContent = byes[Math.floor(Math.random() * byes.length)];
  }

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'speech';
    this.el.innerHTML = `<div class="speech-body"></div><div class="speech-tail"></div><div class="speech-acts"><button class="sp-ask">Hả?</button><button class="sp-bye">Tiễn</button></div>`;
    this.body = this.el.querySelector('.speech-body')!;
    this.acts = this.el.querySelector('.speech-acts') as HTMLDivElement;
    this.acts.querySelector('.sp-ask')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onAsk?.(); });
    this.acts.querySelector('.sp-bye')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.onBye?.(); });
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
    this.full = renderSay(text);
    this.collapsed = false;
    this.el.classList.remove('compact', 'angry', 'happy');
    if (opts.tone && opts.tone !== 'normal') this.el.classList.add(opts.tone);
    this.el.style.display = '';
    // gõ từng chữ (giữ nguyên thẻ mark)
    const plainLen = text.replace(/\{([^|}]+)\|[tmnkd]-?\}/g, '$1').length;
    let shown = 0;
    this.body.innerHTML = '';
    gsap.fromTo(this.el, { scale: 0.4, opacity: 0, transformOrigin: '70% 0%' }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(1.8)' });
    this.typing = window.setInterval(() => {
      shown += 2;
      this.body.innerHTML = clipHtml(this.full, shown);
      if (shown >= plainLen) {
        window.clearInterval(this.typing);
        this.body.innerHTML = this.full;
      }
    }, 28);
    void opts.compactAfter;
  }

  collapse() {
    if (this.el.style.display === 'none') return;
    window.clearInterval(this.typing);
    this.body.innerHTML = this.full;
    this.collapsed = true;
    this.el.classList.add('compact');
  }

  expand() {
    this.collapsed = false;
    this.el.classList.remove('compact');
    gsap.fromTo(this.el, { scale: 0.9 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
  }

  hide() {
    window.clearInterval(this.typing);
    gsap.to(this.el, { scale: 0.5, opacity: 0, duration: 0.15, onComplete: () => { this.el.style.display = 'none'; } });
  }
}

/** Cắt HTML theo số ký tự chữ hiển thị (không cắt giữa thẻ). */
function clipHtml(html: string, n: number): string {
  let out = '', count = 0, i = 0, open = false;
  while (i < html.length && count < n) {
    if (html[i] === '<') {
      const j = html.indexOf('>', i);
      const tag = html.slice(i, j + 1);
      out += tag;
      open = !tag.startsWith('</');
      i = j + 1;
      continue;
    }
    out += html[i++];
    count++;
  }
  if (open) out += '</mark>';
  return out;
}
