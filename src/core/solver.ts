import econ from '../data/economy.json';
import { BASES, INGREDIENTS } from './db';
import { computeMix } from './mix';
import { inTarget } from './score';
import type { BowlItem, Proc, Target } from './types';

export interface Solution { base: string; items: BowlItem[]; cost: number; doc: number; heated: boolean }

interface Opts { day?: number; honestOnly?: boolean; maxParts?: number; heat?: boolean; maxDoc?: number }

/** Ngày mở của từng kiểu chế biến (cối / máy xay) và bếp — solver không dùng trạm chưa mở. */
export const procDay = (p: Proc) => (p === 'nghien' ? econ.unlocks.mortar : p === 'xay' ? econ.unlocks.blender : 1);

/** Vét cạn mọi mẻ (cốt × multiset nguyên liệu đã chế biến) thoả target, chỉ dùng thứ đã mở tới `day`. Dùng cho test cân bằng & gợi ý. */
export function solve(target: Target, opts: Opts = {}): Solution[] {
  const day = opts.day ?? 99;
  const variants: BowlItem[] = [];
  for (const it of INGREDIENTS) {
    if (it.unlockDay > day) continue;
    if (opts.honestOnly && it.fake) continue;
    for (const p of ['raw', ...it.process] as Proc[]) if (procDay(p) <= day) variants.push({ id: it.id, proc: p });
  }
  const heats = opts.heat && day >= econ.unlocks.stove ? [false, true] : [false];
  const out: Solution[] = [];
  for (const b of BASES) {
    if (b.unlockDay > day || (opts.honestOnly && b.fake)) continue;
    const cap = Math.min(b.capacity, opts.maxParts ?? b.capacity);
    const cur: BowlItem[] = [];
    const rec = (start: number) => {
      if (cur.length) {
        for (const heat of heats) {
          const r = computeMix(b.id, cur, heat, false);
          if (!r.ruined && inTarget(r.stats, target) && (opts.maxDoc === undefined || r.stats.d <= opts.maxDoc)) out.push({ base: b.id, items: cur.slice(), cost: r.cost, doc: r.stats.d, heated: heat });
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

/** Kho hiện có làm nổi đơn này không (dùng cho gợi ý gọi mối khi thiếu đồ). Dừng ngay khi thấy 1 cách. */
export function canMakeFromStock(target: Target, stock: Record<string, number>, day: number, maxParts = 4): boolean {
  const variants: BowlItem[] = [];
  for (const it of INGREDIENTS) {
    if (it.unlockDay > day || (stock[it.id] ?? 0) <= 0) continue;
    for (const p of ['raw', ...it.process] as Proc[]) if (procDay(p) <= day) variants.push({ id: it.id, proc: p });
  }
  for (const b of BASES) {
    if ((stock[b.id] ?? 0) <= 0) continue;
    const cap = Math.min(b.capacity, maxParts);
    const cur: BowlItem[] = [];
    const used = new Map<string, number>();
    const rec = (start: number): boolean => {
      if (cur.length) {
        const r = computeMix(b.id, cur, false, false);
        if (!r.ruined && inTarget(r.stats, target)) return true;
      }
      if (cur.length >= cap) return false;
      for (let i = start; i < variants.length; i++) {
        const id = variants[i].id;
        if ((used.get(id) ?? 0) >= (stock[id] ?? 0)) continue;
        used.set(id, (used.get(id) ?? 0) + 1);
        cur.push(variants[i]);
        const ok = rec(i);
        cur.pop();
        used.set(id, used.get(id)! - 1);
        if (ok) return true;
      }
      return false;
    };
    if (rec(0)) return true;
  }
  return false;
}
