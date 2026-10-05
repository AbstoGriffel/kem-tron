# Gameplay loop cho "Kem Trộn": học từ Potion Craft, Good Pizza Great Pizza, Papa's, Cooking Mama, Papers Please

> Mảng: gameplay-loop. Mục tiêu: chốt core loop / session loop / meta loop, cách viết order mơ hồ, nhịp khó, onboarding không chữ, lịch mở khoá 10 ngày đầu và các "moment" đáng chia sẻ.
> Ghi chú nguồn: mạng nội bộ chặn nhiều trang, phần lớn dẫn chứng lấy từ snippet tìm kiếm (wiki, review, store). Chỗ nào là suy luận thiết kế của nhóm thì ghi rõ "đề xuất".

---

## 1. Kết luận chính

1. **Một màn hình, ba nhịp:** khách đến → trộn trong thau → giao hũ. Mỗi đơn 40–70 giây, 4–6 đơn một ngày, ngày dài 3–5 phút. Đây là khung của Good Pizza Great Pizza (GPGP) và Papa's.
2. **Bản đồ chỉ số kiểu Potion Craft là "não" của game**, nhưng trên màn dọc 390px phải rút gọn thành 3–4 thanh chỉ số + 1 thanh ĐỘC TỐ, có vạch mục tiêu của khách hiện thẳng trên thanh.
3. **Order mơ hồ là nguồn hài lớn nhất và rẻ nhất:** khách nói kiểu mạng ("trắng như tờ A4 mà không bị bệch nha shop"), người chơi phải dịch sang chỉ số. GPGP chứng minh câu đố trong lời khách giữ chân lâu hơn cả công thức.
4. **Ăn gian phải có lợi thật, rủi ro thật nhưng không chết ngay** — học Papers Please: 2 lần "lỡ" mỗi ngày không bị phạt, từ lần 3 mới bị trừ; nhưng tích luỹ "Hồ sơ nghi vấn" thì có ngày công an gõ cửa.
5. **Chấm điểm theo từng khâu như Papa's** (Đúng ý / Độc tố / Đóng gói / Tốc độ) để người chơi biết mình sai ở đâu, không phải đoán.
6. **Minigame thao tác kiểu Cooking Mama dưới 10 giây**: khuấy vòng tròn, nghiền, dán nhãn, trả giá. Mỗi cái là một cử chỉ, không có nút.
7. **Livestream là lớp "khán giả" phản ứng với lỗi của người chơi**, biến thất bại thành nội dung hài — chính là thứ người chơi chụp màn hình chia sẻ.

---

## 2. Bài học từ từng game

| Game | Cơ chế đáng lấy | Áp vào Kem Trộn |
|---|---|---|
| **Potion Craft** | Mỗi nguyên liệu có "đường đi" cố định trên bản đồ; nghiền càng kỹ đi càng xa; có vùng đầu lâu, ở lâu là hỏng mẻ, mất nguyên liệu. Bán cho ai ảnh hưởng danh tiếng; danh tiếng quyết định loại khách và giá. Trả giá bằng thanh trượt, bấm đúng icon. | Nguyên liệu = vector cộng/trừ vào chỉ số. Nghiền/xay = hệ số khuếch đại (xay 1 lần ×1, 3 lần ×1.5). Vùng đầu lâu = thanh ĐỘC TỐ vượt ngưỡng. Danh tiếng hai trục: "Uy tín" và "Tai tiếng", mở hai nhóm khách khác nhau. |
| **Good Pizza Great Pizza** | Khách nói chuyện mơ hồ, đánh đố ("pizza pepperoni mà không có pepperoni"). Lời thoại lấy từ chuyện thật của dev. Order, làm và giao trên cùng một màn. Có tip, có nhân vật quay lại. | Bộ khách "đánh đố" bằng ngôn ngữ mạng. Nhân vật quay lại có cốt truyện nhỏ (khách bị kích ứng quay lại đòi tiền, khách quen thành "đại lý cấp 1"). |
| **Papa's series** | Chấm từng trạm (Chờ, Topping, Nướng, Cắt) bằng icon; tip theo chất lượng; khách đầy "Star Gauge" thì có huy hiệu + tip thưởng; mở khoá nguyên liệu theo rank. | Màn kết đơn chấm 4 khâu bằng 4 icon to + tiếng "tinh/toẹt". Khách quen có thanh "fan cứng". Rank shop mở nguyên liệu mới. |
| **Cooking Mama** | Mỗi thao tác là minigame < 10 giây, một cử chỉ (vuốt để thái, vẽ vòng để khuấy); điểm món = trung bình các bước → huy chương đồng/bạc/vàng. Có nhân vật phản ứng to ("Mama sẽ sửa cho!"). | Khuấy = vẽ vòng tròn, nhanh quá thì bắn tung toé, chậm quá thì vón. Nghiền = gõ liên tục. Dán nhãn = vuốt cho thẳng. Nhân vật "Chị Chủ Shop" (không phải người thật) phản ứng thay chữ. |
| **Papers Please** | Mỗi ngày thêm 1 luật; lương theo số người xử lý; 2 citation miễn phí/ngày rồi mới bị phạt; cuối ngày phải trả tiền nhà, sưởi, ăn cho gia đình; lựa chọn đạo đức (nhận hối lộ, cho vợ chồng qua) có giá. | Cuối ngày trả tiền: mặt bằng, tiền mạng, tiền "phí quảng cáo". Ăn gian = lời ngay, ghi vào "Hồ sơ nghi vấn". Mỗi ngày thêm 1 luật/1 xu hướng mạng mới. |
| **Overcooked (mobile/clone)** | Áp lực thời gian và hỗn loạn tạo hài; nhưng nhiều thao tác song song dễ rối trên màn nhỏ. | Chỉ lấy áp lực nhẹ: thanh kiên nhẫn của khách. Không làm đa nhiệm song song. |
| **Quán ăn idle (sushi, cafe)** | Thu nhập thụ động, quay lại nhận tiền, nâng cấp tăng số. | Chỉ dùng cho livestream "treo" và vườn dưa leo/cà chua. Không để idle lấn át phần trộn tay. |

---

## 3. Ba vòng lặp

### 3.1 Core loop (mỗi đơn, 40–70 giây)

```
Khách xuất hiện + nói order (3–5s)
 → Chọn cốt kem (1 chạm) 
 → Kéo nguyên liệu vào thau, nhìn thanh chỉ số nhảy (preview, kéo ra được) (15–30s)
 → Bắt đầu khuấy/xay = khoá lại (minigame 5–8s)
 → Kem ra màu → chọn hũ + nhãn (5–10s)
 → Giao → khách phản ứng + chấm 4 icon + tiền/tip (5s)
```

Quy tắc giữ nhịp:
- Từ lúc chạm đến lúc thấy phản hồi < 150ms; mỗi nguyên liệu rơi vào thau phải có squash & stretch + tiếng "bõm".
- Thanh chỉ số hiện **vạch mục tiêu** (vùng xanh) mà người chơi tự suy ra từ order. Đề xuất: ngày 1–2 vạch hiện sẵn; từ ngày 3 chỉ hiện sau khi người chơi "dịch" order (chạm vào bong bóng thoại → bong bóng tách thành tag chỉ số).
- Điểm "không quay lại được" chỉ có một: lúc bắt đầu khuấy. Trước đó mọi thứ hoàn tác được — giúp người chơi mới dám thử.

### 3.2 Session loop (1 ngày trong game, 3–5 phút)

| Pha | Thời lượng | Nội dung |
|---|---|---|
| **Sáng: Chuẩn bị** | 20–40s | Xem "tin hot" của ngày (1 xu hướng mạng, vd "mốt da thuỷ tinh"), check kho, gọi điện nhập hàng + trả giá, thu hoạch vườn. |
| **Mở bán** | 2–3 phút | 4–6 đơn. Đơn 3 hoặc 4 là "đơn đặc biệt" (khách đánh đố, khách sộp, thanh tra cải trang). |
| **Sự cố giữa ngày** | 0–20s | 1 sự kiện ngẫu nhiên: mất điện máy xay, mèo nhảy vào thau, live bị report. |
| **Tối: Chốt sổ** | 20–30s | Màn "Sổ cái": doanh thu, trừ tiền mặt bằng/tiền mạng; review sao từ khách (comment hài); thanh "Hồ sơ nghi vấn". Mở khoá/nâng cấp. Nút to "Ngày mai". |

Tại sao 4–6 đơn: đủ để có 1 nhịp lên (đơn khó) và 1 nhịp xả (đơn dễ cuối ngày), giữ ngày trong khoảng 3–5 phút cho người chơi điện thoại lướt nhanh.

### 3.3 Meta loop (nhiều ngày)

- **Tiền** → nâng cấp dụng cụ (máy xay mạnh hơn = ít bước nghiền), mở nguyên liệu, hũ/nhãn xịn (tăng giá bán).
- **Uy tín vs Tai tiếng** (hai thanh riêng, đề xuất): uy tín mở khách "sang", tai tiếng mở khách "chơi lớn" trả nhiều nhưng soi kỹ, và kéo thanh tra.
- **Follower livestream** → mở "chương" mới: phòng trọ → kiot chợ → "showroom" → "nhà máy" (châm biếm chung, không tên thật).
- **Sổ công thức**: công thức chấm 3 sao được lưu, lần sau trộn nhanh bằng 1 chạm nếu đủ nguyên liệu → phần thưởng cho việc thành thạo và giảm việc lặp.
- **Cốt truyện ngắn theo nhân vật quay lại**: khách bị kích ứng, đối thủ bán kem "chính hãng", bà con hàng xóm, người phóng viên điều tra.

---

## 4. Viết order "mơ hồ hài hước" để người chơi phải suy luận

### 4.1 Công thức 3 lớp

| Lớp | Mô tả | Ví dụ |
|---|---|---|
| **Rõ** (ngày 1–2) | Nói thẳng chỉ số | "Cho chị hũ trắng 2 tông nha." |
| **Ẩn dụ** (ngày 3+) | Ẩn chỉ số trong hình ảnh đời thường | "Em muốn trắng như màn hình điện thoại lúc 2 giờ sáng." → Trắng cao. |
| **Mâu thuẫn / đánh đố** (ngày 5+) | Hai yêu cầu kéo ngược nhau hoặc phủ định | "Trắng bật tông mà nhìn phải tự nhiên như chưa bôi gì." → Trắng vừa + Mịn cao, ĐỘC TỐ thấp. |
| **Bẫy đạo đức** | Đòi kết quả không thể an toàn | "Một đêm lên 5 tông, chị trả gấp ba." → Chỉ đạt được bằng nguyên liệu dỏm. |

### 4.2 Từ điển "tiếng mạng → chỉ số" (đề xuất, đặt trong data/orders.json)

| Cụm khách nói | Chỉ số ngầm |
|---|---|
| "trắng bật tông", "trắng phát sáng", "trắng như sứ" | Trắng ↑ |
| "căng bóng", "da em bé", "glass skin" | Ẩm ↑, Mịn ↑ |
| "lỗ chân lông bé như kiến" | Se khít ↑ |
| "đi nắng không đen", "đi biển cả tuần" | Chống nắng ↑ |
| "bôi xong đi làm luôn", "không bết" | Khô nhanh ↑ |
| "da em nhạy cảm lắm", "bôi gì cũng ngứa" | ĐỘC TỐ phải rất thấp |
| "mùi thơm như trà sữa" | Mùi (chỉ số phụ, ảnh hưởng tip) |
| "rẻ thôi em ơi", "sinh viên nghèo" | Budget thấp |

Nguyên tắc:
- Mỗi order chỉ ẩn **tối đa 2 chỉ số chính** + 1 ràng buộc (budget/ĐỘC TỐ). Nhiều hơn là đánh đố quá tay.
- Luôn có **gợi ý hình ảnh** đi kèm: khách cầm kính râm (chống nắng), mặt rỗ như bánh đa (se khít), khách mồ hôi nhễ nhại (khô nhanh). Hình kể thay chữ — hợp với người chơi không đọc kỹ.
- Lần đầu gặp một cụm từ, nếu người chơi trộn sai thì màn chấm điểm "dịch hộ": bong bóng thoại hiện tag chỉ số → học qua thất bại, không cần tutorial.
- Chừa chỗ để người chơi "bẻ" order: khách đánh đố cho điểm thưởng nếu đoán đúng ý ẩn (GPGP-style).

---

## 5. Ăn gian, bị bắt và review (Papers Please + Potion Craft)

| Hành vi | Lợi trước mắt | Hậu quả |
|---|---|---|
| Dùng nguyên liệu dỏm thay hàng tốt | Lời +30–60% đơn | +Hồ sơ nghi vấn; khách có tỷ lệ kích ứng (quay lại hôm sau đòi hoàn tiền) |
| Thổi phồng nhãn ("trắng 10 tông") | Giá bán +20% | Review 1 sao nếu không đạt; tăng nghi vấn |
| Bán cho khách "đòi bất khả thi" | Tiền gấp 2–3 | Nghi vấn tăng mạnh |
| Từ chối khách | 0 tiền | Uy tín +, livestream có comment khen "shop có tâm" |

Cơ chế đề xuất:
- **Hồ sơ nghi vấn** (thanh hình bìa hồ sơ dày dần). Mỗi ngày có 2 "lần lỡ" miễn phí (giống 2 citation miễn phí của Papers Please), sau đó mới cộng điểm.
- Đạt mốc 1: "khách lạ đeo kính đen" xuất hiện (thanh tra cải trang). Bán đồ dỏm cho người này → bị bắt ngay. Có manh mối nhìn ra (giày công sở, hỏi "giấy phép đâu em").
- Đạt mốc 2: công an gõ cửa cuối ngày → minigame "giấu thau" hoặc nộp phạt; thua thì **game over mềm**: mất tiền + reset về phòng trọ, giữ sổ công thức. Màn game over là một "bản tin thời sự" hài (châm biếm chung) → moment chia sẻ.
- Review: khách để lại sao + comment kiểu mạng ("Shop ơi mặt em giờ như cái bánh bao trắng có vân xanh"). 1–2 sao: hoàn tiền một phần; dưới 2.5 sao trung bình 3 ngày: follower giảm.

Nguyên tắc: ăn gian phải là **lựa chọn hấp dẫn thật** (lời nhiều hơn rõ ràng), không phải bẫy hiển nhiên — giống Papers Please, áp lực tiền nhà cuối ngày đẩy người chơi vào vùng xám.

---

## 6. Minigame thao tác (Cooking Mama: 1 cử chỉ, dưới 10 giây)

| Thao tác | Cử chỉ | Đúng | Sai (hài) |
|---|---|---|---|
| Nghiền/giã | Gõ liên tục | Đủ số gõ → nguyên liệu mịn, hệ số ×1.5 | Gõ quá → bắn vào mặt, dính bột |
| Xay sinh tố | Giữ nút nguồn, thả đúng vùng | Kem mịn | Giữ quá → máy rung nhảy khỏi bàn, khói đen |
| Khuấy | Vẽ vòng tròn | Đều tay → màu đẹp | Quá nhanh → tung toé lên điện thoại livestream |
| Dán nhãn | Vuốt từ trái sang | Thẳng → +điểm đóng gói | Lệch → nhãn chéo, khách bình luận "hàng fake à" |
| **Trả giá (thay thanh chạy)** | Xem mục 6.1 | | |

### 6.1 Trả giá qua điện thoại — phương án meme hơn thanh chạy

Đề xuất 3 lựa chọn, chọn 1 để prototype:
1. **"Than nghèo" (khuyên dùng):** đầu dây bên kia là "mối sỉ". Người chơi chọn liên tiếp 3 câu than từ 3 lá bài (vd "Em mới ra trường", "Mẹ em đang ốm", "Tuần trước anh giao thiếu"). Mỗi lời có độ "thấm" ẩn theo tính cách mối; chọn lặp lại câu cũ → mối cúp máy. Là minigame đọc người, rất hợp giọng châm biếm.
2. **"Giọng ngọt":** giữ ngón tay để giữ đồng hồ "ngọt ngào" trong vùng xanh trong khi mối nói liên tục — nhả quá sớm thành lạnh lùng, giữ quá lâu thành "sến" và bị nghi lừa.
3. **"Nhắn tin xả hàng":** chạm nhanh vào sticker đúng lúc mối gửi tin (nhịp rhythm), sai thì gửi nhầm sticker.

Giữ thời lượng ≤ 10 giây, có thể bỏ qua (mua giá niêm yết) để không chặn người chơi lười.

---

## 7. Livestream: lớp khán giả + thu nhập thụ động

- Bật/tắt bằng cách chạm vào điện thoại xa xa trên bàn (diegetic). Khi bật: số mắt xem góc trên, comment chạy dọc màn.
- **Phản ứng với sự kiện vừa xảy ra** (đây là động cơ hài chính): khuấy tung toé → "Ủa clip ASMR hả shop"; ĐỘC TỐ đỏ → "Mắt em cay qua màn hình luôn"; khách bị kích ứng quay lại ngay trên live → số mắt xem nhảy vọt (drama = view).
- Mắt xem ×  độ hot → tiền "chốt đơn" từ khách online (đơn ship, không cần trộn tay, ăn từ sổ công thức). Đây là thu nhập thụ động có kiểm soát.
- Đánh đổi (đề xuất): live càng đông càng dễ bị report → cộng Hồ sơ nghi vấn nếu đang ăn gian. Tạo lựa chọn: tắt live khi đang làm đồ dỏm, hay "liều" để lấy view.
- Incident ngẫu nhiên khi live: để bật lửa quá lâu → khói che camera; mèo đi ngang; mẹ gọi điện vào giữa live.

---

## 8. Nhịp độ khó

| Ngày | Điều mới (mỗi ngày đúng 1 thứ) | Số đơn | Chỉ số đang dùng |
|---|---|---|---|
| 1 | Cốt kem + 3 nguyên liệu, order rõ, vạch mục tiêu hiện sẵn | 3 | Trắng, ĐỘC TỐ |
| 2 | Nghiền/xay tăng hiệu lực; hũ và nhãn | 4 | + Ẩm |
| 3 | Order ẩn dụ; nguyên liệu bù trừ độc tố (dưa leo) | 4 | + Se khít |
| 4 | Gọi điện nhập hàng + trả giá; kho có giới hạn | 4 | |
| 5 | Livestream mở; comment phản ứng | 5 | + Chống nắng |
| 6 | Nguyên liệu dỏm xuất hiện (rẻ, mạnh, độc); Hồ sơ nghi vấn | 5 | |
| 7 | Khách quay lại (kích ứng/khen); review sao ảnh hưởng follower | 5 | + Khô nhanh |
| 8 | Vườn dưa leo/cà chua/thảo dược | 5 | |
| 9 | Sổ công thức + trộn nhanh 1 chạm | 6 | |
| 10 | Thanh tra cải trang, sự kiện "công an gõ cửa", mục tiêu chương 1: chuyển lên kiot chợ | 6 | Đủ 5 chỉ số |

Quy tắc chung:
- **Mỗi ngày đúng một thứ mới** (giống Papers Please thêm một luật mỗi ngày). Không bao giờ hai cơ chế mới cùng lúc.
- Đường cong răng cưa: đơn khó giữa ngày, đơn dễ cuối ngày; ngày có cơ chế mới thì giảm 1 đơn.
- Từ ngày 11: khó tăng bằng **kết hợp** (order mâu thuẫn, budget chặt, khách soi độc tố) chứ không thêm thanh chỉ số.

---

## 9. Onboarding không chữ dài

1. **Ngày 1 là tutorial trá hình:** chỉ có 3 nguyên liệu trong ngăn, những thứ khác bị dán băng keo "Chưa nhập". Không thể làm sai quá nhiều.
2. **Bàn tay chỉ** nhấp nháy trên vật cần kéo, biến mất khi người chơi làm đúng 1 lần.
3. **Khách hàng đầu tiên là "Mẹ"** (nhân vật giả, không phải người thật): "Con trộn thử cho mẹ coi" → order rõ nhất có thể, thất bại không mất tiền.
4. **Học bằng phản hồi:** ĐỘC TỐ lên đỏ thì thau sủi bọt xanh, mặt nhân vật nhăn; không cần câu giải thích.
5. **Chữ tối đa 1 dòng / màn hình**, mọi giải thích còn lại nằm trong lời thoại khách hoặc comment livestream.
6. **Cho phép kéo ra trước khi khuấy** — người chơi tự khám phá bằng thử–sai an toàn.

---

## 10. Cơ chế bất ngờ (event deck)

Mỗi ngày rút 0–1 thẻ sự kiện (data/events.json), trọng số theo ngày và theo Tai tiếng:

| Sự kiện | Tác động |
|---|---|
| "Trend mới trên mạng": ai cũng đòi chống nắng | Đơn có chỉ số đó +50% tip trong ngày |
| Mất điện | Không dùng được máy xay, chỉ được nghiền tay |
| Mèo nhảy vào thau | Thêm 1 nguyên liệu ngẫu nhiên (lông mèo: ĐỘC TỐ +) |
| KOL ảo ghé shop | Đơn khó, làm tốt thì follower ×2 |
| Đối thủ "chính hãng" chê trên live | Follower giảm trừ khi đơn kế tiếp 3 sao |
| Mối sỉ giao nhầm hàng | Một nguyên liệu bị đổi nhãn (dạy người chơi nhìn màu) |
| Thanh tra cải trang | Xem mục 5 |

---

## 11. Mục tiêu dài hạn

- **Chương 1 (ngày 1–10):** Phòng trọ → kiot chợ. Mục tiêu: 1.000 follower + đủ tiền thuê kiot.
- **Chương 2 (ngày 11–20):** Kiot → "showroom". Mở chỉ số Mùi, khách sộp, sự kiện livestream lớn ("sale 12.12" châm biếm chung).
- **Chương 3 (ngày 21–30):** Ngã rẽ đạo đức — "nhà máy" (Tai tiếng cao, lời to, kết cục bị phanh phui trên bản tin) hoặc "thương hiệu tử tế" (Uy tín cao, giá chuẩn, kết cục được khách quen thương). Học Potion Craft + Papers Please: nhiều kết cục theo lựa chọn.
- **Sưu tầm:** bộ sưu tập hũ/nhãn, "Album khách hàng" (chân dung từng khách, trạng thái sau khi dùng kem — rất dễ hài), danh hiệu mỗi ngày.

---

## 12. "Moment" khiến người chơi chia sẻ

| Moment | Vì sao chia sẻ | Thiết kế |
|---|---|---|
| **Ảnh "Trước – Sau" của khách** | Đúng format quảng cáo kem trộn, tự châm biếm | Cuối đơn có card trước/sau; kem dỏm → mặt "sau" trắng xanh như ma, có nút lưu ảnh. |
| **Bản tin thời sự lúc bị bắt** | Thất bại hài nhất | Màn game over dạng bản tin, tên shop do người chơi đặt chạy chữ phía dưới. |
| **Comment livestream** khi tai nạn | Văn hoá mạng quen thuộc | Comment sinh từ template theo sự kiện vừa xảy ra. |
| **Review 1 sao siêu bựa** | Đọc to cho bạn bè | Kho 100+ review theo loại lỗi (độc tố, sai tông, nhãn lệch). |
| **Kem màu kỳ cục** (trộn nhiều nguyên liệu → màu tím than) | Hình ảnh lạ | Hệ màu trộn thật theo nguyên liệu, có tên màu hài ("Tím Bầm Tình Yêu"). |
| **Danh hiệu cuối ngày** | Tự nhận mình | "Thánh Chốt Đơn", "Thợ Pha Trộn Lương Tâm", "Kẻ Bị Mẹ Tịch Thu Thau". |

---

## 13. Quyết định đề xuất (tóm tắt)

1. Ngày chơi = 4–6 đơn, 3–5 phút, cấu trúc Sáng chuẩn bị → Mở bán → Sự cố → Tối chốt sổ.
2. Bản đồ chỉ số Potion Craft rút gọn: 5 chỉ số + ĐỘC TỐ dạng thanh dọc cạnh thau, có vạch mục tiêu; nguyên liệu = vector cộng/trừ, nghiền = hệ số.
3. Preview tự do, khoá duy nhất ở lúc bắt đầu khuấy.
4. Order 3 lớp (rõ → ẩn dụ → mâu thuẫn) + từ điển tiếng mạng → chỉ số trong data JSON; tối đa 2 chỉ số ẩn mỗi order; luôn có gợi ý bằng hình trên người khách.
5. Chấm 4 khâu kiểu Papa's: Đúng ý, Độc tố, Đóng gói, Tốc độ; tổng thành sao + tip.
6. Ăn gian: "Hồ sơ nghi vấn" với 2 lần lỡ miễn phí/ngày, thanh tra cải trang, game over mềm dạng bản tin thời sự.
7. Trả giá: thay thanh chạy bằng minigame "Than nghèo" chọn 3 câu than, ≤10s, có nút bỏ qua.
8. Mỗi ngày đúng một cơ chế mới theo lịch ngày 1–10 ở mục 8.
9. Livestream: comment phản ứng sự kiện + thu nhập từ đơn online, đánh đổi bằng rủi ro bị report.
10. Card "Trước – Sau" và bản tin bị bắt có nút lưu ảnh — hai cửa chia sẻ chính.

---

## Nguồn

- Good Pizza, Great Pizza — Wikipedia: https://en.wikipedia.org/wiki/Good_Pizza,_Great_Pizza
- GPGP — App Store "Behind the scenes" (order lấy từ trải nghiệm thật của dev): https://apps.apple.com/ca/story/id1446242882
- GPGP — TalkAndroid beginners guide (khách nói đố, order mơ hồ): https://www.talkandroid.com/15864-good-pizza-great-pizza-basic-gameplay-guide/
- Potion Craft — TheGamer pro tips (trả giá, danh tiếng): https://www.thegamer.com/potion-craft-pro-tips-tricks-secrets/
- Potion Craft — Attack of the Fanboy, Reputation vs Popularity: https://attackofthefanboy.com/guides/difference-between-reputation-vs-popularity-in-potion-craft/
- Potion Craft — Destructoid impressions (bản đồ, đường đi nguyên liệu): https://www.destructoid.com/potion-craft-alchemist-simulator-relaxing-alchemy-shop-sim-impressions/
- Potion Craft — HackerNoon "A look at Potion Craft" (vùng đầu lâu, nghiền): https://sia.hackernoon.com/a-look-at-potion-craft-an-alchemist-simulator
- Papa's Pizzeria — Flipline FAQ (chấm từng trạm, tip): https://i.flipline.com/games/papaspizzeria/faq.html
- Papa's — Flipline Wiki, Order Station: https://fliplinestudios.fandom.com/wiki/Order_Station
- Cooking Mama — Wikipedia: https://en.wikipedia.org/wiki/Cooking_Mama_(video_game)
- Cooking Mama — Mechanics of Magic, MDA & 8 Kinds of Fun: https://mechanicsofmagic.com/2026/04/06/mda-8-kinds-of-fun-cooking-mama-2/
- Papers, Please — Citation (Fandom wiki): https://papersplease.fandom.com/wiki/Citation
- Papers, Please — Reason, "Politics in games" (phỏng vấn Lucas Pope): https://reason.com/2013/09/26/papers-please-politics-in-games-and-the/
- Papers, Please — Mechanics of Magic, Read Write Play: https://mechanicsofmagic.com/2026/05/15/read-write-play-papers-please-krystal-li/
- Overcooked / quán ăn idle: dựa trên hiểu biết chung về thể loại, không có nguồn trích riêng.
