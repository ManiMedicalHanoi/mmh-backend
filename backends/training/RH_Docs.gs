/**
 * ============================================================================
 *  MMH TRAINING HUB — TÀI LIỆU XEM TRÊN APP (bản PDF trên GitHub Pages)  (v3.39, 02/11/2026)
 * ----------------------------------------------------------------------------
 *  Người dùng (02/11/2026): tài liệu mở qua Drive hay lỗi, hệ thống không biết "xem hết" ⇒ trainer đăng bản PDF của tài liệu
 *  lên kho công khai ManiMedicalHanoi/Training-Hub (media/s/<sid>/docs/<fileId>.pdf). Người dùng CHẤP NHẬN tài liệu đăng lên
 *  đó là công khai (ai có link đều tải được). File gốc vẫn nằm trên Drive (xem / tải như cũ).
 *  App (Training Hub v6.6) mở bản này bằng pdf.js ở chế độ trình chiếu, tính xong khi xem ≥ 70% số trang (app gửi done=1).
 *
 *  - action docPublish (trainer của buổi): {sid, fileId} ⇒ PDF (PPTX / DOCX / Google Slides / Docs đi qua bước chuyển đổi
 *    có sẵn apiFileConvert, mỗi lượt gọi chạy tối đa 2 bước, chưa xong ⇒ {pending:true}, app gọi lại) ⇒ hubGhPut_ ⇒ sheet HUB_Docs.
 *    op=remove ⇒ bỏ đăng (xoá dòng; file trên GitHub giữ lại, không còn ai trỏ tới).
 *  - hubWithDocs_ (trong hubMaterials): mỗi tài liệu đã đăng có thêm gh (link, kèm ?v=), ghAt, ghOld (file Drive đã sửa sau khi đăng).
 * ============================================================================
 */

var HUB_DOC_SHEET = 'HUB_Docs';
var HUB_DOC_HEADER = ['FileID', 'SessionID', 'FileName', 'Src', 'SizeKB', 'SrcUpdatedMs', 'PublishedBy', 'PublishedAt'];
var HUB_DOC_MAX_MB = 25;

function hubDocSheet_() {
  return hubCached('shDocs', function(){ return hubEnsureHeader(hubSheet(HUB_DOC_SHEET, true), HUB_DOC_HEADER); });
}

/** {fileId: {sid, src, upd, at}} (đệm) */
function hubReadDocs_() {
  return hubData('docs', function(){
    var sh = hubDocSheet_(), last = sh.getLastRow(), o = {};
    if (last < 2) return o;
    sh.getRange(2, 1, last - 1, HUB_DOC_HEADER.length).getValues().forEach(function(r){
      var id = hubNorm(r[0]), src = hubNorm(r[3]);
      if (!id || !src) return;
      var at = r[7] instanceof Date ? r[7].toISOString() : hubNorm(r[7]);
      o[id] = {sid: hubNorm(r[1]), src: src, upd: hubNum(r[5], 0), at: at};
    });
    return o;
  });
}

/** Gắn link bản xem trên app vào danh sách tài liệu (không sửa bản đệm). */
function hubWithDocs_(s, m) {
  if (!m || m.pending || !s || !m.files || !m.files.length) return m;
  var d;
  try { d = hubReadDocs_(); } catch (e) { return m; }
  var any = m.files.some(function(f){ return d[f.id]; });
  if (!any) return m;
  var out = {};
  for (var k in m) if (m.hasOwnProperty(k)) out[k] = m[k];
  out.files = m.files.map(function(f){
    var x = d[f.id];
    if (!x || f.isVideo) return f;
    var g = {};
    for (var j in f) if (f.hasOwnProperty(j)) g[j] = f[j];
    g.gh = x.src + (x.src.indexOf('?') < 0 ? '?v=' : '&v=') + (x.upd || 0);
    g.ghAt = x.at;
    g.ghOld = !!(f.updatedMs && x.upd && f.updatedMs > x.upd);
    return g;
  });
  return out;
}

function hubDocRowOf_(sh, fileId) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (hubNorm(ids[i][0]) === fileId) return i + 2;
  return 0;
}

/** action docPublish (trainer của buổi) */
function apiDocPublish(p, user) {
  var s = hubFindSession(hubNorm(p.sid));
  if (!s) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
  if (!hubCanEdit(s, user)) return {ok: false, error: 'Bạn chỉ được đăng tài liệu của khoá học do mình phụ trách.'};
  var fileId = hubNorm(p.fileId);
  if (hubNorm(p.op) === 'remove') {
    hubWithLock(function(){ var sh = hubDocSheet_(), row = hubDocRowOf_(sh, fileId); if (row) sh.deleteRow(row); hubCacheClear('docs'); });
    hubLog('INFO', 'docPublish', 'bỏ đăng ' + fileId + ' (' + s.sid + ') by ' + user.email, '');
    return {ok: true, removed: true, message: 'Đã bỏ bản xem trên app. Tài liệu mở qua Drive như trước.'};
  }
  if (!hubGhToken_()) return hubGhNeed_();
  var info = hubMaterialInfo(s, fileId);
  if (!info) return {ok: false, error: 'Tài liệu không thuộc khoá học này.'};
  if (info.isVideo || info.kind === 'video') return {ok: false, error: 'Video dùng nút "Đưa lên trình phát Hub".'};
  if (['pdf', 'office', 'gdoc'].indexOf(info.view) < 0) return {ok: false, code: 'NO_PREVIEW', error: 'Chỉ đăng được PDF, PowerPoint, Word và Google Slides / Docs.'};
  if (hubGoogleTarget(info) === MimeType.GOOGLE_SHEETS && info.view !== 'pdf') return {ok: false, code: 'NO_PREVIEW', error: 'Bảng tính (Excel / Google Sheets) không xem dạng trình chiếu được — giữ mở qua Drive.'};

  // chuẩn bị bản PDF (tối đa 2 bước chuyển đổi mỗi lượt gọi)
  var st = hubPvState(info);
  for (var step = 0; step < 2 && (st.stage === 'convert' || st.stage === 'export'); step++) {
    var c = apiFileConvert({sid: s.sid, fileId: info.id}, user);
    if (!c.ok) return c;
    if (c.stage === 'busy') return {ok: true, pending: true, stage: 'busy', message: 'Đang có lượt khác chuyển đổi tài liệu này…'};
    st = hubPvState(info);
  }
  if (st.stage === 'images') return {ok: false, code: 'TOO_LARGE', error: 'Bài slide quá lớn (bản PDF vượt 10 MB) — hãy giảm dung lượng ảnh trong slide rồi tải lại, hoặc giữ mở qua Drive.'};
  if (st.stage !== 'ready') return {ok: true, pending: true, stage: st.stage, message: 'Đang chuyển tài liệu sang PDF…'};

  var target = st.target, mb = target.getSize() / 1048576;
  if (mb > HUB_DOC_MAX_MB) return {ok: false, code: 'TOO_LARGE', error: 'Bản PDF ' + mb.toFixed(1) + ' MB — tối đa ' + HUB_DOC_MAX_MB + ' MB. Hãy nén PDF rồi tải lại.'};
  var path = 'media/s/' + hubGhSafe_(s.sid) + '/docs/' + hubGhSafe_(info.id).substring(0, 40) + '.pdf';
  var src = hubGhPut_(path, Utilities.base64Encode(target.getBlob().getBytes()),
    'Training Hub: tài liệu "' + hubCleanName(info.name, 80) + '" (' + s.sid + ') — ' + hubPrefix(user.email));
  var upd = info.updatedMs || 0;
  hubWithLock(function(){
    var sh = hubDocSheet_(), row = hubDocRowOf_(sh, info.id) || sh.getLastRow() + 1;
    sh.getRange(row, 1, 1, HUB_DOC_HEADER.length).setValues([[info.id, s.sid, hubCell(info.name), src, Math.round(mb * 1024), upd, hubMailOf(user.email), new Date()]]);
    hubCacheClear('docs');
  });
  hubLog('INFO', 'docPublish', s.sid + ' ' + info.id + ' (' + mb.toFixed(1) + ' MB) by ' + user.email, src);
  return {ok: true, gh: src + '?v=' + upd, ghAt: new Date().toISOString(), sizeKB: Math.round(mb * 1024),
          message: 'Đã đăng "' + info.name + '" để xem trên app. GitHub cần khoảng 1–2 phút trước khi mọi máy mở được bản này.'};
}
