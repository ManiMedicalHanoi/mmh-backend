/*************************************************************************************************
 * MMH CRM — THAILAND SURGICAL backend  (Code.gs · v1.18 · for the MMH CRM web app v28)
 * v1.18 (05/10/2026) — monthly report (e-mail, PDF, team export): Management-KPI items removed; Marketing groups
 *        (Marketing-Event last) moved to the end.
 * v1.17 (05/10/2026) — monthly report option "teamFiles": 2 PDF files for the whole team (Report of the chosen month +
 *        Plan of the next month), one person after another (Dao → Miew, then anyone else with rows). No e-mail is sent.
 * v1.16 (05/10/2026) — weekly report e-mail / PDF now use the SAME layout as the Vietnam teams (English): progress bars, a
 *        "Field visits" summary row on top (completed / planned appointments + list of done / not done / overdue),
 *        office work (account MMH) shown apart, planned activities never show 100%.
 *        Weekly AND monthly reports always CC Dao (manithailand@). Saving an activity: cannot be Completed before its start
 *        date; completed early ⇒ Finish date = today (overdue tasks keep their date). Business-trip proposals are written
 *        straight into the Business Trip file (actions tripMaster2 / tripPropose2). No duplicate report e-mails (request id).
 * v1.15 (03/10/2026) — New-account cases need NO sales order: complete account info, the distributor confirmation date
 *        (= KPI month), a care history in the weekly report (required) and the distributor's confirmation (e-mail screenshot).
 * v1.14 (03/10/2026) — every KPI push that writes cells bumps the "kpi" version ⇒ the app reloads the KPI figures at once.
 * v1.13 (03/10/2026) — month closing rule removed: every month syncs CRM ⇄ KPI file in real time (KPI file KpiSyncCenter v1.18).
 * v1.12 (03/10/2026) — kpiPush returns the cells written + closed months; KPI report cache cleared after each push.
 *        Late-entry window for a closed month (KPI file _CRM_LINKS!J1:K1, opened by a manager in the app KPI tab ▸ 🔓).
 * v1.11 (03/10/2026) — personal KPI / KPI report read the KPI file linked in cell D9 of the KPI tab (written there by the
 *        KPI file v1.16), formal KPI e-mail (Aptos, one table with a progress column), rule "target 0 ⇒ 100%",
 *        short English KPI names (full name on hover).
 * v1.10 (03/10/2026) — C2-03 of closed months (e.g. 09/2026) is rewritten ONCE with the new rule (approved cases); the old
 *        number came from "accounts opened". Runs at the next save in the app, the "Sync KPI FY68 file" button or naSetup (menu ⑨ to rerun).
 *        Personal KPI / KPI report: Target and Actual fall back to 3. Detail KPI; the total is summed when no TOTAL row is read.
 * v1.9 (03/10/2026) — NEW ACCOUNTS & NEW SKU LISTINGS + KPI REPORT + NO DUPLICATE SAVES
 *        · Sheet "23. NEW ACCOUNT & SKU": the sales rep records a new account / new SKU with evidence (drag & drop in the app),
 *          files go to the Thailand Surgical Drive folder (one sub-folder per month), named PIC_ddMMyyyy_Account_SKU.
 *          "Send for approval" e-mails the team leader (To) with the files attached, CC Director + chief accountant.
 *          The approver approves / rejects in the CRM (a rejection needs a comment and deletes the evidence files);
 *          the result is e-mailed to the PIC, Director, chief accountant and the approver.
 *        · KPI C2-03 (newacct_all) now counts APPROVED cases of sheet 23 by PIC + Month. The typed "new SKU" row is gone.
 *          The KPI tab rebuilds itself once at the next sync (layout k68v6, typed cells kept) — or run menu ⑤.
 *        · KPI report e-mail (actions kr…): reads sheet "5. Member KPI Monthly" of the MMH KPI FY68 file.
 *        · Every save from the app carries a request id: a request sent twice (slow network) is written only once.
 *        · push=0 from the app ⇒ the answer comes back at once, the app calls action kpiPush in the background.
 *        After pasting: run function naSetup once (Drive + Gmail permission, creates sheet 23) ▸ Deploy ▸ New version.
 * v1.8 (02/10/2026) — REAL-TIME KPI FROM THE APP: right after a visit, account, CBC or product presentation is saved
 *        (or a row is deleted) in the app, the KPI numbers of tab 9 are pushed to the MMH KPI FY68 file at once
 *        (3. Detail KPI updates within seconds, no waiting for the 1-minute trigger). Closed months (after 16:00 on the
 *        2nd of the next month) stay locked as the KPI rule says. The push result is returned to the app as kpiPush.
 *        After pasting: Deploy ▸ Manage deployments ▸ Edit ▸ Version: New version ▸ Deploy.
 * v1.7 (02/10/2026) — distributor turnover (F codes) is now MONTHLY (target and actual of each month, Aggregation = Sum,
 *        FY result = sum of the months). The KPI file (KpiSyncCenter v1.13) converts the targets by itself.
 *        After pasting: open the CRM file ▸ menu ⑤ "Rebuild the KPI tab".
 * v1.6 (02/10/2026) — KPI FY68: visits with Task Status = Cancel / Cancelled are no longer counted (C4-02).
 *        After pasting: open the CRM file ▸ menu ⑤ "Rebuild the KPI tab from the KPI FY68 file" (typed cells are kept).
 * v1.5 — customer data log (sheet "_CUSTOMER_LOG": every add / update / delete of an Account or CBC, with the changed fields)
 *        · delete an account (with its CBC) or a CBC from the app
 * v1.4 — weekly meeting · tenders: product-code price log per area (sheet 22. TENDER PRICE LOG, every entry is a new row,
 *        actions mtPrices / mtPriceSave / mtPriceDelete) · a tender holds several code lines (qty × unit price), new columns
 *        Province · Region · Items (JSON) at the end of sheet 21. TENDER TRACK
 * v1.3 — a visit belongs to a week when its START date is in the week; a visit that started earlier counts only while
 *        it is still running and lasts <= 14 days (a finish date typed wrong no longer pulls old visits into this week)
 * v1.2 — sheet "9. TARGET & KPI" follows the MMH KPI FY68 file: one row per KPI code (F1-00, F6-03, C13-00, C11-01,
 *        F1-01, C11-01a, C4-02, C2-03), 12 monthly targets, actuals are sheet FORMULAS, two-way sync with the KPI file
 *        (menu ⑤ rebuild · ⑥ sync now · ⑦ sync every morning · "Sync" button in the app for managers / Dao)
 * v1.1 — weekly report: a visit belongs to the week when its start OR finish date is in the week (a finish date typed
 *        as dd/mm ↔ mm/dd no longer puts the visit into every week) · WEEKLY MEETING module (sheets 20 / 21) ·
 *        weekly-report PDFs saved to the shared Drive folder of the sales teams (subfolder "Thailand Surgical")
 * Paste this whole file into the Apps Script project of the Google Sheet "FY68_Thailand_Surgical_CRM",
 * then Deploy ▸ Manage deployments ▸ Edit ▸ Version: New version ▸ Deploy (Execute as: Me · Access: Anyone).
 * First time only: reload the sheet and run menu  MMH CRM (Thailand) ▸ ① Setup.
 *
 * Sheets (header row 3, data from row 4, first column B):
 *   1. CUSTOMER CODE · 2. CBC · 5. MONTHLY REPORT · 6. CUSTOMER VISITING · 7. PRODUCT PRESENTATION ·
 *   8. ADP · 9. TARGET & KPI · 10. MASTER LIST · 11. CODE MAP · _LOG
 *   ALL TASK  (header row 5, data from row 7 — same Key task ▸ Sub task layout as "WEEKYLY new" of Sales & Marketing)
 *
 * What is different from the Vietnam CRM backends:
 *   · no Sales order, no product code, no field photos (nothing is uploaded to Drive)
 *   · "Other tasks" of the Thailand team live in sheet ALL TASK of THIS file (the app reads/writes them here,
 *     not in the Report Hub); every customer visit in 6. CUSTOMER VISITING is mirrored automatically into
 *     ALL TASK as key task "YYYYMM_Thailand Surgical Customer visiting" + one sub task per visit
 *   · nothing is pushed to any other backend
 *   · report e-mails in English: Dao → To nt.ha, Cc vtt.hoa · Miew → To nt.ha, Cc Dao + vtt.hoa (v1.4)
 *   · v1.4: Dao is the team leader — she sees and can update the tasks of the whole team (Dao + Miew)
 *************************************************************************************************/

/* ══════════════ CONFIG ══════════════ */
var CFG = {
  APP: 'MMH CRM · Thailand Surgical',
  TEAM: 'Thailand Surgical',
  TEAM_LABEL: 'Thailand Surgical Sales Team',
  SH_CUST: '1. CUSTOMER CODE', SH_CBC: '2. CBC', SH_MON: '5. MONTHLY REPORT', SH_WK: '6. CUSTOMER VISITING',
  SH_PRES: '7. PRODUCT PRESENTATION', SH_ADP: '8. ADP', SH_KPI: '9. TARGET & KPI', SH_MASTER: '10. MASTER LIST',
  SH_CODE: '11. CODE MAP', SH_LOG: '_LOG', SH_ALL: 'ALL TASK',
  HDR: 3, DATA: 4, AT_HDR: 5, AT_DATA: 7,
  VS_TYPE: 'Sales-Thailand Surgical', VS_SUFFIX: '_Thailand Surgical Customer visiting', VS_KEY_PIC: 'Dao',
  CACHE_TTL: 21600
};
var MAIL_HA = 'nt.ha@manimedicalhanoi.com', MAIL_HOA = 'vtt.hoa@manimedicalhanoi.com';
var USERS = {
  'Dao':       { email: 'manithailand@manimedicalhanoi.com',  title: 'Thailand Surgical Team Leader', role: 'lead',  team: CFG.TEAM_LABEL },
  'Miew':      { email: 'manithailand4@manimedicalhanoi.com', title: 'Thailand Surgical Sales PIC', role: 'pic',     team: CFG.TEAM_LABEL },
  'Nguyen Ha': { email: 'nt.ha@manimedicalhanoi.com',         title: 'Director',                    role: 'manager', team: 'Management' },
  'Tuyen':     { email: 'tt.tuyen@manimedicalhanoi.com',      title: 'Head of Sales & Marketing VN', role: 'manager', team: 'Management' },
  'Hoa':       { email: 'vtt.hoa@manimedicalhanoi.com',       title: 'Human Resources',             role: 'manager', team: 'Management' },
  'Giang':     { email: 'mmh.product@manimedicalhanoi.com',   title: 'Product Team Leader',         role: 'manager', team: 'Management' }
};
var TEAM_PICS = ['Dao', 'Miew'];
/* v1.9 — new accounts & new SKU: evidence folder and approvers (To of the approval e-mail) */
var NA_FOLDER_TH = '1NpZkyMi-cIe_2FLHO9_2WsX_DiCFLYDf';
var NA_APPROVERS_TH = { 'Dao':['Tuyen'], '*':['Dao','Tuyen'] };
var NA_ADMINS = ['Nguyen Ha','Tuyen','Hoa','Giang'];
var NA_DECIDERS = ['Nguyen Ha','Tuyen'];
var WRITE_ACTIONS = { weeklyReport:1, monthlyReport:1, tripPropose2:1, saveWeekly:1, saveCustomer:1, saveCBC:1, saveCustomerCbc:1, saveMonthly:1, savePresentation:1, saveADP:1,
                      deleteRow:1, deleteAccount:1, addKey:1, addSub:1, naSave:1, naSubmit:1, naDecide:1, naDelete:1 };
/* who receives the weekly / monthly report of each PIC */
function mailRule_(pic){
  /* v1.16 — weekly & monthly reports ALWAYS CC Dao (Thailand team leader) */
  return { to: [MAIL_HA], cc: [USERS.Dao.email, MAIL_HOA] };
}

/* ══════════════ TAB DEFINITIONS (column B = offset 0) ══════════════ */
var TABS = {
  customer: { sh: CFG.SH_CUST, w: 13, key: ['name'], dates: ['openDate'], formula: ['code', 'openMonth', 'nCbc', 'check'],
    f: ['code','name','type','address','province','area','pic','fy','openDate','openMonth','nCbc','check','note'] },
  cbc: { sh: CFG.SH_CBC, w: 21, key: ['contact', 'name'], dates: [], formula: ['code','cbcCode','cbcNo','lookup','rowKey'],
    f: ['code','cbcCode','type','name','address','province','area','pic','cbcNo','contact','phone','jobTitle','specialize',
        'role','influence','trust','note','log','_t','lookup','rowKey'] },
  monthly: { sh: CFG.SH_MON, w: 8, key: ['typeTask', 'plan', 'result'], dates: [], formula: [], no: true,
    f: ['no','typeTask','pic','area','fy','period','plan','result'] },
  weekly: { sh: CFG.SH_WK, w: 22, key: ['account', 'plan', 'result'], dates: ['start', 'finish'], formula: ['_type','_prov','_area'], no: true,
    f: ['no','fy','month','start','finish','pic','account','_type','_prov','_area','product','typeTask','typeAction','process',
        'plan','result','status','feedback','nextAction','stopReason','photo','gps'] },
  present: { sh: CFG.SH_PRES, w: 12, key: ['account'], dates: ['day'], formula: [], no: true,
    f: ['no','account','pic','province','area','fy','month','day','folder','review','target','actual'] },
  adp: { sh: CFG.SH_ADP, w: 31, key: ['account'], dates: ['created', 'updated'], formula: [], no: true,
    f: ['no','account','pic','fy','abcd','caseInfo','analysis','objective','tactic','keyAction','targetAmt','actualAmt',
        'm09','m10','m11','rQ1','m12','m01','m02','rQ2','m03','m04','m05','rQ3','m06','m07','m08','rQ4','rFY','created','updated'] }
};
var TAB_LABEL = { weekly: '6. CUSTOMER VISITING', cbc: '2. CBC', customer: '1. CUSTOMER CODE', monthly: '5. MONTHLY REPORT',
                  present: '7. PRODUCT PRESENTATION', adp: '8. ADP', kpi: '9. TARGET & KPI', alltask: 'ALL TASK', report: 'Report',
                  meet: '20. WEEKLY MEETING', tender: '21. TENDER TRACK' };
/* sheet → version key (edits made directly in the sheet) */
var SHEET_VER = {};
SHEET_VER[CFG.SH_CUST] = 'customer'; SHEET_VER[CFG.SH_CBC] = 'cbc'; SHEET_VER[CFG.SH_MON] = 'monthly';
SHEET_VER[CFG.SH_WK] = 'weekly'; SHEET_VER[CFG.SH_PRES] = 'present'; SHEET_VER[CFG.SH_ADP] = 'adp';
SHEET_VER[CFG.SH_KPI] = 'kpi'; SHEET_VER[CFG.SH_MASTER] = 'master'; SHEET_VER[CFG.SH_CODE] = 'customer';
SHEET_VER[CFG.SH_ALL] = 'alltask'; SHEET_VER[CFG.SH_LOG] = 'log';
var VER_KEYS = ['weekly','cbc','order','monthly','present','adp','customer','master','kpi','pcode','alltask','log'];

/* ══════════════ SMALL HELPERS ══════════════ */
var _SS = null, _SH = {};
function ss_(){ return _SS || (_SS = SpreadsheetApp.getActiveSpreadsheet()); }
function sh_(name){
  if(_SH[name]) return _SH[name];
  var s = ss_().getSheetByName(name);
  if(!s) throw new Error('Sheet "' + name + '" not found in ' + ss_().getName());
  return (_SH[name] = s);
}
function tz_(){ try{ return ss_().getSpreadsheetTimeZone() || 'Asia/Bangkok'; }catch(e){ return 'Asia/Bangkok'; } }
function str_(v){ return v == null ? '' : String(v).trim(); }
function num_(v){ if(v === '' || v == null) return 0; if(typeof v === 'number') return isFinite(v) ? v : 0;
  var x = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(x) ? 0 : x; }
function iso_(v){
  if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  var s = str_(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(m) return m[0];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function date_(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function ymOf_(isoStr){ var m = /^(\d{4})-(\d{2})/.exec(String(isoStr || '')); return m ? m[1] + m[2] : ''; }
function fyOfYm_(ym){ ym = String(ym || '').replace(/\D/g, ''); if(ym.length < 6) return '';
  var y = +ym.slice(0, 4), mm = +ym.slice(4, 6); return 'FY' + ((mm >= 9 ? y : y - 1) - 1958); }
function fyMonths_(fy){ var k = parseInt(String(fy).replace(/\D/g, ''), 10), y = 1958 + k, o = [];
  [9,10,11,12].forEach(function(m){ o.push(String(y * 100 + m)); });
  [1,2,3,4,5,6,7,8].forEach(function(m){ o.push(String((y + 1) * 100 + m)); }); return o; }
function todayIso_(){ return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function fyToday_(){ return fyOfYm_(ymOf_(todayIso_())); }
function dmy_(isoStr){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoStr || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function picKey_(s){ return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function picEq_(a, b){ var x = picKey_(a), y = picKey_(b); return !!x && x === y; }
function parseAcc_(s){ var a = String(s || '').split('/');
  return { name: str_(a[0]), type: str_(a[1]), province: str_(a[2]), area: str_(a[3]) }; }
function esc_(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function nl2br_(s){ return esc_(s).replace(/\n/g, '<br>'); }
function isMgr_(pic){ var u = USERS[pic]; return !!(u && (u.role === 'manager' || u.role === 'lead')); }   /* v1.4 — lead = Dao */
function userOf_(pic){ return USERS[pic] || null; }

/* ══════════════ VERSION + CACHE ══════════════ */
function props_(){ return PropertiesService.getScriptProperties(); }
function vers_(){
  var p = {}; try{ p = props_().getProperties() || {}; }catch(e){}
  var o = {}; VER_KEYS.forEach(function(k){ o[k] = p['ver_' + k] || '1'; });
  o._all = VER_KEYS.map(function(k){ return o[k]; }).join('.');
  return o;
}
function bump_(keys){
  var now = String(Date.now()), m = {};
  (keys || VER_KEYS).forEach(function(k){ m['ver_' + k] = now + Math.floor(Math.random() * 1000); });
  try{ props_().setProperties(m); }catch(e){}
}
function verOf_(deps){ var v = vers_(); return deps.map(function(k){ return v[k]; }).join('.'); }
function cPut_(key, obj){
  try{
    var s = JSON.stringify(obj), c = CacheService.getScriptCache(), CH = 90000, n = Math.ceil(s.length / CH) || 1, m = {};
    if(n > 90) return;
    for(var i = 0; i < n; i++) m[key + '_' + i] = s.substr(i * CH, CH);
    m[key + '_n'] = String(n);
    c.putAll(m, CFG.CACHE_TTL);
  }catch(e){}
}
function cGet_(key){
  try{
    var c = CacheService.getScriptCache(), n = parseInt(c.get(key + '_n'), 10);
    if(!n) return null;
    var ks = []; for(var i = 0; i < n; i++) ks.push(key + '_' + i);
    var all = c.getAll(ks), s = '';
    for(var j = 0; j < n; j++){ var part = all[key + '_' + j]; if(part == null) return null; s += part; }
    return JSON.parse(s);
  }catch(e){ return null; }
}
/* read-through cache keyed by the versions of the tabs the answer depends on */
function cached_(name, deps, fn){
  var ver = verOf_(deps), key = 'c_' + name + '_' + Utilities.base64EncodeWebSafe(ver).slice(0, 60);
  var hit = cGet_(key); if(hit) return hit;
  var out = fn(); cPut_(key, out); return out;
}

/* ══════════════ READ SHEETS ══════════════ */
var _TAB = {};
function readTab_(k){
  if(_TAB[k]) return _TAB[k];
  var d = TABS[k], s = sh_(d.sh), last = s.getLastRow(), out = [];
  if(last >= CFG.DATA){
    var vals = s.getRange(CFG.DATA, 2, last - CFG.DATA + 1, d.w).getValues();
    for(var i = 0; i < vals.length; i++){
      var r = vals[i], o = { _row: CFG.DATA + i };
      for(var j = 0; j < d.f.length; j++){
        var f = d.f[j], v = r[j];
        o[f] = (d.dates.indexOf(f) >= 0) ? iso_(v) : (v instanceof Date ? iso_(v) : (v == null ? '' : v));
      }
      var has = d.key.some(function(f){ return str_(o[f]) !== ''; });
      if(!has) continue;
      out.push(o);
    }
  }
  _TAB[k] = out; return out;
}
function dataLastRow_(k){
  var rows = readTab_(k); return rows.length ? rows[rows.length - 1]._row : CFG.DATA - 1;
}
/* customer index (with CBC count computed here — never trust a formula that may not be calculated yet) */
function customers_(){
  var cbcN = {};
  readTab_('cbc').forEach(function(b){ var k = picKey_(b.name); if(k && str_(b.contact)) cbcN[k] = (cbcN[k] || 0) + 1; });
  return readTab_('customer').map(function(c){
    var code = str_(c.code) || custCodeCalc_(c);
    return { _row: c._row, code: code, name: str_(c.name), type: str_(c.type), address: str_(c.address),
      province: str_(c.province), area: str_(c.area), pic: str_(c.pic), fy: str_(c.fy), openDate: c.openDate,
      month: str_(c.openMonth).replace(/\D/g, '').slice(0, 6) || ymOf_(c.openDate), nCbc: cbcN[picKey_(c.name)] || 0, nOrder: 0, note: str_(c.note) };
  });
}
/* same rule as the formula in column B of 1. CUSTOMER CODE */
var _CODEMAP = null;
function codeMap_(){
  if(_CODEMAP) return _CODEMAP;
  var s = sh_(CFG.SH_CODE), last = Math.max(4, s.getLastRow()), v = s.getRange(4, 2, last - 3, 8).getValues(), m = { a: {}, p: {}, t: {} };
  v.forEach(function(r){ if(r[0]) m.a[picKey_(r[0])] = str_(r[1]); if(r[3]) m.p[picKey_(r[3])] = str_(r[4]); if(r[6]) m.t[picKey_(r[6])] = str_(r[7]); });
  return (_CODEMAP = m);
}
function custCodeCalc_(c){
  if(!str_(c.name)) return '';
  var m = codeMap_();
  return (m.a[picKey_(c.area)] || '?') + (m.p[picKey_(c.province)] || '??') + '-' + (m.t[picKey_(c.type)] || 'OT') +
         ('0000' + (c._row - 3)).slice(-4);
}
function cbcRows_(){
  var cus = {}; customers_().forEach(function(c){ cus[picKey_(c.name)] = c; });
  var cnt = {};
  return readTab_('cbc').filter(function(b){ return str_(b.contact) || str_(b.name); }).map(function(b){
    var c = cus[picKey_(b.name)] || {}, code = str_(b.code) || c.code || '';
    cnt[code] = (cnt[code] || 0) + 1;
    return { _row: b._row, code: code, cbcCode: str_(b.cbcCode) || (code ? code + '-PIC' + cnt[code] : ''),
      cbcNo: str_(b.cbcNo) || (code ? cnt[code] : ''), type: str_(b.type), name: str_(b.name), address: str_(b.address),
      province: str_(b.province), area: str_(b.area), pic: str_(b.pic), contact: str_(b.contact), phone: str_(b.phone),
      jobTitle: str_(b.jobTitle), specialize: str_(b.specialize), role: str_(b.role), influence: str_(b.influence),
      trust: str_(b.trust), note: str_(b.note), log: str_(b.log) };
  });
}
function weeklyRows_(){
  return readTab_('weekly').map(function(w){
    var a = parseAcc_(w.account), start = w.start, month = str_(w.month).replace(/\D/g, '') || ymOf_(start);
    return { _row: w._row, no: w.no, fy: str_(w.fy) || fyOfYm_(ymOf_(start)), month: month,
      start: start, finish: w.finish || start, pic: str_(w.pic), account: str_(w.account),
      accName: a.name, accType: a.type, accProv: a.province, type: a.type, province: a.province, area: a.area,
      product: str_(w.product), typeTask: str_(w.typeTask), typeAction: str_(w.typeAction), process: str_(w.process),
      plan: str_(w.plan), result: str_(w.result), status: str_(w.status), feedback: str_(w.feedback),
      nextAction: str_(w.nextAction), stopReason: str_(w.stopReason), photo: '', gps: '', gpsAddr: '' };
  });
}
function monthlyRows_(){
  return readTab_('monthly').map(function(r){
    var per = str_(r.period).replace(/\D/g, '').slice(0, 6);
    return { _row: r._row, no: r.no, typeTask: str_(r.typeTask), pic: str_(r.pic), area: str_(r.area),
      fy: str_(r.fy) || fyOfYm_(per), period: per, month: per, plan: str_(r.plan), result: str_(r.result) };
  });
}
function presentRows_(){
  return readTab_('present').map(function(r){
    var m = str_(r.month).replace(/\D/g, '') || ymOf_(r.day);
    return { _row: r._row, no: r.no, account: str_(r.account), pic: str_(r.pic), province: str_(r.province), area: str_(r.area),
      fy: str_(r.fy) || fyOfYm_(m), month: m, day: r.day, folder: str_(r.folder), review: str_(r.review),
      target: r.target, actual: r.actual };
  });
}
function adpRows_(){
  return readTab_('adp').map(function(r){
    var o = {}; TABS.adp.f.forEach(function(f){ o[f] = (r[f] instanceof Date) ? iso_(r[f]) : r[f]; });
    o._row = r._row; o.fy = str_(r.fy); o.pic = str_(r.pic); o.account = str_(r.account); return o;
  });
}
function rowsOf_(tab){
  switch(tab){
    case 'weekly': return weeklyRows_();
    case 'cbc': return cbcRows_();
    case 'monthly': return monthlyRows_();
    case 'present': return presentRows_();
    case 'adp': return adpRows_();
    case 'customer': return customers_();
    case 'order': return [];
  }
  throw new Error('Unknown tab: ' + tab);
}
var TAB_DEPS = { weekly: ['weekly'], cbc: ['cbc', 'customer'], monthly: ['monthly'], present: ['present'], adp: ['adp'],
                 customer: ['customer', 'cbc'], order: ['order'] };
function filterRows_(tab, rows, fy, pic){
  return rows.filter(function(r){
    if(fy && tab !== 'cbc' && tab !== 'customer' && r.fy && String(r.fy) !== String(fy)) return false;
    if(pic && tab !== 'cbc' && tab !== 'customer' && r.pic && !picEq_(r.pic, pic)) return false;
    return true;
  });
}
function lean_(rows){
  if(!rows.length) return { cols: [], lean: [] };
  var cols = {}; rows.forEach(function(r){ for(var k in r) cols[k] = 1; });
  var C = Object.keys(cols);
  return { cols: C, lean: rows.map(function(r){ return C.map(function(c){ return r[c] === undefined ? '' : r[c]; }); }) };
}

/* ══════════════ MASTER / BUNDLE ══════════════ */
var MASTER_MAP = { 'pic': 'pic', 'account type': 'accountType', 'type task': 'typeTask', 'type action': 'typeAction',
  'sales process': 'process', 'task status': 'status', 'customer feedback': 'feedback', 'product group': 'product',
  'area': 'area', 'fy': 'fy', 'abcd focus': 'abcd', 'job title': 'jobTitle', 'role': 'role', 'influence': 'influence',
  'influence / trust': 'influence', 'trust': 'trust', 'customer journey': 'journey', 'partner type': 'partnerType',
  'channel': 'channel', 'province': 'province', 'month (yyyymm)': 'month', 'next action': 'nextAction', 'all task status': 'taskStatus' };
function master_(){
  var s = sh_(CFG.SH_MASTER), lc = s.getLastColumn(), lr = s.getLastRow();
  var v = s.getRange(3, 1, Math.max(1, lr - 2), lc).getValues(), m = {};
  for(var c = 0; c < lc; c++){
    var k = MASTER_MAP[picKey_(v[0][c])]; if(!k) continue;
    var list = []; for(var r = 1; r < v.length; r++){ var x = v[r][c]; if(x === '' || x == null) continue; list.push(String(x).trim()); }
    m[k] = list;
  }
  /* PIC list of the team always first */
  var pics = TEAM_PICS.slice(); (m.pic || []).forEach(function(p){ if(pics.indexOf(p) < 0 && !/^others?$/i.test(p)) pics.push(p); });
  m.pic = pics;
  return m;
}
function picList_(){
  return Object.keys(USERS).map(function(p){ var u = USERS[p];
    return { pic: p, email: u.email, title: u.title, role: u.role, team: u.team, initials: p.split(/\s+/).map(function(x){ return x[0]; }).join('').slice(0, 2).toUpperCase() }; });
}
function bundle_(p){
  var fyC = fyToday_();
  return cached_('bundle', ['customer', 'cbc', 'master', 'kpi', 'weekly', 'present', 'log'], function(){
    var m = master_();
    var fyList = (m.fy || []).slice(); [fyC].forEach(function(f){ if(fyList.indexOf(f) < 0) fyList.push(f); });
    fyList.sort().reverse();
    var cus = customers_(), C = ['_row','code','name','type','address','province','area','pic','fy','openDate','month','nCbc','nOrder','note'];
    return { ok: true, picList: picList_(), master: m, driveFolder: '', fyCurrent: fyC, fyList: fyList,
      cidxCols: C, cidx: cus.map(function(c){ return C.map(function(k){ return c[k]; }); }),
      dash: null, kpi: kpi_(fyC), activity: activity_(80), ver: vers_()._all, team: CFG.TEAM };
  });
}

/* ══════════════ KPI (sheet 9. TARGET & KPI) — ⭐ v1.2: per the MMH KPI FY68 file ══════════════
 * The sheet is built by menu "⑤ Rebuild the KPI tab from the KPI FY68 file" (module KPI FY68 at the end of this file):
 *   one row = one KPI code of one PIC (F1-00, C11-01a, C4-02…), monthly targets from the KPI FY68 file,
 *   actuals are formulas on 1. CUSTOMER CODE · 6. CUSTOMER VISITING · 7. PRODUCT PRESENTATION.
 * The app only READS the calculated sheet. */
var MON_LB = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
function kpi_(fy){
  fy = fy || fyToday_();
  var base = { ok: true, v68: true, fy: fy, prevFY: 'FY' + (parseInt(fy.replace(/\D/g, ''), 10) - 1), months: fyMonths_(fy).map(String), monthLabels: MON_LB,
    quarters: [{ name: 'Q1' }, { name: 'Q2' }, { name: 'Q3' }, { name: 'Q4' }], groups: [], pics: [], blocks: [], partA: [], settings: {} };
  var s = ss_().getSheetByName(CFG.SH_KPI), R = s ? k68Read_(s) : null;
  if(!R){ base.notBuilt = true; return base; }
  base.sheetFy = R.fy; base.settings = R.settings;
  if(R.fy && R.fy !== fy){ base.otherFy = true; return base; }
  base.months = R.months; base.groups = R.groups; base.pics = R.pics; base.blocks = k68Legacy_(R);
  return base;
}
function saveKpiTarget_(user, p){
  throw new Error('FY68 targets come from the MMH KPI FY68 file — edit them there and press "⟳ Sync KPI FY68 file", or edit the yellow cells of sheet ' + CFG.SH_KPI + '.');
}
function kpiSync_(user, p){
  if(!isMgr_(user.pic) && picKey_(user.pic) !== 'dao') throw new Error('Only managers / the team leader can sync the KPI file.');
  var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) throw new Error('Sheet ' + CFG.SH_KPI + ' not found');
  var r = k68SyncFix_(s, true); if(!r.ok) return r;
  bump_(['kpi']); log_(user.pic, 'kpi', 'kpi', 'Sync KPI FY68 file', r.message, '');
  r.kpi = kpi_(str_(p.fy) || fyToday_());
  return r;
}
/* register this file with the master KPI file + sync once (opens the master file directly — no new permission) */
function kpiLinkAndSync_(){
  var out = { reg: '', sync: null }, s = ss_().getSheetByName(CFG.SH_KPI);
  try{
    var A = k68LinkAdapter_(s ? s.getRange(K68_SET.link).getValue() : '');
    k68Register_(A.ss, ss_(), CFG.SH_KPI, 'thai', 'en');
    out.reg = 'This file is registered in the master KPI file (sheet _CRM_LINKS) ⇒ the KPI Hub syncs it every 5 minutes.';
    if(s){ out.sync = k68Sync_(s, 'en', 'thai', { manual: true, adapter: A }); if(out.sync.ok) bump_(['kpi']); }
  }catch(e){
    out.reg = '⚠️ This file cannot open the master KPI file yet (' + e.message + ').\nNo problem — once: open the master KPI file ▸ sheet "_CRM_LINKS" ▸ paste the link below in column B of row "thai":\n' + ss_().getUrl() +
              '\nthen menu MMH KPI Hub ▸ ⑦ Automatic sync.';
  }
  return out;
}
function setupKpiFY68(){
  var ui = null; try{ ui = SpreadsheetApp.getUi(); }catch(e){}
  if(ui){
    var a = ui.alert('Rebuild the KPI tab (FY68)', 'Sheet "' + CFG.SH_KPI + '" will be rebuilt per the MMH KPI FY68 file (KPI codes, 12 monthly targets, actual formulas).\n\n' +
      '· An old-layout KPI sheet is renamed "9. OLD KPI (before FY68)" and hidden — nothing is lost.\n' +
      '· If the sheet is already in the FY68 layout, typed cells (targets, turnover, new SKU, quarter review, settings) are kept.\n\nContinue?', ui.ButtonSet.OK_CANCEL);
    if(a !== ui.Button.OK) return;
  }
  var r = k68Setup_(ss_(), CFG.SH_KPI, 'thai'); _SH = {}; SpreadsheetApp.flush();
  bump_(['kpi']);
  var L = kpiLinkAndSync_();
  var msg = 'Sheet "' + CFG.SH_KPI + '" built: ' + r.rows + ' KPI rows.' + (r.kept ? '\nTyped cells of the previous table were kept.' : '') + '\n\n' + L.reg +
    (L.sync ? '\nFirst sync: ' + (L.sync.ok ? L.sync.message : L.sync.error) : '');
  if(ui) ui.alert(msg);
  return msg;
}
function syncKpiFY68(){
  var L = kpiLinkAndSync_();
  var msg = L.sync ? (L.sync.ok ? 'Synced with the master KPI file.\n\n' + L.sync.message : 'Not synced:\n' + L.sync.error) : L.reg;
  if(L.sync && L.sync.ok) msg += '\n\n' + L.reg;
  try{ SpreadsheetApp.getUi().alert(msg); }catch(e){}
  return L.sync || { ok: false, error: L.reg };
}
function kpiDailySync(){
  var lock = LockService.getScriptLock(); if(!lock.tryLock(5000)) return;
  try{ var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) return; var r = k68Sync_(s, 'en', 'thai'); if(r.ok && (r.targets || r.pulled)) bump_(['kpi']); }
  catch(e){} finally{ lock.releaseLock(); }
}
function installKpiDailySync(){ return syncKpiFY68(); }
function authorizeKpiSync(){ return syncKpiFY68(); }
function syncKpiFY68_silent_(){ var s = ss_().getSheetByName(CFG.SH_KPI); return s ? k68Sync_(s, 'en', 'thai', { manual: true }) : null; }
/* v1.8 — REAL TIME: app actions that change the KPI numbers of tab 9 ⇒ push them to the KPI file at once */
var K68_PUSH_ACTIONS = { saveWeekly: 1, saveCustomer: 1, saveCBC: 1, saveCustomerCbc: 1, savePresentation: 1, deleteRow: 1, deleteAccount: 1 };
/* v1.12 — late-entry window for a closed month (managers / team leader) */
function kpiLate_(user, p){
  var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) return { ok: false, error: 'No KPI tab' };
  var M = k68Master_(s.getRange(K68_SET.link).getValue());
  if(str_(p.set) === '1'){
    if(!isMgr_(user.pic) && picKey_(user.pic) !== 'dao') return { ok: false, error: 'Only managers / the team leader can open a closed month.' };
    var m = str_(p.month).replace(/\D/g, '').slice(0, 6), u = str_(p.until).slice(0, 10);
    if(m && !/^\d{4}-\d{2}-\d{2}$/.test(u)) return { ok: false, error: 'Deadline (yyyy-mm-dd)?' };
    kh_setLate_(M.ss, m, m ? u : '');
    var push = k68PushQuick_();
    return { ok: true, late: { month: m, until: m ? u : '' }, kpiPush: push, message: m ? 'Late entries for ' + m + ' accepted until ' + u + ' — KPI pushed again' : 'Late-entry window closed' };
  }
  var lo = kh_late_(M.ss);
  return { ok: true, late: { month: lo.month, until: lo.until, open: lo.month ? kh_isOpen_(M.ss, lo.month) : false }, kpiFile: M.ss.getName() };
}
/* v1.10 — rewrite closed months once for the codes whose rule changed (C2-03) */
var _K68_FORCE = null;
function k68Forced_(code){ return !!(_K68_FORCE && _K68_FORCE[code]); }
function k68ForceCodes_(){ var o = {}; ((K68_SPEC.thai || {}).pics || []).forEach(function(p){ p.rows.forEach(function(r){ if(/^newacct_/.test(r.key)) o[r.code] = 1; }); }); return o; }
function k68SyncFix_(s, manual){
  var P = PropertiesService.getScriptProperties(), fix = !P.getProperty('K68_FIX102'), r;
  if(fix) _K68_FORCE = k68ForceCodes_();
  try{ r = k68Sync_(s, 'en', 'thai', manual ? { manual: true } : {});
       if(r.ok && !r.mode){ SpreadsheetApp.flush(); s = ss_().getSheetByName(CFG.SH_KPI); r = k68Sync_(s, 'en', 'thai', manual ? { manual: true } : {}); } }
  finally{ _K68_FORCE = null; }
  if(fix && r.ok && r.mode) try{ P.setProperty('K68_FIX102', Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + ' · ' + (r.cells || 0) + ' cells'); }catch(e){}
  return r;
}
function k68FixLockedV10(){ var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) return 'No KPI tab'; PropertiesService.getScriptProperties().deleteProperty('K68_FIX102'); var r = k68SyncFix_(s, true);
  var msg = r.ok ? 'Closed months of C2-03 rewritten with the new rule.\n' + r.message : 'Sync failed: ' + r.error; try{ SpreadsheetApp.getUi().alert(msg); }catch(e){} return msg; }
function k68PushQuick_(){
  try{
    var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) return { ok: false, error: 'No KPI tab' };
    var lock = LockService.getScriptLock();
    if(!lock.tryLock(5000)) return { ok: false, error: 'Another sync is running, the KPI file updates within about 1 minute' };
    try{
      SpreadsheetApp.flush();
      var r = k68SyncFix_(s, false);
      if(r.ok && (r.targets || r.pulled || r.cells)) bump_(['kpi']);   /* v1.14 — app reloads the KPI at once */
      try{ krBust_(); }catch(eB){}
      return { ok: !!r.ok, pushed: r.pushed || 0, cells: r.cells || 0, locked: r.locked || 0, lockedMonths: r.lockedMonths || [], late: r.late || null,
               error: r.error || r.error2 || '', at: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'HH:mm:ss') };
    }finally{ lock.releaseLock(); }
  }catch(e){ return { ok: false, error: String(e && e.message || e) }; }
}

/* ══════════════ ACTIVITY LOG ══════════════ */
function log_(pic, action, tab, target, detail, row){
  try{ sh_(CFG.SH_LOG).appendRow([new Date(), pic || '', action || '', TAB_LABEL[tab] || tab || '', String(target || '').slice(0, 200), String(detail || '').slice(0, 400), row || '']); bump_(['log']); }catch(e){}
}
function activity_(limit){
  var s = sh_(CFG.SH_LOG), last = s.getLastRow(); if(last < 2) return [];
  var n = Math.min(limit || 120, last - 1), v = s.getRange(last - n + 1, 1, n, 7).getValues(), out = [];
  for(var i = v.length - 1; i >= 0; i--){
    var r = v[i]; if(!r[0] && !r[1]) continue;
    out.push({ time: (r[0] instanceof Date) ? Utilities.formatDate(r[0], tz_(), "yyyy-MM-dd'T'HH:mm:ss") : str_(r[0]),
      pic: str_(r[1]), action: str_(r[2]), tab: str_(r[3]), target: str_(r[4]), detail: str_(r[5]), row: r[6] });
  }
  return out;
}

/* ══════════════ WRITE ROWS ══════════════ */
function lock_(){ var l = LockService.getScriptLock(); if(!l.tryLock(25000)) throw new Error('The system is busy — please try again in a few seconds.'); return l; }
function firstFree_(k){
  var d = TABS[k], s = sh_(d.sh), row = dataLastRow_(k) + 1;
  if(row > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), row - s.getMaxRows() + 20);
  return row;
}
/* copy the formula of the nearest row above into an empty formula cell (row added beyond the prepared area) */
function fixFormulas_(k, row){
  var d = TABS[k]; if(!d.formula.length) return;
  var s = sh_(d.sh);
  d.formula.forEach(function(f){
    var col = 2 + d.f.indexOf(f), cell = s.getRange(row, col);
    if(cell.getFormula() && !fmlBadTxt_(cell.getDisplayValue())) return;
    fmlPut_(s, col, row, CFG.DATA, '');                                   /* v1.4 — copy from a healthy row */
  });
}
var _DIFF = [];
function writeRow_(k, row, data, isNew){
  _DIFF = [];
  var d = TABS[k], s = sh_(d.sh), cur = s.getRange(row, 2, 1, d.w).getValues()[0];
  var segs = [], seg = null;
  for(var j = 0; j < d.w; j++){
    var f = d.f[j];
    var writable = d.formula.indexOf(f) < 0 && f.charAt(0) !== '_';
    if(!writable){ seg = null; continue; }
    var v = cur[j];
    if(Object.prototype.hasOwnProperty.call(data, f)){
      v = data[f];
      if(d.dates.indexOf(f) >= 0) v = date_(iso_(v)) || '';
      else if(v == null) v = '';
      var _a = cur[j], _b = v; if(_a instanceof Date) _a = _a.getTime(); if(_b instanceof Date) _b = _b.getTime();
      if(!isNew && f !== 'log' && String(_a == null ? '' : _a) !== String(_b == null ? '' : _b)) _DIFF.push(f);   /* v1.5 */
    }
    if(!seg){ seg = { c: j, v: [] }; segs.push(seg); }
    seg.v.push(v);
  }
  segs.forEach(function(g){ s.getRange(row, 2 + g.c, 1, g.v.length).setValues([g.v]); });
  if(isNew) fixFormulas_(k, row);
  delete _TAB[k];
}
function nextNo_(k){ var mx = 0; readTab_(k).forEach(function(r){ var v = parseInt(r.no, 10); if(v > mx) mx = v; }); return mx + 1; }
function checkRow_(k, row){
  row = parseInt(row, 10);
  var hit = readTab_(k).filter(function(r){ return r._row === row; })[0];
  if(!hit) throw new Error('Row ' + row + ' no longer exists in ' + TABS[k].sh + ' — reload the app and try again.');
  return hit;
}
function canEdit_(user, pic){ return isMgr_(user.pic) || !str_(pic) || picEq_(pic, user.pic); }

/* ── 6. CUSTOMER VISITING ── */
function saveWeekly_(user, p){
  var d = p.data; if(typeof d === 'string') d = JSON.parse(d);
  var row = parseInt(d._row, 10) || 0, isNew = !row, out = {};
  var L = lock_();
  try{
    var cur = null;
    if(!isNew){ cur = checkRow_('weekly', row); if(!canEdit_(user, cur.pic)) throw new Error('Only ' + cur.pic + ' (or a manager) can edit this task.'); }
    var start = iso_(d.start || (cur && cur.start) || '');
    if(isNew){
      if(!str_(d.account)) throw new Error('Account is required');
      if(!start) throw new Error('Date is required');
      if(!str_(d.pic)) d.pic = user.pic;
      /* one TBD row per PIC per week */
      if(/^tbd$/i.test(parseAcc_(d.account).name)){
        var mon = mondayIso_(start), dup = weeklyRows_().filter(function(w){ return /^tbd$/i.test(w.accName) && picEq_(w.pic, d.pic) && mondayIso_(w.start) === mon; })[0];
        if(dup) throw new Error('Week ' + dmy_(mon) + ' already has a TBD field-visit plan for ' + d.pic + ' (row ' + dup._row + ').');
      }
      row = firstFree_('weekly'); d.no = nextNo_('weekly');
    }
    if(start){ d.start = start; d.month = Number(ymOf_(start)); d.fy = fyOfYm_(ymOf_(start)); }
    if(d.finish) d.finish = iso_(d.finish); else if(isNew) d.finish = start;
    var rErr = wkApplyRule_(d, cur, 'en');                                  /* v1.16 */
    if(rErr) throw new Error(rErr);
    delete d.photo; delete d.gps;
    writeRow_('weekly', row, d, isNew);
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_(['weekly']);
  log_(user.pic, isNew ? 'add' : 'update', 'weekly', parseAcc_(d.account || '').name || ('row ' + row), (d.typeAction || '') + (d.status ? ' · ' + d.status : ''), row);
  try{ out.sync = vsSync_(false); }catch(e){ out.syncError = e.message; }
  out.ok = true; out.row = row; out.message = isNew ? 'Task added to sheet 6. CUSTOMER VISITING' : 'Task updated';
  return out;
}
function mondayIso_(isoStr){ var d = date_(isoStr); if(!d) return ''; var w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso_(d); }

/* ── 1. CUSTOMER CODE / 2. CBC ── */
function saveCustomer_(user, p){
  var d = p.data; if(typeof d === 'string') d = JSON.parse(d);
  return saveCustomerRow_(user, d);
}
function saveCustomerRow_(user, d){
  var row = parseInt(d._row, 10) || 0, isNew = !row;
  if(!str_(d.name) || !str_(d.type)) throw new Error('Account name and Account type are required');
  var L = lock_();
  try{
    if(isNew){
      var dup = customers_().filter(function(c){ return picKey_(c.name) === picKey_(d.name); })[0];
      if(dup) throw new Error('“' + dup.name + '” already exists (code ' + dup.code + ').');
      row = firstFree_('customer');
      if(!str_(d.pic)) d.pic = user.pic;
      if(!str_(d.fy)) d.fy = fyToday_();
      if(!str_(d.openDate)) d.openDate = todayIso_();            /* opening date → KPI "new accounts" */
    }
    var w = { name: d.name, type: d.type, address: d.address, province: d.province, area: d.area, pic: d.pic, fy: d.fy,
              openDate: d.openDate, note: d.note };
    Object.keys(w).forEach(function(k){ if(w[k] === undefined) delete w[k]; });
    writeRow_('customer', row, w, isNew); var _diffC = _DIFF.slice();
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_(['customer']);
  var c = customers_().filter(function(x){ return x._row === row; })[0] || {};
  log_(user.pic, isNew ? 'add' : 'update', 'customer', d.name, c.code || '', row);
  if(isNew || _diffC.length) custLog_(user.pic, isNew ? 'add' : 'update', 'customer', { code: c.code || '', name: c.name || d.name }, _diffC, row, '');   /* v1.5 */
  return { ok: true, row: row, code: c.code || '', customer: c, message: (isNew ? 'Account added: ' : 'Account updated: ') + d.name + (c.code ? ' (' + c.code + ')' : '') };
}
function saveCBC_(user, p){
  var d = p.data; if(typeof d === 'string') d = JSON.parse(d);
  var r = saveCbcRow_(user, d); return r;
}
function saveCbcRow_(user, d){
  var row = parseInt(d._row, 10) || 0, isNew = !row;
  if(!str_(d.contact)) throw new Error('Contact name is required');
  var cus = null;
  if(str_(d.code)) cus = customers_().filter(function(c){ return c.code === str_(d.code); })[0];
  if(!cus && str_(d.name)) cus = customers_().filter(function(c){ return picKey_(c.name) === picKey_(d.name); })[0];
  if(!cus && isNew) throw new Error('Account not found in 1. CUSTOMER CODE — add the account first.');
  var L = lock_();
  try{
    if(isNew){
      row = firstFree_('cbc');
      d.log = 'Created ' + Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy') + ' by ' + user.pic + (d.logSource ? ' · ' + d.logSource : ' · app');
    }
    var w = { contact: d.contact, phone: d.phone, jobTitle: d.jobTitle, specialize: d.specialize, role: d.role,
              influence: d.influence, trust: d.trust, note: d.note, pic: d.pic };
    if(cus){ w.type = cus.type; w.name = cus.name; w.address = cus.address; w.province = cus.province; w.area = cus.area; if(!str_(w.pic)) w.pic = cus.pic || user.pic; }
    if(isNew) w.log = d.log;
    Object.keys(w).forEach(function(k){ if(w[k] === undefined) delete w[k]; });
    writeRow_('cbc', row, w, isNew); var _diffB = _DIFF.slice();
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_(['cbc', 'customer']);
  var b = cbcRows_().filter(function(x){ return x._row === row; })[0] || {};
  log_(user.pic, isNew ? 'add' : 'update', 'cbc', d.contact, b.name || '', row);
  if(isNew || _diffB.length) custLog_(user.pic, isNew ? 'add' : 'update', 'cbc', { code: b.code || '', name: b.name || '', cbcCode: b.cbcCode || '', contact: b.contact || d.contact }, _diffB, row, '');   /* v1.5 */
  return { ok: true, row: row, cbc: b, message: (isNew ? 'Contact added: ' : 'Contact updated: ') + d.contact };
}
function saveCustomerCbc_(user, p){
  var c = p.customer, b = p.cbc;
  if(typeof c === 'string') c = JSON.parse(c);
  if(typeof b === 'string') b = b ? JSON.parse(b) : null;
  var r = saveCustomerRow_(user, c), out = { ok: true, row: r.row, code: r.code, customer: r.customer, message: r.message };
  if(b && str_(b.contact)){
    try{ b._row = 0; b.name = r.customer.name; b.code = r.code; var rb = saveCbcRow_(user, b); out.cbc = rb.cbc; out.cbcRow = rb.row; }
    catch(e){ out.cbcWarn = e.message; }
  }
  return out;
}

/* ── 5. MONTHLY REPORT · 7. PRODUCT PRESENTATION · 8. ADP ── */
function saveSimple_(user, k, d, prep){
  var row = parseInt(d._row, 10) || 0, isNew = !row;
  var L = lock_();
  try{
    if(!isNew){ var cur = checkRow_(k, row); if(!canEdit_(user, cur.pic)) throw new Error('Only ' + cur.pic + ' (or a manager) can edit this row.'); }
    else { row = firstFree_(k); d.no = nextNo_(k); if(!str_(d.pic)) d.pic = user.pic; }
    if(prep) prep(d, isNew);
    delete d._row;
    writeRow_(k, row, d, isNew);
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_([k]);
  return row;
}
function saveMonthly_(user, p){
  var d = p.data; if(typeof d === 'string') d = JSON.parse(d);
  var isNew = !(parseInt(d._row, 10) || 0);
  var row = saveSimple_(user, 'monthly', d, function(x){
    if(x.period){ x.period = Number(String(x.period).replace(/\D/g, '').slice(0, 6)); x.fy = fyOfYm_(x.period); }
    if(x.area === undefined && isNew) x.area = 'Thailand';
  });
  log_(user.pic, isNew ? 'add' : 'update', 'monthly', d.typeTask || ('row ' + row), d.period || '', row);
  return { ok: true, row: row, message: 'Saved to sheet 5. MONTHLY REPORT' };
}
function savePresentation_(user, p){
  var d = p.data; if(typeof d === 'string') d = JSON.parse(d);
  var isNew = !(parseInt(d._row, 10) || 0);
  var row = saveSimple_(user, 'present', d, function(x){
    if(x.day) x.day = iso_(x.day);
    if(x.account){ var a = parseAcc_(x.account); if(!str_(x.province)) x.province = a.province; if(!str_(x.area)) x.area = a.area; }
    if(!x.month && x.day) x.month = ymOf_(x.day);
    if(x.month){ x.month = Number(String(x.month).replace(/\D/g, '').slice(0, 6)); if(!x.fy) x.fy = fyOfYm_(x.month); }
    ['target', 'actual'].forEach(function(f){ if(x[f] !== undefined && x[f] !== '') x[f] = num_(x[f]); });
  });
  log_(user.pic, isNew ? 'add' : 'update', 'present', parseAcc_(d.account).name, d.day || d.month || '', row);
  return { ok: true, row: row, message: 'Saved to sheet 7. PRODUCT PRESENTATION' };
}
function saveADP_(user, p){
  var d = p.data; if(typeof d === 'string') d = JSON.parse(d);
  var isNew = !(parseInt(d._row, 10) || 0);
  if(isNew){
    var nm = picKey_(parseAcc_(d.account).name);
    var dup = adpRows_().filter(function(r){ return picKey_(parseAcc_(r.account).name) === nm && String(r.fy) === String(d.fy); })[0];
    if(dup) throw new Error(parseAcc_(d.account).name + ' already has an ADP in ' + d.fy + ' (row ' + dup._row + ').');
  }
  var row = saveSimple_(user, 'adp', d, function(x, nw){ if(nw) x.created = todayIso_(); x.updated = todayIso_(); });
  log_(user.pic, isNew ? 'add' : 'update', 'adp', parseAcc_(d.account).name, d.fy || '', row);
  return { ok: true, row: row, message: 'ADP saved to sheet 8. ADP' };
}
function deleteRow_(user, p){
  var tab = p.tab, row = parseInt(p.row, 10);
  if(!TABS[tab]) throw new Error('Cannot delete from this tab');
  var L = lock_(), hit;
  try{
    hit = checkRow_(tab, row);
    if(!canEdit_(user, hit.pic)) throw new Error('Only ' + hit.pic + ' (or a manager) can delete this row.');
    sh_(TABS[tab].sh).deleteRow(row); delete _TAB[tab];
    if(tab === 'customer' || tab === 'cbc') custLog_(user.pic, 'delete', tab, hit, [], row, str_(p.reason));   /* v1.5 */
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_(tab === 'customer' || tab === 'cbc' ? ['customer', 'cbc'] : [tab]);
  log_(user.pic, 'delete', tab, parseAcc_(hit.account || hit.name || hit.contact || '').name || ('row ' + row), '', row);
  var out = { ok: true, message: 'Row deleted from ' + TABS[tab].sh, photosDeleted: 0 };
  if(tab === 'weekly'){ try{ out.sync = vsSync_(false); }catch(e){} }
  return out;
}

/* ── account 360 ── */
function account360_(p){
  var code = str_(p.code), name = str_(p.name);
  var cus = customers_().filter(function(c){ return (code && c.code === code) || (name && picKey_(c.name) === picKey_(name)); })[0];
  if(!cus) return { ok: false, error: 'Account not found' };
  var nm = picKey_(cus.name);
  function accIs(v){ return picKey_(parseAcc_(v).name) === nm; }
  var weekly = weeklyRows_().filter(function(w){ return accIs(w.account); });
  var present = presentRows_().filter(function(r){ return accIs(r.account); });
  var adp = adpRows_().filter(function(r){ return accIs(r.account); });
  var cbc = cbcRows_().filter(function(b){ return picKey_(b.name) === nm; });
  var tl = [];
  weekly.forEach(function(w){ tl.push({ kind: 'visit', date: w.start, title: w.typeAction || 'Field visit', pic: w.pic, typeTask: w.typeTask,
    process: w.process, status: w.status, feedback: w.feedback, product: w.product, photos: [], row: w._row, plan: w.plan, result: w.result,
    next: w.nextAction, detail: w.result || w.plan }); });
  present.forEach(function(r){ tl.push({ kind: 'present', date: r.day || (r.month ? String(r.month).slice(0, 4) + '-' + String(r.month).slice(4, 6) + '-01' : ''),
    title: 'Product presentation', pic: r.pic, target: num_(r.target), actual: num_(r.actual), link: r.folder, row: r._row, detail: r.review }); });
  adp.forEach(function(a){ tl.push({ kind: 'adp', date: '', title: 'ADP — ' + (a.abcd || 'Key account'), pic: a.pic, row: a._row, detail: a.objective }); });
  tl.sort(function(a, b){ return String(b.date || '').localeCompare(String(a.date || '')); });
  var last = ''; weekly.forEach(function(w){ if(w.start > last) last = w.start; });
  return { ok: true, customer: cus, cbc: cbc, orders: [], weekly: weekly, present: present, adp: adp, timeline: tl.slice(0, 300), photos: [],
    stats: { totalAmount: 0, orderCount: 0, visitCount: weekly.length, presentCount: present.length, cbcCount: cbc.length,
      lastVisit: last, lastOrder: '', byMonth: {}, byProduct: {},
      daysSinceVisit: last ? Math.floor((date_(todayIso_()) - date_(last)) / 86400000) : -1 } };
}

/* ══════════════ ALL TASK (other tasks — Report-Hub compatible API) ══════════════
 *  B No (formula) · C FY · D Month · E Type · F Key Task · G Sub Task · H PIC · I Task result/Link ·
 *  J Start · K Planned Deadline · L Revised Deadline · M Leadtime · N Status · O % · P Actual finish ·
 *  Q Behavior · R Priority · S Priority mail at · T – · U Sync key · V Sync meta
 *  Numbers (No) are computed here from the structure (same rule as the formula), so a formula that is
 *  not recalculated yet never hides a task. */
var AT_W = 21;
function atFormulas_(r){
  var D = CFG.AT_DATA;
  return [
    ['B', '=IF(AND(F' + r + '="",G' + r + '=""),"",IF(F' + r + '<>"",COUNTIF($F$' + D + ':F' + r + ',"?*"),COUNTIF($F$' + D + ':F' + r + ',"?*")&"."&(ROW()-SUMPRODUCT(MAX(($F$' + D + ':F' + r + '<>"")*ROW($F$' + D + ':F' + r + '))))))'],
    ['C', '=IF(OR(B' + r + '="",J' + r + '=""),"","FY"&(YEAR(J' + r + ')-IF(MONTH(J' + r + ')>=9,1958,1959)))'],
    ['D', '=IF(OR(B' + r + '="",J' + r + '=""),"",YEAR(J' + r + ')*100+MONTH(J' + r + '))'],
    ['M', '=IF(OR(J' + r + '="",K' + r + '=""),"",IF(L' + r + '<>"",L' + r + ',K' + r + ')-J' + r + ')'],
    ['P', '=IF(N' + r + '="Completed",IF(L' + r + '<>"",L' + r + ',K' + r + '),"")'],
    ['Q', '=IF(N' + r + '="Completed",IF(AND(L' + r + '<>"",K' + r + '<>"",L' + r + '>K' + r + '),"Late","On Time"),IF(AND(IF(L' + r + '<>"",L' + r + ',K' + r + ')<>"",IF(L' + r + '<>"",L' + r + ',K' + r + ')<TODAY()),"Overdue",""))']
  ];
}
function atWriteFormulas_(s, r){
  var L = atFormulas_(r);
  L.forEach(function(x){ fmlPut_(s, colNum_(x[0]), r, CFG.AT_DATA, x[1]); });      /* v1.4 */
  SpreadsheetApp.flush();
  L.forEach(function(x){ var c = s.getRange(x[0] + r); if(fmlBadTxt_(c.getDisplayValue())) c.setFormula(fmlLoc_(x[1], true)); });
}
function pct_(v){ if(v === '' || v == null) return 0; if(typeof v === 'number'){ var n = (v > 0 && v <= 1) ? Math.round(v * 100) : Math.round(v); return Math.max(0, Math.min(100, n)); }
  var m = /(-?\d+(?:\.\d+)?)/.exec(String(v)); if(!m) return 0; var x = parseFloat(m[1]); if(/%/.test(String(v)) || x > 1) return Math.max(0, Math.min(100, Math.round(x))); return Math.round(x * 100); }
var _AT = null;
function atRead_(){
  if(_AT) return _AT;
  var s = sh_(CFG.SH_ALL), last = s.getLastRow(), keys = [], all = [];
  if(last >= CFG.AT_DATA){
    var v = s.getRange(CFG.AT_DATA, 2, last - CFG.AT_DATA + 1, AT_W).getValues(), kn = 0, sn = 0, key = null;
    for(var i = 0; i < v.length; i++){
      var r = v[i], F = str_(r[4]), G = str_(r[5]), row = CFG.AT_DATA + i;
      if(!F && !G) continue;
      var o = { row: row, fy: str_(r[1]), month: str_(r[2]).replace(/\D/g, '').slice(0, 6), type: str_(r[3]), keyTask: F, subTask: G,
        pic: str_(r[6]), result: str_(r[7]), start: iso_(r[8]), planned: iso_(r[9]), revised: iso_(r[10]),
        leadtime: r[11] == null ? '' : String(r[11]), status: str_(r[12]) || 'To Do', progress: pct_(r[13]), actual: iso_(r[14]),
        priority: (r[15] === true || String(r[15]).toLowerCase() === 'true' || r[15] === '⭐'), priorityMailAt: iso_(r[16]),
        vSrc: str_(r[19]), vMeta: (function(){ try{ return JSON.parse(str_(r[20]) || 'null'); }catch(e){ return null; } })() };
      if(!o.fy && o.start) o.fy = fyOfYm_(ymOf_(o.start));
      if(!o.month && o.start) o.month = ymOf_(o.start);
      if(F){ kn++; sn = 0; o.no = String(kn); o.subs = []; key = o; keys.push(o); }
      else {
        sn++; o.no = (key ? key.no : '0') + '.' + sn; o.parentNo = key ? key.no : '0'; o.name = G;
        if(key){ if(!o.type) o.type = key.type; key.subs.push(o); }
        else { key = { row: 0, no: '0', keyTask: '(no key task)', subs: [o], pic: o.pic, type: o.type, status: '', progress: 0 }; keys.push(key); }
      }
      all.push(o);
    }
  }
  return (_AT = { keys: keys, all: all });
}
function atFind_(no){ no = String(no || '').replace(/\.0$/, ''); return atRead_().all.filter(function(x){ return x.no === no; })[0] || null; }
function atKeyEnd_(key){ var s = key.subs; return s.length ? s[s.length - 1].row : key.row; }
function atLastRow_(){ var a = atRead_().all; return a.length ? a[a.length - 1].row : CFG.AT_DATA - 1; }
function atWrite_(row, o){
  var s = sh_(CFG.SH_ALL);
  var put = function(col, v){ if(v !== undefined) s.getRange(col + row).setValue(v); };
  put('E', o.type); put('F', o.keyTask); put('G', o.subTask); put('H', o.pic); put('I', o.result);
  put('J', o.start === undefined ? undefined : (date_(iso_(o.start)) || ''));
  put('K', o.planned === undefined ? undefined : (date_(iso_(o.planned)) || ''));
  put('L', o.revised === undefined ? undefined : (date_(iso_(o.revised)) || ''));
  put('N', o.status); put('O', o.progress === undefined ? undefined : Math.max(0, Math.min(100, num_(o.progress))) / 100);
}
function atStatusFix_(st, pg, curSt){
  st = str_(st); pg = (pg === undefined || pg === '') ? undefined : num_(pg);
  if(/complet/i.test(st)) pg = 100;
  else if(/cancel|to\s*do/i.test(st) && pg === undefined) pg = 0;
  if(!st && pg !== undefined) st = pg >= 100 ? 'Completed' : pg > 0 ? 'In Progress' : 'To Do';
  return { status: st || undefined, progress: pg };
}
function atCanEdit_(user, t){
  if(t.vSrc) throw new Error('This task is synced automatically from sheet 6. CUSTOMER VISITING — edit the visit there.');
  if(!canEdit_(user, t.pic)) throw new Error('Only ' + t.pic + ' (or a manager) can edit this task.');
}
function atResp_(msg, row){ _AT = null; bump_(['alltask']); var t = row ? atRead_().all.filter(function(x){ return x.row === row; })[0] : null;
  return { ok: true, message: msg, no: t ? t.no : '', row: row || 0, task: t, keyTasks: atRead_().keys, v: vers_().alltask }; }
/* key task % and status follow its sub tasks (same rule as the Report Hub) */
function atRollup_(keyNo){
  try{
    _AT = null; var k = atFind_(String(keyNo || '').split('.')[0]);
    if(!k || !k.subs || !k.row || k.vSrc) return null;
    var list = k.subs.filter(function(x){ return !/cancel/i.test(x.status); });
    if(!list.length) return null;
    var pc = list.map(function(x){ var v = /complet/i.test(x.status) ? 100 : x.progress; if(/progress/i.test(x.status) && v < 25) v = 25; return v; });
    var allDone = list.every(function(x){ return /complet/i.test(x.status); });
    var avg = allDone ? 100 : Math.round(pc.reduce(function(a, b){ return a + b; }, 0) / pc.length);
    var st = allDone ? 'Completed' : avg > 0 ? 'In Progress' : 'To Do', o = { status: st, progress: avg };
    if(allDone && !/complet/i.test(k.status) && !k.revised) o.revised = todayIso_();
    atWrite_(k.row, o); _AT = null;
    return { keyNo: k.no, progress: avg, status: st };
  }catch(e){ return null; }
}
function atAddKey_(user, p){
  var name = str_(p.keyTask); if(!name) throw new Error('Key task name is required');
  var L = lock_(), row;
  try{
    var s = sh_(CFG.SH_ALL); row = atLastRow_() + 1;
    if(row > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), 50);
    var f = atStatusFix_(p.status || 'To Do', p.progress);
    atWrite_(row, { type: p.type || CFG.VS_TYPE, keyTask: name, subTask: '', pic: p.pic || user.pic, result: p.result || '',
      start: p.start || todayIso_(), planned: p.planned || '', revised: '', status: f.status || 'To Do', progress: f.progress || 0 });
    atWriteFormulas_(s, row); SpreadsheetApp.flush();
    try{ atRepair_(); }catch(e){}
  } finally { L.releaseLock(); }
  log_(user.pic, 'add', 'alltask', name, 'Key task', row);
  return atResp_('Key task added to sheet ALL TASK', row);
}
function atAddSub_(user, p){
  var name = str_(p.name || p.subTask); if(!name) throw new Error('Sub task name is required');
  var L = lock_(), row;
  try{
    var key = atFind_(p.parentNo);
    if(!key || !key.subs) throw new Error('Key task ' + p.parentNo + ' not found — reload and try again.');
    if(key.vSrc) throw new Error('This key task is synced from 6. CUSTOMER VISITING — add a visit there instead.');
    var s = sh_(CFG.SH_ALL), after = atKeyEnd_(key);
    s.insertRowsAfter(after, 1); row = after + 1;
    s.getRange(row, 2, 1, AT_W).clearContent();
    var f = atStatusFix_(p.status || 'To Do', p.progress);
    atWrite_(row, { type: '', keyTask: '', subTask: name, pic: p.pic || user.pic, result: p.result || '', start: p.start || todayIso_(),
      planned: p.planned || '', revised: '', status: f.status || 'To Do', progress: f.progress || 0 });
    atWriteFormulas_(s, row); SpreadsheetApp.flush();
    try{ atRepair_(); }catch(e){}
    atRollup_(key.no);
  } finally { L.releaseLock(); }
  log_(user.pic, 'add', 'alltask', name, 'Sub task of key ' + p.parentNo, row);
  return atResp_('Sub task added to sheet ALL TASK', row);
}
function atUpdate_(user, p, isKey){
  var L = lock_(), t;
  try{
    t = atFind_(p.no); if(!t) throw new Error('Task ' + p.no + ' not found — reload and try again.');
    atCanEdit_(user, t);
    var o = {};
    if(isKey && p.keyTask !== undefined) o.keyTask = str_(p.keyTask);
    if(!isKey && p.name !== undefined) o.subTask = str_(p.name);
    ['type','pic','result','start','planned','revised'].forEach(function(f){ if(p[f] !== undefined && !(f === 'type' && !isKey)) o[f] = p[f]; });
    var f = atStatusFix_(p.status, p.progress);
    if(f.status !== undefined) o.status = f.status;
    if(f.progress !== undefined) o.progress = f.progress;
    /* status just became Completed ⇒ revised deadline = today (same rule as the Report Hub) */
    if(o.status && /complet/i.test(o.status) && !/complet/i.test(t.status) && p.revised === undefined) o.revised = todayIso_();
    atWrite_(t.row, o); SpreadsheetApp.flush();
    if(!t.subs && t.parentNo) atRollup_(t.parentNo);
  } finally { L.releaseLock(); }
  log_(user.pic, 'update', 'alltask', t.keyTask || t.subTask, (p.status || '') + (p.progress !== undefined ? ' · ' + p.progress + '%' : ''), t.row);
  return atResp_('Task updated in sheet ALL TASK', t.row);
}
function atProgress_(user, p){ return atUpdate_(user, { no: p.no, status: p.status, progress: p.progress }, !!(atFind_(p.no) || {}).subs); }
function atDelete_(user, p, isKey){
  var L = lock_(), t;
  try{
    t = atFind_(p.no); if(!t) throw new Error('Task ' + p.no + ' not found — reload and try again.');
    atCanEdit_(user, t);
    var s = sh_(CFG.SH_ALL);
    if(isKey && t.subs){ (t.subs || []).forEach(function(x){ if(x.vSrc) throw new Error('This key task contains synced visits.'); });
      var end = atKeyEnd_(t); s.deleteRows(t.row, end - t.row + 1); }
    else { s.deleteRow(t.row); if(t.parentNo) atRollup_(t.parentNo); }
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  log_(user.pic, 'delete', 'alltask', t.keyTask || t.subTask, isKey ? 'Key task' : 'Sub task', t.row);
  return atResp_('Deleted from sheet ALL TASK', 0);
}

/* ══════════════ SYNC: 6. CUSTOMER VISITING → ALL TASK ══════════════
 *  one key task per month "YYYYMM_Thailand Surgical Customer visiting" (U = visitk|YYYYMM)
 *  one sub task per visit (U = visit|PIC|date|account|type action#n, V = JSON meta) — read-only in the app.
 *  Only blocks that really changed are rewritten.  vsBuild_() MUST stay identical to the Excel builder. */
function vsStatus_(st){
  var s = str_(st);
  if(/complet/i.test(s)) return ['Completed', 1];
  if(/cancel/i.test(s)) return ['Cancelled', 0];
  var m = /(\d{1,3})\s*%/.exec(s);
  if(/progress/i.test(s)) return ['In Progress', m ? parseInt(m[1], 10) / 100 : 0.25];
  return ['To Do', 0];
}
function vsBuild_(){
  var vis = weeklyRows_().filter(function(w){ return w.accName && w.start && !/^tbd$/i.test(w.accName); });
  vis.sort(function(a, b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : a._row - b._row; });
  var seen = {}, months = {};
  vis.forEach(function(v){
    var base = 'visit|' + v.pic + '|' + v.start + '|' + v.accName + '|' + v.typeAction;
    seen[base] = (seen[base] || 0) + 1;
    var st = vsStatus_(v.status), ym = ymOf_(v.start);
    var meta = JSON.stringify({ s: 'thai', t: v.typeAction, tt: v.accType, pg: v.product, sp: v.process, fb: v.feedback, na: v.nextAction });
    (months[ym] = months[ym] || []).push({ G: v.accName + (v.typeAction ? ' — ' + v.typeAction : ''), H: v.pic,
      I: str_(v.result) || str_(v.plan), J: v.start, K: v.finish || v.start, N: st[0], O: st[1], U: base + '#' + seen[base], V: meta });
  });
  var out = [];
  Object.keys(months).sort().forEach(function(ym){
    var subs = months[ym], y = +ym.slice(0, 4), m = +ym.slice(4, 6), last = new Date(y, m, 0).getDate();
    var allDone = subs.every(function(x){ return x.N === 'Completed' || x.N === 'Cancelled'; });
    var any = subs.some(function(x){ return x.O > 0; });
    var avg = Math.round(subs.reduce(function(a, x){ return a + x.O; }, 0) / subs.length * 100) / 100;
    out.push({ ym: ym, key: { E: CFG.VS_TYPE, F: ym + CFG.VS_SUFFIX, H: CFG.VS_KEY_PIC, J: ym.slice(0, 4) + '-' + ym.slice(4, 6) + '-01',
      K: ym.slice(0, 4) + '-' + ym.slice(4, 6) + '-' + ('0' + last).slice(-2), N: allDone ? 'Completed' : any ? 'In Progress' : 'To Do', O: avg, U: 'visitk|' + ym, V: '' }, subs: subs });
  });
  return out;
}
function vsSig_(o){ return [o.E || '', o.F || '', o.G || '', o.H || '', o.I || '', o.J || '', o.K || '', o.N || '', Math.round(num_(o.O) * 100), o.U || '', o.V || ''].join('\u0001'); }
function vsSync_(dry){
  var want = vsBuild_(), s = sh_(CFG.SH_ALL), last = s.getLastRow();
  var v = last >= CFG.AT_DATA ? s.getRange(CFG.AT_DATA, 2, last - CFG.AT_DATA + 1, AT_W).getValues() : [];
  /* existing synced blocks */
  var have = {}, cur = null;
  for(var i = 0; i < v.length; i++){
    var r = v[i], row = CFG.AT_DATA + i, U = str_(r[19]), F = str_(r[4]), G = str_(r[5]);
    if(!F && !G) continue;
    var o = { E: str_(r[3]), F: F, G: G, H: str_(r[6]), I: str_(r[7]), J: iso_(r[8]), K: iso_(r[9]), N: str_(r[12]), O: r[13], U: U, V: str_(r[20]), row: row };
    if(F){ cur = /^visitk\|/.test(U) ? (have[U.slice(7)] = { key: o, subs: [], start: row, end: row }) : null; continue; }
    if(cur){ cur.subs.push(o); cur.end = row; }
  }
  var plan = [], done = { changed: 0, added: 0, removed: 0 };
  var wantMap = {}; want.forEach(function(b){ wantMap[b.ym] = b; });
  Object.keys(have).forEach(function(ym){
    var h = have[ym], w = wantMap[ym];
    if(!w){ plan.push({ at: h.start, del: h.end - h.start + 1, rows: null }); done.removed++; return; }
    var sigH = [vsSig_(h.key)].concat(h.subs.map(vsSig_)).join('\u0002');
    var sigW = [vsSig_(w.key)].concat(w.subs.map(vsSig_)).join('\u0002');
    if(sigH !== sigW){ plan.push({ at: h.start, del: h.end - h.start + 1, rows: [w.key].concat(w.subs) }); done.changed++; }
  });
  var tail = [];
  want.forEach(function(b){ if(!have[b.ym]){ tail = tail.concat([b.key], b.subs); done.added++; } });
  if(dry) return done;
  if(!plan.length && !tail.length) return done;
  plan.sort(function(a, b){ return b.at - a.at; });            /* bottom-up keeps row numbers valid */
  plan.forEach(function(pl){
    if(pl.rows && pl.rows.length > pl.del) s.insertRowsAfter(pl.at + pl.del - 1, pl.rows.length - pl.del);
    else if(pl.rows && pl.rows.length < pl.del) s.deleteRows(pl.at + pl.rows.length, pl.del - pl.rows.length);
    else if(!pl.rows) s.deleteRows(pl.at, pl.del);
    if(pl.rows) vsWriteBlock_(s, pl.at, pl.rows);
  });
  if(tail.length){
    _AT = null;
    var at = atLastRow_() + 1;
    if(at + tail.length > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), at + tail.length - s.getMaxRows() + 20);
    vsWriteBlock_(s, at, tail);
  }
  SpreadsheetApp.flush(); _AT = null; bump_(['alltask']);
  return done;
}
function vsWriteBlock_(s, at, rows){
  var vals = rows.map(function(o){
    return [o.E || '', o.F || '', o.G || '', o.H || '', o.I || '', date_(o.J) || '', date_(o.K) || '', '', null, o.N || '', num_(o.O)];
  });
  /* E..O except M (formula) → write E..L and N..O separately */
  s.getRange(at, 5, rows.length, 8).setValues(vals.map(function(r){ return r.slice(0, 8); }));
  s.getRange(at, 14, rows.length, 2).setValues(vals.map(function(r){ return r.slice(9, 11); }));
  s.getRange(at, 21, rows.length, 2).setValues(rows.map(function(o){ return [o.U || '', o.V || '']; }));
  /* v1.4 — formulas of the whole block copied at once from a healthy row (never #ERROR!) */
  if(rows.length){
    var need = false; for(var i = 0; i < rows.length; i++){ var c0 = s.getRange(at + i, 2); if(!c0.getFormula() || fmlBadTxt_(c0.getDisplayValue())){ need = true; break; } }
    var slow = false;
    if(need) atFormulas_(at).forEach(function(x){
      var col = colNum_(x[0]), src = fmlHealthy_(s, col, at, CFG.AT_DATA);
      if(src && (src < at || src >= at + rows.length)) s.getRange(src, col).copyTo(s.getRange(at, col, rows.length, 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
      else slow = true;
    });
    if(slow) for(var j = 0; j < rows.length; j++) atWriteFormulas_(s, at + j);
  }
}

/* ══════════════ REPORT E-MAILS (weekly / monthly, HTML + PDF, English) ══════════════ */
var RP_CSS = 'body{font-family:Arial,Helvetica,sans-serif;color:#1F2A44;font-size:13px}' +
  'h1{font-size:19px;color:#0B2A5B;margin:0 0 4px}h2{font-size:15px;color:#0B2A5B;margin:18px 0 6px;border-bottom:2px solid #F2C300;padding-bottom:3px}' +
  '.sub{color:#5B6B86;font-size:12px}table{border-collapse:collapse;width:100%;margin-top:4px}' +
  'th{background:#0B2A5B;color:#fff;text-align:left;font-size:11.5px;padding:6px 7px}td{border-bottom:1px solid #E3E8F0;padding:6px 7px;vertical-align:top;font-size:12px}' +
  '.k{background:#EEF3FB;font-weight:bold;color:#0B2A5B}.late{color:#C62828;font-weight:bold}.mute{color:#8A97B5}.pill{display:inline-block;border-radius:9px;padding:1px 7px;font-size:11px;background:#EEF3FB}';
/* overlap (other tasks: key task span can be long) */
function inRange_(a, b, from, to){ a = a || b; b = b || a; if(!a) return false; return a <= to && b >= from; }
/* ⭐ v1.1 — a VISIT belongs to a week when its start OR finish date is inside the week; a visit that starts before
   and ends after the week counts only if it lasts ≤ 14 days. A finish date months after the start is a dd/mm typing
   error and used to put the visit into EVERY weekly report. (Same rule as CRM app v19.) */
function spanHit_(a, b, from, to){
  a = String(a || '').slice(0, 10); b = String(b || '').slice(0, 10) || a;
  if(!a) a = b; if(!b) b = a; if(!a) return false;
  if(b < a) b = a;
  if(a >= from && a <= to) return true;                          /* v1.3 — starts in the period */
  if((date_(b) - date_(a)) / 86400000 > 14) return false;        /* wrong finish date ⇒ start date only */
  return a < from && b >= from;                                  /* started before, still running */
}
function addDaysIso_(isoStr, k){ var d = date_(isoStr); d.setDate(d.getDate() + k); return iso_(d); }
function visitTable_(rows, isPlan){
  if(!rows.length) return '<p class="mute">' + (isPlan ? 'No field visit planned.' : 'No field visit in this period.') + '</p>';
  rows.sort(function(a, b){ return a.start < b.start ? -1 : 1; });
  return '<table><tr><th style="width:74px">Date</th><th style="width:170px">Account</th><th style="width:110px">Type task / action</th><th>' +
    (isPlan ? 'Plan' : 'Result') + '</th><th style="width:96px">Status</th></tr>' + rows.map(function(w){
      var late = !/complet|cancel/i.test(w.status) && (w.finish || w.start) < todayIso_() && !isPlan;
      return '<tr><td>' + dmy_(w.start) + '</td><td><b>' + esc_(w.accName) + '</b><div class="mute">' + esc_([w.accType, w.accProv].filter(String).join(' · ')) + '</div></td>' +
        '<td>' + esc_(w.typeTask) + '<div class="mute">' + esc_(w.typeAction) + '</div></td>' +
        '<td>' + nl2br_(String((isPlan ? (w.plan || w.result) : (w.result || w.plan)) || '').slice(0, 900)) +
          (w.nextAction && !isPlan ? '<div class="mute">→ ' + esc_(w.nextAction) + (w.stopReason ? ': ' + esc_(w.stopReason) : '') + '</div>' : '') + '</td>' +
        '<td' + (late ? ' class="late"' : '') + '>' + esc_(w.status || '—') + '</td></tr>';
    }).join('') + '</table>';
}
function otherTable_(list, isPlan){
  if(!list || !list.length) return '<p class="mute">' + (isPlan ? 'No other task planned.' : 'No other task in this period.') + '</p>';
  var h = '<table><tr><th>Key task / Sub task</th><th style="width:74px">Deadline</th><th style="width:96px">Progress</th><th>' + (isPlan ? 'Note' : 'Result') + '</th></tr>';
  list.forEach(function(g){
    h += '<tr class="k"><td colspan="4">' + esc_(g.keyTask || '') + ' <span class="pill">' + esc_(g.type || '') + '</span> · ' + (g.progress || 0) + '% · ' + esc_(g.status || '') + '</td></tr>';
    (g.subs || []).forEach(function(x){
      h += '<tr><td>' + esc_(x.subTask || '') + '<div class="mute">' + esc_(x.pic || '') + '</div></td><td>' + (x.planned ? dmy_(x.planned) : '—') + '</td>' +
        '<td>' + (x.progress || 0) + '% · ' + esc_(x.status || '') + '</td><td>' + (isPlan ? '' : nl2br_(String(x.result || '').slice(0, 600))) + '</td></tr>';
    });
    if(!(g.subs || []).length && g.result && !isPlan) h += '<tr><td colspan="4">' + nl2br_(String(g.result).slice(0, 600)) + '</td></tr>';
  });
  return h + '</table>';
}
function otherFromSheet_(pic, from, to){
  var out = [];
  atRead_().keys.forEach(function(k){
    if(/customer\s*visiting/i.test(k.keyTask)) return;
    var subs = (k.subs || []).filter(function(x){ return picEq_(x.pic, pic) && inRange_(x.start, x.revised || x.planned, from, to); });
    if(subs.length) out.push({ keyTask: k.keyTask, type: k.type, status: k.status, progress: k.progress, result: k.result,
      subs: subs.map(function(x){ return { subTask: x.subTask, pic: x.pic, status: x.status, progress: x.progress, planned: x.revised || x.planned, result: x.result }; }) });
    else if(!(k.subs || []).length && picEq_(k.pic, pic) && inRange_(k.start, k.revised || k.planned, from, to)) out.push({ keyTask: k.keyTask, type: k.type, status: k.status, progress: k.progress, result: k.result, subs: [] });
  });
  return out;
}
function weeklyHtml_(pic, from, to, other){
  var nf = addDaysIso_(to, 1), nt = addDaysIso_(to, 7), mine = weeklyRows_().filter(function(w){ return picEq_(w.pic, pic); });
  var cur = mine.filter(function(w){ return spanHit_(w.start, w.finish, from, to); });
  var nxt = mine.filter(function(w){ return spanHit_(w.start, w.finish, nf, nt); });
  var oc = (other && other[pic] && other[pic].cur) || otherFromSheet_(pic, from, to);
  var on = (other && other[pic] && other[pic].next) || otherFromSheet_(pic, nf, nt);
  /* v1.16 — same layout as the Vietnam teams (shared wrBody_, English) */
  var norm = function(w){ return { no: w.no, accName: w.accName, accType: w.accType, accProv: w.accProv, typeTask: w.typeTask, typeAction: w.typeAction,
    start: w.start, finish: w.finish, status: w.status, plan: w.plan, result: w.result, nextAction: w.nextAction, photo: w.photo }; };
  var body = wrBody_({ lang: 'en', pic: pic, title: (USERS[pic] || {}).title || '', team: CFG.TEAM_LABEL, from: from, to: to, nf: nf, nt: nt,
                       cur: cur.map(norm), next: nxt.map(norm), otherCur: oc, otherNext: on });
  return { html: '<html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{margin:0}</style></head><body>' + body + '</body></html>',
    subject: '[' + CFG.TEAM + '] Weekly report ' + dmy_(from) + ' – ' + dmy_(to) + ' — ' + pic, count: oc.length };
}
/* ⭐ báo cáo tháng: bỏ hạng mục KPI (Management-KPI) · đưa Marketing (Event cuối cùng) xuống cuối */
function mnTypeRank_(t){ t = String(t || '').toLowerCase(); return /event/.test(t) && /marketing|mkt/.test(t) ? 3 : /^(marketing|mkt)/.test(t) ? 2 : 1; }
function mnTypeCmp_(a, b){ return (mnTypeRank_(a) - mnTypeRank_(b)) || String(a).localeCompare(String(b)); }
function mnPrep_(rows){
  return (rows || []).filter(function(r){ return !/\bkpi\b/i.test(String(r.typeTask || '')); })
    .map(function(r, i){ return { r:r, i:i }; })
    .sort(function(x, y){ return mnTypeCmp_(x.r.typeTask, y.r.typeTask) || (x.i - y.i); })
    .map(function(x){ return x.r; });
}
function monthlyHtml_(pic, month){
  month = String(month).replace(/\D/g, '').slice(0, 6);
  var y = +month.slice(0, 4), m = +month.slice(4, 6), nm = m === 12 ? (y + 1) * 100 + 1 : y * 100 + m + 1;
  var rows = monthlyRows_().filter(function(r){ return !r.pic || picEq_(r.pic, pic); });
  var cur = mnPrep_(rows.filter(function(r){ return String(r.period) === month; })), nxt = mnPrep_(rows.filter(function(r){ return String(r.period) === String(nm); }));
  var tbl = function(list, isPlan){
    if(!list.length) return '<p class="mute">' + (isPlan ? 'No plan yet for next month.' : 'No item for this month.') + '</p>';
    return '<table><tr><th style="width:190px">Type task</th><th>' + (isPlan ? 'Plan' : 'Result') + '</th><th style="width:80px">Area</th></tr>' +
      list.map(function(r){ return '<tr><td><b>' + esc_(r.typeTask) + '</b></td><td>' + nl2br_(isPlan ? (r.plan || '') : (r.result || r.plan || '')) + '</td><td>' + esc_(r.area) + '</td></tr>'; }).join('') + '</table>';
  };
  var lb = function(ym){ ym = String(ym); return ym.slice(4, 6) + '/' + ym.slice(0, 4); };
  var body = '<h1>Monthly report — ' + esc_(pic) + '</h1><div class="sub">' + esc_(CFG.TEAM_LABEL) + ' · ' + lb(month) + '</div>' +
    '<h2>① Result of ' + lb(month) + '</h2>' + tbl(cur, false) + '<h2>② Plan for ' + lb(nm) + '</h2>' + tbl(nxt, true);
  return { html: '<html><head><meta charset="utf-8"><style>' + RP_CSS + '</style></head><body>' + body + '</body></html>',
    subject: '[' + CFG.TEAM + '] Monthly report ' + lb(month) + ' — ' + pic };
}
function pdf_(html, name){ return Utilities.newBlob(html, MimeType.HTML, name + '.html').getAs(MimeType.PDF).setName(name + '.pdf'); }
/* v1.17 — team monthly export: one section per PIC (team order), page break between people */
function monthlyTeamHtml_(month, isPlan){
  month = String(month).replace(/\D/g, '').slice(0, 6);
  var y = +month.slice(0, 4), m = +month.slice(4, 6), nm = String(m === 12 ? (y + 1) * 100 + 1 : y * 100 + m + 1);
  var per = isPlan ? nm : month, lb = function(ym){ ym = String(ym); return ym.slice(4, 6) + '/' + ym.slice(0, 4); };
  var rows = mnPrep_(monthlyRows_().filter(function(r){ return String(r.period) === per; }));
  var pics = TEAM_PICS.slice();
  rows.forEach(function(r){ var pc = str_(r.pic); if(pc && !pics.some(function(x){ return picEq_(x, pc); })) pics.push(pc); });
  var parts = pics.map(function(pc, i){
    var mine = rows.filter(function(r){ return picEq_(r.pic, pc); });
    var g = {}, order = [];
    mine.forEach(function(r){ var k = str_(r.typeTask) || '—'; if(!g[k]){ g[k] = []; order.push(k); } g[k].push(r); });
    order.sort(mnTypeCmp_);
    var area = mine.map(function(r){ return str_(r.area); }).filter(String)[0] || '';
    var body = order.map(function(k, j){
      return '<div class="ts"><div class="th"><span class="tn">' + (j + 1) + '</span>' + esc_(k) + ' <span class="tc">(' + g[k].length + ' item' + (g[k].length > 1 ? 's' : '') + ')</span></div>' +
        g[k].map(function(r, q){ var txt = isPlan ? (r.plan || '') : (r.result || r.plan || '');
          return '<div class="kb"><div class="kl"><span class="ki">' + (q + 1) + '/' + g[k].length + '</span><b>' + esc_(k) + '</b>' + (r.area ? '<span class="kp">' + esc_(r.area) + '</span>' : '') + '<span class="kp">PIC: ' + esc_(pc) + '</span></div>' +
            '<div class="pc">' + (String(txt).trim() ? nl2br_(String(txt)) : '<span style="color:#8A97B5">—</span>') + '</div></div>'; }).join('') + '</div>';
    }).join('');
    return '<div class="ps"' + (i ? ' style="page-break-before:always"' : '') + '><div class="ph"><span class="pn">' + (i + 1) + '</span>' + esc_(pc) +
      ((USERS[pc] || {}).title ? ' <span class="pa">· ' + esc_(USERS[pc].title) + '</span>' : (area ? ' <span class="pa">· ' + esc_(area) + '</span>' : '')) +
      ' <span class="pcnt">' + mine.length + ' item' + (mine.length === 1 ? '' : 's') + '</span></div>' +
      (body || '<p style="color:#5A6A8A">No ' + (isPlan ? 'plan' : 'report') + ' content for ' + lb(per) + '.</p>') + '</div>';
  }).join('');
  var css = '@page{size:A4 portrait;margin:13mm}body{font-family:Aptos,"Segoe UI",Calibri,Arial,sans-serif;color:#1A2340;font-size:10px;margin:0}' +
    '.head{border-bottom:2.5px solid #3A5CAA;padding:0 0 10px;margin-bottom:12px}.head h1{font-size:15px;margin:0 0 4px;color:#1F3A6B}.head .meta{font-size:10.5px;color:#41506B;line-height:1.55}' +
    '.ph{font-size:14px;font-weight:800;color:#1F3A6B;border-bottom:2px solid #3A5CAA;padding:4px 0 6px;margin:4px 0 10px}' +
    '.pn{display:inline-block;background:#3A5CAA;color:#fff;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;font-size:11px;margin-right:8px}' +
    '.pa{font-weight:600;color:#3A5CAA;font-size:12px}.pcnt{font-weight:500;color:#5A6A8A;font-size:10.5px;margin-left:6px}' +
    '.ts{margin-bottom:12px}.th{font-size:12px;font-weight:800;color:#1F3A6B;background:#EEF3FB;padding:7px 11px;border-radius:5px;border-left:4px solid #3A5CAA;margin-bottom:7px}' +
    '.tn{display:inline-block;background:#3A5CAA;color:#fff;font-size:10px;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;margin-right:8px}.tc{font-weight:500;color:#5A6A8A;font-size:10px}' +
    '.kb{margin:0 0 8px 6px}.kl{margin-bottom:4px}.ki{font-size:9px;font-weight:700;color:#3A5CAA;background:#E8EEF9;border-radius:4px;padding:1px 7px;margin-right:8px}' +
    '.kp{font-size:9px;color:#5A6A8A;background:#F1F5FB;border-radius:4px;padding:1px 8px;margin-left:6px}' +
    '.pc{font-size:9.5px;color:#41506B;line-height:1.55;background:#FCFDFE;border:1px solid #EEF1F7;border-radius:5px;padding:8px 11px}' +
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97B5;border-top:1px solid #E2E8F5;padding-top:7px;text-align:right}';
  var html = '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' +
    '<div class="head"><h1>' + (isPlan ? 'Monthly Plan' : 'Monthly Report') + ' — ' + esc_(CFG.TEAM_LABEL) + '</h1><div class="meta">Period: <b>' + lb(per) + '</b><br>Order: <b>' +
    pics.map(esc_).join(' → ') + '</b></div></div>' + parts + '<div class="foot">MMH CRM — ' + esc_(CFG.TEAM) + ' · exported ' + dmy_(todayIso_()) + '</div></body></html>';
  return { html: html, period: per, pics: pics };
}
function sendReport_(user, p, kind){
  var option = p.option || 'self', who = str_(p.toPic) || user.pic;
  /* ⭐ Admin test mode (CRM v30.6): testTo = Admin's company e-mail ⇒ send the test copy only to Admin, no CC, no log */
  var _tt = String(p.testTo || '').trim().toLowerCase();
  if(_tt && /^[a-z0-9._%+\-]+@(mani\.inc|manimedicalhanoi\.com)$/.test(_tt) && option !== 'download') option = 'self'; else _tt = '';
  /* v1.17 — team export: 2 PDF files, no e-mail */
  if(kind === 'month' && option === 'teamFiles'){
    var R1 = monthlyTeamHtml_(p.month, false), R2 = monthlyTeamHtml_(p.month, true);
    var f1 = pdf_(R1.html, 'MMH_Thailand_Surgical_Team_Monthly_Report_' + R1.period), f2 = pdf_(R2.html, 'MMH_Thailand_Surgical_Team_Monthly_Plan_' + R2.period);
    log_(user.pic, 'report', 'report', 'Team monthly export ' + R1.period, R1.pics.join(' → '), '');
    return { ok: true, download: true, files: [ { name: f1.getName(), b64: Utilities.base64Encode(f1.getBytes()) }, { name: f2.getName(), b64: Utilities.base64Encode(f2.getBytes()) } ],
             message: '2 PDF files created: Report ' + R1.period.slice(4) + '/' + R1.period.slice(0, 4) + ' and Plan ' + R2.period.slice(4) + '/' + R2.period.slice(0, 4) + ' (' + R1.pics.join(' → ') + ')' };
  }
  var other = null; try{ other = p.other ? (typeof p.other === 'string' ? JSON.parse(p.other) : p.other) : null; }catch(e){}
  var pics = option === 'all' ? TEAM_PICS.slice() : [who];
  if(!isMgr_(user.pic) && !picEq_(who, user.pic)) throw new Error('You can only send your own report.');
  if(option === 'all' && !isMgr_(user.pic)) throw new Error('Only managers can send for the whole team.');
  var files = [], sent = [], cnt = 0, pdfErr = [];
  pics.forEach(function(pic){
    var R = kind === 'week' ? weeklyHtml_(pic, iso_(p.from), iso_(p.to), other) : monthlyHtml_(pic, p.month);
    cnt += R.count || 0;
    var fname = 'MMH_Thailand_Surgical_' + (kind === 'week' ? 'Weekly_' + pic.replace(/\s+/g, '') + '_' + iso_(p.from) : 'Monthly_' + pic.replace(/\s+/g, '') + '_' + p.month);
    var blob = pdf_(R.html, fname);
    if(option === 'download'){ files.push({ name: fname + '.pdf', b64: Utilities.base64Encode(blob.getBytes()) }); return; }
    if(option !== 'self' && kind === 'week'){ var sv = savePdfToDrive_(blob); if(!sv.ok) pdfErr.push(pic + ': ' + sv.error); }   /* ⭐ v1.1 */
    var to, cc = [];
    if(option === 'self'){ to = [_tt || (USERS[user.pic] || {}).email].filter(Boolean); }
    else { var r = mailRule_(pic); to = r.to; cc = r.cc.filter(function(e){ return to.indexOf(e) < 0; }); }
    if(!to.length) throw new Error('No e-mail address for ' + user.pic);
    mmhMail_({ to: to.join(','), cc: cc.join(','), replyTo: (USERS[pic] || {}).email || '', subject: R.subject,
      htmlBody: R.html, attachments: [blob], name: 'MMH CRM — ' + CFG.TEAM });
    sent.push(pic + ' → ' + to.join(', ') + (cc.length ? ' (cc ' + cc.join(', ') + ')' : ''));
  });
  if(!_tt) log_(user.pic, 'report', 'report', (kind === 'week' ? 'Weekly report ' : 'Monthly report ') + (kind === 'week' ? dmy_(p.from) : p.month), option + ' · ' + pics.join(', '), '');
  if(option === 'download') return { ok: true, download: true, files: files, message: 'PDF created', otherCount: cnt };
  return { ok: true, message: 'Report sent: ' + sent.join(' · ') + (pdfErr.length ? ' · ⚠️ ' + pdfErr.join(' | ') : ''), otherCount: cnt };
}

/* ══════════════ ROUTER ══════════════ */
function doGet(e){ return handle_(e, 'GET'); }
function doPost(e){ return handle_(e, 'POST'); }
function handle_(e, method){
  var p = {};
  try{
    p = (e && e.parameter) ? JSON.parse(JSON.stringify(e.parameter)) : {};
    if(method === 'POST' && e && e.postData && e.postData.contents){
      try{ var b = JSON.parse(e.postData.contents); for(var k in b) p[k] = b[k]; }catch(x){}
    }
  }catch(x){}
  var out, act = String(p.action || ''), rid = str_(p.rid), hit = null;
  /* v1.9 — same request id seen before ⇒ give back the first answer, write nothing */
  if(rid && WRITE_ACTIONS[act]) hit = idemBegin_(rid);
  if(hit) out = hit;
  else {
    try{ out = route_(p); }
    catch(err){ out = { ok: false, error: String(err && err.message || err) }; }
    /* v1.8 — saved in the app ⇒ push the KPI numbers to the KPI file at once (v1.9: unless the app sends push=0) */
    if(out && out.ok && !out.unchanged && !out.dup && (K68_PUSH_ACTIONS[act] || act === 'naDecide') && str_(p.push) !== '0'){ try{ out.kpiPush = k68PushQuick_(); }catch(x){} }
    if(rid && WRITE_ACTIONS[act]) idemEnd_(rid, out);
  }
  var txt = JSON.stringify(out);
  if(p.callback) return ContentService.createTextOutput(p.callback + '(' + txt + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}
/* answer "unchanged" when the client already holds the current version of this answer */
function withVer_(p, deps, fn){
  var v = verOf_(deps);
  if(p.cv && String(p.cv) === v) return { ok: true, unchanged: true, _ver: v };
  var o = fn(); o._ver = v; return o;
}
function route_(p){
  var a = String(p.action || '');
  var pic = str_(p.actor) || str_(p.pic);
  var user = { pic: USERS[pic] ? pic : (pic || 'Dao') };
  if(/^na[A-Z]/.test(a)) return naRoute_(a, user, p);                    /* v1.9 */
  if(/^kr[A-Z]/.test(a)) return krRoute_(a, user, p);                    /* v1.9 */
  if(/^trip(Master|Propose)2$/.test(a)) return tripRoute_(a, user, p);  /* v1.16 */
  switch(a){
    case 'kpiPush': return { ok: true, kpiPush: k68PushQuick_() };       /* v1.9 */
    case 'kpiLate': return kpiLate_(user, p);                            /* v1.12 */
    case 'ping': return { ok: true, team: CFG.TEAM, cors: true, ver: '1.18', trip2: true, kpi68: true, tenderPrice: true, custLog: true, delAccount: true, na: true, kr: true, idem: true, kpiPush: true };
    case 'sheetInfo': return { ok: true, id: ss_().getId(), name: ss_().getName(), team: CFG.TEAM };
    case 'version': { var vv = vers_(); return { ok: true, ver: vv._all, vers: vv }; }
    case 'bumpCache': bump_(); return { ok: true, ver: vers_()._all, message: 'Cache refreshed' };
    case 'bundle': return withVer_(p, ['customer','cbc','master','kpi','weekly','present','log'], function(){ return JSON.parse(JSON.stringify(bundle_(p))); });
    case 'customerIndex': return withVer_(p, ['customer','cbc'], function(){ return { ok: true, rows: customers_() }; });
    case 'list': {
      var tab = String(p.tab || '');
      return withVer_(p, TAB_DEPS[tab] || [tab], function(){
        var rows = filterRows_(tab, cached_('list_' + tab, TAB_DEPS[tab] || [tab], function(){ return rowsOf_(tab); }), str_(p.fy), str_(p.pic));
        var lim = parseInt(p.limit, 10) || 5000; rows = rows.slice(0, lim);
        if(String(p.lean) === '1'){ var L = lean_(rows); return { ok: true, cols: L.cols, lean: L.lean, total: rows.length }; }
        return { ok: true, rows: rows, total: rows.length };
      });
    }
    case 'multi': {
      var tabs = String(p.tabs || '').split(',').filter(String), deps = [];
      tabs.forEach(function(t){ (TAB_DEPS[t] || [t]).forEach(function(d){ if(deps.indexOf(d) < 0) deps.push(d); }); });
      return withVer_(p, deps, function(){
        var o = {};
        tabs.forEach(function(t){ var rows = filterRows_(t, cached_('list_' + t, TAB_DEPS[t] || [t], function(){ return rowsOf_(t); }), str_(p.fy), str_(p.pic)); o[t] = lean_(rows); });
        return { ok: true, tabs: o };
      });
    }
    case 'visitFeed': return withVer_(p, ['weekly'], function(){
      var from = iso_(p.from), to = iso_(p.to), who = str_(p.pic);
      var rows = cached_('list_weekly', ['weekly'], weeklyRows_).filter(function(w){
        if(who && !picEq_(w.pic, who)) return false;
        if(from && to && w.start && !spanHit_(w.start, w.finish, from, to)) return false;
        return true; });
      return { ok: true, rows: rows };
    });
    case 'kpi': return withVer_(p, ['kpi','weekly','present','customer'], function(){ return kpi_(str_(p.fy) || fyToday_()); });
    case 'activity': return { ok: true, rows: activity_(parseInt(p.limit, 10) || 120) };
    case 'custLog': return (function(){ var r = custLogRead_(p.from, p.to); return { ok: true, rows: r.rows, first: r.first }; })();   /* v1.5 */
    case 'deleteAccount': return deleteAccount_(user, p);   /* v1.5 */
    case 'account360': return account360_(p);
    case 'productCodes': return { ok: true, rows: [] };
    case 'photoMeta': case 'photoB64': return { ok: true, rows: [], items: [] };
    /* writes */
    case 'saveWeekly': return saveWeekly_(user, p);
    case 'saveCustomer': return saveCustomer_(user, p);
    case 'saveCBC': return saveCBC_(user, p);
    case 'saveCustomerCbc': return saveCustomerCbc_(user, p);
    case 'saveMonthly': return saveMonthly_(user, p);
    case 'savePresentation': return savePresentation_(user, p);
    case 'saveADP': return saveADP_(user, p);
    case 'saveKpiTarget': return saveKpiTarget_(user, p);
    case 'kpiSync': return kpiSync_(user, p);                                  /* ⭐ v1.2 */
    case 'deleteRow': return deleteRow_(user, p);
    case 'uploadPhoto': case 'deletePhoto': return { ok: false, error: 'Photos are not used by the Thailand CRM.' };
    case 'saveOrders': return { ok: false, error: 'Sales orders are not used by the Thailand CRM.' };
    case 'weeklyReport': return sendReport_(user, p, 'week');
    case 'monthlyReport': return sendReport_(user, p, 'month');
    /* ALL TASK — same actions as the Report Hub */
    case 'weekly': case 'boot': { var at = atRead_(); return { ok: true, keyTasks: at.keys, v: vers_().alltask, source: 'thai',
      picList: picList_(), statusOptions: ['To Do','In Progress','Completed','Cancelled'] }; }
    case 'addKey': return atAddKey_(user, p);
    case 'addSub': return atAddSub_(user, p);
    case 'updateKey': return atUpdate_(user, p, true);
    case 'updateSub': return atUpdate_(user, p, false);
    case 'updateProgress': case 'updateStatus': return atProgress_(user, p);
    case 'deleteKey': return atDelete_(user, p, true);
    case 'deleteSub': return atDelete_(user, p, false);
    case 'syncVisiting': { var r = vsSync_(false); return { ok: true, message: 'Customer visiting synced to ALL TASK', result: r }; }
    case 'tripSync': case 'tripMaster': case 'tripInfo': return { ok: false, error: 'Business trips are not used by the Thailand CRM.' };
    /* ⭐ v1.1 — WEEKLY MEETING (same actions as the Vietnam CRM backend v8.7) */
    case 'mtList': return mtList_();
    case 'mtGet': return mtGet_(str_(p.id));
    case 'mtSave': return mtLocked_(function(){ return mtSave_(p); });
    case 'mtTenders': return mtTenders_();
    case 'mtTenderSave': return mtLocked_(function(){ return mtTenderSave_(p); });
    case 'mtTenderDelete': return mtLocked_(function(){ return mtTenderDelete_(p); });
    case 'mtPrices': return mtPrices_();                                             /* v1.4 */
    case 'mtPriceSave': return mtLocked_(function(){ return mtPriceSave_(p); });
    case 'mtPriceDelete': return mtLocked_(function(){ return mtPriceDelete_(p); });
    case 'mtMail': return mtMail_(p);
    case 'mtPdf': return mtPdf_(p);
  }
  throw new Error('Unknown action: ' + a);
}

/* ══════════════ SHEET MENU + TRIGGERS ══════════════ */
function onOpen(){
  var menu = SpreadsheetApp.getUi().createMenu('MMH CRM (Thailand)');
  /* old-layout file + Convert.gs present → offer the one-time conversion first */
  try{ if(typeof convertToNewCrm === 'function' && !ss_().getSheetByName(CFG.SH_ALL))
    menu.addItem('⓪ Convert this old file to the new CRM layout', 'convertToNewCrm').addSeparator(); }catch(e){}
  menu.addItem('① Setup (triggers — run once)', 'menuSetup')
    .addItem('② Sync Customer visiting → ALL TASK now', 'menuSync')
    .addItem('③ Refresh app cache (after editing the sheet)', 'menuBump')
    .addItem('④ Check configuration', 'menuCheck')
    .addSeparator()
    .addItem('⑤ Rebuild the KPI tab from the KPI FY68 file', 'setupKpiFY68')
    .addItem('⑥ Sync with the master KPI file now (and register this file)', 'syncKpiFY68')
    .addSeparator()
    .addItem('⑦ Repair broken formulas (#ERROR!) in ALL TASK and the CRM tabs', 'repairFormulas')
    .addSeparator()
    .addItem('⑧ New accounts & SKU: create the sheet + grant Drive / Gmail', 'naSetup')
    .addItem('⑨ Rewrite closed months of C2-03 with the new rule', 'k68FixLockedV10')
    .addToUi();
}

/* v1.4 — FORMULAS NEVER BREAK INTO #ERROR! ANY MORE
   A formula written as text with "," is read with the separator of the file's locale; in a file whose locale uses ";"
   (for example Vietnamese) that gives #ERROR! (rows 12, 242, 243, 246, 247 of ALL TASK). Formulas of a new row are now
   COPIED from the nearest healthy row (copyTo · PASTE_FORMULA), which always matches the file's locale; the text formula
   is only a fallback, and is retried with ";" when the sheet still shows #ERROR!. */
function fmlBadTxt_(d){ return /^#(ERROR|NAME|REF)/i.test(String(d || '')); }
function fmlSwap_(f){ var out = '', q = false; for(var i = 0; i < f.length; i++){ var c = f.charAt(i); if(c === '"') q = !q; out += (!q && c === ',') ? ';' : c; } return out; }
function colNum_(L){ var n = 0; String(L).toUpperCase().split('').forEach(function(ch){ n = n * 26 + ch.charCodeAt(0) - 64; }); return n; }
function fmlHealthy_(s, col, row, first){
  var lo = Math.max(first, row - 60), n = row - lo;
  if(n > 0){
    var F = s.getRange(lo, col, n, 1).getFormulas(), D = s.getRange(lo, col, n, 1).getDisplayValues();
    for(var i = n - 1; i >= 0; i--) if(F[i][0] && !fmlBadTxt_(D[i][0])) return lo + i;
  }
  var last = s.getLastRow();
  if(last > row){
    var m = Math.min(60, last - row), F2 = s.getRange(row + 1, col, m, 1).getFormulas(), D2 = s.getRange(row + 1, col, m, 1).getDisplayValues();
    for(var j = 0; j < m; j++) if(F2[j][0] && !fmlBadTxt_(D2[j][0])) return row + 1 + j;
  }
  return 0;
}
function fmlPut_(s, col, row, first, f){
  var src = fmlHealthy_(s, col, row, first), cell = s.getRange(row, col);
  if(src){ s.getRange(src, col).copyTo(cell, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false); return true; }
  if(f) cell.setFormula(fmlLoc_(f, fmlSemi_(s)));
  return false;
}
/* repair: every #ERROR! cell in the formula columns of ALL TASK and of the CRM tabs */
function atRepair_(){
  var s = sh_(CFG.SH_ALL), last = s.getLastRow(), fixed = 0;
  if(last < CFG.AT_DATA) return 0;
  var D = s.getRange(CFG.AT_DATA, 2, last - CFG.AT_DATA + 1, 16).getDisplayValues();   /* B..Q */
  var cols = ['B','C','D','M','P','Q'].map(colNum_);
  for(var i = 0; i < D.length; i++){
    if(!cols.some(function(c){ return fmlBadTxt_(D[i][c - 2]); })) continue;
    atWriteFormulas_(s, CFG.AT_DATA + i); fixed++;
  }
  return fixed;
}
function repairFormulas(){
  var n = atRepair_(), m = 0;
  Object.keys(TABS).forEach(function(k){
    var d = TABS[k]; if(!d.formula || !d.formula.length) return;
    var s = sh_(d.sh), last = s.getLastRow(); if(last < CFG.DATA) return;
    d.formula.forEach(function(f){
      var col = 2 + d.f.indexOf(f), D = s.getRange(CFG.DATA, col, last - CFG.DATA + 1, 1).getDisplayValues();
      for(var i = 0; i < D.length; i++) if(fmlBadTxt_(D[i][0])){ if(fmlPut_(s, col, CFG.DATA + i, CFG.DATA, '')) m++; }
    });
  });
  _AT = null; bump_();
  try{ SpreadsheetApp.getUi().alert((n + m) ? ('Fixed: ' + n + ' ALL TASK row(s) + ' + m + ' cell(s) in the CRM tabs.') : 'No broken formula found.'); }catch(e){}
  return { ok: true, allTask: n, cells: m };
}

function menuSetup(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(['onEditTh','onChangeTh','cronTh'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  var s = ss_();
  ScriptApp.newTrigger('onEditTh').forSpreadsheet(s).onEdit().create();
  ScriptApp.newTrigger('onChangeTh').forSpreadsheet(s).onChange().create();
  ScriptApp.newTrigger('cronTh').timeBased().everyMinutes(10).create();
  bump_(); var r = vsSync_(false);
  SpreadsheetApp.getUi().alert('Setup done.\n\n· Edits made directly in the sheet now show in the app within ~15 seconds.\n' +
    '· Customer visits are mirrored into ALL TASK every 10 minutes and right after every save from the app.\n\n' +
    'First sync: ' + r.added + ' month(s) added, ' + r.changed + ' changed, ' + r.removed + ' removed.');
}
function menuSync(){ var r = vsSync_(false); SpreadsheetApp.getUi().alert('ALL TASK synced: ' + r.added + ' month(s) added, ' + r.changed + ' changed, ' + r.removed + ' removed.'); }
function menuBump(){ bump_(); SpreadsheetApp.getUi().alert('App cache refreshed — reopen the app (or press ⟳).'); }
function menuCheck(){
  var miss = [];
  [CFG.SH_CUST, CFG.SH_CBC, CFG.SH_MON, CFG.SH_WK, CFG.SH_PRES, CFG.SH_ADP, CFG.SH_KPI, CFG.SH_MASTER, CFG.SH_CODE, CFG.SH_LOG, CFG.SH_ALL]
    .forEach(function(n){ if(!ss_().getSheetByName(n)) miss.push(n); });
  var trig = ScriptApp.getProjectTriggers().map(function(t){ return t.getHandlerFunction(); });
  SpreadsheetApp.getUi().alert((miss.length ? '⚠️ Missing sheets: ' + miss.join(', ') : '✓ All sheets found') + '\n' +
    'Customers: ' + customers_().length + ' · Contacts: ' + cbcRows_().length + ' · Visits: ' + weeklyRows_().length + ' · ALL TASK keys: ' + atRead_().keys.length + '\n' +
    'Triggers: ' + (trig.length ? trig.join(', ') : 'none — run ① Setup'));
}
function onEditTh(e){ try{ var n = e && e.range ? e.range.getSheet().getName() : ''; var k = SHEET_VER[n]; bump_(k ? [k] : null);
  if(n === CFG.SH_WK) vsSync_(false); }catch(x){} }
function onChangeTh(e){ try{ if(e && e.changeType === 'EDIT') return; bump_(); }catch(x){} }
function cronTh(){ try{ vsSync_(false); }catch(x){} }

/* ══════════════ ⭐ v1.1 — WEEKLY MEETING (Họp tuần) · same app module as the Vietnam teams ══════════════
 *  Sheets created automatically on first use (header in ROW 1, managed by the script):
 *    20. WEEKLY MEETING — one row = one weekly meeting with one PIC (ID MT-yyyymmdd-PIC ⇒ saving again overwrites)
 *    21. TENDER TRACK   — tender packages followed in the meeting (soft delete: column Deleted = x)
 *  The app sends Vietnamese field names / values (shared code with the Vietnam teams) — they are written to the
 *  sheet in ENGLISH here and translated back when the app reads them.
 *  Weekly-report and meeting PDFs are saved to the shared Drive folder WEEKLY_PDF_FOLDER_ID / Thailand Surgical.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
var WEEKLY_PDF_FOLDER_ID = '1izYni9pCLaLnI-rvnXlT8BQL1M8Ci44N';     // same folder as the Vietnam sales teams
var MT_CFG = { SH_MEET: '20. WEEKLY MEETING', SH_TENDER: '21. TENDER TRACK', SH_PRICE: '22. TENDER PRICE LOG', MAIL_RE: /^[^@\s]+@manimedicalhanoi\.com$/i, CELL_MAX: 49000 };
/* [key sent by the app, English column header] */
var MT_MEET_COLS = [
  ['Meeting ID', 'Meeting ID'], ['Week start', 'Week start'], ['Tuần', 'Week'], ['FY', 'FY'], ['Sales PIC', 'Sales PIC'],
  ['Số lượt tuần này', 'Visits this week'], ['Đã hoàn thành', 'Completed'], ['Số lượt tuần sau', 'Visits planned next week'],
  ['Ghi chú địa bàn', 'Customer relations & market development notes'],
  ['Theo forecast', 'On forecast?'], ['Rủi ro', 'Risk'], ['✅ Positive factors', '✅ Positive factors'],
  ['❌ Negative factors', '❌ Negative factors'], ['➡️ Follow up action', '➡️ Follow up action'],
  ['Account mới', 'New accounts'], ['CBC mới', 'New CBC'], ['Buổi GTSP', 'Product presentations'],
  ['Tóm tắt PT thị trường', 'Market development summary'],
  ['Số gói thầu', 'Tender packages'], ['DS thầu còn lại FY (VND)', 'Remaining tender sales in FY (THB)'], ['Ghi chú thầu', 'Tender notes'],
  ['Thông tin khác', 'Other information'], ['PDF (Drive)', 'PDF (Drive)'],
  ['Created by', 'Created by'], ['Created at', 'Created at'], ['Updated by', 'Updated by'], ['Updated at', 'Updated at'],
  ['Emailed at', 'Emailed at'], ['Emailed to', 'Emailed to'], ['Data (JSON)', 'Data (JSON)'], ['Snapshot (JSON)', 'Snapshot (JSON)']
];
var MT_MEET_TEXT = ['Meeting ID', 'Week start', 'Week', 'FY', 'Created at', 'Updated at', 'Emailed at'];
var MT_TENDER_COLS = [
  ['id', 'Tender ID'], ['pic', 'Sales PIC'], ['hosp', 'Hospital'], ['account', 'Account'], ['prod', 'Product group'],
  ['detail', 'Product detail'], ['qty', 'Qty'], ['unit', 'Unit'], ['price', 'Unit price (THB)'], ['value', 'Value (THB)'],
  ['status', 'Status'], ['won', 'Result'], ['kqtt', 'Tender result month'], ['valid', 'Contract validity (months)'],
  ['npp', 'Distributor'], ['note', 'Note'], ['createdBy', 'Created by'], ['createdAt', 'Created at'],
  ['updatedBy', 'Updated by'], ['updatedAt', 'Updated at'], ['deleted', 'Deleted'],
  ['prov', 'Province'], ['area', 'Region'], ['items', 'Items (JSON)']          /* v1.4 */
];
var MT_TENDER_TEXT = ['Tender ID', 'Tender result month', 'Created at', 'Updated at'];
/* values the app keeps in Vietnamese ⇄ English text on the sheet */
var MT_VAL = { 'Đang chấm': 'Under evaluation', 'Đã có kết quả': 'Result announced', 'Trúng': 'Won', 'Không trúng': 'Lost',
  '✅ Đúng forecast': '✅ On forecast', '📈 Vượt forecast': '📈 Above forecast', '⚠️ Thấp hơn forecast': '⚠️ Below forecast',
  '❔ Chưa rõ': '❔ Not clear yet', '🟢 Thấp': '🟢 Low', '🟠 Trung bình': '🟠 Medium', '🔴 Cao': '🔴 High', 'Cái': 'Pcs', 'Hộp': 'Box', 'Khác': 'Other' };
var MT_VAL_BACK = {}; Object.keys(MT_VAL).forEach(function(k){ MT_VAL_BACK[MT_VAL[k]] = k; });
function mtEn_(v){ return (typeof v === 'string' && MT_VAL[v]) ? MT_VAL[v] : v; }
function mtVi_(v){ return (typeof v === 'string' && MT_VAL_BACK[v]) ? MT_VAL_BACK[v] : v; }

function mtLocked_(fn){ var l = lock_(); try{ var r = fn(); SpreadsheetApp.flush(); return r; } finally { l.releaseLock(); } }
function mtHeaders_(cols){ return cols.map(function(c){ return c[1]; }); }
function mtSheet_(name, cols, textCols){
  var s = ss_().getSheetByName(name), hdr = mtHeaders_(cols);
  if(!s){
    s = ss_().insertSheet(name);
    s.getRange(1, 1, 1, hdr.length).setValues([hdr]).setFontWeight('bold').setBackground('#EDF4FB').setFontColor('#35506B').setWrap(true);
    s.setFrozenRows(1);
    (textCols || []).forEach(function(h){ var c = hdr.indexOf(h) + 1; if(c > 0) s.getRange(2, c, Math.max(1, s.getMaxRows() - 1), 1).setNumberFormat('@'); });
    return s;
  }
  var lc = Math.max(1, s.getLastColumn()), cur = s.getRange(1, 1, 1, lc).getValues()[0].map(function(h){ return str_(h); });
  var add = hdr.filter(function(h){ return cur.indexOf(h) < 0; });
  if(add.length) s.getRange(1, cur.length + 1, 1, add.length).setValues([add]).setFontWeight('bold').setBackground('#EDF4FB').setFontColor('#35506B');
  return s;
}
function mtMeetSh_(){ return mtSheet_(MT_CFG.SH_MEET, MT_MEET_COLS, MT_MEET_TEXT); }
function mtTenderSh_(){ return mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_COLS, MT_TENDER_TEXT); }
function mtHdr_(s){ var h = s.getRange(1, 1, 1, Math.max(1, s.getLastColumn())).getValues()[0], m = {};
  h.forEach(function(x, i){ x = str_(x); if(x && !(x in m)) m[x] = i; }); return { list: h, map: m, n: h.length }; }
function mtNow_(){ return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
function mtStr_(v, fmt){ if(v === null || v === undefined) return ''; if(v instanceof Date) return Utilities.formatDate(v, tz_(), fmt || 'yyyy-MM-dd'); return String(v); }
function mtJ_(v){ if(typeof v !== 'string') return v; try{ return JSON.parse(v); }catch(e){ return v; } }
function mtCell_(v){ v = String(v == null ? '' : v); return v.length > MT_CFG.CELL_MAX ? v.slice(0, MT_CFG.CELL_MAX) : v; }
function mtFindRow_(s, id){
  var last = s.getLastRow(); if(last < 2 || !id) return 0;
  var v = s.getRange(2, 1, last - 1, 1).getValues();
  for(var i = 0; i < v.length; i++) if(str_(v[i][0]) === String(id)) return i + 2;
  return 0;
}
function mtWriteRow_(s, id, obj){          /* obj keyed by ENGLISH header */
  var H = mtHdr_(s), r = mtFindRow_(s, id), isNew = !r;
  if(isNew) r = Math.max(2, s.getLastRow() + 1);
  var cur = isNew ? H.list.map(function(){ return ''; }) : s.getRange(r, 1, 1, H.n).getValues()[0];
  Object.keys(obj).forEach(function(h){ if(h in H.map) cur[H.map[h]] = (obj[h] === undefined || obj[h] === null) ? '' : obj[h]; });
  s.getRange(r, 1, 1, H.n).setValues([cur]);
  return { row: r, isNew: isNew };
}
function mtReadAll_(s){
  var last = s.getLastRow(), H = mtHdr_(s); if(last < 2) return [];
  return s.getRange(2, 1, last - 1, H.n).getValues().map(function(r){
    var o = {}; H.list.forEach(function(h, j){ h = str_(h); if(h) o[h] = r[j]; }); return o;
  }).filter(function(o){ return str_(o[str_(H.list[0])]); });
}
function mtPctStr_(v){ if(v === null || v === undefined || v === '') return ''; if(typeof v === 'number') return Math.round(v * 100) + '%'; return String(v).replace(/^'/, ''); }

/* ── meeting minutes ── */
function mtList_(){
  var s = mtMeetSh_(), rows = mtReadAll_(s);
  var list = rows.map(function(o){
    return { id: str_(o['Meeting ID']), week: mtStr_(o['Week start']), wlabel: mtStr_(o['Week']), fy: mtStr_(o['FY']), pic: mtStr_(o['Sales PIC']),
      nCur: Number(o['Visits this week']) || 0, nDone: Number(o['Completed']) || 0, nNxt: Number(o['Visits planned next week']) || 0,
      npp: '', nppMonth: '', pm: '', pf: '',
      nTender: Number(o['Tender packages']) || 0, tRemain: Number(o['Remaining tender sales in FY (THB)']) || 0,
      crm: mtStr_(o['Market development summary']), pdf: mtStr_(o['PDF (Drive)']),
      createdBy: mtStr_(o['Created by']), createdAt: mtStr_(o['Created at'], 'yyyy-MM-dd HH:mm'),
      updatedBy: mtStr_(o['Updated by']), updatedAt: mtStr_(o['Updated at'], 'yyyy-MM-dd HH:mm'),
      emailedAt: mtStr_(o['Emailed at'], 'yyyy-MM-dd HH:mm'), emailedTo: mtStr_(o['Emailed to']) };
  });
  list.sort(function(a, b){ return a.week < b.week ? 1 : a.week > b.week ? -1 : (a.pic < b.pic ? -1 : 1); });
  return { ok: true, list: list, t: Date.now() };
}
function mtGet_(id){
  if(!id) return { ok: false, error: 'Meeting ID missing' };
  var s = mtMeetSh_(), r = mtFindRow_(s, id);
  if(!r) return { ok: false, error: 'Meeting minutes ' + id + ' not found' };
  var H = mtHdr_(s), v = s.getRange(r, 1, 1, H.n).getValues()[0], g = function(h){ return (h in H.map) ? v[H.map[h]] : ''; };
  var data = mtJ_(str_(g('Data (JSON)')) || '{}'), snap = mtJ_(str_(g('Snapshot (JSON)')) || '{}');
  return { ok: true, rec: { id: id, week: mtStr_(g('Week start')), wlabel: mtStr_(g('Week')), fy: mtStr_(g('FY')), pic: mtStr_(g('Sales PIC')),
    data: (data && typeof data === 'object') ? data : {}, snap: (snap && typeof snap === 'object') ? snap : {},
    createdBy: mtStr_(g('Created by')), createdAt: mtStr_(g('Created at'), 'yyyy-MM-dd HH:mm'),
    updatedBy: mtStr_(g('Updated by')), updatedAt: mtStr_(g('Updated at'), 'yyyy-MM-dd HH:mm'),
    emailedAt: mtStr_(g('Emailed at'), 'yyyy-MM-dd HH:mm'), emailedTo: mtStr_(g('Emailed to')) } };
}
function mtSave_(q){
  var id = str_(q.id);
  if(!/^MT-\d{8}-[A-Z0-9]+$/.test(id)) return { ok: false, error: 'Invalid Meeting ID: ' + id };
  var s = mtMeetSh_(), row = mtJ_(q.row) || {}, by = str_(q.by || q.pic), now = mtNow_();
  if(!by) return { ok: false, error: 'Missing "by"' };
  var data = typeof q.data === 'string' ? q.data : JSON.stringify(q.data || {});
  var snap = typeof q.snap === 'string' ? q.snap : JSON.stringify(q.snap || {});
  if(snap.length > MT_CFG.CELL_MAX) return { ok: false, error: 'Snapshot too large (' + snap.length + ' characters)' };
  if(data.length > MT_CFG.CELL_MAX) return { ok: false, error: 'Minutes too long (' + data.length + ' characters)' };
  if(typeof row !== 'object') row = {};
  var skip = ['Meeting ID', 'Data (JSON)', 'Snapshot (JSON)', 'Created by', 'Created at', 'Updated by', 'Updated at', 'Emailed at', 'Emailed to', 'PDF (Drive)'];
  var obj = {};
  MT_MEET_COLS.forEach(function(c){
    if(c[0] in row && skip.indexOf(c[0]) < 0){ var v = mtEn_(row[c[0]]); obj[c[1]] = (typeof v === 'string') ? mtCell_(v) : v; }
  });
  obj['Meeting ID'] = id; obj['Data (JSON)'] = data; obj['Snapshot (JSON)'] = snap; obj['Updated by'] = by; obj['Updated at'] = now;
  if(!mtFindRow_(s, id)){ obj['Created by'] = by; obj['Created at'] = now; }
  var w = mtWriteRow_(s, id, obj);
  log_(by, 'mtSave', 'meet', id, str_(row['Sales PIC']) + ' · ' + str_(obj['Week']), w.row);
  return { ok: true, id: id, row: w.row, isNew: w.isNew, updatedAt: now, updatedBy: by };
}
/* ── tenders ── */
function mtTenderObj_(o){
  var t = {};
  MT_TENDER_COLS.forEach(function(c){
    var k = c[0], v = o[c[1]];
    t[k] = (k === 'kqtt') ? mtStr_(v, 'yyyy-MM') : (k === 'createdAt' || k === 'updatedAt') ? mtStr_(v, 'yyyy-MM-dd HH:mm') : (v instanceof Date ? mtStr_(v) : mtVi_(v));
  });
  delete t.deleted;
  if(t.items){ var it = mtJ_(t.items); t.items = Array.isArray(it) ? it : []; } else t.items = [];   /* v1.4 */
  return t;
}
function mtTenders_(){
  var list = mtReadAll_(mtTenderSh_()).filter(function(o){ return !str_(o['Deleted']); }).map(mtTenderObj_);
  return { ok: true, list: list, t: Date.now() };
}
function mtTenderSave_(q){
  var t = mtJ_(q.tender) || {}, id = str_(t.id);
  if(!/^TD-[a-z0-9-]+$/i.test(id)) return { ok: false, error: 'Invalid Tender ID' };
  if(!str_(t.hosp)) return { ok: false, error: 'Hospital is required' };
  var s = mtTenderSh_(), by = str_(q.by || q.pic), now = mtNow_(), qty = Number(t.qty) || 0, price = Number(t.price) || 0;
  var items = (mtJ_(t.items) || []).filter(function(x){ return x && (str_(x.code) || Number(x.qty) > 0); })
    .map(function(x){ return { code: str_(x.code), name: str_(x.name), qty: Number(x.qty) || 0, unit: str_(x.unit), price: Number(x.price) || 0 }; });
  var value = qty * price;
  if(items.length){ qty = 0; value = 0; items.forEach(function(x){ qty += x.qty; value += x.qty * x.price; }); price = items.length === 1 ? items[0].price : ''; }
  var obj = { 'Tender ID': id, 'Sales PIC': str_(t.pic), 'Hospital': str_(t.hosp), 'Account': str_(t.account), 'Product group': str_(t.prod),
    'Product detail': str_(t.detail), 'Qty': qty, 'Unit': mtEn_(str_(t.unit)), 'Unit price (THB)': price, 'Value (THB)': value,
    'Status': mtEn_(str_(t.status)), 'Result': mtEn_(str_(t.won)), 'Tender result month': str_(t.kqtt),
    'Contract validity (months)': Number(t.valid) || '', 'Distributor': mtEn_(str_(t.npp)), 'Note': mtCell_(t.note || ''),
    'Updated by': by, 'Updated at': now, 'Deleted': '',
    'Province': str_(t.prov), 'Region': str_(t.area), 'Items (JSON)': items.length ? mtCell_(JSON.stringify(items)) : '' };
  if(!mtFindRow_(s, id)){ obj['Created by'] = by; obj['Created at'] = now; }
  mtWriteRow_(s, id, obj);
  var r = mtFindRow_(s, id), H = mtHdr_(s), v = s.getRange(r, 1, 1, H.n).getValues()[0], o = {};
  H.list.forEach(function(h, j){ h = str_(h); if(h) o[h] = v[j]; });
  var prices = q.prices ? mtPriceAppend_(q.prices, by) : [];                      /* v1.4 — new prices go to the log */
  return { ok: true, tender: mtTenderObj_(o), prices: prices };
}
function mtTenderDelete_(q){
  var id = str_(q.id), s = mtTenderSh_();
  if(!mtFindRow_(s, id)) return { ok: false, error: 'Tender ' + id + ' not found' };
  mtWriteRow_(s, id, { 'Deleted': 'x', 'Updated by': str_(q.by || q.pic), 'Updated at': mtNow_() });
  return { ok: true, id: id };
}

/* ── v1.4 tender price log (sheet 22) — every entry is a new row, older prices stay as history ── */
var MT_PRICE_COLS = [
  ['id', 'Price ID'], ['date', 'Effective date'], ['code', 'Product code'], ['detail', 'Item'], ['prod', 'Product group'],
  ['scope', 'Scope'], ['area', 'Area'], ['unit', 'Unit'], ['price', 'Unit price (THB)'], ['src', 'Price source'],
  ['ref', 'Reference'], ['note', 'Note'], ['createdBy', 'Created by'], ['createdAt', 'Created at'], ['deleted', 'Deleted']
];
var MT_PRICE_TEXT = ['Price ID', 'Effective date', 'Product code', 'Created at'];
var MT_SCOPE_EN = { prov: 'Province', area: 'Region', all: 'Nationwide' }, MT_SCOPE_BACK = { 'Province': 'prov', 'Region': 'area', 'Nationwide': 'all' };
var MT_SRC_EN = { 'KQTT': 'Tender result', 'Báo giá NPP': 'Distributor quotation', 'Giá kê khai': 'Declared price', 'Khác': 'Other' }, MT_SRC_BACK = {};
Object.keys(MT_SRC_EN).forEach(function(k){ MT_SRC_BACK[MT_SRC_EN[k]] = k; });
function mtPriceSh_(){ return mtSheet_(MT_CFG.SH_PRICE, MT_PRICE_COLS, MT_PRICE_TEXT); }
function mtPriceObj_(o){
  var p = {};
  MT_PRICE_COLS.forEach(function(c){
    var k = c[0], v = o[c[1]];
    p[k] = (k === 'date') ? mtStr_(v, 'yyyy-MM-dd') : (k === 'createdAt') ? mtStr_(v, 'yyyy-MM-dd HH:mm') : (v instanceof Date ? mtStr_(v) : v);
  });
  delete p.deleted;
  p.scope = MT_SCOPE_BACK[p.scope] || p.scope || 'all'; p.src = MT_SRC_BACK[p.src] || p.src; p.price = Number(p.price) || 0;
  return p;
}
function mtPrices_(){
  var list = mtReadAll_(mtPriceSh_()).filter(function(o){ return !str_(o['Deleted']); }).map(mtPriceObj_);
  return { ok: true, list: list, t: Date.now() };
}
function mtPriceAppend_(list, by){
  list = (mtJ_(list) || []).filter(function(p){ return p && str_(p.code) && Number(p.price) > 0; });
  if(!list.length) return [];
  var s = mtPriceSh_(), H = mtHdr_(s), now = mtNow_(), rows = [], out = [];
  list.forEach(function(p){
    var id = /^PR-[a-z0-9-]+$/i.test(str_(p.id)) ? str_(p.id) : ('PR-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6));
    var o = { 'Price ID': id, 'Effective date': str_(p.date).slice(0, 10), 'Product code': str_(p.code), 'Item': str_(p.detail),
      'Product group': str_(p.prod), 'Scope': MT_SCOPE_EN[p.scope] || 'Nationwide', 'Area': p.scope === 'all' ? 'Nationwide' : str_(p.area),
      'Unit': mtEn_(str_(p.unit)), 'Unit price (THB)': Number(p.price) || 0, 'Price source': MT_SRC_EN[p.src] || str_(p.src),
      'Reference': str_(p.ref), 'Note': mtCell_(p.note || ''), 'Created by': by, 'Created at': now, 'Deleted': '' };
    var r = new Array(H.n).fill('');
    Object.keys(o).forEach(function(h){ if(h in H.map) r[H.map[h]] = o[h]; });
    rows.push(r); out.push(mtPriceObj_(o));
  });
  s.getRange(s.getLastRow() + 1, 1, rows.length, H.n).setValues(rows);
  return out;
}
function mtPriceSave_(q){
  var by = str_(q.by || q.pic), out = mtPriceAppend_(q.prices || (q.price ? [mtJ_(q.price)] : []), by);
  if(!out.length) return { ok: false, error: 'Product code or unit price is missing' };
  log_(by, 'mtPriceSave', 'price', out.map(function(p){ return p.id; }).join(','), out.length + ' price(s)', 0);
  return { ok: true, list: out };
}
function mtPriceDelete_(q){
  var id = str_(q.id), s = mtPriceSh_();
  if(!mtFindRow_(s, id)) return { ok: false, error: 'Price entry ' + id + ' not found' };
  mtWriteRow_(s, id, { 'Deleted': 'x' });
  return { ok: true, id: id };
}

/* ── e-mail + PDF ── */
function weeklyPdfFolder_(){
  var root = DriveApp.getFolderById(WEEKLY_PDF_FOLDER_ID), it = root.getFoldersByName(CFG.TEAM);
  return it.hasNext() ? it.next() : root.createFolder(CFG.TEAM);
}
function savePdfToDrive_(blob){
  try{
    var f = weeklyPdfFolder_(), name = blob.getName(), ex = f.getFilesByName(name);
    while(ex.hasNext()){ try{ ex.next().setTrashed(true); }catch(e){} }
    var file = f.createFile(blob);
    return { ok: true, url: file.getUrl(), id: file.getId(), name: file.getName() };
  }catch(e){ return { ok: false, error: 'PDF not saved to Drive: ' + String(e && e.message || e) }; }
}
function pdfSafeName_(s, fallback){
  s = String(s || '').replace(/[\\\/:*?"<>|#%]+/g, '_').replace(/\s+/g, '_').slice(0, 120);
  if(!s) s = fallback || ('MMH_Thailand_Surgical_' + todayIso_() + '.pdf');
  if(!/\.pdf$/i.test(s)) s += '.pdf';
  return s;
}
function mtMakePdf_(q){
  var name = pdfSafeName_(q.pdfName, 'MMH_Thailand_Surgical_WeeklyMeeting_' + str_(q.week) + '.pdf'), blob;
  try{ blob = HtmlService.createHtmlOutput(String(q.pdfHtml || '')).getBlob().getAs('application/pdf').setName(name); }
  catch(e){ return { error: 'PDF could not be created: ' + String(e && e.message || e) }; }
  var sv = savePdfToDrive_(blob);
  return { blob: blob, name: name, url: sv.ok ? sv.url : '', error: sv.ok ? '' : sv.error };
}
function mtStamp_(ids, st){
  ids = mtJ_(ids) || []; if(typeof ids === 'string') ids = ids.split(',');
  if(!ids.length) return;
  mtLocked_(function(){
    var s = mtMeetSh_();
    ids.forEach(function(id){ id = str_(id); if(id && mtFindRow_(s, id)) mtWriteRow_(s, id, st); });
    return true;
  });
}
function mtMail_(q){
  var clean = function(arr){ arr = mtJ_(arr); if(typeof arr === 'string') arr = arr.split(/[,;\s]+/); var out = [];
    (arr || []).forEach(function(x){ x = str_(x); if(MT_CFG.MAIL_RE.test(x) && out.indexOf(x) < 0) out.push(x); }); return out; };
  var to = clean(q.to), cc = clean(q.cc).filter(function(x){ return to.indexOf(x) < 0; });
  if(!to.length) return { ok: false, error: 'No valid recipient (only @manimedicalhanoi.com addresses are accepted)' };
  var subject = String(q.subject || ('Weekly meeting update — ' + CFG.TEAM_LABEL)).slice(0, 200), html = String(q.html || '');
  if(!html) return { ok: false, error: 'E-mail is empty' };
  var pdf = null, attach = [];
  if(q.pdfHtml){ pdf = mtMakePdf_(q); if(pdf.blob) attach.push(pdf.blob); }
  html = html.replace('{{PDF_LINK}}', (pdf && pdf.url) ? (' · PDF: <a href="' + pdf.url + '">' + esc_(pdf.name) + '</a>') : '');
  var opt = { to: to.join(','), subject: subject, htmlBody: html, name: 'MMH CRM · ' + CFG.TEAM };
  if(attach.length) opt.attachments = attach;
  if(cc.length) opt.cc = cc.join(',');
  var rp = str_(q.replyTo); if(MT_CFG.MAIL_RE.test(rp)) opt.replyTo = rp;
  mmhMail_(opt);
  var now = mtNow_(), st = { 'Emailed at': now, 'Emailed to': to.concat(cc).join(', ') };
  if(pdf && pdf.url) st['PDF (Drive)'] = pdf.url;
  mtStamp_(q.ids, st);
  log_(str_(q.by), 'mtMail', 'meet', subject, to.concat(cc).join(', '), '');
  return { ok: true, message: 'E-mail sent to ' + to.join(', ') + (cc.length ? ' (cc ' + cc.join(', ') + ')' : '') +
    (pdf ? (pdf.url ? ' · PDF saved to Drive' : ' · ⚠️ ' + (pdf.error || 'PDF not created')) : ''),
    sentAt: now, pdfUrl: pdf && pdf.url || '', pdfError: pdf && !pdf.url ? (pdf.error || 'PDF error') : '' };
}
function mtPdf_(q){
  if(!q.pdfHtml) return { ok: false, error: 'PDF content missing' };
  var pdf = mtMakePdf_(q);
  if(!pdf.url) return { ok: false, error: pdf.error || 'PDF not saved' };
  mtStamp_(q.ids, { 'PDF (Drive)': pdf.url });
  return { ok: true, url: pdf.url, name: pdf.name, message: pdf.name + ' saved to Drive' };
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * ⭐ KPI FY68 — TAB "MỤC TIÊU & KPI" / "TARGET & KPI" THEO FILE MMH KPI FY68
 *
 *  · Mỗi dòng = 1 mã KPI của 1 sales (đúng mã trong sheet "3. Detail KPI" của file MMH KPI FY68)
 *  · Target 12 tháng lấy từ file KPI FY68 (sẵn trong code, và đồng bộ lại bằng menu)
 *  · Actual = CÔNG THỨC tự tính từ các tab dữ liệu CRM (viếng thăm, khách hàng, thuyết trình, đơn hàng)
 *  · Doanh số NPP (mã F…) = lũy kế, lấy từ file KPI FY68 hoặc nhập tay
 *  · Đồng bộ 2 chiều với file KPI FY68: kéo target + doanh số NPP về · đẩy actual CRM sang cột Actual
 *    (bỏ qua ô đang có công thức bên file KPI) — chạy tay từ menu / app, hoặc tự động mỗi sáng
 *
 *  Cột A = nhãn máy đọc (kpi:…, grp, pic, tot, sku, months, mstart…) — ĐỪNG XOÁ, app đọc theo nhãn này.
 * ═══════════════════════════════════════════════════════════════════════════════════════════ */
var K68_SPEC = {"thai":{"title":"THAILAND SURGICAL SALES TEAM","lang":"en","pics":[{"pic":"Dao","role":"Head of Surgical Sales & Marketing – Thailand / Myanmar","rows":[{"code":"F1-00","key":"turnover","name":"Turnover to distributors – Surgical Thailand / Myanmar","unit":"USD","agg":"SUM","w":0.4,"t":[46961.0,102749.0,316826.0,51814.0,106552.0,323867.0,100301.0,120792.0,316826.0,92251.0,127487.0,343574.0]},{"code":"F6-03","key":"turnover","name":"New & relaunched products – Hook + Micro Forceps – Surgical TH / MM","unit":"USD","agg":"SUM","w":0.1,"t":[36971.0,15851.0,0.0,41824.0,15850.0,0.0,60295.0,22191.0,0.0,62236.0,25360.0,0.0]},{"code":"C13-00","key":"event_hub","name":"T&E events led by KOLs & exhibitions – team total","unit":"Times","agg":"SUM","w":0.3,"t":[6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0]},{"code":"C11-01","key":"event_hub","name":"T&E events led by MMH members – team total","unit":"Times","agg":"SUM","w":0.1,"t":[2.0,2.0,2.0,2.0,2.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0]}]},{"pic":"Miew","role":"Surgical – Sale Representative (Manipler)","rows":[{"code":"F1-01","key":"turnover","name":"Turnover to distributors – Manipler, Novatech distributor","unit":"USD","agg":"SUM","w":0.4,"t":[0.0,37567.0,0.0,0.0,40508.0,0.0,0.0,40760.0,0.0,0.0,41165.0,0.0]},{"code":"C11-01a","key":"event_hub","name":"T&E events led by MMH members – Manipler","unit":"Times","agg":"SUM","w":0.15,"t":[2.0,2.0,2.0,2.0,2.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0]},{"code":"C4-02","key":"visit_all","name":"Customer visits – Manipler, Surgical Thailand","unit":"Times","agg":"SUM","w":0.2,"t":[30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0,30.0]},{"code":"C2-03","key":"newacct_all","name":"New accounts & new SKU listings – Manipler","unit":"Accounts","agg":"SUM","w":0.15,"t":[null,null,null,null,null,null,null,null,null,null,null,null]}]}]}};

var K68_MASTER_SHEET = '3. Detail KPI';
var K68_N  = 20000;   /* số dòng quét ở tab viếng thăm / khách hàng */
var K68_N2 = 6000;    /* số dòng quét ở tab thuyết trình / đơn hàng */
var K68_SRC = {
  vi: { wk: '6. WEEKLY REPORT',     cu: '1. CUSTOMER CODE', pr: '7. PRODUCT PRESENTATION', od: '3. SALE ORDER' },
  en: { wk: '6. CUSTOMER VISITING', cu: '1. CUSTOMER CODE', pr: '7. PRODUCT PRESENTATION', od: '', na: '23. NEW ACCOUNT & SKU' }
};
/* cột cố định của tab KPI */
var K68 = { tag: 1, code: 2, pic: 3, name: 4, unit: 5, w: 6, agg: 7, tFY: 8, t0: 9, aFY: 21, a0: 22,
            pct: 34, ytd: 35, q0: 36, score: 40, src: 41, NC: 41 };
/* ô cài đặt */
var K68_SET = { fy: 'C4', rate: 'D5', photo: 'D6', comp1: 'D7', comp2: 'E7', jz1: 'D8', jz2: 'E8', link: 'D9', cur: 'D10', sync: 'D11' };
var K68_MANUAL = { turnover: 1, manual: 1, event_hub: 1 };   /* v1.4 — event counts come from the KPI Hub (Marketing Offline file) */
/* ⭐ phiên bản bố cục tab KPI — tab dựng bằng code cũ (khác nhãn này) sẽ TỰ dựng lại khi đồng bộ, giữ ô nhập tay */
var K68_LAYOUT = 'k68v6';   /* v1.9 — C2-03 counts approved cases of sheet 23 ⇒ the tab rebuilds itself once, typed cells kept */   /* v1.4 — event codes now pulled from the KPI Hub: the tab rebuilds itself once, typed cells kept */

var K68_TXT = {
  vi: {
    title: 'MỤC TIÊU & KPI', sub: 'theo file MMH KPI FY68',
    guide: 'Mỗi dòng = 1 mã KPI của 1 sales, đúng mã trong file MMH KPI FY68. Target 12 tháng lấy từ file KPI FY68 · Actual tự tính bằng công thức từ dữ liệu CRM · Doanh số NPP (mã F) lấy từ file KPI FY68 hoặc nhập tay.',
    fy: 'FY áp dụng', rate: 'Tỷ giá VND / 1 USD', photo: 'Chỉ tính visit có ảnh', comp: 'Từ khoá Composite',
    jz: 'Từ khoá JIZAI', link: 'File KPI tổng (FY68)', cur: 'Tháng hiện tại (auto)', sync: 'Đồng bộ lần cuối',
    yes: 'CÓ', no: 'KHÔNG', linkHint: '← file KPI tổng · KPI Hub tự đồng bộ 2 chiều 5 phút/lần',
    legend: ['Ô nền vàng, chữ xanh = ô nhập tay (target, doanh số NPP, SKU mới)',
             'Chữ đen = công thức tự tính từ dữ liệu CRM — không gõ đè',
             '% đạt tối đa 130% (riêng doanh số mã F không giới hạn) — theo Rule của file KPI FY68',
             'Q1 = T9·T10·T11 · Q2 = T12·T1·T2 · Q3 = T3·T4·T5 · Q4 = T6·T7·T8 · "% lũy kế" = tính đến tháng hiện tại · doanh số mã F: số của từng tháng, quý = tổng 3 tháng',
             'Doanh số NPP (mã F) = số của từng tháng (Target, Actual theo tháng) → kết quả FY = tổng các tháng'],
    partA: 'PHẦN A — TỔNG HỢP CẢ NHÓM THEO NHÓM KPI (tự động)',
    partB: 'PHẦN B — KPI TỪNG SALES THEO THÁNG / QUÝ',
    partC: 'PHẦN C — REVIEW CUỐI QUÝ (sales điền nội dung · trưởng nhóm duyệt)',
    bandT: 'TARGET THEO THÁNG (file KPI FY68)', bandA: 'ACTUAL THEO THÁNG (tự động từ CRM)', bandP: '% ĐẠT',
    hGroup: 'Mã nhóm', hGroupName: 'Chỉ tiêu nhóm', hCodes: 'Gồm các mã KPI',
    hCode: 'Mã KPI', hPic: 'Sale PIC', hName: 'Chỉ tiêu KPI', hUnit: 'Đơn vị', hW: 'Trọng số', hAgg: 'Cách cộng',
    hTFY: 'Target FY', hAFY: 'Actual FY', hPct: '% đạt FY', hYtd: '% lũy kế đến nay', hQ: '% ', hScore: 'Điểm (% × trọng số)', hSrc: 'Nguồn Actual / cách tính',
    mcode: 'mã tháng ▸', mstart: 'ngày đầu tháng ▸', SUM: 'Cộng dồn', LAST: 'Lũy kế',
    mon: ['T9','T10','T11','T12','T1','T2','T3','T4','T5','T6','T7','T8'],
    tot: 'Tổng điểm KPI của {p} (các chỉ tiêu theo dõi trong CRM)',
    sku: '↳ SKU mới (nhập tay số SKU mới theo tháng — cộng vào dòng trên)',
    rQ: 'Quý', rRes: 'Kết quả nổi bật', rWhy: 'Nguyên nhân chưa đạt', rPlan: 'Kế hoạch quý sau', rMgr: 'Trưởng nhóm nhận xét / duyệt', rPct: '% đạt quý (auto)',
    oldName: '9. KPI cũ (trước FY68)',
    src: {
      turnover: 'File MMH KPI FY68 (MMH Turnover Report) — đồng bộ tự động, hoặc nhập tay số của tháng',
      manual: 'Vietnam - Marketing Offline Plan & Report — đồng bộ từ file KPI FY68 hoặc nhập tay',
      visit_dealer: '6. WEEKLY REPORT · Sales PIC + Start date trong tháng + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type = Dealer',
      visit_other: '6. WEEKLY REPORT · Sales PIC + Start date trong tháng + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type ≠ Dealer',
      visit_all: '6. WEEKLY REPORT · Sales PIC + Start date trong tháng + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today',
      newacct_dealer: '1. CUSTOMER CODE · MMH sales PIC + Tháng mở (auto) + Account type = Dealer · cộng SKU mới (dòng dưới)',
      newacct_all: '1. CUSTOMER CODE · MMH sales PIC + Tháng mở (auto) · cộng SKU mới (dòng dưới)',
      event_mmh: '7. PRODUCT PRESENTATION · đếm buổi theo MMH sales PIC + Month',
      event_mmh_team: '7. PRODUCT PRESENTATION · đếm buổi của cả nhóm theo Month',
      event_hub: 'File Marketing Offline Thái (REPORT_EVENT) · KPI Hub tự đếm theo loại event (sheet 4B)',
      event_kol_team: '6. WEEKLY REPORT · Type action = Event + Task Status ≠ Not Started / Cancel + date ≤ today (cả nhóm)',
      supp_amt: '3. SALE ORDER · tổng Amount (VND) theo MMH sales PIC + Month ÷ tỷ giá ô D5',
      supp_comp: '3. SALE ORDER · tổng Quantity theo MMH sales PIC + Month, Detail/Product type chứa từ khoá Composite (D7/E7)',
      supp_jizai: '3. SALE ORDER · tổng Quantity theo MMH sales PIC + Month, Detail/Product type chứa từ khoá JIZAI (D8/E8)'
    },
    msgNoLink: 'Chưa có link file MMH KPI FY68 ở ô D9 của tab KPI.',
    msgNoMaster: 'Không mở được file KPI FY68 (kiểm tra link và quyền truy cập của tài khoản chạy script): ',
    msgAuth: '\n\nKhông sao: việc đồng bộ tự động do file KPI tổng đảm nhận. Mở file KPI tổng ▸ sheet "_CRM_LINKS" ▸ dán link file CRM này vào cột B đúng dòng nhóm ▸ menu MMH KPI Hub ▸ ⑦ Bật đồng bộ tự động.',
    msgNoDetail: 'File KPI không có sheet "3. Detail KPI".',
    msgNotBuilt: 'Tab KPI chưa theo mẫu FY68 — chạy menu "⑪ Tạo lại tab KPI theo file KPI FY68" trước.'
  },
  en: {
    title: 'TARGET & KPI', sub: 'per the MMH KPI FY68 file',
    guide: 'One row = one KPI code of one sales PIC, exactly as in the MMH KPI FY68 file. Monthly targets come from the KPI FY68 file · Actuals are formulas on the CRM data · Distributor turnover (F codes) comes from the KPI FY68 file or is typed in.',
    fy: 'Applied FY', rate: 'Rate (local / 1 USD)', photo: 'Visits with photo only', comp: 'Composite keyword',
    jz: 'JIZAI keyword', link: 'KPI FY68 file link', cur: 'Current month (auto)', sync: 'Last sync',
    yes: 'YES', no: 'NO', linkHint: '← master KPI file · the KPI Hub syncs both ways every 5 minutes',
    legend: ['Yellow cell, blue text = typed input (targets, distributor turnover, new SKU)',
             'Black text = formula calculated from the CRM data — do not type over it',
             '% achieved is capped at 130% (turnover F codes are not capped) — per the KPI FY68 Rule',
             'Q1 = Sep·Oct·Nov · Q2 = Dec·Jan·Feb · Q3 = Mar·Apr·May · Q4 = Jun·Jul·Aug · "% to date" = up to the current month · F codes: monthly amounts, quarter = sum of 3 months',
             'Distributor turnover (F codes) is the amount of each month (monthly target and actual) → FY result = sum of the months'],
    partA: 'PART A — TEAM SUMMARY BY KPI GROUP (auto)',
    partB: 'PART B — KPI OF EACH SALES PIC BY MONTH / QUARTER',
    partC: 'PART C — END-OF-QUARTER REVIEW (sales PIC fills in · team leader approves)',
    bandT: 'MONTHLY TARGET (KPI FY68 file)', bandA: 'MONTHLY ACTUAL (auto from the CRM)', bandP: '% ACHIEVED',
    hGroup: 'Group', hGroupName: 'Group KPI', hCodes: 'KPI codes included',
    hCode: 'KPI code', hPic: 'Sales PIC', hName: 'KPI', hUnit: 'Unit', hW: 'Weight', hAgg: 'Aggregation',
    hTFY: 'Target FY', hAFY: 'Actual FY', hPct: '% FY', hYtd: '% to date', hQ: '% ', hScore: 'Score (% × weight)', hSrc: 'Actual source / rule',
    mcode: 'month code ▸', mstart: 'first day ▸', SUM: 'Sum', LAST: 'Cumulative',
    mon: ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
    tot: 'KPI score of {p} (KPIs tracked in the CRM)',
    sku: '↳ New SKU listings (type the number per month — added to the row above)',
    rQ: 'Quarter', rRes: 'Key results', rWhy: 'Reasons for gaps', rPlan: 'Plan for next quarter', rMgr: 'Team leader comment / approval', rPct: 'Quarter % (auto)',
    oldName: '9. OLD KPI (before FY68)',
    src: {
      turnover: 'MMH KPI FY68 file (MMH Turnover Report) — synced automatically, or type the amount of the month',
      manual: 'Synced from the KPI FY68 file or typed in',
      visit_dealer: '6. CUSTOMER VISITING · Sales PIC + Start date in month + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type = Dealer',
      visit_other: '6. CUSTOMER VISITING · Sales PIC + Start date in month + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today + Account type ≠ Dealer',
      visit_all: '6. CUSTOMER VISITING · Sales PIC + Start date in month + Type action = Visiting + Task Status ≠ Not Started / Cancel + date ≤ today',
      newacct_dealer: '23. NEW ACCOUNT & SKU · approved cases by PIC + Month (month of the first order) · Account type = Dealer',
      newacct_all: '23. NEW ACCOUNT & SKU · approved cases by PIC + Month (month of the first order)',
      event_mmh: '7. PRODUCT PRESENTATION · sessions by MMH sales PIC + Month',
      event_mmh_team: '7. PRODUCT PRESENTATION · sessions of the whole team by Month',
      event_hub: 'Thailand Surgical Marketing Offline file (REPORT_EVENT) · counted by the KPI Hub by event type (sheet 4B)',
      event_kol_team: '6. CUSTOMER VISITING · Type action = Event + Task Status ≠ Not Started / Cancel + date ≤ today (KOL-led events & exhibitions, whole team) by Start date',
      supp_amt: '3. SALE ORDER · Amount ÷ exchange rate (D5)', supp_comp: '3. SALE ORDER · Composite quantity', supp_jizai: '3. SALE ORDER · JIZAI quantity'
    },
    msgNoLink: 'No link to the MMH KPI FY68 file in cell D9 of the KPI tab.',
    msgNoMaster: 'Cannot open the KPI FY68 file (check the link and the access of the account running the script): ',
    msgAuth: '\n\nNo problem: the automatic sync is run by the master KPI file. Open it ▸ sheet "_CRM_LINKS" ▸ paste this CRM file link in column B of the team row ▸ menu MMH KPI Hub ▸ ⑦ Automatic sync.',
    msgNoDetail: 'The KPI file has no sheet "3. Detail KPI".',
    msgNotBuilt: 'The KPI tab is not in the FY68 layout yet — run menu "⑤ Rebuild the KPI tab from the KPI FY68 file" first.'
  }
};
/* nhóm KPI của PHẦN A */
var K68_GROUPS = {
  dental: [
    ['F3',    'Doanh số bán cho NPP – Dental & MMG (3 NPP)', ['F3-01','F3-02','F3-03']],
    ['F6-01', 'Doanh số sản phẩm mới – Composite (MMG)',       ['F6-01a','F6-01b','F6-01c']],
    ['F6-02', 'Doanh số sản phẩm mới – JIZAI',                 ['F6-02a','F6-02b','F6-02c']],
    ['C5',    'Doanh số do sales hỗ trợ bán',                   ['C5-01','C5-02','C5-03']],
    ['C6',    'Số lượng Composite do sales hỗ trợ bán',          ['C6-01','C6-02','C6-03']],
    ['C7',    'Số lượng JIZAI do sales hỗ trợ bán',              ['C7-01','C7-02','C7-03']],
    ['C3',    'Viếng thăm khách hàng (Dealer + NPP / khách hàng cuối)', ['C3-01','C3-02','C3-03','C3-04','C3-05','C3-06']],
    ['C10',   'Sự kiện đào tạo do MMH dẫn dắt',                 ['C10-03','C10-04','C10-05']],
    ['C1',    'Đại lý mới & SKU mới',                           ['C1-01','C1-02','C1-03']]],
  surgical: [
    ['F2',  'Doanh số bán cho NPP – Surgical Việt Nam', ['F2-01','F2-02','F2-03','F2-04']],
    ['C10', 'Sự kiện do MMH dẫn dắt (Presentation / Case Demo)', ['C10-01','C10-02']],
    ['C3',  'Viếng thăm khách hàng', ['C3-07','C3-08']],
    ['C1',  'Khách hàng mới & SKU mới', ['C1-04','C1-05']]],
  eyeless: [
    ['F5',  'Doanh số bán cho NPP – Eyeless Việt Nam', ['F5-00']],
    ['C3',  'Viếng thăm khách hàng', ['C3-09']],
    ['C12', 'Sự kiện do KOL dẫn dắt & triển lãm', ['C12-01','C12-02']]],
  thai: [
    ['F1',  'Turnover – Surgical Thailand / Myanmar (incl. Manipler)', ['F1-00']],
    ['F6',  'New & relaunched products – Hook + Micro Forceps', ['F6-03']],
    ['C13', 'T&E events led by KOLs & exhibitions', ['C13-00']],
    ['C11', 'T&E events led by MMH members', ['C11-01']],
    ['C4',  'Customer visits – Manipler', ['C4-02']],
    ['C2',  'New accounts & new SKU listings', ['C2-03']]]
};

/* ── tiện ích ── */
function k68Col_(n){ var s = ''; while(n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function k68Q_(name){ return "'" + String(name).replace(/'/g, "''") + "'!"; }
function k68Num_(v){ if(v === '' || v === null || v === undefined) return null; var n = Number(v); return isNaN(n) ? null : n; }
function k68Str_(v){ return v === null || v === undefined ? '' : String(v).trim(); }
function k68Abs_(a){ var m = /^([A-Z]+)(\d+)$/.exec(a); return '$' + m[1] + '$' + m[2]; }
function k68IdOf_(link){
  var s = k68Str_(link); if(!s) return '';
  var m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(s); if(m) return m[1];
  m = /[?&]id=([a-zA-Z0-9_-]{20,})/.exec(s); if(m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(s) ? s : '';
}

/* ════════════════ 1. DỰNG TAB KPI (công thức + định dạng) ════════════════ */
function k68Build_(sh, team, keep){
  var spec = K68_SPEC[team]; if(!spec) throw new Error('KPI FY68: không có cấu hình cho nhóm "' + team + '"');
  var L = spec.lang || 'vi', T = K68_TXT[L], SRC = K68_SRC[L], C = K68, NC = C.NC;
  var groups = K68_GROUPS[team] || [];
  var grid = [], sty = [], merges = [], cf = { pct: [] }, heights = {};
  function row(){ var r = []; for(var i = 0; i < NC; i++) r.push(''); grid.push(r); var s = []; for(var j = 0; j < NC; j++) s.push({}); sty.push(s); return grid.length; }
  function put(r, c, v, st){ grid[r - 1][c - 1] = v; if(st) stl(r, c, c, st); }
  function stl(r, c1, c2, st){ for(var c = c1; c <= c2; c++){ var o = sty[r - 1][c - 1]; for(var k in st) o[k] = st[k]; } }
  var A = k68Col_, TC = function(i){ return A(C.t0 + i); }, AC = function(i){ return A(C.a0 + i); };
  var S = {}; for(var k in K68_SET) S[k] = k68Abs_(K68_SET[k]);
  var NAVY = '#1F3864', HEAD = '#D9E1F2', INP = '#FFF2CC', PICB = '#E2EFDA', TOT = '#EDEDED', BLUE = '#0000FF', GREY = '#A6A6A6';

  /* 1 · tiêu đề */
  var r = row(); put(r, 1, K68_LAYOUT, { fc: GREY, fs: 7 }); put(r, 2, T.title + ' — ' + spec.title + '  (' + T.sub + ')', { b: 1, fs: 15, fc: NAVY });
  r = row(); put(r, 2, T.guide, { fc: '#595959', i: 1 });
  row();
  /* 2 · cài đặt (hàng 4 → 11) */
  var set = [
    [4, T.fy, 'FY68', 'fy'], [5, T.rate, 26000, 'rate'], [6, T.photo, T.no, 'photo'],
    [7, T.comp, 'composite', 'comp'], [8, T.jz, 'jizai', 'jz'], [9, T.link, K68_MASTER_LINK, 'link'],
    [10, T.cur, '=YEAR(TODAY())*100+MONTH(TODAY())', 'cur'], [11, T.sync, '', 'sync']];
  var useKw = spec.pics.some(function(p){ return p.rows.some(function(x){ return /^supp_/.test(x.key); }); });
  var usePhoto = (L === 'vi');
  while(grid.length < 11) row();
  set.forEach(function(s){
    var rr = s[0], key = s[3];
    if(key === 'rate' && !useKw) return;
    if((key === 'comp' || key === 'jz') && !useKw) return;
    if(key === 'photo' && !usePhoto) return;
    if(key === 'fy'){ put(rr, 2, s[1], { b: 1 }); put(rr, 3, s[2], { bg: INP, fc: BLUE, b: 1, ha: 'center' }); put(rr, 1, 'set:fy', { fc: GREY, fs: 7 }); return; }
    put(rr, 1, 'set:' + key, { fc: GREY, fs: 7 });
    put(rr, 2, s[1], { b: 1 }); merges.push([rr, 2, rr, 3]);
    if(key === 'cur'){ put(rr, 4, s[2], { nf: '0', ha: 'left', fc: '#000000' }); return; }
    if(key === 'sync'){ put(rr, 4, '', { fc: '#595959', i: 1 }); return; }
    put(rr, 4, s[2], { bg: INP, fc: BLUE, nf: key === 'rate' ? '#,##0' : '@', ha: 'left' });
    if(key === 'comp'){ put(rr, 5, '', { bg: INP, fc: BLUE }); }
    if(key === 'jz'){ put(rr, 5, '', { bg: INP, fc: BLUE }); }
    if(key === 'link'){ put(rr, 6, T.linkHint, { fc: '#C00000', i: 1 }); }
  });
  /* chú thích */
  T.legend.forEach(function(t, i){ put(4 + i, 9, '• ' + t, { fc: '#404040', fs: 9 }); });

  /* 3 · PHẦN A — khung, điền sau khi biết dòng PHẦN B */
  row();
  var rA = row(); put(rA, 1, 'partA', { fc: GREY, fs: 7 }); put(rA, 2, T.partA, { b: 1, fc: '#FFFFFF' }); stl(rA, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rAh = row(); put(rAh, 1, 'hdrA', { fc: GREY, fs: 7 });
  var hA = {}; hA[C.code] = T.hGroup; hA[C.name] = T.hGroupName; hA[C.unit] = T.hUnit; hA[C.agg] = T.hAgg; hA[C.tFY] = T.hTFY; hA[C.aFY] = T.hAFY;
  hA[C.pct] = T.hPct; hA[C.ytd] = T.hYtd; hA[C.src] = T.hCodes;
  var TG = L === 'en' ? 'Tgt ' : 'TG ';
  for(var i = 0; i < 12; i++){ hA[C.t0 + i] = TG + T.mon[i]; hA[C.a0 + i] = T.mon[i]; }
  for(var q = 0; q < 4; q++) hA[C.q0 + q] = T.hQ + 'Q' + (q + 1);
  for(var c in hA) put(rAh, +c, hA[c]);
  stl(rAh, 2, NC, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var aRows = [];
  groups.forEach(function(g){ var rr = row(); aRows.push({ r: rr, g: g }); });
  row();

  /* 4 · PHẦN B */
  var rB = row(); put(rB, 1, 'partB', { fc: GREY, fs: 7 }); put(rB, 2, T.partB); stl(rB, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rBand = row(); put(rBand, 1, 'band', { fc: GREY, fs: 7 });
  put(rBand, C.t0, T.bandT); merges.push([rBand, C.t0, rBand, C.t0 + 11]);
  put(rBand, C.a0, T.bandA); merges.push([rBand, C.a0, rBand, C.a0 + 11]);
  put(rBand, C.pct, T.bandP); merges.push([rBand, C.pct, rBand, C.q0 + 3]);
  stl(rBand, C.t0, C.t0 + 11, { bg: '#FCE4D6', b: 1, ha: 'center' }); stl(rBand, C.a0, C.a0 + 11, { bg: '#DDEBF7', b: 1, ha: 'center' });
  stl(rBand, C.pct, C.q0 + 3, { bg: '#E2EFDA', b: 1, ha: 'center' });
  var rH = row(); put(rH, 1, 'hdr', { fc: GREY, fs: 7 });
  var hB = {}; hB[C.code] = T.hCode; hB[C.pic] = T.hPic; hB[C.name] = T.hName; hB[C.unit] = T.hUnit; hB[C.w] = T.hW; hB[C.agg] = T.hAgg;
  hB[C.tFY] = T.hTFY; hB[C.aFY] = T.hAFY; hB[C.pct] = T.hPct; hB[C.ytd] = T.hYtd; hB[C.score] = T.hScore; hB[C.src] = T.hSrc;
  for(i = 0; i < 12; i++){ hB[C.t0 + i] = TG + T.mon[i]; hB[C.a0 + i] = T.mon[i]; }
  for(q = 0; q < 4; q++) hB[C.q0 + q] = T.hQ + 'Q' + (q + 1);
  for(c in hB) put(rH, +c, hB[c]);
  stl(rH, 2, NC, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var MC = row(), MD = row();
  put(MC, 1, 'months', { fc: GREY, fs: 7 }); put(MD, 1, 'mstart', { fc: GREY, fs: 7 });
  put(MC, 2, T.mcode, { fc: '#7F7F7F', i: 1 }); put(MD, 2, T.mstart, { fc: '#7F7F7F', i: 1 });
  for(i = 0; i < 12; i++){
    var tcl = TC(i), acl = AC(i);
    put(MC, C.t0 + i, i === 0 ? '=(1958+VALUE(SUBSTITUTE(UPPER(' + S.fy + '),"FY","")))*100+9'
                              : '=IF(MOD(' + TC(i - 1) + MC + ',100)=12,' + TC(i - 1) + MC + '+89,' + TC(i - 1) + MC + '+1)', { nf: '0', fc: '#7F7F7F', ha: 'center', fs: 8 });
    put(MC, C.a0 + i, '=' + tcl + MC, { nf: '0', fc: '#7F7F7F', ha: 'center', fs: 8 });
    put(MD, C.t0 + i, '=DATE(INT(' + tcl + MC + '/100),MOD(' + tcl + MC + ',100),1)', { nf: 'mm/yyyy', fc: '#7F7F7F', ha: 'center', fs: 8 });
    put(MD, C.a0 + i, '=' + tcl + MD, { nf: 'mm/yyyy', fc: '#7F7F7F', ha: 'center', fs: 8 });
  }
  var MCr = '$' + TC(0) + '$' + MC + ':$' + TC(11) + '$' + MC, MCa = '$' + AC(0) + '$' + MC + ':$' + AC(11) + '$' + MC;

  /* nguồn dữ liệu */
  var N = K68_N, N2 = K68_N2;
  function rg(tab, col, n){ return k68Q_(SRC[tab]) + '$' + col + '$4:$' + col + '$' + (n || N); }
  var capF = function(expr, code){ return /^F/.test(code) ? expr : 'MIN(' + expr + ',13/10)'; };

  function actualFormula(key, rr, i){
    var X = AC(i), md = X + '$' + MD, mc = X + '$' + MC, pic = '$' + A(C.pic) + rr;
    var dates = rg('wk', 'E') + ',">="&' + md + ',' + rg('wk', 'E') + ',"<"&EDATE(' + md + ',1),' + rg('wk', 'E') + ',"<="&TODAY(),' + rg('wk', 'R') + ',"<>Not Started",' + rg('wk', 'R') + ',"<>Cancel*"';   /* v1.6 · Cancel visits are not counted */
    var vis = rg('wk', 'G') + ',' + pic + ',' + rg('wk', 'N') + ',"Visiting",' + dates;
    if(key === 'visit_dealer') vis += ',' + rg('wk', 'I') + ',"Dealer"';
    if(key === 'visit_other')  vis += ',' + rg('wk', 'I') + ',"<>Dealer"';
    if(/^visit_/.test(key)){
      if(!usePhoto) return '=COUNTIFS(' + vis + ')';
      return '=IF(' + S.photo + '="' + T.yes + '",COUNTIFS(' + vis + ',' + rg('wk', 'V') + ',"<>"),COUNTIFS(' + vis + '))';
    }
    if(key === 'event_kol_team') return '=COUNTIFS(' + rg('wk', 'N') + ',"Event",' + dates + ')';
    /* v1.9 — approved cases of sheet NEW ACCOUNT & SKU (D = PIC · G = Month · L = Account type · AA = Status) */
    if(key === 'newacct_dealer' || key === 'newacct_all')
      return '=COUNTIFS(' + rg('na', 'D') + ',' + pic + ',' + rg('na', 'G') + ',' + mc + ',' + rg('na', 'AA') + ',"Approved"' + (key === 'newacct_dealer' ? ',' + rg('na', 'L') + ',"Dealer"' : '') + ')';
    if(key === 'event_mmh') return '=SUMPRODUCT((' + rg('pr', 'D', N2) + '=' + pic + ')*(' + rg('pr', 'H', N2) + '&""=' + mc + '&""))';
    if(key === 'event_mmh_team') return '=SUMPRODUCT(--(' + rg('pr', 'H', N2) + '&""=' + mc + '&""))';
    var odP = 'ISNUMBER(SEARCH(' + pic + ',' + rg('od', 'Q', N2) + '))*(' + rg('od', 'F', N2) + '&""=' + mc + '&"")';
    if(key === 'supp_amt') return '=IF(N(' + S.rate + ')>0,SUMPRODUCT(' + odP + '*IFERROR(' + rg('od', 'V', N2) + '*1,0))/' + S.rate + ',0)';
    if(key === 'supp_comp' || key === 'supp_jizai'){
      var k1 = key === 'supp_comp' ? S.comp1 : S.jz1, k2 = key === 'supp_comp' ? S.comp2 : S.jz2;
      var txt = rg('od', 'R', N2) + '&" "&' + rg('od', 'S', N2);
      return '=SUMPRODUCT(' + odP + '*(((LEN(' + k1 + ')>0)*ISNUMBER(SEARCH(' + k1 + ',' + txt + '))+(LEN(' + k2 + ')>0)*ISNUMBER(SEARCH(' + k2 + ',' + txt + ')))>0)*IFERROR(' + rg('od', 'T', N2) + '*1,0))';
    }
    return '';
  }
  /* các cột tổng / % dùng chung cho dòng KPI và dòng nhóm */
  function rowCalc(rr, agg, code){
    var tr = TC(0) + rr + ':' + TC(11) + rr, ar = AC(0) + rr + ':' + AC(11) + rr;
    var T_ = A(C.tFY) + rr, A_ = A(C.aFY) + rr;
    if(agg === 'LAST'){
      put(rr, C.tFY, '=IF(COUNT(' + tr + ')=0,"",LOOKUP(10^300,' + tr + '))');
      put(rr, C.aFY, '=IF(COUNT(' + ar + ')=0,"",LOOKUP(10^300,' + ar + '))');
    } else {
      put(rr, C.tFY, '=IF(COUNT(' + tr + ')=0,"",SUM(' + tr + '))');
      put(rr, C.aFY, '=IF(COUNT(' + ar + ')=0,"",SUM(' + ar + '))');
    }
    put(rr, C.pct, '=IF(OR(' + A_ + '="",N(' + T_ + ')=0),"",' + capF(A_ + '/' + T_, code) + ')');
    if(agg === 'LAST'){
      var tNow = 'LOOKUP(' + S.cur + ',' + MCr + ',' + tr + ')';
      put(rr, C.ytd, '=IFERROR(IF(OR(COUNT(' + ar + ')=0,N(' + tNow + ')=0),"",' + capF('LOOKUP(10^300,' + ar + ')/' + tNow, code) + '),"")');
    } else {
      var tY = 'SUMPRODUCT(--(' + MCr + '<=' + S.cur + '),' + tr + ')', aY = 'SUMPRODUCT(--(' + MCa + '<=' + S.cur + '),' + ar + ')';
      put(rr, C.ytd, '=IF(' + tY + '=0,"",' + capF(aY + '/' + tY, code) + ')');
    }
    for(var q = 0; q < 4; q++){
      var t1 = TC(q * 3), t3 = TC(q * 3 + 2), a1 = AC(q * 3), a3 = AC(q * 3 + 2);
      var started = t1 + '$' + MC + '>' + S.cur;
      if(agg === 'LAST'){
        /* Rule 13: doanh số lũy kế ⇒ quý = số cuối quý − số cuối quý trước (cả target lẫn actual) */
        var tq = '(LOOKUP(MIN(' + S.cur + ',' + t3 + '$' + MC + '),' + MCr + ',' + tr + ')' + (q ? '-N(' + TC(q * 3 - 1) + rr + ')' : '') + ')';
        var aq = '(LOOKUP(10^300,' + AC(0) + rr + ':' + a3 + rr + ')' + (q ? '-IFERROR(LOOKUP(10^300,' + AC(0) + rr + ':' + AC(q * 3 - 1) + rr + '),0)' : '') + ')';
        put(rr, C.q0 + q, '=IFERROR(IF(OR(' + started + ',COUNT(' + AC(0) + rr + ':' + a3 + rr + ')=0,' + tq + '=0),"",' +
            capF(aq + '/' + tq, code) + '),"")');
      } else {
        var mq = t1 + '$' + MC + ':' + t3 + '$' + MC;
        var tq2 = 'SUMPRODUCT(--(' + mq + '<=' + S.cur + '),' + t1 + rr + ':' + t3 + rr + ')';
        var aq2 = 'SUMPRODUCT(--(' + mq + '<=' + S.cur + '),' + a1 + rr + ':' + a3 + rr + ')';
        put(rr, C.q0 + q, '=IF(OR(' + started + ',' + tq2 + '=0),"",' + capF(aq2 + '/' + tq2, code) + ')');
      }
    }
  }
  function numFmt(unit){ return '#,##0'; }

  var kpiRows = [], picTot = [];
  spec.pics.forEach(function(p, pi){
    var rp = row(); put(rp, 1, 'pic', { fc: GREY, fs: 7 });
    put(rp, C.code, '▸ ' + p.pic + ' — ' + p.role); stl(rp, 2, NC, { bg: PICB, b: 1 });
    var first = 0, last = 0;
    p.rows.forEach(function(x){
      var rr = row(); if(!first) first = rr; last = rr;
      kpiRows.push({ r: rr, x: x, pic: p.pic });
      put(rr, 1, 'kpi:' + x.key, { fc: GREY, fs: 7 });
      put(rr, C.code, x.code, { b: 1, ha: 'center' }); put(rr, C.pic, p.pic, { ha: 'center' }); put(rr, C.name, x.name, { wrap: 1 });
      put(rr, C.unit, x.unit, { ha: 'center' }); put(rr, C.w, x.w == null ? '' : x.w, { nf: '0%', ha: 'center', fc: BLUE });
      put(rr, C.agg, T[x.agg] || x.agg, { ha: 'center', fc: '#595959' });
      for(var i = 0; i < 12; i++){
        var tv = x.t && x.t[i] != null ? x.t[i] : '';
        put(rr, C.t0 + i, tv, { bg: INP, fc: BLUE, nf: numFmt(x.unit) });
        if(K68_MANUAL[x.key]) put(rr, C.a0 + i, '', { bg: INP, fc: BLUE, nf: numFmt(x.unit) });
        else put(rr, C.a0 + i, actualFormula(x.key, rr, i), { nf: numFmt(x.unit) });
      }
      rowCalc(rr, x.agg, x.code);
      put(rr, C.score, '=IF(OR(' + A(C.pct) + rr + '="",N(' + A(C.w) + rr + ')=0),"",' + A(C.pct) + rr + '*' + A(C.w) + rr + ')', { nf: '0.0%' });
      put(rr, C.src, T.src[x.key] || '', { fc: '#595959', fs: 9, wrap: 1 });
      stl(rr, C.tFY, C.tFY, { nf: numFmt(x.unit), b: 1 }); stl(rr, C.aFY, C.aFY, { nf: numFmt(x.unit), b: 1 });
      stl(rr, C.pct, C.q0 + 3, { nf: '0%', ha: 'center' });
      /* v1.9 — no typed "new SKU" row any more: new SKUs are approved cases of sheet 23 */
    });
    /* dòng tổng điểm của sales */
    var rt = row(); put(rt, 1, 'tot', { fc: GREY, fs: 7 });
    put(rt, C.pic, p.pic, { ha: 'center' }); put(rt, C.name, T.tot.replace('{p}', p.pic));
    var W = A(C.w) + first + ':' + A(C.w) + last;
    put(rt, C.w, '=SUM(' + W + ')', { nf: '0%', ha: 'center' });
    [C.pct, C.ytd, C.q0, C.q0 + 1, C.q0 + 2, C.q0 + 3].forEach(function(cc){
      var R = A(cc) + first + ':' + A(cc) + last;
      put(rt, cc, '=IFERROR(SUMPRODUCT(IFERROR(' + R + '*1,0),' + W + ')/SUMPRODUCT(--(' + R + '<>""),' + W + '),"")', { nf: '0%', ha: 'center' });
    });
    put(rt, C.score, '=IF(COUNT(' + A(C.score) + first + ':' + A(C.score) + last + ')=0,"",SUM(' + A(C.score) + first + ':' + A(C.score) + last + '))', { nf: '0.0%' });
    stl(rt, 2, NC, { bg: TOT, b: 1 });
    picTot.push({ pic: p.pic, r: rt });
    row();
  });
  var bFirst = kpiRows.length ? kpiRows[0].r : MD + 1, bLast = kpiRows.length ? kpiRows[kpiRows.length - 1].r + 1 : MD + 1;

  /* PHẦN A — công thức nhóm */
  var unitOf = {}, aggOf = {}; kpiRows.forEach(function(k){ unitOf[k.x.code] = k.x.unit; aggOf[k.x.code] = k.x.agg; });
  aRows.forEach(function(o){
    /* ⚠️ không dùng mảng {"a","b"} — Google Sheet đặt vùng Việt Nam báo #ERROR! ⇒ cộng SUMIF từng mã */
    var rr = o.r, g = o.g, codes = g[2], BR = '$' + A(C.code) + '$' + bFirst + ':$' + A(C.code) + '$' + bLast;
    put(rr, 1, 'grp', { fc: GREY, fs: 7 });
    put(rr, C.code, g[0], { b: 1, ha: 'center' }); put(rr, C.name, g[1], { wrap: 1 });
    var unit = unitOf[codes[0]] || '', agg = aggOf[codes[0]] || 'SUM';
    put(rr, C.unit, unit, { ha: 'center' }); put(rr, C.agg, T[agg] || agg, { ha: 'center', fc: '#595959' });
    for(var i = 0; i < 12; i++){
      [C.t0 + i, C.a0 + i].forEach(function(cc){
        var col = A(cc) + '$' + bFirst + ':' + A(cc) + '$' + bLast;
        var sum = codes.map(function(c){ return 'SUMIF(' + BR + ',"' + c + '",' + col + ')'; }).join('+');
        var cnt = codes.map(function(c){ return 'COUNTIFS(' + BR + ',"' + c + '",' + col + ',"<>")'; }).join('+');
        put(rr, cc, agg === 'LAST' ? '=IF(' + cnt + '=0,"",' + sum + ')' : '=' + sum, { nf: '#,##0' });
      });
    }
    rowCalc(rr, agg, g[0].charAt(0) === 'F' ? 'F' : 'C');
    put(rr, C.src, codes.join(', '), { fc: '#595959', fs: 9 });
    stl(rr, C.tFY, C.aFY, {}); stl(rr, C.tFY, C.tFY, { nf: '#,##0', b: 1 }); stl(rr, C.aFY, C.aFY, { nf: '#,##0', b: 1 });
    stl(rr, C.pct, C.q0 + 3, { nf: '0%', ha: 'center' });
  });

  /* PHẦN C — review quý */
  var rC = row(); put(rC, 1, 'partC', { fc: GREY, fs: 7 }); put(rC, 2, T.partC); stl(rC, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rCh = row(); put(rCh, 1, 'hdrC', { fc: GREY, fs: 7 });
  put(rCh, 2, T.rQ); put(rCh, 3, T.hPic); put(rCh, 4, T.rRes); put(rCh, 5, T.rWhy); put(rCh, 9, T.rPlan); put(rCh, 15, T.rMgr); put(rCh, 21, T.rPct);
  merges.push([rCh, 5, rCh, 8], [rCh, 9, rCh, 14], [rCh, 15, rCh, 20]);
  stl(rCh, 2, 21, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  for(q = 0; q < 4; q++){
    picTot.forEach(function(pt){
      var rr = row(); put(rr, 1, 'review', { fc: GREY, fs: 7 });
      put(rr, 2, 'Q' + (q + 1), { b: 1, ha: 'center' }); put(rr, 3, pt.pic, { ha: 'center' });
      put(rr, 4, '', { wrap: 1 }); merges.push([rr, 5, rr, 8], [rr, 9, rr, 14], [rr, 15, rr, 20]);
      stl(rr, 5, 20, { wrap: 1 });
      put(rr, 21, '=' + A(C.q0 + q) + pt.r, { nf: '0%', ha: 'center', b: 1 });
      heights[rr] = 42;
    });
  }

  /* giữ lại dữ liệu nhập tay khi dựng lại */
  if(keep){
    if(keep.set) for(var sk in keep.set){ var a1 = K68_SET[sk]; if(!a1 || sk === 'cur' || sk === 'fy') continue;
      var m = /^([A-Z]+)(\d+)$/.exec(a1), cc = 0; for(var z = 0; z < m[1].length; z++) cc = cc * 26 + m[1].charCodeAt(z) - 64;
      if(sk === 'comp2' && String(keep.set[sk]).toLowerCase() === 'mmg') continue;
      if(grid[+m[2] - 1] && grid[+m[2] - 1][1] && keep.set[sk] !== '' && keep.set[sk] != null) grid[+m[2] - 1][cc - 1] = keep.set[sk]; }
    if(keep.set && keep.set.fy) grid[3][2] = keep.set.fy;
    kpiRows.forEach(function(k){
      var o = keep.rows[k.x.code]; if(!o) return;
      for(var i = 0; i < 12; i++){
        if(o.t && o.t[i] !== '' && o.t[i] != null) grid[k.r - 1][C.t0 + i - 1] = o.t[i];
        if(K68_MANUAL[k.x.key] && o.a && o.a[i] !== '' && o.a[i] != null) grid[k.r - 1][C.a0 + i - 1] = o.a[i];
      }
    });
    if(keep.review){ grid.forEach(function(g, i){ if(g[0] === 'review'){ var kk = g[1] + '|' + g[2], v = keep.review[kk]; if(v){ g[3] = v[0]; g[4] = v[1]; g[8] = v[2]; g[14] = v[3]; } } }); }
  }
  return { grid: grid, sty: sty, merges: merges, heights: heights, kpiRows: kpiRows, aRows: aRows, picTot: picTot,
           MC: MC, MD: MD, rH: rH, rA: rA, rB: rB, lang: L, useKw: useKw, usePhoto: usePhoto };
}

/* ghi kết quả k68Build_ ra sheet thật */
function k68Write_(sh, B){
  var nr = B.grid.length, NC = K68.NC;
  if(sh.getMaxColumns() < NC) sh.insertColumnsAfter(sh.getMaxColumns(), NC - sh.getMaxColumns());
  if(sh.getMaxRows() < nr + 20) sh.insertRowsAfter(sh.getMaxRows(), nr + 20 - sh.getMaxRows());
  var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  try{ all.breakApart(); }catch(e){}
  all.clear(); try{ all.clearDataValidations(); }catch(e){}
  try{ sh.setConditionalFormatRules([]); }catch(e){}
  var rg = sh.getRange(1, 1, nr, NC);
  function mapS(f, d){ return B.sty.map(function(r){ return r.map(function(o){ var v = f(o); return v == null ? d : v; }); }); }
  rg.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  rg.setNumberFormats(mapS(function(o){ return o.nf; }, '0.###############'));
  /* ⚠️ công thức phải ghi bằng setFormulas (cú pháp chuẩn, dấu phẩy): ghi bằng setValues thì Google Sheet đặt
     vùng Việt Nam hiểu như gõ tay ⇒ cần dấu ";" ⇒ #ERROR!. Ghi giá trị trước, rồi ghi công thức theo từng đoạn liền nhau. */
  function isF(x){ return typeof x === 'string' && x.charAt(0) === '='; }
  rg.setValues(B.grid.map(function(r){ return r.map(function(x){ return isF(x) ? '' : x; }); }));
  var SEMI = fmlSemi_(sh);                                    /* ⭐ v22 — đúng dấu phân cách của file */
  B.grid.forEach(function(row, i){
    var j = 0;
    while(j < NC){
      if(!isF(row[j])){ j++; continue; }
      var k = j; while(k < NC && isF(row[k])) k++;
      sh.getRange(i + 1, j + 1, 1, k - j).setFormulas([row.slice(j, k).map(function(f){ return fmlLoc_(f, SEMI); })]);
      j = k;
    }
  });
  rg.setBackgrounds(mapS(function(o){ return o.bg; }, null));
  rg.setFontColors(mapS(function(o){ return o.fc; }, '#000000'));
  rg.setFontWeights(mapS(function(o){ return o.b ? 'bold' : 'normal'; }, 'normal'));
  rg.setFontStyles(mapS(function(o){ return o.i ? 'italic' : 'normal'; }, 'normal'));
  rg.setFontSizes(mapS(function(o){ return o.fs; }, 10));
  rg.setHorizontalAlignments(mapS(function(o){ return o.ha; }, 'left'));
  rg.setWraps(mapS(function(o){ return !!o.wrap; }, false));
  B.merges.forEach(function(m){ sh.getRange(m[0], m[1], m[2] - m[0] + 1, m[3] - m[1] + 1).merge(); });
  for(var r in B.heights) sh.setRowHeight(+r, B.heights[r]);
  var W = { 1: 22, 2: 78, 3: 78, 4: 360, 5: 70, 6: 64, 7: 80, 8: 90, 21: 95, 34: 72, 35: 84, 40: 86, 41: 430 };
  for(var c = 1; c <= NC; c++) sh.setColumnWidth(c, W[c] || (c >= 36 && c <= 39 ? 62 : 72));
  sh.setFrozenColumns(4);
  /* dropdown */
  var T = K68_TXT[B.lang];
  sh.getRange(K68_SET.fy).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['FY67','FY68','FY69','FY70','FY71'], true).build());
  if(B.usePhoto) sh.getRange(K68_SET.photo).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([T.yes, T.no], true).build());
  /* tô màu % đạt — chỉ ô có SỐ (ô trống / "" không tô) */
  var rules = [], lastTot = B.picTot[B.picTot.length - 1].r;
  [[B.rA + 2, Math.max(B.aRows.length, 1)], [B.MD + 1, lastTot - B.MD]].forEach(function(z){
    var rg0 = sh.getRange(z[0], K68.pct, z[1], 6), a1 = k68Col_(K68.pct) + z[0];
    [['>=1', '#C6EFCE', '#006100'], ['>=4/5', '#FFEB9C', '#9C5700'], ['<4/5', '#FFC7CE', '#9C0006']].forEach(function(c, i){
      var f = i === 1 ? '=AND(ISNUMBER(' + a1 + '),' + a1 + '>=4/5,' + a1 + '<1)' : '=AND(ISNUMBER(' + a1 + '),' + a1 + c[0] + ')';
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f).setBackground(c[1]).setFontColor(c[2]).setRanges([rg0]).build());
    });
  });
  sh.setConditionalFormatRules(rules);
  /* viền bảng */
  sh.getRange(B.rA + 1, 2, (B.aRows.length || 0) + 1, NC - 1).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(B.rH - 1, 2, B.picTot[B.picTot.length - 1].r - B.rH + 2, NC - 1).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
}

/* đọc dữ liệu nhập tay của tab (để dựng lại không mất) */
function k68Snapshot_(sh){
  var lr = sh.getLastRow(); if(lr < 5) return null;
  var v = sh.getRange(1, 1, lr, K68.NC).getValues(), f = sh.getRange(1, 1, lr, K68.NC).getFormulas();
  if(!v.some(function(r){ return k68Str_(r[0]) === 'hdr'; })) return null;
  var out = { set: {}, rows: {}, review: {} };
  for(var k in K68_SET){ var a = K68_SET[k], m = /^([A-Z]+)(\d+)$/.exec(a), c = 0; for(var z = 0; z < m[1].length; z++) c = c * 26 + m[1].charCodeAt(z) - 64;
    var rr = +m[2] - 1; if(rr < v.length && !f[rr][c - 1]) out.set[k] = v[rr][c - 1]; }
  for(var i = 0; i < v.length; i++){
    var tag = k68Str_(v[i][0]);
    if(/^kpi:/.test(tag)){
      var code = k68Str_(v[i][K68.code - 1]), o = out.rows[code] = { t: [], a: [], sku: [] };
      for(var j = 0; j < 12; j++){
        o.t.push(f[i][K68.t0 - 1 + j] ? '' : v[i][K68.t0 - 1 + j]);
        o.a.push(f[i][K68.a0 - 1 + j] ? '' : v[i][K68.a0 - 1 + j]);
        if(i + 1 < v.length && k68Str_(v[i + 1][0]) === 'sku') o.sku.push(f[i + 1][K68.a0 - 1 + j] ? '' : v[i + 1][K68.a0 - 1 + j]);
      }
    }
    if(tag === 'review'){ var rv = [v[i][3], v[i][4], v[i][8], v[i][14]]; if(rv.some(function(x){ return k68Str_(x); })) out.review[v[i][1] + '|' + v[i][2]] = rv; }
  }
  return out;
}

/* dựng (hoặc dựng lại) tab KPI — tab cũ không đúng mẫu được đổi tên và ẩn đi */
function k68Setup_(ss, name, team){
  try{ naSheet_(); }catch(e){}        /* v1.9 — the C2-03 formula points to sheet 23 ⇒ it must exist first */
  var T = K68_TXT[(K68_SPEC[team] || {}).lang || 'vi'];
  var sh = ss.getSheetByName(name), keep = null, idx = null;
  if(sh){
    keep = k68Snapshot_(sh);
    if(!keep){
      idx = sh.getIndex ? sh.getIndex() : null;
      var old = T.oldName, n = 2; while(ss.getSheetByName(old)) old = T.oldName + ' ' + (n++);
      sh.setName(old); try{ sh.hideSheet(); }catch(e){}
      sh = idx ? ss.insertSheet(name, idx - 1) : ss.insertSheet(name);
    }
  } else sh = ss.insertSheet(name);
  var B = k68Build_(sh, team, keep);
  k68Write_(sh, B);
  return { sheet: sh, rows: B.kpiRows.length, kept: !!keep, build: B };
}

/* ════════════════ 2. ĐỌC TAB KPI CHO WEB APP ════════════════ */
function k68Read_(sh){
  var lr = sh.getLastRow(); if(lr < 5) return null;
  var v = sh.getRange(1, 1, lr, K68.NC).getValues(), C = K68, out = { groups: [], pics: [], months: [], settings: {} }, cur = null;
  if(!v.some(function(r){ return k68Str_(r[0]) === 'hdr'; })) return null;
  function nums(r, c0){ var a = []; for(var j = 0; j < 12; j++) a.push(k68Num_(r[c0 - 1 + j])); return a; }
  function pack(r, i, tag){
    return { row: i + 1, key: tag.replace(/^kpi:/, ''), code: k68Str_(r[C.code - 1]), pic: k68Str_(r[C.pic - 1]), name: k68Str_(r[C.name - 1]),
      unit: k68Str_(r[C.unit - 1]), w: k68Num_(r[C.w - 1]), agg: k68Str_(r[C.agg - 1]), tFY: k68Num_(r[C.tFY - 1]), t: nums(r, C.t0),
      aFY: k68Num_(r[C.aFY - 1]), a: nums(r, C.a0), pct: k68Num_(r[C.pct - 1]), ytd: k68Num_(r[C.ytd - 1]),
      q: [0,1,2,3].map(function(q){ return k68Num_(r[C.q0 - 1 + q]); }), score: k68Num_(r[C.score - 1]), src: k68Str_(r[C.src - 1]),
      manual: !!K68_MANUAL[tag.replace(/^kpi:/, '')] };
  }
  for(var i = 0; i < v.length; i++){
    var r = v[i], tag = k68Str_(r[0]);
    if(!tag) continue;
    if(/^set:/.test(tag)){ var sk = tag.slice(4); out.settings[sk] = r[sk === 'fy' ? 2 : 3]; if(sk === 'sync') out.settings.checked = r[4]; continue; }
    if(tag === 'months'){ out.months = nums(r, C.t0).map(function(x){ return x == null ? '' : String(Math.round(x)); }); continue; }
    if(tag === 'hdr'){ out.monthLabels = []; for(var j = 0; j < 12; j++) out.monthLabels.push(k68Str_(r[C.a0 - 1 + j])); continue; }
    if(tag === 'grp'){ out.groups.push(pack(r, i, tag)); continue; }
    if(tag === 'pic'){ var s0 = k68Str_(r[C.code - 1]).replace(/^▸\s*/, ''), pp = s0.split(' — '); cur = { pic: pp[0], role: pp.slice(1).join(' — '), rows: [], total: null }; out.pics.push(cur); continue; }
    if(/^kpi:/.test(tag) && cur){ cur.rows.push(pack(r, i, tag)); continue; }
    if(tag === 'sku' && cur && cur.rows.length){ cur.rows[cur.rows.length - 1].sku = nums(r, C.a0); continue; }
    if(tag === 'tot' && cur){ cur.total = { w: k68Num_(r[C.w - 1]), pct: k68Num_(r[C.pct - 1]), ytd: k68Num_(r[C.ytd - 1]),
      q: [0,1,2,3].map(function(q){ return k68Num_(r[C.q0 - 1 + q]); }), score: k68Num_(r[C.score - 1]) }; continue; }
  }
  var d = out.settings.sync; out.settings.sync = d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') : k68Str_(d);
  out.settings.hasLink = !!(k68IdOf_(out.settings.link) || k68IdOf_(K68_MASTER_LINK)); delete out.settings.link;
  out.settings.checked = k68Str_(out.settings.checked).replace(/^(KPI Hub kiểm tra|KPI Hub check):\s*/, '');
  if(!out.settings.checked){ try{ out.settings.checked = PropertiesService.getScriptProperties().getProperty('K68_LASTCHECK') || ''; }catch(e){} }
  out.fy = k68Str_(out.settings.fy);
  return out;
}
/* khối "blocks" kiểu cũ cho thẻ Dashboard (visiting · present · newacct) */
function k68Legacy_(R){
  var map = { visiting: /^visit_/, present: /^event_mmh/, newacct: /^newacct_/ }, out = [];
  Object.keys(map).forEach(function(id){
    var t = 0, a = 0, hit = false;
    R.pics.forEach(function(p){ p.rows.forEach(function(x){
      if(!map[id].test(x.key)) return;
      if(id === 'present' && x.key === 'event_mmh' && R.pics.some(function(pp){ return pp.rows.some(function(y){ return y.key === 'event_mmh_team'; }); })) return;
      hit = true; t += x.tFY || 0; a += x.aFY || 0; }); });
    if(hit) out.push({ id: id, rows: [], grand: { targetFY: t, fyActual: a } });
  });
  return out;
}

/* ════════════════ 3. ĐỒNG BỘ 2 CHIỀU VỚI FILE KPI TỔNG (MMH KPI FY68) ════════════════
 * Chiều ①  CRM → file KPI tổng : actual tự tính của tab KPI đẩy sang cột "<tháng> Actual" của sheet 3. Detail KPI.
 * Chiều ②  file KPI tổng → CRM : target 12 tháng + actual do nguồn khác đưa vào (doanh số NPP mã F…) dán về tab KPI.
 * ⭐ Bản ổn định: file CRM KHÔNG cần quyền mới (không gọi web, không tạo trigger).
 *   · Tự động 5 phút/lần: do KPI Hub (script của file KPI tổng) chạy — nó mở tab KPI của từng file CRM đã đăng ký.
 *   · Menu ⑫ / nút trên app: file CRM tự mở thẳng file KPI tổng bằng link (cần quyền sửa file KPI tổng).
 * Tháng đã chốt (sau 16:00 ngày 2 tháng sau) không bị ghi đè — đúng Rule của file KPI FY68. */
var K68_MASTER_LINK = 'https://docs.google.com/spreadsheets/d/1iWV0PfyvyL3MzBlR7R4xCIOVxPqRcLM4Dr3rOSfQ6m8/edit?gid=2112288311#gid=2112288311';
var K68_LINKS_SHEET = '_CRM_LINKS';

function k68LinkAdapter_(link){
  var id = k68IdOf_(link) || k68IdOf_(K68_MASTER_LINK); if(!id) throw new Error('no-link');
  var ms = SpreadsheetApp.openById(id);
  return { mode: 'link', ss: ms, pull: function(codes){ return kh_read_(ms, codes); },
    push: function(src, rows){ var st = kh_write_(ms, src, rows); if(st.cells) kh_log_(ms, src, 'push', st.codes + ' mã · ' + st.cells + ' ô'); return st; } };
}
function k68Master_(link){ return k68LinkAdapter_(link); }
/* đăng ký file CRM này với file KPI tổng (sheet _CRM_LINKS) ⇒ KPI Hub tự đồng bộ 5 phút/lần */
function k68Register_(masterSS, crmSS, tab, source, lang){
  var sh = masterSS.getSheetByName(K68_LINKS_SHEET) || k68LinksSheet_(masterSS);
  var n = Math.max(sh.getLastRow() - 1, 0), V = n ? sh.getRange(2, 1, n, 3).getValues() : [], row = 0;
  for(var i = 0; i < V.length; i++) if(k68Str_(V[i][0]) === source){ row = i + 2; break; }
  if(!row){ row = sh.getLastRow() + 1; }
  sh.getRange(row, 1, 1, 5).setValues([[source, crmSS.getUrl(), tab, lang, Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm')]]);
  return row;
}
function k68LinksSheet_(ss){
  var sh = ss.insertSheet(K68_LINKS_SHEET);
  sh.getRange(1, 1, 1, 7).setValues([['Nguồn (team)', 'File CRM (link Google Sheet)', 'Tab KPI', 'Ngôn ngữ', 'Đăng ký lúc', 'Đồng bộ lần cuối', 'Kết quả']]).setFontWeight('bold').setBackground('#D9E1F2');
  sh.getRange(2, 1, 4, 4).setValues([['dental', '', '9. MỤC TIÊU & KPI', 'vi'], ['surgical', '', '9. MỤC TIÊU & KPI', 'vi'], ['eyeless', '', '9. MỤC TIÊU & KPI', 'vi'], ['thai', '', '9. TARGET & KPI', 'en']]);
  sh.setColumnWidth(2, 420); sh.setColumnWidth(7, 520); sh.setFrozenRows(1);
  try{ sh.hideSheet(); }catch(e){}                /* sheet kỹ thuật ⇒ ẩn; mở bằng menu MMH KPI Hub ▸ ⑨ */
  return sh;
}

/* ⭐ v22 — CÔNG THỨC THEO DẤU PHÂN CÁCH CỦA FILE
   Script ghi công thức kiểu "=MID($C$4,3,2)" vào file đặt vùng dùng dấu ";" (vd Việt Nam) ⇒ Google Sheet báo #ERROR!
   (đúng lỗi ở tab 9. TARGET & KPI và ALL TASK). Nay thử 1 ô trước: "=SUM(1,2)" ra 3 thì giữ dấu ",", không thì đổi
   "," ⇒ ";" và số thập phân "1.3" ⇒ "1,3" (bỏ qua phần trong ngoặc kép / tên sheet trong ngoặc đơn). */
var _FSEMI = {};
function fmlSemi_(sh){
  var id = ''; try{ id = sh.getParent().getId() + '|' + sh.getName(); }catch(e){}
  if(id && _FSEMI[id] !== undefined) return _FSEMI[id];
  var semi = false;
  try{
    var c = sh.getRange(sh.getMaxRows(), sh.getMaxColumns()), f0 = c.getFormula(), v0 = f0 ? '' : c.getValue();
    c.setFormula('=SUM(1,2)'); SpreadsheetApp.flush();
    semi = String(c.getDisplayValue()) !== '3';
    if(semi){ c.setFormula('=SUM(1;2)'); SpreadsheetApp.flush(); if(String(c.getDisplayValue()) !== '3') semi = false; }
    c.clearContent(); if(f0) c.setFormula(f0); else if(v0 !== '' && v0 != null) c.setValue(v0);
  }catch(e){ semi = false; }
  if(id) _FSEMI[id] = semi;
  return semi;
}
function fmlLoc_(f, semi){
  if(!semi || typeof f !== 'string' || f.charAt(0) !== '=') return f;
  var out = '', q = false, sq = false;
  for(var i = 0; i < f.length; i++){
    var ch = f.charAt(i);
    if(ch === '"' && !sq) q = !q;
    else if(ch === "'" && !q) sq = !sq;
    if(!q && !sq){
      if(ch === ','){ out += ';'; continue; }
      if(ch === '.' && /\d/.test(f.charAt(i - 1) || '') && /\d/.test(f.charAt(i + 1) || '')){ out += ','; continue; }
    }
    out += ch;
  }
  return out;
}

function k68Sync_(sh, lang, source, opts){
  opts = opts || {}; lang = lang || 'vi';
  var T = K68_TXT[lang], EN = lang === 'en';
  var lr = sh.getLastRow(), v = sh.getRange(1, 1, lr, K68.NC).getValues(), rebuilt = false;
  if(k68Str_(v[0][0]) !== K68_LAYOUT && !(source && K68_SPEC[source])) return { ok: false, error: EN ? 'The KPI tab is still in the old layout — open that CRM file and run menu "⑤ Rebuild the KPI tab".' : 'Tab KPI còn bố cục cũ — mở file CRM đó, chạy menu "⑪ Tạo lại tab KPI".' };
  /* ⭐ v22 — tab có ô mã tháng #ERROR! (công thức sai dấu phân cách) ⇒ tự dựng lại, giữ ô nhập tay */
  var broken = v.some(function(r){ var t = k68Str_(r[0]); return (t === 'months' || t === 'mstart') && /^#/.test(String(r[K68.t0 - 1])); });
  if((k68Str_(v[0][0]) !== K68_LAYOUT || broken) && source && K68_SPEC[source]){
    /* tab KPI dựng bằng code cũ (vd còn #ERROR!) ⇒ dựng lại theo bố cục mới, giữ ô nhập tay */
    var nm = sh.getName(), ssx = sh.getParent();
    k68Setup_(ssx, nm, source); SpreadsheetApp.flush(); sh = ssx.getSheetByName(nm); rebuilt = true;
    lr = sh.getLastRow(); v = sh.getRange(1, 1, lr, K68.NC).getValues();
  }
  if(!v.some(function(r){ return k68Str_(r[0]) === 'hdr'; })) return { ok: false, error: T.msgNotBuilt };
  var months = null, i, j;
  for(i = 0; i < v.length; i++) if(k68Str_(v[i][0]) === 'months'){ months = []; for(j = 0; j < 12; j++) months.push(String(Math.round(Number(v[i][K68.t0 - 1 + j]) || 0))); }
  if(!months) return { ok: false, error: T.msgNotBuilt };
  /* chưa tính xong mã tháng (vd vừa dựng lại) ⇒ dừng, không ghi gì — lượt sau đồng bộ */
  if(months.some(function(m){ return !/^20\d{4}$/.test(m); })) return { ok: rebuilt, rebuilt: rebuilt, changed: rebuilt, message: rebuilt ? (EN ? 'KPI tab rebuilt — sync on the next run' : 'Đã dựng lại tab KPI — đồng bộ ở lượt kế tiếp') : '', error: rebuilt ? '' : T.msgNotBuilt };
  var rows = [];
  for(i = 0; i < v.length; i++){ var tag = k68Str_(v[i][0]); if(/^kpi:/.test(tag)) rows.push({ i: i, key: tag.slice(4), code: k68Str_(v[i][K68.code - 1]) }); }
  var M, R;
  try{ M = opts.adapter || k68Master_(sh.getRange(K68_SET.link).getValue()); }
  catch(e){ return { ok: false, error: /no-link/.test(String(e)) ? T.msgNoLink : T.msgNoMaster + (e && e.message || e) + T.msgAuth }; }
  try{ R = M.pull(rows.map(function(x){ return x.code; })); }
  catch(e){ return { ok: false, error: T.msgNoMaster + (e && e.message || e) + T.msgAuth }; }
  var idx = months.map(function(m){ return R.months.indexOf(m); });
  var curYm = Number(Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM'));
  var nT = 0, nPull = 0, miss = [], push = {}, nPushRows = 0;
  function eq(a, b){ var x = k68Num_(a), y = k68Num_(b); if(x == null || y == null) return x == null && y == null; return Math.abs(x - y) < 0.005; }
  rows.forEach(function(x){
    var o = R.rows[x.code]; if(!o){ miss.push(x.code); return; }
    var line = v[x.i];
    /* ② target: file KPI tổng → CRM */
    var tRow = [], tChg = false;
    for(j = 0; j < 12; j++){ var tv = idx[j] < 0 || o.t[idx[j]] == null ? '' : o.t[idx[j]]; tRow.push(tv); if(!eq(tv, line[K68.t0 - 1 + j])) tChg = true; }
    if(tChg){ sh.getRange(x.i + 1, K68.t0, 1, 12).setValues([tRow]); nT++; }
    var up = R.months.map(function(){ return null; }), any = false;
    if(K68_MANUAL[x.key]){
      /* doanh số NPP / số nhập tay: file KPI có số ⇒ kéo về · file KPI trống mà CRM có ⇒ đẩy lên */
      var aRow = [], aChg = false;
      for(j = 0; j < 12; j++){
        var mv = idx[j] < 0 ? null : o.a[idx[j]], crm = line[K68.a0 - 1 + j];
        if(mv != null){ aRow.push(mv); if(!eq(mv, crm)) aChg = true; }
        else { aRow.push(crm); if(k68Num_(crm) != null && idx[j] >= 0 && !R.locked[idx[j]] && o.kind[idx[j]] !== 'calc'){ up[idx[j]] = k68Num_(crm); any = true; } }
      }
      if(aChg){ sh.getRange(x.i + 1, K68.a0, 1, 12).setValues([aRow]); nPull++; }
    } else if(!o.rollup){
      /* ① actual CRM tự tính → file KPI tổng (chỉ tháng đã tới, chưa khoá). Mã mà file KPI tự cộng từ mã con
            (dòng tổng có SUMIF, vd C11-01) ⇒ không đẩy, để file KPI tự tính. */
      for(j = 0; j < 12; j++){
        var k = idx[j]; if(k < 0 || Number(months[j]) > curYm || (R.locked[k] && !k68Forced_(x.code)) || o.kind[k] === 'calc') continue;
        var val = k68Num_(line[K68.a0 - 1 + j]); if(val == null) continue;
        val = Math.round(val * 100) / 100;
        if(!eq(val, o.a[k])){ up[k] = val; any = true; }
      }
    }
    if(any){ push[x.code] = up; nPushRows++; }
  });
  var st = null, pushErr = '';
  if(nPushRows){ try{ st = M.push(source || 'crm', push); }catch(e){ pushErr = String(e && e.message || e); } }
  var nPush = st ? st.codes : 0, now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  try{ PropertiesService.getScriptProperties().setProperty('K68_LASTCHECK', now); }catch(e){}
  var msg = now + (EN
    ? ' · ' + nT + ' target row(s) · ' + nPull + ' row(s) pulled from the KPI file · ' + nPush + ' row(s) pushed' + (st && st.cells ? ' (' + st.cells + ' cells)' : '')
    : ' · ' + nT + ' dòng target · ' + nPull + ' dòng kéo từ file KPI · ' + nPush + ' dòng đẩy lên' + (st && st.cells ? ' (' + st.cells + ' ô)' : '')) +
    (st && st.locked ? (EN ? ' · ' + st.locked + ' cell(s) of closed months skipped' : ' · bỏ qua ' + st.locked + ' ô tháng đã chốt') : '') +
    (st && st.owner && st.owner.length ? (EN ? ' · ⚠️ owned by another CRM: ' : ' · ⚠️ mã do file CRM khác ghi: ') + st.owner.join(', ') : '') +
    (miss.length ? (EN ? ' · not in the KPI file: ' : ' · file KPI không có mã: ') + miss.join(', ') : '') +
    (pushErr ? (EN ? ' · ⚠️ push failed: ' : ' · ⚠️ chưa đẩy được: ') + pushErr : '') +
    (rebuilt ? (EN ? ' · KPI tab rebuilt to the new layout' : ' · đã dựng lại tab KPI theo bố cục mới') : '') +
    (opts.byHub ? (EN ? ' · by the KPI Hub' : ' · do KPI Hub chạy') : '');
  var changed = nT || nPull || nPush || pushErr || rebuilt;
  if(changed || opts.manual){ sh.getRange(K68_SET.sync).setValue(msg); SpreadsheetApp.flush(); }
  if(opts.byHub){ try{ sh.getRange('E' + K68_SET.sync.replace(/\D/g, '')).setValue((EN ? 'KPI Hub check: ' : 'KPI Hub kiểm tra: ') + now); }catch(e){} }
  var late = null; try{ if(M.ss){ var lo = kh_late_(M.ss); if(lo.month) late = { month: lo.month, until: lo.until }; } }catch(eL){}
  return { ok: true, rebuilt: rebuilt, message: msg, targets: nT, pulled: nPull, pushed: nPush, cells: st ? st.cells : 0, missing: miss, changed: !!changed, mode: M.mode, error2: pushErr,
           locked: st ? (st.locked || 0) : 0, lockedMonths: st && st.lockedMonths ? Object.keys(st.lockedMonths) : [], late: late };
}

/* ─────────── KPI HUB CORE — đọc / ghi sheet "3. Detail KPI" của file MMH KPI FY68 ───────────
 * Dùng chung cho: backend file KPI tổng (KPI_Hub) và backend CRM (khi đồng bộ trực tiếp bằng link).
 * Nguyên tắc (theo sheet 4. Rule của file KPI FY68):
 *   · Tháng M bị KHOÁ từ 16:00 ngày 2 của tháng M+1 → không ghi đè actual của tháng đã khoá.
 *   · Ô actual có công thức tính gộp (SUMIF / AVERAGEIF của dòng tổng) → giữ nguyên, không ghi.
 *   · Ô actual chỉ là công thức tạm "=O5" (lấy tạm target làm actual) → coi là CHƯA CÓ SỐ: được ghi đè,
 *     và khi kéo về CRM thì coi như trống.
 *   · Mỗi mã KPI chỉ do MỘT nguồn CRM ghi (nguồn đầu tiên ghi mã đó giữ quyền) → tránh 2 file ghi đè nhau. */
var KH_SHEET = '3. Detail KPI', KH_LOG = '_CRM_SYNC_LOG', KH_TZ = 'Asia/Ho_Chi_Minh';

function kh_str_(v){ return v === null || v === undefined ? '' : String(v).trim(); }
function kh_num_(v){ if(v === '' || v === null || v === undefined) return null; var n = Number(v); return isNaN(n) ? null : n; }
function kh_now_(){
  try{ var t = PropertiesService.getScriptProperties().getProperty('KH_TEST_NOW'); if(t) return new Date(t); }catch(e){}
  return new Date();
}
/* tháng ym (202609) khoá từ 16:00 ngày 2 tháng sau (giờ Việt Nam) */
/* ⭐ v10.4 — CỬA SỔ NHẬN SỐ TRỄ: tháng đã chốt vẫn nhận số CRM tới hạn ghi ở sheet _CRM_LINKS của file KPI
   (I1 nhãn · J1 tháng YYYYMM · K1 hạn YYYY-MM-DD). File KPI (KpiSyncCenter v1.17) đọc đúng 2 ô này. */
var _KH_LATE = null;
function kh_late_(ssx){
  if(_KH_LATE && _KH_LATE.id === ssx.getId()) return _KH_LATE;
  var o = { id: ssx.getId(), month: '', until: '' };
  try{
    var sh = ssx.getSheetByName('_CRM_LINKS');
    if(sh){ var v = sh.getRange('J1:K1').getValues()[0];
      o.month = String(v[0] || '').replace(/\D/g, '').slice(0, 6);
      o.until = Object.prototype.toString.call(v[1]) === '[object Date]' ? Utilities.formatDate(v[1], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(v[1] || '').trim().slice(0, 10); }
  }catch(e){}
  _KH_LATE = o; return o;
}
function kh_isOpen_(ssx, ym){
  var o = kh_late_(ssx); if(!o.month || !o.until) return false;
  return String(ym) === o.month && Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') <= o.until;
}
function kh_setLate_(ssx, month, until){
  var sh = ssx.getSheetByName('_CRM_LINKS'); if(!sh) throw new Error('File KPI chưa có sheet _CRM_LINKS');
  sh.getRange('I1:K1').setValues([['Nhận số CRM trễ cho tháng · hạn', String(month || ''), String(until || '')]]);
  sh.getRange('J1:K1').setNumberFormat('@'); _KH_LATE = null;
}
/* BỎ RULE CHỐT SỐ THÁNG (03/10/2026): không tháng nào bị khoá — CRM ghi đè realtime mọi tháng ≤ tháng hiện tại */
function kh_locked_(ym){ return false; }
function kh_kind_(f){
  if(!f) return 'none';
  return /^=\s*\$?[A-Z]{1,3}\$?\d+\s*$/.test(f) ? 'placeholder' : 'calc';
}
/* đọc bố cục sheet 3. Detail KPI: dòng tiêu đề "KPI Code", cột "<yyyymm> Target" / "<yyyymm> Actual" */
function kh_layout_(sh){
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 80);
  var V = sh.getRange(1, 1, lr, lc).getValues();
  var hr = -1, cc = -1, H = {};
  for(var i = 0; i < Math.min(lr, 15) && hr < 0; i++) for(var j = 0; j < lc; j++) if(kh_str_(V[i][j]).toLowerCase() === 'kpi code'){ hr = i; cc = j; break; }
  if(hr < 0) throw new Error('Sheet "' + KH_SHEET + '" không có dòng tiêu đề "KPI Code"');
  var months = [], tCol = {}, aCol = {};
  V[hr].forEach(function(h, j){
    var s = kh_str_(h), m = /^(\d{6})\s+(target|actual)$/i.exec(s); if(!m) { H[s.toLowerCase()] = j; return; }
    if(/target/i.test(m[2])){ tCol[m[1]] = j; if(months.indexOf(m[1]) < 0) months.push(m[1]); } else aCol[m[1]] = j;
  });
  months.sort();
  var rows = {};
  for(i = hr + 1; i < lr; i++){ var c = kh_str_(V[i][cc]); if(c && !rows[c]) rows[c] = i; }
  return { V: V, hr: hr, cc: cc, H: H, months: months, tCol: tCol, aCol: aCol, rows: rows, lr: lr, lc: lc };
}
/* codes: mảng mã cần đọc (rỗng = tất cả) */
function kh_read_(ss, codes){
  var sh = ss.getSheetByName(KH_SHEET); if(!sh) throw new Error('Không có sheet "' + KH_SHEET + '"');
  var L = kh_layout_(sh), F = sh.getRange(1, 1, L.lr, L.lc).getFormulas(), out = {};
  var want = (codes && codes.length) ? codes : Object.keys(L.rows);
  var locked = L.months.map(function(m){ return kh_locked_(m) && !kh_isOpen_(ssx, m); });   /* ⭐ cửa sổ nhận số trễ */
  function col(name){ return L.H[name] == null ? null : L.H[name]; }
  want.forEach(function(code){
    var r = L.rows[code]; if(r == null) return;
    var o = { t: [], a: [], kind: [] };
    L.months.forEach(function(m){
      var tj = L.tCol[m], aj = L.aCol[m];
      o.t.push(tj == null ? null : kh_num_(L.V[r][tj]));
      var k = aj == null ? 'none' : kh_kind_(F[r][aj]);
      o.kind.push(k);
      o.a.push(aj == null || k === 'placeholder' ? null : kh_num_(L.V[r][aj]));
    });
    var nm = col('detail kpi'), un = col('unit'), ag = col('agg'), mb = col('members involved'), pr = col('parent'), lv = col('level');
    o.name = nm == null ? '' : kh_str_(L.V[r][nm]); o.unit = un == null ? '' : kh_str_(L.V[r][un]);
    o.agg = ag == null ? '' : kh_str_(L.V[r][ag]); o.members = mb == null ? '' : kh_str_(L.V[r][mb]);
    o.parent = pr == null ? '' : kh_str_(L.V[r][pr]); o.level = lv == null ? '' : kh_str_(L.V[r][lv]);
    o.rollup = o.kind.some(function(k){ return k === 'calc'; });
    out[code] = o;
  });
  return { months: L.months, locked: locked, rows: out };
}
/* rows: { code: [12 giá trị | null] } — chỉ ghi tháng chưa khoá, ô trống / ô tạm; trả về thống kê */
function kh_write_(ss, source, rows){
  var sh = ss.getSheetByName(KH_SHEET); if(!sh) throw new Error('Không có sheet "' + KH_SHEET + '"');
  var L = kh_layout_(sh), F = sh.getRange(1, 1, L.lr, L.lc).getFormulas(), P = PropertiesService.getScriptProperties();
  var st = { cells: 0, codes: 0, locked: 0, rollup: 0, missing: [], owner: [] };
  var aCols = L.months.map(function(m){ return L.aCol[m]; }).filter(function(x){ return x != null; });
  if(!aCols.length) return st;
  var a0 = Math.min.apply(null, aCols), a1 = Math.max.apply(null, aCols), w = a1 - a0 + 1;
  Object.keys(rows || {}).forEach(function(code){
    var r = L.rows[code]; if(r == null){ st.missing.push(code); return; }
    var own = P.getProperty('KH_OWN_' + code);
    if(own && own !== source){ st.owner.push(code + '→' + own); return; }
    var vals = rows[code] || [], cells = [];
    L.months.forEach(function(m, i){
      var aj = L.aCol[m]; if(aj == null) return;
      var v = vals[i]; if(v === null || v === undefined || v === '') return;
      var k = kh_kind_(F[r][aj]);
      if(k === 'calc'){ st.rollup++; return; }
      if(kh_locked_(m) && !k68Forced_(code) && !kh_isOpen_(ssx, m)){ st.locked++; (st.lockedMonths = st.lockedMonths || {})[m] = 1; return; }
      v = Math.round(Number(v) * 100) / 100; if(isNaN(v)) return;
      if(k === 'none' && kh_num_(L.V[r][aj]) === v) return;
      cells.push([aj, v]);
    });
    /* ghi từng ô số (không ghi lại ô công thức ⇒ không phụ thuộc vùng / dấu phân cách của file KPI) */
    cells.forEach(function(c){ sh.getRange(r + 1, c[0] + 1).setValue(c[1]); st.cells++; });
    if(cells.length){ st.codes++; if(!own) P.setProperty('KH_OWN_' + code, source); }
  });
  return st;
}
function kh_log_(ss, source, action, detail){
  try{
    var sh = ss.getSheetByName(KH_LOG);
    if(!sh){ sh = ss.insertSheet(KH_LOG); sh.getRange(1, 1, 1, 4).setValues([['Thời điểm', 'Nguồn', 'Thao tác', 'Chi tiết']]).setFontWeight('bold'); try{ sh.hideSheet(); }catch(e){} }
    sh.insertRowAfter(1);
    sh.getRange(2, 1, 1, 4).setValues([[Utilities.formatDate(new Date(), KH_TZ, 'dd/MM/yyyy HH:mm:ss'), source, action, String(detail).slice(0, 500)]]);
    if(sh.getLastRow() > 600) sh.deleteRows(601, sh.getLastRow() - 600);
  }catch(e){}
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * ⭐ v23 — NHẬT KÝ DỮ LIỆU KHÁCH HÀNG (sheet "_CUSTOMER_LOG")
 *   Mỗi lần thêm / sửa / xoá Account hoặc CBC từ app ⇒ ghi NGAY 1 dòng (không gom, không cắt bớt):
 *   thời gian · PIC · thao tác · loại · mã · tên account · CBC · người liên hệ · các trường đã đổi.
 *   Dashboard đọc sheet này để thống kê theo tuần / theo khoảng thời gian bất kỳ.
 * ═══════════════════════════════════════════════════════════════════════════════ */
var CUST_LOG_TAB = '_CUSTOMER_LOG';
var CUST_LOG_HDR = ["Time", "PIC", "Action", "Type", "Customer code", "Account", "CBC code", "Contact", "Fields changed", "Row", "Detail"];
function custLogSheet_(){
  var book = ss_(), s = book.getSheetByName(CUST_LOG_TAB);
  if(!s){
    s = book.insertSheet(CUST_LOG_TAB);
    s.getRange(1, 1, 1, CUST_LOG_HDR.length).setValues([CUST_LOG_HDR]).setFontWeight('bold').setBackground('#D9E1F2');
    s.setFrozenRows(1); s.setColumnWidth(1, 150); s.setColumnWidth(6, 260); s.setColumnWidth(9, 260);
  }
  return s;
}
function custLog_(pic, action, tab, rec, fields, row, detail){
  try{
    rec = rec || {};
    custLogSheet_().appendRow([Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss'), pic || '', action || '',
      tab === 'cbc' ? 'CBC' : 'Account', String(rec.code || ''), String(rec.name || ''), String(rec.cbcCode || ''), String(rec.contact || ''),
      (fields || []).join(', '), row || '', String(detail || '').slice(0, 300)]);
  }catch(e){}
}
function custLogRead_(from, to){
  var s = null; try{ s = (ss_()).getSheetByName(CUST_LOG_TAB); }catch(e){}
  if(!s || s.getLastRow() < 2) return { rows: [], first: '' };
  var v = s.getRange(2, 1, s.getLastRow() - 1, 11).getValues(), out = [], first = '';
  from = String(from || '').slice(0, 10); to = String(to || '').slice(0, 10);
  for(var i = 0; i < v.length; i++){
    var r = v[i]; if(!r[0] && !r[1]) continue;
    var t = (r[0] instanceof Date) ? Utilities.formatDate(r[0], tz_(), 'yyyy-MM-dd HH:mm:ss') : String(r[0]);
    if(!first || t < first) first = t;
    var d = t.slice(0, 10);
    if(from && d < from) continue; if(to && d > to) continue;
    out.push({ t: t, pic: String(r[1]), action: String(r[2]), type: String(r[3]), code: String(r[4]), name: String(r[5]),
               cbcCode: String(r[6]), contact: String(r[7]), fields: String(r[8]), row: r[9], detail: String(r[10]) });
  }
  if(out.length > 5000) out = out.slice(out.length - 5000);
  return { rows: out, first: first };
}

/* v1.5 — DELETE AN ACCOUNT added by mistake (and its CBC) from the app.
   Step 1 (no confirm): returns what would be deleted (CBC count, visit count) so the app can ask.
   Step 2 (confirm=1): deletes the CBC rows of the account (bottom-up), then the account row.
   Visits / presentations stay in their tabs as history. PIC of the account or a manager only. */
function deleteAccount_(user, p){
  var row = parseInt(p.row, 10) || 0;
  var cus = customers_().filter(function(c){ return c._row === row; })[0];
  if(!cus) throw new Error('This account no longer exists in 1. CUSTOMER CODE — reload the app and try again.');
  if(str_(p.name) && picKey_(p.name) !== picKey_(cus.name)) throw new Error('The sheet changed (row ' + row + ' is now “' + cus.name + '”) — reload the app and try again.');
  if(!canEdit_(user, cus.pic)) throw new Error('Only ' + (cus.pic || 'the PIC') + ' (or a manager) can delete this account.');
  var nm = picKey_(cus.name);
  var cbc = cbcRows_().filter(function(b){ return picKey_(b.name) === nm; });
  var visits = weeklyRows_().filter(function(w){ return picKey_(parseAcc_(w.account).name) === nm; }).length;
  if(String(p.confirm || '') !== '1') return { ok: true, preview: true, name: cus.name, code: cus.code, cbc: cbc.length, visits: visits };
  var L = lock_();
  try{
    var sb = sh_(TABS.cbc.sh);
    cbc.map(function(b){ return b._row; }).sort(function(a, b){ return b - a; }).forEach(function(r){ sb.deleteRow(r); });
    delete _TAB.cbc;
    var again = customers_().filter(function(c){ return c._row === row; })[0];
    if(!again || picKey_(again.name) !== nm) throw new Error('The sheet changed while deleting — reload the app and check.');
    sh_(TABS.customer.sh).deleteRow(row); delete _TAB.customer;
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_(['customer', 'cbc']);
  cbc.forEach(function(b){ custLog_(user.pic, 'delete', 'cbc', b, [], b._row, 'with account ' + cus.name); });
  custLog_(user.pic, 'delete', 'customer', cus, [], row, str_(p.reason) || (cbc.length ? cbc.length + ' CBC deleted with it' : ''));
  log_(user.pic, 'delete', 'customer', cus.name, cus.code + (cbc.length ? ' · +' + cbc.length + ' CBC' : ''), row);
  return { ok: true, message: 'Account deleted: ' + cus.name + (cbc.length ? ' (and ' + cbc.length + ' CBC)' : ''), cbc: cbc.length };
}

/* ════════════════ v1.9 · SETTINGS OF THE SHARED MODULE FOR THE THAILAND CRM ════════════════ */
var NA_ENV = {
  sheet: '23. NEW ACCOUNT & SKU',
  lang: function(){ return 'en'; },
  team: function(){ return 'thai'; },
  teamLabel: function(){ return CFG.TEAM_LABEL; },
  ss: function(){ return ss_(); },
  tz: function(){ return tz_(); },
  folderId: function(){ return NA_FOLDER_TH; },
  email: function(pic){ var u = USERS[str_(pic)]; return u ? u.email : ''; },
  title: function(pic){ var u = USERS[str_(pic)]; return u ? u.title : ''; },
  teamPics: function(){ return TEAM_PICS.slice(); },
  approvers: function(pic){ return (NA_APPROVERS_TH[str_(pic)] || NA_APPROVERS_TH['*'] || []).filter(function(x){ return x !== str_(pic); }); },
  admins: NA_ADMINS, deciders: NA_DECIDERS,
  director: MAIL_HA, hr: MAIL_HOA,
  k68row_: function(pic){
    var sp = K68_SPEC.thai; if(!sp) return null;
    for(var i = 0; i < sp.pics.length; i++) if(sp.pics[i].pic === str_(pic))
      for(var j = 0; j < sp.pics[i].rows.length; j++) if(/^newacct_/.test(sp.pics[i].rows[j].key)) return sp.pics[i].rows[j];
    return null;
  },
  kpiCode: function(pic){ var r = NA_ENV.k68row_(pic); return r ? r.code : ''; },
  dealerOnly: function(pic){ var r = NA_ENV.k68row_(pic); return !!(r && r.key === 'newacct_dealer'); },
  weekly: function(){ return weeklyRows_().map(function(w){ return { pic:w.pic, acc:w.accName || w.account, start:w.start, status:w.status, action:w.typeAction, result:w.result }; }); },
  orders: null,
  log: function(user, action, target, detail){ try{ log_(user && user.pic, action, 'newacc', target, detail, ''); }catch(e){} },
  kpiBump: function(){ try{ bump_(['kpi']); }catch(e){} },
  kpiLink: function(){ var s = ss_().getSheetByName(CFG.SH_KPI); return s ? s.getRange(K68_SET.link).getValue() : ''; },
  needOrder: function(){ return false; }
};
/* run once after pasting: Drive + Gmail permission, creates sheet 23, rebuilds the KPI tab with the new rule */
function naSetup(){
  var sh = naSheet_(), f = DriveApp.getFolderById(NA_FOLDER_TH), quota = MailApp.getRemainingDailyQuota();
  var msg = 'New accounts & SKU module ready — ' + CFG.TEAM_LABEL + '\n· Sheet: ' + sh.getName() + '\n· Evidence folder: ' + f.getName() + '\n· E-mails left today: ' + quota;
  try{ if(ss_().getSheetByName(CFG.SH_KPI)){ k68Setup_(ss_(), CFG.SH_KPI, 'thai'); bump_(['kpi']); msg += '\n· KPI tab rebuilt with the new C2-03 rule.'; } }catch(e){ msg += '\n· KPI tab not rebuilt: ' + e.message; }
  try{ SpreadsheetApp.flush(); var r2 = k68SyncFix_(ss_().getSheetByName(CFG.SH_KPI), true); msg += '\n· Pushed to the KPI file (incl. closed months of C2-03): ' + (r2.ok ? r2.message : r2.error); }catch(e){ msg += '\n· Not pushed: ' + e.message; }
  try{ SpreadsheetApp.getUi().alert(msg); }catch(e){}
  return msg;
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════
   ⭐ v28 · MODULE DÙNG CHUNG (CRM VN Dental · Surgical · Eyeless  +  CRM Thailand Surgical)
   ① IDEM  — chống ghi trùng khi mạng chậm / app gửi lại (mã yêu cầu rid do app sinh, nhớ 6 giờ)
   ② NA    — Mở mới địa bàn & SKU mới: sheet NEW ACCOUNT & SKU, chứng từ lưu Drive theo nhóm,
             email xin xác nhận → quản lý duyệt / từ chối trên CRM, KPI C1 / C2 đếm case đã duyệt
   ③ KR    — Báo cáo KPI tháng: đọc sheet "5. Member KPI Monthly" của file MMH KPI FY68,
             dựng email trực quan (thanh tiến độ), gửi từ CRM
   Phần khác nhau giữa 2 backend nằm trong đối tượng NA_ENV (khai báo ở file chính).
   ════════════════════════════════════════════════════════════════════════════════════════════════ */

/* ═════════════ ① IDEM — CHỐNG GHI TRÙNG ═════════════ */
var IDEM_TTL = 21600;
function idemKey_(rid){ return 'RID_' + String(rid).replace(/[^\w\-]/g, '').slice(0, 80); }
function idemGet_(rid){
  if(!rid) return null;
  try{ var v = CacheService.getScriptCache().get(idemKey_(rid)); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
function idemPut_(rid, out){
  if(!rid || !out || !out.ok) return;
  try{ var s = JSON.stringify(out); if(s.length < 90000) CacheService.getScriptCache().put(idemKey_(rid), s, IDEM_TTL); }catch(e){}
}
/* Gọi trước khi xử lý: yêu cầu cùng rid đang chạy ở lượt khác ⇒ chờ kết quả lượt đó (tối đa ~25 giây) */
function idemBegin_(rid){
  if(!rid) return null;
  var hit = idemGet_(rid); if(hit){ hit.dup = true; return hit; }
  var c = CacheService.getScriptCache(), pk = idemKey_(rid) + '_P';
  try{
    if(c.get(pk)){
      for(var i = 0; i < 25; i++){ Utilities.sleep(1000); hit = idemGet_(rid); if(hit){ hit.dup = true; return hit; } if(!c.get(pk)) break; }
    }
    c.put(pk, '1', 120);
  }catch(e){}
  return null;
}
function idemEnd_(rid, out){
  if(!rid) return;
  idemPut_(rid, out);
  try{ CacheService.getScriptCache().remove(idemKey_(rid) + '_P'); }catch(e){}
}

/* ═════════════ ② NA — MỞ MỚI ĐỊA BÀN & SKU MỚI ═════════════ */
var NA_HDR = ['Case ID','Created at','PIC','Team','FY','Month','Case type','KPI code','Account name','Customer code',
  'Account type','Province','Distributor','Product type','SKU / Product detail','First order date','Order No.','Qty','Amount',
  'Order lines (JSON)','Weekly report proof','Note','Checklist (JSON)','Files (JSON)','Folder URL','Status','Submitted at',
  'Submitted to','Decided by','Decided at','Decision comment','Updated at','Log'];
var NA_F = ['id','created','pic','team','fy','month','type','kpi','account','code','accType','province','npp','ptype','sku',
  'orderDate','orderNo','qty','amount','lines','weekly','note','checklist','files','folder','status','subAt','subTo',
  'decBy','decAt','comment','updated','log'];
var NA_JSON = { lines:1, checklist:1, files:1 };
var NA_C0 = 2, NA_HR = 3, NA_DR = 4;                 /* cột B · tiêu đề hàng 3 · dữ liệu từ hàng 4 */
var NA_ST = { draft:'Draft', pending:'Pending', approved:'Approved', rejected:'Rejected' };
var NA_CRM_URL = 'https://manimedicalhanoi.github.io/MMH-CRM/';
var NA_MAX_ATTACH = 18 * 1024 * 1024;

function naL_(vi, en){ return NA_ENV.lang() === 'en' ? en : vi; }
/* Dental: KPI mở mới cần đơn hàng đầu tiên · Surgical / Eyeless / Thái: chỉ cần thông tin đầy đủ + lịch sử chăm sóc + xác nhận NPP */
function naNeedOrder_(){ try{ return typeof NA_ENV.needOrder === 'function' ? !!NA_ENV.needOrder() : NA_ENV.team() === 'dental'; }catch(e){ return false; } }
function naS_(v){ return v == null ? '' : String(v).trim(); }
function naN_(v){ if(v === '' || v == null) return 0; if(typeof v === 'number') return isFinite(v) ? v : 0; var x = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(x) ? 0 : x; }
function naNorm_(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim(); }
function naEsc_(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function naTz_(){ try{ return NA_ENV.tz(); }catch(e){ return 'Asia/Ho_Chi_Minh'; } }
function naNow_(){ return Utilities.formatDate(new Date(), naTz_(), 'yyyy-MM-dd HH:mm'); }
function naYm_(iso){ var m = /^(\d{4})-(\d{2})/.exec(String(iso || '')); return m ? m[1] + m[2] : ''; }
function naFy_(ym){ ym = String(ym || ''); if(ym.length < 6) return ''; var y = +ym.slice(0, 4), m = +ym.slice(4, 6); return 'FY' + ((m >= 9 ? y : y - 1) - 1958); }
function naIso_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, naTz_(), 'yyyy-MM-dd');
  var s = String(v).trim(), m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
  if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s.slice(0, 10);
}
function naVer_(){ try{ return PropertiesService.getScriptProperties().getProperty('NA_VER') || '1'; }catch(e){ return '1'; } }
function naBump_(){ var v = String(Date.now()); try{ PropertiesService.getScriptProperties().setProperty('NA_VER', v); }catch(e){} return v; }

/* sheet NEW ACCOUNT & SKU — tự tạo / tự chuyển bố cục cũ (tiêu đề hàng 1) sang bố cục chuẩn */
var _NA_SH = null;
function naSheet_(){
  if(_NA_SH) return _NA_SH;
  var book = NA_ENV.ss(), name = NA_ENV.sheet, sh = book.getSheetByName(name);
  if(sh){
    var h = naS_(sh.getRange(NA_HR, NA_C0).getValue());
    if(h !== 'Case ID'){
      var lr = sh.getLastRow(), hasData = false;
      if(lr >= 2){ var v = sh.getRange(2, 1, lr - 1, Math.min(sh.getLastColumn(), 3)).getValues(); hasData = v.some(function(r){ return naS_(r[0]) || naS_(r[1]); }); }
      if(hasData){ sh.setName(name + ' (old)'); sh = null; }
      else { sh.clear(); }
    } else {
      var have = sh.getRange(NA_HR, NA_C0, 1, NA_HDR.length).getValues()[0];
      if(naS_(have[NA_HDR.length - 1]) !== NA_HDR[NA_HDR.length - 1]) sh.getRange(NA_HR, NA_C0, 1, NA_HDR.length).setValues([NA_HDR]);
      _NA_SH = sh; return sh;
    }
  }
  if(!sh) sh = book.insertSheet(name);
  if(sh.getMaxColumns() < NA_C0 + NA_HDR.length) sh.insertColumnsAfter(sh.getMaxColumns(), NA_C0 + NA_HDR.length - sh.getMaxColumns());
  sh.getRange(1, 2).setValue(naL_('MỞ MỚI ĐỊA BÀN & SKU MỚI — ghi từ app MMH CRM (không sửa tay cột Status / Files)', 'NEW ACCOUNTS & NEW SKU LISTINGS — written by the MMH CRM app (do not edit Status / Files by hand)'))
    .setFontWeight('bold').setFontSize(13).setFontColor('#003047');
  sh.getRange(2, 2).setValue(naL_('KPI C1 (VN) / C2 (Thái) chỉ đếm case Status = Approved, theo PIC và Month (tháng phát sinh đơn đầu tiên).',
    'KPI C1 / C2 counts only cases with Status = Approved, by PIC and Month (month of the first order).')).setFontColor('#666666').setFontStyle('italic');
  sh.getRange(NA_HR, NA_C0, 1, NA_HDR.length).setValues([NA_HDR]).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047').setWrap(true);
  sh.setFrozenRows(NA_HR); sh.setFrozenColumns(NA_C0 + 1);
  sh.getRange(NA_DR, NA_C0, sh.getMaxRows() - NA_DR + 1, NA_HDR.length).setNumberFormat('@');
  sh.getRange(NA_DR, NA_C0 + NA_F.indexOf('month'), sh.getMaxRows() - NA_DR + 1, 1).setNumberFormat('0');
  sh.getRange(NA_DR, NA_C0 + NA_F.indexOf('qty'), sh.getMaxRows() - NA_DR + 1, 2).setNumberFormat('#,##0');
  try{ sh.setTabColor('#3A5CAA'); sh.setColumnWidth(1, 18); }catch(e){}
  _NA_SH = sh;
  return sh;
}
function naRow2Obj_(r, rowNo){
  var o = { _row: rowNo };
  NA_F.forEach(function(f, i){
    var v = r[i];
    if(NA_JSON[f]){ try{ o[f] = v ? JSON.parse(v) : (f === 'checklist' ? {} : []); }catch(e){ o[f] = f === 'checklist' ? {} : []; } }
    else if(f === 'orderDate') o[f] = naIso_(v);
    else if(f === 'month') o[f] = naS_(v).replace(/\D/g, '').slice(0, 6);
    else if(f === 'qty' || f === 'amount') o[f] = v === '' ? '' : naN_(v);
    else o[f] = Object.prototype.toString.call(v) === '[object Date]' ? Utilities.formatDate(v, naTz_(), 'yyyy-MM-dd HH:mm') : naS_(v);
  });
  if(!o.status) o.status = NA_ST.draft;
  return o;
}
function naObj2Row_(o){
  return NA_F.map(function(f){
    var v = o[f];
    if(NA_JSON[f]) return JSON.stringify(v || (f === 'checklist' ? {} : [])).slice(0, 49000);
    if(f === 'month') return v ? Number(String(v).replace(/\D/g, '').slice(0, 6)) : '';
    if(f === 'qty' || f === 'amount') return v === '' || v == null ? '' : naN_(v);
    return v == null ? '' : String(v);
  });
}
function naReadAll_(){
  var sh = naSheet_(), lr = sh.getLastRow();
  if(lr < NA_DR) return [];
  var v = sh.getRange(NA_DR, NA_C0, lr - NA_DR + 1, NA_F.length).getValues(), out = [];
  v.forEach(function(r, i){ if(naS_(r[0])) out.push(naRow2Obj_(r, NA_DR + i)); });
  return out;
}
function naFind_(id){ var all = naReadAll_(); for(var i = 0; i < all.length; i++) if(all[i].id === id) return all[i]; return null; }
function naWrite_(o){
  var sh = naSheet_();
  if(!o._row){
    var lr = sh.getLastRow(), row = Math.max(lr + 1, NA_DR);
    if(lr >= NA_DR){
      var ids = sh.getRange(NA_DR, NA_C0, lr - NA_DR + 1, 1).getValues(), last = -1;
      for(var i = ids.length - 1; i >= 0; i--) if(naS_(ids[i][0])){ last = i; break; }
      row = NA_DR + last + 1;
    }
    o._row = row;
  }
  sh.getRange(o._row, NA_C0, 1, NA_F.length).setValues([naObj2Row_(o)]);
  return o;
}
function naLogLine_(o, who, what){ o.log = (naNow_() + ' · ' + who + ' · ' + what + (o.log ? '\n' + o.log : '')).slice(0, 4000); }

/* quyền */
function naIsAdmin_(user){ return NA_ENV.admins.indexOf(naS_(user && user.pic)) >= 0; }
function naApprovers_(pic){ try{ return NA_ENV.approvers(pic) || []; }catch(e){ return []; } }
function naCanSee_(user, o){
  var me = naS_(user && user.pic);
  if(!me) return false;
  if(naIsAdmin_(user) || o.pic === me) return true;
  return naApprovers_(o.pic).indexOf(me) >= 0;
}
function naCanDecide_(user, o){
  var me = naS_(user && user.pic);
  if(!me || o.status !== NA_ST.pending || o.pic === me) return false;
  return naApprovers_(o.pic).indexOf(me) >= 0 || NA_ENV.deciders.indexOf(me) >= 0;
}
function naCanEdit_(user, o){
  var me = naS_(user && user.pic);
  if(naIsAdmin_(user)) return true;
  return o.pic === me && o.status !== NA_ST.approved;
}
function naDecorate_(user, o){
  o.canDecide = naCanDecide_(user, o);
  o.canEdit = naCanEdit_(user, o);
  o.approvers = naApprovers_(o.pic);
  return o;
}

/* lịch sử chăm sóc trên báo cáo tuần (tới ngày đơn đầu tiên) */
function naWeeklyProof_(pic, account, until){
  var key = naNorm_(account), rows = [];
  if(!key) return { n:0, last:'', list:[] };
  try{
    NA_ENV.weekly().forEach(function(w){
      if(naNorm_(w.pic) !== naNorm_(pic)) return;
      if(naNorm_(w.acc) !== key) return;
      if(/cancel/i.test(w.status)) return;
      var d = naIso_(w.start); if(!d) return;
      if(until && d > until) return;
      rows.push({ d:d, a:w.action || '', s:w.status || '', r:String(w.result || '').slice(0, 140) });
    });
  }catch(e){}
  rows.sort(function(a, b){ return a.d < b.d ? 1 : -1; });
  return { n:rows.length, last:rows.length ? rows[0].d : '', list:rows.slice(0, 8) };
}
function naWeeklyText_(w){
  if(!w || !w.n) return naL_('Chưa có lượt nào trên báo cáo tuần', 'No visit in the weekly report yet');
  return naL_(w.n + ' lượt trên báo cáo tuần · gần nhất ', w.n + ' visit(s) in the weekly report · last ') + w.last;
}

/* lịch sử đơn hàng (chỉ VN — file Thái không có Sales order) */
function naOrderHistory_(account, beforeYm){
  var out = { n:0, first:'', skus:{} };
  try{
    var key = naNorm_(account), rows = NA_ENV.orders ? NA_ENV.orders() : [];
    rows.forEach(function(r){
      if(naNorm_(r.name) !== key) return;
      var ym = naS_(r.month).replace(/\D/g, '').slice(0, 6);
      if(!ym || (beforeYm && ym >= beforeYm)) return;
      out.n++; if(!out.first || ym < out.first) out.first = ym;
      String(r.detail || '').split(/\r?\n|;/).forEach(function(d){ d = naNorm_(d); if(d) out.skus[d] = ym; });
    });
  }catch(e){}
  return out;
}

/* ── folder Drive của nhóm, chia theo tháng ── */
function naFolder_(ym){
  var root = DriveApp.getFolderById(NA_ENV.folderId());
  var nm = ym && ym.length === 6 ? ym.slice(0, 4) + '-' + ym.slice(4) : Utilities.formatDate(new Date(), naTz_(), 'yyyy-MM');
  var it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}
function naSafe_(s, n){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[\\\/:*?"<>|#%\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/ /g, '-').slice(0, n || 60); }
function naFileName_(o, idx, ext){
  var d = naIso_(o.orderDate) || Utilities.formatDate(new Date(), naTz_(), 'yyyy-MM-dd');
  var dm = d.slice(8, 10) + d.slice(5, 7) + d.slice(0, 4);
  var sku = (String(o.sku || '').split(/\r?\n|;/)[0] || o.ptype || (o.type === 'new_sku' ? 'SKU' : 'NewAccount'));
  return [naSafe_(o.pic, 20), dm, naSafe_(o.account, 50), naSafe_(sku, 40)].join('_') + (idx > 1 ? '_' + idx : '') + (ext ? '.' + ext : '');
}
function naExt_(name, mime){
  var m = /\.([a-z0-9]{2,5})$/i.exec(String(name || '')); if(m) return m[1].toLowerCase();
  return ({ 'application/pdf':'pdf', 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/heic':'heic' })[mime] || 'bin';
}

/* ═════════ API ═════════ */
function naRoute_(action, user, p){
  switch(action){
    case 'naList'   : return naList(user, p);
    case 'naPending': return naPending(user, p);
    case 'naSave'   : return naSave(user, p);
    case 'naUpload' : return naUpload(user, p);
    case 'naDelFile': return naDelFile(user, p);
    case 'naDelete' : return naDelete(user, p);
    case 'naSubmit' : return naSubmit(user, p);
    case 'naDecide' : return naDecide(user, p);
  }
  return { ok:false, error:'Unknown action: ' + action };
}
function naCfg_(){
  var pics = [], kpi = {}, dealer = {};
  try{ pics = NA_ENV.teamPics(); }catch(e){}
  pics.forEach(function(pc){ kpi[pc] = NA_ENV.kpiCode(pc) || ''; dealer[pc] = !!NA_ENV.dealerOnly(pc); });
  var furl = ''; try{ furl = 'https://drive.google.com/drive/folders/' + NA_ENV.folderId(); }catch(e){}
  return { team:NA_ENV.team(), lang:NA_ENV.lang(), pics:pics, kpi:kpi, dealerOnly:dealer, folder:furl, hasOrders:!!NA_ENV.orders, needOrder:naNeedOrder_(),
           admins:NA_ENV.admins, deciders:NA_ENV.deciders };
}
function naList(user, p){
  var ver = naVer_();
  if(p && naS_(p.cv) && naS_(p.cv) === ver) return { ok:true, unchanged:true, ver:ver, _ver:ver };
  var fy = naS_(p && p.fy), all = naReadAll_(), rows = [], pend = 0;
  all.forEach(function(o){
    if(!naCanSee_(user, o)) return;
    if(fy && o.fy && o.fy !== fy && o.status !== NA_ST.pending) return;
    naDecorate_(user, o);
    if(o.canDecide) pend++;
    rows.push(o);
  });
  rows.sort(function(a, b){ return String(b.month || '').localeCompare(String(a.month || '')) || String(b.created).localeCompare(String(a.created)); });
  var me = naS_(user && user.pic), approverOf = [];
  try{ NA_ENV.teamPics().forEach(function(pc){ if(naApprovers_(pc).indexOf(me) >= 0) approverOf.push(pc); }); }catch(e){}
  return { ok:true, na:true, ver:ver, _ver:ver, rows:rows, pending:pend, me:{ pic:me, all:naIsAdmin_(user), approverOf:approverOf }, cfg:naCfg_() };
}
function naPending(user, p){
  var all = naReadAll_(), ids = [], mine = 0;
  all.forEach(function(o){ if(naCanDecide_(user, o)) ids.push(o.id); if(o.pic === naS_(user.pic) && o.status === NA_ST.draft) mine++; });
  return { ok:true, n:ids.length, ids:ids, drafts:mine, ver:naVer_() };
}
function naParse_(p){
  var d = p.data;
  if(typeof d === 'string'){ try{ d = JSON.parse(d); }catch(e){ d = null; } }
  return d || {};
}
function naSave(user, p){
  var d = naParse_(p);
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok:false, error:naL_('Hệ thống đang bận, thử lại sau vài giây.', 'The system is busy, try again in a few seconds.') }; }
  try{
    var all = naReadAll_(), cur = null, id = naS_(d.id);
    if(id) for(var i = 0; i < all.length; i++) if(all[i].id === id){ cur = all[i]; break; }
    if(cur && !naCanEdit_(user, cur)) return { ok:false, error:naL_('Bạn không sửa được case này.', 'You cannot edit this case.') };
    var isNew = !cur;
    var o = cur || { id: /^NA-[\w-]{6,40}$/.test(id) ? id : ('NA-' + NA_ENV.team().slice(0, 2).toUpperCase() + '-' + Utilities.formatDate(new Date(), naTz_(), 'yyMMddHHmmss') + '-' + Math.floor(Math.random() * 900 + 100)),
      created:naNow_(), team:NA_ENV.teamLabel(), status:NA_ST.draft, files:[], checklist:{}, lines:[] };
    var owner = naS_(d.pic) && naIsAdmin_(user) ? naS_(d.pic) : (cur ? cur.pic : naS_(user.pic));
    o.pic = owner;
    ['type','account','code','accType','province','npp','ptype','sku','orderNo','note'].forEach(function(f){ if(f in d) o[f] = naS_(d[f]); });
    if('orderDate' in d) o.orderDate = naIso_(d.orderDate);
    if('qty' in d) o.qty = d.qty === '' ? '' : naN_(d.qty);
    if('amount' in d) o.amount = d.amount === '' ? '' : naN_(d.amount);
    if(d.lines) o.lines = (d.lines || []).slice(0, 40);
    if(d.checklist) o.checklist = d.checklist;
    if(d.files) o.files = (d.files || []).filter(function(f){ return f && f.id; }).slice(0, 30);
    if(!/^(new_account|new_sku)$/.test(o.type)) o.type = 'new_account';
    o.month = naYm_(o.orderDate) || o.month || '';
    o.fy = naFy_(o.month) || o.fy || '';
    o.kpi = NA_ENV.kpiCode(o.pic) || o.kpi || '';
    if(!o.account) return { ok:false, error:naL_('Cần chọn Account (đại lý / khách hàng).', 'Please choose the account.') };

    /* trùng: cùng account mở mới 2 lần trong FY, hoặc cùng account + SKU */
    var dup = all.filter(function(x){
      if(x.id === o.id || x.status === NA_ST.rejected) return false;
      if(naNorm_(x.account) !== naNorm_(o.account)) return false;
      if(o.type === 'new_account') return x.type === 'new_account' && (!o.fy || x.fy === o.fy);
      var a = String(x.sku || '').split(/\r?\n|;/).map(naNorm_).filter(String), b = String(o.sku || '').split(/\r?\n|;/).map(naNorm_).filter(String);
      return x.type === 'new_sku' && a.some(function(s){ return b.indexOf(s) >= 0; });
    })[0];
    if(dup) return { ok:false, dup:dup.id, error:naL_('Đã có case ' + dup.id + ' (' + dup.pic + ', ' + dup.status + ') cho account' + (o.type === 'new_sku' ? ' + SKU' : '') + ' này — mở case đó thay vì tạo thêm.',
                                                     'Case ' + dup.id + ' (' + dup.pic + ', ' + dup.status + ') already exists for this account' + (o.type === 'new_sku' ? ' + SKU' : '') + ' — open it instead.') };

    var wk = naWeeklyProof_(o.pic, o.account, o.orderDate);
    o.weekly = naWeeklyText_(wk);
    var hist = NA_ENV.orders ? naOrderHistory_(o.account, o.month) : null;
    if(cur && cur.status === NA_ST.pending && !naIsAdmin_(user)){ o.status = NA_ST.draft; naLogLine_(o, user.pic, naL_('sửa khi đang chờ duyệt ⇒ về nháp', 'edited while pending ⇒ back to draft')); }
    if(cur && cur.status === NA_ST.rejected){ o.status = NA_ST.draft; o.decBy = ''; o.decAt = ''; naLogLine_(o, user.pic, naL_('mở lại sau khi bị từ chối', 'reopened after rejection')); }
    if(isNew) naLogLine_(o, user.pic, naL_('tạo case', 'created'));
    o.updated = naNow_();

    /* đặt tên chuẩn cho chứng từ: PIC_ddMMyyyy_Account_SKU */
    var folder = null;
    (o.files || []).forEach(function(f, k){
      try{
        var file = DriveApp.getFileById(f.id), want = naFileName_(o, k + 1, naExt_(f.name, f.mime));
        if(file.getName() !== want){ file.setName(want); f.name = want; }
        if(o.month && f.ym !== o.month){
          folder = folder || naFolder_(o.month);
          try{ file.moveTo(folder); f.ym = o.month; }catch(e2){}
        }
        o.folder = 'https://drive.google.com/drive/folders/' + (folder ? folder.getId() : NA_ENV.folderId());
      }catch(e){}
    });
    naWrite_(o); naBump_();
    try{ NA_ENV.log(user, isNew ? 'add' : 'update', o.account, (o.type === 'new_sku' ? 'New SKU ' : 'New account ') + (o.sku || '')); }catch(e){}
    naDecorate_(user, o);
    o.wk = wk; o.hist = hist;
    return { ok:true, rec:o, ver:naVer_(), message:naL_(isNew ? 'Đã lưu case (nháp)' : 'Đã cập nhật case', isNew ? 'Case saved (draft)' : 'Case updated') };
  } finally { lock.releaseLock(); }
}
function naUpload(user, p){
  var b64 = String(p.b64 || ''); if(!b64) return { ok:false, error:'No file' };
  b64 = b64.replace(/^data:[^,]*,/, '');
  var mime = naS_(p.mime) || 'application/octet-stream', ext = naExt_(p.name, mime);
  var ym = naS_(p.month).replace(/\D/g, '').slice(0, 6) || Utilities.formatDate(new Date(), naTz_(), 'yyyyMM');
  var tmp = { pic:naS_(p.owner) || naS_(user.pic), account:naS_(p.account) || 'Account', sku:naS_(p.sku), orderDate:naS_(p.orderDate), type:naS_(p.type) };
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, naFileName_(tmp, 0, ext).replace(/(\.[a-z0-9]+)$/i, '_' + Utilities.formatDate(new Date(), naTz_(), 'HHmmss') + Math.floor(Math.random() * 90 + 10) + '$1'));
  var folder = naFolder_(ym), file = folder.createFile(blob);
  try{ file.setDescription('MMH CRM · ' + naS_(p.caseId) + ' · ' + naS_(p.kind) + ' · ' + naS_(user.pic)); }catch(e){}
  try{ file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }catch(e){}
  return { ok:true, file:{ id:file.getId(), name:file.getName(), mime:mime, size:file.getSize(), kind:naS_(p.kind) || 'other', ym:ym, at:naNow_(), by:naS_(user.pic) } };
}
function naDelFile(user, p){
  var fid = naS_(p.fileId || p.id);
  if(!fid) return { ok:false, error:'No file id' };
  var cid = naS_(p.caseId);
  if(cid){
    var lock = LockService.getScriptLock();
    try{ lock.waitLock(15000); }catch(e){ return { ok:false, error:'Busy' }; }
    try{
      var o = naFind_(cid);
      if(o){
        if(!naCanEdit_(user, o)) return { ok:false, error:naL_('Bạn không sửa được case này.', 'You cannot edit this case.') };
        o.files = (o.files || []).filter(function(f){ return f.id !== fid; }); o.updated = naNow_(); naWrite_(o); naBump_();
      }
    } finally { lock.releaseLock(); }
  }
  try{ DriveApp.getFileById(fid).setTrashed(true); }catch(e){}
  return { ok:true };
}
function naDelete(user, p){
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(15000); }catch(e){ return { ok:false, error:'Busy' }; }
  try{
    var o = naFind_(naS_(p.id));
    if(!o) return { ok:true, message:'Not found' };
    if(!(naIsAdmin_(user) || (o.pic === naS_(user.pic) && o.status !== NA_ST.approved)))
      return { ok:false, error:naL_('Không xoá được case này.', 'You cannot delete this case.') };
    (o.files || []).forEach(function(f){ try{ DriveApp.getFileById(f.id).setTrashed(true); }catch(e){} });
    naSheet_().deleteRow(o._row); naBump_();
    try{ NA_ENV.log(user, 'delete', o.account, 'case ' + o.id); }catch(e){}
    return { ok:true, message:naL_('Đã xoá case', 'Case deleted') };
  } finally { lock.releaseLock(); }
}
/* kiểm tra đủ điều kiện theo rule trước khi gửi */
function naCheck_(o){
  var miss = [];
  if(!o.account) miss.push(naL_('Account', 'Account'));
  if(!o.npp) miss.push(naL_('Nhà phân phối', 'Distributor'));
  var needOrd = naNeedOrder_();
  if(!o.orderDate) miss.push(needOrd ? naL_('Ngày đơn đầu tiên', 'First order date') : naL_('Ngày NPP xác nhận mở mới', 'Distributor confirmation date'));
  /* nhóm không cần đơn hàng (Surgical / Eyeless / Thái): bắt buộc có lịch sử chăm sóc trên báo cáo tuần */
  if(!needOrd && o.account){ var wk0 = naWeeklyProof_(o.pic, o.account, o.orderDate); if(!wk0.n) miss.push(naL_('Lịch sử chăm sóc account trên Báo cáo tuần (chưa có lượt nào tới ngày ghi nhận)', 'Care history in the weekly report (no visit up to the date)')); }
  if(o.type === 'new_sku' && !o.sku) miss.push(naL_('Mã SKU mới', 'New SKU code'));
  var fs = o.files || [];
  if(!fs.length) miss.push(naL_('Chứng từ đính kèm', 'Evidence file'));
  else if(!fs.some(function(f){ return f.kind === 'dist'; })) miss.push(naL_('Chứng từ "Xác nhận NPP"', '"Distributor confirmation" evidence'));
  var c = o.checklist || {};
  ['first','month','mail'].forEach(function(k){ if(!c[k]) miss.push(naL_('Ô cam kết: ', 'Confirmation: ') + k); });
  return miss;
}
function naSubmit(user, p){
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok:false, error:'Busy' }; }
  var o;
  try{
    o = naFind_(naS_(p.id));
    if(!o) return { ok:false, error:naL_('Không tìm thấy case — lưu case trước.', 'Case not found — save it first.') };
    if(!(o.pic === naS_(user.pic) || naIsAdmin_(user))) return { ok:false, error:naL_('Chỉ PIC của case mới gửi được.', 'Only the case owner can submit.') };
    if(o.status === NA_ST.approved) return { ok:false, error:naL_('Case đã được duyệt.', 'The case is already approved.') };
    if(o.status === NA_ST.pending && o.subAt && !p.force){
      var t = new Date(String(o.subAt).replace(' ', 'T') + ':00');
      if(Date.now() - t.getTime() < 10 * 60000){ naDecorate_(user, o); return { ok:true, rec:o, dup:true, message:naL_('Email xin xác nhận đã được gửi lúc ', 'The request was already sent at ') + o.subAt }; }
    }
    var miss = naCheck_(o);
    if(miss.length) return { ok:false, miss:miss, error:naL_('Chưa đủ điều kiện gửi: ', 'Not ready to send: ') + miss.join(' · ') };
    var aps = naApprovers_(o.pic);
    var to = aps.map(function(x){ return NA_ENV.email(x); }).filter(String);
    if(!to.length) return { ok:false, error:naL_('Chưa cấu hình người duyệt cho ', 'No approver configured for ') + o.pic };
    var wk = naWeeklyProof_(o.pic, o.account, o.orderDate);
    o.weekly = naWeeklyText_(wk);
    o.status = NA_ST.pending; o.subAt = naNow_(); o.subTo = aps.join(', ');
    o.decBy = ''; o.decAt = ''; o.comment = '';
    naLogLine_(o, user.pic, naL_('gửi email xin xác nhận → ', 'request sent → ') + o.subTo);
    o.updated = naNow_();
    naWrite_(o); naBump_();
  } finally { lock.releaseLock(); }
  var cc = [NA_ENV.director, NA_ENV.hr, NA_ENV.email(o.pic)].filter(function(e, i, a){ return e && a.indexOf(e) === i && to.indexOf(e) < 0; });
  var mail = naSendMail_(o, 'submit', user, to, cc, wk);
  try{ NA_ENV.log(user, 'submit', o.account, 'case ' + o.id + ' → ' + o.subTo); }catch(e){}
  naDecorate_(user, o); o.wk = wk;
  return { ok:true, rec:o, mail:mail, message:naL_('Đã gửi email xin xác nhận tới ', 'Request sent to ') + o.subTo + (mail.warn ? ' · ' + mail.warn : '') };
}
function naDecide(user, p){
  var dec = naS_(p.decision).toLowerCase(), cm = naS_(p.comment), o, trashed = 0;
  if(!/^(approve|reject|return)$/.test(dec)) return { ok:false, error:'decision?' };
  if(dec === 'reject' && cm.length < 5) return { ok:false, error:naL_('Từ chối cần ghi rõ lý do (ít nhất 5 ký tự).', 'A rejection needs a reason (at least 5 characters).') };
  /* ⭐ 08/10/2026 — Trả lại bổ sung: case về Nháp, GIỮ chứng từ, PIC sửa rồi gửi lại */
  if(dec === 'return' && cm.length < 5) return { ok:false, error:naL_('Trả lại cần ghi rõ cần bổ sung gì (ít nhất 5 ký tự).', 'Please say what needs to be added (at least 5 characters).') };
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok:false, error:'Busy' }; }
  try{
    o = naFind_(naS_(p.id));
    if(!o) return { ok:false, error:'Case not found' };
    if(o.status !== NA_ST.pending){ naDecorate_(user, o); return { ok:true, rec:o, dup:true, message:naL_('Case đã được xử lý: ', 'Already decided: ') + o.status + (o.decBy ? ' · ' + o.decBy : '') }; }
    if(!naCanDecide_(user, o)) return { ok:false, error:naL_('Bạn không có quyền duyệt case này.', 'You cannot decide this case.') };
    o.decBy = naS_(user.pic); o.decAt = naNow_(); o.comment = cm;
    if(dec === 'approve'){ o.status = NA_ST.approved; naLogLine_(o, user.pic, naL_('XÁC NHẬN', 'APPROVED') + (cm ? ' · ' + cm : '')); }
    else if(dec === 'return'){ o.status = NA_ST.draft; naLogLine_(o, user.pic, naL_('TRẢ LẠI BỔ SUNG · ', 'RETURNED FOR CHANGES · ') + cm); }
    else {
      o.status = NA_ST.rejected;
      o.rejectedFiles = (o.files || []).map(function(f){ return f.name; });
      (o.files || []).forEach(function(f){ try{ DriveApp.getFileById(f.id).setTrashed(true); trashed++; }catch(e){} });
      naLogLine_(o, user.pic, naL_('TỪ CHỐI · ', 'REJECTED · ') + cm + ' · ' + naL_('đã xoá ', 'removed ') + trashed + naL_(' chứng từ', ' file(s)'));
      o.files = [];
    }
    o.updated = naNow_();
    naWrite_(o); naBump_();
    try{ if(typeof NA_ENV.kpiBump === 'function') NA_ENV.kpiBump(); }catch(e){}
  } finally { lock.releaseLock(); }
  var aps = naApprovers_(o.pic), to = [NA_ENV.email(o.pic)].filter(String);
  var cc = [NA_ENV.director, NA_ENV.hr, NA_ENV.email(user.pic)].concat(aps.map(function(x){ return NA_ENV.email(x); }))
    .filter(function(e, i, a){ return e && a.indexOf(e) === i && to.indexOf(e) < 0; });
  var mail = naSendMail_(o, dec === 'approve' ? 'approve' : dec === 'return' ? 'return' : 'reject', user, to, cc, null);
  try{ NA_ENV.log(user, dec, o.account, 'case ' + o.id + (cm ? ' · ' + cm : '')); }catch(e){}
  naDecorate_(user, o);
  return { ok:true, rec:o, mail:mail, trashed:trashed,
           message: dec === 'approve' ? naL_('Đã xác nhận — email đã gửi tới PIC, Director, kế toán trưởng', 'Approved — e-mail sent to the PIC, Director and chief accountant')
                  : dec === 'return' ? naL_('Đã trả lại để PIC bổ sung — chứng từ giữ nguyên, email đã gửi', 'Returned to the PIC for changes — evidence kept, e-mail sent')
                                      : naL_('Đã từ chối — chứng từ đã xoá, email đã gửi', 'Rejected — evidence removed, e-mail sent') };
}

/* ── email ── */
function naTypeLabel_(t){ return t === 'new_sku' ? naL_('SKU mới', 'New SKU') : naL_('Đại lý / khách hàng mới', 'New account'); }
function naMailHtml_(o, kind, user, wk){
  var L = naL_, e = naEsc_, link = NA_CRM_URL + '#na=' + encodeURIComponent(o.id);
  var head = kind === 'submit' ? L('ĐỀ XUẤT XÁC NHẬN MỞ MỚI', 'NEW ACCOUNT / SKU — APPROVAL REQUEST')
           : kind === 'approve' ? L('ĐÃ XÁC NHẬN MỞ MỚI', 'NEW ACCOUNT / SKU — APPROVED')
           : kind === 'return' ? L('CẦN BỔ SUNG CASE MỞ MỚI', 'NEW ACCOUNT / SKU — CHANGES REQUESTED')
           : L('KHÔNG XÁC NHẬN MỞ MỚI', 'NEW ACCOUNT / SKU — REJECTED');
  var col = kind === 'approve' ? '#1E7B34' : kind === 'reject' ? '#B3261E' : kind === 'return' ? '#B45309' : '#3A5CAA';
  var td = 'padding:7px 10px;border-bottom:1px solid #E3E8EF;font-size:13.5px;vertical-align:top;';
  var row = function(k, v){ return '<tr><td style="' + td + 'color:#5F6B78;width:34%;white-space:nowrap">' + k + '</td><td style="' + td + 'color:#1A1A1A;font-weight:600">' + v + '</td></tr>'; };
  var h = [];
  h.push('<div style="font-family:Aptos,Calibri,Arial,sans-serif;background:#F4F7FB;padding:18px 10px"><div style="max-width:720px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #DCE3EC">');
  h.push('<div style="background:' + col + ';color:#fff;padding:16px 22px"><div style="font-size:12px;letter-spacing:.08em;opacity:.9">MMH CRM · ' + e(NA_ENV.teamLabel()) + '</div>' +
         '<div style="font-size:20px;font-weight:800;margin-top:3px">' + head + '</div>' +
         '<div style="font-size:14px;margin-top:4px">' + e(naTypeLabel_(o.type)) + ' · <b>' + e(o.account) + '</b> · ' + e(o.pic) + '</div></div>');
  h.push('<div style="padding:16px 22px">');
  if(kind === 'submit') h.push('<p style="font-size:14px;margin:0 0 12px">' + L('Kính gửi anh/chị ' + e(o.subTo) + ',<br>Em xin gửi case mở mới dưới đây, kèm chứng từ theo quy định KPI. Anh/chị vui lòng xác nhận trên CRM.',
                                                                              'Dear ' + e(o.subTo) + ',<br>Please find below a new account / SKU case with the evidence required by the KPI rule. Please approve it in the CRM.') + '</p>');
  if(kind !== 'submit') h.push('<div style="border-left:4px solid ' + col + ';background:' + (kind === 'approve' ? '#EAF6EC' : kind === 'return' ? '#FFF6E5' : '#FCEDEC') + ';padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:14px">' +
    '<b>' + (kind === 'approve' ? L('Đã xác nhận bởi ', 'Approved by ') : kind === 'return' ? L('Trả lại bổ sung bởi ', 'Returned for changes by ') : L('Từ chối bởi ', 'Rejected by ')) + e(o.decBy) + '</b> · ' + e(o.decAt) +
    (o.comment ? '<div style="margin-top:4px">💬 ' + e(o.comment) + '</div>' : '') +
    (kind === 'return' ? '<div style="margin-top:4px;color:#7A4A00">' + L('Chứng từ được giữ nguyên. PIC mở case trên CRM, bổ sung theo nhận xét rồi bấm Gửi email xin xác nhận lại.', 'The evidence is kept. The PIC opens the case in the CRM, completes it as requested and sends it for approval again.') + '</div>' : '') +
    (kind === 'reject' ? '<div style="margin-top:4px;color:#7A2E2A">' + L('Chứng từ của case đã được xoá khỏi folder Drive. PIC có thể mở lại case, bổ sung và gửi lại.', 'The evidence files were removed from Drive. The PIC can reopen the case, complete it and send again.') + '</div>' : '') + '</div>');
  h.push('<table style="width:100%;border-collapse:collapse">');
  h.push(row(L('Loại case', 'Case type'), e(naTypeLabel_(o.type)) + (o.kpi ? ' · KPI ' + e(o.kpi) : '')));
  h.push(row(L('Account', 'Account'), e(o.account) + (o.code ? ' <span style="color:#5F6B78;font-weight:400">(' + e(o.code) + ')</span>' : '') + (o.accType || o.province ? '<br><span style="color:#5F6B78;font-weight:400">' + e([o.accType, o.province].filter(String).join(' · ')) + '</span>' : '')));
  h.push(row(L('Nhà phân phối', 'Distributor'), e(o.npp)));
  h.push(row(naNeedOrder_() ? L('Đơn đầu tiên', 'First order') : L('Ngày NPP xác nhận', 'Distributor confirmation'), e(o.orderDate) + (o.orderNo ? ' · ' + e(o.orderNo) : '') + ' · ' + L('tháng KPI ', 'KPI month ') + e(o.month)));
  if(o.sku || o.ptype) h.push(row(L('Sản phẩm / SKU', 'Product / SKU'), e(o.ptype ? o.ptype + ' · ' : '') + e(o.sku).replace(/\n/g, '<br>')));
  if((o.lines || []).length) h.push(row(L('Chi tiết đơn', 'Order lines'), (o.lines || []).map(function(x){ return e(x.ptype || '') + ' · ' + e(String(x.detail || '').replace(/\n/g, ', ')) + ' · SL ' + e(x.qty || '') + (x.price ? ' × ' + e(Number(x.price).toLocaleString('en-US')) : ''); }).join('<br>')));
  if(o.qty || o.amount) h.push(row(L('Số lượng / Giá trị', 'Qty / Amount'), (o.qty ? e(o.qty) : '—') + ' · ' + (o.amount ? Number(o.amount).toLocaleString('en-US') + (NA_ENV.lang() === 'en' ? '' : ' VND') : '—')));
  h.push(row(L('Báo cáo tuần', 'Weekly report'), e(o.weekly || '') + (wk && wk.list && wk.list.length ? '<div style="font-weight:400;color:#5F6B78;margin-top:4px;font-size:12.5px">' + wk.list.slice(0, 4).map(function(x){ return e(x.d) + ' · ' + e(x.a) + (x.r ? ' — ' + e(x.r) : ''); }).join('<br>') + '</div>' : '')));
  if(o.note) h.push(row(L('Ghi chú', 'Note'), e(o.note).replace(/\n/g, '<br>')));
  h.push('</table>');
  var fs = o.files || [];
  if(fs.length){
    h.push('<div style="margin-top:14px;font-size:13px;font-weight:800;color:#003047">' + L('CHỨNG TỪ (' + fs.length + ' file, đính kèm email)', 'EVIDENCE (' + fs.length + ' file(s), attached)') + '</div><div style="margin-top:6px">');
    fs.forEach(function(f){
      var u = 'https://drive.google.com/file/d/' + f.id + '/view';
      h.push('<a href="' + u + '" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none;color:#1A1A1A;width:150px;vertical-align:top">' +
        '<img src="https://drive.google.com/thumbnail?id=' + f.id + '&sz=w300" width="150" style="width:150px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #DCE3EC;display:block" alt="">' +
        '<span style="display:block;font-size:11px;color:#5F6B78;margin-top:3px;word-break:break-all">' + e(naKindLabel_(f.kind)) + '</span></a>');
    });
    h.push('</div>');
  } else if(kind === 'reject' && o.rejectedFiles && o.rejectedFiles.length){
    h.push('<div style="margin-top:10px;font-size:12px;color:#7A2E2A">' + L('Đã xoá: ', 'Removed: ') + e(o.rejectedFiles.join(', ')) + '</div>');
  }
  h.push('<div style="margin:18px 0 6px;text-align:center"><a href="' + link + '" style="display:inline-block;background:' + col + ';color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:12px 26px;border-radius:10px">' +
    (kind === 'submit' ? L('✉ Mở CRM để xác nhận / từ chối', '✉ Open the CRM to approve / reject') : L('Mở case trên CRM', 'Open the case in the CRM')) + '</a></div>');
  h.push('<div style="font-size:11.5px;color:#8A95A3;text-align:center">' + e(o.id) + ' · ' + L('gửi tự động từ MMH CRM', 'sent automatically by MMH CRM') + '</div>');
  h.push('</div></div></div>');
  return h.join('');
}
function naKindLabel_(k){ return k === 'dist' ? naL_('Xác nhận NPP', 'Distributor confirmation') : k === 'order' ? naL_('Chứng từ đơn hàng', 'Order document') : k === 'tender' ? naL_('Thông báo trúng thầu', 'Tender award') : naL_('Khác', 'Other'); }
function naSendMail_(o, kind, user, to, cc, wk){
  var out = { ok:false };
  try{
    var subj = (kind === 'submit' ? naL_('[MMH CRM] Xin xác nhận ', '[MMH CRM] Approval request · ') : kind === 'approve' ? naL_('[MMH CRM] ĐÃ XÁC NHẬN ', '[MMH CRM] APPROVED · ') : kind === 'return' ? naL_('[MMH CRM] CẦN BỔ SUNG ', '[MMH CRM] CHANGES REQUESTED · ') : naL_('[MMH CRM] KHÔNG XÁC NHẬN ', '[MMH CRM] REJECTED · ')) +
      naTypeLabel_(o.type) + ' · ' + o.account + ' · ' + o.pic + (o.month ? ' · ' + o.month : '');
    var att = [], size = 0, skipped = 0;
    if(kind !== 'reject' && kind !== 'return') (o.files || []).forEach(function(f){
      try{ var b = DriveApp.getFileById(f.id).getBlob(); var s = b.getBytes().length; if(size + s > NA_MAX_ATTACH){ skipped++; return; } size += s; att.push(b); }catch(e){ skipped++; }
    });
    var html = naMailHtml_(o, kind, user, wk);
    var opt = { to:to.join(','), subject:subj, htmlBody:html, name:'MMH CRM · ' + (kind === 'submit' ? o.pic : user.pic) };
    if(cc && cc.length) opt.cc = cc.join(',');
    var rt = NA_ENV.email(kind === 'submit' ? o.pic : user.pic); if(rt) opt.replyTo = rt;
    if(att.length) opt.attachments = att;
    mmhMail_(opt);
    out = { ok:true, to:to, cc:cc, files:att.length };
    if(skipped) out.warn = naL_(skipped + ' file quá lớn — chỉ gửi link', skipped + ' file(s) too large — linked only');
  }catch(e){ out = { ok:false, error:String(e && e.message || e), warn:naL_('Chưa gửi được email: ', 'E-mail not sent: ') + String(e && e.message || e) }; }
  return out;
}

/* ═════════════ ③ KR — BÁO CÁO KPI THÁNG (đọc file MMH KPI FY68) ═════════════ */
var KR = { M5:'5. Member KPI Monthly', STAFF:'0. Staff List', DIR:'KPI EMAIL DIRECTORY', LOG:'_KPI_EMAIL_LOG', CC_ALWAYS:'vtt.hoa@manimedicalhanoi.com', TTL:60 };
function krNorm_(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function krNum_(v){ if(v === '' || v == null) return null; if(typeof v === 'number') return isFinite(v) ? v : null; var s = String(v).trim(); if(!s || /^#/.test(s)) return null;
  var pc = /%$/.test(s); s = s.replace(/[%\s]/g, '').replace(/,(?=\d{3}\b)/g, ''); if(/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.'); var x = parseFloat(s); if(isNaN(x)) return null; return pc ? x / 100 : x; }
function krMasterSS_(){
  var id = '';
  /* ⭐ v10.3 — file KPI thật = link ở ô D9 tab KPI (file KPI tự ghi vào đó); code chỉ là dự phòng */
  try{ id = k68IdOf_(String(NA_ENV.kpiLink() || '')); }catch(e){}
  if(!id) try{ id = k68IdOf_(K68_MASTER_LINK); }catch(e){}
  if(!id) throw new Error('KPI file link missing');
  return SpreadsheetApp.openById(id);
}
function krMembers_(book){
  var sh = book.getSheetByName(KR.M5), out = { members:{}, keys:[] };
  if(!sh || sh.getLastRow() < 5) throw new Error('Sheet "' + KR.M5 + '" not found in the KPI file');
  var V = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues(), hr = -1, H = {}, P = {};
  for(var i = 0; i < Math.min(V.length, 12) && hr < 0; i++){ var h = V[i].map(krNorm_); if(h.indexOf('member') >= 0 && h.indexOf('kpi code') >= 0) hr = i; }
  if(hr < 0) throw new Error('Header row of "' + KR.M5 + '" not found');
  V[hr].forEach(function(x, k){
    var s = String(x || '').replace(/\s+/g, ' ').trim(), m = /^(\d{6}|Q[1-4]|FY\d+) (Target|Actual|Weight|%|% x W)$/i.exec(s);
    if(m){ var key = m[1].toUpperCase(), f = { target:'t', actual:'a', weight:'w', '%':'p', '% x w':'pw' }[m[2].toLowerCase()]; (P[key] = P[key] || {})[f] = k; }
    else { var nn = krNorm_(s); if(nn && H[nn] == null) H[nn] = k; }
  });
  var cM = H['member'], cC = H['kpi code'], cG = H['kpi group'], cN = H['kpi name'], cU = H['unit'], cA = H['agg'];
  function vals(row){ var o = {}; Object.keys(P).forEach(function(key){ var c = P[key], x = {}; ['t','a','w','p','pw'].forEach(function(f){ x[f] = c[f] == null ? null : krNum_(row[c[f]]); }); o[key] = x; }); return o; }
  for(var r = hr + 1; r < V.length; r++){
    var row = V[r], tc = -1;
    for(var q0 = 0; q0 < Math.min(row.length, 12); q0++){ if(/^\s*TOTAL\b/i.test(String(row[q0] || ''))){ tc = q0; break; } }
    if(tc >= 0){
      var who = tc > 0 ? String(row[0] || '').trim() : '';
      if(!who){ var mm = /TOTAL\s*[-–:]\s*([^(]+)/i.exec(String(row[tc] || '')); who = mm ? mm[1].trim() : ''; }
      if(!who) continue;
      (out.members[who] = out.members[who] || { rows:{}, order:[] }).total = vals(row); continue;
    }
    var mem = String(row[cM] || '').trim(), code = String(row[cC] || '').trim();
    if(!mem || !code) continue;
    var M = out.members[mem] = out.members[mem] || { rows:{}, order:[] };
    if(!M.rows[code]) M.order.push(code);
    M.rows[code] = { code:code, group:cG == null ? '' : String(row[cG] || '').trim(), name:cN == null ? '' : String(row[cN] || '').trim(),
                     unit:cU == null ? '' : String(row[cU] || '').trim(), agg:cA == null ? '' : String(row[cA] || '').trim(), v:vals(row) };
  }
  out.keys = Object.keys(P);
  out.url = book.getUrl() + '#gid=' + sh.getSheetId();
  return out;
}
function krStaff_(book){
  var st = book.getSheetByName(KR.STAFF), staff = [];
  if(st && st.getLastRow() >= 3){
    var V = st.getRange(1, 1, st.getLastRow(), Math.min(st.getLastColumn(), 16)).getValues(), hr = -1, H = {};
    for(var i = 0; i < Math.min(V.length, 10) && hr < 0; i++){ var h = V[i].map(krNorm_); if(h.some(function(x){ return /^kpi name/.test(x); }) && h.some(function(x){ return /^full name/.test(x); })) hr = i; }
    if(hr >= 0){
      V[hr].forEach(function(x, k){ var nn = krNorm_(x); if(nn && H[nn] == null) H[nn] = k; });
      var col = function(re){ var k = null; Object.keys(H).forEach(function(x){ if(k == null && re.test(x)) k = H[x]; }); return k; };
      var cK = col(/^kpi name/), cF = col(/^full name/), cJ = col(/^job title/), cL = col(/^job level/), cR = col(/^mgmt/), cT = col(/^team$/), cD = col(/^department/);
      for(var r = hr + 1; r < V.length; r++){
        var full = String(V[r][cF] || '').trim(), key = String(V[r][cK] || '').trim(); if(!full && !key) continue;
        staff.push({ key:key, full:full, title:cJ == null ? '' : String(V[r][cJ] || '').trim(), level:cL == null ? '' : String(V[r][cL] || '').trim(), role:cR == null ? '' : String(V[r][cR] || '').trim(),
                     team:cT == null ? '' : String(V[r][cT] || '').trim(), dept:cD == null ? '' : String(V[r][cD] || '').trim(), email:'' });
      }
    }
  }
  var dir = book.getSheetByName(KR.DIR), mail = {}, cc = KR.CC_ALWAYS;
  if(dir && dir.getLastRow() >= 5){
    cc = String(dir.getRange(2, 3).getValue() || '').trim() || cc;
    dir.getRange(5, 1, dir.getLastRow() - 4, 3).getValues().forEach(function(r){ var id = String(r[0] || r[1] || '').trim(); if(id && r[2]) mail[id] = String(r[2]).trim(); });
  }
  staff.forEach(function(s){ s.email = mail[s.key] || mail[s.full] || NA_ENV.email(s.key) || ''; });
  return { staff:staff, cc:cc };
}
function krRecipients_(D, pic){
  var me = D.staff.filter(function(s){ return s.key === pic; })[0] || { key:pic, email:NA_ENV.email(pic) };
  var isTL = /team leader/i.test(me.role), isHOD = /hod/i.test(me.role);
  var tl = me.team ? D.staff.filter(function(s){ return s !== me && s.team === me.team && /team leader/i.test(s.role); })[0] : null;
  var hod = D.staff.filter(function(s){ return s !== me && s.dept && s.dept === me.dept && /hod/i.test(s.role); })[0];
  var dir = D.staff.filter(function(s){ return s !== me && /director/i.test(s.level); })[0];
  var toP = (!isTL && !isHOD && tl) ? tl : ((!isHOD ? hod : null) || dir);
  var to = toP && toP.email ? [toP.email] : [], cc = [];
  [hod, dir].forEach(function(p){ if(p && p.email) cc.push(p.email); });
  String(D.cc || '').split(/[,;\s]+/).forEach(function(e){ if(e) cc.push(e); });
  cc = cc.filter(function(e, i){ return cc.indexOf(e) === i && to.indexOf(e) < 0 && e !== me.email; });
  return { me:me, to:to, cc:cc, toName:toP ? (toP.key || toP.full) : '' };
}
/* tháng đã kết thúc (chỉ để hiển thị ✓ — không còn khoá số) */
function krClosed_(ym){ return String(ym) < Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM'); }
function krAllowed_(user, member){
  if(naS_(member) === naS_(user.pic)) return true;
  if(naIsAdmin_(user)) return true;
  var aps = naApprovers_(member); return aps.indexOf(naS_(user.pic)) >= 0;
}
function krData(user, p){
  var member = naS_(p.member) || naS_(user.pic);
  if(!krAllowed_(user, member)) return { ok:false, error:naL_('Bạn chỉ xem / gửi được KPI của mình.', 'You can only view / send your own KPI.') };
  var ck = 'KR_' + naNorm_(member).replace(/\W/g, '_');
  if(!p.fresh){ try{ var c = CacheService.getScriptCache().get(ck); if(c) return JSON.parse(c); }catch(e){} }
  var book = krMasterSS_(), M5 = krMembers_(book), mem = M5.members[member];
  if(!mem){
    var alt = Object.keys(M5.members).filter(function(k){ return krNorm_(k) === krNorm_(member); })[0];
    mem = alt ? M5.members[alt] : null; if(alt) member = alt;
  }
  if(!mem) return { ok:false, error:naL_('Sheet 5. Member KPI Monthly chưa có dòng của ', 'Sheet 5. Member KPI Monthly has no rows for ') + member };
  var months = M5.keys.filter(function(k){ return /^\d{6}$/.test(k); }).sort();
  /* Target / Actual tháng trống ở sheet 5 ⇒ lấy đúng ô "<tháng> Target / Actual" của 3. Detail KPI */
  try{
    var dsh = book.getSheetByName('3. Detail KPI');
    if(dsh){
      var DL = kh_layout_(dsh);
      if(!months.length) months = DL.months.slice();
      mem.order.forEach(function(code){
        var ri = DL.rows[code], rw = mem.rows[code]; if(ri == null || !rw) return;
        DL.months.forEach(function(m){
          var x = rw.v[m] = rw.v[m] || { t:null, a:null, w:null, p:null, pw:null };
          if(x.t == null && DL.tCol[m] != null) x.t = krNum_(DL.V[ri][DL.tCol[m]]);
          if(x.a == null && DL.aCol[m] != null) x.a = krNum_(DL.V[ri][DL.aCol[m]]);
        });
      });
    }
  }catch(e){}
  /* ⭐ v10.3 — rule Target = 0 (kỳ đã tới) ⇒ đạt 100%, nhận đủ trọng số (giống sheet 5) */
  var curYm = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM');
  var qStart = {}; months.forEach(function(m, i){ var q = 'Q' + (Math.floor(i / 3) + 1); if(!qStart[q]) qStart[q] = m; });
  mem.order.forEach(function(code){
    var vv = mem.rows[code].v || {};
    Object.keys(vv).forEach(function(K){
      var x = vv[K]; if(!x || x.t !== 0) return;
      var started = /^\d{6}$/.test(K) ? K <= curYm : /^Q/.test(K) ? (qStart[K] && qStart[K] <= curYm) : true;
      if(!started) return;
      if(x.p == null) x.p = 1;
      if(x.pw == null && x.w != null) x.pw = x.w;
      x.zero = true;
    });
  });
  /* dòng TOTAL không đọc được ⇒ cộng % × W của từng dòng (đúng số sheet 5) */
  var tot = mem.total || {};
  M5.keys.forEach(function(K){
    if(tot[K] && tot[K].pw != null) return;
    var s = null, w = null;
    mem.order.forEach(function(code){ var x = (mem.rows[code].v || {})[K]; if(x && x.pw != null){ s = (s || 0) + x.pw; } if(x && x.w != null) w = (w || 0) + x.w; });
    if(s != null) tot[K] = { pw:s, w:w, calc:true };
  });
  mem.total = tot;
  var D = krStaff_(book), R = krRecipients_(D, member);
  var rows = mem.order.map(function(code){ return mem.rows[code]; });
  var team = []; try{ team = NA_ENV.teamPics().filter(function(pc){ return krAllowed_(user, pc); }); }catch(e){}
  if(team.indexOf(naS_(user.pic)) < 0 && M5.members[naS_(user.pic)]) team.unshift(naS_(user.pic));
  rows.forEach(function(r){ r.short = krShort_(r, NA_ENV.lang()); r.gs = krGroupShort_(r.group, NA_ENV.lang()); });
  var out = { ok:true, kr:true, member:member, kpiFile:book.getName(), kpiId:book.getId(), full:(R.me.full || member), title:R.me.title || NA_ENV.title(member) || '', months:months,
              closed:months.filter(krClosed_), cur:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMM'),
              rows:rows, total:mem.total || {}, to:R.to, cc:R.cc, toName:R.toName, src:M5.url, members:team,
              book:D.staff.filter(function(s){ return s.email; }).map(function(s){ return { k:s.key || s.full, e:s.email, t:s.title }; }),
              readAt:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') };
  try{ var s = JSON.stringify(out); if(s.length < 95000) CacheService.getScriptCache().put(ck, s, KR.TTL); }catch(e){}
  return out;
}
function krQOf_(months, m){ var i = months.indexOf(String(m)); return i < 0 ? '' : 'Q' + (Math.floor(i / 3) + 1); }
function krPct_(v){ return v == null ? '—' : (Math.round(v * 1000) / 10) + '%'; }
function krFmt_(v, unit){ if(v == null) return '—'; if(/%/.test(unit || '')) return krPct_(v); var a = Math.abs(v); return Number(v).toLocaleString('en-US', { maximumFractionDigits: a >= 100 ? 0 : (a >= 10 ? 1 : 2) }); }
function krColor_(p){ return p == null ? '#8A95A3' : p >= 1.2 ? '#1E7B34' : p >= 1 ? '#2E7D32' : p >= 0.9 ? '#B7791F' : '#B3261E'; }
/* ⭐ v10.3 — tên KPI ngắn gọn (tên đầy đủ hiện khi rê chuột / trong ngoặc ở email) */
function krSeg_(name){
  var s = String(name || ''), m = /[–-]\s*([^–]+?)\s*$/.exec(s), last = m ? m[1].trim() : '';
  var npp = /([^,]+?)\s+Distributor/i.exec(last); if(npp) return npp[1].replace(/\s*\(new\)\s*/i, '').trim();
  var reg = /(North|Central|South|Thailand)/i.exec(last); if(reg) return ({ north:'miền Bắc', central:'miền Trung', south:'miền Nam', thailand:'Thái Lan' })[reg[1].toLowerCase()];
  return '';
}
function krShort_(r, lang){
  var en = lang === 'en', n = String(r.name || ''), c = String(r.code || ''), seg = krSeg_(n), L = function(vi, e){ return en ? e : vi; };
  var regEn = { 'miền Bắc':'North', 'miền Trung':'Central', 'miền Nam':'South', 'Thái Lan':'Thailand' };
  var tag = seg ? (en ? (regEn[seg] || seg) : seg) : '';
  var base;
  if(/^F6/.test(c) || /New & Relaunched/i.test(n)) base = /JIZAI/i.test(n) ? L('Doanh số JIZAI', 'JIZAI sales') : /Composite/i.test(n) ? L('Doanh số Composite', 'Composite sales') : L('Doanh số SP mới', 'New-product sales');
  else if(/^F/.test(c)) base = /Manipler/i.test(n) ? L('Doanh số Manipler', 'Manipler sales') : /Knife|Suture/i.test(n) ? L('Doanh số Dao · Chỉ', 'Knife · Suture sales') : /Hook|Forceps/i.test(n) ? L('Doanh số Hook · Forceps', 'Hook · Forceps sales') : L('Doanh số NPP', 'Distributor sales');
  else if(/^C1-/.test(c)) base = L('Mở mới đại lý / SKU', 'New accounts / SKUs');
  else if(/^C2-02/.test(c)) base = L('Lập hồ sơ key account', 'Key-account profiles');
  else if(/^C2-/.test(c)) base = /Key Account/i.test(n) ? L('Key account mới', 'New key accounts') : L('Mở mới account / SKU', 'New accounts / SKUs');
  else if(/^C3-/.test(c)) base = /Dealer/i.test(n) ? L('Viếng thăm đại lý', 'Dealer visits') : /Distributor|End Customer/i.test(n) ? L('Viếng thăm NPP / KH cuối', 'Distributor / end-customer visits') : /Co-?visit/i.test(n) ? L('Đi cùng sales', 'Co-visits') : L('Viếng thăm khách hàng', 'Customer visits');
  else if(/^C5-/.test(c)) base = L('Doanh số hỗ trợ bán', 'Supported sales');
  else if(/^C6-/.test(c)) base = L('SL Composite hỗ trợ', 'Composite qty supported');
  else if(/^C7-/.test(c)) base = L('SL JIZAI hỗ trợ', 'JIZAI qty supported');
  else if(/^C10-/.test(c)) base = /Training/i.test(n) ? L('Sự kiện đào tạo KH', 'Customer training events') : /Presentation|Demonstration/i.test(n) ? L('Giới thiệu SP / case demo', 'Product presentations / demos') : L('Sự kiện T&E', 'T&E events');
  else if(/^L2-/.test(c)) base = /Internal Training/i.test(n) ? L('Đào tạo nội bộ (người dạy)', 'Internal training delivered') : L('Đào tạo & phát triển', 'Training & development');
  else if(/^L3-/.test(c)) base = L('Điểm hành vi (KBI)', 'Behaviour score (KBI)');
  else { base = n.replace(/^(Number of|MMH)\s+/i, '').split(/\s+[–-]\s+/)[0]; tag = ''; }
  return base + (tag && !/KBI|nội bộ|Internal/.test(base) ? ' · ' + tag : '');
}
function krGroupShort_(g, lang){
  var en = lang === 'en', s = String(g || ''), L = function(vi, e){ return en ? e : vi; };
  if(/Turnover/i.test(s) && /New|Relaunch/i.test(s)) return L('Doanh số sản phẩm mới', 'New-product turnover');
  if(/Turnover/i.test(s)) return L('Doanh số', 'Turnover');
  if(/Supported/i.test(s)) return L('Bán hàng hỗ trợ', 'Supported sales');
  if(/Visit/i.test(s)) return L('Viếng thăm khách hàng', 'Customer visits');
  if(/New Customer|Account/i.test(s)) return L('Mở mới', 'New accounts');
  if(/Event/i.test(s)) return L('Sự kiện', 'Events');
  if(/Training|Development/i.test(s)) return L('Đào tạo', 'Training');
  if(/Behaviour|Behavior/i.test(s)) return L('Hành vi', 'Behaviour');
  return s.replace(/^[^–-]+[–-]\s*/, '') || 'KPI';
}
/* tiền USD hiển thị cùng kiểu với app: $1,234 */
function krMoney_(v, unit, withUnit){
  if(/usd/i.test(unit || '')) return v == null ? '—' : '$' + Math.round(v).toLocaleString('en-US');
  return krFmt_(v, unit) + (withUnit && !/%/.test(unit || '') ? ' ' + naEsc_(unit) : '');
}
/* email báo cáo KPI: trang trọng, font Aptos, bảng có cột tiến độ */
function krMailHtml_(d, f){
  var e = naEsc_, m = String(f.month), q = krQOf_(d.months, m), fy = (d.months[0] ? naFy_(d.months[0]) : 'FY');
  var T = d.total || {}, tm = (T[m] || {}).pw, tq = (T[q] || {}).pw, tf = (T[fy.toUpperCase()] || {}).pw;
  var ml = m.slice(4, 6) + '/' + m.slice(0, 4), en = f.lang === 'en', L = function(vi, enS){ return en ? enS : vi; };
  var font = "font-family:Aptos,'Segoe UI',Calibri,Arial,sans-serif;";
  var td = 'border:1px solid #BFBFBF;padding:5px 8px;font-size:13px;' + font;
  var th = td + 'background:#F2F2F2;font-weight:bold;';
  var bar = function(p){ var w = Math.max(0, Math.min(100, Math.round((p || 0) * 100))); var c = p == null ? '#BFBFBF' : p >= 1 ? '#548235' : p >= 0.8 ? '#BF8F00' : '#C00000';
    return '<table cellpadding="0" cellspacing="0" style="width:110px;border-collapse:collapse"><tr><td style="height:9px;width:' + w + '%;background:' + c + ';font-size:1px">&nbsp;</td><td style="height:9px;background:#E7E6E6;font-size:1px">&nbsp;</td></tr></table>'; };
  var h = ['<div style="' + font + 'font-size:14px;color:#000;line-height:1.5">'];
  if(f.greeting) h.push('<p style="margin:0 0 8px">' + e(f.greeting).replace(/\n/g, '<br>') + '</p>');
  if(f.intro) h.push('<p style="margin:0 0 12px">' + e(f.intro).replace(/\n/g, '<br>') + '</p>');
  h.push('<p style="margin:0 0 6px"><b>1. ' + L('Kết quả KPI tháng ', 'KPI results – ') + ml + '</b> · ' + e(d.full || d.member) + (d.title ? ' (' + e(d.title) + ')' : '') + '</p>');
  h.push('<p style="margin:0 0 8px">' + L('Tổng KPI: tháng ', 'Total KPI: month ') + '<b>' + krPct_(tm) + '</b> · ' + q + ' <b>' + krPct_(tq) + '</b> · ' + fy + L(' lũy kế ', ' to date ') + '<b>' + krPct_(tf) + '</b></p>');
  h.push('<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;' + font + '"><tr>' +
    [L('Nhóm KPI', 'KPI group'), 'KPI', L('Trọng số', 'Weight'), 'Target', 'Actual', L('% đạt', '% achieved'), L('Tiến độ', 'Progress'), '% × W']
      .map(function(x, i){ return '<th style="' + th + (i > 1 ? 'text-align:right;' : 'text-align:left;') + '">' + x + '</th>'; }).join('') + '</tr>');
  var lastG = '';
  d.rows.forEach(function(r){
    var v = (r.v || {})[m] || {}, w = v.w != null ? v.w : ((r.v || {})[q] || {}).w; if(!w) return;
    var g = r.gs || krGroupShort_(r.group, f.lang);
    h.push('<tr><td style="' + td + 'color:#404040">' + (g !== lastG ? e(g) : '') + '</td>' +
      '<td style="' + td + '"><b>' + e(r.code) + '</b> ' + e(r.short || krShort_(r, f.lang)) + (v.zero ? ' <span style="color:#7F7F7F">(' + L('target = 0 ⇒ đạt 100%', 'target = 0 ⇒ 100%') + ')</span>' : '') + '</td>' +
      '<td style="' + td + 'text-align:right">' + krPct_(w) + '</td>' +
      '<td style="' + td + 'text-align:right">' + krMoney_(v.t, r.unit, true) + '</td>' +
      '<td style="' + td + 'text-align:right"><b>' + krMoney_(v.a, r.unit, false) + '</b></td>' +
      '<td style="' + td + 'text-align:right"><b>' + krPct_(v.p) + '</b></td>' +
      '<td style="' + td + '">' + bar(v.p) + '</td>' +
      '<td style="' + td + 'text-align:right">' + krPct_(v.pw) + '</td></tr>');
    lastG = g;
  });
  h.push('<tr><td colspan="7" style="' + th + 'text-align:right">TOTAL ' + ml + '</td><td style="' + th + 'text-align:right">' + krPct_(tm) + '</td></tr></table>');
  var lines = function(t){ return String(t || '').split(/\n/).map(function(x){ return x.replace(/^\s*[-•*·]\s*/, '').trim(); }).filter(String); };
  [['2. Analysis & Next Actions', f.analysis], ['3. Highlights & Challenges', f.highlights]].forEach(function(s){
    var ls = lines(s[1]); if(!ls.length) return;
    h.push('<p style="margin:14px 0 4px"><b>' + s[0] + '</b></p><ul style="margin:0 0 0 20px;padding:0">' + ls.map(function(x){ return '<li>' + e(x) + '</li>'; }).join('') + '</ul>');
  });
  if(f.sign) h.push('<p style="margin:16px 0 0">' + e(f.sign).replace(/\n/g, '<br>') + '</p>');
  h.push('<p style="margin:14px 0 0;font-size:11px;color:#7F7F7F">' + L('Số liệu: sheet 5. Member KPI Monthly – ', 'Source: sheet 5. Member KPI Monthly – ') + e(d.kpiFile || 'MMH KPI FY68') + ', ' + e(d.readAt) + '.</p>');
  h.push('</div>');
  return h.join('');
}
function krForm_(p){
  return { month:naS_(p.month), greeting:String(p.greeting || ''), intro:String(p.intro || ''), analysis:String(p.analysis || ''),
           highlights:String(p.highlights || ''), sign:String(p.sign || ''), lang:naS_(p.lang) || NA_ENV.lang() };
}
function krPreview(user, p){
  var d = krData(user, p); if(!d.ok) return d;
  var f = krForm_(p); if(!f.month) return { ok:false, error:'month?' };
  return { ok:true, html:krMailHtml_(d, f), subject:'[MMH KPI] ' + naL_('Báo cáo KPI tháng ', 'KPI report ') + f.month.slice(4, 6) + '/' + f.month.slice(0, 4) + ' — ' + d.member };
}
function krSend(user, p){
  var d = krData(user, p); if(!d.ok) return d;
  var f = krForm_(p); if(!f.month) return { ok:false, error:'month?' };
  var split = function(s){ return String(s || '').split(/[,;\s]+/).map(function(x){ return x.trim().toLowerCase(); }).filter(function(x){ return /^[^@\s]+@(manimedicalhanoi\.com|mani\.inc)$/i.test(x); }); };
  var to = split(p.to), cc = split(p.cc).filter(function(x){ return to.indexOf(x) < 0; });
  if(!to.length) return { ok:false, error:naL_('Chưa có người nhận (To).', 'No recipient (To).') };
  var subj = naS_(p.subject) || ('[MMH KPI] ' + naL_('Báo cáo KPI tháng ', 'KPI report ') + f.month.slice(4, 6) + '/' + f.month.slice(0, 4) + ' — ' + d.member);
  var opt = { to:to.join(','), subject:subj, htmlBody:krMailHtml_(d, f), name:(d.full || d.member) };
  if(cc.length) opt.cc = cc.join(',');
  var rt = NA_ENV.email(user.pic); if(rt) opt.replyTo = rt;
  mmhMail_(opt);
  try{
    var book = krMasterSS_(), lg = book.getSheetByName(KR.LOG);
    if(lg) lg.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), (NA_ENV.email(user.pic) || user.pic) + ' (CRM)', d.member, f.month,
      ((d.total || {})[f.month] || {}).pw == null ? '' : ((d.total || {})[f.month] || {}).pw, to.join(', '), cc.join(', '), subj]);
  }catch(e){}
  try{ NA_ENV.log(user, 'kpi-mail', d.member, f.month + ' → ' + to.join(', ')); }catch(e){}
  return { ok:true, message:naL_('Đã gửi báo cáo KPI tới ', 'KPI report sent to ') + to.join(', ') + (cc.length ? ' · CC ' + cc.join(', ') : '') };
}
function krRoute_(action, user, p){
  if(action === 'krData') return krData(user, p);
  if(action === 'krPreview') return krPreview(user, p);
  if(action === 'krSend') return krSend(user, p);
  return { ok:false, error:'Unknown action: ' + action };
}

/* ⭐ xoá cache Báo cáo KPI sau mỗi lần đẩy KPI ⇒ app đọc số mới ngay */
function krBust_(){
  var c = CacheService.getScriptCache(), keys = [];
  try{ NA_ENV.teamPics().forEach(function(p){ keys.push('KR_' + naNorm_(p).replace(/\W/g, '_')); }); }catch(e){}
  NA_ENV.admins.concat(NA_ENV.deciders).forEach(function(p){ keys.push('KR_' + naNorm_(p).replace(/\W/g, '_')); });
  if(keys.length) c.removeAll(keys);
}


/* ════════════════════════════════════════════════════════════════════════════════════════════════
   ⭐ v10.8 · MODULE DÙNG CHUNG (CRM VN + CRM Thailand Surgical)
   ④ WR   — email báo cáo tuần: CÙNG một mẫu cho mọi nhóm (Thái = bản tiếng Anh), thanh tiến độ,
            dòng tổng "Đi địa bàn" đứng đầu, việc văn phòng (account MMH) tách riêng, việc chưa tới ngày không có 100%.
   ⑤ WK   — rule lưu hoạt động: chưa tới ngày bắt đầu ⇒ không được Completed; bấm Completed sớm ⇒ Finish date = hôm nay
            (việc đã quá hạn thì giữ nguyên ngày cũ).
   ⑥ TRIP — đề xuất công tác ghi THẲNG vào file Business Trip (sheet "MMH Travel report") + email xin duyệt.
   ════════════════════════════════════════════════════════════════════════════════════════════════ */

/* ═════════════ ⑤ WK — RULE TRẠNG THÁI / NGÀY KẾT THÚC ═════════════ */
function wkToday_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function wkIso_(v){
  if(!v) return '';
  if(Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var s = String(v).trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : s.slice(0, 10);
}
/* d = dữ liệu đang lưu · prev = dòng hiện có trên sheet (null nếu thêm mới). Trả về chuỗi lỗi hoặc '' */
function wkApplyRule_(d, prev, lang){
  var L = function(vi, en){ return lang === 'en' ? en : vi; };
  var today = wkToday_();
  var st = String(d.status != null && d.status !== '' ? d.status : (prev && prev.status) || '');
  var start = wkIso_(d.start || (prev && prev.start) || '');
  var fin = wkIso_(d.finish || (prev && prev.finish) || start);
  if(!/complet/i.test(st)) return '';
  if(start && start > today)
    return L('Hoạt động bắt đầu ngày ' + start.split('-').reverse().join('/') + ' — chưa diễn ra nên chưa thể chuyển sang Completed / 100%. Hãy để Not Started và cập nhật khi đã thực hiện.',
             'This activity starts on ' + start.split('-').reverse().join('/') + ' — it has not happened yet, so it cannot be Completed / 100%. Keep it Not Started and update it once done.');
  var wasDone = !!(prev && /complet/i.test(String(prev.status || '')));
  /* hoàn thành sớm hơn ngày kết thúc dự kiến ⇒ Finish date = ngày bấm Completed; việc quá hạn giữ nguyên ngày cũ */
  if(!wasDone && fin && fin > today) d.finish = today;
  return '';
}

/* ═════════════ ④ WR — EMAIL BÁO CÁO TUẦN DÙNG CHUNG ═════════════ */
function wrE_(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function wrN_(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim(); }
function wrDmy_(iso){ iso = wkIso_(iso); return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
function wrDm_(iso){ iso = wkIso_(iso); return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
function wrColor_(p){ return p >= 100 ? '#1E7B34' : p >= 70 ? '#2E8B57' : p >= 40 ? '#C98A1A' : p > 0 ? '#D9663A' : '#8A97B5'; }
function wrBar_(p){
  p = Math.max(0, Math.min(100, Math.round(p || 0)));
  var c = p > 0 ? wrColor_(p) : '#C9D2E0';
  var fill = p <= 0 ? '' : '<td width="' + p + '%" style="background:' + c + ';height:11px;line-height:11px;font-size:0">&nbsp;</td>';
  var empty = p >= 100 ? '' : '<td width="' + (100 - p) + '%" style="background:#E3E9F4;height:11px;line-height:11px;font-size:0">&nbsp;</td>';
  return '<table cellpadding="0" cellspacing="0" style="width:88px;border-collapse:collapse;table-layout:fixed"><tr>' + fill + empty + '</tr></table>' +
    '<div style="font-size:9pt;font-weight:700;color:' + (p > 0 ? c : '#5A6A8A') + ';text-align:center;margin-top:2px">' + p + '%</div>';
}
function wrRich_(txt){
  txt = String(txt || '').trim();
  if(!txt) return '<span style="color:#B0B8C8">—</span>';
  var safe = wrE_(txt).replace(/^([^\n:]{1,32}:)/gm, '<b>$1</b>').replace(/\n/g, '<br>');
  return safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#3A5CAA">$1</a>');
}
function wrPhoto_(url, lang){
  var u = String(url || '').trim(); if(!u) return '';
  var links = u.split(/\s|\n/).filter(function(x){ return /^https?:/.test(x); });
  if(!links.length) return '';
  return ' <a href="' + wrE_(links[0]) + '" style="background:#E8EEF9;color:#3A5CAA;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;text-decoration:none;white-space:nowrap">' +
    links.length + (lang === 'en' ? ' photo' + (links.length > 1 ? 's' : '') : ' ảnh') + '</a>';
}
function wrIsOffice_(r){ var n = wrN_(r.accName); return n === 'mmh' || /^mmh\b/.test(n) && /office|van phong/.test(wrN_(r.accType)); }
function wrIsTbd_(r){ return /^tbd$/i.test(String(r.accName || '').trim()); }
function wrFuture_(r, today){ var s = wkIso_(r.start); return !!s && s > today; }
function wrPct_(r, today){
  if(wrFuture_(r, today)) return 0;                                           /* chưa diễn ra ⇒ không có tiến độ */
  var st = String(r.status || '');
  if(/complet/i.test(st)) return 100;
  if(/cancel/i.test(st)) return 0;
  if(/progress/i.test(st)) return 50;
  return 0;
}
function wrStatus_(r, today, lang){
  var st = String(r.status || '');
  if(wrFuture_(r, today) && (/complet/i.test(st) || !st)) return lang === 'en' ? 'Planned' : 'Kế hoạch';
  return st || '—';
}
function wrOverdue_(r, today){
  var st = String(r.status || '');
  if(/complet|cancel/i.test(st)) return false;
  var f = wkIso_(r.finish || r.start);
  return !!f && f < today;
}
function wrStStyle_(txt){
  if(/complet/i.test(txt)) return 'color:#1E6B3A;font-weight:700';
  if(/progress/i.test(txt)) return 'color:#3A5CAA;font-weight:700';
  if(/cancel/i.test(txt)) return 'color:#8A1C1C;font-weight:700';
  return 'color:#5A6A8A';
}
var WR_TD = 'padding:6px 9px;border-top:1px solid #EEF1F7;';
function wrRowHtml_(r, i, o){
  var today = o.today, en = o.lang === 'en';
  var pct = wrPct_(r, today), od = !o.isNext && wrOverdue_(r, today);
  var meta = [r.accType, r.accProv].filter(String).join(' · ');
  var body = o.isNext ? (r.plan || r.nextAction) : (r.result || r.plan);
  var stTxt = wrStatus_(r, today, o.lang);
  return '<tr style="' + (od ? 'background:#FFECEC;' : '') + '">' +
    '<td style="' + WR_TD + 'color:#8A97B5;text-align:center;white-space:nowrap">' + wrE_(r.no || (i + 1)) + '</td>' +
    '<td style="' + WR_TD + '"><b>' + wrE_(r.accName || '—') + '</b>' +
      (od ? ' <span style="background:#D9433F;color:#fff;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap">' + (en ? 'OVERDUE' : 'QUÁ HẠN') + '</span>' : '') +
      (meta || r.typeAction ? '<div style="font-size:8.5pt;color:#8A97B5">' + wrE_(meta) + (r.typeAction ? (meta ? ' · ' : '') + wrE_(r.typeAction) : '') + '</div>' : '') + '</td>' +
    '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrE_(wrDmy_(r.start)) + '</td>' +
    '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + (od ? 'color:#D9433F;font-weight:700' : '') + '">' + wrE_(wrDmy_(r.finish || r.start)) + '</td>' +
    '<td style="' + WR_TD + 'text-align:center">' + wrBar_(pct) + '</td>' +
    '<td style="' + WR_TD + 'font-size:9.5pt;line-height:1.5">' + wrRich_(body) + wrPhoto_(r.photo, o.lang) + '</td>' +
    '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(stTxt) + '">' + wrE_(stTxt) + '</td></tr>';
}
function wrGroupHead_(label, n, pct, color){
  return '<tr style="background:#EEF3FB"><td colspan="7" style="padding:6px 9px;font-weight:700;color:#0E2F5F">' +
    '<span style="display:inline-block;background:' + (color || '#3A5CAA') + ';color:#fff;border-radius:4px;padding:1px 6px;font-size:8.5pt;font-weight:700;margin-right:6px">' + n + '</span>' +
    wrE_(label) + (pct == null ? '' : ' &nbsp;<span style="font-weight:800;color:' + wrColor_(pct) + '">' + pct + '%</span>') + '</td></tr>';
}
/* bảng đi địa bàn: ① dòng tổng "Đi địa bàn" · ② theo Type task · ③ Làm việc văn phòng / họp team */
function wrVisitTable_(rows, o){
  var en = o.lang === 'en', today = o.today, L = function(vi, e){ return en ? e : vi; };
  rows = (rows || []).slice().sort(function(a, b){ return String(wkIso_(a.start)).localeCompare(String(wkIso_(b.start))); });
  var tbd = rows.filter(wrIsTbd_), office = rows.filter(function(r){ return !wrIsTbd_(r) && wrIsOffice_(r); });
  var field = rows.filter(function(r){ return !wrIsTbd_(r) && !wrIsOffice_(r); });
  var act = field.filter(function(r){ return !/cancel/i.test(String(r.status || '')); });
  var done = act.filter(function(r){ return !wrFuture_(r, today) && /complet/i.test(String(r.status || '')); });
  var body = '';
  /* ① dòng tổng */
  if(act.length || tbd.length){
    var t = tbd[0] || {}, pct = 0, res = '', st = '';
    if(o.isNext){
      res = String(t.plan || '').trim() || L('Kế hoạch ' + act.length + ' cuộc hẹn đi địa bàn trong tuần', act.length + ' field appointment(s) planned this week');
      st = L('Kế hoạch', 'Planned');
    } else {
      pct = act.length ? Math.round(done.length / act.length * 100) : (/complet/i.test(String(t.status || '')) ? 100 : 0);
      var accs = {}; done.forEach(function(r){ accs[wrN_(r.accName)] = 1; });
      var nAcc = Object.keys(accs).length, miss = act.length - done.length;
      var head = String(t.result || '').trim() || L('Đã tiếp cận ' + ('0' + nAcc).slice(-2) + ' địa bàn / account', 'Visited ' + ('0' + nAcc).slice(-2) + ' account(s)');
      var lines = act.map(function(r){
        var ok = !wrFuture_(r, today) && /complet/i.test(String(r.status || ''));
        var od = wrOverdue_(r, today);
        return (ok ? '✓ ' : '✗ ') + wrDm_(r.start) + ' · ' + (r.accName || '—') + ' — ' + (ok ? 'Completed' : wrStatus_(r, today, o.lang) + (od ? L(' (quá hạn)', ' (overdue)') : ''));
      });
      res = head + '\n' + (act.length
        ? (miss > 0 ? L(('0' + miss).slice(-2) + ' cuộc hẹn không được thực hiện theo kế hoạch, chi tiết:', ('0' + miss).slice(-2) + ' appointment(s) not carried out as planned, details:')
                    : L('Tất cả ' + act.length + ' cuộc hẹn đã thực hiện theo kế hoạch:', 'All ' + act.length + ' appointment(s) carried out as planned:')) + '\n' + lines.join('\n')
        : L('Chưa có cuộc hẹn đi địa bàn cụ thể nào trong tuần.', 'No specific field appointment this week.'));
      st = act.length && done.length === act.length ? 'Completed' : (done.length + '/' + act.length);
    }
    body += wrGroupHead_(L('Đi địa bàn · tổng hợp tuần', 'Field visits · weekly summary'), act.length, o.isNext ? null : pct, '#1E7B34') +
      '<tr style="background:#F6FBF7"><td style="' + WR_TD + 'color:#1E7B34;text-align:center;font-weight:800">Σ</td>' +
      '<td style="' + WR_TD + '"><b>' + L('Đi địa bàn', 'Field visits') + '</b><div style="font-size:8.5pt;color:#8A97B5">' +
        (tbd.length ? L('Kế hoạch tuần · ', 'Weekly plan · ') : '') + act.length + L(' cuộc hẹn đã lên kế hoạch', ' planned appointment(s)') + '</div></td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrDmy_(o.from) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrDmy_(o.to) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center">' + wrBar_(pct) + '</td>' +
      '<td style="' + WR_TD + 'font-size:9.5pt;line-height:1.55">' + wrRich_(res) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(st) + '">' + wrE_(st) + '</td></tr>';
  }
  /* ② theo Type task */
  var g = {}, order = [];
  field.forEach(function(r){ var k = String(r.typeTask || '').trim() || L('— Chưa phân loại —', '— No type —'); if(!g[k]){ g[k] = []; order.push(k); } g[k].push(r); });
  order.sort(function(a, b){ return a.localeCompare(b); });
  order.forEach(function(k){
    var items = g[k], a2 = items.filter(function(r){ return !/cancel/i.test(String(r.status || '')); });
    var gp = a2.length ? Math.round(a2.reduce(function(s, r){ return s + wrPct_(r, today); }, 0) / a2.length) : 0;
    body += wrGroupHead_(k, items.length, gp);
    items.forEach(function(r, i){ body += wrRowHtml_(r, i, o); });
  });
  /* ③ văn phòng / họp team */
  if(office.length){
    var a3 = office.filter(function(r){ return !/cancel/i.test(String(r.status || '')); });
    var op = a3.length ? Math.round(a3.reduce(function(s, r){ return s + wrPct_(r, today); }, 0) / a3.length) : 0;
    body += wrGroupHead_(L('Làm việc ở văn phòng / Họp team', 'Office work / team meeting'), office.length, op, '#6B7A90');
    office.forEach(function(r, i){ body += wrRowHtml_(r, i, o); });
  }
  if(!body) body = '<tr><td colspan="7" style="padding:14px;text-align:center;color:#8A97B5">' + (o.isNext ? L('Chưa có kế hoạch đi địa bàn cho tuần sau.', 'No planned activity for next week.') : L('Chưa ghi nhận hoạt động nào trong tuần.', 'No activity recorded for this week.')) + '</td></tr>';
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">' +
    '<thead><tr style="background:#3A5CAA;color:#fff">' +
      '<th style="padding:7px 9px;width:42px;text-align:center">No.</th>' +
      '<th style="padding:7px 9px;text-align:left">Account</th>' +
      '<th style="padding:7px 9px;width:82px;text-align:center">' + (o.isNext ? 'Planned start' : 'Start date') + '</th>' +
      '<th style="padding:7px 9px;width:82px;text-align:center">Finish date</th>' +
      '<th style="padding:7px 9px;width:100px;text-align:center">' + L('Tiến độ', 'Progress') + '</th>' +
      '<th style="padding:7px 9px;text-align:left">Plan &amp; result</th>' +
      '<th style="padding:7px 9px;width:110px;text-align:center">Status</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table>';
}
function wrOtherPct_(x){
  var p = Number(x && x.progress);
  if(!isNaN(p) && x.progress !== '' && x.progress != null) return Math.max(0, Math.min(100, Math.round(p <= 1 && p > 0 && String(x.progress).indexOf('.') >= 0 ? p * 100 : p)));
  var st = String((x && x.status) || '');
  return /complet/i.test(st) ? 100 : /progress/i.test(st) ? 50 : 0;
}
function wrOtherTable_(list, o){
  var en = o.lang === 'en', today = o.today, L = function(vi, e){ return en ? e : vi; };
  if(!list || !list.length)
    return '<p style="margin:4px 0 12px;font-size:10.5pt;color:#8A97B5">' + (o.isNext ? L('Chưa có công việc khác cho tuần sau.', 'No other task planned for next week.') : L('Chưa ghi nhận công việc khác trong tuần.', 'No other task recorded for this week.')) + '</p>';
  var fut = function(x){ var s = wkIso_(x.start || x.planned); return o.isNext && !!s && s > today; };
  var rows = '';
  list.forEach(function(g){
    var kp = fut(g) ? 0 : wrOtherPct_(g), kst = fut(g) && /complet/i.test(String(g.status || '')) ? L('Kế hoạch', 'Planned') : (g.status || 'To Do');
    rows += '<tr style="background:#EEF3FB"><td style="' + WR_TD + 'color:#3A5CAA;font-weight:700;white-space:nowrap">' + wrE_(g.type || 'Other') + '</td>' +
      '<td style="' + WR_TD + '" colspan="2"><b>' + wrE_(g.keyTask || '—') + '</b>' +
        ((!o.isNext && String(g.result || '').trim()) ? '<div style="font-size:9.5pt;color:#41506B;margin-top:3px;line-height:1.5">' + wrRich_(g.result) + '</div>' : '') + '</td>' +
      '<td style="' + WR_TD + 'text-align:center">' + wrBar_(kp) + '</td>' +
      '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(kst) + '">' + wrE_(kst) + '</td></tr>';
    (g.subs || []).forEach(function(x){
      var p2 = fut(x) ? 0 : wrOtherPct_(x), sst = fut(x) && /complet/i.test(String(x.status || '')) ? L('Kế hoạch', 'Planned') : (x.status || 'To Do');
      rows += '<tr><td style="' + WR_TD + 'text-align:center;color:#8A97B5;white-space:nowrap">' + wrE_(wrDmy_(x.planned) || '—') + '</td>' +
        '<td style="' + WR_TD + '">' + wrE_(x.subTask || '—') +
          ((!o.isNext && String(x.result || '').trim()) ? '<div style="font-size:9.5pt;color:#41506B;margin-top:3px;line-height:1.5">' + wrRich_(x.result) + '</div>' : '') + '</td>' +
        '<td style="' + WR_TD + 'text-align:center;white-space:nowrap">' + wrE_(x.pic || '—') + '</td>' +
        '<td style="' + WR_TD + 'text-align:center">' + wrBar_(p2) + '</td>' +
        '<td style="' + WR_TD + 'text-align:center;white-space:nowrap;' + wrStStyle_(sst) + '">' + wrE_(sst) + '</td></tr>';
    });
  });
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">' +
    '<thead><tr style="background:#3A5CAA;color:#fff">' +
      '<th style="padding:7px 9px;width:112px;text-align:left">' + L('Loại / Hạn', 'Type / Due') + '</th>' +
      '<th style="padding:7px 9px;text-align:left">' + L('Key task &amp; đầu việc con', 'Key task &amp; sub-tasks') + '</th>' +
      '<th style="padding:7px 9px;width:90px;text-align:center">PIC</th>' +
      '<th style="padding:7px 9px;width:100px;text-align:center">' + L('Tiến độ', 'Progress') + '</th>' +
      '<th style="padding:7px 9px;width:110px;text-align:center">Status</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}
/* toàn bộ thân email báo cáo tuần */
function wrBody_(o){
  var en = o.lang === 'en', L = function(vi, e){ return en ? e : vi; }, today = wkToday_();
  var base = { lang: o.lang, today: today };
  var h3 = function(txt, col){ return '<h3 style="margin:16px 0 6px;font-size:12.5pt;color:#1F3A6B;border-left:4px solid ' + col + ';padding-left:8px">' + txt + '</h3>'; };
  return '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.5">' +
    '<p style="margin:0 0 10px">Dear all,</p>' +
    '<p style="margin:0 0 12px">' + L('Em xin gửi báo cáo tuần và kế hoạch tuần sau như dưới đây.', 'Please find below my weekly report and the plan for next week.') + '</p>' +
    '<p style="margin:0 0 12px"><b>' + L('Người báo cáo:', 'Report by:') + '</b> ' + wrE_(o.pic) + (o.title ? ' (' + wrE_(o.title) + ')' : '') + '</p>' +
    h3('\u2460 ' + L('Tuần này — Đi địa bàn', 'This week — Field visits') + ' (' + wrDmy_(o.from) + ' – ' + wrDmy_(o.to) + ')', '#3A5CAA') +
    wrVisitTable_(o.cur, Object.assign({ isNext: false, from: o.from, to: o.to }, base)) +
    h3('\u2461 ' + L('Tuần này — Công việc khác', 'This week — Other tasks'), '#6B4A9E') +
    wrOtherTable_(o.otherCur, Object.assign({ isNext: false }, base)) +
    h3('\u2462 ' + L('Tuần sau — Đi địa bàn', 'Next week — Field visits') + ' (' + wrDmy_(o.nf) + ' – ' + wrDmy_(o.nt) + ')', '#E0A21B') +
    wrVisitTable_(o.next, Object.assign({ isNext: true, from: o.nf, to: o.nt }, base)) +
    h3('\u2463 ' + L('Tuần sau — Công việc khác', 'Next week — Other tasks'), '#E0A21B') +
    wrOtherTable_(o.otherNext, Object.assign({ isNext: true }, base)) +
    '<p style="margin:16px 0 2px">' + L('Trân trọng,', 'Best regards,') + '</p>' +
    '<p style="margin:0"><b>' + wrE_(o.pic) + '</b>' + (o.title ? ' \u2014 ' + wrE_(o.title) : '') + '</p>' +
    '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi \u00b7 ' + wrE_(o.team || '') + '</p>' +
  '</div>';
}

/* ═════════════ ⑥ TRIP — ĐỀ XUẤT CÔNG TÁC GHI THẲNG FILE BUSINESS TRIP ═════════════ */
var TRIP_FILE_ID = '15dAQYOG1aJRX-jByVmRFeSFOIPRtdVW7wDvwC_nxJUA';
var TRIP_SHEET = 'MMH Travel report', TRIP_MASTER = 'Master', TRIP_HDR = 3, TRIP_DATA = 5;
var TRIP_URL = 'https://docs.google.com/spreadsheets/d/' + TRIP_FILE_ID + '/edit';
function tripBook_(){
  try{ return SpreadsheetApp.openById(TRIP_FILE_ID); }
  catch(e){ throw new Error('Tài khoản chạy CRM backend chưa mở được file Business Trip (cần quyền Editor): ' + (e && e.message || e)); }
}
function tripMasterRead_(book){
  var sh = book.getSheetByName(TRIP_MASTER); if(!sh) throw new Error('File Business Trip không có sheet "Master"');
  var n = Math.max(1, sh.getLastRow() - 1), V = sh.getRange(2, 1, n, 13).getValues();
  var col = function(c){ var o = []; V.forEach(function(r){ var x = String(r[c] || '').trim(); if(x && o.indexOf(x) < 0) o.push(x); }); return o; };
  var people = {};
  V.forEach(function(r){ var nm = String(r[8] || '').trim(); if(nm) people[nm] = { pic: String(r[9] || '').trim(), dir: String(r[10] || '').trim(), hod: String(r[11] || '').trim(), cc: String(r[12] || '').trim() }; });
  return { destinations: col(2), coTravelers: col(4), equipment: col(5), people: people };
}
/* tên PIC trên CRM ⇒ tên trong file Business Trip (ví dụ Phuong ⇒ "Vu Phuong") */
function tripName_(pic, M){
  var k = wrN_(pic), names = Object.keys(M.people).concat(M.coTravelers);
  var hit = names.filter(function(x){ return wrN_(x) === k; })[0] ||
            names.filter(function(x){ return (' ' + wrN_(x)).slice(-(k.length + 1)) === ' ' + k; })[0] ||
            names.filter(function(x){ return wrN_(x).indexOf(k) >= 0; })[0];
  return hit || pic;
}
function tripMail_(name, M){
  var p = M.people[name] || {}, me = p.pic || NA_ENV.email(name) || '';
  var split = function(s){ return String(s || '').split(/[;,\s]+/).map(function(x){ return x.trim(); }).filter(function(x){ return /@/.test(x); }); };
  var to = split(p.hod).filter(function(e){ return e !== me; });
  if(!to.length) to = split(p.dir).filter(function(e){ return e !== me; });
  var cc = split(p.dir).concat(split(p.cc)).concat(me ? [me] : []).filter(function(e, i, a){ return a.indexOf(e) === i && to.indexOf(e) < 0; });
  return { to: to, cc: cc, me: me };
}
function tripMaster2(user, p){
  var M = tripMasterRead_(tripBook_()), nm = tripName_(String(p.forPic || user.pic), M), mm = tripMail_(nm, M);
  return { ok: true, master: { destinations: M.destinations, coTravelers: M.coTravelers, equipment: M.equipment }, tripName: nm,
           to: mm.to.join(', '), cc: mm.cc.join(', '), file: TRIP_URL };
}
function tripPropose2(user, p){
  var f = p.trip; if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
  if(!f) return { ok: false, error: 'Thiếu dữ liệu đề xuất' };
  var start = wkIso_(f.startDate), fin = wkIso_(f.finishDate) || start;
  if(!start || !String(f.destination || '').trim()) return { ok: false, error: 'Cần ngày đi và Destination' };
  var book = tripBook_(), sh = book.getSheetByName(TRIP_SHEET);
  if(!sh) return { ok: false, error: 'File Business Trip không có sheet "' + TRIP_SHEET + '"' };
  var M = tripMasterRead_(book), nm = tripName_(String(p.forPic || user.pic), M);
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok: false, error: 'Hệ thống đang bận, thử lại sau vài giây.' }; }
  var row, no = '';
  try{
    var lr = Math.max(sh.getLastRow(), TRIP_DATA - 1);
    var V = lr >= TRIP_DATA ? sh.getRange(TRIP_DATA, 2, lr - TRIP_DATA + 1, 14).getValues() : [];
    var last = TRIP_DATA - 1, dupRow = 0;
    for(var i = 0; i < V.length; i++){
      if(String(V[i][2] || '').trim() || V[i][3]) last = TRIP_DATA + i;      /* cột D PIC / E Start date */
      if(wrN_(V[i][2]) === wrN_(nm) && wkIso_(V[i][3]) === start && wkIso_(V[i][4]) === fin && wrN_(V[i][6]) === wrN_(f.destination)) dupRow = TRIP_DATA + i;
    }
    if(dupRow) return { ok: true, dup: true, row: dupRow, message: 'Chuyến công tác này đã có trên file Business Trip (dòng ' + dupRow + ') — không ghi trùng.' };
    row = last + 1;
    if(row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 20);
    var d0 = new Date(start + 'T00:00:00'), d1 = new Date(fin + 'T00:00:00');
    sh.getRange(row, 4, 1, 3).setValues([[nm, d0, d1]]);                                       /* D PIC · E Start · F Finish */
    sh.getRange(row, 8, 1, 8).setValues([[ String(f.destination || ''), String(f.coTraveler || 'No'), String(f.purpose || ''),  /* H · I · J */
      String(f.expectedResult || ''), String(f.estimatedCost || ''), Number(f.totalCost) || '', String(f.schedule || ''), String(f.equipment || '') ]]); /* K L M N O */
    sh.getRange(row, 19).setValue('Not Yet');                                                  /* S Approval Status */
    if(row > TRIP_DATA){
      try{ sh.getRange(row - 1, 2, 1, 27).copyTo(sh.getRange(row, 2, 1, 27), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); }catch(e){}
      try{ var fr = sh.getRange(row - 1, 21, 1, 4).getFormulasR1C1()[0];                        /* U · V · W · X */
           if(fr.some(String)) sh.getRange(row, 21, 1, 4).setFormulasR1C1([fr]); }catch(e){}
    }
    SpreadsheetApp.flush();
    try{ no = String(sh.getRange(row, 2).getValue() || ''); }catch(e){}
  } finally { lock.releaseLock(); }
  var mm = tripMail_(nm, M), mailed = false, mailErr = '';
  try{
    if(mm.to.length){
      var td = 'border:1px solid #BFBFBF;padding:6px 9px;font-size:13px;vertical-align:top;';
      var rowH = function(k, v){ return '<tr><td style="' + td + 'background:#F2F2F2;font-weight:bold;width:170px">' + k + '</td><td style="' + td + '">' + wrRich_(v) + '</td></tr>'; };
      var html = '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;color:#000;line-height:1.5">' +
        '<p>Dear anh/chị,</p><p>Em xin gửi đề xuất công tác dưới đây (đã ghi vào file Business Trip, dòng ' + row + ', Approval Status = Not Yet). Anh/chị vui lòng xem và phê duyệt.</p>' +
        '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
        rowH('PIC', nm) + rowH('Thời gian', wrDmy_(start) + ' – ' + wrDmy_(fin)) + rowH('Destination', f.destination) + rowH('Co-traveler', f.coTraveler || 'No') +
        rowH('Purpose', f.purpose) + rowH('Expected result', f.expectedResult) + rowH('Estimated costs (VND)', f.estimatedCost) +
        rowH('Total estimated costs', (Number(f.totalCost) || 0).toLocaleString('en-US') + ' VND') + rowH('Schedule', f.schedule) + rowH('Equipment', f.equipment) + '</table>' +
        '<p style="margin-top:14px"><a href="' + TRIP_URL + '" style="color:#3A5CAA;font-weight:bold">Mở file Business Trip ↗</a></p>' +
        '<p>Trân trọng,<br>' + wrE_(nm) + '</p></div>';
      var opt = { to: mm.to.join(','), subject: '[Business Trip] Đề xuất công tác — ' + nm + ' — ' + f.destination + ' — ' + wrDm_(start) + (fin !== start ? '–' + wrDm_(fin) : '') + '/' + start.slice(0, 4),
                  htmlBody: html, name: nm + ' (MMH CRM)' };
      if(mm.cc.length) opt.cc = mm.cc.join(',');
      if(mm.me) opt.replyTo = mm.me;
      mmhMail_(opt); mailed = true;
    }
  }catch(e){ mailErr = String(e && e.message || e); }
  try{ NA_ENV.log(user, 'trip', f.destination, start + ' – ' + fin + ' · row ' + row); }catch(e){}
  return { ok: true, row: row, no: no, tripName: nm, to: mm.to.join(', '), cc: mm.cc.join(', '),
           message: 'Đã ghi đề xuất công tác vào file Business Trip (dòng ' + row + ')' + (mailed ? ' và gửi email xin duyệt tới ' + mm.to.join(', ') : (mailErr ? ' — chưa gửi được email: ' + mailErr : ' — chưa có email người duyệt trong sheet Master')) };
}
function tripRoute_(action, user, p){
  if(action === 'tripMaster2') return tripMaster2(user, p);
  if(action === 'tripPropose2') return tripPropose2(user, p);
  return { ok: false, error: 'Unknown action: ' + action };
}