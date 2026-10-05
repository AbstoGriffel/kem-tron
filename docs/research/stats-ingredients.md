# Kem Trộn — Hệ chỉ số, nguyên liệu, cốt kem và yêu cầu khách

> Mảng: stats-ingredients · Ngày: 04/10/2026 · Trạng thái: đề xuất v1, đã chạy mô phỏng vét cạn (Python) để kiểm cân bằng.
> Mọi nguyên liệu, công dụng, độc tố trong tài liệu này là **đồ ảo trong game**, chỉ để châm biếm. Không phải công thức mỹ phẩm thật, không hướng dẫn pha chế ngoài đời.

## 1. Kết luận nhanh

- **4 chỉ số + 1 Độc tố**, mỗi chỉ số là thanh 10 nấc: **TRẮNG** (bật tông), **MỊN** (se khít), **CHE NẮNG**, **KHÔ RÁO** (thấm nhanh, không bết).
- **Cách tính = cộng dồn có trần**: chỉ số cốt kem + tổng chỉ số từng phần nguyên liệu, kẹp 0–10. Không lấy trung bình — người chơi nhìn thanh "ma" nhích lên/xuống sau mỗi lần thả là hiểu ngay.
- **Giới hạn bằng dung tích**: mỗi cốt kem chứa 4–6 phần. Hết chỗ thì phải bỏ bớt, đây là ràng buộc chính thay cho "bản đồ" của Potion Craft.
- **Độc tố là thanh riêng 0–15**: 0–5 an toàn, 6–9 rát nhẹ, 10–14 kích ứng (1 sao + hoàn tiền + bị bóc phốt), ≥15 thau trào bọt, mất mẻ.
- **24 nguyên liệu** (3 cặp "xịn ↔ dỏm"), **5 cốt kem**, **22 kiểu yêu cầu khách**. Mô phỏng vét cạn cho thấy: mọi yêu cầu có từ 24 đến hơn 1.000 cách làm hợp lệ trong budget, không nguyên liệu nào chiếm quá 28% số công thức hợp lệ, bỏ bất kỳ nguyên liệu/cốt nào vẫn còn ≥2 cách cho mọi yêu cầu.
- **Hàng dỏm luôn rẻ hơn 30–50%** cho cùng hiệu quả, nhưng đốt Độc tố và đẩy thanh **Nghi vấn** (công an). Đây là cám dỗ chính của game.

## 2. Bốn chỉ số + Độc tố

| Icon gợi ý | Chỉ số | Ý nghĩa trong game | Thanh | Câu khách hay nói |
|---|---|---|---|---|
| bóng đèn | **TRẮNG** | Bật mấy tông | 0–10 | "trắng bật tông", "trắng như sứ", "đừng trắng quá kẻo giả trân" |
| bàn ủi | **MỊN** | Se khít lỗ chân lông, láng mịn | 0–10 | "mịn như da em bé", "lỗ chân lông to như ổ gà" |
| cây dù | **CHE NẮNG** | Chống nắng | 0–10 | "đi biển 3 ngày", "đi chợ 15 phút" |
| quạt máy | **KHÔ RÁO** | Thấm nhanh, không bết. Thấp = ẩm, bóng dầu | 0–10 | "da dầu chiên được trứng", "da khô nứt nẻ như ruộng hạn" |
| đầu lâu | **ĐỘC TỐ** | Rủi ro kích ứng | 0–15 | (khách không nói, tự người chơi biết) |

Vì sao chọn 4 chỉ số này:
- Đúng 4 lời quảng cáo kem trộn phổ biến nhất trên mạng (trắng, mịn, chống nắng, thấm nhanh), người Việt đọc là hiểu, không cần tutorial.
- **KHÔ RÁO có hai chiều** (thấp = ẩm, cao = khô) nên tạo được yêu cầu "ngược" (da khô cần KHÔ RÁO thấp). Nhiều nguyên liệu dưỡng ẩm kéo chỉ số này xuống, tạo bù trừ tự nhiên.
- 4 thanh vừa một hàng trên màn 390px (mỗi thanh ~80px) — làm thành 4 vạch chia trên thành thau hoặc 4 ống nghiệm cắm bên cạnh (UI diegetic).

## 3. Cách tính

```
stat[i] = clamp(0, 10, base.stat[i] + Σ phần.stat[i] + combo/synergy)
doc     = max(0, base.doc + Σ phần.doc + combo_doc + quá_tay)
mau     = trung bình RGB có trọng số (cốt kem = 2 phần, mỗi nguyên liệu = 1 phần)
gia_von = base.gia + Σ phần.gia
```

- **Thứ tự thả không quan trọng.** Khác Potion Craft (mỗi nguyên liệu là một đường đi trên bản đồ, thứ tự quyết định điểm đến), ở đây chọn cộng dồn để dễ hiểu trên màn nhỏ. Cái học được từ Potion Craft là: *preview trước*, *nghiền làm thay đổi độ mạnh*, *có vùng "nguy hiểm" phải lách*.
- **Preview**: thả vào thau = thanh ma (nét đứt) hiện kết quả. Kéo ngược ra = hoàn tác miễn phí. Chế biến xong mà chưa thả thì vẫn giữ trên thớt.
- **Điểm không hoàn tác**: bấm KHUẤY (xoay tay quanh thau 3 vòng) → khoá công thức, chốt màu, tính độc.
- **Quá tay**: ≥3 phần cùng một nguyên liệu → +3 Độc ("Bỏ nhiều cho mạnh hả má?"). Chặn cách spam một món rẻ.
- Số nguyên, không có số lẻ — dễ cân bằng trong `data/*.json`, dễ kiểm bằng test ở `src/core`.

## 4. Chế biến (4 trạng thái, mỗi nguyên liệu chỉ chế biến 1 lần)

| Trạng thái | Dụng cụ trên màn | Tác dụng chung | Rủi ro/hài |
|---|---|---|---|
| **Nguyên** | thả thẳng | giữ chỉ số gốc | — |
| **Nghiền** | cối đá, tap 5 lần | chỉ số mạnh nhất ×1,5 (làm tròn lên) | Tap quá 10 lần: văng tung toé, mất phần đó |
| **Xay** | máy xay sinh tố, giữ nút | chỉ số âm giảm một nửa (về 0), +1 MỊN | Giữ >3 giây: máy bốc khói, livestream có incident |
| **Đun** | bếp gas + bật lửa | Độc ÷2 (làm tròn xuống), CHE NẮNG về 0 | Bật lửa lâu: cháy khét, +3 Độc, khán giả spam "cháy nhà" |

Ngoại lệ (đặc trưng từng món, ghi trong bảng nguyên liệu): Nghệ đun → Độc = 0; Mật ong đun → +1 MỊN; Lòng trắng trứng đun → thành trứng chiên, +10 Độc; **hàng dỏm đun → +5 Độc** (khói lạ). Chỉ cho chế biến những món có ghi trong cột "Chế biến"; món khác bấm vào dụng cụ sẽ bị chủ nhà mắng ("Xay kem đánh răng làm gì?").

## 5. Cốt kem (5 loại)

| Cốt | Giá | TRẮNG | MỊN | NẮNG | KHÔ | Độc | Dung tích | Màu | Vai trò |
|---|---|---|---|---|---|---|---|---|---|
| Cốt kem trơn | 15 | 1 | 2 | 0 | 2 | 0 | 5 | #FFF6EE | Đa dụng, cho đơn trắng |
| Cốt sữa dưỡng thể | 18 | 1 | 1 | 0 | 4 | 0 | 5 | #FFF0F5 | Sẵn KHÔ RÁO cao, cho da dầu |
| Cốt sáp bóng | 12 | 0 | 3 | 1 | 0 | 0 | **4** | #FFF3C4 | Rẻ, mịn sẵn, nhưng ít chỗ |
| Cốt gel nha đam | 15 | 0 | 2 | 0 | 3 | 0 | 5 | #D9F5D0 | Cho đơn "khô + se" |
| Cốt kem hàng thùng (dỏm) | 5 | 2 | 2 | 1 | 2 | **4** | **6** | #FFFFFF | Rẻ, chỉ số đẹp, chỗ nhiều, nhưng sẵn 4 Độc + tính Nghi vấn |

Đơn vị giá: "nghìn đồng ảo" (k). Hũ và nhãn tính riêng ở mảng packaging.

## 6. Nguyên liệu (24 món)

Cột chỉ số = **mỗi phần, trạng thái nguyên**: T = TRẮNG, M = MỊN, N = CHE NẮNG, K = KHÔ RÁO, Đ = Độc. Nguồn: Trồng = vườn sau nhà (miễn phí khi tự thu hoạch, giá trong bảng là giá mua ngoài); Chợ = gọi điện mua; Mạng = mua hàng online (có hàng dỏm).

| # | Nguyên liệu | Giá | Nguồn | T | M | N | K | Đ | Chế biến | Tương tác / ghi chú | Màu |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dưa leo | 5 | Trồng | 0 | 2 | 0 | -1 | 0 | Xay → M3 K0 | +Nha đam: +1 MỊN ("combo mát lạnh") | #9BD770 |
| 2 | Cà chua | 5 | Trồng | 1 | 1 | 1 | -1 | 0 | Xay → M2 K0 | Món "làm được tí mọi thứ" | #E8483B |
| 3 | Nha đam | 6 | Trồng | 0 | 2 | 1 | -1 | 4 | Đun → Đ2 N0; Xay → M3 K0 | Nhựa vàng gây ngứa nếu để nguyên | #CFEFC1 |
| 4 | Lá trà xanh | 5 | Trồng | 0 | 1 | 1 | 1 | 0 | Nghiền → M1 N1 K2 | Thảo dược hiền, yếu | #6BA539 |
| 5 | Nghệ tươi | 8 | Chợ | 2 | 1 | 0 | 0 | 3 | Nghiền → T3; Đun → Đ0 | Trắng mà kem ra màu vàng (khách than) | #F2A900 |
| 6 | Chanh | 4 | Chợ | 2 | -1 | 0 | 2 | 5 | Nghiền → T3 | Rẻ, trắng mạnh, nhưng 2 trái đã 10 Độc | #D8F06A |
| 7 | Mật ong | 12 | Chợ | 0 | 2 | 0 | -2 | 0 | Đun → M3 | +Chanh: −3 Độc ("bài thuốc bà ngoại") | #E6A12E |
| 8 | Bột yến mạch | 10 | Chợ | 0 | 1 | 0 | 2 | 0 | Xay → M2 | An toàn, hơi đắt | #E9DCC0 |
| 9 | Bột gạo | 6 | Chợ | 2 | -1 | 0 | 1 | 0 | Xay → T2 M1 | Trắng an toàn nhưng làm sần | #F7F3EA |
| 10 | Nước vo gạo | 1 | Bếp nhà | 1 | -1 | 0 | -1 | 0 | — | Rẻ nhất, loãng, dùng 3 phần là bị phạt quá tay | #F1EEE6 |
| 11 | Dầu dừa | 10 | Chợ | 0 | 2 | 1 | -3 | 0 | Đun → N0 | Cứu tinh đơn da khô, đơn da dầu thì độc dược | #FFF8E7 |
| 12 | Lòng trắng trứng | 6 | Chợ | 0 | 3 | 0 | 1 | 2 | Xay → M4 | Đun → trứng chiên, +10 Độc | #FFFDF2 |
| 13 | Than tre | 12 | Chợ | -2 | 2 | 0 | 3 | 0 | Nghiền → K5 | Kem chuyển xám đen; +Bột Bật Tông: +4 Độc | #2E2E2E |
| 14 | Phèn chua | 6 | Chợ | 0 | 3 | 0 | 2 | 6 | Nghiền → M5; Đun → Đ3 | Se khít mạnh nhất nhóm rẻ, rát | #EAF4F7 |
| 15 | Phấn rôm | 10 | Tạp hoá | 1 | 1 | 0 | 4 | 3 | — | Khô ráo mạnh | #FFFFFF |
| 16 | Viên sủi Vitamin C | 12 | Tạp hoá | 2 | 0 | 0 | 1 | 2 | Nghiền → T3 | +Chanh: +6 Độc ("chua lè") | #FF9F1C |
| 17 | Kem đánh răng | 8 | Tạp hoá | 1 | 0 | 0 | 3 | 5 | — | Mẹo dân gian meme; +Chanh: +8 Độc ("núi lửa sủi bọt"); +Phèn: +6 | #7FD3E8 |
| 18 | Đất sét trắng | 9 | Chợ | 1 | -1 | 2 | 2 | 1 | Đun → Đ0 N0 | Nguồn chống nắng rẻ thay hàng xách tay | #DCD3C8 |
| 19 | Kem chống nắng xách tay | 18 | Mạng | 0 | 0 | 4 | -1 | 1 | — | Xịn: "hàng auth, bill đầy đủ" | #FFE9C9 |
| 20 | Kem chống nắng "Sun Pờ-rồ" (dỏm) | 8 | Mạng | 0 | 0 | 4 | -1 | 5 | — | Giống y #19, rẻ hơn 55%. Nghi vấn +4 | #FFE0B0 |
| 21 | Bột Bật Tông | 20 | Mạng | 4 | 0 | -1 | 0 | 2 | — | Xịn: trắng mạnh nhất, ít độc | #FDFDFF |
| 22 | Bột trắng không nhãn (dỏm) | 8 | Mạng | 4 | 0 | -1 | 0 | **7** | — | Giống #21, rẻ hơn 60%. Nghi vấn +6 | #F4F9FF |
| 23 | Tinh chất ốc sên | 18 | Mạng | 0 | 4 | 0 | -1 | 0 | — | Xịn: mịn mạnh nhất, 0 độc | #E8E2F2 |
| 24 | Collagen gói chữ lạ (dỏm) | 8 | Mạng | 0 | 4 | 0 | -1 | 5 | — | Giống #23, rẻ hơn 55%. Nghi vấn +4 | #FFC2D6 |

**Combo cấm (cộng thêm Độc khi cùng có trong thau):**

| Combo | +Độc | Hiệu ứng trên màn / livestream |
|---|---|---|
| Chanh + Viên sủi Vitamin C | +6 | Thau sủi lăn tăn, mặt nhân vật nhăn "chua lè" |
| Chanh + Kem đánh răng | +8 | Núi lửa bọt xanh, khán giả spam "núi lửa" |
| Phèn chua + Kem đánh răng | +6 | Khói trắng nhẹ, "rát như bỏng" |
| Than tre + Bột Bật Tông | +4 | Kem loang xám trắng như ngựa vằn |
| Hai món dỏm bất kỳ cùng thau | +8 | "Hàng dỏm cắn nhau" — thau rung lắc |
| Bất kỳ ≥3 phần cùng món | +3 | "Bỏ nhiều cho mạnh hả má?" |

**Combo tốt (khuyến khích khám phá):** Chanh + Mật ong −3 Độc; Dưa leo + Nha đam +1 MỊN. Mở rộng dần qua "mẹo bà ngoại" trong Sổ công thức.

**Vai trò từng nhóm** (để không có món thống trị):
- *Đồ trồng* (1–4): yếu, rẻ, gần như 0 độc — nền cho người chơi chăm vườn.
- *Đồ chợ mạnh nhưng rát* (5, 6, 12, 14, 17): rẻ, một chỉ số mạnh, độc 2–6 → chỉ dùng được 1–2 phần.
- *Đồ an toàn nhưng đắt* (7, 8, 11, 13): 0 độc, giá 10–12.
- *Hàng xịn mạng* (19, 21, 23): một chỉ số +4, gần 0 độc, đắt — dùng khi đơn khó, ít chỗ, hoặc khách da nhạy cảm (Độc ≤3).
- *Hàng dỏm* (20, 22, 24): hiệu quả y hàng xịn, rẻ hơn 55–60%, Độc 5–7, đẩy Nghi vấn.

## 7. Yêu cầu khách = vùng mục tiêu trên thanh

- Mỗi đơn khoá **1–4 chỉ số** vào một vùng [min–max] rộng 2–3 nấc; chỉ số không nhắc tới thì tuỳ. Một số đơn khoá thêm **Độc tối đa** (khách da nhạy cảm).
- **Ba mức rõ ràng** (giống Good Pizza Great Pizza — khách nói vòng vo, càng chơi càng thuộc):
  1. *Rõ*: "Trắng lên 3 tông" → vùng hiện ngay trên thanh.
  2. *Mơ hồ*: "Muốn trắng mà đừng giả trân" → vùng chỉ hiện sau khi người chơi chạm vào bong bóng thoại (miễn phí) hoặc tra sổ.
  3. *Đố*: "Cuối tuần đi Vũng Tàu với bồ" → phải tự đoán (NẮNG cao, KHÔ vừa). Bấm "Hả?" để khách nói rõ, nhưng trừ 20% tiền tip.
- **Budget** = số tiền khách trả (đã tính sẵn ≈ 1,6 × giá vốn rẻ nhất của cách làm *đàng hoàng*). Đơn đầu game lời ~40%, đi đường dỏm lời ~70–80%.

### 22 kiểu yêu cầu (budget đã qua mô phỏng)

| # | Lời thoại khách | Vùng mục tiêu | Budget | Ví dụ cách 1 (rẻ nhất) | Ví dụ cách 2 |
|---|---|---|---|---|---|
| 1 | "Trắng lên một tông thôi, cho đỡ đen nhẻm" | T 4–6 | 25 | Kem trơn + Chanh | Sáp + 3 Nước vo gạo |
| 2 | "Bật 3 tông cho chồng nhận không ra" | T 7–9 | 35 | Kem trơn + Chanh nghiền + Nước vo ×3 | Kem trơn + Nghệ ×2 |
| 3 | "Trắng như sứ Bát Tràng, càng trắng càng tốt" | T 9–10 | 45 | Kem trơn + Chanh + Nghệ (nghiền) + Nước vo ×2 | Kem trơn + Bột gạo ×4 (bị quá tay nhẹ) |
| 4 | "Lỗ chân lông to như ổ gà, se lại giùm" | M 6–8 | 25 | Sáp + Dưa leo xay | Sáp + Nha đam |
| 5 | "Mịn như da em bé, em bé thiệt á" | M 8–10 | 30 | Sáp + Phèn nghiền | Sáp + Cà chua + Dưa leo |
| 6 | "Đi biển 3 ngày 2 đêm" | N 5–7 | 50 | Sáp + Kem chống nắng xách tay | Sáp + Đất sét ×2 |
| 7 | "Đi chợ 15 phút thôi mà sợ đen" | N 2–4 | 25 | Sáp + Cà chua | Sáp + Trà xanh |
| 8 | "Bôi xong là khô liền, đừng bết dính" | K 6–8 | 35 | Sữa dưỡng thể + Chanh | Gel + Kem đánh răng |
| 9 | "Da dầu chiên được trứng, mụn thì lổm ngổm" | M 5–7, K 7–9 | 45 | Gel + Chanh + Trà xanh nghiền ×2 | Gel + Kem đánh răng + Trứng |
| 10 | "Da khô nứt như ruộng hạn" | M 6–8, K 0–2 | 25 | Sáp + Dưa leo xay | Sáp + Nha đam |
| 11 | "Vừa trắng vừa chống nắng, combo tiết kiệm" | T 5–7, N 4–6 | 50 | Sáp + Cà chua + Chanh + Đất sét | Sáp + Kem CN xách tay + Nghệ + Nước vo ×2 |
| 12 | "Trắng 2 tông mà đừng nhờn như mỡ" | T 5–7, K 5–7 | 35 | Sữa dưỡng thể + Chanh nghiền + Nước vo | Sữa dưỡng thể + Bột gạo ×2 |
| 13 | "Kem body đi biển, phải trắng, phải ráo" | T 6–8, N 5–7, K 4–6 | 55 | Sáp + Cà chua ×2 + Chanh + Đất sét | Sáp + Bột gạo + Kem CN xách tay + Nghệ + Phấn rôm |
| 14 | "Mai cưới rồi, trắng mịn cho lên hình" | T 6–8, M 7–9 | 50 | Sáp + Bột gạo xay + Cà chua xay + Nghệ nghiền | Sáp + Chanh ×2 + Dưa leo + Mật ong |
| 15 | "Một hũ cân hết, 4 trong 1 như dầu gội" | T 4–6, M 5–7, N 3–5, K 4–6 | 50 | Sáp + Cà chua + Chanh + Trà xanh ×2 | Sáp + Bột gạo + Đất sét + Phèn + Nước vo |
| 16 | "Chỉ cần thơm thôi, trắng là chồng nghi" | T 0–2 | 20 | Sáp + Nước vo gạo | Sáp + Chanh |
| 17 | "Tự nhiên thôi, không trắng, mà se khít nha" | T 0–3, M 6–8 | 25 | Sáp + Dưa leo xay | Sáp + Nha đam |
| 18 | "Chạy Grab cả ngày: chống nắng mà khô ráo" | N 4–6, K 6–8 | 55 | Gel + Đất sét ×2 | Gel + Cà chua + Trà xanh ×3 (quá tay) |
| 19 | "Mịn mịn, che nắng chút xíu" | M 6–8, N 2–4 | 30 | Sáp + Nha đam xay | Sáp + Cà chua ×2 |
| 20 | "Em sinh viên, rẻ thôi chị, mịn xíu là được" | M 4–6 | 25 | Sáp + Cà chua | Sáp + Dưa leo |
| 21 | "Trắng nhẹ, ẩm mượt, mùa đông mà" | T 3–5, K 0–3 | 25 | Sáp + Nước vo ×3 | Sáp + Chanh |
| 22 | "Đi phượt Hà Giang, nắng cháy da" | N 6–8, K 5–7 | 55 | Sáp + Đất sét ×2 + Trà xanh | Sáp + Cà chua + Chanh + Kem CN xách tay + Phấn rôm |

Thêm biến thể "da nhạy cảm" (gắn vào bất kỳ đơn nào, giữa game): **Độc ≤3**. Ví dụ "Trắng 3 tông, da nhạy cảm" (T 7–9, Đ ≤3): vẫn có 200+ cách, trong đó cách dùng Bột Bật Tông (Kem trơn + Bột Bật Tông + Cà chua ×2) là chỗ hàng xịn phát huy giá trị.

## 8. Chấm điểm 0–5 sao

```
lech      = Σ (khoảng cách từ chỉ số tới vùng, theo nấc) trên các chỉ số được yêu cầu
sao_goc   = 5 − lech                         (mỗi nấc lệch −1 sao)
phạt_độc  = 0 nếu Độc ≤5 | −0,5 nếu 6–9 | ép còn 1 sao + hoàn tiền nếu 10–14
            (hoặc vượt Độc tối đa khách đặt)
thưởng    = +0,5 nếu hũ/nhãn/màu đúng gu khách (mảng packaging quyết)
sao       = clamp(0, 5, sao_goc + phạt_độc + thưởng), làm tròn 0,5
```

| Sao | Kết quả | Tiền |
|---|---|---|
| 5 | Khách quay video khen, +khán giả livestream | budget + tip 20% |
| 4 | "Ok nha shop" | budget + tip 10% |
| 3 | Im lặng | budget |
| 2 | Review "hàng không giống hình" | budget, −uy tín |
| 0–1 | Trả hàng hoàn tiền, có thể bị bóc phốt | 0, −uy tín, mất nguyên liệu |

- Thau Độc ≥15 → trào bọt trước khi khuấy xong, mẻ hỏng, mất nguyên liệu (không mất khách nếu làm lại kịp giờ).
- Hiển thị kết quả bằng nhân vật khách bôi kem rồi biểu cảm (squash & stretch), không phải bảng điểm.

## 9. Nghi vấn (công an) — không phải chỉ số thứ 5

- Thanh **Nghi vấn 0–100** của cả tiệm, chỉ hiện dạng biểu tượng (đèn xanh đỏ đầu hẻm nhấp nháy dần), không nằm trong thau.
- Mỗi phần hàng dỏm trong đơn: +4 đến +6 Nghi vấn; cốt kem hàng thùng: +2. **Nhân hệ số "chặt chém"** = budget ÷ giá vốn (≥3 thì ×1,5) — bán đắt mà dùng hàng dỏm thì công an để ý nhanh hơn.
- Đơn 1 sao có hàng dỏm: +10 (khách đi tố).
- Giảm 10 điểm mỗi ngày không dùng hàng dỏm. ≥100 → sự kiện "công an gõ cửa": phạt tiền + tịch thu kho dỏm.
- Kết quả mô phỏng: đi đường dỏm lời hơn 20–50% mỗi đơn (ví dụ đơn #6: đàng hoàng lời 20k, dỏm lời 37k). Đủ cám dỗ, và rủi ro phải đủ đau để cân lại.

## 10. Kiểm tra bằng mô phỏng

Script Python vét cạn (giữ ở scratchpad, nên đưa vào `src/core` thành test): mỗi cốt kem × mọi tổ hợp 1–4 phần nguyên liệu (có lặp) × mọi cách chế biến cho phép — khoảng 1 triệu thau mỗi lần chạy, ~18 giây.

Định nghĩa "cách hợp lệ": mọi chỉ số yêu cầu nằm trong vùng, Độc ≤9 (không bị trừ sao nặng), giá vốn ≤ budget, chỉ dùng hàng *đàng hoàng* (không dỏm, không cốt hàng thùng). Hai cách khác nhau = khác bộ cốt + nguyên liệu.

| Kiểm tra | Kết quả v1 |
|---|---|
| Số cách hợp lệ mỗi yêu cầu | thấp nhất 24 (đơn #16), phần lớn 80–1.000+ |
| Có cách thứ 2 *không dùng chung nguyên liệu nào* với cách rẻ nhất | Có ở 22/22 đơn |
| Nguyên liệu chiếm nhiều nhất trong các cách hợp lệ | Đất sét 27%, Cà chua 27%, Bột gạo 26%, Trà xanh 25% — không món nào vượt 30% |
| Bỏ hẳn 1 nguyên liệu bất kỳ → còn <2 cách cho đơn nào? | Không đơn nào |
| Bỏ hẳn 1 cốt kem bất kỳ | Không đơn nào; cốt sáp bóng dùng nhiều nhất (35%) vì rẻ — nên chỉnh nếu thấy lặp |
| Hàng dỏm có rẻ hơn thật không | Có, giá vốn dỏm thấp hơn 30–60% ở mọi đơn |

Lỗi đã bắt và sửa qua 3 vòng mô phỏng:
1. *Nước vo gạo miễn phí, +1 TRẮNG*: spam 4 phần thắng mọi đơn trắng → thêm MỊN −1, KHÔ −1, giá 1k, luật quá tay.
2. *Chanh nghiền 2 trái*: trắng rẻ nhất, 8 Độc vẫn qua → nâng Độc chanh lên 5 (2 trái = 10, bị kích ứng).
3. *Đơn chống nắng cao chỉ có 1 cách (hàng xách tay)* → thêm Đất sét trắng làm nguồn chống nắng rẻ.
4. *Hàng xịn quá đắt (30–35k) không ai dùng* → hạ còn 18–20k; vai trò chính là đơn da nhạy cảm / ít chỗ.

Điểm còn mở:
- Đơn VIP 3 chỉ số + Độc ≤4 cần 5 phần trở lên; mô phỏng v1 mới chạy tới 4 phần — cần chạy lại khi chốt đơn VIP.
- Mật ong, Dầu dừa, Sữa (đã bỏ khỏi bản 24 món) dùng ít (3–6%) vì chỉ hợp đơn da khô. Có thể thêm 2–3 đơn "da khô" hoặc mùa đông để chúng có đất diễn.
- Mô phỏng chưa tính nguyên liệu tự trồng = 0đ. Khi có vườn, lợi nhuận đơn rẻ tăng mạnh; nên giảm budget đơn có món trồng được hoặc giới hạn sản lượng vườn.

## 11. Gợi ý dữ liệu cho `data/*.json`

```json
// data/ingredients.json (1 phần tử)
{ "id": "chanh", "name": "Chanh", "price": 4, "source": "cho",
  "stats": { "trang": 2, "min": -1, "nang": 0, "kho": 2, "doc": 5 },
  "process": { "nghien": { "trang": 3 } },
  "fake": false, "suspicion": 0, "color": "#D8F06A" }
// data/combos.json
{ "ids": ["chanh", "kemdanhrang"], "doc": 8, "fx": "nui_lua_bot" }
// data/orders.json
{ "id": "di_bien", "line": "Đi biển 3 ngày 2 đêm", "clarity": 2,
  "target": { "nang": [5, 7] }, "maxDoc": 9, "budget": 50 }
```

- Chế biến lưu dạng *ghi đè chỉ số* theo từng món (như ví dụ chanh) thay vì công thức chung, để game designer chỉnh từng món mà không đụng logic.
- Test bắt buộc trong `src/core`: (a) mỗi đơn có ≥2 cách hợp lệ đàng hoàng; (b) không nguyên liệu nào >30% số cách hợp lệ; (c) cách dỏm rẻ nhất luôn rẻ hơn cách đàng hoàng rẻ nhất.

## 12. Nguồn tham khảo

- Potion Craft — bản đồ giả kim, mỗi nguyên liệu là một đường đi, nghiền bằng cối làm dài đường đi, thêm nước để lùi về tâm: [Hackernoon — A look at Potion Craft](https://sia.hackernoon.com/a-look-at-potion-craft-an-alchemist-simulator), [Stackup review](https://www.stackup.org/amp/review-potion-craft), [Steam discussion](https://steamcommunity.com/app/1210320/discussions/0/3105764536425529790), [Destructoid](https://destructoid.com/?p=284940).
- Good Pizza, Great Pizza — khách nói vòng vo/đố, nút hỏi lại làm giảm tip, người chơi học dần lời thoại: [TouchTapPlay tips](https://www.touchtapplay.com/how-to-play-good-pizza-great-pizza-tips-tricks/), [LevelWinner](https://www.levelwinner.com/?p=13602), [Steam review](https://steamcommunity.com/id/lillje/recommended/770810).
- Cooking Simulator, các game bartender (VA-11 Hall-A, Papa's): tham khảo từ hiểu biết chung về thể loại (vùng chấp nhận theo tỉ lệ, chấm theo độ lệch), chưa mở được trang cụ thể do tường lửa.
- Mô phỏng cân bằng: script Python tự viết trong phiên này (vét cạn ~1 triệu tổ hợp/lần, 3 vòng chỉnh).
