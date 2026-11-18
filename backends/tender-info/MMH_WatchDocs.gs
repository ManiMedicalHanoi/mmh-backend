/* ════════════════════════════════════════════════════════════════════
   MMH_WatchDocs.gs v1.0 (18/11/2026) — LƯU HỒ SƠ TẢI TỪ MUASAMCONG VÀO 3 THƯ MỤC + SHEET TỔNG HỢP (người dùng yêu cầu)
   Thư mục mẹ "Tự động tải thông tin thầu" (của mmh.product) ▸ 3 thư mục con: Kết quả trúng thầu · Thông báo mời thầu · Kế hoạch lựa chọn nhà thầu.
   Mỗi gói 1 thư mục con "<Số> - <Bệnh viện>" trong đúng thư mục loại (TBMT / KQLCNT / KHLCNT) — cùng 1 số TBMT có tài liệu TBMT (Tải TBMT, HSMT)
   và tài liệu kết quả (QĐ phê duyệt KQLCNT, báo cáo đánh giá, DS nhà thầu, DS hàng hóa) ⇒ mỗi tài liệu vào thư mục theo PHẦN (sec) bot gửi.
   File Excel (.xlsx / .xls) ⇒ chuyển thành Google Sheet (Drive v2 convert). Tên file bot đặt sẵn: "<Số> - <Loại tài liệu>.<đuôi>".
   Sheet "Tổng hợp tài liệu thầu đã tải" ở thư mục mẹ: 1 dòng / tài liệu (cả tài liệu cần Agent chưa tải được — cột Link = trang gói).
   Đổi thư mục: Script Property WT_DL_ROOT / WT_DL_KQ / WT_DL_TBMT / WT_DL_KH.
   ════════════════════════════════════════════════════════════════════ */
const WTD = {
  ROOT: '1sYXQx1_h3PBkm_zor8GhsIAM_ZMG5yxv',
  DIR: { kq: '1-8g4gKGcLRFyjwXyBxekFLVNuHqMdSoI', tbmt: '1ASNCJ7Kyc2B9alysJTX0ligZn4xrtRCH', kh: '1w9fYlMYeI_Xmicu2m_rUXqT-IOxAYK4b', mo: '' },   // mo: tự tạo "Biên bản mở thầu" trong thư mục mẹ
  PROP: { kq: 'WT_DL_KQ', tbmt: 'WT_DL_TBMT', kh: 'WT_DL_KH', mo: 'WT_DL_MO' },
  MO_NAME: 'Biên bản mở thầu',
  SEC_LABEL: { kq: 'KQLCNT', tbmt: 'TBMT', kh: 'KHLCNT', mo: 'Biên bản mở thầu' },
  SUM_NAME: 'Tổng hợp tài liệu thầu đã tải',
  SUM_SHEET: 'Tài liệu',
  HEAD: ['STT', 'Khu vực', 'Tỉnh thành', 'Tên bệnh viện', 'Loại thông tin', 'Tên gói thầu / dự án', 'Số TBMT / KHLCNT', 'Giá gói thầu (VND)',
    'Ngày đăng tải', 'Thời điểm đóng thầu', 'Loại tài liệu', 'Link tài liệu', 'Nguồn vốn', 'Hình thức lựa chọn nhà thầu', 'Phương thức lựa chọn nhà thầu',
    'Loại hợp đồng', 'Gói thầu có nhiều phần/lô', 'Số lượng phần (lô)', 'Địa điểm thực hiện gói thầu', 'Số quyết định phê duyệt', 'Ngày phê duyệt',
    'Thời gian thực hiện (tháng)', 'Giá trúng thầu (VND)', 'Nhà thầu trúng thầu', 'Mã KHLCNT', 'Tên dự toán / dự án', 'Trang gói trên muasamcong', 'Tải lúc', 'Khoá']
};

/* ── tỉnh ⇒ miền (34 tỉnh mới + tên cũ hay gặp trong địa chỉ) ── */
const WTD_REGION = (function () {
  const N = 'Hà Nội|Hải Phòng|Quảng Ninh|Cao Bằng|Lạng Sơn|Lai Châu|Điện Biên|Sơn La|Lào Cai|Tuyên Quang|Thái Nguyên|Phú Thọ|Bắc Ninh|Hưng Yên|Ninh Bình|Hà Giang|Yên Bái|Bắc Kạn|Hòa Bình|Hoà Bình|Vĩnh Phúc|Bắc Giang|Hải Dương|Thái Bình|Hà Nam|Nam Định';
  const C = 'Thanh Hóa|Thanh Hoá|Nghệ An|Hà Tĩnh|Quảng Trị|Huế|Thừa Thiên Huế|Đà Nẵng|Quảng Ngãi|Gia Lai|Đắk Lắk|Đắc Lắk|Khánh Hòa|Khánh Hoà|Lâm Đồng|Quảng Bình|Quảng Nam|Kon Tum|Bình Định|Phú Yên|Ninh Thuận|Đắk Nông|Bình Thuận';
  const S = 'Hồ Chí Minh|Đồng Nai|Tây Ninh|Đồng Tháp|Vĩnh Long|An Giang|Cần Thơ|Cà Mau|Bình Phước|Bình Dương|Bà Rịa - Vũng Tàu|Bà Rịa Vũng Tàu|Long An|Tiền Giang|Bến Tre|Trà Vinh|Hậu Giang|Sóc Trăng|Bạc Liêu|Kiên Giang';
  const m = {};
  [[N, 'Miền Bắc'], [C, 'Miền Trung'], [S, 'Miền Nam']].forEach(function (x) { x[0].split('|').forEach(function (p) { m[wtNorm_(p)] = [p, x[1]]; }); });
  return m;
})();
/** "Phường Phước Hậu, Tỉnh Vĩnh Long" / "Tỉnh Vĩnh Long" / "Ha Noi" ⇒ [tỉnh, miền] */
function wtdProvince_(s) {
  const t = wtNorm_(String(s || '').replace(/(tỉnh|thành phố|tp\.?)\s*/gi, ' '));
  if (!t) return ['', ''];
  let best = null;
  Object.keys(WTD_REGION).forEach(function (k) { if ((' ' + t + ' ').indexOf(' ' + k + ' ') >= 0 && (!best || k.length > best.length)) best = k; });
  return best ? WTD_REGION[best] : ['', ''];
}
function wtdMoney_(s) { const d = String(s || '').replace(/[^\d]/g, ''); return d ? Number(d) : ''; }
/** "24 tháng" ⇒ 24 · "365 ngày" ⇒ 12 · "2 năm" ⇒ 24 */
function wtdMonths_(s) {
  const t = String(s || '').toLowerCase().replace(',', '.');
  const m = t.match(/([\d.]+)\s*(tháng|ngày|năm|tuần)/);
  if (!m) return '';
  const n = parseFloat(m[1]); if (!isFinite(n)) return '';
  const v = m[2] === 'tháng' ? n : m[2] === 'năm' ? n * 12 : m[2] === 'tuần' ? n / 4.345 : n / 30.4;
  return Math.round(v * 10) / 10;
}

function wtdDir_(sec) {
  const P = PropertiesService.getScriptProperties();
  if (sec === 'mo') {   // thư mục "Biên bản mở thầu" (người dùng 18/11/2026): tạo 1 lần trong thư mục mẹ
    const id0 = P.getProperty(WTD.PROP.mo);
    if (id0) { try { const f = DriveApp.getFolderById(id0); if (!f.isTrashed()) return f; } catch (e) {} }
    const f = wtSub_(DriveApp.getFolderById(P.getProperty('WT_DL_ROOT') || WTD.ROOT), WTD.MO_NAME);
    P.setProperty(WTD.PROP.mo, f.getId()); return f;
  }
  const id = P.getProperty(WTD.PROP[sec] || '') || WTD.DIR[sec] || WTD.DIR.tbmt;
  return DriveApp.getFolderById(id);
}
/** Thư mục gói "<Số> - <Bệnh viện>" trong thư mục loại */
function wtdPkgFolder_(sec, no, inv) {
  return wtSub_(wtdDir_(sec), (no + (inv ? ' - ' + inv : '')).slice(0, 120));
}
/** Lưu 1 file vào Drive; Excel ⇒ Google Sheet. Trả { id, url, name, gsheet } */
function wtdSave_(folder, name, bytes, mime) {
  const ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1] || '';
  const base = name.replace(/\.[a-z0-9]+$/i, '');
  if (/^xlsx?$/i.test(ext)) {
    try {
      const old = folder.getFilesByName(base);
      while (old.hasNext()) old.next().setTrashed(true);
      const blob = Utilities.newBlob(bytes, mime || MimeType.MICROSOFT_EXCEL, name);
      const f = Drive.Files.insert({ title: base, mimeType: MimeType.GOOGLE_SHEETS, parents: [{ id: folder.getId() }] }, blob, { convert: true, supportsAllDrives: true });
      return { id: f.id, url: 'https://docs.google.com/spreadsheets/d/' + f.id + '/edit', name: base, gsheet: true };
    } catch (e) { Logger.log('wtdSave_ chuyển Google Sheet lỗi: ' + e.message); }
  }
  const old = folder.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);
  const f = folder.createFile(Utilities.newBlob(bytes, mime || 'application/octet-stream', name));
  return { id: f.getId(), url: f.getUrl(), name: name, gsheet: false };
}

/* ── Sheet tổng hợp ở thư mục mẹ ── */
function wtdSumBook_() {
  const P = PropertiesService.getScriptProperties();
  let id = P.getProperty('WT_SUM');
  if (id) { try { const b = SpreadsheetApp.openById(id); if (!DriveApp.getFileById(id).isTrashed()) return b; } catch (e) {} }
  const root = DriveApp.getFolderById(P.getProperty('WT_DL_ROOT') || WTD.ROOT);
  const it = root.getFilesByName(WTD.SUM_NAME);
  let book;
  if (it.hasNext()) book = SpreadsheetApp.openById(it.next().getId());
  else {
    book = SpreadsheetApp.create(WTD.SUM_NAME);
    DriveApp.getFileById(book.getId()).moveTo(root);
  }
  P.setProperty('WT_SUM', book.getId());
  return book;
}
function wtdSumSheet_(book) {
  let sh = book.getSheetByName(WTD.SUM_SHEET);
  if (!sh) {
    sh = book.getSheets()[0];
    sh.setName(WTD.SUM_SHEET);
  }
  if (sh.getLastRow() < 1 || wtS_(sh.getRange(1, 1).getValue()) !== 'STT') {
    sh.getRange(1, 1, 1, WTD.HEAD.length).setValues([WTD.HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true).setVerticalAlignment('middle');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(4);
    [48, 90, 120, 220, 90, 300, 140, 130, 120, 140, 200, 220, 160, 150, 160, 120, 90, 80, 220, 150, 100, 90, 130, 220, 120, 260, 120, 140, 10].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange('H:H').setNumberFormat('#,##0');
    sh.getRange('W:W').setNumberFormat('#,##0');
    sh.hideColumns(WTD.HEAD.length);
  }
  return sh;
}

/** docs = [{ sec, docType, name, url, agent }]; info = thông tin gói bot đọc trên trang. Ghi / cập nhật 1 dòng / tài liệu (khoá = số + loại tài liệu + tên). */
function wtdSumWrite_(h, info, docs) {
  if (!docs || !docs.length) return 0;
  const book = wtdSumBook_(), sh = wtdSumSheet_(book);
  const n = WTD.HEAD.length, last = sh.getLastRow();
  const keys = last > 1 ? sh.getRange(2, n, last - 1, 1).getValues().map(function (r) { return wtS_(r[0]); }) : [];
  const I = info || {}, F = I.fields || {}, K = I.kqFields || {}, M = I.moFields || {};
  let sec_ = 'tbmt';
  const g = function (k) { return wtS_((sec_ === 'kq' && K[k]) || (sec_ === 'mo' && M[k]) || F[k] || K[k]); };
  const place = g('Địa điểm thực hiện gói thầu') || I.place || '';
  let pr = wtdProvince_(I.prov || place);
  if (!pr[0] && h.info && h.info.prov) pr = wtdProvince_(h.info.prov);
  const now = wtNow_(), out = [], upd = [];
  const linkAt = [];
  docs.forEach(function (d) {
    const sec = d.sec || 'tbmt'; sec_ = sec;
    const no = sec === 'kh' ? (wtS_(I.planNo) || h.no) : h.no;
    const key = [no, d.docType, d.name].join('|');
    const row = ['', pr[1], pr[0], wtS_(I.investor) || h.investor, WTD.SEC_LABEL[sec] || sec,
      sec === 'kh' ? (wtS_(I.planName) || g('Tên dự toán mua sắm') || h.name) : (wtS_(I.bidName) || h.name), no,
      wtdMoney_(g('Giá gói thầu') || (h.info || {}).price), g('Ngày đăng tải') || wtS_(I.posted), g('Thời điểm đóng thầu') || wtS_(I.close),
      d.docType + (d.agent ? ' (cần Agent — chưa tải)' : ''), d.url ? d.url : (I.url || ''),
      g('Chi tiết nguồn vốn') || g('Nguồn vốn'), g('Hình thức lựa chọn nhà thầu'), g('Phương thức lựa chọn nhà thầu'), g('Loại hợp đồng'),
      g('Gói thầu có nhiều phần/lô'), g('Số lượng phần (lô)'), place, g('Số quyết định phê duyệt'), g('Ngày phê duyệt'),
      wtdMonths_(g('Thời gian thực hiện gói thầu') || g('Thời gian thực hiện hợp đồng') || g('Thời gian thực hiện')), wtdMoney_(K['Giá trúng thầu'] || g('Giá trúng thầu') || (h.info || {}).win),
      wtS_(K['Nhà thầu trúng thầu'] || K['Tên nhà thầu trúng thầu']) || g('Nhà thầu trúng thầu') || wtS_((h.info || {}).winner), g('Mã KHLCNT') || wtS_(I.planNo), g('Tên dự toán mua sắm') || g('Tên dự án'), wtS_(I.url), now, key];
    const at = keys.indexOf(key);
    if (at >= 0) { row[0] = at + 1; upd.push([at + 2, row]); linkAt.push([at + 2, row[11]]); } else { out.push(row); keys.push(key); }
  });
  upd.forEach(function (u) { sh.getRange(u[0], 1, 1, n).setValues([u[1]]); });
  const start0 = sh.getLastRow() + 1;
  if (out.length) {
    const start = start0;
    out.forEach(function (r, i) { r[0] = start - 1 + i; });
    sh.getRange(start, 1, out.length, n).setValues(out);
  }
  // link bấm được — chỉ các dòng vừa ghi (ô cũ đã là chữ "Mở" có link, đọc lại sẽ mất link)
  out.forEach(function (r, i) { linkAt.push([start0 + i, r[11]]); });
  linkAt.forEach(function (x) {
    const u = wtS_(x[1]);
    if (!/^https?:/.test(u)) return;
    try { sh.getRange(x[0], 12).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(/docs\.google\.com\/spreadsheets/.test(u) ? 'Mở (Google Sheet)' : /muasamcong/.test(u) ? 'Trang gói' : 'Mở').setLinkUrl(u).build()); } catch (e) {}
  });
  return out.length + upd.length;
}
function wtdSumUrl_() {
  const id = PropertiesService.getScriptProperties().getProperty('WT_SUM');
  return id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : '';
}
function wtdRootUrl_() { return 'https://drive.google.com/drive/folders/' + (PropertiesService.getScriptProperties().getProperty('WT_DL_ROOT') || WTD.ROOT); }

/* ── Danh sách chủ đầu tư dựng sẵn (app mở nhanh): sheet ẩn "THEO DÕI · CHỦ ĐẦU TƯ" + đệm ── */
const WTD_INV_SHEET = 'THEO DÕI · CHỦ ĐẦU TƯ';
function wtdInvBuild_(data) {
  const by = {};
  ['khmt', 'tbmt', 'kqdt'].forEach(function (type, ti) {
    data[type].forEach(function (r) {
      let x = by[r.invKey];
      if (!x) x = by[r.invKey] = [r.inv, 0, 0, 0, '', r.prov];
      x[1 + ti]++;
      if (r.upd > x[4]) x[4] = r.upd;
      if (!x[5] && r.prov) x[5] = r.prov;
    });
  });
  const list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (b[1] + b[2] + b[3]) - (a[1] + a[2] + a[3]); });
  const ss = wtBook_(), sh = wtSheet_(ss, WTD_INV_SHEET, ['Chủ đầu tư', 'KH LCNT', 'TBMT', 'Kết quả', 'Cập nhật', 'Tỉnh']);
  try { sh.hideSheet(); } catch (e) {}
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 6).clearContent();
  if (list.length) sh.getRange(2, 1, list.length, 6).setValues(list);
  const res = { ok: true, cols: ['name', 'khmt', 'tbmt', 'kqdt', 'last', 'prov'], list: list, at: wtNow_(), v: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMddHHmm') };
  wtBigPut_(CacheService.getScriptCache(), 'wt_inv2', JSON.stringify(res), 21600);
  PropertiesService.getScriptProperties().setProperty('WT_INV_V', res.v);
  return res;
}
/** app: ?since=<v> ⇒ { same:true } khi danh sách chưa đổi (app dùng bản lưu trên máy) */
function wtdInvestors_(p) {
  const v = PropertiesService.getScriptProperties().getProperty('WT_INV_V') || '';
  if (v && wtS_(p.since) === v) return { ok: true, same: true, v: v };
  const hit = wtBigGet_(CacheService.getScriptCache(), 'wt_inv2');
  if (hit) return JSON.parse(hit);
  const sh = wtBook_().getSheetByName(WTD_INV_SHEET);
  if (sh && sh.getLastRow() > 1) {
    const list = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().map(function (r) { return [wtS_(r[0]), +r[1] || 0, +r[2] || 0, +r[3] || 0, wtS_(r[4]), wtS_(r[5])]; });
    const res = { ok: true, cols: ['name', 'khmt', 'tbmt', 'kqdt', 'last', 'prov'], list: list, v: v || 'sheet' };
    wtBigPut_(CacheService.getScriptCache(), 'wt_inv2', JSON.stringify(res), 21600);
    return res;
  }
  return wtdInvBuild_(wtLoad_(wtBook_()));
}


/* ════════════════════════════════════════════════════════════════════
   GÓI THẦU THEO CHỦ ĐẦU TƯ (18/11/2026, người dùng: "chọn bệnh viện ⇒ ra list gói thầu ⇒ tự tải từng gói hoặc nhiều gói")
   wtdPkgBuild_ (trong wtTick, cùng dữ liệu wtLoad_) ⇒ sheet ẩn THEO DÕI · GÓI THEO CĐT, xếp theo khoá CĐT rồi ngày mới trước
   (gộp như wtScan_: type + số; KHLCNT nhiều gói ⇒ n). wPkgs {inv} = gói của 1 CĐT (TextFinder cột A ⇒ đọc đúng đoạn, không đọc cả sheet);
   wGrab {items:[{type,no}], want} = đưa gói chọn vào GÓI TÌM THẤY (người bấm là người theo dõi gói đó) + Chờ tải.
   ════════════════════════════════════════════════════════════════════ */
const WTD_PKG_SHEET = 'THEO DÕI · GÓI THEO CĐT';
const WTD_PKG_HEAD = ['Khoá CĐT', 'Loại', 'Số', 'Tên gói', 'Ngày', 'Giá gói', 'Giá trúng', 'Nhà thầu trúng', 'Hình thức', 'Tỉnh', 'Số gói (KH)', 'Nguồn', 'Chủ đầu tư', 'Dự án', 'Mở thầu'];
function wtdPkgBuild_(data, force) {
  // dữ liệu không đổi (số dòng + ngày cập nhật lớn nhất 3 tab) ⇒ không ghi lại ~35.000 dòng; đệm từng CĐT vẫn làm nóng lại mỗi 5 giờ
  const sig = ['khmt', 'tbmt', 'kqdt'].map(function (t) { let m = ''; data[t].forEach(function (r) { if ((r.upd || '') > m) m = r.upd; }); return data[t].length + '/' + m; }).join(' ');
  const P = PropertiesService.getScriptProperties();
  const same = !force && P.getProperty('WT_PKG_SIG') === sig && wtBook_().getSheetByName(WTD_PKG_SHEET);
  const warmAt = +P.getProperty('WT_PKG_WARM') || 0;
  if (same && Date.now() - warmAt < 5 * 3600e3) return -1;
  const g = {};
  ['khmt', 'tbmt', 'kqdt'].forEach(function (type) {
    data[type].forEach(function (r) {
      const key = r.invKey + '|' + type + ':' + (r.no || ('r' + r.row));
      if (!g[key]) g[key] = { r: r, names: [] };
      if (g[key].names.indexOf(r.name) < 0) g[key].names.push(r.name);
    });
  });
  const rows = Object.keys(g).map(function (k) {
    const x = g[k], r = x.r, nm = x.names.length > 1 ? x.names[0] + ' (+' + (x.names.length - 1) + ' gói)' : x.names[0];
    return [r.invKey, r.type, r.no, wtS_(nm).slice(0, 400), r.date || r.upd || '', r.price, r.win, wtS_(r.winner).slice(0, 300), r.form, r.prov, x.names.length, r.type + '!' + r.row, r.inv, wtS_(r.proj).slice(0, 300), r.open];
  }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : String(b[4]).localeCompare(String(a[4])); });
  wtdPkgWarm_(rows);
  if (same) return 0;
  const ss = wtBook_(), sh = wtSheet_(ss, WTD_PKG_SHEET, WTD_PKG_HEAD);
  try { sh.hideSheet(); } catch (e) {}
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, WTD_PKG_HEAD.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, WTD_PKG_HEAD.length).setNumberFormat('@').setValues(rows.map(function (r) { return r.map(function (c) { return c === undefined || c === null ? '' : String(c); }); }));
  P.setProperty('WT_PKG_SIG', sig);
  return rows.length;
}
/* đệm gói theo CĐT: khoá wp2:<md5 khoá CĐT> (khoá CĐT có thể dài > 250 ký tự) ⇒ wPkgs không phải mở file Sheet lớn */
function wtdPkgCk_(invKey) { return 'wp2:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, invKey)).slice(0, 22); }
function wtdPkgOut_(rows) {
  return rows.slice(0, 400).map(function (r) { return [wtS_(r[1]), wtS_(r[2]), wtS_(r[3]), wtS_(r[4]), wtS_(r[5]), wtS_(r[6]), wtS_(r[7]), wtS_(r[8]), +r[10] || 1, '', 0, '', '', wtS_(r[14])]; });
}
function wtdPkgWarm_(rows) {
  const by = {}; rows.forEach(function (r) { (by[r[0]] = by[r[0]] || []).push(r); });
  const c = CacheService.getScriptCache(); let batch = {}, n = 0, size = 0;
  Object.keys(by).forEach(function (k) {
    const s = JSON.stringify({ list: wtdPkgOut_(by[k]), total: by[k].length });
    if (s.length > 95000) return;   // CĐT quá nhiều gói ⇒ đọc sheet khi cần
    batch[wtdPkgCk_(k)] = s; n++; size += s.length;
    if (n >= 60 || size > 800000) { try { c.putAll(batch, 21600); } catch (e) {} batch = {}; n = 0; size = 0; }
  });
  if (n) { try { c.putAll(batch, 21600); } catch (e) {} }
  PropertiesService.getScriptProperties().setProperty('WT_PKG_WARM', String(Date.now()));
}
function wtdPkgRows_(invKey) {
  const ss = wtBook_();
  let sh = ss.getSheetByName(WTD_PKG_SHEET);
  if (!sh || sh.getLastRow() < 2) { wtdPkgBuild_(wtLoad_(ss), true); sh = ss.getSheetByName(WTD_PKG_SHEET); }
  if (!sh || sh.getLastRow() < 2 || !invKey) return [];
  const col = sh.getRange(2, 1, sh.getLastRow() - 1, 1);
  const f = col.createTextFinder(invKey).matchEntireCell(true).matchCase(true).findAll();
  if (!f.length) return [];
  const r0 = f[0].getRow(), r1 = f[f.length - 1].getRow();
  return sh.getRange(r0, 1, r1 - r0 + 1, WTD_PKG_HEAD.length).getValues().filter(function (r) { return wtS_(r[0]) === invKey; });
}
function wtdPkgs_(me, p) {
  const invKey = wtNorm_(p.inv);
  if (!invKey) return { ok: false, error: 'Thiếu tên chủ đầu tư.' };
  const cols = ['type', 'no', 'name', 'date', 'price', 'win', 'winner', 'form', 'n', 'status', 'files', 'key', 'inv', 'close'];
  // trạng thái tải (status / files / key) app tự ghép từ danh sách gói đang theo dõi ⇒ trúng đệm là trả ngay, không mở file Sheet
  const c = CacheService.getScriptCache(), ck = wtdPkgCk_(invKey), hit = c.get(ck);
  if (hit) { const o = JSON.parse(hit); return { ok: true, inv: wtS_(p.inv), cols: cols, list: o.list, total: o.total, cached: true }; }
  const rows = wtdPkgRows_(invKey), list = wtdPkgOut_(rows), s = JSON.stringify({ list: list, total: rows.length });
  if (s.length < 95000) { try { c.put(ck, s, 21600); } catch (e) {} }
  return { ok: true, inv: wtS_(p.inv), cols: cols, list: list, total: rows.length };
}
function wtdGrab_(me, p) {
  const items = (typeof p.items === 'string' ? wtJson_(p.items, []) : (p.items || [])).filter(function (x) { return x && x.no && WT.TYPES[x.type]; }).slice(0, 60);
  if (!items.length) return { ok: false, error: 'Chưa chọn gói nào có số TBMT / KHLCNT.' };
  const want = wtWant_(p.want), rowsBy = {};
  const rowsOf = function (inv) { const k = wtNorm_(inv); if (!k) return []; if (!rowsBy[k]) rowsBy[k] = wtdPkgRows_(k); return rowsBy[k]; };
  items.forEach(function (it) { rowsOf(it.inv || p.inv); });   // đọc trước khi giữ khoá
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  const out = [], skipped = [], force = wtTrue_(p.force);
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss), now = wtNow_(), add = [];
    items.forEach(function (it) {
      const key = it.type + ':' + it.no;
      const ex = H.filter(function (h) { return h.key === key || (h.type === it.type && wtBare_(h.no) === wtBare_(it.no)); })[0];
      if (ex) {
        const q = wtReq_(sh, ex, me, want, force);
        if (q.skip) skipped.push({ key: ex.key, no: ex.no, why: q.skip, at: ex.done || ex.last || '', n: (ex.files || []).length }); else out.push(ex.key);
        return;
      }
      const r = rowsOf(it.inv || p.inv).filter(function (x) { return wtS_(x[1]) === it.type && wtBare_(x[2]) === wtBare_(it.no); })[0];
      const info = r ? { proj: wtS_(r[13]), price: wtS_(r[5]), win: wtS_(r[6]), winner: wtS_(r[7]), form: wtS_(r[8]), open: wtS_(r[14]), prov: wtS_(r[9]), n: +r[10] || 1, grab: 1, by: me.pic }
                     : { grab: 1, by: me.pic };
      if (want.length) info.want = want;
      const inv = r ? wtS_(r[12]) : wtS_(it.inv || p.inv);
      add.push([key, it.type, it.no, inv, wtNorm_(inv), r ? wtS_(r[3]) : it.no, JSON.stringify(info), r ? wtS_(r[4]) : '', now, me.mail, WT.ST.WAIT, '[]', 0, '', '', '', r ? wtS_(r[11]) : 'chọn trên bản đồ']);
      out.push(key);
    });
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, WT.HH.length).setValues(add);
  } finally { lock.releaseLock(); }
  return Object.assign(wtBoot_(me, {}), { queued: out, skipped: skipped });
}


/* ════════════════════════════════════════════════════════════════════
   GÓI GẦN ĐÂY (18/11/2026, người dùng: xem gói mới trong tuần / tháng, thống kê giá trị + hình thức LCNT, gói sắp đóng thầu)
   wtdRecentBuild_ (trong wtTick, cùng chữ ký WT_PKG_SIG — chỉ dựng lại khi dữ liệu đổi) ⇒ gói có NGÀY CẬP NHẬT (cột Thời gian cập nhật — lúc gói được
   bổ sung vào file) hoặc ngày trong 90 ngày, hoặc TBMT còn hạn mở thầu ⇒ đệm `wt_rec` + sheet ẩn THEO DÕI · GÓI GẦN ĐÂY (dự phòng), phiên bản WT_REC_V.
   wRecent {since} ⇒ { v, cols, rows } hoặc { same:true }. App tự tính thống kê / lọc 7 · 30 · 90 ngày / tỉnh / sắp đóng thầu.
   ════════════════════════════════════════════════════════════════════ */
const WTD_REC_SHEET = 'THEO DÕI · GÓI GẦN ĐÂY';
const WTD_REC_COLS = ['type', 'no', 'name', 'inv', 'date', 'upd', 'price', 'win', 'form', 'prov', 'close', 'n', 'winner'];
function wtdRecentBuild_(data, force) {
  const P = PropertiesService.getScriptProperties();
  const sig = ['khmt', 'tbmt', 'kqdt'].map(function (t) { let m = ''; data[t].forEach(function (r) { if ((r.upd || '') > m) m = r.upd; }); return data[t].length + '/' + m; }).join(' ') + '|' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  if (!force && P.getProperty('WT_REC_SIG') === sig && wtBigGet_(CacheService.getScriptCache(), 'wt_rec')) return -1;
  const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const from = Utilities.formatDate(new Date(Date.now() - 90 * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const g = {};
  ['khmt', 'tbmt', 'kqdt'].forEach(function (type) {
    data[type].forEach(function (r) {
      const close = type === 'tbmt' ? wtDateOf_(r.open) : '';
      const d = r.upd || r.date || '';
      if (!(d >= from || (r.date || '') >= from || (close && close >= today))) return;
      const key = r.invKey + '|' + type + ':' + (r.no || ('r' + r.row));
      if (!g[key]) g[key] = { r: r, names: [], close: close };
      if (g[key].names.indexOf(r.name) < 0) g[key].names.push(r.name);
    });
  });
  const rows = Object.keys(g).map(function (k) {
    const x = g[k], r = x.r, nm = x.names.length > 1 ? x.names[0] + ' (+' + (x.names.length - 1) + ' gói)' : x.names[0];
    return [r.type, r.no, wtS_(nm).slice(0, 220), r.inv, r.date || '', r.upd || r.date || '', wtdMoney_(r.price) || 0, wtdMoney_(r.win) || 0, wtS_(r.form).slice(0, 80), r.prov, x.close, x.names.length, wtS_(r.winner).slice(0, 120)];
  }).sort(function (a, b) { return String(b[5]).localeCompare(String(a[5])); });
  const v = wtNow_();
  const res = { ok: true, v: v, cols: WTD_REC_COLS, rows: rows, from: from };
  wtBigPut_(CacheService.getScriptCache(), 'wt_rec', JSON.stringify(res), 21600);
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WTD_REC_SHEET, WTD_REC_COLS);
    try { sh.hideSheet(); } catch (e) {}
    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, WTD_REC_COLS.length).clearContent();
    if (rows.length) sh.getRange(2, 1, rows.length, WTD_REC_COLS.length).setNumberFormat('@').setValues(rows.map(function (r) { return r.map(function (c) { return c === undefined || c === null ? '' : String(c); }); }));
  } catch (e) { Logger.log('wtdRecentBuild_ sheet: ' + e.message); }
  P.setProperty('WT_REC_SIG', sig); P.setProperty('WT_REC_V', v);
  return rows.length;
}
function wtdRecent_(me, p) {
  const v = PropertiesService.getScriptProperties().getProperty('WT_REC_V') || '';
  if (v && wtS_(p.since) === v) return { ok: true, same: true, v: v };
  const hit = wtBigGet_(CacheService.getScriptCache(), 'wt_rec');
  if (hit) return JSON.parse(hit);
  const sh = wtBook_().getSheetByName(WTD_REC_SHEET);
  if (sh && sh.getLastRow() > 1) {
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, WTD_REC_COLS.length).getValues().map(function (r) {
      return r.map(function (c, i) { return i === 6 || i === 7 || i === 11 ? (+c || 0) : wtS_(c); });
    });
    const res = { ok: true, v: v || 'sheet', cols: WTD_REC_COLS, rows: rows };
    wtBigPut_(CacheService.getScriptCache(), 'wt_rec', JSON.stringify(res), 21600);
    return res;
  }
  wtdRecentBuild_(wtLoad_(wtBook_()), true);
  const h2 = wtBigGet_(CacheService.getScriptCache(), 'wt_rec');
  return h2 ? JSON.parse(h2) : { ok: false, error: 'Chưa dựng được danh sách gói gần đây.' };
}


/* ════════════════════════════════════════════════════════════════════
   TOÀN BỘ GÓI — BẢN GỌN CHO THỐNG KÊ (18/11/2026, người dùng: thống kê "toàn bộ" hoặc "từ ngày đến ngày", thống kê từng bệnh viện)
   wtdAllBuild_ (wtTick, chỉ dựng lại khi 3 tab dữ liệu đổi — WT_ALL_SIG) ⇒ đệm `wt_all` (chia mảnh), phiên bản WT_ALL_V.
   wAll {since} ⇒ { v, invs:[tên], provs:[tỉnh], forms:[hình thức], rows:[[loại 0 KH·1 TBMT·2 KQ, iCĐT, ngày yyyymmdd, giá (nghìn đ), giá trúng (nghìn đ), iHình thức, iTỉnh]] } hoặc { same:true }.
   Mỗi gói 1 dòng (CĐT + loại + số); app tự lọc theo kỳ / tỉnh / CĐT và tính thống kê.
   ════════════════════════════════════════════════════════════════════ */
function wtdAllBuild_(data, force) {
  const P = PropertiesService.getScriptProperties(), c = CacheService.getScriptCache();
  const sig = ['khmt', 'tbmt', 'kqdt'].map(function (t) { let m = ''; data[t].forEach(function (r) { if ((r.upd || '') > m) m = r.upd; }); return data[t].length + '/' + m; }).join(' ');
  if (!force && P.getProperty('WT_ALL_SIG') === sig && wtBigGet_(c, 'wt_all')) return -1;
  const invs = [], invI = {}, provs = [''], provI = { '': 0 }, forms = [''], formI = { '': 0 }, seen = {}, rows = [];
  const idx = function (arr, map, v) { v = wtS_(v); if (!(v in map)) { map[v] = arr.length; arr.push(v); } return map[v]; };
  ['khmt', 'tbmt', 'kqdt'].forEach(function (type, ti) {
    data[type].forEach(function (r) {
      const k = r.invKey + '|' + type + ':' + (r.no || ('r' + r.row));
      if (seen[k]) return; seen[k] = 1;
      if (!(r.invKey in invI)) { invI[r.invKey] = invs.length; invs.push(r.inv); }
      const d = +(String(r.date || r.upd || '').replace(/-/g, '')) || 0;
      rows.push([ti, invI[r.invKey], d, Math.round((wtdMoney_(r.price) || 0) / 1000), Math.round((wtdMoney_(r.win) || 0) / 1000),
        idx(forms, formI, wtS_(r.form).slice(0, 80)), idx(provs, provI, r.prov)]);
    });
  });
  const v = wtNow_();
  wtBigPut_(c, 'wt_all', JSON.stringify({ ok: true, v: v, invs: invs, provs: provs, forms: forms, rows: rows }), 21600);
  P.setProperty('WT_ALL_SIG', sig); P.setProperty('WT_ALL_V', v);
  return rows.length;
}
function wtdAll_(me, p) {
  const v = PropertiesService.getScriptProperties().getProperty('WT_ALL_V') || '';
  if (v && wtS_(p.since) === v && wtBigGet_(CacheService.getScriptCache(), 'wt_all')) return { ok: true, same: true, v: v };
  let hit = wtBigGet_(CacheService.getScriptCache(), 'wt_all');
  if (!hit) { wtdAllBuild_(wtLoad_(wtBook_()), true); hit = wtBigGet_(CacheService.getScriptCache(), 'wt_all'); }
  return hit ? JSON.parse(hit) : { ok: false, error: 'Chưa dựng được dữ liệu thống kê.' };
}

/* ════════════════════════════════════════════════════════════════════
   NGƯỜI DÙNG TẢI LÊN TÀI LIỆU CẦN AGENT (18/11/2026, người dùng: "tải bằng Agent trên máy ⇒ thêm vào app ⇒ hệ thống tự đổi tên + đúng folder")
   wUpload {key (gói), b64, name (tên file trên máy), docType, sec, orig (tên file trên muasamcong — khớp info.agentFiles)}
   ⇒ "<Số> - <Loại tài liệu>.<đuôi>" vào thư mục gói đúng phần (TBMT / Kết quả / KHLCNT), Excel ⇒ Google Sheet,
   ghi files của gói, đánh dấu agentFiles[orig].done, dòng Sheet tổng hợp (cùng khoá số | loại | tên gốc ⇒ thay dòng "cần Agent").
   ════════════════════════════════════════════════════════════════════ */
function wtdUpload_(me, p) {
  const ss = wtBook_(), h = wtHits_(ss).filter(function (x) { return x.key === wtS_(p.key); })[0];
  if (!h) return { ok: false, error: 'Không tìm thấy gói.' };
  if (!me.boss && !h.watchers.some(function (m) { return wtLocal_(m) === me.local; })) return { ok: false, error: 'Bạn không theo dõi gói này.' };
  const b64 = wtS_(p.b64); if (!b64) return { ok: false, error: 'Thiếu nội dung file.' };
  const bytes = Utilities.base64Decode(b64);
  if (bytes.length > WT.MAX_FILE) return { ok: false, error: 'File quá lớn (> 35 MB).' };
  const sec = wtS_(p.sec) in WTD.DIR ? wtS_(p.sec) : (h.type === 'khmt' ? 'kh' : h.type === 'kqdt' ? 'kq' : 'tbmt');
  const docType = wtS_(p.docType).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 90) || 'Tài liệu';
  const ext = ((wtS_(p.name).match(/\.([a-z0-9]{2,5})$/i) || [])[1] || 'pdf').toLowerCase();
  const no = wtBare_(sec === 'kh' && (h.info || {}).planNo ? h.info.planNo : h.no);
  const inv = h.investor && h.investor !== '(đang tra)' ? h.investor : '';
  const folder = wtdPkgFolder_(sec, no, inv);
  const sv = wtdSave_(folder, (no + ' - ' + docType).slice(0, 140) + '.' + ext, bytes, wtS_(p.mime));
  const orig = wtS_(p.orig);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  let cur;
  try {
    const sh = wtSheet_(ss, WT.SH_H, WT.HH); cur = wtHits_(ss).filter(function (x) { return x.key === h.key; })[0];
    const files = (cur.files || []).filter(function (x) { return x.name !== sv.name; });
    files.push({ name: sv.name, url: sv.url, id: sv.id, size: bytes.length, kind: docType, sec: sec, gsheet: sv.gsheet, by: me.pic });
    const info = Object.assign({}, cur.info);
    info.agentFiles = (info.agentFiles || []).map(function (a) { return a && orig && a.name === orig ? Object.assign({}, a, { done: wtNow_(), url: sv.url, file: sv.name }) : a; });
    sh.getRange(cur.row, 7).setValue(JSON.stringify(info));
    sh.getRange(cur.row, 12).setValue(JSON.stringify(files));
    if (cur.status !== WT.ST.DONE) sh.getRange(cur.row, 11).setValue(WT.ST.DONE);
    cur.info = info;
  } finally { lock.releaseLock(); }
  try { wtdSumWrite_(cur, Object.assign({}, cur.info), [{ sec: sec, docType: docType, name: orig || sv.name, url: sv.url }]); } catch (e) { Logger.log('wUpload sum: ' + e.message); }
  wtBotLog_(ss, 'app · ' + me.pic, h.key, 'upload', sv.name, orig);
  return { ok: true, name: sv.name, url: sv.url, gsheet: sv.gsheet, folder: folder.getUrl(), hit: wtHitOut_(wtHits_(ss).filter(function (x) { return x.key === h.key; })[0]) };
}


/* ════════════════════════════════════════════════════════════════════
   DỌN BẢN "IN TRANG" + TẢI LẠI (18/11/2026, người dùng: "tải pdf bị sai, không đúng file")
   Lượt bot đầu (bản cũ) in trang thành PDF: "Thông báo mời thầu" (nay lấy đúng file nút Tải TBMT) và "Kết quả lựa chọn nhà thầu"
   (tab Kết quả KHÔNG có nút tải PDF — QĐ phê duyệt / báo cáo đánh giá chỉ tải qua Agent) ⇒ botRequeue {key, before, run}:
   gói Đã tải trước mốc `before` ⇒ bỏ file "… - Kết quả lựa chọn nhà thầu.pdf" (Thùng rác Drive + bỏ khỏi gói + xoá dòng Sheet tổng hợp) ⇒ Chờ tải lại.
   Không run=1 ⇒ chỉ liệt kê.
   ════════════════════════════════════════════════════════════════════ */
function wtdRequeue_(p) {
  const before = wtS_(p.before) || '2026-11-18 12:00:00', run = wtTrue_(p.run);
  const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss);
  const isPrint = function (f) { return /Kết quả lựa chọn nhà thầu\.pdf$/i.test(wtS_(f.name)); };
  // cột "Xong lúc" là ô ngày giờ của Sheet ⇒ chữ dạng "Wed Nov 18 2026 10:23:00 GMT+0700" — đổi về mốc thời gian rồi mới so
  const tOf = function (v) { v = wtS_(v); if (!v) return 0; const t = /^\d{4}-\d\d-\d\d/.test(v) ? Date.parse((v.length === 10 ? v + ' 00:00:00' : v.slice(0, 19)).replace(' ', 'T') + '+07:00') : Date.parse(v); return isFinite(t) ? t : 0; };
  const tB = tOf(before);
  const L = H.filter(function (h) { const t = tOf(h.done) || tOf(h.last); return (h.status === WT.ST.DONE || h.status === WT.ST.NOFILE) && t && t < tB; });
  const out = { before: before, run: run, n: L.length, trashed: 0, sumDel: 0, items: [] };
  if (!run) { out.items = L.slice(0, 60).map(function (h) { return h.no + ' · ' + (h.files || []).filter(isPrint).length + ' bản in'; }); return Object.assign({ ok: true }, out); }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
  const dropNames = {};
  try {
    L.forEach(function (h) {
      const keep = [];
      (h.files || []).forEach(function (f) {
        if (!isPrint(f)) { keep.push(f); return; }
        try { if (f.id) DriveApp.getFileById(f.id).setTrashed(true); out.trashed++; } catch (e) {}
        dropNames[wtS_(f.name)] = 1;
      });
      sh.getRange(h.row, 11, 1, 5).setValues([[WT.ST.WAIT, JSON.stringify(keep), 0, '', '']]);
      out.items.push(h.no);
    });
  } finally { lock.releaseLock(); }
  try {
    const sh2 = wtdSumSheet_(wtdSumBook_()), n = WTD.HEAD.length, last = sh2.getLastRow();
    if (last > 1) {
      const keys = sh2.getRange(2, n, last - 1, 1).getValues().map(function (r) { return wtS_(r[0]); });
      for (let i = keys.length - 1; i >= 0; i--) { const nm = keys[i].split('|').slice(2).join('|'); if (dropNames[nm] || (/\|Kết quả lựa chọn nhà thầu\|/.test(keys[i]) && /Kết quả lựa chọn nhà thầu\.pdf$/i.test(nm))) { sh2.deleteRow(i + 2); out.sumDel++; } }
    }
  } catch (e) { out.sumErr = String(e.message || e); }
  try { CacheService.getScriptCache().remove('wt_q'); } catch (e) {}
  return Object.assign({ ok: true }, out);
}
