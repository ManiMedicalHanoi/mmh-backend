/**
 * ============================================================================
 *  MMH TRAINING HUB — HỌC ONLINE BẰNG VIDEO + TẠO CÂU HỎI BẰNG AI  (v3.20, 15/10/2026)
 * ----------------------------------------------------------------------------
 *  1) VIDEO BÀI GIẢNG (sheet HUB_Videos trong Training Master)
 *     - File video (MP4) nằm trên GitHub Pages của app Training-Hub (thư mục media/), KHÔNG nằm trên Drive
 *       ⇒ xem ngay trong app, không cần đăng nhập Google, chạy được trên điện thoại.
 *     - Mỗi dòng = 1 video gắn với 1 buổi đào tạo (SessionID). hubMaterials() ghép video vào ĐẦU danh sách
 *       tài liệu của buổi (id "V…", kind 'video', view 'drive', src = link MP4) ⇒ lộ trình tự học, điều kiện
 *       mở bài kiểm tra (hubGate), tiến độ (HUB_Progress), chứng chỉ — dùng lại nguyên cơ chế cũ.
 *     - Học viên phải xem thật ≥ 90% thời lượng (app đếm từng giây đã xem, không cho tua vượt) mới tính "xong".
 *     - action videoSave (trainer của buổi): thay toàn bộ danh sách video của buổi.
 *
 *  2) TẠO CÂU HỎI BẰNG AI (Google Gemini — gói miễn phí)
 *     - Khoá API ở Script Property GEMINI_API_KEY (Admin dán trong app: action aiKey). Model: GEMINI_MODEL
 *       (mặc định gemini-flash-latest, lỗi 404 thì thử gemini-2.5-flash).
 *     - action aiQuiz (trainer của buổi): nguồn = lời thoại video (app gửi kèm `text`) + tài liệu PDF / Google
 *       Docs / Slides / PPTX đã chuyển PDF của buổi (`fileIds`). Trả {questions:[…]} đúng định dạng saveQuiz —
 *       KHÔNG tự lưu: trainer xem / sửa rồi mới Lưu.
 *     - Dùng UrlFetchApp (quyền script.external_request ĐÃ có) ⇒ không cần cấp quyền mới.
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
  if (!vids.length) return m;
  var out = {};
  for (var k in m) if (m.hasOwnProperty(k)) out[k] = m[k];
  out.files = vids.map(hubVideoFile_).concat((m.files || []).filter(function(f){ return !f.isVideo; }));
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
//  TẠO CÂU HỎI BẰNG AI (Gemini)
// ============================================================================

function hubAiKey_() { return hubNorm(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')); }

/** action aiKey (Admin): đặt / xoá khoá; không bao giờ trả khoá về. */
function apiAiKey(p, user) {
  var props = PropertiesService.getScriptProperties();
  if (hubBool(p.clear)) { props.deleteProperty('GEMINI_API_KEY'); return {ok: true, has: false, message: 'Đã xoá khoá AI.'}; }
  var k = hubNorm(p.key);
  if (k) {
    if (!/^[A-Za-z0-9_\-]{20,80}$/.test(k)) return {ok: false, error: 'Khoá không đúng định dạng (khoá Gemini thường bắt đầu bằng "AIza…").'};
    props.setProperty('GEMINI_API_KEY', k);
    if (hubNorm(p.model)) props.setProperty('GEMINI_MODEL', hubNorm(p.model));
    hubLog('INFO', 'aiKey', 'Cập nhật khoá Gemini', user.email);
    return {ok: true, has: true, message: 'Đã lưu khoá AI — nút "Tạo bằng AI" dùng được ngay.'};
  }
  return {ok: true, has: !!hubAiKey_()};
}

/** action aiStatus (trainer): đã có khoá AI chưa. */
function apiAiStatus(p, user) { return {ok: true, has: !!hubAiKey_(), admin: user.role === 'admin'}; }

var HUB_AI_LEVEL = {easy: 'dễ (chủ yếu nhớ / nhận biết)', medium: 'trung bình (nhớ + hiểu)', hard: 'khó (hiểu + vận dụng tình huống)'};

function hubAiPrompt_(o) {
  return [
    'Bạn là chuyên gia đào tạo của MANI Medical Hanoi (MMH), soạn bài kiểm tra sau đào tạo cho nhân viên MMH (sales, marketing, back office) về nha khoa, nhãn khoa và ngoại khoa.',
    'Chủ đề buổi đào tạo: "' + o.topic + '".',
    '',
    'NHIỆM VỤ: đọc tài liệu đào tạo đính kèm (lời thoại video, slide, PDF) và soạn ĐÚNG ' + o.count + ' câu hỏi trắc nghiệm, mức độ ' + (HUB_AI_LEVEL[o.level] || HUB_AI_LEVEL.medium) + '.',
    '',
    'QUY TẮC:',
    '1. CHỈ hỏi những gì có trong tài liệu. Không thêm kiến thức ngoài, không suy diễn số liệu.',
    '2. Phủ đều các phần của tài liệu. Tỷ lệ gợi ý: ~40% nhớ, ~40% hiểu, ~20% vận dụng (tình huống thực tế với bác sĩ / sản phẩm).',
    '3. Câu hỏi ngắn, rõ, một ý. Không phủ định kép, không "Tất cả các đáp án trên" / "Không đáp án nào".',
    '4. Phương án nhiễu hợp lý (cùng loại, độ dài tương đương đáp án đúng). Vị trí đáp án đúng phân bố đều A/B/C/D.',
    '5. Viết bằng ' + (o.lang === 'en' ? 'tiếng Anh' : 'tiếng Việt') + '. Thuật ngữ chuyên môn kèm tiếng Anh trong ngoặc ở lần đầu, vd. "giác mạc (cornea)".',
    '6. Loại câu: "single" = 1 đáp án đúng, 4 phương án a–d (≥ 70% số câu); "multi" = nhiều đáp án đúng, correct ghi liền vd "AC";',
    '   "truefalse" = Đúng/Sai, để trống a–d, correct "A" = Đúng, "B" = Sai.',
    '7. explanation: 1 câu, nêu lý do đáp án đúng và vị trí trong tài liệu (slide / trang / phút).',
    o.note ? '8. Yêu cầu thêm của trainer: ' + o.note : '',
    '',
    'Trả về JSON {"questions":[{"type","question","a","b","c","d","correct","explanation"}]}.'
  ].filter(function(x){ return x !== ''; }).join('\n');
}

/** Lấy PDF của 1 tài liệu trong buổi (đã chuyển đổi) để gửi cho AI. */
function hubAiFileBlob_(s, fileId) {
  var info = hubMaterialInfo(s, fileId);
  if (!info || info.isVideo) return {skip: 'không tìm thấy tài liệu'};
  if (info.view === 'pdf') return {blob: DriveApp.getFileById(info.id).getBlob(), name: info.name};
  if (info.view === 'gdoc' && !/spreadsheet/.test(info.mime)) {
    return {blob: DriveApp.getFileById(info.id).getAs(MimeType.PDF), name: info.name};
  }
  if (info.view === 'office') {
    var st = hubPvState(info);
    if (st.stage === 'ready') return {blob: st.target.getBlob(), name: info.name};
    return {skip: 'chưa chuyển sang PDF — mở tài liệu này trong Hub 1 lần rồi thử lại'};
  }
  return {skip: 'định dạng chưa hỗ trợ'};
}

function hubAiCall_(key, model, body) {
  return UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: {'x-goog-api-key': key}, payload: JSON.stringify(body)
  });
}

/** Chuẩn hoá 1 câu AI trả về theo định dạng saveQuiz. */
function hubAiNormQ_(q) {
  var type = hubNorm(q.type).toLowerCase();
  if (['single', 'multi', 'truefalse'].indexOf(type) < 0) type = 'single';
  var corr = hubNorm(q.correct).toUpperCase();
  if (/^(ĐÚNG|DUNG|TRUE)$/.test(corr)) corr = 'A';
  if (/^(SAI|FALSE)$/.test(corr)) corr = 'B';
  corr = corr.replace(/[^ABCD]/g, '').split('').filter(function(c, i, a){ return a.indexOf(c) === i; }).sort().join('');
  var o = {qid: '', type: type, question: hubNorm(q.question), a: hubNorm(q.a), b: hubNorm(q.b), c: hubNorm(q.c), d: hubNorm(q.d),
           correct: corr, points: 1, explanation: hubNorm(q.explanation)};
  if (type === 'truefalse') { o.a = ''; o.b = ''; o.c = ''; o.d = ''; if (o.correct !== 'A' && o.correct !== 'B') o.correct = ''; }
  else if (type === 'single' && corr.length > 1) o.type = 'multi';
  else if (type === 'multi' && corr.length === 1) o.type = 'single';
  return o;
}

/** action aiQuiz — p: sid, count (3–40), level easy|medium|hard, lang vi|en, note, text (lời thoại video…), fileIds[] */
function apiAiQuiz(p, user) {
  var sid = hubNorm(p.sid), s = hubFindSession(sid);
  if (!s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok: false, error: 'Bạn chỉ được tạo câu hỏi cho buổi đào tạo do mình phụ trách.'};
  var key = hubAiKey_();
  if (!key) return {ok: false, code: 'NO_AI_KEY', error: 'Chưa cài khoá AI (Gemini). Admin dán khoá 1 lần là dùng được.'};
  var count = Math.max(3, Math.min(40, Math.round(hubNum(p.count, 10))));
  var text = String(p.text || '').substring(0, 120000);
  var ids = hubList(p.fileIds).slice(0, 6);
  var parts = [{text: hubAiPrompt_({topic: s.topic, count: count, level: hubNorm(p.level), lang: hubNorm(p.lang), note: hubNorm(p.note).substring(0, 500)})}];
  if (text) parts.push({text: '=== LỜI THOẠI / NỘI DUNG VIDEO BÀI GIẢNG ===\n' + text});
  var used = [], skipped = [], bytes = 0, LIMIT = 14 * 1048576;
  ids.forEach(function(id){
    try {
      var r = hubAiFileBlob_(s, hubNorm(id));
      if (r.skip) { skipped.push({id: id, reason: r.skip}); return; }
      var b = r.blob.getBytes();
      if (bytes + b.length > LIMIT) { skipped.push({id: id, name: r.name, reason: 'tổng dung lượng vượt 14 MB'}); return; }
      bytes += b.length;
      parts.push({text: '=== TÀI LIỆU: ' + r.name + ' ==='});
      parts.push({inline_data: {mime_type: 'application/pdf', data: Utilities.base64Encode(b)}});
      used.push(r.name);
    } catch (e) { skipped.push({id: id, reason: e.message}); }
  });
  if (parts.length < 2) return {ok: false, error: 'Chưa có nội dung để AI đọc: chọn ít nhất 1 video hoặc 1 tài liệu PDF / slide.', skipped: skipped};

  var qItem = {type: 'OBJECT', properties: {
    type: {type: 'STRING', 'enum': ['single', 'multi', 'truefalse']}, question: {type: 'STRING'},
    a: {type: 'STRING'}, b: {type: 'STRING'}, c: {type: 'STRING'}, d: {type: 'STRING'},
    correct: {type: 'STRING'}, explanation: {type: 'STRING'}}, required: ['type', 'question', 'correct']};
  var body = {contents: [{role: 'user', parts: parts}],
    generationConfig: {temperature: 0.4, responseMimeType: 'application/json',
      responseSchema: {type: 'OBJECT', properties: {questions: {type: 'ARRAY', items: qItem}}, required: ['questions']}}};

  var props = PropertiesService.getScriptProperties();
  var models = hubUniq([hubNorm(props.getProperty('GEMINI_MODEL')), 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']);
  var res = null, code = 0, model = '', t0 = Date.now();
  for (var i = 0; i < models.length; i++) {
    model = models[i];
    res = hubAiCall_(key, model, body);
    code = res.getResponseCode();
    if (code !== 404) break;                           // model không còn ⇒ thử model kế tiếp
  }
  var raw = String(res.getContentText() || '');
  if (code !== 200) {
    var msg = '';
    try { msg = JSON.parse(raw).error.message || ''; } catch (e) { msg = raw.substring(0, 200); }
    hubLog('WARN', 'aiQuiz', 'Gemini ' + code + ' (' + model + '): ' + msg.substring(0, 300), user.email + ' · ' + sid);
    if (code === 429) return {ok: false, code: 'AI_QUOTA', error: 'AI đang hết lượt miễn phí trong phút / ngày này — đợi 1–2 phút rồi thử lại (hoặc giảm số tài liệu).'};
    if (code === 400 && /api key|API_KEY/i.test(msg)) return {ok: false, code: 'NO_AI_KEY', error: 'Khoá AI không hợp lệ — Admin cần dán lại khoá Gemini.'};
    if (code === 403) return {ok: false, code: 'NO_AI_KEY', error: 'Khoá AI bị từ chối (403) — kiểm tra khoá Gemini hoặc tạo khoá mới ở aistudio.google.com.'};
    return {ok: false, error: 'AI chưa trả lời được (mã ' + code + '): ' + msg.substring(0, 200)};
  }
  var out = [];
  try {
    var j = JSON.parse(raw), cand = (j.candidates || [])[0] || {};
    var txt = ((cand.content || {}).parts || []).map(function(x){ return x.text || ''; }).join('');
    var data = JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    out = (data.questions || data || []).map(hubAiNormQ_).filter(function(q){ return q.question && (q.type === 'truefalse' || (q.a && q.b)); });
  } catch (e) {
    hubLog('WARN', 'aiQuiz', 'Không đọc được JSON: ' + raw.substring(0, 300), user.email + ' · ' + sid);
    return {ok: false, error: 'AI trả về sai định dạng — bấm Tạo lại.'};
  }
  if (!out.length) return {ok: false, error: 'AI chưa soạn được câu hỏi nào từ tài liệu này — thử chọn thêm tài liệu.'};
  hubLog('INFO', 'aiQuiz', sid + ': ' + out.length + ' câu (' + model + ', ' + Math.round((Date.now() - t0) / 1000) + 's)', user.email);
  return {ok: true, questions: out, model: model, used: used, skipped: skipped,
          message: 'AI đã soạn ' + out.length + ' câu hỏi — kiểm tra lại từng câu trước khi lưu.'};
}
