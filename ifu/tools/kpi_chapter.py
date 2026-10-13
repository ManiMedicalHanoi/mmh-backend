# Dựng chương KPI (chapters/30-kpi.md) theo bố cục "Hướng dẫn hệ thống KPI FY68" (Product Team, 12/10/2026)
# Dữ liệu: nhóm KPI, nguồn (link tới đúng file ▸ sheet), trạng thái kết nối, cách tính, điều kiện, trọng số từng người.
import os
D = 'https://docs.google.com/spreadsheets/d/'
F = {  # mã ⇒ (tên hiển thị, link)
 'KPI': ('MMH_KPI_FY68 ▸ 3. Detail KPI', D+'1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0/edit#gid=703586524'),
 'KPIF':('MMH_KPI_FY68', D+'1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0/edit'),
 'TURN':('MMH Turnover Report FY67-FY68 ▸ SUM TURNOVER', D+'1bujnLrxerjUM1gR3aOoy3r4gvTp4pNyPwJM-ra5iFe8/edit#gid=1265461991'),
 'DEN': ('FY68_Dental CRM', D+'13aLqhO4H7he4LeHWNCdwNRhGXcIzieuNtFcA0BJJJj0/edit#gid=339848295'),
 'SUR': ('FY68_Surgical CRM', D+'16ke8ZRvmbG6TUte-oDLFSGzKbW9_PA98EJnLo5LoauM/edit#gid=1085114621'),
 'EYE': ('FY68_Eyeless CRM', D+'1FxMj1uWZBi6yimnAlPCOG0dh2OF0dFfWIQntFXVduZA/edit#gid=1209031558'),
 'THS': ('FY68_Thailand_Surgical_CRM', D+'1rX8BDcbFGOjpXFmPJeKTkllE4LH7q9A8zz22R7jDA0E/edit#gid=808864889'),
 'MKO': ('2. Vietnam - Marketing Offline FY68 ▸ REPORT_EVENT', D+'16vIDYRhm6Cj9DN4C26rvbBPW1hF3vAnZ7lgl6Bd02w8/edit#gid=2090468147'),
 'DMA': ('3. Vietnam - Digital Marketing & Design FY68 ▸ ADS REPORT', D+'1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc/edit#gid=2009405878'),
 'DME': ('3. Vietnam - Digital Marketing & Design FY68 ▸ EVENT REPORT + PRODUCT REPORT', D+'1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc/edit#gid=106978145'),
 'DMO': ('3. Vietnam - Digital Marketing & Design FY68 ▸ ORDER REPORT', D+'1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc/edit#gid=1653956812'),
 'TRN': ('MMH - Training Master ▸ Training Report', D+'1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ/edit#gid=2006425695'),
 'KBI': ('Key Behavioral Indicators Report ▸ Detail report', D+'1yDE8NJrs70ri0m5hJVYIPf82z0rYXGMgo3rpfmWXzBg/edit#gid=2109870958'),
 'THM': ('4. Thailand - Surgical - Marketing Offline FY67-FY68 ▸ REPORT_EVENT', D+'1s6ny0CSsF0WECR_8Zu41eU2kCFrmYHYbEa3GIWSbO1M/edit'),
 'BO':  ('Back Office KPI Tracking FY68', D+'1RM7Ijh0XLcpMXEwMQrE7HY8HamKVocMa1N5H72yD3I8/edit'),
 'OPT': ('Order Processing Tracking (Dam Ha, Hau)', D+'17n7azm6uxKuYIjkAJrZkCFXu4XWH_BTvyEMrVnsBjvI/edit'),
 'DAF': ('Distributor Actual and forecast order (Viet)', D+'1FcTk24_kHQIA3X69kOrUW9pT9q0v9AXgmi2OKqC6oQI/edit'),
 'IMX': ('Import- Export', D+'15nFjIXmc6wi7xio5U7Lm0A66cSrWwgvM48xY0hUs25s/edit'),
 'TND': ('Performance in preparing tender documents KPI', D+'1YQIv-9Fc0rCXbMP3Q9H_XRFhJD6BEGLb0AgUMEE9D4g/edit'),
 'TDA': ('1. Thailand - Dental Action FY67', D+'1ONYLqqBaw4dPoN4jZJg8a1A5GAvfAuzM-Gsp_UHI7O4/edit'),
 'TDE': ('2. Thailand - Dental Event Report FY67', D+'12GnjS0esEOfW3_uWTrTwe0AQgOtAVsIuqDiSSCea308/edit'),
 'RH':  ('MMH Report Hub', 'https://manimedicalhanoi.github.io/MMH-Report/'),
 'CRM': ('MMH CRM', 'https://manimedicalhanoi.github.io/MMH-CRM/'),
}
ST = {'A':('a','Đã tự động kết nối'), 'W':('w','Đã kết nối · chưa nhận số'), 'S':('s','Tự cộng từ các dòng con'), 'M':('m','Chưa kết nối · nhập tay'), 'N':('n','Chưa có file nguồn')}
def st(c): k,t = ST[c]; return f'<span class="st {k}">{t}</span>'
def dot(c): return f'<i class="sd {ST[c][0]}" title="{ST[c][1]}"></i>'
def fl(k, sheet=None, note=None):
    n,u = F[k]
    if sheet: n = n + ' ▸ ' + sheet
    s = f'<a href="{u}">{n}</a>'
    return s + (f'<br><small>{note}</small>' if note else '')
def nf(text, note): return f'{text}<br><small>{note}</small>'

def table(rows):
    h = ['<table class="kt"><thead><tr><th>KPI</th><th>Mã</th><th>Người phụ trách</th><th>Lấy dữ liệu từ</th><th>Trạng thái</th></tr></thead><tbody>']
    for kp, code, who, src, s in rows:
        h.append(f'<tr><td>{kp}</td><td class="code">{code}</td><td>{who}</td><td>{src}</td><td>{st(s)}</td></tr>')
    h.append('</tbody></table>')
    return '\n'.join(h)
def howcond(how, cond):
    li = lambda xs: '<ul>' + ''.join(f'<li>{x}</li>' for x in xs) + '</ul>'
    return f'<div class="kpibox"><div><b>CÁCH TÍNH</b>{li(how)}</div><div><b>ĐIỀU KIỆN ĐƯỢC TÍNH</b>{li(cond)}</div></div>'

T = lambda s=None: fl('TURN')
GROUPS = [
 ('Doanh số', 'Mã F0 – F5 · doanh số MMH bán cho nhà phân phối, theo từng tháng · không giới hạn 130%', [
   ('Doanh số NPP · Toàn công ty','F0-00','Hoa, Ngoc, Mai, Dam Viet, Dam Ha, Hau',T(),'A'),
   ('Doanh số NPP · Surgical VN<br>Doanh số NPP · Dental & MMG VN + thị trường khác','F2-00 · F3-00','Tuyen, Giang, Thuong, Minh Trang, Duc Anh',fl('TURN',note='cộng các NPP bên dưới'),'S'),
   ('Doanh số NPP · Nam Dung','F3-01','Viet',T(),'A'),
   ('Doanh số NPP · SPI','F3-02','Vinh',T(),'A'),
   ('Doanh số NPP · Viet Thai + Meci','F3-03','Phuong',T(),'A'),
   ('Doanh số Dao / Chỉ · Hung Vi<br>Doanh số Manipler · MHI','F2-01 · F2-02','Viet Ha',T(),'A'),
   ('Doanh số Dao / Chỉ · Icare<br>Doanh số Manipler · An Tam','F2-03 · F2-04','Khang',T(),'A'),
   ('Doanh số NPP · Eyeless VN','F5-00','Trang',T(),'A'),
   ('Doanh số NPP · Surgical Thái Lan / Myanmar','F1-00','Dao',T(),'A'),
   ('Doanh số Manipler · Novatech','F1-01','Miew',T(),'A'),
   ('Doanh số NPP · Dental & MMG Thái Lan','F4-00','Sui, Yong, Man',T(),'A')],
  (['Lấy dữ liệu từ sheet SUM TURNOVER của file MMH Turnover Report.','Cộng cột <b>Actual USD</b> của các dòng loại "1 Turnover", theo đúng nhà phân phối của KPI. Ví dụ: Doanh số NPP · Nam Dung = cộng mọi dòng của NPP Nam Dũng, mảng Dental + MMG, trong tháng.','Chỉ lấy tháng kế toán đã chốt sổ ⇒ tháng đang chạy để trống là bình thường.'],
   ['Mục tiêu theo ngân sách Mani.','Thực đạt theo số Kế toán chốt hằng tháng.'])),
 ('Doanh số sản phẩm mới', 'Mã F6 · sản phẩm mới, ra mắt hoặc tái ra mắt · không giới hạn 130%', [
   ('Doanh số Composite · Dental VN','F6-01','Tuyen',T(),'A'),
   ('Doanh số Composite · Nam Dung / SPI / Viet Thai + Meci','F6-01a · b · c','Viet · Vinh · Phuong',T(),'A'),
   ('Doanh số JIZAI · Dental VN','F6-02','Tuyen',T(),'A'),
   ('Doanh số JIZAI · Nam Dung / SPI / Viet Thai + Meci','F6-02a · b · c','Viet · Vinh · Phuong',T(),'A'),
   ('Doanh số Hook + Micro Forceps · Surgical Thái Lan / Myanmar','F6-03','Dao',T(),'A')],
  (['Composite: cộng các dòng loại "3 Composite amount".','JIZAI: cộng các dòng "2 Jizai amount" (USD), tách theo nhà phân phối Nam Dũng / SPI / Việt Thái + Meci.','Hook + Micro Forceps: cộng doanh số 2 sản phẩm Trabeculotomy Hook và Micro Forceps.','Nếu số JIZAI của một NPP trùng y hệt số Composite cùng tháng ⇒ coi là nhập nhầm, không lấy.'],
   ['Như nhóm Doanh số: số Kế toán đã chốt.'])),
 ('Mở mới', 'Mã C1 – C2 · đại lý / khách hàng mới và SKU mới · tối đa 130%', [
   ('Mở mới đại lý / SKU · Bắc','C1-01','Viet',fl('DEN','16. NEW ACCOUNT & SKU'),'A'),
   ('Mở mới đại lý / SKU · Trung','C1-02','Vinh',fl('DEN','16. NEW ACCOUNT & SKU'),'A'),
   ('Mở mới đại lý / SKU · Nam','C1-03','Phuong',fl('DEN','16. NEW ACCOUNT & SKU'),'A'),
   ('Mở mới khách hàng / SKU · Surgical Bắc','C1-04','Viet Ha',fl('SUR','16. NEW ACCOUNT & SKU'),'A'),
   ('Mở mới khách hàng / SKU · Surgical Nam','C1-05','Khang',fl('SUR','16. NEW ACCOUNT & SKU'),'A'),
   ('Mở mới khách hàng / SKU · Surgical Manipler Thái Lan','C2-03','Miew',fl('THS','23. NEW ACCOUNT & SKU'),'A'),
   ('Mở mới KH trọng điểm · Dental Thái Lan','C2-01','Yong',nf('Báo cáo xác nhận của NPP Thái','chưa có file'),'N'),
   ('Lập hồ sơ KH trọng điểm · Dental Thái Lan','C2-02','Yong',nf('Danh sách hồ sơ khách hàng top 20% của 3 NPP','chưa có file'),'N')],
  (['Việt Nam + Manipler Thái: đếm số hồ sơ mở mới được quản lý <b>Xác nhận</b> trên app CRM (mục Mở mới & SKU mới), tính vào tháng có đơn đầu tiên. Dental chỉ đếm đại lý.','Lập hồ sơ KH trọng điểm = số khách đã lập hồ sơ (cộng dồn) ÷ tổng khách của 3 NPP Thái.'],
   ['Chỉ tính một lần, vào tháng phát sinh đầu tiên.','Đủ 4 chứng từ: có trong báo cáo tuần · NPP xác nhận · thông tin đúng mẫu · đơn hàng đầu tiên qua NPP.','Key account Thái: có báo cáo xác nhận của NPP.'])),
 ('Viếng thăm khách hàng', 'Mã C3 – C4 · lượt gặp trực tiếp khách hàng, đi kèm sales · tối đa 130%', [
   ('Viếng thăm đại lý · Bắc<br>Viếng thăm NPP / KH cuối · Bắc','C3-01 · C3-04','Viet',fl('DEN','6. WEEKLY REPORT'),'A'),
   ('Viếng thăm đại lý · Trung<br>Viếng thăm NPP / KH cuối · Trung','C3-02 · C3-05','Vinh',fl('DEN','6. WEEKLY REPORT'),'A'),
   ('Viếng thăm đại lý · Nam<br>Viếng thăm NPP / KH cuối · Nam','C3-03 · C3-06','Phuong',fl('DEN','6. WEEKLY REPORT'),'A'),
   ('Viếng thăm khách hàng · Surgical Bắc','C3-07','Viet Ha',fl('SUR','6. WEEKLY REPORT'),'A'),
   ('Viếng thăm khách hàng · Surgical Nam','C3-08','Khang',fl('SUR','6. WEEKLY REPORT'),'A'),
   ('Viếng thăm khách hàng · Eyeless VN','C3-09','Trang',fl('EYE','6. WEEKLY REPORT'),'A'),
   ('Viếng thăm khách hàng · Manipler – Surgical Thái Lan','C4-02','Miew',fl('THS','6. CUSTOMER VISITING'),'A'),
   ('Đi kèm coaching Sales Dental<br>Đi kèm coaching Sales Surgical','C3-11 · C3-10','Tuyen · Giang',nf('Form đánh giá Field Coaching','chưa có file'),'N'),
   ('Đi kèm sales NPP · Dental Thái Lan','C4-01','Yong',fl('TDA',note='chưa nối'),'M'),
   ('Ngày đi kèm đào tạo sales NPP · Dental Thái Lan','C4-03','Man',fl('TDA',note='chưa nối'),'M')],
  (['Đếm số lượt <b>Visiting sales</b> ghi trên app CRM trong tháng, bỏ việc "chưa bắt đầu" và "huỷ", chỉ tính tới hôm nay.','Dental: đại lý và NPP / khách cuối tính thành 2 KPI riêng.','Ngày đi kèm đào tạo (Man) tính theo NGÀY: cả ngày đi với 1 sales NPP, tối thiểu 5 lượt.'],
   ['Có trong báo cáo, kèm ảnh (file CRM có ô bật / tắt "chỉ tính lượt có ảnh").','Đi kèm coaching: đã nộp form đánh giá.','Đi kèm sales NPP: loại "Co-visiting with distributor".'])),
 ('Bán hàng hỗ trợ', 'Mã C5 – C7 · đơn hàng sales MMH tạo ra nhờ gặp khách và hỗ trợ NPP · tối đa 130%', [
   ('Doanh số hỗ trợ bán · Bắc / Trung / Nam','C5-01 · 02 · 03','Viet · Vinh · Phuong',fl('DEN','3. SALE ORDER'),'A'),
   ('SL Composite hỗ trợ · Nam Dung / SPI / Viet Thai + Meci','C6-01 · 02 · 03','Viet · Vinh · Phuong',fl('DEN','3. SALE ORDER'),'A'),
   ('SL JIZAI hỗ trợ · Nam Dung / SPI / Viet Thai + Meci','C7-01 · 02 · 03','Viet · Vinh · Phuong',fl('DEN','3. SALE ORDER'),'A')],
  (['Doanh số hỗ trợ bán: cộng tiền (VND) các đơn sales ghi trên app CRM trong tháng ÷ tỷ giá của tháng (nhập trên app, mặc định 26.050) ⇒ ra USD.','SL Composite / JIZAI hỗ trợ: cộng số lượng sản phẩm Composite / JIZAI trong các đơn, chỉ đơn qua đúng NPP phụ trách (Viet: Nam Dũng · Vinh: SPI · Phuong: Việt Thái / Meci).'],
   ['Có trong báo cáo tuần.','Mỗi đơn có ít nhất 1 chứng từ: phiếu xuất kho cho khách của NPP, xác nhận của NPP hoặc thông báo trúng thầu.','Sales báo đơn cho NPP qua email (Zalo chỉ để trao đổi nhanh).'])),
 ('Marketing hỗ trợ bán · Người tham dự', 'Mã C8 – C9 và C15 · tối đa 130%', [
   ('SL Composite do Marketing hỗ trợ','C8-00','Thuong',fl('MKO'),'A'),
   ('SL JIZAI do Marketing hỗ trợ','C9-00','Thuong',fl('MKO'),'A'),
   ('Người tham dự sự kiện KOL · Dental VN','C15-01','Thuong',fl('MKO'),'A'),
   ('Người tham dự sự kiện KOL · Surgical VN','C15-02','Thuong',fl('MKO'),'A')],
  (['SL Composite / JIZAI do Marketing hỗ trợ: cộng cột "Actual sales - Composite (pcs)" / "Actual sales - Jizai (Sheets)" của các sự kiện trong tháng.','Người tham dự sự kiện KOL: cộng cột "Actual Participant" của các sự kiện Dental / Surgical trong tháng.'],
   ['Đơn hàng tạo ra trước hoặc trong sự kiện (hội thảo KOL, workshop, triển lãm), có danh sách đơn theo sự kiện.','Người tham dự: có trong danh sách điểm danh có chữ ký; mỗi người chỉ tính 1 lần / sự kiện.'])),
 ('Sự kiện', 'Mã C10 – C14 · mỗi sự kiện chỉ thuộc 1 loại và chỉ tính 1 lần · tối đa 130%', [
   ('Đào tạo khách hàng · Bắc / Trung / Nam','C10-03 · 04 · 05','Viet · Vinh · Phuong',fl('DEN','7. PRODUCT PRESENTATION'),'A'),
   ('Giới thiệu sản phẩm / ca lâm sàng · Surgical Bắc / Nam','C10-01 · C10-02','Viet Ha · Khang',fl('SUR','7. PRODUCT PRESENTATION'),'A'),
   ('Đào tạo khách hàng · VN','C10-06','Giang',fl('TRN'),'A'),
   ('Sự kiện KOL & triển lãm · Dental VN / Surgical VN','C12-01 · C12-02','Thuong, Trang',fl('MKO'),'A'),
   ('Sự kiện do MMH tổ chức · Surgical Thái Lan / Myanmar<br>Sự kiện KOL & triển lãm · Surgical Thái Lan / Myanmar','C11-01 · C13-00','Dao',fl('THM'),'W'),
   ('Sự kiện do MMH tổ chức · Surgical Thái Lan','C11-01a','Miew',fl('THM'),'W'),
   ('Giới thiệu sản phẩm / ca lâm sàng · Dental Thái Lan<br>Tỉ lệ đạt bài test SP (sales NPP) · Dental Thái Lan','C11-02 · C11-03','Man',fl('TDE',note='chưa nối · bài test: chưa có file'),'M'),
   ('Sự kiện KOL, MMH & triển lãm · Dental Thái Lan','C14-00','Sui',fl('TDE',note='chưa nối'),'M')],
  (['Đào tạo khách hàng / Giới thiệu sản phẩm: đếm số buổi sales ghi ở mục <b>Thuyết trình</b> trên app CRM.','Đào tạo khách hàng · VN (Giang): đếm buổi đào tạo bên ngoài (External) do Giang đứng lớp, trạng thái Completed.','Sự kiện KOL & triển lãm: đếm sự kiện trong tháng có link thư mục chi tiết sự kiện.'],
   ['Loại sự kiện theo sheet 4B: do KOL dẫn · do thành viên MMH dẫn · triển lãm.','Tỉ lệ đạt bài test: số sales NPP đạt ÷ số sales NPP làm bài.'])),
 ('Digital & Design · Ra mắt sản phẩm', 'Mã C17 và C16 · tỉ lệ: quý / năm lấy trung bình tháng · tối đa 130%', [
   ('Tỉ lệ tin nhắn hỏi · bài sự kiện','C17-01','Minh Trang, Duc Anh',fl('DMA'),'A'),
   ('Tỉ lệ tin nhắn hỏi · bài sản phẩm','C17-02','Minh Trang, Duc Anh',fl('DMA'),'A'),
   ('Đăng bài đúng hạn','C17-03','Minh Trang',fl('DME'),'A'),
   ('Số nội dung Facebook & Zalo OA','C17-04','Minh Trang',fl('DME'),'A'),
   ('Giao thiết kế đúng hạn','C17-05','Duc Anh',fl('DMO'),'A'),
   ('Điểm sản phẩm thiết kế','C17-06','Minh Trang, Duc Anh',fl('DMO'),'A'),
   ('Nội dung sản phẩm đã đăng · Dental Thái Lan','C17-07','Sui',nf('Kế hoạch digital Thái','chưa có file · chưa có mục tiêu'),'N'),
   ('Ra mắt nhóm SP mới · Dental Thái Lan','C16-00','Sui',nf('Đơn hàng đầu tiên của NPP Thái','chưa có file'),'N')],
  (['Tỉ lệ tin nhắn hỏi = tổng tin nhắn (Inbox) ÷ tổng người tiếp cận của quảng cáo sự kiện / sản phẩm.','Đăng bài đúng hạn = bài có link và điền link trước hoặc đúng ngày dự kiến ÷ bài kế hoạch (bỏ bài huỷ). Mục tiêu 96%.','Số nội dung: đếm link bài đăng (1 ô có 2 link tính 2). Mục tiêu 20 / tháng.','Giao thiết kế đúng hạn = yêu cầu "On time" ÷ yêu cầu trong tháng. Mục tiêu 96%. Điểm thiết kế = cộng điểm các yêu cầu (100 / tháng).'],
   ['Ra mắt nhóm SP mới: tính khi MMH nhận đơn đầu tiên của nhóm sản phẩm NPP chưa từng đặt. Mục tiêu 5 nhóm (2 trong 01/2027, 3 trong 02/2027).'])),
 ('Đơn hàng & giao nhận', 'Mã P2 · Back Office · điểm 100 = đạt, tỉ lệ mục tiêu 99 – 100% · quý / năm lấy trung bình', [
   ('Điểm giao hàng','P2-01','Hoa, Dam Ha, Hau',fl('BO','Delivery'),'M'),
   ('Xác nhận lịch giao đúng hạn','P2-02','Dam Ha',fl('OPT'),'M'),
   ('Xác nhận đơn hàng đúng hạn','P2-03','Dam Viet',fl('DAF'),'M'),
   ('Điểm xử lý đơn hàng','P2-04a · P2-04b','Dam Viet · Hau, Dam Ha',fl('BO','Order Processing'),'M'),
   ('Thông quan đúng hạn','P2-05','Hoa, Dam Viet',fl('IMX'),'M'),
   ('Nhập đơn Bravo đúng & kịp','P2-06','Hau',fl('BO','Bravo Data Entry'),'M'),
   ('Chuẩn bị hồ sơ thầu','P2-07','Hau',fl('TND'),'M'),
   ('Số đăng ký sản phẩm · VN','P2-08','Dam Ha',nf('Hồ sơ số đăng ký sản phẩm VN','chưa thấy file'),'N')],
  (['Điểm giao hàng: mỗi đơn giao sớm 110 · đúng lịch 100 · trễ 80; điểm tháng = trung bình các đơn.','Xác nhận lịch giao / đơn hàng đúng hạn = số đơn phản hồi đúng hạn ÷ số đơn nhận được.','Điểm xử lý đơn hàng: 100 điểm / tháng, trừ theo từng lỗi.','Thông quan: mỗi lô trong 2 ngày 110 · 3 ngày 100 · quá 3 ngày 80.','Nhập đơn Bravo = số đơn nhập đúng ÷ số đơn đã nhập.','Số đăng ký SP: cộng dồn, mục tiêu 10 giấy vào 8/2027.'],
   ['Chỉ chấm các mục đã ghi trong file theo dõi.'])),
 ('Tài chính & hành chính', 'Mã P5 · Back Office · trước hạn 110 · đúng hạn 100 · trừ 3 điểm mỗi lỗi hoặc mỗi ngày trễ', [
   ('Điểm báo cáo Back-office','P5-01a · b · c · d','Hoa · Mai · Dam Viet · Ngoc',fl('BO','Back-office Reporting'),'M'),
   ('Ghi nhận giao dịch ngân hàng','P5-02','Ngoc',fl('BO','Bank Transaction'),'M'),
   ('Kiểm soát chi phí','P5-03','Ngoc',fl('BO','Expense Review'),'M'),
   ('Phân bổ chi phí','—','Ngoc',fl('BO','Cost Allocation',note='chưa có dòng trong file KPI'),'M'),
   ('Xuất hoá đơn VAT đúng hạn','P5-05','chưa phân công','—','N'),
   ('Dự án hành chính (dữ liệu cá nhân, lao động, webapp)','P5-06','Hoa','Báo cáo tháng dự án hành chính','M'),
   ('Kê khai thuế','P5-07','Mai','Hồ sơ kê khai thuế','M')],
  (['Điểm báo cáo: mỗi báo cáo nộp trước hạn & chính xác 110, đúng hạn 100, trễ hoặc sai trừ 3 điểm / ngày, lỗi.','Ghi nhận giao dịch ngân hàng: giao dịch ngày D nhập trước 17:00 ngày D+1 (trước 12:00 = 110). Điểm tháng = trung bình các ngày.','Kiểm soát chi phí: xong trong 5 ngày làm việc đầu tháng. Phân bổ chi phí: nộp trước 12:00 ngày làm việc thứ 4.','Kê khai thuế: 100 điểm, trừ 3 mỗi lỗi không nộp chậm, trừ 5 mỗi lỗi có nộp chậm.'],
   ['Hạn, lỗi, ngày trễ ghi trong file theo dõi Back Office; chỉ chấm mục đã ghi.'])),
 ('Tài liệu · Tồn kho · Dự án', 'Mã P1, P3, P4 · Back Office · quý / năm lấy trung bình', [
   ('Tài liệu nội bộ ban hành / sửa đổi','P1-00','Dam Ha',nf('Sổ đăng ký SOP (Quality Manual)','chưa thấy file'),'N'),
   ('Số tháng tồn kho','P3-00','Dam Viet',fl('BO','Stock'),'M'),
   ('Dự án chuyển văn phòng','P4-00','Hoa',nf('Kế hoạch & báo cáo chuyển văn phòng','chưa thấy file'),'N')],
  (['Tài liệu nội bộ: đếm SOP / hướng dẫn được duyệt và ban hành mới hoặc sửa đổi. Mục tiêu 10 / năm.','Số tháng tồn kho = giá trị tồn kho ÷ giá vốn hàng bán (COGS) của tháng. 2,0 tháng = 100 điểm; mỗi 10% chênh lệch cộng / trừ 5 điểm.','Dự án chuyển văn phòng: 100 điểm khi đúng lịch và nộp đủ báo cáo tháng.'],
   ['Tồn kho: lấy từ báo cáo tồn kho đã chốt của tháng.','Tài liệu: phải được duyệt trong sổ đăng ký Quality Manual.'])),
 ('Đào tạo · Hành vi', 'Mã L1 – L3 · Điểm hành vi có ở cả 22 người (trọng số 10%)', [
   ('Đào tạo nội bộ - sản phẩm','L1-00','Giang',fl('TRN'),'A'),
   ('Đào tạo nội bộ - kỹ năng','L2-01 … L2-06','Tuyen, Giang, Thuong, Viet, Hoa, Dam Ha',fl('TRN'),'A'),
   ('Điểm hành vi (KBI)','L3-01 … L3-22','Mỗi người một dòng',fl('KBI'),'A')],
  (['Đào tạo nội bộ - sản phẩm: đếm buổi đào tạo nội bộ chủ đề Sản phẩm, trạng thái Completed (mọi người đứng lớp).','Đào tạo nội bộ - kỹ năng: đếm buổi nội bộ chủ đề khác Sản phẩm do chính người đó đứng lớp.','Điểm hành vi (KBI): quản lý trực tiếp chấm mỗi tháng. Điểm = 100 + điểm cộng − điểm trừ. Lý do cộng / trừ có trong file.'],
   ['Đào tạo: ghi đủ thông tin bắt buộc trong Training Master, đúng mẫu.','Hành vi: form KBI được hoàn thành và lưu mỗi tháng. Quý / năm = trung bình.'])),
]
# trạng thái theo tên KPI (cho Phần 5)
NAMES = {}
for g, sub, rows, _ in GROUPS:
    for kp, code, who, src, s in rows:
        for part in kp.split('<br>'):
            base = part.split(' / ')[0] if ' / ' in part and '·' in part.split(' / ')[0] else part
            NAMES[part.strip()] = s
def stOf(name):
    if name in NAMES: return NAMES[name]
    for k, v in NAMES.items():
        if k.split(' · ')[0] == name.split(' · ')[0] and (name.split(' · ')[-1] in k): return v
    pre = name.split(' · ')[0]
    for k, v in NAMES.items():
        if k.startswith(pre): return v
    return 'A'
OVR = {'Doanh số NPP · Surgical VN':'S','Doanh số NPP · Dental & MMG VN + thị trường khác':'S','Đi kèm coaching Sales Dental':'N','Đi kèm coaching Sales Surgical':'N',
       'Sự kiện KOL & triển lãm · VN':'S','Doanh số Composite · Dental VN':'S','Doanh số JIZAI · Dental VN':'S'}
PEOPLE = [
 ('Kinh doanh & Marketing Việt Nam · Sales','Dental · Surgical · Eyeless · trọng số quý 1',[
  ('Viet','Vietnam Dental - Sale Team leader',[('Doanh số NPP · Nam Dung',20),('Doanh số Composite · Nam Dung',5),('Doanh số JIZAI · Nam Dung',5),('Mở mới đại lý / SKU · Bắc',5),('Viếng thăm đại lý · Bắc',5),('Viếng thăm NPP / KH cuối · Bắc',5),('Doanh số hỗ trợ bán · Bắc',10),('SL Composite hỗ trợ · Nam Dung',10),('SL JIZAI hỗ trợ · Nam Dung',10),('Đào tạo khách hàng · Bắc',5),('Đào tạo nội bộ - kỹ năng',10),('Điểm hành vi (KBI)',10)]),
  ('Vinh','Vietnam Dental - Sale Representative',[('Doanh số NPP · SPI',25),('Doanh số Composite · SPI',5),('Doanh số JIZAI · SPI',5),('Mở mới đại lý / SKU · Trung',10),('Viếng thăm đại lý · Trung',10),('Viếng thăm NPP / KH cuối · Trung',5),('Doanh số hỗ trợ bán · Trung',15),('SL Composite hỗ trợ · SPI',5),('SL JIZAI hỗ trợ · SPI',5),('Đào tạo khách hàng · Trung',5),('Điểm hành vi (KBI)',10)]),
  ('Phuong','Vietnam Dental - Sale Representative',[('Doanh số NPP · Viet Thai + Meci',25),('Doanh số Composite · Viet Thai + Meci',5),('Doanh số JIZAI · Viet Thai + Meci',5),('Mở mới đại lý / SKU · Nam',10),('Viếng thăm đại lý · Nam',10),('Viếng thăm NPP / KH cuối · Nam',5),('Doanh số hỗ trợ bán · Nam',15),('SL Composite hỗ trợ · Viet Thai + Meci',5),('SL JIZAI hỗ trợ · Viet Thai + Meci',5),('Đào tạo khách hàng · Nam',5),('Điểm hành vi (KBI)',10)]),
  ('Viet Ha','Vietnam Surgical - Sale Representative',[('Doanh số Dao / Chỉ · Hung Vi',20),('Doanh số Manipler · MHI',5),('Mở mới khách hàng / SKU · Surgical Bắc',25),('Viếng thăm khách hàng · Surgical Bắc',25),('Giới thiệu sản phẩm / ca lâm sàng · Surgical Bắc',15),('Điểm hành vi (KBI)',10)]),
  ('Khang','Vietnam Surgical - Sale Representative',[('Doanh số Dao / Chỉ · Icare',20),('Doanh số Manipler · An Tam',5),('Mở mới khách hàng / SKU · Surgical Nam',25),('Viếng thăm khách hàng · Surgical Nam',25),('Giới thiệu sản phẩm / ca lâm sàng · Surgical Nam',15),('Điểm hành vi (KBI)',10)]),
  ('Trang','Vietnam Eyeless - Sale Representative',[('Doanh số NPP · Eyeless VN',55),('Viếng thăm khách hàng · Eyeless VN',5),('Sự kiện KOL & triển lãm · Dental VN',15),('Sự kiện KOL & triển lãm · Surgical VN',15),('Điểm hành vi (KBI)',10)])]),
 ('Kinh doanh & Marketing Việt Nam · Quản lý & Marketing','Trưởng phòng · Product Team · Marketing Team · trọng số quý 1',[
  ('Tuyen','Head of Sales & Marketing Vietnam',[('Doanh số NPP · Surgical VN',20),('Doanh số NPP · Dental & MMG VN + thị trường khác',20),('Doanh số Composite · Dental VN',10),('Doanh số JIZAI · Dental VN',10),('Đi kèm coaching Sales Dental',5),('Sự kiện KOL & triển lãm · VN',20),('Đào tạo nội bộ - kỹ năng',5),('Điểm hành vi (KBI)',10)]),
  ('Giang','Product Team Leader',[('Doanh số NPP · Surgical VN',20),('Doanh số NPP · Dental & MMG VN + thị trường khác',15),('Đi kèm coaching Sales Surgical',5),('Đào tạo khách hàng · VN',20),('Đào tạo nội bộ - sản phẩm',15),('Đào tạo nội bộ - kỹ năng',15),('Điểm hành vi (KBI)',10)]),
  ('Thuong','Marketing Team Leader',[('Doanh số NPP · Surgical VN',5),('Doanh số NPP · Dental & MMG VN + thị trường khác',20),('SL Composite do Marketing hỗ trợ',10),('SL JIZAI do Marketing hỗ trợ',10),('Sự kiện KOL & triển lãm · Dental VN',15),('Sự kiện KOL & triển lãm · Surgical VN',5),('Người tham dự sự kiện KOL · Dental VN',15),('Người tham dự sự kiện KOL · Surgical VN',5),('Đào tạo nội bộ - kỹ năng',5),('Điểm hành vi (KBI)',10)]),
  ('Minh Trang','Digital Marketing Executive',[('Doanh số NPP · Surgical VN',5),('Doanh số NPP · Dental & MMG VN + thị trường khác',20),('Tỉ lệ tin nhắn hỏi · bài sự kiện',10),('Tỉ lệ tin nhắn hỏi · bài sản phẩm',10),('Đăng bài đúng hạn',15),('Số nội dung Facebook & Zalo OA',20),('Điểm sản phẩm thiết kế',10),('Điểm hành vi (KBI)',10)]),
  ('Duc Anh','Designer',[('Doanh số NPP · Surgical VN',5),('Doanh số NPP · Dental & MMG VN + thị trường khác',20),('Tỉ lệ tin nhắn hỏi · bài sự kiện',10),('Tỉ lệ tin nhắn hỏi · bài sản phẩm',10),('Giao thiết kế đúng hạn',25),('Điểm sản phẩm thiết kế',20),('Điểm hành vi (KBI)',10)])]),
 ('Back Office','Kế toán · thuế · mua hàng · xuất nhập khẩu · kho vận · đăng ký sản phẩm · trọng số quý 1',[
  ('Hoa','Head of Back office',[('Doanh số NPP · Toàn công ty',40),('Điểm giao hàng',10),('Thông quan đúng hạn',5),('Dự án chuyển văn phòng',15),('Điểm báo cáo Back-office',10),('Dự án hành chính (dữ liệu cá nhân, lao động, webapp)',5),('Đào tạo nội bộ - kỹ năng',5),('Điểm hành vi (KBI)',10)]),
  ('Ngoc','Accounting Executive',[('Doanh số NPP · Toàn công ty',40),('Ghi nhận giao dịch ngân hàng',15),('Kiểm soát chi phí',15),('Điểm hành vi (KBI)',10),('Điểm báo cáo Back-office',20)]),
  ('Mai','Tax Accountant',[('Doanh số NPP · Toàn công ty',40),('Điểm báo cáo Back-office',25),('Kê khai thuế',25),('Điểm hành vi (KBI)',10)]),
  ('Dam Viet','Purchasing, Sales Support & Import–Export Executive',[('Doanh số NPP · Toàn công ty',40),('Xác nhận đơn hàng đúng hạn',10),('Điểm xử lý đơn hàng',15),('Thông quan đúng hạn',10),('Số tháng tồn kho',5),('Điểm báo cáo Back-office',10),('Điểm hành vi (KBI)',10)]),
  ('Dam Ha','Operations & Registration Team leader',[('Doanh số NPP · Toàn công ty',40),('Tài liệu nội bộ ban hành / sửa đổi',10),('Điểm giao hàng',10),('Xác nhận lịch giao đúng hạn',10),('Điểm xử lý đơn hàng',5),('Số đăng ký sản phẩm · VN',10),('Đào tạo nội bộ - kỹ năng',5),('Điểm hành vi (KBI)',10)]),
  ('Hau','Operations Executive',[('Doanh số NPP · Toàn công ty',40),('Điểm giao hàng',5),('Điểm xử lý đơn hàng',25),('Nhập đơn Bravo đúng & kịp',10),('Chuẩn bị hồ sơ thầu',10),('Điểm hành vi (KBI)',10)])]),
 ('Thái Lan · Surgical & Dental','Surgical: Dao, Miew · Dental: Yong, Man, Sui · trọng số quý 1',[
  ('Dao','Head of Surgical Sales & Marketing – Thailand',[('Doanh số NPP · Surgical Thái Lan / Myanmar',40),('Doanh số Hook + Micro Forceps · Surgical Thái Lan / Myanmar',10),('Sự kiện do MMH tổ chức · Surgical Thái Lan / Myanmar',10),('Sự kiện KOL & triển lãm · Surgical Thái Lan / Myanmar',30),('Điểm hành vi (KBI)',10)]),
  ('Miew','Thailand Surgical - Sale Representative',[('Doanh số Manipler · Novatech',40),('Mở mới khách hàng / SKU · Surgical Manipler Thái Lan',15),('Viếng thăm khách hàng · Manipler – Surgical Thái Lan',20),('Sự kiện do MMH tổ chức · Surgical Thái Lan',15),('Điểm hành vi (KBI)',10)]),
  ('Yong','Thailand Dental - Commercial Lead',[('Doanh số NPP · Dental & MMG Thái Lan',40),('Mở mới KH trọng điểm · Dental Thái Lan',20),('Lập hồ sơ KH trọng điểm · Dental Thái Lan',10),('Đi kèm sales NPP · Dental Thái Lan',20),('Điểm hành vi (KBI)',10)]),
  ('Man','Thailand Dental - Training & Education Lead',[('Doanh số NPP · Dental & MMG Thái Lan',25),('Ngày đi kèm đào tạo sales NPP · Dental Thái Lan',15),('Giới thiệu sản phẩm / ca lâm sàng · Dental Thái Lan',25),('Tỉ lệ đạt bài test SP (sales NPP) · Dental Thái Lan',25),('Điểm hành vi (KBI)',10)]),
  ('Sui','Thailand Dental - Marketing Lead',[('Doanh số NPP · Dental & MMG Thái Lan',20),('Sự kiện KOL, MMH & triển lãm · Dental Thái Lan',20),('Ra mắt nhóm SP mới · Dental Thái Lan',30),('Nội dung sản phẩm đã đăng · Dental Thái Lan',20),('Điểm hành vi (KBI)',10)])]),
]
EXP = {'Sự kiện do MMH tổ chức · Surgical Thái Lan / Myanmar':'W','Sự kiện KOL & triển lãm · Surgical Thái Lan / Myanmar':'W','Sự kiện do MMH tổ chức · Surgical Thái Lan':'W',
 'Doanh số Composite · Nam Dung':'A','Doanh số JIZAI · Nam Dung':'A','Doanh số Composite · SPI':'A','Doanh số JIZAI · SPI':'A','Doanh số Composite · Viet Thai + Meci':'A','Doanh số JIZAI · Viet Thai + Meci':'A',
 'Doanh số hỗ trợ bán · Bắc':'A','Doanh số hỗ trợ bán · Trung':'A','Doanh số hỗ trợ bán · Nam':'A','Đào tạo khách hàng · Bắc':'A','Đào tạo khách hàng · Trung':'A','Đào tạo khách hàng · Nam':'A',
 'Giới thiệu sản phẩm / ca lâm sàng · Surgical Bắc':'A','Giới thiệu sản phẩm / ca lâm sàng · Surgical Nam':'A','Giới thiệu sản phẩm / ca lâm sàng · Dental Thái Lan':'M','Tỉ lệ đạt bài test SP (sales NPP) · Dental Thái Lan':'M',
 'SL Composite hỗ trợ · Nam Dung':'A','SL JIZAI hỗ trợ · Nam Dung':'A','SL Composite hỗ trợ · SPI':'A','SL JIZAI hỗ trợ · SPI':'A','SL Composite hỗ trợ · Viet Thai + Meci':'A','SL JIZAI hỗ trợ · Viet Thai + Meci':'A',
 'Sự kiện KOL & triển lãm · Dental VN':'A','Sự kiện KOL & triển lãm · Surgical VN':'A','Doanh số Dao / Chỉ · Hung Vi':'A','Doanh số Manipler · MHI':'A','Doanh số Dao / Chỉ · Icare':'A','Doanh số Manipler · An Tam':'A',
 'Dự án hành chính (dữ liệu cá nhân, lao động, webapp)':'M','Kê khai thuế':'M','Đào tạo nội bộ - kỹ năng':'A','Viếng thăm đại lý · Bắc':'A','Viếng thăm NPP / KH cuối · Bắc':'A','Viếng thăm đại lý · Trung':'A','Viếng thăm NPP / KH cuối · Trung':'A','Viếng thăm đại lý · Nam':'A','Viếng thăm NPP / KH cuối · Nam':'A'}
def pstat(n): return OVR.get(n) or EXP.get(n) or stOf(n)

out = []
w = out.append
w('---\nnumber: 4\n---')
w('[[opener 4 | Hệ thống KPI FY68 | Số KPI lấy từ đâu, tính thế nào, xem ở đâu. Mỗi KPI được ghi rõ: lấy dữ liệu từ file nào, sheet nào (bấm vào tên file để mở), cách tính bằng lời, điều kiện được tính và trạng thái kết nối. Tên KPI dùng đúng tên tiếng Việt đang hiện trên Report Hub và CRM. | rh/kpi_tab | Về hệ thống KPI; Nguồn dữ liệu; Quy tắc tính (Rules); Xem KPI ở đâu; KPI theo phòng ban; Việc cần chốt; Dành cho người quản lý file KPI]]')
w('<div class="kpistat"><div><b>17</b>nhóm KPI</div><div><b>22</b>người có KPI</div><div><b>4</b>phòng ban</div><div><b>149</b>dòng KPI ở sheet 3. Detail KPI</div></div>')
w('<p class="legend">Trạng thái dùng trong chương: ' + ' '.join(st(c) for c in 'AWSMN') + '</p>')
w(':::note Số liệu đọc ngày 12/10/2026\nBấm vào tên file để mở đúng nguồn dữ liệu (cần quyền truy cập của công ty). Ảnh giao diện trong chương dùng dữ liệu giả lập. Bản gốc của nội dung này: tài liệu <b>Hướng dẫn hệ thống KPI FY68</b> của Product Team.\n:::')
# Phần 1
w('\n## Phần 1 · Về hệ thống KPI\n\n### 17 nhóm KPI của MMH năm FY68\n\nTên nhóm đúng như trên Report Hub / CRM · mã nhóm in nhỏ để đối chiếu với file KPI.\n')
G17 = [('Kinh doanh',[('Doanh số','F0 – F5','Doanh số MMH bán cho từng nhà phân phối (NPP)','Mọi người (theo mảng phụ trách)'),('Doanh số sản phẩm mới','F6','Composite, JIZAI, Hook + Micro Forceps','Tuyen, Viet, Vinh, Phuong, Dao'),('Mở mới','C1 – C2','Đại lý / khách hàng mới, SKU mới','Sales VN, Miew, Yong'),('Viếng thăm khách hàng','C3 – C4','Lượt gặp khách, đi kèm sales','Sales VN, Tuyen, Giang, Miew, Yong, Man'),('Bán hàng hỗ trợ','C5 – C7','Đơn hàng sales MMH hỗ trợ NPP bán','Viet, Vinh, Phuong')]),
 ('Marketing',[('Marketing hỗ trợ bán','C8 – C9','Số Composite / JIZAI bán nhờ sự kiện','Thuong'),('Sự kiện','C10 – C14','Hội thảo, đào tạo khách hàng, triển lãm','Sales, Marketing, Thái Lan'),('Người tham dự','C15','Khách tham dự sự kiện do KOL dẫn','Thuong'),('Ra mắt sản phẩm','C16','Nhóm sản phẩm mới ở Thái Lan','Sui'),('Digital & Design','C17','Quảng cáo, bài đăng, thiết kế','Minh Trang, Duc Anh, Sui')]),
 ('Back Office',[('Tài liệu','P1','SOP / hướng dẫn nội bộ','Dam Ha'),('Đơn hàng & giao nhận','P2','Giao hàng, xử lý đơn, thông quan, thầu','Back Office'),('Tồn kho','P3','Số tháng tồn kho','Dam Viet'),('Dự án','P4','Chuyển văn phòng','Hoa'),('Tài chính & hành chính','P5','Báo cáo, ngân hàng, chi phí, thuế','Back Office')]),
 ('Con người',[('Đào tạo','L1 – L2','Buổi đào tạo nội bộ','Quản lý, Team Leader'),('Hành vi','L3','Điểm hành vi (KBI) hằng tháng','Cả 22 người')])]
h = ['<div class="g17">']
for area, items in G17:
    for n, c, d, who in items:
        h.append(f'<div class="g {area[:2].lower()}"><span class="ar">{area}</span><b>{n}</b><span class="cd">{c}</span><p>{d}</p><small>{who}</small></div>')
h.append('</div>')
w('\n'.join(h))
w('\n### Số KPI đi từ đâu tới đâu\n\nHằng ngày mọi người chỉ nhập dữ liệu vào file / app quen thuộc. Số KPI tự chạy theo 4 bước.\n')
w('<div class="flow"><div><b>1 · Nhập dữ liệu hằng ngày</b>Sales ghi đơn hàng, đi địa bàn, mở mới trên CRM. Kế toán chốt doanh số. Marketing ghi sự kiện, bài đăng. Back Office chấm điểm báo cáo.</div><div><b>2 · Tự đổ số vào file KPI</b>Có người sửa file nguồn ⇒ số cập nhật sau vài giây. Lưu trên app ⇒ tối đa khoảng 1 phút. Cứ 15 phút đọc lại toàn bộ một lần. Ghi vào <a href="' + F['KPI'][1] + '">MMH_KPI_FY68 ▸ 3. Detail KPI</a></div><div><b>3 · Tính % đạt và tổng KPI</b>% đạt = thực đạt ÷ mục tiêu. Nhân với trọng số của từng người, cộng lại thành Tổng KPI tháng, quý, năm. Sheet 5. Member KPI Monthly và 6. Member KPI Summarize.</div><div><b>4 · Xem trên app</b><a href="' + F['RH'][1] + '">MMH Report Hub</a> và <a href="' + F['CRM'][1] + '">MMH CRM</a> hiện đúng số của file KPI: KPI của bạn, của nhóm, Total KPI công ty, email báo cáo KPI tháng.</div></div>')
w(':::rule App chỉ đọc số từ file KPI\nApp không tự tính lại. Số trên app sai ⇒ sửa ở file nguồn (bước 1), không sửa trên app. Ai xem được gì: Giám đốc xem tất cả · Trưởng phòng xem cả phòng · Team Leader xem cả nhóm · nhân viên chỉ xem KPI của mình.\n:::')
w('\n### Đã tự động kết nối được bao nhiêu?\n\nĐếm trên toàn bộ 149 dòng KPI của sheet 3. Detail KPI.\n')
w('<div class="kpicnt"><div class="a"><b>92</b>Đã tự động kết nối<small>Doanh số, CRM Việt Nam, Marketing Việt Nam, Đào tạo, Điểm hành vi.</small></div><div class="s"><b>13</b>Tự cộng từ các dòng con<small>Ví dụ: Viếng thăm khách hàng · VN = cộng lượt của từng sales.</small></div><div class="w"><b>6</b>Đã kết nối · chưa nhận số<small>Sự kiện Surgical Thái Lan, và một số mã chưa có số tháng 09 – 10.</small></div><div class="m"><b>38</b>Chưa kết nối · nhập tay<small>Back Office, Dental Thái Lan, đi kèm coaching, và các dòng nhóm không ai nhận.</small></div></div>')
w('- **Kinh doanh & Marketing Việt Nam**: gần như 100% trọng số đã tự động (chỉ còn KPI đi kèm coaching của Tuyen, Giang).\n- **Back Office và Dental Thái Lan**: 30% – 65% trọng số vẫn đang nhập tay. Xem chi tiết từng người ở Phần 5.')
# Phần 2
w('\n## Phần 2 · Nguồn dữ liệu\n\n### Các nguồn dữ liệu đã tự động kết nối\n\nBấm vào tên file để mở đúng sheet.\n')
SRC = [(fl('TURN'),'Kế toán','Doanh số · Doanh số sản phẩm mới','A'),
 (fl('DEN')+' · '+fl('SUR')+' · '+fl('EYE')+'<br><small>sheet 3. SALE ORDER · 6. WEEKLY REPORT · 7. PRODUCT PRESENTATION · 16. NEW ACCOUNT & SKU, tổng hợp ở 9. TARGET & KPI</small>','Sales VN (qua app CRM)','Mở mới · Viếng thăm · Bán hàng hỗ trợ · Sự kiện (đào tạo khách hàng, giới thiệu sản phẩm)','A'),
 (fl('THS')+'<br><small>sheet 6. CUSTOMER VISITING · 23 (mở mới)</small>','Miew (qua app CRM)','Mở mới · Viếng thăm (Manipler)','A'),
 (fl('MKO'),'Marketing','Marketing hỗ trợ bán · Sự kiện KOL & triển lãm · Người tham dự','A'),
 (fl('DMA')+'<br>'+fl('DME')+'<br>'+fl('DMO'),'Minh Trang, Duc Anh','Digital & Design','A'),
 (fl('TRN'),'Người đứng lớp (Training Hub)','Đào tạo · Đào tạo khách hàng (Giang)','A'),
 (fl('KBI'),'Quản lý trực tiếp','Hành vi','A'),
 (fl('THM'),'Surgical Thái Lan','Sự kiện Surgical Thái Lan (Dao, Miew)','W')]
w('<table class="kt"><thead><tr><th>Nguồn dữ liệu</th><th>Ai nhập</th><th>Đổ số cho nhóm KPI</th><th>Trạng thái</th></tr></thead><tbody>' + ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{st(d)}</td></tr>' for a,b,c,d in SRC) + '</tbody></table>')
w('Tất cả số trên được ghi vào ' + fl('KPI') + '. Không cần bấm nút nào: sửa file nguồn ⇒ số KPI tự cập nhật.')
w('\n### Các nguồn dữ liệu chưa kết nối\n\nSố của các KPI này đang được gõ tay vào file KPI · file đã có trên Drive thì bấm để mở.\n')
NC = [(fl('BO')+'<br><small>sheet Back-office Reporting · Order Processing · Delivery · Bravo Data Entry · Bank Transaction · Expense Review · Cost Allocation · Stock</small>','Điểm báo cáo Back-office, Điểm xử lý đơn hàng, Điểm giao hàng, Nhập đơn Bravo, Ghi nhận giao dịch ngân hàng, Kiểm soát chi phí, Số tháng tồn kho','Back Office','Đã có, đang chấm điểm, chưa nối vào file KPI'),
 (fl('OPT')+' · '+fl('DAF'),'Xác nhận lịch giao, Xác nhận đơn hàng đúng hạn','Dam Ha, Dam Viet','Đã có, chưa nối'),
 (fl('IMX')+' · '+fl('TND'),'Thông quan đúng hạn, Chuẩn bị hồ sơ thầu','Hoa, Dam Viet, Hau','Đã có, chưa nối'),
 ('Sổ đăng ký SOP · Kế hoạch chuyển văn phòng · Hồ sơ số đăng ký sản phẩm VN','Tài liệu nội bộ, Dự án chuyển văn phòng, Số đăng ký sản phẩm','Dam Ha, Hoa','Chưa thấy file'),
 (fl('TDA')+' · '+fl('TDE'),'Đi kèm sales NPP, Ngày đi kèm đào tạo, Giới thiệu sản phẩm, Sự kiện KOL, MMH & triển lãm (Dental Thái Lan)','Yong, Man, Sui','Đã có file năm FY67, chưa nối'),
 ('Báo cáo NPP Thái · danh sách hồ sơ KH trọng điểm · bài test sản phẩm · kế hoạch digital Thái','Mở mới KH trọng điểm, Lập hồ sơ KH trọng điểm, Tỉ lệ đạt bài test, Nội dung sản phẩm đã đăng, Ra mắt nhóm SP mới','Yong, Man, Sui','Chưa thấy file'),
 ('Form đánh giá Field Coaching','Đi kèm coaching Sales Dental / Surgical','Tuyen, Giang','Chưa thấy file')]
w('<table class="kt"><thead><tr><th>Nguồn dữ liệu</th><th>Dùng cho KPI</th><th>Người phụ trách</th><th>Tình trạng file</th></tr></thead><tbody>' + ''.join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a,b,c,d in NC) + '</tbody></table>')
w('[[backend kpi]]')
# Phần 3
w('\n## Phần 3 · Quy tắc tính (Rules)\n\n### Quy tắc chung cho mọi KPI\n\nTheo sheet 4. Rule của file KPI.\n')
w('<div class="rules"><div><b>% đạt</b>= Thực đạt ÷ Mục tiêu của tháng.<small>Ví dụ: mục tiêu 30 lượt viếng thăm, đi được 27 lượt ⇒ đạt 90%.</small></div><div><b>Tối đa 130%</b>Mỗi KPI tính tối đa 130% (tháng, quý, năm). Riêng Doanh số và Doanh số sản phẩm mới không giới hạn.</div><div><b>Mục tiêu = 0</b>Tháng đã qua mà mục tiêu bằng 0 ⇒ tính đạt 100%, được đủ trọng số.</div><div><b>Tổng KPI</b>Mỗi KPI có trọng số (tổng của một người = 100%). Tổng KPI = cộng (% đạt × trọng số).<small>Ví dụ: đạt 90% ở KPI trọng số 20% ⇒ góp 18%.</small></div><div><b>Quý và năm</b>Cộng số của các tháng. KPI dạng tỉ lệ % hoặc điểm thì lấy trung bình các tháng.</div><div><b>Hạn báo cáo</b>Hoàn thành KPI tháng trước ngày 2 tháng sau, gửi email cho trưởng bộ phận và Giám đốc, CC Ms. Hoa.</div><div><b>Trễ báo cáo</b>10% báo cáo trễ / thiếu ⇒ trừ 20% thưởng. Trên 50% ⇒ không xét thưởng (quy chế lương thưởng MMH-009).</div><div><b>Màu kết quả</b><span class="chip">dưới 90%</span> <span class="chip" style="background:#DCE6F6;color:#3A5CAA">90 – dưới 100%</span> <span class="chip y">100 – 120%</span> <span class="chip g">trên 120%</span></div></div>')
w('Quý theo năm tài chính: **Q1 = tháng 9 → 11 · Q2 = 12 → 2 · Q3 = 3 → 5 · Q4 = 6 → 8.**')
for g, sub, rows, (how, cond) in GROUPS:
    w(f'\n### {g}\n\n<p class="gsub">{sub}</p>\n')
    w(table(rows))
    w(howcond(how, cond))
# Phần 4
w('\n## Phần 4 · Xem KPI ở đâu\n\n### Report Hub ▸ KPI\n\nMở [MMH Report Hub](' + F['RH'][1] + ') ▸ menu **KPI**.\n')
w('[[fig rh/kpi_tab | Tab KPI trong Report Hub (dữ liệu giả lập): hàng chọn người, 4 ô tổng, xu hướng theo tháng, đóng góp theo nhóm và bảng chi tiết.]]')
w('1. **Chọn người** (quản lý): bấm thẻ tên ở hàng trên, dòng "Đang xem KPI của …" cho biết đang xem ai.\n2. **4 ô tổng**: KPI tháng · quý · năm · số KPI đạt.\n3. **Xu hướng theo tháng** và **Đóng góp theo nhóm KPI**.\n4. **Bảng chi tiết**: nhóm KPI · tên KPI tiếng Việt (rê chuột xem tên gốc) · trọng số · mục tiêu · thực đạt · % đạt.\n5. Chưa có số ⇒ hiện **Chưa chốt**, không tính là 0%.\n6. Nút **Báo cáo KPI tháng** soạn sẵn email; **Setting Expectation** tạo file Word.')
w(':::tip Nhắc hạn\nNgày 02 hằng tháng app nhắc báo cáo KPI tháng trước; ngày 09 tháng đầu quý nhắc tự đánh giá quý.\n:::')
w('\n### CRM ▸ KPI & Mục tiêu\n\nMở [MMH CRM](' + F['CRM'][1] + ') ▸ **KPI & Mục tiêu** · cùng cách xem như Report Hub.\n')
w('[[fig crm/kpi_tab, crm/m_kpi | KPI & Mục tiêu trong CRM: máy tính (trái) và điện thoại (phải), dữ liệu giả lập.]]')
w('1. Đầu trang: trung bình nhóm, số người đạt ≥ 100%, số người dưới 90%, so sánh các thành viên.\n2. Bên dưới: KPI của từng người, giống Report Hub.\n3. Sales lưu đơn hàng, lượt đi địa bàn, buổi thuyết trình, hồ sơ mở mới ⇒ sau vài giây số KPI tự nhảy.\n4. **Mở mới & SKU mới**: sales nộp bằng chứng, quản lý Xác nhận / Trả lại / Từ chối. Chỉ hồ sơ đã xác nhận mới được tính KPI.\n5. Nhóm Thái Lan: toàn bộ tiếng Anh.')
w('\n### Total KPI công ty · Email KPI tháng\n\nTotal KPI: Admin, Giám đốc, Trưởng phòng · nút **Total KPI công ty** trên trang KPI.\n')
w('[[fig rh/total_kpi | Total KPI ▸ Tổng quan (dữ liệu giả lập).]]')
w('- **Tổng quan**: 4 mảng Tài chính · Khách hàng · Quy trình nội bộ · Học hỏi & phát triển; mỗi mục tiêu chiến lược = trung bình % các KPI liên quan.\n- **KPI công ty**: mục tiêu và thực đạt của từng KPI toàn công ty.\n- **Thành viên**: tổng KPI từng người theo tháng / quý / năm.\n- **Cách tính KPI**: tóm tắt quy tắc của từng nhóm.\n- **Email KPI tháng**: chọn tháng ⇒ app điền sẵn người nhận (Team Leader, Trưởng phòng, Giám đốc), bảng KPI, phần nhận xét ⇒ xem trước ⇒ gửi.')
w('[[fig crm/kpi_report, crm/m_kpi_report | Báo cáo KPI tháng: máy tính (trái) và điện thoại (phải).]]')
w('[[fig crm/kpi_se | Setting Expectation & tự đánh giá quý: KPI quý điền sẵn, viết tự đánh giá rồi tải file Word.]]')
w(':::note\nNhóm Tài chính & hành chính của Back Office hiện chưa gắn với mục tiêu chiến lược nào trên Total KPI.\n:::')
# Phần 5
w('\n## Phần 5 · KPI theo phòng ban\n')
w('<p class="legend">Chấm màu: ' + ' '.join(dot(c) + ST[c][1] for c in 'ASWMN') + '</p>')
for dept, sub, ppl in PEOPLE:
    w(f'\n### {dept}\n\n<p class="gsub">{sub}</p>\n')
    h = ['<div class="kpp">']
    for name, title, ks in ppl:
        tot = sum(x for _, x in ks)
        rows = ''.join(f'<li>{dot(pstat(k))}<span>{k}</span><b>{v}%</b></li>' for k, v in ks)
        h.append(f'<div class="p"><div class="ph"><b>{name}</b><small>{title}</small></div><ul>{rows}</ul></div>')
    h.append('</div>')
    w('\n'.join(h))
# Phần 6
w('\n## Phần 6 · Việc cần chốt\n\n### Những điểm chưa rõ / chưa khớp\n\nXếp theo mức ảnh hưởng tới điểm KPI.\n')
ISS = [('Số tháng tồn kho (Dam Viet) đang tính sai %','Mục tiêu tính bằng tháng, thực đạt nhập bằng điểm (tháng 09 nhập 78,9 ⇒ hiện 130%; tháng 10 nhập 1 ⇒ 50%). Tồn kho càng ít tháng càng tốt, nên không chia thẳng được. Đề xuất đổi sang điểm, mục tiêu 100.','Back Office chốt'),
 ('Sự kiện Surgical Thái Lan chưa nhận số','Dao (40% trọng số) và Miew (15%) đang trống tháng 09 – 10. Product Team nối ' + fl('THM') + '.','Product Team'),
 ('Dental Thái Lan chưa có nguồn','Sui 70%, Man 65%, Yong 50% trọng số đang gõ tay. Cần file báo cáo hoạt động / sự kiện FY68 theo mẫu, rồi nối tự động.','Dao chốt'),
 ('Điểm xử lý đơn hàng: mức trừ khác nhau','Quy tắc ghi "trừ theo từng lỗi"; file Back Office trừ 1, 3 hoặc 5 điểm tuỳ người; Phượng, Thảo được chấm nhưng không có KPI.','Ms. Hoa chốt mức trừ'),
 ('Điểm báo cáo Back-office: số người khác nhau','Quy tắc: trung bình 3 người (Hoa, Mai, Dam Viet); file KPI có thêm Ngoc; file Back Office không chấm Hoa. Phân bổ chi phí có quy tắc, có điểm nhưng không có KPI. Hoá đơn VAT chưa có người nhận.','Back Office'),
 ('Hạn ngày 2 hằng tháng','Quy tắc: sau ngày 2 không sửa số tháng trước. Hệ thống đã bỏ khoá từ 03/10 (số luôn cập nhật).','Giám đốc chọn giữ cách nào'),
 ('Còn thiếu quy tắc / mục tiêu','Tổng khách hàng 3 NPP Thái (lập hồ sơ KH trọng điểm), mục tiêu Nội dung SP đã đăng (Sui), thang điểm Chuẩn bị hồ sơ thầu, form đi kèm coaching.','Người phụ trách'),
 ('File đang đọc mang tên FY67', fl('TRN') + ' và ' + fl('KBI') + ' đang dùng tab / file tên FY67 (đã lọc đúng ngày FY68). Nên xác nhận đây là file dùng tiếp cho năm nay.','Product Team')]
w('<div class="iss">' + ''.join(f'<div><b>{t}</b><p>{d}</p><small>{o}</small></div>' for t, d, o in ISS) + '</div>')
w('\n### Bước tiếp theo\n')
w('<div class="next"><div><b>Product Team làm được ngay</b><ol><li>Nối sự kiện Surgical Thái Lan vào file KPI.</li><li>Nối Back Office KPI Tracking FY68: các sheet đã có điểm (báo cáo, ngân hàng, chi phí, xử lý đơn, Bravo, giao hàng, tồn kho).</li><li>Kiểm tra file Đào tạo / Điểm hành vi đúng năm FY68.</li></ol></div><div><b>Back Office chốt</b><ol><li>Cách tính Số tháng tồn kho.</li><li>Mức trừ điểm xử lý đơn hàng, điểm báo cáo; danh sách người.</li><li>Thêm KPI Phân bổ chi phí, phân công Hoá đơn VAT.</li></ol></div><div><b>Giám đốc / Dao chốt</b><ol><li>Giữ cập nhật liên tục hay khoá số sau ngày 2.</li><li>File nguồn FY68 cho Dental Thái Lan.</li><li>Form đi kèm coaching, tổng khách hàng 3 NPP Thái, mục tiêu nội dung digital Thái.</li></ol></div></div>')
# Phần 7 (kỹ thuật, giữ từ bản trước)
old = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kpi_tech_src.md'), encoding='utf-8').read()
def section(title):
    i = old.find('## ' + title)
    if i < 0: return ''
    j = old.find('\n## ', i + 3)
    return old[i:j if j > 0 else len(old)]
tech = section('Dành cho người quản lý file KPI')
auto = section('Tự điền diễn ra thế nào')
manual = section('Phần nào còn nhập tay')
if tech:
    w('\n## Dành cho người quản lý file KPI\n')
    if auto: w(auto.replace('## Tự điền diễn ra thế nào', '### Tự điền diễn ra thế nào').strip())
    if manual: w('\n' + manual.replace('## Phần nào còn nhập tay', '### Phần nào còn nhập tay').strip())
    w('\n' + tech.replace('## Dành cho người quản lý file KPI', '### Menu ⚡ KPI Sync trong file KPI').strip())
open('/home/claude/ifu/chapters/30-kpi.md', 'w', encoding='utf-8').write('\n\n'.join(out) + '\n')
print('ok', len(out))
