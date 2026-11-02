---
number: 6
---
[[opener 6 | Thuyết trình, đào tạo, kế hoạch tháng, mở mới | Các hoạt động bán hàng còn lại: buổi thuyết trình sản phẩm, đào tạo khách hàng (T&E), kế hoạch tháng và báo cáo tháng, ca mở mới địa bàn / SKU mới để tính KPI. | crmg/newacc | Thuyết trình sản phẩm; Đào tạo khách hàng (T&E); Kế hoạch tháng; Báo cáo tháng bằng Word; Mở mới và SKU mới; Dữ liệu được lưu ở đâu]]

## Thuyết trình sản phẩm

:::split crmg/present, crmg/present_form | Danh sách buổi thuyết trình (trái) · form buổi với 5 khung Event review (phải).
Menu bên ▸ **Thuyết trình · Đào tạo KH** ▸ tab **Thuyết trình**.

1. **＋ Thêm buổi**: account, ngày, số người dự kiến (**Target**), thư mục tài liệu.
2. Sau buổi: nhập **Actual** (số người tham dự thực tế, phải > 0) và **Event review** gồm 5 khung: số lượng tham dự, tóm tắt hoạt động, phản hồi khách hàng, doanh số, hành động tiếp theo.
3. Đồng hồ **độ chi tiết** cho biết review đã đủ chưa.

Buổi thiếu Actual hoặc thiếu khung review ⇒ chưa tính KPI; dải nhắc trên đầu trang liệt kê các buổi này.
:::split-end

## Đào tạo khách hàng (T&E) [[teams d th]]

:::split.wide crmg/te | Tab Đào tạo khách hàng (T&E).
Áp dụng cho **Dental VN** và **hai nhóm Thái Lan**.

1. Tab **Đào tạo khách hàng (T&E)** ▸ **＋ Thêm buổi**: tên buổi, sản phẩm, địa điểm, ngày, target.
2. **Khách hàng tham dự**: chọn trong danh sách người liên hệ / địa bàn của PIC buổi.
3. Sau buổi: nhập Actual + review 5 dòng ⇒ **Completed**.

Dữ liệu lưu ở Training Hub (sheet Training Report); Dental VN được tính KPI đào tạo khách hàng (C10).
:::split-end

## Kế hoạch tháng

:::split crmg/monthly, crmg/monthly_drawer | Kế hoạch tháng: danh sách hạng mục (trái) · khung sửa PLAN / RESULT (phải).
Menu bên ▸ **Kế hoạch tháng**.

- Mỗi hạng mục (theo Type task) có **PLAN** (kế hoạch) và **RESULT** (kết quả) của tháng.
- Bấm hạng mục ⇒ khung sửa bên phải; khung gợi ý mẫu nội dung theo từng hạng mục. Có nút **Nói**.
- Đóng khung khi còn nội dung chưa lưu ⇒ app hỏi **Lưu** / **Bỏ**.
:::split-end

## Báo cáo tháng bằng Word [[teams d s]]

:::split.wide crmg/word_report | Bản nháp Báo cáo hoạt động Sale tháng: sửa trực tiếp rồi tạo file Word.
Áp dụng cho Dental VN và Surgical VN, theo mẫu *Báo cáo hoạt động Sale MMH*.

1. **Gửi báo cáo ▸ Báo cáo tháng** (hoặc trang Kế hoạch tháng) ▸ **Báo cáo tháng Word**.
2. Chọn tháng, PIC (quản lý chọn được cả nhóm). App tự lấy số liệu: doanh số NPP, đơn hàng, mở mới, đi địa bàn, thuyết trình, kế hoạch tháng.
3. Sửa trực tiếp bản nháp: sửa chữ, ô bảng, **＋ Thêm** dòng / bảng / mục, xoá, đổi thứ tự, **Hoàn tác**. Ô vàng = phần Sales cần tự ghi.
4. **Tạo file Word** ⇒ tải về máy. Bản nháp được giữ trên máy theo tháng.
:::split-end

## Mở mới và SKU mới

:::split crmg/newacc, crmg/newacc_case | Danh sách ca mở mới (trái) · form ca mới (phải).
Menu bên ▸ **Kết quả bán hàng ▸ Mở mới & SKU mới**: ca mở địa bàn mới / bán SKU mới để tính KPI **C1** (Dental VN, Surgical VN) và **C2** (Thái Lan).

1. **＋ Thêm case**: account, SKU, tháng, NPP, đơn đầu tiên, chứng từ (kéo thả / dán ảnh).
2. App tự đối chiếu **4 điều kiện**: có trong báo cáo tuần · NPP xác nhận · thông tin đúng format · có đơn đầu tiên.
3. **Gửi duyệt** ⇒ quản lý **Xác nhận**, **Yêu cầu chỉnh sửa** (ca về nháp, giữ chứng từ) hoặc **Từ chối**.

Chỉ tính tháng phát sinh đầu tiên, tối đa 130%.
:::split-end

[[fig crmg/newacc_review | Quản lý xem chứng từ cỡ lớn và chọn Xác nhận · Yêu cầu chỉnh sửa · Từ chối.]]

## Dữ liệu được lưu ở đâu

| Dữ liệu | Lưu ở |
|---|---|
| Thuyết trình sản phẩm | File CRM nhóm ▸ **7. PRODUCT PRESENTATION** |
| Đào tạo khách hàng (T&E) | [[sheet training | Training Master]] ▸ Training Report FYxx (Category *Customer Training*) |
| Kế hoạch tháng | File CRM nhóm ▸ **5. MONTHLY REPORT** |
| Báo cáo tháng Word | Chỉ tạo file trên máy, không lưu lên Sheet |
| Mở mới & SKU mới | **16. NEW ACCOUNT & SKU** (VN) · **23. NEW ACCOUNT & SKU** (Thailand Surgical) · **NEW ACCOUNT & SKU** (Thailand Dental); chứng từ ở Google Drive |
