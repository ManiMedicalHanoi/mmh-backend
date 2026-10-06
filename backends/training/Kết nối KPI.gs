/* ════════════════════════════════════════════════════════════════════
   MMH TRAINING HUB  ·  TrainingKpiLink.gs                          v1.0
   Kết nối 2 chiều:  MMH - Training Master  ⇄  MMH KPI FY68 (sheet 3. Detail KPI)
   ────────────────────────────────────────────────────────────────────
   CÁCH CÀI (làm 1 lần):
     1. Mở project Apps Script của MMH Training Hub (project đang chạy web app).
     2. Bấm  +  ▸ Script ▸ đặt tên  TrainingKpiLink  ▸ dán TOÀN BỘ file này vào.
        KHÔNG sửa, KHÔNG thay Code.gs hiện tại của Training Hub.
     3. Chọn hàm  trkSetup  ▸ Run ▸ cấp quyền khi được hỏi.
        (Không cần Deploy lại web app: file này chỉ chạy bằng trigger.)
     4. (Một lần, tuỳ chọn) chọn hàm  trkRepairKpiRollups  ▸ Run để điền lại công thức
        còn trống ở các dòng tổng tháng 202609 → 202611 của sheet 3. Detail KPI.

   ① Training Master → file KPI (mỗi 10 phút + ngay khi sửa tay sheet Training Report):
      đếm số buổi đào tạo trạng thái Completed theo tháng (Actual Date, nếu trống thì cột Month)
      rồi ghi vào cột "<yyyymm> Actual" của 3. Detail KPI:
        L1-00   = Training Type Internal · Category Product · mọi Trainer
        L2-xx   = Training Type Internal · Category khác Product · Trainer = người của dòng KPI
                  (L2-01 Tuyen · L2-02 Giang · L2-03 Thuong · L2-04 Viet · L2-05 Hoa · L2-06 Dam Ha)
        C10-06  = Training Type External · mọi Category · Trainer = Giang
      · ô có công thức trong file KPI không bao giờ bị ghi đè (dòng tổng L2-00 tự cộng);
      · tháng đã chốt theo rule KPI (sau 16:00 ngày 2 tháng sau) chỉ được điền khi ô còn trống;
      · chỉ ghi tháng đã tới (≤ tháng hiện tại), tháng chưa có buổi nào ghi 0.
   ② File KPI → Training Master: tab "KPI TRAINING FY68" (tự tạo) hiển thị target / actual
      từng tháng của các mã trên + danh sách buổi đào tạo trong FY và lý do được / không được tính.

   Không đụng tới Code.gs, menu, trigger, doGet của Training Hub, không đụng CRM, Turnover.
   File này mở 2 file bằng ID nên cũng chạy được nếu dán vào project Apps Script của file KPI
   (chỉ cài ở MỘT nơi).
   ════════════════════════════════════════════════════════════════════ */

var TRK = {
  KPI_ID      : '1iWV0PfyvyL3MzBlR7R4xCIOVxPqRcLM4Dr3rOSfQ6m8',   // MMH KPI FY68
  TRAINING_ID : '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',   // MMH - Training Master
  DETAIL      : '3. Detail KPI',
  LOG         : '_CRM_SYNC_LOG',
  SOURCE      : 'training',
  REPORT_RE   : /^training report fy\d+$/,                       // "Training Report FY67", "Training Report FY68"…
  OUT_PREFIX  : 'KPI TRAINING ',
  TZ          : 'Asia/Ho_Chi_Minh',
  EVERY_MIN   : 10,
  DONE        : ['completed', 'complete', 'done', 'finished', 'hoan thanh', 'da hoan thanh'],
  /* tên Trainer trong Training Master  →  tên KPI (cột "Members involved" của 3. Detail KPI) */
  ALIAS       : { 'minh viet': 'Viet' }
};

/* Rule đếm — sửa ở đây nếu logic thay đổi */
var TRK_RULES = [
  { code: 'L1-00',  type: 'internal', cat: 'product',  trainer: '*',
    text: 'Internal · Category = Product · mọi Trainer' },
  { code: 'L2-*',   type: 'internal', cat: '!product', trainer: '@member',
    text: 'Internal · Category khác Product · Trainer = người của dòng KPI' },
  { code: 'C10-06', type: 'external', cat: '*',        trainer: 'Giang',
    text: 'External · mọi Category · Trainer = Giang' }
];

/* ── chạy 1 LẦN: trigger 10 phút + trigger khi sửa Training Master + đồng bộ lần đầu ── */
function trkSetup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'trkTick' || h === 'trkOnEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('trkTick').timeBased().everyMinutes(TRK.EVERY_MIN).create();
  ScriptApp.newTrigger('trkOnEdit').forSpreadsheet(TRK.TRAINING_ID).onEdit().create();
  return trkSyncNow();
}

/* ── đồng bộ ngay (chạy từ editor được) ── */
function trkSyncNow() {
  var msg;
  try { msg = trkRun_('manual', true).message; }
  catch (e) { msg = '⚠ ' + (e && e.message || e); }
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Training ⇄ KPI FY68', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e2) {}
  return msg;
}

/* ── gỡ trigger (khi cần tạm dừng) ── */
function trkStop() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'trkTick' || h === 'trkOnEdit') { ScriptApp.deleteTrigger(t); n++; }
  });
  return 'Đã gỡ ' + n + ' trigger của TrainingKpiLink.';
}

/* ── trigger ── */
function trkTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try { trkRun_('auto', false); } catch (e) { Logger.log('trkTick: ' + e); }
  finally { lock.releaseLock(); }
}
function trkOnEdit(e) {
  try {
    if (!e || !e.range) return;
    if (!TRK.REPORT_RE.test(trkNorm_(e.range.getSheet().getName()))) return;
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return;
    try { SpreadsheetApp.flush(); trkRun_('edit', false); } finally { lock.releaseLock(); }
  } catch (err) { Logger.log('trkOnEdit: ' + err); }
}

/* ════════════════ LÕI ════════════════ */
function trkRun_(why, force) {
  var tss = SpreadsheetApp.openById(TRK.TRAINING_ID);
  var kss = SpreadsheetApp.openById(TRK.KPI_ID);
  var sh = kss.getSheetByName(TRK.DETAIL);
  if (!sh) throw new Error('File KPI không có sheet "' + TRK.DETAIL + '"');

  var L = trkLayout_(sh);
  if (!L.months.length) throw new Error('Không thấy cột "<yyyymm> Actual" ở dòng tiêu đề của ' + TRK.DETAIL);
  var targets = trkTargets_(L);
  var people = trkPeople_(tss);
  var S = trkSessions_(tss, people);
  var res = trkCount_(S.list, targets, L.months);

  var curYm = Number(Utilities.formatDate(new Date(), TRK.TZ, 'yyyyMM'));
  var st = trkWrite_(sh, L, targets, res.counts, curYm);
  if (st.cells) trkLog_(kss, TRK.SOURCE + ' · ' + why, 'push', st.codes + ' mã · ' + st.cells + ' ô' + (st.locked ? ' · giữ ' + st.locked + ' ô tháng đã chốt' : ''));

  SpreadsheetApp.flush();
  var out = trkWriteBack_(tss, sh, targets, res, L, curYm, S, force);

  var msg = Utilities.formatDate(new Date(), TRK.TZ, 'dd/MM/yyyy HH:mm') +
    ' · ' + S.list.length + ' buổi đọc từ ' + S.sheets.join(', ') +
    ' · ' + targets.length + ' mã KPI (' + targets.map(function (t) { return t.code; }).join(', ') + ')' +
    ' · ghi ' + st.cells + ' ô vào ' + TRK.DETAIL +
    (st.locked ? ' · giữ nguyên ' + st.locked + ' ô tháng đã chốt' : '') +
    (st.formula ? ' · bỏ qua ' + st.formula + ' ô có công thức' : '') +
    (targets.missing.length ? ' · ⚠ file KPI thiếu mã: ' + targets.missing.join(', ') : '') +
    ' · tab "' + out.tab + '" ' + (out.changed ? 'đã cập nhật' : 'không đổi');
  try { PropertiesService.getScriptProperties().setProperty('TRK_LAST', msg); } catch (e) {}
  return { ok: true, message: msg, cells: st.cells };
}

/* ── 3. Detail KPI: dòng tiêu đề, tháng, cột, dòng theo mã ── */
function trkLayout_(sh) {
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 80);
  var V = sh.getRange(1, 1, lr, lc).getValues(), F = sh.getRange(1, 1, lr, lc).getFormulas();
  var hr = -1, cc = -1, i, j;
  for (i = 0; i < Math.min(lr, 15) && hr < 0; i++)
    for (j = 0; j < lc; j++) if (trkNorm_(V[i][j]) === 'kpi code') { hr = i; cc = j; break; }
  if (hr < 0) throw new Error('Sheet "' + TRK.DETAIL + '" không có ô tiêu đề "KPI Code"');
  var H = {}, months = [], tCol = {}, aCol = {}, FYC = {}, fy = '', fyT = -1, fyA = -1, fyP = -1;
  V[hr].forEach(function (h, k) {
    var s = String(h || '').replace(/\s+/g, ' ').trim(), m = /^(\d{6}) (target|actual)$/i.exec(s), f = /^(FY\d+) (target|actual|%)$/i.exec(s);
    if (m) { var ym = Number(m[1]); if (/target/i.test(m[2])) { tCol[ym] = k; if (months.indexOf(ym) < 0) months.push(ym); } else aCol[ym] = k; return; }
    if (f) { var y = f[1].toUpperCase(); FYC[y] = FYC[y] || {}; FYC[y][f[2].toLowerCase()] = k; return; }
    H[trkNorm_(s)] = k;
  });
  /* năm tài chính đang theo dõi = cột "FYxx Target" (bỏ qua "FY67 Actual" tham khảo) */
  Object.keys(FYC).forEach(function (y) { if (!fy && FYC[y].target != null) fy = y; });
  if (fy) { fyT = FYC[fy].target; fyA = FYC[fy].actual != null ? FYC[fy].actual : -1; fyP = FYC[fy]['%'] != null ? FYC[fy]['%'] : -1; }
  months = months.filter(function (m) { return aCol[m] != null; }).sort();
  var rows = {};
  for (i = hr + 1; i < lr; i++) { var c = String(V[i][cc] || '').trim(); if (c && rows[c] == null) rows[c] = i; }
  return { V: V, F: F, hr: hr, cc: cc, H: H, months: months, tCol: tCol, aCol: aCol, rows: rows, fy: fy || 'FY', fyT: fyT, fyA: fyA, fyP: fyP };
}

/* ── danh sách mã KPI cần đếm, lấy người phụ trách từ cột "Members involved" ── */
function trkTargets_(L) {
  var out = [], miss = [];
  var mCol = L.H['members involved'], nCol = L.H['detail kpi'];
  function cell(r, c) { return c == null ? '' : String(L.V[r][c] || '').trim(); }
  TRK_RULES.forEach(function (rule) {
    var codes = [];
    if (/\*$/.test(rule.code)) {
      var pre = rule.code.replace(/\*$/, '');
      Object.keys(L.rows).forEach(function (c) { if (c.indexOf(pre) === 0 && !/-00$/.test(c)) codes.push(c); });
      codes.sort();
    } else if (L.rows[rule.code] != null) codes.push(rule.code);
    else miss.push(rule.code);
    codes.forEach(function (code) {
      var r = L.rows[code], member = cell(r, mCol);
      var who = rule.trainer === '@member' ? member : rule.trainer;
      if (rule.trainer === '@member' && (!who || /,|^-/.test(who))) return;   // dòng không gắn 1 người cụ thể
      out.push({ code: code, row: r, name: cell(r, nCol).replace(/\s+/g, ' '), member: member, rule: rule,
                 trainerKey: who === '*' ? '*' : trkNorm_(who) });
    });
  });
  out.missing = miss;
  return out;
}

/* ── email → tên Trainer (sheet Master + HUB_Users) ── */
function trkPeople_(tss) {
  var map = {};
  function add(mail, name) {
    String(mail || '').split(/[;,\s]+/).forEach(function (m) { m = m.trim().toLowerCase(); if (m && m.indexOf('@') > 0 && name) map[m] = String(name).trim(); });
  }
  var ms = tss.getSheetByName('Master');
  if (ms && ms.getLastRow() > 1) {
    var V = ms.getRange(1, 1, Math.min(ms.getLastRow(), 300), Math.min(ms.getLastColumn(), 40)).getValues(), pairs = [];
    for (var i = 0; i < Math.min(V.length, 5); i++)
      for (var j = 1; j < V[i].length; j++)
        if (trkNorm_(V[i][j]) === 'trainer email' && trkNorm_(V[i][j - 1]) === 'trainer') pairs.push([i, j - 1, j]);
    pairs.forEach(function (p) { for (var r = p[0] + 1; r < V.length; r++) add(V[r][p[2]], V[r][p[1]]); });
  }
  var us = tss.getSheetByName('HUB_Users');
  if (us && us.getLastRow() > 1) {
    var U = us.getRange(1, 1, us.getLastRow(), Math.min(us.getLastColumn(), 12)).getValues();
    var e = U[0].map(trkNorm_).indexOf('email'), n = U[0].map(trkNorm_).indexOf('name');
    if (e >= 0 && n >= 0) for (var k = 1; k < U.length; k++) add(U[k][e], U[k][n]);
  }
  return map;
}

/* ── đọc mọi sheet "Training Report FY.." (không đọc HUB_TestSessions, bỏ phiên TEST) ── */
function trkSessions_(tss, people) {
  var list = [], seen = {}, sheets = [];
  tss.getSheets().forEach(function (s) {
    if (!TRK.REPORT_RE.test(trkNorm_(s.getName()))) return;
    var lr = s.getLastRow(), lc = Math.min(s.getLastColumn(), 40); if (lr < 2) return;
    var V = s.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
    for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
      var h = V[i].map(trkNorm_);
      if (h.indexOf('training type') >= 0 && h.indexOf('trainer') >= 0) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
    }
    if (hr < 0) return;
    sheets.push(s.getName());
    function g(row, key) { return C[key] == null ? '' : row[C[key]]; }
    for (var r = hr + 1; r < lr; r++) {
      var row = V[r], type = trkNorm_(g(row, 'training type')), trainerRaw = String(g(row, 'trainer') || '').trim();
      if (!type || (type.indexOf('internal') !== 0 && type.indexOf('external') !== 0)) continue;   // dòng gợi ý "Chose", dòng trống
      var sid = String(g(row, 'session id') || '').trim(), topic = String(g(row, 'training topic') || '').trim();
      if (/^test/i.test(sid) || /^\[test\]/i.test(topic)) continue;
      if (sid) { if (seen[sid]) continue; seen[sid] = 1; }
      var name = trainerRaw.indexOf('@') > 0 ? (people[trainerRaw.toLowerCase()] || trainerRaw) : trainerRaw;
      var key = trkNorm_(name); if (TRK.ALIAS[key]) key = trkNorm_(TRK.ALIAS[key]);
      var date = g(row, 'actual date'), status = String(g(row, 'status') || '').trim();
      list.push({
        sheet: s.getName(), row: r + 1, sid: sid, topic: topic,
        date: trkIsDate_(date) ? Utilities.formatDate(date, TRK.TZ, 'dd/MM/yyyy') : String(date || ''),
        ym: trkYm_(date, g(row, 'month')),
        type: type.indexOf('internal') === 0 ? 'Internal' : 'External',
        cat: String(g(row, 'training category') || '').trim(), catKey: trkNorm_(g(row, 'training category')),
        trainer: name, trainerKey: key, status: status, done: TRK.DONE.indexOf(trkNorm_(status)) >= 0
      });
    }
  });
  return { list: list, sheets: sheets };
}

/* ── đếm theo rule ── */
function trkMatch_(s, t) {
  var r = t.rule;
  if (!s.done || !s.ym) return false;
  if (trkNorm_(s.type) !== r.type) return false;
  if (r.cat === 'product' && s.catKey !== 'product') return false;
  if (r.cat === '!product' && s.catKey === 'product') return false;
  if (t.trainerKey !== '*' && s.trainerKey !== t.trainerKey) return false;
  return true;
}
function trkCount_(list, targets, months) {
  var counts = {}, hits = {};
  targets.forEach(function (t) { counts[t.code] = {}; months.forEach(function (m) { counts[t.code][m] = 0; }); });
  list.forEach(function (s, i) {
    targets.forEach(function (t) {
      if (!trkMatch_(s, t) || counts[t.code][s.ym] == null) return;
      counts[t.code][s.ym]++; (hits[i] = hits[i] || []).push(t.code);
    });
  });
  return { counts: counts, hits: hits };
}

/* ── ghi Actual vào 3. Detail KPI ── */
function trkWrite_(sh, L, targets, counts, curYm) {
  var st = { cells: 0, codes: 0, locked: 0, formula: 0 }, unlock = false;
  try { unlock = PropertiesService.getScriptProperties().getProperty('TRK_UNLOCK') === '1'; } catch (e) {}
  targets.forEach(function (t) {
    var r = t.row, n = 0;
    L.months.forEach(function (m) {
      if (m > curYm) return;
      var c = L.aCol[m]; if (c == null) return;
      if (L.F[r][c]) { st.formula++; return; }                         // công thức trong file KPI được giữ
      var v = counts[t.code][m] || 0, cur = L.V[r][c];
      var empty = cur === '' || cur === null;
      if (!empty && Number(cur) === v) return;
      if (!empty && !unlock && trkLocked_(m)) { st.locked++; return; }  // tháng đã chốt: chỉ điền ô trống
      sh.getRange(r + 1, c + 1).setValue(v); L.V[r][c] = v; st.cells++; n++;
    });
    if (n) st.codes++;
  });
  return st;
}
function trkLocked_(ym) {
  var y = Math.floor(ym / 100), m = ym % 100 + 1; if (m > 12) { m = 1; y++; }
  return Utilities.formatDate(new Date(), TRK.TZ, 'yyyyMMddHHmm') >= String(y) + (m < 10 ? '0' : '') + m + '021600';
}

/* ── ② ghi tab "KPI TRAINING FY68" vào Training Master ── */
function trkWriteBack_(tss, sh, targets, res, L, curYm, S, force) {
  var name = TRK.OUT_PREFIX + L.fy, lc = Math.min(sh.getLastColumn(), 80);
  var V = targets.length ? sh.getRange(1, 1, sh.getLastRow(), lc).getValues() : [];
  var NC = 7 + L.months.length * 2, grid = [];
  function pad(a) { while (a.length < NC) a.push(''); return a; }
  function num(x) { return (x === '' || x === null || x === undefined || isNaN(Number(x))) ? '' : Number(x); }

  grid.push(pad(['MMH TRAINING ⇄ KPI ' + L.fy + ' · số liệu tự động từ TrainingKpiLink (không gõ tay vào tab này)']));
  grid.push(pad(['Cập nhật: ' + Utilities.formatDate(new Date(), TRK.TZ, 'dd/MM/yyyy HH:mm') + ' · nguồn: ' + S.sheets.join(', ') + ' · file KPI: ' + TRK.DETAIL]));
  grid.push(pad(['']));
  var hdr = ['KPI Code', 'Detail KPI', 'PIC', 'Rule đếm', L.fy + ' Target', L.fy + ' Actual', L.fy + ' %'];
  L.months.forEach(function (m) { hdr.push(m + ' Target'); });
  L.months.forEach(function (m) { hdr.push(m + ' Actual'); });
  grid.push(hdr);
  targets.forEach(function (t) {
    var r = t.row, row = [t.code, t.name, t.member, t.rule.text,
      L.fyT >= 0 ? num(V[r][L.fyT]) : '', L.fyA >= 0 ? num(V[r][L.fyA]) : '', L.fyP >= 0 ? num(V[r][L.fyP]) : ''];
    L.months.forEach(function (m) { row.push(L.tCol[m] != null ? num(V[r][L.tCol[m]]) : ''); });
    L.months.forEach(function (m) { row.push(L.aCol[m] != null ? num(V[r][L.aCol[m]]) : ''); });
    grid.push(row);
  });
  grid.push(pad(['']));
  grid.push(pad(['DANH SÁCH BUỔI ĐÀO TẠO TRONG ' + L.fy + ' (theo tháng ' + L.months[0] + ' → ' + L.months[L.months.length - 1] + ')']));
  var head2 = pad(['Session ID', 'Training Topic', 'Trainer', 'Training Type', 'Training Category', 'Actual Date', 'Month', 'Status', 'Tính vào mã KPI', 'Ghi chú', 'Sheet · dòng']);
  grid.push(head2);
  var fyList = [];
  S.list.forEach(function (s, i) { if (s.ym && L.months.indexOf(s.ym) >= 0) fyList.push([s, i]); });
  fyList.sort(function (a, b) { return a[0].ym - b[0].ym || String(a[0].date).localeCompare(String(b[0].date)); });
  fyList.forEach(function (p) {
    var s = p[0], hit = res.hits[p[1]] || [], note = '';
    if (!s.done) note = 'Chưa tính: Status = ' + (s.status || '(trống)') + ', chỉ đếm Completed';
    else if (!hit.length) note = 'Chưa tính: không khớp rule nào (Trainer ' + s.trainer + ' / ' + s.type + ' / ' + (s.cat || 'không Category') + ')';
    else if (s.ym > curYm) note = 'Tháng chưa tới';
    grid.push(pad([s.sid, s.topic, s.trainer, s.type, s.cat, s.date, s.ym, s.status, hit.join(', '), note, s.sheet + ' · ' + s.row]));
  });
  if (!fyList.length) grid.push(pad(['(chưa có buổi đào tạo nào trong ' + L.fy + ')']));

  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(grid.slice(2))));
  var props = PropertiesService.getScriptProperties();
  var out = tss.getSheetByName(name), isNew = !out;
  if (!out) out = tss.insertSheet(name);
  if (!force && !isNew && props.getProperty('TRK_OUT_HASH') === hash) return { tab: name, changed: false };

  out.clearContents();
  if (out.getMaxColumns() < NC) out.insertColumnsAfter(out.getMaxColumns(), NC - out.getMaxColumns());
  if (out.getMaxRows() < grid.length + 5) out.insertRowsAfter(out.getMaxRows(), grid.length + 5 - out.getMaxRows());
  out.getRange(1, 1, grid.length, NC).setValues(grid);
  try {
    var GREEN = '#004728', h2 = 4 + targets.length + 3;
    out.getRange(1, 1).setFontWeight('bold').setFontSize(13).setFontColor(GREEN);
    out.getRange(2, 1).setFontColor('#666666').setFontStyle('italic');
    out.getRange(4, 1, 1, NC).setFontWeight('bold').setBackground(GREEN).setFontColor('#FFFFFF').setWrap(true);
    out.getRange(h2 - 1, 1).setFontWeight('bold').setFontColor(GREEN);
    out.getRange(h2, 1, 1, 11).setFontWeight('bold').setBackground('#3a5caa').setFontColor('#FFFFFF');
    if (targets.length) out.getRange(5, 7, targets.length, 1).setNumberFormat('0%');
    out.setFrozenRows(4); out.setColumnWidth(2, 360); out.setColumnWidth(4, 260);
  } catch (e) {}
  props.setProperty('TRK_OUT_HASH', hash);
  return { tab: name, changed: true };
}

/* ── nhật ký chung với CRM (sheet _CRM_SYNC_LOG của file KPI) ── */
function trkLog_(kss, source, action, detail) {
  try {
    var s = kss.getSheetByName(TRK.LOG);
    if (!s) { s = kss.insertSheet(TRK.LOG); s.getRange(1, 1, 1, 4).setValues([['Thời điểm', 'Nguồn', 'Thao tác', 'Chi tiết']]).setFontWeight('bold'); try { s.hideSheet(); } catch (e) {} }
    s.insertRowAfter(1);
    s.getRange(2, 1, 1, 4).setValues([[Utilities.formatDate(new Date(), TRK.TZ, 'dd/MM/yyyy HH:mm:ss'), source, action, String(detail).slice(0, 500)]]);
    if (s.getLastRow() > 600) s.deleteRows(601, s.getLastRow() - 600);
  } catch (e) {}
}

/* ── (một lần, tuỳ chọn) điền lại công thức dòng tổng còn trống ở 3. Detail KPI ──
   Các dòng tổng (F2-00, F3-00, C1-00, C3-00, C5-00, C6-00, C7-00, C10-00, C12-00, C15-00,
   P2-04, P5-01, L2-00, L3-00, F6-01, F6-02) đang có công thức SUMIF / AVERAGEIF từ 202612,
   nhưng 3 ô Actual 202609 · 202610 · 202611 trống ⇒ dòng tổng và FY Actual thiếu 3 tháng đầu.
   Hàm này chỉ điền ô Actual TRỐNG của dòng tổng, chép đúng công thức của tháng bên cạnh. */
function trkRepairKpiRollups() {
  var sh = SpreadsheetApp.openById(TRK.KPI_ID).getSheetByName(TRK.DETAIL);
  var L = trkLayout_(sh), fixed = [];
  Object.keys(L.rows).forEach(function (code) {
    var r = L.rows[code], tpl = null, empties = [];
    L.months.forEach(function (m) {
      var c = L.aCol[m], f = L.F[r][c];
      if (f && /(SUMIF|AVERAGEIF)\(\$C:\$C/i.test(f)) { if (!tpl) tpl = c; }
      else if (!f && (L.V[r][c] === '' || L.V[r][c] === null)) empties.push(c);
    });
    if (tpl == null || !empties.length) return;
    var r1c1 = sh.getRange(r + 1, tpl + 1).getFormulaR1C1();
    empties.forEach(function (c) { sh.getRange(r + 1, c + 1).setFormulaR1C1(r1c1); });
    fixed.push(code + ' (' + empties.length + ' ô)');
  });
  var msg = fixed.length ? 'Đã điền công thức dòng tổng: ' + fixed.join(', ') : 'Không có dòng tổng nào thiếu công thức.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

/* ── tiện ích ── */
function trkIsDate_(d) { return Object.prototype.toString.call(d) === '[object Date]'; }
function trkNorm_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
}
function trkYm_(d, month) {
  if (trkIsDate_(d) && !isNaN(d.getTime())) return Number(Utilities.formatDate(d, TRK.TZ, 'yyyyMM'));
  var s = String(d || '').trim(), x;
  if ((x = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s))) return Number(x[3]) * 100 + Number(x[2]);
  if ((x = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(s))) return Number(x[1]) * 100 + Number(x[2]);
  var n = String(month === null || month === undefined ? '' : month).replace(/\.0+$/, '').replace(/\D/g, '');
  return /^20\d{4}$/.test(n) ? Number(n) : 0;
}