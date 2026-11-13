/**
 * MMH_SurveyClean.gs — xoá câu trả lời THỬ (test) của một khảo sát (13/11/2026, người dùng: "xoá dòng bệnh viện ABC, đấy là dòng test").
 * action rsDelTest (khoá SV_KEY, gọi từ workflow Kiểm tra):
 *   link  = link sửa form / link Sheet kết quả (như app MMH Survey)
 *   match = tên bệnh viện / cơ sở ĐÚNG Y (không phân biệt hoa thường, bỏ khoảng trắng thừa), vd. ABC
 *   run=1 ⇒ xoá thật: câu trả lời trong Google Form + dòng tương ứng trong Sheet kết quả (cùng tên + giờ nộp lệch ≤ 2 phút).
 *   Không run ⇒ chỉ liệt kê (giờ nộp + tên cơ sở), không trả họ tên / SĐT.
 */
function rsDelTest_(p) {
  var want = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
  if (p.key !== want) return { ok: false, error: 'KEY' };
  var m = rsS_(p.match).replace(/\s+/g, ' ').toLowerCase();
  if (!m) return { ok: false, error: 'Thiếu match (tên cơ sở cần xoá).' };
  var rr = rsResolve_(p.link), E = null;
  rsRead_().forEach(function (e) { if (!E && ((rr.formId && e.formId === rr.formId) || (rr.sheetId && e.sheetId === rr.sheetId))) E = e; });
  var formId = rr.formId || (E && E.formId), sheetId = rr.sheetId || (E && E.sheetId);
  var HOS = /bệnh viện|phòng khám|cơ sở công tác|nơi công tác/i, same = function (v) { return rsS_(v).replace(/\s+/g, ' ').toLowerCase() === m; };
  var tz = 'Asia/Ho_Chi_Minh', fmt = function (t) { return Utilities.formatDate(new Date(t), tz, 'dd/MM/yyyy HH:mm:ss'); };
  var out = { ok: true, run: p.run === '1', form: [], sheet: [] }, times = [];
  if (formId) {
    var form = FormApp.openById(formId);
    form.getResponses().forEach(function (r) {
      var hit = r.getItemResponses().some(function (ir) { return HOS.test(ir.getItem().getTitle()) && same(ir.getResponse()); });
      if (!hit) return;
      var t = r.getTimestamp().getTime(); times.push(t); out.form.push(fmt(t));
      if (out.run) form.deleteResponse(r.getId());
    });
  }
  if (sheetId) {
    var sh = rsRespSheet_(SpreadsheetApp.openById(sheetId), formId), lr = sh.getLastRow(), lc = sh.getLastColumn();
    if (lr > 1) {
      var head = sh.getRange(1, 1, 1, lc).getValues()[0], hc = [];
      head.forEach(function (h, i) { if (i > 0 && HOS.test(rsS_(h))) hc.push(i); });
      var V = sh.getRange(2, 1, lr - 1, lc).getValues(), del = [];
      V.forEach(function (row, i) {
        if (!hc.some(function (c) { return same(row[c]); })) return;
        var t = row[0] instanceof Date ? row[0].getTime() : 0;
        if (formId && times.length && !times.some(function (x) { return Math.abs(x - t) <= 120000; })) return;  // chỉ dòng khớp câu trả lời form
        del.push(i + 2); out.sheet.push(t ? fmt(t) : 'dòng ' + (i + 2));
      });
      if (out.run) del.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
    }
  }
  if (out.run && E) { try { CacheService.getScriptCache().remove('rsc2_' + E.id); } catch (x) {} }
  return out;
}
