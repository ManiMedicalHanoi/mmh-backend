/**
 * MMH — Giá bán lẻ ➜ "Competitor Benchmark" (file Price calculation MMG)
 * ----------------------------------------------------------------------------
 * Web app (chỉ gọi khi có key = 8 ký tự cuối ID file Data composite):
 *   ?action=cbDiag&key=…            đọc sheet "Giá bán lẻ" (chỉ đọc) + bảng B của Competitor Benchmark
 * Không có doGet nào khác trong dự án — file này chỉ thêm lối vào, không đổi menu / trigger cũ.
 */
var CB = {
  SRC_SHEET: 'Giá bán lẻ',
  DST_ID: '1xYjl3OV8Bm6IBX4290pJ_9K93eJcRL9cpwfb32jenqU',
  DST_SHEET: 'Competitor Benchmark'
};

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!p.key || p.key !== ss.getId().slice(-8)) out = { ok: false, code: 'KEY' };
    else if (p.action === 'cbDiag') out = cbDiag_(ss, p);
    else if (p.action === 'cbDump') out = cbZip_(cbDump_(ss), p);
    else out = { ok: false, code: 'ACTION' };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function cbDiag_(ss, p) {
  var res = { ok: true };
  if (p.part !== 'dst') {
    var sh = ss.getSheetByName(CB.SRC_SHEET);
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    var off = Number(p.off || 0), n = Number(p.n || 400);
    var v = sh.getRange(1, 1, lr, lc).getDisplayValues();
    res.src = { lastRow: lr, lastCol: lc, rows: v.slice(off, off + n).map(function (r) {
      while (r.length && r[r.length - 1] === '') r.pop();
      return r.join(' ¦ ');
    }) };
  }
  if (p.part !== 'src') {
    try {
      var d = SpreadsheetApp.openById(CB.DST_ID).getSheetByName(CB.DST_SHEET);
      res.dst = { lastRow: d.getLastRow(), mani: d.getRange('B7:G17').getDisplayValues(),
                  b: d.getRange('A20:R' + Math.min(d.getLastRow(), 40)).getDisplayValues().map(function (r) { return r.join(' ¦ '); }) };
    } catch (err) { res.dstErr = String(err.message || err); }
  }
  return res;
}

/* Dữ liệu gọn cho việc ghép (chỉ đọc): sheet Giá bán lẻ + số lượng nhập khẩu / quy cách theo hãng · nhãn hiệu · phân loại
 * (Total data). z=1 ⇒ gzip + base64, cắt theo off / n ký tự. */
function cbZip_(obj, p) {
  var s = JSON.stringify(obj);
  if (p.z !== '1') return obj;
  var b = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(s, 'application/json')).getBytes());
  var off = Number(p.off || 0), n = Number(p.n || 5800);
  return { len: b.length, off: off, part: b.slice(off, off + n) };
}

function cbNorm_(s) { return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }

function cbDump_(ss) {
  var sh = ss.getSheetByName(CB.SRC_SHEET);
  var v = sh.getRange(4, 2, sh.getLastRow() - 3, 9).getValues();
  var price = v.filter(function (r) { return r[1] || r[2]; }).map(function (r) {
    return [r[0], r[1], r[2], r[4], r[5], r[6], r[7] ? 1 : 0, r[8] instanceof Date ? Utilities.formatDate(r[8], 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : String(r[8])];
  });
  var td = ss.getSheetByName('Total data');
  var lc = td.getLastColumn(), lr = td.getLastRow();
  var hdr = td.getRange(3, 1, 1, lc).getValues()[0].map(cbNorm_);
  function col(names) { for (var i = 0; i < names.length; i++) { var k = hdr.indexOf(names[i]); if (k >= 0) return k; }
    for (i = 0; i < names.length; i++) for (var j = 0; j < hdr.length; j++) if (hdr[j].indexOf(names[i]) === 0) return j; return -1; }
  var C = { nam: col(['năm']), hang: col(['tên hãng']), nh: col(['tên nhãn hiệu']), lv2: col(['phân loại level 2']),
            w: col(['trọng lượng']), wu: col(['đơn vị trọng lượng']), pcs: col(['số lượng ( pcs)', 'số lượng (pcs)']),
            ngay: col(['ngày đăng ký']), lv1: col(['phân loại level 1']), usd: col(['trị giá usd']) };
  var data = td.getRange(4, 1, lr - 3, lc).getValues();
  var agg = {};
  data.forEach(function (r) {
    var nh = String(r[C.nh] || '').trim(); if (!nh) return;
    var y = r[C.nam] || (r[C.ngay] instanceof Date ? r[C.ngay].getFullYear() : '');
    var k = [String(r[C.hang] || '').trim(), nh, String(r[C.lv2] || '').trim(), String(r[C.lv1] || '').trim()].join('|');
    var a = agg[k] || (agg[k] = { y: {}, w: {}, last: '' });
    var q = Number(r[C.pcs]) || 0;
    a.y[y] = (a.y[y] || 0) + q;
    var wk = (r[C.w] === '' ? '' : r[C.w]) + ' ' + String(r[C.wu] || '');
    a.w[wk] = (a.w[wk] || 0) + 1;
    if (r[C.ngay] instanceof Date) { var d = Utilities.formatDate(r[C.ngay], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); if (d > a.last) a.last = d; }
  });
  return { cols: C, hdr: hdr.slice(0, 80), price: price, agg: agg };
}
