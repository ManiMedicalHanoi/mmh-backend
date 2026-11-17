# Event Hub — backend app "Sự kiện MKT" (`backends/marketing/MKT_EventHub.gs`)

- App: `ManiMedicalHanoi/MMH-Event-MKTOnline` (index.html; `?demo=1` = dữ liệu mẫu chạy trong trình duyệt).
- Sổ dữ liệu + thư mục tệp TỰ TẠO trong thư mục Drive "Event FY68" (`EH.ROOT`) ở lần chạy đầu — ID ở Script Property `EH_BOOK` / `EH_FILES`.
- `parse_events.py` = bản Python của bộ đọc file kế hoạch (thử trên .xlsx), `ehParsePlan_` = bản JS chạy trên Google Sheet.
- `test_harness.js` = chạy thử `ehSync_` / `ehBoot_` / `ehSave_` / `ehUpload_` với bảng tính + Drive giả lập
  (cần `plans.json` xuất từ các file kế hoạch .xlsx — không đưa file thật vào kho).
- `MKT_EventHubLink.gs` (v1.2) = đọc file MKT Offline (REPORT_EVENT / PLAN_EVENT, đếm CUSTOMER LIST) + file Digital (EVENT REPORT, ORDER REPORT) theo sự kiện ⇒ tab MKT_LINK ⇒ `ehBoot.link` (tab "MKT Offline · Online" của app).
- `MKT_EventHubFlow.gs` (v1.5, app v2.4) = lập kế hoạch muộn (dồn hạn), đóng sự kiện, biên bản họp ⇒ việc, Pending, cập nhật tuần (tab CHECKINS), mốc quan trọng, follow-up, nhắc theo bậc, việc ⇒ sub `H:` Report Hub.
- `MKT_EventHubFast.gs` (v1.6, app v2.6) = tải app nhanh: đệm dữ liệu lớn chia mảnh, giữ đệm nóng, không mở Sheet khi trúng đệm, kiểm tab 1 lần / 6 giờ.
- `MKT_EventHubGate.gs` (v1.8, app v3.0) = tuyển sinh theo sự kiện (tab REG, chỉ số đếm từ file đăng ký / CUSTOMER LIST), đối tác / NPP (PARTNERS), luật thông báo đối tác theo sự kiện + hàng chờ gửi (PNOTICE),
  5 cổng kiểm soát (G1 D−28 · G2 D−21 · G3 D−3 · G4 D+1 · G5 D+14), trang đối tác `ehPartner` (token), báo quản lý khi tắc cổng / tuyển sinh chậm.
- `MKT_EventHubDiag.gs` = rà Drive chỉ đọc (`ehDriveDiag`): cây thư mục Event FY68, file đăng ký / Form, cấu trúc tab (che SĐT / email), chữ file Word quy trình.
