/**************************************************************************************************
 * MMH · KQTT FIND — tìm chữ trong MỌI cột của file tender tổng (sheet "Data xử lý") — CHỈ ĐỌC
 * Dùng để rà nhanh (vd. dòng thông số có "FDA") qua workflow Kiểm tra ▸ ping, không cần mở file.
 *
 *   GET ?action=kqttFind&q=<regex, mặc định FDA>&mode=head|sum|pkg|rows[&off=0&n=25][&col=<tên cột>][&from=202209]
 *     head = tiêu đề cột + số dòng khớp theo từng cột
 *     sum  = tổng: số dòng / số gói khớp, theo hãng sản xuất, theo năm
 *     pkg  = mỗi gói (KQTT Code) 1 dòng: tháng · CĐT · số dòng khớp / tổng dòng · hãng trúng (dòng khớp | dòng khác)
 *     rows = từng dòng khớp: gói · tháng · CĐT · tên hàng · hãng · xuất xứ · giá · cột: đoạn chữ quanh từ khoá
 *   Trả text/plain (gọn để đọc trong log ping, ≤ 6000 ký tự / trang ⇒ off / n).
 **************************************************************************************************/
var KF_VER = '1.0';   // 20/11/2026

function kqttFind_(p) {
  p = p || {};
  var q = String(p.q || 'FDA'), re;
  try { re = new RegExp(q, 'i'); } catch (e) { return 'Lỗi: biểu thức q không hợp lệ'; }
  var mode = String(p.mode || 'sum'), off = +(p.off || 0) || 0, n = Math.min(+(p.n || 25) || 25, 200);
  var from = +(p.from || 0) || 0;
  var ss = SpreadsheetApp.openById(SYNC.DEST_SS_ID);
  var sh = resolveSheetByGid_(ss, SYNC.DEST_GID) || ss.getSheetByName(SYNC.DEST_SHEET_NAME);
  if (!sh) return 'Lỗi: không thấy sheet ' + SYNC.DEST_SHEET_NAME;
  var HR = SYNC.DEST_HEADER_ROW, lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  var head = sh.getRange(HR, 1, 1, lastCol).getDisplayValues()[0].map(function (h) { return String(h).replace(/\s+/g, ' ').trim(); });
  var C = kqCols_(head);
  var onlyCol = p.col ? String(p.col).toLowerCase() : '';
  var V = lastRow > HR ? sh.getRange(HR + 1, 1, lastRow - HR, lastCol).getDisplayValues() : [];
  var g = function (r, k) { var c = C[k]; return (c == null || c < 0) ? '' : String(r[c] || '').trim(); };
  var hits = [], byCol = {}, pk = {};
  for (var i = 0; i < V.length; i++) {
    var r = V[i], tb = g(r, 'tbmt').replace(/\s+/g, ''), buyer = g(r, 'buyer');
    if (!tb && !buyer) continue;
    var month = kqMonth_(g(r, 'month'));
    if (from && month && month < from) continue;
    var mfr = (C.mfrNorm >= 0 && r[C.mfrNorm]) ? String(r[C.mfrNorm]).trim() : g(r, 'mfr');
    var key = tb || buyer;
    var P = pk[key] || (pk[key] = { tb: tb, buyer: buyer, month: month, n: 0, hit: 0, mh: {}, mo: {} });
    P.n++;
    var cols = [];
    for (var c = 0; c < r.length; c++) {
      var s = String(r[c] || '');
      if (!s || !re.test(s)) continue;
      if (onlyCol && head[c].toLowerCase().indexOf(onlyCol) < 0) continue;
      cols.push(c); byCol[head[c] || ('#' + (c + 1))] = (byCol[head[c] || ('#' + (c + 1))] || 0) + 1;
    }
    if (!cols.length) { P.mo[mfr || '?'] = (P.mo[mfr || '?'] || 0) + 1; continue; }
    P.hit++; P.mh[mfr || '?'] = (P.mh[mfr || '?'] || 0) + 1;
    hits.push({ row: HR + 1 + i, tb: tb, buyer: buyer, month: month, pname: g(r, 'pname'), brand: g(r, 'brand'), mfr: mfr,
      country: g(r, 'country'), price: g(r, 'price'), qty: g(r, 'qty'),
      snip: cols.map(function (c) { return (head[c] || '#' + (c + 1)) + ': ' + kfSnip_(String(r[c]), re); }) });
  }
  var out = ['KQTT FIND v' + KF_VER + ' · q=' + q + ' · sheet "' + sh.getName() + '" · ' + V.length + ' dòng · khớp ' + hits.length + ' dòng'];
  var obj = function (o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (k) { return k + '=' + o[k]; }).join(' · '); };
  if (mode === 'head') {
    out.push('Cột khớp: ' + obj(byCol));
    out.push('Tiêu đề (dòng ' + HR + '): ' + head.map(function (h, j) { return (j + 1) + '.' + h; }).join(' | '));
    return out.join('\n');
  }
  var pkgs = Object.keys(pk).map(function (k) { return pk[k]; }).filter(function (P) { return P.hit; });
  if (mode === 'sum') {
    var mf = {}, yr = {}, ct = {};
    hits.forEach(function (h) { mf[h.mfr || '?'] = (mf[h.mfr || '?'] || 0) + 1; ct[h.country || '?'] = (ct[h.country || '?'] || 0) + 1;
      var y = h.month ? String(h.month).slice(0, 4) : '?'; yr[y] = (yr[y] || 0) + 1; });
    out.push('Số gói có dòng khớp: ' + pkgs.length);
    out.push('Cột khớp: ' + obj(byCol));
    out.push('Theo hãng (dòng khớp): ' + obj(mf));
    out.push('Theo xuất xứ: ' + obj(ct));
    out.push('Theo năm: ' + obj(yr));
    return out.join('\n');
  }
  if (mode === 'pkg') {
    pkgs.sort(function (a, b) { return (b.month || 0) - (a.month || 0); });
    out.push('Số gói: ' + pkgs.length + ' · trang ' + off + '–' + Math.min(off + n, pkgs.length));
    pkgs.slice(off, off + n).forEach(function (P) {
      out.push(P.tb + ' · ' + P.month + ' · ' + P.buyer.slice(0, 60) + ' · ' + P.hit + '/' + P.n + ' · khớp: ' + obj(P.mh) +
        (Object.keys(P.mo).length ? ' · khác: ' + obj(P.mo) : ''));
    });
    return out.join('\n');
  }
  hits.sort(function (a, b) { return (b.month || 0) - (a.month || 0) || (a.tb < b.tb ? -1 : 1); });
  out.push('Trang ' + off + '–' + Math.min(off + n, hits.length));
  hits.slice(off, off + n).forEach(function (h) {
    out.push('#' + h.row + ' ' + h.tb + ' · ' + h.month + ' · ' + h.buyer.slice(0, 50) + ' · ' + h.pname.slice(0, 60) + ' · ' +
      (h.brand ? h.brand.slice(0, 30) + ' / ' : '') + h.mfr + ' · ' + h.country + ' · SL ' + h.qty + ' · ' + h.price + ' ⟶ ' + h.snip.join(' ‖ '));
  });
  return out.join('\n');
}

function kfSnip_(s, re) {
  s = s.replace(/\s+/g, ' ');
  var m = re.exec(s); if (!m) return s.slice(0, 160);
  var a = Math.max(0, m.index - 90), b = Math.min(s.length, m.index + m[0].length + 90);
  return (a ? '…' : '') + s.slice(a, b) + (b < s.length ? '…' : '');
}
