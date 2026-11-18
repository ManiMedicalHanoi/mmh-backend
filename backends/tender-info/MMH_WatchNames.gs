/* ════════════════════════════════════════════════════════════════════
   MMH_WatchNames.gs v1.0 (18/11/2026, người dùng yêu cầu) — TÊN CHUNG: ĐỐI CHIẾU CHỦ ĐẦU TƯ ⇄ KHÁCH CRM ⇄ DANH MỤC CƠ SỞ Y TẾ
   KHÔNG sửa tên ở bất kỳ file nào (CUSTOMER CODE của CRM, danh mục cơ sở y tế, dữ liệu Báo Đấu Thầu giữ nguyên) — chỉ ghi 1 BẢNG ĐỐI CHIẾU riêng:
   sheet ẩn "TÊN CHUNG · ĐỐI CHIẾU" (1 dòng / khách CRM hoặc cơ sở của danh mục): tên theo nguồn (bản sao để đọc) ⇒ tên chủ đầu tư trên muasamcong + độ khớp + trạng thái.
     Tự khớp      = tên trùng sau khi chuẩn hoá (bỏ dấu, mở BV / BVĐK / TTYT…) + cùng tỉnh (34 tỉnh mới, nhận cả tên tỉnh cũ) và không có tên trùng khác
     Cần xác nhận = gần giống (tên nằm trong tên kia, nhiều từ riêng trùng nhau) hoặc nhiều chủ đầu tư cùng tên ⇒ người dùng bấm Đúng / Không phải
     Đã xác nhận / Không khớp = người dùng chọn (lượt đối chiếu sau KHÔNG ghi đè)
   Lượt đối chiếu: workflow "Theo dõi gói thầu — đối chiếu tên" (tools/msc/names.mjs, hằng đêm + bấm tay) đọc customerIndex 3 CRM VN + csyt.js ⇒ botNameSync.
   Bộ so tên (wn*) là hàm THUẦN — names.mjs nạp chính file này để so giống hệt máy chủ.
   App (phiên email công ty):
     wAcct {src, code, name, prov, alt} — Working Map: khách / cơ sở ⇒ chủ đầu tư + gói thầu sơ bộ (đang mời thầu · kết quả · kế hoạch 12 tháng, 6 gói mới nhất)
     wName {op: list|set|find}          — xem / xác nhận đối chiếu (Theo dõi gói thầu ▸ Cài đặt ▸ Đối chiếu tên, Working Map ▸ "Có phải…")
     wPkgs trả thêm crm (khách CRM đã khớp với chủ đầu tư) ⇒ app Theo dõi hiện "Khách CRM" + link Working Map.
   ════════════════════════════════════════════════════════════════════ */
var WN = {
  VER: '1.0',
  SH: 'TÊN CHUNG · ĐỐI CHIẾU',
  HEAD: ['ID', 'Nguồn', 'Mã', 'Tên theo nguồn', 'Tỉnh theo nguồn', 'Loại', 'PIC', 'Tên chủ đầu tư (muasamcong)', 'Khoá CĐT', 'Mã cơ sở (danh mục)',
    'Tên cơ sở (danh mục)', 'Độ khớp', 'Cách khớp', 'Trạng thái', 'Gợi ý (JSON)', 'Người xác nhận', 'Xác nhận lúc', 'Cập nhật lúc', 'Cách viết khác của CĐT (JSON)'],
  ST: { AUTO: 'Tự khớp', OK: 'Đã xác nhận', ASK: 'Cần xác nhận', NO: 'Không khớp', NONE: 'Chưa thấy trên muasamcong' },
  SRC: { 'crm-surgical': 'CRM Surgical', 'crm-dental': 'CRM Dental', 'crm-eyeless': 'CRM Eyeless', csyt: 'Danh mục cơ sở y tế' },
  AUTO: 90, ASK: 65
};

/* ══════════ BỘ SO TÊN (thuần — không gọi dịch vụ Google) ══════════ */
var WN_PROV = [['Hà Nội', ['Hà Nội']], ['Bắc Ninh', ['Bắc Ninh', 'Bắc Giang']], ['Quảng Ninh', ['Quảng Ninh']], ['Hải Phòng', ['Hải Phòng', 'Hải Dương']],
  ['Hưng Yên', ['Hưng Yên', 'Thái Bình']], ['Ninh Bình', ['Ninh Bình', 'Nam Định', 'Hà Nam']], ['Cao Bằng', ['Cao Bằng']], ['Tuyên Quang', ['Tuyên Quang', 'Hà Giang']],
  ['Lào Cai', ['Lào Cai', 'Yên Bái']], ['Thái Nguyên', ['Thái Nguyên', 'Bắc Kạn', 'Bắc Cạn']], ['Lạng Sơn', ['Lạng Sơn']], ['Phú Thọ', ['Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình', 'Hoà Bình']],
  ['Điện Biên', ['Điện Biên']], ['Lai Châu', ['Lai Châu']], ['Sơn La', ['Sơn La']], ['Thanh Hóa', ['Thanh Hóa', 'Thanh Hoá']], ['Nghệ An', ['Nghệ An']], ['Hà Tĩnh', ['Hà Tĩnh']],
  ['Quảng Trị', ['Quảng Trị', 'Quảng Bình']], ['Huế', ['Thừa Thiên Huế', 'Thừa Thiên - Huế', 'TT Huế', 'Huế']], ['Đà Nẵng', ['Đà Nẵng', 'Quảng Nam']], ['Quảng Ngãi', ['Quảng Ngãi', 'Kon Tum']],
  ['Khánh Hòa', ['Khánh Hòa', 'Khánh Hoà', 'Ninh Thuận']], ['Gia Lai', ['Gia Lai', 'Bình Định']], ['Đắk Lắk', ['Đắk Lắk', 'Đắc Lắc', 'Dak Lak', 'Phú Yên']],
  ['Lâm Đồng', ['Lâm Đồng', 'Đắk Nông', 'Đắc Nông', 'Bình Thuận']], ['Tây Ninh', ['Tây Ninh', 'Long An']], ['Đồng Nai', ['Đồng Nai', 'Bình Phước']],
  ['Hồ Chí Minh', ['Hồ Chí Minh', 'TP HCM', 'TPHCM', 'HCM', 'Sài Gòn', 'Bình Dương', 'Bà Rịa - Vũng Tàu', 'Bà Rịa Vũng Tàu', 'Vũng Tàu']],
  ['Vĩnh Long', ['Vĩnh Long', 'Bến Tre', 'Trà Vinh']], ['Đồng Tháp', ['Đồng Tháp', 'Tiền Giang']], ['An Giang', ['An Giang', 'Kiên Giang']],
  ['Cần Thơ', ['Cần Thơ', 'Hậu Giang', 'Sóc Trăng']], ['Cà Mau', ['Cà Mau', 'Bạc Liêu']]];
function wnFold_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
var WN_PIX = null;
function wnProvIx_() {
  if (WN_PIX) return WN_PIX;
  WN_PIX = [];
  WN_PROV.forEach(function (p) { p[1].concat([p[0]]).forEach(function (o) { WN_PIX.push([' ' + wnFold_(o) + ' ', p[0]]); }); });
  WN_PIX.sort(function (a, b) { return b[0].length - a[0].length; });
  return WN_PIX;
}
/** tỉnh (cũ / mới, chữ tự do) ⇒ tên 1 trong 34 tỉnh mới, không nhận ra ⇒ '' */
function wnProv_(s) {
  const t = ' ' + wnFold_(s) + ' ';
  if (t.length < 3) return '';
  const ix = wnProvIx_();
  for (let i = 0; i < ix.length; i++) if (t.indexOf(ix[i][0]) >= 0) return ix[i][1];
  return '';
}
/** khoá tên: bỏ dấu, mở viết tắt, bỏ "tỉnh / thành phố", bỏ khoảng trắng */
function wnKey_(s) {
  return wnFold_(s).replace(/^(chu dau tu|ben moi thau|cdt|bmt)\s+/, '').replace(/^(chi nhanh\s+)?(cong ty (co phan|tnhh( mtv| mot thanh vien)?)?)\s+(?=benh vien|phong kham|nha khoa)/, '')
    .replace(/\bbvdkkv\b/g, 'benh vien da khoa khu vuc').replace(/\bbvdk\b/g, 'benh vien da khoa').replace(/\bbvyhct\b/g, 'benh vien y hoc co truyen')
    .replace(/\bbv\b/g, 'benh vien').replace(/\bttyt\b/g, 'trung tam y te').replace(/\bdkkv\b/g, 'da khoa khu vuc').replace(/\bdk\b/g, 'da khoa')
    .replace(/\btw\b/g, 'trung uong').replace(/\bdhyd\b/g, 'dai hoc y duoc').replace(/\bdh\b/g, 'dai hoc').replace(/\btphcm\b|\bhcm\b/g, 'ho chi minh')
    .replace(/\b(tinh|thanh pho|tp)\s+(?=[a-z])/g, '').replace(/\b(huyen|thi xa|thi tran)\s+(?=[a-z])/g, '').replace(/\bquan\s+(?!y\b|doi\b|dan\b|khu\b)(?=[a-z])/g, '').replace(/[^a-z0-9]/g, '');
}
var WN_STOP = { benh: 1, vien: 1, da: 1, khoa: 1, trung: 1, tam: 1, y: 1, te: 1, tinh: 1, thanh: 1, pho: 1, tp: 1, huyen: 1, quan: 1, thi: 1, xa: 1, so: 1,
  khu: 1, vuc: 1, cong: 1, ty: 1, tnhh: 1, co: 1, phan: 1, mot: 1, chu: 1, dau: 1, tu: 1, va: 1, cac: 1, ban: 1, ly: 1, du: 1 };
function wnToks_(s) {
  const t = wnFold_(s).replace(/\bbvdk\b/g, 'benh vien da khoa').replace(/\bbv\b/g, 'benh vien').replace(/\bttyt\b/g, 'trung tam y te').replace(/\btw\b/g, 'trung uong')
    .split(' ').filter(function (w) { return w && !WN_STOP[w]; });
  const o = {}; t.forEach(function (w) { o[w] = 1; }); return Object.keys(o);
}
function wnDice_(a, b) {
  if (!a.length || !b.length) return 0;
  let n = 0; const B = {}; b.forEach(function (w) { B[w] = 1; });
  a.forEach(function (w) { if (B[w]) n++; });
  return 2 * n / (a.length + b.length);
}
/** danh sách chủ đầu tư [[tên, khmt, tbmt, kqdt, last, tỉnh]] ⇒ chỉ mục để so */
function wnIndex_(list) {
  const ix = { byKey: {}, byProv: {}, all: [] };
  (list || []).forEach(function (r) {
    const name = String(r[0] || '').trim(); if (!name) return;
    const x = { name: name, key: wnKey_(name), p: wnProv_(r[5]) || wnProv_(name), toks: wnToks_(name), n: (+r[1] || 0) + (+r[2] || 0) + (+r[3] || 0) };
    if (x.key.length < 4) return;
    ix.all.push(x);
    (ix.byKey[x.key] = ix.byKey[x.key] || []).push(x);
    (ix.byProv[x.p || '?'] = ix.byProv[x.p || '?'] || []).push(x);
  });
  return ix;
}
/* loại cơ sở + chuyên khoa + số hiệu: 2 tên khác loại (bệnh viện ≠ trạm y tế ≠ trường), khác chuyên khoa (Mắt ≠ đa khoa) hoặc khác số (Quân y 175 ≠ 211) ⇒ không phải 1 nơi */
var WN_SPEC = ['mat', 'rang ham mat', 'nha khoa', 'nhi', 'san', 'phu san', 'phoi', 'lao', 'ung buou', 'tam than', 'da lieu', 'y hoc co truyen', 'phuc hoi chuc nang', 'tim', 'noi tiet', 'chan thuong chinh hinh', 'bong', 'tai mui hong', 'lao khoa', 'huyet hoc', 'truyen mau', 'nhiet doi', 'than kinh', 'thanh nhan', 'quan y', 'cong an', 'buu dien', 'giao thong'];
function wnKind_(f) {
  f = ' ' + f + ' ';
  if (/ so y te /.test(f)) return 'so';
  if (/ tram y te /.test(f)) return 'tyt';
  if (/ trung tam y te /.test(f)) return 'ttyt';
  if (/ benh vien | bv /.test(f)) return 'bv';
  if (/ phong kham | nha khoa /.test(f)) return 'pk';
  if (/ hoc vien | truong | dai hoc /.test(f)) return 'edu';
  if (/ vien /.test(f)) return 'bv';
  if (/ trung tam /.test(f)) return 'tt';
  return 'other';
}
/* tên tỉnh cũ có trong tên (Mắt Nam Định ≠ Mắt Ninh Bình dù cùng tỉnh mới) */
var WN_OLD = null;
function wnOld_(f) {
  if (!WN_OLD) {
    WN_OLD = []; const ali = { 'ba ria vung tau': 'brvt', 'ba ria': 'brvt', 'vung tau': 'brvt', 'tp hcm': 'hcm', 'tphcm': 'hcm', 'hcm': 'hcm', 'sai gon': 'hcm', 'ho chi minh': 'hcm', 'thua thien hue': 'hue', 'tt hue': 'hue', 'hue': 'hue', 'bac can': 'bac kan', 'hoa binh': 'hoa binh', 'thanh hoa': 'thanh hoa', 'khanh hoa': 'khanh hoa', 'dac lac': 'dak lak', 'dak lak': 'dak lak', 'dac nong': 'dak nong' };
    WN_PROV.forEach(function (g) { g[1].forEach(function (o) { const k = wnFold_(o); WN_OLD.push([' ' + k + ' ', ali[k] || k]); }); });
    Object.keys(ali).forEach(function (k) { WN_OLD.push([' ' + k + ' ', ali[k]]); });
    WN_OLD.sort(function (a, b) { return b[0].length - a[0].length; });
  }
  const t = ' ' + f + ' ';
  for (let i = 0; i < WN_OLD.length; i++) if (t.indexOf(WN_OLD[i][0]) >= 0) return WN_OLD[i][1];
  return '';
}
function wnSig_(name) {
  const f = wnFold_(name).replace(/\bbvdk\b/g, 'benh vien da khoa').replace(/\bbv\b/g, 'benh vien').replace(/\bttyt\b/g, 'trung tam y te').replace(/\bpk\b/g, 'phong kham');
  const sp = WN_SPEC.filter(function (k) { return (' ' + f + ' ').indexOf(' ' + k + ' ') >= 0; }).sort().join(',');
  const nums = (f.match(/\b\d+\b/g) || []).filter(function (n) { return n.length < 5; }).sort().join(',');
  return { kind: wnKind_(f), spec: sp, nums: nums, op: wnOld_(f) };
}
/** 2 tên có thể là 1 nơi không (loại · chuyên khoa · số hiệu không mâu thuẫn) */
function wnCompat_(a, b) {
  if (a.kind !== b.kind && !(a.kind === 'other' || b.kind === 'other' || a.kind === 'tt' || b.kind === 'tt')) return false;
  if (a.spec !== b.spec) return false;
  if (a.nums !== b.nums) return false;
  if (a.op && b.op && a.op !== b.op) return false;
  return true;
}
/* tên dạng "TTYT huyện X / trạm y tế / BVĐK khu vực X" hay trùng giữa các tỉnh ⇒ chỉ tự khớp khi biết tỉnh */
function wnGeneric_(key) { return key.length < 13 || /^(trungtamyte|tramyte|phongkham|nhakhoa|benhviendakhoa(khuvuc|huyen|quan(?!y)|thixa|thanhpho)|benhvien(huyen|quan(?!y|doi|dan|khu)|thixa))/.test(key); }

/**
 * ent = {name, alt:[tên khác — tên chuẩn / tên danh mục], prov, no:[tên CĐT người dùng đã chọn "Không phải"], ok: tên CĐT đã xác nhận ở nguồn khác}
 * ⇒ {inv, also:[tên CĐT khác cùng khoá — cùng 1 nơi viết khác], score, how, st:'auto'|'ask'|'none', cands:[[tên, điểm, tỉnh, số gói]]}
 */
function wnMatch_(ix, ent) {
  const names = [ent.name].concat(ent.alt || []).filter(function (s) { return s && String(s).trim(); });
  const P = wnProv_(ent.prov) || names.map(wnProv_).filter(String)[0] || '';
  const bad = {}; (ent.no || []).forEach(function (n) { bad[wnKey_(n)] = 1; });
  const sig = names.map(wnSig_);
  // loại khách theo CRM (cột Type: Clinic / Lab / University / Hospital…) khi tên không tự nói loại — "Ân Tâm" (phòng khám) ≠ "Bệnh viện An Bình"
  const tf = wnFold_(ent.type), tk = /clinic|phong kham|nha khoa|\blab|labo|dealer|distributor|\bnpp\b|dai ly|pharma|cong ty/.test(tf) ? 'pk' : /univ|dai hoc|truong|school|college/.test(tf) ? 'edu' : /hospital|benh vien/.test(tf) ? 'bv' : '';
  if (tk) sig.forEach(function (g) { if (g.kind === 'other' || g.kind === 'tt') g.kind = tk; });
  const cand = {};
  const put = function (x, s, how) { if (bad[x.key]) return; const c = cand[x.name]; if (!c || c.s < s) cand[x.name] = { x: x, s: s, how: how }; };
  if (ent.ok) { (ix.byKey[wnKey_(ent.ok)] || []).forEach(function (ok) { put(ok, 98, 'đã xác nhận ở nguồn khác'); }); }
  names.forEach(function (nm, ni) {
    const k = wnKey_(nm); if (k.length < 6) return;
    const same = ix.byKey[k] || [];
    same.forEach(function (x) {
      if (P && x.p && x.p !== P) put(x, 60, 'tên trùng · khác tỉnh');
      else if (P && x.p) put(x, ni ? 96 : 100, ni ? 'tên chuẩn trùng' : 'tên trùng');
      else if (same.length === 1 && !wnGeneric_(k) && wnCompat_(sig[ni], x.sig || (x.sig = wnSig_(x.name)))) put(x, ni ? 92 : 94, (ni ? 'tên chuẩn trùng' : 'tên trùng') + ' · tên riêng');   // tên riêng của bệnh viện, chỉ 1 chủ đầu tư mang tên này
      else put(x, 86, 'tên trùng · chưa rõ tỉnh');
    });
  });
  if (P) {
    const PT = {}; WN_PROV.forEach(function (g) { if (g[0] === P) g[1].concat([g[0]]).forEach(function (o) { wnFold_(o).split(' ').forEach(function (w) { PT[w] = 1; }); }); });
    const rid = function (a) { return a.filter(function (w) { return !PT[w]; }); };   // bỏ từ là tên tỉnh (Hà Tĩnh…) khi so từ riêng
    const T = names.map(function (n) { return rid(wnToks_(n)); }), K = names.map(wnKey_);
    (ix.byProv[P] || []).concat(ix.byProv['?'] || []).forEach(function (x) {
      if (cand[x.name] && cand[x.name].s >= 90) return;
      const xs = x.sig || (x.sig = wnSig_(x.name));
      let best = 0, how = '';
      K.forEach(function (k, i) {
        if (!wnCompat_(sig[i], xs)) return;
        if (xs.kind === 'other' && sig[i].kind !== 'other') return;   // "Trung đoàn 8", "Công an tỉnh" không phải cơ sở y tế
        if (k.length >= 12 && x.key.length >= 12 && k !== x.key && (x.key.indexOf(k) >= 0 || k.indexOf(x.key) >= 0)) { if (80 > best) { best = 80; how = 'tên nằm trong tên kia'; } }
        const xt = rid(x.toks), d = wnDice_(T[i], xt);
        if (d >= 0.67 && T[i].length >= 1 && xt.length >= 1) { const s = Math.round(45 + 40 * d); if (s > best) { best = s; how = 'gần giống (' + Math.round(d * 100) + '% từ riêng)'; } }
      });
      if (best && !x.p) { best = Math.min(best, 82); how += ' · chưa rõ tỉnh'; }   // chủ đầu tư không ghi tỉnh ⇒ chỉ gợi ý, không tự khớp
      if (best >= WN.ASK) put(x, best, how);
    });
  }
  const C = Object.keys(cand).map(function (k) { return cand[k]; }).sort(function (a, b) { return b.s - a.s || b.x.n - a.x.n; });
  if (!C.length) return { inv: '', also: [], score: 0, how: '', st: 'none', cands: [] };
  const top = C[0], near = C.filter(function (c) { return c.s >= WN.AUTO - 5; });
  // nhiều tên gần bằng điểm nhưng CÙNG khoá (vd. "BVĐK Sóc Trăng" · "BVĐK tỉnh Sóc Trăng") = 1 nơi viết khác ⇒ gộp, không phải tên trùng
  const sameKey = near.every(function (c) { return c.x.key === top.x.key; });
  const also = sameKey ? near.slice(1).map(function (c) { return c.x.name; }) : [];
  const rest = C.filter(function (c) { return !(sameKey && c.x.key === top.x.key); });
  const cands = (sameKey ? [top].concat(rest) : C).slice(0, 4).map(function (c) { return [c.x.name, c.s, c.x.p, c.x.n]; });
  const clear = top.s >= WN.AUTO && sameKey;
  return { inv: top.x.name, also: also, score: top.s, how: top.how + (also.length ? ' · gộp ' + (also.length + 1) + ' cách viết' : '') + (!sameKey ? ' · có ' + near.length + ' tên gần bằng nhau' : ''),
    st: clear ? 'auto' : top.s >= WN.ASK ? 'ask' : 'none', cands: cands };
}

/* ══════════ BẢNG ĐỐI CHIẾU (sheet ẩn) ══════════ */
function wnSheet_(ss) {
  const sh = wtSheet_(ss || wtBook_(), WN.SH, WN.HEAD);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
  try { if (sh.getLastColumn() < WN.HEAD.length) sh.getRange(1, 1, 1, WN.HEAD.length).setValues([WN.HEAD]).setFontWeight('bold').setBackground('#CFE2F3'); } catch (e) {}
  return sh;
}
function wnRead_(ss) {
  const sh = wnSheet_(ss), n = sh.getLastRow();
  const V = n > 1 ? sh.getRange(2, 1, n - 1, WN.HEAD.length).getValues() : [];
  return { sh: sh, rows: V.map(function (r, i) {
    return { row: i + 2, id: wtS_(r[0]), src: wtS_(r[1]), code: wtS_(r[2]), name: wtS_(r[3]), prov: wtS_(r[4]), type: wtS_(r[5]), pic: wtS_(r[6]),
      inv: wtS_(r[7]), invKey: wtS_(r[8]), csyt: wtS_(r[9]), csytName: wtS_(r[10]), score: +r[11] || 0, how: wtS_(r[12]), st: wtS_(r[13]),
      cands: wtJson_(wtS_(r[14]), []), by: wtS_(r[15]), byAt: wtS_(r[16]), at: wtS_(r[17]), also: wtJson_(wtS_(r[18]), []) };
  }).filter(function (x) { return x.id; }) };
}
function wnRowOut_(x) {
  return [x.id, x.src, x.code, x.name, x.prov, x.type, x.pic, x.inv, x.inv ? wtNorm_(x.inv) : '', x.csyt, x.csytName, x.score || '', x.how,
    x.st, x.cands && x.cands.length ? JSON.stringify(x.cands) : '', x.by, x.byAt, x.at, x.also && x.also.length ? JSON.stringify(x.also.slice(0, 6)) : ''];
}
function wnHuman_(x) { return x.st === WN.ST.OK || x.st === WN.ST.NO; }
function wnStOf_(s) { return { auto: WN.ST.AUTO, ask: WN.ST.ASK, none: WN.ST.NONE, ok: WN.ST.OK, no: WN.ST.NO }[s] || s; }
/** đệm: id ⇒ [tên CĐT, trạng thái, điểm, cách khớp, gợi ý, mã danh mục]; khoá CĐT ⇒ [[nguồn, mã, tên, tỉnh, PIC]] */
function wnCache_(R) {
  const map = {}, inv = {}, stat = { total: 0 };
  R.rows.forEach(function (x) {
    map[x.id] = [x.inv, x.st, x.score, x.how, x.cands, x.csyt, x.by, x.also || []];
    stat.total++; stat[x.st] = (stat[x.st] || 0) + 1;
    if (x.st === WN.ST.ASK && x.src !== 'csyt') stat.ask = (stat.ask || 0) + 1;   // app: chip "Đối chiếu tên · n" (chỉ khách CRM)
    if (x.inv && (x.st === WN.ST.AUTO || x.st === WN.ST.OK) && x.src !== 'csyt') [x.inv].concat(x.also || []).forEach(function (n) { const k = wtNorm_(n); (inv[k] = inv[k] || []).push([x.src, x.code, x.name, x.prov, x.pic]); });
  });
  const c = CacheService.getScriptCache();
  wtBigPut_(c, 'wn_map', JSON.stringify(map), 21600);
  wtBigPut_(c, 'wn_inv', JSON.stringify(inv), 21600);
  PropertiesService.getScriptProperties().setProperty('WN_STAT', JSON.stringify(Object.assign(stat, { at: wtNow_() })));
  return { map: map, inv: inv };
}
function wnMaps_() {
  const c = CacheService.getScriptCache(), m = wtBigGet_(c, 'wn_map'), i = wtBigGet_(c, 'wn_inv');
  if (m && i) return { map: JSON.parse(m), inv: JSON.parse(i) };
  return wnCache_(wnRead_());
}
function wnCrmOf_(invKey) {
  try { return (wnMaps_().inv[invKey] || []).slice(0, 12); } catch (e) { return []; }
}

/** bot: lượt đối chiếu gửi kết quả (≤ 600 dòng / lần). Dòng người dùng đã chọn (Đã xác nhận / Không khớp) chỉ cập nhật tên / tỉnh / PIC theo nguồn */
function wnSync_(p) {
  const rows = (typeof p.rows === 'string' ? wtJson_(p.rows, []) : (p.rows || [])).filter(function (r) { return r && r.src && WN.SRC[r.src] && r.code; }).slice(0, 600);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
  let R, add = 0, upd = 0, keep = 0;
  try {
    const ss = wtBook_(); R = wnRead_(ss);
    const by = {}; R.rows.forEach(function (x) { by[x.id] = x; });
    const now = wtNow_(), out = [];
    rows.forEach(function (r) {
      const id = r.src + '|' + wtS_(r.code), cur = by[id];
      const src = { name: wtS_(r.name).slice(0, 300), prov: wtS_(r.prov).slice(0, 80), type: wtS_(r.type).slice(0, 80), pic: wtS_(r.pic).slice(0, 60), csyt: wtS_(r.csyt), csytName: wtS_(r.csytName).slice(0, 300) };
      if (cur && wnHuman_(cur)) { Object.assign(cur, src, { at: now }); keep++; return; }
      const x = Object.assign(cur || { id: id, src: r.src, code: wtS_(r.code), by: '', byAt: '' }, src, {
        inv: wtS_(r.inv).slice(0, 300), also: (r.also || []).map(wtS_).filter(String).slice(0, 6), score: +r.score || 0, how: wtS_(r.how).slice(0, 120), st: wnStOf_(r.st), cands: (r.cands || []).slice(0, 4), at: now });
      if (cur) upd++; else { add++; R.rows.push(x); by[id] = x; }
    });
    R.rows.sort(function (a, b) { return a.src < b.src ? -1 : a.src > b.src ? 1 : a.code < b.code ? -1 : 1; });
    R.rows.forEach(function (x) { out.push(wnRowOut_(x)); });
    const sh = R.sh, last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, WN.HEAD.length).clearContent();
    if (out.length) sh.getRange(2, 1, out.length, WN.HEAD.length).setNumberFormat('@').setValues(out.map(function (r) { return r.map(function (c) { return c === null || c === undefined ? '' : String(c); }); }));
  } finally { lock.releaseLock(); }
  wnCache_(R);
  return { ok: true, add: add, upd: upd, keep: keep, total: R.rows.length, stat: JSON.parse(PropertiesService.getScriptProperties().getProperty('WN_STAT') || '{}') };
}
/** quyết định đã có (Đã xác nhận / Không khớp) — names.mjs dùng để: tên đã xác nhận ở nguồn này ⇒ dùng cho nguồn khác cùng tên + tỉnh; "Không phải" ⇒ bỏ tên CĐT đó */
function wnDecisions_() {
  return wnRead_().rows.filter(wnHuman_).map(function (x) { return [x.src, x.code, x.name, x.prov, x.st === WN.ST.OK ? 'ok' : 'no', x.inv, x.cands.map(function (c) { return c[0]; })]; });
}

/* ══════════ APP ══════════ */
function wnInvIx_() { return { ix: wnIndex_(wtdInvestors_({}).list || []) }; }
function wnPkgSum_(me, inv, also) {
  let r = null;
  [inv].concat(also || []).slice(0, 5).forEach(function (nm) {   // cùng 1 nơi viết khác nhau ⇒ gộp gói
    const x = wtdPkgs_(me, { inv: nm }); if (!x.ok) return;
    if (!r) r = x; else { r.list = r.list.concat(x.list || []); r.total = (r.total || 0) + (x.total || 0); }
  });
  if (!r) return null;
  const C = {}; (r.cols || []).forEach(function (k, i) { C[k] = i; });
  r.list.sort(function (a, b) { return String(b[C.date]).localeCompare(String(a[C.date])); });
  const t = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'), y1 = Utilities.formatDate(new Date(Date.now() - 365 * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const dOf = function (s) { s = wtS_(s); let m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s); if (m) return m[0]; m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : ''; };
  const L = (r.list || []), n = { open: 0, kq: 0, kh: 0, tbmt: 0, all: r.total || L.length };
  L.forEach(function (x) {
    const d = dOf(x[C.date]), cl = dOf(x[C.close]);
    if (x[C.type] === 'tbmt' && cl && cl >= t) n.open++;
    if (d && d >= y1) { if (x[C.type] === 'kqdt') n.kq++; else if (x[C.type] === 'khmt') n.kh++; else n.tbmt++; }
  });
  const pick = ['type', 'no', 'name', 'date', 'price', 'win', 'winner', 'close', 'n'];
  return { n: n, cols: pick, list: L.slice(0, 6).map(function (x) { return pick.map(function (k) { return x[C[k]]; }); }) };
}
function wnAcct_(me, p) {
  const src = wtS_(p.src), code = wtS_(p.code), id = src + '|' + code;
  const M = wnMaps_(), m = code ? M.map[id] : null;
  let inv = '', st = '', score = 0, how = '', cands = [], by = '', also = [];
  if (m) { inv = m[0]; st = m[1]; score = m[2]; how = m[3]; cands = m[4] || []; by = m[6] || ''; also = m[7] || []; }
  if (!m || st === WN.ST.NONE) {
    // khách mới / chưa có mã / chưa đối chiếu ⇒ so ngay với danh sách chủ đầu tư
    const r = wnMatch_(wnInvIx_().ix, { name: p.name, alt: wtS_(p.alt) ? [wtS_(p.alt)] : [], prov: p.prov, type: p.type });
    if (r.st !== 'none' || !m) { inv = r.inv; st = wnStOf_(r.st); score = r.score; how = r.how; cands = r.cands; also = r.also || []; }
  }
  const out = { ok: true, v: WN.VER, id: code ? id : '', st: { 'Tự khớp': 'auto', 'Đã xác nhận': 'ok', 'Cần xác nhận': 'ask', 'Không khớp': 'no' }[st] || 'none', score: score, how: how, by: by,
    cands: (cands || []).map(function (c) { return { name: c[0], score: c[1], prov: c[2], n: c[3] }; }), app: WT.APP_URL };
  if (inv && (out.st === 'auto' || out.st === 'ok')) { out.inv = inv; out.also = also; out.pk = wnPkgSum_(me, inv, also); }
  return out;
}
function wnName_(me, p) {
  const op = wtS_(p.op) || 'list';
  if (op === 'find') {   // ô tìm chủ đầu tư khi chọn tay (≤ 12 tên chứa đủ các từ gõ, ưu tiên cùng tỉnh)
    const q = wnFold_(p.q).split(' ').filter(String), P = wnProv_(p.prov), L = wnInvIx_().ix.all;
    if (!q.length) return { ok: true, list: [] };
    const hit = L.filter(function (x) { const f = wnFold_(x.name); return q.every(function (w) { return f.indexOf(w) >= 0; }); })
      .sort(function (a, b) { return ((b.p === P) - (a.p === P)) || b.n - a.n; }).slice(0, 12);
    return { ok: true, list: hit.map(function (x) { return { name: x.name, prov: x.p, n: x.n }; }) };
  }
  if (op === 'set') {
    const st = wtS_(p.st) === 'no' ? WN.ST.NO : WN.ST.OK, inv = wtS_(p.inv).slice(0, 300);
    if (st === WN.ST.OK && !inv) return { ok: false, error: 'Chưa chọn chủ đầu tư.' };
    const src = wtS_(p.src), code = wtS_(p.code);
    if (!WN.SRC[src] || !code) return { ok: false, error: 'Thiếu nguồn / mã khách.' };
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
    let R;
    try {
      const ss = wtBook_(); R = wnRead_(ss);
      const id = src + '|' + code, now = wtNow_();
      let x = R.rows.filter(function (r) { return r.id === id; })[0];
      if (!x) { x = { id: id, src: src, code: code, name: wtS_(p.name).slice(0, 300), prov: wtS_(p.prov).slice(0, 80), type: '', pic: wtS_(p.pic).slice(0, 60), csyt: '', csytName: '', cands: [], how: '' }; R.rows.push(x); }
      if (st === WN.ST.NO) { const c = (x.cands || []).slice(); if (x.inv && !c.some(function (k) { return k[0] === x.inv; })) c.unshift([x.inv, x.score, '', 0]); x.cands = c.slice(0, 4); x.inv = ''; x.also = []; x.score = 0; }
      else { x.inv = inv; x.score = 100; const kk = wnKey_(inv); x.also = (wnInvIx_().ix.byKey[kk] || []).map(function (y) { return y.name; }).filter(function (n) { return n !== inv; }).slice(0, 6); }
      Object.assign(x, { st: st, how: st === WN.ST.OK ? 'người dùng chọn' : 'người dùng: không phải', by: me.pic || me.local, byAt: now, at: now });
      const row = wnRowOut_(x);
      if (x.row) R.sh.getRange(x.row, 1, 1, row.length).setNumberFormat('@').setValues([row.map(String)]);
      else R.sh.appendRow(row);
    } finally { lock.releaseLock(); }
    wnCache_(R);
    return Object.assign(wnAcct_(me, { src: src, code: code, name: p.name, prov: p.prov }), { saved: true });
  }
  // list: bảng đối chiếu (mặc định "Cần xác nhận") + đếm theo trạng thái / nguồn
  const R = wnRead_(), want = wtS_(p.st) || 'ask', W = wnStOf_(want), q = wnFold_(p.q), src = wtS_(p.src);
  const stat = {}; R.rows.forEach(function (x) { const k = x.src; stat[k] = stat[k] || {}; stat[k][x.st] = (stat[k][x.st] || 0) + 1; });
  const rows = R.rows.filter(function (x) {
    if (want !== 'all' && x.st !== W) return false;
    if (src && x.src !== src) return false;
    return !q || wnFold_(x.name + ' ' + x.inv + ' ' + x.prov + ' ' + x.code).indexOf(q) >= 0;
  }).sort(function (a, b) { return (a.src === 'csyt') - (b.src === 'csyt') || b.score - a.score; });
  return { ok: true, st: want, total: rows.length, stat: stat, src: WN.SRC, list: rows.slice(0, 400).map(function (x) {
    return { id: x.id, src: x.src, code: x.code, name: x.name, prov: x.prov, type: x.type, pic: x.pic, inv: x.inv, score: x.score, how: x.how, st: x.st,
      cands: (x.cands || []).map(function (c) { return { name: c[0], score: c[1], prov: c[2], n: c[3] }; }), by: x.by, byAt: x.byAt };
  }) };
}
