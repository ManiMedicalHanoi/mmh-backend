/* ════════════════════════════════════════════════════════════════════════════════════════════════
   MMH_DateDiag.gs (17/11/2026) — chẩn đoán cột ngày tab 6. WEEKLY REPORT (Start / Finish / Start Month) — CHỈ ĐỌC trừ op=run
   ?action=dfDiag&key=<8 ký tự cuối Script ID>[&op=status|rows|run][&from=<dòng>&n=<số dòng>][&full=1]
   status: vùng / múi giờ file, số ô Date / chữ / có giờ, Start Month là công thức hay số, dòng Start lệch Start Month,
           dòng nghi đảo ngày ↔ tháng (ngày ≤ 12 và đảo lại thì khớp Start Month / Finish hợp lý hơn), ví dụ.
   rows:   giá trị thô + chữ đang hiện của Start / Finish / Start Month (≤ 80 dòng).   run: chạy crmDateFix_() ngay.
   ════════════════════════════════════════════════════════════════════════════════════════════════ */
function dfDiag_(p){
  if (String(p.key || '') !== ScriptApp.getScriptId().slice(-8)) return { ok:false, error:'key?' };
  var op = String(p.op || 'status');
  if (op === 'run') return crmDateFix_();
  var book = ss(), s = sh('weekly'), W = COL.weekly, tz = book.getSpreadsheetTimeZone(), last = s.getLastRow();
  var out = { ok:true, locale:(function(){ try { return book.getSpreadsheetLocale(); } catch(e){ return '?'; } })(), fileTz:tz, scriptTz:Session.getScriptTimeZone(),
              dfVer:props_().getProperty(DF_KEY) || '', dfLog:props_().getProperty('CRM_DATEFIX_LOG') || '', lastRow:last,
              daily:ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'crmDateFixDaily'; }) };
  if (last < DATA_ROW) return out;
  var n = last - DATA_ROW + 1, c0 = W.month, c1 = W.finish;
  var rg = s.getRange(DATA_ROW, c0, n, c1 - c0 + 1), V = rg.getValues(), D = rg.getDisplayValues(), F = rg.getFormulas();
  var acc = s.getRange(DATA_ROW, W.account, n, 1).getDisplayValues(), pic = s.getRange(DATA_ROW, W.pic, n, 1).getDisplayValues();
  var fmt = s.getRange(DATA_ROW, W.start, Math.min(n, 2000), 1).getNumberFormats(), fm = {};
  fmt.forEach(function(r){ fm[r[0]] = (fm[r[0]] || 0) + 1; });
  out.startFormats = fm;
  if (op === 'rows'){
    var a = Math.max(DATA_ROW, parseInt(p.from, 10) || DATA_ROW) - DATA_ROW, k = Math.min(80, parseInt(p.n, 10) || 40), L = [];
    for (var i = a; i < Math.min(n, a + k); i++){
      var sv = V[i][1], fv = V[i][2];
      L.push([DATA_ROW + i, pic[i][0], acc[i][0].slice(0, 30), 'M=' + D[i][0] + (F[i][0] ? '(f)' : ''),
        'S=' + D[i][1] + ' [' + (sv instanceof Date ? Utilities.formatDate(sv, tz, 'yyyy-MM-dd HH:mm') : typeof sv + ':' + String(sv).slice(0, 20)) + ']',
        'F=' + D[i][2] + ' [' + (fv instanceof Date ? Utilities.formatDate(fv, tz, 'yyyy-MM-dd HH:mm') : typeof fv + ':' + String(fv).slice(0, 20)) + ']'].join(' | '));
    }
    out.rows = L; return out;
  }
  var st = { start:0, date:0, text:0, time:0, mFormula:0, mEmpty:0, mismatch:0, swapFit:0, finBefore:0, finFar:0, future:0, byMonth:{} }, ex = { mismatch:[], swapFit:[], text:[], fin:[], future:[] };
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  for (var j = 0; j < n; j++){
    var v = V[j][1]; if (v === '' || v === null) continue;
    st.start++;
    var ym = dfYm_(V[j][0]); if (F[j][0]) st.mFormula++; if (!ym) st.mEmpty++;
    var iso = dfIso_(v, tz, ym), row = DATA_ROW + j, tag = row + ' ' + pic[j][0] + ' · ' + acc[j][0].slice(0, 24);
    if (v instanceof Date){ st.date++; if (Utilities.formatDate(v, tz, 'HH:mm:ss') !== '00:00:00') st.time++; }
    else { st.text++; if (ex.text.length < 10) ex.text.push(tag + ' · "' + String(v).slice(0, 24) + '"'); }
    if (!iso) continue;
    var m = iso.slice(0, 7); st.byMonth[m] = (st.byMonth[m] || 0) + 1;
    if (ym && iso.slice(0, 7).replace('-', '') !== ym){ st.mismatch++; if (ex.mismatch.length < 15) ex.mismatch.push(tag + ' · start ' + iso + ' (' + D[j][1] + ') · month ' + ym); }
    var d = +iso.slice(8, 10), mo = +iso.slice(5, 7);
    if (d <= 12 && d !== mo){
      var sw = dfMk_(+iso.slice(0, 4), d, mo), fv2 = V[j][2], fIso = fv2 instanceof Date ? Utilities.formatDate(fv2, tz, 'yyyy-MM-dd') : dfIso_(fv2, tz, ym);
      var okNow = fIso ? (dfDays_(iso, fIso) >= 0 && dfDays_(iso, fIso) <= 92) : true, okSw = fIso && sw ? (dfDays_(sw, fIso) >= 0 && dfDays_(sw, fIso) <= 92) : false;
      var mSw = ym && sw && sw.slice(0, 7).replace('-', '') === ym;
      if (mSw || (!okNow && okSw)){ st.swapFit++; if (ex.swapFit.length < 20) ex.swapFit.push(tag + ' · start ' + iso + ' → ' + sw + ' · finish ' + (fIso || '-') + ' · month ' + (ym || '-') + (F[j][0] ? '(f)' : '')); }
    }
    var f2 = V[j][2], fi = f2 instanceof Date ? Utilities.formatDate(f2, tz, 'yyyy-MM-dd') : '';
    if (fi && fi < iso){ st.finBefore++; if (ex.fin.length < 10) ex.fin.push(tag + ' · ' + iso + ' → ' + fi); }
    if (fi && dfDays_(iso, fi) > 92) st.finFar++;
    if (dfDays_(today, iso) > 60){ st.future++; if (ex.future.length < 10) ex.future.push(tag + ' · ' + iso); }
  }
  out.weekly = st; out.ex = ex;
  return out;
}
