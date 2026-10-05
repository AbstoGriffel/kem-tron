# Kem Trộn: hệ phụ và kinh tế (livestream, công an, review, trả giá, vườn, tiền)

> Mảng: livestream-economy. Mọi số dưới đây là **số khởi điểm để cân bằng**, đặt trong `data/economy.json`, `data/livestream.json`, `data/garden.json`, `data/suspicion.json`. Đơn vị tiền: **k = nghìn đồng trong game**.

## 0. Kết luận

1. **Một vòng căng chính:** ăn lời bằng hàng dỏm và nổ trên live đều cho tiền nhanh, nhưng cùng đổ vào một thanh **Độ Nghi Ngờ** dùng chung. Người chơi tự chọn mức "bựa" của mình, game không phạt đạo đức mà phạt **hậu quả trễ** (review sáng hôm sau, kiểm tra vài ngày sau). Papers, Please làm tương tự: áp lực đến từ cơ chế, không từ lời thoại.
2. **Livestream là một nhân tố nhân lên, không phải một nguồn tiền thứ hai.** Mắt xem nhân cả quà lẫn nghi ngờ. Quà tặng chỉ chiếm tối đa khoảng 25% thu nhập ngày; giá trị chính của live là **follower** (thêm khách online ngày mai).
3. **Trả giá dùng minigame "Giả Vờ Cúp Máy"** (push-your-luck giữ nút), một ngón cái, khoảng 6 giây, rất meme Việt.
4. **Vườn là phần tiết kiệm có nhịp chậm**: 2 đến 6 chậu, tưới mỗi ngày một lần, đổi lại nguyên liệu miễn phí cộng nhãn "nhà trồng" giúp giảm nghi ngờ.
5. **Mục tiêu 10 ngày:** trả **3.000k nợ hụi** theo hai mốc (ngày 5 và ngày 10), sau đó mở mục tiêu dài là **"Spa Mini" 8.000k**.

---

## 1. LIVESTREAM

### 1.1 Cách bật và vị trí trên màn hình
- Điện thoại dựng trên giá ba chân **ở góc trên phải màn bếp** (diegetic). Tap vào để bật: đèn đỏ "LIVE" nhấp nháy, khung chat trôi trên màn hình điện thoại, chữ nhỏ nhưng có bong bóng nổi lên khi có chat đáng chú ý.
- Live **tốn pin**: pin 100% chạy được khoảng 180 giây thực. Sạc qua đêm. Nâng cấp "sạc dự phòng" lên 300 giây.
- Bật hay tắt tuỳ ý. Tắt giữa chừng thì hype rơi về 0 và chat in dòng "ủa sao tắt rồi chế :((".

### 1.2 Ba chỉ số
| Chỉ số | Phạm vi | Giữ qua ngày? | Ý nghĩa |
|---|---|---|---|
| **Hype** (độ nóng) | 0 đến 100 | Không | Drama, hài hước vừa xảy ra |
| **Mắt xem** (V) | 0 đến khoảng 5.000 | Không | Số người đang xem, chạy theo hype |
| **Follower** (F) | 20 lúc bắt đầu | Có | Khán giả trung thành; quyết định đơn online |

**Công thức (mỗi tick 0,5 giây):**
- `Hype -= 1,5` (nhàm dần). Nếu 10 giây liền không có sự kiện mới thì `Hype -= 3`/tick (chat bắt đầu ghi "chán quá đi ngủ").
- `V_target = F × 0,4 + Hype × (3 + F × 0,03)`
- `V += (V_target − V) × 0,15` (mượt, không nhảy cóc)
- Hết phiên: `F += round(V_peak × 0,04)`, tối đa +60 mỗi ngày.

Ví dụ ngày 1 (F=20): hype 50 thì V khoảng 8 + 50×3,6 = 188 mắt. Ngày 10 (F khoảng 300): hype 50 thì V khoảng 120 + 50×12 = 720 mắt.

### 1.3 Sự kiện bơm hype (chat phản ứng theo tag)
| Sự kiện (tag) | Hype | Nghi ngờ cộng thêm (nhân với hệ số live) | Chat mẫu |
|---|---|---|---|
| Thả nguyên liệu bình thường | +2 | 0 | "dưa leo hả chế, quen thuộc ghê" |
| Nguyên liệu lạ hoặc hài (mắm, nước tăng lực...) | +10 | 0 | "ủa bỏ cái gì dô vậy :))" "mắm hả trời" |
| Nguyên liệu dỏm lộ nhãn | +6 | +2 | "hũ không nhãn kìa mọi người ơi" |
| Độc tố vượt 70% | +12 | +3 | "khói xanh lè kìa", "báo cáo admin" |
| Hỏng mẻ (nổ hoặc chuyển màu tím) | +20 | +2 | "HAHAHA mất trắng", "clip này lên xu hướng" |
| Khách chửi tại quầy | +15 | +1 | "drama drama hóng", "chị kia nói đúng mà" |
| Làm đúng đơn 5 sao | +8 | −1 | "đỉnh chế ơi", "cho em 1 hũ" |
| Công an hoặc QLTT gõ cửa | +35 | ×2 trong lúc kiểm tra | "ĐANG LIVE MÀ", "cứu bé", "ai quay lại đi" |
| Incident (mục 1.5) | +15 đến +30 | +2 đến +5 | tuỳ incident |

**Hệ số live:** khi đang live thì mọi điểm nghi ngờ phát sinh nhân với `1 + V/1000`. Ở 500 mắt, nghi ngờ tăng ×1,5. Đây là cái giá của drama.

**Chat sinh từ template:** mỗi tag có 8 đến 15 câu, chọn ngẫu nhiên không lặp trong 30 giây. Tên tài khoản xem là tên chế (vd `be_heo_2k7`, `chu_tu_ba_ria`, `acc_clone_123`). Có 3 kiểu nhân vật chat cố định quay lại hằng ngày: **"Fan cứng"**, **"Anti chuyên nghiệp"**, **"Ông chú hỏi giá xe máy"** (nhắn lạc đề). Họ giúp thế giới có cảm giác sống mà không tốn nội dung.

### 1.4 Lời chốt đơn (quảng cáo trên live)
Mỗi 25 giây live hiện **1 bong bóng chọn câu** (3 lựa chọn, 4 giây để chọn; bỏ qua cũng được):
| Câu | Hype | Nghi ngờ | Ảnh hưởng review |
|---|---|---|---|
| "Kem lành tính, xài 2 tuần thấy khác nha" | +3 | 0 | Không đổi |
| "Trắng bật tông sau 1 đêm, bao hoàn tiền!" | +12 | +4 | Khách online ngày mai **kỳ vọng +1 tông** |
| "Bác sĩ da liễu nước ngoài khuyên dùng luôn á" | +18 | +8 | Kỳ vọng +2 tông, review 1 sao **x2 nghi ngờ** |

Chơi trung thực vẫn sống được. Nổ thì thu hút xem đông hơn nhưng làm tăng kỳ vọng của khách, vậy nên quay lại đúng vòng review.

### 1.5 Incident (sự cố)
| Incident | Kích hoạt | Hậu quả | Cứu thế nào |
|---|---|---|---|
| **Cháy bếp** | Giữ bật lửa đun sáp hơn 6 giây (vạch đỏ trên ngọn lửa) | Mẻ hỏng, mất 1 nguyên liệu ngẫu nhiên trên kệ, hype +30, nghi ngờ +5 | Tap liên tục vào bình xịt (8 tap trong 3 giây) |
| **Máy xay kẹt** | Xay hơn 3 nguyên liệu "cứng" (nghệ củ, vỏ trứng...) cùng lúc | Máy rung, khói; mất 5 giây | Đập vào máy 3 lần (vuốt xuống), squash-stretch to |
| **Kem trào** | Khuấy quá nhanh khi thau trên 80% | Mất 20% thể tích, khách nhận hũ vơi (−10 điểm đơn) | Khuấy chậm lại; nâng cấp "thau to" |
| **Mèo nhảy lên bàn** | Ngẫu nhiên 5% mỗi đơn khi đang live | Hất 1 hũ; hype +20, có thể **+F 10** (mèo viral) | Không cứu, cười thôi |
| **Mất mạng** | Ngẫu nhiên 3% mỗi phút live | Live đứng hình 5 giây, hype −10 | Lắc điện thoại (tap vào cục wifi) |

Ngày 1 đến 2 chỉ bật cháy bếp và kem trào. Các incident khác mở dần cho đỡ ngợp.

### 1.6 Tiền từ live
- **Tim:** mỗi tick tạo `V × 0,01` tim; **100 tim = 1k**. 300 mắt trong 2 phút ra khoảng 7k. Rất ít, chủ yếu cho vui mắt.
- **Quà:** mỗi tick, xác suất có quà = `V / 4000`. Bảng quà: Bông hồng 2k (60%), Ly trà sữa 10k (28%), Kỳ lân 50k (10%), Xe tay ga 200k (2%). Một phiên 2 phút ở 300 mắt kỳ vọng ra khoảng 25k; ở 800 mắt ra khoảng 180k.
- **Đơn online (giá trị chính):** sáng hôm sau, số khách online = `floor(F / 60)`, tối đa 4. Khách online trả thêm 10% nhưng review gắt hơn (họ xem live, biết anh nổ gì).
- **Trần thụ động:** tổng tim cộng quà mỗi ngày bị chặn ở **25% doanh thu bán hàng hôm đó** (quá trần thì chat ghi "hết tiền nạp rồi chế"). Như vậy live không thể thay thế việc trộn kem.

---

## 2. CÔNG AN / QLTT: thanh "Độ Nghi Ngờ"

### 2.1 Hiển thị
Diegetic: **tờ lịch treo tường** có hình cái loa phường. Nghi ngờ càng cao thì càng nhiều tờ giấy dán đè lên ("Thông báo kiểm tra hàng giả"), sau đó có xe máy tuần tra chạy ngang cửa sổ. Không dùng thanh % khô khan; tooltip khi chạm mới hiện số.

### 2.2 Nguồn tăng và giảm
| Hành vi | Điểm |
|---|---|
| Bán đơn có nguyên liệu tag `dỏm`, mỗi đơn | `+ 10 × (giá bán − giá vốn hợp lý) / giá bán`, tối đa +8 |
| Dùng nhãn "nhập khẩu" (chữ ngoại ngữ sai chính tả) | +2 mỗi đơn |
| Review 1 sao | +5 (bị "bóc phốt" thì +10) |
| Khách trả hàng | +3 |
| Lời chốt nổ trên live | +4 / +8 (bảng 1.4) |
| Mọi điểm phát sinh khi đang live | ×(1 + V/1000) |
| Qua đêm không bán hàng dỏm | −6 |
| Đơn 5 sao dùng nguyên liệu nhà trồng | −2 |
| Mua "Giấy công bố mỹ phẩm" (nâng cấp 1.200k) | Mọi điểm tăng ×0,7 vĩnh viễn |

### 2.3 Ngưỡng
| Mức | Sự kiện |
|---|---|
| **35** | Tổ trưởng dân phố ghé "hỏi thăm" (cảnh báo, hài): "Nghe nói nhà mình bán kem hả? Cho bác xin 1 hũ thoa chân." Không phạt. |
| **60** | **QLTT kiểm tra nhanh** (minigame 2.4). Đầu ngày hôm sau có 50% xác suất xảy ra. |
| **85** | **Kiểm tra lớn có công an đi cùng**: chắc chắn xảy ra ngay đơn tiếp theo. |
| **100** | **"Lên báo"**: kết thúc ngày ngay lập tức, phạt nặng, mất ngày (xem 2.5). |

### 2.4 Minigame "Dọn Hiện Trường" (10 giây)
- Cán bộ đứng ở cửa, đếm ngược bằng câu "Chủ nhà đâu, mở cửa!" (3 lần gõ = 10 giây).
- Người chơi **kéo các hũ hoặc gói dỏm** (có viền đỏ nhạt) vào các chỗ giấu hài: **nồi cơm điện, thùng gạo, gầm giường, giả làm hũ mắm**. Mỗi chỗ giấu chứa được 2 món; nồi cơm thì "ấm" nên giấu xong nó **bốc mùi** (+1 lần cán bộ để ý).
- Sau đó cán bộ chọn ngẫu nhiên 2 trong 4 chỗ để mở ("cái nồi này nấu gì vậy?"). Ngày đầu chỉ mở 1 chỗ.
- **Lựa chọn hội thoại hài** (chọn 1 câu khi bị hỏi): "Đây là... mặt nạ cho chó ạ", "Em đang làm clip review cho vui thôi", "Dạ đây là sốt mayonnaise". Mỗi câu có 30% thuyết phục, cộng thêm 15% nếu đúng ngữ cảnh (vd mayonnaise giấu trong tủ lạnh).
- **Không có lựa chọn hối lộ.** Có một câu đùa chống hối lộ: khi người chơi kéo **ly trà đá** ra mời, cán bộ nói "Không nhận gì hết nha, làm việc đàng hoàng", và nghi ngờ +5. Lần sau họ nhớ: "Lại mời trà đá hả?".

### 2.5 Hậu quả
| Kết quả | Hậu quả |
|---|---|
| Sạch (không phát hiện) | Nghi ngờ −30, chat live "THOÁT RỒI", hype +20 |
| Phát hiện 1 đến 2 món | Tịch thu toàn bộ hàng dỏm trên kệ, phạt **15% tiền mặt (tối thiểu 100k)**, nghi ngờ −20 (đã bị "xử") |
| Phát hiện 3 món trở lên hoặc mức 100 | Phạt **35% tiền mặt (tối thiểu 300k)**, tịch thu, **đóng cửa 1 ngày** (bỏ qua ngày, vẫn trừ chi phí cố định), nghi ngờ về 30, follower −20%. Báo giấy trong game có tít: "Bắt quả tang cơ sở trộn kem trong nồi cơm điện" |
| Game over thật | Chỉ khi bị "Lên báo" **lần thứ 3**, hoặc tiền âm quá 500k (vỡ nợ) |

Ghi chú tham chiếu thật (không đưa vào text game): Nghị định 98/2020/NĐ-CP phạt buôn bán hàng giả tới 200 triệu đồng với cá nhân. Game chỉ châm biếm chung, không trích luật, không dùng tên cơ quan cụ thể ngoài "QLTT" và "công an phường" chung chung.

---

## 3. REVIEW VÀ HOÀN TIỀN

### 3.1 Điểm đơn (0 đến 100) đổi ra sao
`Điểm = 60 × độ khớp chỉ số + 15 × khớp màu hoặc hũ hoặc nhãn + 15 × (không vượt budget) + 10 × tốc độ − phạt độc tố`
| Điểm | Sao | Tiền boa |
|---|---|---|
| 90 trở lên | 5 sao | +15% |
| 75 đến 89 | 4 sao | +5% |
| 55 đến 74 | 3 sao | 0 |
| 35 đến 54 | 2 sao | 0; 40% đòi hoàn **50%** |
| Dưới 35 | 1 sao | Hoàn **100%** cộng phí "boom hàng" 15k |

### 3.2 Review trễ (cốt lõi của châm biếm)
- Nguyên liệu dỏm cho **chỉ số preview đẹp** (vd bột trắng không nhãn: Trắng +3) nhưng có chỉ số ẩn **"Tác dụng phụ"**. Lúc giao hàng khách vui (4 hoặc 5 sao), nhưng **sáng hôm sau** có tỷ lệ `tác dụng phụ × 15%` khách đó quay lại sửa review: "Mặt em đỏ như tôm luộc", rồi hạ xuống 1 sao, đòi hoàn tiền, nghi ngờ +5.
- Màn sáng mỗi ngày có **"Hộp thư review"** (điện thoại rung, 3 đến 5 tin). Đây là lúc người chơi trả giá cho quyết định của hôm qua.

### 3.3 Điểm trung bình (20 review gần nhất)
| Trung bình | Khách tại quầy/ngày | Budget khách |
|---|---|---|
| 4,5 trở lên | +1 | +15% |
| 3,5 đến 4,4 | 0 | 0 |
| 2,5 đến 3,4 | −1 | −10% |
| Dưới 2,5 | −2 | −20%, khách "đi soi" (mở review trước khi mua) |

### 3.4 Bình luận
Sinh từ template theo lý do điểm: thiếu tông ("xài 3 ngày vẫn đen như cũ"), quá độc ("rát quá trời"), hũ xấu ("hũ như hũ chao"), vượt budget ("đắt như vàng"), đơn đẹp ("da em mịn như mông em bé"). Mỗi lý do khoảng 10 câu.

---

## 4. GỌI ĐIỆN ORDER VÀ TRẢ GIÁ

### 4.1 Luồng
Đầu ngày, cầm điện thoại (vật thể, góc phải) và mở **danh bạ 3 mối hàng**: **Cô Sáu chợ** (rau củ, thật, giá vừa), **Anh Tèo hàng xách tay** (cốt kem, chống nắng; vừa thật vừa dỏm), **"Shop Sỉ Giá Gốc"** (bán hàng dỏm siêu rẻ, nói chuyện bằng tin nhắn mẫu tự động). Chọn hàng, rồi mới trả giá. Giao hàng **ngay** (shipper hạt đậu ném bịch qua cửa sổ).

### 4.2 Năm ý tưởng minigame
| # | Tên | Luật ngắn | Ưu | Nhược |
|---|---|---|---|---|
| 1 | **Kể Khổ** | Chọn 3 câu thảm theo thứ tự (mẹ bệnh, con đi học, xe hư...) tạo combo; chủ sạp có "độ mủi lòng" | Viết hài nhiều được | Đọc nhiều chữ, chơi lại thì nhàm |
| 2 | **Spam Tim Năn Nỉ** | Tap nhanh gửi sticker tim; đủ thì giảm giá, quá tay thì bị chặn | Dễ, vui tay | Chỉ cần tap nhanh, không có quyết định |
| 3 | **Thanh Mặt Dày** | Kim chạy qua lại, tap trúng vùng "mặt dày vừa đủ" | Quen thuộc | Chính là cái thanh chủ game muốn đổi |
| 4 | **Oẳn Tù Tì** | Chủ sạp có thói quen ra kéo; thắng 2 trong 3 được giảm | Meme, nhanh | Gần như may rủi |
| 5 | **Giả Vờ Cúp Máy** | Push-your-luck: giữ nút cúp máy, giá giảm dần, thả đúng lúc | Một ngón, có quyết định thật, meme rất Việt | Cần tín hiệu "giận" rõ ràng |

### 4.3 Chọn: **"Giả Vờ Cúp Máy"** (kèm một câu kể khổ mở màn)
**Lý do chọn:** đây là động tác thật của người Việt khi đi chợ ("Thôi đắt vậy em đi chỗ khác"). Nó là một quyết định rủi ro thật chứ không phải phản xạ, và chỉ mất 5 đến 8 giây, hợp màn hình dọc.

**Luật:**
1. Giá chào hiện trên màn hình gọi (vd 120k). Trước tiên chọn **1 câu mở màn** trong 3 câu (vd "Chị ơi em mới mở tiệm, nợ ngập đầu", "Bên kia bán rẻ hơn á", "Em mua sỉ nè"). Mỗi mối hàng "ăn" một câu khác nhau (Cô Sáu mủi lòng với chuyện khổ, Anh Tèo ăn câu "bên kia rẻ hơn"). Câu đúng thì kiên nhẫn +30%.
2. **Giữ nút đỏ "Cúp máy"**: nhân vật đưa điện thoại ra xa tai, chủ sạp la "Ê ê khoan!". Mỗi 0,5 giây giữ, **giá giảm 3%** (tối đa −30%).
3. Chủ sạp có **kiên nhẫn ẩn** (2,5 đến 5 giây, ngẫu nhiên theo mối hàng). Tín hiệu là mặt chủ sạp trong avatar cuộc gọi đỏ dần, mồ hôi rơi, rồi câu cảnh báo "Thôi được rồi..." xuất hiện khoảng 0,7 giây trước khi hết kiên nhẫn.
4. **Thả tay trước khi hết kiên nhẫn**: chốt giá đã giảm. **Giữ quá**: chủ sạp "Ừ cúp đi!", tút tút, rồi giá **tăng 10%** cho cả ngày đó với mối đó (gọi lại thì bị "ủa ai vậy").
5. Mỗi mối hàng chỉ trả giá được **1 lần/ngày**. Nâng cấp "Sim 2 số" cho phép thử lần 2.
6. Mối quen: mỗi lần chốt thành công thì kiên nhẫn của mối đó +0,2 giây (tối đa +1 giây). Thể hiện "quen mặt".

Data: `bargain.json` gồm `{ vendor, patienceMin, patienceMax, likedOpener, dropPerHalfSec: 0.03, maxDrop: 0.30, failPenalty: 0.10 }`.

---

## 5. VƯỜN (ban công)

### 5.1 Luật
- Ban công là **một góc của cùng màn bếp** (vuốt sang trái hoặc ra cửa sổ). Bắt đầu với **2 chậu**, mua thêm 40k/chậu, tối đa 6.
- Gieo hạt (kéo gói hạt vào chậu), rồi **tưới 1 lần/ngày** (kéo bình tưới). Cây lớn qua đêm. Không tưới 1 ngày thì cây đứng yên; **không tưới 2 ngày liên tiếp thì héo chết** (mềm hơn Stardew một chút: Stardew chỉ dừng lớn, không chết; ở đây có chết để vườn có giá trị quyết định). Có cảnh **trời mưa** (10%) thì tự tưới.
- Thu hoạch: tap vào cây chín (squash-stretch, trái bật ra), trái bay về kệ nguyên liệu.
- Nguyên liệu nhà trồng mang tag `nhà_trồng`: chỉ số +10% và giảm nghi ngờ (mục 2.2).

### 5.2 Bảng cây
| Cây | Giá hạt | Ngày chín | Sản lượng | Thu lại? | Giá chợ tương đương | Chỉ số chính |
|---|---|---|---|---|---|---|
| Rau má | 5k | 2 | 2 bó | Không | 6k/bó | Dịu da, giảm độc |
| Dưa leo | 8k | 3 | 3 trái | Có, mỗi 2 ngày (3 lần) | 5k/trái | Mát, se khít |
| Cà chua | 10k | 4 | 3 trái | Có, mỗi 2 ngày (3 lần) | 6k/trái | Sáng da, hơi chua (độc +) |
| Nha đam | 15k | 5 | 2 bẹ | Có, mỗi 3 ngày (vô hạn) | 8k/bẹ | Dưỡng ẩm, mau khô |
| Nghệ | 12k | 6 | 2 củ | Không | 10k/củ | Tông vàng, kháng viêm, "cứng" (kẹt máy) |

Một chậu dưa leo mất 8k và cho 9 trái trong 7 ngày, tương đương 45k, tức là tiết kiệm khoảng 37k. 6 chậu chạy đều tiết kiệm khoảng **40 đến 60k/ngày**, tức 15 đến 20% chi phí nguyên liệu giữa game. Có giá trị nhưng không phá kinh tế.

### 5.3 Sự cố vườn (vui, hiếm)
Gà hàng xóm mổ (5%/đêm, mất 1 trái, hôm sau bán **trứng gà** làm nguyên liệu), sâu (tap bắt sâu, +hype nếu đang live).

---

## 6. ĐƯỜNG CONG KINH TẾ

### 6.1 Giá nguyên liệu (giá gốc trước khi trả giá)
| Nhóm | Món | Giá/phần | Tag |
|---|---|---|---|
| Cốt kem | Kem nền chợ | 15k | dỏm nhẹ |
| | Kem nền chuẩn | 35k | thật |
| Thiên nhiên | Dưa leo 5k, cà chua 6k, rau má 6k, nha đam 8k, nghệ 10k, mật ong 15k, sữa tươi 8k, cám gạo 4k, chanh 3k | | thật |
| Chống nắng | Kem chống nắng chợ 10k / chuẩn 30k | | dỏm / thật |
| Dỏm "thần kỳ" | Bột trắng không nhãn 3k (Trắng +3, tác dụng phụ 3), Kem "xách tay" không nhãn 6k (Trắng +2, Se +1, tác dụng phụ 2), Tinh chất "nhập khẩu" 5k (Thơm +3, độc +2) | | dỏm |
| Hũ | Hũ nhựa 2k / thuỷ tinh 8k / "mạ vàng" 20k | | |
| Nhãn | Viết tay 1k / decal 3k / "nhập khẩu" (ngoại ngữ sai chính tả) 6k | | nhãn nhập khẩu: nghi ngờ +2 |

Giá biến động ±15% mỗi ngày theo "tin đồn chợ" (vd "nghệ lên giá vì clip trend"). Hiện lên tờ báo buổi sáng.

### 6.2 Khách và giá bán
- Khách đưa **budget**; người chơi đặt giá bán ở bước cuối (thanh trượt, mặc định bằng budget). Bán dưới budget thì sao +; vượt budget thì điểm phạt.
- Budget theo ngày: ngày 1 đến 3 là **80 đến 150k**, ngày 4 đến 7 là **120 đến 250k**, ngày 8 đến 10 là **180 đến 400k** (khách VIP "cô chủ tiệm vàng" 400k).
- Giá vốn mẻ trung thực khoảng **45 đến 55% budget**; mẻ dỏm khoảng **15 đến 20%**. Lãi dỏm gấp khoảng 1,7 lần nhưng kéo theo nghi ngờ và review trễ.

### 6.3 Chi phí cố định
| Khoản | Ngày 1 đến 4 | Ngày 5 đến 10 |
|---|---|---|
| Tiền trọ và điện nước | 50k/ngày | 70k/ngày (có máy xay xịn hao điện) |
| Ship hoàn hàng | 15k/lần | 15k/lần |
| Mốc nợ hụi | **Ngày 5: 1.000k** | **Ngày 10: 2.000k** |

Thiếu tiền ở mốc thì "chị Hụi" tới ngồi lì ở quầy một ngày (khách sợ, −2 khách), cộng lãi 10%. **Không game over** lần đầu; lần thứ hai mới tính.

### 6.4 Đường tiền 10 ngày (lối chơi trung thực, chơi khá)
| Ngày | Khách (quầy + online) | Doanh thu | Giá vốn | Live (quà) | Cố định | Lãi ngày | Tiền cuối ngày | Mở khoá |
|---|---|---|---|---|---|---|---|---|
| 0 (đầu) | | | | | | | **300k** | Tutorial |
| 1 | 4+0 | 440k | 220k | 0 | 50k | 170k | 470k | Livestream (cuối ngày 1) |
| 2 | 4+0 | 480k | 240k | 15k | 50k | 205k | 675k | Vườn, 2 chậu |
| 3 | 5+0 | 620k | 300k | 25k | 50k | 295k | 970k | Gọi điện trả giá |
| 4 | 5+1 | 900k | 430k | 40k | 50k | 460k | 1.430k | Mối "Shop Sỉ" (hàng dỏm) |
| 5 | 5+1 | 1.000k | 480k | 60k | 70k | 510k | 1.940k, **trừ nợ 1.000k còn 940k** | QLTT có thể xuất hiện |
| 6 | 5+2 | 1.250k | 600k | 80k | 70k | 660k | 1.600k | Sổ công thức |
| 7 | 6+2 | 1.500k | 720k | 100k | 70k | 810k | 2.410k | Incident đầy đủ |
| 8 | 6+3 | 2.000k | 950k | 150k | 70k | 1.130k | 3.540k | Khách VIP |
| 9 | 6+3 | 2.200k | 1.050k | 180k | 70k | 1.260k | 4.800k | |
| 10 | 6+4 | 2.500k | 1.200k | 220k | 70k | 1.450k | 6.250k, **trừ nợ 2.000k còn 4.250k** | Mục tiêu Spa Mini 8.000k |

Bảng chưa trừ tiền nâng cấp. Người chơi trung thực sẽ mua khoảng 2.000 đến 2.500k nâng cấp trong 10 ngày, nên tới ngày 10 còn khoảng 1.700 đến 2.300k. Như vậy **vừa đủ trả nợ nếu không phung phí**. Người chơi lối dỏm có thể có thêm khoảng 40% tiền mặt tới ngày 6, nhưng kỳ vọng mất 1 lần phạt 15 đến 35% cộng với điểm trung bình review giảm (−1 khách). Hai lối nên về đích **xấp xỉ nhau**, lối dỏm thì kịch tính hơn.

### 6.5 Nâng cấp
| Nâng cấp | Giá | Hiệu ứng | Mở ngày |
|---|---|---|---|
| Máy xay xịn | 600k | Xay nhanh ×1,5, không kẹt với 3 món cứng | 3 |
| Thau to | 300k | Không trào, mẻ đôi (2 hũ cùng công thức) | 4 |
| **Đèn ring livestream** | 450k | `V_target` ×1,3 | 2 |
| Sạc dự phòng | 200k | Live 300 giây | 3 |
| Kệ thêm tầng | 350k | +4 ô nguyên liệu | 4 |
| Chậu thứ 3 đến 6 | 40k mỗi chậu | Vườn | 2 |
| Bình xịt chữa cháy | 150k | Cháy bếp chỉ cần 3 tap | 5 |
| Sim 2 số | 250k | Trả giá lần 2 | 5 |
| Giấy công bố mỹ phẩm | 1.200k | Nghi ngờ ×0,7, nhãn "có công bố" +5 điểm đơn | 6 |
| Biển hiệu đèn LED | 800k | +1 khách quầy/ngày | 7 |
| **Spa Mini** (mục tiêu chương 2) | 8.000k | Mở chương 2: khách đắp mặt tại chỗ | Sau ngày 10 |

### 6.6 Nguyên tắc cân bằng (để test tự động trong `src/core`)
- Ngày 1 phải **không thể lỗ** nếu làm được 3/4 đơn trên 3 sao (đã đặt tiền đầu 300k lớn hơn chi phí tối thiểu của 4 đơn cộng tiền trọ).
- Tim cộng quà không bao giờ vượt 25% doanh thu ngày.
- Lối dỏm cực đoan (100% dỏm, nổ max) phải chạm mốc nghi ngờ 85 **trước ngày 7** trong 90% số lần mô phỏng.
- Lối trung thực bỏ live hoàn toàn vẫn trả được nợ ngày 10 nếu điểm trung bình ≥ 75.
- Viết script `sim/economy.ts` chạy 1.000 lần mô phỏng cho 3 kiểu chơi (trung thực / lai / dỏm) và in ra phân phối tiền ngày 10.

---

## 7. Nhịp một ngày (để hệ phụ không chồng lên nhau)
1. **Sáng (khoảng 30 giây):** báo giá chợ, hộp thư review (review trễ, hoàn tiền), tưới vườn, gọi điện order và trả giá.
2. **Ngày (khoảng 4 phút):** 4 đến 7 khách tại quầy. Live bật hay tắt tuỳ ý, có thể có kiểm tra QLTT.
3. **Tối (khoảng 20 giây):** tổng kết (bảng lãi lỗ kiểu tờ hoá đơn dài), follower tăng, thu hoạch, mua nâng cấp, ngủ.

Mỗi ngày chỉ có **tối đa 1 sự kiện lớn** (kiểm tra, khách VIP, incident hiếm) để giữ nhịp dễ hiểu.

---

## Nguồn tham khảo
- Papers, Please: áp lực tới từ cơ chế (tiền phạt dồn vào nhu cầu gia đình), tốc độ đối lập độ chính xác: https://vaporlens.app/app/239030/papers_please.md ; https://www.killscreen.com/papers-please-puts-players-shoes-immigration-officers/
- Good Pizza, Great Pizza: vòng nhận đơn, làm, giao, khách vui thì có tiền boa, nâng cấp lò nhanh đầu tiên 250$: https://en.wikipedia.org/wiki/Good_Pizza,_Great_Pizza ; https://gamerjournalist.com/use-these-upgrades-if-you-want-your-pizza-shop-to-stand-out/
- Stardew Valley: cây lớn theo đêm, không tưới thì không lớn, mưa tự tưới: https://stardewvalleywiki.com/Crops
- Game mô phỏng streamer và cơ chế Hype Train (thanh hype có thời hạn, cộng đồng góp): https://scholarspace.manoa.hawaii.edu/items/931843d4-7199-45f3-9b21-f63feb3468ed/full ; https://www.makeinfluence.com/en/academy/twitch-hype-trains-a-community-driven-sponsorship-mechanic-distinct-from-subs-and-bits ; https://mcjdh.itch.io/streamer-quest
- Bối cảnh pháp lý thật (chỉ để hiểu, không trích vào game): Nghị định 98/2020/NĐ-CP xử phạt hàng giả, quảng cáo trong thương mại: https://luatvietnam.vn/vi-pham-hanh-chinh/nghi-dinh-98-2020-nd-cp-xu-phat-vi-pham-hanh-chinh-trong-hoat-dong-thuong-mai-189759-d1.html ; https://lsvn.vn/san-xuat-buon-ban-hang-gia-co-the-bi-phat-den-100-trieu-dong-tuoc-giay-phep-kinh-doanh-a158623.html
- Các số liệu cân bằng (giá, ngưỡng, công thức) là đề xuất thiết kế của nhóm, chưa qua playtest.
