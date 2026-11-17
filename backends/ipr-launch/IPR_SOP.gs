/* ══════════════════════════════════════════════════════════════════════════════════════════
 * IPR_SOP.gs v2 — "mini app" theo dõi launch IPR-01EF theo MMH SOP ra mắt sản phẩm mới
 *
 *   Launch Flow  : lưu đồ trực quan (không viền, to, full màn hình) — tự đổi màu theo dữ liệu
 *   Tasks        : PIC cập nhật trạng thái / ngày / tài liệu từng việc  ─┐
 *   Gates        : tiêu chí qua cổng (Auto = công thức, Manual = tick)    ├─▶ Engine ─▶ Launch Flow
 *   Samples      : danh sách mẫu dùng thử, tick đã phản hồi              │
 *   Results      : doanh số theo tháng, KPI, khảo sát, việc cải tiến     ─┘
 *   Feasibility · Launch Plan · Documents : nội dung tham khảo (PIC sửa trực tiếp)
 *   Engine       : bảng tính trung gian (không sửa tay)
 *
 * - Tab cũ (dữ liệu gốc) chỉ bị ẨN, không xoá. Tab bản v1 (00_… → 06_…) được thay bằng bản v2.
 * - Khi code có phiên bản mới, lần mở file đầu tiên tự dựng lại và GIỮ dữ liệu PIC đã nhập
 *   (trạng thái, ngày, ghi chú, link ở Tasks; tick + ghi chú ở Gates; Samples; doanh số & việc cải tiến ở Results).
 * - Màu theo bảng màu file PPT MMH Management Practices (navy 2C4A5E, xanh 5A84A6, nhạt D6E2E9, vàng FBE9B7).
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

var IPR_BUILD = 'v2';
var IPR_META = 'mmh_ipr_sop_build';
var TB = { flow: 'Launch Flow', tasks: 'Tasks', gates: 'Gates', feas: 'Feasibility', plan: 'Launch Plan',
  smp: 'Samples', res: 'Results', docs: 'Documents', eng: 'Engine' };
var IPR_TABS = [TB.flow, TB.tasks, TB.gates, TB.feas, TB.plan, TB.smp, TB.res, TB.docs, TB.eng];
var LEGACY_V1 = ['00_Tổng quan', '01_Tiến độ', '02_Khả thi', '03_Kế hoạch', '04_Mẫu & phản hồi', '05_Đánh giá', '06_Tài liệu'];
var C_ = { navy: '#2C4A5E', acc: '#5A84A6', acc2: '#6B95B8', light: '#99C1DE', pale: '#D6E2E9', line: '#BCD4E6',
  yel: '#FBE9B7', yelb: '#EDD9A3', teal: '#5B9A91', tealL: '#DBE7E4', red: '#B4735F', redL: '#F2DFD8',
  ink: '#232C36', mut: '#4F5B68', alt: '#F4F8FB', tile: '#EEF4F8', white: '#FFFFFF', link: '#3A72A6' };
var FONT = 'Inter';
var STATUSES = ['Done', 'In progress', 'Not started', 'Not recorded', 'Cancelled'];

var PHASES = [
  ['P1', '🔎', 'Feasibility'], ['P2', '🗺️', 'Launch planning'],
  ['P3', '🚀', 'Launch execution'], ['P4', '📊', 'Measure & optimize']
];
var STEPS = [
  ['S1', 'P1', '🔍', 'Product & market research'],
  ['S2', 'P1', '🏷️', 'Competitors & pricing'],
  ['S3', 'P2', '🎯', 'Positioning & marketing plan'],
  ['S4', 'P2', '🖨️', 'Marketing materials'],
  ['S5', 'P2', '🎓', 'Training'],
  ['S6', 'P3', '📦', 'Product samples'],
  ['S7', 'P3', '🎁', 'Launch promotion'],
  ['S8', 'P3', '📣', 'Online & events'],
  ['S9', 'P4', '💬', 'Customer feedback & surveys'],
  ['S10', 'P4', '📈', 'Sales follow-up'],
  ['S11', 'P4', '🧭', 'Post-launch review']
];
var GATES = [
  ['G1', 'Go / No-go', 'Feasibility → Launch planning', 'General Director'],
  ['G2', 'Launch plan approved', 'Launch planning → Launch execution', 'Head of S&M confirms · General Director approves'],
  ['G3', 'Launch completed', 'Launch execution → Measure & optimize', 'Head of S&M'],
  ['G4', 'Project closed', 'Measure & optimize → Close', 'General Director']
];
// Engine layout (fixed rows — các công thức tham chiếu theo các mốc này)
var E_STEP = 4, E_PH = 18, E_GATE = 25, E_TOT = 32;
var TOT = { total: 32, done: 33, overdue: 34, confirm: 35, phaseNo: 36, phaseLabel: 37, bypass: 38,
  sent: 39, fb: 40, rate: 41, units: 42, value: 43, ratio: 44 };

function fFile_(id) { return 'https://drive.google.com/file/d/' + id + '/view'; }
function fDir_(id) { return 'https://drive.google.com/drive/folders/' + id; }
var L = {
  dirLaunch: fDir_('1DqQxn_4qPkhOyutfnS2pqmXxd87IhHsx'),
  dirMkt: fDir_('14KtQ2THtDba5z5CDlIvd3CcK8RF6bWou'),
  dirTrain: fDir_('1JdcGV8NRWw1UxPgv5BkDa0lSIrPgLzKs'),
  dirResearch: fDir_('1DQ31H6f32RtgY0NA0a9Ugirv_Uy71kKY'),
  dirProject: fDir_('1BMtT3givsT7UuGRVqee9_gEAAjCmKEDk'),
  dirFlyer: fDir_('1uhHzcyUFybfBgCb0onCiZ72mKrEMDvAX'),
  meet0805: 'https://docs.google.com/document/d/1ZgrnhkulSoh0k22shAaD6giCw8dfaVs5lOG-9H1O-FU/edit',
  overview: fFile_('1ie7k09xDd78GBnIO8HDI1fjliPFdfoEh'),
  infoSum: fFile_('1zhtlADRYl6ycCkf6KXSb5eXhzaWnekFa'),
  infoFinal: fFile_('1u87sAryx0id5qAV61zyu3CXl5LKMBISl'),
  compete: fFile_('12jci5TSfk-oxqPi_cRJ5euktubg1zux8'),
  research: fFile_('1115sZrK3x1WpPHW2zSQp9qmTUCrKjzkd'),
  researchSum: fFile_('1E44CkEJbwwB9UOOlFh1HgjfRfOh51Q1g'),
  catalogue: fFile_('15Md-Cy-tOCq0euP8u3kskUZIBt8LrMAV'),
  catTrans: 'https://docs.google.com/document/d/1qxfsrhVirdVMQG4klCzybH4K5DLnb9i2RcqKe62gFII/edit',
  clinical: fFile_('1rK1ddDa-h26e5jALPQZmOBeI6DmuuYZa'),
  ifu: fFile_('18rgqQ0NjN1u92h3eq9O37wiBArDN4nTB'),
  tskt: fFile_('17_0ahTag5F6RmpN1PuSrAk_xIlMguVBx'),
  brochureVN: fFile_('1PJaqtabM8GGhA1bOSHYZci01VJ5aLSkY'),
  img: fFile_('1pmLCp0Hj-_QRjQnyeQ-b1Pz29HrvLLXm'),
  trainNPP: fFile_('1BWN8C4OiL7eD4y3uddzSOFjUySrptKRm'),
  trainInt: fFile_('1h3pyRU2VFGn5Q52fiA1teGGhnbbCWHPp'),
  promo: fFile_('1iYgIjhYeAHa4qIvCtOE7b9T1XHIrcKmY'),
  form: 'https://docs.google.com/forms/d/1WY66nK5_9J5ZdM1MUuYiLzhqThYxE1RQHduaNrSdZrI/edit',
  formResp: 'https://docs.google.com/spreadsheets/d/1bjVPE8MBM_DWsd-rARIS2_042APwSfYc3CL_BrCqlIM/edit',
  shapeDoc: fFile_('1hfF4uX4-ln_qLKVbzylT82PgAu5gNjt-'),
  shapeRes: fFile_('1aTBjdfCHumQsAMVgSSZKtebNJlMVnU6u'),
  survey2: 'https://docs.google.com/spreadsheets/d/1RGBSYSjaopF78oaW_XlEInaw4PqsAL5VTW2NOzJ-32c/edit',
  maniPdf: 'https://www.mani.co.jp/en/pdf/IPR-01EF.pdf',
  maniReport: 'https://www.mani.co.jp/en/pdf/dental_04_14_report.pdf',
  maniIfu: 'https://www.mani.co.jp/en/pdf/6DIA-BURS.pdf'
};


/* ── Menu + tự dựng khi có phiên bản mới ────────────────────────────────────────────────── */
function onOpen(e) {
  try {
    SpreadsheetApp.getUi().createMenu('🚀 IPR Launch')
      .addItem('🔄 Rebuild (keep PIC updates)', 'iprRebuildMenu')
      .addSeparator()
      .addItem('👁 Show old tabs', 'iprShowOldTabs')
      .addItem('🙈 Hide old tabs', 'iprHideOldTabs')
      .addToUi();
  } catch (_) {}
  try {
    var ss = SpreadsheetApp.getActive();
    if (iprVersion_(ss) !== IPR_BUILD) {
      iprBuild_(ss);
      ss.toast('Đã dựng file theo SOP launch (bản ' + IPR_BUILD + '). Tab cũ được ẩn, không xoá.', 'MMH', 8);
    }
  } catch (err) {
    console.error('IPR auto build: ' + (err && err.stack || err));
  }
}

function iprRebuildMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('Rebuild',
    'Dựng lại 9 tab của app. Dữ liệu PIC đã nhập (Tasks, Gates, Samples, doanh số, việc cải tiến) được giữ lại; ' +
    'nội dung sửa tay ở Feasibility / Launch Plan / Documents sẽ về bản gốc.\n\nTiếp tục?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  iprBuild_(SpreadsheetApp.getActive());
  SpreadsheetApp.getActive().toast('Đã dựng lại xong.', 'MMH', 5);
}
function iprShowOldTabs() {
  SpreadsheetApp.getActive().getSheets().forEach(function (sh) { if (IPR_TABS.indexOf(sh.getName()) < 0) sh.showSheet(); });
}
function iprHideOldTabs() { iprHideOld_(SpreadsheetApp.getActive()); }
function iprHideOld_(ss) {
  ss.getSheets().forEach(function (sh) { if (IPR_TABS.indexOf(sh.getName()) < 0 && !sh.isSheetHidden()) sh.hideSheet(); });
}
function iprVersion_(ss) {
  var m = ss.createDeveloperMetadataFinder().withKey(IPR_META).find();
  return m.length ? m[0].getValue() : '';
}

/* ── Giữ dữ liệu PIC khi dựng lại ───────────────────────────────────────────────────────── */
var SNAP = null;
function snapshot_(ss) {
  var s = { tasks: {}, extraTasks: [], gates: {}, samples: {}, extraSamples: [], sales: {}, actions: {} };
  var sh = ss.getSheetByName(TB.tasks);
  if (sh && String(sh.getRange(3, 2).getValue()).indexOf('ID') >= 0 && sh.getLastRow() >= 4) {
    var v = sh.getRange(4, 2, sh.getLastRow() - 3, 13).getValues(); // B..N
    var fm = sh.getRange(4, 13, sh.getLastRow() - 3, 1).getFormulas();
    v.forEach(function (r, i) { if (fm[i][0]) r[11] = fm[i][0]; });
    var seed = {}; taskSeed_().forEach(function (t) { seed[t[0]] = 1; });
    v.forEach(function (r) {
      var id = String(r[0]).trim(); if (!id) return;
      if (seed[id]) s.tasks[id] = { owner: r[7], start: r[8], due: r[9], status: r[10], doc: r[11], notes: r[12] };
      else s.extraTasks.push(r);
    });
  }
  sh = ss.getSheetByName(TB.gates);
  if (sh && sh.getLastRow() >= 4 && String(sh.getRange(3, 4).getValue()).indexOf('Criterion') >= 0) {
    sh.getRange(4, 2, sh.getLastRow() - 3, 8).getValues().forEach(function (r) {
      if (r[0] && r[4] === 'Manual') s.gates[r[0] + '|' + r[2]] = { met: r[5], note: r[6], doc: r[7] };
    });
  }
  sh = ss.getSheetByName(TB.smp);
  if (sh && sh.getLastRow() >= 4 && String(sh.getRange(3, 3).getValue()).indexOf('Clinic') >= 0) {
    var names = {}; sampleSeed_().forEach(function (r) { names[r[1]] = 1; });
    sh.getRange(4, 2, sh.getLastRow() - 3, 8).getValues().forEach(function (r) {
      if (!r[1]) return;
      if (names[r[1]]) s.samples[r[1]] = { fb: r[6], note: r[7] }; else s.extraSamples.push(r);
    });
  }
  sh = ss.getSheetByName(TB.res);
  if (sh && sh.getLastRow() > 4) {
    var all = sh.getRange(1, 2, sh.getLastRow(), 7).getValues(), mode = '';
    all.forEach(function (r) {
      var a = String(r[0]);
      if (a.indexOf('MONTHLY SALES') >= 0) { mode = 'sales'; return; }
      if (a.indexOf('IMPROVEMENT ACTIONS') >= 0) { mode = 'act'; return; }
      if (a.indexOf('LAUNCH KPIs') >= 0 || a.indexOf('TRIAL FEEDBACK') >= 0 || a.indexOf('SHAPE SURVEY') >= 0) { mode = ''; return; }
      if (mode === 'sales' && /^\d{2}\/\d{4}$/.test(a)) s.sales[a] = [r[1], r[2], r[3], r[4]];
      if (mode === 'act' && a && a !== 'Issue') s.actions[a] = { status: r[4], note: r[5] };
    });
  }
  return s;
}

/* ── Dựng toàn bộ ───────────────────────────────────────────────────────────────────────── */
function iprBuild_(ss) {
  var lock = null;
  try { lock = LockService.getDocumentLock(); lock.waitLock(20000); } catch (_) { lock = null; }
  try {
    SNAP = snapshot_(ss);
    var keep = ss.insertSheet('_tmp_' + Date.now(), 0);
    IPR_TABS.concat(LEGACY_V1).forEach(function (n) { var s = ss.getSheetByName(n); if (s) ss.deleteSheet(s); });
    // tạo đủ tab trước để công thức tham chiếu chéo luôn hợp lệ
    IPR_TABS.forEach(function (n, i) { ss.insertSheet(n, i + 1); });
    ss.deleteSheet(keep);
    buildEngine_(ss);
    buildTasks_(ss);
    buildGates_(ss);
    buildSamples_(ss);
    buildResults_(ss);
    buildFeas_(ss);
    buildPlan_(ss);
    buildDocs_(ss);
    buildFlow_(ss);
    iprHideOld_(ss);
    ss.createDeveloperMetadataFinder().withKey(IPR_META).find().forEach(function (m) { m.remove(); });
    ss.addDeveloperMetadata(IPR_META, IPR_BUILD);
    ss.setActiveSheet(ss.getSheetByName(TB.flow));
  } finally {
    if (lock) try { lock.releaseLock(); } catch (_) {}
  }
}

/* ── Tiện ích định dạng ─────────────────────────────────────────────────────────────────── */
function D_(s) { if (!s) return ''; var p = s.split('/'); return new Date(+p[2], +p[1] - 1, +p[0]); }
function A1_(r, c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s + r; }
function hl_(url, label) { return url ? '=HYPERLINK("' + url + '","' + String(label).replace(/"/g, '""') + '")' : (label || ''); }

function sheet_(ss, name, widths, tab, rows) {
  var sh = ss.getSheetByName(name);
  var maxCols = widths.length + 1;
  if (sh.getMaxColumns() > maxCols) sh.deleteColumns(maxCols + 1, sh.getMaxColumns() - maxCols);
  else if (sh.getMaxColumns() < maxCols) sh.insertColumnsAfter(sh.getMaxColumns(), maxCols - sh.getMaxColumns());
  if (rows && sh.getMaxRows() > rows) sh.deleteRows(rows + 1, sh.getMaxRows() - rows);
  sh.setColumnWidth(1, 22);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 2, w); });
  sh.getRange(1, 1, sh.getMaxRows(), maxCols).setFontFamily(FONT).setFontSize(10).setFontColor(C_.ink).setVerticalAlignment('middle');
  sh.setHiddenGridlines(true);
  if (tab) sh.setTabColor(tab);
  return sh;
}
/* Tiêu đề kiểu slide: B1 tiêu đề navy, B2 phụ đề xanh (hướng dẫn PIC), dải kẻ mảnh */
function head_(sh, title, sub, n) {
  sh.getRange(1, 2).setValue(title).setFontSize(18).setFontWeight('bold').setFontColor(C_.navy);
  sh.getRange(2, 2).setValue(sub).setFontSize(10).setFontColor(C_.acc);
  sh.setRowHeight(1, 40); sh.setRowHeight(2, 24);
}
/* Bảng: header nền D6E2E9 chữ navy; dòng xen kẽ; viền mảnh BCD4E6. links: {col: true} ⇒ ô dạng [label,url] */
function table_(sh, r0, c0, headers, rows, o) {
  o = o || {};
  var nc = headers.length;
  sh.getRange(r0, c0, 1, nc).setValues([headers]).setBackground(C_.pale).setFontColor(C_.navy).setFontWeight('bold')
    .setWrap(true).setHorizontalAlignment('center');
  sh.setRowHeight(r0, 34);
  var n = Math.max(rows.length, o.blank || 0);
  if (n) {
    var vals = [];
    for (var i = 0; i < n; i++) {
      var row = rows[i] || headers.map(function () { return ''; });
      vals.push(row.map(function (c) {
        if (Array.isArray(c)) return hl_(c[1], c[0]);
        return c === null || c === undefined ? '' : c;
      }));
    }
    var body = sh.getRange(r0 + 1, c0, n, nc);
    (o.text || []).forEach(function (j) { sh.getRange(r0 + 1, c0 + j, n, 1).setNumberFormat('@'); });
    body.setValues(vals);   // chuỗi bắt đầu bằng "=" được ghi thành công thức
    body.setWrap(true).setVerticalAlignment('middle');
    body.setBackgrounds(vals.map(function (_, i) { var c = i % 2 ? C_.alt : C_.white; return headers.map(function () { return c; }); }));
    (o.dates || []).forEach(function (j) { sh.getRange(r0 + 1, c0 + j, n, 1).setNumberFormat('dd/MM/yyyy').setHorizontalAlignment('center'); });
    (o.center || []).forEach(function (j) { sh.getRange(r0 + 1, c0 + j, n, 1).setHorizontalAlignment('center'); });
    (o.bold || []).forEach(function (j) { sh.getRange(r0 + 1, c0 + j, n, 1).setFontWeight('bold').setFontColor(C_.navy); });
    (o.calc || []).forEach(function (j) { sh.getRange(r0 + 1, c0 + j, n, 1).setFontColor(C_.mut).setFontStyle('italic'); });
    (o.links || []).forEach(function (j) { sh.getRange(r0 + 1, c0 + j, n, 1).setFontColor(C_.link); });
  }
  sh.getRange(r0, c0, n + 1, nc).setBorder(true, true, true, true, true, true, C_.line, SpreadsheetApp.BorderStyle.SOLID);
  return { r0: r0, r1: r0 + n, nc: nc, n: n };
}
function section_(sh, r, c, n, text) {
  sh.getRange(r, c, 1, n).setBackground(C_.navy).setFontColor(C_.white).setFontWeight('bold').setFontSize(11);
  sh.getRange(r, c).setValue(text);
  sh.setRowHeight(r, 28);
}
/* Khối nội dung 2 cột: nhãn (B) + nội dung ghép C → cuối */
function kv_(sh, r, pairs, n) {
  sh.getRange(r, 2, pairs.length, 2).setValues(pairs);
  if (n > 2) sh.getRange(r, 3, pairs.length, n - 1).mergeAcross();
  sh.getRange(r, 2, pairs.length, 1).setFontWeight('bold').setFontColor(C_.navy).setBackground(C_.alt).setVerticalAlignment('top');
  sh.getRange(r, 3, pairs.length, n - 1).setWrap(true).setVerticalAlignment('top');
  sh.getRange(r, 2, pairs.length, n).setBorder(true, true, true, true, true, true, C_.line, SpreadsheetApp.BorderStyle.SOLID);
  pairs.forEach(function (p, i) { sh.setRowHeight(r + i, Math.max(26, 17 * Math.ceil(String(p[1]).length / 120) + 8)); });
  return r + pairs.length + 1;
}
function cf_(range, formula, bg, fg, bold) {
  var b = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setRanges([range]);
  if (bg) b.setBackground(bg); if (fg) b.setFontColor(fg); if (bold) b.setBold(true);
  return b.build();
}
var STEP_COLORS = [['DONE', C_.teal, C_.white], ['IN PROGRESS', C_.acc2, C_.white], ['TO CONFIRM', C_.yelb, C_.navy],
  ['OVERDUE', C_.red, C_.white], ['NOT STARTED', C_.pale, C_.acc]];
var GATE_COLORS = [['PASSED', C_.teal, C_.white], ['BYPASSED', C_.yelb, C_.navy], ['READY', C_.light, C_.navy], ['OPEN', C_.pale, C_.acc]];
function statusRules_(range, cellA1, set) {
  return set.map(function (c) { return cf_(range, '=REGEXMATCH(' + cellA1 + ',"' + c[0] + '")', c[1], c[2]); });
}
function absA1_(r, c) { return '$' + A1_(r, c).replace(/(\d+)$/, function (m) { return '$' + m; }); }

/* ═══ Engine · bảng tính trung gian ═════════════════════════════════════════════════════════ */
function buildEngine_(ss) {
  var sh = sheet_(ss, TB.eng, [70, 70, 220, 50, 70, 70, 80, 80, 80, 110, 80, 200, 260, 260, 120, 60, 110], '#999999');
  head_(sh, '⚙️ ENGINE · CALCULATIONS', 'Không sửa tay — mọi ô được tính từ Tasks, Gates, Samples và Results; Launch Flow đọc từ đây.');
  var T = 'Tasks!';
  // Steps
  table_(sh, E_STEP - 1, 2, ['Step', 'Phase', 'Step name', 'Icon', 'Total', 'Done', 'In progress', 'Not recorded', 'Overdue', 'Status', 'Progress', 'Display'],
    STEPS.map(function (s, i) {
      var r = E_STEP + i;
      return [s[0], s[1], s[3], s[2],
        '=COUNTIFS(' + T + '$D$4:$D,$B' + r + ',' + T + '$L$4:$L,"<>Cancelled")',
        '=COUNTIFS(' + T + '$D$4:$D,$B' + r + ',' + T + '$L$4:$L,"Done")',
        '=COUNTIFS(' + T + '$D$4:$D,$B' + r + ',' + T + '$L$4:$L,"In progress")',
        '=COUNTIFS(' + T + '$D$4:$D,$B' + r + ',' + T + '$L$4:$L,"Not recorded")',
        '=COUNTIFS(' + T + '$D$4:$D,$B' + r + ',' + T + '$O$4:$O,"*OVERDUE*")',
        '=IF(F' + r + '=0,"NO TASKS",IF(G' + r + '=F' + r + ',"DONE",IF(J' + r + '>0,"OVERDUE",IF(G' + r + '+I' + r + '=F' + r + ',"TO CONFIRM",IF(G' + r + '+H' + r + '>0,"IN PROGRESS","NOT STARTED")))))',
        '=IF(F' + r + '=0,0,G' + r + '/F' + r + ')',
        '=' + disp_('K' + r) + '&"     "&G' + r + '&" / "&F' + r + '&" tasks"'];
    }));
  // Phases
  var sc = '$C$' + E_STEP + ':$C$' + (E_STEP + 10), sk = '$K$' + E_STEP + ':$K$' + (E_STEP + 10);
  table_(sh, E_PH - 1, 2, ['Phase', 'Phase name', 'Icon', 'Total', 'Done', 'Active', 'Status', 'Progress', 'No.', 'Display'],
    PHASES.map(function (p, i) {
      var r = E_PH + i, cnt = 'COUNTIF(' + sc + ',$B' + r + ')';
      function c(st) { return 'COUNTIFS(' + sc + ',$B' + r + ',' + sk + ',"' + st + '")'; }
      return [p[0], p[2], p[1],
        '=SUMIF(' + sc + ',$B' + r + ',$F$' + E_STEP + ':$F$' + (E_STEP + 10) + ')',
        '=SUMIF(' + sc + ',$B' + r + ',$G$' + E_STEP + ':$G$' + (E_STEP + 10) + ')',
        '=(SUMIF(' + sc + ',$B' + r + ',$G$' + E_STEP + ':$G$' + (E_STEP + 10) + ')+SUMIF(' + sc + ',$B' + r + ',$H$' + E_STEP + ':$H$' + (E_STEP + 10) + '))>0',
        '=IF(' + c('DONE') + '=' + cnt + ',"DONE",IF(' + c('OVERDUE') + '>0,"OVERDUE",IF(' + c('NOT STARTED') + '=' + cnt + ',"NOT STARTED",IF(' + c('TO CONFIRM') + '+' + c('DONE') + '=' + cnt + ',"TO CONFIRM","IN PROGRESS"))))',
        '=IF(E' + r + '=0,0,F' + r + '/E' + r + ')', i + 1,
        '=' + disp_('H' + r) + '&"     "&F' + r + '&" / "&E' + r + '&" tasks"'];
    }));
  // Gates
  var G = 'Gates!', gb = G + '$B$4:$B', ge = G + '$E$4:$E', gf = G + '$F$4:$F', gg = G + '$G$4:$G', gd = G + '$D$4:$D';
  table_(sh, E_GATE - 1, 2, ['Gate', 'Gate name', 'From → To', 'Decided by', 'Required', 'Req. met', 'Auto req.', 'Auto met',
    'Recommended', 'Rec. met', 'Next phase active', 'Status', 'Display', 'Why', 'To add'],
    GATES.map(function (g, i) {
      var r = E_GATE + i, key = '$B' + r;
      return [g[0], g[1], g[2], g[3],
        '=COUNTIFS(' + gb + ',' + key + ',' + ge + ',"Required")',
        '=COUNTIFS(' + gb + ',' + key + ',' + ge + ',"Required",' + gg + ',TRUE)',
        '=COUNTIFS(' + gb + ',' + key + ',' + ge + ',"Required",' + gf + ',"Auto")',
        '=COUNTIFS(' + gb + ',' + key + ',' + ge + ',"Required",' + gf + ',"Auto",' + gg + ',TRUE)',
        '=COUNTIFS(' + gb + ',' + key + ',' + ge + ',"Recommended")',
        '=COUNTIFS(' + gb + ',' + key + ',' + ge + ',"Recommended",' + gg + ',TRUE)',
        i < 3 ? '=$G$' + (E_PH + i + 1) : 'FALSE',
        '=IF(G' + r + '=F' + r + ',"PASSED",IF(L' + r + '=TRUE,"BYPASSED",IF(I' + r + '=H' + r + ',"READY","OPEN")))',
        '=SWITCH(M' + r + ',"PASSED","✅ PASSED","BYPASSED","⚠️ BYPASSED","READY","🟦 READY TO DECIDE","🔒 OPEN")&"     "&G' + r + '&" / "&F' + r + '&" required"',
        '=IF(M' + r + '="PASSED","✔ Moved on: "&IFERROR(TEXTJOIN("  ·  ",TRUE,FILTER(' + gd + ',' + gb + '=' + key + ',' + ge + '="Required")),""),' +
          'IF(M' + r + '="BYPASSED","⚠ Next phase started before this gate passed. Missing: ","✖ Missing: ")&IFERROR(TEXTJOIN("  ·  ",TRUE,FILTER(' + gd + ',' + gb + '=' + key + ',' + ge + '="Required",' + gg + '<>TRUE)),"—"))',
        '=IFERROR("➕ "&TEXTJOIN("  ·  ",TRUE,FILTER(' + gd + ',' + gb + '=' + key + ',' + ge + '="Recommended",' + gg + '<>TRUE)),"✔ Nothing to add")'];
    }), {});
  // fix the literal FALSE of G4 (string) → boolean
  sh.getRange(E_GATE + 3, 12).setValue(false);
  // Totals
  var rows = [
    ['Tasks (excl. cancelled)', '=COUNTIFS(Tasks!$B$4:$B,"<>",Tasks!$L$4:$L,"<>Cancelled")'],
    ['Done', '=COUNTIF(Tasks!$L$4:$L,"Done")'],
    ['Overdue', '=COUNTIF(Tasks!$O$4:$O,"*OVERDUE*")'],
    ['To confirm', '=COUNTIF(Tasks!$L$4:$L,"Not recorded")'],
    ['Current phase No.', '=IFERROR(MAX(FILTER($J$' + E_PH + ':$J$' + (E_PH + 3) + ',$G$' + E_PH + ':$G$' + (E_PH + 3) + '=TRUE)),1)'],
    ['Current phase', '="Phase "&C' + TOT.phaseNo + '&" · "&INDEX($C$' + E_PH + ':$C$' + (E_PH + 3) + ',C' + TOT.phaseNo + ')'],
    ['Gates bypassed', '=COUNTIF($M$' + E_GATE + ':$M$' + (E_GATE + 3) + ',"BYPASSED")'],
    ['Samples sent', '=COUNTA(Samples!$C$4:$C)'],
    ['Feedback received', '=COUNTIF(Samples!$H$4:$H,TRUE)'],
    ['Feedback rate', '=IF(C' + TOT.sent + '=0,0,C' + TOT.fb + '/C' + TOT.sent + ')'],
    ['Sales units (boxes)', '=SUM(Results!$D$5:$D$16)'],
    ['Sales value (VND)', '=SUM(Results!$E$5:$E$16)'],
    ['Progress', '=IF(C' + TOT.total + '=0,0,C' + TOT.done + '/C' + TOT.total + ')']
  ];
  table_(sh, E_TOT - 1, 2, ['Metric', 'Value'], rows, {});
  // Lists for dropdowns
  table_(sh, 3, 17, ['Status'], STATUSES.map(function (s) { return [s]; }), {});
  table_(sh, 3, 18, ['Type'], [['Required'], ['Recommended']], {});
  try { sh.protect().setWarningOnly(true); } catch (_) {}
}
function disp_(ref) {
  return 'SWITCH(' + ref + ',"DONE","✅ DONE","IN PROGRESS","🔄 IN PROGRESS","TO CONFIRM","❓ TO CONFIRM","OVERDUE","⏰ OVERDUE","NOT STARTED","⏸ NOT STARTED","— NO TASKS")';
}

/* ═══ Dữ liệu gốc (tổng hợp từ tab cũ + tài liệu IPR trên Drive) ═══════════════════════════ */
var R_ = { prod: 'Nhóm Sản phẩm', mkt: 'Nhóm Marketing', sales: 'Nhóm Kinh doanh', hsm: 'Head of S&M', gd: 'General Director' };
function taskSeed_() {
  // ID, Step, Workstream, Task, Output / evidence, Role, Owner, Start, Due, Status, [doc label, url], Notes
  return [
    ['1.1', 'S1', 'Thông tin sản phẩm', 'Tổng quan về kỹ thuật IPR', 'Tổng quan về IPR.pdf', R_.prod, 'Giang', '10/05/2025', '14/05/2025', 'Done', ['Tổng quan IPR', L.overview], ''],
    ['1.2', 'S1', 'Thông tin sản phẩm', 'Tổng hợp thông tin sản phẩm IPR-01EF (thông số, chỉ định, IFU)', 'Thông tin IPR 01 EF _Final.pdf', R_.prod, 'Giang', '09/05/2025', '16/05/2025', 'Done', ['Thông tin IPR-01EF', L.infoFinal], ''],
    ['1.3', 'S1', 'Khảo sát thị trường', 'Khảo sát 11 phòng khám về thói quen IPR', 'IPR _ Nghiên cứu thị trường.pdf', R_.prod, 'Giang', '05/05/2025', '23/05/2025', 'Done', ['Nghiên cứu thị trường', L.research], ''],
    ['1.4', 'S1', 'Khảo sát thị trường', 'Tổng hợp nghiên cứu thị trường & kết luận định vị', 'IPR_Tổng hợp nghiên cứu.pdf', R_.prod, 'Giang', '09/05/2025', '03/07/2025', 'Done', ['Tổng hợp nghiên cứu', L.researchSum], ''],
    ['1.5', 'S2', 'Đối thủ', 'Phân tích đối thủ & phân khúc giá', 'IPR_Sản phẩm Vs định vị cạnh tranh.pdf', R_.prod, 'Giang', '05/05/2025', '23/05/2025', 'Done', ['Định vị cạnh tranh', L.compete], ''],
    ['1.6', 'S2', 'Kênh phân phối', 'Thu thập thông tin từ đại lý', 'Thông tin đại lý', R_.sales, '', '', '27/06/2025', 'Done', null, 'Chưa có file trong thư mục.'],
    ['1.7', 'S2', 'Giá', 'Chốt giá kênh phân phối', 'Giá lẻ 250.000 đ / vỉ 5 mũi', R_.prod + ' đề xuất · ' + R_.gd + ' duyệt', 'Ha', '23/05/2025', '31/07/2025', 'Done', null, 'Dùng cho cổng G1.'],
    ['2.1', 'S3', 'Kế hoạch', 'Kế hoạch marketing: định vị, thông điệp, giá, kênh', 'Kế hoạch được duyệt', R_.prod + ' + ' + R_.mkt, '', '', '', 'Not recorded', null, 'Có STP / 4P; chưa có bản kế hoạch được phê duyệt trong thư mục.'],
    ['2.2', 'S3', 'Khảo sát', 'Khảo sát customer insight trước ra mắt', '', R_.prod, 'Giang', '03/07/2025', '10/07/2025', 'Not started', null, 'Tiến độ cũ ghi 0%.'],
    ['2.3', 'S3', 'Nội dung online', 'Kế hoạch nội dung: mini game', 'Content plan', R_.mkt, 'Long', '', '24/06/2025', 'Done', null, ''],
    ['2.4', 'S4', 'Flyer A4', 'Dịch nội dung flyer', 'Bản dịch flyer', R_.prod, 'Giang', '09/05/2025', '10/05/2025', 'Done', ['Thư mục bản dịch', L.dirFlyer], ''],
    ['2.5', 'S4', 'Flyer A4', 'Thiết kế flyer', 'IPR-01EF Brochure VN.pdf', R_.mkt, 'Long', '10/05/2025', '19/05/2025', 'Done', ['Brochure VN', L.brochureVN], ''],
    ['2.6', 'S4', 'Flyer A4', 'In flyer — 1.000 bản', 'Flyer bản in', R_.mkt, 'Long', '', '26/06/2025', 'Done', null, 'Dùng cho cổng G2.'],
    ['2.7', 'S4', 'Standee', 'Thiết kế standee', 'File thiết kế', R_.mkt, 'Long', '16/06/2025', '04/07/2025', 'Done', null, 'Chưa thấy file thiết kế trong MKT Material.'],
    ['2.8', 'S4', 'Standee', 'In standee', 'Standee bản in', R_.mkt, 'Long', '', '09/07/2025', 'Not started', null, 'Tiến độ cũ ghi 0% — in hay huỷ?'],
    ['2.9', 'S4', 'Trưng bày', 'Giá cắm mũi khoan in laser logo MANI, DIA-BURS', 'Giá cắm', R_.mkt, 'Long', '', '27/06/2025', 'Done', null, 'Dùng cho cổng G2.'],
    ['2.10', 'S5', 'Đào tạo', 'Đào tạo nội bộ', 'Buổi đào tạo', R_.prod, 'Giang', '', '18/06/2025', 'Done', null, ''],
    ['2.11', 'S5', 'Đào tạo', 'Đào tạo nhà phân phối', 'Training _ IPR 01 EF _ 25.07.25.pptx', R_.prod, 'Giang', '', '25/07/2025', 'Done', ['Bài đào tạo NPP', L.trainNPP], ''],
    ['3.1', 'S6', 'Dùng thử', 'Gửi mẫu dùng thử cho 21 phòng khám / bác sĩ', 'Danh sách ở tab Samples', R_.hsm, 'Tuyen', '30/06/2025', '07/07/2025', 'Done', null, ''],
    ['3.2', 'S7', 'Khuyến mại', 'Khuyến mại ra mắt: mua 3 hộp IPR tặng 1 hộp Glide Finder', 'Thông báo đại lý 01/08/2025', R_.hsm + ' · ' + R_.gd + ' duyệt', 'Tuyen', '01/08/2025', '10/08/2025', 'Done', ['Thông báo khuyến mại', L.promo], 'Thông báo ghi 01–10/08/2025; tiến độ cũ ghi 04–25/08/2025.'],
    ['3.3', 'S8', 'Online', 'Mở bán online', '', R_.mkt, 'Long', '', '04/08/2025', 'Not recorded', null, 'Tiến độ cũ ghi 0%.'],
    ['3.4', 'S8', 'Online', 'Khuyến mại online', '', R_.mkt, 'Long', '', '04/08/2025', 'Not recorded', null, 'Tiến độ cũ ghi 0%.'],
    ['3.5', 'S8', 'Online', 'Bài đăng sau ra mắt — 4 bài', '', R_.mkt, 'Long', '', '', 'Not recorded', null, ''],
    ['3.6', 'S8', 'Sự kiện', 'Giới thiệu sản phẩm kết hợp workshop chỉnh nha', '', R_.hsm, '', '', '', 'Not recorded', null, 'Chưa có ngày / kết quả.'],
    ['4.1', 'S9', 'Phản hồi', 'Google Form lấy phản hồi dùng thử & thu phản hồi', 'IPR Surveys _MMH — 3 phiếu', R_.prod, 'Giang', '30/06/2025', '25/08/2025', 'Done', ['Kết quả form', L.formResp], 'Tóm tắt ở tab Results.'],
    ['4.2', 'S9', 'Khảo sát cho MANI', 'Khảo sát hình dạng mũi IPR mới (umbrella) — 8 phòng khám', '202609_IPR Survey_Results.xlsx', R_.prod, '', '22/09/2026', '23/09/2026', 'Done', ['Kết quả khảo sát', L.shapeRes], 'Tóm tắt ở tab Results.'],
    ['4.3', 'S9', 'Khảo sát', 'Khảo sát khách hàng lần 2', 'File khảo sát lần 2 (đang trống)', R_.prod, '', '', '', 'Not started', ['File khảo sát lần 2', L.survey2], ''],
    ['4.4', 'S10', 'Đào tạo', 'Đào tạo nội bộ bổ sung về IPR-01EF', 'InternalTraining _ IPR 01 EF _ 31.12.25.pptx', R_.prod, 'Phuong', '', '31/12/2025', 'Done', ['Bài đào tạo nội bộ', L.trainInt], ''],
    ['4.5', 'S10', 'Doanh số', 'Theo dõi doanh số IPR-01EF theo tháng, theo NPP', 'Bảng doanh số ở tab Results', R_.prod + ' · ' + R_.hsm + ' xác nhận', '', '', '', 'Not started', null, 'File chưa có số liệu bán hàng.'],
    ['4.6', 'S11', 'Đánh giá', 'Họp đánh giá sau ra mắt: kết quả, bài học, cải tiến', 'Biên bản đánh giá', R_.hsm + ' · ' + R_.gd + ' duyệt', '', '', '', 'Not started', null, 'Mục "Review" của tiến độ cũ đang trống.']
  ];
}
function gateSeed_() {
  function st(code) { return '=IFERROR(VLOOKUP("' + code + '",Engine!$B$' + E_STEP + ':$K$' + (E_STEP + 10) + ',10,FALSE)="DONE",FALSE)'; }
  function tk(ids) { return '=' + ids.map(function (id) { return 'SUMPRODUCT((Tasks!$B$4:$B="' + id + '")*(Tasks!$L$4:$L="Done"))'; }).join('+') + '>=' + ids.length; }
  // Gate, #, Criterion, Type, Check, Met, Evidence / note, [doc]
  return [
    ['G1', 1, 'Product & market research complete (S1)', 'Required', 'Auto', st('S1'), '', null],
    ['G1', 2, 'Competitor & price analysis complete (S2)', 'Required', 'Auto', st('S2'), '', null],
    ['G1', 3, 'Distributor retail price approved (task 1.7)', 'Required', 'Auto', tk(['1.7']), '', null],
    ['G1', 4, 'General Director confirms the go decision', 'Required', 'Manual', true, 'Xác nhận theo thực tế: sản phẩm đã ra mắt 08/2025.', null],
    ['G1', 5, 'Kick-off minutes stored (08/05/2025)', 'Recommended', 'Manual', false, 'File biên bản trên Drive đang trống.', ['Biên bản 08/05', L.meet0805]],
    ['G1', 6, 'Feasibility approval record stored', 'Recommended', 'Manual', false, '', null],
    ['G2', 1, 'Positioning & marketing plan complete (S3)', 'Required', 'Auto', st('S3'), '', null],
    ['G2', 2, 'Core materials ready: flyer printed, display holder (tasks 2.6, 2.9)', 'Required', 'Auto', tk(['2.6', '2.9']), '', null],
    ['G2', 3, 'Internal and distributor training done (S5)', 'Required', 'Auto', st('S5'), '', null],
    ['G2', 4, 'Launch plan approved: price, promotion, materials', 'Required', 'Manual', false, 'Chưa có bản kế hoạch được phê duyệt trong thư mục.', null],
    ['G2', 5, 'All materials ready, incl. standee (S4)', 'Recommended', 'Auto', st('S4'), '', null],
    ['G3', 1, 'Samples sent to target clinics (S6)', 'Required', 'Auto', st('S6'), '', null],
    ['G3', 2, 'Launch promotion completed (S7)', 'Required', 'Auto', st('S7'), '', null],
    ['G3', 3, 'Online launch & events completed (S8)', 'Required', 'Auto', st('S8'), '', null],
    ['G3', 4, 'Head of S&M confirms the launch is completed', 'Required', 'Manual', false, '', null],
    ['G4', 1, 'Customer feedback & surveys complete (S9)', 'Required', 'Auto', st('S9'), '', null],
    ['G4', 2, 'Sales tracked against targets (S10)', 'Required', 'Auto', st('S10'), '', null],
    ['G4', 3, 'Post-launch review held (S11)', 'Required', 'Auto', st('S11'), '', null],
    ['G4', 4, 'General Director approves project closure', 'Required', 'Manual', false, '', null],
    ['G4', 5, 'Lessons learned stored in the project folder', 'Recommended', 'Manual', false, '', null]
  ];
}
function sampleSeed_() {
  return [
    [1, 'Nikkori Clinic', '', '52 Đ. số 5, Tân Hưng, Quận 7, TP Hồ Chí Minh', 'Hộp', 2, true, 'Có phiếu khảo sát 25/08/2025'],
    [2, 'BS Hạnh — ĐHQG Hà Nội', '', 'Hà Nội', 'Hộp', 1, false, ''],
    [3, 'Minh Thu', '', 'Hà Nội', 'Hộp', '', false, ''],
    [4, 'Trí Đức', '', 'Hà Nội', 'Hộp', '', false, ''],
    [5, 'Parkway', '', 'Hà Nội', 'Hộp', '', false, ''],
    [6, 'Lạc Việt Intech', '', 'Hà Nội', 'Hộp', '', false, ''],
    [7, 'Thùy Anh', '', 'Hà Nội', 'Hộp', '', false, ''],
    [8, 'Global Dental', '', 'Hà Nội', 'Hộp', '', false, ''],
    [9, 'Home Dental', '', 'Hà Nội', 'Hộp', '', false, ''],
    [10, 'Sea Dental', '', 'Hà Nội', 'Hộp', '', false, ''],
    [11, 'Lux Smile Studio (KOL Dũng)', '0866868347', 'Số 19 Đường 34A, P. An Phú, Quận 2, TP Thủ Đức, TP Hồ Chí Minh', 'Hộp', 2, true, 'Có phiếu khảo sát 23/08/2025'],
    [12, 'Nha khoa Thùy (KOL Thùy)', '', 'Bắc Giang', 'Hộp', 3, true, 'Có phiếu khảo sát 20/08/2025'],
    [13, 'Jet Dentist', '', 'Hà Nội', 'Hộp', '', false, ''],
    [14, 'BS Lê Văn Tiên', '0983110024', '170 Nguyễn Hữu Thọ, Hải Châu, Đà Nẵng', 'Hộp', '', false, ''],
    [15, 'Nha khoa Dr Hùng (BS Lan)', '0982136718', '275 Tiểu La, Hải Châu, Đà Nẵng', 'Hộp', '', false, ''],
    [16, 'Nha khoa Việt Anh (BS Việt Anh)', '0901130202', '12 Triệu Nữ Vương, Hải Châu, Đà Nẵng', 'Hộp', '', false, ''],
    [17, 'Nha khoa V-Care (BS Hiếu)', '0387579865', '190 Kinh Dương Vương, Liên Chiểu, Đà Nẵng', 'Hộp', '', false, ''],
    [18, 'Nha khoa Aki (A Phong)', '', 'TP Hồ Chí Minh', 'Hộp', '', false, 'Phản hồi miệng: chất lượng ok'],
    [19, 'Nha khoa Hoa Sứ (Dr Hiếu)', '', 'TP Hồ Chí Minh', 'Hộp', '', false, ''],
    [20, 'Chỉnh nha Huy', '', 'Hải Phòng', 'Hộp', '', false, ''],
    [21, 'RHM Trung ương (BS Hà)', '', 'Hà Nội', 'Hộp', '', false, '']
  ];
}
function actionSeed_() {
  // Issue, Evidence, Action, Role, Status, Notes
  return [
    ['Độ bền mũi', '2/3 phiếu dùng thử góp ý độ bền; 1 ý kiến 2026: mũi dễ hỏng', 'Hướng dẫn "một mũi cho một ca, thay khi giảm cắt"; chuyển ý kiến cho MANI', R_.prod, 'Not started', ''],
    ['Thiếu hình dạng bo góc', '6/8 phòng khám ưa mũi ô có đầu nhọn (09/2026)', 'Gửi kết quả khảo sát cho MANI (dòng IPR-04 / IPR-05)', R_.prod, 'Not recorded', ''],
    ['Chưa có số liệu bán hàng', 'Bảng doanh số trống', 'Điền doanh số theo tháng từ báo cáo doanh số NPP', R_.prod, 'Not started', ''],
    ['Hoạt động online chưa ghi nhận', 'Mở bán / khuyến mại online, 4 bài đăng chưa có trạng thái', 'Nhóm Marketing xác nhận đã làm / chưa làm', R_.mkt, 'Not recorded', ''],
    ['Standee chưa in', 'Tiến độ cũ 0%', 'Quyết định in hay huỷ', R_.mkt, 'Not started', ''],
    ['Thiếu biên bản họp & đánh giá', 'Biên bản 08/05 trống; mục Review trống', 'Họp đánh giá sau ra mắt, lưu biên bản vào thư mục launch', R_.hsm + ' · ' + R_.gd + ' duyệt', 'Not started', ''],
    ['Ngày khuyến mại chưa thống nhất', 'Thông báo 01–10/08/2025 · tiến độ cũ 04–25/08/2025', 'Xác nhận mốc thực tế', R_.hsm, 'Not recorded', '']
  ];
}

/* ═══ Tasks ═════════════════════════════════════════════════════════════════════════════ */
var SPAN0 = 'DATE(2025,5,1)', SPANN = 'DATE(2026,12,31)-DATE(2025,5,1)';
function buildTasks_(ss) {
  var sh = sheet_(ss, TB.tasks, [52, 110, 62, 190, 300, 230, 190, 80, 92, 92, 120, 160, 260, 120, 170], '#5A84A6');
  head_(sh, '✅  TASKS · PIC UPDATE HERE',
    '✏️ PIC cập nhật: Step, Owner, Start, Due, Status (chọn từ danh sách), Document, Notes · ⚙️ Phase, Step name, Flag, Timeline tự tính · Thêm việc mới ở cuối bảng, chọn Step → Launch Flow tự cập nhật.');
  var seed = taskSeed_(), S = SNAP || { tasks: {}, extraTasks: [] };
  var rows = seed.map(function (t) {
    var p = S.tasks[t[0]] || {};
    var doc = t[10];
    return [t[0], '', t[1], '', t[3], t[4], t[5],
      p.owner !== undefined ? p.owner : t[6],
      p.start !== undefined ? p.start : D_(t[7]),
      p.due !== undefined ? p.due : D_(t[8]),
      p.status || t[9],
      p.doc !== undefined && p.doc !== '' ? p.doc : (doc ? doc : ''),
      p.notes !== undefined ? p.notes : t[11], '', ''];
  });
  S.extraTasks.forEach(function (r) { rows.push([r[0], '', r[2], '', r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], '', '']); });
  var BLANK = 20, n = rows.length + BLANK;
  var t = table_(sh, 3, 2, ['ID', '⚙️ Phase', '✏️ Step', '⚙️ Step name', 'Task', 'Output / evidence', 'Role (SOP)', '✏️ Owner',
    '✏️ Start', '✏️ Due', '✏️ Status', '✏️ Document', '✏️ Notes', '⚙️ Flag', '⚙️ Timeline 05/2025 → 12/2026'],
    rows, { blank: n, text: [0], dates: [8, 9], center: [0, 1, 2, 10, 13], calc: [1, 3, 13], links: [11] });
  // công thức mảng ở dòng đầu (ghi đè ô trống cột C, E, O)
  sh.getRange(4, 3, n, 1).clearContent(); sh.getRange(4, 5, n, 1).clearContent(); sh.getRange(4, 15, n, 1).clearContent();
  sh.getRange(4, 3).setFormula('=ARRAYFORMULA(IF(D4:D="","",IFERROR(VLOOKUP(D4:D,Engine!$B$' + E_STEP + ':$C$' + (E_STEP + 10) + ',2,FALSE),"")))');
  sh.getRange(4, 5).setFormula('=ARRAYFORMULA(IF(D4:D="","",IFERROR(VLOOKUP(D4:D,Engine!$B$' + E_STEP + ':$E$' + (E_STEP + 10) + ',4,FALSE)&"  "&VLOOKUP(D4:D,Engine!$B$' + E_STEP + ':$D$' + (E_STEP + 10) + ',3,FALSE),"")))');
  sh.getRange(4, 15).setFormula('=ARRAYFORMULA(IF(B4:B="","",IF((K4:K<>"")*(K4:K<TODAY())*((L4:L="In progress")+(L4:L="Not started")),"⏰ OVERDUE",IF(L4:L="Not recorded","❓ TO CONFIRM",IF(L4:L="Done","✅","")))))');
  // timeline (sparkline) từng dòng
  var f = [];
  for (var i = 0; i < n; i++) {
    var r = 4 + i;
    f.push(['=IF(K' + r + '="","",SPARKLINE({MAX(0,IF(J' + r + '="",K' + r + '-7,J' + r + ')-' + SPAN0 + '),MAX(3,K' + r + '-IF(J' + r + '="",K' + r + '-7,J' + r + '))},' +
      '{"charttype","bar";"max",' + SPANN + ';"color1","white";"color2",IF(L' + r + '="Done","' + C_.teal + '",IF(O' + r + '="⏰ OVERDUE","' + C_.red + '","' + C_.acc2 + '"))}))']);
  }
  sh.getRange(4, 16, n, 1).setFormulas(f);
  // nhập liệu
  sh.getRange(4, 4, n, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName(TB.eng).getRange('B' + E_STEP + ':B' + (E_STEP + 10)), true).setAllowInvalid(false).build());
  var st = sh.getRange(4, 12, n, 1);
  st.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  sh.getRange(4, 10, n, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());
  sh.setFrozenRows(3); sh.setFrozenColumns(2);
  sh.getRange(3, 2, 1, 15).setVerticalAlignment('middle');
  var all = sh.getRange(4, 2, n, 15), fl = sh.getRange(4, 15, n, 1);
  sh.setConditionalFormatRules([
    cf_(st, '=$L4="Done"', C_.tealL, '#2F6F66', true),
    cf_(st, '=$L4="In progress"', '#E1EBF4', C_.navy, true),
    cf_(st, '=$L4="Not recorded"', C_.yel, '#7A5B12', true),
    cf_(st, '=$L4="Not started"', C_.pale, C_.acc, true),
    cf_(st, '=$L4="Cancelled"', '#EEEEEE', '#999999', false),
    cf_(fl, '=REGEXMATCH($O4,"OVERDUE")', C_.redL, '#8A4A3A', true),
    cf_(fl, '=REGEXMATCH($O4,"CONFIRM")', C_.yel, '#7A5B12', true),
    cf_(all, '=$L4="Cancelled"', null, '#AAAAAA', false)
  ]);
  sh.setRowHeights(4, n, 30);
}

/* ═══ Gates ═════════════════════════════════════════════════════════════════════════════ */
function buildGates_(ss) {
  var sh = sheet_(ss, TB.gates, [60, 36, 380, 110, 80, 90, 360, 170], '#5A84A6');
  head_(sh, '🚦  GATES · WHY THE PROJECT MOVES ON',
    '⚙️ Auto = tính từ Tasks · ✏️ Manual = người quyết định tick ô và ghi bằng chứng · Cổng PASSED khi mọi tiêu chí Required đạt; nếu giai đoạn sau đã chạy mà cổng chưa đạt ⇒ BYPASSED.');
  var g = gateSeed_(), S = SNAP || { gates: {} };
  var rows = g.map(function (r) {
    var k = r[0] + '|' + r[2], p = S.gates[k];
    var met = r[5], note = r[6], doc = r[7];
    if (p && r[4] === 'Manual') { met = p.met === true; note = p.note; doc = p.doc || doc; }
    return [r[0], r[1], r[2], r[3], r[4], met, note, doc || ''];
  });
  var t = table_(sh, 3, 2, ['Gate', '#', 'Criterion', 'Type', 'Check', '✏️ Met?', '✏️ Evidence / note', '✏️ Document'], rows,
    { center: [0, 1, 3, 4, 5], bold: [0], links: [7] });
  rows.forEach(function (r, i) {
    var c = sh.getRange(4 + i, 7);
    if (r[4] === 'Manual') { c.insertCheckboxes(); c.setValue(r[5] === true); }
    else c.setFontStyle('italic');
    if (i > 0 && r[0] !== rows[i - 1][0]) sh.getRange(4 + i, 2, 1, 8).setBorder(true, null, null, null, null, null, C_.acc, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });
  var met = sh.getRange(4, 7, rows.length, 1);
  sh.setConditionalFormatRules([
    cf_(met, '=$G4=TRUE', C_.tealL, '#2F6F66', true),
    cf_(met, '=AND($G4<>TRUE,$E4="Required")', C_.redL, '#8A4A3A', true),
    cf_(met, '=AND($G4<>TRUE,$E4="Recommended")', C_.yel, '#7A5B12', true),
    cf_(sh.getRange(4, 5, rows.length, 1), '=$E4="Recommended"', null, C_.acc, false)
  ]);
  sh.setFrozenRows(3);
  sh.setRowHeights(4, rows.length, 30);
  // bảng tổng hợp cổng (đọc Engine) bên dưới
  var r0 = t.r1 + 2;
  section_(sh, r0, 2, 8, '📋  GATE SUMMARY (calculated)');
  var sum = GATES.map(function (gg, i) {
    var er = E_GATE + i;
    return [gg[0], '', gg[1], '=Engine!N' + er, '', '', '=Engine!O' + er, '=Engine!P' + er];
  });
  table_(sh, r0 + 1, 2, ['Gate', '', 'Name', 'Status', '', '', 'Why', 'To add'], sum, { bold: [0, 2] });
  sh.getRange(r0 + 2, 5, 4, 3).mergeAcross();
  sh.setRowHeights(r0 + 2, 4, 48);
  var stc = sh.getRange(r0 + 2, 5, 4, 3);
  var rules = sh.getConditionalFormatRules();
  GATE_COLORS.forEach(function (c) { rules.push(cf_(stc, '=REGEXMATCH($E' + (r0 + 2) + ',"' + c[0] + '")', c[1], c[2], true)); });
  sh.setConditionalFormatRules(rules);
}

/* ═══ Samples ═══════════════════════════════════════════════════════════════════════════ */
function buildSamples_(ss) {
  var sh = sheet_(ss, TB.smp, [44, 240, 110, 340, 60, 50, 110, 280], '#5A84A6');
  head_(sh, '📦  SAMPLES · TRIAL & FEEDBACK',
    '✏️ PIC tick "Feedback received" khi bác sĩ đã gửi phản hồi và ghi tóm tắt ở Notes · Thêm nơi nhận mẫu mới ở cuối bảng · Tỷ lệ phản hồi tự tính trên Launch Flow.');
  var S = SNAP || { samples: {}, extraSamples: [] };
  var rows = sampleSeed_().map(function (r) {
    var p = S.samples[r[1]]; var x = r.slice();
    if (p) { x[6] = p.fb === true; x[7] = p.note; }
    return x;
  });
  S.extraSamples.forEach(function (r) { rows.push([r[0], r[1], r[2], r[3], r[4], r[5], r[6] === true, r[7]]); });
  var t = table_(sh, 3, 2, ['No', 'Clinic / dentist', 'Phone', 'Address', 'Unit', 'Qty', '✏️ Feedback received', '✏️ Feedback / notes'],
    rows, { blank: rows.length + 10, text: [2], center: [0, 4, 5, 6] });
  sh.getRange(4, 4, rows.length, 1).setValues(rows.map(function (r) { return [String(r[2])]; }));
  sh.getRange(4, 8, t.n, 1).insertCheckboxes();
  sh.getRange(4, 8, rows.length, 1).setValues(rows.map(function (r) { return [r[6] === true]; }));
  sh.setConditionalFormatRules([cf_(sh.getRange(4, 2, t.n, 8), '=$H4=TRUE', C_.tealL, null, false)]);
  sh.setFrozenRows(3);
  sh.setRowHeights(4, t.n, 28);
}

/* ═══ Results ═══════════════════════════════════════════════════════════════════════════ */
function buildResults_(ss) {
  var sh = sheet_(ss, TB.res, [230, 170, 150, 170, 240, 130, 220], '#5A84A6');
  head_(sh, '📈  RESULTS · MEASURE & OPTIMIZE',
    '✏️ PIC điền doanh số mỗi tháng và cập nhật trạng thái việc cải tiến · KPI có ⚙️ tự tính từ Tasks / Samples.');
  var S = SNAP || { sales: {}, actions: {} };
  // A — sales (row 3 section, header 4, rows 5–16, total 17) — Engine đọc D5:D16, E5:E16
  section_(sh, 3, 2, 7, '📈  MONTHLY SALES · IPR-01EF (fill each month)');
  var months = [];
  for (var m = 0; m < 12; m++) { var d = new Date(2025, 7 + m, 1); months.push(Utilities.formatDate(d, 'Asia/Bangkok', 'MM/yyyy')); }
  var srows = months.map(function (mm) { var p = S.sales[mm] || ['', '', '', '']; return [mm, p[0], p[1], p[2], p[3]]; });
  table_(sh, 4, 2, ['Month', '✏️ Distributor', '✏️ Units (boxes)', '✏️ Value (VND)', '✏️ Note'], srows, { text: [0], center: [0, 2] });
  sh.getRange(17, 2, 1, 5).setValues([['TOTAL', '', '', '', '']]).setFontWeight('bold').setBackground(C_.pale).setFontColor(C_.navy);
  sh.getRange(17, 4).setFormula('=SUM(D5:D16)'); sh.getRange(17, 5).setFormula('=SUM(E5:E16)');
  sh.getRange(5, 4, 13, 1).setNumberFormat('#,##0').setHorizontalAlignment('center');
  sh.getRange(5, 5, 13, 1).setNumberFormat('#,##0');
  var r = 19;
  section_(sh, r, 2, 7, '🎯  LAUNCH KPIs');
  var tk = function (id) { return 'SUMPRODUCT((Tasks!$B$4:$B="' + id + '")*(Tasks!$L$4:$L="Done"))>0'; };
  table_(sh, r + 1, 2, ['Metric', '✏️ Target', '⚙️ Actual', 'Source', 'Note'], [
    ['Samples sent (clinics)', '', '=Engine!C' + TOT.sent, 'Samples', ''],
    ['Feedback received', '', '=Engine!C' + TOT.fb + '&" / "&Engine!C' + TOT.sent + '&"  ("&TEXT(Engine!C' + TOT.rate + ',"0%")&")"', 'Samples', ''],
    ['Precision rated good or better', '', '3 / 3', 'Trial form 08/2025', ''],
    ['Distributor training before launch', 'Trước ngày ra mắt', '=IF(' + tk('2.11') + ',"✅ Done","Not yet")', 'Tasks 2.11', ''],
    ['Core materials ready', 'Trước ngày ra mắt', '=IF(' + tk('2.6') + ',"✅ Flyer","— Flyer")&"  ·  "&IF(' + tk('2.9') + ',"✅ Holder","— Holder")&"  ·  "&IF(' + tk('2.8') + ',"✅ Standee","— Standee")', 'Tasks', ''],
    ['Sales units (boxes)', '', '=IF(Engine!C' + TOT.units + '=0,"No data yet",TEXT(Engine!C' + TOT.units + ',"#,##0"))', 'Monthly sales', ''],
    ['Sales value (VND)', '', '=IF(Engine!C' + TOT.value + '=0,"No data yet",TEXT(Engine!C' + TOT.value + ',"#,##0"))', 'Monthly sales', ''],
    ['Overall task progress', '', '=TEXT(Engine!C' + TOT.ratio + ',"0%")&"  ("&Engine!C' + TOT.done + '&" / "&Engine!C' + TOT.total + '&")"', 'Tasks', '']
  ], { bold: [0], calc: [2] });
  r = 30;
  section_(sh, r, 2, 7, '💬  TRIAL FEEDBACK · Google Form, 3 responses (20–25/08/2025)');
  table_(sh, r + 1, 2, ['Question', 'Nha khoa Thùy', 'Lux Smile Studio', 'Nikkori Dental Clinic', 'Summary'], [
    ['Profile', 'General dentist · 6–10 years', 'General dentist · 6–10 years', 'General dentist · 6–10 years', '3/3 general dentists'],
    ['IPR cases / month', '1–5', '1–5', '6–15', ''],
    ['Precision', 'Xuất sắc', 'Tốt', 'Tốt', '3/3 tốt trở lên'],
    ['Vibration vs usual IPR bur', 'Giảm rõ rệt', 'Giảm vừa', 'Giảm vừa', '3/3 giảm rung'],
    ['Surface after IPR', 'Mịn, đánh bóng ít', 'Mịn, đánh bóng ít', 'Rất mịn, không cần đánh bóng', '3/3 mịn'],
    ['Best for', 'Mài kẽ vừa 0,2–0,5 mm', 'Mài kẽ tối thiểu < 0,2 mm', 'Mài kẽ tối thiểu < 0,2 mm', ''],
    ['Ease of use', 'Dễ', 'Dễ', 'Rất dễ', '3/3 dễ hoặc rất dễ'],
    ['Most effective on', 'Cửa giữa, cửa bên, nanh', 'Cửa giữa', 'Cửa giữa, cửa bên', 'Cửa giữa: 3/3'],
    ['Main advantages', 'Giảm rung · tiết kiệm thời gian · bệnh nhân dễ chịu', 'Chính xác hơn · giảm rung · dễ kiểm soát', 'Chính xác hơn · giảm rung · bề mặt tốt', 'Giảm rung 3/3 · chính xác 2/3'],
    ['To improve', 'Độ bền', 'Độ bền', 'Không cần', 'Độ bền 2/3']
  ], { bold: [0] });
  r = 43;
  section_(sh, r, 2, 7, '🔬  SHAPE SURVEY FOR MANI · 8 clinics (22–23/09/2026)');
  table_(sh, r + 1, 2, ['Question', 'Result', 'Comment'], [
    ['Orthodontic specialists', '6 / 8', ''],
    ['Main brand used', 'MANI 4 / 8', 'Khác: CNM, Komet, nhiều hãng'],
    ['Preferred shape', 'Umbrella with pointed tip 6 / 8', 'Không chọn dạng ô: 2 / 8'],
    ['IPR-05EF vs IPR-05EF-02', 'Both 2 · IPR-05EF-02 2 · Neither 3', 'Không trả lời: 1'],
    ['Would buy / switch on release', 'Yes 8 / 8', ''],
    ['Most repeated comment', 'Mở điểm tiếp xúc bằng đầu nhọn rồi bo góc bằng cùng một mũi', '1 ý kiến: mũi dễ hỏng (gãy, cháy) nên cần giá thấp hơn']
  ], { bold: [0] });
  r = 52;
  section_(sh, r, 2, 7, '🛠️  IMPROVEMENT ACTIONS');
  var acts = actionSeed_().map(function (a) { var p = S.actions[a[0]]; var x = a.slice(); if (p) { x[4] = p.status || x[4]; x[5] = p.note; } return x; });
  var t = table_(sh, r + 1, 2, ['Issue', 'Evidence', 'Action', 'Role (SOP)', '✏️ Status', '✏️ Notes'], acts, { bold: [0], center: [4] });
  var st = sh.getRange(r + 2, 6, acts.length, 1);
  st.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
  sh.setConditionalFormatRules([
    cf_(st, '=$F' + (r + 2) + '="Done"', C_.tealL, '#2F6F66', true),
    cf_(st, '=$F' + (r + 2) + '="In progress"', '#E1EBF4', C_.navy, true),
    cf_(st, '=$F' + (r + 2) + '="Not recorded"', C_.yel, '#7A5B12', true),
    cf_(st, '=$F' + (r + 2) + '="Not started"', C_.pale, C_.acc, true)
  ]);
}

/* ═══ Feasibility · Launch Plan · Documents ═══ */
function buildFeas_(ss) {
  var w = W2_(ss, TB.feas, [190, 190, 190, 190, 190, 200], '#99C1DE');
  wTitle_(w, '🔎  FEASIBILITY · PHASE 1', '✏️ Nhóm Sản phẩm cập nhật khi có thông tin mới · Cơ sở cho cổng G1 (Go / No-go).');

  wSection_(w, '🦷  A. PRODUCT INFORMATION');
  wKV_(w, [
    ['Product', 'MANI DIA-BURS® IPR-01EF — mũi khoan kim cương siêu mịn chuyên cho mài kẽ (IPR) trong chỉnh nha'],
    ['Pack · retail price', '5 mũi / vỉ · 250.000 đ / vỉ'],
    ['Manufacturer', 'MANI HANOI CO.,LTD. — nhà máy Phổ Yên · Xuất xứ: Việt Nam'],
    ['Materials', 'Thân & cán: thép không gỉ (chứa nickel, chromium) · Lớp phủ: hạt kim cương siêu mịn (ultra-fine)'],
    ['Dimensions', 'Đầu mũi Ø 0,19 mm (mũi kim cương mỏng nhất của MANI) · Ø lớn nhất phần làm việc 0,44 mm · Dài phần làm việc 5,6 mm · Dài tổng 21,0 mm · Độ thuôn ≈ 1,28°'],
    ['Handpiece · speed', 'Tay khoan nhanh · tối đa 160.000 vòng/phút'],
    ['Indications', 'Chỉnh nha khay trong suốt (aligner): mài kẽ tiêu chuẩn 0,2–0,5 mm, tạo khoảng tối thiểu cho dịch chuyển răng · Chen chúc vừa · Cân bằng tỷ lệ răng hai hàm · Điều chỉnh hô nhẹ · Cải thiện khớp cắn · Điều chỉnh trong niềng mắc cài'],
    ['Contraindications', 'Răng vĩnh viễn trẻ em · Thiểu sản men · Quá mẫn ngà · Sâu răng kẽ · Chân răng sát nhau'],
    ['Clinical benefit', 'Thời gian thao tác bằng 1/5 so với đầu khuỷu thông thường, 1/10 so với dải mài tay · Một mũi dùng cho toàn bộ quy trình mài kẽ hai hàm · Bề mặt mịn, trượt êm'],
    ['How to use', 'Đặt ở cổ răng → di chuyển về rìa cắn · Tiếp cận mặt má hoặc mặt lưỡi · Lực nhẹ ("feather touch") · Bắt buộc đặt đê cao su và làm mát bằng nước'],
    ['Sterilization · storage', 'Không vô trùng — tiệt trùng trước khi dùng: autoclave 121 °C / 20 phút hoặc 126 °C / 15 phút · Tránh nhiệt độ cao, ẩm, ánh sáng trực tiếp · Thay khi giảm khả năng cắt'],
    ['Sources', 'Thông tin IPR 01 EF _Final.pdf · IPR-01EF brochure · Clinical report · DIA-BURS IFU (tab Documents)']
  ]);

  wSection_(w, '🌏  B. MARKET CONTEXT');
  wKV_(w, [
    ['Demand', 'Chỉnh nha hiện đại, đặc biệt khay trong suốt (CAGR phân khúc ≈ 7,6%), tăng nhanh tại Việt Nam ⇒ nhu cầu mài kẽ (IPR) tăng: tạo khoảng, giải quyết chen chúc nhẹ–vừa, cân chỉnh tỷ lệ Bolton, giảm tam giác đen, hỗ trợ ổn định sau niềng'],
    ['Trends', 'Nha khoa bảo tồn, thẩm mỹ và kỹ thuật số thuận lợi cho IPR-01EF'],
    ['Data gaps', 'Chưa có số liệu chính thức về lượng dùng IPR mỗi năm; chưa có quy chuẩn số dụng cụ / ca và thời điểm thay dụng cụ ⇒ cần khảo sát thêm'],
    ['Current tools', 'Dải mài tay: kiểm soát tốt nhưng chậm, kém hiệu quả khi chen chúc · Dải mài gắn tay khoan: rung mạnh, khó kiểm soát · Đĩa mài: nguy cơ tổn thương mô mềm · Mũi khoan đang bán: đa số đầu to, độ thuôn lớn (> 2%), khó đạt độ chính xác 0,2–0,5 mm của aligner'],
    ['IPR by treatment type', 'Niềng mắc cài: IPR là công cụ hỗ trợ, yêu cầu chính xác tương đối, mài sai có thể khắc phục (⭐⭐⭐) · Niềng trong suốt: IPR là phần bắt buộc của kế hoạch, cần chính xác đến 0,1 mm theo phần mềm, sai số ảnh hưởng trực tiếp (⭐⭐⭐⭐) · Nội nha, phục hồi, phục hình, ngoại khoa, nhi, implant, nha chu: không dùng']
  ]);

  wSection_(w, '🔍  C. MARKET SURVEY 2025 · 11 CLINICS');
  wKV_(w, [
    ['Sample', '8/11 bác sĩ chỉnh nha chuyên sâu, 3/11 nha sĩ tổng quát · Tổng ≈ 870 ca chỉnh nha / tháng'],
    ['IPR habits', '10/11 dùng IPR thường xuyên · 8/10 phối hợp nhiều dụng cụ (dải mài – mũi khoan – đĩa) · 4 phòng khám dùng cả 3 loại'],
    ['How tools are combined', 'Dải mài: vùng chen chúc, dễ kiểm soát · Mũi khoan: nhanh, dễ tạo gờ tiếp xúc · Đĩa: hoàn thiện thẩm mỹ'],
    ['Rounding after IPR', '100% bác sĩ bo tròn sau mài · 7/11 dùng mũi hình ô (umbrella) hoặc đầu tròn · Một số bác sĩ khó thao tác góc cạnh vì hình dạng mũi chưa phù hợp'],
    ['Technique', '6/11 thay đổi góc thao tác linh hoạt; thao tác theo trục răng giúp kiểm soát và quan sát tốt hơn'],
    ['Use of IPR burs', 'Bác sĩ chỉnh nha: 66% có dùng mũi IPR khi mài kẽ · Nha sĩ tổng quát làm chỉnh nha: 46%']
  ]);

  wSection_(w, '🎯  D. SEGMENTS & TARGET CUSTOMERS');
  wTable_(w, ['Criterion', 'Orthodontist', 'General dentist doing ortho', 'Student'], [
    ['Profile', 'Chuyên sâu, điều trị ca khó (≈ 80 ca chỉnh nha / tháng)', 'Điều trị tiêu chuẩn tại phòng khám tư, đa dạng bệnh nhân', 'Đang học & thực hành, chi phí thấp'],
    ['Buying preference', 'Ưu tiên chất lượng, độ chính xác, hiệu suất', 'An toàn, dễ dùng, hướng dẫn rõ, giá hợp lý, đa dụng', 'Giá rẻ, quan tâm concept sản phẩm / điều trị'],
    ['What attracts them', 'Chất lượng, độ bền, hiệu suất, độ chính xác cao', 'Giá hợp lý, dễ thao tác, sẵn hàng, độ bền chấp nhận được', 'Giá thấp, dễ thao tác, có ở trường / kênh giáo dục'],
    ['MANI fit', '4/5 — đạt chất lượng, độ chính xác, nhanh hơn 5–10 lần dải mài; chưa có trọn bộ concept', '3/5 — đạt chất lượng; hình dạng chuyên cho aligner nên ít tương thích chỉ định mài kẽ khác', '2/5 — chất lượng tốt nhưng thiếu thông tin concept, giá cao'],
    ['MANI target share', '35%', '60%', '5%']
  ], { bold: [0] });
  wTable_(w, ['Customer group', 'Hospitals', 'Universities', 'Clinics'], [
    ['Share of demand', '5%', '3%', '92%'],
    ['Number', '150–200 bệnh viện', '23 trường', '≈ 12.000 phòng khám'],
    ['How they buy', 'Thầu / ngoài thầu; nhiều cấp duyệt (khoa đề xuất → vật tư thẩm định → giám đốc duyệt)', 'Thầu / ngoài thầu; quyết định từ trưởng bộ môn / giảng viên', 'Ngoài thầu; chủ phòng khám chốt nhanh'],
    ['Price expectation', 'Trung bình – cao', 'Thấp – trung bình', 'Dao động lớn theo quy mô']
  ], { bold: [0] });

  wSection_(w, '🏷️  E. COMPETITORS & PRICE');
  wTable_(w, ['Brand', 'Product', 'Price', 'Price / bur', 'Distributor', 'Note'], [
    ['MANI (Nhật)', 'IPR-01EF — mũi đơn, chuyên cho mài kẽ khay trong suốt', '250.000 đ / vỉ 5 mũi', '≈ 50.000 đ', 'MMH → nhà phân phối → đại lý', 'Đầu Ø 0,19 mm, độ thuôn ≈ 1,28°, hạt siêu mịn'],
    ['Strauss & Co (Israel)', 'IPR kit 7 mũi; mũi lẻ J316, E11S', '1.690.000 đ / bộ 7 mũi', '180.000–187.000 đ', 'Nha khoa Thái Bình Dương (1 NPP)', 'Hãng duy nhất có trọn bộ IPR · E11S Ø 0,11 mm · J316 hình ô bo cạnh'],
    ['NTI (Đức)', '859L-010UF — mũi cắt kẽ chỉnh nha / phục hình', '79.000 đ / mũi', '79.000 đ', 'DOE (> 20 đại lý)', 'Mũi hình trụ, thông dụng'],
    ['MDT (Israel)', '465-392 016F — mũi cắt kẽ', '30.000–35.000 đ / mũi', '30.000–35.000 đ', 'Đại Tấn', 'Giá rẻ, đầu nhọn – thon']
  ], { bold: [0] });
  wTable_(w, ['Price segment (diamond burs)', 'High', 'Medium', 'Low'], [
    ['Reference price', '51.000–68.000 đ / mũi', '32.000–44.000 đ / mũi', '6.000–26.000 đ / mũi'],
    ['Market share', '6%', '93%', '1%'],
    ['Brands', 'Dian Fong, DFS, Edenta, NTI, Okodent, Brasseler, Rotatec, Shofu, MDT', 'Drendel + Zweiling, Osstem, MANI', 'Verdent, Reco-Dental, Muller India'],
    ['Pros / cons', 'Cao cấp, hiệu suất tối ưu / giá cao, kén khách', 'Cân bằng giá – chất lượng / cạnh tranh mạnh từ hàng Trung Quốc', 'Rẻ, dễ tiếp cận / chất lượng, độ bền kém']
  ], { bold: [0] });

  wSection_(w, '✅  F. FEASIBILITY CONCLUSION');
  wKV_(w, [
    ['Conclusion', 'IPR-01EF có định vị rõ: mũi siêu mảnh, mài chính xác – nhanh – êm cho vùng chen chúc, phù hợp xu hướng chỉnh nha khay trong suốt tại Việt Nam'],
    ['To clarify', '(1) Số dụng cụ IPR thực tế cần cho mỗi ca · (2) Quy trình / thời điểm thay dụng cụ'],
    ['Gate G1', 'Đã chốt giá lẻ 250.000 đ / vỉ (31/07/2025) và triển khai ra mắt 08/2025. Chưa có biên bản phê duyệt khả thi trong thư mục.']
  ]);
}

function buildPlan_(ss) {
  var w = W2_(ss, TB.plan, [200, 230, 230, 230, 230], '#99C1DE');
  wTitle_(w, '🗺️  LAUNCH PLAN · PHASE 2', '✏️ Nhóm Sản phẩm + Nhóm Marketing cập nhật · Head of S&M xác nhận, General Director duyệt (cổng G2).');

  wSection_(w, '🎯  A. POSITIONING & KEY MESSAGES');
  wKV_(w, [
    ['Positioning', 'Giải pháp mài kẽ chính xác, nhanh và an toàn — tối ưu cho chỉnh nha khay trong suốt (aligner)'],
    ['Message 1 · Precise', 'Đầu mũi Ø 0,19 mm, độ thuôn ≈ 1,28° — kiểm soát lượng mài 0,2–0,5 mm, xâm lấn tối thiểu'],
    ['Message 2 · Fast', 'Thời gian thao tác bằng 1/5 đầu khuỷu thông thường, 1/10 dải mài tay; một mũi cho cả hai hàm'],
    ['Message 3 · Smooth', 'Hạt kim cương siêu mịn — giảm rung, bề mặt mịn, bệnh nhân dễ chịu hơn'],
    ['Target customers', 'Phòng khám chỉnh nha (đặc biệt khay trong suốt) và nha sĩ tổng quát có làm chỉnh nha — tỷ trọng mục tiêu 35% bác sĩ chỉnh nha · 60% nha sĩ tổng quát · 5% sinh viên']
  ]);

  wSection_(w, '🧩  B. MARKETING MIX (4P)');
  wTable_(w, ['4P', 'Content', 'Note'], [
    ['Product', 'IPR-01EF — mũi khoan kim cương đơn, chuyên cho mài kẽ trong niềng khay trong suốt; chỉ định: cân bằng tỷ lệ răng, giải quyết chen chúc, tăng ổn định sau niềng, thay thế nhổ răng', 'Đối thủ Strauss & Co có trọn bộ; MANI hiện có 1 mũi'],
    ['Price', '250.000 đ / vỉ 5 mũi (≈ 50.000 đ / mũi)', 'Phân khúc giá trung bình – cao; thấp hơn nhiều so với mũi lẻ Strauss (180.000 đ)'],
    ['Place', 'MANI → nhà phân phối → đại lý → người dùng (bệnh viện / trường / phòng khám)', 'Duy trì mạng ≈ 200 đại lý với tồn kho và chính sách giá ổn định'],
    ['Promotion', 'Offline: kết hợp workshop chỉnh nha · Online: Facebook (sản phẩm mới, mini game) · Nội dung KOL · Thăm đại lý, thăm phòng khám · Gửi mẫu dùng thử · Khuyến mại ra mắt', 'Chi tiết thời gian: tab Tasks']
  ], { bold: [0] });

  wSection_(w, '🖨️  C. MATERIALS & SALES TOOLS');
  wTable_(w, ['Item', 'Output', 'Quantity', 'Status', 'Document'], [
    ['Flyer A4 (bản tiếng Việt)', 'IPR-01EF Brochure VN', '1.000 bản in', 'Done', ['Brochure VN', L.brochureVN]],
    ['Standee', 'Thiết kế xong; chưa in', 'Chưa ghi nhận', 'Not started', ['', '']],
    ['Giá cắm mũi khoan', 'In laser logo MANI, DIA-BURS', 'Chưa ghi nhận', 'Done', ['', '']],
    ['Catalogue / bản dịch catalogue', 'IPR-01EF _ Catalogue.pdf · Bản dịch Catalog mũi khoan IPR', '—', 'Done', ['Catalogue', L.catalogue]],
    ['Ảnh sản phẩm', 'IPR-01EF.png', '—', 'Done', ['Ảnh', L.img]],
    ['Thông số kỹ thuật (hồ sơ thầu)', 'TSKT _ Mũi khoan IPR.xlsx', '—', 'Done', ['TSKT', L.tskt]]
  ], { link: 4, center: [3] });

  wSection_(w, '🎓  D. TRAINING');
  wTable_(w, ['Audience', 'Content', 'Date', 'Document'], [
    ['Nội bộ (Sales / Marketing)', 'Đào tạo sản phẩm IPR-01EF', '18/06/2025', ['', '']],
    ['Nhà phân phối', 'Đào tạo sản phẩm IPR-01EF cho NPP', '25/07/2025', ['Training NPP 25.07.25', L.trainNPP]],
    ['Nội bộ (bổ sung)', 'Đào tạo nội bộ IPR-01EF', '31/12/2025', ['InternalTraining 31.12.25', L.trainInt]]
  ], { link: 3, center: [2] });

  wSection_(w, '🎁  E. LAUNCH PROMOTION');
  wKV_(w, [
    ['Offer', 'Mua 03 hộp IPR — tặng 01 hộp Glide Finder'],
    ['Who', 'Đại lý, đại lý trực thuộc, khách lẻ mặt hàng nha khoa MANI'],
    ['Period', '01/08/2025 – 10/08/2025 (theo thông báo đại lý ngày 01/08/2025). Tiến độ cũ ghi 04–25/08/2025.'],
    ['Result', 'Chưa ghi nhận số hộp bán / số hộp tặng — cập nhật tại tab Results']
  ]);
}

function buildDocs_(ss) {
  var w = W2_(ss, TB.docs, [44, 170, 120, 330, 300, 120], '#99C1DE');
  wTitle_(w, '📁  DOCUMENTS · PROJECT FILE MAP', '✏️ PIC thêm 1 dòng khi lưu tài liệu mới vào thư mục dự án · bấm 🔗 Open để mở.');
  var rows = [
    ['General', 'Folder', 'Thư mục 2025 Launching IPR Dia-Burs', 'Thư mục gốc của dự án', ['🔗 Open', L.dirLaunch]],
    ['General', 'Folder', 'MKT Material', 'Ấn phẩm, catalogue, ảnh, IFU, TSKT', ['🔗 Open', L.dirMkt]],
    ['General', 'Folder', 'Training', 'Bài đào tạo nhà phân phối', ['🔗 Open', L.dirTrain]],
    ['General', 'Minutes', 'IPR Lauching Họp 08/05', 'Họp khởi động — file đang trống', ['🔗 Open', L.meet0805]],
    ['P1 · Feasibility', 'Research', 'Thư mục 202507 Market Research - IPR final Report', 'Báo cáo nghiên cứu thị trường IPR', ['🔗 Open', L.dirResearch]],
    ['P1 · Feasibility', 'Research', 'Thư mục Dự án IPR', 'Bản tổng hợp nghiên cứu, thông tin sản phẩm, khảo sát hình dạng', ['🔗 Open', L.dirProject]],
    ['P1 · Feasibility', 'Research', 'Tổng quan về IPR.pdf', 'Tổng quan kỹ thuật mài kẽ', ['🔗 Open', L.overview]],
    ['P1 · Feasibility', 'Research', 'IPR _ Nghiên cứu thị trường.pdf', 'Khảo sát 11 phòng khám, thói quen IPR', ['🔗 Open', L.research]],
    ['P1 · Feasibility', 'Research', 'IPR_Tổng hợp nghiên cứu.pdf', 'Bối cảnh, định vị, đối thủ, kết luận', ['🔗 Open', L.researchSum]],
    ['P1 · Feasibility', 'Research', 'IPR_Sản phẩm Vs định vị cạnh tranh.pdf', 'So sánh sản phẩm & định vị', ['🔗 Open', L.compete]],
    ['P1 · Feasibility', 'Product', 'Thông tin IPR 01 EF _Final.pdf', 'Thông số, chỉ định, chống chỉ định, tiệt trùng', ['🔗 Open', L.infoFinal]],
    ['P1 · Feasibility', 'Product', 'IPR 01EF_Thông tin tổng hợp.pdf', 'Thông tin tổng hợp sản phẩm', ['🔗 Open', L.infoSum]],
    ['P1 · Feasibility', 'Product', 'Mani IPR 01 EF_04_14_report.pdf', 'Báo cáo lâm sàng của MANI', ['🔗 Open', L.clinical]],
    ['P1 · Feasibility', 'Product', 'IPR IFU.pdf', 'Hướng dẫn sử dụng', ['🔗 Open', L.ifu]],
    ['P1 · Feasibility', 'Product', 'MANI — IPR-01EF.pdf (web)', 'Brochure gốc của MANI', ['🔗 Open', L.maniPdf]],
    ['P1 · Feasibility', 'Product', 'MANI — dental_04_14_report.pdf (web)', 'Báo cáo lâm sàng (bản web)', ['🔗 Open', L.maniReport]],
    ['P1 · Feasibility', 'Product', 'MANI — 6DIA-BURS.pdf (web)', 'IFU DIA-BURS (bản web)', ['🔗 Open', L.maniIfu]],
    ['P2 · Launch planning', 'Material', 'IPR-01EF Brochure VN.pdf', 'Flyer tiếng Việt', ['🔗 Open', L.brochureVN]],
    ['P2 · Launch planning', 'Material', 'Thư mục bản dịch flyer', 'Bản dịch flyer', ['🔗 Open', L.dirFlyer]],
    ['P2 · Launch planning', 'Material', 'IPR-01EF _ Catalogue.pdf', 'Catalogue', ['🔗 Open', L.catalogue]],
    ['P2 · Launch planning', 'Material', 'Bản dịch Catalog mũi khoan IPR', 'Bản dịch catalogue', ['🔗 Open', L.catTrans]],
    ['P2 · Launch planning', 'Material', 'IPR-01EF.png', 'Ảnh sản phẩm', ['🔗 Open', L.img]],
    ['P2 · Launch planning', 'Tender', 'TSKT _ Mũi khoan IPR.xlsx', 'Thông số kỹ thuật cho hồ sơ thầu', ['🔗 Open', L.tskt]],
    ['P2 · Launch planning', 'Training', 'Training _ IPR 01 EF _ 25.07.25.pptx', 'Đào tạo nhà phân phối 25/07/2025', ['🔗 Open', L.trainNPP]],
    ['P2 · Launch planning', 'Survey', 'Google Form "KHẢO SÁT SỬ DỤNG MŨI KHOAN IPR"', 'Form lấy phản hồi dùng thử', ['🔗 Open', L.form]],
    ['P3 · Launch execution', 'Promotion', 'Thông báo khuyến mại ra mắt 01/08/2025', 'Mua 3 hộp IPR tặng 1 hộp Glide Finder', ['🔗 Open', L.promo]],
    ['P4 · Measure & optimize', 'Survey', 'IPR Surveys _MMH', 'Kết quả form dùng thử (3 phiếu)', ['🔗 Open', L.formResp]],
    ['P4 · Measure & optimize', 'Training', 'InternalTraining _ IPR 01 EF _ 31.12.25.pptx', 'Đào tạo nội bộ bổ sung', ['🔗 Open', L.trainInt]],
    ['P4 · Measure & optimize', 'Survey', 'IPR Survey_For New Umbrella shape.docx', 'Bộ câu hỏi khảo sát hình dạng mũi mới (MANI)', ['🔗 Open', L.shapeDoc]],
    ['P4 · Measure & optimize', 'Survey', '202609_IPR Survey_Results.xlsx', 'Kết quả khảo sát hình dạng mũi, 8 phòng khám', ['🔗 Open', L.shapeRes]],
    ['P4 · Measure & optimize', 'Survey', 'IPR _ Khảo sát khách hàng lần 2', 'File đang trống', ['🔗 Open', L.survey2]]
  ].map(function (r, i) { return [i + 1].concat(r); });
  var t = wTable_(w, ['No', 'Phase', 'Type', 'Document', 'Purpose', '🔗 Open'], rows, { link: 5, center: [0] });
  w.sh.setFrozenRows(3);
  w.r = t.r1 + 2;
  wNote_(w, 'Ghi chú: trong thư mục MKT Material có file "Feedback của khách hàng" nói về composite nướu tại labo — không thuộc IPR, nên chuyển sang thư mục đúng.');
}

/* ═══ Adapter cho các tab nội dung (Feasibility · Launch Plan · Documents) ═══════════════════ */
function W2_(ss, name, widths, tab) { return { sh: sheet_(ss, name, widths, tab), r: 4, n: widths.length }; }
function wTitle_(w, title, sub) { head_(w.sh, title, sub, w.n); w.r = 4; }
function wSection_(w, text) { section_(w.sh, w.r, 2, w.n, text); w.r += 1; }
function wKV_(w, pairs) { w.r = kv_(w.sh, w.r, pairs, w.n); }
function wTable_(w, headers, rows, opt) {
  opt = opt || {};
  var t = table_(w.sh, w.r, 2, headers, rows, { bold: opt.bold, center: opt.center, links: opt.link !== undefined ? [opt.link] : [] });
  w.sh.setRowHeights(t.r0 + 1, rows.length, 30);
  w.r = t.r1 + 2; return t;
}
function wNote_(w, text) {
  w.sh.getRange(w.r, 2, 1, w.n).mergeAcross().setValue(text).setWrap(true).setFontStyle('italic').setFontColor(C_.mut);
  w.sh.setRowHeight(w.r, 30); w.r += 1;
}

/* ═══ Launch Flow · lưu đồ (không viền, to, tự đổi màu) ═══════════════════════════════════ */
function buildFlow_(ss) {
  var NODE = 165, GATE = 140, ARR = 30;
  var widths = [], i;
  for (i = 0; i < 4; i++) { widths.push(NODE); widths.push(ARR); widths.push(GATE); if (i < 3) widths.push(ARR); }
  var sh = sheet_(ss, TB.flow, widths, '#2C4A5E', 80);   // B..P
  var NC = widths.length;                                 // 15
  var col = function (k) { return 2 + k * 4; }, gcol = function (k) { return 4 + k * 4; };
  sh.getRange(1, 1, 80, NC + 1).setFontSize(10.5);
  // ── header
  sh.getRange('B1').setValue('🚀  IPR-01EF LAUNCH FLOW').setFontSize(22).setFontWeight('bold').setFontColor(C_.navy);
  sh.getRange(1, 14, 1, 3).merge().setFormula('="📅  "&TEXT(TODAY(),"dd/mm/yyyy")').setHorizontalAlignment('right').setFontColor(C_.acc).setFontSize(11);
  sh.getRange('B2').setValue('Live map of the launch, following the MMH SOP for new product launches · colours change automatically when PICs update Tasks, Gates, Samples and Results.')
    .setFontColor(C_.acc).setFontSize(10.5);
  sh.getRange(3, 2, 1, NC).setBackground(C_.line);
  [[1, 50], [2, 24], [3, 4], [4, 14], [5, 26], [6, 42], [7, 26], [8, 18], [9, 30], [10, 26], [11, 14],
   [12, 42], [13, 30], [14, 12], [15, 24], [27, 22], [28, 30], [29, 30], [34, 18], [35, 30]].forEach(function (h) { sh.setRowHeight(h[0], h[1]); });

  // ── KPI tiles
  var E = 'Engine!C';
  var tiles = [
    ['✅  OVERALL PROGRESS', '=TEXT(' + E + TOT.ratio + ',"0%")&"     "&' + E + TOT.done + '&" / "&' + E + TOT.total + '&" tasks"',
      '=SPARKLINE(' + E + TOT.ratio + ',{"charttype","bar";"max",1;"color1","' + C_.teal + '"})'],
    ['📍  CURRENT PHASE', '=' + E + TOT.phaseLabel, '=INDEX(Engine!K' + E_PH + ':K' + (E_PH + 3) + ',' + E + TOT.phaseNo + ')'],
    ['⚠️  NEEDS ATTENTION', '=' + E + TOT.overdue + '&" overdue  ·  "&' + E + TOT.confirm + '&" to confirm"',
      '=' + E + TOT.bypass + '&" gate(s) bypassed · see Gates"'],
    ['💬  CUSTOMER SIGNAL', '="Feedback "&TEXT(' + E + TOT.rate + ',"0%")&"   ("&' + E + TOT.fb + '&" / "&' + E + TOT.sent + '&" clinics)"',
      '=IF(' + E + TOT.units + '=0,"Sales: no data yet · fill in Results","Sales: "&TEXT(' + E + TOT.units + ',"#,##0")&" boxes")']
  ];
  tiles.forEach(function (t, k) {
    var c = col(k);
    for (var rr = 5; rr <= 7; rr++) sh.getRange(rr, c, 1, 3).merge();
    sh.getRange(5, c, 3, 3).setBackground(C_.tile).setHorizontalAlignment('left');
    sh.getRange(5, c).setValue(t[0]).setFontWeight('bold').setFontColor(C_.acc).setFontSize(10);
    sh.getRange(6, c).setFormula(t[1]).setFontWeight('bold').setFontColor(C_.navy).setFontSize(17);
    sh.getRange(7, c).setFormula(t[2]).setFontColor(C_.mut).setFontSize(10);
  });

  // ── flow title + legend
  sh.getRange('B9').setValue('🧭  LAUNCH FLOW  ·  4 phases · 11 steps · 4 gates').setFontWeight('bold').setFontColor(C_.navy).setFontSize(13);
  var leg = [['✅ DONE', C_.teal, C_.white], ['🔄 IN PROGRESS', C_.acc2, C_.white], ['❓ TO CONFIRM', C_.yelb, C_.navy],
    ['⏰ OVERDUE', C_.red, C_.white], ['⏸ NOT STARTED', C_.pale, C_.acc], ['📍 CURRENT PHASE', C_.yel, C_.navy],
    ['⚠️ GATE BYPASSED', C_.yelb, C_.navy], ['🔒 GATE OPEN', C_.pale, C_.acc]];
  leg.forEach(function (l, k) {
    sh.getRange(10, 2 + k * 2).setValue(l[0]).setBackground(l[1]).setFontColor(l[2]).setFontWeight('bold').setFontSize(9)
      .setHorizontalAlignment('center');
  });

  // ── phases + steps + gates
  var rules = [];
  PHASES.forEach(function (p, k) {
    var c = col(k), er = E_PH + k;
    sh.getRange(12, c).setFormula('=IF(Engine!$C$' + TOT.phaseNo + '=' + (k + 1) + ',"📍  ","")&"' + p[1] + '  PHASE ' + (k + 1) + '"&CHAR(10)&"' + p[2].toUpperCase() + '"')
      .setBackground(C_.navy).setFontColor(C_.white).setFontWeight('bold').setFontSize(12).setWrap(true).setHorizontalAlignment('center');
    rules.push(cf_(sh.getRange(12, c), '=INDIRECT("Engine!C' + TOT.phaseNo + '")=' + (k + 1), C_.yel, C_.navy, true));
    sh.getRange(13, c).setFormula('=Engine!K' + er).setBackground(C_.pale).setFontWeight('bold').setHorizontalAlignment('center').setFontSize(10);
    rules = rules.concat(statusRules_(sh.getRange(13, c), absA1_(13, c), STEP_COLORS));
    sh.getRange(14, c).setFormula('=SPARKLINE(Engine!I' + er + ',{"charttype","bar";"max",1;"color1","' + C_.navy + '"})').setBackground(C_.pale);
    sh.getRange(15, c).setValue('▼').setFontColor(C_.acc).setHorizontalAlignment('center').setFontSize(13);
    var steps = STEPS.filter(function (s) { return s[1] === p[0]; });
    steps.forEach(function (s, j) {
      var r = 16 + j * 4, sr = E_STEP + STEPS.indexOf(s);
      sh.setRowHeight(r, 38); sh.setRowHeight(r + 1, 26); sh.setRowHeight(r + 2, 12);
      sh.getRange(r, c, 3, 1).setBackground(C_.pale).setHorizontalAlignment('center');
      sh.getRange(r, c).setValue(s[0] + '  ' + s[2] + '\n' + s[3]).setFontWeight('bold').setFontSize(11).setWrap(true);
      sh.getRange(r + 1, c).setFormula('=Engine!M' + sr).setFontSize(9.5).setWrap(true);
      sh.getRange(r + 2, c).setFormula('=SPARKLINE(Engine!L' + sr + ',{"charttype","bar";"max",1;"color1","#FFFFFF"})');
      rules = rules.concat(statusRules_(sh.getRange(r, c, 3, 1), absA1_(r + 1, c), STEP_COLORS));
      if (j < steps.length - 1) { sh.setRowHeight(r + 3, 22); sh.getRange(r + 3, c).setValue('▼').setFontColor(C_.acc).setHorizontalAlignment('center').setFontSize(13); }
    });
    // gate node (aligned with step 2)
    var g = GATES[k], gc = gcol(k), gr = E_GATE + k;
    sh.getRange(20, gc, 3, 1).setBackground(C_.pale).setHorizontalAlignment('center').setWrap(true);
    sh.getRange(20, gc).setValue('🚦  ' + g[0] + '\n' + g[1].toUpperCase()).setFontWeight('bold').setFontSize(10.5);
    sh.getRange(21, gc).setFormula('=Engine!N' + gr).setFontSize(9.5).setFontWeight('bold');
    rules = rules.concat(statusRules_(sh.getRange(20, gc, 3, 1), absA1_(21, gc), GATE_COLORS));
    // arrows: phase ▶ gate ▶ next phase
    sh.getRange(21, gc - 1).setValue('▶').setFontColor(C_.acc).setHorizontalAlignment('center').setFontSize(16);
    if (k < 3) sh.getRange(21, gc + 1).setValue('▶').setFontColor(C_.acc).setHorizontalAlignment('center').setFontSize(16);
  });
  sh.getRange(16, 2, 11, NC).setVerticalAlignment('middle');

  // ── why the project moved
  sh.getRange('B28').setValue('🚦  WHY THE PROJECT MOVED · GATE DECISIONS').setFontWeight('bold').setFontColor(C_.navy).setFontSize(13);
  var hdr = [[2, 1, 'Gate'], [3, 2, 'Status'], [5, 4, 'Why (required criteria)'], [9, 4, 'To add (recommended)'], [13, 4, 'From → To · decided by']];
  hdr.forEach(function (h) { var rg = sh.getRange(29, h[0], 1, h[1]); if (h[1] > 1) rg.merge(); rg.setValue(h[2]); });
  sh.getRange(29, 2, 1, NC).setBackground(C_.pale).setFontColor(C_.navy).setFontWeight('bold').setFontSize(10);
  GATES.forEach(function (g, k) {
    var r = 30 + k, er = E_GATE + k;
    sh.setRowHeight(r, 56);
    sh.getRange(r, 2, 1, NC).setBackground(k % 2 ? C_.alt : C_.white).setWrap(true).setVerticalAlignment('middle');
    sh.getRange(r, 2).setValue('🚦 ' + g[0] + ' · ' + g[1]).setFontWeight('bold').setFontColor(C_.navy);
    var st = sh.getRange(r, 3, 1, 2); st.merge(); sh.getRange(r, 3).setFormula('=Engine!N' + er).setFontWeight('bold').setHorizontalAlignment('center');
    rules = rules.concat(statusRules_(st, absA1_(r, 3), GATE_COLORS));
    sh.getRange(r, 5, 1, 4).merge(); sh.getRange(r, 5).setFormula('=Engine!O' + er).setFontSize(9.5);
    sh.getRange(r, 9, 1, 4).merge(); sh.getRange(r, 9).setFormula('=Engine!P' + er).setFontSize(9.5).setFontColor(C_.mut);
    sh.getRange(r, 13, 1, 4).merge(); sh.getRange(r, 13).setValue(g[2] + '\n👤 ' + g[3]).setFontSize(9.5);
  });

  // ── next actions
  sh.getRange('B35').setValue('📝  NEXT ACTIONS FOR PICs  ·  from Tasks, overdue first').setFontWeight('bold').setFontColor(C_.navy).setFontSize(13);
  var t = 'Tasks!', cond = t + 'B4:B<>"",' + t + 'L4:L<>"Done",' + t + 'L4:L<>"Cancelled"';
  sh.getRange('B36').setFormula('=IFERROR(ARRAYFORMULA(SORT(FILTER(' +
    'IF(REGEXMATCH(' + t + 'O4:O,"OVERDUE"),"⏰   OVERDUE · ",IF(' + t + 'L4:L="Not recorded","❓   ","▫️   "))&UPPER(' + t + 'L4:L)&"   ·   "&' + t + 'B4:B&"  "&' + t + 'F4:F' +
    '&IF(' + t + 'K4:K<>"","   ·   due "&TEXT(' + t + 'K4:K,"dd/mm/yyyy"),"")&IF(' + t + 'I4:I<>"","   ·   "&' + t + 'I4:I,"")&"   ·   "&' + t + 'H4:H,' + cond + '),' +
    'FILTER(IF(REGEXMATCH(' + t + 'O4:O,"OVERDUE"),1,IF(' + t + 'L4:L="Not recorded",2,3)),' + cond + '),TRUE)),"✅  No open items — all tasks are done")');
  var na = sh.getRange(36, 2, 30, 1);
  sh.getRange(36, 2, 30, NC).setFontSize(10.5).setWrap(false);
  sh.setRowHeights(36, 30, 26);
  rules.push(cf_(na, '=REGEXMATCH(B36,"OVERDUE")', null, '#A0523F', true));
  rules.push(cf_(na, '=REGEXMATCH(B36,"NOT RECORDED")', null, '#8A6A1F', false));
  sh.getRange(36, 2, 30, 1).setBackground(null);
  // ── how it works
  sh.getRange(67, 2, 1, NC).setBackground(C_.line); sh.setRowHeight(67, 3);
  sh.getRange(68, 2).setValue('ℹ️  How it works: ① PICs update Tasks (status, dates), Gates (tick decisions), Samples and Results  ② each step takes its colour from its tasks  ' +
    '③ a gate is PASSED when all Required criteria are met, BYPASSED when the next phase started without it  ④ 📍 marks the latest phase with activity.')
    .setFontColor(C_.mut).setFontSize(9.5);
  sh.setConditionalFormatRules(rules);
  sh.setFrozenRows(0);
}
