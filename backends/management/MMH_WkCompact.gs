/* ══════════════ MMH_WkCompact.gs — DỌN DÒNG TRỐNG sheet WEEKLY (16/11/2026) ══════════════
 * GIỐNG HỆT ở marketing / backoffice / management (sửa 1 nơi ⇒ chép sang 2 nơi kia).
 *
 * Vấn đề (đo bằng wkDiag 16/11/2026): sheet "WEEKYLY new" của Marketing có 25.426 dòng nhưng chỉ 2.218 dòng có việc —
 * 21.405 dòng trống ở giữa (chỉ còn công thức cột M Leadtime / Q Behavior kéo xuống) ⇒ mọi lần đọc / ghi phải lội qua
 * 25 nghìn dòng: tải danh sách việc 5–41 giây, thêm / sửa việc (quét cột B, E:G) chậm theo.
 *
 * Cách dọn — KHÔNG làm mất dữ liệu:
 *   ① Chỉ xét KHOẢNG ≥ WKC.MIN_RUN dòng liền nhau không có Key / Sub task (cột F, G). Khoảng nhỏ giữa các nhóm việc giữ nguyên.
 *      Khoảng ở giữa: giữ lại WKC.KEEP_GAP dòng đầu; cuối sheet: giữ WKC.KEEP_TAIL dòng trống (có sẵn công thức để gõ tiếp).
 *   ② Một dòng chỉ bị xoá khi TRỐNG THẬT trên MỌI cột: không có ô giá trị nào (kể cả dấu cách, ô tick), không ghi chú,
 *      công thức (nếu có) đúng là công thức dòng mẫu của cột đó (R1C1 giống ≥ WKC.FX_MIN dòng có việc) và không phải
 *      công thức mảng / nhập dữ liệu (WKC.SPILL). Dòng không đạt ⇒ GIỮ, ghi lý do (cột) vào báo cáo.
 *   ③ Trước khi xoá: sao lưu CẢ FILE sang Drive (cùng thư mục, tên "[Sao lưu … ]"). Không sao lưu được ⇒ dừng, không xoá gì.
 *   ④ Xoá từ dưới lên, mỗi đợt ≤ WKC.CHUNK dòng: giữ khoá ghi (LockService — mọi lệnh ghi của backend dùng chung khoá này),
 *      đọc lại đúng các dòng sắp xoá NGAY trước khi xoá. Trong lúc dọn, trigger onEdit không tự đóng dấu ngày (cờ wkc_on).
 *   ⑤ Xong: đếm lại dòng có việc + so dấu nội dung (cột B..X của mọi dòng có việc) trước / sau ⇒ báo cáo WKC_STATE.
 * Số No là công thức / giá trị theo thứ tự Key task ⇒ không đổi; app ghi theo No + tên việc (resolveRow) ⇒ dòng dời vẫn đúng.
 *
 * API (khoá = 8 ký tự cuối SS_ID): ?action=wkCompact&key=…&op=status | plan | run | stop | verify
 *   verify: chỉ đọc — đối chiếu TỪNG dòng có việc của bản sao lưu với sheet hiện tại (thiếu / đổi / mới), chỉ trả số đếm + số No.
 *   plan [&min=50&tail=200]: chỉ đọc — kế hoạch xoá.  run: bắt đầu dọn (chạy nền bằng trigger, không có quyền trigger ⇒ chạy ngay ≤ 45 giây / lượt, gọi lại run để chạy tiếp).
 * Tự động: warmCache gọi wkcAuto_ — tối đa 1 lần / ngày, 19:00–21:00, khi có khoảng trống ≥ WKC.AUTO_RUN dòng.        */
var WKC = {
  VER: '1.0', P: 'WKC_STATE', MIN_RUN: 50, KEEP_GAP: 1, KEEP_TAIL: 200, CHUNK: 2000, PAD: 3, FX_MIN: 20,
  BUDGET: 240000, SYNC_BUDGET: 45000, AUTO_RUN: 1000,
  SPILL: /ARRAYFORMULA|\bMAP\(|BYROW\(|BYCOL\(|SCAN\(|REDUCE\(|MAKEARRAY\(|LAMBDA\(|FILTER\(|QUERY\(|SORTN?\(|UNIQUE\(|IMPORT(RANGE|DATA|XML|HTML|FEED)|SEQUENCE\(|SPLIT\(|TRANSPOSE\(|FLATTEN\(|GOOGLEFINANCE|IMAGE\(/i
};
function wkcCol_(j){ var s = '', n = j + 1; while(n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function wkcGet_(){ try{ return JSON.parse(PropertiesService.getScriptProperties().getProperty(WKC.P) || 'null'); }catch(e){ return null; } }
function wkcPut_(S){ S.updated = new Date().toISOString(); PropertiesService.getScriptProperties().setProperty(WKC.P, JSON.stringify(S)); }
function wkcAllowGet_(){ try{ return JSON.parse(PropertiesService.getScriptProperties().getProperty(WKC.P + '_FX') || '{}'); }catch(e){ return {}; } }
function wkcAllowPut_(a){ PropertiesService.getScriptProperties().setProperty(WKC.P + '_FX', JSON.stringify(a || {})); }
function wkcSheet_(){ _SH_CACHE = {}; return shWeekly(); }
function wkcBusy_(on){ try{ var c = CacheService.getScriptCache(); if(on) c.put('wkc_on', '1', 180); else c.remove('wkc_on'); }catch(e){} }
function wkcIsBusy_(){ try{ return CacheService.getScriptCache().get('wkc_on') === '1'; }catch(e){ return false; } }

/* ── kế hoạch: đọc cột F:G ⇒ các khoảng trống cần xoá [a, b] (a..b, từ dưới lên) ── */
function wkcPlan_(sh, o){
  o = o || {};
  var minRun = Math.max(20, +o.min || WKC.MIN_RUN), keepTail = Math.max(50, +o.tail || WKC.KEEP_TAIL), keepGap = WKC.KEEP_GAP;
  var D = WEEKLY_DATA_ROW, last = sh.getLastRow(), max = sh.getMaxRows();
  var out = { last:last, max:max, lastContent:D - 1, contentRows:0, runs:[], dels:[], total:0, minRun:minRun, keepTail:keepTail };
  if(last < D) return out;
  var fg = sh.getRange(D, 6, last - D + 1, 2).getValues(), st = 0, segs = [], sg = 0, se = 0;
  for(var i = 0; i < fg.length; i++){
    var r = D + i, has = String(fg[i][0] == null ? '' : fg[i][0]).trim() || String(fg[i][1] == null ? '' : fg[i][1]).trim();
    if(has){
      out.contentRows++; out.lastContent = r;
      if(st){ var ln = r - st; if(ln >= minRun){ out.runs.push([st, ln]); if(ln - keepGap > 0) out.dels.push([st + keepGap, r - 1]); } st = 0; }
      if(sg && r - se > minRun){ segs.push([sg, se]); sg = 0; }
      if(!sg) sg = r; se = r;
    } else if(!st) st = r;
  }
  if(sg) segs.push([sg, se]);
  var t0 = out.lastContent + 1, tl = max - out.lastContent;          /* cuối sheet: tới hết số dòng tối đa (kể cả dòng không có công thức) */
  if(tl >= keepTail + minRun){ out.runs.push([t0, tl]); out.dels.push([t0 + keepTail, max]); }
  out.dels.sort(function(a, b){ return b[0] - a[0]; });
  out.dels.forEach(function(d){ out.total += d[1] - d[0] + 1; });
  out.segs = segs;                                                     /* các đoạn có việc (để đọc gọn khi so dấu) */
  return out;
}
/* ── công thức dòng mẫu của từng cột (R1C1) — lấy từ các dòng có việc ── */
function wkcAllow_(sh, plan){
  var mc = sh.getMaxColumns(), cnt = {}, allow = {};
  (plan.segs || []).forEach(function(s){
    var n = s[1] - s[0] + 1; if(n < 1) return;
    var F = sh.getRange(s[0], 1, n, mc).getFormulasR1C1();
    for(var i = 0; i < F.length; i++) for(var j = 0; j < mc; j++){
      var f = F[i][j]; if(!f || WKC.SPILL.test(f)) continue;
      var k = j + '|' + f; cnt[k] = (cnt[k] || 0) + 1;
    }
  });
  Object.keys(cnt).forEach(function(k){
    if(cnt[k] < WKC.FX_MIN) return;
    var p = k.indexOf('|'), j = k.slice(0, p); (allow[j] = allow[j] || []).push(k.slice(p + 1));
  });
  return allow;
}
/* ── dấu nội dung: mọi dòng có Key / Sub task, cột B..X (giá trị) ── */
function wkcSig_(sh, plan){
  var vw = Math.min(24, sh.getMaxColumns()) - 1, parts = [], rows = 0;
  (plan.segs || []).forEach(function(s){
    var V = sh.getRange(s[0], 2, s[1] - s[0] + 1, vw).getValues();
    for(var i = 0; i < V.length; i++){
      if(!(String(V[i][4] == null ? '' : V[i][4]).trim() || String(V[i][5] == null ? '' : V[i][5]).trim())) continue;
      rows++; parts.push(JSON.stringify(V[i]));
    }
  });
  var dg = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, parts.join('\n'), Utilities.Charset.UTF_8);
  return { rows:rows, sig:Utilities.base64Encode(dg).slice(0, 16), at:new Date().toISOString() };
}
/* ── sao lưu cả file sang Drive ── */
function wkcBackup_(){
  var f = DriveApp.getFileById(SS_ID), it = f.getParents(), folder = it.hasNext() ? it.next() : null;
  var tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  var nm = '[Sao lưu trước khi dọn dòng trống ' + Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm') + '] ' + f.getName();
  var c = folder ? f.makeCopy(nm, folder) : f.makeCopy(nm);
  return { id:c.getId(), name:nm, url:c.getUrl() };
}
/* ── 1 dòng có xoá được không: '' = được; khác = lý do (cột) ── */
function wkcRowWhy_(v, f, n, allow){
  for(var j = 0; j < v.length; j++){
    if(n && n[j]) return 'note:' + wkcCol_(j);
    if(f[j]){
      var ok = !WKC.SPILL.test(f[j]) && allow[j] && allow[j].indexOf(f[j]) >= 0;
      if(!ok) return 'fx:' + wkcCol_(j);
      continue;
    }
    var x = v[j];
    if(x === '' || x === null || x === false) continue;
    return 'val:' + wkcCol_(j);
  }
  return '';
}
/* ── xử lý 1 đợt (dòng a..b) — gọi khi ĐANG giữ khoá ghi. Trả về dòng trên cùng còn phải xét (next) ──
   · Đọc thêm WKC.PAD dòng trên / dưới; 1 dòng chỉ xoá khi nó VÀ PAD dòng mỗi bên đều trống thật ⇒ có người chèn / xoá
     ≤ PAD dòng phía trên trong tích tắc giữa lúc đọc và lúc xoá thì phần bị xoá vẫn chỉ là dòng trống.
   · Mỗi lần đọc chỉ xoá 1 đoạn (đoạn dưới cùng); số dòng của sheet đổi so với lúc đọc ⇒ không xoá, đọc lại.            */
function wkcChunk_(sh, a, b, allow, S){
  var mc = sh.getMaxColumns(), mr0 = sh.getMaxRows(), P = WKC.PAD, D = WEEKLY_DATA_ROW;
  b = Math.min(b, mr0); if(b < a) return a - 1;
  var ra = Math.max(D, a - P), rb = Math.min(mr0, b + P), n = rb - ra + 1;
  var rg = sh.getRange(ra, 1, n, mc), V = rg.getValues(), F = rg.getFormulasR1C1(), N = rg.getNotes();
  var ok = [], why0 = [];
  for(var i = 0; i < n; i++){ var w = wkcRowWhy_(V[i], F[i], N[i], allow); ok.push(!w); why0.push(w); }
  function tally(x, y){ for(var q = x; q <= y; q++){ var wq = why0[q - ra]; if(wq){ S.kept = S.kept || {}; S.kept[wq] = (S.kept[wq] || 0) + 1; S.keptRows = (S.keptRows || 0) + 1; } } }   /* lý do giữ — mỗi dòng đếm 1 lần (dòng đã xét xong) */
  function del(r){                                         /* r: số dòng; đủ PAD dòng trống mỗi bên (ngoài vùng đọc = mép sheet / dòng tiêu đề ⇒ không xoá) */
    for(var t = r - P; t <= r + P; t++){ if(t < ra || t > rb) { if(t > mr0) continue; return false; } if(!ok[t - ra]) return false; }
    return true;
  }
  var e = 0, s0 = 0;
  for(var r = b; r >= a; r--){ if(del(r)){ e = r; break; } }
  if(!e){ tally(a, b); return a - 1; }                     /* đợt này không còn dòng xoá được */
  s0 = e; while(s0 - 1 >= a && del(s0 - 1)) s0--;
  if(sh.getMaxRows() !== mr0){ S.retry = (S.retry || 0) + 1; return b; }   /* sheet vừa đổi số dòng ⇒ đọc lại */
  sh.deleteRows(s0, e - s0 + 1);
  SpreadsheetApp.flush();
  tally(e + 1, b);
  S.deleted = (S.deleted || 0) + (e - s0 + 1); S.calls = (S.calls || 0) + 1;
  return s0 - 1;
}
/* ── chạy các bước trong thời gian cho phép ── */
function wkcStep_(budget){
  var S = wkcGet_(); if(!S || S.state !== 'running') return S;
  var t0 = Date.now(), sh = wkcSheet_(), mc = CacheService.getScriptCache();
  if(S.stop){ S.state = 'stopped'; wkcPut_(S); return S; }
  if(mc.get('wkc_step')) return S;                                    /* đang có 1 lượt khác chạy */
  mc.put('wkc_step', '1', Math.ceil(budget / 1000) + 120);
  var allow = null, waited = false;
  try{
    if(!S.plan){
      var pl = wkcPlan_(sh, S.opts);
      S.plan = { last:pl.last, max:pl.max, lastContent:pl.lastContent, contentRows:pl.contentRows, runs:pl.runs, total:pl.total };
      S.dels = pl.dels;
      if(!pl.total){ S.state = 'done'; S.note = 'Không có khoảng trống cần dọn.'; }
      else {
        allow = wkcAllow_(sh, pl); wkcAllowPut_(allow);
        S.fxCols = Object.keys(allow).map(function(j){ return wkcCol_(+j); });
        S.before = wkcSig_(sh, pl);
        wkcPut_(S);
      }
    }
    if(S.state === 'running' && !S.backup){ S.backup = wkcBackup_(); wkcPut_(S); }   /* không sao lưu được ⇒ lỗi ⇒ dừng, chưa xoá gì */
    if(!allow) allow = wkcAllowGet_();
    while(S.state === 'running' && S.dels && S.dels.length && Date.now() - t0 < budget){
      if((wkcGet_() || {}).stop){ S.state = 'stopped'; break; }
      var d = S.dels[0], a = Math.max(d[0], d[1] - WKC.CHUNK + 1);
      var lock = LockService.getScriptLock(), tc = Date.now();
      if(!lock.tryLock(30000)){ S.waits = (S.waits || 0) + 1; waited = true; break; }
      try{
        wkcBusy_(true);
        var nx = (a <= sh.getMaxRows()) ? wkcChunk_(sh, a, d[1], allow, S) : a - 1;
      } finally { try{ lock.releaseLock(); }catch(e){} }
      if(nx < d[0]) S.dels.shift(); else d[1] = nx;
      S.lastChunkMs = Date.now() - tc;
      try{ Utilities.sleep(1500); }catch(e){}                          /* nhường khoá cho lệnh ghi đang chờ của người dùng */
      S.chunks = (S.chunks || 0) + 1;
      wkcPut_(S);
    }
    if(S.state === 'running' && (!S.dels || !S.dels.length)){
      var pl2 = wkcPlan_(wkcSheet_(), S.opts);
      S.after = wkcSig_(wkcSheet_(), pl2);
      S.after.last = pl2.last; S.after.max = pl2.max;
      S.same = !!(S.before && S.after.rows === S.before.rows && S.after.sig === S.before.sig);
      S.state = 'done'; S.ms = (S.ms || 0) + (Date.now() - t0);
      try{ touchVersion(); }catch(e){}
      wkcBusy_(false);
    } else { S.ms = (S.ms || 0) + (Date.now() - t0); }
  }catch(e){
    S.state = 'error'; S.err = String(e && e.message || e).slice(0, 300); wkcBusy_(false);
  }
  try{ wkcPut_(S); }catch(e){}
  try{ mc.remove('wkc_step'); }catch(e){}
  if(S.state === 'running' && !S.sync) wkcSchedule_(waited ? 60000 : 5000);
  return S;
}
function wkcSchedule_(ms){
  try{
    wkcDelTriggers_();
    ScriptApp.newTrigger('wkcJob').timeBased().after(Math.max(1000, ms || 1000)).create();
    return true;
  }catch(e){ return false; }
}
function wkcDelTriggers_(){
  try{ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'wkcJob') ScriptApp.deleteTrigger(t); }); }catch(e){}
}
function wkcJob(){ wkcDelTriggers_(); wkcStep_(WKC.BUDGET); }
function wkcStart_(by, opts){
  var S0 = wkcGet_();
  if(S0 && S0.state === 'running' && Date.now() - Date.parse(S0.updated || 0) < 15 * 60000) return { ok:true, already:true, state:S0 };
  var S = { ver:WKC.VER, state:'running', by:by, opts:opts || {}, started:new Date().toISOString(), source:SOURCE };
  wkcPut_(S);
  if(wkcSchedule_(1000)) return { ok:true, scheduled:true, state:S };
  S.sync = true; wkcPut_(S);                                           /* backend chưa có quyền trigger ⇒ chạy ngay, gọi lại run để chạy tiếp */
  return { ok:true, scheduled:false, state:wkcStep_(WKC.SYNC_BUDGET) };
}
/* ── tự động: 19:00–21:00, ≤ 1 lần / ngày, chỉ khi có khoảng trống lớn ── */
function wkcAuto_(h){
  try{
    if(h !== 19 && h !== 20) return;
    if(!throttleOk('wkc_auto', 20 * 3600)) return;
    var S0 = wkcGet_(); if(S0 && S0.state === 'running') return;
    var pl = wkcPlan_(wkcSheet_(), { min:WKC.AUTO_RUN });
    if(pl.total >= WKC.AUTO_RUN) wkcStart_('auto', { min:WKC.AUTO_RUN });
  }catch(e){}
}
function wkcApi_(p){
  if(String(p.key || '') !== String(SS_ID).slice(-8)) return { ok:false, error:'key' };
  var op = String(p.op || 'status');
  if(op === 'status'){
    var S = wkcGet_() || { state:'none' };
    if(S.state === 'running' && !S.stop && !S.sync && Date.now() - Date.parse(S.updated || 0) > 6 * 60000) wkcSchedule_(1000);   /* lượt trước bị dừng giữa chừng ⇒ hẹn chạy tiếp */
    var o = wkcStatusSlim_(S);
    o.left = (S.dels || []).reduce(function(t, d){ return t + d[1] - d[0] + 1; }, 0);
    try{ var sh = wkcSheet_(); o.now = { last:sh.getLastRow(), max:sh.getMaxRows() }; }catch(e){}
    return { ok:true, ver:WKC.VER, source:SOURCE, status:o };
  }
  if(op === 'plan'){                                                   /* chỉ đọc; check=1 ⇒ thử điều kiện xoá trên mẫu ≤ 300 dòng đầu / cuối mỗi khoảng */
    var sh0 = wkcSheet_(), pl = wkcPlan_(sh0, { min:p.min, tail:p.tail });
    if(String(p.check || '') === '1' && pl.total){
      var al = wkcAllow_(sh0, pl), mc0 = sh0.getMaxColumns(), smp = { rows:0, ok:0, kept:{} };
      pl.fxCols = Object.keys(al).map(function(j){ return wkcCol_(+j) + '×' + al[j].length; });
      pl.dels.forEach(function(d){
        [[d[0], Math.min(d[1], d[0] + 299)], [Math.max(d[0], d[1] - 299), d[1]]].forEach(function(w){
          var n0 = w[1] - w[0] + 1; if(n0 < 1) return;
          var rg = sh0.getRange(w[0], 1, n0, mc0), V = rg.getValues(), F = rg.getFormulasR1C1(), N = rg.getNotes();
          for(var i = 0; i < n0; i++){ var why = wkcRowWhy_(V[i], F[i], N[i], al); smp.rows++; if(!why) smp.ok++; else smp.kept[why] = (smp.kept[why] || 0) + 1; }
        });
      });
      pl.sample = smp;
    }
    delete pl.segs;
    return { ok:true, ver:WKC.VER, source:SOURCE, plan:pl };
  }
  if(op === 'run'){
    var S1 = wkcGet_();
    if(S1 && S1.state === 'running') return { ok:true, ver:WKC.VER, running:true, state:wkcStatusSlim_(S1.sync ? wkcStep_(WKC.SYNC_BUDGET) : S1) };
    var r = wkcStart_('api', { min:p.min, tail:p.tail }); r.state = wkcStatusSlim_(r.state); return r;
  }
  if(op === 'verify') return wkcVerify_(p);
  if(op === 'stop'){ var S2 = wkcGet_(); if(S2){ S2.stop = true; wkcPut_(S2); } return { ok:true, stopped:true }; }
  return { ok:false, error:'op' };
}
function wkcStatusSlim_(S){ if(!S) return S; var o = {}; for(var k in S) if(k !== 'dels') o[k] = S[k]; return o; }

/* ── đối chiếu bản sao lưu ⇔ sheet hiện tại (chỉ đọc) ── */
function wkcRows_(sh){
  var D = WEEKLY_DATA_ROW, last = sh.getLastRow(); if(last < D) return [];
  var pl = wkcPlan_(sh, {}), vw = Math.min(24, sh.getMaxColumns()) - 1, out = [];
  (pl.segs || []).forEach(function(s){
    var V = sh.getRange(s[0], 2, s[1] - s[0] + 1, vw).getValues();
    for(var i = 0; i < V.length; i++){
      if(!(String(V[i][4] == null ? '' : V[i][4]).trim() || String(V[i][5] == null ? '' : V[i][5]).trim())) continue;
      out.push(V[i].map(function(x){ return x instanceof Date ? x.toISOString() : x; }));
    }
  });
  return out;
}
function wkcVerify_(p){
  var S = wkcGet_() || {}, bid = String(p.backup || (S.backup && S.backup.id) || '');
  if(!bid) return { ok:false, error:'Chưa có bản sao lưu' };
  var t0 = Date.now(), bss = SpreadsheetApp.openById(bid), bsh = null, gid = shWeekly().getSheetId();
  bss.getSheets().forEach(function(x){ if(x.getSheetId() === gid) bsh = x; });
  if(!bsh) bsh = bss.getSheetByName(shWeekly().getName());
  if(!bsh) return { ok:false, error:'Bản sao lưu không có sheet Weekly' };
  var A = wkcRows_(bsh), B = wkcRows_(wkcSheet_());
  function idOf(r){ return JSON.stringify([r[4], r[5], r[6], r[8]]); }            /* Key · Sub · PIC · Start */
  function fullOf(r){ return JSON.stringify(r); }
  var cur = {}, curFull = {};
  B.forEach(function(r){ var k = idOf(r); cur[k] = (cur[k] || 0) + 1; curFull[fullOf(r)] = (curFull[fullOf(r)] || 0) + 1; });
  var same = 0, changed = 0, missing = [], changedNo = [], rest = [];
  A.forEach(function(r){ var f = fullOf(r); if(curFull[f]){ curFull[f]--; cur[idOf(r)]--; same++; } else rest.push(r); });
  rest.forEach(function(r){
    var k = idOf(r);
    if(cur[k] > 0){ cur[k]--; changed++; if(changedNo.length < 40) changedNo.push(String(r[0])); }   /* cùng việc, khác ô khác (có người sửa) */
    else missing.push(String(r[0]) + (r[5] ? '' : ' (key)'));
  });
  var added = 0; Object.keys(cur).forEach(function(k){ if(cur[k] > 0) added += cur[k]; });
  return { ok:true, ver:WKC.VER, source:SOURCE, backupRows:A.length, currentRows:B.length, same:same, changed:changed, changedNo:changedNo,
           missing:missing.length, missingNo:missing.slice(0, 40), added:added, ms:Date.now() - t0 };
}
