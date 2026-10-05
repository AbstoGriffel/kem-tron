import { ECON, hasUp, type SaveState } from './state';
import type { Rng } from './rng';

const L = ECON.live;

export interface LiveState {
  on: boolean;
  hype: number;
  viewers: number;
  peak: number;
  sinceEvent: number;
  giftsToday: number;
  hearts: number;
  pitchTimer: number;
}

export const newLive = (): LiveState => ({ on: false, hype: 0, viewers: 0, peak: 0, sinceEvent: 0, giftsToday: 0, hearts: 0, pitchTimer: 0 });

export interface LiveTickOut {
  gift?: { id: string; name: string; value: number };
  bored?: boolean;
  pitch?: boolean;
}

/** Bước 0,5 s. salesToday dùng cho trần quà 25%. */
export function liveTick(s: SaveState, l: LiveState, rng: Rng, salesToday: number): LiveTickOut {
  const out: LiveTickOut = {};
  if (!l.on) {
    l.viewers += (0 - l.viewers) * 0.3;
    l.hype = Math.max(0, l.hype - 4);
    return out;
  }
  l.sinceEvent += 0.5;
  const bored = l.sinceEvent > L.boredAfter;
  l.hype = Math.max(0, l.hype - (bored ? L.boredDecay : L.decay));
  if (bored && rng() < 0.12) out.bored = true;
  const F = s.followers;
  let target = F * L.viewerFollow + l.hype * (L.viewerHypeBase + F * L.viewerHypeFollow);
  if (hasUp(s, 'ring')) target *= 1.3;
  l.viewers += (target - l.viewers) * 0.15;
  l.peak = Math.max(l.peak, l.viewers);
  l.hearts += l.viewers * 0.01;
  // quà, có trần theo doanh thu
  const cap = Math.max(6, salesToday * L.giftCapRatio);
  if (l.giftsToday < cap && rng() < l.viewers / L.giftChanceDiv) {
    const total = L.gifts.reduce((a, g) => a + g.w, 0);
    let r = rng() * total;
    const g = L.gifts.find((x) => (r -= x.w) < 0) ?? L.gifts[0];
    const value = Math.min(g.value, Math.max(1, Math.round(cap - l.giftsToday)));
    l.giftsToday += value;
    s.money += value;
    out.gift = { id: g.id, name: g.name, value };
  }
  l.pitchTimer += 0.5;
  if (l.pitchTimer >= L.pitchEvery) {
    l.pitchTimer = 0;
    out.pitch = true;
  }
  return out;
}

export function liveEvent(l: LiveState, hype: number) {
  if (!l.on) return;
  l.hype = Math.min(100, l.hype + hype);
  l.sinceEvent = 0;
}

/** Hết ngày: follower tăng theo đỉnh mắt xem. */
export function liveEndDay(s: SaveState, l: LiveState) {
  const gain = Math.min(L.followCapDay, Math.round(l.peak * L.followGain));
  s.followers += gain;
  return gain;
}
