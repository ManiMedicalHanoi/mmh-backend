/*************************************************************************************************
 * THAILAND DENTAL — BUILD THE CRM LAYOUT  (TH_DentalLayout.gs · v1.0 · 30/10/2026)
 *
 * Menu  MMH CRM (Thailand Dental) ▸ ⓪  (function thdBuild) — run ONCE by the owner of the file.
 * The file "1. Thailand - Dental Action FY68" gets the SAME sheets as FY68_Thailand_Surgical_CRM — WITHOUT the numbers
 * in the sheet names (user request 30/10/2026: "CUSTOMER CODE", "TARGET & KPI", "NEW ACCOUNT & SKU"…):
 *   ⓪ names: numbered sheets already made (e.g. by menu ⑤) lose their number; old sheets become "OLD · <name>" (hidden)
 *   ① copies the CRM sheets of the Surgical file (layout, formulas, dropdowns, colours) and empties their data
 *   ② dropdown lists (MASTER LIST) + codes (CODE MAP) for Dental: PIC Yong · Man · Sui, Dental products,
 *      Type action "Co-visiting with distributor" (KPI C4-01 / C4-03), Account type DSO (KPI C2-01)
 *   ③ moves the data of the old sheets (nothing is deleted — old sheets are hidden at the end of the file):
 *        Customer list → CUSTOMER CODE · CBC → CBC · WEEK → CUSTOMER VISITING · MONTHLY REPORT → MONTHLY REPORT
 *        YEAR - Account → ADP · renamed: Customer analysis → CUSTOMER ANALYSIS · YEAR - Function → YEARLY FUNCTION PLAN ·
 *        Jizai Report / Jizai MOU project / DDI Jizai sale / DDI Sale Report → upper case · KPI → OLD KPI (before FY68)
 *   ④ TARGET & KPI (KPI FY68 of Yong · Man · Sui), WEEKLY MEETING / TENDER TRACK / TENDER PRICE LOG / NEW ACCOUNT & SKU,
 *      _CUSTOMER_LOG, triggers, ALL TASK sync
 * Each step is remembered (Script Property THD_DONE): running ⓪ again only does the steps not done yet.
 * A step that needs more time continues by itself in the background (one-off trigger thdBuildCont).
 *************************************************************************************************/
var THD = {
  TEMPLATE_ID: '1rX8BDcbFGOjpXFmPJeKTkllE4LH7q9A8zz22R7jDA0E',   /* FY68_Thailand_Surgical_CRM */
  KPI_FILE: 'https://docs.google.com/spreadsheets/d/1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0/edit',
  /* [sheet in the Surgical file, header row, first data row] — copied, renamed without its number (THD_NAME), data emptied */
  COPY: [['1. CUSTOMER CODE', 3, 4], ['2. CBC', 3, 4], ['5. MONTHLY REPORT', 3, 4], ['6. CUSTOMER VISITING', 3, 4],
         ['7. PRODUCT PRESENTATION', 3, 4], ['8. ADP', 3, 4], ['10. MASTER LIST', 3, 4], ['11. CODE MAP', 3, 4],
         ['ALL TASK', 5, 7], ['18. FRAMEWORK', 0, 0]],
  RENAME: [['Customer analysis', 'CUSTOMER ANALYSIS'], ['YEAR - Function', 'YEARLY FUNCTION PLAN'], ['Jizai Report', 'JIZAI REPORT'],
           ['Jizai MOU project', 'JIZAI MOU PROJECT'], ['DDI Jizai sale', 'DDI JIZAI SALE'], ['DDI Sale Report', 'DDI SALE REPORT'],
           ['KPI', 'OLD KPI (before FY68)']],
  OLD: { cust: 'Customer list', cbc: ' CBC', week: 'WEEK', mon: 'MONTHLY REPORT', adp: 'YEAR - Account' },
  /* old sheets replaced by the CRM sheets ⇒ renamed "OLD · <name>" (step names, before the new sheets are made) and hidden */
  HIDE: ['Customer list', ' CBC', 'WEEK', 'MONTHLY REPORT', 'YEAR - Account', 'Master name', 'MONTH VIEW', 'Framework', 'SOP', 'Mani Products'],
  ORDER: ['GUIDE', 'CUSTOMER CODE', 'CBC', 'MONTHLY REPORT', 'CUSTOMER VISITING', 'ALL TASK', 'PRODUCT PRESENTATION', 'ADP',
          'TARGET & KPI', 'MASTER LIST', 'CODE MAP', 'CUSTOMER ANALYSIS', 'YEARLY FUNCTION PLAN', 'JIZAI REPORT',
          'JIZAI MOU PROJECT', 'DDI JIZAI SALE', 'DDI SALE REPORT', 'FRAMEWORK', 'WEEKLY MEETING', 'TENDER TRACK',
          'TENDER PRICE LOG', 'NEW ACCOUNT & SKU', 'PRODUCT TEST', 'SALE ORDERS', 'OLD KPI (before FY68)'],
  STEPS: ['names', 'copy', 'master', 'customers', 'cbc', 'visits', 'monthly', 'adp', 'sheets', 'kpi', 'guide', 'triggers', 'sync', 'ptest'],
  MASTER: {
    'pic': { set: ['Yong', 'Man', 'Sui', 'Dao', 'Moo', 'Sale Admin', 'Others'] },
    'account type': { add: ['DSO'] },
    'type task': { add: ['Sales-Thailand Dental'], drop: ['Sales-Thailand Surgical'] },
    'type action': { add: ['Co-visiting with distributor', 'Follow up'] },
    'product group': { set: ['JIZAI', 'EndoCompath', 'Hand files', 'Rotary files', 'DIA-BURS', 'Carbide burs', 'Surgical burs', 'IPR-01EF',
                             'Composite (MMG)', 'Mani Bond (MMG)', 'Bleaching (MMG)', 'Acrylic (MMG)', 'Dental sutures', 'Others'] },
    'job title': { add: ['Dentist', 'Endodontist', 'Clinic owner', 'Lecturer', 'Dental assistant', 'Purchasing'] }
  },
  BUDGET_MS: 270000
};

/* the old file had an installable onOpen trigger td_buildMenu ("📊 MMH Report") — replaced by the CRM menu */
function td_buildMenu(){}

/* sheet names WITHOUT numbers: "6. CUSTOMER VISITING" → "CUSTOMER VISITING" (also inside formulas copied from the Surgical file) */
function THD_NAME(n){ return String(n).replace(/^\d+\.\s+/, ''); }
function thdFmlName_(f){ return String(f || '').replace(/'(\d+)\.\s+([^'!]+)'!/g, function(m, num, rest){ return "'" + rest + "'!"; }); }

/* ── state ── */
function thdDone_(){ try{ return JSON.parse(props_().getProperty('THD_DONE') || '{}'); }catch(e){ return {}; } }
function thdMark_(step, info){ var d = thdDone_(); d[step] = info || Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm'); props_().setProperty('THD_DONE', JSON.stringify(d)); }
function thdStatus(){ var d = thdDone_(); return THD.STEPS.map(function(s){ return (d[s] ? '✓ ' : '· ') + s + (d[s] ? ' — ' + d[s] : ''); }).join('\n'); }
function thdReset(){ props_().deleteProperty('THD_DONE'); return 'THD_DONE cleared'; }

function thdBuild(){ return thdRun_(true); }
function thdBuildCont(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdBuildCont') ScriptApp.deleteTrigger(t); });
  return thdRun_(false);
}
function thdRun_(ui){
  var t0 = Date.now(), done = thdDone_(), log = [], P = props_(), busy = +(P.getProperty('THD_RUN') || 0);
  if(busy && t0 - busy < 7 * 60 * 1000){ thdSay_(ui, 'The layout is already being built (another run is in progress). Try again in a few minutes.\n\n' + thdStatus()); return; }
  P.setProperty('THD_RUN', String(t0));
  try{
    for(var i = 0; i < THD.STEPS.length; i++){
      var st = THD.STEPS[i]; if(done[st]) continue;
      if(Date.now() - t0 > THD.BUDGET_MS){
        ScriptApp.newTrigger('thdBuildCont').timeBased().after(30 * 1000).create();
        thdSay_(ui, 'Done so far:\n' + log.join('\n') + '\n\nThe remaining steps continue by themselves in the background (≈ 1–5 minutes).\nMenu ⓪ shows the progress.');
        return { ok: true, more: true, log: log };
      }
      _SH = {}; _TAB = {};
      var r = THD_STEP[st]();
      SpreadsheetApp.flush();
      thdMark_(st, (r || '') + ' · ' + Utilities.formatDate(new Date(), tz_(), 'dd/MM HH:mm'));
      log.push('✓ ' + st + (r ? ' — ' + r : ''));
    }
    _SH = {}; _TAB = {}; try{ bump_(); }catch(e){}
    thdSay_(ui, (log.length ? log.join('\n') + '\n\n' : '') + 'The Thailand Dental CRM layout is ready.\n\n' + thdStatus() +
      '\n\nOld sheets are hidden at the end of the file (nothing was deleted).');
    return { ok: true, log: log };
  }catch(e){
    try{ P.setProperty('THD_ERR', Utilities.formatDate(new Date(), tz_(), 'dd/MM HH:mm') + ' · ' + String(e && e.message || e).slice(0, 400)); }catch(x){}
    thdSay_(ui, 'Stopped at a step: ' + (e && e.message || e) + '\n\nDone so far:\n' + log.join('\n') + '\n\nRun menu ⓪ again to retry the remaining steps.');
    throw e;
  }finally{ try{ P.deleteProperty('THD_RUN'); }catch(e){} }
}
function thdSay_(ui, msg){ Logger.log(msg); if(ui){ try{ SpreadsheetApp.getUi().alert(msg); }catch(e){} } }

/* ── helpers ── */
/* ids of the sheets made by step copy (so step names never takes a new CRM sheet for an old one) */
function thdMade_(id){
  var m = {}; try{ m = JSON.parse(props_().getProperty('THD_MADE') || '{}'); }catch(e){}
  if(id != null){ m[id] = 1; props_().setProperty('THD_MADE', JSON.stringify(m)); }
  return m;
}
var _THD_TPL = null;
function thdTpl_(){ return _THD_TPL || (_THD_TPL = SpreadsheetApp.openById(THD.TEMPLATE_ID)); }
function thdNorm_(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); }
/* an OLD sheet of the Dental Action file: "OLD · <name>" first, then the original name — never a sheet made by step copy */
function thdOld_(name){
  var all = ss_().getSheets(), made = thdMade_();
  var wants = [thdNorm_('OLD · ' + String(name).trim()), thdNorm_(name)];
  for(var k = 0; k < wants.length; k++)
    for(var i = 0; i < all.length; i++) if(thdNorm_(all[i].getName()) === wants[k] && !made[all[i].getSheetId()]) return all[i];
  return null;
}
/* read an old sheet: finds the header row (the row holding all `need` headers), returns rows as objects keyed by normalised header */
function thdRead_(name, need){
  var s = thdOld_(name); if(!s) return { rows: [], hdr: [] };
  var last = s.getLastRow(), lc = s.getLastColumn(); if(last < 2) return { rows: [], hdr: [] };
  var v = s.getRange(1, 1, last, lc).getValues(), h = -1;
  for(var r = 0; r < Math.min(8, v.length) && h < 0; r++){
    var hs = v[r].map(thdNorm_);
    if(need.every(function(n){ return hs.indexOf(n) >= 0; })) h = r;
  }
  if(h < 0) throw new Error('Sheet "' + name + '": header row not found (' + need.join(', ') + ')');
  var hdr = v[h].map(thdNorm_), rows = [];
  for(var i = h + 1; i < v.length; i++){
    var o = { _r: i + 1 }, any = false;
    hdr.forEach(function(k, c){ if(!k) return; if(o[k] === undefined || o[k] === ''){ o[k] = v[i][c]; } if(v[i][c] !== '' && v[i][c] != null) any = true; });
    if(any) rows.push(o);
  }
  return { rows: rows, hdr: hdr };
}
var THD_HINT = /^(auto|select|text|texting|choose.*|select \(.*\)|texting \(.*\)|auto real time)$/i;
function thdS_(v){ if(v == null) return ''; if(v instanceof Date) return v; var s = String(v).replace(/\u00a0/g, ' ').trim(); return /^#(N\/A|REF!|ERROR!|VALUE!|DIV\/0!|NAME\?)/.test(s) ? '' : s; }
function thdDate_(v){ var s = iso_(v); return s ? date_(s) : ''; }   /* date at 00:00 in the file's time zone */
function thdYm_(d, fallback){ if(d instanceof Date) return Utilities.formatDate(d, tz_(), 'yyyyMM'); var m = String(fallback || '').replace(/\D/g, '').slice(0, 6); return m.length === 6 ? m : ''; }
function thdAccKey_(name, type, prov){ return [name, type, prov].map(thdNorm_).join('|'); }

/* write rows (objects keyed by TABS[k].f) into a CRM tab from its first data row; formula columns get the template formula */
function thdWrite_(k, list){
  var d = TABS[k], s = sh_(d.sh), first = CFG.DATA, n = list.length;
  var fml = THD_FML[d.sh] || {};
  if(!n) return 0;
  if(s.getMaxRows() < first + n + 50) s.insertRowsAfter(s.getMaxRows(), first + n + 50 - s.getMaxRows());
  var vals = list.map(function(o){ return d.f.map(function(f){ return d.formula.indexOf(f) >= 0 ? '' : (o[f] == null ? '' : o[f]); }); });
  thdDvRelax_(s, first, n + 50, d.w);   /* old Dental values may not be in the dropdown lists ⇒ warn, never reject the write */
  s.getRange(first, 2, n, d.w).setValues(vals);
  Object.keys(fml).forEach(function(c){ s.getRange(first, +c, n, 1).setFormulaR1C1(thdFmlName_(fml[c])); });
  return n;
}
/* dropdowns of a CRM tab: same rules, but "show a warning" instead of "reject the input" (columns B…) */
function thdDvRelax_(s, first, n, w){
  var dv = s.getRange(first, 2, 1, w).getDataValidations()[0];
  dv.forEach(function(rule, j){
    if(!rule) return;
    try{ s.getRange(first, j + 2, Math.max(1, s.getMaxRows() - first + 1), 1).setDataValidation(rule.copy().setAllowInvalid(true).build()); }catch(e){}
  });
}
/* formulas (R1C1) of the first data row of each copied template sheet — filled during step "copy" */
var THD_FML = {};
function thdFmlLoad_(){
  var raw = {}; try{ raw = JSON.parse(props_().getProperty('THD_FML') || '{}'); }catch(e){}
  THD_FML = {}; Object.keys(raw).forEach(function(k){ THD_FML[THD_NAME(k)] = raw[k]; });   /* keys of an older run may still carry the number */
  return THD_FML;
}

var THD_STEP = {
  /* ⓪ sheet names without numbers: CRM sheets already made with a number lose it; old sheets → "OLD · <name>" (hidden) */
  names: function(){
    var book = ss_(), n = 0, o = 0, made = thdMade_();
    THD.HIDE.forEach(function(nm){
      var w = thdNorm_(nm), s = book.getSheets().filter(function(x){ return thdNorm_(x.getName()) === w && !made[x.getSheetId()]; })[0] || null;   /* never a sheet made by step copy */
      if(!s || /^OLD · /.test(s.getName())) return;
      var to = 'OLD · ' + String(nm).trim(); if(book.getSheetByName(to)) return;
      s.setName(to); o++; try{ s.setTabColor('#BFBFBF'); s.hideSheet(); }catch(e){}
    });
    book.getSheets().forEach(function(s){
      var nm = s.getName(), to = THD_NAME(nm);
      if(to === nm || !/^\d+\.\s/.test(nm) || book.getSheetByName(to)) return;
      s.setName(to); n++;
    });
    return n + ' sheet(s) renamed without number · ' + o + ' old sheet(s) → "OLD · …"';
  },
  /* ① copy the CRM sheets of the Surgical file */
  copy: function(){
    var tpl = thdTpl_(), book = ss_(), made = [], fmlAll = {};
    THD.COPY.forEach(function(c){
      var name = c[0], src = tpl.getSheetByName(name);
      if(!src) throw new Error('Template sheet "' + name + '" not found in ' + tpl.getName());
      if(book.getSheetByName(THD_NAME(name))) return;
      var sh = src.copyTo(book); sh.setName(THD_NAME(name)); made.push(THD_NAME(name)); thdMade_(sh.getSheetId());
    });
    _SH = {};
    THD.COPY.forEach(function(c){
      var name = c[0], hRow = c[1], first = c[2], src = tpl.getSheetByName(name), sh = book.getSheetByName(THD_NAME(name));
      if(!first) return;                                               /* reference sheet (18. FRAMEWORK): keep as copied */
      var lc = src.getLastColumn();
      /* header area: formulas again (cross-sheet references resolve now that every sheet exists) */
      if(first > 1){
        var hf = src.getRange(1, 1, first - 1, lc).getFormulasR1C1();
        hf.forEach(function(r, i){ r.forEach(function(f, j){ if(f) sh.getRange(i + 1, j + 1).setFormulaR1C1(thdFmlName_(f)); }); });
      }
      /* first data row: remember its formulas, then empty every data row */
      var rf = src.getRange(first, 1, 1, lc).getFormulasR1C1()[0], keep = {};
      rf.forEach(function(f, j){ if(f) keep[j + 1] = thdFmlName_(f); });
      fmlAll[THD_NAME(name)] = keep;
      var last = Math.max(sh.getLastRow(), first);
      sh.getRange(first, 1, last - first + 1, sh.getMaxColumns()).clearContent();
      if(name !== '10. MASTER LIST' && name !== '11. CODE MAP')   /* template names */
        Object.keys(keep).forEach(function(col){ sh.getRange(first, +col).setFormulaR1C1(keep[col]); });
      /* dropdowns of the data rows: rebuilt so that they point to THIS file's 10. MASTER LIST */
      var dv = src.getRange(first, 1, 1, lc).getDataValidations()[0], rows = sh.getMaxRows() - first + 1;
      dv.forEach(function(rule, j){
        if(!rule) return;
        var out = rule;
        try{
          if(rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE){
            var a = rule.getCriteriaValues(), rg = a[0], ds = book.getSheetByName(THD_NAME(rg.getSheet().getName()));
            out = ds ? rule.copy().requireValueInRange(ds.getRange(rg.getA1Notation()), a[1]).setAllowInvalid(true).build() : null;
          }
          if(out) sh.getRange(first, j + 1, rows, 1).setDataValidation(out);
        }catch(e){}
      });
      /* titles: Surgical → Dental */
      if(hRow > 1){
        var tr = sh.getRange(1, 1, hRow - 1, Math.min(lc, 6)), tv = tr.getValues(), tf = tr.getFormulas(), ch = false;
        tv.forEach(function(r, i){ r.forEach(function(x, j){ if(!tf[i][j] && typeof x === 'string' && /surgical/i.test(x)){ tv[i][j] = x.replace(/SURGICAL/g, 'DENTAL').replace(/Surgical/g, 'Dental').replace(/surgical/g, 'dental'); ch = true; } }); });
        if(ch) tr.setValues(tv.map(function(r, i){ return r.map(function(x, j){ return tf[i][j] ? tf[i][j] : x; }); }));
      }
    });
    props_().setProperty('THD_FML', JSON.stringify(fmlAll));
    /* _LOG: fresh */
    if(!book.getSheetByName(CFG.SH_LOG)){
      var lg = book.insertSheet(CFG.SH_LOG);
      lg.getRange(1, 1, 1, 7).setValues([['Time', 'PIC', 'Action', 'Tab', 'Target', 'Detail', 'Row']]).setFontWeight('bold');
      lg.setFrozenRows(1); try{ lg.hideSheet(); }catch(e){}
    }
    return made.length + ' sheet(s) copied';
  },

  /* ② dropdown lists + codes */
  master: function(){
    var s = sh_(CFG.SH_MASTER), lc = s.getLastColumn(), lr = Math.max(s.getLastRow(), 4);
    var tplS = thdTpl_().getSheetByName('10. MASTER LIST'), tv = tplS.getRange(3, 1, Math.max(2, tplS.getLastRow() - 2), tplS.getLastColumn()).getValues();
    var hdr = s.getRange(3, 1, 1, lc).getValues()[0].map(thdNorm_), n = 0;
    /* job titles actually used in the old CBC sheet */
    var jt = []; try{ thdRead_(THD.OLD.cbc, ['account pic']).rows.forEach(function(r){ var x = thdS_(r['job title']); if(x && !THD_HINT.test(x) && jt.indexOf(x) < 0 && jt.length < 40) jt.push(x); }); }catch(e){}
    hdr.forEach(function(h, c){
      var rule = THD.MASTER[h]; if(!rule) return;
      var cur = []; for(var r = 1; r < tv.length; r++){ var x = thdS_(tv[r][c]); if(x !== '') cur.push(x); }
      var list = rule.set ? rule.set.slice() : cur.filter(function(x){ return (rule.drop || []).indexOf(x) < 0; });
      (rule.add || []).concat(h === 'job title' ? jt : []).forEach(function(x){ if(!list.some(function(y){ return thdNorm_(y) === thdNorm_(x); })) list.push(x); });
      s.getRange(4, c + 1, lr - 3, 1).clearContent();
      s.getRange(4, c + 1, list.length, 1).setValues(list.map(function(x){ return [x]; }));
      n++;
    });
    /* re-fill the columns that were emptied by step copy (all columns of the template not handled above) */
    hdr.forEach(function(h, c){
      if(THD.MASTER[h]) return;
      var col = []; for(var r = 1; r < tv.length; r++) col.push([tv[r][c]]);
      while(col.length && (col[col.length - 1][0] === '' || col[col.length - 1][0] == null)) col.pop();
      if(col.length) s.getRange(4, c + 1, col.length, 1).setValues(col);
    });
    /* 11. CODE MAP: template codes again + DSO + provinces of the Dental customers */
    var cm = sh_(CFG.SH_CODE), tc = thdTpl_().getSheetByName('11. CODE MAP'), tcv = tc.getRange(4, 2, Math.max(1, tc.getLastRow() - 3), 6).getValues();
    var areas = [], provs = [], types = [];
    tcv.forEach(function(r){ if(r[0] !== '') areas.push([r[0], r[1]]); if(r[2] !== '') provs.push([r[2], r[3]]); if(r[4] !== '') types.push([r[4], r[5]]); });
    if(!types.some(function(t){ return thdNorm_(t[0]) === 'dso'; })) types.push(['DSO', 'DS']);
    var codes = {}; provs.forEach(function(p){ codes[String(p[1]).toUpperCase()] = 1; });
    var have = {}; provs.forEach(function(p){ have[thdNorm_(p[0])] = 1; });
    var addP = 0;
    thdRead_(THD.OLD.cust, ['account name']).rows.forEach(function(r){
      var p = thdS_(r['provinces'] || r['province']); if(!p || THD_HINT.test(p) || have[thdNorm_(p)] || /^province$/i.test(p)) return;
      var base = p.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'PRV', code = base, k = 2;
      while(codes[code]) code = base.slice(0, 2) + (k++);
      codes[code] = 1; have[thdNorm_(p)] = 1; provs.push([p, code]); addP++;
    });
    cm.getRange(4, 2, Math.max(cm.getMaxRows() - 3, 1), 6).clearContent();
    var nr = Math.max(areas.length, provs.length, types.length), out = [];
    for(var i = 0; i < nr; i++) out.push([(areas[i] || ['', ''])[0], (areas[i] || ['', ''])[1], (provs[i] || ['', ''])[0], (provs[i] || ['', ''])[1], (types[i] || ['', ''])[0], (types[i] || ['', ''])[1]]);
    if(cm.getMaxRows() < nr + 4) cm.insertRowsAfter(cm.getMaxRows(), nr + 4 - cm.getMaxRows());
    cm.getRange(4, 2, nr, 6).setValues(out);
    return n + ' dropdown lists · ' + addP + ' province code(s) added';
  },

  /* ③ customers (+ accounts used in WEEK / CBC / YEAR - Account that are missing from the Customer list) */
  customers: function(){
    var old = thdRead_(THD.OLD.cust, ['account name', 'account type']).rows, seen = {}, list = [], dup = 0;
    old.forEach(function(r){
      var name = thdS_(r['account name']); if(!name || THD_HINT.test(name)) return;
      var type = thdS_(r['account type']), prov = thdS_(r['provinces'] || r['province']), area = thdS_(r['area']).replace(/^nothern$/i, 'Northern');
      var k = thdAccKey_(name, type, prov);
      if(seen[k]){ dup++; return; }
      var note = []; var dis = thdS_(r['district']); if(dis && !THD_HINT.test(dis)) note.push('District: ' + dis);
      seen[k] = 1;
      list.push({ name: name, type: type, address: thdS_(r['address']), province: prov, area: area, pic: thdS_(r['mmh sales pic']),
                  fy: '', openDate: '', note: note.join(' · ') });
    });
    /* accounts referenced elsewhere */
    var add = 0;
    function ref(sheet, need, col, picCol){
      var rows = []; try{ rows = thdRead_(sheet, need).rows; }catch(e){ return; }
      var cnt = {};
      rows.forEach(function(r){
        var a = parseAcc_(thdS_(r[col])); if(!a.name || THD_HINT.test(a.name)) return;
        var k = thdAccKey_(a.name, a.type, a.province); if(seen[k]) return;
        if(!cnt[k]) cnt[k] = { a: a, pics: {} };
        var p = thdS_(r[picCol]); if(p) cnt[k].pics[p] = (cnt[k].pics[p] || 0) + 1;
      });
      Object.keys(cnt).forEach(function(k){
        var o = cnt[k], best = Object.keys(o.pics).sort(function(x, y){ return o.pics[y] - o.pics[x]; })[0] || '';
        seen[k] = 1; add++;
        list.push({ name: o.a.name, type: o.a.type, address: '', province: o.a.province, area: o.a.area.replace(/^nothern$/i, 'Northern'), pic: best, fy: '', openDate: '',
                    note: 'Added from "' + sheet.trim() + '" (account not in Customer list)' });
      });
    }
    ref(THD.OLD.week, ['check account name', 'task'], 'check account name', 'sale pic');
    ref(THD.OLD.cbc, ['check account name', 'account pic'], 'check account name', 'mmh sales pic');
    ref(THD.OLD.adp, ['check account name', 'objective'], 'check account name', 'sale pic');
    thdFmlLoad_(); thdWrite_('customer', list);
    return list.length + ' accounts (' + add + ' added from WEEK / CBC / ADP, ' + dup + ' duplicates merged)';
  },

  /* ④ contacts */
  cbc: function(){
    var cus = {}; readTab_('customer').forEach(function(c){ cus[thdAccKey_(c.name, c.type, c.province)] = c; });
    var list = [];
    thdRead_(THD.OLD.cbc, ['check account name', 'account pic']).rows.forEach(function(r){
      var acc = thdS_(r['check account name']), who = thdS_(r['account pic']);
      if(!acc || !who || THD_HINT.test(who)) return;
      var a = parseAcc_(acc), c = cus[thdAccKey_(a.name, a.type, a.province)] || {};
      var ph = r['telephone'];
      if(typeof ph === 'number'){ ph = String(Math.round(ph)); if(/^\d{8,9}$/.test(ph)) ph = '0' + ph; }
      list.push({ type: a.type, name: a.name, address: c.address || '', province: a.province, area: a.area, pic: thdS_(r['mmh sales pic']) || c.pic || '',
        contact: who, phone: thdS_(ph), jobTitle: thdS_(r['job title']), specialize: thdS_(r['specialize']), role: thdS_(r['role']),
        influence: thdS_(r['influence']), trust: thdS_(r['trust']), note: '', log: 'Imported from "1. Thailand - Dental Action FY68" · CBC' });
    });
    var s = sh_(TABS.cbc.sh), pc = 2 + TABS.cbc.f.indexOf('phone');
    try{ s.getRange(CFG.DATA, pc, Math.max(1, list.length), 1).setNumberFormat('@'); }catch(e){}
    thdFmlLoad_(); thdWrite_('cbc', list);
    return list.length + ' contacts';
  },

  /* ⑤ WEEK → 6. CUSTOMER VISITING */
  visits: function(){
    var list = [], today = date_(todayIso_());
    thdRead_(THD.OLD.week, ['check account name', 'task', 'task result']).rows.forEach(function(r){
      var acc = thdS_(r['check account name']), plan = thdS_(r['task']), res = thdS_(r['task result']), pic = thdS_(r['sale pic']);
      if(THD_HINT.test(pic)) return;
      if(!acc && !plan && !res) return;
      var st = thdDate_(r['start date']), fi = thdDate_(r['finish date']) || st, dl = thdDate_(r['deadline']);
      var month = thdYm_(st, r['start month']), fy = month ? fyOfYm_(month) : thdS_(r['fy']).toUpperCase();
      var extra = [];
      if(dl && fi && dl.getTime() !== fi.getTime()) extra.push('Deadline: ' + Utilities.formatDate(dl, tz_(), 'dd/MM/yyyy'));
      var asg = thdS_(r['assigner']); if(asg && !THD_HINT.test(asg)) extra.push('Assigner: ' + asg);
      var cm = thdS_(r['assinger/manager comment'] || r['assigner/manager comment']);
      var photo = thdS_(r['photo']);
      list.push({ no: list.length + 1, fy: fy, month: month, start: st, finish: fi, pic: pic, account: acc,
        product: '', typeTask: thdS_(r['type task']), typeAction: thdS_(r['type action']), process: '',
        plan: plan + (extra.length ? (plan ? '\n' : '') + extra.join(' · ') : ''),
        result: res + (cm && !THD_HINT.test(cm) ? (res ? '\n' : '') + 'Manager comment: ' + cm : ''),
        status: thdS_(r['status']).replace(/\s+/g, ' ') || (st && st <= today ? '' : 'Not Started'),
        feedback: '', nextAction: '', stopReason: '', photo: /^https?:/i.test(photo) ? photo : '', gps: '' });
    });
    thdFmlLoad_(); thdWrite_('weekly', list);
    return list.length + ' actions';
  },

  /* ⑥ MONTHLY REPORT → 5. MONTHLY REPORT */
  monthly: function(){
    var list = [];
    thdRead_(THD.OLD.mon, ['type task', 'monthly plan']).rows.forEach(function(r){
      var plan = thdS_(r['monthly plan']), res = thdS_(r['monthly report']), tt = thdS_(r['type task']);
      if(!plan && !res) return; if(THD_HINT.test(tt)) return;
      var per = thdYm_(r['month'] instanceof Date ? r['month'] : null, r['month']);
      list.push({ no: list.length + 1, typeTask: tt, pic: thdS_(r['pic']), area: thdS_(r['area']) || 'Thailand', fy: thdS_(r['fy']) || fyOfYm_(per), period: per, plan: plan, result: res });
    });
    thdFmlLoad_(); thdWrite_('monthly', list);
    return list.length + ' rows';
  },

  /* ⑦ YEAR - Account → 8. ADP (columns matched by header name) */
  adp: function(){
    var s = sh_(TABS.adp.sh), dh = s.getRange(3, 2, 1, TABS.adp.w).getValues()[0].map(thdNorm_), list = [], now = new Date();
    thdRead_(THD.OLD.adp, ['check account name', 'objective']).rows.forEach(function(r){
      var acc = thdS_(r['check account name']); if(!acc || THD_HINT.test(acc)) return;
      var o = { no: list.length + 1, created: now, updated: now };
      TABS.adp.f.forEach(function(f, i){
        if(o[f] !== undefined) return;
        var v = r[dh[i]]; if(v === undefined) v = '';
        if(typeof v === 'string' && /^#(N\/A|REF|ERROR|VALUE)/.test(v)) v = '';
        o[f] = v instanceof Date ? v : thdS_(v);
      });
      o.account = acc; o.pic = thdS_(r['sale pic']);
      list.push(o);
    });
    thdFmlLoad_(); thdWrite_('adp', list);
    return list.length + ' key accounts';
  },

  /* ⑧ rename / hide / order */
  sheets: function(){
    var book = ss_(), n = 0;
    THD.RENAME.forEach(function(p){ var s = thdOld_(p[0]); if(s && !book.getSheetByName(p[1])){ s.setName(p[1]); n++; } });
    THD.HIDE.forEach(function(nm){ var s = thdOld_(nm); if(s && THD.ORDER.indexOf(s.getName()) < 0){ try{ s.setTabColor('#BFBFBF'); s.hideSheet(); }catch(e){} } });
    try{ naSheet_(); }catch(e){}
    try{ mtMeetSh_(); mtTenderSh_(); mtPriceSh_(); }catch(e){}
    try{ custLogSheet_().hideSheet(); }catch(e){}
    return n + ' sheet(s) renamed, old sheets hidden';
  },

  /* ⑨ KPI tab (KPI FY68 of Yong · Man · Sui) */
  kpi: function(){
    var r = k68Setup_(ss_(), CFG.SH_KPI, CFG.KEY);
    try{ r.sheet.getRange(K68_SET.link).setValue(THD.KPI_FILE); }catch(e){}
    return r.rows + ' KPI rows';
  },

  /* ⑩ guide + sheet order */
  guide: function(){
    var book = ss_(), g = book.getSheetByName('GUIDE') || book.insertSheet('GUIDE', 0);
    g.clear();
    var L = [
      ['THAILAND DENTAL CRM — USER GUIDE'],
      ['MANI Medical Hanoi · Thailand Dental team (Yong · Man · Sui) · FY68 · same layout as FY68_Thailand_Surgical_CRM · works with the MMH CRM web app (team "Thailand Dental", English)'],
      [''],
      ['A. GENERAL RULES'],
      ['1. Type only into white cells. BLUE text cells are formulas — do not overwrite them. Every dropdown comes from MASTER LIST.'],
      ['2. Customer code (column B of sheet 1) = Area + Province + Account type + row number (codes in CODE MAP). Check account name = Account name / Account type / Province / Area.'],
      ['3. Co-visits with a distributor sales rep: Type action = "Co-visiting with distributor" (KPI C4-01 Yong = co-visits · C4-03 Man = days with a co-visit, no confirmation needed).'],
      ['4. New KEY accounts (DSO / dental university / hospital) are recorded in the app ▸ New accounts & SKU (sheet NEW ACCOUNT & SKU) with the distributor confirmation (KPI C2-01).'],
      [''],
      ['B. SHEETS'],
      ['CUSTOMER CODE · CBC · MONTHLY REPORT · CUSTOMER VISITING · ALL TASK (other tasks + visits mirrored) · PRODUCT PRESENTATION · ADP · TARGET & KPI · MASTER LIST · CODE MAP'],
      ['CUSTOMER ANALYSIS · YEARLY FUNCTION PLAN · JIZAI REPORT · JIZAI MOU PROJECT · DDI JIZAI SALE · DDI SALE REPORT (kept from the old file) · FRAMEWORK · WEEKLY MEETING · TENDER TRACK · TENDER PRICE LOG · NEW ACCOUNT & SKU (written by the app)'],
      [''],
      ['C. DATA MOVED FROM THE OLD SHEETS (30/10/2026) — old sheets are renamed "OLD · …" and hidden at the end of the file, nothing was deleted'],
      ['Customer list → CUSTOMER CODE (accounts used in WEEK / CBC / YEAR - Account but missing from the list were added, Note = "Added from …") · CBC → CBC'],
      ['WEEK → CUSTOMER VISITING (Task → Plan, Deadline / Assigner kept at the end of Plan, manager comment at the end of Task Result) · MONTHLY REPORT → 5 · YEAR - Account → ADP'],
      ['Not moved: SALE ORDERS (kept as it is), Mani Products, MONTH VIEW, Master name (replaced by MASTER LIST).'],
      [''],
      ['D. KPI FY68 (TARGET & KPI ⇄ MMH KPI FY68 file, synced by the KPI Sync Center)'],
      ['Yong: F4-00 turnover (40%) · C2-01 new key accounts (20%) · C2-02 key account profiling % (10%) · C4-01 co-visits (20%)'],
      ['Man: F4-00 (25%) · C4-03 co-visiting days (15%) · C11-02 T&E events led by MMH (25%) · C11-03 product test pass rate (25%, sheet PRODUCT TEST)'],
      ['Sui: F4-00 (20%) · C14-00 T&E events KOL + MMH + exhibitions (20%) · C16-00 new product categories (30%) · C17-07 product content published (20%)'],
      ['Targets come from the KPI file. Turnover and events come from the KPI file (Turnover report · 2. Thailand - Dental Event Report). C2-02 / C16-00 / C17-07: typed in the KPI file. C11-03 = sheet PRODUCT TEST (Pass ÷ tests).'],
      [''],
      ['E. REPORTS'],
      ['Weekly / monthly report e-mails (English, PDF attached) from the app: To Shuhei · Cc Ha + Hoa. Weekly PDF also saved to the Sales teams folder ▸ "Thailand Dental".']
    ];
    g.getRange(1, 1, L.length, 1).setValues(L).setFontFamily('Aptos').setWrap(true).setVerticalAlignment('top');
    g.setColumnWidth(1, 1100);
    g.getRange(1, 1).setFontSize(14).setFontWeight('bold').setFontColor('#003047');
    [4, 10, 14, 19, 25].forEach(function(r){ g.getRange(r, 1).setFontWeight('bold').setFontColor('#003047').setBackground('#F0F7FF'); });
    /* order */
    var pos = 1;
    THD.ORDER.forEach(function(nm){ var s = book.getSheetByName(nm); if(!s) return; book.setActiveSheet(s); book.moveActiveSheet(pos++); });
    book.setActiveSheet(g);
    return 'guide written, ' + (pos - 1) + ' sheets ordered';
  },

  /* ⑪ triggers (same as menu ① Setup) */
  triggers: function(){
    ScriptApp.getProjectTriggers().forEach(function(t){
      if(['onEditTh', 'onChangeTh', 'cronTh', 'td_buildMenu'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
    var s = ss_();
    ScriptApp.newTrigger('onEditTh').forSpreadsheet(s).onEdit().create();
    ScriptApp.newTrigger('onChangeTh').forSpreadsheet(s).onChange().create();
    ScriptApp.newTrigger('cronTh').timeBased().everyMinutes(10).create();
    return 'onEdit · onChange · every 10 min';
  },

  /* ⑬ (30/10/2026) sheet PRODUCT TEST (KPI C11-03) + KPI tab with the new rules (C4-03 days without the 5-visit check, C11-03 from PRODUCT TEST) */
  ptest: function(){
    var book = ss_(), pt = ptSheet_(), r = k68Setup_(book, CFG.SH_KPI, CFG.KEY);
    var after = book.getSheetByName('NEW ACCOUNT & SKU'); if(after){ book.setActiveSheet(pt); book.moveActiveSheet(after.getIndex() + 1); }
    return 'PRODUCT TEST ready · KPI tab rebuilt (' + r.rows + ' rows)';
  },
  /* ⑫ mirror the visits into ALL TASK (long: done in its own run) */
  sync: function(){ bump_(); var r = vsSync_(false); return r.added + ' month(s) added to ALL TASK'; }
};

/* evidence folder of "New accounts & SKU" — created next to this file the first time (Script Property NA_FOLDER_ID) */
function thdNaFolder_(){
  var p = props_(), id = p.getProperty('NA_FOLDER_ID');
  if(id){ try{ DriveApp.getFolderById(id); return id; }catch(e){} }
  var name = 'MMH CRM Thailand Dental · New accounts & SKU', parent = null;
  try{ var it = DriveApp.getFileById(ss_().getId()).getParents(); if(it.hasNext()) parent = it.next(); }catch(e){}
  var f = null;
  if(parent){ var ex = parent.getFoldersByName(name); f = ex.hasNext() ? ex.next() : parent.createFolder(name); }
  else f = DriveApp.createFolder(name);
  p.setProperty('NA_FOLDER_ID', f.getId());
  return f.getId();
}
