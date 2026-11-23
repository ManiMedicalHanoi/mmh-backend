/**
 * MMH_WgSurvey.gs v1.0 (23/11/2026) — KHẢO SÁT CUỐI QUÝ của WG (Market Information Management WG, MMH chủ trì).
 * Script GẮN Sheet kết quả "WG Survey" (WG.SHEET_ID). Mỗi quý 1 Google Form TIẾNG ANH (mẫu WG_TPL theo email của Giám đốc 23/11/2026),
 * câu trả lời đổ về 1 TAB MỚI của chính Sheet này ("Q1 FY68 · Responses"), danh sách mọi khảo sát ở tab "WG SURVEYS"
 * (link trả lời · link rút gọn · link sửa · tab kết quả · QR PNG). QR do MMH_QR.gs (giống hệt backend survey) dựng, lưu Drive cạnh Sheet.
 *
 * Cách dùng
 *   - Trong Sheet: menu "WG Survey" ▸ Create survey for a new quarter… / Show survey links / Close a survey.
 *   - Claude (workflow Kiểm tra ▸ ping, key = 8 ký tự cuối ID Sheet):
 *       wg-survey?action=wgCreate&key=…&q=Q2&fy=68&meet=24%20February[&countries=Vietnam,Thailand,Malaysia,India][&title=…][&force=1]
 *       wg-survey?action=wgList&key=…        wg-survey?action=wgClose&key=…&q=Q1&fy=68[&open=1]
 *     Cùng quý đã có form ⇒ trả lại form cũ (force=1 = tạo form mới).
 *   - Lần đầu: chủ script mở trình soạn ▸ chạy wgCapQuyen (cấp quyền + tạo luôn khảo sát Q1 FY68 nếu chưa có).
 */
var WG = {
  VER: '1.0',
  SHEET_ID: '152o_AWQa50oQ4t9krDTNeXOFGu_lKz-Xw7w268Cd4J4',
  INDEX: 'WG SURVEYS',
  FOLDER: 'WG Survey · Forms & QR',
  FOLDER_PROP: 'WG_FOLDER_ID',
  COUNTRIES: ['Vietnam', 'Thailand', 'Malaysia', 'India'],
  HEAD: ['Quarter', 'Survey title', 'Meeting', 'Respond link', 'Short link', 'Edit link', 'Responses tab', 'QR code (PNG)', 'Status', 'Created at', 'Created by', 'Form ID', 'QR file ID']
};
WG.KEY = WG.SHEET_ID.slice(-8);

/* Mẫu câu hỏi — {Q} quý (Q1), {FY} 68, {NEXTQ} quý sau (Q2 / Q1 FY69), {MEETING} "at our meeting on 25 November" */
var WG_TPL = {
  title: '{Q} FY{FY} WG Feedback & Key Takeaways',
  intro: 'Dear WG Members,\n\n' +
    'As shared in advance by MMH, please complete this short survey after the country presentations and discussions {MEETING}.\n\n' +
    'The survey will take approximately 5 minutes. Your feedback will help us summarize what we learned, identify actions arising from the WG and improve our work in {NEXTQ}.\n\n' +
    'Please share your own views. Short answers or bullet points are welcome.',
  basic: 'Basic Information',
  questions: [
    { title: '1. Key Findings & Learning', help: 'What are the 1–2 most useful findings or lessons you gained from the {Q} WG, including sharing from other countries?' },
    { title: '2. Application & Changes', help: 'Based on these findings or lessons, what have you changed, or what will you do differently in your market or work? If nothing is planned yet, please indicate this.' },
    { title: '3. Good Points', help: 'What worked well in the {Q} WG and should be continued?' },
    { title: '4. Challenges', help: 'What difficulties did you face in the {Q} WG?\nFor example: preparing information, attending meetings regularly, contributing to discussions or applying the findings.' },
    { title: '5. Improvements & Support', help: 'What would help you participate more consistently and gain more value from the WG in {NEXTQ}? Please suggest 1–2 improvements or support needs.' }
  ],
  closing: 'Thank you for your feedback and contribution. MMH will consolidate the responses with the country presentations and discussions to finalize the {Q} assessment and identify improvements for {NEXTQ}.'
};

/* ---------------- web app ---------------- */
function doGet(e) { return wgOut_(wgRoute_(e && e.parameter || {})); }
function doPost(e) {
  var b = {};
  try { b = JSON.parse(e.postData && e.postData.contents || '{}'); } catch (x) { b = {}; }
  return wgOut_(wgRoute_(Object.assign({}, e && e.parameter || {}, b)));
}
function wgOut_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function wgRoute_(p) {
  var a = p.action || 'ping';
  try {
    if (a === 'ping') return { ok: true, v: WG.VER };
    if (String(p.key || '') !== WG.KEY) return { ok: false, code: 'KEY', error: 'Sai khoá.' };
    if (a === 'wgCreate') return wgCreate_({ q: p.q, fy: p.fy, meet: p.meet, countries: p.countries, title: p.title, force: p.force === '1' || p.force === true, by: 'web' });
    if (a === 'wgList') return { ok: true, v: WG.VER, sheetUrl: wgBook_().getUrl(), items: wgList_() };
    if (a === 'wgClose') return wgClose_(wgCode_(p.q, p.fy), p.open === '1');
    return { ok: false, error: 'Không có lệnh ' + a };
  } catch (x) { return { ok: false, error: String(x && x.message || x) }; }
}

/* ---------------- quý / mẫu ---------------- */
function wgParse_(q, fy) {
  var s = String(q || '').toUpperCase(), m = s.match(/Q\s*([1-4])/), f = s.match(/FY\s*(\d{2,4})/);
  var qn = m ? Number(m[1]) : 0, fyn = Number(fy || (f && f[1]) || 0);
  if (!qn || !fyn) throw new Error('Cần quý + năm tài chính, vd. q=Q1&fy=68 (hoặc "Q1 FY68").');
  if (fyn > 100) fyn = fyn % 100;
  return { qn: qn, fy: fyn };
}
function wgCode_(q, fy) { var o = wgParse_(q, fy); return 'Q' + o.qn + ' FY' + o.fy; }
function wgFill_(s, v) {
  return String(s).replace(/\{Q\}/g, v.Q).replace(/\{FY\}/g, v.FY).replace(/\{NEXTQ\}/g, v.NEXTQ).replace(/\{MEETING\}/g, v.MEETING);
}
function wgVars_(o, meet) {
  var nq = o.qn === 4 ? 'Q1 FY' + (o.fy + 1) : 'Q' + (o.qn + 1);
  var m = String(meet || '').trim();
  return { Q: 'Q' + o.qn, FY: String(o.fy), NEXTQ: nq, MEETING: m ? 'at our meeting on ' + m : 'at our quarterly WG meeting', meet: m };
}

/* ---------------- tạo form ---------------- */
function wgCreate_(opt) {
  var o = wgParse_(opt.q, opt.fy), code = 'Q' + o.qn + ' FY' + o.fy, v = wgVars_(o, opt.meet);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var ss = wgBook_(), idx = wgIndex_(ss);
    if (!opt.force) {
      var old = wgList_().filter(function (r) { return r.quarter === code && r.status !== 'Replaced'; })[0];
      if (old) { var still = true; try { FormApp.openById(old.formId); } catch (x) { still = false; } if (still) return Object.assign({ ok: true, existed: true }, old); }
    } else {
      wgList_().forEach(function (r) { if (r.quarter === code && r.status !== 'Replaced') idx.getRange(r.row, 9).setValue('Replaced'); });
    }
    var title = opt.title ? String(opt.title) : wgFill_(WG_TPL.title, v);
    var countries = opt.countries ? String(opt.countries).split(',').map(function (s) { return s.trim(); }).filter(String) : WG.COUNTRIES;

    var form = FormApp.create(title);
    form.setDescription(wgFill_(WG_TPL.intro, v));
    form.setCollectEmail(false);
    form.setAllowResponseEdits(true);
    form.setShowLinkToRespondAgain(false);
    form.setConfirmationMessage(wgFill_(WG_TPL.closing, v));
    form.addSectionHeaderItem().setTitle(WG_TPL.basic);
    form.addTextItem().setTitle('Name').setRequired(true);
    form.addMultipleChoiceItem().setTitle('Country').setChoiceValues(countries).setRequired(true);
    WG_TPL.questions.forEach(function (q) {
      form.addParagraphTextItem().setTitle(q.title).setHelpText(wgFill_(q.help, v)).setRequired(true);
    });

    // người trả lời = ai có link (MANI Thailand / Malaysia / India khác tên miền)
    var notes = [];
    try { form.setPublished(true); } catch (x) {}
    try { form.setAcceptingResponses(true); } catch (x) {}
    try { form.setRequireLogin(false); } catch (x) {}
    try { Drive.Permissions.create({ type: 'anyone', role: 'reader', view: 'published', allowFileDiscovery: false }, form.getId(), { supportsAllDrives: true }); }
    catch (x) { notes.push('Responder link: ' + x.message); }

    // câu trả lời ⇒ tab mới của Sheet này
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    var tab = wgRespTab_(ss, form.getId(), code);

    var url = form.getPublishedUrl(), short = url;
    try { short = form.shortenFormUrl(url); } catch (x) {}
    var folder = wgFolder_(ss);
    try { DriveApp.getFileById(form.getId()).moveTo(folder); } catch (x) { notes.push('Move form: ' + x.message); }
    var qr = null;
    try {
      qr = folder.createFile(nsQrPng_(short, 1000, 'QR - ' + title + '.png'));
      try { qr.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) {}
    } catch (x) { notes.push('QR: ' + x.message); }

    var tabUrl = ss.getUrl() + (tab ? '#gid=' + tab.getSheetId() : '');
    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
    var rowVals = [code, title, v.meet, url, short, form.getEditUrl(), tab ? tab.getName() : '', qr ? qr.getUrl() : '', 'Open', now, opt.by || '', form.getId(), qr ? qr.getId() : ''];
    idx.appendRow(rowVals);
    var r = idx.getLastRow();
    if (tab) idx.getRange(r, 7).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(tab.getName()).setLinkUrl(tabUrl).build());
    return {
      ok: true, v: WG.VER, existed: false, quarter: code, title: title, meeting: v.meet, formUrl: url, shortUrl: short,
      editUrl: form.getEditUrl(), sheetUrl: tabUrl, tab: tab ? tab.getName() : '', qrUrl: qr ? qr.getUrl() : '',
      formId: form.getId(), items: 2 + WG_TPL.questions.length, notes: notes
    };
  } finally { lock.releaseLock(); }
}

/* Tab câu trả lời vừa tạo: tìm theo ID form, đổi tên "Q1 FY68 · Responses", trình bày dễ đọc */
function wgRespTab_(ss, formId, code) {
  var sh = null;
  for (var i = 0; i < 6 && !sh; i++) {
    SpreadsheetApp.flush();
    ss = SpreadsheetApp.openById(ss.getId());
    sh = ss.getSheets().filter(function (s) { var u = ''; try { u = s.getFormUrl() || ''; } catch (x) {} return u.indexOf(formId) >= 0; })[0] || null;
    if (!sh) Utilities.sleep(1500);
  }
  if (!sh) return null;
  var name = code + ' · Responses', n = 2;
  while (ss.getSheetByName(name) && ss.getSheetByName(name).getSheetId() !== sh.getSheetId()) name = code + ' · Responses (' + (n++) + ')';
  try { sh.setName(name); } catch (x) {}
  try {
    sh.setFrozenRows(1);
    var last = Math.max(sh.getLastColumn(), 9);
    sh.getRange(1, 1, 1, last).setFontWeight('bold').setBackground('#F0F7FF').setWrap(true).setVerticalAlignment('top');
    sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 160); sh.setColumnWidth(3, 110);
    for (var c = 4; c <= last; c++) sh.setColumnWidth(c, 320);
    sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), last).setWrap(true).setVerticalAlignment('top');
  } catch (x) {}
  return sh;
}

/* ---------------- danh sách / đóng ---------------- */
function wgBook_() { return SpreadsheetApp.openById(WG.SHEET_ID); }
function wgIndex_(ss) {
  var sh = ss.getSheetByName(WG.INDEX);
  if (!sh) {
    sh = ss.insertSheet(WG.INDEX, 0);
    sh.getRange(1, 1, 1, WG.HEAD.length).setValues([WG.HEAD]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
    [90, 280, 110, 260, 200, 260, 170, 220, 80, 130, 110, 120, 120].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}
function wgList_() {
  var sh = wgIndex_(wgBook_()), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, WG.HEAD.length).getValues().map(function (r, i) {
    return { row: i + 2, quarter: String(r[0]), title: String(r[1]), meeting: String(r[2]), formUrl: String(r[3]), shortUrl: String(r[4]),
      editUrl: String(r[5]), tab: String(r[6]), qrUrl: String(r[7]), status: String(r[8]), created: String(r[9]), formId: String(r[11]), qrId: String(r[12]) };
  }).filter(function (o) { return o.quarter; });
}
function wgClose_(code, reopen) {
  var sh = wgIndex_(wgBook_()), hit = wgList_().filter(function (r) { return r.quarter === code && r.status !== 'Replaced'; });
  if (!hit.length) return { ok: false, error: 'Chưa có khảo sát ' + code };
  hit.forEach(function (r) { FormApp.openById(r.formId).setAcceptingResponses(!!reopen); sh.getRange(r.row, 9).setValue(reopen ? 'Open' : 'Closed'); });
  return { ok: true, quarter: code, status: reopen ? 'Open' : 'Closed' };
}
function wgFolder_(ss) {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty(WG.FOLDER_PROP);
  if (id) { try { var f0 = DriveApp.getFolderById(id); if (!f0.isTrashed()) return f0; } catch (x) {} }
  var parent = null;
  try { var it = DriveApp.getFileById(ss.getId()).getParents(); if (it.hasNext()) parent = it.next(); } catch (x) {}
  var f = null;
  if (parent) { var ex = parent.getFoldersByName(WG.FOLDER); f = ex.hasNext() ? ex.next() : parent.createFolder(WG.FOLDER); }
  else f = DriveApp.createFolder(WG.FOLDER);
  P.setProperty(WG.FOLDER_PROP, f.getId());
  return f;
}

/* ---------------- menu trong Sheet ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('WG Survey')
    .addItem('Create survey for a new quarter…', 'wgMenuCreate')
    .addItem('Show survey links', 'wgMenuList')
    .addItem('Close a survey (stop responses)…', 'wgMenuClose')
    .addToUi();
}
function wgMenuCreate() {
  var ui = SpreadsheetApp.getUi();
  var a = ui.prompt('New WG survey', 'Quarter, e.g. "Q2 FY68"', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var b = ui.prompt('New WG survey', 'Meeting date shown in the intro, e.g. "24 February" (leave blank if not fixed)', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;
  var r = wgCreate_({ q: a.getResponseText(), meet: b.getResponseText(), by: Session.getActiveUser().getEmail() || 'menu' });
  ui.alert((r.existed ? 'This quarter already has a survey:\n\n' : 'Survey created:\n\n') + r.title + '\n\nRespond link: ' + r.shortUrl +
    '\nEdit form: ' + r.editUrl + '\nResponses tab: ' + r.tab + '\nQR code: ' + (r.qrUrl || '(not created)'));
}
function wgMenuList() {
  var t = wgList_().map(function (r) { return r.quarter + ' · ' + r.status + '\n' + r.shortUrl + (r.qrUrl ? '\nQR: ' + r.qrUrl : ''); }).join('\n\n');
  SpreadsheetApp.getUi().alert(t || 'No survey yet.');
}
function wgMenuClose() {
  var ui = SpreadsheetApp.getUi(), a = ui.prompt('Close WG survey', 'Quarter to close, e.g. "Q1 FY68"', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  var r = wgClose_(wgCode_(a.getResponseText()));
  ui.alert(r.ok ? r.quarter + ': no longer accepting responses.' : r.error);
}

/* Chạy 1 lần trong trình soạn: cấp quyền + tạo khảo sát Q1 FY68 (họp 25/11/2026) nếu chưa có */
function wgCapQuyen() {
  var r = wgCreate_({ q: 'Q1', fy: 68, meet: '25 November', by: 'wgCapQuyen' });
  Logger.log(JSON.stringify(r, null, 1));
}
