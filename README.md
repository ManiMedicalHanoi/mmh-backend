# mmh-backend — code backend Apps Script của MMH Report Hub

Kho **riêng tư** chứa code của 7 web app Apps Script mà app https://manimedicalhanoi.github.io/MMH-Report/ gọi tới.
Gộp thay đổi vào `main` ⇒ GitHub **tự deploy** lên Apps Script, cập nhật **đúng deployment cũ** ⇒ URL `/exec` giữ nguyên,
không cần copy-paste, không cần *Deploy ▸ New version* bằng tay.

| Thư mục | Backend |
|---|---|
| `backends/marketing/` | Report Hub – Marketing |
| `backends/management/` | Report Hub – Management |
| `backends/backoffice/` | Report Hub – Back Office |
| `backends/training/` | Training Hub |
| `backends/trip/` | Business Trip (Công tác) |
| `backends/mkt-online/` | MKT Online (bài đăng / design) |
| `backends/mkt-offline/` | MKT Offline (sự kiện) |

Danh sách + Script ID + Deployment ID: `backends.json`.

## Các nút trong tab **Actions**
| Workflow | Khi nào chạy | Làm gì |
|---|---|---|
| **Deploy backend** | Tự động khi gộp vào `main` (thư mục `backends/`) · hoặc chạy tay | Đẩy code + tạo phiên bản mới + trỏ deployment cũ sang phiên bản đó, gọi thử URL; lỗi ⇒ tự quay lại phiên bản trước |
| **Kéo code về** | Chạy tay · tự chạy khi `backends.json` đổi | Lấy code đang có trên Apps Script về repo (tự tìm Script ID còn thiếu) |
| **Quay lại bản trước** | Chạy tay | Chọn backend ▸ Run ⇒ web app chạy lại phiên bản ngay trước (hoặc số phiên bản chỉ định) |
| **Kiểm tra** | Mỗi pull request · chạy tay | PR: tự kiểm công cụ + cú pháp `.gs` · Chạy tay: kiểm chìa khoá + phiên bản đang chạy của 7 backend |

## Lớp an toàn khi deploy
1. **Phát hiện sửa tay**: code trên Apps Script khác bản cuối cùng trong repo (ai đó sửa trực tiếp trên trình soạn) ⇒ dừng, không ghi đè.
   Xử lý: chạy **Kéo code về** cho backend đó rồi áp lại thay đổi.
2. **Giữ quyền truy cập web app**: mục `webapp` (Execute as / Who has access) trong `appsscript.json` khác bản đang chạy ⇒ dừng.
3. **Gọi thử sau deploy**: gặp trang lỗi Apps Script (`TypeError … (line N, file "X")`) ⇒ tự trỏ lại phiên bản trước.
   (Business Trip giới hạn trong domain ⇒ không gọi thử ẩn danh được, bỏ qua bước này.)
4. Giữ nguyên **thứ tự file** (`.files.json`) — thứ tự nạp file ảnh hưởng biến toàn cục trong Apps Script.
5. Báo trước khi gần giới hạn **200 phiên bản**/dự án (xoá bớt trong *Lịch sử dự án* của Apps Script).

## Hai quy tắc
- **Không sửa code trực tiếp trên trang Apps Script.** Lỡ sửa ⇒ chạy **Kéo code về** trước khi sửa tiếp trong repo.
- **Không bấm *Deploy ▸ New deployment*** (tạo URL mới, app không gọi tới).

## Chìa khoá
Secret `CLASPRC_JSON` (Settings ▸ Secrets and variables ▸ Actions) = nội dung `~/.clasprc.json` sau khi chạy
`npx -y @google/clasp@3 login --no-localhost` bằng tài khoản sở hữu script. Thu hồi: https://myaccount.google.com/permissions ▸ clasp.
Tài khoản đó phải bật **Google Apps Script API**: https://script.google.com/home/usersettings

## Công cụ
`tools/gas.mjs` gọi thẳng Apps Script API (không cần cài clasp):
```
node tools/gas.mjs status | discover | pull <key|all|new> | deploy <key|all> | deploy-changed <before> <after> | rollback <key> [version]
node tools/selftest.mjs   # 31 kịch bản với Apps Script API giả lập
node tools/syntax.mjs     # kiểm cú pháp .gs
```
