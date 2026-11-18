/* ════════════════════════════════════════════════════════════════════
   MMH_WatchGoods.gs v1.0 (18/11/2026, người dùng yêu cầu) — LỌC + TẢI "HÀNG HÓA TRÚNG THẦU" THEO TỪ KHOÁ
   Nguồn: 2 file tổng do MMH_WatchMerge.gs gộp — ① "Kết quả trúng thầu - Tổng hợp danh mục hàng hóa" ② "Danh mục nhà thầu tham dự - Tổng hợp danh sách nhà thầu".
   wGoods {hang, win, dm, place, mode: all|any}  (mỗi ô nhiều từ khoá cách nhau dấu phẩy / chấm phẩy = HOẶC trong ô;
     giữa các ô: all = VÀ (mặc định) · any = HOẶC; so không dấu, chứa là khớp)
     ⇒ { cols, rows (≤ WTG.MAX), n (tổng khớp), pkgs, cut } — mỗi dòng 1 mặt hàng + cột "Nhà thầu tham dự không trúng":
     nhà thầu cùng số TBMT + cùng phần / lô ở file ②, bỏ nhà thầu trúng (Kết quả "trúng" / Giá trúng thầu / trùng tên nhà thầu trúng),
     kèm giá dự thầu + lý do không đáp ứng (hoặc chữ ở cột Kết quả).
   wGoods {op: 'facets'} ⇒ gợi ý: Hãng sản xuất · Nhà thầu trúng thầu · Danh mục hàng hóa · Tỉnh / CĐT (tên + số dòng).
   Đệm dữ liệu gọn (wtBigPut_ 'wtg_d', 6 giờ) theo dấu = số dòng 2 file + lần gộp cuối ⇒ gộp mới ⇒ đọc lại.
   ════════════════════════════════════════════════════════════════════ */
const WTG = { MAX: 3000, TTL: 21600, FAC: 400 };
WTG.COLS = ['Khu vực', 'Tỉnh thành', 'Chủ đầu tư', 'Tên gói thầu', 'Số TBMT', 'Phần / lô', 'Nhà thầu trúng thầu', 'Danh mục hàng hóa', 'Hãng sản xuất',
  'Đơn vị tính', 'Khối lượng', 'Cấu hình, tính năng kỹ thuật cơ bản', 'Đơn giá trúng thầu', 'Thành tiền', 'Nhà thầu tham dự không trúng (giá dự thầu · lý do)'];

/** mở 1 file tổng (không tạo mới) ⇒ { sh, last, head } hoặc null */
function wtgOpen_(k) {
  const id = PropertiesService.getScriptProperties().getProperty(WTM.KIND[k].prop);
  if (!id) return null;
  try {
    const sh = SpreadsheetApp.openById(id).getSheetByName(WTM.KIND[k].sheet);
    if (!sh) return null;
    const last = sh.getLastRow(), lc = sh.getLastColumn();
    return { sh: sh, last: last, lc: lc, head: last >= 1 ? sh.getRange(1, 1, 1, lc).getValues()[0].map(wtS_) : [] };
  } catch (e) { return null; }
}
function wtgFmt_(n) { n = Math.round(+n || 0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

/** dữ liệu gọn: rows [region, prov, inv, pkg, no, lot, win, item, hang, dvt, qty, cfg, price, amount, bare, lotKey] + lose {bare: {lotKey|'*': [[tên, giá, lý do]]}} */
function wtgData_() {
  const H = wtgOpen_('hh'), N = wtgOpen_('nt');
  if (!H || H.last < 2) return { rows: [], lose: {}, sig: 'empty' };
  const last = JSON.parse(PropertiesService.getScriptProperties().getProperty('WT_MG_LAST') || '{}');
  const sig = H.last + '/' + (N ? N.last : 0) + '/' + (last.at || '');
  const c = CacheService.getScriptCache(), hit = wtBigGet_(c, 'wtg_d');
  if (hit) { try { const d = JSON.parse(hit); if (d.sig === sig) return d; } catch (e) {} }

  const col = function (head, names) { for (let i = 0; i < names.length; i++) { const j = head.indexOf(names[i]); if (j >= 0) return j; } return -1; };
  const hh = H.head, ix = {
    region: col(hh, ['Khu vực']), prov: col(hh, ['Tỉnh thành']), inv: col(hh, ['Chủ đầu tư']), pkg: col(hh, ['Tên gói thầu']), no: col(hh, ['Số TBMT']),
    lot: col(hh, ['Mã phần/lô']), lotN: col(hh, ['Tên phần/lô']), win: col(hh, ['Nhà thầu trúng thầu']), item: col(hh, ['Danh mục hàng hóa']),
    hang: col(hh, ['Hãng sản xuất']), dvt: col(hh, ['Đơn vị tính']), qty: col(hh, ['Khối lượng']), cfg: col(hh, ['Cấu hình, tính năng kỹ thuật cơ bản']),
    price: col(hh, ['Đơn giá trúng thầu']), amount: col(hh, ['Thành tiền (đã bao gồm thuế, phí, lệ phí)']), key: col(hh, ['Khoá'])
  };
  const g = function (r, j) { return j >= 0 ? r[j] : ''; };
  const num = function (v) { const x = wtmNum_(v); return typeof x === 'number' ? x : (wtS_(v) ? wtS_(v) : ''); };
  const V = H.sh.getRange(2, 1, H.last - 1, H.lc).getValues();
  const rows = [];
  V.forEach(function (r) {
    const item = wtS_(g(r, ix.item)), hang = wtS_(g(r, ix.hang)), win = wtS_(g(r, ix.win));
    if (!item && !hang && !win) return;                      // dòng lô không có hàng
    const lotC = wtS_(g(r, ix.lot)), lotN = wtS_(g(r, ix.lotN));
    const bare = wtS_(g(r, ix.key)) || wtmBare_(g(r, ix.no));
    rows.push([wtS_(g(r, ix.region)), wtS_(g(r, ix.prov)), wtS_(g(r, ix.inv)), wtS_(g(r, ix.pkg)), wtS_(g(r, ix.no)),
      [lotC, lotN].filter(String).join(' · '), win, item, hang, wtS_(g(r, ix.dvt)), num(g(r, ix.qty)), wtS_(g(r, ix.cfg)).slice(0, 3000),
      num(g(r, ix.price)), num(g(r, ix.amount)), bare, wtmK_(lotC) || wtmK_(lotN)]);
  });

  // nhà thầu tham dự: theo số TBMT + phần / lô (khoá mã lô, dự phòng tên lô)
  const lose = {};
  if (N && N.last >= 2) {
    const nh = N.head, jx = {
      lot: col(nh, ['Mã phần (lô)']), lotN: col(nh, ['Tên phần (lô)']), name: col(nh, ['Tên nhà thầu']), bid: col(nh, ['Giá dự thầu']),
      kq: col(nh, ['Kết quả']), win: col(nh, ['Giá trúng thầu (VND)']), why: col(nh, ['Lý do không đáp ứng']), key: col(nh, ['Khoá']), no: col(nh, ['Số TBMT'])
    };
    N.sh.getRange(2, 1, N.last - 1, N.lc).getValues().forEach(function (r) {
      const name = wtS_(g(r, jx.name)); if (!name) return;
      const bare = wtS_(g(r, jx.key)) || wtmBare_(g(r, jx.no)); if (!bare) return;
      const kq = wtS_(g(r, jx.kq)), kqk = wtmK_(kq), wp = +wtmNum_(g(r, jx.win)) || 0;
      const isWin = (/trung/.test(kqk) && !/khong|truot|loai|huy/.test(kqk)) || wp > 0;
      const bid = +wtmNum_(g(r, jx.bid)) || 0, why = wtS_(g(r, jx.why)) || (isWin ? '' : kq);
      const P = lose[bare] || (lose[bare] = {});
      const ent = [name, bid, why.slice(0, 400), isWin ? 1 : 0];
      const k1 = wtmK_(g(r, jx.lot)), k2 = wtmK_(g(r, jx.lotN));
      (P[k1 || '*'] = P[k1 || '*'] || []).push(ent);
      if (k2 && k2 !== k1) (P['n:' + k2] = P['n:' + k2] || []).push(ent);
    });
  }
  const d = { sig: sig, rows: rows, lose: lose };
  const s = JSON.stringify(d);
  if (s.length < 8e6) wtBigPut_(c, 'wtg_d', s, WTG.TTL);
  return d;
}

/** chuỗi "nhà thầu không trúng" cho 1 dòng hàng */
function wtgLosers_(d, r) {
  const P = d.lose[r[14]]; if (!P) return '';
  const lk = r[15];
  let L = (lk && (P[lk] || P['n:' + lk])) || null;
  if (!L) {
    const lots = Object.keys(P).filter(function (k) { return k !== '*' && k.indexOf('n:') !== 0; });
    if (!lots.length && P['*']) L = P['*'];                 // gói 1 phần / file nhà thầu không chia lô (lô không khớp ⇒ để trống, không đoán)
  }
  if (!L) return '';
  const wk = wtmK_(r[6]), seen = {}, out = [];
  L.forEach(function (e) {
    const nk = wtmK_(e[0]);
    if (e[3] || !nk || seen[nk]) return;
    if (wk && (wk === nk || wk.indexOf(nk) >= 0 || nk.indexOf(wk) >= 0)) return;
    seen[nk] = 1;
    out.push(e[0] + (e[1] ? ' · giá dự thầu ' + wtgFmt_(e[1]) : '') + (e[2] ? ' — ' + e[2] : ''));
  });
  return out.join('\n');
}

function wtgKeys_(v) { return wtS_(v).split(/[,;\n]+/).map(wtmK_).filter(String); }

function wtgGoods_(me, p) {
  const d = wtgData_();
  if (wtS_(p.op) === 'facets') {
    const top = function (i) {
      const m = {};
      d.rows.forEach(function (r) { const v = r[i]; if (!v) return; const k = wtmK_(v); if (!m[k]) m[k] = [v, 0]; m[k][1]++; });
      return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, WTG.FAC);
    };
    const pk = {}; d.rows.forEach(function (r) { pk[r[14]] = 1; });
    return { ok: true, n: d.rows.length, pkgs: Object.keys(pk).length, hang: top(8), win: top(6), dm: top(7), prov: top(1), inv: top(2), mg: wtmUrls_() };
  }
  const F = [[wtgKeys_(p.hang), [8]], [wtgKeys_(p.win), [6]], [wtgKeys_(p.dm), [7]], [wtgKeys_(p.place), [0, 1, 2, 3, 4]]].filter(function (f) { return f[0].length; });
  if (!F.length) return { ok: false, error: 'Nhập ít nhất 1 từ khoá: Hãng sản xuất, Nhà thầu trúng thầu hoặc Danh mục hàng hóa.' };
  const any = wtS_(p.mode) === 'any';
  const hit = function (r, f) { return f[1].some(function (i) { const v = ' ' + wtmK_(r[i]) + ' '; return f[0].some(function (k) { return v.indexOf(k) >= 0; }); }); };
  const out = [], pk = {}; let n = 0, sum = 0;
  d.rows.forEach(function (r) {
    if (!(any ? F.some(function (f) { return hit(r, f); }) : F.every(function (f) { return hit(r, f); }))) return;
    n++; pk[r[14]] = 1; if (typeof r[13] === 'number') sum += r[13];
    if (out.length < WTG.MAX) out.push(r.slice(0, 14).concat([wtgLosers_(d, r)]));
  });
  return { ok: true, cols: WTG.COLS, rows: out, n: n, pkgs: Object.keys(pk).length, sum: sum, cut: n > out.length, total: d.rows.length, mg: wtmUrls_() };
}
