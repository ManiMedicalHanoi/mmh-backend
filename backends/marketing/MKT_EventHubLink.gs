/*************************************************************************************************
 * MMH — MKT_EventHubLink.gs   (v1.2 · 31/10/2026) — nối app "Sự kiện MKT" với 2 file Marketing (CHỈ ĐỌC, không ghi vào 2 file)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Nguồn:
 *   "2. Vietnam - Marketing Offline FY68" (EVS_OFF_ID)
 *      · REPORT_EVENT / PLAN_EVENT (evsReadEvents_ ở Event_Sync.gs): trạng thái kế hoạch / thực hiện, hình thức, KOL, đối tác,
 *        khách mục tiêu / thực tế (KPI), doanh số mục tiêu / thực tế JIZAI · Composite, bằng chứng tham dự, Event review, folder.
 *      · CUSTOMER LIST: CHỈ ĐẾM (không gửi tên / SĐT về app) — số khách đăng ký, đã xác nhận tham dự (Ký tay / Zoom),
 *        đủ điều kiện KPI (Họ tên · SĐT · Nơi công tác + xác nhận — giống công thức Actual Participant v1.4 của MKT_SheetAuto.gs).
 *   "3. Vietnam - Digital Marketing & Design FY68" (EVS_ON_ID)
 *      · EVENT REPORT (evsReadPosts_): bài đăng của sự kiện (cột Event = tên sự kiện ở file Offline).
 *      · ORDER REPORT: yêu cầu thiết kế có "Key Task/ Event" trùng / chứa tên sự kiện.
 * Khớp: sự kiện của app có offlineName (ehSync_ ghi khi khớp ngày với file Offline) ⇒ so tên không dấu (evsNorm_);
 *       bài đăng / thiết kế so với offlineName lẫn tên sự kiện trên app.
 * Lưu: tab MKT_LINK của file Event Hub (eventId · readAt · json). ehBoot_ trả `link` = { eventId: {...} }.
 * Chạy: ehSyncTick_ ⇒ ehLinkTick_() (≤ 1 lần / 10 phút, chỉ khi 1 trong 2 file đổi hoặc danh sách sự kiện đổi) ·
 *       action ehLink (op=status | sync; key = 8 ký tự cuối EH.ROOT hoặc quản lý) · tay: ehLinkNow().
 * Không dùng dịch vụ mới (SpreadsheetApp / DriveApp / Properties / Cache) ⇒ không phải cấp quyền lại.
 *************************************************************************************************/
var EHL = { VER: '1.2', TAB: 'MKT_LINK', COLS: ['eventId', 'readAt', 'json'], EVERY: 600, MAX_JS: 45000 };

function ehlUrl_(id, gid, row){ return 'https://docs.google.com/spreadsheets/d/' + id + '/edit' + (gid != null ? '#gid=' + gid + (row ? '&range=A' + row : '') : ''); }
function ehlCut_(s, n){ s = evsS_(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function ehlGid_(ss, name){ try { var sh = ss.getSheetByName(name); return sh ? sh.getSheetId() : null; } catch(e){ return null; } }
function ehlYm_(v){
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyyMM');
  var m = /(20\d\d)\D?(\d{2})/.exec(evsS_(v)); return m ? m[1] + m[2] : '';
}
/* tên khớp? — bằng nhau, hoặc tên ngắn (≥ 10 ký tự) nằm trong tên dài */
function ehlSame_(a, b){ if (!a || !b) return false; if (a === b) return true; var s = a.length < b.length ? a : b, l = a.length < b.length ? b : a; return s.length >= 10 && l.indexOf(s) >= 0; }

/* CUSTOMER LIST ⇒ { nk: { all:{reg,conf,ok,sign,zoom}, ym:{yyyymm:{…}} } } — chỉ số đếm */
function ehlCust_(ssOff){
  var t = evsReadTab_(ssOff, ['CUSTOMER LIST'], 'Tel'), by = {};
  if (!t || !t.rows.length) return by;
  var cEv = null, cMo = null;
  t.rows.forEach(function(r){
    var ev = evsS_(evsGet_(t, r, ['Event name'])); if (!ev) return;
    var nk = evsNorm_(ev); if (!nk) return;
    var name = evsS_(evsGet_(t, r, ['Name'])); if (/^(form|auto|text|texting|select|date)\b/i.test(name)) return;   /* dòng gợi ý dưới tiêu đề */
    var tel = evsS_(evsGet_(t, r, ['Tel'])).replace(/[^0-9]/g, ''), work = evsS_(evsGet_(t, r, ['Workplace']));
    var conf = evsS_(evsGet_(t, r, ['Xác nhận tham dự'])), ym = ehlYm_(evsGet_(t, r, ['Event month']));
    var key = tel.length >= 9 ? tel.slice(-9) : 'r' + name.toLowerCase();
    var x = by[nk] = by[nk] || { all: {}, ym: {} };
    [x.all, ym ? (x.ym[ym] = x.ym[ym] || {}) : null].forEach(function(b){
      if (!b) return;
      b.reg = b.reg || {}; b.conf = b.conf || {}; b.ok = b.ok || {}; b.sign = b.sign || {}; b.zoom = b.zoom || {};
      b.reg[key] = 1;
      if (/^(ký tay|ky tay)$/i.test(conf)){ b.conf[key] = 1; b.sign[key] = 1; }
      else if (/^zoom$/i.test(conf)){ b.conf[key] = 1; b.zoom[key] = 1; }
      if (/^(ký tay|ky tay|zoom)$/i.test(conf) && name && tel.length >= 9 && work) b.ok[key] = 1;
    });
  });
  var cnt = function(b){ var o = {}; ['reg', 'conf', 'ok', 'sign', 'zoom'].forEach(function(k){ o[k] = Object.keys(b[k] || {}).length; }); return o; };
  Object.keys(by).forEach(function(nk){ var x = by[nk]; x.all = cnt(x.all); Object.keys(x.ym).forEach(function(m){ x.ym[m] = cnt(x.ym[m]); }); });
  return by;
}

/* ORDER REPORT ⇒ [{nk, task, type, qty, dl, st, chk, res, done, pic, req, pts, row}] */
function ehlDesigns_(ssOn){
  var t = evsReadTab_(ssOn, ['ORDER REPORT'], 'Deadline'), out = [];
  if (!t || !t.rows.length) return out;
  var links = evsLinks_(t, 'Task Result');
  t.rows.forEach(function(r, i){
    var task = evsS_(evsGet_(t, r, ['Key Task/ Event', 'Key Task', 'Event'])), type = evsS_(evsGet_(t, r, ['Dạng ấn phẩm']));
    if (!task) return;
    var res = evsS_(evsGet_(t, r, ['Task Result'])), lk = links[i] || ((/https?:\/\/\S+/.exec(res) || [])[0] || '');
    out.push({ nk: evsNorm_(task), task: ehlCut_(task, 120), type: ehlCut_(type, 80), qty: evsNum_(evsGet_(t, r, ['Số lượng'])) || '',
               dl: evsDateISO_(evsGet_(t, r, ['Deadline'])), st: ehlCut_(evsGet_(t, r, ['Status']), 40), chk: ehlCut_(evsGet_(t, r, ['Check deadline report']), 30),
               res: ehlCut_(res.replace(/https?:\/\/\S+/g, '').trim(), 140), lk: lk, done: evsDateISO_(evsGet_(t, r, ['Ngày điền link'])),
               pic: ehlCut_(evsGet_(t, r, ['PIC', 'Designer', 'Người thực hiện']), 40), req: ehlCut_(evsGet_(t, r, ['Requester', 'Người yêu cầu', 'Người order']), 40),
               pts: evsNum_(evsGet_(t, r, ['Điểm tổng'])) || '', row: t.first + i });
  });
  return out;
}

/* link thật của cột Link report trong EVENT REPORT (evsReadPosts_ chỉ đọc chữ) — theo số dòng */
function ehlPostLinks_(ssOn){
  var t = evsReadTab_(ssOn, ['EVENT REPORT'], 'On-air dự kiến'), m = {};
  if (!t || !t.rows.length) return m;
  evsLinks_(t, 'Link report').forEach(function(u, i){ if (u) m[t.first + i] = u; });
  return m;
}

function ehLinkTick_(force){
  var c = CacheService.getScriptCache();
  if (!force && c.get('ehl_tick')) return null;
  c.put('ehl_tick', '1', EHL.EVERY);
  var sig = '';
  try { sig = [EVS_OFF_ID, EVS_ON_ID].map(function(id){ return +DriveApp.getFileById(id).getLastUpdated(); }).join('|'); } catch(e){}
  try { var ss = ehBook_(); sig += '|' + ehRead_(ss, 'EVENTS').map(function(e){ return ehS_(e.id) + ehS_(e.offlineName) + ehS_(e.name); }).join('').length; } catch(e){}
  var pr = PropertiesService.getScriptProperties();
  if (!force && sig && pr.getProperty('EHL_SIG') === sig) return { ok: true, skipped: true };
  var r = ehLinkSync_();
  if (r && r.ok && sig) pr.setProperty('EHL_SIG', sig);
  return r;
}

function ehLinkSync_(){
  var T0 = Date.now(), rep = { ok: true, ver: EHL.VER, events: 0, matched: 0, posts: 0, designs: 0, cust: 0, issues: [] };
  try {
    var ss = ehBook_(), all = ehRead_(ss, 'EVENTS'), events = all.filter(function(e){ return !ehS_(e.sample); });
    var ssOff = null, ssOn = null;
    try { ssOff = SpreadsheetApp.openById(EVS_OFF_ID); } catch(e){ rep.issues.push('File MKT Offline: ' + (e.message || e)); }
    try { ssOn = SpreadsheetApp.openById(EVS_ON_ID); } catch(e){ rep.issues.push('File Digital: ' + (e.message || e)); }
    var off = [], cust = {}, posts = {}, plink = {}, des = [];
    if (ssOff){
      try { off = evsReadEvents_(); } catch(e){ rep.issues.push('REPORT_EVENT / PLAN_EVENT: ' + (e.message || e)); }
      try { cust = ehlCust_(ssOff); } catch(e){ rep.issues.push('CUSTOMER LIST: ' + (e.message || e)); }
    }
    if (ssOn){
      try { posts = evsReadPosts_(); plink = ehlPostLinks_(ssOn); } catch(e){ rep.issues.push('EVENT REPORT: ' + (e.message || e)); }
      try { des = ehlDesigns_(ssOn); } catch(e){ rep.issues.push('ORDER REPORT: ' + (e.message || e)); }
    }
    var offBy = {}; off.forEach(function(o){ offBy[o.nk] = o; });
    var gid = { R: ssOff && ehlGid_(ssOff, 'REPORT_EVENT'), P: ssOff && ehlGid_(ssOff, 'PLAN_EVENT'), C: ssOff && ehlGid_(ssOff, 'CUSTOMER LIST'),
                E: ssOn && ehlGid_(ssOn, 'EVENT REPORT'), O: ssOn && ehlGid_(ssOn, 'ORDER REPORT') };
    var now = ehNow_(), rows = [];
    events.forEach(function(e){
      rep.events++;
      var keys = [evsNorm_(e.offlineName), evsNorm_(e.name)].filter(function(k, i, a){ return k && a.indexOf(k) === i; });
      if (!keys.length) return;
      var o = keys.map(function(k){ return offBy[k]; }).filter(Boolean)[0] || null, x = {};
      if (o){
        x.off = { src: o.src, row: o.srow, url: ehlUrl_(EVS_OFF_ID, o.src === 'R' ? gid.R : gid.P, o.srow), name: o.name, start: o.start, end: o.end,
                  type: o.type, form: o.form, segment: o.segment, topic: ehlCut_(o.topic, 160), product: o.product, kol: ehlCut_(o.kol, 160), partner: ehlCut_(o.partner, 120),
                  place: o.place, plan: o.plan, action: o.action, folderUrl: o.folderUrl || (/^https?:/.test(o.folder) ? o.folder : ''),
                  review: ehlCut_(o.review, 900), tPart: o.tPart || '', aPart: o.aPart || '', amount: o.amount || '', tJ: o.tJ || '', tC: o.tC || '', aJ: o.aJ || '', aC: o.aC || '',
                  proof: ehlCut_(o.proof, 200) };
        var ck = cust[o.nk];
        if (ck){ x.cust = (o.ym && ck.ym[o.ym]) || ck.all; x.cust.url = ehlUrl_(EVS_OFF_ID, gid.C); rep.cust++; }
        rep.matched++;
      }
      var P = [], seenRow = {};
      keys.forEach(function(k){ (posts[k] || []).forEach(function(p){ if (seenRow[p.row]) return; seenRow[p.row] = 1; P.push(p); }); });
      if (P.length){
        x.posts = P.sort(function(a, b){ return (a.plan || '9') < (b.plan || '9') ? -1 : 1; }).slice(0, 40).map(function(p){
          var lk = plink[p.row] || ((/https?:\/\/\S+/.exec(p.link) || [])[0] || '');
          return { k: ehlCut_(p.kind, 60), f: ehlCut_(p.format, 40), pl: ehlCut_(p.pillar, 40), pg: ehlCut_(p.page, 40), m: ehlCut_(p.main, 160),
                   d: p.plan || '', a: p.real || '', st: ehlCut_(p.status, 30), n: ehlCut_(p.note, 120), lk: lk, row: p.row };
        });
        x.postsUrl = ehlUrl_(EVS_ON_ID, gid.E); rep.posts += x.posts.length;
      }
      var D = des.filter(function(d){ return keys.some(function(k){ return ehlSame_(d.nk, k); }); });
      if (D.length){ x.designs = D.slice(0, 40).map(function(d){ var c = {}; for (var q in d) if (q !== 'nk') c[q] = d[q]; return c; }); x.designsUrl = ehlUrl_(EVS_ON_ID, gid.O); rep.designs += D.length; }
      if (!x.off && !x.posts && !x.designs) return;
      var js = JSON.stringify(x);
      if (js.length > EHL.MAX_JS){ if (x.off) x.off.review = ehlCut_(x.off.review, 200); if (x.posts) x.posts = x.posts.slice(0, 20); if (x.designs) x.designs = x.designs.slice(0, 20); js = JSON.stringify(x).slice(0, EHL.MAX_JS); }
      rows.push({ eventId: ehS_(e.id), readAt: now, json: js });
    });
    all.filter(function(e){ return ehS_(e.sample); }).forEach(function(e){ rows.push({ eventId: ehS_(e.id), readAt: now, json: JSON.stringify(ehlSample_(e)) }); });   /* sự kiện mẫu ⇒ số giả để thử giao diện */
    if (!ss.getSheetByName(EHL.TAB)){ var sh = ss.insertSheet(EHL.TAB); sh.getRange(1, 1, 1, EHL.COLS.length).setValues([EHL.COLS]).setFontWeight('bold'); sh.setFrozenRows(1); }
    ehRewrite_(ss, EHL.TAB, EHL.COLS, rows);
    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'MKT Offline / Online — ' + rep.matched + '/' + rep.events + ' sự kiện khớp file Offline · ' + rep.cust + ' có danh sách khách · ' +
      rep.posts + ' bài đăng · ' + rep.designs + ' yêu cầu thiết kế · ' + rep.seconds + 's' + (rep.issues.length ? ' · ' + rep.issues.join(' | ') : '');
    PropertiesService.getScriptProperties().setProperty('EHL_LAST', JSON.stringify({ at: Date.now(), msg: rep.message }));
    CacheService.getScriptCache().remove('eh_link');
    return rep;
  } catch(err){ return { ok: false, error: String(err && err.message || err) }; }
}

/* ehBoot_ ⇒ base.link (đệm riêng 'eh_link', 10 phút; ghi lại khi đồng bộ) */
function ehLinkGet_(ss){
  var c = CacheService.getScriptCache(), hit = c.get('eh_link');
  if (hit){ try { return JSON.parse(hit); } catch(e){} }
  var out = {};
  try { if (ss.getSheetByName(EHL.TAB)) ehRead_(ss, EHL.TAB).forEach(function(r){ try { out[ehS_(r.eventId)] = JSON.parse(r.json); } catch(e){} }); } catch(e){}
  try { var js = JSON.stringify(out); if (js.length < 95000) c.put('eh_link', js, 600); } catch(e){}
  return out;
}

function ehLinkApi_(p){
  var op = String(p.op || 'status');
  if (String(p.key || '') !== ehKey_()){
    var ss = ehBook_(), me = ehMe_(p, ss); if (me.err) return { ok: false, code: 'AUTH', error: me.err };
    if (op !== 'status' && !me.manager) return { ok: false, error: 'Chỉ quản lý được chạy đồng bộ ngay.' };
  }
  if (op === 'sync'){ var r = ehLinkTick_(true); try { CacheService.getScriptCache().remove('eh_boot'); } catch(e){} return r; }
  var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EHL_LAST') || '{}'); } catch(e){}
  return { ok: true, ver: EHL.VER, last: last };
}
function ehLinkNow(){ var r = ehLinkTick_(true); Logger.log(JSON.stringify(r, null, 2)); return r; }

/* dữ liệu giả cho sự kiện mẫu (cột sample = x) — giống demo.js của app; không đọc / không ghi file thật */
function ehlSample_(e){
  var today = ehIso_(new Date()), st = ehS_(e.start), past = ehS_(e.end || st) < today, tgt = +e.target || 60, act = +e.actual || 0;
  var add = function(n){ var d = ehDate_(st); if (!d) return ''; d.setDate(d.getDate() + n); return ehIso_(d); };
  var web = /webinar/i.test(ehS_(e.type)), reg = Math.round(tgt * (past ? 1.2 : .55)), conf = past ? Math.max(Math.round(reg * .82), act + 3) : 0, ok = past ? Math.min(conf, act || Math.round(conf * .95)) : 0;
  var x = { off: { src: past ? 'R' : 'P', row: '', url: ehlUrl_(EVS_OFF_ID), name: ehS_(e.name), start: st, end: ehS_(e.end || st), type: ehS_(e.type), form: web ? 'Webinar' : 'Trực tiếp',
                   segment: 'Dental', topic: ehS_(e.purpose), product: ehS_(e.products), kol: 'BS. A (mẫu)', partner: 'NPP khu vực (mẫu)', place: ehS_(e.city), plan: 'Approved', action: past ? 'As planned' : '',
                   folderUrl: '', review: past ? 'Khách quan tâm phần thực hành; nên tăng thời lượng hands-on (mẫu).' : '', tPart: tgt, aPart: past ? ok : '', tJ: '', aJ: '', tC: '', aC: '', amount: past ? 86500000 : '', proof: past ? 'Có (mẫu)' : '' },
           cust: { reg: reg, conf: conf, ok: ok, sign: web ? 0 : conf, zoom: web ? conf : 0, url: ehlUrl_(EVS_OFF_ID) }, postsUrl: ehlUrl_(EVS_ON_ID), designsUrl: ehlUrl_(EVS_ON_ID) };
  x.posts = [['Teaser', 'Image', -14], ['Giới thiệu KOL', 'Image', -10], ['Countdown', 'Video', -3], ['Recap / cảm ơn', 'Album', 1]].map(function(p, k){ var d = add(p[2]), up = d && d < today;
    return { k: p[0], f: p[1], pl: 'Event', pg: 'MMH Dental', m: '(mẫu)', d: d, a: up ? d : '', st: up ? 'On air đúng hạn' : '', n: '', lk: up ? EH_IMG + ['line-03.png', 'line-05.png', 'ws-comp-3.jpg', 'ws-jizai-3.jpg'][k] : '', row: '' }; });
  x.designs = [['Key visual', 1, -21, 'ws-comp-1.jpg'], ['Standee', 2, -10, 'standee.png'], ['Backdrop', 1, -10, 'ws-jizai-2.jpg']].filter(function(d){ return !web || d[0] === 'Key visual'; }).map(function(d){ var dl = add(d[2]), dn = dl && dl < today;
    return { task: ehS_(e.name) + ' - ' + d[0], type: d[0], qty: d[1], dl: dl, st: dn ? 'Completed' : 'In progress', chk: dn ? 'On time' : '', res: '', lk: dn ? EH_IMG + d[3] : '', done: dn ? dl : '', pic: ehS_(e.Design), req: ehS_(e.Owner), pts: 2, row: '' }; });
  return x;
}
