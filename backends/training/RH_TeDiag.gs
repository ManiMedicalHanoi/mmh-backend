/* ════════════════════════════════════════════════════════════════════════════════════════
   RH_TeDiag.gs — v1.0 (12/11/2026) · CHẨN ĐOÁN ĐÀO TẠO KHÁCH HÀNG (T&E) — CHỈ ĐỌC, không ghi gì
   ────────────────────────────────────────────────────────────────────────────────────────
   Workflow "Kiểm tra" ▸ ping = training?action=teDiag&key=<8 ký tự cuối Script ID>&full=1[&who=Phuong][&part=sheets|te|log]
     · sheets : mọi sheet của Training Master (tên · số dòng · số cột · dòng tiêu đề có Training Type + Trainer)
                + sheet buổi đào tạo Hub đang dùng (hubReportSheet)
     · te     : các dòng Category = Customer Training (T&E) — dòng · SID · ngày · PIC · nhóm · trạng thái · actual / target ·
                số khách tham dự · review đủ 5 dòng · chủ đề (40 ký tự)
     · log    : 60 dòng HUB_Log gần nhất liên quan T&E (rhCustTrain / teCols / migrate / sheet buổi) và lỗi
   ════════════════════════════════════════════════════════════════════════════════════════ */
function apiTeDiag(p) {
  if (hubNorm(p.key) !== ScriptApp.getScriptId().slice(-8)) return {ok: false, code: 'KEY'};
  var part = hubNorm(p.part).toLowerCase(), who = hubKeyV(p.who || ''), out = {ok: true, report: '', reportErr: ''};
  var ss = hubSS();
  if (!part || part === 'sheets') {
    out.sheets = ss.getSheets().map(function(sh){
      var lr = sh.getLastRow(), lc = sh.getLastColumn(), hr = 0, sidN = '', last = '';
      try {
        var top = lr ? sh.getRange(1, 1, Math.min(lr, 10), Math.max(1, Math.min(lc, 60))).getValues() : [];
        top.forEach(function(r, i){
          if (hr) return; var k = r.map(hubKey);
          if (k.indexOf('trainingtype') >= 0 && k.indexOf('trainer') >= 0) {
            hr = i + 1;
            var cs = k.indexOf('sessionid'), cd = k.indexOf('actualdate');
            if (lr > hr && cs >= 0) sidN = sh.getRange(hr + 1, cs + 1, lr - hr, 1).getValues().filter(function(x){ return /^S\d{8}-\d+/.test(hubNorm(x[0])); }).length;
            if (lr > hr && cd >= 0) last = sh.getRange(hr + 1, cd + 1, lr - hr, 1).getValues().reduce(function(m, x){ var d = hubToDate(x[0]); var t = d ? hubFmt(d, 'yyyy-MM-dd') : ''; return t > m ? t : m; }, '');
          }
        });
      } catch (e) {}
      return [sh.getName(), lr, lc, hr, sidN, last, sh.isSheetHidden() ? 'ẩn' : ''];
    });
    out.sheetCols = ['name', 'lastRow', 'lastCol', 'headerRow', 'sessionIds', 'lastActualDate', 'hidden'];
  }
  try { out.report = hubReportSheet().getName(); } catch (e) { out.reportErr = String(e && e.message || e); }
  if ((!part || part === 'te') && out.report) {
    var rows = [];
    try {
      rows = hubTeRows_(hubReportSheet()).filter(function(x){ return !who || hubKeyV(x.pic) === who; }).map(function(x){
        return [x.row, x.sid, x.date, x.pic, x.team, x.status, x.actual, x.target, (x.audience || []).length,
                teReviewCheck_(x.review).ok ? 'đủ' : 'thiếu', String(x.topic || '').substring(0, 40)];
      });
    } catch (e) { out.teErr = String(e && e.message || e); }
    out.teCols = ['row', 'sid', 'date', 'pic', 'team', 'status', 'actual', 'target', 'audN', 'review', 'topic'];
    out.te = rows;
    try {
      var all = hubReadSessions();
      out.sessions = all.length;
      out.byCat = {};
      all.forEach(function(s){ var c = s.category || '(trống)'; out.byCat[c] = (out.byCat[c] || 0) + 1; });
    } catch (e2) {}
  }
  if (!part || part === 'log') {
    var lg = [];
    try {
      var sh = ss.getSheetByName(HUB.SHEETS.LOG);
      if (sh && sh.getLastRow() > 1) {
        var n = Math.min(sh.getLastRow() - 1, 3000), V = sh.getRange(sh.getLastRow() - n + 1, 1, n, 6).getValues();
        for (var i = V.length - 1; i >= 0 && lg.length < 60; i--) {
          var a = String(V[i][2] || ''), m = String(V[i][4] || ''), d = String(V[i][5] || '');
          if (!/rhCustTrain|teCols|migrate|reportSheet|Training Report/i.test(a + ' ' + m) && String(V[i][1]) !== 'ERROR') continue;
          if (who && hubKeyV(a + m + d).indexOf(who) < 0 && !/rhCustTrain/.test(a)) continue;
          lg.push([V[i][0] instanceof Date ? hubFmt(V[i][0], 'yyyy-MM-dd HH:mm') : String(V[i][0]), V[i][1], a.substring(0, 40), m.substring(0, 160), d.substring(0, 80)]);
        }
      }
    } catch (e) { out.logErr = String(e && e.message || e); }
    out.log = lg;
  }
  return out;
}
