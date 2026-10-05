# Motion & Juice cho "Kem Trộn"

Phạm vi: game feel cho các khoảnh khắc chính trên một màn hình dọc 390x844, vẽ bằng inline SVG, chuyển động bằng GSAP. Mục tiêu là mỗi thao tác của người chơi đều có phản hồi ngay (dưới 100 ms), phóng đại và buồn cười, giữ nhịp kiểu Dumb Ways to Die: giật, ít khung, biểu cảm quá đà.

---

## 1. Nguyên tắc nền

### 1.1 Juice: chồng nhiều lớp phản hồi nhỏ lên một hành động
Từ talk "Juice it or lose it" (Jonasson & Purho, 2012): lấy một prototype Breakout khô khan, chồng dần tween, squash & stretch, hạt, âm thanh, rung màn hình; game "sống" lên mà luật chơi không đổi. Công thức dùng cho Kem Trộn, mỗi hành động chọn 3–5 lớp:

| Lớp | Ví dụ trong Kem Trộn |
|---|---|
| Tween vị trí/scale có overshoot | Nguyên liệu nảy khi rơi vào thau |
| Squash & stretch | Thau bẹp ra khi đồ rơi, hũ dài ra khi bật lên |
| Hạt (particle) | Giọt kem bắn, bong bóng độc, tiền xu |
| Rung (shake) | Thau rung khi độc cao, màn rung khi nổ |
| Hitstop / đóng băng khung | Dừng 60–90 ms ngay lúc nổ, lúc đập chày |
| Âm thanh có biến tấu pitch | Tiếng "bộp" ngẫu nhiên ±10% pitch |
| Chữ nổi (popup text) | "+15k", "TRẮNG BẬT TÔNG!!", "ĐỘC QUÁ" |

### 1.2 Screenshake (Nijman, "The Art of Screenshake")
- Rung theo **trauma**: biến `trauma` 0..1 cộng dồn khi có sự kiện, giảm tuyến tính ~1.2/giây; biên độ = `maxOffset * trauma²` (bình phương để rung nhẹ thì rất nhẹ, rung mạnh thì rất mạnh).
- Rung **hướng** theo lực (đồ rơi từ trên → rung dọc trước), không chỉ ngẫu nhiên.
- Mobile dọc nhỏ: trần rung toàn màn **8 px**, rung cục bộ (thau, máy xay) tới 6 px + xoay 3°. Rung toàn màn chỉ dành cho nổ mẻ và công an ập vào.
- Có tuỳ chọn "Giảm rung" trong cài đặt; tôn trọng `prefers-reduced-motion` (cắt shake, giữ màu và âm thanh).

### 1.3 12 nguyên lý Disney áp vào game này
| Nguyên lý | Áp dụng |
|---|---|
| Squash & stretch | Mọi thứ mềm: thau, kem, hạt đậu, hũ. Giữ **diện tích không đổi**: `scaleX = 1/scaleY` |
| Anticipation | Nhấc nguyên liệu lên 4–6 px trước khi bay; khách hít hơi trước khi chửi |
| Follow-through & overlapping | Cán muỗng trễ sau đầu muỗng; tóc/lá dưa leo lắc sau khi dừng |
| Arcs | Nguyên liệu bay theo cung parabol vào thau, không đường thẳng |
| Secondary action | Mắt khách đảo theo tay người chơi |
| Timing | Ít khung = hài; giữ pose (hold) lâu hơn thực tế |
| Exaggeration | Biểu cảm phóng 150–200%, mắt to gấp đôi khi sốc |

### 1.4 Phong cách Dumb Ways to Die / Thank Goodness You're Here
- Clip DWtD do Julian Frost làm trên Flash/After Effects trong khoảng 5 tuần: hình phẳng, viền dày, nhân vật hạt đậu, chuyển động cắt pose dứt khoát.
- Kỹ thuật cần mô phỏng:
  - **Animate on twos/threes**: cho phần chuyển động nhân vật chạy ở 12 fps (bước khung cố định) thay vì mượt 60 fps. Trong GSAP: `ease: "steps(n)"` hoặc snap thời gian bằng ticker riêng. UI và màu kem vẫn mượt 60 fps để tạo tương phản.
  - **Pose-to-pose cứng**: đổi pose bằng cách thay hẳn path (swap SVG group), không morph mềm.
  - **Hold rồi pop**: giữ pose 200–400 ms rồi bật pose mới trong 1–2 khung.
  - **Biến dạng cực đoan trong 1 khung** (smear): kéo dãn 1.6x đúng 1 khung lúc vụt nhanh.

---

## 2. Bảng thông số theo khoảnh khắc

Quy ước: thời lượng tính bằng ms; "biên độ" là tỉ lệ scale, px hoặc độ. Ease theo tên GSAP 3.

### 2.1 Thả nguyên liệu vào thau
| Pha | Thời lượng | Ease | Biên độ / ghi chú |
|---|---|---|---|
| Nhấc lên khi chạm (pickup) | 80 | `back.out(3)` | scale 1 → 1.15, xoay ±6° theo hướng kéo |
| Kéo theo ngón | liên tục | lerp 0.35/khung | nghiêng theo vận tốc ngang: `rot = clamp(vx*0.08, -15, 15)` |
| Anticipation khi thả | 60 | `power2.out` | dịch lên 6 px, scaleY 0.9 |
| Bay vào thau (cung) | 220–280 | x `power1.inOut`, y `power2.in` | đỉnh cung cao hơn điểm thả 40 px |
| Chạm mặt kem: squash nguyên liệu | 70 | `power4.out` | scaleX 1.35, scaleY 0.7 |
| Thau squash | 90 rồi hồi 300 | `power3.out` rồi `elastic.out(1, 0.4)` | thau scaleX 1.06, scaleY 0.94 |
| Splash: 6–10 giọt | 350–450 | `power2.out` (bay), `power2.in` (rơi) | toả 60–120°, bán kính 30–70 px, giọt dãn theo vận tốc |
| Gợn mặt kem (ripple) | 400 | `sine.out` | ellipse bán kính 0 → 45 px, opacity 0.6 → 0 |
| Thanh chỉ số preview nhảy | 250 | `back.out(2)` | vạch "ghost" hiện trước, giá trị thật trượt tới sau 120 ms |
| Lấy ra (hoàn tác trước khi khuấy) | 200 | `back.in(1.5)` | nguyên liệu bật ngược ra ngăn, nhỏ giọt kem 2–3 hạt |

Âm thanh: "bộp" + "tõm", pitch ngẫu nhiên ±8%; nguyên liệu nặng (cám, nghệ) pitch thấp hơn.

### 2.2 Khuấy bằng muỗng (thao tác chính, không hoàn tác)
| Thông số | Giá trị |
|---|---|
| Khoá tâm muỗng vào vòng tròn quanh tâm thau | bán kính 0.55 × bán kính thau, ngón tay chỉ điều khiển **góc** |
| Góc muỗng | `atan2` từ tâm thau tới ngón tay, lọc mượt lerp 0.4 |
| Cán muỗng trễ (follow-through) | xoay cán trễ 1–2 khung, độ nghiêng = vận tốc góc × 0.15, kẹp ±20° |
| Tiến độ khuấy | cộng dồn |Δgóc|; 1 vòng = 2π; một mẻ cần 4–6 vòng |
| Vận tốc góc tối ưu | 1.5–3 vòng/giây; quá nhanh → kem bắn ra mép (hạt), quá chậm → không tiến |
| Xoáy kem | path xoắn ốc xoay theo muỗng với hệ số 0.6 (trễ hơn muỗng) |
| Đổi màu | `t = progress^0.8` nội suy từ màu "chưa trộn" (vệt riêng) sang màu cuối (đồng nhất) |
| Rung tay khi khuấy | thau lắc ±1° chu kỳ 120 ms, chỉ khi vận tốc > 2 vòng/s |
| Khoảnh khắc hoàn thành | hitstop 80 ms, kem nảy scale 1.08 `elastic.out(1, 0.35)` 600 ms, chớp viền trắng 100 ms, chữ "XONG MẺ!" `back.out(2.5)` 300 ms |

Âm thanh: "lẹp xẹp" vòng lặp, playbackRate theo vận tốc góc (0.8–1.4).

**Rig tay + muỗng (SVG):**
```
<g id="arm">                       // gốc tại mép dưới màn hình (vai ngoài khung)
  <path id="forearm"/>             // ống tay hạt đậu, xoay quanh gốc
  <g id="hand" transform-origin=cổ tay>
    <path id="fist"/>              // nắm tay tròn
    <g id="spoon" transform-origin=điểm nắm>
      <path id="handle"/><ellipse id="bowl"/>
    </g>
  </g>
</g>
```
IK 2 khúc giản lược: biết vị trí đầu muỗng (trên vòng tròn) và vai (cố định), tính góc cẳng tay bằng `atan2`, dài cẳng tay co giãn nhẹ (stretch tối đa 1.2x) thay vì giải khớp khuỷu. Kiểu tay "cao su" này hợp phong cách DWtD và rẻ hơn IK thật.

### 2.3 Máy xay sinh tố
| Pha | Thời lượng | Ease | Biên độ |
|---|---|---|---|
| Ấn nút (nút lún) | 60 | `power3.out` | nút dịch xuống 4 px, scaleY 0.8 |
| Khởi động (máy "giật mình") | 150 | `back.out(4)` | máy nhảy lên 8 px, scaleY 1.1 |
| Chạy: rung thân | lặp 40 ms | ngẫu nhiên | x ±2 px, xoay ±1.5°; trên nền cứ 500 ms "giật" một cái ±4 px |
| Nội dung quay | liên tục | `none` | xoáy trong cối xoay 720°/s, mặt chất lỏng nghiêng thành hình chữ V (path morph 2 trạng thái) |
| Nguyên liệu vụn | mỗi 80 ms 1 mảnh | — | mảnh nhỏ quay quanh tâm cối, mờ dần |
| Tắt: quay chậm dần | 600 | `power2.out` | rung giảm về 0, nắp hơi bật lên 3 px rồi rơi `bounce.out` |
| Quá lâu (>4 s) → incident | — | — | khói đen phụt từ đáy, máy nhảy 12 px, tiếng "rẹt rẹt", livestream chạy chữ "cháy máy kìa" |

Âm thanh: vòng lặp "vùùù", tăng pitch 0.9 → 1.2 trong 300 ms đầu.

### 2.4 Nghiền bằng cối chày (tap theo nhịp)
| Pha | Thời lượng | Ease | Biên độ |
|---|---|---|---|
| Nhấc chày (anticipation, khi ngón chạm) | 90 | `power2.out` | chày lên 30 px, xoay -8° |
| Đập xuống (khi nhả) | 50 | `power4.in` | về 0, smear: scaleY 1.4 đúng 1 khung |
| Hitstop | 50–70 | — | đóng băng toàn bộ cảnh trừ hạt |
| Cối squash | 120 | `elastic.out(1, 0.3)` | scaleX 1.1, scaleY 0.88 |
| Mảnh vụn | 300 | `power2.out` | 4–6 mảnh, bay 20–40 px |
| Rung cục bộ | 100 | — | trauma +0.25 |
| Đập liên tiếp (combo) | — | — | mỗi nhát pitch +5%, chữ "ĐẬP NỮA!" khi đủ 5 nhát |

Nguyên liệu biến hình 3 nấc (nguyên → dập → nhuyễn) bằng swap path cứng, đúng kiểu ít khung.

### 2.5 Độc tố tăng
Chia 3 ngưỡng; hiệu ứng chồng dần, không bật tắt đột ngột.

| Ngưỡng | Hiệu ứng | Thông số |
|---|---|---|
| 0–40% (an toàn) | không có | — |
| 40–70% (cảnh báo) | bong bóng xanh nổi lên mặt kem | 1 bong bóng/600 ms, bán kính 4–9 px, đi lên 20 px trong 900 ms `sine.out`, vỡ: scale 1 → 1.4 trong 80 ms rồi biến mất, tiếng "póc" |
| | thanh độc nhấp nháy viền | chu kỳ 800 ms `sine.inOut` |
| 70–90% (nguy) | khói xanh lá cuộn lên | 3–5 cụm hình tròn chồng nhau, mỗi cụm đi lên 60 px, scale 0.6 → 1.6, opacity 0.7 → 0, 1400 ms `power1.out`, lắc ngang theo `sin` biên độ 8 px |
| | thau rung | trauma giữ ở 0.15–0.3, lắc xoay ±2° |
| | mặt kem sủi | 1 bong bóng/200 ms, màu kem lệch dần về xanh rêu (trộn OKLab 0–30%) |
| | nhân vật livestream đổ mồ hôi | giọt mồ hôi rơi mỗi 700 ms |
| >90% | đếm ngược ngầm 1.5 s rồi nổ | thau phình nhịp 300 ms scale 1 ↔ 1.08, tiếng còi "tít tít" nhanh dần |

Khi thanh độc tăng do thả đồ: thanh nhảy `back.out(3)` 250 ms + chữ nổi "+12 ☠" bay lên. Khi giảm do nguyên liệu trung hoà: thanh tụt mượt `power2.out` 400 ms, hiệu ứng lấp lánh trắng.

### 2.6 Hỏng mẻ: nổ bùm (hài, không ghê)
| Thứ tự | Thời gian từ t0 | Hành động |
|---|---|---|
| 1 | 0 | Hitstop 120 ms, toàn cảnh chớp trắng 1 khung (opacity 0.8) |
| 2 | 0–60 | Thau phình scale 1.3 `power4.out` |
| 3 | 60 | Nổ: 1 hình sao răng cưa (burst) scale 0 → 1.8, 180 ms `expo.out`, rồi mờ 200 ms |
| 4 | 60 | Màn rung trauma = 1.0 (8 px), tắt dần trong 700 ms |
| 5 | 60–900 | 15–25 cục kem bay lên màn hình, rơi `power2.in`; 3–4 cục **dính vào "kính"** (phóng to, giữ 1.5 s, trượt xuống chậm 1.2 s) |
| 6 | 300 | Nhân vật chính: mặt đen nhẻm, tóc dựng, mắt chớp 2 lần (pose cứng, hold 800 ms) |
| 7 | 500 | Livestream: bình luận chạy dồn dập ("💀", "ahihi đồ ngốc", "báo cáo chưa?"), số mắt xem tăng vọt rồi tụt |
| 8 | 1200 | Thau rỗng rơi xuống quay vòng `bounce.out` 500 ms; nút "Làm lại mẻ khác" bật `back.out(2)` |

Âm thanh: "BÙM" trầm + tiếng mèo kêu/gà kêu ngắn (meme) + tiếng rơi lạch cạch. Tổng thời lượng dưới 2 s để không phạt người chơi bằng thời gian chờ.

### 2.7 Đóng hũ, dán nhãn
| Pha | Thời lượng | Ease | Biên độ |
|---|---|---|---|
| Hũ trượt vào từ cạnh | 250 | `back.out(1.8)` | x từ ngoài màn |
| Kem đổ vào hũ (dòng chảy) | 450 | `power1.inOut` | path dòng chảy dài ra rồi đứt; mực kem trong hũ dâng bằng clip rect |
| Hũ đầy: nảy | 300 | `elastic.out(1, 0.4)` | scaleY 1.12 → 1 |
| Nắp rơi xuống | 180 | `power3.in` | từ trên 80 px |
| Vặn nắp | 250 | `steps(3)` | xoay 0 → 30 → 60 → 90°, mỗi bước một tiếng "cạch" |
| Dán nhãn (kéo vuốt) | theo ngón | — | nhãn kéo theo, khi thả: "đập" lên hũ 80 ms `power4.out`, nhãn squash 1.15/0.85 |
| Nhãn lệch | — | — | nếu thả lệch, nhãn dán nghiêng 5–12° và giữ luôn (thêm điểm hài, khách có thể chê) |
| Hoàn tất: lấp lánh | 500 | `sine.out` | 3 ngôi sao 4 cánh xoay 90° ở góc hũ |

### 2.8 Khách phản ứng (mặt biến đổi kiểu DWtD)
Mỗi phản ứng = chuỗi pose cứng, đổi pose trong 1 khung, giữ pose 250–600 ms.

| Kết quả | Chuỗi pose | Phụ trợ |
|---|---|---|
| Tuyệt vời | mắt to → mắt sao lấp lánh → miệng cười rộng hết mặt, cơ thể stretch 1.15 nhảy 20 px `back.out(3)` | tim bay, vệt hồng má |
| Ổn | gật đầu 2 nhịp (xoay ±6°, 150 ms mỗi nhịp `power2.inOut`) | — |
| Tệ | ngửi → mặt nhăn → lưỡi thè, cơ thể squash 0.85 | đường hôi lượn sóng |
| Bị bỏng/dị ứng (hài) | mặt chuyển đỏ từng mảng (2 khung), sưng to scale 1.4 `elastic.out(1, 0.3)`, mắt chéo | chữ "NGỨA!!!", nhân vật nhảy chân sáo |
| Trắng quá đà | da nhảy 3 nấc trắng sáng `steps(3)` tới mức phát sáng (glow), đeo kính râm | tiếng "ting" |
| Gọi công an | rút điện thoại pose cứng, mắt nheo | còi hú, ánh đỏ xanh nhấp nháy viền màn 250 ms/chu kỳ |

### 2.9 Tiền bay vào hộp
| Thông số | Giá trị |
|---|---|
| Số đồng/tờ | `clamp(round(tiền / đơn vị), 3, 15)` |
| Bay | từ khách tới hộp tiền theo cung Bezier (điểm điều khiển cao hơn 80–140 px, lệch ngẫu nhiên) |
| Thời lượng mỗi đồng | 450–600 ms, `power2.in` (tăng tốc khi lao vào hộp) |
| So le | `stagger: 0.04–0.06` |
| Xoay | tờ tiền lật 360–720° trên đường bay, scaleX dao động (giả 3D) |
| Hộp nhận | mỗi đồng: hộp nảy scale 1.08 trong 60 ms `power3.out`, hồi 120 ms |
| Bộ đếm số | đếm nhảy theo từng đồng (không lerp), font nảy `back.out(3)` 120 ms |
| Âm thanh | "keng", pitch tăng dần +3% mỗi đồng (tạo cảm giác dồn) |
| Hoàn tiền (refund) | phát ngược: tiền bay ra khỏi hộp về khách, chậm hơn 1.3x, tiếng "xì" |

### 2.10 Sao review rơi
| Thông số | Giá trị |
|---|---|
| Vào | mỗi sao rơi từ trên 120 px, `bounce.out` 500 ms, stagger 120 ms |
| Chạm | squash 1.3/0.75 trong 60 ms rồi hồi `elastic.out(1, 0.35)` 400 ms |
| Sao rỗng | rơi nặng hơn (`power3.in`, không nảy), tiếng "bịch" |
| 1 sao | sao cuối cùng nứt đôi (swap path) + tiếng kính vỡ |
| 5 sao | toàn bộ 5 sao nảy đồng loạt 1 lần nữa, chữ "5 SAO NHƯ PHIM" `back.out(2.5)` |
| Bình luận review | gõ chữ từng ký tự 25 ms/ký tự, bong bóng chat nảy vào `back.out(1.7)` 250 ms |

### 2.11 Thông số chung
| Hạng mục | Giá trị |
|---|---|
| Phản hồi chạm tối thiểu | < 50 ms (scale 0.92 khi press, `power3.out` 60 ms) |
| Overshoot mặc định | `back.out(1.7)`; vật mềm `elastic.out(1, 0.3–0.45)` |
| Hitstop | 50–120 ms (lớn dần theo độ "nặng" sự kiện) |
| Trauma decay | 1.2/giây; trần offset 8 px, xoay 3° |
| Nhân vật | 12 fps (on twos); UI/màu/hạt 60 fps |

---

## 3. Kem đổi màu mượt

### 3.1 Nội suy màu
- Trộn trong **OKLab** (Björn Ottosson, 2020): không gian cảm nhận đều, chuyển giữa hai màu xa nhau không bị xám/đục như trộn sRGB. Đủ cho trộn nhiều nguyên liệu: cộng có trọng số theo lượng.
- Muốn "giống sơn thật" (vàng + xanh dương ra xanh lá) thì dùng **spectral.js** (Kubelka-Munk). Nhẹ, nhưng vì luật "không CDN lúc chạy", phải bundle qua npm. Đề xuất: OKLab cho mặc định, spectral.js là tuỳ chọn nếu muốn màu kem "đất" và bất ngờ hơn.
- Công thức trộn n nguyên liệu: `L = Σ wᵢLᵢ`, `a = Σ wᵢaᵢ`, `b = Σ wᵢbᵢ` với `wᵢ = lượngᵢ × độ_nhuộmᵢ` (nghệ nhuộm mạnh, sữa nhuộm yếu). Kết quả đổi về sRGB và kẹp gamut.

```ts
// src/core/color.ts — thuần, test được
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function rgbToOklab([r, g, b]: number[]) {
  [r, g, b] = [r, g, b].map((v) => toLin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
          1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
          0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
// oklabToRgb: nghịch đảo (xem bài gốc của Ottosson), kẹp 0..255
export const mixOklab = (cols: number[][], w: number[]) => { /* Σ wᵢ·labᵢ / Σ wᵢ */ };
```
CSS hiện đại cũng có `color-mix(in oklab, ...)`, có thể dùng cho gradient tĩnh, nhưng logic game nên tự tính để `src/core` test được.

### 3.2 Vẽ xoáy kem bằng SVG
Cấu trúc lớp trong thau (từ dưới lên):
1. `ellipse` nền màu kem hiện tại (màu trộn tổng).
2. Nhóm **vệt màu nguyên liệu**: mỗi nguyên liệu một path xoắn ốc (Archimedes `r = a + bθ`, 1.5–2.5 vòng) tô màu riêng, `stroke-width` 6–14 px, `stroke-linecap: round`.
3. Nhóm vệt xoay quanh tâm thau theo góc muỗng × 0.6.
4. Khi khuấy tiến triển: mỗi vệt giảm `opacity` theo `1 - t`, `stroke-width` mỏng dần, màu vệt nội suy OKLab về màu tổng → cuối cùng hoà hẳn.
5. `radialGradient` highlight (trắng 25% ở góc trên trái) tạo độ bóng kem, không đổi.
6. Tất cả clip bằng `<clipPath>` hình elip miệng thau; dùng `<mask>` với gradient đen-trắng ở mép để vệt mờ dần về rìa (cảm giác chiều sâu).

Mẹo: không morph path xoắn ốc mỗi khung. Sinh sẵn path một lần, chỉ xoay group (`rotation`) và đổi `stroke-dashoffset` để vệt "chảy" theo vòng; rẻ cho GPU/CPU mobile.

---

## 4. Nhân vật hạt đậu bằng SVG

### 4.1 Cấu trúc
```
<g class="bean" data-state="idle">
  <g class="body">                          // squash/stretch tại đây, origin = đáy chân
    <path class="silhouette"/>              // hạt đậu: 1 path cubic, viền 3–4 px màu đậm
    <ellipse class="blush" opacity="0"/>
    <g class="face">                        // dịch nhẹ theo hướng nhìn (parallax 2–4 px)
      <g class="eye L"><ellipse class="white"/><circle class="pupil"/><path class="lid"/></g>
      <g class="eye R">...</g>
      <g class="mouth">                     // nhiều path, chỉ hiện 1
        <path data-m="smile"/><path data-m="o"/><path data-m="grimace"/>
        <path data-m="tongue"/><path data-m="flat"/><path data-m="scream"/>
      </g>
      <g class="brows"/>
    </g>
  </g>
  <g class="props"/>                        // kính râm, mồ hôi, điện thoại
</g>
```
- Đổi biểu cảm = bật/tắt `display` của path miệng/mày (pose cứng, đúng chất DWtD); không morph.
- Đồng tử bám theo mục tiêu (tay người chơi, thau): kẹp trong bán kính 3 px.
- Màu da/áo nhận từ data để tạo nhiều khách từ một rig. Phụ kiện (tóc, khẩu trang, nón lá) là group gắn lên `.body`.

### 4.2 Idle
| Chuyển động | Thông số |
|---|---|
| Thở | `.body` scaleY 1 ↔ 1.03, scaleX 1 ↔ 0.985, 1600–2200 ms `sine.inOut`, yoyo, lệch pha ngẫu nhiên giữa các nhân vật |
| Chớp mắt | `.lid` scaleY 0 → 1 → 0 trong 120 ms (2 khung đóng), lặp ngẫu nhiên 2–5 s; 15% khả năng chớp đôi |
| Liếc | đồng tử nhảy (không trượt) sang vị trí mới mỗi 1.5–4 s |
| Bồn chồn (khách chờ lâu) | chân nhịp `steps(2)` mỗi 400 ms, thở nhanh gấp đôi |

---

## 5. Ví dụ GSAP

```ts
import { gsap } from "gsap";

// 5.1 Thả nguyên liệu: cung + squash + thau nảy
export function dropIntoBowl(item: SVGGElement, bowl: SVGGElement, to: { x: number; y: number }) {
  const tl = gsap.timeline();
  tl.to(item, { y: "-=6", scaleY: 0.9, duration: 0.06, ease: "power2.out" })
    .to(item, { x: to.x, duration: 0.25, ease: "power1.inOut" }, ">")
    .to(item, { keyframes: [{ y: to.y - 40, duration: 0.1, ease: "power2.out" },
                            { y: to.y, duration: 0.15, ease: "power2.in" }] }, "<")
    .to(item, { scaleX: 1.35, scaleY: 0.7, duration: 0.07, ease: "power4.out",
                transformOrigin: "50% 100%" })
    .to(bowl, { scaleX: 1.06, scaleY: 0.94, duration: 0.09, ease: "power3.out",
                transformOrigin: "50% 100%" }, "<")
    .to(bowl, { scaleX: 1, scaleY: 1, duration: 0.3, ease: "elastic.out(1, 0.4)" })
    .add(() => splash(to.x, to.y), "<");
  return tl;
}

// 5.2 Screenshake theo trauma (một ticker cho cả game)
let trauma = 0;
export const addTrauma = (v: number) => (trauma = Math.min(1, trauma + v));
gsap.ticker.add((_t, dt) => {
  trauma = Math.max(0, trauma - 1.2 * (dt / 1000));
  const k = trauma * trauma;
  gsap.set("#world", { x: (Math.random() * 2 - 1) * 8 * k,
                       y: (Math.random() * 2 - 1) * 8 * k,
                       rotation: (Math.random() * 2 - 1) * 3 * k });
});

// Hitstop: gsap.globalTimeline.timeScale(0.0001) trong 50–120 ms rồi trả về 1.

// 5.4 Idle hạt đậu: thở + chớp
export function idle(bean: SVGGElement) {
  const body = bean.querySelector(".body")!;
  gsap.to(body, { scaleY: 1.03, scaleX: 0.985, duration: gsap.utils.random(0.8, 1.1),
                  ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" });
  const blink = () => {
    gsap.to(bean.querySelectorAll(".lid"), { scaleY: 1, duration: 0.06, ease: "steps(1)",
      yoyo: true, repeat: Math.random() < 0.15 ? 3 : 1, transformOrigin: "50% 0%" });
    gsap.delayedCall(gsap.utils.random(2, 5), blink);
  };
  blink();
}
```
Ghi chú: đường bay Bezier cho tiền dùng `MotionPathPlugin` (miễn phí từ GSAP 3.13, bundle được). Kéo thả có thể dùng `Draggable` + `InertiaPlugin` (cũng đã miễn phí), nhưng kéo trong SVG tự viết bằng Pointer Events cũng đủ và nhẹ hơn.

---

## 6. Hiệu năng trên mobile
- Chỉ tween `transform`/`opacity`, không animate `filter` (khói = chồng hình tròn opacity thấp thay cho `feGaussianBlur`); `will-change: transform` cho thau, máy xay, `#world`.
- Pool sẵn 60 node hạt, tái dùng; nhân vật chạy 12 fps giảm một nửa số lần ghi DOM. Mục tiêu 60 fps trên Android tầm trung ở cảnh nặng nhất (khuấy + độc tố cao).

---

## Nguồn
- Jonasson & Purho, "Juice it or lose it" (Nordic Game Jam 2012) — tóm tắt: https://roblog.co.uk/2024/03/juicy-games/ ; https://garden.bradwoods.io/notes/design/juice
- Jan Willem Nijman, "The Art of Screenshake" (Vlambeer) — https://infovore.org/?p=5275 ; danh sách video: https://kenney.nl/learn/must-see-videos-for-indie-developers
- GSAP Eases (back, elastic, bounce, steps): https://gsap.com/docs/v3/Eases/
- Björn Ottosson, "A perceptual color space for image processing" (Oklab, 2020): https://bottosson.github.io/posts/oklab/
- spectral.js (Kubelka-Munk paint mixing): https://bestofjs.org/projects/spectraljs
- Dumb Ways to Die — Wikipedia: https://en.wikipedia.org/wiki/Dumb_Ways_to_Die ; Julian Frost: https://julianfrost.co.nz/work/about/ ; fxguide: https://www.fxguide.com/?p=44172
- Thomas & Johnston, "The Illusion of Life" (12 nguyên lý animation Disney, 1981).
- Steve Swink, "Game Feel" (2008) — khái niệm phản hồi tức thì và hitstop.
