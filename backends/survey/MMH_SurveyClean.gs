/**
 * MMH_SurveyClean.gs — xoá câu trả lời THỬ (test) của một khảo sát (13/11/2026, người dùng: "xoá dòng bệnh viện ABC, đấy là dòng test").
 * action rsDelTest (khoá SV_KEY, gọi từ workflow Kiểm tra):
 *   link  = link sửa form / link Sheet kết quả (như app MMH Survey)
 *   match = từ / cụm từ có trong tên bệnh viện / cơ sở (nguyên từ, không phân biệt hoa thường), vd. ABC ⇒ "Bệnh viện ABC", "BV abc"
 *   col=all ⇒ tìm ở mọi cột (trừ họ tên / SĐT / email); không có link ⇒ liệt kê ở mọi khảo sát của app.
 *   run=1 ⇒ xoá thật: câu trả lời trong Google Form + dòng tương ứng trong Sheet kết quả (cùng tên + giờ nộp lệch ≤ 2 phút).
 *   Không run ⇒ chỉ liệt kê (giờ nộp + tên cơ sở), không trả họ tên / SĐT.
 */
function rsDelTest_(p) {
  var want = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
  if (p.key !== want) return { ok: false, error: 'KEY' };
  var m = rsS_(p.match).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();
  if (!m) return { ok: false, error: 'Thiếu match (tên cơ sở cần xoá).' };
  if (!p.link) {  // không có link ⇒ tìm ở mọi khảo sát trong app (chỉ liệt kê)
    return { ok: true, all: rsRead_().filter(function (e) { return !e.hidden; }).map(function (e) {
      try { var o = rsDelTest_(Object.assign({}, p, { link: e.sheetId ? 'https://docs.google.com/spreadsheets/d/' + e.sheetId + '/edit' : 'https://docs.google.com/forms/d/' + e.formId + '/edit', run: '' })); return { title: rsS_(e.title).slice(0, 50), sheet: o.sheet, form: o.form }; }
      catch (x) { return { title: rsS_(e.title).slice(0, 50), err: x.message }; }
    }) };
  }
  var rr = rsResolve_(p.link), E = null;
  rsRead_().forEach(function (e) { if (!E && ((rr.formId && e.formId === rr.formId) || (rr.sheetId && e.sheetId === rr.sheetId))) E = e; });
  var formId = rr.formId || (E && E.formId), sheetId = rr.sheetId || (E && E.sheetId);
  var HOS = /bệnh viện|phòng khám|cơ sở công tác|nơi công tác/i, same = function (v) { var t = ' ' + rsS_(v).replace(/[^\p{L}\p{N}]+/gu, ' ').toLowerCase() + ' '; return t.indexOf(' ' + m + ' ') >= 0; };
  var tz = 'Asia/Ho_Chi_Minh', fmt = function (t) { return Utilities.formatDate(new Date(t), tz, 'dd/MM/yyyy HH:mm:ss'); };
  var out = { ok: true, run: p.run === '1', form: [], sheet: [] }, times = [];
  // 1) Sheet kết quả (nhanh): dòng có tên cơ sở khớp ⇒ giờ nộp
  if (sheetId) {
    var sh = rsRespSheet_(SpreadsheetApp.openById(sheetId), formId), lr = sh.getLastRow(), lc = sh.getLastColumn(), del = [];
    if (lr > 1) {
      var head = sh.getRange(1, 1, 1, lc).getValues()[0], hc = [];
      head.forEach(function (h, i) { if (i > 0 && (p.col === 'all' ? !/họ.*tên|điện thoại|email/i.test(rsS_(h)) : HOS.test(rsS_(h)))) hc.push(i); });
      sh.getRange(2, 1, lr - 1, lc).getValues().forEach(function (row, i) {
        var hit = hc.filter(function (c) { return same(row[c]); }); if (!hit.length) return;
        var t = row[0] instanceof Date ? row[0].getTime() : 0; if (t) times.push(t);
        del.push(i + 2); out.sheet.push((t ? fmt(t) : 'dòng ' + (i + 2)) + ' · ' + rsS_(head[hit[0]]).slice(0, 30) + ': ' + rsS_(row[hit[0]]).slice(0, 60));
      });
    }
  }
  // 2) Form: câu trả lời cùng giờ nộp (≤ 5 giây); không có Sheet ⇒ đọc câu trả lời form (chậm)
  if (formId) {
    var form = FormApp.openById(formId), fr = [];
    if (sheetId) {
      if (times.length) form.getResponses(new Date(Math.min.apply(null, times) - 60000)).forEach(function (r) {
        var t = r.getTimestamp().getTime(); if (times.some(function (x) { return Math.abs(x - t) <= 5000; })) fr.push(r);
      });
    } else form.getResponses().forEach(function (r) {
      if (r.getItemResponses().some(function (ir) { return HOS.test(ir.getItem().getTitle()) && same(ir.getResponse()); })) fr.push(r);
    });
    fr.forEach(function (r) { out.form.push(fmt(r.getTimestamp().getTime())); if (out.run) form.deleteResponse(r.getId()); });
  }
  if (out.run && del && del.length) del.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
  if (out.run && E) { try { CacheService.getScriptCache().remove('rsc2_' + E.id); } catch (x) {} }
  return out;
}
