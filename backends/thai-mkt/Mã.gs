/* ═══════════════════════════════════════════════════════════════════════════════════════
   MMH — THAILAND SURGICAL · MARKETING OFFLINE — EVENT BACKEND  v1.0
   File: "4. Thailand - Surgical - Marketing Offline FY67-FY68"
   Used by the CRM app (Thailand Surgical team):
     · tab "Event"            → list / add / edit / delete rows of sheet REPORT_EVENT
     · Work calendar          → events are shown on the calendar automatically
     · Dashboard              → event statistics
     · Key stakeholder        → "Event customers" read from sheet CUSTOMER LIST

   SETUP (once):
     1. Open this spreadsheet ▸ Extensions ▸ Apps Script ▸ create a file "Event_Backend" and paste this code.
     2. Deploy ▸ Manage deployments ▸ ✏️ edit the existing Web app ▸ Version: New version
        · Execute as: Me   · Who has access: Anyone   ▸ Deploy   (URL stays the same).
     3. Run function evSetup once (Run button) and allow the permissions.

   The app only writes VALUE columns. Formula columns are never overwritten:
     C  Event name     (=E&" "&G&"_"&F&"_"&I&"_"&J)
     M  Area           (VLOOKUP on sheet Master name)
     S  Actual Participant (COUNTIFS on sheet CUSTOMER LIST)
   ═══════════════════════════════════════════════════════════════════════════════════════ */

var EV_CFG = {
  SHEET_ID: '1s6ny0CSsF0WECR_8Zu41eU2kCFrmYHYbEa3GIWSbO1M',
  EVENT: 'REPORT_EVENT',
  CUST: 'CUSTOMER LIST',
  MASTER: 'Master name',
  LOG: '_APP_LOG',
  FIRST: 5,                  // first data row of REPORT_EVENT and CUSTOMER LIST
  SEGMENT: 'Surgical product',
  /* people allowed to add / edit / delete events from the app */
  EDITORS: ['Dao', 'Miew', 'Mew', 'Nguyen Ha', 'Tuyen', 'Hoa', 'Giang'],
  REVIEW_TEMPLATE: '- Objective: \n- Target audience: \n- Expected outcome:\n- Actual Attendees:\n- Activities summary:\n- Customer feedback: \n- Sales impact:\n- Next action: ',
  PRODUCTS: ['Ophthalmic knife', 'Ophthalmic suture', 'Manipler', 'Micro Forceps', 'Trabeculotomy Hook']
};
/* REPORT_EVENT columns (1 = A) */
var EVC = { no:2, name:3, month:4, date:5, type:6, product:7, segment:8, topic:9, kol:10, partner:11,
            place:12, area:13, plan:14, action:15, link:16, review:17, target:18, actual:19, NC:19 };

/* ══════════════ ROUTER ══════════════ */
function doGet(e){ return evHandle_(e, 'GET'); }
function doPost(e){ return evHandle_(e, 'POST'); }
function evHandle_(e, method){
  var p = {};
  try{
    p = (e && e.parameter) ? JSON.parse(JSON.stringify(e.parameter)) : {};
    if(method === 'POST' && e && e.postData && e.postData.contents){
      try{ var b = JSON.parse(e.postData.contents); for(var k in b) p[k] = b[k]; }catch(x){}
    }
  }catch(x){}
  var out;
  try{ out = evRoute_(p); }
  catch(err){ out = { ok:false, error: String(err && err.message || err) }; }
  var txt = JSON.stringify(out);
  if(p.callback) return ContentService.createTextOutput(p.callback + '(' + txt + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}
function evRoute_(p){
  var a = String(p.action || '');
  switch(a){
    case 'ping':      return { ok:true, app:'mkt-offline', ver:'1.0', sheet: evSS_().getName() };
    case 'list':      return evList_(p);
    case 'customers': return evCustomers_(p);
    case 'save':      return evOnce_(p, function(){ return evSave_(p); });
    case 'delete':    return evOnce_(p, function(){ return evDelete_(p); });
    default:          return { ok:false, error:'Unknown action: ' + a };
  }
}

/* ══════════════ HELPERS ══════════════ */
var EV_SS_ = null;
function evSS_(){
  if(EV_SS_) return EV_SS_;
  try{ EV_SS_ = SpreadsheetApp.getActiveSpreadsheet(); }catch(e){}
  if(!EV_SS_ || EV_SS_.getId() !== EV_CFG.SHEET_ID){ try{ EV_SS_ = SpreadsheetApp.openById(EV_CFG.SHEET_ID); }catch(e){ if(!EV_SS_) throw e; } }
  return EV_SS_;
}
function evSheet_(name){
  var s = evSS_().getSheetByName(name);
  if(!s) throw new Error('Sheet "' + name + '" not found');
  return s;
}
function evStr_(v){ return v == null ? '' : String(v).trim(); }
function evPad_(n){ return (n < 10 ? '0' : '') + n; }
function evIso_(d){ return d.getFullYear() + '-' + evPad_(d.getMonth() + 1) + '-' + evPad_(d.getDate()); }
/* FY runs Sep → Aug (FY68 = 09/2026 → 08/2027). Takes an ISO date or a yyyymm month. */
function evFy_(x){ x = String(x || '').replace(/-/g, ''); if(!/^\d{6}/.test(x)) return ''; var y = +x.slice(0, 4), m = +x.slice(4, 6); return 'FY' + ((m >= 9 ? y : y - 1) - 1958); }
/* cell E → {start, end} ISO.  Accepts 20260907 · "20250925-26" · "20251029 - 1031" · "20261230 - 0102" · a real date */
function evParseDate_(v){
  if(v instanceof Date && !isNaN(v)) { var i = evIso_(v); return { start:i, end:i }; }
  var s = evStr_(v).replace(/\.0+$/, '');
  var m = /^(\d{4})(\d{2})(\d{2})(?:\s*[--~]\s*(\d{2,4}))?/.exec(s);
  if(!m) return { start:'', end:'' };
  var y = +m[1], mo = +m[2], d = +m[3];
  var start = y + '-' + m[2] + '-' + m[3], end = start;
  if(m[4]){
    var ey = y, em = mo, ed;
    if(m[4].length === 4){ em = +m[4].slice(0, 2); ed = +m[4].slice(2); if(em < mo) ey = y + 1; }
    else { ed = +m[4]; if(ed < d){ em = mo + 1; if(em > 12){ em = 1; ey = y + 1; } } }
    if(em >= 1 && em <= 12 && ed >= 1 && ed <= 31) end = ey + '-' + evPad_(em) + '-' + evPad_(ed);
  }
  return { start:start, end:end };
}
/* {start, end} ISO → value for column E, same style as the sheet */
function evDateCell_(start, end){
  var a = start.replace(/-/g, '');
  if(!end || end <= start) return Number(a);
  if(end.slice(0, 7) === start.slice(0, 7)) return a + '-' + end.slice(8, 10);
  return a + ' - ' + end.slice(5, 7) + end.slice(8, 10);
}
function evSig_(r){ return [evStr_(r[EVC.date - 1]), evStr_(r[EVC.type - 1]), evStr_(r[EVC.topic - 1])].join('|').slice(0, 300); }
function evIsData_(r){ return !!(evStr_(r[EVC.date - 1]) || evStr_(r[EVC.type - 1]) || evStr_(r[EVC.topic - 1])); }
function evNum_(v){ var n = Number(v); return isFinite(n) && String(v) !== '' ? n : ''; }
function evCanEdit_(pic){ pic = evStr_(pic); return !!pic && (!EV_CFG.EDITORS.length || EV_CFG.EDITORS.indexOf(pic) >= 0); }
function evLog_(pic, action, row, name, detail){
  try{
    var ss = evSS_(), s = ss.getSheetByName(EV_CFG.LOG);
    if(!s){ s = ss.insertSheet(EV_CFG.LOG); s.appendRow(['Time', 'PIC', 'Action', 'Row', 'Event name', 'Detail']); s.hideSheet(); }
    s.appendRow([new Date(), pic || '', action, row || '', name || '', String(detail || '').slice(0, 800)]);
  }catch(e){}
}
/* same request sent twice (slow network / retry) ⇒ run once, return the first answer */
function evOnce_(p, fn){
  var rid = evStr_(p.rid), cache = CacheService.getScriptCache();
  if(rid){ var hit = cache.get('ev_rid_' + rid); if(hit) return JSON.parse(hit); }
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'The sheet is busy, please try again in a moment.' }; }
  try{
    if(rid){ var hit2 = cache.get('ev_rid_' + rid); if(hit2) return JSON.parse(hit2); }
    var out = fn();
    if(rid && out && out.ok){ try{ cache.put('ev_rid_' + rid, JSON.stringify(out), 600); }catch(e){} }
    return out;
  } finally { lock.releaseLock(); }
}
function evColList_(s, a1){
  var v = s.getRange(a1).getValues(), o = [];
  v.forEach(function(r){ var x = evStr_(r[0]); if(x && o.indexOf(x) < 0) o.push(x); });
  return o;
}

/* ══════════════ READ ══════════════ */
function evRows_(){
  var s = evSheet_(EV_CFG.EVENT), last = s.getLastRow();
  if(last < EV_CFG.FIRST) return [];
  var n = last - EV_CFG.FIRST + 1;
  var V = s.getRange(EV_CFG.FIRST, 1, n, EVC.NC).getValues();
  var D = s.getRange(EV_CFG.FIRST, EVC.date, n, 1).getDisplayValues();
  var out = [];
  for(var i = 0; i < n; i++){
    var r = V[i];
    if(!evIsData_(r)) continue;
    var raw = r[EVC.date - 1] instanceof Date ? r[EVC.date - 1] : (typeof r[EVC.date - 1] === 'number' ? String(Math.round(r[EVC.date - 1])) : evStr_(D[i][0]));
    var dt = evParseDate_(raw);
    var month = evStr_(r[EVC.month - 1]).replace(/\.0+$/, '') || (dt.start ? dt.start.slice(0, 4) + dt.start.slice(5, 7) : '');
    out.push({
      row: EV_CFG.FIRST + i, sig: evSig_(r),
      no: evNum_(r[EVC.no - 1]), name: evStr_(r[EVC.name - 1]), month: month,
      date: raw instanceof Date ? evIso_(raw).replace(/-/g, '') : raw, start: dt.start, end: dt.end, fy: evFy_(month || dt.start),
      dateWarn: !!(dt.start && month && dt.start.replace(/-/g, '').slice(0, 6) !== month && dt.end.replace(/-/g, '').slice(0, 6) !== month),
      type: evStr_(r[EVC.type - 1]), product: evStr_(r[EVC.product - 1]), segment: evStr_(r[EVC.segment - 1]),
      topic: evStr_(r[EVC.topic - 1]), kol: evStr_(r[EVC.kol - 1]), partner: evStr_(r[EVC.partner - 1]),
      place: evStr_(r[EVC.place - 1]), area: evStr_(r[EVC.area - 1]).replace(/^-$/, ''),
      plan: evStr_(r[EVC.plan - 1]), action: evStr_(r[EVC.action - 1]), link: evStr_(r[EVC.link - 1]),
      review: evStr_(r[EVC.review - 1]), target: evNum_(r[EVC.target - 1]), actual: evNum_(r[EVC.actual - 1])
    });
  }
  return out;
}
function evLists_(){
  var m = evSS_().getSheetByName(EV_CFG.MASTER), o = { types:[], plan:[], action:[], provinces:[], areas:{}, products:EV_CFG.PRODUCTS.slice(), partners:[], kols:[] };
  if(m){
    o.types = evColList_(m, 'AB2:AB40');
    o.plan = evColList_(m, 'AH2:AH20');
    o.action = evColList_(m, 'AI2:AI20');
    m.getRange('AO2:AP200').getValues().forEach(function(r){
      var p = evStr_(r[0]); if(!p || p === 'Province' || o.areas[p]) return;
      o.provinces.push(p); o.areas[p] = evStr_(r[1]);
    });
  }
  try{   /* product list = the dropdown of column G */
    var dv = evSheet_(EV_CFG.EVENT).getRange(EV_CFG.FIRST + 40, EVC.product).getDataValidation();
    var cv = dv && dv.getCriteriaValues && dv.getCriteriaValues();
    if(cv && cv[0] && cv[0].length && typeof cv[0][0] === 'string') o.products = cv[0].map(evStr_).filter(String);
  }catch(e){}
  if(!o.types.length) o.types = ['Seminar', 'Workshop', 'Exhibition', 'Presentation', 'Webinar', 'Wetlab', 'Case demonstrate', 'Seminar + Wet lab', 'Booth activity', 'Lunch/ Break symposium', 'Cataract surgery charity'];
  if(!o.plan.length) o.plan = ['Fixed', 'Not yet fixed'];
  if(!o.action.length) o.action = ['As planned', 'Change schedule', 'Additional', 'Cancel'];
  return o;
}
function evList_(p){
  var rows = evRows_(), L = evLists_();
  rows.forEach(function(r){
    if(r.partner && L.partners.indexOf(r.partner) < 0) L.partners.push(r.partner);
    r.kol.split(/\s*,\s*/).forEach(function(k){ if(k && L.kols.indexOf(k) < 0) L.kols.push(k); });
  });
  L.partners.sort(); L.kols.sort();
  return { ok:true, rows:rows, lists:L, editors:EV_CFG.EDITORS, reviewTemplate:EV_CFG.REVIEW_TEMPLATE, at:new Date().toISOString() };
}
function evCustomers_(p){
  var s = evSheet_(EV_CFG.CUST), last = s.getLastRow(), out = [];
  if(last < EV_CFG.FIRST) return { ok:true, rows:[] };
  var V = s.getRange(EV_CFG.FIRST, 3, last - EV_CFG.FIRST + 1, 12).getValues();   // C..N
  V.forEach(function(r, i){
    var name = evStr_(r[1]); if(!name) return;
    out.push({ row: EV_CFG.FIRST + i, no: evNum_(r[0]), name: name, tel: evStr_(r[2]), address: evStr_(r[3]), province: evStr_(r[4]),
               region: evStr_(r[5]).replace(/^-$/, ''), email: evStr_(r[6]).replace(/^n\/a$/i, ''), workplace: evStr_(r[7]), event: evStr_(r[8]),
               eventFy: evStr_(r[9]), feedback: evStr_(r[10]), pic: evStr_(r[11]) });
  });
  return { ok:true, rows:out, at:new Date().toISOString() };
}

/* ══════════════ WRITE ══════════════ */
function evClean_(ev){
  var o = {};
  ['start','end','type','product','segment','topic','kol','partner','place','plan','action','link','review'].forEach(function(k){ o[k] = evStr_(ev[k]); });
  o.target = evStr_(ev.target) === '' ? '' : Number(ev.target);
  if(o.target !== '' && !isFinite(o.target)) o.target = '';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(o.start)) throw new Error('Start date is required.');
  if(o.end && !/^\d{4}-\d{2}-\d{2}$/.test(o.end)) o.end = '';
  if(o.end && o.end < o.start) throw new Error('End date is before the start date.');
  if(!o.type) throw new Error('Type of event is required.');
  if(!o.topic) throw new Error('Topic is required.');
  return o;
}
function evSave_(p){
  var pic = evStr_(p.pic);
  if(!evCanEdit_(pic)) return { ok:false, error:'Account "' + pic + '" is not allowed to edit events.' };
  var ev = p.ev; if(typeof ev === 'string'){ try{ ev = JSON.parse(ev); }catch(e){ ev = null; } }
  if(!ev) return { ok:false, error:'Missing event data.' };
  var o = evClean_(ev), s = evSheet_(EV_CFG.EVENT);
  var row = parseInt(ev.row, 10) || 0, isNew = !row, oldName = '';
  var month = Number(o.start.slice(0, 4) + o.start.slice(5, 7));
  if(!isNew){
    var cur = s.getRange(row, 1, 1, EVC.NC).getValues()[0];
    if(!evIsData_(cur) || (ev.sig && evSig_(cur) !== String(ev.sig)))
      return { ok:false, stale:true, error:'This event was changed in the sheet by someone else. Reload and try again.' };
    oldName = evStr_(cur[EVC.name - 1]);
    if(!o.segment) o.segment = evStr_(cur[EVC.segment - 1]);
  } else {
    row = evNewRow_(s);
    if(!o.segment) o.segment = EV_CFG.SEGMENT;
    if(!o.review) o.review = EV_CFG.REVIEW_TEMPLATE;
    if(!o.plan) o.plan = 'Not yet fixed';
    if(!o.action) o.action = 'As planned';
    s.getRange(row, EVC.no).setValue(evNextNo_(s, row, evFy_(month)));
  }
  var dateCell = evDateCell_(o.start, o.end);
  var dc = s.getRange(row, EVC.date);
  if(typeof dateCell === 'string') dc.setNumberFormat('@'); else dc.setNumberFormat('0');
  /* D..L (no formula inside) */
  s.getRange(row, EVC.month, 1, 9).setValues([[month, dateCell, o.type, o.product, o.segment, o.topic, o.kol, o.partner, o.place]]);
  /* N..R */
  s.getRange(row, EVC.plan, 1, 5).setValues([[o.plan, o.action, o.link, o.review, o.target]]);
  SpreadsheetApp.flush();
  var newName = evStr_(s.getRange(row, EVC.name).getValue());
  var moved = 0;
  if(oldName && newName && oldName !== newName) moved = evRenameCustomers_(oldName, newName);
  evLog_(pic, isNew ? 'add' : 'update', row, newName, (moved ? moved + ' customers relinked · ' : '') + JSON.stringify(o).slice(0, 600));
  var saved = evRows_().filter(function(r){ return r.row === row; })[0] || null;
  return { ok:true, row:row, event:saved, relinked:moved, message: isNew ? 'Event added' : 'Event updated' + (moved ? ' · ' + moved + ' customers relinked to the new event name' : '') };
}
/* first empty row after the last event; copies formulas / format from the row above when needed */
function evNewRow_(s){
  var last = s.getLastRow(), first = EV_CFG.FIRST;
  var V = last >= first ? s.getRange(first, 1, last - first + 1, EVC.NC).getValues() : [];
  var lastData = first - 1;
  for(var i = V.length - 1; i >= 0; i--){ if(evIsData_(V[i])){ lastData = first + i; break; } }
  var row = lastData + 1;
  if(row > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), 5);
  var src = lastData >= first ? lastData : row;
  if(!s.getRange(row, EVC.name).getFormula() && src !== row){
    s.getRange(src, 1, 1, EVC.NC).copyTo(s.getRange(row, 1, 1, EVC.NC), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    s.getRange(src, 1, 1, EVC.NC).copyTo(s.getRange(row, 1, 1, EVC.NC), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  }
  [EVC.name, EVC.area, EVC.actual].forEach(function(c){
    var cell = s.getRange(row, c);
    if(cell.getFormula()) return;
    var f = src !== row ? s.getRange(src, c).getFormulaR1C1() : '';
    if(f) cell.setFormulaR1C1(f);
    else if(c === EVC.actual) return;             /* Actual Participant: only when the rows above use the formula */
    else if(c === EVC.name) cell.setFormulaR1C1('=R[0]C[2]&" "&R[0]C[4]&"_"&R[0]C[3]&"_"&R[0]C[6]&"_"&R[0]C[7]');
    else if(c === EVC.area) cell.setFormulaR1C1('=IF(R[0]C[-1]="", "-", IFERROR(VLOOKUP(R[0]C[-1],\'Master name\'!R2C41:R200C42, 2, 0),"-"))');
  });
  return row;
}
function evNextNo_(s, row, fy){
  var mx = 0;
  evRows_().forEach(function(r){ if(r.row !== row && r.fy === fy && typeof r.no === 'number' && r.no > mx) mx = r.no; });
  return mx + 1;
}
function evRenameCustomers_(oldName, newName){
  var s = evSS_().getSheetByName(EV_CFG.CUST); if(!s) return 0;
  var last = s.getLastRow(); if(last < EV_CFG.FIRST) return 0;
  var rg = s.getRange(EV_CFG.FIRST, 11, last - EV_CFG.FIRST + 1, 1), V = rg.getValues(), n = 0;
  for(var i = 0; i < V.length; i++){ if(evStr_(V[i][0]) === oldName){ s.getRange(EV_CFG.FIRST + i, 11).setValue(newName); n++; } }
  return n;
}
function evDelete_(p){
  var pic = evStr_(p.pic);
  if(!evCanEdit_(pic)) return { ok:false, error:'Account "' + pic + '" is not allowed to delete events.' };
  var s = evSheet_(EV_CFG.EVENT), row = parseInt(p.row, 10) || 0;
  if(row < EV_CFG.FIRST) return { ok:false, error:'Invalid row.' };
  var cur = s.getRange(row, 1, 1, EVC.NC).getValues()[0];
  if(!evIsData_(cur) || (p.sig && evSig_(cur) !== String(p.sig)))
    return { ok:false, stale:true, error:'This event was changed in the sheet by someone else. Reload and try again.' };
  var name = evStr_(cur[EVC.name - 1]), no = cur[EVC.no - 1];
  var fy = evFy_(evStr_(cur[EVC.month - 1]).replace(/\.0+$/, '') || evParseDate_(typeof cur[EVC.date - 1] === 'number' ? String(cur[EVC.date - 1]) : cur[EVC.date - 1]).start);
  /* renumber the later events of the same FY */
  if(typeof no === 'number'){
    evRows_().forEach(function(r){ if(r.row > row && r.fy === fy && typeof r.no === 'number' && r.no > no) s.getRange(r.row, EVC.no).setValue(r.no - 1); });
  }
  s.deleteRow(row);
  evLog_(pic, 'delete', row, name, JSON.stringify(cur.map(function(x){ return x instanceof Date ? evIso_(x) : x; })).slice(0, 800));
  return { ok:true, row:row, message:'Event deleted' };
}

/* run once from the editor: checks access and creates the hidden log sheet */
function evSetup(){
  var r = evList_({});
  evLog_('setup', 'setup', '', '', r.rows.length + ' events');
  var msg = 'Event backend OK · ' + r.rows.length + ' events · ' + evCustomers_({}).rows.length + ' customers.\nNow deploy: Deploy ▸ Manage deployments ▸ edit ▸ New version ▸ Deploy.';
  try{ SpreadsheetApp.getUi().alert(msg); }catch(e){ Logger.log(msg); }
  return msg;
}