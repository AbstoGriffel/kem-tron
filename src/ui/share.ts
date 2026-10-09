import type { ServeOutcome } from '../core/serve';
import type { Customer } from '../core/state';

/** Link game in trên ảnh chia sẻ. */
export const GAME_LINK = 'kem-tron.vercel.app';

export interface Shot {
  c: Customer;
  out: ServeOutcome;
  /** chuỗi <svg> hạt đậu TRƯỚC / SAU (đã có lớp da) */
  before: string;
  after: string;
  /** tên hũ (người chơi đặt trong sổ, hoặc tên tự đặt) */
  jar: string;
  good: boolean;
  bad: boolean;
}

const W = 720, H = 960;

function svgImage(svg: string): Promise<HTMLImageElement> {
  const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** Vẽ tấm ảnh TRƯỚC/SAU ra PNG (T40): mặt trước/sau, tên hũ, sao + review, logo + link game. */
export async function renderShot(s: Shot): Promise<Blob> {
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  await document.fonts?.ready;
  ctx.fillStyle = '#2A1A16';
  ctx.fillRect(0, 0, W, H);
  // khung polaroid
  ctx.save();
  ctx.translate(W / 2, 470);
  ctx.rotate(-0.03);
  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(-310, -380, 620, 760);
  ctx.strokeStyle = '#2A1A16';
  ctx.lineWidth = 6;
  ctx.strokeRect(-310, -380, 620, 760);
  const ph = async (svg: string, x: number, bg: string, cap: string) => {
    ctx.fillStyle = bg;
    ctx.fillRect(x, -350, 280, 350);
    ctx.strokeRect(x, -350, 280, 350);
    const im = await svgImage(svg.replace(/width="\d+" height="\d+"/, 'width="236" height="296"'));
    ctx.drawImage(im, x + 22, -310, 236, 296);
    ctx.fillStyle = '#2A1A16';
    ctx.font = '30px "Paytone One"';
    ctx.textAlign = 'center';
    ctx.fillText(cap, x + 140, 40);
  };
  await ph(s.before, -290, '#CFE8DD', 'TRƯỚC');
  await ph(s.after, 10, s.good ? '#FFE07A' : s.bad ? '#FFB4A6' : '#F4E7C5', 'SAU');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#E63B2E';
  ctx.font = '34px "Paytone One"';
  ctx.fillText(`Hũ "${s.jar}"`, 0, 104);
  ctx.fillStyle = '#FFC53D';
  ctx.strokeStyle = '#2A1A16';
  ctx.lineWidth = 3;
  ctx.font = '48px "Paytone One"';
  const st = Math.round(s.out.review.stars);
  ctx.fillText('★'.repeat(st) + '☆'.repeat(5 - st), 0, 170);
  ctx.fillStyle = '#2A1A16';
  ctx.font = '700 30px "Baloo 2"';
  const lines = wrap(ctx, `"${s.out.review.text}"`, 540);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 0, 226 + i * 38));
  ctx.font = '700 24px "Baloo 2"';
  ctx.fillStyle = '#6B524A';
  ctx.fillText(`— ${s.c.name}`, 0, 226 + Math.min(3, lines.length) * 38 + 8);
  ctx.restore();
  // logo + link
  ctx.textAlign = 'center';
  ctx.font = '46px "Paytone One"';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#2A1A16';
  ctx.strokeText('KEM TRỘN', W / 2, 912);
  ctx.fillStyle = '#FFF4DC';
  ctx.fillText('KEM TRỘN', W / 2, 912);
  ctx.font = '700 22px "Baloo 2"';
  ctx.fillStyle = '#FFC53D';
  ctx.fillText(GAME_LINK, W / 2, 944);
  return new Promise((res) => cv.toBlob((b) => res(b!), 'image/png'));
}

/** Điện thoại: mở bảng chia sẻ của máy; máy tính (hoặc không chia sẻ được): tải file PNG. */
export async function sharePhoto(s: Shot, toast: (m: string, k?: 'info' | 'bad' | 'good') => void) {
  try {
    const blob = await renderShot(s);
    const file = new File([blob], `kem-tron-${Date.now()}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await nav.share({ files: [file], title: 'Kem Trộn', text: `Hũ "${s.jar}" — ${GAME_LINK}` });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Đã lưu ảnh!', 'good');
  } catch (e) {
    if ((e as Error)?.name !== 'AbortError') toast('Không lưu được ảnh, thử lại nha.', 'bad');
  }
}
