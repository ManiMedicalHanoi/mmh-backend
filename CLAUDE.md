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
  `code:'NOCARE'`), ghi xong email thư thường tới Giám đốc (`ordNewMail_`, `TF.DIRECTOR`). `wkApplyRule_`: Visiting chỉ Completed khi có Result · Feedback · Next action. KPI C3 (tab 9 + dashboard):
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
