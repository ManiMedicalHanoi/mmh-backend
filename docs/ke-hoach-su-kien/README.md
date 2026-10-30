# File "Kế hoạch & tiến độ sự kiện" (1 file chung cho mọi sự kiện)

- `Ke_hoach_su_kien_MMH.xlsx` — file mẫu (dữ liệu ví dụ). Tải lên Drive ⇒ Google Trang tính, đặt cạnh file
  "2. Vietnam - Marketing Offline FY68" (chủ script marketing phải sửa được file).
- `build_plan.py` — dựng lại file mẫu: `python3 build_plan.py Ke_hoach_su_kien_MMH.xlsx`.
  Công thức trong file mẫu PHẢI giống `epEvF_` / `epTaskF_` của `backends/marketing/MKT_EventPlan.gs`.
- Đồng bộ: `MKT_EventPlan.gs` (gọi trong `evsSyncTick`, 10 phút / lần) — điền ID file vào `EP.ID`.
- `test_harness.js` — chạy thử `epSync` với bảng tính giả lập (đọc `tpl.json` xuất từ file mẫu; sửa đường dẫn trước khi chạy).
