import { mixColors } from './color';
import { base as getBase, COMBOS, ing, RULES } from './db';
import { STAT_KEYS, type BowlItem, type Combo, type MixResult, type Proc, type Stats } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const emptyStats = (): Stats => ({ t: 0, m: 0, n: 0, k: 0, d: 0 });

/** Chỉ số của 1 phần nguyên liệu sau chế biến. */
export function processedStats(id: string, proc: Proc): Stats {
  const it = ing(id);
  const s: Stats = { ...it.stats };
  if (proc === 'raw') return s;
  if (proc === 'nghien') {
    // chỉ số dương mạnh nhất ×1,5 (làm tròn lên); hoà thì lấy chỉ số đứng trước
    let best: keyof Stats | null = null;
    for (const k of STAT_KEYS) if (s[k] > 0 && (best === null || s[k] > s[best])) best = k;
    if (best) s[best] = Math.ceil(s[best] * 1.5);
  } else if (proc === 'xay') {
    for (const k of STAT_KEYS) if (s[k] < 0) s[k] = 0;
    s.m += 1;
  }
  const ov = it.override?.[proc];
  if (ov) Object.assign(s, ov);
  return s;
}

export function canProcess(id: string, proc: Proc): boolean {
  return proc === 'raw' || ing(id).process.includes(proc);
}

/**
 * Tính mẻ kem. Hàm thuần: gọi lại mỗi lần thả/bỏ → hoàn tác miễn phí.
 * heated = đã vặn bếp đun (không hoàn tác).
 */
export function computeMix(baseId: string, items: BowlItem[], heated = false, withColor = true): MixResult {
  const b = getBase(baseId);
  const st: Stats = { ...b.stats };
  let cost = b.price;
  let suspicion = b.suspicion ?? 0;
  let sideEffect = b.sideEffect ?? 0;
  let fakeCount = b.fake ? 1 : 0;
  const counts = new Map<string, number>();

  for (const it of items) {
    const s = processedStats(it.id, it.proc);
    for (const k of STAT_KEYS) st[k] += s[k];
    st.d += s.d;
    const def = ing(it.id);
    cost += def.price;
    if (def.fake) {
      fakeCount++;
      suspicion += def.suspicion ?? 0;
      sideEffect += def.sideEffect ?? 0;
    }
    counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
  }

  const present = new Set(counts.keys());
  const combos: Combo[] = [];
  for (const c of COMBOS) {
    if (c.ids.every((id) => present.has(id))) {
      combos.push(c);
      st.d += c.d ?? 0;
      st.m += c.m ?? 0;
    }
  }
  const overused = [...counts].filter(([, n]) => n >= RULES.overuseCount).map(([id]) => id);
  // ≥3 phần cùng món: +3 độc, mỗi phần thêm +3 nữa
  for (const id of overused) st.d += (counts.get(id)! - RULES.overuseCount + 1) * RULES.overuseDoc;
  // hai món sỉ khác nhau cắn nhau (cốt hàng thùng không tính)
  const distinctFakes = [...present].filter((id) => ing(id).fake).length;
  const fakeClash = distinctFakes >= 2;
  if (fakeClash) st.d += RULES.fakeClashDoc;

  if (heated) {
    st.d = Math.floor(st.d / RULES.heatDocDivisor);
    st.n = 0;
    for (const it of items) st.d += ing(it.id).heatExtraDoc ?? 0;
  }

  for (const k of STAT_KEYS) st[k] = clamp(st[k], 0, RULES.statMax);
  const rawDoc = Math.max(0, st.d);
  st.d = rawDoc;

  const color = !withColor ? '' : mixColors([
    { hex: b.color, w: 2 },
    ...[...counts].map(([id, n]) => ({ hex: ing(id).color, w: n })),
  ]);

  return {
    stats: st,
    rawDoc,
    combos,
    overused,
    fakeClash,
    fakeCount,
    sideEffect,
    suspicion,
    cost,
    color,
    full: items.length >= b.capacity,
    ruined: rawDoc >= RULES.docMax,
  };
}
