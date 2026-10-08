/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  KpiSyncCenter.gs                                v1.18
   Trung tâm đồng bộ của file MMH KPI FY68 (sheet 3. Detail KPI)
   ────────────────────────────────────────────────────────────────────
   CÁCH CÀI (làm 1 lần, trong file MMH KPI FY68):
     1. Tiện ích mở rộng ▸ Apps Script ▸  +  ▸ Script ▸ đặt tên  KpiSyncCenter
        ▸ dán TOÀN BỘ file này ▸ Lưu. KHÔNG sửa code KPI Hub và TurnoverLink đang có.
     2. Chọn hàm  kscSetup  ▸ Run ▸ cấp quyền.
     3. Tải lại file KPI: thanh menu có thêm  "⚡ KPI Sync".
     4. Trong project Training Hub: chạy  trkStop  rồi xoá file TrainingKpiLink
        (phần Training giờ chạy ở đây, tránh 2 nơi cùng ghi).

   ĐỒNG BỘ TỰ ĐỘNG (Realtime):
     · Sửa tay trên Training Master, Turnover Report, file Digital Marketing & Design, các file CRM
       ⇒ chạy ngay (trigger khi sửa file).
     · Dữ liệu do web app ghi (Training Hub, CRM app) ⇒ kiểm tra mỗi 1 phút, file nào vừa đổi mới đọc lại
       (1 phút là chu kỳ ngắn nhất Google cho phép với trigger thời gian).
     · Cứ 15 phút đọc lại toàn bộ 1 lần để chắc chắn không sót.
   MENU "⚡ KPI Sync":
     🔄 Cập nhật Manual  ⇒ đọc lần lượt mọi backend, thanh tiến độ cho biết đang đọc file nào,
                           sheet nào, ghi những mã KPI nào, bao nhiêu ô.
     📋 Trạng thái nguồn dữ liệu ⇒ sheet "KPI SYNC STATUS": mã nào đã có nguồn tự động, nguồn nào,
                           tháng nào đã có Actual.
   QUY TẮC GHI vào cột "<yyyymm> Actual" của 3. Detail KPI:
     · Ô công thức tổng (SUMIF / AVERAGEIF … của dòng tổng) giữ nguyên.
     · Ô công thức tạm kiểu "=O5" (lấy tạm target) coi là CHƯA CÓ SỐ ⇒ được ghi số thật.
     · Ô công thức khác ⇒ được thay bằng số của backend, công thức cũ lưu ở sheet ẩn _SYNC_REPLACED.
     · Tháng đã chốt (sau 16:00 ngày 2 tháng sau) chỉ điền khi ô còn trống / còn công thức tạm.
       Riêng doanh số Turnover (số kế toán) luôn cập nhật theo SUM TURNOVER, kể cả tháng đã chốt.
     · Chỉ ghi tháng đã tới.
   Không đụng code KPI Hub, menu KPI Hub, trigger của KPI Hub và TurnoverLink.

   v1.1 (02/10/2026)
     · Doanh số NPP (mã F) tính THẲNG từ sheet SUM TURNOVER (Actual USD, lũy kế từ tháng 9, chỉ tháng đã đóng
       theo đúng rule của file Turnover). Lý do: công thức của tab _KPI_ACT dùng mảng {"Dental";"MMG"},
       {"MECI";"VIET THAI"}… mà không bọc ARRAYFORMULA ⇒ Google Sheets chỉ cộng phần tử đầu
       (F3-01, F3-02, F3-03, F6-01c thiếu số; F1-00, F4-00, F6-03 cùng lỗi khi có số ở phần tử thứ 2).
       Code cũng tự bọc ARRAYFORMULA cho các công thức đó trong _KPI_ACT để file Turnover và TurnoverLink
       đọc ra cùng số.
     · F6-02 (JIZAI, USD): SUM TURNOVER hiện chỉ có Type "2 Jizai Qty" (số vỉ) ⇒ chưa có số USD để ghi.
       Khi file Turnover có Type chứa "Jizai" và "amount"/"USD", F6-02, F6-02a/b/c tự lấy.
     · MKT online & Design (C17-01 → C17-06) lấy từ file "3. Vietnam - Digital Marketing & Design FY68"
       theo cách tính của team Marketing (xem KSC_MKT). Khi có người điền "Link report" / "Task Result",
       code tự ghi ngày điền vào cột "Ngày điền link (auto)" để xét đúng tiến độ.

   v1.2 (02/10/2026) · BÁO CÁO GIẢI THÍCH KPI (PDF) + SHEET "KPI EXPLAIN MAP"
     · Menu ⚡ KPI Sync ▸ 📄 Báo cáo giải thích KPI (PDF): chọn Tháng / Quý / Cả năm, 1 PIC hoặc tất cả.
       Mỗi mã: nguồn dữ liệu (hyperlink tới đúng file ▸ sheet), rule tính, Target, Actual, % đạt và diễn giải
       từ dữ liệu gốc. Phụ lục: rule của sheet 4. Rule cho các nhóm KPI có trong báo cáo (hyperlink).
     · Sheet "KPI EXPLAIN MAP" (tự tạo, tự thêm dòng khi 3. Detail KPI có mã mới): cột auto do code điền
       (nguồn, URL, rule tính, nhóm rule ở 4. Rule); cột "sửa tay" để anh ghi đè hoặc bổ sung cho mã mới,
       cột "Mẫu diễn giải" dùng {actual} {target} {pct} {unit} {period}. PDF luôn đọc theo sheet này.

   v1.3 (02/10/2026) · ĐIỂM HÀNH VI (KBI) + PDF GỌN HƠN
     · Nguồn mới "Điểm hành vi (KBI)": file Key Behavioral Indicators Report, sheet "Detail report".
       Mã L3-xx của từng PIC = cột "Total point by month" (100 + điểm cộng + điểm trừ) theo PIC và Month.
       Chỉ ghi khi Detail report có dòng của PIC trong tháng đó. Lý do trừ / cộng điểm (Detail minus /
       Detail pluses) được đưa vào PDF. Sau khi dán code: menu ⚡ KPI Sync ▸ ⚙ Bật lại đồng bộ Realtime
       (để tạo trigger chạy ngay khi sửa file KBI).
     · JIZAI (F6-02, F6-02a/b/c): SUM TURNOVER đã có Type "2 Jizai amount" (USD) ⇒ tự lấy như Composite
       (Type "3 Composite amount"). C5 / C6 / C7 (hỗ trợ bán) vẫn tính theo đơn hàng ở 3. SALE ORDER của CRM.
     · PDF giải thích KPI viết lại cho gọn: mỗi KPI 1 khối Target · Actual · % đạt, vài câu giải thích
       (đào tạo: ngày, nội dung, cho ai · đi địa bàn: gặp nhóm khách nào, nơi nào · hỗ trợ bán: khách, sản phẩm ·
       điểm hành vi: lý do trừ điểm · bài đăng, thiết kế…), cách tính 1 câu và hyperlink tới đúng sheet nguồn.
     · Tab KPI của CRM Việt Nam đổi tên "9. TARGET & KPI" (bản CRM v9.5, toàn bộ tiếng Anh); tên cũ vẫn đọc được.

   v1.4 (02/10/2026) · REALTIME KHÔNG BỎ SÓT, ĐỘ TRỄ THẤP NHẤT
     · Bỏ cơ chế "2 lần sửa trong 20 giây chỉ chạy 1 lần" (lần sửa sau phải chờ trigger 1 phút).
       Nay mỗi lần sửa được đánh dấu; lượt đang chạy xong sẽ chạy tiếp ngay nguồn vừa sửa ⇒ không lần sửa nào
       bị bỏ qua, số trên 3. Detail KPI nhảy sau khoảng 5 đến 20 giây.
     · Chỉ chạy khi sửa đúng sheet có dữ liệu KPI (ví dụ KBI: sheet Detail report; Training: Training Report FYxx;
       CRM: tab 1, 3, 6, 7, 9) ⇒ không tốn lượt chạy vô ích.
     · Trigger tự kiểm tra: thiếu trigger của nguồn nào (ví dụ nguồn mới KBI) thì lượt 1 phút tự tạo lại.
     · Menu ⚡ KPI Sync ▸ 🩺 Kiểm tra Realtime: từng nguồn đã có trigger chưa, lần đồng bộ gần nhất, kết quả.
     · Sheet KPI SYNC STATUS ghi lại sau mỗi lượt có thay đổi (tối đa 1 lần / 2 phút để không làm chậm lượt sau).

   v1.5 (02/10/2026) · TỔNG KPI THEO THÁNG / QUÝ + EMAIL KPI THÁNG
     · PDF: mỗi người có ô "Tổng KPI" (Σ % × trọng số) theo tháng và theo quý (báo cáo tháng: tháng đó + quý đến tháng đó;
       báo cáo quý: từng tháng + cả quý; báo cáo năm: từng quý + cả năm). Mỗi KPI thêm cột Trọng số và % × TS.
       Số lấy đúng sheet 5. Member KPI Monthly (trọng số theo quý ở 5A. KPI Weight Input), không tính lại theo cách khác.
     · Menu ✉ Soạn và gửi email KPI tháng: chọn tháng (mặc định tháng trước) và người, To / CC tự điền theo
       0. Staff List (Team Leader, HOD, Director) + CC luôn gửi vtt.hoa; bảng 1. Performance Summary KPI theo mẫu
       (Link · Type · KPI · Weight · Unit · Target · Actual · Unit · % · % *Weight · tổng); lời chào, phần 2 và 3, chữ ký tự soạn.
       Email gửi từ tài khoản người bấm gửi. Email từng người ở sheet "KPI EMAIL DIRECTORY" (tự tạo).

   v1.6 (02/10/2026) · NGUỒN MKT OFFLINE VIỆT NAM (sự kiện)
     · File "Vietnam - Marketing Offline Plan & Report FY68" (1e4sVYhi…), sheet REPORT_EVENT, theo cột Month:
       C8-00 Σ Actual sales - Composite (pcs) · C9-00 Σ Actual sales - Jizai (Sheets) ·
       C12-01 / C12-02 số sự kiện Dental/MMG / Surgical/Eyeless có Detail event folder link ·
       C15-01 / C15-02 Σ Actual Participant Dental/MMG / Surgical/Eyeless.
     · Realtime: sửa REPORT_EVENT, CUSTOMER LIST, ORDER LIST ⇒ chạy ngay; web app ghi ⇒ tối đa khoảng 1 phút.
     · PDF: liệt kê từng sự kiện (ngày, tên, loại, số người tham dự, số bán) và sự kiện chưa có folder.

   v1.7 (02/10/2026) · ĐỔI LINK FILE MKT OFFLINE NGAY TRÊN MENU
     · Menu ⚡ KPI Sync ▸ 🔗 Link file MKT offline VN: xem file đang đọc, dán link Google Sheet đúng (file có sheet REPORT_EVENT).
       Code kiểm tra file, lưu link, tạo trigger, chạy lại ngay và ghi đè các số đã ghi sai (kể cả tháng đã chốt).
     · File đọc được nhưng REPORT_EVENT không có sự kiện nào thuộc năm tài chính ⇒ báo lỗi, KHÔNG ghi số 0.
     · Cột Month dạng ngày tháng cũng đọc được.

   v1.8 (02/10/2026) · Link mặc định file MKT offline = backend "2. Vietnam - Marketing Offline FY68" (16vIDYRhm6…).
     · Lần đầu đọc một file MKT offline khác lần trước ⇒ tự ghi đè số cũ (kể cả tháng đã chốt) để sửa số 0 đã ghi nhầm.

   v1.9 (02/10/2026) · DÒNG TỔNG LUÔN = TỔNG DÒNG CON · TARGET = 0 ⇒ ĐẠT 100%
     · Dòng tổng (F3-00, F2-00, F6-01, F6-02, C3-00…): ô Actual đang là SỐ gõ / ghi đè (ví dụ F3-00 tháng 09 = 213,810 do
       TurnoverLink chép từ _KPI_ACT cũ) được thay bằng công thức tổng của chính dòng đó ⇒ luôn bằng tổng các dòng con
       (F3-00 = F3-01 + F3-02 + F3-03 = 368,215). Số cũ lưu ở _SYNC_REPLACED. TurnoverLink không ghi đè ô có công thức.
     · Sheet 5. Member KPI Monthly: tháng / quý / năm có Target = 0 (đã tới kỳ) ⇒ % = 100% dù có hay không có số thực hiện
       ⇒ được đủ trọng số (ví dụ Coaching 5% tháng không có target ⇒ 5%). Code sửa công thức cột "%" của sheet 5,
       tự sửa lại nếu sheet 5 được dựng lại. PDF và email KPI tháng dùng đúng số này.

   v1.10 (02/10/2026) · RÀ LẠI RULE TURNOVER (Type 1 Turnover, lọc theo cột Segment Report)
     · F1-01, F2-01 → F2-04 thêm điều kiện Segment Report = Surgical (trước chỉ lọc Distributor). Số tháng 09 không đổi.
     · Code KHÔNG ghi vào cột Target của 3. Detail KPI (chỉ ghi cột "<tháng> Actual"); Target chỉ được đọc để đẩy sang CRM và file Turnover.

   v1.11 (02/10/2026) · CẬP NHẬT LẠI THÁNG ĐÃ CHỐT (có xác nhận)
     · Menu ⚡ KPI Sync ▸ 🔓 Cập nhật lại tháng đã chốt: đọc lại mọi nguồn và ghi đè cả tháng đã qua mốc 16:00 ngày 2
       (ví dụ link bài đăng điền sau mốc chốt). Chỉ chạy 1 lần mỗi lần bấm, sau đó quy tắc chốt tháng áp dụng lại như cũ.

   v1.12 (02/10/2026)
     · C17-05 Thiết kế đúng tiến độ = số yêu cầu có "Check deadline report" = On time ÷ số yêu cầu trong tháng (bỏ Cancel).
       C17-06 Điểm thiết kế = Σ Điểm tổng của các yêu cầu trong tháng (theo Tháng hoàn thành, bỏ Cancel).
     · Cột "Ngày điền link (auto)" ghi dạng ngày thật (trước ghi chữ dd/MM/yyyy nên Google Sheets có thể đọc ngược
       thành tháng/ngày, ví dụ 02/10 thành 10/02). Ngày đã ghi ngược được đọc đúng lại.
     · Target = 0 ⇒ 100%: nhận cả công thức % khác mẫu, chạy ở bước riêng "Sheet 5 · Target = 0" và báo số ô đã sửa.
     · Menu 📅 Đổi Target doanh số (mã F) sang theo tháng: Target lũy kế ⇒ Target từng tháng, Agg LAST ⇒ SUM,
       FY68 Target / FY68 Actual = tổng 12 tháng. Từ đó Actual mã F ghi theo từng tháng (không lũy kế).
       Engine Turnover tự theo cột Agg: LAST ⇒ lũy kế, SUM ⇒ số của tháng.

   v1.13 (02/10/2026)
     · Dán code xong KHÔNG cần bấm gì: trong vòng 1 đến 3 phút code tự chạy 1 lượt nâng cấp:
       ① đổi Target lũy kế sang theo tháng (mã F và các mã đếm số có Agg = LAST, trừ mã tỷ lệ %),
       ② đọc lại mọi backend và ghi đè cả tháng đã chốt (sửa số cũ do rule bản trước ghi sai). Kết quả ở _CRM_SYNC_LOG.
     · Doanh số Turnover không bị khoá tháng: kế toán sửa SUM TURNOVER sau mốc 16:00 ngày 2 thì KPI vẫn cập nhật.
     · JIZAI (F6-02…): lấy đúng Type "2 Jizai amount". Nếu dòng Jizai amount của 1 NPP trong 1 tháng TRÙNG Y HỆT
       Composite amount cùng NPP cùng tháng (lỗi nhập ở Actual input / file kế toán) ⇒ KHÔNG ghi số đó, để trống
       và báo rõ NPP nào, tháng nào ở KPI SYNC STATUS. Thông báo Turnover có tổng Turnover · Composite · Jizai từng tháng.
     · C17-04 đếm SỐ LINK trong mọi cột Link report của EVENT REPORT + PRODUCT REPORT (1 ô có 2 link tính 2).
     · Ô tháng đã chốt mà nguồn có số khác: thông báo ghi rõ mã, tháng, số đang có và số ở nguồn (để bấm 🔓 nếu cần).

   v1.14 (02/10/2026) · RULE TARGET = 0 ⇒ ĐẠT 100% (sheet 5. Member KPI Monthly) LUÔN ĐÚNG
     · Mỗi phút code kiểm tra cột % (12 tháng, 4 quý, FY) của sheet 5. Ô nào chưa theo rule (chưa sửa, hoặc sheet 5
       bị dựng lại / chép công thức cũ) ⇒ sửa lại ngay. Trước đây chỉ sửa 15 phút / lần nên có lúc vẫn thấy % trống.
     · Tìm ô Target / Actual theo đúng tiêu đề cột của từng kỳ ("202609 Target", "202609 Actual"…), nhận mọi biến thể công thức %.
     · Rule: kỳ đã tới mà Target = 0 ⇒ % = 100% (đủ trọng số), có hay không có số thực hiện. Kỳ chưa tới để trống.
       Quý / năm: Target của kỳ = 0 mới tính 100%.
     · Menu 🎯 Kiểm tra rule Target = 0: sửa ngay và liệt kê từng người · mã KPI · tháng có Target = 0 kèm % đang hiện.

   v1.18 (03/10/2026) · BỎ RULE CHỐT SỐ THÁNG — MỌI NGUỒN ĐỒNG BỘ REALTIME 2 CHIỀU
     · Bỏ khoá "16:00 ngày 2 tháng sau": tháng nào cũng nhận số mới từ mọi nguồn (CRM, Turnover, Training, KBI, MKT…),
       sửa / thêm dữ liệu trễ ở nguồn ⇒ 3. Detail KPI và sheet 5 cập nhật theo, không cần bấm menu nào.
     · Lần chạy đầu sau khi dán code (tự động trong ~1 phút) đọc lại toàn bộ nguồn và ghi đè số cũ đang lệch.
     · Bỏ khỏi menu: 🔓 Cập nhật lại tháng đã chốt · 🕒 Nhận số CRM trễ (không còn cần).

   v1.17 (03/10/2026) · CỬA SỔ NHẬN SỐ TRỄ TỪ CRM CHO 1 THÁNG ĐÃ CHỐT
     · Tháng đã chốt vẫn khoá như rule (16:00 ngày 2 tháng sau). Khi cần nhận đơn hàng / hoạt động nhập trễ của 1 tháng:
       menu ⚡ KPI Sync ▸ 🕒 Nhận số CRM trễ cho 1 tháng đã chốt (tháng + hạn), hoặc quản lý mở trên app CRM (tab KPI ▸ 🔓).
     · Lưu ở sheet _CRM_LINKS ô J1 (tháng YYYYMM) · K1 (hạn YYYY-MM-DD). Chỉ áp dụng cho nguồn CRM, hết hạn tự khoá lại.
       CRM (v10.4 / Thái v1.12) đọc cùng 2 ô này nên cả 2 đường ghi đều nhận số mới ngay.

   v1.16 (03/10/2026) · CRM LUÔN TRỎ ĐÚNG FILE KPI NÀY + SỬA 1 LẦN THÁNG ĐÃ CHỐT CỦA MÃ ĐỔI RULE
     · Lỗi phát hiện: tab KPI của CRM (ô D9) + code CRM đang trỏ tới MỘT FILE KPI KHÁC (bản cũ, target C5-01 = 7.490).
       CRM kéo target từ file đó ⇒ đè target của file này (5.617) mỗi lần lưu; KpiSyncCenter ghi lại 5.617 ⇒ 2 bên
       giành nhau, còn số CRM tự tính lại được đẩy sang file cũ ⇒ file này không nhận được.
     · Nay mỗi lượt đọc CRM, nếu ô D9 tab KPI của CRM không phải link file này ⇒ tự ghi link file này vào D9.
       Từ lượt kế tiếp CRM kéo target / đẩy actual đúng vào file này (cần CRM VN v10.3 / Thái v1.11).
     · Mã đổi rule ở CRM v10.0 (C1 mở mới = case đã duyệt · C5 / C6 / C7 tính từ đơn hàng): lần đọc đầu tiên của mỗi CRM
       ghi đè 1 lần các tháng đã chốt (ví dụ 09/2026) bằng số CRM hiện tại. Đánh dấu ở Script Properties KSC_FIX_RULE10_<team>.

   v1.15 (02/10/2026) · SỬA LỖI #ERROR! Ở FY68 TARGET / FY68 ACTUAL (3. Detail KPI)
     · Nguyên nhân: file KPI dùng định dạng Việt Nam (số thập phân dấu phẩy) nên công thức phải ngăn đối số bằng dấu ";".
       Công thức code ghi bằng dấu "," bị Google Sheets báo #ERROR!.
     · Nay code tự thử 1 lần xem file dùng "," hay ";" rồi ghi công thức đúng kiểu của file. Các ô FY68 Target / FY68 Actual
       đang #ERROR! được ghi lại ngay khi dán code (tổng 12 tháng). Cột % của sheet 5 (rule Target = 0) cũng ghi theo kiểu này,
       ô nào đang #ERROR! được sửa lại.
   ════════════════════════════════════════════════════════════════════ */

var KSC_CLEAR = '§clear§';                                       // giá trị đặc biệt: xoá ô Actual (số nguồn sai)
var KSC = {
  TZ          : 'Asia/Ho_Chi_Minh',
  VERSION     : '1.18',
  LOCK_FREE   : { turnover: 1 },                                   // nguồn không bị khoá tháng (số kế toán)
  DETAIL      : '3. Detail KPI',
  LINKS       : '_CRM_LINKS',
  LOG         : '_CRM_SYNC_LOG',
  STATUS      : 'KPI SYNC STATUS',
  BACKUP      : '_SYNC_REPLACED',
  TRAINING_ID : '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',   // MMH - Training Master
  TURNOVER_ID : '1bujnLrxerjUM1gR3aOoy3r4gvTp4pNyPwJM-ra5iFe8',   // MMH Turnover Report FY67-FY68
  TURNOVER_ACT: '_KPI_ACT',
  TURNOVER_SUM: 'SUM TURNOVER',
  MKT_ID      : '1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc',   // 3. Vietnam - Digital Marketing & Design FY68
  /* link file CRM: dùng khi cột B của _CRM_LINKS còn trống (kscSetup tự điền vào _CRM_LINKS) */
  CRM_DEFAULT : { dental: '13aLqhO4H7he4LeHWNCdwNRhGXcIzieuNtFcA0BJJJj0', surgical: '16ke8ZRvmbG6TUte-oDLFSGzKbW9_PA98EJnLo5LoauM',
                  eyeless: '1FxMj1uWZBi6yimnAlPCOG0dh2OF0dFfWIQntFXVduZA', thai: '1rX8BDcbFGOjpXFmPJeKTkllE4LH7q9A8zz22R7jDA0E' },
  CRM_TAB     : { dental: '9. TARGET & KPI', surgical: '9. TARGET & KPI', eyeless: '9. TARGET & KPI', thai: '9. TARGET & KPI' },
  CRM_TAB_OLD : ['9. MỤC TIÊU & KPI'],                              // tên tab KPI trước CRM v9.5
  FULL_EVERY  : 15,          // phút: đọc lại toàn bộ
  EDIT_WAIT_S : 30,          // giây: lần sửa mới chờ tối đa bấy nhiêu nếu đang có lượt khác chạy (không bỏ lần sửa)
  STATUS_EVERY: 2,           // phút: ghi lại sheet KPI SYNC STATUS tối đa 1 lần trong khoảng này
  TEAM_LABEL  : { dental: 'CRM Dental', surgical: 'CRM Surgical', eyeless: 'CRM Eyeless', thai: 'CRM Thailand Surgical' },
  CRM_MANUAL  : { turnover: 1, manual: 1, event_hub: 1 },          // các dòng CRM nhận số TỪ file KPI
  EVENT_CODES : ['C11-01', 'C11-01a', 'C13-00']                     // KPI Hub đếm từ REPORT_EVENT (Marketing Offline Thái)
};

/* Doanh số NPP từ SUM TURNOVER (bộ lọc giống cột "Filter on SUM TURNOVER" của _KPI_ACT) */
var KSC_TURNOVER = [
  { code: 'F0-00',  type: '1 turnover' },
  { code: 'F1-00',  type: '1 turnover', seg: ['surgical'], country: ['thailand', 'myanmar'] },
  { code: 'F1-01',  type: '1 turnover', seg: ['surgical'], dist: ['novatec'] },
  { code: 'F2-01',  type: '1 turnover', seg: ['surgical'], dist: ['hung vi'] },
  { code: 'F2-02',  type: '1 turnover', seg: ['surgical'], dist: ['mhi'] },
  { code: 'F2-03',  type: '1 turnover', seg: ['surgical'], dist: ['icare'] },
  { code: 'F2-04',  type: '1 turnover', seg: ['surgical'], dist: ['an tam'] },
  { code: 'F3-01',  type: '1 turnover', seg: ['dental', 'mmg'], dist: ['nam dung'] },
  { code: 'F3-02',  type: '1 turnover', seg: ['dental', 'mmg'], dist: ['spi'] },
  { code: 'F3-03',  type: '1 turnover', seg: ['dental', 'mmg'], dist: ['viet thai', 'meci'] },
  { code: 'F4-00',  type: '1 turnover', seg: ['dental', 'mmg'], country: ['thailand'] },
  { code: 'F5-00',  type: '1 turnover', seg: ['eyeless'] },
  { code: 'F6-01',  type: '3 composite amount', country: ['viet nam'] },
  { code: 'F6-01a', type: '3 composite amount', dist: ['nam dung'] },
  { code: 'F6-01b', type: '3 composite amount', dist: ['spi'] },
  { code: 'F6-01c', type: '3 composite amount', dist: ['viet thai', 'meci'] },
  { code: 'F6-02',  type: '2 jizai amount', typeRe: /jizai.*(amount|usd)/, country: ['viet nam'] },   // Type "2 Jizai amount" (USD)
  { code: 'F6-02a', type: '2 jizai amount', typeRe: /jizai.*(amount|usd)/, dist: ['nam dung'] },
  { code: 'F6-02b', type: '2 jizai amount', typeRe: /jizai.*(amount|usd)/, dist: ['spi'] },
  { code: 'F6-02c', type: '2 jizai amount', typeRe: /jizai.*(amount|usd)/, dist: ['viet thai', 'meci'] },
  { code: 'F6-03',  type: '1 turnover', prod: ['micro forcep', 'trabeculotomy hook'] }
];

/* MKT online & Design (file 3. Vietnam - Digital Marketing & Design FY68) · cách tính theo team Marketing:
   C17-01 MIR Event   = Σ Kết quả (Inbox) ÷ Σ Tiếp cận của ADS REPORT, Type = Event, theo Month
   C17-02 MIR Product = như trên, Type = Product
   C17-03 Bài đăng đúng tiến độ = bài có Link report VÀ ngày điền link ≤ On-air dự kiến (deadline)
                                  ÷ bài kế hoạch trong tháng (EVENT REPORT + PRODUCT REPORT, bỏ Status Cancel)
   C17-04 Online content (Facebook, Zalo OA) = số link trong các cột Link report (EVENT + PRODUCT REPORT) theo Month, 1 ô 2 link tính 2
   C17-05 Thiết kế đúng tiến độ = yêu cầu có Task Result VÀ ngày điền ≤ Deadline ÷ yêu cầu có Deadline
                                  (ORDER REPORT, theo Tháng hoàn thành, bỏ Status Cancel)
   C17-06 Điểm thiết kế hoàn thành = Σ Điểm tổng (điểm tiêu chuẩn theo dạng ấn phẩm × số lượng), Status = Completed
   Ngày điền link: cột "Ngày điền link (auto)" do code ghi khi có người điền link. Dòng điền link TRƯỚC khi cài
   code (chưa có ngày) dùng tạm: On-air thực tế (bài đăng) hoặc cột "Check deadline report" = On time (thiết kế),
   nếu vẫn trống thì Status có chữ "đúng hạn" (bài đăng).
   ONTIME: 'lte' = điền trước hoặc đúng ngày deadline · 'eq' = chỉ tính khi điền đúng ngày deadline */
var KSC_MKT = {
  STAMP_HDR : 'Ngày điền link (auto)',
  ONTIME    : 'lte',
  POSTS     : [ { sheet: 'EVENT REPORT', title: 'event' }, { sheet: 'PRODUCT REPORT', title: 'topic' } ],
  ORDER     : 'ORDER REPORT',
  ADS       : 'ADS REPORT',
  CODES     : { mirEvent: 'C17-01', mirProduct: 'C17-02', postOnTime: 'C17-03', content: 'C17-04', designOnTime: 'C17-05', score: 'C17-06' },
  RULES     : {
    'C17-01': 'MIR Event = Σ Kết quả (Inbox) ÷ Σ Tiếp cận của ADS REPORT, Type = Event, theo Month (không có quảng cáo trong tháng thì để trống).',
    'C17-02': 'MIR Product = Σ Kết quả (Inbox) ÷ Σ Tiếp cận của ADS REPORT, Type = Product, theo Month.',
    'C17-03': 'Bài đăng đúng tiến độ = bài có Link report và ngày điền link ≤ On-air dự kiến ÷ bài kế hoạch trong tháng (EVENT REPORT + PRODUCT REPORT, bỏ Status Cancel). Ngày điền link lấy ở cột "Ngày điền link (auto)".',
    'C17-04': 'Online content (Facebook, Zalo OA) = số link (http…) trong các cột Link report của EVENT REPORT + PRODUCT REPORT, theo Month (1 ô có 2 link tính 2).',
    'C17-05': 'Thiết kế đúng tiến độ = số yêu cầu có Check deadline report = On time ÷ số yêu cầu trong tháng (ORDER REPORT, theo Tháng hoàn thành, bỏ Status Cancel).',
    'C17-06': 'Điểm thiết kế hoàn thành = Σ Điểm tổng (điểm tiêu chuẩn theo Dạng ấn phẩm × Số lượng) của các yêu cầu trong tháng (theo Tháng hoàn thành, bỏ Status Cancel).'
  }
};

/* Rule đếm KPI đào tạo (Training Master) */
var KSC_TRAIN = {
  REPORT_RE : /^training report fy\d+$/,
  DONE      : ['completed', 'complete', 'done', 'finished', 'hoan thanh', 'da hoan thanh'],
  ALIAS     : { 'minh viet': 'Viet' },
  OUT_PREFIX: 'KPI TRAINING ',
  RULES     : [
    { code: 'L1-00',  type: 'internal', cat: 'product',  trainer: '*',       text: 'Internal · Category = Product · mọi Trainer' },
    { code: 'L2-*',   type: 'internal', cat: '!product', trainer: '@member', text: 'Internal · Category khác Product · Trainer = người của dòng KPI' },
    { code: 'C10-06', type: 'external', cat: '*',        trainer: 'Giang',   text: 'External · mọi Category · Trainer = Giang' }
  ]
};

/* ════════════════ CÀI ĐẶT · MENU · TRIGGER ════════════════ */
function kscSetup() {
  var ss = SpreadsheetApp.getActive();
  try { kscFillLinks_(ss); } catch (eL) { Logger.log('links: ' + eL); }
  kscRemoveTriggers_();
  ScriptApp.newTrigger('kscTick').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('kscOnOpen').forSpreadsheet(ss).onOpen().create();
  var ids = kscSourceIds_(ss), made = [];
  Object.keys(ids).forEach(function (src) {
    try { ScriptApp.newTrigger('kscOnSourceEdit').forSpreadsheet(ids[src]).onEdit().create(); made.push(kscLabel_(src)); }
    catch (e) { made.push(kscLabel_(src) + ' (⚠ ' + (e && e.message || e) + ')'); }
  });
  var drive = 'có';
  try { DriveApp.getFileById(KSC.TRAINING_ID).getLastUpdated(); } catch (e) { drive = 'KHÔNG (sẽ đọc lại toàn bộ mỗi 5 phút)'; }
  var up = null; try { up = kscUpgrade_(ss); } catch (eU) { Logger.log('upgrade: ' + eU); }
  var res = up ? { lines: up } : kscRunAll_('setup');
  kscStatusSoon_(ss, true);
  var msg = 'Đã bật đồng bộ Realtime.\n\n· Trigger 1 phút: kscTick\n· Chạy ngay khi sửa: ' + made.join(', ') +
            '\n· Nhận biết file nguồn vừa đổi qua Google Drive: ' + drive + '\n\nLượt đồng bộ đầu tiên:\n' + res.lines.join('\n') +
            '\n\nTải lại file KPI để thấy menu "⚡ KPI Sync".';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('⚡ KPI Sync', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e2) {}
  return msg;
}
function kscStop() {
  var n = kscRemoveTriggers_();
  var msg = 'Đã tắt đồng bộ Realtime (gỡ ' + n + ' trigger). Menu ⚡ KPI Sync vẫn dùng được khi chạy lại kscSetup.';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}
function kscRemoveTriggers_() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (/^ksc(Tick|OnOpen|OnSourceEdit)$/.test(t.getHandlerFunction())) { ScriptApp.deleteTrigger(t); n++; }
  });
  return n;
}
function kscOnOpen() {
  SpreadsheetApp.getUi().createMenu('⚡ KPI Sync')
    .addItem('🔄 Cập nhật Manual (đọc tất cả backend)', 'kscOpenManual')
    .addItem('📋 Trạng thái nguồn dữ liệu (KPI SYNC STATUS)', 'kscShowStatus')
    .addItem('🩺 Kiểm tra Realtime (trigger từng nguồn)', 'kscCheckRealtime')
    .addItem('📄 Báo cáo giải thích KPI (PDF)', 'kscOpenReport')
    .addItem('✉ Soạn và gửi email KPI tháng', 'kscOpenMail')
    .addItem('🔗 Link file MKT offline VN (sự kiện)', 'kscSetMoffLink')
    .addItem('📅 Đổi Target lũy kế sang theo tháng', 'kscMonthlyTargets')
    .addItem('🎯 Kiểm tra rule Target = 0 ⇒ đạt 100% (sheet 5)', 'kscZeroCheck')
    .addItem('🗂 Mở sheet KPI EXPLAIN MAP (nguồn · URL · rule từng mã)', 'kscShowExplainMap')
    .addSeparator()
    .addItem('🧩 Điền công thức dòng tổng còn thiếu', 'kscRepairRollups')
    .addSeparator()
    .addItem('⚙ Bật lại đồng bộ Realtime', 'kscSetup')
    .addItem('⏸ Tắt đồng bộ Realtime', 'kscStop')
    .addToUi();
}
function kscRealtimeOn_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'kscTick'; });
}

/* ── v1.13: lần đầu chạy code bản mới ⇒ 1 lượt nâng cấp (Target theo tháng + đọc lại mọi nguồn, ghi đè cả tháng đã chốt) ── */
function kscUpgrade_(ss) {
  var P = PropertiesService.getScriptProperties();
  if (P.getProperty('KSC_VER') === KSC.VERSION) return null;
  P.setProperty('KSC_VER', KSC.VERSION);                          // đặt trước: lỗi giữa chừng cũng không lặp lại mỗi phút
  var lines = ['Nâng cấp KpiSyncCenter v' + KSC.VERSION];
  try {
    P.setProperty('KSC_UNLOCK', '1');
    try { lines.push('📅 ' + kscMonthlyTargets_(kscCtx_(ss), { noRerun: true }).replace(/\n+/g, ' · ')); } catch (e1) { lines.push('⚠ Target theo tháng: ' + (e1 && e1.message || e1)); }
    SpreadsheetApp.flush();
    try { var nf = kscFyFix_(kscCtx_(ss)); if (nf) lines.push('✓ FY68 Target / FY68 Actual: ghi lại ' + nf + ' ô đang #ERROR!'); } catch (eF) { lines.push('⚠ FY68 Target / Actual: ' + eF); }
    lines = lines.concat(kscRunAll_('upgrade').lines);
  } finally { P.deleteProperty('KSC_UNLOCK'); }
  kscLog_(ss, 'KpiSyncCenter', 'upgrade ' + KSC.VERSION, lines.join(' | '));
  try { var s = ss.getSheetByName(KSC.LOG); lines.slice(1).reverse().forEach(function (x) { kscLog_(ss, 'upgrade ' + KSC.VERSION, 'chi tiết', x); }); } catch (e2) {}
  return lines;
}
/* ── trigger 1 phút: nguồn vừa đổi (Drive báo) + nguồn có lần sửa chưa xử lý ── */
function kscTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  var t0 = Date.now();
  try {
    var ss = SpreadsheetApp.getActive(), P = PropertiesService.getScriptProperties();
    if (kscUpgrade_(ss)) { kscStatusSoon_(ss, true); return; }
    try { kscZeroTargetFix_({ ss: ss }); } catch (eZ) { Logger.log('zero: ' + eZ); }   // v1.14: mỗi phút giữ rule Target = 0 ⇒ 100%
    var now = Date.now(), lastFull = Number(P.getProperty('KSC_LAST_FULL') || 0), noDrive = false;
    var ids = kscSourceIds_(ss), due = [];
    var fullDue = now - lastFull >= KSC.FULL_EVERY * 60000;
    if (fullDue) { try { kscEnsureTriggers_(ss); } catch (eT) { Logger.log('triggers: ' + eT); } }
    Object.keys(ids).forEach(function (src) {
      if (fullDue) { due.push(src); return; }
      try {
        var mod = DriveApp.getFileById(ids[src]).getLastUpdated().getTime();
        if (String(mod) !== P.getProperty('KSC_MOD_' + src)) due.push(src);
      } catch (e) { noDrive = true; }
    });
    if (noDrive && now - lastFull >= 5 * 60000) { due = Object.keys(ids); fullDue = true; }
    var ctx = null, changed = false;
    if (due.length) {
      ctx = kscCtx_(ss);
      if (fullDue) { kscRollupsFix_(ctx, true); try { kscFyFix_(ctx); } catch (eF) {} }
      due.forEach(function (src) {
        if (Date.now() - t0 > 240000) return;                      // giữ dưới giới hạn 6 phút
        var start = Date.now(), r = kscRunSource_(ctx, src, 'auto');
        if (r.cells) changed = true;
        P.setProperty('KSC_DONE_' + src, String(start));
        try { P.setProperty('KSC_MOD_' + src, String(DriveApp.getFileById(ids[src]).getLastUpdated().getTime())); } catch (e) {}
      });
      if (fullDue) P.setProperty('KSC_LAST_FULL', String(now));
    }
    if (kscDrain_(ss, ctx, t0)) changed = true;                      // lần sửa tay chưa kịp xử lý
    if (changed || fullDue) kscStatusSoon_(ss, fullDue);
  } catch (err) { Logger.log('kscTick: ' + err); }
  finally { lock.releaseLock(); }
}

/* ── sửa tay trên file nguồn ⇒ chạy ngay nguồn đó, không bỏ sót lần sửa nào ── */
function kscOnSourceEdit(e) {
  try {
    if (!e || !e.source) return;
    var id = e.source.getId(), ss = SpreadsheetApp.getActive(), ids = kscSourceIds_(ss), src = '';
    Object.keys(ids).forEach(function (k) { if (ids[k] === id) src = k; });
    if (!src) return;
    var shName = ''; try { shName = e.range ? e.range.getSheet().getName() : ''; } catch (x) {}
    if (!kscEditMatters_(src, shName)) return;
    if (src === 'mkt') { try { kscMktStamp_(e); } catch (se) { Logger.log('stamp: ' + se); } }
    PropertiesService.getScriptProperties().setProperty('KSC_DIRTY_' + src, String(Date.now()));
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(KSC.EDIT_WAIT_S * 1000)) return;            // lượt đang chạy sẽ tự xử lý tiếp nguồn này (hoặc lượt 1 phút)
    try { if (kscDrain_(ss, null, Date.now())) kscStatusSoon_(ss, false); }
    finally { lock.releaseLock(); }
  } catch (err) { Logger.log('kscOnSourceEdit: ' + err); }
}
/* chạy các nguồn có lần sửa mới hơn lần xử lý gần nhất (lặp lại nếu trong lúc chạy lại có người sửa) */
function kscDrain_(ss, ctx, t0) {
  var P = PropertiesService.getScriptProperties(), ids = kscSourceIds_(ss), any = false;
  for (var loop = 0; loop < 6; loop++) {
    var due = Object.keys(ids).filter(function (s) { return Number(P.getProperty('KSC_DIRTY_' + s) || 0) > Number(P.getProperty('KSC_DONE_' + s) || 0); });
    if (!due.length || Date.now() - t0 > 240000) break;
    ctx = ctx || kscCtx_(ss);
    due.forEach(function (s) {
      if (Date.now() - t0 > 240000) return;
      var start = Date.now();
      var r = kscRunSource_(ctx, s, 'edit');
      if (r.cells) any = true;
      P.setProperty('KSC_DONE_' + s, String(start));
      try { P.setProperty('KSC_MOD_' + s, String(DriveApp.getFileById(ids[s]).getLastUpdated().getTime())); } catch (e) {}
    });
  }
  return any;
}
/* sheet nào của nguồn có dữ liệu KPI (sửa sheet khác thì không cần chạy) */
function kscEditMatters_(src, sheet) {
  var n = kscNorm_(sheet);
  if (!n) return true;
  if (/^_/.test(n)) return false;                                  // sheet kỹ thuật (log, _KPI_SRC…)
  if (src === 'training') return KSC_TRAIN.REPORT_RE.test(n);
  if (src === 'kbi') return n === kscNorm_(KSC_KBI.SHEET);
  if (src === 'moff') return KSC_MOFF.WATCH.map(kscNorm_).indexOf(n) >= 0;
  if (/^crm:/.test(src)) return /^(1|3|6|7|9)\./.test(n) || /kpi/.test(n);
  return true;
}
/* ghi sheet KPI SYNC STATUS: ngay nếu force, còn lại tối đa 1 lần / KSC.STATUS_EVERY phút */
function kscStatusSoon_(ss, force) {
  var P = PropertiesService.getScriptProperties(), last = Number(P.getProperty('KSC_STATUS_AT') || 0);
  if (!force && Date.now() - last < KSC.STATUS_EVERY * 60000) { P.setProperty('KSC_STATUS_DIRTY', '1'); return; }
  P.setProperty('KSC_STATUS_AT', String(Date.now())); P.deleteProperty('KSC_STATUS_DIRTY');
  try { kscWriteStatus_(ss); } catch (e) { Logger.log('status: ' + e); }
}
/* tạo lại trigger còn thiếu (nguồn mới, hoặc trigger bị xoá) */
function kscEnsureTriggers_(ss) {
  var T = ScriptApp.getProjectTriggers(), have = {}, made = [];
  T.forEach(function (t) { if (t.getHandlerFunction() === 'kscOnSourceEdit') { try { have[t.getTriggerSourceId()] = 1; } catch (e) {} } });
  var ids = kscSourceIds_(ss);
  Object.keys(ids).forEach(function (src) {
    if (have[ids[src]]) return;
    try { ScriptApp.newTrigger('kscOnSourceEdit').forSpreadsheet(ids[src]).onEdit().create(); made.push(kscLabel_(src)); } catch (e) { Logger.log('trigger ' + src + ': ' + e); }
  });
  if (made.length) kscLog_(ss, 'KpiSyncCenter', 'trigger', 'Tạo trigger khi sửa cho: ' + made.join(', '));
  if (kscStatusDirty_()) kscStatusSoon_(ss, true);
  return made;
}
function kscStatusDirty_() { return PropertiesService.getScriptProperties().getProperty('KSC_STATUS_DIRTY') === '1'; }
/* menu 🩺: tình trạng Realtime của từng nguồn */
function kscCheckRealtime() {
  var ss = SpreadsheetApp.getActive(), T = ScriptApp.getProjectTriggers(), have = {}, tick = false, open = false;
  T.forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'kscTick') tick = true;
    if (f === 'kscOnOpen') open = true;
    if (f === 'kscOnSourceEdit') { try { have[t.getTriggerSourceId()] = 1; } catch (e) {} }
  });
  var P = PropertiesService.getScriptProperties(), S = {}; try { S = JSON.parse(P.getProperty('KSC_SOURCES') || '{}'); } catch (e) {}
  var ids = kscSourceIds_(ss), lines = [];
  lines.push((tick ? '✓' : '✗') + ' Trigger 1 phút (kscTick): ' + (tick ? 'đang chạy' : 'CHƯA CÓ ⇒ chạy menu ⚙ Bật lại đồng bộ Realtime'));
  lines.push((open ? '✓' : '✗') + ' Menu tự hiện khi mở file (kscOnOpen)');
  lines.push('');
  Object.keys(ids).forEach(function (src) {
    var x = S[src] || {};
    lines.push((have[ids[src]] ? '✓ ' : '✗ ') + kscLabel_(src) + ': ' + (have[ids[src]] ? 'sửa tay ⇒ chạy ngay' : 'chưa có trigger khi sửa (lượt 1 phút sẽ tự tạo, hoặc chạy ⚙)') +
      ' · lần gần nhất ' + (x.t ? x.t + ' (' + x.why + ', ' + (x.status === 'ok' ? 'OK' : x.status === 'skip' ? 'bỏ qua' : 'LỖI') + ')' : 'chưa chạy'));
  });
  lines.push('');
  lines.push('Độ trễ: sửa tay trên Google Sheet nguồn ⇒ khoảng 5 đến 20 giây. Dữ liệu do web app ghi (Training Hub, CRM app, web app KBI) ⇒ tối đa khoảng 1 phút ' +
    '(Google không báo sự kiện khi script ghi, trigger thời gian ngắn nhất là 1 phút). Sự kiện Thái (REPORT_EVENT) do KPI Hub đọc 5 phút / lần.');
  var msg = lines.join('\n');
  try { SpreadsheetApp.getUi().alert('🩺 Kiểm tra Realtime', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

/* ════════════════ CẬP NHẬT MANUAL (thanh tiến độ) ════════════════ */
function kscOpenManual() {
  var html = HtmlService.createHtmlOutput(KSC_HTML).setWidth(760).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Cập nhật Manual · MMH KPI FY68');
}
/* danh sách bước, gọi từ hộp thoại */
function kscPlan() {
  var ss = SpreadsheetApp.getActive(), steps = [];
  steps.push({ id: 'layout', title: 'Đọc cấu trúc 3. Detail KPI', file: ss.getName(), sheet: KSC.DETAIL, codes: 'Mã KPI, tháng, cột Target / Actual' });
  steps.push({ id: 'rollup', title: 'Dòng tổng của 3. Detail KPI', file: ss.getName(), sheet: KSC.DETAIL, codes: 'Các mã dòng tổng (SUMIF / AVERAGEIF)' });
  steps.push({ id: 'zero', title: 'Sheet 5 · Target = 0 ⇒ 100%', file: ss.getName(), sheet: KSC_M5.SHEET, codes: 'Cột % tháng / quý / năm' });
  steps.push({ id: 'turnover', title: 'Doanh số NPP (Turnover)', file: 'MMH Turnover Report FY67-FY68', sheet: KSC.TURNOVER_SUM + ' (Type 1 Turnover · 3 Composite amount)', codes: KSC_TURNOVER.map(function (x) { return x.code; }).join(' · ') });
  steps.push({ id: 'training', title: 'Đào tạo (Training Master)', file: 'MMH - Training Master', sheet: 'Training Report FYxx', codes: 'L1-00 · L2-01→L2-06 · C10-06' });
  steps.push({ id: 'kbi', title: 'Điểm hành vi (KBI)', file: 'Key Behavioral Indicators Report', sheet: KSC_KBI.SHEET, codes: 'L3-01 → L3-22 (theo PIC)' });
  steps.push({ id: 'moff', title: 'MKT offline VN (sự kiện)', file: 'Vietnam - Marketing Offline Plan & Report FY68', sheet: KSC_MOFF.SHEET, codes: 'C8-00 · C9-00 · C12-01 · C12-02 · C15-01 · C15-02' });
  steps.push({ id: 'mkt', title: 'MKT online & Design', file: '3. Vietnam - Digital Marketing & Design FY68', sheet: 'ADS REPORT · EVENT REPORT · PRODUCT REPORT · ORDER REPORT', codes: 'C17-01 → C17-06' });
  kscLinks_(ss).forEach(function (l) {
    steps.push({ id: 'crm:' + l.team, title: kscLabel_('crm:' + l.team), file: l.link ? 'File CRM (_CRM_LINKS)' : '(chưa có link ở _CRM_LINKS)', sheet: l.tab, codes: 'Các mã trong tab KPI của CRM' });
  });
  steps.push({ id: 'event_th', title: 'Sự kiện Thái (Marketing Offline)', file: 'Marketing Offline Thailand', sheet: 'REPORT_EVENT', codes: KSC.EVENT_CODES.join(' · ') + ' (KPI Hub xử lý)' });
  steps.push({ id: 'status', title: 'Ghi trạng thái nguồn dữ liệu', file: ss.getName(), sheet: KSC.STATUS, codes: 'Toàn bộ mã KPI' });
  return steps;
}
/* chạy 1 bước, gọi từ hộp thoại */
function kscRunStep(id) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(60000); } catch (e) { return { status: 'error', msg: 'Đồng bộ tự động đang chạy, thử lại sau ít giây.' }; }
  try {
    var ss = SpreadsheetApp.getActive();
    if (id === 'layout') {
      var L = kscCtx_(ss).L;
      return { status: 'ok', msg: Object.keys(L.rows).length + ' mã KPI · tháng ' + L.months[0] + ' → ' + L.months[L.months.length - 1] + ' · năm ' + L.fy, codes: [] };
    }
    if (id === 'status') { kscWriteStatus_(ss); return { status: 'ok', msg: 'Đã ghi sheet "' + KSC.STATUS + '"', codes: [] }; }
    if (id === 'zero') { var z = kscZeroTargetFix_(kscCtx_(ss)); return { status: z.other && !z.fixed && !z.done ? 'error' : 'ok', msg: z.msg, codes: [] }; }
    if (id === 'rollup') { var f = kscRollupsFix_(kscCtx_(ss), false); return { status: 'ok', msg: f.length ? 'Đã điền công thức dòng tổng: ' + f.join(', ') : 'Dòng tổng đủ công thức', codes: [] }; }
    var r = kscRunSource_(kscCtx_(ss), id, 'manual');
    try { var ids = kscSourceIds_(ss); if (ids[id]) PropertiesService.getScriptProperties().setProperty('KSC_MOD_' + id, String(DriveApp.getFileById(ids[id]).getLastUpdated().getTime())); } catch (e2) {}
    return r;
  } catch (err) {
    return { status: 'error', msg: String(err && err.message || err), codes: [] };
  } finally { lock.releaseLock(); }
}
function kscShowStatus() {
  var ss = SpreadsheetApp.getActive();
  var sh = kscWriteStatus_(ss);
  ss.setActiveSheet(sh);
}
function kscShowExplainMap() {
  var ss = SpreadsheetApp.getActive();
  ss.setActiveSheet(kscWriteExplainMap_(ss, kscCtx_(ss)).sheet);
}

/* ════════════════ ĐIỀU PHỐI NGUỒN ════════════════ */
/* menu 🔓: chạy lại toàn bộ, cho phép ghi đè tháng đã chốt (chỉ trong lượt này) */
function kscUnlockOnce() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.alert('🔓 Cập nhật lại tháng đã chốt', 'Đọc lại tất cả backend và GHI ĐÈ cả các tháng đã chốt (sau 16:00 ngày 2 tháng sau) nếu số ở nguồn đã thay đổi.\nSố cũ bị thay được lưu ở sheet ẩn _SYNC_REPLACED (nếu là công thức) và nhật ký _CRM_SYNC_LOG.\n\nTiếp tục?', ui.ButtonSet.OK_CANCEL);
  if (a !== ui.Button.OK) return;
  var P = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock(); lock.waitLock(60000);
  var res;
  try { P.setProperty('KSC_UNLOCK', '1'); res = kscRunAll_('manual'); kscLog_(SpreadsheetApp.getActive(), 'KpiSyncCenter', 'unlock', 'Cập nhật lại tháng đã chốt (1 lần)'); }
  finally { P.deleteProperty('KSC_UNLOCK'); lock.releaseLock(); }
  try { kscStatusSoon_(SpreadsheetApp.getActive(), true); } catch (e) {}
  ui.alert('🔓 Cập nhật lại tháng đã chốt', res.lines.join('\n'), ui.ButtonSet.OK);
}
function kscRunAll_(why) {
  var ss = SpreadsheetApp.getActive(), ctx = kscCtx_(ss), lines = [];
  var fx = kscRollupsFix_(ctx, false);
  try { var zt = kscZeroTargetFix_(ctx); lines.push('· ' + zt.msg); } catch (eZ) { lines.push('⚠ Target = 0: ' + eZ); }
  if (fx.length) lines.push('✓ Dòng tổng: điền công thức ' + fx.join(', '));
  var srcs = ['turnover', 'training', 'kbi', 'mkt', 'moff'].concat(kscLinks_(ss).map(function (l) { return 'crm:' + l.team; })).concat(['event_th']);
  srcs.forEach(function (s) { var r = kscRunSource_(ctx, s, why); lines.push((r.status === 'ok' ? '✓ ' : r.status === 'skip' ? '· ' : '⚠ ') + r.title + ': ' + r.msg); });
  PropertiesService.getScriptProperties().setProperty('KSC_LAST_FULL', String(Date.now()));
  return { lines: lines };
}
function kscRunSource_(ctx, src, why) {
  var r;
  try {
    if (src === 'turnover') r = kscTurnover_(ctx, why);
    else if (src === 'training') r = kscTraining_(ctx, why);
    else if (/^crm:/.test(src)) r = kscCrm_(ctx, src.slice(4), why);
    else if (src === 'event_th') r = kscEventStatus_(ctx);
    else if (src === 'mkt') r = kscMkt_(ctx, why);
    else if (src === 'kbi') r = kscKbi_(ctx, why);
    else if (src === 'moff') r = kscMoff_(ctx, why);
    else r = { status: 'error', msg: 'Không rõ nguồn ' + src };
  } catch (err) { r = { status: 'error', msg: String(err && err.message || err) }; }
  r.title = r.title || kscLabel_(src);
  r.codes = r.codes || [];
  kscRemember_(src, r, why);
  return r;
}
function kscLabel_(src) {
  if (src === 'turnover') return 'Doanh số NPP (Turnover)';
  if (src === 'training') return 'Đào tạo (Training Master)';
  if (src === 'event_th') return 'Sự kiện Thái (REPORT_EVENT)';
  if (src === 'mkt') return 'MKT online & Design';
  if (src === 'kbi') return 'Điểm hành vi (KBI)';
  if (src === 'moff') return 'MKT offline VN (sự kiện)';
  var t = String(src).replace(/^crm:/, '');
  return KSC.TEAM_LABEL[t] || ('CRM ' + t);
}
/* file nguồn có thể đọc được: Training, Turnover, CRM đã có link */
function kscSourceIds_(ss) {
  var ids = { training: KSC.TRAINING_ID, turnover: KSC.TURNOVER_ID, mkt: KSC.MKT_ID, kbi: KSC_KBI.ID, moff: kscMoffId_() };
  kscLinks_(ss).forEach(function (l) { if (l.id) ids['crm:' + l.team] = l.id; });
  return ids;
}
function kscLinks_(ss) {
  var sh = ss.getSheetByName(KSC.LINKS), out = [], seen = {};
  if (sh && sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r, i) {
    var team = String(r[0] || '').trim(); if (!team) return;
    var link = String(r[1] || '').trim(), m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(link) || /^([a-zA-Z0-9_-]{25,})$/.exec(link);
    var id = m ? m[1] : (KSC.CRM_DEFAULT[team] || '');
    seen[team] = 1;
    out.push({ row: i + 2, team: team, link: link || (id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : ''), id: id, tab: String(r[2] || '').trim() || KSC.CRM_TAB[team] || '', lang: String(r[3] || '').trim(), fromDefault: !m && !!id });
  });
  Object.keys(KSC.CRM_DEFAULT).forEach(function (t) { if (!seen[t]) out.push({ row: 0, team: t, link: 'https://docs.google.com/spreadsheets/d/' + KSC.CRM_DEFAULT[t] + '/edit', id: KSC.CRM_DEFAULT[t], tab: KSC.CRM_TAB[t], lang: t === 'thai' ? 'en' : 'vi', fromDefault: true }); });
  return out;
}
/* ghi link CRM mặc định vào _CRM_LINKS (để KPI Hub cũng đọc được) */
function kscFillLinks_(ss) {
  var sh = ss.getSheetByName(KSC.LINKS), n = 0;
  if (!sh) { sh = ss.insertSheet(KSC.LINKS); sh.getRange(1, 1, 1, 7).setValues([['Nguồn (team)', 'File CRM (link Google Sheet)', 'Tab KPI', 'Ngôn ngữ', 'Đăng ký lúc', 'Đồng bộ lần cuối', 'Kết quả']]).setFontWeight('bold'); try { sh.hideSheet(); } catch (e) {} }
  kscLinks_(ss).forEach(function (l) {
    if (!l.fromDefault) return;
    var row = l.row || sh.getLastRow() + 1;
    sh.getRange(row, 1, 1, 5).setValues([[l.team, l.link, l.tab, l.lang || (l.team === 'thai' ? 'en' : 'vi'), Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm')]]);
    n++;
  });
  return n;
}

/* ════════════════ NGUỒN 1 · TURNOVER (tính thẳng từ SUM TURNOVER) ════════════════ */
function kscTurnover_(ctx, why) {
  var tss = SpreadsheetApp.openById(KSC.TURNOVER_ID), sh = tss.getSheetByName(KSC.TURNOVER_SUM);
  var out = { title: kscLabel_('turnover'), file: tss.getName(), sheet: KSC.TURNOVER_SUM };
  if (!sh) { out.status = 'error'; out.msg = 'File Turnover không có sheet ' + KSC.TURNOVER_SUM; return out; }
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 30);
  var V = sh.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
  for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (h.indexOf('type') >= 0 && h.indexOf('month') >= 0) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
  }
  if (hr < 0) { out.status = 'error'; out.msg = 'Không thấy dòng tiêu đề (Type, Month) ở ' + KSC.TURNOVER_SUM; return out; }
  function col(re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; }
  var cT = C['type'], cM = C['month'], cS = col(/^segment report/), cD = C['distributor'], cC = C['country'], cP = C['products'], cA = col(/^actual usd/);
  if ([cT, cM, cS, cD, cC, cP, cA].some(function (x) { return x == null; })) { out.status = 'error'; out.msg = 'Thiếu cột (Type, Month, Segment Report, Distributor, Country, Products, Actual USD) ở ' + KSC.TURNOVER_SUM; return out; }

  /* gom dữ liệu: dòng (type, month, seg, dist, country, prod, actual) + tổng theo type·tháng để biết tháng đã đóng */
  var rows = [], typeMonth = {}, types = {}, byTMD = {}, vnTM = {};
  for (var r = hr + 1; r < lr; r++) {
    var x = V[r], t = kscNorm_(x[cT]), m = Number(String(x[cM]).replace(/\.0+$/, '')) || 0;
    if (!t || !m) continue;
    var a = Number(x[cA]); if (isNaN(a)) a = 0;
    rows.push({ t: t, m: m, s: kscNorm_(x[cS]), d: kscNorm_(x[cD]), c: kscNorm_(x[cC]), p: kscNorm_(x[cP]), a: a });
    typeMonth[t + '|' + m] = (typeMonth[t + '|' + m] || 0) + a; types[t] = 1;
    var kd = t + '|' + m + '|' + kscNorm_(x[cD]); byTMD[kd] = (byTMD[kd] || 0) + a;
    if (kscNorm_(x[cC]) === 'viet nam') vnTM[t + '|' + m] = (vnTM[t + '|' + m] || 0) + a;
  }
  var now = new Date(), curYm = ctx.curYm, day = Number(Utilities.formatDate(now, KSC.TZ, 'd'));
  function closed(t, m) { return (m < curYm || (m === curYm && day >= 25)) && Math.abs(typeMonth[t + '|' + m] || 0) > 1e-9; }
  var months = ctx.L.months, data = {}, noType = [];
  /* v1.13: Jizai amount trùng y hệt Composite amount (cùng NPP, cùng tháng) ⇒ số nguồn nhập nhầm ⇒ không ghi */
  var jzT = types['2 jizai amount'] ? '2 jizai amount' : Object.keys(types).filter(function (t) { return /jizai.*(amount|usd)/.test(t); })[0], coT = '3 composite amount', dup = {}, dupTxt = [], dupCodes = {};
  if (jzT && types[coT]) Object.keys(byTMD).forEach(function (k) {
    var p = k.split('|'); if (p[0] !== jzT) return;
    var jz = byTMD[k], co = byTMD[coT + '|' + p[1] + '|' + p[2]];
    if (jz > 0.5 && co != null && Math.abs(jz - co) < 0.01) { dup[p[1] + '|' + p[2]] = 1; dupTxt.push(p[1] + ' ' + p[2].toUpperCase() + ' ' + kscFmtNum_(Math.round(jz))); }
  });
  KSC_TURNOVER.forEach(function (f) {
    if (ctx.L.rows[f.code] == null) return;
    var tName = f.type && types[f.type] ? f.type : f.typeRe ? Object.keys(types).filter(function (t) { return f.typeRe.test(t); })[0] : f.type;
    if (!tName || !types[tName]) { noType.push(f.code); return; }
    var monthly = {}, dset = {};
    rows.forEach(function (x) {
      if (x.t !== tName) return;
      if (f.seg && f.seg.indexOf(x.s) < 0) return;
      if (f.dist && f.dist.indexOf(x.d) < 0) return;
      if (f.country && f.country.indexOf(x.c) < 0) return;
      if (f.prod && f.prod.indexOf(x.p) < 0) return;
      monthly[x.m] = (monthly[x.m] || 0) + x.a;
      (dset[x.m] = dset[x.m] || {})[x.d] = 1;
    });
    var cum = 0, cAgg = ctx.L.H['agg'], isLast = cAgg == null || String(ctx.L.V[ctx.L.rows[f.code]][cAgg]).trim().toUpperCase() !== 'SUM';
    data[f.code] = {};
    var bad = false;
    months.forEach(function (m) {
      cum += monthly[m] || 0;
      if (tName === jzT && Object.keys(dset[m] || {}).some(function (d) { return dup[m + '|' + d]; })) bad = true;   // lũy kế từ tháng lỗi trở đi cũng sai
      if (!closed(tName, m)) return;
      if (bad) { data[f.code][m] = KSC_CLEAR; dupCodes[f.code] = 1; return; }
      data[f.code][m] = isLast ? cum : (monthly[m] || 0);                 // Agg LAST ⇒ lũy kế · SUM ⇒ số của tháng
    });
  });
  var st = kscWrite_(ctx, 'turnover', data, { why: why });
  out.codes = Object.keys(data); out.rules = {};
  try { out.url = kscUrl_(tss, sh); } catch (eu) {}
  KSC_TURNOVER.forEach(function (f) {
    var up = function (a) { return a.join(' + ').toUpperCase(); };
    var flt = [f.type ? 'Type = ' + f.type.replace(/^(\d+) (\w)/, function (m0, a1, b1) { return a1 + ' ' + b1.toUpperCase(); }) : 'Type = 2 Jizai amount'];
    if (f.seg) flt.push('Segment Report = ' + up(f.seg)); if (f.dist) flt.push('Distributor = ' + up(f.dist));
    if (f.country) flt.push('Country = ' + up(f.country)); if (f.prod) flt.push('Products = ' + up(f.prod));
    out.rules[f.code] = 'SUM TURNOVER, cột Actual USD · ' + flt.join(' · ') +
      ' · ' + (ctx.L.H['agg'] != null && ctx.L.rows[f.code] != null && String(ctx.L.V[ctx.L.rows[f.code]][ctx.L.H['agg']]).trim().toUpperCase() === 'SUM' ? 'số của từng tháng' : 'lũy kế từ tháng đầu năm tài chính') +
      ' · chỉ tháng đã đóng (tháng trước tháng hiện tại, hoặc tháng hiện tại từ ngày 25, và Type đó đã có Actual).';
  });
  var fixed = 0, fixMsg = '';
  try { fixed = kscFixKpiAct_(tss); } catch (e) { fixMsg = ' · ⚠ chưa sửa được công thức _KPI_ACT: ' + (e && e.message || e); }
  var pushMsg = '';
  if ((why === 'manual' || why === 'setup') && typeof ktPushToTurnover_ === 'function') {
    try { var p = ktPushToTurnover_(why === 'manual'); pushMsg = ' · target & trọng số → Turnover: ' + p.lines + ' dòng'; }
    catch (e2) { pushMsg = ' · ⚠ chưa đẩy target sang Turnover: ' + (e2 && e2.message || e2); }
  }
  var closedList = months.filter(function (m) { return closed('1 turnover', m); });
  var usd = function (v) { return kscFmtNum_(Math.round(v || 0)); };
  var totTxt = closedList.slice(-2).map(function (m) {
    return m + ': Turnover ' + usd(typeMonth['1 turnover|' + m]) + ' · Composite VN ' + usd(vnTM[coT + '|' + m]) + (jzT ? ' · Jizai VN ' + usd(vnTM[jzT + '|' + m]) : '') + ' USD';
  }).join(' | ');
  if (dupTxt.length) out.status = 'error';
  return kscResult_(out, st, (dupTxt.length ? '⚠ SUM TURNOVER: Jizai amount TRÙNG Composite amount (' + dupTxt.join('; ') +
      ') ⇒ chưa ghi ' + Object.keys(dupCodes).join(', ') + ', cần sửa dòng 2 Jizai amount ở sheet Actual input / file kế toán · ' : '') +
    rows.length + ' dòng SUM TURNOVER · tháng đã đóng: ' + (closedList.join(', ') || '(chưa có)') + (totTxt ? ' · ' + totTxt : '') +
    (noType.length ? ' · SUM TURNOVER chưa có Type cho: ' + noType.join(', ') + ' (JIZAI cần Type "2 Jizai amount")' : '') +
    (fixed ? ' · đã bọc ARRAYFORMULA ' + fixed + ' ô công thức trong ' + KSC.TURNOVER_ACT : '') + fixMsg + pushMsg);
}
/* công thức _KPI_ACT có hằng mảng {…} mà không có ARRAYFORMULA ⇒ Google Sheets chỉ tính phần tử đầu ⇒ bọc lại */
function kscFixKpiAct_(tss) {
  var s = tss.getSheetByName(KSC.TURNOVER_ACT); if (!s || s.getLastRow() < 4) return 0;
  var F = s.getRange(4, 1, s.getLastRow() - 3, s.getLastColumn()).getFormulas(), n = 0;
  F.forEach(function (row, i) {
    row.forEach(function (f, j) {
      if (f && f.indexOf('{') >= 0 && !/^=\s*ARRAYFORMULA\s*\(/i.test(f)) { s.getRange(4 + i, 1 + j).setFormula('=ARRAYFORMULA(' + f.replace(/^=\s*/, '') + ')'); n++; }
    });
  });
  return n;
}

/* ════════════════ NGUỒN 2 · TRAINING MASTER ════════════════ */
function kscTraining_(ctx, why) {
  var tss = SpreadsheetApp.openById(KSC.TRAINING_ID), L = ctx.L;
  var targets = kscTrainTargets_(L), people = kscTrainPeople_(tss), S = kscTrainSessions_(tss, people);
  var res = kscTrainCount_(S.list, targets, L.months), data = {};
  targets.forEach(function (t) { data[t.code] = {}; L.months.forEach(function (m) { if (m <= ctx.curYm) data[t.code][m] = res.counts[t.code][m] || 0; }); });
  var st = kscWrite_(ctx, 'training', data, { why: why });
  var out = { title: kscLabel_('training'), file: tss.getName(), sheet: S.sheets.join(', ') || '(không thấy sheet Training Report FYxx)',
              codes: targets.map(function (t) { return t.code; }), rules: {} };
  try { if (S.sheets.length) out.url = kscUrl_(tss, tss.getSheetByName(S.sheets[S.sheets.length - 1])); } catch (eu) {}
  targets.forEach(function (t) {
    out.rules[t.code] = 'Đếm buổi ở sheet Training Report FYxx: Training Type ' + (t.rule.type === 'internal' ? 'Internal' : 'External') +
      ' · ' + (t.rule.cat === 'product' ? 'Category = Product' : t.rule.cat === '!product' ? 'Category khác Product' : 'mọi Category') +
      ' · ' + (t.trainerKey === '*' ? 'mọi Trainer' : 'Trainer = ' + (t.rule.trainer === '@member' ? t.member : t.rule.trainer)) +
      ' · Status = Completed · tháng theo Actual Date (trống thì cột Month) · bỏ phiên TEST, mỗi Session ID đếm 1 lần.';
  });
  var back = '';
  try { var b = kscTrainWriteBack_(tss, ctx, targets, res, S, why === 'manual'); back = ' · tab "' + b.tab + '" ' + (b.changed ? 'đã cập nhật' : 'không đổi'); }
  catch (e) { back = ' · ⚠ chưa ghi được tab KPI TRAINING: ' + (e && e.message || e); }
  var done = S.list.filter(function (s) { return s.done && L.months.indexOf(s.ym) >= 0; }).length;
  return kscResult_(out, st, S.list.length + ' buổi đọc · ' + done + ' buổi Completed trong ' + L.fy + back);
}
function kscTrainTargets_(L) {
  var out = [], mCol = L.H['members involved'], nCol = L.H['detail kpi'];
  function cell(r, c) { return c == null ? '' : String(L.V[r][c] || '').trim(); }
  KSC_TRAIN.RULES.forEach(function (rule) {
    var codes = [];
    if (/\*$/.test(rule.code)) {
      var pre = rule.code.replace(/\*$/, '');
      Object.keys(L.rows).forEach(function (c) { if (c.indexOf(pre) === 0 && !/-00$/.test(c)) codes.push(c); });
      codes.sort();
    } else if (L.rows[rule.code] != null) codes.push(rule.code);
    codes.forEach(function (code) {
      var r = L.rows[code], member = cell(r, mCol), who = rule.trainer === '@member' ? member : rule.trainer;
      if (rule.trainer === '@member' && (!who || /,|^-/.test(who))) return;
      out.push({ code: code, row: r, name: cell(r, nCol).replace(/\s+/g, ' '), member: member, rule: rule, trainerKey: who === '*' ? '*' : kscNorm_(who) });
    });
  });
  return out;
}
function kscTrainPeople_(tss) {
  var map = {};
  function add(mail, name) { String(mail || '').split(/[;,\s]+/).forEach(function (m) { m = m.trim().toLowerCase(); if (m && m.indexOf('@') > 0 && name) map[m] = String(name).trim(); }); }
  var ms = tss.getSheetByName('Master');
  if (ms && ms.getLastRow() > 1) {
    var V = ms.getRange(1, 1, Math.min(ms.getLastRow(), 300), Math.min(ms.getLastColumn(), 40)).getValues(), pairs = [];
    for (var i = 0; i < Math.min(V.length, 5); i++) for (var j = 1; j < V[i].length; j++)
      if (kscNorm_(V[i][j]) === 'trainer email' && kscNorm_(V[i][j - 1]) === 'trainer') pairs.push([i, j - 1, j]);
    pairs.forEach(function (p) { for (var r = p[0] + 1; r < V.length; r++) add(V[r][p[2]], V[r][p[1]]); });
  }
  var us = tss.getSheetByName('HUB_Users');
  if (us && us.getLastRow() > 1) {
    var U = us.getRange(1, 1, us.getLastRow(), Math.min(us.getLastColumn(), 12)).getValues();
    var e = U[0].map(kscNorm_).indexOf('email'), n = U[0].map(kscNorm_).indexOf('name');
    if (e >= 0 && n >= 0) for (var k = 1; k < U.length; k++) add(U[k][e], U[k][n]);
  }
  return map;
}
function kscTrainSessions_(tss, people) {
  var list = [], seen = {}, sheets = [];
  tss.getSheets().forEach(function (s) {
    if (!KSC_TRAIN.REPORT_RE.test(kscNorm_(s.getName()))) return;
    var lr = s.getLastRow(), lc = Math.min(s.getLastColumn(), 40); if (lr < 2) return;
    var V = s.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
    for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
      var h = V[i].map(kscNorm_);
      if (h.indexOf('training type') >= 0 && h.indexOf('trainer') >= 0) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
    }
    if (hr < 0) return;
    sheets.push(s.getName());
    function g(row, key) { return C[key] == null ? '' : row[C[key]]; }
    for (var r = hr + 1; r < lr; r++) {
      var row = V[r], type = kscNorm_(g(row, 'training type')), trainerRaw = String(g(row, 'trainer') || '').trim();
      if (!type || (type.indexOf('internal') !== 0 && type.indexOf('external') !== 0)) continue;
      var sid = String(g(row, 'session id') || '').trim(), topic = String(g(row, 'training topic') || '').trim();
      if (/^test/i.test(sid) || /^\[test\]/i.test(topic)) continue;
      if (sid) { if (seen[sid]) continue; seen[sid] = 1; }
      var name = trainerRaw.indexOf('@') > 0 ? (people[trainerRaw.toLowerCase()] || trainerRaw) : trainerRaw;
      var key = kscNorm_(name); if (KSC_TRAIN.ALIAS[key]) key = kscNorm_(KSC_TRAIN.ALIAS[key]);
      var date = g(row, 'actual date'), status = String(g(row, 'status') || '').trim();
      list.push({ sheet: s.getName(), row: r + 1, sid: sid, topic: topic, audience: String(g(row, 'target audience') || '').trim(),
        date: kscIsDate_(date) ? Utilities.formatDate(date, KSC.TZ, 'dd/MM/yyyy') : String(date || ''),
        ym: kscYm_(date, g(row, 'month')), type: type.indexOf('internal') === 0 ? 'Internal' : 'External',
        cat: String(g(row, 'training category') || '').trim(), catKey: kscNorm_(g(row, 'training category')),
        trainer: name, trainerKey: key, status: status, done: KSC_TRAIN.DONE.indexOf(kscNorm_(status)) >= 0 });
    }
  });
  return { list: list, sheets: sheets };
}
function kscTrainMatch_(s, t) {
  var r = t.rule;
  if (!s.done || !s.ym) return false;
  if (kscNorm_(s.type) !== r.type) return false;
  if (r.cat === 'product' && s.catKey !== 'product') return false;
  if (r.cat === '!product' && s.catKey === 'product') return false;
  if (t.trainerKey !== '*' && s.trainerKey !== t.trainerKey) return false;
  return true;
}
function kscTrainCount_(list, targets, months) {
  var counts = {}, hits = {};
  targets.forEach(function (t) { counts[t.code] = {}; months.forEach(function (m) { counts[t.code][m] = 0; }); });
  list.forEach(function (s, i) {
    targets.forEach(function (t) {
      if (!kscTrainMatch_(s, t) || counts[t.code][s.ym] == null) return;
      counts[t.code][s.ym]++; (hits[i] = hits[i] || []).push(t.code);
    });
  });
  return { counts: counts, hits: hits };
}
function kscTrainWriteBack_(tss, ctx, targets, res, S, force) {
  var L = kscLayout_(ctx.sh), name = KSC_TRAIN.OUT_PREFIX + L.fy, NC = 7 + L.months.length * 2, grid = [];
  function pad(a) { while (a.length < NC) a.push(''); return a; }
  function num(x) { return (x === '' || x === null || x === undefined || isNaN(Number(x))) ? '' : Number(x); }
  grid.push(pad(['MMH TRAINING ⇄ KPI ' + L.fy + ' · số liệu tự động từ file KPI (KpiSyncCenter) · không gõ tay vào tab này']));
  grid.push(pad(['Cập nhật: ' + Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm') + ' · nguồn: ' + S.sheets.join(', ')]));
  grid.push(pad(['']));
  var hdr = ['KPI Code', 'Detail KPI', 'PIC', 'Rule đếm', L.fy + ' Target', L.fy + ' Actual', L.fy + ' %'];
  L.months.forEach(function (m) { hdr.push(m + ' Target'); });
  L.months.forEach(function (m) { hdr.push(m + ' Actual'); });
  grid.push(hdr);
  targets.forEach(function (t) {
    var r = t.row, row = [t.code, t.name, t.member, t.rule.text,
      L.fyT >= 0 ? num(L.V[r][L.fyT]) : '', L.fyA >= 0 ? num(L.V[r][L.fyA]) : '', L.fyP >= 0 ? num(L.V[r][L.fyP]) : ''];
    L.months.forEach(function (m) { row.push(L.tCol[m] != null ? num(L.V[r][L.tCol[m]]) : ''); });
    L.months.forEach(function (m) { var c = L.aCol[m]; row.push(c != null && kscKind_(L.F[r][c]) !== 'placeholder' ? num(L.V[r][c]) : ''); });
    grid.push(row);
  });
  grid.push(pad(['']));
  grid.push(pad(['DANH SÁCH BUỔI ĐÀO TẠO TRONG ' + L.fy]));
  grid.push(pad(['Session ID', 'Training Topic', 'Trainer', 'Training Type', 'Training Category', 'Actual Date', 'Month', 'Status', 'Tính vào mã KPI', 'Ghi chú', 'Sheet · dòng']));
  var fy = [];
  S.list.forEach(function (s, i) { if (s.ym && L.months.indexOf(s.ym) >= 0) fy.push([s, i]); });
  fy.sort(function (a, b) { return a[0].ym - b[0].ym; });
  fy.forEach(function (p) {
    var s = p[0], hit = res.hits[p[1]] || [], note = '';
    if (!s.done) note = 'Chưa tính: Status = ' + (s.status || '(trống)') + ', chỉ đếm Completed';
    else if (!hit.length) note = 'Chưa tính: không khớp rule (Trainer ' + s.trainer + ' / ' + s.type + ' / ' + (s.cat || 'không Category') + ')';
    else if (s.ym > ctx.curYm) note = 'Tháng chưa tới';
    grid.push(pad([s.sid, s.topic, s.trainer, s.type, s.cat, s.date, s.ym, s.status, hit.join(', '), note, s.sheet + ' · ' + s.row]));
  });
  if (!fy.length) grid.push(pad(['(chưa có buổi đào tạo nào trong ' + L.fy + ')']));
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(grid.slice(2))));
  var P = PropertiesService.getScriptProperties(), out = tss.getSheetByName(name), isNew = !out;
  if (!out) out = tss.insertSheet(name);
  if (!force && !isNew && P.getProperty('KSC_TRAIN_HASH') === hash) return { tab: name, changed: false };
  out.clearContents();
  if (out.getMaxColumns() < NC) out.insertColumnsAfter(out.getMaxColumns(), NC - out.getMaxColumns());
  if (out.getMaxRows() < grid.length + 5) out.insertRowsAfter(out.getMaxRows(), grid.length + 5 - out.getMaxRows());
  out.getRange(1, 1, grid.length, NC).setValues(grid);
  try {
    var h2 = 4 + targets.length + 3;
    out.getRange(1, 1).setFontWeight('bold').setFontSize(13).setFontColor('#003047');
    out.getRange(4, 1, 1, NC).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    out.getRange(h2 - 1, 1).setFontWeight('bold').setFontColor('#003047');
    out.getRange(h2, 1, 1, 11).setFontWeight('bold').setBackground('#CFE2F3');
    if (targets.length) out.getRange(5, 7, targets.length, 1).setNumberFormat('0%');
    out.setFrozenRows(4);
  } catch (e) {}
  P.setProperty('KSC_TRAIN_HASH', hash);
  return { tab: name, changed: true };
}

/* ════════════════ NGUỒN 3 · CÁC FILE CRM (đăng ký ở _CRM_LINKS) ════════════════ */
function kscCrm_(ctx, team, why) {
  var link = null;
  kscLinks_(ctx.ss).forEach(function (l) { if (l.team === team) link = l; });
  var out = { title: kscLabel_('crm:' + team), file: '', sheet: link ? link.tab : '' };
  if (!link || !link.id) { out.status = 'skip'; out.msg = 'Chưa có link file CRM ở ' + KSC.LINKS + ' và KSC.CRM_DEFAULT'; return out; }
  var css = SpreadsheetApp.openById(link.id); out.file = css.getName();
  var sh = kscCrmTab_(css, link);
  if (!sh) { out.status = 'error'; out.msg = 'Không thấy tab KPI "' + link.tab + '" trong file CRM'; return out; }
  out.sheet = sh.getName();
  /* v1.16 — CRM phải trỏ đúng file KPI này (ô D9 tab KPI của CRM) */
  try {
    var d9 = sh.getRange('D9'), d9v = String(d9.getValue() || ''), d9m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(d9v);
    if (!d9.getFormula() && (!d9m || d9m[1] !== ctx.ss.getId())) { d9.setValue(ctx.ss.getUrl()); out.relinked = d9v || '(trống)'; }
  } catch (eD) {}
  if (link.row && sh.getName() !== link.tab) { try { ctx.ss.getSheetByName(KSC.LINKS).getRange(link.row, 3).setValue(sh.getName()); } catch (eT) {} }
  var v = sh.getRange(1, 1, sh.getLastRow(), 41).getValues();
  if (!/^k68/i.test(String(v[0][0]))) { out.status = 'error'; out.msg = 'Tab KPI chưa theo mẫu FY68: mở file CRM, chạy menu "Tạo lại tab KPI"'; return out; }
  var T0 = 8, A0 = 21, months = null, i, j, L = ctx.L;
  for (i = 0; i < v.length; i++) if (String(v[i][0]).trim() === 'months') { months = []; for (j = 0; j < 12; j++) months.push(Math.round(Number(v[i][T0 + j]) || 0)); }
  if (!months || months.some(function (m) { return !/^20\d{4}$/.test(String(m)); })) { out.status = 'error'; out.msg = 'Dòng tháng của tab KPI chưa tính xong (mở file CRM kiểm tra)'; return out; }
  var push = {}, nT = 0, nPull = 0, miss = [], codes = [];
  for (i = 0; i < v.length; i++) {
    var tag = String(v[i][0] || '').trim(); if (!/^kpi:/.test(tag)) continue;
    var key = tag.slice(4), code = String(v[i][1] || '').trim(), r = L.rows[code];
    if (r == null) { miss.push(code); continue; }
    if (!KSC.CRM_MANUAL[key]) codes.push(code);                    // mã nhận số từ file KPI (doanh số NPP…) không tính là nguồn CRM
    /* target: file KPI → CRM */
    var tRow = [], tChg = false;
    for (j = 0; j < 12; j++) { var tc = L.tCol[months[j]], tv = tc == null ? '' : kscNum_(L.V[r][tc]); tv = tv == null ? '' : tv; tRow.push(tv); if (!kscEq_(tv, v[i][T0 + j])) tChg = true; }
    if (tChg) { sh.getRange(i + 1, T0 + 1, 1, 12).setValues([tRow]); nT++; }
    if (KSC.CRM_MANUAL[key]) {
      /* số do nguồn khác ghi (doanh số NPP, sự kiện…): file KPI có số ⇒ kéo về CRM; KPI trống mà CRM có ⇒ đẩy lên */
      var aRow = [], aChg = false;
      for (j = 0; j < 12; j++) {
        var c = L.aCol[months[j]], k = c == null ? 'none' : kscKind_(L.F[r][c]);
        var kv = c == null || k === 'placeholder' ? null : kscNum_(L.V[r][c]), cv = v[i][A0 + j];
        if (kv != null) { aRow.push(kv); if (!kscEq_(kv, cv)) aChg = true; }
        else { aRow.push(cv); if (kscNum_(cv) != null && months[j] <= ctx.curYm) { (push[code] = push[code] || {})[months[j]] = kscNum_(cv); } }
      }
      if (aChg) { sh.getRange(i + 1, A0 + 1, 1, 12).setValues([aRow]); nPull++; }
    } else {
      /* actual CRM tự tính → file KPI */
      for (j = 0; j < 12; j++) {
        if (months[j] > ctx.curYm) continue;
        var val = kscNum_(v[i][A0 + j]); if (val == null) continue;
        (push[code] = push[code] || {})[months[j]] = val;
      }
    }
  }
  /* v1.16 — mã đổi rule ở CRM v10.0: ghi đè 1 lần các tháng đã chốt */
  var fixKey = 'KSC_FIX_RULE10_' + team, PP = PropertiesService.getScriptProperties(), fixOn = !PP.getProperty(fixKey);
  var st = kscWrite_(ctx, 'crm:' + team, push, { why: why, forceRe: fixOn ? /^(C1|C5|C6|C7)-/ : null });
  if (fixOn) { try { PP.setProperty(fixKey, Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm') + ' · ' + st.cells + ' ô'); } catch (eF) {} }
  var res = kscResult_(out, st, (out.relinked ? 'đã trỏ CRM về file KPI này (D9 cũ: ' + String(out.relinked).slice(0, 60) + ') · ' : '') +
    (fixOn ? 'sửa 1 lần tháng đã chốt của C1 · C5 · C6 · C7 · ' : '') + codes.length + ' mã trong tab KPI · ' + nT + ' dòng target → CRM · ' + nPull + ' dòng kéo về CRM' + (miss.length ? ' · file KPI không có mã: ' + miss.join(', ') : ''));
  res.codes = codes; res.rules = {};
  try { res.url = kscUrl_(css, sh); } catch (eu) {}
  for (var q = 0; q < v.length; q++) { var tg = String(v[q][0] || '').trim(); if (/^kpi:/.test(tg)) { var cd = String(v[q][1] || '').trim(), rs = String(v[q][40] || '').trim();
    res.rules[cd] = 'Tab "' + sh.getName() + '" của ' + css.getName() + (rs ? ' · ' + rs : '') + (KSC.CRM_MANUAL[tg.slice(4)] ? ' · số lấy từ file KPI (CRM chỉ hiển thị, hoặc nhập tay khi file KPI còn trống)' : ''); } }
  try {
    var ls = ctx.ss.getSheetByName(KSC.LINKS);
    if (link.row) ls.getRange(link.row, 6, 1, 2).setValues([[Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm'), (res.status === 'ok' ? '✓ ' : '⚠ ') + 'KpiSyncCenter · ' + res.msg]]);
  } catch (e) {}
  return res;
}

/* ════════════════ NGUỒN 5 · MKT ONLINE & DESIGN ════════════════ */
function kscMkt_(ctx, why) {
  var mss = SpreadsheetApp.openById(KSC.MKT_ID), K = KSC_MKT.CODES;
  var out = { title: kscLabel_('mkt'), file: mss.getName(), sheet: [KSC_MKT.ADS].concat(KSC_MKT.POSTS.map(function (p) { return p.sheet; })).concat([KSC_MKT.ORDER]).join(' · '),
              codes: [K.mirEvent, K.mirProduct, K.postOnTime, K.content, K.designOnTime, K.score] };
  var months = ctx.L.months.filter(function (m) { return m <= ctx.curYm; }), data = {};
  var X = kscMktCollect_(mss, months);
  out.codes.forEach(function (c) { data[c] = {}; });
  out.rules = KSC_MKT.RULES; out.codeUrls = {};
  try {
    var uA = kscUrl_(mss, mss.getSheetByName(KSC_MKT.ADS)), uE = kscUrl_(mss, mss.getSheetByName(KSC_MKT.POSTS[0].sheet)), uO = kscUrl_(mss, mss.getSheetByName(KSC_MKT.ORDER));
    out.url = uE; out.codeUrls[K.mirEvent] = uA; out.codeUrls[K.mirProduct] = uA; out.codeUrls[K.postOnTime] = uE; out.codeUrls[K.content] = uE;
    out.codeUrls[K.designOnTime] = uO; out.codeUrls[K.score] = uO;
  } catch (eu) {}
  months.forEach(function (m) {
    ['event', 'product'].forEach(function (t) { var a = X.ads[t + '|' + m]; if (a && a.reach > 0) data[t === 'event' ? K.mirEvent : K.mirProduct][m] = a.inbox / a.reach; });
    data[K.content][m] = X.links[m];
    if (X.plan[m] > 0) data[K.postOnTime][m] = X.onTime[m] / X.plan[m];
    if (X.hasOrder) { data[K.score][m] = X.pts[m]; if (X.req[m] > 0) data[K.designOnTime][m] = X.ok[m] / X.req[m]; }
  });
  Object.keys(data).forEach(function (c) { if (ctx.L.rows[c] == null) delete data[c]; });
  var st = kscWrite_(ctx, 'mkt', data, { why: why });
  if (X.miss.length) out.status = 'error';
  var show = function (c, m, pct) { var v = data[c] && data[c][m]; return v == null ? '(trống)' : pct ? (Math.round(v * 10000) / 100) + '%' : Math.round(v * 100) / 100; };
  var txt = months.slice(-2).map(function (m) {
    return m + ': MIR Event ' + show(K.mirEvent, m, 1) + ', MIR Product ' + show(K.mirProduct, m, 1) + ', đăng đúng hạn ' + show(K.postOnTime, m, 1) +
      ', content ' + show(K.content, m) + ', thiết kế đúng hạn ' + show(K.designOnTime, m, 1) + ', điểm thiết kế ' + show(K.score, m);
  }).join(' | ');
  return kscResult_(out, st, (X.miss.length ? '⚠ không đọc được: ' + X.miss.join(', ') + ' · ' : '') + txt);
}
/* gom dữ liệu MKT theo tháng (dùng cho đồng bộ và cho báo cáo PDF) */
function kscMktCollect_(mss, months) {
  var X = { miss: [], ads: {}, plan: {}, onTime: {}, links: {}, linkList: [], postList: [], req: {}, ok: {}, pts: {}, designList: [], hasOrder: false };
  function inM(m) { return months.indexOf(m) >= 0; }
  months.forEach(function (m) { X.plan[m] = 0; X.onTime[m] = 0; X.links[m] = 0; X.req[m] = 0; X.ok[m] = 0; X.pts[m] = 0; });
  var stampRe = new RegExp('^' + kscNorm_(KSC_MKT.STAMP_HDR).replace(/[()]/g, '\\$&'));

  var ads = kscMktTable_(mss, KSC_MKT.ADS, ['month', 'tiep can']);
  if (!ads) X.miss.push(KSC_MKT.ADS);
  else {
    var cMo = ads.col(/^month$/), cTy = ads.col(/^type$/), cRe = ads.col(/^tiep can/), cIn = ads.col(/^ket qua/);
    ads.rows.forEach(function (r) {
      var m = kscYm_(null, r[cMo]), t = kscNorm_(r[cTy]); if (!inM(m) || (t !== 'event' && t !== 'product')) return;
      var k = t + '|' + m; X.ads[k] = X.ads[k] || { reach: 0, inbox: 0 };
      X.ads[k].reach += Number(r[cRe]) || 0; X.ads[k].inbox += Number(r[cIn]) || 0;
    });
  }
  KSC_MKT.POSTS.forEach(function (p) {
    var T = kscMktTable_(mss, p.sheet, ['month', 'link report']);
    if (!T) { X.miss.push(p.sheet); return; }
    var cMo = T.col(/^month$/), cTi = T.col(new RegExp('^' + p.title)), cDl = T.col(/^on-air du kien/), cAc = T.col(/^on-air thuc te/),
        cSt = T.col(/^status/), cLk = T.col(/^link report/), cSp = T.col(stampRe), cCt = T.col(/^type of content/), cLks = T.cols(/^link report/);
    T.rows.forEach(function (r) {
      var m = kscYm_(null, r[cMo]); if (!inM(m)) return;
      var st = kscNorm_(r[cSt]), link = String(r[cLk] || '').trim();
      var title = String(cTi != null ? r[cTi] || '' : '').trim(), ct = cCt != null ? String(r[cCt] || '').trim() : '';
      var nLk = 0; cLks.forEach(function (k) { nLk += kscLinkN_(r[k]); });          // v1.13: đếm số link (1 ô 2 link = 2)
      if (nLk) { X.links[m] += nLk; X.linkList.push({ m: m, sheet: p.sheet, title: title, ctype: ct, link: link, n: nLk }); }
      if (cTi != null && !title) return;
      if (/cancel/.test(st)) return;
      X.plan[m]++;
      var ok = false;
      if (link) {
        var fill = cSp != null && r[cSp] !== '' ? kscStampFix_(r[cSp], m) : (cAc != null ? r[cAc] : '');
        ok = kscMktOnTime_(fill, cDl != null ? r[cDl] : '', /dung han/.test(st));
        if (ok) X.onTime[m]++;
      }
      X.postList.push({ m: m, sheet: p.sheet, title: title, ctype: ct, link: !!link, onTime: ok });
    });
  });
  var O = kscMktTable_(mss, KSC_MKT.ORDER, ['thang hoan thanh', 'task result']);
  if (!O) X.miss.push(KSC_MKT.ORDER);
  else {
    X.hasOrder = true;
    var oMo = O.col(/^thang hoan thanh/), oDl = O.col(/^deadline/), oKt = O.col(/^key task/), oDa = O.col(/^dang an pham/), oPt = O.col(/^diem tong/),
        oQt = O.col(/^so luong/), oRs = O.col(/^task result/), oSt = O.col(/^status/), oCk = O.col(/^check deadline/), oSp = O.col(stampRe);
    O.rows.forEach(function (r) {
      var m = kscYm_(null, r[oMo]); if (!inM(m)) return;
      var task = String(r[oKt] || '').trim(), type = String(r[oDa] || '').trim();
      if (!task && !type) return;
      var pts = Number(r[oPt]) || 0, cancel = /cancel/.test(kscNorm_(r[oSt])), ok = false;
      if (!cancel) {                                       /* v1.12: rule team Marketing */
        X.pts[m] += pts;                                   // điểm thiết kế = Σ Điểm tổng của tháng
        X.req[m]++;                                        // đúng tiến độ = Check deadline report = On time
        ok = oCk != null && kscNorm_(r[oCk]) === 'on time';
        if (ok) X.ok[m]++;
      }
      X.designList.push({ m: m, task: task, type: type, qty: oQt != null ? Number(r[oQt]) || 0 : 0, pts: pts, done: !cancel, counted: !cancel, onTime: ok,
                          check: oCk != null ? String(r[oCk] || '').trim() : '' });
    });
  }
  return X;
}

/* đọc 1 bảng theo dòng tiêu đề (tìm trong 10 dòng đầu) */
function kscMktTable_(ss, name, must) {
  var s = ss.getSheetByName(name); if (!s) return null;
  var lr = s.getLastRow(), lc = Math.min(s.getLastColumn(), 40); if (lr < 2) return null;
  var V = s.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
  for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (must.every(function (k) { return h.some(function (x) { return x.indexOf(k) === 0; }); })) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
  }
  if (hr < 0) return null;
  var HN = V[hr].map(kscNorm_);
  return { sheet: s, hr: hr, C: C, rows: V.slice(hr + 1),
           cols: function (re) { var a = []; HN.forEach(function (x, k) { if (re.test(x)) a.push(k); }); return a; },
           col: function (re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; } };
}
/* số link trong 1 ô: đếm số lần có http:// / https://; ô không có http mà có tên miền (www.…, fb.com/…) thì đếm từng tên miền */
function kscLinkN_(v) {
  var s = String(v == null ? '' : v).trim(); if (!s) return 0;
  var n = (s.match(/https?:\/\//gi) || []).length;
  if (!n) n = s.split(/[\s,;]+/).filter(function (x) { return /^(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(x); }).length;
  return n;
}
function kscMktOnTime_(fill, deadline, fallback) {
  var f = kscDay_(fill), d = kscDay_(deadline);
  if (f && d) return KSC_MKT.ONTIME === 'eq' ? f === d : f <= d;
  return !!fallback;
}
function kscDay_(v) {
  if (kscIsDate_(v) && !isNaN(v.getTime())) return Number(Utilities.formatDate(v, KSC.TZ, 'yyyyMMdd'));
  var s = String(v || '').trim(), x;
  if ((x = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s))) return Number(x[3]) * 10000 + Number(x[2]) * 100 + Number(x[1]);
  if ((x = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(s))) return Number(x[1]) * 10000 + Number(x[2]) * 100 + Number(x[3]);
  return 0;
}
/* ghi ngày điền link khi có người điền "Link report" / "Task Result" (trigger khi sửa file Marketing) */
function kscMktStamp_(e) {
  if (!e || !e.range) return;
  var s = e.range.getSheet(), name = s.getName();
  var spec = name === KSC_MKT.ORDER ? ['thang hoan thanh', 'task result', /^task result/] :
             KSC_MKT.POSTS.some(function (p) { return p.sheet === name; }) ? ['month', 'link report', /^link report/] : null;
  if (!spec) return;
  var lc = s.getLastColumn(), H = s.getRange(1, 1, Math.min(10, s.getMaxRows()), lc).getValues(), hr = -1, cLink = -1, cStamp = -1;
  for (var i = 0; i < H.length && hr < 0; i++) {
    var h = H[i].map(kscNorm_);
    if (h.some(function (x) { return x.indexOf(spec[0]) === 0; }) && h.some(function (x) { return x.indexOf(spec[1]) === 0; })) {
      hr = i;
      h.forEach(function (x, k) { if (cLink < 0 && spec[2].test(x)) cLink = k; if (x === kscNorm_(KSC_MKT.STAMP_HDR)) cStamp = k; });
    }
  }
  if (hr < 0 || cLink < 0) return;
  var c0 = e.range.getColumn() - 1, c1 = c0 + e.range.getNumColumns() - 1;
  if (cLink < c0 || cLink > c1) return;
  if (cStamp < 0) { cStamp = lc; s.getRange(hr + 1, cStamp + 1).setValue(KSC_MKT.STAMP_HDR).setFontWeight('bold'); }
  var r0 = Math.max(e.range.getRow(), hr + 2), n = e.range.getRow() + e.range.getNumRows() - r0;
  if (n <= 0) return;
  var L = s.getRange(r0, cLink + 1, n, 1).getValues(), S = s.getRange(r0, cStamp + 1, n, 1).getValues(), today = new Date(Utilities.formatDate(new Date(), KSC.TZ, 'yyyy/MM/dd') + ' 00:00:00'), chg = false;   // v1.12: ngày thật, không ghi chữ
  for (var k = 0; k < n; k++) {
    var has = String(L[k][0] || '').trim() !== '';
    if (has && (S[k][0] === '' || S[k][0] === null)) { S[k][0] = today; chg = true; }
    else if (!has && S[k][0] !== '' && S[k][0] !== null) { S[k][0] = ''; chg = true; }
  }
  if (chg) { s.getRange(r0, cStamp + 1, n, 1).setValues(S); try { s.getRange(r0, cStamp + 1, n, 1).setNumberFormat('dd/MM/yyyy'); } catch (eF) {} }
}
/* ngày điền link bị Google Sheets đọc ngược (02/10 thành 10/02): ngày trước tháng của dòng hơn 31 ngày mà đảo lại hợp lý ⇒ đảo lại */
function kscStampFix_(v, ym) {
  if (!kscIsDate_(v) || !ym) return v;
  var start = new Date(Math.floor(ym / 100), ym % 100 - 1, 1), d = v.getDate(), mo = v.getMonth() + 1;
  if (v.getTime() >= start.getTime() - 31 * 864e5 || d > 12) return v;
  var sw = new Date(v.getFullYear(), d - 1, mo);
  return (sw.getTime() >= start.getTime() - 31 * 864e5 && sw.getTime() <= Date.now() + 864e5) ? sw : v;
}

/* ════════════════ NGUỒN 4 · REPORT_EVENT THÁI (KPI Hub xử lý) ════════════════ */
function kscEventStatus_(ctx) {
  var out = { title: kscLabel_('event_th'), file: 'Marketing Offline Thailand', sheet: 'REPORT_EVENT', codes: KSC.EVENT_CODES.slice(), rules: {} };
  KSC.EVENT_CODES.forEach(function (c) { out.rules[c] = 'KPI Hub (code của file KPI) đếm sự kiện theo tháng từ sheet REPORT_EVENT của file Marketing Offline Thailand.'; });
  var log = ctx.ss.getSheetByName(KSC.LOG), last = null;
  if (log && log.getLastRow() > 1) {
    var V = log.getRange(2, 1, Math.min(log.getLastRow() - 1, 300), 4).getValues();
    for (var i = 0; i < V.length && !last; i++) if (/event_th/.test(String(V[i][1]))) last = V[i];
  }
  if (!last) { out.status = 'skip'; out.msg = 'Do KPI Hub đọc (5 phút/lần). Chưa thấy lượt chạy nào trong ' + KSC.LOG; return out; }
  var t = kscIsDate_(last[0]) ? Utilities.formatDate(last[0], KSC.TZ, 'dd/MM/yyyy HH:mm') : String(last[0]);
  var bad = /lỗi|loi|error|thiếu/i.test(String(last[2]) + String(last[3]));
  out.status = bad ? 'error' : 'ok';
  out.msg = 'Do KPI Hub đọc (5 phút/lần) · lượt gần nhất ' + t + ': ' + last[2] + ' · ' + last[3];
  return out;
}

/* ════════════════ GHI VÀO 3. DETAIL KPI ════════════════ */
function kscCtx_(ss) {
  var sh = ss.getSheetByName(KSC.DETAIL);
  if (!sh) throw new Error('Không có sheet "' + KSC.DETAIL + '"');
  return { ss: ss, sh: sh, L: kscLayout_(sh), curYm: Number(Utilities.formatDate(new Date(), KSC.TZ, 'yyyyMM')) };
}
function kscLayout_(sh) {
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 80);
  var rg = sh.getRange(1, 1, lr, lc), V = rg.getValues(), F = rg.getFormulas();
  var hr = -1, cc = -1, i, j;
  for (i = 0; i < Math.min(lr, 15) && hr < 0; i++) for (j = 0; j < lc; j++) if (kscNorm_(V[i][j]) === 'kpi code') { hr = i; cc = j; break; }
  if (hr < 0) throw new Error('Sheet "' + KSC.DETAIL + '" không có ô tiêu đề "KPI Code"');
  var H = {}, months = [], tCol = {}, aCol = {}, FYC = {}, fy = '';
  V[hr].forEach(function (h, k) {
    var s = String(h || '').replace(/\s+/g, ' ').trim(), m = /^(\d{6}) (target|actual)$/i.exec(s), f = /^(FY\d+) (target|actual|%)$/i.exec(s);
    if (m) { var ym = Number(m[1]); if (/target/i.test(m[2])) { tCol[ym] = k; if (months.indexOf(ym) < 0) months.push(ym); } else aCol[ym] = k; return; }
    if (f) { var y = f[1].toUpperCase(); FYC[y] = FYC[y] || {}; FYC[y][f[2].toLowerCase()] = k; return; }
    H[kscNorm_(s)] = k;
  });
  Object.keys(FYC).forEach(function (y) { if (!fy && FYC[y].target != null) fy = y; });
  months = months.filter(function (m) { return aCol[m] != null; }).sort();
  var rows = {};
  for (i = hr + 1; i < lr; i++) { var c = String(V[i][cc] || '').trim(); if (c && rows[c] == null) rows[c] = i; }
  var X = fy ? FYC[fy] : {};
  return { V: V, F: F, hr: hr, cc: cc, H: H, months: months, tCol: tCol, aCol: aCol, rows: rows, fy: fy || 'FY',
           fyT: X.target != null ? X.target : -1, fyA: X.actual != null ? X.actual : -1, fyP: X['%'] != null ? X['%'] : -1 };
}
/* loại công thức trong ô Actual */
function kscKind_(f) {
  if (!f) return 'none';
  if (/^=\s*\$?[A-Z]{1,3}\$?\d+\s*$/i.test(f)) return 'placeholder';                       // "=O5": tạm lấy target ⇒ coi như trống
  if (/(SUMIFS?|AVERAGEIFS?|COUNTIFS?|SUMPRODUCT)\s*\(|^=\s*(SUM|AVERAGE|MAX|MIN)\s*\(/i.test(f)) return 'calc';   // dòng tổng
  return 'other';
}
/* data = { code: { yyyymm: value } } */
function kscWrite_(ctx, source, data, opts) {
  var L = ctx.L, st = { cells: 0, codes: [], locked: 0, lockList: [], cleared: 0, rollup: 0, replaced: 0, missing: [], future: 0, det: [] }, backups = [];
  var unlock = false; try { unlock = PropertiesService.getScriptProperties().getProperty('KSC_UNLOCK') === '1'; } catch (e) {}
  if (KSC.LOCK_FREE[String(source).replace(/:.*$/, '')]) unlock = true;
  var late = /^crm:/.test(String(source)) ? kscLate_(ctx.ss) : null;           /* v1.17 — cửa sổ nhận số trễ của CRM */
  Object.keys(data || {}).forEach(function (code) {
    var r = L.rows[code]; if (r == null) { st.missing.push(code); return; }
    var n = 0;
    Object.keys(data[code]).forEach(function (k) {
      var ym = Number(k), c = L.aCol[ym]; if (c == null) return;
      if (ym > ctx.curYm) { st.future++; return; }
      var clear = data[code][k] === KSC_CLEAR;
      var v = clear ? '' : Math.round(Number(data[code][k]) * 1e6) / 1e6; if (!clear && isNaN(v)) return;
      var f = L.F[r][c], kind = kscKind_(f), cur = L.V[r][c];
      if (kind === 'calc') { st.rollup++; return; }
      var emptyLike = kind === 'placeholder' || cur === '' || cur === null;
      if (clear ? emptyLike : (!emptyLike && kscEq_(cur, v))) return;
      if (!emptyLike && !unlock && !(opts && opts.force) && !(opts && opts.forceRe && opts.forceRe.test(code)) && !(late && late.open && String(ym) === late.month) && kscLocked_(ym)) { st.locked++; if (st.lockList.length < 40) st.lockList.push([code, ym, cur, clear ? '(trống)' : v]); return; }
      if (clear) st.cleared++;
      if (kind === 'other') { backups.push([new Date(), source, code, ym, "'" + f, cur]); st.replaced++; }
      ctx.sh.getRange(r + 1, c + 1).setValue(v);
      L.V[r][c] = v; L.F[r][c] = ''; st.cells++; n++;
      if (st.det.length < 200) st.det.push([code, ym, v]);
    });
    if (n) st.codes.push(code);
  });
  if (backups.length) {
    try {
      var b = ctx.ss.getSheetByName(KSC.BACKUP);
      if (!b) { b = ctx.ss.insertSheet(KSC.BACKUP); b.getRange(1, 1, 1, 6).setValues([['Thời điểm', 'Nguồn', 'KPI Code', 'Tháng', 'Công thức cũ', 'Giá trị cũ']]).setFontWeight('bold'); try { b.hideSheet(); } catch (e2) {} }
      b.getRange(b.getLastRow() + 1, 1, backups.length, 6).setValues(backups);
    } catch (e3) {}
  }
  if (st.cells) kscLog_(ctx.ss, source + ' · ' + ((opts && opts.why) || 'auto'), 'push', st.codes.length + ' mã · ' + st.cells + ' ô' +
    (st.replaced ? ' · thay ' + st.replaced + ' ô công thức' : '') + (st.locked ? ' · giữ ' + st.locked + ' ô tháng đã chốt' : ''));
  return st;
}
function kscResult_(out, st, info) {
  out.cells = st.cells; out.replaced = st.replaced; out.locked = st.locked; out.rollup = st.rollup; out.lockList = st.lockList;
  out.codes = out.codes && out.codes.length ? out.codes : Object.keys(st.det.reduce(function (a, d) { a[d[0]] = 1; return a; }, {}));
  out.written = st.codes; out.details = st.det.slice(0, 60);
  out.status = out.status || 'ok';
  out.msg = info + ' · ghi ' + st.cells + ' ô (' + st.codes.length + ' mã)' +
    (st.replaced ? ' · thay ' + st.replaced + ' ô công thức (lưu ở ' + KSC.BACKUP + ')' : '') +
    (st.cleared ? ' · để trống ' + st.cleared + ' ô (số nguồn sai)' : '') +
    (st.locked ? ' · giữ ' + st.locked + ' ô tháng đã chốt vì nguồn khác số đã chốt (' + st.lockList.slice(0, 4).map(function (x) {
      return x[0] + ' ' + x[1] + ': đang ' + kscFmtNum_(x[2]) + ', nguồn ' + (typeof x[3] === 'number' ? kscFmtNum_(x[3]) : x[3]); }).join('; ') +
      (st.locked > 4 ? '…' : '') + '), muốn cập nhật thì bấm menu 🔓' : '') +
    (st.rollup ? ' · ' + st.rollup + ' ô dòng tổng tự tính' : '') +
    (st.missing.length ? ' · file KPI không có mã: ' + st.missing.join(', ') : '');
  return out;
}
/* v1.17 — cửa sổ nhận số trễ (sheet _CRM_LINKS!J1:K1) */
function kscLate_(ss) {
  var o = { month: '', until: '', open: false };
  try {
    var sh = ss.getSheetByName(KSC.LINKS); if (!sh) return o;
    var v = sh.getRange('J1:K1').getValues()[0];
    o.month = String(v[0] || '').replace(/\D/g, '').slice(0, 6);
    o.until = Object.prototype.toString.call(v[1]) === '[object Date]' ? Utilities.formatDate(v[1], KSC.TZ, 'yyyy-MM-dd') : String(v[1] || '').trim().slice(0, 10);
    o.open = !!(o.month && o.until && Utilities.formatDate(new Date(), KSC.TZ, 'yyyy-MM-dd') <= o.until);
  } catch (e) {}
  return o;
}
function kscLateOpen() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActive(), cur = kscLate_(ss);
  var a = ui.prompt('🕒 Nhận số CRM trễ cho 1 tháng đã chốt',
    (cur.month ? 'Đang mở: tháng ' + cur.month + ' đến hết ' + cur.until + (cur.open ? '' : ' (đã hết hạn)') + '\n\n' : '') +
    'Nhập "THÁNG HẠN", ví dụ:  202609 2026-10-10\nĐể trống rồi OK = đóng cửa sổ.', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var t = a.getResponseText().trim(), m = /^(\d{6})\s+(\d{4}-\d{2}-\d{2})$/.exec(t);
  if (t && !m) { ui.alert('Sai định dạng. Ví dụ: 202609 2026-10-10'); return; }
  var sh = ss.getSheetByName(KSC.LINKS);
  sh.getRange('I1:K1').setValues([['Nhận số CRM trễ cho tháng · hạn', m ? m[1] : '', m ? m[2] : '']]);
  sh.getRange('J1:K1').setNumberFormat('@');
  kscLog_(ss, 'KpiSyncCenter', 'late-window', m ? m[1] + ' đến ' + m[2] : 'đóng');
  var res = m ? kscRunAll_('manual') : null;
  ui.alert(m ? 'Đã mở nhận số CRM tháng ' + m[1] + ' đến hết ' + m[2] + '.\n\n' + res.lines.join('\n') : 'Đã đóng cửa sổ nhận số trễ.');
}
/* v1.18 — BỎ RULE CHỐT SỐ THÁNG: không tháng nào bị khoá, mọi nguồn ghi đè realtime */
function kscLocked_(ym) { return false; }
function kscLog_(ss, source, action, detail) {
  try {
    var s = ss.getSheetByName(KSC.LOG);
    if (!s) { s = ss.insertSheet(KSC.LOG); s.getRange(1, 1, 1, 4).setValues([['Thời điểm', 'Nguồn', 'Thao tác', 'Chi tiết']]).setFontWeight('bold'); try { s.hideSheet(); } catch (e) {} }
    s.insertRowAfter(1);
    s.getRange(2, 1, 1, 4).setValues([[Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm:ss'), source, action, String(detail).slice(0, 500)]]);
    if (s.getLastRow() > 600) s.deleteRows(601, s.getLastRow() - 600);
  } catch (e) {}
}

/* ── dòng tổng: điền công thức còn thiếu (ô trống hoặc công thức tạm) bằng công thức tháng bên cạnh ── */
function kscRepairRollups() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var f = kscRollupsFix_(kscCtx_(SpreadsheetApp.getActive()), false);
    var msg = f.length ? 'Đã điền công thức dòng tổng: ' + f.join(', ') : 'Dòng tổng đã đủ công thức.';
    try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
    return msg;
  } finally { lock.releaseLock(); }
}
function kscRollupsFix_(ctx, quiet) {
  var L = ctx.L, fixed = [], backups = [];
  Object.keys(L.rows).forEach(function (code) {
    var r = L.rows[code], tpl = null, gaps = [];
    L.months.forEach(function (m) {
      var c = L.aCol[m], f = L.F[r][c];
      if (f && /(SUMIF|AVERAGEIF)\s*\(\s*\$C:\$C/i.test(f)) { if (tpl == null) tpl = c; }
      else if (!f || kscKind_(f) === 'placeholder') gaps.push(c);       // ô trống, công thức tạm, hoặc số gõ / bị ghi đè
    });
    if (tpl == null || !gaps.length) return;
    var r1c1 = ctx.sh.getRange(r + 1, tpl + 1).getFormulaR1C1(), typed = 0;
    gaps.forEach(function (c) {
      var old = L.V[r][c];
      if (!L.F[r][c] && old !== '' && old !== null) { typed++; backups.push([new Date(), 'rollup', code, L.months.filter(function (m) { return L.aCol[m] === c; })[0] || '', '(số)', old]); }
      ctx.sh.getRange(r + 1, c + 1).setFormulaR1C1(r1c1); L.F[r][c] = '=SUMIF(rollup)';
    });
    fixed.push(code + ' (' + gaps.length + ' ô' + (typed ? ', thay ' + typed + ' số gõ' : '') + ')');
  });
  if (backups.length) {
    try {
      var b = ctx.ss.getSheetByName(KSC.BACKUP);
      if (!b) { b = ctx.ss.insertSheet(KSC.BACKUP); b.getRange(1, 1, 1, 6).setValues([['Thời điểm', 'Nguồn', 'KPI Code', 'Tháng', 'Công thức cũ', 'Giá trị cũ']]).setFontWeight('bold'); try { b.hideSheet(); } catch (e2) {} }
      b.getRange(b.getLastRow() + 1, 1, backups.length, 6).setValues(backups);
    } catch (e3) {}
  }

  if (fixed.length) kscLog_(ctx.ss, 'KpiSyncCenter', 'rollup', 'Điền công thức dòng tổng: ' + fixed.join(', '));
  return fixed;
}

/* ── sheet 5. Member KPI Monthly: Target = 0 ⇒ % = 100% (khi kỳ đã tới) ──
   Mỗi cột "<kỳ> %" (kỳ = yyyymm, Q1…Q4, FYxx) được đặt công thức:
     =IF(T="","",IF(N(T)=0,IF(<tháng đầu kỳ><=YEAR(TODAY())*100+MONTH(TODAY()),1,""),IF(A="","",IF(LEFT($E,1)="F",A/T,MIN(A/T,1.3)))))
   T, A = ô "<kỳ> Target", "<kỳ> Actual" cùng dòng (tìm theo tiêu đề). Chạy mỗi phút: chỉ đọc công thức, chỉ ghi khi có ô sai. */
function kscZeroTargetFix_(ctx) {
  var sh = ctx.ss.getSheetByName(KSC_M5.SHEET), res = { fixed: 0, done: 0, other: 0, sample: '', cols: 0 };
  if (!sh || sh.getLastRow() < 5) { res.msg = 'Không thấy sheet ' + KSC_M5.SHEET; return res; }
  var lr = sh.getLastRow(), lc = sh.getLastColumn(), H = sh.getRange(1, 1, Math.min(lr, 10), lc).getValues(), hr = -1;
  for (var i = 0; i < H.length && hr < 0; i++) { var h0 = H[i].map(kscNorm_); if (h0.indexOf('member') >= 0 && h0.indexOf('kpi code') >= 0) hr = i; }
  if (hr < 0) { res.msg = 'Sheet 5 không có dòng tiêu đề (Member, KPI Code)'; return res; }
  var hdr = H[hr].map(function (x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toUpperCase(); }), colOf = {};
  hdr.forEach(function (x, k) { if (x && colOf[x] == null) colOf[x] = k; });
  var cCode = colOf['KPI CODE'], n = lr - hr - 1; if (n <= 0) { res.msg = 'Sheet 5 chưa có dòng'; return res; }
  var mk = hdr.map(function (x) { var m = /^(\d{6}) %$/.exec(x); return m ? Number(m[1]) : 0; }).filter(function (x) { return x; }).sort();
  var blk = sh.getRange(hr + 2, 1, n, lc), F = blk.getFormulas(), VV = blk.getValues(), B = VV.map(function (x) { return [x[1]]; }), Cd = VV.map(function (x) { return [x[cCode]]; });
  var E = function (row) { return '$' + kscColL_(cCode + 1) + row; };
  hdr.forEach(function (x, k) {
    var m = /^(\d{6}|Q[1-4]|FY\d+) %$/.exec(x); if (!m) return;
    var key = m[1], kt = colOf[key + ' TARGET'], ka = colOf[key + ' ACTUAL']; if (kt == null || ka == null) return;
    var start = /^\d{6}$/.test(key) ? Number(key) : /^Q/.test(key) ? mk[(Number(key.slice(1)) - 1) * 3] : mk[0];
    if (!start) return;
    res.cols++;
    var tL = kscColL_(kt + 1), aL = kscColL_(ka + 1), out = [], hit = [];
    for (var j = 0; j < n; j++) {
      var row = hr + 2 + j, f = String(F[j][k] || ''); out.push([f]);
      if (/^TOTAL/i.test(String(B[j][0]).trim())) continue;
      if (!f && !String(Cd[j][0] || '').trim()) continue;                  // dòng trống, ô không có công thức: bỏ qua
      var T = tL + row, A = aL + row;
      var want = '=IF(' + T + '="","",IF(N(' + T + ')=0,IF(' + start + '<=YEAR(TODAY())*100+MONTH(TODAY()),1,""),IF(' + A + '="","",IF(LEFT(' + E(row) + ',1)="F",' + A + '/' + T + ',MIN(' + A + '/' + T + ',1.3)))))';
      var fz = kscFxEn_(f).replace(/\s+/g, '').toUpperCase(), bad = kscIsErr_(VV[j][k]);
      if (fz === want.toUpperCase() && !bad) { res.done++; continue; }
      if (fz === want.toUpperCase() && bad) { out[j][0] = kscFx_(ctx.ss, want); hit.push(j); res.fixed++; continue; }   // v1.15: đúng nội dung nhưng sai kiểu dấu ⇒ #ERROR!
      if (!f) { out[j][0] = kscFx_(ctx.ss, want); hit.push(j); res.fixed++; continue; }   // ô % đang là số gõ / do script khác ghi ⇒ đặt công thức
      var reT = new RegExp('\\$?' + tL + '\\$?' + row + '(?!\\d)'), reA = new RegExp('\\$?' + aL + '\\$?' + row + '(?!\\d)');
      if (!(reT.test(fz) && reA.test(fz) && fz.indexOf('/') > 0)) { res.other++; if (!res.sample) res.sample = key + ' %, dòng ' + row + ': ' + f.slice(0, 120); continue; }
      out[j][0] = kscFx_(ctx.ss, want); hit.push(j); res.fixed++;
    }
    for (var p = 0; p < hit.length;) {
      var q = p; while (q + 1 < hit.length && hit[q + 1] === hit[q] + 1) q++;
      sh.getRange(hr + 2 + hit[p], k + 1, q - p + 1, 1).setFormulas(out.slice(hit[p], hit[q] + 1));
      p = q + 1;
    }
  });
  res.msg = 'Sheet 5 · Target = 0 ⇒ 100%: ' + (res.fixed ? 'sửa ' + res.fixed + ' ô' : 'không có ô sai') + ', ' + res.done + ' ô đã đúng (' + res.cols + ' cột %)' +
    (res.other ? ' · ' + res.other + ' ô % có công thức không tính theo Target / Actual cùng dòng (ví dụ ' + res.sample + ')' : '');
  if (res.fixed) kscLog_(ctx.ss, 'KpiSyncCenter', 'zero-target', res.msg);
  return res;
}
/* menu 🎯: sửa ngay + liệt kê các dòng Target = 0 của các tháng đã tới */
function kscZeroCheck() {
  var ss = SpreadsheetApp.getActive(), ui = SpreadsheetApp.getUi(), lock = LockService.getScriptLock(), res;
  lock.waitLock(60000);
  try { res = kscZeroTargetFix_({ ss: ss }); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  var sh = ss.getSheetByName(KSC_M5.SHEET), lines = [res.msg, ''];
  if (sh) {
    var V = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), hr = -1;
    for (var i = 0; i < Math.min(V.length, 10) && hr < 0; i++) { var h = V[i].map(kscNorm_); if (h.indexOf('member') >= 0 && h.indexOf('kpi code') >= 0) hr = i; }
    if (hr >= 0) {
      var H = V[hr].map(function (x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim().toUpperCase(); }), colOf = {};
      H.forEach(function (x, k) { if (x && colOf[x] == null) colOf[x] = k; });
      var cur = Number(Utilities.formatDate(new Date(), KSC.TZ, 'yyyyMM')), cM = colOf['MEMBER'], cC = colOf['KPI CODE'], found = 0;
      var keys = H.map(function (x) { var m = /^(\d{6}) %$/.exec(x); return m ? m[1] : ''; }).filter(function (x) { return x && Number(x) <= cur; }).slice(-2);
      keys.forEach(function (key) {
        for (var r = hr + 1; r < V.length; r++) {
          var code = String(V[r][cC] || '').trim(), t = V[r][colOf[key + ' TARGET']]; if (!code || /^TOTAL/i.test(String(V[r][1]))) continue;
          if (t === '' || t === null || Number(t) !== 0) continue;
          var pc = V[r][colOf[key + ' %']], w = V[r][colOf[key + ' WEIGHT']];
          if (found < 40) lines.push((pc === 1 ? '✓ ' : '✗ ') + key + ' · ' + V[r][cM] + ' · ' + code + ': Target 0 ⇒ % = ' + (pc === '' ? '(trống)' : Math.round(Number(pc) * 1000) / 10 + '%') +
            (w !== '' && w != null ? ', trọng số ' + Math.round(Number(w) * 1000) / 10 + '%' : ''));
          found++;
        }
      });
      if (!found) lines.push('Tháng ' + keys.join(', ') + ': không có dòng nào Target = 0.');
      else if (found > 40) lines.push('… và ' + (found - 40) + ' dòng khác.');
    }
  }
  ui.alert('🎯 Rule Target = 0 ⇒ đạt 100%', lines.join('\n'), ui.ButtonSet.OK);
}
/* v1.15: dấu ngăn đối số của công thức theo định dạng (locale) của file: "," hoặc ";" (Việt Nam, Đức…). Thử 1 lần, lưu lại. */
function kscSep_(ss) {
  var P = PropertiesService.getScriptProperties(), loc = '';
  try { loc = ss.getSpreadsheetLocale(); } catch (e) {}
  var key = 'KSC_SEP_' + (loc || 'x'), c = P.getProperty(key); if (c) return c;
  var sh = null, sep = ',';
  try {
    sh = ss.insertSheet('_ksc_sep_test_' + Date.now());
    var cell = sh.getRange(1, 1);
    cell.setFormula('=IF(1=1,7,0)'); SpreadsheetApp.flush();
    if (Number(cell.getValue()) !== 7) { cell.setFormula('=IF(1=1;7;0)'); SpreadsheetApp.flush(); if (Number(cell.getValue()) === 7) sep = ';'; }
  } catch (e) { Logger.log('sep: ' + e); }
  finally { try { if (sh) ss.deleteSheet(sh); } catch (e2) {} }
  P.setProperty(key, sep);
  return sep;
}
/* công thức viết kiểu "," (số thập phân dấu chấm) ⇒ đổi sang kiểu của file */
function kscFx_(ss, f) {
  if (kscSep_(ss) !== ';') return f;
  return String(f).split(/("[^"]*"|'[^']*')/).map(function (p, i) { return i % 2 ? p : p.replace(/(\d)\.(\d)/g, '$1\u0001$2').replace(/,/g, ';').replace(/\u0001/g, ','); }).join('');
}
/* công thức đọc từ file (có thể kiểu ";") ⇒ kiểu "," để so sánh */
function kscFxEn_(f) {
  var parts = String(f || '').split(/("[^"]*"|'[^']*')/);
  if (!parts.some(function (p, i) { return !(i % 2) && p.indexOf(';') >= 0; })) return String(f || '');
  return parts.map(function (p, i) { return i % 2 ? p : p.replace(/(\d),(\d)/g, '$1.$2').replace(/;/g, ','); }).join('');
}
function kscIsErr_(v) { return typeof v === 'string' && /^#(ERROR!|NAME\?)/.test(v); }
/* v1.15: ô FY68 Target / FY68 Actual của 3. Detail KPI đang #ERROR! (công thức tổng 12 tháng ghi sai kiểu dấu) ⇒ ghi lại */
function kscFyFix_(ctx) {
  var L = ctx.L, sh = ctx.sh, n = 0;
  if (L.fyT < 0 && L.fyA < 0) return 0;
  var tc = L.months.map(function (m) { return L.tCol[m]; }), ac = L.months.map(function (m) { return L.aCol[m]; });
  var t1 = kscColL_(Math.min.apply(null, tc) + 1), t2 = kscColL_(Math.max.apply(null, tc) + 1), a1 = kscColL_(Math.min.apply(null, ac) + 1), a2 = kscColL_(Math.max.apply(null, ac) + 1);
  Object.keys(L.rows).forEach(function (code) {
    var r = L.rows[code], row = r + 1;
    [[L.fyT, t1, t2], [L.fyA, a1, a2]].forEach(function (x) {
      var c = x[0]; if (c < 0) return;
      if (!kscIsErr_(L.V[r][c]) || !/COUNT\s*\(/i.test(L.F[r][c] || '')) return;
      var f = kscFx_(ctx.ss, '=IF(COUNT(' + x[1] + row + ':' + x[2] + row + ')=0,"",SUM(' + x[1] + row + ':' + x[2] + row + '))');
      sh.getRange(row, c + 1).setFormula(f); L.F[r][c] = f; n++;
    });
  });
  if (n) kscLog_(ctx.ss, 'KpiSyncCenter', 'fy-fix', 'Ghi lại ' + n + ' ô FY68 Target / FY68 Actual đang #ERROR! (dấu ngăn công thức "' + kscSep_(ctx.ss) + '")');
  return n;
}
function kscColL_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/* ── menu 📅: Target doanh số mã F từ lũy kế ⇒ theo tháng (Agg LAST ⇒ SUM) ── */
function kscMonthlyTargets() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.alert('📅 Target doanh số theo tháng',
    'Các mã doanh số F và mã đếm số có Agg = LAST (Target, Actual đang LŨY KẾ từ tháng 9) sẽ đổi sang THEO THÁNG (mã tỷ lệ % giữ nguyên):\n' +
    '· Target từng tháng = lũy kế tháng đó trừ lũy kế tháng trước (tổng cả năm không đổi).\n' +
    '· Agg = SUM; FY68 Target, FY68 Actual = tổng 12 tháng.\n' +
    '· Actual mã F được ghi lại theo tháng (kể cả tháng đã chốt).\n' +
    'Số cũ lưu ở sheet ẩn _SYNC_REPLACED. Dòng tổng (công thức SUMIF dòng con) giữ công thức.\n\nTiếp tục?', ui.ButtonSet.OK_CANCEL);
  if (a !== ui.Button.OK) return;
  var lock = LockService.getScriptLock(), out; lock.waitLock(60000);
  try { out = kscMonthlyTargets_(kscCtx_(SpreadsheetApp.getActive())); } finally { lock.releaseLock(); }
  ui.alert('📅 Target doanh số theo tháng', out, ui.ButtonSet.OK);
}
function kscMonthlyTargets_(ctx, opts) {
  opts = opts || {};
  var L = ctx.L, sh = ctx.sh, cAgg = L.H['agg'], cUnit = L.H['unit'], backups = [], done = [], skipped = [];
  if (cAgg == null) return 'Không thấy cột Agg ở 3. Detail KPI';
  var tc = L.months.map(function (m) { return L.tCol[m]; }), ac = L.months.map(function (m) { return L.aCol[m]; });
  var t1 = kscColL_(Math.min.apply(null, tc) + 1), t2 = kscColL_(Math.max.apply(null, tc) + 1), a1 = kscColL_(Math.min.apply(null, ac) + 1), a2 = kscColL_(Math.max.apply(null, ac) + 1);
  Object.keys(L.rows).sort(function (x, y) { return L.rows[x] - L.rows[y]; }).forEach(function (code) {
    var r = L.rows[code]; if (String(L.V[r][cAgg]).trim().toUpperCase() !== 'LAST') return;
    var isF = /^F/.test(code), unit = cUnit == null ? '' : kscNorm_(L.V[r][cUnit]);
    if (!isF && (/%|rate|ty le|score|point|diem/.test(unit) || unit === '')) return;      // mã tỷ lệ / điểm: giữ nguyên
    var row = r + 1, prev = 0, ok = true, vals = [];
    tc.forEach(function (c) { var f = L.F[r][c], v = kscNum_(L.V[r][c]); vals.push({ f: f, v: v }); });
    var typed = vals.filter(function (x) { return !x.f; });
    if (!isF) {                                                    // mã đếm số: chỉ đổi khi chắc chắn là lũy kế
      var nums = vals.map(function (x) { return x.v; }).filter(function (v) { return v != null; }), fyv = L.fyT >= 0 ? kscNum_(L.V[r][L.fyT]) : null;
      var cumul = typed.length === vals.length && nums.length >= 3 && nums.every(function (v, i) { return i === 0 || v >= nums[i - 1]; }) &&
                  nums[nums.length - 1] > nums[0] && fyv != null && Math.abs(nums[nums.length - 1] - fyv) < 0.5;
      if (!cumul) return;
    }
    if (typed.length) {                                             // target gõ tay (lũy kế) ⇒ từng tháng
      vals.forEach(function (x) { if (x.f) { ok = false; } });
      if (!ok) { skipped.push(code + ' (target lẫn công thức)'); return; }
      var monthly = vals.map(function (x) { var v = x.v == null ? null : x.v - prev; if (x.v != null) prev = x.v; return v; });
      if (monthly.some(function (v) { return v != null && v < -0.5; })) { skipped.push(code + ' (target không tăng dần, có thể đã theo tháng)'); return; }
      backups.push([new Date(), 'monthly-target', code, 'Target 12 tháng', '(số)', JSON.stringify(vals.map(function (x) { return x.v; }))]);
      tc.forEach(function (c, j) { if (monthly[j] != null) sh.getRange(row, c + 1).setValue(Math.round(monthly[j] * 100) / 100); });
    }
    var fyT = L.fy ? L.fyT : -1, fyA = L.fyA;
    if (fyT >= 0 && !/SUMIF\s*\(\s*\$C:\$C/i.test(L.F[r][fyT] || '')) sh.getRange(row, fyT + 1).setFormula(kscFx_(ctx.ss, '=IF(COUNT(' + t1 + row + ':' + t2 + row + ')=0,"",SUM(' + t1 + row + ':' + t2 + row + '))'));
    if (fyA >= 0) sh.getRange(row, fyA + 1).setFormula(kscFx_(ctx.ss, '=IF(COUNT(' + a1 + row + ':' + a2 + row + ')=0,"",SUM(' + a1 + row + ':' + a2 + row + '))'));
    sh.getRange(row, cAgg + 1).setValue('SUM');
    done.push(code);
  });
  if (backups.length) {
    var b = ctx.ss.getSheetByName(KSC.BACKUP);
    if (!b) { b = ctx.ss.insertSheet(KSC.BACKUP); b.getRange(1, 1, 1, 6).setValues([['Thời điểm', 'Nguồn', 'KPI Code', 'Tháng', 'Công thức cũ', 'Giá trị cũ']]).setFontWeight('bold'); try { b.hideSheet(); } catch (e2) {} }
    b.getRange(b.getLastRow() + 1, 1, backups.length, 6).setValues(backups);
  }
  SpreadsheetApp.flush();
  /* ghi lại Actual mã F theo tháng (ghi đè cả tháng đã chốt) */
  var P = PropertiesService.getScriptProperties(), msg2 = '';
  if (opts.noRerun) msg2 = 'đọc lại ở bước sau';
  else {
    try { P.setProperty('KSC_UNLOCK', '1'); var c2 = kscCtx_(ctx.ss); var r2 = kscRunSource_(c2, 'turnover', 'manual'); msg2 = (r2.status === 'ok' ? '✓ ' : '⚠ ') + r2.msg; }
    finally { P.deleteProperty('KSC_UNLOCK'); }
  }
  kscLog_(ctx.ss, 'KpiSyncCenter', 'monthly-target', 'Đổi sang theo tháng: ' + done.join(', '));
  return (done.length ? 'Đã đổi Target lũy kế sang theo tháng (' + done.length + ' mã): ' + done.join(', ') : 'Target đã theo tháng (không còn mã lũy kế Agg = LAST)') +
    (skipped.length ? '\nBỏ qua: ' + skipped.join('; ') : '') + '\n\nActual doanh số: ' + msg2 +
    '\n\nNhớ: mở từng file CRM ▸ menu tạo lại tab KPI (VN ⑪, Thái ⑤) với code CRM bản mới để tab CRM tính theo tháng.';
}

/* ════════════════ TRẠNG THÁI NGUỒN DỮ LIỆU ════════════════ */
function kscRemember_(src, r, why) {
  try {
    var P = PropertiesService.getScriptProperties();
    var S = JSON.parse(P.getProperty('KSC_SOURCES') || '{}'), C = JSON.parse(P.getProperty('KSC_CODES') || '{}');
    var now = Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm');
    S[src] = { t: now, why: why, status: r.status, msg: String(r.msg || '').slice(0, 400), file: r.file || '', sheet: r.sheet || '', cells: r.cells || 0, codes: (r.codes || []).slice(0, 80) };
    if (src !== 'event_th') (r.codes || []).forEach(function (c) { C[c] = C[c] || {}; C[c].src = src; });
    (r.written || []).forEach(function (c) { C[c] = C[c] || {}; C[c].src = src; C[c].t = now; });
    P.setProperty('KSC_SOURCES', JSON.stringify(S));
    P.setProperty('KSC_CODES', JSON.stringify(C));
    var rules = {}; Object.keys(r.rules || {}).forEach(function (c) { rules[c] = String(r.rules[c]).slice(0, 500); });
    P.setProperty('KSC_SRCINFO_' + src, JSON.stringify({ url: r.url || '', codeUrls: r.codeUrls || {}, rules: rules, file: r.file || '', sheet: r.sheet || '' }));
  } catch (e) {}
}
function kscUrl_(ss, sh) { return 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/edit' + (sh ? '#gid=' + sh.getSheetId() : ''); }
function kscWriteStatus_(ss) {
  var ctx = kscCtx_(ss), L = ctx.L, P = PropertiesService.getScriptProperties();
  var S = JSON.parse(P.getProperty('KSC_SOURCES') || '{}'), C = JSON.parse(P.getProperty('KSC_CODES') || '{}');
  var rt = kscRealtimeOn_(), links = kscLinks_(ss), grid = [], NC = 9;
  function pad(a) { while (a.length < NC) a.push(''); return a; }
  var srcs = ['turnover', 'training', 'kbi', 'mkt', 'moff'].concat(links.map(function (l) { return 'crm:' + l.team; })).concat(['event_th']);
  var ids = kscSourceIds_(ss);
  grid.push(pad(['KPI SYNC STATUS · NGUỒN DỮ LIỆU TỰ ĐỘNG CỦA 3. DETAIL KPI']));
  grid.push(pad(['Cập nhật: ' + Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm') + ' · Realtime: ' + (rt ? 'BẬT (sửa tay ở file nguồn: chạy ngay · app ghi: tối đa 1 phút · đọc lại toàn bộ mỗi ' + KSC.FULL_EVERY + ' phút)' : 'TẮT (chạy kscSetup để bật)')]));
  grid.push(pad(['']));
  grid.push(pad(['A. NGUỒN DỮ LIỆU']));
  grid.push(['Nguồn', 'File', 'Sheet / tab đọc', 'Mã KPI nhận số', 'Chế độ', 'Lần đồng bộ gần nhất', 'Kết quả', 'Ô ghi (lần gần nhất)', 'Ghi chú']);
  srcs.forEach(function (s) {
    var x = S[s] || {}, mode;
    if (s === 'event_th') mode = 'KPI Hub (5 phút/lần)';
    else if (!ids[s]) mode = 'Chưa kết nối (thiếu link ở ' + KSC.LINKS + ')';
    else mode = rt ? 'Realtime tự động' : 'Chỉ Manual (Realtime đang tắt)';
    var res = !x.status ? 'Chưa chạy' : x.status === 'ok' ? '✓ OK' : x.status === 'skip' ? '· Bỏ qua' : '⚠ Lỗi';
    grid.push([kscLabel_(s), x.file || '', x.sheet || '', (x.codes || []).join(', '), mode, x.t ? x.t + ' (' + x.why + ')' : '', res, x.cells || 0, x.msg || '']);
  });
  grid.push(pad(['']));
  grid.push(pad(['B. TỪNG MÃ KPI']));
  var hB = grid.length + 1;
  grid.push(['KPI Code', 'Detail KPI', 'Members involved', 'Cách lấy Actual', 'Nguồn', 'Tháng đã có Actual', 'Tháng tới hiện tại còn trống', 'Lần backend ghi gần nhất', 'Tham chiếu (3. Detail KPI)']);
  var nameC = L.H['detail kpi'], memC = L.H['members involved'], refC = L.H['reference file for calculation'];
  var counts = { auto: 0, calc: 0, hub: 0, none: 0 };
  Object.keys(L.rows).sort(function (a, b) { return L.rows[a] - L.rows[b]; }).forEach(function (code) {
    var r = L.rows[code], has = [], gap = [], calc = false;
    L.months.forEach(function (m) {
      var c = L.aCol[m], k = kscKind_(L.F[r][c]), v = L.V[r][c];
      if (k === 'calc') calc = true;
      var filled = k !== 'placeholder' && v !== '' && v !== null;
      if (filled) has.push(m); else if (m <= ctx.curYm) gap.push(m);
    });
    var c0 = C[code] || {}, how, src = '';
    if (c0.src) { how = 'Backend tự động'; src = kscLabel_(c0.src); counts.auto++; }
    else if (calc) { how = 'Công thức dòng tổng'; src = 'Dòng con trong 3. Detail KPI'; counts.calc++; }
    else if (KSC.EVENT_CODES.indexOf(code) >= 0) { how = 'KPI Hub'; src = 'Marketing Offline Thailand ▸ REPORT_EVENT'; counts.hub++; }
    else { how = 'Chưa có nguồn tự động'; counts.none++; }
    grid.push([code, nameC == null ? '' : String(L.V[r][nameC]).replace(/\s+/g, ' ').trim(), memC == null ? '' : L.V[r][memC], how, src,
      has.length ? has.join(', ') : '(chưa có)', gap.join(', '), c0.t || '', refC == null ? '' : L.V[r][refC]]);
  });
  grid.splice(3, 0, pad(['Tổng hợp mã KPI: ' + counts.auto + ' mã backend tự động · ' + counts.calc + ' mã dòng tổng tự tính · ' + counts.hub + ' mã do KPI Hub đọc · ' + counts.none + ' mã chưa có nguồn tự động']));
  hB++;
  var sh = ss.getSheetByName(KSC.STATUS);
  if (!sh) { sh = ss.insertSheet(KSC.STATUS); try { sh.setTabColor('#1155CC'); } catch (e) {} }
  sh.clearContents();
  if (sh.getMaxRows() < grid.length + 2) sh.insertRowsAfter(sh.getMaxRows(), grid.length + 2 - sh.getMaxRows());
  if (sh.getMaxColumns() < NC) sh.insertColumnsAfter(sh.getMaxColumns(), NC - sh.getMaxColumns());
  sh.getRange(1, 1, grid.length, NC).setValues(grid);
  try {
    sh.getRange(1, 1).setFontWeight('bold').setFontSize(14).setFontColor('#003047');
    sh.getRange(5, 1).setFontWeight('bold').setFontColor('#003047');
    sh.getRange(6, 1, 1, NC).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.getRange(hB - 1, 1).setFontWeight('bold').setFontColor('#003047');
    sh.getRange(hB, 1, 1, NC).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.setColumnWidth(1, 170); sh.setColumnWidth(2, 330); sh.setColumnWidth(4, 260); sh.setColumnWidth(9, 380);
    sh.setFrozenRows(0);
  } catch (e2) {}
  try { kscWriteExplainMap_(ss, ctx); } catch (e3) { Logger.log('explain map: ' + e3); }
  return sh;
}

/* ════════════════ KPI EXPLAIN MAP (nguồn · URL · rule từng mã, sửa tay được) ════════════════ */
var KSC_MAP = {
  SHEET : 'KPI EXPLAIN MAP',
  HDR   : ['KPI Code', 'Detail KPI', 'Nguồn dữ liệu (auto)', 'URL nguồn (auto)', 'Rule tính (auto)', 'Nhóm rule ở 4. Rule (auto)',
           'Nguồn (sửa tay)', 'URL nguồn (sửa tay)', 'Rule tính (sửa tay)', 'Mẫu diễn giải (tuỳ chọn)', 'Ghi chú thêm vào PDF'],
  AUTO  : 4,          // 4 cột auto (C → F) do code ghi lại mỗi lần; G → K là cột anh tự nhập, code không đụng
  RULE_SHEET: '4. Rule'
};

/* đọc sheet 4. Rule: mã KPI → nhóm rule (số, tên, nội dung, file tham chiếu) */
function kscRuleGroups_(ss) {
  var sh = ss.getSheetByName(KSC_MAP.RULE_SHEET), out = { byCode: {}, groups: [], url: '' };
  if (!sh || sh.getLastRow() < 2) return out;
  out.url = kscUrl_(ss, sh);
  var V = sh.getRange(1, 1, sh.getLastRow(), Math.min(sh.getLastColumn(), 12)).getValues(), hr = -1, C = {};
  for (var i = 0; i < Math.min(V.length, 15) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (h.some(function (x) { return x.indexOf('kpis in the group') === 0; }) && h.some(function (x) { return x.indexOf('rule') === 0; })) {
      hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; });
    }
  }
  if (hr < 0) return out;
  function col(re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; }
  var cNo = col(/^no/), cGr = col(/^kpi group/), cList = col(/^kpis in the group/), cRule = col(/^rule/), cRef = col(/^reference/);
  for (var r = hr + 1; r < V.length; r++) {
    var list = String(V[r][cList] || ''), text = String(V[r][cRule] || '').trim();
    if (!list && !text) continue;
    var codes = list.match(/\b[FCPL]\d+-\d+[a-z]?\b/g) || [];
    if (!codes.length) continue;
    var g = { no: cNo == null ? '' : String(V[r][cNo]).replace(/\.0$/, ''), title: cGr == null ? '' : String(V[r][cGr] || '').split('\n')[0].trim(),
              text: text, ref: cRef == null ? '' : String(V[r][cRef] || '').trim(), row: r + 1, codes: codes };
    out.groups.push(g);
    codes.forEach(function (c) { if (!out.byCode[c]) out.byCode[c] = g; });
  }
  return out;
}

/* nguồn · URL · rule tự động của 1 mã */
function kscAutoExplain_(ctx, code, C, P) {
  var L = ctx.L, r = L.rows[code], c0 = C[code] || {}, src = '', url = '', rule = '';
  if (c0.src) {
    var info = {}; try { info = JSON.parse(P.getProperty('KSC_SRCINFO_' + c0.src) || '{}'); } catch (e) {}
    src = kscLabel_(c0.src) + (info.file ? ' · ' + info.file : '') + (info.sheet ? ' ▸ ' + info.sheet : '');
    url = (info.codeUrls && info.codeUrls[code]) || info.url || '';
    rule = (info.rules && info.rules[code]) || '';
  } else if (L.months.some(function (m) { return kscKind_(L.F[r][L.aCol[m]]) === 'calc'; })) {
    src = 'Tự tính trong 3. Detail KPI (dòng tổng)';
    url = kscUrl_(ctx.ss, ctx.sh);
    var kids = Object.keys(L.rows).filter(function (k) { var pc = L.H['parent']; return pc != null && String(L.V[L.rows[k]][pc]).trim() === code; });
    rule = 'Cộng (hoặc trung bình với mã điểm / tỷ lệ) Actual của các mã con' + (kids.length ? ': ' + kids.join(', ') : '') + ' (công thức SUMIF / AVERAGEIF theo cột Parent).';
  } else if (KSC.EVENT_CODES.indexOf(code) >= 0) {
    src = 'KPI Hub · Marketing Offline Thailand ▸ REPORT_EVENT';
    rule = 'KPI Hub (code của file KPI) đếm sự kiện theo tháng từ sheet REPORT_EVENT.';
  } else {
    var rc = L.H['reference file for calculation'], ref = rc == null ? '' : String(L.V[r][rc] || '').trim();
    src = 'Chưa có nguồn tự động' + (ref && ref !== '-' ? ' (tham chiếu: ' + ref + ')' : '');
    if (/^https?:\/\//.test(ref)) url = ref;
  }
  return { source: src, url: url, rule: rule };
}

/* tạo / cập nhật sheet KPI EXPLAIN MAP; trả về map mã → giá trị dùng cho PDF (cột sửa tay ưu tiên) */
function kscWriteExplainMap_(ss, ctx) {
  var L = ctx.L, P = PropertiesService.getScriptProperties(), C = JSON.parse(P.getProperty('KSC_CODES') || '{}');
  var RG = kscRuleGroups_(ss), sh = ss.getSheetByName(KSC_MAP.SHEET), NC = KSC_MAP.HDR.length, keep = {};
  if (!sh) {
    sh = ss.insertSheet(KSC_MAP.SHEET);
    try { sh.setTabColor('#3A5CAA'); } catch (e) {}
  } else if (sh.getLastRow() >= 4) {
    sh.getRange(4, 1, sh.getLastRow() - 3, NC).getValues().forEach(function (r) { var c = String(r[0] || '').trim(); if (c) keep[c] = r.slice(2 + KSC_MAP.AUTO); });
  }
  var nCol = L.H['detail kpi'], rows = [], map = {};
  Object.keys(L.rows).sort(function (a, b) { return L.rows[a] - L.rows[b]; }).forEach(function (code) {
    var a = kscAutoExplain_(ctx, code, C, P), g = RG.byCode[code], man = keep[code] || ['', '', '', '', ''];
    var grp = g ? 'Nhóm ' + g.no + ' · ' + g.title : '';
    rows.push([code, nCol == null ? '' : String(L.V[L.rows[code]][nCol]).replace(/\s+/g, ' ').trim(), a.source, a.url, a.rule, grp].concat(man));
    map[code] = { source: man[0] || a.source, url: man[1] || a.url, rule: man[2] || a.rule, template: man[3] || '', note: man[4] || '', group: g || null,
                  sourceManual: man[0] || '', urlManual: man[1] || '', ruleManual: man[2] || '' };
  });
  var grid = [[ 'KPI EXPLAIN MAP · NGUỒN, URL VÀ RULE TÍNH CỦA TỪNG MÃ KPI (dùng cho báo cáo PDF)' ].concat(new Array(NC - 1).fill('')),
              [ 'Cột C → F do code tự ghi lại (đọc từ backend và sheet 4. Rule). Cột G → K anh tự nhập: ô có nội dung sẽ được dùng THAY cho cột auto tương ứng. ' +
                'Mã mới thêm vào 3. Detail KPI tự có dòng ở đây. Mẫu diễn giải dùng {actual} {target} {pct} {unit} {period}, ví dụ: "Đi địa bàn {actual} lần, đạt {pct} mục tiêu tháng".' ].concat(new Array(NC - 1).fill('')),
              KSC_MAP.HDR.slice() ].concat(rows);
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(grid)));
  if (P.getProperty('KSC_MAP_HASH') !== hash || sh.getLastRow() < 3) {
    if (sh.getMaxColumns() < NC) sh.insertColumnsAfter(sh.getMaxColumns(), NC - sh.getMaxColumns());
    if (sh.getMaxRows() < grid.length + 2) sh.insertRowsAfter(sh.getMaxRows(), grid.length + 2 - sh.getMaxRows());
    sh.getRange(1, 1, Math.max(sh.getLastRow(), grid.length), NC).clearContent();
    sh.getRange(1, 1, grid.length, NC).setValues(grid);
    try {
      sh.getRange(1, 1).setFontWeight('bold').setFontSize(13).setFontColor('#003047');
      sh.getRange(2, 1).setFontColor('#666666').setFontStyle('italic');
      sh.getRange(3, 1, 1, 2 + KSC_MAP.AUTO).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
      sh.getRange(3, 3 + KSC_MAP.AUTO, 1, NC - 2 - KSC_MAP.AUTO).setFontWeight('bold').setBackground('#FFF8E1').setWrap(true);
      sh.setFrozenRows(3); sh.setColumnWidth(2, 300); sh.setColumnWidth(3, 240); sh.setColumnWidth(4, 220); sh.setColumnWidth(5, 380); sh.setColumnWidth(6, 200);
      sh.setColumnWidth(9, 300); sh.setColumnWidth(10, 260); sh.setColumnWidth(11, 220);
    } catch (e2) {}
    P.setProperty('KSC_MAP_HASH', hash);
  }
  return { sheet: sh, map: map, rules: RG };
}

/* ════════════════ NGUỒN 6 · ĐIỂM HÀNH VI (KBI · sheet Detail report) ════════════════
   File "Key Behavioral Indicators Report", sheet "Detail report" (tiêu đề hàng 3):
     MMH/Part · PIC · FY · Month (yyyymm) · Minus · Detail minus · Pluses · Detail pluses · Total point by month
   Điểm tháng của 1 PIC = ô "Total point by month" (công thức của file KBI: 100 + Σ Minus + Σ Pluses của PIC trong tháng).
   Ô Total còn trống (file KBI chỉ điền công thức ở dòng có điểm trừ) ⇒ code tính đúng công thức đó.
   Ghi vào mã L3-xx của PIC (cột Members involved), chỉ khi Detail report CÓ dòng của PIC trong tháng đó. */
var KSC_KBI = {
  ID      : '1yDE8NJrs70ri0m5hJVYIPf82z0rYXGMgo3rpfmWXzBg',
  SHEET   : 'Detail report',
  CODE_RE : /^L3-\d+[a-z]?$/,
  BASE    : 100,
  RULE    : 'Điểm hành vi tháng = cột "Total point by month" của sheet Detail report (100 + điểm cộng + điểm trừ của PIC trong tháng). Lý do trừ / cộng điểm lấy ở cột Detail minus / Detail pluses.'
};
function kscKbiRead_(kss) {
  var sh = kss.getSheetByName(KSC_KBI.SHEET);
  if (!sh) return { err: 'File KBI không có sheet "' + KSC_KBI.SHEET + '"' };
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 20);
  if (lr < 2) return { rows: [], sheet: sh };
  var V = sh.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
  for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (h.indexOf('pic') >= 0 && h.indexOf('month') >= 0) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
  }
  if (hr < 0) return { err: 'Sheet "' + KSC_KBI.SHEET + '" không có dòng tiêu đề (PIC, Month)' };
  function col(re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; }
  var cP = C['pic'], cM = C['month'], cMi = col(/^minus/), cDm = col(/^detail minus/), cPl = col(/^plus/), cDp = col(/^detail plus/), cT = col(/^total point/), cPart = col(/^mmh/);
  var rows = [];
  for (var r = hr + 1; r < lr; r++) {
    var x = V[r], pic = String(x[cP] || '').trim(), ym = kscYm_(null, x[cM]);
    if (!pic || !ym) continue;
    rows.push({ row: r + 1, pic: pic, key: kscNorm_(pic), ym: ym, part: cPart == null ? '' : String(x[cPart] || '').trim(),
      minus: cMi == null ? null : kscNum_(x[cMi]), dMinus: cDm == null ? '' : String(x[cDm] || '').trim(),
      plus: cPl == null ? null : kscNum_(x[cPl]), dPlus: cDp == null ? '' : String(x[cDp] || '').trim(),
      total: cT == null ? null : kscNum_(x[cT]) });
  }
  return { rows: rows, sheet: sh };
}
/* điểm 1 PIC · 1 tháng: null nếu Detail report không có dòng nào */
function kscKbiScore_(rows, key, ym) {
  var hit = rows.filter(function (x) { return x.key === key && x.ym === ym; });
  if (!hit.length) return null;
  var tot = null, sum = 0, minus = [], plus = [];
  hit.forEach(function (x) {
    if (tot == null && x.total != null) tot = x.total;
    sum += (x.minus || 0) + (x.plus || 0);
    if (x.minus || x.dMinus) minus.push({ v: x.minus, t: x.dMinus });
    if (x.plus || x.dPlus) plus.push({ v: x.plus, t: x.dPlus });
  });
  return { score: tot != null ? tot : KSC_KBI.BASE + sum, fromTotal: tot != null, minus: minus, plus: plus, rows: hit.length };
}
function kscKbiTargets_(L) {
  var mCol = L.H['members involved'], out = [];
  Object.keys(L.rows).forEach(function (code) {
    if (!KSC_KBI.CODE_RE.test(code)) return;
    var r = L.rows[code], mem = kscMembersOf_(mCol == null ? '' : L.V[r][mCol]);
    if (mem.length !== 1) return;                                    // dòng tổng L3-00 (nhiều người / "-") bỏ qua
    if (L.months.some(function (m) { return kscKind_(L.F[r][L.aCol[m]]) === 'calc'; })) return;
    out.push({ code: code, pic: mem[0], key: kscNorm_(mem[0]) });
  });
  return out;
}
function kscKbi_(ctx, why) {
  var kss = SpreadsheetApp.openById(KSC_KBI.ID), L = ctx.L;
  var out = { title: kscLabel_('kbi'), file: kss.getName(), sheet: KSC_KBI.SHEET, rules: {}, codeUrls: {} };
  var K = kscKbiRead_(kss);
  if (K.err) { out.status = 'error'; out.msg = K.err; return out; }
  try { out.url = kscUrl_(kss, K.sheet); } catch (eu) {}
  var targets = kscKbiTargets_(L), data = {}, noRow = [];
  targets.forEach(function (t) {
    data[t.code] = {};
    var any = false;
    L.months.forEach(function (m) {
      if (m > ctx.curYm) return;
      var s = kscKbiScore_(K.rows, t.key, m);
      if (s) { data[t.code][m] = s.score; any = true; }
    });
    if (!any) noRow.push(t.code + ' ' + t.pic);
    out.rules[t.code] = KSC_KBI.RULE;
  });
  out.codes = targets.map(function (t) { return t.code; });
  var st = kscWrite_(ctx, 'kbi', data, { why: why });
  var nMinus = K.rows.filter(function (x) { return L.months.indexOf(x.ym) >= 0 && x.ym <= ctx.curYm && (x.minus || x.dMinus); }).length;
  return kscResult_(out, st, K.rows.length + ' dòng Detail report · ' + targets.length + ' mã L3 · ' + nMinus + ' dòng có điểm trừ trong ' + L.fy +
    (noRow.length ? ' · chưa có dòng trong Detail report: ' + noRow.join(', ') : ''));
}

/* ════════════════ DỮ LIỆU GỐC CỦA CRM CHO BÁO CÁO PDF ════════════════
   Đọc đúng các cột mà công thức tab KPI của CRM dùng (cột A = 1, dữ liệu từ hàng 4):
   · 6. WEEKLY REPORT (VN) / 6. CUSTOMER VISITING (Thái): E Start date · G Sales PIC · H Account · I Account type ·
     N Type action · R Task Status · V Photo link
   · 3. SALE ORDER: F Month · G Day · I Account type · J Account name · Q MMH sales PIC · R Detail product ·
     S Product type · T Quantity · V Amount (VND) · W Partner
   · 7. PRODUCT PRESENTATION: C Account · D MMH sales PIC · H Month · I Day · M Actual participant
   · 1. CUSTOMER CODE: C Account name · D Account type · H MMH sales PIC · K Tháng mở (auto) */
var KSC_CRMEV = {
  WEEKLY  : ['6. WEEKLY REPORT', '6. CUSTOMER VISITING'],
  ORDER   : '3. SALE ORDER',
  PRESENT : '7. PRODUCT PRESENTATION',
  CUSTOMER: '1. CUSTOMER CODE',
  ROW0    : 4,
  WK: { start: 5, pic: 7, account: 8, atype: 9, action: 14, status: 18, photo: 22 },
  OD: { month: 6, day: 7, atype: 9, account: 10, pic: 17, detail: 18, ptype: 19, qty: 20, amount: 22, partner: 23 },
  PR: { account: 3, pic: 4, month: 8, day: 9, actual: 13 },
  CU: { name: 3, atype: 4, pic: 8, month: 11 }
};
function kscCrmEvOpen_(ctx, team) {
  var link = null; kscLinks_(ctx.ss).forEach(function (l) { if (l.team === team) link = l; });
  if (!link || !link.id) return { err: 'chưa có link file CRM ' + team };
  var css = SpreadsheetApp.openById(link.id), kt = kscCrmTab_(css, link);
  var o = { team: team, ss: css, file: css.getName(), meta: {}, set: {}, cache: {}, urls: {} };
  if (kt) {
    o.urls.kpi = kscUrl_(css, kt);
    var v = kt.getRange(1, 1, kt.getLastRow(), 5).getValues();
    v.forEach(function (r) {
      var tg = String(r[0] || '').trim();
      if (/^kpi:/.test(tg)) o.meta[String(r[1] || '').trim()] = { key: tg.slice(4), pic: String(r[2] || '').trim() };
      else if (/^set:/.test(tg)) { var k = tg.slice(4); o.set[k] = r[3]; o.set[k + '2'] = r[4]; }
    });
  }
  o.tab = function (name) {
    if (o.cache[name] !== undefined) return o.cache[name];
    var names = [].concat(name), s = null;
    names.forEach(function (n) { if (!s) s = css.getSheetByName(n); });
    if (!s || s.getLastRow() < KSC_CRMEV.ROW0) { o.cache[name] = null; return null; }
    o.urls[names[0]] = kscUrl_(css, s);
    o.cache[name] = { name: s.getName(), url: kscUrl_(css, s), V: s.getRange(KSC_CRMEV.ROW0, 1, s.getLastRow() - KSC_CRMEV.ROW0 + 1, Math.min(s.getLastColumn(), 30)).getValues() };
    return o.cache[name];
  };
  return o;
}
/* tab KPI của CRM: tên ở _CRM_LINKS, tên mới / cũ, hoặc tab có nhãn k68 ở A1 */
function kscCrmTab_(css, link) {
  var names = [link && link.tab, KSC.CRM_TAB[link && link.team]].concat(KSC.CRM_TAB_OLD), sh = null;
  names.forEach(function (n) { if (!sh && n) sh = css.getSheetByName(n); });
  if (!sh) css.getSheets().forEach(function (s) { if (!sh && /^k68/i.test(String(s.getRange(1, 1).getValue()))) sh = s; });
  return sh;
}
function kscCell_(r, c) { var v = r[c - 1]; return v === undefined || v === null ? '' : v; }
function kscCrmVisits_(o, key, pic, eff) {
  var T = o.tab(KSC_CRMEV.WEEKLY); if (!T) return null;
  var W = KSC_CRMEV.WK, p = kscNorm_(pic), today = new Date(), photo = /^(yes|co)$/.test(kscNorm_(o.set.photo)), out = [];
  T.V.forEach(function (r) {
    var d = kscCell_(r, W.start); if (!kscIsDate_(d) || d > today) return;
    var ym = kscYm_(d); if (eff.indexOf(ym) < 0) return;
    if (kscNorm_(kscCell_(r, W.pic)) !== p || kscNorm_(kscCell_(r, W.action)) !== 'visiting') return;
    var st = kscNorm_(kscCell_(r, W.status)); if (st === 'not started' || /^cancel/.test(st)) return;
    var at = String(kscCell_(r, W.atype)).trim();
    if (key === 'visit_dealer' && kscNorm_(at) !== 'dealer') return;
    if (key === 'visit_other' && kscNorm_(at) === 'dealer') return;
    if (photo && !String(kscCell_(r, W.photo)).trim()) return;
    out.push({ ym: ym, date: d, account: String(kscCell_(r, W.account)).trim(), atype: at });
  });
  return { list: out, url: T.url, sheet: T.name };
}
function kscCrmOrders_(o, key, pic, eff) {
  var T = o.tab(KSC_CRMEV.ORDER); if (!T) return null;
  var D = KSC_CRMEV.OD, p = kscNorm_(pic), out = [];
  var kw = key === 'supp_comp' ? [o.set.comp, o.set.comp2] : key === 'supp_jizai' ? [o.set.jz, o.set.jz2] : null;
  if (kw) kw = kw.map(kscNorm_).filter(function (x) { return x; });
  T.V.forEach(function (r) {
    var ym = kscYm_(null, kscCell_(r, D.month)); if (eff.indexOf(ym) < 0) return;
    if (kscNorm_(kscCell_(r, D.pic)).indexOf(p) < 0) return;
    var txt = kscNorm_(kscCell_(r, D.detail) + ' ' + kscCell_(r, D.ptype));
    if (kw && !kw.some(function (k) { return txt.indexOf(k) >= 0; })) return;
    out.push({ ym: ym, account: String(kscCell_(r, D.account)).trim(), atype: String(kscCell_(r, D.atype)).trim(),
      product: String(kscCell_(r, D.detail)).trim() || String(kscCell_(r, D.ptype)).trim(),
      qty: kscNum_(kscCell_(r, D.qty)) || 0, amount: kscNum_(kscCell_(r, D.amount)) || 0, partner: String(kscCell_(r, D.partner)).trim() });
  });
  return { list: out, url: T.url, sheet: T.name, rate: kscNum_(o.set.rate) };
}
function kscCrmPresent_(o, pic, eff) {
  var T = o.tab(KSC_CRMEV.PRESENT); if (!T) return null;
  var R = KSC_CRMEV.PR, p = kscNorm_(pic), out = [];
  T.V.forEach(function (r) {
    var ym = kscYm_(null, kscCell_(r, R.month)); if (eff.indexOf(ym) < 0) return;
    if (pic && kscNorm_(kscCell_(r, R.pic)) !== p) return;
    var day = kscCell_(r, R.day);
    out.push({ ym: ym, day: kscIsDate_(day) ? Utilities.formatDate(day, KSC.TZ, 'dd/MM') : (kscNum_(day) ? kscPad2_(kscNum_(day)) + '/' + String(ym).slice(4) : ''),
      account: String(kscCell_(r, R.account)).trim(), people: kscNum_(kscCell_(r, R.actual)) });
  });
  return { list: out, url: T.url, sheet: T.name };
}
function kscCrmNewAcct_(o, key, pic, eff) {
  var T = o.tab(KSC_CRMEV.CUSTOMER); if (!T) return null;
  var U = KSC_CRMEV.CU, p = kscNorm_(pic), out = [];
  T.V.forEach(function (r) {
    var ym = kscYm_(null, kscCell_(r, U.month)); if (eff.indexOf(ym) < 0) return;
    if (kscNorm_(kscCell_(r, U.pic)) !== p) return;
    var at = String(kscCell_(r, U.atype)).trim();
    if (key === 'newacct_dealer' && kscNorm_(at) !== 'dealer') return;
    out.push({ ym: ym, account: String(kscCell_(r, U.name)).trim(), atype: at });
  });
  return { list: out, url: T.url, sheet: T.name };
}

/* ════════════════ BÁO CÁO GIẢI THÍCH KPI (PDF) ════════════════
   Menu ⚡ KPI Sync ▸ 📄 Báo cáo giải thích KPI (PDF): chọn Tháng / Quý / Cả năm và 1 PIC hoặc tất cả.
   Mỗi KPI: Target, Actual, % đạt + vài câu giải thích từ dữ liệu gốc (buổi đào tạo cho ai / nội dung / ngày,
   đi địa bàn gặp nhóm khách nào, đơn hàng hỗ trợ bán, lý do trừ điểm hành vi…), cách tính ngắn gọn và
   hyperlink tới đúng file ▸ sheet nguồn. File PDF lưu vào folder "KPI PDF" cạnh file KPI và tải về máy ngay.
   Nguồn / URL / cách tính / mẫu câu có thể sửa tay ở sheet KPI EXPLAIN MAP (cột G → K). */
var KSC_REPORT = { FOLDER: 'KPI PDF', CAP: 1.3, TOP: 6 };

function kscOpenReport() {
  var html = HtmlService.createHtmlOutput(KSC_REPORT_HTML).setWidth(560).setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Báo cáo giải thích KPI (PDF)');
}
function kscReportOptions() {
  var ss = SpreadsheetApp.getActive(), L = kscLayout_(ss.getSheetByName(KSC.DETAIL));
  var cur = Number(Utilities.formatDate(new Date(), KSC.TZ, 'yyyyMM'));
  return { months: L.months, cur: cur, fy: L.fy, quarters: kscQuarters_(L.months), pics: kscReportPics_(ss, L) };
}
function kscQuarters_(months) { var q = []; for (var i = 0; i < months.length; i += 3) q.push({ id: 'Q' + (i / 3 + 1), months: months.slice(i, i + 3) }); return q; }
function kscMembersOf_(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^-/.test(x); }); }
function kscReportPics_(ss, L) {
  var mCol = L.H['members involved'], seen = {}, out = [];
  Object.keys(L.rows).forEach(function (c) { kscMembersOf_(mCol == null ? '' : L.V[L.rows[c]][mCol]).forEach(function (p) { seen[p] = 1; }); });
  var st = ss.getSheetByName('0. Staff List');
  if (st && st.getLastRow() >= 5) st.getRange(5, 3, st.getLastRow() - 4, 1).getValues().forEach(function (r) { var p = String(r[0] || '').trim(); if (p && seen[p] && out.indexOf(p) < 0) out.push(p); });
  Object.keys(seen).forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
  return out;
}

/* opt = { period: 'month' | 'quarter' | 'fy', value: '202609' | 'Q1' | 'FY68', pic: '*' | 'Giang' } */
function kscMakeReport(opt) {
  var ss = SpreadsheetApp.getActive(), ctx = kscCtx_(ss), L = ctx.L;
  var months = opt.period === 'month' ? [Number(opt.value)] :
               opt.period === 'quarter' ? ((kscQuarters_(L.months).filter(function (q) { return q.id === opt.value; })[0] || {}).months || []) : L.months.slice();
  var eff = months.filter(function (m) { return m <= ctx.curYm; });
  if (!eff.length) return { ok: false, error: 'Kỳ đã chọn chưa tới, chưa có số liệu.' };
  var label = opt.period === 'month' ? 'Tháng ' + kscMon_(months[0]) :
              opt.period === 'quarter' ? opt.value + ' ' + L.fy + ' (' + kscMon_(months[0]) + ' đến ' + kscMon_(months[months.length - 1]) + ')' : 'Cả năm ' + L.fy;
  var R = { eff: eff, word: opt.period === 'month' ? 'tháng' : opt.period === 'quarter' ? 'quý' : 'năm', label: label, period: opt.period, value: opt.value, cur: ctx.curYm,
            key: opt.period === 'month' ? String(months[0]) : opt.period === 'quarter' ? String(opt.value) : String(L.fy).toUpperCase() };
  var M5 = kscMemberKpi_(ss);
  var col = { n: L.H['detail kpi'], u: L.H['unit'], a: L.H['agg'], m: L.H['members involved'] };
  var M = kscWriteExplainMap_(ss, ctx);
  var codes = Object.keys(L.rows).sort(function (a, b) { return L.rows[a] - L.rows[b]; });
  var pics = opt.pic === '*' ? kscReportPics_(ss, L) : [opt.pic];
  var E = kscEvidence_(ctx, eff), srcs = {}, sections = [];
  function item(c, p) {
    var mr = p && M5.members[p] && M5.members[p].rows[c];
    return kscReportItem_(ctx, c, R, E, M, col, srcs, mr ? (mr.v[R.key] || {}) : null);
  }
  pics.forEach(function (p) {
    var list = codes.filter(function (c) { return kscMembersOf_(col.m == null ? '' : L.V[L.rows[c]][col.m]).indexOf(p) >= 0; });
    if (list.length) sections.push({ title: p, totals: kscTotalsFor_(L, R, M5, p), items: list.map(function (c) { return item(c, p); }) });
  });
  if (opt.pic === '*') {
    var rest = codes.filter(function (c) { return !kscMembersOf_(col.m == null ? '' : L.V[L.rows[c]][col.m]).length; });
    if (rest.length) sections.push({ title: 'KPI tổng (không gắn PIC)', totals: [], items: rest.map(function (c) { return item(c, null); }) });
  }
  var html = kscReportHtml_(R, opt.pic === '*' ? 'Tất cả nhân sự' : opt.pic, sections, L.fy, M.rules, ss, srcs);
  var name = Utilities.formatDate(new Date(), KSC.TZ, 'yyyyMMdd') + '_MMH_KPI_' + L.fy + '_' + (opt.period === 'month' ? months[0] : opt.period === 'quarter' ? opt.value : 'FY') + '_' +
             (opt.pic === '*' ? 'All' : String(opt.pic).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '')) + '.pdf';
  var pdf = Utilities.newBlob(html, 'text/html', 'report.html').getAs('application/pdf').setName(name), url = '';
  try {
    var parent = null; try { parent = DriveApp.getFileById(ss.getId()).getParents().next(); } catch (e) { parent = DriveApp.getRootFolder(); }
    var it = parent.getFoldersByName(KSC_REPORT.FOLDER), folder = it.hasNext() ? it.next() : parent.createFolder(KSC_REPORT.FOLDER);
    url = folder.createFile(pdf).getUrl();
  } catch (e2) { url = ''; }
  return { ok: true, name: name, url: url, b64: Utilities.base64Encode(pdf.getBytes()), sections: sections.length };
}

/* ── giá trị 1 mã trong kỳ theo Agg (SUM / LAST / AVG) ── */
function kscPeriodVal_(L, r, eff, agg, kind) {
  var vals = eff.map(function (m) {
    var c = kind === 't' ? L.tCol[m] : L.aCol[m]; if (c == null) return null;
    if (kind === 'a' && kscKind_(L.F[r][c]) === 'placeholder') return null;
    return kscNum_(L.V[r][c]);
  }).filter(function (v) { return v != null; });
  if (!vals.length) return null;
  agg = String(agg || '').toUpperCase();
  if (agg === 'LAST') return vals[vals.length - 1];
  var s = vals.reduce(function (a, b) { return a + b; }, 0);
  return agg === 'AVG' ? s / vals.length : s;
}
function kscReportItem_(ctx, code, R, E, M, col, srcs, off) {
  var L = ctx.L, r = L.rows[code], eff = R.eff, agg = col.a == null ? '' : String(L.V[r][col.a]), unit = col.u == null ? '' : String(L.V[r][col.u]).trim();
  var t = kscPeriodVal_(L, r, eff, agg, 't'), a = kscPeriodVal_(L, r, eff, agg, 'a'), lastA = null;
  if (/^last$/i.test(agg) && a != null) {      /* số lũy kế: so với target của chính tháng có Actual cuối cùng */
    lastA = eff.filter(function (m) { return kscPeriodVal_(L, r, [m], 'LAST', 'a') != null; }).pop();
    if (lastA) t = kscPeriodVal_(L, r, [lastA], 'LAST', 't');
  }
  var pct = (t && a != null) ? a / t : (t === 0 && eff.length ? 1 : null);   // Target = 0 ⇒ đạt 100%
  if (pct != null && !/^F/.test(code)) pct = Math.min(pct, KSC_REPORT.CAP);
  var calc = eff.some(function (m) { return kscKind_(L.F[r][L.aCol[m]]) === 'calc'; }), x = M.map[code] || {};
  var members = kscMembersOf_(col.m == null ? '' : L.V[r][col.m]), cum = a, temp = false, w = null, pw = null;
  if (off) {                                 /* số chính thức của sheet 5. Member KPI Monthly */
    temp = a == null && off.a != null && !calc;                     // Actual ở 3. Detail KPI còn là công thức tạm (=Target)
    t = off.t; a = off.a; pct = off.p; w = off.w; pw = off.pw;
  }
  var X = { code: code, t: t, a: a, pct: pct, unit: unit, agg: agg, calc: calc, lastA: lastA, members: members, url: '', sheet: '', label: '', cum: cum };
  var lines = kscExplain_(ctx, X, R, E);
  if (x.template) {
    lines[0] = String(x.template).replace(/\{actual\}/g, a == null ? '(chưa có)' : kscFmtVal_(a, unit)).replace(/\{target\}/g, t == null ? '(chưa có)' : kscFmtVal_(t, unit))
      .replace(/\{pct\}/g, pct == null ? '(chưa tính được)' : kscFmtPct_(pct)).replace(/\{unit\}/g, unit).replace(/\{period\}/g, R.label);
  }
  if (x.note) lines.push(x.note);
  if (temp) lines.push('Lưu ý: ô Actual ở 3. Detail KPI vẫn là công thức tạm lấy bằng Target, chưa có số thực hiện (sheet 5 đang tính theo số này).');
  /* nguồn: cột sửa tay của KPI EXPLAIN MAP > sheet dữ liệu gốc vừa đọc > nguồn của lần đồng bộ */
  var url = x.urlManual || X.url || x.url || '', src = x.sourceManual || (X.label ? X.label + (X.sheet ? ' ▸ ' + X.sheet : '') : kscShortSrc_(x.source));
  if (src) { var k = src.split(' ▸ ')[0]; if (!srcs[k] || (!srcs[k].url && url)) srcs[k] = { url: url || (srcs[k] && srcs[k].url) || '', sheets: (srcs[k] && srcs[k].sheets) || [] }; var sh0 = src.split(' ▸ ')[1]; if (sh0 && srcs[k].sheets.indexOf(sh0) < 0) srcs[k].sheets.push(sh0); }
  return { code: code, name: kscCleanName_(col.n == null ? '' : L.V[r][col.n]), unit: unit, agg: agg, target: t, actual: a, pct: pct, w: w, pw: pw, temp: temp,
           source: src, url: url, rule: x.ruleManual || kscPlainRule_(code, X, E) || x.rule || '', lines: lines };
}
function kscCleanName_(s) { return String(s || '').replace(/\s+/g, ' ').replace(/\s*[\u2013\u2014]\s*/g, ' · ').trim(); }
function kscShortSrc_(s) { return String(s || '').replace(/^Chưa có nguồn tự động.*/, '').replace(/\s*·\s*[^▸]*▸/, ' ▸'); }
function kscMon_(ym) { return String(ym).slice(4) + '/' + String(ym).slice(0, 4); }

/* ── dữ liệu gốc cho phần giải thích (chỉ đọc khi cần, đọc 1 lần cho cả báo cáo) ── */
function kscEvidence_(ctx, eff) {
  var E = { months: eff, crm: {} };
  E.info = function (src) { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('KSC_SRCINFO_' + src) || '{}'); } catch (e) { return {}; } };
  E.codes = function () { if (!E._c) { try { E._c = JSON.parse(PropertiesService.getScriptProperties().getProperty('KSC_CODES') || '{}'); } catch (e) { E._c = {}; } } return E._c; };
  E.train = function () {
    if (!E._tr) { try { var tss = SpreadsheetApp.openById(KSC.TRAINING_ID); E._tr = { S: kscTrainSessions_(tss, kscTrainPeople_(tss)), T: kscTrainTargets_(ctx.L), file: tss.getName() }; var s = tss.getSheetByName(E._tr.S.sheets[E._tr.S.sheets.length - 1]); E._tr.url = s ? kscUrl_(tss, s) : ''; } catch (e) { E._tr = { err: String(e) }; } }
    return E._tr;
  };
  E.mkt = function () {
    if (!E._mk) { try { var mss = SpreadsheetApp.openById(KSC.MKT_ID); E._mk = kscMktCollect_(mss, eff); E._mk.ss = mss; E._mk.file = mss.getName(); } catch (e) { E._mk = { err: String(e) }; } }
    return E._mk;
  };
  E.kbi = function () {
    if (!E._kb) { try { var kss = SpreadsheetApp.openById(KSC_KBI.ID); E._kb = kscKbiRead_(kss); E._kb.file = kss.getName(); if (E._kb.sheet) E._kb.url = kscUrl_(kss, E._kb.sheet); } catch (e) { E._kb = { err: String(e) }; } }
    return E._kb;
  };
  E.moff = function () {
    if (!E._mo) { try { var mss = SpreadsheetApp.openById(kscMoffId_()); E._mo = kscMoffRead_(mss); if (E._mo.sheet) E._mo.url = kscUrl_(mss, E._mo.sheet); } catch (e) { E._mo = { err: String(e) }; } }
    return E._mo;
  };
  E.crmOf = function (team) {
    if (!E.crm[team]) { try { E.crm[team] = kscCrmEvOpen_(ctx, team); } catch (e) { E.crm[team] = { err: String(e) }; } }
    return E.crm[team];
  };
  E.turn = function () {
    if (!E._tv) {
      try {
        var tss = SpreadsheetApp.openById(KSC.TURNOVER_ID), sh = tss.getSheetByName(KSC.TURNOVER_SUM), V = sh.getRange(1, 1, sh.getLastRow(), Math.min(sh.getLastColumn(), 30)).getValues(), hr = -1, Cc = {};
        for (var i = 0; i < 10 && hr < 0; i++) { var h = V[i].map(kscNorm_); if (h.indexOf('type') >= 0 && h.indexOf('month') >= 0) { hr = i; h.forEach(function (x, k) { if (x && Cc[x] == null) Cc[x] = k; }); } }
        var col = function (re) { var k = null; Object.keys(Cc).forEach(function (x) { if (k == null && re.test(x)) k = Cc[x]; }); return k; };
        var cS = col(/^segment report/), cA = col(/^actual usd/), rows = [];
        for (var r = hr + 1; r < V.length; r++) {
          var m = Number(String(V[r][Cc['month']]).replace(/\.0+$/, '')) || 0; if (!m) continue;
          rows.push({ t: kscNorm_(V[r][Cc['type']]), m: m, s: kscNorm_(V[r][cS]), d: kscNorm_(V[r][Cc['distributor']]), dRaw: String(V[r][Cc['distributor']] || '').trim(),
                      c: kscNorm_(V[r][Cc['country']]), p: kscNorm_(V[r][Cc['products']]), pRaw: String(V[r][Cc['products']] || '').trim(), a: Number(V[r][cA]) || 0 });
        }
        E._tv = { rows: rows, file: tss.getName(), url: kscUrl_(tss, sh) };
      } catch (e) { E._tv = { err: String(e) }; }
    }
    return E._tv;
  };
  return E;
}

/* ── câu giải thích theo nhóm KPI (ngắn, theo ngôn ngữ thường ngày) ── */
function kscExplain_(ctx, X, R, E) {
  var code = X.code, eff = R.eff, out = [], A = X.a == null ? null : kscFmtVal_(X.a, X.unit);
  var reach = X.pct == null || !X.a ? '' : ', đạt ' + kscFmtPct_(X.pct) + ' mục tiêu ' + (/^last$/i.test(X.agg) && R.period !== 'quarter' ? 'lũy kế' : R.word);
  var inEff = function (m) { return eff.indexOf(m) >= 0; };
  var many = eff.length > 1;
  var src = (E.codes()[code] || {}).src || '';

  /* đào tạo (Training Master) */
  if (/^L1-00$|^L2-\d|^C10-06$/.test(code)) {
    var tr = E.train(); X.label = 'Training Master'; X.url = tr.url || ''; X.sheet = (tr.S && tr.S.sheets.slice(-1)[0]) || '';
    if (tr.err) return ['Chưa đọc được Training Master (' + tr.err + ').'];
    var tg = tr.T.filter(function (x) { return x.code === code; })[0];
    if (!tg) return [A != null ? 'Thực hiện ' + A + ' buổi' + reach + '.' : 'Chưa có số trong kỳ.'];
    var done = tr.S.list.filter(function (s) { return inEff(s.ym) && kscTrainMatch_(s, tg); });
    var plan = tr.S.list.filter(function (s) { return inEff(s.ym) && !s.done && !/cancel/i.test(s.status) && kscTrainMatch_({ done: true, ym: s.ym, type: s.type, catKey: s.catKey, trainerKey: s.trainerKey }, tg); });
    out.push((done.length ? 'Đào tạo ' + done.length + ' buổi' : 'Chưa có buổi đào tạo nào hoàn thành') + reach + (done.length ? ':' : '.'));
    done.forEach(function (s) {
      out.push('• ' + (s.date || kscMon_(s.ym)) + ': "' + (s.topic || 'chưa ghi chủ đề') + '"' + (s.audience ? ' cho ' + s.audience : '') + (tg.trainerKey === '*' && s.trainer ? ', trainer ' + s.trainer : ''));
    });
    if (plan.length) out.push('Còn ' + plan.length + ' buổi trong kế hoạch chưa hoàn thành: ' + plan.map(function (s) { return '"' + s.topic + '" (' + (s.status || 'chưa có trạng thái') + ')'; }).join(', ') + '.');
    return out;
  }

  /* điểm hành vi (KBI) */
  if (KSC_KBI.CODE_RE.test(code) && !X.calc) {
    var K = E.kbi(); X.label = 'KBI Report'; X.url = K.url || ''; X.sheet = KSC_KBI.SHEET;
    if (K.err) return ['Chưa đọc được file KBI (' + K.err + ').'];
    var pic = X.members[0] || '', key = kscNorm_(pic), perM = eff.map(function (m) { return { m: m, s: kscKbiScore_(K.rows, key, m) }; }).filter(function (z) { return z.s; });
    if (!perM.length) return ['Sheet Detail report chưa có dòng nào của ' + pic + ' trong kỳ.'];
    var why = function (s) {
      var sm = s.minus.reduce(function (t, x) { return t + Math.abs(x.v || 0); }, 0), sp = s.plus.reduce(function (t, x) { return t + Math.abs(x.v || 0); }, 0);
      var a = s.minus.map(function (x) { return x.t || 'không ghi lý do'; }), b = s.plus.map(function (x) { return x.t || 'không ghi lý do'; });
      return (a.length ? 'bị trừ ' + kscFmtNum_(sm) + ' điểm: ' + a.join('; ') : 'không bị trừ điểm') + (b.length ? '; được cộng ' + kscFmtNum_(sp) + ' điểm: ' + b.join('; ') : '');
    };
    if (!many || perM.length === 1) {
      var s0 = perM[0].s;
      out.push('Điểm hành vi ' + (many ? kscMon_(perM[0].m) + ' ' : '') + kscFmtNum_(s0.score) + '/' + KSC_KBI.BASE + reach + ', ' + why(s0) + '.');
    } else {
      out.push('Điểm hành vi ' + (A != null ? A : '') + (/^avg$/i.test(X.agg) ? ' (trung bình các tháng)' : '') + reach + ':');
      perM.forEach(function (z) { out.push('• ' + kscMon_(z.m) + ': ' + kscFmtNum_(z.s.score) + ' điểm, ' + why(z.s)); });
    }
    return out;
  }

  /* MKT online & Design */
  var KM = KSC_MKT.CODES;
  if ([KM.mirEvent, KM.mirProduct, KM.postOnTime, KM.content, KM.designOnTime, KM.score].indexOf(code) >= 0) {
    var MX = E.mkt(); X.label = 'Digital Marketing & Design';
    if (MX.err) return ['Chưa đọc được file Digital Marketing & Design (' + MX.err + ').'];
    var setSh = function (n) { X.sheet = n; try { X.url = kscUrl_(MX.ss, MX.ss.getSheetByName(n)); } catch (e) {} };
    if (code === KM.mirEvent || code === KM.mirProduct) {
      setSh(KSC_MKT.ADS);
      var ty = code === KM.mirEvent ? 'event' : 'product', re = 0, ib = 0;
      eff.forEach(function (m) { var z = MX.ads[ty + '|' + m]; if (z) { re += z.reach; ib += z.inbox; } });
      return re ? ['Quảng cáo ' + (ty === 'event' ? 'sự kiện' : 'sản phẩm') + ' tiếp cận ' + kscFmtNum_(re) + ' người, nhận ' + kscFmtNum_(ib) + ' tin nhắn, tỷ lệ ' + kscFmtPct_(ib / re, 2) + reach + '.']
                : ['Không chạy quảng cáo ' + (ty === 'event' ? 'sự kiện' : 'sản phẩm') + ' trong kỳ.'];
    }
    if (code === KM.content) {
      setSh(KSC_MKT.POSTS[0].sheet);
      var ls = MX.linkList.filter(function (z) { return inEff(z.m); });
      var nL = ls.reduce(function (s, z) { return s + (z.n || 1); }, 0);
      out.push((ls.length ? nL + ' link bài đăng trên Facebook / Zalo OA (' + ls.length + ' dòng có link report)' : 'Chưa có bài đăng nào có link report') + reach + (ls.length ? ':' : '.'));
      kscGroup_(ls.map(function (z) { return z.title + (z.ctype ? ' (' + z.ctype + ')' : ''); })).slice(0, 10).forEach(function (g) { out.push('• ' + (g.n > 1 ? g.n + ' bài về ' : '1 bài về ') + g.k); });
      return out;
    }
    if (code === KM.postOnTime) {
      setSh(KSC_MKT.POSTS[0].sheet);
      var pl = MX.postList.filter(function (z) { return inEff(z.m); }), ok = pl.filter(function (z) { return z.onTime; });
      out.push(ok.length + '/' + pl.length + ' bài đăng đúng hạn' + reach + '.');
      var late = pl.filter(function (z) { return !z.onTime; });
      if (late.length) out.push('Chưa đúng hạn hoặc chưa đăng: ' + kscGroup_(late.map(function (z) { return z.title; })).slice(0, 8).map(function (g) { return g.k + (g.n > 1 ? ' (' + g.n + ' bài)' : ''); }).join(', ') + (late.length > 8 ? '…' : '') + '.');
      return out;
    }
    setSh(KSC_MKT.ORDER);
    var dl = MX.designList.filter(function (z) { return inEff(z.m); });
    if (code === KM.designOnTime) {
      var rq = dl.filter(function (z) { return z.counted; }), okd = rq.filter(function (z) { return z.onTime; });
      out.push(okd.length + '/' + rq.length + ' yêu cầu thiết kế có Check deadline report = On time' + reach + '.');
      var miss = rq.filter(function (z) { return !z.onTime; });
      if (miss.length) out.push('Chưa On time: ' + miss.slice(0, 8).map(function (z) { return z.task + (z.type ? ' (' + z.type + ')' : '') + (z.check ? ': ' + z.check : ': chưa ghi'); }).join(', ') + (miss.length > 8 ? '…' : '') + '.');
      return out;
    }
    if (code === KM.score) {
      var dn = dl.filter(function (z) { return z.done; }), by = {};
      dn.forEach(function (z) { var k = z.type || 'chưa ghi dạng ấn phẩm'; by[k] = by[k] || { n: 0, q: 0, p: 0 }; by[k].n++; by[k].q += z.qty; by[k].p += z.pts; });
      out.push(kscFmtNum_(dn.reduce(function (s, z) { return s + z.pts; }, 0)) + ' điểm từ ' + dn.length + ' yêu cầu thiết kế trong tháng' + reach + (dn.length ? ':' : '.'));
      Object.keys(by).sort(function (p, q) { return by[q].p - by[p].p; }).forEach(function (k) { out.push('• ' + k + ': ' + kscFmtNum_(by[k].q) + ' sản phẩm, ' + kscFmtNum_(by[k].p) + ' điểm'); });
      return out;
    }
  }

  /* MKT offline Việt Nam (sự kiện) */
  var KO = KSC_MOFF.CODES;
  if (!X.calc && [KO.comp, KO.jz, KO.evD, KO.evS, KO.ppD, KO.ppS].indexOf(code) >= 0) return kscMoffExplain_(code, X, R, E, reach, A);

  /* dòng tổng: cộng / trung bình các mã con */
  if (X.calc) {
    var L = ctx.L, pc = L.H['parent'], kids = Object.keys(L.rows).filter(function (k) { return pc != null && String(L.V[L.rows[k]][pc]).trim() === code; });
    X.label = 'File KPI'; X.sheet = KSC.DETAIL; X.url = kscUrl_(ctx.ss, ctx.sh);
    var avg = eff.some(function (m) { return /AVERAGEIF/i.test(L.F[L.rows[code]][L.aCol[m]]); });
    var kv = kids.map(function (k) { var v = kscPeriodVal_(L, L.rows[k], eff, X.agg, 'a'); return k + (v == null ? ' (chưa có)' : ' ' + kscFmtVal_(v, X.unit)); });
    return [(avg ? 'Trung bình' : 'Tổng') + ' của ' + kids.length + ' KPI con' + (A != null ? ' = ' + A + ' ' + X.unit : '') + reach + '.'].concat(kids.length ? [kv.join(' · ')] : []);
  }

  /* doanh số NPP (SUM TURNOVER) */
  if (/^F/.test(code)) {
    var f = KSC_TURNOVER.filter(function (z) { return z.code === code; })[0], tv = E.turn();
    X.label = 'Turnover Report'; X.sheet = KSC.TURNOVER_SUM; X.url = tv.url || '';
    if (!f) return [A != null ? 'Doanh số lũy kế ' + A + ' ' + X.unit + reach + '.' : 'Chưa có số trong kỳ.'];
    if (tv.err) return ['Chưa đọc được SUM TURNOVER (' + tv.err + ').'];
    var tName = f.type || (tv.rows.filter(function (z) { return f.typeRe.test(z.t); })[0] || {}).t;
    if (!tName) return ['SUM TURNOVER chưa có dòng Type cho mã này.'];
    var hit = tv.rows.filter(function (z) { return z.t === tName && inEff(z.m) && (!f.seg || f.seg.indexOf(z.s) >= 0) && (!f.dist || f.dist.indexOf(z.d) >= 0) && (!f.country || f.country.indexOf(z.c) >= 0) && (!f.prod || f.prod.indexOf(z.p) >= 0); });
    var byP = (f.dist && f.dist.length === 1) || f.prod, by2 = {}, tot = 0;
    hit.forEach(function (z) { var k = byP ? (z.pRaw || 'khác') : (z.dRaw || 'khác'); by2[k] = (by2[k] || 0) + z.a; tot += z.a; });
    if (R.period === 'quarter' && /^last$/i.test(X.agg)) out.push(A != null ? 'Doanh số trong quý: ' + A + ' USD' + reach + (X.cum != null ? '. Lũy kế đến ' + kscMon_(X.lastA || eff[eff.length - 1]) + ': ' + kscFmtNum_(X.cum) + ' USD' : '') + '.' : 'Chưa có tháng nào chốt số trong kỳ.');
    else if (!/^last$/i.test(X.agg)) out.push(A != null ? 'Doanh số ' + R.word + ' này: ' + A + ' USD' + reach + '.' : 'Chưa có tháng nào chốt số trong kỳ.');
    else out.push(A != null ? 'Doanh số lũy kế đến ' + kscMon_(X.lastA || eff[eff.length - 1]) + ': ' + A + ' USD' + reach + '.' : 'Chưa có tháng nào chốt số trong kỳ.');
    var keys = Object.keys(by2).filter(function (k) { return Math.abs(by2[k]) > 0.004; }).sort(function (p, q) { return by2[q] - by2[p]; });
    if (keys.length) {
      out.push('Phát sinh trong ' + R.word + ' ' + kscFmtNum_(tot) + ' USD, ' + (byP ? 'theo sản phẩm' : 'theo NPP') + ': ' +
        keys.slice(0, KSC_REPORT.TOP).map(function (k) { return k + ' ' + kscFmtNum_(by2[k]); }).join(' · ') + (keys.length > KSC_REPORT.TOP ? ' · ' + (keys.length - KSC_REPORT.TOP) + ' mục khác' : '') + '.');
    }
    return out;
  }

  /* các mã tính trong file CRM */
  if (/^crm:/.test(src)) {
    var team = src.slice(4), o = E.crmOf(team), meta = o.meta ? o.meta[code] : null;
    X.label = kscLabel_(src);
    if (o.err || !meta) { X.url = (E.info(src) || {}).url || ''; return kscExplainPlain_(code, X, A, reach); }
    X.url = o.urls.kpi || ''; X.sheet = '';
    var key = meta.key, p0 = meta.pic, ev;
    if (/^visit_/.test(key) && (ev = kscCrmVisits_(o, key, p0, eff))) {
      X.url = ev.url; X.sheet = ev.sheet;
      out.push('Đi địa bàn ' + (A != null ? A : ev.list.length) + ' lần' + reach + (ev.list.length ? ':' : '.'));
      var gT = {}; ev.list.forEach(function (z) { var k = z.atype || 'Chưa phân loại'; (gT[k] = gT[k] || []).push(z.account || '(không ghi tên)'); });
      Object.keys(gT).sort(function (p, q) { return gT[q].length - gT[p].length; }).forEach(function (k) {
        var acc = kscGroup_(gT[k]).sort(function (p, q) { return q.n - p.n; });
        out.push('• ' + k + ': ' + gT[k].length + ' lần, gặp ' + acc.slice(0, KSC_REPORT.TOP).map(function (g) { return g.k + (g.n > 1 ? ' (' + g.n + ')' : ''); }).join(', ') + (acc.length > KSC_REPORT.TOP ? ' và ' + (acc.length - KSC_REPORT.TOP) + ' nơi khác' : ''));
      });
      if (A != null && ev.list.length !== Math.round(X.a)) out.push('CRM hiện ghi nhận ' + ev.list.length + ' lượt (số trên file KPI là số đã đồng bộ).');
      return out;
    }
    if (/^supp_/.test(key) && (ev = kscCrmOrders_(o, key, p0, eff))) {
      X.url = ev.url; X.sheet = ev.sheet;
      var amt = key === 'supp_amt', what = key === 'supp_comp' ? 'Composite' : key === 'supp_jizai' ? 'JIZAI' : '';
      var nOrd = ev.list.length, byC = {};
      ev.list.forEach(function (z) { var k = z.account || '(không ghi tên)'; byC[k] = byC[k] || { n: 0, q: 0, v: 0, p: {} }; byC[k].n++; byC[k].q += z.qty; byC[k].v += z.amount; if (z.product) byC[k].p[z.product] = (byC[k].p[z.product] || 0) + z.qty; });
      var rate = ev.rate || 0, usd = function (v) { return rate ? kscFmtNum_(v / rate) + ' USD' : kscFmtNum_(v) + ' VND'; };
      out.push((amt ? 'Hỗ trợ bán ' + (A != null ? A + ' USD' : usd(ev.list.reduce(function (s, z) { return s + z.amount; }, 0))) : 'Hỗ trợ bán ' + (A != null ? A : kscFmtNum_(ev.list.reduce(function (s, z) { return s + z.qty; }, 0))) + ' ' + X.unit + ' ' + what) +
        ' qua ' + nOrd + ' dòng đơn hàng của ' + Object.keys(byC).length + ' khách' + reach + (nOrd ? ':' : '.'));
      Object.keys(byC).sort(function (p, q) { return amt ? byC[q].v - byC[p].v : byC[q].q - byC[p].q; }).slice(0, 8).forEach(function (k) {
        var b = byC[k], prods = Object.keys(b.p).sort(function (p, q) { return b.p[q] - b.p[p]; });
        out.push('• ' + k + ': ' + (amt ? usd(b.v) : kscFmtNum_(b.q) + ' ' + X.unit) + (prods.length && !amt ? ' (' + prods.slice(0, 3).map(function (p) { return p + ' ' + kscFmtNum_(b.p[p]); }).join(', ') + ')' : '') + (b.n > 1 ? ', ' + b.n + ' dòng đơn' : ''));
      });
      if (Object.keys(byC).length > 8) out.push('và ' + (Object.keys(byC).length - 8) + ' khách khác.');
      return out;
    }
    if (/^event_mmh/.test(key) && (ev = kscCrmPresent_(o, key === 'event_mmh' ? p0 : '', eff))) {
      X.url = ev.url; X.sheet = ev.sheet;
      out.push((A != null ? A : ev.list.length) + ' buổi giới thiệu sản phẩm / đào tạo khách hàng' + reach + (ev.list.length ? ':' : '.'));
      ev.list.slice(0, 10).forEach(function (z) { out.push('• ' + (z.day ? z.day + ': ' : '') + (z.account || '(không ghi nơi tổ chức)') + (z.people ? ', ' + kscFmtNum_(z.people) + ' người tham dự' : '')); });
      return out;
    }
    if (/^newacct_/.test(key) && (ev = kscCrmNewAcct_(o, key, p0, eff))) {
      X.url = ev.url; X.sheet = ev.sheet;
      out.push((A != null ? A : ev.list.length) + ' khách hàng mới / SKU mới' + reach + (ev.list.length ? ':' : '.'));
      if (ev.list.length) out.push('Account mở mới: ' + ev.list.map(function (z) { return z.account + (z.atype ? ' (' + z.atype + ')' : ''); }).join(', ') + '.');
      if (A != null && X.a > ev.list.length) out.push('Phần còn lại là SKU mới nhập tay ở tab KPI của CRM.');
      return out;
    }
    if (key === 'event_hub' || key === 'manual' || key === 'turnover') X.url = o.urls.kpi || '';
    return kscExplainPlain_(code, X, A, reach);
  }
  if (KSC.EVENT_CODES.indexOf(code) >= 0) { X.label = 'Marketing Offline Thailand'; X.sheet = 'REPORT_EVENT'; }
  return kscExplainPlain_(code, X, A, reach);
}
function kscExplainPlain_(code, X, A, reach) {
  if (A == null) return ['Chưa có số trong kỳ.'];
  if (/^C3-|^C4-0[12]/.test(code)) return ['Đi địa bàn ' + A + ' lần' + reach + '.'];
  if (/^C4-03/.test(code)) return ['Đi địa bàn cùng sales NPP ' + A + ' ngày' + reach + '.'];
  if (/^C1-|^C2-0[13]/.test(code)) return [A + ' khách hàng mới / SKU mới' + reach + '.'];
  if (/^C1[0-3]-/.test(code)) return [A + ' sự kiện' + reach + '.'];
  if (/^C5-/.test(code)) return ['Hỗ trợ bán ' + A + ' USD' + reach + '.'];
  if (/^C6-/.test(code)) return ['Hỗ trợ bán ' + A + ' ' + X.unit + ' Composite' + reach + '.'];
  if (/^C7-/.test(code)) return ['Hỗ trợ bán ' + A + ' ' + X.unit + ' JIZAI' + reach + '.'];
  return ['Thực hiện ' + A + (X.unit && !/%/.test(X.unit) ? ' ' + X.unit : '') + reach + '.'];
}

/* ── cách tính ngắn gọn (sửa tay được ở cột "Rule tính (sửa tay)" của KPI EXPLAIN MAP) ── */
function kscPlainRule_(code, X, E) {
  var src = (E.codes()[code] || {}).src || '', key = '';
  if (/^crm:/.test(src)) { var o = E.crm[src.slice(4)]; key = o && o.meta && o.meta[code] ? o.meta[code].key : ''; }
  if (X.calc) return 'Tự cộng (hoặc tính trung bình) từ các KPI con trong file KPI.';
  var KO = KSC_MOFF.CODES;
  if (code === KO.comp) return 'Tổng số Composite bán được qua các sự kiện trong tháng (REPORT_EVENT, cột Actual sales - Composite).';
  if (code === KO.jz) return 'Tổng số JIZAI (sheets) bán được qua các sự kiện trong tháng (REPORT_EVENT, cột Actual sales - Jizai).';
  if (code === KO.evD || code === KO.evS) return 'Số sự kiện trong tháng thuộc Segment ' + (code === KO.evD ? 'Dental/MMG' : 'Surgical/Eyeless') + ' đã có Detail event folder link.';
  if (code === KO.ppD || code === KO.ppS) return 'Tổng số người tham dự (Actual Participant) các sự kiện ' + (code === KO.ppD ? 'Dental/MMG' : 'Surgical/Eyeless') + ' trong tháng.';
  if (code === 'L1-00') return 'Số buổi đào tạo nội bộ về sản phẩm (Internal, Category Product) đã hoàn thành.';
  if (/^L2-\d/.test(code)) return 'Số buổi đào tạo nội bộ không phải sản phẩm (Internal, Category khác Product) do chính PIC đứng lớp, đã hoàn thành.';
  if (code === 'C10-06') return 'Số buổi đào tạo khách hàng (External) do Giang đứng lớp, đã hoàn thành.';
  if (KSC_KBI.CODE_RE.test(code)) return 'Điểm tháng = 100 cộng điểm cộng, trừ điểm trừ (cột Total point by month).';
  var cd = /^last$/i.test(X.agg) ? ', cộng dồn từ tháng 9' : ', số của từng tháng';
  if (/^F6-01/.test(code)) return 'Doanh số Composite bán cho NPP (Type 3 Composite amount, USD)' + cd + ', chỉ tính tháng đã chốt số.';
  if (/^F6-02/.test(code)) return 'Doanh số JIZAI bán cho NPP (Type 2 Jizai amount, USD)' + cd + ', chỉ tính tháng đã chốt số.';
  if (/^F/.test(code)) return 'Doanh số bán cho NPP (Type 1 Turnover, lọc theo Segment Report, USD)' + cd + ', chỉ tính tháng đã chốt số.';
  var M = KSC_MKT.CODES;
  if (code === M.mirEvent || code === M.mirProduct) return 'Số tin nhắn chia cho số người tiếp cận của quảng cáo ' + (code === M.mirEvent ? 'sự kiện' : 'sản phẩm') + '.';
  if (code === M.postOnTime) return 'Bài có link report điền trước hoặc đúng ngày on-air dự kiến, chia cho số bài kế hoạch (không tính bài hủy).';
  if (code === M.content) return 'Số link bài đăng Facebook / Zalo OA ở cột Link report (EVENT REPORT + PRODUCT REPORT).';
  if (code === M.designOnTime) return 'Số yêu cầu thiết kế có Check deadline report = On time, chia cho số yêu cầu trong tháng (không tính yêu cầu hủy).';
  if (code === M.score) return 'Tổng Điểm tổng của các yêu cầu thiết kế trong tháng (điểm chuẩn theo dạng ấn phẩm nhân số lượng, không tính yêu cầu hủy).';
  if (/^visit_/.test(key)) return 'Số lượt Visiting đã đi trong kỳ ở báo cáo tuần (không tính lượt Not Started, Cancel)' + (key === 'visit_dealer' ? ', khách là Dealer.' : key === 'visit_other' ? ', khách không phải Dealer.' : '.');
  if (key === 'supp_amt') return 'Tổng tiền các đơn hàng do sales phụ trách (3. SALE ORDER), đổi VND sang USD theo tỷ giá ở tab KPI của CRM.';
  if (key === 'supp_comp') return 'Tổng số lượng Composite trong các đơn hàng do sales phụ trách (3. SALE ORDER).';
  if (key === 'supp_jizai') return 'Tổng số lượng JIZAI trong các đơn hàng do sales phụ trách (3. SALE ORDER).';
  if (/^event_mmh/.test(key)) return 'Số buổi ở tab 7. PRODUCT PRESENTATION.';
  if (/^newacct_/.test(key)) return 'Số account mở mới trong tháng (1. CUSTOMER CODE)' + (key === 'newacct_dealer' ? ', loại Dealer' : '') + ', cộng SKU mới nhập tay.';
  if (key === 'event_hub' || KSC.EVENT_CODES.indexOf(code) >= 0) return 'Số sự kiện theo tháng ở REPORT_EVENT (KPI Hub đọc).';
  if (key === 'manual') return 'Số nhập ở file KPI hoặc tab KPI của CRM.';
  return '';
}
function kscGroup_(arr) { var m = {}, o = []; arr.forEach(function (k) { k = k || '(chưa ghi tiêu đề)'; if (!m[k]) { m[k] = { k: k, n: 0 }; o.push(m[k]); } m[k].n++; }); return o; }
function kscPad2_(n) { return n < 10 ? '0' + n : String(n); }
function kscFmtNum_(v) {
  if (v == null || isNaN(v)) return '';
  var r = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100, s = String(Math.abs(r)).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (r < 0 ? '-' : '') + s.join('.');
}
function kscFmtPct_(v, d) { if (v == null || isNaN(v)) return ''; var f = Math.pow(10, d == null ? 1 : d); return (Math.round(v * 100 * f) / f) + '%'; }
function kscEsc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function kscFmtVal_(v, unit) { if (v == null) return ''; return /%/.test(unit) ? kscFmtPct_(v, 2) : kscFmtNum_(v); }

function kscReportHtml_(R, who, sections, fy, RG, ss, srcs) {
  var h = [];
  var a = function (url, txt) { return url ? '<a href="' + kscEsc_(url) + '">' + kscEsc_(txt) + '</a>' : kscEsc_(txt); };
  h.push('<html><head><meta charset="utf-8"><style>',
    '@page{size:A4;margin:14mm 13mm}',
    'body{font-family:Aptos,Arial,sans-serif;color:#1A1A1A;font-size:10pt;line-height:1.38}a{color:#1155CC;text-decoration:none}',
    '.hd{border-bottom:3px solid #FFE100;padding-bottom:6px;margin-bottom:6px}',
    'h1{color:#003047;font-size:16pt;margin:0}.sub{color:#3A5CAA;font-size:11.5pt;margin-top:2px;font-weight:bold}.meta{color:#666;font-size:8.5pt;margin-top:3px}',
    'h2{color:#003047;font-size:13pt;margin:16px 0 2px}.sum{color:#666;font-size:9pt;margin-bottom:6px}',
    'table{width:100%;border-collapse:collapse}tbody{page-break-inside:avoid}',
    'th{color:#003047;font-size:8.5pt;text-align:left;padding:4px 6px;border-bottom:2px solid #3A5CAA}th.n{text-align:right}',
    'td{padding:5px 6px 2px;vertical-align:top}.k td{border-top:1px solid #CFE2F3}',
    '.c{font-weight:bold;color:#003047;white-space:nowrap}.nm{font-weight:bold}.n{text-align:right;white-space:nowrap}.u{color:#888;font-size:8pt}',
    '.x td{padding:1px 6px 7px 6px;font-size:9.5pt}.ln{margin:0 0 1px}.ft2{color:#777;font-size:8pt;margin-top:2px}',
    '.ok{color:#0a7a3d;font-weight:bold}.mid{color:#9C5700;font-weight:bold}.lo{color:#9C0006;font-weight:bold}',
    '.src{margin-top:16px;border-top:1px solid #CFE2F3;padding-top:6px;font-size:8.5pt;color:#555}.src li{margin:1px 0}',
    '.tot{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 8px}.tc{border:1px solid #CFE2F3;border-left:4px solid #3A5CAA;border-radius:4px;padding:4px 10px;min-width:120px}',
    '.tc .l{font-size:8pt;color:#666}.tc .v{font-size:15pt;font-weight:bold}.tc .s{font-size:7.5pt;color:#888}',
    '</style></head><body>');
  h.push('<div class="hd"><h1>BÁO CÁO GIẢI THÍCH KPI ' + kscEsc_(fy) + '</h1><div class="sub">' + kscEsc_(R.label) + ' · ' + kscEsc_(who) + '</div>',
    '<div class="meta">Tạo lúc ' + Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm') + ' · Target và Actual theo ' +
    a(kscUrl_(ss, ss.getSheetByName(KSC.DETAIL)), 'file KPI, sheet 3. Detail KPI') + ' · Rule KPI: ' + a(RG && RG.url, 'sheet 4. Rule') + '</div></div>');
  if (!sections.length) h.push('<p>Không có KPI nào cho lựa chọn này.</p>');
  sections.forEach(function (s) {
    var ok = s.items.filter(function (it) { return it.pct != null && it.pct >= 1; }).length, none = s.items.filter(function (it) { return it.actual == null; }).length;
    h.push('<h2>' + kscEsc_(s.title) + '</h2><div class="sum">' + s.items.length + ' KPI · ' + ok + ' KPI đạt mục tiêu' + (none ? ' · ' + none + ' KPI chưa có số' : '') + '</div>');
    if (s.totals && s.totals.length) {
      h.push('<div class="tot">');
      s.totals.forEach(function (x) {
        var c2 = x.pw == null ? '' : x.pw >= 1 ? 'ok' : x.pw >= 0.9 ? 'mid' : 'lo';
        h.push('<div class="tc"><div class="l">Tổng KPI ' + kscEsc_(x.label) + '</div><div class="v ' + c2 + '">' + (x.pw == null ? 'chưa có số' : kscFmtPct_(x.pw)) + '</div>' +
          '<div class="s">Σ % × trọng số' + (x.w != null ? ' · tổng trọng số ' + kscFmtPct_(x.w, 0) : '') + '</div></div>');
      });
      h.push('</div>');
    }
    h.push('<table><thead><tr><th style="width:50%">KPI</th><th class="n" style="width:12%">Target</th><th class="n" style="width:12%">Actual</th><th class="n" style="width:9%">% đạt</th><th class="n" style="width:8%">Trọng số</th><th class="n" style="width:9%">% × TS</th></tr></thead>');
    s.items.forEach(function (it) {
      var cls = it.pct == null ? '' : it.pct >= 1 ? 'ok' : it.pct >= 0.8 ? 'mid' : 'lo';
      h.push('<tbody><tr class="k"><td><span class="c">' + kscEsc_(it.code) + '</span> <span class="nm">' + kscEsc_(it.name) + '</span></td>',
        '<td class="n">' + kscFmtVal_(it.target, it.unit) + (it.target != null && it.unit && !/%/.test(it.unit) ? ' <span class="u">' + kscEsc_(it.unit) + '</span>' : '') + '</td>',
        '<td class="n">' + kscFmtVal_(it.actual, it.unit) + '</td><td class="n ' + cls + '">' + (it.pct == null ? '' : kscFmtPct_(it.pct)) + '</td>',
        '<td class="n">' + (it.w == null ? '' : kscFmtPct_(it.w, 0)) + '</td><td class="n">' + (it.pw == null ? '' : kscFmtPct_(it.pw)) + '</td></tr>',
        '<tr class="x"><td colspan="6">' + it.lines.map(function (l) { return '<div class="ln">' + kscEsc_(l) + '</div>'; }).join(''),
        '<div class="ft2">' + (it.rule ? 'Cách tính: ' + kscEsc_(it.rule) + ' ' : '') + (it.source ? 'Nguồn: ' + a(it.url, it.source) : '') + '</div></td></tr></tbody>');
    });
    h.push('</table>');
  });
  var keys = Object.keys(srcs || {});
  if (keys.length) {
    h.push('<div class="src"><b>Nguồn dữ liệu</b><ul style="margin:3px 0 0 16px;padding:0">');
    keys.forEach(function (k) { h.push('<li>' + a(srcs[k].url, k) + (srcs[k].sheets.length ? ': ' + kscEsc_(srcs[k].sheets.join(', ')) : '') + '</li>'); });
    h.push('<li>' + a(kscUrl_(ss, ss.getSheetByName(KSC_MAP.SHEET)), 'KPI EXPLAIN MAP') + ': nguồn, link và cách tính từng KPI (sửa tay được)</li></ul>',
      '<div style="margin-top:4px">% đạt tối đa 130%, trừ doanh số NPP (mã F). Doanh số mã F có Agg LAST là số cộng dồn từ đầu năm tài chính; Agg SUM là số của từng tháng. ' +
      'Target, Actual, %, trọng số và tổng KPI theo ' + a(kscUrl_(ss, ss.getSheetByName(KSC_M5.SHEET)), 'sheet 5. Member KPI Monthly') + ' (trọng số theo quý ở 5A. KPI Weight Input).</div></div>');
  }
  h.push('</body></html>');
  return h.join('');
}

var KSC_REPORT_HTML = [
'<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">',
'<style>body{font-family:Aptos,Inter,Arial,sans-serif;color:#1A1A1A;margin:0;padding:14px 18px;font-size:13px}',
'h2{margin:0 0 4px;color:#003047;font-size:17px}.sub{color:#666;margin-bottom:12px}',
'label{display:block;font-weight:700;color:#003047;margin:10px 0 4px}select{width:100%;padding:7px;font-size:13px;border:1px solid #CFE2F3;border-radius:6px}',
'.row{display:flex;gap:10px}.row>div{flex:1}',
'.msg{margin-top:12px;padding:9px 10px;background:#F0F7FF;border-left:4px solid #3A5CAA;min-height:20px}',
'.btns{margin-top:14px;text-align:right}button{font-family:inherit;font-size:13px;padding:7px 14px;margin-left:6px;border-radius:6px;border:1px solid #3A5CAA;background:#fff;color:#3A5CAA;cursor:pointer}',
'button.p{background:#3A5CAA;color:#fff}button:disabled{opacity:.5}a{color:#1155CC}</style></head><body>',
'<h2>📄 Báo cáo giải thích KPI</h2><div class="sub">Chọn kỳ và người. Mỗi KPI có Target, Actual, % đạt, vài câu giải thích từ dữ liệu gốc và link tới sheet nguồn.</div>',
'<div class="row"><div><label>Kỳ</label><select id="per" onchange="fill()"><option value="month">Theo tháng</option><option value="quarter">Theo quý</option><option value="fy">Cả năm</option></select></div>',
'<div><label>Chọn</label><select id="val"></select></div></div>',
'<label>Nhân sự (PIC)</label><select id="pic"></select>',
'<div class="msg" id="msg">Đang tải danh sách…</div>',
'<div class="btns"><button id="go" class="p" onclick="make()" disabled>Tạo PDF</button><button onclick="google.script.host.close()">Đóng</button></div>',
'<script>',
'var O=null;function $(i){return document.getElementById(i);}',
'function fill(){var p=$("per").value,v=$("val"),h="";',
' if(p==="month"){O.months.forEach(function(m){if(m<=O.cur)h+="<option value=\\""+m+"\\""+(m===O.cur?" selected":"")+">"+String(m).slice(4)+"/"+String(m).slice(0,4)+"</option>";});}',
' else if(p==="quarter"){O.quarters.forEach(function(q){if(q.months[0]<=O.cur)h+="<option value=\\""+q.id+"\\">"+q.id+" ("+q.months[0]+" → "+q.months[q.months.length-1]+")</option>";});}',
' else h="<option value=\\""+O.fy+"\\">"+O.fy+"</option>";',
' v.innerHTML=h;}',
'google.script.run.withSuccessHandler(function(o){O=o;fill();var h="<option value=\\"*\\">Tất cả nhân sự</option>";o.pics.forEach(function(p){h+="<option>"+p+"</option>";});',
' $("pic").innerHTML=h;$("msg").innerHTML="Sẵn sàng.";$("go").disabled=false;}).withFailureHandler(function(e){$("msg").innerHTML="⚠ "+e.message;}).kscReportOptions();',
'function make(){$("go").disabled=true;$("msg").innerHTML="Đang đọc dữ liệu nguồn và tạo PDF… (10 đến 60 giây)";',
' google.script.run.withSuccessHandler(function(r){$("go").disabled=false;if(!r.ok){$("msg").innerHTML="⚠ "+r.error;return;}',
'  var a=document.createElement("a");a.href="data:application/pdf;base64,"+r.b64;a.download=r.name;document.body.appendChild(a);a.click();',
'  $("msg").innerHTML="✓ Đã tạo <b>"+r.name+"</b>. Nếu trình duyệt chưa tự tải: <a href=\\"data:application/pdf;base64,"+r.b64+"\\" download=\\""+r.name+"\\">tải về</a>"+(r.url?" · <a href=\\""+r.url+"\\" target=\\"_blank\\">mở trên Drive</a>":"");})',
' .withFailureHandler(function(e){$("go").disabled=false;$("msg").innerHTML="⚠ "+e.message;}).kscMakeReport({period:$("per").value,value:$("val").value,pic:$("pic").value});}',
'</script></body></html>'
].join('\n');

/* ════════════════ TỔNG KPI THEO NGƯỜI (đọc sheet 5. Member KPI Monthly) ════════════════
   Sheet 5 của file KPI đã tính sẵn bằng công thức: Target, Actual, Weight, %, % x W của từng KPI từng người
   theo tháng / quý / năm, và dòng "TOTAL - <người>" = Σ % x W. Code chỉ đọc lại (không tự tính khác đi)
   để PDF và email luôn khớp số chính thức của file KPI. */
var KSC_M5 = { SHEET: '5. Member KPI Monthly' };
function kscMemberKpi_(ss) {
  var sh = ss.getSheetByName(KSC_M5.SHEET), out = { members: {}, ok: false };
  if (!sh || sh.getLastRow() < 5) return out;
  var V = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), hr = -1, H = {}, P = {};
  for (var i = 0; i < Math.min(V.length, 10) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (h.indexOf('member') >= 0 && h.indexOf('kpi code') >= 0) hr = i;
  }
  if (hr < 0) return out;
  V[hr].forEach(function (x, k) {
    var s = String(x || '').replace(/\s+/g, ' ').trim(), m = /^(\d{6}|Q[1-4]|FY\d+) (Target|Actual|Weight|%|% x W)$/i.exec(s);
    if (m) { var key = m[1].toUpperCase(), f = { target: 't', actual: 'a', weight: 'w', '%': 'p', '% x w': 'pw' }[m[2].toLowerCase()]; (P[key] = P[key] || {})[f] = k; }
    else { var n = kscNorm_(s); if (n && H[n] == null) H[n] = k; }
  });
  var cM = H['member'], cC = H['kpi code'], cG = H['kpi group'], cN = H['kpi name'], cU = H['unit'], cA = H['agg'];
  function vals(row) { var o = {}; Object.keys(P).forEach(function (key) { var c = P[key], x = {}; ['t', 'a', 'w', 'p', 'pw'].forEach(function (f) { x[f] = c[f] == null ? null : kscNum_(row[c[f]]); }); o[key] = x; }); return o; }
  for (var r = hr + 1; r < V.length; r++) {
    var row = V[r], b = String(row[1] || '');
    if (/^TOTAL/i.test(b.trim())) {
      var who = String(row[0] || '').trim(); if (!who) continue;
      (out.members[who] = out.members[who] || { rows: {}, order: [] }).total = vals(row);
      continue;
    }
    var mem = String(row[cM] || '').trim(), code = String(row[cC] || '').trim();
    if (!mem || !code) continue;
    var M = out.members[mem] = out.members[mem] || { rows: {}, order: [] };
    if (!M.rows[code]) M.order.push(code);
    M.rows[code] = { code: code, group: cG == null ? '' : String(row[cG] || '').trim(), name: cN == null ? '' : String(row[cN] || '').trim(),
                     unit: cU == null ? '' : String(row[cU] || '').trim(), agg: cA == null ? '' : String(row[cA] || '').trim(), v: vals(row) };
  }
  out.ok = true; out.url = kscUrl_(ss, sh);
  return out;
}
/* quý chứa tháng m (Q1 = 3 tháng đầu năm tài chính) */
function kscQOf_(L, m) { var q = kscQuarters_(L.months).filter(function (x) { return x.months.indexOf(m) >= 0; })[0]; return q ? q.id : ''; }
/* các mốc tổng KPI hiển thị cho 1 kỳ báo cáo */
function kscTotalsFor_(L, R, M5, pic) {
  var mem = M5.members[pic]; if (!mem || !mem.total) return [];
  var T = mem.total, out = [];
  function add(key, label) { var x = T[key] || {}; out.push({ key: key, label: label, pw: x.pw, w: x.w }); }
  if (R.period === 'month') { var m = R.eff[0], q = kscQOf_(L, m); add(String(m), 'Tháng ' + kscMon_(m)); if (q) add(q, q + ' ' + L.fy + ' (đến ' + kscMon_(m) + ')'); }
  else if (R.period === 'quarter') { R.eff.forEach(function (m) { add(String(m), 'Tháng ' + kscMon_(m)); }); add(R.value, R.value + ' ' + L.fy); }
  else { kscQuarters_(L.months).forEach(function (q) { if (q.months[0] <= R.cur) add(q.id, q.id); }); add(L.fy.toUpperCase(), 'Cả năm ' + L.fy); }
  return out;
}
/* tên file nguồn + link của 1 mã (dùng cho cột Link của email) */
function kscLinkOf_(ctx, code, C, manual) {
  if (manual && manual[code] && (manual[code].src || manual[code].url)) return { text: manual[code].src || 'Nguồn', url: manual[code].url || '' };
  var L = ctx.L, P = PropertiesService.getScriptProperties();
  var src = (C[code] || {}).src;
  if (!src) {
    var pc = L.H['parent'];
    if (pc != null) Object.keys(L.rows).some(function (k) { if (String(L.V[L.rows[k]][pc]).trim() === code && C[k] && C[k].src) { src = C[k].src; return true; } return false; });
  }
  if (src) {
    var info = {}; try { info = JSON.parse(P.getProperty('KSC_SRCINFO_' + src) || '{}'); } catch (e) {}
    return { text: info.file || kscLabel_(src), url: (info.codeUrls && info.codeUrls[code]) || info.url || '' };
  }
  var rc = L.H['reference file for calculation'], ref = rc == null || L.rows[code] == null ? '' : String(L.V[L.rows[code]][rc] || '').trim();
  return { text: ref && ref !== '-' ? ref : '', url: /^https?:\/\//.test(ref) ? ref : '' };
}
function kscManualSources_(ss) {
  var sh = ss.getSheetByName(KSC_MAP.SHEET), out = {};
  if (!sh || sh.getLastRow() < 4) return out;
  sh.getRange(4, 1, sh.getLastRow() - 3, 8).getValues().forEach(function (r) { var c = String(r[0] || '').trim(); if (c && (r[6] || r[7])) out[c] = { src: String(r[6] || '').trim(), url: String(r[7] || '').trim() }; });
  return out;
}

/* ════════════════ EMAIL BÁO CÁO KPI THÁNG (cho từng nhân sự) ════════════════
   Menu ⚡ KPI Sync ▸ ✉ Soạn và gửi email KPI tháng.
   · Chọn tháng (mặc định tháng trước) và người (mặc định người đang đăng nhập).
   · Người nhận tự điền theo sheet 0. Staff List + email ở sheet "KPI EMAIL DIRECTORY":
     To = Team Leader cùng Team (nếu mình là Team Leader hoặc team không có Team Leader thì To = HOD cùng Department),
     CC = HOD (nếu chưa ở To) + Director + các email "CC luôn gửi" (mặc định vtt.hoa). Thêm / bớt người nhận ngay trong hộp thoại.
   · Bảng 1. Performance Summary KPI lấy đúng số của sheet 5. Member KPI Monthly (Target, Actual, Weight, %, % x W).
   · Lời chào, phần 2. Analysis & Next Actions, 3. Highlights & Challenges, chữ ký: người gửi tự soạn.
   · Email gửi từ tài khoản Google của người bấm gửi. Mỗi lần gửi ghi 1 dòng vào sheet ẩn _KPI_EMAIL_LOG. */
var KSC_MAIL = {
  DIR      : 'KPI EMAIL DIRECTORY',
  LOG      : '_KPI_EMAIL_LOG',
  CC_ALWAYS: 'vtt.hoa@manimedicalhanoi.com',
  /* email đã có trong code CRM (USER_MAP) và CRM Thái: chỉ dùng để điền sẵn lần đầu, sửa ở sheet KPI EMAIL DIRECTORY */
  KNOWN    : { 'Viet': 'mmh.hanoi@manimedicalhanoi.com', 'Phuong': 'mmh.saigon@manimedicalhanoi.com', 'Vinh': 'mmh.danang@manimedicalhanoi.com',
               'Giang': 'mmh.product@manimedicalhanoi.com', 'Tuyen': 'tt.tuyen@manimedicalhanoi.com', 'Viet Ha': 'mmh.hanoi2@manimedicalhanoi.com',
               'Khang': 'mmh.saigon1@manimedicalhanoi.com', 'Trang': 'marketing.mmh2@manimedicalhanoi.com', 'Dao': 'manithailand@manimedicalhanoi.com',
               'Miew': 'manithailand4@manimedicalhanoi.com', 'Hoa': 'vtt.hoa@manimedicalhanoi.com', 'Nguyễn Thị Thu Hà': 'nt.ha@manimedicalhanoi.com' },
  GROUP_BG : [[/^sales/i, '#CFE2F3'], [/^marketing/i, '#FFF2CC'], [/^people/i, '#F4CCCC'], [/^(process|back|operation|finance)/i, '#D9EAD3']]
};
function kscOpenMail() {
  var html = HtmlService.createHtmlOutput(KSC_MAIL_HTML).setWidth(980).setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, 'Soạn và gửi email KPI tháng');
}
/* danh bạ: 0. Staff List + cột Email (giữ email đã nhập) */
function kscStaffDir_(ss) {
  var st = ss.getSheetByName('0. Staff List'), staff = [];
  if (st && st.getLastRow() >= 5) {
    var V = st.getRange(1, 1, st.getLastRow(), Math.min(st.getLastColumn(), 14)).getValues(), hr = -1, H = {};
    for (var i = 0; i < Math.min(V.length, 10) && hr < 0; i++) { var h = V[i].map(kscNorm_); if (h.some(function (x) { return /^kpi name/.test(x); }) && h.some(function (x) { return /^full name/.test(x); })) hr = i; }
    if (hr >= 0) {
      V[hr].forEach(function (x, k) { var n = kscNorm_(x); if (n && H[n] == null) H[n] = k; });
      var col = function (re) { var k = null; Object.keys(H).forEach(function (x) { if (k == null && re.test(x)) k = H[x]; }); return k; };
      var cK = col(/^kpi name/), cF = col(/^full name/), cJ = col(/^job title/), cL = col(/^job level/), cR = col(/^mgmt/), cT = col(/^team$/), cD = col(/^department/), cS = col(/^status/);
      for (var r = hr + 1; r < V.length; r++) {
        var full = String(V[r][cF] || '').trim(), key = String(V[r][cK] || '').trim();
        if (!full && !key) continue;
        staff.push({ key: key, full: full, title: String(V[r][cJ] || '').trim(), level: String(V[r][cL] || '').trim(), role: String(V[r][cR] || '').trim(),
                     team: String(V[r][cT] || '').trim(), dept: String(V[r][cD] || '').trim(), status: cS == null ? '' : String(V[r][cS] || '').trim(), email: '' });
      }
    }
  }
  /* sheet danh bạ email */
  var sh = ss.getSheetByName(KSC_MAIL.DIR), mail = {}, cc = KSC_MAIL.CC_ALWAYS, fresh = !sh;
  if (sh && sh.getLastRow() >= 4) {
    cc = String(sh.getRange(2, 3).getValue() || '').trim();
    sh.getRange(5, 1, Math.max(sh.getLastRow() - 4, 1), 3).getValues().forEach(function (r) { var id = String(r[0] || r[1] || '').trim(); if (id) mail[id] = String(r[2] || '').trim(); });
  }
  staff.forEach(function (s) {
    var id = s.key || s.full;
    s.email = mail[id] != null ? mail[id] : (fresh ? (KSC_MAIL.KNOWN[s.key] || KSC_MAIL.KNOWN[s.full] || '') : '');
  });
  /* ghi lại sheet danh bạ (thêm người mới của Staff List, giữ email đã nhập) */
  var grid = [['KPI EMAIL DIRECTORY · email dùng cho chức năng ✉ Soạn và gửi email KPI tháng', '', ''],
              ['CC luôn gửi (cách nhau bằng dấu phẩy):', '', cc],
              ['Cột A, B lấy theo 0. Staff List. Chỉ nhập / sửa cột C (Email). Người nhận To / CC tự chọn theo Team, Mgmt. / Role và Department của 0. Staff List.', '', ''],
              ['KPI Name', 'Full name', 'Email']].concat(staff.map(function (s) { return [s.key, s.full, s.email]; }));
  try {
    if (!sh) { sh = ss.insertSheet(KSC_MAIL.DIR); try { sh.setTabColor('#FFE100'); } catch (e0) {} }
    sh.getRange(1, 1, Math.max(sh.getLastRow(), grid.length), 3).clearContent();
    sh.getRange(1, 1, grid.length, 3).setValues(grid);
    try { sh.getRange(1, 1).setFontWeight('bold').setFontSize(13).setFontColor('#003047'); sh.getRange(2, 3).setBackground('#FFF8E1');
          sh.getRange(4, 1, 1, 3).setFontWeight('bold').setBackground('#CFE2F3'); sh.getRange(5, 3, Math.max(staff.length, 1), 1).setBackground('#FFF8E1');
          sh.setColumnWidth(1, 120); sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 300); sh.setFrozenRows(4); } catch (e1) {}
  } catch (e2) {}
  return { staff: staff, cc: cc };
}
function kscRecipients_(D, pic) {
  var me = D.staff.filter(function (s) { return s.key === pic; })[0] || { key: pic };
  var isTL = /team leader/i.test(me.role), isHOD = /hod/i.test(me.role);
  var tl = me.team ? D.staff.filter(function (s) { return s !== me && s.team === me.team && /team leader/i.test(s.role); })[0] : null;
  var hod = D.staff.filter(function (s) { return s !== me && s.dept && s.dept === me.dept && /hod/i.test(s.role); })[0];
  var dir = D.staff.filter(function (s) { return s !== me && /director/i.test(s.level); })[0];
  var toP = (!isTL && !isHOD && tl) ? tl : (!isHOD ? hod : null) || dir;
  var to = toP && toP.email ? [toP.email] : [], cc = [];
  [hod, dir].forEach(function (p) { if (p && p.email) cc.push(p.email); });
  String(D.cc || '').split(/[,;\s]+/).forEach(function (e) { if (e) cc.push(e); });
  cc = cc.filter(function (e, i) { return cc.indexOf(e) === i && to.indexOf(e) < 0 && e !== me.email; });
  var miss = [];
  if (toP && !toP.email) miss.push((toP.key || toP.full) + ' (To)');
  [hod, dir].forEach(function (p) { if (p && !p.email) miss.push((p.key || p.full)); });
  return { me: me, to: to, cc: cc, toName: toP ? (toP.key || toP.full) : '', miss: miss };
}
/* dữ liệu cho hộp thoại */
function kscMailOptions() {
  var ss = SpreadsheetApp.getActive(), L = kscLayout_(ss.getSheetByName(KSC.DETAIL)), cur = Number(Utilities.formatDate(new Date(), KSC.TZ, 'yyyyMM'));
  var D = kscStaffDir_(ss), M5 = kscMemberKpi_(ss), user = '';
  try { user = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (e) {}
  var mine = D.staff.filter(function (s) { return s.email && s.email.toLowerCase() === user; })[0];
  var pics = D.staff.filter(function (s) { return s.key && M5.members[s.key]; }).map(function (s) { return s.key; });
  var months = L.months.filter(function (m) { return m <= cur; }), prev = months.filter(function (m) { return m < cur; }).pop() || months[0];
  return { months: months, def: prev, pics: pics, me: mine ? mine.key : '', user: user, fy: L.fy,
           book: D.staff.filter(function (s) { return s.email; }).map(function (s) { return { n: (s.key || s.full) + (s.title ? ' · ' + s.title : ''), e: s.email }; }), m5: M5.ok };
}
function kscMailData(pic, month) {
  var ss = SpreadsheetApp.getActive(), ctx = kscCtx_(ss), L = ctx.L, m = Number(month), q = kscQOf_(L, m);
  var M5 = kscMemberKpi_(ss); if (!M5.ok) return { ok: false, error: 'Không đọc được sheet "' + KSC_M5.SHEET + '".' };
  var mem = M5.members[pic]; if (!mem) return { ok: false, error: 'Sheet 5. Member KPI Monthly không có ' + pic + '.' };
  var C = {}; try { C = JSON.parse(PropertiesService.getScriptProperties().getProperty('KSC_CODES') || '{}'); } catch (e) {}
  var man = kscManualSources_(ss), key = String(m), rows = [];
  mem.order.forEach(function (code) {
    var x = mem.rows[code], v = x.v[key] || {}, w = v.w != null ? v.w : (x.v[q] || {}).w;
    if (!w) return;                                                // chỉ KPI có trọng số trong quý
    var lk = kscLinkOf_(ctx, code, C, man);
    rows.push({ code: code, link: lk.text, url: lk.url, type: kscCleanName_(x.group), kpi: kscCleanName_(x.name), unit: x.unit, w: w, t: v.t, a: v.a, p: v.p, pw: v.pw });
  });
  var T = (mem.total || {})[key] || {}, TQ = (mem.total || {})[q] || {};
  var R = kscRecipients_(kscStaffDir_(ss), pic);
  return { ok: true, pic: pic, month: m, q: q, fy: L.fy, rows: rows, total: T.pw, wsum: T.w, qtotal: TQ.pw, to: R.to.join(', '), cc: R.cc.join(', '),
           toName: R.toName, miss: R.miss, full: R.me.full || pic, src: M5.url };
}
/* HTML email theo mẫu */
function kscMailHtml_(d, f) {
  var e = kscEsc_, mm = kscMon_(d.month), td = 'border:1px solid #808080;padding:3px 6px;font-size:10.5pt;';
  var pc = function (v) { return v == null ? '' : Math.round(v * 100) + '%'; }, num = function (v) { return v == null ? '' : kscFmtNum_(v); };
  var bg = function (g) { var c = ''; KSC_MAIL.GROUP_BG.forEach(function (x) { if (!c && x[0].test(g)) c = x[1]; }); return c || '#EDEDED'; };
  var lines = function (t) { return String(t || '').split(/\n/).map(function (x) { return x.replace(/^\s*[-•*·]\s*/, '').trim(); }).filter(function (x) { return x; }); };
  var color = d.total == null ? '#1A1A1A' : d.total >= 1 ? '#1E7B34' : d.total >= 0.9 ? '#B45309' : '#C00000';
  var h = ['<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1A1A1A">'];
  h.push('<div>' + e(f.greeting || '').replace(/\n/g, '<br>') + '</div>');
  if (f.intro) h.push('<div>' + e(f.intro).replace(/\n/g, '<br>') + '</div>');
  var en = f.lang === 'en';   /* nhóm Thái (CRM tiếng Anh) */
  h.push('<div>KPI ' + (en ? '' : 'T') + mm + ' : <b style="color:' + color + '">' + (d.total == null ? (en ? 'no data yet' : 'chưa có số') : pc(d.total)) + '</b></div>');
  if (f.showQ && d.qtotal != null) h.push('<div>KPI ' + e(d.q) + ' ' + e(d.fy) + (en ? ' (to ' : ' (đến T') + mm + ') : <b>' + pc(d.qtotal) + '</b></div>');
  h.push('<div>' + (en ? 'Details:' : 'Chi tiết :') + '</div><div style="margin-top:6px"><b>1. Performance Summary KPI</b></div>');
  var th = function (t, c, w) { return '<th style="' + td + 'background:' + c + ';font-weight:normal;text-align:center;vertical-align:bottom' + (w ? ';width:' + w : '') + '">' + t + '</th>'; };
  h.push('<table style="border-collapse:collapse;margin:6px 0 10px 0"><tr>',
    th('Link', '#D0D0D0'), th('Type', '#D0D0D0'), th('KPI', '#D0D0D0'), th('Weight<br>' + e(d.q), '#D0D0D0'), th('Unit', '#EAD1DC'),
    th(d.month + '<br>Target', '#EAD1DC'), th(d.month + ' Actual', '#CFE2F3'), th('Unit', '#FFF2CC'), th(d.month + '<br>%', '#FFF2CC'), th(d.month + ' %<br>*Weight', '#FFF2CC'), '</tr>');
  d.rows.forEach(function (r) {
    h.push('<tr><td style="' + td + '">' + (r.url ? '<a href="' + e(r.url) + '" style="color:#1155CC">' + e(r.link || 'Link') + '</a>' : e(r.link)) + '</td>',
      '<td style="' + td + 'background:' + bg(r.type) + '">' + e(r.type) + '</td><td style="' + td + '">' + e(r.kpi) + '</td>',
      '<td style="' + td + '">' + pc(r.w) + '</td><td style="' + td + '">' + e(r.unit) + '</td>',
      '<td style="' + td + '">' + (/%/.test(r.unit) ? pc(r.t) : num(r.t)) + '</td><td style="' + td + '">' + (/%/.test(r.unit) ? pc(r.a) : num(r.a)) + '</td>',
      '<td style="' + td + '">' + e(r.unit) + '</td><td style="' + td + '">' + pc(r.p) + '</td><td style="' + td + '">' + pc(r.pw) + '</td></tr>');
  });
  h.push('<tr>' + new Array(10).join('<td style="' + td + '"></td>') + '<td style="' + td + '"><b>' + pc(d.total) + '</b></td></tr></table>');
  [['2. Analysis & Next Actions KPI', f.analysis], ['3. Highlights & Challenges KPI', f.highlights]].forEach(function (s) {
    var ls = lines(s[1]); if (!ls.length) return;
    h.push('<div style="margin-top:8px"><b>' + s[0] + '</b></div><ul style="margin:4px 0 8px 0">' + ls.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>');
  });
  if (f.sign) h.push('<div style="margin-top:10px">' + e(f.sign).replace(/\n/g, '<br>') + '</div>');
  h.push('</div>');
  return h.join('');
}
function kscMailPreview(f) {
  var d = kscMailData(f.pic, f.month); if (!d.ok) return d;
  return { ok: true, html: kscMailHtml_(d, f) };
}
function kscMailSend(f) {
  var d = kscMailData(f.pic, f.month); if (!d.ok) return d;
  var split = function (s) { return String(s || '').split(/[,;\s]+/).map(function (x) { return x.trim(); }).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); }); };
  var to = split(f.to), cc = split(f.cc);
  if (!to.length) return { ok: false, error: 'Chưa có người nhận (To).' };
  var html = kscMailHtml_(d, f), subject = f.subject || ('KPI T' + kscMon_(d.month) + ' · ' + d.pic);
  var plain = html.replace(/<br>/g, '\n').replace(/<\/(div|tr|li)>/g, '\n').replace(/<\/t[dh]>/g, '\t').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  MailApp.sendEmail({ to: to.join(','), cc: cc.join(','), subject: subject, htmlBody: html, body: plain, name: d.full });
  var me = ''; try { me = Session.getActiveUser().getEmail(); } catch (e) {}
  try {
    var ss = SpreadsheetApp.getActive(), lg = ss.getSheetByName(KSC_MAIL.LOG);
    if (!lg) { lg = ss.insertSheet(KSC_MAIL.LOG); lg.getRange(1, 1, 1, 8).setValues([['Thời điểm', 'Người gửi', 'PIC', 'Tháng', 'KPI tháng', 'To', 'CC', 'Tiêu đề']]).setFontWeight('bold'); try { lg.hideSheet(); } catch (e1) {} }
    lg.appendRow([Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm'), me, d.pic, d.month, d.total == null ? '' : d.total, to.join(', '), cc.join(', '), subject]);
  } catch (e2) {}
  if (f.lang === 'en') return { ok: true, msg: 'KPI email ' + kscMon_(d.month) + ' sent to ' + to.join(', ') + (cc.length ? ' · CC ' + cc.join(', ') : '') };
  return { ok: true, msg: 'Đã gửi email KPI T' + kscMon_(d.month) + ' tới ' + to.join(', ') + (cc.length ? ' · CC ' + cc.join(', ') : '') };
}

var KSC_MAIL_HTML = [
'<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">',
'<style>body{font-family:Aptos,Inter,Arial,sans-serif;color:#1A1A1A;margin:0;padding:12px 16px;font-size:13px}',
'h2{margin:0 0 2px;color:#003047;font-size:17px}.sub{color:#666;margin-bottom:8px}',
'.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.full{grid-column:1/-1}',
'label{display:block;font-weight:700;color:#003047;margin:6px 0 3px;font-size:12px}',
'input,select,textarea{width:100%;box-sizing:border-box;padding:6px;font:inherit;border:1px solid #CFE2F3;border-radius:6px}textarea{min-height:64px;resize:vertical}',
'.row{display:flex;gap:6px;align-items:center}.row select{flex:1}.row button{white-space:nowrap}',
'.msg{margin-top:8px;padding:7px 10px;background:#F0F7FF;border-left:4px solid #3A5CAA;min-height:18px}.warn{border-left-color:#B45309;background:#FFF8E1}',
'.btns{margin-top:10px;text-align:right}button{font-family:inherit;font-size:13px;padding:6px 12px;margin-left:6px;border-radius:6px;border:1px solid #3A5CAA;background:#fff;color:#3A5CAA;cursor:pointer}',
'button.p{background:#3A5CAA;color:#fff}button:disabled{opacity:.5}',
'#pv{margin-top:10px;border:1px solid #CFE2F3;border-radius:6px;padding:10px;max-height:300px;overflow:auto;display:none}</style></head><body>',
'<h2>✉ Email KPI tháng</h2><div class="sub">Bảng KPI lấy đúng số của sheet 5. Member KPI Monthly. Lời chào và phần nhận xét anh / chị tự soạn.</div>',
'<div class="grid">',
' <div><label>Tháng</label><select id="mon" onchange="load()"></select></div>',
' <div><label>Người báo cáo (PIC)</label><select id="pic" onchange="load()"></select></div>',
' <div><label>Tiêu đề</label><input id="subj"></div>',
' <div class="full"><label>Gửi tới (To)</label><input id="to"></div>',
' <div class="full"><label>CC</label><input id="cc"></div>',
' <div class="full"><label>Thêm người nhận</label><div class="row"><select id="book"></select><button onclick="addR(\'to\')">+ To</button><button onclick="addR(\'cc\')">+ CC</button></div></div>',
' <div><label>Lời chào</label><textarea id="greet" style="min-height:40px"></textarea></div>',
' <div><label>Câu mở đầu</label><textarea id="intro" style="min-height:40px"></textarea></div>',
' <div><label>Chữ ký</label><textarea id="sign" style="min-height:40px"></textarea></div>',
' <div class="full"><label><input type="checkbox" id="showq" checked style="width:auto"> Thêm dòng KPI quý đến tháng này</label></div>',
' <div class="full"><label>2. Analysis & Next Actions KPI (mỗi dòng 1 ý)</label><textarea id="ana"></textarea></div>',
' <div class="full"><label>3. Highlights & Challenges KPI (mỗi dòng 1 ý)</label><textarea id="hil"></textarea></div>',
'</div>',
'<div class="msg" id="msg">Đang tải…</div><div id="pv"></div>',
'<div class="btns"><button onclick="prev()">Xem trước</button><button id="go" class="p" onclick="send()" disabled>Gửi email</button><button onclick="google.script.host.close()">Đóng</button></div>',
'<script>',
'var O=null,D=null;function $(i){return document.getElementById(i);}',
'function mlab(m){return String(m).slice(4)+"/"+String(m).slice(0,4);}',
'google.script.run.withSuccessHandler(function(o){O=o;',
' $("mon").innerHTML=o.months.map(function(m){return "<option value=\\""+m+"\\""+(m===o.def?" selected":"")+">T"+mlab(m)+"</option>";}).join("");',
' $("pic").innerHTML=o.pics.map(function(p){return "<option"+(p===o.me?" selected":"")+">"+p+"</option>";}).join("");',
' $("book").innerHTML=o.book.map(function(b){return "<option value=\\""+b.e+"\\">"+b.n+" · "+b.e+"</option>";}).join("");',
' if(!o.m5){$("msg").innerHTML="⚠ Không đọc được sheet 5. Member KPI Monthly";return;} load();}).withFailureHandler(err).kscMailOptions();',
'function err(e){$("msg").className="msg warn";$("msg").innerHTML="⚠ "+(e.message||e);$("go").disabled=false;}',
'function load(){$("go").disabled=true;$("msg").className="msg";$("msg").innerHTML="Đang đọc số liệu KPI…";',
' google.script.run.withSuccessHandler(function(d){if(!d.ok){err(d.error);return;}D=d;var m=mlab(d.month);',
'  $("to").value=d.to;$("cc").value=d.cc;$("subj").value="KPI T"+m+" · "+d.pic;',
'  if(!$("greet").dataset.t){$("greet").value="Dear "+(d.toName||"")+" ,";}',
'  if(!$("intro").dataset.t){$("intro").value="Em gửi lại KPI tháng "+m.replace("/"," ")+" của em ạ :";}',
'  if(!$("sign").dataset.t){$("sign").value="Em "+d.pic;}',
'  $("msg").className="msg"+(d.miss.length?" warn":"");',
'  $("msg").innerHTML="KPI T"+m+": <b>"+(d.total==null?"chưa có số":Math.round(d.total*100)+"%")+"</b> · "+d.rows.length+" KPI có trọng số"+(d.qtotal!=null?" · "+d.q+" đến nay: <b>"+Math.round(d.qtotal*100)+"%</b>":"")+(d.miss.length?"<br>⚠ Chưa có email của: "+d.miss.join(", ")+" (nhập ở sheet KPI EMAIL DIRECTORY)":"");',
'  $("go").disabled=false;}).withFailureHandler(err).kscMailData($("pic").value,$("mon").value);}',
'["greet","intro","sign"].forEach(function(i){$(i).addEventListener("input",function(){this.dataset.t="1";});});',
'function addR(f){var e=$("book").value;if(!e)return;var v=$(f).value.trim();if(v.split(/[,;\\s]+/).indexOf(e)<0)$(f).value=v?v+", "+e:e;}',
'function form(){return{pic:$("pic").value,month:$("mon").value,to:$("to").value,cc:$("cc").value,subject:$("subj").value,greeting:$("greet").value,intro:$("intro").value,sign:$("sign").value,showQ:$("showq").checked,analysis:$("ana").value,highlights:$("hil").value};}',
'function prev(){google.script.run.withSuccessHandler(function(r){if(!r.ok){err(r.error);return;}$("pv").style.display="block";$("pv").innerHTML=r.html;}).withFailureHandler(err).kscMailPreview(form());}',
'function send(){if(!confirm("Gửi email tới: "+$("to").value+($("cc").value?"\\nCC: "+$("cc").value:"")+" ?"))return;$("go").disabled=true;$("msg").innerHTML="Đang gửi…";',
' google.script.run.withSuccessHandler(function(r){if(!r.ok){err(r.error);return;}$("msg").className="msg";$("msg").innerHTML="✓ "+r.msg;}).withFailureHandler(err).kscMailSend(form());}',
'</script></body></html>'
].join('\n');

/* ════════════════ NGUỒN 7 · MKT OFFLINE VIỆT NAM (sự kiện) ════════════════
   File "2. Vietnam - Marketing Offline FY68" (backend của web app MKT offline; đổi link ở menu 🔗),
   sheet REPORT_EVENT (tiêu đề hàng 3): Month · Date · Event Name · Type of event · Target product · Segment ·
   Detail event folder link · Actual Participant · Actual sales - Jizai (Sheets) · Actual sales - Composite (pcs).
   Rule theo team Marketing (02/10/2026):
     C8-00  = Σ Actual sales - Composite (pcs) của các sự kiện trong tháng
     C9-00  = Σ Actual sales - Jizai (Sheets) của các sự kiện trong tháng
     C12-01 = số sự kiện trong tháng, Segment Dental/MMG, có Detail event folder link
     C12-02 = số sự kiện trong tháng, Segment Surgical/Eyeless, có Detail event folder link
     C15-01 = Σ Actual Participant của sự kiện trong tháng, Segment Dental/MMG
     C15-02 = Σ Actual Participant của sự kiện trong tháng, Segment Surgical/Eyeless
   Tháng = cột Month của REPORT_EVENT. Actual Participant / sales là công thức của file (đếm từ CUSTOMER LIST). */
var KSC_MOFF = {
  ID    : '16vIDYRhm6Cj9DN4C26rvbBPW1hF3vAnZ7lgl6Bd02w8',    // 2. Vietnam - Marketing Offline FY68 (backend của web app MKT offline)
  SHEET : 'REPORT_EVENT',
  WATCH : ['REPORT_EVENT', 'CUSTOMER LIST', 'ORDER LIST'],
  CODES : { comp: 'C8-00', jz: 'C9-00', evD: 'C12-01', evS: 'C12-02', ppD: 'C15-01', ppS: 'C15-02' },
  RULES : {
    'C8-00' : 'REPORT_EVENT · Σ Actual sales - Composite (pcs) của các sự kiện có Month = tháng.',
    'C9-00' : 'REPORT_EVENT · Σ Actual sales - Jizai (Sheets) của các sự kiện có Month = tháng.',
    'C12-01': 'REPORT_EVENT · số sự kiện có Month = tháng, Segment Dental/MMG và đã có Detail event folder link.',
    'C12-02': 'REPORT_EVENT · số sự kiện có Month = tháng, Segment Surgical/Eyeless và đã có Detail event folder link.',
    'C15-01': 'REPORT_EVENT · Σ Actual Participant của sự kiện có Month = tháng, Segment Dental/MMG.',
    'C15-02': 'REPORT_EVENT · Σ Actual Participant của sự kiện có Month = tháng, Segment Surgical/Eyeless.'
  }
};
function kscMoffId_() { var v = ''; try { v = PropertiesService.getScriptProperties().getProperty('KSC_ID_MOFF') || ''; } catch (e) {} return v || KSC_MOFF.ID; }
/* menu 🔗: xem / đổi link file MKT offline, chạy lại ngay (ghi đè cả số đã ghi sai ở tháng đã chốt) */
function kscSetMoffLink() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActive(), cur = kscMoffId_(), curName = '(không mở được)';
  try { curName = SpreadsheetApp.openById(cur).getName(); } catch (e) {}
  var r = ui.prompt('🔗 Link file MKT offline VN',
    'Đang đọc: ' + curName + '\nhttps://docs.google.com/spreadsheets/d/' + cur + '\n\nDán link Google Sheet của file MKT offline (file có sheet REPORT_EVENT). Để trống rồi bấm OK = giữ link hiện tại và chạy lại.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var txt = String(r.getResponseText() || '').trim(), m = /\/d\/([a-zA-Z0-9_-]{25,})/.exec(txt) || /^([a-zA-Z0-9_-]{25,})$/.exec(txt), id = m ? m[1] : cur;
  if (txt && !m) { ui.alert('Không nhận ra link Google Sheet: ' + txt); return; }
  var mss; try { mss = SpreadsheetApp.openById(id); } catch (e2) { ui.alert('Không mở được file (kiểm tra quyền truy cập của tài khoản đang chạy): ' + (e2 && e2.message || e2)); return; }
  if (!mss.getSheetByName(KSC_MOFF.SHEET)) { ui.alert('File "' + mss.getName() + '" không có sheet ' + KSC_MOFF.SHEET + '. Chưa đổi link.'); return; }
  PropertiesService.getScriptProperties().setProperty('KSC_ID_MOFF', id);
  var lock = LockService.getScriptLock(); lock.waitLock(60000);
  var res;
  try {
    try { kscEnsureTriggers_(ss); } catch (e3) {}
    var ctx = kscCtx_(ss);
    res = kscMoff_(ctx, 'manual', true); res.title = res.title || kscLabel_('moff'); res.codes = res.codes || [];
    kscRemember_('moff', res, 'manual');
    try { PropertiesService.getScriptProperties().setProperty('KSC_MOD_moff', String(DriveApp.getFileById(id).getLastUpdated().getTime())); } catch (e4) {}
    kscStatusSoon_(ss, true);
  } finally { lock.releaseLock(); }
  ui.alert('🔗 MKT offline VN', 'File: ' + mss.getName() + '\n\n' + (res.status === 'ok' ? '✓ ' : '⚠ ') + res.msg, ui.ButtonSet.OK);
}
function kscMoffSeg_(seg) { var s = kscNorm_(seg); return /dental|mmg/.test(s) ? 'D' : /surgical|eyeless|ophthal/.test(s) ? 'S' : ''; }
function kscMoffRead_(mss) {
  var sh = mss.getSheetByName(KSC_MOFF.SHEET);
  if (!sh) return { err: 'File Marketing Offline không có sheet "' + KSC_MOFF.SHEET + '"' };
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 40);
  if (lr < 2) return { rows: [], sheet: sh };
  var V = sh.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
  for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (h.indexOf('month') >= 0 && h.indexOf('segment') >= 0) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
  }
  if (hr < 0) return { err: 'Sheet REPORT_EVENT không có dòng tiêu đề (Month, Segment)' };
  function col(re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; }
  var cM = C['month'], cD = C['date'], cN = col(/^event name/), cT = col(/^type of event/), cP = col(/^target product/), cS = C['segment'],
      cL = col(/^detail event folder/), cPp = col(/^actual participant/), cJz = col(/^actual sales - jizai/), cCo = col(/^actual sales - composite/),
      cSt = col(/^action status/), cPl = col(/^place/);
  if ([cM, cS, cL, cPp, cJz, cCo].some(function (x) { return x == null; })) return { err: 'REPORT_EVENT thiếu cột (Month, Segment, Detail event folder link, Actual Participant, Actual sales - Jizai, Actual sales - Composite)' };
  var rows = [];
  for (var r = hr + 1; r < lr; r++) {
    var x = V[r], ym = kscIsDate_(x[cM]) ? kscYm_(x[cM]) : kscYm_(null, x[cM]); if (!ym) continue;
    var name = cN == null ? '' : String(x[cN] || '').trim(); if (!name && !String(x[cS] || '').trim()) continue;
    rows.push({ row: r + 1, ym: ym, date: cD == null ? '' : x[cD], name: name, type: cT == null ? '' : String(x[cT] || '').trim(), prod: cP == null ? '' : String(x[cP] || '').trim(),
      seg: kscMoffSeg_(x[cS]), segRaw: String(x[cS] || '').trim(), link: String(x[cL] || '').trim(), pp: kscNum_(x[cPp]) || 0, jz: kscNum_(x[cJz]) || 0, comp: kscNum_(x[cCo]) || 0,
      status: cSt == null ? '' : String(x[cSt] || '').trim(), place: cPl == null ? '' : String(x[cPl] || '').trim() });
  }
  return { rows: rows, sheet: sh };
}
function kscMoff_(ctx, why, force) {
  var mid = kscMoffId_(), mss = SpreadsheetApp.openById(mid), K = KSC_MOFF.CODES, L = ctx.L, PP = PropertiesService.getScriptProperties();
  if (PP.getProperty('KSC_MOFF_LASTID') !== mid) force = true;          // file khác lần trước: ghi đè số cũ (sửa số 0 đọc nhầm file)
  var out = { title: kscLabel_('moff'), file: mss.getName(), sheet: KSC_MOFF.SHEET, rules: KSC_MOFF.RULES, codeUrls: {} };
  var X = kscMoffRead_(mss);
  if (X.err) { out.status = 'error'; out.msg = X.err; return out; }
  try { out.url = kscUrl_(mss, X.sheet); } catch (eu) {}
  var data = {}, months = L.months.filter(function (m) { return m <= ctx.curYm; });
  var fyRows = X.rows.filter(function (r) { return L.months.indexOf(r.ym) >= 0; }).length;
  if (!fyRows) { out.status = 'error'; out.msg = 'File "' + mss.getName() + '" ▸ ' + KSC_MOFF.SHEET + ' có ' + X.rows.length + ' dòng nhưng không có sự kiện nào có Month thuộc ' + L.fy +
    ' ⇒ chưa ghi số. Kiểm tra link ở menu ⚡ KPI Sync ▸ 🔗 Link file MKT offline VN.'; out.codes = []; return out; }
  Object.keys(K).forEach(function (k) { data[K[k]] = {}; });
  months.forEach(function (m) {
    var ev = X.rows.filter(function (r) { return r.ym === m; });
    data[K.comp][m] = ev.reduce(function (s, r) { return s + r.comp; }, 0);
    data[K.jz][m] = ev.reduce(function (s, r) { return s + r.jz; }, 0);
    data[K.evD][m] = ev.filter(function (r) { return r.seg === 'D' && r.link; }).length;
    data[K.evS][m] = ev.filter(function (r) { return r.seg === 'S' && r.link; }).length;
    data[K.ppD][m] = ev.filter(function (r) { return r.seg === 'D'; }).reduce(function (s, r) { return s + r.pp; }, 0);
    data[K.ppS][m] = ev.filter(function (r) { return r.seg === 'S'; }).reduce(function (s, r) { return s + r.pp; }, 0);
  });
  Object.keys(data).forEach(function (c) { if (L.rows[c] == null) delete data[c]; });
  out.codes = Object.keys(data);
  var st = kscWrite_(ctx, 'moff', data, { why: why, force: !!force });
  PP.setProperty('KSC_MOFF_LASTID', mid);
  var noSeg = X.rows.filter(function (r) { return !r.seg && months.indexOf(r.ym) >= 0; }).length;
  var last = months.slice(-2).map(function (m) {
    return m + ': ' + data[K.evD][m] + ' sự kiện Dental/MMG, ' + data[K.evS][m] + ' Surgical/Eyeless (có folder) · ' + data[K.ppD][m] + ' / ' + data[K.ppS][m] + ' người tham dự · Composite ' + data[K.comp][m] + ' · JIZAI ' + data[K.jz][m];
  }).join(' | ');
  return kscResult_(out, st, 'File "' + mss.getName() + '" · ' + X.rows.length + ' dòng REPORT_EVENT (' + fyRows + ' dòng ' + L.fy + ') · ' + last + (noSeg ? ' · ' + noSeg + ' dòng chưa ghi Segment' : ''));
}
/* ngày sự kiện dạng 20260910 / 20261026-29 / ngày tháng */
function kscMoffDate_(d, ym) {
  if (kscIsDate_(d)) return Utilities.formatDate(d, KSC.TZ, 'dd/MM/yyyy');
  var s = String(d == null ? '' : d).replace(/\.0+$/, '').trim(), m = /^(\d{4})(\d{2})(\d{2})(?:-(\d{1,2}))?/.exec(s);
  if (m) return m[3] + (m[4] ? '-' + m[4] : '') + '/' + m[2] + '/' + m[1];
  return s || ('tháng ' + kscMon_(ym));
}
/* câu giải thích cho PDF */
function kscMoffExplain_(code, X, R, E, reach, A) {
  var MX = E.moff(), K = KSC_MOFF.CODES, out = [];
  X.label = 'Marketing Offline VN'; X.sheet = KSC_MOFF.SHEET; X.url = MX.url || '';
  if (MX.err) return ['Chưa đọc được file Marketing Offline (' + MX.err + ').'];
  var ev = MX.rows.filter(function (r) { return R.eff.indexOf(r.ym) >= 0; });
  var segOf = code === K.evD || code === K.ppD ? 'D' : code === K.evS || code === K.ppS ? 'S' : '';
  var segName = segOf === 'D' ? 'Dental/MMG' : 'Surgical/Eyeless';
  var line = function (r, extra) { return '• ' + kscMoffDate_(r.date, r.ym) + ': ' + (String(r.name || '').replace(/^\s*\d{8}(-\d{1,2})?\s*/, '') || '(chưa ghi tên)') + (r.type ? ' (' + r.type + ')' : '') + (extra ? ', ' + extra : ''); };
  if (code === K.evD || code === K.evS) {
    var mine = ev.filter(function (r) { return r.seg === segOf; }), ok = mine.filter(function (r) { return r.link; }), no = mine.filter(function (r) { return !r.link; });
    out.push((ok.length ? ok.length + ' sự kiện ' + segName + ' đã có folder báo cáo' : 'Chưa có sự kiện ' + segName + ' nào có folder báo cáo') + reach + (ok.length ? ':' : '.'));
    ok.forEach(function (r) { out.push(line(r, r.pp ? r.pp + ' người tham dự' : '')); });
    if (no.length) out.push('Chưa tính vì chưa có Detail event folder link: ' + no.map(function (r) { return r.name || '(chưa ghi tên)'; }).join('; ') + '.');
    return out;
  }
  if (code === K.ppD || code === K.ppS) {
    var ms = ev.filter(function (r) { return r.seg === segOf && r.pp; });
    out.push((A != null ? A : ms.reduce(function (s, r) { return s + r.pp; }, 0)) + ' người tham dự sự kiện ' + segName + reach + (ms.length ? ':' : '.'));
    ms.forEach(function (r) { out.push(line(r, r.pp + ' người')); });
    return out;
  }
  var jz = code === K.jz, f = jz ? 'jz' : 'comp', unit = jz ? 'Sheets JIZAI' : 'Pcs Composite';
  var hit = ev.filter(function (r) { return r[f]; });
  out.push('Bán ' + (A != null ? A : hit.reduce(function (s, r) { return s + r[f]; }, 0)) + ' ' + unit + ' qua sự kiện' + reach + (hit.length ? ':' : '.'));
  hit.forEach(function (r) { out.push(line(r, kscFmtNum_(r[f]) + ' ' + (jz ? 'sheets' : 'pcs'))); });
  return out;
}

/* ════════════════ TIỆN ÍCH ════════════════ */
function kscNorm_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
}
function kscIsDate_(d) { return Object.prototype.toString.call(d) === '[object Date]'; }
function kscNum_(v) { if (v === '' || v === null || v === undefined) return null; var n = Number(v); return isNaN(n) ? null : n; }
function kscEq_(a, b) { var x = kscNum_(a), y = kscNum_(b); if (x == null || y == null) return x == null && y == null; return Math.abs(x - y) < 1e-6; }
function kscYm_(d, month) {
  if (kscIsDate_(d) && !isNaN(d.getTime())) return Number(Utilities.formatDate(d, KSC.TZ, 'yyyyMM'));
  var s = String(d || '').trim(), x;
  if ((x = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s))) return Number(x[3]) * 100 + Number(x[2]);
  if ((x = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(s))) return Number(x[1]) * 100 + Number(x[2]);
  var n = String(month === null || month === undefined ? '' : month).replace(/\.0+$/, '').replace(/\D/g, '');
  return /^20\d{4}$/.test(n) ? Number(n) : 0;
}

/* ════════════════ GIAO DIỆN HỘP THOẠI CẬP NHẬT MANUAL ════════════════ */
var KSC_HTML = [
'<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">',
'<style>',
' body{font-family:Aptos,Inter,Lexend,Arial,sans-serif;color:#1A1A1A;margin:0;padding:14px 18px;font-size:13px}',
' h2{margin:0 0 2px;color:#003047;font-size:18px}.sub{color:#666;margin-bottom:12px}',
' .bar{height:14px;background:#F0F7FF;border:1px solid #CFE2F3;border-radius:8px;overflow:hidden}',
' #fill{height:100%;width:0;background:#3A5CAA;transition:width .35s}',
' .now{margin:10px 0 8px;padding:8px 10px;background:#F0F7FF;border-left:4px solid #3A5CAA;min-height:34px}',
' .now b{color:#003047}',
' ul{list-style:none;margin:0;padding:0;max-height:300px;overflow:auto;border:1px solid #D9D9D9;border-radius:6px}',
' li{padding:7px 10px;border-bottom:1px solid #EEE}li:last-child{border-bottom:0}',
' .t{font-weight:700;color:#003047}.m{color:#595959;font-size:12px}.r{margin-top:3px;font-size:12px}',
' .ok .ic{color:#0a7a3d}.warn .ic,.error .ic{color:#b45309}.skip .ic{color:#8A8A8A}.run .ic{color:#3A5CAA}',
' .ic{display:inline-block;width:18px;font-weight:700}',
' .sum{margin-top:10px;padding:8px 10px;border:1px solid #FFE100;background:#FFF8E1;display:none}',
' .btns{margin-top:12px;text-align:right}button{font-family:inherit;font-size:13px;padding:7px 14px;margin-left:6px;border-radius:6px;border:1px solid #3A5CAA;background:#fff;color:#3A5CAA;cursor:pointer}',
' button.p{background:#3A5CAA;color:#fff}button:disabled{opacity:.5;cursor:default}',
'</style></head><body>',
'<h2>🔄 Cập nhật Manual · 3. Detail KPI</h2>',
'<div class="sub">Đọc lần lượt mọi backend và ghi số Actual vào file KPI. Không cần đóng hộp thoại khi đang chạy.</div>',
'<div class="bar"><div id="fill"></div></div>',
'<div class="now" id="now">Đang lấy danh sách nguồn…</div>',
'<ul id="list"></ul>',
'<div class="sum" id="sum"></div>',
'<div class="btns"><button id="again" onclick="start()" disabled>Chạy lại</button>',
'<button onclick="google.script.run.kscShowStatus()">Mở KPI SYNC STATUS</button>',
'<button class="p" onclick="google.script.host.close()">Đóng</button></div>',
'<script>',
'var steps=[],i=0,tot={cells:0,err:0,rep:0},t0;',
'function esc(s){return String(s==null?"":s).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}',
'function render(){var h="";steps.forEach(function(s,k){var st=s.res?s.res.status:(k===i&&s.running?"run":"");',
' var ic=st==="ok"?"✓":st==="skip"?"·":st==="run"?"⟳":st?"⚠":"○";',
' h+="<li class=\\""+st+"\\"><span class=ic>"+ic+"</span><span class=t>"+esc(s.title)+"</span>"+',
' "<div class=m>📄 "+esc(s.res&&s.res.file?s.res.file:s.file)+" ▸ "+esc(s.res&&s.res.sheet?s.res.sheet:s.sheet)+"</div>"+',
' "<div class=m>🔑 Mã KPI: "+esc(s.res&&s.res.codes&&s.res.codes.length?s.res.codes.join(", "):s.codes)+"</div>"+',
' (s.res?"<div class=r>"+esc(s.res.msg)+"</div>":"")+"</li>";});',
' document.getElementById("list").innerHTML=h;',
' document.getElementById("fill").style.width=(steps.length?Math.round(i/steps.length*100):0)+"%";}',
'function start(){document.getElementById("again").disabled=true;document.getElementById("sum").style.display="none";',
' i=0;tot={cells:0,err:0,rep:0};t0=Date.now();',
' google.script.run.withSuccessHandler(function(p){steps=p;render();next();}).withFailureHandler(function(e){now("⚠ "+e.message);}).kscPlan();}',
'function now(h){document.getElementById("now").innerHTML=h;}',
'function next(){if(i>=steps.length){return finish();}var s=steps[i];s.running=true;render();',
' now("Bước "+(i+1)+"/"+steps.length+" · <b>"+esc(s.title)+"</b><br>Đang đọc: "+esc(s.file)+" ▸ "+esc(s.sheet)+"<br>Mã KPI: "+esc(s.codes));',
' google.script.run.withSuccessHandler(function(r){s.res=r||{status:"error",msg:"Không có kết quả"};done();})',
' .withFailureHandler(function(e){s.res={status:"error",msg:e.message};done();}).kscRunStep(s.id);}',
'function done(){var r=steps[i].res;tot.cells+=r.cells||0;tot.rep+=r.replaced||0;if(r.status==="error")tot.err++;i++;render();next();}',
'function finish(){document.getElementById("fill").style.width="100%";var sec=Math.round((Date.now()-t0)/1000);',
' now("<b>Hoàn tất</b> sau "+sec+" giây.");var el=document.getElementById("sum");el.style.display="block";',
' el.innerHTML="Đã ghi <b>"+tot.cells+"</b> ô vào 3. Detail KPI"+(tot.rep?" · thay "+tot.rep+" ô công thức (lưu ở _SYNC_REPLACED)":"")+',
' (tot.err?" · <b>"+tot.err+"</b> nguồn báo lỗi, xem dòng ⚠ ở trên":" · không có lỗi")+". Chi tiết từng mã ở sheet KPI SYNC STATUS.";',
' document.getElementById("again").disabled=false;}',
'start();',
'</script></body></html>'
].join('\n');