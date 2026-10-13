# mmh-backend — quy tắc cho Claude

Kho riêng tư chứa code Apps Script của **mọi app** MMH (đầu tiên: 7 backend của `ManiMedicalHanoi/MMH-Report`;
`backends.json` ▸ `apps` ghi app nào dùng backend nào). Quy trình đầy đủ: skill `gh-webapp-upgrader` ▸ `references/backend-deploy.md`.
Người dùng là nhân sự MANI Medical Hanoi, không rành kỹ thuật — **trả lời bằng tiếng Việt**.

- Sửa backend = sửa file trong `backends/<key>/` → PR → squash merge `main` ⇒ workflow **Deploy backend** tự deploy
  (cập nhật deployment cũ, URL không đổi). Không gửi file `.gs` cho người dùng dán tay nữa.
- Trước khi sửa: đảm bảo `backends/<key>/` là bản mới nhất. Deploy báo "sửa trực tiếp" ⇒ chạy workflow **Kéo code về**
  (input `backend=<key>`), đợi commit của bot, rồi áp lại thay đổi trên bản mới.
- Không đổi mục `webapp` trong `appsscript.json` (bị chặn). Không tạo deployment mới.
- Thêm app mới: README ▸ "Thêm backend của một app khác" (`tools/scan-app.mjs`).
- Backend dùng chung nhiều app (vd. Training Hub): sửa phải giữ tương thích cho mọi app trong `apps`.
- Trước khi push: `node tools/syntax.mjs`; sửa `tools/` thì chạy thêm `node tools/selftest.mjs`.
- Sau khi gộp: xem kết quả workflow Deploy; đỏ ⇒ đọc log, sửa, gộp lại. Gọi thử lỗi thì web app đã tự quay về phiên bản
  trước — vẫn phải sửa code trong repo.
- Thay đổi backend kèm thay đổi app: gộp backend **trước**, đợi Deploy xanh, rồi mới gộp frontend.
- Việc còn dở / đã hứa: `TODO.md` — đọc trước khi bắt đầu.
- `script.google.com` bị chặn trong môi trường Claude; GitHub Actions thì gọi được.
- **Email gửi đi luôn dùng miền `@manimedicalhanoi.com`** (người dùng yêu cầu 08/10/2026 — `@mani.inc` hay bị chặn / vào spam): mỗi backend có
  `MMH_MailDomain.gs` (`mmhMail_` / `mmhGmail_` / `mmhAddr_`) — **không gọi `MailApp.sendEmail` / `GmailApp.sendEmail` trực tiếp**, dùng `mmhMail_`.
  Training Hub `SEND_DOMAIN = 'manimedicalhanoi.com'`. Đăng nhập vẫn nhận cả 2 miền. Marketing áp dụng từ 10/10/2026.
- **Công tác — `MMH_TripFlow.gs` (10/10/2026)**: file GIỐNG HỆT NHAU ở mọi backend có đề xuất công tác (sửa 1 nơi ⇒ chép sang nơi khác).
  Email xin duyệt / phê duyệt / từ chối đúng mẫu hệ thống Business Trip; người duyệt = Giám đốc (`TF.DIRECTOR`). File Business Trip vẫn là
  file gốc (duyệt, folder, Business Trip Report); mỗi backend ghi thêm nhật ký tab **"Business Trip Log"** trong bảng tính của chính nó.
  `tfDecide` chỉ nhận phiên email Director — kiểm chữ ký bằng `RH_Secret` của Training Master (đọc qua Spreadsheet, KHÔNG dùng UrlFetch ⇒
  không thêm quyền mới). App gửi `tk` trong thân lệnh POST (CRM đọc JSON body, không đọc tham số URL).
  `tfTrips` (v1.1): lịch công tác của danh sách PIC đọc thẳng file Business Trip — CRM dùng thay cho bản sao trong file MKT (Sales Team không đồng bộ vào MKT nữa).
- **"Ai về nhà đấy" (10/10/2026)**: dữ liệu Sales Team (Dental / Surgical / Eyeless) không nằm trong file MKT. `MMH_SalesTasks.gs` (giống hệt ở 3 CRM VN):
  Công việc khác ở sheet **ALL TASK** của file CRM nhóm (header hàng 5, dữ liệu hàng 7; API như Report Hub, chỉ nhận khi `at=1`; `atImport` chống trùng theo
  tên + PIC + ngày bắt đầu). Marketing `MMH_SalesMove.gs`: `VS_MOVED` ⇒ `vsSync` chỉ dọn dòng lịch đi địa bàn đã chép (cột U `V:` / `VK:`), đơn hàng `O:` giữ nguyên;
  `salesTasksDrop` xoá key task Sales đã chuyển (khớp tên + PIC + ngày, bỏ qua dòng đồng bộ, cần phiên email).
- **Hướng dẫn sử dụng hệ thống (IFU, 12/10/2026)**: thư mục `ifu/` dựng sách PDF (CRM · Report Hub · KPI · Training Hub) từ `ifu/chapters/*.md` + ảnh `ifu/shots/` (dữ liệu giả); phiên bản, link backend, lịch sử cập nhật tự đọc lúc dựng. Tính năng / giao diện đổi ⇒ sửa chương + chụp lại ảnh, `node build.mjs all` (xem `ifu/README.md`). PDF có link tới Sheet thật ⇒ chỉ chia sẻ nội bộ.
- **Chế độ TEST của Admin — `MMH_TestMode.gs` (13/10/2026)**: file GIỐNG HỆT NHAU ở crm-dental / surgical / eyeless / thai, management, backoffice, marketing, kpi, training
  (sửa 1 nơi ⇒ chép sang nơi khác). App gửi `tm=1` + phiên email Admin (`tk`), người dùng = `TEST` ⇒ ghi THẬT, tên / PIC bắt đầu "TEST" (ảnh `TEST_<ngày>_…`).
  `tmBegin_(p, e)` đầu mỗi lượt (không phải Admin ⇒ từ chối), `tmScrub_` trong `reply` (ẩn phần tử pic / account / assigner "TEST…" với mọi người khác,
  lượt TEST thì gắn `_tm.mails`), `tmKeep_` lọc ở `readTab` / `naReadAll_` (TEST không vào báo cáo / KPI của người thật). Email: `mmhMail_` gọi `tmMailHook_` ⇒
  chỉ tới Admin, tiêu đề `[TEST]`, bỏ CC/BCC. Vai `tmAs=dir|mgr`: duyệt CHỈ hồ sơ TEST (`tfDecide`, `naCanDecide_`). `tmClean`: xoá nội dung dòng PIC TEST (giữ công thức,
  không xoá dòng), dòng TEST file Business Trip + folder, file Drive "TEST_…" trong folder của backend. Tham số `tm` (KHÔNG dùng `test` — Training Hub đã dùng `test=1`).
- **Coaching (13/10/2026, training `RH_CustTrain.gs`)**: Training Type "Coaching" (Master!C5, nâng cấp 1 lần tự chạy — Script Property `HUB_MIG_VER`).
  Thư mục buổi nằm trong thư mục mẹ "Coaching" (`HUB_COACHING_FOLDER`); bằng chứng = **PDF trong thư mục con `Review`** (upload `rhUploadInit` path `["Review"]`, chỉ nhận PDF).
  Chuyển Completed khi Review/ chưa có PDF ⇒ `saveSession` / `rhSaveSession` từ chối. `rhCoachReview` (op=status&sid) ⇒ `{files, hasPdf}`.
  KSC đếm C3-10 / C3-11 (Trainer = PIC dòng KPI) chỉ khi có PDF (`kscCoachPdf_`, đệm CacheService).
- **Đào tạo khách hàng T&E từ CRM — `rhCustTrain`** (training, rhKey + phiên `tk`, mọi sales; Admin / Director / HOD / lead xem cả nhóm): `op=list|save|delete`
  (hợp đồng ở đầu `RH_CustTrain.gs`). Dòng Training Report: External · Category "Customer Training" · Trainer = PIC + cột cuối `T&E Team/Product/Place/Target/Actual/Review/Audience (JSON)`.
  Completed cần Actual > 0 + review đủ 5 dòng mẫu (VN/EN). `tm=1` ⇒ ghi sheet `HUB_TestSessions` (SID `TEST-`, Topic `[TEST]`). KSC đếm C10-03/04/05 (Viet/Vinh/Phuong = PIC dòng KPI).
- **Tab KPI theo nhóm do KSC ghi lại mỗi lượt đồng bộ (`kpi/KpiGroupSheets.gs`)**: "KPI TRAINING FY68" (Training Master: mã KPI + ma trận HOẠT ĐỘNG ĐÀO TẠO THEO PIC + danh sách buổi),
  "KPI MKT Offline" (file MKT offline, C8 / C9 / C12 / C15 + danh sách sự kiện), "KPI MKT Online" (file Digital, C17-01→06 + chi tiết tháng / bài đăng / thiết kế).
  Target từ 3. Detail KPI, màu % như CRM (<90 xám · 90–<100 xanh · 100–120 vàng · >120 xanh lá). Không gõ tay vào các tab này. `training/Kết nối KPI.gs` đã ngừng (trigger tự gỡ).
- **Sự kiện MKT ⇒ Key task Report Hub (`marketing/Event_Sync.gs`, 13/10/2026)**: REPORT_EVENT (+ PLAN_EVENT) ⇒ Key task `Marketing-Event` ở Weekly new (cột U `EK:`), bài đăng
  EVENT REPORT (file Digital) ⇒ sub-task chỉ đọc (`E:`). Key `EK:` không đổi tên / không xoá từ app (sửa kết quả / trạng thái / hạn, thêm sub tay được). `MMH_MonthlyKeys.gs`
  (GIỐNG HỆT ở marketing / backoffice / management): mỗi tháng 1 key "Internal Meeting MMYYYY · <Nhóm>" + "· MMH (toàn công ty)".
- **Tự động 2 file MKT (`marketing/MKT_SheetAuto.gs`)**: EVENT / PRODUCT REPORT (Month theo On-air dự kiến, Ngày điền link, On-air thực tế = công thức, Status), ORDER REPORT
  (Check deadline = công thức On time / Late), ADS REPORT (cột File Report ⇒ đọc file Ads Manager), REPORT_EVENT (Month theo Date, cột Hình thức + Bằng chứng tham dự,
  Actual Participant chỉ đếm khách "Xác nhận tham dự" = Ký tay / Zoom, đủ trường, bỏ trùng SĐT — CHỈ sự kiện từ `MKTA.RULE_FROM` 14/10/2026, sự kiện cũ giữ công thức cũ),
  CUSTOMER LIST (Xác nhận tham dự, Đồng ý sử dụng dữ liệu). `evProof` (list / upload bằng chứng vào folder sự kiện). mkt-online `Mã.gs` `mktaOnEdit_` = bản tức thì (onEdit).
  cust-data v2.4: đọc thêm CUSTOMER LIST (chỉ khách đã xác nhận tham dự).
- **Ngày tháng chuẩn (13/10/2026)**: CRM `crmDateFix_` (crm-dental / surgical / eyeless v10.12, crm-thai v1.19): tab 6 / 3 / 7 / 1 + ALL TASK — đảo ngày ↔ tháng (chỉ khi cột tháng
  cùng dòng khớp sau khi đảo), bỏ giờ thừa, chữ ⇒ ngày, dd/MM/yyyy; file vùng en_US ⇒ en_GB (người dùng đồng ý); 1 lần sau deploy + trigger 02:00 hằng đêm; log `CRM_DATEFIX_LOG`
  (ping trả `dateFix`). Report Hub `MMH_DateFix.gs` (GIỐNG HỆT marketing / backoffice / management): Weekly new J/K/L bỏ giờ thừa, ≤ 1 lần / 20 giờ ở ping / boot (không trigger).
  Ghi ngày mới luôn 00:00 (không ghi giờ). CRM Dental còn file tay cũ `Fix lỗi hiển thị ngày.gs` (ghi 12:00) — không dùng nữa.
- **Đúng dòng (CRM v10.12)**: tab 6 — app gửi `_no` / `_acc` / `_pic` / `_start` ⇒ `wkResolve_` tìm lại dòng đã dời, không thấy ⇒ `stale` (không ghi / xoá nhầm); `saveWeekly` luôn có
  Start date, `wkHeal_` bù dòng trống ngày (dấu 🕒 ảnh / _LOG / Start Month). ALL TASK (`MMH_SalesTasks.gs` v1.1): `expect` / `parentName` = tên việc, ngày mặc định, rid.
- **Hộp cát TEST của CRM (13/10/2026, `MMH_CrmSandbox.gs` GIỐNG HỆT ở crm-dental / surgical / eyeless + `MMH_TestMode.gs` v2.0 ở mọi backend)**: app gửi `tm=1&tmSb=1&tmAs=<PIC>`
  + phiên email Admin ⇒ `tmSbOpen_` đổi `ss()`, thư mục ảnh / chứng từ / PDF, file Business Trip (`TRIP_FILE_ID`, `TF.TRIP_ID`) sang bản TEST; `VER_MAP_SB`, đệm `|SB`, nhật ký `ACTBUF_SB`
  riêng; không đẩy KPI thật (`k68LinkAdapter_` push no-op); `tmSbWho_` = danh tính người đóng vai (dùng ở `tfWho_` / `ordMe_`). `tmSetup` / `tmReset` / `tmClean` ⇒ trigger
  `tmSbBuild`: chép file CRM ("TEST · …") vào Drive "MMH CRM TEST/<Nhóm>", xoá dữ liệu thật (giữ tiêu đề, công thức, danh mục, KPI), chép 2 tab Business Trip, sinh dữ liệu ảo
  (6 khách / PIC — 2 địa bàn mới đã đi thăm, 1 có đơn đầu tiên; CBC; 10 lượt đi địa bàn có ảnh + 3 kế hoạch; 5 đơn qua đúng NPP, 3 chờ duyệt; thuyết trình; ALL TASK; 1 công tác
  chờ duyệt). Trạng thái `tmInfo` (Script Property `TM_SB_*`). Backend chưa có hộp cát nhận `tmSb=1` ⇒ từ chối (không bao giờ ghi thật dưới tên người thật).
  Chạy tay trong trình soạn: `tmSbBuildNow()`. `nppByPic_` (bundle): NPP của từng PIC theo `K68_NPP` (đơn hàng Dental tự điền Partner).

