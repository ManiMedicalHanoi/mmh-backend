/*************************************************************************************************
 * MMH_MonthlyKeys.gs  (v2.0 · 13/10/2026) — FILE GIỐNG HỆT NHAU ở marketing / backoffice / management
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * KEY TASK HỌP CHUNG — tránh mỗi người tự tạo "Internal Meeting", "Họp tháng", "Họp team…"
 *   v2.0 (người dùng yêu cầu 13/10/2026) — CHỈ còn:
 *   ① Họp nội bộ hằng tháng của 3 nhóm (backend marketing = file Sales & Marketing):
 *        "Internal Meeting MMYYYY · Dental Sales" · "… · Surgical Sales" · "… · Marketing"
 *   ② "MMH Monthly Meeting FYxx" (backend management): 1 KEY TASK CHO CẢ KỲ (01/09 → 31/08),
 *        mỗi tháng 1 SUB-TASK đặt tên theo tháng: 202609, 202610, …
 *   Các key tự tạo kiểu cũ (Product Team, Back Office, Sales & Marketing VN, MMH (toàn công ty)) chưa có sub-task ⇒ tự xoá 1 lần;
 *   key cũ đã có sub-task ⇒ giữ nguyên (không mất dữ liệu).
 *   PIC thêm cuộc họp của mình thành SUB-TASK dưới key đó (app Report Hub tự gợi ý khi gõ tên key trùng).
 *   Tự tạo cho tháng hiện tại; từ ngày 25 tạo thêm tháng sau.
 *************************************************************************************************/
var MK_PREFIX = 'Internal Meeting ';
var MK_TEAMS = {
  marketing:  [ { label:'Dental Sales', pic:'Tuyen' }, { label:'Surgical Sales', pic:'Tuyen' }, { label:'Marketing', pic:'Thuong' } ],
  backoffice: [],
  management: []
};
var MK_FY = { management: { prefix:'MMH Monthly Meeting ', pic:'Nguyen Ha' } };
var MK_OLD_LABELS = ['Sales & Marketing VN', 'Marketing Team', 'Product Team', 'Back Office', 'MMH (toàn công ty)'];
function mkYm_(d){ return ('0' + (d.getMonth() + 1)).slice(-2) + d.getFullYear(); }    // MMYYYY
function mkYm6_(d){ return String(d.getFullYear()) + ('0' + (d.getMonth() + 1)).slice(-2); }   // yyyyMM (tên sub-task của MMH Monthly Meeting)
function mkIso_(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function mkFyOf_(d){ return 'FY' + ((d.getMonth() >= 8 ? d.getFullYear() + 1 : d.getFullYear()) - 1959); }        // 09/2026 → FY68
function mkType_(){
  var list = [];
  try { list = readTypeOptions() || []; } catch(e){}
  var pick = list.filter(function(t){ return /meeting|họp|hop|internal/i.test(String(t)); })[0] ||
             list.filter(function(t){ return /management|admin/i.test(String(t)); })[0] || '';
  return pick;
}
/* Tên chuẩn của key họp chung (để app / backend nhận ra) */
function mkName_(d, label){ return MK_PREFIX + mkYm_(d) + ' · ' + label; }
function mkKeys_(sh){
  var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = sh.getLastRow(), out = {};
  if (last < dr) return out;
  sh.getRange(dr, 2, last - dr + 1, 6).getValues().forEach(function(r, i){
    var f = String(r[4] || '').trim(), no = String(r[0] == null ? '' : r[0]).trim().replace(/\.0$/, '');
    if (f && no && no.indexOf('.') < 0) out[f.toLowerCase()] = { no:no, row:dr + i };
  });
  return out;
}
/* sub-task đang có dưới 1 key */
function mkSubs_(sh, no){
  var info = keyBlockInfo(sh, no), out = [];
  if (!info.keyRow || info.lastRow <= info.keyRow) return out;
  sh.getRange(info.keyRow + 1, 7, info.lastRow - info.keyRow, 1).getValues().forEach(function(r){ var g = String(r[0] || '').trim(); if (g) out.push(g); });
  return out;
}
/* 1 lần: xoá key tự tạo kiểu cũ còn trống (không sub-task) */
function mkCleanOld_(sh){
  var P = PropertiesService.getScriptProperties(); if (P.getProperty('MK_CLEAN_V2') === '1') return 0;
  var keys = mkKeys_(sh), rows = [];
  Object.keys(keys).forEach(function(k){
    var m = /^internal meeting \d{6} · (.+)$/.exec(k); if (!m) return;
    if (!MK_OLD_LABELS.some(function(l){ return l.toLowerCase() === m[1]; })) return;
    var info = keyBlockInfo(sh, keys[k].no);
    if (info.keyRow && info.lastRow === info.keyRow) rows.push(info.keyRow);
  });
  rows.sort(function(a, b){ return b - a; }).forEach(function(r){ sh.deleteRow(r); });
  P.setProperty('MK_CLEAN_V2', '1');
  return rows.length;
}
function mkEnsureMonthly_(force){
  try {
    if (!force && typeof throttleOk === 'function' && !throttleOk('mk_month', 3600)) return { ok:true, skipped:true };
    var src = (typeof SOURCE !== 'undefined') ? SOURCE : '';
    var teams = MK_TEAMS[src] || [], fyk = MK_FY[src] || null;
    var now = new Date(), months = [new Date(now.getFullYear(), now.getMonth(), 1)];
    if (now.getDate() >= 25) months.push(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    var sh = shWeekly(); if (!sh) return { ok:false };
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return { ok:false, error:'busy' };
    var made = 0, cleaned = 0;
    try {
      try { cleaned = mkCleanOld_(sh); } catch(eC){}
      var have = mkKeys_(sh), type = null, ty = function(){ if (type === null) type = mkType_(); return type; };
      /* ① họp nội bộ hằng tháng của từng nhóm */
      months.forEach(function(m){ teams.forEach(function(t){
        var nm = mkName_(m, t.label); if (have[nm.toLowerCase()]) return;
        var end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
        var r = addKeyTask({ pic:t.pic, role:'manager' }, {
          keyTask:nm, type:ty(), pic:t.pic, start:mkIso_(m), planned:mkIso_(end), status:'To Do',
          result:'Họp nội bộ tháng của nhóm ' + t.label + ' — thêm cuộc họp thành sub-task dưới key này (không tạo key họp riêng).'
        });
        if (r && r.ok){ made++; have[nm.toLowerCase()] = { no:String(r.no) }; }
      }); });
      /* ② MMH Monthly Meeting: 1 key cho cả kỳ, sub-task = tháng (yyyyMM) */
      if (fyk){
        months.forEach(function(m){
          var fy = mkFyOf_(m), nm = fyk.prefix + fy, k = have[nm.toLowerCase()];
          if (!k){
            var y0 = m.getMonth() >= 8 ? m.getFullYear() : m.getFullYear() - 1;
            var r = addKeyTask({ pic:fyk.pic, role:'manager' }, {
              keyTask:nm, type:ty(), pic:fyk.pic, start:mkIso_(new Date(y0, 8, 1)), planned:mkIso_(new Date(y0 + 1, 7, 31)), status:'In Progress',
              result:'Họp toàn công ty hằng tháng — mỗi tháng 1 sub-task (tên = tháng, vd. 202610).'
            });
            if (!(r && r.ok)) return;
            made++; k = have[nm.toLowerCase()] = { no:String(r.no) };
          }
          var sub = mkYm6_(m);
          if (mkSubs_(sh, k.no).indexOf(sub) >= 0) return;
          var end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
          var s = addSubTask({ pic:fyk.pic, role:'manager' }, { parentNo:k.no, parentKeyTask:nm, name:sub, pic:fyk.pic, start:mkIso_(m), planned:mkIso_(end), status:'To Do', result:'' });
          if (s && s.ok) made++;
        });
      }
    } finally { try { lock.releaseLock(); } catch(e){} }
    if (made || cleaned){ try { touchVersion(); } catch(e){} }
    return { ok:true, created:made, cleaned:cleaned };
  } catch(err){ return { ok:false, error:String(err && err.message || err) }; }
}
function mkEnsureNow(){ var r = mkEnsureMonthly_(true); Logger.log(JSON.stringify(r)); return r; }
