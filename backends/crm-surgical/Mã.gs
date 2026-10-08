/*************************************************************************************************
 * MMH CRM — Google Apps Script backend  (v10.10)  ·  MỘT FILE CODE CHO CẢ 3 NHÓM
 * ⭐ v10.10 (05/10/2026) · BÁO CÁO THÁNG: bỏ hạng mục Management-KPI · nhóm Marketing (Marketing-Event cuối cùng) xếp xuống cuối
 *   Áp dụng cho email, PDF cá nhân và 2 file xuất cả team.
 * ⭐ v10.9 (05/10/2026) · BÁO CÁO THÁNG CẢ TEAM
 *   monthlyReport option = teamFiles ⇒ 2 file PDF cho cả nhóm: Report tháng đã chọn + Plan tháng kế tiếp, mỗi file trình bày
 *   cuốn chiếu từng người theo khu vực: miền Bắc → miền Trung → miền Nam (Dental: Viet → Vinh → Phuong). Không gửi email.
 * ⭐ v10.8 (05/10/2026) · BÁO CÁO TUẦN CHUẨN HOÁ · RULE TRẠNG THÁI · CÔNG TÁC GHI THẲNG FILE BUSINESS TRIP · KHÔNG GỬI TRÙNG
 *   ① Email (và PDF) báo cáo tuần dùng mẫu chung với nhóm Thái: dòng tổng "Đi địa bàn" đứng đầu mục đi địa bàn
 *      (tiến độ = số cuộc hẹn Completed / số đã lên kế hoạch; kết quả liệt kê việc đã làm / chưa làm / quá hạn),
 *      account "MMH" tách thành "Làm việc ở văn phòng / Họp team", việc chưa tới ngày không hiện 100%.
 *   ② Lưu hoạt động: chưa tới ngày bắt đầu ⇒ không cho Completed; Completed sớm ⇒ Finish date = hôm nay (quá hạn giữ ngày cũ).
 *   ③ Đề xuất công tác: actions tripMaster2 / tripPropose2 ghi THẲNG vào sheet "MMH Travel report" của file Business Trip
 *      (cột D → O, Approval Status = Not Yet, giữ nguyên các cột công thức) rồi gửi email xin duyệt theo sheet Master.
 *      Tài khoản chạy CRM backend cần quyền Editor trên file Business Trip.
 *   ④ weeklyReport / monthlyReport / tripPropose2 có chống gửi trùng theo mã yêu cầu (rid).
 * ⭐ v10.7 (03/10/2026) · MỞ MỚI SURGICAL KHÔNG CẦN ĐƠN HÀNG · "miền Bắc / Trung / Nam" · TIỀN $ CÙNG KIỂU APP
 *   ① Case mở mới nhóm Surgical / Eyeless: không cần sales order — đủ điều kiện khi có thông tin account đầy đủ, ngày NPP
 *      xác nhận (= tháng tính KPI), lịch sử chăm sóc trên báo cáo tuần (bắt buộc) và chứng từ xác nhận NPP (ảnh chụp email).
 *   ② Tên KPI rút gọn ghi "miền Bắc / miền Trung / miền Nam". Email KPI: tiền USD dạng $1,234 như app.
 * ⭐ v10.6 (03/10/2026) · SỐ KPI TRÊN APP LUÔN THEO DỮ LIỆU MỚI NHẤT
 *   Lỗi: app đọc KPI qua bộ nhớ đệm (cache theo phiên bản tab). C5 / C6 / C7 được code tính lại SAU khi app đã đọc, và lượt
 *   đẩy KPI không đổi phiên bản tab "kpi" ⇒ app nhận lại bản cache cũ. Nhập tay trên sheet (không qua app) thì C5 / C6 / C7
 *   chỉ tính lại khi có trigger onChange; trigger đó còn bị sửa lệch ở v10.1 (thêm dòng tay không làm app tải lại).
 *   Sửa: ① mỗi lần app đọc KPI (cache trượt) code tính lại C5 / C6 / C7 trước khi đọc tab 9; ② tính lại có thay đổi hoặc
 *   đẩy được ô nào lên file KPI ⇒ đổi phiên bản "kpi" ⇒ app tải số mới; ③ sửa lại trigger onChange; ④ kiểm tra định kỳ
 *   (sheetWatch_) thấy tab 3 đổi do gõ tay ⇒ tính lại + đẩy KPI ngay.
 * ⭐ v10.5 (03/10/2026) · BỎ RULE CHỐT SỐ THÁNG — CRM ⇄ FILE KPI REALTIME MỌI THÁNG
 *   Không còn khoá "16:00 ngày 2 tháng sau": thêm / sửa / xoá dữ liệu của bất kỳ tháng nào ⇒ tab 9 tính lại ⇒ đẩy ngay
 *   lên 3. Detail KPI (cần file KPI KpiSyncCenter v1.18 để phía file KPI cũng bỏ khoá). Không cần bấm thủ công.
 * ⭐ v10.4 (03/10/2026) · REALTIME CRM → APP → FILE KPI + CỬA SỔ NHẬN SỐ TRỄ CHO THÁNG ĐÃ CHỐT
 *   ① kpiPush trả về số ô đã ghi + các tháng bị khoá (app báo rõ "tháng 09 đã chốt") và xoá cache Báo cáo KPI để app đọc số mới ngay.
 *   ② Tháng đã chốt (16:00 ngày 2 tháng sau) vẫn khoá như rule KPI. Muốn nhận đơn / hoạt động nhập trễ của 1 tháng đã chốt:
 *      quản lý mở "cửa sổ nhận số trễ" (tháng + hạn) trên app (tab KPI ▸ 🔓) hoặc menu file KPI — cả CRM lẫn file KPI cùng đọc
 *      sheet _CRM_LINKS!J1:K1 của file KPI. Hết hạn tự khoá lại.
 * ⭐ v10.3 (03/10/2026) · ĐỌC ĐÚNG FILE KPI + EMAIL KPI TRANG TRỌNG + RULE TARGET = 0
 *   ① Báo cáo KPI / KPI cá nhân đọc file KPI ở ô D9 tab KPI (file KPI v1.16 tự ghi link của nó vào D9) thay vì link
 *      cứng trong code (K68_MASTER_LINK đang trỏ tới một file KPI cũ — target C5-01 = 7.490 thay vì 5.617).
 *   ② Email báo cáo KPI: dạng thư trang trọng, font Aptos, 1 bảng (nhóm · KPI · trọng số · target · actual · % · thanh tiến độ).
 *   ③ Target = 0 trong tháng (kỳ đã tới) ⇒ đạt 100% và nhận đủ trọng số; tên KPI rút gọn (VN / EN), tên đầy đủ khi rê chuột.
 * ⭐ v10.2 (03/10/2026) · SỬA THÁNG 09 ĐÃ CHỐT CHẮC CHẮN CHẠY + KPI CÁ NHÂN ĐỌC ĐỦ SỐ
 *   ① Lượt sửa tháng đã chốt (C1 · C5 · C6 · C7) chỉ đánh dấu xong khi đã THẬT SỰ đẩy lên file KPI (bản 10.1 có thể đánh dấu
 *      xong ở lượt chỉ dựng lại tab 9 ⇒ số tháng 09 không được sửa). Chạy tự động ở: lần lưu kế tiếp trên app, nút
 *      "⟳ Đồng bộ file KPI FY68", naSetup, trigger hằng ngày, menu ⑮.
 *   ② Tab KPI cá nhân / Báo cáo KPI: Target, Actual lấy từ 3. Detail KPI khi sheet 5 trống; tổng % × W tự cộng khi không đọc được dòng TOTAL.
 * ⭐ v10.1 (03/10/2026) · KPI ĐƠN HÀNG = ĐÚNG SỐ TRÊN APP · TỶ GIÁ THEO THÁNG · SỬA SỐ THÁNG 9 BỊ KHOÁ
 *   ① C5 / C6 / C7 không còn là công thức tab 9: code tự tính từ tab 3. SALE ORDER (đúng cách app đọc: PIC / Month
 *      tự bù theo account như app, khớp PIC theo tên chính xác) rồi ghi số vào tab 9 ⇒ số trên app = tab 9 = file KPI.
 *      Tính lại mỗi lần lưu trên app, mỗi lần đồng bộ, và khi sửa tay tab 3 (nếu đã bật trigger menu ⑥).
 *   ② Tỷ giá VND/USD theo tháng (C5): nhập trên app (nút 💱 Tỷ giá), tháng chưa nhập dùng tỷ giá của tháng gần nhất
 *      trước đó; chưa nhập gì = 26.050. Lưu ở Script Properties (K68_RATES), dựng lại tab 9 không mất.
 *   ③ Sửa 1 lần các tháng đã chốt của C1 / C5 / C6 / C7 (mã đổi rule ở v10.0): ví dụ C1-05 của Khang tháng 09 = 3
 *      là số cũ đếm theo "Customer code mở mới" (3 account mở tháng 9), không phải số buổi thuyết trình. Lần đẩy KPI
 *      đầu tiên sau khi dán code sẽ ghi đè các ô đó theo rule mới (chỉ 4 nhóm mã này). Chạy lại được: menu ⑮.
 * ⭐ v10.0 (03/10/2026) · ĐƠN HÀNG NHANH + KHÔNG TRÙNG · KPI ĐƠN HÀNG ĐÚNG RULE · MỞ MỚI ĐỊA BÀN & SKU MỚI · BÁO CÁO KPI
 *   ① Chống ghi trùng: mỗi lần lưu app gửi kèm mã yêu cầu (rid). Mạng chậm, app / trình duyệt gửi lại
 *      cùng yêu cầu ⇒ backend trả lại kết quả lần đầu, KHÔNG ghi thêm dòng. Đơn hàng còn đối chiếu thêm
 *      cột "Req ID" của sheet _ORDER_LOG (bên trong khoá ghi) nên kể cả 2 yêu cầu tới cùng lúc cũng chỉ ghi 1 lần.
 *   ② Lưu nhanh: app gửi push=0 ⇒ lưu xong trả lời ngay; app gọi action kpiPush ở nền vài giây sau
 *      (gom nhiều lần lưu thành 1 lượt đẩy KPI). App cũ không gửi push=0 vẫn đẩy KPI ngay như v9.7.
 *   ③ KPI tab 9 (tự dựng lại 1 lần khi đồng bộ, giữ ô nhập tay — nhãn bố cục k68v6):
 *      · C6 Composite / C7 JIZAI: chỉ cộng số lượng của đơn có Partner là NPP phụ trách của sales đó
 *        (bảng K68_NPP: Viet → Nam Dũng · Vinh → SPI · Phuong → Meci / Việt Thái).
 *      · C5 Sales Amount Supported: tổng Amount mọi đơn của sales trong tháng ÷ tỷ giá (gồm cả JIZAI, Composite).
 *      · C1 New account & new SKU: đếm case Status = Approved ở sheet "16. NEW ACCOUNT & SKU" theo PIC + Month
 *        (Dental chỉ tính Account type = Dealer, đúng tên mã C1-01 → C1-03). Bỏ dòng "SKU mới" nhập tay.
 *   ④ Module Mở mới địa bàn & SKU mới (actions na…): sheet 16, chứng từ lưu folder Drive của nhóm theo tháng,
 *      tên file PIC_ngàythángnăm_Account_SKU, email xin xác nhận (To quản lý · CC Director + vtt.hoa, kèm file),
 *      quản lý xác nhận / từ chối trên CRM (từ chối ⇒ xoá chứng từ, bắt buộc ghi lý do), email kết quả.
 *   ⑤ Báo cáo KPI tháng (actions kr…): đọc sheet 5. Member KPI Monthly của file MMH KPI FY68, email trực quan.
 *   Cài: dán toàn bộ file ▸ Lưu ▸ chạy hàm naSetup một lần (cấp quyền Drive + Gmail, tạo sheet 16) ▸
 *        Deploy ▸ Manage deployments ▸ Edit ▸ Version: New version ▸ Deploy.
 * ⭐ v9.7 (02/10/2026) · KPI REALTIME TỪ APP: sales lưu đơn hàng (3. SALE ORDER), đi địa bàn, account, CBC,
 *   product presentation hoặc xoá dòng trên app ⇒ ngay sau khi lưu, code đẩy số KPI của tab 9 lên file MMH KPI FY68
 *   (3. Detail KPI nhảy số sau vài giây, không chờ trigger 1 phút). Lý do: dữ liệu do web app ghi thì Google
 *   không phát sự kiện "sửa file", nên file KPI tổng trước đây chỉ biết sau 1 đến vài phút.
 *   Tháng đã chốt (sau 16:00 ngày 2 tháng sau) vẫn giữ nguyên theo quy định KPI. Kết quả đẩy trả về app ở trường kpiPush.
 *   Cài: dán code ▸ Deploy ▸ Manage deployments ▸ Edit ▸ Version: New version ▸ Deploy (bắt buộc để app dùng code mới).
 * ⭐ v9.6 (02/10/2026) · DOANH SỐ NPP (MÃ F) THEO THÁNG: Target, Actual mã F là số của từng tháng (không lũy kế),
 *   Aggregation = Sum, kết quả FY = tổng 12 tháng. File KPI (KpiSyncCenter v1.13) tự đổi Target sang theo tháng.
 *   Sau khi dán code: mở từng file CRM ▸ menu ⑪ "Tạo lại tab KPI".
 * ⭐ v9.5 (02/10/2026) · TAB KPI HOÀN TOÀN BẰNG TIẾNG ANH
 *   ① Tab KPI đổi tên "9. MỤC TIÊU & KPI" thành "9. TARGET & KPI" (code tự đổi tên tab cũ, không mất dữ liệu).
 *   ② Tiêu đề, chú thích, tên KPI (đúng tên trong file MMH KPI FY68), đơn vị, vai trò, nguồn / cách tính: tiếng Anh.
 *      Ô "Visits with photo only" (D6): giá trị cũ CÓ / KHÔNG tự chuyển sang YES / NO.
 *   ③ Công thức, mã KPI, cột A (nhãn máy đọc) giữ nguyên ⇒ app và file KPI tổng đọc như cũ.
 *   Sau khi dán code vào cả 3 file CRM (Dental, Surgical, Eyeless): mở từng file ▸ menu MMH CRM ▸
 *   ⑪ "Tạo lại tab KPI theo file KPI FY68" (ô nhập tay được giữ nguyên).
 * ⭐ v9.4 (02/10/2026) — KPI FY68: lượt viếng thăm / sự kiện có Task Status = Cancel KHÔNG còn được đếm
 *   (C3-01 → C3-09, sự kiện KOL). Sau khi dán code: mở file CRM ▸ menu ⑪ "Tạo lại tab KPI theo file KPI FY68"
 *   để công thức tab 9 cập nhật (ô nhập tay được giữ nguyên). Không đổi gì khác.
 * ⭐ v9.3 (01/10/2026) — XOÁ ACCOUNT / CBC CHO MỌI NHÓM + DANH BẠ CBC KHÔNG BỊ CẮT
 *   ① Action mới deleteAccount: lần 1 xem trước (số CBC, số lượt đi địa bàn), lần 2 (confirm=1) xoá account
 *      kèm toàn bộ CBC của account đó; lượt đi địa bàn giữ lại làm lịch sử. Ghi nhật ký _CUSTOMER_LOG.
 *   ② deleteRow: sales được xoá account / CBC / task do CHÍNH MÌNH phụ trách (trước đây chỉ quản lý).
 *   ③ list tab CBC: trần 15.000 dòng (trước 8.000) và xếp DÒNG MỚI NHẤT lên đầu ⇒ khách event mới đổ vào
 *      (chưa có Customer code / CBC code) không còn bị đẩy xuống cuối rồi bị cắt mất.
 * ⭐ v9.2 — NHẬT KÝ DỮ LIỆU KHÁCH HÀNG: mỗi lần thêm / sửa / xoá Account, CBC ghi 1 dòng vào sheet "_CUSTOMER_LOG"
 *          (thời gian, PIC, trường đã đổi) · Dashboard thống kê theo tuần / khoảng thời gian
 * MANI Medical Hanoi · Dental / Surgical / Eyeless Sales Team
 *
 * ⭐ v9.1 — HỌP TUẦN · THẦU: NHẬP GIÁ THEO MÃ SẢN PHẨM TỪNG ĐỊA BÀN (LƯU LOG)
 *   ① Sheet mới "15. TENDER PRICE LOG": mỗi lần nhập giá = 1 dòng mới (mã SP · địa bàn · đơn giá · ngày áp dụng · nguồn),
 *      không ghi đè ⇒ giữ lịch sử giá. Action mtPrices · mtPriceSave · mtPriceDelete.
 *   ② Gói thầu có nhiều dòng mã SP (SL × đơn giá), thêm cột Tỉnh · Miền · Items (JSON) ở cuối sheet 14. TENDER TRACK.
 *      Giá trị gói = Σ SL × đơn giá. Giá mới nhập khi lưu gói thầu được ghi luôn vào sheet 15.
 *
 * ⭐ v9.0 — QUY TẮC TASK THUỘC TUẦN (báo cáo tuần, họp tuần) giống app v21:
 *   task thuộc tuần khi NGÀY BẮT ĐẦU nằm trong tuần; task bắt đầu trước tuần chỉ được tính khi còn chạy tới tuần đó
 *   và kéo dài tối đa 14 ngày. Task có ngày kết thúc lệch (gõ nhầm ngày/tháng) chỉ tính theo ngày bắt đầu.
 *
 * ⭐ v8.9 — TAB "9. MỤC TIÊU & KPI" THEO FILE MMH KPI FY68
 *   ① Menu ⑪ dựng lại tab KPI: mỗi dòng = 1 mã KPI của 1 sales (C3-01, C5-02, C10-04, F3-03…),
 *      target 12 tháng + trọng số lấy từ file KPI FY68, actual là CÔNG THỨC tự tính từ tab 1 · 3 · 6 · 7.
 *      Tab kiểu cũ được đổi tên "9. KPI cũ (trước FY68)" và ẩn — không mất dữ liệu.
 *   ② Đồng bộ 2 chiều với file MMH KPI FY68 (link ở ô D9): kéo target + doanh số NPP (mã F) về,
 *      đẩy actual CRM sang cột "… Actual" của sheet 3. Detail KPI (ô có công thức bên đó được giữ nguyên).
 *      Chạy bằng menu ⑫, nút trên app (quản lý), hoặc tự động mỗi sáng (menu ⑬).
 *   ③ App đọc thẳng kết quả công thức của tab ⇒ số trên app = số trên sheet.
 *   Dental · Surgical · Eyeless dùng chung code này — mỗi file tự dựng bảng KPI đúng người, đúng mã.
 *
 * ⭐ v8.8 — BÁO CÁO TUẦN CHỈ LẤY TASK CỦA ĐÚNG TUẦN
 * ⭐ v8.7 — PDF BÁO CÁO TUẦN LƯU CHUNG MỘT FOLDER DRIVE (mọi team sales)
 * ⭐ v8.6 — Họp tuần: 7 cột mới cho mục ② "Quan hệ khách hàng & Phát triển thị trường"
 * ⭐ v8.5 — DÙNG CHUNG 1 CODE CHO DENTAL · SURGICAL · EYELESS (dán y nguyên vào cả 3 project)
 * ⭐ v8.4 — GỘP MODULE "HỌP TUẦN SURGICAL" VÀO FILE NÀY (bỏ file Meeting.gs riêng)
 *   ⚠️ Nếu project đang có file Meeting.gs riêng ⇒ XOÁ file đó (trùng tên hàm).
 *      Sau khi dán: chạy mtSetup() một lần (cấp quyền gửi mail + tạo sheet 13, 14),
 *      rồi Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy.
 * ⭐ v8.3 — ẢNH ĐI ĐỊA BÀN: ghi giờ tải ảnh (cột W, dòng 🕒) · action photoMeta
 * ⭐ v8.2 — ĐƠN GÕ TAY TRÊN SHEET HIỆN NGAY TRÊN APP
 * ⭐ v8.1 — CẮT NỐT PHẦN CHỜ KHI TẢI ẢNH
 * ⭐ v8.0 — BẢN TĂNG TỐC + DANH MỤC MÃ SẢN PHẨM
 *
 * Google Sheet nguồn: "MMH_Dental_CRM_FY68" — 11 tab, HEADER ở HÀNG 3, DATA từ HÀNG 4, cột A trống.
 *
 *  1. CUSTOMER CODE  B=Customer code C=Account name D=Account type E=Address F=Province G=Area
 *                    H=MMH sales PIC I=FY mở account J=Ngày mở account K=Tháng mở(auto)
 *                    L=Số CBC/PIC M=Số đơn hàng N=Ghi chú
 *  2. CBC            B=Customer code C=CBC code D=Account type E=Account name F=Address G=Province
 *                    H=Area I=MMH sales PIC J=CBC No. K=Account PIC L=Telephone M=Job title
 *                    N=Specialize O=Role P=Influence Q=Trust R=Ghi chú  S=Log tạo mới (v5)
 *  3. SALE ORDER     B=Customer code C=CBC code D=Kênh E=FY F=Month G=Day H=Order No. I=Account type
 *                    J=Account name K=Address L=Province M=Area N=Người liên lạc O=Chức danh P=SĐT
 *                    Q=MMH sales PIC R=Detail product S=Product type T=Quantity U=Unit price
 *                    V=Amount W=Partner X=Partner type Y=Zalo offline Qty Z=Source AA=Ghi chú
 *  4. MASTER NAME NPP  B=Customer code C=Tên trên file NPP D=Account name
 *  5. MONTHLY REPORT B=No. C=Type task D=PIC E=Area F=FY G=Report Period(YYYYMM) H=PLAN I=RESULT
 *  6. WEEKLY REPORT  B=No. C=FY D=Start Month E=Start date F=Finish date G=Sales PIC
 *                    H=Check account name I=Account type(auto) J=Province(auto) K=Area(auto)
 *                    L=Product group M=Type task N=Type action O=Sales Process P=Plan
 *                    Q=Task Result R=Task Status S=Customer feedback type T=Next Action
 *                    U=Stop Reason V=Photo link (Drive)
 *  7. PRODUCT PRESENTATION B=No. C=Check account name D=MMH sales PIC E=Provinces F=Area G=FY
 *                    H=Month(YYYYMM) I=Day J=Detail event folder link K=Event review
 *                    L=Target Participant M=Actual Participant
 *  8. ADP            B=No. C=Check account name D=SALE PIC E=FY F=ABCD focus G=Case info
 *                    H=Case Analysis I=Objective J=Tactic K=Key Action L=FY Target M=FY Actual
 *                    N..AB=12 tháng (Sep..Aug) Q/U/Y/AC=Review Q1..Q4 AD=Review FY
 *                    AE=Ngày tạo  AF=Cập nhật lần cuối   (v5.9)
 *  9. MỤC TIÊU & KPI  C4=FY áp dụng · PHẦN A rows 8-13 (target ở cột F)
 *                    PHẦN B1..B6 (target/tháng ở cột D, PIC ở cột B, phân loại ở cột C)
 * 10. MASTER LIST    B=PIC C=Account type D=Type task E=Type action F=Sales Process G=Task Status
 *                    H=Customer feedback I=Product group J=Area K=FY L=ABCD focus M=Job title
 *                    N=Role O=Influence/Trust P=Customer Journey Q=Partner type R=Kênh
 *                    S=Province T=Month(YYYYMM)
 *
 * "Check account name" LUÔN có dạng:  <Account name>/<Account type>/<Province>/<Area>
 *************************************************************************************************/

/* ══════════════════════ CONFIG — CHỈ SỬA PHẦN NÀY ══════════════════════ */

/* Để rỗng '' nếu script gắn trực tiếp vào Google Sheet (Extensions ▸ Apps Script).
   Nếu script đứng độc lập → dán ID của Google Sheet vào đây. */
var SHEET_ID = '';

/* Folder Drive chứa ảnh đi địa bàn của sales */
var DRIVE_FOLDER_ID = '1-NcmSka-VkFqcTtsnVHJccg7vUuNb5xC';

/* ảnh của các kỳ đã đóng được dồn vào folder con "Archive_<FY>" (xem hàm archivePhotosByFY). */
var ARCHIVE_PREFIX = 'Archive_';

/* FOLDER LƯU PDF BÁO CÁO TUẦN CỦA MỌI TEAM SALES (họp tuần + báo cáo tuần từng PIC)
   WEEKLY_PDF_BY_TEAM = true ⇒ tự tạo folder con Dental / Surgical / Eyeless bên trong. */
var WEEKLY_PDF_FOLDER_ID = '1izYni9pCLaLnI-rvnXlT8BQL1M8Ci44N';
var WEEKLY_PDF_BY_TEAM   = true;

var TABS = {
  customer : '1. CUSTOMER CODE',
  cbc      : '2. CBC',
  order    : '3. SALE ORDER',
  npp      : '4. MASTER NAME NPP',
  monthly  : '5. MONTHLY REPORT',
  weekly   : '6. WEEKLY REPORT',
  present  : '7. PRODUCT PRESENTATION',
  adp      : '8. ADP',
  kpi      : '9. TARGET & KPI',
  master   : '10. MASTER LIST',
  /* danh mục mã sản phẩm, dán y nguyên file PRODUCT_CODE.xlsx vào đây (tiêu đề hàng 1) */
  pcode    : '12. PRODUCT CODE'
};

var HEADER_ROW = 3;   // hàng tiêu đề của mọi tab dữ liệu
var DATA_ROW   = 4;   // hàng dữ liệu đầu tiên
var KEY_COL    = 2;   // cột B — cột "khoá" dùng để dò dòng trống cuối cùng

/* Map cột (số cột thật trên sheet: B=2, C=3, ...) */
var COL = {
  customer: { code:2, name:3, type:4, address:5, province:6, area:7, pic:8, fy:9, openDate:10, openMonth:11, nCbc:12, nOrder:13, note:14 },
  cbc     : { code:2, cbcCode:3, type:4, name:5, address:6, province:7, area:8, pic:9, cbcNo:10, contact:11, phone:12, jobTitle:13, specialize:14, role:15, influence:16, trust:17, note:18, log:19 },
  order   : { code:2, cbcCode:3, channel:4, fy:5, month:6, day:7, orderNo:8, type:9, name:10, address:11, province:12, area:13, contact:14, jobTitle:15, phone:16, pic:17, detail:18, ptype:19, qty:20, price:21, amount:22, partner:23, partnerType:24, zaloQty:25, source:26, note:27 },
  npp     : { code:2, nppName:3, name:4 },
  monthly : { no:2, typeTask:3, pic:4, area:5, fy:6, period:7, plan:8, result:9 },
  weekly  : { no:2, fy:3, month:4, start:5, finish:6, pic:7, account:8, type:9, province:10, area:11, product:12, typeTask:13, typeAction:14, process:15, plan:16, result:17, status:18, feedback:19, nextAction:20, stopReason:21, photo:22, gpsInfo:23 },
  present : { no:2, account:3, pic:4, province:5, area:6, fy:7, month:8, day:9, folder:10, review:11, target:12, actual:13 },
  adp     : { no:2, account:3, pic:4, fy:5, abcd:6, caseInfo:7, analysis:8, objective:9, tactic:10, keyAction:11, targetAmt:12, actualAmt:13,
              m09:14, m10:15, m11:16, rQ1:17, m12:18, m01:19, m02:20, rQ2:21, m03:22, m04:23, m05:24, rQ3:25, m06:26, m07:27, m08:28, rQ4:29, rFY:30,
              created:31, updated:32 },
  master  : { pic:2, accountType:3, typeTask:4, typeAction:5, process:6, status:7, feedback:8, product:9, area:10, fy:11, abcd:12, jobTitle:13, role:14, influence:15, journey:16, partnerType:17, channel:18, province:19, month:20 }
};

/* ══════════════ DANH BẠ NHÂN SỰ — dùng cho gửi email báo cáo ══════════════
 * pic  = ĐÚNG tên PIC ghi trong sheet (cột "MMH sales PIC" / "Sales PIC").
 * Nếu một PIC chưa có email → để '' , app vẫn dùng bình thường, chỉ không gửi mail được. */
var USER_MAP = {
  'mmh.hanoi@manimedicalhanoi.com'   : { pic:'Viet',      initials:'VI', role:'manager', level:'lead',     title:'Dental Sales Team Leader',     dept:'Sales & Marketing VN', team:'Dental Sales Team' },
  'mmh.saigon@manimedicalhanoi.com'  : { pic:'Phuong',    initials:'PH', role:'pic',     level:'pic',      title:'Dental Sales PIC — South',     dept:'Sales & Marketing VN', team:'Dental Sales Team' },
  'mmh.danang@manimedicalhanoi.com'  : { pic:'Vinh',      initials:'VN', role:'pic',     level:'pic',      title:'Dental Sales PIC — Central',   dept:'Sales & Marketing VN', team:'Dental Sales Team' },
  'mmh.product@manimedicalhanoi.com' : { pic:'Giang',     initials:'GI', role:'manager', level:'lead',     title:'Product Team Leader',          dept:'Sales & Marketing VN', team:'Product Team' },
  'tt.tuyen@manimedicalhanoi.com'    : { pic:'Tuyen',     initials:'TU', role:'manager', level:'hod',      title:'Head of Sales & Marketing VN', dept:'Sales & Marketing VN', team:'Sales & Marketing VN' },
  'nt.ha@manimedicalhanoi.com'       : { pic:'Nguyen Ha', initials:'NH', role:'manager', level:'director', title:'Director',                     dept:'Sales & Marketing VN', team:'Management' },
  'mmh.hanoi2@manimedicalhanoi.com'  : { pic:'Viet Ha',   initials:'VH', role:'pic',     level:'pic',      title:'Surgical Sales PIC — North',   dept:'Sales & Marketing VN', team:'Surgical Sales Team' },
  'mmh.saigon1@manimedicalhanoi.com' : { pic:'Khang',     initials:'KH', role:'pic',     level:'pic',      title:'Surgical Sales PIC — South',   dept:'Sales & Marketing VN', team:'Surgical Sales Team' },
  'marketing.mmh2@manimedicalhanoi.com' : { pic:'Trang',  initials:'TR', role:'pic',     level:'pic',      title:'Eyeless Sales PIC',            dept:'Sales & Marketing VN', team:'Eyeless Sales Team' }
};

/* PIC có trong MASTER LIST nhưng chưa gán email riêng — điền email vào đây khi có */
var EXTRA_PICS = {
  'Sale Admin'        : '',
  'Dental Sales Team' : ''
};

var DIRECTOR_EMAIL = 'nt.ha@manimedicalhanoi.com';
var HOD_SM_EMAIL   = 'tt.tuyen@manimedicalhanoi.com';
var PRODUCT_EMAIL  = 'mmh.product@manimedicalhanoi.com';
var HR_EMAIL       = 'vtt.hoa@manimedicalhanoi.com';
/* CC mặc định của MỌI báo cáo tuần / tháng — v4.5: HR thay cho Product */
var CC_DEFAULT = [HOD_SM_EMAIL, DIRECTOR_EMAIL, HR_EMAIL];

/* ⭐ v10.0 — MỞ MỚI ĐỊA BÀN & SKU MỚI: folder chứng từ, người duyệt của từng PIC */
var NA_FOLDERS = {
  dental  : '1LULWRr7ifydKQ8AM0NvTRmv_YYipcRYK',
  surgical: '1-xIoO2okkelHJwUHDkUqtSDIEdhRfdgr',
  eyeless : '1-xIoO2okkelHJwUHDkUqtSDIEdhRfdgr'     /* Eyeless chưa có folder riêng ⇒ dùng chung folder Surgical */
};
/* PIC → danh sách người duyệt (To của email xin xác nhận). '*' = mặc định của nhóm.
   Director (Nguyen Ha) và HOD (Tuyen) luôn được quyền duyệt mọi case. */
var NA_APPROVERS = {
  dental  : { 'Viet':['Tuyen'], '*':['Viet','Tuyen'] },
  surgical: { '*':['Giang','Tuyen'] },
  eyeless : { '*':['Tuyen','Giang'] }
};
var NA_ADMINS   = ['Nguyen Ha','Tuyen','Hoa','Giang'];    /* xem mọi case của nhóm */
var NA_DECIDERS = ['Nguyen Ha','Tuyen'];                  /* duyệt được mọi case */

/* ⭐ v10.0 — KPI C6 (Composite) / C7 (JIZAI): NPP phụ trách của từng sales.
   Đơn hàng chỉ được cộng khi cột Partner (W) chứa một trong các từ khoá dưới đây (không phân biệt hoa thường).
   Muốn tính thêm đơn qua đại lý (Dealer) của NPP đó ⇒ thêm tên đại lý vào danh sách, rồi menu ⑪ dựng lại tab KPI. */
var K68_NPP = {
  dental: {
    'Viet'  : ['Nam Dũng', 'Nam Dung'],
    'Vinh'  : ['S.P.I', 'SPI'],
    'Phuong': ['Meci', 'Việt Thái', 'Viet Thai', 'VTM']
  }
};

/* MỘT FILE CODE DÙNG CHO CẢ BA BACKEND (Dental · Surgical · Eyeless). Nhóm nhận diện tự động theo tên file.
   Muốn ép cứng thì đặt Script Property 'TEAM' = dental | surgical | eyeless. */
var TEAM_CFG = {
  dental:   { app:'MMH Dental CRM',   label:'Dental',   team:'Dental Sales Team',   photoFolder:'1-NcmSka-VkFqcTtsnVHJccg7vUuNb5xC' },
  surgical: { app:'MMH Surgical CRM', label:'Surgical', team:'Surgical Sales Team', photoFolder:'' },   /* để trống ⇒ dùng chung folder Dental */
  eyeless:  { app:'MMH Eyeless CRM',  label:'Eyeless',  team:'Eyeless Sales Team',  photoFolder:'' }
};
function isTeamKey_(t){ return Object.prototype.hasOwnProperty.call(TEAM_CFG, t); }
/* nhận diện theo tên file: eyeless xét TRƯỚC (tên "Eyeless" không chứa chữ surgical) */
function detectTeamByName_(nm){
  nm = String(nm || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  if (/eyeless|kim\s*lien\s*chi/.test(nm)) return 'eyeless';
  if (/surgical|ngoai\s*khoa|nhan\s*khoa/.test(nm)) return 'surgical';
  return 'dental';
}
function teamLabel_(){ return (TEAM_CFG[TEAM()] || TEAM_CFG.dental).label; }
var _TEAM = null;
function TEAM(){
  if (_TEAM) return _TEAM;
  var t = '';
  try { t = String(PropertiesService.getScriptProperties().getProperty('TEAM') || '').toLowerCase(); } catch(e){}
  if (!isTeamKey_(t)){
    try { t = String(PropertiesService.getScriptProperties().getProperty('TEAM_AUTO2') || '').toLowerCase(); } catch(e){}
    if (!isTeamKey_(t)){
      var nm = '';
      try { nm = String(ss().getName() || ''); } catch(e){}
      t = detectTeamByName_(nm);
      try { PropertiesService.getScriptProperties().setProperty('TEAM_AUTO2', t); } catch(e){}
    }
  }
  _TEAM = t;
  return t;
}
/* Xoá nhận diện đã nhớ — chạy nếu đổi tên file hoặc nhân bản sang nhóm khác */
function resetTeamDetect(){
  try { PropertiesService.getScriptProperties().deleteProperty('TEAM_AUTO'); } catch(e){}
  try { PropertiesService.getScriptProperties().deleteProperty('TEAM_AUTO2'); } catch(e){}
  _TEAM = null;
  var t = TEAM();
  try { SpreadsheetApp.getUi().alert('Đã nhận diện lại: nhóm "' + t + '" · app "' + appName_() + '"'); } catch(e){}
  return t;
}
var APP_NAME = 'MMH Dental CRM';
var SOURCE   = 'dental';   /* giữ để tương thích; giá trị thật lấy qua TEAM() */

/* ══════════════════════ TIỆN ÍCH DANH BẠ ══════════════════════ */
var PIC_EMAIL = (function(){
  var m = {};
  for (var e in USER_MAP) m[USER_MAP[e].pic] = e;
  for (var p in EXTRA_PICS) if (!m[p]) m[p] = EXTRA_PICS[p] || '';
  return m;
})();
function userByPic(pic){ var e = PIC_EMAIL[pic]; return (e && USER_MAP[e]) ? Object.assign({ email:e }, USER_MAP[e]) : null; }
function teamEmails(team){ var out=[]; for (var e in USER_MAP) if (USER_MAP[e].team === team) out.push(e); return out; }
function reportTeamName_(){
  return (TEAM_CFG[TEAM()] || TEAM_CFG.dental).team;
}
/* Nhóm Surgical chỉ có 2 PIC nên báo cáo gửi thẳng lên quản lý; PIC còn lại của nhóm được Cc. */
var SURGICAL_TO = [HOD_SM_EMAIL, DIRECTOR_EMAIL, PRODUCT_EMAIL, HR_EMAIL];

function reportRecipients(senderPic){
  var u = userByPic(senderPic);
  var team = (u && u.team) || reportTeamName_();
  var uniq = function(a){ return a.filter(function(e, i, x){ return e && x.indexOf(e) === i; }); };

  if (team === 'Surgical Sales Team' || team === 'Eyeless Sales Team' || (!u && TEAM() !== 'dental')){
    var tm = (team === 'Surgical Sales Team' || team === 'Eyeless Sales Team') ? team : reportTeamName_();
    var to = uniq(SURGICAL_TO.slice());
    var cc = uniq(teamEmails(tm)).filter(function(e){ return to.indexOf(e) < 0; });
    return { to:to, cc:cc };
  }

  var toD = uniq(teamEmails(team));
  if (!toD.length && u && u.email) toD = [u.email];
  var ccD = uniq(CC_DEFAULT.slice()).filter(function(e){ return toD.indexOf(e) < 0; });
  return { to:toD, cc:ccD };
}

/* ══════════════════════ LƯU PDF BÁO CÁO TUẦN LÊN DRIVE ══════════════════════ */
function weeklyPdfFolder_(){
  var root = DriveApp.getFolderById(WEEKLY_PDF_FOLDER_ID);
  if (!WEEKLY_PDF_BY_TEAM) return root;
  var nm = teamLabel_(), it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}
/* Lưu blob PDF · trùng tên ⇒ bản cũ vào Thùng rác. KHÔNG bao giờ ném lỗi (email vẫn gửi được) */
function savePdfToDrive_(blob){
  try {
    var f = weeklyPdfFolder_(), name = blob.getName();
    var ex = f.getFilesByName(name);
    while (ex.hasNext()) { try { ex.next().setTrashed(true); } catch(e){} }
    var file = f.createFile(blob);
    return { ok:true, url:file.getUrl(), id:file.getId(), name:file.getName() };
  } catch(e){
    return { ok:false, error:'Chưa lưu được PDF vào Drive: ' + String(e && e.message || e) };
  }
}
function pdfSafeName_(s, fallback){
  s = String(s || '').replace(/[\\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, '_').slice(0, 120);
  if (!s) s = fallback || ('MMH_' + teamLabel_() + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf');
  if (!/\.pdf$/i.test(s)) s += '.pdf';
  return s;
}

/* ══════════════════════ ROUTER ══════════════════════ */
function doGet(e)  { return handle(e, 'GET'); }
function doPost(e) { return handle(e, 'POST'); }

function handle(e, method){
  var p = {};
  try {
    p = (method === 'POST' && e && e.postData) ? JSON.parse(e.postData.contents) : ((e && e.parameter) || {});
  } catch(_) { p = (e && e.parameter) || {}; }

  var callback = p.callback || '';
  var out = { ok:false };
  try {
    var action = p.action || 'boot';
    var user = whoAmI(p);

    /* TRẢ LỜI RỖNG KHI DỮ LIỆU CHƯA ĐỔI (app gửi kèm cv = phiên bản nó đang giữ) */
    var _cv = S(p.cv);
    if (_cv){
      var _dep = depsOf(action, p);
      if (_dep && tabVersion(_dep) === _cv)
        return reply({ ok:true, unchanged:true, ver:dataVersion(), _ver:_cv }, callback);
    }

    /* HỌP TUẦN: action mt… xử lý bởi module cuối file */
    if (/^mt[A-Z]/.test(String(action))) return reply(mtRoute_(String(action), p), callback);

    /* ⭐ v10.0 — CHỐNG GHI TRÙNG: cùng mã yêu cầu (rid) ⇒ trả lại kết quả lần trước */
    var _rid = S(p.rid);
    if (_rid && WRITE_ACTIONS[action]){
      var _hit = idemBegin_(_rid);
      if (_hit) return reply(_hit, callback);
    }
    /* ⭐ v10.0 — module Mở mới & SKU mới · Báo cáo KPI · đẩy KPI ở nền */
    if (/^na[A-Z]/.test(String(action))){
      out = naRoute_(String(action), user, p);
      if (out && out.ok && action === 'naDecide' && !out.dup) out.kpiPush = k68PushQuick_();
      if (_rid && WRITE_ACTIONS[action]) idemEnd_(_rid, out);
      return reply(out, callback);
    }
    if (/^kr[A-Z]/.test(String(action))) return reply(krRoute_(String(action), user, p), callback);
    /* ⭐ v10.8 — đề xuất công tác ghi thẳng file Business Trip */
    if (/^trip(Master|Propose)2$/.test(String(action))){
      out = tripRoute_(String(action), user, p);
      if (_rid && WRITE_ACTIONS[action]) idemEnd_(_rid, out);
      return reply(out, callback);
    }
    if (action === 'kpiPush') return reply({ ok:true, kpiPush:k68PushQuick_() }, callback);
    if (action === 'kpiLate') return reply(kpiLate_(user, p), callback);               /* ⭐ v10.4 */

    switch (action) {
      case 'ping'            : out = { ok:true, pong:true, source:TEAM(), app:appName_(), pic:user.pic, ver:'10.10', meeting:true, trip2:true, kpi68:true, tenderPrice:true, custLog:true, deleteAccount:true, na:true, kr:true, idem:true, kpiPush:true }; break;
      case 'boot'            : out = boot(user); break;
      case 'master'          : out = { ok:true, master: readMaster() }; break;
      case 'customerIndex'   : out = { ok:true, rows: customerIndex() }; break;
      case 'customerDetail'  : out = customerDetail(p); break;
      case 'list'            : out = cachedFor_('LIST|'+S(p.tab)+'|'+S(p.fy)+'|'+S(p.pic)+'|'+S(p.month)+'|'+S(p.from)+'|'+S(p.to)+'|'+S(p.limit)+'|'+S(p.offset),
                                        [S(p.tab)], function(){ return listRows(p); }); break;
      case 'kpi'             : out = kpiReport(p); break;
      case 'dashboard'       : out = dashboard(p); break;
      case 'bundle'          : out = bundle(user, p); break;
      case 'version'         : sheetWatch_(); out = { ok:true, ver: dataVersion(), vers: verAll_() }; break;
      case 'productCodes'    : out = productCodes(p); break;
      case 'saveOrders'      : out = saveOrders(user, p); break;
      case 'saveCustomerCbc' : out = saveCustomerCbc(user, p); break;
      case 'bumpCache'       : out = { ok:true, ver: bumpVersion(),
                                       message:'Đã làm mới bộ nhớ đệm dữ liệu' }; break;
      case 'sheetInfo'       : out = { ok:true, id: ss().getId(), name: ss().getName(),
                                       app: appName_(), source: TEAM(), team: TEAM() }; break;
      case 'account360'      : out = cachedFor_('A360|'+S(p.code)+'|'+S(p.name), depsOf('account360'), function(){ return account360(p); }); break;
      case 'visitFeed'       : out = cachedFor_('VF|'+S(p.from)+'|'+S(p.to)+'|'+S(p.pic), ['weekly'], function(){ return visitFeed(p); }); break;
      case 'multi'           : out = multiTabs(p); break;
      case 'activity'        : out = { ok:true, rows: readActivity(parseInt(p.limit||120,10)) }; break;
      case 'custLog'         : out = (function(){ var r = custLogRead_(p.from, p.to); return { ok:true, rows:r.rows, first:r.first }; })(); break;
      case 'clearActivity'   : out = clearActivity(user, p); break;

      case 'saveCustomer'    : out = saveRow(user, p, 'customer'); break;
      case 'saveCBC'         : out = saveRow(user, p, 'cbc'); break;
      case 'saveOrder'       : out = saveRow(user, p, 'order'); break;
      case 'saveWeekly'      : out = saveWeekly(user, p); break;
      case 'saveMonthly'     : out = saveRow(user, p, 'monthly'); break;
      case 'savePresentation': out = saveRow(user, p, 'present'); break;
      case 'saveADP'         : out = saveRow(user, p, 'adp'); break;
      case 'deleteRow'       : out = deleteRow(user, p); break;
      case 'deleteAccount'   : out = deleteAccount(user, p); break;              /* ⭐ v9.3 */
      case 'uploadPhoto'     : out = uploadPhoto(user, p); break;
      case 'photoMeta'       : out = photoMeta(p); break;
      case 'photoB64'        : out = photoB64(p); break;
      case 'deletePhoto'     : out = deletePhoto(user, p); break;
      case 'saveKpiTarget'   : out = saveKpiTarget(user, p); break;
      case 'kpiSync'         : out = kpiSyncApi(user, p); break;
      case 'saveRates'       : out = saveRates(user, p); break;               /* ⭐ v10.1 */

      case 'weeklyReport'    : out = sendWeeklyReport(user, p); break;
      case 'monthlyReport'   : out = sendMonthlyReport(user, p); break;
      default: out = { ok:false, error:'Unknown action: ' + action };
    }
    /* ⭐ v9.7 — lưu xong trên app ⇒ đẩy ngay số KPI lên file KPI tổng
       ⭐ v10.0 — app mới gửi push=0 (trả lời nhanh), rồi tự gọi action kpiPush ở nền */
    if (out && out.ok && !out.unchanged && !out.dup && K68_PUSH_ACTIONS[action] && S(p.push) !== '0') out.kpiPush = k68PushQuick_();
    if (_rid && WRITE_ACTIONS[action]) idemEnd_(_rid, out);
  } catch(err){
    out = { ok:false, error: String(err && err.message || err) };
  }
  return reply(out, callback);
}

function reply(obj, callback){
  var json = JSON.stringify(obj);
  if (callback){
    if (!/^[A-Za-z_$][\w$]*$/.test(callback)) callback = 'callback';
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ══════════════════════ AUTH ══════════════════════ */
function whoAmI(p){
  var picName = String((p && p.pic) || '').trim();
  if (!picName) return { email:'', pic:'', role:'guest', title:'', level:'', known:false };
  for (var email in USER_MAP){
    if (String(USER_MAP[email].pic).trim().toLowerCase() === picName.toLowerCase()){
      var u = USER_MAP[email];
      return { email:email, pic:u.pic, role:u.role, title:u.title, level:u.level, team:u.team, known:true };
    }
  }
  return { email: EXTRA_PICS[picName] || '', pic:picName, role:'pic', title:'Sales PIC', level:'pic', team:reportTeamName_(), known:false };
}
function isManager(user){ return user && user.role === 'manager'; }

/* ⭐ v10.0 — các action GHI dữ liệu (dùng cho chống ghi trùng theo rid) */
var WRITE_ACTIONS = { weeklyReport:1, monthlyReport:1, tripPropose2:1, saveOrders:1, saveOrder:1, saveCustomer:1, saveCBC:1, saveCustomerCbc:1, saveWeekly:1, saveMonthly:1,
                      savePresentation:1, saveADP:1, deleteRow:1, deleteAccount:1, uploadPhoto:1,
                      naSave:1, naSubmit:1, naDecide:1, naDelete:1 };

/* CÁC CỘT LÀ CÔNG THỨC, TUYỆT ĐỐI KHÔNG GHI ĐÈ */
var FORMULA_FIELDS = {
  customer : { code:1, month:1, nCbc:1, nOrder:1 },
  cbc      : { code:1, cbcCode:1, cbcNo:1, keyAccPic:1, keyAccNo:1 },
  order    : { code:1, cbcCode:1, type:1, address:1, province:1, area:1, pic:1,
               jobTitle:1, phone:1 }
};
/* Ghi vào tab nào thì những tab nào phải tính lại? */
function bumpTabsFor_(tab){
  if (tab === 'cbc')   return ['cbc','customer'];
  if (tab === 'order') return ['order','customer'];
  return [tab];
}

/* Ghi cả dòng nhưng chừa đúng các cột công thức */
function writeRowKeepFormulas_(s, row, cur, lastCol, lock, map){
  var skip = {};
  for (var f in lock) if (map[f]) skip[map[f]] = 1;
  var c = 1;
  while (c <= lastCol){
    if (skip[c]) { c++; continue; }
    var from = c;
    while (c <= lastCol && !skip[c]) c++;
    s.getRange(row, from, 1, c - from).setValues([cur.slice(from - 1, c - 1)]);
  }
}

/* ══════════════════════ SHEET HELPERS ══════════════════════ */
function ss(){ return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function appName_(){ return (TEAM_CFG[TEAM()] || TEAM_CFG.dental).app; }
function photoFolderId_(){
  var c = TEAM_CFG[TEAM()] || TEAM_CFG.dental;
  return c.photoFolder || TEAM_CFG.dental.photoFolder || DRIVE_FOLDER_ID;
}

var _SH = {};
/* v9.5: tên tab cũ → tự đổi sang tên mới khi gặp lần đầu */
var TABS_OLD = { kpi: ['9. MỤC TIÊU & KPI'] };
function tabMigrate_(key){
  var book = ss(), s = book.getSheetByName(TABS[key]);
  if (s || !TABS_OLD[key]) return s;
  for (var i = 0; i < TABS_OLD[key].length; i++){ var o = book.getSheetByName(TABS_OLD[key][i]); if (o){ try { o.setName(TABS[key]); } catch(e){} return o; } }
  return null;
}
function kpiTab_(){ try { return tabMigrate_('kpi'); } catch(e){ return null; } }
function sh(key){
  if (_SH[key]) return _SH[key];
  var name = TABS[key];
  var s = TABS_OLD[key] ? tabMigrate_(key) : ss().getSheetByName(name);
  if (!s) throw new Error('Không tìm thấy tab "' + name + '" trong Google Sheet.');
  _SH[key] = s;
  return s;
}

/* SỐ CỘT THẬT SỰ CẦN ĐỌC CỦA MỖI TAB */
var _LASTCOL = {};
function lastColOf(key){
  if (_LASTCOL[key]) return _LASTCOL[key];
  var m = COL[key] || {}, mx = 1;
  for (var k in m) if (m[k] > mx) mx = m[k];
  _LASTCOL[key] = mx;
  return mx;
}

/* Đọc toàn bộ vùng dữ liệu của 1 tab → mảng mảng (index 0 = cột A) */
function rawValues(key){
  if (_RAW[key]) return _RAW[key];
  var s  = sh(key);
  var lr = s.getLastRow();
  if (lr < DATA_ROW) { _RAW[key] = []; return _RAW[key]; }
  var lc = Math.min(lastColOf(key), s.getMaxColumns());
  _RAW[key] = s.getRange(DATA_ROW, 1, lr - DATA_ROW + 1, lc).getValues();
  return _RAW[key];
}
/* Đọc ĐÚNG MỘT CỘT của 1 tab */
function colValues(key, colNo){
  var ck = key + '#' + colNo;
  if (_RAW[ck]) return _RAW[ck];
  var s = sh(key), lr = s.getLastRow();
  if (lr < DATA_ROW) { _RAW[ck] = []; return _RAW[ck]; }
  var v = s.getRange(DATA_ROW, colNo, lr - DATA_ROW + 1, 1).getValues();
  _RAW[ck] = v.map(function(r){ return r[0]; });
  return _RAW[ck];
}

/* Chuyển 1 dòng values → object theo COL map */
function toObj(vals, map, rowNo){
  var o = { _row: rowNo };
  for (var k in map) o[k] = cell(vals[map[k] - 1]);
  return o;
}
function cell(v){
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return d2s(v);
  if (typeof v === 'string' && ERR_RE.test(v.trim())) return '';
  return v;
}
function d2s(v){
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]'){
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  var m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (m) return m[3] + '-' + ('0'+m[2]).slice(-2) + '-' + ('0'+m[1]).slice(-2);
  return s.slice(0, 10);
}
function s2d(s){
  if (!s) return '';
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : String(s);
}
function num(v){
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function S(v){ return String(v === null || v === undefined ? '' : v).trim(); }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* CỘT "CÓ DỮ LIỆU" CỦA TỪNG TAB — dòng có dữ liệu khi BẤT KỲ cột nhập tay nào dưới đây có giá trị. */
var PRESENCE = {
  order   : ['name', 'orderNo', 'day', 'detail', 'code'],
  weekly  : ['account', 'start', 'pic', 'plan', 'no'],
  cbc     : ['code', 'cbcCode', 'name', 'contact'],
  customer: ['code', 'name'],
  present : ['account', 'day', 'no'],
  monthly : ['no', 'typeTask', 'period'],
  adp     : ['no', 'account'],
  npp     : ['code', 'nppName']
};
function presenceCols_(key){
  var f = PRESENCE[key], m = COL[key] || {}, out = [];
  (f || []).forEach(function(k){ if (m[k] && out.indexOf(m[k]) < 0) out.push(m[k]); });
  if (!out.length) out.push(KEY_COL);
  return out;
}
/* Giá trị lỗi của công thức (#N/A, #REF!…) coi như ô trống */
var ERR_RE = /^#(N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!|SPILL!|CALC!)/;
function isBlank_(v){
  if (v === null || v === undefined || v === '') return true;
  if (typeof v === 'string'){ var t = v.trim(); return t === '' || ERR_RE.test(t); }
  return false;
}
function rowHasData_(r, cols){
  for (var i = 0; i < cols.length; i++) if (!isBlank_(r[cols[i] - 1])) return true;
  return false;
}
/* FY theo ngày (T9 → T8 năm sau) — "2026-09-15" ⇒ FY68 */
function fyOfIso_(iso){
  var m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? fyOfMonth(m[1] + m[2]) : '';
}
function ymOfIso_(iso){
  var m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? (m[1] + m[2]) : '';
}
function normName_(s){
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}

/* Đọc toàn bộ 1 tab thành mảng object */
function readTab(key){
  var map = COL[key], vals = rawValues(key), out = [], pc = presenceCols_(key);
  for (var i = 0; i < vals.length; i++){
    if (!rowHasData_(vals[i], pc)) continue;
    out.push(toObj(vals[i], map, DATA_ROW + i));
  }
  fixDerived_(key, out);
  return out;
}

/* BÙ CÁC Ô SUY RA ĐƯỢC cho dòng gõ tay trên sheet */
function fixDerived_(key, rows){
  if (!rows.length) return;
  var dateF = { order:'day', weekly:'start', present:'day' }[key];
  if (dateF){
    rows.forEach(function(r){
      var d = S(r[dateF]);
      if (!/^\d{4}-\d{2}-\d{2}/.test(d)){
        if (!S(r.fy) && /^\d{6}$/.test(S(r.month))) r.fy = fyOfMonth(S(r.month));
        return;
      }
      var f = fyOfIso_(d);
      if (f && S(r.fy) !== f) r.fy = f;
      if ('month' in r){ var ym = ymOfIso_(d); if (ym && S(r.month) !== ym) r.month = ym; }
    });
  }
  if (key === 'order'){
    var need = rows.some(function(r){ return !S(r.code) || !S(r.pic); });
    if (!need) return;
    var byName = {};
    try {
      customerIndex().forEach(function(c){ var k = normName_(c.name); if (k && !byName[k]) byName[k] = c; });
    } catch(e){ return; }
    rows.forEach(function(r){
      if (S(r.code) && S(r.pic)) return;
      var c = byName[normName_(r.name)];
      if (!c) return;
      if (!S(r.code))     r.code     = c.code;
      if (!S(r.pic))      r.pic      = c.pic;
      if (!S(r.type))     r.type     = c.type;
      if (!S(r.province)) r.province = c.province;
      if (!S(r.area))     r.area     = c.area;
    });
  }
}

/* Dòng trống đầu tiên để ghi thêm — dò theo MỌI cột nhập tay */
function firstEmptyRow(key){
  var cols = presenceCols_(key), last = -1;
  cols.forEach(function(c){
    var v = colValues(key, c);
    for (var i = v.length - 1; i > last; i--) if (!isBlank_(v[i])) { last = i; break; }
  });
  return DATA_ROW + last + 1;
}

/* Số No. kế tiếp cho các tab có cột "No." */
function nextNo(key){
  var c = (COL[key] || {}).no;
  if (!c) return 1;
  var col = colValues(key, c), mx = 0;
  for (var i = 0; i < col.length; i++){ var n = num(col[i]); if (n > mx) mx = n; }
  return mx + 1;
}
/* Đếm dòng có dữ liệu của 1 tab — chỉ đọc cột khoá */
function countRows(key){
  var col = colValues(key, presenceCols_(key)[0]), n = 0;
  for (var i = 0; i < col.length; i++) if (!isBlank_(col[i])) n++;
  return n;
}

/* ══════════════════════ MASTER LIST (dropdown) ══════════════════════ */
function readMaster(){
  var vals = rawValues('master'), m = COL.master, out = {};
  for (var k in m) out[k] = [];
  vals.forEach(function(r){
    for (var k in m){
      var v = S(r[m[k] - 1]);
      if (v && out[k].indexOf(v) < 0) out[k].push(v);
    }
  });
  out.nextAction = NEXT_ACTIONS.slice();
  return out;
}

/* ══════════════════════ BOOT ══════════════════════ */
function picListAll_(){
  var master = readMaster(), picList = [];
  for (var email in USER_MAP){
    var u = USER_MAP[email];
    picList.push({ pic:u.pic, email:email, role:u.role, title:u.title, initials:u.initials, team:u.team, level:u.level });
  }
  (master.pic || []).forEach(function(p){
    if (!picList.some(function(x){ return x.pic === p; })){
      picList.push({ pic:p, email:EXTRA_PICS[p] || '', role:'pic', title:'Sales PIC', initials:p.slice(0,2).toUpperCase(), team:reportTeamName_(), level:'pic' });
    }
  });
  return picList;
}
function boot(user){
  return {
    ok:true, source:TEAM(), team:TEAM(), app:appName_(), ver:'9.3',
    user: user,
    picList: picListAll_(),
    master: readMaster(),
    fyCurrent: currentFY(),
    driveFolder: photoFolderId_(),
    stats: quickStats()
  };
}

function currentFY(){
  /* FY hiện hành tính theo NGÀY HÔM NAY (T9 → T8). Ô C4 tab KPI chỉ dùng khi ghi một FY MỚI HƠN. */
  var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
  var fyYear = (m >= 9) ? y : y - 1;
  var byDate = 'FY' + (fyYear - 1958);
  var v = '';
  try { v = S(sh('kpi').getRange(4, 3).getValue()); } catch(e){}
  if (/^FY\d{2}$/.test(v) && parseInt(v.slice(2), 10) > parseInt(byDate.slice(2), 10)) return v;
  return byDate;
}
/* Danh sách FY cho ô chọn: MASTER LIST + FY hiện hành + FY trước, mới nhất lên đầu */
function fyListAll_(master){
  var l = ((master && master.fy) || []).slice(), cur = currentFY();
  [cur, prevFY(cur)].forEach(function(f){ if (l.indexOf(f) < 0) l.push(f); });
  return l.filter(function(f){ return /^FY\d{2}$/.test(f); })
          .sort(function(a, b){ return b.localeCompare(a); });
}
/* FY68 → [202609, 202610, ..., 202708] (T9 → T8 năm sau) */
function fyMonths(fy){
  var n = parseInt(String(fy).replace(/\D/g, ''), 10);
  var y = 1958 + n, out = [];
  [9,10,11,12].forEach(function(m){ out.push(y * 100 + m); });
  [1,2,3,4,5,6,7,8].forEach(function(m){ out.push((y + 1) * 100 + m); });
  return out;
}
function prevFY(fy){ var n = parseInt(String(fy).replace(/\D/g,''),10); return 'FY' + (n - 1); }

function quickStats(){
  return {
    customers: countRows('customer'),
    cbc      : countRows('cbc'),
    orders   : countRows('order'),
    weekly   : countRows('weekly')
  };
}

/* ══════════════════════ CUSTOMER INDEX (nhẹ — cho autocomplete) ══════════════════════ */
function customerIndex(){
  var vals = rawValues('customer'), c = COL.customer, out = [];
  vals.forEach(function(r, i){
    var code = S(r[c.code - 1]);
    if (!code) return;
    out.push({
      _row: DATA_ROW + i,
      code: code,
      name: S(r[c.name - 1]),
      type: S(r[c.type - 1]),
      province: S(r[c.province - 1]),
      area: S(r[c.area - 1]),
      pic: S(r[c.pic - 1]),
      nCbc: num(r[c.nCbc - 1]),
      nOrder: num(r[c.nOrder - 1])
    });
  });
  return out;
}

/* Chuỗi "Check account name" chuẩn: Name/Type/Province/Area */
function checkName(o){
  return [S(o.name), S(o.type), S(o.province), S(o.area)].join('/');
}
function parseCheckName(s){
  var a = String(s || '').split('/');
  return { name: S(a[0]), type: S(a[1]), province: S(a[2]), area: S(a[3]) };
}

/* ══════════════════════ CUSTOMER 360 ══════════════════════ */
function customerDetail(p){
  var code = S(p.code);
  if (!code) return { ok:false, error:'Thiếu customer code' };
  var cus = readTab('customer').filter(function(r){ return S(r.code) === code; })[0] || null;
  if (!cus) return { ok:false, error:'Không tìm thấy khách hàng ' + code };

  var cbc    = readTab('cbc').filter(function(r){ return S(r.code) === code; });
  var orders = readTab('order').filter(function(r){ return S(r.code) === code; })
                 .sort(function(a,b){ return String(b.month).localeCompare(String(a.month)); });
  var nameKey = S(cus.name).toLowerCase();
  var weekly = readTab('weekly').filter(function(r){
                 return parseCheckName(r.account).name.toLowerCase() === nameKey;
               }).sort(function(a,b){ return String(b.start).localeCompare(String(a.start)); });
  var adp    = readTab('adp').filter(function(r){
                 return parseCheckName(r.account).name.toLowerCase() === nameKey;
               });
  var alias  = readTab('npp').filter(function(r){ return S(r.code) === code; }).map(function(r){ return r.nppName; });

  var byMonth = {}, total = 0;
  orders.forEach(function(o){
    var m = S(o.month); if (!m) return;
    byMonth[m] = (byMonth[m] || 0) + num(o.amount);
    total += num(o.amount);
  });

  return { ok:true, customer:cus, cbc:cbc, orders:orders.slice(0, 200), weekly:weekly.slice(0, 200),
           adp:adp, alias:alias, salesByMonth:byMonth, totalAmount:total, orderCount:orders.length };
}

/* ══════════════════════ LIST + FILTER + PHÂN TRANG ══════════════════════ */
function listRows(p){
  var tab = S(p.tab);
  if (!COL[tab]) return { ok:false, error:'Tab không hợp lệ: ' + tab };
  var rows = readTab(tab);

  var q      = S(p.q).toLowerCase();
  var pic    = S(p.pic);
  var fy     = S(p.fy);
  var month  = S(p.month);
  var type   = S(p.type);
  var status = S(p.status);
  var area   = S(p.area);
  var from   = S(p.from);
  var to     = S(p.to);

  rows = rows.filter(function(r){
    if (pic){
      var rp = S(r.pic);
      if (tab === 'order'){ if (rp.toLowerCase().indexOf(pic.toLowerCase()) < 0) return false; }
      else if (rp !== pic) return false;
    }
    if (fy && S(r.fy) !== fy) return false;
    if (month){
      var mv = S(r.month) || S(r.period);
      if (mv !== month) return false;
    }
    if (area && S(r.area) !== area) return false;
    if (type){
      var tv = S(r.type) || S(r.typeTask);
      if (tv !== type) return false;
    }
    if (status && S(r.status) !== status) return false;
    if (from || to){
      var dv = S(r.start) || S(r.day) || S(r.openDate);
      if (dv){
        if (from && dv < from) return false;
        if (to   && dv > to)   return false;
      } else if (from || to) return false;
    }
    if (q){
      var hay = '';
      for (var k in r) if (k !== '_row') hay += ' ' + String(r[k]).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  });

  var sortKey = { weekly:'start', order:'month', monthly:'period', present:'month', customer:'code', cbc:'cbcCode', adp:'no', npp:'code' }[tab] || 'no';
  /* ⭐ v9.3 — danh bạ CBC: dòng mới nhất lên đầu. Trước đây xếp theo CBC code ⇒ khách event mới
     (CBC code còn trống / #N/A) rơi xuống cuối và bị cắt khi danh bạ vượt trần tải. */
  if (tab === 'cbc') rows.sort(function(a,b){ return b._row - a._row; });
  else rows.sort(function(a,b){ return String(b[sortKey] || '').localeCompare(String(a[sortKey] || '')); });

  var total  = rows.length;
  var offset = Math.max(0, parseInt(p.offset || 0, 10) || 0);
  var limit  = Math.min(15000, Math.max(1, parseInt(p.limit || 200, 10) || 200));   /* ⭐ v9.3 — 8.000 → 15.000 */
  var page   = rows.slice(offset, offset + limit);

  /* DẠNG NÉN: mảng-của-mảng kèm một dòng tên cột */
  if (S(p.lean) === '1' || p.lean === 1 || p.lean === true){
    var cols = ['_row'];
    for (var f in COL[tab]) cols.push(f);
    var out = page.map(function(r){ return cols.map(function(c){ return r[c] === undefined ? '' : r[c]; }); });
    return { ok:true, tab:tab, total:total, offset:offset, limit:limit, cols:cols, lean:out };
  }
  return { ok:true, tab:tab, total:total, offset:offset, limit:limit, rows: page };
}

/* ══════════════════════ DANH MỤC MÃ SẢN PHẨM (tab "12. PRODUCT CODE") ══════════════════════ */
var PCODE_HEAD = {
  no:'no', productname:'name', type:'type', description:'desc', length:'len',
  productcode:'code', detail:'detail', packing:'pack', unit:'unit'
};
function pcNorm_(s){
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}
/* Dò hàng tiêu đề trong 8 hàng đầu */
function pcHeaderRow_(s){
  var lc = Math.min(s.getLastColumn(), 26);
  var n  = Math.min(8, s.getLastRow());
  if (n < 1) return 0;
  var vals = s.getRange(1, 1, n, lc).getValues();
  for (var r = 0; r < n; r++){
    var hasDetail = false, hasCode = false;
    for (var c = 0; c < lc; c++){
      var k = pcNorm_(vals[r][c]);
      if (k === 'detail') hasDetail = true;
      if (k === 'productcode') hasCode = true;
    }
    if (hasDetail && hasCode) return r + 1;
  }
  return 0;
}
function productCodes(p){
  var s = null;
  try { s = ss().getSheetByName(TABS.pcode); } catch(e){}
  if (!s) return { ok:true, missing:true, groups:[], items:[],
                   message:'Chưa có tab "' + TABS.pcode + '" trong file. Tạo tab này và dán nội dung file PRODUCT_CODE vào (tiêu đề ở hàng 1).' };
  return cachedFor_('PCODE', ['pcode'], function(){ return productCodesRead_(s); });
}
function productCodesRead_(s){
  var hr = pcHeaderRow_(s);
  if (!hr) return { ok:false, error:'Tab "' + TABS.pcode + '" không thấy hai cột "Product code" và "Detail" ở 8 hàng đầu.' };
  var lc = Math.min(s.getLastColumn(), 26), lr = s.getLastRow();
  if (lr <= hr) return { ok:true, groups:[], items:[], total:0 };

  var head = s.getRange(hr, 1, 1, lc).getValues()[0], C = {};
  for (var i = 0; i < lc; i++){
    var k = pcNorm_(head[i]);
    for (var h in PCODE_HEAD){
      if (k === h || (k && k.indexOf(h) === 0)){ if (!C[PCODE_HEAD[h]]) C[PCODE_HEAD[h]] = i; break; }
    }
  }
  if (C.detail === undefined) return { ok:false, error:'Tab "' + TABS.pcode + '" thiếu cột "Detail".' };

  var vals = s.getRange(hr + 1, 1, lr - hr, lc).getValues();
  var items = [], gIdx = {}, groups = [], curType = '', seen = {};
  for (var r = 0; r < vals.length; r++){
    var row = vals[r];
    var t = S(row[C.type]);
    if (t) curType = t;
    var det = S(row[C.detail]);
    if (!det) continue;
    var low = det.toLowerCase();
    if (seen[low] !== undefined) continue;
    var idx = items.length;
    seen[low] = idx;
    items.push([ det, S(row[C.code]), S(row[C.pack]), S(row[C.unit]) ]);
    var g = curType || 'Khác';
    if (gIdx[g] === undefined){ gIdx[g] = groups.length; groups.push([g, []]); }
    groups[gIdx[g]][1].push(idx);
  }
  return { ok:true, groups:groups, items:items, total:items.length };
}

/* ══════════════════════ GHI DỮ LIỆU ══════════════════════ */
var AUTO_COLS = {
  customer: ['openMonth'],
  weekly  : ['type','province','area']
};

function saveRow(user, p, tab){
  if (!COL[tab]) return { ok:false, error:'Tab không hợp lệ' };
  var data = p.data;
  if (typeof data === 'string'){ try { data = JSON.parse(data); } catch(e){ return { ok:false, error:'Dữ liệu không hợp lệ' }; } }
  if (!data) return { ok:false, error:'Thiếu dữ liệu' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' }; }
  try {
    var s = sh(tab), map = COL[tab];
    var row = parseInt(data._row || 0, 10);
    var isNew = !row;

    if (isNew){
      row = firstEmptyRow(tab);
      if (map.no && !data.no) data.no = nextNo(tab);
    }

    if (tab === 'customer'){
      if (data.openDate && !data.openMonth){
        var m = /^(\d{4})-(\d{2})/.exec(String(data.openDate));
        if (m) data.openMonth = m[1] + m[2];
      }
    }

    var lastCol = 0;
    for (var k in map) if (map[k] > lastCol) lastCol = map[k];
    var cur = s.getRange(row, 1, 1, lastCol).getValues()[0];

    var lock_ = FORMULA_FIELDS[tab] || {};
    var _old = cur.slice();
    for (var f in map){
      if (!(f in data)) continue;
      if (lock_[f]) continue;
      var v = data[f];
      if (v === null || v === undefined) continue;
      if (/^(start|finish|day|openDate)$/.test(f)) v = s2d(v);
      if (/^(qty|price|amount|target|actual|targetAmt|actualAmt|zaloQty)$/.test(f) && v !== '') v = num(v);
      cur[map[f] - 1] = v;
    }
    writeRowKeepFormulas_(s, row, cur, lastCol, lock_, map);
    try { ensureFormulas_(s, row, lock_, map, 1); } catch(e){}

    if (tab === 'cbc' && isNew) writeCbcLog_(s, row, user, data);

    /* nhật ký dữ liệu khách hàng */
    if (tab === 'customer' || tab === 'cbc'){
      var _chg = [];
      if (!isNew) for (var _f in map){ if ((lock_[_f]) || _f === 'log') continue; var _i = map[_f] - 1;
        var _a = _old[_i], _b = cur[_i]; if (_a instanceof Date) _a = _a.getTime(); if (_b instanceof Date) _b = _b.getTime();
        if (String(_a == null ? '' : _a) !== String(_b == null ? '' : _b)) _chg.push(_f); }
      if (isNew || _chg.length){
        var _g = function(f){ return map[f] ? S(cur[map[f] - 1]) : ''; };
        custLog_(user && user.pic, isNew ? 'add' : 'update', tab,
          tab === 'cbc' ? { code:_g('code'), name:_g('name'), cbcCode:_g('cbcCode'), contact:_g('contact') } : { code:_g('code'), name:_g('name') },
          _chg, row, '');
      }
    }

    if (tab === 'adp') writeAdpStamp_(s, row, user, isNew);

    if (p && p.flush) SpreadsheetApp.flush();
    bumpVersion(bumpTabsFor_(tab));
    logAct(user, isNew ? 'add' : 'update', tab,
           S(data.name) || parseCheckName(data.account).name || S(data.code) || S(data.orderNo) || '',
           S(data.result) || S(data.plan) || S(data.typeTask) || S(data.product) || '', row);
    return { ok:true, row:row, isNew:isNew, no:data.no || '', message: isNew ? 'Đã thêm dòng mới' : 'Đã cập nhật' };
  } finally { lock.releaseLock(); }
}

/* ══════════════════════ LƯU CẢ ĐƠN HÀNG TRONG MỘT LẦN GỌI ══════════════════════ */
function saveOrders(user, p){
  var list = p.rows || p.data;
  if (typeof list === 'string'){ try { list = JSON.parse(list); } catch(e){ return { ok:false, error:'Dữ liệu không hợp lệ' }; } }
  if (!list || !list.length) return { ok:false, error:'Thiếu dữ liệu đơn hàng' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' }; }
  try {
    var s = sh('order'), map = COL.order, lockF = FORMULA_FIELDS.order || {};
    var lastCol = lastColOf('order');
    var rowsOut = [], news = [], newData = [];
    /* ⭐ v10.0 — đơn đã ghi bởi chính yêu cầu này (rid) ⇒ không ghi lại */
    var rid = S(p.rid);
    if (rid){
      var prev = orderLogFind_(rid);
      if (prev.length) return { ok:true, dup:true, rows:prev, count:prev.length, orderNo:S(list[0] && list[0].orderNo),
                                message:'Đơn đã được lưu trước đó (' + prev.length + ' dòng) — không ghi trùng' };
    }

    list.forEach(function(d){
      var row = parseInt(d._row || 0, 10);
      if (row){
        var cur = s.getRange(row, 1, 1, lastCol).getValues()[0];
        fillOrderCells_(cur, d, map, lockF);
        writeRowKeepFormulas_(s, row, cur, lastCol, lockF, map);
        rowsOut.push(row);
      } else { news.push(d); }
    });

    if (news.length){
      var start = firstEmptyRow('order');
      var cur2 = s.getRange(start, 1, news.length, lastCol).getValues();
      news.forEach(function(d, i){ fillOrderCells_(cur2[i], d, map, lockF); });
      writeBlockKeepFormulas_(s, start, cur2, lastCol, lockF, map);
      try { ensureFormulas_(s, start, lockF, map, news.length); } catch(e){}
      news.forEach(function(d, i){ rowsOut.push(start + i); newData.push(d); });
    }

    bumpVersion(bumpTabsFor_('order'));
    orderLog_(user, list, rowsOut, rid);
    var no = S(list[0] && list[0].orderNo), acc = S(list[0] && list[0].name);
    logAct(user, 'add', 'order', acc, 'đơn ' + no + ' · ' + list.length + ' dòng sản phẩm', rowsOut[0] || 0);
    return { ok:true, rows:rowsOut, count:list.length, orderNo:no,
             message:'Đã lưu ' + list.length + ' dòng sản phẩm cho đơn ' + no };
  } finally { lock.releaseLock(); }
}
function fillOrderCells_(cur, d, map, lockF){
  for (var f in map){
    if (!(f in d)) continue;
    if (lockF[f]) continue;
    var v = d[f];
    if (v === null || v === undefined) continue;
    if (f === 'day') v = s2d(v);
    if (/^(qty|price|amount|zaloQty)$/.test(f) && v !== '') v = num(v);
    cur[map[f] - 1] = v;
  }
  return cur;
}
/* Ghi NHIỀU dòng liền nhau, chừa nguyên các cột công thức */
function writeBlockKeepFormulas_(s, startRow, matrix, lastCol, lockF, map){
  var skip = {};
  for (var f in lockF) if (map[f]) skip[map[f]] = 1;
  var nR = matrix.length, c = 1;
  while (c <= lastCol){
    if (skip[c]) { c++; continue; }
    var from = c;
    while (c <= lastCol && !skip[c]) c++;
    var block = [];
    for (var i = 0; i < nR; i++) block.push(matrix[i].slice(from - 1, c - 1));
    s.getRange(startRow, from, nR, c - from).setValues(block);
  }
}
/* ── Nhật ký đơn hàng ── */
var ORDER_LOG_TAB = '_ORDER_LOG';
var ORDER_LOG_MAX = 4000;
function orderLogSheet_(){
  var s = ss().getSheetByName(ORDER_LOG_TAB);
  if (!s){
    s = ss().insertSheet(ORDER_LOG_TAB);
    s.getRange(1, 1, 1, 13).setValues([['Thời điểm','PIC','Order No.','Month','Account',
      'Product type','Detail','SL','Đơn giá','Amount','Dòng sheet','Nguồn','Req ID']]);
    s.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#3A5CAA').setFontColor('#ffffff');
    s.setFrozenRows(1);
    s.hideSheet();
  }
  return s;
}
/* ⭐ v10.0 — tìm các dòng đã ghi của 1 mã yêu cầu (đọc 400 dòng log cuối) */
function orderLogFind_(rid){
  try {
    var s = orderLogSheet_(), lr = s.getLastRow(); if (lr < 2) return [];
    if (S(s.getRange(1, 13).getValue()) !== 'Req ID') s.getRange(1, 13).setValue('Req ID');
    var n = Math.min(400, lr - 1), v = s.getRange(lr - n + 1, 11, n, 3).getValues(), out = [];
    v.forEach(function(r){ if (S(r[2]) === rid && r[0]) out.push(Number(r[0])); });
    return out;
  } catch(e){ return []; }
}
function orderLog_(user, list, rows, rid){
  try {
    var s = orderLogSheet_();
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var who = S(user && user.pic), out = [];
    list.forEach(function(d, i){
      out.push([ now, S(d.pic) || who, S(d.orderNo), S(d.month), S(d.name),
                 S(d.ptype), S(d.detail), num(d.qty), num(d.price), num(d.amount),
                 rows[i] || '', S(d.logSource) || appName_(), S(rid) ]);
    });
    if (!out.length) return;
    s.getRange(s.getLastRow() + 1, 1, out.length, 13).setValues(out);
    var lr = s.getLastRow();
    if (lr > ORDER_LOG_MAX + 500) s.deleteRows(2, lr - ORDER_LOG_MAX);
  } catch(e){}
}

/* ══════════════════════ THÊM ACCOUNT (KÈM CBC) TRONG MỘT LẦN GỌI ══════════════════════ */
function saveCustomerCbc(user, p){
  var cus = p.customer, cbc = p.cbc;
  if (typeof cus === 'string'){ try { cus = JSON.parse(cus); } catch(e){ cus = null; } }
  if (typeof cbc === 'string'){ try { cbc = JSON.parse(cbc); } catch(e){ cbc = null; } }
  if (!cus || !S(cus.name)) return { ok:false, error:'Thiếu tên địa bàn (Account name)' };

  var r1 = saveRow(user, { data:cus, flush:true }, 'customer');
  if (!r1.ok) return r1;

  var code = '';
  try { code = S(sh('customer').getRange(r1.row, COL.customer.code).getValue()); } catch(e){}
  var out = { ok:true, row:r1.row, code:code,
              customer:{ _row:r1.row, code:code, name:S(cus.name), type:S(cus.type),
                         province:S(cus.province), area:S(cus.area), pic:S(cus.pic),
                         address:S(cus.address), fy:S(cus.fy), openDate:S(cus.openDate) },
              message:'Đã thêm địa bàn "' + S(cus.name) + '"' + (code ? (' · mã ' + code) : '') };

  if (cbc && S(cbc.contact)){
    cbc.code = cbc.code || code;
    cbc.name = cbc.name || S(cus.name);
    cbc.type = cbc.type || S(cus.type);
    cbc.province = cbc.province || S(cus.province);
    cbc.area = cbc.area || S(cus.area);
    cbc.pic  = cbc.pic  || S(cus.pic);
    cbc.address = cbc.address || S(cus.address);
    var r2 = saveRow(user, { data:cbc, flush:true }, 'cbc');
    if (r2.ok){
      out.cbcRow = r2.row;
      out.cbc = { _row:r2.row, code:code, name:S(cbc.name), contact:S(cbc.contact),
                  jobTitle:S(cbc.jobTitle), phone:S(cbc.phone), type:S(cbc.type),
                  province:S(cbc.province), area:S(cbc.area), pic:S(cbc.pic) };
      try { out.cbc.cbcCode = S(sh('cbc').getRange(r2.row, COL.cbc.cbcCode).getValue()); } catch(e){}
      out.message += ' · kèm người liên lạc ' + S(cbc.contact);
    } else out.cbcWarn = r2.error;
  }
  return out;
}

/* ─────────── LOG TẠO MỚI CBC (cột S, cạnh cột Ghi chú) ─────────── */
function ensureCbcLogHeader_(s){
  try {
    var c = COL.cbc.log;
    var h = S(s.getRange(HEADER_ROW, c).getValue());
    if (!h) {
      s.getRange(HEADER_ROW, c).setValue('Log tạo mới');
      var ref = s.getRange(HEADER_ROW, COL.cbc.note);
      try {
        var t = s.getRange(HEADER_ROW, c);
        t.setBackground(ref.getBackground());
        t.setFontColor(ref.getFontColor());
        t.setFontWeight(ref.getFontWeight());
        t.setHorizontalAlignment(ref.getHorizontalAlignment());
      } catch(e){}
      try { s.setColumnWidth(c, 300); } catch(e){}
    }
  } catch(e){}
}
function cbcLogLine_(user, data){
  var when = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  var who  = S(user && user.pic) || 'không rõ';
  var mail = S(user && user.email);
  var src  = S(data && data.logSource) || APP_NAME;
  return 'Tạo mới ' + when + ' · ' + who + (mail ? (' (' + mail + ')') : '') + ' · ' + src;
}
function writeCbcLog_(s, row, user, data){
  try {
    ensureCbcLogHeader_(s);
    var c = COL.cbc.log;
    if (S(s.getRange(row, c).getValue())) return;
    s.getRange(row, c).setValue(cbcLogLine_(user, data));
  } catch(e){}
}

/* ─────────── DẤU THỜI GIAN CHO TAB "8. ADP" ─────────── */
function ensureAdpStampHeader_(s){
  try {
    var ref = s.getRange(HEADER_ROW, COL.adp.rFY);
    [[COL.adp.created,'Ngày tạo'],[COL.adp.updated,'Cập nhật lần cuối']].forEach(function(x){
      if (S(s.getRange(HEADER_ROW, x[0]).getValue())) return;
      s.getRange(HEADER_ROW, x[0]).setValue(x[1]);
      try {
        var t = s.getRange(HEADER_ROW, x[0]);
        t.setBackground(ref.getBackground());
        t.setFontColor(ref.getFontColor());
        t.setFontWeight(ref.getFontWeight());
        t.setHorizontalAlignment(ref.getHorizontalAlignment());
      } catch(e){}
      try { s.setColumnWidth(x[0], 150); } catch(e){}
    });
  } catch(e){}
}
function writeAdpStamp_(s, row, user, isNew){
  try {
    ensureAdpStampHeader_(s);
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    var who   = S(user && user.pic) || '';
    if (isNew || !S(s.getRange(row, COL.adp.created).getValue()))
      s.getRange(row, COL.adp.created).setValue(stamp + (who ? (' · ' + who) : ''));
    s.getRange(row, COL.adp.updated).setValue(stamp + (who ? (' · ' + who) : ''));
  } catch(e){}
}

/* Weekly cần tính thêm 3 cột auto + FY + Start Month từ "Check account name" và ngày */
function saveWeekly(user, p){
  var data = p.data;
  if (typeof data === 'string'){ try { data = JSON.parse(data); } catch(e){ return { ok:false, error:'Dữ liệu không hợp lệ' }; } }
  if (!data) return { ok:false, error:'Thiếu dữ liệu' };

  var pc = parseCheckName(data.account);
  var tbd = /^TBD$/i.test(pc.name || '');

  if (tbd){
    data.account  = [TBD_NAME, TBD_NAME, S(pc.province), S(pc.area)].join('/');
    data.type     = TBD_NAME;
    data.province = S(pc.province);
    data.area     = S(pc.area);
    if (!S(data.typeAction)) data.typeAction = 'Visiting';
    if (!S(data.process))    data.process    = 'TÌM HIỂU';
    if (!S(data.typeTask)) data.typeTask = defaultTypeTask_();
    if (S(data.start)){
      data.start  = mondayOfIso_(S(data.start));
      data.finish = addDaysISO(data.start, 6);
    }
    var dup = tbdRowOfWeek_(S(data.pic), S(data.start), parseInt(data._row || 0, 10));
    if (dup) return { ok:false, tbdDup:true, row:dup,
      error:'Tuần ' + fmtVN(S(data.start)) + ' – ' + fmtVN(addDaysISO(S(data.start), 6)) +
            ' đã có một dòng kế hoạch đi địa bàn chưa xác định account của ' +
            (S(data.pic) || 'PIC này') + ' (dòng ' + dup + '). Mỗi tuần chỉ một dòng — ' +
            'hãy mở dòng đó ra sửa thay vì tạo thêm.' };
  } else {
    if (pc.type)     data.type     = pc.type;
    if (pc.province) data.province = pc.province;
    if (pc.area)     data.area     = pc.area;
  }

  /* ⭐ v10.8 — chưa tới ngày ⇒ không Completed · Completed sớm ⇒ Finish date = hôm nay */
  var _prev = null, _r = parseInt(data._row || 0, 10);
  if (_r){ try { _prev = readTab('weekly').filter(function(x){ return x._row === _r; })[0] || null; } catch(e){} }
  var _err = wkApplyRule_(data, _prev, 'vi');
  if (_err) return { ok:false, error:_err };

  var st = S(data.start);
  if (st){
    var m = /^(\d{4})-(\d{2})/.exec(st);
    if (m){
      if (!data.month) data.month = m[1] + m[2];
      if (!data.fy)    data.fy    = fyOfMonth(m[1] + m[2]);
    }
  }
  if (!data.finish) data.finish = data.start;

  var out = saveRow(user, { data:data }, 'weekly');
  if (tbd && out && out.ok){
    out.tbd = true;
    out.message = 'Đã lưu kế hoạch đi địa bàn (chưa xác định account)';
  }

  /* LƯU TASK VÀ TẢI ẢNH TRONG MỘT LƯỢT */
  var ph = p.photo;
  if (typeof ph === 'string'){ try { ph = JSON.parse(ph); } catch(e){ ph = null; } }
  if (out && out.ok && ph && S(ph.b64)){
    try {
      var up = uploadPhoto(user, {
        b64: ph.b64, mime: ph.mime || 'image/jpeg', row: out.row,
        account: data.account, date: S(data.start).slice(0, 10),
        pic: S(data.pic) || S(user && user.pic), replace: 1,
        lat: ph.lat, lng: ph.lng, acc: ph.acc
      });
      out.photo = up;
      if (up && up.ok) out.message = (out.message || 'Đã lưu') + ' · đã tải ảnh lên Drive';
    } catch(e){
      out.photoError = String(e && e.message || e);
    }
  }
  return out;
}

/* YYYYMM → FYxx (kỳ FY chạy T9 → T8) */
function fyOfMonth(ym){
  var y = parseInt(String(ym).slice(0,4), 10), m = parseInt(String(ym).slice(4,6), 10);
  var base = (m >= 9) ? y : y - 1;
  return 'FY' + (base - 1958);
}

function deleteRow(user, p){
  var tab = S(p.tab), row = parseInt(p.row || 0, 10);
  if (!COL[tab] || !row) return { ok:false, error:'Thiếu tab hoặc row' };
  /* ⭐ v9.3 — quản lý xoá mọi dòng; sales xoá được task / account / CBC do CHÍNH MÌNH phụ trách */
  if (!isManager(user)){
    if (['weekly','cbc','customer'].indexOf(tab) < 0) return { ok:false, error:'Chỉ quản lý mới được xoá dòng ở tab này.' };
    var ownerPic = S(sh(tab).getRange(row, COL[tab].pic).getValue());
    if (ownerPic && ownerPic.toLowerCase() !== S(user.pic).toLowerCase())
      return { ok:false, error:'Bạn chỉ được xoá dữ liệu do mình phụ trách (dòng này của ' + ownerPic + ').' };
  }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận.' }; }
  try {
    var nPh = 0;
    if (tab === 'weekly'){
      try {
        var sw = sh('weekly');
        nPh = trashPhotos_(S(sw.getRange(row, COL.weekly.photo).getValue()));
        sw.getRange(row, COL.weekly.photo).setValue('');
        sw.getRange(row, COL.weekly.gpsInfo).setValue('');
      } catch(e){}
    }
    var _rec = null;
    if (tab === 'customer' || tab === 'cbc'){
      try { var _m = COL[tab], _v = sh(tab).getRange(row, 1, 1, 20).getValues()[0], _g = function(f){ return _m[f] ? S(_v[_m[f] - 1]) : ''; };
        _rec = tab === 'cbc' ? { code:_g('code'), name:_g('name'), cbcCode:_g('cbcCode'), contact:_g('contact') } : { code:_g('code'), name:_g('name') }; } catch(e){}
    }
    sh(tab).deleteRow(row);
    SpreadsheetApp.flush();
    bumpVersion(bumpTabsFor_(tab));
    if (_rec) custLog_(user && user.pic, 'delete', tab, _rec, [], row, S(p.reason || ''));
    logAct(user, 'delete', tab, 'dòng ' + row, nPh ? ('xoá kèm ' + nPh + ' ảnh trên Drive') : '', row);
    return { ok:true, photosDeleted:nPh,
             message:'Đã xoá dòng ' + row + (nPh ? (' và ' + nPh + ' ảnh trên Drive') : '') };
  } finally { lock.releaseLock(); }
}

/* ══════════════════════ ⭐ v9.3 — XOÁ ACCOUNT KÈM CBC ══════════════════════
   Lần 1 (không confirm): trả preview { name, code, cbc, visits } để app hỏi lại người dùng.
   Lần 2 (confirm=1): xoá các dòng CBC của account (khớp Customer code hoặc tên account) rồi xoá dòng account.
   Lượt đi địa bàn (tab 6) GIỮ NGUYÊN làm lịch sử. Quyền: quản lý, hoặc PIC của account. */
function deleteAccount(user, p){
  var row = parseInt(p.row || 0, 10);
  if (!row || row < DATA_ROW) return { ok:false, error:'Thiếu dòng account' };
  var cs = sh('customer'), m = COL.customer;
  var v = cs.getRange(row, 1, 1, lastColOf('customer')).getValues()[0];
  var code = S(cell(v[m.code - 1])), name = S(v[m.name - 1]), pic = S(v[m.pic - 1]);
  if (!name) return { ok:false, error:'Dòng ' + row + ' không có account' };
  if (S(p.name) && normName_(p.name) !== normName_(name))
    return { ok:false, error:'Dòng ' + row + ' giờ là "' + name + '" — dữ liệu đã đổi, tải lại app rồi thử lại.' };
  if (!isManager(user) && pic && pic.toLowerCase() !== S(user.pic).toLowerCase())
    return { ok:false, error:'Chỉ ' + pic + ' hoặc quản lý mới xoá được account này.' };

  var cc = COL.cbc, cv = rawValues('cbc'), key = normName_(name), cbcRows = [];
  for (var i = 0; i < cv.length; i++){
    var bc = S(cell(cv[i][cc.code - 1])), bn = normName_(cv[i][cc.name - 1]);
    if ((code && bc === code) || (key && bn === key)) cbcRows.push(DATA_ROW + i);
  }
  var visits = 0;
  colValues('weekly', COL.weekly.account).forEach(function(a){ if (normName_(parseCheckName(a).name) === key) visits++; });

  if (S(p.confirm) !== '1')
    return { ok:true, preview:true, row:row, name:name, code:code, cbc:cbcRows.length, visits:visits };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' }; }
  try {
    var bs = sh('cbc');
    cbcRows.sort(function(a, b){ return b - a; }).forEach(function(r){ bs.deleteRow(r); });
    cs.deleteRow(row);
    SpreadsheetApp.flush();
    bumpVersion(['customer', 'cbc']);
    custLog_(user && user.pic, 'delete', 'customer', { code:code, name:name }, [], row, 'kèm ' + cbcRows.length + ' CBC');
    logAct(user, 'delete', 'customer', name, 'xoá account + ' + cbcRows.length + ' CBC', row);
    return { ok:true, deleted:true, cbc:cbcRows.length,
             message:'Đã xoá account "' + name + '" và ' + cbcRows.length + ' người liên hệ (CBC)' };
  } finally { lock.releaseLock(); }
}

/* ══════════════════════ UPLOAD ẢNH ĐI ĐỊA BÀN ══════════════════════
 * Mỗi task 1 ảnh. Toạ độ GPS + địa chỉ nơi chụp ghi vào cột W (gpsInfo). */
function gpsAddress_(lat, lng){
  var key = 'GEO|' + Number(lat).toFixed(4) + ',' + Number(lng).toFixed(4);
  try {
    var c = CacheService.getScriptCache(), hit = c.get(key);
    if (hit !== null && hit !== undefined) return hit === '-' ? '' : hit;
  } catch(e){}
  var addr = '';
  try {
    var r = Maps.newGeocoder().setLanguage('vi').reverseGeocode(lat, lng);
    if (r && r.results && r.results.length) addr = S(r.results[0].formatted_address);
  } catch(e){}
  try { CacheService.getScriptCache().put(key, addr || '-', 21600); } catch(e){}
  return addr;
}
function gpsLine_(lat, lng, acc, addr){
  var s = '📍 ' + Number(lat).toFixed(6) + ',' + Number(lng).toFixed(6);
  if (acc) s += ' (±' + Math.round(Number(acc)) + 'm)';
  if (addr) s += ' · ' + addr;
  return s;
}
/* Tách lại GPS/địa chỉ từ ô để trả về cho app */
function parseGps_(cellVal){
  var m = /📍\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)([^\n]*)/.exec(S(cellVal));
  if (!m) return { gps:'', gpsAddr:'' };
  var rest = S(m[3]), addr = '', k = rest.indexOf('·');
  if (k >= 0) addr = S(rest.slice(k + 1));
  return { gps: m[1] + ', ' + m[2] + S(rest.split('·')[0]).replace(/^\s+/, ' '), gpsAddr: addr };
}
/* giờ tải ảnh ghi ở cột W: "🕒 2026-09-24 10:35" */
function parseUpAt_(cellVal){
  var m = /🕒\s*(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2})/.exec(S(cellVal));
  return m ? m[1] : '';
}
/* GIỜ TẢI của các ảnh CŨ: lấy ngày tạo file trên Drive (tối đa 150 id / lần, cache 6 giờ) */
function photoMeta(p){
  var ids = S(p.ids).split(/[,\s]+/).filter(function(x){ return /^[-\w]{20,}$/.test(x); }).slice(0, 150);
  var c = CacheService.getScriptCache(), out = {}, miss = [];
  var got = {}; try { got = c.getAll(ids.map(function(i){ return 'PT|' + i; })) || {}; } catch(e){}
  ids.forEach(function(i){ var v = got['PT|' + i]; if (v) out[i] = v; else miss.push(i); });
  var tz = Session.getScriptTimeZone(), put = {}, t0 = Date.now();
  miss.forEach(function(i){
    if (Date.now() - t0 > 20000) return;
    try {
      var d = DriveApp.getFileById(i).getDateCreated();
      out[i] = Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm'); put['PT|' + i] = out[i];
    } catch(e){ out[i] = ''; put['PT|' + i] = '-'; }
  });
  try { if (Object.keys(put).length) c.putAll(put, 21600); } catch(e){}
  Object.keys(out).forEach(function(k){ if (out[k] === '-') out[k] = ''; });
  return { ok:true, times:out, left: ids.length - Object.keys(out).length };
}
/* TRẢ ẢNH DẠNG BASE64 để app dựng file PowerPoint (tối đa 6 ảnh / ~3 MB mỗi lần) */
function photoB64(p){
  var ids = S(p.ids).split(/[,\s]+/).filter(function(x){ return /^[-\w]{20,}$/.test(x); }).slice(0, 6);
  var out = {}, left = [], total = 0, tz = Session.getScriptTimeZone();
  ids.forEach(function(id){
    if (total > 3000000){ left.push(id); return; }
    try {
      var f = DriveApp.getFileById(id), b = f.getBlob(), bytes = b.getBytes();
      var b64 = Utilities.base64Encode(bytes);
      total += b64.length;
      out[id] = { mime: b.getContentType() || 'image/jpeg', b64: b64,
                  at: Utilities.formatDate(f.getDateCreated(), tz, 'yyyy-MM-dd HH:mm') };
    } catch(e){ out[id] = { error: e.message }; }
  });
  return { ok:true, photos:out, left:left };
}
/* Bỏ vào thùng rác các file Drive đang được nhắc trong ô — trả về số ảnh đã xoá */
function trashPhotos_(cellVal){
  var n = 0;
  photoObjs(cellVal).forEach(function(o){
    if (!o.id) return;
    try { DriveApp.getFileById(o.id).setTrashed(true); n++; } catch(e){}
  });
  return n;
}

function uploadPhoto(user, p){
  var b64  = String(p.b64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!b64) return { ok:false, error:'Không có dữ liệu ảnh' };
  var mime = String(p.mime || 'image/jpeg');
  var pic  = S(p.pic || user.pic) || 'PIC';
  var acc  = parseCheckName(p.account).name || S(p.accountName) || 'Account';
  var day  = S(p.date) || todayISO();
  var replace = (String(p.replace || '') === '1' || p.replace === 1 || p.replace === true);

  var hasGps = (p.lat !== undefined && p.lat !== null && S(p.lat) !== '');
  var lat = hasGps ? Number(p.lat) : 0, lng = hasGps ? Number(p.lng) : 0;
  var addr = hasGps ? gpsAddress_(lat, lng) : '';
  var gLine = hasGps ? gpsLine_(lat, lng, p.acc, addr) : '';
  var upStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  gLine = (gLine ? gLine + '\n' : '') + '🕒 ' + upStamp;

  var row = parseInt(p.row || 0, 10);

  var folder = DriveApp.getFolderById(photoFolderId_());
  /* TÊN ẢNH: <PIC>_<YYYYMMDD>_<Khách hàng>_<STT ảnh trong tháng> */
  var seq    = photoSeq_(pic, day, row);
  var name   = photoName_(pic, day, acc, seq);
  var blob   = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
  var file   = folder.createFile(blob);
  ensureFolderShared_(folder);
  if (addr) { try { file.setDescription(gLine); } catch(e){} }
  var url = 'https://drive.google.com/file/d/' + file.getId() + '/view';

  if (row){
    /* MỖI TASK ĐÚNG 1 ẢNH: ảnh cũ vào thùng rác, cột V chỉ 1 URL, GPS ở cột W */
    var s = sh('weekly'), c = COL.weekly.photo;
    trashPhotos_(S(s.getRange(row, c).getValue()));
    s.getRange(row, c).setValue(url);
    s.getRange(row, COL.weekly.gpsInfo).setValue(gLine || '');
  }
  bumpVersion(['weekly']);
  logAct(user, 'photo', 'weekly', acc, (replace ? 'thay ảnh' : '1 ảnh') + (addr ? (' · ' + addr) : ''), row);
  return { ok:true, url:url, id:file.getId(), name:name, seq:seq,
           thumb:'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
           gps: hasGps ? (lat.toFixed(6) + ', ' + lng.toFixed(6)) : '',
           gpsAddr: addr,
           message:'Đã tải ảnh lên Drive' + (addr ? (' · ' + addr) : '') };
}

/* Mở quyền xem cho folder ảnh — chỉ làm một lần, nhớ lại bằng Script Property */
function ensureFolderShared_(folder){
  try {
    var pk = 'FOLDER_SHARED_' + folder.getId();
    if (props_().getProperty(pk) === '1') return;
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    props_().setProperty(pk, '1');
  } catch(e){}
}
function safeSeg_(v){
  return S(v).replace(/[\\\/:*?"<>|\[\]]/g, '-').replace(/\s+/g, ' ').trim();
}
function photoName_(pic, dayIso, acc, seq){
  var ymd = S(dayIso).replace(/-/g, '').slice(0, 8) ||
            Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var n2  = ('00' + (seq || 1)).slice(-2);
  var base = safeSeg_(pic || 'PIC') + '_' + ymd + '_' + safeSeg_(acc || 'Account').slice(0, 60) + '_' + n2;
  return base.slice(0, 120) + '.jpg';
}
/* Số thứ tự ảnh của 1 PIC trong tháng (cache 6 giờ, hết cache thì quét lại) */
function photoSeq_(pic, dayIso, rowSkip){
  var ym0 = S(dayIso).replace(/-/g, '').slice(0, 6);
  if (!ym0) return 1;
  var ck = 'PSEQ|' + TEAM() + '|' + S(pic).toLowerCase() + '|' + ym0;
  try {
    var c = CacheService.getScriptCache(), hit = c.get(ck);
    if (hit){
      var nx = parseInt(hit, 10) + 1;
      if (nx > 0 && nx < 100000){ c.put(ck, String(nx), 21600); return nx; }
    }
  } catch(e){}
  var seq = photoSeqScan_(pic, dayIso, rowSkip);
  try { CacheService.getScriptCache().put(ck, String(seq), 21600); } catch(e){}
  return seq;
}
function photoSeqScan_(pic, dayIso, rowSkip){
  try {
    var ym = S(dayIso).replace(/-/g, '').slice(0, 6);
    if (!ym) return 1;
    var s = sh('weekly');
    var last = s.getLastRow();
    if (last < DATA_ROW) return 1;
    var nRow = last - DATA_ROW + 1;
    var pics   = s.getRange(DATA_ROW, COL.weekly.pic,   nRow, 1).getValues();
    var starts = s.getRange(DATA_ROW, COL.weekly.start, nRow, 1).getValues();
    var photos = s.getRange(DATA_ROW, COL.weekly.photo, nRow, 1).getValues();
    var key = S(pic).toLowerCase(), cnt = 0;
    for (var i = 0; i < nRow; i++){
      var r = DATA_ROW + i;
      if (rowSkip && r === rowSkip) continue;
      if (S(pics[i][0]).toLowerCase() !== key) continue;
      if (!S(photos[i][0])) continue;
      if (S(d2s(starts[i][0])).replace(/-/g, '').slice(0, 6) !== ym) continue;
      cnt++;
    }
    return cnt + 1;
  } catch(e){ return 1; }
}

/* ─────────── DỌN ẢNH KỲ CŨ SANG FOLDER LƯU TRỮ (menu ③) ─────────── */
function archivePhotosByFY(fy){
  fy = S(fy);
  if (!fy) throw new Error('Cần chỉ rõ FY, ví dụ FY67');
  var root = DriveApp.getFolderById(photoFolderId_());
  var name = ARCHIVE_PREFIX + fy;
  var it = root.getFoldersByName(name);
  var dest = it.hasNext() ? it.next() : root.createFolder(name);

  var s = sh('weekly'), last = s.getLastRow();
  if (last < DATA_ROW) return { ok:true, moved:0, message:'Tab 6. WEEKLY REPORT chưa có dữ liệu' };
  var nRow = last - DATA_ROW + 1;
  var fys    = s.getRange(DATA_ROW, COL.weekly.fy,    nRow, 1).getValues();
  var photos = s.getRange(DATA_ROW, COL.weekly.photo, nRow, 1).getValues();

  var moved = 0, missing = 0, already = 0;
  for (var i = 0; i < nRow; i++){
    if (S(fys[i][0]).toUpperCase() !== fy.toUpperCase()) continue;
    var cellv = S(photos[i][0]); if (!cellv) continue;
    photoObjs(cellv).forEach(function(o){
      if (!o.id) return;
      try {
        var f = DriveApp.getFileById(o.id);
        var par = f.getParents(), inDest = false;
        while (par.hasNext()) if (par.next().getId() === dest.getId()) inDest = true;
        if (inDest) { already++; return; }
        dest.addFile(f);
        try { root.removeFile(f); } catch(e){}
        moved++;
      } catch(e){ missing++; }
    });
  }
  var msg = 'Đã chuyển ' + moved + ' ảnh của ' + fy + ' sang folder "' + name + '"' +
            (already ? (' · ' + already + ' ảnh đã ở đó từ trước') : '') +
            (missing ? (' · ' + missing + ' ảnh không truy cập được (có thể đã xoá)') : '');
  logAct({pic:'system', email:''}, 'photo', 'weekly', fy, msg, 0);
  return { ok:true, moved:moved, already:already, missing:missing,
           folderId:dest.getId(), url:dest.getUrl(), message:msg };
}
/* Đổi tên toàn bộ ảnh cũ về đúng quy tắc mới — chạy 1 lần sau khi cập nhật. */
function renamePhotosToStandard(){
  var s = sh('weekly'), last = s.getLastRow();
  if (last < DATA_ROW) return 'Chưa có dữ liệu';
  var nRow = last - DATA_ROW + 1;
  var pics    = s.getRange(DATA_ROW, COL.weekly.pic,     nRow, 1).getValues();
  var starts  = s.getRange(DATA_ROW, COL.weekly.start,   nRow, 1).getValues();
  var accs    = s.getRange(DATA_ROW, COL.weekly.account, nRow, 1).getValues();
  var photos  = s.getRange(DATA_ROW, COL.weekly.photo,   nRow, 1).getValues();
  var seqOf = {}, done = 0, fail = 0;
  for (var i = 0; i < nRow; i++){
    var cellv = S(photos[i][0]); if (!cellv) continue;
    var pic = S(pics[i][0]), day = d2s(starts[i][0]);
    var acc = parseCheckName(accs[i][0]).name || 'Account';
    var k = pic.toLowerCase() + '|' + S(day).replace(/-/g,'').slice(0,6);
    seqOf[k] = (seqOf[k] || 0) + 1;
    var want = photoName_(pic, day, acc, seqOf[k]);
    photoObjs(cellv).forEach(function(o){
      if (!o.id) return;
      try {
        var f = DriveApp.getFileById(o.id);
        if (f.getName() !== want){ f.setName(want); done++; }
      } catch(e){ fail++; }
    });
  }
  var msg = 'Đã đổi tên ' + done + ' ảnh về chuẩn <PIC>_<YYYYMMDD>_<Khách hàng>_<STT>' +
            (fail ? (' · ' + fail + ' ảnh lỗi') : '');
  SpreadsheetApp.getUi().alert(msg);
  return msg;
}

/* XOÁ ẢNH: xoá file Drive + gỡ link khỏi ô cột V */
function deletePhoto(user, p){
  var row = parseInt(p.row || p.rowIndex || 0, 10);
  if (!row) return { ok:false, error:'Thiếu số dòng' };
  var s = sh('weekly'), c = COL.weekly.photo;
  var cur = S(s.getRange(row, c).getValue());
  if (!cur) return { ok:true, message:'Dòng này chưa có ảnh' };

  var owner = S(s.getRange(row, COL.weekly.pic).getValue());
  if (!isManager(user) && owner.toLowerCase() !== S(user.pic).toLowerCase())
    return { ok:false, error:'Bạn chỉ được xoá ảnh của task do mình phụ trách.' };

  var n = 0;
  photoObjs(cur).forEach(function(o){
    n++; try { DriveApp.getFileById(o.id).setTrashed(true); } catch(e){}
  });
  s.getRange(row, c).setValue('');
  s.getRange(row, COL.weekly.gpsInfo).setValue('');
  bumpVersion(['weekly']);
  logAct(user, 'delete', 'weekly', 'ảnh dòng ' + row, 'xoá ' + n + ' ảnh', row);
  return { ok:true, message:'Đã xoá ' + n + ' ảnh khỏi Drive và sheet' };
}

function todayISO(){ var d = new Date(); return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2); }

/* 4 lựa chọn duy nhất của cột T "Next action" (6. WEEKLY REPORT) */
var NEXT_ACTIONS = [
  'Tiếp tục chăm - Tăng tốc',
  'Tiếp tục chăm - Duy trì',
  'Chờ - Thử lại sau 30 ngày',
  'Dừng lại'
];
/* chạy 1 lần: đặt tiêu đề cột W và dọn cột V về đúng 1 URL/dòng. Ảnh thừa vào thùng rác Drive. */
function cleanupPhotoColumn(){
  var s = sh('weekly'), cV = COL.weekly.photo, cW = COL.weekly.gpsInfo;
  s.getRange(HEADER_ROW, cW).setValue('GPS & địa chỉ chụp');
  var last = s.getLastRow(), fixed = 0, trashed = 0;
  if (last < DATA_ROW) return 'Sheet chưa có dữ liệu.';
  var vals = s.getRange(DATA_ROW, cV, last - DATA_ROW + 1, 1).getValues();
  for (var i = 0; i < vals.length; i++){
    var cellv = S(vals[i][0]);
    if (!cellv) continue;
    var objs = photoObjs(cellv);
    var g = parseGps_(cellv);
    if (objs.length <= 1 && cellv.indexOf('\n') < 0 && !g.gps) continue;
    for (var k = 1; k < objs.length; k++){
      try { DriveApp.getFileById(objs[k].id).setTrashed(true); trashed++; } catch(e){}
    }
    s.getRange(DATA_ROW + i, cV).setValue(objs.length ? objs[0].open : '');
    if (g.gps) s.getRange(DATA_ROW + i, cW).setValue('📍 ' + g.gps + (g.gpsAddr ? (' · ' + g.gpsAddr) : ''));
    fixed++;
  }
  SpreadsheetApp.flush();
  bumpVersion(['weekly']);
  return 'Đã dọn ' + fixed + ' dòng, bỏ vào thùng rác ' + trashed + ' ảnh thừa.';
}

function setupNextActionValidation(){
  var s = sh('weekly');
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(NEXT_ACTIONS, true)
    .setAllowInvalid(false)
    .setHelpText('Chọn 1 trong 4 hành động tiếp theo')
    .build();
  var nRows = Math.max(s.getMaxRows() - DATA_ROW + 1, 2000);
  s.getRange(DATA_ROW, COL.weekly.nextAction, nRows, 1).setDataValidation(rule);
  return 'Đã gắn dropdown 4 lựa chọn cho cột T (Next action) — ' + nRows + ' dòng.';
}

var QUARTERS = [
  { name:'Q1', label:'T9 · T10 · T11', idx:[0,1,2] },
  { name:'Q2', label:'T12 · T1 · T2',  idx:[3,4,5] },
  { name:'Q3', label:'T3 · T4 · T5',   idx:[6,7,8] },
  { name:'Q4', label:'T6 · T7 · T8',   idx:[9,10,11] }
];

/* ══════════════════════ KPI ENGINE THEO FILE MMH KPI FY68 ══════════════════════
 * Tab "9. MỤC TIÊU & KPI" là bảng KPI FY68 CÓ CÔNG THỨC (module KPI FY68 ở cuối file).
 * Tạo tab lần đầu: menu MMH CRM ▸ ⑪ Tạo lại tab KPI theo file KPI FY68. */
function kpiReport(p){
  var fy = S(p.fy) || currentFY();
  var base = { ok:true, v68:true, fy:fy, prevFY:prevFY(fy), quarters:QUARTERS,
               months: fyMonths(fy).map(String), monthLabels: fyMonths(fy).map(function(m){ return 'T' + parseInt(String(m).slice(4,6), 10); }),
               groups:[], pics:[], blocks:[], partA:[], settings:{} };
  var s = null; try { s = kpiTab_(); } catch(e){}
  try { if (s && k68CalcSupp_(s)) SpreadsheetApp.flush(); } catch(eC){}      /* ⭐ v10.6 — C5 / C6 / C7 luôn theo đơn hàng mới nhất */
  var R = s ? k68Read_(s) : null;
  if (!R){ base.notBuilt = true; return base; }
  base.sheetFy = R.fy; base.settings = R.settings;
  /* ⭐ v10.0 — app tự tính realtime C5 / C6 / C7 từ đơn hàng theo ĐÚNG rule của tab 9 */
  try {
    var _ks = s.getRange('D7:E8').getValues();
    base.settings.comp1 = S(_ks[0][0]); base.settings.comp2 = S(_ks[0][1]);
    base.settings.jz1 = S(_ks[1][0]);   base.settings.jz2 = S(_ks[1][1]);
    base.settings.rateVal = K68_RATE_DEF;
    base.settings.rates = k68RatesEff_(base.months); base.settings.ratesRaw = k68RatesRaw_();
  } catch(e){}
  base.npp = K68_NPP[TEAM()] || {};
  if (R.fy && R.fy !== fy){ base.otherFy = true; return base; }
  base.months = R.months; if (R.monthLabels && R.monthLabels.length) base.monthLabels = R.monthLabels;
  base.groups = R.groups; base.pics = R.pics; base.blocks = k68Legacy_(R);
  return base;
}
/* Target FY68 do file KPI FY68 quyết định ⇒ app không sửa target nữa */
function saveKpiTarget(user, p){
  return { ok:false, error:'Target FY68 lấy từ file MMH KPI FY68. Sửa trong file KPI rồi bấm "⟳ Đồng bộ file KPI FY68", hoặc sửa trực tiếp các ô vàng ở tab ' + TABS.kpi + '.' };
}
/* Nút "Đồng bộ file KPI FY68" trên app (quản lý) */
function kpiSyncApi(user, p){
  if (!isManager(user)) return { ok:false, error:'Chỉ quản lý / trưởng nhóm được đồng bộ file KPI.' };
  var s = kpiTab_();
  if (!s) return { ok:false, error:'Không thấy tab ' + TABS.kpi };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau ít phút.' }; }
  try {
    var fix = !props_().getProperty('K68_FIX102'), r;
    if (fix) _K68_FORCE = k68ForceCodes_();
    try { k68CalcSupp_(s); SpreadsheetApp.flush(); r = k68Sync_(s, 'vi', TEAM(), { manual:true });
          if (r.ok && !r.mode){ s = kpiTab_(); SpreadsheetApp.flush(); k68CalcSupp_(s); SpreadsheetApp.flush(); r = k68Sync_(s, 'vi', TEAM(), { manual:true }); } }
    finally { _K68_FORCE = null; }
    if (!r.ok) return r;
    if (fix && r.mode) try { props_().setProperty('K68_FIX102', Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + (r.cells || 0) + ' ô'); } catch(e){}
    bumpVersion(['kpi']);
    logAct(user, 'kpi', 'kpi', 'Đồng bộ file KPI FY68', r.message, '');
    r.kpi = kpiReport({ fy: S(p.fy) || currentFY() });
    return r;
  } finally { lock.releaseLock(); }
}
/* đăng ký file này với file KPI tổng + đồng bộ 1 lần */
function kpiLinkAndSync_(){
  var out = { reg:'', sync:null }, s = kpiTab_();
  try {
    var A = k68LinkAdapter_(s ? s.getRange(K68_SET.link).getValue() : '');
    k68Register_(A.ss, ss(), TABS.kpi, TEAM(), 'vi');
    out.reg = 'Đã đăng ký file này với file KPI tổng (sheet _CRM_LINKS) ⇒ KPI Hub tự đồng bộ 5 phút/lần.';
    if (s){ out.sync = k68Sync_(s, 'vi', TEAM(), { manual:true, adapter:A }); if (out.sync.ok) bumpVersion(['kpi']); }
  } catch(e){
    out.reg = '⚠️ File này chưa mở được file KPI tổng (' + e.message + ').\nKhông sao — làm 1 lần: mở file KPI tổng ▸ sheet "_CRM_LINKS" ▸ dán link dưới đây vào cột B dòng "' + TEAM() + '":\n' + ss().getUrl() +
              '\nrồi menu MMH KPI Hub ▸ ⑦ Bật đồng bộ tự động.';
  }
  return out;
}
function setupKpiFY68(){
  var ui = null; try { ui = SpreadsheetApp.getUi(); } catch(e){}
  if (ui){
    var a = ui.alert('Tạo lại tab KPI FY68 — nhóm ' + teamLabel_(),
      'Tab "' + TABS.kpi + '" sẽ được dựng lại theo file MMH KPI FY68 (mã KPI, target 12 tháng, công thức actual).\n\n' +
      '· Tab KPI kiểu cũ được đổi tên thành "9. KPI cũ (trước FY68)" và ẩn đi — không mất dữ liệu.\n' +
      '· Nếu tab đã là mẫu FY68: giữ nguyên ô nhập tay (target, doanh số NPP, SKU mới, review quý, cài đặt).\n\nTiếp tục?',
      ui.ButtonSet.OK_CANCEL);
    if (a !== ui.Button.OK) return;
  }
  kpiTab_();
  var r = k68Setup_(ss(), TABS.kpi, TEAM());
  _SH = {}; SpreadsheetApp.flush();
  bumpVersion(['kpi']);
  var L = kpiLinkAndSync_();
  var msg = 'Đã dựng tab "' + TABS.kpi + '" cho nhóm ' + teamLabel_() + ': ' + r.rows + ' dòng KPI.' +
    (r.kept ? '\nĐã giữ lại các ô nhập tay của bảng cũ.' : '') + '\n\n' + L.reg +
    (L.sync ? '\nĐồng bộ lần đầu: ' + (L.sync.ok ? L.sync.message : L.sync.error) : '');
  if (ui) ui.alert(msg);
  return msg;
}
function syncKpiFY68(){
  var L = kpiLinkAndSync_();
  var msg = L.sync ? (L.sync.ok ? 'Đã đồng bộ với file KPI tổng.\n\n' + L.sync.message : 'Chưa đồng bộ được:\n' + L.sync.error) : L.reg;
  if (L.sync && L.sync.ok) msg += '\n\n' + L.reg;
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return L.sync || { ok:false, error:L.reg };
}
/* giữ tên cũ (trigger cũ nếu có) */
function kpiDailySync(){
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try { var s = kpiTab_(); if (!s) return; try { k68CalcSupp_(s); SpreadsheetApp.flush(); } catch(e0){}
        var fix = !props_().getProperty('K68_FIX102'); if (fix) _K68_FORCE = k68ForceCodes_();
        var r = k68Sync_(s, 'vi', TEAM()); if (r.ok && (r.targets || r.pulled)) bumpVersion(['kpi']);
        if (fix && r.ok && r.mode) props_().setProperty('K68_FIX102', Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + (r.cells || 0) + ' ô'); }
  catch(e){} finally { _K68_FORCE = null; lock.releaseLock(); }
}
function installKpiDailySync(){ return syncKpiFY68(); }
function capQuyenDongBoKPI(){ return syncKpiFY68(); }
function syncKpiFY68_silent_(){ var s = kpiTab_(); return s ? k68Sync_(s, 'vi', TEAM(), { manual:true }) : null; }
/* ═════════ ⭐ v10.1 — TỶ GIÁ THEO THÁNG + TÍNH C5 / C6 / C7 BẰNG CODE ═════════ */
var K68_RATE_DEF = 26050;
function k68RatesRaw_(){ try { return JSON.parse(props_().getProperty('K68_RATES') || '{}') || {}; } catch(e){ return {}; } }
/* tỷ giá hiệu lực của 12 tháng: tháng chưa nhập dùng tháng gần nhất trước đó, chưa có gì = 26.050 */
function k68RatesEff_(months){
  var raw = k68RatesRaw_(), keys = Object.keys(raw).filter(function(k){ return /^\d{6}$/.test(k) && num(raw[k]) > 0; }).sort();
  return months.map(function(m){
    var r = K68_RATE_DEF; m = String(m);
    for (var i = 0; i < keys.length; i++){ if (keys[i] <= m) r = num(raw[keys[i]]); else break; }
    return r;
  });
}
function saveRates(user, p){
  if (!isManager(user)) return { ok:false, error:'Chỉ quản lý / trưởng nhóm được đổi tỷ giá.' };
  var d = p.rates; if (typeof d === 'string'){ try { d = JSON.parse(d); } catch(e){ d = null; } }
  if (!d) return { ok:false, error:'Thiếu dữ liệu tỷ giá' };
  var raw = k68RatesRaw_();
  Object.keys(d).forEach(function(k){
    if (!/^\d{6}$/.test(k)) return;
    var x = num(d[k]);
    if (x > 0){ if (x < 1000 || x > 100000) return; raw[k] = x; } else delete raw[k];
  });
  props_().setProperty('K68_RATES', JSON.stringify(raw));
  logAct(user, 'update', 'kpi', 'Tỷ giá VND/USD', JSON.stringify(raw), '');
  var push = k68PushQuick_();
  bumpVersion(['kpi']);
  return { ok:true, rates:raw, kpiPush:push, message:'Đã lưu tỷ giá — C5 tính lại theo tỷ giá mới' };
}
function k68PicTokens_(s){ return String(s || '').split(/[,;\/&+]+/).map(function(x){ return normName_(x); }).filter(String); }
/* ghi số C5 / C6 / C7 vào tab 9 (thay cho công thức) — dùng đúng dữ liệu app đang hiển thị */
function k68CalcSupp_(sh){
  sh = sh || kpiTab_(); if (!sh) return 0;
  var lr = sh.getLastRow(); if (lr < 5) return 0;
  var v = sh.getRange(1, 1, lr, K68.NC).getValues(), rows = [], months = null;
  for (var i = 0; i < v.length; i++){
    var tag = k68Str_(v[i][0]);
    if (tag === 'months'){ months = []; for (var j = 0; j < 12; j++) months.push(String(Math.round(Number(v[i][K68.t0 - 1 + j]) || 0))); }
    if (/^kpi:supp_/.test(tag)) rows.push({ i:i, key:tag.slice(4), pic:k68Str_(v[i][K68.pic - 1]) });
  }
  if (!rows.length || !months) return 0;
  var kw = sh.getRange('D7:E8').getValues();
  var kComp = [kw[0][0], kw[0][1]].map(function(x){ return S(x).toLowerCase(); }).filter(String);
  var kJz   = [kw[1][0], kw[1][1]].map(function(x){ return S(x).toLowerCase(); }).filter(String);
  if (!kComp.length) kComp = ['composite']; if (!kJz.length) kJz = ['jizai'];
  var rates = k68RatesEff_(months), idx = {}; months.forEach(function(m, k){ idx[m] = k; });
  var cur = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM');
  var orders = []; try { _RAW = {}; orders = readTab('order'); } catch(e){ return 0; }
  var nppOf = K68_NPP[TEAM()] || {}, changed = 0;
  rows.forEach(function(x){
    var me = normName_(x.pic), npp = (nppOf[x.pic] || []).map(function(w){ return String(w).toLowerCase(); });
    var out = months.map(function(m){ return m <= cur ? 0 : ''; });
    orders.forEach(function(o){
      if (k68PicTokens_(o.pic).indexOf(me) < 0) return;
      var ym = S(o.month).replace(/\D/g, '').slice(0, 6) || ymOfIso_(S(o.day));
      var k = idx[ym]; if (k == null || out[k] === '') return;
      if (x.key === 'supp_amt'){ out[k] += num(o.amount) / (rates[k] || K68_RATE_DEF); return; }
      var txt = (S(o.detail) + ' ' + S(o.ptype)).toLowerCase(), kws = x.key === 'supp_comp' ? kComp : kJz;
      if (!kws.some(function(w){ return txt.indexOf(w) >= 0; })) return;
      if (npp.length){ var pt = S(o.partner).toLowerCase(); if (!npp.some(function(w){ return pt.indexOf(w) >= 0; })) return; }
      out[k] += num(o.qty);
    });
    out = out.map(function(a){ return a === '' ? '' : Math.round(a * 100) / 100; });
    var old = v[x.i].slice(K68.a0 - 1, K68.a0 - 1 + 12), diff = false;
    for (var q = 0; q < 12; q++){ var o1 = old[q] === '' || old[q] == null ? '' : Math.round(Number(old[q]) * 100) / 100; if (String(o1) !== String(out[q])) { diff = true; break; } }
    if (diff){ sh.getRange(x.i + 1, K68.a0, 1, 12).setValues([out]); changed++; }
  });
  return changed;
}
/* ⭐ v10.1 — ghi đè 1 lần các tháng đã chốt cho mã đổi rule (C1 · C5 · C6 · C7) */
var _K68_FORCE = null;
function k68Forced_(code){ return !!(_K68_FORCE && _K68_FORCE[code]); }
function k68ForceCodes_(){
  var o = {}, sp = K68_SPEC[TEAM()]; if (!sp) return o;
  sp.pics.forEach(function(p){ p.rows.forEach(function(r){ if (/^(newacct_|supp_)/.test(r.key)) o[r.code] = 1; }); });
  return o;
}
function k68FixLockedV10(){
  var s = kpiTab_(); if (!s) return 'Chưa có tab KPI';
  _K68_FORCE = k68ForceCodes_();
  try { k68CalcSupp_(s); SpreadsheetApp.flush(); var r = k68Sync_(s, 'vi', TEAM(), { manual:true });
        if (r.ok && !r.mode){ s = kpiTab_(); SpreadsheetApp.flush(); k68CalcSupp_(s); SpreadsheetApp.flush(); r = k68Sync_(s, 'vi', TEAM(), { manual:true }); }
        if (r.ok && r.mode) props_().setProperty('K68_FIX102', Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + (r.cells || 0) + ' ô');
        var msg = (r.ok ? 'Đã ghi đè các tháng đã chốt của ' + Object.keys(_K68_FORCE).join(', ') + ' theo rule mới.\n' + r.message : 'Chưa đồng bộ được: ' + r.error);
        try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
        return msg; }
  finally { _K68_FORCE = null; }
}

/* ⭐ v10.4 — cửa sổ nhận số trễ (đọc / mở / đóng) — chỉ quản lý được mở */
function kpiLate_(user, p){
  var s = kpiTab_(); if (!s) return { ok:false, error:'Chưa có tab KPI' };
  var M = k68Master_(s.getRange(K68_SET.link).getValue());
  if (S(p.set) === '1'){
    if (!isManager(user)) return { ok:false, error:'Chỉ quản lý được mở nhận số cho tháng đã chốt.' };
    var m = S(p.month).replace(/\D/g, '').slice(0, 6), u = S(p.until).slice(0, 10);
    if (m && !/^\d{6}$/.test(m)) return { ok:false, error:'Tháng?' };
    if (m && !/^\d{4}-\d{2}-\d{2}$/.test(u)) return { ok:false, error:'Hạn (yyyy-mm-dd)?' };
    kh_setLate_(M.ss, m, m ? u : '');
    logAct(user, 'update', 'kpi', 'Cửa sổ nhận số trễ', m ? (m + ' đến ' + u) : 'đóng', '');
    var push = k68PushQuick_();
    return { ok:true, late:{ month:m, until:m ? u : '' }, kpiPush:push, message: m ? 'Đã mở nhận số tháng ' + m + ' đến hết ' + u + ' — đã đẩy lại KPI' : 'Đã đóng cửa sổ nhận số trễ' };
  }
  var lo = kh_late_(M.ss);
  return { ok:true, late:{ month:lo.month, until:lo.until, open: lo.month ? kh_isOpen_(M.ss, lo.month) : false }, kpiFile:M.ss.getName() };
}

/* ⭐ v9.7 — REALTIME: các thao tác lưu trên app làm đổi số KPI của tab 9 ⇒ đẩy ngay lên file KPI tổng */
var K68_PUSH_ACTIONS = { saveOrders:1, saveOrder:1, saveCustomer:1, saveCBC:1, saveCustomerCbc:1, saveWeekly:1,
                         savePresentation:1, deleteRow:1, deleteAccount:1 };
function k68PushQuick_(){
  try {
    var s = kpiTab_(); if (!s) return { ok:false, error:'Chưa có tab KPI' };
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return { ok:false, error:'Đang có lượt đồng bộ khác, file KPI tổng sẽ cập nhật trong khoảng 1 phút' };
    try {
      SpreadsheetApp.flush();                                          // công thức tab 9 tính lại theo dòng vừa lưu
      var calcN = 0; try { calcN = k68CalcSupp_(s); if (calcN) SpreadsheetApp.flush(); } catch(e0){}   /* ⭐ v10.1 */
      var fix = !props_().getProperty('K68_FIX102');                    /* ⭐ v10.1 — lần đầu: sửa tháng đã chốt của mã đổi rule */
      if (fix) _K68_FORCE = k68ForceCodes_();
      var r;
      try { r = k68Sync_(s, 'vi', TEAM(), {}); } finally { _K68_FORCE = null; }
      if (fix && r.ok && r.mode) try { props_().setProperty('K68_FIX102', Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + (r.cells || 0) + ' ô'); } catch(e1){}
      if (r.ok && (r.targets || r.pulled || r.cells || calcN)) bumpVersion(['kpi']);   /* ⭐ v10.6 — app tải số mới */
      try { krBust_(); } catch(eB){}                                    /* ⭐ v10.4 — Báo cáo KPI đọc số mới ngay */
      return { ok:!!r.ok, pushed:r.pushed || 0, cells:r.cells || 0, locked:r.locked || 0, lockedMonths:r.lockedMonths || [], late:r.late || null,
               error:r.error || r.error2 || '', at:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm:ss') };
    } finally { lock.releaseLock(); }
  } catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}

/* ══════════════════════ DASHBOARD ══════════════════════ */
function dashboard(p){
  var fy = S(p.fy) || currentFY();
  var months = fyMonths(fy).map(String);
  var mIdx = {}; months.forEach(function(m, i){ mIdx[m] = i; });
  var picFilter = S(p.pic);

  var weekly = readTab('weekly'), orders = readTab('order'), customers = readTab('customer'), present = readTab('present');

  function keep(pic){ return !picFilter || S(pic) === picFilter || S(pic).toLowerCase().indexOf(picFilter.toLowerCase()) >= 0; }

  var amtByMonth = months.map(function(){ return 0; });
  var ordByMonth = months.map(function(){ return 0; });
  var amtByPic = {}, custAmt = {}, prodAmt = {}, channel = {};
  orders.forEach(function(o){
    if (!keep(o.pic)) return;
    var i = mIdx[S(o.month)];
    var a = num(o.amount);
    if (i !== undefined){ amtByMonth[i] += a; ordByMonth[i] += 1; }
    if (S(o.fy) !== fy && i === undefined) return;
    amtByPic[S(o.pic)] = (amtByPic[S(o.pic)] || 0) + a;
    var cn = S(o.name) || S(o.code);
    custAmt[cn] = (custAmt[cn] || 0) + a;
    var pt = S(o.ptype) || 'Khác';
    prodAmt[pt] = (prodAmt[pt] || 0) + a;
    var ch = S(o.channel) || 'Khác';
    channel[ch] = (channel[ch] || 0) + a;
  });

  var visByMonth = months.map(function(){ return 0; });
  var actByType = {}, byAccountType = {}, byStatus = {}, byProcess = {}, byFeedback = {}, byProduct = {}, byPicVisit = {};
  var visitedAccounts = {}, overdue = 0, withPhoto = 0, total = 0;
  weekly.forEach(function(w){
    if (!keep(w.pic)) return;
    var i = mIdx[S(w.month)];
    if (i === undefined && S(w.fy) !== fy) return;
    total++;
    if (i !== undefined && S(w.typeAction) === 'Visiting') visByMonth[i]++;
    var ta = S(w.typeAction) || '—'; actByType[ta] = (actByType[ta] || 0) + 1;
    var at = S(w.type) || '—';       byAccountType[at] = (byAccountType[at] || 0) + 1;
    var st = S(w.status) || 'Chưa cập nhật'; byStatus[st] = (byStatus[st] || 0) + 1;
    var pr = S(w.process) || '—';    byProcess[pr] = (byProcess[pr] || 0) + 1;
    var fb = S(w.feedback) || '—';   byFeedback[fb] = (byFeedback[fb] || 0) + 1;
    var pg = S(w.product) || '—';    byProduct[pg] = (byProduct[pg] || 0) + 1;
    byPicVisit[S(w.pic)] = (byPicVisit[S(w.pic)] || 0) + 1;
    var an = parseCheckName(w.account).name; if (an) visitedAccounts[an.toLowerCase()] = 1;
    if (S(w.photo)) withPhoto++;
    if (!/complet|cancel/i.test(S(w.status)) && S(w.finish) && S(w.finish) < todayISO()) overdue++;
  });

  var totalAcc = 0, coveredAcc = 0, byAreaAcc = {};
  customers.forEach(function(c){
    if (!keep(c.pic)) return;
    totalAcc++;
    var ar = S(c.area) || '—'; byAreaAcc[ar] = (byAreaAcc[ar] || 0) + 1;
    if (visitedAccounts[S(c.name).toLowerCase()]) coveredAcc++;
  });

  var newAcc = months.map(function(){ return 0; });
  customers.forEach(function(c){
    if (!keep(c.pic)) return;
    var i = mIdx[S(c.openMonth)];
    if (i !== undefined) newAcc[i]++;
  });

  var presByMonth = months.map(function(){ return 0; }), attByMonth = months.map(function(){ return 0; });
  present.forEach(function(r){
    if (!keep(r.pic)) return;
    var i = mIdx[S(r.month)];
    if (i === undefined) return;
    presByMonth[i]++; attByMonth[i] += num(r.actual);
  });

  var recent = weekly.filter(function(w){ return keep(w.pic) && S(w.start); })
    .sort(function(a,b){ return String(b.start).localeCompare(String(a.start)); })
    .slice(0, 25)
    .map(function(w){ return { start:w.start, pic:w.pic, account:parseCheckName(w.account).name, typeAction:w.typeAction,
                               typeTask:w.typeTask, status:w.status, result:String(w.result).slice(0, 220), photo:w.photo, _row:w._row }; });

  function top(o, n){
    return Object.keys(o).map(function(k){ return { k:k, v:o[k] }; })
             .sort(function(a,b){ return b.v - a.v; }).slice(0, n || 10);
  }

  return { ok:true, fy:fy, months:months,
    monthLabels: months.map(function(m){ return 'T' + parseInt(String(m).slice(4,6), 10); }),
    amtByMonth:amtByMonth, ordByMonth:ordByMonth, visByMonth:visByMonth, newAcc:newAcc,
    presByMonth:presByMonth, attByMonth:attByMonth,
    amtByPic: top(amtByPic, 12), topCustomers: top(custAmt, 10), prodAmt: top(prodAmt, 10),
    channel: top(channel, 6), actByType: top(actByType, 10), byAccountType: top(byAccountType, 10),
    byStatus: top(byStatus, 10), byProcess: top(byProcess, 10), byFeedback: top(byFeedback, 6),
    byProduct: top(byProduct, 12), byPicVisit: top(byPicVisit, 12), byAreaAcc: top(byAreaAcc, 6),
    totalAcc:totalAcc, coveredAcc:coveredAcc, totalActivity:total, overdue:overdue, withPhoto:withPhoto,
    recent:recent };
}

/* ══════════════════════ BÁO CÁO TUẦN ══════════════════════
 * Template email + PDF theo chuẩn MMH Report Hub. Đơn vị nội dung là DÒNG WEEKLY REPORT,
 * gom nhóm theo "Type task". */

function fmtVN(iso){ if (!iso) return ''; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso)); return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(iso); }
function addDaysISO(iso, n){ var d = s2d(iso); if (!(d instanceof Date)) return iso; d.setDate(d.getDate() + n); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function progColor(p){
  p = Math.max(0, Math.min(100, Math.round(p || 0)));
  if (p >= 100) return '#1E9E5A';
  if (p >= 75)  return '#3FA64B';
  if (p >= 50)  return '#3A5CAA';
  if (p >= 25)  return '#E08A00';
  return '#D9433F';
}
/* "In Progress 50%" → 50 · "Completed" → 100 · "Cancel"/"Not Started" → 0 */
function statusPct(st){
  var s = String(st || '');
  if (/complet/i.test(s)) return 100;
  if (/cancel/i.test(s))  return 0;
  var m = /(\d{1,3})\s*%/.exec(s);
  if (m) return Math.max(0, Math.min(100, parseInt(m[1], 10)));
  if (/progress/i.test(s)) return 25;
  return 0;
}
function isOverdueRow(r){
  var st = String(r.status || '');
  if (/complet/i.test(st) || /cancel/i.test(st)) return false;
  var eff = S(r.finish) || S(r.start);
  if (!eff) return false;
  return String(eff).slice(0, 10) < todayISO();
}
/* MỘT TASK THUỘC TUẦN khi NGÀY BẮT ĐẦU nằm trong tuần; bắt đầu trước tuần chỉ tính khi còn chạy tới tuần
   đó và kéo dài tối đa 14 ngày. */
function overlapWeek(r, from, to){
  var a = S(r.start).slice(0, 10), b = S(r.finish).slice(0, 10) || a;
  if (!a && !b) return false;
  if (!a) a = b;
  if (!b) b = a;
  if (b < a) b = a;
  if (a >= from && a <= to) return true;
  var days = (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000;
  if (days > 14) return false;
  return a < from && b >= from;
}
/* Gom weekly rows của 1 PIC trong khoảng ngày → nhóm theo Type task */
function weeklyGroups(rows, pic, from, to){
  var mine = rows.filter(function(r){
    if (pic && S(r.pic) !== pic) return false;
    return overlapWeek(r, from, to);
  });
  var g = {}, order = [];
  mine.forEach(function(r){
    var t = S(r.typeTask) || '— Chưa phân loại —';
    if (!g[t]){ g[t] = { type:t, items:[] }; order.push(t); }
    g[t].items.push(r);
  });
  order.sort(function(a, b){ return a.localeCompare(b); });
  return order.map(function(t){
    var items = g[t].items.sort(function(a, b){ return String(a.start).localeCompare(String(b.start)); });
    var act = items.filter(function(r){ return !/cancel/i.test(S(r.status)); });
    var pct = act.length ? Math.round(act.reduce(function(s, r){ return s + statusPct(r.status); }, 0) / act.length) : 0;
    return { type:t, items:items, pct:pct };
  });
}
function cellRich(txt){
  txt = String(txt || '').trim();
  if (!txt) return '<span style="color:#B0B8C8">—</span>';
  var safe = esc(txt);
  safe = safe.replace(/^([^\n:]{1,32}:)/gm, '<b>$1</b>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}
function photoTag(url){
  var u = String(url || '').trim();
  if (!u) return '';
  var n = u.split(/\s|\n/).filter(function(x){ return /^https?:/.test(x); }).length || 1;
  var first = u.split(/\s|\n/).filter(function(x){ return /^https?:/.test(x); })[0] || u;
  return ' <a href="' + esc(first) + '" style="background:#E8EEF9;color:#3A5CAA;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;text-decoration:none;white-space:nowrap">' + n + ' ảnh</a>';
}
function emailProgBar(pct){
  var p = Math.max(0, Math.min(100, pct));
  var color = p > 0 ? progColor(p) : '#C9D2E0';
  var fill  = p <= 0  ? '' : '<td width="' + p + '%" style="background:' + color + ';height:11px;line-height:11px;font-size:0;border-radius:6px 0 0 6px">&nbsp;</td>';
  var empty = p >= 100 ? '' : '<td width="' + (100 - p) + '%" style="background:#E3E9F4;height:11px;line-height:11px;font-size:0">&nbsp;</td>';
  return '<table cellpadding="0" cellspacing="0" style="width:88px;border-collapse:collapse;border-radius:6px;overflow:hidden;table-layout:fixed">'
    + '<tr>' + fill + empty + '</tr></table>'
    + '<div style="font-size:9pt;font-weight:700;color:' + (p > 0 ? color : '#0E2F5F') + ';text-align:center;margin-top:2px">' + p + '%</div>';
}
function weeklyEmailTable(groups, isNext){
  function statusStyle(st){
    if (/complet/i.test(st))  return 'color:#1E6B3A;font-weight:700';
    if (/progress/i.test(st)) return 'color:#0E2F5F;font-weight:700';
    if (/cancel/i.test(st))   return 'color:#8A1C1C;font-weight:700';
    return 'color:#5A6A8A';
  }
  var colCount = 7, bodyRows = '';
  groups.forEach(function(k){
    bodyRows +=
      '<tr style="background:#EEF3FB">' +
        '<td style="padding:6px 9px;font-weight:700;color:#0E2F5F" colspan="' + colCount + '">' +
          '<span style="display:inline-block;background:#0E2F5F;color:#fff;border-radius:4px;padding:1px 6px;font-size:8.5pt;font-weight:700;margin-right:6px">' + esc(k.items.length) + '</span>' +
          esc(k.type) + ' &nbsp;<span style="font-weight:800;color:' + progColor(k.pct) + '">' + k.pct + '%</span></td>' +
      '</tr>';
    k.items.forEach(function(s, i){
      var pc  = parseCheckName(s.account);
      var pct = statusPct(s.status);
      var od  = isOverdueRow(s);
      var rowBg = od ? 'background:#FFECEC;' : '';
      var odTag = od ? ' <span style="background:#D9433F;color:#fff;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap">QUÁ HẠN</span>' : '';
      var meta = [pc.type, pc.province].filter(String).join(' · ');
      var body = isNext ? (S(s.plan) || S(s.nextAction)) : (S(s.result) || S(s.plan));
      bodyRows +=
        '<tr style="' + rowBg + '">' +
          '<td style="padding:6px 9px;color:#8A97B5;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7">' + esc(s.no || (i + 1)) + '</td>' +
          '<td style="padding:6px 9px;border-top:1px solid #EEF1F7"><b>' + esc(accLabel_(s.account)) + '</b>' + odTag +
            (isTbdAcc_(s.account)
              ? '<div style="font-size:8.5pt;color:#8A97B5">Kế hoạch tuần · chưa xác định account</div>'
              : (meta ? '<div style="font-size:8.5pt;color:#8A97B5">' + esc(meta) + (s.typeAction ? ' · ' + esc(s.typeAction) : '') + '</div>' : '')) + '</td>' +
          '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7">' + esc(fmtVN(s.start)) + '</td>' +
          '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7;' + (od ? 'color:#D9433F;font-weight:700' : '') + '">' + esc(fmtVN(s.finish || s.start)) + '</td>' +
          '<td style="padding:6px 9px;text-align:center;border-top:1px solid #EEF1F7">' + emailProgBar(pct) + '</td>' +
          '<td style="padding:6px 9px;border-top:1px solid #EEF1F7;font-size:9.5pt;line-height:1.5">' + cellRich(body) + photoTag(s.photo) + '</td>' +
          '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7;' + statusStyle(s.status) + '">' + esc(s.status || '—') + '</td>' +
        '</tr>';
    });
  });
  if (!bodyRows) bodyRows = '<tr><td colspan="' + colCount + '" style="padding:14px;text-align:center;color:#8A97B5">' + (isNext ? 'No planned activity for next week.' : 'No activity recorded for this week.') + '</td></tr>';
  var head3 = isNext ? 'Planned start' : 'Start date';
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">' +
    '<thead><tr style="background:#0E2F5F;color:#fff">' +
      '<th style="padding:7px 9px;width:42px;text-align:center">No.</th>' +
      '<th style="padding:7px 9px;text-align:left">Account</th>' +
      '<th style="padding:7px 9px;width:82px;text-align:center">' + head3 + '</th>' +
      '<th style="padding:7px 9px;width:82px;text-align:center">Finish date</th>' +
      '<th style="padding:7px 9px;width:100px;text-align:center">Tiến độ</th>' +
      '<th style="padding:7px 9px;text-align:left">Plan &amp; result</th>' +
      '<th style="padding:7px 9px;width:110px;text-align:center">Status</th>' +
    '</tr></thead><tbody>' + bodyRows + '</tbody></table>';
}
/* ⭐ v10.8 — thân email dùng mẫu chung (wrBody_), dữ liệu lấy từ các nhóm Type task đã gom */
function wrRowsOf_(groups){
  var out = [];
  (groups || []).forEach(function(g){ (g.items || []).forEach(function(s){
    var pc = parseCheckName(s.account), tbd = isTbdAcc_(s.account);
    out.push({ no:s.no, accName: tbd ? 'TBD' : (pc.name || accLabel_(s.account)), accType: tbd ? '' : pc.type, accProv: pc.province,
               typeTask:s.typeTask, typeAction:s.typeAction, start:s.start, finish:s.finish, status:s.status,
               plan:s.plan, result:s.result, nextAction:s.nextAction, photo:s.photo });
  }); });
  return out;
}
function buildCombinedEmailBody(user, tFrom, tTo, tKeys, nFrom, nTo, nKeys, oCur, oNext){
  return wrBody_({ lang:'vi', pic:user.pic, title:user.title, team:reportTeamName_(), from:tFrom, to:tTo, nf:nFrom, nt:nTo,
                   cur:wrRowsOf_(tKeys), next:wrRowsOf_(nKeys), otherCur:oCur, otherNext:oNext });
}
function pdfProgBar(pct){
  var p = Math.max(0, Math.min(100, Math.round(pct)));
  var color = p > 0 ? progColor(p) : '#C9D2E0';
  return '<div style="background:#E3E9F4;border-radius:6px;height:10px;width:100%;overflow:hidden">' +
      '<div style="background:' + color + ';width:' + p + '%;height:10px;border-radius:6px"></div>' +
    '</div>' +
    '<div style="font-size:8.5px;font-weight:700;color:' + (p > 0 ? color : '#0E2F5F') + ';text-align:center;margin-top:2px">' + p + '%</div>';
}
function weeklyPdfBlocks(groups, isNext){
  function statusColor(st){ return /complet/i.test(st) ? '#1E6B3A' : /progress/i.test(st) ? '#0E2F5F' : /cancel/i.test(st) ? '#8A1C1C' : '#5A6A8A'; }
  var blocks = '', totalSubs = 0, overdueCnt = 0, accSet = {};
  groups.forEach(function(k){
    var items = k.items || []; totalSubs += items.length;
    var rowsHtml = items.length ? items.map(function(s, i){
        var pc = parseCheckName(s.account);
        if (pc.name) accSet[pc.name.toLowerCase()] = 1;
        var pct = statusPct(s.status);
        var od = isOverdueRow(s); if (od) overdueCnt++;
        var meta = [pc.type, pc.province].filter(String).join(' · ');
        var body = isNext ? (S(s.plan) || S(s.nextAction)) : (S(s.result) || S(s.plan));
        return '<tr' + (od ? ' class="od"' : '') + '>' +
          '<td style="text-align:center;white-space:nowrap">' + esc(s.no || (i + 1)) + '</td>' +
          '<td><b>' + esc(accLabel_(s.account)) + '</b>' + (od ? ' <span class="odtag">QUÁ HẠN</span>' : '') +
            (isTbdAcc_(s.account)
              ? '<div class="meta">Kế hoạch tuần · chưa xác định account</div>'
              : (meta ? '<div class="meta">' + esc(meta) + (s.typeAction ? ' · ' + esc(s.typeAction) : '') + '</div>' : '')) + '</td>' +
          '<td style="white-space:nowrap;text-align:center">' + esc(fmtVN(s.start)) + '</td>' +
          '<td style="white-space:nowrap;text-align:center' + (od ? ';color:#D9433F;font-weight:700' : '') + '">' + esc(fmtVN(s.finish || s.start)) + '</td>' +
          '<td style="text-align:center">' + pdfProgBar(pct) + '</td>' +
          '<td class="res">' + cellRich(body) + '</td>' +
          '<td style="color:' + statusColor(s.status) + ';font-weight:600;white-space:nowrap;text-align:center">' + esc(s.status || '—') + '</td>' +
        '</tr>';
      }).join('')
      : '<tr><td colspan="7" style="color:#8A97B5;text-align:center">' + (isNext ? 'No planned activity' : 'No activity this week') + '</td></tr>';
    blocks +=
      '<div class="kt">' +
        '<div class="kt-h">' +
          '<span class="kt-no">' + items.length + '</span>' +
          '<span class="kt-name">' + esc(k.type) + '</span>' +
          '<span class="kt-pct-badge" style="color:' + progColor(k.pct) + '">' + k.pct + '%</span>' +
        '</div>' +
        '<table><thead><tr>' +
          '<th style="width:5%">No.</th><th style="width:25%">Account</th>' +
          '<th style="width:9%">' + (isNext ? 'Planned start' : 'Start date') + '</th>' +
          '<th style="width:9%">Finish date</th><th style="width:11%">Tiến độ</th>' +
          '<th style="width:29%">Plan &amp; result</th><th style="width:12%">Status</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      '</div>';
  });
  if (!blocks) blocks = '<p style="color:#5A6A8A;font-size:11px">' + (isNext ? 'No planned activity for next week.' : 'No activity recorded for this week.') + '</p>';
  return { blocks:blocks, keyCount:groups.length, totalSubs:totalSubs, overdue:overdueCnt, accounts:Object.keys(accSet).length };
}
function buildCombinedReportHtml(user, tFrom, tTo, tKeys, nFrom, nTo, nKeys, oCur, oNext){
  var t = weeklyPdfBlocks(tKeys, false);
  var n = weeklyPdfBlocks(nKeys, true);
  var nOc = otherCount_(oCur), nOn = otherCount_(oNext);
  var issued = fmtVN(todayISO());
  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4 landscape;margin:11mm}' +
    'body{font-family:Aptos,\'Segoe UI\',Calibri,Arial,sans-serif;color:#1A2340;font-size:10px;margin:0}' +
    '.head{border-bottom:2.5px solid #0E2F5F;padding:0 0 10px;margin-bottom:8px}' +
    '.head h1{font-size:16px;margin:0;color:#0E2F5F;font-weight:700}' +
    '.head .meta{margin:5px 0 0;font-size:10px;color:#41506B}.head .meta b{color:#0E2F5F}' +
    '.sec{margin:12px 0 4px;font-size:13px;font-weight:800;color:#0E2F5F;padding:5px 10px;border-radius:5px;background:#EEF3FB;border-left:4px solid #3A5CAA}' +
    '.sec.next{border-left-color:#FFB300;background:#FFF7E6}' +
    '.sec.other{border-left-color:#6B4A9E;background:#F5F0FB}' +
    '.summary{display:flex;gap:8px;margin:4px 0 10px}' +
    '.sm{border:1px solid #D4DDEF;border-radius:5px;padding:5px 11px;font-size:9.5px;color:#41506B}' +
    '.sm b{color:#0E2F5F;font-size:12px;display:block}' +
    '.sm.od{border-color:#F3B4B4;background:#FFF3F3}.sm.od b{color:#D9433F}' +
    '.kt{border:1px solid #D4DDEF;border-radius:5px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}' +
    '.kt-h{background:#F1F5FB;padding:7px 12px;display:flex;gap:12px;align-items:center;border-bottom:1px solid #D4DDEF}' +
    '.kt-no{font-weight:700;font-size:11px;color:#0E2F5F;background:#DCE6F4;border-radius:4px;padding:1px 8px}' +
    '.kt-name{font-weight:700;font-size:11.5px;flex:1;color:#0E2F5F}' +
    '.kt-pct-badge{font-size:10px;font-weight:800;background:#DCE6F4;border-radius:9px;padding:1px 9px}' +
    'table{width:100%;border-collapse:collapse}' +
    'th{background:#0E2F5F;color:#fff;text-align:left;padding:6px 8px;font-size:9px;font-weight:600;border:none}' +
    'td{padding:5px 8px;border:none;border-bottom:1px solid #EEF1F7;vertical-align:top;color:#1A2340;font-size:9.5px}' +
    'td .meta{font-size:8px;color:#8A97B5;margin-top:1px}' +
    'td.res,td .res{font-size:9px;color:#41506B;line-height:1.5}td.res b,td .res b{color:#0E2F5F}' +
    'tbody tr:nth-child(even) td{background:#FAFBFD}' +
    'tr.od td{background:#FFECEC!important}' +
    '.odtag{background:#D9433F;color:#fff;font-size:7.5px;font-weight:700;padding:1px 5px;border-radius:7px;white-space:nowrap}' +
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97B5;border-top:1px solid #E2E8F5;padding-top:7px;display:flex;justify-content:space-between}' +
    '</style></head><body>' +
    '<div class="head"><h1>MANI Medical Hanoi — ' + teamLabel_() + ' Weekly Report &amp; Next-Week Plan</h1>' +
      '<div class="meta">Report week: <b>' + fmtVN(tFrom) + ' → ' + fmtVN(tTo) + '</b> &nbsp;|&nbsp; Issued by: <b>' + esc(user.pic) + '</b>' + (user.title ? ' (' + esc(user.title) + ')' : '') + ' &nbsp;|&nbsp; Team: ' + reportTeamName_() + '</div>' +
    '</div>' +

    '<div class="sec">\u2460 This week — Đi địa bàn (' + fmtVN(tFrom) + ' → ' + fmtVN(tTo) + ')</div>' +
    '<div class="summary"><div class="sm"><b>' + t.keyCount + '</b>Type task</div><div class="sm"><b>' + t.totalSubs + '</b>Hoạt động</div>' +
      '<div class="sm"><b>' + t.accounts + '</b>Account</div>' +
      (t.overdue ? '<div class="sm od"><b>' + t.overdue + '</b>Quá hạn</div>' : '') + '</div>' +
    t.blocks +

    '<div class="sec other">\u2461 This week — Công việc khác / Other tasks</div>' +
    '<div class="summary"><div class="sm"><b>' + (oCur || []).length + '</b>Key task</div><div class="sm"><b>' + nOc + '</b>Tổng đầu việc</div></div>' +
    otherPdfBlock(oCur, false) +

    '<div class="sec next">\u2462 Next week — Đi địa bàn (' + fmtVN(nFrom) + ' → ' + fmtVN(nTo) + ')</div>' +
    '<div class="summary"><div class="sm"><b>' + n.keyCount + '</b>Type task</div><div class="sm"><b>' + n.totalSubs + '</b>Kế hoạch</div>' +
      '<div class="sm"><b>' + n.accounts + '</b>Account</div></div>' +
    n.blocks +

    '<div class="sec next">\u2463 Next week — Công việc khác / Other tasks</div>' +
    '<div class="summary"><div class="sm"><b>' + (oNext || []).length + '</b>Key task</div><div class="sm"><b>' + nOn + '</b>Tổng đầu việc</div></div>' +
    otherPdfBlock(oNext, true) +

    '<div class="foot"><span>Auto-generated by ' + appName_() + ' — ' + reportTeamName_() + '.</span><span>issued ' + issued + '</span></div>' +
    '</body></html>';
}
function parseOther_(p){
  var o = p && p.other;
  if (!o) return {};
  if (typeof o === 'string'){ try { o = JSON.parse(o); } catch(e){ return {}; } }
  return (o && typeof o === 'object') ? o : {};
}
/* Lấy danh sách của 1 PIC — dò cả trường hợp khác hoa/thường, thừa khoảng trắng */
function otherFor_(bag, pic, which){
  if (!bag) return [];
  var g = bag[pic];
  if (!g){
    var key = S(pic).toLowerCase();
    for (var k in bag) if (S(k).toLowerCase() === key){ g = bag[k]; break; }
  }
  return (g && g[which]) ? g[which] : [];
}
function otherPct_(x){
  var v = num(x && x.progress);
  return Math.max(0, Math.min(100, v <= 1 ? Math.round(v * 100) : Math.round(v)));
}
function otherCount_(list){
  var n = 0;
  (list || []).forEach(function(g){ n += 1 + ((g.subs || []).length); });
  return n;
}

/* Bảng Other task trong EMAIL */
function otherEmailTable(list, isNext){
  if (!list || !list.length)
    return '<p style="margin:4px 0 12px;font-size:10.5pt;color:#8A97B5">'
      + (isNext ? 'No other task planned for next week.' : 'No other task recorded for this week.')
      + '</p>';
  var rows = '';
  list.forEach(function(g){
    var kp = otherPct_(g);
    rows += '<tr style="background:#EEF3FB">'
      + '<td style="padding:6px 9px;color:#3A5CAA;font-weight:700;white-space:nowrap;border-top:1px solid #EEF1F7">'
        + esc(g.type || 'Other') + '</td>'
      + '<td style="padding:6px 9px;border-top:1px solid #EEF1F7" colspan="2"><b>' + esc(g.keyTask || '—') + '</b>'
        + ((!isNext && S(g.result)) ? '<div style="font-size:9.5pt;color:#41506B;margin-top:3px;line-height:1.5">' + cellRich(g.result) + '</div>' : '')
      + '</td>'
      + '<td style="padding:6px 9px;text-align:center;border-top:1px solid #EEF1F7">' + emailProgBar(kp) + '</td>'
      + '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7;color:'
        + progColor(kp) + ';font-weight:700">' + esc(g.status || 'To Do') + '</td></tr>';
    (g.subs || []).forEach(function(x){
      var p2 = otherPct_(x);
      rows += '<tr>'
        + '<td style="padding:6px 9px;text-align:center;color:#8A97B5;white-space:nowrap;border-top:1px solid #EEF1F7">'
          + esc(fmtVN(x.planned) || '—') + '</td>'
        + '<td style="padding:6px 9px;border-top:1px solid #EEF1F7">' + esc(x.subTask || '—')
          + ((!isNext && S(x.result)) ? '<div style="font-size:9.5pt;color:#41506B;margin-top:3px;line-height:1.5">' + cellRich(x.result) + '</div>' : '')
        + '</td>'
        + '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7">'
          + esc(x.pic || '—') + '</td>'
        + '<td style="padding:6px 9px;text-align:center;border-top:1px solid #EEF1F7">' + emailProgBar(p2) + '</td>'
        + '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7;color:'
          + progColor(p2) + ';font-weight:700">' + esc(x.status || 'To Do') + '</td></tr>';
    });
  });
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">'
    + '<thead><tr style="background:#0E2F5F;color:#fff">'
      + '<th style="padding:7px 9px;width:112px;text-align:left">Loại / Hạn</th>'
      + '<th style="padding:7px 9px;text-align:left">Key task &amp; đầu việc con</th>'
      + '<th style="padding:7px 9px;width:90px;text-align:center">PIC</th>'
      + '<th style="padding:7px 9px;width:100px;text-align:center">Tiến độ</th>'
      + '<th style="padding:7px 9px;width:110px;text-align:center">Status</th>'
    + '</tr></thead><tbody>' + rows + '</tbody></table>';
}

/* Khối Other task trong PDF */
function otherPdfBlock(list, isNext){
  if (!list || !list.length)
    return '<p style="color:#5A6A8A;font-size:11px">'
      + (isNext ? 'No other task planned for next week.' : 'No other task recorded for this week.') + '</p>';
  return list.map(function(g){
    var kp = otherPct_(g), subs = (g.subs || []);
    var rowsHtml = subs.length
      ? subs.map(function(x, i){
          var p2 = otherPct_(x);
          return '<tr>'
            + '<td style="text-align:center;white-space:nowrap">' + esc(x.no || (i + 1)) + '</td>'
            + '<td><b>' + esc(x.subTask || '—') + '</b>'
              + ((!isNext && S(x.result)) ? '<div class="res">' + cellRich(x.result) + '</div>' : '') + '</td>'
            + '<td style="text-align:center;white-space:nowrap">' + esc(fmtVN(x.start) || '—') + '</td>'
            + '<td style="text-align:center;white-space:nowrap">' + esc(fmtVN(x.planned) || '—') + '</td>'
            + '<td style="text-align:center">' + pdfProgBar(p2) + '</td>'
            + '<td style="text-align:center;white-space:nowrap">' + esc(x.pic || '—') + '</td>'
            + '<td style="text-align:center;white-space:nowrap;color:' + progColor(p2) + ';font-weight:600">'
              + esc(x.status || 'To Do') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="7" class="res">'
          + ((!isNext && S(g.result)) ? cellRich(g.result) : '<span style="color:#8A97B5">Chưa có đầu việc con</span>')
        + '</td></tr>';
    return '<div class="kt"><div class="kt-h">'
        + '<span class="kt-no">' + subs.length + '</span>'
        + '<span class="kt-name">' + esc(g.type || 'Other') + ' — ' + esc(g.keyTask || '—') + '</span>'
        + '<span class="kt-pct-badge" style="color:' + progColor(kp) + '">' + kp + '%</span></div>'
      + '<table><thead><tr>'
        + '<th style="width:5%">No.</th><th style="width:36%">Đầu việc con</th>'
        + '<th style="width:9%">Bắt đầu</th><th style="width:9%">Hạn</th>'
        + '<th style="width:11%">Tiến độ</th><th style="width:18%">PIC</th><th style="width:12%">Status</th>'
      + '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
  }).join('');
}
function sendWeeklyReport(user, p){
  /* ⭐ Chế độ thử của Admin (CRM v30.6): testTo = email công ty của Admin ⇒ chỉ gửi bản thử cho Admin, không CC, không ghi nhật ký */
  var _tt = S(p.testTo).toLowerCase();
  if (_tt && /^[a-z0-9._%+\-]+@(mani\.inc|manimedicalhanoi\.com)$/.test(_tt) && S(p.option) !== 'download'){ p.option = 'self'; user = Object.assign({}, user, { email:_tt }); }
  else _tt = '';
  if (!_tt) try{ logAct(user, 'report', 'weekly', 'Báo cáo tuần', S(p.option) || 'send', ''); }catch(_e){}
  var thisFrom = S(p.from), thisTo = S(p.to);
  if (!thisFrom || !thisTo) return { ok:false, error:'Thiếu khoảng ngày báo cáo' };
  var nextFrom = addDaysISO(thisFrom, 7), nextTo = addDaysISO(thisTo, 7);
  var option = S(p.option) || 'self';
  var all = readTab('weekly');
  var otherBag = parseOther_(p);
  var otherTotal = 0;

  var targets = [];
  if (option === 'all'){
    for (var email in USER_MAP){
      if (USER_MAP[email].team !== reportTeamName_()) continue;
      targets.push({ pic:USER_MAP[email].pic, email:email, title:USER_MAP[email].title });
    }
  } else if (option === 'pic'){
    var pn = S(p.toPic), em = PIC_EMAIL[pn];
    if (!em) return { ok:false, error:'Không tìm thấy email của ' + pn };
    targets.push({ pic:pn, email:em, title:(USER_MAP[em] || {}).title || '' });
  } else if (option === 'team'){
    if (!user.email) return { ok:false, error:'Tài khoản ' + user.pic + ' chưa có email — không gửi được.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title });
  } else if (option === 'download'){
    var who = S(p.toPic) || user.pic;
    var g1 = weeklyGroups(all, who, thisFrom, thisTo);
    var g2 = weeklyGroups(all, who, nextFrom, nextTo);
    var o1 = otherFor_(otherBag, who, 'cur'), o2 = otherFor_(otherBag, who, 'next');
    var html = buildCombinedReportHtml({ pic:who, title:user.title }, thisFrom, thisTo, g1, nextFrom, nextTo, g2, o1, o2);
    var b = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf')
              .setName('MMH_' + teamLabel_() + '_Weekly_' + who.replace(/\s+/g, '') + '_' + thisFrom + '.pdf');
    return { ok:true, download:true, otherCount: otherCount_(o1),
             files:[{ name:b.getName(), b64: Utilities.base64Encode(b.getBytes()) }],
             message:'Đã tạo PDF báo cáo tuần (kèm ' + otherCount_(o1) + ' mục Công việc khác)' };
  } else {
    if (!user.email) return { ok:false, error:'Tài khoản ' + user.pic + ' chưa có email — không gửi được.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title, test:true });
  }

  var sent = [], pdfErrs = [];
  targets.forEach(function(t){
    var recipient = { pic:t.pic, email:t.email, title:t.title };
    var tKeys = weeklyGroups(all, t.pic, thisFrom, thisTo);
    var nKeys = weeklyGroups(all, t.pic, nextFrom, nextTo);
    var oCur  = otherFor_(otherBag, t.pic, 'cur');
    var oNext = otherFor_(otherBag, t.pic, 'next');
    otherTotal += otherCount_(oCur);
    /* ⭐ v10.8 — PDF đính kèm cùng nội dung / bố cục với email */
    var html  = '<html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{margin:0}</style></head><body>' +
                buildCombinedEmailBody(recipient, thisFrom, thisTo, tKeys, nextFrom, nextTo, nKeys, oCur, oNext) + '</body></html>';
    var blob  = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf')
                  .setName('MMH_' + teamLabel_() + '_Weekly_' + t.pic.replace(/\s+/g, '') + '_' + thisFrom + '.pdf');
    if (!t.test) { var sv = savePdfToDrive_(blob); if (!sv.ok) pdfErrs.push(t.pic + ': ' + sv.error); }
    var subject = 'RE: Weekly Report (' + teamLabel_() + ') ' + t.pic + ' — Week ' + fmtVN(thisFrom) + '–' + fmtVN(thisTo) + (t.test ? ' (test)' : '');
    var toField, ccField;
    if (t.test){ toField = t.email; ccField = ''; }
    else {
      var rr = reportRecipients(t.pic);
      var toArr = rr.to.filter(function(e, i, a){ return e && a.indexOf(e) === i; });
      var ccArr = rr.cc.filter(function(e, i, a){ return e && toArr.indexOf(e) < 0 && a.indexOf(e) === i; });
      toField = toArr.join(','); ccField = ccArr.join(',');
    }
    mmhMail_({
      to: toField, cc: ccField, subject: subject,
      htmlBody: buildCombinedEmailBody(recipient, thisFrom, thisTo, tKeys, nextFrom, nextTo, nKeys, oCur, oNext),
      attachments: [blob], name: appName_()
    });
    sent.push(t.pic);
  });

  var suffix = ' · kèm ' + otherTotal + ' mục Công việc khác' + (pdfErrs.length ? (' · ⚠️ ' + pdfErrs.join(' | ')) : '');
  return { ok:true, otherCount: otherTotal, message:
      option === 'all'  ? ('Đã gửi báo cáo tuần cho ' + sent.length + ' PIC' + suffix)
    : option === 'team' ? ('Đã gửi báo cáo tuần của ' + user.pic + ' tới team (CC: Tuyen, Nguyen Ha, Giang)' + suffix)
    : option === 'pic'  ? ('Đã gửi báo cáo tuần của ' + sent[0] + suffix)
    : ('Đã gửi báo cáo tuần (thử) tới ' + sent[0] + suffix) };
}

/* ══════════════════════ BÁO CÁO THÁNG ══════════════════════
 * Nguồn: tab "5. MONTHLY REPORT". Kết quả tháng N dùng cột RESULT · Kế hoạch tháng N+1 dùng cột PLAN. */

function nextMonthStr(month){
  var y = parseInt(String(month).slice(0, 4), 10), m = parseInt(String(month).slice(4, 6), 10);
  m++; if (m > 12){ m = 1; y++; }
  return y + ('0' + m).slice(-2);
}
function monthLabel(m){ return String(m).slice(4, 6) + '/' + String(m).slice(0, 4); }

/* ⭐ v10.9 — thứ tự PIC theo khu vực: miền Bắc → miền Trung → miền Nam (rồi theo thứ tự tab KPI) */
function mnAreaRank_(a){ a = normName_(a); return /north|bac/.test(a) ? 1 : /central|trung/.test(a) ? 2 : /south|nam/.test(a) ? 3 : 9; }
function mnAreaVi_(a){ var r = mnAreaRank_(a); return r === 1 ? 'Khu vực miền Bắc' : r === 2 ? 'Khu vực miền Trung' : r === 3 ? 'Khu vực miền Nam' : (S(a) ? 'Khu vực ' + S(a) : ''); }
function mnTeamSections_(all, month, nMonth){
  var base = []; try { base = NA_ENV.teamPics(); } catch(e){}
  var pics = base.slice();
  all.forEach(function(r){ var pc = S(r.pic); if (pc && (S(r.period) === String(month) || S(r.period) === String(nMonth)) && pics.indexOf(pc) < 0) pics.push(pc); });
  var secs = pics.map(function(pc, i){
    var mine = all.filter(function(r){ return S(r.pic) === pc; }), cnt = {};
    mine.forEach(function(r){ var a = S(r.area); if (a) cnt[a] = (cnt[a] || 0) + 1; });
    var area = Object.keys(cnt).sort(function(a, b){ return cnt[b] - cnt[a]; })[0] || '';
    return { pic:pc, area:area, rank:mnAreaRank_(area), idx:i,
             cur:mnPrep_(all.filter(function(r){ return S(r.period) === String(month) && S(r.pic) === pc; })),
             next:mnPrep_(all.filter(function(r){ return S(r.period) === String(nMonth) && S(r.pic) === pc; })) };
  });
  secs.sort(function(a, b){ return (a.rank - b.rank) || (a.idx - b.idx); });
  return secs;
}
function buildMonthlyTeamHtml_(month, secs, isNext){
  var mLabel = monthLabel(month), css = '', parts = [];
  secs.forEach(function(sc, i){
    var rows = isNext ? sc.next : sc.cur;
    var h = buildMonthlyAllHtml({ pic:sc.pic }, month, rows, isNext);
    if (!css){ var m = /<style>([\s\S]*?)<\/style>/.exec(h); css = m ? m[1] : ''; }
    var b0 = h.indexOf('<div class="head">'), b1 = h.indexOf('<div class="foot">');
    var inner = h.slice(h.indexOf('</div></div>', b0) + 12, b1);
    parts.push('<div class="pic-sec"' + (i ? ' style="page-break-before:always"' : '') + '>' +
      '<div class="pic-h"><span class="pic-no">' + (i + 1) + '</span>' + esc(sc.pic) + (sc.area ? ' <span class="pic-a">· ' + esc(mnAreaVi_(sc.area)) + '</span>' : '') +
      ' <span class="pic-c">' + rows.length + ' hạng mục</span></div>' +
      (rows.length ? inner : '<p style="color:#5A6A8A">Chưa có nội dung ' + (isNext ? 'kế hoạch' : 'báo cáo') + ' tháng ' + mLabel + '.</p>') + '</div>');
  });
  return '<html><head><meta charset="utf-8"><style>' + css +
    '.pic-h{font-size:14px;font-weight:800;color:#1F3A6B;border-bottom:2px solid #3A5CAA;padding:4px 0 6px;margin:4px 0 10px}' +
    '.pic-no{display:inline-block;background:#3A5CAA;color:#fff;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;font-size:11px;margin-right:8px}' +
    '.pic-a{font-weight:600;color:#3A5CAA;font-size:12px}.pic-c{font-weight:500;color:#5A6A8A;font-size:10.5px;margin-left:6px}' +
    '</style></head><body>' +
    '<div class="head"><h1>' + (isNext ? 'Monthly Plan' : 'Monthly Report') + ' — ' + teamLabel_() + ' Sales Team</h1>' +
      '<div class="meta">Period: <b>' + mLabel + '</b><br>Team: <b>' + reportTeamName_() + '</b><br>Thứ tự: <b>' +
      secs.map(function(x){ return esc(x.pic) + (x.area ? ' (' + esc(mnAreaVi_(x.area).replace('Khu vực ', '')) + ')' : ''); }).join(' → ') + '</b></div></div>' +
    parts.join('') +
    '<div class="foot">' + appName_() + ' · xuất ' + fmtVN(todayISO()) + '</div></body></html>';
}
/* ⭐ báo cáo tháng: bỏ hạng mục KPI (Management-KPI) · đưa Marketing (Event cuối cùng) xuống cuối */
function mnTypeRank_(t){ t = String(t || '').toLowerCase(); return /event/.test(t) && /marketing|mkt/.test(t) ? 3 : /^(marketing|mkt)/.test(t) ? 2 : 1; }
function mnTypeCmp_(a, b){ return (mnTypeRank_(a) - mnTypeRank_(b)) || String(a).localeCompare(String(b)); }
function mnPrep_(rows){
  return (rows || []).filter(function(r){ return !/\bkpi\b/i.test(String(r.typeTask || '')); })
    .map(function(r, i){ return { r:r, i:i }; })
    .sort(function(x, y){ return mnTypeCmp_(x.r.typeTask, y.r.typeTask) || (x.i - y.i); })
    .map(function(x){ return x.r; });
}
function monthlyRowsFor(all, month, pic){
  return mnPrep_(all.filter(function(r){
    if (S(r.period) !== String(month)) return false;
    if (pic && S(r.pic) && S(r.pic) !== pic) return false;
    return true;
  }));
}

function buildMonthlyAllHtml(user, month, rows, isNext){
  var mLabel = monthLabel(month);
  rows = mnPrep_(rows);
  var groups = {}, order = [];
  rows.forEach(function(r){
    var t = S(r.typeTask) || '—';
    if (!groups[t]){ groups[t] = { type:t, items:[] }; order.push(t); }
    groups[t].items.push(r);
  });
  order.sort(mnTypeCmp_);
  var secNo = 0;
  var body = order.map(function(t){
    secNo++;
    var g = groups[t];
    var blocks = g.items.map(function(r, i){
      var picBadge = r.pic ? '<span class="kt-pic">PIC: ' + esc(r.pic) + '</span>' : '';
      var areaBadge = r.area ? '<span class="kt-pic">' + esc(r.area) + '</span>' : '';
      var txt = isNext ? S(r.plan) : (S(r.result) || S(r.plan));
      return '<div class="kt-block">' +
          '<div class="kt-line"><span class="kt-idx">' + (i + 1) + '/' + g.items.length + '</span>' +
            '<span class="kt-name">' + esc(t) + '</span>' + areaBadge + picBadge + '</div>' +
          '<div class="pr-cell">' + cellRich(txt) + '</div>' +
        '</div>';
    }).join('');
    return '<div class="type-sec"><div class="type-h"><span class="type-no">' + secNo + '</span>' + esc(t) +
      ' <span class="type-n">(' + g.items.length + ' hạng mục)</span></div>' + blocks + '</div>';
  }).join('');
  if (!body) body = '<p style="color:#5A6A8A">Không có nội dung trong tháng này.</p>';
  var reportTitle = isNext ? 'Monthly Plan' : 'Monthly Report';
  return '<html><head><meta charset="utf-8"><style>' +
    '@page{size:A4 portrait;margin:13mm}' +
    'body{font-family:Aptos,\'Segoe UI\',Calibri,Arial,sans-serif;color:#1A2340;font-size:10px;margin:0}' +
    '.head{border-bottom:2.5px solid #0E2F5F;padding:0 0 10px;margin-bottom:12px}' +
    '.head h1{font-size:15px;margin:0 0 4px;color:#0E2F5F;font-weight:700}' +
    '.head .meta{margin:0;font-size:10.5px;color:#41506B;line-height:1.55}.head .meta b{color:#0E2F5F}' +
    '.type-sec{margin-bottom:14px}' +
    '.type-h{font-size:12.5px;font-weight:800;color:#0E2F5F;background:#EEF3FB;padding:8px 12px;border-radius:5px;border-left:4px solid #3A5CAA;margin-bottom:8px;page-break-after:avoid}' +
    '.type-no{display:inline-block;background:#0E2F5F;color:#fff;font-size:10px;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;margin-right:8px}' +
    '.type-n{font-weight:500;color:#5A6A8A;font-size:10px}' +
    '.kt-block{margin:0 0 9px;padding:0 0 0 6px}' +
    '.kt-line{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;page-break-after:avoid}' +
    '.kt-idx{font-size:9px;font-weight:700;color:#3A5CAA;background:#E8EEF9;border-radius:4px;padding:1px 7px;white-space:nowrap}' +
    '.kt-name{font-weight:700;font-size:11px;color:#0E2F5F;flex:1}' +
    '.kt-pic{font-size:9px;color:#5A6A8A;white-space:nowrap;background:#F1F5FB;border-radius:4px;padding:1px 8px}' +
    '.pr-cell{font-size:9px;color:#41506B;line-height:1.55;background:#FCFDFE;border:1px solid #EEF1F7;border-radius:5px;padding:8px 11px;margin-left:2px}' +
    '.pr-cell b{color:#0E2F5F}' +
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97B5;border-top:1px solid #E2E8F5;padding-top:7px;text-align:right}' +
    '</style></head><body>' +
    '<div class="head"><h1>' + reportTitle + ' — ' + teamLabel_() + ' Sales</h1>' +
      '<div class="meta">Issued by: <b>' + esc(user.pic) + '</b><br>Period: <b>' + mLabel + '</b><br>Team: <b>' + reportTeamName_() + '</b></div></div>' +
    body +
    '<div class="foot">' + appName_() + ' · xuất ' + fmtVN(todayISO()) + '</div></body></html>';
}

function monthlyEmailTable(rows, isNext){
  var body = rows.map(function(r){
    var txt = isNext ? S(r.plan) : (S(r.result) || S(r.plan));
    return '<tr>' +
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;color:#3A5CAA;white-space:nowrap">' + esc(r.typeTask) + '</td>' +
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;white-space:pre-wrap;line-height:1.5">' + (txt ? cellRich(txt) : '<span style="color:#9AA3B5">—</span>') + '</td>' +
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;text-align:center;white-space:nowrap">' + esc(r.area || '') + '</td>' +
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;text-align:center;white-space:nowrap">' + esc(r.pic || '') + '</td>' +
    '</tr>';
  }).join('');
  if (!body) body = '<tr><td colspan="4" style="border:1px solid #D8E0EF;padding:12px;text-align:center;color:#8A97B5">' + (isNext ? 'No plan for next month.' : 'No item for this month.') + '</td></tr>';
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">' +
    '<thead><tr style="background:#0E2F5F;color:#fff">' +
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;text-align:left;width:180px">Type task</th>' +
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;text-align:left">' + (isNext ? 'Plan' : 'Result') + '</th>' +
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;width:80px">Area</th>' +
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;width:90px">PIC</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table>';
}
function buildMonthlyEmailBody(user, mLabel, nLabel, tRows, nRows){
  return '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.5">' +
    '<p style="margin:0 0 4px"><b>Report by:</b> ' + esc(user.pic) + (user.title ? ' (' + esc(user.title) + ')' : '') + '</p>' +
    '<div style="border-left:4px solid #0E2F5F;padding-left:10px;margin:14px 0 8px"><b style="font-size:12pt;color:#0E2F5F">\u2460 Kết quả tháng ' + esc(mLabel) + '</b></div>' +
    monthlyEmailTable(tRows, false) +
    '<div style="border-left:4px solid #3A5CAA;padding-left:10px;margin:18px 0 8px"><b style="font-size:12pt;color:#3A5CAA">\u2461 Kế hoạch tháng ' + esc(nLabel) + '</b></div>' +
    monthlyEmailTable(nRows, true) +
    '<p style="margin:16px 0 2px">Best regards,</p>' +
    '<p style="margin:0"><b>' + esc(user.pic) + '</b>' + (user.title ? ' \u2014 ' + esc(user.title) : '') + '</p>' +
    '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi \u00b7 ' + reportTeamName_() + '</p></div>';
}

function sendMonthlyReport(user, p){
  /* ⭐ Chế độ thử của Admin (CRM v30.6): testTo = email công ty của Admin ⇒ chỉ gửi bản thử cho Admin, không CC, không ghi nhật ký */
  var _tt = S(p.testTo).toLowerCase();
  if (_tt && /^[a-z0-9._%+\-]+@(mani\.inc|manimedicalhanoi\.com)$/.test(_tt) && S(p.option) !== 'download'){ p.option = 'self'; user = Object.assign({}, user, { email:_tt }); }
  else _tt = '';
  if (!_tt) try{ logAct(user, 'report', 'monthly', 'Báo cáo tháng', S(p.option) || 'send', ''); }catch(_e){}
  var month = String(p.month || '').replace(/\D/g, '').slice(0, 6);
  if (!month) return { ok:false, error:'Thiếu tháng báo cáo' };
  var nMonth = nextMonthStr(month);
  var option = S(p.option) || 'self';
  var all    = readTab('monthly');
  var mLabel = monthLabel(month), nLabel = monthLabel(nMonth);

  var scopePic = (option === 'pic') ? S(p.toPic) : (option === 'all' ? '' : user.pic);
  /* ⭐ v10.9 — xuất báo cáo cả team: 2 file (Report tháng này + Plan tháng sau), cuốn chiếu Bắc → Trung → Nam */
  if (option === 'teamFiles'){
    var secs = mnTeamSections_(all, month, nMonth);
    var hR = buildMonthlyTeamHtml_(month, secs, false), hP = buildMonthlyTeamHtml_(nMonth, secs, true);
    var f1 = HtmlService.createHtmlOutput(hR).getBlob().getAs('application/pdf').setName('MMH_' + teamLabel_() + '_Team_Monthly_Report_' + month + '.pdf');
    var f2 = HtmlService.createHtmlOutput(hP).getBlob().getAs('application/pdf').setName('MMH_' + teamLabel_() + '_Team_Monthly_Plan_' + nMonth + '.pdf');
    return { ok:true, download:true,
      files:[ { name:f1.getName(), b64:Utilities.base64Encode(f1.getBytes()) }, { name:f2.getName(), b64:Utilities.base64Encode(f2.getBytes()) } ],
      message:'Đã tạo 2 file PDF cả team: Report ' + mLabel + ' và Plan ' + nLabel + ' (' + secs.map(function(x){ return x.pic; }).join(' → ') + ')' };
  }
  if (option === 'download'){
    var htmlThis = buildMonthlyAllHtml({ pic:scopePic || user.pic, title:user.title }, month,  monthlyRowsFor(all, month,  scopePic), false);
    var htmlNext = buildMonthlyAllHtml({ pic:scopePic || user.pic, title:user.title }, nMonth, monthlyRowsFor(all, nMonth, scopePic), true);
    var b1 = HtmlService.createHtmlOutput(htmlThis).getBlob().getAs('application/pdf').setName('MMH_' + teamLabel_() + '_Monthly_' + month + '.pdf');
    var b2 = HtmlService.createHtmlOutput(htmlNext).getBlob().getAs('application/pdf').setName('MMH_' + teamLabel_() + '_Monthly_' + nMonth + '_Plan.pdf');
    return { ok:true, download:true,
      files:[ { name:b1.getName(), b64: Utilities.base64Encode(b1.getBytes()) },
              { name:b2.getName(), b64: Utilities.base64Encode(b2.getBytes()) } ],
      message:'Đã tạo 2 file PDF: tháng ' + mLabel + ' và tháng ' + nLabel };
  }

  var targets = [];
  if (option === 'all'){
    for (var email in USER_MAP){
      if (USER_MAP[email].team !== reportTeamName_()) continue;
      targets.push({ pic:USER_MAP[email].pic, email:email, title:USER_MAP[email].title });
    }
  } else if (option === 'pic'){
    var pn = S(p.toPic), em = PIC_EMAIL[pn];
    if (!em) return { ok:false, error:'Không tìm thấy email của ' + pn };
    targets.push({ pic:pn, email:em, title:(USER_MAP[em] || {}).title || '' });
  } else if (option === 'team'){
    if (!user.email) return { ok:false, error:'Tài khoản ' + user.pic + ' chưa có email.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title });
  } else {
    if (!user.email) return { ok:false, error:'Tài khoản ' + user.pic + ' chưa có email.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title, test:true });
  }

  var sent = [];
  targets.forEach(function(t){
    var recipient = { pic:t.pic, email:t.email, title:t.title };
    var tRows = monthlyRowsFor(all, month,  option === 'all' ? t.pic : scopePic || t.pic);
    var nRows = monthlyRowsFor(all, nMonth, option === 'all' ? t.pic : scopePic || t.pic);
    var blobThis = HtmlService.createHtmlOutput(buildMonthlyAllHtml(recipient, month,  tRows, false)).getBlob()
                     .getAs('application/pdf').setName('MMH_' + teamLabel_() + '_Monthly_' + month + '_' + t.pic.replace(/\s+/g,'') + '.pdf');
    var blobNext = HtmlService.createHtmlOutput(buildMonthlyAllHtml(recipient, nMonth, nRows, true)).getBlob()
                     .getAs('application/pdf').setName('MMH_' + teamLabel_() + '_Monthly_' + nMonth + '_Plan_' + t.pic.replace(/\s+/g,'') + '.pdf');
    var toField, ccField;
    if (t.test){ toField = t.email; ccField = ''; }
    else {
      var rr = reportRecipients(t.pic);
      var toArr = rr.to.filter(function(e, i, a){ return e && a.indexOf(e) === i; });
      var ccArr = rr.cc.filter(function(e, i, a){ return e && toArr.indexOf(e) < 0 && a.indexOf(e) === i; });
      toField = toArr.join(','); ccField = ccArr.join(',');
    }
    mmhMail_({
      to: toField, cc: ccField,
      subject: 'RE: Monthly Report (' + teamLabel_() + ') ' + t.pic + ' — ' + mLabel + ' & plan ' + nLabel + (t.test ? ' (test)' : ''),
      htmlBody: buildMonthlyEmailBody(recipient, mLabel, nLabel, tRows, nRows),
      attachments: [blobThis, blobNext], name: appName_()
    });
    sent.push(t.pic);
  });
  return { ok:true, message:
      option === 'all'  ? ('Đã gửi báo cáo tháng cho ' + sent.length + ' PIC')
    : option === 'team' ? ('Đã gửi báo cáo tháng của ' + user.pic + ' tới team (CC: Tuyen, Nguyen Ha, Giang)')
    : option === 'pic'  ? ('Đã gửi báo cáo tháng của ' + sent[0])
    : ('Đã gửi báo cáo tháng (thử) tới ' + sent[0]) };
}

/* ══════════════════════ TEST NHANH ══════════════════════ */
function TEST_layout(){
  var out = { tabs:{}, fy:currentFY() };
  for (var k in TABS){
    try { out.tabs[k] = { name:TABS[k], lastRow: sh(k).getLastRow(), rows: (k === 'kpi' || k === 'master') ? '-' : readTab(k).length }; }
    catch(e){ out.tabs[k] = { name:TABS[k], error:String(e) }; }
  }
  out.kpi68 = (function(){ try { var R = k68Read_(sh('kpi')); return R ? { fy:R.fy, pics:R.pics.length, groups:R.groups.length } : 'tab KPI chưa theo mẫu FY68'; } catch(e){ return String(e); } })();
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   TỐC ĐỘ: MEMO trong 1 lần chạy + CACHE bền giữa các lần gọi
   ══════════════════════════════════════════════════════════════════════════ */

var _RAW = {};                 // memo raw values trong 1 execution
var CACHE_TTL = 21600;         // 6 giờ
var CHUNK = 90000;             // < 100KB / key của CacheService

function props_(){ return PropertiesService.getScriptProperties(); }

/* PHIÊN BẢN RIÊNG CHO TỪNG TAB */
var _VER = null;
function verAll_(){
  if (_VER) return _VER;
  var raw = '';
  try { raw = props_().getProperty('VER_MAP') || ''; } catch(e){}
  var o = {};
  if (raw){ try { o = JSON.parse(raw) || {}; } catch(e){ o = {}; } }
  if (!o._all){ o._all = String(Date.now()); saveVer_(o); }
  _VER = o;
  return o;
}
function saveVer_(o){
  try { props_().setProperty('VER_MAP', JSON.stringify(o)); } catch(e){}
}
function dataVersion(){ return String(verAll_()._all); }
/* Chuỗi phiên bản gộp của danh sách tab — dùng làm khoá cache */
function tabVersion(tabs){
  var o = verAll_(), out = [];
  (tabs && tabs.length ? tabs : ['_all']).forEach(function(t){ out.push(t + ':' + (o[t] || o._all)); });
  return out.join('~');
}
/* Ghi xong thì gọi bumpVersion(['order']) — không truyền gì thì làm mới toàn bộ */
function bumpVersion(tabs){
  var o = verAll_(), v = String(Date.now());
  o._all = v;
  if (tabs && tabs.length) tabs.forEach(function(t){ if (t) o[t] = v; });
  else for (var k in TABS) o[k] = v;
  saveVer_(o);
  _VER = o;
  _RAW = {};
  return v;
}

function cacheGet_(key){
  try{
    var c = CacheService.getScriptCache();
    var head = c.get(key + '|H');
    if (!head) return null;
    var n = parseInt(head, 10);
    if (!(n > 0)) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + '|' + i);
    var got = c.getAll(keys), s = '';
    for (var j = 0; j < n; j++){
      var part = got[key + '|' + j];
      if (part == null) return null;
      s += part;
    }
    return JSON.parse(s);
  }catch(e){ return null; }
}
function cachePut_(key, obj){
  try{
    var s = JSON.stringify(obj);
    var c = CacheService.getScriptCache();
    var n = Math.ceil(s.length / CHUNK), map = {};
    if (n > 60) return;                        // quá lớn ⇒ bỏ qua cache (⭐ v9.3: 40 → 60 cho danh bạ CBC lớn)
    for (var i = 0; i < n; i++) map[key + '|' + i] = s.substr(i * CHUNK, CHUNK);
    c.putAll(map, CACHE_TTL);
    c.put(key + '|H', String(n), CACHE_TTL);
  }catch(e){}
}
function cached_(name, fn){
  return cachedFor_(name, null, fn);
}
/* cache theo ĐÚNG các tab mà kết quả phụ thuộc vào */
function cachedFor_(name, tabs, fn){
  var key = 'D3|' + tabVersion(tabs) + '|' + name;
  var hit = cacheGet_(key);
  if (hit) { hit._cache = true; return hit; }
  var val = fn();
  val._ver = tabVersion(tabs);
  cachePut_(key, val);
  return val;
}
var DEPS = {
  list      : function(p){ return [S(p.tab)]; },
  multi     : function(p){ return S(p.tabs).split(',').map(function(x){ return x.trim(); }).filter(Boolean); },
  visitFeed : function(){ return ['weekly']; },
  account360: function(){ return ['customer','cbc','order','weekly','adp','npp']; },
  bundle    : function(){ return ['customer','master','kpi','order','weekly','present']; },
  dashboard : function(){ return ['customer','cbc','order','weekly','present','adp']; },
  kpi       : function(){ return ['customer','order','weekly','present','kpi']; },
  productCodes: function(){ return ['pcode']; }
};
function depsOf(action, p){
  var f = DEPS[action];
  return f ? f(p) : null;
}

/* ══════════════════════ NHẬT KÝ HOẠT ĐỘNG (_LOG) ══════════════════════ */
var LOG_TAB = '_LOG';
var LOG_MAX = 400;

function logSheet_(){
  var s = ss().getSheetByName(LOG_TAB);
  if (!s){
    s = ss().insertSheet(LOG_TAB);
    s.getRange(1, 1, 1, 7).setValues([['Time','PIC','Action','Tab','Target','Detail','Row']]);
    s.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#0E2F5F').setFontColor('#ffffff');
    s.setFrozenRows(1);
    s.hideSheet();
  }
  return s;
}
/* NHẬT KÝ GHI THEO LÔ (12 dòng) */
var LOG_BUF_KEY = 'ACTBUF';
var LOG_BUF_MAX = 12;
function logAct(user, action, tab, target, detail, row){
  try{
    var line = [
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      (user && user.pic) || '', action || '', tab || '', target || '', detail || '', row || ''
    ];
    var c = CacheService.getScriptCache();
    var raw = c.get(LOG_BUF_KEY), buf = [];
    if (raw){ try { buf = JSON.parse(raw) || []; } catch(e){ buf = []; } }
    buf.push(line);
    if (buf.length >= LOG_BUF_MAX){ c.remove(LOG_BUF_KEY); writeLogLines_(buf); return; }
    c.put(LOG_BUF_KEY, JSON.stringify(buf), 21600);
  }catch(e){}
}
function flushLog_(){
  try{
    var c = CacheService.getScriptCache(), raw = c.get(LOG_BUF_KEY);
    if (!raw) return 0;
    c.remove(LOG_BUF_KEY);
    var buf = JSON.parse(raw) || [];
    writeLogLines_(buf);
    return buf.length;
  }catch(e){ return 0; }
}
function writeLogLines_(lines){
  if (!lines || !lines.length) return;
  try{
    var s = logSheet_();
    s.getRange(s.getLastRow() + 1, 1, lines.length, 7).setValues(lines);
    var lr = s.getLastRow();
    if (lr > LOG_MAX + 200) s.deleteRows(2, lr - LOG_MAX);
  }catch(e){}
}
function readActivity(limit){
  limit = limit || 120;
  flushLog_();
  try{
    var s = ss().getSheetByName(LOG_TAB);
    if (!s) return [];
    var lr = s.getLastRow();
    if (lr < 2) return [];
    var n = Math.min(limit, lr - 1);
    var vals = s.getRange(lr - n + 1, 1, n, 7).getValues();
    var out = [];
    for (var i = vals.length - 1; i >= 0; i--){
      var v = vals[i];
      out.push({
        time  : (Object.prototype.toString.call(v[0]) === '[object Date]')
                ? Utilities.formatDate(v[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
                : S(v[0]),
        pic   : S(v[1]), action: S(v[2]), tab: S(v[3]),
        target: S(v[4]), detail: S(v[5]), row: S(v[6])
      });
    }
    return out;
  }catch(e){ return []; }
}
function clearActivity(user, p){
  if (!isManager(user)) return { ok:false, error:'Chỉ quản lý mới được xoá nhật ký' };
  try{ CacheService.getScriptCache().remove(LOG_BUF_KEY); }catch(e){}
  try{
    var s = ss().getSheetByName(LOG_TAB);
    if (s && s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1);
  }catch(e){}
  return { ok:true };
}

/* ══════════════════════ ẢNH DRIVE → THUMBNAIL ══════════════════════ */
function driveId_(url){
  var s = S(url);
  var m = /[-\w]{25,}/.exec(s);
  return m ? m[0] : '';
}
function photoObjs(cellVal){
  var raw = S(cellVal);
  if (!raw) return [];
  return raw.split(/[\s,;\n]+/).filter(function(x){ return /^https?:/.test(x); }).map(function(u){
    var id = driveId_(u);
    return {
      id   : id,
      thumb: id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w400') : u,
      full : id ? ('https://drive.google.com/thumbnail?id=' + id + '&sz=w1600') : u,
      open : u
    };
  });
}

/* ══════════════════════ CUSTOMER INDEX — DẠNG NÉN ══════════════════════ */
var CIDX_COLS = ['_row','code','name','type','province','area','pic','fy','openDate','nCbc','nOrder','note'];
function customerIndexCompact(){
  var vals = rawValues('customer'), m = COL.customer, out = [];
  for (var i = 0; i < vals.length; i++){
    var r = vals[i];
    if (S(r[KEY_COL - 1]) === '') continue;
    out.push([
      DATA_ROW + i,
      S(r[m.code - 1]), S(r[m.name - 1]), S(r[m.type - 1]),
      S(r[m.province - 1]), S(r[m.area - 1]), S(r[m.pic - 1]),
      S(r[m.fy - 1]), d2s(r[m.openDate - 1]),
      num(r[m.nCbc - 1]), num(r[m.nOrder - 1]), S(r[m.note - 1])
    ]);
  }
  return out;
}

/* ══════════════════════ ACCOUNT 360 — DÒNG THỜI GIAN GỘP ══════════════════════ */
function account360(p){
  var code = S(p.code), name = S(p.name);
  if (!code && !name) return { ok:false, error:'Thiếu mã hoặc tên khách hàng' };

  var cus = readTab('customer');
  var me  = null;
  for (var i = 0; i < cus.length; i++){
    if ((code && S(cus[i].code) === code) || (!code && S(cus[i].name) === name)){ me = cus[i]; break; }
  }
  if (!me && name){
    for (var j = 0; j < cus.length; j++) if (S(cus[j].name) === name){ me = cus[j]; break; }
  }
  if (!me) return { ok:false, error:'Không tìm thấy khách hàng' };
  code = S(me.code); name = S(me.name);

  var cbc = readTab('cbc').filter(function(r){ return S(r.code) === code; });

  var orders = readTab('order').filter(function(r){
    return S(r.code) === code || (name && S(r.name) === name);
  });

  var weekly = readTab('weekly').filter(function(r){
    var a = parseCheckName(S(r.account));
    return a.name && a.name === name;
  }).map(function(r){
    r.photos = photoObjs(r.photo);
    var g = parseGps_(r.gpsInfo); r.gps = g.gps; r.gpsAddr = g.gpsAddr;
    return r;
  });

  var present = readTab('present').filter(function(r){
    var a = parseCheckName(S(r.account));
    return a.name && a.name === name;
  });

  var adp = readTab('adp').filter(function(r){
    var a = parseCheckName(S(r.account));
    return a.name && a.name === name;
  });

  var tl = [];
  orders.forEach(function(o){
    var iso = o.day ? d2s(o.day) : ymToIso_(S(o.month));
    tl.push({ kind:'order', date:iso, title:'Đơn hàng ' + (S(o.orderNo) || ''), pic:S(o.pic),
              amount:num(o.amount), qty:num(o.qty), product:S(o.ptype) || S(o.detail),
              channel:S(o.channel), row:o._row,
              detail:[S(o.detail), num(o.qty) ? ('SL ' + num(o.qty)) : ''].filter(String).join(' · ') });
  });
  weekly.forEach(function(w){
    tl.push({ kind:'visit', date:d2s(w.start), title:S(w.typeAction) || 'Đi địa bàn', pic:S(w.pic),
              typeTask:S(w.typeTask), process:S(w.process), status:S(w.status),
              feedback:S(w.feedback), product:S(w.product), photos:w.photos, row:w._row,
              plan:S(w.plan), result:S(w.result), next:S(w.nextAction),
              detail:S(w.result) || S(w.plan) });
  });
  present.forEach(function(pr){
    var iso = pr.day ? d2s(pr.day) : ymToIso_(S(pr.month));
    tl.push({ kind:'present', date:iso, title:'Thuyết trình sản phẩm', pic:S(pr.pic),
              target:num(pr.target), actual:num(pr.actual), link:S(pr.folder), row:pr._row,
              detail:S(pr.review) });
  });
  adp.forEach(function(a){
    tl.push({ kind:'adp', date:'', title:'ADP — ' + (S(a.abcd) || 'Key account'), pic:S(a.pic),
              row:a._row, detail:S(a.objective) });
  });
  tl.sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });

  var totalAmt = 0, byMonth = {}, byProd = {};
  orders.forEach(function(o){
    var a = num(o.amount); totalAmt += a;
    var mm = S(o.month); if (mm){ byMonth[mm] = (byMonth[mm] || 0) + a; }
    var pd = S(o.ptype) || S(o.detail) || '(khác)';
    byProd[pd] = (byProd[pd] || 0) + a;
  });
  var visits = weekly.length;
  var lastVisit = '', lastOrder = '';
  weekly.forEach(function(w){ var d = d2s(w.start); if (d > lastVisit) lastVisit = d; });
  orders.forEach(function(o){ var d = o.day ? d2s(o.day) : ymToIso_(S(o.month)); if (d > lastOrder) lastOrder = d; });

  var allPhotos = [];
  weekly.forEach(function(w){
    (w.photos || []).forEach(function(ph){
      allPhotos.push({ src:ph, date:d2s(w.start), pic:S(w.pic), note:S(w.result) || S(w.plan), row:w._row });
    });
  });
  allPhotos.sort(function(a, b){ return String(b.date).localeCompare(String(a.date)); });

  return {
    ok:true, customer:me, cbc:cbc, orders:orders, weekly:weekly, present:present, adp:adp,
    timeline: tl.slice(0, 300),
    photos  : allPhotos.slice(0, 60),
    stats   : {
      totalAmount: totalAmt, orderCount: orders.length, visitCount: visits,
      presentCount: present.length, cbcCount: cbc.length,
      lastVisit: lastVisit, lastOrder: lastOrder,
      byMonth: byMonth, byProduct: byProd,
      daysSinceVisit: daysSince_(lastVisit)
    }
  };
}
function ymToIso_(ym){
  var m = /^(\d{4})(\d{2})$/.exec(S(ym));
  return m ? (m[1] + '-' + m[2] + '-01') : '';
}
function daysSince_(iso){
  if (!iso) return -1;
  var d = s2d(iso);
  if (!(d instanceof Date)) return -1;
  return Math.floor((new Date().setHours(0,0,0,0) - d.getTime()) / 86400000);
}

/* ══════════════════════ NHẬT KÝ ĐI ĐỊA BÀN (kèm ảnh) ══════════════════════ */
function visitFeed(p){
  var from = S(p.from), to = S(p.to), pic = S(p.pic);
  var rows = readTab('weekly').filter(function(r){
    if (pic && S(r.pic) !== pic) return false;
    var s0 = d2s(r.start), s1 = d2s(r.finish) || s0;
    if (from && to) return !(s1 < from || s0 > to);
    return true;
  });
  rows.forEach(function(r){
    var g = parseGps_(r.gpsInfo);
    r.upAt = parseUpAt_(r.gpsInfo);
    r.gps = g.gps; r.gpsAddr = g.gpsAddr;
    delete r.gpsInfo;
    var a = parseCheckName(S(r.account));
    r.accName = a.name; r.accType = a.type || S(r.type); r.accProv = a.province || S(r.province);
  });
  rows.sort(function(a, b){ return String(d2s(b.start)).localeCompare(String(d2s(a.start))); });
  return { ok:true, rows: rows };
}

/* ══════════════════════ BUNDLE — GỘP 1 LẦN GỌI ══════════════════════ */
function bundle(user, p){
  var fy  = S(p.fy) || currentFY();
  var pic = S(p.pic);
  var key = 'BUNDLE|' + fy + '|' + pic;

  var core = cachedFor_(key, depsOf('bundle'), function(){
    return {
      master   : readMaster(),
      fyCurrent: fy,
      cidxCols : CIDX_COLS,
      cidx     : customerIndexCompact(),
      kpi      : kpiReport({ fy:fy }),
      picList  : picListAll_(),
      stats    : quickStats(),
      driveFolder: photoFolderId_()
    };
  });

  return {
    ok:true,
    source   : TEAM(),
    team     : TEAM(),
    app      : appName_(),
    user     : user,
    picList  : core.picList,
    fyList   : fyListAll_(core.master),
    master   : core.master,
    fyCurrent: core.fyCurrent,
    cidxCols : core.cidxCols,
    cidx     : core.cidx,
    kpi      : core.kpi,
    stats    : core.stats,
    driveFolder: core.driveFolder,
    activity : readActivity(60),
    ver      : dataVersion(),
    vers     : verAll_(),
    _ver     : tabVersion(depsOf('bundle')),
    cachedAt : core._cache ? 'hit' : 'fresh'
  };
}

/* ══════════════════════ MULTI — gộp nhiều tab vào 1 request ══════════════════════ */
function multiTabs(p){
  var tabs = S(p.tabs).split(',').map(function(x){ return x.trim(); }).filter(Boolean);
  if (!tabs.length) return { ok:false, error:'Thiếu tabs' };
  var fy = S(p.fy), pic = S(p.pic);
  return cachedFor_('MULTI|' + tabs.join(',') + '|' + fy + '|' + pic, tabs, function(){
    var out = { ok:true, tabs:{} };
    var NO_FY = { cbc:1, npp:1 };
    var lean = (S(p.lean) === '1' || p.lean === 1 || p.lean === true) ? 1 : '';
    tabs.forEach(function(t){
      if (!COL[t]) return;
      out.tabs[t] = listRows({ tab:t, fy: NO_FY[t] ? '' : fy, pic: NO_FY[t] ? '' : pic, limit: t === 'cbc' ? 15000 : 5000, lean:lean });
    });
    out.ver = dataVersion();
    return out;
  });
}

/* ══════════════════════ MENU TIỆN ÍCH TRONG GOOGLE SHEET ══════════════════════ */
function onOpen(){
  try {
    SpreadsheetApp.getUi()
      .createMenu('MMH CRM')
      .addItem('① Tạo cột "Log tạo mới" cho tab 2. CBC', 'menuSetupCbcLog')
      .addItem('①b Tạo cột dấu thời gian cho tab 8. ADP', 'menuSetupAdpStamp')
      .addSeparator()
      .addItem('② Đổi tên ảnh cũ về đúng quy tắc', 'renamePhotosToStandard')
      .addItem('③ Lưu trữ ảnh của một FY vào folder riêng', 'menuArchivePhotos')
      .addSeparator()
      .addItem('④ Kiểm tra cấu hình hệ thống', 'menuHealthCheck')
      .addItem('⑤ Làm mới bộ nhớ đệm (khi sửa tay trên sheet)', 'menuBumpCache')
      .addSeparator()
      .addItem('⑥ Bật tự làm mới khi sheet thay đổi', 'installAutoRefresh')
      .addItem('⑦ Dọn ô Task Result lỗi của các dòng TBD', 'clearTbdFormulas')
      .addSeparator()
      .addItem('⑧ Kiểm tra tab "12. PRODUCT CODE"', 'menuCheckProductCode')
      .addItem('⑨ Gộp các dòng TBD thừa (mỗi tuần giữ 1 dòng)', 'menuDedupTbd')
      .addItem('⑩ Sửa FY / Month theo ngày (đơn hàng, thuyết trình, đi địa bàn)', 'menuFixFyByDate')
      .addSeparator()
      .addItem('⑪ Tạo lại tab KPI theo file KPI FY68', 'setupKpiFY68')
      .addItem('⑫ Đồng bộ với file KPI tổng ngay (và đăng ký file này)', 'syncKpiFY68')
      .addSeparator()
      .addItem('⑬ Sửa các ô công thức bị #ERROR! (Customer · CBC · Sale order)', 'repairFormulas')
      .addSeparator()
      .addItem('⑭ Mở mới & SKU mới: tạo sheet + cấp quyền Drive / Gmail', 'naSetup')
      .addItem('⑮ Ghi đè tháng đã chốt của C1 · C5 · C6 · C7 theo rule mới', 'k68FixLockedV10')
      .addToUi();
  } catch(e){}
}

/* CÔNG THỨC KHÔNG CÒN #ERROR!: ô công thức của dòng mới được CHÉP từ một dòng lành gần nhất */
function fmlBadTxt_(d){ return /^#(ERROR|NAME|REF)/i.test(String(d || '')); }
function fmlHealthy_(s, col, row, first){
  var lo = Math.max(first, row - 60), n = row - lo;
  if (n > 0){
    var F = s.getRange(lo, col, n, 1).getFormulas(), D = s.getRange(lo, col, n, 1).getDisplayValues();
    for (var i = n - 1; i >= 0; i--) if (F[i][0] && !fmlBadTxt_(D[i][0])) return lo + i;
  }
  var last = s.getLastRow();
  if (last > row){
    var m = Math.min(60, last - row), F2 = s.getRange(row + 1, col, m, 1).getFormulas(), D2 = s.getRange(row + 1, col, m, 1).getDisplayValues();
    for (var j = 0; j < m; j++) if (F2[j][0] && !fmlBadTxt_(D2[j][0])) return row + 1 + j;
  }
  return 0;
}
function ensureFormulas_(s, row, lock, map, nRows){
  nRows = nRows || 1;
  for (var f in lock){
    var c = map[f]; if (!c) continue;
    for (var r = row; r < row + nRows; r++){
      var cl = s.getRange(r, c);
      if (cl.getFormula() && !fmlBadTxt_(cl.getDisplayValue())) continue;
      var src = fmlHealthy_(s, c, r, DATA_ROW);
      if (src) s.getRange(src, c).copyTo(cl, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
  }
}
/* menu ⑬ — dò toàn bộ tab có công thức, ô nào #ERROR! thì chép lại công thức lành */
function repairFormulas(){
  var fixed = 0, out = [];
  ['customer','cbc','order'].forEach(function(tab){
    var s; try { s = sh(tab); } catch(e){ return; }
    var map = COL[tab] || {}, lock = FORMULA_FIELDS[tab] || {}, last = s.getLastRow();
    if (last < DATA_ROW) return;
    for (var f in lock){
      var c = map[f]; if (!c) continue;
      var D = s.getRange(DATA_ROW, c, last - DATA_ROW + 1, 1).getDisplayValues(), n = 0;
      for (var i = 0; i < D.length; i++) if (fmlBadTxt_(D[i][0])){
        var r = DATA_ROW + i, src = fmlHealthy_(s, c, r, DATA_ROW);
        if (src){ s.getRange(src, c).copyTo(s.getRange(r, c), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false); n++; }
      }
      if (n){ fixed += n; out.push(TABS[tab] + ' · cột ' + c + ': ' + n + ' ô'); }
    }
  });
  bumpVersion(['customer','cbc','order']);
  try { SpreadsheetApp.getUi().alert(fixed ? ('Đã sửa ' + fixed + ' ô công thức lỗi:\n' + out.join('\n')) : 'Không có ô công thức nào bị lỗi.'); } catch(e){}
  return { ok:true, fixed:fixed, detail:out };
}

function menuSetupCbcLog(){
  var ui = SpreadsheetApp.getUi();
  try {
    ensureCbcLogHeader_(sh('cbc'));
    SpreadsheetApp.flush();
    ui.alert('Đã tạo cột "Log tạo mới" (cột S) ở tab "' + TABS.cbc + '".\n\n' +
             'Từ giờ mỗi CBC được thêm qua app sẽ tự ghi: thời điểm tạo, người tạo và nguồn dữ liệu.');
  } catch(e){ ui.alert('Lỗi: ' + e.message); }
}
function menuSetupAdpStamp(){
  var ui = SpreadsheetApp.getUi();
  try {
    ensureAdpStampHeader_(sh('adp'));
    SpreadsheetApp.flush();
    ui.alert('Đã tạo 2 cột ở tab "' + TABS.adp + '":\n\n' +
             '  AE — Ngày tạo\n  AF — Cập nhật lần cuối\n\n' +
             'Từ giờ mỗi ADP thêm/sửa qua app sẽ tự ghi mốc thời gian.\n' +
             'Các ADP cũ chưa có ngày tạo sẽ được ghi vào lần sửa kế tiếp.');
  } catch(e){ ui.alert('Lỗi: ' + e.message); }
}
function menuArchivePhotos(){
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Lưu trữ ảnh đi địa bàn',
    'Nhập FY cần dồn ảnh sang folder lưu trữ (ví dụ: FY67).\n\n' +
    'Ảnh sẽ được chuyển vào folder con "' + ARCHIVE_PREFIX + '<FY>" trong folder ảnh hiện tại.\n' +
    'Link ảnh trong sheet KHÔNG thay đổi, vẫn mở được bình thường.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var fy = String(r.getResponseText() || '').trim();
  if (!fy) return ui.alert('Chưa nhập FY.');
  try {
    var out = archivePhotosByFY(fy);
    ui.alert(out.message + '\n\nFolder lưu trữ:\n' + out.url);
  } catch(e){ ui.alert('Lỗi: ' + e.message); }
}
/* kiểm tra tab danh mục mã sản phẩm đã dán đúng chưa */
function menuCheckProductCode(){
  var ui = SpreadsheetApp.getUi(), L = [];
  var r = productCodes({});
  if (r.missing){
    ui.alert('Chưa có tab "' + TABS.pcode + '".\n\n' +
      'Cách làm:\n' +
      '  1. Tạo tab mới, đặt tên đúng: ' + TABS.pcode + '\n' +
      '  2. Mở file PRODUCT_CODE.xlsx, chọn toàn bộ, dán vào ô A1 của tab vừa tạo\n' +
      '  3. Hàng 1 phải là tiêu đề: No. · Product name (Vietnamese) · Type · Description ·\n' +
      '     Length · Unit · Product code · Detail · Unit · Packing\n' +
      '  4. Chạy lại mục ⑧ này để kiểm tra.');
    return;
  }
  if (!r.ok){ ui.alert('Lỗi: ' + r.error); return; }
  L.push('✓ Đọc được ' + r.total + ' mã Detail, ' + r.groups.length + ' nhóm sản phẩm.');
  L.push('');
  L.push('── 12 NHÓM ĐẦU TIÊN ──');
  r.groups.slice(0, 12).forEach(function(g){ L.push('  · ' + g[0] + ' — ' + g[1].length + ' mã'); });
  if (r.groups.length > 12) L.push('  … và ' + (r.groups.length - 12) + ' nhóm nữa');
  L.push('');
  L.push('Danh mục này hiện ngay trong ô "Detail" của dialog đơn hàng trên web app.');
  ui.alert(L.join('\n'));
}
/* dọn các dòng TBD thừa: mỗi (PIC, tuần) chỉ giữ MỘT dòng có Plan dài nhất */
function menuDedupTbd(){
  var ui = SpreadsheetApp.getUi();
  var s = sh('weekly'), last = s.getLastRow();
  if (last < DATA_ROW) return ui.alert('Tab 6. WEEKLY REPORT chưa có dữ liệu.');
  var n = last - DATA_ROW + 1;
  var accs  = s.getRange(DATA_ROW, COL.weekly.account, n, 1).getValues();
  var pics  = s.getRange(DATA_ROW, COL.weekly.pic,     n, 1).getValues();
  var stars = s.getRange(DATA_ROW, COL.weekly.start,   n, 1).getValues();
  var plans = s.getRange(DATA_ROW, COL.weekly.plan,    n, 1).getValues();
  var best = {}, kill = [];
  for (var i = 0; i < n; i++){
    if (!isTbdAcc_(accs[i][0])) continue;
    var d = d2s(stars[i][0]); if (!d) continue;
    var k = S(pics[i][0]).toLowerCase() + '|' + mondayOfIso_(d);
    var len = S(plans[i][0]).length, row = DATA_ROW + i;
    if (!best[k]){ best[k] = { row:row, len:len }; continue; }
    if (len > best[k].len){ kill.push(best[k].row); best[k] = { row:row, len:len }; }
    else kill.push(row);
  }
  if (!kill.length) return ui.alert('Không có dòng TBD nào bị trùng tuần. Mọi thứ đang đúng.');
  if (ui.alert('Tìm thấy ' + kill.length + ' dòng TBD trùng tuần (cùng PIC, cùng tuần).\n\n' +
      'Xoá các dòng thừa, mỗi tuần giữ lại một dòng có Plan đầy đủ nhất?',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  kill.sort(function(a, b){ return b - a; });
  kill.forEach(function(r){ try { s.deleteRow(r); } catch(e){} });
  SpreadsheetApp.flush();
  bumpVersion(['weekly']);
  ui.alert('Đã xoá ' + kill.length + ' dòng TBD thừa.');
}
function menuBumpCache(){
  var v = bumpVersion();
  SpreadsheetApp.getUi().alert('Đã làm mới bộ nhớ đệm.\n\n' +
    'Mở lại web app (hoặc bấm ⟳) là thấy dữ liệu mới nhất.\nMã phiên bản: ' + v);
}
function menuHealthCheck(){
  var L = [];
  L.push('APP: ' + appName_() + '  ·  nhóm: ' + TEAM() + '  ·  backend v9.3');
  L.push('');
  L.push('── TAB DỮ LIỆU ──');
  for (var k in TABS){
    var s = null; try { s = ss().getSheetByName(TABS[k]); } catch(e){}
    L.push((s ? '✓ ' : '✗ ') + TABS[k] + (s ? ('  — ' + Math.max(0, s.getLastRow() - DATA_ROW + 1) + ' dòng') : '  — KHÔNG TÌM THẤY'));
  }
  L.push('');
  L.push('── FOLDER ẢNH ──');
  try {
    var f = DriveApp.getFolderById(photoFolderId_());
    L.push('✓ ' + f.getName());
    L.push('   ' + f.getUrl());
    var sub = f.getFolders(), arch = [];
    while (sub.hasNext()){ var x = sub.next(); if (x.getName().indexOf(ARCHIVE_PREFIX) === 0) arch.push(x.getName()); }
    L.push('   Folder lưu trữ: ' + (arch.length ? arch.join(', ') : 'chưa có'));
  } catch(e){ L.push('✗ Không mở được folder ID ' + photoFolderId_() + ' — ' + e.message); }
  L.push('');
  L.push('── CỘT LOG CBC ──');
  try {
    var h = S(sh('cbc').getRange(HEADER_ROW, COL.cbc.log).getValue());
    L.push(h ? ('✓ Cột S = "' + h + '"') : '✗ Chưa có tiêu đề — chạy mục ① trong menu');
  } catch(e){ L.push('✗ ' + e.message); }
  L.push('');
  L.push('── QUY TẮC TÊN ẢNH ──');
  L.push('<PIC>_<YYYYMMDD>_<Tên khách hàng>_<STT trong tháng>.jpg');
  L.push('Ví dụ: ' + photoName_('Viet', todayISO(), 'Nha khoa Alpha', 7));
  SpreadsheetApp.getUi().alert(L.join('\n'));
}

/* ══════════════════════ TỰ LÀM MỚI KHI SHEET BỊ SỬA TAY ══════════════════════
   ⚠️ Chạy MỘT LẦN hàm installAutoRefresh (hoặc menu MMH CRM ▸ ⑥) sau khi dán file. */
function mmhOnChange_(e){
  try {
    var name = '';
    try { name = e && e.source ? e.source.getActiveSheet().getName() : ''; } catch(x){}
    var key = '';
    for (var k in TABS) if (TABS[k] === name) key = k;
    if (key && e && e.changeType === 'EDIT') bumpVersion(bumpTabsFor_(key));
    else bumpVersion();
    if (!key || /^(order|weekly|present|customer)$/.test(key)) { try { k68PushQuick_(); } catch(x){} }   /* ⭐ v10.6 — sửa tay ⇒ tính lại + đẩy KPI */
    try { CacheService.getScriptCache().remove('SHEETWATCH_AT'); } catch(x){}
  } catch(err){}
}

/* LƯỚI AN TOÀN KHI CHƯA BẬT TRIGGER onChange: tối đa 1 lần / 60 giây đếm số dòng các tab hay gõ tay */
var WATCH_TABS = ['order', 'weekly', 'cbc', 'customer', 'present'];
function sheetWatch_(){
  var c;
  try { c = CacheService.getScriptCache(); if (c.get('SHEETWATCH_AT')) return; c.put('SHEETWATCH_AT', '1', 60); }
  catch(e){ return; }
  var props = props_(), old = {};
  try { old = JSON.parse(props.getProperty('SHEET_FP') || '{}') || {}; } catch(e){ old = {}; }
  var now = {}, changed = [];
  WATCH_TABS.forEach(function(k){
    try {
      var s = sh(k), fp = s.getLastRow() + ':' + countRows(k);
      now[k] = fp;
      if (old[k] && old[k] !== fp) changed.push(k);
    } catch(e){}
  });
  try { props.setProperty('SHEET_FP', JSON.stringify(now)); } catch(e){}
  if (changed.length){
    var tabs = [];
    changed.forEach(function(k){ bumpTabsFor_(k).forEach(function(t){ if (tabs.indexOf(t) < 0) tabs.push(t); }); });
    bumpVersion(tabs);
    try { k68PushQuick_(); } catch(e){}                                  /* ⭐ v10.6 — gõ tay trên sheet ⇒ tính lại + đẩy KPI */
  }
}

/* SỬA FY / MONTH THEO NGÀY cho các dòng đã ghi sai trên sheet (menu ⑩) */
function menuFixFyByDate(){
  var rep = [];
  [['order','day'], ['present','day'], ['weekly','start']].forEach(function(x){
    var key = x[0], dateF = x[1], m = COL[key], s = sh(key);
    var vals = rawValues(key), nFix = 0;
    var fyCol = [], moCol = [];
    for (var i = 0; i < vals.length; i++){
      var r = vals[i], d = cell(r[m[dateF] - 1]);
      var fy = r[m.fy - 1], mo = m.month ? r[m.month - 1] : null;
      var iso = d2s(d), nf = fyOfIso_(iso), nm = ymOfIso_(iso);
      var fyNew = fy, moNew = mo;
      if (nf && S(fy) !== nf){ fyNew = nf; nFix++; }
      if (m.month && nm && S(mo) !== nm) moNew = nm;
      fyCol.push([fyNew]); if (m.month) moCol.push([moNew]);
    }
    if (vals.length && nFix >= 0){
      var fyR = s.getRange(DATA_ROW, m.fy, vals.length, 1);
      if (nFix && !hasFormula_(fyR)) fyR.setValues(fyCol);
      if (m.month){
        var moR = s.getRange(DATA_ROW, m.month, vals.length, 1);
        if (!hasFormula_(moR)) moR.setValues(moCol);
      }
    }
    rep.push(TABS[key] + ': sửa FY ' + nFix + ' dòng');
  });
  bumpVersion();
  var msg = 'Đã rà FY / Month theo ngày:\n\n' + rep.join('\n');
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return msg;
}
function hasFormula_(rg){
  var f = rg.getFormulas();
  for (var i = 0; i < f.length; i++) if (f[i][0]) return true;
  return false;
}
function installAutoRefresh(){
  var ssx = ss(), n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'mmhOnChange_'){ ScriptApp.deleteTrigger(t); n++; }
  });
  ScriptApp.newTrigger('mmhOnChange_').forSpreadsheet(ssx).onChange().create();
  var msg = 'Đã bật tự làm mới khi sheet thay đổi' + (n ? (' (gỡ ' + n + ' trigger cũ)') : '') +
            '\n\nTừ giờ mọi thao tác thêm / xoá / sửa trực tiếp trên Google Sheet sẽ hiện trên app trong ~45 giây.';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return msg;
}
function uninstallAutoRefresh(){
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'mmhOnChange_'){ ScriptApp.deleteTrigger(t); n++; }
  });
  try { SpreadsheetApp.getUi().alert('Đã gỡ ' + n + ' trigger tự làm mới.'); } catch(e){}
  return n;
}

/* ══════════════════════ ACCOUNT "TBD" (chưa xác định) ══════════════════════ */
var TBD_NAME  = 'TBD';
var TBD_TYPES = [
  ['Clinic','phòng khám'], ['Hospital','bệnh viện'], ['University','trường đại học'],
  ['Dealer','đại lý'],     ['Distributor','nhà phân phối']
];
function isTbdAcc_(accountStr){ return /^TBD$/i.test(parseCheckName(accountStr).name || ''); }
/* Type task mặc định cho dòng TBD: giá trị "Sale-…" đầu tiên trong MASTER LIST */
function defaultTypeTask_(){
  var l = (readMaster().typeTask) || [];
  for (var i = 0; i < l.length; i++) if (/^\s*sales?\s*[-–—]/i.test(String(l[i]))) return l[i];
  return l[0] || '';
}
/* SỐ DÒNG của dòng TBD đã có trong tuần chứa startIso của PIC đó (0 nếu chưa có) */
function tbdRowOfWeek_(pic, startIso, skipRow){
  try {
    var from = mondayOfIso_(S(startIso));
    if (!from) return 0;
    var to = addDaysISO(from, 6);
    var accs   = colValues('weekly', COL.weekly.account);
    var pics   = colValues('weekly', COL.weekly.pic);
    var starts = colValues('weekly', COL.weekly.start);
    var key = S(pic).toLowerCase();
    for (var i = 0; i < accs.length; i++){
      var r = DATA_ROW + i;
      if (skipRow && r === skipRow) continue;
      if (!isTbdAcc_(accs[i])) continue;
      if (key && S(pics[i]).toLowerCase() !== key) continue;
      var d = d2s(starts[i]);
      if (!d || d < from || d > to) continue;
      return r;
    }
  } catch(e){}
  return 0;
}
/* nhãn hiển thị trên email & PDF — không bao giờ hiện chữ "TBD" cho người nhận */
function accLabel_(accountStr){
  var pc = parseCheckName(accountStr);
  return isTbdAcc_(accountStr) ? 'Đi địa bàn' : (pc.name || String(accountStr || ''));
}
function mondayOfIso_(iso){
  var d = s2d(iso);
  if (!(d instanceof Date)) return iso;
  var w = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - w);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function colA1_(n){ var s = ''; while (n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }
function dateFn_(iso){
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? ('DATE(' + (+m[1]) + ',' + (+m[2]) + ',' + (+m[3]) + ')') : '';
}
/* Dọn các ô Task Result của dòng TBD đang là công thức hoặc #ERROR! về rỗng (menu ⑦) */
function clearTbdFormulas(){
  var sh_ = sh('weekly'), last = sh_.getLastRow();
  if (last < DATA_ROW) return 'Sheet chưa có dữ liệu.';
  var n = last - DATA_ROW + 1;
  var accs = sh_.getRange(DATA_ROW, COL.weekly.account, n, 1).getValues();
  var rng  = sh_.getRange(DATA_ROW, COL.weekly.result,  n, 1);
  var fs_  = rng.getFormulas(), vs = rng.getValues(), done = 0;
  for (var i = 0; i < n; i++){
    if (!isTbdAcc_(accs[i][0])) continue;
    var isErr = /^#[A-Z!\/]+/.test(String(vs[i][0] || ''));
    if (!fs_[i][0] && !isErr) continue;
    sh_.getRange(DATA_ROW + i, COL.weekly.result).setValue('');
    done++;
  }
  bumpVersion(['weekly']);
  var msg = 'Đã dọn ' + done + ' ô Task Result lỗi của dòng TBD.\n\n' +
            'Mở web app, vào tab Đi địa bàn hoặc bấm gửi báo cáo tuần — app sẽ tự điền lại nội dung.';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return msg;
}


/* ════════════════════════════════════════════════════════════════════════════════════════════
   MODULE HỌP TUẦN — dùng cho Dental · Surgical · Eyeless (mỗi file có sheet 13 / 14 / 15 riêng)
   Router handle() chuyển mọi action "mt" + chữ hoa sang mtRoute_(). Header ở HÀNG 1.
   ════════════════════════════════════════════════════════════════════════════════════════════ */
var MT_CFG = {
  SH_MEET   : "13. WEEKLY MEETING",
  SH_TENDER : "14. TENDER TRACK",
  SH_PRICE  : "15. TENDER PRICE LOG",
  MAIL_RE   : /^[^@\s]+@manimedicalhanoi\.com$/i,
  MAIL_NAME : "",                          /* để trống ⇒ "MMH CRM · <tên nhóm>" theo file */
  CELL_MAX  : 49000
};

var MT_MEET_HDR = [
  "Meeting ID","Week start","Tuần","FY","Sales PIC",
  "Số lượt tuần này","Đã hoàn thành","Số lượt tuần sau","Ghi chú địa bàn",
  "NPP","Tháng NPP","A/F tháng (USD)","Budget tháng (USD)","% tháng","% FY lũy kế",
  "Theo forecast","Rủi ro","✅ Positive factors","❌ Negative factors","➡️ Follow up action",
  "Số gói thầu","DS thầu còn lại FY (VND)","Ghi chú thầu","Thông tin khác",
  "Account mới có đơn","New SKU","Buổi GTSP","Account mới","CBC mới","Chuyến công tác","Tóm tắt PT thị trường",
  "PDF (Drive)",
  "Số đơn hàng tuần","Giá trị đơn hàng tuần (VND)",
  "Created by","Created at","Updated by","Updated at","Emailed at","Emailed to",
  "Data (JSON)","Snapshot (JSON)",
  "Tóm tắt NPP"
];
var MT_MEET_TEXT = ["Meeting ID","Week start","Tuần","FY","Tháng NPP","Created at","Updated at","Emailed at"];

var MT_TENDER_HDR = [
  "Tender ID","Sales PIC","Bệnh viện","Account","Product group","Product detail",
  "Số lượng","Đơn vị","Đơn giá (VND)","Giá trị (VND)","Trạng thái","Kết quả",
  "Tháng KQTT","Hiệu lực (tháng)","NPP","Ghi chú",
  "Created by","Created at","Updated by","Updated at","Deleted",
  "Tỉnh","Miền","Items (JSON)"
];
var MT_TENDER_TEXT = ["Tender ID","Tháng KQTT","Created at","Updated at"];

var MT_TENDER_MAP = {
  id:"Tender ID", pic:"Sales PIC", hosp:"Bệnh viện", account:"Account", prod:"Product group",
  detail:"Product detail", qty:"Số lượng", unit:"Đơn vị", price:"Đơn giá (VND)", value:"Giá trị (VND)",
  status:"Trạng thái", won:"Kết quả", kqtt:"Tháng KQTT", valid:"Hiệu lực (tháng)", npp:"NPP", note:"Ghi chú",
  createdBy:"Created by", createdAt:"Created at", updatedBy:"Updated by", updatedAt:"Updated at",
  prov:"Tỉnh", area:"Miền", items:"Items (JSON)"
};

function mtHandle_(e, isPost) {
  var p = (e && e.parameter) || {}, body = null;
  if (isPost && e && e.postData && e.postData.contents) { try { body = JSON.parse(e.postData.contents); } catch (x) {} }
  var action = String((body && body.action) || p.action || "");
  if (!/^mt[A-Z]/.test(action)) return null;
  var q = {}; Object.keys(p).forEach(function (k) { q[k] = p[k]; });
  if (body) Object.keys(body).forEach(function (k) { q[k] = body[k]; });
  var out; try { out = mtRoute_(action, q); } catch (err) { out = { ok: false, error: String((err && err.message) || err) }; }
  return reply(out, String(p.callback || ""));
}

function mtRoute_(a, q) {
  switch (a) {
    case "mtList":         return mtList_();
    case "mtGet":          return mtGet_(String(q.id || ""));
    case "mtSave":         return mtLocked_(function () { return mtSave_(q); });
    case "mtTenders":      return mtTenders_();
    case "mtTenderSave":   return mtLocked_(function () { return mtTenderSave_(q); });
    case "mtTenderDelete": return mtLocked_(function () { return mtTenderDelete_(q); });
    case "mtPrices":       return mtPrices_();
    case "mtPriceSave":    return mtLocked_(function () { return mtPriceSave_(q); });
    case "mtPriceDelete":  return mtLocked_(function () { return mtPriceDelete_(q); });
    case "mtMail":         return mtMail_(q);
    case "mtPdf":          return mtPdf_(q);
    default:               return { ok: false, error: "Unknown action: " + a };
  }
}

/* chạy tay 1 lần: cấp quyền + tạo sheet */
function mtSetup() {
  mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  mtSheet_(MT_CFG.SH_PRICE, MT_PRICE_HDR, MT_PRICE_TEXT);
  Logger.log("Đã tạo sheet. Quota email còn lại hôm nay: " + MailApp.getRemainingDailyQuota());
}

function mtLocked_(fn) {
  var lk = LockService.getScriptLock();
  if (!lk.tryLock(20000)) return { ok: false, error: "Hệ thống đang bận ghi dữ liệu, thử lại sau vài giây." };
  try { var r = fn(); SpreadsheetApp.flush(); return r; }
  finally { lk.releaseLock(); }
}
function mtSS_() {
  var f = ss();
  if (!f) throw new Error("Không mở được file Google Sheet — điền SHEET_ID ở đầu file Code.gs.");
  return f;
}
function mtSheet_(name, hdr, textCols) {
  var sp = mtSS_(), sht = sp.getSheetByName(name);
  if (!sht) {
    sht = sp.insertSheet(name);
    sht.getRange(1, 1, 1, hdr.length).setValues([hdr])
      .setFontWeight("bold").setBackground("#CFE2F3").setFontColor("#003047").setWrap(true);
    sht.setFrozenRows(1);
    (textCols || []).forEach(function (h) {
      var c = hdr.indexOf(h) + 1;
      if (c > 0) sht.getRange(2, c, sht.getMaxRows() - 1, 1).setNumberFormat("@");
    });
    return sht;
  }
  var lastC = Math.max(1, sht.getLastColumn());
  var cur = sht.getRange(1, 1, 1, lastC).getValues()[0].map(function (h) { return String(h || "").trim(); });
  var add = hdr.filter(function (h) { return cur.indexOf(h) < 0; });
  if (add.length) sht.getRange(1, cur.length + 1, 1, add.length).setValues([add])
    .setFontWeight("bold").setBackground("#CFE2F3").setFontColor("#003047");
  return sht;
}
function mtHdr_(sht) {
  var h = sht.getRange(1, 1, 1, Math.max(1, sht.getLastColumn())).getValues()[0];
  var m = {}; h.forEach(function (x, i) { x = String(x || "").trim(); if (x && !(x in m)) m[x] = i; });
  return { list: h, map: m, n: h.length };
}
function mtTz_() { return Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh"; }
function mtNow_() { return Utilities.formatDate(new Date(), mtTz_(), "yyyy-MM-dd HH:mm"); }
function mtStr_(v, fmt) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Utilities.formatDate(v, mtTz_(), fmt || "yyyy-MM-dd");
  return String(v);
}
function mtJ_(v) {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch (e) { return v; }
}
function mtFindRow_(sht, id) {
  var last = sht.getLastRow();
  if (last < 2 || !id) return 0;
  var f = sht.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
function mtReadAll_(sht) {
  var last = sht.getLastRow(), H = mtHdr_(sht);
  if (last < 2) return [];
  var vals = sht.getRange(2, 1, last - 1, H.n).getValues();
  return vals.map(function (r, i) {
    var o = { _r: i + 2 };
    H.list.forEach(function (h, j) { h = String(h || "").trim(); if (h) o[h] = r[j]; });
    return o;
  }).filter(function (o) { return String(o[H.list[0]] || "").trim(); });
}
function mtWriteRow_(sht, id, obj) {
  var H = mtHdr_(sht), r = mtFindRow_(sht, id), isNew = !r;
  if (isNew) r = sht.getLastRow() + 1;
  var cur = isNew ? new Array(H.n).fill("") : sht.getRange(r, 1, 1, H.n).getValues()[0];
  Object.keys(obj).forEach(function (h) {
    if (h in H.map) cur[H.map[h]] = (obj[h] === undefined || obj[h] === null) ? "" : obj[h];
  });
  sht.getRange(r, 1, 1, H.n).setValues([cur]);
  return { row: r, isNew: isNew };
}
function mtCell_(s) {
  s = String(s == null ? "" : s);
  return s.length > MT_CFG.CELL_MAX ? s.slice(0, MT_CFG.CELL_MAX) : s;
}

/* ───────── BIÊN BẢN HỌP ───────── */
function mtCacheKey_() {
  var v = "0";
  try { v = PropertiesService.getScriptProperties().getProperty("mt_ver") || "0"; } catch (e) {}
  return "mt_list_" + v;
}
function mtBump_() {
  try { PropertiesService.getScriptProperties().setProperty("mt_ver", String(Date.now())); } catch (e) {}
}
function mtPctStr_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return Math.round(v * 100) + "%";
  return String(v).replace(/^'/, "");
}
function mtList_() {
  var ck = mtCacheKey_(), cache = CacheService.getScriptCache();
  try { var hit = cache.get(ck); if (hit) { var j = JSON.parse(hit); j.cached = true; return j; } } catch (e) {}
  var sht = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  var H = mtHdr_(sht), last = sht.getLastRow(), rows = [];
  var jA = ("Data (JSON)" in H.map) ? H.map["Data (JSON)"] : -1, jB = ("Snapshot (JSON)" in H.map) ? H.map["Snapshot (JSON)"] : -1;
  var skip = {}; if (jA >= 0) skip[jA] = 1; if (jB >= 0) skip[jB] = 1;
  var segs = [], a = 0;
  for (var c = 0; c <= H.n; c++) {
    if (c === H.n || skip[c]) { if (c > a) segs.push([a, c - a]); a = c + 1; }
  }
  if (last >= 2) {
    var parts = segs.map(function (g) { return { from: g[0], v: sht.getRange(2, g[0] + 1, last - 1, g[1]).getValues() }; });
    for (var i = 0; i < last - 1; i++) {
      var o = {};
      parts.forEach(function (pt) { pt.v[i].forEach(function (x, k) { var h = String(H.list[pt.from + k] || "").trim(); if (h) o[h] = x; }); });
      if (String(o["Meeting ID"] || "").trim()) rows.push(o);
    }
  }
  var list = rows.map(function (o) {
    return {
      id: String(o["Meeting ID"]), week: mtStr_(o["Week start"]), wlabel: mtStr_(o["Tuần"]),
      fy: mtStr_(o["FY"]), pic: mtStr_(o["Sales PIC"]),
      nCur: Number(o["Số lượt tuần này"]) || 0, nDone: Number(o["Đã hoàn thành"]) || 0,
      nNxt: Number(o["Số lượt tuần sau"]) || 0,
      npp: mtStr_(o["NPP"]), nppMonth: mtStr_(o["Tháng NPP"]),
      pm: mtPctStr_(o["% tháng"]), pf: mtPctStr_(o["% FY lũy kế"]),
      nTender: Number(o["Số gói thầu"]) || 0, tRemain: Number(o["DS thầu còn lại FY (VND)"]) || 0,
      crm: mtStr_(o["Tóm tắt PT thị trường"]), pdf: mtStr_(o["PDF (Drive)"]),
      createdBy: mtStr_(o["Created by"]), createdAt: mtStr_(o["Created at"], "yyyy-MM-dd HH:mm"),
      updatedBy: mtStr_(o["Updated by"]), updatedAt: mtStr_(o["Updated at"], "yyyy-MM-dd HH:mm"),
      emailedAt: mtStr_(o["Emailed at"], "yyyy-MM-dd HH:mm"), emailedTo: mtStr_(o["Emailed to"])
    };
  });
  list.sort(function (a, b) { return a.week < b.week ? 1 : a.week > b.week ? -1 : (a.pic < b.pic ? -1 : 1); });
  var out = { ok: true, list: list, t: Date.now() };
  try { cache.put(ck, JSON.stringify(out), 120); } catch (e) {}
  return out;
}

function mtGet_(id) {
  if (!id) return { ok: false, error: "Thiếu Meeting ID" };
  var sht = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  var r = mtFindRow_(sht, id);
  if (!r) return { ok: false, error: "Không tìm thấy biên bản " + id };
  var H = mtHdr_(sht), v = sht.getRange(r, 1, 1, H.n).getValues()[0];
  var g = function (h) { return (h in H.map) ? v[H.map[h]] : ""; };
  var data = mtJ_(String(g("Data (JSON)") || "{}")), snap = mtJ_(String(g("Snapshot (JSON)") || "{}"));
  return { ok: true, rec: {
    id: id, week: mtStr_(g("Week start")), wlabel: mtStr_(g("Tuần")), fy: mtStr_(g("FY")), pic: mtStr_(g("Sales PIC")),
    data: (data && typeof data === "object") ? data : {},
    snap: (snap && typeof snap === "object") ? snap : {},
    createdBy: mtStr_(g("Created by")), createdAt: mtStr_(g("Created at"), "yyyy-MM-dd HH:mm"),
    updatedBy: mtStr_(g("Updated by")), updatedAt: mtStr_(g("Updated at"), "yyyy-MM-dd HH:mm"),
    emailedAt: mtStr_(g("Emailed at"), "yyyy-MM-dd HH:mm"), emailedTo: mtStr_(g("Emailed to"))
  } };
}

function mtSave_(q) {
  var id = String(q.id || "").trim();
  if (!/^MT-\d{8}-[A-Z0-9]+$/.test(id)) return { ok: false, error: "Meeting ID không hợp lệ: " + id };
  var sht = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  var row = mtJ_(q.row) || {}, by = String(q.by || q.pic || "").trim(), now = mtNow_();
  if (!by) return { ok: false, error: "Thiếu tên người lưu (by)" };
  var data = typeof q.data === "string" ? q.data : JSON.stringify(q.data || {});
  var snap = typeof q.snap === "string" ? q.snap : JSON.stringify(q.snap || {});
  if (snap.length > MT_CFG.CELL_MAX) return { ok: false, error: "Snapshot quá lớn (" + snap.length + " ký tự)" };
  if (data.length > MT_CFG.CELL_MAX) return { ok: false, error: "Nội dung biên bản quá dài (" + data.length + " ký tự)" };
  if (typeof row !== "object") row = {};
  var obj = {};
  MT_MEET_HDR.forEach(function (h) {
    if (h in row && ["Meeting ID", "Data (JSON)", "Snapshot (JSON)", "Created by", "Created at",
                     "Updated by", "Updated at", "Emailed at", "Emailed to"].indexOf(h) < 0)
      obj[h] = (typeof row[h] === "string") ? mtCell_(row[h]) : row[h];
  });
  ["% tháng", "% FY lũy kế"].forEach(function (h) {
    if (obj[h] !== undefined && obj[h] !== "" && String(obj[h]).charAt(0) !== "'") obj[h] = "'" + obj[h];
  });
  obj["Meeting ID"] = id;
  obj["Data (JSON)"] = data;
  obj["Snapshot (JSON)"] = snap;
  obj["Updated by"] = by;
  obj["Updated at"] = now;
  var exists = mtFindRow_(sht, id);
  if (!exists) { obj["Created by"] = by; obj["Created at"] = now; }
  var w = mtWriteRow_(sht, id, obj);
  mtBump_();
  logAct({ pic: by }, "mtSave", "13. WEEKLY MEETING", id, String(row["Sales PIC"] || "") + " · " + String(row["Tuần"] || ""), w.row);
  return { ok: true, id: id, row: w.row, isNew: w.isNew, updatedAt: now, updatedBy: by };
}

/* ───────── THẦU ───────── */
function mtTenderObj_(o) {
  var t = {};
  Object.keys(MT_TENDER_MAP).forEach(function (k) {
    var v = o[MT_TENDER_MAP[k]];
    t[k] = (k === "kqtt") ? mtStr_(v, "yyyy-MM")
         : (k === "createdAt" || k === "updatedAt") ? mtStr_(v, "yyyy-MM-dd HH:mm")
         : (v instanceof Date ? mtStr_(v) : v);
  });
  if (t.items) { var it = mtJ_(t.items); t.items = Array.isArray(it) ? it : []; } else t.items = [];
  return t;
}
function mtTenders_() {
  var sht = mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  var list = mtReadAll_(sht).filter(function (o) { return !String(o["Deleted"] || "").trim(); }).map(mtTenderObj_);
  return { ok: true, list: list, t: Date.now() };
}
function mtTenderSave_(q) {
  var t = mtJ_(q.tender) || {};
  var id = String(t.id || "").trim();
  if (!/^TD-[a-z0-9-]+$/i.test(id)) return { ok: false, error: "Tender ID không hợp lệ" };
  if (!String(t.hosp || "").trim()) return { ok: false, error: "Thiếu tên bệnh viện" };
  var sht = mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  var by = String(q.by || q.pic || "").trim(), now = mtNow_();
  var qty = Number(t.qty) || 0, price = Number(t.price) || 0;
  var items = (mtJ_(t.items) || []).filter(function (x) { return x && (String(x.code || "").trim() || Number(x.qty) > 0); })
    .map(function (x) { return { code: String(x.code || "").trim(), name: String(x.name || ""), qty: Number(x.qty) || 0, unit: String(x.unit || ""), price: Number(x.price) || 0 }; });
  var value = qty * price;
  if (items.length) {
    qty = 0; value = 0;
    items.forEach(function (x) { qty += x.qty; value += x.qty * x.price; });
    price = items.length === 1 ? items[0].price : "";
  }
  var obj = {
    "Tender ID": id, "Sales PIC": String(t.pic || ""), "Bệnh viện": String(t.hosp || ""),
    "Account": String(t.account || ""), "Product group": String(t.prod || ""),
    "Product detail": String(t.detail || ""), "Số lượng": qty, "Đơn vị": String(t.unit || ""),
    "Đơn giá (VND)": price, "Giá trị (VND)": value, "Trạng thái": String(t.status || ""),
    "Kết quả": String(t.won || ""), "Tháng KQTT": String(t.kqtt || ""),
    "Hiệu lực (tháng)": Number(t.valid) || "", "NPP": String(t.npp || ""), "Ghi chú": mtCell_(t.note || ""),
    "Updated by": by, "Updated at": now, "Deleted": "",
    "Tỉnh": String(t.prov || ""), "Miền": String(t.area || ""), "Items (JSON)": items.length ? mtCell_(JSON.stringify(items)) : ""
  };
  if (!mtFindRow_(sht, id)) { obj["Created by"] = by; obj["Created at"] = now; }
  mtWriteRow_(sht, id, obj);
  var r = mtFindRow_(sht, id), H = mtHdr_(sht), v = sht.getRange(r, 1, 1, H.n).getValues()[0], o = {};
  H.list.forEach(function (h, j) { h = String(h || "").trim(); if (h) o[h] = v[j]; });
  var prices = q.prices ? mtPriceAppend_(q.prices, by) : [];
  return { ok: true, tender: mtTenderObj_(o), prices: prices };
}
function mtTenderDelete_(q) {
  var id = String(q.id || "").trim();
  var sht = mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  if (!mtFindRow_(sht, id)) return { ok: false, error: "Không tìm thấy gói thầu " + id };
  mtWriteRow_(sht, id, { "Deleted": "x", "Updated by": String(q.by || q.pic || ""), "Updated at": mtNow_() });
  return { ok: true, id: id };
}

/* ════════════ BẢNG GIÁ THẦU (sheet "15. TENDER PRICE LOG") ════════════ */
var MT_PRICE_HDR = ["Price ID","Ngày áp dụng","Mã SP","Tên hàng","Product group","Phạm vi","Địa bàn",
  "Đơn vị","Đơn giá (VND)","Nguồn giá","Tham chiếu","Ghi chú","Created by","Created at","Deleted"];
var MT_PRICE_TEXT = ["Price ID","Ngày áp dụng","Mã SP","Created at"];
var MT_PRICE_MAP = { id:"Price ID", date:"Ngày áp dụng", code:"Mã SP", detail:"Tên hàng", prod:"Product group",
  scope:"Phạm vi", area:"Địa bàn", unit:"Đơn vị", price:"Đơn giá (VND)", src:"Nguồn giá", ref:"Tham chiếu", note:"Ghi chú",
  createdBy:"Created by", createdAt:"Created at" };
var MT_SCOPE_VI = { prov:"Tỉnh", area:"Miền", all:"Toàn quốc" }, MT_SCOPE_BACK = { "Tỉnh":"prov", "Miền":"area", "Toàn quốc":"all" };
function mtPriceSh_() { return mtSheet_(MT_CFG.SH_PRICE, MT_PRICE_HDR, MT_PRICE_TEXT); }
function mtPriceObj_(o) {
  var p = {};
  Object.keys(MT_PRICE_MAP).forEach(function (k) {
    var v = o[MT_PRICE_MAP[k]];
    p[k] = (k === "date") ? mtStr_(v, "yyyy-MM-dd") : (k === "createdAt") ? mtStr_(v, "yyyy-MM-dd HH:mm") : (v instanceof Date ? mtStr_(v) : v);
  });
  p.scope = MT_SCOPE_BACK[p.scope] || p.scope || "all";
  p.price = Number(p.price) || 0;
  return p;
}
function mtPrices_() {
  var list = mtReadAll_(mtPriceSh_()).filter(function (o) { return !String(o["Deleted"] || "").trim(); }).map(mtPriceObj_);
  return { ok: true, list: list, t: Date.now() };
}
function mtPriceAppend_(list, by) {
  list = (mtJ_(list) || []).filter(function (p) { return p && String(p.code || "").trim() && Number(p.price) > 0; });
  if (!list.length) return [];
  var sht = mtPriceSh_(), H = mtHdr_(sht), now = mtNow_(), rows = [], out = [];
  list.forEach(function (p) {
    var id = /^PR-[a-z0-9-]+$/i.test(String(p.id || "")) ? String(p.id) : ("PR-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6));
    var o = { "Price ID": id, "Ngày áp dụng": String(p.date || "").slice(0, 10), "Mã SP": String(p.code || "").trim(),
      "Tên hàng": String(p.detail || ""), "Product group": String(p.prod || ""), "Phạm vi": MT_SCOPE_VI[p.scope] || "Toàn quốc",
      "Địa bàn": p.scope === "all" ? "Toàn quốc" : String(p.area || ""), "Đơn vị": String(p.unit || ""), "Đơn giá (VND)": Number(p.price) || 0,
      "Nguồn giá": String(p.src || ""), "Tham chiếu": String(p.ref || ""), "Ghi chú": mtCell_(p.note || ""),
      "Created by": by, "Created at": now, "Deleted": "" };
    var r = new Array(H.n).fill("");
    Object.keys(o).forEach(function (h) { if (h in H.map) r[H.map[h]] = o[h]; });
    rows.push(r); out.push(mtPriceObj_(o));
  });
  sht.getRange(sht.getLastRow() + 1, 1, rows.length, H.n).setValues(rows);
  return out;
}
function mtPriceSave_(q) {
  var by = String(q.by || q.pic || "").trim();
  var out = mtPriceAppend_(q.prices || (q.price ? [mtJ_(q.price)] : []), by);
  if (!out.length) return { ok: false, error: "Thiếu mã sản phẩm hoặc đơn giá" };
  logAct({ pic: by }, "mtPriceSave", MT_CFG.SH_PRICE, out.map(function (p) { return p.id; }).join(","), out.length + " giá", 0);
  return { ok: true, list: out };
}
function mtPriceDelete_(q) {
  var id = String(q.id || "").trim(), sht = mtPriceSh_();
  if (!mtFindRow_(sht, id)) return { ok: false, error: "Không tìm thấy dòng giá " + id };
  mtWriteRow_(sht, id, { "Deleted": "x" });
  return { ok: true, id: id };
}

/* ───────── EMAIL ───────── */
function mtMail_(q) {
  var clean = function (arr) {
    arr = mtJ_(arr); if (typeof arr === "string") arr = arr.split(/[,;\s]+/);
    var out = [];
    (arr || []).forEach(function (x) { x = String(x || "").trim(); if (MT_CFG.MAIL_RE.test(x) && out.indexOf(x) < 0) out.push(x); });
    return out;
  };
  var to = clean(q.to), cc = clean(q.cc).filter(function (x) { return to.indexOf(x) < 0; });
  if (!to.length) return { ok: false, error: "Chưa có người nhận hợp lệ (chỉ nhận địa chỉ @manimedicalhanoi.com)" };
  var subject = String(q.subject || ("Cập nhật hoạt động " + reportTeamName_())).slice(0, 200);
  var html = String(q.html || "");
  if (!html) return { ok: false, error: "Email trống" };
  var pdf = null, attach = [];
  if (q.pdfHtml) {
    pdf = mtMakePdf_(q);
    if (pdf.blob) attach.push(pdf.blob);
  }
  html = html.replace("{{PDF_LINK}}", (pdf && pdf.url) ? (' · bản PDF: <a href="' + pdf.url + '">' + mtEsc_(pdf.name) + '</a>') : "");
  var opt = { to: to.join(","), subject: subject, htmlBody: html, name: MT_CFG.MAIL_NAME || ("MMH CRM · " + reportTeamName_()) };
  if (attach.length) opt.attachments = attach;
  if (cc.length) opt.cc = cc.join(",");
  var rp = String(q.replyTo || "").trim();
  if (MT_CFG.MAIL_RE.test(rp)) opt.replyTo = rp;
  mmhMail_(opt);

  var ids = mtJ_(q.ids) || [], now = mtNow_();
  if (typeof ids === "string") ids = ids.split(",");
  if (ids.length) {
    mtLocked_(function () {
      var sht = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
      ids.forEach(function (id) {
        id = String(id || "").trim();
        var st = { "Emailed at": now, "Emailed to": to.concat(cc).join(", ") };
        if (pdf && pdf.url) st["PDF (Drive)"] = pdf.url;
        if (id && mtFindRow_(sht, id)) mtWriteRow_(sht, id, st);
      });
      mtBump_();
      return true;
    });
  }
  var left = -1; try { left = MailApp.getRemainingDailyQuota(); } catch (e) {}
  return { ok: true, message: "Đã gửi email tới " + to.join(", ") + (cc.length ? " (cc " + cc.join(", ") + ")" : "") +
             (pdf ? (pdf.url ? " · PDF đã lưu vào Drive" : (" · ⚠️ " + (pdf.error || "chưa tạo được PDF"))) : ""),
           sentAt: now, quota: left, pdfUrl: pdf && pdf.url || "", pdfError: pdf && !pdf.url ? (pdf.error || "PDF lỗi") : "" };
}
function mtEsc_(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function mtMakePdf_(q) {
  var name = pdfSafeName_(q.pdfName, "MMH_" + teamLabel_() + "_HopTuan_" + String(q.week || "") + ".pdf");
  var blob;
  try {
    blob = HtmlService.createHtmlOutput(String(q.pdfHtml || "")).getBlob().getAs("application/pdf").setName(name);
  } catch (e) {
    return { error: "Không tạo được PDF: " + String((e && e.message) || e) };
  }
  var sv = savePdfToDrive_(blob);
  return { blob: blob, name: name, url: sv.ok ? sv.url : "", error: sv.ok ? "" : sv.error };
}
function mtPdf_(q) {
  if (!q.pdfHtml) return { ok: false, error: "Thiếu nội dung PDF" };
  var pdf = mtMakePdf_(q);
  if (!pdf.url) return { ok: false, error: pdf.error || "Chưa lưu được PDF" };
  var ids = mtJ_(q.ids) || [];
  if (typeof ids === "string") ids = ids.split(",");
  if (ids.length) mtLocked_(function () {
    var sht = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
    ids.forEach(function (id) { id = String(id || "").trim(); if (id && mtFindRow_(sht, id)) mtWriteRow_(sht, id, { "PDF (Drive)": pdf.url }); });
    mtBump_(); return true;
  });
  return { ok: true, url: pdf.url, name: pdf.name, message: "Đã lưu " + pdf.name + " vào Drive" };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * KPI FY68 — TAB "MỤC TIÊU & KPI" THEO FILE MMH KPI FY68
 *  Cột A = nhãn máy đọc (kpi:…, grp, pic, tot, sku, months, mstart…) — ĐỪNG XOÁ, app đọc theo nhãn này.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
var K68_SPEC = {"dental":{"title":"MMH DENTAL SALES TEAM","lang":"envn","pics":[{"pic":"Viet","role":"Dental Sales Team Leader (North)","rows":[{"code":"F3-01","key":"turnover","name":"MMH Sales Amount to Distributors · Dental & MMG Vietnam North, Nam Dung Distributor","unit":"USD","agg":"SUM","w":0.2,"t":[127050.0,145200.0,145200.0,145200.0,163350.0,90750.0,181500.0,145200.0,145200.0,163350.0,217800.0,145200.0]},{"code":"F6-01a","key":"turnover","name":"MMH Sales Amount to Distributors · New & Relaunched Products · Composite · Nam Dung Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[5376.0,6144.0,6144.0,6144.0,6912.0,3840.0,7680.0,6144.0,6144.0,6912.0,9216.0,6144.0]},{"code":"F6-02a","key":"turnover","name":"MMH Sales Amount to Distributors · New & Relaunched Products · JIZAI · Nam Dung Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[2688.0,3072.0,3072.0,3072.0,3456.0,1920.0,3840.0,3072.0,3072.0,3456.0,4608.0,3072.0]},{"code":"C6-01","key":"supp_comp","name":"Sales Quantity Supported by MMH Team · Composite · Nam Dung Distributor","unit":"Pcs","agg":"SUM","w":0.1,"t":[60.0,60.0,60.0,60.0,60.0,60.0,60.0,60.0,60.0,60.0,60.0,60.0]},{"code":"C7-01","key":"supp_jizai","name":"Sales Quantity Supported by MMH Team · JIZAI · Nam Dung Distributor","unit":"Sheets","agg":"SUM","w":0.1,"t":[37.0,37.0,37.0,37.0,37.0,37.0,38.0,38.0,38.0,38.0,38.0,38.0]},{"code":"C3-01","key":"visit_dealer","name":"Number of Customer Visits · Dealers · Dental Vietnam North","unit":"Times","agg":"SUM","w":0.05,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C3-04","key":"visit_other","name":"Number of Customer Visits · Distributors/End Customers · Dental Vietnam North","unit":"Times","agg":"SUM","w":0.05,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C10-03","key":"event_mmh","name":"Number of T&E Events · Led by MMH Members · Customer Training · Dental Vietnam North","unit":"Times","agg":"SUM","w":0.05,"t":[1.0,1.0,1.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0]},{"code":"C5-01","key":"supp_amt","name":"Sales Amount Supported by MMH Team · Dental Vietnam North","unit":"USD","agg":"SUM","w":0.1,"t":[7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0]},{"code":"C1-01","key":"newacct_dealer","name":"Number of New Dealer Accounts & New SKU Listings · Dental Vietnam North","unit":"Accounts","agg":"SUM","w":0.05,"t":[0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0]}]},{"pic":"Vinh","role":"Dental Sales Representative (Central)","rows":[{"code":"F3-02","key":"turnover","name":"MMH Sales Amount to Distributors · Dental & MMG Vietnam Central, SPI Distributor","unit":"USD","agg":"SUM","w":0.2,"t":[78000.0,78000.0,82000.0,88000.0,60000.0,72000.0,77000.0,78000.0,78000.0,78000.0,93000.0,78000.0]},{"code":"F6-01b","key":"turnover","name":"MMH Sales Amount to Distributors · New & Relaunched Products · Composite · SPI Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[3286.0,3286.0,3454.0,3708.0,2527.0,3033.0,3244.0,3286.0,3286.0,3286.0,3918.0,3286.0]},{"code":"F6-02b","key":"turnover","name":"MMH Sales Amount to Distributors · New & Relaunched Products · JIZAI · SPI Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[1643.0,1643.0,1727.0,1854.0,1264.0,1516.0,1622.0,1643.0,1643.0,1643.0,1959.0,1643.0]},{"code":"C6-02","key":"supp_comp","name":"Sales Quantity Supported by MMH Team · Composite · SPI Distributor","unit":"Pcs","agg":"SUM","w":0.1,"t":[50.0,50.0,50.0,50.0,50.0,50.0,50.0,50.0,50.0,50.0,50.0,50.0]},{"code":"C7-02","key":"supp_jizai","name":"Sales Quantity Supported by MMH Team · JIZAI · SPI Distributor","unit":"Sheets","agg":"SUM","w":0.1,"t":[33.0,33.0,33.0,33.0,33.0,33.0,33.0,33.0,34.0,34.0,34.0,34.0]},{"code":"C3-02","key":"visit_dealer","name":"Number of Customer Visits · Dealers · Dental Vietnam Central","unit":"Times","agg":"SUM","w":0.05,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C3-05","key":"visit_other","name":"Number of Customer Visits · Distributors/End Customers · Dental Vietnam Central","unit":"Times","agg":"SUM","w":0.05,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C10-04","key":"event_mmh","name":"Number of T&E Events · Led by MMH Members · Customer Training · Dental Vietnam Central","unit":"Times","agg":"SUM","w":0.1,"t":[1.0,1.0,1.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0]},{"code":"C5-02","key":"supp_amt","name":"Sales Amount Supported by MMH Team · Dental Vietnam Central","unit":"USD","agg":"SUM","w":0.1,"t":[7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0]},{"code":"C1-02","key":"newacct_dealer","name":"Number of New Dealer Accounts & New SKU Listings · Dental Vietnam Central","unit":"Accounts","agg":"SUM","w":0.1,"t":[0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0]}]},{"pic":"Phuong","role":"Dental Sales Representative (South)","rows":[{"code":"F3-03","key":"turnover","name":"MMH Sales Amount to Distributors · Dental & MMG Vietnam South, Viet Thai + Meci Distributor","unit":"USD","agg":"SUM","w":0.2,"t":[169155.0,180036.0,180036.0,190807.0,184388.0,142063.0,195505.0,185247.0,180036.0,179314.0,179747.0,191747.0]},{"code":"F6-01c","key":"turnover","name":"MMH Sales Amount to Distributors · New & Relaunched Products · Composite · Viet Thai + Meci Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[6553.0,6974.0,6974.0,7392.0,7143.0,5503.0,7573.0,7176.0,6975.0,6946.0,6963.0,7428.0]},{"code":"F6-02c","key":"turnover","name":"MMH Sales Amount to Distributors · New & Relaunched Products · JIZAI · Viet Thai + Meci Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[3276.0,3488.0,3487.0,3695.0,3572.0,2751.0,3787.0,3588.0,3487.0,3474.0,3481.0,3714.0]},{"code":"C6-03","key":"supp_comp","name":"Sales Quantity Supported by MMH Team · Composite · Viet Thai + Meci Distributor","unit":"Pcs","agg":"SUM","w":0.1,"t":[45.0,45.0,45.0,45.0,45.0,45.0,45.0,45.0,45.0,45.0,45.0,45.0]},{"code":"C7-03","key":"supp_jizai","name":"Sales Quantity Supported by MMH Team · JIZAI · Viet Thai + Meci Distributor","unit":"Sheets","agg":"SUM","w":0.1,"t":[37.0,37.0,37.0,37.0,37.0,37.0,38.0,38.0,38.0,38.0,38.0,38.0]},{"code":"C3-03","key":"visit_dealer","name":"Number of Customer Visits · Dealers · Dental Vietnam South","unit":"Times","agg":"SUM","w":0.05,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C3-06","key":"visit_other","name":"Number of Customer Visits · Distributors/End Customers · Dental Vietnam South","unit":"Times","agg":"SUM","w":0.05,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C10-05","key":"event_mmh","name":"Number of T&E Events · Led by MMH Members · Customer Training · Dental Vietnam South","unit":"Times","agg":"SUM","w":0.1,"t":[1.0,1.0,1.0,1.0,1.0,1.0,2.0,2.0,2.0,2.0,2.0,2.0]},{"code":"C5-03","key":"supp_amt","name":"Sales Amount Supported by MMH Team · Dental Vietnam South","unit":"USD","agg":"SUM","w":0.1,"t":[7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0,7490.0]},{"code":"C1-03","key":"newacct_dealer","name":"Number of New Dealer Accounts & New SKU Listings · Dental Vietnam South","unit":"Accounts","agg":"SUM","w":0.1,"t":[0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0]}]}]},"surgical":{"title":"MMH SURGICAL SALES TEAM","lang":"envn","pics":[{"pic":"Viet Ha","role":"Surgical Sales Representative (North)","rows":[{"code":"F2-01","key":"turnover","name":"MMH Sales Amount to Distributors · Knife / Sutures · Surgical Vietnam North, Hung Vi Distributor","unit":"USD","agg":"SUM","w":0.2,"t":[12443.0,22861.0,37312.0,25680.0,31254.0,24882.0,10796.0,43724.0,67019.0,23821.0,47845.0,47898.0]},{"code":"F2-02","key":"turnover","name":"MMH Sales Amount to Distributors · Manipler · Surgical Vietnam North, MHI Distributor","unit":"USD","agg":"SUM","w":0.05,"t":[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]},{"code":"C10-01","key":"event_mmh","name":"Number of T&E Events · Led by MMH Members · Product Presentation / Case Demonstration · Surgical Vietnam North","unit":"Times","agg":"SUM","w":0.25,"t":[2.0,2.0,2.0,2.0,2.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0]},{"code":"C3-07","key":"visit_all","name":"Number of Customer Visits · Surgical Vietnam North","unit":"Times","agg":"SUM","w":0.25,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C1-04","key":"newacct_all","name":"Number of New Customer Accounts & New SKU Listings · Surgical Vietnam North","unit":"Accounts","agg":"SUM","w":0.15,"t":[0.0,0.0,0.0,0.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0]}]},{"pic":"Khang","role":"Surgical Sales Representative (South)","rows":[{"code":"F2-03","key":"turnover","name":"MMH Sales Amount to Distributors · Knife / Sutures · Surgical Vietnam South, Icare Distributor","unit":"USD","agg":"SUM","w":0.2,"t":[20867.0,21326.0,27377.0,22076.0,15978.0,14198.0,15993.0,21323.0,32708.0,17110.0,26638.0,30038.0]},{"code":"F2-04","key":"turnover","name":"MMH Sales Amount to Distributors · Manipler · Surgical Vietnam South, An Tam Distributor (new)","unit":"USD","agg":"SUM","w":0.05,"t":[0.0,2559.0,2563.0,2868.0,0.0,0.0,1750.0,0.0,1414.0,0.0,1414.0,0.0]},{"code":"C10-02","key":"event_mmh","name":"Number of T&E Events · Led by MMH Members · Product Presentation / Case Demonstration · Surgical Vietnam South","unit":"Times","agg":"SUM","w":0.25,"t":[2.0,2.0,2.0,2.0,2.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0]},{"code":"C3-08","key":"visit_all","name":"Number of Customer Visits · Surgical Vietnam South","unit":"Times","agg":"SUM","w":0.25,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C1-05","key":"newacct_all","name":"Number of New Customer Accounts & New SKU Listings · Surgical Vietnam South","unit":"Accounts","agg":"SUM","w":0.15,"t":[0.0,0.0,0.0,0.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0]}]}]},"eyeless":{"title":"MMH EYELESS SALES TEAM","lang":"envn","pics":[{"pic":"Trang","role":"Eyeless Sales Representative","rows":[{"code":"F5-00","key":"turnover","name":"MMH Sales Amount to Distributors · Eyeless Vietnam","unit":"USD","agg":"SUM","w":0.55,"t":[0.0,59323.0,0.0,0.0,59323.0,0.0,0.0,59323.0,0.0,0.0,59323.0,0.0]},{"code":"C3-09","key":"visit_all","name":"Number of Customer Visits · Eyeless Vietnam","unit":"Times","agg":"SUM","w":0.05,"t":[0.0,0.0,2.0,0.0,0.0,2.0,0.0,0.0,2.0,0.0,0.0,2.0]},{"code":"C12-01","key":"manual","name":"Number of T&E Events Led by KOLs & Exhibitions · Dental Vietnam","unit":"Times","agg":"SUM","w":0.15,"t":[3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,4.0,4.0]},{"code":"C12-02","key":"manual","name":"Number of T&E Events Led by KOLs & Exhibitions · Surgical Vietnam","unit":"Times","agg":"SUM","w":0.15,"t":[0.0,0.0,0.0,0.0,0.0,0.0,1.0,1.0,1.0,1.0,1.0,1.0]}]}]}};

var K68_MASTER_SHEET = '3. Detail KPI';
var K68_N  = 20000;
var K68_N2 = 6000;
var K68_SRC = {
  vi: { wk: '6. WEEKLY REPORT',     cu: '1. CUSTOMER CODE', pr: '7. PRODUCT PRESENTATION', od: '3. SALE ORDER', na: '16. NEW ACCOUNT & SKU' },
  envn: { wk: '6. WEEKLY REPORT',     cu: '1. CUSTOMER CODE', pr: '7. PRODUCT PRESENTATION', od: '3. SALE ORDER', na: '16. NEW ACCOUNT & SKU' },
  en: { wk: '6. CUSTOMER VISITING', cu: '1. CUSTOMER CODE', pr: '7. PRODUCT PRESENTATION', od: '', na: '23. NEW ACCOUNT & SKU' }
};
var K68 = { tag: 1, code: 2, pic: 3, name: 4, unit: 5, w: 6, agg: 7, tFY: 8, t0: 9, aFY: 21, a0: 22,
            pct: 34, ytd: 35, q0: 36, score: 40, src: 41, NC: 41 };
var K68_SET = { fy: 'C4', rate: 'D5', photo: 'D6', comp1: 'D7', comp2: 'E7', jz1: 'D8', jz2: 'E8', link: 'D9', cur: 'D10', sync: 'D11' };
var K68_MANUAL = { turnover: 1, manual: 1 };
var K68_LAYOUT = 'k68v7';   /* v10.0 — C1 đếm case đã duyệt (sheet 16) · C6 / C7 lọc theo NPP phụ trách ⇒ tab tự dựng lại 1 lần */

var K68_TXT = {
  vi: {
    title: 'MỤC TIÊU & KPI', sub: 'theo file MMH KPI FY68',
    guide: 'Mỗi dòng = 1 mã KPI của 1 sales, đúng mã trong file MMH KPI FY68. Target 12 tháng lấy từ file KPI FY68 · Actual tự tính bằng công thức từ dữ liệu CRM · Doanh số NPP (mã F) lấy từ file KPI FY68 hoặc nhập tay.',
    fy: 'FY áp dụng', rate: 'Tỷ giá VND / 1 USD', photo: 'Chỉ tính visit có ảnh', comp: 'Từ khoá Composite',
    jz: 'Từ khoá JIZAI', link: 'File KPI tổng (FY68)', cur: 'Tháng hiện tại (auto)', sync: 'Đồng bộ lần cuối',
    yes: 'CÓ', no: 'KHÔNG', linkHint: '← file KPI tổng · KPI Hub tự đồng bộ 2 chiều 5 phút/lần',
    legend: ['Ô nền vàng, chữ xanh = ô nhập tay (target, doanh số NPP, SKU mới)',
             'Chữ đen = công thức tự tính từ dữ liệu CRM — không gõ đè',
             '% đạt tối đa 130% (riêng doanh số mã F không giới hạn) — theo Rule của file KPI FY68',
             'Q1 = T9·T10·T11 · Q2 = T12·T1·T2 · Q3 = T3·T4·T5 · Q4 = T6·T7·T8 · "% lũy kế" = tính đến tháng hiện tại · doanh số mã F: số của từng tháng, quý = tổng 3 tháng',
             'Doanh số NPP (mã F) = số của từng tháng (Target, Actual theo tháng) → kết quả FY = tổng các tháng'],
    partA: 'PHẦN A — TỔNG HỢP CẢ NHÓM THEO NHÓM KPI (tự động)',
    partB: 'PHẦN B — KPI TỪNG SALES THEO THÁNG / QUÝ',
    partC: 'PHẦN C — REVIEW CUỐI QUÝ (sales điền nội dung · trưởng nhóm duyệt)',
    bandT: 'TARGET THEO THÁNG (file KPI FY68)', bandA: 'ACTUAL THEO THÁNG (tự động từ CRM)', bandP: '% ĐẠT',
    hGroup: 'Mã nhóm', hGroupName: 'Chỉ tiêu nhóm', hCodes: 'Gồm các mã KPI',
    hCode: 'Mã KPI', hPic: 'Sale PIC', hName: 'Chỉ tiêu KPI', hUnit: 'Đơn vị', hW: 'Trọng số', hAgg: 'Cách cộng',
    hTFY: 'Target FY', hAFY: 'Actual FY', hPct: '% đạt FY', hYtd: '% lũy kế đến nay', hQ: '% ', hScore: 'Điểm (% × trọng số)', hSrc: 'Nguồn Actual / cách tính',
    mcode: 'mã tháng ▸', mstart: 'ngày đầu tháng ▸', SUM: 'Cộng dồn', LAST: 'Lũy kế',
    mon: ['T9','T10','T11','T12','T1','T2','T3','T4','T5','T6','T7','T8'],
    tot: 'Tổng điểm KPI của {p} (các chỉ tiêu theo dõi trong CRM)',
    sku: '↳ SKU mới (nhập tay số SKU mới theo tháng — cộng vào dòng trên)',
    rQ: 'Quý', rRes: 'Kết quả nổi bật', rWhy: 'Nguyên nhân chưa đạt', rPlan: 'Kế hoạch quý sau', rMgr: 'Trưởng nhóm nhận xét / duyệt', rPct: '% đạt quý (auto)',
    oldName: '9. KPI cũ (trước FY68)',
    src: {
      turnover: 'File MMH KPI FY68 (MMH Turnover Report) — đồng bộ tự động, hoặc nhập tay số của tháng',
      manual: 'Vietnam - Marketing Offline Plan & Report — đồng bộ từ file KPI FY68 hoặc nhập tay',
      visit_dealer: '6. WEEKLY REPORT · Sales PIC + Start date trong tháng + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type = Dealer',
      visit_other: '6. WEEKLY REPORT · Sales PIC + Start date trong tháng + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type ≠ Dealer',
      visit_all: '6. WEEKLY REPORT · Sales PIC + Start date trong tháng + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today',
      newacct_dealer: '16. NEW ACCOUNT & SKU · số case Status = Approved theo PIC + Month (tháng đơn đầu tiên) · Account type = Dealer',
      newacct_all: '16. NEW ACCOUNT & SKU · số case Status = Approved theo PIC + Month (tháng đơn đầu tiên)',
      event_mmh: '7. PRODUCT PRESENTATION · đếm buổi theo MMH sales PIC + Month',
      event_mmh_team: '7. PRODUCT PRESENTATION · đếm buổi của cả nhóm theo Month',
      event_kol_team: '6. WEEKLY REPORT · Type action = Event + Task Status ≠ Not Started / Cancel + date ≤ today (cả nhóm)',
      supp_amt: '3. SALE ORDER · tổng Amount (VND) theo MMH sales PIC + Month ÷ tỷ giá của tháng (nhập trên app) — số do code ghi',
      supp_comp: '3. SALE ORDER · tổng Quantity theo MMH sales PIC + Month, Detail/Product type chứa từ khoá Composite (D7/E7), Partner = NPP phụ trách (K68_NPP)',
      supp_jizai: '3. SALE ORDER · tổng Quantity theo MMH sales PIC + Month, Detail/Product type chứa từ khoá JIZAI (D8/E8), Partner = NPP phụ trách (K68_NPP)'
    },
    msgNoLink: 'Chưa có link file MMH KPI FY68 ở ô D9 của tab KPI.',
    msgNoMaster: 'Không mở được file KPI FY68 (kiểm tra link và quyền truy cập của tài khoản chạy script): ',
    msgAuth: '\n\nKhông sao: việc đồng bộ tự động do file KPI tổng đảm nhận. Mở file KPI tổng ▸ sheet "_CRM_LINKS" ▸ dán link file CRM này vào cột B đúng dòng nhóm ▸ menu MMH KPI Hub ▸ ⑦ Bật đồng bộ tự động.',
    msgNoDetail: 'File KPI không có sheet "3. Detail KPI".',
    msgNotBuilt: 'Tab KPI chưa theo mẫu FY68 — chạy menu "⑪ Tạo lại tab KPI theo file KPI FY68" trước.'
  },
  envn: {
    title: 'TARGET & KPI', sub: 'per the MMH KPI FY68 file',
    guide: 'One row = one KPI code of one sales PIC, exactly as in the MMH KPI FY68 file. Monthly targets come from the KPI FY68 file · Actuals are formulas on the CRM data · Distributor turnover (F codes) comes from the KPI FY68 file or is typed in.',
    fy: 'Applied FY', rate: 'Rate (VND / 1 USD)', photo: 'Visits with photo only', comp: 'Composite keyword',
    jz: 'JIZAI keyword', link: 'KPI FY68 file link', cur: 'Current month (auto)', sync: 'Last sync',
    yes: 'YES', no: 'NO', linkHint: '← master KPI file · synced both ways automatically by the KPI file',
    legend: ['Yellow cell, blue text = typed input (targets, distributor turnover, new SKU)',
             'Black text = formula calculated from the CRM data, do not type over it',
             '% achieved is capped at 130% (turnover F codes are not capped), per the KPI FY68 Rule',
             'Q1 = Sep·Oct·Nov · Q2 = Dec·Jan·Feb · Q3 = Mar·Apr·May · Q4 = Jun·Jul·Aug · "% to date" = up to the current month · F codes: monthly amounts, quarter = sum of 3 months',
             'Distributor turnover (F codes) is the amount of each month (monthly target and actual), so the FY result = sum of the months'],
    partA: 'PART A · TEAM SUMMARY BY KPI GROUP (auto)',
    partB: 'PART B · KPI OF EACH SALES PIC BY MONTH / QUARTER',
    partC: 'PART C · END OF QUARTER REVIEW (sales PIC fills in · team leader approves)',
    bandT: 'MONTHLY TARGET (KPI FY68 file)', bandA: 'MONTHLY ACTUAL (auto from the CRM)', bandP: '% ACHIEVED',
    hGroup: 'Group', hGroupName: 'Group KPI', hCodes: 'KPI codes included',
    hCode: 'KPI code', hPic: 'Sales PIC', hName: 'KPI', hUnit: 'Unit', hW: 'Weight', hAgg: 'Aggregation',
    hTFY: 'Target FY', hAFY: 'Actual FY', hPct: '% FY', hYtd: '% to date', hQ: '% ', hScore: 'Score (% × weight)', hSrc: 'Actual source / rule',
    mcode: 'month code ▸', mstart: 'first day ▸', SUM: 'Sum', LAST: 'Cumulative',
    mon: ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
    tot: 'KPI score of {p} (KPIs tracked in the CRM)',
    sku: '↳ New SKU listings (type the number per month, added to the row above)',
    rQ: 'Quarter', rRes: 'Key results', rWhy: 'Reasons for gaps', rPlan: 'Plan for next quarter', rMgr: 'Team leader comment / approval', rPct: 'Quarter % (auto)',
    oldName: '9. OLD KPI (before FY68)',
    src: {
      turnover: 'MMH KPI FY68 file (from SUM TURNOVER of the MMH Turnover Report) · synced automatically, or type the amount of the month',
      manual: 'Vietnam Marketing Offline Plan & Report · synced from the KPI FY68 file or typed in',
      visit_dealer: '6. WEEKLY REPORT · Sales PIC + Start date in month + Type action = Visiting + Task Status not Not Started / Cancel + date ≤ today + Account type = Dealer',
      visit_other: '6. WEEKLY REPORT · Sales PIC + Start date in month + Type action = Visiting + Task Status not Not Started / Cancel + date ≤ today + Account type not Dealer',
      visit_all: '6. WEEKLY REPORT · Sales PIC + Start date in month + Type action = Visiting + Task Status not Not Started / Cancel + date ≤ today',
      newacct_dealer: 'NEW ACCOUNT & SKU sheet · approved cases by PIC + Month (month of the first order) · Account type = Dealer',
      newacct_all: 'NEW ACCOUNT & SKU sheet · approved cases by PIC + Month (month of the first order)',
      event_mmh: '7. PRODUCT PRESENTATION · sessions by MMH sales PIC + Month',
      event_mmh_team: '7. PRODUCT PRESENTATION · sessions of the whole team by Month',
      event_kol_team: '6. WEEKLY REPORT · Type action = Event + Task Status not Not Started / Cancel + date ≤ today (whole team)',
      supp_amt: '3. SALE ORDER · total Amount (VND) by MMH sales PIC + Month ÷ exchange rate in D5',
      supp_comp: '3. SALE ORDER · total Quantity by MMH sales PIC + Month where Detail / Product type contains the Composite keyword (D7/E7) and Partner = the PIC\'s distributor (K68_NPP)',
      supp_jizai: '3. SALE ORDER · total Quantity by MMH sales PIC + Month where Detail / Product type contains the JIZAI keyword (D8/E8) and Partner = the PIC\'s distributor (K68_NPP)'
    },
    msgNoLink: 'No link to the MMH KPI FY68 file in cell D9 of the KPI tab.',
    msgNoMaster: 'Cannot open the KPI FY68 file (check the link and the access of the account running the script): ',
    msgAuth: '\n\nNo problem: the automatic sync is run by the master KPI file (menu ⚡ KPI Sync).',
    msgNoDetail: 'The KPI file has no sheet "3. Detail KPI".',
    msgNotBuilt: 'The KPI tab is not in the FY68 layout yet. Run menu "⑪ Tạo lại tab KPI theo file KPI FY68" first.'
  },
  en: {
    title: 'TARGET & KPI', sub: 'per the MMH KPI FY68 file',
    guide: 'One row = one KPI code of one sales PIC, exactly as in the MMH KPI FY68 file. Monthly targets come from the KPI FY68 file · Actuals are formulas on the CRM data · Distributor turnover (F codes) comes from the KPI FY68 file or is typed in.',
    fy: 'Applied FY', rate: 'Rate (local / 1 USD)', photo: 'Visits with photo only', comp: 'Composite keyword',
    jz: 'JIZAI keyword', link: 'KPI FY68 file link', cur: 'Current month (auto)', sync: 'Last sync',
    yes: 'YES', no: 'NO', linkHint: '← master KPI file · the KPI Hub syncs both ways every 5 minutes',
    legend: ['Yellow cell, blue text = typed input (targets, distributor turnover, new SKU)',
             'Black text = formula calculated from the CRM data — do not type over it',
             '% achieved is capped at 130% (turnover F codes are not capped) — per the KPI FY68 Rule',
             'Q1 = Sep·Oct·Nov · Q2 = Dec·Jan·Feb · Q3 = Mar·Apr·May · Q4 = Jun·Jul·Aug · "% to date" = up to the current month · F codes: monthly amounts, quarter = sum of 3 months',
             'Distributor turnover (F codes) is the amount of each month (monthly target and actual) → FY result = sum of the months'],
    partA: 'PART A — TEAM SUMMARY BY KPI GROUP (auto)',
    partB: 'PART B — KPI OF EACH SALES PIC BY MONTH / QUARTER',
    partC: 'PART C — END-OF-QUARTER REVIEW (sales PIC fills in · team leader approves)',
    bandT: 'MONTHLY TARGET (KPI FY68 file)', bandA: 'MONTHLY ACTUAL (auto from the CRM)', bandP: '% ACHIEVED',
    hGroup: 'Group', hGroupName: 'Group KPI', hCodes: 'KPI codes included',
    hCode: 'KPI code', hPic: 'Sales PIC', hName: 'KPI', hUnit: 'Unit', hW: 'Weight', hAgg: 'Aggregation',
    hTFY: 'Target FY', hAFY: 'Actual FY', hPct: '% FY', hYtd: '% to date', hQ: '% ', hScore: 'Score (% × weight)', hSrc: 'Actual source / rule',
    mcode: 'month code ▸', mstart: 'first day ▸', SUM: 'Sum', LAST: 'Cumulative',
    mon: ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
    tot: 'KPI score of {p} (KPIs tracked in the CRM)',
    sku: '↳ New SKU listings (type the number per month — added to the row above)',
    rQ: 'Quarter', rRes: 'Key results', rWhy: 'Reasons for gaps', rPlan: 'Plan for next quarter', rMgr: 'Team leader comment / approval', rPct: 'Quarter % (auto)',
    oldName: '9. OLD KPI (before FY68)',
    src: {
      turnover: 'MMH KPI FY68 file (MMH Turnover Report) — synced automatically, or type the amount of the month',
      manual: 'Synced from the KPI FY68 file or typed in',
      visit_dealer: '6. CUSTOMER VISITING · Sales PIC + Start date in month + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type = Dealer',
      visit_other: '6. CUSTOMER VISITING · Sales PIC + Start date in month + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type ≠ Dealer',
      visit_all: '6. CUSTOMER VISITING · Sales PIC + Start date in month + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today',
      newacct_dealer: 'NEW ACCOUNT & SKU sheet · approved cases by PIC + Month (month of the first order) · Account type = Dealer',
      newacct_all: 'NEW ACCOUNT & SKU sheet · approved cases by PIC + Month (month of the first order)',
      event_mmh: '7. PRODUCT PRESENTATION · sessions by MMH sales PIC + Month',
      event_mmh_team: '7. PRODUCT PRESENTATION · sessions of the whole team by Month',
      event_kol_team: '6. CUSTOMER VISITING · Type action = Event + Task Status ≠ Not Started / Cancel + date ≤ today (KOL-led events & exhibitions, whole team) by Start date',
      supp_amt: '3. SALE ORDER · Amount ÷ exchange rate (D5)', supp_comp: '3. SALE ORDER · Composite quantity', supp_jizai: '3. SALE ORDER · JIZAI quantity'
    },
    msgNoLink: 'No link to the MMH KPI FY68 file in cell D9 of the KPI tab.',
    msgNoMaster: 'Cannot open the KPI FY68 file (check the link and the access of the account running the script): ',
    msgAuth: '\n\nNo problem: the automatic sync is run by the master KPI file. Open it ▸ sheet "_CRM_LINKS" ▸ paste this CRM file link in column B of the team row ▸ menu MMH KPI Hub ▸ ⑦ Automatic sync.',
    msgNoDetail: 'The KPI file has no sheet "3. Detail KPI".',
    msgNotBuilt: 'The KPI tab is not in the FY68 layout yet — run menu "⑤ Rebuild the KPI tab from the KPI FY68 file" first.'
  }
};
var K68_GROUPS = {
  dental: [
    ['F3',    'MMH Sales Amount to Distributors · Dental & MMG Vietnam (3 distributors)', ['F3-01','F3-02','F3-03']],
    ['F6-01', 'New & Relaunched Products · Composite (MMG)',          ['F6-01a','F6-01b','F6-01c']],
    ['F6-02', 'New & Relaunched Products · JIZAI',                    ['F6-02a','F6-02b','F6-02c']],
    ['C5',    'Sales Amount Supported by MMH Team',                   ['C5-01','C5-02','C5-03']],
    ['C6',    'Sales Quantity Supported by MMH Team · Composite',     ['C6-01','C6-02','C6-03']],
    ['C7',    'Sales Quantity Supported by MMH Team · JIZAI',         ['C7-01','C7-02','C7-03']],
    ['C3',    'Number of Customer Visits (Dealers + Distributors / End Customers)', ['C3-01','C3-02','C3-03','C3-04','C3-05','C3-06']],
    ['C10',   'T&E Events Led by MMH Members · Customer Training',    ['C10-03','C10-04','C10-05']],
    ['C1',    'New Dealer Accounts & New SKU Listings',               ['C1-01','C1-02','C1-03']]],
  surgical: [
    ['F2',  'MMH Sales Amount to Distributors · Surgical Vietnam', ['F2-01','F2-02','F2-03','F2-04']],
    ['C10', 'T&E Events Led by MMH Members · Product Presentation / Case Demonstration', ['C10-01','C10-02']],
    ['C3',  'Number of Customer Visits', ['C3-07','C3-08']],
    ['C1',  'New Customer Accounts & New SKU Listings', ['C1-04','C1-05']]],
  eyeless: [
    ['F5',  'MMH Sales Amount to Distributors · Eyeless Vietnam', ['F5-00']],
    ['C3',  'Number of Customer Visits', ['C3-09']],
    ['C12', 'T&E Events Led by KOLs & Exhibitions', ['C12-01','C12-02']]],
  thai: [
    ['F1',  'Turnover – Surgical Thailand / Myanmar (incl. Manipler)', ['F1-00']],
    ['F6',  'New & relaunched products – Hook + Micro Forceps', ['F6-03']],
    ['C13', 'T&E events led by KOLs & exhibitions', ['C13-00']],
    ['C11', 'T&E events led by MMH members', ['C11-01']],
    ['C4',  'Customer visits – Manipler', ['C4-02']],
    ['C2',  'New accounts & new SKU listings', ['C2-03']]]
};

function k68Col_(n){ var s = ''; while(n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function k68Q_(name){ return "'" + String(name).replace(/'/g, "''") + "'!"; }
function k68Num_(v){ if(v === '' || v === null || v === undefined) return null; var n = Number(v); return isNaN(n) ? null : n; }
function k68Str_(v){ return v === null || v === undefined ? '' : String(v).trim(); }
function k68Abs_(a){ var m = /^([A-Z]+)(\d+)$/.exec(a); return '$' + m[1] + '$' + m[2]; }
function k68IdOf_(link){
  var s = k68Str_(link); if(!s) return '';
  var m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(s); if(m) return m[1];
  m = /[?&]id=([a-zA-Z0-9_-]{20,})/.exec(s); if(m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(s) ? s : '';
}

/* ════════════════ 1. DỰNG TAB KPI (công thức + định dạng) ════════════════ */
function k68Build_(sh, team, keep){
  var spec = K68_SPEC[team]; if(!spec) throw new Error('KPI FY68: không có cấu hình cho nhóm "' + team + '"');
  var L = spec.lang || 'vi', T = K68_TXT[L], SRC = K68_SRC[L], C = K68, NC = C.NC;
  var groups = K68_GROUPS[team] || [];
  var grid = [], sty = [], merges = [], cf = { pct: [] }, heights = {};
  function row(){ var r = []; for(var i = 0; i < NC; i++) r.push(''); grid.push(r); var s = []; for(var j = 0; j < NC; j++) s.push({}); sty.push(s); return grid.length; }
  function put(r, c, v, st){ grid[r - 1][c - 1] = v; if(st) stl(r, c, c, st); }
  function stl(r, c1, c2, st){ for(var c = c1; c <= c2; c++){ var o = sty[r - 1][c - 1]; for(var k in st) o[k] = st[k]; } }
  var A = k68Col_, TC = function(i){ return A(C.t0 + i); }, AC = function(i){ return A(C.a0 + i); };
  var S = {}; for(var k in K68_SET) S[k] = k68Abs_(K68_SET[k]);
  var NAVY = '#1F3864', HEAD = '#D9E1F2', INP = '#FFF2CC', PICB = '#E2EFDA', TOT = '#EDEDED', BLUE = '#0000FF', GREY = '#A6A6A6';

  var r = row(); put(r, 1, K68_LAYOUT, { fc: GREY, fs: 7 }); put(r, 2, T.title + ' — ' + spec.title + '  (' + T.sub + ')', { b: 1, fs: 15, fc: NAVY });
  r = row(); put(r, 2, T.guide, { fc: '#595959', i: 1 });
  row();
  var set = [
    [4, T.fy, 'FY68', 'fy'], [5, T.rate, 26000, 'rate'], [6, T.photo, T.no, 'photo'],
    [7, T.comp, 'composite', 'comp'], [8, T.jz, 'jizai', 'jz'], [9, T.link, K68_MASTER_LINK, 'link'],
    [10, T.cur, '=YEAR(TODAY())*100+MONTH(TODAY())', 'cur'], [11, T.sync, '', 'sync']];
  var useKw = spec.pics.some(function(p){ return p.rows.some(function(x){ return /^supp_/.test(x.key); }); });
  var usePhoto = (L === 'vi' || L === 'envn');
  while(grid.length < 11) row();
  set.forEach(function(s){
    var rr = s[0], key = s[3];
    if(key === 'rate' && !useKw) return;
    if((key === 'comp' || key === 'jz') && !useKw) return;
    if(key === 'photo' && !usePhoto) return;
    if(key === 'fy'){ put(rr, 2, s[1], { b: 1 }); put(rr, 3, s[2], { bg: INP, fc: BLUE, b: 1, ha: 'center' }); put(rr, 1, 'set:fy', { fc: GREY, fs: 7 }); return; }
    put(rr, 1, 'set:' + key, { fc: GREY, fs: 7 });
    put(rr, 2, s[1], { b: 1 }); merges.push([rr, 2, rr, 3]);
    if(key === 'cur'){ put(rr, 4, s[2], { nf: '0', ha: 'left', fc: '#000000' }); return; }
    if(key === 'sync'){ put(rr, 4, '', { fc: '#595959', i: 1 }); return; }
    put(rr, 4, s[2], { bg: INP, fc: BLUE, nf: key === 'rate' ? '#,##0' : '@', ha: 'left' });
    if(key === 'comp'){ put(rr, 5, '', { bg: INP, fc: BLUE }); }
    if(key === 'jz'){ put(rr, 5, '', { bg: INP, fc: BLUE }); }
    if(key === 'link'){ put(rr, 6, T.linkHint, { fc: '#C00000', i: 1 }); }
  });
  T.legend.forEach(function(t, i){ put(4 + i, 9, '• ' + t, { fc: '#404040', fs: 9 }); });

  row();
  var rA = row(); put(rA, 1, 'partA', { fc: GREY, fs: 7 }); put(rA, 2, T.partA, { b: 1, fc: '#FFFFFF' }); stl(rA, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rAh = row(); put(rAh, 1, 'hdrA', { fc: GREY, fs: 7 });
  var hA = {}; hA[C.code] = T.hGroup; hA[C.name] = T.hGroupName; hA[C.unit] = T.hUnit; hA[C.agg] = T.hAgg; hA[C.tFY] = T.hTFY; hA[C.aFY] = T.hAFY;
  hA[C.pct] = T.hPct; hA[C.ytd] = T.hYtd; hA[C.src] = T.hCodes;
  var TG = L !== 'vi' ? 'Tgt ' : 'TG ';
  for(var i = 0; i < 12; i++){ hA[C.t0 + i] = TG + T.mon[i]; hA[C.a0 + i] = T.mon[i]; }
  for(var q = 0; q < 4; q++) hA[C.q0 + q] = T.hQ + 'Q' + (q + 1);
  for(var c in hA) put(rAh, +c, hA[c]);
  stl(rAh, 2, NC, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var aRows = [];
  groups.forEach(function(g){ var rr = row(); aRows.push({ r: rr, g: g }); });
  row();

  var rB = row(); put(rB, 1, 'partB', { fc: GREY, fs: 7 }); put(rB, 2, T.partB); stl(rB, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rBand = row(); put(rBand, 1, 'band', { fc: GREY, fs: 7 });
  put(rBand, C.t0, T.bandT); merges.push([rBand, C.t0, rBand, C.t0 + 11]);
  put(rBand, C.a0, T.bandA); merges.push([rBand, C.a0, rBand, C.a0 + 11]);
  put(rBand, C.pct, T.bandP); merges.push([rBand, C.pct, rBand, C.q0 + 3]);
  stl(rBand, C.t0, C.t0 + 11, { bg: '#FCE4D6', b: 1, ha: 'center' }); stl(rBand, C.a0, C.a0 + 11, { bg: '#DDEBF7', b: 1, ha: 'center' });
  stl(rBand, C.pct, C.q0 + 3, { bg: '#E2EFDA', b: 1, ha: 'center' });
  var rH = row(); put(rH, 1, 'hdr', { fc: GREY, fs: 7 });
  var hB = {}; hB[C.code] = T.hCode; hB[C.pic] = T.hPic; hB[C.name] = T.hName; hB[C.unit] = T.hUnit; hB[C.w] = T.hW; hB[C.agg] = T.hAgg;
  hB[C.tFY] = T.hTFY; hB[C.aFY] = T.hAFY; hB[C.pct] = T.hPct; hB[C.ytd] = T.hYtd; hB[C.score] = T.hScore; hB[C.src] = T.hSrc;
  for(i = 0; i < 12; i++){ hB[C.t0 + i] = TG + T.mon[i]; hB[C.a0 + i] = T.mon[i]; }
  for(q = 0; q < 4; q++) hB[C.q0 + q] = T.hQ + 'Q' + (q + 1);
  for(c in hB) put(rH, +c, hB[c]);
  stl(rH, 2, NC, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var MC = row(), MD = row();
  put(MC, 1, 'months', { fc: GREY, fs: 7 }); put(MD, 1, 'mstart', { fc: GREY, fs: 7 });
  put(MC, 2, T.mcode, { fc: '#7F7F7F', i: 1 }); put(MD, 2, T.mstart, { fc: '#7F7F7F', i: 1 });
  for(i = 0; i < 12; i++){
    var tcl = TC(i), acl = AC(i);
    put(MC, C.t0 + i, i === 0 ? '=(1958+VALUE(SUBSTITUTE(UPPER(' + S.fy + '),"FY","")))*100+9'
                              : '=IF(MOD(' + TC(i - 1) + MC + ',100)=12,' + TC(i - 1) + MC + '+89,' + TC(i - 1) + MC + '+1)', { nf: '0', fc: '#7F7F7F', ha: 'center', fs: 8 });
    put(MC, C.a0 + i, '=' + tcl + MC, { nf: '0', fc: '#7F7F7F', ha: 'center', fs: 8 });
    put(MD, C.t0 + i, '=DATE(INT(' + tcl + MC + '/100),MOD(' + tcl + MC + ',100),1)', { nf: 'mm/yyyy', fc: '#7F7F7F', ha: 'center', fs: 8 });
    put(MD, C.a0 + i, '=' + tcl + MD, { nf: 'mm/yyyy', fc: '#7F7F7F', ha: 'center', fs: 8 });
  }
  var MCr = '$' + TC(0) + '$' + MC + ':$' + TC(11) + '$' + MC, MCa = '$' + AC(0) + '$' + MC + ':$' + AC(11) + '$' + MC;

  var N = K68_N, N2 = K68_N2;
  function rg(tab, col, n){ return k68Q_(SRC[tab]) + '$' + col + '$4:$' + col + '$' + (n || N); }
  var capF = function(expr, code){ return /^F/.test(code) ? expr : 'MIN(' + expr + ',13/10)'; };

  function actualFormula(key, rr, i, picName){
    var X = AC(i), md = X + '$' + MD, mc = X + '$' + MC, pic = '$' + A(C.pic) + rr;
    var dates = rg('wk', 'E') + ',">="&' + md + ',' + rg('wk', 'E') + ',"<"&EDATE(' + md + ',1),' + rg('wk', 'E') + ',"<="&TODAY(),' + rg('wk', 'R') + ',"<>Not Started",' + rg('wk', 'R') + ',"<>Cancel*"';   /* v9.4 · bỏ lượt Cancel */
    var vis = rg('wk', 'G') + ',' + pic + ',' + rg('wk', 'N') + ',"Visiting",' + dates;
    if(key === 'visit_dealer') vis += ',' + rg('wk', 'I') + ',"Dealer"';
    if(key === 'visit_other')  vis += ',' + rg('wk', 'I') + ',"<>Dealer"';
    if(/^visit_/.test(key)){
      if(!usePhoto) return '=COUNTIFS(' + vis + ')';
      return '=IF(' + S.photo + '="' + T.yes + '",COUNTIFS(' + vis + ',' + rg('wk', 'V') + ',"<>"),COUNTIFS(' + vis + '))';
    }
    if(key === 'event_kol_team') return '=COUNTIFS(' + rg('wk', 'N') + ',"Event",' + dates + ')';
    /* ⭐ v10.0 — case Mở mới / SKU mới đã được quản lý XÁC NHẬN (sheet NEW ACCOUNT & SKU: D = PIC · G = Month · L = Account type · AA = Status) */
    if(key === 'newacct_dealer' || key === 'newacct_all')
      return '=COUNTIFS(' + rg('na', 'D') + ',' + pic + ',' + rg('na', 'G') + ',' + mc + ',' + rg('na', 'AA') + ',"Approved"' + (key === 'newacct_dealer' ? ',' + rg('na', 'L') + ',"Dealer"' : '') + ')';
    if(key === 'event_mmh') return '=SUMPRODUCT((' + rg('pr', 'D', N2) + '=' + pic + ')*(' + rg('pr', 'H', N2) + '&""=' + mc + '&""))';
    if(key === 'event_mmh_team') return '=SUMPRODUCT(--(' + rg('pr', 'H', N2) + '&""=' + mc + '&""))';
    var odP = 'ISNUMBER(SEARCH(' + pic + ',' + rg('od', 'Q', N2) + '))*(' + rg('od', 'F', N2) + '&""=' + mc + '&"")';
    if(/^supp_/.test(key)) return '';   /* ⭐ v10.1 — số do code ghi (k68CalcSupp_), không dùng công thức */
    if(key === 'supp_amt') return '=IF(N(' + S.rate + ')>0,SUMPRODUCT(' + odP + '*IFERROR(' + rg('od', 'V', N2) + '*1,0))/' + S.rate + ',0)';
    if(key === 'supp_comp' || key === 'supp_jizai'){
      var k1 = key === 'supp_comp' ? S.comp1 : S.jz1, k2 = key === 'supp_comp' ? S.comp2 : S.jz2;
      var txt = rg('od', 'R', N2) + '&" "&' + rg('od', 'S', N2);
      /* ⭐ v10.0 — chỉ đơn qua NPP phụ trách của sales (cột W Partner chứa từ khoá ở K68_NPP) */
      var npp = ((K68_NPP[team] || {})[picName] || []).filter(String);
      var nppF = npp.length ? '*((' + npp.map(function(w){ return 'ISNUMBER(SEARCH("' + String(w).replace(/"/g, '""') + '",' + rg('od', 'W', N2) + '))'; }).join('+') + ')>0)' : '';
      return '=SUMPRODUCT(' + odP + '*(((LEN(' + k1 + ')>0)*ISNUMBER(SEARCH(' + k1 + ',' + txt + '))+(LEN(' + k2 + ')>0)*ISNUMBER(SEARCH(' + k2 + ',' + txt + ')))>0)' + nppF + '*IFERROR(' + rg('od', 'T', N2) + '*1,0))';
    }
    return '';
  }
  function rowCalc(rr, agg, code){
    var tr = TC(0) + rr + ':' + TC(11) + rr, ar = AC(0) + rr + ':' + AC(11) + rr;
    var T_ = A(C.tFY) + rr, A_ = A(C.aFY) + rr;
    if(agg === 'LAST'){
      put(rr, C.tFY, '=IF(COUNT(' + tr + ')=0,"",LOOKUP(10^300,' + tr + '))');
      put(rr, C.aFY, '=IF(COUNT(' + ar + ')=0,"",LOOKUP(10^300,' + ar + '))');
    } else {
      put(rr, C.tFY, '=IF(COUNT(' + tr + ')=0,"",SUM(' + tr + '))');
      put(rr, C.aFY, '=IF(COUNT(' + ar + ')=0,"",SUM(' + ar + '))');
    }
    put(rr, C.pct, '=IF(OR(' + A_ + '="",N(' + T_ + ')=0),"",' + capF(A_ + '/' + T_, code) + ')');
    if(agg === 'LAST'){
      var tNow = 'LOOKUP(' + S.cur + ',' + MCr + ',' + tr + ')';
      put(rr, C.ytd, '=IFERROR(IF(OR(COUNT(' + ar + ')=0,N(' + tNow + ')=0),"",' + capF('LOOKUP(10^300,' + ar + ')/' + tNow, code) + '),"")');
    } else {
      var tY = 'SUMPRODUCT(--(' + MCr + '<=' + S.cur + '),' + tr + ')', aY = 'SUMPRODUCT(--(' + MCa + '<=' + S.cur + '),' + ar + ')';
      put(rr, C.ytd, '=IF(' + tY + '=0,"",' + capF(aY + '/' + tY, code) + ')');
    }
    for(var q = 0; q < 4; q++){
      var t1 = TC(q * 3), t3 = TC(q * 3 + 2), a1 = AC(q * 3), a3 = AC(q * 3 + 2);
      var started = t1 + '$' + MC + '>' + S.cur;
      if(agg === 'LAST'){
        var tq = '(LOOKUP(MIN(' + S.cur + ',' + t3 + '$' + MC + '),' + MCr + ',' + tr + ')' + (q ? '-N(' + TC(q * 3 - 1) + rr + ')' : '') + ')';
        var aq = '(LOOKUP(10^300,' + AC(0) + rr + ':' + a3 + rr + ')' + (q ? '-IFERROR(LOOKUP(10^300,' + AC(0) + rr + ':' + AC(q * 3 - 1) + rr + '),0)' : '') + ')';
        put(rr, C.q0 + q, '=IFERROR(IF(OR(' + started + ',COUNT(' + AC(0) + rr + ':' + a3 + rr + ')=0,' + tq + '=0),"",' +
            capF(aq + '/' + tq, code) + '),"")');
      } else {
        var mq = t1 + '$' + MC + ':' + t3 + '$' + MC;
        var tq2 = 'SUMPRODUCT(--(' + mq + '<=' + S.cur + '),' + t1 + rr + ':' + t3 + rr + ')';
        var aq2 = 'SUMPRODUCT(--(' + mq + '<=' + S.cur + '),' + a1 + rr + ':' + a3 + rr + ')';
        put(rr, C.q0 + q, '=IF(OR(' + started + ',' + tq2 + '=0),"",' + capF(aq2 + '/' + tq2, code) + ')');
      }
    }
  }
  function numFmt(unit){ return '#,##0'; }

  var kpiRows = [], picTot = [];
  spec.pics.forEach(function(p, pi){
    var rp = row(); put(rp, 1, 'pic', { fc: GREY, fs: 7 });
    put(rp, C.code, '▸ ' + p.pic + ' — ' + p.role); stl(rp, 2, NC, { bg: PICB, b: 1 });
    var first = 0, last = 0;
    p.rows.forEach(function(x){
      var rr = row(); if(!first) first = rr; last = rr;
      kpiRows.push({ r: rr, x: x, pic: p.pic });
      put(rr, 1, 'kpi:' + x.key, { fc: GREY, fs: 7 });
      put(rr, C.code, x.code, { b: 1, ha: 'center' }); put(rr, C.pic, p.pic, { ha: 'center' }); put(rr, C.name, x.name, { wrap: 1 });
      put(rr, C.unit, x.unit, { ha: 'center' }); put(rr, C.w, x.w == null ? '' : x.w, { nf: '0%', ha: 'center', fc: BLUE });
      put(rr, C.agg, T[x.agg] || x.agg, { ha: 'center', fc: '#595959' });
      for(var i = 0; i < 12; i++){
        var tv = x.t && x.t[i] != null ? x.t[i] : '';
        put(rr, C.t0 + i, tv, { bg: INP, fc: BLUE, nf: numFmt(x.unit) });
        if(K68_MANUAL[x.key]) put(rr, C.a0 + i, '', { bg: INP, fc: BLUE, nf: numFmt(x.unit) });
        else put(rr, C.a0 + i, actualFormula(x.key, rr, i, p.pic), { nf: numFmt(x.unit) });
      }
      rowCalc(rr, x.agg, x.code);
      put(rr, C.score, '=IF(OR(' + A(C.pct) + rr + '="",N(' + A(C.w) + rr + ')=0),"",' + A(C.pct) + rr + '*' + A(C.w) + rr + ')', { nf: '0.0%' });
      put(rr, C.src, T.src[x.key] || '', { fc: '#595959', fs: 9, wrap: 1 });
      stl(rr, C.tFY, C.tFY, { nf: numFmt(x.unit), b: 1 }); stl(rr, C.aFY, C.aFY, { nf: numFmt(x.unit), b: 1 });
      stl(rr, C.pct, C.q0 + 3, { nf: '0%', ha: 'center' });
      /* ⭐ v10.0 — bỏ dòng "SKU mới" nhập tay: SKU mới là case đã duyệt ở sheet NEW ACCOUNT & SKU */
    });
    var rt = row(); put(rt, 1, 'tot', { fc: GREY, fs: 7 });
    put(rt, C.pic, p.pic, { ha: 'center' }); put(rt, C.name, T.tot.replace('{p}', p.pic));
    var W = A(C.w) + first + ':' + A(C.w) + last;
    put(rt, C.w, '=SUM(' + W + ')', { nf: '0%', ha: 'center' });
    [C.pct, C.ytd, C.q0, C.q0 + 1, C.q0 + 2, C.q0 + 3].forEach(function(cc){
      var R = A(cc) + first + ':' + A(cc) + last;
      put(rt, cc, '=IFERROR(SUMPRODUCT(IFERROR(' + R + '*1,0),' + W + ')/SUMPRODUCT(--(' + R + '<>""),' + W + '),"")', { nf: '0%', ha: 'center' });
    });
    put(rt, C.score, '=IF(COUNT(' + A(C.score) + first + ':' + A(C.score) + last + ')=0,"",SUM(' + A(C.score) + first + ':' + A(C.score) + last + '))', { nf: '0.0%' });
    stl(rt, 2, NC, { bg: TOT, b: 1 });
    picTot.push({ pic: p.pic, r: rt });
    row();
  });
  var bFirst = kpiRows.length ? kpiRows[0].r : MD + 1, bLast = kpiRows.length ? kpiRows[kpiRows.length - 1].r + 1 : MD + 1;

  var unitOf = {}, aggOf = {}; kpiRows.forEach(function(k){ unitOf[k.x.code] = k.x.unit; aggOf[k.x.code] = k.x.agg; });
  aRows.forEach(function(o){
    var rr = o.r, g = o.g, codes = g[2], BR = '$' + A(C.code) + '$' + bFirst + ':$' + A(C.code) + '$' + bLast;
    put(rr, 1, 'grp', { fc: GREY, fs: 7 });
    put(rr, C.code, g[0], { b: 1, ha: 'center' }); put(rr, C.name, g[1], { wrap: 1 });
    var unit = unitOf[codes[0]] || '', agg = aggOf[codes[0]] || 'SUM';
    put(rr, C.unit, unit, { ha: 'center' }); put(rr, C.agg, T[agg] || agg, { ha: 'center', fc: '#595959' });
    for(var i = 0; i < 12; i++){
      [C.t0 + i, C.a0 + i].forEach(function(cc){
        var col = A(cc) + '$' + bFirst + ':' + A(cc) + '$' + bLast;
        var sum = codes.map(function(c){ return 'SUMIF(' + BR + ',"' + c + '",' + col + ')'; }).join('+');
        var cnt = codes.map(function(c){ return 'COUNTIFS(' + BR + ',"' + c + '",' + col + ',"<>")'; }).join('+');
        put(rr, cc, agg === 'LAST' ? '=IF(' + cnt + '=0,"",' + sum + ')' : '=' + sum, { nf: '#,##0' });
      });
    }
    rowCalc(rr, agg, g[0].charAt(0) === 'F' ? 'F' : 'C');
    put(rr, C.src, codes.join(', '), { fc: '#595959', fs: 9 });
    stl(rr, C.tFY, C.aFY, {}); stl(rr, C.tFY, C.tFY, { nf: '#,##0', b: 1 }); stl(rr, C.aFY, C.aFY, { nf: '#,##0', b: 1 });
    stl(rr, C.pct, C.q0 + 3, { nf: '0%', ha: 'center' });
  });

  var rC = row(); put(rC, 1, 'partC', { fc: GREY, fs: 7 }); put(rC, 2, T.partC); stl(rC, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rCh = row(); put(rCh, 1, 'hdrC', { fc: GREY, fs: 7 });
  put(rCh, 2, T.rQ); put(rCh, 3, T.hPic); put(rCh, 4, T.rRes); put(rCh, 5, T.rWhy); put(rCh, 9, T.rPlan); put(rCh, 15, T.rMgr); put(rCh, 21, T.rPct);
  merges.push([rCh, 5, rCh, 8], [rCh, 9, rCh, 14], [rCh, 15, rCh, 20]);
  stl(rCh, 2, 21, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  for(q = 0; q < 4; q++){
    picTot.forEach(function(pt){
      var rr = row(); put(rr, 1, 'review', { fc: GREY, fs: 7 });
      put(rr, 2, 'Q' + (q + 1), { b: 1, ha: 'center' }); put(rr, 3, pt.pic, { ha: 'center' });
      put(rr, 4, '', { wrap: 1 }); merges.push([rr, 5, rr, 8], [rr, 9, rr, 14], [rr, 15, rr, 20]);
      stl(rr, 5, 20, { wrap: 1 });
      put(rr, 21, '=' + A(C.q0 + q) + pt.r, { nf: '0%', ha: 'center', b: 1 });
      heights[rr] = 42;
    });
  }

  if(keep){
    if(keep.set) for(var sk in keep.set){ var a1 = K68_SET[sk]; if(!a1 || sk === 'cur' || sk === 'fy') continue;
      var m = /^([A-Z]+)(\d+)$/.exec(a1), cc = 0; for(var z = 0; z < m[1].length; z++) cc = cc * 26 + m[1].charCodeAt(z) - 64;
      if(sk === 'comp2' && String(keep.set[sk]).toLowerCase() === 'mmg') continue;
      if(sk === 'photo'){ var pv = k68Str_(keep.set[sk]).toUpperCase(); keep.set[sk] = (pv === 'CÓ' || pv === 'YES') ? T.yes : (pv === 'KHÔNG' || pv === 'NO') ? T.no : keep.set[sk]; }
      if(grid[+m[2] - 1] && grid[+m[2] - 1][1] && keep.set[sk] !== '' && keep.set[sk] != null) grid[+m[2] - 1][cc - 1] = keep.set[sk]; }
    if(keep.set && keep.set.fy) grid[3][2] = keep.set.fy;
    kpiRows.forEach(function(k){
      var o = keep.rows[k.x.code]; if(!o) return;
      for(var i = 0; i < 12; i++){
        if(o.t && o.t[i] !== '' && o.t[i] != null) grid[k.r - 1][C.t0 + i - 1] = o.t[i];
        if(K68_MANUAL[k.x.key] && o.a && o.a[i] !== '' && o.a[i] != null) grid[k.r - 1][C.a0 + i - 1] = o.a[i];
      }
    });
    if(keep.review){ grid.forEach(function(g, i){ if(g[0] === 'review'){ var kk = g[1] + '|' + g[2], v = keep.review[kk]; if(v){ g[3] = v[0]; g[4] = v[1]; g[8] = v[2]; g[14] = v[3]; } } }); }
  }
  return { grid: grid, sty: sty, merges: merges, heights: heights, kpiRows: kpiRows, aRows: aRows, picTot: picTot,
           MC: MC, MD: MD, rH: rH, rA: rA, rB: rB, lang: L, useKw: useKw, usePhoto: usePhoto };
}

/* ghi kết quả k68Build_ ra sheet thật */
function k68Write_(sh, B){
  var nr = B.grid.length, NC = K68.NC;
  if(sh.getMaxColumns() < NC) sh.insertColumnsAfter(sh.getMaxColumns(), NC - sh.getMaxColumns());
  if(sh.getMaxRows() < nr + 20) sh.insertRowsAfter(sh.getMaxRows(), nr + 20 - sh.getMaxRows());
  var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  try{ all.breakApart(); }catch(e){}
  all.clear(); try{ all.clearDataValidations(); }catch(e){}
  try{ sh.setConditionalFormatRules([]); }catch(e){}
  var rg = sh.getRange(1, 1, nr, NC);
  function mapS(f, d){ return B.sty.map(function(r){ return r.map(function(o){ var v = f(o); return v == null ? d : v; }); }); }
  rg.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  rg.setNumberFormats(mapS(function(o){ return o.nf; }, '0.###############'));
  function isF(x){ return typeof x === 'string' && x.charAt(0) === '='; }
  rg.setValues(B.grid.map(function(r){ return r.map(function(x){ return isF(x) ? '' : x; }); }));
  var SEMI = fmlSemi_(sh);
  B.grid.forEach(function(row, i){
    var j = 0;
    while(j < NC){
      if(!isF(row[j])){ j++; continue; }
      var k = j; while(k < NC && isF(row[k])) k++;
      sh.getRange(i + 1, j + 1, 1, k - j).setFormulas([row.slice(j, k).map(function(f){ return fmlLoc_(f, SEMI); })]);
      j = k;
    }
  });
  rg.setBackgrounds(mapS(function(o){ return o.bg; }, null));
  rg.setFontColors(mapS(function(o){ return o.fc; }, '#000000'));
  rg.setFontWeights(mapS(function(o){ return o.b ? 'bold' : 'normal'; }, 'normal'));
  rg.setFontStyles(mapS(function(o){ return o.i ? 'italic' : 'normal'; }, 'normal'));
  rg.setFontSizes(mapS(function(o){ return o.fs; }, 10));
  rg.setHorizontalAlignments(mapS(function(o){ return o.ha; }, 'left'));
  rg.setWraps(mapS(function(o){ return !!o.wrap; }, false));
  B.merges.forEach(function(m){ sh.getRange(m[0], m[1], m[2] - m[0] + 1, m[3] - m[1] + 1).merge(); });
  for(var r in B.heights) sh.setRowHeight(+r, B.heights[r]);
  var W = { 1: 22, 2: 78, 3: 78, 4: 360, 5: 70, 6: 64, 7: 80, 8: 90, 21: 95, 34: 72, 35: 84, 40: 86, 41: 430 };
  for(var c = 1; c <= NC; c++) sh.setColumnWidth(c, W[c] || (c >= 36 && c <= 39 ? 62 : 72));
  sh.setFrozenColumns(4);
  var T = K68_TXT[B.lang];
  sh.getRange(K68_SET.fy).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['FY67','FY68','FY69','FY70','FY71'], true).build());
  if(B.usePhoto) sh.getRange(K68_SET.photo).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([T.yes, T.no], true).build());
  var rules = [], lastTot = B.picTot[B.picTot.length - 1].r;
  [[B.rA + 2, Math.max(B.aRows.length, 1)], [B.MD + 1, lastTot - B.MD]].forEach(function(z){
    var rg0 = sh.getRange(z[0], K68.pct, z[1], 6), a1 = k68Col_(K68.pct) + z[0];
    [['>=1', '#C6EFCE', '#006100'], ['>=4/5', '#FFEB9C', '#9C5700'], ['<4/5', '#FFC7CE', '#9C0006']].forEach(function(c, i){
      var f = i === 1 ? '=AND(ISNUMBER(' + a1 + '),' + a1 + '>=4/5,' + a1 + '<1)' : '=AND(ISNUMBER(' + a1 + '),' + a1 + c[0] + ')';
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f).setBackground(c[1]).setFontColor(c[2]).setRanges([rg0]).build());
    });
  });
  sh.setConditionalFormatRules(rules);
  sh.getRange(B.rA + 1, 2, (B.aRows.length || 0) + 1, NC - 1).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(B.rH - 1, 2, B.picTot[B.picTot.length - 1].r - B.rH + 2, NC - 1).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
}

/* đọc dữ liệu nhập tay của tab (để dựng lại không mất) */
function k68Snapshot_(sh){
  var lr = sh.getLastRow(); if(lr < 5) return null;
  var v = sh.getRange(1, 1, lr, K68.NC).getValues(), f = sh.getRange(1, 1, lr, K68.NC).getFormulas();
  if(!v.some(function(r){ return k68Str_(r[0]) === 'hdr'; })) return null;
  var out = { set: {}, rows: {}, review: {} };
  for(var k in K68_SET){ var a = K68_SET[k], m = /^([A-Z]+)(\d+)$/.exec(a), c = 0; for(var z = 0; z < m[1].length; z++) c = c * 26 + m[1].charCodeAt(z) - 64;
    var rr = +m[2] - 1; if(rr < v.length && !f[rr][c - 1]) out.set[k] = v[rr][c - 1]; }
  for(var i = 0; i < v.length; i++){
    var tag = k68Str_(v[i][0]);
    if(/^kpi:/.test(tag)){
      var code = k68Str_(v[i][K68.code - 1]), o = out.rows[code] = { t: [], a: [], sku: [] };
      for(var j = 0; j < 12; j++){
        o.t.push(f[i][K68.t0 - 1 + j] ? '' : v[i][K68.t0 - 1 + j]);
        o.a.push(f[i][K68.a0 - 1 + j] ? '' : v[i][K68.a0 - 1 + j]);
        if(i + 1 < v.length && k68Str_(v[i + 1][0]) === 'sku') o.sku.push(f[i + 1][K68.a0 - 1 + j] ? '' : v[i + 1][K68.a0 - 1 + j]);
      }
    }
    if(tag === 'review'){ var rv = [v[i][3], v[i][4], v[i][8], v[i][14]]; if(rv.some(function(x){ return k68Str_(x); })) out.review[v[i][1] + '|' + v[i][2]] = rv; }
  }
  return out;
}

/* dựng (hoặc dựng lại) tab KPI — tab cũ không đúng mẫu được đổi tên và ẩn đi */
function k68Setup_(ssx, name, team){
  try{ naSheet_(); }catch(e){}        /* ⭐ v10.0 — công thức C1 tham chiếu sheet NEW ACCOUNT & SKU ⇒ phải có trước */
  var T = K68_TXT[(K68_SPEC[team] || {}).lang || 'vi'];
  var sht = ssx.getSheetByName(name), keep = null, idx = null;
  if(sht){
    keep = k68Snapshot_(sht);
    if(!keep){
      idx = sht.getIndex ? sht.getIndex() : null;
      var old = T.oldName, n = 2; while(ssx.getSheetByName(old)) old = T.oldName + ' ' + (n++);
      sht.setName(old); try{ sht.hideSheet(); }catch(e){}
      sht = idx ? ssx.insertSheet(name, idx - 1) : ssx.insertSheet(name);
    }
  } else sht = ssx.insertSheet(name);
  var B = k68Build_(sht, team, keep);
  k68Write_(sht, B);
  try { SpreadsheetApp.flush(); k68CalcSupp_(sht); } catch(e){}      /* ⭐ v10.1 */
  return { sheet: sht, rows: B.kpiRows.length, kept: !!keep, build: B };
}

/* ════════════════ 2. ĐỌC TAB KPI CHO WEB APP ════════════════ */
function k68Read_(sh){
  var lr = sh.getLastRow(); if(lr < 5) return null;
  var v = sh.getRange(1, 1, lr, K68.NC).getValues(), C = K68, out = { groups: [], pics: [], months: [], settings: {} }, cur = null;
  if(!v.some(function(r){ return k68Str_(r[0]) === 'hdr'; })) return null;
  function nums(r, c0){ var a = []; for(var j = 0; j < 12; j++) a.push(k68Num_(r[c0 - 1 + j])); return a; }
  function pack(r, i, tag){
    return { row: i + 1, key: tag.replace(/^kpi:/, ''), code: k68Str_(r[C.code - 1]), pic: k68Str_(r[C.pic - 1]), name: k68Str_(r[C.name - 1]),
      unit: k68Str_(r[C.unit - 1]), w: k68Num_(r[C.w - 1]), agg: k68Str_(r[C.agg - 1]), tFY: k68Num_(r[C.tFY - 1]), t: nums(r, C.t0),
      aFY: k68Num_(r[C.aFY - 1]), a: nums(r, C.a0), pct: k68Num_(r[C.pct - 1]), ytd: k68Num_(r[C.ytd - 1]),
      q: [0,1,2,3].map(function(q){ return k68Num_(r[C.q0 - 1 + q]); }), score: k68Num_(r[C.score - 1]), src: k68Str_(r[C.src - 1]),
      manual: !!K68_MANUAL[tag.replace(/^kpi:/, '')] };
  }
  for(var i = 0; i < v.length; i++){
    var r = v[i], tag = k68Str_(r[0]);
    if(!tag) continue;
    if(/^set:/.test(tag)){ var sk = tag.slice(4); out.settings[sk] = r[sk === 'fy' ? 2 : 3]; if(sk === 'sync') out.settings.checked = r[4]; continue; }
    if(tag === 'months'){ out.months = nums(r, C.t0).map(function(x){ return x == null ? '' : String(Math.round(x)); }); continue; }
    if(tag === 'hdr'){ out.monthLabels = []; for(var j = 0; j < 12; j++) out.monthLabels.push(k68Str_(r[C.a0 - 1 + j])); continue; }
    if(tag === 'grp'){ out.groups.push(pack(r, i, tag)); continue; }
    if(tag === 'pic'){ var s0 = k68Str_(r[C.code - 1]).replace(/^▸\s*/, ''), pp = s0.split(' — '); cur = { pic: pp[0], role: pp.slice(1).join(' — '), rows: [], total: null }; out.pics.push(cur); continue; }
    if(/^kpi:/.test(tag) && cur){ cur.rows.push(pack(r, i, tag)); continue; }
    if(tag === 'sku' && cur && cur.rows.length){ cur.rows[cur.rows.length - 1].sku = nums(r, C.a0); continue; }
    if(tag === 'tot' && cur){ cur.total = { w: k68Num_(r[C.w - 1]), pct: k68Num_(r[C.pct - 1]), ytd: k68Num_(r[C.ytd - 1]),
      q: [0,1,2,3].map(function(q){ return k68Num_(r[C.q0 - 1 + q]); }), score: k68Num_(r[C.score - 1]) }; continue; }
  }
  var d = out.settings.sync; out.settings.sync = d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') : k68Str_(d);
  out.settings.hasLink = !!(k68IdOf_(out.settings.link) || k68IdOf_(K68_MASTER_LINK)); delete out.settings.link;
  out.settings.checked = k68Str_(out.settings.checked).replace(/^(KPI Hub kiểm tra|KPI Hub check):\s*/, '');
  if(!out.settings.checked){ try{ out.settings.checked = PropertiesService.getScriptProperties().getProperty('K68_LASTCHECK') || ''; }catch(e){} }
  out.fy = k68Str_(out.settings.fy);
  return out;
}
/* khối "blocks" kiểu cũ cho thẻ Dashboard (visiting · present · newacct) */
function k68Legacy_(R){
  var map = { visiting: /^visit_/, present: /^event_mmh/, newacct: /^newacct_/ }, out = [];
  Object.keys(map).forEach(function(id){
    var t = 0, a = 0, hit = false;
    R.pics.forEach(function(p){ p.rows.forEach(function(x){
      if(!map[id].test(x.key)) return;
      if(id === 'present' && x.key === 'event_mmh' && R.pics.some(function(pp){ return pp.rows.some(function(y){ return y.key === 'event_mmh_team'; }); })) return;
      hit = true; t += x.tFY || 0; a += x.aFY || 0; }); });
    if(hit) out.push({ id: id, rows: [], grand: { targetFY: t, fyActual: a } });
  });
  return out;
}

/* ════════════════ 3. ĐỒNG BỘ 2 CHIỀU VỚI FILE KPI TỔNG (MMH KPI FY68) ════════════════
 * ① CRM → file KPI tổng : actual tự tính đẩy sang cột "<tháng> Actual" của sheet 3. Detail KPI.
 * ② file KPI tổng → CRM : target 12 tháng + actual do nguồn khác (doanh số NPP mã F…) dán về tab KPI.
 * Tháng đã chốt (sau 16:00 ngày 2 tháng sau) không bị ghi đè. */
var K68_MASTER_LINK = 'https://docs.google.com/spreadsheets/d/1iWV0PfyvyL3MzBlR7R4xCIOVxPqRcLM4Dr3rOSfQ6m8/edit?gid=2112288311#gid=2112288311';
var K68_LINKS_SHEET = '_CRM_LINKS';

function k68LinkAdapter_(link){
  var id = k68IdOf_(link) || k68IdOf_(K68_MASTER_LINK); if(!id) throw new Error('no-link');
  var ms = SpreadsheetApp.openById(id);
  return { mode: 'link', ss: ms, pull: function(codes){ return kh_read_(ms, codes); },
    push: function(src, rows){ var st = kh_write_(ms, src, rows); if(st.cells) kh_log_(ms, src, 'push', st.codes + ' mã · ' + st.cells + ' ô'); return st; } };
}
function k68Master_(link){ return k68LinkAdapter_(link); }
function k68Register_(masterSS, crmSS, tab, source, lang){
  var sht = masterSS.getSheetByName(K68_LINKS_SHEET) || k68LinksSheet_(masterSS);
  var n = Math.max(sht.getLastRow() - 1, 0), V = n ? sht.getRange(2, 1, n, 3).getValues() : [], row = 0;
  for(var i = 0; i < V.length; i++) if(k68Str_(V[i][0]) === source){ row = i + 2; break; }
  if(!row){ row = sht.getLastRow() + 1; }
  sht.getRange(row, 1, 1, 5).setValues([[source, crmSS.getUrl(), tab, lang, Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')]]);
  return row;
}
function k68LinksSheet_(ssx){
  var sht = ssx.insertSheet(K68_LINKS_SHEET);
  sht.getRange(1, 1, 1, 7).setValues([['Nguồn (team)', 'File CRM (link Google Sheet)', 'Tab KPI', 'Ngôn ngữ', 'Đăng ký lúc', 'Đồng bộ lần cuối', 'Kết quả']]).setFontWeight('bold').setBackground('#D9E1F2');
  sht.getRange(2, 1, 4, 4).setValues([['dental', '', '9. TARGET & KPI', 'vi'], ['surgical', '', '9. TARGET & KPI', 'vi'], ['eyeless', '', '9. TARGET & KPI', 'vi'], ['thai', '', '9. TARGET & KPI', 'en']]);
  sht.setColumnWidth(2, 420); sht.setColumnWidth(7, 520); sht.setFrozenRows(1);
  try{ sht.hideSheet(); }catch(e){}
  return sht;
}

/* CÔNG THỨC THEO DẤU PHÂN CÁCH CỦA FILE (vùng Việt Nam dùng ";") */
var _FSEMI = {};
function fmlSemi_(sh){
  var id = ''; try{ id = sh.getParent().getId() + '|' + sh.getName(); }catch(e){}
  if(id && _FSEMI[id] !== undefined) return _FSEMI[id];
  var semi = false;
  try{
    var c = sh.getRange(sh.getMaxRows(), sh.getMaxColumns()), f0 = c.getFormula(), v0 = f0 ? '' : c.getValue();
    c.setFormula('=SUM(1,2)'); SpreadsheetApp.flush();
    semi = String(c.getDisplayValue()) !== '3';
    if(semi){ c.setFormula('=SUM(1;2)'); SpreadsheetApp.flush(); if(String(c.getDisplayValue()) !== '3') semi = false; }
    c.clearContent(); if(f0) c.setFormula(f0); else if(v0 !== '' && v0 != null) c.setValue(v0);
  }catch(e){ semi = false; }
  if(id) _FSEMI[id] = semi;
  return semi;
}
function fmlLoc_(f, semi){
  if(!semi || typeof f !== 'string' || f.charAt(0) !== '=') return f;
  var out = '', q = false, sq = false;
  for(var i = 0; i < f.length; i++){
    var ch = f.charAt(i);
    if(ch === '"' && !sq) q = !q;
    else if(ch === "'" && !q) sq = !sq;
    if(!q && !sq){
      if(ch === ','){ out += ';'; continue; }
      if(ch === '.' && /\d/.test(f.charAt(i - 1) || '') && /\d/.test(f.charAt(i + 1) || '')){ out += ','; continue; }
    }
    out += ch;
  }
  return out;
}

function k68Sync_(sh, lang, source, opts){
  opts = opts || {}; lang = lang || 'vi';
  if (opts.manual) { try { k68CalcSupp_(sh); } catch(e){} }          /* ⭐ v10.1 */
  if(lang === 'vi' && source && K68_SPEC[source] && K68_SPEC[source].lang && K68_TXT[K68_SPEC[source].lang]) lang = K68_SPEC[source].lang;
  var T = K68_TXT[lang], EN = lang !== 'vi';
  var lr = sh.getLastRow(), v = sh.getRange(1, 1, lr, K68.NC).getValues(), rebuilt = false;
  if(k68Str_(v[0][0]) !== K68_LAYOUT && !(source && K68_SPEC[source])) return { ok: false, error: EN ? (lang === 'envn' ? 'The KPI tab is still in the old layout. Open that CRM file and run menu "⑪ Tạo lại tab KPI".' : 'The KPI tab is still in the old layout — open that CRM file and run menu "⑤ Rebuild the KPI tab".') : 'Tab KPI còn bố cục cũ — mở file CRM đó, chạy menu "⑪ Tạo lại tab KPI".' };
  var broken = v.some(function(r){ var t = k68Str_(r[0]); return (t === 'months' || t === 'mstart') && /^#/.test(String(r[K68.t0 - 1])); });
  if((k68Str_(v[0][0]) !== K68_LAYOUT || broken) && source && K68_SPEC[source]){
    var nm = sh.getName(), ssx = sh.getParent();
    k68Setup_(ssx, nm, source); SpreadsheetApp.flush(); sh = ssx.getSheetByName(nm); rebuilt = true;
    lr = sh.getLastRow(); v = sh.getRange(1, 1, lr, K68.NC).getValues();
  }
  if(!v.some(function(r){ return k68Str_(r[0]) === 'hdr'; })) return { ok: false, error: T.msgNotBuilt };
  var months = null, i, j;
  for(i = 0; i < v.length; i++) if(k68Str_(v[i][0]) === 'months'){ months = []; for(j = 0; j < 12; j++) months.push(String(Math.round(Number(v[i][K68.t0 - 1 + j]) || 0))); }
  if(!months) return { ok: false, error: T.msgNotBuilt };
  if(months.some(function(m){ return !/^20\d{4}$/.test(m); })) return { ok: rebuilt, rebuilt: rebuilt, changed: rebuilt, message: rebuilt ? (EN ? 'KPI tab rebuilt — sync on the next run' : 'Đã dựng lại tab KPI — đồng bộ ở lượt kế tiếp') : '', error: rebuilt ? '' : T.msgNotBuilt };
  var rows = [];
  for(i = 0; i < v.length; i++){ var tag = k68Str_(v[i][0]); if(/^kpi:/.test(tag)) rows.push({ i: i, key: tag.slice(4), code: k68Str_(v[i][K68.code - 1]) }); }
  var M, R;
  try{ M = opts.adapter || k68Master_(sh.getRange(K68_SET.link).getValue()); }
  catch(e){ return { ok: false, error: /no-link/.test(String(e)) ? T.msgNoLink : T.msgNoMaster + (e && e.message || e) + T.msgAuth }; }
  try{ R = M.pull(rows.map(function(x){ return x.code; })); }
  catch(e){ return { ok: false, error: T.msgNoMaster + (e && e.message || e) + T.msgAuth }; }
  var idx = months.map(function(m){ return R.months.indexOf(m); });
  var curYm = Number(Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM'));
  var nT = 0, nPull = 0, miss = [], push = {}, nPushRows = 0;
  function eq(a, b){ var x = k68Num_(a), y = k68Num_(b); if(x == null || y == null) return x == null && y == null; return Math.abs(x - y) < 0.005; }
  rows.forEach(function(x){
    var o = R.rows[x.code]; if(!o){ miss.push(x.code); return; }
    var line = v[x.i];
    var tRow = [], tChg = false;
    for(j = 0; j < 12; j++){ var tv = idx[j] < 0 || o.t[idx[j]] == null ? '' : o.t[idx[j]]; tRow.push(tv); if(!eq(tv, line[K68.t0 - 1 + j])) tChg = true; }
    if(tChg){ sh.getRange(x.i + 1, K68.t0, 1, 12).setValues([tRow]); nT++; }
    var up = R.months.map(function(){ return null; }), any = false;
    if(K68_MANUAL[x.key]){
      var aRow = [], aChg = false;
      for(j = 0; j < 12; j++){
        var mv = idx[j] < 0 ? null : o.a[idx[j]], crm = line[K68.a0 - 1 + j];
        if(mv != null){ aRow.push(mv); if(!eq(mv, crm)) aChg = true; }
        else { aRow.push(crm); if(k68Num_(crm) != null && idx[j] >= 0 && !R.locked[idx[j]] && o.kind[idx[j]] !== 'calc'){ up[idx[j]] = k68Num_(crm); any = true; } }
      }
      if(aChg){ sh.getRange(x.i + 1, K68.a0, 1, 12).setValues([aRow]); nPull++; }
    } else if(!o.rollup){
      for(j = 0; j < 12; j++){
        var k = idx[j]; if(k < 0 || Number(months[j]) > curYm || (R.locked[k] && !k68Forced_(x.code)) || o.kind[k] === 'calc') continue;
        var val = k68Num_(line[K68.a0 - 1 + j]); if(val == null) continue;
        val = Math.round(val * 100) / 100;
        if(!eq(val, o.a[k])){ up[k] = val; any = true; }
      }
    }
    if(any){ push[x.code] = up; nPushRows++; }
  });
  var st = null, pushErr = '';
  if(nPushRows){ try{ st = M.push(source || 'crm', push); }catch(e){ pushErr = String(e && e.message || e); } }
  var nPush = st ? st.codes : 0, now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  try{ PropertiesService.getScriptProperties().setProperty('K68_LASTCHECK', now); }catch(e){}
  var msg = now + (EN
    ? ' · ' + nT + ' target row(s) · ' + nPull + ' row(s) pulled from the KPI file · ' + nPush + ' row(s) pushed' + (st && st.cells ? ' (' + st.cells + ' cells)' : '')
    : ' · ' + nT + ' dòng target · ' + nPull + ' dòng kéo từ file KPI · ' + nPush + ' dòng đẩy lên' + (st && st.cells ? ' (' + st.cells + ' ô)' : '')) +
    (st && st.locked ? (EN ? ' · ' + st.locked + ' cell(s) of closed months skipped' : ' · bỏ qua ' + st.locked + ' ô tháng đã chốt') : '') +
    (st && st.owner && st.owner.length ? (EN ? ' · ⚠️ owned by another CRM: ' : ' · ⚠️ mã do file CRM khác ghi: ') + st.owner.join(', ') : '') +
    (miss.length ? (EN ? ' · not in the KPI file: ' : ' · file KPI không có mã: ') + miss.join(', ') : '') +
    (pushErr ? (EN ? ' · ⚠️ push failed: ' : ' · ⚠️ chưa đẩy được: ') + pushErr : '') +
    (rebuilt ? (EN ? ' · KPI tab rebuilt to the new layout' : ' · đã dựng lại tab KPI theo bố cục mới') : '') +
    (opts.byHub ? (EN ? ' · by the KPI Hub' : ' · do KPI Hub chạy') : '');
  var changed = nT || nPull || nPush || pushErr || rebuilt;
  if(changed || opts.manual){ sh.getRange(K68_SET.sync).setValue(msg); SpreadsheetApp.flush(); }
  if(opts.byHub){ try{ sh.getRange('E' + K68_SET.sync.replace(/\D/g, '')).setValue((EN ? 'KPI Hub check: ' : 'KPI Hub kiểm tra: ') + now); }catch(e){} }
  var late = null; try{ if(M.ss){ var lo = kh_late_(M.ss); if(lo.month) late = { month: lo.month, until: lo.until }; } }catch(eL){}
  return { ok: true, rebuilt: rebuilt, message: msg, targets: nT, pulled: nPull, pushed: nPush, cells: st ? st.cells : 0, missing: miss, changed: !!changed, mode: M.mode, error2: pushErr,
           locked: st ? (st.locked || 0) : 0, lockedMonths: st && st.lockedMonths ? Object.keys(st.lockedMonths) : [], late: late };
}

/* ─────────── KPI HUB CORE — đọc / ghi sheet "3. Detail KPI" của file MMH KPI FY68 ─────────── */
var KH_SHEET = '3. Detail KPI', KH_LOG = '_CRM_SYNC_LOG', KH_TZ = 'Asia/Ho_Chi_Minh';

function kh_str_(v){ return v === null || v === undefined ? '' : String(v).trim(); }
function kh_num_(v){ if(v === '' || v === null || v === undefined) return null; var n = Number(v); return isNaN(n) ? null : n; }
function kh_now_(){
  try{ var t = PropertiesService.getScriptProperties().getProperty('KH_TEST_NOW'); if(t) return new Date(t); }catch(e){}
  return new Date();
}
/* ⭐ v10.4 — CỬA SỔ NHẬN SỐ TRỄ: tháng đã chốt vẫn nhận số CRM tới hạn ghi ở sheet _CRM_LINKS của file KPI
   (I1 nhãn · J1 tháng YYYYMM · K1 hạn YYYY-MM-DD). File KPI (KpiSyncCenter v1.17) đọc đúng 2 ô này. */
var _KH_LATE = null;
function kh_late_(ssx){
  if(_KH_LATE && _KH_LATE.id === ssx.getId()) return _KH_LATE;
  var o = { id: ssx.getId(), month: '', until: '' };
  try{
    var sh = ssx.getSheetByName('_CRM_LINKS');
    if(sh){ var v = sh.getRange('J1:K1').getValues()[0];
      o.month = String(v[0] || '').replace(/\D/g, '').slice(0, 6);
      o.until = Object.prototype.toString.call(v[1]) === '[object Date]' ? Utilities.formatDate(v[1], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(v[1] || '').trim().slice(0, 10); }
  }catch(e){}
  _KH_LATE = o; return o;
}
function kh_isOpen_(ssx, ym){
  var o = kh_late_(ssx); if(!o.month || !o.until) return false;
  return String(ym) === o.month && Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') <= o.until;
}
function kh_setLate_(ssx, month, until){
  var sh = ssx.getSheetByName('_CRM_LINKS'); if(!sh) throw new Error('File KPI chưa có sheet _CRM_LINKS');
  sh.getRange('I1:K1').setValues([['Nhận số CRM trễ cho tháng · hạn', String(month || ''), String(until || '')]]);
  sh.getRange('J1:K1').setNumberFormat('@'); _KH_LATE = null;
}
/* BỎ RULE CHỐT SỐ THÁNG (03/10/2026): không tháng nào bị khoá — CRM ghi đè realtime mọi tháng ≤ tháng hiện tại */
function kh_locked_(ym){ return false; }
function kh_kind_(f){
  if(!f) return 'none';
  return /^=\s*\$?[A-Z]{1,3}\$?\d+\s*$/.test(f) ? 'placeholder' : 'calc';
}
function kh_layout_(sht){
  var lr = sht.getLastRow(), lc = Math.min(sht.getLastColumn(), 80);
  var V = sht.getRange(1, 1, lr, lc).getValues();
  var hr = -1, cc = -1, H = {};
  for(var i = 0; i < Math.min(lr, 15) && hr < 0; i++) for(var j = 0; j < lc; j++) if(kh_str_(V[i][j]).toLowerCase() === 'kpi code'){ hr = i; cc = j; break; }
  if(hr < 0) throw new Error('Sheet "' + KH_SHEET + '" không có dòng tiêu đề "KPI Code"');
  var months = [], tCol = {}, aCol = {};
  V[hr].forEach(function(h, j){
    var s = kh_str_(h), m = /^(\d{6})\s+(target|actual)$/i.exec(s); if(!m) { H[s.toLowerCase()] = j; return; }
    if(/target/i.test(m[2])){ tCol[m[1]] = j; if(months.indexOf(m[1]) < 0) months.push(m[1]); } else aCol[m[1]] = j;
  });
  months.sort();
  var rows = {};
  for(i = hr + 1; i < lr; i++){ var c = kh_str_(V[i][cc]); if(c && !rows[c]) rows[c] = i; }
  return { V: V, hr: hr, cc: cc, H: H, months: months, tCol: tCol, aCol: aCol, rows: rows, lr: lr, lc: lc };
}
function kh_read_(ssx, codes){
  var sht = ssx.getSheetByName(KH_SHEET); if(!sht) throw new Error('Không có sheet "' + KH_SHEET + '"');
  var L = kh_layout_(sht), F = sht.getRange(1, 1, L.lr, L.lc).getFormulas(), out = {};
  var want = (codes && codes.length) ? codes : Object.keys(L.rows);
  var locked = L.months.map(function(m){ return kh_locked_(m) && !kh_isOpen_(ssx, m); });   /* ⭐ cửa sổ nhận số trễ */
  function col(name){ return L.H[name] == null ? null : L.H[name]; }
  want.forEach(function(code){
    var r = L.rows[code]; if(r == null) return;
    var o = { t: [], a: [], kind: [] };
    L.months.forEach(function(m){
      var tj = L.tCol[m], aj = L.aCol[m];
      o.t.push(tj == null ? null : kh_num_(L.V[r][tj]));
      var k = aj == null ? 'none' : kh_kind_(F[r][aj]);
      o.kind.push(k);
      o.a.push(aj == null || k === 'placeholder' ? null : kh_num_(L.V[r][aj]));
    });
    var nm = col('detail kpi'), un = col('unit'), ag = col('agg'), mb = col('members involved'), pr = col('parent'), lv = col('level');
    o.name = nm == null ? '' : kh_str_(L.V[r][nm]); o.unit = un == null ? '' : kh_str_(L.V[r][un]);
    o.agg = ag == null ? '' : kh_str_(L.V[r][ag]); o.members = mb == null ? '' : kh_str_(L.V[r][mb]);
    o.parent = pr == null ? '' : kh_str_(L.V[r][pr]); o.level = lv == null ? '' : kh_str_(L.V[r][lv]);
    o.rollup = o.kind.some(function(k){ return k === 'calc'; });
    out[code] = o;
  });
  return { months: L.months, locked: locked, rows: out };
}
function kh_write_(ssx, source, rows){
  var sht = ssx.getSheetByName(KH_SHEET); if(!sht) throw new Error('Không có sheet "' + KH_SHEET + '"');
  var L = kh_layout_(sht), F = sht.getRange(1, 1, L.lr, L.lc).getFormulas(), P = PropertiesService.getScriptProperties();
  var st = { cells: 0, codes: 0, locked: 0, rollup: 0, missing: [], owner: [] };
  var aCols = L.months.map(function(m){ return L.aCol[m]; }).filter(function(x){ return x != null; });
  if(!aCols.length) return st;
  Object.keys(rows || {}).forEach(function(code){
    var r = L.rows[code]; if(r == null){ st.missing.push(code); return; }
    var own = P.getProperty('KH_OWN_' + code);
    if(own && own !== source){ st.owner.push(code + '→' + own); return; }
    var vals = rows[code] || [], cells = [];
    L.months.forEach(function(m, i){
      var aj = L.aCol[m]; if(aj == null) return;
      var v = vals[i]; if(v === null || v === undefined || v === '') return;
      var k = kh_kind_(F[r][aj]);
      if(k === 'calc'){ st.rollup++; return; }
      if(kh_locked_(m) && !k68Forced_(code) && !kh_isOpen_(ssx, m)){ st.locked++; (st.lockedMonths = st.lockedMonths || {})[m] = 1; return; }
      v = Math.round(Number(v) * 100) / 100; if(isNaN(v)) return;
      if(k === 'none' && kh_num_(L.V[r][aj]) === v) return;
      cells.push([aj, v]);
    });
    cells.forEach(function(c){ sht.getRange(r + 1, c[0] + 1).setValue(c[1]); st.cells++; });
    if(cells.length){ st.codes++; if(!own) P.setProperty('KH_OWN_' + code, source); }
  });
  return st;
}
function kh_log_(ssx, source, action, detail){
  try{
    var sht = ssx.getSheetByName(KH_LOG);
    if(!sht){ sht = ssx.insertSheet(KH_LOG); sht.getRange(1, 1, 1, 4).setValues([['Thời điểm', 'Nguồn', 'Thao tác', 'Chi tiết']]).setFontWeight('bold'); try{ sht.hideSheet(); }catch(e){} }
    sht.insertRowAfter(1);
    sht.getRange(2, 1, 1, 4).setValues([[Utilities.formatDate(new Date(), KH_TZ, 'dd/MM/yyyy HH:mm:ss'), source, action, String(detail).slice(0, 500)]]);
    if(sht.getLastRow() > 600) sht.deleteRows(601, sht.getLastRow() - 600);
  }catch(e){}
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * NHẬT KÝ DỮ LIỆU KHÁCH HÀNG (sheet "_CUSTOMER_LOG")
 *   Mỗi lần thêm / sửa / xoá Account hoặc CBC từ app ⇒ ghi NGAY 1 dòng.
 * ═══════════════════════════════════════════════════════════════════════════════ */
var CUST_LOG_TAB = '_CUSTOMER_LOG';
var CUST_LOG_HDR = ["Thời gian", "PIC", "Thao tác", "Loại", "Customer code", "Account", "CBC code", "Người liên hệ", "Trường thay đổi", "Dòng", "Chi tiết"];
function custLogSheet_(){
  var book = ss(), s = book.getSheetByName(CUST_LOG_TAB);
  if(!s){
    s = book.insertSheet(CUST_LOG_TAB);
    s.getRange(1, 1, 1, CUST_LOG_HDR.length).setValues([CUST_LOG_HDR]).setFontWeight('bold').setBackground('#D9E1F2');
    s.setFrozenRows(1); s.setColumnWidth(1, 150); s.setColumnWidth(6, 260); s.setColumnWidth(9, 260);
  }
  return s;
}
function custLog_(pic, action, tab, rec, fields, row, detail){
  try{
    rec = rec || {};
    custLogSheet_().appendRow([Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'), pic || '', action || '',
      tab === 'cbc' ? 'CBC' : 'Account', String(rec.code || ''), String(rec.name || ''), String(rec.cbcCode || ''), String(rec.contact || ''),
      (fields || []).join(', '), row || '', String(detail || '').slice(0, 300)]);
  }catch(e){}
}
function custLogRead_(from, to){
  var s = null; try{ s = (ss()).getSheetByName(CUST_LOG_TAB); }catch(e){}
  if(!s || s.getLastRow() < 2) return { rows: [], first: '' };
  var v = s.getRange(2, 1, s.getLastRow() - 1, 11).getValues(), out = [], first = '';
  from = String(from || '').slice(0, 10); to = String(to || '').slice(0, 10);
  for(var i = 0; i < v.length; i++){
    var r = v[i]; if(!r[0] && !r[1]) continue;
    var t = (r[0] instanceof Date) ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(r[0]);
    if(!first || t < first) first = t;
    var d = t.slice(0, 10);
    if(from && d < from) continue; if(to && d > to) continue;
    out.push({ t: t, pic: String(r[1]), action: String(r[2]), type: String(r[3]), code: String(r[4]), name: String(r[5]),
               cbcCode: String(r[6]), contact: String(r[7]), fields: String(r[8]), row: r[9], detail: String(r[10]) });
  }
  if(out.length > 5000) out = out.slice(out.length - 5000);
  return { rows: out, first: first };
}

/* ════════════════ ⭐ v10.0 · CẤU HÌNH MODULE DÙNG CHUNG CHO CRM VN ════════════════ */
var NA_ENV = {
  sheet: '16. NEW ACCOUNT & SKU',
  lang: function(){ return 'vi'; },
  team: function(){ return TEAM(); },
  teamLabel: function(){ return (TEAM_CFG[TEAM()] || TEAM_CFG.dental).team; },
  ss: function(){ return ss(); },
  tz: function(){ return Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh'; },
  folderId: function(){ return NA_FOLDERS[TEAM()] || NA_FOLDERS.dental; },
  email: function(pic){ var u = userByPic(S(pic)); return u ? u.email : ''; },
  title: function(pic){ var u = userByPic(S(pic)); return u ? u.title : ''; },
  teamPics: function(){
    var sp = K68_SPEC[TEAM()];
    if (sp && sp.pics && sp.pics.length) return sp.pics.map(function(x){ return x.pic; });
    var t = reportTeamName_(), out = []; for (var e in USER_MAP) if (USER_MAP[e].team === t) out.push(USER_MAP[e].pic); return out;
  },
  approvers: function(pic){ var c = NA_APPROVERS[TEAM()] || {}; return (c[S(pic)] || c['*'] || []).filter(function(x){ return x !== S(pic); }); },
  admins: NA_ADMINS, deciders: NA_DECIDERS,
  director: DIRECTOR_EMAIL, hr: HR_EMAIL,
  k68row_: function(pic){
    var sp = K68_SPEC[TEAM()]; if (!sp) return null;
    for (var i = 0; i < sp.pics.length; i++) if (sp.pics[i].pic === S(pic))
      for (var j = 0; j < sp.pics[i].rows.length; j++) if (/^newacct_/.test(sp.pics[i].rows[j].key)) return sp.pics[i].rows[j];
    return null;
  },
  kpiCode: function(pic){ var r = NA_ENV.k68row_(pic); return r ? r.code : ''; },
  dealerOnly: function(pic){ var r = NA_ENV.k68row_(pic); return !!(r && r.key === 'newacct_dealer'); },
  weekly: function(){
    return readTab('weekly').map(function(r){ var a = parseCheckName(r.account);
      return { pic:S(r.pic), acc:a.name || S(r.account), start:S(r.start), status:S(r.status), action:S(r.typeAction), result:S(r.result) }; });
  },
  orders: function(){ return readTab('order'); },
  log: function(user, action, target, detail){ try { logAct(user, action, 'newacc', target, detail, ''); flushLog_(); } catch(e){} },
  kpiBump: function(){ try { bumpVersion(['kpi']); } catch(e){} },
  kpiLink: function(){ var s = kpiTab_(); return s ? s.getRange(K68_SET.link).getValue() : ''; },
  needOrder: function(){ return TEAM() === 'dental'; }
};
/* chạy 1 lần sau khi dán code: cấp quyền Drive + Gmail, tạo sheet 16, dựng lại tab KPI theo rule mới */
function naSetup(){
  var sh = naSheet_();
  var f = DriveApp.getFolderById(NA_ENV.folderId());
  var quota = MailApp.getRemainingDailyQuota();
  var msg = 'Đã sẵn sàng module Mở mới & SKU mới — nhóm ' + teamLabel_() + '\n· Sheet: ' + sh.getName() + '\n· Folder chứng từ: ' + f.getName() +
            '\n· Email còn gửi được hôm nay: ' + quota;
  try { var s = kpiTab_(); if (s){ k68Setup_(ss(), TABS.kpi, TEAM()); bumpVersion(['kpi']); msg += '\n· Đã dựng lại tab KPI theo rule mới (C1 · C5 · C6 · C7).'; } } catch(e){ msg += '\n· Chưa dựng lại được tab KPI: ' + e.message; }
  try { SpreadsheetApp.flush(); _K68_FORCE = k68ForceCodes_(); var s2 = kpiTab_(); k68CalcSupp_(s2); SpreadsheetApp.flush();
        var r2 = k68Sync_(s2, 'vi', TEAM(), { manual:true });
        if (r2.ok && r2.mode){ props_().setProperty('K68_FIX102', Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + (r2.cells || 0) + ' ô'); }
        msg += '\n· Đẩy lên file KPI (kể cả tháng đã chốt của C1 · C5 · C6 · C7): ' + (r2.ok ? r2.message : r2.error); }
  catch(e){ msg += '\n· Chưa đẩy được lên file KPI: ' + e.message; } finally { _K68_FORCE = null; }
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return msg;
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════
   ⭐ v28 · MODULE DÙNG CHUNG (CRM VN Dental · Surgical · Eyeless  +  CRM Thailand Surgical)
   ① IDEM  — chống ghi trùng khi mạng chậm / app gửi lại (mã yêu cầu rid do app sinh, nhớ 6 giờ)
   ② NA    — Mở mới địa bàn & SKU mới: sheet NEW ACCOUNT & SKU, chứng từ lưu Drive theo nhóm,
             email xin xác nhận → quản lý duyệt / từ chối trên CRM, KPI C1 / C2 đếm case đã duyệt
   ③ KR    — Báo cáo KPI tháng: đọc sheet "5. Member KPI Monthly" của file MMH KPI FY68,
             dựng email trực quan (thanh tiến độ), gửi từ CRM
   Phần khác nhau giữa 2 backend nằm trong đối tượng NA_ENV (khai báo ở file chính).
   ════════════════════════════════════════════════════════════════════════════════════════════════ */

/* ═════════════ ① IDEM — CHỐNG GHI TRÙNG ═════════════ */
var IDEM_TTL = 21600;
function idemKey_(rid){ return 'RID_' + String(rid).replace(/[^\w\-]/g, '').slice(0, 80); }
function idemGet_(rid){
  if(!rid) return null;
  try{ var v = CacheService.getScriptCache().get(idemKey_(rid)); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
function idemPut_(rid, out){
  if(!rid || !out || !out.ok) return;
  try{ var s = JSON.stringify(out); if(s.length < 90000) CacheService.getScriptCache().put(idemKey_(rid), s, IDEM_TTL); }catch(e){}
}
/* Gọi trước khi xử lý: yêu cầu cùng rid đang chạy ở lượt khác ⇒ chờ kết quả lượt đó (tối đa ~25 giây) */
function idemBegin_(rid){
  if(!rid) return null;
  var hit = idemGet_(rid); if(hit){ hit.dup = true; return hit; }
  var c = CacheService.getScriptCache(), pk = idemKey_(rid) + '_P';
  try{
    if(c.get(pk)){
      for(var i = 0; i < 25; i++){ Utilities.sleep(1000); hit = idemGet_(rid); if(hit){ hit.dup = true; return hit; } if(!c.get(pk)) break; }
    }
    c.put(pk, '1', 120);
  }catch(e){}
  return null;
}
function idemEnd_(rid, out){
  if(!rid) return;
  idemPut_(rid, out);
  try{ CacheService.getScriptCache().remove(idemKey_(rid) + '_P'); }catch(e){}
}

/* ═════════════ ② NA — MỞ MỚI ĐỊA BÀN & SKU MỚI ═════════════ */
var NA_HDR = ['Case ID','Created at','PIC','Team','FY','Month','Case type','KPI code','Account name','Customer code',
  'Account type','Province','Distributor','Product type','SKU / Product detail','First order date','Order No.','Qty','Amount',
  'Order lines (JSON)','Weekly report proof','Note','Checklist (JSON)','Files (JSON)','Folder URL','Status','Submitted at',
  'Submitted to','Decided by','Decided at','Decision comment','Updated at','Log'];
var NA_F = ['id','created','pic','team','fy','month','type','kpi','account','code','accType','province','npp','ptype','sku',
  'orderDate','orderNo','qty','amount','lines','weekly','note','checklist','files','folder','status','subAt','subTo',
  'decBy','decAt','comment','updated','log'];
var NA_JSON = { lines:1, checklist:1, files:1 };
var NA_C0 = 2, NA_HR = 3, NA_DR = 4;                 /* cột B · tiêu đề hàng 3 · dữ liệu từ hàng 4 */
var NA_ST = { draft:'Draft', pending:'Pending', approved:'Approved', rejected:'Rejected' };
var NA_CRM_URL = 'https://manimedicalhanoi.github.io/MMH-CRM/';
var NA_MAX_ATTACH = 18 * 1024 * 1024;

function naL_(vi, en){ return NA_ENV.lang() === 'en' ? en : vi; }
/* Dental: KPI mở mới cần đơn hàng đầu tiên · Surgical / Eyeless / Thái: chỉ cần thông tin đầy đủ + lịch sử chăm sóc + xác nhận NPP */
function naNeedOrder_(){ try{ return typeof NA_ENV.needOrder === 'function' ? !!NA_ENV.needOrder() : NA_ENV.team() === 'dental'; }catch(e){ return false; } }
function naS_(v){ return v == null ? '' : String(v).trim(); }
function naN_(v){ if(v === '' || v == null) return 0; if(typeof v === 'number') return isFinite(v) ? v : 0; var x = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(x) ? 0 : x; }
function naNorm_(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim(); }
function naEsc_(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function naTz_(){ try{ return NA_ENV.tz(); }catch(e){ return 'Asia/Ho_Chi_Minh'; } }
function naNow_(){ return Utilities.formatDate(new Date(), naTz_(), 'yyyy-MM-dd HH:mm'); }
function naYm_(iso){ var m = /^(\d{4})-(\d{2})/.exec(String(iso || '')); return m ? m[1] + m[2] : ''; }
function naFy_(ym){ ym = String(ym || ''); if(ym.length < 6) return ''; var y = +ym.slice(0, 4), m = +ym.slice(4, 6); return 'FY' + ((m >= 9 ? y : y - 1) - 1958); }
function naIso_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, naTz_(), 'yyyy-MM-dd');
  var s = String(v).trim(), m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
  if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s.slice(0, 10);
}
function naVer_(){ try{ return PropertiesService.getScriptProperties().getProperty('NA_VER') || '1'; }catch(e){ return '1'; } }
function naBump_(){ var v = String(Date.now()); try{ PropertiesService.getScriptProperties().setProperty('NA_VER', v); }catch(e){} return v; }

/* sheet NEW ACCOUNT & SKU — tự tạo / tự chuyển bố cục cũ (tiêu đề hàng 1) sang bố cục chuẩn */
var _NA_SH = null;
function naSheet_(){
  if(_NA_SH) return _NA_SH;
  var book = NA_ENV.ss(), name = NA_ENV.sheet, sh = book.getSheetByName(name);
  if(sh){
    var h = naS_(sh.getRange(NA_HR, NA_C0).getValue());
    if(h !== 'Case ID'){
      var lr = sh.getLastRow(), hasData = false;
      if(lr >= 2){ var v = sh.getRange(2, 1, lr - 1, Math.min(sh.getLastColumn(), 3)).getValues(); hasData = v.some(function(r){ return naS_(r[0]) || naS_(r[1]); }); }
      if(hasData){ sh.setName(name + ' (old)'); sh = null; }
      else { sh.clear(); }
    } else {
      var have = sh.getRange(NA_HR, NA_C0, 1, NA_HDR.length).getValues()[0];
      if(naS_(have[NA_HDR.length - 1]) !== NA_HDR[NA_HDR.length - 1]) sh.getRange(NA_HR, NA_C0, 1, NA_HDR.length).setValues([NA_HDR]);
      _NA_SH = sh; return sh;
    }
  }
  if(!sh) sh = book.insertSheet(name);
  if(sh.getMaxColumns() < NA_C0 + NA_HDR.length) sh.insertColumnsAfter(sh.getMaxColumns(), NA_C0 + NA_HDR.length - sh.getMaxColumns());
  sh.getRange(1, 2).setValue(naL_('MỞ MỚI ĐỊA BÀN & SKU MỚI — ghi từ app MMH CRM (không sửa tay cột Status / Files)', 'NEW ACCOUNTS & NEW SKU LISTINGS — written by the MMH CRM app (do not edit Status / Files by hand)'))
    .setFontWeight('bold').setFontSize(13).setFontColor('#003047');
  sh.getRange(2, 2).setValue(naL_('KPI C1 (VN) / C2 (Thái) chỉ đếm case Status = Approved, theo PIC và Month (tháng phát sinh đơn đầu tiên).',
    'KPI C1 / C2 counts only cases with Status = Approved, by PIC and Month (month of the first order).')).setFontColor('#666666').setFontStyle('italic');
  sh.getRange(NA_HR, NA_C0, 1, NA_HDR.length).setValues([NA_HDR]).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047').setWrap(true);
  sh.setFrozenRows(NA_HR); sh.setFrozenColumns(NA_C0 + 1);
  sh.getRange(NA_DR, NA_C0, sh.getMaxRows() - NA_DR + 1, NA_HDR.length).setNumberFormat('@');
  sh.getRange(NA_DR, NA_C0 + NA_F.indexOf('month'), sh.getMaxRows() - NA_DR + 1, 1).setNumberFormat('0');
  sh.getRange(NA_DR, NA_C0 + NA_F.indexOf('qty'), sh.getMaxRows() - NA_DR + 1, 2).setNumberFormat('#,##0');
  try{ sh.setTabColor('#3A5CAA'); sh.setColumnWidth(1, 18); }catch(e){}
  _NA_SH = sh;
  return sh;
}
function naRow2Obj_(r, rowNo){
  var o = { _row: rowNo };
  NA_F.forEach(function(f, i){
    var v = r[i];
    if(NA_JSON[f]){ try{ o[f] = v ? JSON.parse(v) : (f === 'checklist' ? {} : []); }catch(e){ o[f] = f === 'checklist' ? {} : []; } }
    else if(f === 'orderDate') o[f] = naIso_(v);
    else if(f === 'month') o[f] = naS_(v).replace(/\D/g, '').slice(0, 6);
    else if(f === 'qty' || f === 'amount') o[f] = v === '' ? '' : naN_(v);
    else o[f] = Object.prototype.toString.call(v) === '[object Date]' ? Utilities.formatDate(v, naTz_(), 'yyyy-MM-dd HH:mm') : naS_(v);
  });
  if(!o.status) o.status = NA_ST.draft;
  return o;
}
function naObj2Row_(o){
  return NA_F.map(function(f){
    var v = o[f];
    if(NA_JSON[f]) return JSON.stringify(v || (f === 'checklist' ? {} : [])).slice(0, 49000);
    if(f === 'month') return v ? Number(String(v).replace(/\D/g, '').slice(0, 6)) : '';
    if(f === 'qty' || f === 'amount') return v === '' || v == null ? '' : naN_(v);
    return v == null ? '' : String(v);
  });
}
function naReadAll_(){
  var sh = naSheet_(), lr = sh.getLastRow();
  if(lr < NA_DR) return [];
  var v = sh.getRange(NA_DR, NA_C0, lr - NA_DR + 1, NA_F.length).getValues(), out = [];
  v.forEach(function(r, i){ if(naS_(r[0])) out.push(naRow2Obj_(r, NA_DR + i)); });
  return out;
}
function naFind_(id){ var all = naReadAll_(); for(var i = 0; i < all.length; i++) if(all[i].id === id) return all[i]; return null; }
function naWrite_(o){
  var sh = naSheet_();
  if(!o._row){
    var lr = sh.getLastRow(), row = Math.max(lr + 1, NA_DR);
    if(lr >= NA_DR){
      var ids = sh.getRange(NA_DR, NA_C0, lr - NA_DR + 1, 1).getValues(), last = -1;
      for(var i = ids.length - 1; i >= 0; i--) if(naS_(ids[i][0])){ last = i; break; }
      row = NA_DR + last + 1;
    }
    o._row = row;
  }
  sh.getRange(o._row, NA_C0, 1, NA_F.length).setValues([naObj2Row_(o)]);
  return o;
}
function naLogLine_(o, who, what){ o.log = (naNow_() + ' · ' + who + ' · ' + what + (o.log ? '\n' + o.log : '')).slice(0, 4000); }

/* quyền */
function naIsAdmin_(user){ return NA_ENV.admins.indexOf(naS_(user && user.pic)) >= 0; }
function naApprovers_(pic){ try{ return NA_ENV.approvers(pic) || []; }catch(e){ return []; } }
function naCanSee_(user, o){
  var me = naS_(user && user.pic);
  if(!me) return false;
  if(naIsAdmin_(user) || o.pic === me) return true;
  return naApprovers_(o.pic).indexOf(me) >= 0;
}
function naCanDecide_(user, o){
  var me = naS_(user && user.pic);
  if(!me || o.status !== NA_ST.pending || o.pic === me) return false;
  return naApprovers_(o.pic).indexOf(me) >= 0 || NA_ENV.deciders.indexOf(me) >= 0;
}
function naCanEdit_(user, o){
  var me = naS_(user && user.pic);
  if(naIsAdmin_(user)) return true;
  return o.pic === me && o.status !== NA_ST.approved;
}
function naDecorate_(user, o){
  o.canDecide = naCanDecide_(user, o);
  o.canEdit = naCanEdit_(user, o);
  o.approvers = naApprovers_(o.pic);
  return o;
}

/* lịch sử chăm sóc trên báo cáo tuần (tới ngày đơn đầu tiên) */
function naWeeklyProof_(pic, account, until){
  var key = naNorm_(account), rows = [];
  if(!key) return { n:0, last:'', list:[] };
  try{
    NA_ENV.weekly().forEach(function(w){
      if(naNorm_(w.pic) !== naNorm_(pic)) return;
      if(naNorm_(w.acc) !== key) return;
      if(/cancel/i.test(w.status)) return;
      var d = naIso_(w.start); if(!d) return;
      if(until && d > until) return;
      rows.push({ d:d, a:w.action || '', s:w.status || '', r:String(w.result || '').slice(0, 140) });
    });
  }catch(e){}
  rows.sort(function(a, b){ return a.d < b.d ? 1 : -1; });
  return { n:rows.length, last:rows.length ? rows[0].d : '', list:rows.slice(0, 8) };
}
function naWeeklyText_(w){
  if(!w || !w.n) return naL_('Chưa có lượt nào trên báo cáo tuần', 'No visit in the weekly report yet');
  return naL_(w.n + ' lượt trên báo cáo tuần · gần nhất ', w.n + ' visit(s) in the weekly report · last ') + w.last;
}

/* lịch sử đơn hàng (chỉ VN — file Thái không có Sales order) */
function naOrderHistory_(account, beforeYm){
  var out = { n:0, first:'', skus:{} };
  try{
    var key = naNorm_(account), rows = NA_ENV.orders ? NA_ENV.orders() : [];
    rows.forEach(function(r){
      if(naNorm_(r.name) !== key) return;
      var ym = naS_(r.month).replace(/\D/g, '').slice(0, 6);
      if(!ym || (beforeYm && ym >= beforeYm)) return;
      out.n++; if(!out.first || ym < out.first) out.first = ym;
      String(r.detail || '').split(/\r?\n|;/).forEach(function(d){ d = naNorm_(d); if(d) out.skus[d] = ym; });
    });
  }catch(e){}
  return out;
}

/* ── folder Drive của nhóm, chia theo tháng ── */
function naFolder_(ym){
  var root = DriveApp.getFolderById(NA_ENV.folderId());
  var nm = ym && ym.length === 6 ? ym.slice(0, 4) + '-' + ym.slice(4) : Utilities.formatDate(new Date(), naTz_(), 'yyyy-MM');
  var it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}
function naSafe_(s, n){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[\\\/:*?"<>|#%\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/ /g, '-').slice(0, n || 60); }
function naFileName_(o, idx, ext){
  var d = naIso_(o.orderDate) || Utilities.formatDate(new Date(), naTz_(), 'yyyy-MM-dd');
  var dm = d.slice(8, 10) + d.slice(5, 7) + d.slice(0, 4);
  var sku = (String(o.sku || '').split(/\r?\n|;/)[0] || o.ptype || (o.type === 'new_sku' ? 'SKU' : 'NewAccount'));
  return [naSafe_(o.pic, 20), dm, naSafe_(o.account, 50), naSafe_(sku, 40)].join('_') + (idx > 1 ? '_' + idx : '') + (ext ? '.' + ext : '');
}
function naExt_(name, mime){
  var m = /\.([a-z0-9]{2,5})$/i.exec(String(name || '')); if(m) return m[1].toLowerCase();
  return ({ 'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/heic':'heic' })[mime] || 'bin';
}

/* ═════════ API ═════════ */
function naRoute_(action, user, p){
  switch(action){
    case 'naList'   : return naList(user, p);
    case 'naPending': return naPending(user, p);
    case 'naSave'   : return naSave(user, p);
    case 'naUpload' : return naUpload(user, p);
    case 'naDelFile': return naDelFile(user, p);
    case 'naDelete' : return naDelete(user, p);
    case 'naSubmit' : return naSubmit(user, p);
    case 'naDecide' : return naDecide(user, p);
  }
  return { ok:false, error:'Unknown action: ' + action };
}
function naCfg_(){
  var pics = [], kpi = {}, dealer = {};
  try{ pics = NA_ENV.teamPics(); }catch(e){}
  pics.forEach(function(pc){ kpi[pc] = NA_ENV.kpiCode(pc) || ''; dealer[pc] = !!NA_ENV.dealerOnly(pc); });
  var furl = ''; try{ furl = 'https://drive.google.com/drive/folders/' + NA_ENV.folderId(); }catch(e){}
  return { team:NA_ENV.team(), lang:NA_ENV.lang(), pics:pics, kpi:kpi, dealerOnly:dealer, folder:furl, hasOrders:!!NA_ENV.orders, needOrder:naNeedOrder_(),
           admins:NA_ENV.admins, deciders:NA_ENV.deciders };
}
function naList(user, p){
  var ver = naVer_();
  if(p && naS_(p.cv) && naS_(p.cv) === ver) return { ok:true, unchanged:true, ver:ver, _ver:ver };
  var fy = naS_(p && p.fy), all = naReadAll_(), rows = [], pend = 0;
  all.forEach(function(o){
    if(!naCanSee_(user, o)) return;
    if(fy && o.fy && o.fy !== fy && o.status !== NA_ST.pending) return;
    naDecorate_(user, o);
    if(o.canDecide) pend++;
    rows.push(o);
  });
  rows.sort(function(a, b){ return String(b.month || '').localeCompare(String(a.month || '')) || String(b.created).localeCompare(String(a.created)); });
  var me = naS_(user && user.pic), approverOf = [];
  try{ NA_ENV.teamPics().forEach(function(pc){ if(naApprovers_(pc).indexOf(me) >= 0) approverOf.push(pc); }); }catch(e){}
  return { ok:true, na:true, ver:ver, _ver:ver, rows:rows, pending:pend, me:{ pic:me, all:naIsAdmin_(user), approverOf:approverOf }, cfg:naCfg_() };
}
function naPending(user, p){
  var all = naReadAll_(), ids = [], mine = 0;
  all.forEach(function(o){ if(naCanDecide_(user, o)) ids.push(o.id); if(o.pic === naS_(user.pic) && o.status === NA_ST.draft) mine++; });
  return { ok:true, n:ids.length, ids:ids, drafts:mine, ver:naVer_() };
}
function naParse_(p){
  var d = p.data;
  if(typeof d === 'string'){ try{ d = JSON.parse(d); }catch(e){ d = null; } }
  return d || {};
}
function naSave(user, p){
  var d = naParse_(p);
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok:false, error:naL_('Hệ thống đang bận, thử lại sau vài giây.', 'The system is busy, try again in a few seconds.') }; }
  try{
    var all = naReadAll_(), cur = null, id = naS_(d.id);
    if(id) for(var i = 0; i < all.length; i++) if(all[i].id === id){ cur = all[i]; break; }
    if(cur && !naCanEdit_(user, cur)) return { ok:false, error:naL_('Bạn không sửa được case này.', 'You cannot edit this case.') };
    var isNew = !cur;
    var o = cur || { id: /^NA-[\w-]{6,40}$/.test(id) ? id : ('NA-' + NA_ENV.team().slice(0, 2).toUpperCase() + '-' + Utilities.formatDate(new Date(), naTz_(), 'yyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100)),
      created:naNow_(), team:NA_ENV.teamLabel(), status:NA_ST.draft, files:[], checklist:{}, lines:[] };
    var owner = naS_(d.pic) && naIsAdmin_(user) ? naS_(d.pic) : (cur ? cur.pic : naS_(user.pic));
    o.pic = owner;
    ['type','account','code','accType','province','npp','ptype','sku','orderNo','note'].forEach(function(f){ if(f in d) o[f] = naS_(d[f]); });
    if('orderDate' in d) o.orderDate = naIso_(d.orderDate);
    if('qty' in d) o.qty = d.qty === '' ? '' : naN_(d.qty);
    if('amount' in d) o.amount = d.amount === '' ? '' : naN_(d.amount);
    if(d.lines) o.lines = (d.lines || []).slice(0, 40);
    if(d.checklist) o.checklist = d.checklist;
    if(d.files) o.files = (d.files || []).filter(function(f){ return f && f.id; }).slice(0, 30);
    if(!/^(new_account|new_sku)$/.test(o.type)) o.type = 'new_account';
    o.month = naYm_(o.orderDate) || o.month || '';
    o.fy = naFy_(o.month) || o.fy || '';
    o.kpi = NA_ENV.kpiCode(o.pic) || o.kpi || '';
    if(!o.account) return { ok:false, error:naL_('Cần chọn Account (đại lý / khách hàng).', 'Please choose the account.') };

    /* trùng: cùng account mở mới 2 lần trong FY, hoặc cùng account + SKU */
    var dup = all.filter(function(x){
      if(x.id === o.id || x.status === NA_ST.rejected) return false;
      if(naNorm_(x.account) !== naNorm_(o.account)) return false;
      if(o.type === 'new_account') return x.type === 'new_account' && (!o.fy || x.fy === o.fy);
      var a = String(x.sku || '').split(/\r?\n|;/).map(naNorm_).filter(String), b = String(o.sku || '').split(/\r?\n|;/).map(naNorm_).filter(String);
      return x.type === 'new_sku' && a.some(function(s){ return b.indexOf(s) >= 0; });
    })[0];
    if(dup) return { ok:false, dup:dup.id, error:naL_('Đã có case ' + dup.id + ' (' + dup.pic + ', ' + dup.status + ') cho account' + (o.type === 'new_sku' ? ' + SKU' : '') + ' này — mở case đó thay vì tạo thêm.',
                                                     'Case ' + dup.id + ' (' + dup.pic + ', ' + dup.status + ') already exists for this account' + (o.type === 'new_sku' ? ' + SKU' : '') + ' — open it instead.') };

    var wk = naWeeklyProof_(o.pic, o.account, o.orderDate);
    o.weekly = naWeeklyText_(wk);
    var hist = NA_ENV.orders ? naOrderHistory_(o.account, o.month) : null;
    if(cur && cur.status === NA_ST.pending && !naIsAdmin_(user)){ o.status = NA_ST.draft; naLogLine_(o, user.pic, naL_('sửa khi đang chờ duyệt ⇒ về nháp', 'edited while pending ⇒ back to draft')); }
    if(cur && cur.status === NA_ST.rejected){ o.status = NA_ST.draft; o.decBy = ''; o.decAt = ''; naLogLine_(o, user.pic, naL_('mở lại sau khi bị từ chối', 'reopened after rejection')); }
    if(isNew) naLogLine_(o, user.pic, naL_('tạo case', 'created'));
    o.updated = naNow_();

    /* đặt tên chuẩn cho chứng từ: PIC_ddMMyyyy_Account_SKU */
    var folder = null;
    (o.files || []).forEach(function(f, k){
      try{
        var file = DriveApp.getFileById(f.id), want = naFileName_(o, k + 1, naExt_(f.name, f.mime));
        if(file.getName() !== want){ file.setName(want); f.name = want; }
        if(o.month && f.ym !== o.month){
          folder = folder || naFolder_(o.month);
          try{ file.moveTo(folder); f.ym = o.month; }catch(e2){}
        }
        o.folder = 'https://drive.google.com/drive/folders/' + (folder ? folder.getId() : NA_ENV.folderId());
      }catch(e){}
    });
    naWrite_(o); naBump_();
    try{ NA_ENV.log(user, isNew ? 'add' : 'update', o.account, (o.type === 'new_sku' ? 'New SKU ' : 'New account ') + (o.sku || '')); }catch(e){}
    naDecorate_(user, o);
    o.wk = wk; o.hist = hist;
    return { ok:true, rec:o, ver:naVer_(), message:naL_(isNew ? 'Đã lưu case (nháp)' : 'Đã cập nhật case', isNew ? 'Case saved (draft)' : 'Case updated') };
  } finally { lock.releaseLock(); }
}
function naUpload(user, p){
  var b64 = String(p.b64 || ''); if(!b64) return { ok:false, error:'No file' };
  b64 = b64.replace(/^data:[^,]*,/, '');
  var mime = naS_(p.mime) || 'application/octet-stream', ext = naExt_(p.name, mime);
  var ym = naS_(p.month).replace(/\D/g, '').slice(0, 6) || Utilities.formatDate(new Date(), naTz_(), 'yyyyMM');
  var tmp = { pic:naS_(p.owner) || naS_(user.pic), account:naS_(p.account) || 'Account', sku:naS_(p.sku), orderDate:naS_(p.orderDate), type:naS_(p.type) };
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, naFileName_(tmp, 0, ext).replace(/(\.[a-z0-9]+)$/i, '_' + Utilities.formatDate(new Date(), naTz_(), 'HHmmss') + Math.floor(Math.random() * 90 + 10) + '$1'));
  var folder = naFolder_(ym), file = folder.createFile(blob);
  try{ file.setDescription('MMH CRM · ' + naS_(p.caseId) + ' · ' + naS_(p.kind) + ' · ' + naS_(user.pic)); }catch(e){}
  try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
  return { ok:true, file:{ id:file.getId(), name:file.getName(), mime:mime, size:file.getSize(), kind:naS_(p.kind) || 'other', ym:ym, at:naNow_(), by:naS_(user.pic) } };
}
function naDelFile(user, p){
  var fid = naS_(p.fileId || p.id);
  if(!fid) return { ok:false, error:'No file id' };
  var cid = naS_(p.caseId);
  if(cid){
    var lock = LockService.getScriptLock();
    try{ lock.waitLock(15000); }catch(e){ return { ok:false, error:'Busy' }; }
    try{
      var o = naFind_(cid);
      if(o){
        if(!naCanEdit_(user, o)) return { ok:false, error:naL_('Bạn không sửa được case này.', 'You cannot edit this case.') };
        o.files = (o.files || []).filter(function(f){ return f.id !== fid; }); o.updated = naNow_(); naWrite_(o); naBump_();
      }
    } finally { lock.releaseLock(); }
  }
  try{ DriveApp.getFileById(fid).setTrashed(true); }catch(e){}
  return { ok:true };
}
function naDelete(user, p){
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(15000); }catch(e){ return { ok:false, error:'Busy' }; }
  try{
    var o = naFind_(naS_(p.id));
    if(!o) return { ok:true, message:'Not found' };
    if(!(naIsAdmin_(user) || (o.pic === naS_(user.pic) && o.status !== NA_ST.approved)))
      return { ok:false, error:naL_('Không xoá được case này.', 'You cannot delete this case.') };
    (o.files || []).forEach(function(f){ try{ DriveApp.getFileById(f.id).setTrashed(true); }catch(e){} });
    naSheet_().deleteRow(o._row); naBump_();
    try{ NA_ENV.log(user, 'delete', o.account, 'case ' + o.id); }catch(e){}
    return { ok:true, message:naL_('Đã xoá case', 'Case deleted') };
  } finally { lock.releaseLock(); }
}
/* kiểm tra đủ điều kiện theo rule trước khi gửi */
function naCheck_(o){
  var miss = [];
  if(!o.account) miss.push(naL_('Account', 'Account'));
  if(!o.npp) miss.push(naL_('Nhà phân phối', 'Distributor'));
  var needOrd = naNeedOrder_();
  if(!o.orderDate) miss.push(needOrd ? naL_('Ngày đơn đầu tiên', 'First order date') : naL_('Ngày NPP xác nhận mở mới', 'Distributor confirmation date'));
  /* nhóm không cần đơn hàng (Surgical / Eyeless / Thái): bắt buộc có lịch sử chăm sóc trên báo cáo tuần */
  if(!needOrd && o.account){ var wk0 = naWeeklyProof_(o.pic, o.account, o.orderDate); if(!wk0.n) miss.push(naL_('Lịch sử chăm sóc account trên Báo cáo tuần (chưa có lượt nào tới ngày ghi nhận)', 'Care history in the weekly report (no visit up to the date)')); }
  if(o.type === 'new_sku' && !o.sku) miss.push(naL_('Mã SKU mới', 'New SKU code'));
  var fs = o.files || [];
  if(!fs.length) miss.push(naL_('Chứng từ đính kèm', 'Evidence file'));
  else if(!fs.some(function(f){ return f.kind === 'dist'; })) miss.push(naL_('Chứng từ "Xác nhận NPP"', '"Distributor confirmation" evidence'));
  var c = o.checklist || {};
  ['first','month','mail'].forEach(function(k){ if(!c[k]) miss.push(naL_('Ô cam kết: ', 'Confirmation: ') + k); });
  return miss;
}
function naSubmit(user, p){
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok:false, error:'Busy' }; }
  var o;
  try{
    o = naFind_(naS_(p.id));
    if(!o) return { ok:false, error:naL_('Không tìm thấy case — lưu case trước.', 'Case not found — save it first.') };
    if(!(o.pic === naS_(user.pic) || naIsAdmin_(user))) return { ok:false, error:naL_('Chỉ PIC của case mới gửi được.', 'Only the case owner can submit.') };
    if(o.status === NA_ST.approved) return { ok:false, error:naL_('Case đã được duyệt.', 'The case is already approved.') };
    if(o.status === NA_ST.pending && o.subAt && !p.force){
      var t = new Date(String(o.subAt).replace(' ', 'T') + ':00');
      if(Date.now() - t.getTime() < 10 * 60000){ naDecorate_(user, o); return { ok:true, rec:o, dup:true, message:naL_('Email xin xác nhận đã được gửi lúc ', 'The request was already sent at ') + o.subAt }; }
    }
    var miss = naCheck_(o);
    if(miss.length) return { ok:false, miss:miss, error:naL_('Chưa đủ điều kiện gửi: ', 'Not ready to send: ') + miss.join(' · ') };
    var aps = naApprovers_(o.pic);
    var to = aps.map(function(x){ return NA_ENV.email(x); }).filter(String);
    if(!to.length) return { ok:false, error:naL_('Chưa cấu hình người duyệt cho ', 'No approver configured for ') + o.pic };
    var wk = naWeeklyProof_(o.pic, o.account, o.orderDate);
    o.weekly = naWeeklyText_(wk);
    o.status = NA_ST.pending; o.subAt = naNow_(); o.subTo = aps.join(', ');
    o.decBy = ''; o.decAt = ''; o.comment = '';
    naLogLine_(o, user.pic, naL_('gửi email xin xác nhận → ', 'request sent → ') + o.subTo);
    o.updated = naNow_();
    naWrite_(o); naBump_();
  } finally { lock.releaseLock(); }
  var cc = [NA_ENV.director, NA_ENV.hr, NA_ENV.email(o.pic)].filter(function(e, i, a){ return e && a.indexOf(e) === i && to.indexOf(e) < 0; });
  var mail = naSendMail_(o, 'submit', user, to, cc, wk);
  try{ NA_ENV.log(user, 'submit', o.account, 'case ' + o.id + ' → ' + o.subTo); }catch(e){}
  naDecorate_(user, o); o.wk = wk;
  return { ok:true, rec:o, mail:mail, message:naL_('Đã gửi email xin xác nhận tới ', 'Request sent to ') + o.subTo + (mail.warn ? ' · ' + mail.warn : '') };
}
function naDecide(user, p){
  var dec = naS_(p.decision).toLowerCase(), cm = naS_(p.comment), o, trashed = 0;
  if(!/^(approve|reject|return)$/.test(dec)) return { ok:false, error:'decision?' };
  if(dec === 'reject' && cm.length < 5) return { ok:false, error:naL_('Từ chối cần ghi rõ lý do (ít nhất 5 ký tự).', 'A rejection needs a reason (at least 5 characters).') };
  /* ⭐ 08/10/2026 — Trả lại bổ sung: case về Nháp, GIỮ chứng từ, PIC sửa rồi gửi lại */
  if(dec === 'return' && cm.length < 5) return { ok:false, error:naL_('Trả lại cần ghi rõ cần bổ sung gì (ít nhất 5 ký tự).', 'Please say what needs to be added (at least 5 characters).') };
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok:false, error:'Busy' }; }
  try{
    o = naFind_(naS_(p.id));
    if(!o) return { ok:false, error:'Case not found' };
    if(o.status !== NA_ST.pending){ naDecorate_(user, o); return { ok:true, rec:o, dup:true, message:naL_('Case đã được xử lý: ', 'Already decided: ') + o.status + (o.decBy ? ' · ' + o.decBy : '') }; }
    if(!naCanDecide_(user, o)) return { ok:false, error:naL_('Bạn không có quyền duyệt case này.', 'You cannot decide this case.') };
    o.decBy = naS_(user.pic); o.decAt = naNow_(); o.comment = cm;
    if(dec === 'approve'){ o.status = NA_ST.approved; naLogLine_(o, user.pic, naL_('XÁC NHẬN', 'APPROVED') + (cm ? ' · ' + cm : '')); }
    else if(dec === 'return'){ o.status = NA_ST.draft; naLogLine_(o, user.pic, naL_('TRẢ LẠI BỔ SUNG · ', 'RETURNED FOR CHANGES · ') + cm); }
    else {
      o.status = NA_ST.rejected;
      o.rejectedFiles = (o.files || []).map(function(f){ return f.name; });
      (o.files || []).forEach(function(f){ try{ DriveApp.getFileById(f.id).setTrashed(true); trashed++; }catch(e){} });
      naLogLine_(o, user.pic, naL_('TỪ CHỐI · ', 'REJECTED · ') + cm + ' · ' + naL_('đã xoá ', 'removed ') + trashed + naL_(' chứng từ', ' file(s)'));
      o.files = [];
    }
    o.updated = naNow_();
    naWrite_(o); naBump_();
    try{ if(typeof NA_ENV.kpiBump === 'function') NA_ENV.kpiBump(); }catch(e){}
  } finally { lock.releaseLock(); }
  var aps = naApprovers_(o.pic), to = [NA_ENV.email(o.pic)].filter(String);
  var cc = [NA_ENV.director, NA_ENV.hr, NA_ENV.email(user.pic)].concat(aps.map(function(x){ return NA_ENV.email(x); }))
    .filter(function(e, i, a){ return e && a.indexOf(e) === i && to.indexOf(e) < 0; });
  var mail = naSendMail_(o, dec === 'approve' ? 'approve' : dec === 'return' ? 'return' : 'reject', user, to, cc, null);
  try{ NA_ENV.log(user, dec, o.account, 'case ' + o.id + (cm ? ' · ' + cm : '')); }catch(e){}
  naDecorate_(user, o);
  return { ok:true, rec:o, mail:mail, trashed:trashed,
           message: dec === 'approve' ? naL_('Đã xác nhận — email đã gửi tới PIC, Director, kế toán trưởng', 'Approved — e-mail sent to the PIC, Director and chief accountant')
                  : dec === 'return' ? naL_('Đã trả lại để PIC bổ sung — chứng từ giữ nguyên, email đã gửi', 'Returned to the PIC for changes — evidence kept, e-mail sent')
                                      : naL_('Đã từ chối — chứng từ đã xoá, email đã gửi', 'Rejected — evidence removed, e-mail sent') };
}

/* ── email ── */
function naTypeLabel_(t){ return t === 'new_sku' ? naL_('SKU mới', 'New SKU') : naL_('Đại lý / khách hàng mới', 'New account'); }
function naMailHtml_(o, kind, user, wk){
  var L = naL_, e = naEsc_, link = NA_CRM_URL + '#na=' + encodeURIComponent(o.id);
  var head = kind === 'submit' ? L('ĐỀ XUẤT XÁC NHẬN MỞ MỚI', 'NEW ACCOUNT / SKU — APPROVAL REQUEST')
           : kind === 'approve' ? L('ĐÃ XÁC NHẬN MỞ MỚI', 'NEW ACCOUNT / SKU — APPROVED')
           : kind === 'return' ? L('CẦN BỔ SUNG CASE MỞ MỚI', 'NEW ACCOUNT / SKU — CHANGES REQUESTED')
           : L('KHÔNG XÁC NHẬN MỞ MỚI', 'NEW ACCOUNT / SKU — REJECTED');
  var col = kind === 'approve' ? '#1E7B34' : kind === 'reject' ? '#B3261E' : kind === 'return' ? '#B45309' : '#3A5CAA';
  var td = 'padding:7px 10px;border-bottom:1px solid #E3E8EF;font-size:13.5px;vertical-align:top;';
  var row = function(k, v){ return '<tr><td style="' + td + 'color:#5F6B78;width:34%;white-space:nowrap">' + k + '</td><td style="' + td + 'color:#1A1A1A;font-weight:600">' + v + '</td></tr>'; };
  var h = [];
  h.push('<div style="font-family:Aptos,Calibri,Arial,sans-serif;background:#F4F7FB;padding:18px 10px"><div style="max-width:720px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #DCE3EC">');
  h.push('<div style="background:' + col + ';color:#fff;padding:16px 22px"><div style="font-size:12px;letter-spacing:.08em;opacity:.9">MMH CRM · ' + e(NA_ENV.teamLabel()) + '</div>' +
         '<div style="font-size:20px;font-weight:800;margin-top:3px">' + head + '</div>' +
         '<div style="font-size:14px;margin-top:4px">' + e(naTypeLabel_(o.type)) + ' · <b>' + e(o.account) + '</b> · ' + e(o.pic) + '</div></div>');
  h.push('<div style="padding:16px 22px">');
  if(kind === 'submit') h.push('<p style="font-size:14px;margin:0 0 12px">' + L('Kính gửi anh/chị ' + e(o.subTo) + ',<br>Em xin gửi case mở mới dưới đây, kèm chứng từ theo quy định KPI. Anh/chị vui lòng xác nhận trên CRM.',
                                                                              'Dear ' + e(o.subTo) + ',<br>Please find below a new account / SKU case with the evidence required by the KPI rule. Please approve it in the CRM.') + '</p>');
  if(kind !== 'submit') h.push('<div style="border-left:4px solid ' + col + ';background:' + (kind === 'approve' ? '#EAF6EC' : kind === 'return' ? '#FFF6E5' : '#FCEDEC') + ';padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:14px">' +
    '<b>' + (kind === 'approve' ? L('Đã xác nhận bởi ', 'Approved by ') : kind === 'return' ? L('Trả lại bổ sung bởi ', 'Returned for changes by ') : L('Từ chối bởi ', 'Rejected by ')) + e(o.decBy) + '</b> · ' + e(o.decAt) +
    (o.comment ? '<div style="margin-top:4px">💬 ' + e(o.comment) + '</div>' : '') +
    (kind === 'return' ? '<div style="margin-top:4px;color:#7A4A00">' + L('Chứng từ được giữ nguyên. PIC mở case trên CRM, bổ sung theo nhận xét rồi bấm Gửi email xin xác nhận lại.', 'The evidence is kept. The PIC opens the case in the CRM, completes it as requested and sends it for approval again.') + '</div>' : '') +
    (kind === 'reject' ? '<div style="margin-top:4px;color:#7A2E2A">' + L('Chứng từ của case đã được xoá khỏi folder Drive. PIC có thể mở lại case, bổ sung và gửi lại.', 'The evidence files were removed from Drive. The PIC can reopen the case, complete it and send again.') + '</div>' : '') + '</div>');
  h.push('<table style="width:100%;border-collapse:collapse">');
  h.push(row(L('Loại case', 'Case type'), e(naTypeLabel_(o.type)) + (o.kpi ? ' · KPI ' + e(o.kpi) : '')));
  h.push(row(L('Account', 'Account'), e(o.account) + (o.code ? ' <span style="color:#5F6B78;font-weight:400">(' + e(o.code) + ')</span>' : '') + (o.accType || o.province ? '<br><span style="color:#5F6B78;font-weight:400">' + e([o.accType, o.province].filter(String).join(' · ')) + '</span>' : '')));
  h.push(row(L('Nhà phân phối', 'Distributor'), e(o.npp)));
  h.push(row(naNeedOrder_() ? L('Đơn đầu tiên', 'First order') : L('Ngày NPP xác nhận', 'Distributor confirmation'), e(o.orderDate) + (o.orderNo ? ' · ' + e(o.orderNo) : '') + ' · ' + L('tháng KPI ', 'KPI month ') + e(o.month)));
  if(o.sku || o.ptype) h.push(row(L('Sản phẩm / SKU', 'Product / SKU'), e(o.ptype ? o.ptype + ' · ' : '') + e(o.sku).replace(/\n/g, '<br>')));
  if((o.lines || []).length) h.push(row(L('Chi tiết đơn', 'Order lines'), (o.lines || []).map(function(x){ return e(x.ptype || '') + ' · ' + e(String(x.detail || '').replace(/\n/g, ', ')) + ' · SL ' + e(x.qty || '') + (x.price ? ' × ' + e(Number(x.price).toLocaleString('en-US')) : ''); }).join('<br>')));
  if(o.qty || o.amount) h.push(row(L('Số lượng / Giá trị', 'Qty / Amount'), (o.qty ? e(o.qty) : '—') + ' · ' + (o.amount ? Number(o.amount).toLocaleString('en-US') + (NA_ENV.lang() === 'en' ? '' : ' VND') : '—')));
  h.push(row(L('Báo cáo tuần', 'Weekly report'), e(o.weekly || '') + (wk && wk.list && wk.list.length ? '<div style="font-weight:400;color:#5F6B78;margin-top:4px;font-size:12.5px">' + wk.list.slice(0, 4).map(function(x){ return e(x.d) + ' · ' + e(x.a) + (x.r ? ' — ' + e(x.r) : ''); }).join('<br>') + '</div>' : '')));
  if(o.note) h.push(row(L('Ghi chú', 'Note'), e(o.note).replace(/\n/g, '<br>')));
  h.push('</table>');
  var fs = o.files || [];
  if(fs.length){
    h.push('<div style="margin-top:14px;font-size:13px;font-weight:800;color:#003047">' + L('CHỨNG TỪ (' + fs.length + ' file, đính kèm email)', 'EVIDENCE (' + fs.length + ' file(s), attached)') + '</div><div style="margin-top:6px">');
    fs.forEach(function(f){
      var u = 'https://drive.google.com/file/d/' + f.id + '/view';
      h.push('<a href="' + u + '" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none;color:#1A1A1A;width:150px;vertical-align:top">' +
        '<img src="https://drive.google.com/thumbnail?id=' + f.id + '&sz=w300" width="150" style="width:150px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #DCE3EC;display:block" alt="">' +
        '<span style="display:block;font-size:11px;color:#5F6B78;margin-top:3px;word-break:break-all">' + e(naKindLabel_(f.kind)) + '</span></a>');
    });
    h.push('</div>');
  } else if(kind === 'reject' && o.rejectedFiles && o.rejectedFiles.length){
    h.push('<div style="margin-top:10px;font-size:12px;color:#7A2E2A">' + L('Đã xoá: ', 'Removed: ') + e(o.rejectedFiles.join(', ')) + '</div>');
  }
  h.push('<div style="margin:18px 0 6px;text-align:center"><a href="' + link + '" style="display:inline-block;background:' + col + ';color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:12px 26px;border-radius:10px">' +
    (kind === 'submit' ? L('✉ Mở CRM để xác nhận / từ chối', '✉ Open the CRM to approve / reject') : L('Mở case trên CRM', 'Open the case in the CRM')) + '</a></div>');
  h.push('<div style="font-size:11.5px;color:#8A95A3;text-align:center">' + e(o.id) + ' · ' + L('gửi tự động từ MMH CRM', 'sent automatically by MMH CRM') + '</div>');
  h.push('</div></div></div>');
  return h.join('');
}
function naKindLabel_(k){ return k === 'dist' ? naL_('Xác nhận NPP', 'Distributor confirmation') : k === 'order' ? naL_('Chứng từ đơn hàng', 'Order document') : k === 'tender' ? naL_('Thông báo trúng thầu', 'Tender award') : naL_('Khác', 'Other'); }
function naSendMail_(o, kind, user, to, cc, wk){
  var out = { ok:false };
  try{
    var subj = (kind === 'submit' ? naL_('[MMH CRM] Xin xác nhận ', '[MMH CRM] Approval request · ') : kind === 'approve' ? naL_('[MMH CRM] ĐÃ XÁC NHẬN ', '[MMH CRM] APPROVED · ') : kind === 'return' ? naL_('[MMH CRM] CẦN BỔ SUNG ', '[MMH CRM] CHANGES REQUESTED · ') : naL_('[MMH CRM] KHÔNG XÁC NHẬN ', '[MMH CRM] REJECTED · ')) +
      naTypeLabel_(o.type) + ' · ' + o.account + ' · ' + o.pic + (o.month ? ' · ' + o.month : '');
    var att = [], size = 0, skipped = 0;
    if(kind !== 'reject' && kind !== 'return') (o.files || []).forEach(function(f){
      try{ var b = DriveApp.getFileById(f.id).getBlob(); var s = b.getBytes().length; if(size + s > NA_MAX_ATTACH){ skipped++; return; } size += s; att.push(b); }catch(e){ skipped++; }
    });
    var html = naMailHtml_(o, kind, user, wk);
    var opt = { to:to.join(','), subject:subj, htmlBody:html, name:'MMH CRM · ' + (kind === 'submit' ? o.pic : user.pic) };
    if(cc && cc.length) opt.cc = cc.join(',');
    var rt = NA_ENV.email(kind === 'submit' ? o.pic : user.pic); if(rt) opt.replyTo = rt;
    if(att.length) opt.attachments = att;
    mmhMail_(opt);
    out = { ok:true, to:to, cc:cc, files:att.length };
    if(skipped) out.warn = naL_(skipped + ' file quá lớn — chỉ gửi link', skipped + ' file(s) too large — linked only');
  }catch(e){ out = { ok:false, error:String(e && e.message || e), warn:naL_('Chưa gửi được email: ', 'E-mail not sent: ') + String(e && e.message || e) }; }
  return out;
}

/* ═════════════ ③ KR — BÁO CÁO KPI THÁNG (đọc file MMH KPI FY68) ═════════════ */
var KR = { M5:'5. Member KPI Monthly', STAFF:'0. Staff List', DIR:'KPI EMAIL DIRECTORY', LOG:'_KPI_EMAIL_LOG', CC_ALWAYS:'vtt.hoa@manimedicalhanoi.com', TTL:60 };
function krNorm_(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function krNum_(v){ if(v === '' || v == null) return null; if(typeof v === 'number') return isFinite(v) ? v : null; var s = String(v).trim(); if(!s || /^#/.test(s)) return null;
  var pc = /%$/.test(s); s = s.replace(/[%\s]/g, '').replace(/,(?=\d{3}\b)/g, ''); if(/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.'); var x = parseFloat(s); if(isNaN(x)) return null; return pc ? x / 100 : x; }
function krMasterSS_(){
  var id = '';
  /* ⭐ v10.3 — file KPI thật = link ở ô D9 tab KPI (file KPI tự ghi vào đó); code chỉ là dự phòng */
  try{ id = k68IdOf_(String(NA_ENV.kpiLink() || '')); }catch(e){}
  if(!id) try{ id = k68IdOf_(K68_MASTER_LINK); }catch(e){}
  if(!id) throw new Error('KPI file link missing');
  return SpreadsheetApp.openById(id);
}
function krMembers_(book){
  var sh = book.getSheetByName(KR.M5), out = { members:{}, keys:[] };
  if(!sh || sh.getLastRow() < 5) throw new Error('Sheet "' + KR.M5 + '" not found in the KPI file');
  var V = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), hr = -1, H = {}, P = {};
  for(var i = 0; i < Math.min(V.length, 12) && hr < 0; i++){ var h = V[i].map(krNorm_); if(h.indexOf('member') >= 0 && h.indexOf('kpi code') >= 0) hr = i; }
  if(hr < 0) throw new Error('Header row of "' + KR.M5 + '" not found');
  V[hr].forEach(function(x, k){
    var s = String(x || '').replace(/\s+/g, ' ').trim(), m = /^(\d{6}|Q[1-4]|FY\d+) (Target|Actual|Weight|%|% x W)$/i.exec(s);
    if(m){ var key = m[1].toUpperCase(), f = { target:'t', actual:'a', weight:'w', '%':'p', '% x w':'pw' }[m[2].toLowerCase()]; (P[key] = P[key] || {})[f] = k; }
    else { var nn = krNorm_(s); if(nn && H[nn] == null) H[nn] = k; }
  });
  var cM = H['member'], cC = H['kpi code'], cG = H['kpi group'], cN = H['kpi name'], cU = H['unit'], cA = H['agg'];
  function vals(row){ var o = {}; Object.keys(P).forEach(function(key){ var c = P[key], x = {}; ['t','a','w','p','pw'].forEach(function(f){ x[f] = c[f] == null ? null : krNum_(row[c[f]]); }); o[key] = x; }); return o; }
  for(var r = hr + 1; r < V.length; r++){
    var row = V[r], tc = -1;
    for(var q0 = 0; q0 < Math.min(row.length, 12); q0++){ if(/^\s*TOTAL\b/i.test(String(row[q0] || ''))){ tc = q0; break; } }
    if(tc >= 0){
      var who = tc > 0 ? String(row[0] || '').trim() : '';
      if(!who){ var mm = /TOTAL\s*[-–:]\s*([^(]+)/i.exec(String(row[tc] || '')); who = mm ? mm[1].trim() : ''; }
      if(!who) continue;
      (out.members[who] = out.members[who] || { rows:{}, order:[] }).total = vals(row); continue;
    }
    var mem = String(row[cM] || '').trim(), code = String(row[cC] || '').trim();
    if(!mem || !code) continue;
    var M = out.members[mem] = out.members[mem] || { rows:{}, order:[] };
    if(!M.rows[code]) M.order.push(code);
    M.rows[code] = { code:code, group:cG == null ? '' : String(row[cG] || '').trim(), name:cN == null ? '' : String(row[cN] || '').trim(),
                     unit:cU == null ? '' : String(row[cU] || '').trim(), agg:cA == null ? '' : String(row[cA] || '').trim(), v:vals(row) };
  }
  out.keys = Object.keys(P);
  out.url = book.getUrl() + '#gid=' + sh.getSheetId();
  return out;
}
function krStaff_(book){
  var st = book.getSheetByName(KR.STAFF), staff = [];
  if(st && st.getLastRow() >= 3){
    var V = st.getRange(1, 1, st.getLastRow(), Math.min(st.getLastColumn(), 16)).getValues(), hr = -1, H = {};
    for(var i = 0; i < Math.min(V.length, 10) && hr < 0; i++){ var h = V[i].map(krNorm_); if(h.some(function(x){ return /^kpi name/.test(x); }) && h.some(function(x){ return /^full name/.test(x); })) hr = i; }
    if(hr >= 0){
      V[hr].forEach(function(x, k){ var nn = krNorm_(x); if(nn && H[nn] == null) H[nn] = k; });
      var col = function(re){ var k = null; Object.keys(H).forEach(function(x){ if(k == null && re.test(x)) k = H[x]; }); return k; };
      var cK = col(/^kpi name/), cF = col(/^full name/), cJ = col(/^job title/), cL = col(/^job level/), cR = col(/^mgmt/), cT = col(/^team$/), cD = col(/^department/);
      for(var r = hr + 1; r < V.length; r++){
        var full = String(V[r][cF] || '').trim(), key = String(V[r][cK] || '').trim(); if(!full && !key) continue;
        staff.push({ key:key, full:full, title:cJ == null ? '' : String(V[r][cJ] || '').trim(), level:cL == null ? '' : String(V[r][cL] || '').trim(), role:cR == null ? '' : String(V[r][cR] || '').trim(),
                     team:cT == null ? '' : String(V[r][cT] || '').trim(), dept:cD == null ? '' : String(V[r][cD] || '').trim(), email:'' });
      }
    }
  }
  var dir = book.getSheetByName(KR.DIR), mail = {}, cc = KR.CC_ALWAYS;
  if(dir && dir.getLastRow() >= 5){
    cc = String(dir.getRange(2, 3).getValue() || '').trim() || cc;
    dir.getRange(5, 1, dir.getLastRow() - 4, 3).getValues().forEach(function(r){ var id = String(r[0] || r[1] || '').trim(); if(id && r[2]) mail[id] = String(r[2]).trim(); });
  }
  staff.forEach(function(s){ s.email = mail[s.key] || mail[s.full] || NA_ENV.email(s.key) || ''; });
  return { staff:staff, cc:cc };
}
function krRecipients_(D, pic){
  var me = D.staff.filter(function(s){ return s.key === pic; })[0] || { key:pic, email:NA_ENV.email(pic) };
  var isTL = /team leader/i.test(me.role), isHOD = /hod/i.test(me.role);
  var tl = me.team ? D.staff.filter(function(s){ return s !== me && s.team === me.team && /team leader/i.test(s.role); })[0] : null;
  var hod = D.staff.filter(function(s){ return s !== me && s.dept && s.dept === me.dept && /hod/i.test(s.role); })[0];
  var dir = D.staff.filter(function(s){ return s !== me && /director/i.test(s.level); })[0];
  var toP = (!isTL && !isHOD && tl) ? tl : ((!isHOD ? hod : null) || dir);
  var to = toP && toP.email ? [toP.email] : [], cc = [];
  [hod, dir].forEach(function(p){ if(p && p.email) cc.push(p.email); });
  String(D.cc || '').split(/[,;\s]+/).forEach(function(e){ if(e) cc.push(e); });
  cc = cc.filter(function(e, i){ return cc.indexOf(e) === i && to.indexOf(e) < 0 && e !== me.email; });
  return { me:me, to:to, cc:cc, toName:toP ? (toP.key || toP.full) : '' };
}
/* tháng đã kết thúc (chỉ để hiển thị ✓ — không còn khoá số) */
function krClosed_(ym){ return String(ym) < Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM'); }
function krAllowed_(user, member){
  if(naS_(member) === naS_(user.pic)) return true;
  if(naIsAdmin_(user)) return true;
  var aps = naApprovers_(member); return aps.indexOf(naS_(user.pic)) >= 0;
}
function krData(user, p){
  var member = naS_(p.member) || naS_(user.pic);
  if(!krAllowed_(user, member)) return { ok:false, error:naL_('Bạn chỉ xem / gửi được KPI của mình.', 'You can only view / send your own KPI.') };
  var ck = 'KR_' + naNorm_(member).replace(/\W/g, '_');
  if(!p.fresh){ try{ var c = CacheService.getScriptCache().get(ck); if(c) return JSON.parse(c); }catch(e){} }
  var book = krMasterSS_(), M5 = krMembers_(book), mem = M5.members[member];
  if(!mem){
    var alt = Object.keys(M5.members).filter(function(k){ return krNorm_(k) === krNorm_(member); })[0];
    mem = alt ? M5.members[alt] : null; if(alt) member = alt;
  }
  if(!mem) return { ok:false, error:naL_('Sheet 5. Member KPI Monthly chưa có dòng của ', 'Sheet 5. Member KPI Monthly has no rows for ') + member };
  var months = M5.keys.filter(function(k){ return /^\d{6}$/.test(k); }).sort();
  /* Target / Actual tháng trống ở sheet 5 ⇒ lấy đúng ô "<tháng> Target / Actual" của 3. Detail KPI */
  try{
    var dsh = book.getSheetByName('3. Detail KPI');
    if(dsh){
      var DL = kh_layout_(dsh);
      if(!months.length) months = DL.months.slice();
      mem.order.forEach(function(code){
        var ri = DL.rows[code], rw = mem.rows[code]; if(ri == null || !rw) return;
        DL.months.forEach(function(m){
          var x = rw.v[m] = rw.v[m] || { t:null, a:null, w:null, p:null, pw:null };
          if(x.t == null && DL.tCol[m] != null) x.t = krNum_(DL.V[ri][DL.tCol[m]]);
          if(x.a == null && DL.aCol[m] != null) x.a = krNum_(DL.V[ri][DL.aCol[m]]);
        });
      });
    }
  }catch(e){}
  /* ⭐ v10.3 — rule Target = 0 (kỳ đã tới) ⇒ đạt 100%, nhận đủ trọng số (giống sheet 5) */
  var curYm = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM');
  var qStart = {}; months.forEach(function(m, i){ var q = 'Q' + (Math.floor(i / 3) + 1); if(!qStart[q]) qStart[q] = m; });
  mem.order.forEach(function(code){
    var vv = mem.rows[code].v || {};
    Object.keys(vv).forEach(function(K){
      var x = vv[K]; if(!x || x.t !== 0) return;
      var started = /^\d{6}$/.test(K) ? K <= curYm : /^Q/.test(K) ? (qStart[K] && qStart[K] <= curYm) : true;
      if(!started) return;
      if(x.p == null) x.p = 1;
      if(x.pw == null && x.w != null) x.pw = x.w;
      x.zero = true;
    });
  });
  /* dòng TOTAL không đọc được ⇒ cộng % × W của từng dòng (đúng số sheet 5) */
  var tot = mem.total || {};
  M5.keys.forEach(function(K){
    if(tot[K] && tot[K].pw != null) return;
    var s = null, w = null;
    mem.order.forEach(function(code){ var x = (mem.rows[code].v || {})[K]; if(x && x.pw != null){ s = (s || 0) + x.pw; } if(x && x.w != null) w = (w || 0) + x.w; });
    if(s != null) tot[K] = { pw:s, w:w, calc:true };
  });
  mem.total = tot;
  var D = krStaff_(book), R = krRecipients_(D, member);
  var rows = mem.order.map(function(code){ return mem.rows[code]; });
  var team = []; try{ team = NA_ENV.teamPics().filter(function(pc){ return krAllowed_(user, pc); }); }catch(e){}
  if(team.indexOf(naS_(user.pic)) < 0 && M5.members[naS_(user.pic)]) team.unshift(naS_(user.pic));
  rows.forEach(function(r){ r.short = krShort_(r, NA_ENV.lang()); r.gs = krGroupShort_(r.group, NA_ENV.lang()); });
  var out = { ok:true, kr:true, member:member, kpiFile:book.getName(), kpiId:book.getId(), full:(R.me.full || member), title:R.me.title || NA_ENV.title(member) || '', months:months,
              closed:months.filter(krClosed_), cur:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM'),
              rows:rows, total:mem.total || {}, to:R.to, cc:R.cc, toName:R.toName, src:M5.url, members:team,
              book:D.staff.filter(function(s){ return s.email; }).map(function(s){ return { k:s.key || s.full, e:s.email, t:s.title }; }),
              readAt:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') };
  try{ var s = JSON.stringify(out); if(s.length < 95000) CacheService.getScriptCache().put(ck, s, KR.TTL); }catch(e){}
  return out;
}
function krQOf_(months, m){ var i = months.indexOf(String(m)); return i < 0 ? '' : 'Q' + (Math.floor(i / 3) + 1); }
function krPct_(v){ return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
function krFmt_(v, unit){ if(v == null) return '—'; if(/%/.test(unit || '')) return krPct_(v); var a = Math.abs(v); return Number(v).toLocaleString('en-US', { maximumFractionDigits: a >= 100 ? 0 : (a >= 10 ? 1 : 2) }); }
function krColor_(p){ return p == null ? '#8A95A3' : p >= 1.2 ? '#1E7B34' : p >= 1 ? '#2E7D32' : p >= 0.9 ? '#B7791F' : '#B3261E'; }
/* ⭐ v10.3 — tên KPI ngắn gọn (tên đầy đủ hiện khi rê chuột / trong ngoặc ở email) */
function krSeg_(name){
  var s = String(name || ''), m = /[–-]\s*([^–]+?)\s*$/.exec(s), last = m ? m[1].trim() : '';
  var npp = /([^,]+?)\s+Distributor/i.exec(last); if(npp) return npp[1].replace(/\s*\(new\)\s*/i, '').trim();
  var reg = /(North|Central|South|Thailand)/i.exec(last); if(reg) return ({ north:'miền Bắc', central:'miền Trung', south:'miền Nam', thailand:'Thái Lan' })[reg[1].toLowerCase()];
  return '';
}
function krShort_(r, lang){
  var en = lang === 'en', n = String(r.name || ''), c = String(r.code || ''), seg = krSeg_(n), L = function(vi, e){ return en ? e : vi; };
  var regEn = { 'miền Bắc':'North', 'miền Trung':'Central', 'miền Nam':'South', 'Thái Lan':'Thailand' };
  var tag = seg ? (en ? (regEn[seg] || seg) : seg) : '';
  var base;
  if(/^F6/.test(c) || /New & Relaunched/i.test(n)) base = /JIZAI/i.test(n) ? L('Doanh số JIZAI', 'JIZAI sales') : /Composite/i.test(n) ? L('Doanh số Composite', 'Composite sales') : L('Doanh số SP mới', 'New-product sales');
  else if(/^F/.test(c)) base = /Manipler/i.test(n) ? L('Doanh số Manipler', 'Manipler sales') : /Knife|Suture/i.test(n) ? L('Doanh số Dao · Chỉ', 'Knife · Suture sales') : /Hook|Forceps/i.test(n) ? L('Doanh số Hook · Forceps', 'Hook · Forceps sales') : L('Doanh số NPP', 'Distributor sales');
  else if(/^C1-/.test(c)) base = L('Mở mới đại lý / SKU', 'New accounts / SKUs');
  else if(/^C2-02/.test(c)) base = L('Lập hồ sơ key account', 'Key-account profiles');
  else if(/^C2-/.test(c)) base = /Key Account/i.test(n) ? L('Key account mới', 'New key accounts') : L('Mở mới account / SKU', 'New accounts / SKUs');
  else if(/^C3-/.test(c)) base = /Dealer/i.test(n) ? L('Viếng thăm đại lý', 'Dealer visits') : /Distributor|End Customer/i.test(n) ? L('Viếng thăm NPP / KH cuối', 'Distributor / end-customer visits') : /Co-?visit/i.test(n) ? L('Đi cùng sales', 'Co-visits') : L('Viếng thăm khách hàng', 'Customer visits');
  else if(/^C5-/.test(c)) base = L('Doanh số hỗ trợ bán', 'Supported sales');
  else if(/^C6-/.test(c)) base = L('SL Composite hỗ trợ', 'Composite qty supported');
  else if(/^C7-/.test(c)) base = L('SL JIZAI hỗ trợ', 'JIZAI qty supported');
  else if(/^C10-/.test(c)) base = /Training/i.test(n) ? L('Sự kiện đào tạo KH', 'Customer training events') : /Presentation|Demonstration/i.test(n) ? L('Giới thiệu SP / case demo', 'Product presentations / demos') : L('Sự kiện T&E', 'T&E events');
  else if(/^L2-/.test(c)) base = /Internal Training/i.test(n) ? L('Đào tạo nội bộ (người dạy)', 'Internal training delivered') : L('Đào tạo & phát triển', 'Training & development');
  else if(/^L3-/.test(c)) base = L('Điểm hành vi (KBI)', 'Behaviour score (KBI)');
  else { base = n.replace(/^(Number of|MMH)\s+/i, '').split(/\s+[–-]\s+/)[0]; tag = ''; }
  return base + (tag && !/KBI|nội bộ|Internal/.test(base) ? ' · ' + tag : '');
}
function krGroupShort_(g, lang){
  var en = lang === 'en', s = String(g || ''), L = function(vi, e){ return en ? e : vi; };
  if(/Turnover/i.test(s) && /New|Relaunch/i.test(s)) return L('Doanh số sản phẩm mới', 'New-product turnover');
  if(/Turnover/i.test(s)) return L('Doanh số', 'Turnover');
  if(/Supported/i.test(s)) return L('Bán hàng hỗ trợ', 'Supported sales');
  if(/Visit/i.test(s)) return L('Viếng thăm khách hàng', 'Customer visits');
  if(/New Customer|Account/i.test(s)) return L('Mở mới', 'New accounts');
  if(/Event/i.test(s)) return L('Sự kiện', 'Events');
  if(/Training|Development/i.test(s)) return L('Đào tạo', 'Training');
  if(/Behaviour|Behavior/i.test(s)) return L('Hành vi', 'Behaviour');
  return s.replace(/^[^–-]+[–-]\s*/, '') || 'KPI';
}
/* tiền USD hiển thị cùng kiểu với app: $1,234 */
function krMoney_(v, unit, withUnit){
  if(/usd/i.test(unit || '')) return v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US');
  return krFmt_(v, unit) + (withUnit && !/%/.test(unit || '') ? ' ' + naEsc_(unit) : '');
}
/* email báo cáo KPI: trang trọng, font Aptos, bảng có cột tiến độ */
function krMailHtml_(d, f){
  var e = naEsc_, m = String(f.month), q = krQOf_(d.months, m), fy = (d.months[0] ? naFy_(d.months[0]) : 'FY');
  var T = d.total || {}, tm = (T[m] || {}).pw, tq = (T[q] || {}).pw, tf = (T[fy.toUpperCase()] || {}).pw;
  var ml = m.slice(4, 6) + '/' + m.slice(0, 4), en = f.lang === 'en', L = function(vi, enS){ return en ? enS : vi; };
  var font = "font-family:Aptos,'Segoe UI',Calibri,Arial,sans-serif;";
  var td = 'border:1px solid #BFBFBF;padding:5px 8px;font-size:13px;' + font;
  var th = td + 'background:#F2F2F2;font-weight:bold;';
  var bar = function(p){ var w = Math.max(0, Math.min(100, Math.round((p || 0) * 100))); var c = p == null ? '#BFBFBF' : p >= 1 ? '#548235' : p >= 0.8 ? '#BF8F00' : '#C00000';
    return '<table cellpadding="0" cellspacing="0" style="width:110px;border-collapse:collapse"><tr><td style="height:9px;width:' + w + '%;background:' + c + ';font-size:1px">&nbsp;</td><td style="height:9px;background:#E7E6E6;font-size:1px">&nbsp;</td></tr></table>'; };
  var h = ['<div style="' + font + 'font-size:14px;color:#000;line-height:1.5">'];
  if(f.greeting) h.push('<p style="margin:0 0 8px">' + e(f.greeting).replace(/\n/g, '<br>') + '</p>');
  if(f.intro) h.push('<p style="margin:0 0 12px">' + e(f.intro).replace(/\n/g, '<br>') + '</p>');
  h.push('<p style="margin:0 0 6px"><b>1. ' + L('Kết quả KPI tháng ', 'KPI results – ') + ml + '</b> · ' + e(d.full || d.member) + (d.title ? ' (' + e(d.title) + ')' : '') + '</p>');
  h.push('<p style="margin:0 0 8px">' + L('Tổng KPI: tháng ', 'Total KPI: month ') + '<b>' + krPct_(tm) + '</b> · ' + q + ' <b>' + krPct_(tq) + '</b> · ' + fy + L(' lũy kế ', ' to date ') + '<b>' + krPct_(tf) + '</b></p>');
  h.push('<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;' + font + '"><tr>' +
    [L('Nhóm KPI', 'KPI group'), 'KPI', L('Trọng số', 'Weight'), 'Target', 'Actual', L('% đạt', '% achieved'), L('Tiến độ', 'Progress'), '% × W']
      .map(function(x, i){ return '<th style="' + th + (i > 1 ? 'text-align:right;' : 'text-align:left;') + '">' + x + '</th>'; }).join('') + '</tr>');
  var lastG = '';
  d.rows.forEach(function(r){
    var v = (r.v || {})[m] || {}, w = v.w != null ? v.w : ((r.v || {})[q] || {}).w; if(!w) return;
    var g = r.gs || krGroupShort_(r.group, f.lang);
    h.push('<tr><td style="' + td + 'color:#404040">' + (g !== lastG ? e(g) : '') + '</td>' +
      '<td style="' + td + '"><b>' + e(r.code) + '</b> ' + e(r.short || krShort_(r, f.lang)) + (v.zero ? ' <span style="color:#7F7F7F">(' + L('target = 0 ⇒ đạt 100%', 'target = 0 ⇒ 100%') + ')</span>' : '') + '</td>' +
      '<td style="' + td + 'text-align:right">' + krPct_(w) + '</td>' +
      '<td style="' + td + 'text-align:right">' + krMoney_(v.t, r.unit, true) + '</td>' +
      '<td style="' + td + 'text-align:right"><b>' + krMoney_(v.a, r.unit, false) + '</b></td>' +
      '<td style="' + td + 'text-align:right"><b>' + krPct_(v.p) + '</b></td>' +
      '<td style="' + td + '">' + bar(v.p) + '</td>' +
      '<td style="' + td + 'text-align:right">' + krPct_(v.pw) + '</td></tr>');
    lastG = g;
  });
  h.push('<tr><td colspan="7" style="' + th + 'text-align:right">TOTAL ' + ml + '</td><td style="' + th + 'text-align:right">' + krPct_(tm) + '</td></tr></table>');
  var lines = function(t){ return String(t || '').split(/\n/).map(function(x){ return x.replace(/^\s*[-•*·]\s*/, '').trim(); }).filter(String); };
  [['2. Analysis & Next Actions', f.analysis], ['3. Highlights & Challenges', f.highlights]].forEach(function(s){
    var ls = lines(s[1]); if(!ls.length) return;
    h.push('<p style="margin:14px 0 4px"><b>' + s[0] + '</b></p><ul style="margin:0 0 0 20px;padding:0">' + ls.map(function(x){ return '<li>' + e(x) + '</li>'; }).join('') + '</ul>');
  });
  if(f.sign) h.push('<p style="margin:16px 0 0">' + e(f.sign).replace(/\n/g, '<br>') + '</p>');
  h.push('<p style="margin:14px 0 0;font-size:11px;color:#7F7F7F">' + L('Số liệu: sheet 5. Member KPI Monthly – ', 'Source: sheet 5. Member KPI Monthly – ') + e(d.kpiFile || 'MMH KPI FY68') + ', ' + e(d.readAt) + '.</p>');
  h.push('</div>');
  return h.join('');
}
function krForm_(p){
  return { month:naS_(p.month), greeting:String(p.greeting || ''), intro:String(p.intro || ''), analysis:String(p.analysis || ''),
           highlights:String(p.highlights || ''), sign:String(p.sign || ''), lang:naS_(p.lang) || NA_ENV.lang() };
}
function krPreview(user, p){
  var d = krData(user, p); if(!d.ok) return d;
  var f = krForm_(p); if(!f.month) return { ok:false, error:'month?' };
  return { ok:true, html:krMailHtml_(d, f), subject:'[MMH KPI] ' + naL_('Báo cáo KPI tháng ', 'KPI report ') + f.month.slice(4, 6) + '/' + f.month.slice(0, 4) + ' — ' + d.member };
}
function krSend(user, p){
  var d = krData(user, p); if(!d.ok) return d;
  var f = krForm_(p); if(!f.month) return { ok:false, error:'month?' };
  var split = function(s){ return String(s || '').split(/[,;\s]+/).map(function(x){ return x.trim().toLowerCase(); }).filter(function(x){ return /^[^@\s]+@(manimedicalhanoi\.com|mani\.inc)$/i.test(x); }); };
  var to = split(p.to), cc = split(p.cc).filter(function(x){ return to.indexOf(x) < 0; });
  if(!to.length) return { ok:false, error:naL_('Chưa có người nhận (To).', 'No recipient (To).') };
  var subj = naS_(p.subject) || ('[MMH KPI] ' + naL_('Báo cáo KPI tháng ', 'KPI report ') + f.month.slice(4, 6) + '/' + f.month.slice(0, 4) + ' — ' + d.member);
  var opt = { to:to.join(','), subject:subj, htmlBody:krMailHtml_(d, f), name:(d.full || d.member) };
  if(cc.length) opt.cc = cc.join(',');
  var rt = NA_ENV.email(user.pic); if(rt) opt.replyTo = rt;
  mmhMail_(opt);
  try{
    var book = krMasterSS_(), lg = book.getSheetByName(KR.LOG);
    if(lg) lg.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), (NA_ENV.email(user.pic) || user.pic) + ' (CRM)', d.member, f.month,
      ((d.total || {})[f.month] || {}).pw == null ? '' : ((d.total || {})[f.month] || {}).pw, to.join(', '), cc.join(', '), subj]);
  }catch(e){}
  try{ NA_ENV.log(user, 'kpi-mail', d.member, f.month + ' → ' + to.join(', ')); }catch(e){}
  return { ok:true, message:naL_('Đã gửi báo cáo KPI tới ', 'KPI report sent to ') + to.join(', ') + (cc.length ? ' · CC ' + cc.join(', ') : '') };
}
function krRoute_(action, user, p){
  if(action === 'krData') return krData(user, p);
  if(action === 'krPreview') return krPreview(user, p);
  if(action === 'krSend') return krSend(user, p);
  return { ok:false, error:'Unknown action: ' + action };
}

/* ⭐ xoá cache Báo cáo KPI sau mỗi lần đẩy KPI ⇒ app đọc số mới ngay */
function krBust_(){
  var c = CacheService.getScriptCache(), keys = [];
  try{ NA_ENV.teamPics().forEach(function(p){ keys.push('KR_' + naNorm_(p).replace(/\W/g, '_')); }); }catch(e){}
  NA_ENV.admins.concat(NA_ENV.deciders).forEach(function(p){ keys.push('KR_' + naNorm_(p).replace(/\W/g, '_')); });
  if(keys.length) c.removeAll(keys);
}


/* ════════════════════════════════════════════════════════════════════════════════════════════════
   ⭐ v10.8 · MODULE DÙNG CHUNG (CRM VN + CRM Thailand Surgical)
   ④ WR   — email báo cáo tuần: CÙNG một mẫu cho mọi nhóm (Thái = bản tiếng Anh), thanh tiến độ,
            dòng tổng "Đi địa bàn" đứng đầu, việc văn phòng (account MMH) tách riêng, việc chưa tới ngày không có 100%.
   ⑤ WK   — rule lưu hoạt động: chưa tới ngày bắt đầu ⇒ không được Completed; bấm Completed sớm ⇒ Finish date = hôm nay
            (việc đã quá hạn thì giữ nguyên ngày cũ).
   ⑥ TRIP — đề xuất công tác ghi THẲNG vào file Business Trip (sheet "MMH Travel report") + email xin duyệt.
   ════════════════════════════════════════════════════════════════════════════════════════════════ */

/* ═════════════ ⑤ WK — RULE TRẠNG THÁI / NGÀY KẾT THÚC ═════════════ */
function wkToday_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function wkIso_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var s = String(v).trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : s.slice(0, 10);
}
/* d = dữ liệu đang lưu · prev = dòng hiện có trên sheet (null nếu thêm mới). Trả về chuỗi lỗi hoặc '' */
function wkApplyRule_(d, prev, lang){
  var L = function(vi, en){ return lang === 'en' ? en : vi; };
  var today = wkToday_();
  var st = String(d.status != null && d.status !== '' ? d.status : (prev && prev.status) || '');
  var start = wkIso_(d.start || (prev && prev.start) || '');
  var fin = wkIso_(d.finish || (prev && prev.finish) || start);
  if(!/complet/i.test(st)) return '';
  if(start && start > today)
    return L('Hoạt động bắt đầu ngày ' + start.split('-').reverse().join('/') + ' — chưa diễn ra nên chưa thể chuyển sang Completed / 100%. Hãy để Not Started và cập nhật khi đã thực hiện.',
             'This activity starts on ' + start.split('-').reverse().join('/') + ' — it has not happened yet, so it cannot be Completed / 100%. Keep it Not Started and update it once done.');
  var wasDone = !!(prev && /complet/i.test(String(prev.status || '')));
  /* hoàn thành sớm hơn ngày kết thúc dự kiến ⇒ Finish date = ngày bấm Completed; việc quá hạn giữ nguyên ngày cũ */
  if(!wasDone && fin && fin > today) d.finish = today;
  return '';
}

/* ═════════════ ④ WR — EMAIL BÁO CÁO TUẦN DÙNG CHUNG ═════════════ */
function wrE_(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function wrN_(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim(); }
function wrDmy_(iso){ iso = wkIso_(iso); return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
function wrDm_(iso){ iso = wkIso_(iso); return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
function wrColor_(p){ return p >= 100 ? '#1E7B34' : p >= 70 ? '#2E8B57' : p >= 40 ? '#C98A1A' : p > 0 ? '#D9663A' : '#8A97B5'; }
function wrBar_(p){
  p = Math.max(0, Math.min(100, Math.round(p || 0)));
  var c = p > 0 ? wrColor_(p) : '#C9D2E0';
  var fill = p <= 0 ? '' : '<td width="' + p + '%" style="background:' + c + ';height:11px;line-height:11px;font-size:0">&nbsp;</td>';
  var empty = p >= 100 ? '' : '<td width="' + (100 - p) + '%" style="background:#E3E9F4;height:11px;line-height:11px;font-size:0">&nbsp;</td>';
  return '<table cellpadding="0" cellspacing="0" style="width:88px;border-collapse:collapse;table-layout:fixed"><tr>' + fill + empty + '</tr></table>' +
    '<div style="font-size:9pt;font-weight:700;color:' + (p > 0 ? c : '#5A6A8A') + ';text-align:center;margin-top:2px">' + p + '%</div>';
}
function wrRich_(txt){
  txt = String(txt || '').trim();
  if(!txt) return '<span style="color:#B0B8C8">—</span>';
  var safe = wrE_(txt).replace(/^([^\n:]{1,32}:)/gm, '<b>$1</b>').replace(/\n/g, '<br>');
  return safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#3A5CAA">$1</a>');
}
function wrPhoto_(url, lang){
  var u = String(url || '').trim(); if(!u) return '';
  var links = u.split(/\s|\n/).filter(function(x){ return /^https?:/.test(x); });
  if(!links.length) return '';
  return ' <a href="' + wrE_(links[0]) + '" style="background:#E8EEF9;color:#3A5CAA;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;text-decoration:none;white-space:nowrap">' +
    links.length + (lang === 'en' ? ' photo' + (links.length > 1 ? 's' : '') : ' ảnh') + '</a>';
}
function wrIsOffice_(r){ var n = wrN_(r.accName); return n === 'mmh' || /^mmh\b/.test(n) && /office|van phong/.test(wrN_(r.accType)); }
function wrIsTbd_(r){ return /^tbd$/i.test(String(r.accName || '').trim()); }
function wrFuture_(r, today){ var s = wkIso_(r.start); return !!s && s > today; }
function wrPct_(r, today){
  if(wrFuture_(r, today)) return 0;                                           /* chưa diễn ra ⇒ không có tiến độ */
  var st = String(r.status || '');
  if(/complet/i.test(st)) return 100;
  if(/cancel/i.test(st)) return 0;
  if(/progress/i.test(st)) return 50;
  return 0;
}
function wrStatus_(r, today, lang){
  var st = String(r.status || '');
  if(wrFuture_(r, today) && (/complet/i.test(st) || !st)) return lang === 'en' ? 'Planned' : 'Kế hoạch';
  return st || '—';
}
function wrOverdue_(r, today){
  var st = String(r.status || '');
  if(/complet|cancel/i.test(st)) return false;
  var f = wkIso_(r.finish || r.start);
  return !!f && f < today;
}
function wrStStyle_(txt){
  if(/complet/i.test(txt)) return 'color:#1E6B3A;font-weight:700';
  if(/progress/i.test(txt)) return 'color:#3A5CAA;font-weight:700';
  if(/cancel/i.test(txt)) return 'color:#8A1C1C;font-weight:700';
  return 'color:#5A6A8A';
}
var WR_TD = 'padding:6px 9px;border-top:1px solid #EEF1F7;';
function wrRowHtml_(r, i, o){
  var today = o.today, en = o.lang === 'en';
  var pct = wrPct_(r, today), od = !o.isNext && wrOverdue_(r, today);
  var meta = [r.accType, r.accProv].filter(String).join(' · ');
  var body = o.isNext ? (r.plan || r.nextAction) : (r.result || r.plan);
  var stTxt = wrStatus_(r, today, o.lang);
  return '<tr style="' + (od ? 'background:#FFECEC;' : '') + '">' +
    '<td style="' + WR_TD + 'color:#8A97B5;text-align:center;white-space:nowrap">' + wrE_(r.no || (i + 1)) + '</td>' +
    '<td style="' + WR_TD + '"><b>' + wrE_(r.accName || '—') + '</b>' +
      (od ? ' <span style="background:#D9433F;color:#fff;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap">' + (en ? 'OVERDUE' : 'QUÁ HẠN') + '</span>' : '') +
      (meta || r.typeAction ? '<div style="font-size:8.5pt;color:#8A97B5">' + wrE_(meta) + (r.typeAction ? (meta ? ' · ' : '') + wrE_(r.typeAction) : '') + '</div>' : '') + '</td>' +
    '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrE_(wrDmy_(r.start)) + '</td>' +
    '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + (od ? 'color:#D9433F;font-weight:700' : '') + '">' + wrE_(wrDmy_(r.finish || r.start)) + '</td>' +
    '<td style="' + WR_TD + 'text-align:center">' + wrBar_(pct) + '</td>' +
    '<td style="' + WR_TD + 'font-size:9.5pt;line-height:1.5">' + wrRich_(body) + wrPhoto_(r.photo, o.lang) + '</td>' +
    '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(stTxt) + '">' + wrE_(stTxt) + '</td></tr>';
}
function wrGroupHead_(label, n, pct, color){
  return '<tr style="background:#EEF3FB"><td colspan="7" style="padding:6px 9px;font-weight:700;color:#0E2F5F">' +
    '<span style="display:inline-block;background:' + (color || '#3A5CAA') + ';color:#fff;border-radius:4px;padding:1px 6px;font-size:8.5pt;font-weight:700;margin-right:6px">' + n + '</span>' +
    wrE_(label) + (pct == null ? '' : ' &nbsp;<span style="font-weight:800;color:' + wrColor_(pct) + '">' + pct + '%</span>') + '</td></tr>';
}
/* bảng đi địa bàn: ① dòng tổng "Đi địa bàn" · ② theo Type task · ③ Làm việc văn phòng / họp team */
function wrVisitTable_(rows, o){
  var en = o.lang === 'en', today = o.today, L = function(vi, e){ return en ? e : vi; };
  rows = (rows || []).slice().sort(function(a, b){ return String(wkIso_(a.start)).localeCompare(String(wkIso_(b.start))); });
  var tbd = rows.filter(wrIsTbd_), office = rows.filter(function(r){ return !wrIsTbd_(r) && wrIsOffice_(r); });
  var field = rows.filter(function(r){ return !wrIsTbd_(r) && !wrIsOffice_(r); });
  var act = field.filter(function(r){ return !/cancel/i.test(String(r.status || '')); });
  var done = act.filter(function(r){ return !wrFuture_(r, today) && /complet/i.test(String(r.status || '')); });
  var body = '';
  /* ① dòng tổng */
  if(act.length || tbd.length){
    var t = tbd[0] || {}, pct = 0, res = '', st = '';
    if(o.isNext){
      res = String(t.plan || '').trim() || L('Kế hoạch ' + act.length + ' cuộc hẹn đi địa bàn trong tuần', act.length + ' field appointment(s) planned this week');
      st = L('Kế hoạch', 'Planned');
    } else {
      pct = act.length ? Math.round(done.length / act.length * 100) : (/complet/i.test(String(t.status || '')) ? 100 : 0);
      var accs = {}; done.forEach(function(r){ accs[wrN_(r.accName)] = 1; });
      var nAcc = Object.keys(accs).length, miss = act.length - done.length;
      var head = String(t.result || '').trim() || L('Đã tiếp cận ' + ('0' + nAcc).slice(-2) + ' địa bàn / account', 'Visited ' + ('0' + nAcc).slice(-2) + ' account(s)');
      var lines = act.map(function(r){
        var ok = !wrFuture_(r, today) && /complet/i.test(String(r.status || ''));
        var od = wrOverdue_(r, today);
        return (ok ? '✓ ' : '✗ ') + wrDm_(r.start) + ' · ' + (r.accName || '—') + ' — ' + (ok ? 'Completed' : wrStatus_(r, today, o.lang) + (od ? L(' (quá hạn)', ' (overdue)') : ''));
      });
      res = head + '\n' + (act.length
        ? (miss > 0 ? L(('0' + miss).slice(-2) + ' cuộc hẹn không được thực hiện theo kế hoạch, chi tiết:', ('0' + miss).slice(-2) + ' appointment(s) not carried out as planned, details:')
                    : L('Tất cả ' + act.length + ' cuộc hẹn đã thực hiện theo kế hoạch:', 'All ' + act.length + ' appointment(s) carried out as planned:')) + '\n' + lines.join('\n')
        : L('Chưa có cuộc hẹn đi địa bàn cụ thể nào trong tuần.', 'No specific field appointment this week.'));
      st = act.length && done.length === act.length ? 'Completed' : (done.length + '/' + act.length);
    }
    body += wrGroupHead_(L('Đi địa bàn · tổng hợp tuần', 'Field visits · weekly summary'), act.length, o.isNext ? null : pct, '#1E7B34') +
      '<tr style="background:#F6FBF7"><td style="' + WR_TD + 'color:#1E7B34;text-align:center;font-weight:800">Σ</td>' +
      '<td style="' + WR_TD + '"><b>' + L('Đi địa bàn', 'Field visits') + '</b><div style="font-size:8.5pt;color:#8A97B5">' +
        (tbd.length ? L('Kế hoạch tuần · ', 'Weekly plan · ') : '') + act.length + L(' cuộc hẹn đã lên kế hoạch', ' planned appointment(s)') + '</div></td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrDmy_(o.from) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrDmy_(o.to) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center">' + wrBar_(pct) + '</td>' +
      '<td style="' + WR_TD + 'font-size:9.5pt;line-height:1.55">' + wrRich_(res) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(st) + '">' + wrE_(st) + '</td></tr>';
  }
  /* ② theo Type task */
  var g = {}, order = [];
  field.forEach(function(r){ var k = String(r.typeTask || '').trim() || L('— Chưa phân loại —', '— No type —'); if(!g[k]){ g[k] = []; order.push(k); } g[k].push(r); });
  order.sort(function(a, b){ return a.localeCompare(b); });
  order.forEach(function(k){
    var items = g[k], a2 = items.filter(function(r){ return !/cancel/i.test(String(r.status || '')); });
    var gp = a2.length ? Math.round(a2.reduce(function(s, r){ return s + wrPct_(r, today); }, 0) / a2.length) : 0;
    body += wrGroupHead_(k, items.length, gp);
    items.forEach(function(r, i){ body += wrRowHtml_(r, i, o); });
  });
  /* ③ văn phòng / họp team */
  if(office.length){
    var a3 = office.filter(function(r){ return !/cancel/i.test(String(r.status || '')); });
    var op = a3.length ? Math.round(a3.reduce(function(s, r){ return s + wrPct_(r, today); }, 0) / a3.length) : 0;
    body += wrGroupHead_(L('Làm việc ở văn phòng / Họp team', 'Office work / team meeting'), office.length, op, '#6B7A90');
    office.forEach(function(r, i){ body += wrRowHtml_(r, i, o); });
  }
  if(!body) body = '<tr><td colspan="7" style="padding:14px;text-align:center;color:#8A97B5">' + (o.isNext ? L('Chưa có kế hoạch đi địa bàn cho tuần sau.', 'No planned activity for next week.') : L('Chưa ghi nhận hoạt động nào trong tuần.', 'No activity recorded for this week.')) + '</td></tr>';
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">' +
    '<thead><tr style="background:#3A5CAA;color:#fff">' +
      '<th style="padding:7px 9px;width:42px;text-align:center">No.</th>' +
      '<th style="padding:7px 9px;text-align:left">Account</th>' +
      '<th style="padding:7px 9px;width:82px;text-align:center">' + (o.isNext ? 'Planned start' : 'Start date') + '</th>' +
      '<th style="padding:7px 9px;width:82px;text-align:center">Finish date</th>' +
      '<th style="padding:7px 9px;width:100px;text-align:center">' + L('Tiến độ', 'Progress') + '</th>' +
      '<th style="padding:7px 9px;text-align:left">Plan &amp; result</th>' +
      '<th style="padding:7px 9px;width:110px;text-align:center">Status</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table>';
}
function wrOtherPct_(x){
  var p = Number(x && x.progress);
  if(!isNaN(p) && x.progress !== '' && x.progress != null) return Math.max(0, Math.min(100, Math.round(p <= 1 && p > 0 && String(x.progress).indexOf('.') >= 0 ? p * 100 : p)));
  var st = String((x && x.status) || '');
  return /complet/i.test(st) ? 100 : /progress/i.test(st) ? 50 : 0;
}
function wrOtherTable_(list, o){
  var en = o.lang === 'en', today = o.today, L = function(vi, e){ return en ? e : vi; };
  if(!list || !list.length)
    return '<p style="margin:4px 0 12px;font-size:10.5pt;color:#8A97B5">' + (o.isNext ? L('Chưa có công việc khác cho tuần sau.', 'No other task planned for next week.') : L('Chưa ghi nhận công việc khác trong tuần.', 'No other task recorded for this week.')) + '</p>';
  var fut = function(x){ var s = wkIso_(x.start || x.planned); return o.isNext && !!s && s > today; };
  var rows = '';
  list.forEach(function(g){
    var kp = fut(g) ? 0 : wrOtherPct_(g), kst = fut(g) && /complet/i.test(String(g.status || '')) ? L('Kế hoạch', 'Planned') : (g.status || 'To Do');
    rows += '<tr style="background:#EEF3FB"><td style="' + WR_TD + 'color:#3A5CAA;font-weight:700;white-space:nowrap">' + wrE_(g.type || 'Other') + '</td>' +
      '<td style="' + WR_TD + '" colspan="2"><b>' + wrE_(g.keyTask || '—') + '</b>' +
        ((!o.isNext && String(g.result || '').trim()) ? '<div style="font-size:9.5pt;color:#41506B;margin-top:3px;line-height:1.5">' + wrRich_(g.result) + '</div>' : '') + '</td>' +
      '<td style="' + WR_TD + 'text-align:center">' + wrBar_(kp) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(kst) + '">' + wrE_(kst) + '</td></tr>';
    (g.subs || []).forEach(function(x){
      var p2 = fut(x) ? 0 : wrOtherPct_(x), sst = fut(x) && /complet/i.test(String(x.status || '')) ? L('Kế hoạch', 'Planned') : (x.status || 'To Do');
      rows += '<tr><td style="' + WR_TD + 'text-align:center;color:#8A97B5;white-space:nowrap">' + wrE_(wrDmy_(x.planned) || '—') + '</td>' +
        '<td style="' + WR_TD + '">' + wrE_(x.subTask || '—') +
          ((!o.isNext && String(x.result || '').trim()) ? '<div style="font-size:9.5pt;color:#41506B;margin-top:3px;line-height:1.5">' + wrRich_(x.result) + '</div>' : '') + '</td>' +
        '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrE_(x.pic || '—') + '</td>' +
        '<td style="' + WR_TD + 'text-align:center">' + wrBar_(p2) + '</td>' +
        '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(sst) + '">' + wrE_(sst) + '</td></tr>';
    });
  });
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">' +
    '<thead><tr style="background:#3A5CAA;color:#fff">' +
      '<th style="padding:7px 9px;width:112px;text-align:left">' + L('Loại / Hạn', 'Type / Due') + '</th>' +
      '<th style="padding:7px 9px;text-align:left">' + L('Key task &amp; đầu việc con', 'Key task &amp; sub-tasks') + '</th>' +
      '<th style="padding:7px 9px;width:90px;text-align:center">PIC</th>' +
      '<th style="padding:7px 9px;width:100px;text-align:center">' + L('Tiến độ', 'Progress') + '</th>' +
      '<th style="padding:7px 9px;width:110px;text-align:center">Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}
/* toàn bộ thân email báo cáo tuần */
function wrBody_(o){
  var en = o.lang === 'en', L = function(vi, e){ return en ? e : vi; }, today = wkToday_();
  var base = { lang: o.lang, today: today };
  var h3 = function(txt, col){ return '<h3 style="margin:16px 0 6px;font-size:12.5pt;color:#1F3A6B;border-left:4px solid ' + col + ';padding-left:8px">' + txt + '</h3>'; };
  return '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.5">' +
    '<p style="margin:0 0 10px">Dear all,</p>' +
    '<p style="margin:0 0 12px">' + L('Em xin gửi báo cáo tuần và kế hoạch tuần sau như dưới đây.', 'Please find below my weekly report and the plan for next week.') + '</p>' +
    '<p style="margin:0 0 12px"><b>' + L('Người báo cáo:', 'Report by:') + '</b> ' + wrE_(o.pic) + (o.title ? ' (' + wrE_(o.title) + ')' : '') + '</p>' +
    h3('\u2460 ' + L('Tuần này — Đi địa bàn', 'This week — Field visits') + ' (' + wrDmy_(o.from) + ' – ' + wrDmy_(o.to) + ')', '#3A5CAA') +
    wrVisitTable_(o.cur, Object.assign({ isNext: false, from: o.from, to: o.to }, base)) +
    h3('\u2461 ' + L('Tuần này — Công việc khác', 'This week — Other tasks'), '#6B4A9E') +
    wrOtherTable_(o.otherCur, Object.assign({ isNext: false }, base)) +
    h3('\u2462 ' + L('Tuần sau — Đi địa bàn', 'Next week — Field visits') + ' (' + wrDmy_(o.nf) + ' – ' + wrDmy_(o.nt) + ')', '#E0A21B') +
    wrVisitTable_(o.next, Object.assign({ isNext: true, from: o.nf, to: o.nt }, base)) +
    h3('\u2463 ' + L('Tuần sau — Công việc khác', 'Next week — Other tasks'), '#E0A21B') +
    wrOtherTable_(o.otherNext, Object.assign({ isNext: true }, base)) +
    '<p style="margin:16px 0 2px">' + L('Trân trọng,', 'Best regards,') + '</p>' +
    '<p style="margin:0"><b>' + wrE_(o.pic) + '</b>' + (o.title ? ' \u2014 ' + wrE_(o.title) : '') + '</p>' +
    '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi \u00b7 ' + wrE_(o.team || '') + '</p>' +
  '</div>';
}

/* ═════════════ ⑥ TRIP — ĐỀ XUẤT CÔNG TÁC GHI THẲNG FILE BUSINESS TRIP ═════════════ */
var TRIP_FILE_ID = '15dAQYOG1aJRX-jByVmRFeSFOIPRtdVW7wDvwC_nxJUA';
var TRIP_SHEET = 'MMH Travel report', TRIP_MASTER = 'Master', TRIP_HDR = 3, TRIP_DATA = 5;
var TRIP_URL = 'https://docs.google.com/spreadsheets/d/' + TRIP_FILE_ID + '/edit';
function tripBook_(){
  try{ return SpreadsheetApp.openById(TRIP_FILE_ID); }
  catch(e){ throw new Error('Tài khoản chạy CRM backend chưa mở được file Business Trip (cần quyền Editor): ' + (e && e.message || e)); }
}
function tripMasterRead_(book){
  var sh = book.getSheetByName(TRIP_MASTER); if(!sh) throw new Error('File Business Trip không có sheet "Master"');
  var n = Math.max(1, sh.getLastRow() - 1), V = sh.getRange(2, 1, n, 13).getValues();
  var col = function(c){ var o = []; V.forEach(function(r){ var x = String(r[c] || '').trim(); if(x && o.indexOf(x) < 0) o.push(x); }); return o; };
  var people = {};
  V.forEach(function(r){ var nm = String(r[8] || '').trim(); if(nm) people[nm] = { pic: String(r[9] || '').trim(), dir: String(r[10] || '').trim(), hod: String(r[11] || '').trim(), cc: String(r[12] || '').trim() }; });
  return { destinations: col(2), coTravelers: col(4), equipment: col(5), people: people };
}
/* tên PIC trên CRM ⇒ tên trong file Business Trip (ví dụ Phuong ⇒ "Vu Phuong") */
function tripName_(pic, M){
  var k = wrN_(pic), names = Object.keys(M.people).concat(M.coTravelers);
  var hit = names.filter(function(x){ return wrN_(x) === k; })[0] ||
            names.filter(function(x){ return (' ' + wrN_(x)).slice(-(k.length + 1)) === ' ' + k; })[0] ||
            names.filter(function(x){ return wrN_(x).indexOf(k) >= 0; })[0];
  return hit || pic;
}
function tripMail_(name, M){
  var p = M.people[name] || {}, me = p.pic || NA_ENV.email(name) || '';
  var split = function(s){ return String(s || '').split(/[;,\s]+/).map(function(x){ return x.trim(); }).filter(function(x){ return /@/.test(x); }); };
  var to = split(p.hod).filter(function(e){ return e !== me; });
  if(!to.length) to = split(p.dir).filter(function(e){ return e !== me; });
  var cc = split(p.dir).concat(split(p.cc)).concat(me ? [me] : []).filter(function(e, i, a){ return a.indexOf(e) === i && to.indexOf(e) < 0; });
  return { to: to, cc: cc, me: me };
}
function tripMaster2(user, p){
  var M = tripMasterRead_(tripBook_()), nm = tripName_(String(p.forPic || user.pic), M), mm = tripMail_(nm, M);
  return { ok: true, master: { destinations: M.destinations, coTravelers: M.coTravelers, equipment: M.equipment }, tripName: nm,
           to: mm.to.join(', '), cc: mm.cc.join(', '), file: TRIP_URL };
}
function tripPropose2(user, p){
  var f = p.trip; if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
  if(!f) return { ok: false, error: 'Thiếu dữ liệu đề xuất' };
  var start = wkIso_(f.startDate), fin = wkIso_(f.finishDate) || start;
  if(!start || !String(f.destination || '').trim()) return { ok: false, error: 'Cần ngày đi và Destination' };
  var book = tripBook_(), sh = book.getSheetByName(TRIP_SHEET);
  if(!sh) return { ok: false, error: 'File Business Trip không có sheet "' + TRIP_SHEET + '"' };
  var M = tripMasterRead_(book), nm = tripName_(String(p.forPic || user.pic), M);
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok: false, error: 'Hệ thống đang bận, thử lại sau vài giây.' }; }
  var row, no = '';
  try{
    var lr = Math.max(sh.getLastRow(), TRIP_DATA - 1);
    var V = lr >= TRIP_DATA ? sh.getRange(TRIP_DATA, 2, lr - TRIP_DATA + 1, 14).getValues() : [];
    var last = TRIP_DATA - 1, dupRow = 0;
    for(var i = 0; i < V.length; i++){
      if(String(V[i][2] || '').trim() || V[i][3]) last = TRIP_DATA + i;      /* cột D PIC / E Start date */
      if(wrN_(V[i][2]) === wrN_(nm) && wkIso_(V[i][3]) === start && wkIso_(V[i][4]) === fin && wrN_(V[i][6]) === wrN_(f.destination)) dupRow = TRIP_DATA + i;
    }
    if(dupRow) return { ok: true, dup: true, row: dupRow, message: 'Chuyến công tác này đã có trên file Business Trip (dòng ' + dupRow + ') — không ghi trùng.' };
    row = last + 1;
    if(row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 20);
    var d0 = new Date(start + 'T00:00:00'), d1 = new Date(fin + 'T00:00:00');
    sh.getRange(row, 4, 1, 3).setValues([[nm, d0, d1]]);                                       /* D PIC · E Start · F Finish */
    sh.getRange(row, 8, 1, 8).setValues([[ String(f.destination || ''), String(f.coTraveler || 'No'), String(f.purpose || ''),  /* H · I · J */
      String(f.expectedResult || ''), String(f.estimatedCost || ''), Number(f.totalCost) || '', String(f.schedule || ''), String(f.equipment || '') ]]); /* K L M N O */
    sh.getRange(row, 19).setValue('Not Yet');                                                  /* S Approval Status */
    if(row > TRIP_DATA){
      try{ sh.getRange(row - 1, 2, 1, 27).copyTo(sh.getRange(row, 2, 1, 27), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); }catch(e){}
      try{ var fr = sh.getRange(row - 1, 21, 1, 4).getFormulasR1C1()[0];                        /* U · V · W · X */
           if(fr.some(String)) sh.getRange(row, 21, 1, 4).setFormulasR1C1([fr]); }catch(e){}
    }
    SpreadsheetApp.flush();
    try{ no = String(sh.getRange(row, 2).getValue() || ''); }catch(e){}
  } finally { lock.releaseLock(); }
  var mm = tripMail_(nm, M), mailed = false, mailErr = '';
  try{
    if(mm.to.length){
      var td = 'border:1px solid #BFBFBF;padding:6px 9px;font-size:13px;vertical-align:top;';
      var rowH = function(k, v){ return '<tr><td style="' + td + 'background:#F2F2F2;font-weight:bold;width:170px">' + k + '</td><td style="' + td + '">' + wrRich_(v) + '</td></tr>'; };
      var html = '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#000;line-height:1.5">' +
        '<p>Dear anh/chị,</p><p>Em xin gửi đề xuất công tác dưới đây (đã ghi vào file Business Trip, dòng ' + row + ', Approval Status = Not Yet). Anh/chị vui lòng xem và phê duyệt.</p>' +
        '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
        rowH('PIC', nm) + rowH('Thời gian', wrDmy_(start) + ' – ' + wrDmy_(fin)) + rowH('Destination', f.destination) + rowH('Co-traveler', f.coTraveler || 'No') +
        rowH('Purpose', f.purpose) + rowH('Expected result', f.expectedResult) + rowH('Estimated costs (VND)', f.estimatedCost) +
        rowH('Total estimated costs', (Number(f.totalCost) || 0).toLocaleString('en-US') + ' VND') + rowH('Schedule', f.schedule) + rowH('Equipment', f.equipment) + '</table>' +
        '<p style="margin-top:14px"><a href="' + TRIP_URL + '" style="color:#3A5CAA;font-weight:bold">Mở file Business Trip ↗</a></p>' +
        '<p>Trân trọng,<br>' + wrE_(nm) + '</p></div>';
      var opt = { to: mm.to.join(','), subject: '[Business Trip] Đề xuất công tác — ' + nm + ' — ' + f.destination + ' — ' + wrDm_(start) + (fin !== start ? '–' + wrDm_(fin) : '') + '/' + start.slice(0, 4),
                  htmlBody: html, name: nm + ' (MMH CRM)' };
      if(mm.cc.length) opt.cc = mm.cc.join(',');
      if(mm.me) opt.replyTo = mm.me;
      mmhMail_(opt); mailed = true;
    }
  }catch(e){ mailErr = String(e && e.message || e); }
  try{ NA_ENV.log(user, 'trip', f.destination, start + ' – ' + fin + ' · row ' + row); }catch(e){}
  return { ok: true, row: row, no: no, tripName: nm, to: mm.to.join(', '), cc: mm.cc.join(', '),
           message: 'Đã ghi đề xuất công tác vào file Business Trip (dòng ' + row + ')' + (mailed ? ' và gửi email xin duyệt tới ' + mm.to.join(', ') : (mailErr ? ' — chưa gửi được email: ' + mailErr : ' — chưa có email người duyệt trong sheet Master')) };
}
function tripRoute_(action, user, p){
  if(action === 'tripMaster2') return tripMaster2(user, p);
  if(action === 'tripPropose2') return tripPropose2(user, p);
  return { ok: false, error: 'Unknown action: ' + action };
}