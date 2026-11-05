/* ⭐ 05/11/2026 — CHẨN ĐOÁN + SỬA DỮ LIỆU ĐƠN HÀNG. GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless.
   ?action=ordDiag&key=<8 ký tự cuối Script ID>&no=521,561[&acc=<chữ trong tên account>]   (chỉ đọc)
   ⇒ mọi dòng tab 3. SALE ORDER có Order No. khớp (hoặc account chứa chữ đã cho): dòng sheet, số, ngày, tháng, PIC, account (rút gọn),
     loại, SL, giá, tiền, duyệt + nhóm theo ordKey_ + nhật ký lưu đơn (ORDER LOG) + nhật ký thao tác (Action log) liên quan.
   ?action=ordDiag&key=…&op=renumber&rows=1734,1735&no=561   (GHI) — tách các dòng đã cho (cùng Order No. = no, cùng account) sang 1 Order No. mới.
     Dùng khi 2 đơn khác nhau bị app cũ cấp trùng số (v10.25 đã chặn cho đơn mới). Ghi nhật ký thao tác "renumber".
   ?action=ordDiag&key=…&op=audit[&from=202609]   (chỉ đọc) — rà mọi đơn: trùng số giữa các đơn khác nhau, dòng có số mà trống ngày,
     dòng giống hệt nhau trong cùng đơn (loại · SL · giá · Detail), dòng chưa có số.
   ?action=ordDiag&key=…&op=dellines&no=521&rows=1636,1637&sg=composite|1|200000   (GHI) — xoá đúng các dòng đã cho (khớp số + chữ ký dòng).
   ?action=ordDiag&key=…&op=dedupe[&from=202609][&run=1]   — mỗi Order No. chỉ còn 1 đơn: dòng trống ngày cùng số + PIC + tháng + account với đúng 1 ngày ⇒ điền ngày (gộp);
     các đơn còn lại trùng số (khác account / khác ngày / khác PIC) ⇒ đơn có dòng sheet nhỏ nhất giữ số, đơn khác nhận số mới. Không run=1 ⇒ chỉ in kế hoạch.
   ?action=ordDiag&key=…&op=heal   (GHI) — chạy ngay ordNoHeal_ (điền số cho dòng không số + điền ngày đặt cho dòng có số mà trống ngày). */
/* chữ ký 1 dòng sản phẩm: loại + SL + đơn giá (app gửi _sg lúc mở form ⇒ máy chủ chỉ sửa / bỏ đúng dòng đó) */
function ordSig_(ptype, qty, price){ return S(ptype).trim().toLowerCase() + '|' + num(qty) + '|' + num(price); }
function ordDiag_(p){
  var key = S(p.key); if (!key || key !== ScriptApp.getScriptId().slice(-8)) return { ok:false, error:'key?' };
  if (S(p.op) === 'renumber') return ordRenumber_(p);
  if (S(p.op) === 'heal') return { ok:true, healed:ordNoHeal_(true) };   /* chạy ngay bước gộp đơn bị tách / điền ngày đặt còn trống */
  if (S(p.op) === 'audit') return ordAudit_(p);
  if (S(p.op) === 'dellines') return ordDelLines_(p);
  if (S(p.op) === 'dedupe') return ordDedupe_(p);
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

function ordAudit_(p){
  var from = S(p.from).replace(/\D/g, '').slice(0, 6) || '202609';
  _RAW = {};
  var rows = readTab('order').filter(function(o){ return ordYm_(o) >= from && S(o.name); });
  var short = function(o){ return S(o.name).slice(0, 22); };
  var byNo = {}, grp = {}, noDay = [], noNo = [];
  rows.forEach(function(o){
    var no = S(o.orderNo);
    if (!no){ noNo.push(o._row + ' ' + S(o.pic) + ' ' + short(o) + ' ' + ordYm_(o)); return; }
    var g = normName_(o.pic) + '|' + ordYm_(o) + '|' + normName_(o.name) + '|' + (wkIso_(o.day) || '');
    (byNo[no] = byNo[no] || {})[g] = (byNo[no][g] || []).concat([o]);
    if (!S(o.day)) noDay.push(o._row + ' ' + no + ' ' + S(o.pic) + ' ' + short(o));
    var k = ordKey_(o); (grp[k] = grp[k] || []).push(o);
  });
  var dupNo = [];
  Object.keys(byNo).forEach(function(no){
    var gs = Object.keys(byNo[no]); if (gs.length < 2) return;
    dupNo.push(no + ' ⇒ ' + gs.map(function(g){ var L = byNo[no][g], o = L[0]; return S(o.pic) + ' · ' + short(o) + ' · ' + (wkIso_(o.day) || '(trống ngày)') + ' · ' + L.length + ' dòng · ' + L.reduce(function(s, x){ return s + num(x.amount); }, 0) + ' · dòng ' + L.map(function(x){ return x._row; }).join(','); }).join('  ||  '));
  });
  var dupLine = [];
  Object.keys(grp).forEach(function(k){
    var seen = {};
    grp[k].forEach(function(o){ var sg = ordSig_(o.ptype, o.qty, o.price) + '|' + S(o.detail).trim().toLowerCase(); (seen[sg] = seen[sg] || []).push(o._row); });
    Object.keys(seen).forEach(function(sg){ if (seen[sg].length > 1){ var o = grp[k][0]; dupLine.push(S(o.orderNo) + ' · ' + S(o.pic) + ' · ' + short(o) + ' · ' + sg.split('|').slice(0, 3).join(' ') + ' × ' + seen[sg].length + ' dòng ' + seen[sg].join(',')); } });
  });
  return { ok:true, team:TEAM(), from:from, rows:rows.length, dupNo:dupNo, noDay:noDay.slice(0, 30), nNoDay:noDay.length, dupLine:dupLine, noNo:noNo.slice(0, 30), nNoNo:noNo.length };
}
function ordDelLines_(p){
  var rows = S(p.rows).split(/[,\s]+/).map(function(x){ return parseInt(x, 10); }).filter(function(x){ return x > 0; });
  var no = S(p.no).replace(/\D/g, ''), sg = S(p.sg).toLowerCase();
  if (!rows.length || !no || !sg) return { ok:false, error:'rows? no? sg?' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'busy' }; }
  try {
    var s = sh('order'), m = COL.order, lc = lastColOf('order'), info = [];
    for (var i = 0; i < rows.length; i++){
      var v = s.getRange(rows[i], 1, 1, lc).getValues()[0];
      if (!(new RegExp('(^|\\D)' + no + '$')).test(S(v[m.orderNo - 1]))) return { ok:false, error:'Dòng ' + rows[i] + ' có số "' + S(v[m.orderNo - 1]) + '"' };
      if (ordSig_(v[m.ptype - 1], v[m.qty - 1], v[m.price - 1]) !== sg) return { ok:false, error:'Dòng ' + rows[i] + ' khác chữ ký: ' + ordSig_(v[m.ptype - 1], v[m.qty - 1], v[m.price - 1]) };
      info.push(S(v[m.name - 1]).slice(0, 30));
    }
    rows.sort(function(a, b){ return b - a; }).forEach(function(r){ s.deleteRow(r); });
    SpreadsheetApp.flush(); bumpVersion(bumpTabsFor_('order')); _RAW = {}; _ORDSUPP = null;
    try { logAct({ pic:'system' }, 'dellines', 'order', 'No. ' + no + ' · ' + info[0], 'xoá ' + rows.length + ' dòng trùng (' + sg + ')', rows[0]); flushLog_(); } catch(e){}
    return { ok:true, deleted:rows };
  } finally { lock.releaseLock(); }
}

function ordDedupe_(p){
  var from = S(p.from).replace(/\D/g, '').slice(0, 6) || '202609', run = S(p.run) === '1';
  _RAW = {};
  var all = readTab('order'), rows = all.filter(function(o){ return S(o.orderNo) && S(o.name) && ordYm_(o) >= from; });
  var nm = function(o){ return normName_(o.pic) + '|' + ordYm_(o) + '|' + normName_(o.name); };
  var byNo = {};
  rows.forEach(function(o){ var no = S(o.orderNo), d = wkIso_(o.day) || ''; var g = ((byNo[no] = byNo[no] || {})[nm(o) + '|' + d] = byNo[no][nm(o) + '|' + d] || { no:no, base:nm(o), day:d, rows:[], pic:S(o.pic), acc:S(o.name).slice(0, 24), amt:0 }); g.rows.push(o._row); g.amt += num(o.amount); });
  var fillDay = [], renum = [];
  Object.keys(byNo).forEach(function(no){
    var gs = Object.keys(byNo[no]).map(function(k){ return byNo[no][k]; });
    if (gs.length < 2) return;
    /* ① trống ngày + đúng 1 ngày cùng PIC · tháng · account ⇒ gộp (điền ngày) */
    var bases = {}; gs.forEach(function(g){ (bases[g.base] = bases[g.base] || []).push(g); });
    var left = [];
    Object.keys(bases).forEach(function(b){
      var L = bases[b], dated = L.filter(function(g){ return g.day; }), blank = L.filter(function(g){ return !g.day; });
      if (dated.length === 1 && blank.length){ blank.forEach(function(g){ fillDay.push({ no:no, rows:g.rows, day:dated[0].day, acc:g.acc, pic:g.pic }); dated[0].rows = dated[0].rows.concat(g.rows); }); left.push(dated[0]); }
      else left = left.concat(L);
    });
    if (left.length < 2) return;
    left.forEach(function(g){ g.min = Math.min.apply(null, g.rows); });
    left.sort(function(a, b){ return a.min - b.min; });
    left.slice(1).forEach(function(g){ renum.push({ no:no, rows:g.rows, acc:g.acc, pic:g.pic, day:g.day || '(trống ngày)', amt:g.amt, keep:left[0].acc + ' · ' + left[0].pic }); });
  });
  var out = { ok:true, team:TEAM(), run:run, fillDay:fillDay.map(function(x){ return x.no + ' · ' + x.pic + ' · ' + x.acc + ' · dòng ' + x.rows.join(',') + ' ⇒ ngày ' + x.day; }),
              renumber:renum.map(function(x){ return x.no + ' · ' + x.pic + ' · ' + x.acc + ' · ' + x.day + ' · ' + x.amt + ' · dòng ' + x.rows.join(',') + ' (giữ số: ' + x.keep + ')'; }) };
  if (!run || (!fillDay.length && !renum.length)) return out;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ out.ok = false; out.error = 'busy'; return out; }
  try {
    var s = sh('order'), m = COL.order, col = colValues('order', m.orderNo), mx = 0, pre = 'No. ';
    col.forEach(function(t){ t = S(t); var mm = /(\d+)\s*$/.exec(t); if (mm && +mm[1] > mx){ mx = +mm[1]; pre = t.slice(0, t.length - mm[1].length); } });
    var check = function(r, no){ var v = s.getRange(r, 1, 1, Math.max(m.orderNo, m.name)).getValues()[0]; return S(v[m.orderNo - 1]) === no; };
    var done = { fill:0, renum:[] };
    fillDay.forEach(function(x){ x.rows.forEach(function(r){ if (check(r, x.no) && !S(s.getRange(r, m.day).getValue())){ s.getRange(r, m.day).setValue(s2d(x.day)); done.fill++; } }); });
    renum.forEach(function(x){ if (!x.rows.every(function(r){ return check(r, x.no); })) return; var nn = pre + (++mx); x.rows.forEach(function(r){ s.getRange(r, m.orderNo).setValue(nn); }); done.renum.push(x.no + ' → ' + nn + ' · ' + x.acc + ' · ' + x.pic); });
    SpreadsheetApp.flush(); bumpVersion(bumpTabsFor_('order')); _RAW = {}; _ORDSUPP = null;
    try { logAct({ pic:'system' }, 'dedupe', 'order', 'Số đơn trùng', 'điền ngày ' + done.fill + ' dòng · cấp số mới ' + done.renum.length + ' đơn: ' + done.renum.join(' ; ').slice(0, 300), ''); flushLog_(); } catch(e){}
    out.done = done;
  } finally { lock.releaseLock(); }
  return out;
}
