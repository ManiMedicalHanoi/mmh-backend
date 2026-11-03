/**************************************************************************************************
 * MMH · NPP TENDER FEED  —  Google Apps Script Web App backend
 * --------------------------------------------------------------------------------------------
 * Dùng CHUNG cho 2 nhà phân phối của MANI Medical Hanoi:
 *
 *   • I CARE  (NPP miền Nam) — sheet "Tender FY65-67", header ở dòng 9, data từ dòng 10.
 *   • HÙNG VĨ (NPP miền Bắc) — sheet "Tender FY66",    header ở dòng 7, data từ dòng 8.
 *
 * Mỗi NPP là 1 Spreadsheet riêng → deploy file .gs này thành 2 Web App riêng.
 * Chỉ cần chỉnh khối CONFIG bên dưới cho đúng từng NPP rồi Deploy → Web app
 * (Execute as: Me · Who has access: Anyone).
 *
 * Trả JSON:
 *   {
 *     ok: true,
 *     meta: { npp, region, sheet, startRow, exported, rows, knifeRows },
 *     rows: [ { ...1 dòng dao đã chuẩn hoá... } ]
 *   }
 *
 * QUY TẮC XỬ LÝ (khớp yêu cầu):
 *   • Chỉ lấy dòng có "Product code" bắt đầu bằng "M" (MST/MSL/MCU…) = DAO.
 *     Các code bắt đầu bằng SỐ (1406, 2090…) là CHỈ KHÂU → bỏ.
 *   • 1 dòng có thể chứa nhiều code ("MSL22SK, MSL28SK") → gộp thành 1 nhóm dao (Slit/Stab/MCU)
 *     theo prefix; Quantity của dòng đó coi là tổng cho cả nhóm.
 *   • Số thông báo mời thầu (TBMT): trim, bỏ xuống dòng, bỏ hậu tố "-01"/"-00" → cùng 1 gói.
 *   • Ngày phê duyệt gói thầu: dạng "YYYYMMDD" (số hoặc chuỗi) hoặc Date → chuẩn hoá "YYYY-MM-DD".
 *   • Thời gian thực hiện gói thầu (tháng): "12 tháng" / "12" / 24 / trống → số (trống = 12).
 *   • Expiration = (Ngày phê duyệt + duration tháng). Nếu thiếu ngày phê duyệt → dùng "Ngày hiệu lực".
 *   • Result of Tender: Win / Fail / Cancel / Pending (giữ nguyên, chuẩn hoá hoa/thường).
 *
 * © MANI Medical Hanoi — internal tool.
 **************************************************************************************************/

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 *  CONFIG — CHỈNH CHO TỪNG NPP
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
var CONFIG = {
  // ---- I CARE (miền Nam) ----  (để mặc định như dưới)
  NPP:        'ICARE',            // 'ICARE'  hoặc  'HUNGVI'
  REGION:     'South',            // 'South' cho Icare · 'North' cho Hùng Vĩ
  SHEET_NAME: 'Tender FY65-67',   // Icare: 'Tender FY65-67'  ·  Hùng Vĩ: 'Tender FY66'
  START_ROW:  10,                 // Icare: 10  ·  Hùng Vĩ: 8
  HEADER_ROW: 9                   // Icare: 9   ·  Hùng Vĩ: 7   (dùng để tự dò cột theo tên header)

  /* ---- HÙNG VĨ (miền Bắc): copy file này sang project của Hùng Vĩ rồi đổi thành ----
  NPP:        'HUNGVI',
  REGION:     'North',
  SHEET_NAME: 'Tender FY66',
  START_ROW:  8,
  HEADER_ROW: 7
  */
};

/* Tên cột kỳ vọng ở HEADER_ROW (dò không phân biệt hoa thường / khoảng trắng thừa).
 * Nếu tên header ở file khác đôi chút, chỉ cần thêm biến thể vào mảng aliases. */
var COL_ALIASES = {
  tbmt:      ['Số thông báo mời thầu', 'So thong bao moi thau', 'TBMT'],
  hospital:  ['Hospital name', 'Tên bệnh viện', 'Chủ đầu tư', 'Hospital'],
  city:      ['City', 'Tỉnh', 'Tỉnh/Thành', 'Province'],
  effDate:   ['Ngày hiệu lực', 'Ngay hieu luc'],
  expDate:   ['Ngày hết hạn', 'Ngay het han'],
  fy:        ['FY'],
  month:     ['Month', 'Tháng'],
  pcode:     ['Product code', 'Ma san pham', 'Mã sản phẩm'],
  qty:       ['Quantity', 'Số lượng', 'So luong'],            // lấy cột Quantity ĐẦU tiên (bên "Document from MMH")
  price:     ['Price (VND)', 'Giá (VND)', 'Gia (VND)'],       // lấy cột Price ĐẦU tiên
  result:    ['Result of Tender', 'Ket qua', 'Kết quả', 'Result'],
  wonProduct:['Product'],                                      // cột "Product" thứ 2 (khi Win có thể ghi riêng)
  wonQty:    ['Quantity'],                                     // cột Quantity thứ 2
  wonPrice:  ['Price (VND)'],                                  // cột Price thứ 2
  approve:   ['Ngày phê duyệt gói thầu', 'Ngay phe duyet goi thau', 'Ngày phê duyệt'],
  duration:  ['Thời gian thực hiện gói thầu ( Tháng)', 'Thời gian thực hiện gói thầu (Tháng)',
              'Thoi gian thuc hien goi thau', 'Thời gian thực hiện']
};

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 *  ENTRY POINTS
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
var LOG_SHEET = 'FC_LOG';   // sheet ẩn lưu chỉnh sửa của user (theo NPP)

function doGet(e) {
  var payload;
  try {
    if (e && e.parameter && e.parameter.action === 'winMap') return jsonOut_(e, wmPayload_(e.parameter));   // MMH_WinMap.gs — Bản đồ trúng thầu
    payload = buildPayload();
    payload.log = readLog_();          // kèm luôn LOG để FE khôi phục chỉnh sửa
  } catch (err) {
    payload = { ok: false, error: String(err && err.message || err), npp: CONFIG.NPP };
  }
  return jsonOut_(e, payload);
}

/* Ghi LOG: FE gửi POST { action:'saveLog', rows:[ {rowKey, group, account, tbmt, region,
 *   potential, dur, expMonth, mst, msl, mcu, note, ts} ] }.
 * Mỗi rowKey là 1 dòng (upsert theo rowKey). */
function doPost(e) {
  var res;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || 'saveLog';
    if (action === 'saveLog') {
      var n = writeLog_(body.rows || []);
      res = { ok: true, saved: n, npp: CONFIG.NPP };
    } else if (action === 'clearLog') {
      clearLog_();
      res = { ok: true, cleared: true, npp: CONFIG.NPP };
    } else {
      res = { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    res = { ok: false, error: String(err && err.message || err) };
  }
  return jsonOut_(e, res);
}

function jsonOut_(e, payload) {
  var s = JSON.stringify(payload);
  if (e && e.parameter && e.parameter.callback) {
    return ContentService.createTextOutput(e.parameter.callback + '(' + s + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

/* ── LOG sheet (ẩn) ── */
var LOG_HEADERS = ['rowKey','group','account','tbmt','region','potential','dur','expMonth','mst','msl','mcu','note','updatedBy','ts'];
function getLogSheet_(create) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh && create) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
    sh.setFrozenRows(1);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}
function readLog_() {
  var sh = getLogSheet_(false);
  if (!sh) return {};
  var lr = sh.getLastRow();
  if (lr < 2) return {};
  var vals = sh.getRange(2, 1, lr - 1, LOG_HEADERS.length).getValues();
  var map = {};
  vals.forEach(function (r) {
    var key = r[0]; if (!key) return;
    map[key] = {
      group: r[1], account: r[2], tbmt: r[3], region: r[4],
      potential: r[5] || '', dur: numOrNull_(r[6]), expMonth: r[7] || '',
      mst: numOrNull_(r[8]), msl: numOrNull_(r[9]), mcu: numOrNull_(r[10]),
      note: r[11] || '', updatedBy: r[12] || '', ts: r[13] || ''
    };
  });
  return map;
}
function writeLog_(rows) {
  if (!rows.length) return 0;
  var sh = getLogSheet_(true);
  var lr = sh.getLastRow();
  var existing = {};
  if (lr >= 2) {
    var keys = sh.getRange(2, 1, lr - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0]) existing[keys[i][0]] = i + 2;
  }
  var who = '';
  try { who = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  var appended = 0;
  rows.forEach(function (r) {
    var row = [ r.rowKey||'', r.group||'', r.account||'', r.tbmt||'', r.region||'',
      r.potential||'', r.dur==null?'':r.dur, r.expMonth||'',
      r.mst==null?'':r.mst, r.msl==null?'':r.msl, r.mcu==null?'':r.mcu,
      r.note||'', who, now ];
    if (existing[r.rowKey]) {
      sh.getRange(existing[r.rowKey], 1, 1, LOG_HEADERS.length).setValues([row]);
    } else {
      sh.appendRow(row); appended++;
    }
  });
  return rows.length;
}
function clearLog_() {
  var sh = getLogSheet_(false);
  if (!sh) return;
  var lr = sh.getLastRow();
  if (lr >= 2) sh.getRange(2, 1, lr - 1, LOG_HEADERS.length).clearContent();
}
function numOrNull_(v) { if (v === '' || v == null) return null; var n = +v; return isFinite(n) ? n : null; }

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 *  CORE
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
function buildPayload() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_NAME + '"');

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < CONFIG.START_ROW) {
    return { ok: true, meta: metaObj(0, 0), rows: [] };
  }

  // Đọc header để map cột theo tên (bền vững hơn cứng index)
  var headerVals = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var colIdx = resolveColumns_(headerVals);   // {key: 0-based col index}

  // Đọc toàn bộ vùng data 1 lần (nhanh)
  var nRows = lastRow - CONFIG.START_ROW + 1;
  var data  = sh.getRange(CONFIG.START_ROW, 1, nRows, lastCol).getValues();
  var tz    = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';

  var out = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    var pcodeRaw  = getCell_(row, colIdx.pcode);
    var resultRaw = getCell_(row, colIdx.result);
    var tbmtRaw   = getCell_(row, colIdx.tbmt);
    // dòng trống hoàn toàn → bỏ
    if (isBlank_(pcodeRaw) && isBlank_(resultRaw) && isBlank_(tbmtRaw)) continue;

    // CHỈ lấy dao (code bắt đầu M). Xác định nhóm dao từ (có thể nhiều) code.
    var knife = classifyKnife_(pcodeRaw);
    if (!knife.isKnife) continue;

    // Số lượng: cột Quantity chính (P) — đây là SL của DÒNG đó.
    var qty = toNum_(getCell_(row, colIdx.qty));
    if (!qty) qty = toNum_(getCell_(row, colIdx.wonQty));
    if (!qty) qty = knife.qtyHint || 0;

    // ── PHÂN BỔ SL THEO LOẠI DAO (đúng quy tắc) ──
    // Nguyên tắc: 1 dòng = xác định LOẠI từ product code → gán TOÀN BỘ Quantity vào loại đó.
    //   • Dòng có nhiều mã CÙNG loại (vd "MSL22, MSL28, MSL30" = 250) → tất cả là Slit → 250 vào Slit.
    //   • Dòng chỉ có 1 loại (đại đa số) → toàn bộ qty vào loại đó.
    //   • Trường hợp HIẾM: 1 dòng có nhiều loại KHÁC nhau + 1 quantity → không xác định được tách
    //     bao nhiêu cho mỗi loại → chia đều (ghi cờ để rà soát). Thực tế data NPP không gặp.
    var grp = knifeGroups_(knife.codes);   // {MST:bool,MSL:bool,MCU:bool}
    var nGrp = (grp.MST?1:0) + (grp.MSL?1:0) + (grp.MCU?1:0);
    var qMST = 0, qMSL = 0, qMCU = 0, mixedFlag = false;
    if (nGrp === 1) {
      // 1 loại duy nhất → toàn bộ quantity vào loại đó (KHÔNG chia)
      if (grp.MST) qMST = qty; else if (grp.MSL) qMSL = qty; else if (grp.MCU) qMCU = qty;
    } else if (nGrp > 1) {
      // nhiều loại khác nhau, 1 quantity → chia đều + đánh cờ
      mixedFlag = true;
      var per = qty / nGrp;
      if (grp.MST) qMST = per;
      if (grp.MSL) qMSL = per;
      if (grp.MCU) qMCU = per;
    }

    // Giá trúng (VND/chiếc): ưu tiên Price chính; fallback wonPrice.
    var price = toNum_(getCell_(row, colIdx.price));
    if (!price) price = toNum_(getCell_(row, colIdx.wonPrice));

    // Ngày phê duyệt → "YYYY-MM-DD" + serial ngày.
    var approve = parseDate_(getCell_(row, colIdx.approve), tz);
    // Ngày hiệu lực (fallback khi thiếu ngày phê duyệt).
    var effDate = parseDate_(getCell_(row, colIdx.effDate), tz);
    // Ngày hết hạn có sẵn (nếu có).
    var expDateSheet = parseDate_(getCell_(row, colIdx.expDate), tz);

    // Thời gian thực hiện (tháng) — trống = 12.
    var duration = parseDuration_(getCell_(row, colIdx.duration));
    if (duration < 1 || duration > 36) duration = 12;   // chặn bất thường

    // ⚠ QUAN TRỌNG (cấu trúc file NPP):
    //   • Ngày hiệu lực (G) / Ngày hết hạn (H) = hạn NỘP/MỞ thầu (vài tuần) — KHÔNG phải hợp đồng.
    //   • Ngày phê duyệt (Y) = ngày TRÚNG thầu thật; Thời gian thực hiện (Z) = số tháng hợp đồng.
    //   ⇒ HỢP ĐỒNG THẬT = (Ngày phê duyệt) → (Ngày phê duyệt + Z tháng).
    // Mốc bắt đầu hợp đồng: ưu tiên Ngày phê duyệt (Y); nếu trống → Ngày hiệu lực (G) làm xấp xỉ.
    var startDate = approve.iso ? approve : (effDate.iso ? effDate : null);

    // Expiration = start + duration (KHÔNG dùng cột H).
    var expiration = startDate ? addMonths_(startDate.dateObj, duration, tz) : null;

    out.push({
      npp:        CONFIG.NPP,
      region:     CONFIG.REGION,               // Icare=South, Hùng Vĩ=North (fix theo NPP)
      tbmt:       normTBMT_(tbmtRaw),          // đã bỏ hậu tố -01/-00
      tbmtRaw:    String(tbmtRaw == null ? '' : tbmtRaw).trim(),
      hospital:   String(getCell_(row, colIdx.hospital) || '').trim(),
      city:       String(getCell_(row, colIdx.city) || '').trim(),
      fy:         normFY_(getCell_(row, colIdx.fy)),
      month:      normMonth_(getCell_(row, colIdx.month), startDate),
      pcodeRaw:   String(pcodeRaw || '').trim(),
      knifeType:  knife.type,                  // 'Slit' | 'Stab' | 'MCU' | 'Other'
      knifeCodes: knife.codes,                 // mảng code sạch, ví dụ ['MSL22SK','MSL28SK']
      qty:        qty,
      qtyMST:     qMST,                        // SL phân bổ theo nhóm (Stab)
      qtyMSL:     qMSL,                        // (Slit)
      qtyMCU:     qMCU,                        // (Crescent/MCU)
      mixedType:  mixedFlag,                   // true nếu 1 dòng gộp nhiều loại khác nhau (cần rà)
      price:      price,                       // VND/chiếc (giá TRÚNG, nếu có)
      value:      qty * price,
      result:     normResult_(resultRaw),      // 'Win'|'Fail'|'Cancel'|'Pending'|''
      approveISO: approve.iso,                 // 'YYYY-MM-DD' hoặc ''
      approveSerial: approve.serial,           // ms epoch hoặc null
      effISO:     effDate.iso,                 // Ngày hiệu lực (G) — luôn có ở Hùng Vĩ
      effSerial:  effDate.serial,
      durationMonths: duration,                // số tháng (đã suy ra 12 nếu trống)
      expirationISO:  expiration ? expiration.iso : '',
      expirationSerial: expiration ? expiration.serial : null,
      row:        CONFIG.START_ROW + i         // truy vết dòng gốc
    });
  }

  return {
    ok: true,
    meta: metaObj(out.length, nRows),
    rows: out
  };
}

function metaObj(knifeRows, scannedRows) {
  return {
    npp:      CONFIG.NPP,
    region:   CONFIG.REGION,
    sheet:    CONFIG.SHEET_NAME,
    startRow: CONFIG.START_ROW,
    exported: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'),
    rows:     scannedRows,
    knifeRows: knifeRows
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 *  COLUMN RESOLUTION (dò cột theo tên header — bền vững)
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
function resolveColumns_(headerVals) {
  // chuẩn hoá header để so khớp
  var norm = headerVals.map(function (h) { return normHeader_(h); });

  function findAll(aliases) {
    var hits = [];
    aliases.forEach(function (a) {
      var an = normHeader_(a);
      for (var i = 0; i < norm.length; i++) {
        if (norm[i] === an && hits.indexOf(i) < 0) hits.push(i);
      }
    });
    return hits; // theo thứ tự alias, nhưng cần theo thứ tự cột → sort
  }
  function first(aliases) { var h = findAll(aliases).sort(function(a,b){return a-b;}); return h.length ? h[0] : -1; }

  // Với các cột bị TRÙNG tên (Quantity, Price, Product xuất hiện 2 lần):
  //   cột thứ nhất = phía "Document from MMH" (dự trù) → qty/price
  //   cột thứ hai  = phía "Result of Tender" (kết quả) → wonQty/wonPrice/wonProduct
  var qtyHits   = findAll(COL_ALIASES.qty).sort(function(a,b){return a-b;});
  var priceHits = findAll(COL_ALIASES.price).sort(function(a,b){return a-b;});
  var prodHits  = findAll(COL_ALIASES.wonProduct).sort(function(a,b){return a-b;});

  var map = {
    tbmt:     first(COL_ALIASES.tbmt),
    hospital: first(COL_ALIASES.hospital),
    city:     first(COL_ALIASES.city),
    effDate:  first(COL_ALIASES.effDate),
    expDate:  first(COL_ALIASES.expDate),
    fy:       first(COL_ALIASES.fy),
    month:    first(COL_ALIASES.month),
    pcode:    first(COL_ALIASES.pcode),
    qty:      qtyHits.length   ? qtyHits[0]   : -1,
    price:    priceHits.length ? priceHits[0] : -1,
    wonProduct: prodHits.length ? prodHits[0] : -1,
    wonQty:   qtyHits.length   > 1 ? qtyHits[1]   : -1,
    wonPrice: priceHits.length > 1 ? priceHits[1] : -1,
    result:   first(COL_ALIASES.result),
    approve:  first(COL_ALIASES.approve),
    duration: first(COL_ALIASES.duration)
  };

  // Fallback cứng theo layout Icare/Hùng Vĩ nếu header dò không ra (đề phòng đổi tên)
  //  (0-based): B=1 TBMT? Không — theo file: C=2 TBMT, D=3 hosp, E=4 city, G=6 eff, H=7 exp,
  //   M=12 FY, N=13 month, O=14 pcode, P=15 qty, Q=16 price, S=18 result, T=19 prod,
  //   U=20 wonQty, V=21 wonPrice, Y=24 approve, Z=25 duration.
  var HARD = { tbmt:2, hospital:3, city:4, effDate:6, expDate:7, fy:12, month:13, pcode:14,
               qty:15, price:16, result:18, wonProduct:19, wonQty:20, wonPrice:21,
               approve:24, duration:25 };
  Object.keys(HARD).forEach(function (k) { if (map[k] < 0) map[k] = HARD[k]; });

  return map;
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 *  HELPERS
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
function getCell_(row, idx) { return (idx == null || idx < 0 || idx >= row.length) ? '' : row[idx]; }
function isBlank_(v) { return v === null || v === undefined || String(v).trim() === ''; }

function normHeader_(h) {
  return String(h == null ? '' : h)
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
}

/* Chuẩn hoá số TBMT: bỏ khoảng trắng/xuống dòng + hậu tố -01/-00 để coi cùng 1 gói */
function normTBMT_(t) {
  if (t == null) return '';
  var s = String(t).replace(/[\s\r\n]+/g, '');
  s = s.replace(/-\d+$/, '');       // IB2400456868-01 → IB2400456868
  return s;
}

function normResult_(r) {
  var s = String(r || '').trim().toLowerCase();
  if (!s) return '';
  if (s.indexOf('win') >= 0)     return 'Win';
  if (s.indexOf('pend') >= 0)    return 'Pending';
  if (s.indexOf('cancel') >= 0)  return 'Cancel';
  if (s.indexOf('fail') >= 0 || s.indexOf('lose') >= 0 || s.indexOf('lost') >= 0) return 'Fail';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normFY_(v) {
  if (isBlank_(v)) return '';
  var s = String(v).replace(/[^\d]/g, '');
  return s ? ('FY' + s) : '';
}

/* Month → "MM/YYYY". Chấp nhận 202601 (int), "202601", Date, hoặc suy từ startDate. */
function normMonth_(v, startDate) {
  if (!isBlank_(v)) {
    var s = String(v).trim();
    // 202601 → 01/2026
    var m6 = s.match(/^(\d{4})(\d{2})$/);
    if (m6) return m6[2] + '/' + m6[1];
    // 2026-01 hoặc 01/2026 sẵn
    var m1 = s.match(/^(\d{4})[-\/](\d{1,2})$/);
    if (m1) return pad2_(m1[2]) + '/' + m1[1];
    var m2 = s.match(/^(\d{1,2})[\/-](\d{4})$/);
    if (m2) return pad2_(m2[1]) + '/' + m2[2];
    if (v instanceof Date) return pad2_(v.getMonth() + 1) + '/' + v.getFullYear();
  }
  if (startDate && startDate.dateObj) {
    var d = startDate.dateObj;
    return pad2_(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  return '';
}

/* Duration → số tháng; "12 tháng"/"18  tháng"/24/"" → 12 nếu trống */
function parseDuration_(v) {
  if (isBlank_(v)) return 12;
  var s = String(v).replace(/[^\d]/g, '');
  var n = parseInt(s, 10);
  return (isFinite(n) && n > 0) ? n : 12;
}

/* Parse ngày phê duyệt: hỗ trợ Date, serial number của Sheets, "YYYYMMDD", "dd/MM/yyyy" */
function parseDate_(v, tz) {
  var empty = { iso: '', serial: null, dateObj: null };
  if (isBlank_(v)) return empty;

  // Đã là Date
  if (v instanceof Date && !isNaN(v.getTime())) {
    return dateOut_(v, tz);
  }
  // Số: có thể là "20241217" (YYYYMMDD) hoặc serial ngày Sheets (~40000-50000)
  if (typeof v === 'number') {
    if (v > 19000000 && v < 30000000) {           // YYYYMMDD
      return fromYYYYMMDD_(String(Math.round(v)), tz);
    }
    if (v > 20000 && v < 80000) {                 // Sheets serial (days since 1899-12-30)
      var ms = Math.round((v - 25569) * 86400 * 1000); // → epoch
      var d = new Date(ms);
      if (!isNaN(d.getTime())) return dateOut_(d, tz);
    }
  }
  var s = String(v).trim();
  // "YYYYMMDD"
  if (/^\d{8}$/.test(s)) return fromYYYYMMDD_(s, tz);
  // "dd/MM/yyyy" hoặc "d/M/yyyy"
  var dm = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dm) {
    var d2 = new Date(+dm[3], (+dm[2]) - 1, +dm[1]);
    if (!isNaN(d2.getTime())) return dateOut_(d2, tz);
  }
  // "yyyy-MM-dd"
  var ymd = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymd) {
    var d3 = new Date(+ymd[1], (+ymd[2]) - 1, +ymd[3]);
    if (!isNaN(d3.getTime())) return dateOut_(d3, tz);
  }
  return empty;
}

function fromYYYYMMDD_(s, tz) {
  var y = +s.substr(0, 4), m = +s.substr(4, 2), d = +s.substr(6, 2);
  var dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return { iso: '', serial: null, dateObj: null };
  return dateOut_(dt, tz);
}

function dateOut_(d, tz) {
  return {
    iso:    Utilities.formatDate(d, tz || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'),
    serial: d.getTime(),
    dateObj: d
  };
}

function addMonths_(dateObj, months, tz) {
  var d = new Date(dateObj.getFullYear(), dateObj.getMonth() + months, dateObj.getDate());
  return dateOut_(d, tz);
}

function toNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  var s = String(v).replace(/[^\d.\-]/g, '');
  var n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function pad2_(x) { x = String(x); return x.length < 2 ? '0' + x : x; }

/**
 * classifyKnife_ — nhận chuỗi product code (có thể nhiều code, có rác số lượng),
 * quyết định đây có phải DAO không và thuộc nhóm nào.
 *   MST… → Stab   |   MSL…/MSK… → Slit   |   MCU… → MCU (Crescent)
 * Trả: { isKnife, type, codes:[sạch], qtyHint }
 */
/* Từ mảng code sạch → nhóm dao nào xuất hiện (MST/MSL/MCU). */
function knifeGroups_(codes) {
  var g = { MST:false, MSL:false, MCU:false };
  (codes || []).forEach(function (c) {
    var s = String(c).toUpperCase();
    if (/^MST/.test(s))            g.MST = true;   // Stab
    else if (/^MSL|^MSK/.test(s))  g.MSL = true;   // Slit
    else if (/^MCU/.test(s))       g.MCU = true;   // Crescent
  });
  return g;
}

function classifyKnife_(raw) {
  var res = { isKnife: false, type: 'Other', codes: [], qtyHint: 0 };
  if (isBlank_(raw)) return res;

  var parts = String(raw).split(/[,;\/]+/);
  var hasStab = false, hasSlit = false, hasMCU = false;

  parts.forEach(function (p) {
    var s = String(p).trim();
    if (!s) return;

    // tách "qty hint" nếu code kèm số lượng: "MSL28SK 300 cái", "MST15(200)", "MSL28-32 (2700 CÁI)"
    var qh = s.match(/\(?\s*(\d{2,6})\s*(?:c[áa]i|chi[eế]c|cái|tép)?\s*\)?\s*$/i);
    if (qh && qh[1]) {
      var qn = parseInt(qh[1], 10);
      if (isFinite(qn) && qn > res.qtyHint) res.qtyHint = qn;
    }

    // code sạch: bỏ mọi thứ trong ngoặc + số lượng + chữ "cái"
    var clean = s.replace(/\(.*?\)/g, '')
                 .replace(/\d{2,6}\s*(?:c[áa]i|chi[eế]c|cái|tép)/gi, '')
                 .replace(/\s+/g, '')
                 .toUpperCase();
    if (!clean) return;

    var head = clean.charAt(0);
    // Chỉ nhận code bắt đầu bằng "M" và KHÔNG phải số → là dao Mani
    if (head !== 'M') return;

    res.codes.push(clean);
    if (/^MST/.test(clean))            hasStab = true;   // MST15, MST15SK, MST15MK
    else if (/^MSL|^MSK/.test(clean))  hasSlit = true;   // MSL22SK, MSL28SH, MSK15SK
    else if (/^MCU/.test(clean))       hasMCU  = true;   // MCU26
    else                                res.codes = res.codes; // M-khác vẫn coi là dao "Other"
  });

  if (!res.codes.length) return res;
  res.isKnife = true;
  // Nếu 1 dòng gộp nhiều nhóm → ưu tiên nhãn "Mixed" nhưng vẫn tính; chọn nhóm áp đảo.
  if (hasMCU && !hasStab && !hasSlit)      res.type = 'MCU';
  else if (hasSlit && !hasStab && !hasMCU) res.type = 'Slit';
  else if (hasStab && !hasSlit && !hasMCU) res.type = 'Stab';
  else if (hasSlit && hasStab)             res.type = 'Mixed';   // MST…, MSL… cùng dòng
  else if (hasSlit)                        res.type = 'Slit';
  else if (hasStab)                        res.type = 'Stab';
  else if (hasMCU)                         res.type = 'MCU';
  else                                     res.type = 'Other';
  return res;
}

/* ── Tiện ích test nhanh trong editor (Run → xem Logs) ── */
function _test() {
  var p = buildPayload();
  Logger.log('meta: ' + JSON.stringify(p.meta));
  Logger.log('rows: ' + p.rows.length);
  for (var i = 0; i < Math.min(5, p.rows.length); i++) {
    Logger.log(JSON.stringify(p.rows[i]));
  }
}