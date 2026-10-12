---
number: 4
---
[[opener 4 | KPI: tự điền, tự liên kết, hiển thị | KPI của mọi nhân sự nằm trong một file chung là MMH KPI FY68. Phần lớn số thực hiện (Actual) được máy tự điền từ các file nguồn: CRM, doanh số kế toán, đào tạo, marketing, điểm hành vi. Người dùng xem KPI ngay trong CRM và Report Hub, gửi báo cáo KPI tháng và tự đánh giá quý từ app. | rh/kpi_tab | File KPI gồm những gì; Số liệu đến từ đâu; Tự điền diễn ra thế nào; Phần nào còn nhập tay; Cách tính % và màu; Xem KPI trên app; Báo cáo KPI tháng và tự đánh giá quý; Total KPI cho quản lý; Dành cho người quản lý file KPI]]

## Bức tranh chung

KPI ở MMH vận hành theo ba lớp:

<div class="flow"><div><b>1 · Nguồn</b>Các file làm việc hằng ngày: 4 file CRM, Turnover Report, Training Master, Marketing Online, Marketing Offline, KBI</div><div><b>2 · File KPI chung</b>MMH KPI FY68: Target, Actual từng tháng, trọng số, % đạt</div><div><b>3 · Hiển thị</b>Tab KPI trong CRM và Report Hub, email KPI tháng, Setting Expectation</div></div>

- **Không ai phải chép số tay từ file nguồn sang file KPI.** Một chương trình chạy nền tên là **KpiSyncCenter** (gắn với file KPI) tự đọc các nguồn và ghi vào cột *Actual*.
- **Target chỉ đặt một lần** trong file KPI. Target được tự đẩy về CRM và file Turnover, nên mọi nơi cùng dùng một chỉ tiêu.
- **App chỉ đọc KPI, không sửa.** Muốn sửa số, sửa ở file nguồn; vài giây sau KPI tự cập nhật.

[[backend kpi]]

## File KPI gồm những gì

| Sheet trong MMH KPI FY68 | Nội dung | Ai sửa |
|---|---|---|
| **0. Staff List** | Danh sách nhân sự: phòng ban, nhóm, Team Leader, HOD; dùng để xác định ai xem được KPI của ai và tự điền người nhận email | Người quản lý file KPI |
| **1. Objective & Strategy** | Mục tiêu chiến lược theo 4 góc nhìn: **F** Tài chính · **C** Khách hàng · **P** Quy trình nội bộ · **L** Học hỏi & phát triển | Ban lãnh đạo |
| **3. Detail KPI** | Mọi mã KPI của công ty: *Target* và *Actual* từng tháng (cột "202609 Target", "202609 Actual"…) và cả năm FY68 | Target: người quản lý · Actual: **máy tự điền** (trừ mã chưa có nguồn) |
| **4. Rule** | Cách tính của từng nhóm KPI, quy định vận hành | Người quản lý file KPI |
| **5. Member KPI Monthly** · **5A. KPI Weight Input** | KPI của từng người: trọng số theo quý, % đạt, % × trọng số, tổng theo tháng / quý / năm | Trọng số: nhập tay ở 5A · còn lại tự tính |
| **6. Member KPI Summarize** | Tổng kết từng người theo năm, quý, tháng | Tự tính |
| KPI SYNC STATUS · KPI EXPLAIN MAP · _CRM_SYNC_LOG | Tình trạng từng nguồn, nguồn và cách tính từng mã, nhật ký đồng bộ | **Máy tự tạo**, chỉ đọc |

### Mã KPI và nhóm KPI

Mỗi KPI có một mã dạng **chữ + số** (ví dụ *C1-04*, *F2-01*, *L3-10*). Chữ cái đầu là góc nhìn (F, C, P, L); trên app, tên KPI được rút gọn sang tiếng Việt theo nhóm:

| Nhóm trong file KPI | Tên rút gọn trên app |
|---|---|
| Sales – Turnover | Doanh số |
| Sales – New & Relaunched Product Turnover | Doanh số sản phẩm mới |
| Sales – New Customer Accounts | Mở mới |
| Sales – Customer Visits & Co-visits | Viếng thăm khách hàng |
| Sales – Sales Supported by MMH Team | Bán hàng hỗ trợ |
| Marketing – Event Number · Event Participants | Sự kiện · Người tham dự |
| Marketing – Sales Supported by Marketing | Marketing hỗ trợ bán |
| Marketing – Digital & Design · New Product Launch | Digital & Design · Ra mắt sản phẩm |
| People – Training & Development · Behaviour | Đào tạo · Hành vi |
| Back-office – Order Fulfilment · Projects · Finance & Administration | Đơn hàng & giao nhận · Dự án · Tài chính & hành chính |

:::tip Xem tên gốc
Trên tab KPI của app, rê chuột vào tên KPI rút gọn để xem tên đầy đủ trong file KPI.
:::

## Số liệu đến từ đâu

| Nguồn (file Google Sheet) | Sheet được đọc | Mã KPI tự điền | Cách tính |
|---|---|---|---|
| **Turnover Report** (kế toán) | SUM TURNOVER | F0-00, F1-xx, F2-xx, F3-xx, F4-00, F5-00, F6-01 (Composite), F6-02 (JIZAI), F6-03 | Doanh số NPP (USD) theo nhà phân phối, mảng (Segment Report), nước; số của từng tháng |
| **4 file CRM** (Dental, Surgical, Eyeless, Thái) | 9. TARGET & KPI (CRM tự tính từ các tab 1, 3, 6, 7, 16) | C1 mở mới & SKU mới · C3 viếng thăm · C5 / C6 / C7 bán hàng hỗ trợ · giới thiệu sản phẩm | C1 = số ca *Approved* ở sheet 16; C5 = tổng tiền đơn hàng ÷ tỷ giá tháng; C6 / C7 = số lượng Composite / JIZAI qua NPP phụ trách; lượt *Cancel* không tính |
| **Training Master** | Training Report FYxx | L1-00 (đào tạo sản phẩm nội bộ) · L2-xx (đào tạo nội bộ khác, theo trainer) · C10-06 (đào tạo bên ngoài) | Đếm buổi có trạng thái *Completed* |
| **Marketing Online** (Digital Marketing & Design) | EVENT REPORT, PRODUCT REPORT, yêu cầu thiết kế | C17-01 → C17-06 | Tỉ lệ inbox, bài đăng đúng hạn, số link bài đã đăng, thiết kế đúng hạn, điểm thiết kế |
| **Marketing Offline** (sự kiện) | REPORT_EVENT | C8-00, C9-00, C12-01 / 02, C15-01 / 02 | Số bán Composite / JIZAI tại sự kiện, số sự kiện có folder, số người tham dự |
| **Điểm hành vi (KBI)** | Detail report | L3-xx | Điểm tháng = 100 + điểm cộng + điểm trừ |

Mở từng file nguồn bằng các nút dưới đây (cần quyền truy cập của công ty):

[[backend turnover]]
[[backend crm-dental]]
[[backend training]]
[[backend mkt-online]]
[[backend mkt-offline]]

:::note File CRM luôn trỏ đúng file KPI
Mỗi lượt đọc CRM, KpiSyncCenter kiểm tra ô liên kết trong tab KPI của CRM. Nếu ô đó trỏ sang một file KPI khác (bản cũ), máy tự sửa lại thành link file KPI hiện hành, để hai bên không ghi đè chỉ tiêu của nhau.
:::

## Tự điền diễn ra thế nào

| Tình huống | Thời gian số KPI thay đổi |
|---|---|
| Có người **sửa tay** file nguồn (Turnover, Training Master, Marketing, CRM, KBI) | Khoảng **5 đến 20 giây** (chạy ngay khi file được sửa, chỉ khi sửa đúng sheet có dữ liệu KPI) |
| **Web app ghi dữ liệu** (CRM, Training Hub…) | Kiểm tra **mỗi 1 phút**; riêng CRM đẩy KPI ngay sau khi lưu |
| Kiểm tra định kỳ | **Cứ 15 phút** đọc lại toàn bộ nguồn một lần, để không sót |
| Nhập trễ cho tháng đã qua | **Vẫn cập nhật** (từ KpiSyncCenter v1.18 không còn khoá số tháng cũ) |

Quy tắc ghi vào cột *Actual* của sheet 3. Detail KPI:

- Chỉ ghi **tháng đã tới**; **không bao giờ ghi cột Target**.
- Dòng tổng (ví dụ F3-00 = F3-01 + F3-02 + F3-03) luôn là công thức cộng các dòng con.
- Ô đang có công thức khác bị thay bằng số từ nguồn; công thức cũ được lưu ở sheet ẩn *_SYNC_REPLACED*.
- Nguồn có dữ liệu bất thường (ví dụ doanh số JIZAI trùng y hệt Composite cùng NPP, cùng tháng): máy **không ghi**, để trống và báo ở *KPI SYNC STATUS*.

## Phần nào còn nhập tay

| Việc | Nhập ở đâu | Ai làm |
|---|---|---|
| Target từng mã KPI | File KPI · 3. Detail KPI | Người quản lý KPI |
| Trọng số theo quý | File KPI · 5A. KPI Weight Input | Người quản lý KPI |
| Actual của KPI **chưa có nguồn tự động** (chủ yếu Back Office: giao hàng, thuế, tồn kho, hồ sơ thầu…) | File KPI · 3. Detail KPI | Người phụ trách mã KPI |
| Ô nền vàng trên CRM (doanh số NPP khi file KPI còn trống, SKU mới) | Tab KPI của CRM | Sales |
| Tỷ giá VND/USD theo tháng (để tính C5) | CRM · nút **Tỷ giá** (tháng chưa nhập dùng tỷ giá tháng gần nhất trước đó) | Người phụ trách nhóm |
| Phần review cuối quý | CRM / Setting Expectation | Sales điền, Team Leader duyệt |

## Cách tính % và màu

:::rule Công thức
**% đạt = Actual ÷ Target** · **Tổng KPI = Σ (% đạt × trọng số)** của các mã trong kỳ.
:::

- Kỳ **đã tới** mà Target = 0 ⇒ tính **100%**, được đủ trọng số (có hay không có số thực hiện). Kỳ chưa tới để trống.
- Trên CRM, % đạt mỗi mã tối đa **130%**; riêng doanh số (mã F) không giới hạn.
- Doanh số (mã F) tính **theo từng tháng**, cả năm = tổng 12 tháng.
- Quý theo năm tài chính: **Q1 = tháng 9 → 11 · Q2 = 12 → 2 · Q3 = 3 → 5 · Q4 = 6 → 8.**

| Màu trên app | Mức đạt | Ý nghĩa |
|---|---|---|
| <span class="chip">Xám</span> | dưới 90% | Chưa đạt |
| <span class="chip" style="background:#DCE6F6;color:#3A5CAA">Xanh dương</span> | 90% đến dưới 100% | Gần đạt |
| <span class="chip y">Vàng</span> | 100% đến 120% | Đạt |
| <span class="chip g">Xanh lá</span> | trên 120% | Vượt |

Ô chưa có số hiện nhãn **Chưa có số**; doanh số kế toán chưa khoá sổ hiện **Chưa chốt** kèm tháng kế toán đã chốt gần nhất.

## Xem KPI trên app

Tab **KPI** có ở cả Report Hub (menu Chức năng › KPI) và CRM (menu **KPI & Mục tiêu**). Cả hai dùng chung một module và cùng đọc file KPI, nên số giống nhau.

[[fig rh/kpi_tab | Tab KPI trong Report Hub: hàng chọn người (trên), 4 ô tổng hợp, biểu đồ xu hướng theo tháng, đóng góp theo nhóm KPI và bảng chi tiết từng mã.]]

1. Mở tab **KPI**. Mặc định hiện KPI của bạn trong tháng hiện tại.
2. Chọn kỳ **Tháng / Quý / Năm** để đổi phạm vi.
3. Team Leader, HOD, Director: bấm tên ở hàng **Từng người** để xem KPI của thành viên; người đang xem được làm nổi bật trên biểu đồ so sánh.
4. Đọc bảng **Chi tiết KPI**: nhóm KPI · mã + tên rút gọn · trọng số · Target · Actual · % đạt · thanh tiến độ · % × trọng số; dòng cuối là **Tổng tháng**.

| Ô tổng hợp | Ý nghĩa |
|---|---|
| **KPI tháng** | Tổng % × trọng số của tháng đang xem |
| **Quý (lũy kế)** | Tổng của quý tính tới tháng đang xem |
| **Năm FY68 (lũy kế)** | Tổng từ tháng 9 tới tháng đang xem |
| **KPI đạt tháng** | Số mã đạt ≥ 100% trên tổng số mã, kèm số mã dưới 90% |

[[fig crm/kpi_tab | Tab KPI & Mục tiêu trong CRM: cùng bố cục, kèm bảng KPI tính từ dữ liệu CRM.]]

| Vai trò | Thấy KPI của |
|---|---|
| PIC | Chỉ mình |
| Team Leader | Cả nhóm |
| HOD | Cả phòng ban |
| Director | Toàn công ty |

:::note Cần đăng nhập bằng email
Tab KPI chỉ hiện khi đăng nhập bằng email công ty (Chương 1). Phạm vi xem do sheet 0. Staff List của file KPI và RH_Users quyết định.
:::

## Báo cáo KPI tháng và tự đánh giá quý

### Báo cáo KPI tháng (ngày 02 hằng tháng, trước 16:00)

[[fig crm/kpi_report | Khung soạn **Báo cáo KPI tháng**: người nhận tự điền, bảng KPI theo mẫu, xem trước rồi gửi.]]

1. Ngày 02, app hiện popup nhắc. Bấm **Mở báo cáo KPI** (hoặc vào tab KPI › **Báo cáo KPI tháng**).
2. Chọn tháng (mặc định tháng trước). App tự điền **To / CC** theo sơ đồ quản lý trong Staff List (Team Leader, HOD, Director).
3. Kiểm tra bảng *Performance Summary* (Type · KPI · trọng số · Target · Actual · % · % × trọng số · tổng); viết thêm phần nhận xét, kế hoạch.
4. Bấm **Xem trước**, rồi **Gửi**. Email chỉ gửi được tới email công ty; nhóm Thái nhận bản tiếng Anh.

### Tự đánh giá quý · Setting Expectation (ngày 09 tháng 9, 12, 3, 6, trước 17:00)

[[fig crm/kpi_se | **Setting Expectation**: KPI của quý được điền sẵn, người dùng viết phần tự đánh giá rồi tải file Word.]]

1. Popup nhắc hiện từ ngày 09 của tháng đầu quý. Bấm **Mở form tự đánh giá**.
2. KPI của quý trước được điền sẵn vào mẫu. Viết phần tự đánh giá, mục tiêu quý tới.
3. Bấm **Tải file Word** để lưu và nộp theo quy trình. Nhóm Thái dùng mẫu tiếng Anh.
4. Đã nộp: bấm **Đã nộp, không nhắc nữa**; chưa xong: bấm **Để sau**.

[[fig rh/kpi_reminder | Popup nhắc hạn KPI.]]

## Total KPI cho quản lý

Màn **Total KPI** tổng hợp KPI toàn công ty, chỉ mở được với **Admin, Director, HOD**. Có 3 tab và mục *Cách tính KPI*:

- **Tổng quan**: KPI công ty theo 4 góc nhìn F · C · P · L, mỗi góc có các mục tiêu và % đạt.
- **KPI công ty**: từng mã KPI cấp công ty, chọn Tháng / Lũy kế / Cả năm.
- **Thành viên**: bảng % đạt của từng người theo cả năm, quý, tháng, tô màu theo mức đạt.
- **Cách tính KPI**: trích từ sheet 4. Rule.

[[fig rh/total_kpi | Total KPI · tab Tổng quan (số liệu giả lập).]]

## Dành cho người quản lý file KPI

Trong file MMH KPI FY68 có menu **⚡ KPI Sync**:

| Mục menu | Dùng khi |
|---|---|
| 🔄 Cập nhật Manual (đọc tất cả backend) | Muốn cập nhật ngay; thanh tiến độ cho biết đang đọc file nào, ghi mã nào, bao nhiêu ô |
| 📋 Trạng thái nguồn dữ liệu | Xem mã nào đã có nguồn tự động, tháng nào đã có Actual (sheet KPI SYNC STATUS) |
| 🩺 Kiểm tra Realtime | Kiểm tra từng nguồn đã có trigger chưa, lần đồng bộ gần nhất |
| 📄 Báo cáo giải thích KPI (PDF) | Xuất PDF giải thích từng mã: nguồn (link tới đúng sheet), cách tính, Target, Actual, % đạt, diễn giải từ dữ liệu gốc |
| ✉ Soạn và gửi email KPI tháng | Gửi email KPI tháng cho nhiều người từ file KPI |
| 🔗 Link file MKT offline VN | Đổi file sự kiện mà KPI đọc |
| 🎯 Kiểm tra rule Target = 0 | Liệt kê người · mã · tháng có Target = 0 và sửa % nếu sai |
| 🗂 KPI EXPLAIN MAP | Xem / sửa nguồn, URL, cách tính từng mã (có cột sửa tay cho mã mới) |
| ⚙ Bật lại / ⏸ Tắt đồng bộ Realtime | Bật lại trigger sau khi dán code mới, hoặc tạm dừng |

:::warn Khi đổi cấu trúc file KPI
Đổi tên sheet, thêm / xoá cột tiêu đề tháng ("yyyymm Target / Actual") có thể làm máy không tìm thấy ô để ghi. Báo người quản trị hệ thống trước khi đổi cấu trúc.
:::
