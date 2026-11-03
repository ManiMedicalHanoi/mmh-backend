/**
 * MMH_SurveyQuiz.gs v1.0 (03/11/2026) — trang LÀM BÀI KIỂM TRA của web app survey.
 *   <exec>?t=<formId>  ⇒ học viên điền thông tin ⇒ "Bắt đầu" ⇒ đồng hồ đếm ngược (minutes), hết giờ tự nộp
 *   ⇒ chấm trên máy chủ (đáp án KHÔNG gửi xuống trình duyệt) ⇒ hiện điểm, Đạt / Chưa đạt (mốc passScore), giải thích câu sai
 *   ⇒ ghi tab "Tổng hợp bài làm" của Sheet kết quả + 1 lượt trả lời Google Form (để có thống kê) ⇒ email notify[] (kèm link Sheet).
 * Cấu hình từng bài: Script Property "Q_<formId>" (JSON, ghi lúc tạo — svQuizSetup_). Khoá ký phiên làm bài: "SV_SECRET".
 * Lần đầu có email: chủ script (tài khoản deploy) mở trình soạn ▸ chọn hàm svCapQuyen ▸ Run ▸ Allow.
 */
var SVQ = { TAB: 'Tổng hợp bài làm', GRACE: 90 };

function svCapQuyen() {  // chạy 1 lần trong trình soạn để cấp quyền gửi email (và Forms / Drive / Sheets)
  Logger.log('Email còn gửi được hôm nay: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Drive: ' + DriveApp.getRootFolder().getName() + ' · Forms OK: ' + (typeof FormApp.create === 'function'));
  Logger.log('UrlFetch: ' + UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=kind', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }).getResponseCode());
}

function svQuizCfg_(formId) {
  var s = PropertiesService.getScriptProperties().getProperty('Q_' + formId);
  return s ? JSON.parse(s) : null;
}

/* ---- lúc tạo bài: lưu cấu hình, tab tổng hợp, chia sẻ Sheet cho người nhận email ---- */
function svQuizSetup_(form, ss, spec, c, notes) {
  var cfg = {
    title: spec.title, intro: spec.intro || '', minutes: Number(spec.minutes || 0), countdown: spec.countdown !== false,
    total: c.total, pass: c.pass, notify: c.notify, sheetId: ss.getId(), info: c.info, qs: c.qs,
    shuffle: spec.shuffle !== false, showAnswers: spec.showAnswers !== false, created: new Date().toISOString()
  };
  PropertiesService.getScriptProperties().setProperty('Q_' + form.getId(), JSON.stringify(cfg));
  var sh = ss.insertSheet(SVQ.TAB, 0);
  var head = ['Thời gian nộp'].concat(c.info.map(function (i) { return i.q; }),
    ['Điểm', 'Tổng điểm', 'Mốc đạt', 'Kết quả', 'Thời gian làm', 'Giới hạn (phút)', 'Hết giờ tự nộp', 'Ghi chú', 'Câu sai'],
    c.qs.map(function (_, i) { return 'Câu ' + (i + 1); }));
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#F0F7FF').setFontColor('#003047');
  sh.setFrozenRows(1);
  (c.notify || []).forEach(function (m) { try { ss.addViewer(m); } catch (x) { notes.push('Chia sẻ Sheet cho ' + m + ': ' + x.message); } });
  return SV.PAGE + '?q=' + svQuizCode_(form.getId());
}

/* Thông tin bài cho trang làm bài (không có đáp án) — dùng chung cho trang Apps Script và trang GitHub Pages.
 * Lý do có trang GitHub Pages (v2.5): trình duyệt đăng nhập nhiều tài khoản Google / trình duyệt trong app mở trang HtmlService ⇒ Google báo
 * "Rất tiếc, không thể mở tệp tại thời điểm này" (lỗi đã biết của web app Apps Script). */
function svQuizMeta_(formId) {
  var cfg = svQuizCfg_(formId);
  return { id: formId, title: cfg.title, intro: cfg.intro, minutes: cfg.countdown ? cfg.minutes : 0, total: cfg.total, pass: cfg.pass,
    n: cfg.qs.length, info: cfg.info.map(function (i) { return { id: i.id, t: i.t, q: i.q, required: i.required, options: i.options }; }) };
}

/* Link làm bài: KHÔNG để mã file Drive trên URL web app (?t=<formId>) — trình duyệt đã đăng nhập Google bị cổng Google chặn
 * ("Rất tiếc, không thể mở tệp tại thời điểm này", giống lỗi fileId của Training Hub v3.24) ⇒ mã ngắn ?q=<8 ký tự> (Script Property QC_<mã> = formId). */
function svQuizCode_(formId) {
  var P = PropertiesService.getScriptProperties(), cfg = svQuizCfg_(formId);
  if (cfg && cfg.code) return cfg.code;
  var abc = 'abcdefghijkmnpqrstuvwxyz23456789', code;
  do { code = ''; for (var i = 0; i < 8; i++) code += abc.charAt(Math.floor(Math.random() * abc.length)); } while (P.getProperty('QC_' + code));
  P.setProperty('QC_' + code, formId);
  if (cfg) { cfg.code = code; P.setProperty('Q_' + formId, JSON.stringify(cfg)); }
  return code;
}
function svQuizFromCode_(code) { return PropertiesService.getScriptProperties().getProperty('QC_' + String(code || '').replace(/[^a-z0-9]/g, '')) || ''; }

function svQuizNotify_(formId, list) {
  var P = PropertiesService.getScriptProperties(), cfg = svQuizCfg_(formId), notes = [];
  cfg.notify = list.filter(function (m) { return /@/.test(m); });
  P.setProperty('Q_' + formId, JSON.stringify(cfg));
  try { var ss = SpreadsheetApp.openById(cfg.sheetId); cfg.notify.forEach(function (m) { try { ss.addViewer(m); } catch (x) { notes.push(m + ': ' + x.message); } }); } catch (x) { notes.push(x.message); }
  return notes;
}

/* ---- trang ---- */
function svQuizPage_(formId) {
  var cfg = svQuizCfg_(formId);
  if (!cfg) return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">Không tìm thấy bài kiểm tra này.</p>');
  var t = HtmlService.createTemplateFromFile('SurveyQuiz');
  t.data = JSON.stringify(svQuizMeta_(formId)).replace(/</g, '\\u003c');
  return t.evaluate().setTitle(cfg.title).addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---- phiên làm bài (ký HMAC, không lưu máy chủ) ---- */
function svSecret_() {
  var P = PropertiesService.getScriptProperties(), s = P.getProperty('SV_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('SV_SECRET', s); }
  return s;
}
function svSign_(o) {
  var body = Utilities.base64EncodeWebSafe(JSON.stringify(o));
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, svSecret_()));
  return body + '.' + sig;
}
function svVerify_(tok) {
  var p = String(tok || '').split('.');
  if (p.length !== 2) return null;
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p[0], svSecret_()));
  if (sig !== p[1]) return null;
  return JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p[0])).getDataAsString());
}

function svShuffle_(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

function svItem_(form, id) {
  var it = form.getItemById(Number(id)); if (!it) return null;
  var T = FormApp.ItemType, ty = it.getType();
  if (ty === T.MULTIPLE_CHOICE) return { it: it.asMultipleChoiceItem(), kind: 'radio' };
  if (ty === T.CHECKBOX) return { it: it.asCheckboxItem(), kind: 'checkbox' };
  if (ty === T.LIST) return { it: it.asListItem(), kind: 'radio' };
  return null;
}

/* google.script.run: bắt đầu ⇒ câu hỏi (không kèm đáp án) + vé thời gian */
function svQuizStart(formId, info) {
  var cfg = svQuizCfg_(formId); if (!cfg) throw new Error('Không tìm thấy bài kiểm tra.');
  var name = String(info && info.name || '').trim();
  if (!name) throw new Error('Vui lòng nhập Họ và tên.');
  var form = FormApp.openById(formId);
  var qs = cfg.qs.map(function (id, i) {
    var x = svItem_(form, id); if (!x) return null;
    var opts = x.it.getChoices().map(function (c) { return c.getValue(); });
    return { id: String(id), no: i + 1, q: x.it.getTitle(), help: x.it.getHelpText(), kind: x.kind, options: cfg.shuffle ? svShuffle_(opts) : opts, pts: x.it.getPoints() };
  }).filter(function (q) { return q; });
  if (cfg.shuffle) svShuffle_(qs);
  var now = Date.now();
  return { token: svSign_({ f: formId, s: now, n: Utilities.getUuid().slice(0, 8) }), now: now, minutes: cfg.countdown ? cfg.minutes : 0, qs: qs };
}

/* google.script.run: nộp bài ⇒ chấm, ghi Sheet, lượt Form, email */
function svQuizSubmit(formId, token, info, answers, auto) {
  var cfg = svQuizCfg_(formId); if (!cfg) throw new Error('Không tìm thấy bài kiểm tra.');
  var tk = svVerify_(token);
  if (!tk || tk.f !== formId) throw new Error('Phiên làm bài không hợp lệ — vui lòng tải lại trang và làm lại.');
  var cache = CacheService.getScriptCache(), ck = 'svq_' + tk.n;
  var done = cache.get(ck); if (done) return JSON.parse(done);  // gửi lại (mạng chập chờn) ⇒ trả kết quả cũ, không ghi 2 lần
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    done = cache.get(ck); if (done) return JSON.parse(done);
    var form = FormApp.openById(formId), now = Date.now();
    var used = Math.round((now - tk.s) / 1000), limit = cfg.countdown ? cfg.minutes * 60 : 0;
    var late = limit && used > limit + SVQ.GRACE;
    answers = answers || {};
    var score = 0, rows = [], wrong = [], resp = form.createResponse(), detail = [];
    cfg.qs.forEach(function (id, i) {
      var x = svItem_(form, id); if (!x) { detail.push(''); return; }
      var choices = x.it.getChoices(), correct = choices.filter(function (c) { return c.isCorrectAnswer(); }).map(function (c) { return c.getValue(); });
      var a = answers[String(id)], pick = x.kind === 'checkbox' ? (Array.isArray(a) ? a : (a ? [a] : [])) : (a ? [String(a)] : []);
      pick = pick.filter(function (v) { return choices.some(function (c) { return c.getValue() === v; }); });
      var ok = pick.length > 0 && pick.length === correct.length && pick.every(function (v) { return correct.indexOf(v) >= 0; });
      var pts = x.it.getPoints() || 0;
      if (ok) score += pts; else wrong.push(i + 1);
      var exp = '';
      try { var fb = x.it.getFeedbackForIncorrect(); exp = fb ? fb.getText().replace(/^Chưa đúng\.\s*/, '') : ''; } catch (e) {}
      rows.push({ no: i + 1, q: x.it.getTitle(), pick: pick, correct: correct, ok: ok, exp: exp });
      detail.push((pick.join(' | ') || '(bỏ trống)') + (ok ? ' ✓' : ' ✗'));
      if (pick.length) { try { resp.withItemResponse(x.kind === 'checkbox' ? x.it.createResponse(pick) : x.it.createResponse(pick[0])); } catch (e) {} }
    });
    var infoVals = cfg.info.map(function (f) { return String(info && info[f.id] || '').trim(); });
    cfg.info.forEach(function (f, i) {
      var v = infoVals[i]; if (!v) return;
      try {
        var it = form.getItemById(Number(f.id)), T = FormApp.ItemType;
        if (it.getType() === T.TEXT) resp.withItemResponse(it.asTextItem().createResponse(v));
        else if (it.getType() === T.LIST) resp.withItemResponse(it.asListItem().createResponse(v));
        else if (it.getType() === T.MULTIPLE_CHOICE) resp.withItemResponse(it.asMultipleChoiceItem().createResponse(v));
      } catch (e) {}
    });
    var formNote = '';
    try { resp.submit(); } catch (e) { formNote = 'Không ghi được lượt Google Form: ' + e.message; }
    var pass = score >= cfg.pass;
    var mmss = Math.floor(used / 60) + ':' + ('0' + (used % 60)).slice(-2);
    var note = [late ? 'Nộp quá giờ' : '', formNote].filter(String).join(' · ');
    var ss = SpreadsheetApp.openById(cfg.sheetId), sh = ss.getSheetByName(SVQ.TAB) || ss.insertSheet(SVQ.TAB, 0);
    var stamp = Utilities.formatDate(new Date(now), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
    sh.appendRow([stamp].concat(infoVals, [score, cfg.total, cfg.pass, pass ? 'Đạt' : 'Chưa đạt', mmss, cfg.countdown ? cfg.minutes : '', auto ? 'Có' : '', note, wrong.join(', ')], detail));
    var res = { ok: true, score: score, total: cfg.total, pass: cfg.pass, passed: pass, used: mmss, late: !!late, wrong: wrong,
      rows: cfg.showAnswers ? rows.filter(function (r) { return !r.ok; }) : [] };
    svQuizMail_(cfg, ss, infoVals, res, stamp, auto);
    cache.put(ck, JSON.stringify(res), 21600);
    return res;
  } finally { lock.releaseLock(); }
}

function svEsc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function svQuizMail_(cfg, ss, infoVals, r, stamp, auto) {
  var to = (cfg.notify || []).filter(function (m) { return /@/.test(m); });
  if (!to.length) return;
  var name = infoVals[0] || '(chưa ghi tên)';
  var who = cfg.info.map(function (f, i) { return i && infoVals[i] ? f.q + ': ' + infoVals[i] : ''; }).filter(String);
  var url = ss.getUrl();
  var lines = [
    'Dear anh/chị,',
    '',
    svEsc_(name) + (who.length ? ' (' + svEsc_(who.join(' · ')) + ')' : '') + ' vừa hoàn thành bài kiểm tra <b>' + svEsc_(cfg.title) + '</b> lúc ' + stamp + '.',
    '',
    'Điểm: <b>' + r.score + '/' + r.total + '</b> · Mốc đạt: ' + r.pass + '/' + r.total + ' · Kết quả: <b>' + (r.passed ? 'Đạt' : 'Chưa đạt') + '</b>',
    'Thời gian làm: ' + r.used + (cfg.countdown && cfg.minutes ? ' / ' + cfg.minutes + ' phút' : '') + (auto ? ' (hết giờ, hệ thống tự nộp)' : '') + (r.late ? ' — nộp quá giờ' : ''),
    'Câu sai: ' + (r.wrong.length ? r.wrong.join(', ') : 'không có'),
    '',
    'File tổng hợp tất cả kết quả: <a href="' + url + '">' + url + '</a>',
    '',
    'Best regards,',
    'MMH Training',
    '<span style="color:#888">Email tự động từ hệ thống bài kiểm tra MMH — vui lòng không trả lời.</span>'
  ];
  try {
    mmhMail_({ to: to.join(','), subject: '[Kết quả bài kiểm tra] ' + name + ' · ' + r.score + '/' + r.total + ' · ' + (r.passed ? 'Đạt' : 'Chưa đạt') + ' — ' + cfg.title,
      htmlBody: '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1d2733">' + lines.join('<br>') + '</div>',
      body: lines.join('\n').replace(/<[^>]+>/g, ''), name: 'MMH Training' });
  } catch (e) { console.warn('svQuizMail_: ' + e.message); }
}

/* ---- trang tạo form từ link (dự phòng): <exec>?b=1&k=<key>#<spec gzip base64url> ---- */
function svBuilderPage_(k) {
  var t = HtmlService.createTemplateFromFile('SurveyBuilder');
  t.k = JSON.stringify(String(k || '')).replace(/</g, '\\u003c');
  return t.evaluate().setTitle('Tạo Google Form · MMH').addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function svBuilderPeek(z) { var s = svUnz_(z); return { title: s.title, type: s.type || 'survey', sections: (s.sections || []).length, n: (s.sections || []).reduce(function (a, x) { return a + (x.questions || []).length; }, 0) }; }
function svBuilderCreate(k, z) {
  var want = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
  if (k !== want) throw new Error('Sai khoá tạo form.');
  var spec = svUnz_(z);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { return svCreate_(spec); } finally { lock.releaseLock(); svTrashPartial_(); }
}
