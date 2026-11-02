---
number: 2
---
[[opener 2 | Lịch và đi địa bàn | Màn hình dùng nhiều nhất: lên lịch gặp khách, ghi kết quả ngay sau buổi gặp, chụp ảnh tại chỗ. Mỗi lượt đi địa bàn là một dòng trong file CRM của nhóm. | crmg/cal_month | Xem lịch; Thêm lượt đi địa bàn; Ghi kết quả (4 ô); Hoàn thành và ngày kết thúc; Ảnh đi địa bàn; Quy tắc và KPI viếng thăm; Dữ liệu được lưu ở đâu]]

## Xem lịch

:::split.wide crmg/home | Lịch tuần: mỗi thẻ là một việc, màu theo loại (đi địa bàn, việc khác, công tác, đào tạo).
Menu bên ▸ **Đi địa bàn** (điện thoại: nút **Lịch**).

- **Tuần / Tháng / Danh sách**: đổi kiểu xem. **‹ ›** chuyển tuần, **Hôm nay** quay về tuần này.
- Dải số liệu trên cùng: số lượt đi địa bàn, việc khác, ngày công tác trong tuần.
- Chip lọc: bật / tắt **Đi địa bàn · Việc khác · Công tác · Đào tạo**, **Ẩn việc đã xong**, **Đang thực hiện**, **Việc quá hạn**.
- Team Leader và quản lý: chip **Cả đội** hoặc chọn từng PIC.
- Bấm một thẻ để mở chi tiết, sửa, báo kết quả.
:::split-end

[[fig crmg/cal_month, crmg/cal_list | Xem theo tháng (trái) và danh sách (phải).]]

## Thêm lượt đi địa bàn

:::split crmg/add_menu, crmg/visit_new | Bấm ＋ dưới một ngày (trái) ▸ form Thêm task đi địa bàn (phải).
1. Trên lịch, bấm **＋ Thêm việc** dưới một ngày (hoặc nút **＋ Thêm việc** góc trên; điện thoại: nút tròn **＋**). Chọn **Đi địa bàn**.
2. **Account**: bấm để xem danh sách hoặc gõ để lọc. Khách chưa có ⇒ **＋ Địa bàn mới** (mục 4.2).
3. **Type task / Sales Process / Product group** tự điền theo lần gặp gần nhất với account đó; chỉ cần kiểm tra lại.
4. **Type action**: Visiting, Telephone, Message…
5. **Plan**: việc dự định làm (không bắt buộc).
6. Mới lên kế hoạch ⇒ để **Task Status = To Do / Not Started** ▸ **Lưu**.

Khung đóng ngay; dữ liệu ghi vào Google Sheet ở nền. Mất sóng vẫn không mất: app tự gửi lại khi có mạng.
:::split-end

## Ghi kết quả: 4 ô bắt buộc

:::split crmg/visit_result, crmg/m_visit_result | Task Result gồm 4 ô (máy tính) · Báo kết quả trên điện thoại.
Sau buổi gặp, mở thẻ (điện thoại: **Báo kết quả**):

1. Bấm **CBC — người gặp** để chọn người đã gặp trong danh bạ khách hàng. Dòng **Người gặp:** là bắt buộc.
2. Điền **đủ 4 ô** của **Task Result**:
   - **Actions Taken**: đã làm gì;
   - **Current Situation**: tình hình hiện tại của khách;
   - **Customer Feedback**: khách nói gì;
   - **Opportunities / Next Steps**: cơ hội, bước tiếp theo.
3. Chọn **Customer feedback** và **Next action**.
4. Chọn **Task Status = Completed** ▸ **Lưu**.

Mỗi ô có nút **Nói** để đọc thay gõ. Việc **Completed** thiếu ô nào, app tô đỏ ô đó và không cho lưu.
:::split-end

## Hoàn thành và ngày kết thúc

:::split crmg/visit_finish | Khi chuyển Completed cho việc của ngày trước, chọn ngày task kết thúc.
Khi chuyển **Completed** cho một việc của **ngày trước**, app hỏi **Task này kết thúc vào**:

- **Ngày đã chọn** (mặc định): giữ đúng ngày của task;
- **Hôm nay**: task kết thúc hôm nay;
- **Ngày khác**: chọn một ngày trong quá khứ.

Ngày được lưu đúng như bạn chọn, không tự đổi sang hôm nay. Việc chưa tới ngày (ngày trong tương lai) không thể chuyển Completed.
:::split-end

## Ảnh đi địa bàn [[teams vn]]

:::split crmg/m_photo, crmg/photos | Chụp ảnh trong thẻ đi địa bàn (trái) · thư viện Ảnh đi địa bàn (phải).
Áp dụng cho **Dental VN, Surgical VN, Eyeless VN**. Hai nhóm Thái Lan không chụp ảnh.

1. Mở thẻ đi địa bàn (điện thoại: nút **Chụp ảnh** trên thẻ hôm nay).
2. Chụp ảnh tại chỗ. App lấy vị trí GPS và giờ chụp.
3. Ảnh gửi ở nền **sau khi chữ đã lưu**; mất sóng thì giữ trên máy, có mạng tự gửi.

Menu ▸ **Ảnh đi địa bàn**: xem lại mọi ảnh theo PIC / tháng, thống kê, xuất PowerPoint / Excel.

:::rule Ảnh là điều kiện tính KPI viếng thăm
Lượt **Visiting · Completed** chỉ tính KPI khi **có ảnh**.
:::
:::split-end

## Quy tắc và KPI viếng thăm

| Quy tắc | Chi tiết |
|---|---|
| **Visiting chuyển Completed** | Cần đủ Task Result (4 ô + người gặp), Customer feedback và Next action |
| **KPI viếng thăm (C3)** | Chỉ đếm lượt **Visiting · Completed**, ngày không sau hôm nay, **có ảnh** (nhóm VN), không phải dòng TBD |
| **Next action = Dừng lại** | Phải ghi **Lý do dừng** |
| **Kế hoạch tuần sau (TBD)** | Dental VN, Surgical VN: khi gửi báo cáo tuần phải có kế hoạch tuần sau (dòng TBD nếu chưa rõ account). Eyeless VN: không bắt buộc. |
| **Đổi ngày** | Sửa ngày trong thẻ; lệnh chưa gửi được app giữ lại và gửi lại, không mất thay đổi |

## Dữ liệu được lưu ở đâu

| Dữ liệu | Nhóm | Lưu ở (file ▸ tab) |
|---|---|---|
| Lượt đi địa bàn: account, kế hoạch, kết quả, trạng thái, next action, ảnh, GPS | Dental VN | [[sheet crm-dental | MMH_Dental_CRM]] ▸ **6. WEEKLY REPORT** |
| | Surgical VN | [[sheet crm-surgical | MMH_Surgical_CRM]] ▸ **6. WEEKLY REPORT** |
| | Eyeless VN | [[sheet crm-eyeless | MMH_Eyeless_CRM]] ▸ **6. WEEKLY REPORT** |
| | Thailand Surgical | [[sheet crm-thai | FY68_Thailand_Surgical_CRM]] ▸ **6. CUSTOMER VISITING** |
| | Thailand Dental | [[sheet crm-thai-dental | Thailand Dental Action FY68]] ▸ **CUSTOMER VISITING** |
| Ảnh đi địa bàn | 3 nhóm VN | Google Drive, thư mục ảnh của nhóm (tên file *PIC_ngày_account*); link ảnh ghi vào cột Photo của tab 6 |

Từ tab này, số liệu đi tiếp tới: lịch, báo cáo tuần, họp tuần, Dashboard và tab **9. TARGET & KPI** (KPI viếng thăm) ⇒ file KPI FY68.
