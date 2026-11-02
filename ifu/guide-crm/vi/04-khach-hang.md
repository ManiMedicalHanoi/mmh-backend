---
number: 4
---
[[opener 4 | Địa bàn và khách hàng | Địa bàn (account) là phòng khám, bệnh viện, đại lý, NPP. Khách hàng (Key stakeholder) là người liên hệ tại địa bàn đó. CRM giữ cả hai, kèm lịch sử chăm sóc và kế hoạch ADP. | crmg/cust_profile | Danh sách địa bàn; Thêm địa bàn mới; Hồ sơ địa bàn; Khách hàng (Key stakeholder); ADP Key account; Dữ liệu được lưu ở đâu]]

## Danh sách địa bàn

:::split crmg/cust, crmg/m_cust | Địa bàn trên máy tính (trái) và điện thoại (phải, dạng thẻ).
Menu bên ▸ **Khách hàng ▸ Địa bàn** (điện thoại: nút **Địa bàn**).

- Mỗi dòng: tên, mã khách hàng, loại (Hospital, Clinic, University, Dealer, Distributor), tỉnh, PIC, số người liên hệ, số đơn.
- Ô tìm và bộ lọc theo loại, tỉnh, PIC, FY mở account.
- Bấm một dòng để mở **hồ sơ địa bàn**.

**Mã khách hàng** do công thức trong file tự sinh theo khu vực + tỉnh + loại khách hàng; không cần gõ.
:::split-end

## Thêm địa bàn mới

:::split.wide crmg/newacc_form | Form Thêm địa bàn mới, kèm người liên lạc đầu tiên.
Bấm **＋ Địa bàn mới** ở trang Địa bàn, hoặc ngay trong form đi địa bàn / đơn hàng (đang nhập dở không bị mất).

1. Nhập **tên địa bàn**, chọn **Account type**, **Province** (Area tự điền), địa chỉ, PIC, ngày mở account.
2. Phần **Người liên lạc đầu tiên (CBC)**: tên, điện thoại, chức danh, chuyên khoa. Người này được lưu luôn thành **Key stakeholder** của địa bàn.
3. **Lưu địa bàn**.

Tên trùng một địa bàn đã có (thường gặp với tên phòng khám): app liệt kê các địa bàn cùng tên ⇒ chọn **Dùng địa bàn này** (người liên lạc vừa nhập vẫn được lưu vào địa bàn đó) hoặc **Tạo địa bàn mới**.
:::split-end

## Hồ sơ địa bàn

:::split.wide crmg/cust_profile | Hồ sơ địa bàn: dòng thời gian bên trái, khối Mục tiêu & tình trạng ADP bên phải.
Hồ sơ gom mọi thứ của một địa bàn:

- **Dòng thời gian**: các lượt đi địa bàn, đơn hàng, buổi thuyết trình, theo thứ tự ngày;
- **Mục tiêu & tình trạng ADP** (cột phải): nhóm A–D, target / actual, Objective, Key action, review quý gần nhất;
- người liên hệ, doanh số theo tháng và theo sản phẩm, ngày gặp gần nhất.

Bấm **Sửa** để đổi thông tin địa bàn; thay đổi ghi vào tab 1 và nhật ký thay đổi.
:::split-end

## Khách hàng (Key stakeholder)

:::split crmg/stake, crmg/m_stake | Danh bạ khách hàng: số lần làm việc, lần gặp gần nhất, doanh số.
Menu bên ▸ **Khách hàng ▸ Khách hàng**: danh bạ người liên hệ (CBC) của mọi địa bàn.

- Tìm theo tên người, địa bàn, số điện thoại, chức vụ; lọc theo tỉnh, sự kiện.
- Chip **Chưa chăm sóc**, **Nhiều lần làm việc nhất**, **Doanh số cao nhất**.
- **＋ Thêm CBC**: thêm người liên hệ cho một địa bàn.

Người liên hệ **tự được thêm** khi:

- nhập người liên lạc đầu tiên lúc tạo địa bàn mới;
- gõ tên **người đặt đơn** mới trong form đơn hàng (Chương 5);
- ghi **lịch sử chăm sóc** với một người chưa có trong danh bạ.

App so theo tên (không phân biệt dấu) hoặc số điện thoại, người đã có thì không thêm trùng.
:::split-end

## ADP Key account

:::split crmg/adp, crmg/m_adp | ADP Key account: bảng theo nhóm A–D.
Menu bên ▸ **ADP Key account**: kế hoạch phát triển khách hàng trọng điểm.

- Mỗi account: nhóm **A–D**, phân tích, mục tiêu (Objective), chiến thuật, **Key action**, target / actual theo tháng;
- **review từng quý** (Q1–Q4) và cả năm;
- xem dạng bảng ABCD hoặc danh sách.
:::split-end

## Dữ liệu được lưu ở đâu

| Dữ liệu | Lưu ở (file CRM của nhóm ▸ tab) |
|---|---|
| Địa bàn (account) | **1. CUSTOMER CODE** |
| Người liên hệ (Key stakeholder) | **2. CBC** — cột cuối ghi ai tạo, lúc nào, từ màn hình nào |
| ADP Key account | **8. ADP** |
| Khách đến từ sự kiện | Đồng bộ từ [[sheet cust-data | file Data khách hàng]] (tab Khách từ Event) |

Nhóm Thailand Dental: tên tab không đánh số (CUSTOMER CODE, CBC, ADP). File của từng nhóm: [[sheet crm-dental | Dental]] · [[sheet crm-surgical | Surgical]] · [[sheet crm-eyeless | Eyeless]] · [[sheet crm-thai | Thailand Surgical]] · [[sheet crm-thai-dental | Thailand Dental]].
