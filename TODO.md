# Việc đã hứa với người dùng (làm theo thứ tự)

1. ✅ **Kéo code gốc 7 backend về kho** (06/10/2026). Quyết định của người dùng đã thực hiện:
   - ✅ Training Hub: app (Report Hub + Training-Hub) chuyển sang **bản 34** (code repo = bản 34).
   - ✅ Management: deploy bản 30 (bỏ `index.html` không dùng).
   - ⏳ Marketing: `ReportHub_Trip_Mail.gs` chỉ đổi 1 dòng — người nhận email đề xuất công tác 'Quynh Anh' → 'Minh Trang'
     (cùng HOD/Director). Không ảnh hưởng xem / kết nối dữ liệu. Chờ người dùng xác nhận có đưa lên không (deploy tay).
   - Business Trip: URL đang chạy quyền MYSELF — app chỉ dùng làm nguồn dự phòng cho lịch.
   - Training Hub trả 404 'unable to open the file' cho `?action=ping` lúc có lúc không ⇒ gọi thử so trước/sau.
2. ✅ **Chạy thử trọn vòng tự deploy** (Management 29 → 30, gọi thử 200) bằng 1 thay đổi vô hại (vd. `BACKEND_VERSION` trả trong `boot` của Training Hub).
3. **Mô tả cấu trúc Sheet** `docs/cau-truc-sheet.md`: rút từ code (tab, cột đọc/ghi) + file Excel người dùng gửi
   (ý nghĩa cột, cột công thức / Data validation, tab sửa tay). Chỉ tiêu đề + dữ liệu giả — kho này riêng tư.
4. **Tự phát hiện thay đổi cột** (người dùng đã đồng ý 06/10/2026): thêm action đọc dòng tiêu đề các tab mà backend dùng
   ⇒ workflow định kỳ so với `docs/cau-truc-sheet.md`; có cột bị thêm / xoá / đổi tên ⇒ báo (issue GitHub + email)
   trước khi app lỗi.
5. ✅ Cập nhật `CLAUDE.md` của repo MMH-Report + skill `gh-webapp-upgrader` (`references/backend-deploy.md`) — người dùng
   cần tải lại file `skills/dist/gh-webapp-upgrader.skill` lên phần Skills của Claude.
6. Đưa backend các app khác vào kho này khi người dùng mở phiên với app đó (README ▸ "Thêm backend của một app khác").
   Đã thấy: `AKfycbwwGhYa…` (Field Report Surgical — Report Hub chỉ mở link, có thể thuộc repo Surgical-Sale-Report).
