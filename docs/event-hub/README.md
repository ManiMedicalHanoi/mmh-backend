# Event Hub — backend app "Sự kiện MKT" (`backends/marketing/MKT_EventHub.gs`)

- App: `ManiMedicalHanoi/MMH-Event-MKTOnline` (index.html; `?demo=1` = dữ liệu mẫu chạy trong trình duyệt).
- Sổ dữ liệu + thư mục tệp TỰ TẠO trong thư mục Drive "Event FY68" (`EH.ROOT`) ở lần chạy đầu — ID ở Script Property `EH_BOOK` / `EH_FILES`.
- `parse_events.py` = bản Python của bộ đọc file kế hoạch (thử trên .xlsx), `ehParsePlan_` = bản JS chạy trên Google Sheet.
- `test_harness.js` = chạy thử `ehSync_` / `ehBoot_` / `ehSave_` / `ehUpload_` với bảng tính + Drive giả lập
  (cần `plans.json` xuất từ các file kế hoạch .xlsx — không đưa file thật vào kho).
- `MKT_EventHubLink.gs` (v1.2) = đọc file MKT Offline (REPORT_EVENT / PLAN_EVENT, đếm CUSTOMER LIST) + file Digital (EVENT REPORT, ORDER REPORT) theo sự kiện ⇒ tab MKT_LINK ⇒ `ehBoot.link` (tab "MKT Offline · Online" của app).
