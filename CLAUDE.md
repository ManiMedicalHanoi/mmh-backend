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
- **Sự kiện MKT ⇒ Key task Report Hub (`marketing/Event_Sync.gs` v2.0, 15/10/2026 — người dùng yêu cầu)**: KHÔNG tự tạo key từ file MKT Offline nữa. Dọn 1 lần
  (`EVS_CLEAN_V2`): xoá key `EK:` hệ thống tự tạo + sub `E:` của chúng (sao lưu sheet ẩn `EVS_Removed`); key người dùng tạo (ActivityLog) / có sub tay / đã sửa ⇒ chỉ gỡ dấu `EK:`.
  `evList` (đọc, đệm 10 phút) = danh sách sự kiện REPORT_EVENT + PLAN_EVENT ⇒ app GỢI Ý đúng tên khi đặt tên Key task. Bài đăng EVENT REPORT (file Digital, cột Event)
  ⇒ sub CHỈ ĐỌC `E:` chèn dưới key có TÊN TRÙNG tên sự kiện (so không dấu / hoa thường). `MMH_MonthlyKeys.gs`
  (GIỐNG HỆT ở marketing / backoffice / management): mỗi tháng 1 key "Internal Meeting MMYYYY · <Nhóm>" + "· MMH (toàn công ty)".
- **MIR từ file Ads Manager (`marketing/MKT_AdsImport.gs`, 15/10/2026)**: 1 file xuất (nhiều chiến dịch, cột Cấp độ phân phối) ⇒ mỗi chiến dịch 1 dòng ADS REPORT (số liệu dòng cấp
  campaign, không cộng adset; Type theo tên "d.m.yyyy - Event|Product - …"; khoá = cột "Chiến dịch Ads Manager" + Month; file kỳ mới hơn ghi đè) + MIR = công thức; tab
  **KPI MIR report** tự thêm dòng tháng mới (SUMIFS). Nguồn: thư mục Drive "ADS REPORT - file Ads Manager" (cạnh file Digital, đọc 10 phút/lần) hoặc `adsReport op=upload` từ app.
  Cột "File Report" từng dòng (MKT_SheetAuto) vẫn chạy, nay chỉ cộng dòng cấp campaign.
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

- **13/10/2026 (đợt 2)**: `kpi/KpiGroupSheets.gs` v2.0 — 3 tab KPI TRAINING / KPI MKT Offline / KPI MKT Online dựng THEO ĐÚNG BỐ CỤC "9. TARGET & KPI" của CRM (`kg8Build_` /
  `kg8Write_`: cài đặt · Phần A nhóm · Phần B PIC × 12 tháng Target | Actual | % FY · lũy kế · Q1–Q4 · điểm · Phần C review quý được GIỮ khi ghi lại · Phần D dữ liệu nguồn);
  cột tổng / % / quý là công thức (`kscFx_` theo locale), Target / Actual = 3. Detail KPI. `MMH_CrmSandbox.gs` v1.1 (`sbRelax_`: validation file TEST = cảnh báo).
  `MMH_MonthlyKeys.gs` v2.0 (3 nhóm + MMH Monthly Meeting FYxx, dọn key cũ trống 1 lần `MK_CLEAN_V2`). `Event_Sync.gs` v1.1 (Task Result gọn, `evsLinks_` đọc link thật, `meta.f`).
  Training `RH_CustList.gs`: sheet **Customer list** (Dealer + Distributor của CRM Dental ▸ 1. CUSTOMER CODE, mỗi giờ, trigger `tclSync` tự cài qua `tclTick_`),
  cột M = Master!F + khách ⇒ danh sách thả xuống của Target Audience (cột K) mọi sheet Training Report FYxx. Chạy tay: `tclSyncNow()`.
- **Học online bằng video + chứng chỉ khi học xong (15/10/2026, training `RH_ELearn.gs`, HUB v3.21)**: sheet **HUB_Videos** (video gắn buổi đào tạo; file MP4 ở GitHub Pages
  `Training-Hub/media/`, danh mục `media/catalog.json`) — `hubMaterials` = `hubWithVideos_(hubMaterialsDrive_)` ⇒ video (id `V…`, `src`) đứng đầu tuyến bài. `videoSave` (trainer của buổi).
  **Chứng chỉ = học xong 100% tuyến bài** (người dùng yêu cầu): video ≥ 70% (app đếm giây đã xem, gửi `done`), tài liệu đọc hết trang ⇒ `apiTrackProgress` gọi `hubStudyDone_` (ngoài khoá)
  ⇒ HUB_Enrollment Completed/Pass + `hubIssueCertificate(…, 'study')` + email; trả `cert` / `sessionDone`. Bài kiểm tra KHÔNG cấp chứng chỉ (`HUB_CERT_BY_QUIZ = false`).
  Tạo câu hỏi bằng AI đã BỎ (người dùng yêu cầu). App Training Hub v4.0.
- **Email Mở mới dạng thư thường (15/10/2026, `naMailHtml_` / `naSendMail_` GIỐNG HỆT ở crm-dental / surgical / eyeless / thai)**: người dùng yêu cầu bỏ HTML cầu kỳ — Dear chị Tuyên
  (`NA_HONOR` = xưng hô theo PIC, mặc định "anh/chị <tên>"; tiếng Anh chỉ tên) · lời mở đầu · thông tin từng dòng · ảnh chứng từ NHÚNG trong thân email (`inlineImages`, `cid:`), PDF đính kèm · link CRM · Best regards.
- **Đơn hàng: sales Gửi xác nhận (15/10/2026, crm-dental / surgical / eyeless)**: `orderRequest` (keys = đơn Chờ duyệt của chính mình, đủ điều kiện) ⇒ email thư thường tới `ORDER_APPROVERS` (Tuyen), Cc + replyTo sales,
  ảnh chứng từ nhúng (`ordMailFiles_` / `ordMailBody_`), link `NA_CRM_URL#oa`; ghi "Đã gửi xác nhận tới … · dd/MM/yyyy HH:mm" vào Ghi chú duyệt. Email kết quả `orderDecide` cùng kiểu thư thường. `decision=return` (Trả lại bổ sung): đơn vẫn Chờ duyệt, Ghi chú duyệt = "Cần bổ sung: … · người · giờ", email sales, không cần đủ điều kiện.
- **Khoá học v3.25 (15/10/2026, training `RH_HubCourse.gs`)**: sheet **HUB_SessionMeta** (ProductLine do TRAINER chọn — app không tự đoán chuyên khoa; Cover; AutoFolderId),
  `saveSession` nhận `line` / `cover`, `sessionMeta`. Thư mục tài liệu: app gửi `createFolder=0` ⇒ tạo khi **gửi thư mời** (`sendInvite` kind pre ⇒ `hubRhFolder`, link trong email) hoặc
  **tải file đầu tiên**; buổi chuyển Cancel / xoá (cả từ Report Hub) ⇒ `hubTrashSessionFolder_` đưa thư mục do Hub tạo (AutoFolderId / tên `yyyyMMdd_…`) vào Thùng rác + xoá link.
  Tìm thư mục theo tên bỏ qua thư mục trong Thùng rác (`hubLiveFolder_`). **Video từ app ⇒ GitHub**: app tải MP4 lên Drive (`uploadInit` path `["Video bài giảng"]`) rồi `videoPublish`
  ⇒ đẩy lên `Training-Hub/media/s/<sid>/<VideoID>.mp4` (+ ảnh bìa) bằng Script Property `HUB_GH_TOKEN` (Admin dán trong app ▸ `ghSetup`, token fine-grained Contents R/W kho Training-Hub),
  tối đa 25 MB / video; file gốc trong thư mục "Video bài giảng" không tính là bài học. Giao diện chỉnh trên app: `uiSave` (Script Property `HUB_UI`), ảnh `imgPublish` (GitHub `media/ui/`, chưa có token ⇒ Drive lh3).
  bootstrap trả `smeta` / `ui` / `gh`. **Email gửi học viên = thư thường** (`hubLetter_`: Dear · đoạn văn · thông tin từng dòng · link · Trân trọng — giống email thông báo cập nhật):
  thư mời / sau đào tạo / nhắc hoàn thành khoá học / nhắc lịch hôm nay / chứng chỉ / nhắc hằng tuần (`hubPendingFor` = khoá học chưa học xong, không còn theo bài kiểm tra).
  Xoá buổi: trainer của buổi hoặc Admin.
- **Đệm luôn nóng (15/10/2026, training `RH_Warm.gs`, HUB v3.26)**: trigger `hwWarm` 5 phút / lần (tự cài qua `hwTick_` trong `hubDispatch`, Script Property `HW_TRIG`) đọc lại
  bảng dùng chung (sessions / users / enroll / progress / qcfg / videos / smeta) + danh sách tài liệu Drive của khoá đang dùng (120 ngày trước → 45 ngày tới, ≤ 12 khoá / lượt, chỉ khoá chưa có đệm).
  `HUB.CACHE_TTL` = 900 (ghi vẫn tự xoá đệm). Kết quả lượt cuối: Script Property `HW_LAST`. Chạy tay: `hwWarm()`.
  **KHÔNG dùng LockService trong hwWarm** (v1.1 / HUB v3.27): v1.0 giữ khoá ghi tới 150 s ⇒ tạo buổi / lưu tiến độ báo "bận"; chống chạy chồng bằng cờ CacheService `hw:run`.
- **Học thử như học viên (16/10/2026, HUB v3.28)**: `asLearner=1` nhận cho cả trainer (trước chỉ Admin) ⇒ `hubStudyDone_` / cổng bài KT tính như học viên trên KHOÁ THẬT ⇒ học xong được cấp chứng chỉ thật + email.
  App v4.8: nút "Học thử như học viên" ở dòng Chứng chỉ của trang khoá học (chỉ trainer / Admin của khoá), bật theo từng khoá (`localStorage.mmh_hub_aslearn`).
- **Nút Nhận chứng chỉ (16/10/2026, HUB v3.29, `RH_ELearn.gs` ▸ `apiClaimCert`, action `claimCert` p.sid)**: đã có chứng chỉ ⇒ gửi lại email (file cũ); chưa có ⇒ `hubStudyDone_` (học xong 100%) ⇒ tạo + email; chưa xong ⇒ `NOT_DONE` n/total;
  trainer / Admin của khoá cần `asLearner`. App v4.9: nút ở dòng Chứng chỉ trang khoá học.
- **Bảng xếp hạng học viên (16/10/2026, HUB v3.30, `RH_Leaderboard.gs` ▸ action `leaderboard`, mọi người đăng nhập)**: điểm = 100 × chứng chỉ + 10 × bài học xong, tính cả khoá không được giao
  (mọi thành viên thấy mọi khoá, học / lấy chứng chỉ bất kỳ lúc nào); bỏ khoá Cancel, tài khoản ngừng / TEST; trả `items` (rank, certs, lessons, tháng này, `done` = sid) + `courses` (số người hoàn thành). Đệm `lb` 10 phút. App v5.0: trang Xếp hạng.
- **16/10/2026 — CRM v10.14 (crm-dental / surgical / eyeless `Mã.gs`)**: `saveOrders` đơn MỚI cần lịch sử chăm sóc (`ordCareCheck_`: tab 6 cùng account, Completed, 30 ngày trước ngày đặt ⇒ không có trả
  `code:'NOCARE'`), ghi xong email thư thường tới HOD — người duyệt đơn của nhóm `ORDER_APPROVERS` (`ordNewMail_`; v10.16 22/10/2026 đổi từ Giám đốc sang HOD theo yêu cầu người dùng). `wkApplyRule_`: Visiting chỉ Completed khi có Result · Feedback · Next action. KPI C3 (tab 9 + dashboard):
  `visitOk_` = Visiting · Completed · có ảnh · ≤ hôm nay · không TBD; công thức COUNTIFS thêm `R="Complete*"`, tab đã dựng được vá 1 lần ở ping/boot (`k68VisitPatch_`, Script Property `K68_VIS_V`).
- **16/10/2026 — Training Hub v3.31 (`RH_Assess.gs`)**: bài kiểm tra bật lại — `hubGate` chỉ xét VIDEO (≥ 70%, tài liệu không còn là điều kiện); khoá có bài đang mở ⇒ chứng chỉ khi đạt PassScore
  (`HUB_CERT_BY_QUIZ = true`, `hubStudyDone_` trả `needQuiz`, `apiClaimCert` cần đạt bài); không có bài ⇒ như cũ. Training Report: Completed cần cột Q (Assessment Result) — trừ Coaching / External —
  Hub có bài nộp ⇒ tự điền "Bài KT Hub: x/y đạt · điểm TB z" (`hubTestCells_`), P = link bài trên Hub. Kết quả (Google Sheet) + lối tắt chứng chỉ vào thư mục con
  "Kết quả bài kiểm tra & Chứng chỉ" của thư mục buổi (không tính là bài học). `saveSession` / `rhSaveSession` nhận `assessment` / `assessmentResult`.
- **Công việc khác của Sales = 3 Key task cố định (16/10/2026, `MMH_SalesTasks.gs` v1.2, crm-dental / surgical / eyeless)**: `ST_FIXED` = Báo cáo và kế hoạch · Trực fanpage và tư vấn · Tuyển sinh sự kiện,
  tên `<loại> Tmm.yyyy` (09/2026 → 08/2027 = FY68). Sales (không phải quản lý / Director / HOD / Admin — `stFree_`) không tạo / đổi tên key khác, không thêm sub vào key khác; thêm key đã có
  (cùng tên + PIC) ⇒ trả về key đó; start / hạn = đầu / cuối tháng. App CRM v32.5 chỉ cho chọn 3 key của đúng tháng.
  v1.3 (17/10/2026): thêm key thứ 4 **Đào tạo và nghiên cứu**. **crm-thai** (`Mã.gs` ▸ `AT_FIXED` / `atFixedOf_` / `atFree_`): cùng luật, tên tiếng Anh
  `Reports & Plans · Fanpage & Consulting · Event Enrolment · Training & Research · Others` + ` MM/yyyy`; chỉ role `manager` tự do (Dao lead + Miew theo danh sách).
- **Cầu nối Turnover (17/10/2026, training `RH_Turnover.gs`, HUB v3.32)**: web app `turnover` deploy quyền **DOMAIN** (không đổi được qua repo) ⇒ trình duyệt đăng nhập Gmail khác / nhiều tài khoản /
  Safari không đọc được. Action `rhTurnover` (rhKey + phiên `tk`, `op` = getTurnoverData · getNppDetail · getMeta · getExplanations, `fy` / `seg` / `fresh`) ⇒ UrlFetch web app Turnover bằng
  `ScriptApp.getOAuthToken()` của chủ Training Hub, đệm 3 phút. CRM v32.7 tự dùng khi đọc trực tiếp lỗi.
- **17/10/2026 — sửa #ERROR! KPI viếng thăm (crm-dental / surgical / eyeless `Mã.gs`)**: `k68VisitPatch_` v1013 chèn `R,"Complete*"` vào CUỐI công thức ⇒ ô có COUNTIFS nằm trong IF / IFERROR… lỗi.
  `K68_VIS_VER = '1017'` + `k68VisFix_` / `k68VisInside_` / `k68VisHas_`: gỡ phần chèn sai, chèn lại vào ĐÚNG bên trong COUNTIFS chứa "Visiting" (bỏ qua chuỗi trong ngoặc kép); chạy 1 lần ở ping / boot.
  ⚠️ Bài học (17/10/2026): file CRM định dạng VN ⇒ `getFormulas()` trả dấu `;`; ghi công thức bằng `setFormula` dùng `,`. Sửa công thức đã có phải chuẩn hoá dấu trước (`k68Comma_`), không chèn `,` vào chuỗi `;`.
  v1018 đã vá xong 3 file (0 ô lỗi). Chẩn đoán: workflow **Kiểm tra** ▸ ping `crm-dental?action=k68Diag` (thêm `&fix=1` để chạy lại bản vá).
- **17/10/2026 — CRM v10.15 (crm-dental / surgical / eyeless `Mã.gs`)**: `sendWeeklyReport` gửi thật (team / all / pic) ⇒ `rpMark_` ghi Script Property `RPW_<pic>` = "tuần (thứ Hai) | giờ gửi" (chỉ giữ tuần mới nhất;
  hộp cát TEST ghi `RPWSB_`, chế độ TEST cũ bỏ qua). Action đọc `rpStatus` ⇒ `{sent:{pic:{from,at}}, since}` (`since` = ngày bắt đầu ghi nhận, Script Property `RPW__SINCE`) — app CRM v33.1 dùng cho khung "Cần xử lý" (PIC chưa gửi báo cáo tuần trước).
- **17/10/2026 — Báo cáo tuần Report Hub mất Task result (marketing / backoffice / management `Back end.gs`, `filterKeysForPic` GIỐNG HỆT 3 nơi)**: nhiều dòng KEY TASK có Sub task + Task result
  ngay trên dòng key (vd. 140 "Ngân sách tháng 10" · Review · "Đã review"); trước chỉ lấy dòng con `140.1…` ⇒ email / PDF chỉ còn tiêu đề key + %. Nay `rptKeySelf_(k)` = 1 dòng việc của chính dòng key
  (có Sub task / Task result; key trống hoàn toàn chỉ vào phần tuần này như cũ), lọc tuần + PIC như dòng con.
- **17/10/2026 — Hạn mức email ngày ("Service invoked too many times for one day: email")**: Apps Script giới hạn số người nhận / ngày cho tài khoản chạy script, DÙNG CHUNG mọi dự án
  (CRM, Training Hub, Report Hub). `MMH_MailDomain.gs` (GIỐNG HỆT mọi backend) nay qua `mmhSendObj_`: hạn mức còn lại < số người nhận hoặc MailApp báo hết ⇒ gọi `mmhMailApi_` (nếu có), không có ⇒ câu lỗi dễ hiểu.
  `MMH_MailFallback.gs` (CHỈ marketing / management / training — đã có quyền UrlFetch + Gmail, không thêm quyền mới): gửi lại qua **Gmail API** (`users/me/messages/send`, MIME tự dựng: html, đính kèm, ảnh nhúng `cid:`)
  bằng `ScriptApp.getOAuthToken()` — hạn mức Gmail riêng. KHÔNG thêm `UrlFetchApp` vào backend chưa dùng (tự nhận quyền ⇒ phải cấp lại quyền, web app hỏng). Gửi dự phòng ưu tiên dịch vụ nâng cao **Gmail** (`enabledAdvancedServices` trong appsscript.json của 3 backend — dự án Cloud ẩn của script không bật được Gmail API trên Console, thêm dịch vụ nâng cao thì Apps Script tự bật), lỗi mới thử UrlFetch. Chẩn đoán: ping marketing `&mailProbe=1` ⇒ `mail.mailLeft` / `apiProbe`.
- **21/10/2026 — KPI nhóm Back office tự động (`kpi/KpiBackOffice.gs`, KpiSyncCenter v1.19, KpiGroupSheets v2.1)**: nguồn `bo` = file **Back Office KPI Tracking FY68**
  (`1RM7Ijh0…`, đổi bằng Script Property `KSC_ID_BO`; script của file đó `1mdH2FqF…` không cần sửa). Mã P1 → P5 đọc sheet **KPI FY68** (công thức của nhóm Back office)
  thay IMPORTRANGE (lần đầu đổi ô IMPORTRANGE thành số, lưu `_SYNC_REPLACED`); sửa tay ⇒ chạy ngay, 15 phút đọc lại. Theo 4. Rule: **P2-08 lũy kế** (FY Actual = LOOKUP tháng cuối,
  `kscMonthlyTargets_` bỏ qua mã trong `KSC_BO.CUMUL`), **P3-00** chỉ ghi tháng có Stock Amount + Cost of sale (sheet Inventory). Ô công thức trống ⇒ xoá ở file KPI, ô tự nhập trống ⇒ giữ.
  Tab **"KPI Back Office"** trong file Back Office (bố cục 9. TARGET & KPI, tên KPI tiếng Việt `KSC_BO.NAMES` giống `kpiShort` của Report Hub). Mã nhiều PIC hiện ở từng PIC (nhãn `kpd:`).
  Thử: harness Node giả lập SpreadsheetApp với file xlsx (không có trong repo). KSC.VERSION giữ 1.18 (không chạy lại lượt nâng cấp Target theo tháng).
- **Ảnh thương hiệu cho giao diện Training Hub (21/10/2026, training `RH_Brand.gs`, HUB v3.33)**: `HB_LIST` (tên ngắn + mã file Drive: ảnh sản phẩm, catalogue, workshop, ảnh video giới thiệu công ty) + mọi ảnh trong thư mục Drive
  **"Training Hub — Ảnh trang chủ"** (trong thư mục gốc Hub, tên `f-<tên file>`) ⇒ ảnh thu nhỏ Drive (`thumbnailLink` =s1600, Bearer `ScriptApp.getOAuthToken`) ⇒ GitHub `Training-Hub/media/brand/` + `brand.json`.
  Chạy nền: `hubBrandTick_` (hubDispatch) hẹn trigger 1 lần `hubBrandSync` (≤ 4,5 phút / lượt, tự hẹn lượt sau); bản `HB.VER` xong ⇒ chỉ kiểm thư mục ≤ 15 phút / lần. Trạng thái: `action=brandStatus` (công khai). Không dùng ảnh có nhân sự (sơ đồ tổ chức).
- **23/10/2026 — Rule KPI người tham dự sự kiện (C15, `marketing/MKT_SheetAuto.gs` v1.2, chị Tuyên cập nhật 4. Rule)**: Actual Participant (REPORT_EVENT, sự kiện từ `RULE_FROM` 14/10/2026) = SĐT khác nhau
  ở CUSTOMER LIST cùng sự kiện + tháng, đủ **Họ tên · SĐT · Nơi công tác (Workplace) · Email** (bỏ Province / Tittle), và **Ký tay + "Đồng ý sử dụng dữ liệu" = Đã đồng ý…** (trực tiếp) hoặc **Zoom** (webinar).
  Tab chưa có cột Email ⇒ code tự thêm. Công thức cũ của sự kiện từ 14/10 tự được ghi lại (dấu nhận diện có cột Email + Đồng ý).
- **23/10/2026 — Review rule KPI Back office (`kpi/KpiBackOffice.gs` v1.1)**: nhóm Back office sửa công thức P2-04 (Hậu / Việt) trên file của họ; P5-01 chỉ tính theo thời gian nộp (không tính lỗi sai);
  **P5-05 VAT chưa áp dụng quý 1** ⇒ `KSC_BO.FROM['P5-05'] = 202612` (tháng trước đó để trống ở file KPI, từ quý 2 chuyển cho Mai); P1-00 = sheet Internal Docs (Month K, PIC L = Dam Ha);
  P2-07 = hồ sơ thầu đúng hạn ÷ hồ sơ đã nhận, quy đổi thang 100. P3-00 / P4-00 / P5-01a / P5-06 (của chị Hoà) còn chờ chị Hoà xác nhận.
- **23/10/2026 — Báo cáo tuần có buổi đào tạo (`MMH_WeeklyExtra.gs` GIỐNG HỆT ở marketing / backoffice / management)**: app Report Hub v18.4 gửi kèm `trn` (JSON gọn các buổi
  Training Hub người gửi là trainer / được mời, tuần báo cáo + tuần sau) + `trnPic` trong `weeklyReport` ⇒ `wxAppend_` thêm key ảo "Đào tạo (Training Hub)" (sub `ĐT.n`, `__noOd` không tính quá hạn)
  vào email + PDF. Không UrlFetch (backoffice chưa có quyền). Công tác đã có sẵn (key "Lịch công tác MMYYYY" do `rhxTripSync` ghi vào WEEKLY); `cellRich` đổi `**…**` (báo cáo công tác) thành chữ đậm.
  v1.1 (23/10/2026, người dùng yêu cầu): việc QUÁ HẠN (`isOverdueGS`) rút khỏi "This week" + "Plan for next week" ⇒ mục riêng **② Overdue tasks** (`wxOverdue_` gộp không trùng,
  `wxOdEmail_` / `wxOdPdf_`), Plan for next week thành ③.
- **23/10/2026 — Nhật ký gửi báo cáo + hạn nộp theo lịch MMH (`MMH_ReportLog.gs` GIỐNG HỆT ở marketing / backoffice / management / crm-dental / crm-surgical / crm-eyeless / crm-thai / kpi)**:
  mỗi email báo cáo THẬT ⇒ `rplAdd_(type, pic, period, {to, by, opt, cal})` ghi sheet ẨN **`_MMH_REPORT_LOG`** của bảng tính backend (bỏ gửi thử / TEST / hộp cát). `type`: `week` (báo cáo tuần: RH `sendWeeklyReport`,
  CRM VN `sendWeeklyReport`, crm-thai `sendReport_` week, lịch TH) · `kpi` (`kscMailSend`, bỏ tiêu đề `[TEST]`) · `quarter` (kpi `rhSeSend` mới: email file Word tự đánh giá quý). Hạn: tuần = 23:59 ngày làm việc cuối (T2–T7)
  theo `RPL_CAL` (lịch 2026 VN / TH: thứ 7 đi làm + ngày nghỉ T2–T6 — **năm mới phải thêm**), KPI tháng = 16:00 ngày 02 tháng sau, quý = 17:00 ngày 09 tháng đầu quý sau. Đọc: action `rpLog` (phiên `tk`;
  Admin / Director / HOD hoặc Perms `rps` — Training Hub `RH_PERM_KEYS.rps`); kpi trả thêm lịch sử cũ từ sheet log email KPI (`KSC_MAIL.LOG`). App (Report Hub v18.6 / CRM v33.3, `rpstat/rpstat.js`) gom mọi backend ⇒ Excel, lấy LẦN GỬI GẦN NHẤT.
- **28/10/2026 — CRM v10.17: đơn nhiều sản phẩm (crm-dental / surgical / eyeless `Mã.gs`)**: lỗi — đơn lưu khi Order No. trống ⇒ `ordGroups_` coi MỖI DÒNG là 1 đơn ⇒ Gửi xác nhận / duyệt / KPI C5 chỉ dòng đầu.
  `ordKey_` (dùng ở `ordGroups_` + `ordSuppList_`): có số = Order No. + PIC + tháng; không số = account + ngày đặt + PIC + tháng. `saveOrders`: đơn chưa có số ⇒ `ordNextNo_` cấp 1 số cho cả đơn
  (kể cả dòng cũ không số cùng đơn trên sheet); dòng `_del` (`_no` + `_nm` phải khớp, sales chỉ bỏ dòng của mình) xoá từ dưới lên, `rows` trả về theo đúng thứ tự gửi (dòng bỏ = 0);
  sửa / thêm / bớt dòng đơn đã duyệt hoặc từ chối ⇒ cả đơn Chờ duyệt; đơn đang sửa (có `_row`) không kiểm chăm sóc, không email đơn mới. App CRM v33.4 gửi cả đơn khi sửa.
- **28/10/2026 — CRM v10.18 + Training Hub v3.34: email xin xác nhận đơn mở thẳng đúng đơn**: `orderRequest` (crm-dental / surgical / eyeless) — link `#oa=<key đơn>` (1 đơn) / `#oa` (nhiều đơn);
  người duyệt nhận email RIÊNG có `&lk=<vé>` (`ordLinkTicket_`: HMAC bằng `RH_Secret` + `'|lk'`, `{k:'lk', e, s:Session, i, x}` hạn 7 ngày; bỏ qua ở chế độ TEST / hộp cát), sales nhận bản sao KHÔNG có vé
  (trước: 1 email To người duyệt Cc sales). Training Hub `rhAuthLink` (RH_Auth.gs) đổi vé ⇒ phiên thường 30 ngày (khoá ký khác phiên ⇒ vé không dùng thay phiên được; đổi Session ⇒ vé cũ hết hiệu lực).
  App CRM v33.5 (khối `v335-js`) dùng vé khi trình duyệt chưa có phiên (app email trên điện thoại).
- **28/10/2026 — CRM v10.19 (crm-dental / surgical / eyeless `Mã.gs`)**: ① `ordNoHeal_` (≤ 1 lần / 20 phút, CacheService `ORDHEAL`, ở ping / boot / bundle / version + đầu `orderPending`): dòng KHÔNG số cùng account + ngày + PIC + tháng
  (`ordK2_`) với dòng ĐÃ có số (chỉ 1 số) ⇒ điền cùng Order No. + `ORD_SHARE` (Order Type / chứng từ / trị giá thầu / tháng KQTT) còn trống — sửa đơn bị app cũ tách khi cập nhật chứng từ 1 dòng.
  ② `saveOrders`: dòng đang sửa vốn không số trên sheet ⇒ các dòng không số cùng đơn nhận cùng số + `ORD_SHARE`. ③ `wkResolve_`: số No lệch nhưng đúng account + PIC + ngày cũ (`_start`) ⇒ vẫn nhận dòng
  (trước đây STALE ⇒ đổi ngày task không lưu, app tải lại thấy ngày cũ). App CRM v33.6.
- **28/10/2026 — CRM v10.20 (crm-dental / surgical / eyeless `Mã.gs`)**: `orderDecide decision=return` nhận `notes` = JSON `{key: nhận xét}` (nhận xét RIÊNG từng đơn, `comment` chung làm dự phòng) ⇒ ghi "Cần bổ sung: <nhận xét> · người · giờ"
  từng đơn; mỗi sales nhận **1 email** "CẦN CHỈNH SỬA n đơn hàng" liệt kê mọi đơn + dòng "Cần chỉnh sửa: …" dưới từng đơn (`ordMailBody_` ▸ `o.notes`), link `NA_CRM_URL#ox` (app CRM v33.7 mở danh sách đơn cần chỉnh sửa).
- **29/10/2026 — Report Hub không thấy dữ liệu sửa thẳng trên Sheet / báo cáo tuần thiếu dòng (marketing / backoffice / management `Back end.gs`, GIỐNG HỆT 3 nơi)**: bộ nhớ đệm 6 giờ theo vân tay
  `dataVersion`, trước chỉ đổi khi sửa qua web / trigger onChange (phải chạy tay `installTriggers`) / `warmCache` (10 phút, 6h–21h). Nay: vân tay thêm `liveSig_(lastRow)` = MD5 cột B..O sheet WEEKLY
  (đệm 60 giây) ⇒ mọi sửa trên Sheet hiện sau ≤ 1 phút; `ensureEditTrigger_` tự cài onChange + onEdit (≤ 1 lần thử / 6 giờ, ở boot); `xsReadWeeklyAll` (gửi báo cáo) đọc `readWeeklyFresh_` (thẳng sheet);
  action `weekly` nhận `fresh=1`. `doneStampOnEdit` lấy trạng thái cũ từ bản đệm gần nhất (`lastk_wk`) khi vân tay đã đổi.
- **29/10/2026 — Training Hub v3.35: video từ MMH Library (`training/RH_Library.gs`) + sửa luật hoàn thành học online**: kho riêng tư `mmh-library` ▸ `Videos/catalog.json`
  (3 thư mục Skill · Product · Knowledge, video ≤ 30 MB, git thường). `libList` / `libAttach` (trainer của buổi) + cầu nối Report Hub `rhLibList` / `rhLibAttach`: chép video (+ ảnh bìa, .vtt)
  sang `Training-Hub/media/lib/<id>.mp4` (1 lần, dùng lại cho mọi khoá) rồi thêm dòng HUB_Videos (`CatalogID = lib:<id>`) ⇒ học online như video bài giảng. Token đọc thư viện:
  Script Property `HUB_LIB_TOKEN` (Admin dán: `ghSetup kind=lib`), không có ⇒ thử `HUB_GH_TOKEN`; boot trả `lib` (1 đọc được · -1 lỗi quyền · 0 chưa kết nối). Video `confidential` không đưa lên.
  Hoàn thành: `hubStudyDone_` đọc lại danh sách bài khi đệm nguội (trước bỏ qua ⇒ học xong không được cấp chứng chỉ); bảng học viên chỉ đếm bài còn trong khoá (`filesTotal`).
  Chẩn đoán (chỉ số tổng hợp, không email): workflow **Kiểm tra** ▸ ping `training?action=elDiag&full=1` (`ed` = người học là trainer / Admin của khoá ⇒ đúng luật không cấp; `noCert` = sót ⇒ thêm `&fix=1` cấp bù) (`gas.mjs ping` in đủ 6000 ký tự khi có `full=1`).
