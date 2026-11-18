/*************************************************************************************************
 * MMH — MKT_EventHubUnlink.gs   (v1.0 · 18/11/2026) — NGẮT app "Sự kiện MKT" khỏi Report Hub (nhóm MKT) + dọn sub-task app đã đẩy vào
 * Người dùng yêu cầu 18/11/2026: "tạm ngắt, cái gì đã add vào thì xoá khỏi backend Report Hub nhóm MKT — có key task hiện ~1000 sub-task do link từ app".
 *  · Ngắt: EH_HUB_LINK = false ⇒ ehHubSubs_ (MKT_EventHubFlow.gs) trả rỗng dù EVS_HUB (Event_Sync.gs) bị bật lại. Sub bài đăng "E:" (file Digital) KHÔNG thuộc app — giữ.
 *  · Rà (CHỈ ĐỌC): action ehUnlink&key=<8 ký tự cuối EH.ROOT>&op=status — đếm sub theo key trên sheet WEEKLY, phân loại:
 *      app  = dấu cột U "H:" · cột V {s:"eventhub"} · Kết quả bắt đầu "App Sự kiện MKT · " (như evsHubPurge_)
 *      tpl  = sub KHÔNG có dấu nào nhưng tên trùng tên việc của app (tab TASKS / TEMPLATE của Event Hub) và tên đó lặp ≥ EHU.MINDUP lần trong cùng key
 *             (bản lặp mất dấu do đồng bộ chạy chồng — người dùng không tự gõ cùng 1 tên ≥ 3 lần)
 *      tomb = dòng đã xoá trắng chờ gỡ (cột V = EVS_TOMB)
 *    trả top key nhiều sub nhất (tên key · số sub · số app / tpl · tên lặp nhiều nhất) — không trả nội dung kết quả.
 *  · Dọn: op=run (&what=app,tpl — mặc định cả 2): sao lưu nguyên dòng B…V vào sheet ẩn "EVS_Removed" ⇒ XOÁ TRẮNG E:L · N:O · U (dòng biến mất khỏi Report Hub ngay),
 *    cột V = EVS_TOMB ⇒ evsTombDel_ (lượt đồng bộ 10 phút) / op=tomb gỡ dần dòng trắng. Key cha giữ nguyên. Giữ ScriptLock khi ghi.
 *************************************************************************************************/
var EH_HUB_LINK = false;            /* false = KHÔNG đẩy việc app Sự kiện MKT vào Report Hub (tạm ngắt 18/11/2026) */
var EHU = { MINDUP: 3, TOP: 25 };

function ehuNorm_(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s*\(\d+\)\s*$/, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

/* tên việc của app (TASKS + TEMPLATE) — dùng để nhận bản lặp mất dấu */
function ehuAppNames_(){
  var set = {};
  try {
    var ss = ehBook_();
    ['TASKS', 'TEMPLATE'].forEach(function(tab){ try { ehRead_(ss, tab).forEach(function(t){ var n = ehuNorm_(t.title || t.name || t.task); if (n) set[n] = 1; }); } catch(e){} });
  } catch(e){}
  return set;
}

/* đọc WEEKLY ⇒ phân loại từng dòng sub */
function ehuScan_(sh){
  var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = sh.getLastRow();
  var out = { rows: 0, subs: 0, keys: [], app: [], tpl: [], tomb: 0, values: {} };
  if (last < dr) return out;
  var w = evsColMeta_() - 1, v = sh.getRange(dr, 2, last - dr + 1, w).getValues(), iK = evsColKey_() - 2, iM = evsColMeta_() - 2;
  var names = ehuAppNames_(), cur = null, K = [];
  out.rows = v.length; out.appNames = Object.keys(names).length;
  for (var i = 0; i < v.length; i++){
    var r = v[i], f = evsS_(r[4]), g = evsS_(r[5]);
    if (f){ cur = { row: dr + i, no: evsS_(r[0]), title: f.slice(0, 120), pic: evsS_(r[6]), subs: [], n: 0, app: 0, tpl: 0, post: 0, nm: {} }; K.push(cur); continue; }
    if (evsS_(r[iM]) === EVS_TOMB){ out.tomb++; continue; }
    if (!g) continue;
    out.subs++;
    var row = dr + i, kind = evsHubRow_('', r, iK, iM) ? 'app' : '';
    if (evsS_(r[iK]).indexOf('E:') === 0) kind = kind || 'post';
    var nm = ehuNorm_(g);
    if (cur){ cur.n++; cur.nm[nm] = (cur.nm[nm] || 0) + 1; cur.subs.push({ row: row, nm: nm, kind: kind }); }
    out.values[row] = r;
    if (kind === 'app'){ out.app.push(row); if (cur) cur.app++; }
    if (kind === 'post' && cur) cur.post++;
  }
  /* bản lặp mất dấu: tên trùng việc app + lặp ≥ MINDUP trong cùng key */
  K.forEach(function(k){
    k.subs.forEach(function(s){ if (!s.kind && names[s.nm] && k.nm[s.nm] >= EHU.MINDUP){ s.kind = 'tpl'; out.tpl.push(s.row); k.tpl++; } });
  });
  out.keys = K;
  return out;
}

function ehuSummary_(sc){
  var top = sc.keys.filter(function(k){ return k.n; }).sort(function(a, b){ return b.n - a.n; }).slice(0, EHU.TOP).map(function(k){
    var dup = Object.keys(k.nm).sort(function(a, b){ return k.nm[b] - k.nm[a]; }).slice(0, 3).filter(function(n){ return k.nm[n] > 1; }).map(function(n){ return n.slice(0, 50) + ' ×' + k.nm[n]; });
    return { row: k.row, no: k.no, key: k.title, pic: k.pic, subs: k.n, app: k.app, tpl: k.tpl, post: k.post, dup: dup };
  });
  return { rows: sc.rows, keys: sc.keys.length, subs: sc.subs, appRows: sc.app.length, tplRows: sc.tpl.length, tombLeft: sc.tomb, appNames: sc.appNames, top: top };
}

/* xoá trắng các dòng (đã sao lưu) — như evsHubPurge_ v2.3.2 */
function ehuClear_(sh, rows, sc, why){
  if (!rows.length) return { n: 0 };
  var now = new Date(), bk;
  var data = rows.map(function(rw){ return [now, rw].concat((sc.values[rw] || []).map(function(x){ return x instanceof Date ? evsIso_(x) : x; })); });
  try {
    var ss = sh.getParent(); bk = ss.getSheetByName('EVS_Removed');
    if (!bk){ bk = ss.insertSheet('EVS_Removed'); bk.appendRow(['Xoá lúc', 'Dòng cũ', 'B…V của dòng (No · … · cột U · cột V)']); try { bk.hideSheet(); } catch(e){} }
    var wmax = Math.max.apply(null, data.map(function(d){ return d.length; }));
    data = data.map(function(d){ while (d.length < wmax) d.push(''); return d; });
    bk.getRange(bk.getLastRow() + 1, 1, data.length, wmax).setValues(data);
  } catch(e){ return { n: 0, error: 'Không sao lưu được — chưa xoá: ' + (e.message || e) }; }
  var asc = rows.slice().sort(function(a, b){ return a - b; }), runs = [];
  for (var i = 0; i < asc.length; ){ var st = asc[i], c = 1; while (i + c < asc.length && asc[i + c] === st + c) c++; runs.push([st, st + c - 1]); i += c; }
  var L = function(c){ var t = ''; while (c > 0){ var m = (c - 1) % 26; t = String.fromCharCode(65 + m) + t; c = (c - m - 1) / 26; } return t; };
  var A1 = function(c1, c2){ return runs.map(function(r){ return L(c1) + r[0] + ':' + L(c2) + r[1]; }); };
  /* RangeList theo lô (giới hạn độ dài danh sách vùng) */
  var lots = function(list, fn){ for (var j = 0; j < list.length; j += 400) fn(sh.getRangeList(list.slice(j, j + 400))); };
  try {
    lots(A1(5, 12), function(rl){ rl.clearContent(); });
    lots(A1(14, 15), function(rl){ rl.clearContent(); });
    lots(A1(evsColKey_(), evsColKey_()), function(rl){ rl.clearContent(); });
    lots(A1(evsColMeta_(), evsColMeta_()), function(rl){ rl.setValue(EVS_TOMB); });
    SpreadsheetApp.flush();
  } catch(e){ return { n: 0, error: 'Chưa xoá trắng được: ' + (e.message || e) }; }
  try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
  try { if (typeof _SH_CACHE !== 'undefined') _SH_CACHE = {}; } catch(e){}
  try { if (typeof logActivity === 'function') logActivity('System', 'delete', 'Ngắt app Sự kiện MKT ⇄ Report Hub: xoá ' + rows.length + ' sub-task (' + why + '), đã sao lưu sheet EVS_Removed', '', ''); } catch(e){}
  return { n: rows.length };
}

function ehUnlinkApi_(p){
  if (String(p.key || '') !== ehKey_()) return { ok: false, error: 'key' };
  var op = String(p.op || 'status'), sh = shWeekly(); if (!sh) return { ok: false, error: 'Không thấy sheet Weekly' };
  var base = { ok: true, ver: '1.0', link: EH_HUB_LINK, evsHub: (typeof EVS_HUB !== 'undefined') ? EVS_HUB : null };
  if (op === 'tomb'){
    var lk0 = LockService.getScriptLock(); if (!lk0.tryLock(20000)) return { ok: false, busy: true, error: 'Đang có tiến trình ghi khác, thử lại sau.' };
    try { base.tomb = evsTombDel_(sh); } finally { try { lk0.releaseLock(); } catch(e){} }
    return base;
  }
  if (op !== 'run'){ base.scan = ehuSummary_(ehuScan_(sh)); return base; }
  var what = String(p.what || 'app,tpl').split(','), lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, busy: true, error: 'Đang có tiến trình ghi khác, thử lại sau.' };
  try {
    var sc = ehuScan_(sh), rows = [];
    if (what.indexOf('app') >= 0) rows = rows.concat(sc.app);
    if (what.indexOf('tpl') >= 0) rows = rows.concat(sc.tpl);
    base.before = ehuSummary_(sc); delete base.before.top;
    base.clear = ehuClear_(sh, rows, sc, what.join('+'));
    try { PropertiesService.getScriptProperties().setProperty('EHU_LAST', JSON.stringify({ at: Date.now(), what: what, n: base.clear.n, err: base.clear.error || '' })); } catch(e){}
    try { CacheService.getScriptCache().remove('eh_boot'); } catch(e){}
  } finally { try { lock.releaseLock(); } catch(e){} }
  try { base.after = ehuSummary_(ehuScan_(sh)); base.after.top = base.after.top.slice(0, 10); } catch(e){}
  return base;
}
