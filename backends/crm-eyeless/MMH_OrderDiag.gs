/* ⭐ 05/11/2026 — CHẨN ĐOÁN + SỬA DỮ LIỆU ĐƠN HÀNG. GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless.
   ?action=ordDiag&key=<8 ký tự cuối Script ID>&no=521,561[&acc=<chữ trong tên account>]   (chỉ đọc)
   ⇒ mọi dòng tab 3. SALE ORDER có Order No. khớp (hoặc account chứa chữ đã cho): dòng sheet, số, ngày, tháng, PIC, account (rút gọn),
     loại, SL, giá, tiền, duyệt + nhóm theo ordKey_ + nhật ký lưu đơn (ORDER LOG) + nhật ký thao tác (Action log) liên quan.
   ?action=ordDiag&key=…&op=renumber&rows=1734,1735&no=561   (GHI) — tách các dòng đã cho (cùng Order No. = no, cùng account) sang 1 Order No. mới.
     Dùng khi 2 đơn khác nhau bị app cũ cấp trùng số (v10.25 đã chặn cho đơn mới). Ghi nhật ký thao tác "renumber".
   ?action=ordDiag&key=…&op=heal   (GHI) — chạy ngay ordNoHeal_ (điền số cho dòng không số + điền ngày đặt cho dòng có số mà trống ngày). */
/* chữ ký 1 dòng sản phẩm: loại + SL + đơn giá (app gửi _sg lúc mở form ⇒ máy chủ chỉ sửa / bỏ đúng dòng đó) */
function ordSig_(ptype, qty, price){ return S(ptype).trim().toLowerCase() + '|' + num(qty) + '|' + num(price); }
function ordDiag_(p){
  var key = S(p.key); if (!key || key !== ScriptApp.getScriptId().slice(-8)) return { ok:false, error:'key?' };
  if (S(p.op) === 'renumber') return ordRenumber_(p);
  if (S(p.op) === 'heal') return { ok:true, healed:ordNoHeal_(true) };   /* chạy ngay bước gộp đơn bị tách / điền ngày đặt còn trống */
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
      act.push([(r[0] instanceof Date ? Utilities.formatDate(r[0], Session.getScriptTimeZone(), 'MM-dd HH:mm') : S(r[0]).slice(5, 16)), S(r[1]), S(r[2]), S(r[4]).slice(0, 24), S(r[5]).slice(0, 70), S(r[6])].join(' ¦ '));
    });
  } catch(e){ act.push('err ' + e); }
  return { ok:true, team:TEAM(), n:out.length, keys:keys, rows:out.slice(0, 40), log:log.slice(-25), act:act.slice(-25) };
}
function ordRenumber_(p){
  var rows = S(p.rows).split(/[,\s]+/).map(function(x){ return parseInt(x, 10); }).filter(function(x){ return x > 0; });
  var want = S(p.no); if (!rows.length || !want) return { ok:false, error:'rows? no?' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'busy' }; }
  try {
    var s = sh('order'), m = COL.order, nm = null, got = [];
    for (var i = 0; i < rows.length; i++){
      var v = s.getRange(rows[i], 1, 1, Math.max(m.orderNo, m.name)).getValues()[0], no = S(v[m.orderNo - 1]);
      if (!(new RegExp('(^|\\D)' + want.replace(/\D/g, '') + '$')).test(no)) return { ok:false, error:'Dòng ' + rows[i] + ' có số "' + no + '" — không phải ' + want };
      var k = normName_(v[m.name - 1]); if (nm === null) nm = k; else if (k !== nm) return { ok:false, error:'Dòng ' + rows[i] + ' khác account' };
      got.push(no);
    }
    var nn = ordNextNo_();
    rows.forEach(function(r){ s.getRange(r, m.orderNo).setValue(nn); });
    SpreadsheetApp.flush(); bumpVersion(bumpTabsFor_('order')); _RAW = {}; _ORDSUPP = null;
    try { logAct({ pic:'system' }, 'renumber', 'order', got[0] + ' → ' + nn, 'tách ' + rows.length + ' dòng (trùng số với đơn khác)', rows[0]); flushLog_(); } catch(e){}
    return { ok:true, from:got[0], to:nn, rows:rows };
  } finally { lock.releaseLock(); }
}
