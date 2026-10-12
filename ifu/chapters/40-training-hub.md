---
number: 5
---
[[opener 5 | MMH Training Hub | Nền tảng đào tạo nội bộ: thư viện tài liệu đọc ngay trong app, lịch đào tạo, bài kiểm tra thang 100 điểm, chứng chỉ PDF tự cấp, nhắc học tự động. Training Hub còn là "cửa chung" quản lý đăng nhập, phân quyền, giao việc và email cập nhật cho các app khác. | th/home | Ai dùng, đăng nhập; Trang của tôi; Thư viện và lịch đào tạo; Trang một buổi đào tạo; Tự học: đọc tài liệu; Làm bài kiểm tra; Chứng chỉ; Trainer: tạo buổi, tài liệu, thư mời; Trainer: soạn bài kiểm tra, xem kết quả; Admin: người dùng, cấu hình, chế độ test; Trên điện thoại; Cửa chung cho các app khác; Dữ liệu và kết nối]]

## Ai dùng, đăng nhập

[[app th]]

| Vai trò | Làm gì | Menu thấy được |
|---|---|---|
| **Học viên** (mọi nhân sự) | Đọc tài liệu, làm bài kiểm tra, nhận chứng chỉ | Học tập: Trang của tôi · Thư viện đào tạo · Lịch đào tạo · Chứng chỉ của tôi |
| **Trainer** | Tạo buổi, tải tài liệu, gửi thư mời, soạn bài kiểm tra, xem kết quả buổi mình phụ trách | + Đào tạo: Quản lý đào tạo · Kết quả kiểm tra · Tổng quan |
| **Admin** | Sửa mọi buổi, quản lý người dùng, cấu hình, chế độ test | + Quản trị: Người dùng · Cấu hình |

Training Hub có **đăng nhập riêng** bằng **email công ty + mã PIN** (khác với mã 6 số của Report Hub / CRM).

[[fig th/login, th/activate | Đăng nhập bằng email + mã PIN (trái); kích hoạt tài khoản / quên PIN bằng mã 6 số qua email (phải).]]

1. Lần đầu (hoặc quên PIN): bấm **Kích hoạt / Quên PIN**, nhập email công ty, bấm **Gửi mã**.
2. Lấy **mã 6 số** trong email (dán cả 6 số vào ô đầu tiên cũng được), đặt **mã PIN mới** (tối thiểu 6 ký tự), bấm **Kích hoạt & đăng nhập**.
3. Các lần sau: nhập email + PIN, bấm **Đăng nhập**.

| Quy định | Giá trị |
|---|---|
| Ai được đăng nhập | Email có trong danh sách người dùng (sheet HUB_Users) và đang hoạt động |
| Mã kích hoạt | Hiệu lực 10 phút; mỗi 45 giây gửi được 1 mã; sai 5 lần phải gửi lại |
| Sai PIN | 8 lần ⇒ khoá 10 phút |
| Phiên đăng nhập | 30 ngày |

## Trang của tôi

[[fig th/home_learner | **Trang của tôi** của học viên: bài kiểm tra cần làm, hành trình học tập, sắp diễn ra, tài liệu đang đọc dở.]]

| Khối | Nội dung |
|---|---|
| Lời chào · 3 số | Số buổi đã hoàn thành, điểm trung bình, số chứng chỉ |
| **Việc cần làm** | Bài kiểm tra đang mở, được giao cho bạn, chưa đạt, còn lượt; sắp theo hạn. Chip *Còn N ngày* (≤ 3 ngày) hoặc *Quá hạn N ngày* (đỏ) |
| **Hành trình học tập** | Mỗi buổi 3 nút: **Tài liệu → Bài kiểm tra → Chứng chỉ**, tô màu theo tiến độ |
| **Sắp diễn ra** | Buổi đào tạo sắp tới; buổi hôm nay có nút **Vào họp** |
| **Học tiếp** | Tài liệu đang đọc dở, kèm % đã đọc |

[[fig th/home | Trang của tôi với tài khoản Trainer / Admin: thêm khối **Buổi bạn phụ trách** và menu Đào tạo, Quản trị.]]

Trainer có khối **Buổi bạn phụ trách**, cảnh báo: buổi đã diễn ra chưa có bài kiểm tra; bài đang mở còn học viên chưa đạt; buổi kế hoạch trong 14 ngày tới chưa có tài liệu. Mỗi cảnh báo có nút xử lý ngay (**Soạn bài · Nhắc · Tải lên**).

[[fig th/todo_popup | Hộp nhắc khi đăng nhập: **Bạn có N bài kiểm tra cần làm** (tối đa 4 bài), bấm **Học & làm bài** hoặc **Để sau**.]]

## Thư viện và lịch đào tạo

### Thư viện đào tạo

[[fig th/library | **Thư viện đào tạo** dạng Danh sách: buổi nhóm theo tuần, nhãn *Cần làm bài · Đạt N điểm · Bài KT đang mở · Kế hoạch · Tài liệu*.]]

1. Chọn kỳ: **Tuần này · Tháng này · Năm tài chính · Khoảng ngày** (từ – đến).
2. Gõ từ khoá (chủ đề, trainer, đối tượng, nhóm, mục tiêu). Khi đang tìm, app tìm trong mọi thời gian.
3. Bấm chip nhóm chủ đề (**Product · SOP · Functional skills · Compliance**) hoặc **Được giao cho tôi**.
4. Bấm một buổi để mở trang chi tiết.

[[fig th/library_table | Dạng **Bảng**: ngày, buổi, trainer, đối tượng, trạng thái, bài kiểm tra, học viên đạt (trainer) hoặc kết quả của tôi (học viên), tài liệu.]]

:::note Năm tài chính
Năm tài chính bắt đầu từ **tháng 9**: tháng 9/2026 đến tháng 8/2027 là **FY68**. Buổi đã huỷ ẩn mặc định; chọn trạng thái *Đã huỷ* để xem.
:::

### Lịch đào tạo

[[fig th/calendar_month | Lịch tháng: thẻ màu theo nhóm chủ đề, biểu tượng nhanh (thư mục tài liệu, bài kiểm tra, phòng họp, chứng chỉ); hôm nay khoanh tròn.]]

[[fig th/calendar_week, th/calendar_list | Kiểu Tuần (trái) và Danh sách (phải).]]

Bấm thẻ để mở buổi; bấm biểu tượng để mở thẳng tab Tài liệu, bài kiểm tra (học viên) / kết quả (trainer), hoặc phòng họp (chỉ buổi kế hoạch có link họp).

## Trang một buổi đào tạo

Đầu trang: nhóm chủ đề, trạng thái, hình thức, chủ đề, mục tiêu, ngày giờ, trainer, đối tượng; dải **Tiến độ của bạn**. Bốn tab: **Tài liệu · Bài kiểm tra · Học viên** (trainer) **· Thông tin**.

[[fig th/session_materials | Tab **Tài liệu** (học viên): file theo thư mục, nhãn *Bắt buộc / Không bắt buộc*, dung lượng, tiến độ đọc (*Đã đọc xong · Đã đọc N% · Chưa mở*), nút **Đọc**.]]

- Bấm **Đọc** (hoặc tên file) để mở tài liệu **ngay trong Hub**, không cần quyền Google Drive. Bấm ↗ để mở trên Drive.
- PDF mở ngay; PowerPoint / Word / Excel được chuyển sang PDF ở **lần mở đầu tiên** (10 đến 60 giây), các lần sau mở ngay. Video dùng trình xem của Drive. File lớn hơn 80 MB mở trên Drive.

[[fig th/session_course_cta, th/session_quiz_learner | Nút **Bắt đầu học · 0/N tài liệu** khi bài kiểm tra yêu cầu học tài liệu trước (trái); tab Bài kiểm tra của học viên với điểm cao nhất và lịch sử làm bài (phải).]]

[[fig th/session_info | Tab **Thông tin**: chủ đề, mục tiêu, nhóm, hình thức, ngày giờ, trainer, đối tượng, trạng thái, tổng kết, mã buổi, bản ghi / link họp.]]

## Tự học: đọc tài liệu

Khi trainer bật **Bắt buộc học hết tài liệu trước**, học viên đi theo **lộ trình tự học**: **1 · Học tài liệu → 2 · Bài kiểm tra → 3 · Chứng chỉ**.

[[fig th/reader | **Trình đọc** trong Hub: cột trái là lộ trình (tài liệu ✓ khi xong, bài kiểm tra bị khoá tới khi học xong), giữa là tài liệu, chân trang báo đang ở trang mấy.]]

1. Bấm **Bắt đầu học** (hoặc **Tiếp tục học · x/N**): tài liệu bắt buộc đầu tiên mở ra.
2. Cuộn hoặc dùng phím ← → / PageUp PageDown để lật trang; + / − để phóng to, thu nhỏ.
3. Đọc tới **trang cuối** (hoặc ≥ 95% số trang): tài liệu tự đánh dấu hoàn thành, nút **Tiếp tục** sáng lên.
4. Tài liệu *Không bắt buộc* có nút **Bỏ qua**. Video: xem xong bấm **Đã xem xong** (nút mở sau 20 giây).
5. Học xong mọi tài liệu bắt buộc: bước 2 hiện **Làm bài kiểm tra ngay**.

[[fig th/course_quizstep, th/quiz_gate | Học xong tài liệu, sang bài kiểm tra (trái); bài kiểm tra còn khoá vì chưa học đủ (phải).]]

:::tip Tiến độ không bị mất
Tài liệu đã tải được lưu tạm trên máy để lần sau mở ngay. Tiến độ chưa gửi được sẽ tự gửi lại trước khi mở bài kiểm tra.
:::

## Làm bài kiểm tra

[[fig th/quiz_intro | Màn giới thiệu: số câu, thời gian, điểm đạt /100, lượt còn lại, lưu ý của trainer, quy định làm bài.]]

1. Đọc quy định, bấm **Bắt đầu làm bài**: đồng hồ bắt đầu chạy.
2. Mỗi trang một câu: chọn phương án (hoặc phím **A–D / 1–4**). Câu nhiều đáp án: chọn **tất cả** phương án đúng. Câu Đúng–Sai: chọn Đúng / Sai.
3. Phân vân: bấm **Đánh dấu** (phím **F**) để xem lại sau. Chuyển câu bằng **Câu tiếp / Câu trước** (← →) hoặc bấm số câu.
4. Bấm **Nộp bài**: trang **Sẵn sàng nộp bài?** liệt kê câu chưa trả lời, câu đã đánh dấu. Bấm **Nộp bài** để xác nhận.

[[fig th/quiz_question, th/quiz_review | Làm bài: đồng hồ, danh sách câu, câu đã đánh dấu (trái); xem lại trước khi nộp (phải).]]

| Quy định | Chi tiết |
|---|---|
| Điểm | Thang 100, mỗi câu bằng nhau (= 100 ÷ số câu); câu nhiều đáp án phải chọn đúng đủ mới được điểm; câu bỏ trống 0 điểm |
| Thời gian | Đồng hồ vàng khi còn ≤ 2 phút, đỏ khi ≤ 30 giây; **hết giờ tự nộp**; nộp quá giờ hơn 30 giây không tính đạt |
| Mất mạng / tải lại trang | Mở lại bài, đáp án đã chọn vẫn giữ; *Tạm thoát* không dừng đồng hồ |
| Thứ tự câu | Có thể được trộn khác nhau cho mỗi người (tuỳ trainer) |

[[fig th/quiz_result | Kết quả: điểm /100, số câu đúng, thời gian; **Chứng chỉ đã được cấp** (đã gửi email, CC quản lý); xem lại đáp án (nếu trainer cho phép).]]

Chưa đạt: bấm **Làm lại (còn N lượt)** hoặc **Ôn lại tài liệu**. Hết lượt: liên hệ trainer để được mở thêm lượt.

## Chứng chỉ

[[fig th/certs | **Chứng chỉ của tôi**: chứng chỉ đã đạt, bài cần hoàn thành, điểm trung bình, tỷ lệ hoàn thành.]]

[[fig th/cert_preview | Mẫu **chứng chỉ hoàn thành đào tạo** (PDF, A4 ngang): tên học viên, chủ đề, trainer, ngày, kết quả, số chứng chỉ, người ký (dữ liệu giả).]]

- Đạt điểm ⇒ chứng chỉ PDF **tự tạo**, lưu trong thư mục chứng chỉ trên Drive, gửi email cho học viên (**CC quản lý trực tiếp và Admin**).
- Số chứng chỉ dạng *MMH-yyyyMMdd-<mã>-<3 số>*. Người ký, chức danh lấy từ Cấu hình.
- **Thứ Hai hằng tuần** (8:30) hệ thống gửi email *"Bạn còn N chứng chỉ cần hoàn thành"* tới người còn bài chưa xong.

## Trainer: tạo buổi, tài liệu, thư mời

### Quản lý đào tạo

[[fig th/manage | **Quản lý đào tạo**: số buổi, tỷ lệ buổi đã diễn ra có bài kiểm tra, bài đang mở, buổi sắp tới chưa có tài liệu; bảng buổi với nút Soạn, Thông báo, Kết quả, Sửa.]]

Lọc **Tất cả · Thiếu bài kiểm tra · Bài KT đang mở · Sắp diễn ra**. Ô *Có bài kiểm tra* xanh khi ≥ 80% buổi đã diễn ra có bài kiểm tra. Admin thấy mọi buổi; Trainer chỉ thấy buổi mình phụ trách.

### Tạo / sửa buổi đào tạo

[[fig th/create_session | Form **Tạo buổi đào tạo**.]]

1. Bấm **Tạo buổi đào tạo** (Trang của tôi, Thư viện hoặc Quản lý đào tạo). Có thể tạo ngay trên MMH Calendar của Report Hub (Chương 3).
2. Nhập **Chủ đề\***, **Mục tiêu**, **Ngày\***, giờ Từ – Đến; chọn **Nhóm chủ đề**, **Hình thức**, **Trạng thái**, **Trainer** (nhiều trainer cách nhau dấu phẩy).
3. **Đối tượng tham dự\***: chọn nhóm (ví dụ *MMH - Sales team*) và / hoặc từng người; app hiện số người ước tính.
4. Thêm link họp, link bản ghi, tổng kết sau buổi (nếu có). Bấm **Tạo buổi đào tạo**: trang buổi mới mở sẵn tab Tài liệu.

Hệ thống ghi một dòng vào sheet *Training Report* của file Training Master, **tự tạo thư mục Drive** theo chuẩn *<nhóm chủ đề> › yyyyMMdd_Hình thức_Nhóm_Đối tượng*, ghi danh học viên và tạo thông báo *Buổi đào tạo mới*. Sửa ngày / hình thức / nhóm / đối tượng ⇒ thư mục tự đổi tên theo chuẩn.

[[fig th/edit_session | Sửa buổi đào tạo: cùng form, điền sẵn dữ liệu.]]

### Tải tài liệu

[[fig th/session_materials_trainer | Tab Tài liệu của trainer: Tải file lên, Tải thư mục lên, Thư mục mới, Mở quyền xem cho cả công ty; mỗi file có chip Bắt buộc, Đổi tên, Xoá.]]

[[fig th/upload_drop, th/upload_progress | Kéo thả cả thư mục vào trang (trái); bảng tiến độ tải lên (phải).]]

1. Kéo thả **file hoặc cả thư mục** vào trang buổi, thả vào đúng thư mục muốn lưu (hoặc bấm **Tải file lên / Tải thư mục lên**).
2. Trùng tên: chọn **Thay thế** (giữ link cũ và tiến độ đọc), **Giữ cả hai** hoặc **Bỏ qua**.
3. Bấm chip **Bắt buộc** để đổi thành *Không bắt buộc* cho tài liệu tham khảo.
4. Xong: bấm **Thông báo học viên** để gửi thông báo *Tài liệu mới*.

:::note Giới hạn
Tối đa **1 GB / file**; file rác (.DS_Store, Thumbs.db…) tự bỏ qua. Không đóng trang khi đang tải. Thư mục của người khác phải được chia sẻ cho tài khoản chạy hệ thống, nếu không trang báo *Hub chưa được quyền đọc thư mục*.
:::

### Gửi thư mời, nhắc làm bài

[[fig th/invite, th/invite_reminder | **Thông báo cho học viên**: loại *Mời tham dự* (trái) và *Nhắc làm bài* cho người chưa đạt (phải); bên phải mỗi khung là bản xem trước email thật.]]

1. Trang buổi › **Thông báo học viên**. Chọn loại: *Mời tham dự · Tài liệu & bài KT · Mời làm bài · Nhắc làm bài*.
2. Chọn người nhận (**Toàn bộ học viên** / từng người), CC (nút nhanh chọn quản lý, *Gửi bản CC cho tôi*), tiêu đề, lời nhắn.
3. Bấm **Gửi qua hệ thống** (hoặc **Soạn bằng Gmail / Sao chép nội dung**).

| Nhắc tự động | Khi nào |
|---|---|
| Nhắc lịch ngày đào tạo | **8:30** sáng ngày đào tạo, tới từng học viên (buổi đã gửi thư mời) |
| Nhắc trước hạn bài kiểm tra | 8:30 hằng ngày, khi còn ≤ 1 ngày tới hạn (cấu hình được), tới người chưa đạt còn lượt |
| Tổng hợp thứ Hai | Email *"Bạn còn N chứng chỉ cần hoàn thành"* |

Email gửi từ hộp thư hệ thống nhưng hiển thị tên trainer; học viên bấm Trả lời sẽ về email của trainer.

## Trainer: soạn bài kiểm tra, xem kết quả

### Soạn bài kiểm tra

[[fig th/quiz_builder | Trình **soạn bài kiểm tra**: quy định làm bài (trái), danh sách câu hỏi (phải).]]

1. Trang buổi › tab Bài kiểm tra › **Soạn bài kiểm tra** (hoặc **Soạn** ở Quản lý đào tạo).
2. Đặt **Quy định làm bài**: điểm đạt /100, số phút, số lượt, hạn hoàn thành, lưu ý cho học viên; công tắc **Trộn thứ tự câu hỏi · Cho xem đáp án sau khi nộp · Bắt buộc học hết tài liệu trước · Phát hành ngay**.
3. Thêm câu hỏi: loại **Một đáp án · Nhiều đáp án · Đúng–Sai**, nội dung, phương án A–D, bấm chữ cái để đánh dấu đáp án đúng, giải thích.
4. **Xem thử** để làm thử (không lưu, không tính lượt). Bấm **Lưu bài kiểm tra**.

[[fig th/quiz_paste | **Dán nhanh từ Word / Excel**: dán theo mẫu, app nhận dạng ngay số câu và cảnh báo câu chưa có đáp án.]]

:::tip Mẫu dán nhanh
*Câu 1: nội dung* · các dòng *A. …*, *B. …* · dòng *Đáp án: B* (nhiều đáp án: *Đáp án: A, C*; Đúng/Sai: *Đáp án: Đúng*) · dòng *Giải thích: …* (không bắt buộc). Có thể đặt dấu * trước phương án đúng.
:::

[[fig th/session_quiz | Tab Bài kiểm tra của trainer: Sửa câu hỏi, Đóng / Mở bài, Mời học viên làm bài, Xem kết quả & phân tích, File câu hỏi.]]

Phát hành bài lần đầu ⇒ thông báo *Bài kiểm tra mới* tới đối tượng và hỏi có gửi email mời không.

### Học viên và kết quả

[[fig th/session_learners | Tab **Học viên**: số người theo đối tượng, đã làm bài, đạt; từng người với tài liệu đã đọc, trạng thái, điểm, lượt, chứng chỉ (Xem / Cấp lại), nút Nhắc.]]

[[fig th/results | **Kết quả kiểm tra**: số đã làm, đạt, điểm trung bình so với mục tiêu, phân bố điểm, phân tích từng câu (câu < 50% trả lời đúng tô đỏ), nhật ký lượt nộp.]]

Bấm **Nhắc N người** để soạn email nhắc; **Sửa câu hỏi** để chỉnh câu khó; **Xuất CSV** để tải danh sách. Mục tiêu điểm trung bình mặc định 80.

### Tổng quan đào tạo

[[fig th/dashboard | **Tổng quan đào tạo**: buổi đã diễn ra, tỷ lệ buổi có bài kiểm tra, điểm trung bình, tỷ lệ đạt và số chứng chỉ; biểu đồ theo tháng, nhóm chủ đề, trainer; bảng học viên.]]

## Admin: người dùng, cấu hình, chế độ test

[[fig th/users | **Người dùng**: tên, email, phòng ban, chức danh, vai trò, đã kích hoạt PIN chưa, lần đăng nhập gần nhất; Thêm, Sửa, Xoá PIN, Xoá.]]

- **Thêm người dùng**: email công ty, họ tên, vai trò, phòng ban, chức danh, **email quản lý** (nhận CC chứng chỉ), đang hoạt động. Người mới tự kích hoạt bằng mã qua email.
- **Xoá PIN**: buộc người dùng kích hoạt lại. Xoá người dùng vẫn giữ kết quả cũ.

[[fig th/settings | **Cấu hình**: Chung (tên app, năm tài chính, mục tiêu điểm TB), Bài kiểm tra mặc định, Nhắc việc & email, Chứng chỉ PDF, Chế độ Test, Hệ thống.]]

| Cấu hình mặc định | Giá trị |
|---|---|
| Điểm đạt · Thời gian · Số lượt · Hạn | 70 điểm · 15 phút · 2 lượt · 7 ngày |
| Mục tiêu điểm trung bình | 80 |
| Nhắc trước hạn | 1 ngày |

:::warn Công tắc nhắc 8:30 và nhắc thứ Hai
Khi mở trang Cấu hình, hai công tắc *Nhắc lịch 8:30* và *Nhắc mỗi thứ Hai* luôn hiện **tắt** (máy chủ không gửi hai giá trị này về; mặc định thật là bật). Bấm **Lưu cấu hình** khi chúng đang tắt sẽ **tắt luôn hai tính năng**. Bật lại cả hai trước khi lưu.
:::

[[fig th/logs, th/profile | **Nhật ký hệ thống** (trái, 300 dòng gần nhất); **menu tài khoản** (phải): xem giao diện theo vai trò, bật Chế độ Test, đổi PIN, tải lại dữ liệu, đăng xuất.]]

[[fig th/test_mode | **Chế độ Test** (Admin): kịch bản test trọn vòng 7 bước, đổi vai Trainer / Học viên; email chỉ gửi tới Admin, không ảnh hưởng dữ liệu thật.]]

[[fig th/notifications, th/search | **Thông báo** (chuông, trái) và **Tìm nhanh** Ctrl + K (phải).]]

## Trên điện thoại

Thanh dưới có 5 nút: **Trang chủ · Thư viện · Lịch · Thông báo · Thêm**.

[[phones th/m_home, th/m_library, th/m_calendar | Trang của tôi, Thư viện, Lịch đào tạo trên điện thoại.]]

[[phones th/m_session, th/m_reader, th/m_quiz | Trang buổi đào tạo, đọc tài liệu, làm bài kiểm tra trên điện thoại.]]

## Cửa chung cho các app khác

Ngoài phần đào tạo, backend Training Hub chứa các dịch vụ **dùng chung** cho Report Hub, CRM, Product Data và màn KPI:

| Dịch vụ | Sheet trong Training Master | Dùng bởi |
|---|---|---|
| **Đăng nhập email + mã 6 số** (phiên 30 ngày) | RH_Users, RH_Secret (ẩn) | Report Hub, CRM, Product Data, KPI |
| **Phân quyền người dùng** (cột Perms) | RH_Users | Report Hub (trang Phân quyền), CRM, Product Data |
| **Giao việc & trao đổi** | RH_Assign | Report Hub |
| **Email thông báo cập nhật** (tối đa 200 người nhận, PDF ≤ 22 MB) | RH_UpdMail | Report Hub, CRM |
| **Tạo buổi, gửi thư mời, tải tài liệu từ lịch** | Training Report | Report Hub (MMH Calendar) |

:::rule Một tài khoản cho mọi app
Khi có người nghỉ việc hay đổi vị trí, Admin chỉ sửa **một dòng** trong RH_Users (hoặc trang Phân quyền của Report Hub), quyền ở mọi app đổi theo.
:::

## Dữ liệu và kết nối

| Dữ liệu | Nơi lưu |
|---|---|
| Danh sách buổi đào tạo (ngày, loại, nhóm, chủ đề, trainer, đối tượng, trạng thái *Plan / Completed / Cancel*, link họp, bản ghi, mã buổi) | File **MMH - Training Master** · sheet *Training Report FYxx* |
| Người dùng Hub, ghi danh, tiến độ đọc, thông báo, cấu hình, nhật ký | HUB_Users · HUB_Enrollment · HUB_Progress · HUB_Notifications · HUB_Config · HUB_Log · HUB_TestSessions |
| Câu hỏi, cấu hình bài kiểm tra, bài làm | File **Bộ câu hỏi khảo sát** · QuizConfig · Questions · Responses |
| Tài liệu | Google Drive, chia thư mục: SOP · Functional skills · Product · Compliance |
| Chứng chỉ | Thư mục chứng chỉ trên Drive (chia sẻ trong tổ chức có link) |

<div class="flow"><div><b>Trainer</b>Tạo buổi, tài liệu, bài kiểm tra</div><div><b>Training Master</b>Training Report: trạng thái Completed</div><div><b>KpiSyncCenter</b>Đếm buổi Completed</div><div><b>KPI đào tạo</b>L1-00 · L2-xx · C10-06</div></div>

Buổi đào tạo chuyển sang **Completed** được tự đếm vào KPI đào tạo trong file MMH KPI FY68 (Chương 4); buổi đào tạo cũng tự hiện trên MMH Calendar của Report Hub và CRM.

[[backend training]]
