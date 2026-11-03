/**
 * MMH Survey API v2.1 (03/11/2026; v2.1: action docText (đọc chữ tài liệu Drive cho Claude); v2.0: bài kiểm tra có trang làm bài đếm ngược + mốc đạt + email kết quả (MMH_SurveyQuiz.gs); v1.2: người trả lời = ai có link (Drive reader + view published), action share; v1.1: câu sàng lọc — mọi lựa chọn đều gắn điều hướng, form lỗi giữa chừng tự vào Thùng rác) — tạo Google Form KHẢO SÁT / BÀI KIỂM TRA từ 1 bản mô tả JSON.
 * Claude (phiên Claude Code) soạn câu hỏi theo yêu cầu + tài liệu ⇒ gọi web app này ⇒ trả link ngay trong chat.
 * Bộ mô tả + quy tắc soạn: kho mmh-library ▸ surveys/ (README.md, specs/*.json, tools/survey.py).
 *
 *   GET  ?action=ping                                  ⇒ {ok, v}
 *   POST {action:"create", key, spec}  (hoặc GET ?action=create&key=…&p=<base64url JSON spec>)
 *        ⇒ {ok, formUrl, shortUrl, editUrl, sheetUrl, summaryUrl, formId, sheetId, items}
 *   GET  ?action=list&key=…                            ⇒ danh sách form đã tạo (sheet nhật ký)
 *   GET  ?action=docText&key=…&fileId=…[&max=]         ⇒ {name, mimeType, text} — chữ trong PPTX / DOCX / PDF / Google Slides–Docs–Sheets
 *
 * spec = {
 *   type: "survey" | "quiz",              // quiz = chấm điểm tự động
 *   title, intro (lời mở đầu, xưng "Quý bác sĩ"), minutes (thời gian trả lời / làm bài),
 *   passPercent (quiz, mặc định 70), shuffle (quiz), confirmation,
 *   info: true | false | [{t,q,required}],   // mặc định: Họ và tên* · Số điện thoại* · Bệnh viện / phòng khám
 *   share: "view" | "edit" | "none",       // Form + Sheet cho mọi người có link (mặc định "view"); người TRẢ LỜI luôn = ai có link
 *   audience: "doctor" | "staff",          // phần thông tin chung mặc định (survey = doctor, quiz = staff)
 *   quiz: passScore (mốc đạt theo ĐIỂM, vd. 10 / 12 câu), minutes + countdown (trang làm bài đếm ngược, hết giờ tự nộp),
 *         notify: ["email", …] (email mỗi lượt nộp, kèm link file tổng hợp), showAnswers (hiện giải thích câu sai sau khi nộp, mặc định có)
 *   sections: [{ id, title, help, questions: [ Q ] }]
 * }
 * Q = { t: "radio"|"checkbox"|"list"|"text"|"phone"|"paragraph"|"scale"|"grid"|"checkgrid"|"header",
 *       q, help, options:[ "…" | {v:"…", go:"<id phần>"|"next"|"submit", correct:true} ], other:true,
 *       required (mặc định true, paragraph mặc định false), max (checkbox: chọn tối đa n),
 *       low, high, lowLabel, highLabel (scale), rows, cols (grid),
 *       correct (quiz: chỉ số đáp án đúng, từ 0), points, explanation }
 */
var SV = { VER: '2.5', PAGE: 'https://manimedicalhanoi.github.io/Training-Hub/quiz/', URL: 'https://script.google.com/macros/s/AKfycbx8l7u4j2tFDpfsg8IFsEcuXNrTbrLVRA_SoZ2Iisqprfm1ipL4z2NfDudVKuI1paFQPg/exec', KEY: 'mmh-sv-7Qk2pX9w', LOG_PROP: 'SV_LOG_ID', FOLDER_PROP: 'SV_FOLDER_ID', FOLDER: 'MMH Survey · Form tạo tự động' };

function doGet(e) {
  var p = e && e.parameter || {};
  if (p.q) { var fq = svQuizFromCode_(p.q); return fq ? svQuizPage_(fq) : HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">Link bài kiểm tra không đúng hoặc đã bị xoá.</p>'); }
  if (p.t) return svQuizPage_(p.t);           // trang làm bài (đếm ngược, chấm điểm, email kết quả) — MMH_SurveyQuiz.gs
  if (p.b) return svBuilderPage_(p.k || '');  // trang tạo form từ link (dự phòng khi Claude không gọi được máy chủ)
  return svHandle_(p, null);
}
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData && e.postData.contents || '{}'); } catch (x) { body = {}; }
  return svHandle_(e && e.parameter || {}, body);
}

function svOut_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function svHandle_(p, body) {
  var a = (body && body.action) || p.action || 'ping';
  try {
    if (a === 'ping') return svOut_({ ok: true, v: SV.VER });
    // Trang làm bài trên GitHub Pages (Training-Hub/quiz/) gọi 3 lệnh công khai này bằng fetch không kèm cookie — không cần khoá
    if (a === 'qMeta' || a === 'qStart' || a === 'qSubmit') {
      var b2 = body || p, fq = svQuizFromCode_(b2.q || '');
      if (!fq) return svOut_({ ok: false, error: 'Link bài kiểm tra không đúng hoặc đã bị xoá.' });
      if (a === 'qMeta') return svOut_({ ok: true, data: svQuizMeta_(fq) });
      if (a === 'qStart') return svOut_(Object.assign({ ok: true }, svQuizStart(fq, b2.info || {})));
      return svOut_(svQuizSubmit(fq, b2.token, b2.info || {}, b2.answers || {}, !!b2.auto));
    }
    var key = (body && body.key) || p.key || '';
    var want = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
    if (key !== want) return svOut_({ ok: false, error: 'KEY' });
    if (a === 'list') return svOut_({ ok: true, items: svList_() });
    if (a === 'share') {  // áp lại quyền cho form đã tạo: formId, sheetId, mode
      var fm = FormApp.openById(p.formId || (body || {}).formId);
      var notes = svShare_(fm, p.sheetId || (body || {}).sheetId || '', p.mode || (body || {}).mode || 'edit');
      return svOut_({ ok: true, notes: notes, info: svShareInfo_(fm) });
    }
    if (a === 'scopes') return svOut_(svScopes_());
    if (a === 'quizLink') {  // link làm bài dạng mã ngắn cho bài đã tạo (+ đổi danh sách email nhận kết quả nếu gửi notify)
      var qf = p.formId || (body || {}).formId, nt = (body || {}).notify;
      if (!svQuizCfg_(qf)) return svOut_({ ok: false, error: 'Không có bài kiểm tra ' + qf });
      var notes2 = [];
      if (Array.isArray(nt)) notes2 = svQuizNotify_(qf, nt);
      return svOut_({ ok: true, quizUrl: SV.PAGE + '?q=' + svQuizCode_(qf), gasUrl: SV.URL + '?q=' + svQuizCode_(qf), notify: svQuizCfg_(qf).notify, notes: notes2 });
    }
    if (a === 'docText') return svOut_(svDocText_(p.fileId || (body || {}).fileId, Number(p.max || (body || {}).max || 150000)));
    if (a === 'create') {
      var spec = body && body.spec;
      if (!spec && p.p) spec = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p.p)).getDataAsString());
      if (!spec && p.pz) spec = svUnz_(p.pz);
      if (!spec || !spec.title) return svOut_({ ok: false, error: 'SPEC' });
      var lock = LockService.getScriptLock(); lock.waitLock(30000);
      try { return svOut_(svCreate_(spec)); } finally { lock.releaseLock(); svTrashPartial_(); }
    }
    return svOut_({ ok: false, error: 'ACTION' });
  } catch (err) {
    return svOut_({ ok: false, error: String(err && err.message || err), stack: String(err && err.stack || '').slice(0, 600) });
  }
}

/* ---------- dựng form ---------- */
var SV_INFO_DOCTOR = [
  { t: 'text', q: 'Họ và tên', required: true },
  { t: 'phone', q: 'Số điện thoại', required: true },
  { t: 'text', q: 'Tên bệnh viện / phòng khám', required: false }
];
var SV_INFO_STAFF = [
  { t: 'text', q: 'Họ và tên', required: true },
  { t: 'list', q: 'Phòng ban / Team', required: true, options: ['Dental Sale Team', 'Surgical Sale Team', 'Product Team', 'Marketing Team',
    'Back Office — Stock Team', 'Back Office — Accounting & Import-Export', 'Back Office — Purchasing & Sales Support',
    'Thailand Dental Sales & Marketing', 'Thailand Surgical Sales & Marketing', 'BOD'] }
];
function svUnz_(z) { return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64DecodeWebSafe(z), 'application/x-gzip')).getDataAsString('UTF-8')); }

var SV_PART = null;
function svTrashPartial_() { if (SV_PART) { try { DriveApp.getFileById(SV_PART).setTrashed(true); } catch (x) {} SV_PART = null; } }

function svCreate_(spec) {
  var quiz = spec.type === 'quiz';
  var form = FormApp.create(spec.title);
  SV_PART = form.getId();  // lỗi giữa chừng ⇒ bỏ form dở vào Thùng rác
  form.setTitle(spec.title);
  var desc = [];
  if (spec.intro) desc.push(spec.intro);
  if (spec.minutes) desc.push((quiz ? 'Thời gian làm bài: ' : 'Thời gian trả lời: khoảng ') + spec.minutes + ' phút');
  if (spec.note) desc.push(spec.note);
  form.setDescription(desc.join('\n\n'));
  form.setIsQuiz(quiz);
  form.setCollectEmail(!!spec.collectEmail);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShuffleQuestions(quiz && spec.shuffle !== false);
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  try { form.setPublishingSummary(spec.publicSummary !== false); } catch (x) {}

  // Thông tin chung (luôn có, trừ khi info:false): bác sĩ = Họ tên* · SĐT* · Bệnh viện / phòng khám; nhân sự MMH (bài kiểm tra) = Họ tên* · Phòng ban*
  var staff = spec.audience ? spec.audience !== 'doctor' : quiz;
  var info = spec.info === false ? [] : (Array.isArray(spec.info) ? spec.info : (staff ? SV_INFO_STAFF : SV_INFO_DOCTOR));
  var count = 0, pts = 0, nav = [], pages = {}, infoItems = [], qItems = [];
  if (info.length) {
    form.addSectionHeaderItem().setTitle(spec.infoTitle || 'THÔNG TIN CHUNG');
    info.forEach(function (q) { var r = svAdd_(form, q, false, nav); count++; if (r.it) infoItems.push({ id: r.it.getId(), t: q.t || 'text', q: q.q, required: q.required === undefined ? true : !!q.required, options: q.options || null }); });
  }
  var num = 0;
  (spec.sections || []).forEach(function (s, si) {
    var first = si === 0 && !info.length;
    if (!first) {
      var pb = form.addPageBreakItem().setTitle(s.title || '');
      if (s.help) pb.setHelpText(s.help);
      pages[s.id || ('s' + si)] = pb;
    } else {
      var h = form.addSectionHeaderItem().setTitle(s.title || '');
      if (s.help) h.setHelpText(s.help);
    }
    (s.questions || []).forEach(function (q) {
      var numbered = q.t !== 'header' && spec.number !== false;
      if (numbered) num++;
      var q2 = Object.assign({}, q, { q: numbered ? 'Câu ' + num + '. ' + q.q : q.q });
      var r = svAdd_(form, q2, quiz, nav);
      pts += r.pts; count++;
      if (quiz && r.pts && r.it) qItems.push(r.it.getId());
    });
  });

  // Điều hướng câu sàng lọc (go: id phần / submit / next)
  nav.forEach(function (n) {
    var it = n.item;
    it.setChoices(n.opts.map(function (o) {
      if (!o.go || o.go === 'next') return it.createChoice(o.v, FormApp.PageNavigationType.CONTINUE);
      if (o.go === 'submit') return it.createChoice(o.v, FormApp.PageNavigationType.SUBMIT);
      if (o.go === 'next') return it.createChoice(o.v, FormApp.PageNavigationType.CONTINUE);
      if (pages[o.go]) return it.createChoice(o.v, pages[o.go]);
      return it.createChoice(o.v, FormApp.PageNavigationType.CONTINUE);  // mọi lựa chọn phải cùng có điều hướng
    }));
  });

  var conf = spec.confirmation || 'MANI Medical Hanoi trân trọng cảm ơn Quý bác sĩ đã dành thời gian chia sẻ ý kiến!';
  var passScore = 0;
  if (quiz && pts) {
    passScore = spec.passScore ? Number(spec.passScore) : Math.ceil(pts * (spec.passPercent || 70) / 100);
    if (passScore > pts) throw new Error('Mốc đạt ' + passScore + ' lớn hơn tổng điểm ' + pts);
    if (!spec.confirmation) conf = 'Cảm ơn bạn đã hoàn thành bài kiểm tra!';
    conf += '\nTổng điểm tối đa: ' + pts + ' · Mốc đạt: ' + passScore + '/' + pts + '.';
  }
  form.setConfirmationMessage(conf);
  try { form.setPublished(true); } catch (x) {}

  var ss = SpreadsheetApp.create(spec.title + ' (Kết quả)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  var folder = svFolder_();
  [form.getId(), ss.getId()].forEach(function (id) { try { DriveApp.getFileById(id).moveTo(folder); } catch (x) {} });
  var share = spec.share || 'view', shareNote = svShare_(form, ss.getId(), share);
  var quizUrl = '';
  if (quiz && qItems.length) quizUrl = svQuizSetup_(form, ss, spec, { info: infoItems, qs: qItems, total: pts, pass: passScore, notify: spec.notify || [] }, shareNote);
  (spec.editors || []).forEach(function (m) { try { form.addEditor(m); ss.addEditor(m); } catch (x) { shareNote.push(m + ': ' + x.message); } });

  var url = form.getPublishedUrl(), short = url;
  try { short = form.shortenFormUrl(url); } catch (x) {}
  var out = {
    ok: true, v: SV.VER, title: spec.title, type: quiz ? 'quiz' : 'survey', items: count, points: pts,
    formUrl: url, shortUrl: short, editUrl: form.getEditUrl(), sheetUrl: ss.getUrl(),
    summaryUrl: url.replace('/viewform', '/viewanalytics'), formId: form.getId(), sheetId: ss.getId(),
    folderUrl: folder.getUrl(), share: share, shareNote: shareNote,
    quizUrl: quizUrl, passScore: passScore, minutes: spec.minutes || 0, countdown: !!(quizUrl && spec.minutes && spec.countdown !== false), notify: spec.notify || []
  };
  svLog_(out, spec);
  SV_PART = null;
  return out;
}

function svOpts_(q) { return (q.options || []).map(function (o) { return typeof o === 'string' ? { v: o } : o; }); }

function svAdd_(form, q, quiz, nav) {
  var t = q.t || 'radio', req = q.required === undefined ? !(t === 'paragraph' || t === 'header') : !!q.required;
  var it, pts = 0, opts = svOpts_(q);
  switch (t) {
    case 'header':
      it = form.addSectionHeaderItem().setTitle(q.q); if (q.help) it.setHelpText(q.help); return { pts: 0, it: null };
    case 'text':
      it = form.addTextItem(); break;
    case 'phone':
      it = form.addTextItem().setValidation(FormApp.createTextValidation()
        .setHelpText('Vui lòng nhập số điện thoại hợp lệ, ví dụ 0912 345 678.')
        .requireTextMatchesPattern('^(0|\\+84)[0-9 .]{8,13}$').build());
      break;
    case 'paragraph':
      it = form.addParagraphTextItem(); break;
    case 'scale':
      it = form.addScaleItem().setBounds(q.low || 1, q.high || 5);
      if (q.lowLabel || q.highLabel) it.setLabels(q.lowLabel || '', q.highLabel || '');
      break;
    case 'grid': case 'checkgrid':
      it = t === 'grid' ? form.addGridItem() : form.addCheckboxGridItem();
      it.setRows(q.rows || []).setColumns(q.cols || []); break;
    case 'checkbox':
      it = form.addCheckboxItem(); break;
    case 'list':
      it = form.addListItem(); break;
    default:
      it = form.addMultipleChoiceItem();
  }
  it.setTitle(q.q);
  if (q.help) it.setHelpText(q.help);
  if (/^(radio|checkbox|list)$/.test(t) || !q.t) {
    var correctIdx = q.correct;
    it.setChoices(opts.map(function (o, i) {
      var ok = quiz && (o.correct || i === correctIdx || (Array.isArray(correctIdx) && correctIdx.indexOf(i) >= 0));
      return quiz ? it.createChoice(o.v, !!ok) : it.createChoice(o.v);
    }));
    if (q.other && t !== 'list') it.showOtherOption(true);
    if (t === 'checkbox' && q.max) it.setValidation(FormApp.createCheckboxValidation()
      .setHelpText('Xin chọn tối đa ' + q.max + ' ý.').requireSelectAtMost(q.max).build());
    if (!quiz && opts.some(function (o) { return o.go; }) && t !== 'checkbox') nav.push({ item: it, opts: opts });
    if (quiz && t !== 'list') {
      pts = q.points || 1; it.setPoints(pts);
      if (q.explanation) {
        it.setFeedbackForCorrect(FormApp.createFeedback().setText('Chính xác! ' + q.explanation).build());
        it.setFeedbackForIncorrect(FormApp.createFeedback().setText('Chưa đúng. ' + q.explanation).build());
      }
    }
  }
  it.setRequired(req);
  return { pts: pts, it: it };
}

/* ---------- đọc chữ trong tài liệu Drive (để Claude soạn câu hỏi từ tài liệu Training Hub) ----------
 * PPTX / PPT ⇒ bản sao tạm Google Slides, DOCX / DOC / PDF ⇒ bản sao tạm Google Docs (PDF: OCR) ⇒ export text/plain ⇒ xoá bản sao.
 * Google Slides / Docs gốc ⇒ export thẳng. Chỉ dùng phạm vi drive (đã cấp). */
function svDocText_(id, max) {
  if (!id) return { ok: false, error: 'fileId' };
  var f = Drive.Files.get(id, { fields: 'id,name,mimeType,size,modifiedTime', supportsAllDrives: true }), mt = f.mimeType, tmp = null, src = id, gmt;
  var G = { slides: 'application/vnd.google-apps.presentation', docs: 'application/vnd.google-apps.document', sheets: 'application/vnd.google-apps.spreadsheet' };
  if (mt === G.slides || mt === G.docs) gmt = mt;
  else if (mt === G.sheets) gmt = mt;
  else if (/presentation|powerpoint/.test(mt)) gmt = G.slides;
  else if (/wordprocessing|msword|pdf|text\/|rtf/.test(mt)) gmt = G.docs;
  else return { ok: false, error: 'Không đọc được loại file ' + mt, name: f.name };
  try {
    if (mt !== gmt) {
      tmp = Drive.Files.copy({ name: '[tạm] ' + f.name, mimeType: gmt, parents: [svFolder_().getId()] }, id, { supportsAllDrives: true, ocrLanguage: 'vi' });
      src = tmp.id;
    }
    var exp = gmt === G.sheets ? 'text/csv' : 'text/plain';
    // Dịch vụ nâng cao Drive v3 không trả nội dung export (báo "requires alt=media", nội dung bị cắt) ⇒ gọi thẳng API export bằng UrlFetch
    var errs = [], txt = '';
    try {
      var res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + src + '/export?mimeType=' + encodeURIComponent(exp) + '&supportsAllDrives=true',
        { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (res.getResponseCode() === 200) txt = res.getContentText('UTF-8');
      else errs.push('HTTP ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
    } catch (x) { errs.push(String(x.message || x).slice(0, 300)); }
    if (!txt && errs.length) return { ok: false, error: 'export: ' + errs.join(' | '), name: f.name };
    return { ok: true, name: f.name, mimeType: mt, size: f.size, modified: f.modifiedTime, chars: txt.length, truncated: txt.length > max, text: txt.slice(0, max) };
  } finally {
    if (tmp) { try { Drive.Files.remove(tmp.id, { supportsAllDrives: true }); } catch (x) { try { DriveApp.getFileById(tmp.id).setTrashed(true); } catch (y) {} } }
  }
}

function svScopes_() {  // chẩn đoán: quyền nào chủ script đã cấp
  var o = {};
  try { o.mailLeft = MailApp.getRemainingDailyQuota(); } catch (x) { o.mail = x.message; }
  try { o.fetch = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }).getResponseCode(); } catch (x) { o.fetchErr = x.message; }
  return { ok: true, v: SV.VER, scopes: o };
}

/* ---------- quyền truy cập ----------
 * Google Forms mới: NGƯỜI TRẢ LỜI = quyền Drive "reader" + view "published" (không phải quyền xem file thường) ⇒ phải tạo riêng,
 * nếu không người ngoài mở link gặp "You need access". Quyền sửa / xem Sheet: DriveApp.setSharing ai có link. */
function svShare_(form, ssId, mode) {
  var notes = [], id = form.getId();
  try { form.setPublished(true); } catch (x) {}
  try { form.setAcceptingResponses(true); } catch (x) {}
  try { form.setRequireLogin(false); } catch (x) {}  // Workspace: bỏ giới hạn "chỉ người trong tổ chức"
  try { Drive.Permissions.create({ type: 'anyone', role: 'reader', view: 'published', allowFileDiscovery: false }, id, { supportsAllDrives: true }); }
  catch (x) { notes.push('Người trả lời (ai có link): ' + x.message); }
  if (mode && mode !== 'none') {
    var perm = mode === 'view' ? DriveApp.Permission.VIEW : DriveApp.Permission.EDIT;
    [[id, 'Form'], [ssId, 'Sheet']].forEach(function (f) {
      if (!f[0]) return;
      try { DriveApp.getFileById(f[0]).setSharing(DriveApp.Access.ANYONE_WITH_LINK, perm); } catch (x) { notes.push(f[1] + ': ' + x.message); }
    });
  }
  return notes;
}

function svShareInfo_(form) {
  var o = {};
  try { o.published = form.isPublished(); } catch (x) {}
  try { o.advanced = form.supportsAdvancedResponderPermissions(); } catch (x) {}
  try { o.requireLogin = form.requiresLogin(); } catch (x) {}
  try { o.perms = (Drive.Permissions.list(form.getId(), { fields: 'permissions(type,role,view,domain)', supportsAllDrives: true, includePermissionsForView: 'published' }).permissions || []); } catch (x) { o.permErr = x.message; }
  return o;
}

/* ---------- thư mục + nhật ký ---------- */
function svFolder_() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty(SV.FOLDER_PROP);
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (x) {} }
  var f2 = DriveApp.createFolder(SV.FOLDER); P.setProperty(SV.FOLDER_PROP, f2.getId()); return f2;
}

function svLogSheet_() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty(SV.LOG_PROP), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('MMH Survey · Danh sách form đã tạo');
    ss.getSheets()[0].setName('LOG').appendRow(['Thời gian', 'Loại', 'Tiêu đề', 'Số mục', 'Link trả lời', 'Link kết quả (Sheet)', 'Link sửa form', 'Thống kê', 'Form ID', 'Sheet ID']);
    P.setProperty(SV.LOG_PROP, ss.getId());
    try { DriveApp.getFileById(ss.getId()).moveTo(svFolder_()); } catch (x) {}
  }
  return ss.getSheetByName('LOG') || ss.getSheets()[0];
}

function svLog_(o) {
  try {
    svLogSheet_().appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), o.type, o.title, o.items,
      o.shortUrl, o.sheetUrl, o.editUrl, o.summaryUrl, o.formId, o.sheetId]);
  } catch (x) {}
}

function svList_() {
  var sh = svLogSheet_(), v = sh.getDataRange().getValues(), h = v.shift();
  return v.slice(-50).map(function (r) { var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; });
}
