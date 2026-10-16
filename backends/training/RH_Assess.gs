/**
 * ============================================================================
 *  MMH TRAINING HUB — BÀI KIỂM TRA SAU ĐÀO TẠO (ASSESSMENT) BẬT LẠI  (v3.31, 16/10/2026)
 * ----------------------------------------------------------------------------
 *  Người dùng yêu cầu 16/10/2026:
 *  1) Trainer tạo lại được bài kiểm tra (assessment) cho khoá học / buổi đào tạo, đặt ĐIỂM ĐẠT (PassScore, thang 100).
 *  2) Học viên chỉ làm bài sau khi đã xem ≥ 70% thời lượng MỖI video bài giảng của khoá (nếu khoá có video) — hubGate.
 *     Khoá không có video ⇒ làm bài ngay. Tài liệu đọc không còn là điều kiện mở bài.
 *  3) Khoá CÓ bài kiểm tra đang mở ⇒ chứng chỉ chỉ cấp khi đạt ≥ điểm trainer yêu cầu (apiQuizSubmit).
 *     Khoá KHÔNG có bài kiểm tra ⇒ giữ cách cũ: học xong 100% tuyến bài ⇒ chứng chỉ (hubStudyDone_).
 *  4) Training Master: trainer phải có KẾT QUẢ TEST (cột Q Assessment Result) mới chuyển buổi sang Completed.
 *     Buổi có bài kiểm tra trên Hub và đã có người nộp ⇒ Q tự điền "Bài KT Hub: x/y đạt · điểm TB z" (không ghi đè chữ trainer tự gõ).
 *     Coaching (PDF Review) và External (đào tạo khách hàng T&E) giữ luật riêng.
 *  5) Kết quả, link bài kiểm tra, chứng chỉ lưu vào THƯ MỤC ĐÀO TẠO của buổi, thư mục con HUB_RES_FOLDER:
 *     - Google Sheet "Kết quả bài kiểm tra – <chủ đề>" (link bài kiểm tra, điểm đạt, từng học viên: lượt, điểm cao nhất, Đạt/Chưa đạt, chứng chỉ)
 *     - lối tắt (shortcut) tới file PDF chứng chỉ của từng học viên (file gốc vẫn ở thư mục Chứng chỉ chung).
 *     Thư mục con này KHÔNG tính là bài học (hubWithVideos_ bỏ qua).
 *     Cột P (Assessment) = link bài kiểm tra trên Hub nếu đang trống.
 * ============================================================================
 */

var HUB_RES_FOLDER = 'Kết quả bài kiểm tra & Chứng chỉ';
var HUB_RES_AUTO = 'Bài KT Hub:';

/** Khoá có bài kiểm tra đang mở (có câu hỏi). */
function hubHasQuiz_(sid) {
  try { var q = hubReadQuizConfig(hubNorm(sid)); return !!(q && q.active && q.total > 0); }
  catch (e) { return false; }
}

/** Kết quả tốt nhất của từng học viên. */
function hubTestBest_(sid) {
  var by = {};
  hubReadResponsesRaw(sid, false).forEach(function(r){
    var k = hubPrefix(r.email), b = by[k];
    if (!b) b = by[k] = {email: r.email, name: r.name, attempts: 0, best: -1, pass: false, at: '', certUrl: ''};
    b.attempts++;
    if (r.percent > b.best) { b.best = r.percent; b.at = r.submittedAt; }
    if (r.result === 'Pass') b.pass = true;
    if (r.certUrl) b.certUrl = r.certUrl;
  });
  return Object.keys(by).map(function(k){ return by[k]; });
}

/** "Bài KT Hub: 8/10 đạt (≥ 70) · điểm TB 82" — rỗng khi chưa ai nộp. */
function hubTestSummary_(sid) {
  var cfg = hubReadQuizConfig(sid), L = hubTestBest_(sid);
  if (!L.length) return '';
  var pass = L.filter(function(x){ return x.pass; }).length;
  var avg = Math.round(L.reduce(function(s, x){ return s + Math.max(0, x.best); }, 0) / L.length);
  return HUB_RES_AUTO + ' ' + pass + '/' + L.length + ' đạt' + (cfg ? ' (≥ ' + cfg.passScore + ')' : '') + ' · điểm TB ' + avg;
}

function hubTestLink_(sid) {
  var u = hubAppUrl();
  return u ? u.replace(/#.*$/, '') + '#/s/' + encodeURIComponent(sid) : '';
}

/** Thư mục kết quả trong thư mục đào tạo của buổi (tạo khi cần; null nếu buổi chưa có thư mục). */
function hubResFolder_(s, create) {
  var f = null;
  try { f = hubSessionFolder(s); } catch (e) { f = null; }
  if (!f && create) { try { var r = hubRhFolder(s); s = r.s || s; f = hubSessionFolder(s); } catch (e2) { hubLog('WARN', 'resFolder', s.sid, e2.message); } }
  if (!f) return null;
  var it = f.getFoldersByName(HUB_RES_FOLDER);
  return it.hasNext() ? it.next() : (create ? f.createFolder(HUB_RES_FOLDER) : null);
}

/** Ghi P (link bài KT) + Q (tóm tắt) nếu trống / do hệ thống ghi. Trả về tóm tắt. */
function hubTestCells_(s) {
  var sum = hubTestSummary_(s.sid), sh = hubReportSheet(), C = HUB.COL;
  var pq = sh.getRange(s.row, C.ASSESSMENT, 1, 2).getValues()[0];
  var link = hubTestLink_(s.sid), w = false;
  if (!hubNorm(pq[0]) && link && hubHasQuiz_(s.sid)) { pq[0] = link; w = true; }
  var q0 = hubNorm(pq[1]);
  if (sum && (!q0 || q0.indexOf(HUB_RES_AUTO) === 0) && q0 !== sum) { pq[1] = sum; w = true; }
  if (w) { sh.getRange(s.row, C.ASSESSMENT, 1, 2).setValues([pq]); hubCacheClear('sessions'); }
  return {summary: sum, result: hubNorm(pq[1]), link: hubNorm(pq[0])};
}

/** Xuất bảng kết quả vào thư mục đào tạo (Google Sheet, ghi đè nội dung mỗi lần). */
function hubTestExport_(sid, opt) {
  opt = opt || {};
  var s = hubFindSession(sid); if (!s) return null;
  var cfg = hubReadQuizConfig(sid), L = hubTestBest_(sid);
  if (!cfg || !L.length) return null;
  var folder = hubResFolder_(s, !!opt.create);
  if (!folder) return null;
  var name = 'Kết quả bài kiểm tra – ' + hubSafeName(s.topic, 80), ssx = null;
  var it = folder.getFilesByName(name);
  while (it.hasNext()) { var f0 = it.next(); if (f0.getMimeType() === MimeType.GOOGLE_SHEETS && !f0.isTrashed()) { ssx = SpreadsheetApp.openById(f0.getId()); break; } }
  if (!ssx) {
    ssx = SpreadsheetApp.create(name);
    try { DriveApp.getFileById(ssx.getId()).moveTo(folder); } catch (e) { hubLog('WARN', 'testExport', 'Không chuyển được file vào thư mục: ' + e.message, sid); }
  }
  var sh = ssx.getSheets()[0];
  sh.clear();
  var head = [
    ['KẾT QUẢ BÀI KIỂM TRA SAU ĐÀO TẠO', '', '', '', '', '', ''],
    ['Chủ đề', s.topic, '', '', '', '', ''],
    ['Ngày đào tạo', s.dateText || '', '', '', '', '', ''],
    ['Trainer', s.trainer || '', '', '', '', '', ''],
    ['Link bài kiểm tra', hubTestLink_(sid), '', '', '', '', ''],
    ['Điểm đạt', cfg.passScore + '/100 · ' + cfg.total + ' câu · ' + cfg.durationMin + ' phút · tối đa ' + cfg.maxAttempts + ' lượt', '', '', '', '', ''],
    ['Tổng hợp', hubTestSummary_(sid), '', '', '', '', ''],
    ['Cập nhật', hubFmt(new Date(), 'dd/MM/yyyy HH:mm'), '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['Học viên', 'Email', 'Số lượt', 'Điểm cao nhất', 'Kết quả', 'Nộp lúc', 'Chứng chỉ']
  ];
  var cert = {};
  try { hubReadEnrollment().forEach(function(e){ if (e.sid === sid && e.certUrl) cert[hubPrefix(e.email)] = e.certUrl; }); } catch (e) {}
  var rows = L.sort(function(a, b){ return b.best - a.best; }).map(function(x){
    return [x.name || x.email, x.email, x.attempts, Math.max(0, x.best), x.pass ? 'Đạt' : 'Chưa đạt', x.at, cert[hubPrefix(x.email)] || x.certUrl || ''];
  });
  var all = head.concat(rows);
  sh.getRange(1, 1, all.length, 7).setValues(all);
  try {
    sh.getRange(1, 1).setFontWeight('bold').setFontSize(13).setFontColor('#003047');
    sh.getRange(2, 1, 7, 1).setFontWeight('bold').setFontColor('#5B6B7D');
    sh.getRange(10, 1, 1, 7).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047');
    sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 260); sh.setColumnWidth(7, 320); sh.setFrozenRows(10);
  } catch (e) {}
  return {id: ssx.getId(), url: ssx.getUrl(), name: name};
}

/** Chứng chỉ ⇒ lối tắt trong thư mục kết quả của buổi (không làm hỏng việc cấp chứng chỉ nếu lỗi). */
function hubCertToFolder_(s, file) {
  try {
    var folder = hubResFolder_(s, true); if (!folder || !file) return;
    var nm = file.getName(), it = folder.getFilesByName(nm);
    while (it.hasNext()) { try { it.next().setTrashed(true); } catch (e) {} }
    try { folder.createShortcut(file.getId()).setName(nm); }
    catch (e1) { file.makeCopy(nm, folder); }
  } catch (e) { hubLog('WARN', 'certToFolder', (s && s.sid) + ': ' + e.message, ''); }
}

/** Sau khi có bài nộp: cập nhật P/Q + bảng kết quả (gọi ngoài khoá, lỗi chỉ ghi log). */
function hubTestSync_(sid) {
  try {
    var s = hubFindSession(sid); if (!s) return;
    hubTestCells_(s);
    hubTestExport_(sid, {create: true});
  } catch (e) { hubLog('WARN', 'testSync', sid + ': ' + e.message, ''); }
}

/** Luật Completed của Training Master: cần kết quả test (trừ Coaching / External). Trả lỗi hoặc ''. */
function hubNeedTestResult_(type) {
  if (hubIsCoaching(type)) return false;
  return !/external/i.test(hubNorm(type));
}
function hubTestNeedMsg_() {
  return 'Cần cập nhật KẾT QUẢ BÀI KIỂM TRA (Assessment result) trước khi chuyển buổi đào tạo sang Completed — ' +
         'nhập kết quả, hoặc tạo bài kiểm tra trên Training Hub để học viên làm (kết quả tự điền).';
}
