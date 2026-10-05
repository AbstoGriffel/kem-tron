import { describe, expect, it } from 'vitest';
import { endDay, newDayLog, startNextDay } from './day';
import { liveEndDay, liveEvent, liveTick, newLive } from './live';
import { mulberry32 } from './rng';
import { addSuspicion, customersForDay, newGame } from './state';

describe('livestream', () => {
  it('drama đẩy mắt xem, im lặng thì nguội', () => {
    const s = newGame(1);
    const l = newLive();
    l.on = true;
    const rng = mulberry32(5);
    liveEvent(l, 60);
    for (let i = 0; i < 20; i++) liveTick(s, l, rng, 200);
    const hot = l.viewers;
    for (let i = 0; i < 80; i++) liveTick(s, l, rng, 200);
    expect(hot).toBeGreaterThan(l.viewers);
    expect(l.peak).toBeGreaterThan(50);
  });
  it('quà không vượt 25% doanh thu', () => {
    const s = newGame(2);
    s.followers = 2000;
    const l = newLive();
    l.on = true;
    const rng = mulberry32(9);
    for (let i = 0; i < 2000; i++) { liveEvent(l, 50); liveTick(s, l, rng, 400); }
    expect(l.giftsToday).toBeLessThanOrEqual(100);
  });
  it('follower tăng có trần mỗi ngày', () => {
    const s = newGame(3);
    const l = newLive();
    l.peak = 99999;
    expect(liveEndDay(s, l)).toBe(60);
  });
});

describe('ngày & vườn & review trễ', () => {
  it('cây được tưới thì lớn và chín; bỏ 2 ngày thì héo', () => {
    const s = newGame(4);
    s.pots[0] = { seed: 'dua_leo', age: 0, watered: true, dry: 0, harvests: 0, ready: false };
    s.pots[1] = { seed: 'ca_chua', age: 0, watered: false, dry: 0, harvests: 0, ready: false };
    const rng = () => 0.99; // không mưa
    startNextDay(s, rng);
    s.pots[0].watered = true;
    startNextDay(s, rng);
    expect(s.pots[0].ready).toBe(true);
    expect(s.pots[1].seed).toBe('heo');
  });
  it('khách dùng hàng dỏm có thể quay lại hoàn tiền', () => {
    const s = newGame(5);
    s.money = 500;
    s.pending.push({ who: 'Chị Tư', color: '#fff', acc: [], chance: 1, paid: 40 });
    const news = startNextDay(s, () => 0.1);
    expect(news.late.length).toBe(1);
    expect(s.money).toBe(472);
    expect(s.reviews[s.reviews.length - 1]?.stars).toBe(1);
  });
  it('nợ: đủ tiền thì trả, thiếu thì khất +10%', () => {
    const s = newGame(6);
    s.day = 5;
    s.money = 100;
    const l = endDay(s, newDayLog(), 0, mulberry32(1));
    expect(l.debt?.paid).toBe(false);
    expect(s.debts[0].day).toBe(7);
    expect(s.debts[0].amount).toBe(330);
  });
  it('nghi ngờ cao → thanh tra cải trang ghé', () => {
    const s = newGame(7);
    s.day = 6;
    addSuspicion(s, 50);
    expect(customersForDay(s).some((c) => c.order.special === 'thanh_tra')).toBe(true);
  });
  it('ngày 1: khách đầu là Mẹ, toàn đơn rõ', () => {
    const c = customersForDay(newGame(8));
    expect(c[0].order.special).toBe('me');
    expect(c.every((x) => x.order.clarity === 1)).toBe(true);
  });
});

describe('lưu giữa ngày', () => {
  it('danh sách khách chụp lại qua JSON y nguyên, kể cả khi trạng thái đổi', () => {
    const s = newGame(11);
    s.day = 6;
    addSuspicion(s, 50);
    const snap = customersForDay(s);
    s.progress = { day: 6, served: 2, log: newDayLog(), peak: 0, customers: snap };
    const back = JSON.parse(JSON.stringify(s));
    back.suspicion = 0;
    expect(back.progress.customers).toEqual(snap);
    expect(customersForDay(back).map((c: { uid: string }) => c.uid)).not.toEqual(snap.map((c) => c.uid));
  });
});
