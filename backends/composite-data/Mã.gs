/**
 * ============================================================================
 * MMH — COMPOSITE INTELLIGENCE SUITE  (Google Apps Script)
 * File: HS_30064010_Nha khoa (Composite & Bond) 2020–06/2026
 * ----------------------------------------------------------------------------
 * 1) Mapping "Tên nhãn hiệu vs đóng gói" ➜ "Total data"   (BA / BC / BH)
 *    + Tính "số lượng (PCS)"  BI = BH × Lượng(W)
 * 2) Mapping "Giá bán lẻ"     ➜ BM(VNĐ) BN(USD) BO(URL) BP(Phân khúc) BQ(Trị giá)
 *    Khóa đối chiếu: Tên hãng + Tên nhãn hiệu + Phân loại
 * 3) Dialog setup khoảng giá (gợi ý sẵn theo tertile, có thể kéo/sửa)
 * 4) Sheet "Dashboard thị phần Com" — lọc realtime, cardbox, bảng, biểu đồ
 * 5) ĐỒNG BỘ REALTIME (onEdit): sửa "Tên nhãn hiệu vs đóng gói" ➜ BA/BC/BG/BH/BI
 *    tự cập nhật; sửa "Giá bán lẻ" ➜ BM/BN/BO/BP/BQ tự cập nhật.
 * ----------------------------------------------------------------------------
 * BẢN v2026-08-13-A — SỬA 2 VIỆC
 *
 *  [1] REALTIME KHÔNG CHẠY
 *      • So tên sheet bằng cách CHUẨN HOÁ (bỏ khoảng trắng thừa, NFC, không phân
 *        biệt hoa thường). Trước đây so bằng "===" nên chỉ cần tab sheet thừa một
 *        dấu cách hoặc gõ dấu tiếng Việt ở dạng tổ hợp là trigger im lặng bỏ qua.
 *      • GHI NHẬT KÝ mọi lần trigger nổ (menu "📜 Nhật ký realtime"). Mở ra là biết
 *        ngay: trống trơn = trigger CHƯA nổ (chưa cài / sai chủ sở hữu / ô là công
 *        thức nên không tính là edit); có dòng nhưng báo 0 = tên nhãn hiệu ở 2 sheet
 *        không khớp nhau.
 *      • TỰ CÀI LẠI trigger sau mỗi lần chạy Bảng điều khiển hoặc dựng Dashboard.
 *      • Khi sửa "Giá bán lẻ": ngoài Tên nhãn hiệu còn dò thêm theo cặp
 *        Tên hãng + Phân loại, nên đổi giá của một dòng vẫn kéo được đúng các dòng
 *        Total data liên quan kể cả khi nhãn hiệu ghi lệch nhau đôi chút.
 *      • Luôn báo bằng toast: đã đồng bộ bao nhiêu dòng, hoặc vì sao 0 dòng.
 *      • Thêm menu "🔁 Đồng bộ TAY 1 nhãn hiệu…" để chạy thẳng, không cần trigger.
 *
 *  [2] DASHBOARD — thêm mục "SO SÁNH ĐỐI THỦ CÙNG PHÂN KHÚC"
 *      Nằm ngay TRƯỚC phần NOTE, chỉ hiện khi đã chọn 1 hãng ở bộ lọc.
 *      Liệt kê các hãng dẫn đầu trong TỪNG nhóm (Chủng loại × Phân khúc giá) mà
 *      hãng đang chọn có mặt, sắp theo % SẢN LƯỢNG giảm dần, dòng MANI bôi vàng.
 *
 * ----------------------------------------------------------------------------
 * BẢN v2026-08-13-B
 *
 *  [3] NGÀY ĐĂNG KÝ (cột F của Total data)
 *      • Đọc vào dashboard ⇒ biết chính xác dữ liệu nhập khẩu đến ngày nào.
 *      • CAGR KHÔNG còn lấy năm cuối nếu năm đó chưa đủ 12 tháng — nếu dữ liệu
 *        chỉ đến 29/05/2026 thì CAGR tính đến 2025, vì so 5 tháng với 12 tháng
 *        sẽ ra tăng trưởng âm giả tạo.
 *      • Thêm 2 dòng ghi chú ngay dưới biểu đồ xu hướng: nói rõ năm nào chưa đủ,
 *        đã đi được bao nhiêu % của năm, và ước tính ngoại suy cả năm (demand).
 *      • Cột "Năm" trống thì tự suy ra từ Ngày đăng ký.
 *
 *  [4] REALTIME — THÊM LƯỚI AN TOÀN CHẠY THEO GIỜ
 *      onEdit CHỈ nổ khi người dùng gõ tay vào ô. Nó KHÔNG nổ khi ô nguồn là
 *      công thức, khi dữ liệu được ghi bằng script/API, hoặc khi trigger bị gỡ.
 *      Bản này thêm trigger chạy mỗi 5 phút, so "dấu vết" từng dòng của 2 sheet
 *      nguồn với lần quét trước; dòng nào đổi thì đồng bộ đúng Tên hàng / Nhãn
 *      hiệu của dòng đó sang Total data. Không phụ thuộc onEdit nữa.
 *      Kèm menu "🔍 QUÉT THAY ĐỔI & đồng bộ NGAY" để chạy tay bất cứ lúc nào.
 * ============================================================================
 */

var SCRIPT_VER = 'v2026-08-13-B';

var CFG = {
  SPREADSHEET_ID: '',            // '' = chạy trong chính file
  FX: 26400,                     // tỉ giá VNĐ/USD

  DATA: {
    SHEET      : 'Total data',
    HEADER_ROW : 3,
    FIRST_ROW  : 4,
    FIRST_COL  : 'B',
    LAST_COL   : 'BR',
    KEY        : 'M',            // Tên hàng
    QTY        : 'W',            // Lượng
    DATE       : 'F',            // Ngày đăng ký (tờ khai) — để '' thì dò theo tiêu đề HDR_DATE
    HDR_DATE   : ['ngày đăng ký', 'ngay dang ky', 'ngày tờ khai', 'ngày đk'],
    LV1        : 'AY',           // Phân loại level 1 (composite / bond / other)
    OUT_LV2    : 'BA',           // Phân loại level 2
    OUT_BRAND  : 'BC',           // Tên nhãn hiệu
    OUT_COUNTRY: 'BG',           // Tên nước xuất xứ đầy đủ
    OUT_PCS_BOX: 'BH',           // Số chiếc/hộp
    OUT_PCS    : 'BI',           // số lượng (PCS) = BH × W
    OUT_PRICE_V: 'BM',           // Giá bán lẻ (VNĐ)
    OUT_PRICE_U: 'BN',           // Giá bán lẻ (USD)
    OUT_URL    : 'BO',           // URL nguồn
    OUT_TIER   : 'BP',           // Phân khúc giá
    OUT_VALUE  : 'BQ',           // Trị giá theo giá bán lẻ (USD) = BI × BN
    // ⚠ "Tên hãng" (nhà sản xuất) — KHÁC "Tên hàng" (mô tả hàng hóa, cột M).
    COMPANY    : 'BF',
    HDR_COMPANY: ['tên hãng', 'hãng sản xuất', 'tên hãng sx', 'hãng sx'],
    HDR_YEAR   : ['năm', 'nam', 'year']
  },

  MAP: {
    SHEET: 'Tên nhãn hiệu vs đóng gói', HEADER_ROW: 4, FIRST_ROW: 5,
    KEY: 'B', LV2: 'C', BRAND: 'D', COUNTRY: 'F', PCS: 'G',
    HDR: {
      KEY    : ['tên hàng'],
      LV2    : ['phân loại level 2', 'paste/flow'],
      BRAND  : ['tên nhãn hiệu'],
      COUNTRY: ['tên nước xuất xứ đầy đủ', 'nước xuất xứ', 'xuất xứ'],
      PCS    : ['số chiếc/hộp', 'so chiec/hop', 'số chiếc / hộp'],
      COMPANY: ['tên hãng', 'hãng sản xuất', 'hãng sx']
    }
  },

  PCS_THEO: 'dong',              // 'dong' | 'nhanhieu'

  PRICE: {
    SHEET: 'Giá bán lẻ', HEADER_ROW: 3, FIRST_ROW: 4,
    COMPANY: 'C', BRAND: 'D', LV2: 'F', PRICE: 'H', URL: 'I'
  },

  DASH: { SHEET: 'Dashboard thị phần Com', CALC: '_DashCalc', LISTS: '_DashLists', SRC: '_DashSrc' },

  TIER_COLOR: {
    HIGH: { bg: '#D6E4F0', fg: '#003047' },
    MID : { bg: '#FFF2CC', fg: '#7A5C00' },
    LOW : { bg: '#EFEFEF', fg: '#555555' }
  },

  LEVEL1_FLAG    : 'composite',
  ONLY_FILL_FLAG : false,
  OVERWRITE      : true,
  NORMALIZE_KEY  : true,
  HIGHLIGHT      : true,
  CLEAR_HIGHLIGHT: true,
  HL_COLOR       : '#FFF8E1',
  RANGE_CHUNK    : 400,
  MAX_PCS_BOX      : 2000,
  XOA_KHI_KHONG_KHOP: true,
  HL_COL_FROM    : 'B',
  HL_COL_TO      : 'N',
  REPORT_SHEET   : 'Thiếu mapping',

  TIER_KEY       : 'MMH_PRICE_TIERS_V1',
  TIER_LABELS    : { HIGH: 'Cao', MID: 'Trung bình', LOW: 'Thấp' },

  COLOR: {
    NAVY: '#003047', LBLUE: '#CFE2F3', PALE: '#F0F7FF', CREAM: '#FFF8E1',
    MANI: '#FFE100', INK: '#1A1A1A', MUTED: '#666666', GRID: '#D9D9D9', WHITE: '#FFFFFF'
  },
  PALETTE: ['#7FB2E5', '#8FCB9B', '#F0A868', '#C4A2D8', '#7FD1D4', '#F0999F',
            '#AEBE7E', '#9FB4D4', '#E0A98B', '#84C7B8', '#C9B0A0', '#A9BBD0',
            '#D7A5C4', '#9DC98E', '#E8B08A', '#8EC0DA'],
  TIER_COLORS: ['#6FA8DC', '#A9CCE8', '#DCE9F5']
};

var LV2_ORDER = ['Paste', 'Flow', 'Flow - Bulk', 'Paste - Bulk', 'Capsules'];

/* Số hãng dẫn đầu hiển thị trong MỖI nhóm (Chủng loại × Phân khúc) của bảng
   "So sánh đối thủ cùng phân khúc". */
var TOP_CP = 5;

function _wTB()   { return 6 + LV2_ORDER.length; }
function _wSG()   { return 1 + LV2_ORDER.length * 3; }
function _iPCS()  { return 2 + LV2_ORDER.length; }
function _iPSL()  { return 3 + LV2_ORDER.length; }
function _iGT()   { return 4 + LV2_ORDER.length; }
function _iPGT()  { return 5 + LV2_ORDER.length; }

/* ============================== MENU ============================== */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('MMH Composite ' + SCRIPT_VER)
    .addItem('▶  BẢNG ĐIỀU KHIỂN (Mapping + Giá)', 'moBangDieuKhien')
    .addSeparator()
    .addItem('📊  DỰNG LẠI DASHBOARD THỊ PHẦN', 'menuTaoDashboard')
    .addSeparator()
    .addItem('Setup khoảng giá phân khúc…', 'moDialogPhanKhucGia')
    .addItem('Dò cột — kiểm tra tiêu đề Total data', 'doCotChanDoan')
    .addItem('Soi cột "Số chiếc/hộp" — tìm dòng bất thường', 'soiSoChiecHop')
    .addSeparator()
    .addItem('⚡  BẬT đồng bộ realtime (sheet mapping + sheet giá)', 'caiTriggerRealtime')
    .addItem('⏸  Tắt đồng bộ realtime', 'tatTriggerRealtime')
    .addItem('🔎  KIỂM TRA vì sao realtime không chạy…', 'kiemTraDongBo')
    .addItem('📜  Nhật ký realtime (10 lần gần nhất)…', 'xemNhatKyRealtime')
    .addItem('🔁  Đồng bộ TAY 1 nhãn hiệu…', 'dongBoTheoNhanHieu')
    .addItem('🔁  Đồng bộ TAY toàn bộ (mapping + giá)', 'dongBoToanBo')
    .addSeparator()
    .addItem('⏱  BẬT quét định kỳ mỗi 5 phút (lưới an toàn)', 'caiTriggerDinhKy')
    .addItem('⏹  Tắt quét định kỳ', 'tatTriggerDinhKy')
    .addItem('🔍  QUÉT THAY ĐỔI & đồng bộ NGAY', 'quetThayDoiNgay')
    .addSeparator()
    .addItem('🩺  Xem lỗi gần nhất khi dựng dashboard…', 'xemLoiCuoi')
    .addItem('🔬  Soi dữ liệu sheet tính (_DashCalc)…', 'soiDashCalc')
    .addItem('🔢  Vì sao biểu đồ cột chưa có nhãn số…', 'huongDanNhanSo')
    .addSeparator()
    .addItem('Bôi màu lại theo phân khúc giá', 'apDinhDangPhanKhuc')
    .addItem('Xuất danh sách thiếu mapping', 'xuatDanhSachThieuMapping')
    .addItem('Xuất tổ hợp chưa có giá bán lẻ', 'xuatGiaChuaKhop')
    .addItem('Xóa màu bôi', 'xoaMauBoi')
    .addToUi();
}

function chayTatCa() {
  dienDuLieuTuMapping();
  mappingGiaBanLe();
  taoDashboard();
  _toast('Đã chạy xong toàn bộ pipeline.', 'MMH Composite');
}

/* ==================================================================
 * PHẦN 1 — MAPPING NHÃN HIỆU + TÍNH PCS
 * ================================================================== */

function dienDuLieuTuMapping() {
  var p = jobPlan('mapping'), r;
  do { r = jobStep(); } while (!r.xong);
  Logger.log(r.ketQua);
  _toast(r.ketQua, 'Hoàn tất mapping');
  return r.ketQua;
}

function doCotChanDoan() {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var last = sh.getLastColumn();
  var hdr = sh.getRange(CFG.DATA.HEADER_ROW, 1, 1, last).getValues()[0];
  var mau = sh.getRange(CFG.DATA.FIRST_ROW, 1, 1, last).getValues()[0];

  var duKien = {};
  duKien[CFG.DATA.KEY] = 'KEY — Tên hàng (mô tả hàng hóa)';
  duKien[_chuCot(_cotHang(sh))] = '★ Tên hãng (NHÀ SẢN XUẤT) — dùng cho ghép giá & thị phần';
  duKien[CFG.DATA.QTY] = 'Lượng';
  if (CFG.DATA.DATE) duKien[CFG.DATA.DATE] = '★ Ngày đăng ký — mốc thời gian cho CAGR & ghi chú năm chưa đủ';
  duKien[CFG.DATA.LV1] = '★ LỌC — Phân loại level 1';
  duKien[CFG.DATA.OUT_LV2] = 'GHI — Phân loại level 2';
  duKien[CFG.DATA.OUT_BRAND] = 'GHI — Tên nhãn hiệu';
  duKien[CFG.DATA.OUT_COUNTRY] = 'GHI — Tên nước xuất xứ đầy đủ';
  duKien[CFG.DATA.OUT_PCS_BOX] = 'GHI — Số chiếc/hộp';
  duKien[CFG.DATA.OUT_PCS] = 'GHI — số lượng (PCS)';
  duKien[CFG.DATA.OUT_PRICE_V] = 'GHI — Giá bán lẻ VNĐ';
  duKien[CFG.DATA.OUT_PRICE_U] = 'GHI — Giá bán lẻ USD';
  duKien[CFG.DATA.OUT_URL] = 'GHI — URL nguồn';
  duKien[CFG.DATA.OUT_TIER] = 'GHI — Phân khúc giá';
  duKien[CFG.DATA.OUT_VALUE] = 'GHI — Trị giá bán lẻ';

  var out = [['Cột', 'Tiêu đề thật (dòng ' + CFG.DATA.HEADER_ROW + ')', 'Giá trị dòng đầu', 'Script đang dùng cột này để…']];
  for (var c = 1; c <= last; c++) {
    var L = _chuCot(c);
    var t = _val(hdr[c - 1]), v = _val(mau[c - 1]);
    if (!t && !v && !duKien[L]) continue;
    out.push([L, t, v.substring(0, 60), duKien[L] || '']);
  }

  var n = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  var lv1 = _cot(sh, CFG.DATA.LV1, n), dem = {};
  for (var i = 0; i < n; i++) { var k = _val(lv1[i][0]); dem[k] = (dem[k] || 0) + 1; }
  out.push(['', '', '', '']);
  out.push(['— GIÁ TRỊ TRONG CỘT LỌC ' + CFG.DATA.LV1 + ' —', 'Giá trị', 'Số dòng', 'Khớp "' + CFG.LEVEL1_FLAG + '"?']);
  Object.keys(dem).sort(function (a, b) { return dem[b] - dem[a]; }).slice(0, 15).forEach(function (k) {
    out.push(['', k || '(trống)', dem[k], String(k).trim().toLowerCase() === CFG.LEVEL1_FLAG ? '✔ CÓ' : '']);
  });

  var m = _sheet(ss, CFG.MAP.SHEET);
  var mh = m.getRange(CFG.MAP.HEADER_ROW, 1, 1, m.getLastColumn()).getValues()[0];
  out.push(['', '', '', '']);
  out.push(['— SHEET MAPPING: ' + CFG.MAP.SHEET + ' —', 'Tiêu đề (dòng ' + CFG.MAP.HEADER_ROW + ')', 'Giá trị dòng đầu', '']);
  var mv = m.getRange(CFG.MAP.FIRST_ROW, 1, 1, m.getLastColumn()).getValues()[0];
  for (var c2 = 1; c2 <= mh.length; c2++) {
    if (!_val(mh[c2 - 1])) continue;
    out.push([_chuCot(c2), _val(mh[c2 - 1]), _val(mv[c2 - 1]).substring(0, 60), '']);
  }

  var s = _lamMoiSheet(ss, 'Dò cột');
  s.getRange(1, 1, out.length, 4).setValues(out);
  _headerStyle(s.getRange(1, 1, 1, 4));
  s.setColumnWidth(1, 70); s.setColumnWidth(2, 380); s.setColumnWidth(3, 300); s.setColumnWidth(4, 260);
  s.setFrozenRows(1);
  ss.setActiveSheet(s);
  _toast('Đã tạo sheet "Dò cột". Kiểm tra cột nào script đang ghi vào, sửa CFG nếu lệch.', 'Dò cột');
}

function _chuCot(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }

function kiemTraMapping() {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var nRows = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  var mapObj = _docMapping(ss);
  var keys = _cot(sh, CFG.DATA.KEY, nRows), lv1s = _cot(sh, CFG.DATA.LV1, nRows);
  var khop = 0, thieu = 0, flagTong = 0, trong = 0;
  for (var i = 0; i < nRows; i++) {
    if (String(lv1s[i][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) continue;
    flagTong++;
    var k = _chuanHoa(keys[i][0]);
    if (!k) { trong++; continue; }
    if (mapObj.map[k]) khop++; else thieu++;
  }
  var msg = 'DRY-RUN — chưa ghi gì.\nKhóa mapping: ' + mapObj.soKhoa +
    '\nDòng Total data: ' + nRows + ' (trống Tên hàng: ' + trong + ')' +
    '\nComposite (cột ' + CFG.DATA.LV1 + '): ' + flagTong + '\nSẽ điền: ' + khop + ' dòng → thiếu mapping ' + thieu;
  Logger.log(msg); _toast(msg, 'Kiểm tra'); return msg;
}

function xuatDanhSachThieuMapping() {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var nRows = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  var map = _docMapping(ss).map;
  var keys = _cot(sh, CFG.DATA.KEY, nRows), lv1s = _cot(sh, CFG.DATA.LV1, nRows);
  var gom = {}, thuTu = [];
  for (var i = 0; i < nRows; i++) {
    var raw = keys[i][0], k = _chuanHoa(raw);
    if (!k) continue;
    if (String(lv1s[i][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) continue;
    if (map[k]) continue;
    if (!gom[k]) { gom[k] = { ten: String(raw).trim(), soDong: 0, dongDau: CFG.DATA.FIRST_ROW + i }; thuTu.push(k); }
    gom[k].soDong++;
  }
  thuTu.sort(function (a, b) { return gom[b].soDong - gom[a].soDong; });
  var out = [['STT', 'Tên hàng (chưa có trong mapping)', 'Số dòng', 'Dòng đầu tiên']];
  thuTu.forEach(function (k, j) { out.push([j + 1, gom[k].ten, gom[k].soDong, gom[k].dongDau]); });
  var s = _lamMoiSheet(ss, CFG.REPORT_SHEET);
  s.getRange(1, 1, out.length, 4).setValues(out);
  _headerStyle(s.getRange(1, 1, 1, 4));
  s.setColumnWidth(2, 700); s.setFrozenRows(1);
  var msg = 'Đã xuất ' + (out.length - 1) + ' tên hàng chưa có mapping.';
  _toast(msg, 'Xong'); return msg;
}

/* ==================================================================
 * PHẦN 2 — MAPPING GIÁ BÁN LẺ
 * ================================================================== */

/**
 * Đọc sheet "Giá bán lẻ" → { idx, rows }
 * idx có 3 tầng khóa, dò theo thứ tự ưu tiên:
 *   1. hãng|nhãn hiệu|phân loại   (đầy đủ)
 *   2. ~nhãn hiệu|phân loại       (bỏ hãng)
 *   3. ^nhãn hiệu                 (chỉ nhãn hiệu — mới thêm, cứu các dòng
 *      Total data có Phân loại lệch với sheet giá; lấy giá cao nhất)
 */
function _docGiaBanLe(ss) {
  var sh = _sheet(ss, CFG.PRICE.SHEET);
  var n = sh.getLastRow() - CFG.PRICE.FIRST_ROW + 1;
  if (n <= 0) throw new Error('Sheet "' + CFG.PRICE.SHEET + '" không có dữ liệu.');
  var c1 = _idx(CFG.PRICE.COMPANY);
  var c2 = Math.max(_idx(CFG.PRICE.BRAND), _idx(CFG.PRICE.LV2), _idx(CFG.PRICE.PRICE), _idx(CFG.PRICE.URL));
  var v = sh.getRange(CFG.PRICE.FIRST_ROW, c1, n, c2 - c1 + 1).getValues();
  var iC = 0, iB = _idx(CFG.PRICE.BRAND) - c1, iL = _idx(CFG.PRICE.LV2) - c1,
      iP = _idx(CFG.PRICE.PRICE) - c1, iU = _idx(CFG.PRICE.URL) - c1;

  var idx = {}, rows = [], soKhoa = 0;
  for (var r = 0; r < n; r++) {
    var hang = _val(v[r][iC]), brand = _val(v[r][iB]), lv2 = _val(v[r][iL]);
    if (!hang && !brand) continue;
    var gia = _num(v[r][iP]);
    var rec = { hang: hang, brand: brand, lv2: lv2, gia: gia, url: _val(v[r][iU]),
                dong: CFG.PRICE.FIRST_ROW + r };
    rows.push(rec);
    if (gia > 0) {
      var k = _khoaGia(hang, brand, lv2);
      if (!idx[k]) { idx[k] = rec; soKhoa++; }
      else if (gia > idx[k].gia) idx[k] = rec;
      var k2 = '~' + _norm(brand) + '|' + _norm(lv2);
      if (!idx[k2] || gia > idx[k2].gia) idx[k2] = rec;
      var k3 = '^' + _norm(brand);
      if (!idx[k3] || gia > idx[k3].gia) idx[k3] = rec;
    }
  }
  return { idx: idx, rows: rows, soKhoa: soKhoa };
}

function _khoaGia(hang, brand, lv2) { return _norm(hang) + '|' + _norm(brand) + '|' + _norm(lv2); }

/** Dò giá theo 3 tầng khóa. Trả về { hit, tang } — tang: 1 / 2 / 3 / 0 (không thấy). */
function _doGia(P, hang, brand, lv2) {
  var hit = P.idx[_khoaGia(hang, brand, lv2)];
  if (hit && hit.gia > 0) return { hit: hit, tang: 1 };
  hit = P.idx['~' + _norm(brand) + '|' + _norm(lv2)];
  if (hit && hit.gia > 0) return { hit: hit, tang: 2 };
  hit = P.idx['^' + _norm(brand)];
  if (hit && hit.gia > 0) return { hit: hit, tang: 3 };
  return { hit: null, tang: 0 };
}

function mappingGiaBanLe() {
  var t0 = new Date();
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var nRows = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  if (nRows <= 0) throw new Error('Total data trống.');

  var P = _docGiaBanLe(ss);
  var tiers = _layNguongGia();

  var colHang = _cotHang(sh);
  var lv1   = _cot(sh, CFG.DATA.LV1, nRows);
  var hang  = sh.getRange(CFG.DATA.FIRST_ROW, colHang, nRows, 1).getValues();
  var brand = _cot(sh, CFG.DATA.OUT_BRAND, nRows);
  var lv2   = _cot(sh, CFG.DATA.OUT_LV2, nRows);
  var pcs   = _cot(sh, CFG.DATA.OUT_PCS, nRows);

  var oV = [], oU = [], oL = [], oT = [], oX = [];
  var stat = { khopChinh: 0, khopPhu: 0, khopNH: 0, khong: 0, coPcs: 0 };

  for (var i = 0; i < nRows; i++) {
    var h = _val(hang[i][0]), b = _val(brand[i][0]), l = _val(lv2[i][0]);
    if (String(lv1[i][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) b = '';
    if (!b) { oV.push(['']); oU.push(['']); oL.push(['']); oT.push(['']); oX.push(['']); continue; }

    var d = _doGia(P, h, b, l);
    if (d.tang === 1) stat.khopChinh++;
    else if (d.tang === 2) stat.khopPhu++;
    else if (d.tang === 3) stat.khopNH++;

    if (!d.hit) {
      stat.khong++;
      oV.push(['']); oU.push(['']); oL.push(['']); oT.push(['']); oX.push(['']);
      continue;
    }

    var vnd = d.hit.gia, usd = vnd / CFG.FX;
    var q = _num(pcs[i][0]);
    oV.push([vnd]);
    oU.push([usd]);
    oL.push([d.hit.url || '']);
    oT.push([_phanKhuc(l, vnd, tiers)]);
    if (q > 0) { oX.push([q * usd]); stat.coPcs++; } else oX.push(['']);
  }

  _setCot(sh, CFG.DATA.OUT_PRICE_V, oV);
  _setCot(sh, CFG.DATA.OUT_PRICE_U, oU);
  _setCot(sh, CFG.DATA.OUT_URL, oL);
  _setCot(sh, CFG.DATA.OUT_TIER, oT);
  _setCot(sh, CFG.DATA.OUT_VALUE, oX);

  sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_PRICE_V), nRows, 1).setNumberFormat('#,##0');
  sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_PRICE_U), nRows, 1).setNumberFormat('#,##0.00');
  sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_VALUE), nRows, 1).setNumberFormat('#,##0');

  _ghiTieuDeCotMoi(sh);
  apDinhDangPhanKhuc();

  var msg =
    'Khóa giá bán lẻ      : ' + P.soKhoa + '\n' +
    'Khớp đủ 3 khóa       : ' + stat.khopChinh + '\n' +
    'Khớp phụ (bỏ hãng)   : ' + stat.khopPhu + '\n' +
    'Khớp theo nhãn hiệu  : ' + stat.khopNH + '\n' +
    'Không có giá         : ' + stat.khong + '\n' +
    'Tính được trị giá    : ' + stat.coPcs + '\n' +
    'Tỉ giá: ' + CFG.FX + ' VNĐ/USD\n' +
    'Thời gian: ' + (Math.round((new Date() - t0) / 100) / 10) + 's';
  Logger.log(msg); _toast(msg, 'Mapping giá bán lẻ'); return msg;
}

function tinhLaiPhanKhucGia() {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var nRows = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  var tiers = _layNguongGia();
  var lv2 = _cot(sh, CFG.DATA.OUT_LV2, nRows), gia = _cot(sh, CFG.DATA.OUT_PRICE_V, nRows);
  var out = [], dem = 0;
  for (var i = 0; i < nRows; i++) {
    var g = _num(gia[i][0]);
    if (g > 0) { out.push([_phanKhuc(_val(lv2[i][0]), g, tiers)]); dem++; }
    else out.push(['']);
  }
  _setCot(sh, CFG.DATA.OUT_TIER, out);
  apDinhDangPhanKhuc();
  _toast('Đã tính lại phân khúc cho ' + dem + ' dòng.', 'Phân khúc giá');
}

function xuatGiaChuaKhop() {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var nRows = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  var colHang = _cotHang(sh);
  var hang = sh.getRange(CFG.DATA.FIRST_ROW, colHang, nRows, 1).getValues();
  var brand = _cot(sh, CFG.DATA.OUT_BRAND, nRows), lv2 = _cot(sh, CFG.DATA.OUT_LV2, nRows);
  var gia = _cot(sh, CFG.DATA.OUT_PRICE_V, nRows), pcs = _cot(sh, CFG.DATA.OUT_PCS, nRows);

  var gom = {};
  for (var i = 0; i < nRows; i++) {
    var b = _val(brand[i][0]); if (!b) continue;
    if (_num(gia[i][0]) > 0) continue;
    var k = _val(hang[i][0]) + '|' + b + '|' + _val(lv2[i][0]);
    if (!gom[k]) gom[k] = { h: _val(hang[i][0]), b: b, l: _val(lv2[i][0]), n: 0, pcs: 0 };
    gom[k].n++; gom[k].pcs += _num(pcs[i][0]);
  }
  var arr = Object.keys(gom).map(function (k) { return gom[k]; })
    .sort(function (a, b) { return b.pcs - a.pcs; });

  var out = [['STT', 'Tên hãng', 'Tên nhãn hiệu', 'Phân loại', 'Số dòng tờ khai', 'Tổng PCS nhập', 'Từ khoá tìm kiếm']];
  arr.forEach(function (r, j) {
    out.push([j + 1, r.h, r.b, r.l, r.n, r.pcs, _tuKhoa(r.h, r.b, r.l)]);
  });
  var s = _lamMoiSheet(ss, 'Thiếu giá bán lẻ');
  s.getRange(1, 1, out.length, 7).setValues(out);
  _headerStyle(s.getRange(1, 1, 1, 7));
  s.setColumnWidths(2, 3, 200); s.setColumnWidth(7, 420); s.setFrozenRows(1);
  s.getRange(2, 6, Math.max(out.length - 1, 1), 1).setNumberFormat('#,##0');
  _toast('Đã xuất ' + arr.length + ' tổ hợp chưa có giá.', 'Xong');
}

function _tuKhoa(h, b, l) {
  var m = { 'Paste': 'đặc', 'Flow': 'lỏng', 'Flow - Bulk': 'lỏng trám khối',
            'Paste - Bulk': 'đặc trám khối', 'Capsules': 'nhộng' };
  return ['Giá bán composite', m[l] || l, b, h, 'nha khoa'].filter(String).join(' ');
}

/* ---------- Ngưỡng phân khúc giá ---------- */

function _tierMacDinh() {
  return {
    'Paste':       { low: 400000, high: 650000 },
    'Flow':        { low: 250000, high: 506000 },
    'Flow - Bulk': { low: 380000, high: 739000 },
    'Paste - Bulk':{ low: 380000, high: 739000 },
    'Capsules':    { low: 49000,  high: 95000  }
  };
}

function _layNguongGia() {
  var raw = null;
  try { raw = PropertiesService.getDocumentProperties().getProperty(CFG.TIER_KEY); }
  catch (e) { return _tierMacDinh(); }
  if (!raw) return _tierMacDinh();
  try { return JSON.parse(raw); } catch (e2) { return _tierMacDinh(); }
}

function _luuNguongGia(obj) {
  PropertiesService.getDocumentProperties().setProperty(CFG.TIER_KEY, JSON.stringify(obj));
}

var TIER_MUON = { 'Paste - Bulk': 'Flow - Bulk', 'Flow - Bulk': 'Flow' };

function _phanKhuc(lv2, gia, tiers) {
  var chuan = _chuanLv2(lv2);
  var t = tiers[lv2] || tiers[chuan];
  if (!t && TIER_MUON[chuan]) t = tiers[TIER_MUON[chuan]];
  if (!t || !(gia > 0)) return '';
  if (gia >= t.high) return CFG.TIER_LABELS.HIGH;
  if (gia >= t.low)  return CFG.TIER_LABELS.MID;
  return CFG.TIER_LABELS.LOW;
}

function _chuanLv2(s) {
  var n = _norm(s);
  if (n.indexOf('caps') >= 0 || n.indexOf('nhong') >= 0) return 'Capsules';
  if (n.indexOf('bulk') >= 0) {
    if (n.indexOf('paste') >= 0 || n.indexOf('dac') >= 0) return 'Paste - Bulk';
    return 'Flow - Bulk';
  }
  if (n.indexOf('flow') >= 0 || n.indexOf('long') >= 0) return 'Flow';
  if (n.indexOf('paste') >= 0 || n.indexOf('dac') >= 0) return 'Paste';
  return _val(s);
}

function goiYNguongGia() {
  var P = _docGiaBanLe(_ss());
  var byLv = {};
  P.rows.forEach(function (r) {
    if (!(r.gia > 0)) return;
    var l = _chuanLv2(r.lv2); if (!l) return;
    (byLv[l] = byLv[l] || []).push({ gia: r.gia, hang: r.hang, brand: r.brand });
  });

  var hienTai = _layNguongGia(), out = [];
  LV2_ORDER.forEach(function (l) {
    var arr = (byLv[l] || []).slice().sort(function (a, b) { return a.gia - b.gia; });
    if (!arr.length) return;
    var g = arr.map(function (x) { return x.gia; });
    var q = function (p) { return g[Math.min(g.length - 1, Math.max(0, Math.round(p * (g.length - 1))))]; };
    var sug = { low: _lamTron(q(1 / 3)), high: _lamTron(q(2 / 3)) };
    var cur = hienTai[l] || sug;
    out.push({
      lv2: l, n: g.length, min: g[0], max: g[g.length - 1],
      p33: sug.low, p50: _lamTron(q(0.5)), p67: sug.high,
      low: cur.low, high: cur.high,
      items: arr.map(function (x) { return { hang: x.hang, brand: x.brand, gia: x.gia }; })
    });
  });
  return out;
}

function _lamTron(v) { return Math.round(v / 1000) * 1000; }

function moDialogPhanKhucGia() {
  var data = goiYNguongGia();
  var html = HtmlService.createHtmlOutput(_htmlDialogGia(data))
    .setWidth(920).setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Setup khoảng giá phân khúc — Composite');
}

function luuNguongGiaTuDialog(obj) {
  _luuNguongGia(obj);
  tinhLaiPhanKhucGia();
  return 'OK';
}

function _htmlDialogGia(data) {
  var json = JSON.stringify(data).replace(/</g, '\u003c');
  var C = CFG.TIER_COLOR;
  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
'*{box-sizing:border-box}body{font-family:Aptos,Segoe UI,Arial,sans-serif;font-size:13px;color:#1A1A1A;margin:0;padding:0;background:#fff}' +
'.wrap{padding:16px 18px 0}h2{color:#003047;font-size:16px;margin:0 0 3px}p.s{color:#666;font-size:11px;margin:0 0 12px;line-height:1.5}' +
'.tabs{display:flex;gap:4px;border-bottom:2px solid #CFE2F3;margin-bottom:14px}' +
'.tab{padding:8px 16px;cursor:pointer;font-weight:600;font-size:12px;color:#666;border-radius:6px 6px 0 0;border:1px solid transparent;border-bottom:none}' +
'.tab.on{background:#CFE2F3;color:#003047;border-color:#CFE2F3}' +
'.tab i{font-style:normal;font-weight:400;color:#888;font-size:11px}' +
'.hist{display:flex;align-items:flex-end;gap:2px;height:110px;padding:0 2px;border-bottom:2px solid #003047;margin-bottom:2px}' +
'.hist div{flex:1;border-radius:2px 2px 0 0;min-height:2px;transition:background .15s}' +
'.axis{display:flex;justify-content:space-between;color:#888;font-size:10px;margin-bottom:14px}' +
'.ctl{display:flex;align-items:center;gap:12px;margin:10px 0}' +
'.ctl label{width:158px;font-weight:600;color:#003047;font-size:12px}' +
'input[type=range]{flex:1;accent-color:#003047;height:22px}' +
'input[type=number]{width:118px;padding:5px 7px;border:1px solid #D9D9D9;border-radius:4px;font-family:inherit;text-align:right;font-size:12px}' +
'.legend{display:flex;gap:8px;margin:14px 0 8px}' +
'.lg{flex:1;border-radius:6px;padding:9px 11px;text-align:center}' +
'.lg b{display:block;font-size:19px;line-height:1.2}.lg span{font-size:10px;opacity:.85}' +
'.brands{max-height:120px;overflow-y:auto;border:1px solid #E4E4E4;border-radius:6px;padding:8px;background:#FAFAFA}' +
'.chip{display:inline-block;padding:2px 8px;margin:2px;border-radius:10px;font-size:10.5px;border:1px solid #D9D9D9;background:#fff}' +
'.chip u{text-decoration:none;color:#888;font-weight:400}' +
'.foot{position:sticky;bottom:0;background:#fff;border-top:1px solid #D9D9D9;padding:11px 18px;display:flex;gap:9px;align-items:center;margin-top:14px}' +
'.foot .sp{flex:1;color:#666;font-size:11px}' +
'button{padding:8px 17px;border-radius:6px;border:none;font-family:inherit;font-size:12.5px;cursor:pointer;font-weight:600}' +
'.ok{background:#003047;color:#fff}.re{background:#FFE100;color:#003047}.ca{background:#EEE;color:#333}' +
'</style></head><body>' +
'<div class="wrap"><h2>Setup khoảng giá phân khúc</h2>' +
'<p class="s">Ngưỡng điền sẵn theo tertile 33%/67% của chính dữ liệu sheet "' + CFG.PRICE.SHEET + '". ' +
'Cột biểu đồ đổi màu ngay khi anh kéo — nhìn được luôn nhãn hiệu nào rơi vào phân khúc nào.<br>' +
'Bấm <b>Xác nhận</b> để lưu, tính lại cột ' + CFG.DATA.OUT_TIER + ' và bôi màu toàn bộ.</p>' +
'<div class="tabs" id="tabs"></div><div id="body"></div></div>' +
'<div class="foot"><span class="sp" id="hint"></span>' +
'<button class="ca" onclick="google.script.host.close()">Hủy</button>' +
'<button class="re" onclick="resetAll()">Về gợi ý mặc định</button>' +
'<button class="ok" id="btnok" onclick="save()">Xác nhận &amp; áp dụng</button></div>' +
'<script>var D=' + json + ',cur=0;' +
'var CH="' + C.HIGH.bg + '",CHF="' + C.HIGH.fg + '",CM="' + C.MID.bg + '",CMF="' + C.MID.fg + '",CL="' + C.LOW.bg + '",CLF="' + C.LOW.fg + '";' +
'var V={};D.forEach(function(d,i){V[i]={low:d.low,high:d.high};});' +
'function fmt(n){return Number(n).toLocaleString("vi-VN");}' +
'function tier(g,v){return g>=v.high?2:(g>=v.low?1:0);}' +
'function tabs(){var t=document.getElementById("tabs");t.innerHTML="";' +
'D.forEach(function(d,i){var e=document.createElement("div");e.className="tab"+(i==cur?" on":"");' +
'e.innerHTML=d.lv2+" <i>("+d.n+")</i>";e.onclick=function(){cur=i;tabs();body();};t.appendChild(e);});}' +
'function body(){var d=D[cur],v=V[cur];' +
'document.getElementById("body").innerHTML=' +
'"<div class=hist id=hist></div><div class=axis><span>"+fmt(d.min)+" ₫</span><span>"+fmt(d.max)+" ₫</span></div>"' +
'+"<div class=ctl><label>Thấp → Trung bình</label><input type=range id=r1 min="+d.min+" max="+d.max+" step=1000 value="+v.low+"><input type=number id=n1 value="+v.low+"></div>"' +
'+"<div class=ctl><label>Trung bình → Cao</label><input type=range id=r2 min="+d.min+" max="+d.max+" step=1000 value="+v.high+"><input type=number id=n2 value="+v.high+"></div>"' +
'+"<div class=legend id=lg></div><div class=brands id=br></div>";' +
'["r1","n1","r2","n2"].forEach(function(id){document.getElementById(id).addEventListener("input",function(e){sync(id,e.target.value);});});' +
'draw();}' +
'function sync(id,val){var j=id.charAt(1),x=+val;document.getElementById("r"+j).value=x;document.getElementById("n"+j).value=x;' +
'var a=+document.getElementById("n1").value,b=+document.getElementById("n2").value;' +
'if(a>b){if(j=="1"){document.getElementById("r2").value=a;document.getElementById("n2").value=a;b=a;}else{document.getElementById("r1").value=b;document.getElementById("n1").value=b;a=b;}}' +
'V[cur]={low:a,high:b};draw();}' +
'function draw(){var d=D[cur],v=V[cur],NB=42,rg=(d.max-d.min)||1,bk=new Array(NB),mx=1;' +
'for(var i=0;i<NB;i++)bk[i]={n:0,g:d.min+rg*(i+0.5)/NB};' +
'd.items.forEach(function(x){var k=Math.min(NB-1,Math.floor((x.gia-d.min)/rg*NB));bk[k].n++;if(bk[k].n>mx)mx=bk[k].n;});' +
'var h=document.getElementById("hist");h.innerHTML="";' +
'bk.forEach(function(b){var e=document.createElement("div");e.style.height=Math.max(2,b.n/mx*108)+"px";' +
'var t=tier(b.g,v);e.style.background=t==2?CH:(t==1?CM:CL);e.title=fmt(Math.round(b.g))+" ₫ — "+b.n+" nhãn hiệu";h.appendChild(e);});' +
'var c=[0,0,0];d.items.forEach(function(x){c[tier(x.gia,v)]++;});var T=d.items.length||1;' +
'document.getElementById("lg").innerHTML=' +
'"<div class=lg style=\\"background:"+CL+";color:"+CLF+"\\"><b>"+c[0]+"</b><span>THẤP · "+Math.round(c[0]/T*100)+"% · &lt; "+fmt(v.low)+"</span></div>"' +
'+"<div class=lg style=\\"background:"+CM+";color:"+CMF+"\\"><b>"+c[1]+"</b><span>TRUNG BÌNH · "+Math.round(c[1]/T*100)+"% · "+fmt(v.low)+"–"+fmt(v.high)+"</span></div>"' +
'+"<div class=lg style=\\"background:"+CH+";color:"+CHF+"\\"><b>"+c[2]+"</b><span>CAO · "+Math.round(c[2]/T*100)+"% · ≥ "+fmt(v.high)+"</span></div>";' +
'var srt=d.items.slice().sort(function(a,b){return b.gia-a.gia;});' +
'document.getElementById("br").innerHTML=srt.map(function(x){var t=tier(x.gia,v);' +
'var bg=t==2?CH:(t==1?CM:CL),fg=t==2?CHF:(t==1?CMF:CLF);' +
'return "<span class=chip style=\\"background:"+bg+";color:"+fg+"\\">"+(x.hang?x.hang+" · ":"")+x.brand+" <u>"+fmt(x.gia)+"</u></span>";}).join("");' +
'document.getElementById("hint").textContent="Đang chỉnh: "+d.lv2+"  ·  các loại khác vẫn giữ ngưỡng riêng";}' +
'function resetAll(){D.forEach(function(d,i){V[i]={low:d.p33,high:d.p67};});body();}' +
'function save(){var o={};D.forEach(function(d,i){o[d.lv2]={low:V[i].low,high:V[i].high};});' +
'var b=document.getElementById("btnok");b.disabled=true;b.textContent="Đang áp dụng…";' +
'google.script.run.withFailureHandler(function(e){b.disabled=false;b.textContent="Xác nhận & áp dụng";alert("Lỗi: "+e.message);})' +
'.withSuccessHandler(function(){google.script.host.close();}).luuNguongGiaTuDialog(o);}' +
'tabs();body();</script></body></html>';
}

/* ==================================================================
 * PHẦN 3 — DASHBOARD
 * ================================================================== */

var DASH = {
  F_YEAR: 'C4', F_BRAND: 'F4', F_TYPE: 'I4', F_CAPS: 'L4'
};

var UI = {
  ROW_PX: 21, COL_PX: 108,
  C1: 2, C2: 22,          // vùng nội dung: cột B → V
  N_TB : 25,              // số dòng bảng chính
  N_SEG: 15,              // số dòng bảng segmentation
  N_CP : 40               // số dòng bảng "So sánh đối thủ cùng phân khúc"
};

/** Bố cục dòng — tính một lần, dùng cho cả lúc dựng lẫn lúc đọc. */
function _layout() {
  var L = {}, px = function (p) { return Math.ceil(p / UI.ROW_PX); };
  L.OV_T = 7;  L.OV = 8;
  L.TR_T = 14; L.TR = 15; L.TR_H = 360;  L.TR_E = L.TR + px(L.TR_H) - 1;
  L.TR_N = L.TR_E + 1;                   // 2 dòng ghi chú: năm chưa đủ + ngoại suy demand
  L.TB_T = L.TR_N + 4; L.TB_S = L.TB_T + 1; L.TB_H = L.TB_T + 2;
  L.TB   = L.TB_H + 1; L.TB_E = L.TB + UI.N_TB - 1; L.TB_TOT = L.TB_E + 1;
  L.PI_T = L.TB_TOT + 3; L.PI = L.PI_T + 1; L.PI_H = 560; L.PI_E = L.PI + px(L.PI_H) - 1;
  L.SG_T = L.PI_E + 3; L.SG_S = L.SG_T + 1; L.SG_H = L.SG_T + 2;
  L.SG   = L.SG_H + 2; L.SG_E = L.SG + UI.N_SEG - 1;
  L.TP_T = L.SG_E + 3; L.TP = L.TP_T + 1; L.TP_H = 520; L.TP_E = L.TP + px(L.TP_H) - 1;
  // ⬇ MỚI — bảng So sánh đối thủ cùng phân khúc, đặt NGAY TRƯỚC phần NOTE
  L.CP_T = L.TP_E + 3; L.CP_S = L.CP_T + 1; L.CP_HD = L.CP_T + 2;
  L.CP   = L.CP_HD + 1; L.CP_E = L.CP + UI.N_CP - 1;
  L.NT_T = L.CP_E + 3; L.NT = L.NT_T + 1; L.NT_E = L.NT + 2;
  L.CC_T = L.NT_E + 3; L.CC = L.CC_T + 1; L.CC_H = 460; L.CC_E = L.CC + px(L.CC_H) - 1;
  L.FT   = L.CC_E + 3;
  L.LAST = L.FT + 2;
  return L;
}

/* ---------- tiện ích tên vùng trong công thức ---------- */
function _q(ten) { return "'" + String(ten).replace(/'/g, "''") + "'"; }
function _abs(a1) { return '$' + String(a1).replace(/(\d+)/, '$$$1'); }
function _colA1(sh, letter, firstRow) { return _q(sh) + '!$' + letter + '$' + firstRow + ':$' + letter; }

/* ==================================================================
 * SHEET ẨN 1 — _DashSrc
 * ================================================================== */

function _dungDashSrc(ss) {
  var td = _sheet(ss, CFG.DATA.SHEET);
  var colNam = _chuCot(_doCot(td, CFG.DATA.HDR_YEAR, 'Năm'));
  var colHang = _chuCot(_cotHang(td));
  // Ngày đăng ký: ưu tiên chữ cái khai trong CFG, không có thì dò theo tiêu đề.
  // Thiếu hẳn cột này thì vẫn chạy được — chỉ mất phần ghi chú năm chưa đủ.
  var colNgay = '';
  try { colNgay = CFG.DATA.DATE ? CFG.DATA.DATE : _chuCot(_doCot(td, CFG.DATA.HDR_DATE, 'Ngày đăng ký')); }
  catch (eN) { colNgay = ''; }
  var R = CFG.DATA.FIRST_ROW;
  var T = _q(CFG.DATA.SHEET) + '!';
  var c = function (L) { return T + '$' + L + '$' + R + ':$' + L; };

  var s = ss.getSheetByName(CFG.DASH.SRC);
  if (!s) s = ss.insertSheet(CFG.DASH.SRC);
  s.clear();
  var can = Math.max(td.getLastRow() + 50, 1000);
  if (s.getMaxRows() < can) s.insertRowsAfter(s.getMaxRows(), can - s.getMaxRows());
  if (s.getMaxColumns() < 22) s.insertColumnsAfter(s.getMaxColumns(), 22 - s.getMaxColumns());

  s.getRange(1, 1, 1, 19).setValues([[
    'Năm', 'Tên hãng', 'Nhãn hiệu', 'Chủng loại', 'PCS', 'Trị giá USD', 'Phân khúc', 'Giá VNĐ',
    'cờ: bộ lọc đầy đủ', 'cờ: bỏ lọc Hãng', 'cờ: bỏ lọc Năm',
    'PCS×cờ', 'USD×cờ', 'khóa Hãng|Loại', 'PCS×cờ(bỏ Hãng)', 'USD×cờ(bỏ Hãng)',
    'khóa NH|Loại', 'khóa Hãng|Phân khúc', 'PCS×cờ(bỏ Năm)'
  ]]);

  // Năm: ô có thể là số 2024, hoặc là Date (số sê-ri > 3000) → quy về số năm.
  // Ô Năm TRỐNG thì suy ra từ Ngày đăng ký — nhờ vậy dòng thiếu Năm không bị rơi
  // khỏi biểu đồ xu hướng nữa.
  var namGoc = 'IF(ISNUMBER(' + c(colNam) + '),IF(' + c(colNam) + '>3000,YEAR(' + c(colNam) + '),' + c(colNam) + '),' +
               'IFERROR(VALUE(REGEXEXTRACT(TO_TEXT(' + c(colNam) + '),"\\d{4}")),""))';
  var namPhu = colNgay ? 'IF(ISNUMBER(' + c(colNgay) + '),YEAR(' + c(colNgay) + '),"")' : '""';
  var nam = 'ARRAYFORMULA(IF(' + c(colNam) + '="",' + namPhu + ',' + namGoc + '))';

  s.getRange('A2').setFormula(
    '=IFERROR(FILTER({' + nam + ',' + c(colHang) + ',' + c(CFG.DATA.OUT_BRAND) + ',' +
    c(CFG.DATA.OUT_LV2) + ',' + c(CFG.DATA.OUT_PCS) + ',' + c(CFG.DATA.OUT_VALUE) + ',' +
    c(CFG.DATA.OUT_TIER) + ',' + c(CFG.DATA.OUT_PRICE_V) + '},' +
    '(LOWER(TRIM(' + c(CFG.DATA.LV1) + '))="' + CFG.LEVEL1_FLAG + '")*(' + c(CFG.DATA.OUT_BRAND) + '<>"")),"")');

  var D = _q(CFG.DASH.SHEET) + '!';
  var A = '$A$2:$A', B = '$B$2:$B', Dl = '$D$2:$D';
  var fY = D + _abs(DASH.F_YEAR), fB = D + _abs(DASH.F_BRAND),
      fT = D + _abs(DASH.F_TYPE),  fC = D + _abs(DASH.F_CAPS);
  var yOK = 'IF(' + fY + '="Tất cả",1,--(' + A + '=IFERROR(VALUE(' + fY + '),-1)))';
  var hOK = 'IF(' + fB + '="Tất cả",1,--(' + B + '=' + fB + '))';
  var tOK = 'IF(' + fT + '="Tất cả",1,--(' + Dl + '=' + fT + '))';
  var cOK = 'IF(' + fC + '="Loại trừ Capsules",--(' + Dl + '<>"Capsules"),' +
            'IF(' + fC + '="Chỉ tính Capsules",--(' + Dl + '="Capsules"),1))';
  var blank = 'IF(' + B + '="","",';

  s.getRange('I2').setFormula('=ARRAYFORMULA({' +
    blank + yOK + '*' + hOK + '*' + tOK + '*' + cOK + '),' +
    blank + yOK + '*' + tOK + '*' + cOK + '),' +
    blank + hOK + '*' + tOK + '*' + cOK + ')})');

  s.getRange('L2').setFormula('=ARRAYFORMULA({' +
    blank + '$E$2:$E*$I$2:$I),' +
    blank + '$F$2:$F*$I$2:$I),' +
    blank + '$B$2:$B&"|"&$D$2:$D),' +
    blank + '$E$2:$E*$J$2:$J),' +
    blank + '$F$2:$F*$J$2:$J),' +
    blank + '$C$2:$C&"|"&$D$2:$D),' +
    blank + '$B$2:$B&"|"&$G$2:$G),' +
    blank + '$E$2:$E*$K$2:$K)})');

  /* Cột T — Ngày đăng ký.
     Dùng ĐÚNG điều kiện FILTER như khối A2 nên số dòng bằng nhau và thẳng hàng
     tuyệt đối; không ghép chung vào khối A2 được vì khối đó đã kín A→H. */
  s.getRange(1, 20).setValue('Ngày đăng ký');
  if (colNgay) {
    s.getRange('T2').setFormula(
      '=IFERROR(FILTER(' + c(colNgay) + ',' +
      '(LOWER(TRIM(' + c(CFG.DATA.LV1) + '))="' + CFG.LEVEL1_FLAG + '")*(' + c(CFG.DATA.OUT_BRAND) + '<>"")),"")');
    s.getRange(2, 20, s.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy');
  }

  _headerStyle(s.getRange(1, 1, 1, 20));
  s.setFrozenRows(1);
  try { s.hideSheet(); } catch (e) {}
  return s;
}

/* ==================================================================
 * SHEET ẨN 2 — _DashCalc
 * ================================================================== */

var CAL = {
  TREND: 'A',            // A:C  Năm | PCS | USD
  PIE_Q: 'E',            // E:F  nhãn | PCS
  PIE_V: 'H',            // H:I  nhãn | USD
  TIER : 'K',            // K:L  phân khúc | PCS
  TIERV: 'N',            // N:O  phân khúc | USD
  CC   : ['Q', 'T', 'W'],
  UK4  : 'AA',
  UK3  : 'AC',
  UK2  : 'AE',
  TB_A : 'AG',
  TB_B : 'AU',
  SG_A : 'BI',
  SG_B : 'CC',
  GH_Q : 'CM', GH_V : 'CP',
  GH_CC: ['CS', 'CV', 'CY'],
  NH_Q : 'DB', NH_V : 'DD',
  DS   : 'DF', DS_B : 'DI', TEN : 'DL', TEN_H : 'DN',
  // ⬇ MỚI — khối tính cho bảng "So sánh đối thủ cùng phân khúc"
  CP_PAIR: 'DP',         // 1 cột  — các nhóm (Chủng loại|Phân khúc) hãng đang chọn có mặt
  CP_RAW : 'DR',         // 5 cột  — toàn thị trường gom theo Loại × Phân khúc × Hãng
  CP_HELP: 'DX',         // 6 cột  — khóa nhóm | hạng | %SL | %GT | thứ tự loại | thứ tự phân khúc
  CP_OUT : 'EE',         // 9 cột  — kết quả đã lọc + sắp xếp (dashboard đọc 7 cột đầu)
  NGAY   : 'EO'          // 2 cột  — mốc thời gian dữ liệu (nhãn | giá trị)
};

var PIE_TOP = 12;
var CP_RAW_ROWS = 400;   // trần số tổ hợp (Loại × Phân khúc × Hãng) đọc vào

function _kiemTraCAL() {
  var khoi = [
    ['TB_A', CAL.TB_A, _wTB()], ['TB_B', CAL.TB_B, _wTB()],
    ['SG_A', CAL.SG_A, _wSG()], ['SG_B', CAL.SG_B, 8],
    ['GH_Q', CAL.GH_Q, 2], ['GH_V', CAL.GH_V, 2],
    ['NH_Q', CAL.NH_Q, 1], ['NH_V', CAL.NH_V, 1],
    ['DS', CAL.DS, 2], ['DS_B', CAL.DS_B, 2], ['TEN', CAL.TEN, 1], ['TEN_H', CAL.TEN_H, 1],
    ['CP_PAIR', CAL.CP_PAIR, 1], ['CP_RAW', CAL.CP_RAW, 5],
    ['CP_HELP', CAL.CP_HELP, 6], ['CP_OUT', CAL.CP_OUT, 9],
    ['NGAY', CAL.NGAY, 2]
  ].concat(CAL.GH_CC.map(function (c, i) { return ['GH_CC' + (i + 1), c, 2]; }))
   .sort(function (a, b) { return _idx(a[1]) - _idx(b[1]); });
  for (var i = 0; i < khoi.length - 1; i++) {
    var het = _idx(khoi[i][1]) + khoi[i][2] - 1;
    var keTiep = _idx(khoi[i + 1][1]);
    if (het >= keTiep) {
      throw new Error('Bố trí _DashCalc bị chồng: khối ' + khoi[i][0] + ' rộng ' + khoi[i][2] +
        ' cột (tới ' + _chuCot(het) + ') đè lên ' + khoi[i + 1][0] + ' ở ' + khoi[i + 1][1] +
        '. Hãy dời mốc cột trong CAL cho thưa ra.');
    }
  }
  return _idx(khoi[khoi.length - 1][1]) + khoi[khoi.length - 1][2] + 4;
}

function _dungDashCalc(ss) {
  var canCot = _kiemTraCAL();
  var s = ss.getSheetByName(CFG.DASH.CALC);
  if (!s) s = ss.insertSheet(CFG.DASH.CALC);
  s.clear();
  if (s.getMaxColumns() < canCot) s.insertColumnsAfter(s.getMaxColumns(), canCot - s.getMaxColumns());
  if (s.getMaxRows() < CP_RAW_ROWS + 20) s.insertRowsAfter(s.getMaxRows(), CP_RAW_ROWS + 20 - s.getMaxRows());

  var S = _q(CFG.DASH.SRC) + '!';
  var col = function (L) { return S + '$' + L + '$2:$' + L; };
  var A = col('A'), B = col('B'), C = col('C'), Dd = col('D'), E = col('E'), F = col('F'),
      G = col('G'), H = col('H'), I = col('I'), J = col('J'), K = col('K'),
      L = col('L'), M = col('M'), N = col('N'), O = col('O'), P = col('P'),
      Q = col('Q'), R = col('R'), T = col('T');
  var D = _q(CFG.DASH.SHEET) + '!';
  var laTat = D + _abs(DASH.F_BRAND) + '="Tất cả"';
  var TL = [CFG.TIER_LABELS.HIGH, CFG.TIER_LABELS.MID, CFG.TIER_LABELS.LOW];

  var set = function (a1, f) { s.getRange(a1).setFormula(f); };

  /* --- Xu hướng theo năm --- */
  set(CAL.TREND + '1',
    '=IFERROR(QUERY(FILTER({' + A + ',' + E + ',' + F + '},' + K + '=1),' +
    '"select Col1, sum(Col2), sum(Col3) where Col1 is not null group by Col1 order by Col1 ' +
    'label Col1 \'Năm\', sum(Col2) \'Số lượng (pcs)\', sum(Col3) \'Trị giá (USD)\'",0),"")');

  var vietTat = function (cotSo) {
    var v = '$' + cotSo + '$2:$' + cotSo + '$20';
    return '=ARRAYFORMULA(IF(' + v + '="","",' +
      'IF(' + v + '>=1000000,TEXT(' + v + '/1000000,"0.00")&"M",' +
      'IF(' + v + '>=1000,TEXT(' + v + '/1000,"0")&"k",TEXT(' + v + ',"0")))))';
  };
  set(CAL.NH_Q + '1', '="nhãn"');
  set(CAL.NH_Q + '2', vietTat(_chuCot(_idx(CAL.TREND) + 1)));
  set(CAL.NH_V + '1', '="nhãn"');
  set(CAL.NH_V + '2', vietTat(_chuCot(_idx(CAL.TREND) + 2)));

  /* --- Danh sách chuẩn cho biểu đồ tròn --- */
  set(CAL.DS + '1', '=IFERROR(QUERY(FILTER({' + B + ',' + P + '},' + J + '=1),' +
    '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit ' + PIE_TOP +
    ' label Col1 \'Hãng\', sum(Col2) \'x\'",0),"")');
  set(CAL.DS_B + '1', '=IFERROR(QUERY(FILTER({' + C + ',' + F + '},' + I + '=1),' +
    '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit ' + PIE_TOP +
    ' label Col1 \'Nhãn hiệu\', sum(Col2) \'x\'",0),"")');

  var dsTen  = '$' + CAL.DS   + '$2:$' + CAL.DS   + '$' + (PIE_TOP + 1);
  var dsTenB = '$' + CAL.DS_B + '$2:$' + CAL.DS_B + '$' + (PIE_TOP + 1);
  var uuMani = function (v) {
    return 'ARRAYFORMULA(IF(' + v + '="",2,IF(REGEXMATCH(UPPER(' + v + '&""),"^MANI"),0,1)))';
  };
  set(CAL.TEN_H + '1', '="Hãng"');
  set(CAL.TEN_H + '2', '=IFERROR(SORT(' + dsTen + ',' + uuMani(dsTen) + ',TRUE),"")');
  set(CAL.TEN + '1', '=IF(' + laTat + ',"Hãng","Nhãn hiệu")');
  set(CAL.TEN + '2', '=IFERROR(IF(' + laTat + ',SORT(' + dsTen + ',' + uuMani(dsTen) + ',TRUE),' +
    'SORT(' + dsTenB + ',' + uuMani(dsTenB) + ',TRUE)),"")');

  var TEN   = '$' + CAL.TEN   + '$2:$' + CAL.TEN   + '$' + (PIE_TOP + 1);
  var TEN_H = '$' + CAL.TEN_H + '$2:$' + CAL.TEN_H + '$' + (PIE_TOP + 1);

  var khoiPie = function (dich, cotTen, vungTen, tieuDe, bieuThuc) {
    var d2 = _chuCot(_idx(dich) + 1);
    set(dich + '1', '=' + cotTen + '1');
    set(d2 + '1', '="' + tieuDe + '"');
    set(dich + '2', '=IFERROR(ARRAYFORMULA(IF(' + vungTen + '="","",' + vungTen + ')),"")');
    set(d2 + '2', '=IFERROR(ARRAYFORMULA(IF(' + vungTen + '="","",' + bieuThuc + ')),"")');
  };

  var pie = function (cotNhan, cotSo, nhanTat, nhanHang) {
    var q = function (nhan, lbl, tenSo) {
      return 'QUERY(FILTER({' + nhan + ',' + cotSo + '},' + I + '=1),' +
        '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit ' + PIE_TOP +
        ' label Col1 \'' + lbl + '\', sum(Col2) \'' + tenSo + '\'",0)';
    };
    return '=IFERROR(IF(' + laTat + ',' + q(B, 'Hãng', nhanTat) + ',' + q(C, 'Nhãn hiệu', nhanHang) + '),"")';
  };
  set(CAL.PIE_Q + '1', pie('B', E, 'PCS', 'PCS'));
  set(CAL.PIE_V + '1', pie('B', F, 'USD', 'USD'));
  var khac = function (c1, c2, tongCot) {
    set(c1 + '14', '=IF(SUM(' + tongCot + ')-SUM(' + c2 + '2:' + c2 + '13)>0.5,"Khác (ngoài Top ' + PIE_TOP + ')","")');
    set(c2 + '14', '=IF(' + c1 + '14="","",SUM(' + tongCot + ')-SUM(' + c2 + '2:' + c2 + '13))');
  };
  khac(CAL.PIE_Q, 'F', L);
  khac(CAL.PIE_V, 'I', M);

  _ghi(s, 1, _idx(CAL.TIER), [['Phân khúc', 'PCS', '', 'Phân khúc', 'USD']]);
  TL.forEach(function (t, i) {
    s.getRange(CAL.TIER + (i + 2)).setValue(t);
    set('L' + (i + 2), '=SUMIF(' + G + ',$K$' + (i + 2) + ',' + L + ')');
    s.getRange(CAL.TIERV + (i + 2)).setValue(t);
    set('O' + (i + 2), '=SUMIF(' + G + ',$N$' + (i + 2) + ',' + M + ')');
  });

  CAL.CC.forEach(function (c, i) {
    var c2 = _chuCot(_idx(c) + 1);
    set(c + '1', '=IFERROR(QUERY(FILTER({' + B + ',' + P + '},(' + J + '=1)*(' + G + '="' + TL[i] + '")),' +
      '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit ' + PIE_TOP +
      ' label Col1 \'Hãng\', sum(Col2) \'Giá trị\'",0),"")');
    set(c + '14', '=IF(SUMIF(' + G + ',"' + TL[i] + '",' + P + ')-SUM(' + c2 + '2:' + c2 + '13)>0.5,"Khác","")');
    set(c2 + '14', '=IF(' + c + '14="","",SUMIF(' + G + ',"' + TL[i] + '",' + P + ')-SUM(' + c2 + '2:' + c2 + '13))');
  });

  khoiPie(CAL.GH_Q, CAL.TEN, TEN, 'PCS',
    'IF(' + laTat + ',SUMIF(' + B + ',' + TEN + ',' + L + '),SUMIF(' + C + ',' + TEN + ',' + L + '))');
  khoiPie(CAL.GH_V, CAL.TEN, TEN, 'USD',
    'IF(' + laTat + ',SUMIF(' + B + ',' + TEN + ',' + M + '),SUMIF(' + C + ',' + TEN + ',' + M + '))');
  CAL.GH_CC.forEach(function (d, i) {
    khoiPie(d, CAL.TEN_H, TEN_H, 'USD', 'SUMIF(' + R + ',' + TEN_H + '&"|' + TL[i] + '",' + P + ')');
  });

  set(CAL.UK4 + '1', '=IFERROR(UNIQUE(FILTER(' + B + '&"|"&' + C + '&"|"&' + Dd + '&"|"&' + G + ',' + I + '=1)),"")');
  set(CAL.UK3 + '1', '=IFERROR(UNIQUE(FILTER(' + B + '&"|"&' + C + '&"|"&' + Dd + ',' + I + '=1)),"")');
  set(CAL.UK2 + '1', '=IFERROR(UNIQUE(FILTER(' + B + '&"|"&' + C + ',' + I + '=1)),"")');

  var u4 = '$' + CAL.UK4 + '$1:$' + CAL.UK4,
      u3 = '$' + CAL.UK3 + '$1:$' + CAL.UK3,
      u2 = '$' + CAL.UK2 + '$1:$' + CAL.UK2;

  /* --- Bảng chính, chế độ TOÀN THỊ TRƯỜNG --- */
  var hangArr = 'IFERROR(INDEX(QUERY(FILTER({' + B + ',' + E + '},' + I + '=1),' +
                '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit ' + UI.N_TB +
                ' label Col1 \'Hãng\', sum(Col2) \'PCS\'",0),0,1),"")';
  var hA = '$' + CAL.TB_A + '$2:$' + CAL.TB_A + '$' + (UI.N_TB + 1);
  set(CAL.TB_A + '1', '=' + hangArr);
  var sumLoai = function (ten) { return 'ARRAYFORMULA(IF(' + hA + '="","",SUMIF(' + N + ',' + hA + '&"|' + ten + '",' + L + ')))'; };
  var tbA = _chuCot(_idx(CAL.TB_A) + 1);
  set(tbA + '2', '=IFERROR({' +
    'ARRAYFORMULA(IF(' + hA + '="","",COUNTIF(' + u2 + ',' + hA + '&"|*"))),' +
    LV2_ORDER.map(sumLoai).join(',') + ',' +
    'ARRAYFORMULA(IF(' + hA + '="","",SUMIF(' + B + ',' + hA + ',' + L + '))),' +
    'ARRAYFORMULA(IF(' + hA + '="","",SUMIF(' + B + ',' + hA + ',' + L + ')/IF(SUM(' + L + ')=0,1,SUM(' + L + ')))),' +
    'ARRAYFORMULA(IF(' + hA + '="","",SUMIF(' + B + ',' + hA + ',' + M + '))),' +
    'ARRAYFORMULA(IF(' + hA + '="","",SUMIF(' + B + ',' + hA + ',' + M + ')/IF(SUM(' + M + ')=0,1,SUM(' + M + '))))},"")');

  /* --- Bảng chính, chế độ SOI HÃNG --- */
  set(CAL.TB_B + '1', '=IFERROR(QUERY(FILTER({' + C + ',' + Dd + ',' + E + ',' + H + ',' + F + '},' + I + '=1),' +
    '"select Col1, Col2, sum(Col3), max(Col4), sum(Col5) group by Col1, Col2 ' +
    'order by sum(Col3) desc limit ' + UI.N_TB + ' label Col1 \'Nhãn hiệu\', Col2 \'Chủng loại\', sum(Col3) \'PCS\', max(Col4) \'Giá\', sum(Col5) \'USD\'",0),"")');
  var bB = _chuCot(_idx(CAL.TB_B) + 5);
  var qB = '$' + CAL.TB_B + '$2:$' + CAL.TB_B + '$' + (UI.N_TB + 1);
  var pcsB = '$' + _chuCot(_idx(CAL.TB_B) + 2) + '$2:$' + _chuCot(_idx(CAL.TB_B) + 2) + '$' + (UI.N_TB + 1);
  var usdB = '$' + _chuCot(_idx(CAL.TB_B) + 4) + '$2:$' + _chuCot(_idx(CAL.TB_B) + 4) + '$' + (UI.N_TB + 1);
  set(bB + '2', '=IFERROR({' +
    'ARRAYFORMULA(IF(' + qB + '="","",' + pcsB + '/IF(SUM(' + L + ')=0,1,SUM(' + L + ')))),' +
    'ARRAYFORMULA(IF(' + qB + '="","",' + usdB + '/IF(SUM(' + M + ')=0,1,SUM(' + M + '))))},"")');

  /* --- Segmentation, chế độ TOÀN THỊ TRƯỜNG --- */
  set(CAL.SG_A + '1', '=IFERROR(INDEX(QUERY(FILTER({' + B + ',' + F + '},' + I + '=1),' +
    '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit ' + UI.N_SEG +
    ' label Col1 \'Hãng\', sum(Col2) \'Trị giá\'",0),0,1),"")');
  var sA = '$' + CAL.SG_A + '$2:$' + CAL.SG_A + '$' + (UI.N_SEG + 1);
  var parts = [];
  LV2_ORDER.forEach(function (lv) {
    TL.forEach(function (t) {
      parts.push('ARRAYFORMULA(IF(' + sA + '="","",IFERROR(' +
        'COUNTIF(' + u4 + ',' + sA + '&"|*|' + lv + '|' + t + '")/' +
        'COUNTIF(' + u3 + ',' + sA + '&"|*|' + lv + '"),"")))');
    });
  });
  set(_chuCot(_idx(CAL.SG_A) + 1) + '2', '=IFERROR({' + parts.join(',') + '},"")');

  /* --- Segmentation, chế độ SOI HÃNG --- */
  set(CAL.SG_B + '1', '=IFERROR(QUERY(FILTER({' + C + ',' + Dd + ',' + G + ',' + H + ',' + E + ',' + F + '},(' + I + '=1)*(' + G + '<>"")),' +
    '"select Col1, Col2, Col3, max(Col4), sum(Col5), sum(Col6) group by Col1, Col2, Col3 ' +
    'order by sum(Col6) desc limit ' + UI.N_SEG + ' label Col1 \'Nhãn hiệu\', Col2 \'Chủng loại\', Col3 \'Phân khúc\', max(Col4) \'Giá\', sum(Col5) \'PCS\', sum(Col6) \'USD\'",0),"")');
  var tierB = '$' + _chuCot(_idx(CAL.SG_B) + 2) + '$2:$' + _chuCot(_idx(CAL.SG_B) + 2) + '$' + (UI.N_SEG + 1);
  var pQ = '$' + _chuCot(_idx(CAL.SG_B) + 4) + '$2:$' + _chuCot(_idx(CAL.SG_B) + 4) + '$' + (UI.N_SEG + 1);
  var pV = '$' + _chuCot(_idx(CAL.SG_B) + 5) + '$2:$' + _chuCot(_idx(CAL.SG_B) + 5) + '$' + (UI.N_SEG + 1);
  set(_chuCot(_idx(CAL.SG_B) + 6) + '2', '=IFERROR({' +
    'ARRAYFORMULA(IF(' + tierB + '="","",' + pQ + '/IF(SUMIF(' + G + ',' + tierB + ',' + O + ')=0,1,SUMIF(' + G + ',' + tierB + ',' + O + ')))),' +
    'ARRAYFORMULA(IF(' + tierB + '="","",' + pV + '/IF(SUMIF(' + G + ',' + tierB + ',' + P + ')=0,1,SUMIF(' + G + ',' + tierB + ',' + P + '))))},"")');

  /* ==================================================================
   * SO SÁNH ĐỐI THỦ CÙNG PHÂN KHÚC  (chỉ tính khi đã chọn 1 hãng)
   * ------------------------------------------------------------------
   * CP_PAIR : các nhóm "Chủng loại|Phân khúc" mà HÃNG ĐANG CHỌN có hàng
   *           (cờ I = bộ lọc đầy đủ, tức đã lọc theo hãng).
   * CP_RAW  : TOÀN THỊ TRƯỜNG gom theo Loại × Phân khúc × Hãng
   *           (cờ J = bỏ lọc Hãng, vẫn giữ lọc Năm/Loại/Capsules).
   * CP_HELP : khóa nhóm, hạng trong nhóm, %SL, %GT, thứ tự loại, thứ tự phân khúc.
   * CP_OUT  : lọc còn các nhóm hãng đang chọn có mặt + Top ' + TOP_CP + ' mỗi nhóm,
   *           sắp Loại → Phân khúc → %SL giảm dần.
   * Khi bộ lọc Hãng = "Tất cả" thì mọi khối trả về rỗng ⇒ không tốn tính toán.
   * ================================================================== */
  var nR = CP_RAW_ROWS;
  var vung = function (letter) { return '$' + letter + '$2:$' + letter + '$' + (nR + 1); };
  var cRaw = function (k) { return _chuCot(_idx(CAL.CP_RAW) + k); };
  var cHlp = function (k) { return _chuCot(_idx(CAL.CP_HELP) + k); };

  var rL = vung(cRaw(0)), rT = vung(cRaw(1)), rH = vung(cRaw(2)),
      rQ = vung(cRaw(3)), rV = vung(cRaw(4));
  var hGK = vung(cHlp(0)), hRK = vung(cHlp(1)), hPQ = vung(cHlp(2)),
      hPV = vung(cHlp(3)), hOL = vung(cHlp(4)), hOT = vung(cHlp(5));
  var pairs = '$' + CAL.CP_PAIR + '$2:$' + CAL.CP_PAIR;

  set(CAL.CP_PAIR + '1', '="Nhóm (Loại|Phân khúc) hãng đang chọn có mặt"');
  set(CAL.CP_PAIR + '2', '=IF(' + laTat + ',"",IFERROR(UNIQUE(FILTER(' +
    Dd + '&"|"&' + G + ',(' + I + '=1)*(' + G + '<>"")*(' + E + '>0))),""))');

  // ⚠ QUERY LUÔN tự sinh 1 dòng tiêu đề. Vì vậy công thức phải đặt ở DÒNG 1 để
  // dữ liệu rơi đúng từ DÒNG 2 — đúng như vùng rL/rT/rH/rQ/rV bên dưới tham chiếu.
  // Đặt ở dòng 2 sẽ làm mọi số liệu lệch xuống 1 dòng và bảng ra sai.
  set(CAL.CP_RAW + '1', '=IF(' + laTat + ',"",IFERROR(QUERY(FILTER({' +
    Dd + ',' + G + ',' + B + ',' + E + ',' + F + '},(' + J + '=1)*(' + G + '<>"")*(' + E + '>0)),' +
    '"select Col1, Col2, Col3, sum(Col4), sum(Col5) group by Col1, Col2, Col3 ' +
    'order by sum(Col4) desc limit ' + nR +
    ' label Col1 \'Chủng loại\', Col2 \'Phân khúc\', Col3 \'Hãng\', sum(Col4) \'PCS\', sum(Col5) \'USD\'",0),""))');

  var trong = 'IF(' + rL + '="","",';
  _ghi(s, 1, _idx(CAL.CP_HELP), [['khóa nhóm', 'hạng', '% SL', '% GT', 'tt Loại', 'tt Phân khúc']]);
  set(cHlp(0) + '2', '=ARRAYFORMULA(' + trong + rL + '&"|"&' + rT + '))');
  set(cHlp(1) + '2', '=ARRAYFORMULA(' + trong + 'COUNTIFS(' + hGK + ',' + hGK + ',' + rQ + ',">"&' + rQ + ')+1))');
  set(cHlp(2) + '2', '=ARRAYFORMULA(' + trong + 'IFERROR(' + rQ + '/SUMIF(' + hGK + ',' + hGK + ',' + rQ + '),0)))');
  set(cHlp(3) + '2', '=ARRAYFORMULA(' + trong + 'IFERROR(' + rV + '/SUMIF(' + hGK + ',' + hGK + ',' + rV + '),0)))');
  var dsLoai = '{' + LV2_ORDER.map(function (l) { return '"' + l + '"'; }).join(';') + '}';
  var dsTier = '{' + TL.map(function (t) { return '"' + t + '"'; }).join(';') + '}';
  set(cHlp(4) + '2', '=ARRAYFORMULA(' + trong + 'IFERROR(MATCH(' + rL + ',' + dsLoai + ',0),99)))');
  set(cHlp(5) + '2', '=ARRAYFORMULA(' + trong + 'IFERROR(MATCH(' + rT + ',' + dsTier + ',0),99)))');

  _ghi(s, 1, _idx(CAL.CP_OUT), [['Chủng loại', 'Phân khúc giá', 'Tên hãng', 'SL (pcs)',
                                 '% SL trong nhóm', 'Giá trị (USD)', '% GT trong nhóm',
                                 'tt Loại', 'tt Phân khúc']]);
  set(CAL.CP_OUT + '2', '=IFERROR(SORT(FILTER({' +
    rL + ',' + rT + ',' + rH + ',' + rQ + ',' + hPQ + ',' + rV + ',' + hPV + ',' + hOL + ',' + hOT + '},' +
    '(' + rL + '<>"")*(COUNTIF(' + pairs + ',' + hGK + ')>0)*(' + hRK + '<=' + TOP_CP + ')),' +
    '8,TRUE,9,TRUE,5,FALSE),"")');

  /* ==================================================================
   * MỐC THỜI GIAN DỮ LIỆU (từ cột Ngày đăng ký)
   * ------------------------------------------------------------------
   * Đây là nền cho 2 việc: (1) CAGR chỉ được tính tới năm ĐỦ 12 THÁNG,
   * (2) ghi chú cảnh báo + ngoại suy demand cho năm còn dở.
   * KHÔNG chịu ảnh hưởng của bộ lọc — luôn là mốc thật của cả file, vì
   * nếu lọc năm 2024 thì "ngày mới nhất" hoá ra 31/12/2024 và ghi chú sai.
   * ================================================================== */
  var Tn = _q(CFG.DASH.SRC) + '!$T$2:$T';
  var nv = _chuCot(_idx(CAL.NGAY) + 1);
  _ghi(s, 1, _idx(CAL.NGAY), [['Mốc thời gian', 'Giá trị']]);
  [
    ['Ngày nhập khẩu mới nhất',           '=IFERROR(IF(MAX(' + Tn + ')>0,MAX(' + Tn + '),""),"")'],
    ['Ngày nhập khẩu sớm nhất',           '=IFERROR(MIN(FILTER(' + Tn + ',' + Tn + '>0)),"")'],
    ['Năm mới nhất',                      '=IFERROR(YEAR($' + nv + '$2),"")'],
    ['Số ngày đã có trong năm mới nhất',  '=IFERROR($' + nv + '$2-DATE($' + nv + '$4,1,1)+1,"")'],
    ['Tỉ lệ năm đã trôi qua',             '=IFERROR($' + nv + '$5/(DATE($' + nv + '$4+1,1,1)-DATE($' + nv + '$4,1,1)),"")'],
    ['Năm đủ 12 tháng gần nhất',          '=IFERROR(IF($' + nv + '$6>=0.999,$' + nv + '$4,$' + nv + '$4-1),"")']
  ].forEach(function (x, i) {
    s.getRange(i + 2, _idx(CAL.NGAY)).setValue(x[0]);
    s.getRange(i + 2, _idx(CAL.NGAY) + 1).setFormula(x[1]);
  });
  s.getRange(2, _idx(CAL.NGAY) + 1, 2, 1).setNumberFormat('dd/MM/yyyy');
  s.getRange(6, _idx(CAL.NGAY) + 1).setNumberFormat('0.0%');

  try { s.hideSheet(); } catch (e) {}
  return s;
}

/* ==================================================================
 * DỰNG SHEET DASHBOARD
 * ================================================================== */

function _ghi(sh, dong, cot, vals) {
  if (!vals || !vals.length || !vals[0].length) return;
  var nc = vals[0].length;
  for (var i = 1; i < vals.length; i++) {
    if (vals[i].length !== nc) {
      throw new Error('Dữ liệu ghi vào "' + sh.getName() + '" R' + dong + 'C' + cot +
        ' không đều: dòng 1 có ' + nc + ' cột, dòng ' + (i + 1) + ' có ' + vals[i].length + ' cột.');
    }
  }
  sh.getRange(dong, cot, vals.length, nc).setValues(vals);
}

function _buoc(ten, fn) {
  try {
    return fn();
  } catch (e) {
    var msg = 'BƯỚC HỎNG: ' + ten + '  →  ' + (e && e.message ? e.message : e);
    Logger.log(msg + '\n' + (e && e.stack ? e.stack : ''));
    try { PropertiesService.getDocumentProperties().setProperty('MMH_LOI_CUOI', msg); } catch (e2) {}
    throw new Error(msg);
  }
}

function soiDashCalc() {
  var ss = _ss(), c = ss.getSheetByName(CFG.DASH.CALC);
  if (!c) { SpreadsheetApp.getUi().alert('Chưa có sheet ' + CFG.DASH.CALC + ' — hãy dựng lại dashboard.'); return; }
  var sh = ss.getSheetByName(CFG.DASH.SHEET);

  var khoi = [
    ['TREND  xu hướng năm', CAL.TREND, 3],
    ['PIE_Q  cơ cấu SL', CAL.PIE_Q, 2],
    ['PIE_V  cơ cấu GT', CAL.PIE_V, 2],
    ['TIER   tỉ trọng phân khúc', CAL.TIER, 2],
    ['CC[0]  hãng trong phân khúc Cao', CAL.CC[0], 2],
    ['GH_Q   bản sao ghim MANI', CAL.GH_Q, 2],
    ['TB_A   bảng chính — Tất cả', CAL.TB_A, _wTB()],
    ['TB_B   bảng chính — soi hãng', CAL.TB_B, 7],
    ['SG_A   segmentation — Tất cả', CAL.SG_A, _wSG()],
    ['SG_B   segmentation — soi hãng', CAL.SG_B, 8],
    ['CP_PAIR nhóm của hãng đang chọn', CAL.CP_PAIR, 1],
    ['CP_RAW  toàn thị trường theo nhóm', CAL.CP_RAW, 5],
    ['CP_OUT  BẢNG SO SÁNH ĐỐI THỦ', CAL.CP_OUT, 7]
  ];

  var out = ['PHIÊN BẢN SCRIPT: ' + SCRIPT_VER,
             'Bộ lọc Hãng đang chọn: "' + (sh ? sh.getRange(DASH.F_BRAND).getValue() : '?') + '"',
             'Số cột hiện có của ' + CFG.DASH.CALC + ': ' + c.getMaxColumns(), ''];
  khoi.forEach(function (k) {
    var v = c.getRange(1, _idx(k[1]), 4, k[2]).getValues();
    var rong = v.slice(1).every(function (r) {
      return r.every(function (x) { return x === '' || x === null; });
    });
    out.push((rong ? '✗ RỖNG   ' : '✔ có DL  ') + k[0] + '  [cột ' + k[1] + ']');
    for (var i = 0; i < 3; i++) {
      out.push('        dòng ' + (i + 1) + ': ' +
        v[i].map(function (x) { return String(x === '' ? '·' : x).substring(0, 22); }).join(' | '));
    }
  });
  var txt = out.join('\n');
  Logger.log(txt);
  SpreadsheetApp.getUi().alert('Soi sheet ' + CFG.DASH.CALC, txt, SpreadsheetApp.getUi().ButtonSet.OK);
}

function huongDanNhanSo() {
  var ok = (typeof Sheets !== 'undefined');
  SpreadsheetApp.getUi().alert('Nhãn số trên biểu đồ cột',
    'Trạng thái: ' + (ok ? 'ĐÃ bật dịch vụ Google Sheets API — nhãn số sẽ hiện sau khi dựng lại dashboard.'
                         : 'CHƯA bật dịch vụ Google Sheets API.') + '\n\n' +
    'Apps Script không có lệnh đặt nhãn số cho biểu đồ; phải sửa qua Google Sheets API.\n\n' +
    'Cách bật (làm 1 lần):\n' +
    '1. Mở Tiện ích mở rộng → Apps Script\n' +
    '2. Cột trái, mục "Dịch vụ" (Services), bấm dấu +\n' +
    '3. Chọn "Google Sheets API", giữ nguyên mã định danh là Sheets, bấm Thêm\n' +
    '4. Quay lại Sheet, chạy lại "📊 DỰNG LẠI DASHBOARD"\n\n' +
    'Không bật cũng không sao — dashboard vẫn chạy bình thường, chỉ thiếu nhãn số trên cột.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function xemLoiCuoi() {
  var m = '';
  try { m = PropertiesService.getDocumentProperties().getProperty('MMH_LOI_CUOI') || ''; } catch (e) {}
  SpreadsheetApp.getUi().alert('Lỗi gần nhất khi dựng dashboard',
    m || 'Chưa ghi nhận lỗi nào.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function taoDashboard() {
  var ss = _ss();
  try { PropertiesService.getDocumentProperties().deleteProperty('MMH_LOI_CUOI'); } catch (e) {}
  _toast('Đang dựng dashboard… chỉ mất một lần này thôi, sau đó đổi bộ lọc là đổi ngay.', 'Dashboard');

  var sh = ss.getSheetByName(CFG.DASH.SHEET);
  if (!sh) sh = ss.insertSheet(CFG.DASH.SHEET);
  var cu = {
    y: sh.getRange(DASH.F_YEAR).getValue(), b: sh.getRange(DASH.F_BRAND).getValue(),
    t: sh.getRange(DASH.F_TYPE).getValue(), c: sh.getRange(DASH.F_CAPS).getValue()
  };

  _xoaChart(sh);
  sh.clear();
  var L = _layout();
  if (sh.getMaxRows() < L.LAST + 5) sh.insertRowsAfter(sh.getMaxRows(), L.LAST + 5 - sh.getMaxRows());
  if (sh.getMaxColumns() < UI.C2 + 2) sh.insertColumnsAfter(sh.getMaxColumns(), UI.C2 + 2 - sh.getMaxColumns());

  sh.getRange(DASH.F_YEAR).setValue(cu.y || 'Tất cả');
  sh.getRange(DASH.F_BRAND).setValue(cu.b || 'Tất cả');
  sh.getRange(DASH.F_TYPE).setValue(cu.t || 'Tất cả');
  sh.getRange(DASH.F_CAPS).setValue(cu.c || 'Tất cả các loại');
  SpreadsheetApp.flush();

  _buoc('1. Dựng sheet nguồn _DashSrc', function () { _dungDashSrc(ss); });
  _buoc('2. Dựng sheet tính _DashCalc', function () { _dungDashCalc(ss); });
  SpreadsheetApp.flush();

  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 30);
  for (var c = UI.C1; c <= UI.C2 + 1; c++) sh.setColumnWidth(c, UI.COL_PX);
  sh.setRowHeights(1, L.LAST + 4, UI.ROW_PX);
  sh.setRowHeight(2, 34);
  sh.getRange(1, 1, L.LAST + 4, UI.C2 + 2).setBackground(CFG.COLOR.WHITE)
    .setFontFamily('Aptos').setFontSize(10).setVerticalAlignment('middle');

  _buoc('3. Tiêu đề', function () { _dungTieuDe(ss, sh); });
  _buoc('4. Ô bộ lọc', function () { _dungBoLoc(ss, sh, cu); });
  _buoc('5. Công thức trên sheet dashboard', function () { _dungCongThuc(sh, L); });
  _buoc('6. Chèn biểu đồ', function () { _dungBieuDo(sh, L); });
  SpreadsheetApp.flush();
  var coNhan = _buoc('7. Bật nhãn số trên cột', function () { return _batNhanSoCot(ss, sh); });

  sh.setFrozenRows(5);
  ss.setActiveSheet(sh);
  SpreadsheetApp.flush();

  var tr = _baoDamTrigger();

  _toast('Xong. Đổi bộ lọc ở dòng 4 là số liệu và biểu đồ đổi NGAY.\nĐồng bộ realtime: ' + tr +
    (coNhan ? '' : '\n⚠ Chưa hiện được nhãn số trên biểu đồ cột — xem menu "Vì sao biểu đồ cột chưa có nhãn số".'),
    'Dashboard');
}

function refreshDashboard() { taoDashboard(); }
function menuTaoDashboard()   { taoDashboard(); }
function menuLamMoiDashboard() {
  var sh = _ss().getSheetByName(CFG.DASH.SHEET);
  if (!sh) { taoDashboard(); return; }
  _ss().setActiveSheet(sh);
  SpreadsheetApp.flush();
  _toast('Dashboard chạy bằng công thức nên luôn tự cập nhật — không cần làm mới.\n' +
         'Chỉ dựng lại khi Total data đổi CẤU TRÚC cột.', 'Dashboard');
}

function _dungTieuDe(ss, sh) {
  sh.getRange(2, UI.C1, 3, UI.C2 - UI.C1 + 1).setBackground(CFG.COLOR.PALE)
    .setBorder(true, true, true, true, false, false, CFG.COLOR.LBLUE, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(2, UI.C1, 1, UI.C2 - UI.C1 + 1).merge();
  sh.getRange(2, UI.C1).setValue('MMH — DASHBOARD THỊ PHẦN COMPOSITE')
    .setFontSize(18).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(3, UI.C1, 1, UI.C2 - UI.C1 + 1).merge();
  sh.getRange(3, UI.C1).setValue('Nguồn: Total data (HS 3006.40) × Giá bán lẻ công khai • Trị giá = PCS × giá bán lẻ USD • FX ' +
    CFG.FX + ' • Số liệu là công thức sống: đổi bộ lọc hoặc sửa Total data là đổi ngay')
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);
}

function _dungBoLoc(ss, sh, cu) {
  var S = _q(CFG.DASH.SRC);
  var lists = ss.getSheetByName(CFG.DASH.LISTS);
  if (!lists) lists = ss.insertSheet(CFG.DASH.LISTS);
  lists.clear();
  if (lists.getMaxRows() < 2000) lists.insertRowsAfter(lists.getMaxRows(), 2000 - lists.getMaxRows());

  lists.getRange('A1').setFormula('={"Tất cả";IFERROR(SORT(UNIQUE(FILTER(' + S + '!$A$2:$A,' + S + '!$A$2:$A<>""))),"")}');
  lists.getRange('B1').setFormula('={"Tất cả";IFERROR(SORT(UNIQUE(FILTER(' + S + '!$B$2:$B,' + S + '!$B$2:$B<>""))),"")}');
  lists.getRange('C1').setFormula('={"Tất cả";IFERROR(SORT(UNIQUE(FILTER(' + S + '!$D$2:$D,' + S + '!$D$2:$D<>""))),"")}');
  lists.getRange('D1:D3').setValues([['Tất cả các loại'], ['Loại trừ Capsules'], ['Chỉ tính Capsules']]);
  SpreadsheetApp.flush();
  try { lists.hideSheet(); } catch (e) {}

  [['B4', DASH.F_YEAR, 'Năm', 1], ['E4', DASH.F_BRAND, 'Hãng', 2],
   ['H4', DASH.F_TYPE, 'Loại Composite', 3], ['K4', DASH.F_CAPS, 'Capsules', 4]
  ].forEach(function (f) {
    sh.getRange(f[0]).setValue(f[2]).setFontWeight('bold')
      .setFontColor(CFG.COLOR.NAVY).setHorizontalAlignment('right');
    sh.getRange(f[1]).setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInRange(lists.getRange(1, f[3], 1000, 1), true).setAllowInvalid(false).build());
    sh.getRange(f[1]).setBackground(CFG.COLOR.CREAM)
      .setBorder(true, true, true, true, false, false, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  });
  sh.getRange('C4:D4').merge(); sh.getRange('F4:G4').merge();
  sh.getRange('I4:J4').merge(); sh.getRange('L4:M4').merge();
  sh.getRange(DASH.F_YEAR).setValue(cu.y || 'Tất cả');
  sh.getRange(DASH.F_BRAND).setValue(cu.b || 'Tất cả');
  sh.getRange(DASH.F_TYPE).setValue(cu.t || 'Tất cả');
  sh.getRange(DASH.F_CAPS).setValue(cu.c || 'Tất cả các loại');

  sh.getRange(5, UI.C1, 1, UI.C2 - UI.C1 + 1).merge();
  sh.getRange(5, UI.C1).setValue('Đổi bất kỳ ô lọc nào ở trên — bảng và biểu đồ bên dưới đổi theo ngay lập tức.')
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);
}

function _mucTieuDe(sh, row, chu, phu) {
  sh.getRange(row, UI.C1).setValue(chu)
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(row, UI.C1, 1, UI.C2 - UI.C1 + 1)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  if (phu !== undefined) {
    sh.getRange(row + 1, UI.C1, 1, UI.C2 - UI.C1 + 1).merge();
    if (typeof phu === 'string' && phu.charAt(0) === '=') sh.getRange(row + 1, UI.C1).setFormula(phu);
    else sh.getRange(row + 1, UI.C1).setValue(phu);
    sh.getRange(row + 1, UI.C1).setFontSize(9).setFontColor(CFG.COLOR.MUTED);
  }
}

function _panel(sh, r1, r2, c1, c2) {
  sh.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1)
    .setBorder(true, true, true, true, false, false, CFG.COLOR.LBLUE, SpreadsheetApp.BorderStyle.SOLID);
}

function _doBang(dieuKien, vungA, vungB) {
  var trai = function (v) { return 'ARRAYFORMULA(IF(' + v + '="","",' + v + '))'; };
  return 'IF(' + dieuKien + ',' + trai(vungA) + ',' + trai(vungB) + ')';
}

function _dungCongThuc(sh, L) {
  var S = _q(CFG.DASH.SRC) + '!', C = _q(CFG.DASH.CALC) + '!';
  var col = function (X) { return S + '$' + X + '$2:$' + X; };
  var cc  = function (X, r1, r2) { return C + '$' + X + '$' + r1 + ':$' + X + (r2 === undefined ? '' : r2); };
  var soLuong = col('L'), triGia = col('M'), pcsNoHang = col('O'), usdNoHang = col('P');
  var TL = [CFG.TIER_LABELS.HIGH, CFG.TIER_LABELS.MID, CFG.TIER_LABELS.LOW];
  var laTat = '$' + DASH.F_BRAND.replace(/(\d+)/, '$$$1') + '="Tất cả"';
  var HANG  = '$' + DASH.F_BRAND.replace(/(\d+)/, '$$$1');
  var NAM   = '$' + DASH.F_YEAR.replace(/(\d+)/, '$$$1');
  var W = UI.C2 - UI.C1 + 1;

  /* --- Mốc thời gian (khối NGAY trên _DashCalc) + 3 cột của khối TREND --- */
  var NGV     = _chuCot(_idx(CAL.NGAY) + 1);
  var ng      = function (r) { return C + '$' + NGV + '$' + r; };
  var ngayMax = ng(2), ngayMin = ng(3), namMax = ng(4), soNgay = ng(5),
      tiLe    = ng(6), namDu   = ng(7);
  var trA = C + '$A$2:$A$20', trB = C + '$B$2:$B$20', trC = C + '$C$2:$C$20';
  /** Giá trị của MỘT năm trong khối xu hướng (0 nếu không có năm đó). */
  var gtNam = function (cot, nam) {
    return 'IFERROR(INDEX(FILTER(' + cot + ',' + trA + '=' + nam + '),1),0)';
  };

  /* ---------------- 1. CARDBOX ---------------- */
  _mucTieuDe(sh, L.OV_T, '▌ TỔNG QUAN THỊ TRƯỜNG');
  sh.getRange(L.OV_T, UI.C1).setFormula(
    '="▌ TỔNG QUAN THỊ TRƯỜNG"&IF(' + laTat + ',"","  —  "&' + HANG + ')');

  var usd = function (e) { return 'IF(' + e + '>=1000000,"$"&TEXT(' + e + '/1000000,"0.00")&"M","$"&TEXT(' + e + ',"#,##0"))'; };
  var tongV = 'SUM(' + triGia + ')', tongQ = 'SUM(' + soLuong + ')';

  var cards = [
    { nhan: '="MARKET SIZE"',
      giatri: '=' + usd(tongV),
      phu: '="Tổng trị giá theo giá bán lẻ (USD)"' },
    { nhan: '="VOLUME"',
      giatri: '=TEXT(' + tongQ + ',"#,##0")&" pcs"',
      phu: '="Capsules: "&TEXT(SUMIF(' + col('D') + ',"Capsules",' + soLuong + '),"#,##0")&" pcs ("&' +
           'TEXT(IFERROR(SUMIF(' + col('D') + ',"Capsules",' + soLuong + ')/' + tongQ + ',0),"0.0%")&")"' },
    { nhan: '=IF(' + laTat + ',"SỐ HÃNG","HÃNG ĐANG XEM")',
      giatri: '=IF(' + laTat + ',TEXT(COUNTA(IFERROR(UNIQUE(FILTER(' + col('B') + ',' + col('I') + '=1)),"")),"#,##0"),' + HANG + ')',
      phu: '=IF(' + laTat + ',"Hãng có nhập khẩu trong bộ lọc",' +
           '"Thị phần: "&TEXT(IFERROR(' + tongQ + '/SUM(' + pcsNoHang + '),0),"0.0%")&" SL  ·  "&' +
           'TEXT(IFERROR(' + tongV + '/SUM(' + usdNoHang + '),0),"0.0%")&" GT")' },
    { nhan: '="SỐ NHÃN HIỆU"',
      giatri: '=TEXT(COUNTA(IFERROR(UNIQUE(FILTER(' + col('C') + ',' + col('I') + '=1)),"")),"#,##0")',
      phu: '=IF(' + laTat + ',"Nhãn hiệu unique trong bộ lọc","Nhãn hiệu của "&' + HANG + ')' },
    /* CAGR chỉ chạy tới năm ĐỦ 12 THÁNG.
       Lấy năm cuối cùng khi năm đó mới đi được 5/12 tháng thì mẫu số bị hụt hơn
       một nửa ⇒ CAGR ra âm rất nặng dù thị trường đang tăng. Đây là lỗi đọc số
       nguy hiểm nhất của dashboard nhập khẩu, nên chặn thẳng ở công thức.
       Không có cột Ngày đăng ký thì lùi về cách cũ (lấy năm cuối cùng có mặt). */
    { nhan: '="CAGR"',
      giatri: '=IFERROR(IF(COUNT(' + trA + ')<2,"—",' +
              'LET(nc,IF(' + namDu + '="",INDEX(' + trA + ',COUNT(' + trA + ')),' + namDu + '),' +
              'v1,INDEX(' + trC + ',1),v2,' + gtNam(trC, 'nc') + ',n,nc-INDEX(' + trA + ',1),' +
              'IF(OR(n<1,v1<=0,v2<=0),"—",TEXT(POWER(v2/v1,1/n)-1,"+0.0%;-0.0%")))),"—")',
      phu: '=IFERROR(IF(COUNT(' + trA + ')<2,"không đủ dữ liệu",' +
           'TEXT(INDEX(' + trA + ',1),"0")&"→"&TEXT(IF(' + namDu + '="",INDEX(' + trA + ',COUNT(' + trA + ')),' + namDu + '),"0")&" (trị giá)"&' +
           'IF(OR(' + tiLe + '="",' + tiLe + '>=0.999),""," · đã loại "&TEXT(' + namMax + ',"0")&" vì chưa đủ năm")),"—")' },
    { nhan: '=IF(' + laTat + ',"TOP HÃNG — VOLUME","SẢN PHẨM NHẬP NHIỀU NHẤT")',
      giatri: '=IFERROR(IF(INDEX(' + cc('E', 2) + ',1)="","—",INDEX(' + cc('E', 2) + ',1)),"—")',
      phu: '=IFERROR(IF(' + laTat + ',"",' +
           'INDEX(QUERY(FILTER({' + col('D') + ',' + col('E') + '},(' + col('I') + '=1)*(' + col('C') + '=INDEX(' + cc('E', 2) + ',1))),' +
           '"select Col1, sum(Col2) group by Col1 order by sum(Col2) desc limit 1 label Col1 \'Loại\', sum(Col2) \'PCS\'",0),2,1)&"  ·  ")' +
           '&TEXT(INDEX(' + cc('F', 2) + ',1),"#,##0")&" pcs ("&TEXT(IFERROR(INDEX(' + cc('F', 2) + ',1)/' + tongQ + ',0),"0.0%")&")","—")' },
    { nhan: '=IF(' + laTat + ',"TOP HÃNG — VALUE","SẢN PHẨM GIÁ TRỊ CAO NHẤT")',
      giatri: '=IFERROR(IF(INDEX(' + cc('H', 2) + ',1)="","—",INDEX(' + cc('H', 2) + ',1)),"—")',
      phu: '=IFERROR(' + usd('INDEX(' + cc('I', 2) + ',1)') + '&" ("&TEXT(IFERROR(INDEX(' + cc('I', 2) + ',1)/' + tongV + ',0),"0.0%")&")","—")' }
  ];

  sh.getRange(L.OV, UI.C1, 4, W).setBackground(CFG.COLOR.PALE);
  cards.forEach(function (cd, i) {
    var c1 = UI.C1 + i * 3;
    if (c1 + 2 > UI.C2) {
      throw new Error('Không đủ chỗ cho ' + cards.length + ' cardbox: cần UI.C2 >= ' +
        (UI.C1 + cards.length * 3 - 1) + ', hiện là ' + UI.C2 + '.');
    }
    sh.getRange(L.OV, c1, 4, 3)
      .setBorder(true, true, true, true, false, false, CFG.COLOR.LBLUE, SpreadsheetApp.BorderStyle.SOLID)
      .setHorizontalAlignment('center').setWrap(true);
    sh.getRange(L.OV, c1, 1, 3).merge();
    sh.getRange(L.OV + 1, c1, 2, 3).merge();
    sh.getRange(L.OV + 3, c1, 1, 3).merge();
    sh.getRange(L.OV, c1).setFormula(cd.nhan).setFontSize(9).setFontWeight('bold').setFontColor(CFG.COLOR.MUTED);
    sh.getRange(L.OV + 1, c1).setFormula(cd.giatri).setFontSize(14).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
    sh.getRange(L.OV + 3, c1).setFormula(cd.phu).setFontSize(9).setFontColor(CFG.COLOR.MUTED);
  });

  /* ---------------- 2. XU HƯỚNG ---------------- */
  _mucTieuDe(sh, L.TR_T, '▌ DIỄN BIẾN QUA CÁC NĂM');
  sh.getRange(L.TR_T, UI.C1).setFormula(
    '="▌ DIỄN BIẾN QUA CÁC NĂM"&IF(' + laTat + ',"","  —  "&' + HANG + ')&"   (không chịu ảnh hưởng của bộ lọc Năm)"');
  _panel(sh, L.TR, L.TR_E, UI.C1, UI.C2);

  /* --- Ghi chú năm chưa đủ dữ liệu + ngoại suy demand --- */
  sh.getRange(L.TR_N, UI.C1, 2, W).setBackground(CFG.COLOR.CREAM).setWrap(true);
  sh.getRange(L.TR_N, UI.C1, 1, W).merge();
  sh.getRange(L.TR_N + 1, UI.C1, 1, W).merge();
  _panel(sh, L.TR_N, L.TR_N + 1, UI.C1, UI.C2);
  sh.setRowHeights(L.TR_N, 2, 30);

  sh.getRange(L.TR_N, UI.C1).setFormula(
    '=IF(' + ngayMax + '="","⚠ Chưa đọc được cột Ngày đăng ký (' + (CFG.DATA.DATE || 'dò theo tiêu đề') +
    ') của Total data — bổ sung cột đó rồi dựng lại dashboard để có cảnh báo năm chưa đủ và CAGR đúng.",' +
    'IF(' + tiLe + '>=0.999,' +
    '"✔ Dữ liệu nhập khẩu đủ 12 tháng cho mọi năm — mới nhất "&TEXT(' + ngayMax + ',"dd/MM/yyyy")&". CAGR tính trên toàn bộ dải năm.",' +
    '"⚠ NĂM "&TEXT(' + namMax + ',"0")&" CHƯA ĐỦ NĂM — dữ liệu nhập khẩu chỉ đến "&TEXT(' + ngayMax + ',"dd/MM/yyyy")&' +
    '"  ("&TEXT(' + soNgay + ',"0")&" ngày, bằng "&TEXT(' + tiLe + ',"0.0%")&" của năm). ' +
    'Cột "&TEXT(' + namMax + ',"0")&" trên biểu đồ KHÔNG so sánh trực tiếp được với các năm trước — nhìn vào sẽ tưởng thị trường sụt."))')
    .setFontSize(10).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);

  sh.getRange(L.TR_N + 1, UI.C1).setFormula(
    '=IF(' + ngayMax + '="","",' +
    'IF(' + tiLe + '>=0.999,"Dải dữ liệu: "&TEXT(' + ngayMin + ',"dd/MM/yyyy")&"  →  "&TEXT(' + ngayMax + ',"dd/MM/yyyy"),' +
    '"→ CAGR ở thẻ trên đã tính đến "&TEXT(' + namDu + ',"0")&" (năm đủ 12 tháng gần nhất). ' +
    'Nếu ngoại suy tuyến tính theo tốc độ hiện tại, cả năm "&TEXT(' + namMax + ',"0")&" ước đạt ≈ "&' +
    'TEXT(IFERROR(' + gtNam(trB, namMax) + '/' + tiLe + ',0),"#,##0")&" pcs  ·  ≈ $"&' +
    'TEXT(IFERROR(' + gtNam(trC, namMax) + '/' + tiLe + ',0),"#,##0")&' +
    '"  —  chỉ là ước tính thô, chưa tính mùa vụ và độ trễ khai báo; dùng để đọc xu hướng, KHÔNG dùng làm số chính thức."))')
    .setFontSize(10).setFontColor(CFG.COLOR.INK);

  /* ---------------- 3. BẢNG CHÍNH ---------------- */
  sh.getRange(L.TB_T, UI.C1).setFormula(
    '=IF(' + laTat + ',"▌ DANH SÁCH HÃNG & THỊ PHẦN","▌ DANH MỤC SẢN PHẨM & PHÂN BỔ  —  "&' + HANG + ')')
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(L.TB_T, UI.C1, 1, W)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.TB_S, UI.C1, 1, W).merge();
  sh.getRange(L.TB_S, UI.C1).setFormula(
    '=IF(' + laTat + ',"Top ' + UI.N_TB + ' hãng theo SẢN LƯỢNG · % tính trong phạm vi bộ lọc hiện tại · gom nhóm theo cột ' +
    CFG.DATA.COMPANY + ' (Tên hãng)","Top ' + UI.N_TB + ' theo SẢN LƯỢNG · % tính trong nội bộ "&' + HANG + '&' +
    '" · mỗi dòng là một cặp Nhãn hiệu × Chủng loại")')
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);

  var W_TB = _wTB();
  var hdrA = ['Tên hãng (nhà sản xuất)', 'Số nhãn hiệu']
    .concat(LV2_ORDER.map(function (l) { return 'SL ' + l; }))
    .concat(['Tổng PCS', '% TP theo SL', 'Tổng trị giá (USD)', '% TP theo GT']);
  var hdrB = ['Tên nhãn hiệu', 'Chủng loại', 'SL nhập khẩu (pcs)', 'Giá bán lẻ (VNĐ)',
              'Giá trị (USD)', '% Số lượng', '% Giá trị'];
  while (hdrB.length < W_TB) hdrB.push('');
  hdrA.forEach(function (h, i) {
    sh.getRange(L.TB_H, UI.C1 + i).setFormula('=IF(' + laTat + ',"' + h + '","' + hdrB[i] + '")');
  });
  _headerStyle(sh.getRange(L.TB_H, UI.C1, 1, W_TB));
  sh.setRowHeight(L.TB_H, 38);

  var tbA = '$' + CAL.TB_A + '$2:$' + _chuCot(_idx(CAL.TB_A) + W_TB - 1) + '$' + (UI.N_TB + 1);
  var tbB = '$' + CAL.TB_B + '$2:$' + _chuCot(_idx(CAL.TB_B) + W_TB - 1) + '$' + (UI.N_TB + 1);
  sh.getRange(L.TB, UI.C1).setFormula('=' + _doBang(laTat, C + tbA, C + tbB));

  sh.getRange(L.TB, UI.C1 + 1, UI.N_TB, LV2_ORDER.length + 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
  sh.getRange(L.TB, UI.C1 + _iPSL(), UI.N_TB, 1).setNumberFormat('0.0%').setHorizontalAlignment('center');
  sh.getRange(L.TB, UI.C1 + _iGT(),  UI.N_TB, 1).setNumberFormat('$#,##0').setHorizontalAlignment('right');
  sh.getRange(L.TB, UI.C1 + _iPGT(), UI.N_TB, 1).setNumberFormat('0.0%').setHorizontalAlignment('center');
  for (var r = L.TB; r <= L.TB_E; r++) {
    if ((r - L.TB) % 2 === 1) sh.getRange(r, UI.C1, 1, W_TB).setBackground(CFG.COLOR.PALE);
  }

  var vungTB = sh.getRange(L.TB, UI.C1, UI.N_TB, W_TB);
  var oDau = '$' + _chuCot(UI.C1) + L.TB;
  var quyTacMani = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(' + laTat + ',REGEXMATCH(UPPER(' + oDau + '&""),"^MANI"))')
    .setBackground(CFG.COLOR.MANI)
    .setFontColor(CFG.COLOR.INK)
    .setBold(true)
    .setRanges([vungTB])
    .build();
  var giuTB = sh.getConditionalFormatRules().filter(function (q) {
    var rs = q.getRanges();
    return !rs.some(function (x) { return x.getRow() === L.TB && x.getColumn() === UI.C1; });
  });
  sh.setConditionalFormatRules(giuTB.concat([quyTacMani]));

  sh.getRange(L.TB_TOT, UI.C1).setValue('TỔNG');
  sh.getRange(L.TB_TOT, UI.C1 + _iPCS()).setFormula('=SUM(' + _chuCot(UI.C1 + _iPCS()) + L.TB + ':' + _chuCot(UI.C1 + _iPCS()) + L.TB_E + ')');
  sh.getRange(L.TB_TOT, UI.C1 + _iGT()).setFormula('=IF(' + laTat + ',SUM(' + _chuCot(UI.C1 + _iGT()) + L.TB + ':' + _chuCot(UI.C1 + _iGT()) + L.TB_E + '),"")');
  sh.getRange(L.TB_TOT, UI.C1, 1, W_TB).setFontWeight('bold').setBackground(CFG.COLOR.LBLUE)
    .setBorder(true, null, null, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.TB_TOT, UI.C1 + _iPCS()).setNumberFormat('#,##0');
  sh.getRange(L.TB_TOT, UI.C1 + _iGT()).setNumberFormat('$#,##0');
  _panel(sh, L.TB_H, L.TB_TOT, UI.C1, UI.C1 + W_TB - 1);

  /* ---------------- 4. PIE CƠ CẤU ---------------- */
  sh.getRange(L.PI_T, UI.C1).setFormula(
    '=IF(' + laTat + ',"▌ THỊ PHẦN THEO HÃNG","▌ CƠ CẤU SẢN PHẨM NHẬP KHẨU CỦA "&' + HANG + ')')
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(L.PI_T, UI.C1, 1, W)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  _panel(sh, L.PI, L.PI_E, UI.C1, UI.C2);

  /* ---------------- 5. SEGMENTATION ---------------- */
  sh.getRange(L.SG_T, UI.C1).setFormula(
    '=IF(' + laTat + ',"▌ MARKET SEGMENTATION BY PRICE SEGMENT","▌ SẢN PHẨM THEO PHÂN KHÚC GIÁ  —  "&' + HANG + ')')
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(L.SG_T, UI.C1, 1, W)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.SG_S, UI.C1, 1, W).merge();
  sh.getRange(L.SG_S, UI.C1).setFormula(
    '=IF(' + laTat + ',"% = số nhãn hiệu của hãng thuộc phân khúc ÷ tổng số nhãn hiệu của hãng trong loại đó · Top ' + UI.N_SEG + ' hãng theo trị giá",' +
    '"% so với TOÀN THỊ TRƯỜNG trong cùng phân khúc (không phải nội bộ "&' + HANG + '&") · Top ' + UI.N_SEG + ' theo trị giá")')
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);

  var hSegB = ['Tên nhãn hiệu', 'Chủng loại', 'Phân khúc giá', 'Giá bán lẻ (VNĐ)',
               'SL (pcs)', 'Giá trị (USD)', '% SL trong phân khúc', '% GT trong phân khúc'];
  sh.getRange(L.SG_H, UI.C1).setFormula('=IF(' + laTat + ',"Tên hãng","' + hSegB[0] + '")');
  LV2_ORDER.forEach(function (lv, k) {
    var c1 = UI.C1 + 1 + k * 3;
    sh.getRange(L.SG_H, c1, 1, 3).merge();
    sh.getRange(L.SG_H, c1).setFormula('=IF(' + laTat + ',"' + lv + '","")').setHorizontalAlignment('center');
    TL.forEach(function (t, j) {
      sh.getRange(L.SG_H + 1, c1 + j).setFormula('=IF(' + laTat + ',"' + t + '","' + (hSegB[1 + k * 3 + j] || '') + '")');
    });
  });
  sh.getRange(L.SG_H, UI.C1, 2, 1).merge();
  var W_SG = _wSG();
  _headerStyle(sh.getRange(L.SG_H, UI.C1, 2, W_SG));
  sh.setRowHeights(L.SG_H, 2, 32);

  var sgA = '$' + CAL.SG_A + '$2:$' + _chuCot(_idx(CAL.SG_A) + W_SG - 1) + '$' + (UI.N_SEG + 1);
  var sgB = '$' + CAL.SG_B + '$2:$' + _chuCot(_idx(CAL.SG_B) + 7) + '$' + (UI.N_SEG + 1);
  sh.getRange(L.SG, UI.C1).setFormula('=' + _doBang(laTat, C + sgA, C + sgB));
  sh.getRange(L.SG, UI.C1 + 1, UI.N_SEG, W_SG - 1).setHorizontalAlignment('center');
  for (var r2 = L.SG; r2 <= L.SG_E; r2++) {
    if ((r2 - L.SG) % 2 === 1) sh.getRange(r2, UI.C1, 1, W_SG).setBackground(CFG.COLOR.PALE);
  }
  sh.getRange(L.SG, UI.C1 + 1, UI.N_SEG, W_SG - 1).setNumberFormat('0.0%');
  sh.getRange(L.SG, UI.C1 + 1, UI.N_SEG, 3).setNumberFormat('General');
  sh.getRange(L.SG, UI.C1 + 3, UI.N_SEG, 1).setNumberFormat('#,##0');
  sh.getRange(L.SG, UI.C1 + 4, UI.N_SEG, 1).setNumberFormat('#,##0');
  sh.getRange(L.SG, UI.C1 + 5, UI.N_SEG, 1).setNumberFormat('#,##0');
  _panel(sh, L.SG_H, L.SG_E, UI.C1, UI.C1 + W_SG - 1);

  /* ---------------- 6. PIE TỈ TRỌNG PHÂN KHÚC ---------------- */
  sh.getRange(L.TP_T, UI.C1).setFormula(
    '="▌ TỈ TRỌNG CÁC PHÂN KHÚC GIÁ"&IF(' + laTat + ',"","  —  "&' + HANG + ')')
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(L.TP_T, UI.C1, 1, W)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  _panel(sh, L.TP, L.TP_E, UI.C1, UI.C2);

  /* ---------------- 6b. SO SÁNH ĐỐI THỦ CÙNG PHÂN KHÚC (MỚI) ---------------- */
  sh.getRange(L.CP_T, UI.C1).setFormula(
    '=IF(' + laTat + ',"▌ SO SÁNH ĐỐI THỦ CÙNG PHÂN KHÚC","▌ SO SÁNH ĐỐI THỦ CÙNG PHÂN KHÚC  —  "&' + HANG + ')')
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(L.CP_T, UI.C1, 1, W)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.CP_S, UI.C1, 1, W).merge();
  sh.getRange(L.CP_S, UI.C1).setFormula(
    '=IF(' + laTat + ',"Chọn một hãng ở ô lọc Hãng để xem bảng này — sẽ liệt kê các hãng dẫn đầu trong đúng những nhóm mà hãng đó đang cạnh tranh.",' +
    '"Chỉ hiện các nhóm Chủng loại × Phân khúc mà "&' + HANG + '&" đang có sản phẩm · Top ' + TOP_CP +
    ' hãng dẫn đầu mỗi nhóm · sắp theo % SẢN LƯỢNG giảm dần · % tính trong nội bộ từng nhóm (toàn thị trường) · dòng MANI bôi vàng")')
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);

  var hCP = ['Chủng loại', 'Phân khúc giá', 'Tên hãng (nhà sản xuất)', 'SL (pcs)',
             '% SL trong nhóm', 'Giá trị (USD)', '% GT trong nhóm'];
  _ghi(sh, L.CP_HD, UI.C1, [hCP]);
  _headerStyle(sh.getRange(L.CP_HD, UI.C1, 1, hCP.length));
  sh.setRowHeight(L.CP_HD, 34);

  var cpA = C + '$' + CAL.CP_OUT + '$2:$' + _chuCot(_idx(CAL.CP_OUT) + 6) + '$' + (UI.N_CP + 1);
  sh.getRange(L.CP, UI.C1).setFormula(
    '=IFERROR(ARRAYFORMULA(IF(' + cpA + '="","",' + cpA + ')),"")');

  sh.getRange(L.CP, UI.C1, UI.N_CP, 3).setHorizontalAlignment('left');
  sh.getRange(L.CP, UI.C1 + 3, UI.N_CP, 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
  sh.getRange(L.CP, UI.C1 + 4, UI.N_CP, 1).setNumberFormat('0.0%').setHorizontalAlignment('center');
  sh.getRange(L.CP, UI.C1 + 5, UI.N_CP, 1).setNumberFormat('$#,##0').setHorizontalAlignment('right');
  sh.getRange(L.CP, UI.C1 + 6, UI.N_CP, 1).setNumberFormat('0.0%').setHorizontalAlignment('center');
  for (var r3 = L.CP; r3 <= L.CP_E; r3++) {
    if ((r3 - L.CP) % 2 === 1) sh.getRange(r3, UI.C1, 1, hCP.length).setBackground(CFG.COLOR.PALE);
  }

  // Bôi vàng dòng MANI — cột "Tên hãng" là cột thứ 3 của bảng.
  var oHang = '$' + _chuCot(UI.C1 + 2) + L.CP;
  var quyTacCP = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=REGEXMATCH(UPPER(' + oHang + '&""),"^MANI")')
    .setBackground(CFG.COLOR.MANI)
    .setFontColor(CFG.COLOR.INK)
    .setBold(true)
    .setRanges([sh.getRange(L.CP, UI.C1, UI.N_CP, hCP.length)])
    .build();
  sh.setConditionalFormatRules(sh.getConditionalFormatRules().concat([quyTacCP]));
  _panel(sh, L.CP_HD, L.CP_E, UI.C1, UI.C1 + hCP.length - 1);

  /* ---------------- 7. NOTE vị thế trong từng phân khúc ---------------- */
  sh.getRange(L.NT_T, UI.C1).setFormula(
    '=IF(' + laTat + ',"▌ GHI CHÚ","▌ NOTE — VỊ THẾ CỦA "&UPPER(' + HANG + ')&" TRONG TỪNG PHÂN KHÚC")')
    .setFontSize(12).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY);
  sh.getRange(L.NT_T, UI.C1, 1, W)
    .setBorder(null, null, true, null, null, null, CFG.COLOR.NAVY, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.NT, UI.C1, 3, W).setBackground(CFG.COLOR.CREAM);
  _panel(sh, L.NT, L.NT_E, UI.C1, UI.C2);

  TL.forEach(function (t, i) {
    var cCol = CAL.CC[i], vCol = _chuCot(_idx(CAL.CC[i]) + 1);
    var dsHang = C + '$' + cCol + '$2:$' + cCol + '13';
    var myV = 'SUMIF(' + col('R') + ',' + HANG + '&"|' + t + '",' + usdNoHang + ')';
    var tongT = 'SUMIF(' + col('G') + ',"' + t + '",' + usdNoHang + ')';
    var qSP = 'QUERY(FILTER({' + col('C') + ',' + col('D') + ',' + col('E') + '},' +
              '(' + col('I') + '=1)*(' + col('G') + '="' + t + '")),' +
              '"select Col1, Col2, sum(Col3) group by Col1, Col2 order by sum(Col3) desc limit 1 ' +
              'label Col1 \'NH\', Col2 \'Loại\', sum(Col3) \'PCS\'",0)';
    var spTop = 'IFERROR(INDEX(' + qSP + ',2,1)&" ("&INDEX(' + qSP + ',2,2)&") — "&' +
                'TEXT(INDEX(' + qSP + ',2,3),"#,##0")&" pcs","—")';
    sh.getRange(L.NT + i, UI.C1, 1, W).merge();
    sh.getRange(L.NT + i, UI.C1).setFormula(
      '=IF(' + laTat + ',IF(' + i + '=0,"Chọn một hãng ở ô lọc Hãng để xem hãng đó xếp thứ mấy và sản phẩm nào chủ đạo trong từng phân khúc.",""),' +
      'IF(' + myV + '<=0,"•  Phân khúc ' + t.toUpperCase() + ':  " & ' + HANG + ' & " không có sản phẩm nào trong phân khúc này.",' +
      '"•  Phân khúc ' + t.toUpperCase() + ':  " & ' + HANG + ' & "  xếp #" & IFERROR(MATCH(' + HANG + ',' + dsHang + ',0),">' + PIE_TOP + '") & ' +
      '"   —   " & TEXT(IFERROR(' + myV + '/' + tongT + ',0),"0.0%") & " giá trị toàn thị trường   ·   SP chủ đạo: " & ' + spTop + '))')
      .setFontSize(10).setFontColor(CFG.COLOR.INK);
  });

  /* ---------------- 8. PIE CƠ CẤU HÃNG THEO PHÂN KHÚC ---------------- */
  _mucTieuDe(sh, L.CC_T, '▌ CƠ CẤU HÃNG TRONG TỪNG PHÂN KHÚC GIÁ (theo giá trị bán lẻ)');
  _panel(sh, L.CC, L.CC_E, UI.C1, UI.C2);

  /* ---------------- 9. CHÂN TRANG ---------------- */
  var t = _layNguongGia();
  var s = LV2_ORDER.filter(function (l) { return t[l]; }).map(function (l) {
    return l + ': Thấp <' + _fmtInt(t[l].low) + ' | TB ' + _fmtInt(t[l].low) + '–' + _fmtInt(t[l].high) + ' | Cao ≥' + _fmtInt(t[l].high);
  }).join('     •     ');
  sh.getRange(L.FT, UI.C1, 1, W).merge();
  sh.getRange(L.FT, UI.C1).setValue('[' + SCRIPT_VER + ']  Ngưỡng phân khúc đang áp dụng (VNĐ) — ' + s)
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);
  sh.getRange(L.FT, UI.C1, 1, W)
    .setBorder(true, null, null, null, null, null, CFG.COLOR.LBLUE, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(L.FT + 1, UI.C1, 1, W).merge();
  sh.getRange(L.FT + 1, UI.C1).setFormula(
    '="Số dòng Composite khớp bộ lọc: "&TEXT(SUM(' + col('I') + '),"#,##0")&' +
    '"   ·   dữ liệu nhập khẩu: "&IFERROR(TEXT(' + ngayMin + ',"dd/MM/yyyy")&" → "&TEXT(' + ngayMax + ',"dd/MM/yyyy"),"(chưa có cột Ngày đăng ký)")&' +
    '"   ·   dashboard dựng lúc ' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') + ' — số liệu tự cập nhật liên tục sau đó"')
    .setFontSize(9).setFontColor(CFG.COLOR.MUTED);
}

/* ==================================================================
 * BIỂU ĐỒ
 * ================================================================== */

function _batNhanSoCot(ss, sh) {
  if (typeof Sheets === 'undefined') {
    try { PropertiesService.getDocumentProperties().setProperty('MMH_CAN_SHEETS_API', '1'); } catch (e) {}
    return false;
  }
  var calc = ss.getSheetByName(CFG.DASH.CALC);
  if (!calc) return false;
  var idCalc = calc.getSheetId(), idDash = sh.getSheetId();

  var nhan = {};
  nhan['Sản lượng nhập khẩu (pcs)']     = _idx(CAL.NH_Q) - 1;
  nhan['Giá trị theo giá bán lẻ (USD)'] = _idx(CAL.NH_V) - 1;

  var res = Sheets.Spreadsheets.get(ss.getId(), { fields: 'sheets(properties(sheetId),charts(chartId,spec))' });
  var reqs = [];
  (res.sheets || []).forEach(function (sheet) {
    if (!sheet.properties || sheet.properties.sheetId !== idDash) return;
    (sheet.charts || []).forEach(function (ch) {
      var spec = ch.spec;
      if (!spec || !spec.basicChart || !spec.title || nhan[spec.title] === undefined) return;
      var cot = nhan[spec.title];
      (spec.basicChart.series || []).forEach(function (se) {
        se.dataLabel = {
          type: 'CUSTOM',
          placement: 'OUTSIDE_END',
          textFormat: { fontFamily: 'Aptos', fontSize: 11, bold: true, foregroundColorStyle: { rgbColor: { red: 0.1, green: 0.1, blue: 0.1 } } },
          customLabelData: { sourceRange: { sources: [{
            sheetId: idCalc, startRowIndex: 1, endRowIndex: 20,
            startColumnIndex: cot, endColumnIndex: cot + 1
          }] } }
        };
      });
      reqs.push({ updateChartSpec: { chartId: ch.chartId, spec: spec } });
    });
  });
  if (!reqs.length) return false;
  Sheets.Spreadsheets.batchUpdate({ requests: reqs }, ss.getId());
  try { PropertiesService.getDocumentProperties().deleteProperty('MMH_CAN_SHEETS_API'); } catch (e2) {}
  return true;
}

function _dungBieuDo(sh, L) {
  var ss = _ss(), calc = ss.getSheetByName(CFG.DASH.CALC);
  var TL = [CFG.TIER_LABELS.HIGH, CFG.TIER_LABELS.MID, CFG.TIER_LABELS.LOW];
  var mauTier = CFG.TIER_COLORS;

  var cot = function (letter, r1, nR, nC) { return calc.getRange(r1, _idx(letter), nR, nC); };

  [['Sản lượng nhập khẩu (pcs)', 2, CFG.COLOR.NAVY, UI.C1,      CAL.NH_Q],
   ['Giá trị theo giá bán lẻ (USD)', 3, '#3A5CAA', UI.C1 + 9,    CAL.NH_V]
  ].forEach(function (cf) {
    sh.insertChart(sh.newChart().asColumnChart()
      .addRange(cot('A', 1, 20, 1))
      .addRange(calc.getRange(1, cf[1], 20, 1))
      .setNumHeaders(1).setPosition(L.TR, cf[3], 6, 4)
      .setOption('title', cf[0]).setOption('legend', { position: 'none' })
      .setOption('colors', [cf[2]]).setOption('width', 860).setOption('height', L.TR_H)
      .setOption('fontName', 'Aptos').setOption('backgroundColor', CFG.COLOR.WHITE)
      .setOption('titleTextStyle', { color: CFG.COLOR.NAVY, bold: true, fontSize: 14 })
      .build());
  });

  var mauHang = [CFG.COLOR.MANI]
    .concat(CFG.PALETTE.slice(0, PIE_TOP - 1))
    .concat(['#C9C9C9']);

  var vePie = function (letter, row, colAnchor, tieuDe, W, H, mau, co) {
    var b = sh.newChart().asPieChart()
      .addRange(cot(letter, 1, PIE_TOP + 2, 2))
      .setNumHeaders(1).setPosition(row, colAnchor, 6, 4)
      .setOption('title', tieuDe)
      .setOption('pieSliceText', 'percentage')
      .setOption('width', W).setOption('height', H)
      .setOption('fontName', 'Aptos').setOption('backgroundColor', CFG.COLOR.WHITE)
      .setOption('legend', { position: 'right', textStyle: { fontSize: co || 10, fontName: 'Aptos' } })
      .setOption('pieSliceTextStyle', { color: CFG.COLOR.INK, fontName: 'Aptos', fontSize: 11 })
      .setOption('titleTextStyle', { color: CFG.COLOR.NAVY, bold: true, fontSize: 14 });
    b = b.setOption('colors', mau || mauHang);
    sh.insertChart(b.build());
  };

  vePie(CAL.GH_Q, L.PI, UI.C1,     'Cơ cấu theo SẢN LƯỢNG (pcs)', 900, L.PI_H, null, 11);
  vePie(CAL.GH_V, L.PI, UI.C1 + 9, 'Cơ cấu theo GIÁ TRỊ (giá bán lẻ USD)', 900, L.PI_H, null, 11);

  var vePieNho = function (letter, colAnchor, tieuDe) {
    sh.insertChart(sh.newChart().asPieChart()
      .addRange(cot(letter, 1, 4, 2)).setNumHeaders(1)
      .setPosition(L.TP, colAnchor, 6, 4)
      .setOption('title', tieuDe).setOption('colors', mauTier)
      .setOption('pieSliceText', 'percentage')
      .setOption('width', 900).setOption('height', L.TP_H)
      .setOption('fontName', 'Aptos').setOption('backgroundColor', CFG.COLOR.WHITE)
      .setOption('legend', { position: 'right', textStyle: { fontSize: 12, fontName: 'Aptos' } })
      .setOption('pieSliceTextStyle', { color: CFG.COLOR.INK, fontName: 'Aptos', fontSize: 12 })
      .setOption('titleTextStyle', { color: CFG.COLOR.NAVY, bold: true, fontSize: 14 })
      .build());
  };
  vePieNho(CAL.TIER,  UI.C1,     '% SẢN LƯỢNG theo phân khúc giá');
  vePieNho(CAL.TIERV, UI.C1 + 9, '% GIÁ TRỊ theo phân khúc giá');

  CAL.GH_CC.forEach(function (c, i) {
    vePie(c, L.CC, UI.C1 + i * 6, 'Phân khúc ' + String(TL[i]).toUpperCase(), 640, L.CC_H, null, 9);
  });
}

/* ==================================================================
 * ĐỒNG BỘ REALTIME  (onEdit)  — BẢN ĐÃ VÁ
 * ------------------------------------------------------------------
 *  A. Sửa sheet "Tên nhãn hiệu vs đóng gói" → tính lại BA/BC/BG/BH/BI
 *     rồi tính lại luôn BM–BQ cho đúng các dòng Composite liên quan.
 *  B. Sửa sheet "Giá bán lẻ" → tính lại BM/BN/BO/BP/BQ cho các dòng
 *     Composite thuộc nhãn hiệu (hoặc cặp Tên hãng + Phân loại) vừa sửa.
 *
 *  ⚠ Trigger onEdit CHỈ nổ khi người dùng GÕ/DÁN vào ô. Nếu ô ở sheet
 *    "Giá bán lẻ" là CÔNG THỨC lấy từ nơi khác thì Google KHÔNG coi là edit
 *    ⇒ realtime sẽ không chạy. Trường hợp đó dùng menu "🔁 Đồng bộ TAY".
 * ================================================================== */

var RT = {
  MAX_ROWS   : 20000,
  LOCK_MS    : 20000,
  P_LOG      : 'MMH_RT_LOG'
};

/** Chuẩn hoá tên sheet để so sánh: NFC + bỏ khoảng trắng thừa + không phân biệt hoa thường. */
function _tenChuan(s) {
  var t = String(s === null || s === undefined ? '' : s);
  if (t.normalize) t = t.normalize('NFC');
  return t.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Ghi nhật ký mọi lần trigger nổ — công cụ chẩn đoán số 1. */
function _rtLog(txt) {
  try {
    var p = PropertiesService.getDocumentProperties();
    var arr = [];
    try { arr = JSON.parse(p.getProperty(RT.P_LOG) || '[]'); } catch (x) {}
    arr.unshift(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm:ss') + '  ' + txt);
    p.setProperty(RT.P_LOG, JSON.stringify(arr.slice(0, 10)));
  } catch (e) {}
}

function xemNhatKyRealtime() {
  var arr = [];
  try { arr = JSON.parse(PropertiesService.getDocumentProperties().getProperty(RT.P_LOG) || '[]'); } catch (e) {}
  var trg = 0;
  try {
    trg = ScriptApp.getProjectTriggers().filter(function (t) {
      return t.getHandlerFunction() === 'onEditRealtime';
    }).length;
  } catch (e2) {}

  var msg = 'Trigger onEditRealtime đang cài: ' + (trg ? 'CÓ ✔' : 'KHÔNG ✕') + '\n\n' +
    (arr.length ? arr.join('\n')
                : '(Chưa ghi nhận lần nào)\n\n' +
                  'Trống trơn nghĩa là trigger CHƯA HỀ NỔ. Ba nguyên nhân theo thứ tự khả năng:\n' +
                  '  1. Chưa bật — vào menu "⚡ BẬT đồng bộ realtime".\n' +
                  '  2. Ô anh sửa là CÔNG THỨC (không phải gõ tay) → Google không tính là edit.\n' +
                  '  3. Tên tab sheet đã bị đổi khác với CFG.MAP.SHEET / CFG.PRICE.SHEET.\n\n' +
                  'Trong lúc chờ, dùng "🔁 Đồng bộ TAY 1 nhãn hiệu…" là chạy được ngay.');
  SpreadsheetApp.getUi().alert('Nhật ký realtime — 10 lần gần nhất', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------- Bật / tắt / tự bảo đảm ---------- */

function caiTriggerRealtime() {
  var ss = _ss();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'onEditDashboard' || f === 'onEditRealtime') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onEditRealtime').forSpreadsheet(ss).onEdit().create();
  _rtLog('— đã cài lại trigger —');
  _toast('Đã bật đồng bộ realtime (trigger onEditRealtime).\n' +
         '• Sửa "' + CFG.MAP.SHEET + '" → BA/BC/BG/BH/BI + BM–BQ tự cập nhật\n' +
         '• Sửa "' + CFG.PRICE.SHEET + '" → BM–BQ tự cập nhật\n' +
         'Thử ngay: sửa 1 ô giá rồi mở "📜 Nhật ký realtime".', 'Realtime');
}

function tatTriggerRealtime() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var f = t.getHandlerFunction();
    if (f === 'onEditDashboard' || f === 'onEditRealtime') { ScriptApp.deleteTrigger(t); n++; }
  });
  _toast(n ? 'Đã tắt đồng bộ realtime (' + n + ' trigger).' : 'Chưa có trigger nào đang bật.', 'Realtime');
}

/** Tự cài trigger nếu thiếu — gọi sau mỗi lần chạy job/dashboard. */
function _baoDamTrigger() {
  var kq = [];
  try {
    var ds = ScriptApp.getProjectTriggers();
    var coEdit = ds.some(function (t) { return t.getHandlerFunction() === 'onEditRealtime'; });
    var coGio  = ds.some(function (t) { return t.getHandlerFunction() === 'dongBoDinhKy'; });
    if (coEdit) kq.push('onEdit ✔');
    else { ScriptApp.newTrigger('onEditRealtime').forSpreadsheet(_ss()).onEdit().create(); kq.push('onEdit vừa bật ✔'); }
    if (coGio) kq.push('quét ' + SYNC.PHUT + ' phút ✔');
    else {
      ScriptApp.newTrigger('dongBoDinhKy').timeBased().everyMinutes(SYNC.PHUT).create();
      try { _sheetTrangThai(_ss()).clear(); dongBoDinhKy(); } catch (e2) {}
      kq.push('quét ' + SYNC.PHUT + ' phút vừa bật ✔');
    }
    _rtLog('— tự cài trigger: ' + kq.join(', ') + ' —');
    return kq.join('  ·  ');
  } catch (e) {
    return 'chưa bật được (' + e.message + ')';
  }
}

function kiemTraDongBo() {
  var ss = _ss(), L = [];

  var trg = ScriptApp.getProjectTriggers().filter(function (t) {
    var f = t.getHandlerFunction();
    return f === 'onEditRealtime' || f === 'onEditDashboard';
  });
  L.push('1. Trigger onEdit cài đặt : ' + (trg.length
    ? 'CÓ (' + trg.length + ') ✔'
    : 'KHÔNG CÓ ✕  ← bấm "⚡ BẬT đồng bộ realtime".'));

  var tgio = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'dongBoDinhKy';
  });
  L.push('1b. Quét định kỳ ' + SYNC.PHUT + ' phút : ' + (tgio.length
    ? 'CÓ ✔ — kể cả onEdit không nổ thì tối đa ' + SYNC.PHUT + ' phút sau vẫn đồng bộ'
    : 'KHÔNG CÓ ✕  ← bấm "⏱ BẬT quét định kỳ". ĐÂY là cách chắc ăn nhất.'));

  // Tên tab sheet có đúng như CFG không
  var ten = ss.getSheets().map(function (s) { return s.getName(); });
  var coMap = ten.some(function (x) { return _tenChuan(x) === _tenChuan(CFG.MAP.SHEET); });
  var coGia = ten.some(function (x) { return _tenChuan(x) === _tenChuan(CFG.PRICE.SHEET); });
  L.push('2. Tab "' + CFG.MAP.SHEET + '"   : ' + (coMap ? 'tìm thấy ✔' : 'KHÔNG THẤY ✕'));
  L.push('   Tab "' + CFG.PRICE.SHEET + '" : ' + (coGia ? 'tìm thấy ✔' : 'KHÔNG THẤY ✕'));

  var MP = null;
  try { MP = _docMapping(ss); } catch (e) { L.push('3. Đọc sheet mapping : LỖI ✕  ' + e.message); }
  if (MP) {
    L.push('3. Sheet mapping — cột đang dùng:');
    L.push('     Tên hàng=' + MP.cols.key + '  ·  Level 2=' + MP.cols.lv2 + '  ·  Nhãn hiệu=' + MP.cols.brand);
    L.push('     Xuất xứ=' + MP.cols.country + '  ·  Số chiếc/hộp=' + MP.cols.pcs +
           '  ·  Tên hãng=' + (MP.cols.hang || '(không có)'));
    L.push('     Số khóa Tên hàng: ' + MP.soKhoa + '  ·  ô Số chiếc/hộp bất thường: ' + MP.nghiNgo.length);
  }

  // Đối chiếu nhãn hiệu giữa 2 sheet — nguyên nhân hay gặp thứ 2
  try {
    var P = _docGiaBanLe(ss);
    var sh = _sheet(ss, CFG.DATA.SHEET);
    var n = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
    var brd = _cot(sh, CFG.DATA.OUT_BRAND, n), lv1 = _cot(sh, CFG.DATA.LV1, n);
    var coTD = {};
    for (var i = 0; i < n; i++) {
      if (String(lv1[i][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) continue;
      var b = _norm(brd[i][0]); if (b) coTD[b] = 1;
    }
    var lech = [];
    P.rows.forEach(function (r) {
      var b2 = _norm(r.brand);
      if (b2 && !coTD[b2] && lech.length < 8) lech.push(r.brand);
    });
    L.push('4. Nhãn hiệu có ở "' + CFG.PRICE.SHEET + '" nhưng KHÔNG có dòng Composite nào trong ' +
           CFG.DATA.SHEET + ': ' + (lech.length ? lech.join(', ') + (lech.length >= 8 ? ' …' : '') : 'không có ✔'));
  } catch (e3) { L.push('4. Đối chiếu nhãn hiệu : LỖI ' + e3.message); }

  try {
    var sh2 = _sheet(ss, CFG.DATA.SHEET);
    L.push('5. Total data — Tên hàng=' + CFG.DATA.KEY + '  ·  Tên hãng=' + _chuCot(_cotHang(sh2)) +
           '  ·  ' + (sh2.getLastRow() - CFG.DATA.FIRST_ROW + 1) + ' dòng');
  } catch (e2) { L.push('5. Total data : LỖI ✕  ' + e2.message); }

  L.push('6. Dashboard : ' + (ss.getSheetByName(CFG.DASH.SRC)
    ? 'chạy bằng công thức ✔ — tự cập nhật' : 'chưa dựng ✕'));
  L.push('');
  L.push('👉 Nếu mục 1 và 2 đều ✔ mà vẫn không đổi: mở "📜 Nhật ký realtime" xem trigger có nổ không.');

  SpreadsheetApp.getUi().alert('Kiểm tra đồng bộ realtime', L.join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ---------- Bộ điều phối onEdit ---------- */

function onEditRealtime(e) {
  var ten = '';
  try { ten = e.range.getSheet().getName() + '!' + e.range.getA1Notation(); } catch (x) { ten = '(không đọc được ô)'; }
  _rtLog('trigger nổ tại ' + ten);

  try {
    if (!e || !e.range) return;
    var t = _tenChuan(e.range.getSheet().getName());
    if (t === _tenChuan(CFG.MAP.SHEET))   { _rtSuaMapping(e); return; }
    if (t === _tenChuan(CFG.PRICE.SHEET)) { _rtSuaGia(e);     return; }
    _rtLog('   ↳ bỏ qua: không phải sheet nguồn');
  } catch (err) {
    Logger.log(err);
    _rtLog('   ↳ LỖI: ' + (err && err.message ? err.message : err));
    try { _toast('Đồng bộ realtime lỗi: ' + err.message, 'Realtime'); } catch (e2) {}
  }
}

function onEditDashboard(e) { onEditRealtime(e); }

/* ---------- A. Sửa sheet mapping nhãn hiệu ---------- */

function _rtSuaMapping(e) {
  var rg = e.range;
  var r1 = rg.getRow(), r2 = r1 + rg.getNumRows() - 1;
  if (r2 < CFG.MAP.FIRST_ROW) { _rtLog('   ↳ bỏ qua: sửa vùng tiêu đề'); return; }
  r1 = Math.max(r1, CFG.MAP.FIRST_ROW);

  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(RT.LOCK_MS)) { _rtLog('   ↳ bỏ qua: file đang bận (lock)'); return; }
  try {
    var ss = _ss();
    var MP = _docMapping(ss);
    var cKey = _idx(MP.cols.key), cBrand = _idx(MP.cols.brand);
    var shM = _sheet(ss, CFG.MAP.SHEET);
    var nR = r2 - r1 + 1;
    var kv = shM.getRange(r1, cKey,   nR, 1).getValues();
    var bv = shM.getRange(r1, cBrand, nR, 1).getValues();

    var keys = {}, brands = {};
    for (var i = 0; i < nR; i++) {
      var k = _chuanHoa(kv[i][0]); if (k) keys[k] = 1;
      var b = _norm(bv[i][0]);     if (b) brands[b] = 1;
    }
    // Sửa 1 ô ⇒ phải tính lại cả nhóm CŨ, nếu không các dòng mang tên hàng /
    // nhãn hiệu cũ sẽ mắc kẹt số liệu cũ.
    if (rg.getNumRows() === 1 && rg.getNumColumns() === 1 && e.oldValue !== undefined) {
      var c = rg.getColumn();
      if (c === cKey)   { var ok = _chuanHoa(e.oldValue); if (ok) keys[ok] = 1; }
      if (c === cBrand) { var ob = _norm(e.oldValue);     if (ob) brands[ob] = 1; }
    }

    var kq = _rtChayLai({ keys: keys, brands: brands, mapping: true, gia: true, MP: MP });
    if (kq.dong === 0) {
      _rtLog('   ↳ 0 dòng khớp (tên hàng / nhãn hiệu vừa sửa không có trong Total data)');
      _toast('Không có dòng Composite nào trong "' + CFG.DATA.SHEET +
             '" trùng tên hàng / nhãn hiệu vừa sửa.', 'Realtime');
      return;
    }
    _rtLog('   ↳ đồng bộ ' + kq.dong + ' dòng (mapping + giá)');
    _rtBaoXong(kq, 'mapping');
  } finally { lock.releaseLock(); }
}

/* ---------- B. Sửa sheet Giá bán lẻ ---------- */

function _rtSuaGia(e) {
  var rg = e.range;
  var r1 = rg.getRow(), r2 = r1 + rg.getNumRows() - 1;
  if (r2 < CFG.PRICE.FIRST_ROW) { _rtLog('   ↳ bỏ qua: sửa vùng tiêu đề'); return; }
  r1 = Math.max(r1, CFG.PRICE.FIRST_ROW);

  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(RT.LOCK_MS)) { _rtLog('   ↳ bỏ qua: file đang bận (lock)'); return; }
  try {
    var ss = _ss(), shP = _sheet(ss, CFG.PRICE.SHEET);
    var cBrand = _idx(CFG.PRICE.BRAND), cHang = _idx(CFG.PRICE.COMPANY), cLv2 = _idx(CFG.PRICE.LV2);
    var nR = r2 - r1 + 1;
    var c1 = Math.min(cHang, cBrand, cLv2), c2 = Math.max(cHang, cBrand, cLv2);
    var v = shP.getRange(r1, c1, nR, c2 - c1 + 1).getValues();

    var brands = {}, cap = {};
    for (var i = 0; i < nR; i++) {
      var b = _norm(v[i][cBrand - c1]); if (b) brands[b] = 1;
      var h = _norm(v[i][cHang - c1]), l = _norm(v[i][cLv2 - c1]);
      if (h && l) cap[h + '|' + l] = 1;      // dự phòng: khớp theo Tên hãng + Phân loại
    }
    if (rg.getNumRows() === 1 && rg.getNumColumns() === 1 &&
        rg.getColumn() === cBrand && e.oldValue !== undefined) {
      var ob = _norm(e.oldValue); if (ob) brands[ob] = 1;
    }
    if (!Object.keys(brands).length && !Object.keys(cap).length) {
      _rtLog('   ↳ 0: dòng vừa sửa không có Tên nhãn hiệu lẫn Tên hãng');
      _toast('Dòng vừa sửa ở "' + CFG.PRICE.SHEET + '" chưa có Tên nhãn hiệu — chưa biết cập nhật cho nhãn nào.', 'Realtime');
      return;
    }

    var kq = _rtChayLai({ keys: null, brands: brands, cap: cap, mapping: false, gia: true });
    if (kq.dong === 0) {
      _rtLog('   ↳ 0 dòng khớp — nhãn hiệu ở 2 sheet không trùng nhau');
      _toast('Không có dòng Composite nào mang nhãn hiệu vừa sửa giá.\n' +
             'Kiểm tra Tên nhãn hiệu ở "' + CFG.PRICE.SHEET + '" có viết giống cột ' +
             CFG.DATA.OUT_BRAND + ' của Total data không.', 'Realtime');
      return;
    }
    _rtLog('   ↳ đồng bộ giá cho ' + kq.dong + ' dòng');
    _rtBaoXong(kq, 'gia');
  } finally { lock.releaseLock(); }
}

/* ---------- Lõi: tính lại một tập dòng của Total data ---------- */

/**
 * opt = { keys:{normKey:1}|null, brands:{normBrand:1}|null, cap:{hang|lv2:1}|null,
 *         mapping:bool, gia:bool, MP:<kết quả _docMapping> }
 * Dòng được chọn khi là Composite VÀ khớp một trong ba tiêu chí trên.
 */
function _rtChayLai(opt) {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var n = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  if (n <= 0) return { dong: 0 };

  var lv1 = _cot(sh, CFG.DATA.LV1, n),
      keyC = _cot(sh, CFG.DATA.KEY, n),
      brdC = _cot(sh, CFG.DATA.OUT_BRAND, n),
      lv2C0 = _cot(sh, CFG.DATA.OUT_LV2, n);
  var colHangTD = _cotHang(sh);
  var hangTD0 = sh.getRange(CFG.DATA.FIRST_ROW, colHangTD, n, 1).getValues();

  var rows = [];
  for (var i = 0; i < n; i++) {
    if (String(lv1[i][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) continue;
    var chon = false;
    if (opt.keys)            { var k = _chuanHoa(keyC[i][0]); if (k && opt.keys[k])   chon = true; }
    if (!chon && opt.brands) { var b = _norm(brdC[i][0]);     if (b && opt.brands[b]) chon = true; }
    if (!chon && opt.cap) {
      var kc = _norm(hangTD0[i][0]) + '|' + _norm(lv2C0[i][0]);
      if (opt.cap[kc]) chon = true;
    }
    if (chon) rows.push(i);
  }
  if (!rows.length) return { dong: 0 };
  if (rows.length > RT.MAX_ROWS) {
    _toast('Thay đổi này ảnh hưởng ' + _fmtInt(rows.length) + ' dòng (> ' + RT.MAX_ROWS + ').\n' +
           'Realtime bỏ qua để tránh treo file — hãy chạy Bảng điều khiển một lần.', 'Realtime');
    return { dong: 0, qua: true };
  }

  var stat = { khop: 0, thieu: 0, giaChinh: 0, giaPhu: 0, giaNH: 0, giaKhong: 0 };

  /* --- A. Mapping: BA / BC / BG / BH / BI --- */
  if (opt.mapping) {
    var MP = opt.MP || _docMapping(ss);
    var map = MP.map, pcsBrand = MP.pcsBrand;
    var qty  = _cot(sh, CFG.DATA.QTY, n);
    var lv2C = lv2C0,
        ctyC = _cot(sh, CFG.DATA.OUT_COUNTRY, n),
        boxC = _cot(sh, CFG.DATA.OUT_PCS_BOX, n);

    var vL = [], vB = [], vC = [], vX = [], vP = [], vH = [], bgs = [];
    var w = _idx(CFG.HL_COL_TO) - _idx(CFG.HL_COL_FROM) + 1;
    var hangTD = MP.coCotHang ? hangTD0 : null;

    rows.forEach(function (i) {
      var key = _chuanHoa(keyC[i][0]);
      var rec = key ? map[key] : null;

      if (!rec) {
        stat.thieu++;
        vL.push(lv2C[i][0]); vB.push(brdC[i][0]); vC.push(ctyC[i][0]);
        if (hangTD) vH.push(hangTD[i][0]);
        if (CFG.XOA_KHI_KHONG_KHOP) { vX.push(''); vP.push(''); }
        else {
          vX.push(boxC[i][0]);
          var b0 = _num(boxC[i][0]), q0 = _num(qty[i][0]);
          vP.push((b0 > 0 && q0 > 0) ? b0 * q0 : '');
        }
        bgs.push(_rowBg(w, CFG.HL_COLOR));
        return;
      }

      stat.khop++;
      var nL = _val(rec.lv2), nB = _val(rec.brand), nC = _val(rec.country);
      var kq = _tinhBH_BI(_pcsCuaDong(rec, pcsBrand), qty[i][0]);

      vL.push(nL); vB.push(nB); vC.push(nC !== '' ? nC : ctyC[i][0]);
      if (hangTD) {
        var nH = _val(rec.hang);
        vH.push(nH !== '' ? nH : hangTD[i][0]);
        if (nH !== '') hangTD[i][0] = nH;
      }
      vX.push(kq.bh); vP.push(kq.bi);
      bgs.push(_rowBg(w, kq.hopLe ? null : CFG.HL_COLOR));

      brdC[i][0] = nB;
      lv2C[i][0] = nL;
    });

    _rtGhiCot(sh, CFG.DATA.OUT_LV2,     rows, vL);
    _rtGhiCot(sh, CFG.DATA.OUT_BRAND,   rows, vB);
    _rtGhiCot(sh, CFG.DATA.OUT_COUNTRY, rows, vC);
    _rtGhiCot(sh, CFG.DATA.OUT_PCS_BOX, rows, vX);
    _rtGhiCot(sh, CFG.DATA.OUT_PCS,     rows, vP);
    if (hangTD) _rtGhiCot(sh, _chuCot(colHangTD), rows, vH);
    if (CFG.HIGHLIGHT) _rtGhiNen(sh, rows, bgs, w);
  }

  /* --- B. Giá: BM / BN / BO / BP / BQ --- */
  if (opt.gia) {
    var P = _docGiaBanLe(ss), tiers = _layNguongGia();
    var lv2Use = lv2C0;
    var pcsB   = _cot(sh, CFG.DATA.OUT_PCS, n);

    var gV = [], gU = [], gL = [], gT = [], gX = [];
    rows.forEach(function (i) {
      var b = _val(brdC[i][0]);
      if (!b) { gV.push(''); gU.push(''); gL.push(''); gT.push(''); gX.push(''); return; }

      var h = _val(hangTD0[i][0]), l = _val(lv2Use[i][0]);
      var d = _doGia(P, h, b, l);
      if (d.tang === 1) stat.giaChinh++;
      else if (d.tang === 2) stat.giaPhu++;
      else if (d.tang === 3) stat.giaNH++;

      if (!d.hit) {
        stat.giaKhong++;
        gV.push(''); gU.push(''); gL.push(''); gT.push(''); gX.push('');
        return;
      }
      var usd = d.hit.gia / CFG.FX, q = _num(pcsB[i][0]);
      gV.push(d.hit.gia); gU.push(usd); gL.push(d.hit.url || '');
      gT.push(_phanKhuc(l, d.hit.gia, tiers));
      gX.push(q > 0 ? q * usd : '');
    });

    _rtGhiCot(sh, CFG.DATA.OUT_PRICE_V, rows, gV);
    _rtGhiCot(sh, CFG.DATA.OUT_PRICE_U, rows, gU);
    _rtGhiCot(sh, CFG.DATA.OUT_URL,     rows, gL);
    _rtGhiCot(sh, CFG.DATA.OUT_TIER,    rows, gT);
    _rtGhiCot(sh, CFG.DATA.OUT_VALUE,   rows, gX);
  }

  return { dong: rows.length, stat: stat };
}

/** Ghi 1 cột theo các đoạn dòng LIỀN NHAU → ít lệnh setValues nhất có thể. */
function _rtGhiCot(sh, letter, rows, vals) {
  var col = _idx(letter), i = 0;
  while (i < rows.length) {
    var j = i;
    while (j + 1 < rows.length && rows[j + 1] === rows[j] + 1) j++;
    var block = [];
    for (var t = i; t <= j; t++) block.push([vals[t]]);
    sh.getRange(CFG.DATA.FIRST_ROW + rows[i], col, block.length, 1).setValues(block);
    i = j + 1;
  }
}

function _rtGhiNen(sh, rows, bgs, w) {
  var col = _idx(CFG.HL_COL_FROM), i = 0;
  while (i < rows.length) {
    var j = i;
    while (j + 1 < rows.length && rows[j + 1] === rows[j] + 1) j++;
    sh.getRange(CFG.DATA.FIRST_ROW + rows[i], col, j - i + 1, w)
      .setBackgrounds(bgs.slice(i, j + 1));
    i = j + 1;
  }
}

function _rtBaoXong(kq, loai) {
  var s = kq.stat;
  var msg = 'Đã đồng bộ ' + _fmtInt(kq.dong) + ' dòng trong "' + CFG.DATA.SHEET + '".';
  if (loai === 'mapping') msg += '\nKhớp mapping: ' + s.khop + '  ·  Thiếu: ' + s.thieu;
  msg += '\nCó giá: ' + (s.giaChinh + s.giaPhu + s.giaNH) + '  ·  Không có giá: ' + s.giaKhong;
  msg += '\nDashboard tự cập nhật theo (chạy bằng công thức).';
  _toast(msg, 'Realtime');
}

/* ---------- Đồng bộ TAY (không cần trigger) ---------- */

function dongBoTheoNhanHieu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Đồng bộ TAY 1 nhãn hiệu',
    'Gõ Tên nhãn hiệu đúng như ở sheet "' + CFG.PRICE.SHEET + '" (ví dụ: MANI Flo-V).\n' +
    'Script sẽ tính lại mapping + giá cho mọi dòng Composite mang nhãn hiệu này.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var ten = _val(r.getResponseText());
  if (!ten) return;

  var brands = {}; brands[_norm(ten)] = 1;
  var kq = _rtChayLai({ keys: null, brands: brands, mapping: true, gia: true });
  if (!kq.dong) {
    ui.alert('Không tìm thấy dòng nào',
      'Không có dòng Composite nào trong "' + CFG.DATA.SHEET + '" có cột ' + CFG.DATA.OUT_BRAND +
      ' = "' + ten + '".\n\nHai khả năng:\n' +
      '  • Gõ khác cách viết trong Total data (thừa/thiếu dấu cách, gạch nối…)\n' +
      '  • Nhãn hiệu này chưa được mapping từ "' + CFG.MAP.SHEET + '"',
      ui.ButtonSet.OK);
    return;
  }
  var s = kq.stat;
  ui.alert('Xong',
    'Đã đồng bộ ' + _fmtInt(kq.dong) + ' dòng cho "' + ten + '".\n' +
    'Khớp mapping: ' + s.khop + '  ·  Thiếu mapping: ' + s.thieu + '\n' +
    'Có giá: ' + (s.giaChinh + s.giaPhu + s.giaNH) + '  ·  Không có giá: ' + s.giaKhong,
    ui.ButtonSet.OK);
}

function dongBoToanBo() {
  dienDuLieuTuMapping();
  mappingGiaBanLe();
  var tr = _baoDamTrigger();
  _toast('Đã đồng bộ lại toàn bộ mapping + giá.\nĐồng bộ realtime: ' + tr, 'Xong');
}

/* ==================================================================
 * QUÉT ĐỊNH KỲ — LƯỚI AN TOÀN CHO ĐỒNG BỘ
 * ------------------------------------------------------------------
 * onEdit CHỈ nổ khi người dùng GÕ hoặc DÁN trực tiếp vào ô. Nó KHÔNG nổ khi:
 *   • ô ở sheet nguồn là CÔNG THỨC và giá trị đổi do tính lại
 *   • dữ liệu được ghi bằng script, bằng Sheets API, hoặc import từ nơi khác
 *   • trigger bị Google gỡ sau khi thu hồi quyền / đổi chủ sở hữu file
 * Ba trường hợp đó đều im lặng, không báo lỗi — nên chỉ dựa vào onEdit là
 * không đủ. Hàm dưới đây chạy theo GIỜ (mỗi 5 phút), so "dấu vết" từng dòng
 * của 2 sheet nguồn với lần quét trước, và chỉ đồng bộ đúng những Tên hàng /
 * Nhãn hiệu đã đổi. Không phụ thuộc onEdit, không quét lại cả file.
 *
 * Dấu vết lưu ở sheet ẩn _SyncState: cột A = từng dòng sheet mapping,
 * cột B = từng dòng sheet giá. Xoá sheet này = quét lại từ đầu.
 * ================================================================== */

var SYNC = { SHEET: '_SyncState', PHUT: 5 };

function _sheetTrangThai(ss) {
  var s = ss.getSheetByName(SYNC.SHEET);
  if (!s) {
    s = ss.insertSheet(SYNC.SHEET);
    s.getRange('A1').setValue('');
    try { s.hideSheet(); } catch (e) {}
  }
  return s;
}

/** Một dòng mapping → "khóa Tên hàng ¤ nhãn hiệu chuẩn hoá ¤ toàn bộ giá trị". */
function _dauVetMapping(ss) {
  var sh = _sheet(ss, CFG.MAP.SHEET);
  var n = sh.getLastRow() - CFG.MAP.FIRST_ROW + 1;
  if (n <= 0) return [];
  var c = _docMapping(ss).cols;
  var ds = [c.key, c.lv2, c.brand, c.country, c.pcs].concat(c.hang ? [c.hang] : []);
  var ix = ds.map(_idx);
  var c1 = Math.min.apply(null, ix), c2 = Math.max.apply(null, ix);
  var v = sh.getRange(CFG.MAP.FIRST_ROW, c1, n, c2 - c1 + 1).getValues();
  var out = [];
  for (var r = 0; r < n; r++) {
    var k = _chuanHoa(v[r][_idx(c.key) - c1]);
    if (!k) { out.push(['']); continue; }
    out.push([k + '¤' + _norm(v[r][_idx(c.brand) - c1]) + '¤' +
      ix.map(function (x) { return _val(v[r][x - c1]); }).join('§')]);
  }
  return out;
}

/** Một dòng giá → "nhãn hiệu chuẩn hoá ¤ hãng § nhãn § loại § giá § url". */
function _dauVetGia(ss) {
  var sh = _sheet(ss, CFG.PRICE.SHEET);
  var n = sh.getLastRow() - CFG.PRICE.FIRST_ROW + 1;
  if (n <= 0) return [];
  var ds = [CFG.PRICE.COMPANY, CFG.PRICE.BRAND, CFG.PRICE.LV2, CFG.PRICE.PRICE, CFG.PRICE.URL];
  var ix = ds.map(_idx);
  var c1 = Math.min.apply(null, ix), c2 = Math.max.apply(null, ix);
  var v = sh.getRange(CFG.PRICE.FIRST_ROW, c1, n, c2 - c1 + 1).getValues();
  var out = [];
  for (var r = 0; r < n; r++) {
    var b = _norm(v[r][_idx(CFG.PRICE.BRAND) - c1]);
    var h = _val(v[r][_idx(CFG.PRICE.COMPANY) - c1]);
    if (!b && !h) { out.push(['']); continue; }
    out.push([b + '¤' + ix.map(function (x) { return _val(v[r][x - c1]); }).join('§')]);
  }
  return out;
}

/** Trả về dấu vết của các dòng ĐÃ ĐỔI — lấy cả bản CŨ lẫn bản MỚI.
 *  Phải lấy cả bản cũ: đổi tên nhãn hiệu từ A sang B thì các dòng Total data
 *  đang mang tên A cũng cần được tính lại, không chỉ tên B. */
function _soSanhDauVet(cu, moi) {
  var n = Math.max(cu.length, moi.length), doi = [];
  for (var i = 0; i < n; i++) {
    var a = (cu[i] && cu[i][0]) || '', b = (moi[i] && moi[i][0]) || '';
    if (a === b) continue;
    if (a) doi.push(a);
    if (b) doi.push(b);
  }
  return doi;
}

function dongBoDinhKy(thongBao) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return 'file đang bận, bỏ lượt này';
  try {
    var ss = _ss(), st = _sheetTrangThai(ss);
    var mMoi = _dauVetMapping(ss), gMoi = _dauVetGia(ss);

    var luu = function () {
      var h = Math.max(mMoi.length, gMoi.length, 1);
      if (st.getMaxRows() < h) st.insertRowsAfter(st.getMaxRows(), h - st.getMaxRows());
      st.clear();
      var out = [];
      for (var i = 0; i < h; i++) out.push([(mMoi[i] || [''])[0], (gMoi[i] || [''])[0]]);
      st.getRange(1, 1, out.length, 2).setValues(out);
    };

    var lastRow = st.getLastRow();
    if (lastRow < 1) { luu(); return 'đã ghi mốc so sánh lần đầu'; }

    var v = st.getRange(1, 1, lastRow, 2).getValues();
    var dM = _soSanhDauVet(v.map(function (r) { return [r[0]]; }), mMoi);
    var dG = _soSanhDauVet(v.map(function (r) { return [r[1]]; }), gMoi);
    if (!dM.length && !dG.length) return 'không có thay đổi';

    var keys = {}, brands = {};
    dM.forEach(function (s) {
      var p = s.split('¤');
      if (p[0]) keys[p[0]] = 1;
      if (p[1]) brands[p[1]] = 1;
    });
    dG.forEach(function (s) { var p = s.split('¤'); if (p[0]) brands[p[0]] = 1; });

    var kq = _rtChayLai({
      keys   : dM.length ? keys : null,
      brands : brands,
      mapping: dM.length > 0,
      gia    : true
    });
    luu();

    var tt = 'quét định kỳ: ' + (dM.length ? 'mapping ' + dM.length + ' dấu vết  ' : '') +
             (dG.length ? 'giá ' + dG.length + ' dấu vết  ' : '') + '→ đồng bộ ' + kq.dong + ' dòng';
    _rtLog(tt);
    if (thongBao) _toast('Đã đồng bộ ' + _fmtInt(kq.dong) + ' dòng trong "' + CFG.DATA.SHEET + '".', 'Quét thay đổi');
    return tt;
  } finally { lock.releaseLock(); }
}

function caiTriggerDinhKy() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dongBoDinhKy') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dongBoDinhKy').timeBased().everyMinutes(SYNC.PHUT).create();
  var st = _sheetTrangThai(_ss());
  st.clear();
  dongBoDinhKy();
  _rtLog('— đã bật quét định kỳ ' + SYNC.PHUT + ' phút —');
  SpreadsheetApp.getUi().alert('Đã bật quét định kỳ',
    'Cứ ' + SYNC.PHUT + ' phút script sẽ tự dò 2 sheet nguồn và đồng bộ những dòng đã đổi ' +
    'sang "' + CFG.DATA.SHEET + '" — kể cả khi onEdit không nổ.\n\n' +
    'Vừa ghi mốc so sánh cho hiện trạng, nên những thay đổi TRƯỚC lúc này sẽ không được ' +
    'nhận diện. Hãy chạy "🔁 Đồng bộ TAY toàn bộ" một lần ngay bây giờ cho chắc.\n\n' +
    'Muốn đồng bộ ngay không chờ đủ ' + SYNC.PHUT + ' phút thì bấm "🔍 QUÉT THAY ĐỔI & đồng bộ NGAY".',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function tatTriggerDinhKy() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dongBoDinhKy') { ScriptApp.deleteTrigger(t); n++; }
  });
  _toast(n ? 'Đã tắt quét định kỳ (' + n + ' trigger).' : 'Chưa có trigger quét định kỳ nào.', 'Đồng bộ');
}

function quetThayDoiNgay() {
  var r = dongBoDinhKy(true);
  SpreadsheetApp.getUi().alert('Quét thay đổi', 'Kết quả: ' + r, SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ==================================================================
 * TIỆN ÍCH
 * ================================================================== */

function _ss() { return CFG.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

function _sheet(ss, ten) {
  var sh = ss.getSheetByName(ten);
  if (!sh) {
    // dò lại theo tên đã chuẩn hoá — cứu trường hợp tab thừa khoảng trắng
    var t = _tenChuan(ten);
    var found = ss.getSheets().filter(function (s) { return _tenChuan(s.getName()) === t; })[0];
    if (found) return found;
    throw new Error('Không tìm thấy sheet "' + ten + '".');
  }
  return sh;
}

function _lamMoiSheet(ss, ten) {
  var s = ss.getSheetByName(ten);
  if (!s) s = ss.insertSheet(ten); else s.clear();
  return s;
}

function _idx(letter) {
  var s = String(letter).toUpperCase(), n = 0;
  for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
  return n;
}

function _normDau(v) {
  var s = String(v === null || v === undefined ? '' : v);
  if (s.normalize) s = s.normalize('NFC');
  return s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function _cotHang(sh) {
  var c;
  if (CFG.DATA.COMPANY) c = _idx(CFG.DATA.COMPANY);
  else c = _doCot(sh, CFG.DATA.HDR_COMPANY, 'Tên hãng');
  if (c === _idx(CFG.DATA.KEY)) {
    throw new Error('Cột "Tên hãng" đang trỏ trúng cột "Tên hàng" (' + CFG.DATA.KEY + '). ' +
      'Sửa CFG.DATA.COMPANY thành đúng chữ cái cột Tên hãng (mặc định BF).');
  }
  return c;
}

function _doCot(sh, ten, nhan) {
  var last = sh.getLastColumn();
  var hdr = sh.getRange(CFG.DATA.HEADER_ROW, 1, 1, last).getValues()[0];
  var i, j;
  for (i = 0; i < hdr.length; i++) {
    var hd = _normDau(hdr[i]); if (!hd) continue;
    for (j = 0; j < ten.length; j++) if (hd === _normDau(ten[j])) return i + 1;
  }
  for (i = 0; i < hdr.length; i++) {
    var hd2 = _normDau(hdr[i]); if (!hd2) continue;
    for (j = 0; j < ten.length; j++) if (hd2.indexOf(_normDau(ten[j])) >= 0) return i + 1;
  }
  for (i = 0; i < hdr.length; i++) {
    var h = _norm(hdr[i]); if (!h) continue;
    for (j = 0; j < ten.length; j++) if (h === _norm(ten[j])) return i + 1;
  }
  throw new Error('Không dò được cột "' + nhan + '" ở dòng tiêu đề ' + CFG.DATA.HEADER_ROW +
                  ' của sheet "' + CFG.DATA.SHEET + '". Hãy kiểm tra tên tiêu đề hoặc thêm biến thể vào CFG.DATA.HDR_*.');
}

function _cot(sh, letter, nRows) { return sh.getRange(CFG.DATA.FIRST_ROW, _idx(letter), nRows, 1).getValues(); }

function _setCot(sh, letter, values) {
  if (!values.length) return;
  sh.getRange(CFG.DATA.FIRST_ROW, _idx(letter), values.length, 1).setValues(values);
}

function _trong(v) { return v === '' || v === null || v === undefined; }
function _val(v) { return (v === null || v === undefined) ? '' : String(v).replace(/\u00A0/g, ' ').trim(); }
function _num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v === null || v === undefined ? '' : v).replace(/\u00A0/g, ' ').trim();
  if (!s) return 0;
  var m = s.match(/-?\d+(?:[.,]\d+)*/);
  if (!m) return 0;
  var t = m[0];
  if (/^-?\d{1,3}(?:[.,]\d{3})+$/.test(t)) t = t.replace(/[.,]/g, '');
  else t = t.replace(/,/g, '.');
  var n = parseFloat(t);
  return isFinite(n) ? n : 0;
}

function _soChiecHop(v) {
  if (v === null || v === undefined || String(v).trim() === '') return { n: 0, tho: '', nghi: false, ly: 'trống' };
  var tho = String(v).trim();
  if (typeof v === 'number') {
    var ok = v > 0 && v <= CFG.MAX_PCS_BOX;
    return { n: v, tho: tho, nghi: !ok, ly: ok ? '' : (v <= 0 ? '≤ 0' : '> ' + CFG.MAX_PCS_BOX) };
  }
  var ints = tho.match(/\d+(?:[.,]\d{3})*(?![.,]\d)/g) || [];
  var n = ints.length ? _num(ints[0]) : _num(tho);
  var okS = n > 0 && n <= CFG.MAX_PCS_BOX;
  return { n: n, tho: tho, nghi: !okS, ly: okS ? '' : (n <= 0 ? 'không đọc được số' : '> ' + CFG.MAX_PCS_BOX) };
}

function _chuanHoa(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  if (!CFG.NORMALIZE_KEY) return s.trim();
  if (s.normalize) s = s.normalize('NFC');
  return s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function _norm(v) {
  var s = String(v === null || v === undefined ? '' : v);
  if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function _laMani(s) { return _norm(s).indexOf('mani') === 0 || _norm(s) === 'mani'; }

function _docMapping(ss) {
  var sh = _sheet(ss, CFG.MAP.SHEET);
  var n = sh.getLastRow() - CFG.MAP.FIRST_ROW + 1;
  if (n <= 0) throw new Error('Sheet mapping không có dữ liệu.');

  var last = sh.getLastColumn();
  var hdr = sh.getRange(CFG.MAP.HEADER_ROW, 1, 1, last).getValues()[0];
  var find = function (names, fallback) {
    var c, n;
    for (var p = 0; p < 2; p++) {
      for (c = 0; c < hdr.length; c++) {
        var h = _normDau(hdr[c]); if (!h) continue;
        for (n = 0; n < names.length; n++) {
          var t = _normDau(names[n]);
          if (p === 0 ? h === t : h.indexOf(t) >= 0) return c + 1;
        }
      }
    }
    for (c = 0; c < hdr.length; c++) {
      var h3 = _norm(hdr[c]); if (!h3) continue;
      for (n = 0; n < names.length; n++) if (h3 === _norm(names[n])) return c + 1;
    }
    return _idx(fallback);
  };
  var cH = 0;
  (function () {
    for (var p2 = 0; p2 < 2; p2++) {
      for (var c2 = 0; c2 < hdr.length; c2++) {
        var h2 = _normDau(hdr[c2]); if (!h2) continue;
        for (var n2 = 0; n2 < CFG.MAP.HDR.COMPANY.length; n2++) {
          var t2 = _normDau(CFG.MAP.HDR.COMPANY[n2]);
          if (p2 === 0 ? h2 === t2 : h2.indexOf(t2) >= 0) { cH = c2 + 1; return; }
        }
      }
    }
  })();

  var cK = find(CFG.MAP.HDR.KEY, CFG.MAP.KEY),
      cL = find(CFG.MAP.HDR.LV2, CFG.MAP.LV2),
      cB = find(CFG.MAP.HDR.BRAND, CFG.MAP.BRAND),
      cC = find(CFG.MAP.HDR.COUNTRY, CFG.MAP.COUNTRY),
      cP = find(CFG.MAP.HDR.PCS, CFG.MAP.PCS);

  var dsCot = [cK, cL, cB, cC, cP]; if (cH) dsCot.push(cH);
  var c1 = Math.min.apply(null, dsCot), c2 = Math.max.apply(null, dsCot);
  var vals = sh.getRange(CFG.MAP.FIRST_ROW, c1, n, c2 - c1 + 1).getValues();

  var map = {}, xungDot = [], nghiNgo = [], soKhoa = 0;
  var demTheoBrand = {};
  for (var r = 0; r < n; r++) {
    var k = _chuanHoa(vals[r][cK - c1]); if (!k) continue;
    var sp = _soChiecHop(vals[r][cP - c1]);
    if (sp.nghi && sp.tho !== '') {
      nghiNgo.push({ dong: CFG.MAP.FIRST_ROW + r, ten: String(vals[r][cK - c1]).substring(0, 90),
                     brand: _val(vals[r][cB - c1]), tho: sp.tho, doc: sp.n, ly: sp.ly });
    }
    var rec = {
      lv2    : vals[r][cL - c1],
      brand  : vals[r][cB - c1],
      country: vals[r][cC - c1],
      hang   : cH ? vals[r][cH - c1] : null,
      pcs    : sp.nghi ? null : sp.n,
      pcsTho : sp.tho, pcsNghi: sp.nghi, pcsLy: sp.ly,
      dong   : CFG.MAP.FIRST_ROW + r
    };
    var nb = _norm(rec.brand);
    if (nb && sp.n > 0 && !sp.nghi) {
      var g = demTheoBrand[nb] || (demTheoBrand[nb] = { ten: _val(rec.brand), dem: {}, tong: 0 });
      g.dem[sp.n] = (g.dem[sp.n] || 0) + 1; g.tong++;
    }
    if (map[k]) {
      var o = map[k];
      if (String(o.lv2) !== String(rec.lv2) || String(o.brand) !== String(rec.brand) ||
          String(o.country) !== String(rec.country) || String(o.pcs) !== String(rec.pcs))
        xungDot.push('Dòng ' + (CFG.MAP.FIRST_ROW + r) + ': ' + String(vals[r][cK - c1]).substring(0, 80));
      continue;
    }
    map[k] = rec; soKhoa++;
  }
  var pcsBrand = {}, lechBrand = [];
  Object.keys(demTheoBrand).forEach(function (nb) {
    var g = demTheoBrand[nb], ks = Object.keys(g.dem);
    var best = null, bestN = -1;
    ks.forEach(function (v) { if (g.dem[v] > bestN) { bestN = g.dem[v]; best = Number(v); } });
    pcsBrand[nb] = best;
    if (ks.length > 1) {
      lechBrand.push({
        ten: g.ten,
        chon: best,
        chiTiet: ks.sort(function (a, b) { return g.dem[b] - g.dem[a]; })
                   .map(function (v) { return v + ' (' + g.dem[v] + ' dòng)'; }).join('  ·  ')
      });
    }
  });

  Logger.log('Mapping dùng cột: KEY=' + _chuCot(cK) + ' LV2=' + _chuCot(cL) + ' BRAND=' + _chuCot(cB) +
             ' COUNTRY=' + _chuCot(cC) + ' PCS=' + _chuCot(cP) +
             '  |  nhãn hiệu có quy cách: ' + Object.keys(pcsBrand).length +
             '  |  nhãn hiệu lệch quy cách: ' + lechBrand.length +
             '  |  ô Số chiếc/hộp nghi ngờ: ' + nghiNgo.length);
  return { map: map, soKhoa: soKhoa, xungDot: xungDot, nghiNgo: nghiNgo,
           pcsBrand: pcsBrand, lechBrand: lechBrand, coCotHang: !!cH,
           cols: { key: _chuCot(cK), lv2: _chuCot(cL), brand: _chuCot(cB), country: _chuCot(cC),
                   pcs: _chuCot(cP), hang: cH ? _chuCot(cH) : '' } };
}

function _ghiTieuDeCotMoi(sh) {
  var h = CFG.DATA.HEADER_ROW;
  var t = [
    [CFG.DATA.OUT_COUNTRY, 'Tên nước xuất xứ đầy đủ'],
    [CFG.DATA.OUT_PCS,     'số lượng ( PCS)'],
    [CFG.DATA.OUT_PRICE_V, 'Giá bán lẻ (VNĐ)'],
    [CFG.DATA.OUT_PRICE_U, 'Giá bán lẻ (USD)'],
    [CFG.DATA.OUT_URL,     'URL nguồn giá'],
    [CFG.DATA.OUT_TIER,    'Phân khúc giá'],
    [CFG.DATA.OUT_VALUE,   'Trị giá theo giá bán lẻ (USD)']
  ];
  t.forEach(function (x) {
    var c = sh.getRange(h, _idx(x[0]));
    if (!_val(c.getValue())) c.setValue(x[1]).setFontFamily('Aptos').setFontWeight('bold')
      .setFontColor(CFG.COLOR.NAVY).setBackground(CFG.COLOR.LBLUE).setWrap(true);
  });
}

function _headerStyle(rng) {
  rng.setBackground(CFG.COLOR.LBLUE).setFontWeight('bold').setFontColor(CFG.COLOR.NAVY)
     .setFontFamily('Aptos').setFontSize(10).setWrap(true)
     .setHorizontalAlignment('center').setVerticalAlignment('middle');
}

function _boiMauNhanh(sh, r0, span, missRows) {
  var cFrom = _idx(CFG.HL_COL_FROM), cTo = _idx(CFG.HL_COL_TO), w = cTo - cFrom + 1;
  var mark = {};
  missRows.forEach(function (r) { mark[r - CFG.DATA.FIRST_ROW - r0] = 1; });
  var bg = new Array(span);
  for (var i = 0; i < span; i++) {
    var row = new Array(w), col = mark[i] ? CFG.HL_COLOR : null;
    for (var j = 0; j < w; j++) row[j] = col;
    bg[i] = row;
  }
  sh.getRange(CFG.DATA.FIRST_ROW + r0, cFrom, span, w).setBackgrounds(bg);
}

function _boiMau(sh, rows) {
  if (!rows.length) return;
  var C1 = CFG.DATA.FIRST_COL, C2 = CFG.DATA.LAST_COL;
  var blocks = [], start = rows[0], prev = rows[0];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i] === prev + 1) { prev = rows[i]; continue; }
    blocks.push(C1 + start + ':' + C2 + prev); start = prev = rows[i];
  }
  blocks.push(C1 + start + ':' + C2 + prev);
  for (var j = 0; j < blocks.length; j += CFG.RANGE_CHUNK) {
    sh.getRangeList(blocks.slice(j, j + CFG.RANGE_CHUNK)).setBackground(CFG.HL_COLOR);
    SpreadsheetApp.flush();
  }
}

function xoaMauBoi() {
  var sh = _sheet(_ss(), CFG.DATA.SHEET);
  var nRows = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  if (nRows <= 0) return;
  var c1 = _idx(CFG.HL_COL_FROM), c2 = _idx(CFG.HL_COL_TO);
  sh.getRange(CFG.DATA.FIRST_ROW, c1, nRows, c2 - c1 + 1).setBackground(null);
}

function _xoaChart(sh) { sh.getCharts().forEach(function (c) { sh.removeChart(c); }); }

function _top(o) {
  var k = '', v = -1;
  Object.keys(o).forEach(function (x) { if (o[x] > v) { v = o[x]; k = x; } });
  return { k: k, v: v < 0 ? 0 : v };
}

function _fmtInt(n) { return Math.round(_num(n)).toLocaleString('vi-VN'); }
function _fmtUSD(n) { var v = _num(n); return v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : '$' + Math.round(v).toLocaleString('vi-VN'); }
function _pct(a, b) { return b > 0 ? (a / b * 100).toFixed(1) + '%' : '0%'; }

function _toast(msg, title) {
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, title || 'MMH', 15); } catch (e) {}
}

/* ==================================================================
 * PHẦN 4 — BÔI MÀU THEO PHÂN KHÚC GIÁ
 * ================================================================== */

function apDinhDangPhanKhuc() {
  var ss = _ss();
  _cfTotalData(ss);
  _cfGiaBanLe(ss);
  _toast('Đã bôi màu theo phân khúc giá: ' + CFG.TIER_LABELS.HIGH + ' / ' +
         CFG.TIER_LABELS.MID + ' / ' + CFG.TIER_LABELS.LOW, 'Phân khúc giá');
}

function _cfTotalData(ss) {
  var sh = _sheet(ss, CFG.DATA.SHEET);
  var n = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  if (n <= 0) return;

  var cFrom = _idx(CFG.DATA.OUT_PRICE_V), cTo = _idx(CFG.DATA.OUT_VALUE);
  var vung = sh.getRange(CFG.DATA.FIRST_ROW, cFrom, n, cTo - cFrom + 1);
  var a1Tier = '$' + CFG.DATA.OUT_TIER + CFG.DATA.FIRST_ROW;

  var giu = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (g) {
      return g.getColumn() === cFrom && g.getNumColumns() === (cTo - cFrom + 1);
    });
  });

  var mk = function (nhan, mau) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=' + a1Tier + '="' + nhan + '"')
      .setBackground(mau.bg).setFontColor(mau.fg).setRanges([vung]).build();
  };
  sh.setConditionalFormatRules(giu.concat([
    mk(CFG.TIER_LABELS.HIGH, CFG.TIER_COLOR.HIGH),
    mk(CFG.TIER_LABELS.MID,  CFG.TIER_COLOR.MID),
    mk(CFG.TIER_LABELS.LOW,  CFG.TIER_COLOR.LOW)
  ]));

  var cotBP = sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_TIER), n, 1);
  var giu2 = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (g) {
      return g.getColumn() === _idx(CFG.DATA.OUT_TIER) && g.getNumColumns() === 1;
    });
  });
  var mk2 = function (nhan, mau) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(nhan)
      .setBackground(mau.bg).setFontColor(mau.fg).setBold(true).setRanges([cotBP]).build();
  };
  sh.setConditionalFormatRules(giu2.concat([
    mk2(CFG.TIER_LABELS.HIGH, CFG.TIER_COLOR.HIGH),
    mk2(CFG.TIER_LABELS.MID,  CFG.TIER_COLOR.MID),
    mk2(CFG.TIER_LABELS.LOW,  CFG.TIER_COLOR.LOW)
  ]));
}

function _cfGiaBanLe(ss) {
  var sh = ss.getSheetByName(CFG.PRICE.SHEET);
  if (!sh) return;
  var n = sh.getLastRow() - CFG.PRICE.FIRST_ROW + 1;
  if (n <= 0) return;

  var t = _layNguongGia();
  var cP = _idx(CFG.PRICE.PRICE), cL = CFG.PRICE.LV2, r1 = CFG.PRICE.FIRST_ROW;
  var vung = sh.getRange(r1, _idx(CFG.PRICE.COMPANY), n, cP - _idx(CFG.PRICE.COMPANY) + 1);
  var G = '$' + CFG.PRICE.PRICE + r1, L = '$' + cL + r1;

  var sw = function (field) {
    var parts = LV2_ORDER.filter(function (l) { return t[l]; }).map(function (l) {
      return '(' + L + '="' + l + '")*' + t[l][field];
    });
    return parts.length ? '(' + parts.join('+') + ')' : '0';
  };
  var LOW = sw('low'), HIGH = sw('high');

  var giu = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (g) { return g.getColumn() === _idx(CFG.PRICE.COMPANY); });
  });
  var mk = function (fml, mau) {
    return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(fml)
      .setBackground(mau.bg).setFontColor(mau.fg).setRanges([vung]).build();
  };
  sh.setConditionalFormatRules(giu.concat([
    mk('=AND(' + G + '<>"",' + HIGH + '>0,' + G + '>=' + HIGH + ')', CFG.TIER_COLOR.HIGH),
    mk('=AND(' + G + '<>"",' + LOW + '>0,' + G + '>=' + LOW + ')',   CFG.TIER_COLOR.MID),
    mk('=AND(' + G + '<>"",' + LOW + '>0,' + G + '<'  + LOW + ')',   CFG.TIER_COLOR.LOW)
  ]));
}

/* ==================================================================
 * PHẦN 5 — BẢNG ĐIỀU KHIỂN + THANH TIẾN ĐỘ %
 * ================================================================== */

var PROP_JOB = 'MMH_JOB_STATE_V1';
var CHUNK_ROWS = 2500;

function moBangDieuKhien() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(_htmlBangDieuKhien()).setWidth(560).setHeight(560),
    'MMH Composite — Bảng điều khiển');
}

function jobPlan(job) {
  var ss = _ss(), st = { job: job, i: 0 };

  if (job === 'mapping') {
    var sh = _sheet(ss, CFG.DATA.SHEET);
    var n = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
    var lv1 = _cot(sh, CFG.DATA.LV1, n);
    var first = -1, last = -1, dem = 0;
    for (var a = 0; a < n; a++) {
      if (String(lv1[a][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) continue;
      if (first < 0) first = a; last = a; dem++;
    }
    if (first < 0) {
      var mau = [];
      for (var z = 0; z < Math.min(n, 3000); z += 400) mau.push('"' + _val(lv1[z][0]) + '"');
      throw new Error('Cột ' + CFG.DATA.LV1 + ' không có dòng nào = "' + CFG.LEVEL1_FLAG +
        '". Đang thấy: ' + mau.join(', ') + '. Chạy "Dò cột" để kiểm tra.');
    }
    st.r0 = first; st.span = last - first + 1; st.soComposite = dem;
    st.steps = Math.ceil(st.span / CHUNK_ROWS);
    st.labels = ['Đọc sheet mapping'];
    for (var i = 0; i < st.steps; i++) st.labels.push('Điền BA/BC/BG/BH/BI — lô ' + (i + 1) + '/' + st.steps);
    st.labels.push('Định dạng & tổng kết');
    st.stat = { khop: 0, thieu: 0, doiLv2: 0, doiBrand: 0, doiCty: 0, doiBox: 0, pcs: 0, xoa: 0, pcsNghi: 0 };

  } else if (job === 'gia') {
    var sh2 = _sheet(ss, CFG.DATA.SHEET);
    var n2 = sh2.getLastRow() - CFG.DATA.FIRST_ROW + 1;
    st.n = n2; st.steps = Math.ceil(n2 / CHUNK_ROWS);
    st.labels = ['Đọc sheet "' + CFG.PRICE.SHEET + '"'];
    for (var j = 0; j < st.steps; j++) st.labels.push('Đối chiếu giá — lô ' + (j + 1) + '/' + st.steps);
    st.labels.push('Bôi màu phân khúc & tổng kết');
    st.stat = { chinh: 0, phu: 0, nh: 0, khong: 0, coPcs: 0 };

  } else {
    throw new Error('Dashboard đã tách ra menu riêng: MMH Composite → 📊 DỰNG LẠI DASHBOARD THỊ PHẦN.');
  }

  st.tong = st.labels.length;
  PropertiesService.getDocumentProperties().setProperty(PROP_JOB, JSON.stringify(st));
  return { tong: st.tong, labels: st.labels };
}

function jobStep() {
  var props = PropertiesService.getDocumentProperties();
  var st = JSON.parse(props.getProperty(PROP_JOB));
  var i = st.i;

  if (st.job === 'mapping')      st = _stepMapping(st, i);
  else if (st.job === 'gia')     st = _stepGia(st, i);
  else throw new Error('Tác vụ không hợp lệ: ' + st.job);

  st.i = i + 1;
  props.setProperty(PROP_JOB, JSON.stringify(st));
  var xong = st.i >= st.tong;
  if (xong) { try { st.ketQua += '\n\nĐồng bộ realtime: ' + _baoDamTrigger(); } catch (e) {} }
  return {
    pct: Math.round(st.i / st.tong * 100),
    xong: xong,
    label: xong ? 'Hoàn tất' : st.labels[st.i],
    ketQua: xong ? (st.ketQua || 'Xong.') : ''
  };
}

function _stepMapping(st, i) {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);

  if (i === 0) { _docMapping(ss); return st; }

  if (i <= st.steps) {
    var off = (i - 1) * CHUNK_ROWS;
    var len = Math.min(CHUNK_ROWS, st.span - off);
    var row0 = CFG.DATA.FIRST_ROW + st.r0 + off;
    var MP = _docMapping(ss), map = MP.map, pcsBrand = MP.pcsBrand;
    var rd = function (L) { return sh.getRange(row0, _idx(L), len, 1).getValues(); };

    var lv1 = rd(CFG.DATA.LV1), keys = rd(CFG.DATA.KEY), luong = rd(CFG.DATA.QTY);
    var cLv2 = rd(CFG.DATA.OUT_LV2), cBrd = rd(CFG.DATA.OUT_BRAND),
        cCty = rd(CFG.DATA.OUT_COUNTRY), cBox = rd(CFG.DATA.OUT_PCS_BOX), cPcs = rd(CFG.DATA.OUT_PCS);

    var oL = [], oB = [], oC = [], oX = [], oP = [], bg = [];
    var w = _idx(CFG.HL_COL_TO) - _idx(CFG.HL_COL_FROM) + 1;

    for (var k = 0; k < len; k++) {
      var laComposite = String(lv1[k][0]).trim().toLowerCase() === CFG.LEVEL1_FLAG;
      var hang = null;
      if (laComposite) { var key = _chuanHoa(keys[k][0]); hang = key ? map[key] : null; }

      if (!laComposite) {
        oL.push([cLv2[k][0]]); oB.push([cBrd[k][0]]); oC.push([cCty[k][0]]);
        oX.push([cBox[k][0]]); oP.push([cPcs[k][0]]); bg.push(_rowBg(w, null));
        continue;
      }
      if (!hang) {
        st.stat.thieu++;
        oL.push([cLv2[k][0]]); oB.push([cBrd[k][0]]); oC.push([cCty[k][0]]);
        if (CFG.XOA_KHI_KHONG_KHOP) {
          oX.push(['']); oP.push(['']); st.stat.xoa++;
        } else {
          oX.push([cBox[k][0]]);
          var b0 = _num(cBox[k][0]), q0 = _num(luong[k][0]);
          oP.push([(b0 > 0 && q0 > 0) ? b0 * q0 : '']);
        }
        bg.push(_rowBg(w, CFG.HL_COLOR));
        continue;
      }
      st.stat.khop++;
      var vL = _val(hang.lv2), vB = _val(hang.brand), vC = _val(hang.country);
      var vX = _pcsCuaDong(hang, pcsBrand);
      if (String(cLv2[k][0]) !== String(vL)) st.stat.doiLv2++;
      if (String(cBrd[k][0]) !== String(vB)) st.stat.doiBrand++;
      if (String(cCty[k][0]) !== String(vC) && vC !== '') st.stat.doiCty++;

      oL.push([vL]); oB.push([vB]);
      oC.push([vC !== '' ? vC : cCty[k][0]]);

      var kq = _tinhBH_BI(vX, luong[k][0]);
      if (!kq.hopLe) st.stat.pcsNghi++;
      else {
        if (_num(cBox[k][0]) !== kq.bh) st.stat.doiBox++;
        if (kq.bi !== '') st.stat.pcs++;
      }
      oX.push([kq.bh]);
      oP.push([kq.bi]);
      bg.push(_rowBg(w, kq.hopLe ? null : CFG.HL_COLOR));
    }

    sh.getRange(row0, _idx(CFG.DATA.OUT_LV2),     len, 1).setValues(oL);
    sh.getRange(row0, _idx(CFG.DATA.OUT_BRAND),   len, 1).setValues(oB);
    sh.getRange(row0, _idx(CFG.DATA.OUT_COUNTRY), len, 1).setValues(oC);
    sh.getRange(row0, _idx(CFG.DATA.OUT_PCS_BOX), len, 1).setValues(oX);
    sh.getRange(row0, _idx(CFG.DATA.OUT_PCS),     len, 1).setValues(oP);
    if (CFG.HIGHLIGHT) sh.getRange(row0, _idx(CFG.HL_COL_FROM), len, w).setBackgrounds(bg);
    return st;
  }

  sh.getRange(CFG.DATA.FIRST_ROW + st.r0, _idx(CFG.DATA.OUT_PCS),     st.span, 1).setNumberFormat('#,##0');
  sh.getRange(CFG.DATA.FIRST_ROW + st.r0, _idx(CFG.DATA.OUT_PCS_BOX), st.span, 1).setNumberFormat('#,##0');
  _ghiTieuDeCotMoi(sh);
  soiSoChiecHop();
  st.ketQua =
    'Composite (cột ' + CFG.DATA.LV1 + '): ' + st.soComposite + ' dòng\n' +
    'Khớp mapping: ' + st.stat.khop + '   |   Thiếu: ' + st.stat.thieu + '\n' +
    'Ô đổi giá trị → ' + CFG.DATA.OUT_LV2 + ': ' + st.stat.doiLv2 +
    '  ·  ' + CFG.DATA.OUT_BRAND + ': ' + st.stat.doiBrand +
    '  ·  ' + CFG.DATA.OUT_COUNTRY + ': ' + st.stat.doiCty +
    '  ·  ' + CFG.DATA.OUT_PCS_BOX + ': ' + st.stat.doiBox + '\n' +
    'Tính được PCS (' + CFG.DATA.OUT_PCS + '): ' + st.stat.pcs + '\n' +
    'Xóa trắng ' + CFG.DATA.OUT_PCS_BOX + '/' + CFG.DATA.OUT_PCS + ' vì không khớp mapping: ' + st.stat.xoa + '\n' +
    'Ô mapping "Số chiếc/hộp" bất thường (bỏ qua): ' + st.stat.pcsNghi + '  → xem sheet "Soi Số chiếc-hộp"';
  return st;
}

function _pcsCuaDong(rec, pcsBrand) {
  if (CFG.PCS_THEO === 'nhanhieu') {
    var v = pcsBrand[_norm(_val(rec.brand))];
    return (v === undefined) ? null : v;
  }
  return (rec.pcs === undefined) ? null : rec.pcs;
}

function _tinhBH_BI(mapPcs, luongTho) {
  if (mapPcs === null || mapPcs === undefined || !(mapPcs > 0)) return { bh: '', bi: '', hopLe: false };
  var q = _num(luongTho);
  return { bh: mapPcs, bi: (q > 0 ? mapPcs * q : ''), hopLe: true };
}

function _rowBg(w, mau) { var r = new Array(w); for (var i = 0; i < w; i++) r[i] = mau; return r; }

function _stepGia(st, i) {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  if (i === 0) { _docGiaBanLe(ss); return st; }

  if (i <= st.steps) {
    var off = (i - 1) * CHUNK_ROWS;
    var len = Math.min(CHUNK_ROWS, st.n - off);
    var row0 = CFG.DATA.FIRST_ROW + off;
    var P = _docGiaBanLe(ss), tiers = _layNguongGia();
    var colHang = _cotHang(sh);
    var rd = function (L) { return sh.getRange(row0, _idx(L), len, 1).getValues(); };

    var lv1 = rd(CFG.DATA.LV1), brand = rd(CFG.DATA.OUT_BRAND), lv2 = rd(CFG.DATA.OUT_LV2), pcs = rd(CFG.DATA.OUT_PCS);
    var hang = sh.getRange(row0, colHang, len, 1).getValues();
    var oV = [], oU = [], oL = [], oT = [], oX = [];

    for (var k = 0; k < len; k++) {
      var laC = String(lv1[k][0]).trim().toLowerCase() === CFG.LEVEL1_FLAG;
      var b = laC ? _val(brand[k][0]) : '';
      if (!b) { oV.push(['']); oU.push(['']); oL.push(['']); oT.push(['']); oX.push(['']); continue; }

      var h = _val(hang[k][0]), l = _val(lv2[k][0]);
      var d = _doGia(P, h, b, l);
      if (d.tang === 1) st.stat.chinh++;
      else if (d.tang === 2) st.stat.phu++;
      else if (d.tang === 3) st.stat.nh++;

      if (!d.hit) {
        st.stat.khong++;
        oV.push(['']); oU.push(['']); oL.push(['']); oT.push(['']); oX.push(['']);
        continue;
      }
      var usd = d.hit.gia / CFG.FX, q = _num(pcs[k][0]);
      oV.push([d.hit.gia]); oU.push([usd]); oL.push([d.hit.url || '']);
      oT.push([_phanKhuc(l, d.hit.gia, tiers)]);
      if (q > 0) { oX.push([q * usd]); st.stat.coPcs++; } else oX.push(['']);
    }

    sh.getRange(row0, _idx(CFG.DATA.OUT_PRICE_V), len, 1).setValues(oV);
    sh.getRange(row0, _idx(CFG.DATA.OUT_PRICE_U), len, 1).setValues(oU);
    sh.getRange(row0, _idx(CFG.DATA.OUT_URL),     len, 1).setValues(oL);
    sh.getRange(row0, _idx(CFG.DATA.OUT_TIER),    len, 1).setValues(oT);
    sh.getRange(row0, _idx(CFG.DATA.OUT_VALUE),   len, 1).setValues(oX);
    return st;
  }

  var n = st.n;
  sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_PRICE_V), n, 1).setNumberFormat('#,##0');
  sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_PRICE_U), n, 1).setNumberFormat('#,##0.00');
  sh.getRange(CFG.DATA.FIRST_ROW, _idx(CFG.DATA.OUT_VALUE),   n, 1).setNumberFormat('#,##0');
  _ghiTieuDeCotMoi(sh);
  apDinhDangPhanKhuc();
  st.ketQua =
    'Khớp đủ 3 khóa (hãng+nhãn hiệu+phân loại): ' + st.stat.chinh + '\n' +
    'Khớp phụ (bỏ qua tên hãng): ' + st.stat.phu + '\n' +
    'Khớp theo nhãn hiệu (bỏ cả phân loại): ' + st.stat.nh + '\n' +
    'Không tìm được giá: ' + st.stat.khong + '\n' +
    'Tính được trị giá bán lẻ: ' + st.stat.coPcs + '   ·   FX ' + CFG.FX;
  return st;
}

function _htmlBangDieuKhien() {
  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
'*{box-sizing:border-box}body{font-family:Aptos,Segoe UI,Arial,sans-serif;font-size:13px;color:#1A1A1A;margin:0;padding:16px;background:#fff}' +
'h2{color:#003047;font-size:15px;margin:0 0 2px}p.s{color:#666;font-size:11px;margin:0 0 14px}' +
'.job{border:1px solid #D9D9D9;border-left:4px solid #003047;border-radius:6px;padding:11px 13px;margin-bottom:9px;display:flex;align-items:center;gap:12px}' +
'.job .t{flex:1}.job b{color:#003047;font-size:13px}.job span{display:block;color:#666;font-size:11px;margin-top:2px}' +
'button{padding:7px 15px;border-radius:5px;border:none;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;background:#003047;color:#fff;white-space:nowrap}' +
'button:disabled{background:#ccc;cursor:not-allowed}button.y{background:#FFE100;color:#003047}' +
'#pane{display:none;border:1px solid #D9D9D9;border-radius:6px;padding:14px;background:#F0F7FF;margin-top:6px}' +
'#lbl{font-weight:600;color:#003047;margin-bottom:8px;font-size:12px}' +
'.track{height:22px;background:#fff;border:1px solid #CFE2F3;border-radius:11px;overflow:hidden;position:relative}' +
'#bar{height:100%;width:0%;background:linear-gradient(90deg,#003047,#3A5CAA);transition:width .25s}' +
'#pctxt{position:absolute;top:0;left:0;right:0;line-height:22px;text-align:center;font-size:11px;font-weight:700;color:#003047;mix-blend-mode:difference;filter:invert(1)}' +
'#res{white-space:pre-wrap;font-size:11px;color:#003047;margin-top:10px;background:#fff;border-radius:5px;padding:9px;display:none;line-height:1.5}' +
'#err{color:#B0413E;font-size:11px;margin-top:8px;display:none;white-space:pre-wrap}' +
'.note{border:1px dashed #003047;border-radius:6px;padding:10px 12px;margin-top:12px;background:#FFF8E1;font-size:11px;line-height:1.6;color:#003047}' +
'.note b{color:#003047}' +
'</style></head><body>' +
'<h2>Bảng điều khiển</h2><p class="s">Mỗi tác vụ chạy theo lô và báo tiến độ thật (% theo số dòng đã xử lý).</p>' +
'<div id="list">' +
'<div class="job"><div class="t"><b>1 · Mapping nhãn hiệu</b><span>Lọc cột ' + CFG.DATA.LV1 + ' = Composite → điền ' +
  CFG.DATA.OUT_LV2 + ' / ' + CFG.DATA.OUT_BRAND + ' / ' + CFG.DATA.OUT_COUNTRY + ' / ' + CFG.DATA.OUT_PCS_BOX +
  ' → tính ' + CFG.DATA.OUT_PCS + '</span></div><button onclick="run(\'mapping\')">Chạy</button></div>' +
'<div class="job"><div class="t"><b>2 · Mapping giá bán lẻ</b><span>Đối chiếu Tên hãng + Nhãn hiệu + Phân loại → ' +
  CFG.DATA.OUT_PRICE_V + '–' + CFG.DATA.OUT_VALUE + ' + bôi màu phân khúc</span></div><button onclick="run(\'gia\')">Chạy</button></div>' +
'<div class="job"><div class="t"><b>Chạy tuần tự 1 → 2</b><span>Khuyến nghị cho lần chạy đầu tiên</span></div><button class="y" onclick="runAll()">Chạy cả hai</button></div>' +
'<div class="note"><b>3 · Dashboard thị phần</b> chạy ở menu riêng:<br>' +
  'Menu <b>MMH Composite → 📊 DỰNG LẠI DASHBOARD THỊ PHẦN</b>. Đổi bộ lọc dòng 4 là số đổi ngay, không cần bấm gì.<br><br>' +
  '<b>⚡ Đồng bộ realtime</b> — script TỰ BẬT sau mỗi lần chạy ở đây. Sau đó mỗi lần sửa sheet ' +
  '<b>"' + CFG.MAP.SHEET + '"</b> hoặc <b>"' + CFG.PRICE.SHEET + '"</b> thì ' +
  CFG.DATA.OUT_LV2 + '/' + CFG.DATA.OUT_BRAND + '/' + CFG.DATA.OUT_COUNTRY + '/' +
  CFG.DATA.OUT_PCS_BOX + '/' + CFG.DATA.OUT_PCS + ' và ' + CFG.DATA.OUT_PRICE_V + '–' + CFG.DATA.OUT_VALUE +
  ' của các dòng liên quan tự cập nhật.<br>' +
  'Không thấy đổi? Mở <b>📜 Nhật ký realtime</b> để biết trigger có nổ hay không.</div>' +
'</div>' +
'<div id="pane"><div id="lbl">Đang chuẩn bị…</div><div class="track"><div id="bar"></div><div id="pctxt">0%</div></div>' +
'<div id="res"></div><div id="err"></div></div>' +
'<script>' +
'var queue=[],qi=0;' +
'function ui(on){document.querySelectorAll("button").forEach(function(b){b.disabled=on;});document.getElementById("pane").style.display=on?"block":"block";}' +
'function setPct(p,l){document.getElementById("bar").style.width=p+"%";document.getElementById("pctxt").textContent=p+"%";if(l)document.getElementById("lbl").textContent=l;}' +
'function fail(e){document.getElementById("err").style.display="block";document.getElementById("err").textContent="Lỗi: "+(e&&e.message?e.message:e);ui(false);}' +
'function run(job){queue=[job];qi=0;start();}' +
'function runAll(){queue=["mapping","gia"];qi=0;start();}' +
'function start(){ui(true);document.getElementById("res").style.display="none";document.getElementById("err").style.display="none";setPct(0,"Lập kế hoạch…");' +
'google.script.run.withFailureHandler(fail).withSuccessHandler(function(p){setPct(0,p.labels[0]);tick(p.tong,0);}).jobPlan(queue[qi]);}' +
'function tick(tong,done){google.script.run.withFailureHandler(fail).withSuccessHandler(function(r){' +
'var base=qi/queue.length*100,phan=100/queue.length;setPct(Math.round(base+r.pct*phan/100),r.label);' +
'if(!r.xong){tick(tong,done+1);return;}' +
'if(r.ketQua){var d=document.getElementById("res");d.style.display="block";d.textContent+=(d.textContent?"\\n\\n":"")+r.ketQua;}' +
'qi++;if(qi<queue.length){google.script.run.withFailureHandler(fail).withSuccessHandler(function(p){tick(p.tong,0);}).jobPlan(queue[qi]);}' +
'else{setPct(100,"Hoàn tất");ui(false);}' +
'}).jobStep();}' +
'</script></body></html>';
}

/* ==================================================================
 * SOI CỘT "SỐ CHIẾC/HỘP"
 * ================================================================== */

function soiSoChiecHop() {
  var ss = _ss(), sh = _sheet(ss, CFG.DATA.SHEET);
  var n = sh.getLastRow() - CFG.DATA.FIRST_ROW + 1;
  if (n <= 0) return;

  var MP = _docMapping(ss), map = MP.map, pcsBrand = MP.pcsBrand;
  var lv1 = _cot(sh, CFG.DATA.LV1, n), keys = _cot(sh, CFG.DATA.KEY, n), luong = _cot(sh, CFG.DATA.QTY, n);
  var brd = _cot(sh, CFG.DATA.OUT_BRAND, n), box = _cot(sh, CFG.DATA.OUT_PCS_BOX, n), pcs = _cot(sh, CFG.DATA.OUT_PCS, n);

  var out = [['Dòng', 'Vấn đề', 'Tên hàng (Total data)', 'Tên nhãn hiệu', 'Dòng mapping',
              'Giá trị thô cột ' + MP.cols.pcs + ' ở mapping', 'Đọc ra được', CFG.DATA.OUT_PCS_BOX + ' đang có',
              'Lượng (' + CFG.DATA.QTY + ')', CFG.DATA.OUT_PCS + ' đang có', 'Nên là']];

  for (var i = 0; i < n; i++) {
    if (String(lv1[i][0]).trim().toLowerCase() !== CFG.LEVEL1_FLAG) continue;
    var k = _chuanHoa(keys[i][0]); if (!k) continue;
    var hit = map[k];
    var nhan = hit ? _val(hit.brand) : _val(brd[i][0]);
    var mapSo = hit ? _pcsCuaDong(hit, pcsBrand) : null;

    var bhCo = box[i][0], bhSo = _num(bhCo), q = _num(luong[i][0]), biCo = _num(pcs[i][0]);
    var nenLa = (mapSo > 0 && q > 0) ? mapSo * q : '';

    var vd = '';
    if (!hit) vd = 'Tên hàng không khớp mapping';
    else if (!nhan) vd = 'Mapping không có Tên nhãn hiệu';
    else if (mapSo === null) vd = 'Nhãn hiệu "' + nhan + '" chưa có Số chiếc/hộp hợp lệ trong mapping';
    else if (bhSo > CFG.MAX_PCS_BOX) vd = CFG.DATA.OUT_PCS_BOX + ' > ' + CFG.MAX_PCS_BOX + ' — nghi là giá trị PCS lọt sang';
    else if (bhSo !== mapSo) vd = CFG.DATA.OUT_PCS_BOX + ' lệch quy cách của nhãn hiệu';
    else if (typeof bhCo === 'string' && bhCo !== '') vd = CFG.DATA.OUT_PCS_BOX + ' đang là CHỮ, không phải số';
    else if (biCo && nenLa && Math.abs(biCo - nenLa) > 0.5) vd = CFG.DATA.OUT_PCS + ' lệch so với ' + CFG.DATA.OUT_PCS_BOX + ' × Lượng';
    if (!vd) continue;

    out.push([CFG.DATA.FIRST_ROW + i, vd, String(keys[i][0]).substring(0, 110), nhan,
              hit ? hit.dong : '', hit ? hit.pcsTho : '', mapSo === null ? '(không có)' : mapSo,
              bhCo, q, biCo || '', nenLa]);
    if (out.length > 3000) { out.push(['…', 'Cắt bớt ở 3000 dòng', '', '', '', '', '', '', '', '', '']); break; }
  }

  if (MP.lechBrand.length) {
    out.push(['', '', '', '', '', '', '', '', '', '', '']);
    out.push(['— NHÃN HIỆU CÓ NHIỀU QUY CÁCH KHÁC NHAU TRONG SHEET MAPPING —', '', '', '', '', '', '', '', '', '', '']);
    out.push(['', 'Đã chọn giá trị', 'Tên nhãn hiệu', '', '', 'Các giá trị tìm thấy (số dòng)', '', '', '', '', '']);
    MP.lechBrand.forEach(function (x) {
      out.push(['', x.chon, x.ten, '', '', x.chiTiet, '', '', '', '', '']);
    });
  }

  if (MP.nghiNgo.length) {
    out.push(['', '', '', '', '', '', '', '', '', '', '']);
    out.push(['— Ô "Số chiếc/hộp" bất thường trong sheet "' + CFG.MAP.SHEET + '" —', '', '', '', '', '', '', '', '', '', '']);
    out.push(['Dòng mapping', 'Lý do', 'Tên hàng', 'Tên nhãn hiệu', '', 'Giá trị thô', 'Đọc ra được', '', '', '', '']);
    MP.nghiNgo.slice(0, 500).forEach(function (x) {
      out.push([x.dong, x.ly, x.ten, x.brand, '', x.tho, x.doc, '', '', '', '']);
    });
  }

  var s = _lamMoiSheet(ss, 'Soi Số chiếc-hộp');
  s.getRange(1, 1, out.length, 11).setValues(out);
  _headerStyle(s.getRange(1, 1, 1, 11));
  s.setColumnWidth(2, 240); s.setColumnWidth(3, 420); s.setColumnWidth(4, 180); s.setColumnWidth(6, 200);
  s.setFrozenRows(1); s.setFrozenColumns(1);
  var body = Math.max(out.length - 1, 1);
  s.getRange(2, 2, body, 1).setBackground(CFG.HL_COLOR);
  s.getRange(2, 1, body, 11).setFontFamily('Aptos').setFontSize(9);
  return out.length - 1;
}