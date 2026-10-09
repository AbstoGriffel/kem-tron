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
import { noOrphan } from './copy';
import { LAYOUT, toStage, watchLayout } from './stage';
import '../styles/insp-ledger.css';

const SPOTS = [
  { id: 'noi_com', name: 'Nồi cơm điện', x: 70, y: 560, cap: 2, line: 'Cái nồi này nấu gì mà thơm mùi kem vậy?' },
  { id: 'thung_gao', name: 'Thùng gạo', x: 195, y: 590, cap: 2, line: 'Gạo gì mà có… tuýp kem?' },
  { id: 'gam_giuong', name: 'Gầm giường', x: 320, y: 560, cap: 2, line: 'Gầm giường sao nhiều hộp vậy em?' },
  { id: 'tu_lanh', name: 'Tủ lạnh', x: 320, y: 380, cap: 2, line: 'Tủ lạnh để mỹ phẩm hả?' },
];

const EXCUSES = ['Dạ đây là sốt mayonnaise ạ!', 'Mặt nạ cho chó đó chú!', 'Em quay clip review cho vui thôi!'];

/** Khung hình từng chỗ giấu (toạ độ art gốc, chưa co) — dùng chung cho vẽ và dò thả: [trái, trên, phải, dưới]. */
const SPOT_BOX: Record<string, [number, number, number, number]> = {
  noi_com: [-44, -44, 44, 30], thung_gao: [-42, -36, 42, 26], gam_giuong: [-56, -34, 56, 24], tu_lanh: [-40, -120, 40, 30],
};
/** Phòng bản gốc: khung cửa từ y=143, sàn từ y=450, đáy nhãn chỗ giấu dưới sàn ≈ 450 + 170. */
const ROOM_UP = 450 - 143;
const ROOM_DOWN = 170;
/** Hàng cần giấu xếp tối đa 4 món một hàng trên bàn. */
const PER_ROW = 4;

/** Minigame "Dọn Hiện Trường" (10 s) → 'ok' | 'raid'. */
export function runInspection(g: Game): Promise<'ok' | 'raid'> {
  return new Promise((resolve) => {
    const s = g.s;
    const rng = dayRng(s, 'insp');
    const fakeIds = [...INGREDIENTS, ...BASES].filter((x) => x.fake && (s.stock[x.id] ?? 0) > 0).map((x) => x.id);
    // 2 chỗ chú sẽ lục: bốc trước (rng dùng đúng thứ tự cũ: xáo chỗ trước, rồi mới tới lượt chống chế)
    const opened = shuffle(rng, SPOTS).slice(0, 2);
    if (import.meta.env.DEV) (window as unknown as { __insp: unknown }).__insp = { opened: opened.map((x) => x.id), fakeIds };
    const root = document.createElement('div');
    root.className = 'insp';
    g.modal.appendChild(root);
    root.innerHTML = `
      <svg class="insp-scene" viewBox="0 0 390 844" width="390" height="844">
        <rect id="i-wall" width="390" height="844" fill="#BFE3D3"/>
        <g id="i-floor"></g>
        <g id="i-room">${roomSvg()}<g id="crew"></g></g>
        <g id="i-table"></g><g id="spots"></g><g id="loose"></g></svg>
      <div class="insp-banner">${s.suspicion >= 85 ? 'QLTT + CÔNG AN PHƯỜNG GÕ CỬA!' : 'QUẢN LÝ THỊ TRƯỜNG GÕ CỬA!'}<small>${fakeIds.length ? noOrphan('Kéo hàng sỉ trên bàn thả vô chỗ giấu trước khi chú vô!') : 'Hên quá, nhà không có hàng sỉ.'}</small></div>
      <div class="insp-timer"><i></i></div>
      <div class="insp-head"><svg viewBox="-62 -210 124 112" width="46" height="42">${headIcon()}</svg></div>
      <div class="insp-say"></div>`;
    const scene = root.querySelector('.insp-scene') as SVGSVGElement;
    const banner = root.querySelector('.insp-banner') as HTMLElement;
    const timer = root.querySelector('.insp-timer') as HTMLElement;
    const head = root.querySelector('.insp-head') as HTMLElement;
    const sayEl = root.querySelector('.insp-say') as HTMLElement;
    const roomG = root.querySelector('#i-room') as SVGGElement;
    const floorG = root.querySelector('#i-floor') as SVGGElement;
    const tableG = root.querySelector('#i-table') as SVGGElement;
    const spotsG = root.querySelector('#spots') as SVGGElement;
    const loose = root.querySelector('#loose') as SVGGElement;
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
    const door = root.querySelector('#door') as SVGGElement;
    door.innerHTML = doorPanel(0);
    let doorOpen = false;
    const hidden: Record<string, string[]> = Object.fromEntries(SPOTS.map((sp) => [sp.id, []]));
    const items = fakeIds.map((id) => ({ id, hiddenIn: '' }));
    const rows = Math.max(1, Math.ceil(items.length / PER_ROW));

    /**
     * Bố cục theo chiều cao máy (V1-35/V2-08/V3-04/V3-24): banner + thanh đếm ngược ở trên, bàn hàng cần giấu neo đáy
     * (chừa padB), phòng (cửa, tủ lạnh, sàn với 3 chỗ giấu) nằm giữa — máy ngắn thì co phòng theo tỉ lệ k.
     */
    const G = { H: 844, k: 1, hb: 120, floorY: 450, tableY: 660 };
    const layout = () => {
      const bb = banner.offsetTop + banner.offsetHeight;
      // đầu chú (cao 42, đỉnh mũ cách đáy ~30 so với đỉnh thanh) không chạm mép banner
      const tTop = bb + 34;
      timer.style.top = `${tTop}px`;
      head.style.top = `${tTop - 30}px`;
      const H = LAYOUT.H;
      const tb = 134 + (rows - 1) * 72 + LAYOUT.padB;
      const hb = tTop + timer.offsetHeight + 10;
      const free = H - hb - 30 - tb;
      const k = Math.min(1, free / (ROOM_UP + ROOM_DOWN));
      const extra = free - (ROOM_UP + ROOM_DOWN) * k;
      const floorY = Math.round(hb + extra * 0.45 + ROOM_UP * k);
      const tableY = Math.round(floorY + ROOM_DOWN * k + 30 + extra * 0.3);
      Object.assign(G, { H, k, hb, floorY, tableY });
      scene.setAttribute('viewBox', `0 0 390 ${H}`);
      scene.setAttribute('height', String(H));
      scene.querySelector('#i-wall')!.setAttribute('height', String(H));
      roomG.setAttribute('transform', `translate(0 ${floorY}) scale(${k}) translate(0 -450)`);
      floorG.innerHTML = `<rect y="${floorY}" width="390" height="${tableY - floorY}" fill="#D9945A"/><path d="M0 ${floorY} H390" stroke="${P.ink}" stroke-width="3"/>`;
      drawTable();
      drawSpots();
      drawLoose();
    };
    const spotPos = (sp: (typeof SPOTS)[number]) => ({ x: 195 + (sp.x - 195) * G.k, y: G.floorY + (sp.y - 450) * G.k });
    /** Vùng nhận thả của một chỗ giấu (art + nhãn, nới 14px) — toạ độ stage. */
    const spotBox = (sp: (typeof SPOTS)[number]) => {
      const p = spotPos(sp), b = SPOT_BOX[sp.id], k = G.k;
      return { l: p.x + Math.min(b[0] * k, -44) - 14, r: p.x + Math.max(b[2] * k, 44) + 14, t: p.y + b[1] * k - 14, b: p.y + 30 * k + 24 + 10 };
    };
    const labelY = () => 30 * G.k + 14;
    const drawSpots = () => {
      spotsG.innerHTML = SPOTS.map((sp) => {
        const p = spotPos(sp);
        const full = hidden[sp.id].length >= sp.cap;
        return `<g data-id="${sp.id}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="sp-art"><g transform="scale(${G.k.toFixed(3)})">${spotArt(sp.id)}</g></g>
        <g class="sp-tag" transform="translate(0 ${labelY().toFixed(1)})"><rect x="-44" y="-10" width="88" height="20" rx="5" fill="${full ? '#C9EE9A' : P.paperHi}" ${ink(2)}/><text y="5" font-family="Paytone One" font-size="10" text-anchor="middle" fill="${P.ink}">${sp.name} ${hidden[sp.id].length}/${sp.cap}</text></g></g>`;
      }).join('');
    };
    let tableMsg = '';
    const drawTable = () => {
      const y = G.tableY;
      const label = tableMsg || (!items.length ? 'BÀN SẠCH TRƠN, KHỎI GIẤU GÌ HẾT' : items.every((x) => x.hiddenIn) ? 'GIẤU HẾT RỒI, CẦU TRỜI!' : 'BÀN — HÀNG CẦN GIẤU');
      tableG.innerHTML = `<rect x="-4" y="${y}" width="398" height="${G.H - y + 10}" fill="${P.steel}" ${ink()}/>
        <text class="tb-label" x="195" y="${y + 24}" font-family="Paytone One" font-size="13" text-anchor="middle" fill="${tableMsg ? P.red : P.steelDeep}">${label}</text>`;
    };
    /** Toạ độ ô món thứ i trên bàn: tối đa 4 món một hàng, canh đều theo bề ngang bàn. */
    const itemPos = (i: number) => {
      const row = Math.floor(i / PER_ROW);
      const n = Math.min(PER_ROW, items.length - row * PER_ROW);
      const gap = 390 / n;
      return { x: gap / 2 + (i % PER_ROW) * gap, y: G.tableY + 74 + row * 72 };
    };
    const drawLoose = () => {
      loose.innerHTML = '';
      items.forEach((it, i) => {
        if (it.hiddenIn) return;
        const q = itemPos(i);
        const gg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gg.setAttribute('transform', `translate(${q.x} ${q.y})`);
        gg.setAttribute('data-id', it.id);
        gg.innerHTML = `<circle r="34" fill="#FFB4A6" opacity=".6"/><svg x="-30" y="-30" width="60" height="60" viewBox="0 0 80 80">${ICONS[it.id]}</svg>`;
        gg.style.cursor = 'grab';
        gg.addEventListener('pointerdown', (e) => dragItem(e, it, gg));
        loose.appendChild(gg);
      });
    };
    let msgTimer = 0;
    const flashTable = (msg: string) => {
      tableMsg = msg;
      drawTable();
      clearTimeout(msgTimer);
      msgTimer = window.setTimeout(() => { tableMsg = ''; if (root.isConnected) drawTable(); }, 1600);
    };
    const dragItem = (e: PointerEvent, it: (typeof items)[number], gg: SVGGElement) => {
      if (doorOpen) return;
      e.preventDefault();
      sfx('pick');
      loose.appendChild(gg);
      const move = (ev: PointerEvent) => {
        const p = toStage(ev.clientX, ev.clientY);
        gg.setAttribute('transform', `translate(${p.x} ${p.y - 30}) scale(1.15)`);
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const p = toStage(ev.clientX, ev.clientY);
        const c = { x: p.x, y: p.y - 30 };
        const inBox = (sp: (typeof SPOTS)[number], q: { x: number; y: number }) => { const b = spotBox(sp); return q.x >= b.l && q.x <= b.r && q.y >= b.t && q.y <= b.b; };
        const d = (sp: (typeof SPOTS)[number]) => { const o = spotPos(sp); return Math.hypot(o.x - c.x, o.y - c.y); };
        const sp = SPOTS.filter((x) => inBox(x, c) || inBox(x, p)).sort((a, b) => d(a) - d(b))[0];
        if (!doorOpen && sp && hidden[sp.id].length < sp.cap) {
          hidden[sp.id].push(it.id);
          it.hiddenIn = sp.id;
          sfx('thud');
          shake(0.15);
          drawSpots();
          drawTable();
        } else if (sp && !doorOpen) {
          flashTable(`${sp.name.toUpperCase()} ĐẦY RỒI, GIẤU CHỖ KHÁC!`);
        }
        drawLoose();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

    /** Lời chú (gõ cửa / lục đồ): bong bóng trên tường giữa cửa và tủ lạnh, đuôi chỉ về phía cửa — không che chỗ giấu. */
    let sayTimer = 0;
    const say = (msg: string, kind: 'bad' | 'info') => {
      sayEl.textContent = noOrphan(msg);
      sayEl.className = `insp-say show ${kind}`;
      const k = G.k;
      const left = Math.round(187 * k + 14);
      sayEl.style.left = `${left}px`;
      sayEl.style.width = `${390 - left - 10}px`;
      const fridge = SPOTS.find((x) => x.id === 'tu_lanh')!;
      const fridgeTop = spotPos(fridge).y + SPOT_BOX.tu_lanh[1] * k;
      sayEl.style.top = `${Math.round(Math.max(G.hb, fridgeTop - 8 - sayEl.offsetHeight))}px`;
      gsap.fromTo(sayEl, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)', transformOrigin: '0% 50%' });
      clearTimeout(sayTimer);
      sayTimer = window.setTimeout(() => { if (root.isConnected) gsap.to(sayEl, { opacity: 0, duration: 0.25 }); }, Math.min(4000, 1600 + msg.length * 40));
    };

    watchLayout(root, layout);
    gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(banner, { y: -120 }, { y: 0, duration: 0.35, ease: 'back.out(2)' });
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
      say(['"Chủ nhà đâu, mở cửa!"', '"Mở cửa kiểm tra hành chính!"', '"Chú vô à nha!"'][i], 'bad');
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
      banner.innerHTML = 'CỐC CỐC… CẠCH!';
      setTimeout(search, 1000);
    };

    const search = () => {
      // chú vô, mở 2 chỗ
      const looseLeft = items.filter((x) => !x.hiddenIn).map((x) => x.id);
      const found = [...looseLeft, ...opened.flatMap((sp) => hidden[sp.id])];
      banner.innerHTML = 'Chú vô kiểm tra…';
      gsap.to(off, { x: '+=86', y: '+=30', scale: 1.14, transformOrigin: '50% 100%', duration: 0.7, ease: 'steps(5)' });
      gsap.fromTo(off, { rotation: -4 }, { rotation: 4, duration: 0.14, yoyo: true, repeat: 4, transformOrigin: '50% 100%', ease: 'sine.inOut', onComplete: () => { gsap.set(off, { rotation: 0 }); } });
      if (ca) gsap.to(ca, { x: '+=26', y: '+=10', duration: 0.6, delay: 0.2, ease: 'steps(4)' });
      let t = 0.8;
      opened.forEach((sp) => {
        setTimeout(() => {
          const n = hidden[sp.id].length;
          say(`"${sp.line}"`, n ? 'bad' : 'info');
          sfx(n ? 'starBad' : 'tick');
          const gEl = spotsG.querySelector(`[data-id="${sp.id}"]`);
          if (!gEl) return;
          gsap.from(gEl.querySelector('.sp-art'), { y: -14, duration: 0.4, ease: 'bounce.out' });
          // nhãn chỗ bị lục: đỏ = có hàng, xanh = trống
          const tag = gEl.querySelector('.sp-tag');
          if (tag) {
            tag.querySelector('rect')!.setAttribute('fill', n ? '#FFB4A6' : '#C9EE9A');
            tag.querySelector('text')!.textContent = n ? `Bị lục ra ${n} món!` : 'Lục rồi, trống';
          }
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
        ex.innerHTML = `<div>${noOrphan(`Chú cầm ${found.length} món lên: "Cái gì đây em?"`)}</div>${EXCUSES.map((x, i) => `<button data-i="${i}">${x}</button>`).join('')}<button class="tea">Mời chú ly trà đá…</button>`;
        root.appendChild(ex);
        gsap.fromTo(ex, { y: 300 }, { y: 0, duration: 0.3, ease: 'back.out(1.5)' });
        ex.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => {
          ex.remove();
          if (b.classList.contains('tea')) {
            addSuspicion(s, 5);
            say('"Không nhận gì hết nha, làm\u00A0việc đàng\u00A0hoàng!"', 'bad');
          }
          const convinced = !b.classList.contains('tea') && found.length <= 1 && rng() < 0.3;
          if (convinced) {
            addSuspicion(s, -10);
            grantBadge(s, 'chem_gio');
            verdict('…TIN THIỆT?', `"${b.textContent}" — chú nhìn em một hồi rồi bỏ qua. Lần sau hết nha!`, 'good', 'ok');
            return;
          }
          for (const id of fakeIds) s.stock[id] = 0;
          // công an chỉ có mặt (vẽ + banner) khi nghi ngờ ≥ 85 — lưu trước khi reset để câu kết quả khớp cảnh
          const withPolice = !!ca;
          if (found.length >= 3) {
            const fine = Math.max(100, Math.round(s.money * 0.35));
            s.money -= fine;
            s.raids++;
            s.closedDays++;
            s.suspicion = 30;
            s.followers = Math.round(s.followers * 0.8);
            verdict('BỊ LẬP BIÊN BẢN!', `${withPolice ? 'Công an phường đi cùng ghi biên bản' : 'Chú QLTT ghi biên bản'}: tịch\u00A0thu toàn bộ hàng\u00A0sỉ, phạt\u00A0${fine}k, đóng cửa 1\u00A0ngày. Lần nữa là lên\u00A0báo luôn\u00A0đó!`, 'bad', 'raid');
          } else {
            const fine = Math.max(50, Math.round(s.money * 0.15));
            s.money -= fine;
            s.suspicion = Math.max(0, s.suspicion - 20);
            verdict('BỊ PHẠT!', `Tịch\u00A0thu hàng\u00A0sỉ, phạt\u00A0${fine}k. Hôm nay vẫn được mở\u00A0tiệm.`, 'bad', 'ok');
          }
        }));
      }, t * 1000 + 300);
    };

    /**
     * V7-16: đặt thẻ kết quả theo bố cục thật (không cứng top 300px): đáy thẻ cách đỉnh hàng nhãn chỗ giấu ≥ 8px
     * (máy ngắn không cắt nửa nhãn "Gầm giường 2/2"), máy dài thì đỉnh thẻ hạ xuống dưới cổ chú QLTT (thấy trọn mặt chú),
     * và không lên quá đáy banner.
     */
    const placeVerdict = (v: HTMLElement) => {
      const rr = root.getBoundingClientRect();
      const sc = rr.height / (root.offsetHeight || 1) || 1;
      const y = (r: DOMRect | { top: number; bottom: number }, k: 'top' | 'bottom') => (r[k] - rr.top) / sc;
      // hàng nhãn chỗ giấu dưới sàn (nhãn Tủ lạnh nằm cao giữa phòng → thẻ phủ trọn, không tính)
      const tags = [...spotsG.querySelectorAll('g[data-id]:not([data-id="tu_lanh"]) .sp-tag')].map((t) => t.getBoundingClientRect()).filter((r) => r.height);
      const tagTop = tags.length ? Math.min(...tags.map((r) => y(r, 'top'))) : G.tableY;
      const minTop = banner.offsetTop + banner.offsetHeight + 8;
      const vh = v.offsetHeight;
      let top = tagTop - 8 - vh;
      const ob = off.getBoundingClientRect();
      if (ob.height && Number(getComputedStyle(off).opacity) > 0.1) {
        // cổ chú ≈ 45% chiều cao hình tính từ đỉnh mũ; đủ chỗ thì thẻ nằm ngay dưới cổ
        const neck = y(ob, 'top') + (ob.height / sc) * 0.45;
        // V8-16→V8-13: máy ngắn không đủ chỗ trên hàng nhãn → thẻ là bước kết thúc nên được đè hàng nhãn chỗ giấu,
        // hạ tới dưới cổ chú (thấy trọn mắt + miệng) miễn đáy thẻ còn cách đáy màn ≥ 12px
        top = Math.max(top, Math.min(neck + 10, root.offsetHeight - 12 - vh));
      }
      v.style.top = `${Math.round(Math.max(minTop, top))}px`;
    };
    const verdict = (h: string, body: string, kind: 'good' | 'bad', res: 'ok' | 'raid') => {
      // cảnh nền khớp kết quả: banner báo kiểm xong, thanh đếm giờ rút đi; bị tịch thu thì bàn trống trơn
      banner.innerHTML = 'ĐÃ KIỂM XONG';
      gsap.to(timer, { opacity: 0, duration: 0.2 });
      if (kind === 'bad') {
        gsap.to(loose, { opacity: 0, scale: 0.6, transformOrigin: '50% 100%', duration: 0.3 });
        clearTimeout(msgTimer);
        tableMsg = 'TỊCH THU HẾT RỒI';
        drawTable();
      }
      // lớp nền mờ dưới thẻ: cảnh lùi ra sau, mép thẻ không cắt nửa nhãn hay nhân vật
      const scrim = document.createElement('div');
      scrim.className = 'insp-scrim';
      root.appendChild(scrim);
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      const v = document.createElement('div');
      v.className = `insp-verdict ${kind}`;
      v.innerHTML = `<b>${h}</b><p>${noOrphan(body)}</p><button>Tiếp tục</button>`;
      root.appendChild(v);
      placeVerdict(v);
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
    const BASE_IDS = ['kem_tron', 'sap_ne', 'sua_duong', 'gel_nha_dam'];
    const gift = BASE_IDS.find((id) => (s.stock[id] ?? 0) > 0);
    const root = document.createElement('div');
    root.className = 'visit';
    root.innerHTML = `
      <svg viewBox="-90 -206 180 216" width="180" height="216">${beanSvg({ color: '#9ED36A', acc: ['non_bao_hiem'] as Accessory[] }).replace('face-talk" style="display:none"', 'face-talk"')}
        <g transform="translate(58 -96) rotate(-20)"><path d="M 0 0 L 40 -16 L 40 16 Z" fill="${P.steel}" ${ink(2.5)}/><rect x="-12" y="-6" width="14" height="12" fill="${P.red}" ${ink(2)}/><ellipse cx="-8" cy="1" rx="9" ry="10" fill="#9ED36A" ${ink(2.5)}/></g></svg>
      <div class="v-bub">Bác tổ trưởng nè con! Nghe nói nhà mình bán kem hả? Bà con phản ánh dữ lắm… Cho bác xin 1\u00A0hũ thoa chân\u00A0coi.</div>
      <div class="v-btns"><button class="give">${gift ? 'Biếu bác 1\u00A0hũ (−1 cốt\u00A0kem)' : 'Biếu bác 1\u00A0hũ'}</button><button class="deny">"Dạ con bán rau má thôi ạ"</button></div>`;
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
      if (gift && (s.stock[gift] ?? 0) > 0) s.stock[gift]--;
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
      'BẮT QUẢ TANG CƠ SỞ TRỘN KEM TRONG NỒI\u00A0CƠM\u00A0ĐIỆN',
      'PHÁT HIỆN "KEM BẬT TÔNG" LÀM TỪ THÙNG 20\u00A0KÝ KHÔNG NHÃN',
      'CHỦ TIỆM LIVESTREAM "100% THIÊN NHIÊN" BỊ\u00A0LẬP BIÊN\u00A0BẢN',
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
    // quãng chạy = bề rộng thật của dải chữ (gồm padding-left 100% để chữ vô từ mép phải) → hết câu cuối mới quay vòng
    const tick = root.querySelector('.tv-ticker span') as HTMLElement;
    const tw = tick.offsetWidth;
    gsap.fromTo(tick, { x: 0 }, { x: -tw, duration: tw / 90, ease: 'none', repeat: -1 });
    root.querySelector('.news-ok')!.addEventListener('click', () => gsap.to(root, { opacity: 0, duration: 0.3, onComplete: () => { root.remove(); resolve(); } }));
  });
}

/** Khung cửa + khoảng trời hẻm + cánh cửa (toạ độ bản 844; nền tường, sàn, bàn vẽ theo bố cục trong runInspection). */
function roomSvg() {
  return `<rect x="23" y="143" width="164" height="310" fill="${P.brownDark}" ${ink()}/>
    <g id="doorway">
      <rect x="30" y="150" width="150" height="300" fill="${P.sky}"/>
      <path d="M 52 196 q 6 -14 20 -8 q 10 -12 22 0 q 12 -2 10 10 h -52 z" fill="${P.white}" opacity=".9"/>
      <path d="M 120 236 q 4 -10 14 -6 q 8 -8 16 2 q 8 0 6 8 h -36 z" fill="${P.white}" opacity=".8"/>
      <path d="M 30 404 V 330 h 34 v -10 l 26 -22 l 26 22 v 10 h 64 v 74 z" fill="#F2D6A8" ${ink(2)}/>
      <rect x="74" y="336" width="32" height="26" fill="${P.sky}" ${ink(2)}/><rect x="132" y="346" width="26" height="58" fill="${P.brown}" ${ink(2)}/>
      <rect x="30" y="404" width="150" height="46" fill="#C9BFAE"/><path d="M 30 404 H 180" stroke="${P.ink}" stroke-width="2.5"/>
      <rect x="30" y="150" width="150" height="300" fill="none" ${ink()}/>
    </g>
    <g id="door"></g>`;
}

/** Đầu + thân chú QLTT: mặt nghi ngờ, cà vạt, mũ phớt vẽ riêng (gọn hơn mũ trong bean.ts). */
export function officerSvg() {
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

export function spotArt(id: string) {
  switch (id) {
    case 'noi_com': return `<ellipse cx="0" cy="22" rx="44" ry="8" fill="${P.ink}" opacity=".2"/><path d="M -38 -20 H 38 V 18 Q 0 28 -38 18 Z" fill="#fff" ${ink()}/><path d="M -42 -20 Q 0 -44 42 -20 Z" fill="${P.pink}" ${ink()}/><rect x="-8" y="-40" width="16" height="8" rx="3" fill="${P.ink}"/><rect x="-14" y="-4" width="28" height="12" rx="3" fill="${P.red}" ${ink(2)}/>`;
    case 'thung_gao': return `<path d="M -40 -30 H 40 L 36 26 H -36 Z" fill="${P.blue}" ${ink()}/><path d="M -42 -36 H 42 V -26 H -42 Z" fill="${P.blueDark}" ${ink()}/><text y="4" font-family="Paytone One" font-size="13" fill="#fff" text-anchor="middle">GẠO</text>`;
    case 'gam_giuong': return `<rect x="-56" y="-34" width="112" height="22" fill="${P.wood}" ${ink()}/><path d="M -52 -12 V 24 M 52 -12 V 24" stroke="${P.ink}" stroke-width="6"/><rect x="-46" y="-12" width="92" height="30" fill="#3A2620" opacity=".55"/>`;
    case 'tu_lanh': return `<rect x="-40" y="-120" width="80" height="150" rx="8" fill="#F4F1EA" ${ink()}/><path d="M -40 -60 H 40" stroke="${P.ink}" stroke-width="3"/><rect x="28" y="-110" width="5" height="34" rx="2" fill="${P.steelDark}"/><rect x="28" y="-50" width="5" height="40" rx="2" fill="${P.steelDark}"/>`;
  }
  return '';
}
