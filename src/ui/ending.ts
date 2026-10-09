import { gsap } from 'gsap';
import { beanSvg, type Accessory } from '../art/bean';
import { P } from '../art/kit';
import { avgStars } from '../core/state';
import { sfx } from './audio';
import { noOrphan } from './copy';
import type { Game } from './game';

const ENDINGS: Record<string, { h: string; body: string; color: string; acc: Accessory[]; face: string; bg: string; browsOver?: boolean }> = {
  tu_te: {
    h: 'THƯƠNG HIỆU TỬ TẾ',
    body: 'Trả xong hụi. Khách quen gọi bạn là "shop\u00A0có\u00A0tâm". Kem không bật tông nhưng da ai cũng khoẻ. Chương 2: Spa Mini đầu\u00A0hẻm\u00A0— đang xây.',
    color: '#9ED36A', acc: ['kep_cang_cua'], face: 'ecstatic', bg: '#C9EE9A',
  },
  ong_trum: {
    h: 'ÔNG TRÙM KEM TRỘN',
    body: 'Tiền vô như nước, hàng sỉ chất đầy gầm giường. Nhưng tối nào cũng giật mình mỗi khi nghe tiếng gõ cửa… Chương 2 sẽ không\u00A0dễ\u00A0thở đâu.',
    color: '#F7D046', acc: ['vong_vang', 'kinh_ram', 'toc_uon'], face: 'glow', bg: '#FFE07A',
  },
  lenbao: {
    h: 'LÊN BÁO (LẦN 2)',
    body: 'Hai lần lên thời sự, cả xóm nhận ra bạn. Tiệm đóng cửa. Bạn chuyển nghề bán rau má đá\u00A010k\u00A0— lần này rau má thật.',
    color: '#FF8A3D', acc: ['non_bao_hiem'], face: 'cry', bg: '#FFB4A6',
  },
  con_no: {
    h: 'CÒN NỢ HỤI',
    body: 'Tiệm vẫn mở, nhưng chị Bảy đã dọn ghế nhựa ra ngồi ngay quầy mỗi sáng. Khách tới mua kem phải chào chị Bảy trước. Chương 2: vừa bán vừa trả góp.',
    color: '#F7D046', acc: ['toc_uon', 'vong_vang'], face: 'angry', bg: '#FFE07A', browsOver: true,
  },
  vo_no: {
    h: 'VỠ NỢ',
    body: 'Hộp bánh quy trống trơn, chị Bảy ngồi lì trước\u00A0cửa. Bạn về quê với mẹ. Mẹ nói: "Thôi\u00A0về\u00A0đây\u00A0mẹ\u00A0nuôi."',
    color: '#B9A3F0', acc: ['toc_buoi'], face: 'cry', bg: '#D6CCF5',
  },
};

/**
 * Dáng nhân vật màn kết thúc. V6-14: chị Bảy (Còn nợ hụi) giữ tóc uốn + vòng vàng như lúc ló cửa sổ buổi sáng,
 * nhưng tóc phủ kín lông mày → vẽ lại cặp lông mày giận đè lên lớp tóc (viền màu da cho nổi trên nền tóc nâu).
 */
function endingBean(e: (typeof ENDINGS)[string]) {
  let svg = beanSvg({ color: e.color, acc: e.acc }).replace(`face-${e.face}" style="display:none"`, `face-${e.face}"`);
  if (e.browsOver) {
    const brow = svg.match(/<path d="(M -38 [^"]*)" stroke="[^"]*" stroke-width="6" stroke-linecap="round"\/>/);
    if (brow) {
      const over = `<path d="${brow[1]}" stroke="${e.color}" stroke-width="11" stroke-linecap="round"/><path d="${brow[1]}" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>`;
      svg = svg.replace('<g class="fx"></g>', `${over}<g class="fx"></g>`);
    }
  }
  return svg;
}

export function showEnding(g: Game, kind: string) {
  const e = ENDINGS[kind] ?? ENDINGS.tu_te;
  const s = g.s;
  const root = document.createElement('div');
  root.className = 'ending';
  root.style.background = e.bg;
  root.innerHTML = `
    <div class="en-k">KẾT THÚC CHƯƠNG 1</div>
    <div class="en-h">${e.h}</div>
    <svg viewBox="-110 -260 220 280" width="220" height="280" class="en-bean">${endingBean(e)}</svg>
    <p>${noOrphan(e.body, 8)}</p>
    <div class="en-stats">
      <div><b>${s.stats.served}</b>khách</div>
      <div><b>${avgStars(s).toFixed(1).replace('.', ',')}</b>sao TB</div>
      <div><b>${s.followers}</b>follower</div>
      <div><b>${s.stats.exploded}</b>thau nổ</div>
      <div><b>${s.stats.fakeServed}</b>hũ hàng sỉ</div>
      <div><b>${Math.round(s.money)}k</b>còn lại</div>
    </div>
    <button class="en-again">Chơi lại từ đầu</button>`;
  g.modal.appendChild(root);
  sfx(kind === 'tu_te' ? 'happy' : 'boom');
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.fromTo(root.querySelector('.en-bean'), { y: 200, scale: 0.5 }, { y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1,0.5)' });
  gsap.fromTo(root.querySelectorAll('.en-stats div'), { scale: 0 }, { scale: 1, duration: 0.3, stagger: 0.08, delay: 0.5, ease: 'back.out(2.5)' });
  root.querySelector('.en-again')!.addEventListener('click', () => g.newGameFromEnding());
}
