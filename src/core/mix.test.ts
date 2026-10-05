import { describe, expect, it } from 'vitest';
import { computeMix, processedStats } from './mix';
import { scoreMix } from './score';

describe('computeMix', () => {
  it('cộng cốt + nguyên liệu, kẹp 0–10', () => {
    const r = computeMix('kem_tron', [{ id: 'chanh', proc: 'raw' }]);
    expect(r.stats).toMatchObject({ t: 3, m: 1, n: 0, k: 4, d: 5 });
    expect(r.cost).toBe(19);
  });
  it('thứ tự không quan trọng', () => {
    const a = computeMix('sap_ne', [{ id: 'chanh', proc: 'raw' }, { id: 'dua_leo', proc: 'xay' }], false, false);
    const b = computeMix('sap_ne', [{ id: 'dua_leo', proc: 'xay' }, { id: 'chanh', proc: 'raw' }], false, false);
    expect(a.stats).toEqual(b.stats);
  });
  it('nghiền ×1,5 chỉ số mạnh nhất, xay xoá âm +1 mịn, override', () => {
    expect(processedStats('chanh', 'nghien').t).toBe(3);
    expect(processedStats('dua_leo', 'xay')).toMatchObject({ m: 3, k: 0 });
    expect(processedStats('nha_dam', 'xay')).toMatchObject({ m: 3, k: 0, d: 1 });
  });
  it('combo núi lửa + combo bà ngoại', () => {
    const r = computeMix('kem_tron', [{ id: 'chanh', proc: 'raw' }, { id: 'kem_danh_rang', proc: 'raw' }]);
    expect(r.combos.map((c) => c.fx)).toContain('nui_lua');
    expect(r.stats.d).toBe(5 + 5 + 8);
    expect(r.ruined).toBe(true);
    const g = computeMix('kem_tron', [{ id: 'chanh', proc: 'raw' }, { id: 'mat_ong', proc: 'raw' }]);
    expect(g.stats.d).toBe(2);
  });
  it('quá tay tăng dần', () => {
    const three = computeMix('sap_ne', Array(3).fill({ id: 'nuoc_vo_gao', proc: 'raw' }), false, false);
    const four = computeMix('sap_ne', Array(4).fill({ id: 'nuoc_vo_gao', proc: 'raw' }), false, false);
    expect(three.stats.d).toBe(3);
    expect(four.stats.d).toBe(6);
  });
  it('hai món dỏm cắn nhau, đun chia đôi độc + mất che nắng', () => {
    const r = computeMix('kem_tron', [{ id: 'bot_trang_dom', proc: 'raw' }, { id: 'collagen_dom', proc: 'raw' }], false, false);
    expect(r.fakeClash).toBe(true);
    expect(r.stats.d).toBe(5 + 4 + 6);
    const h = computeMix('kem_tron', [{ id: 'chanh', proc: 'raw' }, { id: 'kcn_xin', proc: 'raw' }], true, false);
    expect(h.stats.n).toBe(0);
    expect(h.stats.d).toBe(3);
  });
  it('trứng đun thành trứng chiên', () => {
    const h = computeMix('kem_tron', [{ id: 'trung', proc: 'raw' }], true, false);
    expect(h.stats.d).toBe(1 + 10);
  });
  it('màu: vàng + xanh dương ra xanh lá kiểu sơn', () => {
    const r = computeMix('kem_tron', [{ id: 'nghe', proc: 'raw' }, { id: 'kem_danh_rang', proc: 'raw' }]);
    expect(r.color).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe('scoreMix', () => {
  it('đúng vùng + gói đúng gu = 5 sao', () => {
    const s = scoreMix({ stats: { t: 5, m: 0, n: 0, k: 0, d: 0 }, target: { t: [4, 6] }, packMatch: true });
    expect(s.stars).toBe(5);
    expect(s.tipRatio).toBe(0.2);
  });
  it('lệch 2 nấc = 3 sao, độc rát −0,5', () => {
    const s = scoreMix({ stats: { t: 8, m: 0, n: 0, k: 0, d: 7 }, target: { t: [4, 6] }, packMatch: false });
    expect(s.stars).toBe(2.5);
    expect(s.refund).toBe('half');
  });
  it('vượt độc khách nhạy cảm = 1 sao hoàn tiền', () => {
    const s = scoreMix({ stats: { t: 8, m: 0, n: 0, k: 0, d: 4 }, target: { t: [7, 9], maxDoc: 3 }, packMatch: true });
    expect(s.stars).toBe(1);
    expect(s.refund).toBe('full');
  });
});
