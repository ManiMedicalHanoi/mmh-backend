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
 *
 *  v1.3 (11/11/2026, KPI FY68 file filled by Owen san after the meeting of 4 Nov 2026 — Nguyen Ha asked to apply it): f3 ⇒
 *  Type action "Event/Co-visiting with distributor" · ACCOUNT TRACKING column M "Key account" · KPI tab rebuilt + synced (thdKpiRebuild_).
 *  action thdFix&op=f3 runs only these steps, op=kpi only the KPI tab.
 *
 *  v1.2 (09/11/2026, user review of the real file): CUSTOMER TASK also held the team's office work and business-trip days
 *  ("Thailand office/MMH/BKK/Central", "Businesstrip/MMH/Vientiane/Laos" …) because step ⑤ of the layout copied EVERY row of the
 *  old sheet WEEK, and step ③ added those "accounts" to CUSTOMER CODE ("Added from WEEK"). They are not customers:
 *  they inflate the customer lists / visit counts and the KPI C2-02 denominator. thdInt* (action thdFix&op=internal):
 *    · op=internal     — dry run: counts by account / PIC / month / Type task (nothing is written)
 *    · op=internalRun  — rows ⇒ OTHERS TASK under the fixed key "Others MM/yyyy" of the PIC (sub task "[place] task", result,
 *                        dates, status kept) · rows deleted from CUSTOMER TASK · the internal accounts cleared from CUSTOMER CODE
 *                        (cells emptied, row kept ⇒ the codes of the other customers do not move) · everything backed up first in
 *                        the hidden sheets "OLD · Internal tasks (moved)" / "OLD · Internal accounts (removed)".
 *************************************************************************************************/
var THDFIX = { VER: 'f3', PROP: 'THD_FIX', LOG: 'THD_FIX_LOG' };
/* Type actions the Dental Thailand team always has (MASTER LIST ▸ Type action, dropdown of CUSTOMER TASK, app)
   f3 (11/11/2026, KPI FY68 file of Owen san, meeting 4 Nov 2026): "Event/Co-visiting with distributor" — counts for KPI C4-01 like "Co-visiting with distributor" */
var THD_TYPE_ACTIONS = ['Co-visiting with distributor', 'Event', 'Event/Co-visiting with distributor'];
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
/* layout (menu ⓪) not built yet — e.g. the real file right after the move of 09/11/2026 ⇒ the fix waits (thdRun_ calls it at the end) */
function thdFixReady_(){ var d = thdDone_(); return THD.STEPS.every(function(s){ return s === 'sync' || d[s]; }); }
function thdFixRun_(force){
  var P = props_();
  if(!force && P.getProperty(THDFIX.PROP) === THDFIX.VER) return null;
  if(!force && !thdFixReady_()) return null;
  var log = [], prev = P.getProperty(THDFIX.PROP), light = !force && (prev === 'f1' || prev === 'f2');   /* f1 / f2 done ⇒ only the new steps */
  function step(nm, fn){ try{ log.push(nm + ': ' + fn()); }catch(e){ log.push(nm + ': ⚠ ' + (e && e.message || e)); } }
  if(light){
    step('master', function(){ var a = thdMasterAdd_(); return a.length ? 'added ' + a.join(', ') : 'ok'; });
    step('dropdowns', function(){ return thdDvFix_() + ' column(s) now cover the whole list'; });
    step('keyacc', thdKeyAccCol_);
    step('guide', thdGuideKpi_);
    step('kpi', thdKpiRebuild_);
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
  step('keyacc', thdKeyAccCol_);
  step('guide', thdGuideKpi_);
  step('kpi', thdKpiRebuild_);
  P.setProperty(THDFIX.PROP, THDFIX.VER);
  P.setProperty(THDFIX.LOG, Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm') + ' · ' + log.join(' | '));
  try{ bump_(); }catch(e){}
  return log;
}
function thdFixNow(){ var r = thdFixRun_(true); try{ SpreadsheetApp.getUi().alert((r || []).join('\n')); }catch(e){} return r; }
/* f3 (11/11/2026) — ACCOUNT TRACKING ▸ column M "Key account" (Yes / No): the distributor key accounts defined by Yong (KPI C2-02) */
/* f3 — sheet GUIDE ▸ part D (KPI) with the rules of 4 Nov 2026 */
var THD_GUIDE_KPI = [["Yong: F4-00 turnover (40%) · C2-01 new key accounts (20%) · C2-02 key account profiling % (10%) · C4-01 co-visits (20%)", "Yong: F4-00 turnover (40%) · C2-01 new key accounts (20%) · C2-02 visits to distributor key accounts (10%, ACCOUNT TRACKING ▸ Key account = Yes) · C4-01 co-visits incl. Event/Co-visiting (20%) · L3-21 KBI (10%, KPI file)"], ["Man: F4-00 (25%) · C4-03 co-visiting days (15%) · C11-02 T&E events led by MMH (25%) · C11-03 product test pass rate (25%, sheet PRODUCT TEST)", "Man: F4-00 (25%) · C4-03 co-visiting days, at least 5 co-visits a day (15%) · C11-02 T&E events led by MMH — PRODUCT PRESENTATION (25%) · C11-03 product test pass rate, target 60% (25%, sheet PRODUCT TEST) · L3-22 KBI (10%)"], ["Sui: F4-00 (20%) · C14-00 T&E events KOL + MMH + exhibitions (20%) · C16-00 new product categories (30%) · C17-07 product content published (20%)", "Sui: F4-00 (20%) · C14-00 T&E events KOL + MMH + exhibitions (20%) · C16-00 participants in T&E events (30%) · C17-07 product content published (20%) · L3-20 KBI (10%)"], ["Targets come from the KPI file. Turnover and events come from the KPI file (Turnover report · 2. Thailand - Dental Event Report). C16-00 / C17-07: typed in the KPI file. C11-03 = sheet PRODUCT TEST (Pass ÷ tests). C2-02 = sheet ADP (complete profiles ÷ customers of the PIC).", "KPI file of 4 Nov 2026 (Owen san). Targets come from the KPI file. Turnover, events (C11-02 · C14-00) and participants (C16-00) come from the KPI file (Turnover report · 2. Thailand - Dental Event Report + PRODUCT PRESENTATION). C17-07: typed in the KPI file. C11-03 = sheet PRODUCT TEST (Pass ÷ tests). C2-02 = CUSTOMER TASK visits to the key accounts of ACCOUNT TRACKING."]];
function thdGuideKpi_(){
  /* f3.1 — the GUIDE of the real file was built with older wording ⇒ match each KPI line by its START, replace the whole cell */
  var g = ss_().getSheetByName('GUIDE'); if(!g) return 'no GUIDE sheet';
  var lr = g.getLastRow(), lc = Math.min(g.getLastColumn(), 6); if(lr < 1) return 'GUIDE empty';
  var rg = g.getRange(1, 1, lr, lc), v = rg.getValues(), f = rg.getFormulas(), n = 0;
  var rep = THD_GUIDE_KPI.map(function(x){ return [x[0].split(/[:.(]/)[0] + (/^[A-Z][a-z]+:/.test(x[0]) ? ': F4-00' : ''), x[1]]; });
  rep.push(['3. Co-visits with a distributor sales rep', '3. Co-visits with a distributor sales rep: Type action = "Co-visiting with distributor" or "Event/Co-visiting with distributor" (KPI C4-01 Yong = co-visits of both types · C4-03 Man = days with at least 5 co-visits).']);
  for(var i = 0; i < lr; i++) for(var j = 0; j < lc; j++){
    var t = String(v[i][j] || ''); if(!t || f[i][j]) continue;
    rep.forEach(function(x){ if(t.indexOf(x[0]) === 0 && t !== x[1]){ g.getRange(i + 1, j + 1).setValue(x[1]); t = x[1]; n++; } });
  }
  return n + ' line(s) updated';
}
function thdKeyAccCol_(){ var s = acmSheet_(); return 'ACCOUNT TRACKING ▸ ' + (acmKeyCol_(s) ? 'column M "Key account" ready' : 'no sheet'); }
/* f3 — KPI tab rebuilt with the rules of the KPI FY68 file of 4 Nov 2026 (C2-02 key-account visits · C4-01 both co-visit types ·
   C4-03 days with ≥ 5 co-visits · C11-02 / C14-00 / C16-00 from the KPI file) then synced with the KPI file */
function thdKpiRebuild_(){
  k68Setup_(ss_(), CFG.SH_KPI, CFG.KEY); bump_(['kpi']); SpreadsheetApp.flush();
  var r = null; try{ r = k68SyncFix_(ss_().getSheetByName(CFG.SH_KPI), true); }catch(e){ r = { ok: false, error: String(e && e.message || e) }; }
  return 'KPI tab rebuilt (' + K68_LAYOUT + ') · sync: ' + (r && r.ok ? (r.message || 'ok') : (r && (r.error || r.error2)) || '?');
}
/* op=kpitab — READ ONLY: rows of the KPI tab (code · PIC · key · 12 targets · 12 actuals, errors shown as text) */
function thdKpiTab_(){
  var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) return { ok: false, error: 'no KPI tab' };
  var v = s.getRange(1, 1, s.getLastRow(), K68.NC).getDisplayValues(), out = [];
  v.forEach(function(r){ var t = str_(r[0]); if(!/^kpi:|^months$/.test(t)) return;
    out.push([t, r[K68.code - 1], r[K68.pic - 1], r[K68.name - 1].slice(0, 60), r[K68.unit - 1]].concat(['T'], r.slice(K68.t0 - 1, K68.t0 + 11), ['A'], r.slice(K68.a0 - 1, K68.a0 + 11)).join(' | ')); });
  var at = acmSheet_(), keys = 0;
  try{ var lr = at.getLastRow(); if(lr > 1) keys = at.getRange(2, 13, lr - 1, 1).getValues().filter(function(x){ return acmYes_(x[0]); }).length; }catch(e){}
  return { ok: true, layout: str_(v[0][0]), rows: out, keyAccounts: keys, types: (master_().typeAction || []).filter(function(x){ return /co-visit|event/i.test(x); }) };
}
/* action thdFix&key=<8 last chars of the Sheet id>[&op=run] — status / run now (workflow Kiểm tra) */
function thdFixApi_(p){
  var key = str_(p.key), id = ss_().getId();
  if(!key || key !== id.slice(-8)) return { ok: false, error: 'key?' };
  var r = null;
  if(str_(p.op) === 'run') r = thdFixRun_(true);
  if(str_(p.op) === 'f3') r = (props_().setProperty(THDFIX.PROP, 'f2'), thdFixRun_(false));   /* only the f3 steps */
  if(str_(p.op) === 'kpi') r = [thdKpiRebuild_()];
  if(str_(p.op) === 'kpitab') return thdKpiTab_();
  if(str_(p.op) === 'guide') r = [thdGuideKpi_()];
  if(str_(p.op) === 'internal') return { ok: true, dry: true, scan: thdIntScan_() };
  if(str_(p.op) === 'internalRun') return { ok: true, moved: thdIntMove_(), scan: thdIntScan_() };
  var cm = codeMap_(), sample = readTab_('customer').slice(0, 5).map(function(c){ return str_(c.code) + ' · ' + str_(c.name); });
  return { ok: true, ver: THDFIX.VER, done: props_().getProperty(THDFIX.PROP) || '', log: props_().getProperty(THDFIX.LOG) || '', ran: r,
           codeMap: { areas: Object.keys(cm.a).length, provinces: Object.keys(cm.p).length, types: Object.keys(cm.t).length }, customers: sample,
           sheets: [CFG.SH_WK, CFG.SH_ALL].map(function(n){ return n + ': ' + (ss_().getSheetByName(n) ? 'ok' : 'missing'); }) };
}
/* first ping / boot from the app ⇒ run the fix in the background (does not slow the request) when trigger cronTh is not there */
function thdFixTick_(){
  try{
    if(props_().getProperty(THDFIX.PROP) === THDFIX.VER || !thdFixReady_()) return;
    var T = ScriptApp.getProjectTriggers().map(function(t){ return t.getHandlerFunction(); });
    if(T.indexOf('thdFixBg') >= 0) return;
    ScriptApp.newTrigger('thdFixBg').timeBased().after(20 * 1000).create();
  }catch(e){}
}
function thdFixBg(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdFixBg') ScriptApp.deleteTrigger(t); });
  thdFixRun_(false);
}


/* ══════════════ v1.2 (09/11/2026) — office work / business-trip days out of CUSTOMER TASK ══════════════ */
var THD_INT = { BAK_T: 'OLD · Internal tasks (moved)', BAK_C: 'OLD · Internal accounts (removed)', KEY: 'Others' };
/* "Thailand office/MMH/BKK/Central", "Businesstrip/MMH/Vientiane/Laos", "MMH/…": account type MMH = the company itself */
function thdIsInternal_(name, type){
  var n = picKey_(name).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(), t = picKey_(type);
  return t === 'mmh' || /^(mmh|thailand office|office|business ?trips?)\b/.test(n);
}
function thdIntRows_(){ return weeklyRows_().filter(function(w){ return thdIsInternal_(w.accName, w.accType); }); }
function thdIntCust_(){ return readTab_('customer').filter(function(c){ return thdIsInternal_(c.name, c.type); }); }
function thdIntScan_(){
  _TAB = {};
  var all = weeklyRows_(), rows = all.filter(function(w){ return thdIsInternal_(w.accName, w.accType); });
  function cnt(f){ var o = {}; rows.forEach(function(w){ var k = f(w) || '(empty)'; o[k] = (o[k] || 0) + 1; }); return o; }
  var dates = rows.map(function(w){ return w.start; }).filter(String).sort();
  return { total: all.length, internal: rows.length,
    byAccount: cnt(function(w){ return w.account; }), byPic: cnt(function(w){ return w.pic; }),
    byMonth: cnt(function(w){ return w.month || ymOf_(w.start); }), byTypeTask: cnt(function(w){ return w.typeTask; }),
    byTypeAction: cnt(function(w){ return w.typeAction; }), byStatus: cnt(function(w){ return w.status; }),
    first: dates[0] || '', last: dates[dates.length - 1] || '',
    sample: rows.slice(-6).map(function(w){ return [w.start, w.pic, w.account, w.typeTask, w.typeAction, str_(w.plan).slice(0, 80), w.status].join(' | '); }),
    customers: thdIntCust_().map(function(c){ return [c._row, c.name, c.type, c.province, c.pic, str_(c.note).slice(0, 60)].join(' | '); }) };
}
function thdIntName_(w){
  var place = /^business ?trips?$/i.test(str_(w.accName).replace(/\s+/g, ' ')) ? 'Business trip' + (w.province ? ' · ' + w.province : '') : str_(w.accName);
  var t = str_(w.plan).split(/\r?\n/)[0] || w.typeAction || w.typeTask || 'Task';
  if(t.length > 180) t = t.slice(0, 177) + '…';
  return '[' + place + '] ' + t;
}
function thdIntMove_(){
  var L = lock_(), out = { moved: 0, keysNew: 0, keysUsed: 0, customers: 0 };
  try{
    _TAB = {}; _AT = null;
    var rows = thdIntRows_(), cus = thdIntCust_();
    if(!rows.length && !cus.length) return out;
    var book = ss_(), now = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm');
    /* ① backups (hidden sheets, appended) */
    function bak(name, head, vals){
      if(!vals.length) return;
      var b = book.getSheetByName(name) || book.insertSheet(name);
      if(b.getLastRow() < 1) b.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
      var w = Math.max.apply(null, vals.map(function(v){ return v.length; }));
      vals = vals.map(function(v){ while(v.length < w) v.push(''); return v; });
      b.getRange(b.getLastRow() + 1, 1, vals.length, w).setValues(vals);
      try{ b.hideSheet(); }catch(e){}
    }
    var wk = sh_(CFG.SH_WK), wlast = wk.getLastRow(), WV = wk.getRange(CFG.DATA, 2, wlast - CFG.DATA + 1, TABS.weekly.w).getValues();
    bak(THD_INT.BAK_T, ['Moved at', 'CUSTOMER TASK row'].concat(TABS.weekly.f),
        rows.map(function(w){ return [now, w._row].concat(WV[w._row - CFG.DATA]); }));
    var cs = sh_(CFG.SH_CUST), CV = cus.length ? cs.getRange(CFG.DATA, 2, cs.getLastRow() - CFG.DATA + 1, TABS.customer.w).getValues() : [];
    bak(THD_INT.BAK_C, ['Removed at', 'CUSTOMER CODE row'].concat(TABS.customer.f),
        cus.map(function(c){ return [now, c._row].concat(CV[c._row - CFG.DATA]); }));
    /* ② OTHERS TASK: one "Others MM/yyyy" key per PIC + month */
    var groups = {}, order = [];
    rows.slice().sort(function(a, b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : a._row - b._row; }).forEach(function(w){
      var ym = w.month || ymOf_(w.start) || ymOf_(todayIso_()), k = w.pic + '|' + ym;
      if(!groups[k]){ groups[k] = { pic: w.pic, ym: ym, subs: [] }; order.push(k); }
      var st = vsStatus_(w.status), res = str_(w.result), tag = [w.typeTask, w.typeAction].filter(String).join(' · ');
      groups[k].subs.push({ E: '', F: '', G: thdIntName_(w), H: w.pic,
        I: res + (tag ? (res ? '\n' : '') + '(from CUSTOMER TASK · ' + tag + ')' : ''),
        J: w.start, K: w.finish || w.start, N: st[0], O: Math.round(st[1] * 100) });
    });
    function keyName(ym){ return THD_INT.KEY + ' ' + ym.slice(4, 6) + '/' + ym.slice(0, 4); }
    function roll(subs){
      var list = subs.filter(function(x){ return !/cancel/i.test(x.N); }); if(!list.length) return ['To Do', 0];
      var done = list.every(function(x){ return /complet/i.test(x.N); });
      var avg = done ? 100 : Math.round(list.reduce(function(a, x){ return a + (/complet/i.test(x.N) ? 100 : x.O); }, 0) / list.length);
      return [done ? 'Completed' : avg > 0 ? 'In Progress' : 'To Do', avg];
    }
    var at = sh_(CFG.SH_ALL), keys = atRead_().keys, ins = [], tail = [], used = [];
    order.forEach(function(k){
      var g = groups[k], nm = keyName(g.ym);
      var ex = keys.filter(function(x){ return x.row && !x.vSrc && atNorm_(x.keyTask) === atNorm_(nm) && atNorm_(x.pic) === atNorm_(g.pic); })[0];
      if(ex){ ins.push({ after: atKeyEnd_(ex), rows: g.subs, key: ex }); out.keysUsed++; }
      else {
        var y = +g.ym.slice(0, 4), m = +g.ym.slice(4, 6), r = roll(g.subs);
        tail.push({ E: CFG.VS_TYPE, F: nm, G: '', H: g.pic, I: '', J: g.ym.slice(0, 4) + '-' + g.ym.slice(4, 6) + '-01',
                    K: Utilities.formatDate(new Date(y, m, 0), tz_(), 'yyyy-MM-dd'), N: r[0], O: r[1] });
        tail = tail.concat(g.subs); out.keysNew++;
      }
      out.moved += g.subs.length;
    });
    function put(row, list){
      if(!list.length) return;
      at.getRange(row, 5, list.length, 8).setValues(list.map(function(o){ return [o.E, o.F, o.G, o.H, o.I, date_(o.J) || '', date_(o.K) || '', '']; }));
      at.getRange(row, 14, list.length, 2).setValues(list.map(function(o){ return [o.N, Math.max(0, Math.min(100, o.O)) / 100]; }));
    }
    ins.sort(function(a, b){ return b.after - a.after; }).forEach(function(x){
      at.insertRowsAfter(x.after, x.rows.length);
      at.getRange(x.after + 1, 2, x.rows.length, AT_W).clearContent();
      put(x.after + 1, x.rows); used.push(x.key.keyTask + '|' + x.key.pic);
    });
    if(tail.length){
      _AT = null; var r0 = atLastRow_() + 1;
      if(r0 + tail.length > at.getMaxRows()) at.insertRowsAfter(at.getMaxRows(), r0 + tail.length - at.getMaxRows() + 20);
      put(r0, tail);
    }
    SpreadsheetApp.flush(); _AT = null;
    atHealFormulas_();
    used.forEach(function(u){ _AT = null; var p = u.split('|'), k = atRead_().keys.filter(function(x){ return x.keyTask === p[0] && x.pic === p[1] && !x.vSrc; })[0]; if(k) atRollup_(k.no); });
    /* ③ delete the rows from CUSTOMER TASK (bottom-up runs) */
    var del = rows.map(function(w){ return w._row; }).sort(function(a, b){ return b - a; }), i = 0;
    while(i < del.length){ var end = del[i], start = end; while(i + 1 < del.length && del[i + 1] === start - 1){ i++; start = del[i]; } wk.deleteRows(start, end - start + 1); i++; }
    /* ④ CUSTOMER CODE: empty the data cells of the internal "accounts" (row kept ⇒ codes of the other customers unchanged) */
    var fi = TABS.customer.f;
    cus.forEach(function(c){
      ['name','type','address','province','area','pic','fy','openDate','note'].forEach(function(f){ cs.getRange(c._row, 2 + fi.indexOf(f)).clearContent(); });
      out.customers++;
    });
    SpreadsheetApp.flush();
    log_('system', 'move', 'weekly', out.moved + ' internal row(s)', 'CUSTOMER TASK → OTHERS TASK (Others MM/yyyy) · ' + out.customers + ' internal account(s) removed', 0);
  } finally { L.releaseLock(); }
  _TAB = {}; _AT = null;
  try{ out.sync = vsSync_(false, 30000); }catch(e){ out.sync = String(e); }
  try{ bump_(); }catch(e){}
  return out;
}
