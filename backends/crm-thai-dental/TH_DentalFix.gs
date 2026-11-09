/*************************************************************************************************
 * TH_DentalFix.gs — v1.0 (02/11/2026) · CRM Thailand Dental — user review of the new file
 *
 *  ① Sheet names: CUSTOMER VISITING → CUSTOMER TASK · ALL TASK → OTHERS TASK (CFG.SH_WK / SH_ALL). The old sheet is renamed the
 *     first time it is needed (sh_ ▸ thdRenameOld_) — Google Sheets updates the formulas that point to it by itself.
 *  ② CODE MAP: customer / CBC codes showed "N??-OT0157". Step ② of the layout (TH_DentalLayout ▸ master) wrote the lists
 *     contiguously into B…G, but the code formula (and codeMap_) read area B:C · province E:F · account type H:I ⇒ province "??".
 *     thdCodeMapFix_ rewrites the 3 lists in the right columns (template + file, both layouts), adds every province / account
 *     type / area used in CUSTOMER CODE that has no code yet ⇒ the formulas of CUSTOMER CODE / CBC give the right codes again.
 *  ③ Type action "Co-visiting with distributor" marked red (invalid): the dropdowns copied from the Surgical file point to a FIXED
 *     range of MASTER LIST (e.g. M4:M15) and the new value was added below it. thdDvFix_ makes every dropdown that points to
 *     MASTER LIST / CODE MAP cover the whole column (row 4 → last row) and makes sure the value is in MASTER LIST.
 *  ④ PRODUCT TEST: new column L "Result link" (next to Note).
 *  ⑤ ADP: new columns AG "Key account" (Yes / No) · AH "Profile completed" = time log (date) written automatically when every
 *     profile column of the row is filled (adpStamp_: after a save from the app, on edit of sheet ADP, every 10 minutes);
 *     emptied again when a column is cleared. KPI C2-02 (TARGET & KPI) = different accounts of the PIC with a date in AH
 *     ≤ end of the month ÷ different customers of the PIC in CUSTOMER CODE.
 *  Runs once by itself (trigger cronTh, Script Property THD_FIX = THDFIX.VER) · manual: thdFixNow() · action thdFix&key=<8 last chars>.
 *
 *  v1.1 (09/11/2026, user request): Type action "Event" added next to "Co-visiting with distributor" (THD_TYPE_ACTIONS) — in
 *  MASTER LIST + every dropdown + the app list (master_). File already fixed with f1 ⇒ f2 only runs the master + dropdowns steps.
 *************************************************************************************************/
var THDFIX = { VER: 'f2', PROP: 'THD_FIX', LOG: 'THD_FIX_LOG' };
/* Type actions the Dental Thailand team always has (MASTER LIST ▸ Type action, dropdown of CUSTOMER TASK, app) */
var THD_TYPE_ACTIONS = ['Co-visiting with distributor', 'Event'];
var THD_OLDNAME = { 'CUSTOMER TASK': 'CUSTOMER VISITING', 'OTHERS TASK': 'ALL TASK' };
var THD_NEWNAME = { 'CUSTOMER VISITING': 'CUSTOMER TASK', 'ALL TASK': 'OTHERS TASK' };
/* profile columns that must all be filled (TABS.adp fields) — monthly results / amounts actual are NOT required */
var ADP_FULL = ['account', 'pic', 'abcd', 'caseInfo', 'analysis', 'objective', 'tactic', 'keyAction', 'targetAmt'];

/* ① rename the old sheet (also "6. CUSTOMER VISITING") the first time the new name is needed */
function thdRenameOld_(name){
  var old = THD_OLDNAME[name]; if(!old) return null;
  var book = ss_(), s = book.getSheetByName(old);
  if(!s) book.getSheets().forEach(function(x){ if(!s && x.getName().replace(/^\d+\.\s+/, '') === old) s = x; });
  if(!s) return null;
  try{ s.setName(name); }catch(e){ return s; }
  try{ bump_(); }catch(e){}
  return s;
}
function thdRenameAll_(){
  var out = [];
  Object.keys(THD_OLDNAME).forEach(function(n){ if(!ss_().getSheetByName(n)){ var s = thdRenameOld_(n); if(s) out.push(THD_OLDNAME[n] + ' → ' + n); } });
  /* GUIDE sheet text */
  try{
    var g = ss_().getSheetByName('GUIDE');
    if(g) Object.keys(THD_NEWNAME).forEach(function(o){ g.createTextFinder(o).matchCase(true).replaceAllWith(THD_NEWNAME[o]); });
    if(g) g.createTextFinder('C2-02 / C16-00 / C17-07: typed in the KPI file.').replaceAllWith('C16-00 / C17-07: typed in the KPI file. C2-02 = sheet ADP (complete profiles ÷ customers of the PIC).');
  }catch(e){}
  return out.length ? out.join(' · ') : 'names already OK';
}

/* ② CODE MAP: B:C area · E:F province · H:I account type (row 4 →) */
function thdCodeMapFix_(){
  var cm = sh_(CFG.SH_CODE), last = Math.max(4, cm.getLastRow());
  var v = cm.getRange(4, 2, last - 3, 8).getValues();
  var contiguous = v.some(function(r){ return str_(r[2]) !== ''; });      /* D is empty in the right layout */
  var A = [], P = [], T = [], seen = { a: {}, p: {}, t: {} }, codes = { a: {}, p: {}, t: {} };
  function add(list, k, name, code){
    name = str_(name); code = str_(code).toUpperCase();
    if(!name || !code || /^#/.test(code) || seen[k][picKey_(name)]) return;
    seen[k][picKey_(name)] = 1; codes[k][code] = 1; list.push([name, code]);
  }
  v.forEach(function(r){
    add(A, 'a', r[0], r[1]);
    if(contiguous){ add(P, 'p', r[2], r[3]); add(T, 't', r[4], r[5]); add(T, 't', r[6], r[7]); }
    else { add(P, 'p', r[3], r[4]); add(T, 't', r[6], r[7]); }
  });
  /* lists of the Surgical template (right layout) */
  try{
    var tc = thdTpl_().getSheetByName('11. CODE MAP'), tv = tc.getRange(4, 2, Math.max(1, tc.getLastRow() - 3), 8).getValues();
    tv.forEach(function(r){ add(A, 'a', r[0], r[1]); add(P, 'p', r[3], r[4]); add(T, 't', r[6], r[7]); });
  }catch(e){}
  /* values used in CUSTOMER CODE without a code yet */
  function mk(k, name, n){
    var w = String(name).replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).filter(String), base;
    base = (w.length > 1 ? w.map(function(x){ return x[0]; }).join('') : (w[0] || 'X')).toUpperCase().slice(0, n);
    if(base.length < n) base = (w.join('') + 'XXX').toUpperCase().slice(0, n);
    var c = base, i = 2; while(codes[k][c]) c = base.slice(0, n - 1) + (i++);
    codes[k][c] = 1; return c;
  }
  var addN = 0;
  readTab_('customer').forEach(function(c){
    var pr = str_(c.province), ty = str_(c.type), ar = str_(c.area);
    if(pr && !seen.p[picKey_(pr)]){ add(P, 'p', pr, mk('p', pr, 2)); addN++; }
    if(ty && !seen.t[picKey_(ty)]){ add(T, 't', ty, mk('t', ty, 2)); addN++; }
    if(ar && !seen.a[picKey_(ar)]){ add(A, 'a', ar, mk('a', ar, 1)); addN++; }
  });
  var nr = Math.max(A.length, P.length, T.length), out = [];
  for(var i = 0; i < nr; i++){
    var a = A[i] || ['', ''], p = P[i] || ['', ''], t = T[i] || ['', ''];
    out.push([a[0], a[1], '', p[0], p[1], '', t[0], t[1]]);
  }
  if(cm.getMaxRows() < nr + 4) cm.insertRowsAfter(cm.getMaxRows(), nr + 4 - cm.getMaxRows());
  cm.getRange(4, 2, Math.max(cm.getMaxRows() - 3, 1), 8).clearContent();
  if(nr) cm.getRange(4, 2, nr, 8).setValues(out);
  _CODEMAP = null; _TAB = {};
  try{ bump_(['customer', 'cbc']); }catch(e){}
  return (contiguous ? 'layout repaired (lists were in B…G) · ' : '') + A.length + ' areas · ' + P.length + ' provinces · ' + T.length + ' account types · ' + addN + ' code(s) added';
}

/* ③ dropdowns: MASTER LIST has the values · every range-based dropdown covers the whole column */
function thdMasterAdd_(){
  var s = sh_(CFG.SH_MASTER), lc = s.getLastColumn(), hdr = s.getRange(3, 1, 1, lc).getValues()[0], added = [];
  var want = { 'type action': THD_TYPE_ACTIONS };
  hdr.forEach(function(h, c){
    var list = want[picKey_(h)]; if(!list) return;
    var col = s.getRange(4, c + 1, Math.max(1, s.getMaxRows() - 3), 1).getValues().map(function(r){ return str_(r[0]); });
    var lastF = 0; col.forEach(function(x, i){ if(x) lastF = i + 1; });
    list.forEach(function(x){
      if(col.some(function(y){ return picKey_(y) === picKey_(x); })) return;
      s.getRange(4 + lastF, c + 1).setValue(x); lastF++; added.push(x);
    });
  });
  return added;
}
function thdDvFix_(){
  var book = ss_(), m = sh_(CFG.SH_MASTER), cmap = sh_(CFG.SH_CODE), n = 0;
  var targets = [m.getSheetId(), cmap.getSheetId()];
  var tabs = [[CFG.SH_CUST, CFG.DATA], [CFG.SH_CBC, CFG.DATA], [CFG.SH_MON, CFG.DATA], [CFG.SH_WK, CFG.DATA], [CFG.SH_PRES, CFG.DATA],
              [CFG.SH_ADP, CFG.DATA], [CFG.SH_ALL, CFG.AT_DATA]];
  tabs.forEach(function(t){
    var s = null; try{ s = sh_(t[0]); }catch(e){ return; }
    var first = t[1], lc = s.getLastColumn(), rows = Math.max(1, s.getMaxRows() - first + 1);
    var dv = s.getRange(first, 1, 1, lc).getDataValidations()[0];
    dv.forEach(function(rule, j){
      if(!rule) return;
      try{
        if(rule.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) return;
        var a = rule.getCriteriaValues(), rg = a[0], src = rg.getSheet();
        if(targets.indexOf(src.getSheetId()) < 0) return;
        var col = rg.getColumn(), r0 = rg.getRow(), r1 = src.getMaxRows();
        if(rg.getNumColumns() !== 1 || rg.getLastRow() >= r1) return;
        var full = src.getRange(r0, col, r1 - r0 + 1, 1);
        s.getRange(first, j + 1, rows, 1).setDataValidation(rule.copy().requireValueInRange(full, a[1]).setAllowInvalid(true).build());
        n++;
      }catch(e){}
    });
  });
  return n;
}

/* ④ PRODUCT TEST: column L "Result link" */
function thdPtLink_(){
  var s = ptSheet_(), h = str_(s.getRange(3, 12).getValue());
  if(h === 'Result link') return 'ok';
  if(h) return 'L3 is "' + h + '" — not changed';
  s.getRange(3, 12).setValue('Result link').setFontWeight('bold').setBackground('#F0F7FF').setFontColor('#003047').setWrap(true);
  s.setColumnWidth(12, 260);
  try{ s.getRange(3, 12).setNote('Link to the test result (Google Form / Drive file / photo).'); }catch(e){}
  return 'column L added';
}

/* ⑤ ADP: AG Key account · AH Profile completed (time log) */
function thdAdpCols_(){
  var s = sh_(CFG.SH_ADP), want = [[33, 'Key account'], [34, 'Profile completed']], out = [];
  if(s.getMaxColumns() < 34) s.insertColumnsAfter(s.getMaxColumns(), 34 - s.getMaxColumns());
  want.forEach(function(w){
    var c = s.getRange(CFG.HDR, w[0]), h = str_(c.getValue());
    if(h === w[1]) return;
    if(h){ out.push(k68Col_(w[0]) + '3 is "' + h + '"'); return; }
    var hc = s.getRange(CFG.HDR, 32);   /* style of the last header (Updated) */
    c.setValue(w[1]); try{ hc.copyTo(c, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); }catch(e){}
    out.push(k68Col_(w[0]) + ' ' + w[1]);
  });
  var rows = Math.max(1, s.getMaxRows() - CFG.DATA + 1);
  try{
    s.getRange(CFG.DATA, 33, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).setAllowInvalid(true).build());
    s.getRange(CFG.DATA, 34, rows, 1).setNumberFormat('dd/MM/yyyy');
    s.getRange(CFG.HDR, 33).setNote('Key account of the 3 distributors (top 20%): Yes / No.');
    s.getRange(CFG.HDR, 34).setNote('Filled automatically: the date the profile became complete (Account · PIC · ABCD focus · Case info · Analysis · Objective · Tactic · Key action · Target). ' +
      'Used by KPI C2-02 (TARGET & KPI). Do not type here.');
    s.setColumnWidth(33, 100); s.setColumnWidth(34, 120);
  }catch(e){}
  return out.length ? out.join(' · ') : 'ok';
}
/* time log of complete profiles — one write of column AH when something changed */
function adpStamp_(){
  var s = sh_(CFG.SH_ADP); if(str_(s.getRange(CFG.HDR, 34).getValue()) !== 'Profile completed') return 0;
  var last = s.getLastRow(); if(last < CFG.DATA) return 0;
  var d = TABS.adp, n = last - CFG.DATA + 1, v = s.getRange(CFG.DATA, 2, n, d.w).getValues(), iAt = d.f.indexOf('fullAt');
  var idx = ADP_FULL.map(function(f){ return d.f.indexOf(f); }), now = date_(todayIso_()), col = [], ch = 0;
  v.forEach(function(r){
    var full = idx.every(function(i){ return str_(r[i] instanceof Date ? 'x' : r[i]) !== ''; }), at = r[iAt];
    if(full && !(at instanceof Date) && !str_(at)){ col.push([now]); ch++; }
    else if(!full && (at instanceof Date || str_(at))){ col.push(['']); ch++; }
    else col.push([at]);
  });
  if(!ch) return 0;
  var L = lock_();
  try{ s.getRange(CFG.DATA, 34, n, 1).setValues(col); SpreadsheetApp.flush(); } finally { L.releaseLock(); }
  _TAB = {}; try{ bump_(['adp', 'kpi']); }catch(e){}
  return ch;
}

/* run all once (per THDFIX.VER) */
function thdFixRun_(force){
  var P = props_();
  if(!force && P.getProperty(THDFIX.PROP) === THDFIX.VER) return null;
  var log = [], light = !force && P.getProperty(THDFIX.PROP) === 'f1';   /* f1 done ⇒ only the new Type action */
  function step(nm, fn){ try{ log.push(nm + ': ' + fn()); }catch(e){ log.push(nm + ': ⚠ ' + (e && e.message || e)); } }
  if(light){
    step('master', function(){ var a = thdMasterAdd_(); return a.length ? 'added ' + a.join(', ') : 'ok'; });
    step('dropdowns', function(){ return thdDvFix_() + ' column(s) now cover the whole list'; });
    try{ bump_(['master']); }catch(e){}
    P.setProperty(THDFIX.PROP, THDFIX.VER);
    P.setProperty(THDFIX.LOG, Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm') + ' · ' + THDFIX.VER + ' · ' + log.join(' | '));
    return log;
  }
  step('names', thdRenameAll_);
  step('codemap', thdCodeMapFix_);
  step('master', function(){ var a = thdMasterAdd_(); return a.length ? 'added ' + a.join(', ') : 'ok'; });
  step('dropdowns', function(){ return thdDvFix_() + ' column(s) now cover the whole list'; });
  step('ptest', thdPtLink_);
  step('adp', thdAdpCols_);
  step('stamp', function(){ return adpStamp_() + ' row(s) time-logged'; });
  step('kpi', function(){ k68Setup_(ss_(), CFG.SH_KPI, CFG.KEY); bump_(['kpi']); return 'KPI tab rebuilt (C2-02 from ADP, CUSTOMER TASK)'; });
  P.setProperty(THDFIX.PROP, THDFIX.VER);
  P.setProperty(THDFIX.LOG, Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm') + ' · ' + log.join(' | '));
  try{ bump_(); }catch(e){}
  return log;
}
function thdFixNow(){ var r = thdFixRun_(true); try{ SpreadsheetApp.getUi().alert((r || []).join('\n')); }catch(e){} return r; }
/* action thdFix&key=<8 last chars of the Sheet id>[&op=run] — status / run now (workflow Kiểm tra) */
function thdFixApi_(p){
  var key = str_(p.key), id = ss_().getId();
  if(!key || key !== id.slice(-8)) return { ok: false, error: 'key?' };
  var r = null;
  if(str_(p.op) === 'run') r = thdFixRun_(true);
  var cm = codeMap_(), sample = readTab_('customer').slice(0, 5).map(function(c){ return str_(c.code) + ' · ' + str_(c.name); });
  return { ok: true, ver: THDFIX.VER, done: props_().getProperty(THDFIX.PROP) || '', log: props_().getProperty(THDFIX.LOG) || '', ran: r,
           codeMap: { areas: Object.keys(cm.a).length, provinces: Object.keys(cm.p).length, types: Object.keys(cm.t).length }, customers: sample,
           sheets: [CFG.SH_WK, CFG.SH_ALL].map(function(n){ return n + ': ' + (ss_().getSheetByName(n) ? 'ok' : 'missing'); }) };
}
/* first ping / boot from the app ⇒ run the fix in the background (does not slow the request) when trigger cronTh is not there */
function thdFixTick_(){
  try{
    if(props_().getProperty(THDFIX.PROP) === THDFIX.VER) return;
    var T = ScriptApp.getProjectTriggers().map(function(t){ return t.getHandlerFunction(); });
    if(T.indexOf('thdFixBg') >= 0) return;
    ScriptApp.newTrigger('thdFixBg').timeBased().after(20 * 1000).create();
  }catch(e){}
}
function thdFixBg(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdFixBg') ScriptApp.deleteTrigger(t); });
  thdFixRun_(false);
}
