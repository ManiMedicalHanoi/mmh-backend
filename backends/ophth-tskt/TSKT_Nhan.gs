/**
 * @OnlyCurrentDoc
 * TSKT dao & chỉ khâu nhãn khoa — tab gid 646481032 của file "Cấu hình dao chỉ nhãn khoa Mani".
 * v1.0 (17/11/2026): ghi cột K (tiếng Việt) + L (tiếng Anh), N "Tài liệu dẫn chứng", ảnh khoanh đỏ từ cột O.
 * v1.1 (17/11/2026, người dùng yêu cầu): thông số mới (tiếng Việt, đánh số) ghi THẲNG vào cột "Đặc tính kỹ thuật" (J),
 *   thay thông số cũ; thêm dòng cuối "Tiêu chuẩn …" lấy theo thông số cũ của từng mã (dòng "-Tiêu chuẩn ISO 13485, FDA").
 *   Bỏ 2 cột "Mani sửa tiếng việt" / "Mani sửa tiếng anh" (xoá cột nếu còn). Cột "Tài liệu dẫn chứng" + ảnh đứng sau "Giá Kế Hoạch".
 *   Cột dò theo TÊN tiêu đề (dòng 3–4) ⇒ chạy lại nhiều lần được; ảnh cũ do menu này chèn tự xoá trước.
 * 1470: cột G quy cách = 1 Hộp/12 sợi.
 * Chạy: menu MMH ▸ Áp dụng TSKT dao & chỉ khâu (lần đầu Google hỏi cấp quyền).
 * Dữ liệu: TSKT_NhanData.gs (trường k = thông số tiếng Việt, n = tài liệu dẫn chứng, img = ảnh), ảnh: img_<mã>_<n>.html — sinh tự động, không sửa tay.
 */
var TSKTN = {
  GID: 646481032,
  SHEET: 'Copy of Sheet1',
  TAG: 'TSKT-nhan',
  COL_G: 7,
  HEAD_ROW: 3,
  IMG_W: 420, IMG_H: 560,        // px tối đa mỗi ảnh hiển thị
  // Tiêu chuẩn theo thông số cũ — chỉ dùng khi cột J không còn dòng "Tiêu chuẩn …"
  STD: { '1417': 'Tiêu chuẩn ISO 13485', '1470': 'Tiêu chuẩn ISO 13485' },
  STD_DEF: 'Tiêu chuẩn ISO 13485, FDA'
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MMH')
    .addItem('Áp dụng TSKT dao & chỉ khâu (cột Đặc tính kỹ thuật + ảnh dẫn chứng)', 'apDungTSKTNhanKhoa')
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
function tsktnLow_(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

/** Cột theo tên tiêu đề ở dòng 3–4 (0 = không có). */
function tsktnCols_(sh) {
  var w = sh.getLastColumn();
  var h = sh.getRange(TSKTN.HEAD_ROW, 1, 2, w).getDisplayValues();
  function find(prefix) {
    for (var c = 0; c < w; c++) for (var r = 0; r < 2; r++) if (tsktnLow_(h[r][c]).indexOf(prefix) === 0) return c + 1;
    return 0;
  }
  return {
    spec: find('đặc tính kỹ thuật'),
    vi: find('mani sửa tiếng việt'),
    en: find('mani sửa tiếng anh'),
    price: find('giá kế hoạch'),
    doc: find('tài liệu dẫn chứng'),
    img: find('ảnh dẫn chứng'),
    w: w
  };
}

/** Tìm dòng theo mã trong cột C (Tên Thương Mại); ưu tiên dòng đã ghi trong dữ liệu. */
function tsktnRow_(cVals, want, code) {
  var c = tsktnNorm_(code);
  if (want <= cVals.length && tsktnNorm_(cVals[want - 1][0]).indexOf(c) >= 0) return want;
  for (var i = 0; i < cVals.length; i++) if (tsktnNorm_(cVals[i][0]).indexOf(c) >= 0) return i + 1;
  return 0;
}

/** Dòng tiêu chuẩn theo thông số cũ (cột J): "-Tiêu chuẩn ISO 13485, FDA" / "13. Tiêu chuẩn …". */
function tsktnStd_(oldSpec, code) {
  var m = String(oldSpec || '').normalize('NFC').match(/ti[êe]u chu[ẩa]n[^\n]*/i);
  if (m) return m[0].replace(/[\s.;,]+$/, '');
  return TSKTN.STD[code] || TSKTN.STD_DEF;
}

function apDungTSKTNhanKhoa() {
  var sh = tsktnSheet_();
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var removed = xoaAnhTSKTNhanKhoa();
    var col = tsktnCols_(sh);
    if (!col.spec) throw new Error('Không thấy cột "Đặc tính kỹ thuật" ở dòng ' + TSKTN.HEAD_ROW + '.');
    var lastRow = sh.getLastRow();
    var cVals = sh.getRange(1, 3, lastRow, 1).getValues();
    var oldSpec = sh.getRange(1, col.spec, lastRow, 1).getValues();   // đọc TRƯỚC khi ghi đè (lấy dòng Tiêu chuẩn)

    // bỏ 2 cột "Mani sửa tiếng việt / tiếng anh" (xoá cột bên phải trước)
    var drop = [col.vi, col.en].filter(function (c) { return c > 0; }).sort(function (a, b) { return b - a; });
    var hdrImg0 = col.img;
    if (hdrImg0) { try { sh.getRange(TSKTN.HEAD_ROW, hdrImg0, 1, Math.max(1, col.w - hdrImg0 + 1)).breakApart(); } catch (e) {} }
    drop.forEach(function (c) { sh.deleteColumn(c); });
    if (drop.length) col = tsktnCols_(sh);

    var maxImg = 0;
    Object.keys(TSKT_NHAN_ROWS).forEach(function (k) { maxImg = Math.max(maxImg, (TSKT_NHAN_ROWS[k].img || []).length); });
    var docCol = col.doc || (col.price ? col.price + 1 : col.spec + 2);
    var imgCol = col.img || docCol + 1;

    // tiêu đề cột dẫn chứng + nhóm ảnh
    var hdr = sh.getRange(TSKTN.HEAD_ROW, col.spec);
    var bg = hdr.getBackground(), font = hdr.getFontFamily();
    try { sh.getRange(TSKTN.HEAD_ROW, imgCol, 1, Math.max(maxImg, 1)).breakApart(); } catch (e) {}
    sh.getRange(TSKTN.HEAD_ROW, docCol).setValue('Tài liệu dẫn chứng (ảnh · loại tài liệu · tên · trang → số thông số)');
    sh.getRange(TSKTN.HEAD_ROW, imgCol).setValue('Ảnh dẫn chứng (khung đỏ có số = thông số cùng số ở cột Đặc tính kỹ thuật)');
    sh.getRange(TSKTN.HEAD_ROW, docCol, 1, 1 + maxImg).setBackground(bg).setFontFamily(font).setFontWeight('bold')
      .setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
    if (maxImg > 1) sh.getRange(TSKTN.HEAD_ROW, imgCol, 1, maxImg).merge();
    sh.setColumnWidth(col.spec, 460);
    sh.setColumnWidth(docCol, 360);
    sh.setColumnWidths(imgCol, maxImg, TSKTN.IMG_W + 10);

    var done = 0, imgs = 0, skipped = [];
    Object.keys(TSKT_NHAN_ROWS).forEach(function (key) {
      var d = TSKT_NHAN_ROWS[key];
      var r = tsktnRow_(cVals, Number(key), d.code);
      if (!r) { skipped.push(d.code); return; }
      var lines = String(d.k).split('\n');
      var spec = d.k + '\n' + (lines.length + 1) + '. ' + tsktnStd_(oldSpec[r - 1][0], d.code);
      sh.getRange(r, col.spec).setValue(spec).setWrap(true).setVerticalAlignment('top');
      sh.getRange(r, docCol).setValue(d.n).setWrap(true).setVerticalAlignment('top');
      if (d.g) sh.getRange(r, TSKTN.COL_G).setValue(d.g);
      var hMax = 0;
      (d.img || []).forEach(function (m, i) {
        var b64 = HtmlService.createHtmlOutputFromFile(m[0]).getContent().replace(/\s+/g, '');
        var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', m[0] + '.jpg');
        var sc = Math.min(TSKTN.IMG_W / m[1], TSKTN.IMG_H / m[2]);
        var w = Math.round(m[1] * sc), h = Math.round(m[2] * sc);
        var im = sh.insertImage(blob, imgCol + i, r, 4, 4);
        im.setWidth(w).setHeight(h);
        try { im.setAltTextTitle(TSKTN.TAG + ' ' + m[0]).setAltTextDescription('Ảnh dẫn chứng ' + (i + 1) + ' – ' + d.code); } catch (e) {}
        hMax = Math.max(hMax, h); imgs++;
      });
      var nl = Math.max(lines.length + 1 + Math.floor(spec.length / 70), String(d.n).split('\n').length * 2);
      sh.setRowHeight(r, Math.max(hMax + 10, nl * 21 + 10, 60));
      done++;
    });
    SpreadsheetApp.flush();
    var msg = 'Đã ghi ' + done + ' sản phẩm vào cột Đặc tính kỹ thuật, chèn ' + imgs + ' ảnh' +
      (removed ? ' (xoá ' + removed + ' ảnh cũ)' : '') + (drop.length ? ', bỏ ' + drop.length + ' cột Mani sửa tiếng Việt / tiếng Anh' : '') + '.' +
      (skipped.length ? '\nKhông tìm thấy dòng của: ' + skipped.join(', ') : '');
    PropertiesService.getDocumentProperties().setProperty('TSKTN_LAST', new Date().toISOString() + ' · ' + msg);
    try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'TSKT dao & chỉ khâu', 10); } catch (e) {}
    return msg;
  } finally {
    lock.releaseLock();
  }
}
