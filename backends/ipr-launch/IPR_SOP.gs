/* ══════════════════════════════════════════════════════════════════════════════════════════
 * IPR_SOP.gs v3 — IPR-01EF Launch Tracker (MMH SOP · ra mắt sản phẩm mới) — bố cục theo prototype v4
 *
 *   Tab đặt tên theo việc:  Start here · VIEW (xem) · UPDATE (ghi nhận) · APPROVE (duyệt) · SETUP · FILES
 *   Start here            : ai làm gì, vào tab nào, điền cột nào; quy tắc chặn; nghĩa các trạng thái
 *   VIEW · Overview       : tiến độ chung, 4 phase + 11 bước (thanh tiến độ tô theo ô), việc tồn đọng, ai đang làm gì, hạn sắp tới
 *   VIEW · Timeline       : kế hoạch vs thực tế, xem theo Week / Month / Quarter / Year
 *   UPDATE · Tasks        : owner giao việc, PIC cập nhật, người duyệt ghi ngày duyệt — dải màu trên cột cho biết ai điền
 *   UPDATE · Samples / Surveys / Sales : nhật ký mẫu, khảo sát, doanh số (nhiều dòng, công thức tự chạy)
 *   APPROVE · Phases      : tiêu chí tự kiểm, General Director quyết định, lịch sử duyệt + email
 *   SETUP · Team & plan   : người + email, mốc kế hoạch, danh sách chọn · FILES · Documents : bản đồ tài liệu
 *   _calc (ẩn)            : bảng tính trung gian
 *
 * - Dựng qua menu "IPR Launch ▸ Update / rebuild tracker" (không dựng trong onOpen vì giới hạn 30 giây).
 * - Dựng lại GIỮ dữ liệu đã nhập ở các tab UPDATE / APPROVE / SETUP / FILES (lần đầu từ v2 ⇒ nạp dữ liệu IPR-01EF).
 * - Email: luôn qua mmhMail_ (MMH_MailDomain.gs); chỉ gửi khi người dùng bấm menu (hoặc bật nhắc việc hằng tuần).
 * - Màu theo prototype v4 (navy 2C4A5E · xanh 5A84A6 · xám D8DEE4 · trạng thái xanh lá / xanh / vàng / đỏ nâu / xám).
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

var IPR_BUILD = 'v3.0';
var IPR_META = 'mmh_ipr_sop_build';
var T = {
  start: 'Start here', ov: 'VIEW · Overview', tl: 'VIEW · Timeline', tasks: 'UPDATE · Tasks', smp: 'UPDATE · Samples',
  sv: 'UPDATE · Surveys', sales: 'UPDATE · Sales', appr: 'APPROVE · Phases', setup: 'SETUP · Team & plan', files: 'FILES · Documents', calc: '_calc'
};
var IPR_TABS = [T.start, T.ov, T.tl, T.tasks, T.smp, T.sv, T.sales, T.appr, T.setup, T.files, T.calc];
var LEGACY = ['Launch Flow', 'Tasks', 'Gates', 'Feasibility', 'Launch Plan', 'Samples', 'Results', 'Documents', 'Engine',
  '00_Tổng quan', '01_Tiến độ', '02_Khả thi', '03_Kế hoạch', '04_Mẫu & phản hồi', '05_Đánh giá', '06_Tài liệu'];
var FONT = 'Arial';
var K = {
  navy: '#2C4A5E', acc: '#5A84A6', ink: '#1F2933', mut: '#5F6B76', line: '#D8DEE4', grid: '#E3E8EC', head: '#EEF2F5', headAuto: '#E6EAEE',
  auto: '#F7F9FA', band: '#DCE6EE', white: '#FFFFFF', link: '#3A6A92', gold: '#C9A24A', setG: '#8C98A4', filesG: '#9FB4C4',
  doneBg: '#E3EFEC', doneFg: '#2F6F66', progBg: '#E3ECF5', progFg: '#2C4A5E', waitBg: '#FBF1D9', waitFg: '#7A5B12',
  badBg: '#F5E3DE', badFg: '#8A4A3A', noneBg: '#F0F2F4', noneFg: '#5F6B76',
  bD: '#2F6F66', bP: '#5A84A6', bO: '#A0523F', bB: '#E5B5A8', bC: '#E2CF97', bN: '#C3CCD4', bT: '#9FB4C4', bE: '#E6EBEF', today: '#FBF1D9'
};
var WHO = { owner: ['OWNER FILLS', '#E3ECF5', '#2C4A5E'], pic: ['PIC FILLS', '#E3EFEC', '#2F6F66'], appr: ['APPROVER FILLS', '#FBF1D9', '#7A5B12'], auto: ['AUTO', '#F0F2F4', '#5F6B76'] };
var ST = {
  'Done': [K.doneBg, K.doneFg], 'In progress': [K.progBg, K.progFg], 'Waiting approval': [K.waitBg, K.waitFg], 'To confirm': [K.waitBg, K.waitFg],
  'Not started': [K.noneBg, K.noneFg], 'On hold': [K.noneBg, K.noneFg], 'Cancelled': [K.noneBg, K.noneFg],
  'Overdue': [K.badBg, K.badFg], 'Blocked': [K.badBg, K.badFg], 'Phase locked': [K.badBg, K.badFg], 'No PIC': [K.waitBg, K.waitFg], 'Missing file': [K.waitBg, K.waitFg],
  'Approved': [K.doneBg, K.doneFg], 'Returned': [K.badBg, K.badFg], 'Ready to submit': [K.progBg, K.progFg], 'Not submitted': [K.noneBg, K.noneFg],
  'Submitted · criteria missing': [K.badBg, K.badFg], 'Met': [K.doneBg, K.doneFg], 'Not met': [K.badBg, K.badFg],
  'OPEN': [K.doneBg, K.doneFg], 'CLOSED': [K.badBg, K.badFg], 'Open': [K.doneBg, K.doneFg], 'Closed': [K.waitBg, K.waitFg], 'Report done': [K.doneBg, K.doneFg],
  'Draft': [K.noneBg, K.noneFg], 'Questions approved': [K.progBg, K.progFg], 'Feedback received': [K.doneBg, K.doneFg], 'Follow-up overdue': [K.badBg, K.badFg],
  'Sent · waiting feedback': [K.progBg, K.progFg], 'Approved · to send': [K.progBg, K.progFg], 'Waiting approval ': [K.waitBg, K.waitFg]
};
var STATUSES = ['Not started', 'In progress', 'Waiting approval', 'Done', 'On hold', 'Cancelled', 'To confirm'];
var PHASES = [['Feasibility', 'Go / No-go'], ['Launch planning', 'Launch plan'], ['Launch execution', 'Launch completed'], ['Measure & optimize', 'Project closure']];
var STEPS = [['Product & market research', 1], ['Competitors, pricing & registration', 1], ['Positioning & marketing plan', 2], ['Marketing materials', 2], ['Training', 2],
  ['Product samples', 3], ['Launch promotion', 3], ['Online & events', 3], ['Customer feedback & surveys', 4], ['Sales follow-up', 4], ['Post-launch review', 4]];
var ROLES = { hsm: 'Head of Sales & Marketing', gd: 'General Director', ptl: 'Product Team Leader', mkt: 'Marketing', sales: 'Sales team', bo: 'Back Office', pt: 'Product team' };

/* ── Bố cục cố định (công thức tham chiếu các vị trí này) ───────────────────────────────── */
var TK = { r0: 8, n: 74, r1: 81 };      // UPDATE · Tasks: dữ liệu từ hàng 8 (mặc định 74 hàng, tự giãn khi có thêm)
var TC = { no: 2, step: 3, task: 4, pic: 5, ab: 6, dep: 7, nf: 8, pe: 9, st: 10, ae: 11, ev: 12, ao: 13, flag: 14, late: 15, bs: 16, be: 17, note: 18, chk: 19, sent: 20,
  ph: 21, open: 22, unl: 23, cat: 24, pend: 25, rank: 26, dkey: 27, bstart: 28, bend: 29, last: 29 };
var TK_IN = [TC.no, TC.step, TC.task, TC.pic, TC.ab, TC.dep, TC.nf, TC.pe, TC.st, TC.ae, TC.ev, TC.ao, TC.bs, TC.be, TC.note, TC.sent];
var SU = { team0: 7, teamN: 10, plan0: 7, step0: 21, list0: 21, listN: 10 };  // SETUP
var AP = { ph0: 7, cr0: 14, hist0: 39 };   // APPROVE
var SM = { r0: 16, n: 100 };              // Samples log
var SV = { r0: 9, n: 30, f0: 43 };        // Surveys register + findings
var SA = { r0: 8, n: 100 };               // Sales log
var TL = { r0: 10, g0: 11, np: 24 };      // Timeline

function fFile_(id) { return 'https://drive.google.com/file/d/' + id + '/view'; }
function fDir_(id) { return 'https://drive.google.com/drive/folders/' + id; }
var L = {
  dirLaunch: fDir_('1DqQxn_4qPkhOyutfnS2pqmXxd87IhHsx'), dirMkt: fDir_('14KtQ2THtDba5z5CDlIvd3CcK8RF6bWou'), dirTrain: fDir_('1JdcGV8NRWw1UxPgv5BkDa0lSIrPgLzKs'),
  dirResearch: fDir_('1DQ31H6f32RtgY0NA0a9Ugirv_Uy71kKY'), dirProject: fDir_('1BMtT3givsT7UuGRVqee9_gEAAjCmKEDk'), dirFlyer: fDir_('1uhHzcyUFybfBgCb0onCiZ72mKrEMDvAX'),
  meet0805: 'https://docs.google.com/document/d/1ZgrnhkulSoh0k22shAaD6giCw8dfaVs5lOG-9H1O-FU/edit',
  overview: fFile_('1ie7k09xDd78GBnIO8HDI1fjliPFdfoEh'), infoSum: fFile_('1zhtlADRYl6ycCkf6KXSb5eXhzaWnekFa'), infoFinal: fFile_('1u87sAryx0id5qAV61zyu3CXl5LKMBISl'),
  compete: fFile_('12jci5TSfk-oxqPi_cRJ5euktubg1zux8'), research: fFile_('1115sZrK3x1WpPHW2zSQp9qmTUCrKjzkd'), researchSum: fFile_('1E44CkEJbwwB9UOOlFh1HgjfRfOh51Q1g'),
  catalogue: fFile_('15Md-Cy-tOCq0euP8u3kskUZIBt8LrMAV'), catTrans: 'https://docs.google.com/document/d/1qxfsrhVirdVMQG4klCzybH4K5DLnb9i2RcqKe62gFII/edit',
  clinical: fFile_('1rK1ddDa-h26e5jALPQZmOBeI6DmuuYZa'), ifu: fFile_('18rgqQ0NjN1u92h3eq9O37wiBArDN4nTB'), tskt: fFile_('17_0ahTag5F6RmpN1PuSrAk_xIlMguVBx'),
  brochureVN: fFile_('1PJaqtabM8GGhA1bOSHYZci01VJ5aLSkY'), img: fFile_('1pmLCp0Hj-_QRjQnyeQ-b1Pz29HrvLLXm'), trainNPP: fFile_('1BWN8C4OiL7eD4y3uddzSOFjUySrptKRm'),
  trainInt: fFile_('1h3pyRU2VFGn5Q52fiA1teGGhnbbCWHPp'), promo: fFile_('1iYgIjhYeAHa4qIvCtOE7b9T1XHIrcKmY'),
  form: 'https://docs.google.com/forms/d/1WY66nK5_9J5ZdM1MUuYiLzhqThYxE1RQHduaNrSdZrI/edit',
  formResp: 'https://docs.google.com/spreadsheets/d/1bjVPE8MBM_DWsd-rARIS2_042APwSfYc3CL_BrCqlIM/edit',
  shapeDoc: fFile_('1hfF4uX4-ln_qLKVbzylT82PgAu5gNjt-'), shapeRes: fFile_('1aTBjdfCHumQsAMVgSSZKtebNJlMVnU6u'),
  survey2: 'https://docs.google.com/spreadsheets/d/1RGBSYSjaopF78oaW_XlEInaw4PqsAL5VTW2NOzJ-32c/edit',
  maniPdf: 'https://www.mani.co.jp/en/pdf/IPR-01EF.pdf', maniReport: 'https://www.mani.co.jp/en/pdf/dental_04_14_report.pdf', maniIfu: 'https://www.mani.co.jp/en/pdf/6DIA-BURS.pdf'
};

/* ══ Menu ═════════════════════════════════════════════════════════════════════════════════ */
function onOpen(e) {
  try {
    SpreadsheetApp.getUi().createMenu('IPR Launch')
      .addItem('Go to Start here', 'iprGoStart')
      .addSeparator()
      .addItem('Add a task row below the selected row', 'iprAddTaskRow')
      .addItem('Send assignment emails (new PICs)', 'iprSendAssignments')
      .addItem('Submit selected task for approval', 'iprSubmitTask')
      .addItem('Approve selected task', 'iprApproveTask')
      .addSeparator()
      .addItem('Submit a phase for approval', 'iprSubmitPhase')
      .addItem('Review & decide a phase (General Director)', 'iprReviewPhase')
      .addSeparator()
      .addItem('Send weekly reminder now', 'iprWeeklyReminder')
      .addItem('Turn weekly reminder on (Monday 08:30)', 'iprReminderOn')
      .addItem('Turn weekly reminder off', 'iprReminderOff')
      .addSeparator()
      .addItem('Update / rebuild tracker (keeps entered data)', 'iprRebuildMenu')
      .addToUi();
  } catch (_) {}
  try {
    var ss = SpreadsheetApp.getActive();
    if (iprVersion_(ss) !== IPR_BUILD)
      ss.toast('Có bản tracker mới (' + IPR_BUILD + '). Bấm menu IPR Launch ▸ Update / rebuild tracker để dựng (dữ liệu đã nhập được giữ).', 'MMH', 15);
  } catch (_) {}
}
function iprGoStart() { var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(T.start); if (sh) ss.setActiveSheet(sh); }

function iprRebuildMenu() {
  var ui = SpreadsheetApp.getUi(), ss = SpreadsheetApp.getActive();
  if (iprVersion_(ss) === IPR_BUILD) {
    var r = ui.alert('Rebuild', 'Dựng lại toàn bộ tracker (chỉ cần khi bố cục bị hỏng). Dữ liệu đã nhập ở các tab UPDATE, APPROVE, SETUP, FILES được giữ.\n\nTiếp tục?', ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
  }
  var errs = iprBuild_(ss);
  if (errs.length) ui.alert('Đã dựng xong nhưng có ' + errs.length + ' phần lỗi:\n\n' + errs.join('\n'));
  else ss.toast('Tracker đã ở bản ' + IPR_BUILD + '.', 'MMH', 6);
}
function iprVersion_(ss) { var m = ss.createDeveloperMetadataFinder().withKey(IPR_META).find(); return m.length ? m[0].getValue() : ''; }

/* ══ Build ════════════════════════════════════════════════════════════════════════════════ */
var SNAP = null;
function iprBuild_(ss) {
  var lock = null, errs = [];
  try { lock = LockService.getDocumentLock(); lock.waitLock(25000); } catch (_) { lock = null; }
  try {
    try { if (ss.getSpreadsheetLocale() !== 'en_GB') ss.setSpreadsheetLocale('en_GB'); } catch (_) {}
    var v3 = /^v3/.test(iprVersion_(ss));
    SNAP = v3 ? snapAll_(ss) : null;
    IPR_TABS.forEach(function (n) { resetSheet_(ss, n); });
    IPR_TABS.forEach(function (n, i) { ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1); });
    [['setup', buildSetup_], ['tasks', buildTasks_], ['approve', buildApprove_], ['calc', buildCalc_], ['samples', buildSamples_], ['surveys', buildSurveys_],
      ['sales', buildSales_], ['files', buildFiles_], ['timeline', buildTimeline_], ['overview', buildOverview_], ['start', buildStart_]].forEach(function (b) {
      try { b[1](ss); } catch (e) { errs.push(b[0] + ': ' + (e && e.message ? e.message : e)); }
    });
    try { ss.getSheetByName(T.calc).hideSheet(); } catch (_) {}
    // tab v2 do app cũ tạo ⇒ xoá; tab dữ liệu gốc 2025 ⇒ ẩn
    LEGACY.forEach(function (n) { var s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) try { ss.deleteSheet(s); } catch (_) {} });
    ss.getSheets().forEach(function (s) { if (IPR_TABS.indexOf(s.getName()) < 0 && !s.isSheetHidden()) try { s.hideSheet(); } catch (_) {} });
    ss.createDeveloperMetadataFinder().withKey(IPR_META).find().forEach(function (m) { m.remove(); });
    ss.addDeveloperMetadata(IPR_META, IPR_BUILD);
    ss.setActiveSheet(ss.getSheetByName(T.start));
  } finally {
    if (lock) try { lock.releaseLock(); } catch (_) {}
  }
  return errs;
}
function resetSheet_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return ss.insertSheet(name);
  sh.showSheet();
  try { sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); }); } catch (_) {}
  try { sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) { p.remove(); }); } catch (_) {}
  sh.setFrozenRows(0); sh.setFrozenColumns(0);
  try { if (sh.getMaxColumns() > 1) sh.showColumns(1, sh.getMaxColumns()); sh.showRows(1, sh.getMaxRows()); } catch (_) {}
  var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  all.breakApart(); all.clearDataValidations(); all.clearNote(); all.clear();
  sh.clearConditionalFormatRules();
  try { sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).getBandings().forEach(function (b) { b.remove(); }); } catch (_) {}
  return sh;
}

/* ── Giữ dữ liệu đã nhập (rebuild v3 → v3) ─────────────────────────────────────────────── */
function grab_(ss, tab, r0, c0, nCols, lastRowHint) {
  var sh = ss.getSheetByName(tab); if (!sh) return null;
  var last = sh.getLastRow(); if (last < r0) return [];
  var w = Math.min(nCols, sh.getMaxColumns() - c0 + 1); if (w < 1) return [];
  var n = last - r0 + 1, rg = sh.getRange(r0, c0, n, w), v = rg.getValues(), f = rg.getFormulas();
  return v.map(function (row, i) { var o = row.map(function (x, j) { return f[i][j] ? f[i][j] : x; }); while (o.length < nCols) o.push(''); return o; });
}
function snapAll_(ss) {
  var s = {};
  s.tasks = grab_(ss, T.tasks, TK.r0, 1, TC.last);
  s.appr = grab_(ss, T.appr, AP.ph0, 1, 15); if (s.appr) s.appr = s.appr.slice(0, 4);
  s.crit = grab_(ss, T.appr, AP.cr0, 1, 10);
  s.hist = grab_(ss, T.appr, AP.hist0, 1, 8);
  s.smp = grab_(ss, T.smp, SM.r0, 1, 14);
  s.sv = grab_(ss, T.sv, SV.r0, 1, 15); if (s.sv) s.sv = s.sv.slice(0, SV.n);
  s.svf = grab_(ss, T.sv, SV.f0, 1, 5);
  s.sales = grab_(ss, T.sales, SA.r0, 1, 8);
  s.team = grab_(ss, T.setup, SU.team0, 1, 7); if (s.team) s.team = s.team.slice(0, SU.teamN);
  s.plan = grab_(ss, T.setup, SU.plan0, 8, 2); if (s.plan) s.plan = s.plan.slice(0, 10);
  s.lists = grab_(ss, T.setup, SU.list0, 1, 13); if (s.lists) s.lists = s.lists.slice(0, SU.listN);
  s.files = grab_(ss, T.files, 7, 1, 6);
  var tl = ss.getSheetByName(T.tl); if (tl) s.tlCtl = [tl.getRange('C5').getValue(), tl.getRange('E5').getValue()];
  return s;
}
function nonEmpty_(rows, keyIdx) { return (rows || []).filter(function (r) { return keyIdx.some(function (i) { return r[i] !== '' && r[i] !== null; }); }); }

/* ══ Tiện ích ═════════════════════════════════════════════════════════════════════════════ */
function D_(s) { if (!s) return ''; var p = String(s).split('/'); var y = +p[2]; if (y < 100) y += 2000; return new Date(y, +p[1] - 1, +p[0]); }
function CL_(c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
function A1_(r, c) { return CL_(c) + r; }
function q_(tab) { return "'" + tab + "'!"; }
function hl_(url, label) { return url ? '=HYPERLINK("' + url + '","' + String(label).replace(/"/g, '""') + '")' : (label || ''); }
function fill2_(rows, n) { return rows.map(function (r) { r = r.slice(0, n); while (r.length < n) r.push(''); return r; }); }

function prep_(ss, name, widths, tab, rows) {
  var sh = ss.getSheetByName(name), maxCols = widths.length + 1;
  if (sh.getMaxColumns() > maxCols) sh.deleteColumns(maxCols + 1, sh.getMaxColumns() - maxCols);
  else if (sh.getMaxColumns() < maxCols) sh.insertColumnsAfter(sh.getMaxColumns(), maxCols - sh.getMaxColumns());
  if (rows) { if (sh.getMaxRows() > rows) sh.deleteRows(rows + 1, sh.getMaxRows() - rows); else if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows()); }
  sh.setColumnWidth(1, 24);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 2, w); });
  sh.getRange(1, 1, sh.getMaxRows(), maxCols).setFontFamily(FONT).setFontSize(10).setFontColor(K.ink).setVerticalAlignment('middle');
  sh.setRowHeights(1, sh.getMaxRows(), 22);
  sh.setHiddenGridlines(true);
  if (tab) sh.setTabColor(tab);
  return sh;
}
/* Tiêu đề: B1 tên tab · B2 mục đích · hàng 3: AI CẬP NHẬT / ĐIỀN GÌ (dải xám, kẻ navy dưới) */
function title_(sh, title, purpose, who, what, n) {
  sh.setRowHeight(1, 36); sh.setRowHeight(2, 20); sh.setRowHeight(3, 26); sh.setRowHeight(4, 10);
  sh.getRange(1, 2).setValue(title).setFontSize(18).setFontWeight('bold').setFontColor(K.navy);
  sh.getRange(2, 2).setValue(purpose).setFontColor(K.mut);
  var r = sh.getRange(3, 2, 1, n).merge();
  r.setValue('WHO UPDATES THIS TAB:  ' + who + '          WHAT TO FILL:  ' + what)
    .setBackground(K.auto).setFontSize(9.5).setFontWeight('bold').setFontColor(K.ink)
    .setBorder(null, null, true, null, null, null, K.navy, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}
function section_(sh, r, c, n, text, right) {
  sh.getRange(r, c, 1, n).setBorder(null, null, true, null, null, null, K.line, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(r, c).setValue(String(text).toUpperCase()).setFontSize(10.5).setFontWeight('bold').setFontColor(K.navy);
  if (right) sh.getRange(r, c + n - 1).setValue(right).setFontSize(9).setFontColor(K.mut).setHorizontalAlignment('right');
  sh.setRowHeight(r, 26);
}
/* dải "ai điền" trên đầu cột: groups = [[colStart, span, kind]] */
function ribbon_(sh, r, groups) {
  groups.forEach(function (g) {
    var w = WHO[g[2]], rg = sh.getRange(r, g[0], 1, g[1]);
    if (g[1] > 1) rg.merge();
    rg.setValue(g[3] || w[0]).setBackground(w[1]).setFontColor(w[2]).setFontSize(8.5).setFontWeight('bold').setHorizontalAlignment('center')
      .setBorder(true, true, true, true, null, null, K.white, SpreadsheetApp.BorderStyle.SOLID);
  });
  sh.setRowHeight(r, 20);
}
/* tiêu đề bảng: cột auto nền xám đậm hơn */
function header_(sh, r, c0, names, autoCols) {
  var rg = sh.getRange(r, c0, 1, names.length);
  rg.setValues([names]).setFontWeight('bold').setFontColor(K.navy).setBackground(K.head).setWrap(true).setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, K.grid, SpreadsheetApp.BorderStyle.SOLID);
  (autoCols || []).forEach(function (c) { sh.getRange(r, c).setBackground(K.headAuto).setFontColor(K.mut); });
  sh.setRowHeight(r, 34);
}
function grid_(sh, r, c, nr, nc) { sh.getRange(r, c, nr, nc).setBorder(true, true, true, true, true, true, K.grid, SpreadsheetApp.BorderStyle.SOLID); }
function autoCols_(sh, r, nr, cols) { cols.forEach(function (c) { sh.getRange(r, c, nr, 1).setBackground(K.auto).setFontColor(K.mut); }); }
function band_(sh, r, c, n, text) {
  var rg = sh.getRange(r, c, 1, n);
  rg.setBackground(K.band).setFontWeight('bold').setFontColor(K.navy);
  return rg;
}
/* CF: ô có chữ đúng bằng trạng thái ⇒ tô màu pill */
function statusCF_(sh, a1s, keys) {
  var rules = sh.getConditionalFormatRules(), rgs = a1s.map(function (a) { return sh.getRange(a); });
  (keys || Object.keys(ST)).forEach(function (k) {
    if (!ST[k]) return;
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(ST[k][0]).setFontColor(ST[k][1]).setBold(true).setRanges(rgs).build());
  });
  sh.setConditionalFormatRules(rules);
}
function cfFormula_(sh, a1s, formula, bg, fg, bold) {
  var rules = sh.getConditionalFormatRules();
  var b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setRanges(a1s.map(function (a) { return sh.getRange(a); }));
  if (bg) b.setBackground(bg); if (fg) b.setFontColor(fg); if (bold) b.setBold(true);
  rules.push(b.build()); sh.setConditionalFormatRules(rules);
}
function protectWarn_(sh, rangeOrNull) {
  try {
    var p = rangeOrNull ? rangeOrNull.protect() : sh.protect();
    p.setDescription('Calculated by the tracker — do not edit').setWarningOnly(true);
    return p;
  } catch (_) { return null; }
}
function dvList_(vals, strict) { return SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(!strict).build(); }
function dvRange_(rg, strict) { return SpreadsheetApp.newDataValidation().requireValueInRange(rg, true).setAllowInvalid(!strict).build(); }
function dvCustom_(f, help) { return SpreadsheetApp.newDataValidation().requireFormulaSatisfied(f).setAllowInvalid(false).setHelpText(help).build(); }
function dvDate_() { return SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText('Enter a date (dd/mm/yyyy).').build(); }

/* ══ Dữ liệu IPR-01EF (lần dựng đầu) ═════════════════════════════════════════════════════ */
function taskSeed_() {
  var H = ROLES, A = 'Approval recorded when the tracker was set up (2025 data). ';
  // No, Step, Task, PIC, Approval by, Depends on, Needs file, Plan end, Status, Actual end, [evidence label, key], Approved on, Start, Baseline end, Notes
  return [
    ['1.1', 'Product & market research', 'Tổng quan về kỹ thuật IPR', H.ptl, '', '', 'No', '14/05/2025', 'Done', '14/05/2025', ['Tổng quan về IPR.pdf', 'overview'], '', '10/05/2025', '14/05/2025', ''],
    ['1.2', 'Product & market research', 'Tổng hợp thông tin sản phẩm IPR-01EF (thông số, chỉ định, IFU)', H.ptl, '', '1.1', 'Yes', '16/05/2025', 'Done', '16/05/2025', ['Thông tin IPR 01 EF _Final.pdf', 'infoFinal'], '', '09/05/2025', '16/05/2025', ''],
    ['1.3', 'Product & market research', 'Khảo sát 11 phòng khám về thói quen IPR', H.ptl, '', '', 'Yes', '23/05/2025', 'Done', '23/05/2025', ['IPR _ Nghiên cứu thị trường.pdf', 'research'], '', '05/05/2025', '23/05/2025', ''],
    ['1.4', 'Product & market research', 'Tổng hợp nghiên cứu thị trường & kết luận định vị', H.ptl, '', '1.3', 'Yes', '03/07/2025', 'Done', '03/07/2025', ['IPR_Tổng hợp nghiên cứu.pdf', 'researchSum'], '', '09/05/2025', '03/07/2025', ''],
    ['1.5', 'Competitors, pricing & registration', 'Phân tích đối thủ & phân khúc giá', H.ptl, '', '', 'Yes', '23/05/2025', 'Done', '23/05/2025', ['IPR_Sản phẩm Vs định vị cạnh tranh.pdf', 'compete'], '', '05/05/2025', '23/05/2025', ''],
    ['1.6', 'Competitors, pricing & registration', 'Thu thập thông tin từ đại lý', H.sales, '', '', 'No', '27/06/2025', 'Done', '27/06/2025', null, '', '', '27/06/2025', ''],
    ['1.7', 'Competitors, pricing & registration', 'Chốt giá kênh phân phối: giá lẻ 250.000 đ / vỉ 5 mũi', H.ptl, H.gd, '1.5', 'Yes', '31/07/2025', 'Done', '31/07/2025', ['[link: price approval]', ''], '31/07/2025', '23/05/2025', '31/07/2025', A + 'Replace [link] with the approval file.'],
    ['1.8', 'Competitors, pricing & registration', 'Xác nhận đăng ký sản phẩm / giấy phép nhập khẩu', H.bo, '', '', 'Yes', '27/06/2025', 'Done', '27/06/2025', ['[link: registration document]', ''], '', '05/05/2025', '27/06/2025', 'Added at setup — confirm which document applies to IPR-01EF.'],
    ['2.1', 'Positioning & marketing plan', 'Kế hoạch marketing: định vị, thông điệp, giá, kênh', H.ptl, H.gd, '1.4', 'Yes', '30/06/2025', 'Done', '30/06/2025', ['[link: marketing plan]', ''], '30/06/2025', '20/05/2025', '30/06/2025', A + 'Old plan had STP / 4P only.'],
    ['2.2', 'Positioning & marketing plan', 'Khảo sát customer insight trước ra mắt', H.ptl, '', '', 'No', '10/07/2025', 'Not started', '', null, '', '03/07/2025', '10/07/2025', 'Old plan: 0%.'],
    ['2.3', 'Positioning & marketing plan', 'Kế hoạch nội dung online: mini game', H.mkt, '', '', 'No', '24/06/2025', 'Done', '24/06/2025', null, '', '', '24/06/2025', ''],
    ['2.4', 'Marketing materials', 'Dịch nội dung flyer', H.ptl, '', '1.2', 'No', '10/05/2025', 'Done', '10/05/2025', ['Thư mục bản dịch flyer', 'dirFlyer'], '', '09/05/2025', '10/05/2025', ''],
    ['2.5', 'Marketing materials', 'Thiết kế flyer', H.mkt, '', '2.4', 'Yes', '19/05/2025', 'Done', '19/05/2025', ['IPR-01EF Brochure VN.pdf', 'brochureVN'], '', '10/05/2025', '19/05/2025', ''],
    ['2.6', 'Marketing materials', 'In flyer — 1.000 bản', H.mkt, '', '2.5', 'No', '26/06/2025', 'Done', '26/06/2025', null, '', '', '26/06/2025', ''],
    ['2.7', 'Marketing materials', 'Thiết kế standee', H.mkt, '', '', 'No', '04/07/2025', 'Done', '04/07/2025', null, '', '16/06/2025', '04/07/2025', 'Design file not found in MKT Material.'],
    ['2.8', 'Marketing materials', 'In standee', H.mkt, '', '2.7', 'No', '09/07/2025', 'Not started', '', null, '', '', '09/07/2025', 'Old plan: 0%. Print or cancel?'],
    ['2.9', 'Marketing materials', 'Giá cắm mũi khoan in laser logo MANI, DIA-BURS', H.mkt, '', '', 'No', '27/06/2025', 'Done', '27/06/2025', null, '', '', '27/06/2025', ''],
    ['2.10', 'Training', 'Đào tạo nội bộ', H.ptl, '', '1.2', 'No', '18/06/2025', 'Done', '18/06/2025', null, '', '', '18/06/2025', ''],
    ['2.11', 'Training', 'Đào tạo nhà phân phối', H.ptl, '', '2.10', 'Yes', '25/07/2025', 'Done', '25/07/2025', ['Training _ IPR 01 EF _ 25.07.25.pptx', 'trainNPP'], '', '', '25/07/2025', ''],
    ['3.1', 'Product samples', 'Gửi mẫu dùng thử cho 21 phòng khám', H.hsm, '', '1.8', 'No', '07/07/2025', 'Done', '07/07/2025', null, '', '30/06/2025', '07/07/2025', 'Shipments in UPDATE · Samples.'],
    ['3.2', 'Launch promotion', 'Khuyến mại ra mắt: mua 3 hộp IPR tặng 1 hộp Glide Finder', H.hsm, H.gd, '2.11', 'Yes', '10/08/2025', 'Done', '10/08/2025', ['Thông báo khuyến mại 01/08/2025', 'promo'], '31/07/2025', '01/08/2025', '10/08/2025', A + 'Notice 01/08/2025; old plan said 04–25/08/2025.'],
    ['3.3', 'Online & events', 'Mở bán online', H.mkt, '', '3.2', 'No', '04/08/2025', 'To confirm', '', null, '', '', '04/08/2025', 'Old plan: 0%.'],
    ['3.4', 'Online & events', 'Khuyến mại online', H.mkt, '', '3.2', 'No', '04/08/2025', 'To confirm', '', null, '', '', '04/08/2025', 'Old plan: 0%.'],
    ['3.5', 'Online & events', 'Bài đăng sau ra mắt — 4 bài', H.mkt, '', '', 'No', '', 'To confirm', '', null, '', '', '', ''],
    ['3.6', 'Online & events', 'Giới thiệu sản phẩm tại workshop chỉnh nha', H.hsm, '', '', 'No', '', 'To confirm', '', null, '', '', '', 'No date or result recorded.'],
    ['4.1', 'Customer feedback & surveys', 'Khảo sát sau dùng thử (Google Form)', H.ptl, '', '3.1', 'No', '25/08/2025', 'Done', '25/08/2025', ['IPR Surveys _MMH', 'formResp'], '', '30/06/2025', '25/08/2025', '3 responses.'],
    ['4.2', 'Customer feedback & surveys', 'Khảo sát hình dạng mũi IPR mới cho MANI', H.ptl, '', '', 'Yes', '23/09/2026', 'Done', '23/09/2026', ['202609_IPR Survey_Results.xlsx', 'shapeRes'], '', '22/09/2026', '23/09/2026', '8 clinics.'],
    ['4.3', 'Customer feedback & surveys', 'Khảo sát khách hàng lần 2', '', '', '4.1', 'No', '', 'Not started', '', null, '', '', '', 'No PIC yet.'],
    ['4.4', 'Sales follow-up', 'Đào tạo nội bộ bổ sung về IPR-01EF', H.pt, '', '', 'No', '31/12/2025', 'Done', '31/12/2025', ['InternalTraining _ IPR 01 EF _ 31.12.25.pptx', 'trainInt'], '', '', '31/12/2025', ''],
    ['4.5', 'Sales follow-up', 'Theo dõi doanh số theo tháng, theo nhà phân phối', H.ptl, H.hsm, '3.2', 'Yes', '30/11/2026', 'In progress', '', null, '', '01/08/2025', '30/11/2026', 'UPDATE · Sales is still empty.'],
    ['4.6', 'Post-launch review', 'Họp đánh giá sau ra mắt: kết quả, bài học, cải tiến', H.hsm, H.gd, '4.3, 4.5', 'Yes', '15/12/2026', 'Not started', '', null, '', '01/12/2026', '15/12/2026', '']
  ];
}
function docSeed_() {
  // phase (0 = folders), type, document, purpose, link key
  return [
    [0, 'Folder', 'Thư mục 2025 Launching IPR Dia-Burs', 'Thư mục gốc của dự án', 'dirLaunch'], [0, 'Folder', 'MKT Material', 'Ấn phẩm, catalogue, ảnh, IFU, TSKT', 'dirMkt'],
    [0, 'Folder', 'Training', 'Bài đào tạo nhà phân phối', 'dirTrain'], [0, 'Minutes', 'IPR Lauching Họp 08/05', 'Họp khởi động — file đang trống', 'meet0805'],
    [1, 'Research', 'Thư mục 202507 Market Research - IPR final Report', 'Báo cáo nghiên cứu thị trường IPR', 'dirResearch'],
    [1, 'Research', 'Thư mục Dự án IPR', 'Bản tổng hợp nghiên cứu, thông tin sản phẩm', 'dirProject'],
    [1, 'Research', 'Tổng quan về IPR.pdf', 'Tổng quan kỹ thuật mài kẽ', 'overview'], [1, 'Research', 'IPR _ Nghiên cứu thị trường.pdf', 'Khảo sát 11 phòng khám, thói quen IPR', 'research'],
    [1, 'Research', 'IPR_Tổng hợp nghiên cứu.pdf', 'Bối cảnh, định vị, đối thủ, kết luận', 'researchSum'],
    [1, 'Research', 'IPR_Sản phẩm Vs định vị cạnh tranh.pdf', 'So sánh sản phẩm & định vị', 'compete'],
    [1, 'Product', 'Thông tin IPR 01 EF _Final.pdf', 'Thông số, chỉ định, chống chỉ định, tiệt khuẩn', 'infoFinal'],
    [1, 'Product', 'IPR 01EF_Thông tin tổng hợp.pdf', 'Thông tin tổng hợp sản phẩm', 'infoSum'], [1, 'Product', 'Mani IPR 01 EF_04_14_report.pdf', 'Báo cáo lâm sàng của MANI', 'clinical'],
    [1, 'Product', 'IPR IFU.pdf', 'Hướng dẫn sử dụng', 'ifu'], [1, 'Product', 'MANI — IPR-01EF.pdf (web)', 'Brochure gốc của MANI', 'maniPdf'],
    [1, 'Product', 'MANI — dental_04_14_report.pdf (web)', 'Báo cáo lâm sàng (bản web)', 'maniReport'], [1, 'Product', 'MANI — 6DIA-BURS.pdf (web)', 'IFU DIA-BURS (bản web)', 'maniIfu'],
    [2, 'Material', 'IPR-01EF Brochure VN.pdf', 'Flyer tiếng Việt', 'brochureVN'], [2, 'Material', 'Thư mục bản dịch flyer', 'Bản dịch flyer', 'dirFlyer'],
    [2, 'Material', 'IPR-01EF _ Catalogue.pdf', 'Catalogue', 'catalogue'], [2, 'Material', 'Bản dịch Catalog mũi khoan IPR', 'Bản dịch catalogue', 'catTrans'],
    [2, 'Material', 'IPR-01EF.png', 'Ảnh sản phẩm', 'img'], [2, 'Tender', 'TSKT _ Mũi khoan IPR.xlsx', 'Thông số kỹ thuật cho hồ sơ thầu', 'tskt'],
    [2, 'Training', 'Training _ IPR 01 EF _ 25.07.25.pptx', 'Đào tạo nhà phân phối 25/07/2025', 'trainNPP'],
    [2, 'Survey', 'Google Form "KHẢO SÁT SỬ DỤNG MŨI KHOAN IPR"', 'Form lấy phản hồi dùng thử', 'form'],
    [3, 'Promotion', 'Thông báo khuyến mại ra mắt 01/08/2025', 'Mua 3 hộp IPR tặng 1 hộp Glide Finder', 'promo'],
    [4, 'Survey', 'IPR Surveys _MMH', 'Kết quả form dùng thử (3 phiếu)', 'formResp'], [4, 'Training', 'InternalTraining _ IPR 01 EF _ 31.12.25.pptx', 'Đào tạo nội bộ bổ sung', 'trainInt'],
    [4, 'Survey', 'IPR Survey_For New Umbrella shape.docx', 'Bộ câu hỏi khảo sát hình dạng mũi mới (MANI)', 'shapeDoc'],
    [4, 'Survey', '202609_IPR Survey_Results.xlsx', 'Kết quả khảo sát hình dạng mũi, 8 phòng khám', 'shapeRes'],
    [4, 'Survey', 'IPR _ Khảo sát khách hàng lần 2', 'File đang trống', 'survey2']
  ];
}
function sampleSeed_() {
  // Clinic, Segment, City, Qty, Survey, Feedback date, Notes
  var x = [['Nikkori Clinic', 'General dentist', 'TP Hồ Chí Minh', 2, 1, '25/08/2025', '52 Đ. số 5, Tân Hưng, Quận 7'],
    ['BS Hạnh — ĐHQG Hà Nội', '', 'Hà Nội', 1, 0, '', ''], ['Minh Thu', '', 'Hà Nội', '', 0, '', ''], ['Trí Đức', '', 'Hà Nội', '', 0, '', ''],
    ['Parkway', '', 'Hà Nội', '', 0, '', ''], ['Lạc Việt Intech', '', 'Hà Nội', '', 0, '', ''], ['Thùy Anh', '', 'Hà Nội', '', 0, '', ''],
    ['Global Dental', '', 'Hà Nội', '', 0, '', ''], ['Home Dental', '', 'Hà Nội', '', 0, '', ''], ['Sea Dental', '', 'Hà Nội', '', 0, '', ''],
    ['Lux Smile Studio (KOL Dũng)', 'General dentist', 'TP Hồ Chí Minh', 2, 1, '23/08/2025', 'Số 19 Đường 34A, An Phú, TP Thủ Đức'],
    ['Nha khoa Thùy (KOL Thùy)', 'General dentist', 'Bắc Giang', 3, 1, '20/08/2025', ''], ['Jet Dentist', '', 'Hà Nội', '', 0, '', ''],
    ['BS Lê Văn Tiên', '', 'Đà Nẵng', '', 0, '', '170 Nguyễn Hữu Thọ, Hải Châu'], ['Nha khoa Dr Hùng (BS Lan)', '', 'Đà Nẵng', '', 0, '', '275 Tiểu La, Hải Châu'],
    ['Nha khoa Việt Anh (BS Việt Anh)', '', 'Đà Nẵng', '', 0, '', '12 Triệu Nữ Vương, Hải Châu'], ['Nha khoa V-Care (BS Hiếu)', '', 'Đà Nẵng', '', 0, '', '190 Kinh Dương Vương, Liên Chiểu'],
    ['Nha khoa Aki (A Phong)', '', 'TP Hồ Chí Minh', '', 0, '', 'Phản hồi miệng: chất lượng ok'], ['Nha khoa Hoa Sứ (Dr Hiếu)', '', 'TP Hồ Chí Minh', '', 0, '', ''],
    ['Chỉnh nha Huy', '', 'Hải Phòng', '', 0, '', ''], ['RHM Trung ương (BS Hà)', '', 'Hà Nội', '', 0, '', '']];
  return x;
}

/* ══ SETUP · Team & plan ══════════════════════════════════════════════════════════════════ */
function padRows_(rows, n, w) { rows = fill2_(rows || [], w); while (rows.length < n) { var e = []; for (var i = 0; i < w; i++) e.push(''); rows.push(e); } return rows.slice(0, n); }
function R_ROLE_() { return q_(T.setup) + '$B$' + SU.team0 + ':$B$' + (SU.team0 + SU.teamN - 1); }
function R_STEPS_() { return q_(T.setup) + '$B$' + SU.step0 + ':$C$' + (SU.step0 + 10); }
function buildSetup_(ss) {
  var sh = prep_(ss, T.setup, [210, 130, 240, 190, 70, 24, 230, 190, 24, 150, 24, 150], K.setG, 40);
  title_(sh, 'SETUP · TEAM & PLAN', 'Filled once by the project owner. Names here feed every PIC and approver dropdown and the email list.',
    'Head of Sales & Marketing', 'Names, emails, plan dates, baseline lock, lists', 12);
  section_(sh, 5, 2, 5, 'Team', 'Role names are used in every dropdown');
  header_(sh, 6, 2, ['Role in this file', 'Name', 'Company email', 'Does what', 'Gets emails']);
  var team = [[ROLES.hsm, 'Tuyen', 'tt.tuyen@manimedicalhanoi.com', 'Project owner · task approver', 'Yes'],
    [ROLES.gd, 'Nguyen Ha', 'nt.ha@manimedicalhanoi.com', 'Phase approver', 'Yes'], [ROLES.ptl, 'Giang', 'mmh.product@manimedicalhanoi.com', 'PIC', 'Yes'],
    [ROLES.mkt, 'Thuong', 'marketing.mmh@manimedicalhanoi.com', 'PIC', 'Yes'], [ROLES.sales, 'Minh Viet', 'mmh.hanoi@manimedicalhanoi.com', 'PIC', 'Yes'],
    [ROLES.bo, 'Hoa', 'vtt.hoa@manimedicalhanoi.com', 'PIC · registration', 'Yes'], [ROLES.pt, '', '', 'PIC', 'Yes']];
  if (SNAP && nonEmpty_(SNAP.team, [1]).length) team = SNAP.team.map(function (r) { return r.slice(1, 6); });
  sh.getRange(SU.team0, 2, SU.teamN, 5).setValues(padRows_(team, SU.teamN, 5));
  sh.getRange(SU.team0, 2, SU.teamN, 1).setFontWeight('bold');
  grid_(sh, SU.team0, 2, SU.teamN, 5);
  sh.getRange(SU.team0, 6, SU.teamN, 1).setDataValidation(dvList_(['Yes', 'No'])).setHorizontalAlignment('center');
  section_(sh, 5, 8, 2, 'Plan');
  header_(sh, 6, 8, ['Setting', 'Value']);
  var plan = [['Project start', D_('05/05/2025')], ['Planned finish', D_('31/12/2026')], ['Project owner', ROLES.hsm], ['Phase approver', ROLES.gd],
    ['Baseline set by', ROLES.hsm], ['Baseline locked on', D_('05/05/2025')], ['Feedback due after (days)', 14], ['Sample budget (packs, blank = no limit)', ''],
    ['Deadline window (days)', 45], ['Weekly reminder', 'Off']];
  if (SNAP && SNAP.plan && SNAP.plan.length === 10) plan = plan.map(function (p, i) { return [p[0], i === 9 ? p[1] : SNAP.plan[i][1]]; });
  sh.getRange(SU.plan0, 8, 10, 2).setValues(plan);
  sh.getRange(SU.plan0, 8, 10, 1).setFontWeight('bold').setFontColor(K.navy);
  grid_(sh, SU.plan0, 8, 10, 2);
  [0, 1, 5].forEach(function (i) { sh.getRange(SU.plan0 + i, 9).setNumberFormat('dd/mm/yyyy'); });
  var roleRg = sh.getRange(SU.team0, 2, SU.teamN, 1);
  [2, 3, 4].forEach(function (i) { sh.getRange(SU.plan0 + i, 9).setDataValidation(dvRange_(roleRg)); });
  sh.getRange(SU.plan0 + 9, 9).setValue(iprReminderIsOn_() ? 'On · Monday 08:30' : 'Off').setBackground(K.auto).setFontColor(K.mut);
  sh.getRange(SU.plan0 + 9, 8).setNote('Use menu IPR Launch ▸ Turn weekly reminder on / off.');
  section_(sh, 19, 2, 12, 'Dropdown lists', 'Add items at the end of a list');
  header_(sh, 20, 2, ['Step', 'Phase']); header_(sh, 20, 4, ['Phase name', 'Approval']);
  header_(sh, 20, 8, ['Distributors']); header_(sh, 20, 10, ['Segments']); header_(sh, 20, 12, ['Survey types']);
  sh.getRange(SU.step0, 2, 11, 2).setValues(STEPS.map(function (s) { return [s[0], s[1]]; }));
  sh.getRange(SU.step0, 3, 11, 1).setNumberFormat('"Phase "0').setHorizontalAlignment('left');
  sh.getRange(SU.step0, 4, 4, 2).setValues(PHASES.map(function (p) { return [p[0], p[1]]; }));
  var lists = { 8: ['Nam Dung', 'MECI', '[other distributor]'], 10: ['Orthodontist', 'General dentist', 'University', 'Hospital'], 12: ['Trial feedback', 'Market research', 'Product idea', 'Satisfaction'] };
  Object.keys(lists).forEach(function (c) {
    var v = lists[c];
    if (SNAP && SNAP.lists && SNAP.lists.length) { var sv = SNAP.lists.map(function (r) { return r[c - 1]; }).filter(function (x) { return x !== ''; }); if (sv.length) v = sv; }
    sh.getRange(SU.list0, +c, SU.listN, 1).setValues(padRows_(v.map(function (x) { return [x]; }), SU.listN, 1));
    grid_(sh, SU.list0, +c, SU.listN, 1);
  });
  grid_(sh, SU.step0, 2, 11, 2); grid_(sh, SU.step0, 4, 4, 2);
  protectWarn_(sh, sh.getRange(SU.step0, 2, 11, 4));
  sh.setFrozenRows(4);
}

/* ══ UPDATE · Tasks ═══════════════════════════════════════════════════════════════════════ */
function bandFormula_(p) {
  var ar = AP.ph0 + p - 1;
  return '="Phase ' + p + ' · "&' + q_(T.setup) + '$D$' + (SU.step0 + p - 1) + '&"     —   phase approval: "&LOWER(' + q_(T.appr) + '$J$' + ar + ')&IF(' + q_(T.appr) + '$H$' + ar + '="",""," "&TEXT(' + q_(T.appr) + '$H$' + ar + ',"dd/mm/yyyy"))';
}
function tasksRows_() {
  var rows = [];
  if (SNAP && SNAP.tasks && SNAP.tasks.length) {
    SNAP.tasks.forEach(function (r) {
      var no = String(r[TC.no - 1] || ''), d = String(r[TC.task - 1] || ''), m = /^="?Phase (\d)/.exec(d) || /^Phase (\d) · /.exec(d);
      if (!no && m && !r[TC.step - 1]) rows.push({ band: +m[1] }); else rows.push({ v: r });
    });
    while (rows.length && !rows[rows.length - 1].band && !rows[rows.length - 1].v.some(function (x, i) { return TK_IN.indexOf(i + 1) >= 0 && x !== ''; })) rows.pop();
    return rows;
  }
  var ph = 0;
  taskSeed_().forEach(function (t) {
    var p = +t[0].split('.')[0];
    if (p !== ph) { rows.push({ band: p }); ph = p; }
    var v = []; for (var i = 0; i < TC.last; i++) v.push('');
    v[TC.no - 1] = t[0]; v[TC.step - 1] = t[1]; v[TC.task - 1] = t[2]; v[TC.pic - 1] = t[3]; v[TC.ab - 1] = t[4]; v[TC.dep - 1] = t[5]; v[TC.nf - 1] = t[6];
    v[TC.pe - 1] = D_(t[7]); v[TC.st - 1] = t[8]; v[TC.ae - 1] = D_(t[9]); v[TC.ev - 1] = t[10] ? (t[10][1] ? hl_(L[t[10][1]], t[10][0]) : t[10][0]) : '';
    v[TC.ao - 1] = D_(t[11]); v[TC.bs - 1] = D_(t[12]); v[TC.be - 1] = D_(t[13]); v[TC.note - 1] = t[14];
    rows.push({ v: v });
  });
  return rows;
}
function taskFormulas_(r, R0, R1) {
  var c = function (k) { return '$' + CL_(TC[k]) + r; }, col = function (k) { return '$' + CL_(TC[k]) + '$' + R0 + ':$' + CL_(TC[k]) + '$' + R1; };
  var B = c('no'), J = c('st'), U = c('ph');
  var f = {};
  f.flag = '=IF(' + B + '="","",IF(' + J + '="Cancelled","",IF(' + J + '="Done",IF(AND(' + c('nf') + '="Yes",' + c('ev') + '=""),"Missing file",""),IF(' + c('open') + '>0,"Blocked",IF(' + c('unl') + '=FALSE,"Phase locked",IF(' + J + '="To confirm","To confirm",IF(AND(' + c('pe') + '<>"",' + c('pe') + '<TODAY()),"Overdue",IF(' + c('pic') + '="","No PIC",""))))))))';
  f.late = '=IF(OR(' + B + '="",' + J + '="Done",' + J + '="Cancelled",' + c('pe') + '=""),"",IF(' + c('pe') + '<TODAY(),TODAY()-' + c('pe') + ',""))';
  f.chk = '=IF(' + B + '="","",IF(AND(OR(' + J + '="In progress",' + J + '="Waiting approval",' + J + '="Done"),' + c('open') + '>0),"Not allowed: a task in Depends on is not Done",IF(AND(OR(' + J + '="In progress",' + J + '="Waiting approval"),' + c('unl') + '=FALSE),"Not allowed: previous phase not approved",IF(AND(' + J + '="Done",' + c('nf') + '="Yes",' + c('ev') + '=""),"Not allowed: evidence file missing",IF(AND(' + J + '="Done",' + c('ab') + '<>"",' + c('ao') + '=""),"Needs approval record","")))))';
  f.ph = '=IF(OR(' + B + '="",' + c('step') + '=""),"",IFERROR(VLOOKUP(' + c('step') + ',' + R_STEPS_() + ',2,FALSE),""))';
  f.open = '=IF(OR(' + B + '="",' + c('dep') + '=""),0,SUMPRODUCT(ISNUMBER(SEARCH(","&' + col('no') + '&",",","&SUBSTITUTE(' + c('dep') + '," ","")&","))*(' + col('no') + '<>"")*(' + col('st') + '<>"Done")))';
  f.unl = '=IF(' + B + '="","",IF(OR(' + U + '="",' + U + '<=1),TRUE,IFERROR(INDEX(' + q_(T.appr) + '$G$' + AP.ph0 + ':$G$' + (AP.ph0 + 3) + ',' + U + '-1)="Approved",FALSE)))';
  f.cat = '=IF(' + B + '="","",IF(' + J + '="Done","Done",IF(' + J + '="Cancelled","Cancelled",IF(OR(' + c('flag') + '="Overdue",' + c('flag') + '="Blocked",' + c('flag') + '="Phase locked"),"Overdue / blocked",IF(' + J + '="To confirm","To confirm",IF(OR(' + J + '="In progress",' + J + '="Waiting approval"),"In progress","Not started"))))))';
  f.pend = '=IF(AND(' + B + '<>"",OR(' + c('flag') + '="Blocked",' + c('flag') + '="Phase locked",' + c('flag') + '="Overdue",' + c('flag') + '="No PIC",' + c('flag') + '="Missing file",' + c('flag') + '="To confirm",' + J + '="Waiting approval")),1,0)';
  f.rank = '=IF(' + c('pend') + '=1,SUM($' + CL_(TC.pend) + '$' + R0 + ':' + CL_(TC.pend) + r + '),"")';
  f.dkey = '=IF(AND(' + B + '<>"",' + J + '<>"Done",' + J + '<>"Cancelled",' + c('pe') + '<>""),IF(AND(' + c('pe') + '>=TODAY(),' + c('pe') + '<=TODAY()+' + q_(T.setup) + '$I$' + (SU.plan0 + 8) + '),' + c('pe') + '+ROW()/100000,""),"")';
  f.bstart = '=IF(' + B + '="","",IF(' + c('bs') + '<>"",' + c('bs') + ',IF(' + c('pe') + '<>"",' + c('pe') + '-7,"")))';
  f.bend = '=IF(' + B + '="","",IF(' + J + '="Done",IF(' + c('ae') + '<>"",' + c('ae') + ',' + c('pe') + '),IF(' + c('flag') + '="Overdue",TODAY(),' + c('pe') + ')))';
  return f;
}
var T_AUTO = ['flag', 'late', 'chk', 'ph', 'open', 'unl', 'cat', 'pend', 'rank', 'dkey', 'bstart', 'bend'];
function buildTasks_(ss) {
  var rows = tasksRows_(), n = Math.max(TK.n, rows.length + 30), R0 = TK.r0, R1 = R0 + n - 1;
  TK.r1 = R1;
  var W = [44, 170, 260, 150, 140, 70, 52, 80, 112, 80, 160, 84, 92, 56, 80, 84, 230, 240, 90, 40, 46, 56, 120, 40, 46, 80, 76, 76];
  var sh = prep_(ss, T.tasks, W, K.acc, R1 + 2);
  title_(sh, 'UPDATE · TASKS', 'All launch tasks, grouped by phase. One row per task. Phase and step progress on VIEW · Overview come from here.',
    'Owner: Head of Sales & Marketing · PIC: own rows · Approver: Approved on', 'Owner: blue columns · PIC: green columns · Approver: yellow column', 19);
  sh.getRange(5, 2, 1, 9).merge().setValue('Add a task: use an empty row at the bottom or menu IPR Launch ▸ Add a task row; type the number (e.g. 4.7) and choose the Step. Start, Baseline end, Notes and Check are to the right of Days late.')
    .setFontSize(9).setWrap(true).setBackground('#F3F7FA').setBorder(null, true, null, null, null, null, K.acc, SpreadsheetApp.BorderStyle.SOLID_THICK);
  sh.getRange(5, 11, 1, 9).merge().setValue('Stops: Actual end is refused while a task in "Depends on" is not Done or the previous phase is not approved. Done without the evidence file shows "Missing file".')
    .setFontSize(9).setWrap(true).setFontColor(K.badFg).setBackground('#FBF4F1').setBorder(null, true, null, null, null, null, K.bO, SpreadsheetApp.BorderStyle.SOLID_THICK);
  sh.setRowHeight(5, 36);
  ribbon_(sh, 6, [[2, 8, 'owner'], [10, 3, 'pic'], [13, 1, 'appr'], [14, 2, 'auto'], [16, 2, 'owner'], [18, 1, 'pic'], [19, 2, 'auto'], [21, 9, 'auto']]);
  header_(sh, 7, 2, ['No.', 'Step', 'Task', 'PIC', 'Approval by', 'Depends on', 'Needs file', 'Plan end', 'Status', 'Actual end', 'Evidence file', 'Approved on',
    'Flag', 'Days late', 'Start', 'Baseline end', 'Notes', 'Check', 'Assigned email', 'Phase', 'Open deps', 'Phase unlocked', 'Category', 'Pending', 'Rank', 'Deadline key', 'Bar start', 'Bar end'],
    [14, 15, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  sh.getRange(R0, TC.no, n, 1).setNumberFormat('@');
  sh.getRange(R0, TC.dep, n, 1).setNumberFormat('@');
  var data = [], bands = [];
  for (var i = 0; i < n; i++) {
    var r = R0 + i, it = rows[i], v = [];
    for (var c = 0; c < TC.last - 1; c++) v.push('');
    if (it && it.band) { v[TC.task - 2] = bandFormula_(it.band); bands.push(r); }
    else if (it && it.v) { TK_IN.forEach(function (k) { var x = it.v[k - 1]; v[k - 2] = (x === null || x === undefined) ? '' : x; }); }
    if (!(it && it.band)) { var f = taskFormulas_(r, R0, R1); T_AUTO.forEach(function (k) { v[TC[k] - 2] = f[k]; }); }
    data.push(v);
  }
  sh.getRange(R0, 2, n, TC.last - 1).setValues(data);
  grid_(sh, R0, 2, n, TC.last - 1);
  sh.getRange(R0, 2, n, TC.last - 1).setFontSize(9.5);
  autoCols_(sh, R0, n, [TC.flag, TC.late, TC.chk, TC.sent]);
  [TC.pe, TC.ae, TC.ao, TC.bs, TC.be, TC.sent, TC.bstart, TC.bend].forEach(function (c) { sh.getRange(R0, c, n, 1).setNumberFormat('dd/mm/yy').setHorizontalAlignment('center'); });
  [TC.no, TC.dep, TC.nf, TC.st, TC.flag, TC.late].forEach(function (c) { sh.getRange(R0, c, n, 1).setHorizontalAlignment('center'); });
  sh.getRange(R0, TC.dkey, n, 1).setNumberFormat('0.00000');
  sh.getRange(R0, TC.ev, n, 1).setFontColor(K.link);
  bands.forEach(function (r) { band_(sh, r, 2, TC.chk - 1); });
  // dropdown + chặn
  var dSt = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).setHelpText('Choose a status.').build();
  var nonBand = function (fn) { for (var i = 0; i < n; i++) { if (bands.indexOf(R0 + i) < 0) fn(R0 + i); } };
  var stepRg = ss.getSheetByName(T.setup).getRange(SU.step0, 2, 11, 1), roleRg = ss.getSheetByName(T.setup).getRange(SU.team0, 2, SU.teamN, 1);
  var blocks = runs_(R0, n, bands);
  blocks.forEach(function (b) {
    sh.getRange(b[0], TC.st, b[1], 1).setDataValidation(dSt);
    sh.getRange(b[0], TC.step, b[1], 1).setDataValidation(dvRange_(stepRg, true));
    sh.getRange(b[0], TC.pic, b[1], 2).setDataValidation(dvRange_(roleRg, true));
    sh.getRange(b[0], TC.nf, b[1], 1).setDataValidation(dvList_(['Yes', 'No'], true));
    sh.getRange(b[0], TC.ae, b[1], 1).setDataValidation(dvCustom_('=AND($' + CL_(TC.open) + b[0] + '=0,$' + CL_(TC.unl) + b[0] + '=TRUE)',
      'Not allowed: every task in "Depends on" must be Done and the previous phase must be approved.'));
    [TC.pe, TC.ao, TC.bs, TC.be].forEach(function (c) { sh.getRange(b[0], c, b[1], 1).setDataValidation(dvDate_()); });
  });
  statusCF_(sh, [A1_(R0, TC.st) + ':' + A1_(R1, TC.st), A1_(R0, TC.flag) + ':' + A1_(R1, TC.flag)]);
  cfFormula_(sh, [A1_(R0, TC.chk) + ':' + A1_(R1, TC.chk)], '=LEFT($' + CL_(TC.chk) + R0 + ',11)="Not allowed"', K.badBg, K.badFg, true);
  cfFormula_(sh, [A1_(R0, TC.chk) + ':' + A1_(R1, TC.chk)], '=$' + CL_(TC.chk) + R0 + '="Needs approval record"', K.waitBg, K.waitFg, true);
  cfFormula_(sh, [A1_(R0, TC.late) + ':' + A1_(R1, TC.late)], '=N($' + CL_(TC.late) + R0 + ')>0', null, K.badFg, true);
  cfFormula_(sh, [A1_(R0, TC.pic) + ':' + A1_(R1, TC.pic)], '=AND($' + CL_(TC.no) + R0 + '<>"",$' + CL_(TC.pic) + R0 + '="")', K.waitBg, null, false);
  sh.hideColumns(TC.ph, TC.last - TC.ph + 1);
  protectWarn_(sh, sh.getRange(R0, TC.flag, n, 2)); protectWarn_(sh, sh.getRange(R0, TC.chk, n, TC.last - TC.chk + 1));
  sh.setFrozenRows(7); sh.setFrozenColumns(4);
}
function runs_(r0, n, bands) { var out = [], s = null; for (var i = 0; i <= n; i++) { var r = r0 + i, ok = i < n && bands.indexOf(r) < 0; if (ok && s === null) s = r; if (!ok && s !== null) { out.push([s, r - s]); s = null; } } return out; }

/* ══ APPROVE · Phases ═════════════════════════════════════════════════════════════════════ */
function critSeed_() {
  // phase, criterion, type, key (step:<name> | doc:<no> | tasks:<no,no> | manual), evidence [label,key], note
  return [
    [1, 'Product & market research complete', 'Required', 'step:Product & market research'], [1, 'Competitors, pricing & registration complete', 'Required', 'step:Competitors, pricing & registration'],
    [1, 'Distributor price approved (task 1.7)', 'Required', 'doc:1.7'], [1, 'Product registration / import licence confirmed (task 1.8)', 'Required', 'doc:1.8'],
    [1, 'Kick-off minutes stored (08/05/2025)', 'Recommended', 'manual', ['Biên bản 08/05', 'meet0805'], 'File on Drive is empty.'],
    [2, 'Marketing plan approved (task 2.1)', 'Required', 'doc:2.1'], [2, 'Core materials ready: flyer printed, display holder (tasks 2.6, 2.9)', 'Required', 'tasks:2.6,2.9'],
    [2, 'Internal and distributor training done', 'Required', 'step:Training'], [2, 'All materials ready including standee', 'Recommended', 'step:Marketing materials'],
    [2, 'Customer insight survey done (task 2.2)', 'Recommended', 'tasks:2.2'],
    [3, 'Samples sent to target clinics', 'Required', 'step:Product samples'], [3, 'Launch promotion completed', 'Required', 'step:Launch promotion'],
    [3, 'Online launch and events completed', 'Recommended', 'step:Online & events'],
    [4, 'Customer feedback & surveys complete', 'Required', 'step:Customer feedback & surveys'], [4, 'Sales tracked against target', 'Required', 'step:Sales follow-up'],
    [4, 'Post-launch review held', 'Required', 'step:Post-launch review'], [4, 'Lessons learned stored in the project folder', 'Recommended', 'manual']
  ];
}
function critFormula_(key) {
  var tb = q_(T.tasks), R0 = TK.r0, R1 = TK.r1, col = function (k) { return tb + '$' + CL_(TC[k]) + '$' + R0 + ':$' + CL_(TC[k]) + '$' + R1; };
  if (key.indexOf('step:') === 0) return '=IF(IFERROR(INDEX(' + q_(T.calc) + '$K$3:$K$13,MATCH("' + key.slice(5) + '",' + q_(T.calc) + '$A$3:$A$13,0)),"")="Done","Met","Not met")';
  if (key.indexOf('doc:') === 0) return '=IF(SUMPRODUCT((' + col('no') + '="' + key.slice(4) + '")*(' + col('st') + '="Done")*(' + col('ev') + '<>""))>0,"Met","Not met")';
  if (key.indexOf('tasks:') === 0) {
    var ids = key.slice(6).split(',');
    return '=IF(' + ids.map(function (x) { return 'SUMPRODUCT((' + col('no') + '="' + x + '")*(' + col('st') + '="Done"))'; }).join('+') + '>=' + ids.length + ',"Met","Not met")';
  }
  return '';
}
function critSource_(key) {
  if (key.indexOf('step:') === 0) return 'Step: ' + key.slice(5);
  if (key.indexOf('doc:') === 0) return 'Task ' + key.slice(4) + ' + evidence file';
  if (key.indexOf('tasks:') === 0) return 'Tasks ' + key.slice(6).replace(/,/g, ', ');
  return 'Approver ticks';
}
function buildApprove_(ss) {
  var sh = prep_(ss, T.appr, [250, 140, 90, 110, 96, 100, 96, 320, 170, 50, 50, 50, 50, 140], K.gold, AP.hist0 + 200);
  title_(sh, 'APPROVE · PHASES', 'Each phase closes with an approval by the General Director. Decision "Approved" is accepted only when every required criterion is met.',
    'Owner submits · General Director decides', 'Owner: Submitted on · Approver: Decision, Decision date, Comment (or menu Review & decide a phase)', 9);
  ribbon_(sh, 5, [[2, 4, 'auto'], [6, 1, 'owner'], [7, 3, 'appr'], [10, 1, 'auto']]);
  header_(sh, 6, 2, ['Phase', 'Approver', 'Required met', 'Recommended met', 'Submitted on', 'Decision', 'Decision date', 'Comment', 'Status', 'Req. total', 'Req. met', 'Rec. total', 'Rec. met', 'Decided by'], [2, 3, 4, 5, 10, 11, 12, 13, 14, 15]);
  var C0 = AP.cr0, crit = critSeed_(), rowsC = [], ph = 0;
  crit.forEach(function (c) { if (c[0] !== ph) { rowsC.push({ band: c[0] }); ph = c[0]; } rowsC.push({ c: c }); });
  var C1 = C0 + rowsC.length - 1, crRg = function (col) { return '$' + col + '$' + C0 + ':$' + col + '$' + C1; };
  var seedDec = [['30/07/2025', 'Approved', '31/07/2025', 'Research, price and registration complete. Recorded at tracker setup (2025 launch).'],
    ['31/07/2025', 'Approved', '01/08/2025', 'Plan, core materials and training ready. Recorded at tracker setup (2025 launch).'],
    ['31/08/2025', 'Approved', '31/08/2025', 'Samples and launch promotion completed; online activities to confirm. Recorded at tracker setup (2025 launch).'], ['', '', '', '']];
  var data = [];
  for (var i = 0; i < 4; i++) {
    var r = AP.ph0 + i, s = seedDec[i];
    if (SNAP && SNAP.appr && SNAP.appr[i]) { var a = SNAP.appr[i]; s = [a[5], a[6], a[7], a[8]]; }
    data.push(['="Phase ' + (i + 1) + ' · "&' + q_(T.setup) + '$D$' + (SU.step0 + i) + '&" · "&' + q_(T.setup) + '$E$' + (SU.step0 + i),
      '=' + q_(T.setup) + '$I$' + (SU.plan0 + 3), '=L' + r + '&" / "&K' + r, '=N' + r + '&" / "&M' + r,
      typeof s[0] === 'string' ? D_(s[0]) : s[0], s[1], typeof s[2] === 'string' ? D_(s[2]) : s[2], s[3],
      '=IF(G' + r + '="Approved","Approved",IF(G' + r + '="Returned","Returned",IF(F' + r + '<>"",IF(L' + r + '=K' + r + ',"Waiting approval","Submitted · criteria missing"),IF(L' + r + '=K' + r + ',"Ready to submit","Not submitted"))))',
      '=COUNTIFS(' + crRg('H') + ',' + (i + 1) + ',' + crRg('C') + ',"Required")', '=COUNTIFS(' + crRg('H') + ',' + (i + 1) + ',' + crRg('C') + ',"Required",' + crRg('E') + ',"Met")',
      '=COUNTIFS(' + crRg('H') + ',' + (i + 1) + ',' + crRg('C') + ',"Recommended")', '=COUNTIFS(' + crRg('H') + ',' + (i + 1) + ',' + crRg('C') + ',"Recommended",' + crRg('E') + ',"Met")',
      (SNAP && SNAP.appr && SNAP.appr[i]) ? SNAP.appr[i][14] || '' : (seedDec[i][1] ? ROLES.gd : '')]);
  }
  sh.getRange(AP.ph0, 2, 4, 14).setValues(data);
  grid_(sh, AP.ph0, 2, 4, 9);
  sh.getRange(AP.ph0, 2, 4, 1).setFontWeight('bold');
  autoCols_(sh, AP.ph0, 4, [2, 3, 4, 5, 10]);
  sh.getRange(AP.ph0, 4, 4, 4).setHorizontalAlignment('center');
  [6, 8].forEach(function (c) { sh.getRange(AP.ph0, c, 4, 1).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center').setDataValidation(dvDate_()); });
  sh.getRange(AP.ph0, 7, 4, 1).setHorizontalAlignment('center').setDataValidation(dvCustom_('=OR(G' + AP.ph0 + '="",G' + AP.ph0 + '="Returned",AND(G' + AP.ph0 + '="Approved",L' + AP.ph0 + '=K' + AP.ph0 + '))',
    'Type Approved or Returned. Approved is accepted only when all required criteria are met. Easier: menu IPR Launch ▸ Review & decide a phase.'));
  sh.setRowHeights(AP.ph0, 4, 28);
  statusCF_(sh, ['G' + AP.ph0 + ':G' + (AP.ph0 + 3), 'J' + AP.ph0 + ':J' + (AP.ph0 + 3)]);
  // tiêu chí
  section_(sh, C0 - 2, 2, 9, 'Criteria · checked automatically from UPDATE · Tasks', 'Required = blocks approval · Recommended = shown, does not block');
  header_(sh, C0 - 1, 2, ['Criterion', 'Type', 'Checked from', 'Met', 'Evidence', 'Note', 'Phase', 'Key'], [2, 3, 4, 5, 8, 9]);
  var cdata = [], cbands = [], manual = [], snapIdx = 0;
  rowsC.forEach(function (it, k) {
    var r = C0 + k;
    if (it.band) { cdata.push(['="Phase ' + it.band + ' · "&' + q_(T.setup) + '$D$' + (SU.step0 + it.band - 1), '', '', '', '', '', '', '']); cbands.push(r); return; }
    var c = it.c, met = critFormula_(c[3]), ev = c[4] ? hl_(L[c[4][1]], c[4][0]) : '', note = c[5] || '';
    var sn = SNAP && SNAP.crit && SNAP.crit[k] ? SNAP.crit[k] : null;
    if (sn) { ev = sn[5] !== undefined ? sn[5] : ev; note = sn[6] !== undefined ? sn[6] : note; }
    if (c[3] === 'manual') { met = sn && (sn[4] === 'Met' || sn[4] === 'Not met') ? sn[4] : 'Not met'; manual.push(r); }
    cdata.push([c[1], c[2], critSource_(c[3]), met, ev, note, c[0], c[3]]);
  });
  sh.getRange(C0, 2, cdata.length, 8).setValues(cdata);
  grid_(sh, C0, 2, cdata.length, 6);
  autoCols_(sh, C0, cdata.length, [2, 3, 4, 5]);
  manual.forEach(function (r) { sh.getRange(r, 5).setBackground(K.white).setFontColor(K.ink).setDataValidation(dvList_(['Met', 'Not met'], true)); });
  cbands.forEach(function (r) { band_(sh, r, 2, 6); });
  sh.getRange(C0, 5, cdata.length, 1).setHorizontalAlignment('center');
  sh.getRange(C0, 6, cdata.length, 1).setFontColor(K.link);
  cfFormula_(sh, ['E' + C0 + ':E' + C1], '=AND($E' + C0 + '="Not met",$C' + C0 + '="Recommended")', K.waitBg, K.waitFg, true);
  statusCF_(sh, ['E' + C0 + ':E' + C1], ['Met', 'Not met']);
  // lịch sử
  var H0 = AP.hist0;
  section_(sh, H0 - 2, 2, 6, 'History · approvals, baseline and emails', 'Written by the tracker');
  header_(sh, H0 - 1, 2, ['Date', 'By', 'Action', 'Item', 'Detail', 'Email sent to'], [2, 3, 4, 5, 6, 7]);
  var hist = SNAP && SNAP.hist ? nonEmpty_(SNAP.hist, [1, 2, 3]).map(function (r) { return r.slice(1, 7); }) : [
    [D_('05/05/2025'), ROLES.hsm, 'Baseline set', 'Project plan', 'Baseline dates locked (date assumed at tracker setup).', ''],
    [D_('30/06/2025'), ROLES.gd, 'Task approved', '2.1 Marketing plan', 'Recorded at tracker setup (2025 launch).', ''],
    [D_('31/07/2025'), ROLES.gd, 'Task approved', '1.7 Distributor price', 'Recorded at tracker setup (2025 launch).', ''],
    [D_('31/07/2025'), ROLES.gd, 'Task approved', '3.2 Launch promotion', 'Recorded at tracker setup (2025 launch).', ''],
    [D_('31/07/2025'), ROLES.gd, 'Phase approved', 'Phase 1 · Feasibility', 'Recorded at tracker setup (2025 launch).', ''],
    [D_('01/08/2025'), ROLES.gd, 'Phase approved', 'Phase 2 · Launch planning', 'Recorded at tracker setup (2025 launch).', ''],
    [D_('31/08/2025'), ROLES.gd, 'Phase approved', 'Phase 3 · Launch execution', 'Recorded at tracker setup (2025 launch).', ''],
    [new Date(), 'Tracker', 'Tracker built', 'IPR-01EF Launch Tracker ' + IPR_BUILD, 'Layout v4: tabs by job (VIEW · UPDATE · APPROVE · SETUP).', '']];
  if (hist.length) {
    sh.getRange(H0, 2, hist.length, 6).setValues(hist);
    sh.getRange(H0, 2, hist.length, 1).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
    grid_(sh, H0, 2, hist.length, 6);
    sh.getRange(H0, 2, hist.length, 6).setFontSize(9.5);
  }
  sh.hideColumns(11, 5);
  protectWarn_(sh, sh.getRange(AP.ph0, 2, 4, 4)); protectWarn_(sh, sh.getRange(AP.ph0, 10, 4, 6));
  protectWarn_(sh, sh.getRange(C0, 2, cdata.length, 3)); protectWarn_(sh, sh.getRange(C0, 8, cdata.length, 2));
  protectWarn_(sh, sh.getRange(H0 - 1, 2, 202, 6));
  AP.cr1 = C1;
  sh.setFrozenRows(4);
}

/* ══ _calc (ẩn) ═══════════════════════════════════════════════════════════════════════════ */
function buildCalc_(ss) {
  var sh = prep_(ss, T.calc, [190, 60, 60, 60, 60, 60, 60, 60, 60, 60, 120, 70, 170, 50, 50, 50, 50, 50], '#999999', 60);
  sh.getRange(1, 1).setValue('_calc · do not edit. Counts tasks per step and phase from UPDATE · Tasks; feeds VIEW · Overview and APPROVE · Phases.').setFontColor(K.mut);
  var tb = q_(T.tasks), R0 = TK.r0, R1 = TK.r1, col = function (k) { return tb + '$' + CL_(TC[k]) + '$' + R0 + ':$' + CL_(TC[k]) + '$' + R1; };
  sh.getRange(2, 1, 1, 18).setValues([['Step', 'Phase', 'Total', 'Done', 'In progress', 'Waiting', 'To confirm', 'Not started', 'Overdue', 'Blocked', 'Status', 'Progress', 'Main PIC', 'cat Done', 'cat In progress', 'cat Overdue/blocked', 'cat To confirm', 'cat Not started']]).setFontWeight('bold');
  var rows = [];
  for (var i = 0; i < 11; i++) {
    var r = 3 + i, A = '$A' + r, by = col('step') + ',' + A + ',' + col('no') + ',"<>"';
    rows.push(['=' + q_(T.setup) + '$B$' + (SU.step0 + i), '=' + q_(T.setup) + '$C$' + (SU.step0 + i),
      '=COUNTIFS(' + by + ',' + col('st') + ',"<>Cancelled")', '=COUNTIFS(' + by + ',' + col('st') + ',"Done")', '=COUNTIFS(' + by + ',' + col('st') + ',"In progress")',
      '=COUNTIFS(' + by + ',' + col('st') + ',"Waiting approval")', '=COUNTIFS(' + by + ',' + col('st') + ',"To confirm")', '=COUNTIFS(' + by + ',' + col('st') + ',"Not started")',
      '=COUNTIFS(' + by + ',' + col('flag') + ',"Overdue")', '=COUNTIFS(' + by + ',' + col('flag') + ',"Blocked")+COUNTIFS(' + by + ',' + col('flag') + ',"Phase locked")',
      '=IF(C' + r + '=0,"No tasks",IF(D' + r + '=C' + r + ',"Done",IF(J' + r + '>0,"Blocked",IF(I' + r + '>0,"Overdue",IF(F' + r + '>0,"Waiting approval",IF(D' + r + '+G' + r + '=C' + r + ',"To confirm",IF(D' + r + '+E' + r + '>0,"In progress","Not started")))))))',
      '=IF(C' + r + '=0,0,D' + r + '/C' + r + ')', '=IFERROR(INDEX(' + col('pic') + ',MATCH(' + A + ',' + col('step') + ',0))&"","")',
      '=COUNTIFS(' + by + ',' + col('cat') + ',"Done")', '=COUNTIFS(' + by + ',' + col('cat') + ',"In progress")', '=COUNTIFS(' + by + ',' + col('cat') + ',"Overdue / blocked")',
      '=COUNTIFS(' + by + ',' + col('cat') + ',"To confirm")', '=COUNTIFS(' + by + ',' + col('cat') + ',"Not started")']);
  }
  sh.getRange(3, 1, 11, 18).setValues(rows);
  sh.getRange(15, 1, 1, 18).setValues([['Phase', 'Name', 'Total', 'Done', 'Active', 'Status', 'Progress', 'Approval', 'Decided on', '', '', '', '', 'cat Done', 'cat In progress', 'cat Overdue/blocked', 'cat To confirm', 'cat Not started']]).setFontWeight('bold');
  var ph = [];
  for (var p = 1; p <= 4; p++) {
    var r2 = 15 + p, cnt = 'COUNTIF($B$3:$B$13,A' + r2 + ')', cs = function (x) { return 'COUNTIFS($B$3:$B$13,A' + r2 + ',$K$3:$K$13,"' + x + '")'; }, su = function (c) { return '=SUMIF($B$3:$B$13,A' + r2 + ',$' + c + '$3:$' + c + '$13)'; };
    ph.push([p, '=' + q_(T.setup) + '$D$' + (SU.step0 + p - 1), su('C'), su('D'), '=(SUMIF($B$3:$B$13,A' + r2 + ',$D$3:$D$13)+SUMIF($B$3:$B$13,A' + r2 + ',$E$3:$E$13)+SUMIF($B$3:$B$13,A' + r2 + ',$F$3:$F$13))>0',
      '=IF(' + cs('Done') + '=' + cnt + ',"Done",IF(' + cs('Blocked') + '>0,"Blocked",IF(' + cs('Overdue') + '>0,"Overdue",IF(' + cs('Not started') + '=' + cnt + ',"Not started",IF(' + cs('To confirm') + '+' + cs('Done') + '=' + cnt + ',"To confirm","In progress")))))',
      '=IF(C' + r2 + '=0,0,D' + r2 + '/C' + r2 + ')', '=' + q_(T.appr) + '$J$' + (AP.ph0 + p - 1), '=' + q_(T.appr) + '$H$' + (AP.ph0 + p - 1), '', '', '', '',
      su('N'), su('O'), su('P'), su('Q'), su('R')]);
  }
  sh.getRange(16, 1, 4, 18).setValues(ph);
  var cat = col('cat'), flg = col('flag');
  var tot = [['Tasks', '=COUNTIFS(' + col('no') + ',"<>",' + col('st') + ',"<>Cancelled")'], ['Done', '=COUNTIF(' + cat + ',"Done")'], ['In progress', '=COUNTIF(' + cat + ',"In progress")'],
    ['Overdue / blocked', '=COUNTIF(' + cat + ',"Overdue / blocked")'], ['To confirm', '=COUNTIF(' + cat + ',"To confirm")'], ['Not started', '=COUNTIF(' + cat + ',"Not started")'],
    ['Progress', '=IF(B22=0,0,B23/B22)'], ['Current phase no.', '=IF(E19,4,IF(E18,3,IF(E17,2,1)))'], ['Current phase', '=INDEX($B$16:$B$19,B29)'],
    ['Overdue tasks', '=COUNTIF(' + flg + ',"Overdue")'], ['Blocked tasks', '=COUNTIF(' + flg + ',"Blocked")+COUNTIF(' + flg + ',"Phase locked")'],
    ['Waiting approval', '=COUNTIF(' + q_(T.appr) + '$J$' + AP.ph0 + ':$J$' + (AP.ph0 + 3) + ',"Waiting approval")+COUNTIF(' + col('st') + ',"Waiting approval")'],
    ['Time used', '=MAX(0,MIN(1,(TODAY()-' + q_(T.setup) + '$I$' + SU.plan0 + ')/(' + q_(T.setup) + '$I$' + (SU.plan0 + 1) + '-' + q_(T.setup) + '$I$' + SU.plan0 + ')))'],
    ['Plan text', '="Plan "&TEXT(' + q_(T.setup) + '$I$' + SU.plan0 + ',"dd/mm/yyyy")&" → "&TEXT(' + q_(T.setup) + '$I$' + (SU.plan0 + 1) + ',"dd/mm/yyyy")']];
  sh.getRange(21, 1).setValue('Totals').setFontWeight('bold');
  sh.getRange(22, 1, tot.length, 2).setValues(tot);
  // rows: 22 Tasks · 23 Done · 24 InProg · 25 Over · 26 Conf · 27 NotSt · 28 Progress · 29 PhaseNo · 30 Phase · 31 Overdue · 32 Blocked · 33 Waiting · 34 Time used · 35 Plan text
  sh.getRange(3, 12, 11, 1).setNumberFormat('0%'); sh.getRange(16, 7, 4, 1).setNumberFormat('0%'); sh.getRange(28, 2).setNumberFormat('0%'); sh.getRange(34, 2).setNumberFormat('0%');
  sh.getRange(16, 9, 4, 1).setNumberFormat('dd/mm/yyyy');
  protectWarn_(sh, null);
}
