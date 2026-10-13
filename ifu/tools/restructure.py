# Sắp xếp lại chương CRM / Report Hub theo khung: Dữ liệu (nguồn · cách lưu · lưu ở đâu) → Chức năng chính → điện thoại → quản lý.
# Nguồn: tools/10-crm.src.md, tools/20-report-hub.src.md (bản trước) ⇒ chapters/10-crm.md, chapters/20-report-hub.md
import re, os
T = os.path.dirname(os.path.abspath(__file__)); C = os.path.join(T, '..', 'chapters')
def parse(md):
    m = re.search(r'^## ', md, re.M); head, body = md[:m.start()], md[m.start():]
    secs = {}; order = []
    for part in re.split(r'(?m)^## ', body)[1:]:
        t, _, b = part.partition('\n'); secs[t.strip()] = b; order.append(t.strip())
    return head, secs, order
def subs(body):
    m = re.search(r'^### ', body, re.M)
    if not m: return body, {}, []
    intro, rest = body[:m.start()], body[m.start():]
    d = {}; o = []
    for part in re.split(r'(?m)^### ', rest)[1:]:
        t, _, b = part.partition('\n'); d[t.strip()] = b; o.append(t.strip())
    return intro, d, o
def demote(title, body):  # ## title + body ⇒ ### title, ### ⇒ ####
    return '### ' + title + '\n' + re.sub(r'(?m)^### ', '#### ', body)
def sub(title, body): return '### ' + title + '\n' + body
def pair(md, a, m):  # [[fig a | …]] ⇒ [[fig a, m | … (máy tính · điện thoại)]]
    pat = re.compile(r'\[\[fig ' + re.escape(a) + r' \| ([^\]]+?)\]\]')
    return pat.sub(lambda x: '[[fig ' + a + ', ' + m + ' | ' + x.group(1).rstrip('.') + ' — máy tính (trái) và điện thoại (phải).]]', md, count=1)

# ═══════════ CRM ═══════════
src = open(os.path.join(T, '10-crm.src.md'), encoding='utf-8').read()
head, S, order = parse(src)
dk_intro, DK, _ = subs(S['Dữ liệu và kết nối'])
dtc = S['Đơn hàng, thuyết trình, công việc trong tháng']; _, DTC, _ = subs(dtc)
kd = S['KPI & Mục tiêu, Dashboard']; _, KD, _ = subs(kd)
hb = S['Họp tuần, gửi báo cáo, xem ảnh']; _, HB, _ = subs(hb)
ql_intro, QL, qlo = subs(S['Dành cho quản lý và Admin'])
QL['Chế độ TEST (Admin)'] = '\n[[fig crm/test_flow, crm/m_test_flow | Chế độ TEST: thao tác dưới tên TEST, bảng Luồng dữ liệu cho biết mỗi lần lưu đi vào file nào, dòng nào, email lẽ ra gửi tới ai.]]\n\nAdmin thử mọi chức năng với dữ liệu **thật** dưới tên **TEST** (ảnh, công tác, duyệt công tác, báo cáo tuần / tháng / KPI, mở mới), email chỉ về Admin, người khác không thấy, không tính KPI. Cách dùng đầy đủ: **Chương 6**.\n\n'
qlo = [x if x != 'Chế độ thử (Admin)' else 'Chế độ TEST (Admin)' for x in qlo]
DATA = '''## Dữ liệu của CRM: nguồn, cách lưu, lưu ở đâu

Mỗi nhóm kinh doanh có **một file Google Sheet riêng** (file CRM nhóm). App không giữ dữ liệu: mọi thao tác trên máy tính hay điện thoại đều đi qua backend Apps Script của nhóm rồi ghi vào đúng tab trong file đó. Số liệu KPI, lịch, báo cáo đều đọc lại từ chính các tab này.

<div class="flow"><div><b>1 · Tạo / sửa trên app</b>Máy tính hoặc điện thoại. Màn hình cập nhật ngay, không phải chờ.</div><div><b>2 · Hàng đợi trên máy</b>Chữ đi trước, ảnh gửi sau; mất mạng thì giữ trên máy và tự gửi lại khi có mạng.</div><div><b>3 · Backend nhóm</b>Apps Script của file CRM nhóm kiểm tra, chống ghi trùng, ghi vào đúng tab và dòng.</div><div><b>4 · Đi tiếp</b>Tab 9. TARGET & KPI tự tính ⇒ file KPI FY68 · lịch · báo cáo tuần / tháng · email.</div></div>

| Dữ liệu | Tạo / sửa ở đâu trên app | Lưu ở (file ▸ tab) | Đi tiếp tới |
|---|---|---|---|
| **Lượt đi địa bàn**: account, kế hoạch, kết quả, trạng thái, bước tiếp theo | Lịch ▸ **+** / **Ghi nhanh** · thẻ ▸ **Báo kết quả** | File CRM nhóm ▸ **6. WEEKLY REPORT** | Lịch, Báo cáo tuần, Họp tuần, KPI Viếng thăm (C3) |
| **Ảnh đi địa bàn** + GPS | Thẻ đi địa bàn ▸ **Chụp ảnh** | Drive ▸ folder ảnh của nhóm (tên *PIC_ngày_account_STT.jpg*); link + GPS vào cột Photo / GPS của tab 6 | Xem ảnh đi địa bàn; điều kiện KPI "có ảnh" |
| **Khách hàng (account)** | **Khách hàng** ▸ thêm / sửa · Hồ sơ 360° | **1. CUSTOMER CODE** | Hồ sơ 360°, chọn account khi ghi việc |
| **Người liên hệ (CBC)** | **Key stakeholder** · Hồ sơ 360° | **2. CBC** | Lịch sử chăm sóc |
| **Đơn hàng** (Dental sale) | **Đơn hàng** ▸ **+ Đơn hàng mới** | **3. SALE ORDER** | KPI Bán hàng hỗ trợ (C5 – C7), Dashboard |
| **Thuyết trình / đào tạo khách hàng** | **Thuyết trình** ▸ **+ Thêm buổi** | **7. PRODUCT PRESENTATION** | KPI Sự kiện (C10) |
| **Công việc trong tháng** | **Công việc trong tháng** | **5. MONTHLY REPORT** | Báo cáo tháng |
| **ADP Key account** | **ADP Key account** | **8. ADP** | Dashboard |
| **Mở mới & SKU mới** + chứng từ | **Mở mới & SKU mới** ▸ **+ Thêm case** | **16. NEW ACCOUNT & SKU**; chứng từ ở Drive (tên *PIC_ngày_account_SKU*) | Quản lý duyệt ⇒ KPI Mở mới (C1) |
| **Công việc khác** | Lịch ▸ **Công việc khác** | **ALL TASK** (file CRM nhóm) | Báo cáo tuần / tháng (phần Công việc khác) |
| **Đề xuất · duyệt · báo cáo công tác** | **Đề xuất công tác** · **Duyệt công tác** · thẻ công tác | File **Business Trip** ▸ MMH Travel report; nhật ký tab **Business Trip Log** | MMH Calendar, email xin duyệt / phê duyệt |
| Đào tạo, sự kiện, bài đăng | Chỉ xem trên **MMH Calendar** | Training Master · MKT Offline · MKT Online | — |
| KPI | Chỉ xem: **KPI & Mục tiêu** | File **MMH_KPI_FY68** | Báo cáo KPI tháng, Setting Expectation |

:::rule Ai thấy dữ liệu nào
Sales thấy dữ liệu **của mình**; Team Leader thấy **cả nhóm**; quản lý (Admin, Director, HOD) **đổi nhóm** để xem mọi file CRM. Chuyến công tác của người khác ẩn, quản lý bật bằng công tắc trên lịch.
:::

'''
DATA += demote('Các tab trong file CRM của mỗi nhóm', DK['Các tab trong file CRM của mỗi nhóm']) + demote('Kết nối với hệ thống khác', DK['Kết nối với hệ thống khác'])
FN = '''## Chức năng chính

CRM gom việc của Sales vào năm nhóm chức năng; mỗi nhóm là một mục tiếp theo của chương này.

| Nhóm chức năng | Gồm | Mục |
|---|---|---|
| **Cập nhật địa bàn** | Hoạt động đi địa bàn (lịch, thêm task, báo kết quả, chụp ảnh) · thông tin khách hàng (account, người liên hệ, ADP, thuyết trình, mở mới) | 2.5 · 2.6 |
| **Thông tin đơn hàng** | Đơn hàng Dental sale theo tháng, theo PIC, theo nhóm sản phẩm | 2.7 |
| **MMH Calendar** | Kế hoạch của cá nhân / đội nhóm: đi địa bàn, công việc khác, kế hoạch & báo cáo công tác, lịch sự kiện, lịch bài đăng, lịch đào tạo | 2.8 |
| **Hệ thống báo cáo** | Báo cáo tuần, báo cáo tháng, họp tuần, báo cáo KPI tháng, tự đánh giá quý | 2.9 |
| **Biểu đồ thống kê** | Tiến độ công việc, KPI, Dashboard tổng quan, thống kê ảnh đi địa bàn | 2.10 |

'''
L = S['Lịch làm việc và thêm việc']; DI = S['Đi địa bàn, báo kết quả, chụp ảnh']
F1 = '## Cập nhật địa bàn: hoạt động đi địa bàn\n\nMỗi lần gặp khách là một **task đi địa bàn** trên lịch: tạo trước (kế hoạch), báo kết quả sau buổi gặp, kèm ảnh tại chỗ. Dữ liệu ghi vào tab **6. WEEKLY REPORT** của file CRM nhóm.\n\n' + demote('Lịch làm việc và thêm việc', L) + demote('Đi địa bàn, báo kết quả, chụp ảnh', DI)
KH = S['Khách hàng, người liên hệ, ADP']; MM = S['Mở mới địa bàn & SKU mới']
F2 = '## Cập nhật địa bàn: thông tin khách hàng\n\nThông tin khách hàng ở các tab **1. CUSTOMER CODE**, **2. CBC**, **8. ADP**, **7. PRODUCT PRESENTATION** và **16. NEW ACCOUNT & SKU**. Mọi lượt gặp, đơn hàng, buổi thuyết trình của một account được gom lại ở **Hồ sơ 360°**.\n\n' + re.sub(r'(?m)^### ', '### ', KH) + sub('Thuyết trình (Product Presentation)', DTC['Thuyết trình (Product Presentation)']) + demote('Mở mới địa bàn & SKU mới', MM)
F3 = '## Thông tin đơn hàng (Dental sale)\n\n' + DTC['Đơn hàng']
CK = S['Công việc khác và công tác']
F4 = '''## MMH Calendar: kế hoạch cá nhân và đội nhóm

Nút **MMH Calendar** trên thanh trên cùng mở lịch toàn màn hình. Lịch gom mọi kế hoạch theo màu: **đi địa bàn** (của mình hoặc cả đội), **công việc khác**, **công tác** (kế hoạch, chờ duyệt, đã duyệt, báo cáo), **đào tạo** (Training Hub), **sự kiện offline** và **bài đăng** (Marketing). Team Leader chọn **Cả đội** hoặc từng PIC.

[[fig crm/mmhcal, crm/m_mmhcal | MMH Calendar trong CRM: máy tính (trái) và điện thoại (phải).]]

| Loại lịch | Nguồn | Sửa ở đâu |
|---|---|---|
| Đi địa bàn | File CRM nhóm ▸ 6. WEEKLY REPORT | CRM (mục 2.5) |
| Công việc khác | File CRM nhóm ▸ ALL TASK | CRM ▸ Công việc khác |
| Công tác | File Business Trip | CRM ▸ Đề xuất / báo cáo công tác (bên dưới) |
| Đào tạo | Training Master | Training Hub / Report Hub |
| Sự kiện, bài đăng | MKT Offline / MKT Online | Report Hub ▸ MMH Calendar |

''' + re.sub(r'(?m)^### ', '### ', CK)
F5 = '## Hệ thống báo cáo: tuần, tháng, KPI\n\nBáo cáo được dựng **từ chính dữ liệu đã ghi** (đi địa bàn, công việc khác, công việc trong tháng, KPI), không phải gõ lại. Email gửi đúng người nhận theo sơ đồ tổ chức, kèm PDF.\n\n' + sub('Gửi báo cáo tuần / tháng', HB['Gửi báo cáo']) + sub('Công việc trong tháng', DTC['Công việc trong tháng']) + sub('Họp tuần', HB['Họp tuần']) + sub('KPI & Mục tiêu · Báo cáo KPI tháng · tự đánh giá quý', KD['KPI & Mục tiêu'])
F6 = '## Biểu đồ thống kê: tiến độ công việc, KPI\n\n' + sub('Dashboard', KD['Dashboard']) + sub('Xem ảnh đi địa bàn', HB['Xem ảnh đi địa bàn']) + '### Tiến độ công việc khác và KPI\n\nTab **Công việc khác** có ô tổng hợp key task, đầu việc con, đã hoàn thành, quá hạn và bảng tiến độ từng việc (mục 2.8). Biểu đồ **Xu hướng KPI theo tháng** và **Đóng góp theo nhóm KPI** ở trang KPI & Mục tiêu (mục 2.9, Chương 4).\n\n'
PH = S['Trên điện thoại'].rstrip() + '\n\n[[phones crm/m_orders, crm/m_newacc, crm/m_kpi | Đơn hàng, Mở mới & SKU mới, KPI & Mục tiêu trên điện thoại.]]\n\n[[phones crm/m_trip_propose, crm/m_send_report, crm/m_dashboard | Đề xuất công tác, Gửi báo cáo, Dashboard trên điện thoại.]]\n\n'
QLB = ql_intro + ''.join(sub(t, QL[t]) for t in qlo)
CH = '## Lịch sử cập nhật gần đây\n\n' + DK['Lịch sử cập nhật gần đây']
items = 'Ai dùng CRM, mở ở đâu; Dữ liệu: nguồn, cách lưu, lưu ở đâu; Bố cục màn hình; Chức năng chính; Cập nhật địa bàn: đi địa bàn; Cập nhật địa bàn: khách hàng; Đơn hàng; MMH Calendar; Hệ thống báo cáo; Biểu đồ thống kê; Trên điện thoại; Quản lý và Admin'
head = re.sub(r'(\| crm/cal_week \| )[^\]]+\]\]', r'\1' + items + ']]', head)
out = head + '## Ai dùng CRM, mở ở đâu\n' + S['Ai dùng CRM, mở ở đâu'] + DATA + '## Bố cục màn hình\n' + S['Bố cục màn hình'] + FN + F1 + F2 + F3 + F4 + F5 + F6 + '## Trên điện thoại\n' + PH + '## Dành cho quản lý và Admin\n' + QLB + CH
for a, m in [('crm/cust_profile','crm/m_cust_profile'),('crm/stakeholder','crm/m_stake'),('crm/adp','crm/m_adp'),('crm/orders','crm/m_orders'),('crm/presentation','crm/m_present'),
             ('crm/other_task','crm/m_other'),('crm/trip_propose','crm/m_trip_propose'),('crm/trip_approve','crm/m_trip_approve'),('crm/newacc_list','crm/m_newacc'),('crm/newacc_review','crm/m_newacc_review'),
             ('crm/dashboard','crm/m_dashboard'),('crm/weekly_meeting','crm/m_meet'),('crm/send_report','crm/m_send_report'),('crm/cust_list','crm/m_cust'),('crm/fieldvisit_result','crm/m_result'),('crm/cal_week','crm/m_cal')]:
    out = pair(out, a, m)
out = out.replace('[[fig crm/kpi_personal |', '[[fig crm/kpi_tab, crm/m_kpi |').replace('[[fig crm/monthly_tasks, crm/monthly_drawer |', '[[fig crm/monthly_tasks, crm/m_monthly |')
out = out.replace('[[fig crm/trip_card, crm/trip_report |', '[[fig crm/trip_report, crm/m_trip_report |')
open(os.path.join(C, '10-crm.md'), 'w', encoding='utf-8').write(out)

# ═══════════ REPORT HUB ═══════════
src = open(os.path.join(T, '20-report-hub.src.md'), encoding='utf-8').read()
head, S, order = parse(src)
dk_intro, DK, _ = subs(S['Dữ liệu và kết nối'])
DATA = '''## Dữ liệu của Report Hub: nguồn, cách lưu, lưu ở đâu

Report Hub không có cơ sở dữ liệu riêng: mỗi loại dữ liệu ghi thẳng vào **file Google Sheet nguồn** của nó qua backend Apps Script. Dữ liệu một phòng ban nằm ở file của phòng đó; công tác ở file Business Trip; sự kiện, bài đăng ở file Marketing; đào tạo, giao việc ở Training Master.

<div class="flow"><div><b>1 · Tạo / sửa trên app</b>Thẻ việc, lịch, khung đề xuất… cập nhật màn hình ngay.</div><div><b>2 · Hàng đợi ghi</b>Lệnh ghi chạy lần lượt, thử lại khi mất mạng, đổi số tạm sang số dòng thật.</div><div><b>3 · Backend đúng loại dữ liệu</b>Marketing · Management · Back Office · Business Trip · MKT Online / Offline · Training.</div><div><b>4 · Tổng hợp</b>Báo cáo tuần / tháng, MMH Calendar, KPI, email.</div></div>

| Dữ liệu | Tạo / sửa ở đâu trên app | Lưu ở (file ▸ tab) | Đi tiếp tới |
|---|---|---|---|
| **Key task / Sub-task**: PIC, ngày, hạn, trạng thái, %, kết quả | **+ Thêm việc** · thẻ việc ▸ Cập nhật · kiểu Bảng | File công việc của phòng (backend marketing / management / backoffice) ▸ tab theo dõi tuần | Lịch làm việc, Tiến độ, Tổng quan, Báo cáo tuần |
| **Hạng mục tháng** | **Monthly Report** | File của phòng ▸ tab báo cáo tháng | Báo cáo tháng |
| **Biên bản họp** | **Biên bản họp** | File của phòng ▸ tab biên bản | Email biên bản |
| **Giao việc** + trao đổi | Thêm việc cho người khác (tick email) · **Việc đã giao** | Training Master ▸ **RH_Assign** | Popup "Việc mới được giao", email |
| **Đề xuất · duyệt · báo cáo công tác** | **Đề xuất công tác** · **Duyệt công tác** · MMH Calendar ▸ chuyến | File **Business Trip** ▸ MMH Travel report; nhật ký **Business Trip Log** của từng backend | MMH Calendar, email |
| **Sự kiện offline** | MMH Calendar ▸ sự kiện ▸ Sửa | **MKT Offline** ▸ REPORT_EVENT | KPI Sự kiện, Người tham dự (C12, C15) |
| **Bài đăng, thiết kế** | MMH Calendar ▸ bài đăng ▸ Sửa | **MKT Online** ▸ EVENT / PRODUCT REPORT | KPI Digital & Design (C17) |
| **Buổi đào tạo** | MMH Calendar ▸ **Tạo mới ▸ Đào tạo** | **Training Master** ▸ sessions | Training Hub, KPI Đào tạo (L1, L2) |
| KPI | Chỉ xem: **KPI** | File **MMH_KPI_FY68** | Báo cáo KPI tháng, Total KPI |

'''
DATA += demote('Sơ đồ file nguồn', dk_intro)
FN = '''## Chức năng chính

| Nhóm chức năng | Gồm | Mục |
|---|---|---|
| **Cập nhật công việc** | Key task, sub task, tiến độ, kết quả, file tham chiếu, giao việc | 3.4 · 3.12 |
| **MMH Calendar** | Kế hoạch cá nhân / đội nhóm: lịch làm việc, kế hoạch & báo cáo công tác, sự kiện, bài đăng, đào tạo | 3.5 · 3.8 → 3.11 |
| **Hệ thống báo cáo** | Báo cáo tuần, Monthly Report, biên bản họp, báo cáo KPI tháng, tự đánh giá quý (Chương 4) | 3.7 |
| **Biểu đồ thống kê** | Tiến độ công việc, Tổng quan, Tình hình đội, KPI | 3.6 |

'''
AB = S['Ai dùng, bố cục màn hình']
REST = ['Cập nhật công việc: key task và sub task','Lịch làm việc, Pending, Today task','Tiến độ, Tổng quan, Tình hình đội','Báo cáo tuần, Monthly Report, biên bản họp','MMH Calendar','Sự kiện offline và bài đăng Marketing','Đào tạo trên lịch','Công tác','Giao việc và trao đổi','Nhắc việc, thông báo, quản trị']
REN = {'Lịch làm việc, Pending, Today task':'MMH Calendar: lịch làm việc, Pending, Today task','Tiến độ, Tổng quan, Tình hình đội':'Biểu đồ thống kê: tiến độ, tổng quan, tình hình đội',
       'Báo cáo tuần, Monthly Report, biên bản họp':'Hệ thống báo cáo: tuần, tháng, biên bản họp','MMH Calendar':'MMH Calendar: lịch chung của công ty','Công tác':'MMH Calendar: kế hoạch và báo cáo công tác'}
body = ''
for t in REST:
    b = S[t]
    if t == 'Nhắc việc, thông báo, quản trị':
        b = b.replace('[[phones rh/m_main, rh/m_calendar, rh/m_tour |', '[[phones rh/m_task_list, rh/m_mmh_cal, rh/m_tour |')
        b += '\n### Chế độ TEST (Admin)\n\n[[fig rh/test_flow, rh/m_test_flow | Chế độ TEST: thao tác dưới tên TEST, bảng Luồng dữ liệu cho biết dữ liệu đi vào file nào, dòng nào, email lẽ ra gửi tới ai.]]\n\nAdmin thử mọi chức năng với dữ liệu thật dưới tên **TEST**, đóng vai Giám đốc để duyệt công tác của TEST. Cách dùng: **Chương 6**.\n\n'
    body += '## ' + REN.get(t, t) + '\n' + b
items = 'Ai dùng, bố cục màn hình; Dữ liệu: nguồn, cách lưu, lưu ở đâu; Chức năng chính; Cập nhật công việc; MMH Calendar: lịch làm việc; Biểu đồ thống kê; Hệ thống báo cáo; MMH Calendar: lịch chung; Sự kiện, bài đăng; Đào tạo; Công tác; Giao việc; Nhắc việc, quản trị'
head = re.sub(r'(\| rh/work_cal_week \| )[^\]]+\]\]', r'\1' + items + ']]', head)
out = head + '## Ai dùng, bố cục màn hình\n' + AB + DATA + FN + body + '## Lịch sử cập nhật gần đây\n\n' + DK['Lịch sử cập nhật gần đây']
for a, m in [('rh/task_list','rh/m_task_list'),('rh/work_cal_week','rh/m_work_cal'),('rh/task_progress','rh/m_progress'),('rh/overview','rh/m_overview'),('rh/weekly_report','rh/m_weekly_report'),
             ('rh/monthly_report','rh/m_monthly'),('rh/minutes','rh/m_minutes'),('rh/mmh_cal_month','rh/m_mmh_cal'),('rh/training_detail','rh/m_training'),('rh/trip_propose','rh/m_trip_propose')]:
    out = pair(out, a, m)
out = out.replace('[[fig rh/trip_approve, rh/trip_approve_done |', '[[fig rh/trip_approve, rh/m_trip_approve |').replace('[[fig rh/assign_track, rh/assign_thread |', '[[fig rh/assign_track, rh/m_assign_track |')
open(os.path.join(C, '20-report-hub.md'), 'w', encoding='utf-8').write(out)
print('ok')
