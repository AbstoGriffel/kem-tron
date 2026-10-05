# CLAUDE.md — Kem Trộn

Game cá nhân, tách biệt khỏi Moni. Không áp quy trình Moni (Jira, eval, write-doc).

## Nguồn sự thật
- Thiết kế: `docs/gdd.md` (bản chốt). Research gốc: `docs/research/*.md`.
- Số liệu cân bằng: `src/data/*.json` (nguyên liệu, đơn khách, kinh tế, thoại). Không hardcode số trong code.

## Kiến trúc
- `src/core/` — logic thuần TS, deterministic (RNG mulberry32 có seed theo ngày). Không import DOM.
  - `mix.ts` tính mẻ kem (cộng dồn có trần, combo, quá tay, hàng dỏm cắn nhau, đun). `score.ts` chấm sao. `serve.ts` áp kết quả giao hàng.
  - `state.ts` save + khách theo ngày. `day.ts` chốt sổ / sang ngày (vườn, review trễ, kiểm tra). `live.ts` mô hình livestream. `solver.ts` vét cạn công thức (dùng cho test cân bằng).
- `src/art/` — art SVG vẽ tay bằng code (palette `kit.ts`, cảnh `scene.ts`, đạo cụ `props.ts`, rig hạt đậu `bean.ts`, icon `icons/*.ts` khung 80×80).
- `src/ui/` — màn hình + tương tác (GSAP). `shop.ts` là màn bán hàng chính.
- Stage cố định 390×844 co giãn vừa màn hình (`ui/stage.ts`). Lớp: `#world` (scene svg, `#over`, `#hud`, `#fx`) → `#drag` → `#modal`.

## Bẫy đã gặp
- GSAP tween `x`/`y` tuyệt đối trên phần tử SVG có sẵn `transform="translate(...)"` sẽ GHI ĐÈ translate → luôn bọc 1 `<g>` ngoài giữ translate, tween `<g>` trong (hoặc dùng `'+=…'`).
- Modal mới phải có `z-index` cao hơn `.morning` (41).

## Lệnh
- `npm run dev` (port 5180, `?day=N` nhảy ngày để thử), `npm test`, `npm run build` → `dist/index.html` (1 file).
- Xem art: `/#icons`, `/#beans`. Chụp ảnh: `python3 shot.py <url> <out.png>`; chơi thử tự động: `python3 playtest.py`.

## Phát hành
- KHÔNG publish Claude Artifact (account dùng chung). Chia sẻ bằng dev server qua IP máy chủ hoặc file dist/index.html.
- Tham số dev (chỉ dev server): `?day=N`, `?insp=1` (ép QLTT kiểm tra), `?warn=1` (tổ trưởng ghé); `window.__game` để điều khiển khi test.
