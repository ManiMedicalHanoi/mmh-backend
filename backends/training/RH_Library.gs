/**
 * ============================================================================
 *  MMH TRAINING HUB — CHỌN VIDEO TỪ MMH LIBRARY (v3.35, 29/10/2026)
 * ----------------------------------------------------------------------------
 *  Kho riêng tư ManiMedicalHanoi/mmh-library ▸ Videos/catalog.json = danh mục video đào tạo, 3 thư mục lưu trữ:
 *  Skill · Product (Ophthalmic / Dental / Surgical / MMG) · Knowledge (Ophthalmic / Dental / Surgical / General).
 *
 *  - libList   (trainer / Admin, app Training Hub)       ⇒ danh mục (đệm 10 phút) + video nào đã gắn vào khoá này.
 *  - libAttach (trainer của buổi, p.sid + p.id)          ⇒ chép video (+ ảnh bìa, phụ đề) sang kho Training-Hub
 *                media/lib/<id>.mp4 (GitHub Pages, 1 lần cho mọi khoá) rồi thêm vào HUB_Videos của buổi
 *                ⇒ PIC xem + học online như video bài giảng khác (xem ≥ 70%, tính tiến độ, chứng chỉ).
 *  - rhLibList / rhLibAttach: cầu nối Report Hub (khoá RH + phiên tk; người tạo / trainer của buổi).
 *  - Token đọc kho thư viện: Script Property HUB_LIB_TOKEN (Admin dán ở Giao diện & GitHub ▸ MMH Library, quyền
 *    Contents: Read trên mmh-library); không có ⇒ thử HUB_GH_TOKEN (nếu token đó đã được thêm quyền đọc mmh-library).
 *    Ghi sang Training-Hub vẫn dùng HUB_GH_TOKEN (hubGhPut_).
 *  - Video "confidential" hoặc > 30 MB: không đưa lên (GitHub Pages của Training Hub là công khai).
 * ============================================================================
 */

var HUB_LIB = {OWNER: 'ManiMedicalHanoi', REPO: 'mmh-library', REF: 'main', CATALOG: 'Videos/catalog.json',
               MAX_MB: 30, DIR: 'media/lib/', TTL: 600};

function hubLibToken_() {
  try { var P = PropertiesService.getScriptProperties(); return P.getProperty('HUB_LIB_TOKEN') || P.getProperty('HUB_GH_TOKEN') || ''; }
  catch (e) { return ''; }
}
function hubLibEnc_(path) { return String(path).split('/').map(encodeURIComponent).join('/'); }

/** Gọi API GitHub của kho thư viện. raw=true ⇒ trả bytes nội dung file. */
function hubLibFetch_(path, raw, token) {
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + HUB_LIB.OWNER + '/' + HUB_LIB.REPO + '/contents/' + hubLibEnc_(path) + '?ref=' + HUB_LIB.REF, {
    muteHttpExceptions: true,
    headers: {Authorization: 'Bearer ' + (token || hubLibToken_()), Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28'}
  });
  return {code: res.getResponseCode(), res: res};
}
function hubLibErr_(code) {
  if (code === 401) return {ok: false, code: 'LIB_TOKEN', error: 'Token đọc MMH Library hết hạn / sai — Admin kết nối lại (Giao diện & GitHub ▸ MMH Library).'};
  if (code === 403 || code === 404) return {ok: false, code: 'LIB_NOACCESS', error: 'Training Hub chưa có quyền đọc kho MMH Library — Admin vào Giao diện & GitHub ▸ MMH Library dán token có quyền Contents: Read trên kho mmh-library.'};
  return {ok: false, code: 'LIB_ERR', error: 'Không đọc được MMH Library (GitHub trả mã ' + code + ') — thử lại sau ít phút.'};
}

/** Danh mục video (đệm 10 phút). Trả {ok, videos, categories, updated} hoặc lỗi. */
function hubLibCatalog_(fresh) {
  if (!hubLibToken_()) return {ok: false, code: 'LIB_TOKEN', error: 'Admin chưa kết nối MMH Library cho Training Hub (Giao diện & GitHub ▸ MMH Library).'};
  if (!fresh) { var c = hubCacheGet('libcat'); if (c) return c; }
  var r = hubLibFetch_(HUB_LIB.CATALOG, true);
  if (r.code !== 200) return hubLibErr_(r.code);
  var j;
  try { j = JSON.parse(r.res.getContentText('UTF-8')); } catch (e) { return {ok: false, code: 'LIB_ERR', error: 'Danh mục video của MMH Library bị lỗi định dạng.'}; }
  var vids = (j.videos || []).filter(function(v){ return v && v.id && v.path; }).map(function(v){
    return {id: hubNorm(v.id), title: hubNorm(v.title), category: hubNorm(v.category), group: hubNorm(v.group), topic: hubNorm(v.topic),
            product: hubNorm(v.product), lang: hubNorm(v.lang), desc: hubNorm(v.desc).substring(0, 400), date: hubNorm(v.date),
            path: hubNorm(v.path), poster: hubNorm(v.poster), vtt: hubNorm(v.vtt), duration: hubNum(v.duration, 0), mb: hubNum(v.mb, 0),
            training: v.training !== false, confidential: !!v.confidential};
  });
  var out = {ok: true, videos: vids, categories: j.categories || {}, updated: hubNorm(j.updated)};
  hubCachePut('libcat', out, HUB_LIB.TTL);
  return out;
}

/** Link Pages của video thư viện đã chép sang Training-Hub (theo id). */
function hubLibSrc_(v) {
  var ext = (/\.(mp4|webm|m4v)$/i.exec(v.path) || [, 'mp4'])[1].toLowerCase();
  return HUB_LIB.DIR + (hubDeaccent(v.id.replace(/^lib-/, '')).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100) || 'video') + '.' + ext;
}

/** Tải nội dung 1 file của thư viện (bytes). File Git LFS ⇒ tải qua media.githubusercontent.com. */
function hubLibBytes_(path) {
  var r = hubLibFetch_(path, true);
  if (r.code !== 200) { var e = hubLibErr_(r.code); throw new Error(e.error); }
  var bytes = r.res.getContent();
  if (bytes.length < 300) {
    var t = Utilities.newBlob(bytes).getDataAsString();
    if (/^version https:\/\/git-lfs/.test(t)) {
      var m = UrlFetchApp.fetch('https://media.githubusercontent.com/media/' + HUB_LIB.OWNER + '/' + HUB_LIB.REPO + '/' + HUB_LIB.REF + '/' + hubLibEnc_(path),
        {muteHttpExceptions: true, headers: {Authorization: 'Bearer ' + hubLibToken_()}});
      if (m.getResponseCode() !== 200) throw new Error('Không tải được video (Git LFS, mã ' + m.getResponseCode() + ').');
      bytes = m.getContent();
    }
  }
  return bytes;
}

/** Chép file thư viện sang Training-Hub nếu chưa có. Trả link Pages. */
function hubLibPublishFile_(libPath, ghPath, label) {
  var g = hubGhCall_('get', '/contents/' + hubLibEnc_(ghPath) + '?ref=' + HUB_GH.BRANCH);
  if (g.code === 200 && g.json && g.json.sha) return HUB_GH.PAGES + ghPath;
  var bytes = hubLibBytes_(libPath);
  if (bytes.length > HUB_LIB.MAX_MB * 1048576) throw new Error('Video ' + (bytes.length / 1048576).toFixed(1) + ' MB — tối đa ' + HUB_LIB.MAX_MB + ' MB.');
  return hubGhPut_(ghPath, Utilities.base64Encode(bytes), 'Training Hub: video thư viện ' + label);
}

/** Danh mục kèm trạng thái: đã chép sang Training-Hub chưa, đã gắn vào khoá sid chưa. */
function hubLibListFor_(sid, fresh) {
  var c = hubLibCatalog_(fresh);
  if (!c.ok) return c;
  var all = hubReadVideos_(), inSid = {}, pub = {};
  all.forEach(function(v){
    var m = /^lib:(.+)$/.exec(v.catalogId || '');
    if (!m) return;
    pub[m[1]] = 1;
    if (sid && v.sid === sid) inSid[m[1]] = 1;
  });
  return {ok: true, updated: c.updated, categories: c.categories,
          videos: c.videos.filter(function(v){ return v.training; }).map(function(v){
            var o = {}; for (var k in v) o[k] = v[k];
            o.attached = !!inSid[v.id]; o.published = !!pub[v.id];
            o.blocked = v.confidential ? 'Video mật — không đưa lên Training Hub.' : v.mb > HUB_LIB.MAX_MB ? 'Video lớn hơn ' + HUB_LIB.MAX_MB + ' MB.' : '';
            return o;
          }),
          canWrite: !!hubGhToken_()};
}

/** Gắn 1 video thư viện vào buổi s (người gọi đã được kiểm quyền). */
function hubLibAttachCore_(s, id, user) {
  id = hubNorm(id);
  if (!hubGhToken_()) return hubGhNeed_();
  var c = hubLibCatalog_(false), v = c.ok ? c.videos.filter(function(x){ return x.id === id; })[0] : null;
  if (c.ok && !v) { c = hubLibCatalog_(true); v = c.ok ? c.videos.filter(function(x){ return x.id === id; })[0] : null; }
  if (!c.ok) return c;
  if (!v) return {ok: false, error: 'Không tìm thấy video này trong MMH Library (có thể đã bị gỡ).'};
  if (v.confidential) return {ok: false, error: 'Video mật của hãng — không đưa lên Training Hub.'};
  if (v.mb > HUB_LIB.MAX_MB) return {ok: false, error: 'Video ' + v.mb + ' MB — tối đa ' + HUB_LIB.MAX_MB + ' MB. Nhờ Claude nén lại trong MMH Library.'};
  var cid = 'lib:' + v.id;
  var had = hubVideosOf_(s.sid).filter(function(x){ return x.catalogId === cid; })[0];
  if (had) return {ok: true, already: true, video: hubVideoFile_(had), message: 'Video "' + had.title + '" đã có trong khoá học này.'};
  var gp = hubLibSrc_(v), src, poster = '', vtt = '';
  try { src = hubLibPublishFile_(v.path, gp, '"' + v.title + '" (' + v.id + ') — ' + hubPrefix(user.email)); }
  catch (e) { hubLog('ERROR', 'libAttach', v.id + ': ' + e.message, s.sid); return {ok: false, error: e.message}; }
  if (v.poster) { try { poster = hubLibPublishFile_(v.poster, gp.replace(/\.[a-z0-9]+$/, '') + '.' + ((/\.(jpe?g|png|webp)$/i.exec(v.poster) || [, 'jpg'])[1].toLowerCase()), 'ảnh bìa ' + v.id); } catch (e) { hubLog('WARN', 'libAttach', 'poster ' + e.message, v.id); } }
  if (v.vtt) { try { vtt = hubLibPublishFile_(v.vtt, gp.replace(/\.[a-z0-9]+$/, '') + '.vtt', 'phụ đề ' + v.id); } catch (e) { hubLog('WARN', 'libAttach', 'vtt ' + e.message, v.id); } }
  var out = hubWithLock(function(){
    var sh = hubVidSheet_(), W = HUB_VID_HEADER.length, last = sh.getLastRow(), order = 0, dup = null;
    if (last >= 2) sh.getRange(2, 1, last - 1, W).getValues().forEach(function(r){
      if (hubNorm(r[1]) !== s.sid) return;
      order = Math.max(order, hubNum(r[2], 0));
      if (hubNorm(r[8]) === cid) dup = r;
    });
    if (dup) return {dup: true, v: {id: hubNorm(dup[0]), sid: s.sid, order: hubNum(dup[2], 0), title: hubNorm(dup[3]), src: hubNorm(dup[4]), poster: hubNorm(dup[5]), transcript: hubNorm(dup[6]), duration: hubNum(dup[7], 0), catalogId: cid}};
    var vid = hubUid('V');
    var row = [vid, s.sid, order + 1, hubCell(v.title), src, poster, vtt, Math.round(v.duration), cid, hubMailOf(user.email), new Date()];
    sh.getRange(last + 1, 1, 1, W).setValues([row]);
    hubCacheClear('videos');
    return {v: {id: vid, sid: s.sid, order: order + 1, title: v.title, src: src, poster: poster, transcript: vtt, duration: Math.round(v.duration), catalogId: cid}};
  });
  hubLog('INFO', 'libAttach', s.sid + ' ⇐ ' + v.id + ' by ' + user.email, src);
  return {ok: true, already: !!out.dup, video: hubVideoFile_(out.v),
          message: out.dup ? 'Video đã có trong khoá học.' : 'Đã thêm video "' + v.title + '" từ MMH Library. GitHub cần khoảng 1–2 phút để phát được trên mọi máy.'};
}

/** action libList (trainer / Admin). p.sid (tuỳ chọn), p.fresh */
function apiLibList(p, user) {
  if (user.role !== 'admin' && !hubIsTrainer(user)) return {ok: false, error: 'Chỉ trainer / Admin chọn được video cho khoá học.'};
  return hubLibListFor_(hubNorm(p.sid), hubBool(p.fresh));
}
/** action libAttach (trainer của buổi). p.sid, p.id */
function apiLibAttach(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok: false, error: 'Bạn chỉ được thêm video cho khoá học do mình phụ trách.'};
  return hubLibAttachCore_(s, p.id, user);
}
/** Cầu nối Report Hub */
function apiRhLibList(p) {
  var u = hubRhActor(p, false);
  return hubLibListFor_(hubNorm(p.sid), hubBool(p.fresh));
}
function apiRhLibAttach(p) {
  var x = hubRhSessionFor(p);
  var r = hubLibAttachCore_(x.s, p.id, x.u);
  if (r && r.ok) { try { hubCacheClear('mats:' + x.s.sid); } catch (e) {} }
  return r;
}

/** Admin: lưu / gỡ token đọc kho mmh-library (gọi từ apiGhSetup khi p.kind === 'lib'). */
function hubLibSetup_(p, user) {
  var props = PropertiesService.getScriptProperties(), t = hubNorm(p.ghToken);
  if (!t || hubBool(p.remove)) { props.deleteProperty('HUB_LIB_TOKEN'); hubCacheClear('libcat'); return {ok: true, lib: !!hubLibToken_(), message: 'Đã gỡ token MMH Library.'}; }
  var r = hubLibFetch_(HUB_LIB.CATALOG, true, t);
  if (r.code === 401) return {ok: false, error: 'Token không hợp lệ hoặc đã hết hạn.'};
  if (r.code === 403 || r.code === 404) return {ok: false, error: 'Token chưa đọc được kho ' + HUB_LIB.OWNER + '/' + HUB_LIB.REPO + ' (cần Contents: Read trên kho này).'};
  if (r.code !== 200) return {ok: false, error: 'GitHub trả mã ' + r.code + ' — thử lại sau.'};
  props.setProperty('HUB_LIB_TOKEN', t);
  hubCacheClear('libcat');
  hubLog('INFO', 'ghSetup', 'kết nối MMH Library by ' + user.email, HUB_LIB.REPO);
  return {ok: true, lib: true, message: 'Đã kết nối MMH Library — trainer chọn được video từ thư viện.'};
}
/** Trạng thái cho boot: đã đọc được thư viện chưa (đệm 30 phút, không gọi GitHub mỗi lần). */
function hubLibStatus_() {
  if (!hubLibToken_()) return 0;
  try {
    var sc = hubSC(), k = 'libok', v = sc.get(k);
    if (v) return v === '1' ? 1 : -1;
    var c = hubLibCatalog_(false);
    sc.put(k, c.ok ? '1' : '0', 1800);
    return c.ok ? 1 : -1;
  } catch (e) { return -1; }
}

// ============================================================================
//  CHẨN ĐOÁN LUẬT HOÀN THÀNH HỌC ONLINE (action elDiag — chỉ số tổng hợp, không có tên / email)
//  Gọi: workflow "Kiểm tra" ▸ ping = training?action=elDiag&full=1
// ============================================================================
function apiElDiag(p) {
  var sessions = hubReadSessions(), byS = {};
  sessions.forEach(function(s){ byS[s.sid] = s; });
  var vids = hubReadVideos_(), vBy = {};
  vids.forEach(function(v){ (vBy[v.sid] = vBy[v.sid] || []).push(v.id); });
  var prog = hubReadProgressRaw(), enr = hubReadEnrollment(), out = [], tot = {sess: 0, learners: 0, allDoneNoCert: 0, failShownDone: 0, orphan: 0, vid70: 0, cold: 0};
  var sids = {};
  prog.forEach(function(x){ sids[x.sid] = 1; });
  Object.keys(vBy).forEach(function(k){ sids[k] = 1; });
  Object.keys(sids).forEach(function(sid){
    var s = byS[sid]; if (!s || s.status === 'Cancel') return;
    var m = null; try { m = hubMaterials(s, {cacheOnly: true}); } catch (e) {}
    var ids = m && m.files ? m.files.map(function(f){ return f.id; }) : null;
    var quiz = hubHasQuiz_(sid), per = {};
    prog.forEach(function(x){
      if (x.sid !== sid) return;
      var o = per[x.email] || (per[x.email] = {done: {}, any: 0, orphan: 0, v70: 0});
      o.any++;
      if (x.completed) o.done[x.fileId] = 1;
      if (ids && ids.indexOf(x.fileId) < 0) o.orphan++;
      if (/^V/.test(x.fileId) && !x.completed && x.percent >= 70) o.v70++;
    });
    var row = {sid: sid, files: ids ? ids.length : -1, vids: (vBy[sid] || []).length, quiz: quiz ? 1 : 0, L: 0, all: 0, cert: 0, allNoCert: 0, failDone: 0, orphan: 0, v70: 0};
    Object.keys(per).forEach(function(em){
      var o = per[em], e = enr.filter(function(x){ return x.sid === sid && hubPrefix(x.email) === em; })[0];
      row.L++; row.orphan += o.orphan; row.v70 += o.v70;
      var all = ids && ids.length && ids.every(function(id){ return o.done[id]; });
      if (all) row.all++;
      if (e && e.certUrl) row.cert++;
      if (all && !quiz && !(e && e.certUrl)) row.allNoCert++;
      if (quiz && e && e.status === 'Completed' && !e.pass) row.failDone++;
    });
    tot.sess++; tot.learners += row.L; tot.allDoneNoCert += row.allNoCert; tot.failShownDone += row.failDone; tot.orphan += row.orphan; tot.vid70 += row.v70; if (!ids) tot.cold++;
    out.push(row);
  });
  var full = hubBool(p.full);
  return {ok: true, at: hubFmt(new Date(), 'yyyy-MM-dd HH:mm'), total: tot,
          rows: full ? out.map(function(r){ return [r.sid, 'f' + r.files, 'v' + r.vids, 'q' + r.quiz, 'L' + r.L, 'all' + r.all, 'cert' + r.cert, 'noCert' + r.allNoCert, 'failDone' + r.failDone, 'orph' + r.orphan, 'v70' + r.v70].join(' '); }) : undefined};
}
