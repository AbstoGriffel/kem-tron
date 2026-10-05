/**
 * Stage rộng 390 (design px), CAO THAY ĐỔI theo màn hình để game vừa khít viewport, không crop.
 * Vùng trên (tường/cửa sổ) neo trên, vùng dưới (ngăn kéo) neo dưới, vùng bàn caro ở giữa co giãn.
 * H tính 1 lần lúc khởi động; đổi kích thước sau đó chỉ co giãn lại (giữ bố cục).
 */
export const STAGE_W = 390;
export const DESIGN_H = 844;
const MIN_H = 740;
const MAX_H = 980;

export const LAYOUT = { H: DESIGN_H, dy: 0, topY: 0, midY: 0 };
export let stageScale = 1;

function computeH() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const h = vh / (vw / STAGE_W);
  return Math.round(Math.max(MIN_H, Math.min(MAX_H, h)));
}

function setLayout(H: number) {
  const dy = H - DESIGN_H;
  const topY = dy < 0 ? Math.round(Math.max(dy, -60) * 0.3) : 0;
  // trạm trên bàn nằm giữa vùng bàn, nhưng đáy bếp ga không được lố qua mép khăn bàn
  const midY = Math.round(Math.min((topY + dy) / 2, dy + 14));
  Object.assign(LAYOUT, { H, dy, topY, midY });
}

export function fitStage() {
  const stage = document.getElementById('stage')!;
  setLayout(computeH());
  const apply = () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    stageScale = Math.min(vw / STAGE_W, vh / LAYOUT.H);
    stage.style.height = `${LAYOUT.H}px`;
    // đặt tuyệt đối giữa màn: grid căn giữa theo chiều cao CHƯA co nên máy ngắn bị lệch xuống, mất đáy
    stage.style.transform = `translate(-50%, -50%) scale(${stageScale})`;
    const r = stage.style;
    r.setProperty('--H', `${LAYOUT.H}px`);
    r.setProperty('--dy', `${LAYOUT.dy}px`);
    r.setProperty('--topY', `${LAYOUT.topY}px`);
    r.setProperty('--midY', `${LAYOUT.midY}px`);
    r.setProperty('--mk', String(Math.min(1, LAYOUT.H / DESIGN_H)));
  };
  apply();
  window.addEventListener('resize', apply);
  window.visualViewport?.addEventListener('resize', apply);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
}

/** Đổi toạ độ client → toạ độ stage (design px). */
export function toStage(clientX: number, clientY: number) {
  const r = document.getElementById('stage')!.getBoundingClientRect();
  return { x: (clientX - r.left) / stageScale, y: (clientY - r.top) / stageScale };
}
