/**
 * ============================================================================
 *  ★ v3.51 (24/11/2026) — MMH Daily Podcast: BẠN BÈ · ADMIN XEM MỌI NGƯỜI · LINH VẬT TỰ TẠO · CHỦ ĐỀ QUAN TÂM · THÔNG BÁO BÀI MỚI
 * ----------------------------------------------------------------------------
 *  Người dùng yêu cầu: học viên gửi lời mời kết bạn cho nhau (mã / QR chia sẻ app), Admin (mmh.product) xem được mọi người,
 *  kết bạn với mọi người và tự tạo linh vật riêng; mỗi người chọn chủ đề quan tâm (ưu tiên hiển thị + gợi ý bài kiểm tra);
 *  app đã cài trên điện thoại "tinh tinh" khi có số podcast mới (Web Push, người dùng bấm cho phép).
 *
 *  Mã người dùng (id) = 10 ký tự đầu SHA-256 của email (dyId_) — không lộ email; link mời: <app>#/add/<id>.
 *  Sheet ẩn (Training Master):
 *    DAILY_FRIENDS  From · To · Status (p = chờ, a = bạn bè) · At · Done      (từ chối / huỷ / bỏ bạn ⇒ xoá dòng)
 *    DAILY_PUSH     Endpoint · P256dh · Auth · Email · At · Lang · Fail        (máy đã bật thông báo; không cần đăng nhập)
 *  Lời mời của Admin ⇒ thành bạn bè ngay (Admin là chủ cộng đồng học).
 *  Linh vật: AVATARS (13 nhân vật vẽ trong app, chars.js) — 'chip' (linh vật hệ thống) + mã tự tạo 'c:<màu>.<tai>.<phụ kiện>' chỉ Admin.
 *
 *  Thông báo bài mới: trigger hwWarm ⇒ dypTick_: data/index.json của MMH-Daily có số HÔM NAY chưa báo + có máy đăng ký
 *  ⇒ workflow_dispatch kho mmh-backend `daily-push.yml` (token WT_GH_TOKEN, như RH_WtKick) ⇒ tools/push/daily-push.mjs gọi dyPushList (key)
 *  ⇒ gửi Web Push bằng khoá VAPID tools/push/vapid.json ⇒ máy hết hạn ⇒ dyPushGone. Lượt cuối: Script Property DYP_LAST.
 *
 *  API (auth:0, tự kiểm phiên `tk`):
 *    dyFriends   {tk} ⇒ {id, friends:[…], inbox:[…], sent:[…]}
 *    dyFriendReq {tk, id} ⇒ {status: p|a}
 *    dyFriendAct {tk, id, op: accept|decline|cancel|remove}
 *    dyPeek      {id, tk?} ⇒ {user:{id, nick, avatar, lvl, league, streak, xp}, rel?: none|p-out|p-in|a|me}
 *    dyAll       {tk (Admin)} ⇒ {users:[… + email, lastSeen, rel]}
 *    dyPush      {sub (JSON PushSubscription), op: on|off, tk?, lang?} ⇒ {on}
 *    dyPushList  {key} · dyPushGone {key, eps} · dyPushDiag {key}   (key = 8 ký tự cuối Script ID)
 * ============================================================================
 */
var DYS = {
  FR: 'DAILY_FRIENDS', FH: ['From', 'To', 'Status', 'At', 'Done'],
  PU: 'DAILY_PUSH', PH: ['Endpoint', 'P256dh', 'Auth', 'Email', 'At', 'Lang', 'Fail'],
  WF: 'daily-push.yml', TOPICS: ['ai', 'health', 'eye', 'dental', 'surgery', 'tender', 'economy', 'politics', 'society', 'english']
};
function dyId_(email) { return rhSha(String(email || '').toLowerCase()).slice(0, 10); }
function dyTopics_(v) { return String(v || '').split(/[,\s]+/).filter(function (t) { return DYS.TOPICS.indexOf(t) >= 0; }).slice(0, 10).join(','); }
function dyAvOk_(av, email) {
  av = String(av || '');
  if (av === 'chip' || /^c:\d\.\d\.\d$/.test(av)) return dyIsAdmin_(String(email || '').toLowerCase());   // linh vật hệ thống + tự tạo: chỉ Admin
  return DYA.AVATARS.indexOf(av) >= 0;
}
function dysSheet_(name, head) { var sh = hubEnsureHeader(hubSheet(name, true), head); try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {} return sh; }
function dysKey_(p) { return hubNorm(p.key) === ScriptApp.getScriptId().slice(-8); }
function dysById_() {
  if (HUB_MEM.dyById) return HUB_MEM.dyById;
  var m = {}; dyRows_().forEach(function (o) { m[dyId_(o.Email)] = o; }); HUB_MEM.dyById = m; return m;
}
function dysFr_() {
  var sh = dysSheet_(DYS.FR, DYS.FH), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, DYS.FH.length).getValues().forEach(function (r, i) {
    if (hubNorm(r[0])) out.push({ row: i + 2, from: hubNorm(r[0]).toLowerCase(), to: hubNorm(r[1]).toLowerCase(), st: hubNorm(r[2]), at: r[3] instanceof Date ? r[3].toISOString() : hubNorm(r[3]) });
  });
  return { sh: sh, rows: out };
}
function dysCard_(o, weekXp) {
  var pu = dyPublic_(o);
  return { id: dyId_(o.Email), nick: pu.nick, avatar: pu.avatar, lvl: pu.lvl, league: pu.league, streak: pu.streak, xp: pu.xp, studiedToday: pu.studiedToday, week: weekXp == null ? undefined : weekXp };
}
function dysRel_(F, me, other) {
  if (me === other) return 'me';
  for (var i = 0; i < F.length; i++) {
    var f = F[i];
    if (f.from === me && f.to === other) return f.st === 'a' ? 'a' : 'p-out';
    if (f.from === other && f.to === me) return f.st === 'a' ? 'a' : 'p-in';
  }
  return 'none';
}

function apiDyFriends(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var me = a.o.Email, F = dysFr_().rows, by = {}; dyRows_().forEach(function (o) { by[o.Email] = o; });
  var mon = dyMonday_(dyYmd_()), wk = {}; dyLog_(mon).forEach(function (x) { wk[x.email] = (wk[x.email] || 0) + x.xp; });
  var friends = [], inbox = [], sent = [];
  F.forEach(function (f) {
    if (f.from !== me && f.to !== me) return;
    var other = f.from === me ? f.to : f.from, o = by[other]; if (!o) return;
    var c = dysCard_(o, wk[other] || 0); c.at = f.at;
    if (f.st === 'a') friends.push(c); else if (f.to === me) inbox.push(c); else sent.push(c);
  });
  friends.sort(function (x, y) { return y.week - x.week || y.xp - x.xp; });
  return { ok: true, id: dyId_(me), me: dysCard_(a.o, wk[me] || 0), friends: friends, inbox: inbox, sent: sent };
}
function apiDyFriendReq(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var tgt = dysById_()[hubNorm(p.id)]; if (!tgt) return { ok: false, code: 'NOUSER', error: 'Không tìm thấy người này.' };
  var me = a.o.Email, other = tgt.Email;
  if (me === other) return { ok: false, error: 'Đây là mã của chính bạn.' };
  var st = hubWithLock(function () {
    var D = dysFr_(), rel = dysRel_(D.rows, me, other);
    if (rel === 'a' || rel === 'p-out') return rel === 'a' ? 'a' : 'p';
    if (rel === 'p-in') { var r = D.rows.filter(function (f) { return f.from === other && f.to === me; })[0]; D.sh.getRange(r.row, 3, 1, 3).setValues([['a', r.at, new Date()]]); return 'a'; }
    var auto = dyIsAdmin_(me);
    D.sh.appendRow([me, other, auto ? 'a' : 'p', new Date(), auto ? new Date() : '']);
    return auto ? 'a' : 'p';
  });
  dyLogAdd_(me, st === 'a' ? 'friend' : 'friendreq', '', '', 0, { to: dyId_(other) }, '');
  return { ok: true, status: st, user: dysCard_(tgt) };
}
function apiDyFriendAct(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var tgt = dysById_()[hubNorm(p.id)]; if (!tgt) return { ok: false, code: 'NOUSER', error: 'Không tìm thấy người này.' };
  var me = a.o.Email, other = tgt.Email, op = hubNorm(p.op);
  var res = hubWithLock(function () {
    var D = dysFr_(), hit = D.rows.filter(function (f) { return (f.from === me && f.to === other) || (f.from === other && f.to === me); })[0];
    if (!hit) return 'none';
    if (op === 'accept' && hit.st === 'p' && hit.to === me) { D.sh.getRange(hit.row, 3, 1, 3).setValues([['a', hit.at, new Date()]]); return 'a'; }
    var okDel = (op === 'decline' && hit.st === 'p' && hit.to === me) || (op === 'cancel' && hit.st === 'p' && hit.from === me) || (op === 'remove' && hit.st === 'a');
    if (okDel) { D.sh.deleteRow(hit.row); return 'none'; }
    return hit.st === 'a' ? 'a' : (hit.from === me ? 'p-out' : 'p-in');
  });
  return { ok: true, rel: res };
}
function apiDyPeek(p) {
  var o = dysById_()[hubNorm(p.id)]; if (!o) return { ok: false, code: 'NOUSER', error: 'Mã mời không còn dùng được.' };
  var out = { ok: true, user: dysCard_(o) };
  if (p.tk) { var a = dyAuth_(p.tk); if (!a.err) out.rel = dysRel_(dysFr_().rows, a.o.Email, o.Email); }
  return out;
}
function apiDyAll(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  if (!dyIsAdmin_(a.o.Email)) return { ok: false, code: 'ADMIN', error: 'Chỉ Admin xem được danh sách mọi người.' };
  var F = dysFr_().rows, me = a.o.Email, mon = dyMonday_(dyYmd_()), wk = {};
  dyLog_(mon).forEach(function (x) { wk[x.email] = (wk[x.email] || 0) + x.xp; });
  var users = dyRows_().map(function (o) {
    var c = dysCard_(o, wk[o.Email] || 0), pu = dyPublic_(o);
    c.email = o.Email; c.lastSeen = o.LastSeen; c.created = o.Created; c.company = pu.company; c.lessons = pu.lessons; c.logins = Number(o.Logins) || 0; c.hasPw = !!o.Hash;
    c.topics = pu.topics; c.notify = pu.notify; c.rel = dysRel_(F, me, o.Email); return c;
  }).sort(function (x, y) { return String(y.lastSeen) < String(x.lastSeen) ? -1 : 1; });
  return { ok: true, users: users, n: users.length, push: Math.max(0, dysSheet_(DYS.PU, DYS.PH).getLastRow() - 1) };
}

/* ── thông báo bài mới (Web Push) ── */
function apiDyPush(p) {
  var sub = null; try { sub = JSON.parse(p.sub || 'null'); } catch (e) {}
  var ep = sub && String(sub.endpoint || ''); if (!/^https:\/\//.test(ep) || ep.length > 900) return { ok: false, error: 'Đăng ký thông báo không hợp lệ.' };
  var email = ''; if (p.tk) { var a = dyAuth_(p.tk); if (!a.err) email = a.o.Email; }
  var on = hubNorm(p.op) !== 'off';
  hubWithLock(function () {
    var sh = dysSheet_(DYS.PU, DYS.PH), last = sh.getLastRow(), row = 0;
    if (last >= 2) { var V = sh.getRange(2, 1, last - 1, 1).getValues(); for (var i = 0; i < V.length; i++) if (String(V[i][0]) === ep) { row = i + 2; break; } }
    if (!on) { if (row) sh.deleteRow(row); return; }
    var vals = [ep, String(sub.keys && sub.keys.p256dh || ''), String(sub.keys && sub.keys.auth || ''), email, new Date(), p.lang === 'en' ? 'en' : 'vi', 0];
    if (row) sh.getRange(row, 1, 1, vals.length).setValues([vals]); else sh.appendRow(vals);
  });
  return { ok: true, on: on };
}
function dysSubs_() {
  var sh = dysSheet_(DYS.PU, DYS.PH), last = sh.getLastRow(); if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, DYS.PH.length).getValues().filter(function (r) { return r[0] && r[1] && r[2]; })
    .map(function (r) { return { ep: String(r[0]), p256dh: String(r[1]), auth: String(r[2]), lang: String(r[5] || 'vi') }; });
}
function apiDyPushList(p) { if (!dysKey_(p)) return { ok: false, code: 'KEY' }; return { ok: true, subs: dysSubs_() }; }
function apiDyPushGone(p) {
  if (!dysKey_(p)) return { ok: false, code: 'KEY' };
  var eps = []; try { eps = JSON.parse(p.eps || '[]'); } catch (e) {}
  var n = 0;
  hubWithLock(function () {
    var sh = dysSheet_(DYS.PU, DYS.PH), last = sh.getLastRow(); if (last < 2) return;
    var V = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = V.length - 1; i >= 0; i--) if (eps.indexOf(String(V[i][0])) >= 0) { sh.deleteRow(i + 2); n++; }
  });
  return { ok: true, removed: n };
}
function apiDyPushDiag(p) {
  if (!dysKey_(p)) return { ok: false, code: 'KEY' };
  var P = PropertiesService.getScriptProperties(), out = { ok: true, subs: dysSubs_().length, last: P.getProperty('DYP_LAST'), sent: P.getProperty('DYP_SENT') };
  if (hubNorm(p.op) === 'run') { P.deleteProperty('DYP_SENT'); out.run = dypTick_(); }
  return out;
}
function dypTick_() {
  var P = PropertiesService.getScriptProperties(), now = new Date(), today = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var hm = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'HH:mm'), out = { at: Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') };
  if (P.getProperty('DYP_SENT') === today) return { skip: 'đã báo số hôm nay' };
  if (hm < '05:30' || hm > '21:00') return { skip: 'ngoài giờ' };
  try {
    var r = UrlFetchApp.fetch(DK.INDEX + '?t=' + now.getTime(), { muteHttpExceptions: true }), j = null;
    try { j = JSON.parse(r.getContentText()); } catch (e) {}
    var ed = j && j.editions && j.editions[0];
    out.last = ed ? ed.date : '?';
    if (!ed || ed.date !== today) out.skip = 'chưa có số hôm nay';
    else if (!dysSubs_().length) { out.skip = 'chưa máy nào bật thông báo'; P.setProperty('DYP_SENT', today); }
    else if (!wtkTok_()) out.skip = 'chưa có token GitHub (WT_GH_TOKEN)';
    else {
      var d = wtkGh_('post', '/actions/workflows/' + DYS.WF + '/dispatches', { ref: 'main', inputs: { date: today } });
      out.kick = d.code;
      if (d.code === 204) P.setProperty('DYP_SENT', today); else out.skip = 'không gọi được workflow (' + d.code + ')';
    }
  } catch (e) { out.skip = 'lỗi: ' + String(e.message || e).slice(0, 160); }
  P.setProperty('DYP_LAST', JSON.stringify(out));
  return out;
}
