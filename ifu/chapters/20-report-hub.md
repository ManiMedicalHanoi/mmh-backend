---
number: 3
---
[[opener 3 | MMH Report Hub | Bảng việc chung của các phòng ban. Mỗi người cập nhật key task / sub task của mình; báo cáo tuần, Monthly Report, biên bản họp được tạo từ chính dữ liệu đó. Report Hub còn có MMH Calendar (lịch chung của công ty), giao việc có email, đề xuất và duyệt công tác, tạo buổi đào tạo, và tab KPI. | rh/work_cal_week | Ai dùng, bố cục màn hình; Dữ liệu: nguồn, cách lưu, lưu ở đâu; Chức năng chính; Cập nhật công việc; MMH Calendar: lịch làm việc; Biểu đồ thống kê; Hệ thống báo cáo; MMH Calendar: lịch chung; Sự kiện, bài đăng; Đào tạo; Công tác; Giao việc; Nhắc việc, quản trị]]

## Ai dùng, bố cục màn hình

[[app rh]]

Report Hub có **ba phòng ban**, mỗi phòng ban một file dữ liệu (backend) riêng:

| Phòng ban | Backend | Loại việc thường gặp |
|---|---|---|
| **Marketing & Sales** | marketing | Product (Plan, Tender, Training), Marketing (Event, Digital, Design), Sales (Market) |
| **Back Office** | backoffice | Stock / Inventory, Accounting / Tax, Purchasing / Import, giao nhận |
| **Management** | management | Việc của ban quản lý; nguồn tổng hợp cho Director |

[[fig rh/main | Màn hình chính của Report Hub (Lịch làm việc theo tuần).]]

### Thanh trên cùng

| Nút | Chức năng |
|---|---|
| **≡** | Thu / mở menu bên trái |
| **MMH Report v**[[ver rh]] | Bấm số phiên bản để xem lại lịch sử cập nhật |
| **MMH Calendar** (kèm số) | Lịch chung của công ty; số đỏ = mục quá hạn cần xử lý |
| **Tìm nhanh** [[key Ctrl+K]] | Tìm việc, sự kiện, công tác, đào tạo |
| **Hướng dẫn** | Danh mục bài hướng dẫn từng bước |
| **Thông báo cập nhật** · **Việc đã giao** | Xem thông báo; theo dõi việc mình đã giao / được giao |
| **Duyệt công tác** | Chỉ Giám đốc: đề xuất công tác chờ duyệt |
| Bảng màu · **VN / EN** · tên | Màu giao diện; ngôn ngữ; menu tài khoản (Phân quyền người dùng, Đăng xuất) |

### Menu bên trái

| Vùng | Nội dung |
|---|---|
| **Phòng ban** | Marketing & Sales · Back Office · Management (số = việc chưa xong) |
| **Việc của tôi** | Số việc chưa xong, số việc quá hạn, chia theo phòng ban; bấm để lọc ngay |
| **Chức năng** | Tổng quan · Tiến độ công việc · Cập nhật công việc · Báo cáo tuần · Monthly Report · Lịch làm việc · Biên bản họp · KPI |
| **Tình hình đội** | Danh sách thành viên, số việc, số việc trễ |
| **Liên kết nhanh** | Thông tin thầu · Product Data · Dự trù & Doanh số |
| **Hoạt động** | Bảng tin hoạt động của cả nhóm (ai vừa thêm, vừa báo cáo gì) |

[[fig rh/my_tasks | Khối **Việc của tôi**: số việc chưa xong, việc quá hạn, chia theo phòng ban.]]

[[fig rh/dept_backoffice | Phòng ban **Back Office**: cùng cách cập nhật, loại việc riêng của phòng.]]

## Dữ liệu của Report Hub: nguồn, cách lưu, lưu ở đâu

Report Hub không có cơ sở dữ liệu riêng: mỗi loại dữ liệu ghi thẳng vào **file Google Sheet nguồn** của nó qua backend Apps Script. Dữ liệu một phòng ban nằm ở file của phòng đó; công tác ở file Business Trip; sự kiện, bài đăng ở file Marketing; đào tạo, giao việc ở Training Master.

<div class="flow"><div><b>1 · Tạo / sửa trên app</b>Thẻ việc, lịch, khung đề xuất… cập nhật màn hình ngay.</div><div><b>2 · Hàng đợi ghi</b>Lệnh ghi chạy lần lượt, thử lại khi mất mạng, đổi số tạm sang số dòng thật.</div><div><b>3 · Backend đúng loại dữ liệu</b>Marketing · Management · Back Office · Business Trip · MKT Online / Offline · Training.</div><div><b>4 · Tổng hợp</b>Báo cáo tuần / tháng, MMH Calendar, KPI, email.</div></div>

| Dữ liệu | Tạo / sửa ở đâu trên app | Lưu ở (file ▸ tab) | Đi tiếp tới |
|---|---|---|---|
| **Key task / Sub-task**: PIC, ngày, hạn, trạng thái, %, kết quả | **+ Thêm việc** · thẻ việc ▸ Cập nhật · kiểu Bảng | File công việc của phòng (backend marketing / management / backoffice) ▸ tab theo dõi tuần | Lịch làm việc, Tiến độ, Tổng quan, Báo cáo tuần |
| **Hạng mục tháng** | **Monthly Report** | File của phòng ▸ tab báo cáo tháng | Báo cáo tháng |
| **Biên bản họp** | **Biên bản họp** | File của phòng ▸ tab biên bản | Email biên bản |
| **Giao việc** + trao đổi | Thêm việc cho người khác (tick email) · **Việc đã giao** | Training Master ▸ **RH_Assign** | Popup "Việc mới được giao", email |
| **Đề xuất · duyệt · báo cáo công tác** | **Đề xuất công tác** · **Duyệt công tác** · MMH Calendar ▸ chuyến | File **Business Trip** ▸ MMH Travel report; nhật ký **Business Trip Log** của từng backend | MMH Calendar, email |
| **Sự kiện offline** | MMH Calendar ▸ sự kiện ▸ Sửa | **MKT Offline** ▸ REPORT_EVENT | KPI Sự kiện, Người tham dự (C12, C15) |
| **Bài đăng, thiết kế** | MMH Calendar ▸ bài đăng ▸ Sửa | **MKT Online** ▸ EVENT / PRODUCT REPORT | KPI Digital & Design (C17) |
| **Buổi đào tạo** | MMH Calendar ▸ **Tạo mới ▸ Đào tạo** | **Training Master** ▸ sessions | Training Hub, KPI Đào tạo (L1, L2) |
| KPI | Chỉ xem: **KPI** | File **MMH_KPI_FY68** | Báo cáo KPI tháng, Total KPI |

### Sơ đồ file nguồn

<div class="flow"><div><b>Người dùng</b>Cập nhật task, sự kiện, bài đăng, công tác, đào tạo</div><div><b>Report Hub</b>Ghi vào đúng file theo loại dữ liệu</div><div><b>7 file nguồn</b>Marketing · Management · Back Office · Business Trip · MKT Online · MKT Offline · Training</div><div><b>Tổng hợp</b>Báo cáo tuần, MMH Calendar, KPI</div></div>

| Loại dữ liệu | File (backend) |
|---|---|
| Task Marketing & Sales, biên bản họp, Công việc khác (Report Hub) | marketing |
| Task Management | management |
| Task Back Office | backoffice |
| Công tác (đề xuất, duyệt, báo cáo) | trip (file Business Trip); nhật ký riêng ở từng backend |
| Bài đăng sự kiện / sản phẩm, thiết kế | mkt-online |
| Sự kiện offline | mkt-offline |
| Đào tạo, đăng nhập, phân quyền, giao việc, email cập nhật | training |
| KPI | kpi (chỉ đọc) |

[[backend marketing]]
[[backend management]]
[[backend backoffice]]
[[backend trip]]
[[backend mkt-online]]
[[backend mkt-offline]]

## Chức năng chính

| Nhóm chức năng | Gồm | Mục |
|---|---|---|
| **Cập nhật công việc** | Key task, sub task, tiến độ, kết quả, file tham chiếu, giao việc | 3.4 · 3.12 |
| **MMH Calendar** | Kế hoạch cá nhân / đội nhóm: lịch làm việc, kế hoạch & báo cáo công tác, sự kiện, bài đăng, đào tạo | 3.5 · 3.8 → 3.11 |
| **Hệ thống báo cáo** | Báo cáo tuần, Monthly Report, biên bản họp, báo cáo KPI tháng, tự đánh giá quý (Chương 4) | 3.7 |
| **Biểu đồ thống kê** | Tiến độ công việc, Tổng quan, Tình hình đội, KPI | 3.6 |

## Cập nhật công việc: key task và sub task

Mọi việc trong Report Hub được tổ chức hai tầng:

- **Key task**: việc lớn, có loại việc (ví dụ *Product - Plan*, *Marketing - Event*), PIC, ngày bắt đầu, hạn.
- **Sub task**: các bước nhỏ của key task, mỗi sub task có PIC, hạn, % tiến độ, trạng thái (*To Do · In Progress · Completed · Cancelled*), kết quả / link.

[[fig rh/task_list, rh/m_task_list | Mục **Cập nhật công việc** dạng Danh sách: key task mở ra các sub task, có tiến độ, PIC, hạn, trạng thái — máy tính (trái) và điện thoại (phải).]]

### Thêm key task / sub task

[[fig rh/task_add_key, rh/task_add_sub | Khung **Thêm việc**: chọn *Key task mới* (trái) hoặc *Sub-task* của một key task có sẵn (phải).]]

1. Bấm **+ Thêm việc** (hoặc **+ Thêm việc** trong một ngày của lịch).
2. Chọn **Key task mới** hoặc **Sub-task** (chọn key task cha ở ô *Chọn key task*, bấm **Đổi** để chọn key task khác).
3. Điền **Tên**, **Loại việc** (key task), **PIC**, **Bắt đầu**, **Hạn**.
4. Muốn báo ngay cho người nhận: tick **Soạn email giao việc cho … ngay sau khi thêm** (xem mục Giao việc).
5. Bấm **Thêm**. Việc hiện ngay; dữ liệu gửi lên Sheet ở phía sau.

### Cập nhật tiến độ, kết quả

[[fig rh/task_edit | Khung **Cập nhật sub-task**: trạng thái, thanh tiến độ, hạn (revised), kết quả / link, file tham chiếu, chuyển key task.]]

1. Bấm vào sub task. Đổi **Trạng thái**, kéo **Tiến độ** (%).
2. **Hạn (revised)**: dời hạn khi cần (hạn gốc vẫn được giữ để đối chiếu).
3. **Kết quả / ghi chú / link**: gõ, dán link Drive, hoặc bấm **Đọc** để nói. Dán nhiều link, hệ thống tự nhận diện.
4. **Thêm file tham chiếu**: file lưu lên Drive theo *Phòng ban › PIC › tên file + ngày_task*, tối đa 25 MB / file.
5. **Chuyển key task** nếu sub task đặt nhầm chỗ. Bấm **Lưu**.

:::tip Sửa nhanh ngay trên danh sách
Ở danh sách, bấm **+ Thêm kết quả** hoặc nút −/+ của tiến độ để cập nhật mà không cần mở khung.
:::

### Kiểu Bảng và bộ lọc

[[fig rh/task_table | Kiểu **Bảng**: sửa trực tiếp từng ô (PIC, ngày, hạn, trạng thái, tiến độ, kết quả).]]

| Bộ lọc | Tác dụng |
|---|---|
| **Tất cả · Theo ngày · Tuần · Tháng** | Phạm vi thời gian |
| Ô tìm kiếm | Tìm key task, sub task, PIC |
| **Loại việc · Tất cả / Marketing / Sales · Nhân sự · Trạng thái** | Lọc theo loại, nhóm, người, trạng thái |
| Chip **Tất cả tiến độ · To Do · In Progress · Completed · Cancelled** | Lọc nhanh trạng thái |
| **Xóa lọc** · **Tài liệu tham chiếu** · **Nhắc việc ưu tiên** | Bỏ mọi bộ lọc; mở tài liệu chung; gửi nhắc việc |

## MMH Calendar: lịch làm việc, Pending, Today task

**Lịch làm việc** hiển thị sub task theo ngày bắt đầu / hạn, kèm công tác và đào tạo nếu bật.

[[fig rh/work_cal_week, rh/m_work_cal | Lịch làm việc theo tuần: thẻ việc có trạng thái, %, *Còn n ngày*, *Quá hạn*, *Đến hạn hôm nay*, nhãn *Email từ …* khi được giao qua email — máy tính (trái) và điện thoại (phải).]]

| Điều khiển | Tác dụng |
|---|---|
| **Today task** | Việc cần làm hôm nay |
| **Pending (n)** | Việc trễ hạn, đến hạn hôm nay / ngày mai, đang thực hiện |
| **Hôm nay · ‹ ›** · **Chỉ tôi / Cả đội** | Về hôm nay, lùi / tiến; xem việc của mình hoặc cả đội |
| **Tháng · Tuần · Danh sách** · **Ẩn việc đã xong** | Kiểu xem |
| **+ Thêm việc · Đề xuất công tác · Gửi email · Gửi báo cáo ▾** | Thêm việc; đề xuất công tác; soạn email; gửi báo cáo tuần |
| Thanh % · *Completed · Đang thực hiện · To Do · quá hạn* | Tiến độ chung của kỳ đang xem; bấm *Xem* để mở việc quá hạn |
| Công tắc **Công tác** · **Đào tạo** | Hiện / ẩn chuyến công tác, buổi đào tạo trên lịch |

[[fig rh/work_cal_month, rh/work_cal_list | Kiểu Tháng (trái) và Danh sách theo ngày (phải).]]

[[fig rh/work_cal_pending | Kiểu **Pending**: ba cột *Trễ hạn · Đến hạn hôm nay / ngày mai · Đang thực hiện*, mỗi thẻ có nút **Hoàn thành** và **Gia hạn**.]]

## Biểu đồ thống kê: tiến độ, tổng quan, tình hình đội

### Tiến độ công việc

[[fig rh/task_progress, rh/m_progress | **Tiến độ công việc**: mỗi key task một thanh, màu theo mức hoàn thành; mở ra để xem sub task — máy tính (trái) và điện thoại (phải).]]

Xem theo **Theo ngày · Công việc trong tuần · Công việc trong tháng**. Thanh tô màu theo % (0–25 · 25–50 · 50–75 · 75–99 · 100%) và đánh dấu quá hạn. Bấm **Mở / Ẩn sub-task**.

### Tổng quan

[[fig rh/overview, rh/m_overview | **Tổng quan**: ô số việc, hiệu suất theo nhân sự, biểu đồ sub task theo loại và theo trạng thái — máy tính (trái) và điện thoại (phải).]]

Ô **Tổng số việc · Công việc hôm nay · Đã hoàn thành gần đây · Đang thực hiện · Quá hạn** (bấm để xem chi tiết). **Hiệu suất theo nhân sự**: số việc trong kỳ, đã xong, % của từng người. **Phân tích & tiến độ**: sub task theo loại công việc, theo trạng thái.

[[fig rh/dept_management | Tổng quan của phòng **Management**.]]

### Tình hình đội và Hoạt động

[[fig rh/team_status, rh/activity | **Tình hình đội** (trái): số việc, số việc trễ của từng người. **Hoạt động** (phải): bảng tin ai vừa thêm / báo cáo gì, lọc theo tuần, tháng, người.]]

## Hệ thống báo cáo: tuần, tháng, biên bản họp

### Báo cáo tuần

[[fig rh/weekly_report, rh/m_weekly_report | **Báo cáo tuần**: bảng *Kết quả tuần này* và *Plan tuần sau*, tô đỏ dòng quá hạn — máy tính (trái) và điện thoại (phải).]]

:::rule Báo cáo tuần lấy việc nào
**Kết quả tuần** = mọi task có ngày bắt đầu / hạn / ngày hoàn thành chạm vào tuần, cộng task quá hạn chưa xong. **Plan tuần sau** = task chưa xong có ngày bắt đầu hoặc hạn chạm vào tuần sau, kể cả việc quá hạn gánh sang. Không cần gõ lại: cập nhật task đủ là báo cáo đủ.
:::

[[fig rh/weekly_send | Khung **Gửi báo cáo tuần**: chọn tuần, chọn gửi thử cho chính mình hoặc gửi cho Team Leader, HOD và đồng nghiệp.]]

1. Bấm **Gửi báo cáo ▾** › Báo cáo tuần (hoặc mục Báo cáo tuần › **Gửi báo cáo**).
2. Chọn **Tuần báo cáo**. Email kèm PDF gồm 2 phần: *Kết quả tuần* và *Plan tuần sau*, % tô màu theo mức, dòng quá hạn tô đỏ.
3. Chọn **Gửi thử cho chính tôi** để kiểm tra, hoặc **Gửi cho Team Leader, HOD & đồng nghiệp cùng team** (To: thành viên cùng team; CC cố định theo quy định của công ty).
4. Bấm **Gửi báo cáo**.

### Monthly Report

[[fig rh/monthly_report, rh/m_monthly | **Monthly Report**: mỗi mục một thẻ (tên việc, loại, người phụ trách, nội dung tháng) — máy tính (trái) và điện thoại (phải).]]

Chọn tháng, lọc **Loại việc · Nhân sự**; **+ Thêm mục**, mỗi thẻ có **Cập nhật** / **Xóa**. **Xuất PDF báo cáo tháng** để gửi hoặc lưu.

### Biên bản họp

[[fig rh/minutes, rh/m_minutes | **Biên bản họp**: nhóm, ngày họp, khoảng review, thành phần tham dự, nội dung theo mục, ghi chú, follow-up action — máy tính (trái) và điện thoại (phải).]]

1. Bấm **+ Biên bản mới**. Chọn **Nhóm**, **Ngày họp**, **Khoảng thời gian review** (từ lần họp trước, tuần này, tuần trước, 2 tuần, tháng này, tháng trước).
2. Chọn **Thành phần tham dự**. App tự đưa các task trong khoảng review vào từng mục **Plan · Tender · Training · Other**.
3. Ghi **Ghi chú họp** và **Follow-up action** cho từng mục.
4. **Lưu biên bản** (sheet *MEETING LOG*); **Gửi email** cho người tham dự; **Lịch sử** để mở biên bản cũ.

## MMH Calendar: lịch chung của công ty

**MMH Calendar** gom bốn loại lịch của công ty vào một màn hình. Mở bằng nút **MMH Calendar** trên thanh trên cùng (có ở cả Report Hub và CRM).

[[fig rh/mmh_cal_month, rh/m_mmh_cal | MMH Calendar · kiểu Tháng: ô tổng hợp bốn loại lịch, bộ lọc bên trái, lịch tháng ở giữa — máy tính (trái) và điện thoại (phải).]]

| Ô tổng hợp | Nguồn dữ liệu | Số hiển thị |
|---|---|---|
| **Công tác** | File Business Trip (backend trip) | Số chuyến, ngày-người, số người, chi phí dự tính |
| **Đào tạo** | Training Hub (Training Report) | Số buổi, đã diễn ra, kế hoạch, số trainer |
| **Sự kiện offline** | Marketing Offline · REPORT_EVENT | Số sự kiện, đã chốt, chưa chốt |
| **Bài đăng** | Digital Marketing & Design · EVENT / PRODUCT REPORT | Số bài, on-air, chờ, design |

### Bộ lọc

| Bộ lọc | Tác dụng |
|---|---|
| **Hiển thị**: Công tác · Đào tạo · Sự kiện offline · Bài sự kiện · Bài sản phẩm | Bật / tắt từng loại (số = số mục trong tháng) |
| **Mọi page** · **Chỉ bài Design** | Lọc bài đăng theo trang Facebook, chỉ bài có thiết kế |
| **Trạng thái**: Tất cả · Kế hoạch · Đã xong | Lọc trạng thái |
| **Người**: chip tên | Lọc theo người đi công tác / trainer |
| **Sắp tới (14 ngày)** | Danh sách mục sắp diễn ra |
| **Công tác người khác** | Quản lý bật để xem chuyến công tác của người khác |

[[fig rh/mmh_cal_week, rh/mmh_cal_list | Kiểu Tuần (trái) và Danh sách theo ngày (phải).]]

[[fig rh/trip_visibility_off, rh/trip_visibility_on | Công tắc **Công tác người khác**: tắt (trái) chỉ thấy chuyến của mình; bật (phải, quản lý) thấy cả công ty.]]

### Tạo mới từ lịch

[[fig rh/cal_new | Nhấp đúp một ngày: menu **Tạo mới** với 5 lựa chọn, mỗi lựa chọn ghi vào đúng file nguồn.]]

| Lựa chọn | Ghi vào |
|---|---|
| **Đề xuất công tác** | File Business Trip, gửi email xin duyệt |
| **Tạo kế hoạch đào tạo** | Training Hub; gửi thư mời, tải tài liệu |
| **Sự kiện offline** | REPORT_EVENT (Marketing Offline) |
| **Bài đăng sự kiện** | EVENT REPORT (Digital Marketing) |
| **Bài đăng sản phẩm** | PRODUCT REPORT (Digital Marketing) |

## Sự kiện offline và bài đăng Marketing

Bấm một sự kiện / bài đăng trên lịch để xem chi tiết; bấm **Sửa** để sửa ngay trong khung bên phải, **không cần mở file Sheet**.

[[fig rh/offline_event, rh/offline_edit | Sự kiện offline: chi tiết (trái) và khung sửa (phải), ghi thẳng vào sheet REPORT_EVENT, giữ nguyên cột có công thức.]]

Trường của sự kiện: ngày diễn ra, loại sự kiện, sản phẩm, segment, địa điểm, chủ đề, KOL / ACC, đối tác, kế hoạch (*Fixed / Not yet fixed*), thực hiện (*As planned / Change schedule / Additional / Cancel*), tham dự mục tiêu, mục tiêu bán Jizai / Composite, doanh số thực tế, link folder, đánh giá.

[[fig rh/online_post, rh/online_edit | Bài đăng sự kiện: chi tiết (trái) và khung sửa (phải), ghi vào EVENT REPORT.]]

Trường của bài đăng: sự kiện, loại nội dung, KOL, format, pillar, page, trạng thái (*On air đúng hạn · On air muộn · Chờ duyệt · Pending · Phát sinh · Cancel*), ngày on-air dự kiến / thực tế, link bài đăng, nội dung chính, ghi chú.

:::note Sửa an toàn
App xác nhận đúng dòng trước khi ghi và không ghi vào cột có công thức. Thao tác hiện ngay; nếu ghi lỗi, app trả lại dữ liệu cũ và báo lỗi.
:::

## Đào tạo trên lịch

Trainer tạo buổi đào tạo ngay trên MMH Calendar; dữ liệu ghi vào Training Hub (Chương 5).

[[fig rh/training_create, rh/training_invite | **Tạo buổi đào tạo** (trái) và **Thư mời đào tạo** (phải).]]

1. Nhấp đúp ngày › **Tạo kế hoạch đào tạo**. Điền chủ đề, mục tiêu, ngày, giờ, nhóm chủ đề, hình thức, trainer, đối tượng tham dự (nhóm hoặc từng người), link họp.
2. Bấm **Lưu buổi đào tạo** (trạng thái *Plan*) hoặc **Lưu & soạn email mời**.
3. Trong **Thư mời**: chọn người nhận / CC, sửa tiêu đề, thêm lời nhắn. Bấm **Gửi email** (hoặc **Soạn bằng Gmail**). Thư mục tài liệu trên Drive được tạo khi gửi; email có link tới thư mục.

[[fig rh/training_detail, rh/m_training | Chi tiết buổi đào tạo (trainer): gửi lại thư mời, sửa buổi, kéo thả tài liệu vào thư mục, xem / tải tài liệu — máy tính (trái) và điện thoại (phải).]]

Người không phải trainer chỉ xem được buổi đào tạo mình được mời; khung chi tiết ghi rõ *chỉ xem*.

## MMH Calendar: kế hoạch và báo cáo công tác

### Đề xuất

[[fig rh/trip_propose, rh/m_trip_propose | Khung **Đề xuất công tác** trên Report Hub (giống CRM) — máy tính (trái) và điện thoại (phải).]]

Bấm **Đề xuất công tác** trên thanh lịch. Điền ngày đi / về, nơi đến, người đi cùng, mục đích, kết quả mong đợi, chi phí dự trù (nhiều dòng, tự cộng), lịch trình, thiết bị mang theo. Bấm **Gửi đề xuất**: ghi vào file Business Trip, gửi email *Business Trip Approval Request* tới Giám đốc.

### Duyệt (Giám đốc)

[[fig rh/trip_approve, rh/m_trip_approve | **Duyệt đề xuất công tác**: chọn một hoặc nhiều chuyến, ghi chú, **Duyệt** hoặc **Từ chối** (phải ghi lý do).]]

### Chi tiết và báo cáo sau chuyến

[[fig rh/trip_detail, rh/trip_report | Chi tiết chuyến công tác trên lịch (trái) và khung báo cáo công tác (phải).]]

Sau chuyến đi: mở chuyến › **Cập nhật báo cáo công tác** › điền *Key Activities · Key Findings · Follow up Actions* › tick gửi email báo cáo cho Director (CC HOD) nếu cần › **Lưu báo cáo**. Báo cáo cần nộp trong **3 ngày** sau khi kết thúc chuyến; *Thư nhắc việc* sẽ nhắc nếu chưa nộp.

## Giao việc và trao đổi

[[fig rh/assign_add, rh/assign_mail | Giao việc: thêm sub task cho người khác với tick soạn email (trái), khung soạn email giao việc (phải).]]

1. Thêm sub task, chọn **PIC** là người nhận, tick **Soạn email giao việc**, bấm **Thêm**.
2. Khung **Soạn email** mở sẵn: người nhận, tiêu đề dạng *[MMH] Giao việc: … · hạn …* (kèm mã việc), nội dung có tên việc, key task, ngày bắt đầu, hạn.
3. Chọn **Gửi từ**: *Hộp thư của bạn* (mở Outlook với @mani.inc, Gmail với @manimedicalhanoi.com), *Ứng dụng email trên máy*, hoặc *Hộp thư hệ thống Report Hub*. Bấm **Mở thư để gửi** / **Gửi**.

[[fig rh/assign_popup | Người nhận mở app: popup **Việc mới được giao**, bấm **Mở công việc** hoặc **Đã hiểu**.]]

[[fig rh/assign_track, rh/m_assign_track | **Việc đã giao & trao đổi**: danh sách việc đã giao kèm trạng thái *Đã xem · Chưa xem · Hoàn thành* (trái); trao đổi trong từng việc (phải).]]

Mở bằng nút **Việc đã giao** trên thanh trên cùng: tab **Tôi đã giao** / **Giao cho tôi**. Khi người nhận chuyển việc sang *Completed*, người giao nhận email báo hoàn thành.

## Nhắc việc, thông báo, quản trị

### Thư nhắc việc

[[fig rh/letter | **Thư nhắc việc**: báo cáo công tác chưa nộp, thư mục đào tạo còn trống, việc quá hạn; mỗi mục có nút xử lý ngay.]]

Quy định được nhắc: báo cáo công tác trong **3 ngày** sau khi kết thúc chuyến; tài liệu đào tạo tải lên thư mục **trước 1 ngày**. Thư hiện sau các popup khác (Chương 1).

### Nhắc hạn chứng từ, nhắc KPI

[[fig rh/deadline, rh/kpi_reminder_card | Nhắc hạn nộp chứng từ kế toán (trái) và nhắc tự đánh giá quý (phải).]]

### Thông báo cập nhật và email cập nhật (Admin)

[[fig rh/whats_new | Popup **Thông báo cập nhật**: danh sách phiên bản, mỗi mục có ảnh minh hoạ.]]

[[fig rh/update_email | **Gửi email thông báo cập nhật** (chỉ Admin): chọn một bản cập nhật, xem trước email, đính kèm hướng dẫn PDF, gửi tới mọi người dùng đang hoạt động.]]

### Phân quyền người dùng (Admin)

[[fig rh/permissions_menu, rh/permissions | Menu tài khoản › **Phân quyền người dùng** (trái); bảng người dùng và quyền (phải).]]

Admin xem danh sách người dùng (sheet RH_Users): email, tên, phòng ban, chức danh, cấp (Director · HOD · Team Leader · PIC), và **khoá phiên** khi cần. Quyền được bật / tắt riêng cho từng người (chỉ lưu phần khác với mặc định của vai trò):

| Quyền | Nghĩa |
|---|---|
| Giao việc & email giao việc | Giao việc cho người khác |
| Báo cáo tuần / tháng | Thấy tab Báo cáo tuần, Monthly Report |
| Đề xuất & báo cáo công tác | Nút Đề xuất công tác |
| Tạo buổi đào tạo · gửi thư mời | Nhấp đúp lịch › Đào tạo |
| Sửa dữ liệu Marketing Offline / Online | Nút Sửa trên MMH Calendar |
| Xem Management | Thấy phòng ban Management |
| Product Data: sửa / thêm / upload | App Product Data (ai đăng nhập cũng xem được; xoá tài liệu chỉ Admin) |

### Tìm nhanh, hướng dẫn, màu, điện thoại

[[fig rh/quick_search | **Tìm nhanh** (Ctrl + K): kết quả gom theo loại, có lệnh nhanh.]]

[[fig rh/tour_catalog, rh/theme | Danh mục **Hướng dẫn** (trái) và **màu giao diện** (phải).]]

[[phones rh/m_task_list, rh/m_mmh_cal, rh/m_tour | Report Hub trên điện thoại: trang chính, MMH Calendar, hướng dẫn từng bước.]]


### Chế độ TEST (Admin)

[[fig rh/test_flow, rh/m_test_flow | Chế độ TEST: thao tác dưới tên TEST, bảng Luồng dữ liệu cho biết dữ liệu đi vào file nào, dòng nào, email lẽ ra gửi tới ai.]]

Admin thử mọi chức năng với dữ liệu thật dưới tên **TEST**, đóng vai Giám đốc để duyệt công tác của TEST. Cách dùng: **Chương 6**.

## Lịch sử cập nhật gần đây


[[changelog rh 6]]
