/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  KpiGroupSheets.gs                         v1.0 (13/10/2026)
   Tab KPI cho từng nhóm, do KpiSyncCenter ghi lại sau MỖI lượt đồng bộ nguồn đó (≈ 1 phút sau khi dữ liệu đổi):
     · "KPI TRAINING FY68"  (file MMH - Training Master)       ⇐ kscTraining_  (kscTrainWriteBack_ → kscTrainSheet_)
         I.  Bảng mã KPI đào tạo: L1-00, L2-xx, C10-06, C10-03/04/05 (T&E — đào tạo khách hàng từ CRM), C3-10/C3-11 (Coaching)
         II. HOẠT ĐỘNG ĐÀO TẠO THEO PIC: mỗi PIC × tháng, Target ↔ Actual ↔ % theo loại (Nội bộ · Sản phẩm / Nội bộ · Kỹ năng /
             Khách hàng · External / Coaching) — giống tab "9. TARGET & KPI" của CRM
         III. Danh sách buổi đào tạo FY + Loại + Đủ điều kiện KPI? + lý do
     · "KPI MKT Offline"    (file 2. Vietnam - Marketing Offline FY68)          ⇐ kscMoff_ → kscMoffSheet_
     · "KPI MKT Online"     (file 3. Vietnam - Digital Marketing & Design FY68) ⇐ kscMkt_  → kscMktSheet_
   Target / Actual lấy từ 3. Detail KPI (sau khi KpiSyncCenter vừa ghi). Màu % đạt (giống CRM / Report Hub):
     < 90% xám · 90–<100% xanh · 100–120% vàng · > 120% xanh lá · tháng đã tới mà Target = 0 ⇒ 100%.
   Tab ghi lại toàn bộ khi nội dung đổi (so mã băm), không đổi ⇒ chỉ cập nhật dòng "Cập nhật lúc". KHÔNG gõ tay vào các tab này.
   Coaching chỉ tính khi thư mục buổi (cột Training Folder) có thư mục con "Review" chứa file PDF (kscCoachPdf_, đệm CacheService).
   T&E (Category Customer Training) chỉ tính khi T&E Actual > 0 và review đủ 5 dòng mẫu (kscTeReview_).
   Không dùng dịch vụ Google mới (SpreadsheetApp, DriveApp, CacheService, PropertiesService).
   ════════════════════════════════════════════════════════════════════ */
var KGS = {
  TONE : { low: '#E7E9EE', mid: '#CFE2F3', ok: '#FFE599', top: '#B6D7A8' },
  NAVY : '#003047', BLUE: '#3A5CAA', SOFT: '#CFE2F3', PALE: '#F0F7FF', ALT: '#F6F8FB', LINE: '#E6EAEF', INK: '#1F2937', MUTED: '#6B7280',
  KINDS: [
    { k: 'product', label: 'Nội bộ · Sản phẩm' },
    { k: 'skill',   label: 'Nội bộ · Kỹ năng' },
    { k: 'te',      label: 'Khách hàng · External / T&E' },
    { k: 'coach',   label: 'Coaching' }
  ],
  PDF_OK_TTL: 21600, PDF_NO_TTL: 90, PDF_MAX_LOOKUPS: 40,
  TE_LINES: [['so luong tham du thuc te', 'actual attendees'], ['tom tat hoat dong', 'activity summary'], ['phan hoi khach hang', 'customer feedback'],
             ['doanh so', 'sales'], ['hanh dong tiep theo', 'next actions']],
  TE_LABELS: ['-Số lượng tham dự thực tế:', '-Tóm tắt hoạt động:', '-Phản hồi khách hàng:', '-Doanh số:', '-Hành động tiếp theo:']
};

/* ════════════════ ĐIỀU KIỆN TÍNH (dùng ở kscTrainSessions_) ════════════════ */
/* review đào tạo khách hàng đủ 5 dòng mẫu có nội dung (VN hoặc EN) ⇒ { ok, missing:[nhãn] } */
function kscTeReview_(txt) {
  var t = kscNorm_(String(txt || '').replace(/\r/g, '').replace(/\n/g, ' \u0001 ')).replace(/ \u0001 /g, '\n'), hits = [];
  KGS.TE_LINES.forEach(function (alts, i) {
    alts.forEach(function (alt) {
      var re = new RegExp('(^|\\n)[ \\t]*[-•*]?[ \\t]*' + alt.replace(/ /g, '\\s+') + '[ \\t]*:', 'g'), m;
      while ((m = re.exec(t))) hits.push({ i: i, start: m.index + m[1].length, end: m.index + m[0].length });
    });
  });
  hits.sort(function (a, b) { return a.start - b.start; });
  var ok = {};
  hits.forEach(function (h, k) { var next = k + 1 < hits.length ? hits[k + 1].start : t.length; if (t.slice(h.end, next).replace(/[\s\-–•*.…:]+/g, '').length) ok[h.i] = true; });
  var missing = KGS.TE_LABELS.filter(function (x, i) { return !ok[i]; });
  return { ok: !missing.length, missing: missing };
}
/* buổi Coaching: thư mục buổi có thư mục con "Review" chứa ≥ 1 PDF ⇒ { ok, why }. Đệm: có PDF 6 giờ, chưa có 90 giây */
function kscCoachPdf_(sid, url, budget) {
  var C = CacheService.getScriptCache(), key = 'kscpdf_' + String(sid || url).replace(/[^\w-]/g, '').slice(0, 200);
  try { var hit = C.get(key); if (hit) return JSON.parse(hit); } catch (e) {}
  if (budget && budget.n <= 0) return { ok: false, why: 'chưa kiểm được thư mục Review trong lượt này (sẽ kiểm lượt sau)' };
  if (budget) budget.n--;
  var m = /\/folders\/([\w-]{10,})/.exec(url || '') || /[?&]id=([\w-]{10,})/.exec(url || '') || /\/d\/([\w-]{10,})/.exec(url || '');
  var res;
  if (!m) res = { ok: false, why: 'chưa có thư mục buổi (cột Training Folder)' };
  else {
    try {
      var f = DriveApp.getFolderById(m[1]), it = f.getFolders(), review = 0, pdf = false;
      while (it.hasNext() && !pdf) {
        var sub = it.next(); if (kscNorm_(sub.getName()) !== 'review') continue;
        review++;
        if (sub.getFilesByType('application/pdf').hasNext()) pdf = true;
      }
      res = pdf ? { ok: true, why: 'có PDF Review' } : { ok: false, why: review ? 'thư mục Review chưa có file PDF' : 'chưa có thư mục Review' };
    } catch (e) { res = { ok: false, why: 'không mở được thư mục buổi (quyền Drive)' }; }
  }
  try { C.put(key, JSON.stringify(res), res.ok ? KGS.PDF_OK_TTL : KGS.PDF_NO_TTL); } catch (e) {}
  return res;
}
/* loại hoạt động đào tạo của 1 buổi */
function kscTrainKind_(type, catKey) {
  var t = kscNorm_(type);
  if (t.indexOf('coaching') === 0) return 'coach';
  if (t.indexOf('external') === 0) return 'te';
  return catKey === 'product' ? 'product' : 'skill';
}
function kscRuleKind_(rule) {
  if (rule.type === 'coaching') return 'coach';
  if (rule.type === 'external') return 'te';
  return rule.cat === 'product' ? 'product' : 'skill';
}

/* ════════════════ BỘ DỰNG TAB (giá trị + màu + định dạng theo lô) ════════════════ */
function kgsNew_(nc) { return { nc: nc, v: [], bg: [], fw: [], fc: [], nf: [], fs: [] }; }
function kgsRow_(B, vals, o) {
  o = o || {};
  var r = [], i;
  for (i = 0; i < B.nc; i++) {
    var x = i < vals.length ? vals[i] : '';
    if (x === null || x === undefined || (typeof x === 'number' && !isFinite(x))) x = '';
    if (typeof x === 'string' && /^[=+]/.test(x)) x = "'" + x;            // không để chữ bị hiểu là công thức
    r.push(x);
  }
  var f = function (d) { var a = []; for (var j = 0; j < B.nc; j++) a.push(d); return a; };
  B.v.push(r); B.bg.push(f(o.bg || null)); B.fw.push(f(o.bold ? 'bold' : 'normal')); B.fc.push(f(o.fc || KGS.INK));
  B.nf.push(f(o.nf || 'General')); B.fs.push(f(o.size || 10));
  return B.v.length - 1;
}
function kgsSet_(B, r, c, o) {
  if (r < 0 || c < 0 || c >= B.nc) return;
  if (o.bg !== undefined) B.bg[r][c] = o.bg;
  if (o.fc) B.fc[r][c] = o.fc;
  if (o.bold) B.fw[r][c] = 'bold';
  if (o.nf) B.nf[r][c] = o.nf;
}
function kgsTone_(p) { if (p == null || isNaN(p)) return null; return p < 0.9 ? KGS.TONE.low : p < 1 ? KGS.TONE.mid : p <= 1.2 ? KGS.TONE.ok : KGS.TONE.top; }
function kgsPct_(t, a, reached) {
  if (!reached) return null;
  if (t === 0) return 1;                                               // rule KPI: Target = 0 ⇒ 100%
  if (t == null || a == null) return null;
  return a / t;
}
/* tiêu đề 2 dòng của bảng có cột tháng: 9 cột đầu + 12 × (Target · Actual · %) */
function kgsMonthHead_(B, lead, months) {
  var a = lead.slice(), b = lead.map(function () { return ''; });
  months.forEach(function (m) { a.push(kscMon_(m), '', ''); b.push('Target', 'Actual', '%'); });
  var r1 = kgsRow_(B, a, { bold: true, bg: KGS.NAVY, fc: '#FFFFFF' }), r2 = kgsRow_(B, b, { bold: true, bg: KGS.SOFT, fc: KGS.NAVY });
  return [r1, r2];
}
/* 1 dòng số liệu: lead (9 ô đầu, 5 chữ + FY Target · Target đến nay · Actual đến nay · % đến nay được tính ở đây) */
function kgsDataRow_(B, text5, cells, ytd, isPct, o) {
  o = o || {};
  var vals = text5.slice(0, 5);
  while (vals.length < 5) vals.push('');
  vals.push(ytd.fyT, ytd.t, ytd.a, ytd.p);
  cells.forEach(function (c) { vals.push(c.t, c.a, c.p); });
  var r = kgsRow_(B, vals, { bold: o.bold, bg: o.bg || null });
  var vf = isPct ? '0.0%' : '#,##0.##';
  [5, 6, 7].forEach(function (c) { kgsSet_(B, r, c, { nf: vf }); });
  kgsSet_(B, r, 8, { nf: '0%', bg: kgsTone_(ytd.p) || o.bg || null, bold: true });
  cells.forEach(function (c, i) {
    var base = 9 + i * 3, alt = i % 2 ? KGS.ALT : null;
    kgsSet_(B, r, base, { nf: vf, bg: o.bg || alt }); kgsSet_(B, r, base + 1, { nf: vf, bg: o.bg || alt });
    kgsSet_(B, r, base + 2, { nf: '0%', bg: kgsTone_(c.p) || o.bg || alt });
  });
  kgsSet_(B, r, 4, { fc: KGS.MUTED });
  return r;
}
/* số liệu tháng của 1 mã KPI từ 3. Detail KPI */
function kgsCodeCells_(L, r, cur) {
  var cAgg = L.H['agg'], agg = cAgg == null ? 'SUM' : String(L.V[r][cAgg] || '').trim().toUpperCase();
  if (/AVER/.test(agg)) agg = 'AVG';
  var cells = L.months.map(function (m) {
    var tc = L.tCol[m], ac = L.aCol[m];
    var t = tc == null ? null : kscNum_(L.V[r][tc]);
    var a = ac == null || kscKind_(L.F[r][ac]) === 'placeholder' ? null : kscNum_(L.V[r][ac]);
    return { t: t, a: a, p: kgsPct_(t, a, m <= cur) };
  });
  var ytdM = L.months.filter(function (m) { return m <= cur; });
  var t = kscPeriodVal_(L, r, ytdM, agg, 't'), a = kscPeriodVal_(L, r, ytdM, agg, 'a');
  return { cells: cells, ytd: { fyT: kscPeriodVal_(L, r, L.months, agg, 't'), t: t, a: a, p: kgsPct_(t, a, ytdM.length > 0) } };
}
/* bảng mã KPI: items = [{code, name, pic, rule}] */
function kgsCodeTable_(B, L, cur, items) {
  kgsMonthHead_(B, ['KPI Code', 'Detail KPI', 'PIC', 'Đơn vị', 'Cách tính', L.fy + ' Target', 'Target đến nay', 'Actual đến nay', '% đến nay'], L.months);
  var cU = L.H['unit'], n = 0;
  items.forEach(function (it) {
    var r = L.rows[it.code];
    if (r == null) { kgsRow_(B, [it.code, it.name || '', it.pic || '', '', 'File KPI chưa có mã này ở 3. Detail KPI'], { fc: KGS.MUTED }); return; }
    var unit = cU == null ? '' : String(L.V[r][cU] || '').trim(), X = kgsCodeCells_(L, r, cur);
    kgsDataRow_(B, [it.code, it.name || '', it.pic || '', unit, it.rule || ''], X.cells, X.ytd, /%/.test(unit));
    n++;
  });
  if (!items.length) kgsRow_(B, ['(chưa có mã KPI nào)'], { fc: KGS.MUTED });
  return n;
}
function kgsTitle_(B, title, sub) {
  kgsRow_(B, [title], { bold: true, fc: KGS.NAVY, size: 13 });
  kgsRow_(B, [sub || ''], { fc: KGS.MUTED });
  kgsRow_(B, ['']);
}
function kgsSection_(B, text) { kgsRow_(B, ['']); return kgsRow_(B, [text], { bold: true, fc: KGS.NAVY, bg: KGS.PALE, size: 11 }); }
function kgsListHead_(B, cols) { return kgsRow_(B, cols, { bold: true, bg: KGS.SOFT, fc: KGS.NAVY }); }
function kgsNow_() { return Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm'); }

/* ghi tab: so mã băm (bỏ dòng "Cập nhật lúc"), đổi ⇒ ghi lại toàn bộ, không đổi ⇒ chỉ cập nhật dòng 2 */
function kgsWrite_(ss, name, B, o) {
  o = o || {};
  var P = PropertiesService.getScriptProperties(), pk = 'KGS_H_' + o.key;
  var body = B.v.filter(function (r, i) { return i !== 1; });
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify([body, B.bg, ss.getId()])));
  var sh = ss.getSheetByName(name), isNew = !sh;
  if (!sh) sh = ss.insertSheet(name, Math.min(o.index == null ? 1 : o.index, ss.getSheets().length));
  if (!o.force && !isNew && P.getProperty(pk) === hash) { try { sh.getRange(2, 1).setValue(B.v[1][0]); } catch (e) {} return { tab: name, changed: false }; }
  var n = B.v.length, nc = B.nc;
  try { sh.setFrozenRows(0); sh.setFrozenColumns(0); } catch (e) {}
  sh.clear();
  try { sh.clearConditionalFormatRules(); } catch (e) {}
  if (sh.getMaxColumns() < nc) sh.insertColumnsAfter(sh.getMaxColumns(), nc - sh.getMaxColumns());
  if (sh.getMaxRows() < n + 5) sh.insertRowsAfter(sh.getMaxRows(), n + 5 - sh.getMaxRows());
  var rg = sh.getRange(1, 1, n, nc);
  rg.setValues(B.v);
  try {
    rg.setBackgrounds(B.bg); rg.setFontWeights(B.fw); rg.setFontColors(B.fc); rg.setNumberFormats(B.nf); rg.setFontSizes(B.fs);
    rg.setVerticalAlignment('middle'); rg.setFontFamily('Arial');
    sh.setFrozenRows(o.frozenRows || 2); sh.setFrozenColumns(o.frozenCols || 0);
    sh.setHiddenGridlines(true);
    if (o.widths) Object.keys(o.widths).forEach(function (c) { sh.setColumnWidth(Number(c), o.widths[c]); });
    if (o.tabColor) sh.setTabColor(o.tabColor);
  } catch (e) { Logger.log('kgs format ' + name + ': ' + e); }
  P.setProperty(pk, hash);
  return { tab: name, changed: true };
}
function kgsWidths_(lead, months, w) { var o = {}; lead.forEach(function (x, i) { o[i + 1] = x; }); for (var i = 0; i < months.length * 3; i++) o[10 + i] = w || 62; return o; }

/* ════════════════ KPI TRAINING FY68 (Training Master) ════════════════ */
function kscTrainSheet_(tss, ctx, targets, res, S, force) {
  var L = ctx.L, cur = ctx.curYm, months = L.months, name = KSC_TRAIN.OUT_PREFIX + L.fy, NC = Math.max(9 + months.length * 3, 15);
  var B = kgsNew_(NC);
  kgsTitle_(B, 'MMH TRAINING ⇄ KPI ' + L.fy + ' · số liệu tự động từ file KPI (KpiSyncCenter) · không gõ tay vào tab này',
    'Cập nhật lúc ' + kgsNow_() + ' · nguồn: ' + (S.sheets.join(', ') || '(không thấy sheet Training Report FYxx)') + ' · tự làm mới mỗi lần đồng bộ đào tạo (≈ 1 phút)');

  /* I. bảng mã KPI */
  kgsSection_(B, 'I. KPI ĐÀO TẠO (3. Detail KPI) · L1-00 sản phẩm · L2 kỹ năng · C10-03/04/05 đào tạo khách hàng T&E (CRM) · C10-06 External · C3-10/C3-11 Coaching');
  kgsCodeTable_(B, L, cur, targets.map(function (t) { return { code: t.code, name: t.name, pic: t.member, rule: t.rule.text }; }));

  /* II. ma trận theo PIC */
  var fyIdx = {}; months.forEach(function (m, i) { fyIdx[m] = i; });
  var pics = {}, order = [];
  function pic(nm) {
    var k = kscNorm_(nm); if (KSC_TRAIN.ALIAS[k]) { nm = KSC_TRAIN.ALIAS[k]; k = kscNorm_(nm); }
    if (!k || /^-/.test(k)) return null;
    if (!pics[k]) {
      pics[k] = { name: String(nm).trim(), kinds: {} };
      KGS.KINDS.forEach(function (x) { pics[k].kinds[x.k] = { t: months.map(function () { return null; }), a: months.map(function () { return 0; }), codes: [] }; });
      order.push(k);
    }
    return pics[k];
  }
  targets.forEach(function (t) {
    if (!t.member || /,/.test(t.member)) return;
    var P = pic(t.member); if (!P) return;
    var K = P.kinds[kscRuleKind_(t.rule)]; K.codes.push(t.code);
    months.forEach(function (m, i) { var c = L.tCol[m], v = c == null ? null : kscNum_(L.V[t.row][c]); if (v != null) K.t[i] = (K.t[i] || 0) + v; });
  });
  S.list.forEach(function (s) {
    if (fyIdx[s.ym] == null) return;
    String(s.trainer || '').split(/[,;\/&+\n]/).forEach(function (nm) {
      nm = nm.trim(); if (!nm) return;
      var P = pic(nm); if (!P) return;
      if (s.done && s.ym <= cur && s.ok) P.kinds[s.kind].a[fyIdx[s.ym]]++;
    });
  });
  kgsSection_(B, 'II. HOẠT ĐỘNG ĐÀO TẠO THEO PIC · Target (3. Detail KPI, theo PIC của dòng KPI) ↔ Actual (buổi Completed đủ điều kiện, theo Trainer) · % đạt: < 90% xám · 90–<100% xanh · 100–120% vàng · > 120% xanh lá');
  kgsMonthHead_(B, ['PIC', 'Loại hoạt động', 'Mã KPI', 'Đơn vị', 'Cách tính', L.fy + ' Target', 'Target đến nay', 'Actual đến nay', '% đến nay'], months);
  var HOW = { product: 'Internal · Category Product', skill: 'Internal · Category khác Product', te: 'External (gồm Customer Training từ CRM: Actual > 0, review đủ 5 dòng)', coach: 'Coaching · có PDF trong thư mục Review' };
  order.sort(function (a, b) { return pics[a].name.localeCompare(pics[b].name); });
  var nPic = 0;
  order.forEach(function (k) {
    var P = pics[k], rows = [], tot = { t: months.map(function () { return null; }), a: months.map(function () { return 0; }) };
    KGS.KINDS.forEach(function (x) {
      var K = P.kinds[x.k], hasT = K.t.some(function (v) { return v != null && v > 0; }), hasA = K.a.some(function (v) { return v > 0; });
      if (!hasT && !hasA && !K.codes.length) return;
      months.forEach(function (m, i) { if (K.t[i] != null) tot.t[i] = (tot.t[i] || 0) + K.t[i]; tot.a[i] += K.a[i]; });
      rows.push({ x: x, K: K });
    });
    if (!rows.length) return;
    nPic++;
    var mk = function (T, A) {
      var cells = months.map(function (m, i) { var reached = m <= cur; return { t: T[i], a: reached ? A[i] : null, p: kgsPct_(T[i], reached ? A[i] : null, reached) }; });
      var yt = null, ya = 0, fy = null, any = false;
      months.forEach(function (m, i) { if (T[i] != null) fy = (fy || 0) + T[i]; if (m <= cur) { any = true; if (T[i] != null) yt = (yt || 0) + T[i]; ya += A[i]; } });
      return { cells: cells, ytd: { fyT: fy, t: yt, a: any ? ya : null, p: kgsPct_(yt, any ? ya : null, any) } };
    };
    var X = mk(tot.t, tot.a);
    kgsDataRow_(B, [P.name, 'Tổng', '', 'buổi', ''], X.cells, X.ytd, false, { bold: true, bg: KGS.PALE });
    rows.forEach(function (o) { var Y = mk(o.K.t, o.K.a); kgsDataRow_(B, ['', o.x.label, o.K.codes.join(', '), 'buổi', HOW[o.x.k]], Y.cells, Y.ytd, false); });
  });
  if (!nPic) kgsRow_(B, ['(chưa có PIC nào có target hoặc buổi đào tạo trong ' + L.fy + ')'], { fc: KGS.MUTED });

  /* III. danh sách buổi */
  kgsSection_(B, 'III. DANH SÁCH BUỔI ĐÀO TẠO TRONG ' + L.fy);
  var KL = {}; KGS.KINDS.forEach(function (x) { KL[x.k] = x.label; });
  kgsListHead_(B, ['Session ID', 'Training Topic', 'Trainer', 'Loại', 'Training Type', 'Training Category', 'Actual Date', 'Month', 'Status',
    'Đủ điều kiện KPI?', 'Tính vào mã KPI', 'Lý do / ghi chú', 'Bằng chứng', 'Sheet · dòng']);
  var fy = [];
  S.list.forEach(function (s, i) { if (s.ym && fyIdx[s.ym] != null) fy.push([s, i]); });
  fy.sort(function (a, b) { return a[0].ym - b[0].ym || String(a[0].date).localeCompare(String(b[0].date)); });
  fy.forEach(function (p) {
    var s = p[0], hit = res.hits[p[1]] || [], note, ev = '';
    if (s.kind === 'coach') ev = s.done ? (s.pdf ? 'PDF Review ✓' : 'PDF Review: ' + (s.pdfWhy || 'chưa có')) : '';
    else if (s.kind === 'te' && s.isTe) ev = 'Actual ' + (s.teActual || 0) + ' · review ' + (s.teOk ? 'đủ 5 dòng' : 'thiếu');
    if (!s.done) note = 'Chưa tính: Status = ' + (s.status || '(trống)') + ', chỉ đếm Completed';
    else if (s.ym > cur) note = 'Tháng chưa tới';
    else if (!s.ok) note = 'Chưa tính: ' + (s.why || 'chưa đủ điều kiện');
    else if (!hit.length) note = 'Không khớp mã KPI nào (Trainer ' + (s.trainer || '(trống)') + ' / ' + s.type + ' / ' + (s.cat || 'không Category') + ') · vẫn tính ở bảng II';
    else note = 'Đã tính';
    var r = kgsRow_(B, [s.sid, s.topic, s.trainer, KL[s.kind] || '', s.type, s.cat, s.date, s.ym, s.status, hit.length && s.ok && s.done && s.ym <= cur ? 'Có' : 'Không',
      hit.join(', '), note, ev, s.sheet + ' · ' + s.row]);
    kgsSet_(B, r, 9, { bg: hit.length && s.ok && s.done && s.ym <= cur ? KGS.TONE.top : KGS.TONE.low, bold: true });
  });
  if (!fy.length) kgsRow_(B, ['(chưa có buổi đào tạo nào trong ' + L.fy + ')'], { fc: KGS.MUTED });
  return kgsWrite_(tss, name, B, { key: 'train', force: force, tabColor: KGS.BLUE, index: 1, frozenRows: 2, frozenCols: 2,
    widths: kgsWidths_([110, 260, 110, 150, 230, 80, 80, 80, 70], months) });
}

/* ════════════════ KPI MKT Offline (file 2. Vietnam - Marketing Offline FY68) ════════════════ */
function kscMoffSheet_(mss, ctx, X, force) {
  var L = ctx.L, cur = ctx.curYm, months = L.months, K = KSC_MOFF.CODES, NC = Math.max(9 + months.length * 3, 12), B = kgsNew_(NC);
  var mC = L.H['members involved'], nC = L.H['detail kpi'];
  var items = [K.comp, K.jz, K.evD, K.evS, K.ppD, K.ppS].map(function (c) {
    var r = L.rows[c];
    return { code: c, name: r == null || nC == null ? '' : String(L.V[r][nC] || '').replace(/\s+/g, ' ').trim(), pic: r == null || mC == null ? '' : String(L.V[r][mC] || '').trim(), rule: KSC_MOFF.RULES[c] };
  });
  kgsTitle_(B, 'KPI MKT OFFLINE ' + L.fy + ' · số liệu tự động (KpiSyncCenter đọc REPORT_EVENT ⇒ ghi 3. Detail KPI của file KPI) · không gõ tay vào tab này',
    'Cập nhật lúc ' + kgsNow_() + ' · nguồn: ' + mss.getName() + ' ▸ ' + KSC_MOFF.SHEET + ' · tự làm mới mỗi lần đồng bộ (≈ 1 phút sau khi sửa)');
  kgsSection_(B, 'I. KPI MKT OFFLINE (Target ở 3. Detail KPI · Actual = số KpiSyncCenter vừa ghi) · % đạt: < 90% xám · 90–<100% xanh · 100–120% vàng · > 120% xanh lá');
  kgsCodeTable_(B, L, cur, items);
  kgsSection_(B, 'II. DANH SÁCH SỰ KIỆN TRONG ' + L.fy + ' (REPORT_EVENT) · cột "Tính vào mã" cho biết sự kiện được cộng vào KPI nào');
  kgsListHead_(B, ['Month', 'Ngày', 'Event Name', 'Type of event', 'Segment', 'Detail event folder link', 'Actual Participant', 'Actual sales - Jizai', 'Actual sales - Composite', 'Tính vào mã', 'Ghi chú', 'Dòng']);
  var rows = X.rows.filter(function (r) { return months.indexOf(r.ym) >= 0; }).sort(function (a, b) { return a.ym - b.ym || a.row - b.row; });
  rows.forEach(function (e) {
    var codes = [], note = [];
    if (e.ym > cur) note.push('Tháng chưa tới');
    if (e.comp) codes.push(K.comp); if (e.jz) codes.push(K.jz);
    if (e.seg === 'D') { if (e.link) codes.push(K.evD); else note.push('chưa có folder link ⇒ chưa tính ' + K.evD); codes.push(K.ppD); }
    else if (e.seg === 'S') { if (e.link) codes.push(K.evS); else note.push('chưa có folder link ⇒ chưa tính ' + K.evS); codes.push(K.ppS); }
    else note.push('chưa ghi Segment ⇒ không tính C12 / C15');
    var r = kgsRow_(B, [e.ym, kscMoffDate_(e.date, e.ym), String(e.name || '').trim() || '(chưa ghi tên)', e.type, e.segRaw, e.link || '(chưa có)', e.pp, e.jz, e.comp,
      e.ym <= cur ? codes.join(', ') : '', note.join(' · '), e.row]);
    [6, 7, 8].forEach(function (c) { kgsSet_(B, r, c, { nf: '#,##0' }); });
    if (!e.link) kgsSet_(B, r, 5, { fc: '#B45309' });
  });
  if (!rows.length) kgsRow_(B, ['(chưa có sự kiện nào trong ' + L.fy + ')'], { fc: KGS.MUTED });
  return kgsWrite_(mss, 'KPI MKT Offline', B, { key: 'moff_' + mss.getId(), force: force, tabColor: '#C0392B', index: 1, frozenRows: 2, frozenCols: 2,
    widths: kgsWidths_([80, 230, 110, 90, 260, 80, 80, 80, 70], months) });
}

/* ════════════════ KPI MKT Online (file 3. Vietnam - Digital Marketing & Design FY68) ════════════════ */
function kscMktSheet_(mss, ctx, X, force) {
  var L = ctx.L, cur = ctx.curYm, months = L.months, K = KSC_MKT.CODES, NC = Math.max(9 + months.length * 3, 16), B = kgsNew_(NC);
  var mC = L.H['members involved'], nC = L.H['detail kpi'];
  var items = [K.mirEvent, K.mirProduct, K.postOnTime, K.content, K.designOnTime, K.score].map(function (c) {
    var r = L.rows[c];
    return { code: c, name: r == null || nC == null ? '' : String(L.V[r][nC] || '').replace(/\s+/g, ' ').trim(), pic: r == null || mC == null ? '' : String(L.V[r][mC] || '').trim(), rule: KSC_MKT.RULES[c] };
  });
  kgsTitle_(B, 'KPI MKT ONLINE & DESIGN ' + L.fy + ' · số liệu tự động (KpiSyncCenter ⇒ 3. Detail KPI của file KPI) · không gõ tay vào tab này',
    'Cập nhật lúc ' + kgsNow_() + ' · nguồn: ' + mss.getName() + ' ▸ ADS REPORT · EVENT REPORT · PRODUCT REPORT · ORDER REPORT · tự làm mới mỗi lần đồng bộ (≈ 1 phút)' +
    (X.miss && X.miss.length ? ' · ⚠ không đọc được: ' + X.miss.join(', ') : ''));
  kgsSection_(B, 'I. KPI MKT ONLINE & DESIGN (Target ở 3. Detail KPI · Actual = số KpiSyncCenter vừa ghi) · % đạt: < 90% xám · 90–<100% xanh · 100–120% vàng · > 120% xanh lá');
  kgsCodeTable_(B, L, cur, items);

  kgsSection_(B, 'II. CHI TIẾT THEO THÁNG (số dùng để tính KPI)');
  kgsListHead_(B, ['Month', 'Ads Event · Tiếp cận', 'Ads Event · Inbox', 'MIR Event (' + K.mirEvent + ')', 'Ads Product · Tiếp cận', 'Ads Product · Inbox', 'MIR Product (' + K.mirProduct + ')',
    'Bài kế hoạch', 'Bài đúng hạn', 'Đúng hạn (' + K.postOnTime + ')', 'Số link (' + K.content + ')', 'Yêu cầu thiết kế', 'Đúng hạn', 'Đúng hạn (' + K.designOnTime + ')', 'Điểm thiết kế (' + K.score + ')']);
  months.filter(function (m) { return m <= cur; }).forEach(function (m) {
    var e = X.ads['event|' + m] || { reach: 0, inbox: 0 }, p = X.ads['product|' + m] || { reach: 0, inbox: 0 };
    var r = kgsRow_(B, [kscMon_(m), e.reach, e.inbox, e.reach > 0 ? e.inbox / e.reach : '', p.reach, p.inbox, p.reach > 0 ? p.inbox / p.reach : '',
      X.plan[m] || 0, X.onTime[m] || 0, X.plan[m] > 0 ? X.onTime[m] / X.plan[m] : '', X.links[m] || 0,
      X.hasOrder ? X.req[m] || 0 : '', X.hasOrder ? X.ok[m] || 0 : '', X.hasOrder && X.req[m] > 0 ? X.ok[m] / X.req[m] : '', X.hasOrder ? X.pts[m] || 0 : '']);
    [1, 2, 4, 5, 7, 8, 10, 11, 12, 14].forEach(function (c) { kgsSet_(B, r, c, { nf: '#,##0.##' }); });
    [3, 6, 9, 13].forEach(function (c) { kgsSet_(B, r, c, { nf: '0.00%', bold: true }); });
  });

  kgsSection_(B, 'III. BÀI ĐĂNG (EVENT REPORT + PRODUCT REPORT) · bỏ Status Cancel · đúng hạn = có Link report và ngày điền link ≤ On-air dự kiến');
  kgsListHead_(B, ['Month', 'Sheet', 'Tiêu đề', 'Type of content', 'Có Link report?', 'Đúng hạn?', 'Tính vào mã']);
  var posts = (X.postList || []).slice().sort(function (a, b) { return a.m - b.m; });
  posts.forEach(function (p) {
    var r = kgsRow_(B, [kscMon_(p.m), p.sheet, p.title, p.ctype, p.link ? 'Có' : 'Chưa', p.onTime ? 'Đúng hạn' : 'Chưa', K.postOnTime + (p.link ? ' · ' + K.content : '')]);
    kgsSet_(B, r, 5, { bg: p.onTime ? KGS.TONE.top : KGS.TONE.low });
  });
  if (!posts.length) kgsRow_(B, ['(chưa có bài đăng nào)'], { fc: KGS.MUTED });

  kgsSection_(B, 'IV. YÊU CẦU THIẾT KẾ (ORDER REPORT) · theo Tháng hoàn thành · bỏ Status Cancel');
  kgsListHead_(B, ['Month', 'Key task / Event', 'Dạng ấn phẩm', 'Số lượng', 'Điểm tổng', 'Check deadline report', 'Tính?', 'Tính vào mã']);
  var ds = (X.designList || []).slice().sort(function (a, b) { return a.m - b.m; });
  ds.forEach(function (d) {
    var r = kgsRow_(B, [kscMon_(d.m), d.task, d.type, d.qty, d.pts, d.check, d.counted ? (d.onTime ? 'Đúng hạn' : 'Tính, chưa đúng hạn') : 'Không (Cancel)', d.counted ? K.designOnTime + ' · ' + K.score : '']);
    kgsSet_(B, r, 3, { nf: '#,##0' }); kgsSet_(B, r, 4, { nf: '#,##0.##' });
    kgsSet_(B, r, 6, { bg: !d.counted ? null : d.onTime ? KGS.TONE.top : KGS.TONE.low });
  });
  if (!ds.length) kgsRow_(B, ['(chưa có yêu cầu thiết kế nào)'], { fc: KGS.MUTED });
  return kgsWrite_(mss, 'KPI MKT Online', B, { key: 'mkt', force: force, tabColor: '#BF9000', index: 1, frozenRows: 2, frozenCols: 2,
    widths: kgsWidths_([90, 240, 110, 90, 260, 80, 80, 80, 70], months) });
}
