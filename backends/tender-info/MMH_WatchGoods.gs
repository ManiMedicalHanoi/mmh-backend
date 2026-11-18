/* ════════════════════════════════════════════════════════════════════
   MMH_WatchGoods.gs v1.2 (18/11/2026 — v1.2: mọi điều kiện khớp theo từ; v1.1: khớp nguyên ô / nguyên từ + gợi ý theo bộ lọc; v1.0, người dùng yêu cầu) — LỌC + TẢI "HÀNG HÓA TRÚNG THẦU" THEO TỪ KHOÁ
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

/* ── bộ lọc v1.1 (18/11/2026, người dùng: "chọn hãng nào chỉ ra đúng hãng đó") ──
   p.f = JSON {hang|win|dm|place: [[giá trị, x]]}: x = 1 ⇒ KHỚP NGUYÊN Ô (giá trị chọn từ danh sách gợi ý, so không dấu / hoa thường);
   x = 0 ⇒ ô CHỨA ĐỦ CỤM TỪ theo NGUYÊN TỪ (gõ "mani" khớp "MANI, Inc" nhưng không khớp "Romania"). Nhiều giá trị trong 1 ô = HOẶC.
   Tham số cũ hang / win / dm / place (chữ, phẩy) vẫn nhận ⇒ cụm từ. */
WTG.FIELD = { hang: [8], win: [6], dm: [7], place: [1, 2, 3, 4, 0] };
WTG.EXACT_PLACE = [1, 2, 0];
function wtgKeys_(v) { return wtS_(v).split(/[,;\n]+/).map(wtmK_).filter(String); }
function wtgSpec_(p) {
  let f = null;
  if (wtS_(p.f)) { try { f = JSON.parse(p.f); } catch (e) { f = null; } }
  if (!f) { f = {}; ['hang', 'win', 'dm', 'place'].forEach(function (k) { const a = wtgKeys_(p[k]); if (a.length) f[k] = a.map(function (v) { return [v, 0]; }); }); }
  const out = [];
  Object.keys(WTG.FIELD).forEach(function (k) {
    const L = (f[k] || []).map(function (c) { return Array.isArray(c) ? [wtmK_(c[0]), +c[1] ? 1 : 0] : [wtmK_(c), 0]; }).filter(function (c) { return c[0]; });
    if (L.length) out.push({ k: k, cols: WTG.FIELD[k], chips: L });
  });
  return out;
}
/* v1.2 (18/11/2026, người dùng: "chọn Mani thì phải ra cả MANI, Inc"): MỌI điều kiện (chọn từ gợi ý hay gõ tự do) = ô CHỨA ĐỦ CỤM TỪ theo NGUYÊN TỪ
   (không dấu / hoa thường): "Mani" khớp "Mani", "MANI, Inc", "Mani Inc." nhưng không khớp "Romania". Gợi ý chỉ để chọn nhanh đúng chính tả. */
function wtgHit_(r, f, K) {
  return f.chips.some(function (c) {
    const w = ' ' + c[0] + ' ';
    return f.cols.some(function (i) { return (' ' + K(r, i) + ' ').indexOf(w) >= 0; });
  });
}
function wtgKeyer_() { const m = {}; return function (r, i) { const v = r[i]; if (v === '' || v == null) return ''; const s = String(v); return m[s] !== undefined ? m[s] : (m[s] = wtmK_(s)); }; }

function wtgGoods_(me, p) {
  const d = wtgData_(), K = wtgKeyer_();
  if (wtS_(p.op) === 'facets') {
    const pk = {}; d.rows.forEach(function (r) { pk[r[14]] = 1; });
    return { ok: true, n: d.rows.length, pkgs: Object.keys(pk).length, mg: wtmUrls_() };
  }
  const F = wtgSpec_(p), any = wtS_(p.mode) === 'any';
  if (wtS_(p.op) === 'suggest') {
    const fk = wtS_(p.field) in WTG.FIELD ? wtS_(p.field) : 'hang';
    const other = F.filter(function (f) { return f.k !== fk; });
    const q = wtmK_(p.q).split(' ').filter(String);
    const cols = fk === 'place' ? WTG.EXACT_PLACE : WTG.FIELD[fk];
    const m = {}; let rowsIn = 0;
    d.rows.forEach(function (r) {
      if (other.length && !any && !other.every(function (f) { return wtgHit_(r, f, K); })) return;
      rowsIn++;
      cols.forEach(function (i) {
        const kv = K(r, i); if (!kv) return;
        if (q.length) { const w = ' ' + kv; if (!q.every(function (t) { return w.indexOf(' ' + t) >= 0; })) return; }
        const id = i + '|' + kv;
        if (!m[id]) m[id] = [String(r[i]), 0, fk === 'place' ? (i === 1 ? 'Tỉnh' : i === 2 ? 'Chủ đầu tư' : 'Khu vực') : ''];
        m[id][1]++;
      });
    });
    let all = Object.keys(m).map(function (k) { return m[k]; });
    all.sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
    const more = Math.max(0, all.length - 40);
    // số dòng hiện bên cạnh = số dòng SẼ ra khi chọn (khớp theo từ: "Mani" đếm cả "MANI, Inc"); bỏ giá trị trùng cách viết
    const cand = all.slice(0, 60), seenK = {};
    const fcols = WTG.FIELD[fk];
    cand.forEach(function (c) { c[3] = wtmK_(c[0]); c[1] = 0; });
    d.rows.forEach(function (r) {
      if (other.length && !any && !other.every(function (f) { return wtgHit_(r, f, K); })) return;
      const txt = fcols.map(function (i) { return ' ' + K(r, i) + ' '; }).join('|');
      cand.forEach(function (c) { if (txt.indexOf(' ' + c[3] + ' ') >= 0) c[1]++; });
    });
    all = cand.filter(function (c) { if (seenK[c[3]]) return false; seenK[c[3]] = 1; return true; })
      .sort(function (a, b) { return b[1] - a[1] || a[0].length - b[0].length; }).slice(0, 40).map(function (c) { return [c[0], c[1], c[2]]; });
    return { ok: true, field: fk, q: wtS_(p.q), list: all, more: more, rows: rowsIn };
  }
  if (!F.length) return { ok: false, error: 'Chọn ít nhất 1 điều kiện: Hãng sản xuất, Nhà thầu trúng thầu hoặc Danh mục hàng hóa.' };
  const out = [], pk = {}; let n = 0, sum = 0;
  d.rows.forEach(function (r) {
    if (!(any ? F.some(function (f) { return wtgHit_(r, f, K); }) : F.every(function (f) { return wtgHit_(r, f, K); }))) return;
    n++; pk[r[14]] = 1; if (typeof r[13] === 'number') sum += r[13];
    if (out.length < WTG.MAX) out.push(r.slice(0, 14).concat([wtgLosers_(d, r)]));
  });
  return { ok: true, cols: WTG.COLS, rows: out, n: n, pkgs: Object.keys(pk).length, sum: sum, cut: n > out.length, total: d.rows.length, mg: wtmUrls_() };
}
