# Việc đã hứa với người dùng (làm theo thứ tự)

1. ✅ **Kéo code gốc 7 backend về kho** (06/10/2026). Cần người dùng quyết định trước lần deploy đầu (`.pull.json`):
   - **Training Hub**: Report Hub + Training Hub đều gọi `AKfycbwsX4cQ…` = phiên bản **32**; deployment `AKfycbxDLxMe…` ở
     phiên bản **34** (không app nào trong 2 repo gọi). Code trong dự án còn khác bản 32 ở `Backend Training Hub.gs`.
   - **Management**: bản đang chạy (29) có file `index.html`, code trong dự án đã xoá ⇒ deploy sẽ gỡ `index.html`.
   - **Marketing**: `ReportHub_Trip_Mail.gs` sửa trong dự án nhưng chưa deploy (bản 76).
   - Business Trip: URL đang chạy quyền MYSELF (chỉ chủ sở hữu) — app chỉ dùng làm nguồn dự phòng cho lịch.
2. **Chạy thử trọn vòng tự deploy** bằng 1 thay đổi vô hại (vd. `BACKEND_VERSION` trả trong `boot` của Training Hub).
3. **Mô tả cấu trúc Sheet** `docs/cau-truc-sheet.md`: rút từ code (tab, cột đọc/ghi) + file Excel người dùng gửi
   (ý nghĩa cột, cột công thức / Data validation, tab sửa tay). Chỉ tiêu đề + dữ liệu giả — kho này riêng tư.
4. **Tự phát hiện thay đổi cột** (người dùng đã đồng ý 06/10/2026): thêm action đọc dòng tiêu đề các tab mà backend dùng
   ⇒ workflow định kỳ so với `docs/cau-truc-sheet.md`; có cột bị thêm / xoá / đổi tên ⇒ báo (issue GitHub + email)
   trước khi app lỗi.
5. ✅ Cập nhật `CLAUDE.md` của repo MMH-Report + skill `gh-webapp-upgrader` (`references/backend-deploy.md`) — người dùng
   cần tải lại file `skills/dist/gh-webapp-upgrader.skill` lên phần Skills của Claude.
6. Đưa backend các app khác vào kho này khi người dùng mở phiên với app đó (README ▸ "Thêm backend của một app khác").
   Đã thấy: `AKfycbwwGhYa…` (Field Report Surgical — Report Hub chỉ mở link, có thể thuộc repo Surgical-Sale-Report).
