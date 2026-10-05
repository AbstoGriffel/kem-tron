import text from '../data/text.json';
import { ing } from './db';
import { pick, type Rng } from './rng';
import { scoreMix, type ScoreResult } from './score';
import { addSuspicion, ECON, GUS, LABELS, type Customer, type SaveState } from './state';
import type { BowlItem, MixResult } from './types';

export const TEXT = text;

export interface ServeInput {
  customer: Customer;
  mix: MixResult;
  items: BowlItem[];
  baseId: string;
  jar: string;
  label: string;
  askedClear: boolean;
  viewers: number;
  /** nguyên liệu nhà trồng có mặt */
  garden: boolean;
  /** làm quá lâu → khách bớt boa */
  slow?: boolean;
}

export interface ServeOutcome {
  score: ScoreResult;
  paid: number;
  tip: number;
  refund: number;
  suspicion: number;
  expr: 'ecstatic' | 'happy' | 'meh' | 'disgust' | 'sick' | 'angry' | 'glow';
  line: string;
  missLine?: string;
  review: { stars: number; text: string };
  caughtByInspector: boolean;
  packMatch: boolean;
}

/** Áp kết quả giao hàng vào save. Thuần với rng truyền vào. */
export function serve(s: SaveState, inp: ServeInput, rng: Rng): ServeOutcome {
  const { customer: c, mix } = inp;
  const gu = GUS[c.order.gu];
  const packMatch = !!gu && gu.jars.includes(inp.jar) && gu.labels.includes(inp.label);
  const score = scoreMix({ stats: mix.stats, target: c.order.target, packMatch, askedClear: inp.askedClear });
  const isMe = c.order.special === 'me';

  // tiền
  const budget = isMe ? 0 : c.budget;
  const paid = Math.round(budget * score.payRatio);
  const tip = Math.round(budget * score.tipRatio * (inp.slow ? 0.5 : 1));
  const refund = budget - paid;
  s.money += paid + tip;
  s.stats.earned += paid + tip;

  // nghi ngờ
  let sus = 0;
  const label = LABELS.find((l) => l.id === inp.label);
  if (mix.fakeCount > 0) {
    const greed = budget / Math.max(1, mix.cost);
    let base = mix.suspicion;
    if (greed >= ECON.suspicion.greedRatio) base *= ECON.suspicion.greedMult;
    sus += base;
    s.stats.fakeServed++;
  }
  if (label?.suspicion) sus += label.suspicion;
  if (label?.natureClaim && mix.stats.d > 5) sus += 4;
  if (score.stars <= 1) sus += mix.fakeCount ? ECON.suspicion.oneStarFake : ECON.suspicion.oneStar;
  if (score.refund !== 'none') sus += ECON.suspicion.refund;
  const caughtByInspector = c.order.special === 'thanh_tra' && mix.fakeCount > 0;
  if (caughtByInspector) sus += 60;
  let susDelta = sus > 0 ? addSuspicion(s, sus, inp.viewers) : 0;
  if (score.stars >= 5 && inp.garden && mix.fakeCount === 0) {
    addSuspicion(s, ECON.suspicion.fiveStarGarden);
    susDelta += ECON.suspicion.fiveStarGarden;
  }

  // review
  const st = Math.max(1, Math.round(score.stars));
  const key = score.docPenalty === 'kich_ung' ? 'toxic' : st >= 5 ? 'great' : st >= 4 ? 'ok' : st >= 3 ? 'meh' : 'bad';
  // review khớp lỗi thật: lệch chỉ số nào thì chê đúng chỗ đó; hàng sỉ đẹp mà rát thì khen kiểu lo lo
  const worstMiss = Object.entries(score.miss).sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))[0];
  const missKey = worstMiss ? `${worstMiss[0]}${worstMiss[1]! > 0 ? '+' : '-'}` : '';
  const R = TEXT.reviews as unknown as Record<string, string[] | Record<string, string[]>>;
  let pool: string[];
  if (key === 'toxic') pool = R.toxic as string[];
  else if (st < 4 && missKey && (R.miss as Record<string, string[]>)[missKey]) pool = (R.miss as Record<string, string[]>)[missKey];
  else if (st >= 4 && (mix.fakeCount > 0 || mix.stats.d >= 6)) pool = R.great_fake as string[];
  else pool = R[key] as string[];
  const review = { stars: Math.max(1, Math.round(score.stars * 2) / 2), text: pick(rng, pool) };
  if (!isMe) s.reviews.push({ day: s.day, stars: review.stars, text: review.text, who: c.name });

  // tác dụng phụ trễ từ hàng dỏm
  if (mix.sideEffect > 0 && !isMe && score.stars >= 2) {
    s.pending.push({ who: c.name, color: c.color, acc: c.acc, chance: Math.min(0.9, mix.sideEffect * 0.07), paid: paid + tip });
  }

  s.stats.served++;
  s.stats.stars += score.stars;

  // biểu cảm + câu nói
  const bright = mix.stats.t >= 8;
  let expr: ServeOutcome['expr'];
  if (score.docPenalty === 'kich_ung') expr = 'sick';
  else if (score.stars >= 5) expr = bright ? 'glow' : 'ecstatic';
  else if (score.stars >= 4) expr = 'happy';
  else if (score.stars >= 3) expr = 'meh';
  else if (score.stars >= 2) expr = 'disgust';
  else expr = 'angry';
  const rk = String(Math.max(1, Math.min(5, Math.round(score.stars)))) as keyof typeof TEXT.react;
  let line = pick(rng, TEXT.react[rk]);
  if (isMe) line = score.stars >= 4 ? 'Con mẹ giỏi quá! Mẹ khoe cả xóm!' : score.stars >= 3 ? 'Cũng được, con tập thêm nha.' : 'Trời đất, mẹ đi đám giỗ kiểu gì đây?!';
  if (caughtByInspector) line = 'Hàng không nhãn mác hả em? Anh là bên Quản Lý Thị Trường nè.';
  let missLine: string | undefined;
  const worst = Object.entries(score.miss).sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))[0];
  if (worst && !caughtByInspector) missLine = TEXT.missLines[`${worst[0]}${worst[1]! > 0 ? '+' : '-'}` as keyof typeof TEXT.missLines];

  return { score, paid, tip, refund, suspicion: susDelta, expr, line, missLine, review, caughtByInspector, packMatch };
}

export const usesGarden = (items: BowlItem[]) => items.some((i) => ing(i.id).source === 'vuon');
