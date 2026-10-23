/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  KpiBackOffice.gs                           v1.1 (23/10/2026)
   v1.1 — theo review của nhóm Back office: P5-05 VAT chưa áp dụng quý 1 (KSC_BO.FROM), rule P1-00 / P2-07 / P5-01 viết lại.
   NGUỒN 8 · BACK OFFICE — file "Back Office KPI Tracking FY68" (backend của nhóm Back office)
   ────────────────────────────────────────────────────────────────────
   Trước đây các dòng P1 → P5 của 3. Detail KPI kéo số bằng IMPORTRANGE (sheet "KPI FY68" của file Back Office).
   Nay KpiSyncCenter đọc thẳng file Back Office như các nhóm Sales / MKT / Training:
     · Sửa tay trên file Back Office ⇒ chạy ngay (trigger khi sửa) · đọc lại toàn bộ 15 phút / lần.
     · Số tháng = sheet "KPI FY68" của file Back Office (cột "<yyyymm>"), công thức do nhóm Back office giữ —
       mỗi mã đã tính đúng Rule ở sheet 4. Rule (nhóm 11 → 15). Code chỉ áp thêm 3 điểm của Rule mà sheet đó chưa làm:
         ① P2-08 Số đăng ký sản phẩm: Rule = LŨY KẾ (target 10 đến T8/2027) ⇒ Actual tháng = tổng số được cấp từ T9 đến tháng đó;
            FY68 Actual = tháng cuối có số (cột FY68 Actual của 3. Detail KPI đổi sang LOOKUP thay cho SUM).
         ② P3-00 Số tháng tồn kho: chỉ ghi tháng đã có Stock Amount và Cost of sale (sheet Inventory) — sheet KPI FY68 tự ra
            150 điểm cho tháng chưa có số tồn kho.
         ③ Ô trống ở file Back Office: ô có công thức (số auto) ⇒ để trống ở file KPI; ô gõ tay ("tự nhập") còn trống ⇒ giữ số đang có.
     · Dòng tổng của 3. Detail KPI (P2-04, P5-01, P5-01a…) giữ công thức như cũ.
     · Lần đầu: ô IMPORTRANGE được thay bằng số (công thức cũ lưu ở _SYNC_REPLACED), tháng chưa tới để trống.
   Tab "KPI Back Office" (trong file Back Office, cùng bố cục tab "9. TARGET & KPI" của CRM, tên KPI tiếng Việt) ghi lại mỗi lượt.
   Đổi file: Script Property KSC_ID_BO (mặc định KSC_BO.ID).
   ════════════════════════════════════════════════════════════════════ */
var KSC_BO = {
  ID      : '1RM7Ijh0XLcpMXEwMQrE7HY8HamKVocMa1N5H72yD3I8',   // Back Office KPI Tracking FY68
  CODE_RE : /^P\d+-\d+[a-z]?$/,
  TAB     : 'KPI Back Office',
  CUMUL   : { 'P2-08': 1 },                                    // Rule: lũy kế từ tháng đầu năm tài chính
  FROM    : { 'P5-05': 202612 },                               // 23/10/2026 (nhóm Back office): VAT chưa áp dụng quý 1 ⇒ trước tháng này để trống ở file KPI
  INV     : { code: 'P3-00', sheet: 'Inventory', stock: /^stock amount/, cogs: /^cost of sale/ },
  GROUPS  : { P1: 'Tài liệu nội bộ', P2: 'Đơn hàng & giao nhận', P3: 'Tồn kho', P4: 'Dự án văn phòng', P5: 'Tài chính & hành chính' },
  NAMES   : {
    'P1-00': 'Tài liệu nội bộ ban hành / sửa đổi',
    'P2-00': 'Hiệu quả xử lý & giao đơn hàng',
    'P2-01': 'Điểm giao hàng',
    'P2-02': 'Xác nhận lịch giao đúng hạn',
    'P2-03': 'Xác nhận đơn hàng đúng hạn',
    'P2-04': 'Điểm xử lý đơn hàng',
    'P2-05': 'Thông quan đúng hạn',
    'P2-06': 'Nhập đơn Bravo đúng & kịp',
    'P2-07': 'Chuẩn bị hồ sơ thầu',
    'P2-08': 'Số đăng ký sản phẩm · Việt Nam (lũy kế)',
    'P3-00': 'Số tháng tồn kho (điểm)',
    'P4-00': 'Dự án chuyển văn phòng',
    'P5-00': 'Điểm tài chính & hành chính',
    'P5-01': 'Điểm báo cáo Back-office',
    'P5-02': 'Ghi nhận giao dịch ngân hàng',
    'P5-03': 'Kiểm soát chi phí',
    'P5-04': 'Phân bổ chi phí',
    'P5-05': 'Xuất hoá đơn VAT đúng hạn',
    'P5-06': 'Dự án hành chính (dữ liệu cá nhân, lao động, webapp)',
    'P5-07': 'Kê khai thuế'
  },
  RULES   : {
    'P1-00': 'Số tài liệu nội bộ (SOP / hướng dẫn) ban hành mới hoặc sửa đổi, chỉ tính khi đã được duyệt và ban hành · sheet Internal Docs (lấy từ 0. MMH Regulation/SOP/Guideline Master), đếm theo cột Month (K) với PIC (L) = Dam Ha.',
    'P2-01': 'Mỗi PO: giao sớm 110 · đúng lịch 100 · trễ 80 · điểm tháng = trung bình các PO (sheet PO Confirm, Delivery, VAT).',
    'P2-02': 'Số đơn xác nhận lịch giao "Đúng hạn" ÷ số đơn có xác nhận lịch giao trong tháng (sheet PO Confirm, Delivery, VAT).',
    'P2-03': 'Số đơn NPP được phản hồi "On time" ÷ số đơn nhận được trong tháng (sheet PO Confirm, Delivery, VAT).',
    'P2-04': '100 điểm mỗi tháng, trừ theo từng lỗi ghi ở sheet Order Processing · điểm tháng = trung bình của PIC.',
    'P2-05': 'Mỗi lô hàng: thông quan trong 2 ngày từ thông báo hàng đến 110 · 3 ngày 100 · quá 3 ngày 80 · trung bình tháng (sheet Import Export).',
    'P2-06': 'Số PO nhập Bravo "Nhập đúng" ÷ số PO đã nhập trong tháng (sheet Bravo Data Entry).',
    'P2-07': 'Tỷ lệ = số hồ sơ thầu chuẩn bị đúng hạn ÷ số hồ sơ đã nhận trong tháng, quy đổi sang thang điểm 100 · sheet KPI FY68.',
    'P2-08': 'Số giấy chứng nhận đăng ký sản phẩm Việt Nam được cấp (sheet Registration cert granted, theo tháng cấp) · LŨY KẾ từ tháng 9, FY = tháng cuối có số.',
    'P3-00': 'Số tháng tồn kho = giá trị tồn kho ÷ giá vốn (COGS) tháng · 2,0 tháng = 100 điểm, mỗi 10% chênh lệch cộng / trừ 5 điểm (sheet Inventory) · tháng chưa có số tồn kho để trống.',
    'P4-00': '100 điểm khi đúng tiến độ và nộp đủ báo cáo tháng dự án chuyển văn phòng · tự nhập ở sheet KPI FY68.',
    'P5-01': 'Tính theo thời gian nộp (không tính lỗi sai): mỗi báo cáo nộp sớm 110 · đúng hạn 100 · muộn trừ 3 điểm mỗi ngày làm việc trễ · điểm tháng = trung bình của PIC (sheet Back-office Reporting).',
    'P5-01a': 'Điểm báo cáo của Hoa = trung bình điểm báo cáo của Mai, Dam Viet, Ngoc (dòng tổng trong file KPI).',
    'P5-02': 'Giao dịch ngày D nhập trước 17:00 ngày D+1 (trước 12:00 = 110) · điểm tháng = trung bình các ngày làm việc (sheet Bank Transaction).',
    'P5-03': 'Rà soát chi phí xong trong 5 ngày làm việc đầu tháng · trước hạn 110 · đúng hạn 100 · trừ 3 mỗi lỗi / ngày trễ (sheet Expense Review).',
    'P5-04': 'Nộp phân bổ chi phí trước 12:00 ngày làm việc thứ 4 của tháng sau (sheet Cost Allocation).',
    'P5-05': 'Số hoá đơn VAT xuất "On time" ÷ số hoá đơn đã xuất trong tháng (sheet PO Confirm, Delivery, VAT) · Q1 FY68 (T9 → T11/2026) chưa áp dụng, chưa tính KPI cho ai; từ quý 2 chuyển cho Mai.',
    'P5-06': '100 điểm khi nộp báo cáo tháng dự án hành chính · tự nhập ở sheet KPI FY68.',
    'P5-07': '100 điểm mỗi tháng · trừ 3 mỗi lỗi không phát sinh nộp chậm, trừ 5 mỗi lỗi có nộp chậm (sheet Tax Filling).'
  }
};
function kscBoId_() { var v = ''; try { v = PropertiesService.getScriptProperties().getProperty('KSC_ID_BO') || ''; } catch (e) {} return v || KSC_BO.ID; }
/* tên tiếng Việt gọn: bảng NAMES, mã con "P2-04a" ⇒ tên mã cha + " · <tên người>" */
function kscBoName_(code, en) {
  if (KSC_BO.NAMES[code]) return KSC_BO.NAMES[code];
  var base = KSC_BO.NAMES[String(code).replace(/[a-z]$/, '')], who = /\s[–—-]\s*([^–—-]+)$/.exec(String(en || ''));
  if (base) return base + (who ? ' · ' + who[1].trim() : '');
  return String(en || code).replace(/\s+/g, ' ').trim();
}
function kscBoRule_(code) { return KSC_BO.RULES[code] || KSC_BO.RULES[String(code).replace(/[a-z]$/, '')] || 'Số tháng ở sheet KPI FY68 của file Back Office.'; }

/* đọc sheet "KPI FY68" (tiêu đề: KPI Code · Parent · KPI Group · Detail KPI · Unit · Agg · <yyyymm>… · Ghi chú · nguồn) */
function kscBoRead_(bss, fy) {
  var sh = bss.getSheetByName('KPI ' + fy);
  if (!sh) bss.getSheets().forEach(function (s) { if (!sh && /^kpi fy\d+$/.test(kscNorm_(s.getName())) && !s.isSheetHidden()) sh = s; });
  if (!sh) return { err: 'File Back Office không có sheet "KPI ' + fy + '"' };
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 40);
  if (lr < 2) return { err: 'Sheet "' + sh.getName() + '" chưa có dữ liệu' };
  var rg = sh.getRange(1, 1, lr, lc), V = rg.getValues(), F = rg.getFormulas(), hr = -1, cc = -1;
  for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) for (var j = 0; j < lc; j++) if (kscNorm_(V[i][j]) === 'kpi code') { hr = i; cc = j; break; }
  if (hr < 0) return { err: 'Sheet "' + sh.getName() + '" không có ô tiêu đề "KPI Code"' };
  var mCol = {}, C = {};
  for (j = 0; j < lc; j++) {
    var h = String(V[hr][j]).replace(/\.0+$/, '').trim(), up = hr > 0 ? String(V[hr - 1][j]).trim() : '';
    var m = /^(\d{6})$/.exec(h) || /^(\d{6})\s*actual$/i.exec(h) || /^(\d{6})\s*actual$/i.exec(up);
    if (m) { mCol[Number(m[1])] = j; continue; }
    var k = kscNorm_(h) || kscNorm_(up); if (k && C[k] == null) C[k] = j;
  }
  function col(re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; }
  var cName = col(/^detail kpi/), cUnit = col(/^unit/), cAgg = col(/^agg/), cNote = col(/^ghi chu/), cSrc = col(/^nguon/), rows = {};
  for (var r = hr + 1; r < lr; r++) {
    var code = String(V[r][cc] || '').trim(); if (!KSC_BO.CODE_RE.test(code) || rows[code]) continue;
    var vals = {}, typed = {};
    Object.keys(mCol).forEach(function (ym) { var c = mCol[ym]; vals[ym] = V[r][c]; typed[ym] = !F[r][c]; });
    rows[code] = { row: r + 1, code: code, name: cName == null ? '' : String(V[r][cName] || '').replace(/\s+/g, ' ').trim(),
      unit: cUnit == null ? '' : String(V[r][cUnit] || '').trim(), agg: cAgg == null ? '' : String(V[r][cAgg] || '').trim(),
      note: cNote == null ? '' : String(V[r][cNote] || '').trim(), src: cSrc == null ? '' : String(V[r][cSrc] || '').trim(), vals: vals, typed: typed };
  }
  return { sheet: sh, rows: rows, months: Object.keys(mCol).map(Number).sort() };
}
/* sheet Inventory: tháng nào đã có Stock Amount và Cost of sale ⇒ { yyyymm: {stock, cogs} } (null nếu không đọc được bố cục) */
function kscBoInv_(bss) {
  var sh = bss.getSheetByName(KSC_BO.INV.sheet); if (!sh || sh.getLastRow() < 2) return null;
  var V = sh.getRange(1, 1, sh.getLastRow(), Math.min(sh.getLastColumn(), 30)).getValues(), hr = -1, mCol = {}, out = {}, rS = -1, rC = -1;
  V.forEach(function (row, i) {
    var hits = 0; row.forEach(function (x, j) { var m = /^(\d{6})\s*actual$/i.exec(String(x).trim()); if (m) { if (hr !== i) { mCol = {}; hr = i; } mCol[Number(m[1])] = j; hits++; } });
    var a = kscNorm_(row[0]);
    if (hr >= 0 && i > hr && rS < 0 && KSC_BO.INV.stock.test(a)) rS = i;
    if (hr >= 0 && i > hr && rC < 0 && KSC_BO.INV.cogs.test(a)) rC = i;
  });
  if (hr < 0 || rS < 0 || rC < 0) return null;
  Object.keys(mCol).forEach(function (ym) { var s = kscNum_(V[rS][mCol[ym]]), c = kscNum_(V[rC][mCol[ym]]); out[ym] = { stock: s, cogs: c, ok: !!(s && c) }; });
  return { sheet: sh, months: out };
}
/* 1 lần / dòng: ô Actual đang là IMPORTRANGE (số tràn ra cả hàng) ⇒ đổi thành số tĩnh, tháng chưa tới để trống
   (ghi từng ô, không ghi lại công thức khác: getFormulas của file định dạng VN trả dấu ";") */
function kscBoUnspill_(ctx, codes) {
  var L = ctx.L, ms = L.months, cols = ms.map(function (m) { return L.aCol[m]; }), n = 0, backups = [];
  codes.forEach(function (code) {
    var r = L.rows[code]; if (r == null) return;
    var hit = cols.filter(function (c) { return /IMPORTRANGE\s*\(/i.test(L.F[r][c] || ''); });
    if (!hit.length) return;
    hit.forEach(function (c) { backups.push([new Date(), 'bo', code, 'Actual (IMPORTRANGE)', "'" + L.F[r][c], L.V[r][c]]); });
    ms.forEach(function (m) {
      var c = L.aCol[m], f = L.F[r][c], v = L.V[r][c];
      if (f && !/IMPORTRANGE\s*\(/i.test(f)) return;                          // ô có công thức khác (dòng tổng…) giữ nguyên
      var x = m > ctx.curYm || v === null || v === undefined || kscIsErr_(v) ? '' : v;
      ctx.sh.getRange(r + 1, c + 1).setValue(x); L.F[r][c] = ''; L.V[r][c] = x;
    });
    n++;
  });
  if (backups.length) {
    var b = ctx.ss.getSheetByName(KSC.BACKUP);
    if (!b) { b = ctx.ss.insertSheet(KSC.BACKUP); b.getRange(1, 1, 1, 6).setValues([['Thời điểm', 'Nguồn', 'KPI Code', 'Tháng', 'Công thức cũ', 'Giá trị cũ']]).setFontWeight('bold'); try { b.hideSheet(); } catch (e2) {} }
    b.getRange(b.getLastRow() + 1, 1, backups.length, 6).setValues(backups);
  }
  return n;
}
/* mã lũy kế: FY Actual = tháng cuối có số (thay SUM) */
function kscBoFyLast_(ctx, code) {
  var L = ctx.L, r = L.rows[code]; if (r == null || L.fyA < 0) return false;
  var f = L.F[r][L.fyA] || ''; if (/LOOKUP\s*\(/i.test(f)) return false;
  if (f && !/^=\s*IF\s*\(\s*COUNT\s*\(/i.test(f)) return false;               // công thức người dùng tự đặt khác mẫu: giữ nguyên
  var ac = L.months.map(function (m) { return L.aCol[m]; }), a1 = kscColL_(Math.min.apply(null, ac) + 1), a2 = kscColL_(Math.max.apply(null, ac) + 1), row = r + 1;
  var nf = kscFx_(ctx.ss, '=IF(COUNT(' + a1 + row + ':' + a2 + row + ')=0,"",LOOKUP(10^300,' + a1 + row + ':' + a2 + row + '))');
  ctx.sh.getRange(row, L.fyA + 1).setFormula(nf); L.F[r][L.fyA] = nf;
  return true;
}
function kscBo_(ctx, why) {
  var bid = kscBoId_(), bss = SpreadsheetApp.openById(bid), L = ctx.L, PP = PropertiesService.getScriptProperties(), force = PP.getProperty('KSC_BO_LASTID') !== bid;
  var out = { title: kscLabel_('bo'), file: bss.getName(), sheet: '', rules: {}, codeUrls: {} };
  var B = kscBoRead_(bss, L.fy);
  if (B.err) { out.status = 'error'; out.msg = B.err; out.codes = []; return out; }
  out.sheet = B.sheet.getName();
  try { out.url = kscUrl_(bss, B.sheet); } catch (eu) {}
  var inv = null; try { inv = kscBoInv_(bss); } catch (eI) {}
  var codes = Object.keys(B.rows).filter(function (c) { return L.rows[c] != null; }), missing = Object.keys(B.rows).filter(function (c) { return L.rows[c] == null; });
  var un = kscBoUnspill_(ctx, codes), fyFix = [], notes = [], data = {};
  codes.forEach(function (code) {
    var x = B.rows[code], d = {}, run = 0, cum = !!KSC_BO.CUMUL[code];
    out.rules[code] = kscBoRule_(code);
    var srcSh = x.src ? bss.getSheetByName(x.src.trim()) : null;
    try { out.codeUrls[code] = kscUrl_(bss, srcSh || B.sheet); } catch (e0) {}
    L.months.forEach(function (m) {
      if (m > ctx.curYm) return;
      var v = x.vals[m], n = kscNum_(v);
      if (v === undefined) return;                                       // file Back Office không có cột tháng này
      if (typeof v === 'string' && v.trim() && n == null) { if (notes.length < 6) notes.push(code + ' ' + m + ': "' + v.slice(0, 20) + '"'); return; }
      if (KSC_BO.FROM[code] && m < KSC_BO.FROM[code]) { d[m] = KSC_CLEAR; return; }   // KPI chưa áp dụng tháng này
      if (cum) { if (n != null) run += n; if (n != null || run) d[m] = run; return; }
      if (code === KSC_BO.INV.code && inv && inv.months[m] && !inv.months[m].ok) { d[m] = KSC_CLEAR; return; }
      if (n != null) d[m] = n;
      else if (!x.typed[m]) d[m] = KSC_CLEAR;                            // ô công thức (auto) trống ⇒ trống ở file KPI
    });
    data[code] = d;
    if (cum && kscBoFyLast_(ctx, code)) fyFix.push(code);
  });
  out.codes = codes.filter(function (c) { var r = L.rows[c]; return !L.months.some(function (m) { return kscKind_(L.F[r][L.aCol[m]]) === 'calc'; }); });   // dòng tổng giữ nhãn "Công thức dòng tổng"
  var st = kscWrite_(ctx, 'bo', data, { why: why, force: force });
  PP.setProperty('KSC_BO_LASTID', bid);
  var tabMsg = '';
  try { var tb = kscBoSheet_(bss, ctx, B, inv, why === 'manual'); tabMsg = ' · tab "' + tb.tab + '" ' + (tb.changed ? 'đã cập nhật' : 'không đổi'); }
  catch (eTab) { tabMsg = ' · ⚠ chưa ghi được tab ' + KSC_BO.TAB + ': ' + (eTab && eTab.message || eTab); }
  var auto = codes.filter(function (c) { return L.months.some(function (m) { return m <= ctx.curYm && B.rows[c].vals[m] !== undefined && !B.rows[c].typed[m]; }); }).length;
  return kscResult_(out, st, 'File "' + bss.getName() + '" ▸ ' + B.sheet.getName() + ' · ' + codes.length + ' mã (' + auto + ' mã công thức, ' + (codes.length - auto) + ' mã tự nhập)' +
    (un ? ' · bỏ IMPORTRANGE ở ' + un + ' dòng' : '') + (fyFix.length ? ' · FY Actual = tháng cuối: ' + fyFix.join(', ') : '') +
    (inv ? '' : ' · ⚠ không đọc được sheet Inventory (P3-00 lấy nguyên số sheet KPI)') +
    (missing.length ? ' · file KPI chưa có mã: ' + missing.join(', ') : '') + (notes.length ? ' · ô không phải số: ' + notes.join('; ') : '') + tabMsg);
}

/* ════════════════ TAB "KPI Back Office" (bố cục 9. TARGET & KPI · KpiGroupSheets.gs) ════════════════ */
function kscBoSheet_(bss, ctx, B, inv, force) {
  var L = ctx.L, cur = ctx.curYm, months = kg8Months_(L), mC = L.H['members involved'], pC = L.H['parent'], gC = L.H['group code'];
  var all = Object.keys(L.rows).filter(function (c) { return KSC_BO.CODE_RE.test(c); }).sort(function (a, b) { return L.rows[a] - L.rows[b]; });
  var parents = {}; if (pC != null) all.forEach(function (c) { var p = String(L.V[L.rows[c]][pC] || '').trim(); if (p) parents[p] = 1; });
  var leaves = all.filter(function (c) { return !parents[c]; });                // dòng tổng (P2-00, P2-04, P5-00, P5-01) không lặp lại ở từng PIC
  var items = [], byPic = {}, order = [];
  leaves.forEach(function (c) {
    var en = String(L.V[L.rows[c]][L.H['detail kpi']] || '').replace(/\s+/g, ' ').trim();
    var it = kg8Item_(L, c, cur, months, { name: kscBoName_(c, en), src: kscBoRule_(c) });
    items.push(it);
    var mem = kscMembersOf_(mC == null ? '' : L.V[L.rows[c]][mC]);
    if (!mem.length) mem = ['Chưa phân công'];
    mem.forEach(function (p) { if (!byPic[p]) { byPic[p] = { pic: p, role: '', rows: [] }; order.push(p); } byPic[p].rows.push(it); });
  });
  /* Phần A: nhóm P1 → P5, tách theo loại số (điểm · tỷ lệ % · số lượng) để không trung bình lẫn đơn vị */
  var gm = {}, groups = [];
  items.forEach(function (it) {
    var g = gC == null ? '' : String(L.V[L.rows[it.code]][gC] || '').trim(); if (!g) { var m0 = /^(P\d+)/.exec(it.code); g = m0 ? m0[1] : it.code; }
    var u = kscNorm_(it.unit), kind = /%/.test(it.unit) ? 'pct' : /point|diem/.test(u) ? 'pt' : 'n';
    var k = g + '|' + kind + '|' + it.agg;
    if (!gm[k]) {
      gm[k] = { code: g, name: (KSC_BO.GROUPS[g] || g) + (kind === 'pct' ? ' · tỷ lệ (TB)' : kind === 'pt' ? ' · điểm (TB)' : it.agg === 'LAST' ? ' · số lượng (lũy kế)' : ' · số lượng'), codes: [] };
      groups.push(gm[k]);
    }
    gm[k].codes.push(it.code);
  });
  /* Phần D: số tháng ở file Back Office + chi tiết tồn kho */
  var bRows = all.filter(function (c) { return B.rows[c]; }).map(function (c) {
    var x = B.rows[c], pct = /%/.test(x.unit), nf = {};
    var v = months.map(function (m, i) { var n = kscNum_(x.vals[m]); nf[4 + i] = pct ? '0.0%' : '#,##0.##'; return n == null ? '' : n; });
    var how = KSC_BO.CUMUL[c] ? 'Số được cấp từng tháng ⇒ file KPI ghi LŨY KẾ' : c === KSC_BO.INV.code ? 'Chỉ ghi tháng có Stock Amount + Cost of sale' : parents[c] ? 'Dòng tổng (file KPI tự tính)' : '';
    var auto = Object.keys(x.typed).some(function (m) { return !x.typed[m]; });
    return { v: [c, kscBoName_(c, x.name), auto ? 'Công thức' : 'Tự nhập', x.src || ''].concat(v).concat([how]), nf: nf };
  });
  var extra = [{ title: 'Số tháng ở file Back Office ▸ sheet ' + B.sheet.getName() + ' (KpiSyncCenter đọc từ đây ghi vào 3. Detail KPI)', empty: '(sheet chưa có mã KPI)',
    head: ['Mã KPI', 'Chỉ tiêu', 'Cách nhập', 'Sheet nguồn'].concat(months.map(function (m) { return 'T' + (m % 100); })).concat(['Ghi chú']), rows: bRows }];
  if (inv) {
    extra.push({ title: 'Tồn kho (sheet Inventory) · số tháng tồn kho = giá trị tồn kho ÷ giá vốn tháng', empty: '(chưa có số)',
      head: ['Tháng', 'Giá trị tồn kho (VND)', 'Giá vốn tháng (VND)', 'Số tháng tồn kho', 'Ghi vào P3-00?'],
      rows: months.filter(function (m) { return m <= cur && inv.months[m]; }).map(function (m) {
        var z = inv.months[m];
        return { v: [m, z.stock == null ? '' : z.stock, z.cogs == null ? '' : z.cogs, z.ok ? z.stock / z.cogs : '', z.ok ? 'Có' : 'Chưa (thiếu số)'],
                 nf: { 1: '#,##0', 2: '#,##0', 3: '0.00' }, tone: { 4: z.ok ? 'ok' : 'no' } };
      }) });
  }
  return kg8Render_(bss, KSC_BO.TAB, {
    title: 'MỤC TIÊU & KPI — BACK OFFICE', fy: L.fy, months: months, kpiUrl: kg8KpiUrl_(ctx),
    guide: 'Mỗi dòng = 1 mã KPI của nhóm Back office (P1 tài liệu · P2 đơn hàng & giao nhận · P3 tồn kho · P4 dự án · P5 tài chính & hành chính), đúng mã trong file MMH KPI ' + L.fy +
      '. KPI chung của nhiều người hiện ở từng người. Target từ file KPI · Actual = sheet ' + B.sheet.getName() + ' của file này.',
    srcText: bss.getName() + ' ▸ ' + B.sheet.getName() + ' ⇒ KpiSyncCenter ⇒ file KPI (3. Detail KPI) ⇒ tab này',
    pics: order.map(function (p) { return byPic[p]; }), groups: groups, extra: extra
  }, { key: 'bo_' + bss.getId(), force: force, tabColor: '#3A5CAA', index: 1 });
}

/* câu giải thích cho PDF (cách tính hiện ở dòng Rule, lấy từ kscPlainRule_) */
function kscBoExplain_(code, X, A, reach) {
  var info = {}; try { info = JSON.parse(PropertiesService.getScriptProperties().getProperty('KSC_SRCINFO_bo') || '{}'); } catch (e) {}
  X.label = 'Back Office KPI Tracking'; X.url = (info.codeUrls && info.codeUrls[code]) || info.url || ''; X.sheet = info.sheet || '';
  if (A == null) return ['Chưa có số trong kỳ.'];
  var u = /%/.test(X.unit) ? '' : /point|điểm/i.test(X.unit) ? ' điểm' : X.unit ? ' ' + X.unit : '';
  return [kscBoName_(code, '') + ': ' + A + u + (KSC_BO.CUMUL[code] ? ' (lũy kế từ tháng 9)' : '') + reach + '.'];
}
