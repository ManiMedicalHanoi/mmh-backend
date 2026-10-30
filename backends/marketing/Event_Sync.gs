/*************************************************************************************************
 * MMH REPORT HUB — Event_Sync.gs   (v2.1 · 15/10/2026 · v2.1: dọn dòng sub lỗi do v1 chèn lặp, ghi lỗi thì xoá dòng vừa chèn)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * v2.0 (người dùng yêu cầu 15/10/2026) — BỎ việc tự tạo Key task từ file MKT Offline:
 *  ① Dọn 1 lần (Script Property EVS_CLEAN_V2): xoá các key "Marketing-Event" do hệ thống tự tạo (cột U "EK:…") cùng
 *     sub bài đăng ("E:…") của chúng. KHÔNG xoá: key do người dùng tạo (có trong ActivityLog "tạo Key Task mới"), key có
 *     sub-task gõ tay, key đã bị sửa Kết quả / PIC / ngày ⇒ chỉ gỡ dấu "EK:" (thành key thường, sửa / xoá được).
 *     Dòng bị xoá được chép vào sheet ẩn "EVS_Removed" (khôi phục được).
 *  ② Đặt tên key sự kiện: app gọi action=evList ⇒ danh sách sự kiện (REPORT_EVENT + PLAN_EVENT) để GỢI Ý đúng tên
 *     (tránh tên lệch). Không tạo key tự động nữa.
 *  ③ Bài đăng MKT online (file Digital ▸ EVENT REPORT, cột Event = tên sự kiện) ⇒ sub-task CHỈ ĐỌC ("E:…") chèn thẳng
 *     dưới Key task có TÊN TRÙNG tên sự kiện (không phân biệt hoa thường / dấu / khoảng trắng) — key do người dùng tạo:
 *        tên    = Type of content _ Format _ Pillar      (vd. "Tuyển sinh_Design post_Before event")
 *        Start = Deadline = On-air dự kiến · Result = Status + Note + Nội dung + link · trạng thái theo cột Status
 *     Đổi tên key khác tên sự kiện ⇒ sub bài đăng tự gỡ; đặt lại đúng tên ⇒ tự gắn lại.
 * Chạy: trigger onChange 2 file MKT (tự cài) + 10 phút/lần + action=eventSync (app gọi sau khi thêm / sửa key).
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
        form: evsS_(evsGet_(t, r, ['Hình thức'])),   /* 30/10/2026: MKT_EventPlan.gs (Trực tiếp / Webinar) */
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

/* ── Dựng sub bài đăng cần có (chỉ cho sự kiện đã có Key task cùng tên) ── */
function evsPostStatus_(p, today){
  var s = p.status;
  if (/cancel/i.test(s)) return { st:'Cancelled', p:0 };
  if (/on air/i.test(s) || p.link) return { st:'Completed', p:100 };
  if (/pending/i.test(s)) return { st:'To Do', p:0 };
  if (s) return { st:'In Progress', p:50 };
  return (p.plan && p.plan <= today) ? { st:'In Progress', p:25 } : { st:'To Do', p:0 };
}
function evsBuildSubs_(posts, keyNk){
  var today = evsIso_(new Date()), subs = {};
  Object.keys(posts).forEach(function(nk){
    if (!keyNk[nk]) return;
    var used = {};
    posts[nk].forEach(function(p){
      var nm = [p.kind, p.format, p.pillar].filter(String).join('_') || 'Bài đăng';
      var base = nm, n = 1; while (used[nm]) nm = base + ' (' + (++n) + ')'; used[nm] = 1;
      var ps = evsPostStatus_(p, today), R = [];
      R.push('Status: ' + (p.status || '(chưa có)'));
      if (p.note) R.push('Note: ' + p.note);
      if (p.main) R.push('Nội dung: ' + p.main);
      if (p.real) R.push('On-air thực tế: ' + evsFmt_(p.real));
      if (p.link) R.push(p.link);
      var o = { syncKey:'E:' + evsHash_(nk + '|' + nm), parent:nk, type:'', keyTask:'', subTask:nm,
                pic:EVS_POST_PIC, result:R.join('\n'), start:p.plan || '', planned:p.plan || '',
                status:ps.st, progress:ps.p,
                meta:{ s:'eventpost', t:p.format, pg:p.page, ts:p.status, r:p.row } };
      o.hash = evsHash_([o.subTask, o.pic, o.result, o.start, o.planned, o.status, 'v2', nk].join('¦')); o.meta.h = o.hash;
      subs[o.syncKey] = o;
    });
  });
  return subs;
}

/* ── Quét "Weekly new": key (theo tên đã chuẩn hoá), sub bài đăng E:, key EK: cũ ── */
function evsScan_(sh){
  var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = sh.getLastRow();
  var idx = { keys:{}, byNk:{}, subs:{}, blockEnd:{}, manual:{}, keyRows:[], ek:[] };
  if (last < dr) return idx;
  var n = last - dr + 1, w = evsColMeta_() - 1, v = sh.getRange(dr, 2, n, w).getValues();
  var iK = evsColKey_() - 2, iM = evsColMeta_() - 2, cur = null;
  for (var i = 0; i < n; i++){
    var row = dr + i, f = evsS_(v[i][4]), g = evsS_(v[i][5]), u = evsS_(v[i][iK]);
    var has = !!(evsS_(v[i][3]) || f || g || u);
    var meta = {}; try { meta = JSON.parse(evsS_(v[i][iM]) || '{}') || {}; } catch(e){}
    if (f){
      cur = { row:row, u:u, title:f, nk:evsNorm_(f), type:evsS_(v[i][3]), meta:meta, vals:v[i] };
      idx.keyRows.push(cur); idx.blockEnd[row] = row; idx.manual[row] = 0;
      if (u.indexOf('EK:') === 0){ idx.keys[u] = cur; idx.ek.push(cur); }
      if (cur.nk){
        var o = idx.byNk[cur.nk];
        /* trùng tên nhiều key: ưu tiên key loại Marketing-Event, rồi key trên cùng */
        if (!o || (o.type !== EVS_TYPE && cur.type === EVS_TYPE)) idx.byNk[cur.nk] = cur;
      }
      continue;
    }
    if (cur && has){
      idx.blockEnd[cur.row] = row;
      if (u.indexOf('E:') === 0) idx.subs[u] = { row:row, parentNk:cur.nk, parentRow:cur.row, hash:meta.h || '' };
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
function evsWrite_(sh, row, list){
  var el = [], no = [], uv = [];
  list.forEach(function(o){
    el.push([o.type || '', o.keyTask || '', o.subTask || '', o.pic || '', o.result || '',
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
function evsDelRows_(sh, dels){
  dels = dels.slice().sort(function(a, b){ return b - a; });
  for (var di = 0; di < dels.length; ){
    var end = dels[di], cnt = 1;
    while (di + cnt < dels.length && dels[di + cnt] === end - cnt) cnt++;
    sh.deleteRows(end - cnt + 1, cnt); di += cnt;
  }
}

/* ══════════════ ① DỌN 1 LẦN: key sự kiện do hệ thống tự tạo (v1.x) ══════════════ */
/* tên key người dùng tự tạo (ActivityLog: "tạo Key Task mới", người tạo khác System) */
function evsUserKeyNames_(){
  var out = {};
  try {
    var s = (typeof activitySheet === 'function') ? activitySheet() : null; if (!s) return out;
    var last = s.getLastRow(); if (last < 2) return out;
    s.getRange(2, 1, last - 1, 6).getValues().forEach(function(r){
      if (evsS_(r[2]) !== 'add' || /^system$/i.test(evsS_(r[1]))) return;
      if (!/key task/i.test(evsS_(r[3]))) return;
      var nk = evsNorm_(r[4]); if (nk) out[nk] = 1;
    });
  } catch(e){}
  return out;
}
/* key còn đúng như hệ thống ghi (tên, PIC, kết quả, ngày) — người dùng chưa sửa gì */
function evsUntouched_(k){
  var v = k.vals || [], m = k.meta || {};
  if (!m.h) return false;
  var st = evsS_(v[12]);
  var h = evsHash_([evsS_(v[4]), evsS_(v[6]), evsS_(v[7]), evsDateISO_(v[8]), evsDateISO_(v[9]), st].join('¦'));
  if (h === m.h) return true;
  /* trạng thái do sub bài đăng tự cộng dồn (syncKeyRollup) ⇒ so lại không tính trạng thái */
  var stats = ['To Do', 'In Progress', 'Completed', 'Cancelled', 'Pending', ''];
  for (var i = 0; i < stats.length; i++)
    if (evsHash_([evsS_(v[4]), evsS_(v[6]), evsS_(v[7]), evsDateISO_(v[8]), evsDateISO_(v[9]), stats[i]].join('¦')) === m.h) return true;
  return false;
}
function evsCleanV2_(sh, force){
  var pr = PropertiesService.getScriptProperties();
  if (!force && pr.getProperty('EVS_CLEAN_V2')) return null;
  var idx = evsScan_(sh), rep = { removedKeys:0, removedSubs:0, keptKeys:0, kept:[], removed:[] };
  if (!idx.ek.length){ pr.setProperty('EVS_CLEAN_V2', JSON.stringify({ at:Date.now(), removedKeys:0, keptKeys:0 })); return rep; }
  var users = evsUserKeyNames_(), dels = [], untag = [];
  idx.ek.forEach(function(k){
    var userMade = !!users[k.nk], manualSubs = idx.manual[k.row] > 0, edited = !evsUntouched_(k);
    if (userMade || manualSubs || edited){
      untag.push(k.row); rep.keptKeys++;
      rep.kept.push(k.title + ' (' + (userMade ? 'người dùng tạo' : manualSubs ? 'có sub-task tay' : 'đã sửa') + ')');
      return;
    }
    dels.push(k.row); rep.removedKeys++; rep.removed.push(k.title);
    Object.keys(idx.subs).forEach(function(sk){ var s = idx.subs[sk]; if (s.parentRow === k.row){ dels.push(s.row); rep.removedSubs++; } });
  });
  /* sao lưu dòng bị xoá */
  if (dels.length){
    try {
      var ss = sh.getParent(), bk = ss.getSheetByName('EVS_Removed');
      if (!bk){ bk = ss.insertSheet('EVS_Removed'); bk.appendRow(['Xoá lúc', 'Dòng cũ', 'B…V của dòng (No · … · cột U · cột V)']); try { bk.hideSheet(); } catch(e){} }
      var w = evsColMeta_() - 1, now = new Date(), rows = [];
      dels.slice().sort(function(a, b){ return a - b; }).forEach(function(r){
        rows.push([now, r].concat(sh.getRange(r, 2, 1, w).getValues()[0].map(function(x){ return x instanceof Date ? evsIso_(x) : x; })));
      });
      bk.getRange(bk.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    } catch(e){ rep.backupError = String(e && e.message || e); }
  }
  untag.forEach(function(r){ evsSetSafe_(sh.getRange(r, evsColKey_(), 1, 2), [['', '']]); });
  evsDelRows_(sh, dels);
  SpreadsheetApp.flush();
  try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
  try { if (typeof _SH_CACHE !== 'undefined') _SH_CACHE = {}; } catch(e){}
  var msg = 'Dọn key sự kiện tự tạo (v2.0): xoá ' + rep.removedKeys + ' key + ' + rep.removedSubs + ' sub bài đăng · giữ ' + rep.keptKeys + ' key (gỡ dấu tự động)';
  try { if (typeof logActivity === 'function') logActivity('System', 'delete', msg, '', ''); } catch(e){}
  pr.setProperty('EVS_CLEAN_V2', JSON.stringify({ at:Date.now(), removedKeys:rep.removedKeys, removedSubs:rep.removedSubs, keptKeys:rep.keptKeys,
                                                  kept:rep.kept.slice(0, 40), removed:rep.removed.slice(0, 80) }).slice(0, 8500));
  rep.message = msg;
  return rep;
}

/* ══════════════ ② DỌN 1 LẦN: dòng "chỉ có tên sub" do bản v1.x chèn lặp (EVS_JUNK_V1, 15/10/2026) ══════════════
 * Dòng rác = cột G có tên trùng tên sub bài đăng (Type of content_Format_Pillar, có thể kèm " (n)"), còn E/F/H/I/J/K/N/U đều trống,
 * nằm dưới Key task loại Marketing-Event. Sao lưu vào "EVS_Removed" rồi xoá. */
function evsJunkClean_(sh, posts, force){
  var pr = PropertiesService.getScriptProperties();
  if (!force && pr.getProperty('EVS_JUNK_V1')) return null;
  var names = {};
  Object.keys(posts || {}).forEach(function(nk){ (posts[nk] || []).forEach(function(p){
    names[evsNorm_([p.kind, p.format, p.pillar].filter(String).join('_'))] = 1; }); });
  var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = sh.getLastRow();
  if (last < dr){ pr.setProperty('EVS_JUNK_V1', JSON.stringify({ at:Date.now(), n:0 })); return { n:0 }; }
  var w = evsColMeta_() - 1, v = sh.getRange(dr, 2, last - dr + 1, w).getValues(), iK = evsColKey_() - 2;
  var dels = [], parentType = '', rows = [];
  for (var i = 0; i < v.length; i++){
    var r = v[i];
    if (evsS_(r[4])){ parentType = evsS_(r[3]); continue; }
    if (parentType !== EVS_TYPE) continue;
    var g = evsS_(r[5]); if (!g) continue;
    var empty = [3, 4, 6, 7, 8, 9, 12, iK].every(function(c){ return evsS_(r[c]) === ''; });
    if (!empty) continue;
    if (!names[evsNorm_(g.replace(/\s*\(\d+\)$/, ''))]) continue;
    dels.push(dr + i); rows.push([new Date(), dr + i].concat(r.map(function(x){ return x instanceof Date ? evsIso_(x) : x; })));
  }
  if (dels.length){
    try {
      var ss = sh.getParent(), bk = ss.getSheetByName('EVS_Removed');
      if (!bk){ bk = ss.insertSheet('EVS_Removed'); bk.appendRow(['Xoá lúc', 'Dòng cũ', 'B…V của dòng (No · … · cột U · cột V)']); try { bk.hideSheet(); } catch(e){} }
      bk.getRange(bk.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    } catch(e){}
    evsDelRows_(sh, dels);
    SpreadsheetApp.flush();
    try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
    try { if (typeof _SH_CACHE !== 'undefined') _SH_CACHE = {}; } catch(e){}
    try { if (typeof logActivity === 'function') logActivity('System', 'delete', 'Dọn ' + dels.length + ' dòng sub bài đăng lỗi (chỉ có tên, không PIC / ngày) dưới key sự kiện', '', ''); } catch(e){}
  }
  pr.setProperty('EVS_JUNK_V1', JSON.stringify({ at:Date.now(), n:dels.length }));
  return { n:dels.length };
}

/* ══════════════ ĐỒNG BỘ CHÍNH (v2.0: chỉ sub bài đăng dưới key người dùng đặt đúng tên sự kiện) ══════════════ */
function evsSync(opt){
  opt = opt || {};
  var T0 = Date.now(), rep = { ok:true, subsNew:0, subsUpd:0, subsDel:0, errors:[] };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok:false, error:'Đang có tiến trình ghi khác, thử lại sau.' };
  try {
    var sh = shWeekly(); if (!sh) return { ok:false, error:'Không thấy sheet Weekly new' };
    if (sh.getMaxColumns() < evsColMeta_()) sh.insertColumnsAfter(sh.getMaxColumns(), evsColMeta_() - sh.getMaxColumns());
    try { var cl = evsCleanV2_(sh, false); if (cl) rep.clean = cl.message || 'ok'; } catch(e){ rep.errors.push('Dọn key cũ: ' + (e.message || e)); }

    var posts, postsOk = true;
    try { posts = evsReadPosts_(); } catch(e){ posts = {}; postsOk = false; rep.errors.push('File Digital: ' + (e.message || e)); }
    if (postsOk){ try { var jk = evsJunkClean_(sh, posts, false); if (jk && jk.n) rep.junk = jk.n; } catch(e){ rep.errors.push('Dọn dòng lỗi: ' + (e.message || e)); } }
    var idx = evsScan_(sh), keyNk = {};
    Object.keys(idx.byNk).forEach(function(nk){ if (posts[nk]) keyNk[nk] = idx.byNk[nk]; });
    var W = evsBuildSubs_(posts, keyNk);

    /* ① xoá sub bài đăng không còn / key đổi tên / nằm sai key */
    var dels = [];
    if (postsOk) Object.keys(idx.subs).forEach(function(sk){
      var cur = idx.subs[sk], w = W[sk], k = keyNk[cur.parentNk];
      if (!w || w.parent !== cur.parentNk || !k || k.row !== cur.parentRow) dels.push(cur.row);
    });
    if (dels.length){ evsDelRows_(sh, dels); rep.subsDel = dels.length; SpreadsheetApp.flush(); idx = evsScan_(sh); }

    /* ② cập nhật sub đã có */
    Object.keys(W).forEach(function(sk){
      var w = W[sk], cur = idx.subs[sk];
      if (!cur || cur.hash === w.hash) return;
      var er = evsWrite_(sh, cur.row, [w]);
      if (er) rep.errors.push('Sub "' + w.subTask + '": ' + er); else rep.subsUpd++;
    });

    /* ③ chèn sub mới ngay dưới block của key cùng tên */
    var byParent = {};
    Object.keys(W).forEach(function(sk){ if (idx.subs[sk]) return; var w = W[sk]; (byParent[w.parent] = byParent[w.parent] || []).push(w); });
    var touched = {};
    Object.keys(byParent)
      .filter(function(nk){ return !!idx.byNk[nk]; })
      .sort(function(a, b){ return idx.blockEnd[idx.byNk[b].row] - idx.blockEnd[idx.byNk[a].row]; })
      .forEach(function(nk){
        if (Date.now() - T0 > EVS_BUDGET){ rep.partial = true; return; }
        var list = byParent[nk].sort(function(a, b){ return (a.start || '9') < (b.start || '9') ? -1 : 1; });
        var after = idx.blockEnd[idx.byNk[nk].row];
        for (var b = 0; b < list.length; b += EVS_CHUNK){
          var chunk = list.slice(b, b + EVS_CHUNK);
          sh.insertRowsAfter(after, chunk.length);
          var er = evsWrite_(sh, after + 1, chunk);
          if (er){                                   /* 15/10/2026: ghi lỗi ⇒ xoá ngay dòng vừa chèn (không để dòng trắng / dòng chỉ có tên) */
            try { sh.deleteRows(after + 1, chunk.length); } catch(e){}
            rep.errors.push('Chèn sub "' + chunk[0].subTask + '": ' + er);
            break;
          }
          evsFill_(sh, after, after + 1, chunk.length);
          after += chunk.length; rep.subsNew += chunk.length;
        }
        touched[nk] = 1;
      });
    SpreadsheetApp.flush();

    /* ④ % + trạng thái key theo sub */
    if (rep.subsNew + rep.subsUpd + rep.subsDel){
      var fresh = evsScan_(sh);
      Object.keys(keyNk).forEach(function(nk){
        var k = fresh.byNk[nk]; if (!k || fresh.blockEnd[k.row] <= k.row) return;
        var kno = evsS_(sh.getRange(k.row, 2).getValue());
        if (kno && typeof syncKeyRollup === 'function'){ try { syncKeyRollup(sh, kno); } catch(e){} }
      });
      try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
      try { if (typeof _SH_CACHE !== 'undefined') _SH_CACHE = {}; } catch(e){}
    }
    rep.keys = Object.keys(keyNk).length; rep.posts = Object.keys(W).length;
    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Bài đăng sự kiện — ' + rep.keys + ' key sự kiện · ' + rep.posts + ' bài đăng · sub mới ' + rep.subsNew +
      ' · sửa ' + rep.subsUpd + ' · xoá ' + rep.subsDel + ' · ' + rep.seconds + 's' + (rep.clean ? ' · ' + rep.clean : '') + (rep.junk ? ' · dọn ' + rep.junk + ' dòng lỗi' : '') +
      (rep.errors.length ? ' · ' + rep.errors.slice(0, 4).join(' | ') : '');
    try { PropertiesService.getScriptProperties().setProperty('EVS_LAST', JSON.stringify({ at:Date.now(), msg:rep.message })); } catch(e){}
    return rep;
  } catch(err){
    return { ok:false, error:String(err && err.message || err) };
  } finally { try { lock.releaseLock(); } catch(e){} }
}

/* ══════════════ action=evList — danh sách sự kiện để GỢI Ý tên Key task (chỉ đọc, đệm 10 phút) ══════════════
 * ⇒ { ok, events:[{ n:tên, s:yyyy-mm-dd, e:yyyy-mm-dd, ym, t:Type of event, sg:Segment, pd:Target product, pl:Place,
 *                    k:KOL, src:'R'|'P', f:link folder, np:số bài đăng ở EVENT REPORT }], at }
 * Cửa sổ: tháng hiện tại − EVS_LIST_BACK … + EVS_LIST_FWD. fresh=1 ⇒ đọc lại ngay. */
var EVS_LIST_BACK = 4, EVS_LIST_FWD = 9;
function evsApiList(user, p){
  p = p || {};
  var c = CacheService.getScriptCache(), ck = 'evs_list_v2';
  if (!p.fresh){ var hit = c.get(ck); if (hit){ try { var o = JSON.parse(hit); o.cached = true; return o; } catch(e){} } }
  var events;
  try { events = evsReadEvents_(); } catch(e){ return { ok:false, error:'Không đọc được file MKT Offline: ' + (e.message || e) }; }
  var posts = {}; try { posts = evsReadPosts_(); } catch(e){}
  var now = new Date(), lo = new Date(now.getFullYear(), now.getMonth() - EVS_LIST_BACK, 1), hi = new Date(now.getFullYear(), now.getMonth() + EVS_LIST_FWD + 1, 0);
  var loS = evsIso_(lo), hiS = evsIso_(hi);
  var out = events.filter(function(e){ return e.end >= loS && e.start <= hiS; }).map(function(e){
    return { n:e.name, s:e.start, e:e.end, ym:e.ym, t:e.type, sg:e.segment, pd:e.product, pl:e.place, k:e.kol, src:e.src,
             f:e.folderUrl || (/^https?:/.test(e.folder) ? e.folder : ''), np:(posts[e.nk] || []).length, ax:e.approx ? 1 : undefined };
  }).sort(function(a, b){ return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
  var res = { ok:true, events:out, at:Date.now() };
  try { var js = JSON.stringify(res); if (js.length < 95000) c.put(ck, js, 600); } catch(e){}
  return res;
}

/* ══════════════ KHOÁ: key sự kiện không xoá / không đổi tên trên Hub ══════════════ */
function evsIsEventKeyRow(sh, row){
  try { return /^EK:/.test(evsS_(sh.getRange(row, evsColKey_()).getValue())); } catch(e){ return false; }
}
var EVS_LOCK_MSG = 'Key task sự kiện đồng bộ từ file MKT Offline — đổi tên / xoá sự kiện ở file "2. Vietnam - Marketing Offline FY68".';   /* v2.0: không còn key EK: (đã dọn) */

/* ══════════════ TRIGGER / API ══════════════ */
function evsSyncTick(){
  try { if (typeof mktaRun_ === 'function') mktaRun_({}); } catch(_e){}          /* MKT_SheetAuto.gs: Month / On-air / Status / Check deadline / Ads */
  evsSync({});
  try { if (typeof epSync === 'function') epSync({}); } catch(_e){}               /* 30/10/2026: MKT_EventPlan.gs — file Kế hoạch & tiến độ sự kiện */
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
    var cl = {}; try { cl = JSON.parse(PropertiesService.getScriptProperties().getProperty('EVS_CLEAN_V2') || '{}'); } catch(e){}
    return { ok:true, ver:'2.0', last:last, clean:cl };
  }
  if (!p.force && typeof throttleOk === 'function' && !throttleOk('evs_api', 20))
    return { ok:true, skipped:true, message:'Vừa đồng bộ — đợi vài giây.' };
  var r = evsSync({});
  try { if (r && r.ok && typeof logActivity === 'function' && (r.subsNew || r.subsDel)) logActivity('System', 'update', r.message, '', ''); } catch(e){}
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
