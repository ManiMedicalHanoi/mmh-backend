/* ══════════════ MMH_WkDiag.gs — chẩn đoán tốc độ đọc sheet WEEKLY (CHỈ ĐỌC, không ghi gì) ══════════════
 * GIỐNG HỆT ở marketing / backoffice / management.
 * ?action=wkDiag&key=<8 ký tự cuối SS_ID>&part=fg|gap|cols|disp|build|cache  — chỉ trả SỐ ĐẾM + thời gian (không trả nội dung việc / tên người).
 * Chia phần vì cả gói > 60 giây (giới hạn gọi thử của workflow).
 * Gọi qua workflow Kiểm tra ▸ ping "<backend>?action=wkDiag&key=…&full=1".                                   */
function wkDiag_(p){
  if(String(p.key || '') !== String(SS_ID).slice(-8)) return { ok:false, error:'key' };
  var T = {}, t0 = Date.now();
  function tic(k, f){ var a = Date.now(); var r = f(); T[k] = Date.now() - a; return r; }
  var sh = shWeekly(); if(!sh) return { ok:false, error:'no sheet' };
  var part = String(p.part || 'fg'), out = { ok:true, source:SOURCE, ver:'1.2', part:part };
  function on(x){ return part === x || part === 'all'; }
  out.maxRows = sh.getMaxRows(); out.maxCols = sh.getMaxColumns();
  out.lastRow = tic('lastRow', function(){ return sh.getLastRow(); });
  out.lastCol = sh.getLastColumn();
  var last = out.lastRow, n = last - WEEKLY_DATA_ROW + 1;
  if(n < 1) return out;
  /* ① cột F:G (Key / Sub) — dòng có nội dung ở đâu */
  var fg = tic('readFG', function(){ return sh.getRange(WEEKLY_DATA_ROW, 6, n, 2).getValues(); });
  var content = 0, lastC = 0, blankIn = 0, runs = [], run = 0, blocks = {};
  for(var i = 0; i < fg.length; i++){
    var has = String(fg[i][0] || '').trim() || String(fg[i][1] || '').trim();
    if(has){ content++; lastC = WEEKLY_DATA_ROW + i; if(run) runs.push(run); run = 0;
             var b = Math.floor((WEEKLY_DATA_ROW + i) / 1000); blocks[b] = (blocks[b] || 0) + 1; }
    else run++;
  }
  if(run) runs.push(run);
  for(var r = 0; r < lastC - WEEKLY_DATA_ROW + 1; r++){ if(!(String(fg[r][0] || '').trim() || String(fg[r][1] || '').trim())) blankIn++; }
  runs.sort(function(a, b){ return b - a; });
  out.contentRows = content; out.lastContentRow = lastC; out.blankInside = blankIn;
  out.blankTail = last - lastC; out.blankRunsTop = runs.slice(0, 12);
  out.blankRuns100 = runs.filter(function(x){ return x >= 100; }).length;
  out.contentPer1000 = blocks;
  /* ①b khoảng trống: lấy mẫu vài cửa sổ trong các khoảng ≥ 50 dòng — ô có giá trị không phải công thức, công thức (R1C1), ghi chú */
  if(on('gap')){
    var gaps = [], st0 = 0;
    for(var g = 0; g <= fg.length; g++){
      var hv = g < fg.length && (String(fg[g][0] || '').trim() || String(fg[g][1] || '').trim());
      if(g < fg.length && !hv){ if(!st0) st0 = WEEKLY_DATA_ROW + g; continue; }
      if(st0){ var ln = WEEKLY_DATA_ROW + g - st0; if(ln >= 50) gaps.push([st0, ln]); st0 = 0; }
    }
    out.gaps = gaps;
    var W = Math.max(50, Math.min(800, +p.win || 400)), mc = sh.getMaxColumns(), letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var vals = {}, fml = {}, notes = 0, ws = 0, tru = 0, sampled = 0, wins = [];
    gaps.forEach(function(gp){
      var pts = gp[1] <= W ? [gp[0]] : [gp[0], gp[0] + Math.floor(gp[1] / 2) - Math.floor(W / 2), gp[0] + gp[1] - W];
      pts.forEach(function(a){
        var len = Math.min(W, gp[0] + gp[1] - a), rg = sh.getRange(a, 1, len, mc);
        var V = rg.getValues(), F = rg.getFormulasR1C1(), N = rg.getNotes(); wins.push([a, len]); sampled += len;
        for(var i2 = 0; i2 < len; i2++) for(var j2 = 0; j2 < mc; j2++){
          var L = letters[j2] || ('c' + j2);
          if(N[i2][j2]) notes++;
          if(F[i2][j2]){ var k2 = L + ' ' + String(F[i2][j2]).slice(0, 90); fml[k2] = (fml[k2] || 0) + 1; continue; }
          var v2 = V[i2][j2];
          if(v2 === '' || v2 === null || v2 === false) continue;
          if(v2 === true){ tru++; }
          if(typeof v2 === 'string' && !v2.trim()){ ws++; continue; }
          vals[L] = (vals[L] || 0) + 1;
        }
      });
    });
    out.gapSample = { windows:wins, rows:sampled, plainValueCells:vals, formulas:fml, notes:notes, whitespaceCells:ws, trueCells:tru };
  }
  /* ② đọc toàn bộ như readWeeklyRaw / liveSig_ */
  var vw = Math.min(24, sh.getMaxColumns()) - 1;
  if(on('disp')){
    tic('readBOdisplay', function(){ return sh.getRange(WEEKLY_DATA_ROW, 2, n, 14).getDisplayValues().length; });
    tic('readBOvalues', function(){ return sh.getRange(WEEKLY_DATA_ROW, 2, n, 14).getValues().length; });
    if(lastC >= WEEKLY_DATA_ROW) tic('readBXtoLastContent', function(){ return sh.getRange(WEEKLY_DATA_ROW, 2, lastC - WEEKLY_DATA_ROW + 1, vw).getValues().length; });
  }
  if(on('cols')){
  var all = tic('readBX', function(){ return sh.getRange(WEEKLY_DATA_ROW, 2, n, vw).getValues(); });
  /* ô có giá trị ở các dòng KHÔNG có Key / Sub (theo cột B..X) */
  var colNames = 'BCDEFGHIJKLMNOPQRSTUVWX'.split(''), nonEmptyBlank = {}, noNo = 0;
  for(var q = 0; q < all.length; q++){
    var row = all[q], has2 = String(row[4] || '').trim() || String(row[5] || '').trim();
    if(has2){ if(!normNo(row[0])) noNo++; continue; }
    for(var c = 0; c < row.length; c++){ var v = row[c]; if(v !== '' && v !== null && v !== false){ var cn = colNames[c] || ('c' + c); nonEmptyBlank[cn] = (nonEmptyBlank[cn] || 0) + 1; } }
  }
  out.contentNoNumber = noNo; out.blankRowsNonEmptyCells = nonEmptyBlank;
  /* công thức ở 1 dòng trống giữa sheet (chỉ tên cột có công thức) */
  try{
    var probe = 0; for(var z = Math.floor(all.length / 2); z < all.length; z++){ if(!(String(all[z][4] || '').trim() || String(all[z][5] || '').trim())){ probe = WEEKLY_DATA_ROW + z; break; } }
    if(probe){ var fm = sh.getRange(probe, 2, 1, vw).getFormulas()[0], fc = []; for(var y = 0; y < fm.length; y++) if(fm[y]) fc.push(colNames[y]); out.blankRowProbe = { row:probe, formulaCols:fc }; }
    var fm7 = sh.getRange(WEEKLY_DATA_ROW, 2, 1, vw).getFormulas()[0], ac = [];
    for(var x = 0; x < fm7.length; x++) if(/ARRAYFORMULA|BYROW\(|MAP\(|SCAN\(/i.test(fm7[x])) ac.push(colNames[x]);
    out.arrayFormulaCols = ac;
  }catch(e){ out.probeErr = String(e); }
  }
  if(on('build')){
  /* ③ dựng danh sách như readWeeklyRaw + kích thước gói trả về */
  var keys = tic('readWeeklyRaw', function(){ return readWeeklyRaw(); });
  var subs = 0, objs = 0, fsz = {}, st = {}, fy = {}, src = {}, ym = {}, oldDone = 0, today = todayISO();
  var cut = (function(){ var d = new Date(); d.setMonth(d.getMonth() - 6); return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); })();
  function acc(o){
    objs++;
    for(var k in o){ if(k === 'subs') continue; fsz[k] = (fsz[k] || 0) + JSON.stringify(o[k] === undefined ? null : o[k]).length + k.length + 4; }
    var s = String(o.status || '').toLowerCase(), sk = /complet/.test(s) ? 'done' : /cancel/.test(s) ? 'cancel' : /progress/.test(s) ? 'doing' : /to\s*do/.test(s) ? 'todo' : (s ? 'other' : 'empty');
    st[sk] = (st[sk] || 0) + 1; fy[o.fy || '?'] = (fy[o.fy || '?'] || 0) + 1;
    var vs = String(o.vSrc || '').split(/[:|]/)[0] || '-'; src[vs] = (src[vs] || 0) + 1;
    var y = String(o.start || o.revised || o.planned || '').slice(0, 4) || '?'; ym[y] = (ym[y] || 0) + 1;
    var eff = String(o.revised || o.planned || o.start || '').slice(0, 10);
    if((sk === 'done' || sk === 'cancel') && eff && eff < cut) oldDone++;
  }
  keys.forEach(function(k){ acc(k); (k.subs || []).forEach(function(s){ subs++; acc(s); }); });
  var js = tic('stringify', function(){ return JSON.stringify(keys); });
  out.keys = keys.length; out.subs = subs; out.objects = objs; out.jsonKB = Math.round(js.length / 1024);
  var fk = Object.keys(fsz).sort(function(a, b){ return fsz[b] - fsz[a]; }), fkb = {};
  fk.forEach(function(k){ fkb[k] = Math.round(fsz[k] / 1024); });
  out.fieldKB = fkb; out.status = st; out.fy = fy; out.vSrc = src; out.year = ym;
  out.doneOlder6m = oldDone; out.cut6m = cut; out.today = today;
  tic('md5', function(){ return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, js).length; });
  tic('tmWalk', function(){ return (typeof tmWalk_ === 'function') ? tmWalk_(JSON.parse(js), 0).length : 0; });
  }
  if(on('cache')){
  /* ④ bộ nhớ đệm */
  _DV = null; var dv = tic('dataVersion', function(){ return dataVersion().v; });
  out.v = dv;
  tic('cacheGetWk', function(){ var h = cGetBig('wk_' + dv); out.cacheHit = !!h; return 0; });
  try{ var c = CacheService.getScriptCache(); out.wkChunks = +(c.get('wk_' + dv + '_n') || 0); out.warm = warmActive(); }catch(e){}
  }
  out.ms = T; out.totalMs = Date.now() - t0;
  return out;
}
