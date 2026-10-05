# Code tham khảo cho "Kem Trộn": copy được gì, học được gì

> Mảng: reference-code · Ngày: 04/10/2026
> Phạm vi: mã nguồn mở và thư viện giúp viết ít bug cho game web mobile dọc (Vite + TS + inline SVG + GSAP, build ra 1 file HTML).
> Đã đối chiếu với repo: `package.json` đang có `gsap ^3.15.0`, `vite-plugin-singlefile ^2.3.3`, `vitest`, `typescript`. Mọi số dung lượng dưới đây đo trực tiếp trên `node_modules/gsap/dist`.

## Kết luận trước

| Nhu cầu | Chọn | License | Lý do chốt |
|---|---|---|---|
| Animation, squash & stretch | **GSAP core** + `CustomWiggle`, `CustomBounce` | GSAP Standard "No Charge" (miễn phí cả thương mại) | Đã cài; ease đàn hồi có sẵn, hợp phong cách hạt đậu |
| Kéo thả nguyên liệu | **GSAP Draggable** (+ `InertiaPlugin` cho cú ném vào thùng rác) | như trên | Hỗ trợ SVG, `hitTest()` sẵn, chạy tốt touch; không thêm thư viện thứ hai |
| Phương án dự phòng kéo thả | Pointer Events tự viết (~60 dòng) | — | Khi cần kiểm soát tuyệt đối hoặc Draggable gây lỗi trong SVG lồng scale |
| Trộn màu kem | **spectral.js** | MIT | Trộn kiểu sơn thật (Kubelka-Munk), dùng thương mại thoải mái |
| Bề mặt kem xoáy | SVG `feTurbulence` + `feDisplacementMap` trên lớp màu, không dùng goo filter cho phần chính | — | Nhẹ, không cần WebGL; goo filter lỗi trên Safari |
| RNG có seed | **mulberry32** (chép 6 dòng, public domain) | Public domain | Nhanh, đủ tốt cho game, tái lập bug được |
| State machine | Tự viết FSM bằng bảng chuyển trạng thái có kiểu TS | — | XState quá nặng cho 1 file HTML; chỉ cần ~40 dòng |
| Lưu game | `localStorage` + `version` + chuỗi hàm migrate + try/catch | — | Không cần thư viện |
| Đóng gói | **vite-plugin-singlefile** | MIT | Đã cài, inline toàn bộ JS/CSS vào `dist/index.html` |

**Không dùng:** Mixbox (CC BY-NC 4.0, cấm thương mại), interact.js (MIT, tốt nhưng trùng chức năng Draggable, thêm ~30–40 KB), XState (dư so với nhu cầu), Matter.js/physics engine (không cần vật lý thật cho thau kem).

---

## 1. Game crafting / potion / cooking mã nguồn mở

Thực tế tìm kiếm: **không có repo JS/TS nào vừa là clone Potion Craft vừa đủ chất lượng để copy nguyên khối**. Các game Papa's-style trên web phần lớn là template thương mại (CodeCanyon, Construct 3) — không mở mã. Vì vậy hướng đúng là **học pattern, tự viết core thuần TS có test**.

| Dự án | Link | Ngôn ngữ / License | Học được gì | Dùng? |
|---|---|---|---|---|
| Witch Craft (game jam) | https://alestiago.itch.io/1st-flame-game-jam · src: https://github.com/alestiago/1st-flame-game-jam | Có vẻ Flutter/Flame (Dart) — license cần kiểm tra trong repo | Vòng "đơn yêu cầu → kéo lọ vào vạc → so khớp công thức" | Chỉ đọc thiết kế, không copy code |
| Potion Seller | https://krabgor.itch.io/potion-seller | Nguồn trên GitHub (link trong trang itch), license chưa xác minh | Kéo nguyên liệu vào vạc rồi đóng chai — gần flow "trộn → chọn hũ" | Đọc tham khảo |
| Matcha Making Game | mirror: https://gitblind.noratr.app/nnicolee/matcha | Next.js + React + TS; license chưa xác minh | Tách `Bowl.tsx` (vùng thả) và `DraggableItem.tsx` (vật kéo), feedback từng bước | Học cách tách component vùng thả / vật kéo |
| Potions Panic | https://gitea.com/15gay/Potions-Panic | JS, **không open source** (chỉ dùng cá nhân) | — | Không dùng |
| Mystic Brew, Alchemy Inc | https://kemalys.itch.io/mystic-brew · https://blackmagemario.itch.io/alchemy-inc | Game jam, không rõ mã | Ý tưởng UX kéo thả tự do | Chỉ chơi thử |
| Danh sách game clone mã mở | https://github.com/BoofOof32/osgameclones (fork của osgameclones) | Data CC | Tra nhanh clone theo thể loại | Tra cứu |

### Logic trộn chỉ số nên tự viết (pattern rút ra)

Potion Craft đẩy một con trỏ trên bản đồ 2D; Kem Trộn cần **vector chỉ số nhiều chiều + thanh độc tố**. Pattern gọn, dễ test:

```ts
// src/core/mix.ts — thuần, không đụng DOM
export type Stat = 'tone' | 'pore' | 'spf' | 'dry' | 'smell';
export type Vec = Record<Stat, number>;
export interface Ingredient { id: string; stats: Partial<Vec>; toxin: number; tags: string[]; cost: number; color: string; }
export interface Combo { a: string; b: string; toxin: number; note: string } // cặp phối bậy (tag × tag)

export function preview(base: Ingredient, items: Ingredient[], combos: Combo[]) {
  const all = [base, ...items];
  const stats = {} as Vec;
  for (const it of all) for (const [k, v] of Object.entries(it.stats)) stats[k as Stat] = (stats[k as Stat] ?? 0) + v!;
  let toxin = all.reduce((s, it) => s + it.toxin, 0);
  const hits: Combo[] = [];
  for (const c of combos) if (hasTag(all, c.a) && hasTag(all, c.b)) { toxin += c.toxin; hits.push(c); }
  return { stats, toxin, hits, ruined: toxin >= 100 };
}
```

Điểm đáng học:
- **Preview = hàm thuần gọi lại mỗi lần thả/bỏ nguyên liệu.** Vì không mutate, "bỏ ra" chỉ là xoá khỏi mảng rồi gọi lại → hoàn tác miễn phí, không bug lệch trạng thái. Chỉ khi bắt đầu khuấy mới "đóng băng" (FSM chuyển `prep → stirring`).
- **Độc tố tách 2 nguồn:** cộng tuyến tính từ nguyên liệu + phạt theo cặp tag (bảng `combos` trong `data/combos.json`). Người chơi hiểu được, designer cân bằng được bằng JSON.
- **Bù trừ:** cho phép stats âm (vd "chanh" +tone −dry). Giữ tổng biên độ mỗi nguyên liệu ≈ hằng số để không có nguyên liệu "thống trị".
- **Chấm đơn hàng:** khoảng cách có trọng số giữa `stats` và `order.target`, cộng điểm phạt nếu vượt budget → ra sao review. Viết test vitest cho từng hàm; cân bằng bằng script chạy hàng nghìn đơn ngẫu nhiên có seed (xem mục 5).

---

## 2. Trộn màu giống sơn thật

| Thư viện | Link | License | Kích thước / cách dùng | Kết luận |
|---|---|---|---|---|
| **spectral.js** (Ronald van Wijnen) | https://github.com/rvanwijnen/spectral.js · npm `spectral.js` | **MIT** | 1 file JS nhỏ, không phụ thuộc. Đổi sRGB sang phổ phản xạ (380–730 nm, bước 10 nm) bằng 7 đường cong gốc, trộn bằng phương trình Kubelka-Munk | **Dùng.** Vàng + xanh dương ra xanh lá, không ra xám như trộn RGB |
| Mixbox (Secret Weapons) | https://github.com/scrtwpns/mixbox | **CC BY-NC 4.0** — cấm thương mại, muốn thương mại phải mua (mixbox@scrtwpns.com) | Chính xác hơn, có bản JS/GLSL | **Không dùng.** Nếu game có quảng cáo/IAP sau này là vi phạm |
| Trộn tuyến tính trong không gian OKLab | tự viết ~20 dòng | — | Đẹp hơn RGB nhưng vẫn không có hiệu ứng "sơn" | Dự phòng nếu không muốn thêm thư viện |

Cách áp vào game:
- Mỗi nguyên liệu có `color` trong JSON; màu kem = trộn có trọng số theo **lượng** (số lần thả) của từng nguyên liệu.
- spectral.js trộn được nhiều màu kèm hệ số; API khác nhau giữa v2 và v3 (v3 dùng đối tượng `Color`) → **khoá phiên bản trong package.json** và bọc một hàm `mixColors(list: {hex, weight}[]): string` trong `src/core/color.ts` để đổi thư viện không ảnh hưởng chỗ khác.
- Tính màu **một lần** khi thay đổi nguyên liệu (không tính mỗi frame), cache theo khoá chuỗi id đã sắp xếp.
- Twist hài: độc tố > 60 thì pha thêm xám-xanh rêu; > 90 thì ánh tím "phóng xạ". Làm bằng chính `mixColors` với một "nguyên liệu ảo".

---

## 3. Kéo thả trên mobile

### 3.1 GSAP Draggable — chọn làm mặc định

- License: package `gsap` trong repo ghi `"Standard 'no charge' license: https://gsap.com/standard-license"`. Từ 30/04/2025 (Webflow mua GSAP), **mọi plugin kể cả SplitText, MorphSVG, Inertia đều miễn phí, dùng thương mại được**, có sẵn trong npm `gsap`, không cần token.
- Điều cấm duy nhất cần biết: không dùng GSAP để làm **công cụ dựng animation trực quan không cần code cạnh tranh với Webflow**. Một game không thuộc diện này.
- Đã có sẵn trong `node_modules/gsap`: `Draggable.js`, `InertiaPlugin.js`, `MorphSVGPlugin.js`, `CustomWiggle.js`, `CustomBounce.js`, `Physics2DPlugin.js`.

Dung lượng đo thực tế (minified / gzip):

| File | min | gzip |
|---|---|---|
| gsap core | 72,9 KB | 28,3 KB |
| Draggable | 35,8 KB | 13,5 KB |
| InertiaPlugin | 7,3 KB | 3,3 KB |
| MorphSVGPlugin | 21,2 KB | 9,6 KB |
| CustomWiggle / CustomBounce | ~2,2 KB mỗi cái | ~1,2 KB |
| Physics2DPlugin | 2,2 KB | 1,2 KB |

Tổng gói đề xuất (core + Draggable + Inertia + Wiggle + Bounce) ≈ 120 KB min / ~47 KB gzip — chấp nhận được cho 1 file HTML.

Đoạn nên viết:

```ts
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
gsap.registerPlugin(Draggable);

Draggable.create(clone, {
  type: 'x,y', zIndexBoost: true,
  onPress() { gsap.to(this.target, { scale: 1.15, duration: 0.15 }); },     // nhấc lên
  onDrag() { tub.classList.toggle('hot', this.hitTest(tubZone, '40%')); },   // highlight vùng thả
  onRelease() {
    if (this.hitTest(tubZone, '40%')) dispatch({ t: 'ADD', id });             // logic nằm ở core
    else gsap.to(this.target, { x: 0, y: 0, scale: 1, ease: 'back.out(2)' }); // bật về ngăn
  },
});
```

Lưu ý tránh bug:
- Kéo **bản sao** (clone) nổi trên lớp overlay, không kéo phần tử nằm trong ngăn → tránh lỗi toạ độ do `transform`/`viewBox` lồng nhau.
- Đặt `touch-action: none` trên vật kéo và vùng chơi; `user-select: none`; chặn `contextmenu` (long-press trên iOS).
- `hitTest(zone, '40%')` dùng ngưỡng chồng lấn thay vì chỉ toạ độ ngón tay — dễ thả trúng hơn trên màn nhỏ.
- Logic (thêm/bỏ nguyên liệu) gọi qua `dispatch` vào core; Draggable chỉ lo hình ảnh.

### 3.2 Pointer Events tự viết — phương án dự phòng

Đủ dùng nếu chỉ cần kéo-thả đơn giản (không quán tính):

```ts
el.addEventListener('pointerdown', e => {
  el.setPointerCapture(e.pointerId);            // không mất sự kiện khi ngón tay ra ngoài phần tử
  const sx = e.clientX, sy = e.clientY;
  const move = (m: PointerEvent) => { el.style.transform = `translate(${m.clientX - sx}px,${m.clientY - sy}px)`; };
  const up = (u: PointerEvent) => { el.releasePointerCapture(u.pointerId); el.removeEventListener('pointermove', move); onDrop(u); };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up, { once: true });
  el.addEventListener('pointercancel', up, { once: true }); // iOS hay bắn cancel khi có cử chỉ hệ thống
});
```

Đổi toạ độ màn hình sang toạ độ SVG bằng `svg.getScreenCTM().inverse()` + `DOMPoint.matrixTransform` — bắt buộc khi SVG co giãn theo màn hình.

### 3.3 interact.js

- Link: https://github.com/taye/interact.js · License **MIT**. Có drag, dropzone, inertia, snapping, multi-touch, chạy với SVG.
- Có `dropzone` khai báo sẵn (ondragenter/ondrop) — mô hình đáng học.
- **Không chọn** vì đã có GSAP; thêm thư viện thứ hai làm phình file và hai hệ toạ độ dễ xung đột.

---

## 4. Vẽ kem / chất lỏng xoáy

| Kỹ thuật | Cách làm | Ưu | Nhược | Dùng cho |
|---|---|---|---|---|
| **Displacement swirl** | Lớp kem phẳng (ellipse + vài vệt màu nguyên liệu) áp `filter: url(#swirl)` gồm `feTurbulence` (baseFrequency ~0.02, numOctaves 2) → `feDisplacementMap` (scale 10–30). GSAP tween `seed`/`baseFrequency` hoặc xoay nhóm vệt màu khi khuấy | Ít code, trông "sệt", hợp vector phẳng | Filter tốn GPU trên máy yếu → chỉ áp cho vùng thau, giới hạn kích thước | **Mặt kem trong thau** |
| Vệt xoắn bằng path | Mỗi nguyên liệu là một `path` xoắn ốc màu riêng, dùng `stroke-dasharray` + xoay theo góc khuấy; trộn xong thì tween opacity các vệt về 0, lớp màu chung hiện lên | Hoàn toàn kiểm soát, không filter, đẹp kiểu cartoon | Phải vẽ path | Hiệu ứng **lúc đang khuấy** |
| Goo / metaball SVG | `feGaussianBlur stdDeviation=8` → `feColorMatrix` alpha `0 0 0 18 -7` → `feComposite` | Giọt dính nhau, hợp cảnh thả nguyên liệu "bõm" vào kem | Safari/Firefox áp phần alpha của feColorMatrix không ổn định trên phần tử DOM → có thể chỉ thấy mờ | Chỉ hiệu ứng phụ (giọt bắn), có phương án tắt |
| Canvas 2D metaball | Vẽ các hình tròn mờ ra canvas offscreen, threshold alpha | Ổn định đa trình duyệt | Lệch phong cách với SVG, thêm một hệ vẽ | Không cần ở bản đầu |
| Shader WebGL | Swirl fragment shader nhỏ | Đẹp nhất | Phức tạp, khó build 1 file + fallback | Không dùng |

Nguồn mẫu: CSS-Tricks "The gooey effect" (https://css-tricks.com/?p=195076), Codrops creative gooey (https://tympanus.net/codrops/?p=23487), tổng hợp hiệu ứng lỏng: https://freefrontend.com/css-liquid-effects/ .

Mẹo squash & stretch cho thau/máy xay: `gsap.to(el, { scaleX: 1.12, scaleY: 0.88, yoyo: true, repeat: 1, duration: 0.12, transformOrigin: '50% 100%' })`, hoặc `CustomWiggle` cho máy xay rung. Luôn đặt `transformOrigin` ở đáy để vật "nảy" trên mặt bàn.

---

## 5. Hạ tầng nhỏ: RNG, state machine, save

### 5.1 RNG có seed — mulberry32

Nguồn: bryc, https://github.com/bryc/code/blob/master/jshash/PRNGs.md (public domain). Theo bảng benchmark trong đó, mulberry32 nhanh nhất nhóm 32-bit và qua gjrand; sfc32 là lựa chọn tốt nhất nếu cần state 128-bit.

```ts
export function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Quy tắc: **core không bao giờ gọi `Math.random()`**. Mỗi ngày trong game có `seed = hash(saveSeed, day)` → khách, giá, incident livestream tái lập được; bug report chỉ cần gửi seed. Lưu trạng thái RNG (số nguyên `a`) vào save để load lại không đổi kết quả.

### 5.2 State machine tối giản

```ts
type Phase = 'idle' | 'order' | 'prep' | 'stirring' | 'jar' | 'label' | 'serve' | 'review';
type Ev = { t: 'ACCEPT' } | { t: 'START_STIR' } | { t: 'STIR_DONE' } | { t: 'PICK_JAR'; id: string } | { t: 'SERVE' } | { t: 'NEXT' };
const table: Record<Phase, Partial<Record<Ev['t'], Phase>>> = {
  idle: { ACCEPT: 'order' }, order: { ACCEPT: 'prep' }, prep: { START_STIR: 'stirring' },
  stirring: { STIR_DONE: 'jar' }, jar: { PICK_JAR: 'label' }, label: { SERVE: 'serve' },
  serve: { NEXT: 'review' }, review: { NEXT: 'idle' },
};
export function next(p: Phase, e: Ev): Phase { return table[p][e.t] ?? p; } // sự kiện sai pha bị bỏ qua
```

- Chỉ pha `prep` nhận `ADD`/`REMOVE` nguyên liệu → luật "khuấy rồi không hoàn tác" được đảm bảo bằng cấu trúc, không bằng if rải rác.
- Livestream, gọi điện mua hàng, vườn là **FSM con riêng**, chạy song song; giao tiếp qua event bus nhỏ (`Map<string, Set<fn>>`).
- Tham khảo nếu muốn thư viện: XState (MIT, mạnh nhưng nặng), Robot (`robot3`, rất nhỏ). Bản đầu tự viết là đủ.

### 5.3 Save localStorage có version

```ts
const KEY = 'kemtron.save';
const CURRENT = 3;
const migrations: Record<number, (s: any) => any> = {
  1: s => ({ ...s, version: 2, recipes: s.recipes ?? [] }),
  2: s => ({ ...s, version: 3, garden: s.garden ?? { plots: [] } }),
};
export function load(): Save {
  try {
    let s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!s) return fresh();
    while (s.version < CURRENT) s = migrations[s.version](s);
    return validate(s) ? s : fresh();
  } catch { return fresh(); }        // private mode, JSON hỏng, quota
}
export function save(s: Save) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* bỏ qua, báo nhẹ trên UI */ } }
```

- Ghi save ở **mốc rõ ràng** (kết thúc đơn, cuối ngày), không ghi mỗi frame.
- Giữ bản `kemtron.save.bak` trước khi migrate.
- Test vitest: một save mẫu cho mỗi version cũ → migrate → khớp schema mới.

---

## 6. Đóng gói 1 file HTML

- `vite-plugin-singlefile` (richardtallent, **MIT**) — https://github.com/richardtallent/vite-plugin-singlefile. Inline toàn bộ JS/CSS vào `dist/index.html`; tuỳ chọn `removeViteModuleLoader: true` để bỏ hàm nạp module thừa.
- SVG nhân vật/props: import dạng chuỗi (`?raw`) rồi chèn vào DOM, không dùng `<img src>` → vẫn chỉnh màu/animate được và không sinh file riêng.
- Font: nhúng 1 font tiếng Việt subset (woff2 base64) hoặc dùng font hệ thống; không gọi Google Fonts lúc chạy.
- Âm thanh (nếu có): base64 ngắn, nạp lười sau tương tác đầu tiên (iOS yêu cầu).

---

## 7. Cấu trúc code đề xuất

```
src/core/      mix.ts, color.ts, score.ts, rng.ts, fsm.ts, economy.ts, save.ts   ← thuần, 100% test vitest
src/view/      tub.ts, blender.ts, shelf.ts, phone.ts, garden.ts                 ← SVG + GSAP, không chứa luật chơi
src/input/     drag.ts (bọc Draggable, xuất dispatch)
data/          ingredients.json, combos.json, orders.json, jars.json, labels.json
```

Nguyên tắc chống bug: view chỉ đọc state và gửi event; core không biết DOM; mọi ngẫu nhiên đi qua RNG có seed; mọi số cân bằng nằm trong `data/*.json` có kiểm tra schema khi khởi động.

---

## Nguồn

- spectral.js: https://github.com/rvanwijnen/spectral.js · https://npmjs.com/package/spectral.js
- Mixbox: https://github.com/scrtwpns/mixbox · https://scrtwpns.com/mixbox/docs/
- GSAP Standard License: https://gsap.com/community/standard-license/ · bản lưu: https://scancode-licensedb.aboutcode.org/gsap-standard-no-charge-2025.html · thông báo miễn phí: https://discourse.webflow.com/t/webflow-makes-gsap-100-free/319967
- interact.js: https://github.com/taye/interact.js · https://npmjs.com/package/interactjs
- vite-plugin-singlefile: https://unpkg.com/vite-plugin-singlefile@2.3.3/README.md
- PRNG: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
- Gooey/liquid SVG: https://css-tricks.com/?p=195076 · https://tympanus.net/codrops/?p=23487 · https://freefrontend.com/css-liquid-effects/
- Game tham khảo: https://alestiago.itch.io/1st-flame-game-jam · https://krabgor.itch.io/potion-seller · https://gitblind.noratr.app/nnicolee/matcha · https://gitea.com/15gay/Potions-Panic · https://kemalys.itch.io/mystic-brew · https://blackmagemario.itch.io/alchemy-inc · https://github.com/BoofOof32/osgameclones
- Kiểm tra tại chỗ: `node_modules/gsap/package.json` (trường license), `node_modules/gsap/dist/*.min.js` (dung lượng).
