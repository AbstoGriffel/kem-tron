import text from '../data/text.json';
import type { DayLog, Ledger } from './day';
import type { SaveState } from './state';

/** Huy hiệu (giấy khen) dán trên tường buổi tối. Thuần TS, không DOM. */
export interface Badge {
  id: string;
  name: string;
  day: number;
}

interface BadgeDef {
  id: string;
  name: string;
  check: (s: SaveState, log: DayLog | null, l: Ledger) => boolean;
}

const DEFS: BadgeDef[] = [
  { id: 'sao5_dau', name: 'Đơn 5 Sao Đầu Tiên', check: (_s, log) => !!log?.stars.some((x) => x >= 5) },
  { id: 'no_thau', name: 'Nổ Thau Lần Đầu', check: (s, log) => (log?.exploded ?? 0) > 0 || s.stats.exploded > 0 },
  { id: 'ngay_sach', name: 'Ngày Không Dùng Hàng Sỉ', check: (_s, log) => !!log && log.served > 0 && !log.usedFake },
  { id: 'f100', name: '100 Follower', check: (s) => s.followers >= 100 },
  { id: 'f500', name: '500 Follower', check: (s) => s.followers >= 500 },
  { id: 'hui_1', name: 'Trả Xong Hụi Kỳ 1', check: (s) => s.debtsPaid.length >= 1 },
  { id: 'hui_2', name: 'Sạch Nợ Chị Bảy', check: (s) => s.debtsPaid.length >= 2 },
  { id: 'khach_50', name: 'Khách Thứ 50', check: (s) => s.stats.served >= 50 },
  { id: 'lai_dam', name: 'Ngày Lãi Đậm', check: (_s, _log, l) => l.net >= 200 },
  { id: 'hop_1000', name: '1000k Trong Hộp Bánh Quy', check: (s) => s.money >= 1000 },
];

/** Huy hiệu sự kiện (không suy ra được từ sổ) — cấp tại chỗ bằng grantBadge. */
export const EVENT_BADGES: Record<string, string> = {
  thoat_qltt: 'Thoát QLTT',
  chem_gio: 'Chém Gió Qua Ải',
};

function push(s: SaveState, id: string, name: string, out: Badge[]) {
  s.badges ??= [];
  if (s.badges.some((b) => b.id === id)) return;
  const b = { id, name, day: s.day };
  s.badges.push(b);
  out.push(b);
}

/** Cấp 1 huy hiệu sự kiện (vd thoát QLTT). Trả về huy hiệu nếu mới. */
export function grantBadge(s: SaveState, id: keyof typeof EVENT_BADGES | string): Badge | null {
  const out: Badge[] = [];
  push(s, id, EVENT_BADGES[id] ?? id, out);
  return out[0] ?? null;
}

/** Danh hiệu ngày theo sao trung bình (giống sổ chi tiêu). */
export function dayTitle(log: DayLog | null): string {
  if (!log || !log.stars.length) return '';
  const avg = log.stars.reduce((a, b) => a + b, 0) / log.stars.length;
  return text.titles.find((t) => avg >= t.min)?.text ?? '';
}

/** Xét huy hiệu cuối ngày: trả về huy hiệu MỚI (đã push vào s.badges). Idempotent. */
export function awardBadges(s: SaveState, log: DayLog | null, l: Ledger): Badge[] {
  const out: Badge[] = [];
  for (const d of DEFS) if (d.check(s, log, l)) push(s, d.id, d.name, out);
  const t = dayTitle(log);
  if (t) push(s, `title:${t}`, t, out);
  return out;
}
