/**
 * ============================================================================
 *  MMH TRAINING HUB — KHOÁ HỌC: NHÓM SẢN PHẨM, THƯ MỤC, VIDEO TỪ APP LÊN GITHUB, GIAO DIỆN, EMAIL DẠNG THƯ  (v3.25, 15/10/2026)
 * ----------------------------------------------------------------------------
 *  1) Sheet HUB_SessionMeta (Training Master): thông tin riêng của Hub cho từng buổi
 *     - ProductLine: nhóm sản phẩm do TRAINER chọn (Nha khoa / Nhãn khoa / Ngoại khoa / tự gõ) — app KHÔNG tự đoán nữa.
 *     - Cover: ảnh bìa riêng của khoá học (link ảnh). AutoFolderId: thư mục tài liệu do Hub tự tạo.
 *     saveSession nhận thêm line / cover; action sessionMeta (trainer của buổi) sửa riêng.
 *  2) Thư mục tài liệu: KHÔNG tạo khi lưu buổi nữa — tạo khi GỬI EMAIL MỜI (link nằm trong email) hoặc khi TẢI FILE ĐẦU TIÊN.
 *     Buổi chuyển "Cancel" (sửa / xoá, kể cả từ Report Hub) ⇒ thư mục do Hub tạo bị chuyển vào Thùng rác Drive (khôi phục được 30 ngày).
 *  3) Video từ app ⇒ GitHub Pages: app tải MP4 lên Drive (thư mục "Video bài giảng" của buổi) rồi gọi videoPublish ⇒ máy chủ đẩy file lên
 *     kho ManiMedicalHanoi/Training-Hub (media/s/<sid>/<VideoID>.mp4) bằng GitHub token (Script Property HUB_GH_TOKEN — Admin dán 1 lần
 *     trong app: Quản lý ▸ Giao diện ▸ Kết nối GitHub; action ghSetup). Tối đa HUB_GH.MAX_MB MB / video (giới hạn UrlFetch của Apps Script).
 *  4) Giao diện chỉnh trên app (Admin): Script Property HUB_UI (chữ phần đầu trang chủ, ảnh nền, ảnh bìa theo nhóm). Ảnh tải lên ⇒ imgPublish
 *     (GitHub media/ui/…; chưa kết nối GitHub ⇒ Drive, chia sẻ bằng link).
 *  5) hubLetter_: email gửi học viên dạng THƯ THƯỜNG (giống email thông báo cập nhật hệ thống) — không khung màu / nút.
 * ============================================================================
 */

var HUB_GH = {OWNER: 'ManiMedicalHanoi', REPO: 'Training-Hub', BRANCH: 'main',
              PAGES: 'https://manimedicalhanoi.github.io/Training-Hub/', MAX_MB: 25, IMG_MAX_KB: 1500};
var HUB_META_SHEET = 'HUB_SessionMeta';
var HUB_META_HEADER = ['SessionID', 'ProductLine', 'Cover', 'AutoFolderId', 'UpdatedBy', 'UpdatedAt'];

// ============================================================================
//  1. THÔNG TIN RIÊNG CỦA KHOÁ HỌC (nhóm sản phẩm, ảnh bìa)
// ============================================================================
function hubMetaSheet_() {
  return hubCached('shMeta', function(){ return hubEnsureHeader(hubSheet(HUB_META_SHEET, true), HUB_META_HEADER); });
}

/** {sid: {line, cover, autoFolder}} (đệm) */
function hubMetaAll_() {
  try {
    return hubData('smeta', function(){
      var sh = hubMetaSheet_(), last = sh.getLastRow(), o = {};
      if (last < 2) return o;
      sh.getRange(2, 1, last - 1, HUB_META_HEADER.length).getValues().forEach(function(r){
        var sid = hubNorm(r[0]); if (!sid) return;
        o[sid] = {line: hubNorm(r[1]), cover: hubNorm(r[2]), autoFolder: hubNorm(r[3])};
      });
      return o;
    });
  } catch (e) { return {}; }
}

/** Ghi các trường có trong f ({line, cover, autoFolder}); trường undefined giữ nguyên. */
function hubMetaSet_(sid, f, user) {
  sid = hubNorm(sid);
  if (!sid) return;
  var sh = hubMetaSheet_(), last = sh.getLastRow(), row = 0, cur = ['', '', '', ''];
  if (last >= 2) {
    var ids = sh.getRange(2, 1, last - 1, 4).getValues();
    for (var i = 0; i < ids.length; i++) if (hubNorm(ids[i][0]) === sid) { row = i + 2; cur = ids[i]; break; }
  }
  var v = [sid,
    f.line === undefined ? cur[1] : hubCell(hubNorm(f.line)).toString().substring(0, 60),
    f.cover === undefined ? cur[2] : (hubVidUrlOk_(f.cover) ? hubNorm(f.cover) : ''),
    f.autoFolder === undefined ? cur[3] : hubNorm(f.autoFolder),
    user ? hubMailOf(user.email) : '', new Date()];
  if (!row) row = Math.max(last, 1) + 1;
  sh.getRange(row, 1, 1, v.length).setValues([v]);
  hubCacheClear('smeta');
}

/** action sessionMeta — trainer của buổi đổi nhóm sản phẩm / ảnh bìa */
function apiSessionMeta(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok: false, error: 'Bạn chỉ được sửa khoá học do mình phụ trách.'};
  hubWithLock(function(){ hubMetaSet_(s.sid, {line: p.line, cover: p.cover}, user); });
  return {ok: true, message: 'Đã lưu.', meta: hubMetaAll_()[s.sid] || {}};
}

// ============================================================================
//  2. THƯ MỤC TÀI LIỆU — tìm bỏ qua thư mục đã ở Thùng rác, xoá khi huỷ buổi
// ============================================================================
function hubLiveFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  while (it.hasNext()) { var f = it.next(); try { if (!f.isTrashed()) return f; } catch (e) { return f; } }
  return null;
}

/** Buổi bị huỷ ⇒ chuyển thư mục do Hub tạo vào Thùng rác + xoá link ở ô Training Folder. Gọi TRONG khoá ghi. */
function hubTrashSessionFolder_(s, user) {
  var src = null;
  try { src = hubSessionSource(s); } catch (e) {}
  if (!src || !src.folder) return '';
  var f = src.folder, meta = hubMetaAll_()[s.sid] || {};
  var auto = (meta.autoFolder && meta.autoFolder === f.getId()) || /^\d{8}_/.test(f.getName());
  if (!auto) { hubLog('INFO', 'cancelFolder', s.sid + ' — giữ thư mục (không do Hub tạo): ' + f.getName(), ''); return ''; }
  var name = f.getName();
  f.setTrashed(true);
  try { hubReportSheet().getRange(s.row, HUB.COL.FOLDER).clearContent(); } catch (e) {}
  try { hubMetaSet_(s.sid, {autoFolder: ''}, user); } catch (e) {}
  hubCacheClear('sessions'); hubCacheClear('mats:' + s.sid);
  hubLog('WARN', 'cancelFolder', s.sid + ' huỷ ⇒ thư mục "' + name + '" vào Thùng rác' + (user ? ' by ' + user.email : ''), f.getUrl());
  return name;
}

// ============================================================================
//  3. GITHUB — đẩy video / ảnh lên kho Training-Hub (GitHub Pages)
// ============================================================================
function hubGhToken_() {
  try { return PropertiesService.getScriptProperties().getProperty('HUB_GH_TOKEN') || ''; } catch (e) { return ''; }
}
function hubGhCall_(method, path, body, token) {
  var opt = {method: method, muteHttpExceptions: true,
             headers: {Authorization: 'Bearer ' + (token || hubGhToken_()), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}};
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + HUB_GH.OWNER + '/' + HUB_GH.REPO + path, opt);
  var j = null; try { j = JSON.parse(res.getContentText()); } catch (e) {}
  return {code: res.getResponseCode(), json: j};
}
/** Ghi 1 file (base64) vào kho; trả link GitHub Pages. */
function hubGhPut_(path, b64, message) {
  var body = {message: message, content: b64, branch: HUB_GH.BRANCH};
  var r = hubGhCall_('put', '/contents/' + path, body);
  if (r.code === 422 || r.code === 409) {           // đã có file cùng tên ⇒ ghi đè
    var g = hubGhCall_('get', '/contents/' + path + '?ref=' + HUB_GH.BRANCH);
    if (g.json && g.json.sha) { body.sha = g.json.sha; r = hubGhCall_('put', '/contents/' + path, body); }
  }
  if (r.code >= 300) {
    var why = (r.json && r.json.message) || ('mã ' + r.code);
    if (r.code === 401) why = 'GitHub token hết hạn / sai — Admin kết nối lại GitHub';
    if (r.code === 403 || r.code === 404) why = 'GitHub token không có quyền ghi kho ' + HUB_GH.REPO + ' (' + why + ')';
    throw new Error('Không đẩy được file lên GitHub: ' + why);
  }
  return HUB_GH.PAGES + path;
}
function hubGhNeed_() {
  return {ok: false, code: 'GH_NOTOKEN', error: 'Admin chưa kết nối GitHub cho Training Hub (Quản lý ▸ Giao diện ▸ Kết nối GitHub) nên chưa tải video từ app được.'};
}

/** action ghSetup (Admin) — lưu / gỡ GitHub token. Token cần quyền Contents: Read and write trên kho Training-Hub. */
function apiGhSetup(p, user) {
  if (hubNorm(p.kind) === 'lib') return hubLibSetup_(p, user);   // ★ v3.35 — token đọc kho mmh-library (RH_Library.gs)
  var props = PropertiesService.getScriptProperties();
  var t = hubNorm(p.ghToken);
  if (!t || hubBool(p.remove)) { props.deleteProperty('HUB_GH_TOKEN'); hubLog('WARN', 'ghSetup', 'gỡ GitHub token by ' + user.email, ''); return {ok: true, gh: false, message: 'Đã gỡ kết nối GitHub.'}; }
  var r = hubGhCall_('get', '', null, t);
  if (r.code === 401) return {ok: false, error: 'Token không hợp lệ hoặc đã hết hạn.'};
  if (r.code >= 300 || !r.json) return {ok: false, error: 'Token không xem được kho ' + HUB_GH.OWNER + '/' + HUB_GH.REPO + ' (mã ' + r.code + ').'};
  if (r.json.permissions && r.json.permissions.push === false) return {ok: false, error: 'Token chỉ có quyền đọc — cần quyền Contents: Read and write.'};
  props.setProperty('HUB_GH_TOKEN', t);
  hubLog('INFO', 'ghSetup', 'kết nối GitHub by ' + user.email, HUB_GH.REPO);
  return {ok: true, gh: true, message: 'Đã kết nối GitHub — trainer tải video từ app được rồi.'};
}

/** Tên file an toàn cho đường dẫn GitHub */
function hubGhSafe_(s) { return hubDeaccent(hubNorm(s)).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40) || 'x'; }

/** Ảnh base64 (dataURL) ⇒ {b64, ext, mime} */
function hubDataUrl_(d) {
  var m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(hubNorm(d));
  if (!m) return null;
  return {mime: m[1].toLowerCase(), ext: m[2].toLowerCase().replace('jpeg', 'jpg'), b64: m[3]};
}

/** action videoPublish (trainer của buổi) — video đã tải lên Drive (uploadInit, path ["Video bài giảng"]) ⇒ GitHub ⇒ thêm vào HUB_Videos */
function apiVideoPublish(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok: false, error: 'Bạn chỉ được thêm video cho khoá học do mình phụ trách.'};
  if (!hubGhToken_()) return hubGhNeed_();
  var file;
  try { file = DriveApp.getFileById(hubNorm(p.fileId)); } catch (e) { return {ok: false, error: 'Không đọc được file video vừa tải lên Drive.'}; }
  var ext = (/\.(mp4|m4v|webm)$/i.exec(file.getName()) || [])[1];
  if (!ext) return {ok: false, error: 'Chỉ nhận video MP4 / WEBM (video .mov của iPhone: xuất lại dạng MP4 trước khi tải lên).'};
  var mb = file.getSize() / 1048576;
  if (mb > HUB_GH.MAX_MB) return {ok: false, code: 'BIG', error: 'Video ' + mb.toFixed(1) + ' MB — tối đa ' + HUB_GH.MAX_MB + ' MB. Hãy nén video (720p) rồi tải lại; file gốc vẫn nằm trong thư mục "Video bài giảng" của khoá trên Drive.'};
  var vid = hubUid('V'), dir = 'media/s/' + hubGhSafe_(s.sid) + '/';
  var title = hubCleanName(p.title, 120) || file.getName().replace(/\.[^.]+$/, '');
  var src = hubGhPut_(dir + vid + '.' + ext.toLowerCase(), Utilities.base64Encode(file.getBlob().getBytes()), 'Training Hub: video "' + title + '" (' + s.sid + ') — ' + hubPrefix(user.email));
  var poster = '';
  var im = hubDataUrl_(p.poster);
  if (im) { try { poster = hubGhPut_(dir + vid + '.' + im.ext, im.b64, 'Training Hub: ảnh bìa video ' + vid); } catch (e) { hubLog('WARN', 'videoPublish', 'poster ' + e.message, s.sid); } }
  var v = hubWithLock(function(){
    var sh = hubVidSheet_(), W = HUB_VID_HEADER.length, last = sh.getLastRow(), order = 0;
    if (last >= 2) sh.getRange(2, 1, last - 1, 3).getValues().forEach(function(r){ if (hubNorm(r[1]) === s.sid) order = Math.max(order, hubNum(r[2], 0)); });
    var row = [vid, s.sid, order + 1, hubCell(title), src, poster, '', Math.max(0, Math.round(hubNum(p.duration, 0))), 'drive:' + file.getId(), hubMailOf(user.email), new Date()];
    sh.getRange(last + 1, 1, 1, W).setValues([row]);
    hubCacheClear('videos');
    return hubVideoFile_({id: vid, sid: s.sid, order: order + 1, title: title, src: src, poster: poster, transcript: '', duration: row[7], catalogId: row[8]});
  });
  hubLog('INFO', 'videoPublish', s.sid + ' ' + vid + ' (' + mb.toFixed(1) + ' MB) by ' + user.email, src);
  return {ok: true, video: v, message: 'Đã đăng video "' + title + '". GitHub cần khoảng 1–2 phút để phát được video trên mọi máy.'};
}

/** action imgPublish — ảnh bìa khoá học (trainer của buổi, p.sid) hoặc ảnh giao diện (Admin). Trả link ảnh. */
function apiImgPublish(p, user) {
  var sid = hubNorm(p.sid), s = sid ? hubFindSession(sid) : null;
  if (sid && !s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (s ? !hubCanEdit(s, user) : user.role !== 'admin') return {ok: false, error: 'Bạn không có quyền đổi ảnh này.'};
  var im = hubDataUrl_(p.data);
  if (!im) return {ok: false, error: 'Ảnh không hợp lệ (cần JPG / PNG / WEBP).'};
  if (im.b64.length * 0.75 / 1024 > HUB_GH.IMG_MAX_KB) return {ok: false, error: 'Ảnh quá lớn (tối đa ' + HUB_GH.IMG_MAX_KB + ' KB).'};
  var name = (s ? 'cover-' + hubGhSafe_(s.sid) : hubGhSafe_(p.slot || 'ui')) + '-' + hubFmt(new Date(), 'yyyyMMddHHmmss') + '.' + im.ext;
  var url;
  if (hubGhToken_()) {
    url = hubGhPut_('media/ui/' + name, im.b64, 'Training Hub: ảnh giao diện ' + name + ' — ' + hubPrefix(user.email));
  } else {
    var folder = hubSubFolder(DriveApp.getFolderById(HUB.DRIVE.PARENT), 'Training Hub — ảnh giao diện');
    var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(im.b64), im.mime, name));
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (e) { try { f.setTrashed(true); } catch (e2) {} return hubGhNeed_(); }
    url = 'https://lh3.googleusercontent.com/d/' + f.getId() + '=w1600';
  }
  if (s) hubWithLock(function(){ hubMetaSet_(s.sid, {cover: url}, user); });
  hubLog('INFO', 'imgPublish', (s ? s.sid : 'ui') + ' by ' + user.email, url);
  return {ok: true, url: url, pending: url.indexOf(HUB_GH.PAGES) === 0, message: 'Đã tải ảnh lên.'};
}

// ============================================================================
//  4. GIAO DIỆN CHỈNH TRÊN APP (Admin)
// ============================================================================
var HUB_UI_KEYS = {heroTag: 80, heroTitle: 120, heroText: 400, heroImg: 600, heroVideo: 600, accent: 20};
function hubUi_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('HUB_UI') || '{}') || {}; } catch (e) { return {}; }
}
/** action uiSave (Admin): p.ui = {heroTag, heroTitle, heroText, heroImg, heroVideo, accent, covers:{<nhóm>: link}} */
function apiUiSave(p, user) {
  var u = p.ui;
  if (typeof u === 'string') { try { u = JSON.parse(u); } catch (e) { u = null; } }
  if (!u || typeof u !== 'object') return {ok: false, error: 'Cấu hình giao diện không hợp lệ.'};
  var out = {};
  Object.keys(HUB_UI_KEYS).forEach(function(k){ var v = hubNorm(u[k]); if (v) out[k] = v.substring(0, HUB_UI_KEYS[k]); });
  ['heroImg', 'heroVideo'].forEach(function(k){ if (out[k] && !hubVidUrlOk_(out[k])) delete out[k]; });
  if (out.accent && !/^#[0-9a-f]{6}$/i.test(out.accent)) delete out.accent;
  if (u.covers && typeof u.covers === 'object') {
    out.covers = {};
    Object.keys(u.covers).slice(0, 30).forEach(function(k){ var v = hubNorm(u.covers[k]); if (v && hubVidUrlOk_(v)) out.covers[hubNorm(k).substring(0, 40)] = v; });
  }
  var json = JSON.stringify(out);
  if (json.length > 8500) return {ok: false, error: 'Cấu hình quá dài.'};
  PropertiesService.getScriptProperties().setProperty('HUB_UI', json);
  hubLog('INFO', 'uiSave', 'by ' + user.email, json.substring(0, 300));
  return {ok: true, ui: out, message: 'Đã lưu giao diện — mọi người thấy khi mở lại app.'};
}

// ============================================================================
//  5. EMAIL DẠNG THƯ THƯỜNG (giống email thông báo cập nhật hệ thống)
// ============================================================================
/**
 * o = {dear, paras:[html], info:[[nhãn, html]], after:[html], sign:{name, position, email} | null, auto:bool}
 * Trả HTML: chữ Aptos 11pt đen, đoạn văn thường, thông tin từng dòng, chữ ký, (tuỳ chọn) dòng "email tự động".
 */
function hubLetter_(o) {
  var P = '<p style="margin:0 0 10px">';
  var h = '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;line-height:1.45;color:#000">';
  h += P + 'Dear ' + o.dear + ',</p>';
  (o.paras || []).forEach(function(x){ if (x) h += P + x + '</p>'; });
  var info = (o.info || []).filter(function(r){ return r && r[1]; });
  if (info.length) h += '<p style="margin:0 0 12px 24px">' + info.map(function(r){ return '<b>' + r[0] + ':</b> ' + r[1]; }).join('<br>') + '</p>';
  (o.after || []).forEach(function(x){ if (x) h += P + x + '</p>'; });
  h += '<p style="margin:16px 0 4px">Trân trọng,</p>';
  if (o.sign) {
    h += '<p style="margin:0 0 10px"><b>' + hubEsc(o.sign.name) + '</b>' + (o.sign.position ? '<br>' + hubEsc(o.sign.position) : '') +
         '<br>MANI Medical Hanoi' + (o.sign.email ? '<br><a href="mailto:' + hubEsc(o.sign.email) + '">' + hubEsc(o.sign.email) + '</a>' : '') + '</p>';
  } else {
    h += '<p style="margin:0 0 10px"><b>MMH Training Hub</b><br>MANI Medical Hanoi</p>';
  }
  if (o.auto) h += '<div style="height:10px"></div><p style="margin:0;color:#666;font-size:9pt"><i>Lưu ý: Đây là email tự động gửi từ MMH Training Hub. Vui lòng không trả lời email này.</i></p>';
  return h + '</div>';
}
function hubLink_(url, label) { return url ? '<a href="' + hubEsc(url) + '">' + hubEsc(label || url) + '</a>' : ''; }

/** Khoá học chưa hoàn thành của 1 người (nhắc hằng tuần) — học xong 100% tuyến bài mới tính hoàn thành */
function hubPendingCourses_(u) {
  var ls = apiListSessions({}, u).data, vids = hubVideoCounts_(), today = hubFmt(new Date(), 'yyyy-MM-dd');
  var pre = hubPrefix(u.email), prog = {};
  hubReadProgressRaw().forEach(function(x){ if (x.email === pre && x.completed) prog[x.sid] = (prog[x.sid] || 0) + 1; });
  return ls.filter(function(s){
    return s.assigned && !s.myCert && s.myStatus !== 'Completed' && s.status !== 'Cancel' && s.date && s.date <= today &&
           (vids[s.sid] || (s.hasFolder && (s.afterSent || s.preSent)));
  }).map(function(s){
    var total = 0;
    try { var m = hubMaterials(hubFindSession(s.sid), {cacheOnly: true}); if (m && m.files) total = m.files.length; } catch (e) {}
    return {sid: s.sid, topic: s.topic, trainer: s.trainer, done: prog[s.sid] || 0, total: total};
  });
}
