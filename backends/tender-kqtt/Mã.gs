/* ████████████████████████████████████████████████████████████████████████████████████████████
 *  MMH · Ophthalmic Knife Tender — BACKEND HỢP NHẤT (ALL-IN-ONE)  —  1 file .gs duy nhất
 *  ─────────────────────────────────────────────────────────────────────────────────────────
 *  PHẦN 1 — Backend gốc (doGet · buildPayload_ · writeContract_ · đã gỡ doPost cũ)
 *  PHẦN 2 — Logic làm sạch (CFG/KCFG/registry/decideKnifeType/removeDuplicateRows/onOpen…)
 *  PHẦN 3 — Upload add-on (doPost GỘP · uploadTender_ · *_Headless_ · seed KNOWN_BRANDS)
 *
 *  CÀI ĐẶT: dán TOÀN BỘ vào 1 file .gs → Deploy → New version → Deploy (giữ URL /exec).
 *  KIỂM TRA: chạy _selfCheckUploadDeps (Run → Logs) → 'OK — đủ toàn bộ dependency.'
 * ████████████████████████████████████████████████████████████████████████████████████████████ */


/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  PHẦN 1 / 3 — BACKEND GỐC (doGet · buildPayload_ · writeContract_)
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * MMH · Ophthalmic Knife Tender Market Dashboard — GAS Backend  (v2)
 * Serves real-time KQTT data from the bound Google Sheet to the HTML dashboard.
 *
 * v2 CHANGES:
 *   + Contract Duration (Month)     → row.cdur
 *   + Expiration date               → row.expdate  (formatted dd/MM/yyyy + serial for sorting)
 *   + Decision Issue Date           → row.issue    (fallback to Award Publication Date)
 *
 * Deploy:
 *   1. Tools → Script editor (or paste into the Sheet's Apps Script project).
 *   2. Set the SHEET_NAME below if your data tab differs from "Data xử lý".
 *   3. Deploy → New deployment → Type: Web app → Execute as: Me → Access: Anyone with the link.
 *   4. Copy the /exec URL into index.html (GAS_URL).
 *
 * Endpoint:
 *   GET  ?            → returns { ok:true, rows:[…], meta:{…} }
 *   GET  ?action=ping → returns { ok:true, ts:… }   (health check)
 */

var SHEET_NAME = 'Data xử lý';
var HEADER_ROW = 2;             // row 2 has the column headers (row 1 = export timestamp)
var DATE_FORMAT = 'dd/MM/yyyy';

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'ping') {
      return jsonOut({ ok: true, ts: new Date().toISOString() });
    }
    var payload = buildPayload_();
    return jsonOut(payload);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.stack || err) });
  }
}

function buildPayload_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Sheet "' + SHEET_NAME + '" not found');

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow <= HEADER_ROW) return { ok: true, rows: [], meta: { source: SHEET_NAME, nrows: 0, exported: new Date().toISOString() } };

  var headers = sh.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h == null ? '' : h).trim();
  });

  // map header → 0-based column index
  var idx = {};
  headers.forEach(function (h, i) { idx[h.toLowerCase()] = i; });

  function col(/* ...aliases */) {
    for (var i = 0; i < arguments.length; i++) {
      var name = String(arguments[i]).toLowerCase();
      if (idx[name] != null) return idx[name];
      // partial match
      for (var k in idx) { if (k.indexOf(name) >= 0) return idx[k]; }
    }
    return -1;
  }

  var cIdx = {
    pname:  col('Product Name', 'tên sản phẩm'),
    qty:    col('Quantity', 'số lượng'),
    country:col('Country of Origin', 'xuất xứ'),
    pcode:  col('Product Code', 'mã sản phẩm'),
    brandL: col('Brand Label'),
    mfr:    col('Manufacturer', 'hãng'),
    tspec:  col('Technical Specification', 'thông số'),
    price:  col('Awarded Unit Price (VND)', 'đơn giá'),
    kqtt:   col('KQTT Code', 'mã kqtt'),
    buyer:  col('Buyer (Hospital / Health Facility)', 'buyer', 'chủ đầu tư'),
    method: col('Procurement Method', 'hình thức'),
    pubDate:col('Award Publication Date'),
    year:   col('Year (duplicate)', 'year'),
    month:  col('Month', 'tháng'),
    mfrNorm:col('Manufacturer_Norm'),
    region: col('Region'),
    tier:   col('Price_Tier', 'phân khúc'),
    prov:   col('Province_Clean', 'tỉnh'),
    regionD:col('Region_by_Distributor'),
    ptype:  col('Knife Type', 'product type', 'loại sản phẩm'),
    // ── v2 new columns ──
    cdur:   col('Contract Duration (Month)', 'contract duration', 'thời hạn hợp đồng', 'thời hạn'),
    expdate:col('Expiration date', 'expiration', 'ngày hết hạn', 'hết hạn'),
    issue:  col('Decision Issue Date', 'decision issue', 'ngày ra quyết định', 'ngày quyết định', 'issue date')
  };

  var values = sh.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, lastCol).getValues();
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';

  function fmtDate(v) {
    // returns {str: 'dd/MM/yyyy', serial: <ms epoch or 0>}
    if (v instanceof Date) {
      return { str: Utilities.formatDate(v, tz, DATE_FORMAT), serial: v.getTime() };
    }
    if (typeof v === 'string' && v.trim()) {
      var s = v.trim();
      // try dd/MM/yyyy or d/M/yyyy
      var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
      if (m) {
        var d = new Date(+m[3], +m[2] - 1, +m[1]);
        return { str: Utilities.formatDate(d, tz, DATE_FORMAT), serial: d.getTime() };
      }
      var m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
      if (m2) {
        var d2 = new Date(+m2[1], +m2[2] - 1, +m2[3]);
        return { str: Utilities.formatDate(d2, tz, DATE_FORMAT), serial: d2.getTime() };
      }
      return { str: s, serial: 0 };
    }
    return { str: '', serial: 0 };
  }

  var rows = [];
  values.forEach(function (r) {
    var brand = pick_(r, cIdx.mfrNorm) || pick_(r, cIdx.mfr) || '';
    var qty = num_(pick_(r, cIdx.qty));
    var price = num_(pick_(r, cIdx.price));
    if (!brand && !qty && !price) return;

    // year & month được suy 100% từ Decision Issue Date (xem bên dưới, sau khi có issueD).
    var yr = 0, month = '';

    // ── v2 fields ──
    var cdur = num_(pick_(r, cIdx.cdur));
    var expD = fmtDate(pick_(r, cIdx.expdate));
    var issueRaw = pick_(r, cIdx.issue);
    var issueD = fmtDate(issueRaw);
    // Fallback: if Decision Issue Date empty, use Award Publication Date
    if (!issueD.serial) {
      issueD = fmtDate(pick_(r, cIdx.pubDate));
    }

    // ⭐ TIMELINE 100% theo Decision Issue Date (KHÔNG dùng cột Month/Year của sheet).
    if (issueD.serial) {
      var _dt = new Date(issueD.serial);
      yr = _dt.getFullYear();
      month = ('0' + (_dt.getMonth() + 1)).slice(-2) + '/' + yr;   // 'MM/yyyy'
    }

    rows.push({
      buyer:   String(pick_(r, cIdx.buyer)  || ''),
      brand:   String(brand || 'Không rõ'),
      prov:    String(pick_(r, cIdx.prov)   || pick_(r, cIdx.regionD) || ''),
      ptype:   String(pick_(r, cIdx.ptype)  || ''),
      tier:    String(pick_(r, cIdx.tier)   || 'N/A'),
      region:  String(pick_(r, cIdx.regionD) || 'N/A'),
      method:  String(pick_(r, cIdx.method) || ''),
      year:    yr || 0,
      month:   month,
      kqtt:    String(pick_(r, cIdx.kqtt)   || ''),
      pname:   String(pick_(r, cIdx.pname)  || ''),
      pcode:   String(pick_(r, cIdx.pcode)  || ''),
      tspec:   String(pick_(r, cIdx.tspec)  || ''),
      qty:     qty,
      price:   price,
      // ── v2 ──
      cdur:    cdur,                 // contract duration in months (0 if blank)
      expStr:  expD.str,             // 'dd/MM/yyyy' for display
      expSer:  expD.serial,          // epoch ms for sorting/compare
      issStr:  issueD.str,           // decision issue date display
      issSer:  issueD.serial         // epoch ms
    });
  });

  return {
    ok: true,
    rows: rows,
    meta: {
      source: SHEET_NAME,
      nrows: rows.length,
      exported: Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm')
    }
  };
}

function pick_(arr, i) { return (i == null || i < 0) ? '' : arr[i]; }
function num_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  var s = String(v).replace(/[, ]/g, '').replace(/[^\d.\-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  BỔ SUNG cho v2 — GHI NGƯỢC hợp đồng (Duration + Expiration) từ dashboard "Dự trù & Theo dõi"
 *  ────────────────────────────────────────────────────────────────────────────────────────
 *  DÁN TOÀN BỘ KHỐI NÀY vào CUỐI file backend hiện tại (sau hàm jsonOut).
 *  KHÔNG cần sửa gì phần doGet/buildPayload_ đang chạy.
 *
 *  Frontend (nút 💾 Lưu lên Sheet, nhóm New/Convert) sẽ POST:
 *     { action:'writeContract', edits:[ { kqtt:'IB2600...', durMonths:12, expISO:'2027-05-01' } ] }
 *
 *  Hàm sẽ dò cột theo TÊN header (giống buildPayload_) rồi ghi:
 *     • Contract Duration (Month)  ← durMonths
 *     • Expiration date            ← expISO  (ghi dạng Date thật)
 *  cho MỌI dòng có cùng KQTT Code.
 *
 *  ⚠ Ghi đè 2 cột này — không hoàn tác. Backup sheet trước khi dùng lần đầu.
 *
 *  Sau khi dán: Deploy → Manage deployments → Edit → Version: New version → Deploy.
 *  (Quyền Execute as: Me · Access: Anyone with the link — giữ nguyên URL cũ.)
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

/* doPost cũ ĐÃ GỘP vào file này ở PHẦN 3 (add-on) — xem hàm doPost gộp bên dưới.
   Giữ nguyên writeContract_ để doPost gộp gọi lại. */

function writeContract_(edits) {
  if (!edits || !edits.length) return { ok: true, updated: 0 };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Sheet "' + SHEET_NAME + '" not found');

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow <= HEADER_ROW) return { ok: true, updated: 0 };

  // Dò cột theo TÊN header (đồng bộ với buildPayload_)
  var headers = sh.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h == null ? '' : h).trim();
  });
  var idx = {};
  headers.forEach(function (h, i) { idx[h.toLowerCase()] = i; });
  function col() {
    for (var i = 0; i < arguments.length; i++) {
      var name = String(arguments[i]).toLowerCase();
      if (idx[name] != null) return idx[name];
      for (var k in idx) { if (k.indexOf(name) >= 0) return idx[k]; }
    }
    return -1;
  }

  var cKqtt = col('KQTT Code', 'mã kqtt');
  var cDur  = col('Contract Duration (Month)', 'contract duration', 'thời hạn hợp đồng', 'thời hạn');
  var cExp  = col('Expiration date', 'expiration', 'ngày hết hạn', 'hết hạn');

  if (cKqtt < 0) throw new Error('Không tìm thấy cột "KQTT Code"');
  if (cDur < 0 && cExp < 0) throw new Error('Không tìm thấy cột Duration / Expiration');

  // Đọc cột KQTT 1 lần, lập index KQTT (đã chuẩn hoá) → danh sách dòng (1-based)
  var n = lastRow - HEADER_ROW;
  var kqttVals = sh.getRange(HEADER_ROW + 1, cKqtt + 1, n, 1).getValues();
  var rowsByKqtt = {};
  for (var i = 0; i < kqttVals.length; i++) {
    var key = normKqtt_(kqttVals[i][0]);
    if (!key) continue;
    (rowsByKqtt[key] || (rowsByKqtt[key] = [])).push(HEADER_ROW + 1 + i);
  }

  var updated = 0, matchedKeys = 0, missKeys = [];
  edits.forEach(function (ed) {
    var key = normKqtt_(ed.kqtt);
    if (!key) return;
    var targetRows = rowsByKqtt[key];
    if (!targetRows) { missKeys.push(ed.kqtt); return; }
    matchedKeys++;

    var durVal = (ed.durMonths != null && ed.durMonths !== '') ? Number(ed.durMonths) : null;
    var expVal = ed.expISO ? parseISO_(ed.expISO) : null;

    targetRows.forEach(function (rw) {
      if (durVal != null && cDur >= 0) sh.getRange(rw, cDur + 1).setValue(durVal);
      if (expVal && cExp >= 0)         sh.getRange(rw, cExp + 1).setValue(expVal);
      updated++;
    });
  });

  return { ok: true, updated: updated, matchedKeys: matchedKeys, missed: missKeys };
}

/* KQTT chuẩn hoá: bỏ khoảng trắng/xuống dòng + hậu tố -01/-00 để coi cùng 1 gói */
function normKqtt_(v) {
  if (v == null) return '';
  return String(v).replace(/[\s\r\n]+/g, '').replace(/-\d+$/, '');
}
/* 'YYYY-MM-DD' → Date */
function parseISO_(s) {
  var m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(+m[1], (+m[2]) - 1, +m[3]);
}

/* ── Test nhanh trong editor: Run → xem Logs ── */
function _testWrite() {
  var res = writeContract_([{ kqtt: 'IB0000000000', durMonths: 12, expISO: '2027-05-01' }]);
  Logger.log(JSON.stringify(res));  // updated:0 nếu KQTT không tồn tại (an toàn)
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  PHẦN 2 / 3 — LOGIC LÀM SẠCH
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ================================================================
 *  MMH — DAO PHẪU THUẬT: FILE TỔNG (2 bước trong 1)
 *  ----------------------------------------------------------------
 *  Menu "🔪 Làm sạch (Dao)":
 *   ① Làm sạch cột  → chuẩn hoá Manufacturer / Country, tạo W..AC
 *      (Year, Month, Manufacturer_Norm, Region, Price_Tier,
 *       Province_Clean, Region_by_Distributor).
 *   ② Lọc + phân loại dao nhãn khoa → lọc giá 40k–400k (xoá cả dòng
 *      ngoài khoảng), điền Knife Type + Price_Tier.
 *  Quy trình: chạy ① trước, rồi ②.
 * ================================================================
 */

/**
 * ================================================================
 *  MMH — KQTT TENDER DATA CLEANER  —  DAO PHẪU THUẬT (Surgical Knives)
 *  ----------------------------------------------------------------
 *  Phiên bản cho nhóm "Dao phẫu thuật". Cấu trúc file giống KQTT:
 *   - Cột A–V: dữ liệu gốc (giữ nguyên).
 *   - Cột W–AC: các cột hệ thống TỰ TẠO khi làm sạch:
 *        W  = Year
 *        X  = Month
 *        Y  = Manufacturer_Norm     (hãng đã chuẩn hoá)
 *        Z  = Region                (North / Central / South — ranh giới MỚI T7/2025)
 *        AA = Price_Tier            (Low / Mid / High)
 *        AB = Province_Clean        (tỉnh thành theo ranh giới MỚI)
 *        AC = Region_by_Distributor (North / South — ranh giới CŨ, Đà Nẵng đổ ra Bắc)
 *   - Cột AD trở đi (Knife Type, Contract Duration, ...) KHÔNG do tool tạo — bỏ qua.
 *
 *  ─── TRIẾT LÝ LÀM SẠCH (khác bản chỉ khâu) ──────────────────────
 *  Người dùng bôi chọn 1 vùng (ví dụ từ dòng 1000 trở xuống). Tool sẽ:
 *    1) DỰNG REGISTRY từ TẤT CẢ dòng NẰM TRÊN vùng chọn (dòng 3 → dòng
 *       ngay trước vùng chọn). Registry gồm:
 *         • Tập tên hãng đã chuẩn (Manufacturer_Norm / Hãng sản xuất)
 *         • Tập quốc gia đã chuẩn (English) đã xuất hiện
 *         • Map Code → hãng, Code → country (tham chiếu chéo)
 *    2) VỚI MỖI DÒNG trong vùng chọn:
 *       a. HÃNG: nếu ô "Hãng sản xuất" (hoặc "Xuất xứ") chứa 1 chuỗi
 *          khớp / chứa 1 tên hãng đã có trong registry → trả về tên hãng
 *          CHUẨN đó ("Mani inc", "Mani Medical..." → "Mani").
 *       b. QUỐC GIA: nếu ô "Xuất xứ" khớp 1 quốc gia đã có (kể cả tiếng
 *          Việt "Trung Quốc" ↔ "China") → trả về tên English đã chuẩn.
 *       c. CHỈ KHI registry không khớp → mới BÓC TÁCH cột "Xuất xứ" bằng
 *          rule parser (giống bản chỉ khâu) để tìm hãng + quốc gia; quốc
 *          gia mới thì điền English theo COUNTRY_MAP.
 *  ----------------------------------------------------------------
 *  Cài đặt: Extensions → Apps Script → dán file → Save → reload Sheet.
 *  Cách dùng: BÔI CHỌN vùng cần làm sạch (gồm cả cột), rồi menu
 *             "🔪 Làm sạch (Dao)" → "▶ Làm sạch vùng đang chọn".
 * ================================================================
 */

// ============== 0. CẤU HÌNH ==============

const CFG = {
  SHEET_NAME_HINTS: ['Data xử lý', 'Danh sách hàng hóa', 'KQTT', 'Sheet1'],

  // Header có thể là tiếng Việt (file thô) HOẶC tiếng Anh (file đã xử lý).
  // findColIndex sẽ thử lần lượt các hint cho tới khi match.
  COL_STT:     ['STT', 'No.'],
  COL_NAME:    ['Tên thiết bị', 'Product Name'],
  COL_ORIGIN:  ['Xuất xứ', 'Country of Origin'],
  COL_MANUF:   ['Hãng sản xuất', 'Manufacturer'],
  COL_CODE:    ['Kỹ mã hiệu', 'Ký mã hiệu', 'Product Code'],
  COL_MODEL:   ['Chủng loại', 'Model'],
  COL_PRICE:   ['Đơn giá trúng thầu', 'Awarded Unit Price'],
  COL_DATE:    ['Ngày đăng tải', 'Award Publication Date'],
  COL_DECDATE: ['Ngày ban hành', 'Decision Issue Date'],   // cột T → dùng cho Year/Month
  COL_ADDRESS: ['Địa điểm', 'Location'],

  // 7 cột hệ thống tạo, đặt tại W..AC (index 23..29, 1-based).
  OUT_START_COL: 23, // W
  OUT_HEADERS: [
    'Year', 'Month', 'Manufacturer_Norm', 'Region',
    'Price_Tier', 'Province_Clean', 'Region_by_Distributor'
  ],

  // Ngưỡng Price_Tier (VND) — suy từ file dao mẫu.
  PRICE_LOW_MAX:  100000,   // ≤ 100k          -> Low
  PRICE_MID_MAX:  180000,   // 100k < x ≤ 180k -> Mid  (> 180k -> High)

  // Màu
  COLOR_EDITED:     '#FFF9D0',  // vàng: parser bóc tách
  COLOR_REGISTRY:   '#D9EAD3',  // xanh lá nhạt: khớp registry (dòng trên)
  COLOR_HEADER_NEW: '#3A5CAA',
  COLOR_HEADER_FG:  '#FFFFFF',
};

// ============== 1. DATA MAPS ==============

const COUNTRY_MAP = {
  'mỹ':'USA','usa':'USA','hoa kỳ':'USA','hoa ky':'USA','u.s.a':'USA','us':'USA','united states':'USA',
  'trung quốc':'China','trung quoc':'China','china':'China','tq':'China','p.r.c':'China',
  'nhật bản':'Japan','nhat ban':'Japan','nhật':'Japan','japan':'Japan',
  'ấn độ':'India','an do':'India','india':'India','ân độ':'India',
  'pakistan':'Pakistan',
  'đức':'Germany','duc':'Germany','germany':'Germany','deutschland':'Germany',
  'pháp':'France','phap':'France','france':'France',
  'ý':'Italia','italy':'Italia','italia':'Italia','italie':'Italia',
  'hàn quốc':'Korea','han quoc':'Korea','korea':'Korea','south korea':'Korea',
  'việt nam':'Viet Nam','viet nam':'Viet Nam','vietnam':'Viet Nam','vn':'Viet Nam',
  'mexico':'Mexico','méxico':'Mexico',
  'bỉ':'Belgium','belgium':'Belgium',
  'anh':'UK','uk':'UK','united kingdom':'UK','england':'UK','vương quốc anh':'UK',
  'đài loan':'Taiwan','dai loan':'Taiwan','taiwan':'Taiwan',
  'costa rica':'Costa Rica',
  'thái lan':'Thailand','thai lan':'Thailand','thailand':'Thailand',
  'singapore':'Singapore','malaysia':'Malaysia','indonesia':'Indonesia',
  'tây ban nha':'Spain','spain':'Spain','españa':'Spain',
  'thuỵ sĩ':'Switzerland','thụy sĩ':'Switzerland','switzerland':'Switzerland',
  'thuỵ điển':'Sweden','thụy điển':'Sweden','sweden':'Sweden','thuỵ sỹ':'Switzerland',
  'hà lan':'Netherlands','ha lan':'Netherlands','netherlands':'Netherlands','holland':'Netherlands',
  'ba lan':'Poland','poland':'Poland',
  'nga':'Russia','russia':'Russia',
  'úc':'Australia','australia':'Australia',
  'canada':'Canada',
  'brazil':'Brazil','brasil':'Brazil',
  'thổ nhĩ kỳ':'Turkey','turkey':'Turkey','türkiye':'Turkey',
  'israel':'Israel',
  'ai cập':'Egypt','egypt':'Egypt',
  'luxembourg':'Luxembourg',
  'ireland':'Ireland','ai len':'Ireland','ai-len':'Ireland','ai nhĩ lan':'Ireland',
  'hy lạp':'Greece','greece':'Greece',
  'phần lan':'Finland','finland':'Finland',
  'costa rica':'Costa Rica','áo':'Austria','ao':'Austria','austria':'Austria',
  'đài loan':'Taiwan','dai loan':'Taiwan','taiwan':'Taiwan','đài loan (trung quốc)':'Taiwan',
  'thuỵ sỹ':'Switzerland','đan mạch':'Denmark','denmark':'Denmark',
  'na uy':'Norway','norway':'Norway','bồ đào nha':'Portugal','portugal':'Portugal',
  'nam phi':'South Africa','south africa':'South Africa','philippines':'Philippines','phi-líp-pin':'Philippines',
};

const CORP_SUFFIX_COUNTRY = [
  [/\bGmbH\b/i,'Germany'],[/\bAG\b/,'Germany'],[/\bKG\b/,'Germany'],
  [/\bS\.?A\.?\s*de\s*C\.?V\.?\b/i,'Mexico'],
  [/\bS\.?A\.?S\.?\b/,'France'],[/\bSARL\b/i,'France'],
  [/\bS\.?p\.?A\.?\b/i,'Italia'],[/\bS\.?r\.?l\.?\b/i,'Italia'],
  [/\bB\.?V\.?\b/,'Netherlands'],[/\bN\.?V\.?\b/,'Netherlands'],
  [/\bOy\b/,'Finland'],
  [/\bPvt\.?\s*Ltd\.?\b/i,'India'],[/\bPrivate\s*Limited\b/i,'India'],
];

// Ranh giới MỚI (NQ 60-NQ/TW, 01/07/2025) → 34 tỉnh/thành.
const PROVINCE_MERGE = {
  'quảng nam':'Đà Nẵng','đà nẵng':'Đà Nẵng',
  'thành phố hồ chí minh':'Hồ Chí Minh','hồ chí minh':'Hồ Chí Minh','tp.hcm':'Hồ Chí Minh','tp hcm':'Hồ Chí Minh',
  'sài gòn':'Hồ Chí Minh','bình dương':'Hồ Chí Minh','bà rịa - vũng tàu':'Hồ Chí Minh',
  'bà rịa-vũng tàu':'Hồ Chí Minh','ba ria vung tau':'Hồ Chí Minh','vũng tàu':'Hồ Chí Minh',
  'hà nội':'Hà Nội',
  'hà giang':'Tuyên Quang','tuyên quang':'Tuyên Quang',
  'yên bái':'Lào Cai','lào cai':'Lào Cai',
  'bắc kạn':'Thái Nguyên','thái nguyên':'Thái Nguyên',
  'vĩnh phúc':'Phú Thọ','hoà bình':'Phú Thọ','hòa bình':'Phú Thọ','phú thọ':'Phú Thọ',
  'bắc giang':'Bắc Ninh','bắc ninh':'Bắc Ninh',
  'thái bình':'Hưng Yên','hưng yên':'Hưng Yên',
  'hải dương':'Hải Phòng','hải phòng':'Hải Phòng',
  'hà nam':'Ninh Bình','nam định':'Ninh Bình','ninh bình':'Ninh Bình',
  'quảng bình':'Quảng Trị','quảng trị':'Quảng Trị',
  'thừa thiên huế':'Huế','thừa thiên-huế':'Huế','huế':'Huế',
  'kon tum':'Quảng Ngãi','quảng ngãi':'Quảng Ngãi',
  'bình định':'Gia Lai','gia lai':'Gia Lai',
  'ninh thuận':'Khánh Hoà','khánh hoà':'Khánh Hoà','khánh hòa':'Khánh Hoà',
  'đắk nông':'Lâm Đồng','bình thuận':'Lâm Đồng','lâm đồng':'Lâm Đồng',
  'phú yên':'Đắk Lắk','đắk lắk':'Đắk Lắk',
  'bình phước':'Đồng Nai','đồng nai':'Đồng Nai',
  'long an':'Tây Ninh','tây ninh':'Tây Ninh',
  'bến tre':'Vĩnh Long','trà vinh':'Vĩnh Long','vĩnh long':'Vĩnh Long',
  'tiền giang':'Đồng Tháp','đồng tháp':'Đồng Tháp',
  'bạc liêu':'Cà Mau','cà mau':'Cà Mau',
  'kiên giang':'An Giang','an giang':'An Giang',
  'sóc trăng':'Cần Thơ','hậu giang':'Cần Thơ','cần thơ':'Cần Thơ',
  'cao bằng':'Cao Bằng','lạng sơn':'Lạng Sơn','điện biên':'Điện Biên',
  'lai châu':'Lai Châu','sơn la':'Sơn La','quảng ninh':'Quảng Ninh',
  'thanh hóa':'Thanh Hóa','thanh hoá':'Thanh Hóa','nghệ an':'Nghệ An','hà tĩnh':'Hà Tĩnh',
};

// Region theo ranh giới MỚI (English: North / Central / South)
const REGION_MAP = {
  'Hà Nội':'North','Hải Phòng':'North','Quảng Ninh':'North','Bắc Ninh':'North','Hưng Yên':'North',
  'Ninh Bình':'North','Phú Thọ':'North','Thái Nguyên':'North','Lào Cai':'North','Tuyên Quang':'North',
  'Cao Bằng':'North','Lạng Sơn':'North','Điện Biên':'North','Lai Châu':'North','Sơn La':'North',
  'Thanh Hóa':'Central','Nghệ An':'Central','Hà Tĩnh':'Central','Quảng Trị':'Central','Huế':'Central',
  'Đà Nẵng':'Central','Quảng Ngãi':'Central','Gia Lai':'Central','Khánh Hoà':'Central','Đắk Lắk':'Central',
  'Lâm Đồng':'Central',
  'Hồ Chí Minh':'South','Đồng Nai':'South','Tây Ninh':'South','Vĩnh Long':'South','Đồng Tháp':'South',
  'Cà Mau':'South','An Giang':'South','Cần Thơ':'South',
};

// Region_by_Distributor theo ranh giới CŨ (North / South) — Đà Nẵng & ra Bắc = North.
const OLD_PROVINCE_TO_NPP = {
  'hà nội':'North','hà tây':'North','hải phòng':'North','hải dương':'North','hưng yên':'North',
  'quảng ninh':'North','bắc ninh':'North','bắc giang':'North','thái nguyên':'North','bắc kạn':'North',
  'tuyên quang':'North','hà giang':'North','cao bằng':'North','lạng sơn':'North','phú thọ':'North',
  'vĩnh phúc':'North','yên bái':'North','lào cai':'North','điện biên':'North','lai châu':'North',
  'sơn la':'North','hòa bình':'North','hoà bình':'North','nam định':'North','hà nam':'North',
  'thái bình':'North','ninh bình':'North','thanh hóa':'North','thanh hoá':'North','nghệ an':'North',
  'hà tĩnh':'North','quảng bình':'North','quảng trị':'North','thừa thiên huế':'North',
  'thừa thiên-huế':'North','huế':'North','đà nẵng':'North',
  'quảng nam':'South','quảng ngãi':'South','kon tum':'South','bình định':'South','gia lai':'South',
  'phú yên':'South','đắk lắk':'South','đắk nông':'South','khánh hòa':'South','khánh hoà':'South',
  'ninh thuận':'South','lâm đồng':'South','bình thuận':'South','bình phước':'South','tây ninh':'South',
  'bình dương':'South','đồng nai':'South','bà rịa - vũng tàu':'South','bà rịa-vũng tàu':'South',
  'vũng tàu':'South','thành phố hồ chí minh':'South','hồ chí minh':'South','tp.hcm':'South','tp hcm':'South',
  'sài gòn':'South','long an':'South','tiền giang':'South','bến tre':'South','trà vinh':'South',
  'vĩnh long':'South','đồng tháp':'South','an giang':'South','kiên giang':'South','cần thơ':'South',
  'hậu giang':'South','sóc trăng':'South','bạc liêu':'South','cà mau':'South',
};

// Stopwords Latin: KHÔNG phải tên hãng (dùng khi bóc tách / so khớp brand).
const COMPANY_STOPWORDS = new Set([
  'co','ltd','limited','inc','incorporated','corp','corporation','llc','gmbh','kg','ag','sa','spa','srl','pte',
  'sas','sarl','lda','bv','nv','oy','ab','plc','private','pvt','pty','company','group','holding','holdings',
  'international','intl','industries','industry','industrial','manufacturing','manufacture','production','productions',
  'medical','medicale','medizintechnik','medizin','healthcare','health','instruments','instrument','instrumentos',
  'apparecchi','surgical','surgery','surgico','surgicare','technology','tech','technologies','technik','pharma',
  'pharmaceutical','pharmaceuticals','chemicals','chemical','scientific','science','sciences','lifesciences',
  'trading','traders','trade','distribution','distributor','factory','plant','planta','products','product',
  'system','systems','devices','device','equipment','equipments','solutions','solution','enterprise',
  'enterprises','de','la','le','et','the','and','of','for','des','du','und','von',
  'usa','china','japan','india','germany','france','italy','italia','korea','vietnam','pakistan','mexico',
  'belgium','uk','taiwan','thailand','singapore','malaysia','indonesia','spain','switzerland','sweden',
  'netherlands','poland','russia','australia','canada','brazil','turkey','israel','egypt','luxembourg',
  'holland','ireland','greece','finland','asia','europe','america','asean','apac',
  'disposable','sterile','reusable','single','use','model','code','type','grade','series','class','size',
]);

// ============== 1B. HÃNG DAO PHẪU THUẬT ĐÃ BIẾT (seed registry) ==============
// Được nạp sẵn vào registry — luôn ưu tiên khớp trước khi bóc tách.
const KNOWN_BRANDS = [
  'KAI','Heil Pharma','Rumex','Ophtechnics','Surgistar','Madhu','Oasis Medical',
  'Devine Meditech','Feather','Beijing Bohaikangyuan Medical Devices','IKIT S.r.l',
  'Iscon Surgicals','Microtrack Surgicals','Shah Eye Care','Surgi Edge','Surgi Lab AG',
  'Sidapharm','Trillium Medivision','2nd Sight Medical','Yilmaz Medikal','Alcon','GEEEdge',
  'Mani','Surgical Specialties','Aurolab',
];

// ====== CODE-RULE LIBRARY (seed từ mã_dao.xlsx, 988 dòng) ======
// brandKey(lowercase) -> [[codePrefix, knifeType], ...] (prefix dài trước)
const CODE_PREFIX_LIB = {"kai": [["CCR", "Slit knife"], ["CPU", "Cresent knife"], ["A", "Stab knife"]], "heil pharma": [["HPR", "Slit knife"]], "rumex": [["CCD", "Slit knife"], ["VRS", "MVR Knife"], ["SP", "Stab knife"], ["CR", "Cresent knife"], ["SL", "Slit knife"]], "mani": [["MSL", "Slit knife"], ["MST", "Stab knife"], ["MCU", "Cresent knife"]], "ophtechnics": [["3K01", "Stab knife"], ["3K00", "Slit knife"], ["3K21", "Stab knife"], ["3K20", "Slit knife"]], "surgistar": [["961", "Stab knife"], ["962", "Slit knife"], ["960", "Cresent knife"], ["963", "Slit knife"], ["881", "Stab knife"], ["882", "Slit knife"]], "madhu": [["CRESCENT", "Cresent knife"], ["LANCE", "Stab knife"], ["SLIT", "Slit knife"], ["250", "Cresent knife"], ["280", "Slit knife"], ["MVR", "MVR Knife"], ["19G", "MVR Knife"], ["20G", "MVR Knife"], ["23G", "MVR Knife"], ["300", "Slit knife"]], "oasis medical": [["PE36", "Cresent knife"], ["PE38", "Slit knife"], ["PE30", "Stab knife"], ["PE37", "Cresent knife"]], "aurolab": [["SK", "Slit knife"], ["SL", "Stab knife"], ["L", "Stab knife"], ["C", "Cresent knife"], ["K", "Slit knife"]], "devine meditech": [["DMH51", "Stab knife"], ["DMH", "Slit knife"]], "feather": [["P71", "Stab knife"], ["P73", "Slit knife"], ["P79", "Cresent knife"], ["P0", "Slit knife"]], "beijing bohaikangyuan medical devices": [["JPDCODECQL", "Stab knife"], ["CODECCL", "Slit knife"]], "ikit s.r.l": [["IKIT", "Slit knife"]], "iscon surgicals": [["JGHC32", "Slit knife"], ["JSHC0", "Cresent knife"], ["JGHC2", "Slit knife"], ["JSHK", "Slit knife"], ["JSHS", "Stab knife"], ["JGHK", "Slit knife"], ["JGHS", "Stab knife"]], "microtrack surgicals": [["M90", "Slit knife"], ["M92", "Stab knife"]], "shah eye care": [["KRDB", "Slit knife"], ["SP", "Stab knife"]], "surgi edge": [["GVSK", "Slit knife"], ["GVSP", "Stab knife"]], "surgi lab ag": [["SSL", "Slit knife"]], "sidapharm": [["620", "Slit knife"]], "trillium medivision": [["GVSK", "Slit knife"], ["GVSP", "Stab knife"]], "2nd sight medical": [], "yilmaz medikal": [["YM", "Slit knife"]], "surgical specialties": [["722", "Slit knife"], ["723", "Slit knife"], ["712", "MVR Knife"]], "alcon": [["806", "Stab knife"]], "geeedge": [["CJY01", "Slit knife"], ["CJY05", "Stab knife"]], "sdi": []};

// Seed MASTER exact: 'brand|codeNorm' -> {t:type, c:country, tiers:[...]}
const MASTER_SEED = {"2nd sight medical|E3SLU122": {"t": "Slit knife", "c": "China", "tiers": ["Low"]}, "2nd sight medical|E3SLU128": {"t": "Slit knife", "c": "China", "tiers": ["Low"]}, "2nd sight medical|E3SLU132": {"t": "Slit knife", "c": "China", "tiers": ["Low"]}, "2nd sight medical|E3STS115": {"t": "Stab knife", "c": "China", "tiers": ["Low"]}, "alcon|8065921501": {"t": "Stab knife", "c": "USA", "tiers": ["High"]}, "aurolab|C25222HT": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "aurolab|SC25222": {"t": "Cresent knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|K22215HT": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "aurolab|K28215HT": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|KD22215HT": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|KD28215HT": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|KD30215HT": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|KD32215HT": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|SK22215": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|SK28215": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "aurolab|SK32215": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "aurolab|AUROSLEEK": {"t": "Stab knife", "c": "India", "tiers": ["High", "Low", "Mid"]}, "aurolab|AUROSLIM": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "aurolab|L15022HT": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "aurolab|SL15022": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "beijing bohaikangyuan medical devices|CODECCL228": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "beijing bohaikangyuan medical devices|CODECCL237": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "beijing bohaikangyuan medical devices|CODECCL241": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "beijing bohaikangyuan medical devices|JPDCODECCL235": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "beijing bohaikangyuan medical devices|JPDCODECQL202": {"t": "Stab knife", "c": "China", "tiers": ["Low"]}, "devine meditech|DMH5322": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5324": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5325": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5327": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5328": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5330": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5332": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5528": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5530": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5532": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "devine meditech|DMH5115": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "feather|P7926B": {"t": "Cresent knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P7926BU": {"t": "Cresent knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P0622BUC": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P0624BUC": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P06275BUC": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P0628BUC": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P0630BUC": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P0632BUC": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "feather|P730": {"t": "Slit knife", "c": "Japan", "tiers": ["Low"]}, "feather|FEATHER": {"t": "Stab knife", "c": "Japan", "tiers": ["Low"]}, "feather|NO715": {"t": "Stab knife", "c": "Japan", "tiers": ["Mid"]}, "feather|P715": {"t": "Stab knife", "c": "Japan", "tiers": ["Low", "Mid"]}, "geeedge|CJY0128": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "geeedge|CJY0130": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "geeedge|CJY0132": {"t": "Slit knife", "c": "China", "tiers": ["Mid"]}, "geeedge|CJY0515": {"t": "Stab knife", "c": "China", "tiers": ["Mid"]}, "heil pharma|HPR4902801": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "heil pharma|HPR4902803": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "heil pharma|HPR4903003": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "heil pharma|HPR4903203": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "heil pharma|HPR4904002": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "heil pharma|HPR4905002": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "heil pharma|HPL2921524": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "ikit s.r.l|IKIT0B02076": {"t": "Slit knife", "c": "Italia", "tiers": ["Mid"]}, "ikit s.r.l|IKIT0B02089": {"t": "Slit knife", "c": "Italia", "tiers": ["Mid"]}, "iscon surgicals|JGHC026": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "iscon surgicals|JGHC240": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "iscon surgicals|JSHC020": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "iscon surgicals|JSHC023": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "iscon surgicals|JSHC026": {"t": "Cresent knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JGHC220": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JGHC275": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JGHC285": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JGHC300": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JGHC320": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JGHK220": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JGHK280": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JGHK300": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JGHK320": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JSHC240": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JSHC320": {"t": "Slit knife", "c": "Cộng hòa Ấn Độ", "tiers": ["Low"]}, "iscon surgicals|JSHK220": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JSHK220JSHK280": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JSHK280": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "iscon surgicals|JSHK300": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JSHK320": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JGHS015": {"t": "Stab knife", "c": "India", "tiers": ["Mid"]}, "iscon surgicals|JSHM020": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "iscon surgicals|JSHS015": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "kai|3053835": {"t": "Cresent knife", "c": "Nhật Bản", "tiers": ["Low"]}, "kai|CPU22AFG": {"t": "Cresent knife", "c": "Nhật Bản", "tiers": ["High"]}, "kai|CPU26AFG": {"t": "Cresent knife", "c": "Nhật Bản", "tiers": ["High"]}, "kai|CPU26AGF": {"t": "Cresent knife", "c": "Japan", "tiers": ["High", "Mid"]}, "kai|CCR22AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "kai|CCR23AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["Mid"]}, "kai|CCR24AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["Mid"]}, "kai|CCR25AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["Mid"]}, "kai|CCR265AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["Mid"]}, "kai|CCR275AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["Mid"]}, "kai|CCR28AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "kai|CCR30AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "kai|CCR32AGF": {"t": "Slit knife", "c": "Japan", "tiers": ["High", "Mid"]}, "kai|A15F": {"t": "Stab knife", "c": "Japan", "tiers": ["Low", "Mid"]}, "kai|A30F": {"t": "Stab knife", "c": "Japan", "tiers": ["Low"]}, "kai|DAOMMT15STABKNIFES": {"t": "Stab knife", "c": "Japan", "tiers": ["Low"]}, "kai|MODELA15F": {"t": "Stab knife", "c": "Japan", "tiers": ["Low"]}, "madhu|250A": {"t": "Cresent knife", "c": "India", "tiers": ["Low", "Mid"]}, "madhu|CRESCENT": {"t": "Cresent knife", "c": "India", "tiers": ["Low", "Mid"]}, "madhu|19G": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|19GA": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|20G": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|20GA": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|23G": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|23GA": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|MVR": {"t": "MVR Knife", "c": "India", "tiers": ["Mid"]}, "madhu|22A": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "madhu|280": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "madhu|280A": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "madhu|300": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "madhu|320A": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "madhu|SLIT": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "madhu|LANCE": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "madhu|MIPL": {"t": "Stab knife", "c": "India", "tiers": ["Low", "Mid"]}, "mani|MCU20": {"t": "Cresent knife", "c": "Việt Nam", "tiers": ["High"]}, "mani|MCU26": {"t": "Cresent knife", "c": "Viet Nam", "tiers": ["High", "Mid"]}, "mani|MCU26SH": {"t": "Cresent knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MS23SH": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["Mid"]}, "mani|MSL": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High", "Mid"]}, "mani|MSL22": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL2232SK": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL22SH": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL22SK": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL28": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL28SH": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL28SK": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL30": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL30SH": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL30SK": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL32": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MSL32SK": {"t": "Slit knife", "c": "Viet Nam", "tiers": ["High"]}, "mani|MST": {"t": "Stab knife", "c": "Viet Nam", "tiers": ["Mid"]}, "mani|MST15": {"t": "Stab knife", "c": "Viet Nam", "tiers": ["High", "Mid"]}, "mani|MST15MK": {"t": "Stab knife", "c": "Viet Nam", "tiers": ["Mid"]}, "mani|MST15SK": {"t": "Stab knife", "c": "Viet Nam", "tiers": ["Mid"]}, "microtrack surgicals|M902268": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "microtrack surgicals|M902268M902868": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "microtrack surgicals|M902868": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "microtrack surgicals|SLITKERATOMEBLADESDOUBLEBEVEL": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "microtrack surgicals|M921501": {"t": "Stab knife", "c": "India", "tiers": ["Low", "Mid"]}, "oasis medical|PE3630": {"t": "Cresent knife", "c": "USA", "tiers": ["High"]}, "oasis medical|PE3720A": {"t": "Cresent knife", "c": "USA", "tiers": ["High"]}, "oasis medical|PE3128SL": {"t": "Slit knife", "c": "USA", "tiers": ["High"]}, "oasis medical|PE3232": {"t": "Slit knife", "c": "USA", "tiers": ["High"]}, "oasis medical|PE3520": {"t": "Slit knife", "c": "USA", "tiers": ["High"]}, "oasis medical|PE3822": {"t": "Slit knife", "c": "USA", "tiers": ["High", "Mid"]}, "oasis medical|PE3828": {"t": "Slit knife", "c": "USA", "tiers": ["High", "Mid"]}, "oasis medical|PE3832": {"t": "Slit knife", "c": "USA", "tiers": ["High", "Mid"]}, "oasis medical|PE3015": {"t": "Stab knife", "c": "USA", "tiers": ["Low", "Mid"]}, "ophtechnics|3K02816": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "ophtechnics|3K02820": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "ophtechnics|3K028225": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "ophtechnics|3K02825": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "ophtechnics|3K228253K228163K228203K2282253K22825": {"t": "Cresent knife", "c": "India", "tiers": ["Mid"]}, "ophtechnics|3K00422": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K00424": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "ophtechnics|3K00425": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "ophtechnics|3K004265": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "ophtechnics|3K00428": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K00430": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K004303K004323K204303K20432": {"t": "Slit knife", "c": "Ấn Độ", "tiers": ["Mid"]}, "ophtechnics|3K00432": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K20422": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K20424": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "ophtechnics|3K20428": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K20430": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K20432": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K22820": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "ophtechnics|3K01215": {"t": "Stab knife", "c": "India", "tiers": ["Low", "Mid"]}, "ophtechnics|3K012153K21215": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "ophtechnics|3K21215": {"t": "Stab knife", "c": "India", "tiers": ["Low", "Mid"]}, "rumex|CR20": {"t": "Cresent knife", "c": "UK", "tiers": ["Mid"]}, "rumex|VRA20": {"t": "MVR Knife", "c": "UK", "tiers": ["Mid"]}, "rumex|VRS20": {"t": "MVR Knife", "c": "UK", "tiers": ["Mid"]}, "rumex|VRS23": {"t": "MVR Knife", "c": "UK", "tiers": ["Mid"]}, "rumex|CCD22": {"t": "Slit knife", "c": "UK", "tiers": ["High"]}, "rumex|CCD27": {"t": "Slit knife", "c": "UK", "tiers": ["High"]}, "rumex|SL15022": {"t": "Slit knife", "c": "UK", "tiers": ["Mid"]}, "rumex|SL22": {"t": "Slit knife", "c": "UK", "tiers": ["Mid"]}, "rumex|SL28": {"t": "Slit knife", "c": "UK", "tiers": ["High"]}, "rumex|SP15": {"t": "Stab knife", "c": "UK", "tiers": ["Low", "Mid"]}, "sdi|SDI0423": {"t": "Slit knife", "c": "Đức", "tiers": ["Low"]}, "shah eye care|285": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "shah eye care|KRBD2232": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "shah eye care|KRDB22": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "shah eye care|KRDB22S": {"t": "Slit knife", "c": "India", "tiers": ["High", "Low"]}, "shah eye care|KRDB24S": {"t": "Slit knife", "c": "India", "tiers": ["High", "Low"]}, "shah eye care|KRDB26S": {"t": "Slit knife", "c": "India", "tiers": ["High", "Low"]}, "shah eye care|KRDB28": {"t": "Slit knife", "c": "India", "tiers": ["Mid"]}, "shah eye care|KRDB2832": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "shah eye care|KRDB28S": {"t": "Slit knife", "c": "India", "tiers": ["High", "Low"]}, "shah eye care|KRDB32S": {"t": "Slit knife", "c": "India", "tiers": ["High", "Low"]}, "shah eye care|SP150": {"t": "Stab knife", "c": "India", "tiers": ["Low", "Mid"]}, "shah eye care|SP150S": {"t": "Stab knife", "c": "India", "tiers": ["Mid"]}, "sidapharm|62018": {"t": "Slit knife", "c": "Greece", "tiers": ["Mid"]}, "sidapharm|620181DB": {"t": "Slit knife", "c": "Greece", "tiers": ["High", "Mid"]}, "surgi edge|GVSK220": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "surgi edge|GVSK240": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "surgi edge|GVSK280": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "surgi edge|GVSK280GVSK300": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "surgi edge|GVSK300": {"t": "Slit knife", "c": "India", "tiers": ["Low"]}, "surgi edge|GVSK310": {"t": "Slit knife", "c": "India", "tiers": ["Low", "Mid"]}, "surgi edge|GVSP15D": {"t": "Stab knife", "c": "India", "tiers": ["Low"]}, "surgi lab ag|SSL22": {"t": "Slit knife", "c": "Sweetland", "tiers": ["Mid"]}, "surgi lab ag|SSL28": {"t": "Slit knife", "c": "Sweetland", "tiers": ["Mid"]}, "surgi lab ag|SSL28P": {"t": "Slit knife", "c": "Sweetland", "tiers": ["Mid"]}, "surgi lab ag|SSL30": {"t": "Slit knife", "c": "Sweetland", "tiers": ["Mid"]}, "surgi lab ag|SSL32": {"t": "Slit knife", "c": "Sweetland", "tiers": ["Mid"]}, "surgi lab ag|SST15": {"t": "Stab knife", "c": "Sweetland", "tiers": ["Low"]}, "surgi lab ag|SSL30P": {"t": "Slit knife", "c": "Sweetland", "tiers": ["Mid"]}, "surgical specialties|741010": {"t": "Cresent knife", "c": "Mexico", "tiers": ["Mid"]}, "surgical specialties|712001": {"t": "MVR Knife", "c": "Mexico", "tiers": ["Mid"]}, "surgical specialties|712301": {"t": "MVR Knife", "c": "Mexico", "tiers": ["Low"]}, "surgical specialties|722231": {"t": "Slit knife", "c": "Mexico", "tiers": ["High", "Mid"]}, "surgical specialties|722831": {"t": "Slit knife", "c": "Mexico", "tiers": ["Mid"]}, "surgical specialties|722861": {"t": "Slit knife", "c": "Mexico", "tiers": ["High", "Mid"]}, "surgical specialties|722931": {"t": "Slit knife", "c": "Mexico", "tiers": ["Mid"]}, "surgical specialties|723231": {"t": "Slit knife", "c": "Mexico", "tiers": ["High", "Mid"]}, "surgical specialties|721501": {"t": "Stab knife", "c": "Mexico", "tiers": ["Mid"]}, "surgistar|960022": {"t": "Cresent knife", "c": "USA", "tiers": ["High", "Mid"]}, "surgistar|882851": {"t": "Slit knife", "c": "USA", "tiers": ["High"]}, "surgistar|882868": {"t": "Slit knife", "c": "USA", "tiers": ["High"]}, "surgistar|882961": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962261": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962261962851963261": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962268": {"t": "Slit knife", "c": "USA", "tiers": ["High", "Mid"]}, "surgistar|962461": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962468": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962851": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962858": {"t": "Slit knife", "c": "USA", "tiers": ["Low", "Mid"]}, "surgistar|962861": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962868": {"t": "Slit knife", "c": "USA", "tiers": ["High", "Mid"]}, "surgistar|962961": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|962968": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|963261": {"t": "Slit knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|963268": {"t": "Slit knife", "c": "USA", "tiers": ["Low", "Mid"]}, "surgistar|881501": {"t": "Stab knife", "c": "USA", "tiers": ["Mid"]}, "surgistar|961501": {"t": "Stab knife", "c": "USA", "tiers": ["Low", "Mid"]}, "trillium medivision|GVSK220P": {"t": "Slit knife", "c": "Canada", "tiers": ["Mid"]}, "trillium medivision|GVSK240P": {"t": "Slit knife", "c": "Canada", "tiers": ["Mid"]}, "trillium medivision|GVSK280P": {"t": "Slit knife", "c": "Canada", "tiers": ["Mid"]}, "trillium medivision|GVSK300P": {"t": "Slit knife", "c": "Canada", "tiers": ["Mid"]}, "trillium medivision|GVSK310P": {"t": "Slit knife", "c": "Canada", "tiers": ["Mid"]}, "trillium medivision|GVSP15DP": {"t": "Stab knife", "c": "Canada", "tiers": ["Mid"]}, "yilmaz medikal|YM220": {"t": "Slit knife", "c": "Turkey", "tiers": ["Mid"]}, "yilmaz medikal|YM280": {"t": "Slit knife", "c": "Turkey", "tiers": ["Mid"]}, "yilmaz medikal|YM300": {"t": "Slit knife", "c": "Turkey", "tiers": ["Mid"]}, "yilmaz medikal|YM320": {"t": "Slit knife", "c": "Turkey", "tiers": ["Mid"]}, "yilmaz medikal|YM15A": {"t": "Stab knife", "c": "Turkey", "tiers": ["Low"]}};


// ============== 2. UTILITIES ==============

function _nfc(s){ return s==null ? '' : String(s).normalize('NFC'); }
function _lc(s){ return _nfc(s).toLowerCase().trim(); }
function _trim(s){ return _nfc(s).replace(/\s+/g,' ').trim(); }

// Bỏ dấu tiếng Việt + đưa về thường + gộp khoảng trắng.
// Dùng để bắt các từ dù gõ có dấu, không dấu, hay lỗi dấu ("tiêu bản"/"tieu ban"/"tiêu ban").
function _noAccent(s){
  return _lc(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
              .replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}

// ============== RÁC: từ khoá loại bỏ DÒNG (KHÔNG phải dao nhãn khoa) ==============
// Loại bỏ: điện / lưỡi / cán / giấy / siêu âm / laser / tiêu bản / vi thể.
// Bắt cả có dấu/không dấu, hoa/thường. Từ ngắn 'cán' so theo TỪ TRỌN VẸN.
// (Đã BỎ 'da' vì nằm trong 'dao' → gây xoá nhầm.)
// LƯU Ý: caller phải BỎ QUA nếu nameLooksOphthalmic() = true (có dấu hiệu nhãn khoa).
function nameIsJunk(name){
  var na = _noAccent(name);   // không dấu, thường, 1 space
  if (na.indexOf('dien') !== -1) return true;     // điện (dao điện/cắt đốt)
  if (na.indexOf('luoi') !== -1) return true;     // lưỡi
  if (na.indexOf('giay') !== -1) return true;     // giấy
  if (na.indexOf('sieu am') !== -1) return true;  // siêu âm
  if (na.indexOf('laser') !== -1) return true;    // laser
  if (na.indexOf('tieu ban') !== -1) return true; // tiêu bản
  if (na.indexOf('vi the') !== -1) return true;   // vi thể
  if (/\bcan\b/.test(na)) return true;           // cán (trọn từ)
  return false;
}

// Tên có dấu hiệu NHÃN KHOA (phaco / 15 độ / 2.2… / MVR / slit / crescent / lance…)?
// Dùng để GIỮ dòng dù có từ khoá loại bỏ — vd "Dao 15 độ có cán" vẫn là Stab knife.
function nameLooksOphthalmic(name, codeRaw){
  return isOphthByName(name) || !!knifeTypeByTokens(name, codeRaw);
}

function titleCase(s){
  return _trim(s).replace(/\b([a-zA-Z])([a-zA-Z]*)/g,(_,a,b)=>a.toUpperCase()+b.toLowerCase());
}

// Chuẩn hoá để so brand: bỏ dấu câu + chữ có dấu TV → chỉ chữ-số Latin + 1 space.
function _normForBrand(s){
  if (s==null) return '';
  return String(s).normalize('NFC').toLowerCase()
    .replace(/[^a-z0-9\s]+/g,' ').replace(/\s+/g,' ').trim();
}

function findColIndex(headerRow, hints){
  const norm = s => _lc(s).replace(/\s+/g,' ');
  const arr = Array.isArray(hints) ? hints : [hints];
  for (const hint of arr){
    const h = norm(hint);
    for (let i=0;i<headerRow.length;i++){
      if (norm(headerRow[i]).indexOf(h) !== -1) return i;
    }
  }
  return -1;
}

function findHeaderRow(values, hintsList){
  for (let r=0; r<Math.min(values.length,8); r++){
    const row = values[r];
    for (let c=0;c<row.length;c++){
      const cell = _lc(row[c]);
      for (const hint of hintsList){
        if (cell === _lc(hint)) return r;
      }
    }
  }
  return -1;
}

function findSheet(ss){
  for (const name of CFG.SHEET_NAME_HINTS){
    const s = ss.getSheetByName(name);
    if (s) return s;
  }
  return ss.getActiveSheet();
}

// ============== 3. PARSERS (bóc tách "Xuất xứ" — fallback) ==============

const CONTINENT_NAMES = [
  'châu mỹ','bắc mỹ','nam mỹ','trung mỹ','mỹ la-tinh',
  'châu á','đông á','tây á','nam á','bắc á','trung á','đông nam á',
  'châu âu','tây âu','đông âu','nam âu','bắc âu','châu phi','bắc phi',
  'châu đại dương','châu úc','asean','apac',
];

function removeContinentWords(text){
  let t = _nfc(text);
  const sorted = CONTINENT_NAMES.slice().sort((a,b)=>b.length-a.length);
  for (const c of sorted){
    const re = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    t = t.replace(re,' ');
  }
  return t.replace(/\s+/g,' ').trim();
}

// Bỏ TỪ chỉ quốc gia khỏi chuỗi, dùng RANH GIỚI TỪ để không cắt nhầm bên trong
// một từ khác (vd "us" trong "Nussloch", "anh" trong "Nanjing"...). Với key thuần
// Latin dùng \b; với key có dấu tiếng Việt dùng lookaround theo ký tự chữ.
function removeCountryWords(text){
  let t = _nfc(text);
  const keys = Object.keys(COUNTRY_MAP).sort((a,b)=>b.length-a.length);
  for (const k of keys){
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    let re;
    if (/^[a-z0-9. ]+$/i.test(k)){
      re = new RegExp('\\b'+esc+'\\b','gi');            // Latin thuần → word boundary
    } else {
      // key có ký tự tiếng Việt: chặn liền chữ cái Latin/TV hai bên
      re = new RegExp('(^|[^\\p{L}])'+esc+'(?=$|[^\\p{L}])','giu');
      t = t.replace(re, (m,p1)=> (p1||'')+' ');
      continue;
    }
    t = t.replace(re,' ');
  }
  return t.replace(/\s+/g,' ').trim();
}

function detectCountries(text){
  const t = _lc(removeContinentWords(text));
  const found = [];
  const keys = Object.keys(COUNTRY_MAP).sort((a,b)=>b.length-a.length);
  let masked = t;
  for (const k of keys){
    const idx = masked.indexOf(k);
    if (idx !== -1){
      const before = idx>0 ? masked.charCodeAt(idx-1) : 0;
      const after  = idx+k.length<masked.length ? masked.charCodeAt(idx+k.length) : 0;
      const isLetter = c => (c>=97&&c<=122)||(c>=65&&c<=90);
      if (isLetter(before) || isLetter(after)) continue;
      found.push({pos:idx, en:COUNTRY_MAP[k]});
      masked = masked.substring(0,idx) + ' '.repeat(k.length) + masked.substring(idx+k.length);
    }
  }
  found.sort((a,b)=>a.pos-b.pos);
  return found.map(f=>f.en);
}

function inferCountryFromSuffix(text){
  for (const [re,country] of CORP_SUFFIX_COUNTRY){
    if (re.test(text)) return country;
  }
  return null;
}

// Bóc tách hãng + quốc gia + code từ 1 chuỗi "Xuất xứ" thô.
function parseOriginField(text){
  const out = { country:null, manufacturer:null, code:null };
  if (!text) return out;
  const raw = _trim(String(text).replace(/[\r\n]+/g,' '));
  if (!raw) return out;

  const cs = detectCountries(raw);
  if (cs.length) out.country = cs[cs.length-1];
  if (!out.country) out.country = inferCountryFromSuffix(raw);

  const reManuf = /(?:Hãng\s*(?:sản\s*xuất|sx)|HSX|NSX|Nhà\s*sản\s*xuất|Hãng\s*chủ\s*sở\s*hữu|Hãng)\s*[:\/]\s*([^,;\n]+?)(?=[,;\n]|$|\s+(?:Xuất\s*xứ|Nước\s*sản\s*xuất|Mã\s*hiệu|Ký\s*mã\s*hiệu|Model)\s*[:\/])/i;
  const mM = raw.match(reManuf);
  if (mM) out.manufacturer = removeCountryWords(mM[1]).replace(/^[\s,;\-\/]+|[\s,;\-\/]+$/g,'');

  if (!out.manufacturer){
    let rest = removeCountryWords(raw);
    const reCo = /([A-Z][A-Za-z0-9 ,.'\-&()]*?\b(?:Co\.?\s*,?\s*Ltd\.?|Corporation|Corp\.?|Inc\.?|LLC|GmbH|S\.?A\.?(?:\s*de\s*C\.?V\.?)?|S\.?p\.?A\.?|S\.?r\.?l\.?|Limited|Ltd\.?|Pvt\.?\s*Ltd\.?|N\.V\.|B\.V\.|AG|KG))/i;
    const mCo = rest.match(reCo);
    if (mCo) out.manufacturer = _trim(mCo[1]);
    else {
      const parts = rest.split(/[\/;,]/);
      for (const p of parts){
        const c = _trim(p);
        if (c.length>=3 && /[A-Za-z]{3,}/.test(c)){ out.manufacturer = c; break; }
      }
    }
  }
  return out;
}

// Rút "brand core" (bỏ country + suffix công ty + stopword) để chuẩn hoá & so khớp.
// Loại BỎ hẳn từ nước (kể cả tiếng Việt có dấu như "trung quốc") TRƯỚC khi normalize,
// tránh mảnh "trung qu" lọt vào core rồi gây khớp nhầm.
function brandCore(text){
  const stripped = removeCountryWords(_nfc(text)); // bỏ "Trung Quốc", "Việt Nam"...
  const norm = _normForBrand(stripped);
  if (!norm) return '';
  const toks = norm.split(' ').filter(w => w.length>=2 && !COMPANY_STOPWORDS.has(w));
  return toks.join(' ');
}

// Core có đủ "chất" để dùng làm brand matcher không? (chặn core quá ngắn / rỗng)
function isMeaningfulCore(core){
  if (!core) return false;
  const compact = core.replace(/\s+/g,'');
  return compact.length >= 3;   // ít nhất 3 ký tự chữ (KAI, SDI vẫn hợp lệ)
}

function parsePrice(v){
  if (v==null || v==='') return null;
  if (typeof v==='number') return v;
  let s = String(v).replace(/[^\d.,\-]/g,'');
  if (!s) return null;
  if (s.indexOf(',')!==-1 && s.indexOf('.')!==-1) s = s.replace(/\./g,'').replace(',','.');
  else if (s.indexOf(',')!==-1 && /,\d{1,2}$/.test(s)) s = s.replace(',','.');
  else s = s.replace(/[.,]/g,'');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDate(v){
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = _trim(v);
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m){ let y=parseInt(m[3],10); if(y<100)y+=2000; return new Date(y,parseInt(m[2],10)-1,parseInt(m[1],10)); }
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(parseInt(m[1],10),parseInt(m[2],10)-1,parseInt(m[3],10));
  const n = parseFloat(s);
  if (!isNaN(n) && n>20000 && n<60000) return new Date((n-25569)*86400*1000);
  return null;
}

function priceTier(n){
  if (n==null) return '';
  if (n <= CFG.PRICE_LOW_MAX) return 'Low';
  if (n <= CFG.PRICE_MID_MAX) return 'Mid';
  return 'High';
}

// ============== 4. ĐỊA LÝ ==============

function getProvinceNew(address){
  if (!address) return null;
  const t = _lc(address);
  const keys = Object.keys(PROVINCE_MERGE).sort((a,b)=>b.length-a.length);
  for (const k of keys){ if (t.indexOf(k)!==-1) return PROVINCE_MERGE[k]; }
  return null;
}
function getRegion(provinceNew){ return provinceNew ? (REGION_MAP[provinceNew]||null) : null; }
function getNppRegion(address){
  if (!address) return null;
  const t = _lc(address);
  const keys = Object.keys(OLD_PROVINCE_TO_NPP).sort((a,b)=>b.length-a.length);
  for (const k of keys){ if (t.indexOf(k)!==-1) return OLD_PROVINCE_TO_NPP[k]; }
  return null;
}

// ============== 5. REGISTRY (tham chiếu dòng TRÊN vùng chọn) ==============
//
// registry = {
//   brandMatchers: [{canon, core}]  (sort core dài→ngắn),  ← seed KNOWN_BRANDS + dòng trên
//   countrySet:    Set(English country đã xuất hiện)
//   codeToBrand:   { CODE: {brand: count} },
//   codeToCountry: { CODE: {country: count} },
// }

function buildRegistry(refRows, col){
  const brandSeen = {};          // core -> canon
  const countrySet = new Set();
  const codeToBrand = {};
  const codeToCountry = {};

  // 5.1 seed KNOWN_BRANDS (luôn thắng — data KHÔNG được ghi đè tên chuẩn)
  const seedCores = [];   // core của các hãng đã biết
  for (const b of KNOWN_BRANDS){
    const core = brandCore(b);
    if (isMeaningfulCore(core) && !brandSeen[core]){
      brandSeen[core] = _trim(b);
      seedCores.push(core);
    }
  }
  // core data có CHỨA (theo token) 1 seed core → coi như trùng seed, không tạo entry mới.
  function coreHitsSeed(core){
    const hay = ' '+core+' ';
    for (const sc of seedCores){ if (hay.indexOf(' '+sc+' ')!==-1) return true; }
    return false;
  }

  // 5.2 học từ các dòng tham chiếu
  for (const row of refRows){
    // hãng
    const manRaw = col.manuf!==-1 ? row[col.manuf] : '';
    const manTrim = _trim(manRaw);
    if (manTrim){
      const core = brandCore(manTrim);
      // canonical = bỏ country + suffix pháp lý ở đuôi, giữ phần tên chính; nếu rỗng thì dùng manTrim.
      const canonical = _trim(removeCountryWords(manTrim).replace(/[\/;,]\s*$/,'')) || manTrim;
      // chỉ thêm nếu core CÓ NGHĨA, CHƯA có, và KHÔNG chứa 1 seed core
      // (vd "mani hanoi" chứa seed "mani" → bỏ qua để match về "Mani")
      if (isMeaningfulCore(core) && !brandSeen[core] && !coreHitsSeed(core)) brandSeen[core] = canonical;
    }
    // country (English canonical)
    const oRaw = col.origin!==-1 ? row[col.origin] : '';
    const oTrim = _trim(oRaw);
    if (oTrim){
      const key = _lc(oTrim);
      if (COUNTRY_MAP[key]) countrySet.add(COUNTRY_MAP[key]);
      else {
        // ô "Xuất xứ" có thể đã là tên nước English chuẩn (file đã xử lý)
        const cs = detectCountries(oTrim);
        if (cs.length) countrySet.add(cs[cs.length-1]);
      }
    }
    // code → brand / country
    const codeRaw = col.code!==-1 ? row[col.code] : '';
    if (codeRaw){
      const codes = String(codeRaw).split(/[,;\/\s]+/).map(_trim).filter(c=>c.length>=3);
      for (const c of codes){
        if (manTrim){
          const canon = brandSeen[brandCore(manTrim)] || manTrim;
          codeToBrand[c] = codeToBrand[c] || {};
          codeToBrand[c][canon] = (codeToBrand[c][canon]||0)+1;
        }
        const key = _lc(oTrim);
        const ctry = COUNTRY_MAP[key] || (detectCountries(oTrim)[0]||null);
        if (ctry){
          codeToCountry[c] = codeToCountry[c] || {};
          codeToCountry[c][ctry] = (codeToCountry[c][ctry]||0)+1;
        }
      }
    }
  }

  const matchers = Object.keys(brandSeen).map(core=>({core, canon:brandSeen[core]}));
  matchers.sort((a,b)=>b.core.length-a.core.length); // cụm dài match trước
  return { brandMatchers:matchers, countrySet, codeToBrand, codeToCountry };
}

// Khớp 1 chuỗi với brand đã biết trong registry (chứa cụm brandCore).
function matchRegistryBrand(text, registry){
  const core = brandCore(text);
  if (!isMeaningfulCore(core)) return null;
  const hay = ' ' + core + ' ';
  for (const m of registry.brandMatchers){
    if (!isMeaningfulCore(m.core)) continue;   // không match bằng core rác
    if (hay.indexOf(' '+m.core+' ') !== -1) return m.canon;
  }
  return null;
}

// Khớp quốc gia: ưu tiên registry (đã xuất hiện), else COUNTRY_MAP, else detect.
function resolveCountry(originText, registry){
  const t = _trim(originText);
  if (!t) return null;
  const key = _lc(t);
  if (COUNTRY_MAP[key]){
    const en = COUNTRY_MAP[key];
    return en; // English chuẩn (đã có trong registry hay chưa cũng trả English)
  }
  const cs = detectCountries(t);
  if (cs.length) return cs[cs.length-1];
  return null;
}

// ============== 6. PIPELINE — LÀM SẠCH VÙNG ĐANG CHỌN ==============

function cleanSelectedRange(){
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  const sel = sheet.getActiveRange();
  if (!sel){ ui.alert('Chưa chọn vùng nào. Hãy bôi chọn các dòng cần làm sạch.'); return; }

  const allValues = sheet.getDataRange().getValues();
  const headerRow = findHeaderRow(allValues, CFG.COL_STT); // 0-based
  if (headerRow === -1){ ui.alert('Không tìm thấy hàng tiêu đề (STT / No.).'); return; }
  const header = allValues[headerRow];

  const col = {
    origin: findColIndex(header, CFG.COL_ORIGIN),
    manuf:  findColIndex(header, CFG.COL_MANUF),
    code:   findColIndex(header, CFG.COL_CODE),
    model:  findColIndex(header, CFG.COL_MODEL),
    price:  findColIndex(header, CFG.COL_PRICE),
    date:   findColIndex(header, CFG.COL_DATE),
    decdate:findColIndex(header, CFG.COL_DECDATE),
    addr:   findColIndex(header, CFG.COL_ADDRESS),
  };
  if (col.origin===-1 || col.manuf===-1){
    ui.alert('Không tìm thấy cột "Xuất xứ" và/hoặc "Hãng sản xuất".'); return;
  }

  // Vùng chọn (1-based rows trên sheet)
  const selStart = sel.getRow();                    // dòng đầu vùng chọn
  const selEnd   = sel.getLastRow();                // dòng cuối vùng chọn
  const dataFirst = headerRow + 2;                  // dòng dữ liệu đầu tiên (1-based) = header+1 (0based) +1
  const startRow  = Math.max(selStart, dataFirst);  // không xử lý header
  if (startRow > selEnd){ ui.alert('Vùng chọn không chứa dòng dữ liệu.'); return; }

  // 6.1 REGISTRY từ các dòng TRÊN startRow (dataFirst → startRow-1)
  const refRows = [];
  for (let r = dataFirst; r < startRow; r++){
    refRows.push(allValues[r-1]); // allValues 0-based
  }
  const registry = buildRegistry(refRows, col);

  // 6.2 đảm bảo đủ cột output tới AC
  const needCols = CFG.OUT_START_COL + CFG.OUT_HEADERS.length - 1; // 23..29
  if (sheet.getMaxColumns() < needCols){
    sheet.insertColumnsAfter(sheet.getMaxColumns(), needCols - sheet.getMaxColumns());
  }
  // ghi header cột mới (idempotent)
  sheet.getRange(headerRow+1, CFG.OUT_START_COL, 1, CFG.OUT_HEADERS.length)
       .setValues([CFG.OUT_HEADERS])
       .setBackground(CFG.COLOR_HEADER_NEW)
       .setFontColor(CFG.COLOR_HEADER_FG)
       .setFontWeight('bold');

  // 6.3 xử lý từng dòng trong vùng chọn
  const nRows = selEnd - startRow + 1;
  const outMatrix = [];        // giá trị 7 cột W..AC
  const flagMan = [];          // 'reg' | 'parse' | '' cho từng dòng (để tô màu cột Y & E)
  const flagCty = [];
  let cntRegBrand=0, cntParseBrand=0, cntRegCty=0, cntParseCty=0;

  for (let i=0;i<nRows;i++){
    const rowIdx0 = startRow-1 + i;          // 0-based trong allValues
    const row = allValues[rowIdx0];

    const originRaw = col.origin!==-1 ? row[col.origin] : '';
    const manRaw    = col.manuf!==-1  ? row[col.manuf]  : '';
    const codeRaw   = col.code!==-1   ? row[col.code]   : '';
    const addr      = col.addr!==-1   ? row[col.addr]   : '';

    // --- HÃNG ---
    let brand = null, bSrc = '';
    // (a) khớp registry từ cột Hãng
    brand = matchRegistryBrand(manRaw, registry);
    if (brand) bSrc='reg';
    // (b) khớp registry từ cột Xuất xứ
    if (!brand){ const b2 = matchRegistryBrand(originRaw, registry); if (b2){ brand=b2; bSrc='reg'; } }
    // (c) tham chiếu theo Code
    if (!brand && codeRaw){
      for (const c of String(codeRaw).split(/[,;\/\s]+/).map(_trim)){
        if (c.length<3) continue;
        const m = registry.codeToBrand[c];
        if (m){ brand = Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0]; bSrc='reg'; break; }
      }
    }
    // (d) fallback: bóc tách
    if (!brand){
      const p = parseOriginField(originRaw);
      let cand = _trim(manRaw) || p.manufacturer;
      if (cand){
        // thử khớp registry lần nữa với chuỗi vừa bóc
        const again = matchRegistryBrand(cand, registry);
        if (again){ brand=again; bSrc='reg'; }
        else {
          const core = brandCore(cand);
          // Tên hiển thị: bỏ country + đuôi pháp lý, giữ nguyên hoa/thường gốc nếu có.
          const disp = _trim(removeCountryWords(cand).replace(/[\/;,]\s*$/,'')) || _trim(cand);
          brand = disp; bSrc='parse';
          // nạp brand mới vào registry để dòng sau khớp được (chỉ khi core có nghĩa)
          if (isMeaningfulCore(core) && !registry.brandMatchers.some(m=>m.core===core)){
            registry.brandMatchers.push({core, canon:brand});
            registry.brandMatchers.sort((a,b)=>b.core.length-a.core.length);
          }
        }
      }
    }
    if (brand){ if(bSrc==='reg')cntRegBrand++; else cntParseBrand++; }
    flagMan.push(bSrc);

    // --- QUỐC GIA (English) ---
    let country=null, cSrc='';
    country = resolveCountry(originRaw, registry);
    if (country){ cSrc = registry.countrySet.has(country) ? 'reg' : 'parse'; }
    if (!country && codeRaw){
      for (const c of String(codeRaw).split(/[,;\/\s]+/).map(_trim)){
        if (c.length<3) continue;
        const m = registry.codeToCountry[c];
        if (m){ country = Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0]; cSrc='reg'; break; }
      }
    }
    if (!country){ const p=parseOriginField(originRaw); if(p.country){country=p.country; cSrc='parse';} }
    if (country){ registry.countrySet.add(country); if(cSrc==='reg')cntRegCty++; else cntParseCty++; }
    flagCty.push(cSrc);

    // --- các cột suy diễn ---
    // W (Year) = YYYY, X (Month) = MM/YYYY — căn cứ cột "Decision Issue Date" (T);
    // fallback về Award Publication Date nếu không có cột T.
    let year='', month='';
    let dSrc = col.decdate!==-1 ? row[col.decdate] : null;
    if (dSrc==null || _trim(dSrc)==='') dSrc = col.date!==-1 ? row[col.date] : null;
    const d = parseDate(dSrc);
    if (d){ year=d.getFullYear(); month=('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear(); }

    const price = parsePrice(col.price!==-1 ? row[col.price] : null);
    const tier  = priceTier(price);

    const provNew = getProvinceNew(addr);
    const region  = getRegion(provNew);
    const npp     = getNppRegion(addr);

    outMatrix.push([
      year, month, brand||'', region||'', tier, provNew||'', npp||''
    ]);

    // ghi lại country vào cột Xuất xứ (E) — chuẩn hoá English
    if (country && col.origin!==-1){
      sheet.getRange(startRow+i, col.origin+1).setValue(country)
           .setBackground(cSrc==='reg' ? CFG.COLOR_REGISTRY : CFG.COLOR_EDITED);
    }
    // ghi brand vào cột Hãng sản xuất (I) — chuẩn hoá
    if (brand && col.manuf!==-1){
      sheet.getRange(startRow+i, col.manuf+1).setValue(brand)
           .setBackground(bSrc==='reg' ? CFG.COLOR_REGISTRY : CFG.COLOR_EDITED);
    }
  }

  // 6.4 ghi 7 cột W..AC cho vùng chọn
  sheet.getRange(startRow, CFG.OUT_START_COL, nRows, CFG.OUT_HEADERS.length).setValues(outMatrix);

  // format Price_Tier để trống thì để trống; format cột Month là text ok.
  // (Year là số → để general; nếu muốn để number thì bỏ format.)

  ui.alert(
    '✅ Đã làm sạch vùng chọn (Dao phẫu thuật)!\n\n' +
    '• Dòng tham chiếu (trên vùng chọn): ' + refRows.length + '\n' +
    '• Dòng đã xử lý: ' + nRows + '\n' +
    '• Hãng: khớp registry ' + cntRegBrand + ' | bóc tách ' + cntParseBrand + '\n' +
    '• Quốc gia: khớp registry ' + cntRegCty + ' | bóc tách ' + cntParseCty + '\n\n' +
    'Cột tạo: W=Year, X=Month, Y=Manufacturer_Norm, Z=Region,\n' +
    '         AA=Price_Tier, AB=Province_Clean, AC=Region_by_Distributor\n\n' +
    'Màu:  🟢 xanh lá = khớp dòng đã có (registry)\n' +
    '      🟡 vàng   = bóc tách từ "Xuất xứ"'
  );
}

// Làm sạch TOÀN BỘ (registry = KNOWN_BRANDS + không có dòng trên; xử lý từ dòng data đầu).
function cleanAllRows(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const allValues = sheet.getDataRange().getValues();
  const headerRow = findHeaderRow(allValues, CFG.COL_STT);
  if (headerRow === -1){ SpreadsheetApp.getUi().alert('Không tìm thấy hàng tiêu đề.'); return; }
  const dataFirst = headerRow + 2;
  const lastRow = sheet.getLastRow();
  sheet.getRange(dataFirst, 1, lastRow-dataFirst+1, 1).activate();
  cleanSelectedRange();
}

// ============== 7. MENU ==============


/**
 * ================================================================
 *  MMH — DAO PT NHÃN KHOA: LỌC + PHÂN LOẠI KNIFE TYPE + PRICE_TIER
 *  ----------------------------------------------------------------
 *  Chạy SAU bước làm sạch cột (đã có Manufacturer, Country, Price_Tier...).
 *  Nhiệm vụ:
 *   ① LỌC GIÁ: dao PT nhãn khoa chỉ có "Đơn giá trúng thầu" trong
 *      khoảng [40.000 ; 400.000]. Dòng ngoài khoảng → XOÁ CẢ DÒNG.
 *   ② XÁC ĐỊNH có phải dao nhãn khoa không (giữ / loại) — theo brand
 *      tham chiếu + keyword tên + độ giống Product Code.
 *   ③ Điền "Knife Type" (Stab / Slit / Cresent / MVR Knife).
 *   ④ Điền "Price_Tier" (Low / Mid / High) theo tham chiếu.
 *
 *  ─── PHẠM VI XỬ LÝ ─────────────────────────────────────────────
 *  • Nếu người dùng ĐANG CHỌN các dòng (có thể chọn rời rạc, không cần
 *    bôi đen liền mạch) → chỉ xử lý những dòng đó.
 *  • Nếu KHÔNG chọn gì (chỉ đứng ở 1 ô) → tự QUÉT mọi dòng có "Knife
 *    Type" còn TRỐNG và xử lý.
 *  Registry (brand / code / type / tier) LUÔN học từ TẤT CẢ dòng có
 *  sẵn "Knife Type" (tham chiếu), bất kể dòng đó có được chọn hay không.
 *
 *  ─── LOGIC XÁC ĐỊNH DAO NHÃN KHOA (giữ dòng) ───────────────────
 *  Điều kiện tiên quyết: giá trong [40k;400k] (nếu không → đã bị xoá ở ①).
 *  Giữ dòng nếu THOẢ 1 trong:
 *   (a) Brand ĐÃ xuất hiện ở dòng tham chiếu  → nghi ngờ, rồi xác nhận:
 *         - tên có keyword nhãn khoa  → chắc chắn giữ; HOẶC
 *         - Product Code giống ≥60% 1 code tham chiếu (cùng brand) → giữ.
 *       (chỉ brand quen mà không keyword & không giống code → vẫn giữ,
 *        vì brand quen + đúng khoảng giá đủ tin; đánh dấu 'brand-only')
 *   (b) Brand LẠ (chưa từng xuất hiện) → BẮT BUỘC tên phải chứa keyword
 *       nhãn khoa mới giữ; không có keyword → XOÁ CẢ DÒNG.
 *
 *  ─── LOGIC KNIFE TYPE ──────────────────────────────────────────
 *   R1. Cùng brand + Product Code giống ≥60% dòng tham chiếu → lấy type
 *       của dòng đó (majority nếu nhiều).
 *   R2. Theo keyword tên:
 *        • "15 độ"/"15°"/"chọc tiền phòng"/"mổ phụ"        → Stab knife
 *        • 2.0/2.2/2.4/2.8/3.0/3.2/2.85/2.7 (dấu . hoặc ,) → Slit knife
 *        • đường hầm/lạng mộng/mổ mộng/nạo mộng/bán nguyệt/
 *          crescent/cresent/tạo vạt                        → Cresent knife
 *        • chọc củng mạc + (GA/G gauge: 19G/20G/23G/25G…)  → MVR Knife
 *   R3. Combo (brand + giá) từng xuất hiện → lấy type đó; nếu brand có cả
 *       Cresent & Slit giá gần nhau → ưu tiên đối chiếu thêm Product Code.
 *   R4. Vẫn không ra → để trống (đánh dấu vàng để review tay).
 *
 *  ─── LOGIC PRICE_TIER ──────────────────────────────────────────
 *   T1. Cùng brand + code giống ≥60% dòng tham chiếu → giữ NGUYÊN tier cũ.
 *   T2. Theo Knife Type đã xác định: lấy tier hay gặp nhất của (type) tại
 *       mức giá gần nhất trong tham chiếu (nearest-price vote).
 *   T3. Fallback ngưỡng tĩnh: ≤100k Low, ≤180k Mid, >180k High.
 * ================================================================
 */

// ============== 0. CẤU HÌNH ==============
const KCFG = {
  SHEET_NAME_HINTS: ['Data xử lý','Danh sách hàng hóa','KQTT','Sheet1'],

  COL_STT:   ['STT','No.'],
  COL_NAME:  ['Tên thiết bị','Product Name'],
  COL_CODE:  ['Kỹ mã hiệu','Ký mã hiệu','Product Code'],
  COL_MANUF: ['Hãng sản xuất','Manufacturer'],
  COL_MANNORM:['Manufacturer_Norm'],           // ưu tiên nếu có (hãng đã chuẩn)
  COL_PRICE: ['Đơn giá trúng thầu','Awarded Unit Price'],
  COL_TIER:  ['Price_Tier'],
  COL_KTYPE: ['Knife Type'],
  COL_DECDATE: ['Ngày ban hành','Decision Issue Date'],
  COL_DATE2:   ['Ngày đăng tải','Award Publication Date'],
  COL_ADDR:  ['Địa điểm','Location'],
  COL_YEAR:  ['Year'],
  COL_MONTH: ['Month'],
  COL_REGION:['Region'],
  COL_PROV:  ['Province_Clean'],
  COL_NPP:   ['Region_by_Distributor'],

  PRICE_MIN: 40000,
  PRICE_MAX: 400000,

  // ngưỡng Price_Tier tĩnh (fallback cuối)
  TIER_LOW_MAX: 100000,
  TIER_MID_MAX: 180000,

  CODE_SIM_THRESHOLD: 0.60,   // ≥60% coi là "giống"

  COLOR_FILLED:   '#D9EAD3',  // xanh: điền chắc chắn (tham chiếu)
  COLOR_INFERRED: '#FFF9D0',  // vàng: suy đoán / cần review
  COLOR_DUP:      '#F4CCCC',  // đỏ nhạt: DÒNG TRÙNG (B→Q giống hệt) — KHÔNG xoá, để soát tay
  COLOR_HEADER:   '#3A5CAA',
  COLOR_HEADER_FG:'#FFFFFF',
};

// ============== 1. KEYWORDS ==============
// Keyword khẳng định "là dao nhãn khoa" (dùng để GIỮ dòng, nhất là brand lạ).
const OPHTH_KEYWORDS = [
  'mắt','nhãn khoa','phaco','thủy tinh thể','thuỷ tinh thể','15 độ','15°','mổ mộng','lạng mộng',
  'nạo mộng','tạo đường hầm','đường hầm','tiền phòng','chọc tiền phòng','củng mạc',
  'crescent','cresent','bán nguyệt','tạo vạt',
];
// slit sizes: cả dấu . và , — dùng để cả keyword lẫn phân loại Slit.
const SLIT_SIZES = ['2.0','2.2','2.4','2.8','3.0','3.2','2.85','2.7',
                    '2,0','2,2','2,4','2,8','3,0','3,2','2,85','2,7'];

const KW_STAB = ['15 độ','15°','chọc tiền phòng','mổ phụ','tiền phòng','lance'];
const KW_CRES = ['đường hầm','lạng mộng','mổ mộng','nạo mộng','bán nguyệt','crescent','cresent','tạo vạt'];
// MVR: "chọc củng mạc" + gauge, hoặc token "MVR" trong tên/code

// Xác định type từ TOKEN tường minh trong TÊN + PRODUCT CODE (tin cậy cao nhất).
// Nhiều hãng mã hoá loại dao ngay trong code: .../SLIT/2.8, .../LANCE/15°,
// .../CRESCENT/2.5, .../MVR/23G — token chữ này đáng tin hơn prefix code.
function knifeTypeByTokens(name, codeRaw){
  const nlc = _lc(name);
  const t   = nlc + ' ' + _lc(codeRaw);
  if (nlc.indexOf('chọc củng mạc')!==-1 && hasGauge(nlc)) return 'MVR Knife';
  if (/\bmvr\b/.test(t)) return 'MVR Knife';
  if (hasAny(t, KW_CRES)) return 'Cresent knife';
  if (t.indexOf('slit')!==-1) return 'Slit knife';
  if (t.indexOf('lance')!==-1) return 'Stab knife';
  if (hasSlitSize(name) || hasSlitSize(codeRaw)) return 'Slit knife';
  if (hasAny(nlc, KW_STAB)) return 'Stab knife';
  return null;
}

// ============== 1C. TRA CỨU MASTER + CODE-PREFIX LIBRARY ==============
// Master runtime: gộp MASTER_SEED (nhúng sẵn) + đọc thêm từ sheet "Master_Dao".
// Cấu trúc: masterExact['brandkey|CODENORM'] = {t:type, tiers:Set}, và
//           masterPrefix[brandkey] = [[prefix,type],...] (dài trước).
let _masterRuntime = null;   // {exact:{}, prefix:{}, knownBrandKeys:Set}

function normCodeStrict(c){ return _nfc(c).toUpperCase().replace(/[^A-Z0-9]/g,''); }

function loadMasterRuntime(ss){
  if (_masterRuntime) return _masterRuntime;
  const exact = {};
  const prefix = {};
  const knownBrandKeys = new Set();

  // 1) seed nhúng
  for (const key in MASTER_SEED){
    const v = MASTER_SEED[key];
    exact[key] = { t:v.t, tiers:new Set(v.tiers||[]) };
    knownBrandKeys.add(key.split('|')[0]);
  }
  for (const bkk in CODE_PREFIX_LIB){
    prefix[bkk] = CODE_PREFIX_LIB[bkk].slice();
    knownBrandKeys.add(bkk);
  }

  // 2) đọc thêm sheet Master_Dao nếu có (Hãng|Xuất xứ|Loại dao|Mã sp|Phân khúc giá)
  const sh = ss.getSheetByName('Master_Dao');
  if (sh){
    const mv = sh.getDataRange().getValues();
    for (let i=1;i<mv.length;i++){       // bỏ header
      const brand=_trim(mv[i][0]), ktype=_trim(mv[i][2]), codeCell=mv[i][3], tierCell=_trim(mv[i][4]);
      if (!brand || !ktype) continue;
      const bkk=brandKey(brand);
      knownBrandKeys.add(bkk);
      const tiers=tierCell?tierCell.split(/[;,]/).map(_trim).filter(Boolean):[];
      for (const c of splitCodes(codeCell)){
        const key=bkk+'|'+c;
        if (!exact[key]) exact[key]={t:ktype, tiers:new Set()};
        else exact[key].t=exact[key].t||ktype;
        for (const tt of tiers) exact[key].tiers.add(tt);
      }
    }
  }
  _masterRuntime = {exact, prefix, knownBrandKeys};
  return _masterRuntime;
}

// Tra loại dao theo Master (exact trước, rồi prefix library của hãng).
// return {type, src} | null   (src: 'master-exact' | 'master-prefix')
function lookupMasterType(bk, codes){
  const M=_masterRuntime; if (!M) return null;
  // exact
  for (const c of codes){
    const hit=M.exact[bk+'|'+c];
    if (hit && hit.t) return {type:hit.t, src:'master-exact'};
  }
  // prefix (mã mới của hãng đã biết): so từng code với các prefix của hãng
  const rules=M.prefix[bk];
  if (rules){
    for (const c of codes){
      for (const [pre,typ] of rules){         // rules đã sort dài→ngắn
        if (c.indexOf(pre)===0) return {type:typ, src:'master-prefix'};
      }
    }
  }
  return null;
}

// Tra phân khúc giá đã từng xuất hiện cho (hãng, mã) trong Master.
function lookupMasterTiers(bk, codes){
  const M=_masterRuntime; if (!M) return null;
  for (const c of codes){
    const hit=M.exact[bk+'|'+c];
    if (hit && hit.tiers && hit.tiers.size) return hit.tiers;
  }
  return null;
}

// ============== 2. UTILITIES ==============
function toPrice(v){
  if (v==null||v==='') return null;
  if (typeof v==='number') return v;
  let s=String(v).replace(/[^\d.,\-]/g,'');
  if (!s) return null;
  if (s.indexOf(',')!==-1 && s.indexOf('.')!==-1) s=s.replace(/\./g,'').replace(',','.');
  else if (s.indexOf(',')!==-1 && /,\d{1,2}$/.test(s)) s=s.replace(',','.');
  else s=s.replace(/[.,]/g,'');
  const n=parseFloat(s); return isNaN(n)?null:n;
}

// Chuẩn hoá 1 product code để so sánh: HOA + bỏ khoảng trắng/ký tự lạ.
function normCode(c){
  return _nfc(c).toUpperCase().replace(/[^A-Z0-9]/g,'');
}
// Tách 1 ô code (có thể nhiều code) → mảng code đã chuẩn hoá.
function splitCodes(cell){
  if (cell==null) return [];
  return String(cell).split(/[,;\/\n]+/).map(normCode).filter(c=>c.length>=2);
}
// Độ giống 2 code: tỉ lệ prefix chung dài nhất trên độ dài code ngắn hơn,
// cộng thưởng nếu 1 code là substring của code kia (MST15 ⊂ MST15SH).
function codeSim(a,b){
  if (!a||!b) return 0;
  if (a===b) return 1;
  if (a.indexOf(b)!==-1 || b.indexOf(a)!==-1){
    return Math.min(a.length,b.length)/Math.max(a.length,b.length);
  }
  // longest common prefix
  let i=0; const m=Math.min(a.length,b.length);
  while (i<m && a[i]===b[i]) i++;
  return i/Math.max(a.length,b.length);
}
// Độ giống tốt nhất giữa 2 tập code.
function bestCodeSim(codesA, codesB){
  let best=0;
  for (const a of codesA) for (const b of codesB){
    const s=codeSim(a,b); if (s>best) best=s;
  }
  return best;
}
function brandKey(s){ return _lc(s).replace(/\s+/g,' ').trim(); }

// ============== 3. KEYWORD MATCH ==============
function hasAny(textLc, list){
  for (const k of list){ if (textLc.indexOf(k.toLowerCase())!==-1) return true; }
  return false;
}
function hasSlitSize(text){
  // so trực tiếp chuỗi số (cả . và ,) — tránh nhầm "15" đơn lẻ.
  const t = _nfc(text);
  for (const s of SLIT_SIZES){ if (t.indexOf(s)!==-1) return true; }
  return false;
}
function hasGauge(textLc){
  return /\b\d{2}\s*(?:ga|g)\b/.test(textLc);  // 20GA, 23G, 25 G...
}
function isOphthByName(name){
  const t=_lc(name);
  if (hasAny(t, OPHTH_KEYWORDS)) return true;
  if (hasSlitSize(name)) return true;
  if (t.indexOf('chọc củng mạc')!==-1 && hasGauge(t)) return true;
  return false;
}

// ============== 4. REGISTRY ==============
// Học từ mọi dòng CÓ Knife Type sẵn.
function buildKnifeRegistry(rows, col){
  const reg = {
    brandSet: new Set(),
    refByBrand: {},                 // brandKey -> [{codes:[], type, tier, price}]
    brandTypeCount: {},             // brandKey -> {type:count}
    brandPriceType: {},             // brandKey -> [{price,type}]
    codeExactType: {},              // brand|code -> {type:count}
    codeExactTier: {},              // brand|code -> {tier:count}
  };
  for (const r of rows){
    const type = _trim(col.ktype!==-1 ? r[col.ktype] : '');
    if (!type) continue;
    const bRaw = (col.mannorm!==-1 && _trim(r[col.mannorm])) ? r[col.mannorm]
               : (col.manuf!==-1 ? r[col.manuf] : '');
    const bk = brandKey(bRaw);
    const codes = splitCodes(col.code!==-1 ? r[col.code] : '');
    const tier = _trim(col.tier!==-1 ? r[col.tier] : '');
    const price = toPrice(col.price!==-1 ? r[col.price] : null);

    if (bk){
      reg.brandSet.add(bk);
      (reg.refByBrand[bk] = reg.refByBrand[bk] || []).push({codes, type, tier, price});
      reg.brandTypeCount[bk] = reg.brandTypeCount[bk] || {};
      reg.brandTypeCount[bk][type] = (reg.brandTypeCount[bk][type]||0)+1;
      if (price!=null){
        (reg.brandPriceType[bk] = reg.brandPriceType[bk] || []).push({price,type,tier});
      }
      for (const c of codes){
        const key = bk+'|'+c;
        reg.codeExactType[key] = reg.codeExactType[key] || {};
        reg.codeExactType[key][type] = (reg.codeExactType[key][type]||0)+1;
        if (tier){
          reg.codeExactTier[key] = reg.codeExactTier[key] || {};
          reg.codeExactTier[key][tier] = (reg.codeExactTier[key][tier]||0)+1;
        }
      }
    }
  }
  return reg;
}
function topOf(counter){
  if (!counter) return null;
  let best=null;
  for (const k in counter){ if (!best || counter[k]>best.n) best={k,n:counter[k]}; }
  return best ? best.k : null;
}

// Tìm dòng tham chiếu cùng brand có code giống ≥ threshold; trả {type,tier,sim}.
function matchByCode(bk, codes, reg){
  const refs = reg.refByBrand[bk];
  if (!refs || !codes.length) return null;
  let best=null;
  for (const ref of refs){
    const sim = bestCodeSim(codes, ref.codes);
    if (sim >= KCFG.CODE_SIM_THRESHOLD && (!best || sim>best.sim)){
      best = {type:ref.type, tier:ref.tier, sim};
    }
  }
  return best;
}

function tierByStatic(price){
  if (price==null) return '';
  if (price<=KCFG.TIER_LOW_MAX) return 'Low';
  if (price<=KCFG.TIER_MID_MAX) return 'Mid';
  return 'High';
}

// ============== 5. XÁC ĐỊNH DAO NHÃN KHOA (giữ/loại) ==============
// return { keep:bool, reason:string }
function decideKeep(name, bk, codes, reg){
  const knownBrand = reg.brandSet.has(bk);
  const nameOK = isOphthByName(name);
  if (knownBrand){
    if (nameOK) return {keep:true, reason:'known+name'};
    const cm = matchByCode(bk, codes, reg);
    if (cm) return {keep:true, reason:'known+code'};
    return {keep:true, reason:'brand-only'};   // brand quen + đúng khoảng giá
  }
  // brand lạ → bắt buộc keyword tên
  if (nameOK) return {keep:true, reason:'newbrand+name'};
  return {keep:false, reason:'newbrand+nokw'};
}

// ============== 6. XÁC ĐỊNH KNIFE TYPE ==============
// return { type, src }  (src: 'token' | 'code' | 'name' | 'brand+price' | '')
function decideKnifeType(name, codeRaw, bk, codes, price, reg){
  // R0 (ưu tiên cao nhất): token type tường minh trong tên/code
  //     (SLIT / LANCE / CRESCENT / MVR / size 2.x-3.x / 15 độ)
  const tt = knifeTypeByTokens(name, codeRaw);
  if (tt) return {type:tt, src:'token'};

  // R0b: MASTER library (exact 'brand|code', rồi prefix của hãng — vd Mani MSL→Slit)
  //      → giải quyết mã như MSL28SH, PE3630, 962468... không có token size.
  const ml = lookupMasterType(bk, codes);
  if (ml) return {type:ml.type, src:ml.src};

  // R1: code similarity cùng brand ≥60%
  const cm = matchByCode(bk, codes, reg);
  if (cm && cm.type) return {type:cm.type, src:'code'};

  // R1b: exact code (brand|code) majority
  for (const c of codes){
    const t = topOf(reg.codeExactType[bk+'|'+c]);
    if (t) return {type:t, src:'code'};
  }

  // R3: combo brand+price (nearest price trong brand, vote trong dải ±15%)
  const arr = reg.brandPriceType[bk];
  if (arr && arr.length && price!=null){
    const sorted = arr.slice().sort((a,b)=>Math.abs(a.price-price)-Math.abs(b.price-price));
    const band = sorted.filter(x=>Math.abs(x.price-price)<=price*0.15);
    if (band.length){
      const cnt={}; for (const x of band) cnt[x.type]=(cnt[x.type]||0)+1;
      const t=topOf(cnt); if (t) return {type:t, src:'brand+price'};
    }
    return {type:sorted[0].type, src:'brand+price'};
  }

  // R3b: brand dominant type
  const domt = topOf(reg.brandTypeCount[bk]);
  if (domt) return {type:domt, src:'brand+price'};

  return {type:'', src:''};
}

// ============== 7. XÁC ĐỊNH PRICE_TIER ==============
// Trong data dao mẫu, Price_Tier THUẦN theo ngưỡng giá (khớp 100%):
//   ≤100.000 → Low ; 100.001–180.000 → Mid ; >180.000 → High.
// Do đó ngưỡng tĩnh là CHUẨN CHÍNH. Tham chiếu brand/code chỉ dùng khi
// giá rơi đúng sát ranh giới (±2%) và tham chiếu đồng thuận khác đi —
// trường hợp hiếm, để nhất quán với dữ liệu lịch sử của chính hãng đó.
function decideTier(bk, codes, type, price, reg){
  const staticT = tierByStatic(price);
  if (price==null) return {tier:'', src:'static'};

  const nearBoundary =
      Math.abs(price - KCFG.TIER_LOW_MAX) <= KCFG.TIER_LOW_MAX*0.02 ||
      Math.abs(price - KCFG.TIER_MID_MAX) <= KCFG.TIER_MID_MAX*0.02;

  if (nearBoundary){
    for (const c of codes){
      const t = topOf(reg.codeExactTier[bk+'|'+c]);
      if (t && t!==staticT) return {tier:t, src:'code'};
    }
  }
  return {tier:staticT, src:'static'};
}

// ============== 8. THU THẬP DÒNG CẦN XỬ LÝ ==============
// Trả về mảng số dòng (1-based, trên sheet) cần xử lý.
function collectTargetRows(sheet, headerRow0, colKtype){
  const ui = SpreadsheetApp.getUi();
  const dataFirst = headerRow0 + 2; // 1-based
  const lastRow = sheet.getLastRow();
  const set = {};

  // các dòng đang được chọn (kể cả rời rạc)
  const rl = sheet.getActiveRangeList ? sheet.getActiveRangeList() : null;
  let hasSelection = false;
  if (rl){
    const ranges = rl.getRanges();
    for (const rg of ranges){
      const start = rg.getRow(), n = rg.getNumRows();
      // bỏ qua nếu chỉ là 1 ô đơn lẻ ở đúng vị trí không phải data? vẫn nhận nếu ≥1 dòng data
      for (let r=start; r<start+n; r++){
        if (r>=dataFirst && r<=lastRow){ set[r]=true; hasSelection=true; }
      }
    }
  }
  // coi là "không chọn có chủ đích" nếu vùng chọn chỉ đúng 1 ô
  const activeIsSingle = sheet.getActiveRange && sheet.getActiveRange().getNumRows()===1
                         && sheet.getActiveRange().getNumColumns()===1;

  if (!hasSelection || activeIsSingle){
    // KHÔNG chọn có chủ đích → tự quét TOÀN BỘ dòng dữ liệu.
    // (Không chỉ dòng Knife Type trống — vì các dòng đã gán sai từ lần trước
    //  cũng phải được xét lại để áp rule xoá cứng + lọc giá + phân loại lại.)
    const out=[];
    for (let r=dataFirst; r<=lastRow; r++) out.push(r);
    return out;
  }
  return Object.keys(set).map(Number).sort((a,b)=>a-b);
}

// ============== 9B. PHÁT HIỆN & BÔI MÀU DÒNG TRÙNG (KHÔNG XOÁ) ==============
// ĐÃ ĐỔI HÀNH VI (theo yêu cầu): KHÔNG còn xoá dòng trùng nữa.
// Trùng = giá trị giống hệt từ cột B (index1) đến Y (index24) — gồm cả dữ liệu gốc
//   B→V lẫn 3 cột đã điền Year(W) / Month(X) / Manufacturer_Norm(Y).
// Hành vi mới: BÔI MÀU (KCFG.COLOR_DUP) TẤT CẢ các dòng thuộc nhóm trùng (A→AC)
//   để người dùng tự soát và quyết định xoá tay. KHÔNG tự xoá bất kỳ dòng nào.
// Trả về: SỐ DÒNG đã bôi màu (0 nếu không có dòng trùng).
function highlightDuplicateRows(sheet, headerRow0){
  const dataFirst = headerRow0 + 2;              // 1-based
  const lastRow = sheet.getLastRow();
  if (lastRow < dataFirst) return 0;

  const maxCol  = sheet.getMaxColumns();
  const keyCol  = Math.min(17, maxCol);          // đọc A..Q (17 cột) để tạo key so trùng
  const colorW  = Math.min(29, maxCol);          // bôi màu A..AC cho dễ thấy cả record
  const numData = lastRow - dataFirst + 1;
  const vals = sheet.getRange(dataFirst, 1, numData, keyCol).getValues();

  const B = 1, Q = Math.min(16, keyCol - 1);     // 0-based: key so trùng = B..Q
  const groups = {};                             // key(B..Y) -> [rowNum, ...]
  for (let i = 0; i < vals.length; i++){
    const row = vals[i];
    let key = '', nonEmpty = 0;
    for (let c = B; c <= Q; c++){
      const t = _trim((c < row.length) ? row[c] : '');
      if (t !== '') nonEmpty++;
      key += '\u0001' + t;
    }
    // Dòng gần như rỗng (≤1 ô có data trong B→Q) KHÔNG tham gia so trùng.
    if (nonEmpty <= 1) continue;
    (groups[key] = groups[key] || []).push(dataFirst + i);
  }

  // Gom MỌI dòng thuộc nhóm có ≥2 thành viên (bôi cả nhóm để thấy rõ cặp trùng).
  const dupRows = [];
  for (const key in groups){
    const g = groups[key];
    if (g.length < 2) continue;
    for (const rn of g) dupRows.push(rn);
  }
  if (!dupRows.length) return 0;

  // Bôi màu theo từng DẢI liền nhau (gộp để giảm số lần gọi API).
  // Chỉ chạm vào dòng trùng → KHÔNG làm mất màu xanh/vàng của các dòng khác.
  dupRows.sort((a, b) => a - b);
  let s = 0;
  while (s < dupRows.length){
    let e = s;
    while (e + 1 < dupRows.length && dupRows[e + 1] === dupRows[e] + 1) e++;
    sheet.getRange(dupRows[s], 1, dupRows[e] - dupRows[s] + 1, colorW)
         .setBackground(KCFG.COLOR_DUP);
    s = e + 1;
  }
  return dupRows.length;
}

// Giữ NGUYÊN TÊN cũ để tương thích mọi nơi đang gọi (menu ②, upload add-on,
// _selfCheckUploadDeps). Bản này giờ CHỈ bôi màu dòng trùng, KHÔNG xoá.
function removeDuplicateRows(sheet, headerRow0){
  return highlightDuplicateRows(sheet, headerRow0);
}

// ============== XOÁ DÒNG INPUT BỊ LẶP so với DATA ĐANG CÓ (B→Q giống hệt) ==============
// Chỉ xoá các dòng MỚI (từ batchStart trở xuống) nếu nội dung B→Q trùng KHỚP một dòng
// đã tồn tại phía trên (dataFirst..batchStart-1), hoặc trùng một dòng mới đứng trước trong lô.
// KHÔNG đụng tới dữ liệu cũ. Trả về số dòng đã xoá.
function deleteInputDuplicates_(sheet, headerRow0){
  // batchStart truyền qua arguments[2] để giữ tương thích chữ ký cũ nếu có.
  var batchStart = arguments[2];
  var dataFirst = headerRow0 + 2;                 // 1-based
  var lastRow = sheet.getLastRow();
  if (!batchStart || lastRow < batchStart) return 0;

  var maxCol = sheet.getMaxColumns();
  var keyCol = Math.min(17, maxCol);              // A..Q
  var numAll = lastRow - dataFirst + 1;
  if (numAll <= 0) return 0;
  var vals = sheet.getRange(dataFirst, 1, numAll, keyCol).getValues();

  var B = 1, Q = Math.min(16, keyCol - 1);        // 0-based: key = B..Q
  function keyOf(row){
    var k = '', nonEmpty = 0;
    for (var c = B; c <= Q; c++){
      var t = _trim((c < row.length) ? row[c] : '');
      if (t !== '') nonEmpty++;
      k += '\u0001' + t;
    }
    return { k: k, nonEmpty: nonEmpty };
  }

  // 1) tập key của toàn bộ dòng CŨ (phía trên batchStart)
  var existing = {};
  var oldCount = Math.max(0, batchStart - dataFirst);
  for (var i = 0; i < oldCount; i++){
    var ko = keyOf(vals[i]);
    if (ko.nonEmpty > 1) existing[ko.k] = true;
  }

  // 2) duyệt dòng MỚI: trùng dòng cũ HOẶC trùng dòng mới trước đó → xoá (giữ lần đầu)
  var seenBatch = {};
  var toDelete = [];
  for (var j = oldCount; j < numAll; j++){
    var km = keyOf(vals[j]);
    if (km.nonEmpty <= 1) continue;               // dòng gần rỗng → bỏ qua
    if (existing[km.k] || seenBatch[km.k]) toDelete.push(dataFirst + j);
    else seenBatch[km.k] = true;
  }

  toDelete.sort(function (a, b){ return b - a; });   // xoá từ dưới lên
  for (var d = 0; d < toDelete.length; d++) sheet.deleteRow(toDelete[d]);
  return toDelete.length;
}

// ============== QUÉT & XOÁ RÁC TOÀN SHEET (dọn cả dòng CŨ còn sót) ==============
// Xoá mọi dòng có 'Tên thiết bị' dính từ khoá loại bỏ (điện/lưỡi/cán/giấy/siêu âm/
// laser/tiêu bản/vi thể) VÀ KHÔNG có dấu hiệu nhãn khoa (phaco/15 độ/2.2…/MVR/slit…).
// Quét TOÀN BỘ data — kể cả dòng từ các lần nhập trước. Trả về số dòng đã xoá.
function sweepJunkRows_(sheet, headerRow0){
  var dataFirst = headerRow0 + 2;
  var lastRow = sheet.getLastRow();
  if (lastRow < dataFirst) return 0;
  var allValues = sheet.getDataRange().getValues();
  var header = allValues[headerRow0] || [];
  var nameCol = findColIndex(header, KCFG.COL_NAME);
  var codeCol = findColIndex(header, KCFG.COL_CODE);
  if (nameCol === -1) return 0;
  var toDelete = [];
  for (var r = dataFirst; r <= lastRow; r++){
    var row = allValues[r - 1];
    if (!row) continue;
    var nm = row[nameCol];
    if (_trim(nm) === '') continue;
    var cd = codeCol !== -1 ? row[codeCol] : '';
    if (nameIsJunk(nm) && !nameLooksOphthalmic(nm, cd)) toDelete.push(r);
  }
  toDelete.sort(function (a, b){ return b - a; });
  for (var i = 0; i < toDelete.length; i++) sheet.deleteRow(toDelete[i]);
  return toDelete.length;
}

// ============== 9. PIPELINE CHÍNH ==============
function classifyOphthalmicKnives(){
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheet(ss);

  _masterRuntime = null;              // reset cache mỗi lần chạy
  loadMasterRuntime(ss);             // nạp MASTER_SEED + CODE_PREFIX_LIB + sheet Master_Dao

  const values = sheet.getDataRange().getValues();
  const headerRow0 = findHeaderRow(values, KCFG.COL_STT);
  if (headerRow0===-1){ ui.alert('Không tìm thấy hàng tiêu đề (STT / No.).'); return; }
  const header = values[headerRow0];

  const col = {
    name:    findColIndex(header, KCFG.COL_NAME),
    code:    findColIndex(header, KCFG.COL_CODE),
    manuf:   findColIndex(header, KCFG.COL_MANUF),
    mannorm: findColIndex(header, KCFG.COL_MANNORM),
    price:   findColIndex(header, KCFG.COL_PRICE),
    tier:    findColIndex(header, KCFG.COL_TIER),
    ktype:   findColIndex(header, KCFG.COL_KTYPE),
    decdate: findColIndex(header, KCFG.COL_DECDATE),
    date2:   findColIndex(header, KCFG.COL_DATE2),
    addr:    findColIndex(header, KCFG.COL_ADDR),
    year:    findColIndex(header, KCFG.COL_YEAR),
    month:   findColIndex(header, KCFG.COL_MONTH),
    region:  findColIndex(header, KCFG.COL_REGION),
    prov:    findColIndex(header, KCFG.COL_PROV),
    npp:     findColIndex(header, KCFG.COL_NPP),
  };
  if (col.name===-1 || col.price===-1){ ui.alert('Thiếu cột "Tên thiết bị" hoặc "Đơn giá trúng thầu".'); return; }
  if (col.ktype===-1){ ui.alert('Không tìm thấy cột "Knife Type". Hãy tạo cột này trước.'); return; }
  if (col.tier===-1){ ui.alert('Không tìm thấy cột "Price_Tier".'); return; }

  const dataFirst = headerRow0 + 2;
  const lastRow = sheet.getLastRow();

  // 9.1 REGISTRY từ mọi dòng CÓ Knife Type
  const refRows = [];
  for (let r=dataFirst; r<=lastRow; r++){
    const row = values[r-1];
    if (_trim(col.ktype!==-1 ? row[col.ktype] : '')!=='') refRows.push(row);
  }
  const reg = buildKnifeRegistry(refRows, col);

  // 9.1b BRAND REGISTRY (tái dùng logic bước ①) để CHUẨN HOÁ Manufacturer.
  //      Học hãng từ MỌI dòng đã có tên hãng phía trên (không chỉ dòng có Knife Type),
  //      cộng KNOWN_BRANDS seed. → "Kai Insdustries Co.,Ltd" → "KAI", v.v.
  const brandCol = { origin: findColIndex(header, CFG.COL_ORIGIN),
                     manuf: col.manuf, code: col.code };
  const brandRefRows = [];
  for (let r=dataFirst; r<=lastRow; r++){
    const row = values[r-1];
    if (brandCol.manuf!==-1 && _trim(row[brandCol.manuf])!=='') brandRefRows.push(row);
  }
  const brandReg = buildRegistry(brandRefRows, brandCol);

  // 9.2 dòng cần xử lý
  const targets = collectTargetRows(sheet, headerRow0, col.ktype);
  if (!targets.length){ ui.alert('Không có dòng nào để xử lý (đang chọn rỗng hoặc Knife Type đã đầy).'); return; }

  // 9.3 duyệt — quyết định keep / type / tier
  const rowsToDelete = [];   // 1-based
  const writes = [];         // {row, type, tier, typeSrc, tierSrc}
  let cntKeep=0, cntDelPrice=0, cntDelNewbrand=0, cntDelElectric=0, cntDelBladeHandle=0, cntTypeCode=0, cntTypeToken=0, cntTypeBP=0, cntTypeNone=0;

  for (const r of targets){
    const row = values[r-1];
    const name = col.name!==-1 ? row[col.name] : '';
    const price = toPrice(col.price!==-1 ? row[col.price] : null);
    const bRaw = (col.mannorm!==-1 && _trim(row[col.mannorm])) ? row[col.mannorm]
               : (col.manuf!==-1 ? row[col.manuf] : '');
    const bk = brandKey(bRaw);
    const codes = splitCodes(col.code!==-1 ? row[col.code] : '');

    // ── ⓪ RÁC: tên chứa từ loại bỏ → XOÁ NGAY, TRỪ KHI có dấu hiệu nhãn khoa ──
    //    Loại bỏ: điện / lưỡi / cán / giấy / siêu âm / laser / tiêu bản / vi thể
    //    NGOẠI LỆ: tên có phaco / 15 độ / 2.2… / MVR / slit / crescent → GIỮ
    //    (vd "Dao 15 độ có cán" là Stab knife, KHÔNG xoá dù có chữ "cán").
    if (nameIsJunk(name) && !nameLooksOphthalmic(name, col.code!==-1 ? row[col.code] : '')){
      if (_noAccent(name).indexOf('dien') !== -1){ rowsToDelete.push(r); cntDelElectric++; }
      else { rowsToDelete.push(r); cntDelBladeHandle++; }
      continue;
    }

    // ── ① GIÁ: ngoài [PRICE_MIN..PRICE_MAX] (40k–400k) → XOÁ NGAY (kể cả có Knife Type) ──
    if (price==null || price<KCFG.PRICE_MIN || price>KCFG.PRICE_MAX){
      rowsToDelete.push(r); cntDelPrice++; continue;
    }

    // ── CHUẨN HOÁ MANUFACTURER + XÁC ĐỊNH KNIFE TYPE ──
    const codeRaw = col.code!==-1 ? row[col.code] : '';
    let brandNorm = '';
    const manRaw = col.manuf!==-1 ? row[col.manuf] : '';
    const originRaw = brandCol.origin!==-1 ? row[brandCol.origin] : '';
    brandNorm = matchRegistryBrand(manRaw, brandReg)
             || matchRegistryBrand(originRaw, brandReg);
    if (!brandNorm && codes.length){
      for (const c of codes){
        const m = brandReg.codeToBrand[c];
        if (m){ brandNorm = Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0]; break; }
      }
    }
    if (!brandNorm){
      const cand = _trim(manRaw);
      if (cand){
        const disp = _trim(removeCountryWords(cand).replace(/[\/;,]\s*$/,'')) || cand;
        brandNorm = disp;
      }
    }
    const bkNorm = brandNorm ? brandKey(brandNorm) : bk;

    const kt = decideKnifeType(name, codeRaw, bkNorm, codes, price, reg);
    const isKnife = (kt.type !== '');   // ⭐ có Knife Type = dao nhãn khoa đã xác định

    // ── ② BRAND LẠ: CHỈ áp dụng khi CHƯA ra Knife Type (đã là dao thì KHÔNG xoá) ──
    if (!isKnife){
      const dec = decideKeep(name, bk, codes, reg);
      if (!dec.keep){ rowsToDelete.push(r); cntDelNewbrand++; continue; }
    }
    cntKeep++;

    // đếm nguồn Knife Type
    if (kt.src==='code'||kt.src==='master-exact'||kt.src==='master-prefix') cntTypeCode++;
    else if (kt.src==='token') cntTypeToken++;
    else if (kt.src==='brand+price') cntTypeBP++;
    else cntTypeNone++;

    // ④ tier (dùng bkNorm)
    const tr = decideTier(bkNorm, codes, kt.type, price, reg);

    const countryRaw = brandCol.origin!==-1 ? _trim(row[brandCol.origin]) : '';

    // W/X (Year/Month) từ Decision Issue Date (fallback Award Publication Date)
    let yv='', mv='';
    let dsrc = col.decdate!==-1 ? row[col.decdate] : null;
    if (dsrc==null || _trim(dsrc)==='') dsrc = col.date2!==-1 ? row[col.date2] : null;
    const dd = parseDate(dsrc);
    if (dd){ yv=dd.getFullYear(); mv=('0'+(dd.getMonth()+1)).slice(-2)+'/'+dd.getFullYear(); }
    // Region / Province / Region_by_Distributor từ Location (V)
    const addrV = col.addr!==-1 ? row[col.addr] : '';
    const provV = getProvinceNew(addrV);
    const regV  = getRegion(provV);
    const nppV  = getNppRegion(addrV);

    writes.push({row:r, type:kt.type, tier:tr.tier, typeSrc:kt.src, tierSrc:tr.src, brand:brandNorm,
                 codes:codes.slice(), country:countryRaw, bk:bkNorm,
                 year:yv, month:mv, region:regV||'', prov:provV||'', npp:nppV||''});
  }

  // 9.4 GHI type + tier (trước khi xoá, vì xoá làm dịch chỉ số dòng)
  for (const w of writes){
    if (col.ktype!==-1){
      const cell = sheet.getRange(w.row, col.ktype+1);
      cell.setValue(w.type);
      const reliable = (w.typeSrc==='token' || w.typeSrc==='code' ||
                        w.typeSrc==='master-exact' || w.typeSrc==='master-prefix') && w.type!=='';
      cell.setBackground(reliable ? KCFG.COLOR_FILLED : KCFG.COLOR_INFERRED);
    }
    if (col.tier!==-1){
      const cell = sheet.getRange(w.row, col.tier+1);
      cell.setValue(w.tier);
      cell.setBackground(KCFG.COLOR_FILLED);   // tier theo ngưỡng giá → tin cậy
    }
    // ghi Manufacturer chuẩn (nếu tìm được và khác giá trị hiện tại)
    if (col.manuf!==-1 && w.brand){
      const mCell = sheet.getRange(w.row, col.manuf+1);
      if (_trim(mCell.getValue()) !== _trim(w.brand)){
        mCell.setValue(w.brand).setBackground(KCFG.COLOR_FILLED);
      }
    }
    // fill W/X/Region/Province/Region_by_Distributor (nếu các cột này tồn tại)
    if (col.year!==-1  && w.year!=='')  sheet.getRange(w.row, col.year+1).setValue(w.year);
    if (col.month!==-1 && w.month!=='') sheet.getRange(w.row, col.month+1).setValue(w.month);
    if (col.region!==-1 && w.region!=='') sheet.getRange(w.row, col.region+1).setValue(w.region);
    if (col.prov!==-1  && w.prov!=='')  sheet.getRange(w.row, col.prov+1).setValue(w.prov);
    if (col.npp!==-1   && w.npp!=='')   sheet.getRange(w.row, col.npp+1).setValue(w.npp);
  }
  SpreadsheetApp.flush();

  // 9.4b TỰ CẬP NHẬT MASTER: hãng nhãn khoa MỚI (chưa có trong Master) → append
  //      (Hãng, Xuất xứ, Loại dao, Mã sp, Phân khúc giá) vào sheet Master_Dao.
  let masterAdded = 0;
  const M = _masterRuntime;
  if (M){
    let msh = ss.getSheetByName('Master_Dao');
    if (!msh){
      msh = ss.insertSheet('Master_Dao');
      msh.appendRow(['Hãng (Manufacturer)','Xuất xứ (Country)','Loại dao (Knife Type)',
                     'Mã sản phẩm (Product Code)','Phân khúc giá (Price Tier)']);
      msh.getRange(1,1,1,5).setBackground(CFG.COLOR_HEADER_NEW)
         .setFontColor(CFG.COLOR_HEADER_NEW_FG).setFontWeight('bold');
    }
    const newRows = [];
    const seenInBatch = {};   // tránh trùng trong cùng lần chạy
    for (const w of writes){
      if (!w.brand || !w.type) continue;
      const bkk = brandKey(w.brand);
      // chỉ bổ sung khi HÃNG chưa có trong master (hãng nhãn khoa mới)
      if (M.knownBrandKeys.has(bkk)) continue;
      for (const c of w.codes){
        const key = bkk+'|'+c;
        if (M.exact[key] || seenInBatch[key]) continue;
        seenInBatch[key]=true;
        newRows.push([w.brand, w.country||'', w.type, c, w.tier||'']);
        // cập nhật runtime để lần sau (và các dòng sau) tham chiếu được ngay
        M.exact[key]={t:w.type, tiers:new Set(w.tier?[w.tier]:[])};
      }
    }
    if (newRows.length){
      const start = msh.getLastRow()+1;
      msh.getRange(start,1,newRows.length,5).setValues(newRows)
         .setBackground(KCFG.COLOR_INFERRED);   // vàng: dòng mới bổ sung, nên soát
      masterAdded = newRows.length;
    }
  }

  // 9.5 XOÁ CẢ DÒNG ngoài khoảng giá / brand lạ không phải nhãn khoa.
  // Xoá từ dưới lên để không lệch chỉ số.
  rowsToDelete.sort((a,b)=>b-a);
  for (const r of rowsToDelete) sheet.deleteRow(r);
  SpreadsheetApp.flush();

  // 9.6 PHÁT HIỆN DÒNG TRÙNG (B→Q giống hệt) → BÔI MÀU, KHÔNG XOÁ.
  //     Người dùng tự soát các dòng đỏ nhạt và xoá tay nếu cần.
  const dupHighlighted = removeDuplicateRows(sheet, headerRow0);

  ui.alert(
    '✅ Đã lọc & phân loại dao PT nhãn khoa!\n\n' +
    '• Dòng tham chiếu (có Knife Type): ' + refRows.length + '\n' +
    '• Dòng xét: ' + targets.length + '\n' +
    '• Giữ & phân loại: ' + cntKeep + '\n' +
    '• Xoá (tên có chữ "điện"): ' + cntDelElectric + '\n' +
    '• Xoá (tên có "lưỡi"/"cán"/"tiêu bản"/"vi thể"/"giấy"): ' + cntDelBladeHandle + '\n' +
    '• Xoá (ngoài khoảng giá 40k–400k): ' + cntDelPrice + '\n' +
    '• Xoá (brand lạ, không có từ khóa nhãn khoa): ' + cntDelNewbrand + '\n\n' +
    'Nguồn Knife Type:\n' +
    '   – theo Token tên/code (SLIT/LANCE/CRESCENT/MVR/size): ' + cntTypeToken + '\n' +
    '   – theo Master/Code (exact + prefix hãng): ' + cntTypeCode + '\n' +
    '   – theo Brand+Giá: ' + cntTypeBP + '\n' +
    '   – chưa xác định (ô vàng, review tay): ' + cntTypeNone + '\n\n' +
    'Master_Dao: đã bổ sung ' + masterAdded + ' mã của hãng mới.\n' +
    'Đã BÔI MÀU ' + dupHighlighted + ' dòng TRÙNG (B→Q giống hệt) — KHÔNG xoá, để bạn tự soát.\n\n' +
    'Màu: 🟢 xanh = khớp chắc chắn (token / master / code)\n' +
    '     🟡 vàng = suy đoán (brand+giá) — nên soát lại\n' +
    '     🔴 đỏ nhạt = DÒNG TRÙNG (B→Q giống hệt) — kiểm tra & xoá tay nếu cần'
  );
}

// ============== 10. MENU ==============


// ============== MENU CHUNG (2 bước) ==============
function onOpen(){
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔪 Làm sạch (Dao)')
    .addItem('① ▶ Làm sạch vùng đang chọn', 'cleanSelectedRange')
    .addItem('① ▶▶ Làm sạch toàn bộ', 'cleanAllRows')
    .addSeparator()
    .addItem('② 👁️ Lọc giá + phân loại Knife Type + Price_Tier', 'classifyOphthalmicKnives')
    .addToUi();
}

/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  PHẦN 3 / 3 — UPLOAD ADD-ON (doPost GỘP · seed hãng đã biết · chẩn đoán)
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  MMH · Ophthalmic Knife Tender — UPLOAD & AUTO-CLEAN ADD-ON  (v1)
 *  ────────────────────────────────────────────────────────────────────────────────────────
 *  MỤC ĐÍCH
 *    Cho phép frontend (nút "Nhập file thầu") kéo-thả 1 file Excel, đọc data (A→V, từ dòng 3),
 *    POST lên đây. Add-on sẽ:
 *       1) APPEND các dòng A→V vào cuối sheet "Data xử lý".
 *       2) LÀM SẠCH chỉ các dòng vừa thêm (registry học từ toàn bộ dòng cũ phía trên):
 *            • chuẩn hoá Manufacturer / Country, điền W..AC (Year, Month, Manufacturer_Norm,
 *              Region, Price_Tier, Province_Clean, Region_by_Distributor).
 *       3) PHÂN LOẠI chỉ các dòng vừa thêm: dòng ĐÃ ra Knife Type = dao nhãn khoa → GIỮ TUYỆT ĐỐI;
 *          chỉ sản phẩm KHÁC (chưa ra Knife Type) mới lọc giá 40k–400k / rác / brand lạ,
 *            điền Knife Type + Price_Tier, tự bổ sung Master_Dao cho hãng mới.
 *       4) XOÁ dòng INPUT bị lặp (B→Q trùng data đang có) — sau làm sạch, trước khi ghi AG.
 *
 *  ⚠ QUAN TRỌNG — PHỤ THUỘC:
 *    Add-on này DÙNG LẠI toàn bộ hàm logic trong file "Làm sạch data thầu" (CFG, KCFG,
 *    COUNTRY_MAP, buildRegistry, parseOriginField, buildKnifeRegistry, decideKnifeType,
 *    decideTier, removeDuplicateRows, loadMasterRuntime, v.v.).
 *    => PHẢI dán CẢ file "Làm sạch data thầu" VÀO CÙNG dự án Apps Script (cùng backend).
 *       Thứ tự file không quan trọng (GAS gộp mọi .gs khi chạy).
 *
 *    Các hàm gốc cleanSelectedRange() / classifyOphthalmicKnives() gọi SpreadsheetApp.getUi()
 *    → KHÔNG chạy được trong web app (doPost không có UI). Vì vậy add-on này viết 2 phiên bản
 *    HEADLESS (cleanRangeHeadless_ / classifyRangeHeadless_) tái dùng cùng logic thuần, nhận
 *    phạm vi dòng trực tiếp, KHÔNG đụng UI / active selection.
 *
 *  CÀI ĐẶT
 *    1. Mở dự án Apps Script chứa backend (cùng Sheet).
 *    2. Đảm bảo đã có: file backend gốc (doGet/buildPayload_/doPost writeContract) +
 *       file "Làm sạch data thầu" đầy đủ.
 *    3. Dán TOÀN BỘ file này vào 1 file .gs mới trong dự án.
 *    4. GỘP doPost: xem mục "TÍCH HỢP doPost" bên dưới (chọn 1 trong 2 cách).
 *    5. Deploy → Manage deployments → Edit → Version: New version → Deploy (giữ nguyên URL).
 * ══════════════════════════════════════════════════════════════════════════════════════════ */


/* ──────────────────────────────────────────────────────────────────────────────────────────
 *  TÍCH HỢP doPost
 *  ─────────────────────────────────────────────────────────────────────────────────────────
 *  Backend hiện tại đã có 1 doPost xử lý action 'writeContract'. GAS chỉ cho phép MỘT doPost.
 *
 *  CÁCH A (khuyến nghị) — THAY hàm doPost cũ bằng bản gộp dưới đây, rồi XOÁ doPost cũ
 *  trong file backend gốc (để tránh khai báo trùng). Bản gộp này xử lý cả 'writeContract'
 *  lẫn 'uploadTender'.
 *
 *  CÁCH B — Nếu muốn giữ nguyên file gốc: đổi tên doPost cũ thành doPost_contract_(e) và
 *  bỏ khối writeContract trong bản dưới, chỉ để nó gọi doPost_contract_ khi action khác.
 * ────────────────────────────────────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || '';

    if (action === 'writeContract') {
      // hàm này nằm trong file backend gốc (phần bổ sung v2 ghi ngược hợp đồng)
      return jsonOut(writeContract_(body.edits || []));
    }
    if (action === 'uploadTender') {
      return jsonOut(uploadTender_(body));
    }
    if (action === 'ping') {
      return jsonOut({ ok: true, ts: new Date().toISOString() });
    }
    return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.stack || err) });
  }
}


/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  1) ENTRY: uploadTender_(body)
 *  body = {
 *    action : 'uploadTender',
 *    rows   : [ [A,B,...,V], ... ]   // mỗi dòng đúng 22 phần tử (A→V). Frontend đã cắt từ dòng 3.
 *    fileName (optional)
 *  }
 *  return {
 *    ok, appended, cleaned, classified, kept, deleted:{price,rac,newbrand}, dupDeleted, meta
 *  }
 * ══════════════════════════════════════════════════════════════════════════════════════════ */
function uploadTender_(body) {
  var SHEET = (typeof SHEET_NAME !== 'undefined' && SHEET_NAME) ? SHEET_NAME : 'Data xử lý';
  var HDR   = (typeof HEADER_ROW !== 'undefined' && HEADER_ROW) ? HEADER_ROW : 2;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) throw new Error('Sheet "' + SHEET + '" không tồn tại.');

  var incoming = sanitizeIncomingRows_(body.rows || []);
  if (!incoming.length) return { ok: true, appended: 0, note: 'Không có dòng dữ liệu hợp lệ để thêm.' };

  // ⭐ XÁC ĐỊNH HEADER GIỐNG HỆT MENU CLEAN GỐC: tự DÒ hàng tiêu đề bằng findHeaderRow
  //    (tìm ô 'STT'/'No.'), KHÔNG hardcode. Đây là mấu chốt để dedup/clean đọc ĐÚNG dòng —
  //    nếu hardcode sai vị trí header, dataFirst lệch → dedup gom nhầm → xoá sạch.
  //    Fallback về HDR-1 nếu không dò được (sheet chưa có data/tiêu đề).
  var _allVals0 = sh.getDataRange().getValues();
  var headerRow0 = findHeaderRow(_allVals0, KCFG.COL_STT);   // 0-based
  if (headerRow0 === -1) headerRow0 = HDR - 1;               // fallback
  var dataFirst  = headerRow0 + 2;          // dòng data đầu tiên (1-based)
  var lastRowBefore = sh.getLastRow();
  var appendStart = Math.max(lastRowBefore + 1, dataFirst);   // dòng bắt đầu ghi (1-based)

  // ── 0. Vị trí cột GIÁ (N) + cột NGÀY ĐĂNG TẢI KQLCNT trong dữ liệu A→V ──
  var _hdr0     = _allVals0[headerRow0] || [];
  var priceCol0 = findColIndex(_hdr0, KCFG.COL_PRICE);   // 0-based (thường N = 13)
  var dateCol0  = findColIndex(_hdr0, KCFG.COL_DATE2);   // "Ngày đăng tải" (KQLCNT)

  // ── 1. APPEND A→V (22 cột) ──
  //    ⭐ FIX GIÁ: chuỗi "49.500" (text, dấu . = phân cách nghìn) nếu ghi thẳng sẽ bị
  //       Google Sheet hiểu nhầm thành 49.5 (mất số 0). parsePrice → 49500 rồi ghi SỐ.
  var W = 22; // A..V
  var matrix = incoming.map(function (r) {
    var out = new Array(W);
    for (var c = 0; c < W; c++) {
      var val = (r[c] == null ? '' : r[c]);
      if (c === priceCol0 && val !== '') {
        var pn = parsePrice(val);
        if (pn != null) val = pn;   // ghi SỐ nguyên, không phải chuỗi
      }
      out[c] = val;
    }
    return out;
  });
  sh.getRange(appendStart, 1, matrix.length, W).setValues(matrix);
  SpreadsheetApp.flush();

  var appendEnd = appendStart + matrix.length - 1;   // dòng cuối vừa thêm (1-based)

  // ── 1b. KỲ DỮ LIỆU: min→max "Ngày đăng tải KQLCNT" của lô vừa thêm (để ghi cột AG) ──
  var _tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var _minD = null, _maxD = null;
  if (dateCol0 !== -1 && dateCol0 < W) {
    for (var _i = 0; _i < incoming.length; _i++) {
      var _dd = parseDate(incoming[_i][dateCol0]);
      if (_dd) { if (!_minD || _dd < _minD) _minD = _dd; if (!_maxD || _dd > _maxD) _maxD = _dd; }
    }
  }
  var _today = Utilities.formatDate(new Date(), _tz, 'dd/MM/yy');
  var _batchInfo = (_minD && _maxD)
    ? ('Thêm dữ liệu từ Tender data từ ' + Utilities.formatDate(_minD, _tz, 'dd/MM/yy') +
       ' đến ' + Utilities.formatDate(_maxD, _tz, 'dd/MM/yy') + ' (gộp ' + _today + ')')
    : ('Thêm dữ liệu từ Tender data (gộp ' + _today + ')');

  // ── 2. LÀM SẠCH CỘT (headless) chỉ vùng [appendStart..appendEnd] ──
  //    registry học từ TẤT CẢ dòng cũ phía trên (dataFirst..appendStart-1).
  var cleanRes = cleanRangeHeadless_(sh, headerRow0, appendStart, appendEnd);

  // ── 3. PHÂN LOẠI (headless) chỉ vùng vừa thêm ──
  //    Lưu ý: bước này có thể XOÁ vài dòng (ngoài giá / rác / brand lạ) → appendEnd co lại.
  var classRes = classifyRangeHeadless_(sh, headerRow0, appendStart, appendEnd);

  // ── 3c. ĐỐI CHIẾU & XOÁ DÒNG INPUT BỊ LẶP (B→Q trùng data đang có) ──
  //     SAU làm sạch, TRƯỚC khi ghi AG. Chỉ xoá dòng MỚI đã tồn tại; giữ nguyên data cũ.
  var dupDeleted = deleteInputDuplicates_(sh, headerRow0, appendStart);
  SpreadsheetApp.flush();

  // ── 3d. GHI CỘT AG (nguồn & kỳ dữ liệu) cho các dòng của LÔ NÀY còn lại ──
  //     Sau classify + xoá trùng, dòng sống sót của lô nằm liền mạch [appendStart .. getLastRow()].
  var AG_COL   = 33;                 // cột AG (1-based)
  var _lastAft = sh.getLastRow();
  if (_lastAft >= appendStart) {
    var _nSurv = _lastAft - appendStart + 1;
    var _agVals = [];
    for (var _q = 0; _q < _nSurv; _q++) _agVals.push([_batchInfo]);
    sh.getRange(appendStart, AG_COL, _nSurv, 1).setValues(_agVals);
    var _agHead = sh.getRange(headerRow0 + 1, AG_COL);
    if (_trim(_agHead.getValue()) === '') _agHead.setValue('Nguồn & kỳ dữ liệu (gộp)');
  }
  SpreadsheetApp.flush();

  // ── 5. QUÉT RÁC TOÀN SHEET: dọn dòng CŨ còn sót (cán/lưỡi/điện/giấy/…) — chạy CUỐI ──
  var junkSwept = sweepJunkRows_(sh, headerRow0);
  SpreadsheetApp.flush();

  return {
    ok: true,
    appended: matrix.length,
    cleaned: cleanRes.processed,
    classified: classRes.kept,
    kept: classRes.kept,
    deleted: {
      price:    classRes.delPrice,
      rac:      classRes.delRac,
      newbrand: classRes.delNewbrand
    },
    typeSrc: classRes.typeSrc,
    masterAdded: classRes.masterAdded,
    sampleDeleted: classRes.sampleDeleted || [],
    dupDeleted: dupDeleted,
    dupHighlighted: 0,
    junkSwept: junkSwept,
    batchInfo: _batchInfo,
    meta: {
      source: SHEET,
      exported: Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')
    }
  };
}

/* Chuẩn hoá rows từ frontend: bỏ dòng rỗng hoàn toàn, ép mỗi dòng về đúng 22 phần tử A→V. */
function sanitizeIncomingRows_(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || [];
    // bỏ dòng rỗng (không có ô nào có nội dung)
    var hasData = false;
    for (var c = 0; c < r.length && c < 22; c++) {
      if (r[c] != null && String(r[c]).trim() !== '') { hasData = true; break; }
    }
    if (!hasData) continue;
    var row = new Array(22);
    for (var k = 0; k < 22; k++) row[k] = (r[k] == null ? '' : r[k]);
    out.push(row);
  }
  return out;
}


/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  2) cleanRangeHeadless_(sheet, headerRow0, startRow, endRow)
 *  Phiên bản KHÔNG UI của cleanSelectedRange() — chuẩn hoá Manufacturer/Country + điền W..AC
 *  cho vùng [startRow..endRow] (1-based). Registry học từ các dòng TRÊN startRow.
 *  Tái dùng: CFG, findColIndex, buildRegistry, matchRegistryBrand, resolveCountry,
 *            parseOriginField, brandCore, isMeaningfulCore, removeCountryWords,
 *            parseDate, parsePrice, priceTier, getProvinceNew, getRegion, getNppRegion.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */
function cleanRangeHeadless_(sheet, headerRow0, startRow, endRow) {
  var allValues = sheet.getDataRange().getValues();
  var header = allValues[headerRow0];

  var col = {
    origin: findColIndex(header, CFG.COL_ORIGIN),
    manuf:  findColIndex(header, CFG.COL_MANUF),
    code:   findColIndex(header, CFG.COL_CODE),
    model:  findColIndex(header, CFG.COL_MODEL),
    price:  findColIndex(header, CFG.COL_PRICE),
    date:   findColIndex(header, CFG.COL_DATE),
    decdate:findColIndex(header, CFG.COL_DECDATE),
    addr:   findColIndex(header, CFG.COL_ADDRESS),
  };
  if (col.origin === -1 || col.manuf === -1) {
    throw new Error('cleanRangeHeadless_: thiếu cột "Xuất xứ" và/hoặc "Hãng sản xuất".');
  }

  var dataFirst = headerRow0 + 2; // 1-based
  startRow = Math.max(startRow, dataFirst);
  if (startRow > endRow) return { processed: 0 };

  // registry từ các dòng TRÊN startRow
  var refRows = [];
  for (var r = dataFirst; r < startRow; r++) refRows.push(allValues[r - 1]);
  var registry = buildRegistry(refRows, col);

  // đảm bảo đủ cột output tới AC + ghi header (idempotent)
  var needCols = CFG.OUT_START_COL + CFG.OUT_HEADERS.length - 1; // 23..29
  if (sheet.getMaxColumns() < needCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), needCols - sheet.getMaxColumns());
  }
  sheet.getRange(headerRow0 + 1, CFG.OUT_START_COL, 1, CFG.OUT_HEADERS.length)
       .setValues([CFG.OUT_HEADERS])
       .setBackground(CFG.COLOR_HEADER_NEW)
       .setFontColor(CFG.COLOR_HEADER_FG)
       .setFontWeight('bold');

  var nRows = endRow - startRow + 1;
  var outMatrix = [];

  for (var i = 0; i < nRows; i++) {
    var rowIdx0 = startRow - 1 + i;
    var row = allValues[rowIdx0];

    var originRaw = col.origin !== -1 ? row[col.origin] : '';
    var manRaw    = col.manuf  !== -1 ? row[col.manuf]  : '';
    var codeRaw   = col.code   !== -1 ? row[col.code]   : '';
    var addr      = col.addr   !== -1 ? row[col.addr]   : '';

    // --- HÃNG ---
    var brand = null, bSrc = '';
    brand = matchRegistryBrand(manRaw, registry);
    if (brand) bSrc = 'reg';
    if (!brand) { var b2 = matchRegistryBrand(originRaw, registry); if (b2) { brand = b2; bSrc = 'reg'; } }
    if (!brand && codeRaw) {
      var cs1 = String(codeRaw).split(/[,;\/\s]+/).map(_trim);
      for (var a = 0; a < cs1.length; a++) {
        var c1 = cs1[a]; if (c1.length < 3) continue;
        var m1 = registry.codeToBrand[c1];
        if (m1) { brand = Object.entries(m1).sort(function (x, y) { return y[1] - x[1]; })[0][0]; bSrc = 'reg'; break; }
      }
    }
    if (!brand) {
      var p = parseOriginField(originRaw);
      var cand = _trim(manRaw) || p.manufacturer;
      if (cand) {
        var again = matchRegistryBrand(cand, registry);
        if (again) { brand = again; bSrc = 'reg'; }
        else {
          var core = brandCore(cand);
          var disp = _trim(removeCountryWords(cand).replace(/[\/;,]\s*$/, '')) || _trim(cand);
          brand = disp; bSrc = 'parse';
          if (isMeaningfulCore(core) && !registry.brandMatchers.some(function (m) { return m.core === core; })) {
            registry.brandMatchers.push({ core: core, canon: brand });
            registry.brandMatchers.sort(function (x, y) { return y.core.length - x.core.length; });
          }
        }
      }
    }

    // --- QUỐC GIA ---
    var country = null, cSrc = '';
    country = resolveCountry(originRaw, registry);
    if (country) { cSrc = registry.countrySet.has(country) ? 'reg' : 'parse'; }
    if (!country && codeRaw) {
      var cs2 = String(codeRaw).split(/[,;\/\s]+/).map(_trim);
      for (var b = 0; b < cs2.length; b++) {
        var c2 = cs2[b]; if (c2.length < 3) continue;
        var m2 = registry.codeToCountry[c2];
        if (m2) { country = Object.entries(m2).sort(function (x, y) { return y[1] - x[1]; })[0][0]; cSrc = 'reg'; break; }
      }
    }
    if (!country) { var p2 = parseOriginField(originRaw); if (p2.country) { country = p2.country; cSrc = 'parse'; } }
    if (country) registry.countrySet.add(country);

    // --- suy diễn W..AC ---
    var year = '', month = '';
    var dSrc = col.decdate !== -1 ? row[col.decdate] : null;
    if (dSrc == null || _trim(dSrc) === '') dSrc = col.date !== -1 ? row[col.date] : null;
    var d = parseDate(dSrc);
    if (d) { year = d.getFullYear(); month = ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }

    var price = parsePrice(col.price !== -1 ? row[col.price] : null);
    var tier  = priceTier(price);
    var provNew = getProvinceNew(addr);
    var region  = getRegion(provNew);
    var npp     = getNppRegion(addr);

    outMatrix.push([year, month, brand || '', region || '', tier, provNew || '', npp || '']);

    // ghi country vào cột Xuất xứ (E) + brand vào Hãng (I), có tô màu như bản gốc
    if (country && col.origin !== -1) {
      sheet.getRange(startRow + i, col.origin + 1).setValue(country)
           .setBackground(cSrc === 'reg' ? CFG.COLOR_REGISTRY : CFG.COLOR_EDITED);
    }
    if (brand && col.manuf !== -1) {
      sheet.getRange(startRow + i, col.manuf + 1).setValue(brand)
           .setBackground(bSrc === 'reg' ? CFG.COLOR_REGISTRY : CFG.COLOR_EDITED);
    }
  }

  // ghi 7 cột W..AC
  sheet.getRange(startRow, CFG.OUT_START_COL, nRows, CFG.OUT_HEADERS.length).setValues(outMatrix);
  SpreadsheetApp.flush();

  return { processed: nRows };
}


/* ══════════════════════════════════════════════════════════════════════════════════════════
 *  3) classifyRangeHeadless_(sheet, headerRow0, startRow, endRow)
 *  Phiên bản KHÔNG UI của classifyOphthalmicKnives() — CHỈ xử lý vùng [startRow..endRow].
 *  Registry Knife (type/tier) + Brand registry học từ TOÀN BỘ sheet (mọi dòng có Knife Type
 *  / có tên hãng) — y như bản gốc, không phụ thuộc vùng chọn.
 *  Tái dùng: KCFG, CFG, findColIndex, findHeaderRow(không cần), buildKnifeRegistry,
 *            buildRegistry, loadMasterRuntime, decideKeep, decideKnifeType, decideTier,
 *            brandKey, splitCodes, toPrice, matchRegistryBrand, brandCore, removeCountryWords,
 *            parseDate, getProvinceNew/getRegion/getNppRegion.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */
function classifyRangeHeadless_(sheet, headerRow0, startRow, endRow) {
  var ss = sheet.getParent();
  _masterRuntime = null;               // reset cache
  loadMasterRuntime(ss);

  var values = sheet.getDataRange().getValues();
  var header = values[headerRow0];

  var col = {
    name:    findColIndex(header, KCFG.COL_NAME),
    code:    findColIndex(header, KCFG.COL_CODE),
    manuf:   findColIndex(header, KCFG.COL_MANUF),
    mannorm: findColIndex(header, KCFG.COL_MANNORM),
    price:   findColIndex(header, KCFG.COL_PRICE),
    tier:    findColIndex(header, KCFG.COL_TIER),
    ktype:   findColIndex(header, KCFG.COL_KTYPE),
    decdate: findColIndex(header, KCFG.COL_DECDATE),
    date2:   findColIndex(header, KCFG.COL_DATE2),
    addr:    findColIndex(header, KCFG.COL_ADDR),
    year:    findColIndex(header, KCFG.COL_YEAR),
    month:   findColIndex(header, KCFG.COL_MONTH),
    region:  findColIndex(header, KCFG.COL_REGION),
    prov:    findColIndex(header, KCFG.COL_PROV),
    npp:     findColIndex(header, KCFG.COL_NPP),
  };
  if (col.name === -1 || col.price === -1) throw new Error('classifyRangeHeadless_: thiếu "Tên thiết bị"/"Đơn giá trúng thầu".');
  if (col.ktype === -1) throw new Error('classifyRangeHeadless_: thiếu cột "Knife Type".');
  if (col.tier === -1)  throw new Error('classifyRangeHeadless_: thiếu cột "Price_Tier".');

  var dataFirst = headerRow0 + 2;
  var lastRow = sheet.getLastRow();
  startRow = Math.max(startRow, dataFirst);
  if (startRow > endRow) return { kept: 0, delPrice: 0, delRac: 0, delNewbrand: 0, typeSrc: {}, masterAdded: 0 };

  // 9.1 KNIFE REGISTRY từ mọi dòng CÓ Knife Type (toàn sheet)
  var refRows = [];
  for (var r = dataFirst; r <= lastRow; r++) {
    var rowk = values[r - 1];
    if (_trim(col.ktype !== -1 ? rowk[col.ktype] : '') !== '') refRows.push(rowk);
  }
  var reg = buildKnifeRegistry(refRows, col);

  // 9.1a ⭐ SEED "hãng đã biết" vào reg.brandSet để decideKeep KHÔNG xoá oan.
  //      Nguồn: KNOWN_BRANDS (danh sách hãng dao đã biết) + Master (MASTER_SEED /
  //      CODE_PREFIX_LIB / sheet Master_Dao). Nếu không seed, sheet mà data cũ chưa có
  //      đúng hãng đó sẽ coi mọi hãng là "lạ" → xoá sạch dòng không có keyword tên.
  try {
    if (typeof KNOWN_BRANDS !== 'undefined' && KNOWN_BRANDS && KNOWN_BRANDS.length) {
      for (var kb = 0; kb < KNOWN_BRANDS.length; kb++) {
        var kbk = brandKey(KNOWN_BRANDS[kb]);
        if (kbk) reg.brandSet.add(kbk);
      }
    }
    if (_masterRuntime && _masterRuntime.knownBrandKeys) {
      _masterRuntime.knownBrandKeys.forEach(function (k) { if (k) reg.brandSet.add(k); });
    }
  } catch (eSeed) { /* seed lỗi thì bỏ qua, không chặn pipeline */ }

  // 9.1b BRAND REGISTRY (chuẩn hoá hãng) từ mọi dòng có tên hãng
  var brandCol = { origin: findColIndex(header, CFG.COL_ORIGIN), manuf: col.manuf, code: col.code };
  var brandRefRows = [];
  for (var r2 = dataFirst; r2 <= lastRow; r2++) {
    var rowb = values[r2 - 1];
    if (brandCol.manuf !== -1 && _trim(rowb[brandCol.manuf]) !== '') brandRefRows.push(rowb);
  }
  var brandReg = buildRegistry(brandRefRows, brandCol);

  // 9.2 targets = CHỈ vùng [startRow..endRow]
  var targets = [];
  for (var t = startRow; t <= endRow && t <= lastRow; t++) targets.push(t);

  // 9.3 duyệt
  var rowsToDelete = [];
  var writes = [];
  var cntKeep = 0, cntDelPrice = 0, cntDelRac = 0, cntDelNewbrand = 0;
  var cntTypeToken = 0, cntTypeCode = 0, cntTypeBP = 0, cntTypeNone = 0;
  var sampleDeleted = [];   // ⭐ vài dòng mẫu bị xoá (để chẩn đoán trên frontend)
  function _sample(reason, name, brand, priceTxt) {
    if (sampleDeleted.length < 8) {
      sampleDeleted.push({ reason: reason, name: String(name || '').slice(0, 60),
                           brand: String(brand || ''), price: String(priceTxt == null ? '' : priceTxt) });
    }
  }

  for (var ti = 0; ti < targets.length; ti++) {
    var rr = targets[ti];
    var row = values[rr - 1];
    var name = col.name !== -1 ? row[col.name] : '';
    var price = toPrice(col.price !== -1 ? row[col.price] : null);
    var bRaw0 = (col.mannorm !== -1 && _trim(row[col.mannorm])) ? row[col.mannorm]
              : (col.manuf !== -1 ? row[col.manuf] : '');
    var bk = brandKey(bRaw0);
    var codes = splitCodes(col.code !== -1 ? row[col.code] : '');

    // ── ⓪ RÁC: tên chứa từ loại bỏ → XOÁ NGAY, TRỪ KHI có dấu hiệu nhãn khoa ──
    //    NGOẠI LỆ: tên có phaco/15 độ/2.2…/MVR/slit/crescent → GIỮ (vd "Dao 15 độ có cán").
    if (nameIsJunk(name) && !nameLooksOphthalmic(name, col.code !== -1 ? row[col.code] : '')) { rowsToDelete.push(rr); cntDelRac++; _sample('rác:từ khoá loại bỏ', name, bRaw0, price); continue; }

    // ── ① GIÁ: ngoài [PRICE_MIN..PRICE_MAX] (40k–400k) → XOÁ NGAY (kể cả có Knife Type) ──
    if (price == null || price < KCFG.PRICE_MIN || price > KCFG.PRICE_MAX) {
      rowsToDelete.push(rr); cntDelPrice++;
      _sample(price == null ? 'giá:trống/không đọc được' : ('giá:' + price + ' ngoài [' + KCFG.PRICE_MIN + ';' + KCFG.PRICE_MAX + ']'),
              name, bRaw0, (col.price !== -1 ? row[col.price] : ''));
      continue;
    }

    // ── CHUẨN HOÁ MANUFACTURER + XÁC ĐỊNH KNIFE TYPE ──
    var codeRaw = col.code !== -1 ? row[col.code] : '';
    var brandNorm = '';
    var manRaw = col.manuf !== -1 ? row[col.manuf] : '';
    var originRaw = brandCol.origin !== -1 ? row[brandCol.origin] : '';
    brandNorm = matchRegistryBrand(manRaw, brandReg) || matchRegistryBrand(originRaw, brandReg);
    if (!brandNorm && codes.length) {
      for (var ci = 0; ci < codes.length; ci++) {
        var mm = brandReg.codeToBrand[codes[ci]];
        if (mm) { brandNorm = Object.entries(mm).sort(function (x, y) { return y[1] - x[1]; })[0][0]; break; }
      }
    }
    if (!brandNorm) {
      var cand = _trim(manRaw);
      if (cand) brandNorm = _trim(removeCountryWords(cand).replace(/[\/;,]\s*$/, '')) || cand;
    }
    var bkNorm = brandNorm ? brandKey(brandNorm) : bk;

    var kt = decideKnifeType(name, codeRaw, bkNorm, codes, price, reg);
    var isKnife = (kt.type !== '');   // ⭐ có Knife Type = dao nhãn khoa đã xác định

    // ── ② BRAND LẠ: CHỈ áp dụng khi CHƯA ra Knife Type (đã là dao thì KHÔNG xoá) ──
    if (!isKnife) {
      var dec = decideKeep(name, bk, codes, reg);
      if (!dec.keep) { rowsToDelete.push(rr); cntDelNewbrand++; _sample('brand lạ + tên không có từ khoá nhãn khoa', name, bRaw0, price); continue; }
    }
    cntKeep++;

    // đếm nguồn Knife Type
    if (kt.src === 'code' || kt.src === 'master-exact' || kt.src === 'master-prefix') cntTypeCode++;
    else if (kt.src === 'token') cntTypeToken++;
    else if (kt.src === 'brand+price') cntTypeBP++;
    else cntTypeNone++;

    // ④ tier
    var tr = decideTier(bkNorm, codes, kt.type, price, reg);

    var countryRaw = brandCol.origin !== -1 ? _trim(row[brandCol.origin]) : '';

    // W/X từ Decision Issue Date (fallback Award Publication Date)
    var yv = '', mv = '';
    var dsrc = col.decdate !== -1 ? row[col.decdate] : null;
    if (dsrc == null || _trim(dsrc) === '') dsrc = col.date2 !== -1 ? row[col.date2] : null;
    var dd = parseDate(dsrc);
    if (dd) { yv = dd.getFullYear(); mv = ('0' + (dd.getMonth() + 1)).slice(-2) + '/' + dd.getFullYear(); }

    var addrV = col.addr !== -1 ? row[col.addr] : '';
    var provV = getProvinceNew(addrV);
    var regV  = getRegion(provV);
    var nppV  = getNppRegion(addrV);

    writes.push({ row: rr, type: kt.type, tier: tr.tier, typeSrc: kt.src, tierSrc: tr.src,
                  brand: brandNorm, codes: codes.slice(), country: countryRaw, bk: bkNorm,
                  year: yv, month: mv, region: regV || '', prov: provV || '', npp: nppV || '' });
  }

  // 9.4 GHI type + tier + brand + W..AC (trước khi xoá)
  for (var wi = 0; wi < writes.length; wi++) {
    var w = writes[wi];
    if (col.ktype !== -1) {
      var cellT = sheet.getRange(w.row, col.ktype + 1);
      cellT.setValue(w.type);
      var reliable = (w.typeSrc === 'token' || w.typeSrc === 'code' ||
                      w.typeSrc === 'master-exact' || w.typeSrc === 'master-prefix') && w.type !== '';
      cellT.setBackground(reliable ? KCFG.COLOR_FILLED : KCFG.COLOR_INFERRED);
    }
    if (col.tier !== -1) {
      sheet.getRange(w.row, col.tier + 1).setValue(w.tier).setBackground(KCFG.COLOR_FILLED);
    }
    if (col.manuf !== -1 && w.brand) {
      var mCell = sheet.getRange(w.row, col.manuf + 1);
      if (_trim(mCell.getValue()) !== _trim(w.brand)) mCell.setValue(w.brand).setBackground(KCFG.COLOR_FILLED);
    }
    if (col.year   !== -1 && w.year   !== '') sheet.getRange(w.row, col.year + 1).setValue(w.year);
    if (col.month  !== -1 && w.month  !== '') sheet.getRange(w.row, col.month + 1).setValue(w.month);
    if (col.region !== -1 && w.region !== '') sheet.getRange(w.row, col.region + 1).setValue(w.region);
    if (col.prov   !== -1 && w.prov   !== '') sheet.getRange(w.row, col.prov + 1).setValue(w.prov);
    if (col.npp    !== -1 && w.npp    !== '') sheet.getRange(w.row, col.npp + 1).setValue(w.npp);
  }
  SpreadsheetApp.flush();

  // 9.4b tự cập nhật Master_Dao cho hãng mới (giống bản gốc)
  var masterAdded = 0;
  var M = _masterRuntime;
  if (M) {
    var msh = ss.getSheetByName('Master_Dao');
    if (!msh) {
      msh = ss.insertSheet('Master_Dao');
      msh.appendRow(['Hãng (Manufacturer)', 'Xuất xứ (Country)', 'Loại dao (Knife Type)',
                     'Mã sản phẩm (Product Code)', 'Phân khúc giá (Price Tier)']);
      msh.getRange(1, 1, 1, 5).setBackground(CFG.COLOR_HEADER_NEW)
         .setFontColor(CFG.COLOR_HEADER_NEW_FG || CFG.COLOR_HEADER_FG).setFontWeight('bold');
    }
    var newRows = [];
    var seenInBatch = {};
    for (var wj = 0; wj < writes.length; wj++) {
      var ww = writes[wj];
      if (!ww.brand || !ww.type) continue;
      var bkk = brandKey(ww.brand);
      if (M.knownBrandKeys.has(bkk)) continue;
      for (var cj = 0; cj < ww.codes.length; cj++) {
        var cc = ww.codes[cj];
        var key = bkk + '|' + cc;
        if (M.exact[key] || seenInBatch[key]) continue;
        seenInBatch[key] = true;
        newRows.push([ww.brand, ww.country || '', ww.type, cc, ww.tier || '']);
        M.exact[key] = { t: ww.type, tiers: new Set(ww.tier ? [ww.tier] : []) };
      }
    }
    if (newRows.length) {
      var start = msh.getLastRow() + 1;
      msh.getRange(start, 1, newRows.length, 5).setValues(newRows).setBackground(KCFG.COLOR_INFERRED);
      masterAdded = newRows.length;
    }
  }

  // 9.5 XOÁ dòng ngoài giá / rác / brand lạ (từ dưới lên)
  rowsToDelete.sort(function (a, b) { return b - a; });
  for (var di = 0; di < rowsToDelete.length; di++) sheet.deleteRow(rowsToDelete[di]);
  SpreadsheetApp.flush();

  return {
    kept: cntKeep,
    delPrice: cntDelPrice,
    delRac: cntDelRac,
    delNewbrand: cntDelNewbrand,
    typeSrc: { token: cntTypeToken, code: cntTypeCode, brandPrice: cntTypeBP, none: cntTypeNone },
    masterAdded: masterAdded,
    sampleDeleted: sampleDeleted
  };
}


/* ── Test nhanh trong editor (KHÔNG ghi gì): kiểm tra dependency đã nạp đủ chưa ── */
function _selfCheckUploadDeps() {
  var need = ['CFG','KCFG','buildRegistry','buildKnifeRegistry','decideKnifeType','decideTier',
              'removeDuplicateRows','loadMasterRuntime','parseOriginField','findColIndex',
              'getProvinceNew','getRegion','getNppRegion','parseDate','parsePrice','priceTier',
              'brandKey','splitCodes','toPrice','matchRegistryBrand','resolveCountry',
              'brandCore','isMeaningfulCore','removeCountryWords','decideKeep','_trim','_lc','_noAccent'];
  var miss = [];
  need.forEach(function (n) { try { if (typeof eval(n) === 'undefined') miss.push(n); } catch (e) { miss.push(n); } });
  Logger.log(miss.length ? ('THIẾU: ' + miss.join(', ') + '  → dán thiếu file "Làm sạch data thầu".')
                         : 'OK — đủ toàn bộ dependency.');
}