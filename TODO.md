# Việc đã hứa với người dùng (làm theo thứ tự)

1. ✅ **Kéo code gốc 7 backend về kho** (06/10/2026). Quyết định của người dùng đã thực hiện:
   - ✅ Training Hub: app (Report Hub + Training-Hub) chuyển sang **bản 34** (code repo = bản 34).
   - ✅ Management: deploy bản 30 (bỏ `index.html` không dùng).
   - ✖ Marketing: `ReportHub_Trip_Mail.gs` (sửa trên trình soạn, chưa deploy — đổi người nhận 'Quynh Anh' → 'Minh Trang'):
     người dùng **không** đưa lên (06/10/2026). `.pull.json` còn `pending` ⇒ deploy tự động Marketing sẽ dừng; khi cần sửa
     Marketing, hỏi lại người dùng hoặc chạy **Kéo code về** trước.
   - Business Trip: URL đang chạy quyền MYSELF — app chỉ dùng làm nguồn dự phòng cho lịch.
   - Training Hub trả 404 'unable to open the file' cho `?action=ping` lúc có lúc không ⇒ gọi thử so trước/sau.
2. ✅ **Chạy thử trọn vòng tự deploy** (Management 29 → 30, gọi thử 200) bằng 1 thay đổi vô hại (vd. `BACKEND_VERSION` trả trong `boot` của Training Hub).
3. **Mô tả cấu trúc Sheet** `docs/cau-truc-sheet.md`: rút từ code (tab, cột đọc/ghi) + file Excel người dùng gửi
   (ý nghĩa cột, cột công thức / Data validation, tab sửa tay). Chỉ tiêu đề + dữ liệu giả — kho này riêng tư.
4. **Tự phát hiện thay đổi cột** (người dùng đã đồng ý 06/10/2026): thêm action đọc dòng tiêu đề các tab mà backend dùng
   ⇒ workflow định kỳ so với `docs/cau-truc-sheet.md`; có cột bị thêm / xoá / đổi tên ⇒ báo (issue GitHub + email)
   trước khi app lỗi.
5. ✅ Cập nhật `CLAUDE.md` của repo MMH-Report + skill `gh-webapp-upgrader` (`references/backend-deploy.md`) — người dùng
   cần tải lại file `skills/dist/gh-webapp-upgrader.skill` lên phần Skills của Claude.
6. Đưa backend các app khác vào kho này khi người dùng mở phiên với app đó (README ▸ "Thêm backend của một app khác").
   Đã thấy: `AKfycbwwGhYa…` (Field Report Surgical — Report Hub chỉ mở link, có thể thuộc repo Surgical-Sale-Report).
7. **Đăng nhập email + mã 6 số cho Report Hub (B1)** — người dùng duyệt 06/10/2026. Admin: Giang (mmh.product).
   - ✅ Giai đoạn 1: Training Hub v3.12 `RH_Auth.gs` (`rhAuthStart` / `rhAuthVerify` / `rhAuthMe`), sheet `RH_Users` +
     `RH_Secret` (ẩn) trong Training Master; app v16.0 gửi `tk` trong mọi lệnh gọi; vẫn cho chọn tên cách cũ.
     Cầu nối `rh*` của Training Hub đã ưu tiên danh tính trong phiên.
   - ⏳ Giai đoạn 2 (sau ~1 tuần, khi cột LastLogin của RH_Users đủ người): 3 backend Report Hub + MKT feeds tự kiểm `tk`
     (đọc `RH_Secret` + `RH_Users` của Training Master bằng `openById`, đệm CacheService) ⇒ chặn lệnh không có phiên hợp lệ,
     `pic`/`actor` lấy từ phiên; app bỏ màn chọn tên; đổi `TRAINING_RH_KEY` (đang lộ trong index.html công khai).
8. ✅ Business Trip `Mã.gs`: đã sửa 17 chỗ gõ sai tên miền `manimedicalthanoi.com` (phần lớn ở chữ hướng dẫn / test).
11. ✅ Backend KPI FY68 (`kpi`): thêm RH_KpiView.gs (chỉ đọc, doGet rhKpi) cho tab KPI của Report Hub — không sửa KpiSyncCenter / TurnoverLink.
10. ✅ Trang phân quyền Report Hub (Training Hub v3.13: `rhAdminList` / `rhAdminSave` / `rhAdminKick`; RH_Users thêm Dept/Title/Perms).
   Quyền hiện được app áp dụng (ẩn / chặn nút); giai đoạn 2 backend phòng ban đọc thêm Perms để chặn ở máy chủ.
9. ✅ Training Hub v3.14 có `rhAssign*` (sheet RH_Assign) + `rhAssignReply` + `rhDirectory` — trước đó "Việc mới được giao" lỗi im lặng.
   ⏳ Tuỳ chọn: đọc email trả lời thật (cần hộp thư theo dõi + quyền Gmail đọc ⇒ chủ script cấp quyền lại) — hỏi người dùng.
12. ⏳ **Product-Data** (`product-data`, app `ManiMedicalHanoi/Product-Data`, 08/10/2026): đưa backend vào kho (Đợt 1). Script gắn với
    Sheet `1IQmW…` ⇒ có thể phải xin Script ID của người dùng. Sau khi kéo code: đăng nhập `tk` (Training Hub `rhAuthMe`), phân quyền
    (xem: mọi người · sửa/upload: Admin hoặc `perms.pd.e` — Training Hub v3.19 `RH_PERM_KEYS.pd` · xoá: Admin), ID cố định cho sản phẩm + sheet `Files`, ghi bằng POST có `rid`.
    App v2.0 (08/10/2026) đã có đăng nhập + hàng đợi ghi; workflow Kéo code về KHÔNG tự tìm được Script ID (script gắn Sheet) ⇒ chờ người dùng gửi.
13. ⏳ **Duyệt công tác từ web (10/10/2026, `MMH_TripFlow.gs`)**: đã có ở management · backoffice · crm-dental · crm-surgical · crm-eyeless
    (email đề xuất đúng mẫu Business Trip gửi Giám đốc, nhật ký riêng tab "Business Trip Log", `tfPending` / `tfDecide` / `tfLog`).
    **Marketing chưa có** — chờ người dùng quyết định bản sửa dở `ReportHub_Trip_Mail.gs` (deploy tự động dừng). Bản vá sẵn: chép
    `MMH_TripFlow.gs` + 3 chỗ sửa giống backoffice (`tfRoute_` trong `dispatch`, `tfDecide` trong `RHX_ONCE`, `tfLogAppend_` trong `rhxTripPropose`).
