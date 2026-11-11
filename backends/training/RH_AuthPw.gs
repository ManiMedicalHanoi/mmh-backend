/**
 * ============================================================================
 *  ★ v3.43 (11/11/2026) — ĐĂNG NHẬP BẰNG EMAIL + MẬT KHẨU, TỰ GIA HẠN PHIÊN
 * ----------------------------------------------------------------------------
 *  Người dùng yêu cầu: không phải nhập mã email nhiều lần — đăng nhập 1 lần, trình duyệt / app nhớ mật khẩu, lần sau vào luôn.
 *  - Lần đầu / quên mật khẩu: vẫn bằng mã 6 số qua email (rhAuthStart / rhAuthVerify ở RH_Auth.gs).
 *  - rhAuthPwSet (phiên tk + pw): đặt mật khẩu (≥ 8 ký tự). ĐỔI mật khẩu đã có cần mật khẩu cũ (old) HOẶC vừa đăng nhập bằng mã
 *    email (≤ 30 phút — trường `a` của phiên). op=clear: bỏ mật khẩu của mình.
 *  - rhAuthPw (email + pw) ⇒ phiên đăng nhập như rhAuthVerify. Sai 5 lần ⇒ khoá đăng nhập mật khẩu 15 phút (mã email vẫn dùng được).
 *  - rhAuthRenew (phiên còn hạn) ⇒ phiên mới 30 ngày, giữ nguyên thời điểm đăng nhập gốc `a`: app đang dùng tự gia hạn, không bị đăng xuất giữa chừng.
 *  Lưu: Script Property RHPW_<phần trước @> = {s: muối, n: số vòng, h: băm, ss: Session lúc đặt, at}. Băm = HMAC-SHA256 lặp n vòng,
 *  khoá = rhSecret() (sheet ẩn RH_Secret — tách khỏi Script Property). Admin "đăng xuất khỏi mọi máy" (Session + 1) ⇒ mật khẩu cũ hết hiệu lực
 *  (phải đăng nhập lại bằng mã email rồi đặt lại). Không bao giờ trả mật khẩu / băm về app. POST (form-urlencoded) để mật khẩu không nằm trên URL.
 * ============================================================================
 */
var RH_PW = { PFX: 'RHPW_', MIN: 8, MAX: 128, ITER: 1000, FAIL_MAX: 5, FAIL_SEC: 900, FRESH_MS: 30 * 60000 };

function rhPwBytes_(s) { return Utilities.newBlob(String(s)).getBytes(); }

function rhPwHash_(local, pw, salt, n) {
  var key = rhPwBytes_(rhSecret() + '|pw');
  var h = Utilities.computeHmacSha256Signature(rhPwBytes_(salt + '|' + local + '|' + pw), key);
  for (var i = 1; i < n; i++) h = Utilities.computeHmacSha256Signature(h, key);
  return rhB64(h);
}

function rhPwGet_(local) {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(RH_PW.PFX + local) || 'null'); } catch (e) { return null; }
}

/** Có mật khẩu còn hiệu lực (đặt trong phiên Session hiện tại của người đó) */
function rhPwHas_(u) {
  if (!u) return false;
  var r = rhPwGet_(u.local);
  return !!(r && r.h && (r.ss || 1) === u.session);
}

function rhPwCheckNew_(u, pw) {
  pw = String(pw == null ? '' : pw);
  if (pw.length < RH_PW.MIN) return 'Mật khẩu cần ít nhất ' + RH_PW.MIN + ' ký tự.';
  if (pw.length > RH_PW.MAX) return 'Mật khẩu quá dài (tối đa ' + RH_PW.MAX + ' ký tự).';
  if (/^\s|\s$/.test(pw)) return 'Mật khẩu không bắt đầu / kết thúc bằng dấu cách.';
  var low = pw.toLowerCase();
  if (low.indexOf(u.local) >= 0 || /^(.)\1+$/.test(pw) || /^(12345678|123456789|1234567890|password|matkhau|abc12345|qwerty123|11111111|00000000)$/.test(low))
    return 'Mật khẩu quá dễ đoán — đừng dùng tên email hoặc dãy số liền nhau.';
  return '';
}

/** Đăng nhập bằng email + mật khẩu */
function apiRhAuthPw(p) {
  var email = rhCleanEmail(p.email), pw = String(p.pw == null ? '' : p.pw);
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+$/.test(email) || HUB.DOMAINS.indexOf(email.split('@')[1]) < 0)
    return {ok:false, code:'EMAIL', error:'Nhập email công ty: …@manimedicalhanoi.com hoặc …@mani.inc.'};
  if (!pw) return {ok:false, code:'PW', error:'Nhập mật khẩu.'};
  var u = rhUserByLocal(email);
  if (!u) return {ok:false, code:'NOUSER', error:'Email này chưa được cấp quyền. Vui lòng liên hệ Admin (Giang – mmh.product).'};
  if (!u.active) return {ok:false, code:'LOCKED', error:'Tài khoản đang bị khoá. Vui lòng liên hệ Admin (Giang).'};
  var sc = hubSC(), fk = 'rhpwf:' + u.local, f = null;
  try { f = JSON.parse(sc.get(fk) || 'null'); } catch (e) {}
  if (f && f.n >= RH_PW.FAIL_MAX)
    return {ok:false, code:'PWLOCK', error:'Nhập sai mật khẩu ' + RH_PW.FAIL_MAX + ' lần — tạm khoá 15 phút. Bấm "Nhận mã qua email" để đăng nhập ngay.'};
  var rec = rhPwGet_(u.local);
  if (!rec || !rec.h || (rec.ss || 1) !== u.session)
    return {ok:false, code:'NOPW', error:'Email này chưa đặt mật khẩu. Bấm "Nhận mã qua email" để đăng nhập, sau đó đặt mật khẩu cho lần sau.'};
  if (!rhSame(rec.h, rhPwHash_(u.local, pw, rec.s, rec.n || RH_PW.ITER))) {
    f = {n: (f ? f.n : 0) + 1};
    try { sc.put(fk, JSON.stringify(f), RH_PW.FAIL_SEC); } catch (e) {}
    var left = RH_PW.FAIL_MAX - f.n;
    if (left <= 0) hubLog('WARN', 'rhAuthPw', 'Tạm khoá đăng nhập mật khẩu 15 phút: ' + u.pic + ' (sai ' + f.n + ' lần)', '');
    return {ok:false, code:'PW', left: Math.max(0, left),
            error: left > 0 ? 'Mật khẩu chưa đúng. Còn ' + left + ' lần thử (hoặc bấm "Nhận mã qua email").'
                            : 'Nhập sai mật khẩu ' + RH_PW.FAIL_MAX + ' lần — tạm khoá 15 phút. Bấm "Nhận mã qua email" để đăng nhập ngay.'};
  }
  try { sc.remove(fk); } catch (e) {}
  var iss = rhIssue(u, email);
  try {
    hubWithLock(function(){ rhUsersSheet().getRange(u.row, 7, 1, 3).setValues([[new Date(), (u.logins || 0) + 1, email]]); });
    sc.remove('rhUsers');
  } catch (e) {}
  hubLog('INFO', 'rhAuthPw', u.pic + ' đăng nhập bằng mật khẩu (' + email + ')', '');
  return {ok:true, token: iss.token, exp: iss.exp, user: rhPublicUser(u, email), hasPw: true};
}

/** Đặt / đổi / bỏ mật khẩu của chính mình (cần phiên) */
function apiRhAuthPwSet(p) {
  var c = rhCheck(p.tk);
  if (c.err) return {ok:false, code:'AUTH', error: c.err};
  var u = c.u, key = RH_PW.PFX + u.local, props = PropertiesService.getScriptProperties();
  var cur = rhPwHas_(u) ? rhPwGet_(u.local) : null;
  var fresh = Date.now() - (c.t.a || c.t.i || 0) <= RH_PW.FRESH_MS;
  var oldOk = !!(cur && p.old && rhSame(cur.h, rhPwHash_(u.local, String(p.old), cur.s, cur.n || RH_PW.ITER)));
  if (cur && !fresh && !oldOk)
    return {ok:false, code:'OLD', error: p.old ? 'Mật khẩu hiện tại chưa đúng.' : 'Nhập mật khẩu hiện tại để đổi (quên thì đăng nhập lại bằng mã email).'};
  if (String(p.op || '') === 'clear') {
    props.deleteProperty(key);
    hubLog('INFO', 'rhAuthPwSet', u.pic + ' bỏ mật khẩu', '');
    return {ok:true, hasPw:false, message:'Đã bỏ mật khẩu. Lần sau đăng nhập bằng mã email.'};
  }
  var bad = rhPwCheckNew_(u, p.pw);
  if (bad) return {ok:false, code:'WEAK', error: bad};
  var salt = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  props.setProperty(key, JSON.stringify({s: salt, n: RH_PW.ITER, h: rhPwHash_(u.local, String(p.pw), salt, RH_PW.ITER), ss: u.session, at: new Date().toISOString()}));
  hubLog('INFO', 'rhAuthPwSet', u.pic + (cur ? ' đổi mật khẩu' : ' đặt mật khẩu'), '');
  return {ok:true, hasPw:true, message: cur ? 'Đã đổi mật khẩu.' : 'Đã lưu mật khẩu — lần sau đăng nhập bằng email + mật khẩu.'};
}

/** Gia hạn phiên còn hạn ⇒ phiên mới 30 ngày (giữ thời điểm đăng nhập gốc) */
function apiRhAuthRenew(p) {
  var c = rhCheck(p.tk);
  if (c.err) return {ok:false, code:'AUTH', error: c.err};
  var u = c.u, email = u.local + '@' + HUB.SEND_DOMAIN;
  var iss = rhIssue(u, email, c.t.a || c.t.i);
  return {ok:true, token: iss.token, exp: iss.exp, user: rhPublicUser(u, email), hasPw: rhPwHas_(u)};
}
