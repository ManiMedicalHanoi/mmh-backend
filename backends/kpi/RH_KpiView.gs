/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  RH_KpiView.gs  (v1.0 — 07/10/2026)
   Cổng ĐỌC KPI cho MMH Report Hub (tab KPI). CHỈ ĐỌC — không ghi, không đổi logic KPI Sync / TurnoverLink.
   ────────────────────────────────────────────────────────────────────
   GET ?action=rhKpi&tk=<phiên đăng nhập Report Hub>&callback=…
     · Đọc sheet "5. Member KPI Monthly" (Target / Actual / Weight / % / % x W theo FY, quý, tháng)
       + "0. Staff List" (họ tên, phòng ban, nhóm, HOD / Team Leader).
     · Xác thực phiên email của Report Hub: khoá ký + danh sách người dùng ở file Training Master
       (sheet ẩn RH_Secret, RH_Users — do Training Hub tạo).
     · Phạm vi xem: Director thấy tất cả · HOD thấy cả phòng ban · Team Leader thấy nhóm mình · PIC chỉ thấy mình.
     · Đệm 60 giây (KPI Sync cập nhật ~1 phút / lần).
   ════════════════════════════════════════════════════════════════════ */

var RKV = {
  VERSION: '1.1',
  TRAINING_MASTER: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',
  SHEET: '5. Member KPI Monthly',
  STAFF: '0. Staff List',
  HEADER_ROW: 4,
  TTL: 300
};

function doGet(e) {
  var p = (e && e.parameter) || {}, out;
  try { out = rkvRoute_(p); } catch (err) { out = {ok: false, error: String((err && err.message) || err)}; }
  var json = JSON.stringify(out);
  if (p.callback) {
    var cb = String(p.callback).replace(/[^\w$.]/g, '');
    return ContentService.createTextOutput(cb + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/** POST (URLSearchParams action + payload JSON) — cho nội dung dài (soạn / xem trước / gửi email KPI) */
function doPost(e) {
  var p = (e && e.parameter) || {}, out;
  try {
    if (p.payload) { var x = JSON.parse(p.payload); for (var k in x) if (k !== 'action') p[k] = x[k]; }
    out = rkvRoute_(p);
  } catch (err) { out = {ok: false, error: String((err && err.message) || err)}; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function rkvRoute_(p) {
  var a = String(p.action || 'ping');
  if (a === 'ping') return {ok: true, service: 'MMH KPI', version: RKV.VERSION};
  if (a === 'rhKpi') return rkvKpi_(p);
  if (a === 'rhKpiMail') return rkvMail_(p, 'data');
  if (a === 'rhKpiMailPreview') return rkvMail_(p, 'preview');
  if (a === 'rhKpiMailSend') return rkvMail_(p, 'send');
  return {ok: false, error: 'Không tìm thấy chức năng: ' + a};
}

// ── đệm CacheService chia mảnh (giới hạn 100KB / khoá) ──
function rkvCacheGet_(key) {
  var sc = CacheService.getScriptCache(), n = sc.get(key + ':n');
  if (!n) return null;
  var keys = []; for (var i = 0; i < +n; i++) keys.push(key + ':' + i);
  var got = sc.getAll(keys), s = '';
  for (var j = 0; j < keys.length; j++) { if (got[keys[j]] == null) return null; s += got[keys[j]]; }
  try { return JSON.parse(s); } catch (e) { return null; }
}
function rkvCachePut_(key, obj, ttl) {
  try {
    var s = JSON.stringify(obj), parts = {}, n = 0;
    for (var i = 0; i < s.length; i += 90000) parts[key + ':' + (n++)] = s.substring(i, i + 90000);
    parts[key + ':n'] = String(n);
    CacheService.getScriptCache().putAll(parts, ttl);
  } catch (e) {}
}

function rkvNum_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  if (isNaN(n)) return null;
  return Math.round(n * 10000) / 10000;
}
function rkvKey_(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, ''); }

/** Đọc toàn bộ dữ liệu KPI (đệm 60 giây) */
function rkvData_() {
  var hit = rkvCacheGet_('rkv:data');
  if (hit) return hit;
  var ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById('1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0');
  var sh = ss.getSheetByName(RKV.SHEET);
  if (!sh) throw new Error('Không tìm thấy sheet "' + RKV.SHEET + '".');
  var lastR = sh.getLastRow(), lastC = sh.getLastColumn();
  var vals = sh.getRange(RKV.HEADER_ROW, 1, Math.max(1, lastR - RKV.HEADER_ROW + 1), lastC).getValues();
  var hd = vals[0].map(function(x){ return String(x || '').trim(); });
  var col = function(name){ return hd.indexOf(name); };
  var C = {dept: col('Department'), member: col('Member'), pos: col('Position'), code: col('KPI Code'), group: col('KPI Group'),
           name: col('KPI name'), unit: col('Unit'), agg: col('Agg')};
  // kỳ: "FY68", "Q1".."Q4", "202609".. — mỗi kỳ 5 cột Target / Actual / Weight / % / % x W
  var periods = [], P = {};
  hd.forEach(function(h, i){
    var m = h.match(/^(.+?) (Target|Actual|Weight|%|% x W)$/);
    if (!m) return;
    if (!P[m[1]]) { P[m[1]] = {}; periods.push(m[1]); }
    P[m[1]][m[2]] = i;
  });
  var rows = [];
  for (var r = 1; r < vals.length; r++) {
    var v = vals[r], mem = String(v[C.member] || '').trim(), code = String(v[C.code] || '').trim();
    if (!mem || !code) continue;
    rows.push({
      dept: String(v[C.dept] || '').trim(), member: mem, pos: String(v[C.pos] || '').trim(), code: code,
      group: String(v[C.group] || '').trim(), name: String(v[C.name] || '').trim(), unit: String(v[C.unit] || '').trim(),
      agg: String(v[C.agg] || '').trim(),
      v: periods.map(function(k){ var c = P[k]; return [rkvNum_(v[c.Target]), rkvNum_(v[c.Actual]), rkvNum_(v[c.Weight]), rkvNum_(v[c['%']]), rkvNum_(v[c['% x W']])]; })
    });
  }
  // Staff List: KPI Name (key) · Full name · Job title · Mgmt/Role · Team · Department
  var staff = {};
  var st = ss.getSheetByName(RKV.STAFF);
  if (st) {
    var sv = st.getRange(4, 1, Math.max(1, st.getLastRow() - 3), Math.min(st.getLastColumn(), 14)).getValues();
    var sh2 = sv[0].map(function(x){ return String(x || '').replace(/\s+/g, ' ').trim(); });
    var ci = function(re){ for (var i = 0; i < sh2.length; i++) if (re.test(sh2[i])) return i; return -1; };
    var K = {key: ci(/^KPI Name/i), full: ci(/^Full name/i), title: ci(/^Job title/i), role: ci(/^Mgmt/i), team: ci(/^Team$/i), dept: ci(/^Department/i), level: ci(/^Job level/i)};
    for (var i = 1; i < sv.length; i++) {
      var k = String(sv[i][K.key] || '').trim(); if (!k) continue;
      staff[k] = {full: String(sv[i][K.full] || '').trim(), title: String(sv[i][K.title] || '').trim(), role: String(sv[i][K.role] || '').trim(),
                  team: String(sv[i][K.team] || '').trim(), dept: String(sv[i][K.dept] || '').trim(), level: String(sv[i][K.level] || '').trim()};
    }
  }
  var data = {periods: periods, rows: rows, staff: staff, at: new Date().toISOString()};
  rkvCachePut_('rkv:data', data, RKV.TTL);
  return data;
}

/** Xác thực phiên Report Hub (cùng cách Training Hub ký — RH_Auth.gs) */
function rkvViewer_(tk) {
  tk = String(tk || '').trim();
  var dot = tk.indexOf('.');
  if (dot < 10) return {err: 'Chưa đăng nhập bằng email.'};
  var sc = CacheService.getScriptCache(), secret = sc.get('rkv:sec'), users = null;
  try { users = JSON.parse(sc.get('rkv:users') || 'null'); } catch (e) {}
  if (!secret || !users) {
    var tm = SpreadsheetApp.openById(RKV.TRAINING_MASTER);
    var ss = tm.getSheetByName('RH_Secret'), us = tm.getSheetByName('RH_Users');
    if (!ss || !us) return {err: 'Chưa có danh sách người dùng Report Hub.'};
    secret = String(ss.getRange(2, 1).getValue() || '');
    var uv = us.getLastRow() < 2 ? [] : us.getRange(2, 1, us.getLastRow() - 1, 6).getValues();
    users = uv.filter(function(r){ return r[0] && r[1]; }).map(function(r){
      var e = String(r[0]).toLowerCase(), at = e.indexOf('@');
      return {local: at < 0 ? e : e.substring(0, at), pic: String(r[1]).trim(), level: String(r[2] || 'pic').toLowerCase().trim(),
              admin: r[3] === true || /^(true|x|1)$/i.test(String(r[3])), active: r[4] === '' || r[4] === true || /^(true|x|1)$/i.test(String(r[4])),
              session: Math.max(1, parseInt(r[5], 10) || 1)};
    });
    if (secret.length >= 32) sc.put('rkv:sec', secret, 21600);
    sc.put('rkv:users', JSON.stringify(users), 600);
  }
  if (secret.length < 32) return {err: 'Chưa có khoá đăng nhập.'};
  var data = tk.substring(0, dot), sig = tk.substring(dot + 1);
  var calc = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, secret)).replace(/=+$/, '');
  if (calc !== sig) return {err: 'Phiên đăng nhập không hợp lệ.'};
  var t;
  try { t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); } catch (e) { return {err: 'Phiên đăng nhập không hợp lệ.'}; }
  if (!t || !t.x || Date.now() > t.x) return {err: 'Phiên đăng nhập đã hết hạn.'};
  var u = users.filter(function(x){ return x.local === t.e; })[0];
  if (!u || !u.active) return {err: 'Tài khoản không còn quyền dùng Report Hub.'};
  if ((t.s || 1) !== u.session) return {err: 'Phiên đăng nhập đã bị đăng xuất từ xa.'};
  return {u: u};
}

/** Phạm vi xem của 1 người (Director tất cả · HOD cả phòng · Team Leader nhóm mình · PIC chỉ mình) */
function rkvScope_(u, d) {
  var alias = {nguyenha: '', minhviet: 'Viet'}, mk = rkvKey_(u.pic);
  var myName = alias.hasOwnProperty(mk) ? alias[mk] : '';
  if (!myName) Object.keys(d.staff).forEach(function(k){ if (rkvKey_(k) === mk) myName = k; });
  var me = d.staff[myName] || {}, role = String(me.role || '').toLowerCase(), st = function(m){ return d.staff[m] || {}; };
  var scope, see;
  if (u.level === 'director' || /director/i.test(me.level || '') || mk === 'nguyenha') { scope = 'all'; see = function(){ return true; }; }
  else if (u.level === 'hod' || role === 'hod') { scope = 'dept'; var dp = rkvKey_(me.dept); see = function(m, dept){ return m === myName || (dp && rkvKey_(st(m).dept || dept) === dp); }; }
  else if (u.level === 'lead' || /team leader/.test(role)) { scope = 'team'; see = function(m){ return m === myName || (me.team && rkvKey_(st(m).team) === rkvKey_(me.team)); }; }
  else { scope = 'self'; see = function(m){ return m === myName; }; }
  return {myName: myName || u.pic, scope: scope, see: see};
}

/** KPI theo phạm vi người xem (+ danh bạ tổ chức gọn để điền form Setting Expectation) */
function rkvKpi_(p) {
  var vw = rkvViewer_(p.tk);
  if (vw.err) return {ok: false, code: 'AUTH', error: vw.err};
  var d = rkvData_(), sc = rkvScope_(vw.u, d);
  var rows = d.rows.filter(function(r){ return sc.see(r.member, r.dept); }), staff = {};
  rows.forEach(function(r){ if (d.staff[r.member]) staff[r.member] = d.staff[r.member]; });
  var org = Object.keys(d.staff).map(function(k){ var s = d.staff[k]; return {key: k, full: s.full, role: s.role, team: s.team, dept: s.dept, level: s.level}; });
  Object.keys(d.staff).forEach(function(k){ var s = d.staff[k]; if (/director/i.test(s.level || '')) org.push({key: '', full: s.full, role: 'Director', level: s.level}); });
  return {ok: true, me: sc.myName, scope: sc.scope, periods: d.periods, rows: rows, staff: staff, org: org, at: d.at, v: RKV.VERSION};
}

/** Email báo cáo KPI tháng — dùng nguyên mẫu email của KpiSyncCenter (kscMailData / kscMailHtml_ / kscMailSend) */
function rkvMail_(p, mode) {
  var vw = rkvViewer_(p.tk);
  if (vw.err) return {ok: false, code: 'AUTH', error: vw.err};
  var d = rkvData_(), sc = rkvScope_(vw.u, d), pic = String(p.pic || sc.myName).trim(), month = String(p.month || '').trim();
  if (!d.rows.some(function(r){ return r.member === pic; })) return {ok: false, error: 'Không có KPI của ' + pic + '.'};
  if (!sc.see(pic)) return {ok: false, code: 'FORBIDDEN', error: 'Bạn không xem được KPI của ' + pic + '.'};
  if (!/^\d{6}$/.test(month)) return {ok: false, error: 'Tháng không hợp lệ.'};
  if (mode === 'data') {
    var md = kscMailData(pic, month);
    if (!md.ok) return md;
    return {ok: true, data: md};
  }
  var f = {pic: pic, month: month, greeting: String(p.greeting || ''), intro: String(p.intro || ''), showQ: String(p.showQ) !== '0',
           analysis: String(p.analysis || ''), highlights: String(p.highlights || ''), sign: String(p.sign || ''),
           subject: String(p.subject || ''), to: String(p.to || ''), cc: String(p.cc || '')};
  if (mode === 'preview') return kscMailPreview(f);
  var only = function(s){ return String(s || '').split(/[,;\s]+/).filter(function(e){ return e; }).every(function(e){ return /@(mani\.inc|manimedicalhanoi\.com)$/i.test(e); }); };
  if (!only(f.to) || !only(f.cc)) return {ok: false, error: 'Chỉ gửi tới email công ty (@mani.inc / @manimedicalhanoi.com).'};
  var r = kscMailSend(f);
  if (r && r.ok) { r.message = r.msg; try { console.log('[rhKpiMailSend] ' + vw.u.pic + ' gửi KPI ' + pic + ' ' + month); } catch (e) {} }
  return r;
}
