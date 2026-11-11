/**************************************************************************************************
 * MMH · KQTT MAP — kết quả trúng thầu DAO nhãn khoa TOÀN QUỐC cho web "Tender Map" (Tender-Result ▸ map/)
 * Chỉ ĐỌC file tender tổng (SYNC.DEST_SS_ID ▸ sheet "Data xử lý", gid 1603394577, tiêu đề dòng 2) — file này
 * script Hùng Vĩ vốn đã mở được (syncTender) ⇒ KHÔNG cần cấp quyền mới. Backend gốc của file: tender-kqtt.
 *
 *   GET ?action=kqttMap[&from=202209][&callback=fn]
 *     → { ok, v, sheet, exported, from, cols:[…], rows:[[…]], n }
 *
 * Mỗi dòng = 1 sản phẩm trúng (mọi hãng: MANI và đối thủ). Cột dò theo TÊN tiêu đề (bỏ dấu, không phân biệt hoa thường)
 * ⇒ người cập nhật file chèn / đổi vị trí cột vẫn chạy. Kỳ của dòng = cột Month (mm/yyyy), trống ⇒ ngày quyết định.
 * Ngày quyết định đôi khi bị đảo ngày ↔ tháng (dữ liệu dán từ nguồn khác) ⇒ chọn cách đọc khớp cột Month.
 **************************************************************************************************/
var KQ_VER = '1.1';   // ★ 11/11/2026 — đệm 10 phút theo số dòng × cột (wmCached_ ở MMH_WinMap.gs), fresh=1 bỏ đệm
var KQ_COLS = ['tbmt', 'buyer', 'pname', 'pcode', 'brand', 'mfr', 'country', 'unit', 'qty', 'price', 'method', 'pub', 'decNo', 'dec',
               'bidders', 'loc', 'month', 'region', 'tier', 'prov', 'ktype', 'dur', 'exp', 'row'];

function kqttPayload_(p) {
  p = p || {};
  var from = +(p.from || 202209) || 202209;
  var ss = SpreadsheetApp.openById(SYNC.DEST_SS_ID);
  var sh = resolveSheetByGid_(ss, SYNC.DEST_GID) || ss.getSheetByName(SYNC.DEST_SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet "' + SYNC.DEST_SHEET_NAME + '" trong file tender tổng');
  var lastRow0 = sh.getLastRow(), lastCol0 = sh.getLastColumn();
  return wmCached_('kq', p, sh.getSheetId() + '|' + from + '|' + lastRow0 + 'x' + lastCol0, function () { return kqBuild_(ss, sh, from); });
}

function kqBuild_(ss, sh, from) {
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var out = { ok: true, v: KQ_VER, sheet: sh.getName(), from: from, cols: KQ_COLS, rows: [], n: 0,
              exported: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') };
  var HR = SYNC.DEST_HEADER_ROW, lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow <= HR) return out;
  var head = sh.getRange(HR, 1, 1, lastCol).getValues()[0];
  var C = kqCols_(head);
  if (C.tbmt < 0 || C.buyer < 0) throw new Error('File tender tổng thiếu cột "KQTT Code" hoặc "Buyer" ở dòng ' + HR);
  var V = sh.getRange(HR + 1, 1, lastRow - HR, lastCol).getValues();
  for (var i = 0; i < V.length; i++) {
    var r = V[i], g = function (k) { var c = C[k]; return (c == null || c < 0) ? '' : r[c]; };
    var tb = wmStr_(g('tbmt')).replace(/\s+/g, ''), buyer = wmStr_(g('buyer'));
    if (!tb && !buyer) continue;
    var month = kqMonth_(g('month'));
    var dec = kqDate_(g('dec'), month, tz), pub = kqDate_(g('pub'), month, tz);
    if (!month) month = dec ? +dec.slice(0, 7).replace('-', '') : (pub ? +pub.slice(0, 7).replace('-', '') : 0);
    if (!month || month < from) continue;
    var durRaw = wmStr_(g('dur')), dur = durRaw ? wmDur_(durRaw) : 0;
    var expD = kqDate_(g('exp'), 0, tz);
    out.rows.push([tb, buyer, wmStr_(g('pname')).slice(0, 160), wmStr_(g('pcode')).slice(0, 80), wmStr_(g('brand')).slice(0, 80),
      wmStr_(g('mfrNorm')) || wmStr_(g('mfr')), wmStr_(g('country')), wmStr_(g('unit')), wmNum_(g('qty')), wmNum_(g('price')),
      wmStr_(g('method')), pub, wmStr_(g('decNo')), dec, Math.round(wmNum_(g('bidders')) * 100) / 100, wmStr_(g('loc')), month,
      wmStr_(g('region')), wmStr_(g('tier')), wmStr_(g('prov')), wmStr_(g('ktype')), dur, expD, HR + 1 + i]);
  }
  out.n = out.rows.length;
  return out;
}

function kqCols_(head) {
  var norm = function (h) {
    return String(h == null ? '' : h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
      .replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  };
  var H = head.map(norm);
  var find = function (names, exact) {
    for (var j = 0; j < names.length; j++) for (var c = 0; c < H.length; c++) {
      if (!H[c]) continue;
      if (exact ? H[c] === names[j] : H[c].indexOf(names[j]) === 0) return c;
    }
    return -1;
  };
  return {
    tbmt: find(['kqtt code', 'ma kqtt', 'so tbmt', 'tbmt']),
    buyer: find(['buyer', 'chu dau tu', 'hospital name']),
    pname: find(['product name', 'ten san pham', 'ten hang hoa']),
    pcode: find(['product code', 'ma san pham', 'ky ma hieu']),
    brand: find(['brand label', 'nhan hieu']),
    mfr: find(['manufacturer', 'hang san xuat'], true),
    mfrNorm: find(['manufacturer_norm']),
    country: find(['country of origin', 'xuat xu']),
    unit: find(['unit', 'don vi'], true),
    qty: find(['quantity', 'so luong']),
    price: find(['awarded unit price', 'don gia trung', 'unit price']),
    method: find(['procurement method', 'hinh thuc']),
    pub: find(['award publication date', 'ngay dang tai']),
    decNo: find(['decision number', 'so quyet dinh']),
    dec: find(['decision issue date', 'ngay quyet dinh', 'ngay ra quyet dinh']),
    bidders: find(['number of bidders', 'so nha thau']),
    loc: find(['location', 'dia chi', 'dia diem']),
    month: find(['month', 'thang'], true),
    region: find(['region'], true),
    tier: find(['price_tier', 'price tier']),
    prov: find(['province_clean', 'tinh']),
    ktype: find(['knife type', 'product type', 'loai san pham']),
    dur: find(['contract duration', 'thoi han hop dong', 'thoi gian thuc hien']),
    exp: find(['expiration date', 'ngay het han'])
  };
}

/* "05/2026" · "5/2026" · 202605 · Date ⇒ 202605 */
function kqMonth_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return v.getFullYear() * 100 + v.getMonth() + 1;
  var s = String(v == null ? '' : v).replace(/\.0+$/, '').trim(), m;
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/)) && +m[1] >= 1 && +m[1] <= 12) return +m[2] * 100 + +m[1];
  if ((m = s.match(/^(\d{4})[\/\-.]?(\d{2})$/)) && +m[2] >= 1 && +m[2] <= 12) return +m[1] * 100 + +m[2];
  return 0;
}

/* Ngày ⇒ 'yyyy-MM-dd'. Có tháng tham chiếu (yyyymm) mà cách đọc thường lệch tháng, đảo ngày ↔ tháng lại khớp ⇒ dùng cách đảo. */
function kqDate_(v, refMonth, tz) {
  if (v == null || v === '') return '';
  var y, mo, d, s;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v)) return '';
    s = Utilities.formatDate(v, tz || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); y = +s.slice(0, 4); mo = +s.slice(5, 7); d = +s.slice(8, 10);
  } else {
    s = String(v).trim(); var m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) { y = +m[3]; mo = +m[2]; d = +m[1]; }
    else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else return '';
  }
  if (refMonth && y * 100 + mo !== refMonth && d <= 12 && y * 100 + d === refMonth) { var t = mo; mo = d; d = t; }
  if (!(y > 2000 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return '';
  return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
}

function kqOut_(e, payload) {
  var s = JSON.stringify(payload), cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    if (!/^[A-Za-z_$][\w$.]*$/.test(cb)) cb = 'callback';
    return ContentService.createTextOutput(cb + '(' + s + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}
