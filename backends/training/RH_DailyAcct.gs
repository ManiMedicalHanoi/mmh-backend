/**
 * ============================================================================
 *  ★ v3.50 (24/11/2026) — TÀI KHOẢN HỌC VIÊN app MMH Daily Podcast (kiểu Duolingo, người dùng yêu cầu)
 * ----------------------------------------------------------------------------
 *  Ai cũng tạo được tài khoản bằng EMAIL BẤT KỲ (app công khai trên GitHub Pages):
 *    lần đầu ⇒ mã kích hoạt 6 số qua email ⇒ đặt mật khẩu + biệt danh + nhân vật ⇒ dùng ngay;
 *    lần sau ⇒ email + mật khẩu (phiên 365 ngày, tự gia hạn); quên ⇒ mã qua email ⇒ đặt lại mật khẩu.
 *  Chống lạm dụng email (hạn mức gửi của tài khoản chạy script dùng chung mọi hệ thống): 1 mã / 60 giây / email,
 *  ≤ 6 mã / giờ / email, ≤ DYA.DAY_MAX mã / ngày cả hệ thống. Sai mã 5 lần ⇒ mã hết hiệu lực; sai mật khẩu 6 lần ⇒ khoá 15 phút.
 *  Phiên đăng nhập công ty cũ (`mmh_tk`, RH_Users) vẫn dùng được: tự tạo tài khoản học viên theo email công ty.
 *
 *  Sheet (Training Master, ẩn):
 *    DAILY_USERS  — 1 dòng / người: hồ sơ + chỉ số tổng hợp (XP, chuỗi ngày, hạng, giải đấu…), băm mật khẩu (HMAC lặp, khoá rhSecret)
 *    DAILY_LOG    — nhật ký từng hoạt động: At · Email · Kind · Date (số podcast) · Show · XP · Detail (JSON) · Rid
 *  XP (máy chủ tự tính, app không tự cộng): listen 10 · quiz đúng×2+5 · vocab đúng×2+3 · read đúng×2+3 · dictation đúng×2+3 · speak %/10 · lesson +10 ·
 *  coach 5–15; lần đầu mỗi (số podcast, loại) = đủ XP, làm lại = 20% (≥ 2); tối đa 400 XP / ngày.
 *  Chuỗi ngày (streak) = số ngày liên tiếp (giờ VN) có XP; 1 "đóng băng" (freeze) tự có sau mỗi 7 ngày liên tục (tối đa 2), tự dùng khi lỡ 1 ngày.
 *  Giải đấu tuần (thứ Hai → CN): Đồng · Bạc · Vàng · Ngọc · Kim cương — sang tuần mới: XP tuần trước ≥ ngưỡng lên hạng ⇒ +1, < 30 ⇒ −1.
 *  Nhắc học (dyTick_ trong hwWarm): 19:30–21:30 giờ VN, 1 email / người / ngày khi chưa học hôm nay (người bật nhắc, đã học trong 30 ngày;
 *  bỏ học > 7 ngày ⇒ chỉ nhắc thứ Hai), ≤ DYA.MAIL_MAX email / ngày; ảnh Chíp ở GitHub Pages của MMH-Daily.
 *  Tạo số mới (dailyRun / dailySetup) CHỈ tài khoản mmh.product (DYA.ADMIN) — RH_DailyRun.gs dùng dyRhCheck_.
 *
 *  API (auth:0, POST form khi có mật khẩu):
 *    dyHello {email} ⇒ {exists, hasPw}
 *    dyCode {email, why:new|reset} ⇒ gửi mã
 *    dyVerify {email, code, pw, nick?, avatar?} ⇒ {token, me}          (kích hoạt lần đầu / đặt lại mật khẩu)
 *    dyLogin {email, pw} ⇒ {token, me}
 *    dyMe {tk, log?} ⇒ {me, week:[7 ngày XP], log:[…], token?}            (token mới khi phiên còn < 300 ngày)
 *    dyProfile {tk, nick, avatar, theme, goal, notify, lang}
 *    dyPw {tk, old, pw}
 *    dyEvent {tk, kind, date, show, right, n, pct, words, sec, rid} ⇒ {xp, me, goalHit, levelUp}
 *    dyBoard {tk, period=week|month|league} ⇒ {rows:[{nick, avatar, xp, streak, league, lvl, me}], recent:[…]}
 * ============================================================================
 */
var DYA = {
  USERS: 'DAILY_USERS', LOG: 'DAILY_LOG', TZ: 'Asia/Ho_Chi_Minh',
  H: ['Email', 'Nick', 'Avatar', 'Theme', 'Goal', 'Notify', 'Lang', 'Created', 'LastSeen', 'Logins', 'Salt', 'Hash', 'Session',
      'XP', 'Streak', 'Best', 'LastDay', 'Freeze', 'League', 'LeagueWk', 'Lessons', 'Right', 'Asked', 'Words', 'Mailed', 'Source'],
  LH: ['At', 'Email', 'Kind', 'Date', 'Show', 'XP', 'Detail', 'Rid'],
  ADMIN: ['mmh.product'],
  TOKEN_DAYS: 365, OTP_SEC: 900, GAP_MS: 60000, HOUR_MAX: 6, DAY_MAX: 200, ITER: 800,
  PW_FAIL: 6, DAY_XP: 400, MAIL_MAX: 120,
  LEAGUES: ['Đồng', 'Bạc', 'Vàng', 'Ngọc', 'Kim cương'], PROMO: [120, 200, 300, 450, 1e9],
  AVATARS: ['chip', 'mochi', 'tofu', 'capy', 'pip', 'kiko', 'bao', 'rang', 'iris', 'bit', 'so', 'nhim', 'hana'],
  GOALS: [20, 50, 100, 150],
  APP: 'https://manimedicalhanoi.github.io/MMH-Daily/', IMG: 'https://manimedicalhanoi.github.io/MMH-Daily/media/chars/'
};

/* ── tiện ích ── */
function dyYmd_(d) { return Utilities.formatDate(d || new Date(), DYA.TZ, 'yyyy-MM-dd'); }
function dyDayN_(ymd) { return Math.floor(new Date(ymd + 'T00:00:00Z').getTime() / 864e5); }
function dyMonday_(ymd) { var n = dyDayN_(ymd), dow = (n + 3) % 7; return Utilities.formatDate(new Date((n - dow) * 864e5), 'UTC', 'yyyy-MM-dd'); }
function dyEmail_(v) { var e = hubNorm(v).toLowerCase().replace(/\s+/g, ''); return /^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)+$/.test(e) && e.length <= 120 ? e : ''; }
function dyCompany_(email) { var d = email.split('@')[1]; return HUB.DOMAINS.indexOf(d) >= 0; }
function dyIsAdmin_(email) { return dyCompany_(email) && DYA.ADMIN.indexOf(email.split('@')[0]) >= 0; }
function dyKey_(email) { return dyCompany_(email) ? email.split('@')[0] + '@' + HUB.SEND_DOMAIN : email; }   // 2 miền công ty = 1 tài khoản
function dyClean_(s, n) { return hubNorm(s).replace(/[<>\u0000-\u001f]/g, '').slice(0, n); }
function dyLevel_(xp) { var l = 1; while (xp >= 30 * l * (l + 1)) l++; return l; }           // 60 · 180 · 360 · 600 · 900 …
function dyLvlFloor_(l) { return 30 * (l - 1) * l; }

function dyUsersSheet_() {
  var sh = hubEnsureHeader(hubSheet(DYA.USERS, true), DYA.H);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
  return sh;
}
function dyLogSheet_() {
  var sh = hubEnsureHeader(hubSheet(DYA.LOG, true), DYA.LH);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
  return sh;
}
function dyRows_() {
  if (HUB_MEM.dyRows) return HUB_MEM.dyRows;
  var sh = dyUsersSheet_(), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, DYA.H.length).getValues().forEach(function (r, i) {
    if (!hubNorm(r[0])) return;
    var o = { row: i + 2 }; DYA.H.forEach(function (h, j) { var v = r[j]; o[h] = v instanceof Date ? (DY_DAYCOL[h] ? Utilities.formatDate(v, dyTz_(), 'yyyy-MM-dd') : v.toISOString()) : v; });
    o.Email = hubNorm(o.Email).toLowerCase(); out.push(o);
  });
  HUB_MEM.dyRows = out; return out;
}
var DY_DAYCOL = { LastDay: 1, LeagueWk: 1, Mailed: 1 };
function dyTz_() { if (!HUB_MEM.dyTz) try { HUB_MEM.dyTz = hubSS().getSpreadsheetTimeZone(); } catch (e) { HUB_MEM.dyTz = DYA.TZ; } return HUB_MEM.dyTz; }
function dyFind_(email) { var k = dyKey_(email); return dyRows_().filter(function (o) { return o.Email === k; })[0] || null; }
function dyWrite_(o) {
  var sh = dyUsersSheet_(), vals = DYA.H.map(function (h) { var v = o[h] == null ? '' : o[h]; return DY_DAYCOL[h] && v ? "'" + String(v).replace(/^'/, '').slice(0, 10) : v; });
  if (o.row) sh.getRange(o.row, 1, 1, vals.length).setValues([vals]);
  else { sh.appendRow(vals); o.row = sh.getLastRow(); }
  delete HUB_MEM.dyRows;
  try { CacheService.getScriptCache().remove('dyb_week'); CacheService.getScriptCache().remove('dyb_month'); CacheService.getScriptCache().remove('dyb_league'); } catch (e) {}
  return o;
}
function dyNew_(email, nick, src) {
  var now = new Date().toISOString();
  return { Email: dyKey_(email), Nick: dyClean_(nick, 24) || email.split('@')[0].slice(0, 24), Avatar: DYA.AVATARS[1 + Math.floor(Math.random() * 12)], Theme: 'teal',
    Goal: 50, Notify: 1, Lang: 'vi', Created: now, LastSeen: now, Logins: 0, Salt: '', Hash: '', Session: 1, XP: 0, Streak: 0, Best: 0, LastDay: '', Freeze: 0,
    League: 0, LeagueWk: dyMonday_(dyYmd_()), Lessons: 0, Right: 0, Asked: 0, Words: 0, Mailed: '', Source: src || 'app' };
}

/* ── mật khẩu + phiên ── */
function dyHash_(email, pw, salt) {
  var key = Utilities.newBlob(rhSecret() + '|dypw').getBytes();
  var h = Utilities.computeHmacSha256Signature(Utilities.newBlob(salt + '|' + email + '|' + pw).getBytes(), key);
  for (var i = 1; i < DYA.ITER; i++) h = Utilities.computeHmacSha256Signature(h, key);
  return rhB64(h);
}
function dyPwBad_(pw, email) {
  pw = String(pw == null ? '' : pw);
  if (pw.length < 6) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (pw.length > 128) return 'Mật khẩu quá dài.';
  var low = pw.toLowerCase();
  if (/^(.)\1+$/.test(pw) || /^(123456|1234567|12345678|123456789|password|matkhau|qwerty|abc123|111111|000000)$/.test(low) || low === email.split('@')[0])
    return 'Mật khẩu quá dễ đoán — đừng dùng tên email hoặc dãy số liền nhau.';
  return '';
}
function dySetPw_(o, pw) { o.Salt = Utilities.getUuid().replace(/-/g, ''); o.Hash = dyHash_(o.Email, String(pw), o.Salt); }
function dySig_(data) { return rhB64(Utilities.computeHmacSha256Signature(data, rhSecret() + '|dy')); }
function dyIssue_(o) {
  var now = Date.now(), exp = now + DYA.TOKEN_DAYS * 864e5;
  var data = rhB64(JSON.stringify({ k: 'dy', e: o.Email, s: Number(o.Session) || 1, i: now, x: exp }));
  return 'dy' + data + '.' + dySig_(data);
}
/** Phiên học viên ⇒ {o, t} | {err}. Nhận cả phiên công ty (RH_Users) ⇒ tự tạo tài khoản. */
function dyAuth_(tk) {
  tk = hubNorm(tk);
  if (tk.indexOf('dy') === 0) {
    var s = tk.slice(2), dot = s.indexOf('.'), t;
    if (dot < 10) return { err: 'Chưa đăng nhập.' };
    var data = s.slice(0, dot);
    if (!rhSame(s.slice(dot + 1), dySig_(data))) return { err: 'Phiên đăng nhập không hợp lệ.' };
    try { t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); } catch (e) { return { err: 'Phiên đăng nhập không hợp lệ.' }; }
    if (!t || Date.now() > t.x) return { err: 'Phiên đăng nhập đã hết hạn — đăng nhập lại nhé.' };
    var o = dyFind_(t.e);
    if (!o) return { err: 'Tài khoản không còn.' };
    if ((Number(o.Session) || 1) !== t.s) return { err: 'Bạn đã đổi mật khẩu / đăng xuất khỏi mọi máy — đăng nhập lại nhé.' };
    return { o: o, t: t };
  }
  var r = rhCheck(tk);
  if (r.err) return { err: r.err };
  var email = r.u.local + '@' + HUB.SEND_DOMAIN, o2 = dyFind_(email);
  if (!o2) o2 = hubWithLock(function () { return dyFind_(email) || dyWrite_(dyNew_(email, r.u.pic, 'rh')); });
  return { o: o2, t: { k: 'rh', i: r.t.i, x: r.t.x }, rh: r };
}
/** Cho RH_DailyRun / RH_Daily: phiên công ty HOẶC phiên học viên có email công ty ⇒ {u, t} như rhCheck */
function dyRhCheck_(tk) {
  tk = hubNorm(tk);
  if (tk.indexOf('dy') !== 0) return rhCheck(tk);
  var a = dyAuth_(tk);
  if (a.err) return { err: a.err };
  if (!dyCompany_(a.o.Email)) return { err: 'Chức năng này chỉ dành cho tài khoản email công ty.' };
  var u = rhUserByLocal(a.o.Email.split('@')[0]);
  if (!u || !u.active) return { err: 'Email công ty này chưa có quyền dùng hệ thống MMH.' };
  return { u: u, t: a.t };
}

/* ── chỉ số công khai ── */
function dyPublic_(o) {
  var xp = Number(o.XP) || 0, lvl = dyLevel_(xp), today = dyYmd_();
  var streak = Number(o.Streak) || 0, lastN = o.LastDay ? dyDayN_(String(o.LastDay).slice(0, 10)) : -99, gap = dyDayN_(today) - lastN;
  if (gap > 1 + Math.min(2, Number(o.Freeze) || 0)) streak = 0;               // chuỗi đã tắt (hiển thị)
  return { email: o.Email, nick: o.Nick, avatar: o.Avatar, theme: o.Theme, goal: Number(o.Goal) || 50, notify: Number(o.Notify) ? 1 : 0, lang: o.Lang || 'vi',
    xp: xp, lvl: lvl, lvlFrom: dyLvlFloor_(lvl), lvlTo: dyLvlFloor_(lvl + 1), streak: streak, best: Number(o.Best) || 0, studiedToday: String(o.LastDay).slice(0, 10) === today,
    gap: o.LastDay ? gap : null, freeze: Number(o.Freeze) || 0, league: Number(o.League) || 0, leagueName: DYA.LEAGUES[Number(o.League) || 0],
    lessons: Number(o.Lessons) || 0, right: Number(o.Right) || 0, asked: Number(o.Asked) || 0, words: Number(o.Words) || 0,
    created: o.Created, admin: dyIsAdmin_(o.Email), company: dyCompany_(o.Email) };
}

/* ── giải đấu: sang tuần mới ⇒ lên / xuống hạng theo XP tuần trước ── */
function dyLeagueRoll_(o, weekXp) {
  var wk = dyMonday_(dyYmd_());
  if (String(o.LeagueWk).slice(0, 10) === wk) return null;
  var prevWk = String(o.LeagueWk).slice(0, 10), lg = Number(o.League) || 0, prev = lg;
  var xpPrev = weekXp ? weekXp(o.Email, prevWk) : 0;
  if (prevWk && dyDayN_(wk) - dyDayN_(prevWk) === 7) {
    if (xpPrev >= DYA.PROMO[lg] && lg < DYA.LEAGUES.length - 1) lg++;
    else if (xpPrev < 30 && lg > 0) lg--;
  } else if (lg > 0) lg--;                                                       // bỏ cả tuần ⇒ xuống 1 hạng
  o.League = lg; o.LeagueWk = wk;
  return { from: prev, to: lg, xp: xpPrev };
}
function dyWeekXp_(log) {
  return function (email, monday) {
    var a = dyDayN_(monday), b = a + 7, n = 0;
    log.forEach(function (x) { if (x.email === email) { var d = dyDayN_(x.day); if (d >= a && d < b) n += x.xp; } });
    return n;
  };
}
function dyLog_(from, nocache) {   // đọc nhật ký (từ ngày `from`), đệm 2 phút
  var c = CacheService.getScriptCache(), key = 'dylog_' + (c.get('dygen') || '0') + '_' + from, hit = nocache ? null : c.get(key);
  if (hit) try { return JSON.parse(hit); } catch (e) {}
  var sh = dyLogSheet_(), last = sh.getLastRow(), out = [], fromN = dyDayN_(from);
  if (last >= 2) {
    var V = sh.getRange(2, 1, last - 1, DYA.LH.length).getValues();
    for (var i = V.length - 1; i >= 0; i--) {
      var at = V[i][0] instanceof Date ? V[i][0] : new Date(V[i][0]); if (isNaN(at)) continue;
      var day = dyYmd_(at); if (dyDayN_(day) < fromN) break;
      out.push({ at: at.toISOString(), day: day, email: hubNorm(V[i][1]).toLowerCase(), kind: hubNorm(V[i][2]), date: V[i][3] instanceof Date ? Utilities.formatDate(V[i][3], dyTz_(), 'yyyy-MM-dd') : String(V[i][3]).replace(/^'/, '').slice(0, 10), show: hubNorm(V[i][4]), xp: Number(V[i][5]) || 0, d: hubNorm(V[i][6]) });
    }
  }
  try { c.put(key, JSON.stringify(out), 120); } catch (e) {}
  return out;
}

/* ── API: đăng ký / đăng nhập ── */
function apiDyHello(p) {
  var email = dyEmail_(p.email); if (!email) return { ok: false, code: 'EMAIL', error: 'Email chưa đúng định dạng.' };
  var o = dyFind_(email);
  return { ok: true, exists: !!o, hasPw: !!(o && o.Hash), nick: o ? o.Nick : '', avatar: o ? o.Avatar : '', company: dyCompany_(email) };
}
function apiDyCode(p) {
  var email = dyEmail_(p.email); if (!email) return { ok: false, code: 'EMAIL', error: 'Email chưa đúng định dạng.' };
  var key = dyKey_(email), sc = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  var prev = null; try { prev = JSON.parse(sc.get('dyotp:' + key) || 'null'); } catch (e) {}
  if (prev && Date.now() - prev.sent < DYA.GAP_MS) { var w = Math.ceil((DYA.GAP_MS - (Date.now() - prev.sent)) / 1000); return { ok: false, code: 'WAIT', wait: w, error: 'Mã vừa được gửi — chờ ' + w + ' giây rồi gửi lại.' }; }
  var hk = 'dyoh:' + key, hn = +(sc.get(hk) || 0);
  if (hn >= DYA.HOUR_MAX) return { ok: false, code: 'LIMIT', error: 'Đã gửi nhiều mã cho email này — thử lại sau 1 giờ.' };
  var day = dyYmd_(), dk = 'DY_OTPDAY', dv = {}; try { dv = JSON.parse(props.getProperty(dk) || '{}'); } catch (e) {}
  if (dv.d !== day) dv = { d: day, n: 0 };
  if (dv.n >= DYA.DAY_MAX) return { ok: false, code: 'LIMIT', error: 'Hôm nay hệ thống đã gửi đủ số mã cho phép. Vui lòng thử lại ngày mai.' };
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').substring(0, 12), 16) % 1000000, code = ('00000' + n).slice(-6);
  var o = dyFind_(email), isNew = !o || !o.Hash, why = p.why === 'reset' && !isNew ? 'reset' : (isNew ? 'new' : 'reset');
  var inner = '<div style="text-align:center"><img src="' + DYA.IMG + 'chip-wave.png" width="120" height="120" alt="Chíp" style="display:inline-block"></div>' +
    '<p style="margin:8px 0 6px">' + (why === 'new' ? 'Chào bạn! Chíp đây. Đây là mã kích hoạt tài khoản <b>MMH Daily Podcast</b> của bạn:' : 'Mã để đặt lại mật khẩu <b>MMH Daily Podcast</b> của bạn:') + '</p>' +
    '<div style="text-align:center;margin:16px 0 18px"><span style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:700;color:#0B5E52;background:#EEF6F4;border:1px solid #CFE6E0;border-radius:12px;padding:12px 24px">' + code + '</span></div>' +
    '<p style="margin:0 0 4px;color:#5E738C;font-size:13px">Mã có hiệu lực ' + Math.round(DYA.OTP_SEC / 60) + ' phút. Sau đó bạn đăng nhập bằng email + mật khẩu, không cần mã nữa.</p>' +
    '<p style="margin:0;color:#5E738C;font-size:13px">Không phải bạn yêu cầu? Cứ bỏ qua email này.</p>';
  try {
    mmhMail_({ to: email, subject: 'Mã ' + (why === 'new' ? 'kích hoạt' : 'đặt lại mật khẩu') + ' MMH Daily Podcast: ' + code,
      htmlBody: hubMailShell('MMH DAILY PODCAST', why === 'new' ? 'Kích hoạt tài khoản' : 'Đặt lại mật khẩu', inner, 'Email tự động — vui lòng không trả lời. ' + DYA.APP), name: 'MMH Daily Podcast' });
  } catch (e) {
    hubLog('ERROR', 'dyCode', 'Không gửi được mã tới ' + email, e.message);
    return { ok: false, code: 'MAIL', error: 'Chưa gửi được email (' + e.message + '). Thử lại sau ít phút nhé.' };
  }
  sc.put('dyotp:' + key, JSON.stringify({ h: rhSha(key + '|' + code + '|' + rhSecret()), sent: Date.now(), tries: 0, why: why }), DYA.OTP_SEC);
  sc.put(hk, String(hn + 1), 3600);
  dv.n++; props.setProperty(dk, JSON.stringify(dv));
  return { ok: true, sent: true, why: why, to: email };
}
function apiDyVerify(p) {
  var email = dyEmail_(p.email); if (!email) return { ok: false, code: 'EMAIL', error: 'Email chưa đúng định dạng.' };
  var key = dyKey_(email), sc = CacheService.getScriptCache(), rec = null;
  try { rec = JSON.parse(sc.get('dyotp:' + key) || 'null'); } catch (e) {}
  if (!rec) return { ok: false, code: 'CODE', error: 'Mã đã hết hạn — bấm "Gửi lại mã".' };
  var code = hubNorm(p.code).replace(/\D/g, '');
  if (!rhSame(rec.h, rhSha(key + '|' + code + '|' + rhSecret()))) {
    rec.tries = (rec.tries || 0) + 1;
    if (rec.tries >= 5) { sc.remove('dyotp:' + key); return { ok: false, code: 'CODE', error: 'Nhập sai mã 5 lần — mã đã huỷ. Bấm "Gửi lại mã".' }; }
    sc.put('dyotp:' + key, JSON.stringify(rec), DYA.OTP_SEC);
    return { ok: false, code: 'CODE', error: 'Mã chưa đúng. Còn ' + (5 - rec.tries) + ' lần thử.' };
  }
  var bad = dyPwBad_(p.pw, email); if (bad) return { ok: false, code: 'WEAK', error: bad };
  var out = hubWithLock(function () {
    delete HUB_MEM.dyRows;
    var o = dyFind_(email), isNew = !o;
    if (!o) o = dyNew_(email, p.nick);
    if (p.nick) o.Nick = dyClean_(p.nick, 24) || o.Nick;
    if (DYA.AVATARS.indexOf(p.avatar) >= 0) o.Avatar = p.avatar;
    if (!isNew) o.Session = (Number(o.Session) || 1) + 1;                         // đặt lại mật khẩu ⇒ đăng xuất máy khác
    dySetPw_(o, p.pw);
    o.Logins = (Number(o.Logins) || 0) + 1; o.LastSeen = new Date().toISOString();
    dyWrite_(o);
    return { o: o, isNew: isNew };
  });
  sc.remove('dyotp:' + key);
  dyLogAdd_(out.o.Email, out.isNew ? 'signup' : 'reset', '', '', 0, {}, '');
  return { ok: true, token: dyIssue_(out.o), me: dyPublic_(out.o), isNew: out.isNew };
}
function apiDyLogin(p) {
  var email = dyEmail_(p.email); if (!email) return { ok: false, code: 'EMAIL', error: 'Email chưa đúng định dạng.' };
  var sc = CacheService.getScriptCache(), fk = 'dypf:' + dyKey_(email), f = +(sc.get(fk) || 0);
  if (f >= DYA.PW_FAIL) return { ok: false, code: 'PWLOCK', error: 'Sai mật khẩu nhiều lần — tạm khoá 15 phút. Bấm "Quên mật khẩu" để nhận mã đặt lại.' };
  var o = dyFind_(email);
  if (!o) return { ok: false, code: 'NOUSER', error: 'Email này chưa có tài khoản — bấm "Tạo tài khoản".' };
  if (!o.Hash) return { ok: false, code: 'NOPW', error: 'Tài khoản chưa đặt mật khẩu — nhận mã qua email để đặt.' };
  if (!rhSame(o.Hash, dyHash_(o.Email, String(p.pw || ''), o.Salt))) {
    sc.put(fk, String(f + 1), 900);
    return { ok: false, code: 'PW', error: 'Mật khẩu chưa đúng.' + (DYA.PW_FAIL - f - 1 > 0 ? ' Còn ' + (DYA.PW_FAIL - f - 1) + ' lần thử.' : '') };
  }
  sc.remove(fk);
  hubWithLock(function () { delete HUB_MEM.dyRows; var x = dyFind_(email); x.Logins = (Number(x.Logins) || 0) + 1; x.LastSeen = new Date().toISOString(); dyWrite_(x); o = x; });
  dyLogAdd_(o.Email, 'login', '', '', 0, {}, '');
  return { ok: true, token: dyIssue_(o), me: dyPublic_(o) };
}

/* ── API: hồ sơ, tiến trình ── */
function apiDyMe(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var o = a.o, today = dyYmd_(), from = Utilities.formatDate(new Date(Date.now() - 34 * 864e5), DYA.TZ, 'yyyy-MM-dd');
  var log = dyLog_(from), mine = log.filter(function (x) { return x.email === o.Email; });
  var roll = null, changed = false;
  hubWithLock(function () {
    delete HUB_MEM.dyRows; var x = dyFind_(o.Email);
    roll = dyLeagueRoll_(x, dyWeekXp_(log)); if (roll) changed = true;
    var seen = String(x.LastSeen).slice(0, 10) !== today; if (seen) { x.LastSeen = new Date().toISOString(); changed = true; }
    if (changed) dyWrite_(x); o = x;
  });
  var week = [], tN = dyDayN_(today);
  for (var i = 6; i >= 0; i--) { var dd = Utilities.formatDate(new Date((tN - i) * 864e5), 'UTC', 'yyyy-MM-dd'), s = 0; mine.forEach(function (x) { if (x.day === dd) s += x.xp; }); week.push({ d: dd, xp: s }); }
  var done = {}; mine.forEach(function (x) { if (x.date && x.xp > 0) (done[x.date] = done[x.date] || {})[x.kind] = 1; });
  var out = { ok: true, me: dyPublic_(o), week: week, done: done, today: today, roll: roll,
    log: p.log ? mine.slice(0, 60).map(function (x) { return { at: x.at, kind: x.kind, date: x.date, show: x.show, xp: x.xp, d: x.d }; }) : undefined };
  if (a.t.k === 'dy' && a.t.x - Date.now() < 300 * 864e5) out.token = dyIssue_(o);   // tự gia hạn
  return out;
}
function apiDyProfile(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var o = hubWithLock(function () {
    delete HUB_MEM.dyRows; var x = dyFind_(a.o.Email);
    if (p.nick != null) { var n = dyClean_(p.nick, 24); if (n.length < 2) throw new Error('Biệt danh cần ít nhất 2 ký tự.'); x.Nick = n; }
    if (DYA.AVATARS.indexOf(p.avatar) >= 0) x.Avatar = p.avatar;
    if (p.theme) x.Theme = dyClean_(p.theme, 20).replace(/[^a-z0-9\-]/g, '');
    if (p.goal && DYA.GOALS.indexOf(Number(p.goal)) >= 0) x.Goal = Number(p.goal);
    if (p.notify != null) x.Notify = String(p.notify) === '1' || p.notify === true ? 1 : 0;
    if (p.lang) x.Lang = p.lang === 'en' ? 'en' : 'vi';
    return dyWrite_(x);
  });
  dyLogAdd_(o.Email, 'profile', '', '', 0, { nick: o.Nick, avatar: o.Avatar, goal: o.Goal }, '');
  return { ok: true, me: dyPublic_(o) };
}
function apiDyPw(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var o = a.o;
  if (o.Hash && !rhSame(o.Hash, dyHash_(o.Email, String(p.old || ''), o.Salt))) return { ok: false, code: 'OLD', error: 'Mật khẩu hiện tại chưa đúng (quên thì đăng xuất ▸ Quên mật khẩu).' };
  var bad = dyPwBad_(p.pw, o.Email); if (bad) return { ok: false, code: 'WEAK', error: bad };
  o = hubWithLock(function () { delete HUB_MEM.dyRows; var x = dyFind_(o.Email); dySetPw_(x, p.pw); x.Session = (Number(x.Session) || 1) + 1; return dyWrite_(x); });
  return { ok: true, token: dyIssue_(o), me: dyPublic_(o), message: 'Đã đổi mật khẩu — các máy khác sẽ phải đăng nhập lại.' };
}

/* ── API: ghi hoạt động học ⇒ XP ── */
var DY_KINDS = { listen: 1, quiz: 1, vocab: 1, read: 1, dictation: 1, speak: 1, lesson: 1, coach: 1, flash: 1 };
function dyXp_(kind, p) {
  var n = Math.max(0, Math.min(30, Math.round(Number(p.n) || 0))), right = Math.max(0, Math.min(n, Math.round(Number(p.right) || 0))), pct = Math.max(0, Math.min(100, Math.round(Number(p.pct) || 0)));
  switch (kind) {
    case 'listen': return pct >= 80 ? 10 : pct >= 40 ? 5 : 0;
    case 'quiz': return right * 2 + 5;
    case 'vocab': case 'read': case 'dictation': case 'flash': return right * 2 + 3;
    case 'speak': return Math.max(2, Math.round(pct / 10));
    case 'lesson': return 10;
    case 'coach': return Math.max(5, Math.min(15, Math.round(pct / 7)));
  }
  return 0;
}
function dyLogAdd_(email, kind, date, show, xp, detail, rid) {
  try { dyLogSheet_().appendRow([new Date(), email, kind, date ? "'" + date : '', show, xp, JSON.stringify(detail || {}).slice(0, 400), rid || '']); } catch (e) {}
}
function apiDyEvent(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var kind = hubNorm(p.kind); if (!DY_KINDS[kind]) return { ok: false, error: 'Loại hoạt động không hợp lệ.' };
  var date = hubNorm(p.date).slice(0, 10); if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = '';
  var rid = hubNorm(p.rid).slice(0, 40), today = dyYmd_(), base = dyXp_(kind, p);
  var from = Utilities.formatDate(new Date(Date.now() - 40 * 864e5), DYA.TZ, 'yyyy-MM-dd');
  var res = hubWithLock(function () {
    delete HUB_MEM.dyRows;
    var sh = dyLogSheet_(), log = dyLog_(from, true), o = dyFind_(a.o.Email);
    if (rid) { var last = sh.getLastRow(), ids = last >= 2 ? sh.getRange(Math.max(2, last - 400), 8, Math.min(401, last - 1), 1).getValues() : []; for (var i = 0; i < ids.length; i++) if (hubNorm(ids[i][0]) === rid) return { dup: true, o: o }; }
    var mine = log.filter(function (x) { return x.email === o.Email; });
    var before = mine.filter(function (x) { return x.kind === kind && x.date === date && x.xp > 0; }).length;
    var xp = date && before ? Math.max(2, Math.round(base * 0.2)) : base;
    var dayXp = 0; mine.forEach(function (x) { if (x.day === today) dayXp += x.xp; });
    xp = Math.max(0, Math.min(xp, DYA.DAY_XP - dayXp));
    var lvlBefore = dyLevel_(Number(o.XP) || 0), goalBefore = dayXp >= (Number(o.Goal) || 50);
    dyLeagueRoll_(o, dyWeekXp_(log));
    if (xp > 0) {
      o.XP = (Number(o.XP) || 0) + xp;
      var last = String(o.LastDay).slice(0, 10);
      if (last !== today) {
        var gap = last ? dyDayN_(today) - dyDayN_(last) : 99, st = Number(o.Streak) || 0, fr = Number(o.Freeze) || 0;
        if (gap === 1) st++; else if (gap > 1 && gap - 1 <= fr) { o.Freeze = fr - (gap - 1); st++; } else st = 1;
        o.Streak = st; o.Best = Math.max(Number(o.Best) || 0, st); o.LastDay = today;
        if (st % 7 === 0) o.Freeze = Math.min(2, (Number(o.Freeze) || 0) + 1);
      }
    }
    if (kind === 'lesson') o.Lessons = (Number(o.Lessons) || 0) + (before ? 0 : 1);
    if (/quiz|vocab|read|dictation|flash/.test(kind)) { o.Right = (Number(o.Right) || 0) + Math.max(0, Math.round(Number(p.right) || 0)); o.Asked = (Number(o.Asked) || 0) + Math.max(0, Math.round(Number(p.n) || 0)); }
    if (p.words) o.Words = (Number(o.Words) || 0) + Math.max(0, Math.min(40, Math.round(Number(p.words) || 0)));
    dyWrite_(o);
    var det = {}; ['right', 'n', 'pct', 'words', 'sec'].forEach(function (k) { if (p[k] != null && p[k] !== '') det[k] = Number(p[k]) || 0; });
    sh.appendRow([new Date(), o.Email, kind, date ? "'" + date : '', hubNorm(p.show).slice(0, 30), xp, JSON.stringify(det), rid]);
    try { CacheService.getScriptCache().put('dygen', String(Date.now()), 21600); } catch (e) {}
    return { o: o, xp: xp, levelUp: dyLevel_(Number(o.XP) || 0) > lvlBefore ? dyLevel_(Number(o.XP) || 0) : 0, goalHit: !goalBefore && dayXp + xp >= (Number(o.Goal) || 50), dayXp: dayXp + xp, repeat: !!before };
  });
  if (res.dup) return { ok: true, dup: true, xp: 0, me: dyPublic_(res.o) };
  try { var c = CacheService.getScriptCache(); ['week', 'month', 'league'].forEach(function (k) { c.remove('dyb_' + k); }); } catch (e) {}
  return { ok: true, xp: res.xp, dayXp: res.dayXp, goalHit: res.goalHit, levelUp: res.levelUp, repeat: res.repeat, me: dyPublic_(res.o) };
}

/* ── API: bảng xếp hạng ── */
function apiDyBoard(p) {
  var a = dyAuth_(p.tk); if (a.err) return { ok: false, code: 'AUTH', error: a.err };
  var per = p.period === 'month' ? 'month' : p.period === 'league' ? 'league' : 'week', c = CacheService.getScriptCache(), key = 'dyb_' + per, b = null;
  try { b = JSON.parse(c.get(key) || 'null'); } catch (e) {}
  if (!b) {
    var today = dyYmd_(), from = per === 'month' ? today.slice(0, 8) + '01' : dyMonday_(today);
    var log = dyLog_(from), by = {};
    log.forEach(function (x) { var o = by[x.email] || (by[x.email] = { xp: 0, lessons: 0 }); o.xp += x.xp; if (x.kind === 'lesson') o.lessons++; });
    var users = dyRows_();
    var rows = users.filter(function (o) { return by[o.Email] && by[o.Email].xp > 0; }).map(function (o) {
      var pu = dyPublic_(o); return { k: rhSha(o.Email).slice(0, 10), nick: pu.nick, avatar: pu.avatar, xp: by[o.Email].xp, lessons: by[o.Email].lessons, streak: pu.streak, league: pu.league, lvl: pu.lvl };
    }).sort(function (x, y) { return y.xp - x.xp || y.streak - x.streak; });
    var nick = {}; users.forEach(function (o) { nick[o.Email] = { n: o.Nick, a: o.Avatar }; });
    var recent = log.filter(function (x) { return x.xp > 0 && x.kind !== 'login'; }).slice(0, 30)
      .map(function (x) { var u = nick[x.email] || { n: '?', a: 'chip' }; return { nick: u.n, avatar: u.a, kind: x.kind, date: x.date, show: x.show, xp: x.xp, at: x.at }; });
    b = { from: from, to: today, rows: rows, recent: recent };
    try { c.put(key, JSON.stringify(b), 90); } catch (e) {}
  }
  var me = rhSha(a.o.Email).slice(0, 10), rows = b.rows;
  if (per === 'league') { var lg = Number(a.o.League) || 0; rows = rows.filter(function (r) { return r.league === lg; }); }
  return { ok: true, period: per, from: b.from, to: b.to, rows: rows.map(function (r) { return { nick: r.nick, avatar: r.avatar, xp: r.xp, lessons: r.lessons, streak: r.streak, league: r.league, lvl: r.lvl, me: r.k === me }; }),
    recent: b.recent, league: Number(a.o.League) || 0, leagues: DYA.LEAGUES, promo: DYA.PROMO };
}

/* ── nhắc học hằng ngày (gọi trong hwWarm, 5 phút / lần) ── */
function dyTick_() {
  var now = new Date(), hm = Utilities.formatDate(now, DYA.TZ, 'HH:mm');
  if (hm < '19:30' || hm > '21:30') return 'ngoài giờ';
  var props = PropertiesService.getScriptProperties(), today = dyYmd_(), st = {};
  try { st = JSON.parse(props.getProperty('DY_MAIL') || '{}'); } catch (e) {}
  if (st.d !== today) st = { d: today, n: 0, done: 0 };
  if (st.done) return 'đã nhắc hôm nay (' + st.n + ')';
  var dow = Utilities.formatDate(now, DYA.TZ, 'u'), sent = 0, t0 = Date.now(), tN = dyDayN_(today);
  var todo = dyRows_().filter(function (o) {
    if (!Number(o.Notify) || !o.LastDay || String(o.LastDay).slice(0, 10) === today || String(o.Mailed).slice(0, 10) === today) return false;
    var gap = tN - dyDayN_(String(o.LastDay).slice(0, 10));
    return gap <= 30 && (gap <= 7 || dow === '1');
  });
  for (var i = 0; i < todo.length && st.n < DYA.MAIL_MAX && Date.now() - t0 < 200000; i++) {
    var o = todo[i], pu = dyPublic_(o), gap = tN - dyDayN_(String(o.LastDay).slice(0, 10));
    var mood = gap <= 1 ? 'remind' : gap <= 3 ? 'sleepy' : 'sad';
    var title = gap <= 1 ? (pu.streak > 1 ? 'Giữ lửa ' + (Number(o.Streak) || 0) + ' ngày nào, ' + o.Nick + '!' : 'Hôm nay học 5 phút nhé, ' + o.Nick + '!')
      : gap <= 3 ? o.Nick + ' ơi, Chíp ngủ gật chờ bạn rồi…' : 'Chíp nhớ ' + o.Nick + ' lắm đó…';
    var msg = gap <= 1 ? (Number(o.Streak) > 1 ? 'Chuỗi <b>' + o.Streak + ' ngày</b> của bạn sẽ tắt lúc nửa đêm nếu hôm nay chưa học. Nghe số podcast hôm nay 8 phút và làm vài câu hỏi là giữ được lửa.' : 'Số podcast hôm nay đã sẵn sàng. Chỉ cần nghe 8 phút và trả lời vài câu là có XP rồi.')
      : 'Đã ' + gap + ' ngày bạn chưa ghé lớp. Không sao cả — quay lại với 1 bài ngắn hôm nay là Chíp vui ngay.';
    var inner = '<div style="text-align:center"><img src="' + DYA.IMG + 'chip-' + mood + '.png" width="150" height="150" alt="Chíp" style="display:inline-block"></div>' +
      '<p style="text-align:center;margin:10px 0 14px;color:#33475B">' + msg + '</p>' +
      '<div style="text-align:center;margin:0 0 10px">' + hubMailButton(DYA.APP + '#/listen', 'Học bài hôm nay') + '</div>' +
      '<p style="text-align:center;font-size:12px;color:#8696A5;margin:6px 0 0">' + pu.xp + ' XP · cấp ' + pu.lvl + ' · giải ' + pu.leagueName + ' · tắt nhắc trong app ▸ Tôi ▸ Nhắc học</p>';
    try {
      mmhMail_({ to: o.Email, subject: title, htmlBody: hubMailShell('MMH DAILY PODCAST', hubEsc(title), inner, 'Chíp — trợ lý học của MMH Daily Podcast. ' + DYA.APP), name: 'Chíp · MMH Daily Podcast' });
      sent++; st.n++;
      hubWithLock(function () { delete HUB_MEM.dyRows; var x = dyFind_(o.Email); if (x) { x.Mailed = today; dyWrite_(x); } });
    } catch (e) { hubLog('WARN', 'dyTick', 'Không gửi được nhắc học ' + o.Email, e.message); if (/too many|quota|limit/i.test(e.message)) break; }
  }
  if (sent === 0 || st.n >= DYA.MAIL_MAX || todo.length <= sent) st.done = 1;
  props.setProperty('DY_MAIL', JSON.stringify(st));
  return 'nhắc ' + sent + ' / ' + todo.length;
}
