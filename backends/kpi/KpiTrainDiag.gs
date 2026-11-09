/* ════════════════ CHẨN ĐOÁN KPI ĐÀO TẠO (chỉ đọc) — 09/11/2026 ════════════════
   ?action=trDiag&key=<8 ký tự cuối ID file KPI>&who=<tên>&ym=yyyyMM
   ⇒ mã KPI đào tạo của người đó (Members involved, trainerKey) + MỌI dòng Training Report FYxx
     có tên người đó ở Trainer / Target Audience / Topic (giá trị thô) + kết quả đọc của bộ đếm
     (type, category, tháng, done, ok/why, mã KPI khớp). Không ghi gì. */
function kscTrainDiag_(p) {
  var KEY = '1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0';
  if (String(p.key || '') !== KEY.slice(-8)) return { ok: false, error: 'key' };
  var who = kscNorm_(p.who || ''), ym = Number(p.ym) || 0;
  var ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(KEY), ctx = kscCtx_(ss);
  var tss = SpreadsheetApp.openById(KSC.TRAINING_ID), people = kscTrainPeople_(tss);
  var targets = kscTrainTargets_(ctx.L), S = kscTrainSessions_(tss, people), res = kscTrainCount_(S.list, targets, ctx.L.months);
  var L = ctx.L, mCol = L.H['members involved'];
  var codes = Object.keys(L.rows).filter(function (c) { return /^L[12]-|^C10-0[3-6]$|^C3-1[01]$/.test(c); }).sort().filter(function (c) {
    return !who || mCol == null || kscNorm_(L.V[L.rows[c]][mCol]).indexOf(who) >= 0;
  }).map(function (c) {
    var t = targets.filter(function (x) { return x.code === c; })[0];
    return { code: c, member: mCol == null ? '' : String(L.V[L.rows[c]][mCol] || ''), target: t ? t.trainerKey : '(bỏ qua: Members involved trống / nhiều người)',
             counts: t ? res.counts[c] : null };
  });
  var raw = [];
  tss.getSheets().forEach(function (s) {
    if (!KSC_TRAIN.REPORT_RE.test(kscNorm_(s.getName()))) return;
    var lr = s.getLastRow(), lc = Math.min(s.getLastColumn(), 80); if (lr < 2) return;
    var V = s.getRange(1, 1, lr, lc).getValues(), hr = -1, H = [];
    for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) { var h = V[i].map(kscNorm_); if (h.indexOf('training type') >= 0 && h.indexOf('trainer') >= 0) { hr = i; H = h; } }
    if (hr < 0) return;
    var want = ['month', 'actual date', 'training type', 'training category', 'training topic', 'trainer', 'target audience', 'status', 'session id'];
    for (var r = hr + 1; r < lr; r++) {
      var o = {}, hay = '';
      want.forEach(function (k) { var c = H.indexOf(k); var v = c >= 0 ? V[r][c] : ''; o[k] = kscIsDate_(v) ? Utilities.formatDate(v, KSC.TZ, 'yyyy-MM-dd') : String(v); });
      hay = kscNorm_(o['trainer'] + ' | ' + o['target audience'] + ' | ' + o['training topic']);
      var rym = kscYm_(V[r][H.indexOf('actual date')], o['month']);
      if (who ? hay.indexOf(who) >= 0 && (!ym || !rym || rym === ym) : rym === ym) {
        o.sheet = s.getName(); o.row = r + 1; o.ym = rym; raw.push(o);
      }
    }
  });
  var parsed = S.list.map(function (s, i) { return { s: s, hit: res.hits[i] || [] }; }).filter(function (x) {
    var s = x.s; return raw.some(function (o) { return o.sheet === s.sheet && o.row === s.row; });
  }).map(function (x) { var s = x.s; return { sheet: s.sheet, row: s.row, sid: s.sid, ym: s.ym, type: s.type, cat: s.cat, trainer: s.trainer, trainerKey: s.trainerKey,
    status: s.status, done: s.done, ok: s.ok, why: s.why, hits: x.hit }; });
  raw.forEach(function (o) { if (!parsed.some(function (x) { return x.sheet === o.sheet && x.row === o.row; })) o.skipped = 'không vào bộ đếm (Training Type không phải Internal / External / Coaching, phiên TEST, hoặc trùng Session ID + ngày + trainer với dòng khác)'; });
  return { ok: true, sheets: S.sheets, curYm: ctx.curYm, months: L.months, codes: codes, raw: raw.slice(0, 40), parsed: parsed.slice(0, 40) };
}
