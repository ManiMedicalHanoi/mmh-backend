/**
 * ============================================================================
 *  MMH TRAINING HUB — BACKEND (Google Apps Script)
 *  Mani Medical Hanoi | Sales & Marketing Division
 *  Version 3.11 — 10/2026
 * ----------------------------------------------------------------------------
 *  Backend cho WebApp "Training Hub" (frontend index.html deploy trên GitHub).
 *
 *  ĐIỂM MỚI v3.13
 *    - Trang phân quyền Report Hub: rhAdminList / rhAdminSave / rhAdminKick. RH_Users thêm cột Dept, Title, Perms.
 *
 *  ĐIỂM MỚI v3.12
 *    - Report Hub đăng nhập bằng email công ty + mã 6 số (rhAuthStart / rhAuthVerify / rhAuthMe — file RH_Auth.gs,
 *      danh sách người dùng: sheet RH_Users). Cầu nối rh* ưu tiên danh tính trong phiên (tham số tk).
 *    - Kiểm tên miền email so khớp chính xác (trước đây nhận cả "x@mani.inc.ten-mien-khac.com").
 *
 *  ĐIỂM MỚI v3.11
 *    - rhMaterials: tự chia sẻ thư mục tài liệu (và file chưa chia sẻ) cho cả công ty có link ⇒ mọi
 *      người xem / tải về được từ Report Hub; trả kèm link tải trực tiếp.
 *
 *  ĐIỂM MỚI v3.10
 *    - rhMyChecks: Report Hub hỏi các buổi đào tạo của PIC đã kết thúc mà thư mục tài liệu còn TRỐNG
 *      (hạn 1 ngày sau buổi học) ⇒ hiện "Thư nhắc việc" mỗi lần đăng nhập.
 *
 *  ĐIỂM MỚI v3.9
 *    - Report Hub: tạo thư mục buổi đào tạo xong ⇒ ĐỌC LẠI ô Training Folder; chưa có link thì ghi
 *      link dạng URL thường; vẫn không ghi được (data validation / bảo vệ ô) ⇒ báo rõ lý do + ghi HUB_Log.
 *    - Nhận lệnh POST từ Report Hub (lưu buổi, gửi thư mời) — trả lỗi chi tiết.
 *
 *  ĐIỂM MỚI v3.8
 *    - Report Hub: chỉ NGƯỜI TẠO hoặc TRAINER của buổi được sửa buổi, gửi thư mời, thêm tài liệu
 *      (buổi của người khác chỉ xem). Sửa buổi đào tạo ngay trên Report Hub. rhSessions trả cờ canEdit.
 *
 *  ĐIỂM MỚI v3.7
 *    - Report Hub (MMH Calendar): trainer của buổi / Leader kéo thả tài liệu vào folder buổi đào tạo,
 *      xem danh sách tài liệu, gửi thư mời — không cần mở Training Hub (rhMaterials, rhUpload*).
 *
 *  ĐIỂM MỚI v3.6
 *    - Email mmh.admin đổi PIC: Quynh Anh → Minh Trang (tự sửa tên trong HUB_Users).
 *
 *  ĐIỂM MỚI v3.5
 *    - Report Hub hiển thị buổi đào tạo trên lịch làm việc (action rhSessions).
 *
 *  ĐIỂM MỚI v3.4
 *    - CẦU NỐI REPORT HUB: Team Leader / Manager / Director tạo buổi đào tạo
 *      ngay trên lịch Report Hub (nhấp đúp ngày) và gửi thư mời cho nhóm và/
 *      hoặc từng cá nhân. Thư mục tài liệu được tạo KHI BẤM GỬI EMAIL, email
 *      kèm link thư mục ("Vui lòng truy cập và tham khảo tài liệu đào tạo
 *      tại đây"). Các action rh* — xem mục 18 cuối file.
 *
 *  ĐIỂM MỚI v3.3
 *    - Mở tài liệu luôn kèm lộ trình tự học bên trái (trainer & học viên).
 *    - Giao diện tự cảnh báo khi máy chủ chưa Deploy bản mới (lệch phiên bản).
 *
 *  ĐIỂM MỚI v3.2
 *    - Danh sách tài liệu cho biết file nào đã chia sẻ bằng link (công ty /
 *      bất kỳ ai) → giao diện mở NHANH bằng trình xem Google (không chuyển đổi).
 *
 *  ĐIỂM MỚI v3.1
 *    - Xem PPTX/DOCX/Slides: chuyển đổi TỪNG BƯỚC ngắn (nhân bản Google →
 *      xuất PDF qua Drive API), không còn 1 lượt nặng bị Google cắt.
 *    - Bài slide lớn (PDF > 10MB — giới hạn xuất của Google): tự chuyển sang
 *      xem dạng ảnh từng slide (Google Slides API), tải dần khi cuộn.
 *
 *  ĐIỂM MỚI v3.0
 *    - CHẾ ĐỘ TEST cho Admin: đóng vai Trainer ↔ Học viên, dữ liệu riêng
 *      (sheet HUB_TestSessions, thư mục Test), email & thông báo chỉ gửi cho
 *      chính mình, xoá sạch dữ liệu test bằng 1 nút.
 *    - Điểm luôn trên thang 100: mỗi câu = 100 / số câu.
 *    - Nhắc lịch 8:30 sáng ngày đào tạo (buổi đã gửi thư mời) + thứ Hai hằng
 *      tuần nhắc các bài kiểm tra chưa hoàn thành.
 *    - Báo rõ khi tài khoản chạy hệ thống chưa được chia sẻ thư mục đào tạo.
 *
 *  ĐIỂM MỚI v2.6
 *    - Xem tài liệu tải TỪNG PHẦN 1,5MB (Drive API Range) thay vì gửi cả file
 *      trong 1 lượt → hết lỗi hết bộ nhớ / bị cắt với file lớn, có % tiến độ.
 *      Chuyển PPTX/DOCX → PDF chỉ 1 lần (single-flight), dùng lại cho mọi người.
 *    - Chứng chỉ PDF: sửa trang trắng thừa.
 *    - Học xong toàn bộ tài liệu của buổi không có bài kiểm tra → tính là
 *      "đã hoàn thành" buổi đó.
 *
 *  ĐIỂM MỚI v2.5
 *    - Tự kiểm tra máy chủ (selfTest): chạy thử từng chức năng ngay trên máy
 *      chủ, báo thời gian / dung lượng / lỗi — kể cả khi trình duyệt không
 *      nhận được phản hồi.
 *    - Trang buổi đào tạo chỉ gửi danh sách học viên khi trainer mở tab Học
 *      viên (phản hồi gọn hơn, ít dữ liệu cá nhân hơn).
 *
 *  ĐIỂM MỚI v2.4
 *    - Không lượt gọi nào được chạy lâu: đọc thư mục Drive có ngân sách thời
 *      gian (≤ 15 giây) và giới hạn số thư mục; chỉ 1 lượt đọc/buổi tại một
 *      thời điểm (single-flight) → hết cảnh dồn hàng chục lượt chạy dở làm
 *      Google từ chối mọi yêu cầu.
 *    - Trang buổi đào tạo trả thông tin ngay; danh sách tài liệu tải riêng,
 *      lưu đệm 30 phút.
 *    - Chẩn đoán: xem các lượt đang chạy dở (lượt nào, bao lâu).
 *
 *  ĐIỂM MỚI v2.3
 *    - Tự học có lộ trình: Học tài liệu → Làm bài kiểm tra → Nhận chứng chỉ.
 *      Trainer bật "Bắt buộc học hết tài liệu" → máy chủ chặn mở đề khi học
 *      viên chưa học xong; từng file có thể đánh dấu "Không bắt buộc".
 *
 *  ĐIỂM MỚI v2.2
 *    - Liệt kê tài liệu bằng Drive API (1 lệnh/cấp thư mục thay vì ~6 lệnh/file)
 *      → mở buổi đào tạo nhanh hơn nhiều lần, không còn treo khi nhiều file.
 *    - Trang chi tiết buổi chỉ cần 1 lượt gọi máy chủ (gộp tài liệu).
 *    - Nhật ký chẩn đoán: mỗi lượt gọi ghi vào Executions (console), lượt chậm
 *      > 12 giây và lỗi kết nối phía trình duyệt ghi vào HUB_Log.
 *    - Năm tài chính / quý / nửa năm cho màn danh sách (FY_START_MONTH).
 *
 *  ĐIỂM MỚI v2.1
 *    - Upload kiểu Google Drive: kéo thả nhiều file / cả thư mục, file lớn
 *      (video, bản ghi) chia nhỏ 8MB/lần gửi (Drive resumable upload),
 *      thay thế file trùng tên giữ nguyên link, tạo thư mục con, đổi tên.
 *    - Thư mục tài liệu tự tạo khi lưu buổi đào tạo, tự chuyển đúng nhóm
 *      chủ đề & đổi tên chuẩn khi sửa ngày/nhóm/đối tượng.
 *
 *  ĐIỂM MỚI v2.0
 *    - Tăng tốc: bộ nhớ đệm CacheService (5–10 phút) cho mọi dữ liệu đọc,
 *      đọc link folder theo lô (trước đây đọc từng ô → rất chậm).
 *    - Đọc tài liệu ngay trong Hub: máy chủ trả nội dung PDF / ảnh / Slides /
 *      Docs / PPTX / DOCX (tự chuyển sang PDF) → người học không cần quyền
 *      truy cập Drive, không lỗi "You need access".
 *    - Tìm folder tài liệu chắc chắn hơn (link dạng HYPERLINK, open?id=,
 *      thư mục con 2 cấp, shortcut).
 *    - Thông báo trong ứng dụng (chuông) + email thay mặt PIC khi phát hành
 *      bài kiểm tra, nhắc làm bài tự động trước hạn.
 *    - Hạn làm bài, câu hỏi nhiều đáp án, tiếp tục bài làm khi lỡ tải lại trang.
 *    - Theo dõi tiến độ đọc tài liệu, phân tích từng câu hỏi cho trainer.
 *
 *  CÀI ĐẶT / NÂNG CẤP (làm 1 lần)
 *    1. Mở project Apps Script "MMH Training Hub Backend".
 *    2. Xoá toàn bộ Code.gs cũ, dán TOÀN BỘ file này vào.
 *    3. Project Settings → bật "Show appsscript.json" → dán nội dung file
 *       appsscript.json đi kèm (bổ sung quyền trigger + gọi Drive API).
 *    4. Chạy hàm  setupTrainingHub()  → cấp quyền → đợi báo "DONE".
 *    5. Deploy → Manage deployments → Edit (bút chì) → Version: New version
 *       → Deploy.  (Giữ nguyên URL /exec, frontend không phải sửa.)
 *
 *  OAUTH SCOPES (appsscript.json)
 *    spreadsheets, drive, script.send_mail, script.external_request,
 *    script.scriptapp, userinfo.email
 * ============================================================================
 */

// ============================================================================
//  1. CẤU HÌNH
// ============================================================================

var HUB = {

  VERSION: '3.13',

  /** ★ v3.4 — Khoá kết nối từ Report Hub (phải trùng TRAINING_RH_KEY trong index.html của Report Hub).
   *  Đổi khoá: đặt Script Property RH_BRIDGE_KEY (ưu tiên hơn giá trị ở đây) và sửa cả 2 phía. */
  RH_BRIDGE_KEY: 'mmh-rh-training-2026',

  /** ID file Google Sheet "MMH - Training Master" — ĐÃ ĐIỀN SẴN. */
  MASTER_SPREADSHEET_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',
  MASTER_FILE_NAME: 'MMH - Training Master',

  /** Tên các sheet */
  SHEETS: {
    REPORT   : 'Training Report FY67',   // sheet gốc — nguồn dữ liệu buổi đào tạo
    MASTER   : 'Master',                 // sheet gốc — danh mục trainer / audience
    USERS    : 'HUB_Users',
    ENROLL   : 'HUB_Enrollment',
    CONFIG   : 'HUB_Config',
    LOG      : 'HUB_Log',
    NOTI     : 'HUB_Notifications',      // ★ v2 — thông báo trong ứng dụng
    PROGRESS : 'HUB_Progress'            // ★ v2 — tiến độ đọc tài liệu
  },

  /** Bố cục sheet Training Report FY67 (giữ nguyên B..S của hệ thống cũ). */
  COL: {
    NO                 : 2,   // B  (ArrayFormula — KHÔNG ghi)
    MONTH              : 3,   // C  (ArrayFormula — KHÔNG ghi)
    FOLDER             : 4,   // D  Training Folder (hyperlink)
    DATE               : 5,   // E  Actual Date
    TYPE               : 6,   // F  Training Type
    CATEGORY           : 7,   // G  Training Category
    TOPIC              : 8,   // H  Training Topic
    PURPOSE            : 9,   // I  Training Purpose
    TRAINER            : 10,  // J
    AUDIENCE           : 11,  // K  Target Audience
    STATUS             : 12,  // L  Plan / Completed / Cancel
    MEETING_LINK       : 13,  // M
    RECORD_LINK        : 14,  // N
    SUMMARY            : 15,  // O
    ASSESSMENT         : 16,  // P
    ASSESSMENT_RESULT  : 17,  // Q
    PRE_TRAINING       : 18,  // R
    AFTER_TRAINING     : 19,  // S
    SID                : 20,  // T  ★ HUB — Session ID
    QUIZ_STATUS        : 21,  // U  ★ HUB — Draft / Published / Closed
    COMPLETION         : 22,  // V  ★ HUB — "8/12 đạt"
    TIME_FROM          : 23,  // W  ★ HUB — giờ bắt đầu
    TIME_TO            : 24   // X  ★ HUB — giờ kết thúc
  },
  DATA_START_ROW: 5,
  LAST_COL: 24,

  /** Google Drive */
  DRIVE: {
    PARENT       : '1LTuCXEzNy7NqZSpCHc1aEYFxqePL7VR1', // folder mẹ đào tạo
    CERTIFICATE  : '123pLAnNptZ174n5t0G-QfnnSc5s1ll9B', // folder chứng chỉ
    CATEGORY: {
      'SOP'              : '1lQE7reqTVQO9a_TxqJZEgFShDCVtQC8Z',
      'Funtional skills' : '18HOaDnd5WL9FjIrThBZqaUsHgtLkbwPw',
      'Product'          : '1oBkfBQkyrqdHaxZJn1b2cw-R4EzKwNjC',
      'Compliance'       : '14LTroYyR-QVEGSK8ken79ylUnS0YRa9N'
    }
  },

  /** File ngân hàng câu hỏi — hệ thống tự tạo lần đầu trong folder mẹ */
  QUIZ_FILE_NAME: 'Bộ câu hỏi khảo sát',
  QUIZ_SHEETS: {
    CONFIG    : 'QuizConfig',
    QUESTIONS : 'Questions',
    RESPONSES : 'Responses'
  },

  /** Email */
  DOMAINS      : ['mani.inc', 'manimedicalhanoi.com'],
  SEND_DOMAIN  : 'mani.inc',     // mọi email gửi đi đều chuẩn hoá về domain này
  ADMIN_EMAIL  : 'mmh.product@mani.inc',
  COMPANY_NAME : 'MANI MEDICAL HANOI',

  /** Bảo mật */
  TOKEN_TTL_DAYS : 30,
  OTP_TTL_MIN    : 10,
  PIN_MIN_LEN    : 6,

  /** ★ v3.0 — Chế độ Test (chỉ Admin) */
  TEST: {
    FOLDER : '1JZ0tmX04XpIazOYQp2SqQyzvlw2iFx_s',   // thư mục chứa mọi file sinh ra khi test
    SHEET  : 'HUB_TestSessions',                    // buổi đào tạo test (không tính vào báo cáo)
    PREFIX : 'TEST-'
  },

  /** Chia sẻ tài liệu upload: 'domain' | 'anyone' | 'none' */
  MATERIAL_SHARING: 'domain',

  /** ★ v2 — Tốc độ & xem tài liệu */
  CACHE_TTL          : 300,    // giây — dữ liệu đọc từ Sheet
  MATERIAL_CACHE_TTL : 1800,   // giây — danh sách tài liệu mỗi buổi (xoá đệm ngay khi upload/xoá)
  MATERIAL_BUDGET_MS : 15000,  // ★ v2.4 — thời gian tối đa đọc 1 thư mục
  MATERIAL_MAX_FOLDERS: 80,    // ★ v2.4 — số thư mục con tối đa quét cho 1 buổi
  PREVIEW_FOLDER_NAME: 'MMH Training Hub — Preview cache (hệ thống, không xoá)',
  PREVIEW_MAX_MB     : 80,     // ★ v2.6 — xem trong Hub tối đa (tải từng phần)
  FILE_CHUNK         : 1572864,// ★ v2.6 — 1,5MB mỗi phần
  MATERIAL_MAX_FILES : 300,
  MATERIAL_DEPTH     : 3,      // quét thư mục con tối đa 3 cấp
  UPLOAD_CHUNK       : 8388608,// 8MB mỗi lần gửi (bội số 256KB theo chuẩn Drive)
  UPLOAD_MAX_MB      : 1024    // giới hạn 1 file (1GB)
};

/** Danh bạ MMH — dùng để khởi tạo HUB_Users lần đầu.
 *
 *  MÔ HÌNH VAI TRÒ (theo yêu cầu MMH):
 *    - Mọi PIC đều là 'trainer' — vừa tự tổ chức/đứng lớp đào tạo được,
 *      vừa là học viên của buổi đào tạo do người khác tổ chức.
 *      Trainer chỉ sửa được buổi đào tạo DO CHÍNH MÌNH phụ trách.
 *    - 'admin' (mmh.product) đóng được TẤT CẢ các vai: admin + trainer + học viên,
 *      sửa được mọi buổi đào tạo, và có bộ chuyển vai trò để test hệ thống.
 *    - 'audience' chỉ dành cho người chỉ học, không đứng lớp — Admin tự đặt
 *      trong màn hình Người dùng khi cần.
 *
 *  manager: email quản lý trực tiếp (nhận CC khi học viên được cấp chứng chỉ) */
var HUB_DIRECTORY = [
  // --- Board of Director -----------------------------------------------------
  {name:'Nguyen Ha', email:'nt.ha@mani.inc',            dept:'Board of Director',    position:'Director',                     role:'trainer', manager:'nt.ha@mani.inc'},
  // --- Vietnam Sales & Marketing --------------------------------------------
  {name:'Tuyen',     email:'tt.tuyen@mani.inc',         dept:'Sales & Marketing VN', position:'HOD Sales & Marketing',        role:'trainer', manager:'nt.ha@mani.inc'},
  {name:'Giang',     email:'mmh.product@mani.inc',      dept:'Product Team',         position:'Product Team Leader',          role:'admin',   manager:'tt.tuyen@mani.inc'},
  {name:'Thuong',    email:'marketing.mmh@mani.inc',    dept:'Marketing Team',       position:'Marketing Team Leader',        role:'trainer', manager:'tt.tuyen@mani.inc'},
  {name:'Duc Anh',   email:'marketing.mmh1@mani.inc',   dept:'Marketing Team',       position:'Marketing PIC',                role:'trainer', manager:'marketing.mmh@mani.inc'},
  {name:'Minh Trang', email:'mmh.admin@mani.inc',       dept:'Marketing Team',       position:'Marketing PIC',                role:'trainer', manager:'marketing.mmh@mani.inc'},   // ★ v3.6: thay Quynh Anh
  {name:'Minh Viet', email:'mmh.hanoi@mani.inc',        dept:'Dental Sale Team',     position:'Dental Sale Team Leader',      role:'trainer', manager:'tt.tuyen@mani.inc'},
  {name:'Vinh',      email:'mmh.danang@mani.inc',       dept:'Dental Sale Team',     position:'Sales Rep — Da Nang',          role:'trainer', manager:'mmh.hanoi@mani.inc'},
  {name:'Phuong',    email:'mmh.saigon@mani.inc',       dept:'Dental Sale Team',     position:'Sales Rep — Ho Chi Minh',      role:'trainer', manager:'mmh.hanoi@mani.inc'},
  {name:'Viet Ha',   email:'mmh.hanoi2@mani.inc',       dept:'Surgical Sale Team',   position:'Sales Rep — North',            role:'trainer', manager:'mmh.product@mani.inc'},
  {name:'Khang',     email:'mmh.saigon2@mani.inc',      dept:'Surgical Sale Team',   position:'Sales Rep — South',            role:'trainer', manager:'mmh.product@mani.inc'},
  {name:'Trang',     email:'marketing.mmh2@mani.inc',   dept:'Eyeless Sale Team',    position:'Sales Rep — Eyeless',          role:'trainer', manager:'tt.tuyen@mani.inc'},
  // --- Back office -----------------------------------------------------------
  {name:'Hoa',       email:'vtt.hoa@mani.inc',          dept:'Back Office',          position:'HOD Back Office',              role:'trainer', manager:'nt.ha@mani.inc'},
  {name:'Dam Ha',    email:'mmh.backoffice@mani.inc',   dept:'Stock Team',           position:'Stock Team Leader',            role:'trainer', manager:'vtt.hoa@mani.inc'},
  {name:'Hau',       email:'mmh.backoffice1@mani.inc',  dept:'Stock Team',           position:'Stock PIC',                    role:'trainer', manager:'mmh.backoffice@mani.inc'},
  {name:'Ngoc',      email:'mmh.hanoi1@mani.inc',       dept:'Back Office',          position:'Accounting & Import–Export',   role:'trainer', manager:'vtt.hoa@mani.inc'},
  {name:'Dam Viet',  email:'mmh.order@mani.inc',        dept:'Back Office',          position:'Purchasing & Sales Support',   role:'trainer', manager:'vtt.hoa@mani.inc'},
  // --- Thailand / Mani Asia --------------------------------------------------
  {name:'Dao',       email:'manithailand@mani.inc',     dept:'Thailand Surgical S&M',position:'HOD Thailand Surgical',        role:'trainer', manager:'nt.ha@mani.inc'},
  {name:'Yong',      email:'manithailand2@mani.inc',    dept:'Thailand Dental S&M',  position:'Sales PIC — Thailand',         role:'trainer', manager:'manithailand@mani.inc'},
  {name:'Sui',       email:'manithailand1@mani.inc',    dept:'Thailand Dental S&M',  position:'Sales PIC — Thailand',         role:'trainer', manager:'manithailand@mani.inc'},
  {name:'Man',       email:'manithailand3@mani.inc',    dept:'Thailand Dental S&M',  position:'Sales PIC — Thailand',         role:'trainer', manager:'manithailand@mani.inc'}
];

/** Nhóm người nhận dựng sẵn — khớp cột "Target Audience" của sheet Master */
var HUB_GROUPS = {
  'MMH - All member'     : ['mmh.admin','mmh.product','marketing.mmh1','marketing.mmh','marketing.mmh2','tt.tuyen','mmh.saigon2','mmh.hanoi2','mmh.hanoi','mmh.saigon','mmh.danang','vtt.hoa','mmh.hanoi1','mmh.order','mmh.backoffice','mmh.backoffice1'],
  'MMH - Sales team'     : ['mmh.saigon2','mmh.hanoi2','mmh.hanoi','mmh.saigon','mmh.danang','tt.tuyen','marketing.mmh2'],
  'MMH - Marketing team' : ['mmh.admin','mmh.product','marketing.mmh1','marketing.mmh','marketing.mmh2','tt.tuyen'],
  'MMH - Back office team':['vtt.hoa','mmh.hanoi1','mmh.order','mmh.backoffice','mmh.backoffice1'],
  'MMH - Sales Dental'   : ['mmh.hanoi','mmh.saigon','mmh.danang','tt.tuyen'],
  'MMH - Sales Surgical' : ['mmh.saigon2','mmh.hanoi2','tt.tuyen'],
  'MMH - Sales & MKT'    : ['mmh.saigon2','mmh.hanoi2','mmh.hanoi','mmh.saigon','mmh.danang','tt.tuyen','mmh.admin','mmh.product','marketing.mmh1','marketing.mmh','marketing.mmh2'],
  'MMH - Product Team'   : ['mmh.product','mmh.hanoi2','mmh.saigon2','marketing.mmh2'],
  'MMH - Leaders'        : ['nt.ha','tt.tuyen','vtt.hoa','mmh.product','marketing.mmh','mmh.hanoi','mmh.backoffice','manithailand']
};

/** Giá trị mặc định cho HUB_Config (Admin đổi được trên giao diện) */
var HUB_DEFAULT_CONFIG = {
  APP_TITLE       : 'MMH Training Hub',
  APP_SUBTITLE    : 'Hệ thống quản lý đào tạo — Mani Medical Hanoi',
  FISCAL_YEAR     : 'FY67',
  COLOR_PRIMARY   : '#003047',   // chỉ dùng cho chứng chỉ PDF
  COLOR_ACCENT    : '#3A5CAA',
  COLOR_HIGHLIGHT : '#FFE100',
  LOGO_TEXT       : 'MANI',
  DEFAULT_PASS_SCORE : '70',
  DEFAULT_DURATION_MIN : '15',
  DEFAULT_MAX_ATTEMPTS : '2',
  DEFAULT_DEADLINE_DAYS: '7',
  TARGET_AVG_SCORE : '80',       // ★ v2 — mục tiêu điểm TB toàn công ty
  FY_START_MONTH   : '9',        // ★ v2.2 — tháng bắt đầu năm tài chính (MANI: tháng 9)
  FY_BASE_YEAR     : '1959',     // ★ v2.2 — FY số = năm kết thúc − 1959 (T9/2025–T8/2026 = FY67)
  CERT_SIGNER_NAME : 'Nguyen Thi Thu Ha',
  CERT_SIGNER_TITLE: 'Director, Mani Medical Hanoi',
  ENABLE_CERT_EMAIL: 'true',
  ENABLE_CALENDAR  : 'true',
  ENABLE_AUTO_REMINDER : 'true', // ★ v2 — nhắc làm bài trước hạn
  REMINDER_DAYS_BEFORE : '1',
  APP_URL          : 'https://manimedicalhanoi.github.io/Training-Hub/',   // link hệ thống trong email
  ENABLE_DAY_REMINDER : 'true',  // ★ v3.0 — 8:30 sáng ngày đào tạo nhắc học viên
  ENABLE_WEEKLY_DIGEST: 'true'   // ★ v3.0 — thứ Hai nhắc các bài kiểm tra chưa hoàn thành
};


// ============================================================================
//  LOGO MANI (nhúng sẵn — dùng cho chứng chỉ PDF)
//  PNG 440x190px, đã tối ưu. Muốn thay logo khác: đặt LOGO_IMAGE_URL trong
//  sheet HUB_Config (URL ảnh công khai), hệ thống sẽ ưu tiên dùng URL đó.
// ============================================================================

var HUB_LOGO_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAbgAAAC+BAMAAAC1ygcpAAAAGFBMVEX/6hH/4QL/4QD94QDz1gAkIAABAAAAAADD9cHRAAAPrElE' +
  'QVR42u1d244bxxGtohbQrgKze7g2jDyRS8VBED9EtpI/SD4o/2mv7TwkARzxggBBYnnZ3RRg7wrQVB44fZ3qmeZyZGgXwxdR5HCm' +
  'T9epqlPVPbMAj/iFk8WjxVYjykcLjs4eLzqiyWP2uRHcCG4EN4IbwY3gRnAjuBHcCG4EN4IbwY3gRnAjuBHcCG4EN4L70F5nD3DM' +
  'hx65eoTgUAKpx2k5lKQAlwAAO/3IwKFQk2UFVQU7XYN+VOAqtX8uZxJgpeqteFyWq9TkiyWQkqvdBvrt9qDAoVpeLhSAXF1jVRIs' +
  'HxA4FLPLuaoIX11XhfHy4YAT+8/mpiJzc12VpoIHo1Cq/cu5kWCmu2JsD8ZyqJ7PjQQSX23p0ckv8eRLLQHMTUkKsK8neH7+EAz3' +
  '9nOqAOjpCsqxPRTLics5AoC5OYKUDyWg4H5pAICmO/H4Sh7xsUAA0PVRhisEF+wyysThqvuAcJsS6a7fK9ZwfzISAHDVRBN/OtIn' +
  'g+tXBOrEE6gCw9HUGm5IhYK4cO/ZMgrFzL2vN8wBs8BytdYdF1hT1nDmR6la41nTyT730pngKzYW7//iD5DtA+TlC/+f73XHBWql' +
  'mFB5MBwpao3nZn26z6k+h3cHEOPzOBHFtBQtL0KYGQkAINyp/Xh2XTm90HISmzeap21lXZxYlpgFuvf8GewFNGP3N3MEANA7qdLx' +
  '6NN9TlwGMFlWzt3gif29rgIgpjPxmjYtDr/GHbXHo09P4hPTDf7KXcOwV5shmzX8CRbtdyEtAABo6s+NzflIDKxQNONSlR88oyFw' +
  'H37G8haZd54WMk1pqEvSXKHPBYF8gu3RmTn2aIDge1lzRxh7CZwnmcKy0iWCaDyGTgQXOol8x8XKwKV0z/ecbYLRYvv3lhaKjiVZ' +
  'ES0D8USym5XsACo8puTmOR24F+67L3ckLUWXT4Ss5Dwc90L2if7gUu++5TkdJlB7QvNuAMt1I1+GsXSrO1UzAMC8jVXKnOXElWkb' +
  'yR2txLDRUnbGwl7w/FSJPPaq7cw4IC3DHM7oIwzkB3O19K4MJmSEeJMU7xgbJFC5L8vhpVUB99aC/cQEkfkdHJ0oWtSIR2x/XTsV' +
  'SYtBo6XO53Dcz7vrMlnpHmInsmRmeg2tiwRKmeVkx8TKSZihgVoqnWb9hsPA+KKOXUIyPmfPSEYPG1DSsS9NT5gv6OlgPrg2sjYy' +
  'khzO58Is1Dt2JhEssFeGy4hzUciSHXViT7AsLHlkdmgxKxkn8OUOYS6ZJAFS6tLJ1gMElHA0if5KWMmodOdyhpsqLssH0+dxE5MJ' +
  'jT7dchGtYlHf8qhUpfsDaKpB9ss7APHRN23cvNCqxQAlTx7qLIqVXA53HYHdE5mRKNjxX4tblarB42gprjpi5cz0/dgegHXx9AUC' +
  'jJHkBEP6XOLwgdclGZxzAisNqda5NJ60FrBnvuRVYbC8T55bRM2TeJxpkwH3zgpi4wNCXt4lhYHHrdvo+wRKETiZ94he9eG+12uZ' +
  '9ZlEYonKpL/P4NjqU8FhljSBXTJO4MsdVDZ9oemropg+IAU45HABJdR9ybnFUveVE05gTPuSEl/Oyq4I0OdzRfUc5kyaNEfa5PHl' +
  'Dmnhvo4lCO4l9EYUYlJ+T5OhTFtmv9mnlRptY3hyZrWXeS3yE01Ja4Ecg/edk60GCCg53cuxMv6EJj6ggNkUdy589mwIavgmw8n1' +
  'XNrMc51L2+fOCxTc/8a53JYwVxb4RI1cSdfkGH28GfrBySoH1rFSVbkyfcEyKMnhT1wZP7ECzTaXGZfwh/fu2ihJBSY+F/oMnrhM' +
  'GhD9AonZCW/XtCxwU0NNJx1NcwhxOKpCUhaBy4Rl32g2K3IqPRk25kshZvZ2aUB0Sou4w2mjBwsotEnDfDO9uZEH5Y7Y6sCymJm9' +
  'WqVeiZ1NBjzVci4a+yXpAygfK71q1Gm50wxEqyIf2dvV+/YqHSe0aEhaRvOFE+FYecVfzbsc7gQA1OywwpTtgpUpESiD1HP2Cuvo' +
  '7GZhWalyHm5d7kDcIKcsJNNkoKk30KGkY5sMXqBsBtCWLZ+TsSSebtwgIvKE5U7MKszM3naa1EAOiOYOr4coebi6xAcLs5IZmV75' +
  'cifOJfmFEZ0YXXQJlNNp6Xxb63lwfomWlUGFHfucmPkOQ9FmOwJti11x6MEjdBmpV7OcFVissYCLBxMNQEtbCYktsiodUaQdBrYs' +
  'cIrDvAvYUWUn+7I4h5eA8zwwB3eTALj/o/3stTQu4sd50Gkvu/WHutmrAEhbN5trHaydaWY8NEC0lI4zzXwLCSAraVlp/NJhRB6f' +
  'CPRGNv+y/usVh6CpibIrl8P9b7d6sIAigjwVNJrFRmdc3PVX7NafrlU+ax4dZTxOvcnhAoovF2nr40kYKwXv4bgn32FIySCzIsEa' +
  '/1DSyY6eYQEtzwosxlDVLn9QbUB8zHq4L3dIUzycsET0pJwCgHnzRbakSya7t8lQ5HPO6Zxl5hErfYcq3PsTlDvrzrjmV0G2OiAg' +
  'ShmwhptsfbrlMDyXdQTPytciWN4wbLkTFKrIJeJ4FcQcwKIW2ufw0EhucaIWJwcUp+QUQH2YQYNXNlZODfSWO1Mf1bTukncQbtdE' +
  'GVw82Bl1zOaBPnCiCroxdmgfOe2hNtp35ogtdwLD+aDHBIMmZrhtMxMT4Jb3ESgF9ZxvMriQdeZW/3aCF4BphyGNOL4s8KWbOjgo' +
  'MCWdbqvBAoFyvwV/t1ViakKiqHy5k1qJS8qH4ZI/hl07K9xqWRZQZHBlStKUrjchv4JtGuj7taK9Uh/lcEy2T2+b01dz3XTyY4Hi' +
  'fmvoVHDeS4Jmsm3l4U5ol+Zy5U7t/UVq2VfoOyAYROHw2kcIlD5w4cYtjVY52+0J068OXtnWzWJmP8QfPVtvfsuvFkSolL1itf6s' +
  'K3gQnE5Lm4UIACieeV1rSojbKndA3Cy7dGGQqA+yGtWL5od+4yXdT6D0ggtrtTQgY9zjDj3clzv4vDMGhzuACQBAuxBXbf9sJzH4' +
  'pfPl3RDasp1HIWRlsADlPdyv7sQx1JG84qkBAEDG4n3RfIV8XJSnVuK+MU9SA0S0bFjZGh3Em9mqMmr4nXhNuAoWPQOhhUfk8N48' +
  'V+XPdWhGcnqof/Ns2/m8MnNlQnWvKHKMz0WLxqHXNbESOA9HWSoBfSfBmceWdBUzsfLjsEA61XIyOld4G5JWWkdG8Ns0gttf+mqN' +
  'tuF9r1Vx5jLFTYYj5NdWJz1ebGpw7qaBI24kSBfIgqhbMSryqB3Fk8ImQ5v9rpej09GV7B91Bm9lSRKtngK3TYMG8LmgDk8CQK0p' +
  'X1z37r1pxXEvsajAzEU5vL+eixyB2qxkBIrfzNY7yJAaDm56JwS3ClJ0o/+kzPGpCWG+fJxuW1OvC1Mb23/yCMxac1VsQueSDv1Z' +
  'WaC2juWkunu+EZP/9gU3EjhaNgwOJVYq89Q940mf5eze8Ob2Zy8fLStx0iJP+0aCIwQKF+XpXqsg/QFFuqZUPKX+fnRHnpu29lId' +
  'iid9BTd8iH41SEXLRmfdmcCScJfO266F344OJ6LA9xpL8ZWukjkj+XaV1idbzupyO3KrnLFjR49euFsV28dcoU3zBLlK1zx5kSOl' +
  'V4PmZFpajVDrNIN7VqYZy99IgD/8LT3hv//aHLTr6hrEdA6NJI8KKJ3gXLPANXmaaWzRNJx663JUv0l5iZeZUSY62ETfc0aik8HZ' +
  'S5jXlpVPelkZaC+xoWzbC9McHgQoV9K1mgzHCZTOVGBvNvWtxyYMhB3y9mY2q9jMWvZHcMHKu2yTXuYbA0dHy+ZcadznWOlG6++b' +
  '5gaAcY8pc8NHKD+ir9yiCUl9muXsVpNggZHCGpy3hWs1T9sVVxCZkq3f0Z79ePtMIDWPajJ0Ws72LGn6r3ysJOKpnPSs2q2upA5P' +
  'rhDeNX/0ve9Flmt2AJl1sPXP6OgWAWZnmIxbLN2yy936p5NaUXPUOGoVpBtc0ywgkZIQo5YhsVRu58ZopFZKynZJkQAiNtr2brXs' +
  'AWe3MJudvzBN284Ub7Dz8UywTQ6KKvDsU1QC00zboq20PJj0sZLEKuGAjkN8Io/mXYkg8VEnptJlcxM+WWgL92sydIFrNouGhjvw' +
  'JWalGweauNxhM1G6jdBGH9UlQPT9Cp4OcE3Jqaap4bgQ73SoK3dyR8WVohNqBrI9IXYVpAzcWT4ZSwSg6lWcwEmYG6mYsC3quNzp' +
  'u1tDhglfJM0myuRR0a7+7mO5al8ZADK7a5EIdoqXV1zYPkQfu9htMokg3n7fJHyzEtnCIDKSPK4qyIBDtZxLIDN9FfcMjG5HQe01' +
  'h1hoGzdyMxsM1j3HpX1wEGHqewuUDC1RXH6hpcLpdWtBG1cxK0E/mXvFPutYCYe43A36m8zBneGwMIezlsNK7GdKqGq6bu1sIpUu' +
  '+qFtCsig3NHrDIGmbZXAZw1nYUaglCoyznKkJi/nGqvdetV+8m57luWmkgBAs+8A7fMLMbPuSW4zOzmXI2ofTEJJlWu8ZJ5lUAQO' +
  'r3C2gGqndhvmqcLr9KJUmwoAQBKIT6zerbMtDtNsLqG5sXcOshS2x9URpaD94VHgEFHWKyC9wjY2Ykxi3vzh8O9c1yuXH3JT6w4B' +
  'WjYP9HrNGMkdFxrJn/6+4IheNdmAe0Qm9+DTw8ZkRKlf9V7PN3tQ2sfMfU9dx3V/drTPVYRa5tJwO3uS2C4O6uS7noevRp1H3XTd' +
  'zTvWgZwCV8xv4f5PJlVdv2Zmr+GlJFmwH8s/Uu7w7CKiFas2ONqoIy03yKOOD9VY+iyD7pc92tRbDe/pNQQ4+3hlsTziDimxBL6i' +
  'GvA1yOPF7/QzOAcAU8NtqeHefonnAGB++vYWPmTLWdMhzkpNh2IpJFtRfXCWgzv9jC4AnsqfCk0n91/enQPQxeqf789wAz07naa7' +
  'SgPgfmaKipLKvCQJQObm+j0abqhH+t/t7hbmHJ5WP/2vhJQ/P//d3TmQmf4d9YcPDqr/PvvUnKO5+s/Fbb/D/er3dxLITK+3P8MD' +
  'AHcrNs8+1RdP9+frqgdd9XT/+acXoO6m63/I2/cJbrBH+hvxNSwUCgHdf30FpZq8nBuCqv5mVSl4EODI0Nf1kjRc6VXuTwKhBCC1' +
  'vJxrqGC1W79nbEP+jRAU29u3v74wi4v1LfJ8u729fbu8nJvqYrVjq8UP1HIAZMQr2lVX8BwV/+D/KwCsrgDqlao3+N6xAU6ObJdB' +
  'tz/BTFYAQGrNgqsO4n4FWFJBnDjZNCg4AOtts+6/BfELQAMgGvgPoKimq77rLlTpvTNyaJ/rLyh/GUhDa8sP9DWCG8GN4EZwI7gR' +
  '3AhuBDeCG8GN4EZwI7gR3AhuBDeCG8GN4EZwI7gR3DCv/wPKtJCmM5zCBwAAAABJRU5ErkJggg==';

/** Thẻ <img> logo dùng trong chứng chỉ */
function hubLogoTag(widthPx, cfg) {
  var url = (cfg && cfg.LOGO_IMAGE_URL) ? String(cfg.LOGO_IMAGE_URL).trim() : '';
  var src = url ? url : ('data:image/png;base64,' + HUB_LOGO_B64);
  var w = widthPx || 132;
  var h = Math.round(w * 190 / 440);
  return '<img src="' + src + '" width="' + w + '" height="' + h +
         '" alt="MANI" style="display:block;margin:0 auto;border:0">';
}



// ============================================================================
//  2. ROUTER
// ============================================================================

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var out = hubDispatch(p.action || 'ping', p);
  return hubReply(out, p.callback);
}

function doPost(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  // payload lớn được gửi dạng JSON trong trường "payload"
  if (p.payload) {
    try {
      var extra = JSON.parse(p.payload);
      for (var k in extra) { if (k !== 'action') p[k] = extra[k]; }
    } catch (err) {
      return hubReply({ok:false, error:'Payload không hợp lệ: ' + err.message}, p.callback);
    }
  }
  var out = hubDispatch(p.action || 'ping', p);
  return hubReply(out, p.callback);
}

function hubReply(obj, callback) {
  var json;
  try { json = JSON.stringify(obj); }
  catch (err) { json = JSON.stringify({ok:false, error:'Lỗi đóng gói dữ liệu: ' + err.message}); }
  if (callback) {
    callback = String(callback).replace(/[^\w$.]/g, '');      // chỉ nhận tên hàm hợp lệ
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/** Bảng định tuyến. auth: 0 = công khai, 1 = cần đăng nhập,
 *  2 = cần quyền trainer trở lên, 3 = chỉ admin */
var HUB_ROUTES = {
  // public
  'ping'            : {fn:'apiPing',            auth:0},
  'requestOtp'      : {fn:'apiRequestOtp',      auth:0},
  'verifyOtp'       : {fn:'apiVerifyOtp',       auth:0},
  'login'           : {fn:'apiLogin',           auth:0},
  // authenticated
  'me'              : {fn:'apiMe',              auth:1},
  'logout'          : {fn:'apiLogout',          auth:1},
  'changePin'       : {fn:'apiChangePin',       auth:1},
  'bootstrap'       : {fn:'apiBootstrap',       auth:1},
  'pulse'           : {fn:'apiPulse',           auth:1},   // ★ v2
  'listSessions'    : {fn:'apiListSessions',    auth:1},
  'getSession'      : {fn:'apiGetSession',      auth:1},
  'sessionFull'     : {fn:'apiSessionFull',     auth:1},   // ★ v2
  'listMaterials'   : {fn:'apiListMaterials',   auth:1},
  'fileContent'     : {fn:'apiFileContent',     auth:1},   // ★ v2 (giữ tương thích)
  'fileMeta'        : {fn:'apiFileMeta',        auth:1},   // ★ v2.6 — chuẩn bị file, trả số phần
  'fileChunk'       : {fn:'apiFileChunk',       auth:1},   // ★ v2.6 — tải 1 phần
  'fileConvert'     : {fn:'apiFileConvert',     auth:1},   // ★ v3.1 — chuyển đổi từng bước
  'slidePages'      : {fn:'apiSlidePages',      auth:1},   // ★ v3.1 — danh sách slide (xem dạng ảnh)
  'slideThumbs'     : {fn:'apiSlideThumbs',     auth:1},   // ★ v3.1 — ảnh từng slide
  'trackProgress'   : {fn:'apiTrackProgress',   auth:1},   // ★ v2
  'notifications'   : {fn:'apiNotifications',   auth:1},   // ★ v2
  'markRead'        : {fn:'apiMarkRead',        auth:1},   // ★ v2
  'getStats'        : {fn:'apiGetStats',        auth:1},
  'myCertificates'  : {fn:'apiMyCertificates',  auth:1},
  'quizStart'       : {fn:'apiQuizStart',       auth:1},
  'quizSubmit'      : {fn:'apiQuizSubmit',      auth:1},
  'myQuizStatus'    : {fn:'apiMyQuizStatus',    auth:1},
  // trainer
  'saveSession'     : {fn:'apiSaveSession',     auth:2},
  'deleteSession'   : {fn:'apiDeleteSession',   auth:2},
  'createFolder'    : {fn:'apiCreateFolder',    auth:2},
  'uploadMaterial'  : {fn:'apiUploadMaterial',  auth:2},
  'uploadInit'      : {fn:'apiUploadInit',      auth:2},   // ★ v2.1
  'uploadChunk'     : {fn:'apiUploadChunk',     auth:2},   // ★ v2.1
  'uploadStatus'    : {fn:'apiUploadStatus',    auth:2},   // ★ v2.1
  'createSubfolder' : {fn:'apiCreateSubfolder', auth:2},   // ★ v2.1
  'renameMaterial'  : {fn:'apiRenameMaterial',  auth:2},   // ★ v2.1
  'setFileRequired' : {fn:'apiSetFileRequired', auth:2},   // ★ v2.3
  'deleteMaterial'  : {fn:'apiDeleteMaterial',  auth:2},
  'shareMaterials'  : {fn:'apiShareMaterials',  auth:2},   // ★ v2
  'announce'        : {fn:'apiAnnounce',        auth:2},   // ★ v2
  'sendInvite'      : {fn:'apiSendInvite',      auth:2},
  'previewInvite'   : {fn:'apiPreviewInvite',   auth:2},   // ★ v2
  'saveQuiz'        : {fn:'apiSaveQuiz',        auth:2},
  'getQuiz'         : {fn:'apiGetQuiz',         auth:2},
  'publishQuiz'     : {fn:'apiPublishQuiz',     auth:2},
  'quizResults'     : {fn:'apiQuizResults',     auth:2},
  'sessionResults'  : {fn:'apiSessionResults',  auth:2},   // ★ v2
  'resendCert'      : {fn:'apiResendCert',      auth:2},
  // admin
  'listUsers'       : {fn:'apiListUsers',       auth:3},
  'saveUser'        : {fn:'apiSaveUser',        auth:3},
  'deleteUser'      : {fn:'apiDeleteUser',      auth:3},
  'resetPin'        : {fn:'apiResetPin',        auth:3},
  'saveConfig'      : {fn:'apiSaveConfig',      auth:3},
  'getLogs'         : {fn:'apiGetLogs',         auth:3},
  'clearCache'      : {fn:'apiClearCache',      auth:3},   // ★ v2
  'runSetup'        : {fn:'apiRunSetup',        auth:3},
  'diag'            : {fn:'apiDiag',            auth:3},   // ★ v2.2 — đo tốc độ từng phần
  'selfTest'        : {fn:'apiSelfTest',        auth:1},   // ★ v2.5 — chạy thử chức năng trên máy chủ
  'testReset'       : {fn:'apiTestReset',       auth:3},   // ★ v3.0 — xoá dữ liệu test
  'testJobs'        : {fn:'apiTestJobs',        auth:3},   // ★ v3.0 — chạy thử nhắc lịch / nhắc bài KT
  'clientLog'       : {fn:'apiClientLog',       auth:1},   // ★ v2.2 — trình duyệt báo lỗi kết nối
  // ★ v3.4 — cầu nối Report Hub (tự kiểm tra khoá + quyền Leader trong hàm)
  'rhMeta'          : {fn:'apiRhMeta',          auth:0},
  'rhSaveSession'   : {fn:'apiRhSaveSession',   auth:0},
  'rhPreviewInvite' : {fn:'apiRhPreviewInvite', auth:0},
  'rhSendInvite'    : {fn:'apiRhSendInvite',    auth:0},
  'rhEnsureFolder'  : {fn:'apiRhEnsureFolder',  auth:0},
  'rhSessions'      : {fn:'apiRhSessions',      auth:0},   // ★ v3.5 — buổi đào tạo cho lịch Report Hub
  'rhMaterials'     : {fn:'apiRhMaterials',     auth:0},   // ★ v3.7 — tài liệu của buổi
  'rhUploadInit'    : {fn:'apiRhUploadInit',    auth:0},   // ★ v3.7 — kéo thả tải tài liệu lên folder buổi
  'rhUploadChunk'   : {fn:'apiRhUploadChunk',   auth:0},
  'rhUploadStatus'  : {fn:'apiRhUploadStatus',  auth:0},
  'rhMyChecks'      : {fn:'apiRhMyChecks',      auth:0},   // ★ v3.10 — buổi đào tạo của tôi còn thiếu tài liệu
  // ★ v3.12 — đăng nhập Report Hub bằng email + mã 6 số (file RH_Auth.gs)
  'rhAuthStart'     : {fn:'apiRhAuthStart',     auth:0},
  'rhAuthVerify'    : {fn:'apiRhAuthVerify',    auth:0},
  'rhAuthMe'        : {fn:'apiRhAuthMe',        auth:0},
  // ★ v3.13 — trang phân quyền Report Hub (tự kiểm phiên + vai trò trong hàm)
  'rhAdminList'     : {fn:'apiRhAdminList',     auth:0},
  'rhAdminSave'     : {fn:'apiRhAdminSave',     auth:0},
  'rhAdminKick'     : {fn:'apiRhAdminKick',     auth:0}
};

/** Lấy tham chiếu hàm theo tên — an toàn cho cả runtime V8 và Rhino */
function hubFnRef(name) {
  try { if (typeof globalThis !== 'undefined' && globalThis[name]) return globalThis[name]; } catch (e) {}
  try { if (this && this[name]) return this[name]; } catch (e) {}
  try { return eval(name); } catch (e) { return null; }
}

/** ★ v2.4 — Đánh dấu lượt đang chạy (để chẩn đoán lượt chạy dở / bị Google cắt) */
var HUB_QUIET = {ping:1, clientLog:1, pulse:1, trackProgress:1, markRead:1};
function hubRunMark(action, p, t0) {
  if (HUB_QUIET[action]) return '';
  try {
    var id = hubUid('X'), sc = hubSC();
    sc.put('run:' + id, JSON.stringify({a: action, s: hubNorm(p.sid).substring(0, 30), t: t0}), 900);
    var idx = [];
    try { idx = JSON.parse(sc.get('runidx') || '[]'); } catch (e) {}
    idx.push(id);
    sc.put('runidx', JSON.stringify(idx.slice(-60)), 21600);
    return id;
  } catch (e) { return ''; }
}
function hubRunDone(id) { if (id) { try { hubSC().remove('run:' + id); } catch (e) {} } }
function hubRunning() {
  try {
    var sc = hubSC(), idx = JSON.parse(sc.get('runidx') || '[]');
    var got = sc.getAll(idx.map(function(id){ return 'run:' + id; })), now = Date.now(), out = [];
    for (var k in got) { try { var r = JSON.parse(got[k]); out.push({action: r.a, sid: r.s, sec: Math.round((now - r.t) / 1000)}); } catch (e) {} }
    return out.sort(function(a, b){ return b.sec - a.sec; });
  } catch (e) { return []; }
}

/** ★ v3.0 — Ngữ cảnh 1 lượt gọi: test = đang ở Chế độ Test (chỉ Admin) */
var HUB_CTX = {test:false, tester:null};
function hubIsTestSid(sid) { return String(sid || '').indexOf(HUB.TEST.PREFIX) === 0; }

function hubDispatch(action, p) {
  var t0 = Date.now();
  HUB_CTX = {test:false, tester:null};
  var runId = hubRunMark(action, p, t0);
  try {
    var route = HUB_ROUTES[action];
    if (!route) return {ok:false, error:'Không tìm thấy chức năng: ' + action};

    var user = null;
    if (route.auth > 0) {
      user = hubResolveToken(p.token);
      if (!user)                        return {ok:false, error:'Phiên đăng nhập đã hết hạn.', code:'AUTH'};
      if (route.auth >= 2 && !hubIsTrainer(user)) return {ok:false, error:'Bạn không có quyền thực hiện thao tác này.', code:'FORBIDDEN'};
      if (route.auth >= 3 && user.role !== 'admin') return {ok:false, error:'Chức năng này chỉ dành cho Admin.', code:'FORBIDDEN'};
      if (hubBool(p.test) || hubIsTestSid(p.sid)) {
        if (user.role !== 'admin') return {ok:false, error:'Chế độ Test chỉ dành cho Admin.', code:'FORBIDDEN'};
        HUB_CTX.test = true; HUB_CTX.tester = user;
      }
      if (user.role === 'admin' && hubBool(p.asLearner)) user.asLearner = true;   // Admin đóng vai học viên
    }
    var fn = hubFnRef(route.fn);
    if (typeof fn !== 'function') return {ok:false, error:'Chức năng chưa được cài đặt: ' + route.fn};
    var res = fn(p, user);
    if (res && res.ok === undefined) res.ok = true;
    var ms = Date.now() - t0;
    if (res && typeof res === 'object') { res._ms = ms; res._v = HUB.VERSION; }
    try { console.log('[hub] ' + action + ' ' + ms + 'ms ' + (res && res.ok ? 'ok' : 'fail') + (user ? ' ' + hubPrefix(user.email) : '')); } catch (e) {}
    if (ms > 12000) hubLog('WARN', 'SLOW ' + action, ms + ' ms' + (user ? ' · ' + hubPrefix(user.email) : ''), p.sid ? 'sid=' + p.sid : '');
    return res;
  } catch (err) {
    try { console.error('[hub] ' + action + ' ERROR ' + ((err && err.message) || err)); } catch (e) {}
    hubLog('ERROR', action, (err && err.message) || String(err), (err && err.stack) || '');
    return {ok:false, error:(err && err.message) || String(err), _ms: Date.now() - t0};
  } finally {
    hubRunDone(runId);
  }
}


// ============================================================================
//  3. TIỆN ÍCH CHUNG + BỘ NHỚ ĐỆM + KHOÁ GHI
// ============================================================================

/** (a) Bộ nhớ trong 1 lần chạy — cho đối tượng không tuần tự hoá được
 *      (Spreadsheet, Sheet, Folder). */
var HUB_MEM = {};
function hubCached(key, fn) {
  if (!HUB_MEM.hasOwnProperty(key)) HUB_MEM[key] = fn();
  return HUB_MEM[key];
}

/** (b) Bộ nhớ đệm dùng chung giữa các lần gọi (CacheService, chia nhỏ
 *      thành từng mảnh ≤ 25.000 ký tự để vượt giới hạn 100KB/khoá).
 *      Mỗi khoá có "thế hệ" (generation): ghi dữ liệu → đổi thế hệ →
 *      mọi bản đệm cũ tự vô hiệu, không bị đọc lại dữ liệu cũ. */
var HUB_GEN_SEEN = {};
function hubSC() { return CacheService.getScriptCache(); }

function hubGen(key) {
  try {
    var got = hubSC().getAll(['gen:*', 'gen:' + key]);
    return (got['gen:*'] || '0') + '.' + (got['gen:' + key] || '0');
  } catch (e) { return '0.0'; }
}

function hubCacheGet(key) {
  try {
    var gen = hubGen(key);
    HUB_GEN_SEEN[key] = gen;
    var base = 'd:' + key + ':' + gen;
    var sc = hubSC();
    var head = sc.get(base + ':n');
    if (!head) return null;
    var n = parseInt(head, 10), keys = [];
    for (var i = 0; i < n; i++) keys.push(base + ':' + i);
    var got = sc.getAll(keys), s = '';
    for (var j = 0; j < n; j++) {
      var part = got[base + ':' + j];
      if (part === undefined || part === null) return null;
      s += part;
    }
    return JSON.parse(s);
  } catch (e) { return null; }
}

function hubCachePut(key, obj, ttl) {
  try {
    var gen = HUB_GEN_SEEN[key] || hubGen(key);
    var base = 'd:' + key + ':' + gen;
    var s = JSON.stringify(obj);
    var size = 25000, n = Math.max(1, Math.ceil(s.length / size));
    if (n > 60) return;                         // quá lớn (>1,5 triệu ký tự) — bỏ qua đệm
    var map = {};
    for (var i = 0; i < n; i++) map[base + ':' + i] = s.substr(i * size, size);
    map[base + ':n'] = String(n);
    hubSC().putAll(map, Math.min(ttl || HUB.CACHE_TTL, 21600));
  } catch (e) {}
}

function hubCacheBust(key) {
  try { hubSC().put('gen:' + key, String(Date.now()) + String(Math.floor(Math.random() * 1000)), 21600); } catch (e) {}
}

/** Đọc dữ liệu có đệm: bộ nhớ lần chạy → CacheService → đọc Sheet */
function hubData(key, fn, ttl) {
  if (HUB_MEM.hasOwnProperty(key)) return HUB_MEM[key];
  var v = hubCacheGet(key);
  if (v === null) {
    v = fn();
    hubCachePut(key, v, ttl);
  }
  HUB_MEM[key] = v;
  return v;
}

/** Xoá đệm: 1 khoá, hoặc TẤT CẢ khi không truyền khoá.
 *  Mọi thao tác GHI đều phải gọi hàm này cho dữ liệu tương ứng. */
function hubCacheClear(key) {
  if (key === 'sessions' && HUB_CTX.test) key = 'sessionsT';
  if (!key) {
    for (var k in HUB_MEM) {
      // giữ lại đối tượng Spreadsheet/Sheet/Folder (không phải dữ liệu)
      if (HUB_MEM.hasOwnProperty(k) && !/^(ss|reportSheet|quizFile|qsheetsReady|pvFolder|tz|sh[A-Z])/.test(k)) delete HUB_MEM[k];
    }
    hubCacheBust('*');
    return;
  }
  delete HUB_MEM[key];
  hubCacheBust(key);
}

/** ★ v3.0 — Gửi email: ở Chế độ Test mọi email chỉ tới người đang test, kèm ghi chú người nhận thật */
function hubMail(o) {
  if (HUB_CTX.test && HUB_CTX.tester) {
    var real = [o.to, o.cc].filter(Boolean).join(', ');
    o.htmlBody = '<div style="background:#FFF7C2;border:1px solid #F3DC79;border-radius:8px;padding:10px 14px;font:13px Arial,sans-serif;color:#5C4800;margin:0 0 12px">' +
      '<b>EMAIL THỬ NGHIỆM — Chế độ Test</b><br>Khi chạy thật, email này gửi tới: ' + hubEsc(real || '(không có)') + '</div>' + (o.htmlBody || '');
    if (o.body) o.body = '[EMAIL THỬ NGHIỆM — người nhận thật: ' + real + ']\n\n' + o.body;
    o.to = hubMailOf(HUB_CTX.tester.email);
    delete o.cc; delete o.bcc;
    o.subject = '[TEST] ' + o.subject;
  }
  MailApp.sendEmail(o);
}

/** Khoá ghi — tránh 2 người ghi đè lên nhau. Lồng nhau an toàn. */
var HUB_LOCK_DEPTH = 0;
function hubWithLock(fn) {
  if (HUB_LOCK_DEPTH > 0) return fn();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây.');
  HUB_LOCK_DEPTH++;
  try {
    return fn();
  } finally {
    HUB_LOCK_DEPTH--;
    try { SpreadsheetApp.flush(); } catch (e) {}
    lock.releaseLock();
  }
}

/** ID hợp lệ của Google Sheet: 25+ ký tự chữ/số/gạch, và KHÔNG phải ID ví dụ */
function hubIsValidSheetId(id) {
  id = hubNorm(id);
  if (!id) return false;
  if (id.indexOf('PASTE_') === 0) return false;
  if (id.indexOf('...') >= 0) return false;
  if (id.toLowerCase().indexOf('abcdefghijklmnopqrstuvwxyz') >= 0) return false;
  return /^[a-zA-Z0-9_-]{25,}$/.test(id);
}

/** Tìm file Training Master trên Drive theo tên (dùng khi chưa điền ID) */
function hubSearchMasterFiles() {
  var out = [];
  var seen = {};
  var names = [HUB.MASTER_FILE_NAME, 'MMH - Training Master', 'Training Master'];
  for (var i = 0; i < names.length; i++) {
    var it = DriveApp.getFilesByName(names[i]);
    while (it.hasNext()) {
      var f = it.next();
      if (seen[f.getId()]) continue;
      if (f.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
      seen[f.getId()] = true;
      out.push({id: f.getId(), name: f.getName(), url: f.getUrl()});
    }
    if (out.length) break;
  }
  return out;
}

function hubResolveMasterId() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('HUB_MASTER_ID');
  if (hubIsValidSheetId(cached)) return cached;

  if (hubIsValidSheetId(HUB.MASTER_SPREADSHEET_ID)) {
    props.setProperty('HUB_MASTER_ID', HUB.MASTER_SPREADSHEET_ID);
    return HUB.MASTER_SPREADSHEET_ID;
  }
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      props.setProperty('HUB_MASTER_ID', active.getId());
      return active.getId();
    }
  } catch (e) {}

  var found = hubSearchMasterFiles();
  if (found.length === 1) {
    props.setProperty('HUB_MASTER_ID', found[0].id);
    return found[0].id;
  }
  if (found.length > 1) {
    throw new Error(
      'Tìm thấy ' + found.length + ' file trùng tên "' + HUB.MASTER_FILE_NAME + '". ' +
      'Hãy chọn đúng 1 ID và điền vào MASTER_SPREADSHEET_ID:\n' +
      found.map(function(f){ return '  • ' + f.id + '  →  ' + f.url; }).join('\n')
    );
  }
  throw new Error(
    'CHƯA ĐIỀN ID FILE GOOGLE SHEET.\n\n' +
    'Cách lấy: mở file "' + HUB.MASTER_FILE_NAME + '", nhìn thanh địa chỉ —\n' +
    'docs.google.com/spreadsheets/d/<<ID NẰM Ở ĐÂY>>/edit\n' +
    'Copy đoạn ID đó, dán vào dòng MASTER_SPREADSHEET_ID ở đầu Code.gs.'
  );
}

function hubSS() {
  return hubCached('ss', function(){
    var id = hubResolveMasterId();
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      PropertiesService.getScriptProperties().deleteProperty('HUB_MASTER_ID');
      throw new Error(
        'Không mở được Google Sheet với ID: ' + id + '\n' +
        '1. Kiểm tra lại MASTER_SPREADSHEET_ID ở đầu Code.gs.\n' +
        '2. Tài khoản chạy script phải có quyền mở file đó.\n' +
        '(Chi tiết lỗi: ' + e.message + ')'
      );
    }
  });
}

/** Chạy hàm này để kiểm tra script đã được cấp đủ quyền chưa. */
function kiemTraQuyen() {
  var r = [];
  try {
    var quota = MailApp.getRemainingDailyQuota();
    r.push('✔ Gửi email: OK (còn ' + quota + ' email trong hạn mức hôm nay)');
  } catch (e) { r.push('✘ Gửi email: THIẾU QUYỀN — ' + e.message); }

  try { var ss = hubSS(); r.push('✔ Google Sheet: OK — "' + ss.getName() + '"'); }
  catch (e) { r.push('✘ Google Sheet: ' + e.message.split('\n')[0]); }

  try {
    DriveApp.getFolderById(HUB.DRIVE.PARENT).getName();
    DriveApp.getFolderById(HUB.DRIVE.CERTIFICATE).getName();
    r.push('✔ Google Drive: OK (folder đào tạo + folder chứng chỉ)');
  } catch (e) { r.push('✘ Google Drive: THIẾU QUYỀN — ' + e.message); }

  try {
    var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true
    });
    r.push(res.getResponseCode() === 200
      ? '✔ Drive API (chuyển PPTX/DOCX sang PDF để xem trong Hub): OK'
      : '✘ Drive API: mã lỗi ' + res.getResponseCode() + ' — kiểm tra appsscript.json');
  } catch (e) { r.push('✘ Drive API / UrlFetch: THIẾU QUYỀN — ' + e.message); }

  try { ScriptApp.getProjectTriggers(); r.push('✔ Trigger nhắc việc: OK'); }
  catch (e) { r.push('✘ Trigger: THIẾU QUYỀN script.scriptapp — ' + e.message); }

  try { r.push('✔ Tài khoản: ' + (Session.getEffectiveUser().getEmail() || '(ẩn danh)')); } catch (e) {}

  var loi = r.filter(function(x){ return x.indexOf('✘') === 0; });
  var msg = 'KIỂM TRA QUYỀN — MMH TRAINING HUB v' + HUB.VERSION + '\n\n' + r.join('\n');
  if (loi.length) {
    msg += '\n\n────────────────────────────────\n' +
      'CÒN THIẾU QUYỀN. Cách cấp lại:\n' +
      '1. Project Settings → bật "Show appsscript.json manifest file in editor"\n' +
      '2. Mở appsscript.json → dán nội dung file appsscript.json đi kèm → Save\n' +
      '3. Chạy lại hàm kiemTraQuyen() → bấm Allow\n' +
      '4. Deploy → Manage deployments → Edit → Version: New version → Deploy\n' +
      '────────────────────────────────';
  } else {
    msg += '\n\n✅ ĐỦ QUYỀN — hệ thống chạy được bình thường.';
  }
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/** Chạy hàm này nếu không biết ID file — hệ thống tự tìm và in ra. */
function timIdFileTrainingMaster() {
  var found = hubSearchMasterFiles();
  var msg;
  if (!found.length) {
    msg = 'Không tìm thấy file Google Sheet nào tên "' + HUB.MASTER_FILE_NAME + '".';
  } else {
    msg = 'Tìm thấy ' + found.length + ' file:\n\n' +
      found.map(function(f, i){
        return (i + 1) + '. ' + f.name + '\n   ID : ' + f.id + '\n   URL: ' + f.url;
      }).join('\n\n');
  }
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function hubSheet(name, createIfMissing) {
  var ss = hubSS();
  var sh = ss.getSheetByName(name);
  if (!sh && createIfMissing) sh = ss.insertSheet(name);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + name);
  return sh;
}

function hubNorm(s) {
  return (s === null || s === undefined) ? '' : String(s).trim();
}

function hubKey(s) {
  return hubNorm(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Khoá so khớp chịu được dấu tiếng Việt: "Giang" = "giang" = "Giáng" */
function hubKeyV(s) {
  return hubDeaccent(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Bỏ dấu tiếng Việt — dùng cho tên file / tên folder */
function hubDeaccent(s) {
  s = hubNorm(s);
  var map = [
    [/[àáạảãâầấậẩẫăằắặẳẵ]/g,'a'], [/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g,'A'],
    [/[èéẹẻẽêềếệểễ]/g,'e'],       [/[ÈÉẸẺẼÊỀẾỆỂỄ]/g,'E'],
    [/[ìíịỉĩ]/g,'i'],             [/[ÌÍỊỈĨ]/g,'I'],
    [/[òóọỏõôồốộổỗơờớợởỡ]/g,'o'], [/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g,'O'],
    [/[ùúụủũưừứựửữ]/g,'u'],       [/[ÙÚỤỦŨƯỪỨỰỬỮ]/g,'U'],
    [/[ỳýỵỷỹ]/g,'y'],             [/[ỲÝỴỶỸ]/g,'Y'],
    [/đ/g,'d'],                   [/Đ/g,'D']
  ];
  for (var i = 0; i < map.length; i++) s = s.replace(map[i][0], map[i][1]);
  return s;
}

/** Làm sạch chuỗi để đặt tên file / folder Drive */
function hubSafeName(s, maxLen) {
  s = hubDeaccent(s).replace(/[\\\/:\*\?"<>\|\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  maxLen = maxLen || 60;
  return s.length > maxLen ? s.substring(0, maxLen).trim() : s;
}

function hubEsc(s) {
  return hubNorm(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Chuẩn hoá email về domain gửi đi (@mani.inc) */
function hubMailOf(email) {
  email = hubNorm(email).toLowerCase();
  if (!email) return '';
  var at = email.indexOf('@');
  var prefix = at === -1 ? email : email.substring(0, at);
  return prefix + '@' + HUB.SEND_DOMAIN;
}

/** Prefix email (phần trước @) — dùng làm khoá đối chiếu 2 domain */
function hubPrefix(email) {
  email = hubNorm(email).toLowerCase();
  var at = email.indexOf('@');
  return at === -1 ? email : email.substring(0, at);
}

function hubIsCompanyEmail(email) {
  email = hubNorm(email).toLowerCase();
  var at = email.lastIndexOf('@');
  return at > 0 && HUB.DOMAINS.indexOf(email.substring(at + 1)) >= 0;   // ★ v3.12 — đúng tên miền, không nhận "@mani.inc.xyz.com"
}

function hubTz() {
  return hubCached('tz', function(){
    try { return hubSS().getSpreadsheetTimeZone() || 'Asia/Bangkok'; }
    catch (e) { return 'Asia/Bangkok'; }
  });
}

function hubFmt(date, pattern) {
  if (!date) return '';
  var d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, hubTz(), pattern);
}

function hubToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = hubNorm(v);
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);           // dd/mm/yyyy
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);                         // yyyy-mm-dd (giờ địa phương)
  if (m2) return new Date(+m2[1], +m2[2] - 1, +m2[3]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function hubNum(v, fallback) {
  var n = parseFloat(v);
  return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}

function hubBool(v) {
  if (v === true) return true;
  var s = hubNorm(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'x';
}

function hubUid(prefix) {
  return (prefix || '') + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
}

function hubUniq(arr) {
  var seen = {}, out = [];
  (arr || []).forEach(function(x){ if (x && !seen[x]) { seen[x] = 1; out.push(x); } });
  return out;
}

function hubList(v) {
  if (!v) return [];
  if (typeof v === 'string') {
    var t = v.trim();
    if (t.charAt(0) === '[') { try { return JSON.parse(t); } catch (e) {} }
    return t.split(/[;,\n]/).map(hubNorm).filter(Boolean);
  }
  return v;
}

/** Ghi log hệ thống (không bao giờ ném lỗi ra ngoài) */
function hubLog(level, action, message, detail) {
  try {
    var sh = hubSheet(HUB.SHEETS.LOG, true);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Time', 'Level', 'Action', 'User', 'Message', 'Detail']);
      sh.setFrozenRows(1);
    }
    sh.appendRow([new Date(), level, action, '', String(message).substring(0, 500), String(detail || '').substring(0, 900)]);
    var last = sh.getLastRow();
    if (last > 3001) sh.deleteRows(2, last - 3001);
  } catch (e) { /* im lặng */ }
}

function hubStyleHeader(sheet, cols) {
  try {
    sheet.getRange(1, 1, 1, cols)
      .setBackground('#CFE2F3').setFontColor('#003047')
      .setFontWeight('bold').setFontSize(10.5);
    sheet.setFrozenRows(1);
  } catch (e) {}
}

/** Tạo sheet hệ thống có tiêu đề; bổ sung tiêu đề cột mới nếu thiếu (nâng cấp v2) */
function hubEnsureHeader(sh, header) {
  if (sh.getLastRow() === 0) {
    sh.appendRow(header);
    hubStyleHeader(sh, header.length);
    return sh;
  }
  var cur = sh.getRange(1, 1, 1, header.length).getValues()[0];
  var fix = false;
  for (var i = 0; i < header.length; i++) {
    if (!hubNorm(cur[i])) { cur[i] = header[i]; fix = true; }
  }
  if (fix) {
    sh.getRange(1, 1, 1, header.length).setValues([cur]);
    hubStyleHeader(sh, header.length);
  }
  return sh;
}

/** Lấy ID Drive từ mọi dạng link: /folders/ID, /d/ID, open?id=ID, ?id=ID */
function hubDriveIdFromUrl(url) {
  url = hubNorm(url);
  if (!url) return '';
  var m = url.match(/\/folders\/([a-zA-Z0-9_\-]{10,})/) ||
          url.match(/\/d\/([a-zA-Z0-9_\-]{10,})/) ||
          url.match(/[?&]id=([a-zA-Z0-9_\-]{10,})/);
  return m ? m[1] : '';
}

/** Lấy URL từ công thức =HYPERLINK("url";"tên") hoặc =HYPERLINK("url","tên") */
function hubUrlFromFormula(f) {
  f = hubNorm(f);
  if (!f) return '';
  var m = f.match(/HYPERLINK\(\s*"([^"]+)"/i);
  return m ? m[1] : '';
}

function hubUrlFromRichText(rt) {
  try {
    if (!rt) return '';
    var url = rt.getLinkUrl();
    if (url) return url;
    var runs = rt.getRuns();
    for (var i = 0; i < runs.length; i++) {
      var u = runs[i].getLinkUrl();
      if (u) return u;
    }
  } catch (e) {}
  return '';
}

/** URL frontend dùng cho link trong email (frontend tự báo về mỗi lần mở app) */
function hubAppUrl(cfg) {
  cfg = cfg || hubGetConfig();
  var u = hubNorm(cfg.APP_URL);
  if (!u) { try { u = PropertiesService.getScriptProperties().getProperty('HUB_APP_URL') || ''; } catch (e) {} }
  return u;
}
function hubRememberAppUrl(url) {
  url = hubNorm(url).split('#')[0];
  if (!/^https?:\/\//i.test(url)) return;
  try {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('HUB_APP_URL') !== url) props.setProperty('HUB_APP_URL', url);
  } catch (e) {}
}


// ============================================================================
//  4. XÁC THỰC (OTP -> PIN -> TOKEN)
// ============================================================================

function apiPing(p) {
  return {ok:true, service:'MMH Training Hub', version:HUB.VERSION, time:new Date().toISOString()};
}

/** Băm PIN kèm muối cố định của script */
function hubHashPin(email, pin) {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty('HUB_SALT');
  if (!salt) {
    salt = Utilities.getUuid();
    props.setProperty('HUB_SALT', salt);
  }
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '|' + hubPrefix(email) + '|' + pin,
    Utilities.Charset.UTF_8
  );
  return raw.map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/** Khung email chung — nền sáng, dải vàng MANI, chữ navy (không dùng khối navy đậm) */
function hubMailShell(kicker, title, innerHtml, footNote) {
  return '' +
  '<div style="background:#F3F7FC;padding:26px 12px;font-family:Aptos,\'Segoe UI\',Arial,sans-serif">' +
    '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #DCE6F2">' +
      '<div style="height:6px;background:#FFE100;font-size:0;line-height:0">&nbsp;</div>' +
      '<div style="padding:22px 30px 4px">' +
        '<div style="font-size:12.5px;color:#3A5CAA;font-weight:700">' + kicker + '</div>' +
        '<div style="font-size:22px;font-weight:700;color:#003047;margin-top:4px;line-height:1.32">' + title + '</div>' +
      '</div>' +
      '<div style="padding:12px 30px 26px;color:#1A1A1A;font-size:14.5px;line-height:1.62">' + innerHtml + '</div>' +
      '<div style="background:#F0F7FF;padding:13px 30px;font-size:12px;color:#5E738C;line-height:1.5">' + footNote + '</div>' +
    '</div>' +
  '</div>';
}

function hubMailButton(url, label, secondary) {
  if (!url) return '';
  return '<a href="' + hubEsc(url) + '" style="display:inline-block;margin:4px 8px 4px 0;' +
    (secondary
      ? 'background:#ffffff;color:#3A5CAA;border:1.5px solid #3A5CAA;'
      : 'background:#3A5CAA;color:#ffffff;border:1.5px solid #3A5CAA;') +
    'text-decoration:none;font-weight:700;font-size:14.5px;padding:12px 24px;border-radius:10px">' + hubEsc(label) + '</a>';
}

/** Bước 1 — gửi mã kích hoạt 6 số qua email công ty */
function apiRequestOtp(p) {
  var email = hubNorm(p.email).toLowerCase();
  if (!email) return {ok:false, error:'Vui lòng nhập email.'};
  if (!hubIsCompanyEmail(email)) {
    return {ok:false, error:'Chỉ chấp nhận email nội bộ (@mani.inc hoặc @manimedicalhanoi.com).'};
  }
  var user = hubFindUser(email);
  if (!user) return {ok:false, error:'Email chưa có trong hệ thống. Liên hệ Admin (mmh.product) để được thêm.'};
  if (!user.active) return {ok:false, error:'Tài khoản đang bị khoá. Liên hệ Admin.'};

  var props = PropertiesService.getScriptProperties();
  var key = 'OTP_' + hubPrefix(email);
  // chống spam: tối đa 1 mã / 45 giây
  try {
    var prev = JSON.parse(props.getProperty(key) || 'null');
    if (prev && prev.sentAt && Date.now() - prev.sentAt < 45000) {
      return {ok:false, error:'Mã vừa được gửi. Vui lòng chờ ' + Math.ceil((45000 - (Date.now() - prev.sentAt)) / 1000) + ' giây rồi thử lại.'};
    }
  } catch (e) {}

  var code = String(Math.floor(100000 + Math.random() * 900000));
  props.setProperty(key, JSON.stringify({
    code: code, exp: Date.now() + HUB.OTP_TTL_MIN * 60 * 1000, tries: 0, sentAt: Date.now()
  }));

  var cfg = hubGetConfig();
  var inner =
    '<p style="margin:0 0 12px">Xin chào <b>' + hubEsc(user.name) + '</b>,</p>' +
    '<p style="margin:0 0 6px;color:#41566f">Mã kích hoạt tài khoản Training Hub của bạn:</p>' +
    '<div style="text-align:center;margin:18px 0 20px">' +
      '<span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:800;color:#003047;background:#F0F7FF;border:2px dashed #3A5CAA;border-radius:12px;padding:12px 24px">' + code + '</span>' +
    '</div>' +
    '<p style="margin:0 0 4px;color:#5E738C;font-size:13px">Mã có hiệu lực trong ' + HUB.OTP_TTL_MIN + ' phút. Sau khi nhập mã, bạn tự đặt mã PIN để đăng nhập các lần sau.</p>' +
    '<p style="margin:0;color:#5E738C;font-size:13px">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>';

  try {
    MailApp.sendEmail({
      to: hubMailOf(email),
      subject: '[MMH Training Hub] Mã kích hoạt: ' + code,
      htmlBody: hubMailShell('MANI MEDICAL HANOI', hubEsc(cfg.APP_TITLE), inner, 'Email tự động từ MMH Training Hub — vui lòng không trả lời.'),
      name: 'MMH Training Hub'
    });
  } catch (e) {
    hubLog('ERROR', 'requestOtp', 'Không gửi được email tới ' + hubMailOf(email), e.message);
    if (/permission|quyền|scope|authoriz/i.test(e.message)) {
      return {ok:false, code:'NO_MAIL_SCOPE', error:
        'Hệ thống chưa được cấp quyền gửi email. Người quản trị cần mở Apps Script, ' +
        'chạy hàm kiemTraQuyen() và cấp quyền, sau đó Deploy lại phiên bản mới.'};
    }
    return {ok:false, error:'Không gửi được email: ' + e.message};
  }
  hubLog('INFO', 'requestOtp', 'OTP sent to ' + hubMailOf(email), '');
  return {ok:true, message:'Đã gửi mã kích hoạt tới ' + hubMailOf(email), expiresIn: HUB.OTP_TTL_MIN * 60};
}

/** Bước 2 — xác thực OTP và đặt PIN mới */
function apiVerifyOtp(p) {
  var email = hubNorm(p.email).toLowerCase();
  var code  = hubNorm(p.code);
  var pin   = hubNorm(p.pin);
  if (!email || !code || !pin) return {ok:false, error:'Thiếu thông tin.'};
  if (pin.length < HUB.PIN_MIN_LEN) return {ok:false, error:'PIN phải có tối thiểu ' + HUB.PIN_MIN_LEN + ' ký tự.'};

  var props = PropertiesService.getScriptProperties();
  var key = 'OTP_' + hubPrefix(email);
  var raw = props.getProperty(key);
  if (!raw) return {ok:false, error:'Chưa có mã kích hoạt hoặc mã đã hết hạn. Vui lòng gửi lại.'};

  var otp = JSON.parse(raw);
  if (Date.now() > otp.exp) { props.deleteProperty(key); return {ok:false, error:'Mã đã hết hạn. Vui lòng gửi lại.'}; }
  if (otp.tries >= 5)       { props.deleteProperty(key); return {ok:false, error:'Nhập sai quá 5 lần. Vui lòng gửi lại mã.'}; }
  if (otp.code !== code) {
    otp.tries++; props.setProperty(key, JSON.stringify(otp));
    return {ok:false, error:'Mã không đúng. Còn ' + (5 - otp.tries) + ' lần thử.'};
  }
  props.deleteProperty(key);

  hubUpdateUserFields(email, {pinHash: hubHashPin(email, pin), active: true});
  hubLog('INFO', 'verifyOtp', 'PIN set for ' + email, '');
  return hubIssueToken(email, 'Kích hoạt thành công.');
}

/** Đăng nhập bằng email + PIN */
function apiLogin(p) {
  var email = hubNorm(p.email).toLowerCase();
  var pin   = hubNorm(p.pin);
  if (!email || !pin) return {ok:false, error:'Vui lòng nhập email và PIN.'};

  var user = hubFindUser(email);
  if (!user)          return {ok:false, error:'Email chưa có trong hệ thống.'};
  if (!user.active)   return {ok:false, error:'Tài khoản đang bị khoá. Liên hệ Admin.'};
  if (!user.pinHash)  return {ok:false, error:'Tài khoản chưa kích hoạt. Bấm "Kích hoạt / Quên PIN" để nhận mã qua email.', code:'NEED_OTP'};

  // chống dò PIN: khoá 10 phút sau 8 lần sai
  var props = PropertiesService.getScriptProperties();
  var fkey = 'LF_' + hubPrefix(email);
  var fail = {};
  try { fail = JSON.parse(props.getProperty(fkey) || '{}'); } catch (e) {}
  if (fail.until && Date.now() < fail.until) {
    return {ok:false, error:'Nhập sai PIN quá nhiều lần. Vui lòng thử lại sau ' + Math.ceil((fail.until - Date.now()) / 60000) + ' phút hoặc dùng "Quên PIN".'};
  }
  if (user.pinHash !== hubHashPin(email, pin)) {
    fail.n = (fail.n || 0) + 1;
    if (fail.n >= 8) { fail.until = Date.now() + 10 * 60000; fail.n = 0; }
    props.setProperty(fkey, JSON.stringify(fail));
    return {ok:false, error:'PIN không đúng.'};
  }
  props.deleteProperty(fkey);
  return hubIssueToken(email, 'Đăng nhập thành công.');
}

function hubIssueToken(email, message) {
  var token = Utilities.getUuid();
  var exp = Date.now() + HUB.TOKEN_TTL_DAYS * 86400000;
  PropertiesService.getScriptProperties()
    .setProperty('TK_' + token, JSON.stringify({email: hubPrefix(email), exp: exp}));
  hubUpdateUserFields(email, {lastLogin: new Date()});
  var user = hubFindUser(email);
  return {ok:true, message:message, token:token, expiresAt:exp, user:hubPublicUser(user)};
}

function hubResolveToken(token) {
  token = hubNorm(token);
  if (!token) return null;
  var raw = PropertiesService.getScriptProperties().getProperty('TK_' + token);
  if (!raw) return null;
  var t;
  try { t = JSON.parse(raw); } catch (e) { return null; }
  if (Date.now() > t.exp) { PropertiesService.getScriptProperties().deleteProperty('TK_' + token); return null; }
  var user = hubFindUser(t.email);
  if (!user || !user.active) return null;
  user.token = token;
  return user;
}

function apiLogout(p, user) {
  PropertiesService.getScriptProperties().deleteProperty('TK_' + hubNorm(p.token));
  return {ok:true, message:'Đã đăng xuất.'};
}

function apiMe(p, user) {
  return {ok:true, user:hubPublicUser(user)};
}

function apiChangePin(p, user) {
  var oldPin = hubNorm(p.oldPin), newPin = hubNorm(p.newPin);
  if (newPin.length < HUB.PIN_MIN_LEN) return {ok:false, error:'PIN mới phải có tối thiểu ' + HUB.PIN_MIN_LEN + ' ký tự.'};
  if (user.pinHash && user.pinHash !== hubHashPin(user.email, oldPin)) return {ok:false, error:'PIN hiện tại không đúng.'};
  hubUpdateUserFields(user.email, {pinHash: hubHashPin(user.email, newPin)});
  return {ok:true, message:'Đã đổi PIN.'};
}

function hubIsTrainer(user) {
  return !!user && (user.role === 'admin' || user.role === 'trainer');
}

function hubPublicUser(u) {
  if (!u) return null;
  return {
    email: u.email, name: u.name, role: u.role, dept: u.dept,
    position: u.position, manager: u.manager, active: u.active,
    isTrainer: hubIsTrainer(u), isAdmin: u.role === 'admin'
  };
}

// ============================================================================
//  5. NGƯỜI DÙNG & PHÂN QUYỀN
// ============================================================================

var HUB_USER_HEADER = ['Email','Name','Role','Department','Position','ManagerEmail','PinHash','Active','CreatedAt','LastLogin'];

function hubUsersSheet() {
  return hubCached('shUsers', function(){ return hubEnsureHeader(hubSheet(HUB.SHEETS.USERS, true), HUB_USER_HEADER); });
}

function hubReadUsers() {
  return hubData('users', hubReadUsersRaw);
}
function hubReadUsersRaw() {
  var sh = hubUsersSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_USER_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    out.push({
      row      : i + 2,
      email    : hubMailOf(r[0]),
      name     : hubNorm(r[1]),
      role     : (hubNorm(r[2]) || 'audience').toLowerCase(),
      dept     : hubNorm(r[3]),
      position : hubNorm(r[4]),
      manager  : hubMailOf(r[5]),
      pinHash  : hubNorm(r[6]),
      active   : hubBool(r[7]),
      createdAt: r[8] || '',
      lastLogin: r[9] || ''
    });
  }
  // ★ v3.6 — email đổi người phụ trách: sửa tên cũ còn sót trên sheet (chạy 1 lần, an toàn khi lặp)
  out.forEach(function(u){
    var fix = HUB_RENAMED[hubPrefix(u.email)];
    if (fix && hubKeyV(u.name) === hubKeyV(fix.from)) {
      try { sh.getRange(u.row, 2).setValue(fix.to); } catch (e) {}
      u.name = fix.to;
    }
  });
  return out;
}
/** ★ v3.6 — email giữ nguyên nhưng đổi người phụ trách */
var HUB_RENAMED = { 'mmh.admin': {from:'Quynh Anh', to:'Minh Trang'} };

function hubFindUser(email) {
  var pre = hubPrefix(email);
  var all = hubReadUsers();
  for (var i = 0; i < all.length; i++) {
    if (hubPrefix(all[i].email) === pre) {
      var c = {};                       // bản sao — tránh làm bẩn đệm
      for (var k in all[i]) c[k] = all[i][k];
      return c;
    }
  }
  return null;
}

function hubUpdateUserFields(email, fields) {
  var u = hubFindUser(email);
  if (!u) return false;
  var sh = hubUsersSheet();
  var map = {email:1, name:2, role:3, dept:4, position:5, manager:6, pinHash:7, active:8, createdAt:9, lastLogin:10};
  var row = sh.getRange(u.row, 1, 1, HUB_USER_HEADER.length).getValues()[0];
  for (var k in fields) { if (map[k]) row[map[k] - 1] = fields[k]; }
  sh.getRange(u.row, 1, 1, HUB_USER_HEADER.length).setValues([row]);
  hubCacheClear('users');
  return true;
}

function apiListUsers(p, user) {
  var all = hubReadUsers().map(function(u){
    var o = hubPublicUser(u);
    o.activated = !!u.pinHash;
    o.lastLogin = u.lastLogin ? hubFmt(u.lastLogin, 'dd/MM/yyyy HH:mm') : '';
    o.row = u.row;
    return o;
  });
  return {ok:true, data:all, groups:hubGroupList()};
}

function apiSaveUser(p, user) {
  var email = hubMailOf(p.email);
  if (!email || !hubIsCompanyEmail(email)) return {ok:false, error:'Email không hợp lệ.'};
  var role = (hubNorm(p.role) || 'audience').toLowerCase();
  if (['admin','trainer','audience'].indexOf(role) === -1) return {ok:false, error:'Vai trò không hợp lệ.'};

  return hubWithLock(function(){
    var existing = hubFindUser(email);
    if (existing) {
      hubUpdateUserFields(email, {
        name: hubNorm(p.name) || existing.name,
        role: role,
        dept: hubNorm(p.dept),
        position: hubNorm(p.position),
        manager: hubMailOf(p.manager) || existing.manager,
        active: p.active === undefined ? existing.active : hubBool(p.active)
      });
      hubLog('INFO', 'saveUser', 'Updated ' + email + ' by ' + user.email, '');
      return {ok:true, message:'Đã cập nhật ' + hubNorm(p.name || existing.name) + '.'};
    }
    hubUsersSheet().appendRow([
      email, hubNorm(p.name), role, hubNorm(p.dept), hubNorm(p.position),
      hubMailOf(p.manager), '', true, new Date(), ''
    ]);
    hubCacheClear('users');
    hubLog('INFO', 'saveUser', 'Created ' + email + ' by ' + user.email, '');
    return {ok:true, message:'Đã thêm ' + hubNorm(p.name) + '. Người dùng tự kích hoạt bằng mã OTP khi đăng nhập lần đầu.'};
  });
}

function apiDeleteUser(p, user) {
  return hubWithLock(function(){
    var target = hubFindUser(p.email);
    if (!target) return {ok:false, error:'Không tìm thấy người dùng.'};
    if (hubPrefix(target.email) === hubPrefix(user.email)) return {ok:false, error:'Không thể tự xoá tài khoản của chính mình.'};
    hubUsersSheet().deleteRow(target.row);
    hubCacheClear('users');
    hubLog('WARN', 'deleteUser', 'Deleted ' + target.email + ' by ' + user.email, '');
    return {ok:true, message:'Đã xoá ' + target.name + '.'};
  });
}

function apiResetPin(p, user) {
  var target = hubFindUser(p.email);
  if (!target) return {ok:false, error:'Không tìm thấy người dùng.'};
  hubUpdateUserFields(target.email, {pinHash: ''});
  hubLog('WARN', 'resetPin', 'Reset PIN of ' + target.email + ' by ' + user.email, '');
  return {ok:true, message:'Đã xoá PIN của ' + target.name + '. Người dùng đăng nhập lại bằng mã kích hoạt.'};
}

/** Danh sách nhóm người nhận (dựng sẵn + từng phòng ban) */
function hubGroupList() {
  var users = hubReadUsers();
  var groups = [];
  for (var g in HUB_GROUPS) {
    var emails = HUB_GROUPS[g].map(function(pre){ return pre + '@' + HUB.SEND_DOMAIN; });
    groups.push({name:g, type:'group', emails:emails, count:emails.length});
  }
  var byDept = {};
  users.forEach(function(u){
    if (!u.dept || !u.active) return;
    if (!byDept[u.dept]) byDept[u.dept] = [];
    byDept[u.dept].push(u.email);
  });
  for (var d in byDept) {
    groups.push({name:'Phòng ban — ' + d, type:'dept', emails:byDept[d], count:byDept[d].length});
  }
  return groups;
}

/** So khớp tên nhóm "mềm": "Sales team" = "MMH - Sales team" = "mmh sales team" */
function hubGroupKey(s) {
  return hubKeyV(s).replace(/^mmh/, '');
}

/** Giải mã chuỗi Target Audience -> danh sách email.
 *  Hỗ trợ: email, tên nhóm (khớp mềm), tên người, tên phòng ban;
 *  phân tách bằng dấu ; , | hoặc xuống dòng. */
function hubResolveAudience(audience) {
  var memoKey = 'aud:' + hubNorm(audience);
  if (HUB_MEM.hasOwnProperty(memoKey)) return HUB_MEM[memoKey];

  var out = [];
  var parts = hubNorm(audience).split(/[;,|\n]/);
  var users = hubReadUsers();
  var ALL_ALIASES = ['all', 'allmember', 'allmembers', 'toancongty', 'tatca', 'mmh', 'everyone'];

  parts.forEach(function(raw){
    var item = hubNorm(raw);
    if (!item) return;
    if (item.indexOf('@') > 0) { out.push(hubMailOf(item)); return; }

    var ik = hubGroupKey(item);
    if (ALL_ALIASES.indexOf(ik) >= 0) ik = hubGroupKey('MMH - All member');

    for (var g in HUB_GROUPS) {
      if (hubGroupKey(g) === ik) {
        HUB_GROUPS[g].forEach(function(pre){ out.push(pre + '@' + HUB.SEND_DOMAIN); });
        return;
      }
    }
    for (var i = 0; i < users.length; i++) {
      if (hubKeyV(users[i].name) === hubKeyV(item)) { out.push(users[i].email); return; }
    }
    var hit = false;
    for (var j = 0; j < users.length; j++) {
      if (users[j].dept && hubGroupKey(users[j].dept) === ik && users[j].active) { out.push(users[j].email); hit = true; }
    }
    if (hit) return;
    // khớp gần: nhóm có chứa cụm từ (VD "Sales Dental" ⊂ "MMH - Sales Dental")
    for (var g2 in HUB_GROUPS) {
      var gk = hubGroupKey(g2);
      if (ik.length >= 5 && (gk.indexOf(ik) >= 0 || ik.indexOf(gk) >= 0)) {
        HUB_GROUPS[g2].forEach(function(pre){ out.push(pre + '@' + HUB.SEND_DOMAIN); });
        return;
      }
    }
  });

  var res = hubUniq(out);
  HUB_MEM[memoKey] = res;
  return res;
}

/** Quản lý trực tiếp của một email */
function hubManagerOf(email) {
  var u = hubFindUser(email);
  if (u && u.manager && hubPrefix(u.manager) !== hubPrefix(email)) return u.manager;
  return 'tt.tuyen@' + HUB.SEND_DOMAIN;
}

function hubNameOf(email) {
  var u = hubFindUser(email);
  return u ? u.name : hubPrefix(email);
}


// ============================================================================
//  6. CẤU HÌNH ỨNG DỤNG (HUB_Config)
// ============================================================================

function hubConfigSheet() {
  return hubCached('shConfig', hubConfigSheetRaw);
}
function hubConfigSheetRaw() {
  var sh = hubSheet(HUB.SHEETS.CONFIG, true);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Key','Value','Note']);
    hubStyleHeader(sh, 3);
    for (var k in HUB_DEFAULT_CONFIG) sh.appendRow([k, HUB_DEFAULT_CONFIG[k], '']);
  }
  return sh;
}

function hubGetConfig() {
  return hubData('config', hubGetConfigRaw, 900);
}
function hubGetConfigRaw() {
  var sh = hubConfigSheet();
  var cfg = {};
  for (var k in HUB_DEFAULT_CONFIG) cfg[k] = HUB_DEFAULT_CONFIG[k];
  var last = sh.getLastRow();
  if (last >= 2) {
    var vals = sh.getRange(2, 1, last - 1, 2).getValues();
    vals.forEach(function(r){ if (hubNorm(r[0])) cfg[hubNorm(r[0])] = hubNorm(r[1]); });
  }
  return cfg;
}

function apiSaveConfig(p, user) {
  var data = p.config;
  if (typeof data === 'string') data = JSON.parse(data);
  if (!data) return {ok:false, error:'Thiếu dữ liệu cấu hình.'};

  return hubWithLock(function(){
    var sh = hubConfigSheet();
    var last = sh.getLastRow();
    var keys = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function(r){ return hubNorm(r[0]); }) : [];
    var vals = last >= 2 ? sh.getRange(2, 2, last - 1, 1).getValues() : [];
    var append = [];
    for (var k in data) {
      var idx = keys.indexOf(k);
      if (idx >= 0) vals[idx][0] = data[k];
      else append.push([k, data[k], '']);
    }
    if (vals.length) sh.getRange(2, 2, vals.length, 1).setValues(vals);
    if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, 3).setValues(append);
    hubCacheClear('config');
    hubLog('INFO', 'saveConfig', 'by ' + user.email, JSON.stringify(data).substring(0, 400));
    return {ok:true, message:'Đã lưu cấu hình.', config:hubGetConfig()};
  });
}

function apiGetLogs(p, user) {
  var sh = hubSheet(HUB.SHEETS.LOG, true);
  var last = sh.getLastRow();
  if (last < 2) return {ok:true, data:[]};
  var n = Math.min(300, last - 1);
  var vals = sh.getRange(last - n + 1, 1, n, 6).getValues();
  var out = vals.map(function(r){
    return {time:hubFmt(r[0], 'dd/MM/yyyy HH:mm:ss'), level:r[1], action:r[2], message:r[4], detail:String(r[5] || '').substring(0, 300)};
  }).reverse();
  return {ok:true, data:out};
}

function apiClearCache(p, user) {
  hubCacheClear();
  return {ok:true, message:'Đã làm mới bộ nhớ đệm. Dữ liệu sẽ được đọc lại từ Google Sheet.'};
}


// ============================================================================
//  7. BUỔI ĐÀO TẠO (đọc/ghi sheet Training Report FY67)
// ============================================================================

function hubReportSheet() {
  return HUB_CTX.test ? hubCached('reportSheetT', hubTestSheet) : hubCached('reportSheet', hubReportSheetRaw);
}
/** ★ v3.0 — Sheet buổi đào tạo TEST: cùng bố cục cột với Training Report (dữ liệu từ dòng 5) */
function hubTestSheet() {
  var sh = hubSheet(HUB.TEST.SHEET, true);
  if (!hubNorm(sh.getRange(3, 8).getValue())) {
    sh.getRange(1, 2).setValue('MMH TRAINING HUB — DỮ LIỆU TEST (không tính vào báo cáo đào tạo)');
    sh.getRange(3, 2, 1, 23).setValues([['No','Month','Training Folder','Actual Date','Training Type','Training Category','Training Topic','Training Purpose','Trainer','Target Audience','Status','Meeting Link','Record Link','Summary','Assessment','Assessment Result','Pre-training','After-training','Session ID','Quiz Status','Completion','Time From','Time To']]);
    try { sh.getRange(3, 2, 1, 23).setBackground('#FFF7C2').setFontWeight('bold'); sh.setFrozenRows(3); } catch (e) {}
  }
  return sh;
}
function hubReportSheetRaw() {
  var sh = hubSheet(HUB.SHEETS.REPORT, false);
  // đảm bảo có tiêu đề cho 5 cột HUB bổ sung (đọc 1 lần theo lô)
  var titles = ['Session ID', 'Quiz Status', 'Completion', 'Time From', 'Time To'];
  var cur = sh.getRange(3, HUB.COL.SID, 1, 5).getValues()[0];
  var need = false;
  for (var i = 0; i < 5; i++) { if (!hubNorm(cur[i])) { cur[i] = titles[i]; need = true; } }
  if (need) {
    sh.getRange(3, HUB.COL.SID, 1, 5).setValues([cur])
      .setBackground('#CFE2F3').setFontColor('#003047').setFontWeight('bold');
  }
  return sh;
}

function hubSidOf(dateVal, row) {
  var d = hubToDate(dateVal) || new Date();
  return (HUB_CTX.test ? HUB.TEST.PREFIX : 'S') + hubFmt(d, 'yyyyMMdd') + '-' + ('000' + row).slice(-3);
}

/** Đọc toàn bộ buổi đào tạo (có đệm). Tự sinh Session ID cho dòng còn thiếu. */
function hubReadSessions() {
  return hubData(HUB_CTX.test ? 'sessionsT' : 'sessions', hubReadSessionsRaw);
}
function hubReadSessionsRaw() {
  var sh = hubReportSheet();
  var last = sh.getLastRow();
  if (last < HUB.DATA_START_ROW) return [];
  var n = last - HUB.DATA_START_ROW + 1;
  var C = HUB.COL;
  var vals = sh.getRange(HUB.DATA_START_ROW, 2, n, HUB.LAST_COL - 1).getValues();

  // ★ v2: đọc link theo LÔ (trước đây đọc từng ô → rất chậm)
  var folderRng = sh.getRange(HUB.DATA_START_ROW, C.FOLDER, n, 1);
  var folderRT  = folderRng.getRichTextValues();
  var folderF   = folderRng.getFormulas();
  var recRng    = sh.getRange(HUB.DATA_START_ROW, C.RECORD_LINK, n, 1);
  var recRT     = recRng.getRichTextValues();
  var recF      = recRng.getFormulas();

  var g = function(row, col){ return row[col - 2]; };
  var out = [], needSid = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    var topic = hubNorm(g(r, C.TOPIC));
    var date  = hubToDate(g(r, C.DATE));
    if (!topic && !date) continue;

    var rowIdx = HUB.DATA_START_ROW + i;
    var sid = hubNorm(g(r, C.SID));
    if (!sid) { sid = hubSidOf(date, rowIdx); needSid.push({row:rowIdx, sid:sid}); }

    var folderRaw = hubNorm(g(r, C.FOLDER));
    var folderUrl = hubUrlFromRichText(folderRT[i][0]) || hubUrlFromFormula(folderF[i][0]) ||
                    (/^https?:\/\//i.test(folderRaw) ? folderRaw : '');
    var recRaw = hubNorm(g(r, C.RECORD_LINK));
    var recUrl = (/^https?:\/\//i.test(recRaw) ? recRaw : '') ||
                 hubUrlFromRichText(recRT[i][0]) || hubUrlFromFormula(recF[i][0]);

    out.push({
      row        : rowIdx,
      sid        : sid,
      no         : hubNorm(g(r, C.NO)),
      month      : hubNorm(g(r, C.MONTH)),
      folderName : /^https?:\/\//i.test(folderRaw) ? '' : folderRaw,
      folderUrl  : folderUrl,
      date       : date ? hubFmt(date, 'yyyy-MM-dd') : '',
      dateText   : date ? hubFmt(date, 'dd/MM/yyyy') : '',
      type       : hubNorm(g(r, C.TYPE)),
      category   : hubNorm(g(r, C.CATEGORY)),
      topic      : topic,
      purpose    : hubNorm(g(r, C.PURPOSE)),
      trainer    : hubNorm(g(r, C.TRAINER)),
      audience   : hubNorm(g(r, C.AUDIENCE)),
      status     : hubNorm(g(r, C.STATUS)) || 'Plan',
      meetingLink: hubNorm(g(r, C.MEETING_LINK)),
      recordLink : recUrl,
      summary    : hubNorm(g(r, C.SUMMARY)),
      quizStatus : hubNorm(g(r, C.QUIZ_STATUS)) || 'None',
      preSent    : hubBool(g(r, C.PRE_TRAINING)),
      afterSent  : hubBool(g(r, C.AFTER_TRAINING)),
      completion : hubNorm(g(r, C.COMPLETION)),
      timeFrom   : hubTimeText(g(r, C.TIME_FROM)),
      timeTo     : hubTimeText(g(r, C.TIME_TO))
    });
  }

  if (needSid.length) {
    needSid.forEach(function(x){ sh.getRange(x.row, C.SID).setValue(x.sid); });
  }
  return out;
}

function hubTimeText(v) {
  if (!v) return '';
  if (v instanceof Date) return hubFmt(v, 'HH:mm');
  return hubNorm(v);
}

function hubFindSession(sid) {
  sid = hubNorm(sid);
  var all = hubReadSessions();
  for (var i = 0; i < all.length; i++) if (all[i].sid === sid) return all[i];
  return null;
}

/** Bản sao buổi đào tạo (tránh sửa lẫn vào đệm) */
function hubCopy(o) { return JSON.parse(JSON.stringify(o)); }

/** Người dùng có phải trainer của buổi này không (hỗ trợ nhiều trainer: "Giang, Khang") */
function hubIsTrainerOf(trainerText, user) {
  if (!user) return false;
  var names = hubNorm(trainerText).split(/[,;\/&+\n]/);
  var me = hubKeyV(user.name), pre = hubPrefix(user.email);
  for (var i = 0; i < names.length; i++) {
    var nm = hubNorm(names[i]);
    if (!nm) continue;
    if (nm.indexOf('@') > 0 && hubPrefix(nm) === pre) return true;
    if (me && hubKeyV(nm) === me) return true;
  }
  return false;
}

function hubCanEdit(s, user) {
  if (!user || !s) return false;
  if (user.role === 'admin') return true;
  if (!hubIsTrainer(user)) return false;
  return hubIsTrainerOf(s.trainer, user);
}

/** Người dùng có nằm trong danh sách học viên của buổi không */
function hubIsAssigned(s, user, myEnroll) {
  if (myEnroll) return true;
  var pre = hubPrefix(user.email);
  var list = hubResolveAudience(s.audience);
  for (var i = 0; i < list.length; i++) if (hubPrefix(list[i]) === pre) return true;
  return false;
}

/** Danh sách buổi đào tạo kèm trạng thái cá nhân của người đang đăng nhập */
function apiListSessions(p, user) {
  var sessions = hubCopy(hubReadSessions());
  var enroll   = hubReadEnrollment();
  var quizCfg  = hubReadQuizConfigAll();
  var resp     = hubReadResponsesAll();
  var pre      = hubPrefix(user.email);

  var byS = {};
  enroll.forEach(function(e){
    if (!byS[e.sid]) byS[e.sid] = {total:0, done:0, passed:0, mine:null};
    byS[e.sid].total++;
    if (e.status === 'Completed') byS[e.sid].done++;
    if (e.pass) byS[e.sid].passed++;
    if (hubPrefix(e.email) === pre) byS[e.sid].mine = e;
  });
  var myAttempts = {};
  resp.forEach(function(r){ if (hubPrefix(r.email) === pre) myAttempts[r.sid] = (myAttempts[r.sid] || 0) + 1; });

  var qmap = {};
  quizCfg.forEach(function(q){ qmap[q.sid] = q; });

  sessions.forEach(function(s){
    var st = byS[s.sid] || {total:0, done:0, passed:0, mine:null};
    s.enrolled  = st.total;
    s.completed = st.done;
    s.passed    = st.passed;
    s.myStatus  = st.mine ? st.mine.status : '';
    s.myScore   = st.mine ? st.mine.percent : '';
    s.myPass    = st.mine ? st.mine.pass : false;
    s.myCert    = st.mine ? st.mine.certUrl : '';
    s.assigned  = hubIsAssigned(s, user, st.mine);
    var q = qmap[s.sid];
    s.hasQuiz       = !!q;
    s.quizActive    = q ? q.active : false;
    s.passScore     = q ? q.passScore : '';
    s.durationMin   = q ? q.durationMin : '';
    s.maxAttempts   = q ? q.maxAttempts : 0;
    s.deadline      = q ? q.deadline : '';
    s.questionCount = q ? q.total : 0;
    s.requireMaterials = q ? q.requireMaterials : false;
    s.myAttempts    = myAttempts[s.sid] || 0;
    s.hasFolder     = !!s.folderUrl;
    s.canEdit       = hubCanEdit(s, user);
    delete s.row;
  });

  return {ok:true, data:sessions, config:hubPublicConfig(), meta:hubMasterMeta()};
}

/** (Giữ tương thích v1) */
function apiGetSession(p, user) {
  var base = hubFindSession(p.sid);
  if (!base) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var s = hubCopy(base);
  s.audienceEmails = hubResolveAudience(s.audience);
  s.canEdit = hubCanEdit(s, user);
  var q = hubReadQuizConfig(s.sid);
  s.hasQuiz       = !!q;
  s.quizActive    = q ? q.active : false;
  s.passScore     = q ? q.passScore : '';
  s.durationMin   = q ? q.durationMin : '';
  s.maxAttempts   = q ? q.maxAttempts : '';
  s.questionCount = q ? q.total : 0;
  var enroll = hubReadEnrollment().filter(function(e){ return e.sid === s.sid; });
  if (!s.canEdit) enroll = enroll.filter(function(e){ return hubPrefix(e.email) === hubPrefix(user.email); });
  return {ok:true, data:s, enrollment:enroll, quiz:q};
}

/** ★ v2 — Toàn bộ dữ liệu trang chi tiết trong 1 lần gọi.
 *  Tham số noMats=1 để bỏ qua danh sách tài liệu (frontend gọi song song). */
function apiSessionFull(p, user) {
  var base = hubFindSession(p.sid);
  if (!base) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var s = hubCopy(base);
  delete s.row;
  var pre = hubPrefix(user.email);
  s.canEdit = hubCanEdit(s, user);

  var q = hubReadQuizConfig(s.sid);
  s.hasQuiz       = !!q;
  s.quizActive    = q ? q.active : false;
  s.passScore     = q ? q.passScore : '';
  s.durationMin   = q ? q.durationMin : '';
  s.maxAttempts   = q ? q.maxAttempts : 0;
  s.questionCount = q ? q.total : 0;
  s.deadline      = q ? q.deadline : '';
  s.quizNote      = q ? q.note : '';

  var audience = hubResolveAudience(s.audience);
  var enrollAll = hubReadEnrollment().filter(function(e){ return e.sid === s.sid; });
  var mine = null;
  enrollAll.forEach(function(e){ if (hubPrefix(e.email) === pre) mine = e; });
  s.assigned = hubIsAssigned(s, user, mine);

  var progress = hubReadProgress().filter(function(x){ return x.sid === s.sid; });
  var myProgress = progress.filter(function(x){ return x.email === pre; });

  var out = {
    ok: true,
    data: s,
    my: mine ? {status:mine.status, percent:mine.percent, pass:mine.pass, attempt:mine.attempt, certUrl:mine.certUrl} : null,
    quiz: hubMyQuizStatusObj(s.sid, user),
    myProgress: myProgress,
    counts: {
      audience: audience.length,
      enrolled: enrollAll.length,
      completed: enrollAll.filter(function(e){ return e.status === 'Completed'; }).length,
      passed: enrollAll.filter(function(e){ return e.pass; }).length
    }
  };

  if (s.canEdit) {
    if (hubBool(p.learners)) out.learners = hubLearnerRows(s, audience, enrollAll, progress);   // ★ v2.5: chỉ khi cần
    out.quizFileUrl = hubQuizFileUrl();
  }
  if (!hubBool(p.noMats)) {
    try {
      if (hubBool(p.fresh)) hubCacheClear('mats:' + s.sid);
      var m = hubMaterials(s, {cacheOnly:true});     // ★ v2.4: không đọc Drive trong lượt này
      if (!m) throw {pending:true};
      out.materials = {data:m.files, folders:m.folders || [], crumb:m.crumb || [], single:!!m.single, truncated:!!m.truncated,
                       folderUrl:m.folderUrl, folderName:m.folderName, message:m.message || '', myProgress:myProgress,
                       chunkSize:HUB.UPLOAD_CHUNK, maxMb:HUB.UPLOAD_MAX_MB};
    } catch (e) { out.materials = e && e.pending ? {pending:true, data:[]} : {data:[], error:(e && e.message) || String(e)}; }
  }
  return out;
}

/** Bảng học viên cho trainer: gộp danh sách mục tiêu + đã ghi danh + tiến độ đọc */
function hubLearnerRows(s, audience, enrollAll, progress) {
  var byPre = {};
  var users = hubReadUsers();
  var uByPre = {};
  users.forEach(function(u){ uByPre[hubPrefix(u.email)] = u; });

  audience.forEach(function(em){
    var k = hubPrefix(em);
    byPre[k] = {email:hubMailOf(em), name:(uByPre[k] ? uByPre[k].name : k), dept:(uByPre[k] ? uByPre[k].dept : ''),
                status:'Assigned', percent:'', pass:false, attempt:0, certUrl:'', completedAt:'', filesDone:0, lastOpened:''};
  });
  enrollAll.forEach(function(e){
    var k = hubPrefix(e.email);
    if (!byPre[k]) byPre[k] = {email:e.email, name:e.name, dept:(uByPre[k] ? uByPre[k].dept : ''), filesDone:0, lastOpened:''};
    var o = byPre[k];
    o.status = e.status; o.percent = e.percent; o.pass = e.pass; o.attempt = e.attempt;
    o.certUrl = e.certUrl; o.completedAt = e.completedAt ? hubFmt(e.completedAt, 'dd/MM/yyyy HH:mm') : '';
  });
  progress.forEach(function(x){
    var o = byPre[x.email];
    if (!o) return;
    if (x.completed) o.filesDone++;
    if (!o.lastOpened || x.last > o.lastOpened) o.lastOpened = x.last;
  });
  var list = [];
  for (var k in byPre) {
    var o = byPre[k];
    o.lastOpened = o.lastOpened ? hubFmt(o.lastOpened, 'dd/MM/yyyy HH:mm') : '';
    list.push(o);
  }
  list.sort(function(a, b){ return a.name.localeCompare(b.name); });
  return list;
}

/** Danh mục lấy từ sheet Master (Trainer, Audience, Category, Type) */
function hubMasterMeta() {
  return hubData('meta', hubMasterMetaRaw, 1800);
}
function hubMasterMetaRaw() {
  var meta = {categories:[], types:[], trainers:[], audiences:[]};
  try {
    var sh = hubSheet(HUB.SHEETS.MASTER, false);
    var last = sh.getLastRow();
    if (last >= 3) {
      var vals = sh.getRange(3, 2, last - 2, 6).getValues(); // B..G từ dòng 3
      vals.forEach(function(r){
        if (hubNorm(r[0])) meta.categories.push(hubNorm(r[0]));            // B Category
        if (hubNorm(r[1])) meta.types.push(hubNorm(r[1]));                 // C Type
        if (hubNorm(r[2])) meta.trainers.push(hubNorm(r[2]));              // D Trainer
        if (hubNorm(r[4])) meta.audiences.push(hubNorm(r[4]));             // F Target Audience
      });
    }
  } catch (e) {}
  meta.categories = hubUniq(meta.categories);
  meta.types      = hubUniq(meta.types);
  meta.trainers   = hubUniq(meta.trainers);
  meta.audiences  = hubUniq(meta.audiences);
  if (!meta.categories.length) meta.categories = ['Product','SOP','Compliance','Funtional skills'];
  if (!meta.types.length)      meta.types = ['Internal','External'];
  meta.statuses = ['Plan','Completed','Cancel'];
  return meta;
}

/** Tạo mới / cập nhật buổi đào tạo — ghi theo lô (3 lệnh thay vì 13) */
function apiSaveSession(p, user) {
  var topic = hubNorm(p.topic);
  if (!topic) return {ok:false, error:'Vui lòng nhập chủ đề đào tạo.'};
  if (!hubNorm(p.sid) && !hubNorm(p.audience)) return {ok:false, error:'Vui lòng chọn Đối tượng tham dự (nhóm hoặc thành viên).'};

  var result = hubWithLock(function(){
    var sh = hubReportSheet();
    var C  = HUB.COL;
    var sid = hubNorm(p.sid);
    var row, isNew = false;

    if (sid) {
      var existing = hubFindSession(sid);
      if (!existing) return {ok:false, error:'Không tìm thấy buổi đào tạo để cập nhật.'};
      if (!hubCanEdit(existing, user)) return {ok:false, error:'Bạn chỉ được sửa buổi đào tạo do mình phụ trách.'};
      row = existing.row;
    } else {
      row = hubNextEmptyRow(sh);
      sid = hubSidOf(p.date, row);
      isNew = true;
    }

    var width = C.SUMMARY - C.DATE + 1;                      // E..O
    var cur = sh.getRange(row, C.DATE, 1, width).getValues()[0];
    var pick = function(key, idx){ return p[key] === undefined ? cur[idx] : hubNorm(p[key]); };
    var date = hubToDate(p.date);
    var vals = [
      date || cur[0],
      pick('type', 1), pick('category', 2), topic, pick('purpose', 4),
      hubNorm(p.trainer) || cur[5] || user.name,
      pick('audience', 6), hubNorm(p.status) || cur[7] || 'Plan',
      pick('meetingLink', 8), pick('recordLink', 9), pick('summary', 10)
    ];
    sh.getRange(row, C.DATE, 1, width).setValues([vals]);
    sh.getRange(row, C.SID).setValue(sid);
    if (p.timeFrom !== undefined || p.timeTo !== undefined) {
      sh.getRange(row, C.TIME_FROM, 1, 2).setValues([[hubNorm(p.timeFrom), hubNorm(p.timeTo)]]);
    }

    // ★ v2.1: thư mục tài liệu tự tạo đúng nhóm chủ đề; sửa buổi → tự đổi tên/chuyển chỗ
    var folderInfo = null, moved = '';
    var fCell = sh.getRange(row, C.FOLDER);
    var hasFolder = hubUrlFromRichText(fCell.getRichTextValue()) || hubUrlFromFormula(fCell.getFormula());
    var wantFolder = p.createFolder === undefined || p.createFolder === '' ? true : hubBool(p.createFolder);
    if (wantFolder && !hasFolder && vals[7] !== 'Cancel') {
      try {
        folderInfo = hubEnsureFolder(sh, row, {date:vals[0], type:vals[1], category:vals[2], audience:vals[6], topic:topic});
      } catch (e) { hubLog('ERROR', 'createFolder', sid, e.message); }
    }
    if (hasFolder && !isNew && existing) {
      try { moved = hubRelocateFolder(existing, {sid:sid, date:vals[0], type:vals[1], category:vals[2], audience:vals[6]}, sh, row); }
      catch (e) { hubLog('WARN', 'relocateFolder', sid, e.message); }
    }
    hubCacheClear('sessions');
    hubSyncEnrollment(sid, topic, vals[6]);
    return {ok:true, sid:sid, isNew:isNew, folder:folderInfo, moved:moved, audience:vals[6], status:vals[7], date:date};
  });
  if (!result.ok) return result;

  // Thông báo trong ứng dụng cho học viên khi có buổi đào tạo MỚI sắp diễn ra
  if (result.isNew && result.status === 'Plan') {
    try {
      var emails = hubResolveAudience(result.audience).filter(function(e){ return hubPrefix(e) !== hubPrefix(user.email); });
      hubNotify(emails, 'session', result.sid, 'Buổi đào tạo mới: ' + topic,
        (result.date ? 'Ngày ' + hubFmt(result.date, 'dd/MM/yyyy') + ' · ' : '') + 'Trainer: ' + (hubNorm(p.trainer) || user.name), user.email);
    } catch (e) { hubLog('ERROR', 'notify', 'session ' + result.sid, e.message); }
  }

  hubLog('INFO', 'saveSession', result.sid + ' by ' + user.email, topic);
  var msg = result.isNew ? 'Đã tạo buổi đào tạo mới' : 'Đã cập nhật buổi đào tạo';
  if (result.folder) msg += ' và thư mục tài liệu "' + result.folder.name + '"';
  if (result.moved) msg += ' (' + result.moved + ')';
  return {ok:true, message: msg + '.', sid:result.sid, folder:result.folder, moved:result.moved};
}

function hubNextEmptyRow(sh) {
  var C = HUB.COL;
  var last = Math.max(sh.getLastRow(), HUB.DATA_START_ROW);
  var n = last - HUB.DATA_START_ROW + 1;
  var dates  = sh.getRange(HUB.DATA_START_ROW, C.DATE, n, 1).getValues();
  var topics = sh.getRange(HUB.DATA_START_ROW, C.TOPIC, n, 1).getValues();
  for (var i = 0; i < n; i++) {
    if (!hubNorm(dates[i][0]) && !hubNorm(topics[i][0])) return HUB.DATA_START_ROW + i;
  }
  return last + 1;
}

function apiDeleteSession(p, user) {
  if (user.role !== 'admin') return {ok:false, error:'Chỉ Admin được xoá buổi đào tạo.'};
  return hubWithLock(function(){
    var s = hubFindSession(hubNorm(p.sid));
    if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
    // không xoá dòng (tránh vỡ ArrayFormula) — đổi Status = Cancel
    hubReportSheet().getRange(s.row, HUB.COL.STATUS).setValue('Cancel');
    hubCacheClear('sessions');
    hubLog('WARN', 'deleteSession', s.sid + ' cancelled by ' + user.email, s.topic);
    return {ok:true, message:'Đã chuyển buổi đào tạo sang trạng thái Cancel.'};
  });
}


// ============================================================================
//  8. DRIVE — FOLDER, TÀI LIỆU & XEM TRONG ỨNG DỤNG
// ============================================================================

/** ★ v3.0 — Thư mục gốc Test (tài khoản chạy hệ thống phải có quyền Chỉnh sửa) */
function hubTestRoot() {
  return hubCached('testRoot', function(){
    try { return DriveApp.getFolderById(HUB.TEST.FOLDER); }
    catch (e) { throw new Error('Tài khoản chạy hệ thống (' + hubRunnerEmail() + ') chưa có quyền vào thư mục Test. Hãy chia sẻ thư mục Test cho tài khoản này với quyền Người chỉnh sửa.'); }
  });
}
function hubSubFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function hubRunnerEmail() {
  try { return Session.getEffectiveUser().getEmail() || HUB.ADMIN_EMAIL; } catch (e) { return HUB.ADMIN_EMAIL; }
}
function hubCategoryFolder(category) {
  if (HUB_CTX.test) return hubSubFolder(hubTestRoot(), hubSafeName(category || 'Khac', 30) || 'Khac');
  var key = hubKey(category);
  var alias = {
    product:'Product', products:'Product', sanpham:'Product',
    sop:'SOP', sops:'SOP', quytrinh:'SOP',
    compliance:'Compliance', complaince:'Compliance', tuanthu:'Compliance',
    funtionalskills:'Funtional skills', functionalskills:'Funtional skills',
    funtionalskill:'Funtional skills', functionalskill:'Funtional skills',
    skill:'Funtional skills', skills:'Funtional skills', softskills:'Funtional skills'
  };
  var label = alias[key];
  var id = label ? HUB.DRIVE.CATEGORY[label] : null;
  return DriveApp.getFolderById(id || HUB.DRIVE.PARENT);
}

function hubFolderName(date, type, category, audience) {
  var d = hubToDate(date) || new Date();
  var parts = [hubFmt(d, 'yyyyMMdd')];
  if (hubNorm(type))     parts.push(hubSafeName(type, 20));
  if (hubNorm(category)) parts.push(hubSafeName(category, 24));
  if (hubNorm(audience)) parts.push(hubSafeName(audience, 34));
  return parts.join('_');
}

function hubApplySharing(item) {
  try {
    if (HUB.MATERIAL_SHARING === 'anyone') item.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    else if (HUB.MATERIAL_SHARING === 'domain') item.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (e) { return false; }
}

function hubEnsureFolder(sh, row, info) {
  var parent = hubCategoryFolder(info.category);
  var name = hubFolderName(info.date, info.type, info.category, info.audience);
  var it = parent.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : parent.createFolder(name);
  hubApplySharing(folder);
  var url = folder.getUrl();
  var rt = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
  sh.getRange(row, HUB.COL.FOLDER).setRichTextValue(rt);
  hubCacheClear('sessions');
  return {id:folder.getId(), name:name, url:url};
}

function apiCreateFolder(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thao tác trên buổi đào tạo do mình phụ trách.'};
  var info = hubWithLock(function(){
    return hubEnsureFolder(hubReportSheet(), s.row, {date:s.date, type:s.type, category:s.category, audience:s.audience, topic:s.topic});
  });
  hubCacheClear('mats:' + s.sid);
  hubLog('INFO', 'createFolder', s.sid + ' -> ' + info.name, info.url);
  return {ok:true, message:'Đã tạo thư mục: ' + info.name, folder:info};
}

/** Nguồn tài liệu của buổi: {folder} hoặc {file} (link ô D trỏ thẳng vào 1 file) */
function hubSessionSource(s) {
  var id = hubDriveIdFromUrl(s.folderUrl);
  if (id) {
    try { return {folder: DriveApp.getFolderById(id)}; } catch (e) {}
    try { return {file: DriveApp.getFileById(id)}; } catch (e) {}
    return {noAccess: true, id: id};            // ★ v3.0: có link nhưng tài khoản chạy hệ thống không vào được
  }
  // tìm theo tên trong folder chủ đề, rồi folder mẹ
  var name = s.folderName || hubFolderName(s.date, s.type, s.category, s.audience);
  if (!name) return null;
  var places = [];
  try { places.push(hubCategoryFolder(s.category)); } catch (e) {}
  try { places.push(DriveApp.getFolderById(HUB.DRIVE.PARENT)); } catch (e) {}
  for (var i = 0; i < places.length; i++) {
    var it = places[i].getFoldersByName(name);
    if (it.hasNext()) return {folder: it.next()};
  }
  return null;
}

/** Tương thích v1 */
function hubSessionFolder(s) {
  var src = hubSessionSource(s);
  return src && src.folder ? src.folder : null;
}

function hubPreviewUrl(id, mime) {
  if (mime === MimeType.GOOGLE_SLIDES) return 'https://docs.google.com/presentation/d/' + id + '/preview';
  if (mime === MimeType.GOOGLE_DOCS)   return 'https://docs.google.com/document/d/' + id + '/preview';
  if (mime === MimeType.GOOGLE_SHEETS) return 'https://docs.google.com/spreadsheets/d/' + id + '/preview';
  return 'https://drive.google.com/file/d/' + id + '/preview';
}

function hubFileKind(mime, name) {
  var n = (name || '').toLowerCase();
  mime = mime || '';
  if (mime === MimeType.GOOGLE_SLIDES || /\.(pptx?|ppsx?)$/.test(n)) return 'slide';
  if (/pdf/.test(mime) || /\.pdf$/.test(n))                        return 'pdf';
  if (mime === MimeType.GOOGLE_DOCS || /\.(docx?|rtf|odt)$/.test(n)) return 'doc';
  if (mime === MimeType.GOOGLE_SHEETS || /\.(xlsx?|csv|ods)$/.test(n)) return 'sheet';
  if (/^image\//.test(mime))                                        return 'image';
  if (/^video\//.test(mime) || /\.(mp4|mov|avi|mkv|webm)$/.test(n))  return 'video';
  if (/^audio\//.test(mime))                                        return 'audio';
  return 'file';
}

/** Cách hiển thị trong Hub:
 *  pdf    → tải thẳng
 *  gdoc   → Google Docs/Slides/Sheets xuất PDF
 *  office → PPTX/DOCX/XLSX chuyển sang PDF (qua Drive API) rồi hiển thị
 *  image  → ảnh
 *  drive  → video/khác: mở trình xem Drive */
function hubViewMode(mime, name) {
  var n = (name || '').toLowerCase();
  if (/pdf/.test(mime) || /\.pdf$/.test(n)) return 'pdf';
  if (mime === MimeType.GOOGLE_SLIDES || mime === MimeType.GOOGLE_DOCS || mime === MimeType.GOOGLE_SHEETS) return 'gdoc';
  if (/\.(pptx?|ppsx?|docx?|xlsx?|rtf|odt|odp|ods)$/.test(n) ||
      /officedocument|msword|ms-excel|ms-powerpoint|opendocument/.test(mime)) return 'office';
  if (/^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/.test(mime)) return 'image';
  return 'drive';
}

function hubSizeText(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function hubFileInfo(f, path, pathArr) {
  var mime = f.getMimeType(), name = f.getName(), file = f;
  if (mime === 'application/vnd.google-apps.shortcut') {
    try {
      var tMime = f.getTargetMimeType();
      if (tMime === MimeType.FOLDER) return null;
      file = DriveApp.getFileById(f.getTargetId());
      mime = file.getMimeType();
    } catch (e) { return null; }
  }
  var id = file.getId(), size = 0, updated = null, linkShared = false;
  try { size = file.getSize(); } catch (e) {}
  try { updated = file.getLastUpdated(); } catch (e) {}
  try { var acc = file.getSharingAccess(); linkShared = acc == DriveApp.Access.DOMAIN_WITH_LINK || acc == DriveApp.Access.ANYONE_WITH_LINK || acc == DriveApp.Access.DOMAIN || acc == DriveApp.Access.ANYONE; } catch (e) {}
  return {
    id: id,
    name: name,
    mime: mime,
    kind: hubFileKind(mime, name),
    view: hubViewMode(mime, name),
    path: path || '',
    pathArr: pathArr || [],
    size: size,
    sizeText: hubSizeText(size),
    url: file.getUrl(),
    preview: hubPreviewUrl(id, mime),
    download: 'https://drive.google.com/uc?export=download&id=' + id,
    updated: updated ? hubFmt(updated, 'dd/MM/yyyy HH:mm') : '',
    updatedMs: updated ? updated.getTime() : 0,
    linkShared: linkShared
  };
}

var HUB_WALK_DEADLINE = 0;
function hubWalkFolder(folder, pathArr, depth, out, folders) {
  if (!HUB_WALK_DEADLINE) HUB_WALK_DEADLINE = Date.now() + HUB.MATERIAL_BUDGET_MS;
  if (Date.now() > HUB_WALK_DEADLINE || (folders && folders.length > HUB.MATERIAL_MAX_FOLDERS)) return;
  var path = pathArr.join(' / ');
  var it = folder.getFiles();
  while (it.hasNext() && out.length < HUB.MATERIAL_MAX_FILES) {
    var info = hubFileInfo(it.next(), path, pathArr);
    if (info) out.push(info);
  }
  if (depth >= HUB.MATERIAL_DEPTH) return;
  var fit = folder.getFolders();
  while (fit.hasNext() && out.length < HUB.MATERIAL_MAX_FILES) {
    var sub = fit.next();
    var subArr = pathArr.concat([sub.getName()]);
    if (folders) folders.push({id: sub.getId(), name: sub.getName(), path: subArr.join(' / '), pathArr: subArr, url: sub.getUrl()});
    hubWalkFolder(sub, subArr, depth + 1, out, folders);
  }
}

/** Đường dẫn hiển thị của thư mục: Đào tạo › Product › 20260818_... */
function hubFolderCrumb(folder) {
  var names = [folder.getName()], cur = folder;
  try {
    for (var i = 0; i < 4; i++) {
      if (cur.getId() === HUB.DRIVE.PARENT || cur.getId() === HUB.TEST.FOLDER) break;
      var ps = cur.getParents();
      if (!ps.hasNext()) break;
      cur = ps.next();
      names.unshift(cur.getName());
      if (cur.getId() === HUB.DRIVE.PARENT || cur.getId() === HUB.TEST.FOLDER) break;
    }
  } catch (e) {}
  return names;
}

/** Danh sách tài liệu của buổi (có đệm 10 phút) */
/** Danh sách tài liệu của buổi.
 *  opt.cacheOnly → chỉ trả khi đã có trong đệm (không đụng Drive), null nếu chưa có.
 *  opt.noWait    → nếu lượt khác đang đọc thì trả {pending:true} ngay.
 *  Chỉ 1 lượt đọc Drive cho mỗi buổi tại một thời điểm; các lượt khác chờ kết quả. */
function hubMaterials(s, opt) {
  opt = opt || {};
  var key = 'mats:' + s.sid;
  if (HUB_MEM.hasOwnProperty(key)) return HUB_MEM[key];
  var v = hubCacheGet(key);
  if (v) { HUB_MEM[key] = v; return v; }
  if (opt.cacheOnly) return null;
  var sc = hubSC(), busyKey = 'busy:' + key;
  if (sc.get(busyKey)) {
    if (opt.noWait) return {pending:true, files:[], folders:[]};
    for (var i = 0; i < 20; i++) {                 // lượt khác đang đọc → chờ tối đa ~20 giây
      Utilities.sleep(1000);
      v = hubCacheGet(key);
      if (v) { HUB_MEM[key] = v; return v; }
      if (!sc.get(busyKey)) break;
    }
    if (!v && sc.get(busyKey)) return {pending:true, files:[], folders:[]};
  }
  sc.put(busyKey, String(Date.now()), 60);
  try {
    v = hubMaterialsRaw(s);
    hubCachePut(key, v, HUB.MATERIAL_CACHE_TTL);
    HUB_MEM[key] = v;
    return v;
  } finally {
    try { sc.remove(busyKey); } catch (e) {}
  }
}
/** ★ v2.2 — Drive API v3: liệt kê con của nhiều thư mục trong 1 lệnh */
function hubDriveApi(path, query) {
  var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/' + path + (query ? '?' + query : ''), {
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Drive API ' + res.getResponseCode() + ': ' + String(res.getContentText()).substring(0, 160));
  return JSON.parse(res.getContentText());
}
function hubDriveChildren(parentIds) {
  var q = '(' + parentIds.map(function(id){ return "'" + id + "' in parents"; }).join(' or ') + ') and trashed = false';
  var fields = 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,shortcutDetails(targetId,targetMimeType),permissions(type,role))';
  var out = [], token = '';
  do {
    var j = hubDriveApi('files', 'q=' + encodeURIComponent(q) + '&fields=' + encodeURIComponent(fields) +
      '&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=name' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    out = out.concat(j.files || []);
    token = j.nextPageToken || '';
  } while (token && out.length < 3000);
  return out;
}
function hubApiFileInfo(it, pathArr) {
  var id = it.id, mime = it.mimeType, size = Number(it.size || 0);
  var upd = it.modifiedTime ? new Date(it.modifiedTime) : null;
  return {
    id: id, name: it.name, mime: mime, kind: hubFileKind(mime, it.name), view: hubViewMode(mime, it.name),
    path: pathArr.join(' / '), pathArr: pathArr, size: size, sizeText: hubSizeText(size),
    url: it.webViewLink || ('https://drive.google.com/file/d/' + id + '/view'),
    preview: hubPreviewUrl(id, mime), download: 'https://drive.google.com/uc?export=download&id=' + id,
    updated: upd ? hubFmt(upd, 'dd/MM/yyyy HH:mm') : '', updatedMs: upd ? upd.getTime() : 0,
    linkShared: (it.permissions || []).some(function(x){ return x.type === 'domain' || x.type === 'anyone'; })   // ★ v3.2
  };
}
/** Quét thư mục theo từng cấp: mỗi cấp chỉ 1 lệnh Drive API cho mọi thư mục cùng cấp */
function hubMaterialsApi(root) {
  var files = [], folders = [], level = [{id: root.getId(), arr: []}];
  var deadline = Date.now() + HUB.MATERIAL_BUDGET_MS, truncated = false;
  for (var depth = 0; depth <= HUB.MATERIAL_DEPTH && level.length && files.length < HUB.MATERIAL_MAX_FILES; depth++) {
    if (Date.now() > deadline || folders.length > HUB.MATERIAL_MAX_FOLDERS) { truncated = true; break; }
    var arrOf = {};
    level.forEach(function(l){ arrOf[l.id] = l.arr; });
    var items = [];
    for (var i = 0; i < level.length; i += 30) {
      if (Date.now() > deadline) { truncated = true; break; }
      items = items.concat(hubDriveChildren(level.slice(i, i + 30).map(function(l){ return l.id; })));
    }
    var next = [];
    items.forEach(function(it){
      var arr = [];
      (it.parents || []).some(function(pid){ if (arrOf[pid]) { arr = arrOf[pid]; return true; } return false; });
      if (it.mimeType === MimeType.FOLDER) {
        if (depth >= HUB.MATERIAL_DEPTH || folders.length >= HUB.MATERIAL_MAX_FOLDERS) { truncated = true; return; }
        var sub = arr.concat([it.name]);
        folders.push({id: it.id, name: it.name, path: sub.join(' / '), pathArr: sub, url: 'https://drive.google.com/drive/folders/' + it.id});
        next.push({id: it.id, arr: sub});
        return;
      }
      if (files.length >= HUB.MATERIAL_MAX_FILES) { truncated = true; return; }
      if (it.mimeType === 'application/vnd.google-apps.shortcut') {
        if (Date.now() > deadline) { truncated = true; return; }
        var sd = it.shortcutDetails || {};
        if (!sd.targetId || sd.targetMimeType === MimeType.FOLDER) return;
        try {
          var t = hubDriveApi('files/' + encodeURIComponent(sd.targetId), 'fields=' + encodeURIComponent('id,name,mimeType,size,modifiedTime,webViewLink,permissions(type,role)') + '&supportsAllDrives=true');
          t.name = it.name;
          files.push(hubApiFileInfo(t, arr));
        } catch (e) {}
        return;
      }
      files.push(hubApiFileInfo(it, arr));
    });
    level = next;
  }
  return {files: files, folders: folders, truncated: truncated};
}

function hubMaterialsRaw(s) {
  var src = hubSessionSource(s);
  if (!src) return {files:[], folderUrl:'', folderName:'', folderId:'', message:'Buổi đào tạo chưa có thư mục tài liệu.'};
  if (src.noAccess) return {files:[], folders:[], folderUrl:s.folderUrl, folderName:'', folderId:src.id, noAccess:true, runner:hubRunnerEmail(),
    message:'Tài khoản chạy hệ thống (' + hubRunnerEmail() + ') chưa được chia sẻ thư mục tài liệu của buổi này, nên Hub không đọc được. Chủ thư mục cần chia sẻ cho tài khoản này (quyền Người xem, hoặc Người chỉnh sửa nếu muốn tải file lên từ Hub).'};
  var out = [], folders = [];
  if (src.file) {
    var one = hubFileInfo(src.file, '');
    if (one) out.push(one);
    return {files:out, folderUrl:s.folderUrl, folderName:src.file.getName(), folderId:'', single:true};
  }
  var truncated = false;
  try {
    var api = hubMaterialsApi(src.folder);          // nhanh: Drive API
    out = api.files; folders = api.folders; truncated = api.truncated;
  } catch (e) {
    hubLog('WARN', 'materialsApi', 'Drive API lỗi, dùng DriveApp: ' + e.message, s.sid);
    out = []; folders = [];
    HUB_WALK_DEADLINE = 0;
    hubWalkFolder(src.folder, [], 0, out, folders);  // dự phòng: DriveApp
    truncated = Date.now() > HUB_WALK_DEADLINE;
  }
  var seen = {};                                   // shortcut + file gốc → chỉ giữ 1
  out = out.filter(function(f){ if (seen[f.id]) return false; seen[f.id] = true; return true; });
  out.sort(function(a, b){
    if (a.path !== b.path) return a.path ? (b.path ? a.path.localeCompare(b.path) : 1) : -1;
    return a.name.localeCompare(b.name);
  });
  folders.sort(function(a, b){ return a.path.localeCompare(b.path); });
  if (truncated) hubLog('WARN', 'materials', s.sid + ': thư mục quá lớn — chỉ đọc ' + out.length + ' file / ' + folders.length + ' thư mục', src.folder.getUrl());
  return {files:out, folders:folders, folderUrl:src.folder.getUrl(), folderName:src.folder.getName(),
          folderId:src.folder.getId(), crumb:hubFolderCrumb(src.folder), truncated:truncated};
}

function apiListMaterials(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (hubBool(p.fresh)) hubCacheClear('mats:' + s.sid);
  var m = hubMaterials(s);
  var pre = hubPrefix(user.email);
  var prog = hubReadProgress().filter(function(x){ return x.sid === s.sid && x.email === pre; });
  return {ok:true, data:m.files, folders:m.folders || [], crumb:m.crumb || [], single:!!m.single, pending:!!m.pending, truncated:!!m.truncated,
          noAccess:!!m.noAccess, runner:m.runner || '',
          folderUrl:m.folderUrl, folderName:m.folderName, message:m.message || '', myProgress:prog,
          chunkSize:HUB.UPLOAD_CHUNK, maxMb:HUB.UPLOAD_MAX_MB};
}

/** Upload tài liệu (POST, base64) */
function apiUploadMaterial(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được tải tài liệu lên buổi đào tạo do mình phụ trách.'};
  var filename = hubNorm(p.filename);
  var data = hubNorm(p.data);
  if (!filename || !data) return {ok:false, error:'Thiếu file.'};

  var src = hubSessionSource(s);
  var folder = src && src.folder ? src.folder : null;
  if (!folder) {
    var info = hubWithLock(function(){
      return hubEnsureFolder(hubReportSheet(), s.row, {date:s.date, type:s.type, category:s.category, audience:s.audience, topic:s.topic});
    });
    folder = DriveApp.getFolderById(info.id);
  }

  var blob = Utilities.newBlob(Utilities.base64Decode(data), hubNorm(p.mime) || 'application/octet-stream', filename);
  var file = folder.createFile(blob);
  hubApplySharing(file);
  hubCacheClear('mats:' + s.sid);

  hubLog('INFO', 'uploadMaterial', s.sid + ' <- ' + filename + ' by ' + user.email, file.getUrl());
  return {ok:true, message:'Đã tải lên: ' + filename, file:hubFileInfo(file, '')};
}

function apiDeleteMaterial(p, user) {
  var fileId = hubNorm(p.fileId);
  if (!fileId) return {ok:false, error:'Thiếu mã file.'};
  var sid = hubNorm(p.sid);
  if (sid) {
    var s = hubFindSession(sid);
    if (s && !hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được xoá tài liệu của buổi do mình phụ trách.'};
    hubCacheClear('mats:' + sid);
  } else if (user.role !== 'admin') {
    return {ok:false, error:'Thiếu mã buổi đào tạo.'};
  }
  var f = DriveApp.getFileById(fileId);
  var name = f.getName();
  f.setTrashed(true);
  hubLog('WARN', 'deleteMaterial', name + ' by ' + user.email, fileId);
  return {ok:true, message:'Đã xoá: ' + name};
}

/** ★ v2 — Chia sẻ toàn bộ tài liệu của buổi cho cả công ty (xem bằng link) */
function apiShareMaterials(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thao tác trên buổi đào tạo do mình phụ trách.'};
  var src = hubSessionSource(s);
  if (!src) return {ok:false, error:'Buổi đào tạo chưa có thư mục tài liệu.'};
  var okN = 0, fail = [];
  if (src.folder) hubApplySharing(src.folder);
  var m = hubMaterialsRaw(s);
  m.files.forEach(function(f){
    try { if (hubApplySharing(DriveApp.getFileById(f.id))) okN++; else fail.push(f.name); }
    catch (e) { fail.push(f.name); }
  });
  hubCacheClear('mats:' + s.sid);
  return {ok:true, shared:okN, failed:fail,
    message: 'Đã mở quyền xem cho ' + okN + ' tài liệu' + (fail.length ? '; ' + fail.length + ' file không đổi được quyền (không phải chủ sở hữu).' : '.')};
}

// ---------- ★ v2.1 — UPLOAD KIỂU GOOGLE DRIVE ----------
//  Luồng: uploadInit (tạo phiên resumable của Drive + gửi luôn phần đầu)
//         → uploadChunk (mỗi 8MB) → file hoàn tất nằm đúng thư mục.
//  Máy chủ chuyển tiếp từng phần tới Drive bằng token của script — trình
//  duyệt không bao giờ nhận token Drive.

/** Thư mục gốc để upload của buổi — tự tạo nếu chưa có */
function hubUploadRoot(s) {
  var src = hubSessionSource(s);
  if (src && src.folder) return src.folder;
  if (src && src.noAccess) throw new Error('Tài khoản chạy hệ thống (' + hubRunnerEmail() + ') chưa được chia sẻ thư mục của buổi này (quyền Người chỉnh sửa) nên không tải file lên được.');
  if (src && src.file) {
    throw new Error('Ô Training Folder của buổi này đang trỏ tới một FILE chứ không phải thư mục. ' +
      'Hãy đổi thành link thư mục, hoặc xoá link để hệ thống tự tạo thư mục chuẩn.');
  }
  var info = hubWithLock(function(){
    return hubEnsureFolder(hubReportSheet(), s.row, {date:s.date, type:s.type, category:s.category, audience:s.audience, topic:s.topic});
  });
  return DriveApp.getFolderById(info.id);
}

/** Tên file/thư mục an toàn (giữ tiếng Việt, bỏ ký tự điều khiển) */
function hubCleanName(n, max) {
  n = hubNorm(n).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (n === '.' || n === '..') n = '';
  return n.substring(0, max || 180);
}

/** Tạo/tìm thư mục con theo đường dẫn ["Video","Buổi 1"] bên trong thư mục gốc */
function hubEnsureSubPath(root, segs) {
  segs = hubList(segs).map(function(x){ return hubCleanName(x, 120); }).filter(Boolean);
  if (segs.length > 5) throw new Error('Thư mục lồng quá sâu (tối đa 5 cấp).');
  var cur = root;
  for (var i = 0; i < segs.length; i++) {
    var it = cur.getFoldersByName(segs[i]);
    cur = it.hasNext() ? it.next() : cur.createFolder(segs[i]);
  }
  return cur;
}

function hubUploadGet(id, user) {
  var raw = PropertiesService.getScriptProperties().getProperty('UP_' + hubNorm(id));
  if (!raw) throw new Error('Phiên tải lên đã hết hạn — vui lòng tải lại file này.');
  var up = JSON.parse(raw);
  if (up.email !== hubPrefix(user.email)) throw new Error('Phiên tải lên không thuộc về bạn.');
  return up;
}

/** Gửi 1 phần dữ liệu tới phiên resumable của Drive */
function hubUploadForward(id, up, offset, bytes) {
  var end = offset + bytes.length - 1;
  var res = UrlFetchApp.fetch(up.uri, {
    method: 'put',
    contentType: up.mime || 'application/octet-stream',
    payload: bytes,
    headers: {'Content-Range': 'bytes ' + offset + '-' + end + '/' + up.size},
    muteHttpExceptions: true,
    followRedirects: false
  });
  return hubUploadResult(id, up, res);
}

function hubUploadResult(id, up, res) {
  var code = res.getResponseCode();
  if (code === 200 || code === 201) {
    var meta = {};
    try { meta = JSON.parse(res.getContentText() || '{}'); } catch (e) {}
    var file = DriveApp.getFileById(meta.id || up.fileId);
    hubApplySharing(file);
    PropertiesService.getScriptProperties().deleteProperty('UP_' + id);
    hubCacheClear('mats:' + up.sid);
    hubLog('INFO', 'upload', up.sid + ' <- ' + up.name + ' (' + hubSizeText(up.size) + ')' + (up.replace ? ' [thay thế]' : ''), file.getUrl());
    return {ok:true, done:true, next:up.size, file:hubFileInfo(file, (up.path || []).join(' / '), up.path || []), replaced:!!up.replace};
  }
  if (code === 308) {
    var h = res.getHeaders() || {};
    var range = h['Range'] || h['range'] || '';
    var m = String(range).match(/-(\d+)$/);
    return {ok:true, done:false, next: m ? Number(m[1]) + 1 : 0};
  }
  if (code === 404 || code === 410) {
    PropertiesService.getScriptProperties().deleteProperty('UP_' + id);
    return {ok:false, code:'UPLOAD_EXPIRED', error:'Phiên tải lên đã hết hạn — vui lòng tải lại file này.'};
  }
  return {ok:false, error:'Drive từ chối dữ liệu (mã ' + code + '): ' + String(res.getContentText()).substring(0, 180)};
}

/** Bắt đầu tải 1 file. Tham số: sid, name, size, mime, path (mảng tên thư mục con),
 *  mode ('new' | 'replace'), data (base64 phần đầu — không bắt buộc). */
function apiUploadInit(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được tải tài liệu lên buổi đào tạo do mình phụ trách.'};
  var name = hubCleanName(p.name);
  var size = Math.max(0, Math.round(hubNum(p.size, 0)));
  var mime = hubNorm(p.mime) || 'application/octet-stream';
  if (!name) return {ok:false, error:'Tên file không hợp lệ.'};
  if (size > HUB.UPLOAD_MAX_MB * 1048576) return {ok:false, error:'File lớn hơn ' + HUB.UPLOAD_MAX_MB + 'MB — hãy tải thẳng lên Drive.'};

  var root = hubUploadRoot(s);
  var segs = hubList(p.path);
  var target = hubEnsureSubPath(root, segs);
  var pathArr = segs.map(function(x){ return hubCleanName(x, 120); }).filter(Boolean);

  // file rỗng: tạo trực tiếp
  if (size === 0) {
    var f0 = target.createFile(Utilities.newBlob([], mime, name));
    hubApplySharing(f0);
    hubCacheClear('mats:' + s.sid);
    return {ok:true, done:true, next:0, file:hubFileInfo(f0, pathArr.join(' / '), pathArr)};
  }

  var existing = null;
  if (hubNorm(p.mode) === 'replace') {
    var it = target.getFilesByName(name);
    if (it.hasNext()) existing = it.next();
  }
  var url, method, meta;
  if (existing) {
    url = 'https://www.googleapis.com/upload/drive/v3/files/' + existing.getId() + '?uploadType=resumable&supportsAllDrives=true&fields=id';
    method = 'patch'; meta = {};
  } else {
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id';
    method = 'post'; meta = {name: name, parents: [target.getId()], mimeType: mime};
  }
  var res = UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json; charset=UTF-8',
    payload: JSON.stringify(meta),
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size)},
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    return {ok:false, error:'Không mở được phiên tải lên Drive (mã ' + res.getResponseCode() + '). Chạy kiemTraQuyen() để kiểm tra quyền.'};
  }
  var hd = res.getHeaders() || {};
  var uri = hd['Location'] || hd['location'];
  if (!uri) return {ok:false, error:'Drive không trả về địa chỉ tải lên.'};

  var id = hubUid('U');
  var up = {uri: uri, sid: s.sid, email: hubPrefix(user.email), name: name, size: size, mime: mime,
            path: pathArr, replace: !!existing, fileId: existing ? existing.getId() : '', at: Date.now()};
  PropertiesService.getScriptProperties().setProperty('UP_' + id, JSON.stringify(up));

  var out = {ok:true, uploadId:id, done:false, next:0, chunkSize:HUB.UPLOAD_CHUNK,
             folder:{id:target.getId(), name:target.getName(), url:target.getUrl()}, replaced:!!existing};
  if (p.data) {
    var r = hubUploadForward(id, up, 0, Utilities.base64Decode(hubNorm(p.data)));
    if (!r.ok) return r;
    out.done = r.done; out.next = r.next; out.file = r.file;
  }
  return out;
}

function apiUploadChunk(p, user) {
  var id = hubNorm(p.uploadId);
  var up = hubUploadGet(id, user);
  var offset = Math.max(0, Math.round(hubNum(p.offset, 0)));
  return hubUploadForward(id, up, offset, Utilities.base64Decode(hubNorm(p.data)));
}

/** Hỏi Drive đã nhận tới byte nào (dùng khi gửi lại sau lỗi mạng) */
function apiUploadStatus(p, user) {
  var id = hubNorm(p.uploadId);
  var up = hubUploadGet(id, user);
  var res = UrlFetchApp.fetch(up.uri, {method:'put', payload:'', headers:{'Content-Range':'bytes */' + up.size},
                                       muteHttpExceptions:true, followRedirects:false});
  return hubUploadResult(id, up, res);
}

function apiCreateSubfolder(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thao tác trên buổi đào tạo do mình phụ trách.'};
  var name = hubCleanName(p.name, 120);
  if (!name) return {ok:false, error:'Vui lòng nhập tên thư mục.'};
  var f = hubEnsureSubPath(hubUploadRoot(s), hubList(p.path).concat([name]));
  hubCacheClear('mats:' + s.sid);
  return {ok:true, message:'Đã tạo thư mục "' + name + '".', folder:{id:f.getId(), name:f.getName(), url:f.getUrl()}};
}

function apiRenameMaterial(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thao tác trên buổi đào tạo do mình phụ trách.'};
  var name = hubCleanName(p.name);
  if (!name) return {ok:false, error:'Tên mới không hợp lệ.'};
  var m = hubMaterials(s), ok = false;
  m.files.forEach(function(f){ if (f.id === hubNorm(p.fileId)) ok = true; });
  if (!ok) return {ok:false, error:'Tài liệu không thuộc buổi đào tạo này.'};
  DriveApp.getFileById(hubNorm(p.fileId)).setName(name);
  hubCacheClear('mats:' + s.sid);
  return {ok:true, message:'Đã đổi tên thành "' + name + '".'};
}

/** Khi sửa buổi: đổi tên thư mục theo quy tắc chuẩn & chuyển về đúng nhóm chủ đề.
 *  Chỉ áp dụng cho thư mục mang tên chuẩn do hệ thống đặt (không đụng thư mục tự đặt tên). */
function hubRelocateFolder(before, after, sh, row) {
  var id = hubDriveIdFromUrl(before.folderUrl);
  if (!id) return '';
  var folder;
  try { folder = DriveApp.getFolderById(id); } catch (e) { return ''; }
  var notes = [];
  var oldName = hubFolderName(before.date, before.type, before.category, before.audience);
  var newName = hubFolderName(after.date, after.type, after.category, after.audience);
  if (folder.getName() === oldName && newName !== oldName) {
    folder.setName(newName);
    sh.getRange(row, HUB.COL.FOLDER).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(newName).setLinkUrl(folder.getUrl()).build());
    notes.push('đổi tên thư mục');
  }
  try {
    var oldCat = hubCategoryFolder(before.category), newCat = hubCategoryFolder(after.category);
    if (oldCat.getId() !== newCat.getId()) {
      var ps = folder.getParents(), inOld = false;
      while (ps.hasNext()) if (ps.next().getId() === oldCat.getId()) inOld = true;
      if (inOld) { folder.moveTo(newCat); notes.push('chuyển sang nhóm ' + after.category); }
    }
  } catch (e) { hubLog('WARN', 'relocateFolder', before.sid, e.message); }
  if (notes.length) hubCacheClear('mats:' + before.sid);
  return notes.join(', ');
}

// ---------- Xem tài liệu trong Hub (máy chủ trả nội dung) ----------

function hubPreviewFolder() {
  return hubCached('pvFolder', function(){
    var props = PropertiesService.getScriptProperties();
    var id = props.getProperty('HUB_PREVIEW_FOLDER');
    if (id) {
      try { var f0 = DriveApp.getFolderById(id); if (!f0.isTrashed()) return f0; } catch (e) {}
    }
    var it = DriveApp.getFoldersByName(HUB.PREVIEW_FOLDER_NAME);
    var f = it.hasNext() ? it.next() : DriveApp.createFolder(HUB.PREVIEW_FOLDER_NAME);
    props.setProperty('HUB_PREVIEW_FOLDER', f.getId());
    return f;
  });
}

/** Chuyển file Office sang PDF: copy thành Google Docs/Slides/Sheets rồi xuất PDF */
function hubConvertOfficeToPdf(file, info) {
  var n = (info.name || '').toLowerCase();
  var target =
    /\.(pptx?|ppsx?|odp)$/.test(n) || /presentation|powerpoint/.test(info.mime) ? MimeType.GOOGLE_SLIDES :
    /\.(xlsx?|ods|csv)$/.test(n)   || /spreadsheet|excel/.test(info.mime)       ? MimeType.GOOGLE_SHEETS :
    MimeType.GOOGLE_DOCS;
  var folder = hubPreviewFolder();
  var res = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.getId()) + '/copy?supportsAllDrives=true&fields=id',
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({name: 'tmp_' + file.getId(), mimeType: target, parents: [folder.getId()]}),
      headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()},
      muteHttpExceptions: true
    });
  if (res.getResponseCode() >= 300) {
    throw new Error('Không chuyển đổi được "' + info.name + '" (mã ' + res.getResponseCode() + '). Hãy bấm "Mở trên Drive".');
  }
  var tmpId = JSON.parse(res.getContentText()).id;
  try {
    return DriveApp.getFileById(tmpId).getAs(MimeType.PDF);
  } finally {
    try { DriveApp.getFileById(tmpId).setTrashed(true); } catch (e) {}
  }
}

/** PDF xem trước (có lưu bản đã chuyển đổi để lần sau mở ngay) */
function hubCachedPdf(file, info) {
  var folder = hubPreviewFolder();
  var cacheName = info.id + '_' + (info.updatedMs || 0) + '.pdf';
  var it = folder.getFilesByName(cacheName);
  if (it.hasNext()) return {blob: it.next().getBlob(), cached: true};

  var blob = info.view === 'office' ? hubConvertOfficeToPdf(file, info) : file.getAs(MimeType.PDF);
  blob.setName(cacheName);
  folder.createFile(blob);
  // dọn bản cũ của cùng file
  try {
    var old = folder.searchFiles('title contains "' + info.id + '_"');
    while (old.hasNext()) {
      var o = old.next();
      if (o.getName() !== cacheName) o.setTrashed(true);
    }
  } catch (e) {}
  return {blob: blob, cached: false};
}

/** ★ v2.6 — Bản PDF xem trước dưới dạng FILE Drive (không nạp nội dung vào bộ nhớ).
 *  Chỉ 1 lượt chuyển đổi cho mỗi file tại một thời điểm. */
function hubPreviewPdfFile(file, info) {
  var folder = hubPreviewFolder();
  var name = info.id + '_' + (info.updatedMs || 0) + '.pdf';
  var find = function(){ var it = folder.getFilesByName(name); return it.hasNext() ? it.next() : null; };
  var f = find();
  if (f) return {file: f, cached: true};
  var sc = hubSC(), busyKey = 'busy:pv:' + info.id;
  if (sc.get(busyKey)) {
    for (var i = 0; i < 40; i++) { Utilities.sleep(1500); f = find(); if (f) return {file: f, cached: true}; if (!sc.get(busyKey)) break; }
    f = find(); if (f) return {file: f, cached: true};
  }
  sc.put(busyKey, '1', 120);
  try {
    var blob = info.view === 'office' ? hubConvertOfficeToPdf(file, info) : file.getAs(MimeType.PDF);
    blob.setName(name);
    f = folder.createFile(blob);
    try {
      var old = folder.searchFiles('title contains "' + info.id + '_"');
      while (old.hasNext()) { var o = old.next(); if (o.getId() !== f.getId()) o.setTrashed(true); }
    } catch (e) {}
    return {file: f, cached: false};
  } finally { try { sc.remove(busyKey); } catch (e) {} }
}

/** Tìm thông tin 1 tài liệu của buổi (đệm trước, đọc lại nếu cần) */
function hubMaterialInfo(s, fileId) {
  var m = hubMaterials(s), info = null;
  (m.files || []).some(function(f){ if (f.id === fileId) { info = f; return true; } return false; });
  if (!info) {
    hubCacheClear('mats:' + s.sid);
    m = hubMaterials(s);
    (m.files || []).some(function(f){ if (f.id === fileId) { info = f; return true; } return false; });
  }
  return info;
}

// ---------- ★ v3.1 — Chuẩn bị bản xem trước theo từng bước ngắn ----------
//  Tên file trong thư mục xem trước (tài khoản chạy hệ thống):
//    <fileId>_<updatedMs>.pdf     bản PDF để xem
//    <fileId>_<updatedMs>.gcopy   bản Google Slides/Docs/Sheets đã chuyển từ PPTX/DOCX/XLSX
//    <fileId>_<updatedMs>.images  đánh dấu: PDF quá 10MB → xem dạng ảnh từng slide (nội dung = id Slides)

var HUB_EXPORT_MAX = 10 * 1048576;     // giới hạn xuất PDF của Google Drive

function hubPvName(info, ext) { return info.id + '_' + (info.updatedMs || 0) + '.' + ext; }
function hubPvFind(info, ext) {
  var it = hubPreviewFolder().getFilesByName(hubPvName(info, ext));
  return it.hasNext() ? it.next() : null;
}
function hubGoogleTarget(info) {
  var n = (info.name || '').toLowerCase();
  if (info.mime === MimeType.GOOGLE_SLIDES || /\.(pptx?|ppsx?|odp)$/.test(n) || /presentation|powerpoint/.test(info.mime)) return MimeType.GOOGLE_SLIDES;
  if (info.mime === MimeType.GOOGLE_SHEETS || /\.(xlsx?|ods|csv)$/.test(n) || /spreadsheet|excel/.test(info.mime)) return MimeType.GOOGLE_SHEETS;
  return MimeType.GOOGLE_DOCS;
}
/** Id bản Google (gốc nếu đã là Google Docs/Slides/Sheets; bản nhân bản nếu là file Office) */
function hubGoogleId(info) {
  if (info.view === 'gdoc') return info.id;
  var g = hubPvFind(info, 'gcopy');
  return g ? hubNorm(g.getDescription()) || null : null;
}

/** Trạng thái bản xem trước của 1 tài liệu */
function hubPvState(info) {
  if (info.view === 'pdf' || info.view === 'image') return {stage:'ready', target: DriveApp.getFileById(info.id)};
  var pdf = hubPvFind(info, 'pdf');
  if (pdf) return {stage:'ready', target: pdf};
  var img = hubPvFind(info, 'images');
  if (img) return {stage:'images', gid: hubNorm(img.getDescription())};
  if (info.view === 'office' && !hubGoogleId(info)) return {stage:'convert'};
  return {stage:'export'};
}

/** ★ v3.1 — Bước chuẩn bị: nhanh, KHÔNG chuyển đổi. Trả số phần cần tải, hoặc pending + bước kế tiếp. */
function apiFileMeta(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var info = hubMaterialInfo(s, hubNorm(p.fileId));
  if (!info) return {ok:false, error:'Tài liệu không thuộc buổi đào tạo này.'};
  if (info.view === 'drive') return {ok:false, code:'NO_PREVIEW', error:'Định dạng này mở bằng trình xem của Drive.', url:info.url, preview:info.preview};
  var limit = HUB.PREVIEW_MAX_MB * 1048576;
  if ((info.view === 'pdf' || info.view === 'image') && info.size > limit) {
    return {ok:false, code:'TOO_LARGE', error:'File lớn (' + info.sizeText + ') — mở trên Drive để xem nhanh hơn.', url:info.url};
  }
  var st = hubPvState(info);
  if (st.stage === 'images') return {ok:true, mode:'images', id:info.id, name:info.name, updatedMs:info.updatedMs};
  if (st.stage !== 'ready') {
    return {ok:true, pending:true, stage:st.stage, id:info.id, name:info.name, view:info.view,
            message: st.stage === 'convert' ? 'Đang chuyển ' + info.name.split('.').pop().toUpperCase() + ' sang định dạng Google (lần đầu)…' : 'Đang tạo bản PDF để xem (lần đầu)…'};
  }
  var target = st.target, size = target.getSize();
  if (size > limit) return {ok:false, code:'TOO_LARGE', error:'Tài liệu quá lớn để xem trong Hub — mở trên Drive.', url:info.url};
  hubSC().put('pvok:' + hubPrefix(user.email) + ':' + target.getId(), '1', 21600);
  return {ok:true, id:info.id, name:info.name, view:info.view, targetId:target.getId(),
          mime: info.view === 'image' ? info.mime : 'application/pdf', size:size,
          chunk:HUB.FILE_CHUNK, parts:Math.max(1, Math.ceil(size / HUB.FILE_CHUNK)), updatedMs:info.updatedMs};
}

/** ★ v3.1 — Thực hiện ĐÚNG 1 bước chuyển đổi (mỗi bước < 1 phút), trả trạng thái mới */
function apiFileConvert(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var info = hubMaterialInfo(s, hubNorm(p.fileId));
  if (!info) return {ok:false, error:'Tài liệu không thuộc buổi đào tạo này.'};
  if (info.view !== 'office' && info.view !== 'gdoc') return {ok:true, stage:'ready'};
  var sc = hubSC(), busyKey = 'busy:cv:' + info.id;
  if (sc.get(busyKey)) return {ok:true, stage:'busy', message:'Đang có lượt khác chuyển đổi tài liệu này…'};
  sc.put(busyKey, '1', 90);
  var folder = hubPreviewFolder(), auth = {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()};
  try {
    var st = hubPvState(info);
    if (st.stage === 'convert') {
      // Bước 1: nhân bản thành Google Slides/Docs/Sheets (Drive tự chuyển đổi phía máy chủ Google)
      var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(info.id) + '/copy?supportsAllDrives=true&fields=id', {
        method: 'post', contentType: 'application/json', headers: auth, muteHttpExceptions: true,
        payload: JSON.stringify({name: 'Hub preview — ' + info.name, mimeType: hubGoogleTarget(info), parents: [folder.getId()]})
      });
      if (res.getResponseCode() >= 300) {
        return {ok:false, code:'CONVERT_FAILED', url:info.url,
                error:'Google không chuyển được "' + info.name + '" (mã ' + res.getResponseCode() + ': ' + String(res.getContentText()).substring(0, 140) + '). Mở trên Drive để xem.'};
      }
      var gid = JSON.parse(res.getContentText()).id;
      var marker = folder.createFile(Utilities.newBlob(gid, 'text/plain', hubPvName(info, 'gcopy')));
      marker.setDescription(gid);
      return {ok:true, stage:'export'};
    }
    if (st.stage === 'export') {
      // Bước 2: xuất PDF (Drive API — giới hạn 10MB)
      var gid2 = hubGoogleId(info);
      if (!gid2) return {ok:true, stage:'convert'};
      var ex = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(gid2) + '/export?mimeType=application%2Fpdf', {headers: auth, muteHttpExceptions: true});
      var code = ex.getResponseCode(), txt = code === 200 ? '' : String(ex.getContentText()).substring(0, 300);
      if (code === 200) {
        var blob = ex.getBlob().setName(hubPvName(info, 'pdf'));
        folder.createFile(blob);
        hubPvCleanup(info);
        return {ok:true, stage:'ready'};
      }
      var tooBig = /exportSizeLimitExceeded|too large/i.test(txt) || code === 413;
      if (tooBig && hubGoogleTarget(info) === MimeType.GOOGLE_SLIDES) {
        // Bài slide quá lớn → xem dạng ảnh từng slide
        var mk = folder.createFile(Utilities.newBlob(gid2, 'text/plain', hubPvName(info, 'images')));
        mk.setDescription(gid2);
        return {ok:true, stage:'images'};
      }
      return {ok:false, code: tooBig ? 'TOO_LARGE' : 'CONVERT_FAILED', url:info.url,
              error: tooBig ? 'Tài liệu sau chuyển đổi vượt giới hạn xuất PDF 10MB của Google — mở trên Drive để xem.'
                            : 'Google không xuất được bản PDF (mã ' + code + '): ' + txt.substring(0, 140)};
    }
    return {ok:true, stage: st.stage};
  } finally { try { sc.remove(busyKey); } catch (e) {} }
}

/** Dọn bản xem trước cũ (phiên bản file trước) */
function hubPvCleanup(info) {
  try {
    var keep = String(info.updatedMs || 0), it = hubPreviewFolder().searchFiles('title contains "' + info.id + '_"');
    while (it.hasNext()) {
      var f = it.next();
      if (f.getName().indexOf(info.id + '_' + keep + '.') !== 0) {
        if (/\.gcopy$/.test(f.getName())) { try { DriveApp.getFileById(hubNorm(f.getDescription())).setTrashed(true); } catch (e) {} }
        f.setTrashed(true);
      }
    }
  } catch (e) {}
}

/** Id Google Slides đã được xác nhận xem dạng ảnh (không tin id từ trình duyệt) */
function hubImagesGid(p) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) throw new Error('Không tìm thấy buổi đào tạo.');
  var info = hubMaterialInfo(s, hubNorm(p.fileId));
  if (!info) throw new Error('Tài liệu không thuộc buổi đào tạo này.');
  var st = hubPvState(info);
  if (st.stage !== 'images' || !st.gid) throw new Error('Tài liệu chưa sẵn sàng xem dạng ảnh.');
  return st.gid;
}
function hubSlidesApi(path) {
  var res = UrlFetchApp.fetch('https://slides.googleapis.com/v1/' + path, {headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true});
  var code = res.getResponseCode();
  if (code === 200) return JSON.parse(res.getContentText());
  var t = String(res.getContentText());
  if (/has not been used|is disabled|SERVICE_DISABLED/i.test(t)) throw new Error('Chưa bật Google Slides API cho project Apps Script. Admin: Apps Script → Services (+) → Google Slides API → Add, hoặc dán appsscript.json mới rồi chạy lại setupTrainingHub.');
  throw new Error('Slides API lỗi ' + code + ': ' + t.substring(0, 140));
}
/** ★ v3.1 — Danh sách slide (xem dạng ảnh) */
function apiSlidePages(p, user) {
  var gid = hubImagesGid(p);
  var key = 'sp:' + gid, c = hubSC().get(key);
  var pages = c ? JSON.parse(c) : null;
  if (!pages) {
    var j = hubSlidesApi('presentations/' + encodeURIComponent(gid) + '?fields=slides.objectId,pageSize');
    pages = {ids: (j.slides || []).map(function(x){ return x.objectId; }), w: j.pageSize && j.pageSize.width ? j.pageSize.width.magnitude : 16, h: j.pageSize && j.pageSize.height ? j.pageSize.height.magnitude : 9};
    hubSC().put(key, JSON.stringify(pages), 3600);
  }
  return {ok:true, pages:pages.ids, ratio: pages.h / pages.w};
}
/** ★ v3.1 — Ảnh của tối đa 6 slide (link tạm của Google, dùng ~30 phút) */
function apiSlideThumbs(p, user) {
  var gid = hubImagesGid(p), ids = hubList(p.pageIds).slice(0, 6), sc = hubSC(), out = {};
  ids.forEach(function(pid){
    var key = 'th:' + gid + ':' + pid, c = sc.get(key);
    if (c) { out[pid] = c; return; }
    var j = hubSlidesApi('presentations/' + encodeURIComponent(gid) + '/pages/' + encodeURIComponent(pid) + '/thumbnail?thumbnailProperties.thumbnailSize=LARGE');
    out[pid] = j.contentUrl;
    sc.put(key, j.contentUrl, 1500);
  });
  return {ok:true, urls:out};
}

/** ★ v2.6 — Bước 2: tải 1 phần (đọc đúng đoạn byte qua Drive API — bộ nhớ nhỏ) */
function apiFileChunk(p, user) {
  var target = hubNorm(p.targetId), i = Math.max(0, Math.round(hubNum(p.i, 0)));
  if (!hubSC().get('pvok:' + hubPrefix(user.email) + ':' + target)) {
    return {ok:false, code:'NEED_META', error:'Phiên xem tài liệu đã hết hạn — vui lòng mở lại tài liệu.'};
  }
  var start = i * HUB.FILE_CHUNK, end = start + HUB.FILE_CHUNK - 1;
  var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(target) + '?alt=media&supportsAllDrives=true', {
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + end},
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code !== 206 && code !== 200) return {ok:false, error:'Drive không trả dữ liệu (mã ' + code + ').'};
  var bytes = res.getContent();
  if (code === 200 && bytes.length > HUB.FILE_CHUNK) bytes = bytes.slice(start, end + 1);   // máy chủ bỏ qua Range
  return {ok:true, i:i, size:bytes.length, data:Utilities.base64Encode(bytes)};
}

/** ★ v2 — Trả nội dung tài liệu (base64) để hiển thị ngay trong Hub.
 *  Chỉ trả file thuộc thư mục của buổi đào tạo được hỏi. */
function apiFileContent(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var fileId = hubNorm(p.fileId);
  var m = hubMaterials(s), info = null;
  for (var i = 0; i < m.files.length; i++) if (m.files[i].id === fileId) { info = m.files[i]; break; }
  if (!info) {                                   // danh sách đệm có thể cũ — đọc lại 1 lần
    hubCacheClear('mats:' + s.sid);
    m = hubMaterials(s);
    for (var j = 0; j < m.files.length; j++) if (m.files[j].id === fileId) { info = m.files[j]; break; }
  }
  if (!info) return {ok:false, error:'Tài liệu không thuộc buổi đào tạo này.'};

  var limit = HUB.PREVIEW_MAX_MB * 1048576;
  if (info.view === 'drive') return {ok:false, code:'NO_PREVIEW', error:'Định dạng này mở bằng trình xem của Drive.', url:info.url, preview:info.preview};
  if (info.size && info.size > limit * (info.view === 'office' ? 2 : 1)) {
    return {ok:false, code:'TOO_LARGE', error:'File lớn (' + info.sizeText + ') — mở trên Drive để xem nhanh hơn.', url:info.url};
  }

  var file = DriveApp.getFileById(info.id);
  var blob, cached = false;
  if (info.view === 'pdf' || info.view === 'image') {
    blob = file.getBlob();
  } else {
    var r = hubCachedPdf(file, info);
    blob = r.blob; cached = r.cached;
  }
  var bytes = blob.getBytes();
  if (bytes.length > limit) {
    return {ok:false, code:'TOO_LARGE', error:'Tài liệu sau chuyển đổi quá lớn — mở trên Drive.', url:info.url};
  }
  return {
    ok: true,
    id: info.id, name: info.name, view: info.view,
    mime: info.view === 'image' ? (blob.getContentType() || info.mime) : 'application/pdf',
    size: bytes.length, updatedMs: info.updatedMs, cached: cached,
    data: Utilities.base64Encode(bytes)
  };
}


// ============================================================================
//  9. DANH SÁCH THAM DỰ (HUB_Enrollment)
// ============================================================================

var HUB_ENROLL_HEADER = ['SessionID','Topic','Email','Name','AssignedAt','Status','Score','MaxScore','Percent','Pass','Attempt','CompletedAt','CertUrl','CertSentAt'];

function hubEnrollSheet() {
  return hubCached('shEnroll', function(){ return hubEnsureHeader(hubSheet(HUB.SHEETS.ENROLL, true), HUB_ENROLL_HEADER); });
}

function hubReadEnrollment() {
  return hubData('enroll', hubReadEnrollmentRaw);
}
function hubReadEnrollmentRaw() {
  var sh = hubEnrollSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_ENROLL_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    out.push({
      row:i + 2, sid:hubNorm(r[0]), topic:hubNorm(r[1]),
      email:hubMailOf(r[2]), name:hubNorm(r[3]),
      assignedAt:r[4], status:hubNorm(r[5]) || 'Assigned',
      score:r[6] === '' ? '' : hubNum(r[6]), maxScore:r[7] === '' ? '' : hubNum(r[7]),
      percent:r[8] === '' ? '' : hubNum(r[8]), pass:hubBool(r[9]),
      attempt:hubNum(r[10], 0), completedAt:r[11],
      certUrl:hubNorm(r[12]), certSentAt:r[13]
    });
  }
  return out;
}

/** Tạo/đồng bộ danh sách tham dự theo Target Audience */
function hubSyncEnrollment(sid, topic, audience) {
  if (!sid) return 0;
  var emails = hubResolveAudience(audience);
  if (!emails.length) return 0;
  return hubWithLock(function(){
    var sh = hubEnrollSheet();
    hubCacheClear('enroll');                       // đọc mới trong khoá — tránh ghi trùng
    var existing = hubReadEnrollment().filter(function(e){ return e.sid === sid; });
    var have = {};
    existing.forEach(function(e){ have[hubPrefix(e.email)] = true; });
    var nameOf = {};
    hubReadUsers().forEach(function(u){ nameOf[hubPrefix(u.email)] = u.name; });

    var rows = [];
    emails.forEach(function(em){
      var pre = hubPrefix(em);
      if (have[pre]) return;
      have[pre] = true;
      rows.push([sid, topic, hubMailOf(em), nameOf[pre] || pre, new Date(), 'Assigned', '', '', '', false, 0, '', '', '']);
    });
    if (rows.length) {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, HUB_ENROLL_HEADER.length).setValues(rows);
      hubCacheClear('enroll');
    }
    return rows.length;
  });
}

function hubFindEnroll(sid, email) {
  var all = hubReadEnrollment();
  var pre = hubPrefix(email);
  for (var i = 0; i < all.length; i++) {
    if (all[i].sid === sid && hubPrefix(all[i].email) === pre) return all[i];
  }
  return null;
}

/** Thêm/cập nhật 1 dòng tham dự — ghi 1 lần theo lô */
function hubUpsertEnroll(sid, topic, email, fields) {
  return hubWithLock(function(){
    var sh = hubEnrollSheet();
    hubCacheClear('enroll');                       // đọc mới trong khoá để tránh ghi đè
    var e = hubFindEnroll(sid, email);
    var map = {sid:0, topic:1, email:2, name:3, assignedAt:4, status:5, score:6, maxScore:7,
               percent:8, pass:9, attempt:10, completedAt:11, certUrl:12, certSentAt:13};
    var row, rowIdx;
    if (e) {
      rowIdx = e.row;
      row = sh.getRange(rowIdx, 1, 1, HUB_ENROLL_HEADER.length).getValues()[0];
    } else {
      rowIdx = sh.getLastRow() + 1;
      row = [sid, topic, hubMailOf(email), hubNameOf(email), new Date(), 'Assigned', '', '', '', false, 0, '', '', ''];
    }
    for (var k in fields) if (map.hasOwnProperty(k)) row[map[k]] = fields[k];
    sh.getRange(rowIdx, 1, 1, HUB_ENROLL_HEADER.length).setValues([row]);
    hubCacheClear('enroll');
    return hubFindEnroll(sid, email);
  });
}

/** Cập nhật cột V (Completion) trên Training Report */
function hubRefreshCompletion(sid) {
  var s = hubFindSession(sid);
  if (!s) return;
  var list = hubReadEnrollment().filter(function(e){ return e.sid === sid; });
  var passed = list.filter(function(e){ return e.pass; }).length;
  var text = list.length ? (passed + '/' + list.length + ' đạt') : '';
  hubReportSheet().getRange(s.row, HUB.COL.COMPLETION).setValue(text);
  hubCacheClear('sessions');
}


// ============================================================================
//  10. ★ v2 — TIẾN ĐỘ ĐỌC TÀI LIỆU (HUB_Progress)
// ============================================================================

var HUB_PROG_HEADER = ['Email','SessionID','FileID','FileName','FirstOpened','LastOpened','Opens','MaxPage','TotalPages','Percent','Completed'];

function hubProgressSheet() {
  return hubCached('shProgress', function(){ return hubEnsureHeader(hubSheet(HUB.SHEETS.PROGRESS, true), HUB_PROG_HEADER); });
}

function hubReadProgress() {
  return hubData('progress', hubReadProgressRaw);
}
function hubReadProgressRaw() {
  var sh = hubProgressSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_PROG_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0]) || !hubNorm(r[2])) continue;
    out.push({
      row: i + 2, email: hubPrefix(r[0]), sid: hubNorm(r[1]), fileId: hubNorm(r[2]), fileName: hubNorm(r[3]),
      first: r[4] ? new Date(r[4]).toISOString() : '', last: r[5] ? new Date(r[5]).toISOString() : '',
      opens: hubNum(r[6], 0), maxPage: hubNum(r[7], 0), total: hubNum(r[8], 0),
      percent: hubNum(r[9], 0), completed: hubBool(r[10])
    });
  }
  return out;
}

/** Ghi nhận học viên đã mở / đọc tới trang nào */
function apiTrackProgress(p, user) {
  var sid = hubNorm(p.sid), fileId = hubNorm(p.fileId);
  if (!sid || !fileId) return {ok:false, error:'Thiếu thông tin tài liệu.'};
  if (!hubFindSession(sid)) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var page = Math.max(0, Math.round(hubNum(p.page, 0)));
  var total = Math.max(0, Math.round(hubNum(p.total, 0)));
  var done = hubBool(p.done);
  var isOpen = hubBool(p.open);
  var pre = hubPrefix(user.email);

  return hubWithLock(function(){
    var sh = hubProgressSheet();
    var list = hubReadProgressRaw();
    var cur = null;
    for (var i = 0; i < list.length; i++) if (list[i].email === pre && list[i].fileId === fileId && list[i].sid === sid) { cur = list[i]; break; }
    var now = new Date();
    var maxPage = Math.max(cur ? cur.maxPage : 0, page);
    var tot = total || (cur ? cur.total : 0);
    var pct = tot ? Math.min(100, Math.round(maxPage / tot * 100)) : (done ? 100 : (cur ? cur.percent : 0));
    if (done) pct = 100;
    var completed = done || pct >= 95 || (cur ? cur.completed : false);
    var row = [hubMailOf(user.email), sid, fileId, hubNorm(p.fileName) || (cur ? cur.fileName : ''),
               cur && cur.first ? new Date(cur.first) : now, now,
               (cur ? cur.opens : 0) + (isOpen ? 1 : 0), maxPage, tot, pct, completed];
    if (cur) sh.getRange(cur.row, 1, 1, HUB_PROG_HEADER.length).setValues([row]);
    else sh.appendRow(row);
    hubCacheClear('progress');
    var sessionDone = completed ? hubCheckSelfStudyDone(sid, user) : false;
    return {ok:true, percent:pct, completed:completed, maxPage:maxPage, total:tot, sessionDone:sessionDone};
  });
}


/** ★ v2.6 — Buổi KHÔNG có bài kiểm tra: học xong mọi tài liệu → ghi "Completed" */
function hubCheckSelfStudyDone(sid, user) {
  try {
    var s = hubFindSession(sid); if (!s) return false;
    var q = hubReadQuizConfig(sid);
    if (q && q.total > 0) return false;                      // có bài KT → hoàn thành khi đạt bài
    var m = hubMaterials(s, {cacheOnly:true});
    if (!m || !m.files || !m.files.length) return false;
    var pre = hubPrefix(user.email), done = {};
    hubReadProgressRaw().forEach(function(x){ if (x.email === pre && x.sid === sid && x.completed) done[x.fileId] = 1; });
    if (!m.files.every(function(f){ return done[f.id]; })) return false;
    var e = hubFindEnroll(sid, user.email);
    if (e && e.status === 'Completed') return true;
    hubUpsertEnroll(sid, s.topic, user.email, {status:'Completed', completedAt:new Date()});
    return true;
  } catch (err) { return false; }
}

// ============================================================================
//  11. ★ v2 — THÔNG BÁO TRONG ỨNG DỤNG (HUB_Notifications)
// ============================================================================

var HUB_NOTI_HEADER = ['ID','CreatedAt','Email','Type','SessionID','Title','Message','CreatedBy','ReadAt'];

function hubNotiSheet() {
  return hubCached('shNoti', function(){ return hubEnsureHeader(hubSheet(HUB.SHEETS.NOTI, true), HUB_NOTI_HEADER); });
}

/** Tạo thông báo cho danh sách email.
 *  type: session | quiz | reminder | material | invite | cert | info */
function hubNotify(emails, type, sid, title, message, byEmail) {
  if (HUB_CTX.test && HUB_CTX.tester) { title = '[TEST] ' + title; emails = [HUB_CTX.tester.email]; }
  var list = hubUniq((emails || []).map(hubMailOf).filter(function(e){ return e && e.indexOf('@') > 0; }));
  if (!list.length) return 0;
  var now = new Date();
  var rows = list.map(function(em){
    return [hubUid('N'), now, em, type || 'info', sid || '', hubNorm(title).substring(0, 200),
            hubNorm(message).substring(0, 500), hubMailOf(byEmail || ''), ''];
  });
  hubWithLock(function(){
    var sh = hubNotiSheet();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, HUB_NOTI_HEADER.length).setValues(rows);
    hubCacheClear('noti');
  });
  return rows.length;
}

function hubReadNoti() {
  return hubData('noti', hubReadNotiRaw, 120);
}
function hubReadNotiRaw() {
  var sh = hubNotiSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_NOTI_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    out.push({
      row: i + 2, id: hubNorm(r[0]), at: r[1] ? new Date(r[1]).toISOString() : '',
      email: hubPrefix(r[2]), type: hubNorm(r[3]), sid: hubNorm(r[4]),
      title: hubNorm(r[5]), message: hubNorm(r[6]), by: hubPrefix(r[7]),
      read: !!hubNorm(r[8])
    });
  }
  return out;
}

function hubMyNoti(user) {
  var pre = hubPrefix(user.email);
  return hubReadNoti()
    .filter(function(n){ return n.email === pre && hubIsTestSid(n.sid) === !!HUB_CTX.test; })
    .sort(function(a, b){ return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
}

function apiNotifications(p, user) {
  var mine = hubMyNoti(user);
  var unread = mine.filter(function(n){ return !n.read; }).length;
  var byName = {};
  hubReadUsers().forEach(function(u){ byName[hubPrefix(u.email)] = u.name; });
  var items = mine.slice(0, Math.min(80, hubNum(p.limit, 60))).map(function(n){
    return {id:n.id, at:n.at, type:n.type, sid:n.sid, title:n.title, message:n.message, by:byName[n.by] || n.by, read:n.read};
  });
  return {ok:true, unread:unread, items:items};
}

function apiMarkRead(p, user) {
  var ids = hubList(p.ids);
  var all = hubBool(p.all);
  if (!all && !ids.length) return {ok:true, updated:0};
  var pre = hubPrefix(user.email);
  var want = {};
  ids.forEach(function(id){ want[hubNorm(id)] = true; });

  return hubWithLock(function(){
    var sh = hubNotiSheet();
    var last = sh.getLastRow();
    if (last < 2) return {ok:true, updated:0};
    var keyCols = sh.getRange(2, 1, last - 1, 3).getValues();   // ID, CreatedAt, Email
    var readCol = sh.getRange(2, 9, last - 1, 1).getValues();
    var now = new Date(), n = 0;
    for (var i = 0; i < keyCols.length; i++) {
      if (hubPrefix(keyCols[i][2]) !== pre || hubNorm(readCol[i][0])) continue;
      if (all || want[hubNorm(keyCols[i][0])]) { readCol[i][0] = now; n++; }
    }
    if (n) {
      sh.getRange(2, 9, last - 1, 1).setValues(readCol);
      hubCacheClear('noti');
    }
    return {ok:true, updated:n};
  });
}

/** Việc cần làm của người dùng: bài kiểm tra đang mở, được giao, chưa đạt, còn lượt */
function hubMyTodo(user, sessions) {
  sessions = sessions || apiListSessions({}, user).data;
  var today = hubFmt(new Date(), 'yyyy-MM-dd');
  return sessions
    .filter(function(s){
      return s.hasQuiz && s.quizActive && s.assigned && !s.myPass &&
             s.status !== 'Cancel' && s.questionCount > 0 &&
             (s.myAttempts || 0) < (s.maxAttempts || 1);
    })
    .map(function(s){
      return {sid:s.sid, topic:s.topic, category:s.category, trainer:s.trainer,
              deadline:s.deadline, overdue: !!(s.deadline && s.deadline < today),
              questionCount:s.questionCount, durationMin:s.durationMin, passScore:s.passScore,
              attemptsLeft:(s.maxAttempts || 1) - (s.myAttempts || 0), myScore:s.myScore,
              requireMaterials: !!s.requireMaterials};
    })
    .sort(function(a, b){
      var da = a.deadline || '9999', db = b.deadline || '9999';
      return da < db ? -1 : da > db ? 1 : 0;
    });
}

/** Gọi định kỳ (3 phút/lần) — số thông báo chưa đọc + việc cần làm */
function apiPulse(p, user) {
  var mine = hubMyNoti(user);
  var unread = mine.filter(function(n){ return !n.read; });
  return {
    ok: true,
    unread: unread.length,
    latest: unread.slice(0, 5).map(function(n){ return {id:n.id, at:n.at, type:n.type, sid:n.sid, title:n.title, message:n.message}; }),
    todo: hubMyTodo(user).length
  };
}

/** ★ v2 — Trainer gửi thông báo trong ứng dụng (VD: vừa bổ sung tài liệu) */
function apiAnnounce(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thông báo cho buổi đào tạo do mình phụ trách.'};
  var emails = hubList(p.recipients);
  if (!emails.length) emails = hubResolveAudience(s.audience);
  emails = emails.filter(function(e){ return hubPrefix(e) !== hubPrefix(user.email); });
  var n = hubNotify(emails, hubNorm(p.type) || 'material', s.sid,
    hubNorm(p.title) || ('Tài liệu mới: ' + s.topic), hubNorm(p.message), user.email);
  return {ok:true, count:n, message:'Đã gửi thông báo tới ' + n + ' người.'};
}


// ============================================================================
//  12. FILE "BỘ CÂU HỎI KHẢO SÁT"
// ============================================================================

var HUB_QCFG_HEADER = ['SessionID','Topic','Category','Trainer','PassScore','DurationMin','MaxAttempts','ShuffleQuestions','ShowResultImmediately','Active','CreatedBy','CreatedAt','UpdatedAt','Deadline','Note','RequireMaterials','OptionalFiles'];
var HUB_QUES_HEADER = ['QID','SessionID','QNo','Type','Question','OptionA','OptionB','OptionC','OptionD','CorrectAnswer','Points','Explanation','Active'];
var HUB_RESP_HEADER = ['ResponseID','SessionID','Topic','Email','Name','Attempt','StartedAt','SubmittedAt','DurationSec','Score','MaxScore','Percent','Result','AnswersJSON','CertUrl'];

/** Lấy (hoặc tạo lần đầu) file Bộ câu hỏi khảo sát trong folder mẹ */
function hubQuizFile() {
  return hubCached('quizFile', hubQuizFileRaw);
}
function hubQuizFileRaw() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('HUB_QUIZ_FILE_ID');
  if (cached) {
    try { return SpreadsheetApp.openById(cached); } catch (e) { props.deleteProperty('HUB_QUIZ_FILE_ID'); }
  }
  var parent = DriveApp.getFolderById(HUB.DRIVE.PARENT);
  var it = parent.getFilesByName(HUB.QUIZ_FILE_NAME);
  var ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.openById(it.next().getId());
  } else {
    ss = SpreadsheetApp.create(HUB.QUIZ_FILE_NAME);
    var file = DriveApp.getFileById(ss.getId());
    parent.addFile(file);
    try { DriveApp.getRootFolder().removeFile(file); } catch (e) {}
    hubLog('INFO', 'quizFile', 'Đã tạo file "' + HUB.QUIZ_FILE_NAME + '"', ss.getUrl());
  }
  hubEnsureQuizSheets(ss);
  props.setProperty('HUB_QUIZ_FILE_ID', ss.getId());
  return ss;
}

/** URL file câu hỏi — không cần mở file (nhanh) */
function hubQuizFileUrl() {
  var id = PropertiesService.getScriptProperties().getProperty('HUB_QUIZ_FILE_ID');
  return id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : hubQuizFile().getUrl();
}

function hubEnsureQuizSheets(ss) {
  var need = [
    [HUB.QUIZ_SHEETS.CONFIG,    HUB_QCFG_HEADER],
    [HUB.QUIZ_SHEETS.QUESTIONS, HUB_QUES_HEADER],
    [HUB.QUIZ_SHEETS.RESPONSES, HUB_RESP_HEADER]
  ];
  need.forEach(function(x){
    var sh = ss.getSheetByName(x[0]);
    if (!sh) sh = ss.insertSheet(x[0]);
    hubEnsureHeader(sh, x[1]);                  // bổ sung cột Deadline / Note khi nâng cấp
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) { try { ss.deleteSheet(def); } catch (e) {} }
}

function hubQSheet(name) {
  var ss = hubQuizFile();
  hubCached('qsheetsReady', function(){ hubEnsureQuizSheets(ss); return true; });
  return ss.getSheetByName(name);
}

/** Chống Google Sheet hiểu nhầm văn bản thành công thức (=, +, -, @) */
function hubCell(v) {
  var s = hubNorm(v);
  if (/^[=+\-@]/.test(s) && isNaN(Number(s))) return "'" + s;
  return s;
}

// ---------- QuizConfig ----------

function hubReadQuizConfigAll() {
  return hubData('qcfg', hubReadQuizConfigAllRaw);
}
function hubReadQuizConfigAllRaw() {
  var sh = hubQSheet(HUB.QUIZ_SHEETS.CONFIG);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_QCFG_HEADER.length).getValues();
  var countBy = {};
  hubReadQuestionsAll().forEach(function(q){ if (q.active) countBy[q.sid] = (countBy[q.sid] || 0) + 1; });

  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    var dl = hubToDate(r[13]);
    out.push({
      row:i + 2, sid:hubNorm(r[0]), topic:hubNorm(r[1]), category:hubNorm(r[2]), trainer:hubNorm(r[3]),
      passScore:hubNum(r[4], 70), durationMin:hubNum(r[5], 15), maxAttempts:hubNum(r[6], 2),
      shuffle:hubBool(r[7]), showResult:hubBool(r[8]), active:hubBool(r[9]),
      createdBy:hubNorm(r[10]), createdAt:r[11], updatedAt:r[12],
      deadline: dl ? hubFmt(dl, 'yyyy-MM-dd') : '', note: hubNorm(r[14]),
      requireMaterials: hubBool(r[15]), optionalFiles: hubList(hubNorm(r[16])),
      total:countBy[hubNorm(r[0])] || 0
    });
  }
  return out;
}

function hubReadQuizConfig(sid) {
  var all = hubReadQuizConfigAll();
  for (var i = 0; i < all.length; i++) if (all[i].sid === sid) return all[i];
  return null;
}

// ---------- Questions ----------

function hubReadQuestionsAll() {
  return hubData('questions', hubReadQuestionsAllRaw);
}
function hubReadQuestionsAllRaw() {
  var sh = hubQSheet(HUB.QUIZ_SHEETS.QUESTIONS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_QUES_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    out.push({
      row:i + 2, qid:hubNorm(r[0]), sid:hubNorm(r[1]), qno:hubNum(r[2], i + 1),
      type:hubNorm(r[3]) || 'single', question:hubNorm(r[4]),
      a:hubNorm(r[5]), b:hubNorm(r[6]), c:hubNorm(r[7]), d:hubNorm(r[8]),
      correct:hubNormAns(r[9]), points:hubNum(r[10], 1),
      explanation:hubNorm(r[11]), active:hubBool(r[12])
    });
  }
  return out;
}

function hubReadQuestions(sid) {
  return hubReadQuestionsAll()
    .filter(function(q){ return q.sid === sid && q.active; })
    .sort(function(a, b){ return a.qno - b.qno; });
}

/** Chuẩn hoá đáp án: "c, a" → "AC" (hỗ trợ câu nhiều đáp án) */
function hubNormAns(v) {
  var letters = hubNorm(v).toUpperCase().replace(/[^ABCD]/g, '').split('');
  return hubUniq(letters).sort().join('');
}

function hubQuestionOptions(q) {
  if (q.type === 'truefalse') return [{k:'A', t:'Đúng'}, {k:'B', t:'Sai'}];
  return [{k:'A',t:q.a},{k:'B',t:q.b},{k:'C',t:q.c},{k:'D',t:q.d}].filter(function(o){ return !!o.t; });
}

/** Trainer lưu bộ câu hỏi (ghi đè toàn bộ câu hỏi của buổi, giữ mã câu cũ) */
function apiSaveQuiz(p, user) {
  var sid = hubNorm(p.sid);
  var s = hubFindSession(sid);
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được tạo câu hỏi cho buổi đào tạo do mình phụ trách.'};

  var questions = p.questions;
  if (typeof questions === 'string') questions = JSON.parse(questions);
  if (!questions || !questions.length) return {ok:false, error:'Chưa có câu hỏi nào.'};

  // --- kiểm tra ---
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var type = hubNorm(q.type) || 'single';
    if (['single','multi','truefalse'].indexOf(type) === -1) return {ok:false, error:'Câu ' + (i + 1) + ': loại câu hỏi không hợp lệ.'};
    if (!hubNorm(q.question)) return {ok:false, error:'Câu ' + (i + 1) + ': chưa nhập nội dung câu hỏi.'};
    var corr = hubNormAns(q.correct);
    if (type === 'truefalse') {
      if (corr !== 'A' && corr !== 'B') return {ok:false, error:'Câu ' + (i + 1) + ': chưa chọn đáp án Đúng/Sai.'};
      continue;
    }
    if (!hubNorm(q.a) || !hubNorm(q.b)) return {ok:false, error:'Câu ' + (i + 1) + ': cần tối thiểu 2 phương án (A, B).'};
    if (!corr) return {ok:false, error:'Câu ' + (i + 1) + ': chưa chọn đáp án đúng.'};
    if (type === 'single' && corr.length > 1) return {ok:false, error:'Câu ' + (i + 1) + ': câu một đáp án chỉ được chọn 1 đáp án đúng.'};
    for (var c = 0; c < corr.length; c++) {
      if (!hubNorm(q[corr.charAt(c).toLowerCase()])) return {ok:false, error:'Câu ' + (i + 1) + ': đáp án ' + corr.charAt(c) + ' đang để trống.'};
    }
  }

  var active = p.active === undefined ? true : hubBool(p.active);

  var res = hubWithLock(function(){
    // --- câu hỏi: đọc 1 lần, bỏ câu cũ của buổi, ghi lại 1 lần ---
    var sh = hubQSheet(HUB.QUIZ_SHEETS.QUESTIONS);
    var W = HUB_QUES_HEADER.length;
    var last = sh.getLastRow();
    var all = last >= 2 ? sh.getRange(2, 1, last - 1, W).getValues() : [];
    var oldIds = {};
    all.forEach(function(r){ if (hubNorm(r[1]) === sid) oldIds[hubNorm(r[0])] = true; });
    var keep = all.filter(function(r){ return hubNorm(r[0]) && hubNorm(r[1]) !== sid; });
    var newRows = questions.map(function(q, idx){
      var type = hubNorm(q.type) || 'single';
      var qid = hubNorm(q.qid);
      return [
        (qid && oldIds[qid]) ? qid : hubUid('Q'), sid, idx + 1, type, hubCell(q.question),
        type === 'truefalse' ? 'Đúng' : hubCell(q.a),
        type === 'truefalse' ? 'Sai'  : hubCell(q.b),
        type === 'truefalse' ? '' : hubCell(q.c),
        type === 'truefalse' ? '' : hubCell(q.d),
        hubNormAns(q.correct), Math.max(1, hubNum(q.points, 1)), hubCell(q.explanation), true
      ];
    });
    var merged = keep.concat(newRows);
    if (last >= 2) sh.getRange(2, 1, last - 1, W).clearContent();
    sh.getRange(2, 1, merged.length, W).setValues(merged);

    // --- cấu hình bài kiểm tra ---
    var cfgSh = hubQSheet(HUB.QUIZ_SHEETS.CONFIG);
    hubCacheClear('qcfg'); hubCacheClear('questions');
    var existing = hubReadQuizConfig(sid);
    var wasActive = existing ? existing.active : false;
    var deadline = hubToDate(p.deadline);
    var cfgRow = [
      sid, s.topic, s.category, s.trainer,
      Math.min(100, Math.max(1, hubNum(p.passScore, 70))),
      Math.min(240, Math.max(1, hubNum(p.durationMin, 15))),
      Math.min(20, Math.max(1, hubNum(p.maxAttempts, 2))),
      hubBool(p.shuffle), p.showResult === undefined ? true : hubBool(p.showResult),
      active, user.email,
      existing ? (hubToDate(existing.createdAt) || new Date()) : new Date(), new Date(),
      deadline || '', hubCell(p.note),
      p.requireMaterials === undefined ? (existing ? existing.requireMaterials : true) : hubBool(p.requireMaterials),
      existing ? (existing.optionalFiles || []).join(',') : ''
    ];
    if (existing) cfgSh.getRange(existing.row, 1, 1, HUB_QCFG_HEADER.length).setValues([cfgRow]);
    else cfgSh.getRange(cfgSh.getLastRow() + 1, 1, 1, HUB_QCFG_HEADER.length).setValues([cfgRow]);
    hubCacheClear('qcfg'); hubCacheClear('questions');

    hubReportSheet().getRange(s.row, HUB.COL.QUIZ_STATUS).setValue(active ? 'Published' : 'Draft');
    hubCacheClear('sessions');
    return {count:newRows.length, newlyPublished: active && !wasActive, deadline:deadline};
  });

  var notified = 0;
  if (active) {
    hubSyncEnrollment(sid, s.topic, s.audience);
    if (res.newlyPublished) notified = hubNotifyQuizOpen(s, user, res.count, p.durationMin, res.deadline);
  }
  hubLog('INFO', 'saveQuiz', sid + ' (' + res.count + ' câu) by ' + user.email, s.topic);
  return {
    ok:true, count:res.count, published:active, newlyPublished:res.newlyPublished, notified:notified,
    audienceCount: hubResolveAudience(s.audience).length,
    message:'Đã lưu ' + res.count + ' câu hỏi' + (res.newlyPublished ? ' và phát hành bài kiểm tra' : '') + '.',
    quizFileUrl:hubQuizFileUrl()
  };
}

/** Thông báo trong ứng dụng khi bài kiểm tra vừa được mở */
function hubNotifyQuizOpen(s, user, count, durationMin, deadline) {
  try {
    var emails = hubResolveAudience(s.audience).filter(function(e){ return hubPrefix(e) !== hubPrefix(user.email); });
    var msg = count + ' câu · ' + hubNum(durationMin, 15) + ' phút' + (deadline ? ' · Hạn ' + hubFmt(deadline, 'dd/MM/yyyy') : '');
    return hubNotify(emails, 'quiz', s.sid, 'Bài kiểm tra mới: ' + s.topic, msg, user.email);
  } catch (e) {
    hubLog('ERROR', 'notifyQuiz', s.sid, e.message);
    return 0;
  }
}

/** Trainer xem lại bộ câu hỏi (có đáp án) */
function apiGetQuiz(p, user) {
  var sid = hubNorm(p.sid);
  var s = hubFindSession(sid);
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ xem được bộ câu hỏi của buổi do mình phụ trách.'};
  var cfg = hubReadQuizConfig(sid);
  var qs = hubReadQuestions(sid).map(function(q){
    return {qid:q.qid, type:q.type, question:q.question, a:q.a, b:q.b, c:q.c, d:q.d,
            correct:q.correct, points:q.points, explanation:q.explanation};
  });
  return {ok:true, config:cfg, questions:qs, session:{sid:s.sid, topic:s.topic, audience:s.audience}, quizFileUrl:hubQuizFileUrl()};
}

function apiPublishQuiz(p, user) {
  var sid = hubNorm(p.sid);
  var s = hubFindSession(sid);
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thao tác trên buổi đào tạo do mình phụ trách.'};
  var active = hubBool(p.active);
  var res = hubWithLock(function(){
    hubCacheClear('qcfg');
    var cfg = hubReadQuizConfig(sid);
    if (!cfg) return {ok:false, error:'Buổi đào tạo này chưa có bộ câu hỏi.'};
    if (active && !cfg.total) return {ok:false, error:'Bộ câu hỏi đang trống.'};
    hubQSheet(HUB.QUIZ_SHEETS.CONFIG).getRange(cfg.row, 10).setValue(active);
    hubReportSheet().getRange(s.row, HUB.COL.QUIZ_STATUS).setValue(active ? 'Published' : 'Closed');
    hubCacheClear('qcfg'); hubCacheClear('sessions');
    return {ok:true, wasActive:cfg.active, cfg:cfg};
  });
  if (!res.ok) return res;
  var notified = 0;
  if (active && !res.wasActive) {
    hubSyncEnrollment(sid, s.topic, s.audience);
    notified = hubNotifyQuizOpen(s, user, res.cfg.total, res.cfg.durationMin, hubToDate(res.cfg.deadline));
  }
  return {ok:true, notified:notified, newlyPublished: active && !res.wasActive,
          message: active ? 'Đã mở bài kiểm tra cho học viên.' : 'Đã đóng bài kiểm tra.'};
}


/** ★ v2.3 — Trainer đánh dấu 1 tài liệu là bắt buộc / không bắt buộc cho lộ trình tự học */
function apiSetFileRequired(p, user) {
  var sid = hubNorm(p.sid), fileId = hubNorm(p.fileId);
  var s = hubFindSession(sid);
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được thao tác trên buổi đào tạo do mình phụ trách.'};
  var required = hubBool(p.required);
  return hubWithLock(function(){
    hubCacheClear('qcfg');
    var cfg = hubReadQuizConfig(sid);
    if (!cfg) return {ok:false, error:'Buổi này chưa có bài kiểm tra — soạn bài kiểm tra trước.'};
    var list = (cfg.optionalFiles || []).filter(function(id){ return id !== fileId; });
    if (!required) list.push(fileId);
    hubQSheet(HUB.QUIZ_SHEETS.CONFIG).getRange(cfg.row, 17).setValue(list.join(','));
    hubCacheClear('qcfg');
    return {ok:true, optionalFiles:list, message: required ? 'Đã đặt tài liệu là bắt buộc.' : 'Đã đặt tài liệu là không bắt buộc.'};
  });
}

/** ★ v2.3 — Điều kiện mở bài kiểm tra: đã học hết tài liệu bắt buộc chưa */
function hubGate(s, cfg, user, force) {
  var optional = (cfg && cfg.optionalFiles) || [];
  if (!cfg || !cfg.requireMaterials) return {required:false, passed:true, optional:optional};
  if (hubCanEdit(s, user) && !user.asLearner) return {required:true, passed:true, bypass:true, optional:optional};   // trainer của buổi không bị chặn (trừ khi Admin đóng vai học viên)
  var m;
  try { m = hubMaterials(s, force ? {} : {cacheOnly:true}); }
  catch (e) { return {required:true, passed:true, total:0, done:0, missing:[], optional:optional, note:'Không đọc được tài liệu: ' + e.message}; }
  if (!m || m.pending) return {required:true, passed:false, pending:true, total:0, done:0, missing:[], optional:optional};
  var opt = {};
  optional.forEach(function(id){ opt[id] = 1; });
  var req = m.files.filter(function(f){ return !opt[f.id]; });
  var pre = hubPrefix(user.email), done = {};
  hubReadProgress().forEach(function(x){ if (x.email === pre && x.sid === s.sid && x.completed) done[x.fileId] = 1; });
  var missing = req.filter(function(f){ return !done[f.id]; }).map(function(f){ return {id:f.id, name:f.name, path:f.path}; });
  return {required:true, total:req.length, done:req.length - missing.length, missing:missing, optional:optional, passed: missing.length === 0};
}


// ============================================================================
//  13. LÀM BÀI & CHẤM ĐIỂM
// ============================================================================

function hubReadResponsesAll() {
  return hubData('responses', function(){ return hubReadResponsesRaw(null, false); });
}

/** Đọc bảng Responses. withAnswers=true → kèm chi tiết từng câu (chỉ dùng cho phân tích). */
function hubReadResponsesRaw(sid, withAnswers) {
  var sh = hubQSheet(HUB.QUIZ_SHEETS.RESPONSES);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HUB_RESP_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    if (sid && hubNorm(r[1]) !== sid) continue;
    var o = {
      respId:hubNorm(r[0]), sid:hubNorm(r[1]), topic:hubNorm(r[2]),
      email:hubMailOf(r[3]), name:hubNorm(r[4]), attempt:hubNum(r[5], 1),
      startedAt:hubFmt(r[6], 'dd/MM/yyyy HH:mm'), submittedAt:hubFmt(r[7], 'dd/MM/yyyy HH:mm'),
      submittedIso: r[7] ? new Date(r[7]).toISOString() : '', durationSec:hubNum(r[8], 0),
      score:hubNum(r[9], 0), maxScore:hubNum(r[10], 0), percent:hubNum(r[11], 0),
      result:hubNorm(r[12]), certUrl:hubNorm(r[14])
    };
    if (withAnswers) o.answers = String(r[13] || '');
    out.push(o);
  }
  return out;
}

/** Tương thích v1 */
function hubReadResponses(sid) {
  var all = hubReadResponsesAll();
  return sid ? all.filter(function(r){ return r.sid === sid; }) : all;
}

function hubAttemptKey(user, sid) {
  return 'ATU_' + hubPrefix(user.email) + '_' + sid;
}

/** Lượt làm bài đang dở (chưa nộp, còn thời gian) của người dùng */
function hubOpenAttempt(user, sid) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(hubAttemptKey(user, sid));
  if (!id) return null;
  var raw = props.getProperty('AT_' + id);
  if (!raw) { props.deleteProperty(hubAttemptKey(user, sid)); return null; }
  var at = JSON.parse(raw);
  if (Date.now() > at.start + at.limit + 5000) return null;
  at.id = id;
  return at;
}

function hubMyQuizStatusObj(sid, user) {
  var cfg = hubReadQuizConfig(sid);
  if (!cfg) return {available:false, hasQuiz:false, reason:'Buổi đào tạo này chưa có bài kiểm tra.'};
  var pre = hubPrefix(user.email);
  var mine = hubReadResponses(sid).filter(function(r){ return hubPrefix(r.email) === pre; });
  var best = null;
  mine.forEach(function(r){ if (!best || r.percent > best.percent) best = r; });
  var open = hubOpenAttempt(user, sid);
  var today = hubFmt(new Date(), 'yyyy-MM-dd');
  var s = hubFindSession(sid);
  var gate = s ? hubGate(s, cfg, user) : {required:false, passed:true};
  var reason = '';
  if (!cfg.active) reason = 'Bài kiểm tra đang đóng.';
  else if (!cfg.total) reason = 'Bộ câu hỏi đang trống.';
  else if (mine.length >= cfg.maxAttempts && !open) reason = 'Bạn đã dùng hết ' + cfg.maxAttempts + ' lượt làm bài.';
  else if (gate.pending && !open) reason = 'Đang kiểm tra tiến độ học tài liệu…';
  else if (!gate.passed && !open) reason = 'Cần học xong ' + gate.missing.length + ' tài liệu còn lại trước khi làm bài.';
  return {
    hasQuiz:true, active:cfg.active, gate:gate, requireMaterials:cfg.requireMaterials,
    available: cfg.active && cfg.total > 0 && (!!open || (mine.length < cfg.maxAttempts && gate.passed)),
    attempts: mine.length, maxAttempts: cfg.maxAttempts,
    passScore: cfg.passScore, durationMin: cfg.durationMin,
    totalQuestions: cfg.total, deadline: cfg.deadline, overdue: !!(cfg.deadline && cfg.deadline < today),
    note: cfg.note, showResult: cfg.showResult,
    best: best, history: mine.slice().reverse(),
    inProgress: open ? {remainingSec: Math.max(0, Math.round((open.start + open.limit - Date.now()) / 1000))} : null,
    passed: !!(best && best.result === 'Pass'),
    reason: reason
  };
}

function apiMyQuizStatus(p, user) {
  var o = hubMyQuizStatusObj(hubNorm(p.sid), user);
  o.ok = true;
  return o;
}

function hubQuizPayload(s, cfg, qs, attemptId, at, attemptNo, resumed) {
  var w = Math.round(100 / Math.max(1, qs.length) * 10) / 10;       // ★ v3.0: mỗi câu = 100 / số câu
  var safe = qs.map(function(q, i){
    return {qid:q.qid, no:i + 1, type:q.type, question:q.question, options:hubQuestionOptions(q),
            points:w, multi:q.type === 'multi'};
  });
  return {
    ok:true, attemptId:attemptId, startedAt:at.start, resumed:!!resumed,
    durationSec:Math.round(at.limit / 1000),
    remainingSec:Math.max(0, Math.round((at.start + at.limit - Date.now()) / 1000)),
    passScore:cfg.passScore, showResult:cfg.showResult, deadline:cfg.deadline, note:cfg.note,
    session:{sid:s.sid, topic:s.topic, category:s.category, trainer:s.trainer, dateText:s.dateText},
    questions:safe, attemptNo:attemptNo, maxAttempts:cfg.maxAttempts
  };
}

/** Bắt đầu (hoặc tiếp tục) làm bài — trả câu hỏi KHÔNG kèm đáp án */
function apiQuizStart(p, user) {
  var sid = hubNorm(p.sid);
  var s = hubFindSession(sid);
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var cfg = hubReadQuizConfig(sid);
  if (!cfg)        return {ok:false, error:'Buổi đào tạo này chưa có bài kiểm tra.'};
  if (!cfg.active) return {ok:false, error:'Bài kiểm tra đang đóng.'};

  var pre = hubPrefix(user.email);
  var mine = hubReadResponses(sid).filter(function(r){ return hubPrefix(r.email) === pre; });

  // ★ v2: đang có lượt dở dang → tiếp tục đúng lượt đó (giữ thời gian, thứ tự câu)
  var open = hubOpenAttempt(user, sid);
  if (open) {
    var byId = {};
    hubReadQuestionsAll().forEach(function(q){ byId[q.qid] = q; });
    var qsR = open.order.map(function(id){ return byId[id]; }).filter(Boolean);
    if (qsR.length) return hubQuizPayload(s, cfg, qsR, open.id, open, mine.length + 1, true);
  }

  if (mine.length >= cfg.maxAttempts) return {ok:false, error:'Bạn đã dùng hết ' + cfg.maxAttempts + ' lượt làm bài.'};
  var gate = hubGate(s, cfg, user, true);
  if (gate.pending) return {ok:false, code:'GATE_PENDING', error:'Hệ thống đang đọc danh sách tài liệu, vui lòng thử lại sau vài giây.'};
  if (!gate.passed) {
    return {ok:false, code:'NEED_MATERIALS', gate:gate,
            error:'Bạn cần học xong ' + gate.missing.length + '/' + gate.total + ' tài liệu còn lại trước khi làm bài: ' +
                  gate.missing.slice(0, 3).map(function(f){ return f.name; }).join(', ') + (gate.missing.length > 3 ? '…' : '') + '.'};
  }
  var qs = hubReadQuestions(sid);
  if (!qs.length) return {ok:false, error:'Bộ câu hỏi đang trống.'};
  if (cfg.shuffle) qs = hubShuffle(qs);

  var attemptId = hubUid('A');
  var at = {sid:sid, email:pre, start:Date.now(), order:qs.map(function(q){ return q.qid; }), limit:cfg.durationMin * 60 * 1000};
  var props = PropertiesService.getScriptProperties();
  props.setProperty('AT_' + attemptId, JSON.stringify(at));
  props.setProperty(hubAttemptKey(user, sid), attemptId);

  hubUpsertEnroll(sid, s.topic, user.email, {status:'In progress'});
  return hubQuizPayload(s, cfg, qs, attemptId, at, mine.length + 1, false);
}

function hubShuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** Nộp bài — chấm điểm, ghi kết quả, sinh chứng chỉ nếu đạt */
function apiQuizSubmit(p, user) {
  var attemptId = hubNorm(p.attemptId);
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('AT_' + attemptId);
  if (!raw) return {ok:false, code:'ATTEMPT_GONE', error:'Lượt làm bài không còn hiệu lực (đã nộp hoặc hết hạn). Vui lòng tải lại trang.'};
  var at = JSON.parse(raw);
  if (at.email !== hubPrefix(user.email)) return {ok:false, error:'Lượt làm bài không thuộc về bạn.'};

  var sid = at.sid;
  var s = hubFindSession(sid);
  var cfg = hubReadQuizConfig(sid);
  if (!s || !cfg) return {ok:false, error:'Không tìm thấy dữ liệu bài kiểm tra.'};

  var answers = p.answers;
  if (typeof answers === 'string') answers = JSON.parse(answers || '{}');
  answers = answers || {};

  var elapsed = Date.now() - at.start;
  var overtime = elapsed > (at.limit + 30000);        // ân hạn 30 giây cho độ trễ mạng

  var byId = {};
  hubReadQuestionsAll().forEach(function(q){ byId[q.qid] = q; });

  // ★ v3.0 — Thang 100 điểm: mỗi câu = 100 / số câu (2 câu → 50đ/câu, 3 câu → 33,3đ/câu)
  var correctN = 0, detail = [];
  var nQ = at.order.filter(function(qid){ return !!byId[qid]; }).length || 1;
  var w = 100 / nQ;
  at.order.forEach(function(qid, i){
    var q = byId[qid];
    if (!q) return;
    var given = hubNormAns(answers[qid]);
    var correct = !!given && given === q.correct;
    if (correct) correctN++;
    detail.push({no:i + 1, qid:qid, type:q.type, question:q.question, options:hubQuestionOptions(q),
                 given:given, correct:q.correct, isCorrect:correct, points:Math.round(w * 10) / 10, explanation:q.explanation});
  });
  var score = Math.round(correctN * w), maxScore = 100;
  var percent = score;
  var pass = !overtime && percent >= cfg.passScore;
  var durationSec = Math.round(Math.min(elapsed, at.limit + 30000) / 1000);

  // lưu chi tiết (giới hạn 45.000 ký tự/ô — rút gọn nếu cần, luôn giữ JSON hợp lệ)
  var json = JSON.stringify(detail);
  if (json.length > 45000) json = JSON.stringify(detail.map(function(d){ return {no:d.no, qid:d.qid, question:String(d.question).substring(0, 160), given:d.given, correct:d.correct, isCorrect:d.isCorrect}; }));
  if (json.length > 45000) json = JSON.stringify(detail.map(function(d){ return {qid:d.qid, given:d.given, isCorrect:d.isCorrect}; }));

  var saved = hubWithLock(function(){
    if (!props.getProperty('AT_' + attemptId)) return null;          // chống nộp 2 lần
    props.deleteProperty('AT_' + attemptId);
    props.deleteProperty(hubAttemptKey(user, sid));

    var respSh = hubQSheet(HUB.QUIZ_SHEETS.RESPONSES);
    var mine = hubReadResponsesRaw(sid, false).filter(function(r){ return hubPrefix(r.email) === hubPrefix(user.email); });
    var attemptNo = mine.length + 1;
    var respRow = respSh.getLastRow() + 1;
    respSh.getRange(respRow, 1, 1, HUB_RESP_HEADER.length).setValues([[
      hubUid('R'), sid, s.topic, user.email, user.name, attemptNo,
      new Date(at.start), new Date(), durationSec,
      score, maxScore, percent, pass ? 'Pass' : 'Fail', json, ''
    ]]);
    hubCacheClear('responses');

    hubCacheClear('enroll');
    var prev = hubFindEnroll(sid, user.email);
    var bestPercent = prev && prev.percent !== '' ? Math.max(prev.percent, percent) : percent;
    var bestPass = (prev && prev.pass) || pass;
    var fields = {status:'Completed', percent:bestPercent, pass:bestPass, attempt:attemptNo, completedAt:new Date()};
    if (!prev || prev.percent === '' || percent >= prev.percent) { fields.score = score; fields.maxScore = maxScore; }
    hubUpsertEnroll(sid, s.topic, user.email, fields);
    hubRefreshCompletion(sid);
    return {attemptNo:attemptNo, respRow:respRow, alreadyPassed: !!(prev && prev.pass)};
  });
  if (!saved) return {ok:false, code:'ATTEMPT_GONE', error:'Bài làm này đã được nộp trước đó.'};

  // --- chứng chỉ (ngoài khoá — tạo PDF + gửi email mất vài giây) ---
  var cert = null;
  if (pass) {
    try {
      cert = hubIssueCertificate(s, user, percent, score, maxScore);
      hubWithLock(function(){
        hubQSheet(HUB.QUIZ_SHEETS.RESPONSES).getRange(saved.respRow, 15).setValue(cert.url);
        hubCacheClear('responses');
        hubUpsertEnroll(sid, s.topic, user.email, {certUrl:cert.url, certSentAt:new Date()});
      });
      hubNotify([user.email], 'cert', sid, 'Chứng chỉ: ' + s.topic, 'Bạn đạt ' + percent + '%. Chứng chỉ đã được cấp.', '');
    } catch (err) {
      hubLog('ERROR', 'certificate', 'Lỗi tạo chứng chỉ cho ' + user.email, err.message);
    }
  }

  hubLog('INFO', 'quizSubmit', sid + ' ' + user.email + ' = ' + percent + '% ' + (pass ? 'PASS' : 'FAIL'), '');

  var usedAll = saved.attemptNo >= cfg.maxAttempts;
  return {
    ok:true, score:score, maxScore:maxScore, percent:percent, correctCount:correctN, totalQuestions:detail.length,
    passScore:cfg.passScore, pass:pass, overtime:overtime,
    durationSec:durationSec, attemptNo:saved.attemptNo, maxAttempts:cfg.maxAttempts,
    canRetry: !pass && !usedAll && cfg.active,
    detail: cfg.showResult ? detail : [],
    certificate: cert,
    message: overtime ? 'Bài làm quá thời gian quy định nên không được tính đạt.'
                      : (pass ? 'Chúc mừng! Bạn đã hoàn thành bài kiểm tra.' : 'Bạn chưa đạt điểm yêu cầu (' + cfg.passScore + '%).')
  };
}


// ============================================================================
//  14. KẾT QUẢ & PHÂN TÍCH (trainer)
// ============================================================================

/** Tương thích v1 — trainer chỉ thấy kết quả buổi mình phụ trách, admin thấy tất cả */
function apiQuizResults(p, user) {
  var sid = hubNorm(p.sid);
  var responses = hubReadResponses(sid || null);
  var enroll = sid ? hubReadEnrollment().filter(function(e){ return e.sid === sid; }) : hubReadEnrollment();
  if (user.role !== 'admin') {
    var allowed = {};
    hubReadSessions().forEach(function(s){ if (hubCanEdit(s, user)) allowed[s.sid] = true; });
    responses = responses.filter(function(r){ return allowed[r.sid]; });
    enroll = enroll.filter(function(e){ return allowed[e.sid]; });
  }
  return {ok:true, data:responses, enrollment:enroll, quizFileUrl:hubQuizFileUrl()};
}

/** ★ v2 — Phân tích đầy đủ 1 buổi: KPI, phân bố điểm, từng câu hỏi, từng học viên */
function apiSessionResults(p, user) {
  var sid = hubNorm(p.sid);
  var base = hubFindSession(sid);
  if (!base) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(base, user)) return {ok:false, code:'FORBIDDEN', error:'Bạn chỉ xem được kết quả của buổi đào tạo do mình phụ trách.'};
  var s = hubCopy(base); delete s.row;

  var cfg = hubReadQuizConfig(sid);
  var qs = hubReadQuestions(sid);
  var resp = hubReadResponsesRaw(sid, true);
  var enrollAll = hubReadEnrollment().filter(function(e){ return e.sid === sid; });
  var audience = hubResolveAudience(s.audience);
  var progress = hubReadProgress().filter(function(x){ return x.sid === sid; });
  var learners = hubLearnerRows(s, audience, enrollAll, progress);

  // --- lượt làm tốt nhất của từng người ---
  var best = {}, tries = {};
  resp.forEach(function(r){
    var k = hubPrefix(r.email);
    tries[k] = (tries[k] || 0) + 1;
    if (!best[k] || r.percent > best[k].percent) best[k] = r;
  });
  learners.forEach(function(l){
    var k = hubPrefix(l.email);
    l.attempts = tries[k] || 0;
    l.best = best[k] ? best[k].percent : '';
    l.bestTime = best[k] ? best[k].durationSec : '';
    l.lastSubmit = best[k] ? best[k].submittedAt : '';
  });

  // --- phân tích từng câu ---
  var items = {}, order = [];
  qs.forEach(function(q){
    items[q.qid] = {qid:q.qid, no:q.qno, question:q.question, type:q.type, correct:q.correct,
                    options:hubQuestionOptions(q), attempts:0, correctN:0, dist:{}, current:true};
    order.push(q.qid);
  });
  resp.forEach(function(r){
    var det = [];
    try { det = JSON.parse(r.answers || '[]'); } catch (e) {}
    det.forEach(function(d){
      if (!d || !d.qid) return;
      var it = items[d.qid];
      if (!it) {
        it = items[d.qid] = {qid:d.qid, no:d.no || 999, question:d.question || '(câu hỏi đã được sửa/xoá)', type:d.type || 'single',
                             correct:d.correct || '', options:d.options || [], attempts:0, correctN:0, dist:{}, current:false};
        order.push(d.qid);
      }
      it.attempts++;
      if (d.isCorrect) it.correctN++;
      var g = d.given || '—';
      it.dist[g] = (it.dist[g] || 0) + 1;
    });
  });
  var itemList = order.map(function(id){
    var it = items[id];
    it.rate = it.attempts ? Math.round(it.correctN / it.attempts * 100) : null;
    var wrong = null;
    for (var k in it.dist) if (k !== it.correct && (!wrong || it.dist[k] > it.dist[wrong])) wrong = k;
    it.topWrong = wrong;
    return it;
  }).sort(function(a, b){ return (b.current - a.current) || (a.no - b.no); });

  // --- KPI ---
  var bestList = [];
  for (var k in best) bestList.push(best[k]);
  var attempted = bestList.length;
  var passed = learners.filter(function(l){ return l.pass; }).length;
  var avg = attempted ? Math.round(bestList.reduce(function(a, r){ return a + r.percent; }, 0) / attempted * 10) / 10 : 0;
  var avgTime = resp.length ? Math.round(resp.reduce(function(a, r){ return a + r.durationSec; }, 0) / resp.length) : 0;

  var bins = [{label:'< 50', min:0, max:49.99}, {label:'50–59', min:50, max:59.99}, {label:'60–69', min:60, max:69.99},
              {label:'70–79', min:70, max:79.99}, {label:'80–89', min:80, max:89.99}, {label:'90–100', min:90, max:100}];
  bins.forEach(function(b){ b.count = bestList.filter(function(r){ return r.percent >= b.min && r.percent <= b.max; }).length; });

  resp.forEach(function(r){ delete r.answers; });
  return {
    ok:true, session:s, config:cfg,
    kpi:{
      enrolled: learners.length, attempted: attempted, passed: passed,
      notStarted: Math.max(0, learners.length - attempted),
      passRate: attempted ? Math.round(passed / attempted * 100) : 0,
      avgScore: avg, avgTime: avgTime, totalAttempts: resp.length,
      target: hubNum(hubGetConfig().TARGET_AVG_SCORE, 80)
    },
    histogram: bins.map(function(b){ return {label:b.label, count:b.count}; }),
    items: itemList,
    learners: learners,
    responses: resp.reverse(),
    quizFileUrl: hubQuizFileUrl()
  };
}


// ============================================================================
//  15. CHỨNG CHỈ (PDF khổ ngang) + EMAIL
// ============================================================================

/** Tạo chứng chỉ PDF, lưu Drive, gửi email cho PIC + CC quản lý + CC admin */
function hubIssueCertificate(session, user, percent, score, maxScore) {
  var cfg = hubGetConfig();
  var now = new Date();
  var certNo = 'MMH-' + hubFmt(now, 'yyyyMMdd') + '-' + hubPrefix(user.email).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) + '-' + Math.floor(Math.random() * 900 + 100);
  var fileName = hubSafeName(user.name, 28) + '_' + hubSafeName(session.topic, 60) + '_' + hubFmt(now, 'ddMMyyyy');

  var html = hubCertificateHtml({
    name: user.name, email: user.email, position: user.position, dept: user.dept,
    topic: session.topic, category: session.category, trainer: session.trainer,
    trainingDate: session.dateText || hubFmt(now, 'dd/MM/yyyy'),
    issueDate: hubFmt(now, 'dd/MM/yyyy'),
    percent: percent, score: score, maxScore: maxScore, certNo: certNo, cfg: cfg
  });

  var pdf = Utilities.newBlob(html, 'text/html', fileName + '.html').getAs('application/pdf').setName(fileName + '.pdf');
  var folder = HUB_CTX.test ? hubSubFolder(hubTestRoot(), 'Chứng chỉ (test)') : DriveApp.getFolderById(HUB.DRIVE.CERTIFICATE);
  var old = folder.getFilesByName(fileName + '.pdf');
  while (old.hasNext()) { try { old.next().setTrashed(true); } catch (e) {} }

  var file = folder.createFile(pdf);
  try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  var result = {id:file.getId(), name:file.getName(), url:file.getUrl(), certNo:certNo, emailed:false};

  if (hubBool(cfg.ENABLE_CERT_EMAIL)) {
    try {
      hubSendCertificateEmail(session, user, percent, score, maxScore, file, certNo, cfg);
      result.emailed = true;
    } catch (err) {
      hubLog('ERROR', 'certEmail', 'Không gửi được email chứng chỉ cho ' + user.email, err.message);
    }
  }
  hubLog('INFO', 'certificate', certNo + ' -> ' + user.email, file.getUrl());
  return result;
}

function hubSendCertificateEmail(session, user, percent, score, maxScore, file, certNo, cfg) {
  var to = hubMailOf(user.email);
  var cc = [];
  var manager = hubManagerOf(user.email);
  if (manager && hubPrefix(manager) !== hubPrefix(to)) cc.push(manager);
  if (hubPrefix(HUB.ADMIN_EMAIL) !== hubPrefix(to)) cc.push(HUB.ADMIN_EMAIL);

  var inner =
    '<p style="margin:0 0 14px">Kính gửi <b>' + hubEsc(user.name) + '</b>,</p>' +
    '<p style="margin:0 0 16px;color:#41566f">Bạn đã hoàn thành và <b style="color:#2E7D32">ĐẠT</b> bài kiểm tra sau đào tạo. Chứng chỉ được đính kèm trong email này.</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px">' +
      hubRow('Chủ đề đào tạo', hubEsc(session.topic)) +
      hubRow('Nhóm chủ đề', hubEsc(session.category)) +
      hubRow('Trainer', hubEsc(session.trainer)) +
      hubRow('Ngày đào tạo', hubEsc(session.dateText)) +
      hubRow('Kết quả', '<b style="color:#2E7D32">' + Math.round(percent) + ' điểm</b> / 100') +
      hubRow('Số chứng chỉ', hubEsc(certNo)) +
    '</table>' +
    '<div style="margin:18px 0 6px">' + hubMailButton(file.getUrl(), 'Xem chứng chỉ trên Drive') + '</div>';

  hubMail({
    to: to,
    cc: hubUniq(cc).join(','),
    subject: '[MMH Training] Chứng chỉ hoàn thành — ' + session.topic,
    htmlBody: hubMailShell('Chứng nhận hoàn thành đào tạo', hubEsc(session.topic), inner,
      'Email tự động từ ' + hubEsc(cfg.APP_TITLE) + '. Chứng chỉ được lưu trong thư mục chứng chỉ đào tạo của MMH.'),
    attachments: [file.getAs('application/pdf')],
    name: 'MMH Training Hub'
  });
}

function hubRow(label, value) {
  return '<tr>' +
    '<td style="padding:9px 0;color:#5E738C;width:36%;vertical-align:top;border-bottom:1px solid #EEF3FA">' + hubEsc(label) + '</td>' +
    '<td style="padding:9px 0;color:#003047;font-weight:600;border-bottom:1px solid #EEF3FA">' + (value || '—') + '</td>' +
  '</tr>';
}
/** HTML chứng chỉ — khổ A4 NGANG.
 *  Dùng bố cục dạng bảng/inline-style để bộ chuyển đổi PDF của Apps Script
 *  render chính xác (không dùng flexbox/grid). */
function hubCertificateHtml(d) {
  var cfg = d.cfg || {};
  var navy = cfg.COLOR_PRIMARY || '#003047';
  var blue = cfg.COLOR_ACCENT || '#3A5CAA';
  var gold = cfg.COLOR_HIGHLIGHT || '#FFE100';

  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
'@page { size: A4 landscape; margin: 0; }' +
'html,body { margin:0; padding:0; font-family:Aptos,Calibri,Arial,sans-serif; -webkit-print-color-adjust:exact; }' +
'.page { width:100%; height:748px; overflow:hidden; page-break-after:avoid; page-break-inside:avoid; }' +
'</style></head><body><div class="page">' +
'<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;height:748px;background:#ffffff">' +
  '<tr><td style="padding:12px;height:724px;vertical-align:middle">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:9px solid ' + navy + ';height:706px">' +
      '<tr><td style="padding:4px;background:#ffffff;height:680px;vertical-align:middle">' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:2px solid ' + gold + ';height:672px">' +
          '<tr><td style="padding:30px 54px 26px;text-align:center;vertical-align:middle">' +

            // ---- Header ----
            hubLogoTag(138, cfg) +
            '<div style="height:16px"></div>' +
            '<div style="font-size:11px;letter-spacing:5px;color:' + blue + ';font-weight:bold">' + hubEsc(HUB.COMPANY_NAME) + '</div>' +
            '<div style="height:10px"></div>' +
            '<div style="font-size:36px;letter-spacing:7px;color:' + navy + ';font-weight:bold">CHỨNG NHẬN HOÀN THÀNH</div>' +
            '<div style="font-size:12.5px;letter-spacing:4px;color:#8a99ab;margin-top:5px">CERTIFICATE OF COMPLETION</div>' +
            '<div style="height:10px"></div>' +
            '<table align="center" cellpadding="0" cellspacing="0"><tr><td style="width:140px;height:3px;background:' + gold + ';font-size:0">&nbsp;</td></tr></table>' +
            '<div style="height:24px"></div>' +

            // ---- Người nhận ----
            '<div style="font-size:12.5px;color:#7387a0;font-style:italic">Chứng nhận rằng / This is to certify that</div>' +
            '<div style="height:8px"></div>' +
            '<div style="font-size:38px;color:' + navy + ';font-weight:bold;letter-spacing:.5px">' + hubEsc(d.name) + '</div>' +
            '<div style="font-size:12px;color:' + blue + ';margin-top:4px">' + hubEsc([d.position, d.dept].filter(Boolean).join(' · ')) + '</div>' +
            '<div style="height:26px"></div>' +
            '<div style="font-size:12.5px;color:#7387a0;font-style:italic">đã hoàn thành chương trình đào tạo / has successfully completed the training</div>' +
            '<div style="height:8px"></div>' +
            '<div style="font-size:20px;color:' + navy + ';font-weight:bold;line-height:1.4;padding:0 40px">' + hubEsc(d.topic) + '</div>' +
            '<div style="height:32px"></div>' +

            // ---- Thông số ----
            '<table align="center" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
              '<tr>' +
                hubCertCell('NHÓM CHỦ ĐỀ', d.category, navy, blue) +
                hubCertCell('TRAINER', d.trainer, navy, blue) +
                hubCertCell('NGÀY ĐÀO TẠO', d.trainingDate, navy, blue) +
                hubCertCell('KẾT QUẢ', Math.round(d.percent) + ' / 100 điểm', navy, blue) +
              '</tr>' +
            '</table>' +
            '<div style="height:36px"></div>' +

            // ---- Chân trang ----
            '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
              '<tr>' +
                '<td style="width:33%;text-align:left;vertical-align:bottom">' +
                  '<div style="font-size:10px;color:#8a99ab;letter-spacing:1px">SỐ CHỨNG CHỈ</div>' +
                  '<div style="font-size:12px;color:' + navy + ';font-weight:bold;margin-top:3px">' + hubEsc(d.certNo) + '</div>' +
                  '<div style="font-size:10px;color:#8a99ab;margin-top:8px">Ngày cấp: ' + hubEsc(d.issueDate) + '</div>' +
                '</td>' +
                '<td style="width:34%;text-align:center;vertical-align:bottom">' +
                  '<table align="center" cellpadding="0" cellspacing="0"><tr><td style="width:120px;height:3px;background:' + gold + ';font-size:0">&nbsp;</td></tr></table>' +
                  '<div style="font-size:9.5px;letter-spacing:1.6px;color:' + blue + ';font-weight:bold;margin-top:8px">MANI MEDICAL HANOI CO., LTD</div>' +
                  '<div style="font-size:8.5px;color:#8a99ab;margin-top:2px">Xác thực chứng chỉ trên hệ thống MMH Training Hub</div>' +
                '</td>' +
                '<td style="width:33%;text-align:right;vertical-align:bottom">' +
                  '<table align="right" cellpadding="0" cellspacing="0"><tr><td style="width:190px;border-top:1.4px solid ' + navy + ';padding-top:6px;text-align:center">' +
                    '<div style="font-size:12.5px;color:' + navy + ';font-weight:bold">' + hubEsc(cfg.CERT_SIGNER_NAME || '') + '</div>' +
                    '<div style="font-size:10px;color:#8a99ab;margin-top:2px">' + hubEsc(cfg.CERT_SIGNER_TITLE || '') + '</div>' +
                  '</td></tr></table>' +
                '</td>' +
              '</tr>' +
            '</table>' +

          '</td></tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</td></tr>' +
'</table>' +
'</div></body></html>';
}

function hubCertCell(label, value, navy, blue) {
  return '<td style="padding:0 17px;text-align:center;border-left:1px solid #e6edf6">' +
    '<div style="font-size:8.5px;letter-spacing:1.4px;color:' + blue + ';font-weight:bold">' + hubEsc(label) + '</div>' +
    '<div style="font-size:12.5px;color:' + navy + ';font-weight:bold;margin-top:4px">' + hubEsc(value || '—') + '</div>' +
  '</td>';
}


/** Trainer/Admin cấp lại chứng chỉ thủ công */
function apiResendCert(p, user) {
  var sid = hubNorm(p.sid), email = hubNorm(p.email);
  var s = hubFindSession(sid);
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được cấp lại chứng chỉ của buổi do mình phụ trách.'};
  var target = hubFindUser(email);
  if (!target) return {ok:false, error:'Không tìm thấy học viên.'};
  var e = hubFindEnroll(sid, email);
  if (!e || !e.pass) return {ok:false, error:'Học viên này chưa đạt bài kiểm tra.'};

  var cert = hubIssueCertificate(s, target, e.percent || 0, e.score || 0, e.maxScore || 0);
  hubUpsertEnroll(sid, s.topic, email, {certUrl:cert.url, certSentAt:new Date()});
  return {ok:true, message:'Đã cấp lại và gửi chứng chỉ cho ' + target.name + '.', certificate:cert};
}

function apiMyCertificates(p, user) {
  var pre = hubPrefix(user.email);
  var byS = {};
  hubReadSessions().forEach(function(s){ byS[s.sid] = s; });
  var out = hubReadEnrollment().filter(function(e){
    return hubPrefix(e.email) === pre && e.certUrl && hubIsTestSid(e.sid) === !!HUB_CTX.test;
  }).map(function(e){
    var s = byS[e.sid] || {};
    return {
      sid:e.sid, topic:e.topic || s.topic, category:s.category || '',
      trainer:s.trainer || '', dateText:s.dateText || '',
      percent:e.percent, certUrl:e.certUrl,
      issuedAt: e.certSentAt ? hubFmt(e.certSentAt, 'dd/MM/yyyy') : '',
      issuedIso: e.certSentAt ? new Date(e.certSentAt).toISOString() : ''
    };
  }).sort(function(a, b){ return a.issuedIso < b.issuedIso ? 1 : -1; });
  return {ok:true, data:out};
}


// ============================================================================
//  16. EMAIL THÔNG BÁO / MỜI THAM DỰ — gửi thay mặt PIC
// ============================================================================
//  Lưu ý kỹ thuật: Apps Script gửi từ hộp thư của tài khoản chạy script
//  (mmh.product@mani.inc). Hệ thống hiển thị TÊN PIC ở ô người gửi,
//  đặt Reply-To = email PIC và CC cho PIC → học viên trả lời sẽ về thẳng PIC.
//  Muốn gửi 100% từ hộp thư PIC: dùng nút "Soạn bằng Gmail của tôi" trên app.

var HUB_INVITE_KINDS = {
  pre     : {kicker:'Thư mời đào tạo',              subject:'[MMH Training] Thư mời đào tạo — ',          noti:'invite'},
  after   : {kicker:'Tài liệu & bài kiểm tra sau đào tạo', subject:'[MMH Training] Tài liệu & bài kiểm tra — ', noti:'quiz'},
  quiz    : {kicker:'Bài kiểm tra đã mở',           subject:'[MMH Training] Mời làm bài kiểm tra — ',      noti:'quiz'},
  reminder: {kicker:'Nhắc làm bài kiểm tra',        subject:'[MMH Training] Nhắc làm bài kiểm tra — ',     noti:'reminder'}
};

/** Dựng nội dung email (HTML + văn bản thuần cho nút "Soạn bằng Gmail") */
function hubInviteContent(s, sender, opt) {
  var cfg = hubGetConfig();
  var kind = HUB_INVITE_KINDS[opt.kind] ? opt.kind : 'pre';
  var K = HUB_INVITE_KINDS[kind];
  var appUrl = hubNorm(opt.appUrl) || hubAppUrl(cfg);
  var linkSession = appUrl ? appUrl + '#/s/' + s.sid : '';
  var linkQuiz = appUrl ? appUrl + '#/quiz/' + s.sid : '';
  var q = hubReadQuizConfig(s.sid);
  var deadline = opt.deadline ? hubToDate(opt.deadline) : (q && q.deadline ? hubToDate(q.deadline) : null);
  var dlText = deadline ? hubFmt(deadline, 'dd/MM/yyyy') : '';
  var timeText = s.timeFrom ? (s.timeFrom + (s.timeTo ? ' – ' + s.timeTo : '')) : '';
  var withQuiz = kind !== 'pre' && q && q.total > 0;

  var intro = {
    pre: 'Trân trọng kính mời Anh/Chị tham dự buổi đào tạo với thông tin dưới đây.',
    after: 'Cảm ơn Anh/Chị đã tham dự buổi đào tạo. Tài liệu và bài kiểm tra sau đào tạo đã sẵn sàng trên MMH Training Hub.',
    quiz: 'Bài kiểm tra sau đào tạo đã được mở. Anh/Chị vui lòng hoàn thành' + (dlText ? ' trước ngày <b>' + dlText + '</b>' : ' sớm') + '.',
    reminder: 'Hệ thống ghi nhận Anh/Chị chưa hoàn thành bài kiểm tra của buổi đào tạo dưới đây' + (dlText ? ' — hạn làm bài <b>' + dlText + '</b>' : '') + '.'
  }[kind];

  var rows = hubRow('Chủ đề', hubEsc(s.topic));
  if (kind === 'pre') {
    rows += hubRow('Mục tiêu', hubEsc(s.purpose)) +
            hubRow('Thời gian', hubEsc(s.dateText + (timeText ? '  ·  ' + timeText : ''))) +
            hubRow('Hình thức', hubEsc(s.type)) +
            hubRow('Trainer', hubEsc(s.trainer)) +
            hubRow('Thành phần', hubEsc(s.audience)) +
            (s.meetingLink ? hubRow('Link họp', '<a href="' + hubEsc(s.meetingLink) + '" style="color:#1155CC">' + hubEsc(s.meetingLink) + '</a>') : '');
  } else {
    rows += hubRow('Ngày đào tạo', hubEsc(s.dateText)) + hubRow('Trainer', hubEsc(s.trainer));
  }
  if (withQuiz) {
    rows += hubRow('Bài kiểm tra', q.total + ' câu · ' + q.durationMin + ' phút · đạt từ ' + q.passScore + '/100 điểm · ' + q.maxAttempts + ' lượt làm') +
            (dlText ? hubRow('Hạn hoàn thành', '<b style="color:#C62828">' + dlText + '</b>') : '');
  }

  var steps = withQuiz ?
    '<div style="background:#F0F7FF;border-radius:10px;padding:14px 18px;margin:4px 0 18px;font-size:13.5px;color:#1A1A1A">' +
      '<div style="font-weight:700;color:#003047;margin-bottom:6px">Làm bài trong 3 bước</div>' +
      '<div>1. Bấm nút <b>Làm bài kiểm tra</b> bên dưới (mở MMH Training Hub).</div>' +
      '<div>2. Đăng nhập bằng email công ty + mã PIN. Lần đầu: bấm <b>Kích hoạt / Quên PIN</b> để nhận mã qua email.</div>' +
      '<div>3. Làm bài trong ' + q.durationMin + ' phút — hệ thống chấm điểm ngay và gửi chứng chỉ khi đạt.</div>' +
    '</div>' : '';

  var note = hubNorm(opt.note)
    ? '<div style="background:#FFF8E1;border-left:4px solid #FFE100;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13.5px;margin:0 0 18px">' + hubEsc(opt.note).replace(/\n/g, '<br>') + '</div>'
    : '';

  // ★ v3.4 — link thư mục tài liệu đào tạo (tạo khi gửi email từ Report Hub)
  var folderUrl = hubNorm(opt.folderUrl);
  var folderBlk = (folderUrl || opt.folderPending)
    ? '<div style="background:#F2F9F6;border-left:4px solid #3E8E6B;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13.5px;margin:0 0 18px">' +
        '📁 Vui lòng truy cập và tham khảo tài liệu đào tạo tại đây: ' +
        (folderUrl ? '<a href="' + hubEsc(folderUrl) + '" style="color:#1155CC;font-weight:700">Thư mục tài liệu đào tạo</a>'
                   : '<i style="color:#5E738C">(link thư mục được tạo tự động khi bấm Gửi)</i>') +
      '</div>'
    : '';

  var buttons = '';
  if (withQuiz) buttons = hubMailButton(linkQuiz, 'Làm bài kiểm tra') + hubMailButton(linkSession, 'Xem tài liệu', true);
  else buttons = hubMailButton(linkSession, 'Xem chi tiết trên Training Hub') + (s.meetingLink ? hubMailButton(s.meetingLink, 'Vào phòng họp', true) : '');

  var sign = '<p style="margin:18px 0 0;color:#41566f;font-size:13.5px">Trân trọng,<br><b style="color:#003047">' + hubEsc(sender.name) + '</b>' +
             (sender.position ? '<br>' + hubEsc(sender.position) : '') + '<br><span style="color:#5E738C">' + hubEsc(hubMailOf(sender.email)) + '</span></p>';

  var html = hubMailShell(K.kicker, hubEsc(s.topic),
    '<p style="margin:0 0 14px">' + intro + '</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">' + rows + '</table>' +
    steps + note + folderBlk + (buttons ? '<div style="margin:6px 0 4px">' + buttons + '</div>' : '') + sign,
    'Email gửi qua MMH Training Hub thay mặt ' + hubEsc(sender.name) + '. Trả lời email này sẽ gửi tới ' + hubEsc(hubMailOf(sender.email)) + '.');

  // --- văn bản thuần ---
  var t = [];
  t.push(intro.replace(/<[^>]+>/g, ''));
  t.push('');
  t.push('Chủ đề: ' + s.topic);
  if (kind === 'pre') {
    if (s.purpose) t.push('Mục tiêu: ' + s.purpose);
    t.push('Thời gian: ' + s.dateText + (timeText ? ' · ' + timeText : ''));
    if (s.trainer) t.push('Trainer: ' + s.trainer);
    if (s.meetingLink) t.push('Link họp: ' + s.meetingLink);
  }
  if (withQuiz) {
    t.push('Bài kiểm tra: ' + q.total + ' câu · ' + q.durationMin + ' phút · đạt từ ' + q.passScore + '/100 điểm');
    if (dlText) t.push('Hạn hoàn thành: ' + dlText);
    t.push('');
    t.push('Làm bài tại: ' + (linkQuiz || '(MMH Training Hub)'));
    t.push('Đăng nhập bằng email công ty + mã PIN (lần đầu bấm "Kích hoạt / Quên PIN").');
  } else if (linkSession) {
    t.push('');
    t.push('Chi tiết: ' + linkSession);
  }
  if (hubNorm(opt.note)) { t.push(''); t.push(hubNorm(opt.note)); }
  if (folderUrl) { t.push(''); t.push('Vui lòng truy cập và tham khảo tài liệu đào tạo tại đây: ' + folderUrl); }
  t.push('');
  t.push('Trân trọng,');
  t.push(sender.name + (sender.position ? ' — ' + sender.position : ''));

  var subject = hubNorm(opt.subject) || (K.subject + s.topic);
  return {subject:subject, html:html, text:t.join('\n'), kind:kind, notiType:K.noti, deadline:deadline};
}

/** Danh sách người nhận cuối cùng */
function hubInviteRecipients(s, p) {
  var list = hubList(p.recipients).map(hubMailOf).filter(function(e){ return e && e.indexOf('@') > 0; });
  if (!list.length) list = hubResolveAudience(s.audience);
  if (hubBool(p.onlyPending)) {
    var passed = {};
    hubReadEnrollment().forEach(function(e){ if (e.sid === s.sid && e.pass) passed[hubPrefix(e.email)] = true; });
    list = list.filter(function(e){ return !passed[hubPrefix(e)]; });
  }
  return hubUniq(list.map(hubMailOf));
}

function apiPreviewInvite(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  var c = hubInviteContent(s, user, p);
  var rec = hubInviteRecipients(s, p);
  return {ok:true, subject:c.subject, html:c.html, text:c.text, recipients:rec,
          quota: (function(){ try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; } })()};
}

function apiSendInvite(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok:false, error:'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok:false, error:'Bạn chỉ được gửi thông báo cho buổi đào tạo do mình phụ trách.'};
  if (p.appUrl) hubRememberAppUrl(p.appUrl);

  var recipients = hubInviteRecipients(s, p);
  if (!recipients.length) return {ok:false, error:'Không có người nhận (tất cả đã đạt hoặc chưa chọn ai).'};

  var cc = hubList(p.cc).map(hubMailOf).filter(function(e){ return e && e.indexOf('@') > 0; });
  if (p.ccMe === undefined || hubBool(p.ccMe)) cc.push(hubMailOf(user.email));
  var toSet = {};
  recipients.forEach(function(e){ toSet[hubPrefix(e)] = 1; });
  cc = hubUniq(cc).filter(function(e){ return !toSet[hubPrefix(e)]; });

  // lưu hạn làm bài vào cấu hình bài kiểm tra
  var dl = hubToDate(p.deadline);
  if (dl && p.kind !== 'pre') {
    hubWithLock(function(){
      hubCacheClear('qcfg');
      var q = hubReadQuizConfig(s.sid);
      if (q) {
        hubQSheet(HUB.QUIZ_SHEETS.CONFIG).getRange(q.row, 14).setValue(dl);
        hubCacheClear('qcfg'); hubCacheClear('sessions');
      }
    });
  }

  var c = hubInviteContent(s, user, p);
  var quota = 0;
  try { quota = MailApp.getRemainingDailyQuota(); } catch (e) {}
  if (quota && quota < recipients.length + cc.length) {
    return {ok:false, error:'Hạn mức email hôm nay còn ' + quota + ' — không đủ cho ' + (recipients.length + cc.length) + ' người nhận.'};
  }

  hubMail({
    to: recipients.join(','),
    cc: cc.join(','),
    subject: c.subject,
    htmlBody: c.html,
    body: c.text,
    name: user.name + ' · MMH Training Hub',
    replyTo: hubMailOf(user.email)
  });

  try {
    hubReportSheet().getRange(s.row, c.kind === 'pre' ? HUB.COL.PRE_TRAINING : HUB.COL.AFTER_TRAINING).setValue(true);
    hubCacheClear('sessions');
  } catch (e) {}
  hubSyncEnrollment(s.sid, s.topic, recipients.join(';'));

  var notiTitle = {pre:'Thư mời đào tạo: ', after:'Tài liệu & bài kiểm tra: ', quiz:'Mời làm bài kiểm tra: ', reminder:'Nhắc làm bài: '}[c.kind] + s.topic;
  var notiMsg = 'Từ ' + user.name + (c.deadline ? ' · Hạn ' + hubFmt(c.deadline, 'dd/MM/yyyy') : '');
  var nN = hubNotify(recipients.filter(function(e){ return hubPrefix(e) !== hubPrefix(user.email); }), c.notiType, s.sid, notiTitle, notiMsg, user.email);

  hubLog('INFO', 'sendInvite', s.sid + ' ' + c.kind + ' -> ' + recipients.length + ' người by ' + user.email, '');
  return {ok:true, message:'Đã gửi email tới ' + recipients.length + ' người' + (cc.length ? ' (CC ' + cc.length + ')' : '') + ' và tạo ' + nN + ' thông báo trong ứng dụng.',
          recipients:recipients, cc:cc};
}


// ============================================================================
//  17. THỐNG KÊ & KHỞI ĐỘNG
// ============================================================================

function apiGetStats(p, user) {
  var sessions = hubReadSessions();
  var isT = function(x){ return hubIsTestSid(x.sid) === !!HUB_CTX.test; };   // ★ v3.0: tách dữ liệu test
  var enroll   = hubReadEnrollment().filter(isT);
  var responses= hubReadResponsesAll().filter(isT);
  var users    = hubReadUsers();
  var qcfg     = hubReadQuizConfigAll().filter(isT);
  var cfg      = hubGetConfig();

  var qmap = {};
  qcfg.forEach(function(q){ if (q.total > 0) qmap[q.sid] = q; });

  var active    = sessions.filter(function(s){ return s.status !== 'Cancel'; });
  var completed = active.filter(function(s){ return s.status === 'Completed'; });
  var planned   = active.filter(function(s){ return s.status === 'Plan'; });
  var withQuiz  = completed.filter(function(s){ return !!qmap[s.sid]; });

  var byCat = {}, byTrainer = {}, byMonth = {}, byType = {};
  active.forEach(function(s){
    var c = s.category || 'Khác';
    if (!byCat[c]) byCat[c] = {name:c, total:0, done:0, withQuiz:0, _sum:0, _n:0};
    byCat[c].total++; if (s.status === 'Completed') byCat[c].done++;
    if (qmap[s.sid]) byCat[c].withQuiz++;

    var t = s.trainer || 'Chưa gán';
    if (!byTrainer[t]) byTrainer[t] = {name:t, total:0, done:0, learners:0, withQuiz:0};
    byTrainer[t].total++; if (s.status === 'Completed') byTrainer[t].done++;
    if (qmap[s.sid]) byTrainer[t].withQuiz++;

    var m = s.date ? s.date.substring(0, 7) : '';
    if (m) {
      if (!byMonth[m]) byMonth[m] = {name:m, total:0, done:0, _sum:0, _n:0};
      byMonth[m].total++; if (s.status === 'Completed') byMonth[m].done++;
    }
    var ty = s.type || 'Khác';
    if (!byType[ty]) byType[ty] = {name:ty, total:0};
    byType[ty].total++;
  });

  var sidInfo = {};
  active.forEach(function(s){ sidInfo[s.sid] = s; });
  enroll.forEach(function(e){
    var s = sidInfo[e.sid];
    if (!s) return;
    var t = s.trainer || 'Chưa gán';
    if (byTrainer[t]) byTrainer[t].learners++;
    if (e.percent !== '' && e.percent !== null) {
      var c = s.category || 'Khác';
      if (byCat[c]) { byCat[c]._sum += hubNum(e.percent, 0); byCat[c]._n++; }
      var m = s.date ? s.date.substring(0, 7) : '';
      if (byMonth[m]) { byMonth[m]._sum += hubNum(e.percent, 0); byMonth[m]._n++; }
    }
  });

  var totalEnroll = enroll.length;
  var totalDone   = enroll.filter(function(e){ return e.status === 'Completed'; }).length;
  var totalPass   = enroll.filter(function(e){ return e.pass; }).length;
  var scored = enroll.filter(function(e){ return e.percent !== '' && e.percent !== null; });
  var avgScore = scored.length ? Math.round(scored.reduce(function(a, e){ return a + hubNum(e.percent, 0); }, 0) / scored.length * 10) / 10 : 0;

  var byUser = {};
  users.forEach(function(u){
    if (!u.active) return;
    byUser[hubPrefix(u.email)] = {name:u.name, email:u.email, dept:u.dept, position:u.position,
      assigned:0, completed:0, passed:0, avg:0, _sum:0, _n:0, certs:0};
  });
  enroll.forEach(function(e){
    var k = hubPrefix(e.email);
    if (!byUser[k]) return;
    byUser[k].assigned++;
    if (e.status === 'Completed') byUser[k].completed++;
    if (e.pass) byUser[k].passed++;
    if (e.certUrl) byUser[k].certs++;
    if (e.percent !== '' && e.percent !== null) { byUser[k]._sum += hubNum(e.percent, 0); byUser[k]._n++; }
  });
  var learners = [];
  for (var k in byUser) {
    var u = byUser[k];
    u.avg = u._n ? Math.round(u._sum / u._n * 10) / 10 : 0;
    u.rate = u.assigned ? Math.round(u.passed / u.assigned * 100) : 0;
    delete u._sum; delete u._n;
    learners.push(u);
  }
  learners.sort(function(a, b){ return b.passed - a.passed || b.avg - a.avg; });

  var fin = function(o){
    var a = [];
    for (var k in o) {
      var x = o[k];
      if (x.hasOwnProperty('_sum')) { x.avg = x._n ? Math.round(x._sum / x._n * 10) / 10 : null; delete x._sum; delete x._n; }
      a.push(x);
    }
    return a;
  };

  return {
    ok:true,
    kpi: {
      totalSessions: active.length,
      completedSessions: completed.length,
      plannedSessions: planned.length,
      cancelledSessions: sessions.length - active.length,
      sessionsWithQuiz: withQuiz.length,
      quizCoverage: completed.length ? Math.round(withQuiz.length / completed.length * 100) : 0,
      totalLearners: users.filter(function(u){ return u.active; }).length,
      totalEnroll: totalEnroll, totalDone: totalDone, totalPass: totalPass,
      passRate: totalDone ? Math.round(totalPass / totalDone * 100) : 0,
      completionRate: totalEnroll ? Math.round(totalDone / totalEnroll * 100) : 0,
      avgScore: avgScore,
      targetAvg: hubNum(cfg.TARGET_AVG_SCORE, 80),
      totalCerts: enroll.filter(function(e){ return !!e.certUrl; }).length,
      totalResponses: responses.length,
      openQuizzes: qcfg.filter(function(q){ return q.active && q.total > 0; }).length
    },
    byCategory: fin(byCat),
    byTrainer : fin(byTrainer).sort(function(a, b){ return b.total - a.total; }),
    byMonth   : fin(byMonth).sort(function(a, b){ return a.name.localeCompare(b.name); }),
    byType    : fin(byType),
    learners  : learners,
    upcoming  : hubUpcoming(active, 8),
    recent    : responses.slice(-15).reverse()
  };
}

function hubUpcoming(sessions, limit) {
  var today = hubFmt(new Date(), 'yyyy-MM-dd');
  return sessions
    .filter(function(s){ return s.status === 'Plan' && s.date && s.date >= today; })
    .sort(function(a, b){ return a.date.localeCompare(b.date); })
    .slice(0, limit || 8)
    .map(function(s){ var c = hubCopy(s); delete c.row; return c; });
}

/** Cấu hình gửi xuống frontend (không lộ giá trị nội bộ) */
function hubPublicConfig() {
  var c = hubGetConfig(), out = {};
  ['APP_TITLE','APP_SUBTITLE','FISCAL_YEAR','COLOR_PRIMARY','COLOR_ACCENT','COLOR_HIGHLIGHT','LOGO_TEXT',
   'DEFAULT_PASS_SCORE','DEFAULT_DURATION_MIN','DEFAULT_MAX_ATTEMPTS','DEFAULT_DEADLINE_DAYS','TARGET_AVG_SCORE','FY_START_MONTH','FY_BASE_YEAR',
   'CERT_SIGNER_NAME','CERT_SIGNER_TITLE','ENABLE_CERT_EMAIL','ENABLE_AUTO_REMINDER','REMINDER_DAYS_BEFORE','APP_URL']
    .forEach(function(k){ out[k] = c[k]; });
  return out;
}

/** Gói dữ liệu khởi động cho frontend — 1 lần gọi. fresh=1 → đọc lại toàn bộ từ Sheet. */
function apiBootstrap(p, user) {
  if (hubBool(p.fresh)) hubCacheClear();
  if (p.appUrl) hubRememberAppUrl(p.appUrl);

  var ls = apiListSessions(p, user);
  var pre = hubPrefix(user.email);
  var byS = {};
  ls.data.forEach(function(s){ byS[s.sid] = s; });

  var myProg = hubReadProgress().filter(function(x){ return x.email === pre && byS[x.sid]; });
  var progressBySid = {};
  myProg.forEach(function(x){
    var o = progressBySid[x.sid] || (progressBySid[x.sid] = {opened:0, done:0});
    o.opened++; if (x.completed) o.done++;
  });
  var recent = myProg.slice()
    .sort(function(a, b){ return a.last < b.last ? 1 : -1; })
    .slice(0, 8)
    .map(function(x){ return {sid:x.sid, fileId:x.fileId, fileName:x.fileName, percent:x.percent, completed:x.completed, last:x.last, topic:byS[x.sid].topic}; });

  var noti = hubMyNoti(user);
  return {
    ok: true,
    user: hubPublicUser(user),
    config: ls.config,
    meta: ls.meta,
    sessions: ls.data,
    todo: hubMyTodo(user, ls.data),
    recentMaterials: recent,
    progressBySid: progressBySid,
    unread: noti.filter(function(n){ return !n.read; }).length,
    groups: hubGroupList(),
    users: hubReadUsers().filter(function(u){ return u.active; }).map(function(u){
      return {email:u.email, name:u.name, role:u.role, dept:u.dept, position:u.position};
    }),
    quizFileUrl: hubIsTrainer(user) ? hubQuizFileUrl() : '',
    driveFolders: {
      parent: 'https://drive.google.com/drive/folders/' + HUB.DRIVE.PARENT,
      certificate: 'https://drive.google.com/drive/folders/' + HUB.DRIVE.CERTIFICATE
    },
    today: hubFmt(new Date(), 'yyyy-MM-dd')
  };
}


// ============================================================================
//  18. ★ v2 — NHẮC LÀM BÀI TỰ ĐỘNG (trigger hằng ngày 8:00)
// ============================================================================

function hubDailyReminder() {
  var cfg = hubGetConfig();
  if (!hubBool(cfg.ENABLE_AUTO_REMINDER)) return 'Tắt nhắc tự động (ENABLE_AUTO_REMINDER = false).';
  var daysBefore = hubNum(cfg.REMINDER_DAYS_BEFORE, 1);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var todayKey = hubFmt(today, 'yyyyMMdd');
  var props = PropertiesService.getScriptProperties();
  var sessions = hubReadSessions();
  var byS = {};
  sessions.forEach(function(s){ byS[s.sid] = s; });
  var enroll = hubReadEnrollment();
  var responses = hubReadResponsesAll();
  var log = [];

  hubReadQuizConfigAll().forEach(function(q){
    if (!q.active || !q.total || !q.deadline) return;
    var s = byS[q.sid];
    if (!s || s.status === 'Cancel') return;
    var dl = hubToDate(q.deadline);
    var days = Math.round((dl.getTime() - today.getTime()) / 86400000);
    if (days < 0 || days > daysBefore) return;
    var mark = 'RM_' + q.sid + '_' + todayKey;
    if (props.getProperty(mark)) return;

    var passed = {}, tries = {};
    enroll.forEach(function(e){ if (e.sid === q.sid && e.pass) passed[hubPrefix(e.email)] = true; });
    responses.forEach(function(r){ if (r.sid === q.sid) tries[hubPrefix(r.email)] = (tries[hubPrefix(r.email)] || 0) + 1; });
    var targets = hubResolveAudience(s.audience).filter(function(e){
      var k = hubPrefix(e);
      return !passed[k] && (tries[k] || 0) < q.maxAttempts;
    });
    if (!targets.length) return;

    var trainer = null;
    hubReadUsers().forEach(function(u){ if (!trainer && hubIsTrainerOf(s.trainer, u)) trainer = u; });
    var sender = trainer || {name:'MMH Training Hub', email:HUB.ADMIN_EMAIL, position:''};
    var c = hubInviteContent(s, sender, {kind:'reminder', appUrl:hubAppUrl(cfg)});
    try {
      hubMail({
        to: targets.join(','), subject: c.subject, htmlBody: c.html, body: c.text,
        name: sender.name + ' · MMH Training Hub', replyTo: hubMailOf(sender.email)
      });
      hubNotify(targets, 'reminder', s.sid, 'Nhắc làm bài: ' + s.topic,
        days === 0 ? 'Hôm nay là hạn cuối.' : 'Còn ' + days + ' ngày — hạn ' + hubFmt(dl, 'dd/MM/yyyy'), sender.email);
      props.setProperty(mark, '1');
      log.push(s.topic + ': ' + targets.length + ' người');
    } catch (e) {
      hubLog('ERROR', 'dailyReminder', s.sid, e.message);
    }
  });
  var msg = log.length ? 'Đã nhắc: ' + log.join('; ') : 'Không có bài kiểm tra nào cần nhắc hôm nay.';
  hubLog('INFO', 'dailyReminder', msg, '');
  return msg;
}

// ---------- ★ v3.0 — Nhắc lịch ngày đào tạo & nhắc bài kiểm tra hằng tuần ----------

/** Nội dung email nhắc lịch trong ngày đào tạo (gửi riêng từng người) */
function hubDayReminderContent(s, name, appUrl) {
  var time = s.timeFrom ? s.timeFrom + (s.timeTo ? ' – ' + s.timeTo : '') : '';
  var inner =
    '<p style="margin:0 0 12px">Chào ' + hubEsc(name) + ',</p>' +
    '<p style="margin:0 0 14px">Hôm nay sẽ có lịch đào tạo về chủ đề: <b style="color:#003047">' + hubEsc(s.topic) + '</b>' +
    ' với Trainer là <b style="color:#003047">' + hubEsc(s.trainer || '—') + '</b>.</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:14px">' +
      hubRow('Ngày', hubEsc(s.dateText)) + (time ? hubRow('Thời gian', hubEsc(time)) : '') +
      hubRow('Hình thức', hubEsc(s.type)) +
      (s.meetingLink ? hubRow('Link họp', '<a href="' + hubEsc(s.meetingLink) + '" style="color:#1155CC">' + hubEsc(s.meetingLink) + '</a>') : '') +
    '</table>' +
    '<p style="margin:0 0 16px">Xin vui lòng thu xếp thời gian tham dự, hoặc báo lại cho trainer biết nếu không thể tham gia.</p>' +
    (s.meetingLink ? hubMailButton(s.meetingLink, 'Vào phòng họp') : '') + hubMailButton(appUrl + '#/s/' + s.sid, 'Xem trên Training Hub', !!s.meetingLink);
  return {
    subject: '[MMH Training] Hôm nay: ' + s.topic + (time ? ' (' + time + ')' : ''),
    html: hubMailShell('Nhắc lịch đào tạo hôm nay', hubEsc(s.topic), inner, 'Email tự động từ MMH Training Hub. Trả lời email này để báo lại cho trainer.'),
    text: 'Chào ' + name + ',\n\nHôm nay sẽ có lịch đào tạo về chủ đề: ' + s.topic + ' với Trainer là ' + (s.trainer || '') + '.' +
          (time ? '\nThời gian: ' + time : '') + (s.meetingLink ? '\nLink họp: ' + s.meetingLink : '') +
          '\n\nXin vui lòng thu xếp thời gian tham dự, hoặc báo lại cho trainer biết nếu không thể tham gia.\n\n' + appUrl + '#/s/' + s.sid
  };
}

function hubTrainerUser(s) {
  var t = null;
  hubReadUsers().forEach(function(u){ if (!t && hubIsTrainerOf(s.trainer, u)) t = u; });
  return t;
}

/** 8:30 ngày đào tạo: nhắc từng học viên của các buổi hôm nay đã gửi thư mời */
function hubSessionDayReminder(onlySid) {
  var cfg = hubGetConfig();
  if (!onlySid && !hubBool(cfg.ENABLE_DAY_REMINDER)) return 'Tắt nhắc lịch ngày đào tạo (ENABLE_DAY_REMINDER = false).';
  var appUrl = hubAppUrl(cfg), today = hubFmt(new Date(), 'yyyy-MM-dd'), key = hubFmt(new Date(), 'yyyyMMdd');
  var props = PropertiesService.getScriptProperties(), users = {}, log = [];
  hubReadUsers().forEach(function(u){ users[hubPrefix(u.email)] = u; });
  hubReadSessions().forEach(function(s){
    if (onlySid ? s.sid !== onlySid : (s.date !== today || s.status !== 'Plan' || !s.preSent)) return;
    var mark = 'DR_' + s.sid + '_' + key;
    if (!onlySid && props.getProperty(mark)) return;
    var trainer = hubTrainerUser(s), n = 0;
    var targets = hubResolveAudience(s.audience).filter(function(em){ var u = users[hubPrefix(em)]; return !u || u.active; });
    var from = {name: (trainer ? trainer.name + ' · ' : '') + 'MMH Training Hub', replyTo: trainer ? hubMailOf(trainer.email) : HUB.ADMIN_EMAIL};
    if (HUB_CTX.test) {                      // Chế độ Test: 1 email mẫu tới người test (ghi rõ danh sách người nhận thật)
      var ct = hubDayReminderContent(s, HUB_CTX.tester.name, appUrl);
      hubMail({to: targets.map(hubMailOf).join(','), subject: ct.subject, htmlBody: ct.html, body: ct.text, name: from.name, replyTo: from.replyTo});
      n = targets.length;
    } else {
      targets.forEach(function(em){         // gửi riêng từng người
        var u = users[hubPrefix(em)];
        var c = hubDayReminderContent(s, u ? u.name : hubPrefix(em), appUrl);
        try { hubMail({to: hubMailOf(em), subject: c.subject, htmlBody: c.html, body: c.text, name: from.name, replyTo: from.replyTo}); n++; }
        catch (e) { hubLog('ERROR', 'dayReminder', s.sid + ' → ' + em, e.message); }
      });
    }
    if (n) {
      hubNotify(hubResolveAudience(s.audience), 'session', s.sid, 'Hôm nay: ' + s.topic, (s.timeFrom ? s.timeFrom + ' · ' : '') + 'Trainer: ' + s.trainer, trainer ? trainer.email : '');
      if (!onlySid) props.setProperty(mark, '1');
      log.push(s.topic + ': ' + n + ' email');
    }
  });
  var msg = log.length ? 'Nhắc lịch hôm nay: ' + log.join('; ') : 'Hôm nay không có buổi đào tạo nào (đã gửi thư mời) cần nhắc.';
  hubLog('INFO', 'dayReminder', msg, '');
  return msg;
}

/** Danh sách bài kiểm tra chưa hoàn thành (chưa có chứng chỉ) của 1 người */
function hubPendingFor(u) {
  var ls = apiListSessions({}, u).data;
  return ls.filter(function(s){ return s.assigned && s.hasQuiz && s.quizActive && s.questionCount > 0 && !s.myPass && s.status !== 'Cancel'; })
    .map(function(s){ return {sid:s.sid, topic:s.topic, trainer:s.trainer, deadline:s.deadline, left:(s.maxAttempts || 1) - (s.myAttempts || 0), requireMaterials:s.requireMaterials}; });
}

function hubWeeklyDigestContent(u, list, appUrl) {
  var link = appUrl.replace(/#.*$/, '');
  var rows = list.map(function(x, i){
    return '<tr><td style="padding:9px 0;border-bottom:1px solid #EEF3FA;color:#5E738C;width:28px;vertical-align:top">' + (i + 1) + '.</td>' +
      '<td style="padding:9px 0;border-bottom:1px solid #EEF3FA"><b style="color:#003047">' + hubEsc(x.topic) + '</b>' +
      '<div style="font-size:12.5px;color:#5E738C">Trainer: ' + hubEsc(x.trainer || '—') + (x.deadline ? ' · Hạn ' + hubFmt(hubToDate(x.deadline), 'dd/MM/yyyy') : '') +
      (x.left <= 0 ? ' · <b style="color:#C62828">đã hết lượt — liên hệ trainer</b>' : ' · còn ' + x.left + ' lượt làm bài') + '</div></td></tr>';
  }).join('');
  var inner =
    '<p style="margin:0 0 12px">Chào ' + hubEsc(u.name) + ',</p>' +
    '<p style="margin:0 0 12px">Hiện nay bạn cần hoàn thành các chứng chỉ liên quan đến các bài đào tạo sau:</p>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">' + rows + '</table>' +
    '<p style="margin:0 0 6px">Vui lòng truy cập hệ thống <a href="' + hubEsc(link) + '" style="color:#1155CC">' + hubEsc(link) + '</a>, vào phần <b>"Chứng chỉ của tôi"</b> → bấm vào các đào tạo cần hoàn thành để xem lại nội dung, làm bài kiểm tra và nhận chứng chỉ.</p>' +
    '<div style="margin:16px 0 4px">' + hubMailButton(link + '#/certs', 'Mở "Chứng chỉ của tôi"') + '</div>';
  return {
    subject: '[MMH Training] Bạn còn ' + list.length + ' chứng chỉ cần hoàn thành',
    html: hubMailShell('Nhắc hoàn thành bài kiểm tra — hằng tuần', 'Bạn còn ' + list.length + ' chứng chỉ cần hoàn thành', inner, 'Email tự động mỗi thứ Hai từ MMH Training Hub.'),
    text: 'Chào ' + u.name + ',\n\nHiện nay bạn cần hoàn thành các chứng chỉ liên quan đến các bài đào tạo sau:\n' +
          list.map(function(x, i){ return (i + 1) + '. ' + x.topic + ' (Trainer: ' + (x.trainer || '') + ')'; }).join('\n') +
          '\n\nVui lòng truy cập hệ thống ' + link + ', vào phần "Chứng chỉ của tôi" → bấm vào các đào tạo cần hoàn thành.'
  };
}

/** Thứ Hai hằng tuần: nhắc mỗi người các bài kiểm tra chưa hoàn thành */
function hubWeeklyDigest(onlyUser) {
  var cfg = hubGetConfig();
  if (!onlyUser && !hubBool(cfg.ENABLE_WEEKLY_DIGEST)) return 'Tắt nhắc hằng tuần (ENABLE_WEEKLY_DIGEST = false).';
  var appUrl = hubAppUrl(cfg), key = hubFmt(new Date(), 'yyyyMMdd'), props = PropertiesService.getScriptProperties();
  var sent = 0;
  hubReadUsers().forEach(function(u){
    if (!u.active || (onlyUser && hubPrefix(u.email) !== hubPrefix(onlyUser.email))) return;
    var mark = 'WD_' + key + '_' + hubPrefix(u.email);
    if (!onlyUser && props.getProperty(mark)) return;
    var list = hubPendingFor(u);
    if (!list.length) return;
    var c = hubWeeklyDigestContent(u, list, appUrl);
    try {
      hubMail({to: hubMailOf(u.email), subject: c.subject, htmlBody: c.html, body: c.text, name: 'MMH Training Hub'});
      hubNotify([u.email], 'reminder', list[0].sid, 'Bạn còn ' + list.length + ' chứng chỉ cần hoàn thành', 'Xem ở mục Chứng chỉ của tôi', '');
      if (!onlyUser) props.setProperty(mark, '1');
      sent++;
    } catch (e) { hubLog('ERROR', 'weeklyDigest', u.email, e.message); }
  });
  var msg = 'Nhắc hằng tuần: đã gửi ' + sent + ' email.';
  hubLog('INFO', 'weeklyDigest', msg, '');
  return msg;
}

/** Trigger 8:30 hằng ngày: nhắc lịch hôm nay + nhắc hạn bài KT + (thứ Hai) nhắc hằng tuần */
function hubMorningJobs() {
  var out = [];
  try { out.push(hubSessionDayReminder()); } catch (e) { out.push('dayReminder lỗi: ' + e.message); }
  try { out.push(hubDailyReminder()); } catch (e) { out.push('deadline lỗi: ' + e.message); }
  if (new Date().getDay() === 1) { try { out.push(hubWeeklyDigest()); } catch (e) { out.push('weekly lỗi: ' + e.message); } }
  Logger.log(out.join('\n'));
  return out.join('\n');
}

/** Cài trigger: 8:30 hằng ngày (nhắc lịch, nhắc hạn, thứ Hai nhắc tuần) + dọn dữ liệu Chủ nhật */
function caiDatNhacViecTuDong() {
  var want = {hubDailyReminder:true, hubCleanupTokens:true, hubMorningJobs:true};
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (want[t.getHandlerFunction()]) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hubMorningJobs').timeBased().everyDays(1).atHour(8).nearMinute(30).create();
  ScriptApp.newTrigger('hubCleanupTokens').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
  var msg = '✔ Đã cài trigger: 8:30 hằng ngày (nhắc lịch ngày đào tạo, nhắc hạn bài kiểm tra; thứ Hai nhắc bài chưa hoàn thành), dọn dữ liệu Chủ nhật 2:00.';
  Logger.log(msg);
  return msg;
}

// ---------- ★ v3.0 — Chế độ Test: chạy thử nhắc việc & xoá dữ liệu ----------

function apiTestJobs(p, user) {
  if (!HUB_CTX.test) return {ok:false, error:'Chỉ chạy được trong Chế độ Test.'};
  var kind = hubNorm(p.kind), msg;
  if (kind === 'day') {
    var sid = hubNorm(p.sid);
    if (!sid) { var up = hubReadSessions().filter(function(s){ return s.status !== 'Cancel'; }); if (!up.length) return {ok:false, error:'Chưa có buổi test nào — tạo buổi test trước.'}; sid = up[up.length - 1].sid; }
    msg = hubSessionDayReminder(sid);
  } else if (kind === 'weekly') {
    msg = hubWeeklyDigest(user);
    if (/đã gửi 0/.test(msg)) msg = 'Bạn chưa có bài kiểm tra test nào đang mở mà chưa đạt — tạo & phát hành 1 bài kiểm tra test trước.';
  } else return {ok:false, error:'Loại chạy thử không hợp lệ.'};
  return {ok:true, message: msg + ' (Chế độ Test: email chỉ gửi tới ' + hubMailOf(user.email) + ')'};
}

/** Xoá toàn bộ dữ liệu test (buổi, ghi danh, tiến độ, thông báo, câu hỏi, bài làm). trash=1 → chuyển thư mục buổi test vào thùng rác */
function apiTestReset(p, user) {
  HUB_CTX.test = true; HUB_CTX.tester = user;
  return hubWithLock(function(){
    var n = {sessions:0, rows:0, folders:0};
    var sh = hubTestSheet(), last = sh.getLastRow();
    if (hubBool(p.trash)) {
      hubReadSessionsRaw().forEach(function(s){ var id = hubDriveIdFromUrl(s.folderUrl); if (id) { try { DriveApp.getFolderById(id).setTrashed(true); n.folders++; } catch (e) {} } });
    }
    if (last >= HUB.DATA_START_ROW) { n.sessions = last - HUB.DATA_START_ROW + 1; sh.getRange(HUB.DATA_START_ROW, 1, n.sessions, sh.getMaxColumns()).clearContent(); }
    var purge = function(sheet, col, width){
      var L = sheet.getLastRow(); if (L < 2) return;
      var vals = sheet.getRange(2, 1, L - 1, width).getValues();
      var keep = vals.filter(function(r){ return !hubIsTestSid(r[col]); });
      if (keep.length === vals.length) return;
      n.rows += vals.length - keep.length;
      sheet.getRange(2, 1, L - 1, width).clearContent();
      if (keep.length) sheet.getRange(2, 1, keep.length, width).setValues(keep);
    };
    purge(hubEnrollSheet(), 0, HUB_ENROLL_HEADER.length);
    purge(hubProgressSheet(), 1, HUB_PROG_HEADER.length);
    purge(hubNotiSheet(), 4, HUB_NOTI_HEADER.length);
    purge(hubQSheet(HUB.QUIZ_SHEETS.CONFIG), 0, HUB_QCFG_HEADER.length);
    purge(hubQSheet(HUB.QUIZ_SHEETS.QUESTIONS), 1, HUB_QUES_HEADER.length);
    purge(hubQSheet(HUB.QUIZ_SHEETS.RESPONSES), 1, HUB_RESP_HEADER.length);
    hubCacheClear();
    return {ok:true, message:'Đã xoá dữ liệu test: ' + n.sessions + ' buổi, ' + n.rows + ' dòng liên quan' + (n.folders ? ', ' + n.folders + ' thư mục vào thùng rác' : '') + '.'};
  });
}


// ============================================================================
//  19. CÀI ĐẶT BAN ĐẦU & BẢO TRÌ
// ============================================================================

/** Chạy 1 lần từ trình soạn thảo Apps Script (chạy lại khi nâng cấp cũng an toàn). */
function setupTrainingHub() {
  var report = [];
  var ss = hubSS();
  report.push('✔ File đang dùng: "' + ss.getName() + '"');
  report.push('  ' + ss.getUrl());

  hubUsersSheet();    report.push('✔ Sheet ' + HUB.SHEETS.USERS);
  hubEnrollSheet();   report.push('✔ Sheet ' + HUB.SHEETS.ENROLL);
  hubConfigSheet();   report.push('✔ Sheet ' + HUB.SHEETS.CONFIG);
  hubSheet(HUB.SHEETS.LOG, true); report.push('✔ Sheet ' + HUB.SHEETS.LOG);
  hubNotiSheet();     report.push('✔ Sheet ' + HUB.SHEETS.NOTI + ' (★ mới)');
  hubProgressSheet(); report.push('✔ Sheet ' + HUB.SHEETS.PROGRESS + ' (★ mới)');
  hubReportSheet();   report.push('✔ Cột T–X trên "' + HUB.SHEETS.REPORT + '"');

  // Nạp danh bạ
  var added = 0, updated = [], sh = hubUsersSheet();
  HUB_DIRECTORY.forEach(function(d){
    var existing = hubFindUser(d.email);
    if (existing) {
      if (existing.role !== 'admin' && existing.role !== d.role && d.role !== 'admin') {
        hubUpdateUserFields(d.email, {role: d.role});
        updated.push(d.name + ': ' + existing.role + ' → ' + d.role);
      }
      if (!existing.manager || !existing.position) {
        hubUpdateUserFields(d.email, {
          manager: existing.manager || hubMailOf(d.manager),
          position: existing.position || d.position,
          dept: existing.dept || d.dept
        });
      }
      return;
    }
    sh.appendRow([hubMailOf(d.email), d.name, d.role, d.dept, d.position, hubMailOf(d.manager), '', true, new Date(), '']);
    hubCacheClear('users');
    added++;
  });
  hubCacheClear('users');
  report.push('✔ Danh bạ: thêm mới ' + added + ' người (tổng ' + hubReadUsers().length + ')');
  if (updated.length) report.push('✔ Cập nhật vai trò: ' + updated.join('; '));

  var qf = hubQuizFile();
  hubEnsureQuizSheets(qf);
  report.push('✔ File "' + HUB.QUIZ_FILE_NAME + '" (đã bổ sung cột Deadline, Note): ' + qf.getUrl());

  try {
    DriveApp.getFolderById(HUB.DRIVE.PARENT).getName();
    DriveApp.getFolderById(HUB.DRIVE.CERTIFICATE).getName();
    for (var c in HUB.DRIVE.CATEGORY) DriveApp.getFolderById(HUB.DRIVE.CATEGORY[c]).getName();
    report.push('✔ Truy cập được toàn bộ folder Drive');
  } catch (e) { report.push('✘ Lỗi Drive: ' + e.message); }

  try {
    var tr = DriveApp.getFolderById(HUB.TEST.FOLDER);
    var tf = tr.createFile(Utilities.newBlob('ok', 'text/plain', '_hub_write_test.txt')); tf.setTrashed(true);
    report.push('✔ Thư mục Test: "' + tr.getName() + '" (ghi được)');
  } catch (e) { report.push('✘ Thư mục Test: tài khoản ' + hubRunnerEmail() + ' chưa có quyền Chỉnh sửa → chia sẻ thư mục Test cho tài khoản này.'); }
  try { report.push('✔ Thư mục bản xem trước: ' + hubPreviewFolder().getName()); }
  catch (e) { report.push('✘ Không tạo được thư mục xem trước: ' + e.message); }

  hubCacheClear();
  var n = hubReadSessions().length;
  report.push('✔ Đã gán Session ID cho ' + n + ' buổi đào tạo');

  try { report.push(caiDatNhacViecTuDong()); }
  catch (e) { report.push('✘ Chưa cài được trigger nhắc việc: ' + e.message + ' → chạy kiemTraQuyen()'); }

  try { MailApp.getRemainingDailyQuota(); report.push('✔ Quyền gửi email: OK'); }
  catch (e) { report.push('✘ THIẾU QUYỀN GỬI EMAIL — chạy hàm kiemTraQuyen() để cấp quyền.'); }

  var msg = 'DONE — MMH TRAINING HUB v' + HUB.VERSION + '\n\n' + report.join('\n') +
            '\n\nBước cuối: Deploy → Manage deployments → Edit → Version: New version → Deploy.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/** ★ v2.2 — Chẩn đoán: đo thời gian đọc từng nguồn dữ liệu (Admin) */
function apiDiag(p, user) {
  var steps = [];
  var time = function(label, fn){
    var t = Date.now(), ok = true, note = '';
    try { var r = fn(); note = r === undefined ? '' : String(r); } catch (e) { ok = false; note = e.message; }
    steps.push({step: label, ms: Date.now() - t, ok: ok, note: note.substring(0, 160)});
  };
  time('Bộ nhớ đệm (ghi/đọc thử)', function(){
    var k = 'diag_' + Date.now(); hubSC().put(k, 'x'.repeat(20000), 60);
    return hubSC().get(k) ? 'hoạt động' : 'KHÔNG đọc lại được — đệm không hoạt động';
  });
  time('Sheet Training Report (đọc mới)', function(){ return hubReadSessionsRaw().length + ' buổi'; });
  time('File câu hỏi (đọc mới)', function(){ return hubReadQuizConfigAllRaw().length + ' bài KT'; });
  time('Danh sách tham dự (đọc mới)', function(){ return hubReadEnrollmentRaw().length + ' dòng'; });
  time('Người dùng (đọc mới)', function(){ return hubReadUsersRaw().length + ' người'; });
  var sid = hubNorm(p.sid);
  if (!sid) { var ss = hubReadSessions().filter(function(x){ return x.folderUrl; }); sid = ss.length ? ss[0].sid : ''; }
  if (sid) {
    var s = hubFindSession(sid);
    time('Tài liệu buổi ' + sid + ' (Drive API)', function(){ var src = hubSessionSource(s); if (!src || !src.folder) return 'không có thư mục'; var r = hubMaterialsApi(src.folder); return r.files.length + ' file, ' + r.folders.length + ' thư mục'; });
  }
  var quota = null; try { quota = MailApp.getRemainingDailyQuota(); } catch (e) {}
  var running = hubRunning().filter(function(r){ return r.action !== 'diag'; });
  var stuck = running.filter(function(r){ return r.sec > 30; });
  steps.push({step: 'Lượt gọi đang chạy dở', ms: 0, ok: stuck.length === 0,
    note: running.length ? running.slice(0, 6).map(function(r){ return r.action + (r.sid ? ' ' + r.sid : '') + ' ' + (r.sec > 360 ? '(đã bị Google cắt sau 6 phút)' : r.sec + 's'); }).join(' · ') : 'không có'});
  return {ok:true, version:HUB.VERSION, steps:steps, running:running, mailQuota:quota, total: steps.reduce(function(a, x){ return a + x.ms; }, 0)};
}

/** ★ v2.5 — Chạy thử các chức năng NGAY TRÊN MÁY CHỦ và báo kết quả gọn nhẹ.
 *  Dùng khi trình duyệt không nhận được phản hồi của 1 chức năng: nếu ở đây chạy
 *  bình thường → lỗi nằm ở đường truyền (tường lửa / giới hạn Google); nếu báo lỗi
 *  hay chạy quá lâu → lỗi nằm trong xử lý. */
function apiSelfTest(p, user) {
  var sid = hubNorm(p.sid);
  var out = [];
  var run = function(name, fn){
    var t = Date.now(), r = null, err = '';
    try { r = fn(); } catch (e) { err = (e && e.message) || String(e); }
    var ms = Date.now() - t, size = 0, odd = 0;
    try { var j = JSON.stringify(r); size = j.length; odd = (j.match(/[\u2028\u2029\ud800-\udfff]/g) || []).length; } catch (e) { err = err || ('Không đóng gói được JSON: ' + e.message); }
    out.push({name: name, ms: ms, ok: !err && !!r && r.ok !== false, size: size, oddChars: odd,
              error: err || (r && r.ok === false ? r.error : '')});
  };
  run('Thông tin tài khoản (me)', function(){ return apiMe(p, user); });
  run('Danh sách buổi (listSessions)', function(){ return apiListSessions(p, user); });
  if (sid) {
    run('Trang buổi đào tạo (sessionFull)', function(){ return apiSessionFull({sid: sid}, user); });
    run('Trạng thái bài kiểm tra (myQuizStatus)', function(){ return apiMyQuizStatus({sid: sid}, user); });
    if (hubBool(p.withMats)) run('Danh sách tài liệu (listMaterials)', function(){ return apiListMaterials({sid: sid}, user); });
  }
  run('Thông báo (notifications)', function(){ return apiNotifications({}, user); });
  var props = PropertiesService.getScriptProperties().getProperties(), propBytes = 0, propN = 0;
  for (var k in props) { propN++; propBytes += k.length + String(props[k]).length; }
  return {ok:true, version:HUB.VERSION, results:out, running:hubRunning().filter(function(r){ return r.action !== 'selfTest'; }),
          properties:{count:propN, kb:Math.round(propBytes / 1024)}, user:hubPrefix(user.email)};
}

/** ★ v2.2 — Trình duyệt báo lượt gọi thất bại (để Admin xem trong HUB_Log) */
function apiClientLog(p, user) {
  hubLog('CLIENT', hubNorm(p.act).substring(0, 40), hubNorm(p.msg).substring(0, 300) + ' · ' + hubPrefix(user.email), hubNorm(p.detail).substring(0, 400));
  return {ok:true};
}

function apiRunSetup(p, user) {
  return {ok:true, message:setupTrainingHub()};
}

/** Dọn token/OTP/lượt làm bài hết hạn + thông báo cũ hơn 180 ngày */
function hubCleanupTokens() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var now = Date.now(), removed = 0;
  for (var k in all) {
    if (/^(TK_|OTP_|AT_|LF_)/.test(k)) {
      try {
        var v = JSON.parse(all[k]);
        var exp = v.exp || v.until || (v.start ? v.start + (v.limit || 0) + 3600000 : 0);
        if (exp && now > exp) { props.deleteProperty(k); removed++; }
      } catch (e) { props.deleteProperty(k); removed++; }
    } else if (/^UP_/.test(k)) {
      try { if (now - (JSON.parse(all[k]).at || 0) > 3 * 86400000) { props.deleteProperty(k); removed++; } }
      catch (e) { props.deleteProperty(k); removed++; }
    } else if (/^ATU_/.test(k)) {
      if (!all['AT_' + all[k]]) { props.deleteProperty(k); removed++; }
    } else if (/^RM_/.test(k)) {
      var d = k.split('_').pop();
      if (d.length === 8 && Number(d) < Number(hubFmt(new Date(now - 30 * 86400000), 'yyyyMMdd'))) { props.deleteProperty(k); removed++; }
    }
  }
  // thông báo cũ
  try {
    hubWithLock(function(){
      var sh = hubNotiSheet();
      var last = sh.getLastRow();
      if (last < 3) return;
      var dates = sh.getRange(2, 2, last - 1, 1).getValues();
      var cutoff = now - 180 * 86400000, k2 = 0;
      while (k2 < dates.length && dates[k2][0] && new Date(dates[k2][0]).getTime() < cutoff) k2++;
      if (k2 > 0) { sh.deleteRows(2, k2); hubCacheClear('noti'); }
    });
  } catch (e) {}
  Logger.log('Đã dọn ' + removed + ' khoá hết hạn.');
  return removed;
}

/** Menu tiện dụng khi mở file Sheet (chỉ có tác dụng nếu project gắn với Sheet) */
function hubOnOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('🎓 Training Hub')
      .addItem('Cài đặt / nâng cấp hệ thống', 'setupTrainingHub')
      .addItem('Kiểm tra quyền', 'kiemTraQuyen')
      .addItem('Cài nhắc làm bài tự động', 'caiDatNhacViecTuDong')
      .addItem('Chạy thử nhắc làm bài', 'hubDailyReminder')
      .addItem('Dọn phiên hết hạn', 'hubCleanupTokens')
      .addToUi();
  } catch (e) {}
}


// ============================================================================
//  18. ★ v3.4 — CẦU NỐI REPORT HUB (tạo buổi đào tạo & gửi thư mời từ lịch Report Hub)
// ----------------------------------------------------------------------------
//  Report Hub không đăng nhập Training Hub (không có token) ⇒ các action rh*
//  kiểm tra: (1) khoá kết nối rhKey, (2) người thao tác (actor = tên PIC trên
//  Report Hub) phải là Admin / Director / HOD / Team Leader / Manager trong
//  sheet HUB_Users (cột Position).
//  Luồng: rhMeta → rhSaveSession (KHÔNG tạo thư mục) → rhSendInvite (tạo thư
//  mục nếu chưa có ⇒ gửi email kèm link thư mục). rhEnsureFolder dùng cho nút
//  "Soạn bằng Gmail" (tạo thư mục rồi trả nội dung để mở Gmail).
// ============================================================================

/** Tên PIC trên Report Hub khác tên trong HUB_Users → prefix email */
var RH_PIC_ALIAS = { viet:'mmh.hanoi', minhviet:'mmh.hanoi', nguyenha:'nt.ha', damha:'mmh.backoffice', damviet:'mmh.order', minhtrang:'mmh.admin' };
var RH_LEAD_RE = /(leader|lead\b|hod|head|director|manager|giam doc|truong)/i;

function hubRhIsLead(u) {
  return !!u && (u.role === 'admin' || RH_LEAD_RE.test(hubDeaccent(u.position || '')));
}

/** Kiểm tra khoá + tìm người dùng Training Hub ứng với PIC Report Hub */
function hubRhKeyOk(p) {
  var key = '';
  try { key = PropertiesService.getScriptProperties().getProperty('RH_BRIDGE_KEY') || ''; } catch (e) {}
  key = key || HUB.RH_BRIDGE_KEY;
  if (!key || hubNorm(p.rhKey) !== key) throw new Error('Report Hub: khoá kết nối Training Hub không đúng (RH_BRIDGE_KEY).');
}

function hubRhActor(p, needLead) {
  var key = '';
  try { key = PropertiesService.getScriptProperties().getProperty('RH_BRIDGE_KEY') || ''; } catch (e) {}
  key = key || HUB.RH_BRIDGE_KEY;
  if (!key || hubNorm(p.rhKey) !== key) throw new Error('Report Hub: khoá kết nối Training Hub không đúng (RH_BRIDGE_KEY).');
  var a = hubNorm(p.actor);
  // ★ v3.12 — đã đăng nhập bằng email: lấy danh tính từ phiên, không tin tên do trình duyệt tự khai
  if (hubNorm(p.tk)) {
    var ck = rhCheck(p.tk);
    if (ck.u) {
      var tu = hubFindUser(ck.u.local + '@' + HUB.SEND_DOMAIN);
      if (!tu && RH_PIC_ALIAS[hubKeyV(ck.u.pic)]) tu = hubFindUser(RH_PIC_ALIAS[hubKeyV(ck.u.pic)]);
      if (tu && tu.active) {
        if (a && hubKeyV(a) !== hubKeyV(ck.u.pic)) hubLog('WARN', 'rhActor', 'actor "' + a + '" khác phiên đăng nhập (' + ck.u.pic + ')', p.action || '');
        if (needLead && !hubRhIsLead(tu)) throw new Error('Chỉ Team Leader / Manager / Director được tạo buổi đào tạo từ Report Hub.');
        return tu;
      }
      a = ck.u.pic;
    }
  }
  if (!a) throw new Error('Report Hub: thiếu tên người thao tác.');
  var users = hubReadUsers(), u = null, k = hubKeyV(a);
  if (a.indexOf('@') > 0) u = hubFindUser(a);
  if (!u && RH_PIC_ALIAS[k]) u = hubFindUser(RH_PIC_ALIAS[k]);
  if (!u) for (var i = 0; i < users.length; i++) if (hubKeyV(users[i].name) === k) { u = hubFindUser(users[i].email); break; }
  if (!u || !u.active) throw new Error('Không tìm thấy "' + a + '" trong danh sách người dùng Training Hub (HUB_Users).');
  if (needLead && !hubRhIsLead(u)) throw new Error('Chỉ Team Leader / Manager / Director được tạo buổi đào tạo từ Report Hub.');
  return u;
}

/** Chống gửi trùng khi Report Hub bấm lại (cùng mã rid) */
function hubRhOnce(p, fn) {
  var rid = hubNorm(p.rid), sc = hubSC(), k = rid ? 'rh:' + p.action + ':' + rid : '';
  if (k) { try { var hit = sc.get(k); if (hit) { var o = JSON.parse(hit); o.repeated = true; return o; } } catch (e) {} }
  var res = fn();
  if (k && res && res.ok) { try { sc.put(k, JSON.stringify(res), 21600); } catch (e) {} }
  return res;
}

/** Danh mục cho form tạo buổi trên Report Hub */
function apiRhMeta(p) {
  var u = hubRhActor(p, false);
  var meta = hubMasterMeta();
  var users = hubReadUsers().filter(function(x){ return x.active; }).map(function(x){
    return {name:x.name, email:x.email, dept:x.dept, position:x.position};
  });
  var groups = hubGroupList().map(function(g){ return {name:g.name, type:g.type, emails:g.emails, count:g.count}; });
  return {ok:true, me:{name:u.name, email:u.email, position:u.position, canCreate:hubRhIsLead(u)},
          meta:{categories:meta.categories, types:meta.types, trainers:meta.trainers}, groups:groups, users:users,
          appUrl:hubAppUrl()};
}

/** Tạo / sửa buổi đào tạo — KHÔNG tạo thư mục (thư mục tạo khi gửi email) */
function apiRhSaveSession(p) {
  var u;
  if (hubNorm(p.sid)) { u = hubRhSessionFor(p).u; }            // ★ v3.8 — sửa buổi: chỉ người tạo / trainer
  else u = hubRhActor(p, true);                                   // tạo mới: Team Leader / Manager / Director
  return hubRhOnce(p, function(){
    var q = {};
    ['sid','topic','purpose','date','timeFrom','timeTo','category','type','trainer','audience','meetingLink'].forEach(function(k){ if (p[k] !== undefined) q[k] = p[k]; });
    if (!hubNorm(p.sid)) q.status = 'Plan';
    else if (hubNorm(p.status)) q.status = p.status;
    q.createFolder = '0';
    if (!hubNorm(q.date)) return {ok:false, error:'Vui lòng chọn ngày đào tạo.'};
    var lead = hubCopy(u); lead.role = 'admin';          // Leader tạo được buổi cho trainer khác
    var r = apiSaveSession(q, lead);
    if (r && r.ok) {
      if (!hubNorm(p.sid)) { try { PropertiesService.getScriptProperties().setProperty('RHC_' + r.sid, hubPrefix(u.email)); } catch (e) {} }
      hubLog('INFO', 'rhSaveSession', r.sid + ' by ' + u.email + ' (Report Hub)', hubNorm(p.topic));
    }
    return r;
  });
}

function hubRhSession(p) {
  hubCacheClear('sessions');
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) throw new Error('Không tìm thấy buổi đào tạo ' + hubNorm(p.sid) + '.');
  return s;
}

/** Tạo thư mục tài liệu cho buổi (nếu chưa có) → GHI + KIỂM TRA link ở ô Training Folder → trả về buổi đã cập nhật */
function hubRhFolder(s) {
  if (s.folderUrl) return {s:s, created:false, written:true};
  var res = hubWithLock(function(){
    var sh = hubReportSheet(), C = HUB.COL;
    var parent = hubCategoryFolder(s.category);
    var name = hubFolderName(s.date, s.type, s.category, s.audience);
    var it = parent.getFoldersByName(name);
    var folder = it.hasNext() ? it.next() : parent.createFolder(name);
    hubApplySharing(folder);
    var url = folder.getUrl(), cell = sh.getRange(s.row, C.FOLDER), err = '';
    var has = function(){
      try { SpreadsheetApp.flush(); } catch (e) {}
      return !!(hubUrlFromRichText(cell.getRichTextValue()) || hubUrlFromFormula(cell.getFormula()) || /^https?:\/\//i.test(hubNorm(cell.getValue())));
    };
    try { cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build()); } catch (e) { err = e.message; }
    if (!has()) { try { cell.setValue(url); } catch (e2) { err = err || e2.message; } }
    var ok = has();
    if (!ok) hubLog('ERROR', 'rhFolderWrite', s.sid + ' row ' + s.row + ' — không ghi được link vào ô ' + cell.getA1Notation(), err || '(không rõ — kiểm tra bảo vệ ô / data validation)');
    hubCacheClear('sessions');
    return {id:folder.getId(), name:name, url:url, written:ok, err:err, cell:cell.getA1Notation()};
  });
  hubCacheClear('mats:' + s.sid);
  hubLog('INFO', 'rhFolder', s.sid + ' -> ' + res.name + (res.written ? '' : ' (CHƯA ghi được vào sheet)'), res.url);
  var s2 = hubFindSession(s.sid) || s;
  if (!s2.folderUrl) s2.folderUrl = res.url;
  return {s:s2, created:true, folder:res, written:res.written,
          warn: res.written ? '' : ('Đã tạo thư mục nhưng KHÔNG ghi được link vào ô ' + res.cell + ' của sheet Training Report' + (res.err ? ' (' + res.err + ')' : '') + ' — kiểm tra bảo vệ ô / data validation cột Training Folder.')};
}

function hubRhInviteOpt(p, s, pending) {
  return {kind:'pre', subject:p.subject, note:p.note,   // appUrl: luôn dùng link Training Hub (không lấy link Report Hub)
          folderUrl:s.folderUrl, folderPending:pending && !s.folderUrl};
}

/** ★ v3.8 — chỉ NGƯỜI TẠO buổi (từ Report Hub) hoặc TRAINER của buổi được thao tác */
function hubRhCreator(sid) { try { return PropertiesService.getScriptProperties().getProperty('RHC_' + hubNorm(sid)) || ''; } catch (e) { return ''; } }
function hubRhCanSession(u, s) {
  if (!u || !s) return false;
  if (hubIsTrainerOf(s.trainer, u)) return true;
  var c = hubRhCreator(s.sid);
  return !!c && c === hubPrefix(u.email);
}
function hubRhSessionFor(p) {
  var u = hubRhActor(p, false), s = hubRhSession(p);
  if (!hubRhCanSession(u, s)) throw new Error('Buổi đào tạo này không do bạn tạo / phụ trách — chỉ xem được, không sửa, gửi thư mời hay thêm tài liệu.');
  return {u:u, s:s};
}

function apiRhPreviewInvite(p) {
  var x = hubRhSessionFor(p), u = x.u, s = x.s;
  var c = hubInviteContent(s, u, hubRhInviteOpt(p, s, true));
  var rec = hubInviteRecipients(s, {recipients: hubRhRecipients(p, s)});
  return {ok:true, subject:c.subject, html:c.html, text:c.text, recipients:rec,
          quota:(function(){ try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; } })()};
}

/** Người nhận: nhóm và/hoặc cá nhân (tên nhóm, tên người, email) → email */
function hubRhRecipients(p, s) {
  var items = hubList(p.recipients);
  var out = [];
  items.forEach(function(it){ out = out.concat(hubResolveAudience(it)); });
  if (!items.length) out = hubResolveAudience(s.audience);
  return hubUniq(out.map(hubMailOf));
}

/** Gửi thư mời: tạo thư mục (nếu chưa có) rồi gửi email kèm link thư mục */
function apiRhSendInvite(p) {
  var x0 = hubRhSessionFor(p), u = x0.u;
  return hubRhOnce(p, function(){
    var s = x0.s;
    var f = hubRhFolder(s); s = f.s;
    var lead = hubCopy(u); lead.role = 'admin';
    var q = {sid:s.sid, kind:'pre', recipients:hubRhRecipients(p, s), cc:p.cc, ccMe:p.ccMe,
             subject:p.subject, note:p.note, folderUrl:s.folderUrl};
    var r = apiSendInvite(q, lead);
    if (r && r.ok) {
      r.folderUrl = s.folderUrl;
      r.folderCreated = f.created;
      if (f.warn) r.warn = f.warn;
      r.message = r.message.replace(/\.$/, '') + (f.created ? ' · đã tạo thư mục tài liệu' : '') + '.';
      hubLog('INFO', 'rhSendInvite', s.sid + ' by ' + u.email + ' (Report Hub)', s.folderUrl);
    }
    return r;
  });
}

/** Cho nút "Soạn bằng Gmail": tạo thư mục, trả nội dung email (đã có link thư mục) */
function apiRhEnsureFolder(p) {
  var x = hubRhSessionFor(p), u = x.u, s = x.s;
  var f = hubRhFolder(s); s = f.s;
  var c = hubInviteContent(s, u, hubRhInviteOpt(p, s, false));
  return {ok:true, folderUrl:s.folderUrl, folderCreated:f.created, warn:f.warn || '', subject:c.subject, text:c.text,
          recipients:hubRhRecipients(p, s)};
}

/** ★ v3.5 — Danh sách buổi đào tạo trong khoảng ngày (cho lịch Report Hub).
 *  people = tên trainer + tên học viên (theo HUB_Users) để Report Hub lọc theo nhân sự. */
function apiRhSessions(p) {
  hubRhKeyOk(p);
  var actor = null;
  try { if (hubNorm(p.actor)) actor = hubRhActor(p, false); } catch (e) {}
  var from = hubNorm(p.from), to = hubNorm(p.to);
  var nameOf = {};
  hubReadUsers().forEach(function(u){ nameOf[hubPrefix(u.email)] = u.name; });
  var out = [];
  hubReadSessions().forEach(function(s){
    if (!s.date || s.status === 'Cancel') return;
    if ((from && s.date < from) || (to && s.date > to)) return;
    var people = hubResolveAudience(s.audience).map(function(e){ return nameOf[hubPrefix(e)] || hubPrefix(e); });
    hubNorm(s.trainer).split(/[,;\/&+\n]/).forEach(function(t){ t = hubNorm(t); if (t) people.push(t); });
    out.push({sid:s.sid, date:s.date, timeFrom:s.timeFrom, timeTo:s.timeTo, topic:s.topic, purpose:s.purpose,
              category:s.category, type:s.type, trainer:s.trainer, audience:s.audience, status:s.status,
              folderUrl:s.folderUrl, meetingLink:s.meetingLink, recordLink:s.recordLink, invited:s.preSent,
              quizStatus:s.quizStatus, completion:s.completion, people:hubUniq(people),
              canEdit:actor ? hubRhCanSession(actor, s) : false});
  });
  out.sort(function(a, b){ return (a.date + (a.timeFrom || '')).localeCompare(b.date + (b.timeFrom || '')); });
  return {ok:true, sessions:out, appUrl:hubAppUrl()};
}

/** ★ v3.7 — Danh sách tài liệu của buổi (ai có khoá Report Hub đều xem được) */
function apiRhMaterials(p) {
  var u = hubRhActor(p, false), s = hubRhSession(p);
  if (hubBool(p.fresh)) hubCacheClear('mats:' + s.sid);
  var m = hubMaterials(s);
  // ★ v3.11 — mọi người trong công ty mở / tải được: chia sẻ thư mục + file chưa chia sẻ (6 giờ làm 1 lần / buổi)
  try {
    var shareKey = 'rhshare:' + s.sid;
    if (m && m.folderId && !m.noAccess && !hubSC().get(shareKey)) {
      hubApplySharing(DriveApp.getFolderById(m.folderId));
      var n = 0;
      (m.files || []).forEach(function(f){
        if (f.linkShared || n >= 40) return;
        try { hubApplySharing(DriveApp.getFileById(f.id)); f.linkShared = true; n++; } catch (e) {}
      });
      if (n) hubCacheClear('mats:' + s.sid);
      hubSC().put(shareKey, '1', 21600);
    }
  } catch (e) { hubLog('WARN', 'rhShare', s.sid, e.message); }
  return {ok:true, files:(m.files || []).slice(0, 200), folderUrl:m.folderUrl || s.folderUrl || '', folderName:m.folderName || '',
          pending:!!m.pending, noAccess:!!m.noAccess, message:m.message || '', canUpload:hubRhCanSession(u, s),
          chunkSize:HUB.UPLOAD_CHUNK, maxMb:HUB.UPLOAD_MAX_MB};
}
/** Người thao tác dưới quyền trainer của buổi (giữ đúng email để phiên tải lên khớp người gửi) */
function hubRhUploader(p) {
  var x = hubRhSessionFor(p), lead = hubCopy(x.u);
  lead.role = 'admin';
  return lead;
}
function apiRhUploadInit(p)   { var u = hubRhUploader(p); var r = apiUploadInit(p, u); if (r && r.ok) { hubCacheClear('sessions'); try { hubSC().remove('rhchk:' + hubPrefix(u.email)); } catch (e) {} } return r; }
function apiRhUploadChunk(p)  { var u = hubRhActor(p, false); return apiUploadChunk(p, u); }
function apiRhUploadStatus(p) { var u = hubRhActor(p, false); return apiUploadStatus(p, u); }

/** ★ v3.10 — Thư mục có ít nhất 1 file (quét tối đa 2 cấp thư mục con) */
function hubRhHasFile(folder, depth) {
  try {
    if (folder.getFiles().hasNext()) return true;
    if (depth <= 0) return false;
    var it = folder.getFolders(), n = 0;
    while (it.hasNext() && n < 15) { n++; if (hubRhHasFile(it.next(), depth - 1)) return true; }
  } catch (e) {}
  return false;
}
/** ★ v3.10 — Buổi đào tạo của người thao tác (người tạo / trainer) đã kết thúc trong 90 ngày,
 *  thư mục tài liệu còn TRỐNG hoặc chưa có. Hạn hoàn thành = 1 ngày sau buổi học. Đệm 10 phút / người. */
function apiRhMyChecks(p) {
  var u = hubRhActor(p, false);
  var key = 'rhchk:' + hubPrefix(u.email), sc = hubSC();
  if (!hubBool(p.fresh)) { try { var hit = sc.get(key); if (hit) return JSON.parse(hit); } catch (e) {} }
  var today = hubFmt(new Date(), 'yyyy-MM-dd');
  var from = hubFmt(new Date(Date.now() - 90 * 86400000), 'yyyy-MM-dd');
  var list = hubReadSessions().filter(function(s){
    return s.date && s.date < today && s.date >= from && s.status !== 'Cancel' && hubRhCanSession(u, s);
  }).sort(function(a, b){ return a.date < b.date ? 1 : -1; }).slice(0, 25);
  var out = [];
  list.forEach(function(s){
    var src = null; try { src = hubSessionSource(s); } catch (e) {}
    if (src && src.noAccess) return;                         // không đọc được thư mục ⇒ bỏ qua, không báo sai
    var has = !!(src && (src.file || (src.folder && hubRhHasFile(src.folder, 2))));
    if (has) return;
    var due = hubFmt(new Date(hubToDate(s.date).getTime() + 86400000), 'yyyy-MM-dd');
    out.push({sid:s.sid, topic:s.topic, date:s.date, due:due, overdue:today > due, noFolder:!(src && src.folder),
              folderUrl:s.folderUrl || (src && src.folder ? src.folder.getUrl() : ''), trainer:s.trainer});
  });
  var res = {ok:true, today:today, empty:out};
  try { sc.put(key, JSON.stringify(res), 600); } catch (e) {}
  return res;
}

