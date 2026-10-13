---
number: 6
---
[[opener 6 | Kiểm thử hệ thống · Chế độ TEST | Admin dùng CRM và Report Hub như một người dùng tên TEST để thử mọi chức năng: chụp ảnh, đề xuất công tác rồi đóng vai Giám đốc duyệt, báo cáo tuần / tháng / KPI, mở mới rồi đóng vai Quản lý xác nhận. Dữ liệu được lưu thật vào file thật; app vẽ ngay luồng đi của dữ liệu: lưu vào file nào, tab nào, dòng nào, email lẽ ra gửi tới ai. | crm/test_steps | Ba nguyên tắc; Bật chế độ TEST; Bảng Luồng dữ liệu; Kịch bản kiểm thử CRM; Kịch bản kiểm thử Report Hub; Đóng vai Giám đốc và Quản lý; Xoá dữ liệu test; Training Hub; Phần kỹ thuật]]

## Ba nguyên tắc

<div class="flow"><div><b>1 · Ghi thật, tên TEST</b>Mọi thao tác lưu thật vào file Google Sheet / Drive đang dùng. Người dùng, PIC, tên file bắt đầu bằng <b>TEST</b> (ảnh: <i>TEST_20261007_TEST Nha khoa Minh Tam_01.jpg</i>).</div><div><b>2 · Email chỉ về Admin</b>Mọi email phát sinh (báo cáo, xin duyệt, phê duyệt, KPI…) chỉ gửi tới email của Admin, tiêu đề có <b>[TEST]</b>, đầu thư ghi người nhận của bản thật.</div><div><b>3 · Không ai khác thấy</b>Dữ liệu TEST bị ẩn với mọi người (trừ Admin đang ở chế độ TEST), không vào báo cáo của người thật, <b>không tính KPI</b>.</div></div>

:::rule Chỉ Admin, chỉ hồ sơ TEST
Chỉ tài khoản có quyền **Admin** (RH_Users ▸ Admin) bật được chế độ TEST; máy chủ kiểm lại chữ ký phiên đăng nhập ở mọi lệnh. Khi đóng vai **Giám đốc** hay **Quản lý**, Admin chỉ duyệt được hồ sơ của TEST; hồ sơ thật vẫn cần Giám đốc / quản lý thật.
:::

## Bật chế độ TEST

| App | Lối vào | Chọn |
|---|---|---|
| **MMH CRM** | Nút **Chế độ TEST** trên thanh trên cùng · điện thoại: **Thêm ▸ Tiện ích ▸ Chế độ TEST** | Nhóm (file CRM nhận dữ liệu): Dental · Surgical · Eyeless · Thailand Surgical; vai: Sales TEST · Quản lý (Team Leader) · Giám đốc |
| **MMH Report Hub** | Bấm **tên của bạn** ▸ **Chế độ TEST · luồng dữ liệu** · hoặc Ctrl + K gõ "test" | Phòng (file công việc nhận dữ liệu): Sales & Marketing · Back Office; vai: Nhân viên TEST · Quản lý · Giám đốc |

[[fig crm/test_pick, crm/m_test_pick | Hộp chọn Chế độ TEST trên CRM: máy tính (trái) và điện thoại (phải).]]

1. Mở hộp chọn, chọn nhóm / phòng và vai.
2. Bấm **Bắt đầu chế độ TEST**. App tải lại và chạy như người dùng **TEST**: một dải vàng đen chạy trên đỉnh màn hình, tiêu đề tab trình duyệt có "[TEST]", nút vàng **TEST · tên vai** ở góc trái dưới.
3. Thao tác như bình thường. Mỗi lần lưu hiện một thông báo nhỏ "✓ … ▸ file ▸ dòng …"; bấm vào để mở bảng **Luồng dữ liệu**.
4. Xong việc: **Xoá dữ liệu test** rồi **Thoát chế độ TEST** để về tài khoản của mình.

[[fig rh/test_pick, rh/m_test_pick | Hộp chọn Chế độ TEST trên Report Hub: máy tính và điện thoại.]]

:::tip Chế độ thử cũ vẫn còn
Trên CRM, cuối hộp chọn có **Xem như một bạn sales (không lưu)**: dùng CRM như một bạn sales cụ thể để xem đúng dữ liệu của bạn đó; mọi lệnh ghi bị chặn trên máy, không lưu gì.
:::

## Bảng Luồng dữ liệu

Bấm nút vàng **TEST** (góc trái dưới). Bảng gồm 3 phần: **Đang dùng như** (đổi vai, đổi nhóm, nút Xoá dữ liệu test / Thoát), **Kịch bản test** (tự đánh dấu ✓ chức năng đã thử thành công) và **Luồng dữ liệu** (mỗi lần lưu một thẻ, mới nhất ở trên).

[[fig crm/test_flow, crm/m_test_flow | Bảng Luồng dữ liệu của CRM: máy tính (trái) và điện thoại (phải). Thẻ trên cùng: gửi báo cáo KPI tháng — không ghi Sheet, email lẽ ra gửi người được báo cáo + quản lý, nay chỉ về Admin.]]

| Ô trên thẻ | Cho biết |
|---|---|
| **① Thao tác** | App, tên thao tác bằng tiếng Việt, vai đang dùng; nếu người nhận việc bị đổi thành TEST thì ghi rõ "Người nhận X → TEST" |
| **② Backend** | Backend Apps Script nhận lệnh (vd. *CRM Dental*, *Report Hub – Marketing*, *MMH KPI FY68*), tên lệnh, thời gian chạy |
| **③ Lưu ở** | Tên file Google Sheet (bấm để mở) ▸ tab ▸ **dòng** vừa ghi, mã hồ sơ, file ảnh / PDF trên Drive; lệnh chỉ gửi email thì ghi "Không ghi Sheet" |
| **④ Tiếp theo** | Email lẽ ra gửi tới ai (To · CC) và tiêu đề — đã chỉ gửi về Admin; dữ liệu đi tiếp tới đâu (lịch, báo cáo tuần, KPI…) |

Dưới thẻ là các ô chính đã gửi (account, trạng thái, ngày…) và câu trả lời của máy chủ. Nhật ký lưu trên máy (150 thẻ gần nhất), dùng chung cho CRM và Report Hub nên thấy được cả luồng đi qua hai app.

[[fig rh/test_flow, rh/m_test_flow | Bảng Luồng dữ liệu của Report Hub: Key task giao cho "Vinh" đã tự đổi người nhận thành TEST; đề xuất công tác ghi vào file Business Trip, email xin duyệt lẽ ra gửi Giám đốc.]]

## Kịch bản kiểm thử CRM

| # | Thử chức năng | Thao tác (vai Sales TEST, trừ khi ghi khác) | Dữ liệu được lưu ở | Kiểm tra |
|---|---|---|---|---|
| 1 | Đi địa bàn | Lịch ▸ **+** ▸ Thêm task đi địa bàn (account đặt tên "TEST …") | File CRM nhóm ▸ **6. WEEKLY REPORT** ▸ dòng mới | Thẻ trên lịch; thẻ luồng ghi số dòng |
| 2 | Chụp ảnh | Thẻ đi địa bàn ▸ **Chụp ảnh** | Drive ▸ folder ảnh, tên **TEST_ngày_account_01.jpg**; link vào cột Photo của dòng | Mở link ảnh trong thẻ luồng |
| 3 | Khách hàng | Khách hàng ▸ thêm account "TEST …" | **1. CUSTOMER** (+ **2. CBC**) | Hồ sơ 360° |
| 4 | Đơn hàng (Dental) | Đơn hàng ▸ **+ Đơn hàng mới** | **3. SALE ORDER** | KPI bán hàng hỗ trợ **không** cộng (TEST không có dòng KPI) |
| 5 | Đề xuất công tác | Lịch ▸ **Đề xuất công tác** | File **Business Trip** ▸ MMH Travel report (PIC = TEST) + tab **Business Trip Log** của file CRM | Email "Approval Business trip" về Admin |
| 6 | Duyệt công tác | Đổi vai **Giám đốc** ▸ **Duyệt công tác** ▸ chọn đề xuất nhãn TEST ▸ Duyệt | Cột Approval + folder công tác trên Drive | Email "[Approved]" về Admin; thẻ công tác trên lịch đổi trạng thái |
| 7 | Báo cáo tuần | **Gửi báo cáo** ▸ Báo cáo tuần ▸ Gửi chính thức | PDF vào folder báo cáo tuần trên Drive | Email báo cáo tuần về Admin (đầu thư ghi nhóm nhận thật) |
| 8 | Báo cáo tháng | Gửi báo cáo ▸ Báo cáo tháng | PDF báo cáo tháng | Email về Admin |
| 9 | Báo cáo KPI tháng | KPI & Mục tiêu ▸ **Báo cáo KPI tháng** ▸ chọn một người (TEST không có KPI) ▸ Gửi | Không ghi Sheet — đọc file MMH KPI FY68 | Email KPI về Admin |
| 10 | Tự đánh giá quý | KPI & Mục tiêu ▸ **Setting Expectation** ▸ Tải file Word | File Word trên máy (không gửi backend) | Thẻ luồng "Tự đánh giá quý" |
| 11 | Mở mới & SKU mới | Mở mới & SKU mới ▸ **+ Thêm case** ▸ tải chứng từ ▸ Gửi xin xác nhận | **16. NEW ACCOUNT & SKU**; chứng từ Drive tên **TEST_…** | Email xin xác nhận về Admin |
| 12 | Xác nhận mở mới | Đổi vai **Quản lý** ▸ Mở mới ▸ tab Cần tôi duyệt ▸ Xác nhận / Trả lại / Từ chối | Trạng thái + người duyệt "TEST (vai Quản lý)" | Email kết quả về Admin; KPI mở mới không cộng |
| 13 | Công việc khác | Lịch ▸ Công việc khác ▸ **+ Key Task** | File CRM nhóm ▸ **ALL TASK** | Thẻ trên tab Công việc khác |

## Kịch bản kiểm thử Report Hub

| # | Thử chức năng | Thao tác | Dữ liệu được lưu ở | Kiểm tra |
|---|---|---|---|---|
| 1 | Key task / Sub-task | Lịch làm việc ▸ **+ Thêm việc** | File công việc của phòng ▸ tab theo dõi tuần | Giao cho người khác ⇒ người nhận tự đổi thành TEST |
| 2 | Tiến độ, kết quả | Bấm thẻ ▸ đổi %, trạng thái, kết quả | Cột Progress / Status / Result | Thẻ luồng ghi số dòng |
| 3 | Đề xuất công tác | **Đề xuất công tác** | File Business Trip ▸ MMH Travel report | Email xin duyệt về Admin |
| 4 | Duyệt công tác | Đổi vai **Giám đốc** ▸ **Duyệt công tác** | Cột Approval, folder công tác | Email phê duyệt về Admin |
| 5 | Báo cáo công tác | MMH Calendar ▸ chuyến công tác ▸ **Báo cáo công tác** | File Business Trip ▸ cột Report | — |
| 6 | Báo cáo tuần / tháng | **Gửi báo cáo ▾** | Email + PDF | Email về Admin |
| 7 | Báo cáo KPI tháng · Tự đánh giá quý | KPI ▸ Báo cáo KPI tháng · Setting Expectation | Không ghi Sheet / file Word | Email KPI về Admin |
| 8 | Giao việc | Đổi vai **Quản lý** ▸ thêm việc cho người khác / gửi email giao việc | Training Master ▸ **RH_Assign** (người nhận = TEST) | Popup "Việc mới được giao" cho TEST |
| 9 | Biên bản họp | Biên bản họp ▸ Lưu / Gửi | Tab biên bản họp | Email về Admin |

## Đóng vai Giám đốc và Quản lý

[[fig crm/test_tfa, rh/m_test_tfa | Vai Giám đốc trong chế độ TEST: ô ghi chú vàng nhắc chỉ duyệt được đề xuất của TEST; đề xuất thật bị khoá ô chọn. Máy tính (CRM) và điện thoại (Report Hub).]]

- **Giám đốc**: nút **Duyệt công tác** hiện danh sách chờ duyệt của mọi người; chỉ thẻ có nhãn **TEST** chọn được. Duyệt xong, email phê duyệt (đúng mẫu hệ thống Business Trip) về Admin; nhật ký ghi người duyệt là *TEST (vai Giám đốc)*.
- **Quản lý**: trong **Mở mới & SKU mới**, các case của TEST hiện nút Xác nhận · Trả lại bổ sung · Từ chối. Case thật không duyệt được.
- Đổi vai ngay trong bảng Luồng dữ liệu (ô **Đang dùng như**); app tải lại theo vai mới.

## Xoá dữ liệu test

Bảng Luồng dữ liệu ▸ **Xoá dữ liệu test** ▸ xác nhận. Máy chủ của từng backend (CRM: 4 file nhóm; Report Hub: 3 phòng ban + Training Hub):

- xoá **nội dung** mọi dòng có PIC "TEST" trong các tab có cột PIC — giữ công thức, **không xoá dòng** để số dòng của người khác không đổi;
- xoá nội dung dòng TEST trên file **Business Trip** và chuyển folder công tác đã tạo vào thùng rác;
- chuyển vào thùng rác các file Drive tên **TEST_…** nằm trong folder ảnh, chứng từ, báo cáo của backend.

Kết quả hiện thành thẻ "Xoá dữ liệu test" (bao nhiêu dòng ở tab nào, bao nhiêu file). Dữ liệu thật không bị đụng tới.

## Training Hub

Training Hub có **Chế độ Test** riêng (Admin ▸ menu tài khoản ▸ **Bật Chế độ Test**): đổi vai Trainer / Học viên, kịch bản 7 bước (tạo buổi, tải tài liệu, soạn bài, gửi email, tự học, làm bài, nhận chứng chỉ), email chỉ gửi Admin, buổi test lưu riêng ở sheet *HUB_TestSessions*. Xem Chương 5.

[[fig th/test_mode | Chế độ Test của Training Hub.]]

## Phần kỹ thuật

| Thành phần | Ở đâu | Việc |
|---|---|---|
| **testflow.js** | MMH-CRM và MMH-Report (giống hệt nhau) | Gắn `tm=1` + vai + phiên vào mọi lệnh gửi Apps Script; vẽ bảng Luồng dữ liệu; gọi `tmClean` |
| **MMH_TestMode.gs** | 9 backend: crm-dental / surgical / eyeless / thai, management, backoffice, marketing, kpi, training | Kiểm Admin, chuyển email về Admin (`mmhMail_`), ẩn dữ liệu TEST với người khác, cho vai Giám đốc / Quản lý duyệt hồ sơ TEST, xoá dữ liệu test |
| **MMH_TripFlow.gs v1.2** | 6 backend có công tác | Vai Giám đốc trong chế độ TEST chỉ duyệt được đề xuất của TEST |

[[backend crm-dental]]
[[backend marketing]]
