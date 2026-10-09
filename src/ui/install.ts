import { sfx } from './audio';
import '../styles/cloud-pwa.css';

/**
 * "Lưu vào màn hình chính" (PWA). Android Chrome/Edge/Samsung bắn `beforeinstallprompt` → giữ lại, bấm nút mới gọi prompt().
 * iOS và trình duyệt trong app (Zalo, Messenger, TikTok…) không có hộp thoại cài → hiện thẻ hướng dẫn.
 * Module phải được import sớm (main.ts) vì sự kiện có thể bắn trước khi màn tiêu đề dựng xong.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferred = null;
  notify();
});

// service worker chỉ chạy trên https/localhost, không chạy ở bản file:// 1 file
if ('serviceWorker' in navigator && window.isSecureContext && location.protocol.startsWith('http') && !import.meta.env.DEV) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/** Đang mở từ icon ngoài màn hình chính (không có thanh địa chỉ). */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** Có nên hiện nút "Lưu vào màn hình chính" không. */
export const canOfferInstall = () => !installed && !isStandalone();

/** Đăng ký vẽ lại nút khi trạng thái cài đổi (có prompt / đã cài). Trả hàm huỷ. */
export function onInstallChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

type Env = 'ios' | 'inapp' | 'file' | 'android' | 'desktop';
function env(): Env {
  const ua = navigator.userAgent;
  if (!location.protocol.startsWith('http')) return 'file';
  if (/Zalo|FBAN|FBAV|FB_IAB|Instagram|musical_ly|Bytedance|TikTok|Line\//i.test(ua)) return 'inapp';
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Hình nút Chia sẻ của Safari (ô vuông có mũi tên lên), vẽ inline cho dễ nhận ra. */
const SHARE_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" style="vertical-align:-3px"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v9A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 9H16M12 3v12M8 7l4-4 4 4" fill="none" stroke="#1F7BF2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const GUIDE: Record<Env, { h: string; steps: string[]; note?: string }> = {
  ios: {
    h: 'Cài lên iPhone',
    steps: [`Bấm nút Chia sẻ ${SHARE_ICON} ở thanh dưới Safari`, 'Kéo xuống, chọn <b>Thêm vào MH chính</b>', 'Bấm <b>Thêm</b> — icon KEM TRỘN hiện ngoài màn hình'],
    note: 'iPhone tách riêng dữ liệu app ngoài màn hình chính với Safari. Muốn mang tiến độ qua: bật <b>Lưu lên mây</b> trong Cài đặt, lấy mã, rồi nhập mã trong app mới.',
  },
  inapp: {
    h: 'Mở bằng trình duyệt',
    steps: ['Bấm nút <b>⋯</b> góc trên', 'Chọn <b>Mở bằng trình duyệt</b> (Chrome / Safari)', 'Vào lại game, bấm nút này lần nữa'],
    note: 'Zalo, Messenger, TikTok… không cho cài web ra màn hình chính.',
  },
  android: {
    h: 'Cài lên điện thoại',
    steps: ['Bấm nút <b>⋮</b> góc trên Chrome', 'Chọn <b>Thêm vào màn hình chính</b> (hoặc <b>Cài đặt ứng dụng</b>)', 'Bấm <b>Thêm</b>'],
  },
  desktop: {
    h: 'Cài lên máy',
    steps: ['Mở game bằng Chrome hoặc Edge', 'Bấm biểu tượng cài đặt ở cuối thanh địa chỉ', 'Chọn <b>Cài đặt</b>'],
  },
  file: {
    h: 'Cần bản online',
    steps: ['Mở <b>kem-tron.vercel.app</b> trên điện thoại', 'Bấm lại nút <b>Lưu vào màn hình chính</b>'],
    note: 'Bản file tải về không cài ra màn hình chính được.',
  },
};

/** Thẻ hướng dẫn kiểu giấy ghim (cùng họ với thẻ TẠM NGHỈ), phủ lên `host`. */
function showGuide(host: HTMLElement, kind: Env) {
  host.querySelector('.pwa-ov')?.remove();
  const g = GUIDE[kind];
  const ov = document.createElement('div');
  ov.className = 'pwa-ov';
  ov.innerHTML = `<div class="st-card pwa-card">
    <div class="st-pin"></div>
    <img class="pwa-ic" src="icons/icon-192.png" alt="" width="64" height="64" onerror="this.remove()">
    <div class="st-h">${g.h}</div>
    <ol class="pwa-steps">${g.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    ${g.note ? `<p class="pwa-note">${g.note}</p>` : ''}
    <button class="st-resume pwa-ok">Hiểu rồi</button>
  </div>`;
  host.appendChild(ov);
  // không dùng GSAP: menu TẠM NGHỈ dừng globalTimeline, tween sẽ đứng im
  const close = () => { sfx('click'); ov.remove(); };
  ov.querySelector('.pwa-ok')!.addEventListener('click', close);
  ov.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === ov) close(); });
}

/** Bấm nút "Lưu vào màn hình chính": có prompt thật thì gọi, không thì hướng dẫn tay. */
export async function installApp(host: HTMLElement) {
  sfx('click');
  if (deferred) {
    const e = deferred;
    deferred = null;
    try {
      await e.prompt();
      const r = await e.userChoice;
      if (r.outcome === 'accepted') installed = true;
    } catch {
      showGuide(host, env());
    }
    notify();
    return;
  }
  showGuide(host, env());
}

/** Icon nhỏ "điện thoại + dấu cộng" dùng trên nút. */
export const INSTALL_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="5" y="2" width="12" height="20" rx="3" fill="#fff" stroke="#2A1A16" stroke-width="2.2"/><path d="M9 18.5h4" stroke="#2A1A16" stroke-width="2" stroke-linecap="round"/><circle cx="17.5" cy="7.5" r="5.2" fill="#FF6B9A" stroke="#2A1A16" stroke-width="2"/><path d="M17.5 5v5M15 7.5h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
