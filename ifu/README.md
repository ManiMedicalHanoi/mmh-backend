# IFU · Hướng dẫn sử dụng hệ thống dữ liệu nội bộ MMH

Bộ công cụ dựng **sách hướng dẫn sử dụng (PDF khổ A4, bố cục sách)** cho MMH CRM, MMH Report Hub, KPI và Training Hub.
Nội dung viết bằng Markdown; phiên bản app, danh sách backend, đường link (Google Sheet · Apps Script · /exec · GitHub)
và lịch sử cập nhật được **đọc tự động** từ các repo lúc dựng ⇒ hệ thống thay đổi thì chỉ cần dựng lại.

## Dựng sách

```bash
cd ifu && npm install            # marked, pagedjs, playwright, sharp (Chromium của Playwright đã có sẵn trong môi trường Claude)
node build.mjs all               # sách đầy đủ   → dist/MMH_IFU_He_thong_du_lieu.pdf
node build.mjs crm|rh|kpi|th     # từng phần      → dist/MMH_IFU_0x_<App>.pdf
```

Repo app phải được clone cạnh `mmh-backend` (mặc định `../../MMH-CRM`, `../../MMH-Report`, `../../Training-Hub`, xem `config.json`).
Đường dẫn khác: tạo `config.local.json` (không đưa lên git), ví dụ
`{"repos":{"crm":"/home/user/MMH-CRM","rh":"/home/user/MMH-Report","kpi":"/home/user/MMH-Report","th":"/home/user/manimedicalhanoi/training-hub"}}`.

## Cấu trúc

| Thư mục / file | Nội dung |
|---|---|
| `book.json` | Tên sách, các bản dựng (`all`, `crm`, `rh`, `kpi`, `th`) và thứ tự chương |
| `chapters/*.md` | Nội dung: `00` cách dùng tài liệu · `01` nền tảng chung · `10` CRM · `20` Report Hub · `30` KPI · `40` Training Hub · `90` phụ lục |
| `shots/<crm\|rh\|th>/*.jpg` | Ảnh chụp thật từ app, **dữ liệu giả lập** |
| `capture/` | Kịch bản chụp ảnh (Playwright + backend giả lập): `crm.js` + `crm_mock.js`, `rh/cap_ifu.js` (dùng mock của MMH-Report), `th/cap.js` + `th/fixtures.js` |
| `theme/book.css` | Bố cục sách (Paged.js): bìa, mục lục có số trang, mở chương, tiêu đề chạy, hình, hộp Mẹo / Lưu ý |
| `build.mjs` | Markdown → HTML → Paged.js → PDF (link bấm được, bookmark) |

## Mã rút gọn trong chapters/*.md

| Mã | Kết quả |
|---|---|
| `[[opener 2 \| Tiêu đề \| Mô tả \| crm/cal_week \| mục 1; mục 2]]` | Trang mở chương |
| `[[fig crm/cal_week \| Chú thích]]` · `[[fig a, b \| …]]` | Hình (1 hoặc nhiều ảnh cạnh nhau), tự đánh số *Hình x.y* |
| `[[phones crm/m_today, crm/m_cal \| …]]` | Ảnh điện thoại có khung |
| `[[backend crm-dental]]` | Thẻ backend với nút Mở Google Sheet · Mở Apps Script · Web app · Mã nguồn (đọc từ `backends.json`) |
| `[[app crm]]` · `[[ver crm]]` | Thẻ app (phiên bản, link, backend) · số phiên bản hiện tại |
| `[[changelog crm 6]]` · `[[backends]]` | Lịch sử cập nhật (từ `updates/notes.js` của app) · bảng toàn bộ backend |
| `[[icon googlesheets]]` · `[[key Ctrl+K]]` | Biểu tượng thật · phím tắt |
| `:::tip Tiêu đề` … `:::` (tip · note · warn · rule) | Hộp Mẹo · Lưu ý · Quan trọng · Quy tắc |

## Khi hệ thống thay đổi

1. Sửa chương liên quan trong `chapters/` (tính năng mới ⇒ thêm mục + ảnh).
2. Giao diện đổi ⇒ chụp lại bằng `capture/` (sửa mock nếu cần), lưu JPG vào `shots/<app>/` cùng tên.
3. `node build.mjs all` → kiểm tra PDF (ảnh không trống, không có cảnh báo *thiếu ảnh*).
4. Gửi PDF mới cho người dùng; không đưa PDF lên repo app công khai (PDF có link tới dữ liệu thật của công ty).

Kịch bản chụp được viết trong phiên dựng ban đầu: vài đường dẫn tuyệt đối ở đầu file (`/home/claude/ifu`, `/home/user/...`) cần chỉnh theo máy đang chạy.

## Bản PPT giới thiệu (đi kèm IFU)

`ppt/build_ppt.py` dựng file PPT giới thiệu hệ thống theo đúng thứ tự IFU (Nền tảng → CRM → Report Hub → KPI → Training Hub),
template MMH, ảnh lấy từ `shots/`, ghi chú thuyết trình ở mọi slide; **cuối mỗi slide có link "Chi tiết: IFU x.y · trang n"**.
Link IFU và số trang khai báo ở đầu file (`IFU_FOLDER`, `IFU_FILE`, `PAGE`): khi có link từng file PDF trên Drive hoặc số trang đổi sau khi dựng lại IFU,
sửa ở đó rồi chạy lại. Cần `style_c.py` (đi kèm) và template `MMH_PPT_TEMPLATE.pptx` của skill mmh-brand (đường dẫn ở đầu file).
