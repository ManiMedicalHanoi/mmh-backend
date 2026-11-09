// ===========================
// BUSINESS TRIP MANAGEMENT SYSTEM - ENHANCED VERSION
// v3.1 (10/2026) – Review & fix: domain email, Miew, BATH→THB, isHOD batch read,
//                  HOD confirm counter, escape HTML, status chỉ cập nhật khi gửi mail OK
// ===========================

// Configuration
const CONFIG = {
  SHEET_NAME: 'MMH Travel report',
  MASTER_SHEET: 'Master',
  HEADER_ROW: 3,
  DATA_START_ROW: 4,
  PARENT_FOLDER_ID: '1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',
  COMPANY_DOMAIN: 'manimedicalhanoi.com',
  CURRENCY_LABEL: 'THB',
  REPORT_TO_EMAIL: 's-takahashi@mani.inc', // Shuhei-san – người nhận chính của Report email
  COLUMNS: {
    NO: 'B',
    MONTH: 'C',
    PIC: 'D',
    START_DATE: 'E',
    FINISH_DATE: 'F',
    WORKING_DATE: 'G',
    DESTINATION: 'H',
    CO_TRAVELER: 'I',
    PURPOSE: 'J',
    EXPECTED_RESULT: 'K',
    ESTIMATED_COST: 'L',
    TOTAL_COST: 'M',
    SCHEDULE: 'N',
    FOLDER_NAME: 'O',
    FOLDER_LINK: 'P',
    RESULT: 'Q',
    APPROVAL_STATUS: 'R',
    MANAGER_COMMENT: 'S',
    ACTUAL_REPORT_DATE: 'T',
    REPORT_DEADLINE: 'U',
    DEADLINE_DIFF: 'V',
    CHECK_DEADLINE: 'W',
    EMAIL_PIC: 'X',
    EMAIL_HOD: 'Y',
    EMAIL_DIRECTOR: 'Z',
    EMAIL_CC: 'AA'
  }
};

// Số cột đọc từ B → AB (27 cột). rowData[0] = cột B.
const READ_WIDTH = 27;

// ===========================
// PIC MAPPING (email → tên PIC)  – nguồn duy nhất
// Tên PIC phải TRÙNG KHỚP với danh sách PIC ở sheet Master (cột E)
// ===========================
const PIC_MAPPING = {
  'manithailand@manimedicalhanoi.com': 'Dao',
  'manithailand1@manimedicalhanoi.com': 'Sui',
  'manithailand2@manimedicalhanoi.com': 'Somchai',
  'manithailand4@manimedicalhanoi.com': 'Miew',          // ✅ MỚI 10/2026
  'tt.tuyen@manimedicalhanoi.com': 'Tuyen',
  'nt.ha@manimedicalhanoi.com': 'Nguyen Ha',
  'marketing.mmh@manimedicalhanoi.com': 'Thuong',
  'marketing.mmh2@manimedicalhanoi.com': 'Trang',
  'marketing.mmh1@manimedicalhanoi.com': 'Duc Anh',
  'mmh.product@manimedicalhanoi.com': 'Giang',
  'mmh.admin@manimedicalhanoi.com': 'Hau',
  'mmh.danang@manimedicalhanoi.com': 'Vinh',
  'mmh.hanoi@manimedicalhanoi.com': 'Minh Viet',
  'mmh.saigon@manimedicalhanoi.com': 'Phuong',
  'mmh.hanoi2@manimedicalhanoi.com': 'Viet Ha',
  'mmh.saigon2@manimedicalhanoi.com': 'Khang',
  'vtt.hoa@manimedicalhanoi.com': 'Hoa',
  'mmh.hanoi1@manimedicalhanoi.com': 'Ngoc',
  'ntt.hang@manimedicalhanoi.com': 'Hang',
  'mmh.order@manimedicalhanoi.com': 'Dam Viet',
  'ruby180924@gmail.com': 'Test'
};

// ===========================
// MENU CREATION
// ===========================

/**
 * Chạy tự động khi mở Google Sheet
 */
function onOpen() {
  console.log('onOpen() triggered at: ' + new Date().toISOString());

  try {
    const ui = SpreadsheetApp.getUi();
    const userEmail = Session.getActiveUser().getEmail();
    console.log('User Email: ' + userEmail);

    // PIC Menu (cho tất cả users)
    ui.createMenu('PIC Menu')
      .addItem('📖 User Guide', 'showPICUserGuide')
      .addSeparator()
      .addItem('Business Trip Plan & Report', 'showBusinessTripDialog')
      .addToUi();

    // HOD Menu nếu có quyền
    try {
      if (isHOD(userEmail)) {
        ui.createMenu('HOD Menu')
          .addItem('📖 User Guide', 'showHODUserGuide')
          .addSeparator()
          .addItem('Business Trip Approval', 'showHODApprovalDialog')
          .addToUi();
        console.log('✅ HOD Menu created');
      }
    } catch (hodError) {
      console.log('❌ ERROR creating HOD Menu: ' + hodError.message);
    }

  } catch (error) {
    console.log('❌ CRITICAL ERROR in onOpen(): ' + error.message);
    SpreadsheetApp.getUi().alert(
      'Error Loading Menu',
      'An error occurred while loading the menu:\n\n' + error.message +
      '\n\nPlease check Apps Script logs for details.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Kiểm tra user có được hiện HOD Menu không
 * Logic (giữ nguyên như V2): Super Admin, hoặc email xuất hiện ở cột X / Y / Z / AA
 * ✅ v3.1: đọc 1 lần bằng getValues() thay vì đọc từng ô (tránh timeout khi onOpen)
 */
function isHOD(userEmail) {
  try {
    if (!userEmail) return false;
    const normalizedUserEmail = userEmail.toLowerCase().trim();

    const superAdminEmail = 'nt.ha@manimedicalhanoi.com';
    if (normalizedUserEmail === superAdminEmail) return true;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return false;

    const lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.DATA_START_ROW) return false;

    const startCol = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC);   // X
    const endCol = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC);      // AA
    const values = sheet.getRange(CONFIG.DATA_START_ROW, startCol,
                                  lastRow - CONFIG.DATA_START_ROW + 1, endCol - startCol + 1).getValues();

    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const cell = values[i][j];
        if (!cell) continue;
        // Cột AA có thể chứa nhiều email ngăn cách bởi ";" hoặc ","
        const emails = cell.toString().toLowerCase().split(/[;,]/).map(e => e.trim());
        if (emails.indexOf(normalizedUserEmail) !== -1) return true;
      }
    }
    return false;

  } catch (error) {
    Logger.log('❌ Error in isHOD: ' + error.message);
    return false;
  }
}

// ===========================
// MAIN DIALOG FUNCTION
// ===========================

function showBusinessTripDialog() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      SpreadsheetApp.getUi().alert('Error: Sheet "' + CONFIG.SHEET_NAME + '" not found!');
      return;
    }

    const picData = getPICData(sheet, userEmail);

    if (picData.rows.length === 0) {
      SpreadsheetApp.getUi().alert(
        'No business trip found',
        'No business trip records found for your email: ' + userEmail + '\n\n' +
        'Please add a new row in sheet "' + CONFIG.SHEET_NAME + '" first:\n' +
        '• Column D (PIC): select your name\n' +
        '• Fill Start Date, Finish Date, Destination, Purpose...\n' +
        'Then open this menu again.\n\n' +
        'If your email still does not appear in column X, please contact the admin.',
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const masterData = getMasterData(ss);
    const htmlContent = getHtmlContent(picData, masterData, userEmail);
    const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(1920)
      .setHeight(1000);

    SpreadsheetApp.getUi().showModalDialog(html, 'Business Trip Plan & Report');

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    Logger.log('Error in showBusinessTripDialog: ' + error.message);
  }
}

// ===========================
// HOD APPROVAL DIALOG
// ===========================

function showHODApprovalDialog() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();

    if (!isHOD(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied',
        'You do not have permission to access the HOD Approval Dashboard.',
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const approvalData = getHODApprovalData(sheet, userEmail);

    if (approvalData.rows.length === 0) {
      SpreadsheetApp.getUi().alert('No Pending Approvals',
        'There are no business trips pending your approval at this time.',
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const masterData = getMasterData(ss);
    const htmlContent = getHtmlContentForHOD(approvalData, masterData, userEmail);
    const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(2400)
      .setHeight(1200);

    SpreadsheetApp.getUi().showModalDialog(html, 'Business Trip Management - HOD Dashboard');

  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    Logger.log('Error in showHODApprovalDialog: ' + error.message);
  }
}

/**
 * Chuyển 1 dòng dữ liệu (đọc từ cột B, width 27) thành object
 */
function rowToObject(rowData, actualRow) {
  return {
    row: actualRow,
    no: rowData[0] || '',
    month: rowData[1] || '',
    pic: rowData[2] || '',
    startDate: formatDate(rowData[3]),
    finishDate: formatDate(rowData[4]),
    workingDate: rowData[5] || '',
    destination: rowData[6] || '',
    coTraveler: rowData[7] || '',
    purpose: rowData[8] || '',
    expectedResult: rowData[9] || '',
    estimatedCost: rowData[10] || '',
    totalCost: rowData[11] || '',
    schedule: rowData[12] || '',
    folderName: rowData[13] || '',
    folderLink: rowData[14] || '',
    result: rowData[15] || '',
    approvalStatus: rowData[16] || '',
    managerComment: rowData[17] || '',
    actualReportDate: formatDate(rowData[18]),
    reportDeadline: formatDate(rowData[19]),
    deadlineDiff: rowData[20] || '',
    checkDeadline: rowData[21] || '',
    emailPIC: rowData[22] || '',      // X
    emailHOD: rowData[23] || '',      // Y
    emailDirector: rowData[24] || '', // Z
    emailCC: rowData[25] || ''        // AA
  };
}

/**
 * Lấy TẤT CẢ business trips thuộc HOD (cột Y = email HOD)
 */
function getHODApprovalData(sheet, hodEmail) {
  const lastRow = sheet.getLastRow();
  const rows = [];
  if (lastRow < CONFIG.DATA_START_ROW) return { rows: rows, hodEmail: hodEmail };

  const data = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, READ_WIDTH).getValues();
  const hodEmailLower = hodEmail.toLowerCase().trim();

  for (let i = 0; i < data.length; i++) {
    const emailHOD = data[i][23]; // Cột Y
    if (emailHOD && emailHOD.toString().toLowerCase().trim() === hodEmailLower) {
      rows.push(rowToObject(data[i], CONFIG.DATA_START_ROW + i));
    }
  }

  Logger.log('Total trips found for HOD ' + hodEmail + ': ' + rows.length);
  return { rows: rows, hodEmail: hodEmail };
}

/**
 * HTML cho HOD Approval Dialog – 2 tabs: Approval + View Reports
 */
function getHtmlContentForHOD(approvalData, masterData, hodEmail) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Aptos, Calibri, sans-serif;
      background: white;
      font-size: 16px;
      overflow: hidden;
      height: 100vh;
    }

    .container { display: flex; flex-direction: column; height: 100vh; padding: 8px 12px; }

    h2 {
      margin: 0 0 8px 0; padding: 8px 0; font-weight: bold; font-size: 28px;
      border-bottom: 2px solid black;
    }

    .tabs-container { display: flex; border-bottom: 2px solid black; margin-bottom: 8px; }

    .tab-button {
      flex: 1; padding: 10px; background: white; border: 2px solid black; border-bottom: none;
      cursor: pointer; font-size: 18px; font-weight: bold; font-family: Aptos, Calibri, sans-serif;
      transition: all 0.2s;
    }
    .tab-button.active { background: #87CEEB; color: white; }
    .tab-button:hover:not(.active) { background: #f0f0f0; }

    .tab-content { display: none; flex: 1; overflow: hidden; flex-direction: column; }
    .tab-content.active { display: flex; }

    .stats-section { background: #f5f5f5; border: 2px solid black; padding: 8px 12px; margin-bottom: 8px; }
    .stats-section h3 { margin: 0 0 6px 0; font-weight: bold; font-size: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .stat-card { background: #E8E8E8; border: 2px solid #87CEEB; padding: 8px; text-align: center; }
    .stat-label { font-size: 14px; margin-bottom: 4px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #000; }

    .filter-section {
      background: #f5f5f5; border: 2px solid black; padding: 8px 12px; margin-bottom: 8px;
      display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;
    }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filter-group label { font-size: 15px; font-weight: bold; }
    .filter-group select {
      padding: 6px 10px; border: 2px solid black; font-size: 16px;
      font-family: Aptos, Calibri, sans-serif; min-width: 140px;
    }

    .action-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .select-all-btn {
      background: #87CEEB; color: white; padding: 8px 16px; border: 2px solid black;
      font-size: 16px; font-weight: bold; font-family: Aptos, Calibri, sans-serif; cursor: pointer;
    }
    .select-all-btn:hover { background: #5DADE2; }
    #selectedCount1 { font-size: 16px; font-weight: bold; color: #000; }

    .table-container { flex: 1; overflow: auto; border: 2px solid black; background: white; }
    table { width: 100%; border-collapse: collapse; font-size: 17px; }
    thead { position: sticky; top: 0; background: #87CEEB; z-index: 10; }
    th {
      padding: 10px 8px; text-align: left; font-weight: bold; border: 1px solid black;
      background: #87CEEB; color: white; font-size: 18px;
    }
    td { padding: 8px; border: 1px solid #ddd; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tbody tr:hover { background: #e3f2fd; }

    input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
    select.approval-select {
      width: 100%; padding: 6px; border: 2px solid black; font-size: 15px; font-family: Aptos, Calibri, sans-serif;
    }
    textarea.comment-field {
      width: 100%; min-height: 50px; padding: 6px; border: 2px solid black; font-size: 15px;
      font-family: Aptos, Calibri, sans-serif; resize: vertical;
    }

    .button-container { display: flex; justify-content: flex-start; gap: 12px; padding: 10px 0; margin-top: 8px; }
    .primary-btn {
      background: #87CEEB; color: white; padding: 10px 24px; border: 2px solid black;
      font-size: 17px; font-weight: bold; font-family: Aptos, Calibri, sans-serif; cursor: pointer;
    }
    .primary-btn:hover:not(:disabled) { background: #5DADE2; }
    .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .secondary-btn {
      background: white; color: black; padding: 10px 24px; border: 2px solid black;
      font-size: 17px; font-weight: bold; font-family: Aptos, Calibri, sans-serif; cursor: pointer;
    }
    .secondary-btn:hover { background: #f0f0f0; }
    .email-checkbox {
      display: flex; align-items: center; gap: 8px; font-size: 16px; cursor: pointer;
      padding: 8px 12px; background: white; border: 2px solid #87CEEB;
    }
    .email-checkbox input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }

    .report-content {
      white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; padding: 8px;
      background: #f9f9f9; border: 1px solid #ddd; max-height: 150px; overflow-y: auto; font-size: 15px;
    }

    .text-center { text-align: center; }
    .empty-state { text-align: center; padding: 40px; color: #666; font-size: 16px; }
    .folder-link { color: #0066cc; text-decoration: underline; font-size: 15px; }
    .folder-link:hover { font-weight: bold; color: #004499; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Business Trip Management - HOD Dashboard</h2>

    <div class="tabs-container">
      <button class="tab-button active" onclick="switchTab('approval')">APPROVAL BUSINESS TRIP</button>
      <button class="tab-button" onclick="switchTab('reports')">VIEW BUSINESS TRIP REPORT</button>
    </div>

    <!-- TAB 1: APPROVAL -->
    <div id="approvalTab" class="tab-content active">
      <div class="stats-section">
        <h3>Trip Statistics (Filtered)</h3>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Total Trips</div><div class="stat-value" id="statTotal1">0</div></div>
          <div class="stat-card"><div class="stat-label">Approved</div><div class="stat-value" id="statApproved1">0</div></div>
          <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" id="statPending1">0</div></div>
          <div class="stat-card"><div class="stat-label">Rejected</div><div class="stat-value" id="statRejected1">0</div></div>
          <div class="stat-card"><div class="stat-label">Total Cost</div><div class="stat-value" id="statTotalCost1">0</div></div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label>Approval Status</label>
          <select id="filterApprovalStatus" onchange="applyFilters1()">
            <option value="All">All</option>
            <option value="Already sent propose email" selected>Already sent propose email</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="New">New</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Month</label>
          <select id="filterMonth1" onchange="applyFilters1()"><option value="All">All</option></select>
        </div>
        <div class="filter-group">
          <label>PIC</label>
          <select id="filterPIC1" onchange="applyFilters1()"><option value="All">All</option></select>
        </div>
        <div class="filter-group">
          <label>Destination</label>
          <select id="filterDestination1" onchange="applyFilters1()"><option value="All">All</option></select>
        </div>
      </div>

      <div class="action-bar">
        <button class="select-all-btn" onclick="toggleSelectAll1()">Select/Deselect All</button>
        <span id="selectedCount1">Selected: 0</span>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">Select</th>
              <th style="width: 50px;">Row</th>
              <th style="width: 90px;">Month</th>
              <th style="width: 100px;">PIC</th>
              <th style="min-width: 120px;">Start Date</th>
              <th style="min-width: 120px;">Finish Date</th>
              <th style="min-width: 150px;">Destination</th>
              <th style="min-width: 200px;">Purpose</th>
              <th style="min-width: 120px;">Est. Cost</th>
              <th style="min-width: 120px;">Total Cost</th>
              <th style="width: 100px;">Folder</th>
              <th style="min-width: 180px;">Approval Decision</th>
              <th style="min-width: 250px;">HOD Comment</th>
            </tr>
          </thead>
          <tbody id="tableBody1"></tbody>
        </table>
      </div>

      <div class="button-container">
        <label class="email-checkbox">
          <input type="checkbox" id="sendEmailCheck" checked>
          Send email notifications to PIC
        </label>
        <button class="primary-btn" id="processBtn" onclick="submitApprovalDecisions()">Process Selected Trips</button>
        <button class="secondary-btn" onclick="google.script.host.close()">Close</button>
      </div>
    </div>

    <!-- TAB 2: VIEW REPORTS -->
    <div id="reportsTab" class="tab-content">
      <div class="stats-section">
        <h3>Report Statistics (Filtered)</h3>
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="stat-card"><div class="stat-label">Total Completed Trips</div><div class="stat-value" id="statTotalReports">0</div></div>
          <div class="stat-card"><div class="stat-label">Reports Submitted</div><div class="stat-value" id="statReportsSubmitted">0</div></div>
          <div class="stat-card"><div class="stat-label">On-Time Rate</div><div class="stat-value" id="statOnTimeRate">0%</div></div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label>Month</label>
          <select id="filterMonth2" onchange="applyFilters2()"><option value="All">All</option></select>
        </div>
        <div class="filter-group">
          <label>PIC</label>
          <select id="filterPIC2" onchange="applyFilters2()"><option value="All">All</option></select>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">Row</th>
              <th style="width: 90px;">Month</th>
              <th style="width: 100px;">PIC</th>
              <th style="min-width: 150px;">Destination</th>
              <th style="min-width: 120px;">Start Date</th>
              <th style="min-width: 120px;">Finish Date</th>
              <th style="min-width: 200px;">Purpose</th>
              <th style="min-width: 400px;">Report Result</th>
            </tr>
          </thead>
          <tbody id="tableBody2"></tbody>
        </table>
      </div>

      <div class="button-container">
        <button class="secondary-btn" onclick="google.script.host.close()">Close</button>
      </div>
    </div>
  </div>

  <script>
    const allRows = ${JSON.stringify(approvalData.rows)};
    const hodEmail = ${JSON.stringify(hodEmail)};
    let filteredRows1 = [...allRows];
    let filteredRows2 = [...allRows];

    function esc(text) {
      if (text === null || text === undefined) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    }

    function isOnTime(v) {
      const s = (v || '').toString().trim().toLowerCase();
      return s === 'on time' || s === 'on-time' || s === 'ok' || s === 'early';
    }

    function switchTab(tabName) {
      document.getElementById('approvalTab').classList.remove('active');
      document.getElementById('reportsTab').classList.remove('active');
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

      if (tabName === 'approval') {
        document.getElementById('approvalTab').classList.add('active');
        document.querySelectorAll('.tab-button')[0].classList.add('active');
      } else {
        document.getElementById('reportsTab').classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.add('active');
      }
    }

    function fillSelect(id, values) {
      const sel = document.getElementById(id);
      values.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        sel.appendChild(option);
      });
    }

    // ==================== TAB 1 ====================
    function populateFilters1() {
      fillSelect('filterMonth1', [...new Set(allRows.map(r => r.month).filter(Boolean))]);
      fillSelect('filterPIC1', [...new Set(allRows.map(r => r.pic).filter(Boolean))]);
      fillSelect('filterDestination1', [...new Set(allRows.map(r => r.destination).filter(Boolean))]);
    }

    function applyFilters1() {
      const statusFilter = document.getElementById('filterApprovalStatus').value;
      const monthFilter = document.getElementById('filterMonth1').value;
      const picFilter = document.getElementById('filterPIC1').value;
      const destFilter = document.getElementById('filterDestination1').value;

      filteredRows1 = allRows.filter(row => {
        let matchStatus = true;
        if (statusFilter !== 'All') {
          const rowStatus = (row.approvalStatus || '').toString().trim();
          if (statusFilter === 'Already sent propose email') {
            matchStatus = (rowStatus === 'Already sent propose email' || rowStatus === 'Already sent proposal email');
          } else if (statusFilter === 'New') {
            matchStatus = (rowStatus === '' || rowStatus === 'Not Yet');
          } else {
            matchStatus = (rowStatus === statusFilter);
          }
        }
        const matchMonth = monthFilter === 'All' || String(row.month) === monthFilter;
        const matchPIC = picFilter === 'All' || row.pic === picFilter;
        const matchDest = destFilter === 'All' || row.destination === destFilter;
        return matchStatus && matchMonth && matchPIC && matchDest;
      });

      renderTable1();
      updateStatistics1();
    }

    function renderTable1() {
      const tbody = document.getElementById('tableBody1');
      tbody.innerHTML = '';

      if (filteredRows1.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state">No trips found matching the selected filters</td></tr>';
        updateSelectedCount();
        return;
      }

      filteredRows1.forEach(row => {
        const tr = document.createElement('tr');
        const folderCell = row.folderLink ?
          \`<a href="\${esc(row.folderLink)}" target="_blank" class="folder-link">Open</a>\` : 'N/A';

        tr.innerHTML = \`
          <td class="text-center">
            <input type="checkbox" class="trip-checkbox" data-row="\${row.row}" onchange="updateSelectedCount()">
          </td>
          <td class="text-center">\${row.row}</td>
          <td>\${esc(row.month)}</td>
          <td>\${esc(row.pic)}</td>
          <td>\${esc(row.startDate)}</td>
          <td>\${esc(row.finishDate)}</td>
          <td>\${esc(row.destination)}</td>
          <td>\${esc(row.purpose)}</td>
          <td>\${esc(row.estimatedCost)}</td>
          <td>\${esc(row.totalCost)}</td>
          <td class="text-center">\${folderCell}</td>
          <td>
            <select class="approval-select" id="decision_\${row.row}">
              <option value="">-- Select --</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </td>
          <td>
            <textarea class="comment-field" id="comment_\${row.row}"
              placeholder="Enter comment (required for rejection)"></textarea>
          </td>
        \`;
        tbody.appendChild(tr);
      });

      updateSelectedCount();
    }

    function updateStatistics1() {
      const total = filteredRows1.length;
      const approved = filteredRows1.filter(r => r.approvalStatus === 'Approved').length;
      const pending = filteredRows1.filter(r => r.approvalStatus === 'Already sent propose email' ||
                                                 r.approvalStatus === 'Already sent proposal email').length;
      const rejected = filteredRows1.filter(r => r.approvalStatus === 'Rejected').length;
      const totalCost = filteredRows1.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);

      document.getElementById('statTotal1').textContent = total;
      document.getElementById('statApproved1').textContent = approved;
      document.getElementById('statPending1').textContent = pending;
      document.getElementById('statRejected1').textContent = rejected;
      document.getElementById('statTotalCost1').textContent = totalCost.toLocaleString('en-US');
    }

    function toggleSelectAll1() {
      const checkboxes = document.querySelectorAll('.trip-checkbox');
      const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
      updateSelectedCount();
    }

    function updateSelectedCount() {
      const checked = document.querySelectorAll('.trip-checkbox:checked').length;
      document.getElementById('selectedCount1').textContent = 'Selected: ' + checked;
    }

    function submitApprovalDecisions() {
      const checkboxes = document.querySelectorAll('.trip-checkbox:checked');

      if (checkboxes.length === 0) {
        alert('Please select at least one trip to process.');
        return;
      }

      const decisions = [];
      let hasError = false;

      for (const checkbox of checkboxes) {
        const rowNum = parseInt(checkbox.dataset.row);
        const decision = document.getElementById('decision_' + rowNum).value;
        const comment = document.getElementById('comment_' + rowNum).value.trim();

        if (!decision) {
          alert('Please select a decision (Approved/Rejected) for row ' + rowNum);
          hasError = true; break;
        }
        if (decision === 'Rejected' && !comment) {
          alert('Comment is required when rejecting trip at row ' + rowNum);
          hasError = true; break;
        }
        const tripData = allRows.find(r => r.row === rowNum);
        if (!tripData) {
          alert('Error: Cannot find trip data for row ' + rowNum);
          hasError = true; break;
        }
        decisions.push({
          rowNumber: rowNum,
          approvalStatus: decision,
          hodComment: comment,
          tripData: tripData
        });
      }

      if (hasError) return;

      const sendEmail = document.getElementById('sendEmailCheck').checked;
      const approvedCount = decisions.filter(d => d.approvalStatus === 'Approved').length;
      const rejectedCount = decisions.filter(d => d.approvalStatus === 'Rejected').length;

      const confirmMsg = 'You are about to process ' + decisions.length + ' trip(s).\\n\\n' +
        'Decisions:\\n- Approved: ' + approvedCount + '\\n- Rejected: ' + rejectedCount + '\\n\\n' +
        'Email notifications: ' + (sendEmail ? 'YES' : 'NO') + '\\n\\nDo you want to continue?';

      if (!confirm(confirmMsg)) return;

      const btn = document.getElementById('processBtn');
      btn.disabled = true;
      btn.textContent = 'Processing...';

      google.script.run
        .withSuccessHandler(onSubmitSuccess)
        .withFailureHandler(onSubmitFailure)
        .handleHODApproval({ decisions: decisions, sendEmail: sendEmail, hodEmail: hodEmail });
    }

    function onSubmitSuccess(result) {
      if (result.success) {
        alert('✅ SUCCESS\\n\\n' + result.message);
        google.script.host.close();
      } else {
        alert('⚠️ WARNING\\n\\n' + result.message);
        location.reload();
      }
    }

    function onSubmitFailure(error) {
      alert('❌ ERROR\\n\\n' + error.message);
      const btn = document.getElementById('processBtn');
      btn.disabled = false;
      btn.textContent = 'Process Selected Trips';
    }

    // ==================== TAB 2 ====================
    function populateFilters2() {
      fillSelect('filterMonth2', [...new Set(allRows.map(r => r.month).filter(Boolean))]);
      fillSelect('filterPIC2', [...new Set(allRows.map(r => r.pic).filter(Boolean))]);
    }

    function applyFilters2() {
      const monthFilter = document.getElementById('filterMonth2').value;
      const picFilter = document.getElementById('filterPIC2').value;

      filteredRows2 = allRows.filter(row => {
        const isCompleted = row.approvalStatus === 'Approved' && row.result;
        const matchMonth = monthFilter === 'All' || String(row.month) === monthFilter;
        const matchPIC = picFilter === 'All' || row.pic === picFilter;
        return isCompleted && matchMonth && matchPIC;
      });

      renderTable2();
      updateStatistics2();
    }

    function renderTable2() {
      const tbody = document.getElementById('tableBody2');
      tbody.innerHTML = '';

      if (filteredRows2.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No completed trips with reports found</td></tr>';
        return;
      }

      filteredRows2.forEach(row => {
        const tr = document.createElement('tr');
        const reportContent = row.result ?
          \`<div class="report-content">\${esc(row.result)}</div>\` : '<em>No report submitted</em>';

        tr.innerHTML = \`
          <td class="text-center">\${row.row}</td>
          <td>\${esc(row.month)}</td>
          <td>\${esc(row.pic)}</td>
          <td>\${esc(row.destination)}</td>
          <td>\${esc(row.startDate)}</td>
          <td>\${esc(row.finishDate)}</td>
          <td>\${esc(row.purpose)}</td>
          <td>\${reportContent}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    function updateStatistics2() {
      // ✅ v3.1: thống kê theo bộ lọc Month/PIC
      const monthFilter = document.getElementById('filterMonth2').value;
      const picFilter = document.getElementById('filterPIC2').value;
      const approvedTrips = allRows.filter(r => r.approvalStatus === 'Approved' &&
        (monthFilter === 'All' || String(r.month) === monthFilter) &&
        (picFilter === 'All' || r.pic === picFilter));

      const totalCompleted = approvedTrips.length;
      const reportsSubmitted = approvedTrips.filter(r => r.result && r.result.toString().trim() !== '').length;
      const onTimeReports = approvedTrips.filter(r => isOnTime(r.checkDeadline)).length;
      const onTimeRate = totalCompleted > 0 ? Math.round((onTimeReports / totalCompleted) * 100) : 0;

      document.getElementById('statTotalReports').textContent = totalCompleted;
      document.getElementById('statReportsSubmitted').textContent = reportsSubmitted;
      document.getElementById('statOnTimeRate').textContent = onTimeRate + '%';
    }

    window.onload = function() {
      populateFilters1();
      populateFilters2();
      document.getElementById('filterApprovalStatus').value = 'Already sent propose email';
      applyFilters1();
      applyFilters2();
    };
  </script>
</body>
</html>
  `;
}

/**
 * Xử lý quyết định approval/rejection từ HOD
 */
function handleHODApproval(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);

  const decisions = data.decisions || [];
  const sendEmail = data.sendEmail || false;
  const hodEmail = data.hodEmail || '';

  let approvedCount = 0;
  let rejectedCount = 0;
  let emailFailed = 0;

  // BƯỚC 1: CẬP NHẬT SHEET
  decisions.forEach(decision => {
    const rowNumber = decision.rowNumber;
    const approvalStatus = decision.approvalStatus;
    const hodComment = decision.hodComment || '';

    sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).setValue(approvalStatus);

    if (hodComment !== '') {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.MANAGER_COMMENT)).setValue(hodComment);
    }

    if (approvalStatus === 'Approved') approvedCount++;
    else if (approvalStatus === 'Rejected') rejectedCount++;
  });

  SpreadsheetApp.flush();

  // BƯỚC 2: GỬI EMAIL
  if (sendEmail) {
    decisions.forEach(decision => {
      try {
        if (decision.approvalStatus === 'Approved') {
          sendApprovalEmail(sheet, decision.tripData, hodEmail);
        } else if (decision.approvalStatus === 'Rejected') {
          sendRejectionEmail(sheet, decision.tripData, decision.hodComment || '', hodEmail);
        }
      } catch (emailError) {
        emailFailed++;
        Logger.log('⚠️ Email error for row ' + decision.rowNumber + ': ' + emailError.message);
      }
    });
  }

  // BƯỚC 3: MESSAGE
  let message = '✅ Approval decisions submitted successfully!\n\n';
  message += '📊 Summary:\n';
  message += '  ✅ Approved: ' + approvedCount + ' trip(s)\n';
  message += '  ❌ Rejected: ' + rejectedCount + ' trip(s)\n';

  if (sendEmail) {
    if (emailFailed === 0) {
      message += '\n📧 Notification emails have been sent to PICs.';
    } else {
      message += '\n⚠️ ' + emailFailed + ' notification email(s) failed. Please check Apps Script logs.';
    }
  }

  return { success: true, message: message };
}

/**
 * Gửi email Approved cho PIC (CC: Director + cột AA)
 */
function sendApprovalEmail(sheet, tripData, hodEmail) {
  const picEmail = (tripData.emailPIC || '').toString().trim();
  const directorEmail = (tripData.emailDirector || '').toString().trim();
  const ccEmails = (tripData.emailCC || '').toString();
  const hodName = getNameFromEmail(hodEmail);
  const picName = tripData.pic || 'PIC';

  if (!picEmail) {
    Logger.log('⚠️ No PIC email found, skipping approval email');
    return;
  }

  let ccList = [];
  if (isValidEmail(directorEmail)) ccList.push(directorEmail);

  if (ccEmails.trim() !== '') {
    const additionalCCs = ccEmails.split(/[;,]/)
      .map(email => email.trim())
      .filter(email => isValidEmail(email));
    ccList = ccList.concat(additionalCCs);
  }

  ccList = [...new Set(ccList.map(e => e.toLowerCase()))].filter(e => e !== picEmail.toLowerCase());
  const finalCC = ccList.join(',');

  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const htmlBody = buildApprovalEmailHTML(tripData, hodName, sheetUrl);

  const subject = '[Approved] Business trip - ' + picName + ' - ' +
                  (tripData.destination || 'Unknown') + ' - From ' +
                  (tripData.startDate || 'N/A') + ' to ' + (tripData.finishDate || 'N/A');

  const mail = {
    to: picEmail,
    subject: subject,
    htmlBody: htmlBody,
    name: 'Mani Medical Hanoi - Business Trip System'
  };
  if (finalCC) mail.cc = finalCC;

  MailApp.sendEmail(mail);
  Logger.log('✅ Approval email sent to: ' + picEmail + ' | CC: ' + finalCC);
}

/**
 * Gửi email Rejected cho PIC (CC: Director)
 */
function sendRejectionEmail(sheet, tripData, hodComment, hodEmail) {
  const picEmail = (tripData.emailPIC || '').toString().trim();
  const directorEmail = (tripData.emailDirector || '').toString().trim();
  const hodName = getNameFromEmail(hodEmail);
  const picName = tripData.pic || 'PIC';

  if (!picEmail) {
    Logger.log('❌ No PIC email found! Skipping rejection email');
    return;
  }

  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const htmlBody = buildRejectionEmailHTML(tripData, hodComment, hodName, sheetUrl);

  const subject = '[Rejected] Business trip - ' + picName + ' - ' +
                  (tripData.destination || 'Unknown') + ' - From ' +
                  (tripData.startDate || 'N/A') + ' to ' + (tripData.finishDate || 'N/A');

  const mail = {
    to: picEmail,
    subject: subject,
    htmlBody: htmlBody,
    name: 'Mani Medical Hanoi - Business Trip System'
  };
  if (isValidEmail(directorEmail)) mail.cc = directorEmail;

  MailApp.sendEmail(mail);
  Logger.log('✅ Rejection email sent to: ' + picEmail);
}

/**
 * Tính số ngày từ startDate → finishDate (dd/MM/yyyy), fallback workingDate
 */
function computeDurationDays(tripData) {
  let durationDays = tripData.workingDate || 'N/A';
  if (tripData.startDate && tripData.finishDate) {
    const start = parseDateFromDDMMYYYY(tripData.startDate);
    const finish = parseDateFromDDMMYYYY(tripData.finishDate);
    if (start && finish) {
      const diffTime = Math.abs(finish - start);
      durationDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  return durationDays;
}

/**
 * HTML Approval Email
 */
function buildApprovalEmailHTML(tripData, hodName, sheetUrl) {
  const picName = tripData.pic || 'PIC';
  const durationDays = computeDurationDays(tripData);

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear all,
              </p>
              <p style="margin: 0 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                This email is to confirm the approval of the business trip proposal. Details are as follows:
              </p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                <li><strong>Traveler:</strong> ${escapeHtmlEmail(picName)}</li>
                <li><strong>Destination:</strong> ${escapeHtmlEmail(tripData.destination || 'N/A')}</li>
                <li><strong>Duration:</strong> ${durationDays} days, from ${escapeHtmlEmail(tripData.startDate || 'N/A')} to ${escapeHtmlEmail(tripData.finishDate || 'N/A')}</li>
                <li><strong>Purpose:</strong> ${escapeHtmlEmail(tripData.purpose || 'N/A')}</li>
                <li><strong>Estimated Cost:</strong> ${escapeHtmlEmail(tripData.estimatedCost || 'N/A')}</li>
              </ul>
              <p style="margin: 0 0 10px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear ${escapeHtmlEmail(picName)}-san,
              </p>
              <p style="margin: 0 0 10px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Please kindly:
              </p>
              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                <li>Complete the Business Trip Report after your trip (within 3 days)</li>
                <li>Submit all receipts (if any) to Accounting by the end of the month</li>
                <li>Upload all related documents to the designated folder</li>
              </ul>
              <p style="margin: 0 0 30px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Thank you.
              </p>
              <p style="margin: 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Best regards,<br/>
                <strong>Ha Nguyen</strong><br/>
                General Director<br/>
                Mani Medical Hanoi Co., Ltd
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cccccc;">
                <tr>
                  <td style="font-family: Aptos, Calibri, sans-serif; font-size: 9pt; color: #666666;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Aptos, Calibri, sans-serif; font-size: 9pt; color: #666666;">
                    ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
}

/**
 * HTML Rejection Email
 */
function buildRejectionEmailHTML(tripData, hodComment, hodName, sheetUrl) {
  const picName = tripData.pic || 'PIC';
  const durationDays = computeDurationDays(tripData);

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear ${escapeHtmlEmail(picName)}-san,
              </p>
              <p style="margin: 0 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                This email is to inform you that your business trip proposal to <strong>${escapeHtmlEmail(tripData.destination || 'N/A')}</strong> for ${durationDays} days, from ${escapeHtmlEmail(tripData.startDate || 'N/A')} to ${escapeHtmlEmail(tripData.finishDate || 'N/A')}, has been rejected. Please find my comment explaining the reason for this decision below:
              </p>
              <div style="margin: 20px 0; padding: 15px; background-color: #f8f8f8; border-left: 4px solid #d32f2f;">
                <p style="margin: 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; font-style: italic;">
                  "${escapeHtmlEmail(hodComment || 'No comment provided')}"
                </p>
              </div>
              <p style="margin: 30px 0 0 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Best regards,<br/>
                <strong>Ha Nguyen</strong><br/>
                General Director<br/>
                Mani Medical Hanoi Co., Ltd
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cccccc;">
                <tr>
                  <td style="font-family: Aptos, Calibri, sans-serif; font-size: 9pt; color: #666666;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Aptos, Calibri, sans-serif; font-size: 9pt; color: #666666;">
                    ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
}

// ===========================
// HTML CONTENT GENERATION – PIC DIALOG
// ===========================

function getHtmlContent(picData, masterData, userEmail) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }

    body { font-family: Aptos, Calibri, sans-serif; margin: 0; padding: 15px; background: white; font-size: 16px; }

    .container { max-width: 100%; height: 100%; display: flex; flex-direction: column; }

    h2 { margin: 0 0 20px 0; font-weight: bold; font-size: 28px; padding-bottom: 15px; border-bottom: 3px solid black; }

    .tabs-container { display: flex; border-bottom: 3px solid black; margin-bottom: 20px; }
    .tab-button {
      flex: 1; padding: 18px; background: white; border: 2px solid black; border-bottom: none;
      cursor: pointer; font-size: 18px; font-weight: bold; font-family: Aptos, Calibri, sans-serif;
    }
    .tab-button.active { background: #87CEEB; color: white; }

    .tab-content { display: none; flex: 1; overflow: auto; }
    .tab-content.active { display: flex; flex-direction: column; }

    .stats-section { background: #f5f5f5; border: 2px solid black; padding: 20px; margin-bottom: 20px; }
    .stats-section h3 { margin: 0 0 15px 0; font-weight: bold; font-size: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat-card { background: #E8E8E8; border: 2px solid #87CEEB; padding: 15px; text-align: center; }
    .stat-label { font-size: 14px; margin-bottom: 8px; }
    .stat-value { font-size: 32px; font-weight: bold; }

    .filter-section {
      background: #f5f5f5; border: 2px solid black; padding: 15px; margin-bottom: 20px;
      display: flex; gap: 20px; flex-wrap: wrap;
    }
    .filter-group { display: flex; flex-direction: column; gap: 8px; }
    .filter-group label { font-size: 15px; font-weight: bold; }
    .filter-group select {
      padding: 12px; border: 2px solid black; font-size: 16px; font-family: Aptos, Calibri, sans-serif; min-width: 180px;
    }

    .select-all-btn {
      background: #87CEEB; color: white; padding: 12px 20px; border: 2px solid black; font-size: 16px;
      font-weight: bold; font-family: Aptos, Calibri, sans-serif; cursor: pointer; margin-bottom: 15px; align-self: flex-start;
    }
    .select-all-btn:hover { background: #5DADE2; }

    .create-folder-btn {
      background: white; border: 2px solid black; padding: 6px 12px; font-size: 13px; font-weight: bold;
      font-family: Aptos, Calibri, sans-serif; cursor: pointer;
    }
    .create-folder-btn:hover { background: #f0f0f0; }
    .create-folder-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .table-container { flex: 1; overflow: auto; border: 2px solid black; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 15px; min-width: 1600px; }
    th, td { padding: 12px; border: 1px solid black; text-align: left; }
    th { background: #87CEEB; color: white; font-weight: bold; position: sticky; top: 0; z-index: 10; font-size: 16px; }
    tr:nth-child(even) { background: #f9f9f9; }

    .editable-field { font-family: Aptos, Calibri, sans-serif; width: 100%; padding: 10px; border: 2px solid black; font-size: 15px; }
    input[type="date"] { min-width: 150px; }
    textarea.editable-field { resize: vertical; min-height: 60px; }
    select.editable-field { cursor: pointer; }

    .autocomplete-container { position: relative; width: 100%; }
    .autocomplete-suggestions {
      position: absolute; top: 100%; left: 0; right: 0; max-height: 250px; overflow-y: auto;
      background: white; border: 2px solid black; border-top: none; z-index: 1000; display: none;
    }
    .autocomplete-suggestion { padding: 12px; cursor: pointer; font-size: 15px; }
    .autocomplete-suggestion:hover { background: #f0f0f0; }

    .report-select-section { background: #f5f5f5; border: 2px solid black; padding: 20px; margin-bottom: 20px; }
    .report-select-section h3 { margin: 0 0 15px 0; font-size: 20px; font-weight: bold; }
    .report-select-section select {
      width: 100%; padding: 14px; border: 2px solid black; font-size: 16px; font-family: Aptos, Calibri, sans-serif;
    }

    .report-form-container { display: none; flex: 1; overflow: auto; }
    .trip-info-card { background: #f5f5f5; border: 2px solid black; padding: 20px; margin-bottom: 20px; }
    .trip-info-card h4 { margin: 0 0 15px 0; font-size: 20px; font-weight: bold; }
    .trip-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
    .trip-info-item { display: flex; gap: 12px; font-size: 16px; }
    .trip-info-item strong { min-width: 140px; font-weight: bold; }

    .report-form h3 { margin: 0 0 20px 0; font-size: 20px; font-weight: bold; padding-bottom: 15px; border-bottom: 3px solid black; }
    .form-group { margin-bottom: 25px; }
    .form-group label { display: block; font-weight: bold; margin-bottom: 10px; font-size: 17px; }
    .form-group textarea {
      width: 100%; min-height: 150px; padding: 14px; border: 2px solid black; font-family: Aptos, Calibri, sans-serif;
      font-size: 16px; resize: vertical; line-height: 1.6;
    }
    .char-counter { text-align: right; font-size: 14px; color: #666; margin-top: 5px; }

    .button-container {
      padding: 20px; background: #f5f5f5; border: 2px solid black; display: flex; justify-content: center;
      gap: 20px; flex-wrap: wrap; margin-top: 15px;
    }
    button { padding: 14px 30px; border: 2px solid black; font-size: 17px; font-weight: bold; font-family: Aptos, Calibri, sans-serif; cursor: pointer; }
    .primary { background: #87CEEB; color: white; }
    .primary:hover:not(:disabled) { background: #5DADE2; }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .secondary { background: white; color: black; }
    .secondary:hover { background: #f0f0f0; }

    .email-checkbox {
      display: flex; align-items: center; gap: 10px; font-size: 17px; cursor: pointer;
      padding: 12px 16px; background: white; border: 2px solid #87CEEB;
    }
    .email-checkbox input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }

    .empty-state { text-align: center; padding: 50px; color: #666; font-size: 16px; }
    .folder-link { color: black; text-decoration: underline; font-size: 14px; }
    .folder-link:hover { font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Business Trip Plan & Report</h2>

    <div class="tabs-container">
      <button class="tab-button active" onclick="switchTab('plan')">PLAN</button>
      <button class="tab-button" onclick="switchTab('report')">REPORT</button>
    </div>

    <!-- TAB 1: PLAN -->
    <div id="planTab" class="tab-content active">
      <div class="stats-section">
        <h3>Your Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Total Trips</div><div class="stat-value" id="statTotal">0</div></div>
          <div class="stat-card"><div class="stat-label">Approved</div><div class="stat-value" id="statApproved">0</div></div>
          <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value" id="statCompleted">0</div></div>
          <div class="stat-card"><div class="stat-label">On-Time Rate</div><div class="stat-value" id="statOnTime">0%</div></div>
          <div class="stat-card"><div class="stat-label">Total Cost</div><div class="stat-value" id="statTotalCost">0</div></div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-group">
          <label>Filter by Month</label>
          <select id="filterMonth" onchange="applyFilters()"><option value="All">All</option></select>
        </div>
        <div class="filter-group">
          <label>Filter by Destination</label>
          <select id="filterDestination" onchange="applyFilters()"><option value="All">All</option></select>
        </div>
        <div class="filter-group">
          <label>Filter by Status</label>
          <select id="filterApprovalStatus" onchange="applyFilters()">
            <option value="All">All</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="New">New</option>
            <option value="Already sent proposal email">Already sent proposal email</option>
          </select>
        </div>
      </div>

      <button class="select-all-btn" onclick="toggleSelectAll()">Select/Deselect All</button>

      <div class="table-container">
        <table id="dataTable">
          <thead>
            <tr>
              <th style="width: 60px;">Select</th>
              <th style="width: 60px;">Row</th>
              <th style="min-width: 150px;">Start Date*</th>
              <th style="min-width: 150px;">Finish Date*</th>
              <th style="min-width: 170px;">Destination*</th>
              <th style="min-width: 150px;">Co-Traveler</th>
              <th style="min-width: 200px;">Purpose</th>
              <th style="min-width: 200px;">Expected Result</th>
              <th style="min-width: 130px;">Est. Cost</th>
              <th style="min-width: 130px;">Total Cost</th>
              <th style="min-width: 200px;">Schedule</th>
              <th style="min-width: 130px;">Folder</th>
              <th style="min-width: 110px;">Approval</th>
            </tr>
          </thead>
          <tbody id="dataTableBody"></tbody>
        </table>
      </div>

      <div class="button-container">
        <label class="email-checkbox">
          <input type="checkbox" id="sendEmailCheck">
          <span>Send Proposal Email</span>
        </label>
        <button class="primary" id="submitBtn" onclick="submitChanges()">Save Changes</button>
        <button class="secondary" onclick="google.script.host.close()">Cancel</button>
      </div>
    </div>

    <!-- TAB 2: REPORT -->
    <div id="reportTab" class="tab-content">
      <div class="report-select-section">
        <h3>Select Business Trip to Report</h3>
        <select id="reportTripSelect" onchange="loadTripForReport()">
          <option value="">-- Please select an approved business trip --</option>
        </select>
      </div>

      <div id="reportFormContainer" class="report-form-container">
        <div class="trip-info-card">
          <h4>Trip Information</h4>
          <div class="trip-info-grid" id="tripInfoDisplay"></div>
        </div>

        <div class="report-form">
          <h3>Business Trip Report</h3>

          <div class="form-group">
            <label>Key Activities*</label>
            <textarea id="keyActivities" placeholder="Describe main activities..." maxlength="2000"
              oninput="updateCharCount('keyActivities', 2000)"></textarea>
            <div class="char-counter" id="keyActivities-counter">0 / 2000</div>
          </div>

          <div class="form-group">
            <label>Key Findings*</label>
            <textarea id="keyFindings" placeholder="List important findings..." maxlength="2000"
              oninput="updateCharCount('keyFindings', 2000)"></textarea>
            <div class="char-counter" id="keyFindings-counter">0 / 2000</div>
          </div>

          <div class="form-group">
            <label>Follow Up Actions*</label>
            <textarea id="followUp" placeholder="Specify next steps..." maxlength="2000"
              oninput="updateCharCount('followUp', 2000)"></textarea>
            <div class="char-counter" id="followUp-counter">0 / 2000</div>
          </div>

          <div class="button-container">
            <label class="email-checkbox">
              <input type="checkbox" id="sendReportEmailCheck" checked>
              <span>Send Report Email</span>
            </label>
            <button class="primary" id="submitReportBtn" onclick="submitReport()">Generate & Save Report</button>
            <button class="secondary" onclick="clearReportForm()">Clear Form</button>
          </div>
        </div>
      </div>

      <div id="noTripsMessage" class="empty-state" style="display: none;">
        <p>No approved business trips available for reporting.</p>
        <p>Please ensure your trips are approved in the Plan tab first.</p>
      </div>
    </div>
  </div>

  <script>
    const picData = ${JSON.stringify(picData)};
    const masterData = ${JSON.stringify(masterData)};
    const userEmail = ${JSON.stringify(userEmail)};
    const CURRENCY = ${JSON.stringify(CONFIG.CURRENCY_LABEL)};

    let allRows = [...picData.rows];
    let filteredRows = [...allRows];
    let allSelected = false;
    let currentReportTrip = null;

    window.onload = function() {
      try {
        google.script.host.setWidth(Math.floor(window.screen.availWidth * 0.95));
        google.script.host.setHeight(Math.floor(window.screen.availHeight * 0.90));
      } catch (e) {
        console.log('Could not auto-resize dialog:', e);
      }

      populateFilters();
      document.getElementById('filterApprovalStatus').value = 'New';
      applyFilters();

      // Tích sẵn checkbox cho dòng có Status = New
      document.querySelectorAll('.item-checkbox').forEach(cb => {
        const row = filteredRows[parseInt(cb.getAttribute('data-index'))];
        const status = (row.approvalStatus || '').toString().trim();
        if (status === 'Not Yet' || status === '' || status === 'New') cb.checked = true;
      });

      document.getElementById('sendEmailCheck').checked = true;
      populateReportTripSelect();
    };

    function switchTab(tabName) {
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

      if (tabName === 'plan') {
        document.getElementById('planTab').classList.add('active');
        document.querySelectorAll('.tab-button')[0].classList.add('active');
      } else {
        document.getElementById('reportTab').classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.add('active');
        populateReportTripSelect();
      }
    }

    function populateFilters() {
      const months = new Set();
      allRows.forEach(row => {
        if (row.month) {
          const monthStr = row.month.toString().trim();
          if (monthStr !== '') months.add(monthStr);
        }
      });

      const monthSelect = document.getElementById('filterMonth');
      Array.from(months).sort((a, b) => b.localeCompare(a)).forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month.length === 6 ? month.substring(0, 4) + '/' + month.substring(4, 6) : month;
        monthSelect.appendChild(option);
      });

      const destinations = new Set();
      allRows.forEach(row => { if (row.destination) destinations.add(row.destination); });

      const destSelect = document.getElementById('filterDestination');
      Array.from(destinations).sort().forEach(dest => {
        const option = document.createElement('option');
        option.value = dest;
        option.textContent = dest;
        destSelect.appendChild(option);
      });
    }

    function applyFilters() {
      const monthFilter = document.getElementById('filterMonth').value;
      const destFilter = document.getElementById('filterDestination').value;
      const approvalFilter = document.getElementById('filterApprovalStatus').value;

      filteredRows = allRows.filter(row => {
        const monthMatch = monthFilter === 'All' || (row.month && row.month.toString() === monthFilter);
        const destMatch = destFilter === 'All' || row.destination === destFilter;

        let approvalMatch = true;
        if (approvalFilter !== 'All') {
          const rowStatus = (row.approvalStatus || '').toString().trim();
          if (approvalFilter === 'New') {
            approvalMatch = (rowStatus === 'Not Yet' || rowStatus === '');
          } else if (approvalFilter === 'Already sent proposal email') {
            approvalMatch = (rowStatus === 'Already sent propose email' || rowStatus === 'Already sent proposal email');
          } else {
            approvalMatch = (rowStatus === approvalFilter);
          }
        }
        return monthMatch && destMatch && approvalMatch;
      });

      renderTable();
      updateStatistics();
    }

    function formatMoney(value) {
      const num = parseFloat(value);
      if (isNaN(num)) return (value || 'N/A');
      return num.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + CURRENCY;
    }

    function updateStatistics() {
      const total = filteredRows.length;
      const approved = filteredRows.filter(row => row.approvalStatus === 'Approved').length;
      const completed = filteredRows.filter(row => row.result && row.result.toString().trim() !== '').length;
      const onTimeCount = filteredRows.filter(row => {
        const s = (row.checkDeadline || '').toString().trim().toLowerCase();
        return s === 'ok' || s === 'on-time' || s === 'on time' || s === 'early';
      }).length;
      const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;

      let totalCostSum = 0;
      filteredRows.forEach(row => { totalCostSum += parseFloat(row.totalCost) || 0; });

      document.getElementById('statTotal').textContent = total;
      document.getElementById('statApproved').textContent = approved;
      document.getElementById('statCompleted').textContent = completed;
      document.getElementById('statOnTime').textContent = onTimeRate + '%';
      // ✅ v3.1: bỏ currency 'BATH' (không hợp lệ → làm lỗi toàn bộ window.onload)
      document.getElementById('statTotalCost').textContent = formatMoney(totalCostSum);
    }

    function renderTable() {
      const tbody = document.getElementById('dataTableBody');
      tbody.innerHTML = '';

      if (filteredRows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="empty-state">No data to display</td></tr>';
        return;
      }

      filteredRows.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-row', row.row);

        const folderStatus = row.folderLink ?
          \`<a href="\${escapeHtml(row.folderLink)}" target="_blank" class="folder-link">View</a>\` :
          \`<button class="create-folder-btn" onclick="createFolder(\${index})" id="createFolderBtn_\${row.row}">Create</button>\`;

        tr.innerHTML = \`
          <td><input type="checkbox" class="item-checkbox" value="\${row.row}" data-index="\${index}"></td>
          <td>\${row.row}</td>
          <td>
            <input type="date" class="editable-field" id="startDate_\${row.row}"
                   value="\${formatDateForInput(row.startDate)}"
                   onchange="updateRowData(\${index}, 'startDate', this.value)">
          </td>
          <td>
            <input type="date" class="editable-field" id="finishDate_\${row.row}"
                   value="\${formatDateForInput(row.finishDate)}"
                   onchange="updateRowData(\${index}, 'finishDate', this.value)">
          </td>
          <td>
            <div class="autocomplete-container">
              <input type="text" class="editable-field" id="destination_\${row.row}"
                     value="\${escapeHtml(row.destination)}"
                     onchange="updateRowData(\${index}, 'destination', this.value)"
                     oninput="showAutocompleteSuggestions(this, \${index}, 'destination')">
              <div class="autocomplete-suggestions" id="suggestions_destination_\${row.row}"></div>
            </div>
          </td>
          <td>
            <div class="autocomplete-container">
              <input type="text" class="editable-field" id="coTraveler_\${row.row}"
                     value="\${escapeHtml(row.coTraveler)}"
                     onchange="updateRowData(\${index}, 'coTraveler', this.value)"
                     oninput="showAutocompleteSuggestions(this, \${index}, 'coTraveler')">
              <div class="autocomplete-suggestions" id="suggestions_coTraveler_\${row.row}"></div>
            </div>
          </td>
          <td>
            <textarea class="editable-field" id="purpose_\${row.row}"
                      onchange="updateRowData(\${index}, 'purpose', this.value)">\${escapeHtml(row.purpose)}</textarea>
          </td>
          <td>
            <textarea class="editable-field" id="expectedResult_\${row.row}"
                      onchange="updateRowData(\${index}, 'expectedResult', this.value)">\${escapeHtml(row.expectedResult)}</textarea>
          </td>
          <td>
            <input type="text" class="editable-field" id="estimatedCost_\${row.row}"
                   value="\${escapeHtml(row.estimatedCost)}"
                   onchange="updateRowData(\${index}, 'estimatedCost', this.value)">
          </td>
          <td>
            <input type="number" class="editable-field" id="totalCost_\${row.row}"
                   value="\${escapeHtml(row.totalCost)}"
                   onchange="updateRowData(\${index}, 'totalCost', this.value)"
                   step="0.01">
          </td>
          <td>
            <textarea class="editable-field" id="schedule_\${row.row}"
                      onchange="updateRowData(\${index}, 'schedule', this.value)">\${escapeHtml(row.schedule)}</textarea>
          </td>
          <td style="text-align: center;">\${folderStatus}</td>
          <td style="text-align: center; font-weight: bold;">\${escapeHtml(row.approvalStatus || 'Not Yet')}</td>
        \`;

        tbody.appendChild(tr);
      });
    }

    function createFolder(index) {
      const row = filteredRows[index];

      if (!row.folderName || row.folderName.toString().trim() === '') {
        alert('Folder name (column O) is empty. Please check Start Date / Destination in the sheet first.');
        return;
      }

      const btn = document.getElementById(\`createFolderBtn_\${row.row}\`);
      if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            alert(response.message);
            row.folderLink = response.folderLink;
            row.folderLinkToUpdate = response.folderLink;
            const allRowIndex = allRows.findIndex(r => r.row === row.row);
            if (allRowIndex !== -1) allRows[allRowIndex].folderLink = response.folderLink;
            renderTable();
          } else {
            alert(response.message);
            if (btn) { btn.disabled = false; btn.textContent = 'Create'; }
          }
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
          if (btn) { btn.disabled = false; btn.textContent = 'Create'; }
        })
        .createReportFolder({ rowNumber: row.row, folderName: row.folderName });
    }

    function showAutocompleteSuggestions(input, index, field) {
      const value = input.value.toLowerCase();
      const row = filteredRows[index];
      const suggestionsDiv = document.getElementById(\`suggestions_\${field}_\${row.row}\`);

      let options = [];
      if (field === 'destination') options = masterData.destinations;
      else if (field === 'coTraveler') options = masterData.coTravelers;

      if (!value || options.length === 0) { suggestionsDiv.style.display = 'none'; return; }

      const filtered = options.filter(opt => opt.toLowerCase().includes(value));
      if (filtered.length === 0) { suggestionsDiv.style.display = 'none'; return; }

      suggestionsDiv.innerHTML = '';
      filtered.slice(0, 10).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'autocomplete-suggestion';
        div.textContent = opt;
        div.onclick = function() {
          input.value = opt;
          updateRowData(index, field, opt);
          suggestionsDiv.style.display = 'none';
        };
        suggestionsDiv.appendChild(div);
      });

      suggestionsDiv.style.display = 'block';
    }

    document.addEventListener('click', function(e) {
      if (!e.target.classList.contains('editable-field')) {
        document.querySelectorAll('.autocomplete-suggestions').forEach(div => { div.style.display = 'none'; });
      }
    });

    function updateRowData(index, field, value) {
      filteredRows[index][field] = value;
      const rowNumber = filteredRows[index].row;
      const allRowIndex = allRows.findIndex(r => r.row === rowNumber);
      if (allRowIndex !== -1) allRows[allRowIndex][field] = value;
    }

    function toggleSelectAll() {
      const boxes = document.querySelectorAll('.item-checkbox');
      allSelected = !(boxes.length > 0 && Array.from(boxes).every(cb => cb.checked));
      boxes.forEach(cb => cb.checked = allSelected);
    }

    function submitChanges() {
      const selectedCheckboxes = Array.from(document.querySelectorAll('.item-checkbox:checked'));

      if (selectedCheckboxes.length === 0) {
        alert('Please select at least one item to save.');
        return;
      }

      const selectedRows = [];
      const editedData = {};
      const emailableRows = [];
      const approvedRows = [];

      selectedCheckboxes.forEach(cb => {
        const rowValue = cb.value;
        const row = filteredRows[parseInt(cb.getAttribute('data-index'))];
        const approvalStatus = (row.approvalStatus || '').toString().trim();

        selectedRows.push(parseInt(rowValue));
        editedData[rowValue] = {
          startDate: row.startDate,
          finishDate: row.finishDate,
          destination: row.destination,
          coTraveler: row.coTraveler,
          purpose: row.purpose,
          expectedResult: row.expectedResult,
          estimatedCost: row.estimatedCost,
          schedule: row.schedule,
          folderName: row.folderName || '',
          folderLink: row.folderLinkToUpdate || row.folderLink || '',
          totalCost: row.totalCost || ''
        };

        if (approvalStatus === 'Approved') {
          approvedRows.push(rowValue);
        } else {
          // New / Not Yet / Already sent / Rejected → được gửi (lại) email
          emailableRows.push(rowValue);
        }
      });

      const sendEmailChecked = document.getElementById('sendEmailCheck').checked;

      if (sendEmailChecked) {
        if (emailableRows.length === 0) {
          alert('Cannot send email! All selected rows are already APPROVED.\\nUntick "Send Proposal Email" if you only want to save changes.');
          return;
        }
        if (approvedRows.length > 0) {
          const message = 'WARNING: You have selected ' + approvedRows.length + ' row(s) that are already APPROVED.\\n\\n' +
                          'These rows will NOT receive proposal emails.\\n\\nContinue?';
          if (!confirm(message)) return;
        }
      }

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      google.script.run
        .withSuccessHandler(function(response) {
          alert(response.message);
          google.script.host.close();
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Changes';
        })
        .handleBusinessTripUpdate({
          selectedRows: selectedRows,
          editedData: editedData,
          newRows: [],
          sendEmail: sendEmailChecked,
          emailableRows: emailableRows,
          approvedRows: approvedRows
        });
    }

    // ==================== REPORT TAB ====================
    function hasDocReport(trip) {
      return trip.result && trip.result.toString().trim() !== '' && trip.result.toString().includes('docs.google.com');
    }

    function populateReportTripSelect() {
      const select = document.getElementById('reportTripSelect');
      select.innerHTML = '<option value="">-- Please select an approved business trip --</option>';

      const approvedTrips = allRows.filter(row =>
        row.approvalStatus === 'Approved' && row.startDate && row.destination && row.folderLink && !row.isNew
      );

      if (approvedTrips.length === 0) {
        document.getElementById('noTripsMessage').style.display = 'block';
        document.getElementById('reportFormContainer').style.display = 'none';
        return;
      }
      document.getElementById('noTripsMessage').style.display = 'none';

      approvedTrips.sort((a, b) => {
        const aHas = hasDocReport(a), bHas = hasDocReport(b);
        if (!aHas && bHas) return -1;
        if (aHas && !bHas) return 1;
        return parseDateString(b.startDate) - parseDateString(a.startDate);
      });

      let firstTripSelected = false;
      approvedTrips.forEach(trip => {
        const option = document.createElement('option');
        option.value = trip.row;
        const done = hasDocReport(trip) || (trip.result && trip.result.toString().trim() !== '');
        option.textContent = trip.startDate + ' - ' + trip.destination + (done ? ' (Completed)' : '');
        select.appendChild(option);

        if (!firstTripSelected && !done) {
          option.selected = true;
          firstTripSelected = true;
          setTimeout(() => loadTripForReport(), 100);
        }
      });
    }

    function loadTripForReport() {
      const selectedRow = document.getElementById('reportTripSelect').value;

      if (!selectedRow) {
        document.getElementById('reportFormContainer').style.display = 'none';
        return;
      }

      const trip = allRows.find(row => row.row == selectedRow);
      if (!trip) return;
      currentReportTrip = trip;

      const tripInfoHtml = \`
        <div class="trip-info-item"><strong>Destination:</strong><span>\${escapeHtml(trip.destination || 'N/A')}</span></div>
        <div class="trip-info-item"><strong>Date:</strong><span>\${escapeHtml(trip.startDate || 'N/A')} to \${escapeHtml(trip.finishDate || 'N/A')}</span></div>
        <div class="trip-info-item"><strong>Duration:</strong><span>\${escapeHtml(trip.workingDate || 'N/A')} day(s)</span></div>
        <div class="trip-info-item"><strong>Purpose:</strong><span>\${escapeHtml(trip.purpose || 'N/A')}</span></div>
        <div class="trip-info-item"><strong>Co-Traveler:</strong><span>\${escapeHtml(trip.coTraveler || 'None')}</span></div>
        <div class="trip-info-item"><strong>Estimated Cost:</strong><span style="color: #666;">\${escapeHtml(formatMoney(trip.estimatedCost))}</span></div>
        <div class="trip-info-item"><strong>Total Cost:</strong><span style="font-weight: bold; color: #d32f2f;">\${escapeHtml(formatMoney(trip.totalCost))}</span></div>
        <div class="trip-info-item"><strong>Folder:</strong><span><a href="\${escapeHtml(trip.folderLink)}" target="_blank">View</a></span></div>
      \`;

      document.getElementById('tripInfoDisplay').innerHTML = tripInfoHtml;
      document.getElementById('reportFormContainer').style.display = 'block';
      clearReportForm();
    }

    function updateCharCount(fieldId, maxLength) {
      const field = document.getElementById(fieldId);
      document.getElementById(fieldId + '-counter').textContent = field.value.length + ' / ' + maxLength;
    }

    function clearReportForm() {
      ['keyActivities', 'keyFindings', 'followUp'].forEach(id => {
        document.getElementById(id).value = '';
        updateCharCount(id, 2000);
      });
    }

    function submitReport() {
      if (!currentReportTrip) { alert('Please select a business trip first.'); return; }

      if (!currentReportTrip.folderLink || currentReportTrip.folderLink.toString().trim() === '') {
        alert('Please create a report folder first.');
        return;
      }

      const keyActivities = document.getElementById('keyActivities').value.trim();
      const keyFindings = document.getElementById('keyFindings').value.trim();
      const followUp = document.getElementById('followUp').value.trim();

      if (!keyActivities || !keyFindings || !followUp) {
        alert('Please fill in all required fields.');
        return;
      }

      if (keyActivities.length < 50 || keyFindings.length < 50 || followUp.length < 30) {
        alert('Please provide more detailed information:\\n• Key Activities: at least 50 characters\\n• Key Findings: at least 50 characters\\n• Follow Up Actions: at least 30 characters');
        return;
      }

      const sendEmail = document.getElementById('sendReportEmailCheck').checked;
      const submitBtn = document.getElementById('submitReportBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';

      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            alert(response.message);
            currentReportTrip.result = response.docLink || 'submitted';
            populateReportTripSelect();
            document.getElementById('reportTripSelect').value = '';
            document.getElementById('reportFormContainer').style.display = 'none';
            clearReportForm();
          } else {
            alert(response.message);
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Generate & Save Report';
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Generate & Save Report';
        })
        .handleBusinessTripReport({
          rowNumber: currentReportTrip.row,
          keyActivities: keyActivities,
          keyFindings: keyFindings,
          followUp: followUp,
          tripData: currentReportTrip,
          sendEmail: sendEmail
        });
    }

    // UTILITY
    function formatDateForInput(dateStr) {
      if (!dateStr) return '';
      dateStr = dateStr.toString();
      if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}$/)) return dateStr;
      if (dateStr.match(/^\\d{2}\\/\\d{2}\\/\\d{4}$/)) {
        const parts = dateStr.split('/');
        return parts[2] + '-' + parts[1] + '-' + parts[0];
      }
      return '';
    }

    function parseDateString(dateStr) {
      if (!dateStr) return new Date(0);
      dateStr = dateStr.toString();
      if (dateStr.match(/^\\d{2}\\/\\d{2}\\/\\d{4}$/)) {
        const parts = dateStr.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date(0) : d;
    }

    function escapeHtml(text) {
      if (text === null || text === undefined) return '';
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML.replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>
  `;
}

// ===========================
// DATA RETRIEVAL FUNCTIONS
// ===========================

function getPICData(sheet, userEmail) {
  const lastRow = sheet.getLastRow();
  const rows = [];
  if (lastRow < CONFIG.DATA_START_ROW || !userEmail) return { rows: rows, userEmail: userEmail };

  const data = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, READ_WIDTH).getValues();
  const userEmailLower = userEmail.toLowerCase().trim();

  for (let i = 0; i < data.length; i++) {
    const emailPIC = data[i][22]; // Cột X
    if (emailPIC && emailPIC.toString().toLowerCase().trim() === userEmailLower) {
      rows.push(rowToObject(data[i], CONFIG.DATA_START_ROW + i));
    }
  }

  return { rows: rows, userEmail: userEmail };
}

function getMasterData(ss) {
  try {
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { destinations: [], coTravelers: [] };

    const destinations = masterSheet.getRange('C2:C1000').getValues()
      .filter(row => row[0] && row[0].toString().trim() !== '')
      .map(row => row[0].toString().trim());

    const coTravelers = masterSheet.getRange('E2:E30').getValues()
      .filter(row => row[0] && row[0].toString().trim() !== '')
      .map(row => row[0].toString().trim());

    return {
      destinations: [...new Set(destinations)],
      coTravelers: [...new Set(coTravelers)]
    };

  } catch (error) {
    Logger.log('Error in getMasterData: ' + error.message);
    return { destinations: [], coTravelers: [] };
  }
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  try {
    if (dateValue instanceof Date) {
      return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    }
    return dateValue.toString();
  } catch (error) {
    return dateValue.toString();
  }
}

// ===========================
// CREATE FOLDER
// ===========================

function createReportFolder(data) {
  try {
    const rowNumber = data.rowNumber;
    const folderName = (data.folderName || '').toString().trim();

    if (folderName === '') {
      return { success: false, message: 'Folder name is empty. Please check column O in the sheet.' };
    }

    const parentFolder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
    const existingFolders = parentFolder.getFoldersByName(folderName);
    const folder = existingFolders.hasNext() ? existingFolders.next() : parentFolder.createFolder(folderName);
    const folderLink = folder.getUrl();

    if (!rowNumber.toString().startsWith('new_')) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK)).setValue(folderLink);
    }

    return {
      success: true,
      message: 'Report folder created successfully!',
      folderLink: folderLink,
      folderId: folder.getId()
    };

  } catch (error) {
    Logger.log('Error in createReportFolder: ' + error.message);
    return { success: false, message: 'Error creating folder: ' + error.message };
  }
}

// ===========================
// UPDATE FUNCTIONS
// ===========================

/**
 * Lưu thay đổi + (tùy chọn) gửi Proposal email
 * ✅ v3.1:
 *  - Chỉ đổi status "Already sent propose email" cho dòng GỬI MAIL THÀNH CÔNG
 *  - Xóa HOD comment của dòng Rejected chỉ sau khi gửi lại thành công
 *  - Đếm Rejected / New / Existing theo status TRƯỚC khi gửi
 */
function handleBusinessTripUpdate(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = Session.getActiveUser().getEmail();

  if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);

  const selectedRows = data.selectedRows || [];
  const editedData = data.editedData || {};
  const newRows = data.newRows || [];
  const sendEmail = data.sendEmail || false;
  const emailableRows = data.emailableRows || [];
  const approvedRows = data.approvedRows || [];

  const statusCol = columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS);
  const folderLinkCol = columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK);

  // BƯỚC 1: UPDATE EXISTING ROWS
  selectedRows.forEach(rowNumber => {
    if (editedData[rowNumber]) updateRow(sheet, rowNumber, editedData[rowNumber]);
  });
  SpreadsheetApp.flush();

  // BƯỚC 1.5: TỰ ĐỘNG TẠO FOLDER (nếu có Folder Name mà chưa có link)
  selectedRows.forEach(rowNumber => {
    const rowData = editedData[rowNumber];
    if (!rowData || !rowData.folderName || rowData.folderName.toString().trim() === '') return;

    const currentFolderLink = sheet.getRange(rowNumber, folderLinkCol).getValue();
    if (!currentFolderLink || currentFolderLink.toString().trim() === '') {
      try {
        const folderResult = createReportFolder({ rowNumber: rowNumber, folderName: rowData.folderName });
        if (folderResult.success) rowData.folderLink = folderResult.folderLink;
        else Logger.log('⚠️ Failed to create folder for row ' + rowNumber + ': ' + folderResult.message);
      } catch (folderError) {
        Logger.log('❌ Error creating folder for row ' + rowNumber + ': ' + folderError.message);
      }
    }
  });

  // BƯỚC 2: NEW ROWS (hiện dialog luôn gửi newRows = [])
  const newRowNumbers = [];
  if (newRows.length > 0) {
    const lastRowBefore = sheet.getLastRow();
    addNewRows(sheet, newRows, userEmail);
    const lastRowAfter = sheet.getLastRow();
    for (let i = lastRowBefore + 1; i <= lastRowAfter; i++) newRowNumbers.push(i);

    SpreadsheetApp.flush();
    Utilities.sleep(3000);

    newRowNumbers.forEach(rowNumber => {
      const hodCell = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD));
      const dirCell = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR));
      if (!hodCell.getValue() || !dirCell.getValue()) {
        const picName = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
        const defaults = getDefaultEmailsForPIC(picName);
        if (!hodCell.getValue()) hodCell.setValue(defaults.hod);
        if (!dirCell.getValue()) dirCell.setValue(defaults.director);
      }
    });
    SpreadsheetApp.flush();
  }

  let message = '✅ Business trip data updated successfully!';

  // BƯỚC 3: GỬI PROPOSAL EMAIL
  if (sendEmail && (emailableRows.length > 0 || newRowNumbers.length > 0)) {
    const rowsToEmail = [];
    const statusBefore = {};

    newRowNumbers.forEach(r => { rowsToEmail.push(r); statusBefore[r] = 'New'; });

    emailableRows.forEach(rowValue => {
      const rowNumber = parseInt(rowValue);
      if (isNaN(rowNumber)) return;
      const currentStatus = (sheet.getRange(rowNumber, statusCol).getValue() || '').toString().trim();
      if (currentStatus !== 'Approved') {
        rowsToEmail.push(rowNumber);
        statusBefore[rowNumber] = currentStatus;
      }
    });

    if (rowsToEmail.length === 0) {
      message += '\n\nℹ️ No emails sent\nReason: All selected trips are already approved';
      return { success: true, message: message };
    }

    let result;
    try {
      result = sendProposalEmail(sheet, rowsToEmail, [], userEmail);
    } catch (emailError) {
      Logger.log('❌ EMAIL SENDING FAILED: ' + emailError.message);
      return {
        success: true,
        message: message + '\n\n⚠️ However, email sending failed:\n' + emailError.message + '\n\n' +
                 'Please check: your email is configured in the system, and columns Y/Z (HOD/Director email) are filled.'
      };
    }

    // Cập nhật status CHỈ cho dòng gửi thành công
    let resubmitted = 0, firstTime = 0;
    result.sentRows.forEach(rowNumber => {
      if (statusBefore[rowNumber] === 'Rejected') {
        sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.MANAGER_COMMENT)).setValue('');
        resubmitted++;
      } else {
        firstTime++;
      }
      sheet.getRange(rowNumber, statusCol).setValue('Already sent propose email');
    });
    SpreadsheetApp.flush();

    message += '\n\n📧 Proposal emails sent: ' + result.sentRows.length;
    message += '\n  ✅ New / pending plans: ' + firstTime;
    if (resubmitted > 0) message += '\n  🔄 Re-submitted (Rejected): ' + resubmitted;
    if (result.failedRows.length > 0) {
      message += '\n\n❌ Failed: ' + result.failedRows.length + ' row(s)';
      result.failedRows.forEach(f => { message += '\n  • Row ' + f.row + ': ' + f.error; });
    }
    if (approvedRows.length > 0) {
      message += '\n\n⏭️ Skipped: ' + approvedRows.length + ' trip(s) (already approved)';
    }
  }

  return { success: true, message: message };
}

function updateRow(sheet, rowNumber, rowData) {
  const columnsToUpdate = [
    CONFIG.COLUMNS.START_DATE, CONFIG.COLUMNS.FINISH_DATE, CONFIG.COLUMNS.DESTINATION,
    CONFIG.COLUMNS.CO_TRAVELER, CONFIG.COLUMNS.PURPOSE, CONFIG.COLUMNS.EXPECTED_RESULT,
    CONFIG.COLUMNS.ESTIMATED_COST, CONFIG.COLUMNS.TOTAL_COST, CONFIG.COLUMNS.SCHEDULE,
    CONFIG.COLUMNS.FOLDER_LINK
  ];

  columnsToUpdate.forEach(col => {
    sheet.getRange(rowNumber, columnLetterToIndex(col)).clearDataValidations();
  });

  const set = (col, value) => sheet.getRange(rowNumber, columnLetterToIndex(col)).setValue(value);

  if (rowData.startDate) set(CONFIG.COLUMNS.START_DATE, parseDate(rowData.startDate));
  if (rowData.finishDate) set(CONFIG.COLUMNS.FINISH_DATE, parseDate(rowData.finishDate));
  if (rowData.destination !== undefined) set(CONFIG.COLUMNS.DESTINATION, rowData.destination);
  if (rowData.coTraveler !== undefined) set(CONFIG.COLUMNS.CO_TRAVELER, rowData.coTraveler);
  if (rowData.purpose !== undefined) set(CONFIG.COLUMNS.PURPOSE, rowData.purpose);
  if (rowData.expectedResult !== undefined) set(CONFIG.COLUMNS.EXPECTED_RESULT, rowData.expectedResult);
  if (rowData.estimatedCost !== undefined) set(CONFIG.COLUMNS.ESTIMATED_COST, rowData.estimatedCost);
  if (rowData.totalCost !== undefined) set(CONFIG.COLUMNS.TOTAL_COST, rowData.totalCost);
  if (rowData.schedule !== undefined) set(CONFIG.COLUMNS.SCHEDULE, rowData.schedule);
  if (rowData.folderLink !== undefined && rowData.folderLink !== '') set(CONFIG.COLUMNS.FOLDER_LINK, rowData.folderLink);

  // Đảm bảo tên PIC (cột D) đúng với email ở cột X
  const currentEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
  if (currentEmail && currentEmail.toString().trim() !== '') {
    let correctPicName;
    try {
      correctPicName = getPICNameFromEmail(currentEmail.toString());
    } catch (e) {
      Logger.log('⚠️ ' + e.message);
      return;
    }
    const picCell = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PIC));
    if (picCell.getValue() !== correctPicName) {
      picCell.clearDataValidations();
      picCell.setValue(correctPicName);
      restorePICValidation(sheet, picCell);
    }
  }
}

function restorePICValidation(sheet, picCell) {
  try {
    const masterSheet = sheet.getParent().getSheetByName(CONFIG.MASTER_SHEET);
    if (masterSheet) {
      const picValidation = SpreadsheetApp.newDataValidation()
        .requireValueInRange(masterSheet.getRange('E2:E30'), true)
        .setAllowInvalid(false)
        .setHelpText('Please select a PIC from the list')
        .build();
      picCell.setDataValidation(picValidation);
    }
  } catch (valError) {
    Logger.log('⚠️ Could not restore validation: ' + valError.message);
  }
}

function addNewRows(sheet, newRows, userEmail) {
  const lastRow = sheet.getLastRow();

  newRows.forEach((rowData, index) => {
    const emptyRow = findEmptyRow(sheet) || lastRow + index + 1;
    const set = (col, value) => sheet.getRange(emptyRow, columnLetterToIndex(col)).setValue(value);

    sheet.getRange(emptyRow, 1, 1, sheet.getMaxColumns()).clearDataValidations();

    set(CONFIG.COLUMNS.NO, emptyRow - CONFIG.HEADER_ROW);

    if (rowData.startDate) {
      const startDate = parseDate(rowData.startDate);
      if (startDate) set(CONFIG.COLUMNS.MONTH, Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyyMM'));
    }

    const picCell = sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.PIC));
    picCell.setValue(getPICNameFromEmail(userEmail));
    restorePICValidation(sheet, picCell);

    if (rowData.startDate) set(CONFIG.COLUMNS.START_DATE, parseDate(rowData.startDate));
    if (rowData.finishDate) set(CONFIG.COLUMNS.FINISH_DATE, parseDate(rowData.finishDate));
    if (rowData.startDate && rowData.finishDate) {
      const start = parseDate(rowData.startDate);
      const finish = parseDate(rowData.finishDate);
      if (start && finish) set(CONFIG.COLUMNS.WORKING_DATE, calculateWorkingDays(start, finish));
    }
    if (rowData.destination) set(CONFIG.COLUMNS.DESTINATION, rowData.destination);
    if (rowData.coTraveler) set(CONFIG.COLUMNS.CO_TRAVELER, rowData.coTraveler);
    if (rowData.purpose) set(CONFIG.COLUMNS.PURPOSE, rowData.purpose);
    if (rowData.expectedResult) set(CONFIG.COLUMNS.EXPECTED_RESULT, rowData.expectedResult);
    if (rowData.estimatedCost) set(CONFIG.COLUMNS.ESTIMATED_COST, rowData.estimatedCost);
    if (rowData.schedule) set(CONFIG.COLUMNS.SCHEDULE, rowData.schedule);
    if (rowData.folderName) set(CONFIG.COLUMNS.FOLDER_NAME, rowData.folderName);

    set(CONFIG.COLUMNS.APPROVAL_STATUS, 'Not Yet');
    // Cột X, Y, Z, AA do array formula tự điền
  });
}

function findEmptyRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) return null;
  const data = sheet.getRange(CONFIG.DATA_START_ROW, columnLetterToIndex(CONFIG.COLUMNS.PIC),
                              lastRow - CONFIG.DATA_START_ROW + 1, 10).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i].every(cell => !cell || cell.toString().trim() === '')) return CONFIG.DATA_START_ROW + i;
  }
  return null;
}

// ===========================
// BUSINESS TRIP REPORT
// ===========================

function handleBusinessTripReport(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const rowNumber = data.rowNumber;
    const tripData = data.tripData;
    const sendEmail = data.sendEmail || false;

    if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);

    if (!tripData.folderLink || tripData.folderLink.toString().trim() === '') {
      return { success: false, message: 'No folder link found. Please create a report folder first.' };
    }

    // 1. Tạo Google Doc
    const docResult = generateWordReport({
      tripData: tripData,
      keyActivities: data.keyActivities,
      keyFindings: data.keyFindings,
      followUp: data.followUp
    });
    if (!docResult.success) return { success: false, message: docResult.message };

    // 2–3. Ghi nội dung vào cột Q + ngày nộp cột T
    const bulletContent = createBulletPointContent({
      keyActivities: data.keyActivities,
      keyFindings: data.keyFindings,
      followUp: data.followUp
    });
    sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.RESULT)).setValue(bulletContent);
    sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.ACTUAL_REPORT_DATE)).setValue(new Date());
    SpreadsheetApp.flush();

    // 4. Email
    if (sendEmail) {
      const emailResult = sendReportEmail(sheet, rowNumber, tripData, docResult.docLink,
                                          data.keyActivities, data.keyFindings, data.followUp);
      if (!emailResult.success) {
        return {
          success: true,
          message: '✅ Report document created successfully!\n\n⚠️ However, email sending FAILED:\n' +
                   emailResult.message + '\n\nDocument link: ' + docResult.docLink +
                   '\n\nPlease send the report manually or try again.',
          docLink: docResult.docLink,
          docId: docResult.docId,
          emailSent: false
        };
      }
    }

    return {
      success: true,
      message: '✅ Business trip report completed successfully!\n\n📄 Document: Created\n' +
               (sendEmail ? '📧 Email: Sent\n' : '') +
               '\nDocument link: ' + docResult.docLink,
      docLink: docResult.docLink,
      docId: docResult.docId,
      emailSent: sendEmail
    };

  } catch (error) {
    Logger.log('❌ handleBusinessTripReport: ' + error.message + '\n' + error.stack);
    return { success: false, message: 'Error generating report: ' + error.message };
  }
}

function createBulletPointContent(data) {
  return [
    '**I. Key Activities**', data.keyActivities.trim(), '',
    '**II. Key Findings**', data.keyFindings.trim(), '',
    '**III. Follow Up Actions**', data.followUp.trim()
  ].join('\n');
}

/**
 * Tạo Google Doc báo cáo trong folder của chuyến đi
 */
function generateWordReport(data) {
  try {
    const tripData = data.tripData;
    const folderId = extractFolderIdFromUrl(tripData.folderLink);
    if (!folderId) return { success: false, message: 'Invalid folder link format.' };

    const folder = DriveApp.getFolderById(folderId);
    const docName = tripData.folderName || ('BusinessTrip_Report_' + tripData.startDate + '_' + tripData.destination);

    const doc = DocumentApp.create(docName);
    const body = doc.getBody();

    const title = body.appendParagraph('BUSINESS TRIP REPORT');
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    title.editAsText().setBold(true).setFontSize(18).setForegroundColor('#000000');

    body.appendParagraph('');
    body.appendHorizontalRule();
    body.appendParagraph('');

    const section1 = body.appendParagraph('I. TRIP INFORMATION');
    section1.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    section1.editAsText().setBold(true).setFontSize(14).setForegroundColor('#000000');
    body.appendParagraph('');

    const tripInfoTable = body.appendTable();
    tripInfoTable.setBorderWidth(0.5);

    function addInfoRow(table, label, value) {
      const row = table.appendTableRow();
      const labelCell = row.appendTableCell(label);
      const valueCell = row.appendTableCell((value === undefined || value === null || value === '') ? 'N/A' : String(value));

      labelCell.setBackgroundColor('#E8E8E8');
      labelCell.editAsText().setBold(true).setFontSize(11).setForegroundColor('#000000');
      labelCell.setPaddingLeft(10).setPaddingRight(10).setPaddingTop(8).setPaddingBottom(8);
      labelCell.setWidth(150);

      valueCell.setBackgroundColor('#FFFFFF');
      valueCell.editAsText().setBold(false).setFontSize(11).setForegroundColor('#000000');
      valueCell.setPaddingLeft(10).setPaddingRight(10).setPaddingTop(8).setPaddingBottom(8);
    }

    addInfoRow(tripInfoTable, 'PIC:', tripData.pic);
    addInfoRow(tripInfoTable, 'Destination:', tripData.destination);
    addInfoRow(tripInfoTable, 'Date:', (tripData.startDate || 'N/A') + ' to ' + (tripData.finishDate || 'N/A'));
    addInfoRow(tripInfoTable, 'Duration:', (tripData.workingDate || 'N/A') + ' day(s)');
    addInfoRow(tripInfoTable, 'Purpose:', tripData.purpose);
    addInfoRow(tripInfoTable, 'Co-Traveler:', tripData.coTraveler || 'None');
    addInfoRow(tripInfoTable, 'Estimated Cost:', tripData.estimatedCost);
    addInfoRow(tripInfoTable, 'Total Cost:', tripData.totalCost ? tripData.totalCost + ' ' + CONFIG.CURRENCY_LABEL : 'N/A');

    body.appendParagraph('');
    body.appendHorizontalRule();
    body.appendParagraph('');

    const section2 = body.appendParagraph('II. BUSINESS TRIP REPORT');
    section2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    section2.editAsText().setBold(true).setFontSize(14).setForegroundColor('#000000');
    body.appendParagraph('');

    function addSection(header, text) {
      const h = body.appendParagraph(header);
      h.setHeading(DocumentApp.ParagraphHeading.HEADING3);
      h.editAsText().setBold(true).setFontSize(12).setForegroundColor('#000000');

      const p = body.appendParagraph(text);
      p.setAlignment(DocumentApp.HorizontalAlignment.JUSTIFY);
      p.setSpacingBefore(5).setSpacingAfter(5).setLineSpacing(1.3).setIndentStart(20);
      p.editAsText().setBold(false).setFontSize(11).setForegroundColor('#000000');
      body.appendParagraph('');
    }

    addSection('1. Key Activities', data.keyActivities);
    addSection('2. Key Findings', data.keyFindings);
    addSection('3. Follow Up Actions', data.followUp);

    body.appendHorizontalRule();
    const footer = body.appendParagraph('Report generated on: ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
    footer.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    footer.editAsText().setItalic(true).setFontSize(9).setForegroundColor('#666666');

    doc.saveAndClose();
    DriveApp.getFileById(doc.getId()).moveTo(folder);

    return { success: true, docLink: doc.getUrl(), docId: doc.getId() };

  } catch (error) {
    Logger.log('❌ Error in generateWordReport: ' + error.message);
    return { success: false, message: 'Error creating report document: ' + error.message };
  }
}

/**
 * Extract folder ID từ Google Drive URL (nhiều định dạng)
 */
function extractFolderIdFromUrl(url) {
  if (!url) return null;
  url = url.toString().trim();

  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/([a-zA-Z0-9-_]{25,})\/?$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return m[1];
  }
  if (/^[a-zA-Z0-9-_]{25,}$/.test(url)) return url;
  return null;
}

// ===========================
// EMAIL FUNCTIONS
// ===========================

/**
 * Gửi Proposal email – mỗi chuyến 1 email riêng
 * TO: Director (cột Z) | CC: HOD (cột Y) + PIC
 * ✅ v3.1: trả về { sentRows, failedRows } để chỉ cập nhật status cho dòng gửi thành công
 */
function sendProposalEmail(sheet, selectedRows, newRows, userEmail) {
  if (!selectedRows || selectedRows.length === 0) throw new Error('No rows selected for email');

  const picName = getPICNameFromEmail(userEmail);

  SpreadsheetApp.flush();
  Utilities.sleep(2000); // đợi array formulas

  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const sentRows = [];
  const failedRows = [];
  const col = (c) => columnLetterToIndex(CONFIG.COLUMNS[c]);

  selectedRows.forEach(rowNumber => {
    try {
      const get = (c) => sheet.getRange(rowNumber, col(c)).getValue();

      const destination = get('DESTINATION');
      const startDate = get('START_DATE');
      const finishDate = get('FINISH_DATE');

      let hodEmail = (get('EMAIL_HOD') || '').toString().trim();
      let directorEmail = (get('EMAIL_DIRECTOR') || '').toString().trim();

      if (!hodEmail || !directorEmail) {
        const defaults = getDefaultEmailsForPIC(picName);
        if (!hodEmail) hodEmail = defaults.hod || '';
        if (!directorEmail) directorEmail = defaults.director || '';
      }

      const hodValid = isValidEmail(hodEmail);
      const directorValid = isValidEmail(directorEmail);
      if (!hodValid && !directorValid) throw new Error('No valid HOD/Director email (columns Y, Z)');

      const toRecipients = directorValid ? directorEmail : hodEmail;
      const ccList = [userEmail];
      if (hodValid && directorValid && hodEmail.toLowerCase() !== directorEmail.toLowerCase()) ccList.unshift(hodEmail);

      const fmt = (d) => d ? Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd/MM/yyyy') : 'N/A';
      const tripForEmail = {
        row: rowNumber,
        destination: destination || 'N/A',
        workingDate: get('WORKING_DATE') || 'N/A',
        startDate: fmt(startDate),
        finishDate: fmt(finishDate),
        purpose: get('PURPOSE') || 'N/A',
        schedule: get('SCHEDULE') || 'N/A',
        estimatedCost: get('ESTIMATED_COST') || 'N/A'
      };

      const greeting = buildProposalGreeting(hodEmail);
      const htmlBody = buildBusinessTripProposalEmailV2(greeting, picName, [tripForEmail], sheetUrl);
      const subject = 'Approval Business trip - ' + tripForEmail.startDate.replace(/\//g, '') + ' - ' + picName;

      MailApp.sendEmail({
        to: toRecipients,
        cc: ccList.join(','),
        subject: subject,
        htmlBody: htmlBody,
        name: 'Mani Medical Hanoi - Business Trip System'
      });

      sentRows.push(rowNumber);
      Logger.log('✅ Proposal email sent for row ' + rowNumber + ' → ' + toRecipients);

    } catch (emailError) {
      Logger.log('❌ EMAIL FAILED for row ' + rowNumber + ': ' + emailError.message);
      failedRows.push({ row: rowNumber, error: emailError.message });
    }
  });

  if (sentRows.length === 0) {
    throw new Error('All ' + failedRows.length + ' email(s) failed: ' +
                    failedRows.map(f => 'Row ' + f.row + ' – ' + f.error).join('; '));
  }

  return { sentRows: sentRows, failedRows: failedRows };
}

/**
 * Fallback HOD/Director khi array formula chưa trả email
 * ✅ v3.1: sửa domain (manimedicalthanoi → manimedicalhanoi), thêm Somchai, Miew
 * ⚠️ Director fallback đang để vtt.hoa như bản cũ – kiểm tra lại nếu Director phải là nt.ha
 */
function getDefaultEmailsForPIC(picName) {
  const TUYEN = 'tt.tuyen@manimedicalhanoi.com';
  const HOA = 'vtt.hoa@manimedicalhanoi.com';
  const sales = { hod: TUYEN, director: HOA };
  const admin = { hod: HOA, director: HOA };

  const picToEmailMapping = {
    // Thailand team
    'Dao': sales, 'Sui': sales, 'Somchai': sales, 'Miew': sales,
    // Sales team
    'Minh Viet': sales, 'Viet Ha': sales, 'Vinh': sales, 'Phuong': sales, 'Khang': sales, 'Ngoc': sales,
    // Marketing team
    'Thuong': sales, 'Trang': sales, 'Duc Anh': sales,
    // Product team
    'Giang': sales,
    // Admin team
    'Hau': admin, 'Hang': admin, 'Dam Viet': admin, 'Dam Ha': admin, 'Hoa': admin,
    // Manager
    'Tuyen': admin
  };

  return picToEmailMapping[picName] || sales;
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(email.toString().trim());
}

/**
 * HTML Proposal email
 */
function buildBusinessTripProposalEmailV2(greeting, picName, trips, sheetUrl) {
  const td = 'border: 1px solid #000000; padding: 8px; font-family: Aptos, Calibri, sans-serif; font-size: 11pt;';
  const th = td + ' font-weight: bold; color: #000000;';

  let tripsRows = '';
  trips.forEach((trip, index) => {
    tripsRows += `
        <tr>
          <td style="${td} text-align: center;">${trip.row || (index + 1)}</td>
          <td style="${td}">${escapeHtmlEmail(trip.destination)}</td>
          <td style="${td} text-align: center;">${escapeHtmlEmail(trip.workingDate)}</td>
          <td style="${td} text-align: center;">${escapeHtmlEmail(trip.startDate)}</td>
          <td style="${td} text-align: center;">${escapeHtmlEmail(trip.finishDate)}</td>
          <td style="${td}">${escapeHtmlEmail(trip.purpose)}</td>
          <td style="${td}">${escapeHtmlEmail(trip.schedule)}</td>
          <td style="${td} text-align: right;">${escapeHtmlEmail(trip.estimatedCost)}</td>
        </tr>`;
  });

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 20px 0; font-family: Aptos, Calibri, sans-serif; font-size: 14pt; font-weight: bold; color: #000000;">
                Business Trip Approval Request
              </p>
              <p style="margin: 0 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                ${greeting},
              </p>
              <p style="margin: 0 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                I would like to request your approval for the following business trip(s). Please review the details below:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border-collapse: collapse; margin: 20px 0; border: 1px solid #000000;">
                <thead>
                  <tr style="background-color: #f0f0f0;">
                    <th style="${th} text-align: center;">Row</th>
                    <th style="${th}">Destination</th>
                    <th style="${th} text-align: center;">Days</th>
                    <th style="${th} text-align: center;">Start Date</th>
                    <th style="${th} text-align: center;">Finish Date</th>
                    <th style="${th}">Purpose</th>
                    <th style="${th}">Schedule</th>
                    <th style="${th}">Estimated Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${tripsRows}
                </tbody>
              </table>
              <p style="margin: 20px 0 15px 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Please review and approve at your earliest convenience.
              </p>
              <p style="margin: 20px 0 0 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;">
                <a href="${sheetUrl}" style="color: #0066cc; text-decoration: underline; font-weight: bold;">Click here to review</a>
              </p>
              <p style="margin: 30px 0 0 0; font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Best regards,<br/>
                <strong>${escapeHtmlEmail(picName)}</strong>
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000000;">
                <tr>
                  <td style="font-family: Aptos, Calibri, sans-serif; font-size: 10pt; color: #000000;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Aptos, Calibri, sans-serif; font-size: 10pt; color: #000000;">
                    ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
}

/**
 * HTML Report email
 */
function buildBusinessTripReportEmail(tripData, keyActivities, keyFindings, followUpActions, folderLink) {
  const picName = tripData.pic || 'PIC';
  const destination = tripData.destination || 'N/A';
  const workingDate = tripData.workingDate || 'N/A';
  const totalCost = tripData.totalCost ? tripData.totalCost + ' ' + CONFIG.CURRENCY_LABEL : 'N/A';

  const formatBulletContent = (text) => {
    if (!text) return 'N/A';
    return text.toString().split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => '• ' + escapeHtmlEmail(line))
      .join('<br/>');
  };

  const p = 'font-family: Aptos, Calibri, sans-serif; font-size: 11pt; color: #000000;';

  return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; ${p}">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 10px 0; ${p}">Dear Ha san,</p>
              <p style="margin: 0 0 20px 0; ${p}">Dear Shuhei san,</p>
              <p style="margin: 0 0 15px 0; ${p} line-height: 1.6;">
                Here is my report for business trip at <strong>${escapeHtmlEmail(destination)}</strong> for <strong>${escapeHtmlEmail(workingDate)} days</strong>:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #f9f9f9; border: 1px solid #000000;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0 0 8px 0; ${p}"><strong>Total Cost:</strong> ${escapeHtmlEmail(totalCost)}</p>
                    <p style="margin: 0 0 8px 0; ${p} line-height: 1.6;"><strong>Schedule:</strong> ${escapeHtmlEmail(tripData.schedule || 'N/A')}</p>
                    <p style="margin: 0; ${p} line-height: 1.6;"><strong>Purpose:</strong> ${escapeHtmlEmail(tripData.purpose || 'N/A')}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 10px 0; ${p} font-weight: bold;">I. Key Activities</p>
              <p style="margin: 0 0 15px 0; ${p} line-height: 1.8;">${formatBulletContent(keyActivities)}</p>
              <p style="margin: 20px 0 10px 0; ${p} font-weight: bold;">II. Key Findings</p>
              <p style="margin: 0 0 15px 0; ${p} line-height: 1.8;">${formatBulletContent(keyFindings)}</p>
              <p style="margin: 20px 0 10px 0; ${p} font-weight: bold;">III. Follow Up Actions</p>
              <p style="margin: 0 0 15px 0; ${p} line-height: 1.8;">${formatBulletContent(followUpActions)}</p>
              <p style="margin: 30px 0 0 0; ${p}">
                Please <a href="${folderLink}" style="color: #000000; text-decoration: underline; font-weight: bold;">click here</a> to see more detail about this trip.
              </p>
              <p style="margin: 30px 0 0 0; ${p} line-height: 1.6;">
                Best regards,<br/>
                <strong>${escapeHtmlEmail(picName)}</strong>
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000000;">
                <tr>
                  <td style="font-family: Aptos, Calibri, sans-serif; font-size: 10pt; color: #000000;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Aptos, Calibri, sans-serif; font-size: 10pt; color: #000000;">
                    ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
}

function escapeHtmlEmail(text) {
  if (text === null || text === undefined) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Gửi Report email
 * TO: Shuhei-san (CONFIG.REPORT_TO_EMAIL) | CC: Director (cột Z)
 */
function sendReportEmail(sheet, rowNumber, tripData, docLink, keyActivities, keyFindings, followUpActions) {
  try {
    SpreadsheetApp.flush();

    let directorEmail = (sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue() || '').toString().trim();

    if (!directorEmail) {
      Utilities.sleep(2000);
      directorEmail = (sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue() || '').toString().trim();
    }
    if (!directorEmail) {
      const picName = tripData.pic || getPICNameFromEmail(Session.getActiveUser().getEmail());
      directorEmail = getDefaultEmailsForPIC(picName).director || '';
    }

    const directorValid = isValidEmail(directorEmail);

    const htmlBody = buildBusinessTripReportEmail(tripData, keyActivities, keyFindings, followUpActions, tripData.folderLink);
    const subject = 'Business Trip Report - ' + (tripData.pic || 'PIC') + ' - ' + tripData.destination +
                    ' - From ' + tripData.startDate + ' to ' + tripData.finishDate;

    const mail = {
      to: CONFIG.REPORT_TO_EMAIL,
      subject: subject,
      htmlBody: htmlBody,
      name: 'Mani Medical Hanoi - Business Trip System'
    };
    if (directorValid) mail.cc = directorEmail;

    MailApp.sendEmail(mail);

    return {
      success: true,
      message: 'Report email sent!\n\n📧 TO: ' + CONFIG.REPORT_TO_EMAIL + '\n📋 CC: ' + (directorValid ? directorEmail : 'None')
    };

  } catch (error) {
    Logger.log('❌ sendReportEmail: ' + error.message);
    return { success: false, message: 'Error sending report email: ' + error.message };
  }
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function columnLetterToIndex(letter) {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return index;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    if (dateStr instanceof Date) return dateStr;
    const s = dateStr.toString().trim();

    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);           // dd/MM/yyyy
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

    m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);                     // yyyy-MM-dd (input type=date)
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  } catch (error) {
    Logger.log('Error parsing date: ' + dateStr);
    return null;
  }
}

function parseDateFromDDMMYYYY(dateStr) {
  if (!dateStr || dateStr === 'N/A') return null;
  return parseDate(dateStr);
}

function calculateWorkingDays(startDate, finishDate) {
  if (!startDate || !finishDate) return 0;
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((finishDate - startDate) / oneDay)) + 1;
}

/**
 * Email → tên PIC (dùng PIC_MAPPING ở đầu file)
 */
function getPICNameFromEmail(email) {
  if (!email) throw new Error('Email cannot be empty');
  const picName = PIC_MAPPING[email.toString().toLowerCase().trim()];
  if (picName) return picName;
  throw new Error('Email "' + email + '" is not configured in PIC mapping. ' +
                  'Please add this email to PIC_MAPPING at the top of the script.');
}

/**
 * Email → tên ngắn (HOD/Director)
 */
function getNameFromEmail(email) {
  if (!email || email.toString().trim() === '') return '';
  const nameMapping = {
    'tt.tuyen@manimedicalhanoi.com': 'Tuyen',
    'vtt.hoa@manimedicalhanoi.com': 'Hoa',
    'nt.ha@manimedicalhanoi.com': 'Ha'
  };
  const emailLower = email.toString().toLowerCase().trim();
  return nameMapping[emailLower] || emailLower.split('@')[0];
}

/**
 * Tên HOD cho lời chào (null nếu là Ha – Director đã có sẵn trong greeting)
 */
function getHODNameFromEmail(hodEmail) {
  if (!hodEmail || hodEmail.toString().trim() === '') return null;
  const email = hodEmail.toString().toLowerCase().trim();

  const hodMapping = {
    'nt.ha@manimedicalhanoi.com': null,
    'tt.tuyen@manimedicalhanoi.com': 'Tuyen',
    'vtt.hoa@manimedicalhanoi.com': 'Hoa'
  };
  if (hodMapping.hasOwnProperty(email)) return hodMapping[email];

  const parts = email.split('@')[0].split('.');
  if (parts.length > 1) {
    const name = parts[parts.length - 1];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return null;
}

/**
 * Greeting: luôn "Dear Ha-san", thêm HOD nếu HOD không phải Ha
 */
function buildProposalGreeting(hodEmail) {
  let greeting = 'Dear Ha-san';
  const hodName = getHODNameFromEmail(hodEmail);
  if (hodName) greeting += ',<br/>Dear ' + hodName + '-san';
  return greeting;
}

// ===========================
// SETUP CHECK (chạy từ Apps Script Editor)
// ===========================

/**
 * Kiểm tra 1 user đã sẵn sàng dùng hệ thống chưa.
 * Đổi email trong testMiewSetup() hoặc gọi debugUserSetup('email@...') rồi xem Logs.
 */
function debugUserSetup(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const target = (email || Session.getActiveUser().getEmail()).toLowerCase().trim();
  const lines = [];

  // 1. PIC mapping
  let picName = '';
  try {
    picName = getPICNameFromEmail(target);
    lines.push('✅ PIC_MAPPING: ' + target + ' → "' + picName + '"');
  } catch (e) {
    lines.push('❌ PIC_MAPPING: email chưa có trong PIC_MAPPING');
  }

  // 2. Master sheet – PIC list (E2:E30)
  const master = ss.getSheetByName(CONFIG.MASTER_SHEET);
  if (master && picName) {
    const picList = master.getRange('E2:E30').getValues().flat().map(v => v.toString().trim());
    lines.push(picList.indexOf(picName) !== -1
      ? '✅ Master!E2:E30 có tên "' + picName + '"'
      : '❌ Master!E2:E30 CHƯA có tên "' + picName + '" → thêm vào để chọn được ở cột D');
  }

  // 3. Rows trong sheet chính
  const picData = getPICData(sheet, target);
  lines.push((picData.rows.length > 0 ? '✅ ' : '⚠️ ') + 'Số dòng có cột X = email này: ' + picData.rows.length);
  picData.rows.slice(0, 5).forEach(r => {
    lines.push('   • Row ' + r.row + ' | PIC: ' + r.pic + ' | ' + r.destination + ' | HOD(Y): ' + (r.emailHOD || 'TRỐNG') +
               ' | Director(Z): ' + (r.emailDirector || 'TRỐNG') + ' | Status: ' + (r.approvalStatus || 'Not Yet'));
  });
  if (picData.rows.length === 0) {
    lines.push('   → Thêm 1 dòng, chọn PIC ở cột D, kiểm tra cột X tự hiện email (array formula).');
  }

  // 4. Menu HOD
  lines.push('ℹ️ isHOD (hiện HOD Menu): ' + isHOD(target));

  Logger.log('=== SETUP CHECK: ' + target + ' ===\n' + lines.join('\n'));
  return lines.join('\n');
}

function testMiewSetup() {
  debugUserSetup('manithailand4@manimedicalhanoi.com');
}

// ===========================
// USER GUIDE DIALOGS
// ===========================

function guideCSS(color) {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Aptos, Calibri, sans-serif; background: white; padding: 20px; font-size: 16px; line-height: 1.6; }
    .header { background: ${color}; color: white; padding: 20px; border: 3px solid #000; margin-bottom: 20px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .header p { font-size: 16px; margin: 5px 0; }
    .tabs { display: flex; border-bottom: 3px solid #000; margin-bottom: 20px; }
    .tab-button { flex: 1; padding: 15px; background: white; border: 3px solid #000; border-bottom: none; cursor: pointer;
                  font-size: 18px; font-weight: bold; font-family: Aptos, Calibri, sans-serif; }
    .tab-button.active { background: ${color}; color: white; }
    .tab-button:hover:not(.active) { background: #f0f0f0; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .section { margin-bottom: 30px; padding: 20px; border: 2px solid #ddd; border-radius: 8px; background: #f9f9f9; }
    .section h2 { color: ${color}; font-size: 22px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid ${color}; }
    .step { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid ${color}; border-radius: 4px; }
    .step-number { display: inline-block; width: 30px; height: 30px; background: ${color}; color: white; text-align: center;
                   line-height: 30px; border-radius: 50%; font-weight: bold; margin-right: 10px; }
    .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 4px; }
    .warning { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0; border-radius: 4px; }
    .success { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; border-radius: 4px; }
    .info-box { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; border-radius: 4px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 14px; }
    ul, ol { margin-left: 25px; margin-top: 10px; }
    li { margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: ${color}; color: white; font-weight: bold; }
    .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 13px; font-weight: bold; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-approved { background: #d4edda; color: #155724; }
    .status-rejected { background: #f8d7da; color: #721c24; }
  `;
}

function guideTabScript() {
  return `
<script>
  function switchTab(event, tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) tabContents[i].classList.remove('active');
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) tabButtons[i].classList.remove('active');
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
  }
</script>`;
}

function showPICUserGuide() {
  try {
    const html = HtmlService.createHtmlOutput(getHTMLContentPICGuide()).setWidth(1200).setHeight(800);
    SpreadsheetApp.getUi().showModalDialog(html, 'User Guide for PIC - Hướng dẫn sử dụng cho PIC');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function getHTMLContentPICGuide() {
  const userEmail = Session.getActiveUser().getEmail();
  let picName;
  try { picName = getPICNameFromEmail(userEmail); } catch (e) { picName = '(not configured)'; }
  const support = 'mmh.product@manimedicalhanoi.com';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${guideCSS('#4A90E2')}</style></head>
<body>
  <div class="header">
    <h1>📘 BUSINESS TRIP MANAGEMENT SYSTEM</h1>
    <p><strong>User Guide for Staff/PIC</strong></p>
    <p>Hướng dẫn sử dụng dành cho nhân viên</p>
    <p style="margin-top: 10px;">User: <strong>${escapeHtmlEmail(picName)}</strong> (${escapeHtmlEmail(userEmail)})</p>
  </div>

  <div class="tabs">
    <button class="tab-button active" onclick="switchTab(event, 'english')">🇬🇧 English</button>
    <button class="tab-button" onclick="switchTab(event, 'vietnamese')">🇻🇳 Tiếng Việt</button>
  </div>

  <!-- ENGLISH -->
  <div id="english" class="tab-content active">
    <div class="section">
      <h2>1. WHAT DOES THIS SYSTEM DO?</h2>
      <div class="success"><ul>
        <li>Send business trip proposals and receive approvals with one click</li>
        <li>Auto-create a Google Drive folder for each trip</li>
        <li>Auto-create the trip report file in that folder</li>
        <li>Track approval status and receive email notifications</li>
      </ul></div>
    </div>

    <div class="section">
      <h2>STEP 1: ACCESS THE SYSTEM</h2>
      <div class="step"><span class="step-number">1</span><strong>Open the Google Sheet</strong> <code>MMH Travel report</code> with your company email.</div>
      <div class="step"><span class="step-number">2</span><strong>Grant permission (first time only)</strong>
        <ul><li><code>Continue</code> → choose your email</li><li><code>Advanced</code> → <code>Go to project</code> → <code>Allow</code></li></ul></div>
    </div>

    <div class="section">
      <h2>STEP 2: CREATE A PROPOSAL</h2>
      <div class="warning"><strong>⚠️ Add your trip as a new row in the sheet FIRST.</strong> The dialog only shows rows where column X = your email.</div>
      <div class="step"><span class="step-number">1</span><strong>Fill in the sheet</strong>
        <ul>
          <li><strong>Column D – PIC</strong>: select your name</li>
          <li><strong>E / F</strong>: Start Date / Finish Date</li>
          <li><strong>H</strong>: Destination · <strong>I</strong>: Co-Traveler (if any)</li>
          <li><strong>J</strong>: Purpose · <strong>K</strong>: Expected Result</li>
          <li><strong>L</strong>: Estimated Cost · <strong>N</strong>: Schedule</li>
        </ul></div>
      <div class="highlight">Do <strong>NOT</strong> type into formula columns (Month, Working days, Folder Name, Email columns X–AA…).</div>
      <div class="step"><span class="step-number">2</span>Menu <code>PIC Menu</code> → <code>Business Trip Plan & Report</code> → tab <code>PLAN</code></div>
      <div class="step"><span class="step-number">3</span>Tick the trip in the <code>Select</code> column (new trips are ticked automatically) and keep <code>Send Proposal Email</code> ticked.</div>
      <div class="step"><span class="step-number">4</span>Click <code>Save Changes</code> → the proposal email is sent to Director (TO) and HOD + you (CC); the Drive folder is created.</div>
    </div>

    <div class="section">
      <h2>STEP 3: TRACK APPROVAL (column R)</h2>
      <table>
        <tr><th>Status</th><th>Meaning</th></tr>
        <tr><td><span class="status-badge status-pending">Already sent propose email</span></td><td>Waiting for review</td></tr>
        <tr><td><span class="status-badge status-approved">Approved</span></td><td>Approved – ready to travel</td></tr>
        <tr><td><span class="status-badge status-rejected">Rejected</span></td><td>See Manager Comment (column S), edit and send again</td></tr>
      </table>
    </div>

    <div class="section">
      <h2>STEP 4: SUBMIT THE REPORT (within 3 days after the trip)</h2>
      <div class="step"><span class="step-number">1</span><code>PIC Menu</code> → <code>Business Trip Plan & Report</code> → tab <code>REPORT</code></div>
      <div class="step"><span class="step-number">2</span>Select the approved trip.</div>
      <div class="step"><span class="step-number">3</span>Fill <strong>Key Activities</strong> (≥ 50 characters), <strong>Key Findings</strong> (≥ 50), <strong>Follow Up Actions</strong> (≥ 30).</div>
      <div class="step"><span class="step-number">4</span>Click <code>Generate & Save Report</code> → report is written to column Q and a report document is created in the trip folder. If <code>Send Report Email</code> is ticked, the report email is sent.</div>
    </div>

    <div class="section">
      <h2>NEED SUPPORT?</h2>
      <div class="info-box">Email: <code>${support}</code></div>
    </div>
  </div>

  <!-- VIETNAMESE -->
  <div id="vietnamese" class="tab-content">
    <div class="section">
      <h2>1. HỆ THỐNG HỖ TRỢ NHỮNG GÌ?</h2>
      <div class="success"><ul>
        <li>Gửi đề xuất công tác & nhận phê duyệt chỉ với 1 click</li>
        <li>Tự động tạo thư mục Google Drive cho mỗi chuyến</li>
        <li>Tự động tạo file báo cáo trong thư mục đó</li>
        <li>Theo dõi trạng thái phê duyệt, nhận email thông báo</li>
      </ul></div>
    </div>

    <div class="section">
      <h2>BƯỚC 1: TRUY CẬP</h2>
      <div class="step"><span class="step-number">1</span>Mở Google Sheet <code>MMH Travel report</code> bằng email công ty.</div>
      <div class="step"><span class="step-number">2</span><strong>Cấp quyền (lần đầu)</strong>: <code>Continue</code> → chọn email → <code>Advanced</code> → <code>Go to project</code> → <code>Allow</code></div>
    </div>

    <div class="section">
      <h2>BƯỚC 2: TẠO ĐỀ XUẤT</h2>
      <div class="warning"><strong>⚠️ Thêm dòng công tác vào Sheet TRƯỚC.</strong> Hộp thoại chỉ hiện các dòng có cột X = email của bạn.</div>
      <div class="step"><span class="step-number">1</span><strong>Điền Sheet</strong>: D (chọn tên PIC), E/F (ngày đi/về), H (địa điểm), I (người đi cùng), J (mục đích), K (kết quả mong đợi), L (chi phí dự kiến), N (lịch trình).</div>
      <div class="highlight"><strong>KHÔNG</strong> nhập vào các cột có công thức (Month, Working days, Folder Name, cột email X–AA…).</div>
      <div class="step"><span class="step-number">2</span>Menu <code>PIC Menu</code> → <code>Business Trip Plan & Report</code> → tab <code>PLAN</code></div>
      <div class="step"><span class="step-number">3</span>Tick chuyến ở cột <code>Select</code> (chuyến mới được tick sẵn), giữ tick <code>Send Proposal Email</code>.</div>
      <div class="step"><span class="step-number">4</span>Bấm <code>Save Changes</code> → email gửi Director (TO), HOD + bạn (CC); thư mục Drive được tạo.</div>
    </div>

    <div class="section">
      <h2>BƯỚC 3: THEO DÕI PHÊ DUYỆT (cột R)</h2>
      <table>
        <tr><th>Trạng thái</th><th>Ý nghĩa</th></tr>
        <tr><td><span class="status-badge status-pending">Already sent propose email</span></td><td>Đang chờ duyệt</td></tr>
        <tr><td><span class="status-badge status-approved">Approved</span></td><td>Đã duyệt</td></tr>
        <tr><td><span class="status-badge status-rejected">Rejected</span></td><td>Xem Manager Comment (cột S), sửa và gửi lại</td></tr>
      </table>
    </div>

    <div class="section">
      <h2>BƯỚC 4: NỘP BÁO CÁO (trong 3 ngày sau chuyến đi)</h2>
      <div class="step"><span class="step-number">1</span><code>PIC Menu</code> → <code>Business Trip Plan & Report</code> → tab <code>REPORT</code></div>
      <div class="step"><span class="step-number">2</span>Chọn chuyến đã Approved.</div>
      <div class="step"><span class="step-number">3</span>Điền Key Activities (≥ 50 ký tự), Key Findings (≥ 50), Follow Up Actions (≥ 30).</div>
      <div class="step"><span class="step-number">4</span>Bấm <code>Generate & Save Report</code> → nội dung ghi vào cột Q, file báo cáo tạo trong thư mục chuyến đi; nếu tick <code>Send Report Email</code> thì gửi email báo cáo.</div>
    </div>

    <div class="section">
      <h2>CẦN HỖ TRỢ?</h2>
      <div class="info-box">Email: <code>${support}</code></div>
    </div>
  </div>
${guideTabScript()}
</body>
</html>
  `;
}

function showHODUserGuide() {
  try {
    const html = HtmlService.createHtmlOutput(getHTMLContentHODGuide()).setWidth(1200).setHeight(800);
    SpreadsheetApp.getUi().showModalDialog(html, 'User Guide for HOD - Hướng dẫn sử dụng cho HOD');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function getHTMLContentHODGuide() {
  const userEmail = Session.getActiveUser().getEmail();
  const hodName = getNameFromEmail(userEmail);
  const support = 'mmh.product@manimedicalhanoi.com';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>${guideCSS('#E74C3C')}</style></head>
<body>
  <div class="header">
    <h1>📘 BUSINESS TRIP MANAGEMENT SYSTEM</h1>
    <p><strong>User Guide for HOD/Managers</strong></p>
    <p>Hướng dẫn sử dụng dành cho Quản lý</p>
    <p style="margin-top: 10px;">User: <strong>${escapeHtmlEmail(hodName)}</strong> (${escapeHtmlEmail(userEmail)})</p>
  </div>

  <div class="tabs">
    <button class="tab-button active" onclick="switchTab(event, 'english')">🇬🇧 English</button>
    <button class="tab-button" onclick="switchTab(event, 'vietnamese')">🇻🇳 Tiếng Việt</button>
  </div>

  <div id="english" class="tab-content active">
    <div class="section">
      <h2>1. APPROVE PROPOSALS</h2>
      <div class="step"><span class="step-number">1</span><code>HOD Menu</code> → <code>Business Trip Approval</code> (shows all trips where column Y = your email).</div>
      <div class="step"><span class="step-number">2</span>Default filter: <span class="status-badge status-pending">Already sent propose email</span></div>
      <div class="step"><span class="step-number">3</span>Tick <code>Select</code>, choose <code>Approved</code> / <code>Rejected</code>, add <code>HOD Comment</code> (required when rejecting).</div>
      <div class="step"><span class="step-number">4</span>Click <code>Process Selected Trips</code> → status (R) & comment (S) are updated; PIC is notified by email if the box is ticked.</div>
    </div>
    <div class="section">
      <h2>2. VIEW REPORTS</h2>
      <div class="step">Tab <code>VIEW BUSINESS TRIP REPORT</code>: approved trips with submitted reports, filter by Month / PIC, on-time rate.</div>
    </div>
    <div class="section">
      <h2>⚠️ NOTES</h2>
      <div class="warning"><ol>
        <li>Review details carefully before approving</li>
        <li>Write a clear comment when rejecting so the PIC can revise and resubmit</li>
        <li>Approve in time so trip plans are not affected</li>
      </ol></div>
    </div>
    <div class="section"><h2>NEED SUPPORT?</h2><div class="info-box">Email: <code>${support}</code></div></div>
  </div>

  <div id="vietnamese" class="tab-content">
    <div class="section">
      <h2>1. PHÊ DUYỆT ĐỀ XUẤT</h2>
      <div class="step"><span class="step-number">1</span><code>HOD Menu</code> → <code>Business Trip Approval</code> (hiện các chuyến có cột Y = email của bạn).</div>
      <div class="step"><span class="step-number">2</span>Bộ lọc mặc định: <span class="status-badge status-pending">Already sent propose email</span></div>
      <div class="step"><span class="step-number">3</span>Tick <code>Select</code>, chọn <code>Approved</code> / <code>Rejected</code>, nhập <code>HOD Comment</code> (bắt buộc khi từ chối).</div>
      <div class="step"><span class="step-number">4</span>Bấm <code>Process Selected Trips</code> → cập nhật cột R & S; gửi email cho PIC nếu tick ô thông báo.</div>
    </div>
    <div class="section">
      <h2>2. XEM BÁO CÁO</h2>
      <div class="step">Tab <code>VIEW BUSINESS TRIP REPORT</code>: các chuyến đã duyệt có báo cáo, lọc theo Tháng / PIC, tỷ lệ đúng hạn.</div>
    </div>
    <div class="section">
      <h2>⚠️ LƯU Ý</h2>
      <div class="warning"><ol>
        <li>Xem kỹ thông tin trước khi duyệt</li>
        <li>Ghi comment rõ ràng khi từ chối để PIC sửa và gửi lại</li>
        <li>Duyệt kịp thời để không ảnh hưởng kế hoạch công tác</li>
      </ol></div>
    </div>
    <div class="section"><h2>CẦN HỖ TRỢ?</h2><div class="info-box">Email: <code>${support}</code></div></div>
  </div>
${guideTabScript()}
</body>
</html>
  `;
}