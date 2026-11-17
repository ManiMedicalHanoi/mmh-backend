/**
 * @OnlyCurrentDoc
 * TSKT dao & chỉ khâu nhãn khoa — tab "Copy of Sheet1" (gid 646481032) của file "Cấu hình dao chỉ nhãn khoa Mani 20240730".
 * v1.0 (17/11/2026): ghi cột K (Mani sửa tiếng Việt) + L (tiếng Anh) theo IFU · catalogue · technical sheet MANI,
 * đánh số từng thông số; cột N "Tài liệu dẫn chứng"; từ cột O: ảnh trang tài liệu khoanh đỏ, số trùng với số thông số.
 * 1470: cột G quy cách = 1 Hộp/12 sợi.
 * Chạy: menu MMH ▸ Áp dụng TSKT dao & chỉ khâu (lần đầu Google hỏi cấp quyền). Chạy lại nhiều lần được (ảnh cũ do menu này chèn tự xoá trước).
 * Dữ liệu: TSKT_NhanData.gs, ảnh: img_<mã>_<n>.html (base64 JPEG) — sinh từ kho mmh-backend, không sửa tay.
 */
var TSKTN = {
  GID: 646481032,
  SHEET: 'Copy of Sheet1',
  TAG: 'TSKT-nhan',
  COL_G: 7, COL_K: 11, COL_L: 12, COL_DOC: 14, COL_IMG: 15,
  HEAD_ROW: 3,
  IMG_W: 420, IMG_H: 560        // px tối đa mỗi ảnh hiển thị
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MMH')
    .addItem('Áp dụng TSKT dao & chỉ khâu (cột K, L + ảnh dẫn chứng)', 'apDungTSKTNhanKhoa')
    .addItem('Xoá ảnh dẫn chứng TSKT', 'xoaAnhTSKTNhanKhoa')
    .addToUi();
}

function tsktnSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheets().filter(function (s) { return s.getSheetId() === TSKTN.GID; })[0] || ss.getSheetByName(TSKTN.SHEET);
  if (!sh) throw new Error('Không thấy tab "' + TSKTN.SHEET + '" (gid ' + TSKTN.GID + ')');
  return sh;
}

function xoaAnhTSKTNhanKhoa() {
  var n = 0;
  tsktnSheet_().getImages().forEach(function (im) {
    var t = '';
    try { t = im.getAltTextTitle() || ''; } catch (e) {}
    if (t.indexOf(TSKTN.TAG) === 0) { im.remove(); n++; }
  });
  return n;
}

function tsktnNorm_(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }

/** Tìm dòng theo mã trong cột C (Tên Thương Mại); ưu tiên dòng đã ghi trong dữ liệu. */
function tsktnRow_(cVals, want, code) {
  var c = tsktnNorm_(code);
  if (want <= cVals.length && tsktnNorm_(cVals[want - 1][0]).indexOf(c) >= 0) return want;
  for (var i = 0; i < cVals.length; i++) if (tsktnNorm_(cVals[i][0]).indexOf(c) >= 0) return i + 1;
  return 0;
}

function apDungTSKTNhanKhoa() {
  var sh = tsktnSheet_();
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var removed = xoaAnhTSKTNhanKhoa();
    var maxImg = 0;
    Object.keys(TSKT_NHAN_ROWS).forEach(function (k) { maxImg = Math.max(maxImg, (TSKT_NHAN_ROWS[k].img || []).length); });
    // tiêu đề cột N + nhóm ảnh
    var hdr = sh.getRange(TSKTN.HEAD_ROW, TSKTN.COL_K);
    var bg = hdr.getBackground(), font = hdr.getFontFamily();
    try { sh.getRange(TSKTN.HEAD_ROW, TSKTN.COL_IMG, 1, Math.max(maxImg, 1)).breakApart(); } catch (e) {}
    sh.getRange(TSKTN.HEAD_ROW, TSKTN.COL_DOC).setValue('Tài liệu dẫn chứng (ảnh · loại tài liệu · tên · trang → số thông số)');
    sh.getRange(TSKTN.HEAD_ROW, TSKTN.COL_IMG).setValue('Ảnh dẫn chứng (khung đỏ có số = thông số cùng số ở cột K, L)');
    sh.getRange(TSKTN.HEAD_ROW, TSKTN.COL_DOC, 1, 1 + maxImg).setBackground(bg).setFontFamily(font).setFontWeight('bold')
      .setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
    if (maxImg > 1) sh.getRange(TSKTN.HEAD_ROW, TSKTN.COL_IMG, 1, maxImg).merge();
    sh.setColumnWidth(TSKTN.COL_DOC, 360);
    sh.setColumnWidths(TSKTN.COL_IMG, maxImg, TSKTN.IMG_W + 10);
    sh.setColumnWidths(TSKTN.COL_K, 2, 430);

    var done = 0, imgs = 0, skipped = [];
    var cVals = sh.getRange(1, 3, sh.getMaxRows(), 1).getValues();
    Object.keys(TSKT_NHAN_ROWS).forEach(function (key) {
      var d = TSKT_NHAN_ROWS[key];
      var r = tsktnRow_(cVals, Number(key), d.code);
      if (!r) { skipped.push(d.code); return; }
      sh.getRange(r, TSKTN.COL_K).setValue(d.k).setWrap(true).setVerticalAlignment('top');
      sh.getRange(r, TSKTN.COL_L).setValue(d.l).setWrap(true).setVerticalAlignment('top');
      sh.getRange(r, TSKTN.COL_DOC).setValue(d.n).setWrap(true).setVerticalAlignment('top');
      if (d.g) sh.getRange(r, TSKTN.COL_G).setValue(d.g);
      var hMax = 0;
      (d.img || []).forEach(function (m, i) {
        var b64 = HtmlService.createHtmlOutputFromFile(m[0]).getContent().replace(/\s+/g, '');
        var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', m[0] + '.jpg');
        var sc = Math.min(TSKTN.IMG_W / m[1], TSKTN.IMG_H / m[2]);
        var w = Math.round(m[1] * sc), h = Math.round(m[2] * sc);
        var im = sh.insertImage(blob, TSKTN.COL_IMG + i, r, 4, 4);
        im.setWidth(w).setHeight(h);
        try { im.setAltTextTitle(TSKTN.TAG + ' ' + m[0]).setAltTextDescription('Ảnh dẫn chứng ' + (i + 1) + ' – ' + d.code); } catch (e) {}
        hMax = Math.max(hMax, h); imgs++;
      });
      var lines = Math.max(String(d.k).split('\n').length, String(d.n).split('\n').length * 2);
      sh.setRowHeight(r, Math.max(hMax + 10, lines * 21 + 10, 60));
      done++;
    });
    SpreadsheetApp.flush();
    var msg = 'Đã ghi ' + done + ' sản phẩm, chèn ' + imgs + ' ảnh' + (removed ? ' (xoá ' + removed + ' ảnh cũ)' : '') + '.' +
      (skipped.length ? '\nKhông tìm thấy dòng của: ' + skipped.join(', ') : '');
    PropertiesService.getDocumentProperties().setProperty('TSKTN_LAST', new Date().toISOString() + ' · ' + msg);
    try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'TSKT dao & chỉ khâu', 10); } catch (e) {}
    return msg;
  } finally {
    lock.releaseLock();
  }
}
