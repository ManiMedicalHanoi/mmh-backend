/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  KpiGroupSheets.gs                         v2.0 (13/10/2026)
   v2.0 — 3 tab làm lại THEO ĐÚNG BỐ CỤC tab "9. TARGET & KPI" của CRM (người dùng yêu cầu 13/10/2026):
     tiêu đề + ô cài đặt (FY · file KPI · tháng hiện tại · đồng bộ lần cuối) + chú thích ·
     PHẦN A tổng hợp theo nhóm KPI · PHẦN B KPI từng PIC: 12 tháng Target | 12 tháng Actual | % FY · % lũy kế · % Q1–Q4 · điểm (% × trọng số)
     + dòng tổng điểm mỗi PIC · PHẦN C review cuối quý (người dùng điền, được GIỮ khi tab cập nhật) · PHẦN D dữ liệu nguồn (sự kiện / buổi / bài đăng).
     Cột tổng / % / quý / điểm là CÔNG THỨC giống CRM (cap 130%, màu xanh ≥100% · vàng ≥80% · đỏ <80%); Target / Actual = số file KPI (3. Detail KPI)
     sau khi KpiSyncCenter vừa ghi. Bản v1.0 bên dưới (mô tả cũ) giữ để tham khảo:
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

/* ════════════════ BỘ DỰNG TAB KIỂU "9. TARGET & KPI" CỦA CRM (v2.0) ════════════════ */
var KG8 = { tag: 1, code: 2, pic: 3, name: 4, unit: 5, w: 6, agg: 7, tFY: 8, t0: 9, aFY: 21, a0: 22, pct: 34, ytd: 35, q0: 36, score: 40, src: 41, NC: 41 };
var KG8_LAYOUT = 'kg8v1', KG8_CUR = '$D$6', KG8_SYNC = [7, 4];
var KG8_TXT = {
  SUM: 'Cộng dồn', LAST: 'Lũy kế', AVG: 'Trung bình',
  partA: 'PHẦN A — TỔNG HỢP THEO NHÓM KPI (tự động)',
  partB: 'PHẦN B — KPI TỪNG PIC THEO THÁNG / QUÝ',
  partC: 'PHẦN C — REVIEW CUỐI QUÝ (PIC điền nội dung · quản lý duyệt) · nội dung được giữ nguyên khi tab cập nhật',
  partD: 'PHẦN D — DỮ LIỆU NGUỒN (để đối chiếu Actual)',
  bandT: 'TARGET THEO THÁNG (file KPI · 3. Detail KPI)', bandA: 'ACTUAL THEO THÁNG (tự động)', bandP: '% ĐẠT',
  legend: ['Không gõ tay vào tab này (trừ Phần C) — KpiSyncCenter của file KPI ghi lại mỗi khi dữ liệu nguồn đổi (≈ 1 phút)',
           'Target 12 tháng = file MMH KPI (3. Detail KPI) · Actual = số KpiSyncCenter tính từ dữ liệu nguồn (xem cột "Nguồn Actual / cách tính")',
           '% đạt tối đa 130% — theo Rule của file KPI · màu: xanh ≥ 100% · vàng 80–<100% · đỏ < 80%',
           'Q1 = T9·T10·T11 · Q2 = T12·T1·T2 · Q3 = T3·T4·T5 · Q4 = T6·T7·T8 · "% lũy kế" = tính đến tháng hiện tại',
           'Cộng dồn = cộng số từng tháng · Lũy kế = số của tháng gần nhất · Trung bình = trung bình các tháng (KPI tỷ lệ %)']
};
function kg8Col_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function kgsNow_() { return Utilities.formatDate(new Date(), KSC.TZ, 'dd/MM/yyyy HH:mm'); }
function kg8Agg_(v) { var s = String(v || '').toUpperCase(); return /AVER|AVG|TRUNG/.test(s) ? 'AVG' : /LAST|LUY|LŨY|CUM/.test(s) ? 'LAST' : 'SUM'; }
function kg8Months_(L) {
  var m = (L.months || []).slice(0, 12);
  while (m.length < 12) { var p = m.length ? m[m.length - 1] : 202609; m.push(p % 100 === 12 ? p + 89 : p + 1); }
  return m;
}
/* 1 mã KPI của 3. Detail KPI ⇒ dòng Phần B */
function kg8Item_(L, code, cur, months, o) {
  o = o || {};
  var r = L.rows[code];
  if (r == null) return { code: code, name: o.name || '', unit: '', w: '', agg: 'SUM', t: [], a: [], src: (o.src ? o.src + ' · ' : '') + '⚠ file KPI chưa có mã này ở 3. Detail KPI', missing: true };
  var cU = L.H['unit'], cA = L.H['agg'], cN = L.H['detail kpi'], cW = null;
  Object.keys(L.H).forEach(function (k) { if (cW == null && /^(weight|trong so|ty trong|kpi weight)$/.test(k)) cW = L.H[k]; });
  var w = cW == null ? '' : kscNum_(L.V[r][cW]); if (w != null && w !== '' && w > 1) w = w / 100;
  var t = months.map(function (m) { var c = L.tCol[m]; var v = c == null ? null : kscNum_(L.V[r][c]); return v == null ? '' : v; });
  var a = months.map(function (m) {
    var c = L.aCol[m]; if (c == null || m > cur || kscKind_(L.F[r][c]) === 'placeholder') return '';
    var v = kscNum_(L.V[r][c]); return v == null ? '' : v;
  });
  return { code: code, name: o.name || (cN == null ? '' : String(L.V[r][cN] || '').replace(/\s+/g, ' ').trim()), unit: cU == null ? '' : String(L.V[r][cU] || '').trim(),
           w: w == null ? '' : w, agg: cA == null ? 'SUM' : kg8Agg_(L.V[r][cA]), t: t, a: a, src: o.src || '' };
}
/* nhóm KPI (Phần A): cột Parent của 3. Detail KPI, không có ⇒ phần chữ + số đầu mã (C12-01 ⇒ C12) */
function kg8Groups_(L, items) {
  var pc = L.H['parent'], cN = L.H['detail kpi'], map = {}, order = [];
  items.forEach(function (it) {
    if (it.missing) return;
    var g = pc != null && L.rows[it.code] != null ? String(L.V[L.rows[it.code]][pc] || '').trim() : '';
    if (!g) { var m = /^([A-Z]+\d+)/.exec(it.code); g = m ? m[1] : it.code; }
    if (!map[g]) {
      var nm = '';
      if (L.rows[g] != null && cN != null) nm = String(L.V[L.rows[g]][cN] || '').replace(/\s+/g, ' ').trim();
      if (!nm) { var m2 = L.rows[g + '-00']; if (m2 != null && cN != null) nm = String(L.V[m2][cN] || '').replace(/\s+/g, ' ').trim(); }
      map[g] = { code: g, name: nm || it.name, codes: [] }; order.push(g);
    }
    if (map[g].codes.indexOf(it.code) < 0) map[g].codes.push(it.code);
  });
  return order.map(function (g) { return map[g]; });
}
/* đọc Phần C (review) của tab đang có ⇒ { 'Q1|PIC': [kết quả, nguyên nhân, kế hoạch, quản lý] } */
function kg8Snap_(sh) {
  var out = {};
  try {
    var lr = sh.getLastRow(); if (lr < 5) return out;
    var V = sh.getRange(1, 1, lr, 21).getValues();
    V.forEach(function (r) { if (String(r[0]) === 'review' && (r[3] || r[4] || r[8] || r[14])) out[r[1] + '|' + r[2]] = [r[3], r[4], r[8], r[14]]; });
  } catch (e) {}
  return out;
}
/* o = { title, guide, fy, months, kpiUrl, srcText, pics:[{pic, role, rows:[item]}], groups, review, extra:[{title, head, rows:[{v, tone:{i:'ok'|'no'}, nf:{i:fmt}}]}] } */
function kg8Build_(o) {
  var C = KG8, T = KG8_TXT, NC = C.NC, grid = [], sty = [], merges = [], heights = {};
  function row() { var r = [], s = []; for (var i = 0; i < NC; i++) { r.push(''); s.push({}); } grid.push(r); sty.push(s); return grid.length; }
  function put(r, c, v, st) { grid[r - 1][c - 1] = v; if (st) stl(r, c, c, st); }
  function stl(r, c1, c2, st) { for (var c = c1; c <= c2; c++) { var x = sty[r - 1][c - 1]; for (var k in st) x[k] = st[k]; } }
  var A = kg8Col_, TC = function (i) { return A(C.t0 + i); }, AC = function (i) { return A(C.a0 + i); }, CUR = KG8_CUR;
  var NAVY = '#1F3864', HEAD = '#D9E1F2', PICB = '#E2EFDA', TOT = '#EDEDED', BLUE = '#0000FF', GREY = '#A6A6A6', VAL = '#F3F6FA';
  var mon = o.months.map(function (m) { return 'T' + (m % 100); });
  var isPct = function (u) { return /%/.test(String(u || '')); };
  var nfOf = function (u) { return isPct(u) ? '0.0%' : '#,##0.##'; };
  var capF = function (expr) { return 'MIN(' + expr + ',13/10)'; };

  var r = row(); put(r, 1, KG8_LAYOUT, { fc: GREY, fs: 7 }); put(r, 2, o.title + '  (theo file MMH KPI ' + o.fy + ')', { b: 1, fs: 15, fc: NAVY });
  r = row(); put(r, 2, o.guide || '', { fc: '#595959', i: 1 });
  row();
  while (grid.length < 8) row();
  put(4, 1, 'set:fy', { fc: GREY, fs: 7 }); put(4, 2, 'FY áp dụng', { b: 1 }); put(4, 3, o.fy, { bg: TOT, b: 1, ha: 'center' });
  [[5, 'File KPI tổng', o.kpiUrl ? '=HYPERLINK("' + o.kpiUrl + '","Mở file MMH KPI ' + o.fy + ' ▸ 3. Detail KPI")' : '(chưa có)'],
   [6, 'Tháng hiện tại (auto)', '=YEAR(TODAY())*100+MONTH(TODAY())'],
   [7, 'Đồng bộ lần cuối', o.now || kgsNow_()],
   [8, 'Nguồn dữ liệu', o.srcText || '']].forEach(function (s) {
    put(s[0], 1, 'set', { fc: GREY, fs: 7 }); put(s[0], 2, s[1], { b: 1 }); merges.push([s[0], 2, s[0], 3]);
    put(s[0], 4, s[2], { ha: 'left', fc: s[0] === 5 ? '#1155CC' : '#000000', nf: s[0] === 6 ? '0' : '@', i: s[0] >= 7 ? 1 : 0 });
  });
  T.legend.forEach(function (t, i) { put(4 + i, 9, '• ' + t, { fc: '#404040', fs: 9 }); });

  row();
  var rA = row(); put(rA, 1, 'partA', { fc: GREY, fs: 7 }); put(rA, 2, T.partA); stl(rA, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rAh = row(); put(rAh, 1, 'hdrA', { fc: GREY, fs: 7 });
  var hA = {}; hA[C.code] = 'Mã nhóm'; hA[C.name] = 'Chỉ tiêu nhóm'; hA[C.unit] = 'Đơn vị'; hA[C.agg] = 'Cách cộng'; hA[C.tFY] = 'Target FY'; hA[C.aFY] = 'Actual FY';
  hA[C.pct] = '% đạt FY'; hA[C.ytd] = '% lũy kế đến nay'; hA[C.src] = 'Gồm các mã KPI';
  for (var i = 0; i < 12; i++) { hA[C.t0 + i] = 'TG ' + mon[i]; hA[C.a0 + i] = mon[i]; }
  for (var q = 0; q < 4; q++) hA[C.q0 + q] = '% Q' + (q + 1);
  for (var c in hA) put(rAh, +c, hA[c]);
  stl(rAh, 2, NC, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var aRows = [];
  (o.groups || []).forEach(function (g) { aRows.push({ r: row(), g: g }); });
  if (!aRows.length) { var rx = row(); put(rx, 2, '(chưa có mã KPI)', { fc: GREY }); }
  row();

  var rB = row(); put(rB, 1, 'partB', { fc: GREY, fs: 7 }); put(rB, 2, T.partB); stl(rB, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rBand = row(); put(rBand, 1, 'band', { fc: GREY, fs: 7 });
  put(rBand, C.t0, T.bandT); merges.push([rBand, C.t0, rBand, C.t0 + 11]);
  put(rBand, C.a0, T.bandA); merges.push([rBand, C.a0, rBand, C.a0 + 11]);
  put(rBand, C.pct, T.bandP); merges.push([rBand, C.pct, rBand, C.q0 + 3]);
  stl(rBand, C.t0, C.t0 + 11, { bg: '#FCE4D6', b: 1, ha: 'center' }); stl(rBand, C.a0, C.a0 + 11, { bg: '#DDEBF7', b: 1, ha: 'center' });
  stl(rBand, C.pct, C.q0 + 3, { bg: '#E2EFDA', b: 1, ha: 'center' });
  var rH = row(); put(rH, 1, 'hdr', { fc: GREY, fs: 7 });
  var hB = {}; hB[C.code] = 'Mã KPI'; hB[C.pic] = 'PIC'; hB[C.name] = 'Chỉ tiêu KPI'; hB[C.unit] = 'Đơn vị'; hB[C.w] = 'Trọng số'; hB[C.agg] = 'Cách cộng';
  hB[C.tFY] = 'Target FY'; hB[C.aFY] = 'Actual FY'; hB[C.pct] = '% đạt FY'; hB[C.ytd] = '% lũy kế đến nay'; hB[C.score] = 'Điểm (% × trọng số)'; hB[C.src] = 'Nguồn Actual / cách tính';
  for (i = 0; i < 12; i++) { hB[C.t0 + i] = 'TG ' + mon[i]; hB[C.a0 + i] = mon[i]; }
  for (q = 0; q < 4; q++) hB[C.q0 + q] = '% Q' + (q + 1);
  for (c in hB) put(rH, +c, hB[c]);
  stl(rH, 2, NC, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var MC = row(); put(MC, 1, 'months', { fc: GREY, fs: 7 }); put(MC, 2, 'mã tháng ▸', { fc: '#7F7F7F', i: 1 });
  for (i = 0; i < 12; i++) { put(MC, C.t0 + i, o.months[i], { nf: '0', fc: '#7F7F7F', ha: 'center', fs: 8 }); put(MC, C.a0 + i, o.months[i], { nf: '0', fc: '#7F7F7F', ha: 'center', fs: 8 }); }
  var MCr = '$' + TC(0) + '$' + MC + ':$' + TC(11) + '$' + MC, MCa = '$' + AC(0) + '$' + MC + ':$' + AC(11) + '$' + MC;

  function rowCalc(rr, agg) {
    var tr = TC(0) + rr + ':' + TC(11) + rr, ar = AC(0) + rr + ':' + AC(11) + rr, T_ = A(C.tFY) + rr, A_ = A(C.aFY) + rr;
    var fn = agg === 'LAST' ? 'LOOKUP(10^300,' : agg === 'AVG' ? 'AVERAGE(' : 'SUM(';
    put(rr, C.tFY, '=IF(COUNT(' + tr + ')=0,"",' + fn + tr + '))');
    put(rr, C.aFY, '=IF(COUNT(' + ar + ')=0,"",' + fn + ar + '))');
    put(rr, C.pct, '=IF(OR(' + A_ + '="",N(' + T_ + ')=0),"",' + capF(A_ + '/' + T_) + ')');
    if (agg === 'LAST') {
      var tNow = 'LOOKUP(' + CUR + ',' + MCr + ',' + tr + ')';
      put(rr, C.ytd, '=IFERROR(IF(OR(COUNT(' + ar + ')=0,N(' + tNow + ')=0),"",' + capF('LOOKUP(10^300,' + ar + ')/' + tNow) + '),"")');
    } else if (agg === 'AVG') {
      put(rr, C.ytd, '=IFERROR(' + capF('AVERAGEIFS(' + ar + ',' + MCa + ',"<="&' + CUR + ')/AVERAGEIFS(' + tr + ',' + MCr + ',"<="&' + CUR + ')') + ',"")');
    } else {
      var tY = 'SUMPRODUCT(--(' + MCr + '<=' + CUR + '),' + tr + ')', aY = 'SUMPRODUCT(--(' + MCa + '<=' + CUR + '),' + ar + ')';
      put(rr, C.ytd, '=IFERROR(IF(' + tY + '=0,"",' + capF(aY + '/' + tY) + '),"")');
    }
    for (var q = 0; q < 4; q++) {
      var t1 = TC(q * 3), t3 = TC(q * 3 + 2), a1 = AC(q * 3), a3 = AC(q * 3 + 2), started = t1 + '$' + MC + '>' + CUR;
      var mq = t1 + '$' + MC + ':' + t3 + '$' + MC, mqa = a1 + '$' + MC + ':' + a3 + '$' + MC;
      if (agg === 'LAST') {
        var tq = '(LOOKUP(MIN(' + CUR + ',' + t3 + '$' + MC + '),' + MCr + ',' + tr + ')' + (q ? '-N(' + TC(q * 3 - 1) + rr + ')' : '') + ')';
        var aq = '(LOOKUP(10^300,' + AC(0) + rr + ':' + a3 + rr + ')' + (q ? '-IFERROR(LOOKUP(10^300,' + AC(0) + rr + ':' + AC(q * 3 - 1) + rr + '),0)' : '') + ')';
        put(rr, C.q0 + q, '=IFERROR(IF(OR(' + started + ',COUNT(' + AC(0) + rr + ':' + a3 + rr + ')=0,' + tq + '=0),"",' + capF(aq + '/' + tq) + '),"")');
      } else if (agg === 'AVG') {
        put(rr, C.q0 + q, '=IFERROR(IF(' + started + ',"",' + capF('AVERAGEIFS(' + a1 + rr + ':' + a3 + rr + ',' + mqa + ',"<="&' + CUR + ')/AVERAGEIFS(' + t1 + rr + ':' + t3 + rr + ',' + mq + ',"<="&' + CUR + ')') + '),"")');
      } else {
        var tq2 = 'SUMPRODUCT(--(' + mq + '<=' + CUR + '),' + t1 + rr + ':' + t3 + rr + ')', aq2 = 'SUMPRODUCT(--(' + mqa + '<=' + CUR + '),' + a1 + rr + ':' + a3 + rr + ')';
        put(rr, C.q0 + q, '=IFERROR(IF(OR(' + started + ',' + tq2 + '=0),"",' + capF(aq2 + '/' + tq2) + '),"")');
      }
    }
  }

  var kpiRows = [], picTot = [];
  (o.pics || []).forEach(function (p) {
    var rp = row(); put(rp, 1, 'pic', { fc: GREY, fs: 7 });
    put(rp, C.code, '▸ ' + p.pic + (p.role ? ' — ' + p.role : '')); stl(rp, 2, NC, { bg: PICB, b: 1 });
    var first = 0, last = 0;
    p.rows.forEach(function (x) {
      var rr = row(); if (!first) first = rr; last = rr;
      kpiRows.push({ r: rr, x: x, pic: p.pic });
      var nf = nfOf(x.unit);
      put(rr, 1, 'kpi:' + x.code, { fc: GREY, fs: 7 });
      put(rr, C.code, x.code, { b: 1, ha: 'center' }); put(rr, C.pic, p.pic, { ha: 'center', wrap: 1 }); put(rr, C.name, x.name, { wrap: 1 });
      put(rr, C.unit, x.unit, { ha: 'center' }); put(rr, C.w, x.w, { nf: '0%', ha: 'center' });
      put(rr, C.agg, T[x.agg] || x.agg, { ha: 'center', fc: '#595959' });
      for (var i = 0; i < 12; i++) {
        put(rr, C.t0 + i, x.t[i] == null ? '' : x.t[i], { bg: VAL, nf: nf });
        put(rr, C.a0 + i, x.a[i] == null ? '' : x.a[i], { nf: nf, fc: '#1F3864' });
      }
      if (!x.missing) rowCalc(rr, x.agg);
      put(rr, C.score, x.missing ? '' : '=IF(OR(' + A(C.pct) + rr + '="",N(' + A(C.w) + rr + ')=0),"",' + A(C.pct) + rr + '*' + A(C.w) + rr + ')', { nf: '0.0%' });
      put(rr, C.src, x.src || '', { fc: '#595959', fs: 9, wrap: 1 });
      stl(rr, C.tFY, C.tFY, { nf: nf, b: 1 }); stl(rr, C.aFY, C.aFY, { nf: nf, b: 1 });
      stl(rr, C.pct, C.q0 + 3, { nf: '0%', ha: 'center' });
      heights[rr] = 34;
    });
    if (!first) return;
    var rt = row(); put(rt, 1, 'tot', { fc: GREY, fs: 7 });
    put(rt, C.pic, p.pic, { ha: 'center' }); put(rt, C.name, 'Tổng điểm KPI của ' + p.pic + ' (các chỉ tiêu ở tab này)');
    var W = A(C.w) + first + ':' + A(C.w) + last;
    put(rt, C.w, '=IF(COUNT(' + W + ')=0,"",SUM(' + W + '))', { nf: '0%', ha: 'center' });
    [C.pct, C.ytd, C.q0, C.q0 + 1, C.q0 + 2, C.q0 + 3].forEach(function (cc) {
      var R = A(cc) + first + ':' + A(cc) + last;
      /* có trọng số ⇒ trung bình theo trọng số; chưa có ⇒ trung bình cộng các KPI đã có % */
      put(rt, cc, '=IFERROR(IF(SUM(' + W + ')>0,SUMPRODUCT(IFERROR(' + R + '*1,0),' + W + ')/SUMPRODUCT(--(' + R + '<>""),' + W + '),AVERAGE(' + R + ')),"")', { nf: '0%', ha: 'center' });
    });
    put(rt, C.score, '=IF(COUNT(' + A(C.score) + first + ':' + A(C.score) + last + ')=0,"",SUM(' + A(C.score) + first + ':' + A(C.score) + last + '))', { nf: '0.0%' });
    stl(rt, 2, NC, { bg: TOT, b: 1 });
    picTot.push({ pic: p.pic, r: rt });
    row();
  });
  if (!kpiRows.length) { var rz = row(); put(rz, 2, '(chưa có mã KPI nào của nhóm này trong file KPI)', { fc: GREY }); row(); }
  var bFirst = kpiRows.length ? kpiRows[0].r : MC + 1, bLast = kpiRows.length ? kpiRows[kpiRows.length - 1].r + 1 : MC + 1;

  var unitOf = {}, aggOf = {}; kpiRows.forEach(function (k) { unitOf[k.x.code] = k.x.unit; aggOf[k.x.code] = k.x.agg; });
  aRows.forEach(function (ob) {
    var rr = ob.r, g = ob.g, codes = g.codes, BR = '$' + A(C.code) + '$' + bFirst + ':$' + A(C.code) + '$' + bLast;
    var unit = unitOf[codes[0]] || '', agg = aggOf[codes[0]] || 'SUM', nf = nfOf(unit);
    put(rr, 1, 'grp', { fc: GREY, fs: 7 });
    put(rr, C.code, g.code, { b: 1, ha: 'center' }); put(rr, C.name, g.name, { wrap: 1 });
    put(rr, C.unit, unit, { ha: 'center' }); put(rr, C.agg, T[agg] || agg, { ha: 'center', fc: '#595959' });
    for (var i = 0; i < 12; i++) {
      [C.t0 + i, C.a0 + i].forEach(function (cc) {
        var col = A(cc) + '$' + bFirst + ':' + A(cc) + '$' + bLast;
        var sum = codes.map(function (c) { return 'SUMIF(' + BR + ',"' + c + '",' + col + ')'; }).join('+');
        var cnt = codes.map(function (c) { return 'COUNTIFS(' + BR + ',"' + c + '",' + col + ',"<>")'; }).join('+');
        put(rr, cc, agg === 'SUM' ? '=IF(' + cnt + '=0,"",' + sum + ')' : '=IF(' + cnt + '=0,"",(' + sum + ')' + (agg === 'AVG' ? '/(' + cnt + ')' : '') + ')', { nf: nf });
      });
    }
    rowCalc(rr, agg);
    put(rr, C.src, codes.join(', '), { fc: '#595959', fs: 9 });
    stl(rr, C.tFY, C.tFY, { nf: nf, b: 1 }); stl(rr, C.aFY, C.aFY, { nf: nf, b: 1 });
    stl(rr, C.pct, C.q0 + 3, { nf: '0%', ha: 'center' });
  });

  var rC = row(); put(rC, 1, 'partC', { fc: GREY, fs: 7 }); put(rC, 2, T.partC); stl(rC, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
  var rCh = row(); put(rCh, 1, 'hdrC', { fc: GREY, fs: 7 });
  put(rCh, 2, 'Quý'); put(rCh, 3, 'PIC'); put(rCh, 4, 'Kết quả nổi bật'); put(rCh, 5, 'Nguyên nhân chưa đạt'); put(rCh, 9, 'Kế hoạch quý sau'); put(rCh, 15, 'Quản lý nhận xét / duyệt'); put(rCh, 21, '% đạt quý (auto)');
  merges.push([rCh, 5, rCh, 8], [rCh, 9, rCh, 14], [rCh, 15, rCh, 20]);
  stl(rCh, 2, 21, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
  var REV = o.review || {};
  for (q = 0; q < 4; q++) {
    picTot.forEach(function (pt) {
      var rr = row(), v = REV['Q' + (q + 1) + '|' + pt.pic] || ['', '', '', ''];
      put(rr, 1, 'review', { fc: GREY, fs: 7 });
      put(rr, 2, 'Q' + (q + 1), { b: 1, ha: 'center' }); put(rr, 3, pt.pic, { ha: 'center' });
      put(rr, 4, v[0], { wrap: 1, bg: '#FFF2CC', fc: BLUE }); put(rr, 5, v[1]); put(rr, 9, v[2]); put(rr, 15, v[3]);
      merges.push([rr, 5, rr, 8], [rr, 9, rr, 14], [rr, 15, rr, 20]);
      stl(rr, 5, 20, { wrap: 1, bg: '#FFF2CC', fc: BLUE });
      put(rr, 21, '=' + A(C.q0 + q) + pt.r, { nf: '0%', ha: 'center', b: 1 });
      heights[rr] = 42;
    });
  }

  var dRows = [];
  if (o.extra && o.extra.length) {
    row();
    var rD = row(); put(rD, 1, 'partD', { fc: GREY, fs: 7 }); put(rD, 2, T.partD); stl(rD, 2, NC, { bg: NAVY, fc: '#FFFFFF', b: 1 });
    o.extra.forEach(function (ex) {
      row();
      var rt = row(); put(rt, 1, 'sec', { fc: GREY, fs: 7 }); put(rt, 2, ex.title, { b: 1, fc: NAVY }); stl(rt, 2, NC, { bg: '#F0F7FF' });
      var rh = row(); put(rh, 1, 'hdrD', { fc: GREY, fs: 7 });
      ex.head.forEach(function (h, j) { put(rh, 2 + j, h); });
      stl(rh, 2, 1 + ex.head.length, { bg: HEAD, b: 1, ha: 'center', wrap: 1 });
      if (!ex.rows.length) { var re = row(); put(re, 2, ex.empty || '(chưa có dữ liệu)', { fc: GREY }); }
      ex.rows.forEach(function (d) {
        var rr = row(); put(rr, 1, 'src', { fc: GREY, fs: 7 });
        d.v.forEach(function (v, j) {
          if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) v = '';
          if (typeof v === 'string' && /^[=+]/.test(v)) v = "'" + v;
          put(rr, 2 + j, v);
        });
        if (d.nf) Object.keys(d.nf).forEach(function (j) { stl(rr, 2 + +j, 2 + +j, { nf: d.nf[j] }); });
        if (d.tone) Object.keys(d.tone).forEach(function (j) { stl(rr, 2 + +j, 2 + +j, { bg: d.tone[j] === 'ok' ? '#C6EFCE' : d.tone[j] === 'no' ? '#FFC7CE' : '#FFEB9C', b: 1 }); });
        if (d.warn) Object.keys(d.warn).forEach(function (j) { stl(rr, 2 + +j, 2 + +j, { fc: '#B45309' }); });
        dRows.push(rr);
      });
    });
  }
  return { grid: grid, sty: sty, merges: merges, heights: heights, kpiRows: kpiRows, aRows: aRows, picTot: picTot, rA: rA, rH: rH, MC: MC };
}
/* ghi ra sheet: giống k68Write_ của CRM (1 lần setValues cho cả giá trị lẫn công thức) */
function kg8Write_(ss, sh, B, o) {
  var nr = B.grid.length, NC = KG8.NC;
  try { sh.setFrozenRows(0); sh.setFrozenColumns(0); } catch (e) {}
  if (sh.getMaxColumns() < NC) sh.insertColumnsAfter(sh.getMaxColumns(), NC - sh.getMaxColumns());
  if (sh.getMaxRows() < nr + 10) sh.insertRowsAfter(sh.getMaxRows(), nr + 10 - sh.getMaxRows());
  var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  try { all.breakApart(); } catch (e) {}
  all.clear(); try { all.clearDataValidations(); } catch (e) {}
  try { sh.setConditionalFormatRules([]); } catch (e) {}
  for (var rh = 1; rh <= nr; rh++) { try { sh.setRowHeight(rh, 21); } catch (e) {} if (rh > 400) break; }
  var rg = sh.getRange(1, 1, nr, NC);
  function mapS(f, d) { return B.sty.map(function (r) { return r.map(function (x) { var v = f(x); return v == null ? d : v; }); }); }
  rg.setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');
  rg.setNumberFormats(mapS(function (x) { return x.nf; }, 'General'));
  rg.setValues(B.grid.map(function (r) { return r.map(function (x) { return typeof x === 'string' && x.charAt(0) === '=' ? kscFx_(ss, x) : x; }); }));
  rg.setBackgrounds(mapS(function (x) { return x.bg; }, null));
  rg.setFontColors(mapS(function (x) { return x.fc; }, '#000000'));
  rg.setFontWeights(mapS(function (x) { return x.b ? 'bold' : 'normal'; }, 'normal'));
  rg.setFontStyles(mapS(function (x) { return x.i ? 'italic' : 'normal'; }, 'normal'));
  rg.setFontSizes(mapS(function (x) { return x.fs; }, 10));
  rg.setHorizontalAlignments(mapS(function (x) { return x.ha; }, 'left'));
  rg.setWraps(mapS(function (x) { return !!x.wrap; }, false));
  B.merges.forEach(function (m) { try { sh.getRange(m[0], m[1], m[2] - m[0] + 1, m[3] - m[1] + 1).merge(); } catch (e) {} });
  for (var r in B.heights) sh.setRowHeight(+r, B.heights[r]);
  var W = { 1: 22, 2: 90, 3: 90, 4: 330, 5: 70, 6: 64, 7: 80, 8: 84, 21: 84, 34: 72, 35: 84, 40: 86, 41: 420 };
  for (var c = 1; c <= NC; c++) sh.setColumnWidth(c, W[c] || (c >= 36 && c <= 39 ? 62 : 70));
  sh.setFrozenColumns(4);
  var rules = [], A = kg8Col_;
  var zones = [];
  if (B.aRows.length) zones.push([B.aRows[0].r, B.aRows.length]);
  if (B.picTot.length) zones.push([B.MC + 1, B.picTot[B.picTot.length - 1].r - B.MC]);
  zones.forEach(function (z) {
    var rg0 = sh.getRange(z[0], KG8.pct, z[1], 6), a1 = A(KG8.pct) + z[0];
    [['>=1', '#C6EFCE', '#006100'], ['mid', '#FFEB9C', '#9C5700'], ['<4/5', '#FFC7CE', '#9C0006']].forEach(function (x) {
      var f = x[0] === 'mid' ? '=AND(ISNUMBER(' + a1 + '),' + a1 + '>=4/5,' + a1 + '<1)' : '=AND(ISNUMBER(' + a1 + '),' + a1 + x[0] + ')';
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(kscFx_(ss, f)).setBackground(x[1]).setFontColor(x[2]).setRanges([rg0]).build());
    });
  });
  try { sh.setConditionalFormatRules(rules); } catch (e) { Logger.log('kg8 CF: ' + e); }
  try {
    if (B.aRows.length) sh.getRange(B.rA + 1, 2, B.aRows.length + 1, NC - 1).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
    if (B.picTot.length) sh.getRange(B.rH - 1, 2, B.picTot[B.picTot.length - 1].r - B.rH + 2, NC - 1).setBorder(true, true, true, true, true, true, '#BFBFBF', SpreadsheetApp.BorderStyle.SOLID);
  } catch (e) {}
  if (o.tabColor) try { sh.setTabColor(o.tabColor); } catch (e) {}
}
/* dựng + ghi 1 tab: giữ Phần C, so mã băm (bỏ ô "Đồng bộ lần cuối") ⇒ không đổi chỉ cập nhật ô giờ */
function kg8Render_(ss, name, o, w) {
  w = w || {};
  var P = PropertiesService.getScriptProperties(), pk = 'KG8_H_' + w.key;
  var sh = ss.getSheetByName(name), isNew = !sh;
  if (!sh && w.oldNames) w.oldNames.forEach(function (n) { if (!sh) { var s0 = ss.getSheetByName(n); if (s0) { try { s0.setName(name); sh = s0; isNew = false; } catch (e) {} } } });
  if (!sh) sh = ss.insertSheet(name, Math.min(w.index == null ? 1 : w.index, ss.getSheets().length));
  o.review = isNew ? {} : kg8Snap_(sh);
  o.now = kgsNow_();
  var B = kg8Build_(o);
  var body = B.grid.map(function (r, i) { return i === KG8_SYNC[0] - 1 ? r.slice(0, KG8_SYNC[1] - 1) : r; });
  var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify([KG8_LAYOUT, body, ss.getId()])));
  var tagOk = false; try { tagOk = String(sh.getRange(1, 1).getValue()) === KG8_LAYOUT; } catch (e) {}
  if (!w.force && !isNew && tagOk && P.getProperty(pk) === hash) {
    try { sh.getRange(KG8_SYNC[0], KG8_SYNC[1]).setValue(o.now); } catch (e) {}
    return { tab: name, changed: false };
  }
  kg8Write_(ss, sh, B, w);
  P.setProperty(pk, hash);
  return { tab: name, changed: true };
}
/* PIC theo cột "Members involved" (nhiều người ⇒ giữ nguyên chuỗi làm 1 nhóm) */
function kg8ByPic_(items, dflt) {
  var map = {}, order = [];
  items.forEach(function (it) {
    var p = String(it.pic || '').replace(/\s+/g, ' ').trim() || dflt || 'MMH';
    if (!map[p]) { map[p] = { pic: p, role: '', rows: [] }; order.push(p); }
    map[p].rows.push(it);
  });
  return order.map(function (p) { return map[p]; });
}
function kg8KpiUrl_(ctx) { try { return kscUrl_(ctx.ss, ctx.sh); } catch (e) { return ''; } }

/* ════════════════ KPI TRAINING FY68 (Training Master) ════════════════ */
function kscTrainSheet_(tss, ctx, targets, res, S, force) {
  var L = ctx.L, cur = ctx.curYm, months = kg8Months_(L), name = KSC_TRAIN.OUT_PREFIX + L.fy, mC = L.H['members involved'];
  var items = targets.map(function (t) {
    var it = kg8Item_(L, t.code, cur, months, { name: t.name, src: 'Training Master ▸ Training Report ' + L.fy + ' · ' + t.rule.text + ' · Status = Completed · tháng theo Actual Date' });
    it.pic = t.member || (mC == null ? '' : String(L.V[t.row][mC] || '').trim()) || 'MMH (toàn công ty)';
    return it;
  });
  var fyIdx = {}; months.forEach(function (m, i) { fyIdx[m] = i; });
  var KL = {}; KGS.KINDS.forEach(function (x) { KL[x.k] = x.label; });
  var fy = [];
  S.list.forEach(function (s, i) { if (s.ym && fyIdx[s.ym] != null) fy.push([s, i]); });
  fy.sort(function (a, b) { return a[0].ym - b[0].ym || String(a[0].date).localeCompare(String(b[0].date)); });
  var rows = fy.map(function (p) {
    var s = p[0], hit = res.hits[p[1]] || [], note, ev = '', ok = hit.length && s.ok && s.done && s.ym <= cur;
    if (s.kind === 'coach') ev = s.done ? (s.pdf ? 'PDF Review ✓' : 'PDF Review: ' + (s.pdfWhy || 'chưa có')) : '';
    else if (s.kind === 'te' && s.isTe) ev = 'Actual ' + (s.teActual || 0) + ' · review ' + (s.teOk ? 'đủ 5 dòng' : 'thiếu');
    if (!s.done) note = 'Chưa tính: Status = ' + (s.status || '(trống)') + ', chỉ đếm Completed';
    else if (s.ym > cur) note = 'Tháng chưa tới';
    else if (!s.ok) note = 'Chưa tính: ' + (s.why || 'chưa đủ điều kiện');
    else if (!hit.length) note = 'Không khớp mã KPI nào (Trainer ' + (s.trainer || '(trống)') + ' / ' + s.type + ' / ' + (s.cat || 'không Category') + ')';
    else note = 'Đã tính';
    return { v: [s.ym, s.date, s.sid, s.topic, s.trainer, KL[s.kind] || '', s.type, s.cat, s.audience || '', s.status, ok ? 'Có' : 'Không', hit.join(', '), note, ev, s.sheet + ' · dòng ' + s.row],
             tone: { 10: ok ? 'ok' : 'no' } };
  });
  return kg8Render_(tss, name, {
    title: 'MỤC TIÊU & KPI — ĐÀO TẠO (Training)', fy: L.fy, months: months, kpiUrl: kg8KpiUrl_(ctx),
    guide: 'Mỗi dòng = 1 mã KPI đào tạo của 1 PIC, đúng mã trong file MMH KPI ' + L.fy + ' (L1 sản phẩm · L2 kỹ năng · C10 đào tạo khách hàng / External · C3-10/11 Coaching). Target từ file KPI · Actual tự đếm buổi đào tạo Completed đủ điều kiện.',
    srcText: 'Training Master ▸ ' + (S.sheets.join(', ') || '(không thấy sheet Training Report FYxx)') + ' ⇒ KpiSyncCenter ⇒ file KPI (3. Detail KPI) ⇒ tab này',
    pics: kg8ByPic_(items), groups: kg8Groups_(L, items),
    extra: [{ title: 'Danh sách buổi đào tạo trong ' + L.fy + ' · cột "Tính KPI?" cho biết buổi được đếm vào mã nào', empty: '(chưa có buổi đào tạo nào trong ' + L.fy + ')',
      head: ['Month', 'Actual Date', 'Session ID', 'Training Topic', 'Trainer', 'Loại', 'Training Type', 'Training Category', 'Target Audience', 'Status', 'Tính KPI?', 'Tính vào mã', 'Lý do / ghi chú', 'Bằng chứng', 'Sheet · dòng'],
      rows: rows }]
  }, { key: 'train', force: force, tabColor: KGS.BLUE, index: 1 });
}

/* ════════════════ KPI MKT Offline (file 2. Vietnam - Marketing Offline FY68) ════════════════ */
function kscMoffSheet_(mss, ctx, X, force) {
  var L = ctx.L, cur = ctx.curYm, months = kg8Months_(L), K = KSC_MOFF.CODES, mC = L.H['members involved'];
  var items = [K.comp, K.jz, K.evD, K.evS, K.ppD, K.ppS].map(function (c) {
    var it = kg8Item_(L, c, cur, months, { src: KSC_MOFF.RULES[c] });
    it.pic = L.rows[c] == null || mC == null ? '' : String(L.V[L.rows[c]][mC] || '').trim();
    return it;
  });
  var ev = X.rows.filter(function (r) { return months.indexOf(r.ym) >= 0; }).sort(function (a, b) { return a.ym - b.ym || a.row - b.row; });
  var rows = ev.map(function (e) {
    var codes = [], note = [];
    if (e.ym > cur) note.push('Tháng chưa tới');
    if (e.comp) codes.push(K.comp); if (e.jz) codes.push(K.jz);
    if (e.seg === 'D') { if (e.link) codes.push(K.evD); else note.push('chưa có folder link ⇒ chưa tính ' + K.evD); codes.push(K.ppD); }
    else if (e.seg === 'S') { if (e.link) codes.push(K.evS); else note.push('chưa có folder link ⇒ chưa tính ' + K.evS); codes.push(K.ppS); }
    else note.push('chưa ghi Segment ⇒ không tính C12 / C15');
    return { v: [e.ym, kscMoffDate_(e.date, e.ym), String(e.name || '').trim() || '(chưa ghi tên)', e.type, e.segRaw, e.link || '(chưa có)', e.pp, e.jz, e.comp,
      e.ym <= cur ? codes.join(', ') : '', note.join(' · '), e.row], nf: { 6: '#,##0', 7: '#,##0', 8: '#,##0' }, warn: e.link ? null : { 5: 1 } };
  });
  return kg8Render_(mss, 'KPI MKT Offline', {
    title: 'MỤC TIÊU & KPI — MARKETING OFFLINE', fy: L.fy, months: months, kpiUrl: kg8KpiUrl_(ctx),
    guide: 'Mỗi dòng = 1 mã KPI của MKT Offline, đúng mã trong file MMH KPI ' + L.fy + ' (C8 Composite · C9 JIZAI · C12 số sự kiện · C15 người tham dự). Target từ file KPI · Actual tự tính từ sheet REPORT_EVENT của file này.',
    srcText: mss.getName() + ' ▸ ' + KSC_MOFF.SHEET + ' ⇒ KpiSyncCenter ⇒ file KPI (3. Detail KPI) ⇒ tab này',
    pics: kg8ByPic_(items, 'MKT Offline'), groups: kg8Groups_(L, items),
    extra: [{ title: 'Danh sách sự kiện trong ' + L.fy + ' (REPORT_EVENT) · cột "Tính vào mã" cho biết sự kiện được cộng vào KPI nào', empty: '(chưa có sự kiện nào trong ' + L.fy + ')',
      head: ['Month', 'Ngày', 'Event Name', 'Type of event', 'Segment', 'Detail event folder link', 'Actual Participant', 'Actual sales - Jizai', 'Actual sales - Composite', 'Tính vào mã', 'Ghi chú', 'Dòng'],
      rows: rows }]
  }, { key: 'moff_' + mss.getId(), force: force, tabColor: '#C0392B', index: 1 });
}

/* ════════════════ KPI MKT Online (file 3. Vietnam - Digital Marketing & Design FY68) ════════════════ */
function kscMktSheet_(mss, ctx, X, force) {
  var L = ctx.L, cur = ctx.curYm, months = kg8Months_(L), K = KSC_MKT.CODES, mC = L.H['members involved'];
  var items = [K.mirEvent, K.mirProduct, K.postOnTime, K.content, K.designOnTime, K.score].map(function (c) {
    var it = kg8Item_(L, c, cur, months, { src: KSC_MKT.RULES[c] });
    it.pic = L.rows[c] == null || mC == null ? '' : String(L.V[L.rows[c]][mC] || '').trim();
    return it;
  });
  var mrows = months.filter(function (m) { return m <= cur; }).map(function (m) {
    var e = X.ads['event|' + m] || { reach: 0, inbox: 0 }, p = X.ads['product|' + m] || { reach: 0, inbox: 0 };
    return { v: [m, e.reach, e.inbox, e.reach > 0 ? e.inbox / e.reach : '', p.reach, p.inbox, p.reach > 0 ? p.inbox / p.reach : '',
      X.plan[m] || 0, X.onTime[m] || 0, X.plan[m] > 0 ? X.onTime[m] / X.plan[m] : '', X.links[m] || 0,
      X.hasOrder ? X.req[m] || 0 : '', X.hasOrder ? X.ok[m] || 0 : '', X.hasOrder && X.req[m] > 0 ? X.ok[m] / X.req[m] : '', X.hasOrder ? X.pts[m] || 0 : ''],
      nf: { 1: '#,##0', 2: '#,##0', 3: '0.00%', 4: '#,##0', 5: '#,##0', 6: '0.00%', 7: '#,##0', 8: '#,##0', 9: '0.0%', 10: '#,##0', 11: '#,##0', 12: '#,##0', 13: '0.0%', 14: '#,##0.##' } };
  });
  var posts = (X.postList || []).slice().sort(function (a, b) { return a.m - b.m; }).map(function (p) {
    return { v: [p.m, p.sheet, p.title, p.ctype, p.link ? 'Có' : 'Chưa', p.onTime ? 'Đúng hạn' : 'Chưa', K.postOnTime + (p.link ? ' · ' + K.content : '')], tone: { 5: p.onTime ? 'ok' : 'no' } };
  });
  var ds = (X.designList || []).slice().sort(function (a, b) { return a.m - b.m; }).map(function (d) {
    return { v: [d.m, d.task, d.type, d.qty, d.pts, d.check, d.counted ? (d.onTime ? 'Đúng hạn' : 'Tính, chưa đúng hạn') : 'Không (Cancel)', d.counted ? K.designOnTime + ' · ' + K.score : ''],
             nf: { 3: '#,##0', 4: '#,##0.##' }, tone: d.counted ? { 6: d.onTime ? 'ok' : 'no' } : null };
  });
  return kg8Render_(mss, 'KPI MKT Online', {
    title: 'MỤC TIÊU & KPI — MARKETING ONLINE & DESIGN', fy: L.fy, months: months, kpiUrl: kg8KpiUrl_(ctx),
    guide: 'Mỗi dòng = 1 mã KPI của MKT Online & Design, đúng mã trong file MMH KPI ' + L.fy + ' (C17-01→06). Target từ file KPI · Actual tự tính từ ADS REPORT · EVENT REPORT · PRODUCT REPORT · ORDER REPORT của file này.' +
      (X.miss && X.miss.length ? ' ⚠ Không đọc được: ' + X.miss.join(', ') : ''),
    srcText: mss.getName() + ' ▸ ADS REPORT · EVENT REPORT · PRODUCT REPORT · ORDER REPORT ⇒ KpiSyncCenter ⇒ file KPI (3. Detail KPI) ⇒ tab này',
    pics: kg8ByPic_(items, 'MKT Online'), groups: kg8Groups_(L, items),
    extra: [
      { title: 'Chi tiết theo tháng (số dùng để tính Actual)', head: ['Month', 'Ads Event · Tiếp cận', 'Ads Event · Inbox', 'MIR Event (' + K.mirEvent + ')', 'Ads Product · Tiếp cận', 'Ads Product · Inbox', 'MIR Product (' + K.mirProduct + ')',
        'Bài kế hoạch', 'Bài đúng hạn', 'Đúng hạn (' + K.postOnTime + ')', 'Số link (' + K.content + ')', 'Yêu cầu thiết kế', 'Đúng hạn', 'Đúng hạn (' + K.designOnTime + ')', 'Điểm thiết kế (' + K.score + ')'], rows: mrows },
      { title: 'Bài đăng (EVENT REPORT + PRODUCT REPORT) · bỏ Status Cancel · đúng hạn = có Link report và ngày điền link ≤ On-air dự kiến', empty: '(chưa có bài đăng nào)',
        head: ['Month', 'Sheet', 'Tiêu đề', 'Type of content', 'Có Link report?', 'Đúng hạn?', 'Tính vào mã'], rows: posts },
      { title: 'Yêu cầu thiết kế (ORDER REPORT) · theo Tháng hoàn thành · bỏ Status Cancel', empty: '(chưa có yêu cầu thiết kế nào)',
        head: ['Month', 'Key task / Event', 'Dạng ấn phẩm', 'Số lượng', 'Điểm tổng', 'Check deadline report', 'Tính?', 'Tính vào mã'], rows: ds }]
  }, { key: 'mkt', force: force, tabColor: '#BF9000', index: 1 });
}
