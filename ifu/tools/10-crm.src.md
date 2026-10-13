---
number: 2
---
[[opener 2 | MMH CRM | Sổ tay số của đội Sales. Mọi việc hằng ngày của Sales (gặp khách, ghi kết quả, chụp ảnh địa bàn, đề xuất công tác, nhập đơn hàng, theo dõi khách hàng mới, báo cáo tuần / tháng, xem KPI) đều làm trên một ứng dụng, dữ liệu ghi thẳng vào file Google Sheet của nhóm. | crm/cal_week | Ai dùng CRM, mở ở đâu; Bố cục màn hình; Lịch làm việc và thêm việc; Đi địa bàn, báo kết quả, chụp ảnh; Công việc khác và công tác; Khách hàng, người liên hệ, ADP; Đơn hàng, thuyết trình, công việc trong tháng; Mở mới địa bàn & SKU mới; KPI & Mục tiêu, Dashboard; Họp tuần, gửi báo cáo, xem ảnh; Trên điện thoại; Dành cho quản lý và Admin; Dữ liệu và kết nối]]

## Ai dùng CRM, mở ở đâu

[[app crm]]

CRM có **bốn nhóm kinh doanh**, mỗi nhóm dùng **một file Google Sheet riêng** (khách hàng, người liên hệ, đơn hàng, ADP, báo cáo đều tách biệt):

| Nhóm | Ngôn ngữ giao diện | File dữ liệu (backend) | Ghi chú |
|---|---|---|---|
| **Dental** | Tiếng Việt | crm-dental | Nha khoa, MMG |
| **Surgical** | Tiếng Việt | crm-surgical | Nhãn khoa, ngoại khoa |
| **Eyeless** | Tiếng Việt | crm-eyeless | Kim liền chỉ; không bắt buộc kế hoạch tuần sau khi gửi báo cáo tuần |
| **Thailand Surgical** | **Tiếng Anh toàn bộ** | crm-thai | Không chụp ảnh đi địa bàn; công tác theo quy trình riêng |

| Vai trò | Thấy gì |
|---|---|
| **Sales (PIC)** | Lịch, khách hàng, đơn hàng, KPI **của mình** |
| **Team Leader** (chức danh có "Leader") | Cả nhóm của mình: chip **Cả đội** và chip từng PIC trên lịch |
| **Quản lý** (Admin, Director, HOD) | Đổi nhóm đang xem (Dental · Surgical · Eyeless · Thái), duyệt mở mới, duyệt công tác (Director) |

Đăng nhập bằng **email công ty + mã 6 số** như mọi app khác (Chương 1). Có phiên đăng nhập, CRM tự biết bạn là ai, thuộc nhóm nào và có quyền gì.

[[fig crm/login_email | Màn hình đăng nhập CRM.]]

## Bố cục màn hình

[[fig crm/cal_week | Màn hình chính của CRM trên máy tính: thanh trên cùng, menu bên trái, vùng làm việc ở giữa.]]

### Thanh trên cùng

| Nút | Chức năng |
|---|---|
| **MMH Calendar** | Mở lịch chung của công ty (công tác, đào tạo, sự kiện, bài đăng), giống Report Hub |
| **Tìm nhanh** [[key Ctrl+K]] | Tìm khách hàng, việc, người liên hệ |
| **Liên kết** | Mở nhanh các app khác: Thầu, Product Data, Doanh số, MMH Report Hub |
| **FY68** | Chọn năm tài chính đang xem |
| **?** | Hướng dẫn từng bước |
| Chuông · Tải lại | Bảng tin; đọc lại dữ liệu mới nhất từ Sheet |
| **Có gì mới** | Xem lại thông báo các bản cập nhật |
| Bảng màu · tên | Đổi màu giao diện; menu tài khoản |

[[fig crm/links | Menu **Liên kết**: mở các app khác của công ty.]]

### Menu bên trái

| Nhóm | Mục | Dùng để |
|---|---|---|
| **Tổng quan** | Dashboard | Số liệu tổng hợp FY / quý / tháng |
| | KPI & Mục tiêu | KPI cá nhân và của nhóm theo file KPI FY68 |
| **Dữ liệu** | Khách hàng | Danh sách account, hồ sơ 360° |
| | Key stakeholder | Người liên hệ (CBC) của các account |
| | **Cập nhật** | Lịch làm việc: đi địa bàn, việc khác, công tác (màn hình dùng nhiều nhất) |
| | Mở mới & SKU mới | Khách hàng / SKU mới chờ xác nhận để tính KPI |
| | Đơn hàng | Đơn hàng theo tháng, nhóm sản phẩm |
| | Thuyết trình | Buổi giới thiệu sản phẩm (product presentation) |
| | Công việc trong tháng | Kế hoạch và kết quả theo hạng mục tháng |
| | ADP Key account | Kế hoạch phát triển khách hàng trọng điểm |
| **Công cụ** | Họp tuần | Biên bản họp tuần của nhóm |
| | Xem ảnh đi địa bàn | Thư viện ảnh, thống kê, xuất PowerPoint / Excel |
| | Gửi báo cáo | Gửi báo cáo tuần / tháng / KPI qua email |

## Lịch làm việc và thêm việc

Mục **Cập nhật** là nơi Sales làm việc hằng ngày. Có ba tab: **Lịch công việc** · **Thông tin địa bàn** · **Công việc khác**.

### Đọc lịch tuần

1. **Ba ô tổng hợp** trên cùng: *Đi địa bàn* (số lượt, số đã hoàn thành, % hoàn thành), *Việc khác*, *Công tác* (số ngày đi công tác).
2. **Cột hôm nay** có viền xanh; khối *Sắp đến hạn* nằm đầu cột.
3. Mỗi thẻ có **nhãn loại**: ĐI ĐỊA BÀN (xanh lá) · VIỆC KHÁC (xanh dương) · CÔNG TÁC (tím) · ĐÀO TẠO (cam), tên account, loại hoạt động, tỉnh và trạng thái (*Not started · In Progress · Completed*).
4. Bấm vào thẻ để mở chi tiết, sửa hoặc báo kết quả.

### Đổi kiểu xem và lọc

| Điều khiển | Tác dụng |
|---|---|
| **Hôm nay · Tuần · Tháng · Danh sách** | Đổi kiểu xem; mũi tên ‹ › để lùi / tiến |
| Chip **Đi địa bàn · Việc khác · Công tác · Đào tạo** | Bật / tắt từng loại việc |
| **Ẩn việc đã xong** · **Đang thực hiện** · **x việc quá hạn** | Lọc nhanh theo trạng thái |
| Chip **Cả đội** / tên PIC | (Team Leader) xem cả nhóm hoặc từng người |
| **Công tác người khác: Đang ẩn** | Quản lý bật để xem chuyến công tác của người khác |
| **Ẩn bộ lọc · Toàn màn hình** | Mở rộng vùng lịch |

[[fig crm/cal_month, crm/cal_list | Lịch tháng (trái) và kiểu Danh sách theo ngày (phải).]]

[[fig crm/cal_filters | Bộ lọc: chip loại việc, trạng thái, chọn cả đội hoặc từng PIC.]]

### Thêm việc

Bấm **+ Thêm việc** (hoặc nút **＋** tròn góc phải dưới, hoặc bấm vào một ngày trên lịch). Chọn một trong ba loại:

| Loại | Ghi vào đâu | Khi nào dùng |
|---|---|---|
| **Đi địa bàn** | Tab *6. WEEKLY REPORT* của file CRM nhóm | Viếng thăm khách hàng, gặp bác sĩ, demo |
| **Công việc khác** | Sheet *ALL TASK* của file CRM nhóm | Họp, hỗ trợ NPP, hồ sơ thầu, sự kiện… |
| **Đề xuất công tác** | File Business Trip + email xin duyệt gửi Giám đốc | Chuyến đi xa cần duyệt chi phí |

[[fig crm/add_menu | Khung **Thêm việc**: ba loại việc.]]

## Đi địa bàn, báo kết quả, chụp ảnh

### Tạo lượt đi địa bàn

[[fig crm/fieldvisit_form | Khung **Thêm task đi địa bàn**.]]

1. **Account**: bấm để xem danh sách, gõ để lọc; khách chưa có thì bấm **+ Địa bàn mới**.
2. Chọn **Ngày**, **Sales PIC**, **Type task**, **Type action** (ví dụ *Visiting*), **Sales Process**, **Product group**.
3. Ghi **Plan**: dự định làm gì (không bắt buộc).
4. Bấm **Lưu vào Google Sheet**. Thẻ hiện ngay trên lịch; dữ liệu gửi lên Sheet ở phía sau.

### Báo kết quả

[[fig crm/fieldvisit_result | Khung báo kết quả: Plan, Task Result có mẫu 4 mục, trạng thái, bước tiếp theo, ảnh đi địa bàn.]]

1. Bấm vào thẻ đi địa bàn (điện thoại: nút **Báo kết quả** ngay trên thẻ).
2. Trong **TASK RESULT**, bấm **CBC: người gặp** để chọn người đã gặp. Dòng *"Người gặp: …"* là bắt buộc.
3. Bấm **Chèn khung 4 mục** để có sẵn mẫu: *1. Actions Taken · 2. Current Situation · 3. Customer Feedback · 4. Opportunities / Next Steps*. Có thể bấm **Lấy từ Plan** để chép kế hoạch, hoặc **Nói** để đọc thay vì gõ.
4. Chọn **Task Status** (*Completed* khi đã xong), **Next action**, **Customer feedback**, **Sales Process**.
5. Bấm **Cập nhật vào Sheet**.

:::note Ảnh đi địa bàn
Với nhóm Dental, Surgical, Eyeless, lượt *Visiting* cần **ảnh chụp ngay tại địa bàn**: bấm **Mở camera chụp ảnh** (điện thoại mở camera sau). App thu nhỏ ảnh trước khi gửi và ghi kèm thời điểm, toạ độ nếu máy cho phép. Ảnh lưu ở thư mục Drive của nhóm theo tháng. Nhóm Thailand Surgical không chụp ảnh.
:::

:::tip Hồ sơ 360°
Từ khung kết quả, bấm **Hồ sơ 360°** để xem toàn bộ lịch sử làm việc với account đó trước khi ghi.
:::

## Công việc khác và công tác

### Công việc khác

Tab **Công việc khác** liệt kê key task / sub task không phải đi địa bàn (họp, hồ sơ thầu, báo cáo…), ghi ở sheet **ALL TASK** của file CRM nhóm. Có thanh trượt **Tiến độ**, nút **+ Thêm kết quả**, cột *Deadline* và *Trạng thái*; lọc theo Ngày / Tuần / Tháng / Quý / CẢ FY, theo trạng thái và PIC.

[[fig crm/other_task | Tab **Công việc khác**: ô tổng hợp key task, đầu việc con, đã hoàn thành, quá hạn; bảng tiến độ từng việc.]]

### Đề xuất công tác

[[fig crm/trip_propose | Khung **Đề xuất công tác**.]]

1. Bấm **Đề xuất công tác** trên thanh lịch (hoặc **+ Thêm việc** › Đề xuất công tác).
2. Điền **Start date / Finish date**, **Destination** (chọn nhiều tỉnh), **Co-traveler**, **Purpose**, **Expected result**.
3. **Estimated costs**: mỗi dòng một khoản (mô tả, số tiền, đơn vị); app tự cộng *Tổng dự trù*.
4. **Schedule**: lịch trình từng ngày. Bấm **Gửi đề xuất**.
5. Hệ thống ghi vào file **Business Trip** (trạng thái chờ duyệt) và gửi email *Business Trip Approval Request* tới Giám đốc. Chuyến đi hiện trên lịch với nhãn CÔNG TÁC.

[[fig crm/trip_card, crm/trip_report | Thẻ công tác trên lịch (trái) và khung **Chuyến công tác** sau khi được duyệt, có phần **Báo cáo công tác** (phải).]]

Sau chuyến đi, mở thẻ công tác › điền **Key Activities**, **Key Findings** và các mục còn lại (có nút **Nói**) › **Lưu báo cáo**. Nút **Mở file Business Trip** dẫn tới file gốc; **Mở folder chuyến đi** để tải chứng từ.

:::note Hạn chứng từ
Popup **Nhắc hạn chứng từ kế toán** hiện vào ngày 14, 15, 28, 29 và đúng ngày hạn: nộp Phiếu công tác & Bảng kê mua hàng, điền thông tin *After purchase*, đính kèm chứng từ. Quá hạn bị trừ điểm hành vi (KBI).
:::

[[fig crm/deadline_popup | Popup nhắc hạn nộp chứng từ kế toán, gồm hai đợt trong tháng và mức trừ điểm hành vi.]]

## Khách hàng, người liên hệ, ADP

### Danh sách khách hàng

[[fig crm/cust_list | Mục **Khách hàng**: tìm kiếm, bộ lọc, bảng account với tiến độ Target → Achieve FY68.]]

- **Tìm** theo tên, mã, tỉnh, PIC (gõ nhiều từ để lọc đúng hơn). Lọc **Mọi loại KH · Mọi khu vực · Mọi nhóm ADP**; chip **Chưa gặp trong FY68 · Đã gặp · Sắp theo doanh số**; chip PIC.
- Mỗi dòng: mã account, tên, phân loại (Hospital, Clinic, Dealer…), nhãn ADP (A, B, C), tỉnh, PIC, **thanh Target → Achieve FY68**, số hoạt động và lần gặp gần nhất, số CBC, số đơn.
- **+ Account mới** để thêm khách hàng; **Người liên hệ / khách Event** để xem khách đến từ sự kiện.

### Hồ sơ 360° của một account

[[fig crm/cust_profile | **Hồ sơ 360°**: tổng quan, biểu đồ lượt gặp 12 tháng, người liên hệ chính, thông tin account và dòng thời gian hoạt động.]]

| Vùng | Nội dung |
|---|---|
| Thanh trên | Nhãn (PIC, khu vực, mở FY), *Gặp gần nhất*; nút **Thêm CBC · Thêm ADP · Ghi hoạt động · Sửa hồ sơ** |
| Tổng quan | Doanh số, số lượt gặp, số buổi thuyết trình, số ngày kể từ lần gặp gần nhất, số người liên hệ |
| Tab | **Dòng thời gian** (mọi lượt đi địa bàn, thuyết trình, kết quả) · **Ảnh** · **Người liên hệ** · **Đơn hàng** · **Thông tin** · **ADP** |

### Key stakeholder (người liên hệ · CBC)

[[fig crm/stakeholder | Mục **Key stakeholder**: tổng CBC, đã tiếp xúc, chưa chăm sóc, doanh số account liên quan.]]

Danh sách người liên hệ (bác sĩ, trưởng khoa, nhân viên vật tư…) của các account, kèm chức vụ, mức ảnh hưởng (*Influence*) và tin cậy (*Trust*), số lần đã làm việc. Lọc nhanh **Chưa chăm sóc · Nhiều lần làm việc · Doanh số cao nhất**; tab **Khách hàng Event** cho người đến từ sự kiện. Bấm **+ Thêm CBC** để thêm.

### ADP Key account

[[fig crm/adp | **ADP: Key Account FY68**: account trọng điểm chia theo nhóm chiến lược, mỗi thẻ có Target, Actual, lần gặp gần nhất.]]

Account trọng điểm được chia nhóm: **A: Further Increase SoW** (tăng thị phần) · **B: Open New Doors** (mở cửa mới) · **C: Maintain Existing** (duy trì). Mỗi thẻ hiện mục tiêu, Actual, thanh tiến độ, lần gặp gần nhất; app **cảnh báo đỏ** khi Actual lớn bất thường so với Target (gợi ý kiểm tra đơn vị). Xem dạng **Bảng ABCD** hoặc **Danh sách lớn**; **+ Thêm ADP**.

## Đơn hàng, thuyết trình, công việc trong tháng

### Đơn hàng

[[fig crm/orders | Mục **Đơn hàng FY68**: tổng theo nhóm sản phẩm, lọc theo PIC và tháng, mỗi thẻ là một đơn.]]

- Ô tổng hợp theo nhóm sản phẩm (Bond, Jizai, Suture, Hand files, Dia-burs, Composite…), tổng giá trị FY.
- Mỗi đơn: ngày, số đơn, account, người liên hệ, NPP, PIC, sản phẩm, số lượng, giá trị.
- **+ Đơn hàng mới** để nhập; xem dạng **Thẻ** hoặc **Bảng**.

:::rule Đơn hàng tính vào KPI
Đơn hàng ở tab *3. SALE ORDER* là nguồn tính KPI **C5** (tổng tiền ÷ tỷ giá tháng), **C6** (số lượng Composite) và **C7** (số lượng JIZAI) qua NPP phụ trách của Sales đó. Mỗi lần lưu có mã chống trùng: mạng chậm, bấm lại cũng không ghi đơn hai lần.
:::

### Thuyết trình (Product Presentation)

[[fig crm/presentation | Mục **Thuyết trình**: mỗi buổi có account, ngày, số người tham dự / mục tiêu, folder tài liệu.]]

Ghi lại các buổi giới thiệu sản phẩm tại khách hàng: số người tham dự so với mục tiêu, nhận xét, link folder ảnh / tài liệu. Dữ liệu ở tab *7. PRODUCT PRESENTATION*, tính vào KPI giới thiệu sản phẩm.

### Công việc trong tháng

[[fig crm/monthly_tasks, crm/monthly_drawer | **Công việc trong tháng**: từng hạng mục có PLAN và RESULT (trái); khung sửa một hạng mục (phải).]]

1. Đầu tháng: bấm **Tạo đủ khung tháng này** hoặc **Lấy kế hoạch tháng trước**.
2. Mở từng hạng mục (Sale-Hospital, Sale-Distributor, Sale-Clinics…), điền **PLAN: kế hoạch**; cuối tháng điền **RESULT: kết quả**. Có **Chèn khung** và **Nói**.
3. Bấm **Lưu vào Sheet** (tab *5. MONTHLY REPORT*). Tab **So sánh** để so giữa các tháng.

:::note Không mất chữ khi đóng khung
Từ CRM v31.4, khung lưu đúng từng ô đã thay đổi (kể cả nội dung đọc bằng **Nói**). Đóng khung khi còn nội dung chưa lưu thì app hỏi **Lưu / Bỏ**.
:::

## Mở mới địa bàn & SKU mới

Theo dõi **khách hàng mới** (đơn MANI đầu tiên của account qua NPP trong FY) và **SKU mới** (account đặt một mã sản phẩm lần đầu). Ca được quản lý **xác nhận** mới tính vào KPI **C1**.

[[fig crm/newacc_list | Danh sách ca: tab trạng thái, chọn nhóm và kỳ, mỗi dòng có trạng thái *Chờ quản lý xác nhận · Cần bổ sung · Đã xác nhận*.]]

### Sales tạo ca

[[fig crm/newacc_form | Khung **Thêm case mở mới địa bàn / SKU mới**.]]

1. Bấm **+ Thêm case**. Chọn **Loại case**: *Đại lý / khách hàng mới* hoặc *SKU mới*.
2. Chọn **PIC**, **Account** và **Nhà phân phối**.
3. Nhập **Đơn hàng đầu tiên qua NPP**: ngày đơn, số đơn / PO, tháng tính KPI, SKU; hoặc bấm **Chọn từ đơn hàng có sẵn**.
4. Tải **chứng từ** (bằng chứng xác nhận của NPP…).
5. Bấm **Lưu & gửi email xin xác nhận** (hoặc **Lưu nháp**). Email gửi quản lý, kèm file.

### Quản lý duyệt

[[fig crm/newacc_review | Khung duyệt: thông tin ca, bằng chứng cỡ lớn, bảng **Điều kiện tính KPI**, ô nhận xét và ba nút quyết định.]]

App tự đối chiếu **4 điều kiện tính KPI**: có trong báo cáo tuần · NPP xác nhận · thông tin khách hàng / SKU đúng mẫu · có đơn hàng đầu tiên qua NPP. Quản lý chọn:

| Nút | Kết quả |
|---|---|
| **Xác nhận** | Ca được tính KPI tháng phát sinh đầu tiên (tối đa 130%); email báo PIC, Director, kế toán |
| **Trả lại bổ sung** | Ca về *Nháp*, giữ chứng từ, hiện nhãn *Cần bổ sung* kèm nhận xét để Sales sửa |
| **Từ chối** | Bắt buộc ghi lý do; chứng từ bị xoá |

## KPI & Mục tiêu, Dashboard

### KPI & Mục tiêu

[[fig crm/kpi_personal | KPI cá nhân trong CRM: KPI tháng, quý, năm, xu hướng theo tháng, đóng góp theo nhóm và bảng chi tiết từng mã.]]

Mục **KPI & Mục tiêu** dùng chung module KPI với Report Hub (Chương 4): Target lấy từ file MMH KPI FY68, Actual do file CRM tự tính (tab *9. TARGET & KPI*) và tự đẩy sang file KPI. Phần dưới có **bảng KPI tính từ CRM** (Phần A: tổng nhóm, Phần B: từng PIC) và **Doanh số nhà phân phối**.

[[fig crm/kpi_tab | Phần KPI tính từ CRM: tổng nhóm Dental (doanh số NPP, mở mới, viếng thăm, Composite hỗ trợ bán) và doanh số nhà phân phối.]]

| Nút | Tác dụng |
|---|---|
| **Theo quý · Theo tháng** | Đổi kỳ |
| **Tính ngay từ đơn hàng trên app** | Tính lại C5 / C6 / C7 từ đơn hàng mới nhập |
| **Đồng bộ file KPI FY68** | Đẩy số lên file KPI ngay |
| **Tỷ giá** | Nhập tỷ giá VND/USD theo tháng để tính C5 |

[[fig crm/kpi_report, crm/kpi_se | **Báo cáo KPI tháng** (trái) và **Setting Expectation & tự đánh giá quý** (phải). Cách dùng xem Chương 4.]]

### Dashboard

[[fig crm/dashboard | **Dashboard · Tổng quan FY68**: chọn CẢ FY, quý hoặc tháng; ô chỉ số và biểu đồ doanh số, viếng thăm & đơn hàng.]]

Tab **Tổng quan · Khách hàng · Đi địa bàn · Kinh doanh · ADP Key account**. Ô chỉ số: giá trị đơn hàng, số đơn, lượt viếng thăm, account / SKU mở mới đã duyệt, độ phủ account, số người liên hệ, key account, việc quá hạn. Nút **Đồng bộ với Sheet** đọc lại dữ liệu.

## Họp tuần, gửi báo cáo, xem ảnh

### Họp tuần

[[fig crm/weekly_meeting | **Họp tuần**: chọn tuần, từng PIC, bốn phần biên bản; số liệu forecast tự lấy từ file Turnover.]]

Biên bản họp tuần của nhóm theo từng PIC, bốn phần: **Forecast NPP** (số liệu tự động từ SUM TURNOVER, đánh giá forecast) · **Quan hệ KH & phát triển thị trường** · **Tình hình thầu** (gói thầu, giá theo mã sản phẩm từng địa bàn) · **Thông tin khác**. Mỗi phần có *Positive factors · Negative factors · Follow up Action*. Nút **Lịch sử**, **Email tuần**, **Lưu biên bản**.

### Gửi báo cáo

[[fig crm/send_report | **Gửi báo cáo**: chọn kỳ, PIC, xem trước rồi gửi.]]

1. Chọn **Báo cáo tuần**, **Báo cáo tháng** hoặc **Báo cáo KPI**.
2. Chọn kỳ (từ ngày, đến ngày) và PIC.
3. Xem **bản xem trước**: đúng nội dung email sẽ gửi (đi địa bàn, kết quả, công việc khác, kế hoạch tuần sau).
4. Bấm **Gửi thử cho tôi**, **Gửi chính thức tới team**, **Gửi cho toàn bộ team**, hoặc **Tải PDF**. PDF báo cáo tuần được lưu vào thư mục Drive chung theo nhóm.

### Xem ảnh đi địa bàn

[[fig crm/photo | **Xem ảnh đi địa bàn**: ô thống kê, bảng số ảnh theo PIC × tháng, lưới ảnh có tên account, PIC, thời gian.]]

Thống kê ảnh trong kỳ, số địa bàn đã chụp, tỉ lệ ảnh có toạ độ GPS, số Sales có ảnh. Nút **Tạo PowerPoint** (ảnh theo account), **Tải Excel thống kê**.

## Trên điện thoại

Trên điện thoại, thanh dưới có 5 nút cố định: **Lịch · Khách hàng · Hôm nay · Mở mới · Thêm**. Nút **＋** tròn nổi ở góc phải để ghi nhanh.

[[phones crm/m_today, crm/m_cal, crm/m_add | Mục **Hôm nay** (việc hôm nay, quá hạn, sắp đến hạn), lịch tuần, khung thêm việc.]]

[[phones crm/m_result, crm/m_cust, crm/m_more | Báo kết quả ngay sau buổi gặp, danh sách khách hàng dạng thẻ, bảng **Thêm** với mọi chức năng.]]

1. Mở **Hôm nay** để thấy các lượt đi địa bàn trong ngày.
2. Trên thẻ: bấm **Chụp ảnh** (mở camera) rồi **Báo kết quả** (trạng thái chọn sẵn *Completed*).
3. Thẻ công tác có nút **Báo cáo công tác**.
4. Bảng **Thêm**: Dashboard, KPI & Mục tiêu, CBC, Đơn hàng, Thuyết trình, CV tháng, ADP, Họp tuần, Ảnh, Mail; Tiện ích (Bảng tin, Tải lại, Màu, Hướng dẫn, Có gì mới); Năm tài chính; Webapp khác.

## Dành cho quản lý và Admin

### Đổi nhóm đang xem

[[fig crm/team_switch | **Chọn nhóm kinh doanh**: mỗi nhóm một file dữ liệu riêng, đổi nhóm thì app tải lại.]]

### Duyệt đề xuất công tác (Giám đốc)

[[fig crm/trip_approve | **Duyệt đề xuất công tác**: mỗi chuyến có mục đích, kết quả mong đợi, chi phí dự trù, lịch trình; chọn nhiều chuyến để duyệt một lần.]]

Nút **Duyệt công tác** (kèm số chuyến chờ) chỉ hiện với Giám đốc. Tick chuyến cần duyệt, ghi chú (bắt buộc khi từ chối), bấm **Duyệt** hoặc **Từ chối**. Mỗi chuyến được gửi **một email phê duyệt riêng** tới người đề xuất; nhật ký lưu ở tab *Business Trip Log* của file CRM nhóm.

### Chế độ thử (Admin)

[[fig crm/test_mode | **Chế độ thử**: Admin chọn một Sales để dùng CRM như người đó, không ghi vào dữ liệu thật.]]

Mọi lệnh ghi bị chặn trên máy và trả kết quả giả; báo cáo tuần / tháng gửi thật nhưng **chỉ tới email Admin**. Dùng để kiểm tra trước khi hướng dẫn Sales.

### Hướng dẫn, thông báo, màu giao diện

[[fig crm/tour_catalog, crm/whats_new | Danh mục **Hướng dẫn sử dụng** từng bước (trái) và thông báo **Có gì mới** (phải).]]

[[fig crm/theme | Bảng **màu giao diện**: 10 tông màu.]]

### Nhóm Thailand Surgical (tiếng Anh)

[[fig crm/thai_cal, crm/thai_kpi | Giao diện nhóm Thailand Surgical: lịch tuần và KPI & Targets bằng tiếng Anh.]]

Toàn bộ giao diện, email KPI, mẫu Setting Expectation và gợi ý chi phí công tác đều bằng tiếng Anh. Thông báo cập nhật của CRM cũng viết bằng tiếng Anh.

## Dữ liệu và kết nối

### Các tab trong file CRM của mỗi nhóm

| Tab | Nội dung | Màn hình trên app |
|---|---|---|
| 1. CUSTOMER CODE | Account: mã, tên, loại, tỉnh, khu vực, PIC, ngày mở | Khách hàng |
| 2. CBC | Người liên hệ: chức vụ, chuyên khoa, vai trò, ảnh hưởng, tin cậy | Key stakeholder |
| 3. SALE ORDER | Đơn hàng: tháng, ngày, số đơn, sản phẩm, số lượng, giá, NPP | Đơn hàng |
| 4. MASTER NAME NPP | Danh mục nhà phân phối | (danh mục chọn) |
| 5. MONTHLY REPORT | Kế hoạch / kết quả hạng mục tháng | Công việc trong tháng |
| 6. WEEKLY REPORT | Lượt đi địa bàn: account, loại, kế hoạch, kết quả, trạng thái, ảnh, GPS | Cập nhật · Lịch |
| 7. PRODUCT PRESENTATION | Buổi thuyết trình | Thuyết trình |
| 8. ADP | Key account | ADP Key account |
| 9. TARGET & KPI | KPI tính từ CRM, Target kéo từ file KPI | KPI & Mục tiêu |
| 14. TENDER TRACK · 15. TENDER PRICE LOG | Gói thầu, lịch sử giá theo mã sản phẩm | Họp tuần · Thầu |
| 16. NEW ACCOUNT & SKU | Ca mở mới / SKU mới | Mở mới & SKU mới |
| ALL TASK | Công việc khác của Sales | Công việc khác |
| Business Trip Log | Nhật ký đề xuất / duyệt công tác | Duyệt công tác |

### Kết nối với hệ thống khác

<div class="flow"><div><b>Sales ghi trên CRM</b>Đi địa bàn, đơn hàng, mở mới, công tác</div><div><b>File CRM nhóm</b>Tab 1 → 16, ALL TASK</div><div><b>File Business Trip</b>Đề xuất, duyệt, báo cáo công tác</div><div><b>File KPI FY68</b>C1, C3, C5, C6, C7… tự cập nhật</div></div>

- **Đơn hàng, đi địa bàn, mở mới, thuyết trình** ⇒ tab 9 tính lại ⇒ đẩy ngay lên file KPI (Chương 4).
- **Đề xuất công tác** ⇒ file Business Trip ⇒ hiện trên MMH Calendar của Report Hub.
- **Doanh số NPP / forecast** đọc từ file Turnover Report (kế toán).
- **Khách đến từ sự kiện** đồng bộ từ file Data khách hàng (backend cust-data).
- **Đăng nhập, phân quyền** qua Training Hub.

[[backend crm-dental]]
[[backend crm-surgical]]
[[backend crm-eyeless]]
[[backend crm-thai]]
[[backend cust-data]]
[[backend turnover]]

### Lịch sử cập nhật gần đây

[[changelog crm 6]]
