/**
 * MMH – FILE NHẬP SỐ LIỆU CHO NHÀ PHÂN PHỐI (NPP)
 * Phiên bản 1.0 · 29/10/2026
 *
 * File gốc giữ nguyên bố cục, nội dung và công thức. Script chỉ:
 *   - tạo bản sao file gốc cho từng NPP, trong đó chỉ còn số liệu của NPP đó;
 *   - khi nhập lại: ghi vào cột A–G của sheet "1 Dự trù cố định" và "3 Đặt hàng dự kiến";
 *   - ghi nhật ký vào sheet "NHẬT KÝ FILE NPP" (tạo thêm ở cuối file gốc).
 *
 * Menu "MMH · File NPP":
 *   1. Tạo file cho NPP…
 *   2. Nhập số liệu từ file NPP…
 *   3. Mở nhật ký file NPP
 *
 * Cài đặt: Tiện ích mở rộng → Apps Script → dán file này vào Code.gs, thêm 2 file HTML
 * "TaoFile" và "NhapFile" → Lưu → tải lại trang Google Sheets.
 */

const CFG = {
  VERSION: '1.0 · 29/10/2026',
  SIG: 'MMH_FILE_NPP_V1',
  MENU: 'MMH · File NPP',
  SH: {
    DT: '1 Dự trù cố định', TT: '2 Đặt hàng thực tế', DK: '3 Đặt hàng dự kiến', DM: 'DANH MỤC', CD: 'CÀI ĐẶT',
    SUM: 'SUM', DB: 'DASHBOARD', HD: 'HƯỚNG DẪN', LOG: 'NHẬT KÝ FILE NPP', META: 'THÔNG TIN FILE NPP'
  },
  NCOL: 7,                    // dữ liệu nhập ở cột A–G
  CD_NPP: 'A2:A9',            // danh sách NPP
  CD_LEAD: 'H4',              // lead time dự trù (tháng)
  SUM_MONTH: 'B2',            // tháng hiện tại (công thức TODAY trong file gốc)
  DB_NPP: 'C5',               // ô chọn NPP trên DASHBOARD
  DB_MONTH: 'E5',             // ô chọn tháng trên DASHBOARD
  FOLDER: 'MMH – File NPP'
};

const LOG_HEAD = ['Thời điểm tạo', 'Người tạo', 'NPP', 'Tên file', 'Đường dẫn', 'ID file', 'Chia sẻ cho', 'Tháng hiện tại',
  'Lần nhập gần nhất', 'Kết quả nhập'];
const BUSY = 'Một người dùng khác đang chạy chức năng này. Vui lòng thử lại sau ít phút.';


// =====================================================================================
// MENU
// =====================================================================================
function onOpen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (isNppFile_(ss)) return;                         // bản sao gửi NPP: không hiện menu quản trị
  SpreadsheetApp.getUi().createMenu(CFG.MENU)
    .addItem('1. Tạo file cho NPP…', 'menuTaoFile')
    .addItem('2. Nhập số liệu từ file NPP…', 'menuNhapFile')
    .addSeparator()
    .addItem('Mở nhật ký file NPP', 'menuNhatKy')
    .addItem('Thông tin phiên bản', 'menuPhienBan')
    .addToUi();
}

function menuTaoFile() {
  assertMaster_(SpreadsheetApp.getActiveSpreadsheet());
  const html = HtmlService.createHtmlOutputFromFile('TaoFile').setWidth(760).setHeight(560);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tạo file cho nhà phân phối');
}

function menuNhapFile() {
  assertMaster_(SpreadsheetApp.getActiveSpreadsheet());
  const html = HtmlService.createHtmlOutputFromFile('NhapFile').setWidth(860).setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, 'Nhập số liệu từ file NPP');
}

function menuNhatKy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  assertMaster_(ss);
  ss.setActiveSheet(logSheet_(ss));
}

function menuPhienBan() {
  SpreadsheetApp.getUi().alert('Thông tin phiên bản', 'MMH – File nhập số liệu cho NPP\nPhiên bản ' + CFG.VERSION,
    SpreadsheetApp.getUi().ButtonSet.OK);
}


// =====================================================================================
// TIỆN ÍCH
// =====================================================================================
function isNppFile_(ss) { return !!ss.getSheetByName(CFG.SH.META); }

function assertMaster_(ss) {
  if (isNppFile_(ss)) throw new Error('Đây là file đã gửi NPP. Chức năng này chỉ dùng trên file gốc của MMH.');
}

function msg_(e) { return String(e && e.message ? e.message : e).replace(/^Exception:\s*/, ''); }

function sheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Không tìm thấy sheet "' + name + '". Vui lòng không đổi tên sheet.');
  return sh;
}

function norm_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); }
function key_(v) { return norm_(v).toUpperCase(); }

function codeStr_(v) {
  if (typeof v === 'number') return String(Math.round(v) === v ? v : v);
  return norm_(v);
}

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

function num_(v) {
  if (typeof v === 'number') return v;
  const s = String(v === null || v === undefined ? '' : v).trim().replace(/\s/g, '');
  if (s === '') return null;
  if (/^-?\d+([.,]\d+)?$/.test(s)) return Number(s.replace(',', '.'));
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  return NaN;
}

function nowText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
}

function fileIdFrom_(s) {
  s = String(s || '').trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  throw new Error('Đường dẫn file không hợp lệ.');
}

/** Tháng hiện tại, lead time và danh sách NPP của file gốc. */
function settings_(ss) {
  const cd = sheet_(ss, CFG.SH.CD);
  const npps = cd.getRange(CFG.CD_NPP).getValues().map(function (r) { return norm_(r[0]); }).filter(String);
  if (!npps.length) throw new Error('Sheet CÀI ĐẶT chưa có tên NPP (cột A, dòng 2–9).');
  const lead = Math.round(num_(cd.getRange(CFG.CD_LEAD).getValue()) || 3);
  let cm = toYm_(sheet_(ss, CFG.SH.SUM).getRange(CFG.SUM_MONTH).getValue());
  if (!cm) { const d = new Date(); cm = d.getFullYear() * 100 + d.getMonth() + 1; }
  return { npps: npps, lead: lead, cm: cm, fromDK: cm, fromDT: addM_(cm, lead) };
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
 * Thiếu dòng thì chèn thêm trước dòng cuối để các vùng công thức (vd A2:A8732) tự giãn theo.
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

function catalog_(ss) {
  const sh = sheet_(ss, CFG.SH.DM);
  const n = sh.getLastRow() - 1;
  const map = {};
  if (n > 0) sh.getRange(2, 1, n, 2).getValues().forEach(function (r) { const c = codeStr_(r[0]); if (c) map[key_(c)] = norm_(r[1]); });
  return map;
}

function logSheet_(ss) {
  let sh = ss.getSheetByName(CFG.SH.LOG);
  if (!sh) {
    sh = ss.insertSheet(CFG.SH.LOG, ss.getSheets().length);
    sh.getRange(1, 1).setValue('NHẬT KÝ FILE NPP').setFontWeight('bold').setFontSize(14);
    sh.getRange(2, 1).setValue('Script tự ghi khi tạo file cho NPP và khi nhập số liệu từ file NPP. Không cần sửa sheet này.')
      .setFontColor('#666666');
    sh.getRange(3, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.setFrozenRows(3);
    [140, 160, 110, 260, 300, 120, 200, 90, 130, 380].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}

function logRows_(ss) {
  const sh = logSheet_(ss);
  const n = sh.getLastRow() - 3;
  if (n <= 0) return [];
  return sh.getRange(4, 1, n, LOG_HEAD.length).getValues().map(function (r, i) {
    return { row: 4 + i, time: r[0], by: r[1], npp: norm_(r[2]), name: norm_(r[3]), url: norm_(r[4]), id: norm_(r[5]),
      share: norm_(r[6]), cm: r[7], lastImport: r[8], result: norm_(r[9]) };
  }).filter(function (x) { return x.id; });
}


// =====================================================================================
// 1. TẠO FILE CHO NPP
// =====================================================================================
function apiCreateInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertMaster_(ss);
    const S = settings_(ss);
    const logs = logRows_(ss);
    return {
      ok: true, cm: lbl_(S.cm), fromDK: lbl_(S.fromDK), fromDT: lbl_(S.fromDT),
      npps: S.npps.map(function (n) {
        const mine = logs.filter(function (x) { return key_(x.npp) === key_(n); });
        const last = mine[mine.length - 1];
        return { name: n, count: mine.length, lastUrl: last ? last.url : '', lastTime: last ? String(last.time) : '',
          lastShare: last ? last.share : '' };
      })
    };
  } catch (e) {
    return { ok: false, error: msg_(e) };
  }
}

/** Tạo 1 file cho 1 NPP: bản sao file gốc, chỉ giữ số liệu của NPP đó. */
function apiCreateFile(npp, email) {
  const lock = LockService.getDocumentLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, error: BUSY }; }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertMaster_(ss);
    const S = settings_(ss);
    npp = norm_(npp);
    if (S.npps.map(key_).indexOf(key_(npp)) < 0) throw new Error('NPP "' + npp + '" không có trong sheet CÀI ĐẶT.');
    email = norm_(email);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email "' + email + '" không hợp lệ.');
    [CFG.SH.DT, CFG.SH.TT, CFG.SH.DK, CFG.SH.DM, CFG.SH.CD, CFG.SH.SUM, CFG.SH.DB].forEach(function (n) { sheet_(ss, n); });

    // thư mục lưu: cùng thư mục với file gốc (nếu có quyền), nếu không thì ở Drive của người dùng
    const folder = outFolder_(ss, S.cm);
    const name = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd') +
      '_MMH_DuTru_DatHang_' + npp.replace(/[^A-Za-z0-9À-ỹ]+/g, '-').replace(/^-+|-+$/g, '');
    const file = DriveApp.getFileById(ss.getId()).makeCopy(name, folder);
    const cp = SpreadsheetApp.openById(file.getId());

    // chỉ giữ số liệu của NPP này ở 3 sheet dữ liệu
    const counts = {};
    [CFG.SH.DT, CFG.SH.TT, CFG.SH.DK].forEach(function (n) {
      const sh = sheet_(cp, n);
      const rows = readBlock_(sh);
      const keep = rows.filter(function (r) { return key_(r[0]) === key_(npp); });
      writeBlock_(sh, keep, rows.length);
      counts[n] = keep.length;
    });
    // danh sách NPP chỉ còn NPP này; DASHBOARD chọn sẵn NPP này
    const cd = sheet_(cp, CFG.SH.CD);
    const lst = cd.getRange(CFG.CD_NPP);
    lst.clearContent();
    lst.getCell(1, 1).setValue(npp);
    sheet_(cp, CFG.SH.DB).getRange(CFG.DB_NPP).setValue(npp);

    const oldLog = cp.getSheetByName(CFG.SH.LOG);       // nhật ký có đường dẫn file của NPP khác
    if (oldLog) cp.deleteSheet(oldLog);
    writeMeta_(cp, ss, npp, S);
    protectNppFile_(cp);
    if (email) file.addEditor(email);

    logSheet_(ss).appendRow([new Date(), Session.getActiveUser().getEmail() || '', npp, name, file.getUrl(), file.getId(),
      email, lbl_(S.cm), '', '']);
    return { ok: true, npp: npp, name: name, url: file.getUrl(), folder: folder.getName(), folderUrl: folder.getUrl(), email: email,
      nDT: counts[CFG.SH.DT], nTT: counts[CFG.SH.TT], nDK: counts[CFG.SH.DK] };
  } catch (e) {
    return { ok: false, npp: npp, error: msg_(e) };
  } finally {
    lock.releaseLock();
  }
}

function outFolder_(ss, cm) {
  let base;
  try {
    const parents = DriveApp.getFileById(ss.getId()).getParents();
    base = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
    const probe = sub_(base, CFG.FOLDER);
    return sub_(probe, 'Tháng ' + Math.floor(cm / 100) + '-' + String(cm % 100).padStart(2, '0'));
  } catch (e) {
    base = DriveApp.getRootFolder();
    return sub_(sub_(base, CFG.FOLDER), 'Tháng ' + Math.floor(cm / 100) + '-' + String(cm % 100).padStart(2, '0'));
  }
}

function sub_(folder, name) {
  const it = folder.getFoldersByName(name);
  return it.hasNext() ? it.next() : folder.createFolder(name);
}

function writeMeta_(cp, master, npp, S) {
  const sh = cp.insertSheet(CFG.SH.META, cp.getSheets().length);
  sh.getRange(1, 1, 8, 2).setNumberFormat('@').setValues([
    ['Ký hiệu', CFG.SIG],
    ['Nhà phân phối', npp],
    ['Tạo lúc', nowText_()],
    ['ID file gốc', master.getId()],
    ['Tháng hiện tại khi tạo', lbl_(S.cm)],
    ['Đặt hàng dự kiến được nhập từ tháng', lbl_(S.fromDK)],
    ['Dự trù cố định được nhập từ tháng', lbl_(S.fromDT)],
    ['Ghi chú', 'Sheet do MMH tạo để nhận diện file. Vui lòng không sửa hoặc xoá.']
  ]);
  sh.hideSheet();
  lockSheet_(sh, 'Thông tin file – không sửa', null);
}

/** Khoá các sheet NPP không cần nhập. Sheet 3 để mở; sheet 1 chỉ mở cột A–G. */
function protectNppFile_(cp) {
  lockSheet_(sheet_(cp, CFG.SH.TT), 'Đặt hàng thực tế – MMH cập nhật', null);
  lockSheet_(sheet_(cp, CFG.SH.DM), 'Danh mục – MMH cập nhật', null);
  lockSheet_(sheet_(cp, CFG.SH.CD), 'Cài đặt – MMH cập nhật', null);
  const hd = cp.getSheetByName(CFG.SH.HD);
  if (hd) lockSheet_(hd, 'Hướng dẫn', null);
  const db = sheet_(cp, CFG.SH.DB);
  lockSheet_(db, 'Dashboard – chỉ chọn tháng', [db.getRange(CFG.DB_MONTH)]);
  const dt = sheet_(cp, CFG.SH.DT);
  lockSheet_(dt, 'Dự trù cố định – chỉ nhập cột A–G', [dt.getRange(2, 1, dt.getMaxRows() - 1, CFG.NCOL)]);
  sheet_(cp, CFG.SH.SUM).protect().setDescription('SUM – tự động tính').setWarningOnly(true);
}

function lockSheet_(sh, desc, openRanges) {
  const p = sh.protect().setDescription(desc);
  p.addEditor(Session.getEffectiveUser());          // người tạo file luôn sửa được
  p.removeEditors(p.getEditors());
  if (p.canDomainEdit()) p.setDomainEdit(false);
  if (openRanges) p.setUnprotectedRanges(openRanges);
  return p;
}


// =====================================================================================
// 2. NHẬP SỐ LIỆU TỪ FILE NPP
// =====================================================================================
function apiImportInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertMaster_(ss);
    const S = settings_(ss);
    const logs = logRows_(ss).reverse().map(function (x) {
      return { npp: x.npp, name: x.name, url: x.url, id: x.id, time: fmtTime_(x.time), share: x.share, cm: String(x.cm || ''),
        lastImport: fmtTime_(x.lastImport), result: x.result };
    });
    return { ok: true, cm: lbl_(S.cm), fromDK: lbl_(S.fromDK), fromDT: lbl_(S.fromDT), files: logs };
  } catch (e) {
    return { ok: false, error: msg_(e) };
  }
}

function fmtTime_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  }
  return v ? String(v) : '';
}

function apiPreviewImport(fileRef) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertMaster_(ss);
    return publicResult_(analyze_(ss, fileIdFrom_(fileRef)));
  } catch (e) {
    return { ok: false, fatal: msg_(e) };
  }
}

function apiCommitImport(fileRef) {
  const lock = LockService.getDocumentLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, fatal: BUSY }; }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    assertMaster_(ss);
    const id = fileIdFrom_(fileRef);
    const A = analyze_(ss, id);
    if (A.errors.length) return publicResult_(A, 'File còn lỗi, chưa nhập. Vui lòng đề nghị NPP sửa rồi kiểm tra lại.');
    [A.dt, A.dk].forEach(function (P) {
      const sh = sheet_(ss, P.sheet);
      const rows = readBlock_(sh);                    // đọc lại ngay trước khi ghi
      const keep = rows.filter(function (r) { return !(key_(r[0]) === key_(A.npp) && (toYm_(r[1]) || 0) >= P.from); });
      writeBlock_(sh, keep.concat(P.newRows), rows.length);
    });
    SpreadsheetApp.flush();
    const result = 'Đã nhập: dự trù cố định ' + A.dt.newRows.length + ' dòng (từ ' + lbl_(A.dt.from) + '), đặt hàng dự kiến ' +
      A.dk.newRows.length + ' dòng (từ ' + lbl_(A.dk.from) + ').';
    markLog_(ss, id, A.npp, result);
    const out = publicResult_(A, result);
    out.committed = true;
    return out;
  } catch (e) {
    return { ok: false, fatal: msg_(e) };
  } finally {
    lock.releaseLock();
  }
}

function markLog_(ss, id, npp, result) {
  const sh = logSheet_(ss);
  const hit = logRows_(ss).filter(function (x) { return x.id === id; });
  if (hit.length) {
    sh.getRange(hit[hit.length - 1].row, 9, 1, 2).setValues([[new Date(), result]]);
  } else {
    sh.appendRow([new Date(), Session.getActiveUser().getEmail() || '', npp, '(file không có trong nhật ký)',
      'https://docs.google.com/spreadsheets/d/' + id + '/edit', id, '', '', new Date(), result]);
  }
}

/** Đọc file NPP, kiểm tra và so sánh với file gốc. Không ghi gì. */
function analyze_(ss, fileId) {
  const S = settings_(ss);
  let cp;
  try { cp = SpreadsheetApp.openById(fileId); } catch (e) {
    throw new Error('Không mở được file. Vui lòng kiểm tra đường dẫn và quyền truy cập của tài khoản đang dùng.');
  }
  if (cp.getId() === ss.getId()) throw new Error('Đây là file gốc, không phải file NPP.');
  const meta = readMeta_(cp);
  const A = { npp: meta.npp, name: cp.getName(), url: cp.getUrl(), errors: [], warnings: [], infos: [], cm: S.cm };
  if (meta.master && meta.master !== ss.getId()) A.warnings.push('File này được tạo từ một file gốc khác (ID ' + meta.master + ').');
  if (S.npps.map(key_).indexOf(key_(A.npp)) < 0) A.errors.push('NPP "' + A.npp + '" không có trong sheet CÀI ĐẶT của file gốc.');
  const cat = catalog_(ss);
  A.dt = part_(ss, cp, CFG.SH.DT, S.fromDT, true, A, S, cat);
  A.dk = part_(ss, cp, CFG.SH.DK, S.fromDK, false, A, S, cat);
  if (!A.dt.newRows.length && !A.dk.newRows.length) {
    A.warnings.push('File không có dòng nào từ tháng được nhập. Nếu nhập, số liệu cũ của NPP từ các tháng đó sẽ bị xoá.');
  }
  return A;
}

function readMeta_(cp) {
  const sh = cp.getSheetByName(CFG.SH.META);
  if (!sh) throw new Error('File không phải file NPP do script tạo (thiếu sheet "' + CFG.SH.META + '").');
  const kv = {};
  sh.getRange(1, 1, 10, 2).getValues().forEach(function (r) { kv[norm_(r[0])] = norm_(r[1]); });
  if (kv['Ký hiệu'] !== CFG.SIG) throw new Error('File không đúng mẫu file NPP hiện hành (ký hiệu ' + CFG.SIG + ').');
  if (!kv['Nhà phân phối']) throw new Error('File thiếu tên nhà phân phối ở sheet "' + CFG.SH.META + '".');
  return { npp: kv['Nhà phân phối'], master: kv['ID file gốc'] };
}

/**
 * Kiểm tra 1 sheet (1 hoặc 3) của file NPP.
 * Nhập các dòng có tháng >= from; dòng của tháng trước đó (đã qua / đã cố định) không nhập, chỉ báo nếu có thay đổi.
 */
function part_(ss, cp, sheetName, from, isDT, A, S, cat) {
  const shF = cp.getSheetByName(sheetName);
  if (!shF) { A.errors.push('File NPP thiếu sheet "' + sheetName + '".'); return emptyPart_(sheetName, from); }
  const fileRows = readBlock_(shF);
  const masterRows = readBlock_(sheet_(ss, sheetName));
  const P = { sheet: sheetName, from: from, newRows: [], oldN: 0, oldSum: 0, newSum: 0, months: {} };
  const seen = {};
  const lockedFile = {}, lockedMaster = {};
  const label = 'Sheet ' + sheetName + ', dòng ';
  fileRows.forEach(function (r, i) {
    const row = i + 2;
    if (r.every(function (v) { return v === '' || v === null; })) return;
    const npp = norm_(r[0]);
    if (!npp) { A.errors.push(label + row + ': thiếu tên nhà phân phối.'); return; }
    if (key_(npp) !== key_(A.npp)) { A.errors.push(label + row + ': nhà phân phối "' + npp + '" khác với NPP của file (' + A.npp + ').'); return; }
    const m = toYm_(r[1]);
    if (!m) { A.errors.push(label + row + ': tháng "' + r[1] + '" không đúng dạng yyyymm (ví dụ 202702).'); return; }
    const code = codeStr_(r[3]);
    if (!code) { A.errors.push(label + row + ': thiếu mã hàng.'); return; }
    const q = num_(r[5]);
    if (q === null) { A.errors.push(label + row + ': thiếu số lượng.'); return; }
    if (isNaN(q)) { A.errors.push(label + row + ': số lượng "' + r[5] + '" không phải là số.'); return; }
    if (q < 0) { A.errors.push(label + row + ': số lượng âm (' + q + ').'); return; }
    if (m < from) { (lockedFile[m] = lockedFile[m] || []).push(code + '|' + q); return; }
    let third = r[2];
    if (isDT) {
      const g = toYm_(r[2]);
      if (r[2] !== '' && r[2] !== null && !g) { A.errors.push(label + row + ': tháng gửi "' + r[2] + '" không đúng dạng yyyymm.'); return; }
      third = g || addM_(m, -S.lead);
    } else {
      third = norm_(r[2]);
    }
    const k = m + '|' + key_(code);
    if (seen[k]) A.warnings.push(label + row + ': mã ' + code + ' tháng ' + lbl_(m) + ' bị nhập 2 lần (dòng ' + seen[k] +
      ' và ' + row + '); khi tính sẽ được cộng dồn.');
    else seen[k] = row;
    if (!cat[key_(code)]) A.warnings.push(label + row + ': mã ' + code + ' chưa có trong DANH MỤC (vẫn nhập, nhưng không có tên, nhóm, đơn giá).');
    if (q % 1 !== 0) A.warnings.push(label + row + ': số lượng ' + q + ' không phải số nguyên.');
    const name = norm_(r[4]) || cat[key_(code)] || '';
    P.newRows.push([A.npp, m, third, code, name, q, r[6] === null ? '' : r[6]]);
    P.newSum += q;
    const mo = P.months[m] = P.months[m] || { m: lbl_(m), oldN: 0, oldSum: 0, newN: 0, newSum: 0 };
    mo.newN++; mo.newSum += q;
  });
  masterRows.forEach(function (r) {
    if (key_(r[0]) !== key_(A.npp)) return;
    const m = toYm_(r[1]);
    if (!m) return;
    const q = num_(r[5]) || 0;
    if (m < from) { (lockedMaster[m] = lockedMaster[m] || []).push(codeStr_(r[3]) + '|' + q); return; }
    P.oldN++; P.oldSum += q;
    const mo = P.months[m] = P.months[m] || { m: lbl_(m), oldN: 0, oldSum: 0, newN: 0, newSum: 0 };
    mo.oldN++; mo.oldSum += q;
  });
  // thay đổi ở các tháng không được nhập
  const changed = [];
  Object.keys(lockedFile).concat(Object.keys(lockedMaster)).forEach(function (m) {
    if (changed.indexOf(m) >= 0) return;
    const a = (lockedFile[m] || []).slice().sort().join(';'), b = (lockedMaster[m] || []).slice().sort().join(';');
    if (a !== b) changed.push(m);
  });
  if (changed.length) {
    A.infos.push('Sheet ' + sheetName + ': có thay đổi ở tháng ' + changed.sort().map(function (m) { return lbl_(+m); }).join(', ') +
      ' (trước ' + lbl_(from) + '). Các tháng này không được nhập; nếu cần điều chỉnh, MMH sửa trực tiếp trên file gốc.');
  }
  P.monthList = Object.keys(P.months).sort().map(function (m) { return P.months[m]; });
  return P;
}

function emptyPart_(sheetName, from) {
  return { sheet: sheetName, from: from, newRows: [], oldN: 0, oldSum: 0, newSum: 0, months: {}, monthList: [] };
}

function publicResult_(A, note) {
  const part = function (P) {
    return { sheet: P.sheet, from: lbl_(P.from), newN: P.newRows.length, newSum: P.newSum, oldN: P.oldN, oldSum: P.oldSum,
      months: P.monthList };
  };
  return { ok: !A.errors.length, npp: A.npp, name: A.name, url: A.url, cm: lbl_(A.cm), dt: part(A.dt), dk: part(A.dk),
    errors: A.errors.slice(0, 80), nErrors: A.errors.length, warnings: A.warnings.slice(0, 80), nWarnings: A.warnings.length,
    infos: A.infos, note: note || '' };
}