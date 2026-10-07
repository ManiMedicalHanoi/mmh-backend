/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  TurnoverLink.gs                                 v1.1
   Two-way link with "MMH Turnover Report FY67-FY68" (sheet KPI TURNOVER)
   ────────────────────────────────────────────────────────────────────
   v1.1 (02/10/2026): KHÔNG còn chép Actual doanh số từ _KPI_ACT vào 3. Detail KPI nữa.
     Actual mã F do KpiSyncCenter tính thẳng từ SUM TURNOVER (đúng rule Segment Report, cộng đủ Dental + MMG).
     Lý do: _KPI_ACT có công thức mảng {"Dental";"MMG"} chỉ cộng Dental ⇒ 2 nơi ghi 2 số khác nhau.
     Phần ① (đẩy Target, trọng số sang file Turnover) giữ nguyên.

   ADD this as a NEW script file in the KPI file's Apps Script project
   (Extensions → Apps Script → + → Script → name it TurnoverLink) —
   do not replace the existing KPI Hub code. Then run  ktSetup  once.

   ① KPI file → Turnover file (immediately on every edit of 3. Detail KPI,
     5A. KPI Weight Input, 0. Staff List or 5. Member KPI Monthly, and every
     5 minutes): the turnover KPI lines (codes F…) of every member — target of
     each month, FY / quarter weights, department, position — are written into
     the hidden tab _KPI_SRC of the Turnover file. Its sheet KPI TURNOVER reads
     them live.
   ② Turnover file → KPI file: the Turnover file writes its turnover actuals
     (Actual USD, cumulative from September, closed months only) into the
     "<month> Actual" cells of 3. Detail KPI the moment SUM TURNOVER is edited.
     This script also re-reads them every 5 minutes (safety net).
     · a cell holding a formula in the KPI file is never overwritten;
     · a month closed by the KPI rule (after 16:00 on the 2nd of the next month)
       is only filled when the cell is still empty.
   Nothing here touches the KPI Hub, its menu, its triggers or the CRM links.
   No new permission: the script only opens the Turnover file (spreadsheets).
   ════════════════════════════════════════════════════════════════════ */
var KT = {
  TURNOVER_ID : '1bujnLrxerjUM1gR3aOoy3r4gvTp4pNyPwJM-ra5iFe8',   // MMH Turnover Report FY67-FY68
  SRC    : '_KPI_SRC',
  ACT    : '_KPI_ACT',
  MEMBER : '5. Member KPI Monthly',
  DETAIL : '3. Detail KPI',
  WATCH  : ['3. Detail KPI', '5A. KPI Weight Input', '0. Staff List', '5. Member KPI Monthly'],
  FIRST  : 6,       // first line row on _KPI_SRC (= first data row of KPI TURNOVER)
  MAXL   : 300,
  MARK   : '«MMH-AUTO-KPI · written by the KPI file — do not type here»'
};

/* ── run ONCE: triggers (on edit + every 5 minutes) and a first sync ── */
function ktSetup() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'ktOnEdit' || h === 'ktTick') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ktOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('ktTick').timeBased().everyMinutes(5).create();
  var msg = ktSyncNow(true);
  return msg;
}

/* ── sync both ways now (can also be run from the editor) ── */
function ktSyncNow(quiet) {
  var out = [];
  try { var a = ktPushToTurnover_(true); out.push('Targets & weights → Turnover file: ' + a.lines + ' line(s) for ' + a.members + ' member(s).'); }
  catch (e) { out.push('⚠ Could not write to the Turnover file: ' + (e && e.message || e)); }
  out.push('Turnover actuals → 3. Detail KPI: do KpiSyncCenter ghi (TurnoverLink v1.1 không ghi Actual nữa).');
  var msg = out.join('\n');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('MMH KPI ⇄ Turnover', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e3) {}
  return msg;
}

/* ── installable triggers ── */
function ktOnEdit(e) {
  try {
    if (!e || !e.range) return;
    var name = e.range.getSheet().getName();
    if (KT.WATCH.indexOf(name) < 0) return;
    // typing an Actual in 3. Detail KPI does not change targets / weights → nothing to send
    if (name === KT.DETAIL) {
      var c = e.range.getColumn(), hdr = String(e.range.getSheet().getRange(4, c).getDisplayValue() || '');
      if (/Actual|%|Check|weighted/i.test(hdr) && e.range.getNumColumns() === 1) return;
    }
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return;
    try { SpreadsheetApp.flush(); ktPushToTurnover_(false); } finally { lock.releaseLock(); }
  } catch (err) { Logger.log('ktOnEdit: ' + err); }
}
function ktTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try { ktPushToTurnover_(false); } catch (e) { Logger.log('ktTick push: ' + e); }
  finally { lock.releaseLock(); }
}

/* ── ① KPI file → Turnover file ─────────────────────────────────────── */
function ktPushToTurnover_(force) {
  var kss = SpreadsheetApp.getActive();
  var mem = kss.getSheetByName(KT.MEMBER), det = kss.getSheetByName(KT.DETAIL);
  if (!mem || !det) throw new Error('sheet "' + KT.MEMBER + '" or "' + KT.DETAIL + '" not found');

  // months + FY from the header of 3. Detail KPI ("202609 Target", "FY68 Target")
  var hdr = det.getRange(4, 1, 1, det.getLastColumn()).getDisplayValues()[0];
  var months = [], fy = '';
  hdr.forEach(function (h) {
    var s = String(h).replace(/\s+/g, ' ').trim(), m = s.match(/^(\d{6}) Target$/), f = s.match(/^(FY\d+) Target$/i);
    if (m && months.length < 12) months.push(parseInt(m[1], 10));
    if (f && !fy) fy = f[1].toUpperCase();
  });
  while (months.length < 12) months.push('');

  // turnover lines (codes F…) of every member, in the order of sheet 5
  var last = mem.getLastRow();
  var V = last >= 5 ? mem.getRange(5, 1, last - 4, 95).getValues() : [];
  var order = [], by = {};
  V.forEach(function (v) {
    var code = String(v[4] || '').trim(), who = String(v[2] || '').trim();
    if (!who || !/^F/i.test(code)) return;
    if (!by[who]) { by[who] = []; order.push(who); }
    var t = []; for (var j = 0; j < 12; j++) t.push(v[34 + 5 * j]);
    by[who].push([String(v[1] || ''), String(v[3] || ''), code, v[5], v[6], v[7], v[8], v[9], v[11], v[16], v[21], v[26], v[31], t]);
  });
  var lines = [];
  order.forEach(function (who) {
    by[who].forEach(function (x, i) {
      lines.push(['line', i + 1, x[0], who, x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9], x[10], x[11], x[12]].concat(x[13]).concat(['']));
    });
    var dept = by[who][0][0];
    lines.push(['total', by[who].length, dept, who, '', '', '', '', '', '', '', '', '', '', '', ''].concat(['', '', '', '', '', '', '', '', '', '', '', '']).concat(['']));
    lines.push(['blank', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''].concat(['', '', '', '', '', '', '', '', '', '', '', '']).concat(['']));
  });
  if (lines.length > KT.MAXL) lines = lines.slice(0, KT.MAXL);

  var tss = SpreadsheetApp.openById(KT.TURNOVER_ID);
  var src = tss.getSheetByName(KT.SRC);
  if (!src) { src = tss.insertSheet(KT.SRC); src.getRange('A1').setValue(KT.MARK); try { src.hideSheet(); } catch (e) {} }
  if (src.getMaxRows() < KT.FIRST + KT.MAXL + 5) src.insertRowsAfter(src.getMaxRows(), KT.FIRST + KT.MAXL + 5 - src.getMaxRows());
  if (src.getMaxColumns() < 30) src.insertColumnsAfter(src.getMaxColumns(), 30 - src.getMaxColumns());

  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify([months, fy, lines])));
  var props = PropertiesService.getScriptProperties();
  var same = !force && props.getProperty('KT_SRC_HASH') === hash && String(src.getRange('B2').getValue() || '') === kss.getId();
  src.getRange('A2:H2').setValues([['KPI file ID', kss.getId(), 'KPI file URL', kss.getUrl(), 'Last update', new Date(), 'FY', fy]]);
  if (!same) {
    src.getRange('A3').setValue('Months');
    src.getRange(3, 2, 1, 12).setValues([months]);
    src.getRange(KT.FIRST, 1, KT.MAXL, 29).clearContent();
    if (lines.length) src.getRange(KT.FIRST, 1, lines.length, 29).setValues(lines);
    props.setProperty('KT_SRC_HASH', hash);
  }
  return { lines: lines.filter(function (l) { return l[0] === 'line'; }).length, members: order.length, changed: !same };
}

/* ── ② Turnover file → KPI file (safety net; the Turnover file also pushes on every edit) ── */
function ktPullFromTurnover_(why) {
  var tss = SpreadsheetApp.openById(KT.TURNOVER_ID);
  var act = tss.getSheetByName(KT.ACT);
  if (!act) return { ok: false, error: 'The Turnover file has no ' + KT.ACT + ' tab yet: run its menu build once (📊 MMH Report → 📅 Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR sheets).' };
  var table = ktReadAct_(act);
  if (!table) return { ok: false, error: KT.ACT + ' is empty' };
  return ktWriteTurnoverActuals_(SpreadsheetApp.getActive(), table, 'turnover · ' + (why || 'auto'));
}
function ktReadAct_(act) {
  var last = act.getLastRow(); if (last < 4) return null;
  var v = act.getRange(3, 1, last - 2, 15).getValues();
  var months = v[0].slice(3, 15).map(function (x) { return parseInt(x, 10) || 0; });
  var rows = {};
  for (var i = 1; i < v.length; i++) { var code = String(v[i][0] || '').trim(); if (code) rows[code] = v[i].slice(3, 15); }
  return { months: months, rows: rows };
}

/* SAME function in the Turnover file's Code.gs (PART 7) — keep both in sync.
   table = { months:[12 yyyymm], rows:{ code:[12 cumulative values or ""] } } */
function ktWriteTurnoverActuals_(kss, table, source) {
  var sh = kss.getSheetByName("3. Detail KPI");
  if (!sh) return { ok:false, error:"sheet '3. Detail KPI' not found in the KPI file" };
  var lastCol = sh.getLastColumn(), lastRow = sh.getLastRow();
  var hdr = sh.getRange(4, 1, 1, lastCol).getDisplayValues()[0];
  var colOf = {};
  table.months.forEach(function(m, j){
    for (var c = 0; c < hdr.length; c++) if (String(hdr[c]).replace(/\s+/g, " ").trim() === m + " Actual") { colOf[j] = c + 1; break; }
  });
  var cols = Object.keys(colOf).map(function(j){ return colOf[j]; });
  if (!cols.length) return { ok:false, error:"no '<yyyymm> Actual' columns found in row 4 of 3. Detail KPI" };
  var c1 = Math.min.apply(null, cols), c2 = Math.max.apply(null, cols);
  var codes = sh.getRange(5, 2, lastRow - 4, 1).getValues().map(function(r){ return String(r[0] || "").trim(); });
  var blk = sh.getRange(5, c1, lastRow - 4, c2 - c1 + 1), vals = blk.getValues(), fmls = blk.getFormulas();
  var now = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMddHHmm");
  var lockOf = function(m){ var y = Math.floor(m / 100), mo = m % 100 + 1; if (mo > 12) { mo = 1; y++; } return String(y) + ("0" + mo).slice(-2) + "021600"; };
  var cells = 0, locked = 0, touched = {};
  Object.keys(table.rows).forEach(function(code){
    var ri = codes.indexOf(code); if (ri < 0) return;
    table.rows[code].forEach(function(v, j){
      if (v === "" || v === null || v === undefined || isNaN(Number(v)) || !colOf[j]) return;
      var ci = colOf[j] - c1, cur = vals[ri][ci], num = Math.round(Number(v) * 100) / 100;
      if (fmls[ri][ci]) return;                                              // a formula in the KPI file wins
      if (cur !== "" && cur !== null && Math.abs(Number(cur) - num) < 0.005) return;
      if (now >= lockOf(table.months[j]) && cur !== "" && cur !== null) { locked++; return; }   // month closed by the KPI rule
      sh.getRange(5 + ri, colOf[j]).setValue(num); cells++; touched[code] = 1;
    });
  });
  var nCodes = Object.keys(touched).length;
  if (cells) {
    var log = kss.getSheetByName("_CRM_SYNC_LOG");
    if (log) { try { log.insertRowBefore(2); log.getRange(2, 1, 1, 4).setValues([[new Date(), source, "push", nCodes + " code(s) · " + cells + " cell(s)"]]);
                     if (log.getLastRow() > 400) log.deleteRows(401, log.getLastRow() - 400); } catch (e) {} }
  }
  return { ok:true, cells:cells, codes:nCodes, locked:locked };
}