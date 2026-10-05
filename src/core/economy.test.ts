import { describe, expect, it } from 'vitest';
import { endDay, newDayLog, startNextDay } from './day';
import { computeMix } from './mix';
import { serve } from './serve';
import { solve } from './solver';
import { customersForDay, dayRng, newGame, type SaveState } from './state';

/** Bot trung thực: mỗi đơn chọn cách rẻ nhất đàng hoàng, mua đúng hàng cần, hũ nhựa + nhãn hợp gu nếu rẻ. */
function playHonest(seed: number, fake = false) {
  const s: SaveState = newGame(seed);
  const traj: number[] = [];
  const sus: number[] = [];
  const solCache = new Map<string, ReturnType<typeof solve>>();
  for (let d = 1; d <= 10; d++) {
    const log = newDayLog();
    const rng = dayRng(s, 'bot');
    for (const c of customersForDay(s)) {
      const key = c.order.id + ':' + s.day + ':' + fake;
      let sols = solCache.get(key);
      if (!sols) { sols = solve(c.order.target, { day: s.day, honestOnly: !fake, maxParts: 4 }); solCache.set(key, sols); }
      const pickSol = sols[0];
      if (!pickSol) continue;
      // mua đúng hàng (giá niêm yết, không trả giá)
      const mix = computeMix(pickSol.base, pickSol.items, false, false);
      s.money -= mix.cost + 2;
      log.ingredientSpend += mix.cost;
      const out = serve(s, { customer: c, mix, items: pickSol.items, baseId: pickSol.base, jar: 'nhua', label: 'viet_tay', askedClear: false, viewers: 0, garden: false }, rng);
      log.sales += out.paid; log.tips += out.tip; log.served++; log.stars.push(out.score.stars);
      if (mix.fakeCount) log.usedFake = true;
    }
    endDay(s, log, 0, dayRng(s, 'end'));
    traj.push(Math.round(s.money));
    sus.push(s.suspicion);
    startNextDay(s, dayRng(s, 'morning'));
  }
  return { s, traj, sus };
}

describe('kinh tế 10 ngày', () => {
  it('lối trung thực trả được 2 kỳ hụi', () => {
    const res = [1, 2, 3, 4, 5].map((seed) => playHonest(seed));
    for (const r of res) console.log('trung thực', r.traj.join(' → '), 'đã trả', r.s.debtsPaid.join(','), 'nghi ngờ', Math.round(r.s.suspicion));
    expect(res.filter((r) => r.s.debtsPaid.length === 2).length).toBeGreaterThanOrEqual(4);
  }, 300000);
  it('lối tham (rẻ nhất, kể cả hàng sỉ) lời hơn giữa game nhưng nghi ngờ vượt 60 trước ngày 8', () => {
    const honest = [1, 2, 3].map((seed) => playHonest(seed));
    const greedy = [1, 2, 3].map((seed) => playHonest(seed, true));
    for (const r of honest) console.log('HONEST', r.traj.join(' → '));
    for (const r of greedy) console.log('tham', r.traj.join(' → '), 'nghi ngờ/ngày', r.sus.map(Math.round).join(','));
    for (let i = 0; i < 3; i++) expect(greedy[i].traj[4]).toBeGreaterThan(honest[i].traj[4]);
    const avg = (rs: { traj: number[] }[]) => rs.reduce((a, r) => a + r.traj[4] + r.traj[5] + r.traj[6], 0);
    expect(avg(greedy)).toBeGreaterThan(avg(honest));
    for (const r of greedy) expect(r.sus.slice(0, 7).some((x) => x >= 60)).toBe(true);
  }, 300000);
});
