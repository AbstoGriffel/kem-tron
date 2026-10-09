import { describe, expect, it } from 'vitest';
import { simulate, type PlayerKind } from './sim';

const KINDS: PlayerKind[] = ['gioi', 'moi', 'si'];
const SEEDS = [1, 2, 3, 4, 5];

describe('T02 mô phỏng 10 ngày theo kiểu người chơi', () => {
  const res = KINDS.flatMap((k) => SEEDS.map((sd) => simulate(k, sd)));
  it('in bảng', () => {
    for (const r of res) console.log(`SIM ${r.kind.padEnd(4)} seed ${r.seed} | ${r.days.map((d) => `${d.money}${d.lossOrders ? `(${d.lossOrders}lỗ)` : ''}`).join(' → ')} | hụi ${r.debtsPaid}/2 | nghi ${r.suspicion}${r.bankrupt ? ' | VỠ NỢ' : ''}`);
    expect(res.length).toBe(15);
  });
  it('người chơi giỏi trả đủ 2 kỳ hụi', () => {
    expect(res.filter((r) => r.kind === 'gioi' && r.debtsPaid === 2).length).toBeGreaterThanOrEqual(4);
  });
  it('người mới không vỡ nợ, và không lỗ trước ngày 3', () => {
    for (const r of res.filter((x) => x.kind === 'moi')) {
      expect(r.bankrupt).toBe(false);
      expect(r.days[0].money).toBeGreaterThan(100);
    }
  });
  it('ngày 1 phục vụ đủ khách bằng hàng đầu game, sang ngày 2 vẫn còn dư', () => {
    for (const r of res.filter((x) => x.kind === 'gioi')) expect(r.days[0].refused).toBe(0);
  });
}, 600000);
