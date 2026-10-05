import { gsap } from 'gsap';
import { ICONS } from '../art/icons';
import { el } from '../art/kit';
import { toStage } from './stage';
import { sfx } from './audio';

export interface DropZone {
  id: string;
  hit: (x: number, y: number) => boolean;
  onHover?: (over: boolean) => void;
}

/** Kéo một icon nổi trên lớp drag (ngoài world để không rung theo). */
export class DragManager {
  private layer: SVGSVGElement;
  zones: DropZone[] = [];

  constructor(layer: SVGSVGElement) {
    this.layer = layer;
  }

  /**
   * Bắt đầu kéo từ pointerdown. onTap gọi khi nhả mà gần như không di chuyển.
   * onDrop trả về true nếu chấp nhận; false → icon bay về chỗ cũ.
   */
  start(e: PointerEvent, iconId: string, from: { x: number; y: number }, opts: {
    onTap?: () => void;
    onDrop: (zone: string | null, x: number, y: number) => boolean | Promise<boolean>;
    onMove?: (zone: string | null) => void;
    size?: number;
  }) {
    e.preventDefault();
    const size = opts.size ?? 58;
    const p0 = toStage(e.clientX, e.clientY);
    const g = el('g', { style: 'pointer-events:none' });
    g.innerHTML = `<g class="dragee"><svg x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" viewBox="0 0 80 80" overflow="visible">${ICONS[iconId] ?? ''}</svg></g>`;
    const inner = g.firstElementChild as SVGGElement;
    let moved = false;
    let cur = { x: from.x, y: from.y };
    let target = { x: from.x, y: from.y };
    let lastX = p0.x;
    let hovered: string | null = null;
    gsap.set(g, { x: from.x, y: from.y });

    const pointerId = e.pointerId;
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const p = toStage(ev.clientX, ev.clientY);
      if (!moved && Math.hypot(p.x - p0.x, p.y - p0.y) > 6) {
        moved = true;
        this.layer.appendChild(g);
        sfx('pick');
        gsap.fromTo(inner, { scale: 0.8 }, { scale: 1.18, duration: 0.08, ease: 'back.out(3)' });
      }
      if (!moved) return;
      target = { x: p.x, y: p.y - 42 };
      const vx = p.x - lastX;
      lastX = p.x;
      gsap.to(inner, { rotation: Math.max(-15, Math.min(15, vx * 1.2)), duration: 0.15 });
      const z = this.zones.find((zz) => zz.hit(p.x, p.y - 30));
      const zid = z?.id ?? null;
      if (zid !== hovered) {
        this.zones.find((zz) => zz.id === hovered)?.onHover?.(false);
        z?.onHover?.(true);
        hovered = zid;
        opts.onMove?.(zid);
      }
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.45;
      cur.y += (target.y - cur.y) * 0.45;
      gsap.set(g, { x: cur.x, y: cur.y });
    };
    gsap.ticker.add(tick);
    const finish = async (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      this.zones.find((zz) => zz.id === hovered)?.onHover?.(false);
      if (!moved) {
        gsap.ticker.remove(tick);
        g.remove();
        opts.onTap?.();
        return;
      }
      const p = toStage(ev.clientX, ev.clientY);
      const ok = ev.type === 'pointercancel' ? false : await opts.onDrop(hovered, p.x, p.y - 30);
      gsap.ticker.remove(tick);
      if (ok) {
        g.remove();
      } else {
        sfx('unplop');
        gsap.to(g, { x: from.x, y: from.y, duration: 0.25, ease: 'back.in(1.4)', onComplete: () => g.remove() });
        gsap.to(inner, { scale: 0.7, rotation: 0, duration: 0.25 });
      }
      opts.onMove?.(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }
}
