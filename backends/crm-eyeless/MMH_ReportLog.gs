/* ═══════════════════════════════════════════════════════════════════════════
 * MMH_ReportLog.gs — v1.0 (23/10/2026)
 * GIỐNG HỆT NHAU ở marketing / backoffice / management / crm-dental / crm-surgical / crm-eyeless / crm-thai / kpi
 * (sửa 1 nơi ⇒ chép sang nơi khác).
 *
 * NHẬT KÝ GỬI BÁO CÁO + HẠN NỘP theo lịch làm việc MMH (VN / Thái Lan)
 *  · Mỗi email báo cáo THẬT (không phải gửi thử / chế độ TEST) ⇒ 1 dòng ở sheet ẨN "_MMH_REPORT_LOG"
 *    của bảng tính backend này: loại (week · kpi · quarter), PIC, kỳ, hạn nộp, đúng hạn / muộn.
 *  · Hạn nộp:
 *      - Báo cáo tuần  = 23:59 NGÀY LÀM VIỆC CUỐI của tuần (T2 → T7, theo lịch MMH: thứ 7 đi làm / nghỉ, ngày lễ).
 *                        Tuần không có ngày làm việc (vd. nghỉ Tết) ⇒ không tính.
 *      - KPI tháng     = 16:00 ngày 02 tháng sau.
 *      - Tự đánh giá quý = 17:00 ngày 09 tháng đầu quý sau (quý FY: Q1 = T9–T11 ⇒ 09/12, Q2 ⇒ 09/03, Q3 ⇒ 09/06, Q4 ⇒ 09/09).
 *  · Thống kê (app ▸ Xuất thống kê) lấy LẦN GỬI GẦN NHẤT của mỗi PIC · loại · kỳ để xét đúng hạn / muộn.
 *  · Đọc: action rpLog (tk = phiên email; Admin / Director / HOD hoặc quyền "rps" trong RH_Users ▸ Perms).
 *  · Lịch làm việc: RPL_CAL — năm mới ⇒ thêm năm (thứ 7 đi làm + ngày nghỉ lễ trong tuần). Năm chưa khai báo ⇒ T7 nghỉ, không có lễ.
 *  Không dùng dịch vụ Google mới (chỉ SpreadsheetApp / CacheService / PropertiesService) ⇒ không phải cấp quyền lại.
 * ═══════════════════════════════════════════════════════════════════════ */
var RPL = {
  VER: '1.0',
  SHEET: '_MMH_REPORT_LOG',
  TZ: 'Asia/Ho_Chi_Minh',                 /* VN và Thái Lan cùng GMT+7 */
  MASTER_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',   /* Training Master (RH_Users ▸ Perms) */
  HEAD: ['Thời điểm gửi', 'Loại', 'PIC', 'Kỳ', 'Từ', 'Đến', 'Hạn nộp', 'Kết quả', 'Trễ (giờ)', 'Người gửi', 'Cách gửi', 'Lịch', 'Nguồn', 'Ghi chú'],
  WEEK_CUT: '23:59', KPI_DAY: 2, KPI_CUT: '16:00', Q_DAY: 9, Q_CUT: '17:00',
  MAX_ROWS: 6000
};
/* Lịch làm việc MMH 2026 (file "2026 MMH VIETNAM / THAILAND Calendar"): sat = thứ 7 ĐI LÀM · off = ngày nghỉ (lễ, nghỉ bù) rơi vào T2–T6 */
var RPL_CAL = {
  VN: { 2026: {
    sat: ['01-03','01-17','01-31','02-07','03-07','03-21','04-18','04-25','05-09','05-16','06-06','06-20','07-04','07-18',
          '08-01','08-15','08-29','09-19','10-03','10-17','10-31','11-21','12-05','12-19'],
    off: ['01-01','02-16','02-17','02-18','02-19','02-20','04-27','04-30','05-01','09-02','09-03','09-04'] } },
  TH: { 2026: {
    sat: ['01-03','01-17','01-31','02-07','03-07','03-21','04-18','04-25','05-16','06-06','06-20','07-04','07-18',
          '08-01','08-15','08-29','09-19','10-03','10-17','10-31','11-21','12-05','12-19'],
    off: ['01-01','01-02','03-03','04-06','04-13','04-14','04-15','05-01','05-04','06-01','06-03','07-28','07-29','08-12',
          '10-13','10-23','12-07','12-10','12-31'] } }
};

function rplS_(v){ return v == null ? '' : String(v).trim(); }
function rplIso_(d){ return Utilities.formatDate(d, RPL.TZ, 'yyyy-MM-dd'); }
function rplD_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(rplS_(iso)); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
function rplAdd0_(iso, n){ var d = rplD_(iso); d.setDate(d.getDate() + n); return Utilities.formatDate(d, Session.getScriptTimeZone() || RPL.TZ, 'yyyy-MM-dd'); }
function rplMon_(iso){ var d = rplD_(iso); if (!d) return ''; var w = d.getDay(); return rplAdd0_(iso, w === 0 ? -6 : 1 - w); }
/* ngày làm việc? (T2–T6 trừ ngày nghỉ · T7 chỉ khi có trong danh sách đi làm · CN nghỉ) */
function rplWork_(iso, cal){
  var y = RPL_CAL[cal === 'TH' ? 'TH' : 'VN'][iso.slice(0, 4)], md = iso.slice(5, 10), w = rplD_(iso).getDay();
  if (w === 0) return false;
  if (w === 6) return !!(y && y.sat.indexOf(md) >= 0);
  return !(y && y.off.indexOf(md) >= 0);
}
/* ngày làm việc cuối của tuần (T2 = mon) — '' nếu cả tuần nghỉ */
function rplWeekEnd_(mon, cal){
  for (var i = 5; i >= 0; i--){ var d = rplAdd0_(mon, i); if (rplWork_(d, cal)) return d; }
  return '';
}
/* hạn nộp 'yyyy-MM-dd HH:mm' theo loại + kỳ */
function rplDue_(type, period, cal){
  period = rplS_(period);
  if (type === 'week'){ var e = rplWeekEnd_(rplMon_(period), cal); return e ? e + ' ' + RPL.WEEK_CUT : ''; }
  if (type === 'kpi'){
    var y = +period.slice(0, 4), m = +period.slice(4, 6); if (!y || !m) return '';
    m++; if (m > 12){ m = 1; y++; }
    return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + RPL.KPI_DAY).slice(-2) + ' ' + RPL.KPI_CUT;
  }
  if (type === 'quarter'){
    var q = /^FY(\d+)-Q([1-4])$/.exec(period); if (!q) return '';
    var start = 1958 + +q[1], mons = [[start, 12], [start + 1, 3], [start + 1, 6], [start + 1, 9]][+q[2] - 1];   /* FY68 bắt đầu 09/2026 */
    return mons[0] + '-' + ('0' + mons[1]).slice(-2) + '-' + ('0' + RPL.Q_DAY).slice(-2) + ' ' + RPL.Q_CUT;
  }
  return '';
}
function rplBook_(){
  try{ if (typeof ss === 'function') return ss(); }catch(e){}
  try{ if (typeof ss_ === 'function') return ss_(); }catch(e){}
  var b = null; try{ b = SpreadsheetApp.getActive(); }catch(e){}
  if (!b && typeof RKV !== 'undefined') b = SpreadsheetApp.openById('1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0');   /* kpi: file MMH KPI FY68 */
  return b;
}
function rplSrc_(){
  try{ if (typeof RKV !== 'undefined') return 'kpi'; }catch(e){}
  try{ if (typeof CFG !== 'undefined' && CFG && CFG.TEAM) return 'crm-thai'; }catch(e){}
  try{ if (typeof TEAM === 'function') return 'crm-' + String(TEAM()).toLowerCase(); }catch(e){}
  try{ if (typeof SOURCE !== 'undefined') return String(SOURCE); }catch(e){}
  return '';
}
function rplSheet_(make){
  var b = rplBook_(); if (!b) return null;
  var sh = b.getSheetByName(RPL.SHEET);
  if (!sh && make){
    sh = b.insertSheet(RPL.SHEET);
    sh.getRange(1, 1, 1, RPL.HEAD.length).setValues([RPL.HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    try{ sh.hideSheet(); }catch(e){}
    try{ PropertiesService.getScriptProperties().setProperty('RPL_SINCE', Utilities.formatDate(new Date(), RPL.TZ, 'yyyy-MM-dd HH:mm')); }catch(e){}
  }
  return sh;
}
/* ghi 1 lần gửi. type: 'week' (period = ngày bắt đầu tuần) · 'kpi' (yyyyMM) · 'quarter' ('FY68-Q1')
   o = { to, by, opt, cal:'VN'|'TH', note, at:Date } — bỏ qua lượt TEST / hộp cát */
function rplAdd_(type, pic, period, o){
  try{
    if (typeof tmAny_ === 'function' && tmAny_()) return;
    o = o || {}; pic = rplS_(pic); period = rplS_(period);
    if (!pic || !period || /^TEST(\b|_)/.test(pic)) return;
    var cal = o.cal === 'TH' ? 'TH' : 'VN';
    if (type === 'week') period = rplMon_(period);
    var due = rplDue_(type, period, cal), at = Utilities.formatDate(o.at || new Date(), RPL.TZ, 'yyyy-MM-dd HH:mm');
    var late = due && at > due, hrs = '';
    if (late){ var a = new Date(at.replace(' ', 'T') + ':00+07:00'), d = new Date(due.replace(' ', 'T') + ':00+07:00'); hrs = Math.round((a - d) / 360000) / 10; }
    var from = period, to = rplS_(o.to);
    if (type === 'week'){ to = to || rplAdd0_(period, 6); }
    var sh = rplSheet_(true); if (!sh) return;
    sh.appendRow([at, type, pic, period, from, to, due, !due ? 'Không tính' : late ? 'Muộn' : 'Đúng hạn', hrs, rplS_(o.by), rplS_(o.opt), cal, rplSrc_(), rplS_(o.note).slice(0, 300)]);
  }catch(e){ try{ console.warn('[rplAdd_] ' + e); }catch(_){} }
}
/* quyền xem thống kê: Admin / Director / HOD, hoặc Perms {"rps":{"v":1}} (Admin tắt được bằng {"rps":{"v":0}}) */
function rplCan_(tk){
  if (typeof tmWho_ !== 'function') return { err:'Backend thiếu MMH_TestMode.gs.' };
  var me = tmWho_(tk); if (me.err) return { err:'Xuất thống kê: ' + me.err };
  var ov = null;
  try{
    var us = SpreadsheetApp.openById(RPL.MASTER_ID).getSheetByName('RH_Users');
    var V = us.getRange(1, 1, us.getLastRow(), us.getLastColumn()).getValues(), pc = V[0].map(rplS_).indexOf('Perms');
    if (pc >= 0) for (var i = 1; i < V.length; i++) if (rplS_(V[i][0]).toLowerCase().split('@')[0] === me.local){
      var pm = {}; try{ pm = JSON.parse(rplS_(V[i][pc]) || '{}'); }catch(e){}
      if (pm.rps && (pm.rps.v === 0 || pm.rps.v === 1)) ov = pm.rps.v === 1;
    }
  }catch(e){}
  var def = !!(me.admin || me.level === 'director' || me.level === 'hod');
  if (!(ov === null ? def : ov)) return { err:'Chỉ Admin, Director, HOD hoặc người được cấp quyền "Xuất thống kê báo cáo" xem được.', code:'FORBIDDEN' };
  return { me:me };
}
/* KPI: lấy thêm lịch sử cũ từ sheet log email KPI của KPI Sync Center (trước khi có _MMH_REPORT_LOG) */
function rplOldKpi_(since){
  var out = [];
  try{
    if (typeof KSC_MAIL === 'undefined' || !KSC_MAIL.LOG) return out;
    var lg = rplBook_().getSheetByName(KSC_MAIL.LOG); if (!lg || lg.getLastRow() < 2) return out;
    var V = lg.getRange(2, 1, lg.getLastRow() - 1, 8).getValues();
    V.forEach(function(r){
      var t = r[0], at = '';
      if (t instanceof Date) at = Utilities.formatDate(t, RPL.TZ, 'yyyy-MM-dd HH:mm');
      else { var m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/.exec(rplS_(t)); if (m) at = m[3] + '-' + m[2] + '-' + m[1] + ' ' + m[4] + ':' + m[5]; }
      var pic = rplS_(r[2]), mon = rplS_(r[3]).replace(/\D/g, '').slice(0, 6);
      if (!at || !pic || mon.length !== 6 || /^\[TEST\]/i.test(rplS_(r[7])) || (since && at >= since)) return;
      var due = rplDue_('kpi', mon, 'VN');
      out.push([at, 'kpi', pic, mon, mon, mon, due, at > due ? 'Muộn' : 'Đúng hạn', '', rplS_(r[1]), 'email', '', 'kpi (log cũ)', 'KSC Mail Log']);
    });
  }catch(e){}
  return out;
}
/* action rpLog: { ok, rows:[[…HEAD]], head, since, src, cal } — p.from = 'yyyy-MM-dd' (lọc theo thời điểm gửi) */
function rplApi_(p){
  p = p || {};
  var c = rplCan_(p.tk); if (c.err) return { ok:false, code:c.code || 'AUTH', error:c.err };
  var sh = rplSheet_(false), rows = [], from = rplS_(p.from);
  if (sh && sh.getLastRow() > 1){
    var st = Math.max(2, sh.getLastRow() - RPL.MAX_ROWS + 1);
    rows = sh.getRange(st, 1, sh.getLastRow() - st + 1, RPL.HEAD.length).getDisplayValues();
  }
  var since = ''; try{ since = rplS_(PropertiesService.getScriptProperties().getProperty('RPL_SINCE')); }catch(e){}
  if (rplSrc_() === 'kpi') rows = rplOldKpi_(since).concat(rows);
  if (from) rows = rows.filter(function(r){ return String(r[0]).slice(0, 10) >= from; });
  return { ok:true, v:RPL.VER, src:rplSrc_(), since:since, head:RPL.HEAD, rows:rows, cal:RPL_CAL,
           rule:{ week:RPL.WEEK_CUT, kpiDay:RPL.KPI_DAY, kpi:RPL.KPI_CUT, qDay:RPL.Q_DAY, q:RPL.Q_CUT } };
}
