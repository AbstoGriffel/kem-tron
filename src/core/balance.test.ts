import { describe, expect, it } from 'vitest';
import orders from '../data/orders.json';
import { solve } from './solver';
import type { Target } from './types';

describe('cân bằng đơn hàng', () => {
  for (const o of orders.orders) {
    it(`${o.id}: có ≥2 cách đàng hoàng, budget đủ`, () => {
      const day = Math.max(o.minDay, 2);
      const sols = solve(o.target as Target, { day, honestOnly: true });
      const distinctBases = new Set(sols.map((s) => s.base + ':' + s.items.map((i) => i.id).sort().join(',')));
      const cheapest = sols[0]?.cost ?? Infinity;
      console.log(`${o.id.padEnd(16)} cách=${String(sols.length).padStart(5)} rẻ nhất=${cheapest} budget=${o.budget} ${sols[0] ? sols[0].base + '+' + sols[0].items.map((i) => i.id + (i.proc !== 'raw' ? '/' + i.proc : '')).join('+') : ''}`);
      if (o.special === 'bay') return;
      expect(distinctBases.size).toBeGreaterThanOrEqual(2);
      if (o.budget > 0) expect(cheapest + 2).toBeLessThanOrEqual(o.budget);
    });
  }
});
