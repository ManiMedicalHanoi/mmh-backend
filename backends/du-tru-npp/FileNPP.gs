/**
 * MMH – FILE GOOGLE SHEET RIÊNG CHO TỪNG NPP (dùng liên tục, đồng bộ với file gốc)
 * Phiên bản 3.0 · 30/10/2026
 *
 * File gốc giữ nguyên bố cục, nội dung, công thức các sheet; script chỉ thêm:
 *   - sheet "LÊN DỰ TRÙ" (chọn NPP + tháng dự trù: dự kiến đặt hàng, dự trù chưa đặt hàng, đề xuất, cảnh báo);
 *   - sheet "DANH SÁCH FILE NPP" (mỗi NPP 1 file, kết quả đồng bộ gần nhất).
 * File NPP: chép từng sheet của file gốc (không sao chép cả file nặng), chỉ giữ số của NPP đó.
 *   NPP nhập: sheet 1 (dự trù, cột A–G) và sheet 3 (đặt hàng dự kiến, cột A–G). Các sheet khác khoá.
 * Đồng bộ (menu hoặc tự động hằng đêm):
 *   - lấy từ file NPP: dự trù các tháng còn nhận (từ tháng dự trù đang mở) + dự kiến từ tháng hiện tại trở đi;
 *   - đẩy sang file NPP: sheet 1, 2, 3 của NPP theo file gốc (dự trù tháng đã chốt được trả về số cũ), DANH MỤC, tham số.
 *   File NPP có lỗi ⇒ không lấy số, không ghi đè sheet 1 / 3 của NPP; chỉ cập nhật đơn thực tế + danh mục.
 */

const G = {
  SIG: 'MMH_FILE_NPP_GS_V3',
  REG: 'DANH SÁCH FILE NPP',
  META: 'THÔNG TIN FILE NPP',
  PLAN: 'LÊN DỰ TRÙ',
  TT: '2 Đặt hàng thực tế',
  DK: '3 Đặt hàng dự kiến',
  ADMIN: ['DANH SÁCH FILE NPP', 'NHẬT KÝ FILE EXCEL NPP', 'NHẬT KÝ FILE NPP', 'THÔNG TIN FILE NPP'],
  FIRST: ['CÀI ĐẶT', 'DANH MỤC', '2 Đặt hàng thực tế', '3 Đặt hàng dự kiến', '1 Dự trù cố định'],  // chép trước (dữ liệu)
  DATA: ['1 Dự trù cố định', '2 Đặt hàng thực tế', '3 Đặt hàng dự kiến'],
  HAN_DAY: 5,               // dự trù tháng T nhận đến hết ngày 05 của tháng (T − lead + 1)
  DB_NPP: 'C5', DB_MONTH: 'E5',
  NIGHT_FN: 'gNightly', NIGHT_HOUR: 1,
  FOLDER: 'MMH – File NPP (Google Sheet)'
};
const REG_HEAD = ['NPP', 'Tên file', 'Đường dẫn', 'ID file', 'Email chia sẻ', 'Tạo lúc', 'Đồng bộ gần nhất', 'Kết quả đồng bộ'];


// =====================================================================================
// MENU
// =====================================================================================
function menuTaoFileNpp() {
  const html = HtmlService.createHtmlOutputFromFile('TaoFileNPP').setWidth(820).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tạo file Google Sheet cho NPP');
}

function menuDongBo() {
  const html = HtmlService.createHtmlOutputFromFile('DongBo').setWidth(900).setHeight(660);
  SpreadsheetApp.getUi().showModalDialog(html, 'Đồng bộ với file NPP');
}

function menuDanhSach() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setActiveSheet(regSheet_(ss));
}

function menuLenDuTru() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = gEnsurePlan_(ss, true);
  ss.setActiveSheet(sh);
}

function menuTuDong() {
  const ui = SpreadsheetApp.getUi();
  const on = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === G.NIGHT_FN; });
  if (on.length) {
    const r = ui.alert('Đồng bộ tự động', 'Đồng bộ tự động hằng đêm đang BẬT. Tắt đi?', ui.ButtonSet.YES_NO);
    if (r === ui.Button.YES) { on.forEach(function (t) { ScriptApp.deleteTrigger(t); }); ui.alert('Đã tắt đồng bộ tự động.'); }
    return;
  }
  ScriptApp.newTrigger(G.NIGHT_FN).timeBased().everyDays(1).atHour(G.NIGHT_HOUR).create();
  ui.alert('Đồng bộ tự động', 'Đã bật: mỗi đêm (khoảng ' + G.NIGHT_HOUR + '–' + (G.NIGHT_HOUR + 1) + ' giờ) script đồng bộ mọi file NPP trong "' +
    G.REG + '". Kết quả ghi ở cột "Kết quả đồng bộ".', ui.ButtonSet.OK);
}


// =====================================================================================
// TIỆN ÍCH
// =====================================================================================
function regSheet_(ss) {
  let sh = ss.getSheetByName(G.REG);
  if (!sh) {
    sh = ss.insertSheet(G.REG, ss.getSheets().length);
    sh.getRange(1, 1).setValue('DANH SÁCH FILE GOOGLE SHEET CỦA NPP').setFontWeight('bold').setFontSize(14);
    sh.getRange(2, 1).setValue('Script tự ghi khi tạo file và mỗi lần đồng bộ. Mỗi NPP một file, dùng liên tục. Không cần sửa sheet này.')
      .setFontColor('#666666');
    sh.getRange(3, 1, 1, REG_HEAD.length).setValues([REG_HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.setFrozenRows(3);
    [110, 280, 300, 120, 200, 130, 130, 520].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  }
  return sh;
}

function regRows_(ss) {
  const sh = ss.getSheetByName(G.REG);
  if (!sh) return [];
  const n = sh.getLastRow() - 3;
  if (n <= 0) return [];
  return sh.getRange(4, 1, n, REG_HEAD.length).getValues().map(function (r, i) {
    return { row: 4 + i, npp: norm_(r[0]), name: norm_(r[1]), url: norm_(r[2]), id: norm_(r[3]), email: norm_(r[4]), created: r[5], synced: r[6], result: norm_(r[7]) };
  }).filter(function (x) { return x.id && x.npp; });
}

function regFind_(ss, npp) {
  const rows = regRows_(ss).filter(function (x) { return key_(x.npp) === key_(npp); });
  return rows.length ? rows[rows.length - 1] : null;
}

function regSet_(ss, npp, vals) {
  const sh = regSheet_(ss);
  const hit = regFind_(ss, npp);
  if (hit) {
    const cur = sh.getRange(hit.row, 1, 1, REG_HEAD.length).getValues()[0];
    Object.keys(vals).forEach(function (k) { cur[+k] = vals[k]; });
    sh.getRange(hit.row, 1, 1, REG_HEAD.length).setValues([cur]);
  } else {
    const row = REG_HEAD.map(function (_, i) { return vals.hasOwnProperty(i) ? vals[i] : ''; });
    row[0] = npp;
    sh.appendRow(row);
  }
}

/** Tháng dự trù đang nhận: đến hết ngày 05 vẫn nhận tháng của kỳ trước. */
function gFromDT_(S) {
  const day = +Utilities.formatDate(new Date(), tz_(), 'd');
  return addM_(S.cm, S.lead - (day <= G.HAN_DAY ? 1 : 0));
}

function gHan_(T, lead) {
  const m = addM_(T, 1 - lead);
  return String(G.HAN_DAY).padStart(2, '0') + '/' + String(m % 100).padStart(2, '0') + '/' + Math.floor(m / 100);
}

function gLock_(sh, desc, openRanges) {
  const p = sh.protect().setDescription(desc);
  p.addEditor(Session.getEffectiveUser());
  p.removeEditors(p.getEditors());
  if (p.canDomainEdit()) p.setDomainEdit(false);
  if (openRanges && openRanges.length) p.setUnprotectedRanges(openRanges);
  return p;
}


// =====================================================================================
// SHEET "LÊN DỰ TRÙ" (thêm vào file gốc; file NPP chép theo)
// =====================================================================================
function gEnsurePlan_(ss, rebuild) {
  let sh = ss.getSheetByName(G.PLAN);
  if (sh && !rebuild) return sh;
  let keepNpp = '', keepMonth = '';
  if (sh) { keepNpp = sh.getRange('C3').getValue(); keepMonth = sh.getRange('F3').getValue(); ss.deleteSheet(sh); }
  const db = ss.getSheetByName('DASHBOARD');
  sh = ss.insertSheet(G.PLAN, db ? db.getIndex() : 0);
  sh.setHiddenGridlines(true);
  if (sh.getMaxRows() < 3000) sh.insertRowsAfter(sh.getMaxRows(), 3000 - sh.getMaxRows());
  sh.setColumnWidth(1, 18);
  const S = 'SUM!';
  // ô chọn
  sh.getRange('B3').setValue('NHÀ PHÂN PHỐI ▾').setFontWeight('bold').setFontColor('#003047');
  sh.getRange('E3').setValue('THÁNG DỰ TRÙ ▾').setFontWeight('bold').setFontColor('#003047');
  const c3 = sh.getRange('C3'), f3 = sh.getRange('F3');
  c3.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRange("'CÀI ĐẶT'!$A$2:$A$9"), true).setAllowInvalid(false).build());
  f3.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ss.getRange("'CÀI ĐẶT'!$D$2:$D$25"), true).setAllowInvalid(false).build());
  c3.setValue(keepNpp || ss.getRange("'CÀI ĐẶT'!A2").getValue());
  if (keepMonth) f3.setValue(keepMonth);
  [c3, f3].forEach(function (r) { r.setBackground('#F0F7FF').setFontWeight('bold').setFontColor('#3A5CAA').setBorder(true, true, true, true, false, false, '#3A5CAA', null); });
  sh.getRange('G3').setValue('◀ để trống = tháng đang nhận dự trù').setFontColor('#666666').setFontStyle('italic');
  const eff = "EDATE(DATE(INT(" + S + "$B$2/100),MOD(" + S + "$B$2,100),1),'CÀI ĐẶT'!$H$4-IF(DAY(TODAY())<=" + G.HAN_DAY + ",1,0))";
  sh.getRange('J3').setFormula('=IF($F$3<>"",$F$3,YEAR(' + eff + ')*100+MONTH(' + eff + '))');
  sh.getRange('J3').setFontColor('#FFFFFF');
  sh.getRange('B1').setFormula('="LÊN DỰ TRÙ THÁNG "&TEXT(MOD($J$3,100),"00")&"/"&INT($J$3/100)&"  ·  "&$C$3')
    .setFontSize(18).setFontWeight('bold').setFontColor('#003047');
  sh.getRange('B2').setFormula('="Hạn gửi dự trù tháng này: ' + String(G.HAN_DAY).padStart(2, '0') + '/"&TEXT(EDATE(DATE(INT($J$3/100),MOD($J$3,100),1),1-\'CÀI ĐẶT\'!$H$4),"MM/yyyy")&"   ·   Dự trù là số cố định, NPP lấy hết hàng; đặt hàng dự kiến cập nhật được bất cứ lúc nào."')
    .setFontColor('#3A5CAA');
  const steps = [
    'Bước 1 · Cập nhật sheet "3 Đặt hàng dự kiến" (nhu cầu thực tế) cho các tháng đến tháng dự trù.',
    'Bước 2 · Xem bảng dưới: dự kiến đặt hàng tháng dự trù trừ phần dự trù chưa đặt hàng đến hết tháng trước = dự trù đề xuất.',
    'Bước 3 · Nhập (chép) số dự trù vào sheet "1 Dự trù cố định" đúng tháng dự trù. Cột "Cần điều chỉnh" về 0 là khớp đề xuất.'
  ];
  steps.forEach(function (t, i) { sh.getRange(5 + i, 2).setValue(t).setFontColor('#1A1A1A'); });
  const head = ['Mã hàng', 'Tên hàng', 'Nhóm hàng', 'Dự kiến đặt hàng tháng dự trù', 'Dự trù chưa đặt hàng đến hết tháng trước',
    'DỰ TRÙ ĐỀ XUẤT', 'Dự trù đã nhập', 'Cần điều chỉnh (+ tăng / − giảm)', 'Σ Dự trù trong kỳ', 'Σ Đặt hàng TT/DK trong kỳ',
    'Dự trù chưa đặt hàng lũy kế', 'Cảnh báo'];
  sh.getRange(10, 2, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047')
    .setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center');
  sh.getRange(10, 7).setBackground('#FFE100');
  sh.setRowHeight(10, 52);
  sh.getRange('B9').setValue('Tổng').setFontWeight('bold');
  ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach(function (c) { sh.getRange(c + '9').setFormula('=SUM(' + c + '11:' + c + ')').setFontWeight('bold'); });
  const cols = ['E', 'F', 'G', 'J', 'V', 'X', 'H', 'Y', 'P', 'Q', 'N', 'T'].map(function (c) { return S + c + '5:' + c + '20000'; });
  sh.getRange('B11').setFormula('=IFERROR(SORT(FILTER(HSTACK(' + cols.join(',') + '),' + S + 'C5:C20000=$C$3,' + S + 'D5:D20000=$J$3),3,TRUE,1,TRUE),' +
    '"Chưa có số liệu tháng này: nhập đặt hàng dự kiến (sheet 3) cho tháng dự trù.")');
  sh.getRange('E9:L3000').setNumberFormat('#,##0;-#,##0;"-"');
  sh.getRange('B11:B3000').setNumberFormat('@');
  [90, 260, 130, 120, 140, 120, 110, 130, 110, 120, 130, 180].forEach(function (w, i) { sh.setColumnWidth(i + 2, w); });
  sh.getRange('G9:G3000').setFontWeight('bold').setFontColor('#003047');
  sh.setFrozenRows(10);
  sh.setFrozenColumns(3);
  const rng = sh.getRange('M11:M3000');
  const rule = function (txt, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextContains(txt).setBackground(bg).setFontColor(fg).setBold(true).setRanges([rng]).build();
  };
  const hi = SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setFontColor('#B45309').setBold(true).setRanges([sh.getRange('I11:I3000')]).build();
  sh.setConditionalFormatRules([rule('CAO', '#FDECEA', '#C62828'), rule('THEO DÕI', '#FFF4E5', '#B45309'), rule('ỔN', '#E8F5E9', '#2E7D32'),
    rule('CHƯA DỰ TRÙ', '#F0F7FF', '#3A5CAA'), hi]);
  return sh;
}


// =====================================================================================
// 1. TẠO FILE CHO NPP
// =====================================================================================
function apiGInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const S = settings_(ss);
    const fromDT = gFromDT_(S);
    const regs = regRows_(ss);
    const auto = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === G.NIGHT_FN; });
    return { ok: true, cm: lbl_(S.cm), fromDT: lbl_(fromDT), han: gHan_(fromDT, S.lead), fromDK: lbl_(S.cm), auto: auto,
      npps: S.npps.map(function (n) {
        const r = regs.filter(function (x) { return key_(x.npp) === key_(n); }).pop();
        return { name: n, url: r ? r.url : '', id: r ? r.id : '', email: r ? r.email : '', created: r ? fmtTime_(r.created) : '',
          synced: r ? fmtTime_(r.synced) : '', result: r ? r.result : '' };
      }) };
  } catch (e) {
    return { ok: false, error: msg_(e) };
  }
}

function apiGCreate(npp, email, replace) {
  const lock = LockService.getDocumentLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, error: BUSY }; }
  const t0 = Date.now();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const S = settings_(ss);
    npp = norm_(npp);
    if (S.npps.map(key_).indexOf(key_(npp)) < 0) throw new Error('NPP "' + npp + '" không có trong sheet CÀI ĐẶT.');
    email = norm_(email);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email "' + email + '" không hợp lệ.');
    const old = regFind_(ss, npp);
    if (old && !replace) throw new Error('NPP ' + npp + ' đã có file. Muốn tạo lại (file cũ vẫn giữ trong Drive), tích ô "Tạo lại".');
    G.DATA.concat(['DANH MỤC', 'CÀI ĐẶT', 'SUM', 'DASHBOARD']).forEach(function (n) { sheet_(ss, n); });
    gEnsurePlan_(ss, false);

    const name = 'MMH_DuTru_DatHang_' + npp.replace(/[^A-Za-z0-9À-ỹ]+/g, '-').replace(/^-+|-+$/g, '');
    const cp = SpreadsheetApp.create(name);
    try { cp.setSpreadsheetLocale(ss.getSpreadsheetLocale()); cp.setSpreadsheetTimeZone(ss.getSpreadsheetTimeZone()); } catch (e) {}
    const blank = cp.getSheets()[0];
    const src = ss.getSheets().filter(function (s) { return G.ADMIN.indexOf(s.getName()) < 0; });
    const order = src.map(function (s) { return s.getName(); });
    const first = src.filter(function (s) { return G.FIRST.indexOf(s.getName()) >= 0; })
      .sort(function (a, b) { return G.FIRST.indexOf(a.getName()) - G.FIRST.indexOf(b.getName()); });
    const rest = src.filter(function (s) { return G.FIRST.indexOf(s.getName()) < 0; });
    const counts = {};
    first.concat(rest).forEach(function (s) {
      const c = s.copyTo(cp).setName(s.getName());
      if (G.DATA.indexOf(s.getName()) >= 0) {           // chỉ giữ số của NPP này
        const rows = readBlock_(c);
        const keep = rows.filter(function (r) { return key_(r[0]) === key_(npp); });
        writeBlock_(c, keep, rows.length);
        counts[s.getName()] = keep.length;
      }
      if (s.getName() === 'CÀI ĐẶT') { const l = c.getRange(CFG.CD_NPP); l.clearContent(); l.getCell(1, 1).setValue(npp); }
      if (s.isSheetHidden()) c.hideSheet();
    });
    cp.deleteSheet(blank);
    // sheet chép trước SUM: ghi lại công thức (lấy từ file gốc) để nhận đúng tên sheet
    first.forEach(function (s) {
      const c = cp.getSheetByName(s.getName());
      const nr = Math.min(6, c.getMaxRows(), s.getMaxRows()), nc = Math.min(c.getMaxColumns(), s.getMaxColumns());
      const fs = s.getRange(1, 1, nr, nc).getFormulas();
      fs.forEach(function (row, i) { row.forEach(function (f, j) { if (f) c.getRange(i + 1, j + 1).setFormula(f); }); });
    });
    order.forEach(function (n, i) { const c = cp.getSheetByName(n); if (c) { cp.setActiveSheet(c); cp.moveActiveSheet(i + 1); } });
    cp.getSheetByName('DASHBOARD').getRange(G.DB_NPP).setValue(npp);
    cp.getSheetByName(G.PLAN).getRange('C3').setValue(npp);
    gWriteMeta_(cp, ss, npp);
    gProtect_(cp);
    cp.setActiveSheet(cp.getSheetByName(G.PLAN));

    const file = DriveApp.getFileById(cp.getId());
    try { file.moveTo(gFolder_(ss)); } catch (e) {}
    if (email) file.addEditor(email);
    const vals = { 0: npp, 1: name, 2: cp.getUrl(), 3: cp.getId(), 4: email, 5: new Date(), 7: 'Tạo file: dự trù ' + counts['1 Dự trù cố định'] +
      ' dòng, thực tế ' + counts[G.TT] + ' dòng, dự kiến ' + counts[G.DK] + ' dòng.' };
    if (old && replace) {
      regSheet_(ss).appendRow(REG_HEAD.map(function (_, i) { return vals.hasOwnProperty(i) ? vals[i] : ''; }));
    } else regSet_(ss, npp, vals);
    return { ok: true, npp: npp, name: name, url: cp.getUrl(), email: email, sec: Math.round((Date.now() - t0) / 1000),
      nDT: counts['1 Dự trù cố định'], nTT: counts[G.TT], nDK: counts[G.DK] };
  } catch (e) {
    return { ok: false, npp: npp, error: msg_(e) };
  } finally {
    lock.releaseLock();
  }
}

function gFolder_(ss) {
  try {
    const parents = DriveApp.getFileById(ss.getId()).getParents();
    return sub_(parents.hasNext() ? parents.next() : DriveApp.getRootFolder(), G.FOLDER);
  } catch (e) {
    return sub_(DriveApp.getRootFolder(), G.FOLDER);
  }
}

function gWriteMeta_(cp, master, npp) {
  const sh = cp.insertSheet(G.META, cp.getSheets().length);
  sh.getRange(1, 1, 5, 2).setNumberFormat('@').setValues([
    ['Ký hiệu', G.SIG], ['Nhà phân phối', npp], ['ID file gốc', master.getId()], ['Tạo lúc', nowText_()],
    ['Ghi chú', 'Sheet do MMH tạo để nhận diện file. Vui lòng không sửa hoặc xoá.']
  ]);
  sh.hideSheet();
  gLock_(sh, 'Thông tin file – không sửa', null);
}

/** NPP chỉ nhập cột A–G sheet 1 (dự trù) và sheet 3 (dự kiến); chọn tháng ở DASHBOARD và LÊN DỰ TRÙ. */
function gProtect_(cp) {
  cp.getSheets().forEach(function (sh) {
    const n = sh.getName();
    if (n === G.META) return;
    if (G.DATA.indexOf(n) >= 0 && n !== G.TT) {
      gLock_(sh, n + ' – chỉ nhập cột A–G', [sh.getRange(2, 1, sh.getMaxRows() - 1, CFG.NCOL)]);
    } else if (n === 'DASHBOARD') {
      gLock_(sh, 'Dashboard – chỉ chọn tháng', [sh.getRange(G.DB_MONTH)]);
    } else if (n === G.PLAN) {
      gLock_(sh, 'Lên dự trù – chỉ chọn tháng', [sh.getRange('F3')]);
    } else {
      gLock_(sh, n + ' – MMH cập nhật', null);
    }
  });
}


// =====================================================================================
// 2. ĐỒNG BỘ
// =====================================================================================
function apiGPreview(npp) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return gPublic_(gAnalyze_(ss, npp));
  } catch (e) {
    return { ok: false, npp: npp, fatal: msg_(e) };
  }
}

function apiGSync(npp) {
  const lock = LockService.getDocumentLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, npp: npp, fatal: BUSY }; }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return gPublic_(gCommit_(ss, gAnalyze_(ss, npp)));
  } catch (e) {
    return { ok: false, npp: npp, fatal: msg_(e) };
  } finally {
    lock.releaseLock();
  }
}

/** Trigger hằng đêm: đồng bộ mọi file NPP. */
function gNightly() {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(120000)) return;
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_ID') || SpreadsheetApp.getActiveSpreadsheet().getId());
    regRows_(ss).forEach(function (r) {
      try { gCommit_(ss, gAnalyze_(ss, r.npp)); }
      catch (e) { regSet_(ss, r.npp, { 6: new Date(), 7: 'Tự động – lỗi: ' + msg_(e) }); }
    });
  } finally {
    lock.releaseLock();
  }
}

/** Đọc file NPP, kiểm tra, so với file gốc. Không ghi gì. */
function gAnalyze_(ss, npp) {
  const S = settings_(ss);
  try { PropertiesService.getScriptProperties().setProperty('MASTER_ID', ss.getId()); } catch (e) {}
  const reg = regFind_(ss, npp);
  if (!reg) throw new Error('NPP ' + npp + ' chưa có file. Dùng menu "Tạo file Google Sheet cho NPP" trước.');
  let cp;
  try { cp = SpreadsheetApp.openById(reg.id); } catch (e) { throw new Error('Không mở được file của ' + npp + ' (có thể đã bị xoá hoặc mất quyền).'); }
  const meta = cp.getSheetByName(G.META);
  if (!meta) throw new Error('File của ' + npp + ' thiếu sheet nhận diện "' + G.META + '".');
  const kv = {};
  meta.getRange(1, 1, 5, 2).getValues().forEach(function (r) { kv[norm_(r[0])] = norm_(r[1]); });
  if (kv['Ký hiệu'] !== G.SIG || key_(kv['Nhà phân phối']) !== key_(npp)) throw new Error('File của ' + npp + ' không đúng mẫu hoặc khác NPP.');
  const A = { npp: reg.npp, url: reg.url, cp: cp, S: S, errors: [], warnings: [], infos: [], fromDT: gFromDT_(S), fromDK: S.cm };
  A.dt = gPart_(ss, cp, sheet_(ss, CFG.SH.DT).getName(), A.fromDT, true, A);
  A.dk = gPart_(ss, cp, G.DK, A.fromDK, false, A);
  return A;
}

function gPart_(ss, cp, sheetName, from, isDT, A) {
  const shF = cp.getSheetByName(sheetName);
  const P = { sheet: sheetName, from: from, newRows: [], oldN: 0, oldSum: 0, newSum: 0, months: {}, missing: !shF };
  if (!shF) { A.errors.push('File NPP thiếu sheet "' + sheetName + '".'); return P; }
  const lead = A.S.lead;
  const lockedF = {}, lockedM = {};
  const seen = {};
  const where = sheetName + ', dòng ';
  readBlock_(shF).forEach(function (r, i) {
    const row = i + 2;
    if (r.every(function (v) { return v === '' || v === null; })) return;
    if (key_(r[0]) && key_(r[0]) !== key_(A.npp)) { A.errors.push(where + row + ': nhà phân phối "' + norm_(r[0]) + '" khác ' + A.npp + '.'); return; }
    const m = toYm_(r[1]);
    if (!m) { A.errors.push(where + row + ': tháng "' + r[1] + '" không đúng dạng yyyymm (ví dụ 202702).'); return; }
    const code = codeStr_(r[3]);
    if (!code) { A.errors.push(where + row + ': thiếu mã hàng.'); return; }
    const q = num_(r[5]);
    if (q === null) { A.errors.push(where + row + ': thiếu số lượng.'); return; }
    if (typeof q !== 'number' || isNaN(q)) { A.errors.push(where + row + ': số lượng "' + r[5] + '" không phải là số.'); return; }
    if (q < 0) { A.errors.push(where + row + ': số lượng âm.'); return; }
    if (m < from) { (lockedF[m] = lockedF[m] || []).push(key_(code) + '|' + q); return; }
    let third = r[2];
    if (isDT) { const g = toYm_(r[2]); third = g || addM_(m, -lead); } else third = r[2] === null ? '' : r[2];
    const k = m + '|' + key_(code);
    if (seen[k]) A.warnings.push(where + row + ': mã ' + code + ' tháng ' + lbl_(m) + ' bị nhập 2 lần (dòng ' + seen[k] + '); khi tính sẽ cộng dồn.');
    else seen[k] = row;
    P.newRows.push([A.npp, m, third, code, norm_(r[4]), q, r[6] === null ? '' : r[6]]);
    P.newSum += q;
    const mo = P.months[m] = P.months[m] || { m: lbl_(m), oldN: 0, oldSum: 0, newN: 0, newSum: 0 };
    mo.newN++; mo.newSum += q;
  });
  readBlock_(sheet_(ss, sheetName)).forEach(function (r) {
    if (key_(r[0]) !== key_(A.npp)) return;
    const m = toYm_(r[1]);
    if (!m) return;
    const q = num_(r[5]) || 0;
    if (m < from) { (lockedM[m] = lockedM[m] || []).push(key_(codeStr_(r[3])) + '|' + q); return; }
    P.oldN++; P.oldSum += q;
    const mo = P.months[m] = P.months[m] || { m: lbl_(m), oldN: 0, oldSum: 0, newN: 0, newSum: 0 };
    mo.oldN++; mo.oldSum += q;
  });
  const changed = [];
  Object.keys(lockedF).concat(Object.keys(lockedM)).forEach(function (m) {
    if (changed.indexOf(m) >= 0) return;
    if ((lockedF[m] || []).slice().sort().join(';') !== (lockedM[m] || []).slice().sort().join(';')) changed.push(m);
  });
  if (changed.length) {
    A.infos.push(sheetName + ': file NPP có thay đổi ở tháng ' + changed.sort().map(function (m) { return lbl_(+m); }).join(', ') +
      ' (trước ' + lbl_(from) + ', đã chốt). Không nhận; file NPP sẽ được trả về số trong file gốc.');
  }
  P.monthList = Object.keys(P.months).sort().map(function (m) { return P.months[m]; });
  return P;
}

/** Ghi vào file gốc (nếu file NPP không lỗi) rồi đẩy số mới nhất sang file NPP. */
function gCommit_(ss, A) {
  const npp = A.npp, cp = A.cp, ok = !A.errors.length;
  if (ok) {
    [A.dt, A.dk].forEach(function (P) {
      const sh = sheet_(ss, P.sheet);
      const rows = readBlock_(sh);
      const keep = rows.filter(function (r) { return !(key_(r[0]) === key_(npp) && (toYm_(r[1]) || 0) >= P.from); });
      writeBlock_(sh, keep.concat(P.newRows), rows.length);
    });
  }
  // đẩy sang file NPP: sheet 2 luôn; sheet 1 và 3 chỉ khi đã nhận (để không xoá phần NPP đang nhập lỗi)
  const push = ok ? G.DATA : [G.TT];
  push.forEach(function (n) {
    const mine = readBlock_(sheet_(ss, n)).filter(function (r) { return key_(r[0]) === key_(npp); });
    const sh = cp.getSheetByName(n);
    if (!sh) return;
    writeBlock_(sh, mine, readBlock_(sh).length);
  });
  // danh mục + tham số
  const dmM = sheet_(ss, CFG.SH.DM), dmN = cp.getSheetByName(CFG.SH.DM);
  if (dmN) {
    const nc = Math.min(dmM.getLastColumn(), dmN.getMaxColumns());
    const a = dmM.getLastRow() > 1 ? dmM.getRange(2, 1, dmM.getLastRow() - 1, nc).getValues() : [];
    const nOld = Math.max(0, dmN.getLastRow() - 1);
    const b = nOld ? dmN.getRange(2, 1, nOld, nc).getValues() : [];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      if (a.length + 1 > dmN.getMaxRows()) dmN.insertRowsAfter(dmN.getMaxRows(), a.length + 1 - dmN.getMaxRows());
      if (a.length) { dmN.getRange(2, 1, a.length, 1).setNumberFormat('@'); dmN.getRange(2, 1, a.length, nc).setValues(a); }
      if (nOld > a.length) dmN.getRange(2 + a.length, 1, nOld - a.length, nc).clearContent();
    }
  }
  const cdM = sheet_(ss, CFG.SH.CD), cdN = cp.getSheetByName(CFG.SH.CD);
  if (cdN) {
    cdN.getRange('D2:D25').setValues(cdM.getRange('D2:D25').getValues());
    cdN.getRange('G2:H6').setValues(cdM.getRange('G2:H6').getValues());
  }
  const sumN = cp.getSheetByName('SUM'), sumM = ss.getSheetByName('SUM');
  if (sumN && sumM) { const d2 = sumM.getRange('D2').getValue(); if (d2 !== '' && typeof d2 === 'number') sumN.getRange('D2').setValue(d2); }
  SpreadsheetApp.flush();
  const res = ok
    ? 'Đã đồng bộ: dự trù ' + A.dt.newRows.length + ' dòng (từ ' + lbl_(A.dt.from) + '), dự kiến ' + A.dk.newRows.length + ' dòng (từ ' + lbl_(A.dk.from) +
      '); đã cập nhật đơn thực tế, danh mục cho NPP.' + (A.warnings.length ? ' Lưu ý: ' + A.warnings.length + ' mục.' : '')
    : 'CHƯA NHẬN số của NPP vì file có ' + A.errors.length + ' lỗi (vd. ' + A.errors[0] + '). Đã cập nhật đơn thực tế, danh mục cho NPP.';
  regSet_(ss, npp, { 6: new Date(), 7: res });
  A.committed = ok; A.note = res;
  return A;
}

function gPublic_(A) {
  const part = function (P) {
    return { sheet: P.sheet, from: lbl_(P.from), newN: P.newRows.length, newSum: P.newSum, oldN: P.oldN, oldSum: P.oldSum, months: P.monthList || [] };
  };
  return { ok: !A.errors.length, npp: A.npp, url: A.url, dt: part(A.dt), dk: part(A.dk), han: gHan_(A.fromDT, A.S.lead),
    errors: A.errors.slice(0, 80), nErrors: A.errors.length, warnings: A.warnings.slice(0, 80), nWarnings: A.warnings.length,
    infos: A.infos, committed: !!A.committed, synced: A.note !== undefined, note: A.note || '' };
}
