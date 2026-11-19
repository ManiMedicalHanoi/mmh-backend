/**
 * MMH — Giá bán lẻ ➜ "Competitor Benchmark" (file Price calculation MMG)
 * ----------------------------------------------------------------------------
 * Web app (chỉ gọi khi có key = 8 ký tự cuối ID file Data composite):
 *   ?action=cbDiag&key=…            đọc sheet "Giá bán lẻ" (chỉ đọc) + bảng B của Competitor Benchmark
 *   ?action=cbFill&key=…&op=dry|run  ghép Giá bán lẻ ⇒ bảng B "COMPETITOR PRICE COLLECTION" (dòng 22–121) của Competitor Benchmark.
 *        dry = chỉ trả danh sách sẽ ghi; run = ghi. CHỈ ghi các cột INPUT B · D–L · P–R, không đụng công thức (A, C, M, N, O),
 *        không đụng bảng A (MANI PRICE POSITION). Chạy tay trong trình soạn: capNhatCompetitorBenchmark().
 * Không có doGet nào khác trong dự án — file này chỉ thêm lối vào, không đổi menu / trigger cũ.
 */
var CB = {
  SRC_SHEET: 'Giá bán lẻ',
  DST_ID: '1xYjl3OV8Bm6IBX4290pJ_9K93eJcRL9cpwfb32jenqU',
  DST_SHEET: 'Competitor Benchmark'
};

function doGet(e) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!p.key || p.key !== ss.getId().slice(-8)) out = { ok: false, code: 'KEY' };
    else if (p.action === 'cbDiag') out = cbDiag_(ss, p);
    else if (p.action === 'cbDump') out = cbZip_(function () { return cbDump_(ss); }, p);
    else if (p.action === 'cbRows') out = cbRows_(ss, p);
    else if (p.action === 'cbFill') out = cbFill_(ss, p);
    else out = { ok: false, code: 'ACTION' };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function cbDiag_(ss, p) {
  var res = { ok: true };
  if (p.part !== 'dst') {
    var sh = ss.getSheetByName(CB.SRC_SHEET);
    var lr = sh.getLastRow(), lc = sh.getLastColumn();
    var off = Number(p.off || 0), n = Number(p.n || 400);
    var v = sh.getRange(1, 1, lr, lc).getDisplayValues();
    res.src = { lastRow: lr, lastCol: lc, rows: v.slice(off, off + n).map(function (r) {
      while (r.length && r[r.length - 1] === '') r.pop();
      return r.join(' ¦ ');
    }) };
  }
  if (p.part !== 'src') {
    try {
      var d = SpreadsheetApp.openById(CB.DST_ID).getSheetByName(CB.DST_SHEET);
      res.dst = { lastRow: d.getLastRow(), mani: d.getRange('B7:G17').getDisplayValues(),
                  b: d.getRange('A20:R' + Math.min(d.getLastRow(), 40)).getDisplayValues().map(function (r) { return r.join(' ¦ '); }) };
    } catch (err) { res.dstErr = String(err.message || err); }
  }
  return res;
}

/* Dữ liệu gọn cho việc ghép (chỉ đọc): sheet Giá bán lẻ + số lượng nhập khẩu / quy cách theo hãng · nhãn hiệu · phân loại
 * (Total data). z=1 ⇒ gzip + base64, cắt theo off / n ký tự. */
function cbZip_(objFn, p) {
  var cache = CacheService.getScriptCache(), b = null;
  var head = p.fresh === '1' ? null : cache.get('cbz:n');
  if (head) {
    var keys = []; for (var i = 0; i < Number(head); i++) keys.push('cbz:' + i);
    var got = cache.getAll(keys), parts = [];
    for (i = 0; i < keys.length; i++) { if (got[keys[i]] == null) { parts = null; break; } parts.push(got[keys[i]]); }
    if (parts) b = parts.join('');
  }
  if (!b) {
    var s = JSON.stringify(objFn());
    b = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(s, 'application/json')).getBytes());
    var put = {}, n0 = 0;
    for (var o = 0; o < b.length; o += 90000) put['cbz:' + (n0++)] = b.slice(o, o + 90000);
    put['cbz:n'] = String(n0);
    cache.putAll(put, 21600);
  }
  var off = Number(p.off || 0), n = Number(p.n || 5800);
  return { len: b.length, off: off, part: b.slice(off, off + n) };
}

function cbNorm_(s) { return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }

function cbDump_(ss) {
  var sh = ss.getSheetByName(CB.SRC_SHEET);
  var v = sh.getRange(4, 2, sh.getLastRow() - 3, 9).getValues();
  var price = v.filter(function (r) { return r[1] || r[2]; }).map(function (r) {
    return [r[0], r[1], r[2], r[4], r[5], r[6], r[7] ? 1 : 0, r[8] instanceof Date ? Utilities.formatDate(r[8], 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : String(r[8])];
  });
  var td = ss.getSheetByName('Total data');
  var lc = td.getLastColumn(), lr = td.getLastRow();
  var hdr = td.getRange(3, 1, 1, lc).getValues()[0].map(cbNorm_);
  function col(names) { for (var i = 0; i < names.length; i++) { var k = hdr.indexOf(names[i]); if (k >= 0) return k; }
    for (i = 0; i < names.length; i++) for (var j = 0; j < hdr.length; j++) if (hdr[j].indexOf(names[i]) === 0) return j; return -1; }
  var C = { nam: col(['năm']), hang: col(['tên hãng']), nh: col(['tên nhãn hiệu']), lv2: col(['phân loại level 2']),
            w: col(['trọng lượng']), wu: col(['đơn vị trọng lượng']), pcs: col(['số lượng ( pcs)', 'số lượng (pcs)']),
            ngay: col(['ngày đăng ký']), lv1: col(['phân loại level 1']), usd: col(['trị giá usd']) };
  var need = ['nam', 'hang', 'nh', 'lv2', 'w', 'wu', 'pcs', 'ngay', 'lv1'], colv = {};
  need.forEach(function (k) { colv[k] = C[k] >= 0 ? td.getRange(4, C[k] + 1, lr - 3, 1).getValues() : null; });
  var agg = {};
  for (var ri = 0; ri < lr - 3; ri++) {
    var r = {}; need.forEach(function (k) { r[C[k]] = colv[k] ? colv[k][ri][0] : ''; });
    (function (r) {
    var nh = String(r[C.nh] || '').trim(); if (!nh) return;
    var y = r[C.nam] || (r[C.ngay] instanceof Date ? r[C.ngay].getFullYear() : '');
    var k = [String(r[C.hang] || '').trim(), nh, String(r[C.lv2] || '').trim(), String(r[C.lv1] || '').trim()].join('|');
    var a = agg[k] || (agg[k] = { y: {}, w: {}, last: '' });
    var q = Number(r[C.pcs]) || 0;
    a.y[y] = (a.y[y] || 0) + q;
    var wk = (r[C.w] === '' ? '' : r[C.w]) + ' ' + String(r[C.wu] || '');
    a.w[wk] = (a.w[wk] || 0) + 1;
    if (r[C.ngay] instanceof Date) { var d = Utilities.formatDate(r[C.ngay], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); if (d > a.last) a.last = d; }
    })(r);
  }
  return { cols: C, hdr: hdr.slice(0, 80), price: price, agg: agg };
}

/* Bảng gọn: mỗi dòng Giá bán lẻ ⇒ "STT|Hãng|Nhãn hiệu|Phân loại|Xuất xứ|Giá|Quy cách hay gặp|PCS 2024|PCS 2025|PCS 2026|Lần nhập cuối|tầng khớp"
 * Số lượng = Total data cùng hãng + nhãn hiệu + phân loại (tầng 1), không có ⇒ nhãn hiệu + phân loại (2) ⇒ chỉ nhãn hiệu (3). */
function cbData_(ss) {
  var z = cbZip_(function () { return cbDump_(ss); }, { z: '1', off: 0, n: 1e9 });
  return JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(z.part), 'application/x-gzip')).getDataAsString());
}

function cbMatch_(D) {
  var A = {}, keys = Object.keys(D.agg);
  keys.forEach(function (k) {
    var f = k.split('|'), h = cbNorm_(f[0]), nh = cbNorm_(f[1]), l = cbNorm_(f[2]);
    [['1', h + '|' + nh + '|' + l], ['2', nh + '|' + l], ['3', nh]].forEach(function (t) { (A[t[0] + t[1]] = A[t[0] + t[1]] || []).push(k); });
  });
  return D.price.map(function (r) {
    var h = cbNorm_(r[1]), nh = cbNorm_(r[2]), l = cbNorm_(r[3]), hit = null, tier = 0;
    [['1', h + '|' + nh + '|' + l], ['2', nh + '|' + l], ['3', nh]].some(function (t) { if (A[t[0] + t[1]]) { hit = A[t[0] + t[1]]; tier = Number(t[0]); return true; } return false; });
    var y = {}, w = {}, last = '';
    (hit || []).forEach(function (k) { var a = D.agg[k];
      Object.keys(a.y).forEach(function (yy) { y[yy] = (y[yy] || 0) + a.y[yy]; });
      Object.keys(a.w).forEach(function (ww) { w[ww] = (w[ww] || 0) + a.w[ww]; });
      if (a.last > last) last = a.last; });
    var wTop = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; })[0] || '';
    return { r: r, y: y, w: wTop, last: last, tier: tier };
  });
}

function cbRows_(ss, p) {
  var M = cbMatch_(cbData_(ss));
  var lines = M.map(function (m) { var r = m.r;
    return [r[0], r[1], r[2], r[3], r[4], r[5], m.w, Math.round(m.y[2024] || 0), Math.round(m.y[2025] || 0), Math.round(m.y[2026] || 0), m.last, m.tier].join('|'); });
  var off = Number(p.off || 0), n = Number(p.n || 70);
  return { total: lines.length, rows: lines.slice(off, off + n).join('\n') };
}

/* ───────── Giá bán lẻ ⇒ Competitor Benchmark ───────── */
var CBF = {
  FIRST: 22, LAST: 121,                         // bảng B của Competitor Benchmark (100 dòng, công thức bảng A trỏ $22:$121)
  SKIP_BRAND: /^(mani|schutz)$/i,               // hàng của chính MANI / Schütz (Capo, Nanopaq, PrimeBond7) — không phải đối thủ
  SKIP_NAME: /opaque|opaquer|\bcolor\b|gingiva|nexco|basic kit/i,   // vật liệu đặc biệt (che màu, nhuộm, nướu, labo)
  /* Quy tắc ghép với sản phẩm MANI (theo tài liệu MMG: Flow V = flow độ nhớt cao; Hybrid Ease = composite đặc phục hồi thường quy,
   * dễ thao tác; Micro Hybrid = thẩm mỹ, Smart Shade; Nano = chịu lực cao). Sửa danh sách từ khoá để ghép khác rồi chạy lại. */
  BULK: /bulk|\bsdr\b|everx|powerflow/i,
  FLOW_V: /injectable|universal flow|majes\w* es flow|omnichroma/i,
  MICRO: /omnichroma|easy match|simplishade|estelite(?! posterior)|palfique (lx5|asteria)|beautifil ii|everglow|empress direct|amaris|vittra|harmonize|forma\b|reflectys|zenchrm|\bluna\b|twiny|a\.uno|a\.nuo|opallis|nt premium|cirus/i,
  NANO: /z350|filtek supreme|nano|p60|posterior|n-ceram|ceram\.x|ap-x|herculite|polofil nht|nanofil|charmfil|sculpt/i,
  CAP: { 'MANIBond 7th Gen': 18, 'MANIFill Bulk': 12, 'MANIFill Hybrid Ease': 15, 'MANIFill Flow': 14, 'MANIFill Flow V': 10,
         'MANIFill Micro Hybrid': 15, 'MANIFill Nano': 16 },
  ORDER: ['MANIBond 7th Gen', 'MANIFill Bulk', 'MANIFill Hybrid Ease', 'MANIFill Flow', 'MANIFill Flow V', 'MANIFill Micro Hybrid', 'MANIFill Nano'],
  BRAND: { '3M': '3M', 'GC': 'GC', 'DMP': 'DMP', 'VOCO': 'VOCO', 'SDI': 'SDI', 'DMG': 'DMG', 'B&E': 'B&E', 'B.J.M': 'BJM',
           'DENTSPLY': 'Dentsply Sirona', 'KURARAY NORITAKE': 'Kuraray Noritake', 'PREVEST DENPRO LIMITED': 'Prevest DenPro',
           'UAB MEDICINOS': 'Medicinos', 'UAB MEDICINOS LINIJA': 'Medicinos', 'MEDICINOS': 'Medicinos', 'SHANDONG HUGE': 'Huge Dental',
           'HUGE DENTAL': 'Huge Dental', 'PRIME DENTAL (USA)': 'Prime Dental', 'PRIME DENTAL PRODUCTS (INDIA)': 'Prime Dental (India)',
           'ITENA CLINICAL': 'Itena', 'GACD S.A.S': 'GACD', 'CAVEX HOLLAND': 'Cavex', 'SILMET LTD': 'Silmet', 'META BIOMED': 'Meta Biomed',
           'IL-CHUNG': 'Il-Chung', 'MEGA-PHYSIK': 'Mega-Physik', 'PAC-DENT': 'Pac-Dent', 'DIADENT': 'DiaDent', 'DENTKIST': 'Dentkist' },
  COUNTRY: { 'United States of America': 'USA', 'Korea (Republic)': 'Korea', 'United Kingdom': 'UK' }
};

function cbBrand_(h) {
  h = String(h || '').trim();
  if (CBF.BRAND[h.toUpperCase()]) return CBF.BRAND[h.toUpperCase()];
  return h.toLowerCase().replace(/(^|[\s\-\/(])([a-zà-ỹ])/g, function (m, a, b) { return a + b.toUpperCase(); });
}

function cbGroup_(r) {
  var lv2 = String(r[3] || '').trim(), nm = String(r[2] || '').trim();
  if (/^gen\b/i.test(lv2)) return { g: 'MANIBond 7th Gen', why: 'keo dán ' + lv2 };
  if (/capsule/i.test(lv2)) return null;                                     // MANI không có dạng nhộng
  if (CBF.SKIP_NAME.test(nm)) return null;
  if (/bulk/i.test(lv2) || CBF.BULK.test(nm)) return { g: 'MANIFill Bulk', why: 'trám khối (' + lv2 + ')' };
  if (/^flow$/i.test(lv2) || /\bflo(w)?\b/i.test(nm)) {
    return CBF.FLOW_V.test(nm) ? { g: 'MANIFill Flow V', why: 'flow độ nhớt cao / injectable' } : { g: 'MANIFill Flow', why: 'flow độ nhớt thấp' };
  }
  if (CBF.MICRO.test(nm)) return { g: 'MANIFill Micro Hybrid', why: 'composite đặc thẩm mỹ / ít màu' };
  if (CBF.NANO.test(nm)) return { g: 'MANIFill Nano', why: 'composite đặc nano / chịu lực' };
  return { g: 'MANIFill Hybrid Ease', why: 'composite đặc phục hồi thường quy' };
}

function cbIso_(s) {
  var m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}

function cbPlan_(ss) {
  var D = cbData_(ss), M = cbMatch_(D);
  /* Ngày lấy data: đọc chữ hiển thị (ô ngày trong sheet nguồn có ô bị lưu đảo ngày ↔ tháng, chữ hiển thị mới đúng ý người nhập) */
  var shP = ss.getSheetByName(CB.SRC_SHEET), dv = shP.getRange(4, 2, shP.getLastRow() - 3, 9).getDisplayValues(), dmap = {};
  dv.forEach(function (x) { dmap[[cbNorm_(x[1]), cbNorm_(x[2]), cbNorm_(x[4])].join('|')] = x[8]; });
  /* Thị phần = số lượng nhập khẩu 2025 của dòng ÷ tổng của mọi dòng (có giá bán lẻ) cùng nhóm sản phẩm MANI, kể cả MANI */
  var den = {}, dseen = {};
  M.forEach(function (m) {
    var G = Number(m.r[5]) > 0 ? cbGroup_(m.r) : null; if (!G) return;
    var k = cbNorm_(m.r[1]) + '|' + cbNorm_(m.r[2]) + '|' + G.g, v = m.y[2025] || 0;
    if (dseen[k] != null) { if (v > dseen[k]) { den[G.g] += v - dseen[k]; dseen[k] = v; } return; }
    dseen[k] = v; den[G.g] = (den[G.g] || 0) + v;
  });
  function denOf(g) { return den[g] || 0; }

  var seen = {}, cand = [], skipped = 0;
  M.forEach(function (m) {
    var r = m.r;
    if (CBF.SKIP_BRAND.test(String(r[1]).trim()) || !(Number(r[5]) > 0)) { skipped++; return; }
    var G = cbGroup_(r); if (!G) { skipped++; return; }
    var v25 = m.y[2025] || 0, v26 = m.y[2026] || 0, vol = v25 + v26;
    var key = cbNorm_(r[1]) + '|' + cbNorm_(r[2]) + '|' + G.g;
    var c = { r: r, g: G.g, why: G.why, v25: v25, v26: v26, vol: vol, w: m.w, tier: m.tier };
    if (seen[key]) { if (vol > seen[key].vol) { cand[cand.indexOf(seen[key])] = c; seen[key] = c; } skipped++; return; }
    seen[key] = c; cand.push(c);
  });
  cand.sort(function (a, b) { return b.vol - a.vol || b.v26 - a.v26; });
  var take = [], cnt = {}, rest = [];
  cand.forEach(function (c) { cnt[c.g] = cnt[c.g] || 0; if (cnt[c.g] < (CBF.CAP[c.g] || 0)) { take.push(c); cnt[c.g]++; } else rest.push(c); });
  var room = CBF.LAST - CBF.FIRST + 1;
  rest.forEach(function (c) { if (take.length < room) take.push(c); });
  var left = cand.length - Math.min(take.length, room);
  take = take.slice(0, room);
  take.sort(function (a, b) { return CBF.ORDER.indexOf(a.g) - CBF.ORDER.indexOf(b.g) || b.vol - a.vol || Number(a.r[5]) - Number(b.r[5]); });

  var rows = take.map(function (c) {
    var r = c.r, w = String(c.w || '').trim(), wm = w.match(/^([\d.]+)\s*(g|ml)$/i);
    var qty = wm ? Number(wm[1]) : '', unit = wm ? wm[2].toLowerCase() : '';
    var dn = denOf(c.g), share = dn > 0 && c.v25 > 0 ? Math.round(c.v25 / dn * 1e6) / 1e6 : '';
    var note = 'So với ' + c.g + ': ' + c.why + ' · nhập khẩu 2025: ' + Math.round(c.v25).toLocaleString('en-US') +
               ' PCS · 2026 (đến 05/2026): ' + Math.round(c.v26).toLocaleString('en-US') + ' PCS';
    return {
      B: c.g, D: cbBrand_(r[1]), E: String(r[2]).trim(), F: CBF.COUNTRY[r[4]] || r[4],
      G: wm ? String(qty).replace('.', ',') + ' ' + unit : '', H: qty, I: unit, J: Number(r[5]), K: '', L: share,
      P: 'Data composite · Giá bán lẻ', Q: cbIso_(dmap[[cbNorm_(r[1]), cbNorm_(r[2]), cbNorm_(r[3])].join('|')] || r[7]), R: note
    };
  });
  return { rows: rows, cnt: cnt, cand: cand.length, skipped: skipped, notIn: left, den: den };
}

function cbFill_(ss, p) {
  var P = cbPlan_(ss), op = p.op || 'dry';
  var out = { ok: true, op: op, n: P.rows.length, cand: P.cand, skipped: P.skipped, notIn: P.notIn, den: P.den, byGroup: {} };
  P.rows.forEach(function (x) { out.byGroup[x.B] = (out.byGroup[x.B] || 0) + 1; });
  if (op === 'dry') {
    var off = Number(p.off || 0), n = Number(p.n || 100);
    out.lines = P.rows.slice(off, off + n).map(function (x, i) {
      return (off + i + 22) + '|' + x.B.replace(/^MANI(Fill|Bond) ?/, '') + '|' + x.D + '|' + x.E + '|' + x.F + '|' + x.G + '|' + x.J + '|' + x.L + '|' + x.Q;
    }).join('\n');
    return out;
  }
  if (op !== 'run') return { ok: false, code: 'OP' };
  var sh = SpreadsheetApp.openById(CB.DST_ID).getSheetByName(CB.DST_SHEET);
  var hdr = sh.getRange('A20:R20').getDisplayValues()[0].join('|');
  if (!/Compare with/i.test(hdr) || !/Competitor brand/i.test(hdr) || !/END-USER price/i.test(hdr)) return { ok: false, code: 'LAYOUT', hdr: hdr };
  var n0 = CBF.LAST - CBF.FIRST + 1, colB = [], colDL = [], colPR = [];
  for (var i = 0; i < n0; i++) {
    var x = P.rows[i];
    colB.push([x ? x.B : '']);
    colDL.push(x ? [x.D, x.E, x.F, x.G, x.H, x.I, x.J, x.K, x.L] : ['', '', '', '', '', '', '', '', '']);
    colPR.push(x ? [x.P, x.Q, x.R] : ['', '', '']);
  }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    sh.getRange(CBF.FIRST, 2, n0, 1).setValues(colB);          // B  (C = công thức, giữ nguyên)
    sh.getRange(CBF.FIRST, 4, n0, 9).setValues(colDL);         // D–L (M, N, O = công thức, giữ nguyên)
    sh.getRange(CBF.FIRST, 16, n0, 3).setValues(colPR);        // P–R
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  out.after = sh.getRange('B7:S17').getDisplayValues().map(function (r) { return [r[1], r[8], r[10], r[11], r[13], r[14], r[17]].join(' | '); });
  return out;
}

/* Chạy tay trong trình soạn Apps Script (cùng việc với ?action=cbFill&op=run) */
function capNhatCompetitorBenchmark() {
  var r = cbFill_(SpreadsheetApp.getActiveSpreadsheet(), { op: 'run' });
  Logger.log(JSON.stringify(r, null, 1));
  return r;
}
