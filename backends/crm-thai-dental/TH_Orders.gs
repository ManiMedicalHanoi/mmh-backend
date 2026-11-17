/*************************************************************************************************
 * TH_Orders.gs — v1.0 (17/11/2026) · CRM Thailand Dental — sales orders from the app (Yong: "fill in the order on the same page as the visit")
 *
 * Writes into the EXISTING sheet "SALE ORDERS" of the Dental Action file (old layout, kept: header row 3, input hints row 4, data from row 5),
 * columns found by their header text (never by position): No. · Check account name · MMH sales PIC · Account PIC · FY · Month · Day ·
 * Order No. · Detail product · Quantity · Unit price · Amount · Partner ( Distributor, dealer) · Partner type · Product type · Note.
 * 1 row = 1 product line; all lines of one order share "Order No." ("No.<n>", next number = highest No.<n> + 1).
 * Cells holding a formula are never written / cleared. Edit = same rows rewritten (extra lines appended, removed lines cleared);
 * delete = row contents cleared (rows kept, formulas kept).
 * Actions: ordList (read) · ordSave {order: {no?, date, pic, account, contact, dist, note, lines:[{group, item, qty, price}]}} · ordDelete {no}
 *************************************************************************************************/
var THO = {
  SH: 'SALE ORDERS', HDR: 3, DATA: 5,
  H: { no: /^no\.?$/i, account: /check account name/i, pic: /mmh sales pic/i, contact: /^account pic$/i, fy: /^fy$/i, month: /^month$/i, day: /^day$/i,
       orderNo: /^order no/i, item: /detail product/i, qty: /^quantity/i, price: /^unit price/i, amount: /^amount/i, partner: /^partner\s*\(/i,
       ptype: /^partner type/i, group: /^product type/i, note: /^note$/i },
  DIST: ['DDI', 'Promptdent', 'VRP', 'Siamdent']
};
function thoSheet_(){ var s = ss_().getSheetByName(THO.SH); if(!s) throw new Error('Sheet "' + THO.SH + '" not found in this file.'); return s; }
function thoCols_(s){
  var lc = s.getLastColumn(), h = s.getRange(THO.HDR, 1, 1, lc).getDisplayValues()[0], c = {};
  Object.keys(THO.H).forEach(function(k){ for(var i = 0; i < h.length; i++){ if(THO.H[k].test(String(h[i]).replace(/\s+/g, ' ').trim())){ c[k] = i + 1; break; } } });
  ['account', 'pic', 'orderNo', 'item', 'qty'].forEach(function(k){ if(!c[k]) throw new Error('SALE ORDERS: column "' + k + '" not found in row ' + THO.HDR + '.'); });
  return c;
}
function thoRead_(s, c){
  var last = s.getLastRow(); if(last < THO.DATA) return [];
  var lc = s.getLastColumn(), V = s.getRange(THO.DATA, 1, last - THO.DATA + 1, lc).getValues(), out = [];
  var g = function(r, k){ return c[k] ? r[c[k] - 1] : ''; };
  V.forEach(function(r, i){
    var acc = str_(g(r, 'account')), item = str_(g(r, 'item')), on = str_(g(r, 'orderNo'));
    if(!acc && !item && !on) return;
    var d = g(r, 'day'), day = d instanceof Date ? iso_(d) : iso_(str_(d));
    out.push({ _row: THO.DATA + i, orderNo: on, account: acc, pic: str_(g(r, 'pic')), contact: str_(g(r, 'contact')), fy: str_(g(r, 'fy')),
      month: str_(g(r, 'month')), day: day, item: item, qty: num_(g(r, 'qty')) || '', price: num_(g(r, 'price')) || '', amount: num_(g(r, 'amount')) || '',
      partner: str_(g(r, 'partner')), ptype: str_(g(r, 'ptype')), group: str_(g(r, 'group')), note: str_(g(r, 'note')) });
  });
  return out;
}
function thoNextNo_(rows){ var m = 0; rows.forEach(function(r){ var x = /(\d+)/.exec(r.orderNo); if(x) m = Math.max(m, +x[1]); }); return 'No.' + (m + 1); }
function thoFree_(s, c){
  var last = s.getLastRow(); if(last < THO.DATA) return THO.DATA;
  var v = s.getRange(THO.DATA, c.account, last - THO.DATA + 1, 1).getValues(), w = s.getRange(THO.DATA, c.item, last - THO.DATA + 1, 1).getValues(), end = THO.DATA - 1;
  for(var i = 0; i < v.length; i++) if(str_(v[i][0]) || str_(w[i][0])) end = THO.DATA + i;
  return end + 1;
}
/* write one row: only cells without a formula */
function thoPut_(s, c, row, o){
  var lc = s.getLastColumn(), R = s.getRange(row, 1, 1, lc), F = R.getFormulas()[0], V = R.getValues()[0];
  Object.keys(o).forEach(function(k){ var col = c[k]; if(!col || F[col - 1]) return; V[col - 1] = o[k]; });
  /* write back only the non-formula cells of our columns (one call per column is slow ⇒ one setValues on a copy where formula cells keep their formula) */
  var out = V.map(function(v, i){ return F[i] ? F[i] : v; });
  R.setValues([out]);
}
function thoClear_(s, c, row){
  var o = {}; Object.keys(THO.H).forEach(function(k){ if(k !== 'no') o[k] = ''; }); o.no = ''; thoPut_(s, c, row, o);
}
function thoDistStr_(dist){
  dist = str_(dist); if(!dist) return '';
  try{ var hit = customers_().filter(function(x){ return /distributor|dealer/i.test(x.type || '') && picKey_(x.name).indexOf(picKey_(dist)) === 0; })[0];
    if(hit) return [hit.name, hit.type, hit.province, hit.area].join('/'); }catch(e){}
  return dist;
}
function thoList_(user, p){
  var s = thoSheet_(), c = thoCols_(s), rows = thoRead_(s, c);
  return { ok: true, rows: rows, sheet: ss_().getUrl() + '#gid=' + s.getSheetId(), distributors: THO.DIST };
}
function thoSave_(user, p){
  var o = p.order; if(typeof o === 'string') o = JSON.parse(o);
  if(!o) return { ok: false, error: 'No order' };
  var lines = (o.lines || []).filter(function(l){ return str_(l.item) || str_(l.group); });
  if(!str_(o.account)) return { ok: false, error: 'Choose the account.' };
  if(!lines.length) return { ok: false, error: 'Add at least one product.' };
  for(var i = 0; i < lines.length; i++) if(!(num_(lines[i].qty) > 0)) return { ok: false, error: 'Quantity is missing on line ' + (i + 1) + '.' };
  var day = iso_(o.date) || todayIso_(), pic = str_(o.pic) || user.pic;
  if(!canEdit_(user, pic)) return { ok: false, error: 'Only ' + pic + ' (or a manager) can save this order.' };
  var L = lock_(), out = {};
  try{
    var s = thoSheet_(), c = thoCols_(s), rows = thoRead_(s, c), no = str_(o.no), old = [];
    if(no){ old = rows.filter(function(r){ return r.orderNo === no && picKey_(parseAcc_(r.account).name) === picKey_(parseAcc_(str_(o.oldAccount) || str_(o.account)).name); });
      if(old.length && !canEdit_(user, old[0].pic)) return { ok: false, error: 'Only ' + old[0].pic + ' (or a manager) can edit this order.' }; }
    else no = thoNextNo_(rows);
    var seq = 0;
    try{ var nv = s.getRange(THO.DATA, c.no || 2, Math.max(1, s.getLastRow() - THO.DATA + 1), 1).getValues(); nv.forEach(function(x){ seq = Math.max(seq, num_(x[0])); }); }catch(e){}
    var ym = day.slice(0, 4) + day.slice(5, 7), dist = str_(o.dist), part = thoDistStr_(dist), dt = date_(day);
    var free = thoFree_(s, c), targets = old.map(function(r){ return r._row; });
    lines.forEach(function(l, i){
      var row = i < targets.length ? targets[i] : free++;
      if(row > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), 20);
      var q = num_(l.qty), pr = num_(l.price);
      thoPut_(s, c, row, { no: i < targets.length ? (num_(s.getRange(row, c.no || 2).getValue()) || ++seq) : ++seq, account: str_(o.account), pic: pic,
        contact: str_(o.contact), fy: fyOfYm_(ym), month: Number(ym), day: dt || day, orderNo: no, item: str_(l.item) || str_(l.group),
        qty: q, price: pr || '', amount: pr ? q * pr : '', partner: part, ptype: dist ? 'Distributor' : '', group: str_(l.group), note: str_(o.note) });
    });
    for(var j = lines.length; j < targets.length; j++) thoClear_(s, c, targets[j]);
    SpreadsheetApp.flush();
    out = { ok: true, no: no, lines: lines.length, message: 'Order ' + no + ' saved to sheet SALE ORDERS' };
  } finally { L.releaseLock(); }
  try{ log_(user.pic, str_(o.no) ? 'update' : 'add', 'order', parseAcc_(o.account).name, out.no + ' · ' + lines.length + ' line(s)', ''); }catch(e){}
  return out;
}
function thoDelete_(user, p){
  var no = str_(p.no), acc = str_(p.account); if(!no) return { ok: false, error: 'No order number' };
  var L = lock_(), n = 0;
  try{
    var s = thoSheet_(), c = thoCols_(s), rows = thoRead_(s, c).filter(function(r){ return r.orderNo === no && (!acc || picKey_(parseAcc_(r.account).name) === picKey_(parseAcc_(acc).name)); });
    if(!rows.length) return { ok: true, n: 0, message: 'Already deleted' };
    if(!canEdit_(user, rows[0].pic)) return { ok: false, error: 'Only ' + rows[0].pic + ' (or a manager) can delete this order.' };
    rows.forEach(function(r){ thoClear_(s, c, r._row); n++; });
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  try{ log_(user.pic, 'delete', 'order', parseAcc_(acc).name, no, ''); }catch(e){}
  return { ok: true, n: n, message: 'Order ' + no + ' deleted' };
}
function thoRoute_(a, user, p){
  try{
    if(a === 'ordList') return thoList_(user, p);
    if(a === 'ordSave') return thoSave_(user, p);
    if(a === 'ordDelete') return thoDelete_(user, p);
  }catch(e){ return { ok: false, error: String(e && e.message || e) }; }
  return null;
}
