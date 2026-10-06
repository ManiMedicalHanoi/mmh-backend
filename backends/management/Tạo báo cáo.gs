/*****************************************************************************
 * MMH MONTHLY REPORT — MARKETING TEAM & PRODUCT TEAM  (v6)
 *----------------------------------------------------------------------------
 * v6 changes vs v5:
 *  - Đọc dữ liệu theo TÊN HEADER (row 4) thay vì hardcode vị trí cột
 *    → an toàn khi thêm/bớt/đổi thứ tự cột
 *  - Mapping header mới: No. | FY | Month | Type Task | Key Task | PIC |
 *    Deadline | Status | Plan | Result
 *  - Layout chi tiết mỗi key task hiển thị 2 bảng:
 *      ┌─────────┬──────────────────────────────┐
 *      │  PLAN   │ [nội dung plan]              │
 *      ├─────────┼──────────────────────────────┤
 *      │ RESULT  │ [nội dung result]            │
 *      └─────────┴──────────────────────────────┘
 *  - Hiển thị Status (badge) ngay dưới tiêu đề key task
 *  - Tất cả chức năng khác giữ nguyên từ v5
 *****************************************************************************/

var MRPT_CONFIG = {
  TEAM_NAME:   'Marketing Team & Product Team',
  TEAM_SHORT:  'Marketing_Product_Team',
  DEPARTMENT:  'Vietnam Sales & Marketing',
  ISSUED_BY:   'Tran Thai Tuyen',
  SOURCE_SHEET_NAME: 'MONTH',
  SHEET_URL:   'https://docs.google.com/spreadsheets/d/14xyRkzhpTLy0IbTzgFx2pobzgNN9TdYUGtOuSW0rrw8/edit?gid=1061917340#gid=1061917340',

  // ── Header names trong sheet (không phân biệt hoa thường, trim spaces) ──
  HEADER_ROW: 4,  // hàng chứa tên cột (1-indexed) — hàng 1-2: title, hàng 3: trống, hàng 4: header
  HEADERS: {
    MONTH:     'month',
    TYPE_TASK: 'type task',
    KEY_TASK:  'key task',
    PIC:       'pic',
    STATUS:    'status',
    PLAN:      'plan',
    RESULT:    'result'
  },

  MARKETING_SECTIONS: [
    { no: 1, label: 'Online Marketing', typeTask: 'Marketing-Digital Marketing', count: true },
    { no: 2, label: 'Design',           typeTask: 'Marketing-Design',            count: true },
    { no: 3, label: 'Promotion',        typeTask: 'Marketing-Promotion',         count: true },
    { no: 4, label: 'KOL Partnership',  typeTask: 'Marketing-KOL Partnership',   count: true },
    { no: 5, label: 'Marketing Events', typeTask: 'Marketing-Event',             count: true },
    { no: 6, label: 'Project',          typeTask: 'Marketing-Project',           count: true }
  ],
  PRODUCT_SECTIONS: [
    { no: 1, label: 'Training',          typeTask: 'Product-Training & Presentation', count: true  },
    { no: 2, label: 'Research',          typeTask: 'Product-Market Research',         count: true  },
    { no: 3, label: 'Data & Processing', typeTask: 'Product-Data Organization',       count: true  },
    { no: 4, label: 'Claim',             typeTask: 'Product-Customer Claim',          count: false }
  ],

  // Status label → màu nền (light) & màu text
  STATUS_STYLE: {
    'completed':     { bg: '#D1FAE5', fg: '#065F46' },
    'in progress':   { bg: '#DBEAFE', fg: '#1E40AF' },
    'not started':   { bg: '#F3F4F6', fg: '#374151' },
    'default':       { bg: '#FEF9C3', fg: '#713F12' }
  },

  COL_A_WIDTH: 20,   // indent padding trái
  COL_B_WIDTH: 360,  // PLAN (trái)
  COL_C_WIDTH: 10,   // khoảng cách giữa
  COL_D_WIDTH: 360,  // RESULT (phải)

  COLOR: {
    TEXT:        '#1A1A2E',    // tím than đậm — text chính
    HEADER_BG:   '#E8E8F0',    // xám tím nhạt — section heading
    TEAM_BG:     '#2E2E4A',    // tím than đậm — team header
    TEAM_FG:     '#FFFFFF',    // text trắng trên team header
    INDEX_BG:    '#F4F4F8',    // xám rất nhạt — index list
    TABLE_HEAD:  '#2E2E4A',    // tím than — header bảng Plan/Result
    TABLE_FG:    '#FFFFFF',    // text trắng trên header bảng
    LABEL_BG:    '#F4F4F8',
    BORDER:      '#BBBBC8',    // xám tím nhạt
    SEPARATOR:   '#9090A0',
    LINK:        '#1155CC',
    WHITE:       '#FFFFFF'
  }
};

/*****************************************************************************
 * SETUP & MENU
 *****************************************************************************/
function mrpt_setup() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'mrpt_buildMenu') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('mrpt_buildMenu')
    .forSpreadsheet(SpreadsheetApp.getActive()).onOpen().create();
  mrpt_buildMenu();
  SpreadsheetApp.getUi().alert('✅ Cài đặt thành công',
    'Menu "📊 Monthly Report" đã sẵn sàng.\n\nĐóng và mở lại file để menu xuất hiện ổn định.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
function mrpt_buildMenu() {
  SpreadsheetApp.getUi().createMenu('📊 Monthly Report')
    .addItem('📄 Tạo & Gửi Báo Cáo PDF', 'mrpt_showDialog')
    .addSeparator()
    .addItem('⚙️ Cài đặt lại Trigger', 'mrpt_setup')
    .addToUi();
}

/*****************************************************************************
 * DIALOG
 *****************************************************************************/
function mrpt_showDialog() {
  var periods = mrpt_getAvailablePeriods();
  if (!periods.months.length && !periods.quarters.length) {
    SpreadsheetApp.getUi().alert('Không có dữ liệu trong sheet "' + MRPT_CONFIG.SOURCE_SHEET_NAME + '"');
    return;
  }
  var html = HtmlService.createHtmlOutput(mrpt_buildDialogHtml(periods))
    .setWidth(480).setHeight(460);
  SpreadsheetApp.getUi().showModalDialog(html, '📊 Tạo Báo Cáo — ' + MRPT_CONFIG.TEAM_NAME);
}

function mrpt_getAvailablePeriods() {
  var sh = SpreadsheetApp.getActive().getSheetByName(MRPT_CONFIG.SOURCE_SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet: ' + MRPT_CONFIG.SOURCE_SHEET_NAME);
  var colIdx = mrpt_getColIndex(sh);
  var lastRow = sh.getLastRow();
  var dataStart = MRPT_CONFIG.HEADER_ROW + 1;
  if (lastRow < dataStart) return { months: [], quarters: [] };
  var monthCol = colIdx[MRPT_CONFIG.HEADERS.MONTH];
  if (monthCol === undefined) throw new Error('Không tìm thấy cột "Month" trong sheet');
  var vals = sh.getRange(dataStart, monthCol + 1, lastRow - dataStart + 1, 1).getValues();
  var set = {};
  vals.forEach(function(r) {
    var v = r[0];
    if (v !== '' && v !== null && v !== undefined) set[String(v).trim()] = true;
  });
  var months = [], quarters = [];
  Object.keys(set).forEach(function(v) {
    var clean = v.replace(/\s/g, '');
    if (/^Q\d+FY\d+$/i.test(clean)) quarters.push(clean);
    else if (/^\d{6}$/.test(clean)) months.push(clean);
  });
  months.sort(function(a, b) { return b.localeCompare(a); });
  quarters.sort(function(a, b) {
    function k(q) { var m = q.match(/Q(\d+)FY(\d+)/i); return m ? parseInt(m[2]) * 10 + parseInt(m[1]) : 0; }
    return k(b) - k(a);
  });
  return { months: months, quarters: quarters };
}

function mrpt_buildDialogHtml(periods) {
  var monthOpts = periods.months.map(function(p) {
    return '<option value="' + mrpt_escapeHtml(p) + '">' + mrpt_escapeHtml(mrpt_formatPeriodDisplay(p)) + '</option>';
  }).join('');
  var quarterOpts = periods.quarters.map(function(p) {
    return '<option value="' + mrpt_escapeHtml(p) + '">' + mrpt_escapeHtml(p) + '</option>';
  }).join('');
  var hasMonths   = periods.months.length > 0;
  var hasQuarters = periods.quarters.length > 0;
  var defaultMode = hasMonths ? 'month' : 'quarter';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    "body{font-family:'Aptos','Segoe UI',Arial,sans-serif;padding:20px;margin:0;color:#000}" +
    'h3{margin:0 0 15px;font-size:16px}' +
    'select{width:100%;padding:10px;font-size:14px;border:1px solid #9CA3AF;border-radius:6px;background:#fff;margin-top:6px}' +
    'button{background:#374151;color:#fff;padding:12px 24px;border:0;border-radius:6px;cursor:pointer;font-size:14px;margin-top:15px;font-weight:600;width:100%}' +
    'button:hover{background:#1F2937}button:disabled{background:#9CA3AF;cursor:not-allowed}' +
    '.tab-group{display:flex;gap:8px;margin-bottom:14px;background:#F3F4F6;padding:4px;border-radius:8px}' +
    '.tab-label{flex:1;display:flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px}' +
    '.tab-label:has(input:checked){background:#374151;color:#fff}.tab-label.disabled{opacity:.4;cursor:not-allowed}' +
    '.tab-label input{display:none}.box{margin-top:6px}.box-label{font-weight:600;display:block;margin-top:8px;font-size:13px}' +
    '.info{background:#F3F4F6;border-left:3px solid #374151;padding:10px 12px;border-radius:4px;margin:15px 0;font-size:12.5px;line-height:1.6}' +
    '.status{margin-top:15px;padding:10px;border-radius:6px;display:none;font-size:13px}' +
    '.status.loading{display:block;background:#F3F4F6}.status.success{display:block;background:#F0FDF4;color:#166534}.status.error{display:block;background:#FEF2F2;color:#991B1B}' +
    '.spinner{display:inline-block;width:14px;height:14px;border:2px solid #374151;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '</style></head><body>' +
    '<h3>📊 Chọn Kỳ Báo Cáo</h3>' +
    '<div class="tab-group">' +
      '<label class="tab-label' + (hasMonths ? '' : ' disabled') + '">' +
        '<input type="radio" name="mode" value="month" ' + (defaultMode === 'month' ? 'checked' : '') +
        (hasMonths ? '' : ' disabled') + ' onchange="switchMode()">By Month</label>' +
      '<label class="tab-label' + (hasQuarters ? '' : ' disabled') + '">' +
        '<input type="radio" name="mode" value="quarter" ' + (defaultMode === 'quarter' ? 'checked' : '') +
        (hasQuarters ? '' : ' disabled') + ' onchange="switchMode()">By Quarter</label>' +
    '</div>' +
    '<div id="monthBox" class="box" style="display:' + (defaultMode === 'month' ? 'block' : 'none') + '">' +
      '<label class="box-label">Tháng:</label>' +
      '<select id="monthSelect">' + monthOpts + '</select>' +
    '</div>' +
    '<div id="quarterBox" class="box" style="display:' + (defaultMode === 'quarter' ? 'block' : 'none') + '">' +
      '<label class="box-label">Quý:</label>' +
      '<select id="quarterSelect">' + quarterOpts + '</select>' +
    '</div>' +
    '<div class="info"><b>Lưu ý:</b><br>' +
    '• <b>By Month</b> → gửi <b>2 PDF</b>: Report tháng + Plan tháng kế tiếp<br>' +
    '• <b>By Quarter</b> → gửi <b>1 PDF</b> báo cáo quý<br>' +
    '• PDF gửi vào email đang đăng nhập</div>' +
    '<button id="submitBtn" onclick="submit()">Tạo & Gửi PDF</button>' +
    '<div id="status" class="status"></div>' +
    '<script>' +
    'function switchMode(){' +
      'var m=document.querySelector(\'input[name="mode"]:checked\').value;' +
      'document.getElementById("monthBox").style.display=m==="month"?"block":"none";' +
      'document.getElementById("quarterBox").style.display=m==="quarter"?"block":"none";' +
    '}' +
    'function submit(){' +
      'var m=document.querySelector(\'input[name="mode"]:checked\').value;' +
      'var p=m==="month"?document.getElementById("monthSelect").value:document.getElementById("quarterSelect").value;' +
      'if(!p){alert("Vui lòng chọn kỳ báo cáo");return;}' +
      'var b=document.getElementById("submitBtn");var s=document.getElementById("status");' +
      'b.disabled=true;s.className="status loading";' +
      's.innerHTML=\'<span class="spinner"></span>Đang tạo PDF, vui lòng đợi 30-60 giây...\';' +
      'google.script.run' +
        '.withSuccessHandler(function(x){s.className="status success";s.innerHTML="✅ "+x;b.disabled=false;})' +
        '.withFailureHandler(function(e){s.className="status error";s.innerHTML="❌ Lỗi: "+e.message;b.disabled=false;})' +
        '.mrpt_generate(p);' +
    '}' +
    '</script></body></html>';
}

/*****************************************************************************
 * MAIN
 *****************************************************************************/
function mrpt_generate(period) {
  var email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  if (!email) throw new Error('Không lấy được email người dùng');
  var isQuarter = String(period).toUpperCase().indexOf('Q') > -1;
  var attachments = [];
  if (isQuarter) {
    attachments.push(mrpt_buildPdf(period, 'Report'));
  } else {
    attachments.push(mrpt_buildPdf(period, 'Report'));
    attachments.push(mrpt_buildPdf(mrpt_getNextMonth(period), 'Plan'));
  }
  mrpt_sendEmail(email, attachments, period, isQuarter);
  return 'Đã gửi ' + attachments.length + ' file PDF đến ' + email;
}

function mrpt_getNextMonth(yyyymm) {
  var s = String(yyyymm).trim();
  if (s.length !== 6) return s;
  var y = parseInt(s.substring(0, 4), 10);
  var m = parseInt(s.substring(4, 6), 10) + 1;
  if (m > 12) { m = 1; y++; }
  return y + ('0' + m).slice(-2);
}
function mrpt_formatPeriodDisplay(p) {
  var s = String(p).trim();
  if (s.toUpperCase().indexOf('Q') > -1) return s;
  if (s.length === 6) return s.substring(4, 6) + '/' + s.substring(0, 4);
  return s;
}
function mrpt_formatPeriodForFilename(p) {
  var s = String(p).trim();
  if (s.toUpperCase().indexOf('Q') > -1) return s;
  if (s.length === 6) return s.substring(4, 6) + s.substring(0, 4);
  return s;
}

/*****************************************************************************
 * HEADER COLUMN INDEX — đọc theo tên cột, không phụ thuộc vị trí
 *****************************************************************************/
function mrpt_getColIndex(sheet) {
  var headerRow = MRPT_CONFIG.HEADER_ROW;
  var lastCol   = sheet.getLastColumn();
  var headers   = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var idx = {};
  headers.forEach(function(h, i) {
    var key = String(h).trim().toLowerCase();
    if (key) idx[key] = i; // 0-indexed
  });
  return idx;
}

/*****************************************************************************
 * BUILD PDF
 *****************************************************************************/
function mrpt_buildPdf(period, reportType) {
  var source = SpreadsheetApp.getActive().getSheetByName(MRPT_CONFIG.SOURCE_SHEET_NAME);
  if (!source) throw new Error('Không tìm thấy sheet: ' + MRPT_CONFIG.SOURCE_SHEET_NAME);
  var tempName = '_MRPT_TMP_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
  var tempSS = SpreadsheetApp.create(tempName);
  try {
    mrpt_layoutReport(source, tempSS, period, reportType);
    SpreadsheetApp.flush();
    Utilities.sleep(3000);
    return mrpt_exportAsPdf(tempSS, period, reportType);
  } finally {
    try { DriveApp.getFileById(tempSS.getId()).setTrashed(true); }
    catch (e) { console.warn('Không xóa được temp: ' + e.message); }
  }
}

/*****************************************************************************
 * LAYOUT
 * 3 cột:
 *   Col A (30px)   : indent padding trái
 *   Col B (100px)  : nhãn PLAN / RESULT / STATUS
 *   Col C (640px)  : nội dung
 *****************************************************************************/
function mrpt_layoutReport(source, tempSS, period, reportType) {
  var C = MRPT_CONFIG.COLOR;
  var colIdx  = mrpt_getColIndex(source);

  // Validate các cột bắt buộc
  var required = ['month', 'type task', 'key task', 'pic', 'status', 'plan', 'result'];
  required.forEach(function(h) {
    if (colIdx[h] === undefined)
      throw new Error('Không tìm thấy cột "' + h + '" trong sheet ' + MRPT_CONFIG.SOURCE_SHEET_NAME +
                      '. Kiểm tra lại tên header ở hàng ' + MRPT_CONFIG.HEADER_ROW + '.');
  });

  var lastRow   = source.getLastRow();
  var dataStart = MRPT_CONFIG.HEADER_ROW + 1;
  var lastCol   = source.getLastColumn();
  if (lastRow < dataStart) { return; }

  var allData = source.getRange(dataStart, 1, lastRow - dataStart + 1, lastCol).getValues();

  var periodClean = String(period).trim().replace(/\s/g, '');
  var filtered = [];
  allData.forEach(function(row, i) {
    var month = String(row[colIdx[MRPT_CONFIG.HEADERS.MONTH]] || '').trim().replace(/\s/g, '');
    if (month === periodClean) {
      filtered.push({ row: row, sourceRow: dataStart + i });
    }
  });

  // ── Sheet 1: Marketing Team ──────────────────────────────────────────────
  var mktSheet = tempSS.getActiveSheet();
  mktSheet.setName('Marketing_Team');
  mrpt_configureSheet(mktSheet);
  var r = 1;
  r = mrpt_writeHeaderBlock(mktSheet, period, reportType, r);

  if (!filtered.length) {
    mktSheet.getRange(r, 2, 1, 3).merge().setValue('Không có dữ liệu cho kỳ ' + mrpt_formatPeriodDisplay(period))
      .setFontFamily('Aptos').setFontSize(11).setFontStyle('italic').setFontColor(C.TEXT).setWrap(true);
    return;
  }

  r = mrpt_writeTeamBlock(mktSheet, source, filtered, colIdx, 'Marketing Team', MRPT_CONFIG.MARKETING_SECTIONS, r);
  mktSheet.getRange(r, 1, 1, 4).merge()
    .setBorder(null, null, true, null, false, false, C.SEPARATOR, SpreadsheetApp.BorderStyle.DASHED);

  // ── Sheet 2: Product Team ────────────────────────────────────────────────
  var prodSheet = tempSS.insertSheet('Product_Team');
  mrpt_configureSheet(prodSheet);
  var r2 = 1;
  r2 = mrpt_writeTeamBlock(prodSheet, source, filtered, colIdx, 'Product Team', MRPT_CONFIG.PRODUCT_SECTIONS, r2);
  prodSheet.getRange(r2, 1, 1, 4).merge()
    .setBorder(null, null, true, null, false, false, C.SEPARATOR, SpreadsheetApp.BorderStyle.DASHED);
  r2 += 2;
  mrpt_writeFooterHyperlink(prodSheet, r2);
}

function mrpt_configureSheet(sheet) {
  sheet.setColumnWidth(1, MRPT_CONFIG.COL_A_WIDTH);  // A: indent
  sheet.setColumnWidth(2, MRPT_CONFIG.COL_B_WIDTH);  // B: Plan
  sheet.setColumnWidth(3, MRPT_CONFIG.COL_C_WIDTH);  // C: gap
  sheet.setColumnWidth(4, MRPT_CONFIG.COL_D_WIDTH);  // D: Result
}

/*****************************************************************************
 * HEADER BLOCK
 *****************************************************************************/
function mrpt_writeHeaderBlock(sheet, period, reportType, startRow) {
  var C = MRPT_CONFIG.COLOR;
  var r = startRow;
  var title = (reportType === 'Report' ? 'Monthly Report' : 'Monthly Plan') +
              ' — ' + MRPT_CONFIG.TEAM_NAME;

  sheet.getRange(r, 2, 1, 3).merge().setValue(title)
    .setFontFamily('Aptos').setFontSize(16).setFontWeight('bold')
    .setFontColor(C.TEXT).setHorizontalAlignment('left').setWrap(true);
  sheet.setRowHeight(r, 30); r++;

  sheet.getRange(r, 2, 1, 3).merge().setValue('Issued by: ' + MRPT_CONFIG.ISSUED_BY)
    .setFontFamily('Aptos').setFontSize(11).setFontColor(C.TEXT).setWrap(true); r++;
  sheet.getRange(r, 2, 1, 3).merge().setValue('Period: ' + mrpt_formatPeriodDisplay(period))
    .setFontFamily('Aptos').setFontSize(12).setFontColor(C.TEXT).setWrap(true); r++;
  sheet.getRange(r, 2, 1, 3).merge().setValue('Department: ' + MRPT_CONFIG.DEPARTMENT)
    .setFontFamily('Aptos').setFontSize(11).setFontColor(C.TEXT).setWrap(true); r++;

  sheet.getRange(r, 1, 1, 4).merge()
    .setBorder(null, null, true, null, false, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
  r++; r++;
  return r;
}

/*****************************************************************************
 * TEAM BLOCK
 *****************************************************************************/
function mrpt_writeTeamBlock(sheet, source, filtered, colIdx, teamLabel, sections, r) {
  var C = MRPT_CONFIG.COLOR;

  // Team header
  sheet.getRange(r, 1, 1, 4).merge()
    .setValue(teamLabel)
    .setFontFamily('Aptos').setFontSize(13).setFontWeight('bold')
    .setFontColor(C.TEAM_FG).setBackground(C.TEAM_BG)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(r, 30); r++;
  r++;

  sections.forEach(function(section) {
    var items = filtered.filter(function(it) {
      return String(it.row[colIdx[MRPT_CONFIG.HEADERS.TYPE_TASK]] || '').trim() === section.typeTask;
    });
    var total = items.length;
    var heading = section.no + '.  ' + section.label;

    // Section heading (border dưới)
    sheet.getRange(r, 2, 1, 3).merge()
      .setValue(heading)
      .setFontFamily('Aptos').setFontSize(11).setFontWeight('bold')
      .setFontColor(C.TEXT).setBackground(C.HEADER_BG)
      .setHorizontalAlignment('left').setVerticalAlignment('middle')
      .setBorder(null, null, true, null, false, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(r, 1).setBackground(C.HEADER_BG);
    sheet.setRowHeight(r, 24); r++;
    r++;

    if (!items.length) {
      sheet.getRange(r, 2, 1, 3).merge().setValue('(không có key task trong kỳ này)')
        .setFontFamily('Aptos').setFontSize(11).setFontStyle('italic')
        .setFontColor(C.TEXT).setWrap(true);
      r++; r++; r++;
      return;
    }



    // ── Detail block ──────────────────────────────────────────────────────
    items.forEach(function(it, idx) {
      var keyTask = String(it.row[colIdx[MRPT_CONFIG.HEADERS.KEY_TASK]] || '').trim();
      var pic     = String(it.row[colIdx[MRPT_CONFIG.HEADERS.PIC]]      || '').trim();
      var status  = String(it.row[colIdx[MRPT_CONFIG.HEADERS.STATUS]]   || '').trim();
      var titleLine = (idx + 1) + '/' + total + '  ▸  ' + keyTask + (pic ? '   —   PIC: ' + pic : '');

      // ── Dòng tiêu đề key task (kèm status inline) ───────────────────
      var statusTag = status ? '  [' + status + ']' : '';
      var fullTitle = titleLine + statusTag;
      var sStyle = status ? mrpt_getStatusStyle(status) : null;
      sheet.getRange(r, 2, 1, 3).merge().setValue(fullTitle)
        .setFontFamily('Aptos').setFontSize(11).setFontWeight('bold')
        .setFontColor(C.TEXT).setBackground(C.HEADER_BG)
        .setHorizontalAlignment('left').setWrap(true);
      sheet.setRowHeight(r, 22); r++;

      // ── Header PLAN | RESULT ──────────────────────────────────────────
      sheet.getRange(r, 2).setValue('Plan')
        .setFontFamily('Aptos').setFontSize(11).setFontWeight('bold')
        .setFontColor(C.TABLE_FG).setBackground(C.TABLE_HEAD)
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setBorder(true, true, true, true, false, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
      sheet.getRange(r, 3).setValue('')
        .setBackground(C.WHITE).setBorder(false, false, false, false, false, false);
      sheet.getRange(r, 4).setValue('Result')
        .setFontFamily('Aptos').setFontSize(11).setFontWeight('bold')
        .setFontColor(C.TABLE_FG).setBackground(C.TABLE_HEAD)
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setBorder(true, true, true, true, false, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
      sheet.setRowHeight(r, 22); r++;

      // ── Nội dung PLAN (col B) và RESULT (col D) song song ─────────────
      mrpt_writeCellContent(source, sheet.getRange(r, 2),
        it.sourceRow, colIdx[MRPT_CONFIG.HEADERS.PLAN] + 1);
      sheet.getRange(r, 2)
        .setBorder(null, true, true, true, false, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
      sheet.getRange(r, 3).setValue('')
        .setBackground(C.WHITE).setBorder(false, false, false, false, false, false);
      mrpt_writeCellContent(source, sheet.getRange(r, 4),
        it.sourceRow, colIdx[MRPT_CONFIG.HEADERS.RESULT] + 1);
      sheet.getRange(r, 4)
        .setBorder(null, true, true, true, false, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
      r++;
      r++; // khoảng cách trước item tiếp theo
    });

    r++; // khoảng cách giữa sections
  });

  return r;
}

/*****************************************************************************
 * HELPER: ghi nội dung cell (RichText nếu có, fallback plain text)
 *****************************************************************************/
function mrpt_writeCellContent(source, dstCell, srcRow, srcCol) {
  var C = MRPT_CONFIG.COLOR;
  var srcCell = source.getRange(srcRow, srcCol);
  var rtv = srcCell.getRichTextValue();
  if (rtv && rtv.getText() !== '') {
    dstCell.setRichTextValue(rtv);
  } else {
    var val = srcCell.getValue();
    if (val !== '' && val !== null && val !== undefined) dstCell.setValue(val);
  }
  dstCell.setFontFamily('Aptos').setFontSize(11)
    .setVerticalAlignment('top').setHorizontalAlignment('left').setWrap(true);
  mrpt_ensureMinFontSize(dstCell, 11);
  mrpt_linkifyUrls(dstCell);
}

/*****************************************************************************
 * STATUS STYLE
 *****************************************************************************/
function mrpt_getStatusStyle(status) {
  var key = status.toLowerCase().split('%')[0].trim(); // e.g. "in progress  75" → "in progress"
  var styles = MRPT_CONFIG.STATUS_STYLE;
  if (key === 'completed') return styles['completed'];
  if (key.indexOf('in progress') === 0) return styles['in progress'];
  if (key === 'not started') return styles['not started'];
  return styles['default'];
}

/*****************************************************************************
 * FOOTER HYPERLINK
 *****************************************************************************/
function mrpt_writeFooterHyperlink(sheet, r) {
  var C = MRPT_CONFIG.COLOR;
  var cell = sheet.getRange(r, 2, 1, 3).merge();
  var rtv = SpreadsheetApp.newRichTextValue()
    .setText('🔗 View Google Sheet')
    .setLinkUrl(MRPT_CONFIG.SHEET_URL)
    .setTextStyle(SpreadsheetApp.newTextStyle()
      .setFontFamily('Aptos').setFontSize(10)
      .setForegroundColor(C.LINK).setUnderline(true).build())
    .build();
  cell.setRichTextValue(rtv).setHorizontalAlignment('center');
}

/*****************************************************************************
 * EXPORT PDF
 *****************************************************************************/
function mrpt_exportAsPdf(tempSS, period, reportType) {
  var ssId = tempSS.getId();
  var params = {
    format: 'pdf', size: 'A4', portrait: 'true', fitw: 'true',
    top_margin: '0.4', bottom_margin: '0.4',
    left_margin: '0.4', right_margin: '0.4',
    horizontal_alignment: 'LEFT',
    gridlines: 'false', printtitle: 'false', sheetnames: 'false'
  };
  var qs = Object.keys(params).map(function(k) { return k + '=' + params[k]; }).join('&');
  var url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' + qs;
  var lastErr = '';
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var res = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        var fname = (reportType === 'Report' ? 'Monthly Report_' : 'Monthly Plan_') +
                    MRPT_CONFIG.TEAM_SHORT + '_' +
                    mrpt_formatPeriodForFilename(period) + '.pdf';
        return res.getBlob().setName(fname);
      }
      lastErr = 'HTTP ' + res.getResponseCode() + ' (attempt ' + attempt + ')';
    } catch (e) {
      lastErr = e.message + ' (attempt ' + attempt + ')';
    }
    if (attempt < 3) Utilities.sleep(3000);
  }
  throw new Error('Export PDF thất bại sau 3 lần thử: ' + lastErr);
}

/*****************************************************************************
 * EMAIL
 *****************************************************************************/
function mrpt_sendEmail(email, attachments, period, isQuarter) {
  var label     = mrpt_formatPeriodDisplay(period);
  var nextLabel = !isQuarter ? mrpt_formatPeriodDisplay(mrpt_getNextMonth(period)) : '';
  var subject   = '[Marketing & Product] ' +
                  (isQuarter ? 'Quarterly Report' : 'Monthly Report') + ' - ' + label;
  var body =
    '<div style="font-family:Aptos,Segoe UI,Arial,sans-serif;color:#073763;max-width:640px">' +
      '<h2 style="margin:0 0 4px">' + (isQuarter ? 'Quarterly Report' : 'Monthly Report') + '</h2>' +
      '<p style="margin:0 0 4px;font-size:13px">Issued by: ' + MRPT_CONFIG.ISSUED_BY + '</p>' +
      '<p style="margin:0 0 20px;color:#5B7FA8;font-size:13px">' + MRPT_CONFIG.DEPARTMENT + '</p>' +
      '<p>Xin chào,</p>' +
      '<p>Đính kèm là <b>' + (isQuarter ? 'báo cáo quý ' + period : 'báo cáo tháng ' + label) +
        '</b> của <b>Marketing Team & Product Team</b>.</p>' +
      (isQuarter
        ? '<ul><li><b>Quarterly Report</b> — Báo cáo quý ' + period + '</li></ul>'
        : '<ul><li><b>Monthly Report</b> — Báo cáo tháng ' + label + '</li>' +
          '<li><b>Monthly Plan</b> — Kế hoạch tháng ' + nextLabel + '</li></ul>') +
      '<p style="margin-top:20px"><a href="' + MRPT_CONFIG.SHEET_URL +
        '" style="color:#1155CC;font-weight:600">🔗 Mở Google Sheet nguồn</a></p>' +
      '<hr style="border:0;border-top:1px solid #CFE2F3;margin:24px 0">' +
      '<p style="font-size:12px;color:#5B7FA8;margin:0">' +
        'Generated automatically by MMH Monthly Report System · ' +
        new Date().toLocaleString('vi-VN') + '</p>' +
    '</div>';
  MailApp.sendEmail({
    to: email, subject: subject, htmlBody: body,
    attachments: attachments, name: 'MMH Monthly Report'
  });
}

/*****************************************************************************
 * HELPERS
 *****************************************************************************/
function mrpt_linkifyUrls(cell) {
  var rtv = cell.getRichTextValue();
  if (!rtv) return;
  var text = rtv.getText();
  if (!text) return;
  var urlRegex = /https?:\/\/[^\s<>"'\)\]]+/g;
  var matches = [], m;
  while ((m = urlRegex.exec(text)) !== null) {
    var url = m[0], trim = 0;
    while (url.length > 0 && /[.,;:!?)]/.test(url[url.length - 1])) { url = url.slice(0, -1); trim++; }
    if (url.length > 0) matches.push({ start: m.index, end: m.index + m[0].length - trim, url: url });
  }
  if (!matches.length) return;
  var builder = SpreadsheetApp.newRichTextValue().setText(text);
  var runs = rtv.getRuns();
  runs.forEach(function(run) {
    var s = run.getTextStyle();
    if (s) builder.setTextStyle(run.getStartIndex(), run.getEndIndex(), s);
    var lu = run.getLinkUrl();
    if (lu) builder.setLinkUrl(run.getStartIndex(), run.getEndIndex(), lu);
  });
  matches.forEach(function(match) {
    var orig = null;
    for (var i = 0; i < runs.length; i++) {
      if (runs[i].getStartIndex() <= match.start && runs[i].getEndIndex() >= match.end) {
        orig = runs[i].getTextStyle(); break;
      }
    }
    var sb = orig
      ? orig.copy().setForegroundColor(MRPT_CONFIG.COLOR.LINK).setUnderline(true)
      : SpreadsheetApp.newTextStyle().setForegroundColor(MRPT_CONFIG.COLOR.LINK).setUnderline(true);
    builder.setTextStyle(match.start, match.end, sb.build());
    builder.setLinkUrl(match.start, match.end, match.url);
  });
  cell.setRichTextValue(builder.build());
}

function mrpt_ensureMinFontSize(range, minSize) {
  var sizes = range.getFontSizes();
  var changed = false;
  for (var i = 0; i < sizes.length; i++)
    for (var j = 0; j < sizes[i].length; j++)
      if (!sizes[i][j] || sizes[i][j] < minSize) { sizes[i][j] = minSize; changed = true; }
  if (changed) range.setFontSizes(sizes);
}

function mrpt_escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/*****************************************************************************
 * DEBUG — Chạy hàm này để xem sheet có gì ở các hàng đầu
 * Extensions → Apps Script → chọn "mrpt_debug_headers" → Run
 *****************************************************************************/
function mrpt_debug_headers() {
  var sh = SpreadsheetApp.getActive().getSheetByName(MRPT_CONFIG.SOURCE_SHEET_NAME);
  if (!sh) { SpreadsheetApp.getUi().alert('Không tìm thấy sheet: ' + MRPT_CONFIG.SOURCE_SHEET_NAME); return; }
  var lastCol = sh.getLastColumn();
  var msg = 'Sheet: ' + MRPT_CONFIG.SOURCE_SHEET_NAME + '\n';
  msg += 'lastColumn = ' + lastCol + '\n\n';
  // In ra nội dung 8 hàng đầu
  for (var r = 1; r <= 8; r++) {
    var vals = sh.getRange(r, 1, 1, Math.min(lastCol, 15)).getValues()[0];
    var line = 'Row ' + r + ': ';
    vals.forEach(function(v, i) {
      if (v !== '' && v !== null) line += '[col' + (i+1) + '="' + String(v).substring(0,30) + '"] ';
    });
    msg += line + '\n';
  }
  SpreadsheetApp.getUi().alert(msg);
}