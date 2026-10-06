/**
 * ============================================================================
 *  MMH CALENDAR FEED — Công tác + Marketing (Online + Offline)    v3.2 · 10/2026
 * ----------------------------------------------------------------------------
 *  Web app ĐỘC LẬP cấp dữ liệu cho "MMH Calendar" trên Report Hub — trả về tức thì:
 *    · ?action=mmhCalendar&src=trip     → chuyến công tác  (file Business Trip, sheet "MMH Travel report")
 *    · ?action=mmhCalendar&src=offline  → sự kiện offline  (file Marketing Offline, sheet REPORT_EVENT)
 *    · ?action=mmhCalendar&src=online   → bài đăng sự kiện / sản phẩm (file Digital Marketing,
 *                                         sheet EVENT REPORT + PRODUCT REPORT)
 *  ★ v3.2: SỬA / THÊM / XOÁ sự kiện offline (REPORT_EVENT) và bài đăng (EVENT REPORT / PRODUCT REPORT)
 *        ngay trên MMH Calendar: ?action=mmhOptions (danh sách chọn đọc từ Data validation của sheet),
 *        ?action=mmhWrite&op=update|add|delete. KHÔNG ghi vào cột có công thức; ghi nhật ký người sửa.
 *  ★ v3.1: Công tác trả kèm NỘI DUNG báo cáo công tác + ngày nộp (xem ngay trên lịch).
 *  ★ v3: đọc nhanh (chỉ đọc link của cột cần), lưu đệm 15 phút + trigger tự làm mới mỗi 10 phút
 *        ⇒ lịch gần như không phải chờ. Thêm nguồn Công tác (có số dòng để mở báo cáo công tác).
 *  Ghi dữ liệu chỉ qua mmhWrite (tài khoản triển khai phải có quyền SỬA 2 file Marketing).
 *
 *  CẬP NHẬT TỪ v2 (2 phút):
 *    1. Dán đè TOÀN BỘ Mã.gs bằng file này ▸ Lưu.
 *    2. Chọn hàm  caiDatTuDong  ▸ ▶ Chạy ▸ cấp quyền  (tạo trigger làm mới 10 phút/lần + chạy thử;
 *       Nhật ký phải thấy số chuyến / sự kiện / bài).
 *    3. Triển khai ▸ Quản lý tác vụ triển khai ▸ ✏️ ▸ Phiên bản: Phiên bản mới ▸ Triển khai
 *       (giữ nguyên link /exec).
 * ============================================================================
 */
var MMH_FEED = {
  OFFLINE_ID  : '16vIDYRhm6Cj9DN4C26rvbBPW1hF3vAnZ7lgl6Bd02w8',   // "2. Vietnam - Marketing Offline FY68"
  ONLINE_ID   : '1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc',   // "3. Vietnam - Digital Marketing & Design FY68"
  TRIP_ID     : '15dAQYOG1aJRX-jByVmRFeSFOIPRtdVW7wDvwC_nxJUA',   // "Vietnam - Business trip Approval and Report"
  OFF_SHEETS  : ['REPORT_EVENT', 'PLAN_EVENT'],
  ON_EVENT    : 'EVENT REPORT',
  ON_PRODUCT  : 'PRODUCT REPORT',
  TRIP_SHEET  : 'MMH Travel report',
  TRIP_MONTHS : 14,          // lấy chuyến công tác trong ~14 tháng gần nhất
  CACHE_SEC   : 900,         // 15 phút (trigger làm mới mỗi 10 phút)
  EDITORS     : []           // ★ v3.2: để trống = mọi tài khoản công ty được sửa; hoặc liệt kê email được sửa
};
var MMH_SRC = {
  trip   : {fn:'mmhFeedTrip_',    key:'mmhFeedTrip'},
  offline: {fn:'mmhFeedOffline_', key:'mmhFeedOff'},
  online : {fn:'mmhFeedOnline_',  key:'mmhFeedOn'}
};

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    var src = String(p.src || '').toLowerCase();
    if (p.action === 'ping') out = {ok:true, pong:true, v:'3.2'};
    else if (p.action === 'mmhOptions') out = mmhOptions_(p);
    else if (p.action === 'mmhWrite') out = mmhWrite_(p);
    else if (MMH_SRC[src]) out = mmhFeedGet_(src, p.fresh === '1');
    else out = {ok:true, trip:mmhFeedGet_('trip'), offline:mmhFeedGet_('offline'), online:mmhFeedGet_('online')};
  } catch (err) { out = {ok:false, error:String((err && err.message) || err)}; }
  var json = JSON.stringify(out);
  var cb = String(p.callback || '').replace(/[^\w$.]/g, '');
  return cb
    ? ContentService.createTextOutput(cb + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/** Lấy dữ liệu: đệm (CacheService, chia nhỏ nếu > 90KB) → nếu hết hạn thì đọc sheet */
function mmhFeedGet_(src, fresh) {
  var S = MMH_SRC[src], cache = CacheService.getScriptCache();
  if (!fresh) { var hit = mmhCacheRead_(cache, S.key); if (hit) return hit; }
  var res = this[S.fn] ? this[S.fn]() : eval(S.fn + '()');
  res.cachedAt = new Date().getTime();
  mmhCacheWrite_(cache, S.key, res);
  return res;
}
function mmhCacheRead_(cache, key) {
  try {
    var n = +cache.get(key + ':n'); if (!n) return null;
    var keys = []; for (var i = 0; i < n; i++) keys.push(key + ':' + i);
    var got = cache.getAll(keys), s = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) return null; s += got[keys[j]]; }
    return JSON.parse(s);
  } catch (e) { return null; }
}
function mmhCacheWrite_(cache, key, obj) {
  try {
    var s = JSON.stringify(obj), parts = {}, n = Math.ceil(s.length / 90000) || 1;
    for (var i = 0; i < n; i++) parts[key + ':' + i] = s.substring(i * 90000, (i + 1) * 90000);
    parts[key + ':n'] = String(n);
    cache.putAll(parts, MMH_FEED.CACHE_SEC);
  } catch (e) {}
}

/** Trigger 10 phút/lần: đọc lại 3 nguồn để đệm luôn sẵn ⇒ lịch mở là có ngay */
function lamMoiFeed() { ['trip', 'offline', 'online'].forEach(function(s){ try { mmhFeedGet_(s, true); } catch (e) { console.error(s + ': ' + e.message); } }); }

/** Chạy 1 lần: tạo trigger tự làm mới + kiểm tra đọc đúng 3 file */
function caiDatTuDong() {
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'lamMoiFeed') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('lamMoiFeed').timeBased().everyMinutes(10).create();
  kiemTraFeed();
}

/** Kiểm tra nhanh trong trình soạn thảo */
function kiemTraFeed() {
  var t = mmhFeedGet_('trip', true), a = mmhFeedGet_('offline', true), b = mmhFeedGet_('online', true);
  Logger.log('CÔNG TÁC: ' + t.file + ' → ' + t.events.length + ' chuyến');
  Logger.log('OFFLINE : ' + a.file + ' / ' + a.sheet + ' → ' + a.events.length + ' sự kiện');
  Logger.log('ONLINE  : ' + b.file + ' → ' + b.events.length + ' bài');
}

/** Mở file theo ID (dán nguyên link cũng được) */
function mmhFeedOpen_(id, label) {
  id = String(id || '').trim();
  var m = id.match(/\/d\/([a-zA-Z0-9_-]{20,})/); if (m) id = m[1];
  if (!id) throw new Error('Chưa điền ID file ' + label + ' vào MMH_FEED.');
  try { return SpreadsheetApp.openById(id); }
  catch (e) { throw new Error('Không mở được file ' + label + ' (ID ' + id + '): ' + e.message + ' — kiểm tra quyền xem file của tài khoản triển khai.'); }
}
/** Chọn đúng file có sheet cần dùng (phòng khi 2 ID Marketing bị đảo) */
function mmhFeedPick_(preferId, otherId, sheets, label) {
  var a = mmhFeedOpen_(preferId, label);
  var has = function(ss){ return sheets.some(function(n){ return !!ss.getSheetByName(n); }); };
  if (has(a)) return a;
  try { var b = mmhFeedOpen_(otherId, label); if (has(b)) return b; } catch (e) {}
  throw new Error('File ' + a.getName() + ' không có sheet ' + sheets.join(' / ') + ' — kiểm tra lại ID trong MMH_FEED.');
}
/** Đọc link (hyperlink) của 1 cột — chỉ cột đó, không đọc cả bảng */
function mmhCalLinks_(sh, H, col, nVals) {
  var out = [];
  if (col < 0) return out;
  var first = H.row + 2, n = nVals - H.row - 1;
  if (n <= 0) return out;
  var rt = [];
  try { rt = sh.getRange(first, col + 1, n, 1).getRichTextValues(); } catch (e) { return out; }
  for (var i = 0; i < n; i++) {
    var u = '', v = rt[i] && rt[i][0];
    try { if (v) { u = v.getLinkUrl() || ''; if (!u) v.getRuns().forEach(function(x){ if (!u && x.getLinkUrl()) u = x.getLinkUrl(); }); } } catch (e) {}
    out[H.row + 1 + i] = u;
  }
  return out;
}

function mmhFeedOffline_() {
  var ss = mmhFeedPick_(MMH_FEED.OFFLINE_ID, MMH_FEED.ONLINE_ID, MMH_FEED.OFF_SHEETS, '"2. Vietnam - Marketing Offline FY68"');
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var events = [], used = '';
  for (var i = 0; i < MMH_FEED.OFF_SHEETS.length && !events.length; i++) {
    var sh = ss.getSheetByName(MMH_FEED.OFF_SHEETS[i]);
    if (!sh) continue;
    events = mmhCalOffRead_(sh, tz); used = sh.getName();
  }
  return {ok:true, source:'mkt-offline', file:ss.getName(), sheet:used, updated:Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'), events:events};
}

function mmhFeedOnline_() {
  var ss = mmhFeedPick_(MMH_FEED.ONLINE_ID, MMH_FEED.OFFLINE_ID, [MMH_FEED.ON_EVENT, MMH_FEED.ON_PRODUCT], '"3. Vietnam - Digital Marketing & Design FY68"');
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var events = [];
  var shE = ss.getSheetByName(MMH_FEED.ON_EVENT), shP = ss.getSheetByName(MMH_FEED.ON_PRODUCT);
  if (shE) events = events.concat(mmhCalOnRead_(shE, tz, 'event'));
  if (shP) events = events.concat(mmhCalOnRead_(shP, tz, 'product'));
  return {ok:true, source:'mkt-online', file:ss.getName(), updated:Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'), events:events};
}

function mmhFeedTrip_() {
  var ss = mmhFeedOpen_(MMH_FEED.TRIP_ID, '"Vietnam - Business trip Approval and Report"');
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var sh = ss.getSheetByName(MMH_FEED.TRIP_SHEET);
  if (!sh) throw new Error('File Business Trip không có sheet "' + MMH_FEED.TRIP_SHEET + '".');
  return {ok:true, source:'business-trip', file:ss.getName(), updated:Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'), events:mmhCalTripRead_(sh, tz)};
}

function mmhCalKey_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}
/** Tìm dòng tiêu đề (trong 8 dòng đầu) có chứa các cột bắt buộc → {row, col:{key:index}} */
function mmhCalHeader_(vals, must) {
  for (var r = 0; r < Math.min(8, vals.length); r++) {
    var col = {};
    vals[r].forEach(function(v, c){ var k = mmhCalKey_(v); if (k && col[k] === undefined) col[k] = c; });
    if (must.every(function(m){ return col[m] !== undefined; })) return {row:r, col:col};
  }
  return null;
}
function mmhCalPick_(H, names) {
  for (var i = 0; i < names.length; i++) { var k = mmhCalKey_(names[i]); if (H.col[k] !== undefined) return H.col[k]; }
  for (var j = 0; j < names.length; j++) {                 // khớp tiền tố (VD "Target sales JIZAI")
    var p = mmhCalKey_(names[j]);
    for (var key in H.col) if (key.indexOf(p) === 0) return H.col[key];
  }
  return -1;
}
function mmhCalPad_(n) { return (n < 10 ? '0' : '') + n; }
function mmhCalIso_(y, m, d) { return y + '-' + mmhCalPad_(m) + '-' + mmhCalPad_(d); }

/** Ngày sự kiện: 20260910 · "20261026-29" · "20261031-1102" · Date · dd/mm/yyyy.
 *  monthKey (yyyymm cột Month) dùng để sửa lỗi gõ năm (VD 20251009 trong tháng 202610). */
function mmhCalOffDates_(v, name, monthKey, tz) {
  var s = '';
  if (v instanceof Date && !isNaN(v)) s = Utilities.formatDate(v, tz, 'yyyyMMdd');
  else s = String(v == null ? '' : v).trim();
  if (!s) { var m0 = String(name || '').trim().match(/^(\d{8}(?:\s*-\s*\d{2,4})?)/); if (m0) s = m0[1]; }
  var y, mo, d, ey, emo, ed, m;
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})(?:\.0+)?\s*(?:-\s*(\d{2,4}))?/))) {
    y = +m[1]; mo = +m[2]; d = +m[3];
    if (m[4]) { if (m[4].length === 4) { emo = +m[4].slice(0, 2); ed = +m[4].slice(2); } else { emo = mo; ed = +m[4]; } }
  } else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) {
    d = +m[1]; mo = +m[2]; y = +m[3];
  } else return null;
  var mk = String(monthKey || '').replace(/\.0+$/, '');
  if (/^\d{6}$/.test(mk) && +mk.slice(4) === mo && +mk.slice(0, 4) !== y) y = +mk.slice(0, 4);   // sửa năm gõ nhầm
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  ey = y; if (emo && emo < mo) ey = y + 1;
  var start = mmhCalIso_(y, mo, d), end = ed ? mmhCalIso_(ey, emo, ed) : start;
  if (end < start) end = start;
  return {start:start, end:end};
}

function mmhCalOffRead_(sh, tz) {
  var rng = sh.getDataRange(), vals = rng.getValues();
  var H = mmhCalHeader_(vals, ['eventname']);
  if (!H) return [];
  var LK = {};                                  // ★ v3: chỉ đọc link của đúng cột cần (nhanh hơn rất nhiều)
  var C = {
    month : mmhCalPick_(H, ['Month']),           date  : mmhCalPick_(H, ['Date']),
    name  : mmhCalPick_(H, ['Event Name']),      type  : mmhCalPick_(H, ['Type of event']),
    prod  : mmhCalPick_(H, ['Target product']),  seg   : mmhCalPick_(H, ['Segment']),
    topic : mmhCalPick_(H, ['Topic']),           kol   : mmhCalPick_(H, ['KOL/ ACC', 'KOL']),
    partner: mmhCalPick_(H, ['Partner']),        place : mmhCalPick_(H, ['Place']),
    area  : mmhCalPick_(H, ['Area']),            plan  : mmhCalPick_(H, ['Plan status']),
    action: mmhCalPick_(H, ['Action Status']),   folder: mmhCalPick_(H, ['Detail event folder link', 'folder']),
    review: mmhCalPick_(H, ['Event review']),    tPart : mmhCalPick_(H, ['Target Participant']),
    aPart : mmhCalPick_(H, ['Actual Participant']), aSales: mmhCalPick_(H, ['Actual sales amount']),
    tSales: mmhCalPick_(H, ['Sales amount']),
    tJizai: mmhCalPick_(H, ['Target sales JIZAI']), tComp: mmhCalPick_(H, ['Target sales Composite'])
  };
  LK.folder = mmhCalLinks_(sh, H, C.folder, vals.length);
  var g = function(r, k){ return C[k] < 0 ? '' : r[C[k]]; };
  var t = function(r, k){ var v = g(r, k); return v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v).trim(); };
  var link = function(i, k){
    if (C[k] < 0) return '';
    var u = '';
    u = (LK[k] && LK[k][i]) || '';
    var raw = String(vals[i][C[k]] || '').trim();
    return u || (/^https?:\/\//i.test(raw) ? raw : '');
  };
  var out = [];
  for (var i = H.row + 1; i < vals.length; i++) {
    var r = vals[i], name = t(r, 'name');
    if (!name) continue;
    var month = t(r, 'month').replace(/\.0+$/, '');
    var dt = mmhCalOffDates_(g(r, 'date'), name, month, tz);
    var plan = t(r, 'plan'), act = t(r, 'action');
    out.push({
      kind:'offline', row:i + 1,
      title: name.replace(/^\d{8}(?:\s*-\s*\d{2,4})?\s*/, '').trim() || name,
      fullName: name, date: dt ? dt.start : '', endDate: dt ? dt.end : '',
      month: /^\d{6}$/.test(month) ? month.slice(0, 4) + '-' + month.slice(4) : '',
      type: t(r, 'type'), product: t(r, 'prod'), segment: t(r, 'seg'), topic: t(r, 'topic'),
      kol: t(r, 'kol'), partner: t(r, 'partner'), place: t(r, 'place'), area: t(r, 'area'),
      planStatus: plan, actionStatus: act,
      status: /cancel/i.test(act) ? 'Cancel' : (/^fixed$/i.test(plan) ? 'Fixed' : (plan || 'Plan')),
      folder: link(i, 'folder'), review: t(r, 'review').substring(0, 3000),
      targetParticipant: t(r, 'tPart'), actualParticipant: t(r, 'aPart'),
      targetSales: t(r, 'tSales'), actualSales: t(r, 'aSales'),
      targetJizai: t(r, 'tJizai'), targetComposite: t(r, 'tComp')
    });
  }
  return out;
}

/** Ô ngày → yyyy-MM-dd (Date, dd/mm/yyyy, yyyy-mm-dd) */
function mmhCalOnDate_(v, tz) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function mmhCalOnRead_(sh, tz, kind) {
  var rng = sh.getDataRange(), vals = rng.getValues();
  var H = mmhCalHeader_(vals, kind === 'event' ? ['event', 'format'] : ['type', 'format']);
  if (!H) return [];
  var LK = {};                                  // ★ v3: chỉ đọc link của đúng cột cần (nhanh hơn rất nhiều)
  var C = {
    month : mmhCalPick_(H, ['Month']),            event : mmhCalPick_(H, ['Event']),
    kol   : mmhCalPick_(H, ['KOL']),              format: mmhCalPick_(H, ['Format']),
    pillar: mmhCalPick_(H, ['Pillar']),           ctype : mmhCalPick_(H, ['Type of content']),
    ptype : mmhCalPick_(H, ['Type']),             reason: mmhCalPick_(H, ['Reason']),
    topic : mmhCalPick_(H, ['Topic']),            main  : mmhCalPick_(H, ['Main content']),
    page  : mmhCalPick_(H, ['Page']),             plan  : mmhCalPick_(H, ['On-air dự kiến', 'Onair du kien']),
    actual: mmhCalPick_(H, ['On-air thực tế', 'Onair thuc te']), status: mmhCalPick_(H, ['Status']),
    note  : mmhCalPick_(H, ['Note']),             link  : mmhCalPick_(H, ['Link report', 'Link'])
  };
  if (kind === 'event') C.ptype = -1;
  LK.link = mmhCalLinks_(sh, H, C.link, vals.length);
  var g = function(r, k){ return C[k] < 0 ? '' : r[C[k]]; };
  var t = function(r, k){ var v = g(r, k); return v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v).trim(); };
  var link = function(i){
    if (C.link < 0) return '';
    var u = '';
    u = (LK.link && LK.link[i]) || '';
    var raw = String(vals[i][C.link] || '').trim();
    var m = raw.match(/https?:\/\/\S+/g);
    return u || (m ? m[m.length - 1] : '');
  };
  var out = [];
  for (var i = H.row + 1; i < vals.length; i++) {
    var r = vals[i];
    var ev = t(r, 'event'), pt = t(r, 'ptype'), topic = t(r, 'topic'), fmt = t(r, 'format');
    if (kind === 'event' ? !ev : !(pt || topic)) continue;
    if (!fmt && !t(r, 'pillar')) continue;
    var month = t(r, 'month').replace(/\.0+$/, '');
    var planned = mmhCalOnDate_(g(r, 'plan'), tz), actual = mmhCalOnDate_(g(r, 'actual'), tz);
    var ctype = t(r, 'ctype');
    out.push({
      kind: kind, row: i + 1,
      title: kind === 'event' ? ((ctype ? ctype + ' · ' : '') + ev.replace(/^\d{8}(?:\s*-\s*\d{2,4})?\s*/, '')) : (topic || pt),
      event: ev, kol: t(r, 'kol'), format: fmt, pillar: t(r, 'pillar'), ctype: ctype,
      ptype: pt, reason: t(r, 'reason'), topic: topic, main: t(r, 'main').substring(0, 3000),
      page: t(r, 'page'), planned: planned, actual: actual, date: actual || planned,
      month: /^\d{6}$/.test(month) ? month.slice(0, 4) + '-' + month.slice(4) : '',
      design: /design/i.test(fmt), status: t(r, 'status'), note: t(r, 'note'), link: link(i)
    });
  }
  return out;
}

function mmhCalTripDate_(v, tz) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + mmhCalPad_(+m[2]) + '-' + mmhCalPad_(+m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/))) return m[3] + '-' + mmhCalPad_(+m[2]) + '-' + mmhCalPad_(+m[1]);
  return '';
}
function mmhCalTripRead_(sh, tz) {
  var vals = sh.getDataRange().getValues();
  var H = mmhCalHeader_(vals, ['pic', 'startdate', 'finishdate']);
  if (!H) return [];
  var C = {
    pic   : mmhCalPick_(H, ['PIC']),               start : mmhCalPick_(H, ['Start date']),
    finish: mmhCalPick_(H, ['Finish date']),       days  : mmhCalPick_(H, ['Working date']),
    dest  : mmhCalPick_(H, ['Destination']),       co    : mmhCalPick_(H, ['Co-traveler']),
    purpose: mmhCalPick_(H, ['Purpose']),          expect: mmhCalPick_(H, ['Expected result']),
    total : mmhCalPick_(H, ['Total estimated costs']), sched: mmhCalPick_(H, ['Schedule']),
    equip : mmhCalPick_(H, ['Equipment']),         fname : mmhCalPick_(H, ['Folder name']),
    flink : mmhCalPick_(H, ['Folder link']),       report: mmhCalPick_(H, ['Business trip Report']),
    status: mmhCalPick_(H, ['Approval Status']),   cmt   : mmhCalPick_(H, ['Manager']),
    rdate : mmhCalPick_(H, ['Actual report date']), rdl  : mmhCalPick_(H, ['Report Deadline']),
    no    : mmhCalPick_(H, ['No'])
  };
  var since = new Date(); since.setMonth(since.getMonth() - MMH_FEED.TRIP_MONTHS);
  var sinceIso = Utilities.formatDate(since, tz, 'yyyy-MM-dd');
  var LK = mmhCalLinks_(sh, H, C.flink >= 0 ? C.flink : C.fname, vals.length);
  var g = function(r, k){ return C[k] < 0 ? '' : r[C[k]]; };
  var t = function(r, k){ var v = g(r, k); return v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v).trim(); };
  var out = [];
  for (var i = H.row + 1; i < vals.length; i++) {
    var r = vals[i], pic = t(r, 'pic');
    var st = mmhCalTripDate_(g(r, 'start'), tz), en = mmhCalTripDate_(g(r, 'finish'), tz) || st;
    if (!pic || !st || /^choose$/i.test(pic)) continue;
    if (en < st) en = st;
    if (en < sinceIso) continue;
    var days = Math.round((new Date(en) - new Date(st)) / 86400000) + 1;
    var raw = String(vals[i][C.flink] || '').trim();
    out.push({
      kind:'trip', row:i + 1, id:t(r, 'no'), pic:pic, title:pic + ' · ' + (t(r, 'dest') || 'Công tác'),
      date:st, endDate:en, days:+g(r, 'days') || days,
      destination:t(r, 'dest'), coTraveler:t(r, 'co'), purpose:t(r, 'purpose').substring(0, 400),
      expected:t(r, 'expect').substring(0, 300), schedule:t(r, 'sched').substring(0, 400),
      equipment:t(r, 'equip'), costTotal:parseInt(String(g(r, 'total')).replace(/[^\d]/g, ''), 10) || 0,
      folder:LK[i] || (/^https?:\/\//i.test(raw) ? raw : ''),
      status:t(r, 'status') || 'Not Yet', comment:t(r, 'cmt').substring(0, 300), reported:!!t(r, 'report'),
      report:t(r, 'report').substring(0, 3000), reportDate:mmhCalTripDate_(g(r, 'rdate'), tz), reportDeadline:mmhCalTripDate_(g(r, 'rdl'), tz)
    });
  }
  return out;
}


/* ══════════════ ★ v3.2 — SỬA / THÊM / XOÁ TỪ MMH CALENDAR ══════════════
   Cột được phép ghi (theo tên tiêu đề). Ô đang có CÔNG THỨC luôn được bỏ qua. */
var MMH_W = {
  offline: { file:'off', sheets:MMH_FEED.OFF_SHEETS.slice(0, 1), must:['eventname'], key:'Event Name', autoDate:null,
    cols:{ month:['Month'], date:['Date'], type:['Type of event'], prod:['Target product'], seg:['Segment'], topic:['Topic'],
           kol:['KOL/ ACC', 'KOL'], partner:['Partner'], place:['Place'], plan:['Plan status'], action:['Action Status'],
           folder:['Detail event folder link'], review:['Event review'], tPart:['Target Participant'],
           tJizai:['Target sales JIZAI'], tComp:['Target sales Composite'], aSales:['Actual sales amount'] } },
  event:   { file:'on', sheets:[MMH_FEED.ON_EVENT], must:['event', 'format'], key:'Event', autoDate:['Ngày điền link'],
    cols:{ month:['Month'], event:['Event'], kol:['KOL'], format:['Format'], pillar:['Pillar'], ctype:['Type of content'],
           main:['Main content'], page:['Page'], plan:['On-air dự kiến'], actual:['On-air thực tế'], status:['Status'],
           note:['Note'], link:['Link report'] } },
  product: { file:'on', sheets:[MMH_FEED.ON_PRODUCT], must:['type', 'format'], key:'Topic', autoDate:['Ngày điền link'],
    cols:{ month:['Month'], ptype:['Type'], pillar:['Pillar'], format:['Format'], reason:['Reason'], topic:['Topic'],
           main:['Main content'], page:['Page'], plan:['On-air dự kiến'], actual:['On-air thực tế'], status:['Status'], link:['Link report'] } }
};
var MMH_DATE_F = { plan:1, actual:1 };
var MMH_NUM_F = { month:1, tPart:1, tJizai:1, tComp:1, aSales:1 };

function mmhWSheet_(kind) {
  var W = MMH_W[kind]; if (!W) throw new Error('Loại dữ liệu không hợp lệ: ' + kind);
  var ss = W.file === 'off'
    ? mmhFeedPick_(MMH_FEED.OFFLINE_ID, MMH_FEED.ONLINE_ID, W.sheets, '"2. Vietnam - Marketing Offline FY68"')
    : mmhFeedPick_(MMH_FEED.ONLINE_ID, MMH_FEED.OFFLINE_ID, W.sheets, '"3. Vietnam - Digital Marketing & Design FY68"');
  var sh = ss.getSheetByName(W.sheets[0]);
  var vals = sh.getDataRange().getValues();
  var H = mmhCalHeader_(vals, W.must);
  if (!H) throw new Error('Không tìm thấy dòng tiêu đề của sheet ' + sh.getName());
  var C = {}; Object.keys(W.cols).forEach(function(k){ C[k] = mmhCalPick_(H, W.cols[k]); });
  var key = mmhCalPick_(H, [W.key]);
  var auto = W.autoDate ? mmhCalPick_(H, W.autoDate) : -1;
  var no = mmhCalPick_(H, ['No']);
  return {W:W, ss:ss, sh:sh, vals:vals, H:H, C:C, key:key, auto:auto, no:no, tz:ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh'};
}

/** Danh sách chọn của từng cột — đọc từ Data validation của dòng dữ liệu đầu tiên (sửa danh mục trên sheet là app tự theo) */
function mmhOptions_(p) {
  var kind = String(p.kind || ''), X = mmhWSheet_(kind), out = {};
  var r0 = X.H.row + 2;
  Object.keys(X.C).forEach(function(k){
    var c = X.C[k]; if (c < 0) return;
    var list = [];
    try {
      var dv = X.sh.getRange(r0, c + 1).getDataValidation();
      if (dv) {
        var t = dv.getCriteriaType(), a = dv.getCriteriaValues();
        if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) list = (a[0] || []).map(String);
        else if (t === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE && a[0]) {
          a[0].getValues().forEach(function(row){ row.forEach(function(v){ if (v !== '' && v !== null) list.push(String(v)); }); });
        }
      }
    } catch (e) {}
    var seen = {};
    list = list.map(function(v){ return String(v).trim(); }).filter(function(v){ if (!v || seen[v]) return false; seen[v] = 1; return true; });
    if (list.length) out[k] = list.slice(0, 400);
  });
  return {ok:true, kind:kind, options:out, fields:Object.keys(X.C).filter(function(k){ return X.C[k] >= 0; })};
}

function mmhWriteVal_(k, v, tz) {
  v = v == null ? '' : String(v).trim();
  if (v === '') return '';
  if (MMH_DATE_F[k]) { var m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); }
  if (MMH_NUM_F[k] && /^-?\d+(\.\d+)?$/.test(v.replace(/[.,](?=\d{3}\b)/g, ''))) return Number(v.replace(/[.,](?=\d{3}\b)/g, ''));
  return v;
}

/** op=update|add|delete · kind=offline|event|product · row (update/delete) · check = giá trị cột khoá để xác nhận đúng dòng · data = JSON */
function mmhWrite_(p) {
  var op = String(p.op || ''), kind = String(p.kind || '');
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  if (MMH_FEED.EDITORS.length && MMH_FEED.EDITORS.map(function(x){ return String(x).toLowerCase(); }).indexOf(email.toLowerCase()) < 0)
    throw new Error('Tài khoản ' + (email || '(không xác định)') + ' chưa được phép sửa dữ liệu Marketing.');
  var data = {}; try { data = JSON.parse(p.data || '{}'); } catch (e) { throw new Error('Dữ liệu gửi lên không hợp lệ.'); }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var X = mmhWSheet_(kind), sh = X.sh, row = +p.row || 0, lastCol = sh.getLastColumn();
    var keyNow = function(r){ return X.key < 0 ? '' : String(sh.getRange(r, X.key + 1).getDisplayValue()).trim(); };
    var check = String(p.check || '').trim();
    if (op === 'update' || op === 'delete') {
      if (row <= X.H.row + 1 || row > sh.getLastRow()) throw new Error('Không tìm thấy dòng ' + row + ' trên sheet ' + sh.getName() + '.');
      if (check && keyNow(row) && mmhCalKey_(keyNow(row)) !== mmhCalKey_(check))
        throw new Error('Dòng ' + row + ' trên sheet đã thay đổi (có người vừa sửa / chèn dòng). Bấm ↻ Làm mới rồi thử lại.');
    }
    var by = (p.actor ? p.actor + ' · ' : '') + email;
    if (op === 'delete') {
      sh.deleteRow(row);
      mmhWLog_(op, kind, row, check, by);
    } else {
      if (op === 'add') {
        var last = X.H.row + 1;
        for (var i = X.vals.length - 1; i > X.H.row; i--) {
          var r = X.vals[i], filled = false;
          ['key', 'no'].forEach(function(k){ var c = X[k]; if (c >= 0 && String(r[c]).trim() !== '') filled = true; });
          Object.keys(X.C).forEach(function(k){ var c = X.C[k]; if (!filled && c >= 0 && String(r[c]).trim() !== '') filled = true; });
          if (filled) { last = i + 1; break; }
        }
        row = last + 1;
        if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
        if (last > X.H.row + 1) {
          var srcR = sh.getRange(last, 1, 1, lastCol);
          srcR.copyTo(sh.getRange(row, 1, 1, lastCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
          var fx = srcR.getFormulasR1C1()[0];
          fx.forEach(function(f, c){ if (f) sh.getRange(row, c + 1).setFormulaR1C1(f); });   // công thức (Event Name, Area, số liệu thực tế…)
        }
        if (X.no >= 0 && !sh.getRange(row, X.no + 1).getFormula()) {
          var mx = 0; X.vals.forEach(function(r, i){ if (i > X.H.row) { var n = +r[X.no]; if (n > mx) mx = n; } });
          sh.getRange(row, X.no + 1).setValue(mx + 1);
        }
      }
      var linkChanged = false;
      Object.keys(data).forEach(function(k){
        var c = X.C[k]; if (c === undefined || c < 0) return;
        var cell = sh.getRange(row, c + 1);
        if (cell.getFormula()) return;                              // không bao giờ ghi đè công thức
        var v = mmhWriteVal_(k, data[k], X.tz);
        if (k === 'link' || k === 'folder') {
          var old = String(cell.getDisplayValue()).trim();
          if (old !== String(v)) linkChanged = true;
          if (v && /^https?:\/\//i.test(v)) { cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(v).setLinkUrl(v).build()); return; }
        }
        cell.setValue(v);
      });
      if (linkChanged && X.auto >= 0 && data.link) sh.getRange(row, X.auto + 1).setValue(new Date());
      mmhWLog_(op, kind, row, check || data.event || data.topic || data.date || '', by);
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  var srcKey = kind === 'offline' ? 'offline' : 'online';
  var fresh = mmhFeedGet_(srcKey, true);                          // đọc lại ⇒ lịch cập nhật ngay
  return {ok:true, op:op, kind:kind, row:row, src:srcKey, data:fresh};
}
function mmhWLog_(op, kind, row, what, by) {
  try {
    var pr = PropertiesService.getScriptProperties(), L = JSON.parse(pr.getProperty('MMH_EDIT_LOG') || '[]');
    L.unshift([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'), op, kind, row, String(what).slice(0, 80), by]);
    pr.setProperty('MMH_EDIT_LOG', JSON.stringify(L.slice(0, 150)));
    console.log('mmhWrite ' + op + ' ' + kind + ' row ' + row + ' by ' + by + ' — ' + what);
  } catch (e) {}
}
/** Chạy tay trong Apps Script để xem 150 lần sửa gần nhất */
function xemNhatKySua() { console.log(PropertiesService.getScriptProperties().getProperty('MMH_EDIT_LOG') || '[]'); }
