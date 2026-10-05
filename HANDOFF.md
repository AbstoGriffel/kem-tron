# Kem Trộn — Bàn giao & định hướng làm tiếp

Cập nhật: 05/10/2026. Đọc file này trước, rồi `CLAUDE.md` (quy ước code) và `docs/gdd.md` (thiết kế chốt).

## Cài & chạy trên máy mới
```bash
npm install
npm run dev          # http://localhost:5180  (?day=5 nhảy ngày, ?day=6&insp=1 ép QLTT kiểm tra, ?warn=1 tổ trưởng ghé)
npm test             # 49 test: logic trộn, chấm điểm, livestream, vườn, nợ, mô phỏng kinh tế 10 ngày
npm run build        # dist/index.html — 1 file, mở thẳng bằng trình duyệt là chơi
```
Chơi thử tự động / chụp ảnh: `playtest.py`, `shot.py` (Playwright + Chrome; sửa đường dẫn Chrome trong script cho máy mới). Xem art: `/#icons`, `/#beans`.
Bản build sẵn: `dist/index.html` (có trong zip, mở là chơi được ngay).

## Đã có (chương 1, 10 ngày)
- Màn chính 1 màn: khách ở cửa sổ → bàn khăn caro (thau nhôm trên bếp ga, cối, máy xay, ticket) → ngăn kéo nguyên liệu.
- 5 cốt kem, 20 nguyên liệu (3 cặp xịn ↔ sỉ dỏm), combo cấm/tốt, quá tay, đun. Preview trên ticket, khuấy = chốt, kem đổi màu (spectral.js).
- Hũ + nhãn (gu khách), ảnh TRƯỚC/SAU, review khớp lỗi, hoàn tiền.
- Livestream: hype/mắt xem/quà/follower → đơn online từ sổ bí kíp; câu chốt nói thật/nổ; mèo; nhạc chill ↔ vinahouse.
- Gọi mối + trả giá "Giả Vờ Cúp Máy"; vườn thùng xốp; sổ bí kíp đổ nhanh.
- Hàng sỉ → nghi ngờ, review trễ, thanh tra cải trang, QLTT "Dọn Hiện Trường", công an đi cùng, bản tin thời sự.
- Buổi sáng / sổ chi tiêu buổi tối / sắm đồ / 5 kết thúc (tử tế, ông trùm, còn nợ, vỡ nợ, lên báo).
- Lưu giữa ngày an toàn (mở lại app không phát lại khách, không chốt sổ 2 lần).
- Màn hình co giãn theo chiều cao máy (740–980 design px), máy ngắn 375×667 vẫn thấy trọn màn. Bánh răng cài đặt: âm thanh, nhạc, ô nguyên liệu rộng rãi, tạm dừng.
- Sửa theo review Figma (04–05/10):
  - Màn tiệm: chạm món trong thau để lấy ra; hất hũ cho khách; nút "Hả?" và nút đuổi khách trên bong bóng (đuổi khách có thể bị review xấu); ẩn món hết hàng.
  - Thẻ mô tả món: giá ở góc phải.
  - Sổ bí kíp theo frame 19: sổ mở dọc, thẻ nguyên liệu; chạm tên để đổi tên hũ.
  - Vườn: thùng xốp theo Figma, nhấc bình tưới để tưới, hàng xóm ló/trốn.
  - Gọi mối: câu mở lời riêng từng mối, có tác dụng lên lúc trả giá.
  - Tường giấy khen: chạm xem to, mở cả xấp.
  - Logo: dấu nặng rơi từ ngoài màn xuống vạch kem.

## Chưa kiểm
- Âm thanh chưa nghe bằng tai (ZzFX + nhạc procedural `src/ui/music.ts`) — cần chỉnh tham số trong `src/ui/audio.ts`.
- Chưa thử iOS Safari thật; fps máy thật lúc nhiều hiệu ứng.
- Tắt app giữa lúc đang trộn thì mất nguyên liệu đã bỏ vào thau.

## Định hướng làm tiếp (ưu tiên từ trên xuống)
1. **Chơi thật 1–2 ngày trên điện thoại**, ghi lại chỗ khó hiểu/nhàm → chỉnh số trong `src/data/*.json` (không cần sửa code).
2. **Âm thanh**: nghe từng SFX, chỉnh; cân âm lượng nhạc nền; thêm nút tắt nhạc riêng.
3. **Khách có "đời sống"**: khách quen quay lại theo tên + thanh thân thiết; khách dùng hàng dỏm nhắn tin "Zalo" buổi sáng kèm ảnh mặt nổi mẩn (2 nút: xin lỗi + hoàn / block).
4. **Cám dỗ thứ 2 — filter sống ảo**: sau đơn 5 sao, chọn mức filter làm trắng cho ảnh feedback đăng lên: càng mạnh càng nhiều follower, càng bị nghi ngờ.
5. **Chat live theo từng thao tác** (thả chanh: "chanh nữa hả chế", đun: "nấu lẩu à") — chỉ thêm template trong `src/data/text.json`.
6. **Bảng xếp hạng cuối ngày** với 2 tiệm NPC (tử tế nghèo / ông trùm) để có cảm giác ganh đua.
7. **Chương 2 — Spa Mini**: khách đắp mặt tại chỗ (minigame thoa đều), mở chỉ số Mùi, sự kiện "sale 12.12".
8. Đóng gói PWA (cài lên màn hình chính, chơi offline) nếu muốn đưa người khác chơi.

## Tài liệu trong zip
- `docs/gdd.md` — thiết kế chốt. `docs/research/*.md` — 8 báo cáo research (gameplay, bối cảnh kem trộn + kho thoại, UI/art, motion, tech, hệ chỉ số, kinh tế/livestream, code tham khảo).
- `assets/licenses/README.txt` — giấy phép (ZzFX MIT, spectral.js MIT, GSAP no-charge, font OFL).
