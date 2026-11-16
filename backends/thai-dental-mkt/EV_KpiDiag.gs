/* ═══════════════════════════════════════════════════════════════════════════════════════
   kpiDiag (16/11/2026) — READ ONLY. Why is C16-00 (participants in T&E events, Sui) 0?
   ?action=kpiDiag&key=<last 8 characters of the Sheet ID>[&from=202609]
   Per event from `from`: row · month · PIC-KPI · Action Status · Actual Participant (S) · S has a formula ·
   rows of CUSTOMER LIST whose Event name (K) = the event name (exact / ignoring case + spaces).
   Plus CUSTOMER LIST rows whose Event name matches no event. Counts and event names only — no customer data.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
function evKpiDiag_(p){
  if(String(p.key || '') !== EV_CFG.SHEET_ID.slice(-8)) return { ok:false, code:'KEY' };
  var from = parseInt(p.from, 10) || 202609, ss = evSS_(), s = evSheet_(EV_CFG.EVENT);
  var norm = function(x){ return evStr_(x).toLowerCase().replace(/\s+/g, ' ').trim(); };
  var c = ss.getSheetByName(EV_CFG.CUST), F = EV_CFG.CUST_FIRST, cl = c ? c.getLastRow() : 0;
  var hdr = c ? c.getRange(2, 3, 1, 12).getDisplayValues()[0] : [];
  var K = (c && cl >= F) ? c.getRange(F, 4, cl - F + 1, 8).getValues() : [];   // D name … K event
  var exact = {}, loose = {}, used = {};
  K.forEach(function(r){ var nm = evStr_(r[0]), ev = evStr_(r[7]); if(!nm || !ev) return;
    exact[ev] = (exact[ev] || 0) + 1; loose[norm(ev)] = (loose[norm(ev)] || 0) + 1; });
  var ok = ['as planned', 'additional', 'change schedule'], out = [], byM = {};
  evRows_().forEach(function(e){
    if(!(Number(e.month) >= from)) return;
    var f = s.getRange(e.row, EVC.actual).getFormula();
    var counted = ok.indexOf(e.action.toLowerCase()) >= 0;
    used[norm(e.name)] = 1;
    var m = byM[e.month] || (byM[e.month] = { events: 0, counted: 0, sumS: 0, sumList: 0 });
    m.events++; if(counted){ m.counted++; m.sumS += Number(e.actual) || 0; m.sumList += loose[norm(e.name)] || 0; }
    out.push([e.row, e.month, e.picKpi, e.action, e.actual, f ? f.slice(0, 60) : '', exact[e.name] || 0, loose[norm(e.name)] || 0, e.name.slice(0, 70)]);
  });
  var orphan = {};
  Object.keys(loose).forEach(function(k){ if(!used[k]) orphan[k.slice(0, 70)] = loose[k]; });
  return { ok:true, from:from, custHeader:hdr, custRows:K.filter(function(r){ return evStr_(r[0]); }).length, byMonth:byM,
    cols:['row','month','picKpi','action','S','S formula','list exact','list loose','name'], events:out, orphanEventNames:orphan };
}
