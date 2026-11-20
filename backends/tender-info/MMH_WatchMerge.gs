/* ════════════════════════════════════════════════════════════════════
   MMH_WatchMerge.gs v1.0 (18/11/2026, người dùng yêu cầu) — GỘP "Danh sách hàng hóa" + "Danh sách nhà thầu" CỦA MỌI GÓI THẦU THÀNH 2 FILE TỔNG
   ① "Kết quả trúng thầu - Tổng hợp danh mục hàng hóa"  ② "Danh mục nhà thầu tham dự - Tổng hợp danh sách nhà thầu" (Google Sheet ở thư mục mẹ).
   Cột đầu: Khu vực · Tỉnh thành · Chủ đầu tư · Tên gói thầu · Số TBMT, sau đó các cột của muasamcong (khớp THEO TÊN tiêu đề, bỏ dấu, gần đúng;
   cột tên khác nhau cùng nghĩa — vd. "Tên thuốc" / "Danh mục hàng hóa", "Cơ sở sản xuất" / "Hãng sản xuất" — gộp về 1 cột).
   Nguồn: ① file Google Sheet bot đã tải (GÓI TÌM THẤY ▸ files: kind "Danh sách hàng hóa" / "Danh sách nhà thầu") ② thư mục "Gộp thủ công" trong
   thư mục mẹ (người dùng thả .xlsx / Google Sheet tải tay — số TBMT đọc ở ô "Mã TBMT" hoặc tên file).
   KHÔNG TRÙNG: mỗi số TBMT chỉ 1 bộ dòng / file tổng — gộp lại ⇒ xoá dòng cũ của gói đó rồi ghi mới (sheet ẩn "Nguồn đã gộp": số · file · lần sửa).
   File không đủ tiêu đề (< 5 cột khớp, thiếu tên hàng / tên nhà thầu) ⇒ bỏ qua, ghi lý do. Dòng lô (STT + Mã phần, không có hàng) ⇒ điền xuống các dòng hàng con.
   Chạy: wtTick (30 phút) + cuối mỗi lượt bot (botMerge, khoá bot) + action wMerge (quản lý; force=1 gộp lại tất cả). ≤ 4 phút / lượt, lượt sau làm tiếp.
   ════════════════════════════════════════════════════════════════════ */
const WTM = {
  BASE: ['Khu vực', 'Tỉnh thành', 'Chủ đầu tư', 'Tên gói thầu', 'Số TBMT'],
  TAIL: ['File nguồn', 'Gộp lúc', 'Khoá'],
  DROP: 'Gộp thủ công (thả file Excel / Google Sheet vào đây)',
  BUDGET_MS: 240000,
  KIND: {
    hh: { name: 'Kết quả trúng thầu - Tổng hợp danh mục hàng hóa', prop: 'WT_MG_HH', sheet: 'Hàng hóa trúng thầu', need: ['Danh mục hàng hóa', 'Đơn giá trúng thầu|Thành tiền'],
      re: /h[aà]ng\s*h[oó]a|hang_hoa|hang hoa/i,
      cols: [
        ['STT', ['stt']], ['Mã phần/lô', ['ma phan lo', 'ma phan']], ['Tên phần/lô', ['ten phan lo', 'ten phan']], ['Nhà thầu trúng thầu', ['nha thau trung thau', 'ten nha thau trung thau']],
        ['Danh mục hàng hóa', ['danh muc hang hoa', 'ten hang hoa', 'ten thuoc', 'ten vat tu', 'ten hoa chat']], ['Ký mã hiệu', ['ky ma hieu']], ['Nhãn hiệu', ['nhan hieu']],
        ['Hãng sản xuất', ['hang san xuat', 'co so san xuat', 'nha san xuat']], ['Mặt hàng dự thầu', ['mat hang du thau']], ['Mã hàng hóa', ['ma hang hoa', 'ma thuoc']],
        ['Phân nhóm', ['phan nhom', 'nhom thuoc']], ['Đơn vị tính', ['don vi tinh', 'dvt']], ['Khối lượng', ['khoi luong', 'so luong'], 1],
        ['Xuất xứ', ['xuat xu']], ['Nguồn vốn đầu tư', ['nguon von dau tu', 'nguon von']], ['Số lượng định mức', ['so luong dinh muc'], 1],
        ['Số lưu hành hoặc số giấy phép nhập khẩu', ['so luu hanh', 'giay phep nhap khau', 'gdklh', 'gpnk']], ['Năm sản xuất', ['nam san xuat']],
        ['Cấu hình, tính năng kỹ thuật cơ bản', ['cau hinh tinh nang ky thuat', 'cau hinh', 'tinh nang ky thuat']], ['Chủng loại (Models)', ['chung loai', 'models']],
        ['Mã HS', ['ma hs']], ['Đơn giá trúng thầu', ['don gia trung thau', 'don gia'], 1], ['Thành tiền (đã bao gồm thuế, phí, lệ phí)', ['thanh tien'], 1],
        ['Tên hoạt chất / thành phần', ['ten hoat chat']], ['Nồng độ, hàm lượng', ['nong do ham luong', 'nong do', 'ham luong']], ['Đường dùng', ['duong dung']],
        ['Dạng bào chế', ['dang bao che']], ['Quy cách', ['quy cach']], ['Hạn dùng (tuổi thọ)', ['han dung']],
        ['Tiến độ cung cấp / Thời gian giao hàng', ['tien do cung cap', 'thoi gian giao hang']]
      ] },
    nt: { name: 'Danh mục nhà thầu tham dự - Tổng hợp danh sách nhà thầu', prop: 'WT_MG_NT', sheet: 'Nhà thầu tham dự', need: ['Tên nhà thầu', 'Kết quả|Giá dự thầu|Mã số thuế'],
      re: /nh[aà]\s*th[aầ]u|nha_thau|nha thau/i,
      cols: [
        ['STT', ['stt']], ['Mã phần (lô)', ['ma phan lo', 'ma phan']], ['Tên phần (lô)', ['ten phan lo', 'ten phan']], ['Mã định danh', ['ma dinh danh']],
        ['Mã số thuế', ['ma so thue']], ['Tên nhà thầu', ['ten nha thau']], ['Giá dự thầu', ['gia du thau'], 1], ['Kết quả', ['ket qua']],
        ['Giá dự thầu sau hiệu chỉnh sai lệch thừa (nếu có), giảm giá (nếu có)', ['gia du thau sau hieu chinh', 'sau hieu chinh sai lech'], 1],
        ['Điểm kỹ thuật (nếu có)', ['diem ky thuat'], 1], ['Giá đánh giá (nếu có)', ['gia danh gia'], 1],
        ['Giá trúng thầu (VND)', ['gia trung thau'], 1], ['Lý do không đáp ứng', ['ly do khong dap ung', 'ly do']],
        ['Thời gian thực hiện gói thầu', ['thoi gian thuc hien goi thau']], ['Thời gian thực hiện gói thầu chi tiết', ['thoi gian thuc hien goi thau chi tiet']],
        ['Thời gian thực hiện hợp đồng', ['thoi gian thuc hien hop dong']], ['Các nội dung khác (nếu có)', ['cac noi dung khac', 'noi dung khac']]
      ] }
  }
};
WTM.SRC_HEAD = ['Số TBMT', 'Loại', 'File', 'Tên file', 'Lần sửa file', 'Số dòng', 'Gộp lúc', 'Ghi chú'];

/* ── chuẩn hoá chữ / số ── */
function wtmK_(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim(); }
function wtmNum_(v) {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v).trim().replace(/\s|VND|đ$/gi, '');
  if (!s) return '';
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');           // 1.235.520 / 1.235,5
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');                          // 1,235,520
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');                                            // 12,5
  const n = Number(s);
  return s && isFinite(n) ? n : String(v).trim();
}
function wtmBare_(no) { return String(no || '').toUpperCase().replace(/\s+/g, '').replace(/-\d+$/, ''); }

/** Khớp 1 tiêu đề nguồn ⇒ cột chuẩn (bí danh DÀI nhất nằm trong tiêu đề — "số lượng định mức" thắng "số lượng") */
function wtmMatch_(cols, head) {
  const h = ' ' + wtmK_(head) + ' ';
  let best = -1, len = 0;
  cols.forEach(function (c, i) { c[1].forEach(function (a) { if (a.length > len && h.indexOf(' ' + a + ' ') >= 0) { best = i; len = a.length; } }); });
  return best;
}

/** Bảng giá trị (getValues) ⇒ { kind, no, name, rows:[[...cột chuẩn]], head, miss } hoặc { skip: lý do } */
function wtmParse_(V, fileName, want) {
  const kinds = want ? [want] : ['nt', 'hh'];
  let pick = null;
  for (let r = 0; r < Math.min(V.length, 15); r++) {
    kinds.forEach(function (k) {
      const cols = WTM.KIND[k].cols, map = {};
      V[r].forEach(function (c, j) { const i = wtmMatch_(cols, c); if (i >= 0 && !(i in map)) map[i] = j; });
      const n = Object.keys(map).length;
      const ok = WTM.KIND[k].need.every(function (alt) { return alt.split('|').some(function (nm) { const i = cols.findIndex(function (c) { return c[0] === nm; }); return i >= 0 && (i in map); }); });
      if (ok && n >= 5 && (!pick || n > pick.n)) pick = { k: k, r: r, map: map, n: n };
    });
  }
  if (!pick) return { skip: 'không thấy dòng tiêu đề đủ cột (cần ≥ 5 cột khớp, có tên hàng / tên nhà thầu)' };
  // số TBMT + tên gói ở khối "THÔNG TIN CHUNG" phía trên
  let no = '', name = '';
  for (let r = 0; r < pick.r; r++) {
    const a = wtmK_(V[r][0]), val = (V[r].slice(1).filter(function (x) { return wtS_(x); })[0]) || '';
    if (/^ma tbmt|^so tbmt|^ma thong bao/.test(a)) no = wtS_(val);
    else if (/^ten goi thau/.test(a)) name = wtS_(val);
  }
  if (!no) no = (String(fileName || '').toUpperCase().match(/IB\d{10}(-\d+)?/) || [])[0] || '';
  const C = WTM.KIND[pick.k].cols, idx = C.map(function (c, i) { return i in pick.map ? pick.map[i] : -1; });
  const iS = 0, iLot = 1, iName = 2, iWin = 3;   // STT · Mã phần · Tên phần · Nhà thầu (cả 2 loại cùng vị trí 0..3; nt: vị trí 3 = Mã định danh — không điền xuống)
  const itemCols = C.map(function (c, i) { return i; }).filter(function (i) { return i > 3 && idx[i] >= 0; });
  const out = []; let parent = null;
  for (let r = pick.r + 1; r < V.length; r++) {
    const row = idx.map(function (j, i) { const v = j >= 0 ? V[r][j] : ''; return C[i][2] ? wtmNum_(v) : (v instanceof Date ? v : wtS_(v)); });
    const filled = row.filter(function (x) { return x !== '' && x != null; }).length;
    if (!filled) continue;
    const first = wtmK_(V[r][0]);
    if (filled <= 3 && /^(tong|cong|ghi chu|nguoi lap)/.test(first)) continue;
    if (wtmMatch_(C, V[r][idx[1] >= 0 ? idx[1] : 0]) === 1 && filled > 4 && r < pick.r + 3) continue;   // dòng tiêu đề lặp
    if (pick.k === 'hh') {
      const hasItem = itemCols.some(function (i) { const nm = C[i][0]; return /Danh mục|Mã hàng|Ký mã|Nhãn hiệu|Mặt hàng|Đơn vị|Tên hoạt chất/.test(nm) && row[i] !== ''; });
      const isLot = !hasItem && (row[iLot] !== '' || row[iS] !== '');
      if (isLot) {   // dòng lô ⇒ nhớ để điền xuống; lô không có hàng con thì vẫn giữ (xem lại ở dòng kế)
        if (parent && !parent.used) out.push(parent.row);
        parent = { row: row, used: false }; continue;
      }
      if (parent && row[iS] === '' && row[iLot] === '') {
        [iS, iLot, iName, iWin].forEach(function (i) { if (row[i] === '') row[i] = parent.row[i]; });
        parent.used = true;
      } else if (parent) { if (!parent.used) out.push(parent.row); parent = null; }
    }
    out.push(row);
  }
  if (parent && !parent.used) out.push(parent.row);
  const miss = C.filter(function (c, i) { return idx[i] < 0; }).map(function (c) { return c[0]; });
  return { kind: pick.k, no: no, name: name, rows: out, n: pick.n, miss: miss };
}

/* ── file tổng ── */
function wtmBook_(k) {
  const K = WTM.KIND[k], P = PropertiesService.getScriptProperties();
  let id = P.getProperty(K.prop), book = null;
  if (id) { try { if (!DriveApp.getFileById(id).isTrashed()) book = SpreadsheetApp.openById(id); } catch (e) {} }
  if (!book) {
    const root = DriveApp.getFolderById(P.getProperty('WT_DL_ROOT') || WTD.ROOT), it = root.getFilesByName(K.name);
    if (it.hasNext()) book = SpreadsheetApp.openById(it.next().getId());
    else { book = SpreadsheetApp.create(K.name); DriveApp.getFileById(book.getId()).moveTo(root); }
    P.setProperty(K.prop, book.getId());
  }
  const head = WTM.BASE.concat(K.cols.map(function (c) { return c[0]; }), WTM.TAIL);
  let sh = book.getSheetByName(K.sheet);
  if (!sh) { sh = book.getSheets()[0]; if (sh.getLastRow() > 0 && sh.getName() !== K.sheet) sh = book.insertSheet(K.sheet); else sh.setName(K.sheet); }
  if (sh.getLastRow() < 1 || wtS_(sh.getRange(1, 1).getValue()) !== WTM.BASE[0]) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true).setVerticalAlignment('middle');
    sh.setFrozenRows(1); sh.setFrozenColumns(5);
    K.cols.forEach(function (c, i) { if (c[2]) sh.getRange(2, WTM.BASE.length + i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('#,##0.##'); });
    try { sh.hideColumns(head.length); } catch (e) {}
  }
  let src = book.getSheetByName('Nguồn đã gộp');
  if (!src) { src = book.insertSheet('Nguồn đã gộp'); src.getRange(1, 1, 1, WTM.SRC_HEAD.length).setValues([WTM.SRC_HEAD]).setFontWeight('bold'); src.setFrozenRows(1); try { src.hideSheet(); } catch (e) {} }
  return { book: book, sh: sh, src: src, head: head, url: book.getUrl() };
}
function wtmUrls_() {
  const P = PropertiesService.getScriptProperties(), u = function (id) { return id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : ''; };
  return { hh: u(P.getProperty(WTM.KIND.hh.prop)), nt: u(P.getProperty(WTM.KIND.nt.prop)) };
}
/** xoá mọi dòng của 1 số TBMT (cột Khoá ẩn), gộp các khối liền nhau, từ dưới lên */
function wtmDrop_(B, bare) {
  const last = B.sh.getLastRow(); if (last < 2) return 0;
  const f = B.sh.getRange(2, B.head.length, last - 1, 1).createTextFinder(bare).matchEntireCell(true).matchCase(true).findAll();
  const rows = f.map(function (c) { return c.getRow(); }).sort(function (a, b) { return b - a; });
  let i = 0, n = 0;
  while (i < rows.length) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[j] - 1) j++; B.sh.deleteRows(rows[j], rows[i] - rows[j] + 1); n += rows[i] - rows[j] + 1; i = j + 1; }
  return n;
}

/* ── nguồn cần gộp ── */
function wtmSources_(force) {
  const out = [], ss = wtBook_();
  wtHits_(ss).forEach(function (h) {
    (h.files || []).forEach(function (f) {
      if (!f.gsheet || !f.id) return;
      const t = wtS_(f.kind) + ' ' + wtS_(f.name);
      const k = /Danh sách hàng hóa/i.test(t) ? 'hh' : /Danh sách nhà thầu/i.test(t) ? 'nt' : '';
      if (k) out.push({ k: k, id: f.id, name: f.name, h: h, ver: f.id });
    });
  });
  // thư mục "Gộp thủ công": .xlsx ⇒ đổi sang Google Sheet 1 lần (cạnh file gốc), Google Sheet dùng thẳng
  try {
    const P = PropertiesService.getScriptProperties(), root = DriveApp.getFolderById(P.getProperty('WT_DL_ROOT') || WTD.ROOT), drop = wtSub_(root, WTM.DROP);
    const it = drop.getFiles(), seenX = JSON.parse(P.getProperty('WT_MG_XLS') || '{}');
    while (it.hasNext()) {
      const f = it.next(), mt = f.getMimeType(), nm = f.getName();
      const k = WTM.KIND.hh.re.test(nm) ? 'hh' : WTM.KIND.nt.re.test(nm) ? 'nt' : '';
      if (mt === MimeType.GOOGLE_SHEETS) out.push({ k: k, id: f.getId(), name: nm, ver: f.getId() + '@' + f.getLastUpdated().getTime(), drop: 1 });
      else if (/\.xlsx?$/i.test(nm) && !seenX[f.getId() + '@' + f.getLastUpdated().getTime()]) {
        try {
          const g = Drive.Files.insert({ title: nm.replace(/\.xlsx?$/i, ''), mimeType: MimeType.GOOGLE_SHEETS, parents: [{ id: drop.getId() }] }, f.getBlob(), { convert: true, supportsAllDrives: true });
          seenX[f.getId() + '@' + f.getLastUpdated().getTime()] = g.id;
          out.push({ k: k, id: g.id, name: nm, ver: g.id, drop: 1 });
        } catch (e) { Logger.log('wtm xlsx: ' + e.message); }
      }
    }
    P.setProperty('WT_MG_XLS', JSON.stringify(seenX).slice(0, 8500));
  } catch (e) { Logger.log('wtm drop: ' + e.message); }
  return out;
}
/** thông tin gói (khu vực, tỉnh, CĐT, tên gói) theo số TBMT: gói đang theo dõi ⇒ dữ liệu Báo Đấu Thầu */
function wtmInfo_(bare, h, ctx) {
  const I = (h && h.info) || {}, F = I.fields || {};
  let inv = h ? (wtS_(I.investor) || (h.investor !== '(đang tra)' ? h.investor : '')) : '', name = h ? (wtS_(I.bidName) || h.name) : '', place = wtS_(I.prov) || wtS_(F['Địa điểm thực hiện gói thầu']);
  if (!inv || !place) {
    if (!ctx.byNo) {
      ctx.byNo = {};
      const d = ctx.data || (ctx.data = wtLoad_(wtBook_()));
      ['tbmt', 'kqdt'].forEach(function (t) { d[t].forEach(function (r) { const b = wtmBare_(r.no); if (b && !ctx.byNo[b]) ctx.byNo[b] = r; }); });
      wtHits_(wtBook_()).forEach(function (x) { const b = wtmBare_(x.no); if (b && !ctx.hit) ctx.hit = {}; if (b) ctx.hit[b] = ctx.hit[b] || x; });
    }
    const r = ctx.byNo[bare], hx = !h && ctx.hit ? ctx.hit[bare] : null;
    if (hx) return wtmInfo_(bare, hx, ctx);
    if (r) { inv = inv || r.inv; name = name || r.name; place = place || r.prov; }
  }
  const pr = wtdProvince_(place);
  return { region: pr[1], prov: pr[0] || place, inv: inv, name: name };
}

/** gộp: mỗi lượt ≤ WTM.BUDGET_MS; force ⇒ gộp lại cả file đã gộp */
function wtmMerge_(opt) {
  opt = opt || {};
  const sc = CacheService.getScriptCache();
  if (sc.get('wtm:run') && !opt.force) return { busy: true };
  sc.put('wtm:run', '1', 330);
  const t0 = Date.now(), res = { hh: 0, nt: 0, rows: 0, skip: [], left: 0 }, ctx = {};
  try {
    const S = wtmSources_(opt.force), B = {}, reg = {};
    ['hh', 'nt'].forEach(function (k) {
      B[k] = wtmBook_(k);
      const last = B[k].src.getLastRow();
      reg[k] = {};
      if (last > 1) B[k].src.getRange(2, 1, last - 1, WTM.SRC_HEAD.length).getValues().forEach(function (r, i) { reg[k][wtS_(r[0])] = { row: i + 2, file: wtS_(r[2]), ver: wtS_(r[4]) }; });
    });
    const seenVer = {}; ['hh', 'nt'].forEach(function (k) { Object.keys(reg[k]).forEach(function (n) { seenVer[reg[k][n].ver] = 1; }); });
    const todo = S.filter(function (s) { return opt.force || !seenVer[s.ver]; });
    for (let i = 0; i < todo.length; i++) {
      if (Date.now() - t0 > WTM.BUDGET_MS) { res.left = todo.length - i; break; }
      const s = todo[i];
      let V; try { V = SpreadsheetApp.openById(s.id).getSheets()[0].getDataRange().getValues(); } catch (e) { res.skip.push(s.name + ': không mở được (' + e.message + ')'); continue; }
      const p = wtmParse_(V, s.name, s.k || null);
      if (p.skip) { res.skip.push(s.name + ': ' + p.skip); const kk = s.k || 'hh'; wtmReg_(B[kk], reg[kk], s.k ? (wtmBare_((s.h && s.h.no) || (String(s.name).match(/IB\d{10}/i) || [''])[0]) || 'x:' + s.id) : 'x:' + s.id, s, 0, p.skip); continue; }
      const k = p.kind, bare = wtmBare_(p.no || (s.h && s.h.no));
      if (!bare) { res.skip.push(s.name + ': không đọc được số TBMT'); continue; }
      const cur = reg[k][bare];
      if (!opt.force && cur && cur.ver === s.ver) continue;
      const info = wtmInfo_(bare, s.h || null, ctx), now = wtNow_();
      const rows = p.rows.map(function (r) { return [info.region, info.prov, info.inv, info.name || p.name, p.no || bare].concat(r, [s.name, now, bare]); });
      wtmDrop_(B[k], bare);
      if (rows.length) B[k].sh.getRange(B[k].sh.getLastRow() + 1, 1, rows.length, B[k].head.length).setValues(rows);
      wtmReg_(B[k], reg[k], bare, s, rows.length, p.miss.length ? 'thiếu cột: ' + p.miss.slice(0, 6).join(', ') + (p.miss.length > 6 ? '…' : '') : '');
      res[k]++; res.rows += rows.length;
    }
  } catch (e) { res.err = String(e.message || e); }
  finally { sc.remove('wtm:run'); }
  res.ms = Date.now() - t0;
  PropertiesService.getScriptProperties().setProperty('WT_MG_LAST', JSON.stringify({ at: wtNow_(), hh: res.hh, nt: res.nt, rows: res.rows, left: res.left, skip: res.skip.length, err: res.err || '' }));
  return Object.assign(res, { urls: wtmUrls_() });
}
function wtmReg_(B, reg, bare, s, n, note) {
  const row = [bare, s.drop ? 'thủ công' : 'bot', s.id, s.name, s.ver, n, wtNow_(), note || ''];
  if (reg[bare]) B.src.getRange(reg[bare].row, 1, 1, row.length).setValues([row]);
  else { B.src.appendRow(row); reg[bare] = { row: B.src.getLastRow(), file: s.id, ver: s.ver }; }
  reg[bare].ver = s.ver;
}

/** trigger 15 phút (tự cài ở wtEnsureTrig_) */
function wtmTick() {
  const t0 = Date.now();
  try { wtmMerge_({}); } catch (e) { Logger.log('wtmTick: ' + e.message); }
  // tab "Tổng hợp gói thầu" (MMH_WatchTarget.gs) — ≤ 1 lần / 30 phút, chỉ khi lượt gộp còn đủ thời gian
  if (Date.now() - t0 < 150000) { try { wttSumBuild_(false); } catch (e) { Logger.log('wttSumBuild_: ' + e.message); } }
}
/** chạy tay trong trình soạn: gộp lại tất cả */
function wtmMergeAll() { return wtmMerge_({ force: true }); }
