# -*- coding: utf-8 -*-
"""File chung: Kế hoạch & tiến độ sự kiện MMH (mọi sự kiện, Owner giao việc, Dashboard)."""
import datetime as dt, sys, json, hashlib
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.label import DataLabelList

OUT = sys.argv[1]
TODAY = dt.date(2026, 10, 30)
F = 'Arial'
NAVY, BLUE, GRAY = '003047', '3A5CAA', '5B6B7B'
SOFT, INPUT = 'F0F7FF', 'FFF7D6'
RED, AMBER, GREEN, MUTE = 'FDE4E1', 'FFF4D6', 'EAF6EE', 'B0B8C2'
thin = Side(style='thin', color='D5DCE4')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
def font(**k): k.setdefault('name', F); k.setdefault('size', 10); return Font(**k)
def fill(c): return PatternFill('solid', start_color=c, end_color=c)
WR = Alignment(wrap_text=True, vertical='center')
CEN = Alignment(horizontal='center', vertical='center', wrap_text=True)

wb = Workbook()
def sheet(n, first=False):
    ws = wb.active if first else wb.create_sheet(); ws.title = n; ws.sheet_view.showGridLines = False; return ws
def name(n, ref): wb.defined_names[n] = DefinedName(n, attr_text=ref)
def title(ws, t, sub=None):
    ws['A1'] = t; ws['A1'].font = font(size=16, bold=True, color=NAVY); ws.row_dimensions[1].height = 26
    if sub: ws['A2'] = sub; ws['A2'].font = font(size=9, italic=True, color=GRAY)
def header(ws, row, cols, edit=(), start=1):
    for i, (h, w) in enumerate(cols):
        c = ws.cell(row, start + i, h)
        c.font = font(bold=True, color='FFFFFF', size=9); c.fill = fill(BLUE if i in edit else NAVY)
        c.alignment = CEN; c.border = BOX
        if w is not None: ws.column_dimensions[c.column_letter].width = w
    ws.row_dimensions[row].height = 32
def dv_list(ws, items, rng):
    d = DataValidation(type='list', formula1='"' + ','.join(items) + '"', allow_blank=True); ws.add_data_validation(d); d.add(rng)
def dv_ref(ws, ref, rng, strict=True):
    d = DataValidation(type='list', formula1=ref, allow_blank=True, showErrorMessage=strict)
    if not strict: d.errorStyle = 'warning'
    ws.add_data_validation(d); d.add(rng)

STATUS = ['Chưa làm', 'Đang làm', 'Chờ đối tác', 'Xong', 'Bỏ qua']
ROLES = ['MKT Leader', 'Digital MKT', 'Trade MKT', 'Sales', 'NPP / đối tác', 'Giám đốc']

wsD = sheet('Dashboard', first=True)
wsX = sheet('Điều phối')
wsG = sheet('Giao việc')
wsE = sheet('Sự kiện')
wsN = sheet('Nhật ký')
wsT = sheet('Mẫu việc')
wsC = sheet('Cài đặt')
wsH = sheet('Hướng dẫn')

# ═════════ Cài đặt
C = wsC
title(C, 'CÀI ĐẶT', 'Danh sách người (để chọn ở cột Người phụ trách) · người mặc định theo vai trò (dùng khi tạo việc cho sự kiện mới) · ngày nghỉ lễ.')
header(C, 4, [('Vai trò', 18), ('Người mặc định', 22)], edit={1})
PEOPLE = [('Leader MKT (ví dụ)', 'Marketing'), ('Digital (ví dụ)', 'Marketing'), ('Trade (ví dụ)', 'Marketing'),
          ('Sales Dental (ví dụ)', 'Sales'), ('Sales Surgical (ví dụ)', 'Sales'), ('NPP (ví dụ)', 'Đối tác'), ('Giám đốc (ví dụ)', 'BGĐ')]
DEF = {'MKT Leader': PEOPLE[0][0], 'Digital MKT': PEOPLE[1][0], 'Trade MKT': PEOPLE[2][0], 'Sales': PEOPLE[3][0],
       'NPP / đối tác': PEOPLE[5][0], 'Giám đốc': PEOPLE[6][0]}
for i, r_ in enumerate(ROLES):
    C.cell(5 + i, 1, r_).border = BOX; c = C.cell(5 + i, 2, DEF[r_]); c.fill = fill(INPUT); c.border = BOX
header(C, 4, [('Danh sách người', 24), ('Bộ phận', 12), ('Email (để nhắc việc sau này)', 28)], edit={0, 1, 2}, start=4)
C.column_dimensions['C'].width = 3
for i in range(40):
    r = 5 + i
    for j in range(3): c = C.cell(r, 4 + j); c.border = BOX; c.fill = fill(INPUT)
    if i < len(PEOPLE): C.cell(r, 4, PEOPLE[i][0]); C.cell(r, 5, PEOPLE[i][1])
header(C, 4, [('Ngày nghỉ lễ (T2–T6)', 18)], edit={0}, start=8)
C.column_dimensions['G'].width = 3
HOL = ['2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-04-27', '2026-04-30', '2026-05-01',
       '2026-09-02', '2026-09-03', '2026-09-04', '2027-01-01', '2027-04-30', '2027-09-02']
for i in range(60):
    c = C.cell(5 + i, 8); c.border = BOX; c.fill = fill(INPUT); c.number_format = 'dd/mm/yyyy'
    if i < len(HOL): c.value = dt.date.fromisoformat(HOL[i])
C['H66'] = '2027: thêm Tết, Giỗ Tổ, nghỉ bù khi có lịch MMH.'; C['H66'].font = font(size=8, italic=True, color=GRAY)
dv_ref(C, "'Cài đặt'!$D$5:$D$44", 'B5:B10')
name('PEOPLE', "'Cài đặt'!$D$5:$D$44"); name('HOLI', "'Cài đặt'!$H$5:$H$64")
C.freeze_panes = 'A5'

# ═════════ Mẫu việc
T = wsT
title(T, 'MẪU VIỆC CHO 1 SỰ KIỆN',
      'Theo SOP MMHSOP_0XX. Sự kiện mới được tạo việc theo bảng này (sửa / thêm / xoá dòng tuỳ ý — chỉ áp cho sự kiện tạo SAU khi sửa). D − n = ngày lịch, D + n = ngày làm việc.')
L_, W_ = 'Lịch', 'Làm việc'
TPL = [
 # mã, hạng mục, việc, vai trò, phối hợp, số ngày, tính theo, áp dụng
 ('K01', '1. Kế hoạch', 'Lập kế hoạch tổng quan (KOL, số khách, mục đích, KPI bán hàng, khuyến mại, khảo sát) + xin Giám đốc duyệt ngân sách', 'MKT Leader', 'Sales, NPP', -30, L_, 'Tất cả'),
 ('K02', '1. Kế hoạch', 'Chia việc với NPP, Trường / Viện (tuyển sinh, đồ thực hành, MC, số bàn trưng bày)', 'MKT Leader', 'NPP, Viện', -30, L_, 'Tất cả'),
 ('K03', '2. KOL & đối tác', 'Chốt KOL: hợp đồng, lịch di chuyển, xem trước bài giảng, người chăm sóc KOL', 'MKT Leader', 'KOL', -30, L_, 'Tất cả'),
 ('K04', '3. Tuyển sinh', 'Mở tuyển sinh: form đăng ký (khảo sát trước, đồng ý dữ liệu, nguồn đăng ký) + nhóm Zalo khách', 'Digital MKT', 'Sales, NPP', -30, L_, 'Tất cả'),
 ('K05', '3. Tuyển sinh', 'Báo cáo số đăng ký theo nguồn cho team (thứ Hai hằng tuần, đến D-1)', 'MKT Leader', 'Sales, NPP', -1, L_, 'Tất cả'),
 ('K06', '3. Tuyển sinh', 'Checkpoint D-14: đăng ký < 60% target ⇒ báo Giám đốc phương án', 'MKT Leader', 'Giám đốc', -14, L_, 'Tất cả'),
 ('K07', '3. Tuyển sinh', 'Sales / NPP gửi đủ thông tin khách đăng ký hộ (Họ tên · SĐT · Nơi công tác)', 'Sales', 'NPP', -5, L_, 'Tất cả'),
 ('K08', '4. Truyền thông', 'Đăng chuỗi bài truyền thông sự kiện', 'Digital MKT', 'Sales, NPP chia sẻ', -14, L_, 'Tất cả'),
 ('K09', '5. Địa điểm & hậu cần', 'Đặt địa điểm (ngày, phòng, sức chứa, báo giá)', 'Trade MKT', 'Địa điểm', -30, L_, 'Trực tiếp'),
 ('K10', '5. Địa điểm & hậu cần', 'Chốt setup với địa điểm: sơ đồ, tea break / ăn trưa, kỹ thuật, sự kiện khác cùng giờ', 'Trade MKT', 'Địa điểm', -14, L_, 'Trực tiếp'),
 ('K11', '5. Địa điểm & hậu cần', 'Webinar: tạo phòng Zoom (đăng ký, ghi hình, báo cáo người tham dự)', 'Digital MKT', 'KOL', -30, L_, 'Webinar'),
 ('K12', '6. Nội dung', 'Timeline chi tiết ngày D', 'MKT Leader', 'KOL, Viện', -7, L_, 'Tất cả'),
 ('K13', '6. Nội dung', 'Kịch bản MC, kịch bản phát biểu, video trình chiếu', 'Digital MKT', 'KOL, Viện', -7, L_, 'Tất cả'),
 ('K14', '7. Ấn phẩm & đồ', 'Thiết kế & in: backdrop, standee, thẻ đeo, bảng tên, folder, QR khảo sát, biểu mẫu check-in ký tay', 'Digital MKT', 'Trade MKT', -7, L_, 'Trực tiếp'),
 ('K15', '7. Ấn phẩm & đồ', 'Đồ marketing + đồ thực hành theo phiên (nguồn, báo giá, đồ mượn)', 'Trade MKT', 'KOL, NPP', -10, L_, 'Trực tiếp'),
 ('K16', '7. Ấn phẩm & đồ', 'VIP / đại biểu (nếu có Viện): danh sách, hoa, bảng tên mica, quà, lời giới thiệu', 'Trade MKT', 'Viện', -7, L_, 'Trực tiếp'),
 ('K17', '7. Ấn phẩm & đồ', 'Gửi đồ đi tỉnh + xác nhận địa điểm nhận đủ', 'Trade MKT', 'Địa điểm', -7, L_, 'Ngoài Hà Nội'),
 ('K18', '8. Chốt trước D', 'Họp với NPP: agenda, nhân sự, bán hàng, sản phẩm', 'MKT Leader', 'NPP, Sales', -3, L_, 'Tất cả'),
 ('K19', '8. Chốt trước D', 'Rà soát dữ liệu khách (thiếu thông tin / chưa đồng ý dữ liệu)', 'Digital MKT', 'Sales, NPP', -3, L_, 'Tất cả'),
 ('K20', '8. Chốt trước D', 'Phân công nhân sự trước / trong / sau, giờ có mặt', 'MKT Leader', 'Sales, NPP', -3, L_, 'Tất cả'),
 ('K21', '8. Chốt trước D', 'Họp review D-1 + gọi nhắc khách + set up địa điểm / chạy thử Zoom', 'MKT Leader', 'Toàn team', -1, L_, 'Tất cả'),
 ('K22', '9. Ngày D', 'Check-in có chữ ký + đồng ý dữ liệu (webinar: xuất báo cáo Zoom ngay sau buổi)', 'Digital MKT', 'Trade, NPP', 0, L_, 'Tất cả'),
 ('K23', '9. Ngày D', 'Điều phối chương trình, khảo sát QR trước bế mạc, ảnh / video', 'MKT Leader', 'Digital MKT', 0, L_, 'Tất cả'),
 ('K24', '9. Ngày D', 'Bán hàng tại bàn trưng bày + ghi khách quan tâm', 'Sales', 'NPP', 0, L_, 'Trực tiếp'),
 ('K25', '9. Ngày D', 'Thu dọn, kiểm đếm, ghi POSM hỏng', 'Trade MKT', 'NPP', 0, L_, 'Trực tiếp'),
 ('K26', '10. Sau sự kiện', 'Bài cảm ơn + ảnh recap; video recap (nếu có)', 'Digital MKT', '', 2, W_, 'Tất cả'),
 ('K27', '10. Sau sự kiện', 'Scan biểu mẫu ký tay + upload ảnh / video lên folder sự kiện', 'Trade MKT', 'Digital MKT', 2, W_, 'Trực tiếp'),
 ('K28', '10. Sau sự kiện', 'Đối chiếu dữ liệu khách (loại trùng, đủ trường) ⇒ CUSTOMER LIST; tổng hợp khảo sát', 'Digital MKT', 'Sales, NPP', 3, W_, 'Tất cả'),
 ('K29', '10. Sau sự kiện', 'Sales + NPP gửi số liệu bán hàng tại sự kiện', 'Sales', 'NPP', 3, W_, 'Tất cả'),
 ('K30', '10. Sau sự kiện', 'Bàn giao danh sách khách cần follow-up cho Sales', 'Digital MKT', 'Sales', 3, W_, 'Tất cả'),
 ('K31', '10. Sau sự kiện', 'Báo cáo sự kiện + chứng từ KOL, hoá đơn địa điểm', 'MKT Leader', 'Trade MKT', 5, W_, 'Tất cả'),
 ('K32', '10. Sau sự kiện', 'Email báo cáo toàn MMH (4 file đính kèm) + hoàn tất lưu hồ sơ', 'MKT Leader', '', 7, W_, 'Tất cả'),
 ('K33', '11. Follow-up', 'Sales liên hệ lần đầu khách cần follow-up', 'Sales', 'NPP', 5, W_, 'Tất cả'),
 ('K34', '11. Follow-up', 'Sales báo kết quả chuyển đổi đơn hàng', 'Sales', 'NPP', 20, W_, 'Tất cả'),
]
header(T, 4, [('Mã', 6), ('Hạng mục', 18), ('Việc', 64), ('Vai trò mặc định', 14), ('Phối hợp', 16), ('Số ngày so với D', 9), ('Tính theo', 10), ('Áp dụng cho', 11)],
       edit=set(range(8)))
for i in range(80):
    r = 5 + i
    if i < len(TPL):
        for j, v in enumerate(TPL[i]): T.cell(r, 1 + j, v)
    for j in range(8):
        c = T.cell(r, 1 + j); c.border = BOX; c.alignment = WR if j in (2,) else Alignment(vertical='center'); c.font = font(size=9)
dv_list(T, ROLES, 'D5:D84'); dv_list(T, [L_, W_], 'G5:G84'); dv_list(T, ['Tất cả', 'Trực tiếp', 'Webinar', 'Ngoài Hà Nội'], 'H5:H84')
T.freeze_panes = 'D5'

# ═════════ Sự kiện
E = wsE
ER0, ERN = 5, 304
title(E, 'DANH SÁCH SỰ KIỆN',
      'Cột xám TỰ ĐỒNG BỘ từ file "2. Vietnam - Marketing Offline FY68" (PLAN_EVENT + REPORT_EVENT, 10 phút / lần). '
      'Cột xanh: Owner chọn ĐỘI cho từng sự kiện ⇒ mọi việc tự giao theo vai trò (đổi người ở đây ⇒ việc chưa giao tay đổi theo).')
ECOLS = [('Mã SK', 11), ('Tên sự kiện', 36), ('Ngày D', 10), ('Ngày kết thúc', 10), ('Loại sự kiện', 12), ('Hình thức', 9), ('Địa điểm', 12),
         ('KOL', 14), ('Nguồn', 8), ('Trạng thái (file Offline)', 12),
         ('Owner (MKT Leader)', 16), ('Digital', 14), ('Trade', 14), ('Sales', 14), ('Đầu mối NPP / đối tác', 16), ('Theo dõi', 8),
         ('Việc', 6), ('Xong', 6), ('Quá hạn', 7), ('Chưa giao', 7), ('%', 6), ('Tiến độ', 13), ('Thời gian', 13), ('_k', 3)]
header(E, 4, ECOLS, edit={10, 11, 12, 13, 14, 15})
TEAMCOL = {'MKT Leader': 'K', 'Digital MKT': 'L', 'Trade MKT': 'M', 'Sales': 'N', 'NPP / đối tác': 'O'}
SAMPLE_EV = [
    ('Hội thảo nha khoa tháng 10 (ví dụ)', '2026-10-17', '', 'Hội thảo', 'Trực tiếp', 'Hà Nội', 'KOL A', 'REPORT', 'Done', 0),
    ('Khoá học nội nha thực hành – Hà Nội (ví dụ)', '2026-11-08', '', 'Workshop', 'Trực tiếp', 'Hà Nội', 'KOL B', 'PLAN', 'Confirmed', 0),
    ('Webinar phục hồi Composite (ví dụ)', '2026-11-20', '', 'Webinar', 'Webinar', 'Zoom', 'KOL C', 'PLAN', 'Confirmed', 0),
    ('Hội thảo nhãn khoa – Đà Nẵng (ví dụ)', '2026-12-12', '2026-12-13', 'Hội thảo', 'Trực tiếp', 'Đà Nẵng', 'KOL D', 'PLAN', 'Planning', 1),
    ('Workshop phẫu thuật – TP.HCM (ví dụ)', '2027-01-16', '', 'Workshop', 'Trực tiếp', 'TP.HCM', 'KOL E', 'PLAN', 'Planning', 2),
]
EVK = []; TEAMS = {}
GV = lambda c: f"'Giao việc'!${c}$5:${c}$3004"
for i in range(ERN - ER0 + 1):
    r = ER0 + i
    if i < len(SAMPLE_EV):
        nm, s, e, tp, ht, pl, kol, src, st, var = SAMPLE_EV[i]
        k = 'VD-' + str(i + 1)
        team = {'MKT Leader': PEOPLE[0][0], 'Digital MKT': PEOPLE[1][0], 'Trade MKT': PEOPLE[2][0],
                'Sales': PEOPLE[4][0] if var == 1 else PEOPLE[3][0], 'NPP / đối tác': '' if var == 2 else PEOPLE[5][0]}
        TEAMS[k] = team
        EVK.append((k, nm, dt.date.fromisoformat(s), dt.date.fromisoformat(e or s), ht, pl))
        vals = [k, nm, dt.date.fromisoformat(s), dt.date.fromisoformat(e) if e else None, tp, ht, pl, kol, src, st,
                team['MKT Leader'], team['Digital MKT'], team['Trade MKT'], team['Sales'], team['NPP / đối tác'], 'Có']
        for j, v in enumerate(vals): E.cell(r, 1 + j, v)
    E[f'Q{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("O")},A{r},{GV("J")},"<>Bỏ qua"))'
    E[f'R{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("O")},A{r},{GV("J")},"Xong"))'
    E[f'S{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("O")},A{r},{GV("M")},"*QUÁ HẠN*"))'
    E[f'T{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("O")},A{r},{GV("M")},"*CHƯA GIAO*"))'
    E[f'U{r}'] = f'=IF(OR(A{r}="",N(Q{r})=0),"",R{r}/Q{r})'
    E[f'V{r}'] = f'=IF(U{r}="","",REPT("█",ROUND(U{r}*10,0))&REPT("░",10-ROUND(U{r}*10,0)))'
    E[f'W{r}'] = (f'=IF(C{r}="","Chưa có ngày",IF(C{r}>TODAY(),"Còn "&(C{r}-TODAY())&" ngày",'
                  f'IF(IF(D{r}="",C{r},D{r})>=TODAY(),"Đang diễn ra","Đã qua "&(TODAY()-IF(D{r}="",C{r},D{r}))&" ngày")))')
    E[f'X{r}'] = f'=IF(AND(A{r}<>"",P{r}="Có",ISNUMBER(C{r})),IF(IF(D{r}="",C{r},D{r})>=TODAY()-35,C{r}+ROW()/100000,""),"")'
    for j in range(24):
        c = E.cell(r, 1 + j); c.border = BOX; c.alignment = Alignment(vertical='center', wrap_text=(j == 1))
        c.font = font(size=9, color=GRAY) if j in (0, 8, 9) else font(size=9)
        if 10 <= j <= 15: c.fill = fill(INPUT)
    E[f'C{r}'].number_format = 'dd/mm/yy'; E[f'D{r}'].number_format = 'dd/mm/yy'; E[f'U{r}'].number_format = '0%'
    E[f'V{r}'].font = font(size=9, color=BLUE)
E.column_dimensions['X'].hidden = True
dv_ref(E, 'PEOPLE', f'K{ER0}:O{ERN}', strict=False); dv_list(E, ['Có', 'Không'], f'P{ER0}:P{ERN}')
E.conditional_formatting.add(f'A{ER0}:W{ERN}', FormulaRule(formula=[f'$P{ER0}="Không"'], font=Font(color=MUTE, name=F)))
E.conditional_formatting.add(f'K{ER0}:O{ERN}', FormulaRule(formula=[f'AND($A{ER0}<>"",$P{ER0}="Có",K{ER0}="")'], fill=fill('F6C9A8')))
E.conditional_formatting.add(f'S{ER0}:S{ERN}', FormulaRule(formula=[f'N(S{ER0})>0'], fill=fill(RED), font=Font(color='C0392B', bold=True, name=F)))
E.conditional_formatting.add(f'T{ER0}:T{ERN}', FormulaRule(formula=[f'N(T{ER0})>0'], fill=fill(AMBER), font=Font(bold=True, name=F)))
E.freeze_panes = 'C5'; E.auto_filter.ref = f'A4:W{ERN}'
for n_, c_ in [('SK_A', 'A'), ('SK_B', 'B'), ('SK_C', 'C'), ('SK_D', 'D'), ('SK_TD', 'P')]:
    name(n_, f"'Sự kiện'!${c_}${ER0}:${c_}${ERN}")
EK = lambda c: f"'Sự kiện'!${c}${ER0}:${c}${ERN}"

# ═════════ Giao việc
Gv = wsG
GR0, GRN = 5, 3004
title(Gv, 'GIAO VIỆC & THEO DÕI',
      'Người phụ trách tự điền theo ĐỘI của sự kiện (tab Sự kiện); Owner đổi riêng từng việc ở cột G nếu cần. Người làm cập nhật Trạng thái + Ghi chú — '
      'chọn "Xong" thì Ngày xong tự điền, cột Cập nhật ghi giờ + người sửa. Lọc cột G để xem việc của mình.')
GCOLS = [('Sự kiện', 28), ('Ngày D', 8), ('Mốc', 7), ('Hạng mục', 14), ('Việc cần làm', 46), ('Vai trò', 11), ('Người phụ trách', 17),
         ('Phối hợp / đối tác', 14), ('Hạn', 9), ('Trạng thái', 12), ('Ngày xong', 9), ('Ghi chú / link', 24), ('Cảnh báo', 22), ('Cập nhật', 11),
         ('_sk', 4), ('_ma', 4), ('_n', 4), ('_t', 4), ('_sort', 4), ('_td', 4), ('_auto', 4), ('_sel', 4)]
header(Gv, 4, GCOLS, edit={6, 7, 8, 9, 10, 11})
def g_formulas(r):
    Gv[f'A{r}'] = f'=IF(O{r}="","",IFERROR(INDEX(SK_B,MATCH(O{r},SK_A,0))&"",""))'
    Gv[f'B{r}'] = f'=IF(O{r}="","",IFERROR(INDEX(SK_C,MATCH(O{r},SK_A,0)),""))'
    Gv[f'C{r}'] = f'=IF(Q{r}="","",IF(Q{r}=0,"D",IF(Q{r}<0,"D"&Q{r},"D+"&Q{r})))'
    end = f'IFERROR(IF(INDEX(SK_D,MATCH(O{r},SK_A,0))="",B{r},INDEX(SK_D,MATCH(O{r},SK_A,0))),B{r})'
    Gv[f'I{r}'] = f'=IF(OR(B{r}="",Q{r}=""),"",IF(Q{r}>0,IF(R{r}="Làm việc",WORKDAY({end},Q{r},HOLI),{end}+Q{r}),B{r}+Q{r}))'
    parts = (f'IF(G{r}=""," · CHƯA GIAO","")&IF(NOT(ISNUMBER(I{r})),"",IF(TODAY()>I{r}," · QUÁ HẠN "&(TODAY()-I{r})&" ngày",'
             f'IF(I{r}-TODAY()<=3," · Đến hạn "&IF(I{r}=TODAY(),"hôm nay","trong "&(I{r}-TODAY())&" ngày"),"")))'
             f'&IF(J{r}="Chờ đối tác"," · Chờ đối tác"&IF(ISNUMBER(N{r})," "&(TODAY()-INT(N{r}))&" ngày",""),"")')
    Gv[f'M{r}'] = (f'=IF(E{r}="","",IF(J{r}="Bỏ qua","—",IF(J{r}="Xong",IF(AND(ISNUMBER(K{r}),ISNUMBER(I{r}),K{r}>I{r}),"Xong trễ","Xong"),'
                   f'MID({parts},4,200))))')
    Gv[f'S{r}'] = f'=IF(AND(E{r}<>"",T{r}="Có",J{r}<>"Xong",J{r}<>"Bỏ qua",ISNUMBER(I{r})),I{r}+ROW()/100000,"")'
    Gv[f'T{r}'] = f'=IF(O{r}="","",IFERROR(INDEX(SK_TD,MATCH(O{r},SK_A,0)),""))'
    Gv[f'V{r}'] = f'=IF(AND(O{r}<>"",O{r}=SEL_K,J{r}<>"Xong",J{r}<>"Bỏ qua"),IF(ISNUMBER(I{r}),I{r},99999)+ROW()/100000,"")'

def wday_add(d, n):
    hol = {dt.date.fromisoformat(x) for x in HOL}; cur = d; k = 0
    while k < n:
        cur += dt.timedelta(days=1)
        if cur.weekday() < 5 and cur not in hol: k += 1
    return cur
import random
random.seed(7)
rows = []
for k, nm, s, e, ht, pl in EVK:
    for (ma, grp, job, role, co, n, unit, app) in TPL:
        if app == 'Ngoài Hà Nội':
            if ht != 'Trực tiếp' or 'Hà Nội' in pl: continue
        elif app != 'Tất cả' and app != ht: continue
        due = s + dt.timedelta(days=n) if n <= 0 else (wday_add(e, n) if unit == W_ else e + dt.timedelta(days=n))
        auto = TEAMS[k].get(role, DEF.get(role, ''))
        who = auto
        st, done, stamp = 'Chưa làm', None, None
        if due < TODAY:
            x = random.random()
            st = 'Xong' if x < 0.82 else ('Đang làm' if x < 0.93 else 'Chưa làm')
            if st == 'Xong':
                done = due - dt.timedelta(days=random.choice([0, 0, 1, 2])) if random.random() < 0.85 else due + dt.timedelta(days=1)
                stamp = dt.datetime.combine(done, dt.time(16, 30))
        elif (due - TODAY).days <= 7:
            st = random.choice(['Đang làm', 'Đang làm', 'Chưa làm', 'Chờ đối tác'])
            stamp = dt.datetime.combine(TODAY - dt.timedelta(days=random.choice([1, 2, 4, 6])), dt.time(10, 15))
        if k == 'VD-2' and ma == 'K10': st, stamp = 'Chờ đối tác', dt.datetime(2026, 10, 24, 9, 0)
        if k == 'VD-2' and ma == 'K15': who = PEOPLE[5][0]    # Owner giao riêng việc này cho NPP
        rows.append((grp, job, role, who, co, st, done, stamp, k, ma, n, unit, auto))
for i in range(GRN - GR0 + 1):
    r = GR0 + i
    if i < len(rows):
        grp, job, role, who, co, st, done, stamp, k, ma, n, unit, auto = rows[i]
        Gv[f'D{r}'] = grp; Gv[f'E{r}'] = job; Gv[f'F{r}'] = role; Gv[f'G{r}'] = who or None; Gv[f'H{r}'] = co
        Gv[f'J{r}'] = st; Gv[f'K{r}'] = done; Gv[f'N{r}'] = stamp
        Gv[f'O{r}'] = k; Gv[f'P{r}'] = ma; Gv[f'Q{r}'] = n; Gv[f'R{r}'] = unit; Gv[f'U{r}'] = auto or None
    if i < 700:
        g_formulas(r)
        for j in range(14):
            c = Gv.cell(r, 1 + j); c.border = BOX; c.alignment = Alignment(vertical='center', wrap_text=(j in (0, 4, 11, 12)))
            c.font = font(size=9, color=GRAY) if j in (1, 2, 5, 12, 13) else font(size=9)
        Gv[f'B{r}'].number_format = 'dd/mm'; Gv[f'I{r}'].number_format = 'dd/mm/yy'; Gv[f'K{r}'].number_format = 'dd/mm/yy'
        Gv[f'N{r}'].number_format = 'dd/mm hh:mm'
        Gv[f'M{r}'].font = font(size=9, bold=True, color=GRAY); Gv[f'G{r}'].fill = fill(INPUT)
for col in 'OPQRSTUV': Gv.column_dimensions[col].hidden = True
dv_ref(Gv, 'PEOPLE', f'G{GR0}:G{GRN}', strict=False); dv_list(Gv, STATUS, f'J{GR0}:J{GRN}')
d = DataValidation(type='date', operator='greaterThan', formula1='40000', allow_blank=True); Gv.add_data_validation(d); d.add(f'K{GR0}:K{GRN}')
R = f'A{GR0}:N{GRN}'
Gv.conditional_formatting.add(R, FormulaRule(formula=[f'$J{GR0}="Bỏ qua"'], font=Font(color=MUTE, name=F)))
Gv.conditional_formatting.add(R, FormulaRule(formula=[f'ISNUMBER(SEARCH("QUÁ HẠN",$M{GR0}))'], fill=fill(RED)))
Gv.conditional_formatting.add(R, FormulaRule(formula=[f'ISNUMBER(SEARCH("Đến hạn",$M{GR0}))'], fill=fill(AMBER)))
Gv.conditional_formatting.add(R, FormulaRule(formula=[f'$J{GR0}="Chờ đối tác"'], fill=fill('EFEAF7')))
Gv.conditional_formatting.add(R, FormulaRule(formula=[f'LEFT($M{GR0},4)="Xong"'], fill=fill(GREEN)))
Gv.conditional_formatting.add(f'G{GR0}:G{GRN}', FormulaRule(formula=[f'AND($E{GR0}<>"",$G{GR0}="")'], fill=fill('F6C9A8')))
Gv.conditional_formatting.add(f'G{GR0}:G{GRN}', FormulaRule(formula=[f'AND($G{GR0}<>"",$U{GR0}<>"",$G{GR0}<>$U{GR0})'], font=Font(bold=True, color=BLUE, name=F)))
Gv.conditional_formatting.add(f'A{GR0}:A{GRN}', FormulaRule(formula=[f'$A{GR0}<>$A{GR0 - 1}'], font=Font(bold=True, color=NAVY, name=F)))
Gv.conditional_formatting.add(f'M{GR0}:M{GRN}', FormulaRule(formula=[f'ISNUMBER(SEARCH("QUÁ HẠN",$M{GR0}))'], font=Font(bold=True, color='C0392B', name=F)))
Gv.freeze_panes = 'F5'; Gv.auto_filter.ref = f'A4:N{GRN}'

# ═════════ Nhật ký
NK = wsN
NR0, NRN = 5, 504
title(NK, 'NHẬT KÝ TRAO ĐỔI · QUYẾT ĐỊNH · THAY ĐỔI',
      'Owner ghi lại mọi điều đã thống nhất với đối tác (NPP, Viện, KOL, địa điểm), quyết định, thay đổi, vướng mắc — 1 dòng / lần. Hiện ở tab Điều phối của sự kiện.')
NCOLS = [('Ngày', 10), ('Sự kiện', 30), ('Loại', 14), ('Nội dung', 46), ('Với ai', 16), ('Người ghi', 14), ('Việc tiếp theo · ai làm', 30), ('Hạn', 10), ('Trạng thái', 10), ('_sel', 4)]
header(NK, 4, NCOLS, edit=set(range(9)))
NSAMPLE = [
    ('2026-10-20', 1, 'Thống nhất với đối tác', 'NPP nhận tuyển 20 khách + cử 2 người hỗ trợ thực hành', 'NPP (ví dụ)', 'Leader MKT (ví dụ)', 'Gửi NPP link form · Digital', '2026-10-22', 'Xong'),
    ('2026-10-24', 1, 'Vướng mắc', 'Địa điểm chưa xác nhận số suất ăn trưa', 'Khách sạn', 'Trade (ví dụ)', 'Gọi lại chốt số suất · Trade', '2026-10-31', 'Mở'),
    ('2026-10-27', 1, 'Thay đổi', 'KOL đổi giờ bài giảng chiều sang 13:30', 'KOL B', 'Leader MKT (ví dụ)', 'Sửa timeline + kịch bản MC · Digital', '2026-11-01', 'Mở'),
    ('2026-10-28', 1, 'Quyết định', 'Giám đốc duyệt thêm 5 suất FOC cho Viện', 'Giám đốc', 'Leader MKT (ví dụ)', '', '', 'Xong'),
    ('2026-10-29', 2, 'Thống nhất với đối tác', 'KOL gửi slide trước 10/11', 'KOL C', 'Leader MKT (ví dụ)', 'Nhắc KOL ngày 08/11 · Leader', '2026-11-08', 'Mở'),
]
for i in range(NRN - NR0 + 1):
    r = NR0 + i
    if i < len(NSAMPLE):
        d_, ev, tp, nd, w_, by, nx, dl, st = NSAMPLE[i]
        NK[f'A{r}'] = dt.date.fromisoformat(d_); NK[f'B{r}'] = SAMPLE_EV[ev][0]; NK[f'C{r}'] = tp; NK[f'D{r}'] = nd; NK[f'E{r}'] = w_
        NK[f'F{r}'] = by; NK[f'G{r}'] = nx; NK[f'H{r}'] = dt.date.fromisoformat(dl) if dl else None; NK[f'I{r}'] = st
    NK[f'J{r}'] = f'=IF(AND(B{r}<>"",B{r}=SEL_N,ISNUMBER(A{r})),A{r}+ROW()/100000,"")'
    for j in range(9):
        c = NK.cell(r, 1 + j); c.border = BOX; c.font = font(size=9); c.alignment = Alignment(vertical='center', wrap_text=(j in (1, 3, 6)))
    NK[f'A{r}'].number_format = 'dd/mm/yy'; NK[f'H{r}'].number_format = 'dd/mm/yy'
NK.column_dimensions['J'].hidden = True
dv_ref(NK, 'SK_B', f'B{NR0}:B{NRN}'); dv_list(NK, ['Thống nhất với đối tác', 'Quyết định', 'Thay đổi', 'Vướng mắc'], f'C{NR0}:C{NRN}')
dv_list(NK, ['Mở', 'Xong'], f'I{NR0}:I{NRN}'); dv_ref(NK, 'PEOPLE', f'F{NR0}:F{NRN}', strict=False)
NK.conditional_formatting.add(f'A{NR0}:I{NRN}', FormulaRule(formula=[f'AND($I{NR0}="Mở",ISNUMBER($H{NR0}),TODAY()>$H{NR0})'], fill=fill(RED)))
NK.conditional_formatting.add(f'A{NR0}:I{NRN}', FormulaRule(formula=[f'$I{NR0}="Xong"'], font=Font(color=GRAY, name=F)))
NK.freeze_panes = 'C5'; NK.auto_filter.ref = f'A4:I{NRN}'
NKR = lambda c: f"'Nhật ký'!${c}${NR0}:${c}${NRN}"

# ═════════ Điều phối (1 sự kiện)
X = wsX
title(X, 'ĐIỀU PHỐI 1 SỰ KIỆN', 'Chọn sự kiện ở ô vàng ⇒ toàn cảnh kế hoạch & thực hiện: thẻ tổng · bản đồ tiến độ · từng bên · việc cần theo dõi · nhật ký với đối tác.')
for col, w in zip('ABCDEFGHIJKL', [28, 11, 11, 11, 11, 11, 11, 11, 11, 12, 22, 2]): X.column_dimensions[col].width = w
X['A3'] = 'Chọn sự kiện ▸'; X['A3'].font = font(size=11, bold=True, color=NAVY); X['A3'].alignment = Alignment(horizontal='right', vertical='center')
X.merge_cells('B3:G3'); X['B3'] = SAMPLE_EV[1][0]; X['B3'].fill = fill(INPUT); X['B3'].font = font(size=12, bold=True, color=NAVY)
X['B3'].border = BOX; X.row_dimensions[3].height = 26
dv_ref(X, 'SK_B', 'B3')
X['H3'] = '=IFERROR(INDEX(SK_A,MATCH(B3,SK_B,0)),"")'; X['H3'].font = font(size=8, color=MUTE)
name('SEL_K', "'Điều phối'!$H$3"); name('SEL_N', "'Điều phối'!$B$3")
EV = lambda c: f'IFERROR(INDEX({EK(c)},MATCH(SEL_K,SK_A,0)),"")'
cnt = lambda *crit: f'COUNTIFS({GV("O")},SEL_K' + ''.join(',' + x for x in crit) + ')'
cards = [('A', 'A', 'Ngày D', f'={EV("C")}', 'dd/mm/yyyy (ddd)', NAVY),
         ('B', 'C', 'Thời gian', f'={EV("W")}&""', None, BLUE),
         ('D', 'E', 'Hình thức · địa điểm', f'={EV("F")}&" · "&{EV("G")}', None, NAVY),
         ('F', 'F', '% xong', f'=IFERROR({cnt(GV("J"), chr(34) + "Xong" + chr(34))}/{cnt(GV("J"), chr(34) + "<>Bỏ qua" + chr(34))},0)', '0%', NAVY),
         ('G', 'G', 'Quá hạn', f'={cnt(GV("M"), chr(34) + "*QUÁ HẠN*" + chr(34))}', None, 'C0392B'),
         ('H', 'H', 'Đến hạn ≤ 3 ngày', f'={cnt(GV("M"), chr(34) + "*Đến hạn*" + chr(34))}', None, 'B7791F'),
         ('I', 'I', 'Chờ đối tác', f'={cnt(GV("J"), chr(34) + "Chờ đối tác" + chr(34))}', None, '6B4FA0'),
         ('J', 'J', 'Chưa giao', f'={cnt(GV("M"), chr(34) + "*CHƯA GIAO*" + chr(34))}', None, 'B85C1E'),
         ('K', 'K', 'Owner', f'={EV("K")}&""', None, NAVY)]
for a, b, lab, f_, fmt, colr in cards:
    if a != b: X.merge_cells(f'{a}5:{b}5'); X.merge_cells(f'{a}6:{b}6')
    c = X[f'{a}5']; c.value = lab; c.font = font(size=8, bold=True, color=GRAY); c.alignment = CEN; c.fill = fill(SOFT)
    v = X[f'{a}6']; v.value = f_; v.font = font(size=12 if a in ('D', 'K') else (14 if a in ('A', 'B') else 20), bold=True, color=colr); v.alignment = CEN; v.fill = fill(SOFT)
    if fmt: v.number_format = fmt
X.row_dimensions[6].height = 36


# Bản đồ tiến độ: hạng mục × giai đoạn
BK = [(-999, -21, '≥ 3 tuần trước'), (-20, -11, '2 – 3 tuần trước'), (-10, -4, '4 – 10 ngày trước'), (-3, -1, '3 ngày cuối'),
      (0, 0, 'NGÀY D'), (1, 3, 'D+1 → D+3'), (4, 7, 'D+4 → D+7'), (8, 999, 'Follow-up')]
GROUPS = []
for t in TPL:
    if t[1] not in GROUPS: GROUPS.append(t[1])
m0 = 9
X[f'A{m0 - 1}'] = 'BẢN ĐỒ TIẾN ĐỘ — ô = việc xong / tổng việc (đỏ: có việc quá hạn · vàng: sắp đến hạn · xanh lá: xong hết · cột cam: giai đoạn hiện tại)'
X[f'A{m0 - 1}'].font = font(size=11, bold=True, color=NAVY)
HC = 14   # cột ẩn bắt đầu (N) cho mã trạng thái ô
for j, h in enumerate(['Hạng mục'] + [b[2] for b in BK] + ['Tổng', 'Tiến độ']):
    c = X.cell(m0, 1 + j, h); c.font = font(bold=True, color='FFFFFF', size=9); c.fill = fill(NAVY); c.alignment = CEN; c.border = BOX
X.row_dimensions[m0].height = 30
for j, (lo, hi, _) in enumerate(BK):
    X.cell(m0 - 1, HC + j, lo); X.cell(m0, HC + j, hi)
from openpyxl.utils import get_column_letter as CL
off = lambda: f'IF(ISNUMBER({EV("C")}),TODAY()-{EV("C")},-9999)'
X.conditional_formatting.add(f'B{m0}:I{m0}', FormulaRule(
    formula=[f'AND({off()}>={CL(HC)}${m0 - 1},{off()}<={CL(HC)}${m0})'], fill=fill('E89B2F')))
for i, g_ in enumerate(GROUPS + ['TỔNG']):
    r = m0 + 1 + i
    X.cell(r, 1, g_).font = font(size=9, bold=(g_ == 'TỔNG'))
    gcrit = '' if g_ == 'TỔNG' else f'{GV("D")},$A{r},'
    for j in range(len(BK)):
        L = CL(HC + j)
        rng = f'{GV("Q")},">="&{L}${m0 - 1},{GV("Q")},"<="&{L}${m0}'
        tot = f'COUNTIFS({GV("O")},SEL_K,{gcrit}{rng},{GV("J")},"<>Bỏ qua")'
        don = f'COUNTIFS({GV("O")},SEL_K,{gcrit}{rng},{GV("J")},"Xong")'
        odu = f'COUNTIFS({GV("O")},SEL_K,{gcrit}{rng},{GV("M")},"*QUÁ HẠN*")'
        soon = f'COUNTIFS({GV("O")},SEL_K,{gcrit}{rng},{GV("M")},"*Đến hạn*")'
        c = X.cell(r, 2 + j, f'=IF({tot}=0,"",{don}&" / "&{tot})'); c.alignment = CEN; c.font = font(size=9); c.border = BOX
        X.cell(r, HC + j, f'=IF({tot}=0,0,IF({don}={tot},1,IF({odu}>0,4,IF({soon}>0,3,2))))')
    tot = f'COUNTIFS({GV("O")},SEL_K,{gcrit}{GV("J")},"<>Bỏ qua")'; don = f'COUNTIFS({GV("O")},SEL_K,{gcrit}{GV("J")},"Xong")'
    c = X.cell(r, 10, f'=IF({tot}=0,"",{don}&" / "&{tot})'); c.alignment = CEN; c.font = font(size=9, bold=True); c.border = BOX
    c = X.cell(r, 11, f'=IF({tot}=0,"",REPT("█",ROUND({don}/{tot}*10,0))&REPT("░",10-ROUND({don}/{tot}*10,0)))'); c.font = font(size=9, color=BLUE); c.border = BOX
    X.cell(r, 1).border = BOX; X.row_dimensions[r].height = 20
mEnd = m0 + len(GROUPS) + 1
for col in range(HC, HC + len(BK)): X.column_dimensions[CL(col)].hidden = True
GRID = f'B{m0 + 1}:I{mEnd}'; H0 = f'{CL(HC)}{m0 + 1}'
for code, colr, fc in [(4, 'F4B7B0', '8E2B20'), (3, 'FBE3A8', '7A5A00'), (1, 'BFE3CB', '1F6B3A'), (2, 'DCE7F5', NAVY)]:
    X.conditional_formatting.add(GRID, FormulaRule(formula=[f'{H0}={code}'], fill=fill(colr), font=Font(color=fc, bold=(code == 4), name=F)))
for c in (1, 10, 11): X.cell(mEnd, c).fill = fill(SOFT)

# Theo bên
b0 = mEnd + 3
X[f'A{b0 - 1}'] = 'ĐỘI THỰC HIỆN — đổi người ở tab Sự kiện (cột Owner → Đầu mối NPP)'; X[f'A{b0 - 1}'].font = font(size=11, bold=True, color=NAVY)
heads = ['Vai trò', 'Người', '', 'Việc của người này', 'Xong', 'Quá hạn', 'Đến hạn ≤ 3', 'Chờ đối tác', 'Chưa giao (Owner giao)', '%', 'Tiến độ']
for j, h in enumerate(heads):
    c = X.cell(b0, 1 + j, h); c.font = font(bold=True, color='FFFFFF', size=9); c.fill = fill(NAVY); c.alignment = CEN; c.border = BOX
X.merge_cells(start_row=b0, start_column=2, end_row=b0, end_column=3)
for i, role in enumerate(ROLES):
    r = b0 + 1 + i
    X.cell(r, 1, role).font = font(size=9, bold=True)
    who = f'={EV(TEAMCOL[role])}&""' if role in TEAMCOL else "='Cài đặt'!$B$10&\"\""
    X.cell(r, 2, who); X.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
    rc = f'{GV("G")},$B{r}'
    q = lambda col, v: f'=IF($B{r}="","",{cnt(rc, GV(col), chr(34) + v + chr(34))})'
    X.cell(r, 4, q("J", "<>Bỏ qua")); X.cell(r, 5, q("J", "Xong")); X.cell(r, 6, q("M", "*QUÁ HẠN*"))
    X.cell(r, 7, q("M", "*Đến hạn*")); X.cell(r, 8, q("J", "Chờ đối tác"))
    X.cell(r, 9, f'=IF(A{r}<>"MKT Leader","",{cnt(GV("M"), chr(34) + "*CHƯA GIAO*" + chr(34))})')
    X.cell(r, 10, f'=IF(N(D{r})=0,"",E{r}/D{r})').number_format = '0%'
    X.cell(r, 11, f'=IF(J{r}="","",REPT("█",ROUND(J{r}*10,0))&REPT("░",10-ROUND(J{r}*10,0)))')
    for c in range(1, 12):
        cc = X.cell(r, c); cc.border = BOX
        if c > 1: cc.font = font(size=9, color=BLUE if c == 11 else None)
        if 4 <= c <= 10: cc.alignment = CEN
bE = b0 + len(ROLES)
X.conditional_formatting.add(f'F{b0 + 1}:F{bE}', FormulaRule(formula=[f'N(F{b0 + 1})>0'], fill=fill(RED), font=Font(bold=True, color='C0392B', name=F)))
X.conditional_formatting.add(f'G{b0 + 1}:G{bE}', FormulaRule(formula=[f'N(G{b0 + 1})>0'], fill=fill(AMBER), font=Font(bold=True, name=F)))
X.conditional_formatting.add(f'H{b0 + 1}:H{bE}', FormulaRule(formula=[f'N(H{b0 + 1})>0'], fill=fill('EFEAF7'), font=Font(bold=True, color='6B4FA0', name=F)))
X.conditional_formatting.add(f'I{b0 + 1}:I{bE}', FormulaRule(formula=[f'N(I{b0 + 1})>0'], fill=fill('F6C9A8'), font=Font(bold=True, name=F)))
X.conditional_formatting.add(f'B{b0 + 1}:B{bE}', FormulaRule(formula=[f'AND(B{b0 + 1}="",N(D{b0 + 1})>0)'], fill=fill('F6C9A8')))

# Việc cần theo dõi
t0 = bE + 3
NT = 15
X[f'A{t0 - 1}'] = 'VIỆC CẦN THEO DÕI (chưa xong, theo hạn — sửa ở tab Giao việc)'; X[f'A{t0 - 1}'].font = font(size=11, bold=True, color=NAVY)
th = [('A', 'A', 'Việc'), ('B', 'B', 'Hạn'), ('C', 'C', 'Mốc'), ('D', 'E', 'Người phụ trách'), ('F', 'F', 'Trạng thái'), ('G', 'H', 'Cảnh báo'), ('I', 'K', 'Ghi chú / link')]
for a, b, h in th:
    if a != b: X.merge_cells(f'{a}{t0}:{b}{t0}')
    c = X[f'{a}{t0}']; c.value = h; c.font = font(bold=True, color='FFFFFF', size=9); c.fill = fill(NAVY); c.alignment = CEN
    for cc in range(ord(a) - 64, ord(b) - 63): X.cell(t0, cc).border = BOX
for i in range(NT):
    r = t0 + 1 + i
    pos = f'IFERROR(MATCH(SMALL({GV("V")},{i + 1}),{GV("V")},0),0)'
    gt = lambda c: f'=IF({pos}=0,"",INDEX({GV(c)},{pos})&"")'
    for a, b, src in [('A', 'A', 'E'), ('B', 'B', 'I'), ('C', 'C', 'C'), ('D', 'E', 'G'), ('F', 'F', 'J'), ('G', 'H', 'M'), ('I', 'K', 'L')]:
        if a != b: X.merge_cells(f'{a}{r}:{b}{r}')
        X[f'{a}{r}'] = (f'=IF({pos}=0,"",INDEX({GV(src)},{pos}))' if src == 'I' else gt(src))
        for cc in range(ord(a) - 64, ord(b) - 63):
            k_ = X.cell(r, cc); k_.border = BOX; k_.font = font(size=9); k_.alignment = Alignment(vertical='center', wrap_text=True)
    X[f'B{r}'].number_format = 'dd/mm'; X.row_dimensions[r].height = 30
tE = t0 + NT
X.conditional_formatting.add(f'A{t0 + 1}:K{tE}', FormulaRule(formula=[f'ISNUMBER(SEARCH("QUÁ HẠN",$G{t0 + 1}))'], fill=fill(RED)))
X.conditional_formatting.add(f'A{t0 + 1}:K{tE}', FormulaRule(formula=[f'ISNUMBER(SEARCH("Đến hạn",$G{t0 + 1}))'], fill=fill(AMBER)))
X.conditional_formatting.add(f'A{t0 + 1}:K{tE}', FormulaRule(formula=[f'$F{t0 + 1}="Chờ đối tác"'], fill=fill('EFEAF7')))
X.conditional_formatting.add(f'D{t0 + 1}:E{tE}', FormulaRule(formula=[f'AND($A{t0 + 1}<>"",$D{t0 + 1}="")'], fill=fill('F6C9A8')))

# Nhật ký mới nhất
n0 = tE + 3
NN = 8
X[f'A{n0 - 1}'] = 'NHẬT KÝ VỚI ĐỐI TÁC · QUYẾT ĐỊNH (mới nhất — ghi thêm ở tab Nhật ký)'; X[f'A{n0 - 1}'].font = font(size=11, bold=True, color=NAVY)
nh = [('A', 'A', 'Nội dung'), ('B', 'B', 'Ngày'), ('C', 'D', 'Loại'), ('E', 'E', 'Với ai'), ('F', 'H', 'Việc tiếp theo · ai làm'), ('I', 'I', 'Hạn'), ('J', 'J', 'Trạng thái'), ('K', 'K', 'Người ghi')]
for a, b, h in nh:
    if a != b: X.merge_cells(f'{a}{n0}:{b}{n0}')
    c = X[f'{a}{n0}']; c.value = h; c.font = font(bold=True, color='FFFFFF', size=9); c.fill = fill(NAVY); c.alignment = CEN
    for cc in range(ord(a) - 64, ord(b) - 63): X.cell(n0, cc).border = BOX
for i in range(NN):
    r = n0 + 1 + i
    pos = f'IFERROR(MATCH(LARGE({NKR("J")},{i + 1}),{NKR("J")},0),0)'
    for a, b, src in [('A', 'A', 'D'), ('B', 'B', 'A'), ('C', 'D', 'C'), ('E', 'E', 'E'), ('F', 'H', 'G'), ('I', 'I', 'H'), ('J', 'J', 'I'), ('K', 'K', 'F')]:
        if a != b: X.merge_cells(f'{a}{r}:{b}{r}')
        X[f'{a}{r}'] = f'=IF({pos}=0,"",IF(INDEX({NKR(src)},{pos})="","",INDEX({NKR(src)},{pos})))' if src in ('A', 'H') else f'=IF({pos}=0,"",INDEX({NKR(src)},{pos})&"")'
        for cc in range(ord(a) - 64, ord(b) - 63):
            k_ = X.cell(r, cc); k_.border = BOX; k_.font = font(size=9); k_.alignment = Alignment(vertical='center', wrap_text=True)
    X[f'B{r}'].number_format = 'dd/mm'; X[f'I{r}'].number_format = 'dd/mm'; X.row_dimensions[r].height = 30
X.conditional_formatting.add(f'A{n0 + 1}:K{n0 + NN}', FormulaRule(formula=[f'AND($J{n0 + 1}="Mở",ISNUMBER($I{n0 + 1}),TODAY()>$I{n0 + 1})'], fill=fill(RED)))
X.conditional_formatting.add(f'A{n0 + 1}:K{n0 + NN}', FormulaRule(formula=[f'$J{n0 + 1}="Xong"'], font=Font(color=GRAY, name=F)))
X.freeze_panes = 'A4'

# ═════════ Dashboard (mọi sự kiện)
D = wsD
title(D, 'DASHBOARD TIẾN ĐỘ SỰ KIỆN', None)
D['A2'] = '="Cập nhật đến "&TEXT(TODAY(),"dd/mm/yyyy")&" · sự kiện đang theo dõi (Sự kiện ▸ Theo dõi = Có) · xem chi tiết 1 sự kiện ở tab Điều phối"'
D['A2'].font = font(size=9, italic=True, color=GRAY)
for col, w in zip('ABCDEFGHIJ', [30, 10, 13, 18, 7, 7, 8, 8, 7, 13]): D.column_dimensions[col].width = w
TD = f'{GV("T")},"Có"'
cards = [('A', 'A', 'Sự kiện đang theo dõi', f"=COUNT({EK('X')})", NAVY),
         ('B', 'C', 'Việc đang mở', f'=COUNTIFS({TD},{GV("J")},"<>Xong",{GV("J")},"<>Bỏ qua",{GV("E")},"<>")', NAVY),
         ('D', 'D', 'QUÁ HẠN', f'=COUNTIFS({TD},{GV("M")},"*QUÁ HẠN*")', 'C0392B'),
         ('E', 'F', 'Đến hạn ≤ 3 ngày', f'=COUNTIFS({TD},{GV("M")},"*Đến hạn*")', 'B7791F'),
         ('G', 'H', 'Chờ đối tác', f'=COUNTIFS({TD},{GV("J")},"Chờ đối tác")', '6B4FA0'),
         ('I', 'I', 'Chưa giao', f'=COUNTIFS({TD},{GV("M")},"*CHƯA GIAO*")', 'B85C1E'),
         ('J', 'J', '% việc đã xong', f'=IFERROR(COUNTIFS({TD},{GV("J")},"Xong")/COUNTIFS({TD},{GV("J")},"<>Bỏ qua",{GV("E")},"<>"),0)', NAVY)]
for a, b, lab, f_, colr in cards:
    if a != b: D.merge_cells(f'{a}4:{b}4'); D.merge_cells(f'{a}5:{b}5')
    c = D[f'{a}4']; c.value = lab; c.font = font(size=8, bold=True, color=GRAY); c.alignment = CEN; c.fill = fill(SOFT)
    v = D[f'{a}5']; v.value = f_; v.font = font(size=22, bold=True, color=colr); v.alignment = CEN; v.fill = fill(SOFT)
D.row_dimensions[5].height = 40; D['J5'].number_format = '0%'
def sec(cell, t): D[cell] = t; D[cell].font = font(size=12, bold=True, color=NAVY)
def thead(row, heads):
    for j, h in enumerate(heads):
        c = D.cell(row, 1 + j, h); c.font = font(bold=True, color='FFFFFF', size=9); c.fill = fill(NAVY); c.alignment = CEN; c.border = BOX
    D.row_dimensions[row].height = 28
NE = 12
r0 = 8; sec(f'A{r0 - 1}', 'TIẾN ĐỘ TỪNG SỰ KIỆN (sắp tới trước)')
thead(r0, ['Sự kiện', 'Ngày D', 'Thời gian', 'Owner', 'Xong', 'Còn lại', 'Quá hạn', 'Chưa giao', '%', 'Tiến độ'])
for i in range(NE):
    r = r0 + 1 + i
    pos = f'IFERROR(MATCH(SMALL({EK("X")},{i + 1}),{EK("X")},0),0)'
    g = lambda c: f'=IF({pos}=0,"",INDEX({EK(c)},{pos}))'
    gt = lambda c: f'=IF({pos}=0,"",INDEX({EK(c)},{pos})&"")'
    vals = [gt('B'), g('C'), gt('W'), gt('K'), g('R'), f'=IF(A{r}="","",N(INDEX({EK("Q")},{pos}))-N(E{r})-N(G{r}))', g('S'), g('T'), g('U'), gt('V')]
    for j, v in enumerate(vals):
        cell = D.cell(r, 1 + j, v); cell.border = BOX; cell.font = font(size=9); cell.alignment = Alignment(vertical='center', wrap_text=(j == 0))
    D[f'B{r}'].number_format = 'dd/mm/yy'; D[f'I{r}'].number_format = '0%'; D[f'J{r}'].font = font(size=9, color=BLUE)
    D.row_dimensions[r].height = 30
D.conditional_formatting.add(f'G{r0 + 1}:G{r0 + NE}', FormulaRule(formula=[f'N(G{r0 + 1})>0'], fill=fill(RED), font=Font(bold=True, color='C0392B', name=F)))
D.conditional_formatting.add(f'H{r0 + 1}:H{r0 + NE}', FormulaRule(formula=[f'N(H{r0 + 1})>0'], fill=fill(AMBER), font=Font(bold=True, name=F)))
D.conditional_formatting.add(f'C{r0 + 1}:C{r0 + NE}', FormulaRule(formula=[f'LEFT(C{r0 + 1},3)="Còn"'], font=Font(color=BLUE, bold=True, name=F)))
ch = BarChart(); ch.type = 'bar'; ch.grouping = 'stacked'; ch.overlap = 100; ch.gapWidth = 60
ch.title = 'Việc theo sự kiện'
ch.add_data(Reference(D, min_col=5, max_col=7, min_row=r0, max_row=r0 + NE), titles_from_data=True)
ch.set_categories(Reference(D, min_col=1, min_row=r0 + 1, max_row=r0 + NE))
for s_, col in zip(ch.series, ['3E9B5F', '9DB4D6', 'E0574B']):
    s_.graphicalProperties.solidFill = col; s_.graphicalProperties.line.solidFill = col
ch.x_axis.scaling.orientation = 'maxMin'; ch.legend.position = 'b'; ch.height = 9.5; ch.width = 17; ch.visible_cells_only = False
D.add_chart(ch, 'L7')
NP = 15
r1 = r0 + NE + 3; sec(f'A{r1 - 1}', 'THEO NGƯỜI PHỤ TRÁCH (mọi sự kiện)')
thead(r1, ['Người', 'Đang mở', 'Quá hạn', 'Đến hạn ≤ 3 ngày', 'Xong', 'Chờ ĐT', 'Tổng', '%', '', 'Tiến độ'])
for i in range(NP):
    r = r1 + 1 + i
    p = f"'Cài đặt'!$D${5 + i}"
    D[f'A{r}'] = f'=IF({p}="","",{p})'
    D[f'B{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("G")},A{r},{TD},{GV("J")},"<>Xong",{GV("J")},"<>Bỏ qua"))'
    D[f'C{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("G")},A{r},{TD},{GV("M")},"*QUÁ HẠN*"))'
    D[f'D{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("G")},A{r},{TD},{GV("M")},"*Đến hạn*"))'
    D[f'E{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("G")},A{r},{TD},{GV("J")},"Xong"))'
    D[f'F{r}'] = f'=IF(A{r}="","",COUNTIFS({GV("G")},A{r},{TD},{GV("J")},"Chờ đối tác"))'
    D[f'G{r}'] = f'=IF(A{r}="","",B{r}+E{r})'
    D[f'H{r}'] = f'=IF(OR(A{r}="",N(G{r})=0),"",E{r}/G{r})'
    D[f'J{r}'] = f'=IF(H{r}="","",REPT("█",ROUND(H{r}*10,0))&REPT("░",10-ROUND(H{r}*10,0)))'
    for j in range(10): c = D.cell(r, 1 + j); c.border = BOX; c.font = font(size=9)
    D[f'H{r}'].number_format = '0%'; D[f'J{r}'].font = font(size=9, color=BLUE)
D.conditional_formatting.add(f'C{r1 + 1}:C{r1 + NP}', FormulaRule(formula=[f'N(C{r1 + 1})>0'], fill=fill(RED), font=Font(bold=True, color='C0392B', name=F)))
D.conditional_formatting.add(f'D{r1 + 1}:D{r1 + NP}', FormulaRule(formula=[f'N(D{r1 + 1})>0'], fill=fill(AMBER), font=Font(bold=True, name=F)))
D.conditional_formatting.add(f'F{r1 + 1}:F{r1 + NP}', FormulaRule(formula=[f'N(F{r1 + 1})>0'], fill=fill('EFEAF7'), font=Font(bold=True, color='6B4FA0', name=F)))
r = r1 + NP + 1
D[f'A{r}'] = 'Chưa giao người'; D[f'A{r}'].font = font(size=9, bold=True, color='B85C1E')
D[f'B{r}'] = f'=COUNTIFS({TD},{GV("M")},"*CHƯA GIAO*")'; D[f'B{r}'].font = font(size=9, bold=True, color='B85C1E')
NT2 = 15
r2 = r + 3; sec(f'A{r2 - 1}', 'VIỆC CẦN XỬ LÝ (mọi sự kiện, hạn gần nhất)')
thead(r2, ['Việc', 'Hạn', 'Cảnh báo', 'Người phụ trách', 'Sự kiện', '', '', '', '', 'Trạng thái'])
D.merge_cells(start_row=r2, start_column=5, end_row=r2, end_column=9)
for i in range(NT2):
    r = r2 + 1 + i
    pos = f'IFERROR(MATCH(SMALL({GV("S")},{i + 1}),{GV("S")},0),0)'
    g = lambda c: f'=IF({pos}=0,"",INDEX({GV(c)},{pos}))'
    gt = lambda c: f'=IF({pos}=0,"",INDEX({GV(c)},{pos})&"")'
    D[f'A{r}'] = gt('E'); D[f'B{r}'] = g('I'); D[f'C{r}'] = gt('M'); D[f'D{r}'] = gt('G'); D[f'E{r}'] = gt('A'); D[f'J{r}'] = gt('J')
    D.merge_cells(start_row=r, start_column=5, end_row=r, end_column=9)
    for j in range(10):
        c = D.cell(r, 1 + j); c.border = BOX; c.font = font(size=9); c.alignment = Alignment(vertical='center', wrap_text=True)
    D[f'B{r}'].number_format = 'dd/mm'; D.row_dimensions[r].height = 30
D.conditional_formatting.add(f'A{r2 + 1}:J{r2 + NT2}', FormulaRule(formula=[f'ISNUMBER(SEARCH("QUÁ HẠN",$C{r2 + 1}))'], fill=fill(RED)))
D.conditional_formatting.add(f'A{r2 + 1}:J{r2 + NT2}', FormulaRule(formula=[f'ISNUMBER(SEARCH("Đến hạn",$C{r2 + 1}))'], fill=fill(AMBER)))
D.conditional_formatting.add(f'A{r2 + 1}:J{r2 + NT2}', FormulaRule(formula=[f'$J{r2 + 1}="Chờ đối tác"'], fill=fill('EFEAF7')))
D.freeze_panes = 'A6'

# ═════════ Hướng dẫn
H = wsH
title(H, 'CÁCH DÙNG', 'File chung cho MỌI sự kiện của MMH — đi kèm SOP MMHSOP_0XX Quy trình tổ chức sự kiện.')
H.column_dimensions['A'].width = 4; H.column_dimensions['B'].width = 24; H.column_dimensions['C'].width = 100
steps = [
 ('Sự kiện tự vào file', 'Mỗi 10 phút hệ thống đọc PLAN_EVENT + REPORT_EVENT của file "2. Vietnam - Marketing Offline FY68" ⇒ tab Sự kiện. '
                         'Sự kiện mới có ngày cụ thể ⇒ tự tạo bộ việc ở tab Giao việc theo tab Mẫu việc.'),
 ('① Owner chọn đội', 'Tab Sự kiện: mỗi sự kiện chọn Owner · Digital · Trade · Sales · Đầu mối NPP (mặc định lấy từ Cài đặt). '
                     'Mọi việc tự giao theo vai trò; đổi người ở đây ⇒ các việc chưa giao tay đổi theo trong ≤ 1 phút.'),
 ('② Owner giao riêng', 'Tab Giao việc: đổi Người phụ trách ở cột G cho từng việc (chữ xanh đậm = giao tay, không bị đổi theo đội). '
                       'Gõ được tên người ngoài danh sách (đối tác). Đổi Hạn: gõ ngày đè lên cột I. Việc không cần ⇒ "Bỏ qua".'),
 ('③ Owner theo dõi', 'Tab Điều phối: chọn sự kiện ⇒ thẻ tổng, BẢN ĐỒ TIẾN ĐỘ (hạng mục × giai đoạn, cột cam = đang ở giai đoạn nào), '
                     'từng bên / người, 15 việc cần theo dõi, nhật ký với đối tác. Tab Dashboard: toàn bộ sự kiện + từng người.'),
 ('④ Làm việc với đối tác', 'Việc đang đợi NPP / Viện / KOL / địa điểm ⇒ Trạng thái "Chờ đối tác" (tô tím, đếm số ngày chờ). '
                           'Điều đã thống nhất, quyết định, thay đổi ⇒ ghi 1 dòng ở tab Nhật ký (có Việc tiếp theo · Hạn).'),
 ('Người phụ trách', 'Lọc cột G theo tên mình ⇒ cập nhật Trạng thái + Ghi chú / link ngay khi làm (trong ngày). Chọn "Xong" ⇒ Ngày xong tự điền; cột Cập nhật ghi giờ, rê chuột xem ai sửa.'),
 ('Quy tắc thông tin', '① File này là nơi DUY NHẤT ghi trạng thái; Zalo chỉ để báo nhanh. ② Vướng mắc / nguy cơ trễ ⇒ ghi Nhật ký + báo Owner ngay. '
                       '③ Quá hạn ≥ 2 ngày làm việc hoặc ảnh hưởng ngày D ⇒ Owner báo Giám đốc trong ngày. ④ Thay đổi ngày / địa điểm / KOL / ngân sách ⇒ sửa file Offline + email mọi bên trong 24 giờ. '
                       '⑤ Không gửi danh sách khách qua Zalo / email cá nhân.'),
 ('Ngày tính hạn', 'D − n = ngày lịch; D + n = ngày làm việc T2–T6 trừ ngày nghỉ ở tab Cài đặt. Sự kiện nhiều ngày: D + n tính từ ngày kết thúc.'),
 ('Dữ liệu ví dụ', 'Sự kiện / người / nhật ký "(ví dụ)" chỉ để xem trước — tự xoá ở lần đồng bộ đầu tiên.'),
]
for i, (a, b) in enumerate(steps):
    r = 4 + i
    H.cell(r, 2, a).font = font(bold=True, color=NAVY); H.cell(r, 3, b).font = font()
    H.cell(r, 2).alignment = WR; H.cell(r, 3).alignment = WR; H.row_dimensions[r].height = 58 if a == 'Quy tắc thông tin' else 44

for ws, col in [(wsD, NAVY), (wsX, 'E89B2F'), (wsG, BLUE), (wsE, '3E9B5F'), (wsN, '6B4FA0'), (wsT, GRAY), (wsC, MUTE), (wsH, MUTE)]:
    ws.sheet_properties.tabColor = col
wb.save(OUT)
print('ok', len(rows), 'việc mẫu')
