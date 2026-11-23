# Khảo sát WG cuối quý (Google Form tiếng Anh + QR, kết quả về 1 Sheet cố định)

Backend `wg-survey` = script `1KIN3rm…` GẮN Sheet kết quả `152o_AWQa…` (yêu cầu của Giám đốc 23/11/2026, email "RE: WG" — Kusano san
muốn báo cáo quý nêu rõ bài học / phát hiện / thay đổi và cải thiện việc tham dự). Code: `backends/wg-survey/MMH_WgSurvey.gs`.

## Mỗi quý (sau buổi họp WG cuối cùng của quý)
1. Tạo form — 1 trong 2 cách:
   - Người dùng: mở Sheet ▸ menu **WG Survey ▸ Create survey for a new quarter…** ▸ nhập `Q2 FY68` + ngày họp (vd. `24 February`).
   - Claude: workflow **Kiểm tra** ▸ ping
     `wg-survey?action=wgCreate&key=<8 ký tự cuối ID Sheet>&q=Q2&fy=68&meet=24%20February&full=1`
     (`countries=` đổi danh sách quốc gia, `title=` đổi tiêu đề, `force=1` tạo form mới thay form cũ cùng quý).
2. Kết quả: Google Form TIẾNG ANH (Name · Country + 5 câu: Key Findings & Learning · Application & Changes · Good Points ·
   Challenges · Improvements & Support; lời mở đầu / lời kết theo mẫu `WG_TPL`, tự thay quý, quý sau, ngày họp),
   ai có link đều trả lời được (Thái Lan / Malaysia / Ấn Độ khác tên miền) ⇒ câu trả lời vào tab mới **`Q2 FY68 · Responses`**
   của Sheet; tab **WG SURVEYS** ghi link trả lời / link rút gọn / link sửa / tab kết quả / QR / trạng thái.
   Form + ảnh QR PNG nằm trong thư mục Drive **"WG Survey · Forms & QR"** cạnh Sheet.
3. Claude dựng thêm QR PNG + SVG trên máy (`python3 -m qrcode` / thư viện `qrcode`) từ `shortUrl`, gửi người dùng kèm nội dung email mời.
4. Đóng nhận câu trả lời: menu **WG Survey ▸ Close a survey…** hoặc ping `action=wgClose&key=…&q=Q1&fy=68` (`&open=1` mở lại).
   Danh sách: `action=wgList&key=…&full=1`.

Đổi câu hỏi cho các quý sau: sửa `WG_TPL` (chỉ ảnh hưởng form tạo SAU khi deploy; form cũ giữ nguyên). WG khác muốn dùng
cùng luồng: dùng `title=` + `countries=`, hoặc tách mẫu mới trong `WG_TPL`.
