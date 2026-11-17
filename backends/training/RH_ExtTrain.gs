/**
 * ============================================================================
 *  ★ v3.46 (17/11/2026, người dùng yêu cầu) — GHI 1 BUỔI ĐÀO TẠO ĐẠI LÝ ĐÃ HOÀN THÀNH
 * ----------------------------------------------------------------------------
 *  Buổi đào tạo đại lý của NPP Meci ngày 17/11/2026 (trainer Giang): Dụng cụ nội nha, mũi khoan MANI và vật liệu MMG.
 *  Ghi 1 dòng ở sheet Training Report (cùng định dạng buổi "Đào tạo khách hàng" T&E của CRM):
 *    Type External · Category Customer Training · Status Completed · Purpose theo agenda gửi sếp ·
 *    Target Audience "Khách hàng: …" · Summary = review 5 dòng · P = link bảng kết quả bài kiểm tra · Q = tóm tắt kết quả ·
 *    giờ W / X · cột T&E (team dental, sản phẩm, số người, review, danh sách người tham dự JSON — không có số điện thoại).
 *  Thư mục buổi tạo trong thư mục mẹ "Customer Training"; file bài giảng tải lên bằng Google Drive (ngoài script).
 *  ⇒ Training Hub, lịch Report Hub, tab T&E của CRM đọc cùng dòng này.
 *
 *  Gọi: workflow "Kiểm tra" ▸ ping = training?action=rhExtTrain&key=<8 ký tự cuối Script ID>&op=status|run&full=1
 *    · status: buổi đã ghi chưa (Script Property EXT1117_SID), dòng, thư mục, file trong thư mục
 *    · run   : ghi buổi (chỉ 1 lần; đã ghi ⇒ trả về buổi cũ, không ghi thêm)
 *    · fix   : chép định dạng ngày của dòng buổi trước vào ô E (dòng mới hiển thị kèm giờ ⇒ đọc không ra ngày), giờ W / X dạng chữ
 *  Không dùng dịch vụ Google mới.
 * ============================================================================
 */

var EXT1117 = {
  PROP: 'EXT1117_SID',
  date: '2026-11-17', timeFrom: '09:00', timeTo: '10:30', team: 'dental', pic: 'Giang',
  topic: 'Đào tạo đại lý NPP Meci: Dụng cụ nội nha, mũi khoan MANI và vật liệu MMG',
  purpose: 'Giúp NPP Meci và đại lý nắm danh mục, đặc điểm, lợi ích và ứng dụng lâm sàng của dụng cụ nội nha, mũi khoan MANI ' +
           '(trọng tâm JIZAI) và vật liệu MMG (composite, Mani Bond, tẩy trắng); kiểm tra kiến thức bằng bài kiểm tra 10 câu mỗi phần.',
  product: 'Dụng cụ nội nha (trâm tay, JIZAI) · Mũi khoan (DIA-BURS, carbide, Surgical, MI) · Vật liệu MMG (composite, Mani Bond, Bleach\'n Shine) · Carbide Bur 1559L, IPR-01EF',
  folderAud: 'NPP Meci và đại lý',
  target: 9, actual: 9,
  testLink: 'https://docs.google.com/spreadsheets/d/18PuIGqsglswkcq4okVxtdKt1IjqloLXYCBMgiRd5Dd0/edit',
  testResult: 'Phần 1 (dụng cụ nội nha, mũi khoan): 5/9 người đạt (56%), trung bình 4,8/10 câu · ' +
              'Phần 2 (vật liệu MMG, sản phẩm mới): 6/7 người đạt (86%), trung bình 6,4/10 câu · đạt từ 6/10 câu',
  review: [
    '-Số lượng tham dự thực tế: 9 người làm bài kiểm tra (Meci, THDental Supply, Invadent, Newdent, Sàn Nha Khoa).',
    '-Tóm tắt hoạt động: Buổi đào tạo khoảng 90 phút, 2 phần. Phần 1: dụng cụ nội nha và mũi khoan MANI, trọng tâm JIZAI. ' +
      'Phần 2: vật liệu MMG (composite, Mani Bond, tẩy trắng) và sản phẩm mới (Carbide Bur 1559L, IPR-01EF). ' +
      'Mỗi phần có bài kiểm tra 10 câu trên điện thoại, top 3 nhận túi cói. Kết quả: Phần 1 5/9 đạt (56%), TB 4,8/10 câu; Phần 2 6/7 đạt (86%), TB 6,4/10 câu.',
    '-Phản hồi khách hàng: Đại lý nắm vững sản phẩm MMG hơn nhóm dụng cụ (nội nha, mũi khoan). Đại lý quan tâm tới tẩy trắng, đặt câu hỏi so sánh với Pola.',
    '-Doanh số: Chưa ghi nhận tại buổi đào tạo.',
    '-Hành động tiếp theo: Ôn lại nhóm dụng cụ nội nha và mũi khoan cho đại lý (điểm Phần 1 thấp hơn Phần 2); chuẩn bị tài liệu tẩy trắng Bleach\'n Shine và nội dung trả lời khi đại lý hỏi so sánh với Pola.'
  ].join('\n'),
  audience: [
    ['Hoàng Vinh', 'Meci'], ['Huỳnh Anh Tuấn', 'THDental Supply'], ['Trần Thị Tường Vy', 'Invadent'], ['Lê Thị Diệu Hiền', 'Invadent'],
    ['Nguyễn Vũ Minh Nhật', 'Newdent'], ['Bùi Thị Hoàng Như', 'Sàn Nha Khoa'], ['Đức Hiếu', 'Sàn Nha Khoa'],
    ['Lê Thị Mỹ Quý', 'Sàn Nha Khoa'], ['Trần Thị Thu Hiền', 'Sàn Nha Khoa']
  ]
};

function apiRhExtTrain(p) {
  if (hubNorm(p.key) !== ScriptApp.getScriptId().slice(-8)) return {ok: false, code: 'KEY'};
  var op = hubNorm(p.op) || 'status', P = PropertiesService.getScriptProperties();
  if (op === 'run' && !P.getProperty(EXT1117.PROP)) {
    var r = ext1117Write_();
    if (!r.ok) return r;
    P.setProperty(EXT1117.PROP, r.sid);
    hubLog('INFO', 'rhExtTrain', r.sid + ' row ' + r.row + ' (Completed)', EXT1117.topic);
  } else if (op === 'peek') {             // chỉ đọc: giá trị / công thức / định dạng các dòng quanh buổi (chẩn đoán)
    var sh = hubReportSheet(), r0 = Math.max(HUB.DATA_START_ROW, (+p.row || 110) - 2), n = 4, w = HUB.COL.TIME_TO;
    var rg = sh.getRange(r0, 1, n, w), V = rg.getDisplayValues(), F = rg.getFormulas(), NF = rg.getNumberFormats();
    var dv = sh.getRange(r0 + 2, HUB.COL.DATE).getDataValidation();
    return {ok: true, sheet: sh.getName(), lastRow: sh.getLastRow(), r0: r0,
      rows: V.map(function(r, i){ return {row: r0 + i, b_e: r.slice(1, 5), f_b_e: F[i].slice(1, 5), nf_e: NF[i][4], tw: r.slice(19, 24)}; }),
      e5: sh.getRange(HUB.DATA_START_ROW, 1, 1, 6).getFormulas()[0], dvE: dv ? String(dv.getCriteriaType()) : '',
      prot: sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).map(function(x){ return x.getRange().getA1Notation(); }).slice(0, 10)};
  } else if (op === 'fix') {
    var sid0 = P.getProperty(EXT1117.PROP); if (!sid0) return {ok: false, error: 'Chưa ghi buổi.'};
    var fx = ext1117Fix_(sid0); if (!fx.ok) return fx;
    var st = ext1117Status_(sid0, op); st.fix = fx; return st;
  } else if (op !== 'run' && op !== 'status') return {ok: false, error: 'op = status | run | fix'};
  return ext1117Status_(P.getProperty(EXT1117.PROP), op);
}

function ext1117Write_() {
  var E = EXT1117, date = hubToDate(E.date);
  var aud = E.audience.map(function(a){ return {code: '', name: a[0], workplace: a[1]}; });
  var audText = 'Khách hàng: ' + E.folderAud + ' · ' + aud.map(function(a){ return a.name + ' (' + a.workplace + ')'; }).join(' · ');
  return hubWithLock(function(){
    var sh = hubReportSheet(), C = HUB.COL;
    var dup = hubReadSessions().filter(function(s){ return hubNorm(s.topic) === E.topic && s.status !== 'Cancel'; })[0];
    if (dup) return {ok: true, sid: dup.sid, row: dup.row, existed: true};
    var row = hubNextEmptyRow(sh), sid = hubSidOf(date, row);
    sh.getRange(row, C.DATE, 1, C.SUMMARY - C.DATE + 1).setValues([[date, TE.TYPE, TE.CAT, E.topic, E.purpose, E.pic, audText, 'Completed', '', '', E.review]]);
    sh.getRange(row, C.ASSESSMENT, 1, 2).setValues([[E.testLink, E.testResult]]);
    sh.getRange(row, C.SID).setValue(sid);
    sh.getRange(row, C.TIME_FROM, 1, 2).setValues([[E.timeFrom, E.timeTo]]);
    var M = hubTeCols_(sh, true), vals = [E.team, E.product, '', E.target, E.actual, E.review, JSON.stringify(aud)];
    TE.COLS.forEach(function(c, i){ sh.getRange(row, M[c]).setValue(vals[i]); });
    var folder = null;
    try { folder = hubEnsureFolder(sh, row, {sid: sid, date: date, type: TE.TYPE, category: TE.CAT, audience: E.folderAud, topic: E.topic}); }
    catch (e) { hubLog('ERROR', 'rhExtTrain folder', sid, e.message); }
    hubCacheClear('sessions');
    return {ok: true, sid: sid, row: row, folder: folder};
  });
}

/** Dòng mới chưa có định dạng ngày ⇒ ô E hiển thị cả giờ, hệ thống đọc không ra ngày: chép định dạng ô E / W / X của dòng buổi trước. */
function ext1117Fix_(sid) {
  return hubWithLock(function(){
    var sh = hubReportSheet(), C = HUB.COL, row = 0, last = sh.getLastRow();
    var ids = sh.getRange(HUB.DATA_START_ROW, C.SID, last - HUB.DATA_START_ROW + 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (hubNorm(ids[i][0]) === sid) { row = HUB.DATA_START_ROW + i; break; }
    if (!row) return {ok: false, error: 'Không thấy dòng của ' + sid};
    var before = {e: sh.getRange(row, C.DATE).getDisplayValue(), ev: String(sh.getRange(row, C.DATE).getValue()), d: String(hubToDate(EXT1117.date)), w: sh.getRange(row, C.TIME_FROM).getDisplayValue(), x: sh.getRange(row, C.TIME_TO).getDisplayValue()};
    var ref = 0;
    for (var r = row - 1; r >= HUB.DATA_START_ROW; r--) { if (hubToDate(sh.getRange(r, C.DATE).getDisplayValue())) { ref = r; break; } }
    var fmt = ref ? sh.getRange(ref, C.DATE).getNumberFormat() : '';
    var cell = sh.getRange(row, C.DATE), d = hubToDate(EXT1117.date);
    if (!hubToDate(cell.getDisplayValue())) { cell.setNumberFormat(fmt || 'dd/MM/yyyy'); cell.setValue(d); }
    if (!hubToDate(cell.getDisplayValue())) cell.setValue(hubFmt(d, 'dd/MM/yyyy'));   // dự phòng: ghi dạng chữ như dòng khác hiển thị
    sh.getRange(row, C.TIME_FROM, 1, 2).setNumberFormat('@').setValues([[EXT1117.timeFrom, EXT1117.timeTo]]);
    SpreadsheetApp.flush();
    hubCacheClear('sessions');
    return {ok: true, row: row, ref: ref, fmt: fmt, before: before,
            after: {e: sh.getRange(row, C.DATE).getDisplayValue(), w: sh.getRange(row, C.TIME_FROM).getDisplayValue(), x: sh.getRange(row, C.TIME_TO).getDisplayValue()}};
  });
}

function ext1117Status_(sid, op) {
  if (!sid) return {ok: true, op: op, done: false};
  hubCacheClear('sessions');
  var s = hubFindSession(sid);
  if (!s) return {ok: true, op: op, done: true, sid: sid, missing: true};
  var out = {ok: true, op: op, done: true, sid: sid, row: s.row, date: s.date, type: s.type, category: s.category, topic: s.topic,
             trainer: s.trainer, status: s.status, timeFrom: s.timeFrom, timeTo: s.timeTo, audience: hubNorm(s.audience).substring(0, 200), folderUrl: s.folderUrl || '',
             assessment: s.assessment, assessmentResult: s.assessmentResult, files: []};
  try {
    var src = hubSessionSource(s);
    if (src && src.folder) {
      out.folderId = src.folder.getId(); out.folderName = src.folder.getName();
      var it = src.folder.getFiles();
      while (it.hasNext() && out.files.length < 30) { var f = it.next(); out.files.push(f.getName() + ' · ' + Math.round(f.getSize() / 1024) + ' KB'); }
    }
  } catch (e) { out.folderErr = e.message; }
  return out;
}
