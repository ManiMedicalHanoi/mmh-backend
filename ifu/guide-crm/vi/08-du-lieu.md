---
number: 8
---
[[opener 8 | Dữ liệu được lưu ở đâu | Toàn bộ luồng dữ liệu của CRM trên một chỗ: bạn bấm Lưu, dữ liệu đi đâu, nằm ở file nào, tab nào, rồi được dùng cho báo cáo và KPI ra sao. Bấm biểu tượng Google Sheet để mở đúng file. | crmg/orders | Luồng dữ liệu; Bảng tổng hợp theo chức năng; File của từng nhóm; Hệ thống liên quan]]

## Luồng dữ liệu

<div class="flow"><div><b>1 · Bạn bấm Lưu</b>Trên máy tính hoặc điện thoại. Màn hình cập nhật ngay, không phải chờ.</div><div><b>2 · Hàng đợi trên máy</b>Chữ gửi trước, ảnh gửi sau. Mất mạng: giữ trên máy, có mạng tự gửi lại, không ghi trùng.</div><div><b>3 · Máy chủ của nhóm</b>Kiểm tra quy tắc (4 ô kết quả, lịch sử chăm sóc…), ghi vào đúng tab, đúng dòng.</div><div><b>4 · Dùng tiếp</b>Lịch, báo cáo tuần / tháng, họp tuần, Dashboard, tab 9. TARGET & KPI ⇒ file KPI FY68, email.</div></div>

- App **không giữ dữ liệu riêng**; mọi thứ nằm trong file Google Sheet của nhóm. Sửa thẳng trên Sheet thì app thấy sau khi bấm **Tải lại**.
- Chip nhỏ trên thanh trên cùng cho biết còn bao nhiêu lệnh **đang chờ gửi**. Chip đỏ = có lệnh lỗi ⇒ bấm để **Thử lại** hoặc **Bỏ**.
- Mỗi lần ghi có mã riêng ⇒ bấm Lưu hai lần hoặc mạng chập chờn cũng **không tạo dòng trùng**.

## Bảng tổng hợp theo chức năng

| Bạn làm trên app | Tab trong file CRM của nhóm | Dùng cho |
|---|---|---|
| Thêm / sửa **địa bàn** | 1. CUSTOMER CODE | Chọn account ở mọi form, hồ sơ địa bàn |
| Thêm **người liên hệ**, người đặt đơn mới, người gặp khi ghi lịch sử chăm sóc | 2. CBC | Danh bạ khách hàng, chọn người gặp |
| **Đơn hàng** [[teams vn]] | 3. SALE ORDER (+ chứng từ ở Drive) | Duyệt đơn, KPI C5 · C6 · C7, Dashboard |
| **Kế hoạch tháng** | 5. MONTHLY REPORT | Báo cáo tháng |
| **Đi địa bàn**, lịch sử chăm sóc | 6. WEEKLY REPORT (Thái: CUSTOMER VISITING) + ảnh ở Drive | Lịch, báo cáo tuần, KPI viếng thăm C3 |
| **Thuyết trình** | 7. PRODUCT PRESENTATION | KPI sự kiện |
| **ADP** | 8. ADP | Hồ sơ địa bàn, Dashboard |
| (tự tính) | 9. TARGET & KPI | KPI & Mục tiêu ⇒ file KPI FY68 |
| **Họp tuần** | 13. WEEKLY MEETING | Biên bản, email |
| **Mở mới & SKU mới** | 16. NEW ACCOUNT & SKU (Thái Surgical: 23.) | KPI C1 / C2 |
| **Công việc khác** | ALL TASK | Báo cáo tuần / tháng |
| **Đề xuất công tác** | [[sheet trip | File Business Trip]] + tab Business Trip Log | MMH Calendar, email Giám đốc |
| **T&E** [[teams d th]] | [[sheet training | Training Master]] ▸ Training Report | KPI đào tạo khách hàng |

## File của từng nhóm

[[backend crm-dental]]
[[backend crm-surgical]]
[[backend crm-eyeless]]
[[backend crm-thai]]
[[backend crm-thai-dental]]

## Hệ thống liên quan

| Hệ thống | CRM dùng để | Liên kết |
|---|---|---|
| **Training Hub** | Đăng nhập (email + mã 6 số), phân quyền, đào tạo khách hàng T&E, lịch đào tạo | [[sheet training | Training Master]] |
| **MMH KPI FY68** | Target KPI; nhận Actual từ tab 9 | [[sheet kpi | MMH KPI FY68]] |
| **Turnover Report** | Doanh số NPP, forecast (chỉ đọc) | [[sheet turnover | Turnover Report]] |
| **Data khách hàng** | Khách đến từ sự kiện | [[sheet cust-data | Data khách hàng]] |
| **Business Trip** | Đề xuất, duyệt, báo cáo công tác | [[sheet trip | Business Trip]] |
| **Report Hub · Marketing** | MMH Calendar, công tác của nhóm VN | [[sheet marketing | Report Hub – Marketing]] |

[[backend kpi]]
[[backend training]]
