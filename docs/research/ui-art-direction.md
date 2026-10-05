# UI & Art Direction — Kem Trộn

Mảng: ui-art-direction · Ngày: 04/10/2026 · Màn hình mục tiêu: 390×844 dọc, web mobile, 1 file HTML.

## 1. Kết luận nhanh

1. **Một màn chính, ba tầng sâu**: phía xa (điện thoại livestream + khách đứng ở cửa/quầy) → bàn inox (thau kem, máy xay, ticket order kẹp trên máy xay) → ngăn nguyên liệu sát mép dưới (vùng ngón cái). Bố cục này lấy từ Good Pizza Great Pizza (khách và bàn chung khung) và Papa's (ticket kẹp, trạm đổi bằng nút góc), nhưng gộp tất cả vào một khung hình.
2. **Mọi chỉ số đều là vật thể trong quán**: preview chỉ số = vạch trên tờ ticket, độc tố = nhiệt kế/bong bóng sủi trong thau, tiền = hộp sắt bánh quy, đánh giá = bình luận bay trên màn hình điện thoại. Không có panel dashboard.
3. **Art = vector phẳng kiểu Dumb Ways to Die**: nhân vật hạt đậu, màu bão hoà, không viền hoặc viền nâu-đen mảnh, mắt chấm to; cộng thêm biến dạng hài (squash & stretch, mặt phồng, mắt lồi) của Thank Goodness You're Here.
4. **Chất Việt nằm ở vật liệu**, không nằm ở nhân vật: gạch men hoa, ghế/rổ nhựa đỏ, thau nhôm, bàn inox, rèm hoa, ổ điện chằng chịt, đèn tuýp.
5. **Font**: tiêu đề `Paytone One`, chữ thân `Be Vietnam Pro`, chữ viết tay `Itim` hoặc `Pangolin`. Cả ba đều có subset `vietnamese` trên Google Fonts. **Chewy, Fredoka, Luckiest Guy, Lilita One, Titan One KHÔNG có dấu tiếng Việt**, loại.
6. **Chạm**: mọi vật bấm được ≥ 48×48 px (lý tưởng 56), cách nhau ≥ 8 px; vùng chạm có thể lớn hơn hình vẽ.

## 2. Bài học từ từng game tham khảo

| Game | Làm gì hay | Lấy gì cho Kem Trộn | Bỏ gì |
|---|---|---|---|
| **Potion Craft** | Thao tác vật lý với dụng cụ (cối giã, vạc, ống thổi lửa); hình ảnh lấy cảm hứng từ sách thuốc trung cổ; bản đồ giả kim — mỗi nguyên liệu đẩy chai thuốc đi một đoạn, phải tránh vùng nguy hiểm; sổ công thức lưu để pha lại | Vạch "đường đi" của kem trên tờ ticket = preview; vùng nguy hiểm → thanh độc tố; giã/xay mịn tăng hiệu lực; sổ công thức pha nhanh | Bản đồ 2D phức tạp — quá khó đọc trên 390px; thay bằng 3–4 thanh chỉ số |
| **Good Pizza Great Pizza** | Khách đứng quầy nói chuyện bằng lời (không phải icon), người chơi phải hiểu ý; bàn làm việc nhìn từ trên | Khách nói câu meme mơ hồ ("da em đen như cột nhà cháy, cứu!"), ticket ghi chú dịch ra chỉ số; bàn nhìn chéo từ trên | Chuyển cảnh qua lại giữa quầy và bếp — mình gộp 1 màn |
| **Papa's (Pizzeria / To Go!)** | Ticket order kẹp trên dây, phóng to để đọc; nhiều trạm, nút đổi trạm ở góc; chấm điểm theo từng trạm cuối mỗi đơn | Ticket giấy kẹp vào máy xay, chạm để phóng to; điểm cuối đơn chia theo từng tiêu chí (tông, se khít, độc tố, bao bì) | Nhiều trạm phải chuyển màn |
| **Dumb Ways to Die** | Nhân vật "hạt đậu" nhiều màu, đơn giản, chết rùng rợn mà dễ thương; palette phẳng tươi; minigame 3–5 giây cực đơn giản | Thân hạt đậu, mắt chấm, không mũi; tai nạn hài (nổ thau, bỏng, mặt xanh lè) dễ thương chứ không ghê; minigame trả giá cực ngắn | Chủ đề an toàn giao thông, tông giáo dục |
| **Thank Goodness You're Here!** | Vẽ tay màu tươi, hài thể chất kiểu sketch show Anh; nhân vật làm như mọi chuyện hỗn loạn là bình thường; hành động chính = tát đồ vật | Giọng "mặt tỉnh bơ": khách bị phỏng vẫn khen "da sáng hẳn", review 1 sao rất nghiêm túc; mắt to lồi, biến dạng khi sốc | Thế giới mở đi lại |
| **Unpacking** | Đồ vật kể chuyện, không cần lời; âm thanh đặt đồ rất "đã"; không có HUD | Quầy tích đồ dần theo ngày (cúp "Top seller", giấy phạt, hũ lỗi) = tiến trình; mỗi nguyên liệu thả vào thau có tiếng riêng | Pixel art |
| **Cooking Mama** | Cử chỉ trùng thao tác thật (xoay tròn để khuấy, vuốt để cắt); chấm từng bước ngay lập tức; mẹ khen/hoả quá đà | Khuấy = xoay tròn ngón tay trên thau; xay = giữ nút máy xay; phản hồi tức thì bằng biểu cảm của nhân vật chính | Chuỗi bước dài tuyến tính |

### Nguyên tắc rút ra

- **Một thao tác = một cử chỉ thật**: kéo nguyên liệu (drag), giữ để xay (hold), xoay để khuấy (circle), chạm để đọc ticket (tap). Tránh nút chữ "Xay", "Khuấy".
- **Hoàn tác phải nhìn thấy được**: nguyên liệu chưa khuấy nổi trên mặt thau (chưa tan), kéo ra được; khi khuấy → xoáy màu hoà vào, khoá lại. Hình ảnh tự nói "không quay lại được".
- **Khách nói tiếng người, ticket nói tiếng số**: lời thoại bong bóng là chỗ để bựa; ticket là chỗ để rõ ràng.
- **Hài nằm ở hệ quả**, không ở menu: phối sai → thau sủi bọt tím, khói bay vào camera livestream, viewer tăng vọt.

## 3. Bố cục và vùng chạm (390×844)

Chia màn hình dọc theo vùng ngón cái (một tay cầm máy):

| Vùng | Toạ độ y (px) | Độ với ngón cái | Đặt gì |
|---|---|---|---|
| A. Phía xa | 0–250 | Khó với | Điện thoại livestream (chỉ xem + 1 công tắc lớn), khách đứng ở cửa, hộp tiền, đồng hồ treo tường (giờ trong ngày) |
| B. Bàn | 250–560 | Với được | Thau kem (vùng thả lớn ~220×160), máy xay, ticket order kẹp, nhiệt kế độc tố |
| C. Ngăn nguyên liệu | 560–844 | Dễ nhất | Khay 2 hàng × 4 ô (mỗi ô ≥ 80×80) cuộn ngang; tab cốt kem; ngăn kéo nhỏ "sổ công thức" và "điện thoại bàn" |

Quy tắc:
- Hành động thường xuyên (kéo nguyên liệu, khuấy) nằm ở B–C. Hành động hiếm (bật live, mở vườn) có thể ở A.
- **Không chừa bottom nav bar**: lối sang vườn/sổ/điện thoại là vật thể (cửa sau, cuốn sổ trên khay, điện thoại bàn quay số) nằm trong khung cảnh.
- Safe area: chừa 24 px dưới cùng cho thanh home iOS, 8–12 px hai bên; thử `env(safe-area-inset-bottom)`.
- Vùng chạm tối thiểu **48×48 px**, khuyến nghị 56 cho thao tác nhanh; khoảng cách ≥ 8 px. Hình vẽ nhỏ (lá thảo dược) được bọc vùng chạm vô hình to hơn.
- Kéo thả: bắt đầu kéo sau 6–8 px di chuyển để không nhầm với cuộn khay; vật đang kéo phóng to 1.15× và nổi lên trên ngón tay ~40 px để ngón không che.

## 4. Thông tin diegetic — bảng ánh xạ

| Dữ liệu game | Vật thể trong quán | Cách đọc |
|---|---|---|
| Yêu cầu khách (tông, se khít, chống nắng, nhanh khô) | Ticket giấy kẹp trên máy xay, chữ viết tay | 3–4 hàng icon + vạch mục tiêu; chạm để phóng to |
| Preview chỉ số mẻ hiện tại | Vạch bút dạ đỏ vẽ chồng lên ticket | Thanh mỗi hàng dài/ngắn theo nguyên liệu trong thau; vào vùng mục tiêu thì tick xanh |
| Độc tố | Nhiệt kế kẹp mép thau + màu bọt trong thau | Xanh → vàng → tím sủi bọt; vượt ngưỡng thì thau rung, có đầu lâu khói |
| Budget khách | Xấp tiền khách kẹp cùng ticket | Số tiền viết trên tờ tiền giấy nhỏ |
| Tiền đang có | Hộp sắt bánh quy (đồ đựng tiền kinh điển) | Nắp hộp ghi số; tiền vào thì nắp bật |
| Danh tiếng/sao | Màn hình điện thoại: sao trung bình + bình luận | Bình luận bay kiểu livestream |
| Số mắt xem | Icon mắt + số ở góc điện thoại | Tăng nhảy số + emoji bay |
| Mức nghi ngờ của công an | Tờ "giấy mời lên phường" dán tủ lạnh, dần đỏ; hoặc còi xa xa | Càng nhiều mép giấy cháy/đỏ càng nguy |
| Thời gian trong ngày | Đồng hồ treo tường + ánh nắng qua rèm | Rèm tối dần khi về chiều |
| Tồn kho nguyên liệu | Số hũ/gói còn trong mỗi ô khay | Vẽ đúng số lượng (≤5), trên 5 thì ghi số trên nắp |
| Thông báo tutorial | Giấy note vàng dán mép bàn | Chữ viết tay, có mũi tên vẽ tay |

Phần cài đặt/tạm dừng: một nút bánh răng 48 px nhỏ ở góc trên phải là ngoại lệ chấp nhận được (không diegetic).

## 5. Phong cách hình ảnh

### 5.1 Nhân vật
- Thân hạt đậu/viên nang, cao ~1.6–2× rộng, không cổ, tay chân que hoặc ống mềm, không ngón hoặc 3 ngón tròn.
- Mắt: chấm đen to hoặc hai lòng trắng to có đồng tử chấm (khi sốc thì lồi, tách khỏi thân như TGYH). Không vẽ mũi; miệng là một đường cong đổi hình.
- Phân biệt khách bằng **màu thân + một phụ kiện Việt**: nón bảo hiểm, khẩu trang vải, áo chống nắng trùm đầu, kẹp tóc càng cua, túi nilon, dép tổ ong.
- Mỗi khách 4 trạng thái biểu cảm: bình thường, mong chờ, vui (bật tông = thân trắng loá có tia sáng), giận/đổ bệnh (mặt nổi đốm, xanh lè).

### 5.2 Nét vẽ & hình khối
- Tô phẳng, tối đa 1 lớp bóng đổ cứng (màu đậm hơn 15–20%) và 1 highlight trắng mờ. Không gradient mềm, không shadow mờ.
- Viền: đồ vật chính có viền nâu-đen 2–3 px (dễ tách nền ở màn nhỏ); nhân vật **không viền** như DWtD — tách nền bằng tương phản màu.
- Góc bo tròn hết; vật thể hơi nghiêng/méo (bàn hơi lệch, hũ không thẳng) để bớt "UI".

### 5.3 Animation (GSAP)
| Sự kiện | Hiệu ứng | Thời lượng gợi ý |
|---|---|---|
| Thả nguyên liệu vào thau | Rơi + squash (scaleY 0.7, scaleX 1.25) + bắn giọt | 250–350 ms |
| Kéo ra khỏi thau | Nhấc lên kèm stretch, nhỏ giọt kem | 200 ms |
| Khách xuất hiện | Nhảy vào khung với overshoot (ease `back.out(2)`) | 400 ms |
| Máy xay | Rung lắc liên tục ±2 px, nắp nhảy | khi giữ |
| Độc tố vượt ngưỡng | Thau phình to, bọt tím, khói, camera điện thoại "zoom" vào | 600–900 ms |
| Tiền vào hộp | Tờ tiền bay vòng cung, nắp hộp bật | 500 ms |
| Idle | Nhân vật thở (scaleY ±3%, 2 s), mắt chớp ngẫu nhiên | lặp |

Giữ nguyên tắc: **mỗi animation mang thông tin**, không có hiệu ứng trang trí làm chậm vòng lặp. Cho phép tắt rung/nháy (`prefers-reduced-motion`).

## 6. Palette đề xuất (12 màu)

| # | Tên | Hex | Dùng cho |
|---|---|---|---|
| 1 | Kem gạch men | `#F4E7C5` | Tường, nền giấy ticket |
| 2 | Xanh ngọc gạch bông | `#2FB5A6` | Hoạ tiết gạch, nút "đồng ý" |
| 3 | Đỏ nhựa ghế đẩu | `#E63B2E` | Ghế nhựa, rổ, cảnh báo, nút live |
| 4 | Xanh dương thau nhựa | `#2F7FD8` | Thau nhựa, đồ điện, tab cốt kem |
| 5 | Inox sáng | `#CFD6DB` | Mặt bàn inox, thau nhôm |
| 6 | Inox tối | `#7E8B94` | Bóng đổ của inox, khay |
| 7 | Vàng nghệ | `#FFC53D` | Tiền, sao, highlight "khuyến mãi" |
| 8 | Hồng kem trộn | `#FF8DB0` | Kem thành phẩm, thương hiệu game |
| 9 | Xanh dưa leo | `#62B94E` | Nguyên liệu thiên nhiên, vườn, chỉ số đạt |
| 10 | Tím độc tố | `#7D2FBF` | Độc tố, khói, bọt hỏng |
| 11 | Nâu rèm hoa | `#B4513A` | Rèm, sàn gỗ, mặt tủ |
| 12 | Mực nâu-đen | `#2A1A16` | Viền, chữ, mắt nhân vật |

Thêm: trắng "bật tông" `#FFFDF6` cho hiệu ứng loá sáng. Màu da khách không lấy từ palette người thật (tránh chủ đề màu da) — khách là hạt đậu màu kẹo (hồng, cam `#FF8A3D`, xanh mint `#7FDCC6`, tím nhạt `#B9A3F0`), "nâng tông" thể hiện bằng **độ sáng + tia lấp lánh**, không tô thân người thành trắng hơn. Điểm này giúp châm biếm quảng cáo mà không chế giễu màu da.

Quy tắc dùng màu:
- Nền chiếm ~60% bằng 1, 5, 11 (trầm); đồ tương tác dùng màu bão hoà 2, 3, 4, 7, 8.
- Chữ trên giấy dùng 12 trên 1 (tương phản cao, ~14:1). Không đặt chữ trắng trên vàng 7.
- Trạng thái: đạt = 9, gần = 7, quá/hỏng = 10 hoặc 3 — luôn kèm icon/hình dạng, không chỉ dựa vào màu (người mù màu đỏ-lục).

## 7. Typography

Kiểm tra trực tiếp metadata Google Fonts (`fonts.google.com/metadata/fonts`, 04/10/2026):

| Font | Có subset `vietnamese`? | Nhận xét | Đề xuất |
|---|---|---|---|
| **Paytone One** | Có | Đậm, tròn, vui, 1 weight | **Tiêu đề, số tiền, logo** |
| **Be Vietnam Pro** | Có | Thiết kế cho tiếng Việt, dấu đẹp, nhiều weight | **Chữ thân, bình luận livestream, ticket in** |
| Baloo 2 | Có | Tròn, thân thiện, 400–800 | Thay thế Paytone nếu cần nhiều weight |
| Lexend | Có | Dễ đọc, hơi "app" | Chữ thân dự phòng |
| Nunito | Có | Tròn, nhẹ | Chữ thân dự phòng |
| Bungee (+ Inline/Shade) | Có | Chữ hoa kiểu biển hiệu | Biển quán, tem "HÀNG CHÍNH HÃNG"; kiểm tra dấu chồng chữ hoa (Ấ, Ữ) có bị chật dòng |
| Bangers | Có | Kiểu truyện tranh | Hiệu ứng chữ "BÙM!", "CHỐT!" |
| **Itim** / **Pangolin** / Mali / Patrick Hand | Có | Viết tay | **Ticket viết tay, giấy note, sổ công thức** |
| Grandstander, Gluten, Shantell Sans | Có | Vui, viết tay đậm | Lựa chọn thêm cho nhãn hũ |
| Chewy | **Không** | Chỉ latin | Loại |
| Fredoka | **Không** | latin, latin-ext, hebrew | Loại |
| Luckiest Guy, Lilita One, Titan One, Bowlby One, Changa One | **Không** | Thiếu dấu | Loại |

Thực thi (build 1 file, không CDN):
- Tải TTF/woff2 lúc build, subset bằng `pyftsubset` (fonttools) chỉ giữ Latin + khối Vietnamese (U+0000–00FF, U+0102–0103, U+0110–0111, U+0128–0129, U+0168–0169, U+01A0–01A1, U+01AF–01B0, U+1EA0–1EF9, U+20AB ₫), nhúng base64 `@font-face`. Ước lượng 20–45 KB/font sau subset.
- Tối đa 3 họ font. Cỡ chữ tối thiểu 14 px cho chữ thân, 12 px cho chú thích; số tiền ≥ 20 px.
- Kiểm tra render các chuỗi thử: "Trắng bật tông ỔN ĐỊNH — Ữ Ặ Ỡ ₫".
- Tên thương hiệu trên nhãn hũ là tên chế ("Bạch Tuyết Cấp Tốc", "Trắng Thần Sầu") — không dùng tên thương hiệu thật.

## 8. Wireframe ASCII

### 8.1 Màn chính (390×844)

```
┌──────────────────────────────────────┐ 0
│ [đồng hồ]   ░rèm hoa░    [⚙]          │
│  ┌──────────┐      ┌─────┐           │
│  │ ●LIVE 1.2k│ 👁   │khách│ "Da em     │  Vùng A
│  │ cmt bay.. │      │ hạt │  đen như   │  (phía xa)
│  │ ★★★★☆     │      │ đậu │  cột nhà   │
│  └──────────┘      └─────┘  cháy!"   │
│  [hộp bánh quy: 450k]  [giấy mời lên P]│ 250
│══════════ mép bàn inox ═══════════════│
│ ┌ticket kẹp┐   ╭─────────────╮  ┌──┐   │
│ │Tông ▓▓▓░|│   │   THAU KEM  │  │máy│  │  Vùng B
│ │Se   ▓░░░|│   │  ~ ~ ~ ~ ~  │  │xay│  │  (bàn)
│ │Nắng ▓▓░░|│   │ (nguyên liệu│  │  │  │
│ │Khô  ░░░░|│   │  nổi trên)  │  └──┘   │
│ │💵 300k   │   ╰─────────────╯ [nhiệt  │
│ └─────────┘    ↻ xoay để khuấy   kế độc]│
│ [hũ][nhãn]  (chọn sau khi khuấy xong)  │ 560
│───────── ngăn nguyên liệu ────────────│
│ [Cốt: Kem nền|Sữa tắm|Vaseline] ◀ ▶    │
│ ┌────┐┌────┐┌────┐┌────┐               │  Vùng C
│ │chanh││nghệ ││bột  ││dưa  │  ← cuộn →  │  (ngón cái)
│ │ x3 ││ x5 ││ ?? ││leo2│               │
│ └────┘└────┘└────┘└────┘               │
│ ┌────┐┌────┐┌────┐ [📕sổ] [☎ máy bàn]  │
│ │... ││... ││... │ [🚪 ra vườn]         │
│ └────┘└────┘└────┘                     │
└──────────────────────────────────────┘ 844
```

Ghi chú: ticket bên trái nhận vạch preview đỏ (`|` = mục tiêu). Nút "Giao hàng" chỉ xuất hiện sau khi đóng nắp hũ: kéo hũ lên tay khách (hành động kéo, không phải nút chữ).

### 8.2 Sổ công thức (mở đè lên bàn)

```
┌──────────────────────────────────────┐
│    (bàn mờ phía sau)                 │
│  ╔══════════════╤═══════════════╗    │
│  ║ TRẮNG THẦN   │ CÔNG THỨC #3  ║    │
│  ║ SẦU  (hũ hồng)│ cốt: kem nền  ║    │
│  ║ [ảnh hũ]     │ + chanh x2    ║    │
│  ║ Tông ▓▓▓▓    │ + nghệ  x1 ⚠  ║    │
│  ║ Độc  ▓░      │ + bột ?? x1   ║    │
│  ║ ★ bán 12 lần │ thiếu: nghệ   ║    │
│  ╚══════════════╧═══════════════╝    │
│    ◀ lật trang     lật trang ▶       │
│  [ ĐỔ VÀO THAU ]   [ đóng sổ ✕ ]     │  ← vùng ngón cái
└──────────────────────────────────────┘
```
Nguyên liệu thiếu bị gạch bút đỏ; nút đổ vào thau mờ đi khi thiếu.

### 8.3 Gọi điện đặt hàng + trả giá

```
┌──────────────────────────────────────┐
│  Điện thoại bàn cũ quay số (nhìn gần)│
│   ┌───────────────────────────┐      │
│   │ "Chị Sáu Sỉ Lẻ" (hạt đậu)  │      │
│   │ bong bóng: "Nghệ 50k/ký,   │      │
│   │  hàng xịn em ơi!"          │      │
│   └───────────────────────────┘      │
│   Đồ thị "kiên nhẫn" = sợi dây       │
│   điện thoại xoắn căng dần ~~~~~     │
│  ┌──────────────────────────────┐    │
│  │ Chọn câu trả giá (meme):      │    │
│  │ [ "Chị ơi em sinh viên" ]     │    │
│  │ [ "Bên kia bán 30k à nha" ]   │    │
│  │ [ "Thôi em cúp máy đây..." ]  │    │
│  └──────────────────────────────┘    │
│  Giỏ hàng = tờ lịch xé ghi tay  [CHỐT]│
└──────────────────────────────────────┘
```
Gợi ý thay thanh chạy qua lại: chọn câu nói + nhịp "giả vờ cúp máy" (giữ nút cúp đúng lúc dây xoắn căng nhất thì giá giảm; giữ lâu quá thì bên kia cúp thật).

### 8.4 Vườn (sân thượng / ban công)

```
┌──────────────────────────────────────┐
│  Trời + dây phơi đồ + bồn nước inox   │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │thùng│ │thùng│ │chậu │  (thùng xốp  │
│  │xốp  │ │xốp  │ │sơn  │  trồng rau)  │
│  │🥒3/3│ │🍅1/3│ │🌿 + │              │
│  └─────┘ └─────┘ └─────┘              │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ trống│ │ ... │ │ ... │             │
│  └─────┘ └─────┘ └─────┘              │
│  [bình tưới]  [túi hạt giống]          │  ← kéo lên thùng
│  [🚪 xuống quán]                       │
└──────────────────────────────────────┘
```
Chậu là thùng xốp, chậu sơn cũ, can nhựa cắt đôi — chất Việt rất rõ, dễ vẽ vector.

### 8.5 Kết thúc ngày

```
┌──────────────────────────────────────┐
│  Đèn tuýp tắt dần, chủ quán ngồi ghế  │
│  nhựa đếm tiền trên bàn inox          │
│  ┌──────── SỔ CHI TIÊU (giấy kẻ) ───┐ │
│  │ Bán được     12 hũ    +1.250k    │ │
│  │ Nguyên liệu           -  420k    │ │
│  │ Hoàn tiền     2 đơn   -  180k    │ │
│  │ Tiền live (donate)    +  95k     │ │
│  │ ─────────────────────────────    │ │
│  │ LÃI                   + 745k  ✓  │ │
│  └──────────────────────────────────┘ │
│  Điện thoại: review nổi bật hôm nay   │
│  "★☆☆☆☆ dùng xong mặt sáng như đèn    │
│   pha, sáng luôn cả đêm"              │
│  Giấy mời lên phường: ▓▓░░ (40%)      │
│   [ NGÀY MAI BÁN TIẾP ▶ ]             │
└──────────────────────────────────────┘
```

## 9. Checklist sản xuất art (SVG + GSAP)

- Mỗi đối tượng là `<g>` có `id` riêng, transform-origin đặt ở chân (cho squash) — đặt trong SVG bằng `transform-box: fill-box`.
- Thư viện bộ phận nhân vật: 3 thân × 6 phụ kiện × 4 biểu cảm → ra khách đa dạng mà ít asset.
- Màu kem trong thau = trộn màu RGB có trọng số theo lượng nguyên liệu, rồi kẹp độ bão hoà ≥ 40% để không ra màu xám bùn (trừ khi độc tố cao — lúc đó cố ý ngả tím/bùn).
- Màn chính giữ ≤ 300 node SVG động để mượt trên máy tầm trung; nền tĩnh vẽ một lần.
- Giới hạn khung hình: thiết kế ở 390×844, scale đồng đều theo chiều rộng, phần dư chiều cao cho vùng A (tường/rèm) giãn ra — không kéo giãn vùng C.

## 10. Rủi ro & lưu ý

- **Chủ đề màu da**: "nâng tông" dễ thành chế giễu người da tối. Hướng xử lý: châm biếm người bán và quảng cáo, khách là hạt đậu màu kẹo, hiệu ứng là ánh sáng/lấp lánh.
- **Không dùng nhân vật/thương hiệu thật**: không mô phỏng giao diện app livestream thật; điện thoại dùng UI tự chế (khung bo tròn, nút đỏ "LIVE", logo chế).
- **Quá tải màn chính**: nếu thêm chỉ số, ưu tiên gộp vào ticket chứ không thêm vật thể ở vùng B.
- **Font**: Bungee chữ hoa có dấu chồng có thể chạm dòng trên — đặt line-height ≥ 1.25.

## Nguồn

- Metadata Google Fonts (kiểm tra subset vietnamese trực tiếp): https://fonts.google.com/metadata/fonts
- Dumb Ways to Die — Wikipedia: https://en.wikipedia.org/wiki/Dumb_Ways_to_Die
- Q&A with Julian Frost — Creative Review: https://www.creativereview.co.uk/qa-with-julian-frost/
- fxguide về DWtD (Flash + After Effects, 5 tuần): https://www.fxguide.com/?p=44172
- Thank Goodness You're Here! — Wikipedia: https://en.wikipedia.org/wiki/Thank_Goodness_You%27re_Here!
- Phỏng vấn Coal Supper — Epic Games Store: https://store.epicgames.com/news/thank-goodness-youre-here-interview-northern-england-sketch-show?lang=en-US
- Review TGYH — Adventure Game Hotspot: https://adventuregamehotspot.com/review/5765/thank-goodness-youre-here
- Potion Craft — Epic Games Store (cối giã, bản đồ giả kim, hình ảnh sách thuốc trung cổ): https://store.epicgames.com/p/potion-craft-7656a2?lang=en-US
- Potion Craft — thảo luận Steam: https://steamcommunity.com/app/1210320/discussions/0/3105764536425529790
- Good Pizza Great Pizza — hotkey (Order Receipt, Submit, các bàn chuẩn bị): https://good-pizza-great-pizza.fandom.com/wiki/Steam_hotkeys
- Papa's Pizzeria To Go! — App Store (ticket order, nút đổi trạm ở góc, redesign cho cảm ứng): https://apps.apple.com/app/925494667
- Unpacking review — Press Start: https://press-start.com.au/reviews/2021/11/02/unpacking-review-a-pixel-tells-a-thousand-words/
- Diegetic interfaces — Wayline: https://www.wayline.io/blog/diegetic-interfaces-game-design
- Thumb zone & kích thước chạm: https://thisisglance.com/learning-centre/how-should-i-design-my-app-for-one-handed-use ; https://www.abratabia.com/game-ui-design/responsive-game-ui.php ; https://specification.website/spec/accessibility/touch-target-size.md
- Cooking Mama: kiến thức chung về cơ chế cử chỉ (không có nguồn web truy cập được trong phiên này).
