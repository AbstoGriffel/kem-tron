import { gsap } from 'gsap';
import { panelBay, panelFridge, panelHospital, panelResolve, panelShop } from '../art/story';
import { TEXT_UI } from './copy';
import { sfx } from './audio';

/**
 * T21 — mở đầu kiểu truyện tranh chuyển động, chỉ hiện ở ván mới.
 * Mỗi khung tự chạy chuyển động 2–4 giây (kéo máy, parallax, lặp nhỏ), chạm để sang khung, nút "Bỏ qua" góc trên.
 * Lời dẫn có 2 tầng: câu chính (cap) + câu mô tả hoàn cảnh (sub). Không nêu số ngày, số tiền hụi.
 */
export function showIntro(modal: HTMLElement, done: () => void) {
  const root = document.createElement('div');
  root.className = 'intro';
  const arts = [panelHospital(), panelBay(), panelFridge(), panelShop(), panelResolve()];
  const caps = TEXT_UI.intro;
  root.innerHTML = `<div class="in-stage">${arts.map((a, i) => `<div class="in-panel" data-i="${i}" style="display:none">${a.replace('<svg ', `<svg preserveAspectRatio="${a.includes('sb-title') ? 'xMidYMin' : 'xMidYMid'} slice" `)}</div>`).join('')}</div>
    <div class="in-cap"><b></b><small></small></div>
    <div class="in-dots">${arts.map(() => '<i></i>').join('')}</div>
    <div class="in-hint">Chạm để xem tiếp</div>
    <button class="in-skip">Bỏ qua ›</button>`;
  modal.appendChild(root);
  const panels = Array.from(root.querySelectorAll<HTMLElement>('.in-panel'));
  const capB = root.querySelector('.in-cap b') as HTMLElement;
  const capS = root.querySelector('.in-cap small') as HTMLElement;
  const dots = Array.from(root.querySelectorAll<HTMLElement>('.in-dots i'));
  const hint = root.querySelector('.in-hint') as HTMLElement;
  let i = -1;
  let busy = false;
  let loops: gsap.core.Animation[] = [];
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    loops.forEach((t) => t.kill());
    gsap.to(root, { opacity: 0, duration: 0.35, onComplete: () => { root.remove(); done(); } });
  };

  const animate = (p: HTMLElement, k: number) => {
    const svg = p.querySelector('svg') as SVGSVGElement;
    const q = (c: string) => svg.querySelectorAll(c);
    const L: gsap.core.Animation[] = [];
    if (k === 0) {
      // kéo máy lùi: cận chân bó bột → lộ cả giường; hơi cháo bốc, bong bóng bật khi máy dừng
      L.push(gsap.fromTo(svg, { scale: 1.7, transformOrigin: '20% 45%' }, { scale: 1, duration: 2.2, ease: 'power2.inOut' }));
      L.push(gsap.fromTo(q('.sb-bub'), { scale: 0, opacity: 0, transformOrigin: '234px 216px' }, { scale: 1, opacity: 1, duration: 0.35, delay: 2.1, ease: 'back.out(2)' }));
      L.push(gsap.to(q('.sb-chao'), { y: -3, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    } else if (k === 1) {
      // cửa trượt: chị Bảy ló vào, quạt phe phẩy, sổ hụi nhấn 1 nhịp
      L.push(gsap.fromTo(q('.sb-bay'), { x: 260 }, { x: 0, duration: 0.7, ease: 'power3.out' }));
      L.push(gsap.to(q('.sb-fan'), { rotation: 14, duration: 0.25, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '0 0' }));
      L.push(gsap.fromTo(q('.sb-bub'), { scale: 0, opacity: 0, transformOrigin: '250px 150px' }, { scale: 1, opacity: 1, duration: 0.35, delay: 0.8, ease: 'back.out(2)' }));
    } else if (k === 2) {
      // cửa tủ lạnh bật, ánh sáng quét ra, từng món bật lên theo nhịp
      L.push(gsap.fromTo(q('.sb-door'), { scaleX: 0.2, transformOrigin: '320px 300px' }, { scaleX: 1, duration: 0.5, ease: 'back.out(1.6)' }));
      L.push(gsap.fromTo(q('.sb-light'), { opacity: 0 }, { opacity: 0.18, duration: 0.6 }));
      q('.sb-item').forEach((it, j) => L.push(gsap.fromTo(it, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, delay: 0.45 + j * 0.22, ease: 'back.out(2.4)', onStart: () => sfx('pop', { pitch: 1 + j * 0.08 }) })));
    } else if (k === 3) {
      // lia ngang dọc hẻm, bảng hiệu rơi xuống lắc lư rồi đứng
      L.push(gsap.fromTo(svg, { x: 60, scale: 1.15, transformOrigin: '50% 50%' }, { x: 0, scale: 1, duration: 1.6, ease: 'power2.out' }));
      L.push(gsap.fromTo(q('.sb-sign'), { y: -300 }, { y: 0, duration: 0.6, delay: 0.7, ease: 'bounce.out', onComplete: () => sfx('thud') }));
      L.push(gsap.fromTo(q('.sb-sign'), { rotation: -6, transformOrigin: '195px 160px' }, { rotation: 0, duration: 1.2, delay: 1.3, ease: 'elastic.out(1,0.3)' }));
    } else {
      // zoom giật vào nắm tay, tia sáng xoay, tiền rơi, chữ đập xuống
      L.push(gsap.fromTo(q('.sb-fist'), { scale: 1.6, transformOrigin: '195px 380px' }, { scale: 1, duration: 0.35, ease: 'power4.out' }));
      L.push(gsap.to(q('.sb-rays'), { rotation: 360, duration: 14, repeat: -1, ease: 'none' }));
      L.push(gsap.fromTo(q('.sb-money'), { y: -120 }, { y: 0, duration: 1, ease: 'bounce.out' }));
      L.push(gsap.fromTo(q('.sb-title'), { scale: 2.6, opacity: 0, transformOrigin: '195px 36px' }, { scale: 1, opacity: 1, duration: 0.3, delay: 0.5, ease: 'power4.in', onComplete: () => sfx('slap') }));
    }
    return L;
  };

  const go = () => {
    if (busy || finished) return;
    if (i >= panels.length - 1) { finish(); return; }
    busy = true;
    const prev = panels[i];
    i++;
    const cur = panels[i];
    loops.forEach((t) => t.kill());
    cur.style.display = '';
    sfx(i ? 'tick' : 'pop');
    capB.textContent = `${i + 1}. ${caps[i].cap}`;
    capS.textContent = caps[i].sub;
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
    // V3-12/V5-11: khung cuối chạm là vào buổi sáng ngày 1 (chưa mở tiệm, còn nút "Xuống mở tiệm") → nhãn nói đúng việc đó
    hint.textContent = i === panels.length - 1 ? 'Chạm để bắt đầu' : 'Chạm để xem tiếp';
    gsap.fromTo(root.querySelector('.in-cap'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, delay: 0.15 });
    // chuyển khung: khung mới trượt che khung cũ (wipe)
    gsap.fromTo(cur, { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: i ? 0.45 : 0.01, ease: 'power2.inOut', onComplete: () => {
      if (prev) prev.style.display = 'none';
      busy = false;
    } });
    loops = animate(cur, i);
  };

  root.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.in-skip')) return;
    go();
  });
  root.querySelector('.in-skip')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); sfx('click'); finish(); });
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  go();
}
