/**
 * ============================================================================
 *  MMH TRAINING HUB — HỌC ONLINE BẰNG VIDEO + CHỨNG CHỈ KHI HỌC XONG  (v3.21, 15/10/2026; v3.25 bỏ file gốc video khỏi tuyến bài)
 * ----------------------------------------------------------------------------
 *  1) VIDEO BÀI GIẢNG (sheet HUB_Videos trong Training Master)
 *     - File video (MP4) nằm trên GitHub Pages của app Training-Hub (thư mục media/), KHÔNG nằm trên Drive
 *       ⇒ xem ngay trong app, không cần đăng nhập Google, chạy được trên điện thoại.
 *     - Mỗi dòng = 1 video gắn với 1 buổi đào tạo (SessionID). hubMaterials() ghép video vào ĐẦU danh sách
 *       tài liệu của buổi (id "V…", kind 'video', view 'drive', src = link MP4) ⇒ lộ trình tự học, điều kiện
 *       mở bài kiểm tra (hubGate), tiến độ (HUB_Progress), chứng chỉ — dùng lại nguyên cơ chế cũ.
 *     - Học viên phải xem thật ≥ 70% thời lượng mỗi video (app đếm từng giây, không cho tua vượt) mới tính "xong".
 *     - action videoSave (trainer của buổi): thay toàn bộ danh sách video của buổi.
 *
 *  2) CHỨNG CHỈ: học xong 100% tuyến bài (mọi video + mọi tài liệu) ⇒ hubStudyDone_ (gọi từ apiTrackProgress)
 *     ghi HUB_Enrollment = Completed / Pass và cấp chứng chỉ PDF + email. Bài kiểm tra không còn cấp chứng chỉ.
 * ============================================================================
 */

var HUB_VID_SHEET = 'HUB_Videos';
var HUB_VID_HEADER = ['VideoID', 'SessionID', 'Order', 'Title', 'Src', 'Poster', 'Transcript', 'DurationSec', 'CatalogID', 'AddedBy', 'UpdatedAt'];
var HUB_VID_FOLDER = 'Video bài giảng';

function hubVidSheet_() {
  return hubCached('shVideos', function(){ return hubEnsureHeader(hubSheet(HUB_VID_SHEET, true), HUB_VID_HEADER); });
}

/** Mọi video (đệm). */
function hubReadVideos_() {
  return hubData('videos', function(){
    var sh = hubVidSheet_(), last = sh.getLastRow();
    if (last < 2) return [];
    return sh.getRange(2, 1, last - 1, HUB_VID_HEADER.length).getValues()
      .filter(function(r){ return hubNorm(r[0]) && hubNorm(r[1]) && hubNorm(r[4]); })
      .map(function(r){
        return {id: hubNorm(r[0]), sid: hubNorm(r[1]), order: hubNum(r[2], 0), title: hubNorm(r[3]), src: hubNorm(r[4]),
                poster: hubNorm(r[5]), transcript: hubNorm(r[6]), duration: hubNum(r[7], 0), catalogId: hubNorm(r[8])};
      })
      .sort(function(a, b){ return a.order - b.order; });
  });
}

function hubVideosOf_(sid) {
  sid = hubNorm(sid);
  try { return hubReadVideos_().filter(function(v){ return v.sid === sid; }); }
  catch (e) { return []; }
}

/** Video ⇒ đối tượng "tài liệu" giống hubApiFileInfo (để lộ trình tự học dùng chung). */
function hubVideoFile_(v) {
  var mm = Math.floor(v.duration / 60), ss = Math.round(v.duration % 60);
  return {
    id: v.id, name: v.title || 'Video bài giảng', mime: 'video/mp4', kind: 'video', view: 'drive', player: 'html5',
    src: v.src, poster: v.poster, transcript: v.transcript, duration: v.duration, catalogId: v.catalogId,
    path: HUB_VID_FOLDER, pathArr: [HUB_VID_FOLDER], size: 0,
    sizeText: v.duration ? mm + ':' + (ss < 10 ? '0' : '') + ss + ' phút' : 'Video',
    url: v.src, preview: v.src, download: v.src, updated: '', updatedMs: 0, linkShared: true, isVideo: true
  };
}

/** Ghép video vào kết quả đọc thư mục Drive (không sửa bản đệm). */
function hubWithVideos_(s, m) {
  if (!m || m.pending || !s) return m;
  var vids = hubVideosOf_(s.sid);
  // ★ v3.25 — file gốc của video tải từ app nằm ở thư mục Drive "Video bài giảng" ⇒ không tính là tài liệu riêng (đã phát qua GitHub)
  var isRaw = function(f){ return (f.pathArr && f.pathArr[0] === HUB_VID_FOLDER) || f.path === HUB_VID_FOLDER; };
  var hasRaw = (m.files || []).some(isRaw);
  if (!vids.length && !hasRaw) return m;
  var out = {};
  for (var k in m) if (m.hasOwnProperty(k)) out[k] = m[k];
  out.files = vids.map(hubVideoFile_).concat((m.files || []).filter(function(f){ return !f.isVideo && !isRaw(f); }));
  if (!vids.length) return out;
  out.folders = [{id: 'videos', name: HUB_VID_FOLDER, path: HUB_VID_FOLDER, pathArr: [HUB_VID_FOLDER], url: '', virtual: true}]
    .concat(m.folders || []);
  out.videoCount = vids.length;
  if (out.noAccess || !out.folderUrl) out.message = out.message || '';
  return out;
}

/** Số video theo buổi (cho thẻ "Video" ở Thư viện). */
function hubVideoCounts_() {
  var o = {};
  try {
    hubReadVideos_().forEach(function(v){
      var x = o[v.sid] || (o[v.sid] = {n: 0, poster: '', sec: 0});
      x.n++; x.sec += v.duration || 0;
      if (!x.poster && v.poster) x.poster = v.poster;
      // ★ v3.23 — video đầu tiên: app phát ngay trên trang chủ / trang khoá học (không cần tải danh sách bài)
      if (!x.v1) x.v1 = {id: v.id, title: v.title, src: v.src, poster: v.poster, duration: v.duration};
    });
  } catch (e) {}
  return o;
}

/** Link video hợp lệ: https, đuôi mp4/webm/m4v (GitHub Pages, raw GitHub, jsDelivr…). */
function hubVidUrlOk_(u) {
  u = hubNorm(u);
  return /^https:\/\/[^\s"'<>]+$/i.test(u) && u.length < 600;
}

/** action videoSave — trainer của buổi thay toàn bộ danh sách video. p.videos = [{id?, title, src, poster, transcript, duration, catalogId}] */
function apiVideoSave(p, user) {
  var sid = hubNorm(p.sid);
  var s = hubFindSession(sid);
  if (!s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok: false, error: 'Bạn chỉ được thêm video cho buổi đào tạo do mình phụ trách.'};
  var list = p.videos;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { list = null; } }
  if (!Array.isArray(list)) return {ok: false, error: 'Danh sách video không hợp lệ.'};
  if (list.length > 30) return {ok: false, error: 'Tối đa 30 video cho 1 buổi đào tạo.'};
  for (var i = 0; i < list.length; i++) {
    if (!hubVidUrlOk_(list[i].src)) return {ok: false, error: 'Video ' + (i + 1) + ': link video phải bắt đầu bằng https://'};
    if (list[i].poster && !hubVidUrlOk_(list[i].poster)) list[i].poster = '';
    if (list[i].transcript && !hubVidUrlOk_(list[i].transcript)) list[i].transcript = '';
  }
  return hubWithLock(function(){
    var sh = hubVidSheet_(), W = HUB_VID_HEADER.length, last = sh.getLastRow();
    var all = last >= 2 ? sh.getRange(2, 1, last - 1, W).getValues() : [];
    var oldIds = {};
    all.forEach(function(r){ if (hubNorm(r[1]) === sid) oldIds[hubNorm(r[0])] = 1; });
    var keep = all.filter(function(r){ return hubNorm(r[0]) && hubNorm(r[1]) !== sid; });
    var now = new Date();
    var rows = list.map(function(v, idx){
      var id = hubNorm(v.id);
      return [(id && oldIds[id]) ? id : hubUid('V'), sid, idx + 1, hubCell(v.title || 'Video ' + (idx + 1)), hubNorm(v.src),
              hubNorm(v.poster), hubNorm(v.transcript), Math.max(0, Math.round(hubNum(v.duration, 0))), hubCell(v.catalogId),
              hubMailOf(user.email), now];
    });
    var merged = keep.concat(rows);
    if (last >= 2) sh.getRange(2, 1, last - 1, W).clearContent();
    if (merged.length) sh.getRange(2, 1, merged.length, W).setValues(merged);
    hubCacheClear('videos');
    hubLog('INFO', 'videoSave', sid + ': ' + rows.length + ' video', user.email);
    return {ok: true, count: rows.length, videos: hubVideosOf_(sid).map(hubVideoFile_),
            message: rows.length ? 'Đã lưu ' + rows.length + ' video bài giảng.' : 'Đã gỡ toàn bộ video của buổi.'};
  });
}

// ============================================================================
//  ★ v3.21 — HOÀN THÀNH KHOÁ HỌC = HỌC XONG 100% TUYẾN BÀI ⇒ CẤP CHỨNG CHỈ
//  (người dùng yêu cầu 15/10/2026: bỏ cấp chứng chỉ theo bài kiểm tra)
//  - Video: app chỉ báo "xong" khi đã xem thật ≥ 70% thời lượng (đếm từng giây, không tua vượt).
//  - Tài liệu: đọc tới trang cuối (Percent ≥ 95% trong HUB_Progress) / bấm "Đã xem xong" với file mở bằng Drive.
//  - Trainer của buổi (không đóng vai học viên) không nhận chứng chỉ của buổi mình dạy.
// ============================================================================

var HUB_CERT_BY_QUIZ = false;

/** Đã học xong mọi bài của buổi chưa; xong ⇒ ghi Completed + cấp chứng chỉ (1 lần). */
function hubStudyDone_(sid, user) {
  var s = hubFindSession(sid);
  if (!s) return null;
  if (hubCanEdit(s, user) && !user.asLearner) return null;
  var m = hubMaterials(s, {cacheOnly: true}) || hubMaterials(s, {noWait: true});
  if (!m || m.pending || !m.files || !m.files.length) return null;
  var pre = hubPrefix(user.email), done = {};
  hubReadProgressRaw().forEach(function(x){ if (x.email === pre && x.sid === sid && x.completed) done[x.fileId] = 1; });
  var total = m.files.length, n = m.files.filter(function(f){ return done[f.id]; }).length;
  if (n < total) return {done: false, n: n, total: total};
  var e = hubFindEnroll(sid, user.email);
  if (e && e.certUrl) return {done: true, n: n, total: total, certUrl: e.certUrl, already: true};
  hubUpsertEnroll(sid, s.topic, user.email, {status: 'Completed', pass: true, percent: 100, completedAt: new Date()});
  var cert = null;
  try {
    cert = hubIssueCertificate(s, user, 100, n, total, 'study');
    hubUpsertEnroll(sid, s.topic, user.email, {certUrl: cert.url, certSentAt: new Date()});
    hubNotify([user.email], 'cert', sid, 'Chứng chỉ: ' + s.topic, 'Bạn đã học xong ' + n + '/' + total + ' bài. Chứng chỉ đã được cấp.', '');
  } catch (err) {
    hubLog('ERROR', 'certificate', 'Lỗi tạo chứng chỉ (hoàn thành tuyến bài) cho ' + user.email + ': ' + err.message, sid);
  }
  try { hubRefreshCompletion(sid); } catch (err2) {}
  hubLog('INFO', 'studyDone', sid + ' ' + user.email + ' — học xong ' + n + '/' + total, cert ? cert.url : '');
  return {done: true, n: n, total: total, cert: cert ? {url: cert.url, certNo: cert.certNo, emailed: cert.emailed} : null};
}
