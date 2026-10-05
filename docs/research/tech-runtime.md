# Kem Trộn: nghiên cứu runtime và kỹ thuật (game web mobile dọc)

> Phạm vi: chọn runtime render, xử lý input/âm thanh/vòng lặp trên trình duyệt mobile, build ra 1 file HTML, chọn SFX và cách test.
> Màn hình chuẩn: 390x844 (CSS px), dọc. Ngày viết: 04/10/2026.

## 1. Kết luận

1. **Giữ Vite + TypeScript + SVG inline + GSAP làm runtime chính.** Game có ít đối tượng (≈ 30–60 node chuyển động cùng lúc), cần kéo thả, cần chữ tiếng Việt sắc nét, UI diegetic và art vector tự vẽ. Đây đúng là vùng SVG/DOM làm tốt; PixiJS/Phaser chỉ thắng khi có hàng nghìn sprite.
2. **Thêm đúng một `<canvas>` 2D cho mặt kem trong thau** (vệt khuấy, xoáy màu, bọt, khói khi "bật lửa lâu"). Đây là chỗ duy nhất có hiệu ứng pixel liên tục mà SVG làm rất đắt.
3. **Không dùng filter SVG chạy liên tục** (blur, turbulence, displacement). Bóng đổ, viền, glow vẽ sẵn bằng shape phẳng — vốn hợp style "Dumb Ways to Die".
4. **Build 1 file bằng `vite-plugin-singlefile`**, font Việt subset woff2 nhúng base64, âm thanh procedural bằng ZzFX (không file audio). Mục tiêu dưới 600 KB, trần 1,5 MB.
5. **Test:** Vitest cho `src/core` (logic thuần, không DOM), Playwright chụp ảnh 390x844 với emulate iPhone/Android, so sánh ảnh chụp.

## 2. So sánh runtime

| Tiêu chí | Vite+TS+SVG+GSAP | PixiJS v8 | Phaser 3 |
|---|---|---|---|
| Bản chất | DOM/SVG + thư viện tween | Renderer WebGL/WebGPU 2D | Framework game đầy đủ (scene, input, audio, physics) |
| Dung lượng (min+gzip, ước tính) | GSAP core ~25 KB + Draggable ~10 KB | ~150–250 KB tùy module | ~300 KB+ (gzip), ~1 MB min |
| Art vector | Gốc: SVG giữ nguyên, nét ở mọi DPR | Phải raster hoá SVG thành texture hoặc vẽ lại bằng `Graphics`; SVG tải vào Pixi bị raster, dễ mờ | Như Pixi: SVG raster thành texture |
| Chữ tiếng Việt | Font web thật, layout CSS, xuống dòng tự nhiên | `Text` raster, cần BitmapFont hoặc re-render khi đổi | Như Pixi |
| Kéo thả, hit-test | Pointer Events trên từng phần tử, `pointer-events`, hit theo hình dạng thật | EventSystem tốt, hitArea tự định nghĩa | Input plugin tốt, drag có sẵn |
| Squash & stretch | GSAP `scaleX/scaleY/transformOrigin` trên `<g>` | Tween tự viết hoặc GSAP PixiPlugin | Tween có sẵn |
| Hiệu năng 1000+ sprite | Kém (DOM nặng) | Rất tốt (batch WebGL) | Tốt |
| Hiệu năng ≤ 100 node | Tốt nếu chỉ animate `transform`/`opacity` | Tốt | Tốt |
| Accessibility, debug | Inspect bằng DevTools, `aria-label` được | Khó inspect | Khó inspect |
| Đường học | Thấp, web thuần | Trung bình | Trung bình–cao, có kiến trúc riêng |

**Vì sao không chọn Pixi/Phaser:** Kem Trộn là game "một bàn bếp" kiểu Papa's: ít vật thể, nhiều tương tác chạm, nhiều chữ (đơn, review, bình luận livestream). Lợi thế WebGL (batch nghìn sprite) gần như không dùng tới, trong khi phải trả giá: raster art vector, chữ Việt phải xử lý riêng, bundle to hơn gấp nhiều lần. Phaser 3 đã thay Pixi bằng renderer riêng; về tốc độ render thô Pixi nhanh hơn Phaser, nhưng cả hai đều thừa sức cho game này.

**Khi nào xem lại:** nếu đo trên máy tầm trung (Android ~2021, Chrome) thấy < 50 fps khi đồng thời có > 150 phần tử SVG chuyển động (vd. mưa tim livestream + hạt nghiền + khách), thì chuyển **lớp hạt/hiệu ứng** sang canvas (2D hoặc Pixi nhúng), giữ UI và nhân vật ở SVG. Không chuyển toàn bộ.

### 2.1 Quy tắc hiệu năng SVG trên điện thoại tầm trung

| Làm | Tránh |
|---|---|
| Animate `transform` (x, y, scale, rotate) và `opacity` qua GSAP | Animate thuộc tính hình học (`d`, `width`, `r`, `points`) mỗi frame trên nhiều node |
| Nhóm mỗi nhân vật/vật thể thành 1 `<g>` và chỉ tween `<g>` | Tween từng path con riêng lẻ |
| `will-change: transform` cho vài phần tử kéo thả (chỉ khi đang kéo) | Bật `will-change` cho mọi thứ (tốn bộ nhớ GPU) |
| Bóng đổ = ellipse màu đậm hơn, alpha thấp | `filter: drop-shadow()` hoặc `<feGaussianBlur>` chạy liên tục |
| `<use href="#sym">` cho nguyên liệu lặp lại | Copy path dài nhiều lần |
| Giới hạn ~200 node path trên màn, đơn giản hoá path bằng SVGO | Path xuất từ Illustrator chưa tối ưu, hàng nghìn điểm |
| Ẩn layer ngoài màn bằng `display:none` | Để `opacity:0` cho node vẫn được tính layout |
| Hạt (bụi nghiền, giọt) ≤ 30 cùng lúc, tái sử dụng (pool) | Tạo/xoá node liên tục |

Filter SVG (blur, `feTurbulence`) được phép **trong bùng ngắn, vùng nhỏ** (vd. 300 ms "khói" khi nổ mẻ), không được chạy liên tục hay phủ diện rộng; trên iOS chúng đặc biệt chậm.

### 2.2 Khi nào dùng canvas cho thau kem

Dùng `<canvas>` 2D, đặt dưới lớp SVG vành thau (thau vẽ SVG, mặt kem là canvas được clip tròn):
- **Khuấy:** vẽ vệt xoáy bằng cách xoay lớp màu theo góc khuấy; trộn màu dần giữa màu cốt và màu nguyên liệu (lerp RGB/OKLab trong core, canvas chỉ vẽ).
- **Nguyên liệu tan:** đốm màu tỏa ra (radial gradient) rồi bị kéo theo xoáy.
- **Sự cố:** sủi bọt, khói, kem chuyển xanh lét khi độc tố cao.
- Kích thước canvas = kích thước hiển thị × `min(devicePixelRatio, 2)` để tiết kiệm fill-rate trên máy DPR 3.
- Chỉ vẽ lại khi trạng thái thau thay đổi hoặc đang khuấy (dirty flag), không vẽ mỗi frame lúc rảnh.

## 3. Chi tiết mobile web

### 3.1 HTML/CSS khung

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#ffd9e6">
```

```css
html, body { margin:0; height:100%; overflow:hidden; overscroll-behavior:none; background:#ffd9e6; }
#game {
  position:fixed; inset:0;
  height:100dvh;               /* fallback: height:100vh khai báo trước */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
  touch-action:none;           /* tự xử lý mọi gesture trong game */
  user-select:none; -webkit-user-select:none;
  -webkit-touch-callout:none;  /* chặn menu giữ lâu trên iOS */
  -webkit-tap-highlight-color:transparent;
}
```

- **`100dvh`**: chiều cao động, đúng khi thanh địa chỉ co/giãn. Khai báo `100vh` trước làm fallback.
- **Safe area** chỉ có tác dụng khi `viewport-fit=cover`. Đặt UI chạm (ngăn nguyên liệu, nút gọi điện) phía trên `safe-area-inset-bottom` để tránh vạch home iOS.
- **Bố cục cố định 390x844 logic:** SVG gốc dùng `viewBox="0 0 390 844"` + `preserveAspectRatio="xMidYMid meet"`; màn dài hơn thì nền tràn ra (letterbox bằng màu nền/hoạ tiết), không kéo méo.

### 3.2 Chặn zoom, pull-to-refresh

| Vấn đề | Cách xử lý | Ghi chú |
|---|---|---|
| Double-tap zoom | `touch-action:none` (hoặc `manipulation`) trên vùng game | iOS Safari bỏ qua `user-scalable=no` từ iOS 10, nên `touch-action` là chính |
| Pinch zoom iOS | `document.addEventListener('gesturestart', e => e.preventDefault())` | Sự kiện riêng của WebKit |
| Pull-to-refresh Android Chrome | `overscroll-behavior:none` trên `html, body` | Hoạt động tốt |
| Pull-to-refresh / rubber-band iOS | Khung `position:fixed; overflow:hidden` + `touchmove` listener `{passive:false}` gọi `preventDefault()` ở vùng game | WebKit bug 275947: `overscroll-behavior` không chặn pull-to-refresh trên iOS 16; phải dựa vào layout fixed |
| Chọn chữ, menu giữ lâu | `user-select:none`, `-webkit-touch-callout:none`, chặn `contextmenu` | |

### 3.3 Kéo thả bằng Pointer Events

```ts
function makeDraggable(el: SVGGElement, onDrop: (x:number, y:number) => void) {
  el.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;                 // bỏ ngón thứ hai
    el.setPointerCapture(e.pointerId);        // giữ sự kiện dù ngón tay ra ngoài phần tử
    const start = toSvg(e); /* lưu offset */
    const move = (ev: PointerEvent) => { /* gsap.set(el, {x, y}) theo toSvg(ev) */ };
    const up = (ev: PointerEvent) => {
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      onDrop(...toSvgXY(ev));                 // core quyết định: vào thau / quay về ngăn
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up); // bắt buộc: hệ thống huỷ gesture
  });
}
// toSvg: dùng svg.getScreenCTM().inverse() để đổi toạ độ màn hình -> viewBox
```

- Luôn xử lý `pointercancel` (cuộc gọi đến, thông báo kéo xuống) để vật không bị "dính tay".
- Cache `getScreenCTM()` (cập nhật khi `resize`); `getCoalescedEvents()` chỉ dùng cho vệt khuấy trên canvas.
- Có thể dùng GSAP **Draggable** (miễn phí từ 2025, kèm cả plugin) với `type:"x,y"`, `bounds`, `hitTest()`; nhưng tự viết như trên đủ dùng, nhẹ hơn và dễ test.
- **Vùng chạm tối thiểu 44x44 px** (nguyên liệu trong ngăn), vật kéo phóng to 1.15x và nổi lên trên ngón tay ~40 px để ngón không che.
- **Thao tác khuấy:** vẽ vòng tròn trong thau; tính góc tích luỹ (`atan2`) để ra "số vòng khuấy" và tốc độ. Đây là thời điểm khoá hoàn tác (đúng ý tưởng gốc).

### 3.4 Âm thanh: mở khoá Web Audio

```ts
const ctx = new AudioContext();
const unlock = () => { if (ctx.state !== 'running') ctx.resume(); };
['pointerdown','touchend','keydown'].forEach(t =>
  window.addEventListener(t, unlock, { once:false, passive:true }));
```
- Trình duyệt chỉ cho phát âm thanh sau cử chỉ người dùng; màn "Chạm để mở sạp" vừa là title vừa là nút unlock.
- iOS: nút gạt im lặng vẫn tắt Web Audio trên nhiều phiên bản; hiển thị biểu tượng loa trong game để người chơi biết.
- Dùng một `AudioContext` duy nhất, truyền vào ZzFX (`zzfxX = ctx`).

### 3.5 Rung (haptic)

```ts
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };
buzz(15);            // thả nguyên liệu vào thau
buzz([30,40,30]);    // độc tố vượt ngưỡng
buzz([80,50,200]);   // nổ mẻ / công an gõ cửa
```
- Chỉ Android Chrome/Firefox có; iOS Safari không hỗ trợ. Rung là phụ, có công tắc tắt trong cài đặt.

### 3.6 Tạm dừng khi rời app

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { loop.pause(); gsap.globalTimeline.pause(); ctx.suspend(); save(); }
  else { loop.resume(); gsap.globalTimeline.resume(); /* resume audio sau chạm kế tiếp nếu bị chặn */ }
});
window.addEventListener('pagehide', save);   // iOS đáng tin hơn beforeunload
```
- Lưu trạng thái vào `localStorage` (bọc try/catch) mỗi khi kết thúc đơn và khi ẩn trang.
- Đồng hồ trong game (cây lớn, livestream, khách chờ) tính theo **thời gian game** (tổng dt), không theo `Date.now()`, để không gian lận khi tab ẩn. Nếu muốn "tiền thụ động khi offline", tính riêng một lần lúc mở lại, có trần.

### 3.7 Vòng lặp: fixed timestep cho logic, render theo rAF

```ts
const STEP = 1000 / 30;          // logic 30 Hz đủ cho game quản lý
let acc = 0, last = performance.now(), running = true;
function frame(now: number) {
  if (!running) return;
  let dt = Math.min(now - last, 250); last = now;  // kẹp để tránh "spiral of death"
  acc += dt;
  while (acc >= STEP) { core.tick(STEP / 1000); acc -= STEP; }  // core thuần, deterministic
  render(acc / STEP);            // nội suy alpha nếu cần
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```
- `src/core` nhận `tick(dt)` + hành động, không đụng DOM, dùng RNG có seed (vd. mulberry32) để test lặp lại được.
- Animation trang trí để GSAP tự chạy theo ticker của nó; logic game không phụ thuộc tween hoàn tất.
- Màn 120 Hz: rAF chạy 120 lần/giây nhưng logic vẫn 30 Hz; canvas thau chỉ vẽ khi dirty.

## 4. Build ra 1 file HTML

### 4.1 Cài đặt

```bash
npm create vite@latest kem-tron -- --template vanilla-ts
cd kem-tron
npm i gsap
npm i -D vite-plugin-singlefile vitest @vitest/coverage-v8 @playwright/test svgo
npx playwright install chromium webkit
# ZzFX: chép file zzfx.ts (MIT, <1 KB) vào src/audio/ hoặc: npm i zzfx
```

### 4.2 `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,   // ép mọi asset (font, ảnh) thành data URI
    cssCodeSplit: false,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 2000,
  },
  test: { environment: 'node', include: ['src/core/**/*.test.ts'] },
});
```
- `useRecommendedBuildConfig` (mặc định true) tự tắt code-split, inline dynamic import.
- Import JSON cân bằng trực tiếp: `import ingredients from '../data/ingredients.json'` (Vite bundle sẵn).
- SVG art: import dạng chuỗi `import pot from './art/pot.svg?raw'` rồi chèn vào DOM, để GSAP điều khiển được từng `<g id>`. Chạy `svgo` trước khi commit art.
- Thêm script kiểm tra kích thước: `"size": "vite build && du -h dist/index.html && gzip -c dist/index.html | wc -c"`.

### 4.3 Ngân sách dung lượng

| Phần | Ước tính |
|---|---|
| JS game + core + GSAP | 120–200 KB |
| SVG art (sau SVGO) | 100–250 KB |
| Font woff2 Việt (2 font × ~25–40 KB, base64 +33%) | 70–110 KB |
| Âm thanh ZzFX (tham số trong code) | < 3 KB |
| **Tổng mục tiêu** | **< 600 KB** (gzip ~200 KB) |

Base64 làm phình 33%; vẫn chấp nhận được vì đổi lại chạy offline, gửi file qua chat được. Nếu dùng ảnh bitmap (hiếm), dùng WebP và ≤ 50 KB/ảnh.

### 4.4 Font tiếng Việt: subset woff2

Chọn font có đủ dấu Việt và giấy phép OFL (vd. Be Vietnam Pro, Baloo 2 có bản Vietnamese, Nunito) — kiểm tra lại giấy phép trước khi dùng. Dùng 1 font tròn mập cho tiêu đề/bong bóng thoại, 1 font thường cho chữ nhỏ.

```bash
pip install fonttools brotli
pyftsubset BeVietnamPro-Bold.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303,U+0309,U+0323,U+1EA0-1EF9,U+20AB,U+2026,U+2018-201D" \
  --layout-features='kern,liga,ccmp,mark,mkmk' \
  --flavor=woff2 --output-file=src/fonts/bvp-bold.vi.woff2
```
- `U+1EA0-1EF9` là khối Latin Extended Additional chứa gần hết chữ có dấu Việt; `U+20AB` là ký hiệu ₫.
- Giữ `ccmp/mark/mkmk` để dấu kép xếp đúng khi văn bản ở dạng tổ hợp (NFD).
- Cách thay thế **glyphhanger** (`npm i -g glyphhanger`): `glyphhanger ./dist/index.html --subset=font.ttf --formats=woff2` — tự quét ký tự thực dùng; chỉ hợp khi toàn bộ chữ có sẵn trong data, không hợp nếu sinh tên khách/bình luận động. Vì vậy ưu tiên dải cố định ở trên.
- Nhúng: `@font-face { font-family:'KT'; src:url('./fonts/bvp-bold.vi.woff2') format('woff2'); font-display:block; }` — Vite inline thành data URI nhờ `assetsInlineLimit`.
- Chữ trong SVG dùng `<text>` với cùng font; chuẩn hoá chuỗi về NFC (`str.normalize('NFC')`) khi nạp data.

## 5. Âm thanh

### 5.1 ZzFX hay gói Kenney

| | ZzFX | Kenney (CC0) |
|---|---|---|
| Giấy phép | MIT, ghi credit trong code | CC0, không cần ghi công |
| Dung lượng | < 1 KB thư viện + ~60 byte/âm | Mỗi OGG 5–30 KB; 20 âm ≈ 200–400 KB base64 |
| Chất lượng | Bíp/beep 8-bit, chỉnh được ngay, có random | Âm thật (click, va chạm, giấy, kim loại) |
| Hợp với Kem Trộn | Tiếng "pop", "ting", "bùm", "rè rè" hài; biến thể ngẫu nhiên tránh nhàm | Tiếng nước, sột soạt, chạm lọ thuỷ tinh |

**Đề xuất:** ZzFX cho ~85% SFX (nhẹ, hài, tự biến điệu), lấy 2–4 âm Kenney đặc trưng (rót/khuấy, nắp lọ, máy xay) nếu ZzFX nghe quá "game bíp". Thiết kế bằng ZzFX Sound Designer (trang web của tác giả), dán mảng tham số vào `data/sfx.json`.

Thứ tự tham số ZzFX: `[volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo]`. Shape: 0 sin, 1 tam giác, 2 răng cưa, 3 tan, 4 noise.

### 5.2 Danh sách ~20 SFX (tham số khởi điểm, cần nghe chỉnh lại)

| # | Sự kiện | Gợi ý tham số ZzFX |
|---|---|---|
| 1 | Nhấc nguyên liệu khỏi ngăn | `[.6,.05,600,,.01,.05,,1.5,20]` |
| 2 | Thả vào thau ("bõm") | `[.8,.1,180,.01,.03,.15,,2,-8,,,,,.1]` |
| 3 | Bỏ nguyên liệu ra (hoàn tác) | `[.5,.05,400,,.02,.08,,1,-30]` |
| 4 | Máy xay chạy (lặp, gọi mỗi 0,2 s) | `[.4,.2,90,.02,.18,.05,2,1,,,,,.03,.6,,.3]` |
| 5 | Nghiền cối | `[.5,.3,120,,.05,.08,4,1]` |
| 6 | Khuấy (mỗi vòng) | `[.3,.2,300,.02,.05,.1,0,1,5]` |
| 7 | Độc tố tăng (tick cảnh báo) | `[.5,0,880,,.02,.05,1,,,,,,,,,.2]` |
| 8 | Độc tố vượt ngưỡng (còi) | `[.7,0,520,.01,.3,.1,2,1,,,,,.1,,20]` |
| 9 | Hỏng mẻ / bùm | `[1.2,.1,60,.01,.2,.6,4,2,-2,,,,,1,,.4]` |
| 10 | Đóng nắp hũ | `[.6,.05,320,,.01,.04,,2,,,200,.02]` |
| 11 | Dán nhãn (soạt) | `[.4,.3,1200,.01,.04,.06,4,1,-50]` |
| 12 | Khách tới (chuông cửa) | `[.6,0,660,,.1,.3,,,,,220,.1]` |
| 13 | Nhận tiền (ting ting) | `[.7,0,1046,,.05,.25,,,,,523,.06]` |
| 14 | Review 5 sao | `[.8,0,523,.01,.1,.4,,,,,262,.08,.08]` |
| 15 | Review 1 sao / hoàn tiền | `[.7,0,300,.02,.15,.3,2,1,-3]` |
| 16 | Gọi điện (tút tút) | `[.5,0,425,,.25,.05,,,,,,,.5]` |
| 17 | Trả giá thành công | `[.7,0,700,,.06,.2,1,,,,350,.05]` |
| 18 | Livestream: tim bay | `[.3,.3,1500,,.01,.04,,1,40]` |
| 19 | Livestream: "chốt đơn" | `[.8,0,784,,.08,.2,1,,,,392,.04,.04]` |
| 20 | Còi công an | `[.8,0,700,.05,.6,.1,0,1,,,-200,.25,.25,,,,,,,.5]` |
| 21 | Tưới cây / thu hoạch | `[.5,.2,900,.01,.05,.12,0,1,-20,,,,,.2]` |

Mẹo: tham số `randomness` (0,05–0,3) giúp cùng một âm nghe khác nhau mỗi lần. Giới hạn đồng thời ~6 âm; âm lặp (máy xay) dùng throttle.

## 6. Asset miễn phí có ích (phụ trợ, art chính tự vẽ)

| Nguồn | Gói | Dùng cho | Giấy phép |
|---|---|---|---|
| Kenney | Interface Sounds (100 OGG), Impact Sounds, UI Audio | Âm thật bổ sung | CC0 |
| Kenney | Game Icons, Input Prompts | Icon tạm khi prototype | CC0 |
| Kenney | Particle Pack | Tham khảo hình hạt, khói | CC0 |
| OpenGameArt | Lọc tag CC0 (âm thanh bếp, nước) | Âm thật | Kiểm tra từng file, nhiều file là CC-BY |
| Google Fonts | Font có bản Vietnamese, OFL | Chữ | OFL 1.1 |

Ghi file `CREDITS.md` ngay từ đầu, kể cả với CC0, để biết nguồn khi cần thay.

## 7. Testing

### 7.1 Vitest cho `src/core`

- Test bất biến cân bằng: mọi công thức gợi ý trong data đều đạt yêu cầu đơn; không nguyên liệu nào thống trị mọi chỉ số; budget luôn có ít nhất 1 lời giải có lãi.
- RNG có seed để test kịch bản ngày chơi (simulate 7 ngày, kiểm tra tiền không âm vô hạn). Lệnh: `npx vitest run --coverage`.

### 7.2 Playwright chụp ảnh 390x844

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npx vite preview --port 4173', port: 4173 },
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], viewport:{ width:390, height:844 } } },
    { name: 'android', use: { ...devices['Pixel 7'], viewport:{ width:390, height:844 } } },
  ],
});
```
```ts
// e2e/screens.spec.ts
import { test, expect } from '@playwright/test';
test('màn bếp ban đầu', async ({ page }) => {
  await page.goto('/?seed=42&noanim=1');       // tắt animation, seed cố định
  await page.tap('#start');
  await expect(page).toHaveScreenshot('kitchen.png', { maxDiffPixelRatio: 0.01 });
});
```
- Hỗ trợ `?seed=` và `?noanim=1` (gọi `gsap.globalTimeline.timeScale(1000)` hoặc tắt tween) để ảnh chụp ổn định.
- Lệnh: `npx playwright test`, cập nhật ảnh chuẩn: `npx playwright test --update-snapshots`.
- WebKit trên Linux không giống hệt Safari iOS (không có pull-to-refresh, safe-area = 0). Vẫn cần thử tay trên 1 iPhone và 1 Android tầm trung trước mỗi mốc.

### 7.3 Đo hiệu năng
- Chrome DevTools > Performance, bật CPU throttling 4x để mô phỏng máy tầm trung.
- Gắn đồng hồ FPS debug (`?debug=1`) hiển thị fps, số node SVG, số tween đang chạy.
- Ngưỡng chấp nhận: ≥ 55 fps khi kéo thả, ≥ 45 fps lúc cao trào (nổ mẻ + livestream).

## Nguồn

- vite-plugin-singlefile README: https://unpkg.com/vite-plugin-singlefile@2.3.3/README.md
- ZzFX (MIT, 20 tham số): https://github.com/KilledByAPixel/ZzFX ; npm: https://npmjs.com/package/zzfx
- PixiJS vs Phaser (tốc độ render, dung lượng): https://abratabia.com/pixijs/pixijs-vs-phaser.php
- Phaser 3 không dùng Pixi: https://www.html5gamedevs.com/topic/34261-does-phaser-3-use-pixijs
- SVG trong Pixi bị raster: https://www.html5gamedevs.com/topic/22023-using-gsap-svg/
- Hiệu năng filter SVG trên iOS: https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/ ; https://dev.to/hexshift/animating-svg-filters-for-motion-based-ui-and-art-effects-3l6
- overscroll-behavior: https://developer.chrome.com/blog/overscroll-behavior ; WebKit bug 275947: https://bugs.webkit.org/show_bug.cgi?id=275947 ; https://matuzo.at/blog/2022/100daysof-day53
- pyftsubset / subset font: https://clagnut.com/blog/2418 ; https://addons-frontend.readthedocs.io/en/latest/fonts/
- Kenney Interface Sounds (CC0): https://opengameart.org/content/interface-sounds ; https://github.com/Calinou/kenney-interface-sounds
- MDN (kiến thức nền, không fetch trong phiên này): Pointer Events / setPointerCapture, touch-action, env(), Page Visibility API, Vibration API, Autoplay policy for Web Audio.
- Tham số ZzFX trong bảng 5.2 là điểm khởi đầu do người viết đề xuất, cần nghe và chỉnh trên ZzFX Sound Designer.
