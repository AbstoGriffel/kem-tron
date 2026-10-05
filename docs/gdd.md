# Kem Trộn — Thiết kế game (GDD v1)

Nguồn: 8 báo cáo trong `docs/research/`. File này là bản chốt; số liệu cân bằng nằm ở `src/data/*.json`, không hardcode trong code.

## 1. Một câu
Bạn là chủ "tiệm" kem trộn online trong phòng trọ: nghe khách nói kiểu mạng, trộn kem trong thau nhôm đúng ý khách, đóng hũ dán nhãn, vừa làm vừa livestream — ăn gian thì lời nhanh nhưng review trễ và chú Quản Lý sẽ gõ cửa.

## 2. Vòng lặp
- **Core (40–70 s/đơn):** khách bước vào + nói → chọn cốt kem → kéo nguyên liệu vào thau (thanh chỉ số trên ticket nhảy, kéo ra được) → (tuỳ chọn) nghiền/xay từng món, vặn bếp đun cả thau → **khuấy = khoá** → kem ra màu → chọn hũ + nhãn → kéo hũ đưa khách → khách bôi thử, phản ứng, sao + tiền bay vào hộp bánh quy.
- **Ngày (3–5 phút):** Sáng (hộp thư review trễ, vườn, gọi điện nhập hàng + trả giá) → Mở bán (4–6 khách, live tuỳ ý) → Tối (sổ chi tiêu: doanh thu, tiền trọ, quà live, đơn online, nâng cấp) → ngủ.
- **Meta (10 ngày chương 1):** trả nợ hụi theo 2 mốc (ngày 5, ngày 10), mở nguyên liệu/dụng cụ theo ngày, follower tăng → đơn online, kết cục theo đường đi (tử tế / ông trùm / lên báo).

## 3. Chỉ số
4 thanh 0–10 + Độc 0–15:
| Chỉ số | Icon | Ý |
|---|---|---|
| TRẮNG | bóng đèn | bật tông |
| MỊN | bàn ủi | se khít, láng |
| CHE NẮNG | cây dù | chống nắng |
| KHÔ RÁO | quạt | thấm nhanh; thấp = ẩm/bóng |
| ĐỘC | đầu lâu | 0–5 lành, 6–9 rát (−0,5 sao), 10–14 kích ứng (1 sao + hoàn tiền), ≥15 nổ thau khi khuấy |

Cách tính (thuần, thứ tự không quan trọng): `stat = clamp(0,10, cốt + Σ phần + combo)`, `độc = max(0, cốt + Σ phần + combo + quá tay)`; ≥3 phần cùng món → +3 độc. Dung tích theo cốt (4–6 phần).

## 4. Chế biến
- **Nghiền (cối, tap 5 nhát):** chỉ số dương mạnh nhất ×1,5 (làm tròn lên). Tap quá 9 nhát → văng mất.
- **Xay (máy xay, giữ nút ~1,2 s):** chỉ số âm → 0, +1 MỊN. Giữ >3 s → máy bốc khói (incident, mất món).
- **Đun (bếp ga dưới thau, giữ núm):** áp cho cả thau, *không hoàn tác*: Độc ÷2 (làm tròn xuống), CHE NẮNG → 0. Đun quá 140% → cháy, hỏng mẻ.
- Món có ngoại lệ ghi trong data (vd lòng trắng trứng đun → +10 độc "trứng chiên").
- Mở dần: ngày 1 chỉ kéo thả + khuấy; ngày 2 cối; ngày 3 máy xay; ngày 4 bếp.

## 5. Nguyên liệu (20) + cốt (5)
Lấy bảng của `stats-ingredients.md`, bỏ yến mạch, viên sủi, than tre, dầu dừa để giữ ≤20 món cần vẽ kỹ. Nhóm: vườn (dưa leo, cà chua, nha đam, trà xanh), chợ (nghệ, chanh, mật ong, bột gạo, nước vo gạo, trứng, phèn chua, kem đánh răng, đất sét, phấn rôm), mạng xịn (KCN xách tay, Bột Bật Tông, tinh chất ốc sên), mạng dỏm (KCN "Sun Pờ-rồ", bột trắng không nhãn, collagen chữ lạ). Combo cấm: chanh+kem đánh răng (núi lửa), phèn+kem đánh răng, 2 món dỏm cùng thau. Combo tốt: chanh+mật ong −3 độc, dưa leo+nha đam +1 MỊN.

## 6. Khách & đơn
- Đơn = vùng [min,max] trên 1–3 chỉ số, có thể kèm "Độc ≤ x" (da nhạy cảm), kèm budget + gu đóng gói.
- Lời nói 3 mức: **rõ** (vùng hiện ngay trên ticket), **ẩn dụ** (từ khoá trong bong bóng được tô màu theo chỉ số; vùng hiện mờ "?"; bấm "Hả em?" để khách nói rõ, mất 20% tip), **đố/bẫy đạo đức** (đòi quá sức → chỉ đạt bằng hàng dỏm).
- Khách đặc biệt: Mẹ (ngày 1, không mất tiền), khách da nhạy cảm, khách VIP, **thanh tra cải trang** (kính đen, giày công sở; dùng hàng dỏm cho người này → bị kiểm tra ngay).
- Chấm: `sao = 5 − Σ lệch` (mỗi nấc ngoài vùng −1), độc 6–9 −0,5, độc ≥10 hoặc vượt mức khách → 1 sao; đóng gói đúng gu +0,5; kẹp 0–5, làm tròn 0,5.
- Tiền: ≥3 sao nhận budget; 4 sao +10%, 5 sao +20%; 2 sao hoàn 50%; ≤1 sao hoàn 100% + review 1 sao.

## 7. Hũ & nhãn
Hũ: nhựa (rẻ), thuỷ tinh, "mạ vàng". Nhãn: viết tay, decal "Trắng Thần Sầu", "Nhập khẩu" (chữ ngoại sai chính tả: khách tin hơn, +nghi ngờ), "100% Thiên Nhiên" (độc >5 → nghi ngờ ×2). Mỗi khách có gu (rẻ / sang / sống ảo) → khớp thì +0,5 sao.

## 8. Livestream
- Điện thoại trên chân máy góc trên trái, chạm để bật. Ba số: Hype (0–100, giảm dần), Mắt xem (chạy theo hype và follower), Follower (giữ qua ngày).
- Mọi sự kiện có tag → hype + chat từ template (nguyên liệu lạ, độc cao, nổ thau, khách chửi, 5 sao, công an).
- Mỗi ~25 s live: bong bóng chọn câu chốt đơn (lành / nổ / nổ max): nổ tăng hype nhưng tăng nghi ngờ và kỳ vọng khách.
- Tiền: quà ngẫu nhiên theo mắt xem, trần 25% doanh thu ngày. Giá trị chính: follower → **đơn online** ngày sau, được làm tự động từ **sổ công thức** nếu đủ nguyên liệu.
- Cái giá: khi live, mọi điểm nghi ngờ ×(1 + mắt xem/1000).

## 9. Nghi ngờ (QLTT)
Giấy "mời lên phường" dán tủ lạnh dày dần. Tăng: phần dỏm × hệ số chặt chém, nhãn nhập khẩu, review 1 sao, câu chốt nổ, live. Giảm: ngày sạch −8, đơn 5 sao đồ vườn −2. Ngưỡng 35 tổ trưởng ghé hỏi; 60 QLTT kiểm tra (minigame "Dọn Hiện Trường" 10 s: kéo đồ dỏm giấu vào nồi cơm / thùng gạo / gầm giường; không có lựa chọn hối lộ); 100 "lên báo": phạt nặng + mất 1 ngày, màn bản tin thời sự hài. Hàng dỏm có **tác dụng phụ ẩn** → sáng hôm sau khách quay lại sửa review, đòi hoàn tiền.

## 10. Trả giá: "Giả Vờ Cúp Máy"
Gọi 1 trong 3 mối (Cô Sáu chợ, Anh Tèo xách tay, Shop Sỉ Giá Gốc từ ngày 4). Chọn 1 câu mở màn (mỗi mối thích 1 câu, đúng thì kiên nhẫn +30%), rồi **giữ nút cúp máy**: giá giảm 3%/0,5 s (tối đa −30%); mặt chủ sạp đỏ dần, "Thôi được rồi…" báo 0,7 s trước khi hết kiên nhẫn. Thả kịp → chốt giá; giữ quá → "Ừ cúp đi!", giá +10% cả ngày với mối đó. 1 lần/mối/ngày. Bỏ qua = giá niêm yết.

## 11. Vườn
Ban công: 2 thùng xốp (mua thêm tới 6). Gieo dưa leo / cà chua / nha đam / trà xanh, tưới 1 lần/ngày, lớn qua đêm, bỏ 2 ngày liền thì héo. Thu hoạch → vào kệ, miễn phí, tag "nhà trồng" giảm nghi ngờ.

## 12. Sổ công thức
Sau khi khuấy xong có nút ghim "Lưu bí kíp". Mở sổ (cuốn sổ trên khay) → chạm công thức → nếu đủ nguyên liệu, tay tự thả đúng món, đúng chế biến vào thau. Thiếu món thì gạch đỏ. Sổ cũng là nguồn cho đơn online.

## 13. Nghệ thuật & UI
- Vector phẳng kiểu Dumb Ways to Die: nhân vật hạt đậu màu kẹo, không viền; đồ vật viền nâu-đen `#2A1A16` 3 px, 1 lớp bóng cứng + 1 highlight. Chất Việt ở vật liệu: gạch bông, rèm hoa, ghế nhựa đỏ, thau nhôm, bàn inox, thùng xốp, áo bộ hoa của tay người chơi.
- Màu: dùng bảng 12 màu của `ui-art-direction.md`. Font: Paytone One (tiêu đề, số), Baloo 2 (thân).
- "Nâng tông" thể hiện bằng độ sáng + lấp lánh, không đổi màu da: châm biếm người bán và quảng cáo, không chế giễu màu da.
- Mọi thông tin là vật thể: ticket giấy kẹp (chỉ số + vùng mục tiêu), nhiệt kế độc kẹp mép thau, hộp bánh quy đựng tiền, điện thoại live, tờ giấy mời trên tủ lạnh, đồng hồ treo tường.
- Bố cục 390×844: A (0–250) tường/khách/điện thoại; B (250–560) bàn inox: thau trên bếp ga, cối bên trái, máy xay bên phải, ticket; C (560–844) ngăn nguyên liệu, sổ, điện thoại bàn, cửa ra ban công.
- Motion: theo bảng số của `motion-juice.md` (pickup 80 ms back.out(3), thả cung 250 ms + squash, khuấy khoá góc, hitstop 50–120 ms, trauma shake trần 8 px, nhân vật 12 fps pose cứng).

## 14. Kỹ thuật
Vite + TS + inline SVG + GSAP; build 1 file HTML (`vite-plugin-singlefile`), font woff2 nhúng; âm thanh ZzFX (MIT). Logic thuần ở `src/core` (RNG có seed, test Vitest + mô phỏng cân bằng). Lưu localStorage có version, mọi truy cập bọc try/catch.
