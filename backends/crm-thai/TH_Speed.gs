/*************************************************************************************************
 * TH_Speed.gs — 23/11/2026 · Thailand Surgical CRM: lưu task nhanh hơn (người dùng: "cải tiến tốc độ cho mọi team")
 *
 *  ① Trước đây MỖI lần lưu / xoá task (saveWeekly, deleteRow tab weekly) chép lại TOÀN BỘ 6. CUSTOMER VISITING sang ALL TASK
 *     ngay trong lượt lưu (đọc 2 sheet, ghi nhiều khối) ⇒ mỗi lần lưu chờ thêm vài giây. Nay giống Dental Thái (TH_DentalCare.gs):
 *     hẹn 1 trigger ~30 giây sau lần lưu cuối (thsLaterRun); cronTh 10 phút / lần vẫn chạy. Không tạo được trigger ⇒ chạy ngay như cũ.
 *  ② vsSync_ chạy dưới DocumentLock: 2 lượt chép (trigger nền + onEdit + cronTh) không chạy chồng ⇒ không nhân đôi dòng ALL TASK
 *     (lỗi đã gặp ở Dental Thái 30/10/2026). Lệnh ghi của app dùng ScriptLock ⇒ không phải chờ.
 *************************************************************************************************/
var THS = { DELAY: 30 * 1000, FLAG: 'thsLater' };
function vsSync_(dry, wait){
  var L = LockService.getDocumentLock();
  if(!L || !L.tryLock(wait || 3000)) return { changed: 0, added: 0, removed: 0, busy: true };
  try{ return vsSyncRaw_(dry); } finally { L.releaseLock(); }
}
function thsLater_(){
  try{
    var c = CacheService.getScriptCache();
    if(c.get(THS.FLAG)) return true;
    c.put(THS.FLAG, '1', 120);
    ScriptApp.newTrigger('thsLaterRun').timeBased().after(THS.DELAY).create();
    return true;
  }catch(e){ return false; }
}
function thsLaterRun(){
  try{ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction() === 'thsLaterRun') ScriptApp.deleteTrigger(t); }); }catch(e){}
  try{ CacheService.getScriptCache().remove(THS.FLAG); }catch(e){}
  try{ vsSync_(false, 60000); }catch(e){}
}
function thsSyncSoon_(){
  if(thsLater_()) return { later: true };
  return vsSync_(false);
}
