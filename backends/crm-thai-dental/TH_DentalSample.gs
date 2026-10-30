/*************************************************************************************************
 * THAILAND DENTAL — SAMPLE DATA FOR TESTING THE KPI FLOW  (TH_DentalSample.gs · 30/10/2026)
 * Người dùng yêu cầu: thêm dữ liệu mẫu để thấy số trên KPI (đang thử luồng dữ liệu). Mọi dòng mẫu có nhãn "[SAMPLE]".
 *   · CUSTOMER VISITING  — Type action "Co-visiting with distributor": Yong 6 lượt (KPI C4-01), Man 5 lượt / 5 ngày (KPI C4-03)
 *   · NEW ACCOUNT & SKU  — 1 case Approved của Yong, loại Hospital (KPI C2-01)
 *   · PRODUCT TEST       — 5 bài test của Man: T9 1 Pass + 1 Fail, T10 3 Pass (KPI C11-03 = 50% T9 · 80% lũy kế T10)
 * Gọi:  web app ?action=thdSample&op=seed|clear|status|build&key=<8 ký tự cuối ID file Sheet>  (build = chạy nốt bước ⓪ còn thiếu)
 *       (seed / clear chạy nền bằng trigger 1 lần ⇒ trả lời ngay; xem kết quả bằng op=status)
 *       hoặc trong trình soạn: thdSampleSeed() · thdSampleClear() · Logger thdSampleStatus()
 * Chưa dựng bố cục (menu ⓪) ⇒ seed tự chạy ⓪ trong nền trước rồi mới thêm dữ liệu mẫu.
 *************************************************************************************************/
var THS = { TAG: '[SAMPLE]', PROP: 'THD_SAMPLE', WANT: 'THD_WANT_SAMPLE' };

function thdSampleApi_(p){
  var key = str_(p.key), id = ss_().getId();
  if(!key || key !== id.slice(-8)) return { ok: false, error: 'key?' };
  var op = str_(p.op) || 'status';
  if(op === 'status') return thdSampleStatus();
  if(op === 'seed' || op === 'clear'){
    props_().setProperty(THS.WANT, op); props_().deleteProperty('THD_TRY'); props_().deleteProperty('THD_ERR');
    thdSampleTrigger_(20);
    return { ok: true, queued: op, message: 'Running in the background (~1–5 min). Call op=status to see the result.', build: thdDone_() };
  }
  if(op === 'resync'){                                                  /* v1.1 — rebuild the visit mirror of ALL TASK (step sync again) */
    props_().deleteProperty('THD_VS_CLEAN');
    var d = thdDone_(); delete d.sync; props_().setProperty('THD_DONE', JSON.stringify(d));
    op = 'build';
  }
  if(op === 'build'){                                                   /* v1.1 — run the remaining menu ⓪ steps (e.g. sync) in the background */
    props_().deleteProperty('THD_ERR');
    ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdBuildCont') ScriptApp.deleteTrigger(t); });
    ScriptApp.newTrigger('thdBuildCont').timeBased().after(20 * 1000).create();
    return { ok: true, queued: 'build', message: 'Remaining layout steps run in the background. Call op=status to see the result.', build: thdDone_() };
  }
  return { ok: false, error: 'op = seed | clear | status | build | resync' };
}
function thdSampleTrigger_(sec){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdSampleRun') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('thdSampleRun').timeBased().after((sec || 20) * 1000).create();
}
/* trigger: layout first (menu ⓪ steps not done), then the sample op */
function thdSampleRun(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdSampleRun') ScriptApp.deleteTrigger(t); });
  var op = props_().getProperty(THS.WANT); if(!op) return;
  var done = thdDone_(), left = THD.STEPS.filter(function(s){ return !done[s] && s !== 'sync'; });   /* ALL TASK sync not needed for the KPI (trigger cronTh runs it every 10 min) */
  if(left.length){
    var busy = +(props_().getProperty('THD_RUN') || 0);
    if(!(busy && Date.now() - busy < 6.5 * 60 * 1000)){
      try{ thdRun_(false); }                                             /* builds as many steps as fit; schedules thdBuildCont itself */
      catch(e){ var k = +(props_().getProperty('THD_TRY') || 0) + 1; props_().setProperty('THD_TRY', String(k)); if(k < 3) thdSampleTrigger_(60); return; }
    }
    done = thdDone_(); left = THD.STEPS.filter(function(s){ return !done[s] && s !== 'sync'; });
    if(left.length){ thdSampleTrigger_(120); return; }                  /* come back when the layout is ready */
  }
  props_().deleteProperty(THS.WANT);
  if(op === 'seed') thdSampleSeed(); else thdSampleClear();
}

function thdSampleStatus(){
  var s = null; try{ s = JSON.parse(props_().getProperty(THS.PROP) || 'null'); }catch(e){}
  var done = thdDone_();
  return { ok: true, layout: THD.STEPS.map(function(x){ return (done[x] ? '✓ ' : '· ') + x; }).join(' '), pending: props_().getProperty(THS.WANT) || '',
           error: props_().getProperty('THD_ERR') || '', progress: props_().getProperty('THD_PROG') || '', tries: props_().getProperty('THD_TRY') || '', sample: s,
           allTask: (function(){ try{ return atSummary_(); }catch(e){ return { error: String(e && e.message || e) }; } })() };
}

/* ── seed ── */
function thdSampleSeed(){
  _SH = {}; _TAB = {};
  var prev = null; try{ prev = JSON.parse(props_().getProperty(THS.PROP) || 'null'); }catch(e){}
  if(prev && prev.state === 'seeded') return prev;
  var out = { state: 'seeded', at: Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm'), added: [], kpi: [] };
  var cus = customers_();
  function pick(pic, re, n){
    var ok = function(c){ return re.test(c.type) && c.name && c.province && c.name.length < 50 && !/[\r\n]/.test(c.name); };
    var l = cus.filter(function(c){ return picEq_(c.pic, pic) && ok(c); });
    if(!l.length) l = cus.filter(ok);
    return l.slice(0, n || 6);
  }
  function chk(c){ return [c.name, c.type, c.province, c.area].join('/'); }
  var L = lock_();
  try{
    /* 1 · CUSTOMER VISITING — co-visits (Completed, dates already passed) */
    var plan = [
      ['Yong', '2026-09-08'], ['Yong', '2026-09-15'], ['Yong', '2026-09-22'], ['Yong', '2026-10-06'], ['Yong', '2026-10-13'], ['Yong', '2026-10-20'],
      ['Man', '2026-09-09'], ['Man', '2026-09-16'], ['Man', '2026-10-07'], ['Man', '2026-10-14'], ['Man', '2026-10-21']];
    var accY = pick('Yong', /clinic/i, 6), accM = pick('Man', /clinic|hospital/i, 5), iY = 0, iM = 0;
    plan.forEach(function(x){
      var a = x[0] === 'Yong' ? accY[iY++ % Math.max(1, accY.length)] : accM[iM++ % Math.max(1, accM.length)];
      var acc = a ? chk(a) : 'Sample Dental Clinic/Clinic/BKK/Central';
      var d = { no: nextNo_('weekly'), fy: fyOfYm_(ymOf_(x[1])), month: Number(ymOf_(x[1])), start: x[1], finish: x[1], pic: x[0], account: acc,
        product: 'JIZAI', typeTask: 'Sale-Distributor', typeAction: 'Co-visiting with distributor', process: 'ENGAGE',
        plan: THS.TAG + ' Co-visit with the DDI sales rep — present JIZAI, follow up the order',
        result: 'Person met: Dr. Sample (owner)\n' + THS.TAG + ' Visited together with the distributor sales rep · customer interested in JIZAI trial',
        status: 'Completed', feedback: 'Positive', nextAction: 'Keep nurturing - Accelerate', stopReason: '' };
      var row = firstFree_('weekly');
      writeRow_('weekly', row, d, true); _TAB = {};
      out.added.push({ sheet: CFG.SH_WK, row: row, pic: x[0], date: x[1], what: 'Co-visiting with distributor · ' + acc.split('/')[0] });
    });
    SpreadsheetApp.flush();
    /* 2 · NEW ACCOUNT & SKU — 1 approved key account (Hospital) of Yong in 10/2026 */
    var h = pick('Yong', /hospital/i, 1)[0] || pick('Yong', /universit|dso/i, 1)[0];
    var o = { id: 'NA-SAMPLE-' + Utilities.formatDate(new Date(), tz_(), 'yyMMddHHmm'), created: naNow_(), pic: 'Yong', team: CFG.KEY, fy: 'FY68', month: '202610',
      type: 'new_account', kpi: 'C2-01', account: h ? h.name : 'Sample Dental Hospital', code: h ? h.code : '', accType: h ? h.type : 'Hospital',
      province: h ? h.province : 'BKK', npp: 'DDI', ptype: 'JIZAI', sku: 'JIZAI 025 04 21mm', orderDate: '2026-10-12', orderNo: '', qty: '', amount: '',
      lines: [], weekly: '', note: THS.TAG + ' sample case for the KPI test', checklist: {}, files: [], folder: '', status: 'Approved',
      subAt: naNow_(), subTo: 'Dao', decBy: 'Dao', decAt: naNow_(), comment: THS.TAG, updated: naNow_(), log: naNow_() + ' · ' + THS.TAG + ' added by the sample script' };
    naWrite_(o); try{ naBump_(); }catch(e){}
    out.added.push({ sheet: NA_ENV.sheet, row: o._row, pic: 'Yong', date: '2026-10-12', what: 'New key account · ' + o.account + ' (' + o.accType + ') · Approved' });
    /* 3 · PRODUCT TEST — 5 tests of Man */
    var pt = ptSheet_(), tests = [
      ['2026-09-18', 'DDI', 'Khun Somsak (DDI rep)', 'JIZAI', 85, 70, 'Pass'], ['2026-09-18', 'DDI', 'Khun Nattaya (DDI rep)', 'JIZAI', 60, 70, 'Fail'],
      ['2026-10-16', 'VRP', 'Khun Anan (VRP rep)', 'DIA-BURS', 90, 70, 'Pass'], ['2026-10-16', 'VRP', 'Khun Pim (VRP rep)', 'DIA-BURS', 78, 70, 'Pass'],
      ['2026-10-23', 'Promptdent', 'Khun Wit (Promptdent rep)', 'Hand files', 72, 70, 'Pass']];
    var r0 = Math.max(4, pt.getLastRow() + 1), lastNo = 0;
    if(pt.getLastRow() >= 4) pt.getRange(4, 2, pt.getLastRow() - 3, 1).getValues().forEach(function(v){ var n = parseInt(v[0], 10); if(n > lastNo) lastNo = n; });
    pt.getRange(r0, 2, tests.length, 10).setValues(tests.map(function(t, i){ return [lastNo + i + 1, date_(t[0]), 'Man', t[1], t[2], t[3], t[4], t[5], t[6], THS.TAG]; }));
    tests.forEach(function(t, i){ out.added.push({ sheet: PT_SHEET, row: r0 + i, pic: 'Man', date: t[0], what: t[2] + ' · ' + t[3] + ' · ' + t[6] }); });
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_();
  /* ALL TASK: mirrored by the 10-minute trigger (cronTh) */
  /* KPI tab after the formulas recalculate */
  SpreadsheetApp.flush(); Utilities.sleep(3000);
  out.kpi = thdSampleKpi_();
  try{ out.kpiPush = k68PushQuick_(); }catch(e){ out.kpiPushError = e.message; }
  props_().setProperty(THS.PROP, JSON.stringify(out).slice(0, 8500));
  log_('Dao', 'sample', 'kpi', 'Sample data added', out.added.length + ' rows', '');
  return out;
}
/* KPI values of the codes fed by the sample (TARGET & KPI, months 09 · 10) */
function thdSampleKpi_(){
  var s = ss_().getSheetByName(CFG.SH_KPI); if(!s) return [];
  var R = k68Read_(s); if(!R) return [];
  var mi = { '202609': -1, '202610': -1 }; (R.months || []).forEach(function(m, i){ if(m in mi) mi[m] = i; });
  var out = [];
  R.pics.forEach(function(p){ p.rows.forEach(function(r){
    if(!/^(C4-01|C4-03|C2-01|C11-03)$/.test(r.code)) return;
    out.push({ pic: p.pic, code: r.code, sep: mi['202609'] >= 0 ? r.a[mi['202609']] : null, oct: mi['202610'] >= 0 ? r.a[mi['202610']] : null });
  }); });
  return out;
}

/* ── clear: removes every row tagged [SAMPLE] ── */
function thdSampleClear(){
  _SH = {}; _TAB = {};
  var n = { visits: 0, cases: 0, tests: 0 }, L = lock_();
  function del(sh, col, first, test){
    var last = sh.getLastRow(); if(last < first) return 0;
    var v = sh.getRange(first, col, last - first + 1, 1).getValues(), k = 0;
    for(var i = v.length - 1; i >= 0; i--) if(test(String(v[i][0] || ''))){ sh.deleteRow(first + i); k++; }
    return k;
  }
  try{
    var wk = sh_(CFG.SH_WK); n.visits = del(wk, 2 + TABS.weekly.f.indexOf('plan'), CFG.DATA, function(x){ return x.indexOf(THS.TAG) === 0; });
    var na = ss_().getSheetByName(NA_ENV.sheet); if(na) n.cases = del(na, NA_C0, NA_DR, function(x){ return /^NA-SAMPLE-/.test(x); });
    var pt = ss_().getSheetByName(PT_SHEET); if(pt) n.tests = del(pt, 11, 4, function(x){ return x.indexOf(THS.TAG) === 0; });
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  bump_(); _NA_SH = null;
  try{ vsSync_(false); }catch(e){}
  var out = { state: 'cleared', at: Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm'), removed: n };
  try{ out.kpiPush = k68PushQuick_(); }catch(e){}
  props_().setProperty(THS.PROP, JSON.stringify(out));
  return out;
}
