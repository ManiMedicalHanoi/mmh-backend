---
number: 5
---
[[opener 5 | Đơn hàng | Áp dụng cho 3 nhóm Việt Nam (Dental, Surgical, Eyeless). Sales nhập đơn, gửi xác nhận; Trưởng bộ phận (HOD) duyệt. Chỉ đơn đã duyệt mới tính KPI bán hàng. Hai nhóm Thái Lan không có đơn hàng trên CRM. | crmg/orders | Trang Đơn hàng; Tạo đơn mới; Lịch sử chăm sóc; Người đặt đơn và dòng sản phẩm; Gửi xác nhận; Duyệt đơn (HOD); Yêu cầu chỉnh sửa; Dữ liệu được lưu ở đâu]]

## Trang Đơn hàng [[teams vn]]

:::split crmg/orders, crmg/m_orders | Trang Đơn hàng trên máy tính và điện thoại.
Menu bên ▸ **Kết quả bán hàng ▸ Đơn hàng** (điện thoại: nút **Đơn hàng**).

- **Số liệu**: số đơn, số khách (không trùng), số tiền tháng, lũy kế FY (không tính đơn bị từ chối), nhóm sản phẩm.
- **Danh sách** theo tháng: account, nhãn trạng thái (**Chờ duyệt · Đã duyệt · Từ chối**, thiếu chứng từ, chưa chọn loại), giá trị, ngày đặt.
- Bấm một đơn ⇒ **Chi tiết đơn hàng** (mọi dòng sản phẩm, chứng từ, lịch sử duyệt), nút **Sửa đơn**.
- Chấm đỏ ở menu Đơn hàng = số việc cần làm (đơn chờ bạn duyệt, đơn bị yêu cầu chỉnh sửa, đơn chưa gửi xác nhận).
:::split-end

[[fig crmg/order_detail | Chi tiết một đơn hàng.]]

## Tạo đơn mới

:::split.wide crmg/order_form | Form Đơn hàng mới.
Bấm **＋ Đơn hàng mới**.

1. Chọn **Account** (chưa có ⇒ **＋ Địa bàn mới**).
2. Kiểm tra dòng **Lịch sử chăm sóc** (mục 5.3).
3. Chọn / gõ **người đặt đơn** (mục 5.4).
4. Thêm **dòng sản phẩm**: Product type, chọn mã (Detail), **SL**, **Unit price**. Nhiều sản phẩm ⇒ **＋ Thêm sản phẩm**.
5. **Partner (NPP)** tự điền theo PIC (Dental: Viet → Nam Dũng, Vinh → S.P.I, Phuong chọn Meci / Việt Thái).
6. Chọn **Order Type** (1. trúng thầu · 2. NPP / đại lý · 3. tư vấn khách lẻ) và đưa **chứng từ**: kéo thả file, **Dán ảnh** chụp màn hình (Ctrl + V), hoặc **Chọn file**.
7. **Lưu**. Đơn mới ⇒ hệ thống tự email báo **HOD**.
:::split-end

## Lịch sử chăm sóc

:::split.wide crmg/order_care | Khách chưa có lịch sử chăm sóc ⇒ Thêm lịch sử chăm sóc ngay trong form đơn.
Đơn **mới** chỉ lưu được khi khách đã có **ít nhất 1 hoạt động Completed** (Visiting, Telephone, Message…) trong **30 ngày** trước ngày đặt.

Chưa có? Không cần thoát form:

1. Bấm **＋ Thêm lịch sử chăm sóc**.
2. Chọn **ngày chăm sóc**, **loại chăm sóc**, **người gặp**, ghi ngắn nội dung trao đổi (Visiting: thêm Customer feedback và Next action).
3. **Lưu lịch sử chăm sóc** ⇒ 1 dòng Completed được ghi ngay vào **6. WEEKLY REPORT**; người gặp chưa có trong danh bạ được thêm vào **Key stakeholder**.
4. Lưu đơn như bình thường. Đơn đang nhập giữ nguyên.
:::split-end

## Người đặt đơn và dòng sản phẩm

:::split.wide crmg/order_lines | Người liên lạc gõ tên mới; SL trước Unit price, giá có dấu chấm nghìn.
- **Người liên lạc**: chọn người có sẵn trong danh sách hoặc **gõ tên mới**. Người mới ⇒ điền thêm chức danh, SĐT; khi lưu đơn, người này tự được thêm vào **Key stakeholder** (tab 2. CBC) của địa bàn.
- Dòng sản phẩm: nhập **SL** trước, rồi **Unit price**. Giá hiện dấu chấm nghìn (200.000); **Amount** tự tính.
- Một dòng chọn nhiều mã cùng mức giá ⇒ SL và giá dùng chung cho cả dòng.
:::split-end

## Gửi xác nhận

:::split.wide crmg/order_bulk | Gửi xác nhận nhiều đơn một lần.
Đơn **Chờ duyệt** đủ điều kiện (có Order Type + chứng từ) cần **gửi xác nhận** tới người duyệt:

- Một đơn: nút **Gửi xác nhận** trên thẻ đơn.
- Nhiều đơn: **Gửi xác nhận nhiều đơn** ▸ tick từng đơn hoặc **Chọn tất cả** ▸ **Gửi**. Người duyệt nhận **1 email** liệt kê mọi đơn, ảnh chứng từ nhúng sẵn.

Đơn chưa đủ điều kiện hiện mờ kèm lý do (thiếu chứng từ, chưa chọn loại).
:::split-end

## Duyệt đơn (HOD)

:::split crmg/order_approve, crmg/m_order_approve | Màn hình Duyệt đơn hàng: từng đơn, xem chứng từ ngay.
Người duyệt (HOD) bấm link trong email hoặc **Duyệt đơn hàng** trên trang Đơn hàng:

- **Từng đơn**: thông tin, dòng sản phẩm, chứng từ (ảnh thu nhỏ, **Xem đủ trang**). Lật đơn bằng ‹ › hoặc vuốt.
- **Danh sách**: tick nhiều đơn ⇒ **Xác nhận** / **Không xác nhận** một lần.
- Link trong email mở thẳng đúng đơn, kể cả trên app email của điện thoại.

Sau khi duyệt, Sales nhận email kết quả. Đơn đã duyệt mà sửa (đổi, thêm, bớt sản phẩm) ⇒ cả đơn quay về **Chờ duyệt**.
:::split-end

## Yêu cầu chỉnh sửa

:::split.wide crmg/order_fix | Sales xem nhận xét của người duyệt và sửa đơn.
Người duyệt ghi **nhận xét riêng từng đơn** ⇒ **Gửi yêu cầu chỉnh sửa** (mỗi Sales nhận 1 email).

Phía Sales: hộp **Đơn hàng cần chỉnh sửa** tự mở một lần (hoặc nút **Xem nhận xét** trên dải vàng) ⇒ **Sửa đơn** ⇒ **Gửi xác nhận lại**.
:::split-end

## Dữ liệu được lưu ở đâu

| Dữ liệu | Lưu ở |
|---|---|
| Dòng đơn hàng (mỗi sản phẩm 1 dòng, cùng Order No.) | File CRM nhóm ▸ **3. SALE ORDER** ([[sheet crm-dental | Dental]] · [[sheet crm-surgical | Surgical]] · [[sheet crm-eyeless | Eyeless]]) |
| Loại đơn, chứng từ, trạng thái duyệt, ghi chú duyệt | Các cột cuối của **3. SALE ORDER** |
| File chứng từ | Google Drive ▸ thư mục **Sales Order docs** của nhóm |
| Email | Đơn mới ⇒ HOD · xin xác nhận ⇒ người duyệt · kết quả / yêu cầu chỉnh sửa ⇒ Sales |

:::rule KPI bán hàng chỉ tính đơn đã duyệt
**C5** (doanh số hỗ trợ), **C6** (Composite), **C7** (JIZAI) chỉ cộng đơn **Đã duyệt**; tháng tính theo **ngày đặt**. Đơn cũ trước 10/2026 không phân loại vẫn tính như trước.
:::
