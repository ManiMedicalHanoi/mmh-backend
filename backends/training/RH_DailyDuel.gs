/**
 * ============================================================================
 *  ★ v3.52 (24/11/2026) — MMH Daily Podcast: XEM LỘ TRÌNH CỦA BẠN BÈ · THÁCH ĐẤU · CỔ VŨ
 * ----------------------------------------------------------------------------
 *  Người dùng: "kết bạn rồi nhìn thấy được lộ trình học tập của nhau, gửi điểm hay thách đố qua lại để làm test, có tính tương tác".
 *  Chỉ giữa BẠN BÈ (DAILY_FRIENDS, Status a); Admin (mmh.product) xem / gửi được cho mọi người.
 *
 *  Sheet ẩn DAILY_DUEL (Training Master): Id · From · To · Kind · Date · Show · FromRight · FromN · ToRight · ToN · Status · At · DoneAt · Msg
 *    Kind  quiz  = thách làm bài kiểm tra nghe của 1 số podcast (cùng bộ câu hỏi), người gửi đã làm xong ⇒ kèm điểm của mình
 *          cheer = lời cổ vũ ngắn (không điểm)
 *    Status open (chờ) · done (người nhận làm xong) · seen (đã xem lời cổ vũ) · no (từ chối)
 *  Thưởng XP khi người nhận làm xong (ghi DAILY_LOG kind 'duel', không tính vào giới hạn 400 XP / ngày):
 *    người nhận thắng 15 · hoà 8 mỗi người · người gửi thắng 10.
 *  Email ngắn tới người nhận nếu họ bật nhắc học (Notify) — tối đa 1 thư / cặp / ngày.
 *
 *  API (auth:0, tự kiểm phiên tk):
 *    dyPath     {tk, id}  ⇒ {user, me, week:[{d,xp}] 14 ngày, eps:[{date, show, kinds, xp}] 21 ngày, recent:[…20], stats, wk:{me, them}}
 *    dyDuel     {tk, id, kind, date?, show?, right?, n?, msg?, rid?} ⇒ {duel}
 *    dyDuels    {tk} ⇒ {inbox:[…], sent:[…]} (30 ngày)
 *    dyDuelDone {tk, did, right, n} ⇒ {duel, result: win|tie|lose, bonus}
 *    dyDuelAns  {tk, did, op: seen|decline}
 * ============================================================================
 */
var DYD = {
  SH: 'DAILY_DUEL', H: ['Id', 'From', 'To', 'Kind', 'Date', 'Show', 'FromRight', 'FromN', 'ToRight', 'ToN', 'Status', 'At', 'DoneAt', 'Msg'],
  DAYS: 30, WIN: 15, TIE: 8, SENDER_WIN: 10, MSG_MAX: 140, OPEN_MAX: 20
};
function dydSheet_() { return dysSheet_(DYD.SH, DYD.H); }
function dydRows_() {
  var sh = dydSheet_(), last = sh.getLastRow(), out = [], fromN = dyDayN_(dyYmd_()) - DYD.DAYS;
  if (last < 2) return { sh: sh, rows: out };
  sh.getRange(2, 1, last - 1, DYD.H.length).getValues().forEach(function (r, i) {
    var at = r[11] instanceof Date ? r[11] : new Date(r[11]); if (!hubNorm(r[0]) || isNaN(at) || dyDayN_(dyYmd_(at)) < fromN) return;
    out.push({ row: i + 2, id: hubNorm(r[0]), from: hubNorm(r[1]).toLowerCase(), to: hubNorm(r[2]).toLowerCase(), kind: hubNorm(r[3]),
      date: r[4] instanceof Date ? Utilities.formatDate(r[4], dyTz_(), 'yyyy-MM-dd') : String(r[4]).replace(/^'/, '').slice(0, 10), show: hubNorm(r[5]),
      fromRight: Number(r[6]) || 0, fromN: Number(r[7]) || 0, toRight: r[8] === '' ? null : Number(r[8]) || 0, toN: Number(r[9]) || 0,
      status: hubNorm(r[10]) || 'open', at: at.toISOString(), doneAt: r[12] instanceof Date ? r[12].toISOString() : hubNorm(r[12]), msg: hubNorm(r[13]) });
  });
  return { sh: sh, rows: out };
}
function dydCan_(me, other) {   // bạn bè, hoặc 1 trong 2 là Admin
  if (dyIsAdmin_(me) || dyIsAdmin_(other)) return true;
  return dysRel_(dysFr_().rows, me, other) === 'a';
}
function dydOut_(d, me, by) {
  var other = d.from === me ? d.to : d.from, o = by[other];
  var x = { id: d.id, kind: d.kind, date: d.date, show: d.show, fromRight: d.fromRight, fromN: d.fromN, toRight: d.toRight, toN: d.toN, status: d.status, at: d.at, doneAt: d.doneAt, msg: d.msg, mine: d.from === me };
  if (o) { var pu = dyPublic_(o); x.who = { id: dyId_(o.Email), nick: pu.nick, avatar: pu.avatar, lvl: pu.lvl, streak: pu.streak, studiedToday: pu.studiedToday }; }
  if (d.status === 'done' && d.kind === 'quiz') {
    var a = d.fromN ? d.fromRight / d.fromN : 0, b = d.toN ? d.toRight / d.toN : 0;
    x.result = Math.abs(a - b) < 1e-9 ? 'tie' : (b > a ? 'to' : 'from');   // ai thắng: người nhận (to) / người gửi (from)
  }
  return x;
}
function dydBonus_(email, xp, det) {   // thưởng XP thách đấu: cộng thẳng vào XP, ghi nhật ký 'duel'
  if (!(xp > 0)) return;
  delete HUB_MEM.dyRows; var o = dyFind_(email); if (!o) return;
  o.XP = (Number(o.XP) || 0) + xp; dyWrite_(o);
  dyLogAdd_(o.Email, 'duel', det && det.date || '', det && det.show || '', xp, det || {}, '');
}
function dydMail_(from, to, d) {
  try {
    if (!(Number(to.Notify) || 0)) return;
    var c = CacheService.getScriptCache(), k = 'dydm_' + dyId_(from.Email) + dyId_(to.Email) + dyYmd_();
    if (c.get(k)) return; c.put(k, '1', 21600);
    var quiz = d.kind === 'quiz';
    var title = quiz ? from.Nick + ' thách bạn một bài kiểm tra podcast!' : from.Nick + ' gửi lời cổ vũ tới bạn';
    var inner = '<div style="text-align:center"><img src="' + DYA.IMG + 'chip-' + (quiz ? 'cheer' : 'wave') + '.png" width="130" height="130" alt="Chíp" style="display:inline-block"></div>' +
      '<p style="text-align:center;margin:10px 0 14px;color:#33475B">' + (quiz
        ? hubEsc(from.Nick) + ' vừa làm bài kiểm tra nghe số podcast ngày ' + hubEsc(d.date.split('-').reverse().join('/')) + ' và đúng <b>' + d.fromRight + '/' + d.fromN + '</b> câu. Làm cùng bài đó để xem ai hơn — thắng được thêm <b>' + DYD.WIN + ' XP</b>.'
        : '“' + hubEsc(d.msg) + '”') + '</p>' +
      '<div style="text-align:center;margin:0 0 10px">' + hubMailButton(DYA.APP + '#/rank/friends', quiz ? 'Nhận thách đấu' : 'Mở app') + '</div>';
    mmhMail_({ to: to.Email, subject: title, htmlBody: hubMailShell('MMH DAILY PODCAST', hubEsc(title), inner, 'Chíp — trợ lý học của MMH Daily Podcast. Tắt thư trong app ▸ Tôi ▸ Nhắc học. ' + DYA.APP), name: 'Chíp · MMH Daily Podcast' });
  } catch (e) { hubLog('WARN', 'dyDuel', 'Không gửi được thư thách đấu', e.message); }
}

/* ── lộ trình của 1 người bạn ── */
function apiDyPath(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var o = dysById_()[hubNorm(p.id)]; if (!o) return { ok: false, code: 'NOUSER', error: 'Không tìm thấy người này.' };
  var me = a.o.Email;
  if (o.Email !== me && !dydCan_(me, o.Email)) return { ok: false, code: 'FRIEND', error: 'Chỉ xem được lộ trình của bạn bè.' };
  var today = dyYmd_(), tN = dyDayN_(today), from = Utilities.formatDate(new Date((tN - 21) * 864e5), 'UTC', 'yyyy-MM-dd');
  var log = dyLog_(from), them = log.filter(function (x) { return x.email === o.Email; });
  var week = [];
  for (var i = 13; i >= 0; i--) { var dd = Utilities.formatDate(new Date((tN - i) * 864e5), 'UTC', 'yyyy-MM-dd'), s = 0; them.forEach(function (x) { if (x.day === dd) s += x.xp; }); week.push({ d: dd, xp: s }); }
  var eps = {}; them.forEach(function (x) { if (!x.date || !(x.xp > 0) || x.kind === 'duel') return; var e = eps[x.date] || (eps[x.date] = { date: x.date, show: x.show, kinds: {}, xp: 0 }); e.kinds[x.kind] = 1; e.xp += x.xp; if (!e.show && x.show) e.show = x.show; });
  var mon = dyMonday_(today), wk = { me: 0, them: 0 };
  log.forEach(function (x) { if (dyDayN_(x.day) >= dyDayN_(mon)) { if (x.email === me) wk.me += x.xp; if (x.email === o.Email) wk.them += x.xp; } });
  var pu = dyPublic_(o);
  return { ok: true, user: dysCard_(o, wk.them), me: o.Email === me,
    stats: { lessons: pu.lessons, right: pu.right, asked: pu.asked, words: pu.words, best: pu.best, created: pu.created },
    week: week, eps: Object.keys(eps).sort().reverse().slice(0, 21).map(function (k) { var e = eps[k]; return { date: e.date, show: e.show, kinds: Object.keys(e.kinds), xp: e.xp }; }),
    recent: them.filter(function (x) { return x.xp > 0; }).slice(0, 20).map(function (x) { return { at: x.at, kind: x.kind, date: x.date, show: x.show, xp: x.xp }; }),
    wk: wk };
}

/* ── gửi thách đấu / lời cổ vũ ── */
function apiDyDuel(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var o = dysById_()[hubNorm(p.id)]; if (!o) return { ok: false, code: 'NOUSER', error: 'Không tìm thấy người này.' };
  var me = a.o.Email; if (o.Email === me) return { ok: false, error: 'Không tự thách đấu chính mình được.' };
  if (!dydCan_(me, o.Email)) return { ok: false, code: 'FRIEND', error: 'Chỉ gửi được cho bạn bè.' };
  var kind = hubNorm(p.kind) === 'cheer' ? 'cheer' : 'quiz';
  var date = hubNorm(p.date).slice(0, 10); if (kind === 'quiz' && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Chưa chọn số podcast.' };
  var n = Math.max(0, Math.min(30, Math.round(Number(p.n) || 0))), right = Math.max(0, Math.min(n, Math.round(Number(p.right) || 0)));
  if (kind === 'quiz' && !n) return { ok: false, error: 'Hãy làm bài kiểm tra trước khi thách đấu.' };
  var msg = dyClean_(p.msg, DYD.MSG_MAX); if (kind === 'cheer' && !msg) msg = 'Cố lên! Học cùng nhau nhé.';
  var rid = hubNorm(p.rid).slice(0, 40);
  var res = hubWithLock(function () {
    var D = dydRows_();
    if (rid) { var dup = D.rows.filter(function (x) { return x.id === rid; })[0]; if (dup) return dup; }
    var open = D.rows.filter(function (x) { return x.from === me && x.to === o.Email && x.status === 'open'; });
    if (open.length >= DYD.OPEN_MAX) return { err: 'Bạn đã gửi nhiều lời mời chưa được trả lời.' };
    if (kind === 'quiz') { var same = open.filter(function (x) { return x.kind === 'quiz' && x.date === date; })[0]; if (same) return { err: 'Bạn đã thách bài này rồi, chờ bạn ấy làm nhé.' }; }
    var d = { id: rid || ('D' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), from: me, to: o.Email, kind: kind, date: date, show: dyClean_(p.show, 30),
      fromRight: right, fromN: n, toRight: null, toN: 0, status: 'open', at: new Date().toISOString(), doneAt: '', msg: msg };
    D.sh.appendRow([d.id, me, o.Email, kind, date ? "'" + date : '', d.show, kind === 'quiz' ? right : '', kind === 'quiz' ? n : '', '', '', 'open', new Date(), '', msg]);
    return d;
  });
  if (res.err) return { ok: false, error: res.err };
  dydMail_(a.o, o, res);
  dyLogAdd_(me, kind === 'quiz' ? 'duelsent' : 'cheer', date, res.show, 0, { to: dyId_(o.Email) }, '');
  var by = {}; by[o.Email] = o;
  return { ok: true, duel: dydOut_(res, me, by) };
}
function apiDyDuels(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var me = a.o.Email, by = {}; dyRows_().forEach(function (o) { by[o.Email] = o; });
  var R = dydRows_().rows.filter(function (x) { return x.from === me || x.to === me; }).sort(function (x, y) { return x.at < y.at ? 1 : -1; });
  return { ok: true,
    inbox: R.filter(function (x) { return x.to === me; }).slice(0, 40).map(function (x) { return dydOut_(x, me, by); }),
    sent: R.filter(function (x) { return x.from === me; }).slice(0, 40).map(function (x) { return dydOut_(x, me, by); }) };
}
function apiDyDuelDone(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var me = a.o.Email, did = hubNorm(p.did);
  var n = Math.max(1, Math.min(30, Math.round(Number(p.n) || 0))), right = Math.max(0, Math.min(n, Math.round(Number(p.right) || 0)));
  var res = hubWithLock(function () {
    var D = dydRows_(), d = D.rows.filter(function (x) { return x.id === did; })[0];
    if (!d || d.to !== me || d.kind !== 'quiz') return { err: 'Không tìm thấy lời thách đấu này.' };
    if (d.status === 'done') return { d: d, again: true };
    d.toRight = right; d.toN = n; d.status = 'done'; d.doneAt = new Date().toISOString();
    D.sh.getRange(d.row, 9, 1, 5).setValues([[right, n, 'done', new Date(d.at), new Date()]]);
    var fa = d.fromN ? d.fromRight / d.fromN : 0, fb = right / n, det = { date: d.date, show: d.show, duel: d.id };
    if (Math.abs(fa - fb) < 1e-9) { dydBonus_(me, DYD.TIE, det); dydBonus_(d.from, DYD.TIE, det); d.bonus = DYD.TIE; d.res = 'tie'; }
    else if (fb > fa) { dydBonus_(me, DYD.WIN, det); d.bonus = DYD.WIN; d.res = 'win'; }
    else { dydBonus_(d.from, DYD.SENDER_WIN, det); d.bonus = 0; d.res = 'lose'; }
    try { var c = CacheService.getScriptCache(); c.put('dygen', String(Date.now()), 21600); ['week', 'month', 'league'].forEach(function (k) { c.remove('dyb_' + k); }); } catch (e) {}
    return { d: d };
  });
  if (res.err) return { ok: false, error: res.err };
  var by = {}; dyRows_().forEach(function (o) { by[o.Email] = o; });
  var d = res.d, fa = d.fromN ? d.fromRight / d.fromN : 0, fb = d.toN ? d.toRight / d.toN : 0;
  var result = Math.abs(fa - fb) < 1e-9 ? 'tie' : fb > fa ? 'win' : 'lose';
  return { ok: true, duel: dydOut_(d, me, by), result: result, bonus: res.again ? 0 : (d.bonus || 0), me: dyPublic_(by[me] || a.o) };
}
function apiDyDuelAns(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var me = a.o.Email, did = hubNorm(p.did), op = hubNorm(p.op) === 'decline' ? 'no' : 'seen';
  var ok = hubWithLock(function () {
    var D = dydRows_(), d = D.rows.filter(function (x) { return x.id === did; })[0];
    if (!d || d.to !== me || d.status !== 'open') return false;
    D.sh.getRange(d.row, 11).setValue(op); return true;
  });
  return { ok: true, changed: ok };
}
