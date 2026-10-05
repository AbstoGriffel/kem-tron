import { RULES } from './db';
import { STAT_KEYS, type MixResult, type Stats, type Target } from './types';

export interface ScoreInput {
  stats: Stats;
  target: Target;
  /** gói đúng gu khách */
  packMatch: boolean;
  /** khách đã bắt nói rõ ("Hả em?") */
  askedClear?: boolean;
}

export interface ScoreResult {
  stars: number;
  miss: Partial<Record<keyof Stats, number>>;
  docPenalty: 'none' | 'rat' | 'kich_ung';
  /** hệ số tiền nhận: 1 = đủ budget */
  payRatio: number;
  tipRatio: number;
  refund: 'none' | 'half' | 'full';
}

export function distToRange(v: number, [lo, hi]: [number, number]) {
  return v < lo ? lo - v : v > hi ? v - hi : 0;
}

export function scoreMix({ stats, target, packMatch, askedClear }: ScoreInput): ScoreResult {
  const miss: ScoreResult['miss'] = {};
  let dev = 0;
  for (const k of STAT_KEYS) {
    const r = target[k];
    if (!r) continue;
    const d = distToRange(stats[k], r);
    if (d) miss[k] = stats[k] < r[0] ? -d : d;
    dev += d;
  }
  let stars = 5 - dev;
  let docPenalty: ScoreResult['docPenalty'] = 'none';
  const maxDoc = target.maxDoc ?? 9;
  if (stats.d >= 10 || stats.d > maxDoc) {
    docPenalty = 'kich_ung';
    stars = Math.min(stars, 1);
  } else if (stats.d >= 6) {
    docPenalty = 'rat';
    stars -= 0.5;
  }
  if (packMatch && docPenalty !== 'kich_ung') stars += 0.5;
  stars = Math.max(0, Math.min(5, Math.round(stars * 2) / 2));

  let payRatio = 1, tipRatio = 0;
  let refund: ScoreResult['refund'] = 'none';
  if (stars >= 5) tipRatio = 0.2;
  else if (stars >= 4) tipRatio = 0.1;
  if (stars <= 1) { payRatio = 0; refund = 'full'; }
  else if (stars < 3) { payRatio = 0.5; refund = 'half'; }
  if (askedClear) tipRatio = 0;
  void RULES;
  return { stars, miss, docPenalty, payRatio, tipRatio, refund };
}

export function inTarget(stats: Stats, target: Target): boolean {
  for (const k of STAT_KEYS) {
    const r = target[k];
    if (r && distToRange(stats[k], r)) return false;
  }
  return stats.d <= (target.maxDoc ?? 9);
}

export type { MixResult };
