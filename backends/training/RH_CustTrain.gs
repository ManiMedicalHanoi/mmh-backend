/* ════════════════════════════════════════════════════════════════════════════════════════
   RH_CustTrain.gs — v1.0 (13/10/2026) · COACHING (bằng chứng PDF Review) + ĐÀO TẠO KHÁCH HÀNG (T&E) TỪ CRM
   ────────────────────────────────────────────────────────────────────────────────────────
   ① COACHING (Training Type = "Coaching", danh mục Master!C5):
      · Thư mục buổi coaching nằm trong thư mục mẹ riêng "Coaching" (tạo 1 lần trong folder mẹ đào tạo,
        ID lưu Script Property HUB_COACHING_FOLDER), tên thư mục buổi = hubFolderName như mọi buổi khác.
      · Bằng chứng = file PDF trong thư mục con "Review" (upload qua rhUploadInit / uploadInit với path ["Review"],
        thư mục Review chỉ nhận PDF).
      · Chuyển Completed (saveSession / rhSaveSession) khi Review/ chưa có PDF ⇒ từ chối.
      · rhCoachReview (op=status&sid) ⇒ {ok, files:[{name,url}], hasPdf, folderUrl, reviewUrl, canUpload}.
   ② ĐÀO TẠO KHÁCH HÀNG (T&E) — rhCustTrain (CRM, mọi sales có phiên email tk; Admin / Director / HOD xem mọi người):
      · op=list   &team=dental&pic=<PIC|rỗng>[&all=1 kèm buổi Cancel] ⇒ {ok, items:[{sid,date,topic,product,place,pic,team,status,
                  target,actual,review,audience:[{code,name,workplace}],folder,row}]}
      · op=save   &data=<JSON {sid?, team, pic, date(yyyy-MM-dd), topic, product, place, target, actual, review,
                  status:'Plan'|'Completed'|'Cancel', audience:[{code,name,workplace}]}> [&rid] ⇒ {ok, sid, row, folder}
      · op=delete &sid ⇒ {ok} (Status = Cancel, không xoá dòng)
      Dòng ở sheet Training Report: Type External · Category "Customer Training" · Trainer = PIC · Target Audience =
      "Khách hàng: tên · tên …" · Summary = review · thêm các cột hub ở cuối: T&E Team / Product / Place / Target / Actual /
      Review / Audience (JSON). Completed cần Actual > 0 và review đủ 5 dòng mẫu có nội dung (VN hoặc EN).
      Chế độ TEST (tm=1 + phiên Admin, MMH_TestMode.gs): ghi vào sheet HUB_TestSessions, Session ID "TEST-…", Topic "[TEST] …"
      ⇒ KpiSyncCenter không đếm.
   ③ NÂNG CẤP 1 LẦN (tự chạy ở lượt gọi đầu tiên, Script Property HUB_MIG_VER): Master!C5 = "Coaching",
      Master cột B thêm "Customer Training", tạo tiêu đề các cột T&E ở sheet Training Report.
   Không dùng dịch vụ Google mới.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var TE = {
  VER     : '20261013',
  TYPE    : 'External',
  CAT     : 'Customer Training',
  COACH   : 'Coaching',
  REVIEW  : 'Review',
  COLS    : ['T&E Team', 'T&E Product', 'T&E Place', 'T&E Target', 'T&E Actual', 'T&E Review', 'T&E Audience (JSON)'],
  TEAMS   : ['dental', 'surgical', 'eyeless', 'thai', 'thaid'],   // 30/10/2026: thaid = CRM Thailand Dental (Yong · Man · Sui)
  /* 5 dòng mẫu của review (tiếng Việt | tiếng Anh), so khớp không dấu */
  LINES   : [
    ['-Số lượng tham dự thực tế:', '-Actual attendees:',  ['so luong tham du thuc te', 'actual attendees']],
    ['-Tóm tắt hoạt động:',        '-Activity summary:',  ['tom tat hoat dong', 'activity summary']],
    ['-Phản hồi khách hàng:',      '-Customer feedback:', ['phan hoi khach hang', 'customer feedback']],
    ['-Doanh số:',                 '-Sales:',             ['doanh so', 'sales']],
    ['-Hành động tiếp theo:',      '-Next actions:',      ['hanh dong tiep theo', 'next actions']]
  ]
};

/* ───────── tiện ích ───────── */
function hubIsCoaching(type) { return hubKey(type) === 'coaching'; }
function hubIsCustTrain(cat) { return hubKey(cat) === 'customertraining'; }

/** Thư mục mẹ theo tên (tạo 1 lần trong folder mẹ đào tạo, nhớ ID ở Script Property) */
function hubNamedParent_(name, prop) {
  if (HUB_CTX.test) return hubSubFolder(hubTestRoot(), name);
  return hubCached('np:' + prop, function(){
    var P = PropertiesService.getScriptProperties(), id = P.getProperty(prop);
    if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
    var root = DriveApp.getFolderById(HUB.DRIVE.PARENT), it = root.getFoldersByName(name);
    var folder = it.hasNext() ? it.next() : root.createFolder(name);
    P.setProperty(prop, folder.getId());
    return folder;
  });
}
/** Thư mục mẹ của 1 buổi: Coaching ⇒ "Coaching" · Customer Training ⇒ "Customer Training" · còn lại theo Category */
function hubParentFolder_(type, category) {
  if (hubIsCoaching(type)) return hubNamedParent_(TE.COACH, 'HUB_COACHING_FOLDER');
  if (hubIsCustTrain(category)) return hubNamedParent_(TE.CAT, 'HUB_CUSTTRAIN_FOLDER');
  return hubCategoryFolder(category);
}

/** Bằng chứng Coaching: file trong thư mục con Review của thư mục buổi */
function hubCoachReview_(s) {
  var out = {files: [], hasPdf: false, folderUrl: s.folderUrl || '', reviewUrl: '', noAccess: false};
  var src = null;
  try { src = hubSessionSource(s); } catch (e) {}
  if (!src || !src.folder) { out.noAccess = !!(src && src.noAccess); return out; }
  out.folderUrl = src.folder.getUrl();
  var it = src.folder.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (hubKey(f.getName()) !== 'review') continue;
    out.reviewUrl = out.reviewUrl || f.getUrl();
    var fi = f.getFiles(), n = 0;
    while (fi.hasNext() && n < 50) {
      var x = fi.next(), mime = x.getMimeType(), name = x.getName(); n++;
      if (x.isTrashed()) continue;
      var pdf = mime === 'application/pdf';
      if (pdf) out.hasPdf = true;
      out.files.push({name: name, url: x.getUrl(), pdf: pdf});
    }
  }
  return out;
}
function hubCoachNeedPdfMsg_() { return 'Coaching cần file PDF Review trong thư mục Review trước khi chuyển Completed.'; }

/** Review đủ 5 dòng mẫu, mỗi dòng có nội dung ⇒ {ok, missing:[nhãn]} */
function teReviewCheck_(txt) {
  var t = hubDeaccent(String(txt || '')).toLowerCase().replace(/\r/g, '');
  var hits = [];
  TE.LINES.forEach(function(L, i){
    L[2].forEach(function(alt){
      var re = new RegExp('(^|\\n)[ \\t]*[-•*]?[ \\t]*' + alt.replace(/ /g, '\\s+') + '[ \\t]*:', 'g'), m;
      while ((m = re.exec(t))) hits.push({i: i, start: m.index + m[1].length, end: m.index + m[0].length});
    });
  });
  hits.sort(function(a, b){ return a.start - b.start; });
  var ok = {};
  hits.forEach(function(h, k){
    var next = k + 1 < hits.length ? hits[k + 1].start : t.length;
    var body = t.slice(h.end, next).replace(/[\s\-–•*.…:]+/g, '');
    if (body.length) ok[h.i] = true;
  });
  var missing = [];
  TE.LINES.forEach(function(L, i){ if (!ok[i]) missing.push(L[0]); });
  return {ok: !missing.length, missing: missing};
}

/** Các cột T&E (tiêu đề ở dòng 3 của sheet buổi đào tạo) ⇒ {tên: số cột} — create: thêm cột còn thiếu ở cuối */
function hubTeCols_(sh, create) {
  var key = 'teCols:' + sh.getName() + (create ? ':c' : '');
  if (HUB_MEM[key]) return HUB_MEM[key];
  var lc = Math.max(sh.getLastColumn(), HUB.LAST_COL), H = sh.getRange(3, 1, 1, lc).getValues()[0], map = {}, last = HUB.LAST_COL;
  H.forEach(function(h, i){ var n = hubNorm(h); if (n) { last = Math.max(last, i + 1); TE.COLS.forEach(function(c){ if (hubKey(c) === hubKey(n) && !map[c]) map[c] = i + 1; }); } });
  var miss = TE.COLS.filter(function(c){ return !map[c]; });
  if (miss.length && create) {
    var need = last + miss.length;
    if (sh.getMaxColumns() < need) sh.insertColumnsAfter(sh.getMaxColumns(), need - sh.getMaxColumns());
    miss.forEach(function(c, k){ map[c] = last + 1 + k; });
    var rg = sh.getRange(3, last + 1, 1, miss.length);
    rg.setValues([miss]);
    try { rg.setBackground('#FCE5CD').setFontColor('#003047').setFontWeight('bold'); } catch (e) {}
    hubLog('INFO', 'teCols', sh.getName() + ': thêm cột ' + miss.join(', '), '');
  }
  HUB_MEM[key] = map;
  return map;
}

/* ───────── ③ nâng cấp 1 lần ───────── */
function hubMigrate1013_() {
  var P = PropertiesService.getScriptProperties();
  if (P.getProperty('HUB_MIG_VER') === TE.VER) return;
  var last = Number(P.getProperty('HUB_MIG_TRY') || 0);
  if (Date.now() - last < 10 * 60000) return;                     // lỗi ⇒ thử lại sau 10 phút, không làm chậm mọi lượt gọi
  P.setProperty('HUB_MIG_TRY', String(Date.now()));
  var notes = [];
  hubWithLock(function(){
    var ms = hubSheet(HUB.SHEETS.MASTER, false);
    /* Training Type: Master!C3:C6 ⇒ thêm "Coaching" (ưu tiên C5) */
    var T = ms.getRange(3, 3, 4, 1).getValues().map(function(r){ return hubNorm(r[0]); });
    if (!T.some(function(x){ return hubIsCoaching(x); })) {
      var at = !T[2] ? 2 : T.indexOf('');
      if (at >= 0) { ms.getRange(3 + at, 3).setValue(TE.COACH); notes.push('Master!C' + (3 + at) + ' = Coaching'); }
      else notes.push('⚠ Master!C3:C6 đã đầy, chưa thêm Coaching');
    }
    /* Training Category: Master cột B ⇒ thêm "Customer Training" */
    var lr = Math.max(ms.getLastRow(), 3), B = ms.getRange(3, 2, lr - 2, 1).getValues().map(function(r){ return hubNorm(r[0]); });
    if (!B.some(function(x){ return hubIsCustTrain(x); })) {
      var bi = B.indexOf(''); if (bi < 0) bi = B.length;
      ms.getRange(3 + bi, 2).setValue(TE.CAT); notes.push('Master!B' + (3 + bi) + ' = Customer Training');
    }
    /* cột T&E ở sheet Training Report */
    hubTeCols_(hubSheet(HUB.SHEETS.REPORT, false), true);
  });
  hubCacheClear('meta');
  P.setProperty('HUB_MIG_VER', TE.VER);
  hubLog('INFO', 'migrate ' + TE.VER, notes.join(' · ') || 'không cần đổi', '');
}

/* ───────── ① rhCoachReview ───────── */
function apiRhCoachReview(p) {
  var u = hubRhActor(p, false), s = hubRhSession(p);
  var op = hubNorm(p.op) || 'status';
  if (op !== 'status') return {ok:false, error:'rhCoachReview: op không hợp lệ (' + op + ').'};
  var r = hubCoachReview_(s);
  return {ok:true, sid:s.sid, coaching:hubIsCoaching(s.type), status:s.status,
          files:r.files.map(function(f){ return {name:f.name, url:f.url}; }), hasPdf:r.hasPdf,
          folderUrl:r.folderUrl, reviewUrl:r.reviewUrl, noAccess:r.noAccess, canUpload:hubRhCanSession(u, s),
          path:[TE.REVIEW], message: r.hasPdf ? '' : hubCoachNeedPdfMsg_()};
}

/* ───────── ② rhCustTrain ───────── */
function hubTeWho_(p) {
  hubRhKeyOk(p);
  var ck = rhCheck(p.tk);
  if (ck.err) throw new Error(ck.err + ' Vui lòng đăng nhập bằng email công ty.');
  var u = ck.u, lvl = String(u.level || '').toLowerCase();
  return {u: u, pic: u.pic, all: !!u.admin || lvl === 'director' || lvl === 'hod', lead: lvl === 'lead'};
}
function hubTeNum_(v) { var n = Number(String(v == null ? '' : v).replace(/,/g, '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; }
function hubTeAudience_(a) {
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = []; } }
  if (!Array.isArray(a)) a = [];
  return a.slice(0, 300).map(function(x){
    x = x || {};
    return {code: hubNorm(x.code).substring(0, 40), name: hubNorm(x.name).substring(0, 120), workplace: hubNorm(x.workplace).substring(0, 160)};
  }).filter(function(x){ return x.name || x.code; });
}
function hubTeRows_(sh) {
  var all = hubReadSessions().filter(function(s){ return hubIsCustTrain(s.category); });
  if (!all.length) return [];
  var M = hubTeCols_(sh, false), cols = TE.COLS.map(function(c){ return M[c] || 0; });
  var have = cols.filter(Boolean);
  var c0 = have.length ? Math.min.apply(null, have) : 0, c1 = have.length ? Math.max.apply(null, have) : 0;
  var r0 = Math.min.apply(null, all.map(function(s){ return s.row; })), r1 = Math.max.apply(null, all.map(function(s){ return s.row; }));
  var V = c0 ? sh.getRange(r0, c0, r1 - r0 + 1, c1 - c0 + 1).getValues() : [];
  return all.map(function(s){
    var row = c0 ? V[s.row - r0] : [], g = function(i){ return cols[i] ? row[cols[i] - c0] : ''; };
    var aud = []; try { aud = JSON.parse(hubNorm(g(6)) || '[]'); } catch (e) { aud = []; }
    return {sid:s.sid, date:s.date, topic:s.topic, product:hubNorm(g(1)), place:hubNorm(g(2)), pic:s.trainer, team:hubNorm(g(0)).toLowerCase(),
            status:s.status, target:hubTeNum_(g(3)), actual:hubTeNum_(g(4)), review:hubNorm(g(5)) || s.summary, audience:aud,
            folder:s.folderUrl || '', row:s.row};
  });
}
function hubTeCanEdit_(w, s) {
  if (w.all || w.lead || tmOn_()) return true;
  return hubKeyV(s.trainer) === hubKeyV(w.pic);
}

function apiRhCustTrain(p) {
  var w = hubTeWho_(p);
  if (tmOn_()) { HUB_CTX.test = true; HUB_CTX.tester = {email: MMH_TEST.email, name: 'TEST', role: 'admin'}; }
  var op = hubNorm(p.op) || 'list';
  if (op === 'list') return hubTeList_(p, w);
  if (op === 'save') return hubRhOnce(p, function(){ return hubTeSave_(p, w); });
  if (op === 'delete') return hubTeDelete_(p, w);
  return {ok:false, error:'rhCustTrain: op không hợp lệ (' + op + ').'};
}

function hubTeList_(p, w) {
  var team = hubNorm(p.team).toLowerCase(), pic = hubNorm(p.pic), withCancel = hubBool(p.all);
  if (!w.all && !w.lead && !tmOn_()) pic = w.pic;                   // sales: chỉ buổi của mình
  var items = hubTeRows_(hubReportSheet()).filter(function(x){
    if (!withCancel && x.status === 'Cancel') return false;
    if (team && x.team && x.team !== team) return false;
    if (pic && hubKeyV(x.pic) !== hubKeyV(pic)) return false;
    return true;
  });
  items.sort(function(a, b){ return (b.date || '').localeCompare(a.date || ''); });
  return {ok:true, items:items, me:{pic:w.pic, all:w.all, lead:w.lead}, test:tmOn_()};
}

function hubTeSave_(p, w) {
  var d = p.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return {ok:false, error:'Dữ liệu buổi đào tạo không hợp lệ (JSON).'}; } }
  d = d || {};
  var team = hubNorm(d.team || p.team).toLowerCase();
  if (TE.TEAMS.indexOf(team) < 0) return {ok:false, error:'Thiếu / sai nhóm (team): ' + (team || '(trống)') + '. / Missing or wrong team.'};
  var pic = hubNorm(d.pic) || w.pic;
  if (tmOn_() && !/^TEST/.test(pic)) pic = 'TEST';
  if (!w.all && !w.lead && !tmOn_() && hubKeyV(pic) !== hubKeyV(w.pic)) return {ok:false, code:'FORBIDDEN', error:'Bạn chỉ được ghi buổi đào tạo khách hàng của chính mình.'};
  var date = /^\d{4}-\d{2}-\d{2}$/.test(hubNorm(d.date)) ? hubToDate(hubNorm(d.date)) : null;
  if (!date) return {ok:false, error:'Vui lòng chọn ngày đào tạo (yyyy-MM-dd).'};
  var topic = hubNorm(d.topic);
  if (!topic) return {ok:false, error:'Vui lòng nhập chủ đề đào tạo.'};
  if (tmOn_() && !/^\[TEST\]/i.test(topic)) topic = '[TEST] ' + topic;
  var status = hubNorm(d.status) || 'Plan';
  var st = {plan:'Plan', completed:'Completed', cancel:'Cancel'}[status.toLowerCase()];
  if (!st) return {ok:false, error:'Trạng thái không hợp lệ: ' + status + ' (Plan / Completed / Cancel).'};
  var target = hubTeNum_(d.target), actual = hubTeNum_(d.actual), review = hubNorm(d.review).substring(0, 20000);
  var aud = hubTeAudience_(d.audience);
  if (st === 'Completed') {
    if (!(actual > 0)) return {ok:false, error:'Completed cần Số lượng tham dự thực tế (actual) lớn hơn 0.'};
    var rc = teReviewCheck_(review);
    if (!rc.ok) return {ok:false, code:'REVIEW', missing:rc.missing,
      error:'Completed cần review đủ 5 dòng có nội dung. Còn thiếu: ' + rc.missing.join(' ') + ' (tiếng Anh: -Actual attendees: -Activity summary: -Customer feedback: -Sales: -Next actions:)'};
  }
  var product = hubNorm(d.product).substring(0, 300), place = hubNorm(d.place).substring(0, 300);
  var names = aud.map(function(x){ return x.name.replace(/[;,|\n]+/g, ' '); }).filter(Boolean);
  var en = /^thai/.test(team);                                      // 30/10/2026 — nhóm Thái (Surgical + Dental): ghi tiếng Anh
  var audText = names.length ? ((en ? 'Customers: ' : 'Khách hàng: ') + names.join(' · ')).substring(0, 40000) : (en ? 'Customers' : 'Khách hàng');
  var purpose = en ? 'Customer training (T&E · ' + (team === 'thaid' ? 'Thailand Dental' : 'Thailand Surgical') + ')' + (product ? ' · Product: ' + product : '') + (place ? ' · Place: ' + place : '')
                   : 'Đào tạo khách hàng (T&E' + (team ? ' · ' + team : '') + ')' + (product ? ' · Sản phẩm: ' + product : '') + (place ? ' · Địa điểm: ' + place : '');

  var res = hubWithLock(function(){
    var sh = hubReportSheet(), C = HUB.COL, sid = hubNorm(d.sid || p.sid), row, isNew = false, existing = null;
    if (sid) {
      existing = hubFindSession(sid);
      if (!existing) return {ok:false, error:'Không tìm thấy buổi đào tạo ' + sid + '.'};
      if (!hubIsCustTrain(existing.category)) return {ok:false, error:'Buổi ' + sid + ' không phải buổi đào tạo khách hàng (Customer Training).'};
      if (!hubTeCanEdit_(w, existing)) return {ok:false, code:'FORBIDDEN', error:'Buổi đào tạo này không do bạn phụ trách.'};
      row = existing.row;
    } else {
      row = hubNextEmptyRow(sh); sid = hubSidOf(date, row); isNew = true;
    }
    var width = C.SUMMARY - C.DATE + 1, cur = sh.getRange(row, C.DATE, 1, width).getValues()[0];
    sh.getRange(row, C.DATE, 1, width).setValues([[date, TE.TYPE, TE.CAT, topic, purpose, pic, audText, st, cur[8], cur[9], review]]);
    sh.getRange(row, C.SID).setValue(sid);
    var M = hubTeCols_(sh, true), vals = [team, product, place, target, actual, review, JSON.stringify(aud).substring(0, 45000)];
    TE.COLS.forEach(function(c, i){ sh.getRange(row, M[c]).setValue(vals[i]); });
    var fCell = sh.getRange(row, C.FOLDER), folder = hubUrlFromRichText(fCell.getRichTextValue()) || hubUrlFromFormula(fCell.getFormula()) || '';
    if (!folder && st !== 'Cancel') {
      try { folder = hubEnsureFolder(sh, row, {date:date, type:TE.TYPE, category:TE.CAT, audience:place || pic, topic:topic}).url; }
      catch (e) { hubLog('ERROR', 'rhCustTrain folder', sid, e.message); }
    }
    hubCacheClear('sessions');
    return {ok:true, sid:sid, row:row, folder:folder, isNew:isNew, status:st};
  });
  if (res.ok) hubLog('INFO', 'rhCustTrain', res.sid + ' ' + res.status + ' by ' + w.u.local + (tmOn_() ? ' [TEST]' : ''), topic);
  return res;
}

function hubTeDelete_(p, w) {
  var sid = hubNorm(p.sid);
  if (!sid) return {ok:false, error:'Thiếu mã buổi (sid).'};
  return hubWithLock(function(){
    var s = hubFindSession(sid);
    if (!s) return {ok:true, sid:sid, missing:true};                  // không còn ⇒ coi như đã xoá
    if (!hubIsCustTrain(s.category)) return {ok:false, error:'Buổi ' + sid + ' không phải buổi đào tạo khách hàng (Customer Training).'};
    if (!hubTeCanEdit_(w, s)) return {ok:false, code:'FORBIDDEN', error:'Buổi đào tạo này không do bạn phụ trách.'};
    hubReportSheet().getRange(s.row, HUB.COL.STATUS).setValue('Cancel');
    hubCacheClear('sessions');
    hubLog('WARN', 'rhCustTrain delete', sid + ' cancelled by ' + w.u.local, s.topic);
    return {ok:true, sid:sid};
  });
}
