/*************************************************************************************************
 * MMH_RowDelete.gs — XOÁ DÒNG KỂ CẢ KHI SHEET ĐANG BẬT BỘ LỌC · v1.0 (17/11/2026)
 * GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless (sửa 1 nơi ⇒ chép sang 2 nơi kia).
 *
 * Lỗi gặp (Phuong, Dental 05–17/11/2026): tab 3. SALE ORDER có bộ lọc (filter) đang ẩn bớt dòng; Sheet.deleteRow
 * với dòng BỊ BỘ LỌC ẨN không làm gì cả (không báo lỗi) ⇒ app báo "Đã xoá đơn" nhưng đơn vẫn nằm trên sheet.
 * delRowsSafe_(s, rows): không có dòng nào bị lọc ẩn ⇒ xoá như cũ. Có ⇒ nhớ vùng lọc + điều kiện lọc từng cột,
 * tạm gỡ bộ lọc, xoá (từ dưới lên), đặt lại bộ lọc như cũ (vùng ngắn đi đúng số dòng đã xoá).
 * Trả { lifted, left } — left = dòng vẫn còn sau khi xoá (đọc lại số dòng cuối, không bao giờ xoá lần 2).
 *************************************************************************************************/
function delRowsSafe_(s, rows){
  var list = [];
  (rows || []).forEach(function(r){ r = parseInt(r, 10); if (r > 0 && list.indexOf(r) < 0) list.push(r); });
  list.sort(function(a, b){ return b - a; });
  if (!list.length) return { lifted:false };
  var f = null; try { f = s.getFilter(); } catch(e){}
  var hid = false;
  if (f) list.forEach(function(r){ try { if (s.isRowHiddenByFilter(r)) hid = true; } catch(e){} });
  if (!hid){ list.forEach(function(r){ s.deleteRow(r); }); return { lifted:false }; }
  var rg = f.getRange(), r0 = rg.getRow(), c0 = rg.getColumn(), nr = rg.getNumRows(), nc = rg.getNumColumns(), crit = {};
  for (var c = c0; c < c0 + nc; c++){ try { var k = f.getColumnFilterCriteria(c); if (k) crit[c] = k.copy().build(); } catch(e){} }
  f.remove();
  try {
    list.forEach(function(r){ s.deleteRow(r); });
  } finally {
    var gone = list.filter(function(r){ return r >= r0 && r < r0 + nr; }).length;
    try {
      var nf = s.getRange(r0, c0, Math.max(2, nr - gone), nc).createFilter();
      Object.keys(crit).forEach(function(c){ try { nf.setColumnFilterCriteria(+c, crit[c]); } catch(e){} });
    } catch(eF){}
  }
  return { lifted:true };
}
