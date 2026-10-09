# Kem Trộn — Lưu lên mây (cloud save)

Bản lưu chính vẫn là `localStorage` (`kem-tron.save`), game chơi offline bình thường. Lưu lên mây là tuỳ chọn: người chơi bấm **Lưu lên mây** (bánh răng ở màn tiêu đề / buổi sáng, hoặc menu TẠM NGHỈ) → **Lấy mã lưu** → nhận mã 12 ký tự dạng `XXXX-XXXX-XXXX`. Sang máy khác: **Có mã từ máy khác? → Nhập mã → Lấy về máy này**.

## Việc chủ dự án cần làm trên Vercel
1. Project `kem-tron` → Storage → nối database Neon vào môi trường **Production**.
2. Kiểm tra Production Functions có `DATABASE_URL` (hoặc `POSTGRES_URL`, hoặc biến có tiền tố riêng kết thúc bằng `_DATABASE_URL` / `_POSTGRES_URL` — code tự nhận). Không dán chuỗi này vào code / GitHub.
3. Redeploy. Request đầu tiên tự tạo 3 bảng (`CREATE TABLE IF NOT EXISTS`).
4. Kiểm tra nhanh: `curl -X POST https://kem-tron.vercel.app/api/cloud -H 'content-type: application/json' -d '{"op":"peek","code":"000000000000"}'`
   - `{"ok":false,"error":"CODE_NOT_FOUND"}` → đã nối DB.
   - `CLOUD_NOT_CONFIGURED` → chưa có biến môi trường DB.

## API — `POST /api/cloud` (một route, body JSON)
| op | cần | làm gì |
|---|---|---|
| `create` | `device`, `state` | Server cấp mã mới + lưu bản đầu. Máy đã có mã → `409 DEVICE_HAS_CODE`. |
| `peek` | `code` | Xem tóm tắt bản trên mây (ngày, tiền, lúc lưu) — không gắn máy. |
| `restore` | `code`, `device` | Gắn máy vào mã (gỡ khỏi mã cũ) + trả bản lưu đầy đủ. |
| `save` | `code`, `device`, `rev`, `state` | Ghi đè. Phải khớp `rev` đang có, máy phải đang gắn mã. |
| `remove` | `code`, `device` | Xoá bản trên mây (chỉ máy đang gắn mã). |

`device` = id ngẫu nhiên 16 byte (base64url) tạo 1 lần trong `localStorage` (`kem-tron.device`). Server chỉ lưu SHA-256 của mã và của device id, không lưu mã gốc.

## Chống spam database
- **Mã do server cấp.** Client không tự bịa mã để tạo dòng; `save` chỉ ghi đè dòng đã có.
- **Mỗi máy đúng 1 mã.** Máy đã gắn mã thì không xin được mã thứ 2; nhập mã khác thì máy chuyển sang mã đó.
- **Mỗi mã tối đa 5 máy**; gắn máy thứ 6 thì máy gắn lâu nhất bị gỡ (máy đó báo "mất nối", nhập lại mã là xong).
- **Giới hạn theo IP** (băm, không lưu IP gốc): tối đa 10 mã mới/giờ, 30 lần nhập sai mã/giờ. Trần tổng 2.000 mã mới/ngày.
- **Giãn cách ghi:** mỗi mã ghi tối đa 1 lần/15 giây; nội dung trùng thì không ghi.
- **Client chỉ gửi ở mốc:** sang ngày mới / hết chương, ẩn app (≥ 60 giây từ lần gửi trước), đang chơi có thay đổi thì 5 phút/lần, hoặc bấm **Lưu ngay**. Nội dung không đổi thì không gửi.
- **Dọn rác:** mỗi lần cấp mã mới, xoá bộ đếm hết hạn và tối đa 50 bản lưu không đụng tới quá 180 ngày.

Ước lượng: 1 người chơi tích cực ≈ 12–15 lần ghi/giờ, mỗi lần ~5–20 KB.

## Nhiều máy cùng chơi
Server giữ số phiên bản `rev`. Máy ghi dựa trên `rev` cũ → `409 CLOUD_HAS_NEWER_SAVE` kèm tóm tắt bản mới. Game ngừng tự gửi và hỏi người chơi: **Lấy bản trên mây** hoặc **Giữ bản máy này (ghi đè)**. Không dựa vào đồng hồ máy.

## Bảng
- `kem_tron_saves(id = sha256(mã), state jsonb, state_hash, rev, day, money, ended, created_at, updated_at)`
- `kem_tron_devices(device = sha256(device id), save_id → saves ON DELETE CASCADE, bound_at)`
- `kem_tron_limits(bucket, n, reset_at)` — bộ đếm giới hạn

Bảng cũ `kem_tron_players` / `kem_tron_events` của bản thử trước không còn dùng (bản đó chưa nối DB nên chưa có dữ liệu).

## Truy vấn hay dùng
```sql
SELECT COUNT(*) FROM kem_tron_saves;
SELECT day, COUNT(*) FROM kem_tron_saves GROUP BY day ORDER BY day;
SELECT ended, COUNT(*) FROM kem_tron_saves WHERE ended IS NOT NULL GROUP BY ended;
SELECT date_trunc('day', created_at) d, COUNT(*) FROM kem_tron_saves GROUP BY d ORDER BY d DESC LIMIT 14;
```

## Test cục bộ (không cần Neon)
```bash
docker run -d --rm --name kt-pg -e POSTGRES_PASSWORD=kt -p 127.0.0.1:55432:5432 postgres:16-alpine
npm run test:cloud                                   # 16 kịch bản API
npm run build && PORT=5197 node tests/cloud-dev-server.mjs   # chơi thử dist/ + /api/cloud thật
```

## Giới hạn còn lại
- Mã là "chìa khoá": ai có mã là đọc/ghi được tiệm đó. Mã 60 bit + giới hạn dò sai theo IP đủ cho game, không phải bảo mật tài khoản.
- Device id nằm trong localStorage nên người cố tình xoá dữ liệu trình duyệt vẫn xin được mã mới; chặn thật nằm ở giới hạn IP và trần ngày.
- iPhone: app ngoài màn hình chính có bộ nhớ riêng, tách với Safari. Muốn mang tiến độ từ Safari sang app: lấy mã trong Safari, nhập mã trong app.
