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
  if (op === 'probe'){                                          /* ghi thử 1 ô Start (dòng `row`, mặc định 5) = ngày đảo, đọc lại ngay */
    var sp = sh('weekly'), rw = parseInt(p.row, 10) || 5, cl = sp.getRange(rw, COL.weekly.start), tzp = ss().getSpreadsheetTimeZone(), v0 = cl.getValue(), res = { ok:true, row:rw };
    var fmtp = function(v){ return v instanceof Date ? Utilities.formatDate(v, tzp, 'yyyy-MM-dd HH:mm') : typeof v + ':' + String(v); };
    res.before = fmtp(v0) + ' · hiện ' + cl.getDisplayValue() + ' · f=' + cl.getFormula();
    try { var dv = cl.getDataValidation(); res.dv = dv ? (String(dv.getCriteriaType()) + ' ' + JSON.stringify(dv.getCriteriaValues()).slice(0, 120) + ' reject=' + !dv.getAllowInvalid()) : 'không'; } catch(e){ res.dv = 'lỗi ' + e.message; }
    if (v0 instanceof Date && v0.getDate() <= 12){
      var nv = new Date(v0.getFullYear(), v0.getDate() - 1, v0.getMonth() + 1);
      try { cl.setValue(nv); SpreadsheetApp.flush(); res.wrote = fmtp(nv); } catch(e){ res.err = String(e.message || e); }
      res.after = fmtp(sp.getRange(rw, COL.weekly.start).getValue()) + ' · hiện ' + sp.getRange(rw, COL.weekly.start).getDisplayValue();
    }
    try { res.user = Session.getEffectiveUser().getEmail().split('@')[0]; } catch(e){ res.user = '?'; }
    try { res.ranges = ss().getNamedRanges().length; res.sheetId = sp.getSheetId(); res.file = ss().getName(); } catch(e){}
    return res;
  }
  if (op === 'deep' || op === 'deepfix') return dfDeep_(p);
  if (op === 'probe2'){                                         /* thử 3 cách ghi ngày vào ô Start dòng `row`: số ngày (serial) · chữ yyyy-mm-dd · Date 12:00 — đọc lại sau mỗi cách */
    var sq = sh('weekly'), rq = parseInt(p.row, 10) || 5, cq = sq.getRange(rq, COL.weekly.start), tzq = ss().getSpreadsheetTimeZone(), want = String(p.d || '2025-05-06'), R2 = { ok:true, row:rq, want:want };
    var rd = function(){ SpreadsheetApp.flush(); var v = cq.getValue(); return (v instanceof Date ? Utilities.formatDate(v, tzq, 'yyyy-MM-dd HH:mm') : typeof v + ':' + v) + ' · hiện ' + cq.getDisplayValue(); };
    var y = +want.slice(0, 4), mo = +want.slice(5, 7), d = +want.slice(8, 10);
    R2.locale = ss().getSpreadsheetLocale(); R2.fmt = cq.getNumberFormat();
    cq.setValue(new Date(y, mo - 1, d, 12)); R2.date12 = rd();
    cq.setValue(want); R2.text = rd();
    cq.setValue((Date.UTC(y, mo - 1, d) - Date.UTC(1899, 11, 30)) / 864e5); R2.serial = rd();
    return R2;
  }
  if (op === 'run'){
    var r = crmDateFix_(), s0 = sh('weekly'), tz0 = ss().getSpreadsheetTimeZone();
    SpreadsheetApp.flush();
    r.after = s0.getRange(DATA_ROW + 1, COL.weekly.start, 6, 2).getValues().map(function(x){ return x.map(function(v){ return v instanceof Date ? Utilities.formatDate(v, tz0, 'yyyy-MM-dd HH:mm') : String(v); }).join(' → '); });
    try { r.prot = ss().getProtections(SpreadsheetApp.ProtectionType.RANGE).length + ' vùng khoá · sheet khoá ' + s0.getProtections(SpreadsheetApp.ProtectionType.SHEET).length; } catch(e){ r.prot = String(e.message || e); }
    try { r.user = Session.getEffectiveUser().getEmail().split('@')[0]; } catch(e){}
    return r;
  }
  var book = ss(), s = sh('weekly'), W = COL.weekly, tz = book.getSpreadsheetTimeZone(), last = s.getLastRow();
  var out = { ok:true, locale:(function(){ try { return book.getSpreadsheetLocale(); } catch(e){ return '?'; } })(), fileTz:tz, scriptTz:Session.getScriptTimeZone(),
              dfVer:props_().getProperty(DF_KEY) || '', dfLog:props_().getProperty('CRM_DATEFIX_LOG') || '', lastRow:last,
              daily:(function(){ try { return ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'crmDateFixDaily'; }); } catch(e){ return 'không đọc được trigger'; } })() };
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

/* ── op=deep / op=deepfix (17/11/2026): soát đảo ngày KHÔNG dựa vào Start Month (app lưu lại thì Start Month cũng theo ngày đã đảo) ──
   Bằng chứng độc lập cho từng dòng có ngày ≤ 12 (đảo được): ① ngày ảnh 📷 / 🕒 cột W · ② thứ tự dòng: trung vị ngày của các dòng cùng PIC sát bên (±8 dòng)
   · ③ Completed mà ngày ở tương lai còn ngày đảo đã qua. deepfix&run=1: đổi Start (+ Finish trùng ngày, + Start Month / FY) theo bằng chứng mạnh, ghi số ngày (wV_). */
function dfDeep_(p){
  var s = sh('weekly'), W = COL.weekly, tz = ss().getSpreadsheetTimeZone(), last = s.getLastRow(), n = last - DATA_ROW + 1;
  if (n < 1) return { ok:true, n:0 };
  var V = s.getRange(DATA_ROW, 1, n, W.gpsInfo).getValues();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var iso = function(v){ return v instanceof Date && !isNaN(v) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : ''; };
  var rows = V.map(function(r, i){
    var st = iso(r[W.start - 1]), g = String(r[W.gpsInfo - 1] || '') + '\n' + String(r[W.photo - 1] || '');
    var ph = (/📷\s*(\d{4}-\d{2}-\d{2})/.exec(g) || /🕒\s*(\d{4}-\d{2}-\d{2})/.exec(g) || [])[1] || '';
    return { row:DATA_ROW + i, pic:String(r[W.pic - 1] || '').trim(), acc:String(r[W.account - 1] || '').slice(0, 26), st:st, fin:iso(r[W.finish - 1]),
             status:String(r[W.status - 1] || ''), act:String(r[W.typeAction - 1] || ''), ph:ph, ym:dfYm_(r[W.month - 1]) };
  });
  var byPic = {}; rows.forEach(function(r, i){ if (r.pic && r.st) (byPic[r.pic] = byPic[r.pic] || []).push(i); });
  var med = function(i){
    var L = byPic[rows[i].pic] || [], k = L.indexOf(i), a = [];
    for (var j = Math.max(0, k - 8); j <= Math.min(L.length - 1, k + 8); j++) if (j !== k) a.push(rows[L[j]].st);
    if (a.length < 3) return ''; a.sort(); return a[Math.floor(a.length / 2)];
  };
  var ad = function(a, b){ return Math.abs(dfDays_(a, b)); };
  var logD = {}; try { logD = wkLogAdds_() || {}; } catch(e){}   /* dòng → ngày tạo (nhật ký _LOG "add weekly") */
  var out = { ok:true, today:today, cand:0, photoSwap:0, photoOk:0, logSwap:0, logOk:0, orderSwap:0, futureDone:0, logRows:Object.keys(logD).length, fix:[], ex:{ photo:[], order:[], future:[], ok:[] }, perPic:{}, busyDays:[] };
  rows.forEach(function(r, i){
    if (!r.st) return;
    var pp = out.perPic[r.pic] = out.perPic[r.pic] || { rows:0, d1_12:0, d13_31:0, cand:0, fix:0 };
    pp.rows++; if (+r.st.slice(8, 10) <= 12) pp.d1_12++; else pp.d13_31++;
    var d = +r.st.slice(8, 10), mo = +r.st.slice(5, 7); if (d > 12 || d === mo) return;
    var sw = dfMk_(+r.st.slice(0, 4), d, mo); if (!sw) return;
    out.cand++; pp.cand++;
    var why = '', tag = r.row + ' ' + r.pic + ' · ' + r.acc + ' · ' + r.st + ' → ' + sw;
    if (r.ph){
      if (ad(r.ph, r.st) <= 20){ out.photoOk++; if (out.ex.ok.length < 6) out.ex.ok.push(tag + ' · ảnh ' + r.ph); return; }
      if (ad(r.ph, sw) <= 20){ why = 'ảnh ' + r.ph; out.photoSwap++; if (out.ex.photo.length < 25) out.ex.photo.push(tag + ' · ' + why); }
    }
    var ld = logD[r.row] || '';
    if (!why && ld){
      var dc = dfDays_(ld, r.st), dsw = dfDays_(ld, sw);
      if (dc >= -10 && dc <= 60){ out.logOk++; if (!r.ph) return; }
      else if (dsw >= -10 && dsw <= 60){ why = 'tạo dòng ngày ' + ld; out.logSwap++; if (out.ex.photo.length < 25) out.ex.photo.push(tag + ' · ' + why); }
    }
    if (!why && /complet/i.test(r.status) && r.st > today && sw <= today){ why = 'Completed mà ngày ở tương lai'; out.futureDone++; if (out.ex.future.length < 15) out.ex.future.push(tag); }
    if (!why && !r.ph){
      var m = med(i);
      if (m && ad(r.st, m) > 45 && ad(sw, m) <= 25){ why = 'các dòng cùng PIC sát bên ~' + m; out.orderSwap++; if (out.ex.order.length < 25) out.ex.order.push(tag + ' · ' + why); }
    }
    if (why){ pp.fix++; out.fix.push({ row:r.row, st:r.st, sw:sw, fin:r.fin, ym:r.ym, why:why }); }
  });
  /* ngày dồn nhiều lượt bất thường (cùng PIC, ≥ 6 dòng / ngày) */
  var cnt = {}; rows.forEach(function(r){ if (r.st && r.pic) cnt[r.pic + ' ' + r.st] = (cnt[r.pic + ' ' + r.st] || 0) + 1; });
  out.busyDays = Object.keys(cnt).filter(function(k){ return cnt[k] >= 6; }).sort(function(a, b){ return cnt[b] - cnt[a]; }).slice(0, 25).map(function(k){ return k + ' = ' + cnt[k]; });
  if (String(p.op) === 'deepfix' && String(p.run) === '1'){
    var lock = LockService.getScriptLock(); if (!lock.tryLock(25000)) return { ok:false, error:'busy' };
    var done = 0;
    try {
      out.fix.forEach(function(f){
        var cur = s.getRange(f.row, W.start, 1, 2).getValues()[0];
        if (iso(cur[0]) !== f.st) return;                                         /* dòng đã đổi ⇒ bỏ qua */
        var nf = iso(cur[1]) === f.st ? f.sw : (cur[1] instanceof Date ? iso(cur[1]) : '');
        if (nf && nf < f.sw) nf = f.sw;
        s.getRange(f.row, W.start, 1, 2).setValues(wRow_([[s2d(f.sw), nf ? s2d(nf) : cur[1]]]));
        if (f.ym === f.st.slice(0, 7).replace('-', '')) s.getRange(f.row, W.month).setValue(+f.sw.slice(0, 7).replace('-', ''));
        done++;
      });
      SpreadsheetApp.flush();
    } finally { lock.releaseLock(); }
    out.fixed = done;
    try { _RAW = {}; bumpVersion(); } catch(e){}
    try { logAct({ pic:'system' }, 'datefix', 'weekly', 'Sửa ngày đảo (soát sâu)', done + ' dòng', ''); flushLog_(); } catch(e){}
  }
  out.nFix = out.fix.length; out.fix = out.fix.slice(0, 40).map(function(f){ return f.row + ':' + f.st + '→' + f.sw; });
  return out;
}
