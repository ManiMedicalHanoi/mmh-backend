/**
 * MMH – FILE EXCEL DỰ TRÙ CHO NHÀ PHÂN PHỐI (NPP)
 * Phiên bản 2.1 · 30/10/2026
 *
 * File gốc giữ nguyên bố cục, nội dung và công thức. Script chỉ:
 *   1. Xuất file Excel cho từng NPP: danh sách chọn mã, dự trù đã gửi, đơn đã đặt, dự trù chưa đặt hàng, cảnh báo
 *      (số liệu đọc từ sheet SUM, cùng cách tính với file gốc). File lưu trong Drive, thư mục
 *      "MMH – File NPP / Tháng yyyy-mm" cạnh file gốc.
 *   2. Nhập file Excel NPP gửi lại: kiểm tra rồi ghi dự trù của tháng dự trù vào cột A–G của
 *      sheet "1 Dự trù cố định" (thay các dòng cũ của NPP đó trong tháng đó).
 *   3. Ghi nhật ký vào sheet "NHẬT KÝ FILE EXCEL NPP" (tạo thêm ở cuối file gốc).
 *
 * File NPP được nhận diện bằng nội dung (sheet ẩn có ký hiệu MMH_DUTRU_NPP_V1), nên NPP đổi tên
 * sheet hoặc tên file vẫn nhập được. Mẫu Excel nằm ở file Mau_Excel.gs (dựng bằng build_tpl.py).
 */

const CFG = {
  VERSION: '2.1 · 30/10/2026',
  SIG: 'MMH_DUTRU_NPP_V1',
  MENU: 'MMH · File NPP',
  SH: { DT: '1 Dự trù cố định', TT: '2 Đặt hàng thực tế', DM: 'DANH MỤC', CD: 'CÀI ĐẶT', SUM: 'SUM', LOG: 'NHẬT KÝ FILE EXCEL NPP' },
  NCOL: 7,                 // dữ liệu nhập ở cột A–G
  CD_NPP: 'A2:A9',         // danh sách NPP
  SUM_MONTH: 'B2',         // tháng hiện tại
  SUM_HEAD: 4,             // dòng tiêu đề của SUM (dữ liệu từ dòng 5)
  FOLDER: 'MMH – File NPP',
  DL_NAME: 'DỮ LIỆU',      // sheet ẩn trong file Excel
  R0: 11,                  // dòng dữ liệu đầu tiên của sheet ẩn
  MAXR: 3000,              // số mã tối đa (công thức trong mẫu tính đến dòng R0 + MAXR - 1)
  NHIST: 10,               // số tháng trong bảng lịch sử (tháng cuối = tháng dự trù)
  HDR_CODE: 'Mã hàng (chọn trong danh sách)',
  HDR_QTY: /^(SỐ )?DỰ TRÙ .*\(nhập\)/
};
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const LOG_HEAD = ['Thời điểm', 'Người thực hiện', 'Việc', 'NPP', 'Tháng dự trù', 'Tên file', 'Đường dẫn', 'Số mã', 'Tổng số lượng', 'Ghi chú'];
const BUSY = 'Một người dùng khác đang chạy chức năng này. Vui lòng thử lại sau ít phút.';


// =====================================================================================
// MENU
// =====================================================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu(CFG.MENU)
    .addItem('1. Xuất file Excel cho NPP…', 'menuXuatFile')
    .addItem('2. Nhập file Excel NPP gửi lại…', 'menuNhapFile')
    .addSeparator()
    .addItem('Mở nhật ký file NPP', 'menuNhatKy')
    .addItem('Thông tin phiên bản', 'menuPhienBan')
    .addToUi();
}

function menuXuatFile() {
  const html = HtmlService.createHtmlOutputFromFile('XuatFile').setWidth(760).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Xuất file Excel cho nhà phân phối');
}

function menuNhapFile() {
  const html = HtmlService.createHtmlOutputFromFile('NhapFile').setWidth(900).setHeight(660);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nhập file Excel NPP gửi lại');
}

function menuNhatKy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(logSheet_(ss));
}

function menuPhienBan() {
  SpreadsheetApp.getUi().alert('Thông tin phiên bản', 'MMH – File Excel dự trù cho NPP\nPhiên bản ' + CFG.VERSION,
    SpreadsheetApp.getUi().ButtonSet.OK);
}


// =====================================================================================
// TIỆN ÍCH
// =====================================================================================
function msg_(e) { return String(e && e.message ? e.message : e).replace(/^Exception:\s*/, ''); }

function sheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Không tìm thấy sheet "' + name + '" trong file gốc.');
  return sh;
}

function norm_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
function key_(v) { return norm_(v).toUpperCase(); }
function codeStr_(v) { return typeof v === 'number' ? String(v) : norm_(v); }

function toYm_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getFullYear() * 100 + v.getMonth() + 1;
  const s = String(v).trim().replace(/\.0+$/, '');
  let m = s.match(/^(\d{4})(\d{2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return +s;
  m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return +m[2] * 100 + +m[1];
  return null;
}

function addM_(ym, k) {
  const idx = Math.floor(ym / 100) * 12 + (ym % 100 - 1) + k;
  return Math.floor(idx / 12) * 100 + (idx % 12) + 1;
}

function lbl_(ym) { return ym ? String(ym % 100).padStart(2, '0') + '/' + Math.floor(ym / 100) : ''; }
function fy_(ym) { return ym % 100 >= 9 ? Math.floor(ym / 100) : Math.floor(ym / 100) - 1; }
function n0_(x) { return String(Math.round(x || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function pct_(x) { return Math.round(x * 100) + '%'; }

function num_(v) {
  if (typeof v === 'number') return v;
  const s = String(v === null || v === undefined ? '' : v).trim().replace(/\s/g, '');
  if (s === '') return null;
  if (/^-?\d+([.,]\d+)?$/.test(s)) return Number(s.replace(',', '.'));
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return NaN;
}

/** Số lượng (số nguyên): "1.200" / "1,200" là một nghìn hai trăm. */
function qty_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim().replace(/\s/g, '');
  if (typeof v !== 'number' && /^-?\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return num_(v);
}

function tz_() { return Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh'; }
function fmt_(d, f) { return Utilities.formatDate(d, tz_(), f); }

function fmtTime_(v) {
  return Object.prototype.toString.call(v) === '[object Date]' ? fmt_(v, 'dd/MM/yyyy HH:mm') : (v ? String(v) : '');
}

function fileIdFrom_(s) {
  s = String(s || '').trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  throw new Error('Đường dẫn file không hợp lệ.');
}

/** Tham số ở sheet CÀI ĐẶT (cột G nhãn, cột H giá trị) – tìm theo nhãn, thiếu thì dùng mặc định. */
function settings_(ss) {
  const cd = sheet_(ss, CFG.SH.CD);
  const npps = cd.getRange(CFG.CD_NPP).getValues().map(function (r) { return norm_(r[0]); }).filter(String);
  if (!npps.length) throw new Error('Sheet CÀI ĐẶT chưa có tên NPP (cột A, dòng 2–9).');
  const par = cd.getRange(1, 7, 20, 2).getValues();
  const find = function (re, def) {
    for (let i = 0; i < par.length; i++) {
      if (re.test(norm_(par[i][0]))) { const v = num_(par[i][1]); if (typeof v === 'number' && !isNaN(v)) return v; }
    }
    return def;
  };
  let cm = toYm_(sheet_(ss, CFG.SH.SUM).getRange(CFG.SUM_MONTH).getValue());
  if (!cm) { const d = new Date(); cm = d.getFullYear() * 100 + d.getMonth() + 1; }
  const lead = Math.round(find(/^Lead time/i, 3));
  return {
    npps: npps, cm: cm, lead: lead, T: addM_(cm, lead),
    watch: find(/^Ngưỡng THEO DÕI/i, 0.1), high: find(/^Ngưỡng CAO/i, 0.2), tbN: Math.max(1, Math.round(find(/^Số tháng tính TB/i, 6)))
  };
}

/** Đọc cột A–G (từ dòng 2) của 1 sheet dữ liệu; bỏ các dòng trống ở cuối. */
function readBlock_(sh) {
  const n = sh.getMaxRows() - 1;
  const vals = n > 0 ? sh.getRange(2, 1, n, CFG.NCOL).getValues() : [];
  let last = vals.length;
  while (last > 0 && vals[last - 1].every(function (v) { return v === '' || v === null; })) last--;
  return vals.slice(0, last);
}

/**
 * Ghi lại khối A–G từ dòng 2 (chỉ giá trị, không đụng tới các cột công thức bên phải).
 * Thiếu dòng thì chèn thêm trước dòng cuối để các vùng công thức tự giãn theo.
 */
function writeBlock_(sh, rows, oldCount) {
  const need = rows.length + 1;
  if (need > sh.getMaxRows()) sh.insertRowsBefore(sh.getMaxRows(), need - sh.getMaxRows() + 50);
  if (rows.length) {
    sh.getRange(2, 4, rows.length, 1).setNumberFormat('@');          // mã hàng giữ dạng chữ
    sh.getRange(2, 1, rows.length, CFG.NCOL).setValues(rows);
  }
  if (oldCount > rows.length) sh.getRange(2 + rows.length, 1, oldCount - rows.length, CFG.NCOL).clearContent();
}

/** Danh mục: mã → {code, name, group}, giữ thứ tự. */
function catalog_(ss) {
  const sh = sheet_(ss, CFG.SH.DM);
  const n = sh.getLastRow() - 1;
  const list = [], map = {};
  if (n > 0) sh.getRange(2, 1, n, 3).getValues().forEach(function (r) {
    const c = codeStr_(r[0]);
    if (!c || map[key_(c)]) return;
    map[key_(c)] = { code: c, name: norm_(r[1]), group: norm_(r[2]) };
    list.push(map[key_(c)]);
  });
  return { list: list, map: map };
}

function logSheet_(ss) {
  let sh = ss.getSheetByName(CFG.SH.LOG);
  if (!sh) {
    sh = ss.insertSheet(CFG.SH.LOG, ss.getSheets().length);
    sh.getRange(1, 1).setValue('NHẬT KÝ FILE EXCEL NPP').setFontWeight('bold').setFontSize(14);
    sh.getRange(2, 1).setValue('Script tự ghi khi xuất file Excel cho NPP và khi nhập file NPP gửi lại. Không cần sửa sheet này.')
      .setFontColor('#666666');
    sh.getRange(3, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.setFrozenRows(3);
    [130, 170, 90, 110, 90, 300, 300, 70, 100, 380].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}

function log_(ss, what, npp, T, name, url, n, sum, note) {
  logSheet_(ss).appendRow([new Date(), Session.getActiveUser().getEmail() || '', what, npp, lbl_(T), name, url, n, sum, note || '']);
}


// =====================================================================================
// SỐ LIỆU TỪ SHEET SUM (cùng cách tính với file gốc)
// =====================================================================================
/** Cột của SUM theo dòng đầu tiên của tiêu đề (dòng 4); thiếu thì dùng vị trí mặc định. */
function sumCols_(head) {
  const want = {
    npp: ['Nhà phân phối', 2], m: ['Tháng', 3], code: ['Mã hàng', 4], name: ['Tên hàng', 5], group: ['Nhóm hàng', 6],
    dt: ['Dự trù cố định', 7], tt: ['Đặt hàng thực tế', 8], dk: ['Đặt hàng dự kiến', 9], dh: ['Đặt hàng dự kiến/thực tế', 10],
    n: ['THIẾU LŨY KẾ TRONG KỲ', 13], o: ['Pending sau bù trừ', 14], sdt: ['Σ Dự trù cố định lũy kế', 15],
    sdh: ['Σ Đặt hàng DK/TT lũy kế', 16], st: ['Trạng thái tháng', 22]
  };
  const first = head.map(function (h) { return norm_(String(h).split('\n')[0]); });
  const out = {};
  Object.keys(want).forEach(function (k) {
    const i = first.indexOf(want[k][0]);
    out[k] = i >= 0 ? i : want[k][1];
  });
  return out;
}

/** Đọc SUM 1 lần: { cols, rows } – rows chỉ giữ các cột cần dùng. */
function readSum_(ss) {
  const sh = sheet_(ss, CFG.SH.SUM);
  const last = sh.getLastRow();
  const width = Math.max(23, Math.min(sh.getMaxColumns ? sh.getMaxColumns() : 25, 26));
  const head = sh.getRange(CFG.SUM_HEAD, 1, 1, width).getValues()[0];
  const C = sumCols_(head);
  if (norm_(String(head[C.dt]).split('\n')[0]) !== 'Dự trù cố định' || norm_(String(head[C.n]).split('\n')[0]) !== 'THIẾU LŨY KẾ TRONG KỲ') {
    throw new Error('Sheet SUM không đúng bố cục (dòng 4 phải là tiêu đề: Dự trù cố định, THIẾU LŨY KẾ TRONG KỲ…).');
  }
  const n = last - CFG.SUM_HEAD;
  const vals = n > 0 ? sh.getRange(CFG.SUM_HEAD + 1, 1, n, width).getValues() : [];
  return { C: C, vals: vals };
}

/** Số liệu của 1 NPP: các tháng mốc + thống kê từng mã của danh mục. */
function nppData_(S, sum, cat, npp) {
  const C = sum.C, K = key_(npp);
  const g = {};                     // mã → { tháng → dòng SUM }
  const info = {};                  // mã → { name, group } (mã có số liệu nhưng chưa có trong danh mục)
  let lastP = 0, lastAct = 0;
  sum.vals.forEach(function (r) {
    if (key_(r[C.npp]) !== K) return;
    const m = toYm_(r[C.m]);
    const code = codeStr_(r[C.code]);
    if (!m || !code) return;
    const ck = key_(code);
    (g[ck] = g[ck] || {})[m] = r;
    if (!info[ck]) info[ck] = { code: code, name: norm_(r[C.name]), group: norm_(r[C.group]) };
    if (norm_(r[C.st]) === 'Đã qua' && m > lastP) lastP = m;
    if ((Number(r[C.tt]) || 0) > 0 && m > lastAct) lastAct = m;
  });
  const T = S.T;
  if (!lastP) lastP = addM_(S.cm, -1);
  if (!lastAct) lastAct = lastP;
  const edit = [];
  for (let m = addM_(lastP, 1); m < T; m = addM_(m, 1)) edit.push(m);
  const hist = [];
  for (let k = CFG.NHIST - 1; k >= 0; k--) hist.push(addM_(T, -k));
  const tbm = [];
  for (let k = S.tbN - 1; k >= 0; k--) tbm.push(addM_(lastAct, -k));

  const list = cat.list.slice();
  Object.keys(info).forEach(function (ck) { if (!cat.map[ck]) list.push(info[ck]); });
  const items = list.map(function (it) { return stats_(it, g[key_(it.code)] || null, S, T, lastP, edit, hist, tbm, C); });
  items.sort(function (a, b) {
    return (a.group || '￿').localeCompare(b.group || '￿') || a.code.localeCompare(b.code);
  });
  return { npp: npp, T: T, cm: S.cm, lastP: lastP, lastAct: lastAct, edit: edit, hist: hist, items: items };
}

/** Thống kê 1 mã – giống hệt cách tính của file mẫu đã duyệt. */
function stats_(it, ms, S, T, lastP, edit, hist, tbm, C) {
  const get = function (m, col) { const r = ms && ms[m]; return r ? (Number(r[col]) || 0) : 0; };
  let sdt = 0, sdh = 0, thieu = 0, o = 0;
  const months = ms ? Object.keys(ms).map(Number) : [];
  const fyNext = fy_(addM_(lastP, 1));
  const prev = months.filter(function (m) { return m <= lastP && fy_(m) === fyNext; });
  if (prev.length) {
    const r = ms[Math.max.apply(null, prev)];
    sdt = Number(r[C.sdt]) || 0; sdh = Number(r[C.sdh]) || 0; thieu = Number(r[C.n]) || 0; o = Number(r[C.o]) || 0;
  }
  const pct = sdt ? thieu / sdt : 0;
  let lvl;
  if (!ms) lvl = 'Chưa có lịch sử';
  else if (sdt === 0) lvl = sdh > 0 ? 'Chưa dự trù' : 'Ổn';
  else if (pct >= S.high) lvl = 'Cao';
  else if (pct >= S.watch) lvl = 'Theo dõi';
  else lvl = 'Ổn';
  edit.forEach(function (m) {
    if (m % 100 === 9) o = 0;
    o = Math.max(0, o + get(m, C.dt) - get(m, C.dk));
  });
  const dkT = get(T, C.dk);
  const dx = dkT ? Math.max(0, Math.round(dkT - o)) : null;
  let tb = 0;
  tbm.forEach(function (m) { tb += get(m, C.tt); });
  tb = tb / tbm.length;
  let sent = 0;
  edit.forEach(function (m) { sent += get(m, C.dt); });
  const h = [];
  hist.forEach(function (m) {
    let n = 0;
    if (ms && ms[m]) n = Number(ms[m][C.n]) || 0;
    else if (ms) {
      const pv = months.filter(function (x) { return x < m && fy_(x) === fy_(m); });
      n = pv.length ? (Number(ms[Math.max.apply(null, pv)][C.n]) || 0) : 0;
    }
    h.push(get(m, C.dt), get(m, C.dh), n);
  });
  let info;
  if (!ms) info = 'Mã chưa có dự trù và đặt hàng. Chỉ dự trù khi có kế hoạch bán chắc chắn.';
  else {
    const parts = [];
    if (sdt === 0 && sdh > 0) parts.push('Từ đầu kỳ đã đặt hàng ' + n0_(sdh) + ' nhưng chưa gửi dự trù.');
    else if (sdt || sdh) parts.push('Từ đầu kỳ đã gửi dự trù ' + n0_(sdt) + ', đã đặt hàng ' + n0_(sdh) +
      (thieu ? '; còn ' + n0_(thieu) + ' dự trù chưa đặt hàng (' + pct_(pct) + ' số đã dự trù).' : '; dự trù đã được đặt hết.'));
    if (o) parts.push('Đến hết ' + lbl_(addM_(T, -1)) + ' dự kiến vẫn còn ' + n0_(o) + ' dự trù chưa đặt hàng.');
    if (dx === null) parts.push('Chưa có đặt hàng dự kiến tháng ' + lbl_(T) + ' nên chưa có đề xuất.');
    else if (dx === 0) parts.push('Dự trù chưa đặt hàng đã đủ cho tháng ' + lbl_(T) + ': không cần dự trù thêm.');
    else parts.push('Đề xuất dự trù ' + n0_(dx) + '.');
    if (tb === 0 && (thieu || o)) parts.push('6 tháng gần nhất không có đơn mã này.');
    info = parts.join(' ');
  }
  let hint;
  if (!ms) hint = 'Mã chưa có lịch sử: chỉ dự trù khi có kế hoạch bán chắc chắn.';
  else if (tb === 0 && (thieu || o)) hint = '6 tháng không có đơn mã này: trao đổi với MMH trước khi dự trù.';
  else if (dx === 0) hint = 'Dự trù chưa đặt hàng đã đủ cho tháng ' + lbl_(T) + ': không cần dự trù thêm.';
  else if (lvl === 'Cao') hint = 'Còn nhiều dự trù chưa đặt hàng (' + pct_(pct) + '): nên đặt hết phần đã dự trù trước, hạn chế dự trù thêm.';
  else if (lvl === 'Theo dõi') hint = 'Còn dự trù chưa đặt hàng (' + pct_(pct) + '): cân nhắc giảm dự trù.';
  else if (lvl === 'Chưa dự trù') hint = 'Có đặt hàng nhưng chưa gửi dự trù: nên dự trù để MMH chuẩn bị hàng.';
  else if (dx === null) hint = 'Chưa có đặt hàng dự kiến tháng ' + lbl_(T) + ' nên chưa có đề xuất.';
  else hint = 'Có thể dự trù theo đề xuất.';
  return { code: it.code, name: it.name, group: it.group, tb: Math.round(tb), sdt: sdt, sdh: sdh, thieu: thieu, pct: pct, lvl: lvl,
    sent: sent, o: o, dx: dx, info: info, hint: hint, hist: h };
}

function label_(it) { return it.name ? it.code + ' · ' + it.name : it.code; }


// =====================================================================================
// 1. XUẤT FILE EXCEL CHO NPP
// =====================================================================================
function apiExportInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const S = settings_(ss);
    const next = addM_(S.cm, 1);
    const han = '05/' + String(next % 100).padStart(2, '0') + '/' + Math.floor(next / 100);
    const lo = lastOrders_(ss, S.npps);
    return { ok: true, cm: lbl_(S.cm), T: lbl_(S.T), han: han, npps: S.npps,
      orders: S.npps.map(function (n) { const m = lo[key_(n)]; return { npp: n, last: lbl_(m), old: !m || m < S.cm }; }) };
  } catch (e) {
    return { ok: false, error: msg_(e) };
  }
}

/** Xuất 1 file cho 1 NPP; trả về đường dẫn file trong Drive. */
function apiExportFile(npp, han) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const S = settings_(ss);
    npp = norm_(npp);
    if (S.npps.map(key_).indexOf(key_(npp)) < 0) throw new Error('NPP "' + npp + '" không có trong sheet CÀI ĐẶT.');
    han = norm_(han);
    if (han && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(han)) throw new Error('Hạn gửi "' + han + '" không đúng dạng ngày/tháng/năm.');
    const d = nppData_(S, readSum_(ss), catalog_(ss), npp);
    if (d.items.length > CFG.MAXR) throw new Error('Danh mục có ' + d.items.length + ' mã, vượt giới hạn ' + CFG.MAXR + ' mã của mẫu Excel.');
    const name = fmt_(new Date(), 'yyyyMMdd') + '_MMH_DuTru_' + d.T + '_' + npp.replace(/[^A-Za-z0-9À-ỹ]+/g, '-').replace(/^-+|-+$/g, '') + '.xlsx';
    const blob = buildXlsx_(d, S, ss, han || '', name);
    const folder = outFolder_(ss, S.cm);
    const file = folder.createFile(blob);
    const nCao = d.items.filter(function (x) { return x.lvl === 'Cao'; }).length;
    const nDx = d.items.filter(function (x) { return x.dx; }).length;
    log_(ss, 'Xuất file', npp, d.T, name, file.getUrl(), d.items.length, '', 'Hạn gửi ' + (han || '—') + ' · ' + nDx + ' mã có đề xuất · ' + nCao + ' mã cảnh báo Cao');
    return { ok: true, npp: npp, name: name, url: file.getUrl(), download: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
      folder: folder.getName(), folderUrl: folder.getUrl(), T: lbl_(d.T), lastP: lbl_(d.lastP), lastAct: lbl_(d.lastAct), n: d.items.length, nDx: nDx, nCao: nCao };
  } catch (e) {
    return { ok: false, npp: npp, error: msg_(e) };
  }
}

function outFolder_(ss, cm) {
  const month = 'Tháng ' + Math.floor(cm / 100) + '-' + String(cm % 100).padStart(2, '0');
  try {
    const parents = DriveApp.getFileById(ss.getId()).getParents();
    const base = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    return sub_(sub_(base, CFG.FOLDER), month);
  } catch (e) {
    return sub_(sub_(DriveApp.getRootFolder(), CFG.FOLDER), month);
  }
}

function sub_(folder, name) {
  const it = folder.getFoldersByName(name);
  return it.hasNext() ? it.next() : folder.createFolder(name);
}

/** Dựng file .xlsx từ mẫu: thay chữ {{…}}, ghi sheet ẩn DỮ LIỆU, đặt vùng danh sách chọn DS_MA. */
function buildXlsx_(d, S, ss, han, name) {
  const files = Utilities.unzip(Utilities.newBlob(Utilities.base64Decode(MAU_EXCEL_B64.join('')), 'application/zip', 'mau.zip'));
  const map = {};
  files.forEach(function (b) { map[b.getName().replace(/^\//, '')] = b; });
  const wbXml = map['xl/workbook.xml'].getDataAsString();
  const dlPath = sheetPath_(wbXml, map['xl/_rels/workbook.xml.rels'].getDataAsString(), CFG.DL_NAME);
  if (!dlPath || !map[dlPath]) throw new Error('Mẫu Excel thiếu sheet ' + CFG.DL_NAME + '.');

  const kind = function (m) { return m === d.T ? 'cần dự trù' : (m <= d.lastAct ? 'đã đặt' : 'đặt dự kiến'); };
  const k0 = fy_(addM_(d.lastP, 1)) * 100 + 9;
  const ph = {
    NPP: d.npp, T: lbl_(d.T), CM: lbl_(d.cm), HAN: han || '—', LASTP: lbl_(d.lastP), LASTACT: lbl_(d.lastAct), TM1: lbl_(addM_(d.T, -1)),
    EDITR: d.edit.length ? lbl_(d.edit[0]) + (d.edit.length > 1 ? '–' + lbl_(d.edit[d.edit.length - 1]) : '') : 'các tháng tới',
    THH: pct_(S.high), THW: pct_(S.watch), K0: lbl_(k0), B3: b3_(d)
  };
  d.hist.forEach(function (m, k) { ph['HM' + (k + 1)] = lbl_(m) + '\n' + kind(m); });
  const fill = function (xml) {
    return xml.replace(/\{\{([A-Z0-9]+)\}\}/g, function (all, k) { return ph.hasOwnProperty(k) ? xesc_(ph[k]) : all; });
  };

  const out = [];
  files.forEach(function (b) {
    const p = b.getName().replace(/^\//, '');
    let blob = b;
    if (p === dlPath) blob = Utilities.newBlob(dlSheetXml_(map[p].getDataAsString(), d, S, ss), 'application/xml', p);
    else if (p === 'xl/workbook.xml') {
      const end = CFG.R0 + d.items.length - 1;
      blob = Utilities.newBlob(wbXml.replace(/(<definedName name="DS_MA">[^<]*\$D\$\d+:\$D\$)\d+/, '$1' + end), 'application/xml', p);
    } else if (/^xl\/(worksheets\/sheet\d+|sharedStrings)\.xml$/.test(p)) {
      blob = Utilities.newBlob(fill(b.getDataAsString()), 'application/xml', p);
    }
    out.push(blob);
  });
  const zip = Utilities.zip(out, name);
  return Utilities.newBlob(zip.getBytes(), XLSX_MIME, name);
}

/** Dòng giải thích số liệu ở đầu sheet DỰ TRÙ: đơn đã đặt đến tháng nào, dự trù đã gửi đến tháng nào. */
function b3_(d) {
  let t = 'Đơn hàng đã đặt cập nhật đến hết ' + lbl_(d.lastAct) + '. Dự trù đã gửi tính đến tháng ' + lbl_(addM_(d.T, -1)) + '.';
  if (d.lastAct < d.lastP) {
    const a = addM_(d.lastAct, 1);
    t += ' Tháng ' + (a === d.lastP ? lbl_(a) : lbl_(a) + '–' + lbl_(d.lastP)) + ' chưa có đơn thực tế nên tạm tính theo đặt hàng dự kiến.';
  }
  return t + ' Kỳ bắt đầu từ tháng 09.';
}

/** Tháng có đơn thực tế gần nhất của từng NPP (sheet 2, cột A–B). */
function lastOrders_(ss, npps) {
  const out = {};
  npps.forEach(function (n) { out[key_(n)] = 0; });
  const sh = ss.getSheetByName(CFG.SH.TT);
  if (!sh) return out;
  const n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, 2).getValues().forEach(function (r) {
    const k = key_(r[0]), m = toYm_(r[1]);
    if (m && out.hasOwnProperty(k) && m > out[k]) out[k] = m;
  });
  return out;
}

function xesc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** Đường dẫn file XML của sheet có tên `name` (theo workbook.xml + workbook.xml.rels). */
function sheetPath_(wbXml, relsXml, name) {
  const sheets = listSheets_(wbXml, relsXml);
  for (let i = 0; i < sheets.length; i++) if (sheets[i].name === name) return sheets[i].path;
  return null;
}

function listSheets_(wbXml, relsXml) {
  const rels = {};
  (relsXml.match(/<Relationship\b[^>]*>/g) || []).forEach(function (t) {
    const id = attr_(t, 'Id'), tg = attr_(t, 'Target');
    if (id && tg) rels[id] = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, '');
  });
  return (wbXml.match(/<sheet\b[^>]*>/g) || []).map(function (t) {
    return { name: unesc_(attr_(t, 'name') || ''), state: attr_(t, 'state') || 'visible', path: rels[attr_(t, 'r:id') || attr_(t, 'id')] || null };
  });
}

function attr_(tag, name) {
  const m = tag.match(new RegExp('\\s' + name.replace(':', '\\:') + '="([^"]*)"'));
  return m ? m[1] : null;
}

function colName_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

/** XML của sheet ẩn DỮ LIỆU: thông tin file (A1:B9) + bảng mã từ cột D, dòng R0. */
function dlSheetXml_(tpl, d, S, ss) {
  const rows = [];
  const cell = function (r, c, v) {
    const ref = colName_(c) + r;
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"><v>' + v + '</v></c>';
    return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xesc_(v) + '</t></is></c>';
  };
  const row = function (r, cells) { const x = cells.join(''); if (x) rows.push('<row r="' + r + '">' + x + '</row>'); };
  const meta = [['Ký hiệu', CFG.SIG], ['Nhà phân phối', d.npp], ['Tháng gửi', d.cm], ['Tháng dự trù', d.T], ['Tháng đã chốt', d.lastP],
    ['Ngày tạo', fmt_(new Date(), 'dd/MM/yyyy HH:mm')], ['Số mã trong danh sách', d.items.length], ['ID file gốc', ss.getId()],
    ['Lead time (tháng)', S.lead]];
  meta.forEach(function (kv, i) { row(i + 1, [cell(i + 1, 1, kv[0]), cell(i + 1, 2, kv[1])]); });
  const head = ['Nhãn chọn', 'Mã hàng', 'Tên hàng', 'Nhóm hàng', 'Số lượng đặt TB/tháng', 'Dự trù đã gửi trong kỳ', 'Đã đặt hàng trong kỳ', 'Dự trù chưa đặt hàng',
    'Tỷ lệ chưa đặt', 'Cảnh báo', 'Dự trù đã gửi các tháng tới', 'Chưa đặt dự kiến', 'Dự trù đề xuất', 'Thông tin', 'Gợi ý'];
  d.hist.forEach(function (m) { head.push('DT ' + lbl_(m), 'DH ' + lbl_(m), 'CL ' + lbl_(m)); });
  row(CFG.R0 - 1, head.map(function (h, j) { return cell(CFG.R0 - 1, 4 + j, h); }));
  d.items.forEach(function (x, i) {
    const r = CFG.R0 + i;
    const vals = [label_(x), x.code, x.name, x.group, x.tb, x.sdt, x.sdh, x.thieu, x.pct, x.lvl, x.sent, x.o, x.dx === null ? '' : x.dx,
      x.info, x.hint].concat(x.hist);
    row(r, vals.map(function (v, j) { return j === 1 ? cell(r, 4 + j, String(v)) : cell(r, 4 + j, v); }));
  });
  const lastCol = colName_(4 + head.length - 1), lastRow = Math.max(CFG.R0, CFG.R0 + d.items.length - 1);
  let xml = tpl.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:' + lastCol + lastRow + '"/>');
  const data = '<sheetData>' + rows.join('') + '</sheetData>';
  xml = /<sheetData\/>/.test(xml) ? xml.replace(/<sheetData\/>/, data) : xml.replace(/<sheetData>[\s\S]*<\/sheetData>/, data);
  return xml;
}


// =====================================================================================
// 2. NHẬP FILE EXCEL NPP GỬI LẠI
// =====================================================================================
function apiImportInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const S = settings_(ss);
    return { ok: true, cm: lbl_(S.cm), T: lbl_(S.T), sheet: CFG.SH.DT };
  } catch (e) {
    return { ok: false, error: msg_(e) };
  }
}

/** src = { name, b64 } (file chọn từ máy) hoặc { ref } (đường dẫn file .xlsx trong Drive). */
function apiPreviewImport(src) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return publicResult_(analyze_(ss, srcBlob_(src)));
  } catch (e) {
    return { ok: false, fatal: msg_(e), name: src && src.name };
  }
}

function apiCommitImport(src) {
  const lock = LockService.getDocumentLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, fatal: BUSY }; }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const A = analyze_(ss, srcBlob_(src));
    if (A.errors.length) return publicResult_(A, 'File còn lỗi, chưa nhập. Vui lòng đề nghị NPP sửa rồi kiểm tra lại.');
    const sh = sheet_(ss, CFG.SH.DT);
    const rows = readBlock_(sh);                       // đọc lại ngay trước khi ghi
    const keep = rows.filter(function (r) { return !(key_(r[0]) === key_(A.npp) && toYm_(r[1]) === A.T); });
    writeBlock_(sh, keep.concat(A.newRows), rows.length);
    SpreadsheetApp.flush();
    const sum = A.newRows.reduce(function (s, r) { return s + r[5]; }, 0);
    const result = 'Đã nhập ' + A.newRows.length + ' mã, tổng ' + n0_(sum) + ' vào sheet "' + CFG.SH.DT + '" (tháng ' + lbl_(A.T) +
      '; thay ' + A.oldN + ' dòng cũ, tổng ' + n0_(A.oldSum) + ').';
    log_(ss, 'Nhập file', A.npp, A.T, A.name, A.url || '', A.newRows.length, sum, result);
    const out = publicResult_(A, result);
    out.committed = true;
    return out;
  } catch (e) {
    return { ok: false, fatal: msg_(e), name: src && src.name };
  } finally {
    lock.releaseLock();
  }
}

function srcBlob_(src) {
  if (!src) throw new Error('Chưa chọn file.');
  if (src.b64) {
    const name = norm_(src.name) || 'file.xlsx';
    return { blob: Utilities.newBlob(Utilities.base64Decode(src.b64), XLSX_MIME, name), name: name, url: '' };
  }
  const id = fileIdFrom_(src.ref);
  let f;
  try { f = DriveApp.getFileById(id); } catch (e) { throw new Error('Không mở được file. Vui lòng kiểm tra đường dẫn và quyền truy cập.'); }
  if (/google-apps/.test(f.getMimeType ? f.getMimeType() : '')) {
    throw new Error('Đây là file Google Sheets. Vui lòng mở file, chọn Tệp ▸ Tải xuống ▸ Microsoft Excel (.xlsx), rồi chọn file vừa tải.');
  }
  return { blob: f.getBlob(), name: f.getName(), url: f.getUrl() };
}

/** Đọc file NPP, kiểm tra và so sánh với file gốc. Không ghi gì. */
function analyze_(ss, src) {
  const S = settings_(ss);
  const X = readXlsx_(src.blob);
  const A = { name: src.name, url: src.url, errors: [], warnings: [], infos: [], newRows: [], oldN: 0, oldSum: 0, lines: [] };

  // sheet ẩn có ký hiệu (không phụ thuộc tên sheet)
  const dl = X.sheets.filter(function (s) { return norm_(s.cells.A1) === 'Ký hiệu' && norm_(s.cells.B1) === CFG.SIG; })[0];
  if (!dl) throw new Error('File không phải file Excel dự trù do MMH xuất (không tìm thấy dữ liệu nhận diện ' + CFG.SIG + ').');
  const meta = {};
  for (let r = 1; r <= 12; r++) if (dl.cells['A' + r]) meta[norm_(dl.cells['A' + r])] = dl.cells['B' + r];
  A.npp = norm_(meta['Nhà phân phối']);
  A.T = toYm_(meta['Tháng dự trù']);
  A.cm = toYm_(meta['Tháng gửi']);
  if (!A.npp || !A.T) throw new Error('File thiếu tên nhà phân phối hoặc tháng dự trù trong dữ liệu nhận diện.');
  if (meta['ID file gốc'] && norm_(meta['ID file gốc']) !== ss.getId()) A.warnings.push('File này được xuất từ một file gốc khác.');
  if (S.npps.map(key_).indexOf(key_(A.npp)) < 0) A.errors.push('NPP "' + A.npp + '" không có trong sheet CÀI ĐẶT của file gốc.');
  if (A.T < S.T) A.warnings.push('File dự trù cho tháng ' + lbl_(A.T) + ', sớm hơn tháng đang nhận dự trù (' + lbl_(S.T) +
    '). Nếu nhập, dự trù tháng ' + lbl_(A.T) + ' của NPP sẽ được thay bằng số trong file.');
  if (A.T > S.T) A.warnings.push('File dự trù cho tháng ' + lbl_(A.T) + ', muộn hơn tháng đang nhận dự trù (' + lbl_(S.T) + ').');

  // bảng mã trong sheet ẩn: nhãn / mã → thông tin
  const byLabel = {}, byCode = {};
  for (let r = CFG.R0; r <= dl.maxRow; r++) {
    const lb = norm_(dl.cells['D' + r]), code = codeStr_(dl.cells['E' + r]);
    if (!lb || !code) continue;
    const it = { code: code, name: norm_(dl.cells['F' + r]), lvl: norm_(dl.cells['M' + r]), dx: num_(dl.cells['P' + r]) };
    byLabel[key_(lb)] = it; byCode[key_(code)] = it;
  }
  const cat = catalog_(ss);

  // sheet nhập: tìm theo tiêu đề cột (không phụ thuộc tên sheet)
  let inp = null, hr = 0, cCode = 0, cQty = 0;
  X.sheets.forEach(function (s) {
    if (inp || s === dl) return;
    Object.keys(s.cells).forEach(function (ref) {
      if (inp || norm_(s.cells[ref]) !== CFG.HDR_CODE) return;
      const p = splitRef_(ref);
      for (let c = p.c + 1; c <= p.c + 30; c++) {
        if (CFG.HDR_QTY.test(norm_(s.cells[colName_(c) + p.r]))) { inp = s; hr = p.r; cCode = p.c; cQty = c; return; }
      }
    });
  });
  if (!inp) throw new Error('Không tìm thấy bảng nhập (cột "' + CFG.HDR_CODE + '" và cột "SỐ DỰ TRÙ"). Có thể bố cục file đã bị thay đổi.');

  const seen = {}, merged = {}, order = [];
  let nEmptyQty = 0, nZero = 0;
  for (let r = hr + 1; r <= inp.maxRow; r++) {
    const rawCode = inp.cells[colName_(cCode) + r], rawQty = inp.cells[colName_(cQty) + r];
    const lb = norm_(rawCode);
    const hasQty = !(rawQty === undefined || rawQty === null || norm_(rawQty) === '');
    if (!lb && !hasQty) continue;
    const where = 'Dòng ' + r + ': ';
    if (!lb) { A.warnings.push(where + 'có số lượng ' + norm_(rawQty) + ' nhưng chưa chọn mã – bỏ qua.'); continue; }
    let it = byLabel[key_(lb)] || byCode[key_(lb)] || byCode[key_(lb.split(' · ')[0])];
    if (!it) {
      const c = cat.map[key_(lb.split(' · ')[0])];
      if (c) it = { code: c.code, name: c.name, lvl: '', dx: null };
    }
    if (!hasQty) { nEmptyQty++; continue; }
    if (!it) { A.errors.push(where + 'mã "' + lb + '" không có trong danh mục.'); continue; }
    const q = qty_(rawQty);
    if (typeof q !== 'number' || isNaN(q)) { A.errors.push(where + 'mã ' + it.code + ': số lượng "' + norm_(rawQty) + '" không phải là số.'); continue; }
    if (q < 0) { A.errors.push(where + 'mã ' + it.code + ': số lượng âm (' + q + ').'); continue; }
    if (q % 1 !== 0) { A.errors.push(where + 'mã ' + it.code + ': số lượng ' + q + ' không phải số nguyên.'); continue; }
    if (q === 0) { nZero++; continue; }
    const k = key_(it.code);
    if (seen[k]) { A.warnings.push(where + 'mã ' + it.code + ' đã có ở dòng ' + seen[k] + '; số lượng được cộng dồn.'); merged[k].q += q; continue; }
    seen[k] = r;
    merged[k] = { it: it, q: q };
    order.push(k);
  }
  if (nEmptyQty) A.infos.push(nEmptyQty + ' mã đã chọn nhưng chưa nhập số lượng – không nhập.');
  if (nZero) A.infos.push(nZero + ' mã nhập số lượng 0 – không ghi vào file gốc.');

  const note = 'Nhập từ file Excel NPP ' + fmt_(new Date(), 'dd/MM/yyyy HH:mm');
  const sent = A.cm || addM_(A.T, -S.lead);
  let nCao = 0, nHigh = 0;
  order.forEach(function (k) {
    const x = merged[k], c = cat.map[k];
    const name = (c && c.name) || x.it.name || '';
    if (!c) A.warnings.push('Mã ' + x.it.code + ' chưa có trong DANH MỤC của file gốc (vẫn nhập, nhưng không có tên, nhóm, đơn giá).');
    A.newRows.push([A.npp, A.T, sent, x.it.code, name, x.q, note]);
    const dx = typeof x.it.dx === 'number' && !isNaN(x.it.dx) ? x.it.dx : null;
    if (x.it.lvl === 'Cao') nCao++;
    if (dx !== null && x.q > dx) nHigh++;
    A.lines.push({ code: x.it.code, name: name, q: x.q, dx: dx, lvl: x.it.lvl });
  });
  A.nCao = nCao; A.nHigh = nHigh;
  if (!A.newRows.length && !A.errors.length) A.warnings.push('File không có mã nào có số lượng. Nếu nhập, dự trù cũ của NPP trong tháng ' + lbl_(A.T) + ' sẽ bị xoá.');

  readBlock_(sheet_(ss, CFG.SH.DT)).forEach(function (r) {
    if (key_(r[0]) === key_(A.npp) && toYm_(r[1]) === A.T) { A.oldN++; A.oldSum += num_(r[5]) || 0; }
  });
  return A;
}

function splitRef_(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  let c = 0;
  for (let i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64);
  return { c: c, r: +m[2] };
}

function publicResult_(A, note) {
  const sum = A.newRows.reduce(function (s, r) { return s + r[5]; }, 0);
  return { ok: !A.errors.length, npp: A.npp, T: lbl_(A.T), name: A.name, url: A.url, sheet: CFG.SH.DT,
    newN: A.newRows.length, newSum: sum, oldN: A.oldN, oldSum: A.oldSum, nCao: A.nCao || 0, nHigh: A.nHigh || 0,
    lines: A.lines.slice(0, 400), nLines: A.lines.length,
    errors: A.errors.slice(0, 80), nErrors: A.errors.length, warnings: A.warnings.slice(0, 80), nWarnings: A.warnings.length,
    infos: A.infos, note: note || '' };
}


// =====================================================================================
// ĐỌC FILE .XLSX (Excel, Google Sheets, LibreOffice, WPS)
// =====================================================================================
/** Trả về { sheets: [{ name, cells: { A1: giá trị }, maxRow }] } – giá trị đã tính (cached) của ô công thức. */
function readXlsx_(blob) {
  let files;
  try { files = Utilities.unzip(blob); } catch (e) { throw new Error('Không đọc được file. Vui lòng chọn file Excel (.xlsx).'); }
  const map = {};
  files.forEach(function (b) { map[b.getName().replace(/^\//, '')] = b; });
  if (!map['xl/workbook.xml']) throw new Error('Không đọc được file. Vui lòng chọn file Excel (.xlsx), không phải .xls hoặc .csv.');
  const relsName = 'xl/_rels/workbook.xml.rels';
  const sheets = listSheets_(map['xl/workbook.xml'].getDataAsString(), map[relsName] ? map[relsName].getDataAsString() : '');
  const sst = map['xl/sharedStrings.xml'] ? sharedStrings_(map['xl/sharedStrings.xml'].getDataAsString()) : [];
  return {
    sheets: sheets.filter(function (s) { return s.path && map[s.path]; }).map(function (s) {
      const p = parseSheet_(map[s.path].getDataAsString(), sst);
      return { name: s.name, cells: p.cells, maxRow: p.maxRow };
    })
  };
}

function unesc_(s) {
  return String(s).replace(/&#x([0-9a-fA-F]+);/g, function (a, h) { return String.fromCodePoint(parseInt(h, 16)); })
    .replace(/&#(\d+);/g, function (a, n) { return String.fromCodePoint(+n); })
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/_x000[dD]_/g, '\r').replace(/_x000[aA]_/g, '\n');
}

function texts_(xml) {
  let s = '';
  xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').replace(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>|<(?:\w+:)?t(?:\s[^>]*)?\/>/g,
    function (a, t) { s += t || ''; return a; });
  return unesc_(s);
}

function sharedStrings_(xml) {
  const out = [];
  xml.replace(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>|<(?:\w+:)?si\b[^>]*\/>/g, function (a, inner) { out.push(inner ? texts_(inner) : ''); return a; });
  return out;
}

function parseSheet_(xml, sst) {
  const cells = {};
  let maxRow = 0, rowNo = 0;
  xml.replace(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g, function (a, rattr, inner) {
    const rr = attr_(' ' + rattr, 'r');
    rowNo = rr ? +rr : rowNo + 1;
    if (!inner) return a;
    let colNo = 0;
    inner.replace(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, function (b, cattr, body) {
      const ref = attr_(' ' + cattr, 'r');
      if (ref) { const p = splitRef_(ref.replace(/\$/g, '')); colNo = p.c; } else colNo++;
      if (!body) return b;
      const t = attr_(' ' + cattr, 't') || 'n';
      const vm = body.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/);
      let v = null;
      if (t === 'inlineStr') { const im = body.match(/<(?:\w+:)?is>([\s\S]*?)<\/(?:\w+:)?is>/); v = im ? texts_(im[1]) : ''; }
      else if (!vm) return b;
      else if (t === 's') v = sst[+vm[1]] !== undefined ? sst[+vm[1]] : '';
      else if (t === 'str' || t === 'e') v = unesc_(vm[1]);
      else if (t === 'b') v = vm[1] === '1';
      else { const n = Number(vm[1]); v = isNaN(n) ? unesc_(vm[1]) : n; }
      if (v === '' || v === null) return b;
      cells[colName_(colNo) + rowNo] = v;
      if (rowNo > maxRow) maxRow = rowNo;
      return b;
    });
    return a;
  });
  return { cells: cells, maxRow: maxRow };
}
