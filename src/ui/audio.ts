import { ZZFX } from '../vendor/zzfx.js';
import { loadJSON, saveJSON } from '../core/storage';
import { music } from './music';

/** Âm thanh procedural (ZzFX). Tham số: [vol, rand, freq, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeat, noise, mod, bitCrush, delay, sustainVol, decay, tremolo] */
const SFX: Record<string, number[]> = {
  pick: [0.5, 0.05, 620, 0, 0.01, 0.05, 0, 1.5, 22],
  plop: [0.9, 0.1, 170, 0.01, 0.03, 0.16, 0, 2, -9, 0, 0, 0, 0, 0.1],
  splash: [0.5, 0.2, 300, 0, 0.02, 0.2, 4, 1, 0, 0, 0, 0, 0, 0.6],
  unplop: [0.5, 0.05, 380, 0, 0.02, 0.09, 0, 1, 30],
  pop: [0.6, 0.1, 900, 0, 0.01, 0.04, 0, 2, -40],
  tick: [0.4, 0, 1400, 0, 0.005, 0.02, 1],
  thud: [0.8, 0.2, 90, 0, 0.03, 0.12, 4, 1, -2, 0, 0, 0, 0, 0.4],
  grind: [0.5, 0.3, 120, 0, 0.04, 0.08, 4, 1],
  blend: [0.25, 0.2, 80, 0.02, 0.2, 0.05, 2, 1, 0, 0, 0, 0, 0.03, 0.6, 0, 0.2],
  stir: [0.22, 0.25, 260, 0.02, 0.05, 0.1, 0, 1, 4, 0, 0, 0, 0, 0.3],
  done: [0.7, 0, 520, 0.01, 0.12, 0.25, 1, 1.4, 0, 0, 260, 0.08],
  warn: [0.5, 0, 880, 0, 0.02, 0.05, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0.2],
  siren: [0.5, 0, 520, 0.02, 0.4, 0.2, 2, 1, 0, 0, 0, 0, 0.12, 0, 22],
  boom: [1.4, 0.2, 60, 0.01, 0.2, 0.7, 4, 1.6, -1, 0, 0, 0, 0, 1.2, 0, 0.4],
  coin: [0.5, 0.02, 1500, 0, 0.02, 0.12, 1, 1.6, 0, 0, 700, 0.03],
  cashout: [0.6, 0, 300, 0.01, 0.06, 0.3, 2, 1, -6],
  star: [0.5, 0, 1100, 0, 0.04, 0.2, 0, 1.2, 0, 0, 400, 0.06],
  starBad: [0.6, 0.1, 160, 0, 0.05, 0.2, 4, 1, -4],
  glass: [0.6, 0.4, 1800, 0, 0.02, 0.3, 4, 1, 0, 0, 0, 0, 0.02, 0.8],
  ding: [0.5, 0, 1320, 0, 0.05, 0.4, 0, 1.3],
  heart: [0.25, 0.1, 1000, 0, 0.01, 0.06, 0, 2, 30],
  gift: [0.6, 0, 700, 0.01, 0.1, 0.3, 0, 1.4, 0, 0, 350, 0.05, 0.1],
  fire: [0.4, 0.4, 70, 0.05, 0.3, 0.2, 4, 1, 0, 0, 0, 0, 0, 1],
  phoneRing: [0.4, 0, 900, 0, 0.12, 0.05, 0, 1, 0, 0, 0, 0, 0.08, 0, 30],
  hangup: [0.5, 0, 420, 0, 0.12, 0.05, 1, 1, 0, 0, 0, 0, 0.18],
  knock: [0.9, 0.1, 110, 0, 0.02, 0.06, 4, 2, 0, 0, 0, 0, 0.14, 0.3],
  click: [0.4, 0, 700, 0, 0.005, 0.02, 1, 1],
  slap: [0.7, 0.2, 240, 0, 0.01, 0.07, 4, 1, -20],
  sizzle: [0.25, 0.5, 2000, 0.05, 0.3, 0.2, 4, 1, 0, 0, 0, 0, 0, 1],
  bubble: [0.35, 0.2, 400, 0, 0.01, 0.05, 0, 1, 40],
  meow: [0.5, 0.05, 700, 0.03, 0.15, 0.2, 0, 1, -8, 0.5],
  angry: [0.6, 0.1, 140, 0.01, 0.12, 0.15, 2, 1, 0, 0, 0, 0, 0.05],
  happy: [0.5, 0, 660, 0, 0.06, 0.15, 0, 1, 0, 0, 220, 0.05, 0.1],
};

let muted = loadJSON('kem-tron.muted', false);
let unlocked = false;

export function unlockAudio() {
  if (unlocked) return;
  try {
    const ctx = ZZFX.audioContext as AudioContext;
    if (ctx.state !== 'running') void ctx.resume();
    unlocked = true;
    music.setEnabled(!muted && loadJSON('kem-tron.music', true));
  } catch {
    /* không có Web Audio */
  }
}

export function sfx(name: keyof typeof SFX | string, opts: { pitch?: number; vol?: number } = {}) {
  if (muted || !unlocked) return;
  if (name === 'grind') return grindSound(opts.pitch ?? 1);
  if (name === 'knock') return knockSound(2);
  const p = SFX[name];
  if (!p) return;
  try {
    const params = p.slice();
    if (opts.pitch) params[2] = (params[2] ?? 220) * opts.pitch;
    if (opts.vol) params[0] = (params[0] ?? 1) * opts.vol;
    ZZFX.play(...params);
  } catch {
    /* bỏ qua */
  }
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  music.setEnabled(!m && loadJSON('kem-tron.music', true));
  saveJSON('kem-tron.muted', m);
}

export function buzz(p: number | number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* iOS không có */
  }
}

// ---------------------------------------------------------------- âm tổng hợp riêng (thay ZzFX cho tiếng vật lý)
function ctx(): AudioContext | null {
  try {
    return ZZFX.audioContext as AudioContext;
  } catch {
    return null;
  }
}

function noiseBuf(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function env(c: AudioContext, t: number, peak: number, a: number, d: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(c.destination);
  return g;
}

/** "Cộc cộc" gõ cửa: thùm bass + tiếng gỗ đanh. */
export function knockSound(times = 2) {
  if (muted || !unlocked) return;
  const c = ctx();
  if (!c) return;
  for (let i = 0; i < times; i++) {
    const t = c.currentTime + i * 0.16;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.14);
    o.connect(env(c, t, 0.9, 0.003, 0.16));
    o.start(t);
    o.stop(t + 0.2);
    const n = c.createBufferSource();
    n.buffer = noiseBuf(c, 0.06);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 3;
    n.connect(bp).connect(env(c, t, 0.5, 0.001, 0.05));
    n.start(t);
  }
}

/** "Cộp / cạch" giã cối: đá chạm đá. */
export function grindSound(pitch = 1) {
  if (muted || !unlocked) return;
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(260 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.07);
  o.connect(env(c, t, 0.7, 0.002, 0.08));
  o.start(t);
  o.stop(t + 0.1);
  const n = c.createBufferSource();
  n.buffer = noiseBuf(c, 0.04);
  const hp = c.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.value = 2600 * pitch;
  hp.Q.value = 2;
  n.connect(hp).connect(env(c, t, 0.45, 0.001, 0.03));
  n.start(t);
}

/** Máy xay "rè rè" chạy liên tục — trả về hàm cập nhật độ gằn và hàm dừng. */
export function blenderLoop(): { set: (k: number) => void; stop: () => void } {
  const none = { set: () => {}, stop: () => {} };
  if (muted || !unlocked) return none;
  const c = ctx();
  if (!c) return none;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
  out.connect(c.destination);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1100;
  lp.connect(out);
  // động cơ: răng cưa trầm + điều biến biên độ nhanh tạo "rè rè"
  const motor = c.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.setValueAtTime(70, t);
  motor.frequency.exponentialRampToValueAtTime(120, t + 0.35);
  const am = c.createGain();
  am.gain.value = 0.6;
  const lfo = c.createOscillator();
  lfo.frequency.value = 28;
  const lfoG = c.createGain();
  lfoG.gain.value = 0.4;
  lfo.connect(lfoG).connect(am.gain);
  motor.connect(am).connect(lp);
  // tiếng lưỡi dao + nguyên liệu lạo xạo
  const n = c.createBufferSource();
  n.buffer = noiseBuf(c, 1);
  n.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  const ng = c.createGain();
  ng.gain.value = 0.25;
  n.connect(bp).connect(ng).connect(lp);
  motor.start(t);
  lfo.start(t);
  n.start(t);
  let stopped = false;
  return {
    set: (k: number) => {
      if (stopped) return;
      const now = c.currentTime;
      motor.frequency.setTargetAtTime(110 + k * 60, now, 0.1);
      lp.frequency.setTargetAtTime(1100 + k * 1600, now, 0.1);
      lfo.frequency.setTargetAtTime(28 + k * 18, now, 0.1);
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      const now = c.currentTime;
      motor.frequency.setTargetAtTime(40, now, 0.15);
      out.gain.setTargetAtTime(0.0001, now, 0.12);
      motor.stop(now + 0.6);
      lfo.stop(now + 0.6);
      n.stop(now + 0.6);
    },
  };
}
