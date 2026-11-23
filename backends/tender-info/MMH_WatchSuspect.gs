/* ════════════════════════════════════════════════════════════════════
   MMH_WatchSuspect.gs v1.2 (23/11/2026, người dùng yêu cầu) — MẶT HÀNG LIÊN QUAN NHÓM SẢN PHẨM MMH + EMAIL KẾT QUẢ CHỈ KHI CÓ TỪ KHOÁ

   ① Bộ từ khoá + nhóm sản phẩm = ĐÚNG 2 file người dùng đã dùng để tải KQTT trên muasamcong (kho Tender-Result ▸ raw/KQTT/keywords.csv,
      product_groups.csv) + bộ quy tắc làm sạch (Tender-Result ▸ rules/kqtt_rules.csv, cùng cách của tools/kqtt_merge.py).
      Mặc định chép vào đây (WTQ_KWDEF / WTQ_GROUPS / WTQ_RULES — sinh từ 3 file CSV, đổi CSV ⇒ sinh lại). Người dùng sửa / thêm từ khoá ở
      tab "Từ khoá sản phẩm MMH" của file tổng "Kết quả trúng thầu - Tổng hợp danh mục hàng hóa" (lượt sau dùng ngay).
   ② Mọi dòng của file tổng hàng hóa (MMH_WatchMerge.gs) có TÊN HÀNG (Danh mục hàng hóa / Mặt hàng dự thầu) chứa từ khoá ⇒ tab
      "SP liên quan · Nha khoa" (Dental) hoặc "SP liên quan · Ngoại khoa & Nhãn khoa" (Surgical) theo chuyên khoa của từ khoá — CHƯA làm sạch.
      Cột thêm: từ khoá khớp · nhóm SP MMH · mức liên quan · "Khả năng cao" (khớp bộ quy tắc làm sạch) · hãng MANI · 2 cột người dùng điền
      (Đánh giá · Ghi chú) — GIỮ NGUYÊN khi dựng lại (theo Khoá dòng ẩn). Dựng lại sau mỗi lượt gộp có dữ liệu mới / đổi từ khoá (wtmTick).
   ③ Email Kết quả LCNT: wtScan_ KHÔNG gửi email ngay cho tin Kết quả nữa — ghi sheet ẩn "THEO DÕI · CHỜ BÁO KẾT QUẢ" (+ tự tải Danh sách
      hàng hóa / nhà thầu nếu người theo dõi không bật tự tải). Khi Danh sách hàng hóa của gói đã gộp: có dòng đáng báo (khớp quy tắc, hoặc
      khớp từ khoá có cột "Báo email" = Có) ⇒ email + thông báo "Nhắc tôi"; không có ⇒ ghi "Không có từ khoá", không email.
      Chờ quá WTQ.WAIT_DAYS ngày không có danh sách hàng hóa ⇒ "Hết hạn chờ". Tin TBMT / KHLCNT: email như cũ.
   Chạy ngay / xem: action botSuspect {key, op: status|run|dry} (khoá bot) · wSuspect (quản lý, app). Chạy tay: wtqRunNow().
   ════════════════════════════════════════════════════════════════════ */
const WTQ = {
  VER: '1.2',
  KW_SHEET: 'Từ khoá sản phẩm MMH',
  GR_SHEET: 'Nhóm sản phẩm MMH',
  TABS: { dent: 'SP liên quan · Nha khoa', surg: 'SP liên quan · Ngoại khoa & Nhãn khoa' },
  KW_HEAD: ['Từ khoá', 'Chuyên khoa', 'Nhóm sản phẩm MMH', 'Mức liên quan', 'Sản phẩm MMH có thể gặp', 'Nhiễu chính', 'Báo email (Có / Không)'],
  GR_HEAD: ['Mã nhóm', 'Chuyên khoa', 'Tên nhóm', 'Sản phẩm MMH'],
  HEAD: ['Khu vực', 'Tỉnh thành', 'Chủ đầu tư', 'Tên gói thầu', 'Số TBMT', 'Chuyên khoa', 'Mã phần/lô', 'Tên phần/lô', 'Nhà thầu trúng thầu',
    'Danh mục hàng hóa', 'Ký mã hiệu', 'Nhãn hiệu', 'Hãng sản xuất', 'Xuất xứ', 'Đơn vị tính', 'Khối lượng', 'Đơn giá trúng thầu', 'Thành tiền',
    'Cấu hình, tính năng kỹ thuật (trích)', 'Từ khoá khớp', 'Nhóm sản phẩm MMH (theo từ khoá)', 'Mức liên quan', 'Cùng nhóm SP MMH (khớp quy tắc)',
    'Nhóm khác cũng khớp', 'Hãng MANI?', 'Gộp lúc', 'Đánh giá (bạn điền)', 'Ghi chú (bạn điền)', 'Khoá dòng'],
  EVAL: ['Đúng sản phẩm MMH', 'Sản phẩm tương tự (đối thủ)', 'Không liên quan', 'Cần xem lại'],
  PEND: 'THEO DÕI · CHỜ BÁO KẾT QUẢ',
  PEND_HEAD: ['Số TBMT', 'Khoá tin', 'Email', 'Người theo dõi', 'Chủ đầu tư', 'Tên gói', 'Thêm lúc', 'Trạng thái', 'Xử lý lúc', 'Số dòng liên quan', 'Ghi chú'],
  ST: { WAIT: 'Chờ danh sách hàng hóa', SENT: 'Đã gửi email', DIGEST: 'Có SP liên quan · vào báo cáo ngày', NONE: 'Không có từ khoá', OLD: 'Hết hạn chờ (chưa có danh sách hàng hóa)' },
  WAIT_DAYS: 21,
  MAX_ROWS: 40000,      // mỗi tab SP liên quan (mới gộp trước)
  MAIL_LINES: 12,       // số dòng / gói trong email
  LEVEL: { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 },
  TONE: { 'uỷ': 'ủy', 'uý': 'úy', 'uỳ': 'ùy', 'uỹ': 'ũy', 'uỵ': 'ụy', 'oà': 'òa', 'oá': 'óa', 'oả': 'ỏa', 'oã': 'õa', 'oạ': 'ọa', 'oè': 'òe', 'oé': 'óe', 'oẻ': 'ỏe', 'oẽ': 'õe', 'oẹ': 'ọe' }
};
/* ── dữ liệu mặc định (sinh từ Tender-Result: raw/KQTT/keywords.csv · raw/KQTT/product_groups.csv · rules/kqtt_rules.csv) ── */
const WTQ_KWDEF = [
  ["mũi khoan", "Nha khoa", "NK-MUI-KHOAN", "Cao", "DIA-BURS, Carbide Burs, Surgical Burs 1559L, MI Stainless Burs", "Mũi khoan xương (chấn thương chỉnh hình, thần kinh), mũi khoan implant"],
  ["Carbide", "Nha khoa", "NK-MUI-KHOAN", "Trung bình", "Carbide Burs, Surgical Burs 1559L", "Stent mạch vành phủ silicon carbide, mũi khoan xương"],
  ["Mài kẽ", "Nha khoa", "NK-MUI-KHOAN", "Trung bình", "IPR-01EF", "Dây, thanh, băng nhám mài kẽ (không phải mũi khoan)"],
  ["Composite", "Nha khoa", "NK-COMPOSITE", "Cao", "ManiFill", ""],
  ["Commposit", "Nha khoa", "NK-COMPOSITE", "Cao", "ManiFill", "Biến thể viết thiếu chữ e (Composit); trùng phần lớn với file Composite"],
  ["Trám", "Nha khoa", "NK-COMPOSITE; NK-TRAM-BIT", "Trung bình", "ManiFill; Lentulo, Spreaders, Pluggers", "GIC, amalgam, trám tạm, vật liệu trám bít ống tủy (không phải hàng MMH)"],
  ["Keo dán", "Nha khoa", "NK-KEO-DAN", "Trung bình", "ManiBond 7th Gen", "Keo dán lam kính (xét nghiệm), keo dán da và mô, keo dán mắc cài chỉnh nha"],
  ["Tẩy trắng", "Nha khoa", "NK-TAY-TRANG", "Cao", "ManiShine", ""],
  ["phục hồi", "Nha khoa", "NK-COMPOSITE; NK-KEO-DAN", "Thấp", "ManiFill, ManiBond", "Phục hồi chức năng (máy tập, giường tập), khung nẹp chấn thương"],
  ["Phục hình", "Nha khoa", "NK-MUI-KHOAN; NK-COMPOSITE", "Thấp", "DIA-BURS (mài cùi), ManiFill", "Trụ implant (abutment), xi măng gắn, khung nẹp chấn thương, mẫu hàm"],
  ["Trâm", "Nha khoa", "NK-TRAM-TAY; NK-TRAM-MAY", "Cao", "K/H-Files, Reamers, trâm gai, JIZAI", ""],
  ["Files", "Nha khoa", "NK-TRAM-TAY; NK-TRAM-MAY", "Cao", "K/H-Files, Flare, RT Files, D Finders, JIZAI", ""],
  ["Reamer", "Nha khoa", "NK-TRAM-TAY; NK-TRAM-MAY", "Cao", "Reamers, Engine Reamers, Peeso Reamers", ""],
  ["Lentulo", "Nha khoa", "NK-TRAM-BIT", "Cao", "Paste Carriers", ""],
  ["Niti", "Nha khoa", "NK-TRAM-MAY", "Thấp", "JIZAI", "Dây cung chỉnh nha NiTi (chiếm phần lớn)"],
  ["Ống tủy", "Nha khoa", "NK-TRAM-TAY; NK-TRAM-MAY; NK-TRAM-BIT", "Trung bình", "Trâm tay, JIZAI, Lentulo, D Finders", "Chất hàn và trám bít ống tủy, chất bôi trơn, dung dịch bơm rửa, côn gutta"],
  ["nội nha", "Nha khoa", "NK-TRAM-TAY; NK-TRAM-MAY; NK-TRAM-BIT; NK-MUI-KHOAN", "Trung bình", "Trâm, JIZAI, Lentulo, mũi mở tủy", "Máy nội nha, hóa chất nội kiểm xét nghiệm (hệ thống khớp lẻ từng chữ)"],
  ["Răng", "Nha khoa", "Mọi nhóm nha khoa", "Thấp", "Mọi dòng nha khoa", "Thiết bị, răng giả, chỉnh nha, vật liệu khác; rất rộng"],
  ["nha khoa", "Nha khoa", "Mọi nhóm nha khoa", "Thấp", "Mọi dòng nha khoa", "Ghế, máy, X-quang, vật tư tiêu hao chung; rất rộng"],
  ["dao", "Nhãn khoa; Ngoại khoa", "MK-DAO; NG-DAO", "Thấp", "Dao nhãn khoa MANI, ENT Knife, Vessel Knife", "Lưỡi dao mổ thường, dao điện, dao hàn mạch, dao cắt nội soi (chiếm đa số)"],
  ["Phaco", "Nhãn khoa", "MK-DAO; MK-CHI", "Trung bình", "Dao rạch MSL/MSS, dao 15° MST, dao lưỡi liềm MCU", "Chất nhầy, máy và đầu phaco, thủy tinh thể nhân tạo"],
  ["Thủy tinh thể", "Nhãn khoa", "MK-DAO; MK-CHI", "Thấp", "Dao rạch, dao R MRS, chỉ 10-0", "Thủy tinh thể nhân tạo (IOL) chiếm khoảng 3/4 số dòng, chất nhầy"],
  ["Glocom", "Nhãn khoa", "MK-MOC-BE; MK-DAO; MK-CHI", "Trung bình", "Trabeculotomy Hook, dao MST/MDP/MCU/MGL", "Van, ống dẫn lưu thủy dịch"],
  ["Glaucoma", "Nhãn khoa", "MK-MOC-BE; MK-DAO; MK-CHI", "Trung bình", "Trabeculotomy Hook, dao MST/MDP/MCU/MGL", "Van, ống dẫn lưu thủy dịch"],
  ["Vùng bè", "Nhãn khoa", "MK-MOC-BE", "Thấp", "Trabeculotomy Hook", "Máy laser SLT, dù đóng thông liên thất (cơ bè), dụng cụ bấm bè"],
  ["dịch kính", "Nhãn khoa", "MK-TROCAR; MK-KEP; MK-DAO; MK-CHI", "Trung bình", "Trocar Kit, Micro Forceps, dao MVR/MPK, chỉ", "Đầu cắt dịch kính, đèn nội nhãn, máy"],
  ["Võng mạc", "Nhãn khoa", "MK-TROCAR; MK-KEP; MK-CHI", "Trung bình", "Trocar Kit, Micro Forceps, chỉ", "Máy OCT, đai silicon độn củng mạc, laser"],
  ["bóc màng", "Nhãn khoa", "MK-KEP", "Cao", "Micro Forceps", "Cây bóc tách màng xương (nha khoa và ngoại khoa)"],
  ["nội nhãn", "Nhãn khoa", "MK-KEP; MK-TROCAR", "Thấp", "Micro Forceps, Trocar Kit", "Hệ thống nội soi các loại (hệ thống khớp lẻ từng chữ), chất nhầy"],
  ["Trocar", "Nhãn khoa", "MK-TROCAR", "Thấp", "Trocar Kit", "Trocar nội soi ổ bụng và nội soi khớp (chiếm đa số)"],
  ["chỉ", "Nhãn khoa; Nha khoa", "MK-CHI; NK-CHI", "Thấp", "Chỉ nhãn khoa, chỉ nha khoa", "Chỉ phẫu thuật ngoại khoa chiếm đa số; file thiếu dữ liệu trước 25/04/2024 (chạm trần 30.000 dòng)"],
  ["Forcep", "Nhãn khoa", "MK-KEP", "Thấp", "Micro Forceps", "Forcep nội soi, lưỡng cực, kẹp mạch máu ngoại khoa"],
  ["Panh", "Nhãn khoa", "MK-KEP", "Thấp", "Micro Forceps", "Panh phẫu thuật chung, trụ cắm panh"],
  ["kẹp", "Nhãn khoa; Ngoại khoa", "MK-KEP", "Thấp", "Micro Forceps, kẹp bóc màng", "Kẹp rốn, kẹp phẫu tích, clip mạch máu; rất rộng"],
  ["kìm", "Ngoại khoa; Nhãn khoa", "NG-MANIPLER; MK-KEP", "Thấp", "Manipler (kìm đính da), Micro Forceps", "Kìm sinh thiết nội soi, kìm mang kim, kìm gắp dị vật"],
  ["Khâu da", "Ngoại khoa", "NG-MANIPLER; NG-KIM", "Trung bình", "Manipler, ghim khâu da", "Kim khâu da (kim rời), miếng dán khâu da"],
  ["Stapler", "Ngoại khoa", "NG-MANIPLER", "Thấp", "Manipler", "Stapler cắt khâu nối nội soi, tiêu hóa, cắt trĩ (Covidien chiếm đa số)"],
  ["Ghim", "Ngoại khoa", "NG-MANIPLER", "Thấp", "Manipler, ghim da", "Đinh nẹp vít chấn thương, băng ghim cắt khâu nối"],
  ["Đính da", "Ngoại khoa", "NG-MANIPLER", "Cao", "Manipler", ""]
];
const WTQ_GROUPS = [
  ["NK-TRAM-TAY", "Nha khoa", "Trâm nội nha cầm tay", "K-Files, H-Files, Reamers, Flare Files, Flexile Files, RT Files, SEC O-Files, Barbed/Square Broaches (trâm gai), D Finders, Glide Finders, Micro Files"],
  ["NK-TRAM-MAY", "Nha khoa", "Trâm máy và dụng cụ máy nội nha", "JIZAI (Orifice Opener, Glider, 020/04, I, II, III), Endo ComPath, Engine Reamers, Gates Drills, Peeso Reamers, Super Files, U-Files"],
  ["NK-TRAM-BIT", "Nha khoa", "Dụng cụ trám bít ống tủy", "Paste Carriers (Lentulo), Spreaders, Flare Finger Spreaders, Pluggers"],
  ["NK-MUI-KHOAN", "Nha khoa", "Mũi khoan nha khoa", "DIA-BURS, MI Dia-Burs, Carbide Burs, Surgical Burs (1559L), MI Stainless Burs, Stainless Burs Hard, IPR-01EF"],
  ["NK-CHI", "Nha khoa", "Chỉ khâu nha khoa", "Chỉ liền kim nha khoa (lụa, polyester, nylon), Sutures for Micro Use"],
  ["NK-COMPOSITE", "Nha khoa", "Composite (MMG)", "ManiFill Bulk, Flow V, Hybrid Ease, Micro Hybrid, Micro Hybrid Smart Shade, Nano"],
  ["NK-KEO-DAN", "Nha khoa", "Keo dán nha khoa (MMG)", "ManiBond 7th Gen"],
  ["NK-TAY-TRANG", "Nha khoa", "Tẩy trắng răng (MMG)", "ManiShine Office/Home Whitening, Active White 35, Gingiva Guard, Remin Care"],
  ["MK-DAO", "Nhãn khoa", "Dao phẫu thuật nhãn khoa", "MST, MSL/MSS, MSP, MVR/MPK, MCU/MCD/MCS/MCB, MRS, MGL, MLR, MDP"],
  ["MK-CHI", "Nhãn khoa", "Chỉ khâu nhãn khoa", "Nylon, lụa, Virgin Silk, Polyester, Polypropylene, PGA (187 mã)"],
  ["MK-TROCAR", "Nhãn khoa", "Trocar cắt dịch kính", "Trocar Kit 23G, 25G, 27G"],
  ["MK-KEP", "Nhãn khoa", "Kẹp vi phẫu nhãn khoa", "Micro Forceps"],
  ["MK-MOC-BE", "Nhãn khoa", "Móc mở vùng bè", "Trabeculotomy Hook"],
  ["NG-MANIPLER", "Ngoại khoa", "Kìm đính da", "Manipler S-2, AZ, DSX; Manipler Remover SR-1D/SR-1S"],
  ["NG-DAO", "Ngoại khoa", "Dao ngoại khoa", "ENT Knife, Vessel Knife"],
  ["NG-KIM", "Ngoại khoa", "Kim khâu và kim thép", "Eyeless Needle, Stainless Wire Needle (Cosmo Wire)"]
];
const WTQ_RULES = [
  ["MK-DAO", "ten", "\\bdao\\b|lưỡi dao|knife|keratome|\\bblade\\b"],
  ["MK-DAO", "ngu_canh", "nhãn khoa|nội nhãn|nhãn cầu|nhãn áp|\\bmắt\\b|phaco|giác mạc|củng mạc|kết mạc|thủy tinh thể|đục thủy tinh thể|mổ đục|cataract|slit|crescent|lưỡi liềm|\\bmvr\\b|side ?port|cổng bên|tạo cổng|15 ?(°|độ|o\\b)|keratome|mộng|glôcôm|glocom|glaucoma|\\blri\\b|tiền phòng|đường hầm|\\b[1-3][.,]\\d{1,2} ?mm\\b|bó sợi|\\bmani\\b|alcon|sharpoint|surgistar|aurolab|oertli|diamatrix|accutome|clearcut|mstech|appasamy|ureal|madhu"],
  ["MK-DAO", "loai_tru", "điện|cao tần|siêu âm|hàn mạch|nội soi|niêm mạc|\\bda\\b|cạo|bào|amidan|plasma|laser|^máy|tay cầm|^(?!.*(nhãn|mắt|phaco)).*(\\bsố ?\\d|các số)|tiêu bản|bóng|đầu đốt|cơ vòng|mạch|xương|sụn|\\btai\\b|vi phẫu|nha khoa|\\b1[05] ?c\\b"],
  ["NK-CHI", "ten", "\\bchỉ\\b.*(khâu|phẫu thuật|tiêu|\\btan\\b|liền kim|nylon|silk|lụa|polyglactin|pga|polyglycolic|polyamide|polypropylene|\\d ?/ ?0)|suture"],
  ["NK-CHI", "ngu_canh", "nha khoa|răng hàm mặt|nhổ răng|ổ răng|nướu|\\blợi\\b|implant nha|(phẫu thuật|tiểu phẫu) (răng|miệng|nha)|khoang miệng|chỉ khâu nha"],
  ["NK-CHI", "loai_tru", "^máy|kim khâu(?! liền)|co nướu|co lợi|\\btơ\\b|floss|\\btim\\b|vít|neo|^kìm|^kẹp|mạch máu"],
  ["MK-CHI", "ten", "\\bchỉ\\b(?! (thị|số|định|tiêu chuẩn))|suture"],
  ["MK-CHI", "ngu_canh", "nhãn khoa|nội nhãn|nhãn cầu|nhãn áp|\\bmắt\\b|giác mạc|kết mạc|củng mạc|mộng|\\blác\\b|mi mắt|spatula|trape|thủy tinh thể|phaco|võng mạc|glôcôm|glocom|1[01] ?[/-] ?0\\b|\\bmani\\b|alcon|aurolab|sharpoint"],
  ["MK-CHI", "loai_tru", "mạch máu|\\btim\\b|van tim|thần kinh|bàn tay|^máy|kim khâu(?! liền)|^túi|băng keo|vít|neo|số ?[0-3]\\b(?! ?[/-])|\\b[0-3] ?[/-] ?0\\b"],
  ["MK-TROCAR", "ten", "trocar|tro-?ca|\\bcổng\\b|\\bport\\b|cannula|vitrectomy|bộ cắt dịch kính tổng hợp"],
  ["MK-TROCAR", "ngu_canh", "dịch kính|võng mạc|nhãn khoa|nội nhãn|nhãn cầu|nhãn áp|\\bmắt\\b|\\b2[357] ?g\\b|\\b20 ?g\\b|pars plana|xuyên củng mạc|vitrectomy"],
  ["MK-TROCAR", "loai_tru", "nội soi|ổ bụng|khớp|lồng ngực|tiết niệu|máy|đầu cắt|dẫn lưu|bàng quang|phổi|catheter|kim luồn|^dao|đèn"],
  ["MK-KEP", "ten", "\\bkẹp\\b|\\bpanh\\b|forcep|pince|\\bkìm\\b|gắp"],
  ["MK-KEP", "ngu_canh", "dịch kính|võng mạc|nội nhãn|bóc màng|\\bilm\\b|\\b2[357] ?g\\b|màng ngăn trong|màng trước võng mạc"],
  ["MK-KEP", "loai_tru", "xương|nội soi|sinh thiết|máy"],
  ["MK-MOC-BE", "ten", "trabeculotom|mở (vùng )?bè|móc (mở bè|trabecul|schlemm)"],
  ["MK-MOC-BE", "ngu_canh", "bè|trabecul|glôcôm|glocom|glaucoma|nhãn khoa|nội nhãn|nhãn cầu|nhãn áp|\\bmắt\\b|schlemm"],
  ["MK-MOC-BE", "loai_tru", "laser|máy|dù|thông liên thất"],
  ["NK-TRAM-MAY", "ten", "jizai|protaper|waveone|reciproc|neolix|\\bniti\\b.*(tủy|nội nha|trâm|file|nong)|(trâm|file|nong|giũa|dũa|rũa).{0,25}(máy|xoay|niti|dẻo|rotary)|engine reamer|gates|peeso|mở miệng ống tủy|orifice"],
  ["NK-TRAM-MAY", "loai_tru", "^máy|^hệ thống|motor|động cơ|dây cung|chỉnh nha|côn|gutta|chất|dung dịch|cone|vật liệu|trám bít"],
  ["NK-TRAM-BIT", "ten", "lentull?o|letulo|len ?lulo|lăng tu lô|paste carrier|đưa thuốc|quay thuốc|vật liệu quay|kim quay|đưa chất (hàn|trám)|kim đưa|xoắn đưa|cây lèn|[ln]èn ống tủy|đầu đưa|mũi trám bít|que lèn|\\blèn (ngang|dọc|côn)|spreader|plugger|đưa xi măng|trâm đưa"],
  ["NK-TRAM-BIT", "loai_tru", "^máy|bơm|côn|gutta"],
  ["NK-TRAM-TAY", "ten", "trâm|châm gai|kim gai|\\bk-? ?(files?|fives?)\\b|\\bh-? ?(files?|fives?)\\b|\\bfiles?\\b|reamm?er|broach|dũa|nong (giũa|giữa|dũa)|giũa|rũa|^nong\\b|nong (ống )?tủy|kim nong|kim khoan răng|gai lấy tủy|lấy tủy|tìm ống tủy|d.?finder|glide.?finder|dụng cụ nội nha"],
  ["NK-TRAM-TAY", "loai_tru", "profile|bóng nong|stent|catheter|ống thông|guide ?wire|dây dẫn|mạch|xương|^máy|hóa chất|dung dịch|chất (bôi trơn|hàn|trám)|côn|giấy|thước đo|khám răng|kéo|móc|^bộ dụng cụ|thám trâm"],
  ["NK-MUI-KHOAN", "ten", "mũi (khoan|mài|cắt|kim cương|tungsten|carbide|phá|mở tủy)|^mũi (endo|nạo|ngọn|phẫu|phẩu|mở|nội nha|tạo hình|chỉnh)|\\bburs?\\b|carbide bur|mài kẽ|\\bipr\\b|zekrya|lindemann"],
  ["NK-MUI-KHOAN", "loai_tru", "implant|cột sống|\\bsọ\\b|chỉnh hình|chấn thương|nội soi|tai mũi họng|\\btai\\b|xoang|stent|mạch vành|^máy|^tay khoan|động cơ|motor|hộp đựng|giá (đỡ|cắm)|\\btủ\\b|khoan ngược|taro|tự dừng|đầu chụp|dây dẫn|bào mảng xơ|khớp (gối|háng|vai)|nội soi khớp|dây chằng|^mũi đánh bóng|cao su"],
  ["NK-MUI-KHOAN", "ngu_canh", "răng|\\bnha\\b|răng hàm|hàm (trên|dưới|mặt)|ống tủy|tủy răng|mở tủy|buồng tủy|tiểu phẫu|tay khoan (chậm|nhanh)|\\bmen\\b|\\bngà\\b|mài kẽ|ipr|zekrya|lindemann|kim cương|carbide|tungsten|\\bbur\\b|\\bfg\\b|\\bra\\b|\\bhp\\b|tròn|\\btrụ\\b|ngọn lửa|chóp|endo.?z|mở tủy|nạo ngà|cổng|gate|răng khôn|ổ răng|\\bmani\\b|ss ?white|dentsply|maillefer|komet|jota|meisinger|kerr|horico|frank dental|edenta|\\bnti\\b|diatech|coltene|vdw|micro-?mega|sirona|răng hàm mặt"],
  ["NK-COMPOSITE", "ten", "compo[sz]i[td]|nhựa trám|trám thẩm mỹ|flowable|bulk ?fill|vật liệu trám (răng )?(quang|thẩm mỹ|lỏng|đặc)|trám (răng )?quang trùng hợp"],
  ["NK-COMPOSITE", "loai_tru", "lưới|mesh|nẹp|băng|xương|stent|ống thông|catheter|mắc cài|^máy|đèn|thoát vị|sợi|^cây|dụng cụ|khớp|đánh bóng|^đĩa|^đài|hàm khung|răng giả|^hàm"],
  ["NK-KEO-DAN", "ten", "keo dán|chất dán|\\bbond|adhesive|dán ngà|dán men|xử lý bề mặt"],
  ["NK-KEO-DAN", "ngu_canh", "\\bnha\\b|răng|\\bngà\\b|\\bmen\\b|compo|trám|bond|adhesive|thế hệ|tự xói mòn|self.?etch|quang trùng hợp"],
  ["NK-KEO-DAN", "loai_tru", "\\blam\\b|lamen|kính|\\bda\\b|\\bmô\\b|vết thương|mắc cài|chỉnh nha|dermabond|histoacryl|mạch|xương|phẫu thuật|ống|catheter|điện cực|^băng"],
  ["NK-TAY-TRANG", "ten", "tẩy trắng|làm trắng|whitening|bleach|bảo vệ (nướu|lợi)|che (nướu|lợi)|tái khoáng|ê buốt|giảm nhạy cảm"],
  ["NK-TAY-TRANG", "ngu_canh", "răng|\\bnha\\b|\\bmen\\b|nướu|\\blợi\\b|tại phòng|tại nhà|peroxide|carbamide|hydro"],
  ["NK-TAY-TRANG", "loai_tru", "đồ vải|quần áo|giặt|bột giặt|\\bda\\b|tẩy rửa dụng cụ|^máng|^đèn|^máy"],
  ["NG-MANIPLER", "ten", "đính da|ghim (khâu )?da|kìm (bấm|khâu|đính) da|kẹp bấm da|bấm (ghim )?da|(stapler|máy|dụng cụ) (khâu|bấm|dập ghim|đóng) da|skin stapler|tháo ghim|gỡ ghim|staple remover|manipler|khâu da (bằng )?ghim|dập ghim da"],
  ["NG-MANIPLER", "loai_tru", "kim khâu|miếng dán|\\bchỉ\\b|băng dán|nội soi|tiêu hóa|cắt nối|\\btrĩ\\b|khâu nối"]
];

/* ══════════ SO KHỚP ══════════ */
/** chữ thường, NFC, gộp khoảng trắng, thống nhất vị trí dấu (thuỷ/thủy, hoà/hòa) — như fold() của kqtt_merge.py */
function wtqFold_(s) {
  let t = String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  Object.keys(WTQ.TONE).forEach(function (a) { if (t.indexOf(a) >= 0) t = t.split(a).join(WTQ.TONE[a]); });
  return t;
}
/** bỏ dấu (cho từ khoá viết không dấu: Glocom ⇒ glôcôm) */
function wtqBare_(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').normalize('NFC'); }
const WTQ_B = '(?:(?<=[\\p{L}\\p{N}_])(?![\\p{L}\\p{N}_])|(?<![\\p{L}\\p{N}_])(?=[\\p{L}\\p{N}_]))';
/** mẫu Python (\b hiểu chữ có dấu) ⇒ RegExp JS cờ u (\b của JS chỉ hiểu chữ không dấu) */
function wtqPyRe_(p) { return new RegExp(String(p).replace(/\\b/g, WTQ_B), 'iu'); }
let WTQ_KW = null, WTQ_RX = null, WTQ_GRP = null;
/** bộ từ khoá đang dùng ⇒ [{kw, spec:[...], groups, level, sp, mail, re, bare}] */
function wtqKwCompile_(K) {
  return K.map(function (k) {
    const kw = wtqFold_(k[0]); if (!kw) return null;
    const plain = kw.replace(/\*/g, '');
    const bare = /^[a-z0-9 *.\-\/]+$/.test(kw) && plain.length >= 4;   // từ không dấu ≥ 4 ký tự ⇒ khớp cả chữ có dấu ("Glocom" ⇒ "glôcôm"); "dao" vẫn khớp đúng chữ
    const pat = kw.split('*').map(function (x) { return x.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'); }).join('[\\p{L}\\p{N}-]*');
    const spec = String(k[1] || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(String);
    const mail = k.length > 6 && wtS_(k[6]) !== '' ? !/^(không|no|0|false)$/i.test(wtS_(k[6])) : (WTQ.LEVEL[wtS_(k[3])] || 0) >= 2;
    return { kw: wtS_(k[0]), spec: spec, groups: wtS_(k[2]), level: wtS_(k[3]), sp: wtS_(k[4]), mail: mail, bare: bare,
      re: new RegExp('(?<![\\p{L}\\p{N}])' + pat + '(?![\\p{L}\\p{N}])', 'u') };
  }).filter(Boolean);
}
function wtqRules_() {
  if (WTQ_RX) return WTQ_RX;
  const R = {}, order = [];
  WTQ_RULES.forEach(function (r) {
    if (!R[r[0]]) { R[r[0]] = { ten: [], ngu_canh: [], loai_tru: [] }; order.push(r[0]); }
    try { R[r[0]][r[1]].push(wtqPyRe_(r[2])); } catch (e) { Logger.log('wtqRules_ ' + r[0] + ' ' + r[1] + ': ' + e.message); }
  });
  WTQ_RX = { R: R, order: order };
  return WTQ_RX;
}
function wtqGroups_() {
  if (WTQ_GRP) return WTQ_GRP;
  WTQ_GRP = {}; WTQ_GROUPS.forEach(function (g) { WTQ_GRP[g[0]] = { spec: g[1], name: g[2], sp: g[3] }; });
  return WTQ_GRP;
}
/** quy tắc làm sạch (như classify() của kqtt_merge.py): name = tên hàng, ctx = tên + cấu hình + nhãn hiệu + hãng + CĐT ⇒ [mã nhóm] */
function wtqClassify_(name, ctx) {
  const X = wtqRules_(), n = wtqFold_(name), c = n + ' | ' + wtqFold_(ctx), hits = [];
  X.order.forEach(function (code) {
    const g = X.R[code];
    if (!g.ten.some(function (p) { return p.test(n); })) return;
    if (g.ngu_canh.length && !g.ngu_canh.some(function (p) { return p.test(c); })) return;
    if (g.loai_tru.some(function (p) { return p.test(n); })) return;
    hits.push(code);
  });
  return hits;
}
/** tên hàng ⇒ từ khoá khớp */
function wtqKwHits_(KW, text) {
  const t = wtqFold_(text); if (!t) return [];
  const b = wtqBare_(t);
  return KW.filter(function (k) { return k.re.test(k.bare ? b : t); });
}
/** chuyên khoa ⇒ tab */
function wtqTabOf_(spec) { return /nha khoa/i.test(spec) ? 'dent' : /nhãn khoa|ngoại khoa/i.test(spec) ? 'surg' : ''; }
function wtqHash_(s) {   // FNV-1a 2 vòng ⇒ 12 ký tự (khoá dòng ổn định, không cần Utilities.computeDigest cho từng dòng)
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 2246822519) >>> 0; }
  return (h1.toString(36) + h2.toString(36)).slice(0, 12);
}

/* ══════════ TAB TỪ KHOÁ / NHÓM SP ══════════ */
function wtqKwLoad_(book) {
  let sh = book.getSheetByName(WTQ.KW_SHEET);
  if (!sh) {
    sh = book.insertSheet(WTQ.KW_SHEET);
    sh.getRange(1, 1, 1, WTQ.KW_HEAD.length).setValues([WTQ.KW_HEAD]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF').setWrap(true);
    sh.getRange(2, 1, WTQ_KWDEF.length, WTQ.KW_HEAD.length).setValues(WTQ_KWDEF.map(function (k) { return k.concat([(WTQ.LEVEL[k[3]] || 0) >= 2 ? 'Có' : 'Không']); }))
      .setWrap(true).setVerticalAlignment('top');
    sh.setFrozenRows(1); [130, 150, 230, 100, 260, 340, 110].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange(1, 1).setNote('Khớp NGUYÊN TỪ trong tên hàng, không phân biệt hoa thường.\n* = mọi đuôi (vd. Composit*).\nTừ viết không dấu từ 4 ký tự (Glocom, Phaco) khớp cả chữ có dấu.\n' +
      'Báo email = Có: gói Kết quả có dòng khớp từ khoá này ⇒ gửi email cho người theo dõi. Dòng khớp quy tắc làm sạch (cột "Khả năng cao") luôn được báo.');
    try {
      sh.getRange(2, 4, 200, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Cao', 'Trung bình', 'Thấp'], true).setAllowInvalid(true).build());
      sh.getRange(2, 7, 200, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Có', 'Không'], true).build());
    } catch (e) {}
  }
  if (!book.getSheetByName(WTQ.GR_SHEET)) {
    const g = book.insertSheet(WTQ.GR_SHEET);
    g.getRange(1, 1, 1, WTQ.GR_HEAD.length).setValues([WTQ.GR_HEAD]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF');
    g.getRange(2, 1, WTQ_GROUPS.length, WTQ.GR_HEAD.length).setValues(WTQ_GROUPS).setWrap(true).setVerticalAlignment('top');
    g.setFrozenRows(1); [130, 100, 240, 560].forEach(function (w, i) { g.setColumnWidth(i + 1, w); });
  }
  const V = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, WTQ.KW_HEAD.length).getValues() : [];
  const K = V.filter(function (r) { return wtS_(r[0]); }).map(function (r) { return r.map(wtS_); });
  WTQ_KW = wtqKwCompile_(K.length ? K : WTQ_KWDEF);
  return { list: WTQ_KW, sig: wtqHash_(JSON.stringify(K)) };
}

/* ══════════ DỰNG 2 TAB NGHI NGỜ ══════════ */
function wtqTab_(book, k) {
  let sh = book.getSheetByName(WTQ.TABS[k]);
  if (!sh) { sh = book.insertSheet(WTQ.TABS[k]); sh.setFrozenRows(1); sh.setFrozenColumns(5); }
  return sh;
}
/**
 * Đọc file tổng hàng hóa ⇒ dựng lại 2 tab (giữ Đánh giá / Ghi chú theo Khoá dòng).
 * Trả { per: {số TBMT: {n, mail:[dòng đáng báo]}}, bares: {số TBMT có trong file tổng: 1}, rows: {dent, surg} } hoặc { skip }
 */
function wtqBuild_(opt) {
  opt = opt || {};
  const P = PropertiesService.getScriptProperties(), t0 = Date.now();
  const B = wtmBook_('hh'), book = B.book, KL = wtqKwLoad_(book), KW = KL.list, G = wtqGroups_();
  const last = B.sh.getLastRow(), nRows = Math.max(last - 1, 0);
  const sig = [nRows, KL.sig, WTQ.VER].join('|');   // + cờ WTQ_DIRTY (wtmMerge_ ghi dòng hàng hóa mới / wtqPend_)
  if (opt.only || opt.since) opt.dry = true;   // dựng 1 phần ⇒ không bao giờ ghi tab
  if (!opt.force && !opt.dry && P.getProperty('WTQ_DIRTY') !== '1' && P.getProperty('WTQ_SIG') === sig) return { skip: 'unchanged' };
  const H = B.head, ix = function (n) { return H.indexOf(n); };
  const I = { reg: ix('Khu vực'), prov: ix('Tỉnh thành'), inv: ix('Chủ đầu tư'), pkg: ix('Tên gói thầu'), no: ix('Số TBMT'), lot: ix('Mã phần/lô'), lotN: ix('Tên phần/lô'),
    win: ix('Nhà thầu trúng thầu'), item: ix('Danh mục hàng hóa'), code: ix('Ký mã hiệu'), brand: ix('Nhãn hiệu'), maker: ix('Hãng sản xuất'), bid: ix('Mặt hàng dự thầu'),
    origin: ix('Xuất xứ'), unit: ix('Đơn vị tính'), qty: ix('Khối lượng'), cfg: ix('Cấu hình, tính năng kỹ thuật cơ bản'), model: ix('Chủng loại (Models)'),
    price: ix('Đơn giá trúng thầu'), amt: ix('Thành tiền (đã bao gồm thuế, phí, lệ phí)'), at: ix('Gộp lúc'), key: ix('Khoá') };
  const V = nRows ? B.sh.getRange(2, 1, nRows, H.length).getValues() : [];
  const g = function (r, k) { return I[k] >= 0 ? r[I[k]] : ''; };
  const out = { dent: [], surg: [] }, per = {}, bares = {}, occ = {};
  const RE_MANI = /(?<![\p{L}\p{N}])mani(?![\p{L}\p{N}])/iu;
  V.forEach(function (r) {
    const bare = wtmBare_(g(r, 'key') || g(r, 'no')); if (!bare) return;
    bares[bare] = 1;
    // chỉ một số gói (MMH_WatchRoute: báo cáo sáng / phân tích 1 gói) ⇒ bỏ qua dòng khác TRƯỚC khi dò từ khoá (dò toàn file mất ~5 phút)
    if (opt.only || opt.since) {
      const a0 = g(r, 'at'), at1 = a0 instanceof Date ? Utilities.formatDate(a0, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss') : wtS_(a0);
      if (!((opt.only && opt.only[bare]) || (opt.since && at1 >= opt.since))) return;
    }
    const name = wtS_(g(r, 'item')) || wtS_(g(r, 'bid')), nameAll = name + (wtS_(g(r, 'bid')) && wtS_(g(r, 'bid')) !== name ? ' · ' + wtS_(g(r, 'bid')) : '');
    if (!name) return;
    const kh = wtqKwHits_(KW, nameAll);
    const ctx = [g(r, 'cfg'), g(r, 'brand'), g(r, 'maker'), g(r, 'inv')].map(wtS_).join(' | ');
    const rh = wtqClassify_(name, ctx + ' | ' + wtS_(g(r, 'model')));
    if (!kh.length && !rh.length) return;
    // chuyên khoa ⇒ tab: theo từ khoá + theo nhóm quy tắc
    const tabs = {}, specs = {};
    // đã khớp quy tắc ⇒ chỉ vào tab chuyên khoa của nhóm đó ("Chỉ khâu nylon 10-0" = chỉ nhãn khoa, không vào tab Nha khoa vì từ "chỉ")
    if (!rh.length) kh.forEach(function (k) { k.spec.forEach(function (s) { const t = wtqTabOf_(s); if (t) { tabs[t] = 1; specs[s] = 1; } }); });
    rh.slice(0, 1).forEach(function (c) { const s = (G[c] || {}).spec || ''; const t = wtqTabOf_(s); if (t) { tabs[t] = 1; specs[s] = 1; } });
    const lvl = kh.reduce(function (m, k) { return Math.max(m, WTQ.LEVEL[k.level] || 0); }, 0);
    const lvlTxt = rh.length ? 'Cao · cùng nhóm SP MMH' : ['', 'Thấp', 'Trung bình', 'Cao'][lvl];
    const id0 = bare + '|' + [g(r, 'lot'), name, g(r, 'brand'), g(r, 'maker'), g(r, 'qty'), g(r, 'price')].map(wtS_).join('|');
    occ[id0] = (occ[id0] || 0) + 1;
    const rowKey = bare + '|' + wtqHash_(id0) + '#' + occ[id0];
    const mani = RE_MANI.test(wtS_(g(r, 'brand')) + ' ' + wtS_(g(r, 'maker'))) ? 'Có' : '';
    const kwTxt = kh.map(function (k) { return k.kw; }).join(' · ');
    const grpTxt = kh.map(function (k) { return k.groups; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(' · ');
    const best = rh.length ? rh[0] + ' · ' + ((G[rh[0]] || {}).name || '') : '';
    const other = rh.slice(1).join(' · ');
    Object.keys(tabs).forEach(function (t) {
      const sp = Object.keys(specs).filter(function (s) { return wtqTabOf_(s) === t; }).join(' · ');
      out[t].push([g(r, 'reg'), g(r, 'prov'), g(r, 'inv'), g(r, 'pkg'), g(r, 'no') || bare, sp, g(r, 'lot'), g(r, 'lotN'), g(r, 'win'), name, g(r, 'code'), g(r, 'brand'), g(r, 'maker'),
        g(r, 'origin'), g(r, 'unit'), g(r, 'qty'), g(r, 'price'), g(r, 'amt'), wtS_(g(r, 'cfg')).replace(/\s+/g, ' ').slice(0, 500), kwTxt, grpTxt, lvlTxt, best, other, mani,
        g(r, 'at'), '', '', rowKey]);
    });
    const P0 = per[bare] = per[bare] || { n: 0, mail: [], inv: wtS_(g(r, 'inv')), pkg: wtS_(g(r, 'pkg')), prov: wtS_(g(r, 'prov')), no: wtS_(g(r, 'no')) || bare };
    P0.n++;
    const at0 = g(r, 'at'), atv = at0 instanceof Date ? Utilities.formatDate(at0, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss') : wtS_(at0); if (atv > (P0.at || '')) P0.at = atv;
    // v1.2 — đủ chi tiết cho báo cáo sáng theo PIC / email 1 gói (MMH_WatchRoute.gs): mọi dòng liên quan (≤ 80) + nhóm nha khoa / ngoại khoa
    if ((P0.lines = P0.lines || []).length < 80) P0.lines.push({ name: name, brand: wtS_(g(r, 'brand')), maker: wtS_(g(r, 'maker')), win: wtS_(g(r, 'win')),
      qty: g(r, 'qty'), unit: wtS_(g(r, 'unit')), price: g(r, 'price'), amt: g(r, 'amt'), lot: [wtS_(g(r, 'lot')), wtS_(g(r, 'lotN'))].filter(String).join(' · '),
      kw: kwTxt, grp: best || grpTxt, high: !!rh.length, mani: !!mani, tabs: Object.keys(tabs) });
    if ((P0.top = P0.top || []).length < 6) P0.top.push({ name: name, brand: [wtS_(g(r, 'brand')), wtS_(g(r, 'maker'))].filter(String).join(' / '), kw: kwTxt, grp: best || grpTxt, high: !!rh.length });
    if (rh.length || kh.some(function (k) { return k.mail; })) {
      P0.mail.push({ name: name, brand: [wtS_(g(r, 'brand')), wtS_(g(r, 'maker'))].filter(String).join(' / '), win: wtS_(g(r, 'win')), qty: g(r, 'qty'), unit: wtS_(g(r, 'unit')),
        price: g(r, 'price'), kw: kwTxt, grp: best || grpTxt, high: !!rh.length, mani: !!mani });
    }
  });
  const res = { per: per, bares: bares, rows: { dent: out.dent.length, surg: out.surg.length }, kw: KW.length, src: nRows };
  if (opt.dry) { res.ms = Date.now() - t0; return res; }
  const W = WTQ.HEAD.length, iEval = WTQ.HEAD.indexOf('Đánh giá (bạn điền)'), iKey = W - 1, iAt = WTQ.HEAD.indexOf('Gộp lúc'), iNo = WTQ.HEAD.indexOf('Số TBMT'), iLot = WTQ.HEAD.indexOf('Mã phần/lô');
  res.url = {};
  ['dent', 'surg'].forEach(function (t) {
    const sh = wtqTab_(book, t);
    // giữ Đánh giá / Ghi chú người dùng đã điền
    const keep = {};
    if (sh.getLastRow() > 1 && wtS_(sh.getRange(1, W).getValue()) === WTQ.HEAD[iKey]) {
      sh.getRange(2, iEval + 1, sh.getLastRow() - 1, W - iEval).getValues().forEach(function (x) { const k = wtS_(x[x.length - 1]); if (k && (wtS_(x[0]) || wtS_(x[1]))) keep[k] = [x[0], x[1]]; });
    }
    const rows = out[t];
    rows.forEach(function (x) { const kp = keep[x[iKey]]; if (kp) { x[iEval] = kp[0]; x[iEval + 1] = kp[1]; } });
    rows.sort(function (a, b) { return String(b[iAt]).localeCompare(String(a[iAt])) || String(a[iNo]).localeCompare(String(b[iNo])) || String(a[iLot]).localeCompare(String(b[iLot]), 'vi', { numeric: true }); });
    if (rows.length > WTQ.MAX_ROWS) { res.cut = (res.cut || 0) + rows.length - WTQ.MAX_ROWS; rows.length = WTQ.MAX_ROWS; }
    try { if (sh.getFilter()) sh.getFilter().remove(); } catch (e) {}
    sh.clearContents();
    sh.getRange(1, 1, 1, W).setValues([WTQ.HEAD]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF').setWrap(true).setVerticalAlignment('middle');
    sh.getRange(1, iEval + 1, 1, 2).setBackground('#FBE9B7').setFontColor('#2C4A5E');
    if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
    if (rows.length) sh.getRange(2, 1, rows.length, W).setValues(rows);
    const extra = sh.getMaxRows() - (rows.length + 1);
    if (extra > 200) { try { sh.deleteRows(rows.length + 202, extra - 200); } catch (e) {} }
    if (!P.getProperty('WTQ_FMT_' + t)) {
      [80, 100, 200, 260, 120, 110, 70, 160, 180, 260, 110, 120, 150, 90, 70, 80, 100, 110, 300, 150, 200, 110, 220, 120, 60, 130, 170, 200, 10].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
      sh.getRange('P:R').setNumberFormat('#,##0.##');
      try { sh.hideColumns(W); } catch (e) {}
      P.setProperty('WTQ_FMT_' + t, '1');
    }
    try { sh.getRange(2, iEval + 1, Math.max(rows.length, 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(WTQ.EVAL, true).setAllowInvalid(true).build()); } catch (e) {}
    try { sh.getRange(1, 1, Math.max(rows.length, 1) + 1, W).createFilter(); } catch (e) {}
    res.url[t] = book.getUrl() + '#gid=' + sh.getSheetId();
  });
  res.ms = Date.now() - t0;
  P.setProperty('WTQ_SIG', sig);
  P.deleteProperty('WTQ_DIRTY');
  P.setProperty('WTQ_LAST', JSON.stringify({ at: wtNow_(), src: nRows, dent: res.rows.dent, surg: res.rows.surg, cut: res.cut || 0, kw: KW.length, ms: res.ms }));
  P.setProperty('WTQ_URL', JSON.stringify(res.url));
  return res;
}

/* ══════════ CHỜ BÁO KẾT QUẢ ══════════ */
function wtqPendSheet_(ss) {
  const sh = wtSheet_(ss || wtBook_(), WTQ.PEND, WTQ.PEND_HEAD);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
  return sh;
}
/** wtNotifyNew_: tin Kết quả mới của 1 người theo dõi (đã bật email) ⇒ chờ danh sách hàng hóa */
function wtqPend_(list, w) {
  if (!list.length) return 0;
  const sh = wtqPendSheet_(), V = wtRows_(sh, WTQ.PEND_HEAD.length), have = {}, now = wtNow_();
  V.forEach(function (r) { have[wtS_(r[1]) + '|' + wtS_(r[2]).toLowerCase()] = 1; });
  const add = list.filter(function (h) { return h.no && !have[h.key + '|' + w.mail]; }).map(function (h) {
    return [wtmBare_(h.no), h.key, w.mail, w.pic || '', h.investor || '', String(h.name || '').slice(0, 300), now, WTQ.ST.WAIT, '', '', ''];
  });
  if (add.length) { sh.getRange(sh.getLastRow() + 1, 1, add.length, WTQ.PEND_HEAD.length).setValues(add); PropertiesService.getScriptProperties().setProperty('WTQ_DIRTY', '1'); }
  return add.length;
}
/** sau khi dựng lại: gói chờ đã có danh sách hàng hóa ⇒ email (nếu có dòng đáng báo) */
function wtqPendRun_(B) {
  const sh = wtqPendSheet_(), V = wtRows_(sh, WTQ.PEND_HEAD.length), now = wtNow_(), today = Date.now();
  const mails = {}, upd = [], res = { sent: 0, none: 0, old: 0, wait: 0 };
  // 23/11/2026 (người dùng: "trong một ngày thì tổng hợp hết") — mặc định KHÔNG email từng gói, gói có SP liên quan vào báo cáo ngày (MMH_WatchDigest.gs); WTQ_INSTANT = 1 ⇒ email ngay như v1.0
  const instant = PropertiesService.getScriptProperties().getProperty('WTQ_INSTANT') === '1';
  V.forEach(function (r, i) {
    if (wtS_(r[7]) !== WTQ.ST.WAIT) return;
    const bare = wtS_(r[0]);
    if (B.bares[bare]) {
      const x = B.per[bare] || { n: 0, mail: [] };
      if (x.mail.length && !instant) { upd.push([i + 2, WTQ.ST.DIGEST, x.n]); res.digest = (res.digest || 0) + 1; }
      else if (x.mail.length) {
        const m = wtS_(r[2]).toLowerCase(), M = mails[m] = mails[m] || { pic: wtS_(r[3]), list: [], rows: [] };
        M.list.push({ key: wtS_(r[1]), bare: bare, inv: x.inv || wtS_(r[4]), pkg: x.pkg || wtS_(r[5]), prov: x.prov, no: x.no || bare, n: x.n, lines: x.mail });
        M.rows.push(i + 2);
        upd.push([i + 2, WTQ.ST.SENT, x.n]); res.sent++;
      } else { upd.push([i + 2, WTQ.ST.NONE, x.n]); res.none++; }
    } else {
      const at = new Date(wtS_(r[6]).replace(' ', 'T') + '+07:00').getTime();
      if (at && (today - at) / 864e5 > WTQ.WAIT_DAYS) { upd.push([i + 2, WTQ.ST.OLD, '']); res.old++; } else res.wait++;
    }
  });
  const url = wtJson_(PropertiesService.getScriptProperties().getProperty('WTQ_URL'), {}), feed = [];
  Object.keys(mails).forEach(function (m) {
    const M = mails[m];
    try { wtqMail_(m, M, url); } catch (e) { Logger.log('wtqMail_ ' + m + ': ' + e.message); M.rows.forEach(function (row) { upd.forEach(function (u) { if (u[0] === row) { u[1] = WTQ.ST.WAIT; u[3] = 'lỗi gửi: ' + e.message; } }); }); res.sent -= M.list.length; return; }
    const t = M.list.length + ' kết quả trúng thầu có sản phẩm liên quan nhóm sản phẩm MMH';
    feed.push(wtFeedRow_(M.pic, 'result', t, M.list.slice(0, 10).map(function (p) { return '• ' + p.inv + ' · ' + p.pkg + ' (' + p.lines.length + ' dòng)'; }).join('\n'),
      WT.APP_URL + (M.list.length === 1 ? '#g=' + encodeURIComponent(M.list[0].key) : '#moi')));
  });
  upd.forEach(function (u) { sh.getRange(u[0], 8, 1, 4).setValues([[u[1], now, u[2], u[3] || '']]); });
  wtFeed_(feed);
  return res;
}
function wtqMoney_(v) { const n = typeof v === 'number' ? v : wtmNum_(v); return typeof n === 'number' && n ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : wtS_(v); }
function wtqMail_(to, M, url) {
  const td = '<td style="padding:4px 8px;border-bottom:1px solid #E6EAEF;vertical-align:top">', th = '<th align="left" style="padding:4px 8px;background:#F0F7FF">';
  const blocks = M.list.map(function (p) {
    const L = p.lines.slice().sort(function (a, b) { return (b.high ? 1 : 0) - (a.high ? 1 : 0) || (b.mani ? 1 : 0) - (a.mani ? 1 : 0); });
    const rows = L.slice(0, WTQ.MAIL_LINES).map(function (x) {
      return '<tr>' + td + (x.high ? '<b>' : '') + wtH_(x.name.slice(0, 120)) + (x.high ? '</b>' : '') + '</td>' + td + wtH_(x.brand.slice(0, 60)) + '</td>' + td + wtH_(x.win.slice(0, 60)) + '</td>' +
        td + wtH_(wtqMoney_(x.qty) + (x.unit ? ' ' + x.unit : '')) + '</td>' + td + wtH_(wtqMoney_(x.price)) + '</td>' + td + wtH_(x.grp || x.kw) + '</td></tr>';
    }).join('');
    const more = L.length > WTQ.MAIL_LINES ? '<div style="color:#6B7280;font-size:12px;margin-top:4px">+ ' + (L.length - WTQ.MAIL_LINES) + ' dòng khác</div>' : '';
    return '<div style="margin:14px 0 4px"><a href="' + WT.APP_URL + '#g=' + encodeURIComponent(p.key) + '" style="color:#2C4A5E;text-decoration:none"><b>' + wtH_(p.inv) + '</b> · ' + wtH_(p.pkg) + '</a>' +
      '<br><span style="color:#6B7280;font-size:12px">' + wtH_([p.no, p.prov].filter(String).join(' · ')) + ' · ' + p.lines.length + ' dòng liên quan</span></div>' +
      '<table style="border-collapse:collapse;font-size:13px"><tr>' + th + 'Mặt hàng</th>' + th + 'Nhãn hiệu / hãng</th>' + th + 'Nhà thầu trúng</th>' + th + 'Khối lượng</th>' + th + 'Đơn giá</th>' + th + 'Nhóm SP MMH</th></tr>' + rows + '</table>' + more;
  }).join('');
  const links = [url.dent ? '<a href="' + url.dent + '">' + WTQ.TABS.dent + '</a>' : '', url.surg ? '<a href="' + url.surg + '">' + WTQ.TABS.surg + '</a>' : ''].filter(String).join(' · ');
  const subj = '[Theo dõi gói thầu] ' + (M.list.length === 1 ? 'Kết quả trúng thầu ' + M.list[0].inv + ' có sản phẩm liên quan nhóm SP MMH' : M.list.length + ' kết quả trúng thầu có sản phẩm liên quan nhóm SP MMH');
  mmhMail_({
    to: to, subject: subj, name: CFG.EMAIL_FROM_NAME,
    htmlBody: '<div style="font-family:Aptos,Arial,sans-serif;font-size:14px;color:#1F2937">Dear ' + wtH_(M.pic || '') + ',<br><br>' +
      'Kết quả lựa chọn nhà thầu của ' + (M.list.length === 1 ? 'gói' : M.list.length + ' gói') + ' bạn đang theo dõi có mặt hàng chứa từ khoá sản phẩm MMH. ' +
      'Dòng in đậm cùng nhóm sản phẩm MMH (khớp quy tắc làm sạch); các dòng khác mới khớp từ khoá, cần xem lại.' + blocks +
      '<br>Toàn bộ dòng liên quan (chưa làm sạch, có cột Đánh giá để bạn điền): ' + (links || 'file tổng hàng hóa') + '.<br><br>Best regards,<br>MMH Product Team</div>'
  });
}

/* ══════════ CHẠY ══════════ */
/** wtmTick: sau lượt gộp ⇒ dựng lại (khi có dữ liệu mới / đổi từ khoá) ⇒ xử lý gói chờ báo */
function wtqTick_(opt) {
  const b = wtqBuild_(opt || {});
  if (b.skip) return b;
  let p = null; try { p = wtqPendRun_(b); } catch (e) { p = { err: e.message }; Logger.log('wtqPendRun_: ' + e.message); }
  return { ok: true, rows: b.rows, src: b.src, kw: b.kw, cut: b.cut || 0, ms: b.ms, pend: p, url: b.url };
}
function wtqStatus_() {
  const P = PropertiesService.getScriptProperties(), st = {};
  try { wtRows_(wtqPendSheet_(), WTQ.PEND_HEAD.length).forEach(function (r) { const k = wtS_(r[7]); st[k] = (st[k] || 0) + 1; }); } catch (e) { st.err = e.message; }
  return { ok: true, v: WTQ.VER, last: wtJson_(P.getProperty('WTQ_LAST'), null), url: wtJson_(P.getProperty('WTQ_URL'), {}), dirty: P.getProperty('WTQ_DIRTY') === '1', pend: st };
}
/** action botSuspect {op} (khoá bot) / wSuspect (quản lý) */
function wtqAction_(p) {
  const op = wtS_(p.op) || 'status';
  if (op === 'status') return wtqStatus_();
  if (op === 'dry') {   // đếm thử, không ghi sheet, không email
    const b = wtqBuild_({ dry: true }), top = Object.keys(b.per).map(function (k) { return [k, b.per[k].n, b.per[k].mail.length, b.per[k].inv]; }).sort(function (a, c) { return c[1] - a[1]; });
    return { ok: true, src: b.src, kw: b.kw, rows: b.rows, packages: Object.keys(b.bares).length, withSuspect: top.length, mailWorthy: top.filter(function (x) { return x[2]; }).length, top: top.slice(0, 25), ms: b.ms };
  }
  if (op === 'run') return wtqTick_({ force: true });
  return { ok: false, error: 'op = status | dry | run' };
}
/** chạy tay trong trình soạn */
function wtqRunNow() { return wtqTick_({ force: true }); }
