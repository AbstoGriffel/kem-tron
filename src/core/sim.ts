import { BASES, INGREDIENTS } from './db';
import { endDay, newDayLog, startNextDay } from './day';
import { computeMix } from './mix';
import { mulberry32, pick, type Rng } from './rng';
import { serve } from './serve';
import { solve, type Solution } from './solver';
import { customersForDay, dayRng, ECON, GUS, JARS, LABELS, newGame, unlocked, type SaveState } from './state';
import type { BowlItem } from './types';

/**
 * T02 — mô phỏng 10 ngày theo kiểu người chơi (thuần, không DOM).
 *  - gioi : chọn công thức tốn ít tiền mua thêm nhất (xài kho trước), gói đúng gu nếu rẻ.
 *  - moi  : chọn đại 1 công thức trong nhóm rẻ, mua dư theo cảm tính (mỗi món thiếu mua 3), 30% bỏ nhầm 1 món.
 *  - si   : như "gioi" nhưng xài cả hàng sỉ.
 */
export type PlayerKind = 'gioi' | 'moi' | 'si';

export interface SimDay {
  day: number;
  money: number;
  served: number;
  refused: number;
  stars: number;
  lossOrders: number;
  spend: number;
  sales: number;
  debtPaid: boolean | null;
}

export interface SimResult { kind: PlayerKind; seed: number; days: SimDay[]; debtsPaid: number; suspicion: number; bankrupt: boolean }

const priceOf = (id: string) => (INGREDIENTS.find((i) => i.id === id) ?? BASES.find((b) => b.id === id))!.price;

const cache = new Map<string, Solution[]>();
function sols(target: Parameters<typeof solve>[0], day: number, honest: boolean, key: string) {
  const k = `${key}:${day}:${honest}`;
  let v = cache.get(k);
  if (!v) { v = solve(target, { day, honestOnly: honest, maxParts: 4 }).slice(0, 600); cache.set(k, v); }
  return v;
}

function need(sol: { base: string; items: BowlItem[] }) {
  const m = new Map<string, number>([[sol.base, 1]]);
  for (const it of sol.items) m.set(it.id, (m.get(it.id) ?? 0) + 1);
  return m;
}
function missingCost(s: SaveState, sol: Solution) {
  let c = 0;
  for (const [id, n] of need(sol)) c += Math.max(0, n - (s.stock[id] ?? 0)) * priceOf(id);
  return c;
}
function hasAll(s: SaveState, sol: Solution) {
  for (const [id, n] of need(sol)) if ((s.stock[id] ?? 0) < n) return false;
  return true;
}

export function simulate(kind: PlayerKind, seed: number, days = 10): SimResult {
  const s = newGame(seed);
  const rng: Rng = mulberry32(seed * 977 + kind.length);
  const out: SimDay[] = [];
  for (let d = 1; d <= days; d++) {
    const log = newDayLog();
    const canBuy = unlocked(s, 'phone');
    let refused = 0, lossOrders = 0;
    for (const c of customersForDay(s)) {
      const all = sols(c.order.target, s.day, kind !== 'si', c.order.id);
      let sol: Solution | undefined;
      if (kind === 'moi') {
        sol = guess(s, c.order.target, rng, canBuy);
      } else {
        const pool = canBuy ? all : all.filter((x) => hasAll(s, x));
        sol = pool.slice().sort((a, b) => missingCost(s, a) - missingCost(s, b) || a.cost - b.cost)[0];
      }
      if (!sol) { refused++; continue; }
      // mua phần thiếu
      const buys: [string, number][] = [];
      let spend = 0;
      for (const [id, n] of need(sol)) {
        const miss = Math.max(0, n - (s.stock[id] ?? 0));
        if (!miss) continue;
        const buy = kind === 'moi' ? Math.max(miss, 3) : miss;
        buys.push([id, buy]);
        spend += buy * priceOf(id);
      }
      if (spend > Math.max(0, s.money)) { refused++; continue; }
      for (const [id, n] of buys) s.stock[id] = (s.stock[id] ?? 0) + n;
      s.money -= spend;
      log.ingredientSpend += spend;
      const items = sol.items.slice();
      s.stock[sol.base]--;
      for (const it of items) s.stock[it.id] = (s.stock[it.id] ?? 0) - 1;
      const mix = computeMix(sol.base, items, sol.heated, false);
      // đóng gói: người giỏi chọn đúng gu nếu tổng hũ + nhãn ≤ 8k, còn lại hũ nhựa + viết tay
      const gu = GUS[c.order.gu];
      let jar = 'nhua', label = 'viet_tay';
      if (kind !== 'moi' && gu) {
        const j = JARS.filter((x) => gu.jars.includes(x.id) && (!x.unlockDay || x.unlockDay <= s.day)).sort((a, b) => a.price - b.price)[0];
        const l = LABELS.filter((x) => gu.labels.includes(x.id) && (!x.unlockDay || x.unlockDay <= s.day)).sort((a, b) => a.price - b.price)[0];
        if (j && l && j.price + l.price <= 8) { jar = j.id; label = l.id; }
      }
      const pack = JARS.find((x) => x.id === jar)!.price + LABELS.find((x) => x.id === label)!.price;
      s.money -= pack;
      log.ingredientSpend += pack;
      const o = serve(s, { customer: c, mix, items, baseId: sol.base, jar, label, askedClear: false, viewers: 0, garden: false }, rng);
      log.sales += o.paid; log.tips += o.tip; log.served++; log.stars.push(o.score.stars);
      if (mix.fakeCount) log.usedFake = true;
      if (c.order.special !== 'me' && o.paid + o.tip < mix.cost + pack) lossOrders++;
    }
    const l = endDay(s, log, 0, dayRng(s, 'end'));
    out.push({
      day: s.day, money: Math.round(s.money), served: log.served, refused, lossOrders,
      stars: log.stars.length ? Math.round((log.stars.reduce((a, b) => a + b, 0) / log.stars.length) * 10) / 10 : 0,
      spend: log.ingredientSpend, sales: log.sales + log.tips, debtPaid: l.debt ? l.debt.paid : null,
    });
    if (l.bankrupt) return { kind, seed, days: out, debtsPaid: s.debtsPaid.length, suspicion: Math.round(s.suspicion), bankrupt: true };
    startNextDay(s, dayRng(s, 'morning'));
  }
  return { kind, seed, days: out, debtsPaid: s.debtsPaid.length, suspicion: Math.round(s.suspicion), bankrupt: false };
}

export const ECON_SNAPSHOT = () => ({ startMoney: ECON.startMoney, rent: ECON.rent, debts: ECON.debts });

/** Người mới trộn theo cảm tính: lấy cốt quen tay, thấy chỉ số nào còn thiếu thì bốc đại 1 món có chỉ số đó (không để ý Độc), đủ thì dừng — đôi khi bỏ thêm 1 món "cho chắc". */
function guess(s: SaveState, target: Parameters<typeof solve>[0], rng: Rng, canBuy: boolean): Solution | undefined {
  const okIng = (id: string) => canBuy || (s.stock[id] ?? 0) > 0;
  const bases = BASES.filter((b) => b.unlockDay <= s.day && !b.fake && okIng(b.id));
  if (!bases.length) return undefined;
  const base = bases.find((b) => b.id === 'kem_tron') ?? bases[0];
  const items: BowlItem[] = [];
  const pool = INGREDIENTS.filter((i) => i.unlockDay <= s.day && !i.fake);
  const used = new Map<string, number>();
  for (let step = 0; step < 4; step++) {
    const st = computeMix(base.id, items, false, false).stats;
    let worst: 't' | 'm' | 'n' | 'k' | null = null, gap = 0;
    for (const k of ['t', 'm', 'n', 'k'] as const) {
      const r = target[k];
      if (r && r[0] - st[k] > gap) { gap = r[0] - st[k]; worst = k; }
    }
    if (!worst) { if (rng() < 0.25 && items.length < 4) { const x = pick(rng, pool.filter((i) => okIng(i.id) && (used.get(i.id) ?? 0) < (s.stock[i.id] ?? 0) + (canBuy ? 9 : 0))); if (x) items.push({ id: x.id, proc: 'raw' }); } break; }
    const cands = pool.filter((i) => i.stats[worst!] > 0 && okIng(i.id) && (canBuy || (used.get(i.id) ?? 0) < (s.stock[i.id] ?? 0)));
    if (!cands.length) break;
    let x = pick(rng, cands);
    // thấy bọt/khói trong thau thì né món làm Độc vọt (70% lần)
    if (computeMix(base.id, [...items, { id: x.id, proc: 'raw' }], false, false).stats.d >= 6 && rng() < 0.7) {
      const safe = cands.filter((i) => computeMix(base.id, [...items, { id: i.id, proc: 'raw' }], false, false).stats.d < 6);
      if (safe.length) x = pick(rng, safe);
    }
    used.set(x.id, (used.get(x.id) ?? 0) + 1);
    items.push({ id: x.id, proc: 'raw' });
  }
  if (!items.length) return undefined;
  const m = computeMix(base.id, items, false, false);
  return { base: base.id, items, cost: m.cost, doc: m.stats.d, heated: false };
}
