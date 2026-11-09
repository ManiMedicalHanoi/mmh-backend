/* ═══════════════════════════════════════════════════════════════════════════════════════
   EV_Roi.gs — v1.0 (09/11/2026) · Thailand Dental Event — budget, revenue, ROI + follow-up (user request)

   REPORT_EVENT (header row 3 / 4) columns used:
     T Expenses (Estimated) · U Revenue (Estimated) · V Profit/Loss (Estimated)
     W Expenses (Actual)    · X Revenue (Actual)    · Y Profit/Loss (Actual)
     Z Note · AA Next follow up · AB Follow-up log (added by the app: 1 line per follow-up "yyyy-MM-dd | PIC | 2w | note")
   T..Y are usually formulas to the event budget sheet ("Sale out Event Budget": L10/L11/L12 estimated, M10/M11/M12 actual).
   The app never overwrites a formula: a number typed in the app is written only into an EMPTY / value cell.

   Actions (router in Mã.gs):
     followup     {row, sig, pic, k: 2w|4w|8w|call|visit|other, note, next?}  ⇒ appends 1 line to AB (+ AA when next is sent)
     budgetSheet  {row, sig, pic}  ⇒ the linked budget sheet; none ⇒ copies the latest budget sheet, clears the inputs,
                                     writes the event name, links T..Y to it
   ═══════════════════════════════════════════════════════════════════════════════════════ */
var EVR = { T: 20, NC: 9, LOG_COL: 28, BUD_MARK: 'sale out event budget',
            CELLS: ['L10', 'L11', 'L12', 'M10', 'M11', 'M12'],               /* → T U V W X Y */
            KEYS: ['expEst', 'revEst', 'plEst', 'expAct', 'revAct', 'plAct'],
            FU_KINDS: ['2w', '4w', '8w', 'call', 'visit', 'order', 'other'] };

function evrNum_(v){ if(v === '' || v == null) return ''; var n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : ''; }
function evrSheetOf_(f){ var m = /^=\s*'?((?:[^']|'')+?)'?!\$?[LM]\$?1[012]\s*$/i.exec(String(f || '')); return m ? m[1].replace(/''/g, "'") : ''; }
function evrFuParse_(txt){
  var out = [];
  String(txt || '').split(/\n/).forEach(function(l){
    l = l.trim(); if(!l) return;
    var m = /^(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([\s\S]*)$/.exec(l);
    if(m) out.push({ d: m[1], pic: m[2].trim(), k: m[3].trim(), t: m[4].trim() });
    else out.push({ d: '', pic: '', k: 'other', t: l });
  });
  return out;
}
/* evRows_ ⇒ adds the ROI / follow-up fields to every event */
function evRoiRead_(s, rows){
  if(!rows.length) return;
  var first = EV_CFG.FIRST, n = rows[rows.length - 1].row - first + 1;
  var width = Math.min(EVR.NC, Math.max(0, s.getMaxColumns() - EVR.T + 1)); if(width < 1) return;
  var V = s.getRange(first, EVR.T, n, width).getValues();
  var F = s.getRange(first, EVR.T, n, 6).getFormulas();
  var gids = {};
  try{ evSS_().getSheets().forEach(function(sh){ gids[sh.getName()] = sh.getSheetId(); }); }catch(e){}
  rows.forEach(function(r){
    var i = r.row - first, v = V[i] || [], f = F[i] || [];
    var roi = { fx: {} };
    EVR.KEYS.forEach(function(k, j){ roi[k] = evrNum_(v[j] instanceof Date ? '' : v[j]); if(f[j]) roi.fx[k] = 1; });
    r.roi = roi;
    r.note = evStr_(v[6]);
    r.next = v[7] instanceof Date ? evIso_(v[7]) : evStr_(v[7]);
    r.fu = evrFuParse_(v[8]);
    var bs = '';
    for(var j = 0; j < 6 && !bs; j++) bs = evrSheetOf_(f[j]);
    if(bs) r.bs = { name: bs, gid: gids[bs] !== undefined ? String(gids[bs]) : '' };
  });
}
/* evSave_ ⇒ Z / AA + the numbers typed in the app (never over a formula) */
function evRoiSave_(s, row, ev){
  if(ev.note !== undefined) s.getRange(row, EVR.T + 6).setValue(evStr_(ev.note));
  if(ev.next !== undefined) s.getRange(row, EVR.T + 7).setValue(evStr_(ev.next));
  var roi = ev.roi; if(typeof roi === 'string'){ try{ roi = JSON.parse(roi); }catch(e){ roi = null; } }
  if(!roi) return;
  var F = s.getRange(row, EVR.T, 1, 6).getFormulas()[0];
  [0, 1, 3, 4].forEach(function(j){
    var k = EVR.KEYS[j]; if(roi[k] === undefined || F[j]) return;
    s.getRange(row, EVR.T + j).setValue(evrNum_(roi[k]));
  });
  /* Profit / Loss = Revenue − Expenses when the cell has no formula yet */
  [2, 5].forEach(function(j){ if(!F[j]) s.getRange(row, EVR.T + j).setFormulaR1C1('=IF(AND(R[0]C[-2]="",R[0]C[-1]=""),"",N(R[0]C[-1])-N(R[0]C[-2]))'); });
}
function evrRow_(p){
  var s = evSheet_(EV_CFG.EVENT), row = parseInt(p.row, 10) || 0;
  if(row < EV_CFG.FIRST) return { err: { ok:false, error:'Invalid row.' } };
  var cur = s.getRange(row, 1, 1, EVC.NC).getValues()[0];
  if(!evIsData_(cur) || (p.sig && evSig_(cur) !== String(p.sig)))
    return { err: { ok:false, stale:true, error:'This event was changed in the sheet by someone else. Reload and try again.' } };
  return { s: s, row: row, cur: cur };
}
function evrHeader_(s){
  try{ var h = s.getRange(3, EVR.LOG_COL); if(!evStr_(h.getValue())) { h.setValue('Follow-up log'); s.getRange(4, EVR.LOG_COL).setValue('App'); } }catch(e){}
}
function evFollowup_(p){
  var pic = evStr_(p.pic);
  if(!evCanEdit_(pic)) return { ok:false, error:'Account "' + pic + '" is not allowed to edit events.' };
  var R = evrRow_(p); if(R.err) return R.err;
  var k = evStr_(p.k).toLowerCase(); if(EVR.FU_KINDS.indexOf(k) < 0) k = 'other';
  var note = evStr_(p.note).replace(/\s*\n\s*/g, ' · ').replace(/\|/g, '/').slice(0, 500);
  if(!note && k === 'other') return { ok:false, error:'Write what was done.' };
  var d = /^\d{4}-\d{2}-\d{2}$/.test(evStr_(p.d)) ? evStr_(p.d) : Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  evrHeader_(R.s);
  var cell = R.s.getRange(R.row, EVR.LOG_COL), old = evStr_(cell.getValue());
  cell.setValue((old ? old + '\n' : '') + [d, pic, k, note].join(' | '));
  if(p.next !== undefined) R.s.getRange(R.row, EVR.T + 7).setValue(evStr_(p.next));
  SpreadsheetApp.flush();
  evLog_(pic, 'followup', R.row, evStr_(R.cur[EVC.name - 1]), k + ' · ' + note);
  var saved = evRows_().filter(function(r){ return r.row === R.row; })[0] || null;
  return { ok:true, row:R.row, event:saved, message:'Follow-up saved' };
}
/* latest budget sheet of the file = template (sheet name starts with yyyymmdd, B1 "Sale out Event Budget") */
function evrTemplate_(ss){
  var best = null, bestKey = '';
  ss.getSheets().forEach(function(sh){
    var b1 = ''; try{ b1 = evStr_(sh.getRange('B1').getValue()).toLowerCase(); }catch(e){}
    if(b1.indexOf(EVR.BUD_MARK) !== 0) return;
    var key = (/^(\d{8})/.exec(sh.getName()) || ['', '00000000'])[1] + '|' + sh.getIndex();
    if(key > bestKey){ bestKey = key; best = sh; }
  });
  return best;
}
function evBudgetSheet_(p){
  var pic = evStr_(p.pic);
  if(!evCanEdit_(pic)) return { ok:false, error:'Account "' + pic + '" is not allowed to edit events.' };
  var R = evrRow_(p); if(R.err) return R.err;
  var ss = evSS_(), s = R.s, row = R.row;
  var F = s.getRange(row, EVR.T, 1, 6).getFormulas()[0], have = '';
  for(var j = 0; j < 6 && !have; j++) have = evrSheetOf_(F[j]);
  if(have && ss.getSheetByName(have)) return { ok:true, created:false, bs:{ name:have, gid:String(ss.getSheetByName(have).getSheetId()) } };
  var tpl = evrTemplate_(ss);
  if(!tpl) return { ok:false, error:'No budget sheet ("Sale out Event Budget") found in the file to copy.' };
  var V = s.getRange(row, 1, 1, EVC.NC).getValues()[0];
  var evName = evStr_(V[EVC.name - 1]), raw = V[EVC.date - 1];
  var d8 = (raw instanceof Date ? evIso_(raw).replace(/-/g, '') : evStr_(typeof raw === 'number' ? Math.round(raw) : raw)).replace(/[^\d-]/g, '');
  var base = (d8 + ' ' + (evStr_(V[EVC.place - 1]) || evStr_(V[EVC.topic - 1]) || 'Event')).replace(/[\[\]\*\?\/\\:']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  var name = base, n = 2;
  while(ss.getSheetByName(name)) name = base.slice(0, 36) + ' (' + (n++) + ')';
  var sh = tpl.copyTo(ss).setName(name);
  try{ ss.setActiveSheet(sh); ss.moveActiveSheet(tpl.getIndex()); }catch(e){}
  /* clear the input cells of the copy (keep labels, subtotal rows and variance formulas) */
  var last = sh.getLastRow();
  if(last >= 20){
    var D = sh.getRange(20, 4, last - 19, 1).getValues();
    D.forEach(function(r, i){
      if(/subtotal/i.test(evStr_(r[0]))) return;
      sh.getRange(20 + i, 5, 1, 2).clearContent();       /* E:F expenses estimated / actual */
      sh.getRange(20 + i, 9, 1, 5).clearContent();       /* I:M revenue item / estimated / actual */
    });
  }
  sh.getRange('C3').setValue(evName); sh.getRange('J7').setValue(evName);
  try{ sh.getRange('C4').setValue(evStr_(V[EVC.place - 1])); }catch(e){}
  try{ sh.getRange('M17').setValue('Last update date: ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy')); }catch(e){}
  /* link T..Y of the event to the new sheet (cells with a value typed before are replaced by the link) */
  var q = "'" + name.replace(/'/g, "''") + "'!";
  s.getRange(row, EVR.T, 1, 6).setFormulas([EVR.CELLS.map(function(c){ return '=' + q + c; })]);
  SpreadsheetApp.flush();
  evLog_(pic, 'budgetSheet', row, evName, 'copied from ' + tpl.getName() + ' ⇒ ' + name);
  return { ok:true, created:true, bs:{ name:name, gid:String(sh.getSheetId()) }, from: tpl.getName(), message:'Budget sheet created' };
}
