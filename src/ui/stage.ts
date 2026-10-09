/**
 * Stage luôn rộng 390 design px và phủ KÍN bề ngang máy; chiều cao H = chiều cao máy quy ra design px.
 * Máy dài hơn bản design 844 → bàn caro + tường giãn ra; máy ngắn → co lại theo nấc (xem setLayout).
 * Chỉ khi máy quá ngắn (< MIN_H, vd laptop nằm ngang) mới thu cả màn cho vừa và chừa 2 bên.
 *
 * Bố cục (H, dy, topY, midY) đổi được lúc chạy: khi viewport đổi thật (app mở từ màn hình chính báo
 * chiều cao sai lúc đầu, xoay máy...) → gọi các listener onRelayout để dựng lại cảnh ở lúc an toàn.
 */
export const STAGE_W = 390;
export const DESIGN_H = 844;
export const MIN_H = 660;
const MAX_H = 1000;

/**
 * H     : chiều cao stage (design px), kể cả phần dưới thanh home (padB)
 * dy    : độ lệch vùng dưới (ngăn kéo) so với bản 844, đã trừ padB
 * topY  : độ lệch vùng tường (âm = tường trượt lên, cắt bớt mái hiên)
 * midY  : độ lệch cụm trạm trên bàn (thau, bếp, cối, máy xay)
 * pinY  : bù cho đồ treo tường (đồng hồ, lịch, điện thoại live) để chúng ít bị đẩy khỏi mép trên
 * padB  : vùng an toàn dưới (thanh home iPhone) quy ra design px
 */
export const LAYOUT = { H: DESIGN_H, dy: 0, topY: 0, midY: 0, pinY: 0, padB: 0 };
export let stageScale = 1;

const listeners: (() => void)[] = [];
/** Đăng ký hàm dựng lại khi bố cục đổi (H khác đi). Trả về hàm huỷ đăng ký. */
export function onRelayout(fn: () => void) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Phần chênh chiều cao so với bản 844 (đã trừ vùng thanh home) — màn phủ toàn bộ dời nội dung neo đáy theo số này. */
export const ex = () => LAYOUT.H - LAYOUT.padB - DESIGN_H;

/** Chạy fn ngay + mỗi lần bố cục đổi, tới khi el bị gỡ khỏi trang (dùng cho các màn phủ toàn bộ). */
export function watchLayout(el: Element, fn: () => void) {
  fn();
  const off = onRelayout(() => {
    if (!el.isConnected) { off(); return; }
    fn();
  });
}

/** Vùng an toàn dưới (px CSS) — đo qua env() vì JS không đọc trực tiếp được. */
function safeBottom(): number {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(p);
  const h = p.getBoundingClientRect().height;
  p.remove();
  return h;
}

function viewport() {
  // innerHeight chứ không phải visualViewport: bàn phím (đổi tên hũ) chỉ thu visualViewport, không được làm co cả game
  return { vw: window.innerWidth, vh: window.innerHeight };
}

const typing = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
};

/** Chiều cao design ứng với viewport hiện tại (đã kẹp MIN/MAX) + vùng an toàn dưới. */
function measure() {
  const { vw, vh } = viewport();
  const s = vw / STAGE_W;
  const H = Math.round(Math.max(MIN_H, Math.min(MAX_H, vh / s)));
  const padB = Math.round(Math.min(40, safeBottom() / s));
  return { H, padB };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/**
 * Chia phần chênh so với 844 cho tường và bàn — hàm liên tục, không nhảy bậc:
 *  - máy dài: tường lấy 35%, bàn 65% (trạm trôi xuống giữa bàn)
 *  - 844 → 760: chỉ bàn co (tường nhích rất ít)
 *  - 760 → MIN_H: tường trượt lên mạnh (mái hiên + mép trên cửa sổ ra khỏi màn), đồ treo tường được ghim lại
 */
export function setLayout(H: number, padB = 0) {
  const dy = H - padB - DESIGN_H;
  let topY: number;
  if (dy >= 0) topY = Math.round(dy * 0.35);
  else {
    const a = -dy;
    topY = -Math.round(Math.min(a, 84) * 0.15 + Math.max(0, a - 84) * 0.62);
  }
  // trạm trên bàn nằm giữa vùng bàn, nhưng đáy bếp ga không được lố qua mép khăn bàn
  const midY = Math.round(Math.min((topY + dy) / 2, dy + 14));
  // đồ treo tường chỉ đi theo tường tới -14 rồi đứng lại (bù phần còn lại)
  const pinY = Math.round(-topY + Math.max(topY, -14) + lerp(0, 6, -topY / 60));
  Object.assign(LAYOUT, { H, dy, topY, midY, pinY, padB });
}

let stageEl: HTMLElement;

function applyScale() {
  const { vw, vh } = viewport();
  // V2-28: H làm tròn nên 2 tỉ lệ lệch nhau chút xíu → lấy min thì mép stage rơi vào nửa pixel, lộ 1px nền phía sau.
  // Lệch < 1% thì lấy max (stage phủ tràn ra ngoài màn); lệch nhiều (máy quá ngắn, chừa 2 bên) thì vẫn min.
  const sx = vw / STAGE_W, sy = vh / LAYOUT.H;
  // Chrome còn khử răng cưa mép lớp có scale lẻ (trộn 1px với nền #app) → phủ tràn thêm 1px mỗi mép.
  // Tỉ lệ đúng 1 (390×844…) thì giữ nguyên 1 — không phóng để chữ khỏi mờ.
  const mx = Math.max(sx, sy);
  stageScale = Math.abs(sx - sy) / Math.min(sx, sy) >= 0.01 ? Math.min(sx, sy) : Math.abs(mx - 1) < 1e-3 ? 1 : mx * (vw + 2) / vw;
  stageEl.style.height = `${LAYOUT.H}px`;
  stageEl.style.transform = `translate(-50%, -50%) scale(${stageScale})`;
  const r = stageEl.style;
  r.setProperty('--H', `${LAYOUT.H}px`);
  r.setProperty('--dy', `${LAYOUT.dy}px`);
  r.setProperty('--topY', `${LAYOUT.topY}px`);
  r.setProperty('--midY', `${LAYOUT.midY}px`);
  r.setProperty('--padB', `${LAYOUT.padB}px`);
  // bảng nổi (sổ bí kíp, điện thoại...) vẫn giữ khung 844 và thu lại khi máy ngắn
  r.setProperty('--mk', String(Math.min(1, LAYOUT.H / DESIGN_H)));
  // các màn phủ toàn bộ (tiêu đề, buổi sáng, sổ tối...) dời nội dung theo phần chênh này
  r.setProperty('--ex', `${LAYOUT.H - LAYOUT.padB - DESIGN_H}px`);
}

/** Bố cục đang chờ áp (khi đang bán dở thì chỉ co giãn, để tới lúc an toàn mới dựng lại). */
let pending: { H: number; padB: number } | null = null;
let canRelayout: () => boolean = () => true;
/** Game báo khi nào dựng lại cảnh được (không đang bán dở). */
export function setRelayoutGuard(fn: () => boolean) {
  canRelayout = fn;
}

function check() {
  if (typing()) return;
  const m = measure();
  if (Math.abs(m.H - LAYOUT.H) < 4 && m.padB === LAYOUT.padB) {
    pending = null;
    applyScale();
    return;
  }
  if (!canRelayout()) {
    pending = m;
    applyScale();
    return;
  }
  relayoutNow(m);
}

function relayoutNow(m: { H: number; padB: number }) {
  pending = null;
  setLayout(m.H, m.padB);
  applyScale();
  for (const fn of listeners.slice()) fn();
}

/** Gọi ở lúc an toàn (vd đầu ngày mới): nếu có bố cục đang chờ thì áp luôn. */
export function flushRelayout() {
  if (pending) relayoutNow(pending);
}

export function fitStage() {
  stageEl = document.getElementById('stage')!;
  const m = measure();
  setLayout(m.H, m.padB);
  applyScale();
  let t = 0;
  const later = () => {
    window.clearTimeout(t);
    t = window.setTimeout(check, 120);
  };
  window.addEventListener('resize', later);
  window.visualViewport?.addEventListener('resize', later);
  window.addEventListener('orientationchange', later);
  // app mở từ màn hình chính (iOS) báo chiều cao chưa đúng trong vài trăm ms đầu → đo lại
  window.setTimeout(check, 350);
  window.setTimeout(check, 1200);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

/** Đổi toạ độ client → toạ độ stage (design px). */
export function toStage(clientX: number, clientY: number) {
  const r = document.getElementById('stage')!.getBoundingClientRect();
  return { x: (clientX - r.left) / stageScale, y: (clientY - r.top) / stageScale };
}
