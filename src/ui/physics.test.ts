import { describe, expect, it } from 'vitest';
import { BASES, INGREDIENTS } from '../core/db';
import { computeMix } from '../core/mix';
import type { BowlItem, Proc } from '../core/types';
import { physicsSvg, type Physics } from './bowlView';

/** T30: quét mọi mẻ (cốt × tới 4 món, có chế biến, có/không đun) → hình trạng thái vật lý luôn hợp lệ và nằm trong thau. */
describe('T30 trạng thái vật lý — mọi tổ hợp', () => {
  const X = 188, Y = 373, RX = 98, RY = 33;
  const variants: BowlItem[] = [];
  for (const it of INGREDIENTS) for (const p of ['raw', ...it.process] as Proc[]) variants.push({ id: it.id, proc: p });
  const seen = new Map<string, Physics>();
  let mixes = 0;
  for (const b of BASES) {
    const cur: BowlItem[] = [];
    const rec = (start: number) => {
      for (const heat of [false, true]) {
        const m = computeMix(b.id, cur, heat, false);
        mixes++;
        const has = (id: string) => cur.some((i) => i.id === id);
        const p: Physics = { t: m.stats.t, m: m.stats.m, n: m.stats.n, k: m.stats.k, d: m.stats.d, kRaw: m.raw.k, split: m.overused.length > 0, curd: has('chanh') && has('trung'), foam: m.combos.some((c) => c.fx === 'nui_lua') || m.fakeClash, steam: heat };
        const lvl = (v: number, a: number, b2: number, c: number) => (v >= c ? 3 : v >= b2 ? 2 : v >= a ? 1 : 0);
        const key = [p.t <= 1 ? -1 : lvl(p.t, 2, 6, 9), lvl(p.m, 2, 5, 8), lvl(p.n, 2, 5, 8), (p.kRaw ?? 0) <= 0 ? -1 : lvl(p.k, 1, 5, 8), p.d >= 15 ? 4 : p.d >= 10 ? 3 : p.d >= 6 ? 2 : p.d >= 1 ? 1 : 0, +!!p.split, +!!p.curd, +!!p.foam, +!!p.steam].join(',');
        if (!seen.has(key)) seen.set(key, p);
      }
      if (cur.length >= 4) return;
      for (let i = start; i < variants.length; i++) { cur.push(variants[i]); rec(i); cur.pop(); }
    };
    rec(0);
  }

  it(`đủ ${'các'} trạng thái khác nhau`, () => {
    console.log(`T30: ${mixes} mẻ → ${seen.size} trạng thái hình khác nhau`);
    expect(seen.size).toBeGreaterThan(200);
  });

  it('không NaN / undefined, số phần tử có trần, mọi chấm nằm trong lòng thau', () => {
    for (const [key, p] of seen) {
      const r = physicsSvg(p, X, Y, RX, RY);
      const all = r.in + r.up;
      expect(all, key).not.toMatch(/NaN|undefined|Infinity/);
      const n = (all.match(/<(circle|ellipse|path)/g) ?? []).length;
      expect(n, key).toBeLessThan(170);
      for (const mm of r.in.matchAll(/<circle[^>]*cx="([\d.-]+)" cy="([\d.-]+)"/g)) {
        const x = +mm[1], y = +mm[2];
        expect(((x - X) / RX) ** 2 + ((y - Y) / RY) ** 2, key).toBeLessThan(1.05);
      }
      // phần nhô lên (chóp, khói, hơi) không vượt quá 70 px trên mặt kem và không lấn ra ngoài vành thau
      for (const mm of r.up.matchAll(/M ([\d.-]+) ([\d.-]+)/g)) {
        expect(+mm[1], key).toBeGreaterThan(X - RX - 20);
        expect(+mm[1], key).toBeLessThan(X + RX + 20);
        expect(+mm[2], key).toBeGreaterThan(Y - 70);
      }
    }
  });
});
