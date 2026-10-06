# Việc đã hứa với người dùng (làm theo thứ tự)

1. **Kéo code gốc 7 backend về kho** — đang chờ Script ID (địa chỉ trang Apps Script `…/projects/<Script ID>/edit`).
   Training Hub: app gọi `AKfycbwsX4cQ…` nhưng người dùng gửi `AKfycbxDLxMev…` — xác nhận cả 2 cùng dự án; nếu đúng,
   deploy phải cập nhật cả 2 deployment.
2. **Chạy thử trọn vòng tự deploy** bằng 1 thay đổi vô hại (vd. `BACKEND_VERSION` trả trong `boot` của Training Hub).
3. **Mô tả cấu trúc Sheet** `docs/cau-truc-sheet.md`: rút từ code (tab, cột đọc/ghi) + file Excel người dùng gửi
   (ý nghĩa cột, cột công thức / Data validation, tab sửa tay). Chỉ tiêu đề + dữ liệu giả — kho này riêng tư.
4. **Tự phát hiện thay đổi cột** (người dùng đã đồng ý 06/10/2026): thêm action đọc dòng tiêu đề các tab mà backend dùng
   ⇒ workflow định kỳ so với `docs/cau-truc-sheet.md`; có cột bị thêm / xoá / đổi tên ⇒ báo (issue GitHub + email)
   trước khi app lỗi.
5. Cập nhật `CLAUDE.md` của repo MMH-Report: bỏ quy tắc "gửi file .gs cho người dùng dán", trỏ sang kho này.
