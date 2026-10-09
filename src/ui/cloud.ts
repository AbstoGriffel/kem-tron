import { loadJSON, saveJSON, removeKey, SAVE_KEY, saveLock } from '../core/storage';
import { sfx } from './audio';
import '../styles/cloud-pwa.css';

/**
 * Lưu lên mây (tuỳ chọn). Bản lưu chính vẫn là localStorage — mây chỉ là bản sao để chơi tiếp trên máy khác.
 * Server (api/_store.js) cấp mã; mỗi máy (device id) giữ đúng 1 mã. Client chỉ gửi ở mốc:
 *  - chốt sổ / sang ngày mới (ngày trong save đổi),
 *  - ẩn app (khoá máy, chuyển app) nếu có thay đổi và đã ≥ 60s từ lần gửi trước,
 *  - đang chơi mà có thay đổi và đã ≥ 5 phút từ lần gửi trước,
 *  - bấm "Lưu ngay".
 * Nội dung không đổi thì không gửi. Server còn chặn thêm (giãn cách ghi, trùng nội dung, giới hạn IP).
 */

const API = '/api/cloud';
const DEVICE_KEY = 'kem-tron.device';
const CLOUD_KEY = 'kem-tron.cloud';
const IDLE_GAP = 5 * 60_000;
const HIDE_GAP = 60_000;
/** Khoảng tối thiểu giữa 2 lần tự gửi (kể cả mốc sang ngày) — lần trước lỗi thì cũng không dồn request. */
const MIN_GAP = 20_000;

interface Remote { rev: number; day: number; money: number; ended?: string | null; savedAt: number }
interface CloudRec {
  code: string;
  rev: number;
  /** false = máy này đã bị gỡ khỏi mã (mã bị nhập trên quá nhiều máy / bản trên mây đã xoá) */
  linked: boolean;
  hash?: string;
  day?: number;
  savedAt?: number;
  conflict?: Remote | null;
}

type Res = { status: number; body: Record<string, unknown> & { error?: string } };

let rec: CloudRec | null = loadJSON<CloudRec | null>(CLOUD_KEY, null);
let inflight = false;
let lastTry = 0;
let retryTimer = 0;
let lastMsg = '';
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());
const persist = () => { if (rec) saveJSON(CLOUD_KEY, rec); else removeKey(CLOUD_KEY); changed(); };

/** Id ngẫu nhiên của máy (trình duyệt) này — 16 byte base64url, tạo 1 lần. */
function deviceId(): string {
  let d = loadJSON<string>(DEVICE_KEY, '');
  if (!/^[A-Za-z0-9_-]{22}$/.test(d)) {
    const b = crypto.getRandomValues(new Uint8Array(16));
    d = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    saveJSON(DEVICE_KEY, d);
  }
  return d;
}

/** FNV-1a 32 bit — chỉ để biết bản lưu có đổi so với lần gửi trước. */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16) + ':' + s.length;
}

const localRaw = () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } };
const localSave = () => loadJSON<{ v: number; day: number; money: number; ended?: string } | null>(SAVE_KEY, null);

async function post(body: object, keepalive = false): Promise<Res> {
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', keepalive });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, body: j };
  } catch {
    return { status: 0, body: { error: 'OFFLINE' } };
  }
}

/** Câu báo lỗi dễ hiểu. */
function say(r: Res): string {
  switch (r.body.error) {
    case 'OFFLINE': return 'Mất mạng rồi — tiến độ vẫn nằm an toàn trong máy.';
    case 'CLOUD_NOT_CONFIGURED': case 'CLOUD_API_ERROR': case 'DATABASE_UNAVAILABLE': return 'Kho trên mây đang bảo trì — tiến độ vẫn nằm an toàn trong máy.';
    case 'CODE_NOT_FOUND': return 'Không thấy mã này. Kiểm tra lại từng chữ nha.';
    case 'INVALID_CODE': return 'Mã có 12 ký tự, dạng XXXX-XXXX-XXXX.';
    case 'TOO_MANY_TRIES': return 'Nhập sai nhiều quá, nghỉ tay 1 tiếng rồi thử lại.';
    case 'TOO_MANY_CODES': return 'Mạng này xin mã nhiều quá, để lát nữa nha.';
    case 'CLOUD_FULL_TODAY': return 'Hôm nay kho đầy, mai quay lại nha.';
    case 'SAVE_TOO_SOON': return 'Vừa lưu xong, chờ vài giây.';
    case 'SAVE_TOO_LARGE': return 'Bản lưu to bất thường, không gửi được.';
  }
  if (r.status === 404 || r.status === 405) return 'Bản này chưa nối kho trên mây (chỉ có ở bản online).';
  return 'Chưa gửi được — tiến độ vẫn nằm an toàn trong máy.';
}

export const cloudLinked = () => !!rec?.linked;
export const onCloudChange = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

/** Gửi bản lưu hiện tại lên mây. manual = người chơi bấm (bỏ qua điều kiện "có đổi không"). */
async function push(manual = false, keepalive = false): Promise<void> {
  if (!rec?.linked || rec.conflict || inflight) return;
  const raw = localRaw();
  const state = raw ? JSON.parse(raw) : null;
  if (!state || state.v !== 1) return;
  const hash = fnv(raw!);
  if (hash === rec.hash && !manual) return;
  inflight = true;
  lastTry = Date.now();
  const r = await post({ op: 'save', code: rec.code, device: deviceId(), rev: rec.rev, state }, keepalive);
  inflight = false;
  if (!rec) return;
  if (r.status === 200) {
    const b = r.body as unknown as Remote;
    Object.assign(rec, { rev: b.rev, day: b.day, savedAt: b.savedAt, hash, conflict: null });
    lastMsg = '';
  } else if (r.body.error === 'CLOUD_HAS_NEWER_SAVE') {
    rec.conflict = r.body as unknown as Remote;
    lastMsg = '';
  } else if (r.body.error === 'SAVE_TOO_SOON') {
    clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => push(), ((Number(r.body.retryIn) || 15) + 2) * 1000);
    lastMsg = manual ? say(r) : '';
  } else if (r.body.error === 'DEVICE_NOT_BOUND' || r.body.error === 'CODE_NOT_FOUND') {
    rec.linked = false;
    lastMsg = r.body.error === 'CODE_NOT_FOUND' ? 'Bản trên mây của mã này đã bị xoá.' : 'Máy này đã bị gỡ khỏi mã (mã được nhập trên quá 5 máy). Nhập lại mã để nối lại.';
  } else {
    lastMsg = say(r);
  }
  persist();
}

/** Gọi sau mỗi lần Game.save(): tự quyết có gửi không. */
export function cloudAfterSave() {
  if (!rec?.linked || rec.conflict) return;
  const s = localSave();
  if (!s) return;
  const since = Date.now() - lastTry;
  if (since < MIN_GAP) return;
  if (s.day !== rec.day || !!s.ended || since > IDLE_GAP) void push();
}

/** Ẩn app / đóng tab: gửi nốt nếu có đổi (keepalive để request sống sót khi trang bị đóng). */
export function cloudFlush() {
  if (!rec?.linked || Date.now() - lastTry < HIDE_GAP) return;
  void push(false, true);
}

/** Nhãn ngắn cho menu cài đặt. */
export const cloudLabel = () => (!rec ? 'CHƯA BẬT' : !rec.linked ? 'MẤT NỐI' : rec.conflict ? 'LỆCH BẢN' : 'ĐANG BẬT');

const fmtCode = (c: string) => c.replace(/(.{4})(?=.)/g, '$1-');
function ago(ms?: number): string {
  if (!ms) return '';
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return new Date(ms).toLocaleDateString('vi-VN');
}
const brief = (r: Remote) => `Ngày ${r.day} · ${Math.round(r.money)}k${r.ended ? ' · đã hết chương' : ''}`;

/** Ghi bản lấy từ mây vào máy rồi tải lại (khoá Game.save để pagehide không ghi đè bản cũ lên). */
function applyRemote(state: unknown, r: Remote, code: string) {
  saveLock.on = true;
  saveJSON(SAVE_KEY, state);
  rec = { code, rev: r.rev, linked: true, day: r.day, savedAt: r.savedAt, hash: fnv(localRaw() || ''), conflict: null };
  persist();
  location.reload();
}

/** Bảng "Lưu lên mây" (thẻ giấy cùng họ TẠM NGHỈ), phủ lên `host`. Không động tới trạng thái tạm dừng của game. */
export function openCloud(host: HTMLElement) {
  host.querySelector('.pwa-ov')?.remove();
  const ov = document.createElement('div');
  ov.className = 'pwa-ov';
  ov.innerHTML = `<div class="st-card cl-card"><div class="st-pin"></div><div class="cl-body"></div></div>`;
  host.appendChild(ov);
  const body = ov.querySelector('.cl-body') as HTMLElement;
  let view: 'main' | 'enter' | 'confirm' = 'main';
  let msg = '';
  let peek: (Remote & { code: string }) | null = null;
  let armDelete = false;
  let typed = rec && !rec.linked ? fmtCode(rec.code) : '';

  const close = () => { off(); sfx('click'); ov.remove(); };
  const busy = (b: HTMLButtonElement, t: string) => { b.disabled = true; b.textContent = t; };
  const local = localSave();

  const render = () => {
    const head = `<div class="st-h">LƯU LÊN MÂY<small>lỡ mất máy vẫn còn tiệm</small></div>`;
    const note = msg || lastMsg ? `<p class="cl-msg">${msg || lastMsg}</p>` : '';
    if (view === 'enter') {
      body.innerHTML = `${head}
        <p class="cl-p">Nhập mã lưu lấy từ máy kia (12 ký tự).</p>
        <input class="cl-in" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="16" placeholder="XXXX-XXXX-XXXX" value="${typed}">
        ${note}
        <button class="st-resume cl-go">Xem bản lưu</button>
        <button class="st-home cl-back">Quay lại</button>`;
      const inp = body.querySelector('.cl-in') as HTMLInputElement;
      inp.addEventListener('input', () => { typed = inp.value; });
      setTimeout(() => inp.focus(), 50);
      const go = async () => {
        const b = body.querySelector('.cl-go') as HTMLButtonElement;
        busy(b, 'Đang tìm…');
        const r = await post({ op: 'peek', code: inp.value });
        if (r.status === 200) { peek = { ...(r.body as unknown as Remote), code: inp.value }; view = 'confirm'; msg = ''; } else msg = say(r);
        render();
      };
      body.querySelector('.cl-go')!.addEventListener('click', go);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      body.querySelector('.cl-back')!.addEventListener('click', () => { view = 'main'; msg = ''; sfx('click'); render(); });
      return;
    }
    if (view === 'confirm' && peek) {
      body.innerHTML = `${head}
        <div class="cl-ticket"><span>BẢN TRÊN MÂY</span><b>${brief(peek)}</b><small>lưu ${ago(peek.savedAt)}</small></div>
        ${local ? `<p class="cl-warn">Tiệm đang chơi trên máy này (ngày ${local.day}) sẽ bị thay bằng bản trên.</p>` : ''}
        ${note}
        <button class="st-resume cl-take">Lấy về máy này</button>
        <button class="st-home cl-back">Thôi</button>`;
      body.querySelector('.cl-take')!.addEventListener('click', async () => {
        const b = body.querySelector('.cl-take') as HTMLButtonElement;
        busy(b, 'Đang lấy…');
        const r = await post({ op: 'restore', code: peek!.code, device: deviceId() });
        if (r.status === 200) { sfx('ding'); applyRemote(r.body.state, r.body as unknown as Remote, String(r.body.code)); return; }
        msg = say(r);
        render();
      });
      body.querySelector('.cl-back')!.addEventListener('click', () => { view = rec?.linked ? 'main' : 'enter'; msg = ''; sfx('click'); render(); });
      return;
    }
    // main
    if (!rec || !rec.linked) {
      body.innerHTML = `${head}
        <p class="cl-p">${rec && !rec.linked ? lastMsg || 'Máy này chưa nối với mã nào.' : 'Tiến độ đang nằm trong máy này. Lấy mã lưu để chơi tiếp trên máy khác, hoặc khi lỡ xoá trình duyệt.'}</p>
        ${msg ? `<p class="cl-msg">${msg}</p>` : ''}
        ${rec ? '' : `<button class="st-resume cl-new" ${local ? '' : 'disabled'}>Lấy mã lưu</button>${local ? '' : '<p class="cl-p cl-sm">Mở tiệm trước đã, có tiến độ mới lưu được.</p>'}`}
        <button class="st-row cl-enter"><span>${rec ? 'Nhập lại mã' : 'Có mã từ máy khác?'}</span><b>NHẬP MÃ</b></button>
        <button class="st-home cl-x">Đóng</button>`;
      body.querySelector('.cl-new')?.addEventListener('click', async () => {
        const b = body.querySelector('.cl-new') as HTMLButtonElement;
        busy(b, 'Đang xin mã…');
        const raw = localRaw();
        const r = await post({ op: 'create', device: deviceId(), state: raw ? JSON.parse(raw) : null });
        if (r.status === 200) {
          const x = r.body as unknown as Remote & { code: string };
          rec = { code: x.code, rev: x.rev, linked: true, day: x.day, savedAt: x.savedAt, hash: fnv(raw || ''), conflict: null };
          lastTry = Date.now();
          msg = '';
          sfx('ding');
          persist();
        } else msg = r.body.error === 'DEVICE_HAS_CODE' ? 'Máy này đã có mã từ trước (mỗi máy 1 mã). Nhập lại mã cũ để nối lại.' : say(r);
        render();
      });
      body.querySelector('.cl-enter')!.addEventListener('click', () => { view = 'enter'; msg = ''; sfx('click'); render(); });
      body.querySelector('.cl-x')!.addEventListener('click', close);
      return;
    }
    const c = rec.conflict;
    const status = c ? '' : rec.savedAt ? `Đã lưu ngày ${rec.day} · ${ago(rec.savedAt)}` : 'Chưa lưu lần nào';
    body.innerHTML = `${head}
      <div class="cl-ticket"><span>MÃ LƯU CỦA TIỆM</span><b class="cl-code">${fmtCode(rec.code)}</b><button class="cl-copy">Chép mã</button></div>
      <p class="cl-p cl-sm">Giữ mã như chìa khoá: ai có mã là mở được tiệm này. Mỗi máy giữ 1 mã.</p>
      ${c ? `<div class="cl-warn">Máy khác vừa lưu bản mới hơn: <b>${brief(c)}</b>, ${ago(c.savedAt)}. Máy này đang ở ngày ${local?.day ?? '?'}.</div>
        <button class="st-resume cl-pull">Lấy bản trên mây</button>
        <button class="st-row cl-keep"><span>Giữ bản máy này</span><b>GHI ĐÈ</b></button>`
      : `<p class="cl-status">${status}</p>${note}<button class="st-resume cl-now">Lưu ngay</button>`}
      <div class="cl-links"><button class="cl-enter">Nhập mã khác</button><button class="cl-del">${armDelete ? 'Bấm lần nữa để xoá' : 'Xoá bản trên mây'}</button></div>
      <button class="st-home cl-x">Đóng</button>`;
    body.querySelector('.cl-copy')!.addEventListener('click', async () => {
      sfx('click');
      try { await navigator.clipboard.writeText(fmtCode(rec!.code)); msg = 'Đã chép mã.'; } catch { msg = 'Giữ ngón tay lên mã để chép.'; }
      render();
    });
    body.querySelector('.cl-now')?.addEventListener('click', async () => {
      const b = body.querySelector('.cl-now') as HTMLButtonElement;
      busy(b, 'Đang lưu…');
      msg = '';
      lastMsg = '';
      await push(true);
      if (!lastMsg && !rec?.conflict) sfx('ding');
      render();
    });
    body.querySelector('.cl-pull')?.addEventListener('click', async () => {
      const b = body.querySelector('.cl-pull') as HTMLButtonElement;
      busy(b, 'Đang lấy…');
      const r = await post({ op: 'restore', code: rec!.code, device: deviceId() });
      if (r.status === 200) { applyRemote(r.body.state, r.body as unknown as Remote, rec!.code); return; }
      msg = say(r);
      render();
    });
    body.querySelector('.cl-keep')?.addEventListener('click', async () => {
      if (!rec?.conflict) return;
      rec.rev = rec.conflict.rev;
      rec.conflict = null;
      rec.hash = undefined;
      await push(true);
      render();
    });
    body.querySelector('.cl-enter')!.addEventListener('click', () => { view = 'enter'; typed = ''; msg = ''; sfx('click'); render(); });
    body.querySelector('.cl-del')!.addEventListener('click', async () => {
      sfx('click');
      if (!armDelete) { armDelete = true; render(); return; }
      const r = await post({ op: 'remove', code: rec!.code, device: deviceId() });
      armDelete = false;
      if (r.status === 200 || r.body.error === 'DEVICE_NOT_BOUND') { rec = null; persist(); msg = 'Đã xoá bản trên mây. Tiến độ trong máy vẫn nguyên.'; } else msg = say(r);
      render();
    });
    body.querySelector('.cl-x')!.addEventListener('click', close);
  };
  const off = onCloudChange(() => { if (view === 'main') render(); });
  render();
  ov.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === ov) close(); });
}
