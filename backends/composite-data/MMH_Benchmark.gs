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
