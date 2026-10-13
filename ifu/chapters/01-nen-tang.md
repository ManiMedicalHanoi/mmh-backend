---
number: 1
---
[[opener 1 | Nền tảng chung | Bốn ứng dụng của MMH (CRM, Report Hub, KPI và Training Hub) dùng chung một cách đăng nhập, một kho dữ liệu Google và cùng một cách thao tác. Chương này giải thích phần chung đó một lần, để các chương sau chỉ cần nói về chức năng riêng của từng app. | rh/main | Hệ thống gồm những gì; Dữ liệu nằm ở đâu, đi qua đâu; Đăng nhập bằng email công ty; Quyền xem và quyền sửa; Lưu không phải chờ; Nhắc hạn, thông báo, hướng dẫn trong app; Dùng trên điện thoại; Khi gặp sự cố]]

## Hệ thống gồm những gì

Hệ thống quản lý dữ liệu nội bộ của MMH là **một bộ ứng dụng web** chạy trên trình duyệt. Mỗi app phục vụ một nhóm người dùng, nhưng tất cả cùng đọc và ghi vào các file Google Sheets của công ty, nên dữ liệu nhập ở app này có thể hiện ở app khác mà không phải nhập lại.

| Ứng dụng | Dùng để làm gì | Người dùng chính |
|---|---|---|
| **MMH CRM** | Sổ tay số của đội Sales: khách hàng, lịch đi địa bàn, công tác, báo cáo tuần / tháng, mở mới địa bàn, KPI cá nhân | Sales Dental, Surgical, Eyeless, Thailand Surgical; Team Leader; quản lý |
| **MMH Report Hub** | Bảng việc của các phòng ban: key task / sub task, báo cáo tuần, Monthly Report, MMH Calendar, giao việc, công tác, đào tạo | Marketing & Sales, Product Team, Back Office, Management, Director / HOD |
| **KPI** | Số liệu KPI tự điền từ nhiều nguồn vào file MMH KPI FY68, hiển thị trong tab KPI của CRM và Report Hub | Mọi nhân sự, Team Leader, HOD, Director |
| **MMH Training Hub** | Đào tạo nội bộ: thư viện tài liệu, lịch đào tạo, bài kiểm tra, chứng chỉ; đồng thời là **cửa đăng nhập chung** của các app | Học viên, Trainer, Admin |

[[app crm]]
[[app rh]]
[[app th]]

## Dữ liệu nằm ở đâu, đi qua đâu

Mỗi app gồm **hai phần**:

- **Phần giao diện** (thứ mọi người nhìn thấy) là một trang web đặt trên GitHub Pages. Mở bằng link, không cần cài đặt.
- **Phần backend** là một đoạn mã Google Apps Script gắn với một file Google Sheet. Khi bấm Lưu, giao diện gửi lệnh tới backend; backend ghi vào đúng dòng, đúng cột của Sheet, rồi trả kết quả về.

<div class="flow"><div><b>Người dùng</b>Thao tác trên app (máy tính hoặc điện thoại)</div><div><b>App web</b>GitHub Pages · hiện kết quả ngay, gửi lệnh ở phía sau</div><div><b>Apps Script</b>Backend kiểm tra phiên đăng nhập, quyền, rồi ghi / đọc</div><div><b>Google Sheets · Drive · Gmail</b>Dữ liệu gốc của công ty, tài liệu, email tự động</div></div>

Vì dữ liệu gốc vẫn là các file Google Sheets của công ty, người có quyền vẫn mở file gốc được khi cần. App giúp **nhập nhanh, nhập đúng chỗ và tự tổng hợp**: báo cáo, lịch chung, KPI.

:::rule Một nguyên tắc xuyên suốt: nhập một lần
Dữ liệu chỉ nhập ở **một nơi**. Ví dụ: Sales báo kết quả đi địa bàn trên CRM ⇒ số lượt đi địa bàn tự sang file KPI; trainer chuyển buổi đào tạo sang *Completed* trên Training Hub ⇒ KPI đào tạo tự đếm; công tác duyệt trên app ⇒ tự hiện trên MMH Calendar.
:::

### Mã backend được quản lý tập trung

Mã Apps Script của mọi backend nằm trong kho riêng tư **mmh-backend** trên GitHub. Mỗi lần sửa backend, hệ thống tự cập nhật đúng bản đang chạy, **đường link không đổi**, và tự gọi thử; nếu gọi thử lỗi, web app tự quay về bản trước. Người dùng không phải làm gì. Danh sách đầy đủ các backend và đường link nằm ở **Phụ lục**.

## Đăng nhập bằng email công ty

CRM, Report Hub, màn KPI và Product Data dùng **chung một cách đăng nhập**, do Training Hub quản lý: không cần mật khẩu, chỉ cần email công ty và một mã 6 số gửi qua email.

[[fig rh/login_email, rh/login_code | Màn hình đăng nhập: nhập email công ty (trái), nhập mã 6 số nhận qua email (phải).]]

1. Mở app, nhập **email công ty** (@manimedicalhanoi.com hoặc @mani.inc) rồi bấm **Gửi mã đăng nhập**.
2. Mở hộp thư, lấy **mã 6 số** trong email vừa nhận.
3. Nhập mã vào app. Đăng nhập thành công, app tự nhận tên, nhóm và quyền của bạn.

| Quy định | Giá trị |
|---|---|
| Mã đăng nhập hết hạn sau | 10 phút |
| Nhập sai | 5 lần thì phải xin mã mới |
| Một lần đăng nhập dùng được | 30 ngày trên máy đó |
| Danh sách người được đăng nhập | sheet **RH_Users** trong file Training Master (Admin quản lý) |

:::tip Đăng nhập một lần, dùng cho mọi app
Phiên đăng nhập được lưu trên máy. Đã đăng nhập Report Hub thì mở CRM hay Product Data trên cùng trình duyệt không phải đăng nhập lại.
:::

:::note Trình duyệt đăng nhập nhiều tài khoản Gmail
Từ Report Hub v16.7 / CRM v30.0, app đọc backend **không kèm cookie Google**, nên Chrome đăng nhập Gmail cá nhân hay nhiều tài khoản cùng lúc vẫn đăng nhập app bình thường. Nếu vẫn lỗi, thử cửa sổ ẩn danh.
:::

Training Hub có **đăng nhập riêng** bằng email + mã PIN (lần đầu kích hoạt bằng mã 6 số qua email). Xem Chương 5.

## Quyền xem và quyền sửa

Mỗi người dùng có **vai trò** (PIC, Team Leader, HOD, Director, Admin) và có thể được Admin bật thêm hoặc tắt bớt từng quyền. Nguyên tắc mặc định:

| Vai trò | Thấy gì | Sửa gì |
|---|---|---|
| **PIC / Sales** | Việc, lịch, KPI của chính mình | Việc của mình |
| **Team Leader** | Cả nhóm của mình | Việc của mình, duyệt một số mục của nhóm |
| **HOD** | Cả phòng ban | Theo phân quyền |
| **Director** | Toàn công ty, Total KPI | Duyệt đề xuất công tác |
| **Admin** | Toàn bộ | Phân quyền người dùng, gửi email cập nhật, chế độ thử |

[[fig rh/permissions | Trang **Phân quyền người dùng** (chỉ Admin): bật / tắt từng quyền cho từng người, khoá phiên đăng nhập khi cần.]]

:::note Chuyến công tác của người khác
Mặc định lịch **ẩn chuyến công tác của người khác**. Quản lý bật nút *Công tác người khác* trên thanh lịch để xem toàn bộ. Buổi đào tạo chỉ hiện với trainer và người được mời.
:::

## Lưu không phải chờ

Mọi thao tác ghi (thêm việc, sửa trạng thái, báo kết quả, tải ảnh) đều theo cùng một cách: **app cập nhật màn hình ngay**, rồi gửi lệnh lên Sheet ở phía sau, theo hàng đợi.

1. Bấm **Lưu**: khung đóng ngay, thay đổi hiện trên màn hình.
2. App gửi lệnh lên backend ở phía sau, lần lượt từng lệnh; ảnh được gửi sau phần chữ.
3. Mạng chập chờn hoặc máy chủ bận: app **tự thử lại**, cùng một mã lệnh nên không tạo bản ghi trùng.
4. Lỗi thật (ví dụ dòng đã bị xoá trên Sheet): app hiện **chip đỏ** trên thanh trên cùng, bấm vào để chọn **Thử lại** hoặc **Bỏ**.

[[fig rh/outbox | Hàng đợi ghi: chip trạng thái và bảng Thử lại / Bỏ khi có lệnh chưa lưu được.]]

:::warn Không xoá dữ liệu trình duyệt khi còn chip đỏ
Hàng đợi được lưu trong trình duyệt. Đóng tab hay tắt máy vẫn giữ, lần mở sau app gửi tiếp. Nhưng nếu xoá dữ liệu trình duyệt (cookie, bộ nhớ trang) khi còn lệnh chưa gửi thì lệnh đó mất.
:::

## Nhắc hạn, thông báo và hướng dẫn trong app

### Popup tự động khi mở app

Các popup hiện **lần lượt**, không chồng lên nhau, theo thứ tự:

| Thứ tự | Popup | Khi nào hiện | App |
|---|---|---|---|
| 1 | **Thông báo cập nhật** | 7 ngày sau mỗi bản mới; tick *Không hiển thị lại* để ẩn | Cả hai |
| 2 | **Nhắc hạn chứng từ kế toán** | Ngày 14, 15, 28, 29 và đúng ngày hạn | Cả hai |
| 3 | **Việc mới được giao** | Lần mở app đầu tiên sau khi được giao | Report Hub |
| 4 | **Thư nhắc việc** | Việc sắp đến hạn, công tác, đào tạo sắp tới | Report Hub |
| 5 | **Nhắc KPI** | Ngày 02 (báo cáo KPI tháng, trước 16:00) · ngày 09 tháng 9, 12, 3, 6 (tự đánh giá quý, trước 17:00) | Cả hai |
| 6 | **Đề xuất công tác chờ duyệt** | Khi có đề xuất mới (chỉ Giám đốc) | Cả hai |

Popup chỉ hiện khi popup trước đã đóng; đang chạy bài hướng dẫn thì các popup chờ tới khi bài xong.

[[fig rh/whats_new | Popup **Thông báo cập nhật**: mỗi mục có ảnh minh hoạ, bấm số phiên bản cạnh tên app để xem lại toàn bộ lịch sử.]]

### Hướng dẫn từng bước

Nút **Hướng dẫn** (biểu tượng dấu hỏi) mở danh mục bài hướng dẫn. Chọn một bài, app sẽ làm sáng đúng chỗ cần bấm và giải thích từng bước ngay trên màn hình thật. Bài mới hoặc vừa cập nhật có nhãn *Mới* / *Cập nhật*.

[[fig rh/tour_catalog | Danh mục **Hướng dẫn từng bước**.]]

### Tìm nhanh, màu giao diện, ngôn ngữ

- **Tìm nhanh** [[key Ctrl+K]] (máy Mac: [[key ⌘+K]]): tìm việc, sự kiện, công tác, buổi đào tạo; gõ không dấu cũng được.
- **Màu giao diện**: 10 tông màu, chọn ở nút bảng màu trên thanh trên cùng; lựa chọn được nhớ trên máy.
- **Ngôn ngữ**: Report Hub có nút VN / EN; CRM của nhóm Thailand Surgical hiển thị toàn bộ bằng tiếng Anh.

[[fig rh/quick_search | Tìm nhanh (Ctrl + K): kết quả gom theo loại, bấm để mở ngay.]]

## Dùng trên điện thoại

Các app tự đổi bố cục khi mở trên điện thoại: thanh dưới cùng có các nút chính, nút **＋** nổi ở góc phải để thêm nhanh.

:::tip Đưa app ra màn hình chính
**iPhone (Safari):** bấm nút Chia sẻ › *Thêm vào MH chính*. **Android (Chrome):** bấm ⋮ › *Thêm vào màn hình chính*. Biểu tượng app sẽ nằm cạnh các ứng dụng khác, mở lên là vào thẳng app.
:::

[[phones crm/m_login, crm/m_today, rh/m_main | Ba màn hình điện thoại: đăng nhập CRM, mục Hôm nay của CRM, trang chính Report Hub.]]

## Khi gặp sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| App mở lâu hoặc trắng trang | Bấm **Tải lại** trên app (hoặc F5). Kiểm tra mạng. |
| Thấy chip đỏ trên thanh trên cùng | Bấm vào chip, chọn **Thử lại**. Nếu vẫn lỗi, chụp màn hình gửi Admin. |
| Không nhận được mã đăng nhập | Kiểm tra mục Spam / Quảng cáo; email gửi từ miền @manimedicalhanoi.com. Chờ 1 phút rồi bấm gửi lại. |
| Báo "phiên hết hạn" | Đăng nhập lại bằng email + mã 6 số. |
| Không thấy một chức năng | Có thể chưa được cấp quyền: liên hệ Admin (Phân quyền người dùng). |
| Số liệu trên app khác file Sheet | Bấm **Tải lại**; số KPI cập nhật sau vài giây đến tối đa 15 phút (Chương 4). |
