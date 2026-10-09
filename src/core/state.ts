import econ from '../data/economy.json';
import ordersData from '../data/orders.json';
import { BASES, INGREDIENTS } from './db';
import { hashSeed, mulberry32, pick, shuffle, type Rng } from './rng';
import type { BowlItem, Target } from './types';

export const ECON = econ;
export const ORDERS = ordersData.orders as OrderDef[];
export const GUS = ordersData.gus as Record<string, { label: string; jars: string[]; labels: string[] }>;
export const JARS = ordersData.jars as { id: string; name: string; price: number; color: string; unlockDay?: number }[];
export const LABELS = ordersData.labels as { id: string; name: string; price: number; text: string; natureClaim?: boolean; suspicion?: number; unlockDay?: number }[];

export interface OrderDef {
  id: string;
  minDay: number;
  special?: 'me' | 'sinh_vien' | 'nhay_cam' | 'vip' | 'bay' | 'thanh_tra';
  clarity: 1 | 2 | 3;
  say: string;
  clear: string;
  target: Target;
  budget: number;
  gu: string;
  sex?: 'f' | 'm';
  /** V3-17: câu `say` tự xưng "chị" → chỉ rút tên bắt đầu bằng "Chị" (không ra "Em Ngọc … giùm chị") */
  pro?: 'chi';
  /** bệnh vẽ trên mặt lúc vào (T32): sam / san / chay / dau — tối đa 2 */
  skin?: string[];
}

export interface Customer {
  uid: string;
  order: OrderDef;
  name: string;
  color: string;
  acc: string[];
  budget: number;
}

export interface Recipe {
  id: string;
  name: string;
  base: string;
  items: BowlItem[];
  heated: boolean;
  color: string;
  stats: { t: number; m: number; n: number; k: number; d: number };
  sold: number;
}

export interface Review {
  day: number;
  stars: number;
  text: string;
  who: string;
  late?: boolean;
}

export interface PendingSide {
  /** khách dùng hàng dỏm — sáng mai có thể quay lại */
  who: string;
  color: string;
  acc: string[];
  chance: number;
  paid: number;
}

export interface Pot {
  seed: string | null;
  age: number;
  watered: boolean;
  dry: number;
  harvests: number;
  ready: boolean;
}

export interface SaveState {
  v: 1;
  seed: number;
  day: number;
  money: number;
  stock: Record<string, number>;
  suspicion: number;
  followers: number;
  recipes: Recipe[];
  reviews: Review[];
  pending: PendingSide[];
  pots: Pot[];
  upgrades: string[];
  debtsPaid: number[];
  debts: { day: number; amount: number; name: string }[];
  raids: number;
  closedDays: number;
  /** giá mua hôm nay theo mối (sau trả giá) */
  priceMods: Record<string, number>;
  haggled: Record<string, number>;
  stats: { served: number; stars: number; fakeServed: number; exploded: number; earned: number };
  tutorialSeen: string[];
  shopName: string;
  ended?: string;
  /** tiến độ trong ngày (để mở lại app giữa ngày không phát lại khách) */
  progress?: {
    day: number;
    served: number;
    log: { sales: number; tips: number; refunds: number; ingredientSpend: number; gifts: number; served: number; stars: number[]; usedFake: boolean; exploded: number };
    peak: number;
    /** danh sách khách chụp lúc mở tiệm — mở lại app không sinh lại */
    customers?: Customer[];
    /** đã chốt sổ: mở lại chỉ xem lại sổ, không chạy endDay lần nữa */
    closed?: boolean;
    ledger?: unknown;
  };
  /** tin buổi sáng chưa xem (giữ lại nếu tắt app giữa buổi sáng) */
  news?: unknown;
  badges?: { id: string; name: string; day: number }[];
}

export function newGame(seed = 1234): SaveState {
  return {
    v: 1,
    seed,
    day: 1,
    money: econ.startMoney,
    stock: { ...econ.startStock },
    suspicion: 0,
    followers: econ.live.startFollowers,
    recipes: [],
    reviews: [],
    pending: [],
    pots: Array.from({ length: econ.startPots }, () => emptyPot()),
    upgrades: [],
    debtsPaid: [],
    debts: econ.debts.map((d) => ({ ...d })),
    raids: 0,
    closedDays: 0,
    priceMods: {},
    haggled: {},
    stats: { served: 0, stars: 0, fakeServed: 0, exploded: 0, earned: 0 },
    tutorialSeen: ['mig:0610'],
    shopName: 'Kem Nhà Làm',
  };
}

export const emptyPot = (): Pot => ({ seed: null, age: 0, watered: false, dry: 0, harvests: 0, ready: false });

export const dayRng = (s: SaveState, salt = '') => mulberry32(hashSeed(`${s.seed}:${s.day}:${salt}`));

export const unlocked = (s: SaveState, key: keyof typeof econ.unlocks) => s.day >= econ.unlocks[key];
/** Ngày món sắm đồ bán được: không sớm hơn ngày mở của thứ nó nâng cấp (`needs` → unlocks), không viết cứng số ngày. */
export const upgradeDay = (u: { day: number; needs?: string }) =>
  Math.max(u.day, u.needs ? (econ.unlocks as Record<string, number>)[u.needs] ?? 0 : 0);
export const hasUp = (s: SaveState, id: string) => s.upgrades.includes(id);

export function availableIngredients(s: SaveState) {
  return INGREDIENTS.filter((i) => i.unlockDay <= s.day);
}
export function availableBases(s: SaveState) {
  return BASES.filter((b) => b.unlockDay <= s.day);
}

const NAMES_F = ['Chị Tư', 'Bé Na', 'Cô Ba', 'Chị Mai', 'Em Ngọc', 'Chị Thắm', 'Bé Bông', 'Chị Hằng', 'Cô Út', 'Chị Diễm', 'Em Thư'];
const NAMES_M = ['Anh Hai', 'Anh Phát', 'Anh Lâm', 'Em Tí', 'Chú Bảy'];
const NAMES = [...NAMES_F, ...NAMES_M];
const COLORS = ['#FF8A3D', '#7FDCC6', '#B9A3F0', '#FF8DB0', '#F7D046', '#6CC3F0', '#9ED36A', '#F28E8E', '#C9A27A'];
const RANDOM_ACC = [['non_bao_hiem'], ['non_la'], ['kep_cang_cua'], ['khau_trang'], ['toc_buoi'], ['toc_uon'], ['kinh_can'], ['ao_chong_nang'], [], ['kep_cang_cua', 'kinh_can'], ['non_bao_hiem', 'khau_trang']];

function specialLook(o: OrderDef, rng: Rng): { name: string; acc: string[]; color?: string } {
  const pool0 = o.sex === 'f' ? NAMES_F : o.sex === 'm' ? NAMES_M : NAMES;
  const pool = o.pro === 'chi' ? NAMES_F.filter((n) => n.startsWith('Chị')) : pool0;
  switch (o.special) {
    case 'me': return { name: 'Mẹ', acc: ['toc_uon'], color: '#F28E8E' };
    case 'sinh_vien': return { name: 'Em sinh viên', acc: ['kinh_can', 'balo', 'toc_buoi'] };
    case 'vip': return { name: 'Chị chủ tiệm vàng', acc: ['toc_uon', 'vong_vang', 'kinh_ram'], color: '#F7D046' };
    case 'thanh_tra': return { name: 'Anh khách lạ', acc: ['mu_phot', 'kinh_ram', 'cavat'], color: '#C9A27A' };
    case 'nhay_cam': return { name: pick(rng, pool), acc: ['khau_trang'] };
    default: {
      if (o.id === 'grab') return { name: 'Anh xe ôm', acc: ['non_bao_hiem', 'rau'], color: '#9ED36A' };
      if (o.id === 'ha_giang' || o.id === 'di_bien' || o.id === 'body_bien') return { name: pick(rng, pool), acc: ['kinh_ram', ...(rng() < 0.5 ? ['kep_cang_cua'] : [])] };
      return { name: pick(rng, pool), acc: pick(rng, RANDOM_ACC) };
    }
  }
}

/** Danh sách khách của ngày: deterministic theo seed + ngày. */
export function customersForDay(s: SaveState): Customer[] {
  const rng = dayRng(s, 'cust');
  let n = econ.customersPerDay[Math.min(s.day, econ.customersPerDay.length - 1)];
  if (hasUp(s, 'bien_led')) n += 1;
  const avg = avgStars(s);
  if (avg >= 4.5 && s.reviews.length >= 5) n += 1;
  if (avg > 0 && avg < 2.5 && s.reviews.length >= 5) n -= 1;
  const pool = ORDERS.filter((o) => o.minDay <= s.day && !o.special?.match(/^(me)$/));
  const out: OrderDef[] = [];
  if (s.day === 1) out.push(ORDERS.find((o) => o.id === 'me')!);
  // ưu tiên đơn rõ ràng ở ngày đầu
  const eligible = pool.filter((o) => (s.day <= 2 ? o.clarity === 1 || (s.day === 2 && o.clarity === 2) : true))
    .filter((o) => o.special !== 'thanh_tra' || (s.day >= econ.unlocks.inspector && s.suspicion >= 25));
  const shuffled = shuffle(rng, eligible);
  for (const o of shuffled) {
    if (out.length >= n) break;
    if (o.special === 'vip' && out.some((x) => x.special === 'vip')) continue;
    if (o.special === 'thanh_tra' && out.some((x) => x.special === 'thanh_tra')) continue;
    out.push(o);
  }
  // nghi ngờ cao → thanh tra cải trang chắc chắn ghé
  if (s.day >= econ.unlocks.inspector && s.suspicion >= 45 && !out.some((x) => x.special === 'thanh_tra')) {
    out.splice(Math.min(2, out.length), 0, ORDERS.find((o) => o.special === 'thanh_tra')!);
    out.length = Math.min(out.length, n + 1);
  }
  const budgetMod = avg >= 4.5 && s.reviews.length >= 5 ? 1.15 : avg > 0 && avg < 2.5 && s.reviews.length >= 5 ? 0.85 : 1;
  return out.map((o, i) => {
    const look = specialLook(o, rng);
    return {
      uid: `${s.day}-${i}-${o.id}`,
      order: o,
      name: look.name,
      color: look.color ?? COLORS[(i * 5 + s.day * 3) % COLORS.length],
      acc: look.acc,
      budget: Math.round(o.budget * budgetMod),
    };
  });
}

export function avgStars(s: SaveState): number {
  const r = s.reviews.slice(-20);
  if (!r.length) return 0;
  return r.reduce((a, b) => a + b.stars, 0) / r.length;
}

export function rentToday(s: SaveState) {
  return econ.rent[Math.min(s.day, econ.rent.length - 1)];
}

export function debtToday(s: SaveState) {
  return s.debts.find((d) => d.day === s.day && !s.debtsPaid.includes(d.day));
}

export function nextDebt(s: SaveState) {
  return s.debts.find((d) => d.day >= s.day && !s.debtsPaid.includes(d.day));
}

/** Giá mua của 1 món với mối hiện tại (sau trả giá). */
export function buyPrice(s: SaveState, vendorId: string, itemId: string): number {
  const def = INGREDIENTS.find((i) => i.id === itemId) ?? BASES.find((b) => b.id === itemId)!;
  const mod = s.priceMods[vendorId] ?? 1;
  return Math.max(1, Math.round(def.price * mod));
}

export function addSuspicion(s: SaveState, amount: number, viewers = 0) {
  if (amount <= 0) {
    s.suspicion = Math.max(0, s.suspicion + amount);
    return 0;
  }
  let a = amount * (1 + viewers / econ.suspicion.liveDiv);
  if (hasUp(s, 'giay_cong_bo')) a *= 0.7;
  s.suspicion = Math.min(120, s.suspicion + a);
  return a;
}
