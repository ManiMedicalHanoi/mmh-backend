/**
 * ============================================================================
 *  ★ v3.12 — ĐĂNG NHẬP REPORT HUB BẰNG EMAIL CÔNG TY + MÃ 6 SỐ
 * ----------------------------------------------------------------------------
 *  Report Hub (manimedicalhanoi.github.io/MMH-Report) trước đây cho chọn tên để vào ⇒ ai cũng vào được
 *  dưới tên người khác. Nay: nhập email công ty ▸ nhận mã 6 số qua email ▸ nhập mã ▸ nhận PHIÊN ĐĂNG NHẬP
 *  (chuỗi ký có chữ ký HMAC, hạn 30 ngày). Report Hub gửi kèm phiên (tham số `tk`) trong mọi lệnh gọi.
 *
 *  - Nhận cả 2 tên miền @mani.inc và @manimedicalhanoi.com — người dùng nhận diện theo PHẦN TRƯỚC @.
 *    Mã gửi tới ĐÚNG địa chỉ người dùng vừa gõ.
 *  - Danh sách người được dùng Report Hub: sheet RH_Users trong file "MMH - Training Master"
 *    (tự tạo lần đầu với danh bạ hiện tại). Admin sửa trực tiếp trên sheet:
 *      · Active = FALSE ⇒ khoá (phiên đang có bị từ chối ngay khi app hỏi lại).
 *      · Session + 1   ⇒ đăng xuất người đó khỏi MỌI máy.
 *      · thêm người: thêm 1 dòng Email / Pic (đúng tên PIC trong Report Hub) / Level.
 *  - Khoá ký phiên: sheet ẩn RH_Secret (tự tạo, chỉ chủ file sửa được). Các backend khác dùng chung khoá này
 *    để tự kiểm phiên ở giai đoạn 2. Đổi khoá (xoá ô A2) ⇒ mọi phiên cũ hết hiệu lực.
 *  - Giai đoạn 1 (bản này): chạy song song cách chọn tên cũ, KHÔNG chặn ai. Riêng cầu nối Training Hub
 *    (rhMeta, rhSaveSession…) đã ưu tiên danh tính trong phiên thay cho tên do trình duyệt tự khai.
 * ============================================================================
 */

var RH_AUTH = {
  SHEET        : 'RH_Users',
  SECRET_SHEET : 'RH_Secret',
  HEADER       : ['Email', 'Pic', 'Level', 'Admin', 'Active', 'Session', 'LastLogin', 'Logins', 'LastEmail', 'Note', 'Dept', 'Title', 'Perms'],   // ★ v3.13: Dept/Title/Perms
  OTP_TTL_SEC  : 600,      // mã có hiệu lực 10 phút
  OTP_GAP_MS   : 45000,    // 1 mã / 45 giây / người
  OTP_TRIES    : 5,        // sai 5 lần ⇒ phải gửi mã mới
  TOKEN_DAYS   : 30,
  USERS_TTL    : 120,      // giây — sửa RH_Users có hiệu lực sau tối đa 2 phút
  APP_NAME     : 'MMH Report',
  APP_URL      : 'https://manimedicalhanoi.github.io/MMH-Report/',
  /** Danh bạ khởi tạo RH_Users (chỉ dùng khi sheet chưa có). [phần trước @, Pic trong Report Hub, level, admin] */
  SEED: [
    ['nt.ha',           'Nguyen Ha',  'director'],
    ['tt.tuyen',        'Tuyen',      'hod'],
    ['mmh.product',     'Giang',      'lead', true],
    ['marketing.mmh',   'Thuong',     'lead'],
    ['marketing.mmh1',  'Duc Anh',    'pic'],
    ['mmh.admin',       'Minh Trang', 'pic'],
    ['marketing.mmh2',  'Trang',      'pic'],
    ['mmh.hanoi',       'Viet',       'lead'],
    ['mmh.danang',      'Vinh',       'pic'],
    ['mmh.saigon',      'Phuong',     'pic'],
    ['mmh.hanoi2',      'Viet Ha',    'pic'],
    ['mmh.saigon1',     'Khang',      'pic'],
    ['vtt.hoa',         'Hoa',        'hod'],
    ['mmh.backoffice',  'Dam Ha',     'lead'],
    ['mmh.backoffice1', 'Hau',        'pic'],
    ['mmh.hanoi1',      'Ngoc',       'pic'],
    ['mmh.account',     'Mai',        'pic'],
    ['mmh.order',       'Dam Viet',   'pic']
  ]
};

// ---------------------------------------------------------------------------
//  Danh sách người dùng Report Hub (RH_Users)
// ---------------------------------------------------------------------------

function rhUsersSheet() {
  return hubCached('shRhUsers', function(){
    var ss = hubSS(), sh = ss.getSheetByName(RH_AUTH.SHEET);
    if (sh) return hubEnsureHeader(sh, RH_AUTH.HEADER);
    return hubWithLock(function(){
      var again = ss.getSheetByName(RH_AUTH.SHEET);
      if (again) return hubEnsureHeader(again, RH_AUTH.HEADER);
      sh = hubEnsureHeader(ss.insertSheet(RH_AUTH.SHEET), RH_AUTH.HEADER);
      var rows = RH_AUTH.SEED.map(function(s){
        return [s[0] + '@' + HUB.SEND_DOMAIN, s[1], s[2], s[3] ? true : false, true, 1, '', 0, '', '', '', '', ''];
      });
      sh.getRange(2, 1, rows.length, RH_AUTH.HEADER.length).setValues(rows);
      try {
        sh.getRange(2, 4, rows.length, 2).insertCheckboxes();
        sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 120); sh.setColumnWidth(10, 260);
        sh.getRange(1, 10).setNote('Active bỏ tick = khoá. Session + 1 = đăng xuất người đó khỏi mọi máy. ' +
          'Pic phải trùng tên PIC trong Report Hub. Level: director / hod / lead / pic. Sửa có hiệu lực sau tối đa 2 phút.');
      } catch (e) {}
      hubLog('INFO', 'rhUsers', 'Tạo sheet ' + RH_AUTH.SHEET + ' (' + rows.length + ' người)', '');
      return sh;
    });
  });
}

function rhUsers() {
  if (HUB_MEM.hasOwnProperty('rhUsers')) return HUB_MEM.rhUsers;
  var sc = hubSC(), list = null;
  try { var hit = sc.get('rhUsers'); if (hit) list = JSON.parse(hit); } catch (e) {}
  if (!list) {
    var sh = rhUsersSheet(), last = sh.getLastRow();
    var vals = last < 2 ? [] : sh.getRange(2, 1, last - 1, RH_AUTH.HEADER.length).getValues();
    list = [];
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i], local = hubPrefix(r[0]);
      if (!local || !hubNorm(r[1])) continue;
      var perms = {};
      try { perms = r[12] ? JSON.parse(r[12]) : {}; } catch (e) { perms = {}; }
      list.push({
        row: i + 2, local: local, pic: hubNorm(r[1]), level: hubNorm(r[2]).toLowerCase() || 'pic',
        admin: hubBool(r[3]), active: r[4] === '' ? true : hubBool(r[4]),
        session: Math.max(1, parseInt(r[5], 10) || 1), logins: parseInt(r[7], 10) || 0,
        lastLogin: r[6] instanceof Date ? r[6].toISOString() : hubNorm(r[6]), lastEmail: hubNorm(r[8]),
        dept: hubNorm(r[10]), title: hubNorm(r[11]), perms: perms
      });
    }
    try { sc.put('rhUsers', JSON.stringify(list), RH_AUTH.USERS_TTL); } catch (e) {}
  }
  HUB_MEM.rhUsers = list;
  return list;
}

function rhUserByLocal(local) {
  local = hubPrefix(local);
  var list = rhUsers();
  for (var i = 0; i < list.length; i++) if (list[i].local === local) return list[i];
  return null;
}

function rhPublicUser(u, email) {
  return {email: email || (u.local + '@' + HUB.SEND_DOMAIN), local: u.local, pic: u.pic, level: u.level, admin: !!u.admin,
          dept: u.dept || '', title: u.title || '', perms: u.perms || {}};
}

// ---------------------------------------------------------------------------
//  Khoá ký phiên (RH_Secret) + phiên đăng nhập dạng <dữ liệu>.<chữ ký HMAC-SHA256>
// ---------------------------------------------------------------------------

function rhSecret() {
  if (HUB_MEM.rhSecret) return HUB_MEM.rhSecret;
  var sc = hubSC(), s = '';
  try { s = sc.get('rhSecret') || ''; } catch (e) {}
  if (!s) {
    s = hubWithLock(function(){
      var ss = hubSS(), sh = ss.getSheetByName(RH_AUTH.SECRET_SHEET);
      if (!sh) {
        sh = ss.insertSheet(RH_AUTH.SECRET_SHEET);
        sh.getRange(1, 1, 1, 2).setValues([['Khoá ký phiên đăng nhập Report Hub — KHÔNG chia sẻ. Xoá ô A2 = đăng xuất tất cả mọi người.', '']]);
        try {
          var pr = sh.protect().setDescription('Khoá đăng nhập Report Hub');
          pr.removeEditors(pr.getEditors()); if (pr.canDomainEdit()) pr.setDomainEdit(false);
        } catch (e) {}
      }
      try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
      var v = hubNorm(sh.getRange(2, 1).getValue());
      if (v.length < 32) {
        v = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
        sh.getRange(2, 1).setValue(v);
      }
      return v;
    });
    try { sc.put('rhSecret', s, 21600); } catch (e) {}
  }
  HUB_MEM.rhSecret = s;
  return s;
}

function rhB64(bytesOrString) {
  return Utilities.base64EncodeWebSafe(bytesOrString).replace(/=+$/, '');
}

function rhSig(data) {
  return rhB64(Utilities.computeHmacSha256Signature(data, rhSecret()));
}

function rhSha(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function(b){ return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/** So sánh không lộ thời gian (chống dò chữ ký) */
function rhSame(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function rhIssue(u, email) {
  var now = Date.now(), exp = now + RH_AUTH.TOKEN_DAYS * 86400000;
  var data = rhB64(JSON.stringify({e: u.local, p: u.pic, s: u.session, i: now, x: exp}));
  return {token: data + '.' + rhSig(data), exp: exp};
}

/** Kiểm phiên: trả {u, t} nếu hợp lệ, ngược lại {err} — không ném lỗi */
function rhCheck(tk) {
  tk = hubNorm(tk);
  var dot = tk.indexOf('.');
  if (dot < 10) return {err: 'Chưa đăng nhập.'};
  var data = tk.substring(0, dot), sig = tk.substring(dot + 1), t;
  if (!rhSame(sig, rhSig(data))) return {err: 'Phiên đăng nhập không hợp lệ.'};
  try { t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); }
  catch (e) { return {err: 'Phiên đăng nhập không hợp lệ.'}; }
  if (!t || !t.x || Date.now() > t.x) return {err: 'Phiên đăng nhập đã hết hạn.'};
  var u = rhUserByLocal(t.e);
  if (!u || !u.active) return {err: 'Tài khoản không còn quyền dùng Report Hub.'};
  if ((t.s || 1) !== u.session) return {err: 'Phiên đăng nhập đã bị đăng xuất từ xa.'};
  return {u: u, t: t};
}

// ---------------------------------------------------------------------------
//  API (HUB_ROUTES, auth:0 — tự kiểm trong hàm)
// ---------------------------------------------------------------------------

function rhCleanEmail(v) {
  var email = hubNorm(v).toLowerCase().replace(/\s+/g, '');
  if (email && email.indexOf('@') < 0) email += '@' + HUB.SEND_DOMAIN;      // chỉ gõ phần trước @
  return email;
}

/** Bước 1 — gửi mã 6 số tới email người dùng vừa nhập */
function apiRhAuthStart(p) {
  var email = rhCleanEmail(p.email);
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+$/.test(email)) return {ok:false, code:'EMAIL', error:'Email không hợp lệ.'};
  // so khớp ĐÚNG tên miền (hubIsCompanyEmail nhận cả "x@mani.inc.trang-khac.com" — mã sẽ gửi ra ngoài)
  if (HUB.DOMAINS.indexOf(email.split('@')[1]) < 0) return {ok:false, code:'EMAIL', error:'Chỉ dùng email công ty: @mani.inc hoặc @manimedicalhanoi.com.'};
  var u = rhUserByLocal(email);
  if (!u) return {ok:false, code:'NOUSER', error:'Email này chưa được cấp quyền dùng Report Hub. Vui lòng liên hệ Admin (Giang – mmh.product).'};
  if (!u.active) return {ok:false, code:'LOCKED', error:'Tài khoản đang bị khoá. Vui lòng liên hệ Admin (Giang).'};

  var sc = hubSC(), key = 'rhotp:' + u.local, prev = null;
  try { prev = JSON.parse(sc.get(key) || 'null'); } catch (e) {}
  if (prev && prev.sent && Date.now() - prev.sent < RH_AUTH.OTP_GAP_MS) {
    var wait = Math.ceil((RH_AUTH.OTP_GAP_MS - (Date.now() - prev.sent)) / 1000);
    return {ok:false, code:'WAIT', wait: wait, error:'Mã vừa được gửi. Vui lòng chờ ' + wait + ' giây rồi gửi lại.'};
  }
  var n = parseInt(Utilities.getUuid().replace(/-/g, '').substring(0, 12), 16) % 1000000;
  var code = ('00000' + n).slice(-6);
  var now = Date.now();
  sc.put(key, JSON.stringify({h: rhSha(u.local + '|' + code + '|' + rhSecret()), exp: now + RH_AUTH.OTP_TTL_SEC * 1000,
    tries: 0, sent: now, to: email}), RH_AUTH.OTP_TTL_SEC);

  var inner =
    '<p style="margin:0 0 12px">Xin chào <b>' + hubEsc(u.pic) + '</b>,</p>' +
    '<p style="margin:0 0 6px;color:#41566f">Mã đăng nhập ' + RH_AUTH.APP_NAME + ' của bạn:</p>' +
    '<div style="text-align:center;margin:18px 0 20px">' +
      '<span style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:700;color:#003047;background:#F0F7FF;border:1px solid #CFE2F3;border-radius:12px;padding:12px 24px">' + code + '</span>' +
    '</div>' +
    '<p style="margin:0 0 4px;color:#5E738C;font-size:13px">Mã có hiệu lực trong ' + Math.round(RH_AUTH.OTP_TTL_SEC / 60) + ' phút. Sau khi đăng nhập, máy này được ghi nhớ ' + RH_AUTH.TOKEN_DAYS + ' ngày.</p>' +
    '<p style="margin:0;color:#5E738C;font-size:13px">Không phải bạn yêu cầu? Hãy bỏ qua email này — không ai vào được tài khoản nếu không có mã.</p>';
  try {
    mmhMail_({
      to: email,
      subject: 'Mã đăng nhập ' + RH_AUTH.APP_NAME + ': ' + code,
      htmlBody: hubMailShell('MANI MEDICAL HANOI', RH_AUTH.APP_NAME, inner, 'Email tự động từ ' + RH_AUTH.APP_NAME + ' — vui lòng không trả lời. ' + RH_AUTH.APP_URL),
      name: RH_AUTH.APP_NAME
    });
  } catch (e) {
    try { sc.remove(key); } catch (x) {}
    hubLog('ERROR', 'rhAuthStart', 'Không gửi được mã tới ' + email, e.message);
    return {ok:false, code:'MAIL', error:'Chưa gửi được email (' + e.message + '). Vui lòng thử lại sau ít phút.'};
  }
  hubLog('INFO', 'rhAuthStart', 'Gửi mã đăng nhập Report Hub tới ' + email, '');
  return {ok:true, sentTo: email, expiresIn: RH_AUTH.OTP_TTL_SEC, gap: Math.round(RH_AUTH.OTP_GAP_MS / 1000)};
}

/** Bước 2 — kiểm mã, cấp phiên đăng nhập */
function apiRhAuthVerify(p) {
  var email = rhCleanEmail(p.email), code = hubNorm(p.code).replace(/\D/g, '');
  if (!email || code.length !== 6) return {ok:false, code:'CODE', error:'Vui lòng nhập đủ 6 số.'};
  if (HUB.DOMAINS.indexOf(email.split('@')[1]) < 0) return {ok:false, code:'EMAIL', error:'Email không hợp lệ.'};
  var u = rhUserByLocal(email);
  if (!u || !u.active) return {ok:false, code:'NOUSER', error:'Email này không còn quyền dùng Report Hub.'};
  var sc = hubSC(), key = 'rhotp:' + u.local, rec = null;
  try { rec = JSON.parse(sc.get(key) || 'null'); } catch (e) {}
  if (!rec || Date.now() > rec.exp) return {ok:false, code:'EXPIRED', error:'Mã đã hết hạn. Bấm "Gửi lại mã" để nhận mã mới.'};
  if (rec.tries >= RH_AUTH.OTP_TRIES) { sc.remove(key); return {ok:false, code:'EXPIRED', error:'Nhập sai quá ' + RH_AUTH.OTP_TRIES + ' lần. Bấm "Gửi lại mã".'}; }
  if (!rhSame(rec.h, rhSha(u.local + '|' + code + '|' + rhSecret()))) {
    rec.tries++;
    var left = RH_AUTH.OTP_TRIES - rec.tries;
    if (left <= 0) sc.remove(key);
    else sc.put(key, JSON.stringify(rec), Math.max(1, Math.round((rec.exp - Date.now()) / 1000)));
    return {ok:false, code:'CODE', left: left, error: left > 0 ? 'Mã chưa đúng. Còn ' + left + ' lần thử.' : 'Nhập sai quá ' + RH_AUTH.OTP_TRIES + ' lần. Bấm "Gửi lại mã".'};
  }
  sc.remove(key);
  var iss = rhIssue(u, email);
  try {
    hubWithLock(function(){
      var sh = rhUsersSheet();
      sh.getRange(u.row, 7, 1, 3).setValues([[new Date(), (u.logins || 0) + 1, email]]);
    });
    sc.remove('rhUsers');
  } catch (e) {}
  hubLog('INFO', 'rhAuthVerify', u.pic + ' đăng nhập Report Hub (' + email + ')', '');
  return {ok:true, token: iss.token, exp: iss.exp, user: rhPublicUser(u, email)};
}

/** Report Hub hỏi lại phiên mỗi lần mở app (bị khoá / đăng xuất từ xa ⇒ báo ngay) */
function apiRhAuthMe(p) {
  var r = rhCheck(p.tk);
  if (r.err) return {ok:false, code:'AUTH', error: r.err};
  return {ok:true, user: rhPublicUser(r.u), exp: r.t.x};
}

// ---------------------------------------------------------------------------
//  ★ v3.13 — TRANG QUẢN TRỊ PHÂN QUYỀN (Report Hub ▸ menu tên ▸ Phân quyền người dùng)
//  Admin / Director: sửa mọi người. HOD: sửa người khác trừ Admin / Director, không cấp quyền Admin / Director.
//  Perms: chỉ lưu các quyền KHÁC mặc định theo vai trò, dạng {"assign":{"e":0},"mgmt":{"v":1}} (Report Hub tự tính mặc định).
// ---------------------------------------------------------------------------

var RH_LEVELS = ['director', 'hod', 'lead', 'pic'];
var RH_PERM_KEYS = {assign:1, report:1, trip:1, trn:1, mkt:1, mgmt:1, pd:1};   // ★ v3.19: pd = Product Data (sửa / upload)

function rhAdminCaller(p) {
  var c = rhCheck(p.tk);
  if (c.err) return {err: {ok:false, code:'AUTH', error: c.err + ' Vui lòng đăng nhập bằng email.'}};
  var u = c.u;
  if (!(u.admin || u.level === 'director' || u.level === 'hod')) return {err: {ok:false, code:'FORBIDDEN', error:'Chỉ Admin, Director hoặc HOD được phân quyền.'}};
  return {u: u};
}
function rhIsTop(u) { return !!u && (u.admin || u.level === 'director'); }

function rhAdminRow(u) {
  return {local: u.local, email: u.local + '@' + HUB.SEND_DOMAIN, pic: u.pic, level: u.level, admin: !!u.admin, active: !!u.active,
          dept: u.dept, title: u.title, perms: u.perms || {}, lastLogin: u.lastLogin || '', logins: u.logins || 0,
          lastEmail: u.lastEmail || '', session: u.session};
}

function apiRhAdminList(p) {
  var c = rhAdminCaller(p); if (c.err) return c.err;
  return {ok:true, me: rhAdminRow(c.u), canTop: rhIsTop(c.u), users: rhUsers().map(rhAdminRow)};
}

function rhCleanPerms(o) {
  var out = {};
  if (!o || typeof o !== 'object') return out;
  Object.keys(o).forEach(function(k){
    if (!RH_PERM_KEYS[k] || !o[k] || typeof o[k] !== 'object') return;
    var x = {};
    if (o[k].v === 0 || o[k].v === 1) x.v = o[k].v;
    if (o[k].e === 0 || o[k].e === 1) x.e = o[k].e;
    if (Object.keys(x).length) out[k] = x;
  });
  return out;
}

/** Thêm / sửa 1 người. p.u = JSON {local (rỗng = thêm mới), email, pic, level, dept, title, admin, active, perms} */
function apiRhAdminSave(p) {
  var c = rhAdminCaller(p); if (c.err) return c.err;
  var me = c.u, d;
  try { d = typeof p.u === 'string' ? JSON.parse(p.u) : p.u; } catch (e) { return {ok:false, error:'Dữ liệu không hợp lệ.'}; }
  if (!d) return {ok:false, error:'Thiếu dữ liệu.'};
  var email = rhCleanEmail(d.email), local = hubPrefix(email);
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+$/.test(email) || HUB.DOMAINS.indexOf(email.split('@')[1]) < 0)
    return {ok:false, error:'Email phải là email công ty (@mani.inc hoặc @manimedicalhanoi.com).'};
  var pic = hubNorm(d.pic);
  if (!pic) return {ok:false, error:'Vui lòng nhập tên PIC (đúng tên hiển thị trong Report Hub).'};
  var level = hubNorm(d.level).toLowerCase();
  if (RH_LEVELS.indexOf(level) < 0) return {ok:false, error:'Vai trò không hợp lệ.'};
  var list = rhUsers(), orig = hubPrefix(d.local || ''), cur = null;
  list.forEach(function(x){ if (orig && x.local === orig) cur = x; });
  if (orig && !cur) return {ok:false, error:'Không tìm thấy người cần sửa (có thể vừa bị đổi). Tải lại danh sách.'};
  for (var i = 0; i < list.length; i++) {
    var x = list[i]; if (cur && x.row === cur.row) continue;
    if (x.local === local) return {ok:false, error:'Email ' + email + ' đã có trong danh sách (' + x.pic + ').'};
    if (hubKeyV(x.pic) === hubKeyV(pic)) return {ok:false, error:'Tên PIC "' + pic + '" đã dùng cho ' + x.local + '.'};
  }
  var admin = !!d.admin, top = rhIsTop(me);
  if (!top) {
    if (cur && (cur.admin || cur.level === 'director')) return {ok:false, code:'FORBIDDEN', error:'HOD không sửa được Admin / Director.'};
    if (level === 'director') return {ok:false, code:'FORBIDDEN', error:'Chỉ Admin / Director cấp vai trò Director.'};
    if (admin !== !!(cur && cur.admin)) return {ok:false, code:'FORBIDDEN', error:'Chỉ Admin / Director cấp quyền Admin.'};
  }
  var active = d.active === undefined ? true : !!d.active;
  if (cur && cur.row && me.local === cur.local && (!active || (me.admin && !admin)))
    return {ok:false, error:'Không tự khoá hoặc tự bỏ quyền Admin của chính mình.'};
  var perms = rhCleanPerms(d.perms);
  var note = 'Sửa bởi ' + me.pic + ' · ' + hubFmt(new Date(), 'dd/MM/yyyy HH:mm');
  hubWithLock(function(){
    var sh = rhUsersSheet();
    var vals = [email, pic, level, admin, active];
    if (cur) {
      sh.getRange(cur.row, 1, 1, 5).setValues([vals]);
      sh.getRange(cur.row, 10, 1, 4).setValues([[note, hubNorm(d.dept), hubNorm(d.title), JSON.stringify(perms)]]);
    } else {
      sh.appendRow(vals.concat([1, '', 0, '', 'Thêm bởi ' + me.pic + ' · ' + hubFmt(new Date(), 'dd/MM/yyyy HH:mm'), hubNorm(d.dept), hubNorm(d.title), JSON.stringify(perms)]));
      try { sh.getRange(sh.getLastRow(), 4, 1, 2).insertCheckboxes(); } catch (e) {}
    }
  });
  hubSC().remove('rhUsers'); delete HUB_MEM.rhUsers;
  hubLog('INFO', 'rhAdminSave', me.pic + (cur ? ' sửa ' : ' thêm ') + pic + ' (' + email + ')',
    JSON.stringify({level: level, admin: admin, active: active, dept: d.dept, perms: perms}));
  return {ok:true, message: cur ? 'Đã lưu quyền của ' + pic + '.' : 'Đã thêm ' + pic + '.', users: rhUsers().map(rhAdminRow)};
}

/** Đăng xuất 1 người khỏi mọi máy (Session + 1) */
function apiRhAdminKick(p) {
  var c = rhAdminCaller(p); if (c.err) return c.err;
  var u = rhUserByLocal(p.local || p.email);
  if (!u) return {ok:false, error:'Không tìm thấy người dùng.'};
  if (!rhIsTop(c.u) && (u.admin || u.level === 'director')) return {ok:false, code:'FORBIDDEN', error:'HOD không đăng xuất được Admin / Director.'};
  hubWithLock(function(){ rhUsersSheet().getRange(u.row, 6).setValue(u.session + 1); });
  hubSC().remove('rhUsers'); delete HUB_MEM.rhUsers;
  hubLog('INFO', 'rhAdminKick', c.u.pic + ' đăng xuất ' + u.pic + ' khỏi mọi máy', '');
  return {ok:true, message:'Đã đăng xuất ' + u.pic + ' khỏi mọi máy.', users: rhUsers().map(rhAdminRow)};
}
