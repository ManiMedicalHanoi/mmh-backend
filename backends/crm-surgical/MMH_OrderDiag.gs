/* ⭐ 05/11/2026 — CHẨN ĐOÁN ĐƠN HÀNG (chỉ đọc). GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless.
   ?action=ordDiag&key=<8 ký tự cuối Script ID>&no=521,561[&acc=<chữ trong tên account>]
   ⇒ mọi dòng tab 3. SALE ORDER có Order No. khớp (hoặc account chứa chữ đã cho): dòng sheet, số, ngày, tháng, PIC, account (rút gọn),
     loại, SL, giá, tiền, duyệt + nhóm theo ordKey_ + nhật ký lưu đơn (ORDER LOG) + nhật ký thao tác (Action log) liên quan. */
function ordDiag_(p){
  var key = S(p.key); if (!key || key !== ScriptApp.getScriptId().slice(-8)) return { ok:false, error:'key?' };
  try { flushLog_(); } catch(e){}
  var nos = S(p.no).split(/[,\s]+/).filter(String), acc = normName_(S(p.acc)), m = COL.order;
  var hitNo = function(v){ var t = /(\d+)\s*$/.exec(S(v)); return t && nos.indexOf(t[1]) >= 0; };
  var d10 = function(v){ return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : S(v).slice(0, 19); };
  _RAW = {};
  var rows = readTab('order'), out = [], keys = {};
  rows.forEach(function(o){
    if (!(hitNo(o.orderNo) || (acc && normName_(o.name).indexOf(acc) >= 0))) return;
    var k = ordKey_(o); keys[k] = (keys[k] || 0) + 1;
    out.push([o._row, S(o.orderNo), d10(o.day), S(o.month), S(o.pic), S(o.name).slice(0, 28), S(o.ptype).slice(0, 14), num(o.qty), num(o.price), num(o.amount),
              ordAppr_(o.appr), S(o.apprNote).slice(0, 30)].join(' ¦ '));
  });
  var log = [], act = [];
  try {
    var s = orderLogSheet_(), lr = s.getLastRow(), n = Math.min(500, lr - 1);
    if (n > 0) s.getRange(lr - n + 1, 1, n, 13).getValues().forEach(function(r){
      if (!(hitNo(r[2]) || (acc && normName_(r[4]).indexOf(acc) >= 0))) return;
      log.push([d10(r[0]) + ' ' + (r[0] instanceof Date ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'HH:mm') : ''), S(r[1]), S(r[2]), S(r[3]), S(r[5]).slice(0, 12), num(r[7]), num(r[9]), S(r[10]), S(r[12]).slice(-6)].join(' ¦ '));
    });
  } catch(e){ log.push('err ' + e); }
  try {
    var s2 = logSheet_(), lr2 = s2.getLastRow(), n2 = Math.min(1500, lr2 - 1);
    if (n2 > 0) s2.getRange(lr2 - n2 + 1, 1, n2, 7).getValues().forEach(function(r){
      if (S(r[3]) !== 'order') return;
      var t = S(r[4]) + ' ' + S(r[5]);
      if (!(nos.some(function(x){ return new RegExp('(^|\\D)' + x + '(\\D|$)').test(t); }) || (acc && normName_(t).indexOf(acc) >= 0))) return;
      act.push([S(r[0]).slice(5, 16), S(r[1]), S(r[2]), S(r[4]).slice(0, 24), S(r[5]).slice(0, 70), S(r[6])].join(' ¦ '));
    });
  } catch(e){ act.push('err ' + e); }
  return { ok:true, team:TEAM(), n:out.length, keys:keys, rows:out.slice(0, 40), log:log.slice(-25), act:act.slice(-25) };
}
