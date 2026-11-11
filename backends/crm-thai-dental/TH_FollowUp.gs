/*************************************************************************************************
 * TH_FollowUp.gs — v1.0 (11/11/2026) · CRM Thailand Dental — FOLLOW-UP of tenders (public) and purchases (private) per account
 * (user request: "Dental Thailand also updates tender / procurement follow-ups like the Vietnam Surgical team", shown in the CRM Working Map)
 *
 * Sheet "FOLLOW UP" (visible, English) in this CRM file — APPEND ONLY: every update of 1 case = 1 new row (same "Case ID", "Rev" + 1),
 * old rows are never edited or deleted ⇒ full history. Current state of a case = its newest row.
 * Same stage numbers as the Vietnam Surgical follow-up (crm-surgical/MMH_TenderFU.gs) so the app uses one renderer:
 *   Public tender   1 Not approached · 2 Introduced to specialists · 3 Building specifications · 4 Quotation sent · 5 Bidding
 *                   · 7 Won · 8 Lost · 9 Paused · 10 Not participating
 *   Private purchase 11 Introduction · 12 Demo · 13 Proposal from clinicians · 14 Purchase contract · 15 Using products
 *                   · 18 Unsuccessful · 19 Stopped
 * Who: company e-mail session (`tk`, signed by Training Hub — tmWho_ in MMH_TestMode.gs; no new Google service ⇒ no new permission).
 *   Sales see / write their own cases; Admin / Director / HOD see all (the app filters by PIC on screen).
 *   GET/POST action=fuMeta          → { ok, v, stages }
 *   GET/POST action=fuList  tk      → { ok, v, me, stages, cols, rows:[[…]] }  (every row, old → new)
 *   POST     action=fuSave  tk rid case? code hosp prov pkg ptype qty value stage due note
 *                                   → { ok, rec:[…], cols }
 *************************************************************************************************/
var THFU = {
  VER: '1.0', TAB: 'FOLLOW UP',
  HDR: ['Updated at', 'Case ID', 'Rev', 'PIC', 'E-mail', 'Account code', 'Account', 'Province', 'Opportunity / tender name',
        'Products', 'Est. quantity', 'Est. value (THB)', 'Stage no.', 'Stage', 'Next date', 'Situation (note)', 'Request ID', 'Source'],
  COLS: ['at', 'id', 'rev', 'pic', 'mail', 'code', 'hosp', 'prov', 'pkg', 'ptype', 'qty', 'value', 'stage', 'stageName', 'due', 'note', 'rid', 'src'],
  STAGES: ['', 'Not approached', 'Introduced to specialists', 'Building specifications', 'Quotation sent', 'Bidding', '',
           'Won', 'Lost', 'Paused', 'Not participating',
           'Introduction', 'Demo', 'Proposal from clinicians', 'Purchase contract', 'Using products', '', '', 'Unsuccessful', 'Stopped']
};
function thfuRoute_(a, user, p){
  try{
    if(a === 'fuMeta') return { ok: true, v: THFU.VER, stages: THFU.STAGES };
    if(a === 'fuList') return thfuList_(p);
    if(a === 'fuSave') return thfuSave_(p);
  }catch(e){ return { ok: false, error: String(e && e.message || e) }; }
  return null;
}
function thfuSheet_(){
  var book = ss_(), s = book.getSheetByName(THFU.TAB);
  if(!s){
    s = book.insertSheet(THFU.TAB);
    s.getRange(1, 1, 1, THFU.HDR.length).setValues([THFU.HDR]).setFontWeight('bold').setBackground('#003047').setFontColor('#FFFFFF').setWrap(true);
    s.setFrozenRows(1);
    try{ s.getRange(1, 1).setNote('Written by the CRM app (Working Map). Append only — one row per update; the newest row of a Case ID is the current state.'); }catch(e){}
    [140, 120, 50, 80, 170, 110, 220, 110, 200, 160, 90, 110, 60, 160, 100, 260, 120, 80].forEach(function(w, i){ try{ s.setColumnWidth(i + 1, w); }catch(e){} });
  }
  return s;
}
function thfuWho_(p){
  var me = (typeof tmWho_ === 'function') ? tmWho_(p.tk) : { err: 'session check unavailable' };
  if(me.err) return { err: 'Please sign in with your company e-mail (' + me.err + ')' };
  return me;
}
function thfuAll_(me){
  return !!(me && (me.admin || /^(director|hod)$/.test(String(me.level || ''))));
}
function thfuRows_(){
  var s = thfuSheet_(), n = s.getLastRow() - 1;
  if(n < 1) return [];
  return s.getRange(2, 1, n, THFU.COLS.length).getValues().map(function(r){
    return r.map(function(v){ return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : v; });
  }).filter(function(r){ return str_(r[1]); });
}
function thfuList_(p){
  var me = thfuWho_(p); if(me.err) return { ok: false, code: 'AUTH', error: me.err };
  var all = thfuAll_(me), rows = thfuRows_();
  if(!all){
    var mine = {};
    rows.forEach(function(r){ if(picEq_(r[3], me.pic)) mine[r[1]] = 1; });
    rows = rows.filter(function(r){ return mine[r[1]]; });
  }
  return { ok: true, v: THFU.VER, me: { pic: me.pic, all: all }, stages: THFU.STAGES, cols: THFU.COLS, rows: rows };
}
function thfuSave_(p){
  var me = thfuWho_(p); if(me.err) return { ok: false, code: 'AUTH', error: me.err };
  var stage = parseInt(p.stage, 10) || 0;
  if(!THFU.STAGES[stage]) return { ok: false, code: 'STAGE', error: 'Please choose a stage.' };
  var hosp = str_(p.hosp).slice(0, 200);
  if(!hosp) return { ok: false, code: 'HOSP', error: 'Please choose an account.' };
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(25000)) return { ok: false, error: 'The system is busy — please try again in a few seconds.' };
  try{
    var s = thfuSheet_(), rows = thfuRows_(), id = str_(p['case']), rev = 1, prev = null;
    if(id){
      rows.forEach(function(r){ if(r[1] === id){ rev = Math.max(rev, (parseInt(r[2], 10) || 0) + 1); prev = r; } });
      if(!prev) return { ok: false, code: 'CASE', error: 'This follow-up was not found — reload and try again.' };
      if(!thfuAll_(me) && !picEq_(prev[3], me.pic)) return { ok: false, code: 'OWNER', error: 'Only the PIC of this follow-up (or a manager) can update it.' };
    } else id = 'TF' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    var num = function(v){ var x = parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isNaN(x) ? '' : x; };
    var rec = [new Date(), id, rev, prev ? prev[3] : me.pic, me.email, str_(p.code).slice(0, 40) || (prev ? prev[5] : ''), hosp,
      str_(p.prov).slice(0, 80) || (prev ? prev[7] : ''), str_(p.pkg).slice(0, 200), str_(p.ptype).slice(0, 160), num(p.qty), num(p.value),
      stage, THFU.STAGES[stage], str_(p.due).slice(0, 10), str_(p.note).slice(0, 1500), str_(p.rid).slice(0, 60), 'CRM Working Map'];
    s.getRange(s.getLastRow() + 1, 1, 1, rec.length).setValues([rec]);
    rec[0] = Utilities.formatDate(rec[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    return { ok: true, rec: rec, cols: THFU.COLS };
  } finally { lock.releaseLock(); }
}
