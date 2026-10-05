import { gsap } from 'gsap';
import { beanSvg, type Accessory } from '../art/bean';
import { ICONS } from '../art/icons';
import { el, ink, P } from '../art/kit';
import { grantBadge } from '../core/badges';
import { BASES, INGREDIENTS } from '../core/db';
import { addSuspicion, dayRng } from '../core/state';
import { pick, shuffle } from '../core/rng';
import { buzz, sfx } from './audio';
import { shake } from './fx';
import type { Game } from './game';
import { toStage } from './stage';
import '../styles/insp-ledger.css';

const SPOTS = [
  { id: 'noi_com', name: 'Nồi cơm điện', x: 70, y: 560, cap: 2, line: 'Cái nồi này nấu gì mà thơm mùi kem vậy?' },
  { id: 'thung_gao', name: 'Thùng gạo', x: 195, y: 590, cap: 2, line: 'Gạo gì mà có… tuýp kem?' },
  { id: 'gam_giuong', name: 'Gầm giường', x: 320, y: 560, cap: 2, line: 'Gầm giường sao nhiều hộp vậy em?' },
  { id: 'tu_lanh', name: 'Tủ lạnh', x: 320, y: 380, cap: 2, line: 'Tủ lạnh để mỹ phẩm hả?' },
];

const EXCUSES = ['Dạ đây là sốt mayonnaise ạ!', 'Mặt nạ cho chó đó chú!', 'Em quay clip review cho vui thôi!'];

/** Minigame "Dọn Hiện Trường" (10 s) → 'ok' | 'raid'. */
export function runInspection(g: Game): Promise<'ok' | 'raid'> {
  return new Promise((resolve) => {
    const s = g.s;
    const rng = dayRng(s, 'insp');
    const fakeIds = [...INGREDIENTS, ...BASES].filter((x) => x.fake && (s.stock[x.id] ?? 0) > 0).map((x) => x.id);
    const root = document.createElement('div');
    root.className = 'insp';
    g.modal.appendChild(root);
    root.innerHTML = `
      <svg class="insp-scene" viewBox="0 0 390 844" width="390" height="844">${roomSvg()}<g id="spots"></g><g id="crew"></g><g id="loose"></g></svg>
      <div class="insp-banner">${s.suspicion >= 85 ? 'QLTT + CÔNG AN PHƯỜNG GÕ CỬA!' : 'QUẢN LÝ THỊ TRƯỜNG GÕ CỬA!'}<small>${fakeIds.length ? 'Kéo hết hàng sỉ đi giấu trước khi chú vô!' : 'Hên quá, nhà không có hàng sỉ.'}</small></div>
      <div class="insp-timer"><i></i></div>
      <div class="insp-head"><svg viewBox="-62 -210 124 112" width="46" height="42">${headIcon()}</svg></div>`;
    // chú QLTT (+ công an phường) đứng ngoài cửa, chỉ hiện khi cửa bật mở
    const crew = root.querySelector('#crew') as SVGGElement;
    let ca: SVGGElement | null = null;
    if (s.suspicion >= 85) {
      const caWrap = el('g', { transform: 'translate(88 446) scale(.74)' });
      ca = el('g', { opacity: 0 }, beanSvg({ color: '#9ED36A', acc: ['non_bao_hiem'] as Accessory[] }).replace('face-angry" style="display:none"', 'face-angry"'));
      caWrap.appendChild(ca);
      crew.appendChild(caWrap);
    }
    const offWrap = el('g', { transform: 'translate(132 450) scale(.82)' });
    const off = el('g', { opacity: 0 }, officerSvg());
    offWrap.appendChild(off);
    crew.appendChild(offWrap);
    const head = root.querySelector('.insp-head') as HTMLElement;
    const door = root.querySelector('#door') as SVGGElement;
    door.innerHTML = doorPanel(0);
    let doorOpen = false;
    const spotsG = root.querySelector('#spots') as SVGGElement;
    const loose = root.querySelector('#loose') as SVGGElement;
    const hidden: Record<string, string[]> = Object.fromEntries(SPOTS.map((sp) => [sp.id, []]));
    const drawSpots = () => {
      spotsG.innerHTML = SPOTS.map((sp) => `<g transform="translate(${sp.x} ${sp.y})">${spotArt(sp.id)}
        <g transform="translate(0 44)"><rect x="-44" y="-10" width="88" height="20" rx="5" fill="${P.paperHi}" ${ink(2)}/><text y="5" font-family="Paytone One" font-size="10" text-anchor="middle" fill="${P.ink}">${sp.name} ${hidden[sp.id].length}/${sp.cap}</text></g></g>`).join('');
    };
    drawSpots();
    // hàng dỏm nằm lăn lóc trên bàn (mỗi loại 1 cục)
    const items = fakeIds.map((id, i) => ({ id, x: 90 + (i % 3) * 100, y: 740 + Math.floor(i / 3) * 70, hiddenIn: '' }));
    const drawLoose = () => {
      loose.innerHTML = '';
      items.filter((it) => !it.hiddenIn).forEach((it) => {
        const gg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gg.setAttribute('transform', `translate(${it.x} ${it.y})`);
        gg.innerHTML = `<circle r="34" fill="#FFB4A6" opacity=".6"/><svg x="-30" y="-30" width="60" height="60" viewBox="0 0 80 80">${ICONS[it.id]}</svg>`;
        gg.style.cursor = 'grab';
        gg.addEventListener('pointerdown', (e) => dragItem(e, it, gg));
        loose.appendChild(gg);
      });
    };
    const dragItem = (e: PointerEvent, it: (typeof items)[number], gg: SVGGElement) => {
      e.preventDefault();
      sfx('pick');
      const move = (ev: PointerEvent) => {
        const p = toStage(ev.clientX, ev.clientY);
        gg.setAttribute('transform', `translate(${p.x} ${p.y - 30}) scale(1.15)`);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const p = toStage(ev.clientX, ev.clientY);
        const sp = SPOTS.find((x) => Math.hypot(x.x - p.x, x.y - (p.y - 30)) < 70);
        if (sp && hidden[sp.id].length < sp.cap) {
          hidden[sp.id].push(it.id);
          it.hiddenIn = sp.id;
          sfx('thud');
          shake(0.15);
          drawSpots();
        } else if (sp) {
          g.toast(`${sp.name} đầy rồi!`, 'bad');
        }
        drawLoose();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    drawLoose();
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(root.querySelector('.insp-banner'), { y: -120 }, { y: 0, duration: 0.35, ease: 'back.out(2)' });
    sfx('siren');
    buzz([80, 50, 200]);
    // gõ cửa 3 lần trong 10 s
    const knocks = [0.5, 4, 7.5];
    knocks.forEach((t, i) => setTimeout(() => {
      if (doorOpen || !root.isConnected) return;
      sfx('knock');
      shake(0.35);
      gsap.fromTo(door, { x: -4 }, { x: 0, duration: 0.3, ease: 'elastic.out(1,0.3)' });
      gsap.fromTo(head, { y: 0 }, { y: -10, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
      g.toast(['"Chủ nhà đâu, mở cửa!"', '"Mở cửa kiểm tra hành chính!"', '"Chú vô à nha!"'][i], 'bad');
    }, t * 1000));
    const bar = root.querySelector('.insp-timer i') as HTMLElement;
    // đầu chú QLTT trượt theo mép thanh đếm ngược (phải → trái)
    const placeHead = () => {
      const v = Number(gsap.getProperty(bar, 'scaleX'));
      head.style.left = `${20 + 350 * v - 23}px`;
    };
    placeHead();
    gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: fakeIds.length ? 10 : 3, ease: 'none', transformOrigin: 'left', onUpdate: placeHead, onComplete: () => openDoor() });

    /** Hết giờ: cánh cửa bật mở, thấy trời ngoài hẻm, chú đứng ở khung cửa rồi bước vô. */
    const openDoor = () => {
      doorOpen = true;
      gsap.to(head, { scale: 0, opacity: 0, duration: 0.25, ease: 'back.in(2)' });
      sfx('boom');
      shake(0.4);
      const st = { t: 0 };
      gsap.to(st, { t: 1, duration: 0.45, ease: 'back.out(1.4)', onUpdate: () => { door.innerHTML = doorPanel(st.t); } });
      gsap.fromTo(off, { opacity: 0, scale: 0.9, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, delay: 0.2, transformOrigin: '50% 100%', ease: 'back.out(2)' });
      if (ca) gsap.fromTo(ca, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, delay: 0.35, ease: 'back.out(2)' });
      root.querySelector('.insp-banner')!.innerHTML = 'CỐC CỐC… CẠCH!';
      setTimeout(search, 1000);
    };

    const search = () => {
      // chú vô, mở 2 chỗ
      const looseLeft = items.filter((x) => !x.hiddenIn).map((x) => x.id);
      const opened = shuffle(rng, SPOTS).slice(0, 2);
      const found = [...looseLeft, ...opened.flatMap((sp) => hidden[sp.id])];
      root.querySelector('.insp-banner')!.innerHTML = 'Chú vô kiểm tra…';
      gsap.to(off, { x: '+=86', y: '+=30', scale: 1.14, transformOrigin: '50% 100%', duration: 0.7, ease: 'steps(5)' });
      gsap.fromTo(off, { rotation: -4 }, { rotation: 4, duration: 0.14, yoyo: true, repeat: 4, transformOrigin: '50% 100%', ease: 'sine.inOut', onComplete: () => { gsap.set(off, { rotation: 0 }); } });
      if (ca) gsap.to(ca, { x: '+=26', y: '+=10', duration: 0.6, delay: 0.2, ease: 'steps(4)' });
      let t = 0.8;
      opened.forEach((sp) => {
        setTimeout(() => {
          g.toast(`"${sp.line}"`, hidden[sp.id].length ? 'bad' : 'info');
          sfx(hidden[sp.id].length ? 'starBad' : 'tick');
          const art = spotsG.children[SPOTS.indexOf(sp)];
          gsap.from(art, { y: '-=14', duration: 0.4, ease: 'bounce.out' });
        }, t * 1000);
        t += 1.6;
      });
      setTimeout(() => {
        if (!found.length) {
          addSuspicion(s, -30);
          grantBadge(s, 'thoat_qltt');
          sfx('happy');
          verdict('THOÁT RỒI!', 'Không thấy gì. Chú dặn làm ăn đàng hoàng rồi về.', 'good', 'ok');
          return;
        }
        // có hàng: chọn 1 câu chống chế
        const ex = document.createElement('div');
        ex.className = 'insp-excuse';
        ex.innerHTML = `<div>Chú cầm ${found.length} món lên: "Cái gì đây em?"</div>${EXCUSES.map((x, i) => `<button data-i="${i}">${x}</button>`).join('')}<button class="tea">Mời chú ly trà đá…</button>`;
        root.appendChild(ex);
        gsap.fromTo(ex, { y: 300 }, { y: 0, duration: 0.3, ease: 'back.out(1.5)' });
        ex.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => {
          ex.remove();
          if (b.classList.contains('tea')) {
            addSuspicion(s, 5);
            g.toast('"Không nhận gì hết nha, làm việc đàng hoàng!"', 'bad');
          }
          const convinced = !b.classList.contains('tea') && found.length <= 1 && rng() < 0.3;
          if (convinced) {
            addSuspicion(s, -10);
            grantBadge(s, 'chem_gio');
            verdict('…TIN THIỆT?', `"${b.textContent}" — chú nhìn em một hồi rồi bỏ qua. Lần sau hết nha!`, 'good', 'ok');
            return;
          }
          for (const id of fakeIds) s.stock[id] = 0;
          if (found.length >= 3) {
            const fine = Math.max(100, Math.round(s.money * 0.35));
            s.money -= fine;
            s.raids++;
            s.closedDays++;
            s.suspicion = 30;
            s.followers = Math.round(s.followers * 0.8);
            verdict('BỊ LẬP BIÊN BẢN!', `Công an phường đi cùng ghi biên bản: tịch thu toàn bộ hàng sỉ, phạt ${fine}k, đóng cửa 1 ngày. Lần nữa là lên báo luôn đó!`, 'bad', 'raid');
          } else {
            const fine = Math.max(50, Math.round(s.money * 0.15));
            s.money -= fine;
            s.suspicion = Math.max(0, s.suspicion - 20);
            verdict('BỊ PHẠT!', `Tịch thu hàng sỉ, phạt ${fine}k. Hôm nay vẫn được mở tiệm.`, 'bad', 'ok');
          }
        }));
      }, t * 1000 + 300);
    };

    const verdict = (h: string, body: string, kind: 'good' | 'bad', res: 'ok' | 'raid') => {
      const v = document.createElement('div');
      v.className = `insp-verdict ${kind}`;
      v.innerHTML = `<b>${h}</b><p>${body}</p><button>Tiếp tục</button>`;
      root.appendChild(v);
      sfx(kind === 'good' ? 'ding' : 'boom');
      if (kind === 'bad') shake(0.6);
      gsap.fromTo(v, { scale: 0.3, rotation: -10 }, { scale: 1, rotation: -2, duration: 0.4, ease: 'back.out(2)' });
      v.querySelector('button')!.addEventListener('click', () => {
        g.save();
        gsap.to(root, { opacity: 0, duration: 0.25, onComplete: () => { root.remove(); resolve(res); } });
      });
    };
  });
}

/** Tổ trưởng dân phố ghé "hỏi thăm" (cảnh báo nghi ngờ 35+). */
export function showTotruong(g: Game): Promise<void> {
  return new Promise((resolve) => {
    const s = g.s;
    const root = document.createElement('div');
    root.className = 'visit';
    root.innerHTML = `
      <svg viewBox="-90 -250 180 260" width="180" height="260">${beanSvg({ color: '#9ED36A', acc: ['non_bao_hiem'] as Accessory[] }).replace('face-talk" style="display:none"', 'face-talk"')}
        <g transform="translate(58 -96) rotate(-20)"><path d="M 0 0 L 40 -16 L 40 16 Z" fill="${P.steel}" ${ink(2.5)}/><rect x="-12" y="-6" width="14" height="12" fill="${P.red}" ${ink(2)}/></g></svg>
      <div class="v-bub">Bác tổ trưởng nè con! Nghe nói nhà mình bán kem hả? Bà con phản ánh dữ lắm… Cho bác xin 1 hũ thoa chân coi.</div>
      <div class="v-btns"><button class="give">Biếu bác 1 hũ (−1 cốt kem)</button><button class="deny">"Dạ con bán rau má thôi ạ"</button></div>`;
    g.modal.appendChild(root);
    sfx('knock');
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(root.querySelector('svg'), { y: 300 }, { y: 0, duration: 0.5, ease: 'back.out(1.6)' });
    const done = (msg: string) => {
      g.toast(msg, 'info');
      g.save();
      gsap.to(root, { opacity: 0, duration: 0.25, delay: 0.3, onComplete: () => { root.remove(); resolve(); } });
    };
    root.querySelector('.give')!.addEventListener('click', () => {
      const b = ['kem_tron', 'sap_ne', 'sua_duong', 'gel_nha_dam'].find((id) => (s.stock[id] ?? 0) > 0);
      if (b) s.stock[b]--;
      addSuspicion(s, -8);
      sfx('happy');
      done('Bác khen thơm, hứa nói đỡ với bà con. Nghi ngờ giảm.');
    });
    root.querySelector('.deny')!.addEventListener('click', () => {
      sfx('tick');
      done('"Rau má gì mà có mùi kem?" Bác nheo mắt bỏ về.');
    });
  });
}

/** Bản tin thời sự khi bị lập biên bản. */
export function showRaidNews(g: Game): Promise<void> {
  return new Promise((resolve) => {
    const rng = dayRng(g.s, 'news');
    const head = pick(rng, [
      'BẮT QUẢ TANG CƠ SỞ TRỘN KEM TRONG NỒI CƠM ĐIỆN',
      'PHÁT HIỆN "KEM BẬT TÔNG" LÀM TỪ THÙNG 20 KÝ KHÔNG NHÃN',
      'CHỦ TIỆM LIVESTREAM "100% THIÊN NHIÊN" BỊ LẬP BIÊN BẢN',
    ]);
    const root = document.createElement('div');
    root.className = 'news';
    root.innerHTML = `
      <div class="tv">
        <div class="tv-screen">
          <div class="tv-logo">THỜI SỰ<br/><small>19:00</small></div>
          <svg viewBox="-90 -250 180 260" width="150" height="216" class="anchor">${beanSvg({ color: '#6CC3F0', acc: ['cavat', 'toc_buoi'] as Accessory[] }).replace('face-talk" style="display:none"', 'face-talk"')}</svg>
          <div class="tv-inset"><svg viewBox="-75 -230 150 240" width="80" height="120">${beanSvg({ color: '#FF8A3D', acc: ['khau_trang', 'non_bao_hiem'] as Accessory[] }).replace('face-cry" style="display:none"', 'face-cry"')}</svg><i>Chủ tiệm (đã che mặt)</i></div>
          <div class="tv-head">${head}</div>
          <div class="tv-ticker"><span>Tiệm "${g.s.shopName}" bị tịch thu toàn bộ hàng không rõ nguồn gốc · Cơ quan chức năng khuyến cáo người dân không dùng kem trộn · Bà con hẻm 42 cho biết "thấy nó livestream suốt" · </span></div>
        </div>
      </div>
      <button class="news-ok">Làm lại cuộc đời</button>`;
    g.modal.appendChild(root);
    sfx('siren');
    gsap.fromTo(root.querySelector('.tv'), { scale: 0.2, rotation: 8 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' });
    gsap.to(root.querySelector('.tv-ticker span'), { x: -900, duration: 14, ease: 'none', repeat: -1 });
    root.querySelector('.news-ok')!.addEventListener('click', () => gsap.to(root, { opacity: 0, duration: 0.3, onComplete: () => { root.remove(); resolve(); } }));
  });
}

function roomSvg() {
  return `<rect width="390" height="844" fill="#BFE3D3"/>
    <rect y="450" width="390" height="394" fill="#D9945A"/><path d="M0 450 H390" stroke="${P.ink}" stroke-width="3"/>
    <rect x="23" y="143" width="164" height="310" fill="${P.brownDark}" ${ink()}/>
    <g id="doorway">
      <rect x="30" y="150" width="150" height="300" fill="${P.sky}"/>
      <path d="M 52 196 q 6 -14 20 -8 q 10 -12 22 0 q 12 -2 10 10 h -52 z" fill="${P.white}" opacity=".9"/>
      <path d="M 120 236 q 4 -10 14 -6 q 8 -8 16 2 q 8 0 6 8 h -36 z" fill="${P.white}" opacity=".8"/>
      <path d="M 30 404 V 330 h 34 v -10 l 26 -22 l 26 22 v 10 h 64 v 74 z" fill="#F2D6A8" ${ink(2)}/>
      <rect x="74" y="336" width="32" height="26" fill="${P.sky}" ${ink(2)}/><rect x="132" y="346" width="26" height="58" fill="${P.brown}" ${ink(2)}/>
      <rect x="30" y="404" width="150" height="46" fill="#C9BFAE"/><path d="M 30 404 H 180" stroke="${P.ink}" stroke-width="2.5"/>
      <rect x="30" y="150" width="150" height="300" fill="none" ${ink()}/>
    </g>
    <g id="door"></g>
    <rect x="200" y="660" width="190" height="200" fill="${P.steel}" ${ink()}/><text x="295" y="700" font-family="Paytone One" font-size="13" text-anchor="middle" fill="${P.steelDeep}">BÀN — HÀNG CẦN GIẤU</text>
    <rect x="-4" y="660" width="210" height="200" fill="${P.steel}" ${ink()}/>`;
}

/** Đầu + thân chú QLTT: mặt nghi ngờ, cà vạt, mũ phớt vẽ riêng (gọn hơn mũ trong bean.ts). */
function officerSvg() {
  const svg = beanSvg({ color: '#C9A27A', acc: ['cavat'] as Accessory[] }).replace('face-sus" style="display:none"', 'face-sus"');
  // chèn mũ vào cuối nhóm .head (trước <g class="fx">)
  return svg.replace(/(<\/g>\s*<g class="fx">)/, `${fedora()}$1`);
}

function fedora() {
  const c = '#4A4A52';
  return `<g class="acc hat" transform="translate(0 -5)">
    <path d="M -41 -158 C -44 -176 -40 -192 -24 -196 Q -12 -192 0 -189 Q 12 -192 24 -196 C 40 -192 44 -176 41 -158 Z" fill="${c}" ${ink()}/>
    <path d="M -41 -169 C -14 -165 14 -165 41 -169 L 41 -159 C 14 -156 -14 -156 -41 -159 Z" fill="${P.ink}"/>
    <path d="M -58 -158 Q 0 -171 58 -158 Q 63 -154 55 -151 Q 0 -144 -55 -151 Q -63 -154 -58 -158 Z" fill="${c}" ${ink()}/>
    <path d="M -28 -184 q 7 -5 15 -4" stroke="#7E7E88" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>`;
}

/** Icon đầu chú QLTT (cắt tròn cằm) + 2 tay bám thanh đếm ngược. */
function headIcon() {
  const c = '#C9A27A';
  return `<clipPath id="qltt-head"><path d="M -60 -212 H 60 V -136 Q 58 -104 0 -104 Q -58 -104 -60 -136 Z"/></clipPath>
    <g clip-path="url(#qltt-head)">${officerSvg()}</g>
    <path d="M -46 -118 Q 0 -96 46 -118" stroke="#A9825C" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
    <circle cx="-40" cy="-106" r="9" fill="${c}" ${ink(2.5)}/><circle cx="40" cy="-106" r="9" fill="${c}" ${ink(2.5)}/>`;
}

/** Cánh cửa xoay quanh bản lề trái; t=0 đóng, t=1 mở (giả phối cảnh: mép tự do to ra khi xoay về phía mình). */
function doorPanel(t: number) {
  const a = (t * 64 * Math.PI) / 180;
  const fx = 30 + 150 * Math.cos(a);
  const sn = Math.sin(a);
  const ft = 150 - 22 * sn;
  const fb = 450 + 22 * sn;
  const pt = (u: number, v: number) => {
    const x = 30 + u * (fx - 30);
    const yt = 150 + u * (ft - 150);
    const yb = 450 + u * (fb - 450);
    return `${x.toFixed(1)} ${(yt + v * (yb - yt)).toFixed(1)}`;
  };
  const quad = (u0: number, v0: number, u1: number, v1: number) => `M ${pt(u0, v0)} L ${pt(u1, v0)} L ${pt(u1, v1)} L ${pt(u0, v1)} Z`;
  const knob = pt(130 / 150, 170 / 300).split(' ');
  const edge = 7 * sn;
  return `${t > 0.02 ? `<path d="M ${fx} ${ft} L ${fx + edge} ${ft + 3} L ${fx + edge} ${fb - 3} L ${fx} ${fb} Z" fill="${P.brownDark}" ${ink(2)}/>` : ''}
    <path d="${quad(0, 0, 1, 1)}" fill="${P.brown}" ${ink()}/>
    <path d="${quad(18 / 150, 20 / 300, 132 / 150, 130 / 300)}" fill="#9C4430" ${ink(2)}/>
    ${t > 0.02 ? `<path d="${quad(0, 0, 1, 1)}" fill="${P.ink}" opacity="${(0.18 * sn).toFixed(2)}"/>` : ''}
    <ellipse cx="${knob[0]}" cy="${knob[1]}" rx="${(7 * (0.55 + 0.45 * Math.cos(a))).toFixed(1)}" ry="7" fill="${P.yellow}" ${ink(2)}/>`;
}

function spotArt(id: string) {
  switch (id) {
    case 'noi_com': return `<ellipse cx="0" cy="22" rx="44" ry="8" fill="${P.ink}" opacity=".2"/><path d="M -38 -20 H 38 V 18 Q 0 28 -38 18 Z" fill="#fff" ${ink()}/><path d="M -42 -20 Q 0 -44 42 -20 Z" fill="${P.pink}" ${ink()}/><rect x="-8" y="-40" width="16" height="8" rx="3" fill="${P.ink}"/><rect x="-14" y="-4" width="28" height="12" rx="3" fill="${P.red}" ${ink(2)}/>`;
    case 'thung_gao': return `<path d="M -40 -30 H 40 L 36 26 H -36 Z" fill="${P.blue}" ${ink()}/><path d="M -42 -36 H 42 V -26 H -42 Z" fill="${P.blueDark}" ${ink()}/><text y="4" font-family="Paytone One" font-size="13" fill="#fff" text-anchor="middle">GẠO</text>`;
    case 'gam_giuong': return `<rect x="-56" y="-34" width="112" height="22" fill="${P.wood}" ${ink()}/><path d="M -52 -12 V 24 M 52 -12 V 24" stroke="${P.ink}" stroke-width="6"/><rect x="-46" y="-12" width="92" height="30" fill="#3A2620" opacity=".55"/>`;
    case 'tu_lanh': return `<rect x="-40" y="-120" width="80" height="150" rx="8" fill="#F4F1EA" ${ink()}/><path d="M -40 -60 H 40" stroke="${P.ink}" stroke-width="3"/><rect x="28" y="-110" width="5" height="34" rx="2" fill="${P.steelDark}"/><rect x="28" y="-50" width="5" height="40" rx="2" fill="${P.steelDark}"/>`;
  }
  return '';
}
