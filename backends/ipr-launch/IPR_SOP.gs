/* ══════════════════════════════════════════════════════════════════════════════════════════
 * IPR_SOP.gs — Dựng lại file "2025 Launching IPR Dia-Burs" theo MMH SOP ra mắt sản phẩm mới
 *   4 giai đoạn: GĐ1 Đánh giá khả thi · GĐ2 Lập kế hoạch launch · GĐ3 Triển khai launch · GĐ4 Đo lường & tối ưu
 *
 * - Tạo 7 tab mới (00…06). Tab cũ KHÔNG bị xoá: chỉ ẩn (menu MMH ▸ Hiện các tab cũ để xem lại).
 * - Lần đầu mở file sau khi cập nhật code: tự dựng (onOpen). Sau đó chỉ dựng lại khi bấm menu (có hỏi xác nhận,
 *   vì dựng lại sẽ ghi đè 7 tab mới — mọi chỉnh sửa trong 7 tab đó sẽ mất).
 * - Nguồn dữ liệu: các tab cũ của file này + tài liệu IPR trên Drive (thư mục "2025 Launching IPR Dia-Burs",
 *   "202507 Market Research - IPR final Report / Dự án IPR", form & kết quả khảo sát). Mục nào chưa có số liệu ghi
 *   "Chưa ghi nhận" — không tự điền.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

var IPR_BUILD = 'v1 · 17/11/2026';
var IPR_META = 'mmh_ipr_sop_build';
var T = {
  home: '00_Tổng quan', plan: '01_Tiến độ', feas: '02_Khả thi', mkt: '03_Kế hoạch',
  smp: '04_Mẫu & phản hồi', eval: '05_Đánh giá', docs: '06_Tài liệu'
};
var IPR_TABS = [T.home, T.plan, T.feas, T.mkt, T.smp, T.eval, T.docs];
var COL = { navy: '#003047', blue: '#3A5CAA', light: '#CFE2F3', pale: '#F0F7FF', cream: '#FFF8E1',
  yellow: '#FFE100', ink: '#1A1A1A', muted: '#666666', line: '#D9D9D9', white: '#FFFFFF', tab: '#1155CC' };
var FONT = 'Arial';
var ST = { done: 'Hoàn thành', doing: 'Đang làm', todo: 'Chưa làm', none: 'Chưa ghi nhận', cancel: 'Huỷ' };
var PH = {
  p1: 'GĐ1 · Đánh giá khả thi', p2: 'GĐ2 · Lập kế hoạch launch',
  p3: 'GĐ3 · Triển khai launch', p4: 'GĐ4 · Đo lường & tối ưu'
};

/* ── Liên kết Drive ─────────────────────────────────────────────────────────────────────── */
function fFile_(id) { return 'https://drive.google.com/file/d/' + id + '/view'; }
function fDir_(id) { return 'https://drive.google.com/drive/folders/' + id; }
var L = {
  dirLaunch: fDir_('1DqQxn_4qPkhOyutfnS2pqmXxd87IhHsx'),
  dirMkt: fDir_('14KtQ2THtDba5z5CDlIvd3CcK8RF6bWou'),
  dirTrain: fDir_('1JdcGV8NRWw1UxPgv5BkDa0lSIrPgLzKs'),
  dirResearch: fDir_('1DQ31H6f32RtgY0NA0a9Ugirv_Uy71kKY'),
  dirProject: fDir_('1BMtT3givsT7UuGRVqee9_gEAAjCmKEDk'),
  dirFlyer: fDir_('1uhHzcyUFybfBgCb0onCiZ72mKrEMDvAX'),
  meet0805: 'https://docs.google.com/document/d/1ZgrnhkulSoh0k22shAaD6giCw8dfaVs5lOG-9H1O-FU/edit',
  overview: fFile_('1ie7k09xDd78GBnIO8HDI1fjliPFdfoEh'),
  infoSum: fFile_('1zhtlADRYl6ycCkf6KXSb5eXhzaWnekFa'),
  infoFinal: fFile_('1u87sAryx0id5qAV61zyu3CXl5LKMBISl'),
  compete: fFile_('12jci5TSfk-oxqPi_cRJ5euktubg1zux8'),
  research: fFile_('1115sZrK3x1WpPHW2zSQp9qmTUCrKjzkd'),
  researchSum: fFile_('1E44CkEJbwwB9UOOlFh1HgjfRfOh51Q1g'),
  catalogue: fFile_('15Md-Cy-tOCq0euP8u3kskUZIBt8LrMAV'),
  catTrans: 'https://docs.google.com/document/d/1qxfsrhVirdVMQG4klCzybH4K5DLnb9i2RcqKe62gFII/edit',
  clinical: fFile_('1rK1ddDa-h26e5jALPQZmOBeI6DmuuYZa'),
  ifu: fFile_('18rgqQ0NjN1u92h3eq9O37wiBArDN4nTB'),
  tskt: fFile_('17_0ahTag5F6RmpN1PuSrAk_xIlMguVBx'),
  brochureVN: fFile_('1PJaqtabM8GGhA1bOSHYZci01VJ5aLSkY'),
  img: fFile_('1pmLCp0Hj-_QRjQnyeQ-b1Pz29HrvLLXm'),
  trainNPP: fFile_('1BWN8C4OiL7eD4y3uddzSOFjUySrptKRm'),
  trainInt: fFile_('1h3pyRU2VFGn5Q52fiA1teGGhnbbCWHPp'),
  promo: fFile_('1iYgIjhYeAHa4qIvCtOE7b9T1XHIrcKmY'),
  form: 'https://docs.google.com/forms/d/1WY66nK5_9J5ZdM1MUuYiLzhqThYxE1RQHduaNrSdZrI/edit',
  formResp: 'https://docs.google.com/spreadsheets/d/1bjVPE8MBM_DWsd-rARIS2_042APwSfYc3CL_BrCqlIM/edit',
  shapeDoc: fFile_('1hfF4uX4-ln_qLKVbzylT82PgAu5gNjt-'),
  shapeRes: fFile_('1aTBjdfCHumQsAMVgSSZKtebNJlMVnU6u'),
  survey2: 'https://docs.google.com/spreadsheets/d/1RGBSYSjaopF78oaW_XlEInaw4PqsAL5VTW2NOzJ-32c/edit',
  maniPdf: 'https://www.mani.co.jp/en/pdf/IPR-01EF.pdf',
  maniReport: 'https://www.mani.co.jp/en/pdf/dental_04_14_report.pdf',
  maniIfu: 'https://www.mani.co.jp/en/pdf/6DIA-BURS.pdf'
};

/* ── Menu + tự dựng lần đầu ─────────────────────────────────────────────────────────────── */
function onOpen(e) {
  try {
    SpreadsheetApp.getUi().createMenu('MMH · Launch IPR')
      .addItem('Dựng lại theo SOP launch (ghi đè 7 tab mới)', 'iprRebuildMenu')
      .addSeparator()
      .addItem('Hiện các tab cũ', 'iprShowOldTabs')
      .addItem('Ẩn các tab cũ', 'iprHideOldTabs')
      .addToUi();
  } catch (_) {}
  try {
    var ss = SpreadsheetApp.getActive();
    if (!iprBuilt_(ss)) {
      iprBuild_(ss);
      ss.toast('Đã dựng lại file theo SOP ra mắt sản phẩm (7 tab mới). Tab cũ được ẩn, không xoá.', 'MMH', 8);
    }
  } catch (err) {
    console.error('IPR auto build: ' + (err && err.stack || err));
  }
}

function iprRebuildMenu() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('Dựng lại theo SOP launch',
    'Dựng lại sẽ GHI ĐÈ 7 tab mới (00 → 06). Mọi chỉnh sửa trong 7 tab này sẽ mất. Tab cũ không bị ảnh hưởng.\n\nTiếp tục?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  iprBuild_(SpreadsheetApp.getActive());
  SpreadsheetApp.getActive().toast('Đã dựng lại xong.', 'MMH', 5);
}

function iprShowOldTabs() {
  SpreadsheetApp.getActive().getSheets().forEach(function (sh) {
    if (IPR_TABS.indexOf(sh.getName()) < 0) sh.showSheet();
  });
}
function iprHideOldTabs() { iprHideOld_(SpreadsheetApp.getActive()); }

function iprBuilt_(ss) {
  return ss.createDeveloperMetadataFinder().withKey(IPR_META).find().length > 0 && !!ss.getSheetByName(T.home);
}

function iprHideOld_(ss) {
  ss.getSheets().forEach(function (sh) {
    if (IPR_TABS.indexOf(sh.getName()) < 0 && !sh.isSheetHidden()) sh.hideSheet();
  });
}

/* ── Dựng toàn bộ ───────────────────────────────────────────────────────────────────────── */
function iprBuild_(ss) {
  var lock = null;
  try { lock = LockService.getDocumentLock(); lock.waitLock(20000); } catch (_) { lock = null; }
  try {
    // Tạo tab mới trước (luôn còn ≥1 tab hiện), rồi mới ẩn tab cũ
    var keep = ss.insertSheet('_tmp_' + Date.now(), 0);
    IPR_TABS.forEach(function (n) { var s = ss.getSheetByName(n); if (s) ss.deleteSheet(s); });
    buildPlan_(ss);      // 01 — các tab khác tham chiếu tab này bằng công thức
    buildFeas_(ss);      // 02
    buildMkt_(ss);       // 03
    buildSamples_(ss);   // 04
    buildEval_(ss);      // 05
    buildDocs_(ss);      // 06
    buildHome_(ss);      // 00
    IPR_TABS.forEach(function (n, i) { ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1); });
    ss.deleteSheet(keep);
    iprHideOld_(ss);
    ss.createDeveloperMetadataFinder().withKey(IPR_META).find().forEach(function (m) { m.remove(); });
    ss.addDeveloperMetadata(IPR_META, IPR_BUILD);
    ss.setActiveSheet(ss.getSheetByName(T.home));
  } finally {
    if (lock) try { lock.releaseLock(); } catch (_) {}
  }
}

/* ── Bộ ghi bảng (Writer) ───────────────────────────────────────────────────────────────── */
function W_(ss, name, widths, tabColor) {
  var sh = ss.insertSheet(name);
  var maxCols = widths.length + 1;
  if (sh.getMaxColumns() > maxCols) sh.deleteColumns(maxCols + 1, sh.getMaxColumns() - maxCols);
  sh.setColumnWidth(1, 18);
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 2, w); });
  sh.getRange(1, 1, sh.getMaxRows(), maxCols).setFontFamily(FONT).setFontSize(10).setFontColor(COL.ink)
    .setVerticalAlignment('top');
  sh.setHiddenGridlines(true);
  if (tabColor) sh.setTabColor(tabColor);
  return { sh: sh, r: 1, n: widths.length };
}

function wTitle_(w, title, sub) {
  w.sh.getRange(1, 2).setValue(title).setFontSize(16).setFontWeight('bold').setFontColor(COL.navy);
  w.sh.getRange(2, 2).setValue(sub).setFontSize(10).setFontStyle('italic').setFontColor(COL.muted);
  w.sh.getRange(3, 2, 1, w.n).setBorder(null, null, true, null, null, null, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  w.sh.setRowHeight(1, 30);
  w.r = 5;
}

function wSection_(w, text) {
  w.sh.getRange(w.r, 2, 1, w.n).setBackground(COL.blue).setFontColor(COL.white).setFontWeight('bold').setFontSize(11);
  w.sh.getRange(w.r, 2).setValue(text);
  w.sh.setRowHeight(w.r, 24);
  w.sh.getRange(w.r, 2, 1, w.n).setVerticalAlignment('middle');
  w.r += 1;
}

function wNote_(w, text) {
  var rg = w.sh.getRange(w.r, 2, 1, w.n);
  rg.mergeAcross().setValue(text).setWrap(true).setFontStyle('italic').setFontColor(COL.muted);
  w.sh.setRowHeight(w.r, Math.max(21, 16 * Math.ceil(text.length / 160)));
  w.r += 1;
}

/* Key–value: cột B nhãn, cột C → cuối ghép lại cho nội dung */
function wKV_(w, pairs) {
  if (!pairs.length) return;
  var r0 = w.r, n = pairs.length;
  w.sh.getRange(r0, 2, n, 2).setValues(pairs.map(function (p) { return [p[0], p[1]]; }));
  if (w.n > 2) w.sh.getRange(r0, 3, n, w.n - 1).mergeAcross();
  w.sh.getRange(r0, 2, n, 1).setFontWeight('bold').setFontColor(COL.navy).setBackground(COL.pale);
  w.sh.getRange(r0, 3, n, w.n - 1).setWrap(true);
  w.sh.getRange(r0, 2, n, w.n).setBorder(true, true, true, true, true, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  w.r += n + 1;
}

/* Bảng: headers[], rows[][]; opt.link = chỉ số cột (0-based) chứa [nhãn, url]; opt.dates = [chỉ số cột ngày] */
function wTable_(w, headers, rows, opt) {
  opt = opt || {};
  var nc = headers.length, r0 = w.r;
  var hr = w.sh.getRange(r0, 2, 1, nc);
  hr.setValues([headers]).setBackground(COL.light).setFontColor(COL.navy).setFontWeight('bold').setWrap(true)
    .setVerticalAlignment('middle');
  w.sh.setRowHeight(r0, 30);
  if (rows.length) {
    var vals = rows.map(function (row) {
      return row.map(function (c, j) {
        if (j === opt.link) return '';
        return c === null || c === undefined ? '' : c;
      });
    });
    var body = w.sh.getRange(r0 + 1, 2, rows.length, nc);
    body.setValues(vals).setWrap(true);
    var bg = rows.map(function (_, i) { var c = i % 2 ? COL.pale : COL.white; return headers.map(function () { return c; }); });
    body.setBackgrounds(bg);
    if (opt.link !== undefined) {
      var f = rows.map(function (row) {
        var l = row[opt.link];
        if (!l || !l[1]) return [l && l[0] ? l[0] : ''];
        return ['=HYPERLINK("' + l[1] + '","' + String(l[0]).replace(/"/g, '""') + '")'];
      });
      var lr = w.sh.getRange(r0 + 1, 2 + opt.link, rows.length, 1);
      lr.setFormulas(f);  // chuỗi không bắt đầu bằng "=" được ghi như văn bản
      lr.setFontColor(COL.tab);
    }
    (opt.dates || []).forEach(function (j) { w.sh.getRange(r0 + 1, 2 + j, rows.length, 1).setNumberFormat('dd/MM/yyyy').setHorizontalAlignment('center'); });
    (opt.center || []).forEach(function (j) { w.sh.getRange(r0 + 1, 2 + j, rows.length, 1).setHorizontalAlignment('center'); });
    (opt.bold || []).forEach(function (j) { w.sh.getRange(r0 + 1, 2 + j, rows.length, 1).setFontWeight('bold').setFontColor(COL.navy); });
  }
  w.sh.getRange(r0, 2, rows.length + 1, nc).setBorder(true, true, true, true, true, true, COL.line, SpreadsheetApp.BorderStyle.SOLID);
  var out = { r0: r0, r1: r0 + rows.length, nc: nc };
  w.r += rows.length + 2;
  return out;
}

function D_(s) { if (!s) return ''; var p = s.split('/'); return new Date(+p[2], +p[1] - 1, +p[0]); }

/* ═══ 01 · Tiến độ (danh sách công việc theo 4 giai đoạn SOP) ═══════════════════════════ */
var NSP = 'Nhóm Sản phẩm', NMK = 'Nhóm Marketing', NKD = 'Nhóm Kinh doanh', TP = 'Trưởng phòng KD&MKT', GD = 'Tổng Giám đốc';

function planRows_() {
  return [
    // ID, Giai đoạn, Hạng mục, Công việc, Đầu ra / bằng chứng, Vai trò theo SOP, Người thực hiện (ghi nhận), Bắt đầu, Kết thúc, Trạng thái, Tài liệu, Ghi chú
    ['1.1', PH.p1, 'Khởi động', 'Họp khởi động dự án launch IPR', 'Biên bản họp 08/05', NSP, '', '08/05/2025', '08/05/2025', ST.none, ['Biên bản 08/05', L.meet0805], 'File biên bản trên Drive đang trống — bổ sung nội dung họp.'],
    ['1.2', PH.p1, 'Thông tin sản phẩm', 'Tổng quan về kỹ thuật IPR', 'Tổng quan về IPR.pdf', NSP, 'Giang', '10/05/2025', '14/05/2025', ST.done, ['Tổng quan IPR', L.overview], ''],
    ['1.3', PH.p1, 'Thông tin sản phẩm', 'Tổng hợp thông tin sản phẩm IPR-01EF (thông số, chỉ định, IFU)', 'IPR 01EF_Thông tin tổng hợp.pdf · Thông tin IPR 01 EF _Final.pdf', NSP, 'Giang', '09/05/2025', '16/05/2025', ST.done, ['Thông tin IPR-01EF', L.infoFinal], 'Chi tiết: tab 02_Khả thi, mục A.'],
    ['1.4', PH.p1, 'Đối thủ', 'Phân tích đối thủ & phân khúc giá', 'IPR_Sản phẩm Vs định vị cạnh tranh.pdf', NSP, 'Giang', '05/05/2025', '23/05/2025', ST.done, ['Định vị cạnh tranh', L.compete], 'Strauss & Co, NTI, MDT — tab 02, mục E.'],
    ['1.5', PH.p1, 'Khảo sát thị trường', 'Khảo sát 11 phòng khám về thói quen IPR', 'IPR _ Nghiên cứu thị trường.pdf', NSP, 'Giang', '05/05/2025', '23/05/2025', ST.done, ['Nghiên cứu thị trường', L.research], 'Kết quả: tab 02, mục C.'],
    ['1.6', PH.p1, 'Khảo sát thị trường', 'Tổng hợp nghiên cứu thị trường & kết luận định vị', 'IPR_Tổng hợp nghiên cứu.pdf', NSP, 'Giang', '09/05/2025', '03/07/2025', ST.done, ['Tổng hợp nghiên cứu', L.researchSum], ''],
    ['1.7', PH.p1, 'Giá', 'Chốt giá kênh phân phối', 'Giá lẻ 250.000 đ / vỉ 5 mũi', NSP + ' đề xuất · ' + GD + ' phê duyệt', 'Ha', '23/05/2025', '31/07/2025', ST.done, null, ''],
    ['1.8', PH.p1, 'Thông tin kênh', 'Thu thập thông tin từ đại lý', 'Thông tin đại lý (chưa có file trong thư mục)', NKD, '', '', '27/06/2025', ST.done, null, ''],

    ['2.1', PH.p2, 'Kế hoạch', 'Kế hoạch marketing: định vị, thông điệp, giá, kênh', 'Tab 03_Kế hoạch', NSP + ' + ' + NMK + ' · ' + TP + ' xác nhận', '', '', '', ST.none, null, 'Có phân tích STP / 4P; chưa có bản kế hoạch được phê duyệt trong thư mục.'],
    ['2.2', PH.p2, 'Ấn phẩm · Flyer A4', 'Dịch nội dung flyer', 'Bản dịch flyer', NSP, 'Giang', '09/05/2025', '10/05/2025', ST.done, ['Thư mục bản dịch', L.dirFlyer], ''],
    ['2.3', PH.p2, 'Ấn phẩm · Flyer A4', 'Thiết kế flyer', 'IPR-01EF Brochure VN.pdf', NMK, 'Long', '10/05/2025', '19/05/2025', ST.done, ['Brochure VN', L.brochureVN], ''],
    ['2.4', PH.p2, 'Ấn phẩm · Flyer A4', 'In flyer — 1.000 bản', 'Flyer bản in', NMK, 'Long', '', '26/06/2025', ST.done, null, ''],
    ['2.5', PH.p2, 'Ấn phẩm · Standee', 'Thiết kế standee', 'File thiết kế standee', NMK, 'Long', '16/06/2025', '04/07/2025', ST.done, null, 'Chưa thấy file thiết kế trong thư mục MKT Material.'],
    ['2.6', PH.p2, 'Ấn phẩm · Standee', 'In standee', 'Standee bản in', NMK, 'Long', '', '09/07/2025', ST.todo, null, 'Tiến độ cũ ghi 0%.'],
    ['2.7', PH.p2, 'Ấn phẩm · Trưng bày', 'Giá cắm mũi khoan — in laser logo MANI, DIA-BURS', 'Giá cắm', NMK, 'Long', '', '27/06/2025', ST.done, null, ''],
    ['2.8', PH.p2, 'Nội dung online', 'Kế hoạch nội dung: mini game', 'Content plan', NMK, 'Long', '', '24/06/2025', ST.done, null, ''],
    ['2.9', PH.p2, 'Đào tạo', 'Đào tạo nội bộ', 'Buổi đào tạo nội bộ', NSP, 'Giang', '', '18/06/2025', ST.done, null, ''],
    ['2.10', PH.p2, 'Đào tạo', 'Đào tạo nhà phân phối', 'Training _ IPR 01 EF _ 25.07.25.pptx', NSP, 'Giang', '', '25/07/2025', ST.done, ['Bài đào tạo NPP', L.trainNPP], ''],
    ['2.11', PH.p2, 'Phản hồi', 'Xây bộ câu hỏi & Google Form lấy phản hồi dùng thử', 'Form "KHẢO SÁT SỬ DỤNG MŨI KHOAN IPR"', NSP, 'Giang', '30/06/2025', '14/08/2025', ST.done, ['Google Form', L.form], 'Tiến độ cũ ghi 50% / 0%; form đã tạo 14/08/2025 và có phản hồi từ 20/08/2025.'],
    ['2.12', PH.p2, 'Khảo sát', 'Khảo sát customer insight', '', NSP, 'Giang', '03/07/2025', '10/07/2025', ST.todo, null, 'Tiến độ cũ ghi 0%.'],

    ['3.1', PH.p3, 'Dùng thử', 'Gửi mẫu dùng thử cho 21 phòng khám / bác sĩ', 'Danh sách nhận mẫu', TP, 'Tuyen', '30/06/2025', '07/07/2025', ST.done, null, 'Danh sách: tab 04_Mẫu & phản hồi.'],
    ['3.2', PH.p3, 'Khuyến mại', 'Khuyến mại ra mắt: mua 3 hộp IPR tặng 1 hộp Glide Finder (đại lý, đại lý trực thuộc, khách lẻ)', 'Thông báo đại lý 01/08/2025', TP + ' · ' + GD + ' phê duyệt', 'Tuyen', '01/08/2025', '10/08/2025', ST.done, ['Thông báo khuyến mại', L.promo], 'Thông báo ghi 01–10/08/2025; tiến độ cũ ghi 04–25/08/2025 — thống nhất 1 mốc.'],
    ['3.3', PH.p3, 'Online', 'Mở bán online', '', NMK, 'Long', '', '04/08/2025', ST.none, null, 'Tiến độ cũ ghi 0%.'],
    ['3.4', PH.p3, 'Online', 'Khuyến mại online', '', NMK, 'Long', '', '04/08/2025', ST.none, null, 'Tiến độ cũ ghi 0%.'],
    ['3.5', PH.p3, 'Online', 'Bài đăng sau ra mắt — 4 bài', '', NMK, 'Long', '', '', ST.none, null, ''],
    ['3.6', PH.p3, 'Sự kiện', 'Giới thiệu sản phẩm kết hợp workshop chỉnh nha', '', TP, '', '', '', ST.none, null, 'Chưa có ngày / kết quả.'],

    ['4.1', PH.p4, 'Phản hồi khách hàng', 'Thu phản hồi sau dùng thử (Google Form)', 'IPR Surveys _MMH — 3 phản hồi', NSP, 'Giang', '20/08/2025', '25/08/2025', ST.done, ['Kết quả form', L.formResp], 'Tóm tắt: tab 04, mục B.'],
    ['4.2', PH.p4, 'Đào tạo', 'Đào tạo nội bộ bổ sung về IPR-01EF', 'InternalTraining _ IPR 01 EF _ 31.12.25.pptx', NSP, 'Phuong', '', '31/12/2025', ST.done, ['Bài đào tạo nội bộ', L.trainInt], ''],
    ['4.3', PH.p4, 'Khảo sát cho MANI', 'Khảo sát hình dạng mũi IPR mới (umbrella) — 8 phòng khám', '202609_IPR Survey_Results.xlsx', NSP, '', '22/09/2026', '23/09/2026', ST.done, ['Kết quả khảo sát', L.shapeRes], 'Tóm tắt: tab 05, mục C.'],
    ['4.4', PH.p4, 'Khảo sát', 'Khảo sát khách hàng lần 2', 'IPR _ Khảo sát khách hàng lần 2 (file trống)', NSP, '', '', '', ST.todo, ['File khảo sát lần 2', L.survey2], ''],
    ['4.5', PH.p4, 'Kết quả bán hàng', 'Theo dõi doanh số IPR-01EF sau ra mắt (theo tháng, theo NPP)', 'Bảng doanh số — tab 05, mục B', NSP + ' · ' + TP + ' xác nhận', '', '', '', ST.todo, null, 'File chưa có số liệu bán hàng.'],
    ['4.6', PH.p4, 'Đánh giá dự án', 'Họp đánh giá sau ra mắt: kết quả, bài học, việc cải tiến', 'Biên bản đánh giá', TP + ' · ' + GD + ' phê duyệt', '', '', '', ST.todo, null, 'Mục "Review" trong tiến độ cũ đang trống.']
  ];
}

function buildPlan_(ss) {
  var w = W_(ss, T.plan, [44, 150, 130, 260, 220, 170, 90, 82, 82, 100, 150, 240], COL.tab);
  wTitle_(w, 'TIẾN ĐỘ LAUNCH IPR-01EF THEO SOP',
    'Mọi công việc của dự án, xếp theo 4 giai đoạn của SOP ra mắt sản phẩm mới. Cập nhật cột "Trạng thái" bằng danh sách chọn.');
  var rows = planRows_().map(function (r) {
    var x = r.slice(); x[7] = D_(x[7]); x[8] = D_(x[8]); return x;
  });
  var t = wTable_(w, ['ID', 'Giai đoạn', 'Hạng mục', 'Công việc', 'Đầu ra / bằng chứng', 'Vai trò theo SOP',
    'Người thực hiện (ghi nhận)', 'Bắt đầu', 'Kết thúc', 'Trạng thái', 'Tài liệu', 'Ghi chú'], rows,
    { link: 10, dates: [7, 8], center: [0, 9] });
  var sh = w.sh, n = rows.length;
  sh.setFrozenRows(t.r0);
  // nhóm giai đoạn: tô nhạt cột Giai đoạn + kẻ đậm khi đổi giai đoạn
  var prev = '';
  rows.forEach(function (r, i) {
    if (r[1] !== prev && i > 0) sh.getRange(t.r0 + 1 + i, 2, 1, t.nc).setBorder(true, null, null, null, null, null, COL.blue, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    prev = r[1];
  });
  sh.getRange(t.r0 + 1, 3, n, 1).setFontWeight('bold').setFontColor(COL.navy);
  var stRange = sh.getRange(t.r0 + 1, 11, n, 1);
  stRange.setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList([ST.done, ST.doing, ST.todo, ST.none, ST.cancel], true).setAllowInvalid(false).build());
  var cf = [
    [ST.done, '#D9EAD3', '#274E13'], [ST.doing, COL.cream, '#7F6000'],
    [ST.todo, '#F4CCCC', '#990000'], [ST.none, '#EFEFEF', COL.muted], [ST.cancel, '#EFEFEF', COL.muted]
  ].map(function (c) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(c[0]).setBackground(c[1]).setFontColor(c[2])
      .setRanges([stRange]).build();
  });
  sh.setConditionalFormatRules(cf);
  w.r = t.r1 + 2;
  wNote_(w, 'Quy ước trạng thái — Hoàn thành: có đầu ra / bằng chứng · Đang làm · Chưa làm: đã lên kế hoạch nhưng chưa thực hiện · Chưa ghi nhận: không có thông tin trong file và trên Drive, cần người phụ trách xác nhận · Huỷ.');
  wNote_(w, 'Cột "Vai trò theo SOP" là vai trò chịu trách nhiệm theo quy trình; cột "Người thực hiện" giữ nguyên tên đã ghi trong tiến độ cũ (tab "Leadtime Gantt", đã ẩn).');
}

/* ═══ 02 · Khả thi (GĐ1) ═══════════════════════════════════════════════════════════════ */
function buildFeas_(ss) {
  var w = W_(ss, T.feas, [170, 190, 190, 190, 190, 190], COL.blue);
  wTitle_(w, 'GĐ1 · ĐÁNH GIÁ KHẢ THI — IPR-01EF',
    'Sản phẩm, thị trường, khách hàng mục tiêu, đối thủ và giá — cơ sở để quyết định ra mắt (cổng 1).');

  wSection_(w, 'A. Thông tin sản phẩm');
  wKV_(w, [
    ['Tên sản phẩm', 'MANI DIA-BURS® IPR-01EF — mũi khoan kim cương siêu mịn chuyên cho mài kẽ (IPR) trong chỉnh nha'],
    ['Đóng gói · giá lẻ', '5 mũi / vỉ · 250.000 đ / vỉ'],
    ['Nơi sản xuất', 'MANI HANOI CO.,LTD. — nhà máy Phổ Yên · Xuất xứ: Việt Nam'],
    ['Vật liệu', 'Thân & cán: thép không gỉ (chứa nickel, chromium) · Lớp phủ: hạt kim cương siêu mịn (ultra-fine)'],
    ['Kích thước', 'Đầu mũi Ø 0,19 mm (mũi kim cương mỏng nhất của MANI) · Ø lớn nhất phần làm việc 0,44 mm · Dài phần làm việc 5,6 mm · Dài tổng 21,0 mm · Độ thuôn ≈ 1,28°'],
    ['Thiết bị · tốc độ', 'Tay khoan nhanh · tối đa 160.000 vòng/phút'],
    ['Chỉ định', 'Chỉnh nha khay trong suốt (aligner): mài kẽ tiêu chuẩn 0,2–0,5 mm, tạo khoảng tối thiểu cho dịch chuyển răng · Chen chúc vừa · Cân bằng tỷ lệ răng hai hàm · Điều chỉnh hô nhẹ · Cải thiện khớp cắn · Điều chỉnh trong niềng mắc cài'],
    ['Chống chỉ định', 'Răng vĩnh viễn trẻ em · Thiểu sản men · Quá mẫn ngà · Sâu răng kẽ · Chân răng sát nhau'],
    ['Hiệu quả lâm sàng', 'Thời gian thao tác bằng 1/5 so với đầu khuỷu thông thường, 1/10 so với dải mài tay · Một mũi dùng cho toàn bộ quy trình mài kẽ hai hàm · Bề mặt mịn, trượt êm'],
    ['Hướng dẫn dùng', 'Đặt ở cổ răng → di chuyển về rìa cắn · Tiếp cận mặt má hoặc mặt lưỡi · Lực nhẹ ("feather touch") · Bắt buộc đặt đê cao su và làm mát bằng nước'],
    ['Tiệt trùng · bảo quản', 'Không vô trùng — tiệt trùng trước khi dùng: autoclave 121 °C / 20 phút hoặc 126 °C / 15 phút · Tránh nhiệt độ cao, ẩm, ánh sáng trực tiếp · Thay khi giảm khả năng cắt'],
    ['Nguồn', 'Thông tin IPR 01 EF _Final.pdf · IPR-01EF brochure · Clinical report · DIA-BURS IFU (tab 06_Tài liệu)']
  ]);

  wSection_(w, 'B. Bối cảnh thị trường');
  wKV_(w, [
    ['Nhu cầu', 'Chỉnh nha hiện đại, đặc biệt khay trong suốt (CAGR phân khúc ≈ 7,6%), tăng nhanh tại Việt Nam ⇒ nhu cầu mài kẽ (IPR) tăng: tạo khoảng, giải quyết chen chúc nhẹ–vừa, cân chỉnh tỷ lệ Bolton, giảm tam giác đen, hỗ trợ ổn định sau niềng'],
    ['Xu hướng', 'Nha khoa bảo tồn, thẩm mỹ và kỹ thuật số thuận lợi cho IPR-01EF'],
    ['Khoảng trống dữ liệu', 'Chưa có số liệu chính thức về lượng dùng IPR mỗi năm; chưa có quy chuẩn số dụng cụ / ca và thời điểm thay dụng cụ ⇒ cần khảo sát thêm'],
    ['Công cụ hiện hành', 'Dải mài tay: kiểm soát tốt nhưng chậm, kém hiệu quả khi chen chúc · Dải mài gắn tay khoan: rung mạnh, khó kiểm soát · Đĩa mài: nguy cơ tổn thương mô mềm · Mũi khoan đang bán: đa số đầu to, độ thuôn lớn (> 2%), khó đạt độ chính xác 0,2–0,5 mm của aligner'],
    ['IPR theo loại điều trị', 'Niềng mắc cài: IPR là công cụ hỗ trợ, yêu cầu chính xác tương đối, mài sai có thể khắc phục (⭐⭐⭐) · Niềng trong suốt: IPR là phần bắt buộc của kế hoạch, cần chính xác đến 0,1 mm theo phần mềm, sai số ảnh hưởng trực tiếp (⭐⭐⭐⭐) · Nội nha, phục hồi, phục hình, ngoại khoa, nhi, implant, nha chu: không dùng']
  ]);

  wSection_(w, 'C. Khảo sát thị trường 2025 — 11 phòng khám');
  wKV_(w, [
    ['Mẫu khảo sát', '8/11 bác sĩ chỉnh nha chuyên sâu, 3/11 nha sĩ tổng quát · Tổng ≈ 870 ca chỉnh nha / tháng'],
    ['Thói quen IPR', '10/11 dùng IPR thường xuyên · 8/10 phối hợp nhiều dụng cụ (dải mài – mũi khoan – đĩa) · 4 phòng khám dùng cả 3 loại'],
    ['Cách phối hợp', 'Dải mài: vùng chen chúc, dễ kiểm soát · Mũi khoan: nhanh, dễ tạo gờ tiếp xúc · Đĩa: hoàn thiện thẩm mỹ'],
    ['Bo tròn sau IPR', '100% bác sĩ bo tròn sau mài · 7/11 dùng mũi hình ô (umbrella) hoặc đầu tròn · Một số bác sĩ khó thao tác góc cạnh vì hình dạng mũi chưa phù hợp'],
    ['Kỹ thuật', '6/11 thay đổi góc thao tác linh hoạt; thao tác theo trục răng giúp kiểm soát và quan sát tốt hơn'],
    ['Thói quen dùng mũi IPR', 'Bác sĩ chỉnh nha: 66% có dùng mũi IPR khi mài kẽ · Nha sĩ tổng quát làm chỉnh nha: 46%']
  ]);

  wSection_(w, 'D. Phân khúc & khách hàng mục tiêu');
  wTable_(w, ['Tiêu chí', 'Bác sĩ chỉnh nha', 'Nha sĩ tổng quát làm chỉnh nha', 'Sinh viên'], [
    ['Đặc điểm', 'Chuyên sâu, điều trị ca khó (≈ 80 ca chỉnh nha / tháng)', 'Điều trị tiêu chuẩn tại phòng khám tư, đa dạng bệnh nhân', 'Đang học & thực hành, chi phí thấp'],
    ['Xu hướng chọn sản phẩm', 'Ưu tiên chất lượng, độ chính xác, hiệu suất', 'An toàn, dễ dùng, hướng dẫn rõ, giá hợp lý, đa dụng', 'Giá rẻ, quan tâm concept sản phẩm / điều trị'],
    ['Điểm thu hút', 'Chất lượng, độ bền, hiệu suất, độ chính xác cao', 'Giá hợp lý, dễ thao tác, sẵn hàng, độ bền chấp nhận được', 'Giá thấp, dễ thao tác, có ở trường / kênh giáo dục'],
    ['MANI đáp ứng', '4/5 — đạt chất lượng, độ chính xác, nhanh hơn 5–10 lần dải mài; chưa có trọn bộ concept', '3/5 — đạt chất lượng; hình dạng chuyên cho aligner nên ít tương thích chỉ định mài kẽ khác', '2/5 — chất lượng tốt nhưng thiếu thông tin concept, giá cao'],
    ['Tỷ trọng mục tiêu MANI', '35%', '60%', '5%']
  ], { bold: [0] });
  wTable_(w, ['Nhóm khách hàng', 'Bệnh viện', 'Trường đại học', 'Phòng khám'], [
    ['Tỷ trọng nhu cầu', '5%', '3%', '92%'],
    ['Số lượng', '150–200 bệnh viện', '23 trường', '≈ 12.000 phòng khám'],
    ['Cách mua', 'Thầu / ngoài thầu; nhiều cấp duyệt (khoa đề xuất → vật tư thẩm định → giám đốc duyệt)', 'Thầu / ngoài thầu; quyết định từ trưởng bộ môn / giảng viên', 'Ngoài thầu; chủ phòng khám chốt nhanh'],
    ['Yêu cầu giá', 'Trung bình – cao', 'Thấp – trung bình', 'Dao động lớn theo quy mô']
  ], { bold: [0] });

  wSection_(w, 'E. Đối thủ & giá');
  wTable_(w, ['Hãng', 'Sản phẩm', 'Giá bán', 'Giá / mũi', 'Nhà phân phối', 'Ghi chú'], [
    ['MANI (Nhật)', 'IPR-01EF — mũi đơn, chuyên cho mài kẽ khay trong suốt', '250.000 đ / vỉ 5 mũi', '≈ 50.000 đ', 'MMH → nhà phân phối → đại lý', 'Đầu Ø 0,19 mm, độ thuôn ≈ 1,28°, hạt siêu mịn'],
    ['Strauss & Co (Israel)', 'IPR kit 7 mũi; mũi lẻ J316, E11S', '1.690.000 đ / bộ 7 mũi', '180.000–187.000 đ', 'Nha khoa Thái Bình Dương (1 NPP)', 'Hãng duy nhất có trọn bộ IPR · E11S Ø 0,11 mm · J316 hình ô bo cạnh'],
    ['NTI (Đức)', '859L-010UF — mũi cắt kẽ chỉnh nha / phục hình', '79.000 đ / mũi', '79.000 đ', 'DOE (> 20 đại lý)', 'Mũi hình trụ, thông dụng'],
    ['MDT (Israel)', '465-392 016F — mũi cắt kẽ', '30.000–35.000 đ / mũi', '30.000–35.000 đ', 'Đại Tấn', 'Giá rẻ, đầu nhọn – thon']
  ], { bold: [0] });
  wTable_(w, ['Phân khúc giá (mũi khoan kim cương)', 'Cao', 'Trung bình', 'Thấp'], [
    ['Giá tham chiếu', '51.000–68.000 đ / mũi', '32.000–44.000 đ / mũi', '6.000–26.000 đ / mũi'],
    ['Thị phần', '6%', '93%', '1%'],
    ['Hãng', 'Dian Fong, DFS, Edenta, NTI, Okodent, Brasseler, Rotatec, Shofu, MDT', 'Drendel + Zweiling, Osstem, MANI', 'Verdent, Reco-Dental, Muller India'],
    ['Ưu / nhược', 'Cao cấp, hiệu suất tối ưu / giá cao, kén khách', 'Cân bằng giá – chất lượng / cạnh tranh mạnh từ hàng Trung Quốc', 'Rẻ, dễ tiếp cận / chất lượng, độ bền kém']
  ], { bold: [0] });

  wSection_(w, 'F. Kết luận khả thi');
  wKV_(w, [
    ['Kết luận', 'IPR-01EF có định vị rõ: mũi siêu mảnh, mài chính xác – nhanh – êm cho vùng chen chúc, phù hợp xu hướng chỉnh nha khay trong suốt tại Việt Nam'],
    ['Cần làm rõ thêm', '(1) Số dụng cụ IPR thực tế cần cho mỗi ca · (2) Quy trình / thời điểm thay dụng cụ'],
    ['Cổng 1 — quyết định ra mắt', 'Đã chốt giá lẻ 250.000 đ / vỉ (31/07/2025) và triển khai ra mắt 08/2025. Chưa có biên bản phê duyệt khả thi trong thư mục.']
  ]);
}

/* ═══ 03 · Kế hoạch (GĐ2) ══════════════════════════════════════════════════════════════ */
function buildMkt_(ss) {
  var w = W_(ss, T.mkt, [170, 210, 210, 210, 210], COL.blue);
  wTitle_(w, 'GĐ2 · KẾ HOẠCH LAUNCH — IPR-01EF',
    'Định vị, thông điệp, 4P, ấn phẩm, đào tạo và khuyến mại ra mắt.');

  wSection_(w, 'A. Định vị & thông điệp');
  wKV_(w, [
    ['Định vị', 'Giải pháp mài kẽ chính xác, nhanh và an toàn — tối ưu cho chỉnh nha khay trong suốt (aligner)'],
    ['Thông điệp 1 · Chính xác', 'Đầu mũi Ø 0,19 mm, độ thuôn ≈ 1,28° — kiểm soát lượng mài 0,2–0,5 mm, xâm lấn tối thiểu'],
    ['Thông điệp 2 · Nhanh', 'Thời gian thao tác bằng 1/5 đầu khuỷu thông thường, 1/10 dải mài tay; một mũi cho cả hai hàm'],
    ['Thông điệp 3 · Êm', 'Hạt kim cương siêu mịn — giảm rung, bề mặt mịn, bệnh nhân dễ chịu hơn'],
    ['Khách hàng mục tiêu', 'Phòng khám chỉnh nha (đặc biệt khay trong suốt) và nha sĩ tổng quát có làm chỉnh nha — tỷ trọng mục tiêu 35% bác sĩ chỉnh nha · 60% nha sĩ tổng quát · 5% sinh viên']
  ]);

  wSection_(w, 'B. 4P');
  wTable_(w, ['4P', 'Nội dung', 'Ghi chú'], [
    ['Sản phẩm', 'IPR-01EF — mũi khoan kim cương đơn, chuyên cho mài kẽ trong niềng khay trong suốt; chỉ định: cân bằng tỷ lệ răng, giải quyết chen chúc, tăng ổn định sau niềng, thay thế nhổ răng', 'Đối thủ Strauss & Co có trọn bộ; MANI hiện có 1 mũi'],
    ['Giá', '250.000 đ / vỉ 5 mũi (≈ 50.000 đ / mũi)', 'Phân khúc giá trung bình – cao; thấp hơn nhiều so với mũi lẻ Strauss (180.000 đ)'],
    ['Phân phối', 'MANI → nhà phân phối → đại lý → người dùng (bệnh viện / trường / phòng khám)', 'Duy trì mạng ≈ 200 đại lý với tồn kho và chính sách giá ổn định'],
    ['Xúc tiến', 'Offline: kết hợp workshop chỉnh nha · Online: Facebook (sản phẩm mới, mini game) · Nội dung KOL · Thăm đại lý, thăm phòng khám · Gửi mẫu dùng thử · Khuyến mại ra mắt', 'Chi tiết thời gian: tab 01_Tiến độ']
  ], { bold: [0] });

  wSection_(w, 'C. Ấn phẩm & công cụ bán hàng');
  wTable_(w, ['Hạng mục', 'Đầu ra', 'Số lượng', 'Trạng thái', 'Tài liệu'], [
    ['Flyer A4 (bản tiếng Việt)', 'IPR-01EF Brochure VN', '1.000 bản in', ST.done, ['Brochure VN', L.brochureVN]],
    ['Standee', 'Thiết kế xong; chưa in', 'Chưa ghi nhận', ST.todo, ['', '']],
    ['Giá cắm mũi khoan', 'In laser logo MANI, DIA-BURS', 'Chưa ghi nhận', ST.done, ['', '']],
    ['Catalogue / bản dịch catalogue', 'IPR-01EF _ Catalogue.pdf · Bản dịch Catalog mũi khoan IPR', '—', ST.done, ['Catalogue', L.catalogue]],
    ['Ảnh sản phẩm', 'IPR-01EF.png', '—', ST.done, ['Ảnh', L.img]],
    ['Thông số kỹ thuật (hồ sơ thầu)', 'TSKT _ Mũi khoan IPR.xlsx', '—', ST.done, ['TSKT', L.tskt]]
  ], { link: 4, center: [3] });

  wSection_(w, 'D. Đào tạo');
  wTable_(w, ['Đối tượng', 'Nội dung', 'Ngày', 'Tài liệu'], [
    ['Nội bộ (Sales / Marketing)', 'Đào tạo sản phẩm IPR-01EF', '18/06/2025', ['', '']],
    ['Nhà phân phối', 'Đào tạo sản phẩm IPR-01EF cho NPP', '25/07/2025', ['Training NPP 25.07.25', L.trainNPP]],
    ['Nội bộ (bổ sung)', 'Đào tạo nội bộ IPR-01EF', '31/12/2025', ['InternalTraining 31.12.25', L.trainInt]]
  ], { link: 3, center: [2] });

  wSection_(w, 'E. Khuyến mại ra mắt');
  wKV_(w, [
    ['Chương trình', 'Mua 03 hộp IPR — tặng 01 hộp Glide Finder'],
    ['Đối tượng', 'Đại lý, đại lý trực thuộc, khách lẻ mặt hàng nha khoa MANI'],
    ['Thời gian', '01/08/2025 – 10/08/2025 (theo thông báo đại lý ngày 01/08/2025). Tiến độ cũ ghi 04–25/08/2025.'],
    ['Kết quả', 'Chưa ghi nhận số hộp bán / số hộp tặng — cập nhật tại tab 05_Đánh giá']
  ]);
}

/* ═══ 04 · Mẫu & phản hồi (GĐ3 → GĐ4) ═════════════════════════════════════════════════ */
function buildSamples_(ss) {
  var w = W_(ss, T.smp, [40, 220, 100, 280, 60, 60, 90, 220], COL.blue);
  wTitle_(w, 'MẪU DÙNG THỬ & PHẢN HỒI — IPR-01EF',
    'Danh sách phòng khám / bác sĩ nhận mẫu (30/06 – 07/07/2025) và kết quả khảo sát sau dùng thử (08/2025).');
  wSection_(w, 'A. Danh sách nhận mẫu (21 phòng khám / bác sĩ)');
  // "Đã phản hồi" = có phiếu trong form khảo sát (Thùy, Lux Smile, Nikkori)
  var rows = [
    [1, 'Nikkori Clinic', '', '52 Đ. số 5, Tân Hưng, Quận 7, TP Hồ Chí Minh', 'Hộp', 2, true, 'Có phiếu khảo sát 25/08/2025'],
    [2, 'BS Hạnh — ĐHQG Hà Nội', '', 'Hà Nội', 'Hộp', 1, false, ''],
    [3, 'Minh Thu', '', 'Hà Nội', 'Hộp', '', false, ''],
    [4, 'Trí Đức', '', 'Hà Nội', 'Hộp', '', false, ''],
    [5, 'Parkway', '', 'Hà Nội', 'Hộp', '', false, ''],
    [6, 'Lạc Việt Intech', '', 'Hà Nội', 'Hộp', '', false, ''],
    [7, 'Thùy Anh', '', 'Hà Nội', 'Hộp', '', false, ''],
    [8, 'Global Dental', '', 'Hà Nội', 'Hộp', '', false, ''],
    [9, 'Home Dental', '', 'Hà Nội', 'Hộp', '', false, ''],
    [10, 'Sea Dental', '', 'Hà Nội', 'Hộp', '', false, ''],
    [11, 'Lux Smile Studio (KOL Dũng)', '0866868347', 'Số 19 Đường 34A, P. An Phú, Quận 2, TP Thủ Đức, TP Hồ Chí Minh', 'Hộp', 2, true, 'Có phiếu khảo sát 23/08/2025'],
    [12, 'Nha khoa Thùy (KOL Thùy)', '', 'Bắc Giang', 'Hộp', 3, true, 'Có phiếu khảo sát 20/08/2025'],
    [13, 'Jet Dentist', '', 'Hà Nội', 'Hộp', '', false, ''],
    [14, 'BS Lê Văn Tiên', '0983110024', '170 Nguyễn Hữu Thọ, Hải Châu, Đà Nẵng', 'Hộp', '', false, ''],
    [15, 'Nha khoa Dr Hùng (BS Lan)', '0982136718', '275 Tiểu La, Hải Châu, Đà Nẵng', 'Hộp', '', false, ''],
    [16, 'Nha khoa Việt Anh (BS Việt Anh)', '0901130202', '12 Triệu Nữ Vương, Hải Châu, Đà Nẵng', 'Hộp', '', false, ''],
    [17, 'Nha khoa V-Care (BS Hiếu)', '0387579865', '190 Kinh Dương Vương, Liên Chiểu, Đà Nẵng', 'Hộp', '', false, ''],
    [18, 'Nha khoa Aki (A Phong)', '', 'TP Hồ Chí Minh', 'Hộp', '', false, 'Phản hồi miệng: chất lượng ok'],
    [19, 'Nha khoa Hoa Sứ (Dr Hiếu)', '', 'TP Hồ Chí Minh', 'Hộp', '', false, ''],
    [20, 'Chỉnh nha Huy', '', 'Hải Phòng', 'Hộp', '', false, ''],
    [21, 'RHM Trung ương (BS Hà)', '', 'Hà Nội', 'Hộp', '', false, '']
  ];
  var t = wTable_(w, ['STT', 'Phòng khám / bác sĩ', 'Điện thoại', 'Địa chỉ', 'ĐVT', 'SL', 'Đã phản hồi', 'Ghi chú'], rows, { center: [0, 4, 5, 6] });
  w.sh.getRange(t.r0 + 1, 8, rows.length, 1).insertCheckboxes();
  w.sh.getRange(t.r0 + 1, 3, rows.length, 1).setNumberFormat('@');
  w.sh.getRange(t.r0 + 1, 3, rows.length, 1).setValues(rows.map(function (r) { return [r[2]]; }));
  w.r = t.r1 + 1;
  w.sh.getRange(w.r, 2, 1, 3).setValues([['', 'Tỷ lệ phản hồi', '']]).setFontWeight('bold').setFontColor(COL.navy);
  w.sh.getRange(w.r, 5).setFormula('=TEXT(COUNTIF(H' + (t.r0 + 1) + ':H' + t.r1 + ',TRUE)/COUNTA(C' + (t.r0 + 1) + ':C' + t.r1 + '),"0%")&" ("&COUNTIF(H' + (t.r0 + 1) + ':H' + t.r1 + ',TRUE)&"/"&COUNTA(C' + (t.r0 + 1) + ':C' + t.r1 + ')&")"').setFontWeight('bold').setFontColor(COL.navy);
  w.r += 2;

  wSection_(w, 'B. Khảo sát sau dùng thử — Google Form "KHẢO SÁT SỬ DỤNG MŨI KHOAN IPR" (3 phiếu, 20–25/08/2025)');
  wTable_(w, ['Tiêu chí', 'Nha khoa Thùy', 'Lux Smile Studio', 'Nikkori Dental Clinic', 'Tổng hợp'], [
    ['Chuyên môn · kinh nghiệm chỉnh nha', 'Nha sĩ tổng quát · 6–10 năm', 'Nha sĩ tổng quát · 6–10 năm', 'Nha sĩ tổng quát · 6–10 năm', '3/3 nha sĩ tổng quát, 6–10 năm'],
    ['Số ca IPR / tháng', '1–5', '1–5', '6–15', ''],
    ['Độ chính xác', 'Xuất sắc', 'Tốt', 'Tốt', '3/3 tốt trở lên'],
    ['Độ rung so với mũi IPR thường', 'Giảm rõ rệt', 'Giảm vừa', 'Giảm vừa', '3/3 giảm rung'],
    ['Bề mặt sau mài', 'Mịn, cần đánh bóng ít', 'Mịn, cần đánh bóng ít', 'Rất mịn, không cần đánh bóng', '3/3 mịn'],
    ['Phù hợp nhất cho', 'Mài kẽ vừa 0,2–0,5 mm / mặt', 'Mài kẽ tối thiểu < 0,2 mm / mặt', 'Mài kẽ tối thiểu < 0,2 mm / mặt', ''],
    ['Thuận tiện (đặt vị trí · kiểm soát lực · tầm nhìn)', 'Dễ · Dễ · Dễ', 'Dễ · Dễ · Dễ', 'Rất dễ · Rất dễ · Rất dễ', '3/3 dễ hoặc rất dễ'],
    ['Vùng răng hiệu quả nhất', 'Răng cửa giữa, cửa bên, nanh', 'Răng cửa giữa', 'Răng cửa giữa, cửa bên', 'Răng cửa giữa: 3/3'],
    ['Ưu điểm nổi bật', 'Giảm rung · Tiết kiệm thời gian · Bệnh nhân dễ chịu', 'Chính xác hơn · Giảm rung · Dễ kiểm soát', 'Chính xác hơn · Giảm rung · Bề mặt tốt hơn', 'Giảm rung: 3/3 · Chính xác hơn: 2/3'],
    ['Cần cải thiện', 'Độ bền', 'Độ bền', 'Không cần cải thiện', 'Độ bền: 2/3']
  ], { bold: [0] });
  wNote_(w, 'Nguồn: bảng trả lời "IPR Surveys _MMH" (tab 06_Tài liệu). Chỉ 3/21 nơi nhận mẫu có phiếu — số phiếu quá ít để kết luận chung.');
}

/* ═══ 05 · Đánh giá (GĐ4) ═════════════════════════════════════════════════════════════ */
function buildEval_(ss) {
  var w = W_(ss, T.eval, [220, 150, 170, 230, 230], COL.blue);
  wTitle_(w, 'GĐ4 · ĐO LƯỜNG & TỐI ƯU — IPR-01EF',
    'Chỉ số sau ra mắt, kết quả bán hàng, khảo sát cho MANI và việc cần cải tiến.');

  wSection_(w, 'A. Chỉ số launch');
  wTable_(w, ['Chỉ số', 'Mục tiêu', 'Thực tế', 'Nguồn', 'Ghi chú'], [
    ['Số nơi nhận mẫu dùng thử', 'Chưa đặt', '21 phòng khám / bác sĩ', 'Tab 04, mục A', ''],
    ['Tỷ lệ phản hồi sau dùng thử', 'Chưa đặt', '3/21 (14%)', 'Form khảo sát 08/2025', ''],
    ['Đánh giá độ chính xác (tốt trở lên)', 'Chưa đặt', '3/3', 'Form khảo sát 08/2025', ''],
    ['Đào tạo nhà phân phối', 'Trước ngày ra mắt', 'Hoàn thành 25/07/2025', 'Bài đào tạo NPP', ''],
    ['Ấn phẩm sẵn sàng (flyer, giá cắm, standee)', 'Trước ngày ra mắt', 'Flyer 1.000 bản, giá cắm: xong · Standee: chưa in', 'Tab 01', ''],
    ['Doanh số IPR-01EF (vỉ) 3 tháng đầu', 'Chưa đặt', 'Chưa ghi nhận', 'Báo cáo doanh số NPP', 'Lấy số từ báo cáo doanh số NPP và điền mục B'],
    ['Số đại lý / phòng khám mua lần đầu', 'Chưa đặt', 'Chưa ghi nhận', 'CRM nha khoa', ''],
    ['Số hộp bán / tặng trong khuyến mại 01–10/08/2025', 'Chưa đặt', 'Chưa ghi nhận', 'Báo cáo khuyến mại', '']
  ], { bold: [0] });

  wSection_(w, 'B. Kết quả bán hàng (điền theo tháng)');
  var months = ['08/2025', '09/2025', '10/2025', '11/2025', '12/2025', '01/2026'];
  wTable_(w, ['Tháng', 'Nhà phân phối', 'Số lượng (vỉ)', 'Doanh số (đ)', 'Ghi chú'],
    months.map(function (m) { return [m, '', '', '', '']; }), { center: [0] });

  wSection_(w, 'C. Khảo sát hình dạng mũi IPR mới cho MANI (8 phòng khám, 22–23/09/2026)');
  wTable_(w, ['Câu hỏi', 'Kết quả', 'Nhận xét'], [
    ['Bác sĩ chỉnh nha chuyên khoa', '6/8', ''],
    ['Hãng đang dùng chủ yếu', 'MANI 4/8', 'Khác: CNM, Komet, nhiều hãng'],
    ['Hình dạng ưa thích (không xét độ hạt)', 'Ô có đầu nhọn 6/8', 'Không chọn dạng ô: 2/8'],
    ['IPR-05EF hay IPR-05EF-02', 'Cả hai 2 · IPR-05EF-02 2 · Không chọn 3', 'Không trả lời: 1'],
    ['Sẽ mua / chuyển sang khi ra mắt', '8/8 Có', ''],
    ['Ý kiến lặp lại nhiều nhất', 'Mở điểm tiếp xúc bằng đầu nhọn rồi bo góc bằng cùng một mũi — không muốn đổi nhiều mũi', '1 ý kiến: mũi IPR dễ hỏng (gãy, cháy) nên cần giá thấp hơn']
  ], { bold: [0] });

  wSection_(w, 'D. Việc còn mở & cải tiến');
  wTable_(w, ['Vấn đề', 'Bằng chứng', 'Đề xuất', 'Vai trò theo SOP', 'Trạng thái'], [
    ['Độ bền mũi', '2/3 phiếu dùng thử góp ý độ bền; 1 ý kiến khảo sát 2026 nói mũi dễ hỏng', 'Hướng dẫn rõ "một mũi cho một ca, thay khi giảm cắt"; chuyển ý kiến cho MANI', NSP, ST.todo],
    ['Thiếu hình dạng bo góc', 'Bác sĩ bo tròn sau IPR (100%); 6/8 ưa mũi ô có đầu nhọn', 'Gửi kết quả khảo sát 09/2026 cho MANI để xem xét dòng IPR-04 / IPR-05', NSP, ST.none],
    ['Số liệu bán hàng chưa có trong file', 'Mục B trống', 'Điền doanh số theo tháng từ báo cáo doanh số NPP', NSP, ST.todo],
    ['Hoạt động online chưa ghi nhận', 'Mở bán / khuyến mại online, 4 bài sau ra mắt chưa có trạng thái', 'Nhóm Marketing xác nhận đã làm / chưa làm', NMK, ST.none],
    ['Standee chưa in', 'Tiến độ cũ 0%', 'Quyết định in hay huỷ', NMK, ST.todo],
    ['Chưa có biên bản họp & đánh giá dự án', 'Biên bản 08/05 trống; mục Review trống', 'Họp đánh giá sau ra mắt, lưu biên bản vào thư mục launch', TP + ' · ' + GD + ' phê duyệt', ST.todo],
    ['Ngày khuyến mại chưa thống nhất', 'Thông báo 01–10/08/2025 · tiến độ cũ 04–25/08/2025', 'Xác nhận mốc thực tế', TP, ST.none]
  ], { bold: [0], center: [4] });
}

/* ═══ 06 · Tài liệu ═══════════════════════════════════════════════════════════════════ */
function buildDocs_(ss) {
  var w = W_(ss, T.docs, [40, 150, 130, 300, 260, 160], COL.blue);
  wTitle_(w, 'BẢN ĐỒ TÀI LIỆU — LAUNCH IPR-01EF',
    'Mọi tài liệu IPR-01EF tìm thấy trên Drive, xếp theo giai đoạn SOP. Bấm vào cột "Mở" để xem.');
  var rows = [
    ['Chung', 'Thư mục', 'Thư mục 2025 Launching IPR Dia-Burs', 'Thư mục gốc của dự án', ['Mở', L.dirLaunch]],
    ['Chung', 'Thư mục', 'MKT Material', 'Ấn phẩm, catalogue, ảnh, IFU, TSKT', ['Mở', L.dirMkt]],
    ['Chung', 'Thư mục', 'Đào tạo', 'Bài đào tạo nhà phân phối', ['Mở', L.dirTrain]],
    ['Chung', 'Biên bản', 'IPR Lauching Họp 08/05', 'Họp khởi động — file đang trống', ['Mở', L.meet0805]],
    [PH.p1, 'Nghiên cứu', 'Thư mục 202507 Market Research - IPR final Report', 'Báo cáo nghiên cứu thị trường IPR', ['Mở', L.dirResearch]],
    [PH.p1, 'Nghiên cứu', 'Thư mục Dự án IPR', 'Bản tổng hợp nghiên cứu, thông tin sản phẩm, khảo sát hình dạng', ['Mở', L.dirProject]],
    [PH.p1, 'Nghiên cứu', 'Tổng quan về IPR.pdf', 'Tổng quan kỹ thuật mài kẽ', ['Mở', L.overview]],
    [PH.p1, 'Nghiên cứu', 'IPR _ Nghiên cứu thị trường.pdf', 'Khảo sát 11 phòng khám, thói quen IPR', ['Mở', L.research]],
    [PH.p1, 'Nghiên cứu', 'IPR_Tổng hợp nghiên cứu.pdf', 'Bối cảnh, định vị, đối thủ, kết luận', ['Mở', L.researchSum]],
    [PH.p1, 'Nghiên cứu', 'IPR_Sản phẩm Vs định vị cạnh tranh.pdf', 'So sánh sản phẩm & định vị', ['Mở', L.compete]],
    [PH.p1, 'Sản phẩm', 'Thông tin IPR 01 EF _Final.pdf', 'Thông số, chỉ định, chống chỉ định, tiệt trùng', ['Mở', L.infoFinal]],
    [PH.p1, 'Sản phẩm', 'IPR 01EF_Thông tin tổng hợp.pdf', 'Thông tin tổng hợp sản phẩm', ['Mở', L.infoSum]],
    [PH.p1, 'Sản phẩm', 'Mani IPR 01 EF_04_14_report.pdf', 'Báo cáo lâm sàng của MANI', ['Mở', L.clinical]],
    [PH.p1, 'Sản phẩm', 'IPR IFU.pdf', 'Hướng dẫn sử dụng', ['Mở', L.ifu]],
    [PH.p1, 'Sản phẩm', 'MANI — IPR-01EF.pdf (web)', 'Brochure gốc của MANI', ['Mở', L.maniPdf]],
    [PH.p1, 'Sản phẩm', 'MANI — dental_04_14_report.pdf (web)', 'Báo cáo lâm sàng (bản web)', ['Mở', L.maniReport]],
    [PH.p1, 'Sản phẩm', 'MANI — 6DIA-BURS.pdf (web)', 'IFU DIA-BURS (bản web)', ['Mở', L.maniIfu]],
    [PH.p2, 'Ấn phẩm', 'IPR-01EF Brochure VN.pdf', 'Flyer tiếng Việt', ['Mở', L.brochureVN]],
    [PH.p2, 'Ấn phẩm', 'Thư mục bản dịch flyer', 'Bản dịch flyer', ['Mở', L.dirFlyer]],
    [PH.p2, 'Ấn phẩm', 'IPR-01EF _ Catalogue.pdf', 'Catalogue', ['Mở', L.catalogue]],
    [PH.p2, 'Ấn phẩm', 'Bản dịch Catalog mũi khoan IPR', 'Bản dịch catalogue', ['Mở', L.catTrans]],
    [PH.p2, 'Ấn phẩm', 'IPR-01EF.png', 'Ảnh sản phẩm', ['Mở', L.img]],
    [PH.p2, 'Hồ sơ thầu', 'TSKT _ Mũi khoan IPR.xlsx', 'Thông số kỹ thuật cho hồ sơ thầu', ['Mở', L.tskt]],
    [PH.p2, 'Đào tạo', 'Training _ IPR 01 EF _ 25.07.25.pptx', 'Đào tạo nhà phân phối 25/07/2025', ['Mở', L.trainNPP]],
    [PH.p2, 'Khảo sát', 'Google Form "KHẢO SÁT SỬ DỤNG MŨI KHOAN IPR"', 'Form lấy phản hồi dùng thử', ['Mở', L.form]],
    [PH.p3, 'Khuyến mại', 'Thông báo khuyến mại ra mắt 01/08/2025', 'Mua 3 hộp IPR tặng 1 hộp Glide Finder', ['Mở', L.promo]],
    [PH.p4, 'Khảo sát', 'IPR Surveys _MMH', 'Kết quả form dùng thử (3 phiếu)', ['Mở', L.formResp]],
    [PH.p4, 'Đào tạo', 'InternalTraining _ IPR 01 EF _ 31.12.25.pptx', 'Đào tạo nội bộ bổ sung', ['Mở', L.trainInt]],
    [PH.p4, 'Khảo sát', 'IPR Survey_For New Umbrella shape.docx', 'Bộ câu hỏi khảo sát hình dạng mũi mới (MANI)', ['Mở', L.shapeDoc]],
    [PH.p4, 'Khảo sát', '202609_IPR Survey_Results.xlsx', 'Kết quả khảo sát hình dạng mũi, 8 phòng khám', ['Mở', L.shapeRes]],
    [PH.p4, 'Khảo sát', 'IPR _ Khảo sát khách hàng lần 2', 'File đang trống', ['Mở', L.survey2]]
  ].map(function (r, i) { return [i + 1].concat(r); });
  var t = wTable_(w, ['STT', 'Giai đoạn', 'Loại', 'Tài liệu', 'Nội dung / dùng cho', 'Mở'], rows, { link: 5, center: [0] });
  w.sh.setFrozenRows(t.r0);
  w.r = t.r1 + 2;
  wNote_(w, 'Ghi chú: trong thư mục MKT Material có file "Feedback của khách hàng" nói về composite nướu tại labo — không thuộc IPR, nên chuyển sang thư mục đúng.');
}

/* ═══ 00 · Tổng quan ══════════════════════════════════════════════════════════════════ */
function buildHome_(ss) {
  var w = W_(ss, T.home, [230, 200, 230, 260, 110, 110], COL.tab);
  wTitle_(w, 'LAUNCH MANI DIA-BURS® IPR-01EF — TỔNG QUAN',
    'File theo dõi ra mắt sản phẩm, sắp xếp theo SOP ra mắt sản phẩm mới của MMH · dựng lại ' + IPR_BUILD);

  wSection_(w, 'Thông tin dự án');
  wKV_(w, [
    ['Sản phẩm', 'MANI DIA-BURS® IPR-01EF — mũi khoan kim cương siêu mảnh (đầu Ø 0,19 mm) cho mài kẽ trong chỉnh nha, tối ưu cho khay trong suốt'],
    ['Giá lẻ · đóng gói', '250.000 đ / vỉ 5 mũi'],
    ['Khách hàng mục tiêu', 'Phòng khám chỉnh nha và nha sĩ tổng quát có làm chỉnh nha (mục tiêu 35% / 60% / 5% sinh viên)'],
    ['Mốc chính', 'Khởi động 08/05/2025 · Đào tạo NPP 25/07/2025 · Ra mắt & khuyến mại đại lý 01/08/2025 · Khảo sát dùng thử 08/2025 · Khảo sát hình dạng mũi mới 09/2026'],
    ['Vai trò theo SOP', 'Nhóm Sản phẩm: chủ trì dự án, thông tin sản phẩm, đào tạo, khảo sát · Nhóm Marketing: ấn phẩm, nội dung online · Nhóm Kinh doanh: thông tin đại lý, bán hàng · Trưởng phòng KD&MKT: xác nhận kế hoạch, khuyến mại · Tổng Giám đốc: phê duyệt giá, kế hoạch, đánh giá'],
    ['Thư mục dự án', '2025 Launching IPR Dia-Burs (link ở tab 06_Tài liệu)']
  ]);

  wSection_(w, 'Tiến độ theo 4 giai đoạn SOP');
  var phases = [
    [PH.p1, 'Xác định sản phẩm có đáng ra mắt: sản phẩm, thị trường, khách hàng, đối thủ, giá', 'Cổng 1 · Tổng Giám đốc duyệt ra mắt và giá', T.feas],
    [PH.p2, 'Chuẩn bị: định vị, thông điệp, 4P, ấn phẩm, đào tạo, chính sách bán', 'Cổng 2 · Trưởng phòng KD&MKT xác nhận, Tổng Giám đốc phê duyệt kế hoạch', T.mkt],
    [PH.p3, 'Ra mắt: mẫu dùng thử, khuyến mại, hoạt động online, sự kiện', 'Cổng 3 · Sẵn sàng ra mắt (ấn phẩm, đào tạo, hàng)', T.smp],
    [PH.p4, 'Đo lường kết quả, thu phản hồi, cải tiến và đóng dự án', 'Cổng 4 · Họp đánh giá sau ra mắt, Tổng Giám đốc phê duyệt', T.eval]
  ];
  var pr = "'" + T.plan + "'!";
  var t = wTable_(w, ['Giai đoạn', 'Mục tiêu', 'Cổng phê duyệt', 'Tab chi tiết', 'Hoàn thành', 'Còn mở'],
    phases.map(function (p) { return [p[0], p[1], p[2], p[3], '', '']; }), { bold: [0], center: [4, 5] });
  var sid = {};
  ss.getSheets().forEach(function (s) { sid[s.getName()] = s.getSheetId(); });
  phases.forEach(function (p, i) {
    var r = t.r0 + 1 + i;
    w.sh.getRange(r, 5).setFormula('=HYPERLINK("#gid=' + sid[p[3]] + '","' + p[3] + '")').setFontColor(COL.tab);
    w.sh.getRange(r, 6).setFormula('=COUNTIFS(' + pr + 'C:C,"' + p[0] + '",' + pr + 'K:K,"' + ST.done + '")&"/"&COUNTIF(' + pr + 'C:C,"' + p[0] + '")');
    w.sh.getRange(r, 7).setFormula('=COUNTIFS(' + pr + 'C:C,"' + p[0] + '",' + pr + 'K:K,"<>' + ST.done + '",' + pr + 'K:K,"<>' + ST.cancel + '")');
  });
  w.sh.getRange(t.r0 + 1, 6, phases.length, 2).setFontWeight('bold').setFontColor(COL.navy).setFontSize(11);

  wSection_(w, 'Kết quả chính');
  wKV_(w, [
    ['Nghiên cứu', '11 phòng khám khảo sát (≈ 870 ca chỉnh nha / tháng); 10/11 dùng IPR thường xuyên; 100% bo tròn sau mài'],
    ['Chuẩn bị', 'Flyer tiếng Việt in 1.000 bản · giá cắm in logo · đào tạo nội bộ 18/06/2025 và NPP 25/07/2025'],
    ['Ra mắt', '21 phòng khám nhận mẫu · khuyến mại mua 3 hộp tặng 1 Glide Finder (01–10/08/2025)'],
    ['Phản hồi', '3 phiếu dùng thử: 3/3 chính xác tốt trở lên, 3/3 giảm rung, 2/3 góp ý độ bền · Khảo sát 09/2026: 6/8 ưa mũi ô có đầu nhọn, 8/8 sẽ mua nếu ra mắt'],
    ['Bán hàng', 'Chưa ghi nhận trong file — cần cập nhật tab 05_Đánh giá, mục B']
  ]);

  wSection_(w, 'Hướng dẫn dùng file');
  wKV_(w, [
    ['Cập nhật tiến độ', 'Tab 01_Tiến độ: đổi cột "Trạng thái" (danh sách chọn); thêm dòng mới đúng giai đoạn. Bảng trên tự đếm.'],
    ['Tài liệu mới', 'Lưu vào thư mục dự án trên Drive và thêm 1 dòng ở tab 06_Tài liệu.'],
    ['Tab cũ', 'Các tab cũ được ẩn, không xoá: menu "MMH · Launch IPR" ▸ Hiện các tab cũ. Tab Goals, SWOT, 10Ps, Timeline, Leadtime, Sales result, Product list, MAP, Target market là của dự án EG Composite 2024; tab "Đánh giá khả thi" là sản phẩm MMG — không thuộc IPR.'],
    ['Dựng lại', 'Menu "MMH · Launch IPR" ▸ Dựng lại theo SOP launch — ghi đè 7 tab mới.']
  ]);
}
