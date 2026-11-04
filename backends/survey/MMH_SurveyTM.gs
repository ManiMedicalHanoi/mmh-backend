/**
 * MMH_SurveyTM.gs v1.0 (04/11/2026) — nối bài kiểm tra / khảo sát với BUỔI ĐÀO TẠO trong Training Master (file "MMH - Training Master").
 *   action trainerSessions (khoá, email) ⇒ trainer là ai (RH_Users: Email · Pic · Dept · Title) + các buổi người đó là Trainer (Training Report, cột J)
 *   spec.sid khi tạo ⇒ dòng buổi (cột T = Session ID): P (Assessment) = link làm bài · Q (Assessment Result) = tóm tắt + link file kết quả (Sheet)
 *   mỗi lượt nộp ⇒ cập nhật Q. Chỉ ghi đè P / Q khi ô trống hoặc do hệ thống này ghi (dấu SVTM.MARK) — không đè dữ liệu tay / của Training Hub ("Bài KT Hub:").
 * Chỉ dùng SpreadsheetApp (phạm vi spreadsheets đã cấp). Tài khoản chạy máy chủ survey phải có quyền sửa file Training Master.
 */
var SVTM = {
  ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ', REPORT: 'Training Report FY67', USERS: 'RH_Users', START: 5,
  C: { DATE: 5, CATEGORY: 7, TOPIC: 8, PURPOSE: 9, TRAINER: 10, AUDIENCE: 11, STATUS: 12, P: 16, Q: 17, SID: 20 },
  MARK: 'Bài KT MMH:'
};

function svTmBook_() { return SpreadsheetApp.openById(SVTM.ID); }
function svTmNorm_(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim(); }

function svTmWho_(email) {
  var local = String(email || '').toLowerCase().split('@')[0].trim();
  if (!local) return null;
  var sh = svTmBook_().getSheetByName(SVTM.USERS), last = sh.getLastRow();
  if (last < 2) return null;
  var v = sh.getRange(2, 1, last - 1, 13).getValues();
  for (var i = 0; i < v.length; i++) {
    if (String(v[i][0] || '').toLowerCase().split('@')[0].trim() === local && v[i][1])
      return { pic: String(v[i][1]).trim(), level: String(v[i][2] || ''), dept: String(v[i][10] || ''), title: String(v[i][11] || '') };
  }
  return null;
}

function svTmDate_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(d || ''); }

/* buổi mà người này là Trainer (cột J có tên Pic), từ `back` ngày trước đến `ahead` ngày tới, bỏ Cancel; mới nhất trước */
function svTmSessions_(email, back, ahead) {
  var who = svTmWho_(email);
  if (!who) return { ok: false, error: 'Không tìm thấy email ' + email + ' trong danh sách người dùng (RH_Users) của Training Master.' };
  var sh = svTmBook_().getSheetByName(SVTM.REPORT), last = sh.getLastRow(), C = SVTM.C, out = [];
  if (last >= SVTM.START) {
    var v = sh.getRange(SVTM.START, 1, last - SVTM.START + 1, C.SID).getValues();
    var now = new Date(), from = new Date(now.getTime() - (back || 120) * 864e5), to = new Date(now.getTime() + (ahead || 60) * 864e5);
    var me = svTmNorm_(who.pic);
    v.forEach(function (r, i) {
      var tr = String(r[C.TRAINER - 1] || ''), d = r[C.DATE - 1], st = String(r[C.STATUS - 1] || '');
      if (!r[C.TOPIC - 1] || /cancel/i.test(st)) return;
      if (!tr.split(/[,;\/&+\n]/).some(function (t) { return svTmNorm_(t) === me; })) return;
      if (d instanceof Date && (d < from || d > to)) return;
      out.push({ row: SVTM.START + i, sid: String(r[C.SID - 1] || ''), date: svTmDate_(d), topic: String(r[C.TOPIC - 1]), purpose: String(r[C.PURPOSE - 1] || '').slice(0, 300),
        category: String(r[C.CATEGORY - 1] || ''), audience: String(r[C.AUDIENCE - 1] || ''), status: st || 'Plan', trainer: tr,
        assessment: String(r[C.P - 1] || ''), result: String(r[C.Q - 1] || '') });
    });
  }
  out.sort(function (a, b) { return b.date.localeCompare(a.date); });
  return { ok: true, who: who, sessions: out };
}

function svTmRow_(sid) {
  var sh = svTmBook_().getSheetByName(SVTM.REPORT), last = sh.getLastRow();
  if (!sid || last < SVTM.START) return null;
  var ids = sh.getRange(SVTM.START, SVTM.C.SID, last - SVTM.START + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === sid) return { sh: sh, row: SVTM.START + i };
  return null;
}

function svTmMine_(v) { v = String(v || '').trim(); return !v || v.indexOf(SVTM.MARK) === 0 || /Training-Hub\/quiz|forms\.gle|docs\.google\.com\/forms/.test(v); }

function svTmRich_(text, label, url) {
  var b = SpreadsheetApp.newRichTextValue().setText(text), i = text.lastIndexOf(label);
  if (url && i >= 0) b.setLinkUrl(i, i + label.length, url);
  return b.build();
}

/* lúc tạo bài: ghi P = link làm bài, Q = "Bài KT MMH: chưa có lượt nộp · Mở kết quả" */
function svTmAttach_(sid, link, sheetUrl, title) {
  var f = svTmRow_(sid);
  if (!f) return 'Không tìm thấy buổi ' + sid + ' trong Training Master.';
  var pq = f.sh.getRange(f.row, SVTM.C.P, 1, 2).getValues()[0], notes = [];
  if (svTmMine_(pq[0])) f.sh.getRange(f.row, SVTM.C.P).setRichTextValue(svTmRich_(link, link, link));
  else notes.push('Cột P đã có nội dung khác — giữ nguyên');
  if (svTmMine_(pq[1])) f.sh.getRange(f.row, SVTM.C.Q).setRichTextValue(svTmRich_(SVTM.MARK + ' chưa có lượt nộp · Mở kết quả', 'Mở kết quả', sheetUrl));
  else notes.push('Cột Q đã có nội dung khác — giữ nguyên');
  return notes.length ? notes.join('; ') : '';
}

/* mỗi lượt nộp: Q = "Bài KT MMH: 8/10 người đạt (mốc 10/12) · TB 10,4/12 · 12 lượt · Mở kết quả" (lấy lượt CAO NHẤT mỗi người) */
function svTmUpdate_(cfg, ss) {
  if (!cfg.sid) return;
  try {
    var f = svTmRow_(cfg.sid); if (!f) return;
    var cur = f.sh.getRange(f.row, SVTM.C.Q).getValue();
    if (!svTmMine_(cur)) return;
    var sh = ss.getSheetByName(SVQ.TAB), last = sh.getLastRow(); if (last < 2) return;
    var nInfo = cfg.info.length, v = sh.getRange(2, 1, last - 1, nInfo + 4).getValues(), best = {};
    v.forEach(function (r) { var k = svTmNorm_(r[1]); if (!k) return; var sc = Number(r[1 + nInfo]) || 0; if (!(k in best) || sc > best[k]) best[k] = sc; });
    var names = Object.keys(best), passed = names.filter(function (k) { return best[k] >= cfg.pass; }).length;
    var avg = names.reduce(function (a, k) { return a + best[k]; }, 0) / (names.length || 1);
    var t = SVTM.MARK + ' ' + passed + '/' + names.length + ' người đạt (mốc ' + cfg.pass + '/' + cfg.total + ') · TB ' +
      String(Math.round(avg * 10) / 10).replace('.', ',') + '/' + cfg.total + ' · ' + v.length + ' lượt · Mở kết quả';
    f.sh.getRange(f.row, SVTM.C.Q).setRichTextValue(svTmRich_(t, 'Mở kết quả', ss.getUrl()));
  } catch (e) { console.warn('svTmUpdate_: ' + e.message); }
}
