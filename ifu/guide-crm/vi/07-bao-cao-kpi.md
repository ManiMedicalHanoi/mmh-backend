---
number: 7
---
[[opener 7 | Báo cáo, họp tuần, KPI | Gửi báo cáo tuần / tháng / KPI bằng email, làm biên bản họp tuần, theo dõi KPI và Dashboard. Mọi số liệu đọc thẳng từ file CRM của nhóm. | crmg/dash | Gửi báo cáo; Họp tuần; KPI và mục tiêu; Báo cáo KPI tháng và tự đánh giá quý; Dashboard; Dành cho quản lý; Dữ liệu được lưu ở đâu]]

## Gửi báo cáo

:::split crmg/report, crmg/m_report | Gửi báo cáo trên máy tính và điện thoại.
Menu bên ▸ **Công cụ & Báo cáo ▸ Gửi báo cáo**.

1. Chọn loại: **Báo cáo tuần**, **Báo cáo tháng**, **Báo cáo KPI tháng**.
2. Chọn kỳ (tuần / tháng) và người nhận: **gửi thử cho chính bạn**, **gửi chính thức tới team**, hoặc **Tải PDF**.
3. Xem trước ⇒ **Gửi**. Email kèm file PDF, gửi từ địa chỉ @manimedicalhanoi.com.

| Báo cáo | Hạn nộp |
|---|---|
| Báo cáo tuần | Trước 24:00 ngày làm việc cuối tuần (theo lịch MMH) |
| Báo cáo KPI tháng | Trước 16:00 ngày 02 tháng sau |
| Tự đánh giá quý | Trước 17:00 ngày 09 tháng đầu quý sau |

Dental VN, Surgical VN: báo cáo tuần cần **kế hoạch tuần sau**. Quản lý xem ai đã / chưa gửi trong **Thống kê gửi báo cáo**.
:::split-end

## Họp tuần

:::split crmg/meet, crmg/m_meet | Biên bản họp tuần: 4 bước.
Menu bên ▸ **Họp tuần**: biên bản họp của nhóm, đi qua 4 bước:

1. **Tổng quan**: doanh số NPP, KPI tháng.
2. **Khách hàng**: khách đã gặp, ghi chú.
3. **Hoạt động & kế hoạch**: đi địa bàn, công việc khác, thuyết trình, công tác, ADP — mỗi tab một ô ghi chú riêng.
4. **Kết quả bán hàng**: SKU, đơn hàng.

Lưu biên bản ⇒ gửi email / tải PDF; xem lại các biên bản cũ trong **Lịch sử**.
:::split-end

## KPI và mục tiêu

:::split crmg/kpi, crmg/m_kpi | KPI & Mục tiêu: mỗi PIC một bảng.
Menu bên ▸ **Tổng quan ▸ KPI & Mục tiêu**.

- Mỗi PIC một bảng: **Mã · KPI · Trọng số · Target · Actual · %** và điểm; xem theo **Tháng / Quý / Lũy kế**.
- Màu %: **dưới 90%** xám · **90 – dưới 100%** xanh dương · **100 – 120%** vàng · **trên 120%** xanh lá.
- Target lấy từ file **MMH KPI FY68**; Actual tính từ dữ liệu CRM (đi địa bàn, đơn hàng, mở mới, thuyết trình…).
:::split-end

## Báo cáo KPI tháng và tự đánh giá quý

:::split.even crmg/kpi_report, crmg/kpi_se | Báo cáo KPI tháng (trái) · Setting Expectation / tự đánh giá quý (phải).
- **Báo cáo KPI tháng**: chọn tháng ⇒ xem trước email KPI của bạn ⇒ **Gửi**. Hạn: ngày 02, trước 16:00.
- **Setting Expectation** (tự đánh giá quý): điền theo mẫu Word của công ty ⇒ **Tải file** hoặc **Gửi email** (được ghi nhận là đã nộp). Hạn: ngày 09 tháng đầu quý, trước 17:00.
:::split-end

## Dashboard

:::split crmg/dash, crmg/m_dash | Dashboard tab Doanh số.
Menu bên ▸ **Tổng quan ▸ Dashboard**, 2 tab:

- **Doanh số**: cột theo tháng so với vạch mục tiêu, KPI doanh số từng dòng, nhóm sản phẩm, khách giá trị cao.
- **Khách hàng**: lượt viếng thăm theo tháng, khách theo loại, độ phủ theo PIC, khách cần chăm sóc lại.

Khung **Cần xử lý** liệt kê việc của bạn: đơn chờ xử lý, ca mở mới cần sửa, buổi thuyết trình thiếu báo cáo, lượt đi địa bàn quá ngày chưa xong, báo cáo tuần trước chưa gửi.
:::split-end

[[fig crmg/dash_cust | Dashboard tab Khách hàng.]]

## Dành cho quản lý

:::split.wide crmg/mgr_dash | Dashboard của quản lý: so sánh theo PIC.
- **Đổi nhóm đang xem**: menu bên (điện thoại: Thêm ▸ Nhóm đang xem) — Dental · Surgical · Eyeless · Thailand Surgical · Thailand Dental.
- Dashboard thêm bảng **So sánh theo PIC**, đơn theo trạng thái / loại, độ phủ theo PIC.
- **Duyệt đơn hàng** (HOD), **duyệt mở mới**, **Thống kê gửi báo cáo** (xuất Excel: ai gửi đúng hạn, trễ, chưa gửi).
:::split-end

## Dữ liệu được lưu ở đâu

| Dữ liệu | Lưu ở |
|---|---|
| Biên bản họp tuần | File CRM nhóm ▸ **13. WEEKLY MEETING** (Thailand Surgical: 20. WEEKLY MEETING · Thailand Dental: WEEKLY MEETING) |
| KPI | File CRM nhóm ▸ **9. TARGET & KPI** ⇒ đẩy lên [[sheet kpi | MMH KPI FY68]] |
| Nhật ký gửi báo cáo | Sheet ẩn **_MMH_REPORT_LOG** trong file CRM nhóm |
| Doanh số NPP | [[sheet turnover | MMH Turnover Report]] (chỉ đọc) |
