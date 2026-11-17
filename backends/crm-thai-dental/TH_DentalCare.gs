/*************************************************************************************************
 * TH_DentalCare.gs — 17/11/2026 · review of the Thailand Dental CRM after Yong's messages (14–16/11/2026)
 *
 *  ① Saving a customer task was slow: every saveWeekly / deleteRow (weekly) mirrored ALL customer tasks into OTHERS TASK
 *     inside the same request (vsSync_ reads both sheets). Now the mirror runs in the background: one trigger ~30 s after
 *     the last save (thdLater_ ⇒ thdLaterRun). cronTh (every 10 min) still runs it too. No trigger possible ⇒ old way (inline).
 *  ② Diagnostics (read only, no e-mail): action thdCare&key=<last 8 chars of the Sheet ID>
 *       &op=mail   — last weekly / monthly report e-mails (sheet _MMH_REPORT_LOG + _LOG "report" rows) + who receives them now
 *       &op=drive  — can the backend open / write the evidence folder of NEW ACCOUNT & SKU (screenshots)?
 *       &op=speed  — how long reading CUSTOMER TASK / a dry OTHERS TASK sync takes
 *************************************************************************************************/
var THC = { DELAY: 30 * 1000, FLAG: 'thdLater' };

function thdLater_(){
  try{
    var c = CacheService.getScriptCache();
    if(c.get(THC.FLAG)) return true;                       /* a run is already waiting */
    c.put(THC.FLAG, '1', 120);
    ScriptApp.newTrigger('thdLaterRun').timeBased().after(THC.DELAY).create();
    return true;
  }catch(e){ return false; }
}
function thdLaterRun(){
  try{ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thdLaterRun') ScriptApp.deleteTrigger(t); }); }catch(e){}
  try{ CacheService.getScriptCache().remove(THC.FLAG); }catch(e){}
  try{ var r = vsSync_(false, 60000); if(r && !r.busy) atHealFormulas_(); }catch(e){}
}
/* saveWeekly / deleteRow: background mirror, inline only when no trigger can be created */
function thdSyncSoon_(){
  if(thdLater_()) return { later: true };
  return vsSync_(false);
}

function thdCareApi_(p){
  var key = str_(p.key), id = ss_().getId();
  if(!key || key !== id.slice(-8)) return { ok: false, error: 'key?' };
  var op = str_(p.op) || 'mail', out = { ok: true, op: op };
  if(op === 'mail'){
    out.rule = {}; TEAM_PICS.forEach(function(pc){ out.rule[pc] = mailRule_(pc); });
    var sh = ss_().getSheetByName(RPL.SHEET);
    if(sh && sh.getLastRow() > 1){
      var n = Math.min(60, sh.getLastRow() - 1);
      out.reportLog = sh.getRange(sh.getLastRow() - n + 1, 1, n, RPL.HEAD.length).getDisplayValues().reverse();
    } else out.reportLog = [];
    out.appLog = activity_(600).filter(function(a){ return a.action === 'report' || /report/i.test(a.tab || ''); }).slice(0, 40);
    try{ out.mailLeft = MailApp.getRemainingDailyQuota(); }catch(e){ out.mailLeft = String(e); }
    return out;
  }
  if(op === 'drive'){
    try{
      var fid = NA_ENV.folderId(), f = DriveApp.getFolderById(fid);
      out.folder = { id: fid, name: f.getName() };
      if(str_(p.write) === '1'){
        var t = f.createFile(Utilities.newBlob('test', 'text/plain', 'thdCare-test.txt')); t.setTrashed(true); out.write = 'ok';
      }
    }catch(e){ out.ok = false; out.error = String(e && e.message || e); }
    return out;
  }
  if(op === 'speed'){
    var t0 = Date.now(); _TAB = {}; var n = weeklyRows_().length; out.readWeekly = { rows: n, ms: Date.now() - t0 };
    t0 = Date.now(); try{ out.syncDry = vsSync_(true, 3000); }catch(e){ out.syncDry = String(e); } out.syncDryMs = Date.now() - t0;
    return out;
  }
  if(op === 'sheet'){   /* 17/11/2026 — read-only: header + first / last rows of one sheet (e.g. SALE ORDERS) */
    var sh = ss_().getSheetByName(str_(p.name));
    if(!sh) return { ok: false, error: 'no sheet', sheets: ss_().getSheets().map(function(x){ return x.getName(); }) };
    var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 40), hr = Math.min(lr, parseInt(p.head, 10) || 8);
    out.name = sh.getName(); out.rows = lr; out.cols = sh.getLastColumn(); out.hidden = sh.isSheetHidden();
    out.top = lr ? sh.getRange(1, 1, hr, lc).getDisplayValues() : [];
    out.last = lr > hr ? sh.getRange(Math.max(hr + 1, lr - 4), 1, Math.min(5, lr - hr), lc).getDisplayValues() : [];
    try{ out.formulas = sh.getRange(Math.min(lr, hr + 1) || 1, 1, 1, lc).getFormulas()[0]; }catch(e){}
    return out;
  }
  return { ok: false, error: 'op?' };
}

/* 17/11/2026 — thdCare op=drive báo "Access denied: DriveApp." ⇒ tài khoản chủ script chưa cấp quyền Google Drive
   (tải chứng từ / ảnh chụp màn hình NEW ACCOUNT & SKU báo lỗi). Chủ script: mở trình soạn ▸ chọn hàm thdCapQuyen ▸ Chạy ▸ tick ĐỦ mọi ô quyền (cả Google Drive) ▸ Cho phép. */
function thdCapQuyen(){
  var id = thdNaFolder_(), f = DriveApp.getFolderById(id);
  var t = f.createFile(Utilities.newBlob('ok', 'text/plain', 'quyen-drive-ok.txt')); t.setTrashed(true);
  Logger.log('Drive OK — thư mục chứng từ: ' + f.getName() + ' (' + id + ')');
  return f.getName();
}
