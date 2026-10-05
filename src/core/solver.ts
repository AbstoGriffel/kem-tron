import { BASES, INGREDIENTS } from './db';
import { computeMix, processedStats } from './mix';
import { inTarget } from './score';
import type { BowlItem, Proc, Target } from './types';

export interface Solution { base: string; items: BowlItem[]; cost: number; doc: number }

interface Opts { day?: number; honestOnly?: boolean; maxParts?: number; heat?: boolean }

/** Vét cạn mọi mẻ (cốt × multiset nguyên liệu đã chế biến) thoả target. Dùng cho test cân bằng & gợi ý. */
export function solve(target: Target, opts: Opts = {}): Solution[] {
  const day = opts.day ?? 99;
  const variants: BowlItem[] = [];
  for (const it of INGREDIENTS) {
    if (it.unlockDay > day) continue;
    if (opts.honestOnly && it.fake) continue;
    for (const p of ['raw', ...it.process] as Proc[]) variants.push({ id: it.id, proc: p });
  }
  void processedStats;
  const out: Solution[] = [];
  for (const b of BASES) {
    if (b.unlockDay > day || (opts.honestOnly && b.fake)) continue;
    const cap = Math.min(b.capacity, opts.maxParts ?? b.capacity);
    const cur: BowlItem[] = [];
    const rec = (start: number) => {
      if (cur.length) {
        for (const heat of opts.heat ? [false, true] : [false]) {
          const r = computeMix(b.id, cur, heat, false);
          if (!r.ruined && inTarget(r.stats, target)) out.push({ base: b.id, items: cur.slice(), cost: r.cost, doc: r.stats.d });
        }
      }
      if (cur.length >= cap) return;
      for (let i = start; i < variants.length; i++) {
        cur.push(variants[i]);
        rec(i);
        cur.pop();
      }
    };
    rec(0);
  }
  return out.sort((a, b) => a.cost - b.cost);
}
