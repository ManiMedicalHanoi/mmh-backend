# Thầu nhãn khoa của NPP — cấu trúc file iCare / Hùng Vĩ

Nguồn: file Excel người dùng tải từ 2 Google Sheet (03/11/2026). Chỉ ghi tiêu đề / quy ước — không chép dữ liệu thật.

| | iCare (miền Nam) | Hùng Vĩ (miền Bắc) |
|---|---|---|
| backend | `tender-icare` | `tender-hungvi` |
| Google Sheet | `1VfJVBJ4XTTOnjF2z3ZyZAq9PTIeIvB8Nf5a8fikT9Zs` (gid 864862640) | `1N42yeU1hSOMZT9BgVPZ8x625BGaNI705u5REkc1Uzx8` (gid 602792007) |
| Tên file | 3. Tender Authorization list MMH- ICARE FY66 | 1.3 Tender Authorization list MMH- Hung Vi FY66 |
| Script | `Mã.gs` 595 dòng + `frontend.html` (dashboard) — feed đọc cơ bản | `Mã.gs` 1.309 dòng "v7 FULL" — feed + forecast + kế hoạch địa bàn + đồng bộ tender tổng |
| Sheet chính | **Tender FY65-67** — tiêu đề dòng 9, dữ liệu từ dòng 10 | **Tender FY66** — tiêu đề dòng 7, dữ liệu từ dòng 8 |
| ~ số dòng (11/2026) | ~150 | ~425 |

## Sheet chính (Tender FY65-67 / Tender FY66)

Dòng trên tiêu đề: B = "Tender informations", L = "Document from MMH", S = "Result of Tender"; ô `=counta(D…)` đếm số dòng.
iCare dòng 1–4 có thêm bảng tổng hợp (pivot) số gói + `SUM of Total Amount` theo Result.

| Cột iCare | Cột HV | Tiêu đề | Ghi chú |
|---|---|---|---|
| B | B | No. | công thức `=row()-7` |
| C | C | Số thông báo mời thầu (TBMT) | nhiều dòng / gói; hậu tố `-01`, `-02` = cùng gói |
| D | D | Hospital name | dropdown ← `Master Hospital name!C5:C` |
| E | E | City | dropdown ← `Master Hospital name!H5:H`; dòng sau hay `=E<dòng trên>` |
| F–K | F–K | Address · Ngày hiệu lực · Ngày hết hạn · Name of tender · Project name · The company authorized from distributor | dòng sau của cùng gói = công thức tham chiếu dòng trên |
| L | L | Singed date yyyymmdd | số `yyyymmdd`, đôi khi ngày / chuỗi dd/MM/yyyy |
| M | M | FY | ⚠ HV tiêu đề ô M bị gõ " l" — code dùng chỉ số cứng `HARD.fy = 12` |
| N | N | Month | `yyyyMM`; iCare dropdown chuỗi cố định, HV ← `Master Hospital name!M5:M` |
| O | O | Product code | dao = mã bắt đầu `M` (MST / MSL / MCU…, có thể nhiều mã "MSL22, MSL28"); mã số (1406…) = chỉ khâu |
| P–R | P–R | Quantity · Price (VND) · Unit | Unit dropdown "Cái,Sợi" (phần MMH chào) |
| S | S | Result of Tender | Win / Fail / Cancel / Pending ← `Master Hospital name!J5:J8` |
| — | T | Brand | chỉ HV, gần như trống |
| T–W | U–X | Product · Quantity · Price (VND) · Unit | phần **trúng thầu** (thường `=O…` / `=P…` khi giống phần chào) |
| X | Y | Total Amount KVND | công thức `=Quantity × Price` |
| Y | Z | Ngày phê duyệt gói thầu | `yyyymmdd` |
| Z | AA | Thời gian thực hiện gói thầu (Tháng) | "12 tháng" / 12 / 24 / trống (= 12) |
| AA | AB | Note | |
| AB | AC | Ten folder | công thức `=L&" "&D` |
| AC | AD | Link document | |
| — | AE | Check | trống |

Code dò cột theo tên tiêu đề (`COL_ALIASES`), cột trùng tên (Product / Quantity / Price / Unit) lấy lần xuất hiện thứ 1 = phần chào, thứ 2 = phần trúng.

## Sheet khác

- **Master Hospital name** (cả 2): tiêu đề dòng 4 — B STT · C Name · D/E Provinces / Address / Region · F Type; H = danh sách tỉnh chuẩn; J = trạng thái thầu (Fail / Win / Pending / Cancel); HV có M = danh sách tháng `yyyyMM`.
  iCare: C Name · D Provinces · E Region (Miền Bắc / Trung / Nam) · F Type (Bệnh viện / Trung tâm y tế). HV: C Name · D Address · E Provinces · F Type (Tender / Non-tender). Code HV `addMaster` ghi vào đây.
- **FC_LOG** (ẩn, cả 2): rowKey · group · account · tbmt · region · potential · dur · expMonth · mst · msl · mcu · note · updatedBy · ts — chỉnh forecast từ dashboard (`saveLog` / `clearLog` / `deleteLog`).
- **ACCT_PLAN** (ẩn, HV — code tạo khi cần): kế hoạch địa bàn theo BV × kỳ (`acctPlan` / `saveAcctPlan` / `delAcctPlan`).
- **Tender FY65** (iCare hiện, HV ẩn): bảng cũ, tiêu đề dòng 6, KHÔNG có cột TBMT (B No. · C Hospital … W Note).
- iCare **Detail1-Win**: bảng tay các dòng Win (tiêu đề dòng 1, như sheet chính bỏ dòng trên + "Quantity 2 / Price (VND) 2 / Unit 2").
- iCare **CHECK FY68**: bảng tay — Thời gian kết thúc gói thầu · Phân bổ doanh số kỳ 68 / FY69 / FY70 · Cần listing kỳ 68 (có / không) · Tháng listing trước 6 tháng kết thúc · Cơ hội cao / thấp.

## Đồng bộ sang file "tender tổng" (chỉ HV, `SYNC` trong `Mã.gs`)

Đích: Spreadsheet `1lI1s1nEyRtSluQiCJu2sdkgZdP38A35qYFdzOvVXE7I`, sheet **Data xử lý** (gid 1603394577, tiêu đề dòng 2).
Lấy dòng Win + mã dao MSL / MST / MCU + có TBMT; TBMT chưa có ở cột "KQTT Code" ⇒ thêm dòng, tô vàng. `?action=syncPreview` (thử) / `syncTender`.

## File tender tổng — KQTT dao toàn quốc (backend `tender-kqtt`, 04/11/2026)

Spreadsheet `1lI1s1nEyRtSluQiCJu2sdkgZdP38A35qYFdzOvVXE7I` ▸ **Data xử lý** (gid 1603394577). Dòng 1 = "Thời gian xuất dữ liệu: …", dòng 2 = tiêu đề, dữ liệu từ dòng 3
(~1.000 dòng 01/2023 – 05/2026, mọi hãng dao). Sheet phụ: **Master_Dao** (Hãng · Xuất xứ · Loại dao · Mã sản phẩm · Phân khúc giá), `_Calc` (ẩn, số tổng).

| Tiêu đề | Ghi chú |
|---|---|
| No. · Product Name · Unit · Quantity · Country of Origin · HS Code · Product Code · Brand Label · Manufacturer · Model | thông tin hàng trúng (mọi hãng) |
| Registration / Import License Number · Year of Manufacture · Technical Specification | dài, web không đọc Technical Specification |
| Awarded Unit Price (VND) | đơn giá trúng |
| **KQTT Code** | số TBMT (IB…) — web dùng để bỏ trùng với file NPP iCare / Hùng Vĩ |
| Buyer (Hospital / Health Facility) · Procurement Method · Award Publication Date · Decision Number · Decision Issue Date · Number of Bidders · Location | ngày lẫn kiểu Date / chuỗi dd/MM/yyyy |
| Year · **Month** (mm/yyyy) · Manufacturer_Norm · Region · Price_Tier · Province_Clean · Region_by_Distributor · Knife Type (Slit / Stab / Cresent / MVR) | cột đã chuẩn hoá |
| Contract Duration (Month) · Expiration date · check · count | `check` = khoá chống trùng (TBMT + tên + SL + mã) |

Đọc: `tender-hungvi ?action=kqttMap[&from=202209]` (`MMH_KqttMap.gs`). Thử: workflow **Kiểm tra** ▸ ping `tender-hungvi?action=kqttMap`.
