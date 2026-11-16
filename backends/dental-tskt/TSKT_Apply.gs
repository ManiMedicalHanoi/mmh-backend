/**
 * @OnlyCurrentDoc
 * Rà soát Thông số kỹ thuật (TSKT) — sheet "Dental Product" của file "Cấu hình hàng nha khoa Mani".
 * v1.0 (16/11/2026): ghi lại cột F theo MANI General Dental Catalog 2026 + IFU, cập nhật cột G (Nguồn),
 * thêm cột O–Q "Tham chiếu" (ảnh trích catalogue / IFU, khung đỏ = chỗ ghi thông số), R "Kết quả rà soát", S "Đã sửa gì".
 * Chạy: menu MMH ▸ Áp dụng rà soát TSKT (lần đầu Google hỏi cấp quyền). Chạy lại nhiều lần được (ảnh cũ do menu này chèn tự xoá trước).
 * Dữ liệu: TSKT_Data.gs, ảnh: các file img_s<dòng>_<n>.html (base64 JPEG) — sinh từ kho mmh-backend, không sửa tay.
 */
var TSKT = {
  SHEET: 'Dental Product',
  TAG: 'TSKT-ref',
  COL_IMG: 15,            // O, P, Q
  COL_RES: 18,            // R
  COL_NOTE: 19,           // S
  IMG_W: 430, IMG_H: 560, // px tối đa mỗi ảnh
  LABEL: {
    sua:   ['Đã sửa theo tài liệu', '#FCE4C4'],
    dung:  ['Khớp – chỉ chuẩn hoá câu chữ', '#D9F2DC'],
    thieu: ['Chưa đối chiếu được – thiếu tài liệu', '#E6EAEF']
  }
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MMH')
    .addItem('Áp dụng rà soát TSKT (cột F + ảnh tham chiếu)', 'apDungRaSoatTSKT')
    .addItem('Xoá ảnh tham chiếu TSKT', 'xoaAnhThamChieuTSKT')
    .addToUi();
}

function tsktSheet_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TSKT.SHEET);
  if (!sh) throw new Error('Không thấy sheet "' + TSKT.SHEET + '"');
  return sh;
}

function xoaAnhThamChieuTSKT() {
  var n = 0;
  tsktSheet_().getImages().forEach(function (im) {
    var t = '';
    try { t = im.getAltTextTitle() || ''; } catch (e) {}
    if (t.indexOf(TSKT.TAG) === 0) { im.remove(); n++; }
  });
  return n;
}

function norm_(s) { return String(s || '').replace(/\s+/g, ' ').trim().toUpperCase(); }

function apDungRaSoatTSKT() {
  var sh = tsktSheet_();
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var removed = xoaAnhThamChieuTSKT();
    // Tiêu đề cột mới
    var hdr = sh.getRange('F2');
    var bg = hdr.getBackground(), font = hdr.getFontFamily();
    var heads = [[15, 'Tham chiếu (ảnh trích catalogue / IFU – khung đỏ = chỗ ghi thông số)'], [18, 'Kết quả rà soát (16/11/2026)'], [19, 'Đã sửa gì / ghi chú']];
    try { sh.getRange('O2:Q2').breakApart(); } catch (e) {}
    heads.forEach(function (h) {
      sh.getRange(2, h[0]).setValue(h[1]).setBackground(bg).setFontFamily(font).setFontWeight('bold')
        .setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
    });
    sh.getRange('O2:Q2').merge();
    sh.getRange('O1').setValue('Rà soát 16/11/2026 theo MANI General Dental Catalog 2026 (D06031) + IFU. Bản cũ: Tệp ▸ Nhật ký phiên bản.')
      .setFontStyle('italic').setFontColor('#3A5CAA').setFontSize(10);
    sh.setColumnWidths(15, 3, TSKT.IMG_W + 10);
    sh.setColumnWidth(18, 150);
    sh.setColumnWidth(19, 480);

    var done = 0, skipped = [], imgs = 0;
    var eVals = sh.getRange(1, 5, sh.getMaxRows(), 1).getValues();
    Object.keys(TSKT_ROWS).forEach(function (k) {
      var r = Number(k), d = TSKT_ROWS[k];
      // An toàn: chỉ ghi khi đúng dòng (Chủng loại cột E khớp dữ liệu lúc rà soát)
      if (norm_(eVals[r - 1][0]) !== norm_(d.e)) { skipped.push('dòng ' + r + ' (' + d.e + ' ≠ ' + eVals[r - 1][0] + ')'); return; }
      if (d.f) sh.getRange(r, 6).setValue(d.f).setWrap(true).setVerticalAlignment('top');
      if (d.g) sh.getRange(r, 7).setValue(d.g).setWrap(true).setVerticalAlignment('top');
      var lab = TSKT.LABEL[d.st] || TSKT.LABEL.thieu;
      sh.getRange(r, TSKT.COL_RES).setValue(lab[0]).setBackground(lab[1]).setFontWeight('bold').setWrap(true).setVerticalAlignment('top');
      sh.getRange(r, TSKT.COL_NOTE).setValue(d.note || '').setWrap(true).setVerticalAlignment('top');
      var hMax = 0;
      (d.img || []).slice(0, 3).forEach(function (m, i) {
        var b64 = HtmlService.createHtmlOutputFromFile(m[0]).getContent().replace(/\s+/g, '');
        var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', m[0] + '.jpg');
        var sc = Math.min(TSKT.IMG_W / m[1], TSKT.IMG_H / m[2]);
        var w = Math.round(m[1] * sc), h = Math.round(m[2] * sc);
        var im = sh.insertImage(blob, TSKT.COL_IMG + i, r, 4, 4);
        im.setWidth(w).setHeight(h);
        try { im.setAltTextTitle(TSKT.TAG + ' ' + m[0]).setAltTextDescription('Ảnh trích catalogue / IFU – dòng ' + r); } catch (e) {}
        hMax = Math.max(hMax, h); imgs++;
      });
      var lines = String(d.f || sh.getRange(r, 6).getValue() || '').split('\n').length;
      sh.setRowHeight(r, Math.max(hMax + 10, lines * 19 + 10, 60));
      done++;
    });
    SpreadsheetApp.flush();
    var msg = 'Đã áp dụng ' + done + ' dòng, chèn ' + imgs + ' ảnh' + (removed ? ' (xoá ' + removed + ' ảnh cũ)' : '') + '.' +
      (skipped.length ? '\nBỏ qua vì dòng đã đổi vị trí: ' + skipped.join('; ') : '');
    PropertiesService.getDocumentProperties().setProperty('TSKT_LAST', new Date().toISOString() + ' · ' + msg);
    try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Rà soát TSKT', 10); } catch (e) {}
    return msg;
  } finally {
    lock.releaseLock();
  }
}
