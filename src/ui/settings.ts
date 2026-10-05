import { gsap } from 'gsap';
import { loadJSON, saveJSON } from '../core/storage';
import { isMuted, setMuted, sfx } from './audio';
import { roomyPref } from './drawer';
import type { Game } from './game';
import { music } from './music';

/** Trạng thái tạm dừng dùng chung (shop.tick kiểm tra). */
export const pauseState = { on: false };

const MUSIC_KEY = 'kem-tron.music';
export const musicPref = { get: () => loadJSON(MUSIC_KEY, true), set: (v: boolean) => saveJSON(MUSIC_KEY, v) };

/** Menu cài đặt (bánh răng góc trái): tạm dừng game khi mở. */
export function openSettings(g: Game) {
  if (g.modal.querySelector('.settings')) return;
  pauseState.on = true;
  const root = document.createElement('div');
  root.className = 'settings';
  const row = (id: string, label: string, val: string) => `<button class="st-row" data-id="${id}"><span>${label}</span><b>${val}</b></button>`;
  const render = () => {
    root.innerHTML = `<div class="st-card">
      <div class="st-pin"></div>
      <div class="st-h">TẠM NGHỈ<small>uống ly trà đá đã…</small></div>
      ${row('sound', 'Âm thanh', isMuted() ? 'TẮT' : 'BẬT')}
      ${row('music', 'Nhạc nền', musicPref.get() ? 'BẬT' : 'TẮT')}
      ${row('roomy', 'Ô nguyên liệu', roomyPref.get() ? 'RỘNG RÃI' : 'GỌN')}
      <button class="st-resume">Bán tiếp</button>
      <button class="st-home">Về màn tiêu đề</button>
    </div>`;
    root.querySelectorAll<HTMLButtonElement>('.st-row').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.id;
      if (id === 'sound') setMuted(!isMuted());
      if (id === 'music') { musicPref.set(!musicPref.get()); music.setEnabled(musicPref.get() && !isMuted()); }
      if (id === 'roomy') { const v = !roomyPref.get(); roomyPref.set(v); g.shop?.setRoomy(v); }
      sfx('click');
      render();
    }));
    root.querySelector('.st-resume')!.addEventListener('click', close);
    root.querySelector('.st-home')!.addEventListener('click', () => { g.save(); location.reload(); });
  };
  const close = () => {
    pauseState.on = false;
    gsap.globalTimeline.resume();
    sfx('click');
    gsap.to(root, { opacity: 0, duration: 0.15, onComplete: () => root.remove() });
  };
  render();
  g.modal.appendChild(root);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(); });
  // mở menu xong mới dừng mọi chuyển động của game
  gsap.fromTo(root.querySelector('.st-card'), { y: -60, rotation: -6, opacity: 0 }, { y: 0, rotation: -1.5, opacity: 1, duration: 0.3, ease: 'back.out(2)', onComplete: () => { if (pauseState.on) gsap.globalTimeline.pause(); } });
}
