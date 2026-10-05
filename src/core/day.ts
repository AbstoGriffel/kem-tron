import { computeMix } from './mix';
import { pick, type Rng } from './rng';
import { TEXT } from './serve';
import { addSuspicion, debtToday, ECON, emptyPot, rentToday, type SaveState } from './state';

export interface DayLog {
  sales: number;
  tips: number;
  refunds: number;
  ingredientSpend: number;
  gifts: number;
  served: number;
  stars: number[];
  usedFake: boolean;
  exploded: number;
}

export const newDayLog = (): DayLog => ({ sales: 0, tips: 0, refunds: 0, ingredientSpend: 0, gifts: 0, served: 0, stars: [], usedFake: false, exploded: 0 });

export interface Ledger {
  lines: { label: string; amount: number }[];
  online: { recipe: string; paid: number }[];
  followerGain: number;
  debt?: { name: string; amount: number; paid: boolean };
  net: number;
  bankrupt: boolean;
}

/** Đơn online từ follower: làm tự động từ sổ công thức nếu đủ hàng. */
export function onlineOrders(s: SaveState, rng: Rng): { recipe: string; paid: number }[] {
  const n = Math.min(ECON.live.onlineMax, Math.floor(s.followers / ECON.live.onlinePerFollowers));
  const out: { recipe: string; paid: number }[] = [];
  if (!s.recipes.length) return out;
  for (let i = 0; i < n; i++) {
    const usable = s.recipes.filter((r) => hasStockFor(s, r.base, r.items.map((x) => x.id)));
    if (!usable.length) break;
    const r = pick(rng, usable);
    consume(s, r.base, r.items.map((x) => x.id));
    const mix = computeMix(r.base, r.items, r.heated, false);
    const price = Math.round(mix.cost * 1.7 + 4);
    s.money += price;
    r.sold++;
    out.push({ recipe: r.name, paid: price });
    if (mix.fakeCount) addSuspicion(s, mix.suspicion * 0.5);
  }
  return out;
}

export function hasStockFor(s: SaveState, base: string, ids: string[]) {
  const need = new Map<string, number>([[base, 1]]);
  for (const id of ids) need.set(id, (need.get(id) ?? 0) + 1);
  for (const [id, n] of need) if ((s.stock[id] ?? 0) < n) return false;
  return true;
}

export function consume(s: SaveState, base: string, ids: string[]) {
  s.stock[base] = (s.stock[base] ?? 0) - 1;
  for (const id of ids) s.stock[id] = (s.stock[id] ?? 0) - 1;
}

/** Chốt sổ cuối ngày. */
export function endDay(s: SaveState, log: DayLog, followerGain: number, rng: Rng): Ledger {
  const lines: Ledger['lines'] = [];
  lines.push({ label: `Bán ${log.served} hũ`, amount: log.sales });
  if (log.tips) lines.push({ label: 'Tiền boa', amount: log.tips });
  if (log.refunds) lines.push({ label: 'Hoàn tiền', amount: -log.refunds });
  if (log.gifts) lines.push({ label: 'Quà livestream', amount: log.gifts });
  const online = onlineOrders(s, rng);
  const onlineSum = online.reduce((a, b) => a + b.paid, 0);
  if (online.length) lines.push({ label: `Đơn online (${online.length})`, amount: onlineSum });
  if (log.ingredientSpend) lines.push({ label: 'Nhập hàng + hũ nhãn', amount: -log.ingredientSpend });
  const rent = rentToday(s);
  s.money -= rent;
  lines.push({ label: 'Tiền trọ + điện nước', amount: -rent });
  let debt: Ledger['debt'];
  const d = debtToday(s);
  if (d) {
    const paid = s.money >= d.amount;
    if (paid) {
      s.money -= d.amount;
      s.debtsPaid.push(d.day);
      lines.push({ label: d.name, amount: -d.amount });
    } else {
      // chị Bảy cho khất, lãi 10%, dời 2 ngày
      lines.push({ label: `${d.name} — khất nợ (+10%)`, amount: 0 });
      d.day += 2;
      d.amount = Math.round(d.amount * 1.1);
    }
    debt = { name: d.name, amount: d.amount, paid };
  }
  // ngày sạch → nghi ngờ giảm
  if (!log.usedFake) addSuspicion(s, ECON.suspicion.cleanDay);
  const net = lines.reduce((a, b) => a + b.amount, 0);
  return { lines, online, followerGain, debt, net, bankrupt: s.money < -150 };
}

export interface MorningNews {
  late: { who: string; color: string; acc: string[]; text: string; refund: number }[];
  harvestReady: number;
  inspection: boolean;
  warn: boolean;
}

/** Sang ngày mới: cây lớn, review trễ, kiểm tra. */
export function startNextDay(s: SaveState, rng: Rng): MorningNews {
  s.day += 1;
  s.progress = undefined;
  s.priceMods = {};
  s.haggled = {};
  // vườn lớn qua đêm
  let harvestReady = 0;
  for (const p of s.pots) {
    if (!p.seed) continue;
    const seed = ECON.seeds.find((x) => x.id === p.seed)!;
    const rained = rng() < 0.12;
    if (p.watered || rained) {
      p.age += 1;
      p.dry = 0;
    } else {
      p.dry += 1;
    }
    p.watered = false;
    if (p.dry >= 2) Object.assign(p, emptyPot(), { seed: 'heo' });
    if (p.seed !== 'heo' && p.age >= seed.days) p.ready = true;
    if (p.ready) harvestReady++;
  }
  // review trễ do hàng dỏm
  const late: MorningNews['late'] = [];
  for (const pd of s.pending) {
    if (rng() < pd.chance) {
      const refund = Math.round(pd.paid * 0.7);
      s.money -= refund;
      s.reviews.push({ day: s.day, stars: 1, text: pick(rng, TEXT.reviews.late), who: pd.who, late: true });
      addSuspicion(s, ECON.suspicion.oneStarFake);
      late.push({ who: pd.who, color: pd.color, acc: pd.acc, text: s.reviews[s.reviews.length - 1].text, refund });
    }
  }
  s.pending = [];
  const inspection = s.suspicion >= ECON.suspicion.inspect && rng() < (s.suspicion >= 85 ? 1 : 0.6);
  const warn = !inspection && s.suspicion >= ECON.suspicion.warn && rng() < 0.5;
  return { late, harvestReady, inspection, warn };
}
