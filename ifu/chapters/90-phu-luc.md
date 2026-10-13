---
number: 7
---
[[opener 7 | Phụ lục | Danh sách backend kèm đường link, bảng thuật ngữ, lịch sử cập nhật gần đây của từng app và cách cập nhật tài liệu này khi hệ thống thay đổi. | | Danh sách backend và đường link; Thuật ngữ; Lịch sử cập nhật CRM; Lịch sử cập nhật Report Hub; Cập nhật tài liệu này]]

## Danh sách backend và đường link

Bảng dưới đây được đọc tự động từ danh mục backend của hệ thống (kho **mmh-backend**, file backends.json) tại thời điểm dựng tài liệu. Bấm vào biểu tượng để mở:
[[icon googlesheets]] **Sheet**: file dữ liệu gốc · [[icon googleappsscript]] **Script**: mã Apps Script trên Google (chỉ người quản trị) · [[icon googlechrome]] **/exec**: địa chỉ web app mà app gọi tới · [[icon github]] **Code**: mã nguồn trong kho mmh-backend.

[[backends]]

:::warn Tài liệu nội bộ
Các đường link trên dẫn tới dữ liệu thật của công ty. Không gửi tài liệu này ra ngoài MMH. Quyền mở từng file vẫn do Google kiểm soát theo tài khoản công ty.
:::

### Ai được sửa backend

Mã backend chỉ được sửa qua kho **mmh-backend** (tạo yêu cầu thay đổi, gộp vào nhánh chính). Sau khi gộp, hệ thống **tự deploy** đúng bản đang chạy, đường link /exec không đổi, rồi gọi thử; gọi thử lỗi thì web app tự quay về bản trước. Không dán mã trực tiếp trên trình soạn Apps Script. Nếu lỡ sửa trực tiếp, chạy quy trình *Kéo code về* để đồng bộ lại kho.

## Thuật ngữ

| Thuật ngữ | Nghĩa trong tài liệu này |
|---|---|
| **App / ứng dụng** | Trang web nội bộ (CRM, Report Hub, Training Hub, Product Data) mở bằng trình duyệt |
| **Backend** | Mã Google Apps Script gắn với một Google Sheet, nhận lệnh đọc / ghi từ app |
| **/exec** | Địa chỉ web app của một backend; app gửi lệnh tới địa chỉ này |
| **PIC** | Người phụ trách một việc, một khách hàng hay một mã KPI |
| **Key task / Sub task** | Việc lớn và các việc con trong Report Hub |
| **Đi địa bàn** | Lượt gặp khách hàng / bác sĩ / NPP của Sales, ghi trong CRM (tab 6. WEEKLY REPORT) |
| **CBC** | Người liên hệ của một khách hàng (key stakeholder) trong CRM, tab 2. CBC |
| **NPP** | Nhà phân phối |
| **Mở mới địa bàn & SKU mới** | Khách hàng mới / mã sản phẩm mới có đơn đầu tiên, cần quản lý xác nhận để tính KPI C1 |
| **FY68** | Năm tài chính 68: tháng 9/2026 đến tháng 8/2027 |
| **Target / Actual** | Chỉ tiêu / số thực hiện của một mã KPI |
| **Trọng số** | Tỉ lệ đóng góp của một mã KPI vào tổng KPI của người đó |
| **Phiên đăng nhập** | Lần đăng nhập bằng email + mã 6 số, dùng 30 ngày trên một máy |
| **Hàng đợi ghi** | Danh sách thao tác đã bấm Lưu nhưng đang gửi lên Sheet ở phía sau |
| **Chế độ TEST** | Chế độ của Admin: thao tác dưới tên TEST, ghi thật vào file thật, email chỉ về Admin, người khác không thấy (Chương 6) |
| **Chế độ thử** | Chế độ cũ của Admin trên CRM: xem như một bạn sales, không ghi vào dữ liệu thật |
| **Luồng dữ liệu** | Bảng trong chế độ TEST: mỗi lần lưu đi vào backend nào, file ▸ tab ▸ dòng nào, email lẽ ra gửi tới ai |

## Lịch sử cập nhật CRM

Các bản gần nhất (đọc từ mục *Có gì mới* của app; CRM viết bằng tiếng Anh):

[[changelog crm 12]]

## Lịch sử cập nhật Report Hub

[[changelog rh 12]]

## Cập nhật tài liệu này

Tài liệu được dựng bằng bộ công cụ **ifu/** trong kho mmh-backend:

| Phần | Ở đâu | Khi nào sửa |
|---|---|---|
| Nội dung từng chương | ifu/chapters/*.md (Markdown) | Khi chức năng thay đổi |
| Ảnh chụp app | ifu/capture/ (kịch bản chụp với dữ liệu giả) | Khi giao diện thay đổi: chạy lại kịch bản chụp |
| Phiên bản app, danh sách backend, link, lịch sử cập nhật | **Tự đọc** từ các repo khi dựng | Không cần sửa tay |
| Bố cục sách | ifu/theme/book.css | Hiếm khi |

Dựng lại toàn bộ sách: chạy *node build.mjs all* (hoặc *crm*, *rh*, *kpi*, *th* cho từng phần). Mỗi lần phát hành tính năng lớn ở một app nên dựng lại phần tương ứng để tài liệu luôn khớp hệ thống.
