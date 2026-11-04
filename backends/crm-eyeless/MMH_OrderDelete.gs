/*************************************************************************************************
 * MMH_OrderDelete.gs — XOÁ ĐƠN HÀNG (cả đơn) · v1.0 (04/11/2026)
 * GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless (sửa 1 nơi ⇒ chép sang 2 nơi kia).
 *
 * Lỗi cũ: deleteRow chỉ cho sales xoá ở tab weekly / cbc / customer ⇒ PIC bấm "Xoá đơn" luôn bị từ chối
 * ("Chỉ quản lý mới được xoá dòng ở tab này"), đơn nhiều dòng còn có thể bị xoá dở dang (mỗi dòng 1 lệnh).
 *
 * action deleteOrder (POST): rows = [{ _row, _no, _nm }] — các dòng của đơn như app đang thấy
 *   (_no = Order No., _nm = tên account). Trong 1 khoá:
 *   ① kiểm từng dòng: Order No. + account phải khớp; số dòng đã dời (có dòng khác bị xoá / thêm phía trên)
 *      ⇒ tìm lại theo Order No. + account + PIC; đơn chưa có số mà dòng đã đổi ⇒ STALE (không xoá nhầm).
 *   ② đơn có số ⇒ xoá CẢ ĐƠN (mọi dòng cùng Order No. + account + PIC + tháng), từ dưới lên.
 *   ③ quyền: quản lý (role manager) / người duyệt đơn (ORDER_APPROVERS, Director, Admin) xoá mọi đơn;
 *      PIC chỉ xoá đơn của chính mình và CHƯA "Đã duyệt" (đơn đã duyệt đã tính KPI C5 ⇒ nhờ người duyệt xoá).
 *************************************************************************************************/
function deleteOrder(user, p){
  var items = p.rows;
  if (typeof items === 'string'){ try { items = JSON.parse(items); } catch(e){ items = null; } }
  if (!items || !items.length){ var r0 = parseInt(p.row || 0, 10); items = r0 ? [{ _row:r0, _no:p._no, _nm:p._nm }] : []; }
  if (!items.length) return { ok:false, error:'Thiếu dòng đơn hàng cần xoá' };
  var me = ordMe_(user, p);
  if (me.err) return { ok:false, code:'AUTH', error:me.err };
  var boss = isManager(user) || ordIsApprover_(me);
  var myPic = normName_(me.pic || (user && user.pic));

  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' }; }
  try {
    try { ordX_(); } catch(eX){}
    try { _RAW = {}; } catch(eR){}                                    /* đọc mới trong khoá */
    var all = readTab('order'), byRow = {};
    all.forEach(function(o){ byRow[o._row] = o; });
    var same = function(o, no, nm){ return !!o && S(o.orderNo) === S(no) && normName_(o.name) === normName_(nm); };

    /* ① dòng gốc của đơn (đã kiểm hoặc tìm lại) */
    var seed = [], stale = false, anyNo = '';
    items.forEach(function(it){
      var row = parseInt(it && it._row || 0, 10), no = S(it && it._no), nm = S(it && (it._nm || it.name));
      if (no) anyNo = no;
      var o = byRow[row];
      if (o && same(o, no, nm)){ seed.push(o); return; }
      if (no){ all.forEach(function(x){ if (same(x, no, nm)) seed.push(x); }); return; }
      stale = true;
    });
    if (!seed.length){
      if (stale) return { ok:false, code:'STALE', error:'Dữ liệu đơn hàng trên sheet đã thay đổi — bấm Tải lại rồi xoá lại.' };
      return { ok:true, gone:true, deleted:0, message:'Đơn hàng đã được xoá trước đó' };
    }
    if (stale && !anyNo) return { ok:false, code:'STALE', error:'Dữ liệu đơn hàng trên sheet đã thay đổi — bấm Tải lại rồi xoá lại.' };

    /* ② cả đơn: cùng Order No. + account + PIC + tháng với dòng gốc */
    var set = {}, keyOf = function(o){ return [S(o.orderNo), normName_(o.name), normName_(o.pic), S(o.month)].join('|'); }, keys = {};
    seed.forEach(function(o){ set[o._row] = o; if (S(o.orderNo)) keys[keyOf(o)] = 1; });
    all.forEach(function(o){ if (S(o.orderNo) && keys[keyOf(o)]) set[o._row] = o; });
    var rows = Object.keys(set).map(Number).sort(function(a, b){ return b - a; });
    var list = rows.map(function(r){ return set[r]; });

    /* ③ quyền */
    if (!boss){
      var other = list.filter(function(o){ return S(o.pic) && normName_(o.pic) !== myPic; })[0];
      if (other) return { ok:false, code:'PERM', error:'Bạn chỉ xoá được đơn hàng do mình phụ trách (đơn này của ' + S(other.pic) + ').' };
      if (list.some(function(o){ return ordAppr_(o.appr) === 'ok'; }))
        return { ok:false, code:'APPROVED', error:'Đơn đã được duyệt (đã tính KPI) — nhờ người duyệt đơn hoặc quản lý xoá giúp.' };
    }

    var s = sh('order');
    rows.forEach(function(r){ s.deleteRow(r); });
    SpreadsheetApp.flush();
    try { _RAW = {}; } catch(eR2){}
    bumpVersion(bumpTabsFor_('order'));
    var first = list[list.length - 1] || list[0], no2 = S(first.orderNo);
    logAct(user, 'delete', 'order', S(first.name), (no2 ? 'đơn ' + no2 : 'đơn chưa có số') + ' · ' + rows.length + ' dòng', rows[rows.length - 1]);
    return { ok:true, deleted:rows.length, rows:rows, orderNo:no2,
             message:'Đã xoá đơn hàng' + (no2 ? ' ' + no2 : '') + ' (' + rows.length + ' dòng sản phẩm)' };
  } finally { lock.releaseLock(); }
}
