/*************************************************************************************************
 * MMH_MonthlyKeys.gs  (v1.0 · 13/10/2026) — FILE GIỐNG HỆT NHAU ở marketing / backoffice / management
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * KEY TASK CHUNG HẰNG THÁNG — tránh mỗi người tự tạo "Internal Meeting", "Họp tháng", "Họp team…"
 *   Mỗi tháng tự có sẵn:  "Internal Meeting MMYYYY · <Nhóm>"  (mỗi nhóm 1 key)
 *                         "Internal Meeting MMYYYY · MMH (toàn công ty)"
 *   PIC thêm cuộc họp của mình thành SUB-TASK dưới key đó (app Report Hub tự gợi ý khi tạo key trùng).
 *   Key là key thường (không khoá) — PIC key = trưởng nhóm. Tự tạo cho tháng hiện tại; từ ngày 25 tạo thêm tháng sau.
 *************************************************************************************************/
var MK_PREFIX = 'Internal Meeting ';
var MK_COMPANY = { label:'MMH (toàn công ty)', pic:'Nguyen Ha' };
var MK_TEAMS = {
  marketing:  [ { label:'Sales & Marketing VN', pic:'Tuyen' }, { label:'Marketing Team', pic:'Thuong' }, { label:'Product Team', pic:'Giang' } ],
  backoffice: [ { label:'Back Office', pic:'Hoa' } ],
  management: []
};
function mkYm_(d){ return ('0' + (d.getMonth() + 1)).slice(-2) + d.getFullYear(); }    // MMYYYY
function mkIso_(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function mkType_(){
  var list = [];
  try { list = readTypeOptions() || []; } catch(e){}
  var pick = list.filter(function(t){ return /meeting|họp|hop|internal/i.test(String(t)); })[0] ||
             list.filter(function(t){ return /management|admin/i.test(String(t)); })[0] || '';
  return pick;
}
/* Tên chuẩn của key họp chung (để app / backend nhận ra) */
function mkName_(d, label){ return MK_PREFIX + mkYm_(d) + ' · ' + label; }
function mkEnsureMonthly_(force){
  try {
    if (!force && typeof throttleOk === 'function' && !throttleOk('mk_month', 3600)) return { ok:true, skipped:true };
    var src = (typeof SOURCE !== 'undefined') ? SOURCE : '';
    var teams = (MK_TEAMS[src] || []).concat([MK_COMPANY]);
    var now = new Date(), months = [new Date(now.getFullYear(), now.getMonth(), 1)];
    if (now.getDate() >= 25) months.push(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    var sh = shWeekly(); if (!sh) return { ok:false };
    var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = sh.getLastRow(), have = {};
    if (last >= dr) sh.getRange(dr, 6, last - dr + 1, 1).getValues().forEach(function(r){ var f = String(r[0] || '').trim(); if (f) have[f.toLowerCase()] = 1; });
    var todo = [];
    months.forEach(function(m){ teams.forEach(function(t){ var nm = mkName_(m, t.label); if (!have[nm.toLowerCase()]) todo.push({ m:m, t:t, name:nm }); }); });
    if (!todo.length) return { ok:true, created:0 };
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return { ok:false, error:'busy' };
    var made = 0;
    try {
      var type = mkType_();
      todo.forEach(function(x){
        var end = new Date(x.m.getFullYear(), x.m.getMonth() + 1, 0);
        var r = addKeyTask({ pic:x.t.pic, role:'manager' }, {
          keyTask:x.name, type:type, pic:x.t.pic, start:mkIso_(x.m), planned:mkIso_(end), status:'To Do',
          result:'Key task chung của tháng — mỗi người thêm cuộc họp của mình thành sub-task dưới key này (không tạo key họp riêng).'
        });
        if (r && r.ok) made++;
      });
    } finally { try { lock.releaseLock(); } catch(e){} }
    if (made){ try { touchVersion(); } catch(e){} }
    return { ok:true, created:made };
  } catch(err){ return { ok:false, error:String(err && err.message || err) }; }
}
function mkEnsureNow(){ var r = mkEnsureMonthly_(true); Logger.log(JSON.stringify(r)); return r; }
