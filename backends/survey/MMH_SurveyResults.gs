/**
 * MMH_SurveyResults.gs v1.1 (13/11/2026; v1.1: app đổi tên MMH Survey, chuyển sang MMH Wiki /mmh-library/survey/; số câu trả lời 14 ngày + câu trả lời gần nhất (giờ · bệnh viện)
 *   cho biểu đồ; thông báo đẩy Web Push: rsPush lưu đăng ký của từng máy, rsTick trả `jobs` để workflow gửi, rsPushGone gỡ máy hết hạn) — app MMH Survey: xem kết quả mọi khảo sát Google Form,
 * thống kê theo từng câu hỏi (số người, %), thêm khảo sát mới bằng link, thông báo khi có câu trả lời mới.
 * Người dùng yêu cầu 13/11/2026.
 *
 * Đăng nhập: phiên email công ty `tk` (Training Hub ▸ rhAuth*, kiểm bằng RH_Secret + RH_Users của Training Master — như dwWho_).
 * Danh sách khảo sát: tab "KẾT QUẢ KHẢO SÁT" trong file nhật ký "MMH Survey · Danh sách form đã tạo".
 * Đọc dữ liệu bằng quyền của tài khoản chạy máy chủ (mmh.product) ⇒ form / Sheet của người khác phải chia sẻ cho tài khoản này.
 *
 *   GET ?action=rsList&tk=…                    ⇒ {ok, me, items:[{id,title,n,last,by,at,watch,watchers,formUrl,sheetUrl,canDel}]}
 *   GET ?action=rsAdd&tk=…&link=<link form sửa | link Sheet kết quả | forms.gle>   ⇒ {ok, item, dup}
 *   GET ?action=rsData&tk=…&id=…               ⇒ {ok, title, n, questions:[…], answers:[[ms, [giá trị theo câu]]], pii}
 *   GET ?action=rsWatch&tk=…&id=…&on=1|0       ⇒ theo dõi (nhận thông báo "Nhắc tôi" khi có câu trả lời mới)
 *   GET ?action=rsRemove&tk=…&id=…             ⇒ ẩn khỏi danh sách (Admin hoặc người thêm)
 *   GET ?action=rsTick&key=<SV.KEY>            ⇒ quét số câu trả lời, ghi RH_Notify cho người theo dõi (GitHub Actions gọi mỗi giờ)
 * Mọi lệnh nhận callback=… (JSONP).
 *
 * Câu hỏi lấy theo FORM HIỆN TẠI: câu trùng tiêu đề (nhánh "ít nhất một phần") gộp làm một; tiêu đề lựa chọn bỏ đuôi "(chuyển sang …)".
 * Họ tên / số điện thoại / email chỉ trả cho Admin / Giám đốc / Trưởng bộ phận và người thêm khảo sát.
 */
var RS = {
  VER: '1.1', TAB: 'KẾT QUẢ KHẢO SÁT', PUSH_TAB: 'THÔNG BÁO ĐẨY',
  PUSH_HEAD: ['PIC', 'Endpoint', 'p256dh', 'auth', 'Thiết bị', 'Đăng ký lúc'],
  HEAD: ['Id', 'Form ID', 'Sheet ID', 'Tiêu đề', 'Thêm bởi', 'Thêm lúc', 'Theo dõi', 'Đã báo (số câu trả lời)', 'Ẩn'],
  APP: 'https://manimedicalhanoi.github.io/mmh-library/survey/',
  SEED: ['1r5CwavKqJMGtPN78QC2Ig92-ByOn7zNZ_2ugq-ZOAZQ', '1c7jwBaP96NVMIQCdpRZ4cZNn9BWjLDatCdCQ0G2p1x8'],
  OWNER: 'mmh.product@manimedicalhanoi.com',
  PII: /h[ọo]\s*(v[àa]\s*)?t[êe]n|s[ốo]\s*đi[ệe]n\s*tho[ạa]i|đi[ệe]n\s*tho[ạa]i|\bsđt\b|e-?mail/i,
  NOTIFY_HEAD: ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt']
};

function rsS_(v) { return String(v == null ? '' : v).trim(); }
function rsLocal_(e) { return rsS_(e).toLowerCase().split('@')[0]; }
function rsTrue_(v) { return v === true || /^(true|1|x|yes|có)$/i.test(rsS_(v)); }
function rsOut_(o, p) {
  var cb = p && p.callback;
  if (cb && /^[\w.$]{1,64}$/.test(cb)) return ContentService.createTextOutput(cb + '(' + JSON.stringify(o) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return svOut_(o);
}

/* ---------- đăng nhập (giống dwWho_ của du-tru-npp) ---------- */
function rsWho_(tk) {
  var NEED = 'Kết quả khảo sát chỉ dành cho nhân sự MMH — đăng nhập bằng email công ty.';
  tk = rsS_(tk); var dot = tk.indexOf('.');
  if (dot < 10) return { err: NEED };
  var data = tk.substring(0, dot), sig = tk.substring(dot + 1), t;
  try { t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); } catch (e) { return { err: 'Phiên đăng nhập không hợp lệ.' }; }
  if (!t || !t.x || Date.now() > t.x) return { err: 'Phiên đăng nhập đã hết hạn — đăng nhập lại.' };
  if (t.e && String(t.e).indexOf('@') >= 0 && !/@(manimedicalhanoi\.com|mani\.inc)$/i.test(String(t.e))) return { err: NEED };
  var c = CacheService.getScriptCache();
  var key = 'rsw_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, tk)).slice(0, 40);
  try { var hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) {}
  var book;
  try { book = SpreadsheetApp.openById(SVTM.ID); } catch (e) { return { err: 'Máy chủ chưa đọc được Training Master để kiểm phiên đăng nhập.' }; }
  var sec = book.getSheetByName('RH_Secret'), s = sec ? rsS_(sec.getRange(2, 1).getValue()) : '';
  var want = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, s)).replace(/=+$/, '');
  if (s.length < 32 || sig !== want) return { err: 'Phiên đăng nhập không hợp lệ.' };
  var us = book.getSheetByName('RH_Users');
  var V = us ? us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 12).getValues() : [], u = null;
  V.forEach(function (r) { if (rsLocal_(r[0]) && rsLocal_(r[0]) === rsLocal_(t.e)) u = r; });
  if (!u) return { err: 'Tài khoản không có trong danh sách người dùng (RH_Users).' };
  if (!(u[4] === '' || rsTrue_(u[4]))) return { err: 'Tài khoản đã bị khoá.' };
  if ((t.s || 1) !== Math.max(1, parseInt(u[5], 10) || 1)) return { err: 'Phiên đăng nhập đã bị đăng xuất từ xa.' };
  var level = rsS_(u[2]).toLowerCase(), admin = rsTrue_(u[3]);
  var me = { local: rsLocal_(t.e), pic: rsS_(u[1]), level: level, admin: admin, priv: admin || /admin|director|hod|head/.test(level) };
  try { c.put(key, JSON.stringify(me), 1800); } catch (e) {}
  return me;
}

/* ---------- danh sách khảo sát (tab KẾT QUẢ KHẢO SÁT) ---------- */
function rsSheet_() {
  var ss = svLogSheet_().getParent(), sh = ss.getSheetByName(RS.TAB);
  if (!sh) {
    sh = ss.insertSheet(RS.TAB);
    sh.getRange(1, 1, 1, RS.HEAD.length).setValues([RS.HEAD]).setFontWeight('bold').setBackground('#CFE2F3');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rsRead_() {
  var sh = rsSheet_(), last = sh.getLastRow(); if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, RS.HEAD.length).getValues().map(function (r, i) {
    return { row: i + 2, id: rsS_(r[0]), formId: rsS_(r[1]), sheetId: rsS_(r[2]), title: rsS_(r[3]), by: rsS_(r[4]),
      at: r[5] instanceof Date ? r[5].toISOString() : rsS_(r[5]), watch: rsS_(r[6]) ? rsS_(r[6]).split(/\s*,\s*/) : [],
      told: rsS_(r[7]) === '' ? null : Number(r[7]), hidden: rsTrue_(r[8]) };
  }).filter(function (x) { return x.id; });
}
function rsWriteRow_(e) {
  rsSheet_().getRange(e.row, 1, 1, RS.HEAD.length).setValues([[e.id, e.formId, e.sheetId, e.title, e.by, e.at ? new Date(e.at) : new Date(),
    e.watch.join(', '), e.told == null ? '' : e.told, e.hidden ? 'x' : '']]);
}
function rsAppend_(e) {
  var sh = rsSheet_(); e.row = sh.getLastRow() + 1; rsWriteRow_(e); return e;
}
function rsSeed_(me) {
  if (rsRead_().length) return;
  RS.SEED.forEach(function (sid) {
    try { var r = rsResolve_(sid); var c = rsCount_(r); rsAppend_({ id: r.id, formId: r.formId, sheetId: r.sheetId, title: r.title, by: me.pic, at: new Date().toISOString(), watch: [me.pic], told: c.n, hidden: false }); }
    catch (x) { console.warn('rsSeed_: ' + x.message); }
  });
}

/* ---------- link ⇒ form + Sheet ---------- */
function rsNoAccess_(what) {
  return new Error('Máy chủ chưa mở được ' + what + '. Mở file ▸ Chia sẻ ▸ thêm ' + RS.OWNER + ' (quyền Người xem trở lên) rồi thêm lại. Với form, dán link SỬA form (…/forms/d/…/edit) hoặc link file Sheet kết quả.');
}
function rsResolve_(link) {
  var s = rsS_(link), m, formId = '', sheetId = '';
  if (/forms\.gle\//i.test(s)) {
    try { var r = UrlFetchApp.fetch(s, { followRedirects: false, muteHttpExceptions: true }), loc = r.getHeaders().Location || r.getHeaders().location; if (loc) s = loc; } catch (x) {}
  }
  if ((m = /\/forms\/d\/e\/([\w-]+)/.exec(s))) {
    try { formId = FormApp.openByUrl(s.split('?')[0].replace(/\/(viewform|formResponse).*$/, '/viewform')).getId(); }
    catch (x) { throw new Error('Đây là link TRẢ LỜI form (…/forms/d/e/…). Hãy dán link SỬA form (…/forms/d/…/edit) hoặc link file Sheet kết quả.'); }
  } else if ((m = /\/forms\/d\/([\w-]{20,})/.exec(s))) formId = m[1];
  else if ((m = /\/spreadsheets\/d\/([\w-]{20,})/.exec(s))) sheetId = m[1];
  else if (/^[\w-]{25,}$/.test(s)) {
    try { FormApp.openById(s); formId = s; } catch (x) { sheetId = s; }
  } else throw new Error('Không nhận ra link. Dán link sửa Google Form hoặc link file Google Sheet kết quả.');
  var form = null, title = '';
  if (formId) {
    try { form = FormApp.openById(formId); } catch (x) { throw rsNoAccess_('form này'); }
    try { if (form.getDestinationType() === FormApp.DestinationType.SPREADSHEET) sheetId = form.getDestinationId(); } catch (x) {}
    title = form.getTitle();
  } else {
    var ss;
    try { ss = SpreadsheetApp.openById(sheetId); } catch (x) { throw rsNoAccess_('file Sheet này'); }
    title = ss.getName().replace(/\s*\((Kết quả|Câu trả lời|Responses)\)\s*$/i, '');
    var fu = ''; try { fu = ss.getFormUrl() || ''; } catch (x) {}
    if (fu) { try { form = FormApp.openByUrl(fu); formId = form.getId(); title = form.getTitle(); } catch (x) {} }
  }
  return { id: formId ? 'f:' + formId : 's:' + sheetId, formId: formId, sheetId: sheetId, title: title };
}

/* ---------- số câu trả lời (đọc nhanh từ tab câu trả lời của Sheet; không có Sheet ⇒ đếm trong form) ---------- */
function rsRespSheet_(ss, formId) {
  var all = ss.getSheets(), hit = null;
  all.forEach(function (sh) { var u = ''; try { u = sh.getFormUrl() || ''; } catch (x) {} if (!hit && u && (!formId || u.indexOf(formId) >= 0)) hit = sh; });
  return hit || all[0];
}
function rsCount_(e) {
  var c = CacheService.getScriptCache(), k = 'rsc2_' + e.id;
  try { var h = c.get(k); if (h) return JSON.parse(h); } catch (x) {}
  var out = { n: 0, last: '', today: 0, days: [], recent: [] }, ts = [], hosp = [];
  if (e.sheetId) {
    var sh = rsRespSheet_(SpreadsheetApp.openById(e.sheetId), e.formId), lr = sh.getLastRow(), lc = sh.getLastColumn();
    out.n = Math.max(0, lr - 1);
    if (lr > 1) {
      var head = sh.getRange(1, 1, 1, Math.max(1, lc)).getValues()[0], hc = -1;
      head.forEach(function (t, i) { if (hc < 0 && i > 0 && /bệnh viện|phòng khám|cơ sở công tác|nơi công tác/i.test(rsS_(t))) hc = i; });
      ts = sh.getRange(2, 1, lr - 1, 1).getValues().map(function (r) { return r[0] instanceof Date ? r[0].getTime() : 0; });
      if (hc >= 0) hosp = sh.getRange(2, hc + 1, lr - 1, 1).getValues().map(function (r) { return rsS_(r[0]).slice(0, 60); });
    }
  } else if (e.formId) {
    var rs = FormApp.openById(e.formId).getResponses(); out.n = rs.length;
    ts = rs.map(function (r) { return r.getTimestamp().getTime(); });
  }
  if (ts.length) {
    var lastT = Math.max.apply(null, ts); if (lastT) out.last = new Date(lastT).toISOString();
    var tz = 'Asia/Ho_Chi_Minh', today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), day = {};
    ts.forEach(function (t) { if (t) { var d = Utilities.formatDate(new Date(t), tz, 'yyyy-MM-dd'); day[d] = (day[d] || 0) + 1; } });
    out.today = day[today] || 0;
    for (var i = 13; i >= 0; i--) out.days.push(day[Utilities.formatDate(new Date(Date.now() - i * 864e5), tz, 'yyyy-MM-dd')] || 0);
    var idx = ts.map(function (t, j) { return j; }).sort(function (a, b) { return ts[b] - ts[a]; }).slice(0, 6);
    out.recent = idx.map(function (j) { return [ts[j], hosp[j] || '']; });
  }
  try { c.put(k, JSON.stringify(out), 60); } catch (x) {}
  return out;
}

/* ---------- dữ liệu một khảo sát ---------- */
function rsNorm_(s) { return rsS_(s).replace(/^\s*Câu\s+\d+\s*[.:]\s*/i, '').replace(/\s+/g, ' ').toLowerCase(); }
function rsClean_(v) { return rsS_(v).replace(/\s*\((?:chuyển sang|hoàn thành)[^)]*\)\s*$/i, ''); }
function rsData_(e, me) {
  var cnt = rsCount_(e), pii = !!(me.priv || me.pic === e.by);
  var ck = 'rsd_' + e.id + '_' + cnt.n + '_' + (pii ? 1 : 0), cache = CacheService.getScriptCache();
  var hit = rsCacheGet_(cache, ck); if (hit) return hit;
  if (!e.formId) throw new Error('Khảo sát này chưa nối với Google Form nào — máy chủ chỉ thống kê được khảo sát làm bằng Google Form.');
  var form = FormApp.openById(e.formId), T = FormApp.ItemType;
  var Q = [], byKey = {}, map = {}, sec = '', grp = '';
  form.getItems().forEach(function (it) {
    var t = it.getType(), title = rsS_(it.getTitle());
    if (t === T.PAGE_BREAK) { sec = title.replace(/\s*\(tiếp\)\s*$/i, ''); grp = ''; return; }
    if (t === T.SECTION_HEADER) { if (/^Câu\s+\d+/i.test(title)) grp = title; else { sec = title; grp = ''; } return; }
    var q = { t: '', opts: [], other: false };
    if (t === T.MULTIPLE_CHOICE) { var a = it.asMultipleChoiceItem(); q.t = 'radio'; q.opts = a.getChoices().map(function (c) { return rsClean_(c.getValue()); }); q.other = a.hasOtherOption(); }
    else if (t === T.LIST) { q.t = 'radio'; q.opts = it.asListItem().getChoices().map(function (c) { return rsClean_(c.getValue()); }); }
    else if (t === T.CHECKBOX) { var b = it.asCheckboxItem(); q.t = 'checkbox'; q.opts = b.getChoices().map(function (c) { return rsClean_(c.getValue()); }); q.other = b.hasOtherOption(); }
    else if (t === T.SCALE) { var s = it.asScaleItem(); q.t = 'scale'; q.lo = s.getLowerBound(); q.hi = s.getUpperBound(); q.ll = s.getLeftLabel(); q.hl = s.getRightLabel();
      for (var i = q.lo; i <= q.hi; i++) q.opts.push(String(i)); }
    else if (t === T.GRID) { var g = it.asGridItem(); q.t = 'grid'; q.rows = g.getRows(); q.cols = g.getColumns(); }
    else if (t === T.CHECKBOX_GRID) { var g2 = it.asCheckboxGridItem(); q.t = 'checkgrid'; q.rows = g2.getRows(); q.cols = g2.getColumns(); }
    else if (t === T.TEXT || t === T.PARAGRAPH_TEXT || t === T.DATE || t === T.TIME || t === T.DATETIME || t === T.DURATION) { q.t = 'text'; }
    else return;
    var key = rsNorm_(grp) + '|' + rsNorm_(title) + '|' + q.t;
    if (byKey[key] != null) {
      var o = Q[byKey[key]]; (q.opts || []).forEach(function (v) { if (o.opts.indexOf(v) < 0) o.opts.push(v); }); o.other = o.other || q.other;
      map[it.getId()] = byKey[key]; return;
    }
    q.k = Q.length; q.q = title; q.grp = grp; q.sec = sec; q.pii = q.t === 'text' && RS.PII.test(title);
    byKey[key] = q.k; map[it.getId()] = q.k; Q.push(q);
  });
  var A = form.getResponses().map(function (r) {
    var a = []; for (var i = 0; i < Q.length; i++) a.push(null);
    r.getItemResponses().forEach(function (ir) {
      var id; try { id = ir.getItem().getId(); } catch (x) { return; }
      var k = map[id]; if (k == null || a[k] != null) return;
      var q = Q[k], v = ir.getResponse();
      if (v == null || v === '') return;
      if (q.pii && !pii) return;
      if (q.t === 'checkbox') v = (Array.isArray(v) ? v : [v]).map(rsClean_);
      else if (q.t === 'grid') v = (v || []).map(function (x) { return x == null ? null : rsS_(x); });
      else if (q.t === 'checkgrid') v = (v || []).map(function (x) { return x == null ? null : (Array.isArray(x) ? x : [x]).map(rsS_); });
      else v = rsClean_(v);
      a[k] = v;
    });
    return [r.getTimestamp().getTime(), a];
  });
  var out = { ok: true, v: RS.VER, id: e.id, title: form.getTitle(), n: A.length, last: cnt.last, pii: pii,
    formUrl: form.getPublishedUrl(), editUrl: form.getEditUrl(), sheetUrl: e.sheetId ? 'https://docs.google.com/spreadsheets/d/' + e.sheetId + '/edit' : '',
    accepting: form.isAcceptingResponses(), questions: Q, answers: A };
  rsCachePut_(cache, ck, out, 300);
  return out;
}
/* đệm chia mảnh (CacheService ≤ 100 KB / khoá) */
function rsCachePut_(c, k, o, ttl) {
  try {
    var s = JSON.stringify(o), n = Math.ceil(s.length / 90000), m = {};
    for (var i = 0; i < n; i++) m[k + '#' + i] = s.substr(i * 90000, 90000);
    m[k] = String(n); c.putAll(m, ttl);
  } catch (x) {}
}
function rsCacheGet_(c, k) {
  try {
    var n = Number(c.get(k)); if (!n) return null;
    var ks = []; for (var i = 0; i < n; i++) ks.push(k + '#' + i);
    var got = c.getAll(ks), s = ''; for (var j = 0; j < n; j++) { if (got[ks[j]] == null) return null; s += got[ks[j]]; }
    return JSON.parse(s);
  } catch (x) { return null; }
}

/* ---------- thông báo đẩy (Web Push) — mỗi máy bật thông báo 1 dòng; workflow GitHub gửi bằng khoá VAPID ---------- */
function rsPushSheet_() {
  var ss = svLogSheet_().getParent(), sh = ss.getSheetByName(RS.PUSH_TAB);
  if (!sh) { sh = ss.insertSheet(RS.PUSH_TAB); sh.getRange(1, 1, 1, RS.PUSH_HEAD.length).setValues([RS.PUSH_HEAD]).setFontWeight('bold').setBackground('#EFEDE7'); sh.setFrozenRows(1); }
  return sh;
}
function rsPushRead_() {
  var sh = rsPushSheet_(), last = sh.getLastRow(); if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, RS.PUSH_HEAD.length).getValues().map(function (r, i) { return { row: i + 2, pic: rsS_(r[0]), ep: rsS_(r[1]), p256dh: rsS_(r[2]), auth: rsS_(r[3]) }; })
    .filter(function (x) { return x.ep; });
}
function rsPushDel_(eps) {
  var sh = rsPushSheet_(), L = rsPushRead_(), n = 0;
  L.filter(function (x) { return eps.indexOf(x.ep) >= 0; }).sort(function (a, b) { return b.row - a.row; }).forEach(function (x) { sh.deleteRow(x.row); n++; });
  return n;
}

/* ---------- thông báo câu trả lời mới ⇒ RH_Notify (nút "Nhắc tôi" của Report Hub / CRM) ---------- */
function rsTick_() {
  var rows = [], jobs = [], L = rsRead_(), now = new Date(), changed = 0, subs = null;
  L.forEach(function (e) {
    if (e.hidden) return;
    var n; try { n = rsCount_(e).n; } catch (x) { return; }
    if (e.told == null) { e.told = n; rsWriteRow_(e); return; }
    if (n > e.told) {
      var d = n - e.told, rc = [];
      try { rc = rsCount_(e).recent.slice(0, Math.min(d, 6)).map(function (x) { return x[1]; }).filter(function (x) { return x; }); } catch (x) {}
      var body = '+' + d + ' câu trả lời mới · tổng ' + n + (rc.length ? ' · ' + rc.slice(0, 3).join(', ') : '');
      if (subs == null) { try { subs = rsPushRead_(); } catch (x) { subs = []; } }
      subs.forEach(function (sb) { if (e.watch.indexOf(sb.pic) >= 0) jobs.push({ ep: sb.ep, p256dh: sb.p256dh, auth: sb.auth, title: e.title, body: body, url: RS.APP + '#s=' + encodeURIComponent(e.id), tag: e.id }); });
      e.watch.forEach(function (pic) {
        if (!pic) return;
        rows.push(['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), now, pic, 'Khảo sát', 'new', e.title.slice(0, 300),
          body, RS.APP + '#s=' + encodeURIComponent(e.id), 'Kết quả khảo sát', '', '', '']);
      });
      e.told = n; rsWriteRow_(e); changed++;
    } else if (n < e.told) { e.told = n; rsWriteRow_(e); }
  });
  if (rows.length) {
    try {
      var book = SpreadsheetApp.openById(SVTM.ID), sh = book.getSheetByName('RH_Notify');
      if (!sh) { sh = book.insertSheet('RH_Notify'); sh.getRange(1, 1, 1, RS.NOTIFY_HEAD.length).setValues([RS.NOTIFY_HEAD]).setFontWeight('bold'); sh.setFrozenRows(1); }
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, RS.NOTIFY_HEAD.length).setValues(rows);
    } catch (x) { console.warn('rsTick_ RH_Notify: ' + x.message); }
  }
  return { ok: true, surveys: L.length, changed: changed, notified: rows.length, jobs: jobs };
}
function rsTickLazy_() {
  var c = CacheService.getScriptCache(); if (c.get('rs_tick')) return; c.put('rs_tick', '1', 600);
  var lock = LockService.getScriptLock(); if (!lock.tryLock(3000)) return;
  try { rsTick_(); } catch (x) { console.warn('rsTickLazy_: ' + x.message); } finally { lock.releaseLock(); }
}

/* ---------- route (gọi từ svHandle_, TRƯỚC bước kiểm khoá) ---------- */
function rsRoute_(a, p) {
  try {
    if (a === 'rsPushGone') {
      var wg = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
      if (p.key !== wg) return rsOut_({ ok: false, error: 'KEY' }, p);
      var eps = []; try { eps = JSON.parse(p.eps || '[]'); } catch (x) {}
      return rsOut_({ ok: true, removed: rsPushDel_(eps) }, p);
    }
    if (a === 'rsTick') {
      var want = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
      if (p.key !== want) return rsOut_({ ok: false, error: 'KEY' }, p);
      var lk = LockService.getScriptLock(); lk.waitLock(20000);
      try { return rsOut_(rsTick_(), p); } finally { lk.releaseLock(); }
    }
    if (a === 'rsDiag') {  // kiểm tra từ workflow Kiểm tra (khoá): đọc 1 link ⇒ CHỈ số đếm từng câu, không trả câu trả lời / thông tin cá nhân
      var want2 = PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY;
      if (p.key !== want2) return rsOut_({ ok: false, error: 'KEY' }, p);
      var rr = rsResolve_(p.link), dd = rsData_({ id: rr.id, formId: rr.formId, sheetId: rr.sheetId, by: '' }, { priv: false, pic: '' });
      return rsOut_({ ok: true, id: rr.id, title: dd.title, n: dd.n, last: dd.last, q: dd.questions.map(function (q, i) {
        var c = 0; dd.answers.forEach(function (x) { if (x[1][i] != null) c++; });
        return q.k + '|' + q.t + '|' + c + '|' + q.q.slice(0, 40) + (q.pii ? '|pii' : '');
      }) }, p);
    }
    var me = rsWho_(p.tk);
    if (me.err) return rsOut_({ ok: false, code: 'AUTH', error: me.err }, p);
    if (a === 'rsList') {
      rsSeed_(me);
      var items = rsRead_().filter(function (e) { return !e.hidden; }).map(function (e) {
        var c = { n: 0, last: '' }, err = '';
        try { c = rsCount_(e); } catch (x) { err = 'Không đọc được: ' + x.message; }
        return { id: e.id, title: e.title, n: c.n, last: c.last, today: c.today || 0, days: c.days || [], recent: (c.recent || []).slice(0, 4), by: e.by, at: e.at, watch: e.watch.indexOf(me.pic) >= 0, watchers: e.watch.length,
          formUrl: e.formId ? 'https://docs.google.com/forms/d/' + e.formId + '/edit' : '', sheetUrl: e.sheetId ? 'https://docs.google.com/spreadsheets/d/' + e.sheetId + '/edit' : '',
          canDel: me.admin || me.pic === e.by, err: err };
      });
      return rsOut_({ ok: true, v: RS.VER, me: { pic: me.pic, priv: me.priv, admin: me.admin }, owner: RS.OWNER, items: items }, p);
    }
    if (a === 'rsPush') {
      var sub = {}; try { sub = JSON.parse(p.sub || '{}'); } catch (x) {}
      var ep = rsS_(sub.endpoint); if (!/^https:\/\//.test(ep)) return rsOut_({ ok: false, error: 'Đăng ký thông báo không hợp lệ.' }, p);
      rsPushDel_([ep]);
      if (p.op !== 'del') {
        var ks = sub.keys || {};
        rsPushSheet_().appendRow([me.pic, ep, rsS_(ks.p256dh), rsS_(ks.auth), rsS_(p.dev).slice(0, 80), new Date()]);
      }
      return rsOut_({ ok: true, on: p.op !== 'del' }, p);
    }
    var L = rsRead_(), e = null;
    if (p.id) L.forEach(function (x) { if (x.id === p.id) e = x; });
    if (a === 'rsData') {
      if (!e || e.hidden) return rsOut_({ ok: false, error: 'Không có khảo sát này trong danh sách.' }, p);
      return rsOut_(rsData_(e, me), p);
    }
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      if (a === 'rsAdd') {
        var r = rsResolve_(p.link), dup = null;
        rsRead_().forEach(function (x) { if (x.id === r.id || (r.formId && x.formId === r.formId) || (r.sheetId && x.sheetId === r.sheetId)) dup = x; });
        if (dup) {
          if (dup.hidden) { dup.hidden = false; if (dup.watch.indexOf(me.pic) < 0) dup.watch.push(me.pic); rsWriteRow_(dup); }
          return rsOut_({ ok: true, dup: true, item: { id: dup.id, title: dup.title } }, p);
        }
        var cn = rsCount_(r);
        var ne = rsAppend_({ id: r.id, formId: r.formId, sheetId: r.sheetId, title: r.title, by: me.pic, at: new Date().toISOString(), watch: [me.pic], told: cn.n, hidden: false });
        return rsOut_({ ok: true, item: { id: ne.id, title: ne.title, n: cn.n } }, p);
      }
      if (!e) return rsOut_({ ok: false, error: 'Không có khảo sát này trong danh sách.' }, p);
      if (a === 'rsWatch') {
        var on = String(p.on) !== '0', i = e.watch.indexOf(me.pic);
        if (on && i < 0) e.watch.push(me.pic); if (!on && i >= 0) e.watch.splice(i, 1);
        rsWriteRow_(e); return rsOut_({ ok: true, watch: on }, p);
      }
      if (a === 'rsRemove') {
        if (!(me.admin || me.pic === e.by)) return rsOut_({ ok: false, error: 'Chỉ Admin hoặc người thêm khảo sát mới bỏ được khỏi danh sách.' }, p);
        e.hidden = true; rsWriteRow_(e); return rsOut_({ ok: true }, p);
      }
    } finally { lock.releaseLock(); }
    return rsOut_({ ok: false, error: 'ACTION' }, p);
  } catch (err) {
    return rsOut_({ ok: false, error: String(err && err.message || err) }, p);
  }
}
