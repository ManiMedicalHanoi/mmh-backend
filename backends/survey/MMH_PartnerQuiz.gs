/**
 * MMH Partner Quiz v1.1 (17/11/2026; v1.1: đạt từ 6/10 câu, câu góp ý sản phẩm KHÔNG tính điểm pqFeedback, top 3 mỗi phần nhận túi cói — người dùng yêu cầu)
 * v1.0 (16/11/2026) — bài kiểm tra kiểu Kahoot cho đối tác (NPP, đại lý) sau 2 bài đào tạo nha khoa.
 * Trang riêng của MMH (không dùng Kahoot vì Kahoot không bắt nhập thông tin + SĐT trước khi làm — người dùng yêu cầu):
 *   GitHub Pages Training-Hub/quiz/doi-tac/?b=<mã bài>   (mã QR ở cuối video trỏ tới đây)
 *   GitHub Pages Training-Hub/quiz/doi-tac/?b=<mã bài>&v=board   (màn xếp hạng chiếu lên TV khi đào tạo trực tiếp)
 * Lệnh công khai (fetch POST text/plain, không cookie, không khoá):
 *   pqMeta   {b}                                        ⇒ {title, sub, n, perQ, pass}
 *   pqStart  {b, info:{name, dealer, phone, agree}}     ⇒ {tk, n, perQ, q} — rút n câu rải đều chương, trộn thứ tự đáp án
 *   pqAnswer {tk, i, pick (0..3, -1 = hết giờ), ms}     ⇒ {right, correct, x, pts, score, next | fin}
 *   pqBoard  {b}                                        ⇒ {players, attempts, today, top[10]} (không trả SĐT)
 *   pqFeedback {tk, text}                               ⇒ {ok} — góp ý tự do về sản phẩm sau khi làm xong (không tính điểm), ghi cột "Góp ý sản phẩm"
 * Lệnh có khoá: pqDiag {key, b} ⇒ số lượt, link Sheet kết quả.
 * Đáp án đúng KHÔNG gửi xuống trước khi trả lời; máy chủ tự đo thời gian từng câu (CacheService, 2 giờ / lượt).
 * Điểm: đúng = 500 + tới 500 theo thời gian còn lại (tối đa 1.000 / câu); sai / hết giờ = 0. Đạt khi đúng ≥ pass.
 * Kết quả: Google Sheet "MMH · Bài kiểm tra đối tác · Kết quả" (thư mục SV.FOLDER, tab KET_QUA) + email tóm tắt mỗi lượt
 * về chủ thư mục (= tài khoản chạy máy chủ; đổi bằng Script Property PQ_NOTIFY, "-" = tắt email). Ngân hàng câu hỏi: MMH_PartnerQuizBank.gs.
 */
var PQ = { VER: '1.1', BOOK_PROP: 'PQ_BOOK', BOOK: 'MMH · Bài kiểm tra đối tác · Kết quả', TAB: 'KET_QUA', FB: 3500, TTL: 7200,
  PAGE: 'https://manimedicalhanoi.github.io/Training-Hub/quiz/doi-tac/',
  HEAD: ['Thời gian nộp', 'Mã bài', 'Bài', 'Họ tên', 'Đại lý / NPP', 'Số điện thoại', 'Số câu đúng', 'Số câu', 'Điểm', 'Đạt', 'Thời gian làm (giây)', 'Chi tiết', 'Mã lượt', 'Góp ý sản phẩm (không tính điểm)'] };

function pqRoute_(a, p) {
  if (a === 'pqMeta') return pqMeta_(p.b);
  if (a === 'pqStart') return pqStart_(p.b, p.info || {});
  if (a === 'pqAnswer') return pqAnswer_(p.tk, Number(p.i), Number(p.pick), Number(p.ms));
  if (a === 'pqBoard') return pqBoard_(p.b);
  if (a === 'pqFeedback') return pqFeedback_(p.tk, p.text);
  return { ok: false, error: 'ACTION' };
}

function pqQuiz_(b) { return (typeof PQ_BANK !== 'undefined' && PQ_BANK[String(b || '')]) || null; }

function pqMeta_(b) {
  var z = pqQuiz_(b);
  if (!z) return { ok: false, code: 'QUIZ', error: 'Link bài kiểm tra không đúng.' };
  return { ok: true, v: PQ.VER, b: b, title: z.title, sub: z.sub, n: z.n, perQ: z.perQ, pass: z.pass, prize: z.prize || '', bank: z.qs.length };
}

function pqShuffle_(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* rút n câu rải đều theo chương (vòng tròn qua các chương), rồi xếp theo chương cho mạch bài */
function pqDraw_(z) {
  var g = {};
  z.qs.forEach(function (q, i) { (g[q.c] = g[q.c] || []).push(i); });
  var keys = pqShuffle_(Object.keys(g)); keys.forEach(function (k) { pqShuffle_(g[k]); });
  var out = [], n = Math.min(z.n, z.qs.length);
  while (out.length < n) {
    var moved = false;
    for (var k = 0; k < keys.length && out.length < n; k++) { var l = g[keys[k]]; if (l.length) { out.push(l.pop()); moved = true; } }
    if (!moved) break;
  }
  return out.sort(function (x, y) { return (z.qs[x].c - z.qs[y].c) || (x - y); });
}

function pqPhone_(s) {
  var d = String(s || '').replace(/\D/g, '');
  if (/^84\d{9}$/.test(d)) d = '0' + d.slice(2);
  return /^0\d{9}$/.test(d) ? d : '';
}
function pqClean_(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 80); }

function pqSessGet_(tk) {
  if (!/^[a-z0-9]{16,40}$/.test(String(tk || ''))) return null;
  var s = CacheService.getScriptCache().get('pq_s_' + tk);
  return s ? JSON.parse(s) : null;
}
function pqSessPut_(s) { CacheService.getScriptCache().put('pq_s_' + s.tk, JSON.stringify(s), PQ.TTL); }

function pqPub_(z, s, i) {
  var q = z.qs[s.ids[i]], perm = s.perm[i];
  return { i: i, q: q.q, o: perm.map(function (k) { return q.o[k]; }) };
}

function pqStart_(b, info) {
  var z = pqQuiz_(b);
  if (!z) return { ok: false, code: 'QUIZ', error: 'Link bài kiểm tra không đúng.' };
  var name = pqClean_(info.name, 60), dealer = pqClean_(info.dealer, 80), phone = pqPhone_(info.phone);
  if (name.length < 2) return { ok: false, code: 'NAME', error: 'Vui lòng nhập họ tên.' };
  if (dealer.length < 2) return { ok: false, code: 'DEALER', error: 'Vui lòng nhập tên đại lý / nhà phân phối.' };
  if (!phone) return { ok: false, code: 'PHONE', error: 'Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).' };
  if (!info.agree) return { ok: false, code: 'AGREE', error: 'Vui lòng tick đồng ý trước khi làm bài.' };
  var ids = pqDraw_(z);
  var s = { tk: Utilities.getUuid().replace(/-/g, '').slice(0, 24), b: b, name: name, dealer: dealer, phone: phone,
    ids: ids, perm: ids.map(function () { return pqShuffle_([0, 1, 2, 3]); }), i: 0, at: Date.now(), t0: Date.now(),
    score: 0, right: 0, det: [], last: null, fin: null };
  pqSessPut_(s);
  return { ok: true, tk: s.tk, n: ids.length, perQ: z.perQ, pass: z.pass, title: z.title, q: pqPub_(z, s, 0) };
}

function pqAnswer_(tk, i, pick, cms) {
  var s = pqSessGet_(tk);
  if (!s) return { ok: false, code: 'EXPIRED', error: 'Lượt làm bài đã hết hạn. Vui lòng bắt đầu lại.' };
  var z = pqQuiz_(s.b);
  if (s.last && s.last.i === i) return s.last;                       // gửi lại cùng câu (mạng chập chờn) ⇒ trả kết quả cũ
  if (s.fin) return { ok: false, code: 'DONE', fin: s.fin };
  if (i !== s.i) return { ok: false, code: 'ORDER', i: s.i, q: pqPub_(z, s, s.i) };
  var now = Date.now(), limit = z.perQ * 1000, srv = Math.max(0, now - s.at);
  var ms = isFinite(cms) ? Math.min(Math.max(cms, Math.max(0, srv - 6000)), srv) : srv;
  var q = z.qs[s.ids[i]], perm = s.perm[i];
  var late = ms > limit + 1000, picked = (isFinite(pick) && pick >= 0 && pick < 4 && !late) ? perm[pick] : -1;
  var right = picked === q.a;
  var pts = right ? Math.round(1000 * (1 - Math.min(ms, limit) / limit / 2)) : 0;
  s.score += pts; if (right) s.right++;
  s.det.push((i + 1) + ':' + (picked < 0 ? '-' : 'ABCD'.charAt(picked)) + (right ? '✓' : '✗') + Math.round(ms / 100) / 10 + 's');
  var r = { ok: true, i: i, right: right, timeout: picked < 0, pick: isFinite(pick) ? pick : -1, correct: perm.indexOf(q.a), x: q.x,
    pts: pts, score: s.score, nRight: s.right, n: s.ids.length, wait: PQ.FB };
  s.i++;
  if (s.i < s.ids.length) { r.next = pqPub_(z, s, s.i); s.at = now + PQ.FB; }
  else { s.fin = pqFinish_(z, s); r.fin = s.fin; }
  s.last = r;
  pqSessPut_(s);
  return r;
}

/* ---------- Sheet kết quả + xếp hạng ---------- */
function pqBook_() {
  var P = PropertiesService.getScriptProperties(), id = P.getProperty(PQ.BOOK_PROP), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(PQ.BOOK);
    var sh = ss.getSheets()[0].setName(PQ.TAB);
    sh.appendRow(PQ.HEAD); sh.setFrozenRows(1); sh.getRange(1, 1, 1, PQ.HEAD.length).setFontWeight('bold');
    P.setProperty(PQ.BOOK_PROP, ss.getId());
    try { DriveApp.getFileById(ss.getId()).moveTo(svFolder_()); } catch (x) {}
  }
  return ss;
}
function pqSheet_() { var ss = pqBook_(); return ss.getSheetByName(PQ.TAB) || ss.getSheets()[0]; }

function pqRows_(b) {
  var c = CacheService.getScriptCache(), k = 'pq_rows_' + b, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  var sh = pqSheet_(), last = sh.getLastRow(), out = [];
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 11).getValues().forEach(function (r) {
      if (String(r[1]) !== b) return;
      out.push({ at: r[0] instanceof Date ? r[0].getTime() : 0, name: String(r[3]), dealer: String(r[4]), phone: String(r[5]).replace(/\D/g, ''),
        right: Number(r[6]) || 0, n: Number(r[7]) || 0, score: Number(r[8]) || 0, sec: Number(r[10]) || 0 });
    });
  }
  try { c.put(k, JSON.stringify(out), 300); } catch (x) {}
  return out;
}

/* lượt điểm cao nhất của mỗi SĐT; hoà điểm ⇒ làm nhanh hơn xếp trên */
function pqBest_(rows) {
  var m = {};
  rows.forEach(function (r) {
    var o = m[r.phone];
    if (!o || r.score > o.score || (r.score === o.score && r.sec < o.sec)) m[r.phone] = r;
  });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return (y.score - x.score) || (x.sec - y.sec) || (x.at - y.at); });
}

function pqTop_(best) { return best.slice(0, 10).map(function (r, i) { return { rank: i + 1, name: r.name, dealer: r.dealer, score: r.score, right: r.right, n: r.n }; }); }

function pqFinish_(z, s) {
  var now = new Date(), sec = Math.round((now.getTime() - s.t0) / 1000), passed = s.right >= z.pass;
  var row = [now, s.b, z.title, s.name, s.dealer, "'" + s.phone, s.right, s.ids.length, s.score, passed ? 'Đạt' : 'Chưa đạt', sec, s.det.join(' · '), s.tk];
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var rows;
  try {
    pqSheet_().appendRow(row);
    CacheService.getScriptCache().removeAll(['pq_rows_' + s.b, 'pq_board_' + s.b]);
    rows = pqRows_(s.b);
  } finally { lock.releaseLock(); }
  var best = pqBest_(rows), rank = 0;
  for (var i = 0; i < best.length; i++) if (best[i].phone === s.phone) { rank = i + 1; break; }
  var mine = rank ? best[rank - 1] : null;
  var fin = { score: s.score, nRight: s.right, n: s.ids.length, pass: z.pass, passed: passed, sec: sec, rank: rank, players: best.length,
    best: mine ? mine.score : s.score, top: pqTop_(best) };
  try { pqMail_(z, s, fin); } catch (x) {}
  return fin;
}

function pqNotify_() {
  var P = PropertiesService.getScriptProperties(), m = P.getProperty('PQ_NOTIFY');
  if (m) return m === '-' ? '' : m;
  try { m = svFolder_().getOwner().getEmail(); } catch (x) { m = ''; }
  if (m) P.setProperty('PQ_NOTIFY', m);
  return m;
}

function pqMail_(z, s, fin) {
  var to = pqNotify_(); if (!to) return;
  var url = ''; try { url = pqBook_().getUrl(); } catch (x) {}
  var body = ['Một lượt làm bài kiểm tra đối tác vừa hoàn thành.', '',
    'Bài: ' + z.title,
    'Họ tên: ' + s.name,
    'Đại lý / NPP: ' + s.dealer,
    'Số điện thoại: ' + s.phone,
    'Kết quả: ' + fin.nRight + '/' + fin.n + ' câu đúng · ' + fin.score + ' điểm · ' + (fin.passed ? 'Đạt' : 'Chưa đạt'),
    'Thời gian làm: ' + fin.sec + ' giây',
    'Hạng hiện tại: ' + fin.rank + ' / ' + fin.players + ' người', '',
    'File tổng hợp kết quả: ' + url,
    'Màn xếp hạng: ' + PQ.PAGE + '?b=' + encodeURIComponent(s.b) + '&v=board', '',
    'Email tự động từ hệ thống bài kiểm tra MMH.'].join('\n');
  mmhMail_({ to: to, subject: '[Bài kiểm tra đối tác] ' + s.name + ' · ' + s.dealer + ' · ' + fin.nRight + '/' + fin.n + ' · ' + (fin.passed ? 'Đạt' : 'Chưa đạt'), body: body });
}

function pqBoard_(b) {
  var z = pqQuiz_(b);
  if (!z) return { ok: false, code: 'QUIZ', error: 'Link bài kiểm tra không đúng.' };
  var c = CacheService.getScriptCache(), k = 'pq_board_' + b, hit = c.get(k);
  if (hit) return JSON.parse(hit);
  var rows = pqRows_(b), best = pqBest_(rows);
  var d0 = new Date(); d0.setHours(0, 0, 0, 0);
  var o = { ok: true, b: b, title: z.title, sub: z.sub, n: z.n, players: best.length, attempts: rows.length,
    today: rows.filter(function (r) { return r.at >= d0.getTime(); }).length,
    passed: best.filter(function (r) { return r.right >= z.pass; }).length, top: pqTop_(best), at: Date.now() };
  try { c.put(k, JSON.stringify(o), 6); } catch (x) {}
  return o;
}

/* góp ý tự do về sản phẩm (không tính điểm) — chỉ sau khi làm xong lượt; gửi lại ⇒ ghi đè */
function pqFeedback_(tk, text) {
  var s = pqSessGet_(tk);
  if (!s || !s.fin) return { ok: false, code: 'EXPIRED', error: 'Lượt làm bài đã hết hạn.' };
  var t = String(text == null ? '' : text).replace(/[\u0000-\u0009\u000b-\u001f<>]/g, ' ').trim().slice(0, 1500);
  if (t.length < 2) return { ok: false, code: 'EMPTY', error: 'Vui lòng nhập góp ý.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  var row = 0;
  try {
    var sh = pqSheet_(), col = PQ.HEAD.length, last = sh.getLastRow();
    if (!sh.getRange(1, col).getValue()) sh.getRange(1, col).setValue(PQ.HEAD[col - 1]).setFontWeight('bold');
    var from = Math.max(2, last - 1500);
    if (last >= from) {
      var ids = sh.getRange(from, 13, last - from + 1, 1).getValues();
      for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === s.tk) { row = from + i; break; }
    }
    if (row) sh.getRange(row, col).setValue("'" + t);
  } finally { lock.releaseLock(); }
  if (!row) return { ok: false, code: 'ROW', error: 'Chưa tìm thấy kết quả của lượt này.' };
  try {
    var to = pqNotify_(), z = pqQuiz_(s.b);
    if (to) mmhMail_({ to: to, subject: '[Góp ý sản phẩm] ' + s.name + ' · ' + s.dealer, body: ['Góp ý sau bài kiểm tra đối tác (không tính điểm).', '',
      'Bài: ' + (z ? z.title : s.b), 'Họ tên: ' + s.name, 'Đại lý / NPP: ' + s.dealer, 'Số điện thoại: ' + s.phone, '', 'Góp ý:', t, '',
      'Email tự động từ hệ thống bài kiểm tra MMH.'].join('\n') });
  } catch (x) {}
  return { ok: true };
}

function pqDiag_(b) {
  var out = { ok: true, v: PQ.VER, quizzes: Object.keys(PQ_BANK).map(function (k) { return { b: k, title: PQ_BANK[k].title, bank: PQ_BANK[k].qs.length, n: PQ_BANK[k].n }; }) };
  try { var ss = pqBook_(); out.sheet = ss.getUrl(); } catch (x) { out.sheetErr = x.message; }
  if (b) { var rows = pqRows_(b); out.attempts = rows.length; out.players = pqBest_(rows).length; }
  out.notify = pqNotify_() ? 'có' : 'tắt';
  return out;
}
