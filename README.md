# Kem Trộn 🧴

Game web màn dọc (mobile), châm biếm văn hoá "kem trộn" bán online ở Việt Nam. Nghe khách nói kiểu mạng → trộn kem trong thau nhôm → khuấy → đóng hũ dán nhãn → đưa khách. Vừa làm vừa livestream, gọi mối nhập hàng trả giá kiểu "giả vờ cúp máy", trồng dưa leo ngoài ban công, và… coi chừng chú Quản Lý Thị Trường.

## Chạy
```bash
npm install
npm run dev        # http://localhost:5180  (thêm ?day=5 để nhảy thẳng ngày 5)
npm run build      # ra dist/index.html — 1 file, mở bằng trình duyệt điện thoại là chơi
npm test
npm run test:cloud # test API lưu lên mây (cần Postgres docker, xem CLOUD_SAVE_SETUP.md)
```

## Bản online (Vercel)
- https://kem-tron.vercel.app — Vercel phục vụ thẳng `dist/` (không build trên Vercel, xem `vercel.json`), nên **mọi thay đổi phải `npm run build` rồi đẩy cả `dist/`**.
- `api/cloud.js` — Vercel Function lưu lên mây (Neon Postgres). Hướng dẫn + cơ chế chống spam: `CLOUD_SAVE_SETUP.md`.
- `public/` — manifest, icon, service worker cho nút **Lưu vào màn hình chính** (Vite chép sang `dist/`). Icon dựng lại bằng `python3 tools/icon/make_icons.py <url dev>`.

## Giấy phép tài nguyên
Xem `assets/licenses/README.txt` (ZzFX MIT, spectral.js MIT, GSAP Standard No-Charge, font SIL OFL). Toàn bộ art vẽ bằng code trong `src/art/`.
