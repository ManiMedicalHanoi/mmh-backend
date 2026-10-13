/*************************************************************************************************
 * MMH_DateFix.gs  (v1.0 · 13/10/2026) — FILE GIỐNG HỆT NHAU ở marketing / backoffice / management
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * CHUẨN HOÁ NGÀY Ở TAB WEEKLY NEW (người dùng yêu cầu 13/10: kiểm định dạng ngày mọi backend)
 *   Kiểm 13/10: Back Office có 138 Start date + 73 Revised Deadline mang giờ 10:00 ⇒ công thức đếm "≤ ngày cuối kỳ" bỏ sót;
 *   vài ô ngày dạng chữ. Cột J Start date · K Planned Deadline · L Revised Deadline (bỏ qua ô công thức):
 *   ngày có giờ ⇒ 00:00 cùng ngày đang hiện; chữ "dd/mm/yyyy" / "yyyy-mm-dd" ⇒ ngày thật; định dạng dd/MM/yyyy.
 *   Không đổi số dòng, chỉ ghi các đoạn ô đổi. Chạy ở ping / boot, tối đa 1 lần / 20 giờ (không cần trigger ⇒ không thêm quyền).
 *   Chạy tay: rhDateFixNow(); kết quả ở Script Property RH_DATEFIX_LOG.
 *************************************************************************************************/
function rhDfIso_(v, tz){
  if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  if (typeof v !== 'string') return '';
  var s = v.trim(), m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s), y, mo, d;
  if (m){ y = +m[1]; mo = +m[2]; d = +m[3]; }
  else { m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (!m) return ''; y = +m[3]; mo = +m[2]; d = +m[1]; }
  if (y < 1990 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  var t = new Date(y, mo - 1, d); if (t.getMonth() !== mo - 1) return '';
  return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
}
function rhDateFix_(force){
  try {
    if (!force && typeof throttleOk === 'function' && !throttleOk('rh_datefix', 20 * 3600)) return { ok:true, skipped:true };
    var s = shWeekly(); if (!s) return { ok:false, error:'no weekly' };
    var lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return { ok:false, error:'busy' };
    var cnt = { time:0, text:0 };
    try {
      var tz = s.getParent().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
      var dr = (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 7, last = s.getLastRow();
      if (last < dr) return { ok:true, time:0, text:0 };
      var n = last - dr + 1;
      [10, 11, 12].forEach(function(c){
        var rg = s.getRange(dr, c, n, 1), V = rg.getValues(), F = rg.getFormulas(), out = [], ch = {};
        for (var i = 0; i < n; i++){
          var v = V[i][0]; out.push([v]);
          if (F[i][0] || v === '' || v === null) continue;
          var iso = rhDfIso_(v, tz); if (!iso) continue;
          var why = !(v instanceof Date) ? 'text' : (Utilities.formatDate(v, tz, 'HH:mm:ss') !== '00:00:00' ? 'time' : '');
          if (!why) continue;
          out[i] = [Utilities.parseDate(iso, tz, 'yyyy-MM-dd')]; ch[i] = 1; cnt[why]++;
        }
        for (var j = 0; j < n; j++){
          if (!ch[j]) continue;
          var k = j; while (k + 1 < n && ch[k + 1]) k++;
          s.getRange(dr + j, c, k - j + 1, 1).setValues(out.slice(j, k + 1));
          j = k;
        }
        try { rg.setNumberFormat('dd/MM/yyyy'); } catch(e){}
      });
      if (cnt.time + cnt.text){ SpreadsheetApp.flush(); try { touchVersion(); } catch(e){} }
    } finally { try { lock.releaseLock(); } catch(e){} }
    var msg = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · bỏ giờ ' + cnt.time + ' · chữ→ngày ' + cnt.text;
    try { PropertiesService.getScriptProperties().setProperty('RH_DATEFIX_LOG', msg); } catch(e){}
    return { ok:true, time:cnt.time, text:cnt.text, log:msg };
  } catch(err){ return { ok:false, error:String(err && err.message || err) }; }
}
function rhDateFixNow(){ var r = rhDateFix_(true); Logger.log(JSON.stringify(r)); return r; }
