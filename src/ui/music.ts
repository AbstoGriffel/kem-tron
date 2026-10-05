import { ZZFX } from '../vendor/zzfx.js';

/**
 * Nhạc nền procedural (Web Audio, không file):
 * - 'chill': ukulele gảy nhẹ trên vòng hợp âm I–vi–IV–V, 92 bpm.
 * - 'vina' : khi live nóng — kick 4/4, bass nhảy nhịp lệch, stab synth, 128 bpm (meme "vinahouse").
 */
type Mode = 'off' | 'chill' | 'vina' | 'tense';

const CHORDS = [
  [60, 64, 67], // C
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [55, 59, 62], // G
];
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Music {
  private ctx?: AudioContext;
  private master?: GainNode;
  private mode: Mode = 'off';
  private want: Mode = 'off';
  private nextT = 0;
  private step = 0;
  private timer?: number;
  private enabled = true;

  private ensure() {
    if (this.ctx) return true;
    try {
      this.ctx = ZZFX.audioContext as AudioContext;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.0;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop();
    else if (this.want !== 'off') this.play(this.want);
  }

  play(m: Mode) {
    this.want = m;
    if (!this.enabled || !this.ensure()) return;
    if (m === this.mode) return;
    const ctx = this.ctx!;
    const g = this.master!.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setTargetAtTime(m === 'off' ? 0 : m === 'vina' ? 0.16 : 0.11, ctx.currentTime, 0.4);
    this.mode = m;
    if (!this.timer && m !== 'off') {
      this.nextT = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 50);
    }
  }

  stop() {
    this.mode = 'off';
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule() {
    const ctx = this.ctx!;
    if (ctx.state !== 'running') return;
    const bpm = this.mode === 'vina' ? 128 : this.mode === 'tense' ? 100 : 92;
    const sixteenth = 60 / bpm / 4;
    while (this.nextT < ctx.currentTime + 0.15) {
      this.tick(this.nextT, this.step, sixteenth);
      this.nextT += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  private tick(t: number, s: number, dur: number) {
    const bar = Math.floor(s / 16) % 4;
    const pos = s % 16;
    const chord = CHORDS[bar];
    if (this.mode === 'chill') {
      // gảy ukulele: arpeggio lên xuống
      const pat = [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 2, 1, -1, 2, -1, 1];
      const i = pat[pos];
      if (i >= 0) this.pluck(t, mtof(chord[i] + 12), 0.5);
      if (pos === 0 || pos === 8) this.pluck(t, mtof(chord[0] - 12), 0.4, 'triangle');
      if (pos === 4 || pos === 12) this.shaker(t, 0.05);
    } else if (this.mode === 'vina') {
      if (pos % 4 === 0) this.kick(t);
      if (pos % 4 === 2) this.bass(t, mtof(chord[0] - 24), dur * 1.6);
      if (pos % 2 === 1) this.hat(t);
      if (pos === 6 || pos === 14) this.stab(t, chord);
      if (pos === 10 && bar === 3) this.stab(t, chord.map((n) => n + 12));
    } else if (this.mode === 'tense') {
      // E thứ: bass đập như nhịp tim, tích tắc đồng hồ, nốt nửa cung rợn
      const root = 40 + (bar === 3 ? 1 : 0);
      if (pos === 0 || pos === 3) this.kick(t, pos === 0 ? 0.9 : 0.55);
      if (pos % 2 === 0) this.bass(t, mtof(root), dur * 1.4);
      if (pos % 4 === 2) this.hat(t);
      if (pos === 8) this.pluck(t, mtof(64), 0.5, 'square');
      if (pos === 12) this.pluck(t, mtof(65), 0.5, 'square');
      if (pos === 14 && bar % 2) this.stab(t, [52, 55, 59]);
    }
  }

  private env(t: number, peak: number, a: number, d: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(this.master!);
    return g;
  }

  private pluck(t: number, f: number, v: number, type: OscillatorType = 'triangle') {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const filt = this.ctx!.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2400, t);
    filt.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    o.connect(filt).connect(this.env(t, v * 0.5, 0.005, 0.35));
    o.start(t);
    o.stop(t + 0.4);
  }

  private kick(t: number, v = 1) {
    const o = this.ctx!.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(this.env(t, 1.1 * v, 0.002, 0.22));
    o.start(t);
    o.stop(t + 0.25);
  }

  private bass(t: number, f: number, d: number) {
    const o = this.ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const filt = this.ctx!.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 380;
    o.connect(filt).connect(this.env(t, 0.55, 0.005, d));
    o.start(t);
    o.stop(t + d + 0.05);
  }

  private stab(t: number, chord: number[]) {
    for (const n of chord) {
      const o = this.ctx!.createOscillator();
      o.type = 'square';
      o.frequency.value = mtof(n + 12);
      o.connect(this.env(t, 0.07, 0.004, 0.16));
      o.start(t);
      o.stop(t + 0.2);
    }
  }

  private noise(t: number, v: number, d: number, hp: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * d);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    src.connect(f).connect(this.env(t, v, 0.002, d));
    src.start(t);
  }

  private hat(t: number) {
    this.noise(t, 0.12, 0.04, 7000);
  }

  private shaker(t: number, v: number) {
    this.noise(t, v, 0.06, 5000);
  }
}

export const music = new Music();
