/*************************************************************************************************
 * MMH REPORT HUB — Event_Sync.gs   (v1.1 · 13/10/2026 · v1.1: Task Result gọn, Folder = link thật)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * SỰ KIỆN MARKETING OFFLINE ⇒ KEY TASK "Marketing-Event" TRÊN "Weekly new" (tự động, gần như tức thì)
 *
 *  ① Mỗi sự kiện ở file "2. Vietnam - Marketing Offline FY68" (tab REPORT_EVENT, và PLAN_EVENT nếu
 *     sự kiện chưa có ở REPORT_EVENT) = ĐÚNG MỘT key task, tên = cột Event Name.
 *     Thêm / sửa / xoá sự kiện ở file đó ⇒ key task tự thêm / sửa / xoá theo.
 *     Key task có sẵn (gõ tay trước đây) trùng tên sự kiện ⇒ được "nhận" làm key đồng bộ, không tạo trùng.
 *  ② Mỗi bài đăng ở file "3. Vietnam - Digital Marketing & Design FY68" ▸ tab EVENT REPORT có cột
 *     Event = tên sự kiện ⇒ một sub task CHỈ ĐỌC dưới key đó:
 *        tên    = Type of content _ Format _ Pillar      (vd. "Recap_Photo_After event")
 *        Start  = On-air dự kiến · Deadline = On-air dự kiến
 *        Result = Status + Note (+ link bài)            · trạng thái theo cột Status
 *  ③ PIC vẫn thêm sub task của mình dưới key sự kiện như bình thường (sub tay — sửa được).
 *     Key sự kiện: sửa được kết quả / trạng thái / deadline; KHÔNG đổi tên, KHÔNG xoá trên Hub
 *     (tên là khoá nối với file MKT — đổi / xoá ở file MKT Offline).
 *
 * Dấu vết đồng bộ (cột U / V như Order_Sync):  key "EK:<mã>"  ·  sub bài đăng "E:<mã>"
 * Chạy: trigger onChange của 2 file MKT (tự cài) + 10 phút/lần + action=eventSync (app gọi sau khi ghi).
 *************************************************************************************************/

var EVS_OFF_ID   = '16vIDYRhm6Cj9DN4C26rvbBPW1hF3vAnZ7lgl6Bd02w8';   // 2. Vietnam - Marketing Offline FY68
var EVS_ON_ID    = '1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc';   // 3. Vietnam - Digital Marketing & Design FY68
var EVS_TYPE     = 'Marketing-Event';
var EVS_BACK     = 2;          // tháng hiện tại − 2 …
var EVS_FWD      = 6;          // … + 6 tháng
var EVS_BUDGET   = 240000;
var EVS_CHUNK    = 40;
/* PIC key sự kiện theo Segment (KPI C12: Dental — Thuong, Surgical/Eyeless — Trang) · PIC bài đăng = Digital */
var EVS_PIC_DENTAL = 'Thuong', EVS_PIC_SURG = 'Trang', EVS_POST_PIC = 'Minh Trang';

function evsColKey_(){  return (typeof VISIT_COL_KEY  !== 'undefined') ? VISIT_COL_KEY  : 21; }
function evsColMeta_(){ return (typeof VISIT_COL_META !== 'undefined') ? VISIT_COL_META : 22; }
function evsS_(v){ return String(v === null || v === undefined ? '' : v).trim(); }
function evsNorm_(s){
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}
function evsHash_(s){
  var h = 5381; s = String(s);
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function evsNum_(v){
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function evsIso_(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function evsToDate_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function evsDateISO_(v){
  if (v instanceof Date && !isNaN(v.getTime())) return evsIso_(v);
  var s = evsS_(v); if (!s) return '';
  var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function evsFmt_(iso){ return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
function evsMoney_(v){ var n = Math.round(evsNum_(v)); return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ'; }

/* "20261026-29" → 26→29/10 · "20261030-1102" → 30/10→02/11 · "20260910" · ô ngày · trống ⇒ theo tháng */
function evsDates_(dateCell, monthCell){
  var out = { start:'', end:'', approx:false };
  if (dateCell instanceof Date && !isNaN(dateCell.getTime())){ out.start = out.end = evsIso_(dateCell); return out; }
  var s = evsS_(dateCell);
  if (typeof dateCell === 'number') s = String(Math.round(dateCell));
  var m = /^(\d{4})(\d{2})(\d{2})(?:\s*[-–]\s*(\d{2}|\d{4}))?/.exec(s.replace(/\s+/g, ''));
  if (m){
    out.start = m[1] + '-' + m[2] + '-' + m[3];
    if (m[4] && m[4].length === 2) out.end = m[1] + '-' + m[2] + '-' + m[4];
    else if (m[4] && m[4].length === 4){
      var y = +m[1]; if (+m[4].slice(0, 2) < +m[2]) y++;
      out.end = y + '-' + m[4].slice(0, 2) + '-' + m[4].slice(2);
    } else out.end = out.start;
    if (out.end < out.start) out.end = out.start;
    return out;
  }
  var iso = evsDateISO_(dateCell);
  if (iso){ out.start = out.end = iso; return out; }
  var ym = evsS_(monthCell).replace(/\D/g, '').slice(0, 6);
  if (ym.length === 6){
    var last = new Date(+ym.slice(0, 4), +ym.slice(4, 6), 0);
    out.start = ym.slice(0, 4) + '-' + ym.slice(4, 6) + '-01'; out.end = evsIso_(last); out.approx = true;
  }
  return out;
}
function evsWindow_(){
  var out = [], now = new Date();
  for (var i = -EVS_BACK; i <= EVS_FWD; i++){
    var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push(d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2));
  }
  return out;
}

/* ── Đọc 1 tab theo TÊN cột (dò hàng tiêu đề trong 8 hàng đầu) ── */
function evsReadTab_(ss, names, mustHave){
  var sh = null;
  for (var i = 0; i < names.length && !sh; i++) sh = ss.getSheetByName(names[i]);
  if (!sh) return null;
  var last = sh.getLastRow(), lc = sh.getLastColumn();
  if (last < 2 || lc < 2) return { sh:sh, rows:[], col:{} };
  var top = sh.getRange(1, 1, Math.min(8, last), lc).getValues(), hr = -1;
  var must = evsNorm_(mustHave);
  for (var r = 0; r < top.length && hr < 0; r++)
    for (var c = 0; c < top[r].length; c++) if (evsNorm_(top[r][c]) === must){ hr = r; break; }
  if (hr < 0) return { sh:sh, rows:[], col:{} };
  var col = {};
  top[hr].forEach(function(h, c){ var k = evsNorm_(h); if (k && !(k in col)) col[k] = c; });
  var data = last > hr + 1 ? sh.getRange(hr + 2, 1, last - hr - 1, lc).getValues() : [];
  return { sh:sh, rows:data, col:col, first:hr + 2 };
}
function evsGet_(t, row, keys){
  for (var i = 0; i < keys.length; i++){
    var k = evsNorm_(keys[i]);
    if (k in t.col) return row[t.col[k]];
    for (var h in t.col) if (h.indexOf(k) === 0) return row[t.col[h]];
  }
  return '';
}

/* ── link thật trong 1 cột (ô có chữ gắn link / công thức HYPERLINK / chữ là URL) ⇒ mảng URL theo dòng dữ liệu ── */
function evsLinks_(t, key){
  var out = [], k = evsNorm_(key), c = null;
  if (k in t.col) c = t.col[k]; else for (var h in t.col) if (c === null && h.indexOf(k) === 0) c = t.col[h];
  if (c === null || !t.rows.length) return out;
  var rt = [], fm = [];
  try { var rg = t.sh.getRange(t.first, c + 1, t.rows.length, 1); rt = rg.getRichTextValues(); fm = rg.getFormulas(); } catch(e){}
  for (var i = 0; i < t.rows.length; i++){
    var u = '';
    try {
      var x = rt[i] && rt[i][0];
      if (x){ u = x.getLinkUrl() || ''; if (!u) x.getRuns().forEach(function(run){ if (!u && run.getLinkUrl()) u = run.getLinkUrl(); }); }
    } catch(e){}
    if (!u && fm[i] && fm[i][0]){ var m = /"(https?:[^"]+)"/.exec(fm[i][0]); if (m) u = m[1]; }
    if (!u){ var v = evsS_(t.rows[i][c]), m2 = /https?:\/\/\S+/.exec(v); if (m2) u = m2[0]; }
    out.push(u);
  }
  return out;
}
/* ── Sự kiện (REPORT_EVENT trước, PLAN_EVENT bổ sung) ── */
function evsReadEvents_(){
  var ss = SpreadsheetApp.openById(EVS_OFF_ID), out = [], seen = {};
  var rep = evsReadTab_(ss, ['REPORT_EVENT'], 'Event Name');
  var pln = evsReadTab_(ss, ['PLAN_EVENT'], 'Event Name');
  function take(t, src){
    if (!t) return;
    var furl = evsLinks_(t, 'Detail event folder link');
    t.rows.forEach(function(r, i){
      var name = evsS_(evsGet_(t, r, ['Event Name'])).replace(/\s+/g, ' ');
      if (!name || /^#|^loading/i.test(name)) return;
      var nk = evsNorm_(name); if (!nk || seen[nk]) return;
      var d = evsDates_(evsGet_(t, r, ['Date']), evsGet_(t, r, ['Month']));
      if (!d.start) return;
      seen[nk] = 1;
      out.push({
        src:src, srow:t.first + i, name:name, nk:nk, start:d.start, end:d.end, approx:d.approx,
        ym: d.start.slice(0, 4) + d.start.slice(5, 7),
        type: evsS_(evsGet_(t, r, ['Type of event'])), product: evsS_(evsGet_(t, r, ['Target product'])),
        segment: evsS_(evsGet_(t, r, ['Segment'])), topic: evsS_(evsGet_(t, r, ['Topic'])),
        kol: evsS_(evsGet_(t, r, ['KOL/ ACC', 'KOL'])), partner: evsS_(evsGet_(t, r, ['Partner'])),
        place: evsS_(evsGet_(t, r, ['Place'])),
        plan: evsS_(evsGet_(t, r, ['Plan status'])), action: evsS_(evsGet_(t, r, ['Action Status'])),
        folder: evsS_(evsGet_(t, r, ['Detail event folder link'])), folderUrl: furl[i] || '', review: evsS_(evsGet_(t, r, ['Event review'])),
        tPart: evsNum_(evsGet_(t, r, ['Target Participant'])), aPart: evsNum_(evsGet_(t, r, ['Actual Participant'])),
        amount: evsNum_(evsGet_(t, r, ['Actual sales amount'])),
        tJ: evsNum_(evsGet_(t, r, ['Target sales JIZAI'])), tC: evsNum_(evsGet_(t, r, ['Target sales Composite'])),
        aJ: evsNum_(evsGet_(t, r, ['Actual sales - Jizai', 'Actual sales Jizai'])),
        aC: evsNum_(evsGet_(t, r, ['Actual sales - Composite', 'Actual sales Composite'])),
        proof: evsS_(evsGet_(t, r, ['Bằng chứng tham dự', 'Scan danh sách ký tên']))
      });
    });
  }
  take(rep, 'R'); take(pln, 'P');
  return out;
}

/* ── Bài đăng sự kiện (EVENT REPORT, file Digital) ── */
function evsReadPosts_(){
  var t = evsReadTab_(SpreadsheetApp.openById(EVS_ON_ID), ['EVENT REPORT'], 'On-air dự kiến');
  var by = {};
  if (!t) return by;
  t.rows.forEach(function(r, i){
    var ev = evsS_(evsGet_(t, r, ['Event'])); if (!ev) return;
    var nk = evsNorm_(ev);
    (by[nk] = by[nk] || []).push({
      row: t.first + i,
      kind: evsS_(evsGet_(t, r, ['Type of content'])).replace(/[:：]\s*$/, '').trim(),
      format: evsS_(evsGet_(t, r, ['Format'])), pillar: evsS_(evsGet_(t, r, ['Pillar'])),
      page: evsS_(evsGet_(t, r, ['Page'])), main: evsS_(evsGet_(t, r, ['Main content'])),
      plan: evsDateISO_(evsGet_(t, r, ['On-air dự kiến'])), real: evsDateISO_(evsGet_(t, r, ['On-air thực tế'])),
      status: evsS_(evsGet_(t, r, ['Status'])), note: evsS_(evsGet_(t, r, ['Note'])),
      link: evsS_(evsGet_(t, r, ['Link report']))
    });
  });
  return by;
}

/* ── Dựng dòng cần có ── */
function evsKeyStatus_(e, today){
  if (/cancel|hủy|huỷ|hoãn/i.test(e.action + ' ' + e.plan)) return { st:'Cancelled', p:0 };
  if (e.end < today){
    var reported = e.aPart > 0 || !!e.review || !!e.folder;
    return reported ? { st:'Completed', p:100 } : { st:'In Progress', p:75 };
  }
  if (e.start <= today) return { st:'In Progress', p:50 };
  return { st:'To Do', p:0 };
}
/* 13/10/2026 (người dùng yêu cầu): Task Result CHỈ gồm các dòng thông tin sự kiện — không ghi dòng "🔄 Đồng bộ từ file…",
   không doanh số / review; Folder sự kiện = LINK thật của thư mục (lấy từ ô Detail event folder link) để mở được ngay trên Hub */
function evsKeyResult_(e){
  var L = [];
  L.push([e.type, e.product, e.segment].filter(String).join(' · '));
  var w = []; if (e.kol) w.push('KOL/ACC: ' + e.kol); if (e.partner) w.push('Đối tác: ' + e.partner); if (e.place) w.push('Địa điểm: ' + e.place);
  if (w.length) L.push(w.join(' · '));
  L.push('Ngày: ' + evsFmt_(e.start) + (e.end !== e.start ? ' → ' + evsFmt_(e.end) : '') + (e.approx ? ' (chưa chốt ngày)' : ''));
  if (e.plan || e.action) L.push('Kế hoạch: ' + [e.plan, e.action].filter(String).join(' · '));
  if (e.src === 'R') L.push('Tham dự thực tế: ' + (e.aPart || 0) + ' / mục tiêu ' + (e.tPart || 0));
  var fu = e.folderUrl || (/^https?:/.test(e.folder) ? e.folder : '');
  if (fu || e.folder) L.push('Folder sự kiện: ' + (fu || e.folder));
  return L.filter(String).join('\n');
}
function evsPostStatus_(p, today){
  var s = p.status;
  if (/cancel/i.test(s)) return { st:'Cancelled', p:0 };
  if (/on air/i.test(s) || p.link) return { st:'Completed', p:100 };
  if (/pending/i.test(s)) return { st:'To Do', p:0 };
  if (s) return { st:'In Progress', p:50 };
  return (p.plan && p.plan <= today) ? { st:'In Progress', p:25 } : { st:'To Do', p:0 };
}
function evsBuild_(events, posts){
  var today = evsIso_(new Date()), win = evsWindow_();
  var keys = {}, subs = {};
  events.forEach(function(e){
    if (win.indexOf(e.ym) < 0) return;
    var ek = 'EK:' + evsHash_(e.nk), st = evsKeyStatus_(e, today);
    var pic = /surg|eyeless|ophthal|nhan/i.test(e.segment + ' ' + e.product) ? EVS_PIC_SURG : EVS_PIC_DENTAL;
    var k = { syncKey:ek, title:e.name, nk:e.nk, type:EVS_TYPE, keyTask:e.name, subTask:'', pic:pic,
              result:evsKeyResult_(e), start:e.start, planned:e.end, status:st.st, progress:st.p,
              meta:{ s:'event', ym:e.ym, src:e.src, sr:e.src + e.srow, f:(e.folderUrl || (/^https?:/.test(e.folder) ? e.folder : '')), fn:e.folder } };
    k.hash = evsHash_([k.title, k.pic, k.result, k.start, k.planned, k.status].join('¦')); k.meta.h = k.hash;
    keys[ek] = k;
    var used = {};
    (posts[e.nk] || []).forEach(function(p){
      var nm = [p.kind, p.format, p.pillar].filter(String).join('_') || 'Bài đăng';
      var base = nm, n = 1; while (used[nm]) nm = base + ' (' + (++n) + ')'; used[nm] = 1;
      var ps = evsPostStatus_(p, today), R = [];
      R.push('Status: ' + (p.status || '(chưa có)'));
      if (p.note) R.push('Note: ' + p.note);
      if (p.main) R.push('Nội dung: ' + p.main);
      if (p.real) R.push('On-air thực tế: ' + evsFmt_(p.real));
      if (p.link) R.push(p.link);
      var o = { syncKey:'E:' + evsHash_(e.nk + '|' + nm), parent:ek, type:'', keyTask:'', subTask:nm,
                pic:EVS_POST_PIC, result:R.join('\n'), start:p.plan || '', planned:p.plan || '',
                status:ps.st, progress:ps.p,
                meta:{ s:'eventpost', t:p.format, pg:p.page, ts:p.status, r:p.row } };
      o.hash = evsHash_([o.subTask, o.pic, o.result, o.start, o.planned, o.status, ek].join('¦')); o.meta.h = o.hash;
      subs[o.syncKey] = o;
    });
  });
  return { keys:keys, subs:subs, win:win };
}

/* ── Quét "Weekly new" ── */
function evsScan_(sh){
  var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = sh.getLastRow();
  var idx = { keys:{}, byName:{}, subs:{}, blockEnd:{}, manual:{}, keyRows:[] };
  if (last < dr) return idx;
  var n = last - dr + 1, w = evsColMeta_() - 1, v = sh.getRange(dr, 2, n, w).getValues();
  var iK = evsColKey_() - 2, iM = evsColMeta_() - 2, cur = null;
  for (var i = 0; i < n; i++){
    var row = dr + i, f = evsS_(v[i][4]), g = evsS_(v[i][5]), u = evsS_(v[i][iK]);
    var has = !!(evsS_(v[i][3]) || f || g || u);
    var meta = {}; try { meta = JSON.parse(evsS_(v[i][iM]) || '{}') || {}; } catch(e){}
    if (f){
      cur = { row:row, u:u, title:f, meta:meta };
      idx.keyRows.push(cur); idx.blockEnd[row] = row; idx.manual[row] = 0;
      if (u.indexOf('EK:') === 0) idx.keys[u] = cur;
      else if (!u){ var nk = evsNorm_(f); if (!idx.byName[nk]) idx.byName[nk] = cur; }
      continue;
    }
    if (cur && has){
      idx.blockEnd[cur.row] = row;
      if (u.indexOf('E:') === 0) idx.subs[u] = { row:row, parentU:cur.u, parentRow:cur.row, hash:meta.h || '' };
      else if (g) idx.manual[cur.row]++;
    }
  }
  return idx;
}
function evsSetSafe_(rng, vals){
  try { rng.setValues(vals); return ''; }
  catch(e1){ try { rng.clearDataValidations(); } catch(e2){} try { rng.setValues(vals); return ''; } catch(e3){ return String(e3 && e3.message || e3); } }
}
function evsPct_(p){ try { if (typeof pctToCell === 'function') return pctToCell(p); } catch(e){} return (evsNum_(p) || 0) / 100; }
function evsWrite_(sh, row, list, keepPic){
  var el = [], no = [], uv = [];
  list.forEach(function(o, i){
    el.push([o.type || '', o.keyTask || '', o.subTask || '', (keepPic && keepPic[i]) || o.pic || '', o.result || '',
             evsToDate_(o.start) || '', evsToDate_(o.planned) || '', '']);
    no.push([o.status || '', evsPct_(o.progress || 0)]);
    uv.push([o.syncKey || '', o.meta ? JSON.stringify(o.meta) : '']);
  });
  var n = list.length;
  return evsSetSafe_(sh.getRange(row, 5, n, 8), el) || evsSetSafe_(sh.getRange(row, 14, n, 2), no) ||
         evsSetSafe_(sh.getRange(row, evsColKey_(), n, 2), uv);
}
function evsFill_(sh, fromRow, startRow, count){
  if (typeof vsFillDownFormulas === 'function'){ try { return vsFillDownFormulas(sh, fromRow, startRow, count); } catch(e){} }
  if (typeof osFillFormulas_ === 'function'){ try { return osFillFormulas_(sh, fromRow, startRow, count); } catch(e){} }
}

/* ══════════════ ĐỒNG BỘ CHÍNH ══════════════ */
function evsSync(opt){
  opt = opt || {};
  var T0 = Date.now(), rep = { ok:true, keysNew:0, keysAdopted:0, keysUpd:0, keysDel:0, keysFreed:0,
                               subsNew:0, subsUpd:0, subsDel:0, errors:[] };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok:false, error:'Đang có tiến trình ghi khác, thử lại sau.' };
  try {
    var events, posts;
    try { events = evsReadEvents_(); } catch(e){ return { ok:false, error:'Không đọc được file MKT Offline: ' + (e.message || e) }; }
    var postsOk = true;
    try { posts = evsReadPosts_(); } catch(e){ posts = {}; postsOk = false; rep.errors.push('File Digital: ' + (e.message || e)); }
    var W = evsBuild_(events, posts);
    var sh = shWeekly(); if (!sh) return { ok:false, error:'Không thấy sheet Weekly new' };
    if (sh.getMaxColumns() < evsColMeta_()) sh.insertColumnsAfter(sh.getMaxColumns(), evsColMeta_() - sh.getMaxColumns());
    var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7;

    /* ① KEY: cập nhật / nhận key gõ tay trùng tên / đổi tên theo dòng nguồn / tạo mới */
    var idx = evsScan_(sh), bySr = {};
    Object.keys(idx.keys).forEach(function(u){ var k = idx.keys[u]; if (k.meta && k.meta.sr && !W.keys[u]) bySr[k.meta.sr] = k; });
    Object.keys(W.keys).sort(function(a, b){ return W.keys[a].start < W.keys[b].start ? -1 : 1; }).forEach(function(ek){
      var w = W.keys[ek], cur = idx.keys[ek];
      if (!cur && bySr[w.meta.sr]){ cur = bySr[w.meta.sr]; delete bySr[w.meta.sr]; cur.renamed = true; }
      if (cur){
        if (!cur.renamed && cur.meta && cur.meta.h === w.hash && cur.title === w.title) return;
        var keepPic = [evsS_(sh.getRange(cur.row, 8).getValue()) || w.pic];
        var hasSubs = idx.blockEnd[cur.row] > cur.row;
        var o = JSON.parse(JSON.stringify(w));
        if (hasSubs){ o.status = evsS_(sh.getRange(cur.row, 14).getValue()) || o.status; o.progress = Math.round(evsNum_(sh.getRange(cur.row, 15).getValue()) * 100); }
        var er = evsWrite_(sh, cur.row, [o], keepPic);
        if (er) rep.errors.push('Key "' + w.title + '": ' + er); else rep.keysUpd++;
        return;
      }
      var man = idx.byName[w.nk];
      if (man){
        var er2 = evsWrite_(sh, man.row, [w], [evsS_(sh.getRange(man.row, 8).getValue()) || w.pic]);
        if (er2) rep.errors.push('Nhận key "' + w.title + '": ' + er2); else rep.keysAdopted++;
        return;
      }
      var row = (typeof firstEmptyContentRow === 'function') ? firstEmptyContentRow(sh) : sh.getLastRow() + 1;
      if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), row - sh.getMaxRows() + 5);
      var er3 = evsWrite_(sh, row, [w]);
      if (er3){ rep.errors.push('Tạo key "' + w.title + '": ' + er3); return; }
      if (row > dr) evsFill_(sh, row - 1, row, 1);
      rep.keysNew++;
      SpreadsheetApp.flush();
    });
    SpreadsheetApp.flush();

    /* ② SUB bài đăng: xoá dòng không còn / đổi cha */
    idx = evsScan_(sh);
    var dels = [];
    Object.keys(idx.subs).forEach(function(sk){
      var cur = idx.subs[sk], w = W.subs[sk];
      var parentInWin = !!W.keys[cur.parentU] || !idx.keys[cur.parentU] ||
                        (idx.keys[cur.parentU].meta && W.win.indexOf(idx.keys[cur.parentU].meta.ym) >= 0);
      if (!postsOk) return;
      if (!w ? parentInWin : (w.parent !== cur.parentU)) dels.push(cur.row);
    });

    /* ③ KEY không còn trong file MKT (trong cửa sổ tháng): xoá nếu không có sub tay, còn sub tay thì "thả" thành key thường */
    var freeRows = [];
    Object.keys(idx.keys).forEach(function(u){
      if (W.keys[u]) return;
      var k = idx.keys[u];
      if (!k.meta || W.win.indexOf(k.meta.ym) < 0) return;
      if (idx.manual[k.row] > 0){ freeRows.push(k.row); return; }
      for (var r = k.row; r <= idx.blockEnd[k.row]; r++) if (dels.indexOf(r) < 0) dels.push(r);
      rep.keysDel++;
    });
    freeRows.forEach(function(r){
      var res = evsS_(sh.getRange(r, 9).getValue());
      evsSetSafe_(sh.getRange(r, evsColKey_(), 1, 2), [['', '']]);
      evsSetSafe_(sh.getRange(r, 9), [[res + '\n⚠ Sự kiện không còn trong file MKT Offline (đã đổi tên hoặc xoá) — key này thành key thường.']]);
      rep.keysFreed++;
    });
    dels.sort(function(a, b){ return b - a; });
    for (var di = 0; di < dels.length; ){
      var end = dels[di], cnt = 1;
      while (di + cnt < dels.length && dels[di + cnt] === end - cnt) cnt++;
      sh.deleteRows(end - cnt + 1, cnt); di += cnt;
    }
    rep.subsDel = dels.length - rep.keysDel;
    if (dels.length) SpreadsheetApp.flush();

    /* ④ cập nhật sub đã có */
    idx = evsScan_(sh);
    Object.keys(W.subs).forEach(function(sk){
      var w = W.subs[sk], cur = idx.subs[sk];
      if (!cur || cur.parentU !== w.parent || cur.hash === w.hash) return;
      var er = evsWrite_(sh, cur.row, [w]);
      if (er) rep.errors.push('Sub "' + w.subTask + '": ' + er); else rep.subsUpd++;
    });

    /* ⑤ chèn sub mới ngay dưới block của key sự kiện */
    var byParent = {};
    Object.keys(W.subs).forEach(function(sk){
      if (idx.subs[sk]) return;
      var w = W.subs[sk]; (byParent[w.parent] = byParent[w.parent] || []).push(w);
    });
    Object.keys(byParent)
      .filter(function(u){ return !!idx.keys[u]; })
      .sort(function(a, b){ return idx.blockEnd[idx.keys[b].row] - idx.blockEnd[idx.keys[a].row]; })
      .forEach(function(u){
        if (Date.now() - T0 > EVS_BUDGET){ rep.partial = true; return; }
        var list = byParent[u].sort(function(a, b){ return (a.start || '9') < (b.start || '9') ? -1 : 1; });
        var after = idx.blockEnd[idx.keys[u].row];
        for (var b = 0; b < list.length; b += EVS_CHUNK){
          var chunk = list.slice(b, b + EVS_CHUNK);
          sh.insertRowsAfter(after, chunk.length);
          var er = evsWrite_(sh, after + 1, chunk);
          evsFill_(sh, after, after + 1, chunk.length);
          if (er) rep.errors.push('Chèn sub "' + chunk[0].subTask + '": ' + er);
          after += chunk.length; rep.subsNew += chunk.length;
        }
      });
    SpreadsheetApp.flush();

    /* ⑥ % + trạng thái key theo sub */
    var changed = rep.keysNew + rep.keysAdopted + rep.keysUpd + rep.keysDel + rep.keysFreed + rep.subsNew + rep.subsUpd + rep.subsDel;
    if (changed){
      var fresh = evsScan_(sh);
      Object.keys(W.keys).forEach(function(u){
        var k = fresh.keys[u]; if (!k || fresh.blockEnd[k.row] <= k.row) return;
        var kno = evsS_(sh.getRange(k.row, 2).getValue());
        if (kno && typeof syncKeyRollup === 'function'){ try { syncKeyRollup(sh, kno); } catch(e){} }
      });
      try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
      try { if (typeof _SH_CACHE !== 'undefined') _SH_CACHE = {}; } catch(e){}
    }
    rep.events = Object.keys(W.keys).length; rep.posts = Object.keys(W.subs).length;
    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Sự kiện MKT — ' + rep.events + ' sự kiện · ' + rep.posts + ' bài đăng · key mới ' + rep.keysNew +
      ' · nhận ' + rep.keysAdopted + ' · sửa ' + rep.keysUpd + ' · xoá ' + rep.keysDel +
      ' · sub mới ' + rep.subsNew + ' · sửa ' + rep.subsUpd + ' · xoá ' + rep.subsDel + ' · ' + rep.seconds + 's' +
      (rep.errors.length ? ' · ' + rep.errors.slice(0, 4).join(' | ') : '');
    try { PropertiesService.getScriptProperties().setProperty('EVS_LAST', JSON.stringify({ at:Date.now(), msg:rep.message })); } catch(e){}
    return rep;
  } catch(err){
    return { ok:false, error:String(err && err.message || err) };
  } finally { try { lock.releaseLock(); } catch(e){} }
}

/* ══════════════ KHOÁ: key sự kiện không xoá / không đổi tên trên Hub ══════════════ */
function evsIsEventKeyRow(sh, row){
  try { return /^EK:/.test(evsS_(sh.getRange(row, evsColKey_()).getValue())); } catch(e){ return false; }
}
var EVS_LOCK_MSG = 'Key task sự kiện đồng bộ từ file MKT Offline — đổi tên / xoá sự kiện ở file "2. Vietnam - Marketing Offline FY68".';

/* ══════════════ TRIGGER / API ══════════════ */
function evsSyncTick(){
  try { if (typeof mktaRun_ === 'function') mktaRun_({}); } catch(_e){}          /* MKT_SheetAuto.gs: Month / On-air / Status / Check deadline / Ads */
  evsSync({});
}
function evsOnChange(e){
  try { if (typeof mktaOnChange_ === 'function') mktaOnChange_(e); } catch(_e){}  /* MKT_SheetAuto.gs — chỉ file vừa đổi */
  var c = CacheService.getScriptCache();
  if (c.get('evs_busy')) { c.put('evs_again', '1', 120); return; }
  c.put('evs_busy', '1', 25);
  Utilities.sleep(3000);
  evsSync({});
  if (c.get('evs_again')){ c.remove('evs_again'); Utilities.sleep(1000); evsSync({}); }
}
/* Tự cài (web app chạy dưới quyền chủ file) — tối đa 1 lần thử / 6 giờ */
function evsEnsureTriggers_(){
  try {
    if (typeof throttleOk === 'function' && !throttleOk('evs_install', 21600)) return;
    var ts = ScriptApp.getProjectTriggers(), has = {};
    ts.forEach(function(t){
      var src = ''; try { src = t.getTriggerSourceId() || ''; } catch(e){}
      has[t.getHandlerFunction() + '|' + src] = 1; has[t.getHandlerFunction()] = 1;
    });
    if (!has['evsOnChange|' + EVS_OFF_ID]) ScriptApp.newTrigger('evsOnChange').forSpreadsheet(EVS_OFF_ID).onChange().create();
    if (!has['evsOnChange|' + EVS_ON_ID])  ScriptApp.newTrigger('evsOnChange').forSpreadsheet(EVS_ON_ID).onChange().create();
    if (!has['evsSyncTick']) ScriptApp.newTrigger('evsSyncTick').timeBased().everyMinutes(10).create();
  } catch(e){}
}
/* action=eventSync — app gọi sau khi sửa sự kiện / bài đăng (tối đa 1 lần / 20 giây) · mode=status chỉ xem */
function evsApiSync(user, p){
  p = p || {};
  if (String(p.mode || '') === 'status'){
    var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EVS_LAST') || '{}'); } catch(e){}
    return { ok:true, last:last };
  }
  if (!p.force && typeof throttleOk === 'function' && !throttleOk('evs_api', 20))
    return { ok:true, skipped:true, message:'Vừa đồng bộ — đợi vài giây.' };
  var r = evsSync({});
  try { if (r && r.ok && typeof logActivity === 'function' && (r.keysNew || r.keysDel || r.subsNew || r.subsDel)) logActivity('System', 'update', r.message, '', ''); } catch(e){}
  return r;
}
function evsSyncNow(){ var r = evsSync({}); Logger.log(JSON.stringify(r, null, 2)); return r; }
function installEventTriggers(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (/^evs(OnChange|SyncTick)$/.test(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  try { CacheService.getScriptCache().remove('thr_evs_install'); } catch(e){}
  evsEnsureTriggers_();
  return 'Đã cài trigger đồng bộ sự kiện (onChange 2 file MKT + 10 phút/lần).';
}
