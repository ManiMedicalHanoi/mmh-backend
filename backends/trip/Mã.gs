// ===========================
// BUSINESS TRIP MANAGEMENT SYSTEM - ENHANCED VERSION
// ===========================

// Configuration
const CONFIG = {
  SHEET_NAME: 'MMH Travel report',
  CALENDAR_SHEET: 'Calander',
  MASTER_SHEET: 'Master',
  HEADER_ROW: 3,
  DATA_START_ROW: 4,
  PARENT_FOLDER_ID: '1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',
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
    EQUIPMENT: 'O',          // ✅ MỚI - Cột Equipment
    FOLDER_NAME: 'P',        // ✅ DỊCH từ O -> P
    FOLDER_LINK: 'Q',        // ✅ DỊCH từ P -> Q
    RESULT: 'R',             // ✅ DỊCH từ Q -> R
    APPROVAL_STATUS: 'S',    // ✅ DỊCH từ R -> S
    MANAGER_COMMENT: 'T',    // ✅ DỊCH từ S -> T
    ACTUAL_REPORT_DATE: 'U', // ✅ DỊCH từ T -> U
    REPORT_DEADLINE: 'V',    // ✅ DỊCH từ U -> V
    DEADLINE_DIFF: 'W',      // ✅ DỊCH từ V -> W
    CHECK_DEADLINE: 'X',     // ✅ DỊCH từ W -> X
    EMAIL_PIC: 'Y',          // ✅ DỊCH từ X -> Y
    EMAIL_HOD: 'Z',          // ✅ DỊCH từ Y -> Z
    EMAIL_DIRECTOR: 'AA',    // ✅ DỊCH từ Z -> AA
    EMAIL_CC: 'AB'           // ✅ DỊCH từ AA -> AB
  }
};

// ===========================
// MENU CREATION
// ===========================

// ===========================
// MENU CREATION - ENHANCED VERSION
// ===========================

/**
 * ✅ CẬP NHẬT: Cho phép nt.ha@manimedicalhanoi.com sử dụng tất cả menu
 */
/**
 * ✅ CẬP NHẬT: Thêm User Guide vào menu
 */
/**
 * ✅ CẬP NHẬT: Thêm User Guide vào menu
 */
/**
 * ✅ VERSION 2.0 - onOpen với logging chi tiết
 * Function này chạy tự động khi mở Google Sheet
 */
function onOpen() {
  // Log để debug
  const timestamp = new Date().toISOString();
  console.log('═══════════════════════════════════════════');
  console.log('onOpen() triggered at: ' + timestamp);
  console.log('═══════════════════════════════════════════');
  
  try {
    const ui = SpreadsheetApp.getUi();
    const userEmail = Session.getActiveUser().getEmail();
    
    console.log('User Email: ' + userEmail);
    
    // ✅ BƯỚC 1: Tạo PIC Menu (cho tất cả users)
    console.log('');
    console.log('Creating PIC Menu...');
    try {
      ui.createMenu('PIC Menu')
        .addItem('📖 User Guide', 'showPICUserGuide')
        .addSeparator()
        .addItem('Business Trip Plan & Report', 'showBusinessTripDialog')
        .addToUi();
      console.log('✅ PIC Menu created successfully');
    } catch (picError) {
      console.log('❌ ERROR creating PIC Menu: ' + picError.message);
      throw picError; // Re-throw để dừng execution
    }
    
    // ✅ BƯỚC 2: Kiểm tra quyền HOD
    console.log('');
    console.log('Checking HOD permission...');
    const hasHODPermission = isHOD(userEmail);
    console.log('isHOD() returned: ' + hasHODPermission);
    
    // ✅ BƯỚC 3: Tạo HOD Menu nếu có quyền
    if (hasHODPermission) {
      console.log('User has HOD permission → Creating HOD Menu...');
      try {
        ui.createMenu('HOD Menu')
          .addItem('📖 User Guide', 'showHODUserGuide')
          .addSeparator()
          .addItem('Business Trip Approval', 'showHODApprovalDialog')
          .addToUi();
        console.log('✅ HOD Menu created successfully');
      } catch (hodError) {
        console.log('❌ ERROR creating HOD Menu: ' + hodError.message);
        console.log('Stack: ' + hodError.stack);
        // Không throw error ở đây để PIC Menu vẫn hiển thị
      }
    } else {
      console.log('⚠️ User does NOT have HOD permission → HOD Menu not created');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('onOpen() completed successfully');
    console.log('═══════════════════════════════════════════');
    
  } catch (error) {
    console.log('');
    console.log('❌ CRITICAL ERROR in onOpen():');
    console.log('Error: ' + error.message);
    console.log('Stack: ' + error.stack);
    console.log('═══════════════════════════════════════════');
    
    // Hiển thị lỗi cho user
    SpreadsheetApp.getUi().alert(
      'Error Loading Menu',
      'An error occurred while loading the menu:\n\n' + error.message + 
      '\n\nPlease check Apps Script logs for details.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
/**
 * Kiểm tra xem user có phải HOD không
 * Dựa vào cột X (EMAIL_HOD) trong sheet
 * @param {string} userEmail - Email của user hiện tại
 * @returns {boolean} - true nếu là HOD
 */
/**
 * Kiểm tra xem user có phải HOD không
 * ✅ CẬP NHẬT: nt.ha@manimedicalhanoi.com có quyền HOD
 * @param {string} userEmail - Email của user hiện tại
 * @returns {boolean} - true nếu là HOD
 */
/**
 * ✅ CẬP NHẬT V2: Kiểm tra user có quyền HOD không
 * Logic mới: Kiểm tra email trong các cột X, Y, Z, AA
 * - Cột Z (Director Email) → Luôn có đủ menu
 * - Các cột X, Y, AA → Nếu có email → có đủ menu
 * 
 * @param {string} userEmail - Email của user hiện tại
 * @returns {boolean} - true nếu có quyền HOD (hiển thị HOD Menu)
 */
function isHOD(userEmail) {
  try {
    // ⚡ Normalize email để so sánh chính xác
    const normalizedUserEmail = userEmail.toLowerCase().trim();
    
    // ✅ BƯỚC 1: Kiểm tra Super Admin (giữ nguyên logic cũ)
    // ✅ Super Admin check - cả 2 domain
    const superAdminEmails = ['nt.ha@manimedicalhanoi.com', 'nt.ha@mani.inc'];
    if (superAdminEmails.includes(normalizedUserEmail)) {
      Logger.log('✅ Super Admin detected: ' + userEmail);
      return true;
    }
    
    // ✅ Check HOD by email prefix (hỗ trợ cả 2 domain)
    const emailPrefix = normalizedUserEmail.split('@')[0];
    const hodPrefixes = ['tt.tuyen', 'vtt.hoa', 'nt.ha'];
    if (hodPrefixes.includes(emailPrefix)) {
      Logger.log('✅ HOD detected by prefix: ' + emailPrefix);
      return true;
    }
    
    // ✅ BƯỚC 2: Lấy sheet và kiểm tra dữ liệu
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      Logger.log('⚠️ Sheet not found: ' + CONFIG.SHEET_NAME);
      return false;
    }
    
    const lastRow = sheet.getLastRow();
    
    // Nếu không có dữ liệu
    if (lastRow < CONFIG.DATA_START_ROW) {
      Logger.log('⚠️ No data rows found');
      return false;
    }
    
    // ✅ BƯỚC 3: Lấy column indexes cho 4 cột cần kiểm tra
    const emailColumns = {
      PIC: columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC),        // Cột X
      HOD: columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD),        // Cột Y
      DIRECTOR: columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR), // Cột Z
      CC: columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC)           // Cột AA
    };
    
    Logger.log('🔍 Checking email in columns: X, Y, Z, AA');
    Logger.log('   User email: ' + normalizedUserEmail);
    
    // ✅ BƯỚC 4: Quét qua tất cả các dòng dữ liệu
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      
      // 🎯 ƯU TIÊN CAO NHẤT: Kiểm tra cột Z (Director) trước
      const directorEmail = sheet.getRange(i, emailColumns.DIRECTOR).getValue();
      if (directorEmail && directorEmail.toString().toLowerCase().trim() === normalizedUserEmail) {
        Logger.log('✅ DIRECTOR detected at row ' + i + ' (Column Z)');
        Logger.log('   → Full access granted (PIC + HOD menus)');
        return true;
      }
      
      // 🔍 Kiểm tra cột Y (HOD Email)
      const hodEmail = sheet.getRange(i, emailColumns.HOD).getValue();
      if (hodEmail && hodEmail.toString().toLowerCase().trim() === normalizedUserEmail) {
        Logger.log('✅ HOD email found at row ' + i + ' (Column Y)');
        return true;
      }
      
      // 🔍 Kiểm tra cột X (PIC Email)
      const picEmail = sheet.getRange(i, emailColumns.PIC).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === normalizedUserEmail) {
        Logger.log('✅ PIC email found at row ' + i + ' (Column X)');
        return true;
      }
      
      // 🔍 Kiểm tra cột AA (CC Email)
      const ccEmail = sheet.getRange(i, emailColumns.CC).getValue();
      if (ccEmail && ccEmail.toString().toLowerCase().trim() === normalizedUserEmail) {
        Logger.log('✅ CC email found at row ' + i + ' (Column AA)');
        return true;
      }
    }
    
    // ❌ Không tìm thấy email trong bất kỳ cột nào
    Logger.log('❌ Email not found in any column (X, Y, Z, AA)');
    Logger.log('   → Only PIC Menu will be displayed');
    return false;
    
  } catch (error) {
    Logger.log('❌ Error in isHOD: ' + error.message);
    Logger.log('   Stack: ' + error.stack);
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
    
    // Get PIC data
    const picData = getPICData(sheet, userEmail);
    
    if (picData.rows.length === 0) {
      SpreadsheetApp.getUi().alert('No business trip records found for your email: ' + userEmail);
      return;
    }
    
    // Get master data for dropdowns
    const masterData = getMasterData(ss);
    
    // Build HTML with embedded data
    const htmlContent = getHtmlContent(picData, masterData, userEmail);
    const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(1920)  // ✅ SỬA: Tăng từ 1400 -> 1600
      .setHeight(1000); // ✅ SỬA: Tăng từ 800 -> 900
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Business Trip Plan & Report');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    Logger.log('Error in showBusinessTripDialog: ' + error.message);
  }
}
// ===========================
// HOD APPROVAL DIALOG
// ===========================

/**
 * Hiển thị dialog approval cho HOD
 * Chỉ hiển thị các trip có status "Already sent propose email"
 */
/**
 * Hiển thị dialog cho HOD để approve/reject business trips
 * ✅ ENHANCED - Increased dialog size to 2400x1200
 */
/**
 * Hiển thị dialog cho HOD để approve/reject business trips
 * ✅ ENHANCED - Increased dialog size to 2400x1200
 * ✅ FIXED - Corrected function name from isUserHOD to isHOD
 */
function showHODApprovalDialog() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== showHODApprovalDialog START ===');
    Logger.log('User email: ' + userEmail);
    
    // ✅ FIX: Đổi từ isUserHOD → isHOD
    if (!isHOD(userEmail)) {
      SpreadsheetApp.getUi().alert('Access Denied', 
        'You do not have permission to access the HOD Approval Dashboard.',
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Lấy dữ liệu trips cần approve
    const approvalData = getHODApprovalData(sheet, userEmail);
    
    if (approvalData.rows.length === 0) {
      SpreadsheetApp.getUi().alert('No Pending Approvals', 
        'There are no business trips pending your approval at this time.',
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Lấy master data cho dropdowns
    const masterData = getMasterData(ss);
    
    // Build HTML cho HOD - ✅ ĐÃ CẢI THIỆN LAYOUT
    const htmlContent = getHtmlContentForHOD(approvalData, masterData, userEmail);
    const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(2400)  // ✅ TĂNG WIDTH
      .setHeight(1200); // ✅ TĂNG HEIGHT
    
    // ✅ XÓA TITLE TRÙNG - chỉ giữ lại title đơn giản
    SpreadsheetApp.getUi().showModalDialog(html, 'Business Trip Management - HOD Dashboard');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    Logger.log('Error in showHODApprovalDialog: ' + error.message);
  }
}
/**
 * Lấy danh sách business trips cần HOD approve
 * Chỉ lấy các trips có status "Already sent propose email"
 * @param {Sheet} sheet - Google Sheet object
 * @param {string} hodEmail - Email của HOD
 * @returns {Object} - Object chứa rows và hodEmail
 */
/**
 * Lấy danh sách business trips cần HOD approve
 * Chỉ lấy các trips có status "Already sent propose email"
 * ✅ ENHANCED - Thêm logging để debug
 * @param {Sheet} sheet - Google Sheet object
 * @param {string} hodEmail - Email của HOD
 * @returns {Object} - Object chứa rows và hodEmail
 */
/**
 * Lấy danh sách TẤT CẢ business trips thuộc HOD
 * ✅ ENHANCED - Lấy tất cả trips, không chỉ "Already sent propose email"
 * @param {Sheet} sheet - Google Sheet object
 * @param {string} hodEmail - Email của HOD
 * @returns {Object} - Object chứa rows và hodEmail
 */
function getHODApprovalData(sheet, hodEmail) {
  Logger.log('=== GET HOD APPROVAL DATA (ALL TRIPS) ===');
  Logger.log('HOD Email: ' + hodEmail);
  
  const lastRow = sheet.getLastRow();
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, 28); // ✅ 27→28
  const data = dataRange.getValues();
  
  let hodName = '';
  try {
    hodName = getPICNameFromEmail(hodEmail);
  } catch (e) {
    Logger.log('ℹ️ HOD email not in PIC mapping: ' + e.message);
  }
  
  const rows = [];
  const hodEmailLower = hodEmail.toLowerCase().trim();
  
  const hodToPICs = {
    'tt.tuyen': ['Dao', 'Yong', 'Man', 'Sui', 'Thuong', 'Trang', 'Duc Anh', 'Giang', 'Vinh', 'Minh Viet', 'Phuong', 'Khang', 'Viet Ha', 'Ngoc'],
    'vtt.hoa': ['Quynh Anh', 'Hau', 'Dam Viet', 'Dam Ha', 'Tuyen'],
    'nt.ha': []
  };
  
  const emailPrefix = hodEmailLower.split('@')[0];
  const isDirector = emailPrefix === 'nt.ha';
  const managedPICs = hodToPICs[emailPrefix] || [];
  
  Logger.log('HOD prefix: ' + emailPrefix);
  Logger.log('Is Director: ' + isDirector);
  Logger.log('Managed PICs: ' + (isDirector ? 'ALL' : managedPICs.join(', ')));
  
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i];
    const picName = rowData[2] || '';
    const emailHOD = rowData[24] || ''; // ✅ DỊCH 23→24 (Cột Z)
    
    let isMatch = false;
    
    if (emailHOD && emailHOD.toString().toLowerCase().trim() === hodEmailLower) {
      isMatch = true;
    }
    
    if (!isMatch && isDirector && picName.toString().trim() !== '') {
      isMatch = true;
    }
    
    if (!isMatch && managedPICs.length > 0 && picName) {
      isMatch = managedPICs.some(function(p) { return p.toLowerCase() === picName.toString().trim().toLowerCase(); });
    }
    
    if (isMatch) {
      const actualRow = CONFIG.DATA_START_ROW + i;
      
      rows.push({
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
        equipment: rowData[13] || '',       // ✅ MỚI
        folderName: rowData[14] || '',      // ✅ DỊCH
        folderLink: '',
        result: rowData[16] || '',           // ✅ DỊCH
        approvalStatus: rowData[17] || '',   // ✅ DỊCH
        managerComment: rowData[18] || '',   // ✅ DỊCH
        actualReportDate: formatDate(rowData[19]),
        reportDeadline: formatDate(rowData[20]),
        deadlineDiff: rowData[21] || '',
        checkDeadline: rowData[22] || '',
        emailPIC: rowData[23] || '',
        emailHOD: rowData[24] || '',
        emailDirector: rowData[25] || '',
        emailCC: rowData[26] || ''
      });
    }
  }
  
  rows.forEach(function(row) {
    row.folderLink = getFolderLinkFromSheet(sheet, row.row);
  });
  
  Logger.log('Total trips found: ' + rows.length);
  return { rows: rows, hodEmail: hodEmail };
}
/**
 * Tạo HTML content cho HOD Approval Dialog
 * @param {Object} approvalData - Dữ liệu trips cần approve
 * @param {Object} masterData - Master data cho dropdowns
 * @param {string} hodEmail - Email của HOD
 * @returns {string} - HTML content
 */
/**
 * Tạo HTML content cho HOD Approval Dialog
 * ✅ VIẾT LẠI - Theo template PIC (Calibri font, simple style)
 * @param {Object} approvalData - Dữ liệu trips cần approve
 * @param {Object} masterData - Master data cho dropdowns
 * @param {string} hodEmail - Email của HOD
 * @returns {string} - HTML content
 */
/**
 * Tạo HTML content cho HOD Approval Dialog
 * ✅ VERSION 2.0 - 2 TABS: Approval + View Reports
 * @param {Object} approvalData - Dữ liệu trips
 * @param {Object} masterData - Master data cho dropdowns
 * @param {string} hodEmail - Email của HOD
 * @returns {string} - HTML content
 */
/**
 * Tạo HTML content cho HOD Approval Dialog
 * ✅ VERSION 3.0 - OPTIMIZED LAYOUT WITH MAXIMIZED TABLE SPACE
 * - Increased dialog size to 2400x1200
 * - Removed duplicate header
 * - Minimized tabs, statistics, filters sections
 * - Maximized table display area
 * @param {Object} approvalData - Dữ liệu trips
 * @param {Object} masterData - Master data cho dropdowns
 * @param {string} hodEmail - Email của HOD
 * @returns {string} - HTML content
 */
function getHtmlContentForHOD(approvalData, masterData, hodEmail) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* ==================== BASE STYLES ==================== */
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    
    body { 
  font-family: Calibri, sans-serif;
  background: white;
  font-size: 16px;  /* ✅ TĂNG: 14px → 16px */
  overflow: hidden;
  height: 100vh;
}
    
    .container { 
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding: 8px 12px;
    }
    
    /* ✅ HEADER - ĐẨY LÊN SÁT VIỀN TRÊN */
    h2 {
      margin: 0 0 8px 0;
      padding: 8px 0;
      font-weight: bold;
      font-size: 28px;
      border-bottom: 2px solid black;
    }
    
    /* ==================== TABS - THU NHỎ ==================== */
    .tabs-container {
      display: flex;
      border-bottom: 2px solid black;
      margin-bottom: 8px;
    }
    
    .tab-button {
      flex: 1;
      padding: 10px;
      background: white;
      border: 2px solid black;
      border-bottom: none;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      transition: all 0.2s;
    }
    
    .tab-button.active {
      background: #87CEEB;
      color: white;
    }
    
    .tab-button:hover:not(.active) {
      background: #f0f0f0;
    }
    
    .tab-content {
      display: none;
      flex: 1;
      overflow: hidden;
      flex-direction: column;
    }
    
    .tab-content.active {
      display: flex;
    }
    
    /* ==================== STATISTICS - THU NHỎ VÀ ĐẨY CAO ==================== */
    .stats-section {
      background: #f5f5f5;
      border: 2px solid black;
      padding: 8px 12px;
      margin-bottom: 8px;
    }
    
    .stats-section h3 {
      margin: 0 0 6px 0;
      font-weight: bold;
      font-size: 20px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    
    .stat-card {
      background: #E8E8E8;
      border: 2px solid #87CEEB;
      padding: 8px;
      text-align: center;
    }
    
    .stat-label {
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #000;
    }
    
    /* ==================== FILTERS - THU NHỎ VÀ ĐẨY CAO ==================== */
    .filter-section {
      background: #f5f5f5;
      border: 2px solid black;
      padding: 8px 12px;
      margin-bottom: 8px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .filter-group label {
      font-size: 15px;
      font-weight: bold;
    }
    
    .filter-group select {
      padding: 6px 10px;
      border: 2px solid black;
      font-size: 16px;
      font-family: Calibri, sans-serif;
      min-width: 140px;
    }
    
    /* ==================== ACTION BUTTONS - THU NHỎ ==================== */
    .action-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .select-all-btn {
      background: #87CEEB;
      color: white;
      padding: 8px 16px;
      border: 2px solid black;
      font-size: 16px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      cursor: pointer;
    }
    
    .select-all-btn:hover {
      background: #5DADE2;
    }
    
    #selectedCount1 {
      font-size: 16px;
      font-weight: bold;
      color: #000;
    }
    
    /* ==================== TABLE CONTAINER - TỐI ĐA HÓA ==================== */
    .table-container {
      flex: 1;
      overflow: auto;
      border: 2px solid black;
      background: white;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 17px;
    }
    
    thead {
      position: sticky;
      top: 0;
      background: #87CEEB;
      z-index: 10;
    }
    
    th {
      padding: 10px 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid black;
      background: #87CEEB;
      color: white;
      font-size: 18px;
    }
    
    td {
      padding: 8px;
      border: 1px solid #ddd;
      vertical-align: top;
    }
    
    tbody tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    tbody tr:hover {
      background: #e3f2fd;
    }
    
    /* ==================== FORM ELEMENTS ==================== */
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    
    select.approval-select {
      width: 100%;
      padding: 6px;
      border: 2px solid black;
      font-size: 15px;
      font-family: Calibri, sans-serif;
    }
    
    textarea.comment-field {
      width: 100%;
      min-height: 50px;
      padding: 6px;
      border: 2px solid black;
      font-size: 15px;
      font-family: Calibri, sans-serif;
      resize: vertical;
    }
    
    /* ==================== BUTTONS - THU NHỎ ==================== */
    .button-container {
      display: flex;
      justify-content: flex-start;
      gap: 12px;
      padding: 10px 0;
      margin-top: 8px;
    }
    
    .primary-btn {
      background: #87CEEB;
      color: white;
      padding: 10px 24px;
      border: 2px solid black;
      font-size: 17px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      cursor: pointer;
    }
    
    .primary-btn:hover:not(:disabled) {
      background: #5DADE2;
    }
    
    .primary-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .secondary-btn {
      background: white;
      color: black;
      padding: 10px 24px;
      border: 2px solid black;
      font-size: 17px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      cursor: pointer;
    }
    
    .secondary-btn:hover {
      background: #f0f0f0;
    }
    
    .email-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      cursor: pointer;
      padding: 8px 12px;
      background: white;
      border: 2px solid #87CEEB;
    }
    
    .email-checkbox input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    
    /* ==================== REPORT DISPLAY ==================== */
    .report-content {
      white-space: pre-wrap;
      word-wrap: break-word;
      line-height: 1.5;
      padding: 8px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      max-height: 150px;
      overflow-y: auto;
      font-size: 15px;
    }
    
    /* ==================== UTILITIES ==================== */
    .text-center { 
      text-align: center; 
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 16px;
    }
    
    .folder-link {
      color: #0066cc;
      text-decoration: underline;
      font-size: 15px;
    }
    
    .folder-link:hover {
      font-weight: bold;
      color: #004499;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ✅ HEADER - ĐÃ ĐẨY LÊN SÁT VIỀN TRÊN -->
    <h2>Business Trip Management - HOD Dashboard</h2>
    
    <!-- ✅ TABS - ĐÃ THU NHỎ -->
    <div class="tabs-container">
      <button class="tab-button active" onclick="switchTab('approval')">APPROVAL BUSINESS TRIP</button>
      <button class="tab-button" onclick="switchTab('reports')">VIEW BUSINESS TRIP REPORT</button>
    </div>
    
    <!-- ==================== TAB 1: APPROVAL BUSINESS TRIP ==================== -->
    <div id="approvalTab" class="tab-content active">
      <!-- ✅ STATISTICS - ĐÃ THU NHỎ VÀ ĐẨY CAO -->
      <div class="stats-section">
        <h3>Trip Statistics (Filtered)</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Trips</div>
            <div class="stat-value" id="statTotal1">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Approved</div>
            <div class="stat-value" id="statApproved1">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pending</div>
            <div class="stat-value" id="statPending1">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Rejected</div>
            <div class="stat-value" id="statRejected1">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Cost</div>
            <div class="stat-value" id="statTotalCost1">0</div>
          </div>
        </div>
      </div>
      
      <!-- ✅ FILTERS - ĐÃ THU NHỎ VÀ ĐẨY CAO -->
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
          <select id="filterMonth1" onchange="applyFilters1()">
            <option value="All">All</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>PIC</label>
          <select id="filterPIC1" onchange="applyFilters1()">
            <option value="All">All</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Destination</label>
          <select id="filterDestination1" onchange="applyFilters1()">
            <option value="All">All</option>
          </select>
        </div>
      </div>
      
      <!-- ✅ ACTION BAR - ĐÃ THU NHỎ -->
      <div class="action-bar">
        <button class="select-all-btn" onclick="toggleSelectAll1()">Select/Deselect All</button>
        <span id="selectedCount1">Selected: 0</span>
      </div>
      
      <!-- ✅ TABLE - DIỆN TÍCH TỐI ĐA -->
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
              <th>Equipment</th>
              <th style="min-width: 120px;">Total Cost</th>
              <th style="width: 100px;">Folder</th>
              <th style="min-width: 180px;">Approval Decision</th>
              <th style="min-width: 250px;">HOD Comment</th>
            </tr>
          </thead>
          <tbody id="tableBody1"></tbody>
        </table>
      </div>
      
      <!-- Submit Buttons -->
      <div class="button-container">
        <label class="email-checkbox">
          <input type="checkbox" id="sendEmailCheck" checked>
          Send email notifications to PIC
        </label>
        <button class="primary-btn" onclick="submitApprovalDecisions()">Process Selected Trips</button>
        <button class="secondary-btn" onclick="google.script.host.close()">Close</button>
      </div>
    </div>
    
    <!-- ==================== TAB 2: VIEW BUSINESS TRIP REPORT ==================== -->
    <div id="reportsTab" class="tab-content">
      <!-- ✅ STATISTICS - ĐÃ THU NHỎ VÀ ĐẨY CAO -->
      <div class="stats-section">
        <h3>Report Statistics (Filtered)</h3>
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="stat-card">
            <div class="stat-label">Total Completed Trips</div>
            <div class="stat-value" id="statTotalReports">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Reports Submitted</div>
            <div class="stat-value" id="statReportsSubmitted">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">On-Time Rate</div>
            <div class="stat-value" id="statOnTimeRate">0%</div>
          </div>
        </div>
      </div>
      
      <!-- ✅ FILTERS - ĐÃ THU NHỎ VÀ ĐẨY CAO -->
      <div class="filter-section">
        <div class="filter-group">
          <label>Month</label>
          <select id="filterMonth2" onchange="applyFilters2()">
            <option value="All">All</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>PIC</label>
          <select id="filterPIC2" onchange="applyFilters2()">
            <option value="All">All</option>
          </select>
        </div>
      </div>
      
      <!-- ✅ TABLE - DIỆN TÍCH TỐI ĐA -->
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
      
      <!-- Close Button -->
      <div class="button-container">
        <button class="secondary-btn" onclick="google.script.host.close()">Close</button>
      </div>
    </div>
  </div>
  
  <script>
    // ==================== GLOBAL DATA ====================
    const allRows = ${JSON.stringify(approvalData.rows)};
    const hodEmail = '${hodEmail}';
    let filteredRows1 = [...allRows];
    let filteredRows2 = [...allRows];
    
    // ==================== TAB SWITCHING ====================
    function switchTab(tabName) {
      // Hide all tabs
      document.getElementById('approvalTab').classList.remove('active');
      document.getElementById('reportsTab').classList.remove('active');
      
      // Remove active from all buttons
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show selected tab
      if (tabName === 'approval') {
        document.getElementById('approvalTab').classList.add('active');
        document.querySelectorAll('.tab-button')[0].classList.add('active');
      } else {
        document.getElementById('reportsTab').classList.add('active');
        document.querySelectorAll('.tab-button')[1].classList.add('active');
      }
    }
    
    // ==================== TAB 1: APPROVAL FUNCTIONS ====================
    function populateFilters1() {
      // Months
      const months = [...new Set(allRows.map(r => r.month).filter(Boolean))];
      const monthSelect = document.getElementById('filterMonth1');
      months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
      });
      
      // PICs
      const pics = [...new Set(allRows.map(r => r.pic).filter(Boolean))];
      const picSelect = document.getElementById('filterPIC1');
      pics.forEach(pic => {
        const option = document.createElement('option');
        option.value = pic;
        option.textContent = pic;
        picSelect.appendChild(option);
      });
      
      // Destinations
      const destinations = [...new Set(allRows.map(r => r.destination).filter(Boolean))];
      const destSelect = document.getElementById('filterDestination1');
      destinations.forEach(dest => {
        const option = document.createElement('option');
        option.value = dest;
        option.textContent = dest;
        destSelect.appendChild(option);
      });
    }
    
    function applyFilters1() {
  const statusFilter = document.getElementById('filterApprovalStatus').value;
  const monthFilter = document.getElementById('filterMonth1').value;
  const picFilter = document.getElementById('filterPIC1').value;
  const destFilter = document.getElementById('filterDestination1').value;
  
  filteredRows1 = allRows.filter(row => {
    // ✅ SỬA: Filter Approval Status - normalize status
    let matchStatus = true;
    if (statusFilter !== 'All') {
      const rowStatus = (row.approvalStatus || '').toString().trim();
      
      // ✅ XỬ LÝ nhiều dạng status
      if (statusFilter === 'Already sent propose email') {
        matchStatus = (rowStatus === 'Already sent propose email' || 
                      rowStatus === 'Already sent proposal email');
      } else if (statusFilter === 'New') {
        matchStatus = (rowStatus === '' || rowStatus === 'Not Yet');
      } else {
        matchStatus = (rowStatus === statusFilter);
      }
    }
    
    // ✅ SỬA: Filter Month - so sánh đúng cột C
    const matchMonth = monthFilter === 'All' || row.month === monthFilter;
    
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
        return;
      }
      
      filteredRows1.forEach(row => {
        const tr = document.createElement('tr');
        
        const folderCell = row.folderLink ? 
          \`<a href="\${row.folderLink}" target="_blank" class="folder-link">Open</a>\` : 
          'N/A';
        
        tr.innerHTML = \`
          <td class="text-center">
            <input type="checkbox" class="trip-checkbox" data-row="\${row.row}" onchange="updateSelectedCount()">
          </td>
          <td class="text-center">\${row.row}</td>
          <td>\${row.month || ''}</td>
          <td>\${row.pic || ''}</td>
          <td>\${row.startDate || ''}</td>
          <td>\${row.finishDate || ''}</td>
          <td>\${row.destination || ''}</td>
          <td>\${row.purpose || ''}</td>
          <td>\${row.estimatedCost || ''}</td>
          <td>\${row.equipment || ''}</td>
          <td>\${row.totalCost || ''}</td>
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
      const pending = filteredRows1.filter(r => r.approvalStatus === 'Already sent propose email').length;
      const rejected = filteredRows1.filter(r => r.approvalStatus === 'Rejected').length;
      const totalCost = filteredRows1.reduce((sum, r) => {
        const cost = parseFloat(r.totalCost) || 0;
        return sum + cost;
      }, 0);
      
      document.getElementById('statTotal1').textContent = total;
      document.getElementById('statApproved1').textContent = approved;
      document.getElementById('statPending1').textContent = pending;
      document.getElementById('statRejected1').textContent = rejected;
      document.getElementById('statTotalCost1').textContent = totalCost.toLocaleString();
    }
    
    function toggleSelectAll1() {
      const checkboxes = document.querySelectorAll('.trip-checkbox');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
      });
      
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
      
      checkboxes.forEach(checkbox => {
        const rowNum = parseInt(checkbox.dataset.row);
        const decision = document.getElementById('decision_' + rowNum).value;
        const comment = document.getElementById('comment_' + rowNum).value.trim();
        
        if (!decision) {
          alert('Please select a decision (Approved/Rejected) for row ' + rowNum);
          hasError = true;
          return;
        }
        
        if (decision === 'Rejected' && !comment) {
          alert('Comment is required when rejecting trip at row ' + rowNum);
          hasError = true;
          return;
        }
        const tripData = allRows.find(r => r.row === rowNum);
    
    if (!tripData) {
      alert('Error: Cannot find trip data for row ' + rowNum);
      hasError = true;
      return;
    }
        decisions.push({
      rowNumber: rowNum,              // ✅ Đổi từ 'row' → 'rowNumber'
      approvalStatus: decision,       // ✅ Đổi từ 'decision' → 'approvalStatus'
      hodComment: comment,            // ✅ Đổi từ 'comment' → 'hodComment'
      tripData: tripData              // ✅ THÊM tripData object đầy đủ
    });
  });
      
      if (hasError) return;
      
      const sendEmail = document.getElementById('sendEmailCheck').checked;
      
      const confirmMsg = \`You are about to process \${decisions.length} trip(s).
      
Decisions:
- Approved: \${decisions.filter(d => d.decision === 'Approved').length}
- Rejected: \${decisions.filter(d => d.decision === 'Rejected').length}

Email notifications: \${sendEmail ? 'YES' : 'NO'}

Do you want to continue?\`;
      
      if (!confirm(confirmMsg)) return;
      
      // Disable button during processing
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = 'Processing...';
      
      google.script.run
        .withSuccessHandler(onSubmitSuccess)
        .withFailureHandler(onSubmitFailure)
        .handleHODApproval({
          decisions: decisions,
          sendEmail: sendEmail,
          hodEmail: hodEmail
        });
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
      location.reload();
    }
    
    // ==================== TAB 2: REPORTS FUNCTIONS ====================
    function populateFilters2() {
      // Months
      const months = [...new Set(allRows.map(r => r.month).filter(Boolean))];
      const monthSelect = document.getElementById('filterMonth2');
      months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
      });
      
      // PICs
      const pics = [...new Set(allRows.map(r => r.pic).filter(Boolean))];
      const picSelect = document.getElementById('filterPIC2');
      pics.forEach(pic => {
        const option = document.createElement('option');
        option.value = pic;
        option.textContent = pic;
        picSelect.appendChild(option);
      });
    }
    
    function applyFilters2() {
      const monthFilter = document.getElementById('filterMonth2').value;
      const picFilter = document.getElementById('filterPIC2').value;
      
      filteredRows2 = allRows.filter(row => {
        const isCompleted = row.approvalStatus === 'Approved' && row.result;
        const matchMonth = monthFilter === 'All' || row.month === monthFilter;
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
          \`<div class="report-content">\${row.result}</div>\` : 
          '<em>No report submitted</em>';
        
        tr.innerHTML = \`
          <td class="text-center">\${row.row}</td>
          <td>\${row.month || ''}</td>
          <td>\${row.pic || ''}</td>
          <td>\${row.destination || ''}</td>
          <td>\${row.startDate || ''}</td>
          <td>\${row.finishDate || ''}</td>
          <td>\${row.purpose || ''}</td>
          <td>\${reportContent}</td>
        \`;
        
        tbody.appendChild(tr);
      });
    }
    
    function updateStatistics2() {
      const completedTrips = allRows.filter(r => r.approvalStatus === 'Approved');
      const totalCompleted = completedTrips.length;
      const reportsSubmitted = completedTrips.filter(r => r.result && r.result.trim() !== '').length;
      const onTimeReports = completedTrips.filter(r => r.checkDeadline === 'On time').length;
      const onTimeRate = totalCompleted > 0 ? Math.round((onTimeReports / totalCompleted) * 100) : 0;
      
      document.getElementById('statTotalReports').textContent = totalCompleted;
      document.getElementById('statReportsSubmitted').textContent = reportsSubmitted;
      document.getElementById('statOnTimeRate').textContent = onTimeRate + '%';
    }
    
    // ==================== INITIALIZATION ====================
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
 * VERSION 1.0
 * @param {Object} data - Dữ liệu approval decisions
 * @returns {Object} - Kết quả với success status và message
 */
function handleHODApproval(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);
    
    const decisions = data.decisions || [];
    const sendEmail = data.sendEmail || false;
    const hodEmail = data.hodEmail || '';
    
    Logger.log('=== handleHODApproval START ===');
    Logger.log('Total decisions: ' + decisions.length);
    Logger.log('Send email: ' + (sendEmail ? 'YES' : 'NO'));
    Logger.log('HOD email: ' + hodEmail);
    
    let approvedCount = 0;
    let rejectedCount = 0;
    
    // ========================================
    // BƯỚC 1: CẬP NHẬT SHEET
    // ========================================
    decisions.forEach(decision => {
      const rowNumber = decision.rowNumber;
      const approvalStatus = decision.approvalStatus;
      const hodComment = decision.hodComment || '';
      
      Logger.log('Processing row ' + rowNumber + ': ' + approvalStatus);
      
      // Cập nhật Approval Status (cột Q)
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS))
        .setValue(approvalStatus);
      
      // Cập nhật HOD Comment (cột R)
      if (hodComment !== '') {
        sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.MANAGER_COMMENT))
          .setValue(hodComment);
      }
      
      // Đếm
      if (approvalStatus === 'Approved') {
        approvedCount++;
        
        // ✅ TẠO FOLDER TỰ ĐỘNG KHI DIRECTOR APPROVE
        try {
          const folderLinkCol = columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK);
          const folderNameCol = columnLetterToIndex(CONFIG.COLUMNS.FOLDER_NAME);
          const existingLink = sheet.getRange(rowNumber, folderLinkCol).getValue();
          
          // Chỉ tạo folder nếu chưa có
          if (!existingLink || existingLink.toString().trim() === '') {
            const folderName = sheet.getRange(rowNumber, folderNameCol).getValue();
            if (folderName && folderName.toString().trim() !== '') {
              Logger.log('📁 Auto-creating folder for approved trip row ' + rowNumber);
              const folderResult = createReportFolder({
                rowNumber: rowNumber,
                folderName: folderName.toString().trim()
              });
              if (folderResult.success) {
                Logger.log('  ✅ Folder created: ' + folderResult.folderLink);
              } else {
                Logger.log('  ⚠️ Folder creation failed: ' + folderResult.message);
              }
            }
          }
        } catch (folderError) {
          Logger.log('  ⚠️ Auto folder creation error: ' + folderError.message);
        }
        
      } else if (approvalStatus === 'Rejected') {
        rejectedCount++;
      }
    });
    
    SpreadsheetApp.flush();
    Logger.log('✅ Sheet updated successfully');
    
    // ========================================
    // BƯỚC 2: GỬI EMAIL (NẾU ĐƯỢC YÊU CẦU)
    // ========================================
    if (sendEmail) {
      Logger.log('📧 Sending notification emails...');
      
      decisions.forEach(decision => {
        const approvalStatus = decision.approvalStatus;
        const tripData = decision.tripData;
        const hodComment = decision.hodComment || '';
        
        try {
          if (approvalStatus === 'Approved') {
            sendApprovalEmail(sheet, tripData, hodEmail);
            Logger.log('  ✅ Approval email sent for row ' + decision.rowNumber);
          } else if (approvalStatus === 'Rejected') {
            sendRejectionEmail(sheet, tripData, hodComment, hodEmail);
            Logger.log('  ❌ Rejection email sent for row ' + decision.rowNumber);
          }
        } catch (emailError) {
          Logger.log('  ⚠️ Email error for row ' + decision.rowNumber + ': ' + emailError.message);
        }
      });
      
      Logger.log('✅ Email notifications completed');
    }
    
    // ========================================
    // BƯỚC 3: TẠO SUCCESS MESSAGE
    // ========================================
    let message = '✅ Approval decisions submitted successfully!\n\n';
    message += '📊 Summary:\n';
    message += '  ✅ Approved: ' + approvedCount + ' trip(s)\n';
    message += '  ❌ Rejected: ' + rejectedCount + ' trip(s)\n';
    
    if (sendEmail) {
      message += '\n📧 Notification emails have been sent to PICs.';
    }
    
    Logger.log('=== handleHODApproval END ===');
    Logger.log('Status: ✅ SUCCESS');
    
    return {
      success: true,
      message: message
    };
    
  } catch (error) {
    Logger.log('❌ Error in handleHODApproval: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}
/**
 * Gửi email thông báo Approved cho PIC
 * @param {Sheet} sheet - Google Sheet object
 * @param {Object} tripData - Dữ liệu trip
 * @param {string} hodEmail - Email của HOD
 */
function sendApprovalEmail(sheet, tripData, hodEmail) {
  try {
    const picEmail = tripData.emailPIC || '';
    const directorEmail = tripData.emailDirector || '';
    const ccEmails = tripData.emailCC || ''; // ✅ LẤY email từ cột AA
    const hodName = getNameFromEmail(hodEmail);
    const picName = tripData.pic || 'PIC';
    
    if (!picEmail || picEmail.trim() === '') {
      Logger.log('⚠️ No PIC email found, skipping approval email');
      return;
    }
    
    // ✅ XỬ LÝ CC EMAILS
    // Tạo danh sách CC: Director + các email từ cột AA
    let ccList = [];
    
    // Thêm Director email
    if (directorEmail && directorEmail.trim() !== '') {
      ccList.push(directorEmail.trim());
    }
    
    // Thêm các email từ cột AA (ngăn cách bởi ";")
    if (ccEmails && ccEmails.trim() !== '') {
      const additionalCCs = ccEmails.split(';')
        .map(email => email.trim())
        .filter(email => email !== '' && email.includes('@')); // Validate email
      
      ccList = ccList.concat(additionalCCs);
    }
    
    // Remove duplicates
    ccList = [...new Set(ccList)];
    
    const finalCC = ccList.join(',');
    
    Logger.log('📧 CC List: ' + finalCC);
    
    // Build HTML email
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetUrl = ss.getUrl();
    const htmlBody = buildApprovalEmailHTML(tripData, hodName, sheetUrl);
    
    // Build subject
    const subject = '[Approved] Business trip - ' + 
                    picName + ' - ' + 
                    (tripData.destination || 'Unknown') + ' - From ' + 
                    (tripData.startDate || 'N/A') + ' to ' + 
                    (tripData.finishDate || 'N/A');
    
    // ✅ GỬI EMAIL với CC mới
    MailApp.sendEmail({
      to: picEmail,
      cc: finalCC, // ✅ THAY ĐỔI: CC Director + AA emails
      subject: subject,
      htmlBody: htmlBody,
      name: 'Mani Medical Hanoi - Business Trip System'
    });
    
    Logger.log('✅ Approval email sent to: ' + picEmail);
    Logger.log('✅ CC sent to: ' + finalCC);
    
  } catch (error) {
    Logger.log('❌ Error in sendApprovalEmail: ' + error.message);
    throw error;
  }
}

/**
 * Gửi email thông báo Rejected cho PIC
 * @param {Sheet} sheet - Google Sheet object
 * @param {Object} tripData - Dữ liệu trip
 * @param {string} hodComment - Comment của HOD
 * @param {string} hodEmail - Email của HOD
 */
function sendRejectionEmail(sheet, tripData, hodComment, hodEmail) {
  try {
    Logger.log('=== sendRejectionEmail START ===');
    Logger.log('HOD Email: ' + hodEmail);
    Logger.log('Trip Data:', JSON.stringify(tripData, null, 2));
    Logger.log('HOD Comment: ' + hodComment);
    
    const picEmail = tripData.emailPIC || '';
    const directorEmail = tripData.emailDirector || '';
    const hodName = getNameFromEmail(hodEmail);
    const picName = tripData.pic || 'PIC';
    
    // ✅ ENHANCED VALIDATION
    if (!picEmail || picEmail.trim() === '') {
      Logger.log('❌ CRITICAL: No PIC email found!');
      Logger.log('Trip Data:', tripData);
      Logger.log('⚠️ Skipping rejection email');
      return;
    }
    
    Logger.log('✅ PIC Email valid: ' + picEmail);
    Logger.log('✅ Director Email: ' + (directorEmail || 'None'));
    
    // Build HTML email
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetUrl = ss.getUrl();
    const htmlBody = buildRejectionEmailHTML(tripData, hodComment, hodName, sheetUrl);
    
    Logger.log('✅ HTML email built successfully');
    
    // Build subject
    const subject = '[Rejected] Business trip - ' + 
                    picName + ' - ' + 
                    (tripData.destination || 'Unknown') + ' - From ' + 
                    (tripData.startDate || 'N/A') + ' to ' + 
                    (tripData.finishDate || 'N/A');
    
    Logger.log('✅ Email subject: ' + subject);
    Logger.log('📧 Sending rejection email...');
    
    MailApp.sendEmail({
      to: picEmail,
      cc: directorEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: 'Mani Medical Hanoi - Business Trip System'
    });
    
    Logger.log('✅ Rejection email sent successfully to: ' + picEmail);
    Logger.log('=== sendRejectionEmail END ===');
    
  } catch (error) {
    Logger.log('❌ Error in sendRejectionEmail: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    throw error;
  }
}
/**
 * Build HTML cho Approval Email
 * @param {Object} tripData - Dữ liệu trip
 * @param {string} hodName - Tên HOD
 * @returns {string} - HTML content
 */
/**
 * Build HTML cho Approval Email - VERSION MỚI
 * @param {Object} tripData - Dữ liệu trip
 * @param {string} hodName - Tên HOD (không dùng nữa, giữ lại để tương thích)
 * @param {string} sheetUrl - URL của Google Sheet
 * @returns {string} - HTML content
 */
function buildApprovalEmailHTML(tripData, hodName, sheetUrl) {
  try {
    const picName = tripData.pic || 'PIC';
    
    // Tính số ngày (duration)
    // TÃ­nh sá»' ngÃ y (duration) - ✅ CẢI THIỆN
let durationDays = tripData.workingDate || 'N/A';
if (tripData.startDate && tripData.finishDate) {
  try {
    // ✅ Parse đúng format dd/MM/yyyy
    const start = parseDateFromDDMMYYYY(tripData.startDate);
    const finish = parseDateFromDDMMYYYY(tripData.finishDate);
    
    if (start && finish) {
      const diffTime = Math.abs(finish - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 để bao gồm cả ngày cuối
      durationDays = diffDays;
      Logger.log(`✅ Duration calculated: ${diffDays} days from ${tripData.startDate} to ${tripData.finishDate}`);
    }
  } catch (e) {
    Logger.log('Error calculating duration: ' + e.message);
  }
}
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear all,
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                This email is to confirm the approval of the business trip proposal. Details are as follows:
              </p>
              
              <!-- Trip Details -->
              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                <li><strong>Traveler:</strong> ${escapeHtmlEmail(picName)}</li>
                <li><strong>Destination:</strong> ${escapeHtmlEmail(tripData.destination || 'N/A')}</li>
                <li><strong>Duration:</strong> ${durationDays} days, from ${tripData.startDate || 'N/A'} to ${tripData.finishDate || 'N/A'}</li>
                <li><strong>Purpose:</strong> ${escapeHtmlEmail(tripData.purpose || 'N/A')}</li>
                <li><strong>Estimated Cost:</strong> ${escapeHtmlEmail(tripData.estimatedCost || 'N/A')}</li>
              </ul>
              
              <!-- Instructions for PIC -->
              <p style="margin: 0 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear ${escapeHtmlEmail(picName)}-san,
              </p>
              
              <p style="margin: 0 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Please kindly:
              </p>
              
              <ul style="margin: 0 0 20px 0; padding-left: 20px; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                <li>Complete the Business Trip Report after your trip (within 3 days)</li>
                <li>Submit all receipts (if any) to Accounting by the end of the month</li>
                <li>Upload all related documents to the designated folder</li>
              </ul>
              
              <p style="margin: 0 0 30px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Thank you.
              </p>
              
              <!-- Signature -->
              <p style="margin: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Best regards,<br/>
                <strong>Ha Nguyen</strong><br/>
                General Director<br/>
                Mani Medical Hanoi Co., Ltd
              </p>
              
              <!-- Footer -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cccccc;">
                <tr>
                  <td style="font-family: Calibri, sans-serif; font-size: 9pt; color: #666666;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Calibri, sans-serif; font-size: 9pt; color: #666666;">
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
    
    return htmlContent;
    
  } catch (error) {
    Logger.log('❌ Error in buildApprovalEmailHTML: ' + error.message);
    throw error;
  }
}

/**
 * Build HTML cho Rejection Email
 * @param {Object} tripData - Dữ liệu trip
 * @param {string} hodComment - Comment của HOD
 * @param {string} hodName - Tên HOD
 * @returns {string} - HTML content
 */
/**
 * Build HTML cho Rejection Email - VERSION MỚI
 * @param {Object} tripData - Dữ liệu trip
 * @param {string} hodComment - Comment của HOD
 * @param {string} hodName - Tên HOD (không dùng nữa, giữ lại để tương thích)
 * @param {string} sheetUrl - URL của Google Sheet
 * @returns {string} - HTML content
 */
function buildRejectionEmailHTML(tripData, hodComment, hodName, sheetUrl) {
  try {
    const picName = tripData.pic || 'PIC';
    
    // Tính số ngày (duration)
    // TÃ­nh sá»' ngÃ y (duration) - ✅ CẢI THIỆN
let durationDays = tripData.workingDate || 'N/A';
if (tripData.startDate && tripData.finishDate) {
  try {
    // ✅ Parse đúng format dd/MM/yyyy
    const start = parseDateFromDDMMYYYY(tripData.startDate);
    const finish = parseDateFromDDMMYYYY(tripData.finishDate);
    
    if (start && finish) {
      const diffTime = Math.abs(finish - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 để bao gồm cả ngày cuối
      durationDays = diffDays;
      Logger.log(`✅ Duration calculated: ${diffDays} days from ${tripData.startDate} to ${tripData.finishDate}`);
    }
  } catch (e) {
    Logger.log('Error calculating duration: ' + e.message);
  }
}
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear ${escapeHtmlEmail(picName)}-san,
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                This email is to inform you that your business trip proposal to <strong>${escapeHtmlEmail(tripData.destination || 'N/A')}</strong> for ${durationDays} days, from ${tripData.startDate || 'N/A'} to ${tripData.finishDate || 'N/A'}, has been rejected. Please find my comment explaining the reason for this decision below:
              </p>
              
              <!-- HOD Comment Box -->
              <div style="margin: 20px 0; padding: 15px; background-color: #f8f8f8; border-left: 4px solid #d32f2f;">
                <p style="margin: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; font-style: italic;">
                  "${escapeHtmlEmail(hodComment || 'No comment provided')}"
                </p>
              </div>
              
              <!-- Signature -->
              <p style="margin: 30px 0 0 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Best regards,<br/>
                <strong>Ha Nguyen</strong><br/>
                General Director<br/>
                Mani Medical Hanoi Co., Ltd
              </p>
              
              <!-- Footer -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cccccc;">
                <tr>
                  <td style="font-family: Calibri, sans-serif; font-size: 9pt; color: #666666;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Calibri, sans-serif; font-size: 9pt; color: #666666;">
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
    
    return htmlContent;
    
  } catch (error) {
    Logger.log('❌ Error in buildRejectionEmailHTML: ' + error.message);
    throw error;
  }
}
// ===========================
// HTML CONTENT GENERATION
// ===========================

function getHtmlContent(picData, masterData, userEmail) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    
    body { 
      font-family: Calibri, sans-serif;
      margin: 0;
      padding: 15px;
      background: white;
      font-size: 16px;
    }
    
    .container { 
      max-width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    h2 {
      margin: 0 0 20px 0;
      font-weight: bold;
      font-size: 28px;
      padding-bottom: 15px;
      border-bottom: 3px solid black;
    }
    
    /* ==================== TABS ==================== */
    .tabs-container {
      display: flex;
      border-bottom: 3px solid black;
      margin-bottom: 20px;
    }
    
    .tab-button {
      flex: 1;
      padding: 18px;
      background: white;
      border: 2px solid black;
      border-bottom: none;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
    }
    
    .tab-button.active {
      background: #87CEEB;
      color: white;
    }
    
    .tab-content {
      display: none;
      flex: 1;
      overflow: auto;
    }
    
    .tab-content.active {
      display: flex;
      flex-direction: column;
    }
    
    /* ==================== STATS ==================== */
    .stats-section {
      background: #f5f5f5;
      border: 2px solid black;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .stats-section h3 {
      margin: 0 0 15px 0;
      font-weight: bold;
      font-size: 20px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    
    .stat-card {
  background: #E8E8E8;  /* Light Gray */
  border: 2px solid #87CEEB;
  padding: 15px;
  text-align: center
    }
    
    .stat-label {
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 32px;
      font-weight: bold;
    }
    
    /* ==================== FILTER ==================== */
    .filter-section {
      background: #f5f5f5;
      border: 2px solid black;
      padding: 15px;
      margin-bottom: 20px;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .filter-group label {
      font-size: 15px;
      font-weight: bold;
    }
    
    .filter-group select {
      padding: 12px;
      border: 2px solid black;
      font-size: 16px;
      font-family: Calibri, sans-serif;
      min-width: 180px;
    }
    
    /* ==================== BUTTONS ==================== */
    .select-all-btn {
      background: #87CEEB;
      color: white;
      padding: 12px 20px;
      border: 2px solid black;
      font-size: 16px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      cursor: pointer;
      margin-bottom: 15px;
    }
    
    .select-all-btn:hover {
      background: #333;
    }
    
    .create-folder-btn {
      background: white;
      border: 2px solid black;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      cursor: pointer;
    }
    
    .create-folder-btn:hover {
      background: #f0f0f0;
    }
    
    .create-folder-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* ==================== TABLE ==================== */
    .table-container {
      flex: 1;
      overflow: auto;
      border: 2px solid black;
      margin-bottom: 20px;
    }
    
    table { 
      width: 100%;
      border-collapse: collapse;
      font-size: 15px;
      min-width: 1600px;
    }
    
    th, td { 
      padding: 12px;
      border: 1px solid black;
      text-align: left;
    }
    
    th { 
      background: #87CEEB;  /* Sky Blue */
  color: white;
      font-weight: bold;
      position: sticky;
      top: 0;
      z-index: 10;
      font-size: 16px;
    }
    
    tr:nth-child(even) { 
      background: #f9f9f9;
    }
    
    /* ==================== FORM FIELDS ==================== */
    .editable-field {
      font-family: Calibri, sans-serif;
      width: 100%;
      padding: 10px;
      border: 2px solid black;
      font-size: 15px;
    }
    
    input[type="date"] {
      min-width: 150px;
    }
    
    textarea.editable-field {
      resize: vertical;
      min-height: 60px;
    }
    
    select.editable-field {
      cursor: pointer;
    }
    
    /* ==================== AUTOCOMPLETE ==================== */
    .autocomplete-container {
      position: relative;
      width: 100%;
    }
    
    .autocomplete-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 250px;
      overflow-y: auto;
      background: white;
      border: 2px solid black;
      border-top: none;
      z-index: 1000;
      display: none;
    }
    
    .autocomplete-suggestion {
      padding: 12px;
      cursor: pointer;
      font-size: 15px;
    }
    
    .autocomplete-suggestion:hover {
      background: #f0f0f0;
    }
    
    /* ==================== REPORT TAB ==================== */
    .report-select-section {
      background: #f5f5f5;
      border: 2px solid black;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .report-select-section h3 {
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: bold;
    }
    
    .report-select-section select {
      width: 100%;
      padding: 14px;
      border: 2px solid black;
      font-size: 16px;
      font-family: Calibri, sans-serif;
    }
    
    .report-form-container {
      display: none;
      flex: 1;
      overflow: auto;
    }
    
    .trip-info-card {
      background: #f5f5f5;
      border: 2px solid black;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .trip-info-card h4 {
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: bold;
    }
    
    .trip-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
    }
    
    .trip-info-item {
      display: flex;
      gap: 12px;
      font-size: 16px;
    }
    
    .trip-info-item strong {
      min-width: 140px;
      font-weight: bold;
    }
    
    .report-form h3 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: bold;
      padding-bottom: 15px;
      border-bottom: 3px solid black;
    }
    
    .form-group {
      margin-bottom: 25px;
    }
    
    .form-group label {
      display: block;
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 17px;
    }
    
    .form-group textarea {
      width: 100%;
      min-height: 150px;
      padding: 14px;
      border: 2px solid black;
      font-family: Calibri, sans-serif;
      font-size: 16px;
      resize: vertical;
      line-height: 1.6;
    }
    
    .char-counter {
      text-align: right;
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    
    /* ==================== BUTTONS ==================== */
    .button-container { 
      padding: 20px;
      background: #f5f5f5;
      border: 2px solid black;
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 15px;
    }
    
    button { 
      padding: 14px 30px;
      border: 2px solid black;
      font-size: 17px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      cursor: pointer;
    }
    
    .primary { 
  background: #87CEEB;  /* Sky Blue */
  color: white;
}
    
    .primary:hover:not(:disabled) { 
  background: #5DADE2;  /* Darker Sky Blue */
}
    
    .primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .secondary { 
      background: white;
      color: black;
    }
    
    .secondary:hover { 
      background: #f0f0f0;
    }
    
    .email-checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 17px;
      cursor: pointer;
      padding: 12px 16px;
      background: white;
      border: 2px solid #87CEEB;
    }
    
    .email-checkbox input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
    
    .required-field {
      color: black;
      font-weight: bold;
    }
    
    .empty-state {
      text-align: center;
      padding: 50px;
      color: #666;
      font-size: 16px;
    }
    
    .folder-link {
      color: black;
      text-decoration: underline;
      font-size: 14px;
    }
    
    .folder-link:hover {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Business Trip Plan & Report</h2>
    
    <!-- TABS -->
    <div class="tabs-container">
      <button class="tab-button active" onclick="switchTab('plan')">PLAN</button>
      <button class="tab-button" onclick="switchTab('report')">REPORT</button>
    </div>
    
    <!-- TAB 1: PLAN -->
    <div id="planTab" class="tab-content active">
      <div class="stats-section">
        <h3>Your Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Trips</div>
            <div class="stat-value" id="statTotal">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Approved</div>
            <div class="stat-value" id="statApproved">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Completed</div>
            <div class="stat-value" id="statCompleted">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">On-Time Rate</div>
            <div class="stat-value" id="statOnTime">0%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Cost</div>
            <div class="stat-value" id="statTotalCost">0</div>
          </div>
        </div>
      </div>
      
      <div class="filter-section">
        <div class="filter-group">
          <label>Filter by Month</label>
          <select id="filterMonth" onchange="applyFilters()">
            <option value="All">All</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Filter by Destination</label>
          <select id="filterDestination" onchange="applyFilters()">
            <option value="All">All</option>
          </select>
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
              <th style="min-width: 130px;">Equipment</th>
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
            <textarea 
              id="keyActivities" 
              placeholder="Describe main activities..."
              maxlength="5000"
              oninput="updateCharCount('keyActivities', 5000)"></textarea>
            <div class="char-counter" id="keyActivities-counter">0 / 5000</div>
          </div>
          
          <div class="form-group">
            <label>Key Findings*</label>
            <textarea 
              id="keyFindings" 
              placeholder="List important findings..."
              maxlength="5000"
              oninput="updateCharCount('keyFindings', 5000)"></textarea>
            <div class="char-counter" id="keyFindings-counter">0 / 5000</div>
          </div>
          
          <div class="form-group">
            <label>Follow Up Actions*</label>
            <textarea 
              id="followUp" 
              placeholder="Specify next steps..."
              maxlength="5000"
              oninput="updateCharCount('followUp', 5000)"></textarea>
            <div class="char-counter" id="followUp-counter">0 / 5000</div>
          </div>
          
          <div class="button-container">
            <label class="email-checkbox">
  <input type="checkbox" id="sendReportEmailCheck" checked>
  <span>Send Report Email</span>
</label>
            
            <button class="primary" id="submitReportBtn" onclick="submitReport()">
              Generate & Save Report
            </button>
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
    
    let allRows = [...picData.rows];
    let filteredRows = [...allRows];
    let allSelected = true;
    let currentReportTrip = null;
    
    // INITIALIZATION
    window.onload = function() {
  // ✅ AUTO RESIZE DIALOG TO 90% OF SCREEN
  try {
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    google.script.host.setWidth(Math.floor(screenWidth * 0.95));
    google.script.host.setHeight(Math.floor(screenHeight * 0.90));
  } catch (e) {
    console.log('Could not auto-resize dialog:', e);
  }
  
  populateFilters();
  document.getElementById('filterApprovalStatus').value = 'New';
  applyFilters();
  
  // ✅ THAY ĐỔI: Tích sẵn checkbox cho dòng có Status = "New"
  document.querySelectorAll('.item-checkbox').forEach(cb => {
    const index = parseInt(cb.getAttribute('data-index'));
    const row = filteredRows[index];
    const status = row.approvalStatus || '';
    
    // Tích sẵn nếu status là "New" (Not Yet hoặc empty)
    if (status === 'Not Yet' || status === '' || status === 'New') {
      cb.checked = true;
    }
  });
  
  // ✅ THÊM: Tích sẵn "Send Proposal Email"
  document.getElementById('sendEmailCheck').checked = true;
  
  updateStatistics();
  populateReportTripSelect();
};
    
    // TAB SWITCHING
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
    
    // FILTERS
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
        const displayText = month.length === 6 ? month.substring(0, 4) + '/' + month.substring(4, 6) : month;
        option.textContent = displayText;
        monthSelect.appendChild(option);
      });
      
      const destinations = new Set();
      allRows.forEach(row => {
        if (row.destination) destinations.add(row.destination);
      });
      
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
    // ✅ SỬA: So sánh chính xác cột C (Month)
    const monthMatch = monthFilter === 'All' || 
                      (row.month && row.month.toString() === monthFilter);
    
    const destMatch = destFilter === 'All' || row.destination === destFilter;
    
    let approvalMatch = true;
    if (approvalFilter !== 'All') {
      const rowStatus = (row.approvalStatus || '').toString().trim();
      if (approvalFilter === 'New') {
        approvalMatch = (rowStatus === 'Not Yet' || rowStatus === '');
      } else if (approvalFilter === 'Already sent proposal email') {
        approvalMatch = (rowStatus === 'Already sent propose email');
      } else {
        approvalMatch = (rowStatus === approvalFilter);
      }
    }
    
    return monthMatch && destMatch && approvalMatch;
  });
  
  renderTable();
  updateStatistics();
}
    
    // STATISTICS
    function updateStatistics() {
      const total = filteredRows.length;
      const approved = filteredRows.filter(row => row.approvalStatus === 'Approved').length;
      const completed = filteredRows.filter(row => row.result && row.result.toString().trim() !== '').length;
      const onTimeCount = filteredRows.filter(row => 
        row.checkDeadline === 'Ok' || row.checkDeadline === 'On-time' || row.checkDeadline === 'Early'
      ).length;
      const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
      
      let totalCostSum = 0;
      filteredRows.forEach(row => {
        totalCostSum += parseFloat(row.totalCost) || 0;
      });
      
      document.getElementById('statTotal').textContent = total;
      document.getElementById('statApproved').textContent = approved;
      document.getElementById('statCompleted').textContent = completed;
      document.getElementById('statOnTime').textContent = onTimeRate + '%';
      document.getElementById('statTotalCost').textContent = totalCostSum.toLocaleString('en-US', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
      });
    }
    
    // RENDER TABLE
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
          \`<a href="\${row.folderLink}" target="_blank" class="folder-link">View</a>\` : 
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
            <input type="text" class="editable-field" id="equipment_\${row.row}" 
                   value="\${escapeHtml(row.equipment || '')}"
                   onchange="updateRowData(\${index}, 'equipment', this.value)">
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
          <td style="text-align: center; font-weight: bold;">\${row.approvalStatus || 'Not Yet'}</td>
        \`;
        
        tbody.appendChild(tr);
      });
    }
    
    // CREATE FOLDER
    function createFolder(index) {
      const row = filteredRows[index];
      
      if (!row.folderName || row.folderName.trim() === '') {
        alert('Please enter a folder name first!');
        return;
      }
      
      const btn = document.getElementById(\`createFolderBtn_\${row.row}\`);
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating...';
      }
      
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
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Create';
            }
          }
        })
        .withFailureHandler(function(error) {
          alert('Error: ' + error.message);
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create';
          }
        })
        .createReportFolder({
          rowNumber: row.row,
          folderName: row.folderName
        });
    }
    
    // AUTOCOMPLETE
    function showAutocompleteSuggestions(input, index, field) {
      const value = input.value.toLowerCase();
      const row = filteredRows[index];
      const suggestionsDiv = document.getElementById(\`suggestions_\${field}_\${row.row}\`);
      
      let options = [];
      if (field === 'destination') options = masterData.destinations;
      else if (field === 'coTraveler') options = masterData.coTravelers;
      
      if (!value || options.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
      }
      
      const filtered = options.filter(opt => opt.toLowerCase().includes(value));
      if (filtered.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
      }
      
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
        document.querySelectorAll('.autocomplete-suggestions').forEach(div => {
          div.style.display = 'none';
        });
      }
    });
    
    // UPDATE ROW DATA
    // UPDATE ROW DATA
function updateRowData(index, field, value) {
  filteredRows[index][field] = value;
  const rowNumber = filteredRows[index].row;
  const allRowIndex = allRows.findIndex(r => r.row === rowNumber);
  if (allRowIndex !== -1) allRows[allRowIndex][field] = value;
}
    
    // SELECT ALL
    function toggleSelectAll() {
      allSelected = !allSelected;
      document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = allSelected);
    }
    
    // SUBMIT CHANGES
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
      const rowsNeedFolder = [];
      
      selectedCheckboxes.forEach(cb => {
        const rowValue = cb.value;
        const index = parseInt(cb.getAttribute('data-index'));
        const row = filteredRows[index];
        const approvalStatus = row.approvalStatus || '';
        
        selectedRows.push(parseInt(rowValue));
        editedData[rowValue] = {
          startDate: row.startDate, 
          finishDate: row.finishDate,
          destination: row.destination, 
          coTraveler: row.coTraveler,
          purpose: row.purpose, 
          expectedResult: row.expectedResult,
          equipment: row.equipment || '',
          estimatedCost: row.estimatedCost, 
          schedule: row.schedule,
          folderName: row.folderName || '',
          folderLink: row.folderLinkToUpdate || row.folderLink || '',
          totalCost: row.totalCost || ''
        };
        if ((!row.folderLink || row.folderLink.trim() === '') && row.folderName && row.folderName.trim() !== '') {
      rowsNeedFolder.push({
        rowNumber: rowValue,
        folderName: row.folderName
      });
    }
        if (approvalStatus === 'Approved') {
  approvedRows.push(rowValue);
} else if (approvalStatus === 'Not Yet' || approvalStatus === '' || 
           approvalStatus === 'Already sent propose email' || 
           approvalStatus === 'Rejected') {
  // ✅ CHO PHÉP GỬI LẠI EMAIL CHO DÒNG REJECTED
  emailableRows.push(rowValue);
}
      });
      
      const sendEmailChecked = document.getElementById('sendEmailCheck').checked;
      
      if (sendEmailChecked) {
        if (approvedRows.length > 0) {
          const message = 
            'WARNING: You have selected ' + approvedRows.length + ' row(s) that are already APPROVED.\\n\\n' +
            'These rows will NOT receive proposal emails.\\n\\n' +
            'Continue?';
          
          if (!confirm(message)) return;
        }
        
        if (emailableRows.length === 0) {
          alert('Cannot send email! All selected rows are already APPROVED.');
          return;
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
    
    // REPORT TAB
    function populateReportTripSelect() {
      const select = document.getElementById('reportTripSelect');
      select.innerHTML = '<option value="">-- Please select an approved business trip --</option>';
      
      const approvedTrips = allRows.filter(row => 
        row.approvalStatus === 'Approved' && 
        row.startDate && 
        row.destination &&
        !row.isNew
      );
      
      if (approvedTrips.length === 0) {
        document.getElementById('noTripsMessage').style.display = 'block';
        return;
      } else {
        document.getElementById('noTripsMessage').style.display = 'none';
      }
      
      approvedTrips.sort((a, b) => {
        const aHasReport = a.result && a.result.toString().trim() !== '' && a.result.toString().includes('docs.google.com');
        const bHasReport = b.result && b.result.toString().trim() !== '' && b.result.toString().includes('docs.google.com');
        
        if (!aHasReport && bHasReport) return -1;
        if (aHasReport && !bHasReport) return 1;
        
        const dateA = parseDateString(a.startDate);
        const dateB = parseDateString(b.startDate);
        return dateB - dateA;
      });
      
      let firstTripSelected = false;
      approvedTrips.forEach(trip => {
        const option = document.createElement('option');
        option.value = trip.row;
        
        const hasReport = trip.result && trip.result.toString().trim() !== '' && trip.result.toString().includes('docs.google.com');
        option.textContent = \`\${trip.startDate} - \${trip.destination}\${hasReport ? ' (Completed)' : ''}\`;
        select.appendChild(option);
        
        if (!firstTripSelected && !hasReport) {
          option.selected = true;
          firstTripSelected = true;
          setTimeout(() => loadTripForReport(), 100);
        }
      });
    }
    
    function loadTripForReport() {
      const select = document.getElementById('reportTripSelect');
      const selectedRow = select.value;
      
      if (!selectedRow) {
        document.getElementById('reportFormContainer').style.display = 'none';
        return;
      }
      
      const trip = allRows.find(row => row.row == selectedRow);
      if (!trip) return;
      
      currentReportTrip = trip;
      const formatCost = (cost) => {
    if (!cost || cost === 'N/A' || cost === '') return 'N/A';
    const numCost = parseFloat(cost);
    if (isNaN(numCost)) return cost;
    return numCost.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' VND';
  }
      
      const tripInfoHtml = \`
        <div class="trip-info-item">
          <strong>Destination:</strong>
          <span>\${trip.destination || 'N/A'}</span>
        </div>
        <div class="trip-info-item">
          <strong>Date:</strong>
          <span>\${trip.startDate || 'N/A'} to \${trip.finishDate || 'N/A'}</span>
        </div>
        <div class="trip-info-item">
          <strong>Duration:</strong>
          <span>\${trip.workingDate || 'N/A'} day(s)</span>
        </div>
        <div class="trip-info-item">
          <strong>Purpose:</strong>
          <span>\${trip.purpose || 'N/A'}</span>
        </div>
        <div class="trip-info-item">
          <strong>Co-Traveler:</strong>
          <span>\${trip.coTraveler || 'None'}</span>
        </div>
        <div class="trip-info-item">
      <strong>Estimated Cost:</strong>
      <span style="color: #666;">\${formatCost(trip.estimatedCost)}</span>
    </div>
    <div class="trip-info-item">
      <strong>Total Cost:</strong>
      <span style="font-weight: bold; color: #d32f2f;">\${formatCost(trip.totalCost)}</span>
    </div>
        <div class="trip-info-item">
          <strong>Folder:</strong>
          <span><a href="\${trip.folderLink}" target="_blank">View</a></span>
        </div>
      \`;
      
      document.getElementById('tripInfoDisplay').innerHTML = tripInfoHtml;
      document.getElementById('reportFormContainer').style.display = 'block';
      clearReportForm();
      document.getElementById('reportFormContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    function updateCharCount(fieldId, maxLength) {
      const field = document.getElementById(fieldId);
      const counter = document.getElementById(fieldId + '-counter');
      const currentLength = field.value.length;
      counter.textContent = \`\${currentLength} / \${maxLength}\`;
    }
    
    function clearReportForm() {
      document.getElementById('keyActivities').value = '';
      document.getElementById('keyFindings').value = '';
      document.getElementById('followUp').value = '';
      updateCharCount('keyActivities', 5000);
      updateCharCount('keyFindings', 5000);
      updateCharCount('followUp', 5000);
    }
    
    function submitReport() {
      if (!currentReportTrip) {
        alert('Please select a business trip first.');
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
        alert('Please provide more detailed information in each field.');
        return;
      }
      
      const sendEmail = document.getElementById('sendReportEmailCheck').checked;
      const submitBtn = document.getElementById('submitReportBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';
      
      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            alert(response.message + '\\n\\nReport link: ' + response.docLink);
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
    
    // UTILITY FUNCTIONS
    function formatDateForInput(dateStr) {
      if (!dateStr) return '';
      try {
        if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}$/)) return dateStr;
        if (dateStr.match(/^\\d{2}\\/\\d{2}\\/\\d{4}$/)) {
          const parts = dateStr.split('/');
          return \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
        }
        return '';
      } catch (error) {
        return '';
      }
    }
    
    function parseDateString(dateStr) {
      if (!dateStr) return new Date(0);
      try {
        if (dateStr.match(/^\\d{2}\\/\\d{2}\\/\\d{4}$/)) {
          const parts = dateStr.split('/');
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
      } catch (error) {
        return new Date(0);
      }
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>
  `;
}

// ===========================
// DATA RETRIEVAL FUNCTIONS
// ===========================
/**
 * ✅ Đọc URL thực từ RichText trong cột Folder Link
 * Vì cột P lưu dạng RichText "Open Folder" với hyperlink ẩn
 */
function getFolderLinkFromSheet(sheet, rowNumber) {
  try {
    const cell = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK));
    
    // Thử đọc RichText trước
    const richText = cell.getRichTextValue();
    if (richText) {
      const url = richText.getLinkUrl();
      if (url && url.trim() !== '') {
        return url;
      }
      
      // Nếu không có link trên toàn bộ text, thử lấy từ runs
      const runs = richText.getRuns();
      for (let j = 0; j < runs.length; j++) {
        const runUrl = runs[j].getLinkUrl();
        if (runUrl && runUrl.trim() !== '') {
          return runUrl;
        }
      }
    }
    
    // Fallback: đọc giá trị thường (có thể là URL dạng text)
    const plainValue = cell.getValue();
    if (plainValue && plainValue.toString().trim() !== '' && 
        plainValue.toString().includes('drive.google.com')) {
      return plainValue.toString().trim();
    }
    
    return '';
  } catch (e) {
    Logger.log('⚠️ Error reading folder link from row ' + rowNumber + ': ' + e.message);
    return '';
  }
}
function getPICData(sheet, userEmail) {
  const lastRow = sheet.getLastRow();
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, 28); // ✅ 27→28
  const data = dataRange.getValues();
  
  let picName = '';
  try {
    picName = getPICNameFromEmail(userEmail);
  } catch (e) {
    Logger.log('❌ Cannot get PIC name from email: ' + e.message);
    return { rows: [], userEmail: userEmail };
  }
  
  Logger.log('🔍 getPICData: Looking for PIC name = "' + picName + '" (email: ' + userEmail + ')');
  
  const rows = [];
  
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i];
    const sheetPicName = rowData[2]; // Cột D (PIC name) - index 2 from column B
    
    if (sheetPicName && sheetPicName.toString().trim().toLowerCase() === picName.toLowerCase()) {
      const actualRow = CONFIG.DATA_START_ROW + i;
      
      rows.push({
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
        equipment: rowData[13] || '',       // ✅ MỚI - Cột O (index 13)
        folderName: rowData[14] || '',      // ✅ DỊCH 13→14
        folderLink: '',                      // sẽ được fill sau bằng RichText reader
        result: rowData[16] || '',           // ✅ DỊCH 15→16
        approvalStatus: rowData[17] || '',   // ✅ DỊCH 16→17
        managerComment: rowData[18] || '',   // ✅ DỊCH 17→18
        actualReportDate: formatDate(rowData[19]), // ✅ DỊCH 18→19
        reportDeadline: formatDate(rowData[20]),   // ✅ DỊCH 19→20
        deadlineDiff: rowData[21] || '',     // ✅ DỊCH 20→21
        checkDeadline: rowData[22] || '',    // ✅ DỊCH 21→22
        emailPIC: rowData[23] || '',         // ✅ DỊCH 22→23
        emailHOD: rowData[24] || '',         // ✅ DỊCH 23→24
        emailDirector: rowData[25] || '',    // ✅ DỊCH 24→25
        emailCC: rowData[26] || ''           // ✅ DỊCH 25→26
      });
    }
  }
  
  // ✅ Đọc folder link từ RichText cho từng row
  rows.forEach(row => {
    row.folderLink = getFolderLinkFromSheet(sheet, row.row);
  });
  
  Logger.log('✅ getPICData: Found ' + rows.length + ' trips for "' + picName + '"');
  
  return {
    rows: rows,
    userEmail: userEmail
  };
}

function getMasterData(ss) {
  try {
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    
    if (!masterSheet) {
      return { destinations: [], coTravelers: [] };
    }
    
    const destinationRange = masterSheet.getRange('C2:C1000');
    const destinationValues = destinationRange.getValues();
    const destinations = destinationValues
      .filter(row => row[0] && row[0].toString().trim() !== '')
      .map(row => row[0].toString().trim());
    
    const coTravelerRange = masterSheet.getRange('E2:E30');
    const coTravelerValues = coTravelerRange.getValues();
    const coTravelers = coTravelerValues
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
// ✅ THÊM MỚI: CREATE FOLDER FUNCTION
// ===========================

/**
 * Tạo folder trong Google Drive cho business trip report
 * @param {Object} data - Dữ liệu chứa rowNumber và folderName
 * @returns {Object} - Kết quả với success status và folder link
 */
function createReportFolder(data) {
  try {
    const rowNumber = data.rowNumber;
    const folderName = data.folderName;
    
    if (!folderName || folderName.trim() === '') {
      return {
        success: false,
        message: 'Folder name is empty. Please enter a folder name first.'
      };
    }
    
    // Lấy parent folder
    const parentFolder = DriveApp.getFolderById(CONFIG.PARENT_FOLDER_ID);
    
    // Kiểm tra xem folder đã tồn tại chưa
    const existingFolders = parentFolder.getFoldersByName(folderName);
    let folder;
    
    if (existingFolders.hasNext()) {
      // Folder đã tồn tại, sử dụng folder hiện có
      folder = existingFolders.next();
      Logger.log('Using existing folder: ' + folder.getName());
    } else {
      // Tạo folder mới
      folder = parentFolder.createFolder(folderName);
      Logger.log('Created new folder: ' + folder.getName());
    }
    
    const folderLink = folder.getUrl();
    
    // Cập nhật link vào sheet nếu không phải row mới
    if (!rowNumber.toString().startsWith('new_')) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      
      // ✅ Dán hyperlink thay vì full URL
      const richText = SpreadsheetApp.newRichTextValue()
        .setText('Open Folder')
        .setLinkUrl(folderLink)
        .build();
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK))
        .setRichTextValue(richText);
    }
    
    return {
      success: true,
      message: 'Report folder created successfully!',
      folderLink: folderLink,
      folderId: folder.getId()
    };
    
  } catch (error) {
    Logger.log('Error in createReportFolder: ' + error.message);
    return {
      success: false,
      message: 'Error creating folder: ' + error.message
    };
  }
}

// ===========================
// UPDATE FUNCTIONS
// ===========================

/**
 * Xử lý cập nhật Business Trip Data
 * VERSION 3.0 - IMPROVED FLOW FOR NEW PLANS
 * 
 * ✅ CẢI TIẾN:
 * - Tự động verify email columns sau khi thêm new rows
 * - Đảm bảo email được gửi ngay khi add new plan + check "Send propose email"
 * - Enhanced error handling
 * - Better logging
 * 
 * @param {Object} data - Dữ liệu từ client
 * @returns {Object} - Kết quả với success status và message
 */
function handleBusinessTripUpdate(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);
    
    const selectedRows = data.selectedRows || [];
    const editedData = data.editedData || {};
    const newRows = data.newRows || [];
    const sendEmail = data.sendEmail || false;
    
    // Lấy danh sách rows được phép gửi email
    const emailableRows = data.emailableRows || [];
    const approvedRows = data.approvedRows || [];
    
    Logger.log('=== handleBusinessTripUpdate V3.0 START ===');
    Logger.log('📊 SUMMARY:');
    Logger.log('  - Selected existing rows: ' + selectedRows.length);
    Logger.log('  - New rows to add: ' + newRows.length);
    Logger.log('  - Send email: ' + (sendEmail ? 'YES' : 'NO'));
    Logger.log('  - Emailable rows: ' + emailableRows.length);
    Logger.log('  - Already approved (skip): ' + approvedRows.length);
    Logger.log('');
    
    // ========================================
    // BƯỚC 1: CẬP NHẬT EXISTING ROWS
    // ========================================
    if (selectedRows.length > 0) {
      Logger.log('📝 STEP 1: Updating ' + selectedRows.length + ' existing row(s)...');
      
      
      selectedRows.forEach(rowNumber => {
        if (editedData[rowNumber]) {
          updateRow(sheet, rowNumber, editedData[rowNumber]);
          Logger.log('  ✅ Updated row ' + rowNumber);
        }
      });
      
      Logger.log('✅ Step 1 completed: All existing rows updated');
      Logger.log('');
    }
    // Update existing rows
if (selectedRows.length > 0) {
  selectedRows.forEach(rowNumber => {
    // ... code update existing rows
  });
}
// ========================================
// ✅ BÆ¯á»šC 2.5: TỰ ĐỘNG TẠO FOLDER CHO CÁC ROW CHƯA CÓ FOLDER
// ========================================
Logger.log('📁 Checking for rows that need folder creation...');

selectedRows.forEach((rowNumber) => {
  const rowData = editedData[rowNumber];
  
  // Kiểm tra xem row có folderName nhưng chưa có folderLink không
  if (rowData && rowData.folderName && rowData.folderName.trim() !== '') {
    const currentFolderLink = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK)).getValue();
    
    // Nếu chưa có folder link, tự động tạo folder
    if (!currentFolderLink || currentFolderLink.toString().trim() === '') {
      Logger.log('  📁 Creating folder for row ' + rowNumber + ': ' + rowData.folderName);
      
      try {
        const folderResult = createReportFolder({
          rowNumber: rowNumber,
          folderName: rowData.folderName
        });
        
        if (folderResult.success) {
          Logger.log('  ✅ Folder created successfully: ' + folderResult.folderLink);
          // Cập nhật folderLink vào editedData để không bị ghi đè
          rowData.folderLink = folderResult.folderLink;
        } else {
          Logger.log('  ⚠️ Failed to create folder: ' + folderResult.message);
        }
      } catch (folderError) {
        Logger.log('  ❌ Error creating folder: ' + folderError.message);
      }
    } else {
      Logger.log('  ℹ️ Row ' + rowNumber + ' already has folder link');
    }
  }
});

Logger.log('');
    // ========================================
    // BƯỚC 2: THÊM NEW ROWS
    // ========================================
    let newRowNumbers = [];
    
    if (newRows.length > 0) {
      Logger.log('➕ STEP 2: Adding ' + newRows.length + ' new row(s)...');
      
      const lastRowBefore = sheet.getLastRow();
      
      // Thêm new rows vào sheet
      addNewRows(sheet, newRows, userEmail);
      
      const lastRowAfter = sheet.getLastRow();
      
      // Lấy danh sách row numbers mới thêm
      for (let i = lastRowBefore + 1; i <= lastRowAfter; i++) {
        newRowNumbers.push(i);
      }
      
      Logger.log('  ✅ New rows added at: ' + JSON.stringify(newRowNumbers));
      
      // ========================================
      // ✅ BƯỚC 2.1: VERIFY EMAIL COLUMNS
      // ========================================
      if (newRowNumbers.length > 0) {
        Logger.log('');
        Logger.log('⏳ STEP 2.1: Verifying email columns for new rows...');
        Logger.log('  Waiting 5 seconds for array formulas to populate...');
        
        // Force update và đợi
        SpreadsheetApp.flush();
        Utilities.sleep(5000);
        
        Logger.log('  Checking email columns...');
        
        // Verify từng row
        let missingEmailCount = 0;
        
        newRowNumbers.forEach(rowNumber => {
          let hodEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
          let directorEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
          
          hodEmail = hodEmail ? hodEmail.toString().trim() : '';
          directorEmail = directorEmail ? directorEmail.toString().trim() : '';
          
          Logger.log('  Row ' + rowNumber + ':');
          Logger.log('    HOD: "' + hodEmail + '"');
          Logger.log('    Director: "' + directorEmail + '"');
          
          // Nếu thiếu email, sử dụng default
          if (!hodEmail || !directorEmail) {
            missingEmailCount++;
            Logger.log('    ⚠️ Missing emails detected! Using defaults...');
            
            const picName = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
            const defaultEmails = getDefaultEmailsForPIC(picName);
            
            if (!hodEmail) {
              sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD))
                .setValue(defaultEmails.hod);
              Logger.log('    ✅ Set default HOD: ' + defaultEmails.hod);
            }
            
            if (!directorEmail) {
              sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR))
                .setValue(defaultEmails.director);
              Logger.log('    ✅ Set default Director: ' + defaultEmails.director);
            }
          } else {
            Logger.log('    ✅ OK');
          }
        });
        
        // Force update lần cuối
        SpreadsheetApp.flush();
        
        if (missingEmailCount > 0) {
          Logger.log('  ⚠️ Fixed ' + missingEmailCount + ' row(s) with missing emails');
        } else {
          Logger.log('  ✅ All email columns verified');
        }
        
        Logger.log('✅ Step 2.1 completed: Email columns ready');
      }
      
      Logger.log('');
      Logger.log('✅ Step 2 completed: ' + newRowNumbers.length + ' new row(s) added and verified');
      Logger.log('');
    }
    
    // ========================================
    // BƯỚC 3: GỬI EMAIL (NẾU ĐƯỢC YÊU CẦU)
    // ========================================
    if (sendEmail && (emailableRows.length > 0 || newRowNumbers.length > 0)) {
      Logger.log('📧 STEP 3: Preparing to send proposal emails...');
      
      try {
        const rowsToEmail = [];
        
        // ========================================
        // 3.1: Thêm NEW ROWS vào danh sách email
        // ========================================
        if (newRowNumbers.length > 0) {
          Logger.log('  Adding ' + newRowNumbers.length + ' new row(s) to email list...');
          newRowNumbers.forEach(row => {
            rowsToEmail.push(row);
            Logger.log('    ✅ New row ' + row + ' → will send email');
          });
        }
        
        // ========================================
        // 3.2: Thêm EXISTING ROWS (chỉ những row chưa approved)
        // ========================================
        if (emailableRows.length > 0) {
          Logger.log('  Checking ' + emailableRows.length + ' existing row(s)...');
          
          emailableRows.forEach(rowValue => {
            if (rowValue !== 'new') {
              const rowNumber = parseInt(rowValue);
              const currentStatus = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).getValue();
              
              if (currentStatus !== 'Approved') {
                rowsToEmail.push(rowNumber);
                Logger.log('    ✅ Row ' + rowNumber + ' → will send email (status: ' + currentStatus + ')');
              } else {
                Logger.log('    ⏭️ Row ' + rowNumber + ' → skipped (already approved)');
              }
            }
          });
        }
        
        // ========================================
        // 3.3: GỬI EMAIL
        // ========================================
        if (rowsToEmail.length > 0) {
          Logger.log('');
          Logger.log('  📧 SENDING EMAIL TO ' + rowsToEmail.length + ' ROW(S)...');
          Logger.log('  Rows: ' + JSON.stringify(rowsToEmail));
          
          Logger.log('');
  Logger.log('  🔄 Pre-processing Rejected rows...');
  
  rowsToEmail.forEach(rowNumber => {
    const currentStatus = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).getValue();
    
    if (currentStatus === 'Rejected') {
      // ✅ XÓA HOD COMMENT
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.MANAGER_COMMENT))
        .setValue('');
      
      Logger.log('    ✅ Row ' + rowNumber + ' (Rejected) → Cleared HOD comment');
    }
  });
  
  SpreadsheetApp.flush();
  Logger.log('  ✅ Pre-processing completed');
  Logger.log('');
  
  try {
    // GỬI EMAIL
    sendProposalEmail(sheet, rowsToEmail, [], userEmail);
            
            // ========================================
            // 3.4: CẬP NHẬT APPROVAL STATUS
            // ========================================
            Logger.log('');
            Logger.log('  Updating approval status...');
            
            rowsToEmail.forEach(rowNumber => {
              const currentStatus = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).getValue();
              
              // Chỉ update nếu chưa approved
              if (currentStatus !== 'Approved') {
                sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS))
                  .setValue('Already sent propose email');
                Logger.log('    ✅ Row ' + rowNumber + ' status → "Already sent propose email"');
              }
            });
            
            SpreadsheetApp.flush();
            Logger.log('  ✅ All statuses updated');
            
          } catch (emailError) {
            // ========================================
            // 3.5: XỬ LÝ LỖI EMAIL
            // ========================================
            Logger.log('  ❌ EMAIL SENDING FAILED!');
            Logger.log('  Error: ' + emailError.message);
            Logger.log('  Stack: ' + emailError.stack);
            
            // Vẫn return success nhưng báo lỗi email
            return {
              success: true,
              message: 'Data updated successfully!\n\n' +
                       '⚠️ However, email sending failed:\n' +
                       emailError.message + '\n\n' +
                       'Possible causes:\n' +
                       '1. Email addresses in columns X, Y are invalid\n' +
                       '2. Email sending permission issue\n' +
                       '3. Array formulas not working\n\n' +
                       'Please check the Apps Script logs for details.'
            };
          }
          
        } else {
          Logger.log('  ℹ️ No rows eligible for email');
          Logger.log('  Reason: All selected rows are already approved');
        }
        
        Logger.log('');
        Logger.log('✅ Step 3 completed: Email handling done');
        
      } catch (emailProcessError) {
        Logger.log('❌ Error in email processing: ' + emailProcessError.message);
        
        // Vẫn return success
        return {
          success: true,
          message: 'Data updated successfully!\n\n' +
                   '⚠️ Email processing error:\n' +
                   emailProcessError.message
        };
      }
      
    } else {
      Logger.log('ℹ️ Step 3 skipped: Email sending not requested or no eligible rows');
    }
    
    // ========================================
    // BƯỚC 4: TẠO SUCCESS MESSAGE
    // ========================================
    Logger.log('');
Logger.log('📊 STEP 4: Creating success message...');

let message = '✅ Business trip data updated successfully!';

if (sendEmail) {
  const totalNewRows = newRowNumbers.length;
  const totalEmailableRows = emailableRows.filter(r => r !== 'new').length;
  
  // Đếm số Rejected rows
  let rejectedCount = 0;
  emailableRows.forEach(rowValue => {
    if (rowValue !== 'new') {
      const rowNumber = parseInt(rowValue);
      const currentStatus = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).getValue();
      if (currentStatus === 'Rejected') {
        rejectedCount++;
      }
    }
  });
  
  const emailCount = totalNewRows + totalEmailableRows;
  const skippedCount = approvedRows.length;
  
  if (emailCount > 0) {
    message += '\n\n📧 Proposal emails sent successfully!';
    message += '\n  ✅ New plans: ' + totalNewRows;
    message += '\n  ✅ Existing plans: ' + (totalEmailableRows - rejectedCount);
    if (rejectedCount > 0) {
      message += '\n  🔄 Re-submitted (Rejected): ' + rejectedCount;
    }
    message += '\n  📨 Total emails: ' + emailCount;
    
    if (skippedCount > 0) {
      message += '\n\n⏭️ Skipped: ' + skippedCount + ' trip(s)';
      message += '\n  (Already approved - no email needed)';
    }
  } else {
    message += '\n\nℹ️ No emails sent';
    message += '\nReason: All selected trips are already approved';
  }
}

Logger.log('');
Logger.log('=== handleBusinessTripUpdate END ===');
Logger.log('Status: ✅ SUCCESS');
Logger.log('Message: ' + message);
Logger.log('');

return {
  success: true,
  message: message
};
    
  } catch (error) {
    // ========================================
    // XỬ LÝ LỖI NGHIÊM TRỌNG
    // ========================================
    Logger.log('');
    Logger.log('❌❌❌ CRITICAL ERROR IN handleBusinessTripUpdate ❌❌❌');
    Logger.log('Error message: ' + error.message);
    Logger.log('Stack trace:');
    Logger.log(error.stack);
    Logger.log('');
    
    // Hiển thị error cho user
    SpreadsheetApp.getUi().alert(
      '❌ Update Error',
      'A critical error occurred while updating:\n\n' +
      error.message + '\n\n' +
      'Please check the Apps Script logs for details.\n\n' +
      'If this persists, contact the system administrator.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    throw error;
  }
}

function updateRow(sheet, rowNumber, rowData) {
  try {
    // ✅ BƯỚC 0: XÓA DATA VALIDATION CHỈ CHO CÁC CỘT CẦN UPDATE
    const columnsToUpdate = [
      CONFIG.COLUMNS.START_DATE,    // E
      CONFIG.COLUMNS.FINISH_DATE,   // F
      CONFIG.COLUMNS.DESTINATION,   // H
      CONFIG.COLUMNS.CO_TRAVELER,   // I
      CONFIG.COLUMNS.PURPOSE,       // J
      CONFIG.COLUMNS.EXPECTED_RESULT, // K
      CONFIG.COLUMNS.ESTIMATED_COST,
      CONFIG.COLUMNS.TOTAL_COST,  // L
      CONFIG.COLUMNS.SCHEDULE,        // M
      CONFIG.COLUMNS.FOLDER_NAME,
      CONFIG.COLUMNS.EQUIPMENT,     // N
      CONFIG.COLUMNS.FOLDER_LINK      // O
    ];
    
    columnsToUpdate.forEach(col => {
      const range = sheet.getRange(rowNumber, columnLetterToIndex(col));
      range.clearDataValidations();
    });
    
    Logger.log('✅ Cleared data validations for row ' + rowNumber);
    
    // ✅ BƯỚC 1: UPDATE DỮ LIỆU (giữ nguyên logic cũ)
    if (rowData.startDate) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.START_DATE))
        .setValue(parseDate(rowData.startDate));
    }
    
    if (rowData.finishDate) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FINISH_DATE))
        .setValue(parseDate(rowData.finishDate));
    }
    
    if (rowData.destination) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION))
        .setValue(rowData.destination);
    }
    
    if (rowData.coTraveler) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.CO_TRAVELER))
        .setValue(rowData.coTraveler);
    }
    
    if (rowData.purpose !== undefined) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PURPOSE))
        .setValue(rowData.purpose);
    }
    
    if (rowData.expectedResult !== undefined) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EXPECTED_RESULT))
        .setValue(rowData.expectedResult);
    }
    
    if (rowData.estimatedCost !== undefined) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.ESTIMATED_COST))
        .setValue(rowData.estimatedCost);
    }
    if (rowData.totalCost !== undefined) {
  sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.TOTAL_COST))
    .setValue(rowData.totalCost);
}
    if (rowData.schedule !== undefined) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.SCHEDULE))
        .setValue(rowData.schedule);
    }
    if (rowData.equipment !== undefined) {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EQUIPMENT))
        .setValue(rowData.equipment);
    }
    
    
    if (rowData.folderLink !== undefined && rowData.folderLink !== '') {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK))
        .setValue(rowData.folderLink);
    }
    
    // Tính Working Days nếu có cả Start và Finish Date
    
    
    // ✅ BƯỚC 2 - QUAN TRỌNG: ĐẢM BẢO PIC NAME ĐÚNG
    // Đọc email từ cột W (EMAIL_PIC)
    const currentEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
    
    if (currentEmail && currentEmail.toString().trim() !== '') {
      // Convert email thành tên PIC đúng
      const correctPicName = getPICNameFromEmail(currentEmail.toString());
      
      // Đọc PIC name hiện tại
      const currentPicName = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      
      // Chỉ update nếu PIC name SAI
      if (currentPicName !== correctPicName) {
        Logger.log('🔧 Correcting PIC name for row ' + rowNumber + ': "' + currentPicName + '" → "' + correctPicName + '"');
        
        // Xóa data validation của cột PIC
        const picCell = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PIC));
        picCell.clearDataValidations();
        
        // Set giá trị đúng
        picCell.setValue(correctPicName);
        
        // Tạo lại data validation cho cột PIC (optional)
        try {
          const masterSheet = sheet.getParent().getSheetByName(CONFIG.MASTER_SHEET);
          if (masterSheet) {
            const picListRange = masterSheet.getRange('E2:E30');
            const picValidation = SpreadsheetApp.newDataValidation()
              .requireValueInRange(picListRange, true)
              .setAllowInvalid(false)
              .build();
            picCell.setDataValidation(picValidation);
          }
        } catch (valError) {
          Logger.log('⚠️ Could not restore validation: ' + valError.message);
        }
        
        Logger.log('✅ PIC name corrected to: ' + correctPicName);
      }
    }
    
  } catch (error) {
    Logger.log('❌ Error in updateRow: ' + error.message);
    throw error;
  }
}

function addNewRows(sheet, newRows, userEmail) {
  try {
    const lastRow = sheet.getLastRow();
    
    newRows.forEach((rowData, index) => {
      const emptyRow = findEmptyRow(sheet) || lastRow + index + 1;
      
      Logger.log('=== ADDING NEW ROW ' + emptyRow + ' ===');
      
      // ✅ BƯỚC 0: XÓA TẤT CẢ DATA VALIDATION CỦA DÒNG NÀY TRƯỚC
      const rowRange = sheet.getRange(emptyRow, 1, 1, sheet.getMaxColumns());
      rowRange.clearDataValidations();
      Logger.log('✅ Cleared all data validations for row ' + emptyRow);
      
      // ✅ BƯỚC 1: Điền số thứ tự (cột B - NO)
      sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.NO))
        .setValue(emptyRow - CONFIG.HEADER_ROW);
      
      // ✅ BƯỚC 2: Điền MONTH từ Start Date (cột C - format YYYYMM)
      if (rowData.startDate) {
        const startDate = parseDate(rowData.startDate);
        if (startDate) {
          const monthStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyyMM');
          sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.MONTH))
            .setValue(monthStr);
          Logger.log('✅ Month set to: ' + monthStr);
        }
      }
      
      // ✅ BƯỚC 3: Điền tên PIC từ mapping email → name (cột D - CHÍNH XÁC)
      const picName = getPICNameFromEmail(userEmail);
      Logger.log('📧 User Email: ' + userEmail);
      Logger.log('👤 PIC Name from mapping: ' + picName);
      
      // Xóa validation của cột PIC
      const picCell = sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.PIC));
      picCell.clearDataValidations();
      
      // Set giá trị
      picCell.setValue(picName);
      Logger.log('✅ PIC name set to: ' + picName);
      
      // Tạo lại Data Validation cho cột PIC (optional)
      try {
        const masterSheet = sheet.getParent().getSheetByName(CONFIG.MASTER_SHEET);
        if (masterSheet) {
          const picListRange = masterSheet.getRange('E2:E30');
          const picValidation = SpreadsheetApp.newDataValidation()
            .requireValueInRange(picListRange, true)
            .setAllowInvalid(false)
            .setHelpText('Please select a PIC from the list')
            .build();
          
          picCell.setDataValidation(picValidation);
          Logger.log('✅ Data validation restored for PIC column');
        }
      } catch (validationError) {
        Logger.log('⚠️ Could not restore data validation: ' + validationError.message);
        // Không throw error, vì đã điền đúng tên rồi
      }
      
      // ✅ BƯỚC 4: Điền các thông tin trip (cột E, F, G, H, I, J, K, L, M, N)
      
      // Start Date (E)
      if (rowData.startDate) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.START_DATE))
          .setValue(parseDate(rowData.startDate));
      }
      
      // Finish Date (F)
      if (rowData.finishDate) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.FINISH_DATE))
          .setValue(parseDate(rowData.finishDate));
      }
      
      // Working Date (G) - Tính toán số ngày
      if (rowData.startDate && rowData.finishDate) {
        const start = parseDate(rowData.startDate);
        const finish = parseDate(rowData.finishDate);
        if (start && finish) {
          const workingDays = calculateWorkingDays(start, finish);
          sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.WORKING_DATE))
            .setValue(workingDays);
        }
      }
      
      // Destination (H)
      if (rowData.destination) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION))
          .setValue(rowData.destination);
      }
      
      // Co-Traveler (I)
      if (rowData.coTraveler) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.CO_TRAVELER))
          .setValue(rowData.coTraveler);
      }
      
      // Purpose (J)
      if (rowData.purpose) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.PURPOSE))
          .setValue(rowData.purpose);
      }
      
      // Expected Result (K)
      if (rowData.expectedResult) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.EXPECTED_RESULT))
          .setValue(rowData.expectedResult);
      }
      
      // Estimated Cost (L)
      if (rowData.estimatedCost) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.ESTIMATED_COST))
          .setValue(rowData.estimatedCost);
      }
      
      // Schedule (M)
      if (rowData.schedule) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.SCHEDULE))
          .setValue(rowData.schedule);
      }
      
      // Folder Name (N)
      if (rowData.folderName) {
        sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_NAME))
          .setValue(rowData.folderName);
      }
      
      // ✅ BƯỚC 5: Điền Approval Status (Q) - mặc định "Not Yet"
      sheet.getRange(emptyRow, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS))
        .setValue('Not Yet');
      
      // ✅ BƯỚC 6: KHÔNG điền vào cột W, X, Y, Z
      // Array formulas sẽ tự động điền sau khi có PIC name đúng ở cột D
      
      Logger.log('=== ROW ' + emptyRow + ' ADDED SUCCESSFULLY ===');
    });
    
  } catch (error) {
    Logger.log('❌ Error in addNewRows: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}

function findEmptyRow(sheet) {
  const lastRow = sheet.getLastRow();
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, columnLetterToIndex(CONFIG.COLUMNS.PIC), 
                                   lastRow - CONFIG.DATA_START_ROW + 1, 10);
  const data = dataRange.getValues();
  
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i];
    const isEmpty = rowData.every(cell => !cell || cell.toString().trim() === '');
    if (isEmpty) return CONFIG.DATA_START_ROW + i;
  }
  
  return null;
}

// ===========================
// ✅ VIẾT LẠI HOÀN TOÀN: BUSINESS TRIP REPORT FUNCTION
// ===========================

/**
 * Xử lý việc tạo báo cáo Business Trip dạng Word Document
 * @param {Object} data - Dữ liệu báo cáo
 * @returns {Object} - Kết quả với success status và doc link
 */
/**
 * ✅ VERSION 2.0: Tạo Word Document + Điền nội dung bullet vào cột Q
 */
/**
 * ✅ VERSION 3.0: Xử lý tạo báo cáo + GỬI EMAIL (FIXED)
 * @param {Object} data - Dữ liệu báo cáo
 * @returns {Object} - Kết quả với success status và doc link
 */
function handleBusinessTripReport(data) {
  try {
    Logger.log('╔════════════════════════════════════════╗');
    Logger.log('📊 HANDLE BUSINESS TRIP REPORT V3.0');
    Logger.log('╚════════════════════════════════════════╝');
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const rowNumber = data.rowNumber;
    const tripData = data.tripData;
    const sendEmail = data.sendEmail || false;
    
    Logger.log('Row: ' + rowNumber);
    Logger.log('Destination: ' + (tripData.destination || 'N/A'));
    Logger.log('Send email: ' + (sendEmail ? 'YES' : 'NO'));
    Logger.log('');
    
    if (!sheet) throw new Error('Sheet not found: ' + CONFIG.SHEET_NAME);
    
    // ✅ Nếu chưa có folder link từ client, thử đọc từ sheet RichText
    let folderLink = tripData.folderLink || '';
    if (!folderLink || folderLink.trim() === '' || folderLink === 'Open Folder') {
      const ss2 = SpreadsheetApp.getActiveSpreadsheet();
      const sh2 = ss2.getSheetByName(CONFIG.SHEET_NAME);
      folderLink = getFolderLinkFromSheet(sh2, rowNumber);
      Logger.log('📁 Read folder link from RichText: "' + folderLink + '"');
    }
    
    // Nếu vẫn chưa có, tự động tạo folder
    if (!folderLink || folderLink.trim() === '') {
      Logger.log('📁 No folder found, auto-creating...');
      const folderNameVal = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_NAME)).getValue();
      if (folderNameVal && folderNameVal.toString().trim() !== '') {
        const folderResult = createReportFolder({
          rowNumber: rowNumber,
          folderName: folderNameVal.toString().trim()
        });
        if (folderResult.success) {
          folderLink = folderResult.folderLink;
          Logger.log('📁 Folder auto-created: ' + folderLink);
        } else {
          return {
            success: false,
            message: 'Cannot create folder: ' + folderResult.message
          };
        }
      } else {
        return {
          success: false,
          message: 'No folder name found. Please check column O.'
        };
      }
    }
    
    // Gán lại cho tripData
    tripData.folderLink = folderLink;
    
    // ✅ BƯỚC 1: TẠO WORD DOCUMENT
    Logger.log('📝 Step 1: Creating Word document...');
    const docResult = generateWordReport({
      tripData: tripData,
      keyActivities: data.keyActivities,
      keyFindings: data.keyFindings,
      followUp: data.followUp
    });
    
    if (!docResult.success) {
      return {
        success: false,
        message: docResult.message
      };
    }
    
    Logger.log('✅ Document created: ' + docResult.docLink);
    Logger.log('');
    
    // ✅ BƯỚC 2: TẠO BULLET CONTENT CHO COLUMN Q
    Logger.log('📝 Step 2: Creating bullet content...');
    const bulletContent = createBulletPointContent({
      keyActivities: data.keyActivities,
      keyFindings: data.keyFindings,
      followUp: data.followUp
    });
    
    // ✅ BƯỚC 3: ĐIỀN VÀO SHEET
    Logger.log('💾 Step 3: Updating sheet...');
    sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.RESULT))
      .setValue(bulletContent);
    
    const today = new Date();
    sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.ACTUAL_REPORT_DATE))
      .setValue(today);
    
    SpreadsheetApp.flush();
    Logger.log('✅ Sheet updated');
    Logger.log('');
    
    // ✅ BƯỚC 4: GỬI EMAIL (NẾU ĐƯỢC YÊU CẦU)
    if (sendEmail) {
      Logger.log('📧 Step 4: Sending report email...');
      
      const emailResult = sendReportEmail(
        sheet, 
        rowNumber, 
        tripData, 
        docResult.docLink,
        data.keyActivities,
        data.keyFindings,
        data.followUp
      );
      
      if (!emailResult.success) {
        // ⚠️ EMAIL FAILED - THÔNG BÁO CHO USER
        Logger.log('❌ Email failed: ' + emailResult.message);
        Logger.log('');
        
        return {
          success: true, // Document vẫn được tạo thành công
          message: '✅ Report document created successfully!\n\n' +
                   '⚠️ However, email sending FAILED:\n' +
                   emailResult.message + '\n\n' +
                   'Document link: ' + docResult.docLink + '\n\n' +
                   'Please send the report manually or try again.',
          docLink: docResult.docLink,
          docId: docResult.docId,
          emailSent: false
        };
      }
      
      Logger.log('✅ Email sent successfully!');
      Logger.log('');
    } else {
      Logger.log('ℹ️ Step 4: Email sending skipped (not requested)');
      Logger.log('');
    }
    
    // ✅ SUCCESS
    Logger.log('╔════════════════════════════════════════╗');
    Logger.log('✅ REPORT COMPLETED SUCCESSFULLY!');
    Logger.log('╚════════════════════════════════════════╝');
    
    return {
      success: true,
      message: '✅ Business trip report completed successfully!\n\n' +
               '📄 Document: Created\n' +
               (sendEmail ? '📧 Email: Sent to HOD & Director\n' : '') +
               '\nDocument link: ' + docResult.docLink,
      docLink: docResult.docLink,
      docId: docResult.docId,
      emailSent: sendEmail
    };
    
  } catch (error) {
    Logger.log('');
    Logger.log('❌❌❌ CRITICAL ERROR ❌❌❌');
    Logger.log('Error: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    Logger.log('╚════════════════════════════════════════╝');
    
    return {
      success: false,
      message: 'Error generating report: ' + error.message
    };
  }
}

/**
 * ✅ FUNCTION MỚI: Tạo nội dung bullet point
 */
function createBulletPointContent(data) {
  const lines = [];
  
  // I. Key Activities
  lines.push('**I. Key Activities**');
  lines.push(data.keyActivities.trim());
  lines.push('');
  
  // II. Key Findings
  lines.push('**II. Key Findings**');
  lines.push(data.keyFindings.trim());
  lines.push('');
  
  // III. Follow Up Actions
  lines.push('**III. Follow Up Actions**');
  lines.push(data.followUp.trim());
  
  return lines.join('\n');
}

/**
 * Tạo Word Document cho báo cáo Business Trip
 * @param {Object} data - Dữ liệu báo cáo
 * @returns {Object} - Kết quả với doc link và doc ID
 */
/**
 * Tạo Word Document cho báo cáo Business Trip
 * @param {Object} data - Dữ liệu báo cáo
 * @returns {Object} - Kết quả với doc link và doc ID
 */
/**
 * Loại bỏ ký tự bullet/dot thừa ở đầu mỗi dòng
 */
function cleanBulletText(text) {
  if (!text) return 'N/A';
  // Giữ nguyên nội dung gốc, chỉ trim whitespace
  return text.toString()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}
function generateWordReport(data) {
  try {
    const tripData = data.tripData;
    const folderLink = tripData.folderLink;
    
    // Validate folder link
    const folderId = extractFolderIdFromUrl(folderLink);
    if (!folderId) {
      return {
        success: false,
        message: 'Invalid folder link format.'
      };
    }
    
    const folder = DriveApp.getFolderById(folderId);
    const docName = tripData.folderName || `BusinessTrip_Report_${tripData.startDate}_${tripData.destination}`;
    
    // Tạo Google Doc
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();
    
    // ========== HEADER ==========
    const title = body.appendParagraph('BUSINESS TRIP REPORT');
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    title.editAsText()
      .setBold(true)
      .setFontSize(14)
      .setForegroundColor('#000000');
    
    body.appendParagraph('');
    body.appendHorizontalRule();
    body.appendParagraph('');
    
    // ========== I. TRIP INFORMATION ==========
    const section1 = body.appendParagraph('I. TRIP INFORMATION');
    section1.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    section1.editAsText()
      .setBold(true)
      .setFontSize(11)
      .setForegroundColor('#000000');
    
    body.appendParagraph('');
    
    // Tạo bảng thông tin trip
    const tripInfoTable = body.appendTable();
    tripInfoTable.setBorderWidth(0.5);
    
    // Helper function
    function addInfoRow(table, label, value) {
      const row = table.appendTableRow();
      const labelCell = row.appendTableCell(label);
      const valueCell = row.appendTableCell(value || 'N/A');
      
      labelCell.setBackgroundColor('#E8E8E8');
      labelCell.editAsText().setBold(true).setFontSize(11).setForegroundColor('#000000');
      labelCell.setPaddingLeft(10);
      labelCell.setPaddingRight(10);
      labelCell.setPaddingTop(8);
      labelCell.setPaddingBottom(8);
      labelCell.setWidth(150);
      
      valueCell.setBackgroundColor('#FFFFFF');
      valueCell.editAsText().setFontSize(11).setForegroundColor('#000000');
      valueCell.setPaddingLeft(10);
      valueCell.setPaddingRight(10);
      valueCell.setPaddingTop(8);
      valueCell.setPaddingBottom(8);
    }
    
    addInfoRow(tripInfoTable, 'Destination:', tripData.destination);
    addInfoRow(tripInfoTable, 'Date:', `${tripData.startDate || 'N/A'} to ${tripData.finishDate || 'N/A'}`);
    addInfoRow(tripInfoTable, 'Duration:', `${tripData.workingDate || 'N/A'} day(s)`);
    addInfoRow(tripInfoTable, 'Purpose:', tripData.purpose);
    addInfoRow(tripInfoTable, 'Co-Traveler:', tripData.coTraveler || 'None');
    addInfoRow(tripInfoTable, 'Estimated Cost:', tripData.estimatedCost);
    addInfoRow(tripInfoTable, 'Total Cost:', tripData.totalCost ? tripData.totalCost + ' VND' : 'N/A');
    addInfoRow(tripInfoTable, 'PIC:', tripData.pic);
    
    body.appendParagraph('');
    body.appendHorizontalRule();
    body.appendParagraph('');
    
    // ========== II. BUSINESS TRIP REPORT ==========
    const section2 = body.appendParagraph('II. BUSINESS TRIP REPORT');
    section2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    section2.editAsText()
      .setBold(true)
      .setFontSize(14)
      .setForegroundColor('#000000');
    
    body.appendParagraph('');
    
    // 1. Key Activities
    const keyActivitiesHeader = body.appendParagraph('🎯 Key Activities');
    keyActivitiesHeader.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    keyActivitiesHeader.editAsText()
      .setBold(true)
      .setFontSize(11)
      .setForegroundColor('#000000');
    
    const activitiesText = body.appendParagraph(cleanBulletText(data.keyActivities));
    activitiesText.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    activitiesText.setSpacingBefore(5);
    activitiesText.setSpacingAfter(5);
    activitiesText.setLineSpacing(1.3);
    activitiesText.editAsText()
      .setFontSize(11)
      .setForegroundColor('#000000');
    activitiesText.setIndentStart(0);
    
    body.appendParagraph('');
    
    // 2. Key Findings
    const keyFindingsHeader = body.appendParagraph('💡 Key Findings');
    keyFindingsHeader.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    keyFindingsHeader.editAsText()
      .setBold(true)
      .setFontSize(11)
      .setForegroundColor('#000000');
    
    const findingsText = body.appendParagraph(cleanBulletText(data.keyFindings));
    findingsText.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    findingsText.setSpacingBefore(5);
    findingsText.setSpacingAfter(5);
    findingsText.setLineSpacing(1.3);
    findingsText.editAsText()
      .setFontSize(11)
      .setForegroundColor('#000000');
    findingsText.setIndentStart(0);
    
    body.appendParagraph('');
    
    // 3. Follow Up Actions
    const followUpHeader = body.appendParagraph('📌 Follow Up Actions');
    followUpHeader.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    followUpHeader.editAsText()
      .setBold(true)
      .setFontSize(11)
      .setForegroundColor('#000000');
    
    const followUpText = body.appendParagraph(cleanBulletText(data.followUp));
    followUpText.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
    followUpText.setSpacingBefore(5);
    followUpText.setSpacingAfter(5);
    followUpText.setLineSpacing(1.3);
    followUpText.editAsText()
      .setFontSize(11)
      .setForegroundColor('#000000');
    followUpText.setIndentStart(0);
    
    body.appendParagraph('');
    body.appendHorizontalRule();
    body.appendParagraph('');
    
    // ========== FOOTER ==========
    const footer = body.appendParagraph(`Report generated on: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}`);
    footer.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    footer.editAsText()
      .setItalic(true)
      .setFontSize(9)
      .setForegroundColor('#666666');
    
    doc.saveAndClose();
    
    // Di chuyển doc vào folder
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(folder);
    
    const docLink = doc.getUrl();
    const docId = doc.getId();
    
    Logger.log('✅ Word report created successfully: ' + docLink);
    
    return {
      success: true,
      docLink: docLink,
      docId: docId
    };
    
  } catch (error) {
    Logger.log('❌ Error in generateWordReport: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    return {
      success: false,
      message: 'Error creating Word document: ' + error.message
    };
  }
}

/**
 * Extract folder ID từ Google Drive URL
 * @param {string} url - Drive folder URL
 * @returns {string|null} - Folder ID hoặc null
 */
/**
 * Extract folder ID từ Google Drive URL (Version cải tiến)
 * Support nhiều format URL khác nhau
 * @param {string} url - Drive folder URL
 * @returns {string|null} - Folder ID hoặc null
 */
function extractFolderIdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    Logger.log('ERROR: Invalid URL input: ' + url);
    return null;
  }
  
  // Log URL để debug
  Logger.log('Extracting folder ID from URL: ' + url);
  
  try {
    // Loại bỏ whitespace
    url = url.trim();
    // ✅ Nếu giá trị là "Open Folder" hoặc không phải URL → return null
    if (url === 'Open Folder' || url === 'open folder' || 
        (!url.includes('drive.google.com') && !url.match(/^[a-zA-Z0-9-_]{28,}$/))) {
      Logger.log('ERROR: Value is display text, not URL: "' + url + '"');
      return null;
    }
    // Pattern 1: Chuẩn format /folders/ID
    let matches = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      Logger.log('Found folder ID (Pattern 1): ' + matches[1]);
      return matches[1];
    }
    
    // Pattern 2: Format có /drive/u/0/folders/ID  
    matches = url.match(/\/drive\/u\/\d+\/folders\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      Logger.log('Found folder ID (Pattern 2): ' + matches[1]);
      return matches[1];
    }
    
    // Pattern 3: Format có id= parameter
    matches = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      Logger.log('Found folder ID (Pattern 3): ' + matches[1]);
      return matches[1];
    }
    
    // Pattern 4: Format có folder ID ở cuối URL
    matches = url.match(/\/([a-zA-Z0-9-_]{25,})\/?$/);
    if (matches && matches[1]) {
      Logger.log('Found folder ID (Pattern 4): ' + matches[1]);
      return matches[1];
    }
    
    // Pattern 5: Nếu URL chỉ là folder ID
    if (url.match(/^[a-zA-Z0-9-_]{25,}$/)) {
      Logger.log('Found folder ID (Pattern 5 - Direct ID): ' + url);
      return url;
    }
    
    Logger.log('ERROR: No folder ID pattern matched');
    return null;
    
  } catch (error) {
    Logger.log('ERROR in extractFolderIdFromUrl: ' + error.message);
    return null;
  }
}

/**
 * Function để test extract folder ID (dùng để debug)
 * Gọi function này để test các URL format khác nhau
 */
function testExtractFolderID() {
  const testUrls = [
    'https://drive.google.com/drive/folders/1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',
    'https://drive.google.com/drive/u/0/folders/1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',
    'https://drive.google.com/drive/u/1/folders/1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o?usp=sharing',
    'https://drive.google.com/drive/folders/1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o?usp=drive_link',
    '1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o'
  ];
  
  testUrls.forEach(url => {
    const result = extractFolderIdFromUrl(url);
    Logger.log(`URL: ${url}`);
    Logger.log(`Result: ${result}`);
    Logger.log('---');
  });
}
/**
 * Function debug để check folder link thực tế trong sheet
 * Gọi function này để xem folder link có format như thế nào
 */
function debugFolderLinks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== DEBUG FOLDER LINKS ===');
    Logger.log('User email: ' + userEmail);
    
    // Lấy data từ sheet
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, 25);
    const data = dataRange.getValues();
    
    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      const emailPIC = rowData[23]; // Cột W (EMAIL_PIC)
      const folderLink = rowData[15]; // Cột O (FOLDER_LINK)
      const destination = rowData[6]; // Cột H (DESTINATION)
      
      if (emailPIC && emailPIC.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        const actualRow = CONFIG.DATA_START_ROW + i;
        Logger.log(`Row ${actualRow}:`);
        Logger.log(`  Destination: ${destination}`);
        Logger.log(`  Folder Link: "${folderLink}"`);
        Logger.log(`  Link Type: ${typeof folderLink}`);
        Logger.log(`  Link Length: ${folderLink ? folderLink.toString().length : 0}`);
        
        if (folderLink) {
          const extractedID = extractFolderIdFromUrl(folderLink.toString());
          Logger.log(`  Extracted ID: ${extractedID}`);
        }
        Logger.log('---');
      }
    }
    
    Logger.log('=== END DEBUG ===');
    
  } catch (error) {
    Logger.log('ERROR in debugFolderLinks: ' + error.message);
  }
}
// ===========================
// EMAIL FUNCTIONS
// ===========================

/**
 * Gửi email đề xuất công tác cho HOD và Director
 * @param {Sheet} sheet - Google Sheet object
 * @param {Array} selectedRows - Danh sách row numbers được chọn
 * @param {Array} newRows - Danh sách new rows (không dùng trong function này)
 * @param {string} userEmail - Email của PIC
 */
/**
 * Gửi email đề xuất công tác cho HOD và Director
 * @param {Sheet} sheet - Google Sheet object
 * @param {Array} selectedRows - Danh sách row numbers được chọn
 * @param {Array} newRows - Danh sách new rows (không dùng trong function này)
 * @param {string} userEmail - Email của PIC
 */
/**
 * Gửi email đề xuất công tác cho HOD và Director
 * @param {Sheet} sheet - Google Sheet object
 * @param {Array} selectedRows - Danh sách row numbers được chọn
 * @param {Array} newRows - Danh sách new rows (không dùng trong function này)
 * @param {string} userEmail - Email của PIC
 */
/**
 * Gửi email đề xuất công tác cho HOD và Director
 * VERSION 2.0 - ĐÃ FIX LỖI EMAIL TRỐNG
 * @param {Sheet} sheet - Google Sheet object
 * @param {Array} selectedRows - Danh sách row numbers được chọn
 * @param {Array} newRows - Danh sách new rows (không dùng trong function này)
 * @param {string} userEmail - Email của PIC
 */
/**
 * Gửi email đề xuất công tác cho HOD và Director
 * VERSION 3.0 - ĐÃ FIX LỖI EMAIL TRỐNG + ENHANCED ERROR HANDLING
 * @param {Sheet} sheet - Google Sheet object
 * @param {Array} selectedRows - Danh sách row numbers được chọn
 * @param {Array} newRows - Danh sách new rows (không dùng trong function này)
 * @param {string} userEmail - Email của PIC
 */
/**
 * Gửi email đề xuất công tác cho HOD và Director
 * VERSION 4.0 - GỬI TỪNG EMAIL RIÊNG CHO TỪNG TRIP
 * 
 * ✅ THAY ĐỔI QUAN TRỌNG:
 * - Mỗi trip gửi 1 email riêng biệt
 * - Loop qua từng row và gửi email individual
 * - Better error handling cho từng email
 * 
 * @param {Sheet} sheet - Google Sheet object
 * @param {Array} selectedRows - Danh sách row numbers được chọn
 * @param {Array} newRows - Danh sách new rows (không dùng trong function này)
 * @param {string} userEmail - Email của PIC
 */
function sendProposalEmail(sheet, selectedRows, newRows, userEmail) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📧 SEND PROPOSAL EMAIL V5.0 (with Equipment)');
    Logger.log('═══════════════════════════════════════');
    Logger.log('Selected rows: ' + JSON.stringify(selectedRows));
    Logger.log('Total trips: ' + selectedRows.length);
    Logger.log('User email: ' + userEmail);
    
    if (!selectedRows || selectedRows.length === 0) {
      throw new Error('No rows selected for email');
    }
    
    const picName = getPICNameFromEmail(userEmail);
    Logger.log('PIC Name: ' + picName);
    
    if (!picName || picName === '') {
      throw new Error('Cannot determine PIC name from email: ' + userEmail);
    }
    
    // ✅ BƯỚC 1.5: VALIDATION - Kiểm tra bắt buộc cột B đến O
    Logger.log('🔍 Validating mandatory fields (B to O)...');
    var validationErrors = [];
    
    selectedRows.forEach(function(rowNumber) {
      var missingFields = [];
      
      var no = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.NO)).getValue();
      if (!no || no.toString().trim() === '') missingFields.push('No (B)');
      
      var month = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.MONTH)).getValue();
      if (!month || month.toString().trim() === '') missingFields.push('Month (C)');
      
      var pic = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      if (!pic || pic.toString().trim() === '') missingFields.push('PIC (D)');
      
      var startDate = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.START_DATE)).getValue();
      if (!startDate || startDate.toString().trim() === '') missingFields.push('Start Date (E)');
      
      var finishDate = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FINISH_DATE)).getValue();
      if (!finishDate || finishDate.toString().trim() === '') missingFields.push('Finish Date (F)');
      
      var workingDate = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.WORKING_DATE)).getValue();
      if (!workingDate || workingDate.toString().trim() === '') missingFields.push('Working Date (G)');
      
      var destination = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION)).getValue();
      if (!destination || destination.toString().trim() === '') missingFields.push('Destination (H)');
      
      var coTraveler = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.CO_TRAVELER)).getValue();
      if (!coTraveler || coTraveler.toString().trim() === '') missingFields.push('Co-Traveler (I)');
      
      var purpose = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PURPOSE)).getValue();
      if (!purpose || purpose.toString().trim() === '') missingFields.push('Purpose (J)');
      
      var expectedResult = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EXPECTED_RESULT)).getValue();
      if (!expectedResult || expectedResult.toString().trim() === '') missingFields.push('Expected Result (K)');
      
      var estimatedCost = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.ESTIMATED_COST)).getValue();
      if (!estimatedCost || estimatedCost.toString().trim() === '') missingFields.push('Estimated Cost (L)');
      
      var totalCost = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.TOTAL_COST)).getValue();
      if (!totalCost || totalCost.toString().trim() === '') missingFields.push('Total Cost (M)');
      
      var schedule = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.SCHEDULE)).getValue();
      if (!schedule || schedule.toString().trim() === '') missingFields.push('Schedule (N)');
      
      var equipment = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EQUIPMENT)).getValue();
      if (!equipment || equipment.toString().trim() === '') missingFields.push('Equipment (O)');
      
      if (missingFields.length > 0) {
        validationErrors.push('Row ' + rowNumber + ': Missing - ' + missingFields.join(', '));
      }
    });
    
    if (validationErrors.length > 0) {
      throw new Error('❌ Validation failed! Please fill in all required fields (B to O) before sending email.\n\n' + validationErrors.join('\n'));
    }
    
    Logger.log('✅ All validations passed');
    
    // ✅ BƯỚC 2: ĐỢI ARRAY FORMULAS
    Logger.log('⏳ Waiting for array formulas (5 seconds)...');
    SpreadsheetApp.flush();
    Utilities.sleep(5000);
    
    // ✅ BƯỚC 3: LOOP QUA TỪNG ROW VÀ GỬI EMAIL
    var successCount = 0;
    var failCount = 0;
    var failedRows = [];
    
    selectedRows.forEach(function(rowNumber, index) {
      try {
        Logger.log('📧 Processing row ' + rowNumber + ' (' + (index + 1) + '/' + selectedRows.length + ')...');
        
        var destination = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION)).getValue();
        var startDate = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.START_DATE)).getValue();
        var finishDate = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FINISH_DATE)).getValue();
        var workingDate = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.WORKING_DATE)).getValue();
        var purpose = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.PURPOSE)).getValue();
        var schedule = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.SCHEDULE)).getValue();
        var estimatedCost = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.ESTIMATED_COST)).getValue();
        var equipment = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EQUIPMENT)).getValue(); // ✅ MỚI
        
        var hodEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
        var directorEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
        
        hodEmail = hodEmail ? hodEmail.toString().trim() : '';
        directorEmail = directorEmail ? directorEmail.toString().trim() : '';
        
        if (hodEmail === '' || directorEmail === '') {
          var defaultEmails = getDefaultEmailsForPIC(picName);
          if (hodEmail === '') hodEmail = defaultEmails.hod || '';
          if (directorEmail === '') directorEmail = defaultEmails.director || '';
        }
        
        var isValidEmail = function(email) {
          if (!email || email === '') return false;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };
        
        if (!isValidEmail(hodEmail) && !isValidEmail(directorEmail)) {
          throw new Error('No valid recipients for row ' + rowNumber);
        }
        
        var DIRECTOR_EMAILS = ['nt.ha@manimedicalhanoi.com', 'nt.ha@mani.inc'];
        var isDirectorUser = DIRECTOR_EMAILS.some(function(e) { return userEmail.toLowerCase().trim() === e.toLowerCase(); });
        
        var toRecipients, ccRecipients;
        
        if (isDirectorUser) {
          toRecipients = 'vt.hoa@mani.inc';
          ccRecipients = userEmail;
          
          try {
            var folderNameVal = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_NAME)).getValue();
            var existingLink = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK)).getValue();
            
            if ((!existingLink || existingLink.toString().trim() === '') && folderNameVal && folderNameVal.toString().trim() !== '') {
              var folderResult = createReportFolder({ rowNumber: rowNumber, folderName: folderNameVal.toString().trim() });
              if (folderResult.success) Logger.log('  ✅ Folder created: ' + folderResult.folderLink);
            }
          } catch (folderErr) {
            Logger.log('  ⚠️ Folder creation error: ' + folderErr.message);
          }
        } else {
          toRecipients = directorEmail;
          ccRecipients = userEmail;
          if (isValidEmail(hodEmail)) {
            ccRecipients = hodEmail + ',' + userEmail;
          }
        }
        
        var tripForEmail = {
          row: rowNumber,
          destination: destination || 'N/A',
          workingDate: workingDate || 'N/A',
          startDate: startDate ? Utilities.formatDate(new Date(startDate), Session.getScriptTimeZone(), 'dd/MM/yyyy') : 'N/A',
          finishDate: finishDate ? Utilities.formatDate(new Date(finishDate), Session.getScriptTimeZone(), 'dd/MM/yyyy') : 'N/A',
          purpose: purpose || 'N/A',
          schedule: schedule || 'N/A',
          estimatedCost: estimatedCost || 'N/A',
          equipment: equipment || 'N/A'  // ✅ MỚI
        };
        
        var greeting = buildProposalGreeting(hodEmail);
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheetUrl = ss.getUrl();
        
        var htmlBody = buildBusinessTripProposalEmailV2(greeting, picName, [tripForEmail], sheetUrl);
        
        var dateStr = tripForEmail.startDate.replace(/\//g, '');
        var subject = 'Approval Business trip - ' + dateStr + ' - ' + picName;
        
        MailApp.sendEmail({
          to: toRecipients,
          cc: ccRecipients,
          subject: subject,
          htmlBody: htmlBody,
          name: 'Mani Medical Hanoi - Business Trip System'
        });
        
        Logger.log('  ✅ EMAIL SENT SUCCESSFULLY!');
        successCount++;
        
      } catch (emailError) {
        Logger.log('  ❌ EMAIL FAILED for row ' + rowNumber + ': ' + emailError.message);
        failCount++;
        failedRows.push({ row: rowNumber, error: emailError.message });
      }
    });
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('📊 EMAIL SUMMARY: Success=' + successCount + ', Failed=' + failCount);
    
    if (failCount === 0) {
      return { success: true, message: '✅ All ' + successCount + ' email(s) sent successfully!' };
    } else if (successCount > 0) {
      return { success: true, message: '⚠️ Sent: ' + successCount + ', Failed: ' + failCount };
    } else {
      throw new Error('All ' + failCount + ' email(s) failed. Check logs.');
    }
    
  } catch (error) {
    Logger.log('❌ CRITICAL ERROR: ' + error.message);
    throw error;
  }
}
/**
 * ✅ HÀM MỚI: Lấy default emails dựa trên PIC
 * Dùng khi array formulas chưa tính toán xong
 * @param {string} picName - Tên PIC
 * @returns {Object} - Object chứa hod và director email
 */
function getDefaultEmailsForPIC(picName) {
  const picToEmailMapping = {
    'Dao':      { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Yong':     { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Man':      { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Sui':      { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Thuong':   { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Trang':    { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Duc Anh':  { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Giang':    { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Vinh':     { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Minh Viet':{ hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Phuong':   { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Khang':    { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Viet Ha':  { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Ngoc':     { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' },
    'Quynh Anh':{ hod: 'vtt.hoa@mani.inc', director: 'nt.ha@mani.inc' },
    'Hau':      { hod: 'vtt.hoa@mani.inc', director: 'nt.ha@mani.inc' },
    'Dam Viet': { hod: 'vtt.hoa@mani.inc', director: 'nt.ha@mani.inc' },
    'Dam Ha':   { hod: 'vtt.hoa@mani.inc', director: 'nt.ha@mani.inc' },
    'Hoa':      { hod: 'vtt.hoa@mani.inc', director: 'nt.ha@mani.inc' },
    'Tuyen':    { hod: 'nt.ha@mani.inc',   director: 'nt.ha@mani.inc' },
    'Nguyen Ha':{ hod: 'nt.ha@mani.inc',   director: 'nt.ha@mani.inc' }
  };
  
  if (picToEmailMapping[picName]) {
    Logger.log('✅ Found default emails for PIC: ' + picName);
    return picToEmailMapping[picName];
  }
  
  Logger.log('⚠️ No mapping for PIC: ' + picName + ', using fallback');
  return { hod: 'tt.tuyen@mani.inc', director: 'nt.ha@mani.inc' };
}

/**
 * ✅ HÀM MỚI: Validate email format
 * @param {string} email - Email cần kiểm tra
 * @returns {boolean} - true nếu email hợp lệ
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
/**
 * Function debug để kiểm tra email columns
 * Chạy function này để xem email có đúng không
 */
function debugEmailColumns() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== DEBUG EMAIL COLUMNS ===');
    Logger.log('User email: ' + userEmail);
    Logger.log('Column W (EMAIL_PIC): ' + CONFIG.COLUMNS.EMAIL_PIC + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC));
    Logger.log('Column X (EMAIL_HOD): ' + CONFIG.COLUMNS.EMAIL_HOD + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD));
    Logger.log('Column Y (EMAIL_DIRECTOR): ' + CONFIG.COLUMNS.EMAIL_DIRECTOR + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR));
    Logger.log('Column Z (EMAIL_CC): ' + CONFIG.COLUMNS.EMAIL_CC + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC));
    
    // Tìm row của user
    const lastRow = sheet.getLastRow();
    let userRows = [];
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        userRows.push(i);
      }
    }
    
    Logger.log('Found ' + userRows.length + ' rows for user');
    
    // Kiểm tra từng row
    userRows.forEach(row => {
      Logger.log('\n--- ROW ' + row + ' ---');
      
      const picName = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      const picEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      const hodEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      const directorEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      const ccEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC)).getValue();
      
      Logger.log('PIC Name (D): "' + picName + '"');
      Logger.log('PIC Email (W): "' + picEmail + '"');
      Logger.log('HOD Email (X): "' + hodEmail + '"');
      Logger.log('Director Email (Y): "' + directorEmail + '"');
      Logger.log('CC Email (Z): "' + ccEmail + '"');
      
      if (!hodEmail && !directorEmail) {
        Logger.log('⚠️ WARNING: No emails found in this row!');
      }
    });
    
    Logger.log('\n=== END DEBUG ===');
    
  } catch (error) {
    Logger.log('❌ Error in debugEmailColumns: ' + error.message);
  }
}
/**
 * Build HTML email cho Business Trip Proposal
 * @param {string} greeting - Lời chào (Dear xxx-san)
 * @param {string} picName - Tên PIC
 * @param {Array} trips - Danh sách các trips
 * @param {string} sheetUrl - URL của Google Sheet
 * @returns {string} - HTML email content
 */
/**
 * Build HTML email cho Business Trip Proposal - VERSION 2.0
 * OPTIMIZED FOR OUTLOOK + ENHANCED UI
 * @param {string} greeting - Lời chào
 * @param {string} picName - Tên PIC
 * @param {Array} trips - Danh sách trips
 * @param {string} sheetUrl - URL Google Sheet
 * @returns {string} - HTML email content
 */
function buildBusinessTripProposalEmailV2(greeting, picName, trips, sheetUrl) {
  try {
    var tripsRows = '';
    
    trips.forEach(function(trip, index) {
      tripsRows +=
        '<tr>' +
        '<td style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          (trip.row || (index + 1)) +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          escapeHtmlEmail(trip.destination) +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          trip.workingDate +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          trip.startDate +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          trip.finishDate +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          escapeHtmlEmail(trip.purpose) +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          escapeHtmlEmail(trip.schedule) +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; text-align: right; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          escapeHtmlEmail(trip.estimatedCost) +
        '</td>' +
        '<td style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt;">' +
          escapeHtmlEmail(trip.equipment || 'N/A') +
        '</td>' +
        '</tr>';
    });
    
    var htmlContent =
      '<!DOCTYPE html>' +
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head>' +
      '<body style="margin: 0; padding: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">' +
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding: 20px;">' +
      '<p style="margin: 0 0 20px 0; font-family: Calibri, sans-serif; font-size: 14pt; font-weight: bold; color: #000000;">Business Trip Approval Request</p>' +
      '<p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">' + greeting + ',</p>' +
      '<p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">I would like to request your approval for the following business trip(s). Please review the details below:</p>' +
      '<table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border-collapse: collapse; margin: 20px 0; border: 1px solid #000000;">' +
      '<thead><tr style="background-color: #f0f0f0;">' +
      '<th style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Row</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Destination</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Days</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Start Date</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; text-align: center; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Finish Date</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Purpose</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Schedule</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Estimated Cost</th>' +
      '<th style="border: 1px solid #000000; padding: 8px; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold;">Equipment</th>' +
      '</tr></thead>' +
      '<tbody>' + tripsRows + '</tbody></table>' +
           // ✅ Equipment commitment note - chỉ hiện khi có trip có equipment thực tế
      (function() {
        var hasEquipment = trips.some(function(t) {
          var eq = (t.equipment || '').toString().trim().toLowerCase();
          return eq !== '' && eq !== 'none' && eq !== 'n/a';
        });
        if (!hasEquipment) return '';
        return '<p style="margin: 20px 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6; font-weight: bold;">Equipment Commitment:</p>' +
          '<p style="margin: 0 0 5px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">' +
          '1. I will comply with all safety and information security regulations when using the above equipment and assets outside the office.</p>' +
          '<p style="margin: 0 0 5px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">' +
          '2. All equipment and assets will be returned to the company upon completion of the business trip as stated in each proposal above.</p>' +
          '<p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">' +
          '3. I take full responsibility for any loss, damage, or costs incurred while these equipment and assets are outside the office.</p>';
      })() +
      '<p style="margin: 20px 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">Please review and approve at your earliest convenience.</p>' +
      '<p style="margin: 20px 0 0 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;"><a href="' + sheetUrl + '" style="color: #0066cc; text-decoration: underline; font-weight: bold;">Click here to review</a></p>' +
      '<p style="margin: 30px 0 0 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">Best regards,<br/><strong>' + picName + '</strong></p>' +
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000000;"><tr>' +
      '<td style="font-family: Calibri, sans-serif; font-size: 10pt; color: #000000;">Mani Medical Hanoi - Business Trip Management System</td>' +
      '<td style="text-align: right; font-family: Calibri, sans-serif; font-size: 10pt; color: #000000;">' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') + '</td>' +
      '</tr></table>' +
      '</td></tr></table></body></html>';
    
    return htmlContent;
    
  } catch (error) {
    Logger.log('❌ Error in buildBusinessTripProposalEmailV2: ' + error.message);
    throw error;
  }
}
/**
 * ✅ FUNCTION MỚI: Build email Report đơn giản
 * @param {Object} tripData - Dữ liệu chuyến đi
 * @param {string} keyActivities - Key Activities
 * @param {string} keyFindings - Key Findings
 * @param {string} followUpActions - Follow Up Actions
 * @param {string} folderLink - Link folder báo cáo
 * @returns {string} - HTML email content
 */
function buildBusinessTripReportEmail(tripData, keyActivities, keyFindings, followUpActions, folderLink) {
  try {
    const picName = tripData.pic || 'PIC';
    const hodName = tripData.hodName || 'Manager';
    const destination = tripData.destination || 'N/A';
    const workingDate = tripData.workingDate || 'N/A';
    const totalCost = tripData.totalCost || 'N/A';
    
    // Format nội dung bullet points (chuyển newlines thành <br/>)
    const formatBulletContent = (text) => {
      if (!text) return 'N/A';
      // Giữ nguyên nội dung, chỉ chuyển newline thành <br/>
      // KHÔNG thêm bullet "•" vì user tự format nội dung
      return text.toString()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('<br/>');
    };
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      </head>
      <body style="margin: 0; padding: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 20px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear Ha-san,
              </p>
              <p style="margin: 0 0 20px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Dear ${hodName}-san,
              </p>
              
              <!-- Main Message -->
<p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
  Here is my report for business trip at <strong>${destination}</strong> for <strong>${workingDate} days</strong>:
</p>
              
              <!-- Trip Information Box - ENHANCED -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #f9f9f9; border: 1px solid #000000;">
  <tr>
    <td style="padding: 15px;">
      <p style="margin: 0 0 8px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
        <strong>Total Cost:</strong> ${totalCost} VND
      </p>
      <p style="margin: 0 0 8px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
        <strong>Schedule:</strong> ${escapeHtmlEmail(tripData.schedule || 'N/A')}
      </p>
      <p style="margin: 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
        <strong>Purpose:</strong> ${escapeHtmlEmail(tripData.purpose || 'N/A')}
      </p>
    </td>
  </tr>
</table>
              
              <!-- I. Key Activities -->
              <p style="margin: 20px 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold; color: #000000;">
                I. Key Activities
              </p>
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                ${formatBulletContent(keyActivities)}
              </p>
              
              <!-- II. Key Findings -->
              <p style="margin: 20px 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold; color: #000000;">
                II. Key Findings
              </p>
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                ${formatBulletContent(keyFindings)}
              </p>
              
              <!-- III. Follow Up Actions -->
              <p style="margin: 20px 0 10px 0; font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold; color: #000000;">
                III. Follow Up Actions
              </p>
              <p style="margin: 0 0 15px 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.8;">
                ${formatBulletContent(followUpActions)}
              </p>
              
              <!-- Link to Folder -->
              <p style="margin: 30px 0 0 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000;">
                Please <a href="${folderLink}" style="color: #000000; text-decoration: underline; font-weight: bold;">click here</a> to see more detail about this trip.
              </p>
              
              <!-- Signature -->
              <p style="margin: 30px 0 0 0; font-family: Calibri, sans-serif; font-size: 11pt; color: #000000; line-height: 1.6;">
                Best regards,<br/>
                <strong>${picName}</strong>
              </p>
              
              <!-- Footer -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #000000;">
                <tr>
                  <td style="font-family: Calibri, sans-serif; font-size: 10pt; color: #000000;">
                    Mani Medical Hanoi - Business Trip Management System
                  </td>
                  <td style="text-align: right; font-family: Calibri, sans-serif; font-size: 10pt; color: #000000;">
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
    
    return htmlContent;
    
  } catch (error) {
    Logger.log('❌ Error in buildBusinessTripReportEmail: ' + error.message);
    throw error;
  }
}
/**
 * Escape HTML characters for email (tránh XSS)
 * @param {string} text - Text cần escape
 * @returns {string} - Text đã escape
 */
function escapeHtmlEmail(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
/**
 * Gửi email thông báo report đã hoàn thành
 */
/**
 * ✅ VERSION 2.0: Gửi email Report với format mới
 * Gửi cho HOD và Director với nội dung Key Activities, Findings, Follow Up
 * @param {Object} sheet - Sheet object
 * @param {number} rowNumber - Số dòng
 * @param {Object} tripData - Dữ liệu chuyến đi
 * @param {string} docLink - Link document báo cáo
 * @param {string} keyActivities - Key Activities content
 * @param {string} keyFindings - Key Findings content
 * @param {string} followUpActions - Follow Up Actions content
 */
/**
 * ✅ VERSION 3.0: Gửi email Report với ENHANCED EMAIL HANDLING
 * Tự động đợi array formula và sử dụng default emails nếu cần
 * @param {Object} sheet - Sheet object
 * @param {number} rowNumber - Số dòng
 * @param {Object} tripData - Dữ liệu chuyến đi
 * @param {string} docLink - Link document báo cáo
 * @param {string} keyActivities - Key Activities content
 * @param {string} keyFindings - Key Findings content
 * @param {string} followUpActions - Follow Up Actions content
 */
/**
 * ✅ VERSION 4.0: Gửi email Report với ROBUST ERROR HANDLING
 * @param {Object} sheet - Sheet object
 * @param {number} rowNumber - Số dòng
 * @param {Object} tripData - Dữ liệu chuyến đi
 * @param {string} docLink - Link document báo cáo
 * @param {string} keyActivities - Key Activities content
 * @param {string} keyFindings - Key Findings content
 * @param {string} followUpActions - Follow Up Actions content
 */
/**
 * ✅ VERSION 5.0: Gửi email Report với ĐÚNG RECIPIENTS
 * TO: Director (cột Z)
 * CC: HOD (cột Y)
 * 
 * @param {Object} sheet - Sheet object
 * @param {number} rowNumber - Số dòng
 * @param {Object} tripData - Dữ liệu chuyến đi
 * @param {string} docLink - Link document báo cáo
 * @param {string} keyActivities - Key Activities content
 * @param {string} keyFindings - Key Findings content
 * @param {string} followUpActions - Follow Up Actions content
 */
function sendReportEmail(sheet, rowNumber, tripData, docLink, keyActivities, keyFindings, followUpActions) {
  try {
    Logger.log('╔═══════════════════════════════════════╗');
    Logger.log('📧 SEND REPORT EMAIL V5.0');
    Logger.log('╚═══════════════════════════════════════╝');
    Logger.log('Row number: ' + rowNumber);
    Logger.log('Destination: ' + tripData.destination);
    Logger.log('');
    
    // ========================================
    // BƯỚC 1: ĐỢI ARRAY FORMULA POPULATE
    // ========================================
    Logger.log('⏳ Step 1: Waiting for array formulas (5 seconds)...');
    SpreadsheetApp.flush();
    Utilities.sleep(5000);
    Logger.log('✅ Wait completed');
    Logger.log('');
    
    // ========================================
    // BƯỚC 2: ĐỌC EMAIL TỪ ĐÚNG CỘT
    // ========================================
    Logger.log('📖 Step 2: Reading emails from correct columns...');
    Logger.log('  Reading from:');
    Logger.log('    - Column Y (EMAIL_HOD) for CC');
    Logger.log('    - Column Z (EMAIL_DIRECTOR) for TO');
    Logger.log('');
    
    // ✅ ĐỌC TỪ CỘT Y (HOD) VÀ CỘT Z (DIRECTOR)
    let hodEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
    let directorEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
    
    hodEmail = hodEmail ? hodEmail.toString().trim() : '';
    directorEmail = directorEmail ? directorEmail.toString().trim() : '';
    
    Logger.log('  HOD Email (Column Y): "' + hodEmail + '"');
    Logger.log('  Director Email (Column Z): "' + directorEmail + '"');
    Logger.log('');
    
    // ========================================
    // BƯỚC 3: RETRY NẾU THIẾU EMAIL
    // ========================================
    if (hodEmail === '' || directorEmail === '') {
      Logger.log('⚠️ Step 3: Missing emails! Retrying after 3 seconds...');
      SpreadsheetApp.flush();
      Utilities.sleep(3000);
      
      hodEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      directorEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      
      hodEmail = hodEmail ? hodEmail.toString().trim() : '';
      directorEmail = directorEmail ? directorEmail.toString().trim() : '';
      
      Logger.log('  HOD Email (retry): "' + hodEmail + '"');
      Logger.log('  Director Email (retry): "' + directorEmail + '"');
      Logger.log('');
    }
    
    // ========================================
    // BƯỚC 4: FALLBACK - LẤY DEFAULT EMAILS
    // ========================================
    if (hodEmail === '' || directorEmail === '') {
      Logger.log('🔄 Step 4: Using fallback - getting default emails...');
      
      const picName = tripData.pic || getPICNameFromEmail(Session.getActiveUser().getEmail());
      Logger.log('  PIC Name: "' + picName + '"');
      
      const defaultEmails = getDefaultEmailsForPIC(picName);
      
      if (hodEmail === '') {
        hodEmail = defaultEmails.hod || '';
        Logger.log('  ✅ Default HOD: "' + hodEmail + '"');
      }
      
      if (directorEmail === '') {
        directorEmail = defaultEmails.director || '';
        Logger.log('  ✅ Default Director: "' + directorEmail + '"');
      }
      Logger.log('');
    }
    
    // ========================================
    // BƯỚC 5: VALIDATION EMAIL FORMAT
    // ========================================
    Logger.log('🔍 Step 5: Validating email format...');
    
    const isValidEmail = (email) => {
      if (!email || email === '') return false;
      // Validate single email (không chứa dấu ;)
      if (email.includes(';') || email.includes(',')) {
        Logger.log('  ⚠️ Email contains separator (;) - invalid!');
        return false;
      }
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };
    
    const hodValid = isValidEmail(hodEmail);
    const directorValid = isValidEmail(directorEmail);
    
    Logger.log('  HOD Email valid: ' + (hodValid ? '✅' : '❌'));
    Logger.log('  Director Email valid: ' + (directorValid ? '✅' : '❌'));
    Logger.log('');
    
    // ✅ CHỈ CẦN DIRECTOR EMAIL HỢP LỆ (priority)
    if (!directorValid) {
      Logger.log('❌ FAILED: No valid Director email!');
      Logger.log('');
      
      return {
        success: false,
        message: 'Cannot send report email: No valid Director email found.\n\n' +
                 'Please check:\n' +
                 '• Column Z (EMAIL_DIRECTOR) has a valid single email\n' +
                 '• Array formula is working correctly\n' +
                 '• Email does not contain ";" or multiple addresses\n\n' +
                 'Director email found: "' + directorEmail + '"\n\n' +
                 'Run debugReportEmail() for more details.'
      };
    }
    
    // ========================================
    // BƯỚC 6: BUILD RECIPIENTS
    // ========================================
    Logger.log('📋 Step 6: Building recipients list...');
    
    // ✅ TO: DIRECTOR ONLY
    const recipients = directorEmail;
    
    // ✅ CC: HOD (nếu valid)
    const ccRecipients = hodValid ? hodEmail : '';
    
    Logger.log('  TO (Director): ' + recipients);
    Logger.log('  CC (HOD): ' + (ccRecipients || 'None'));
    Logger.log('  Status: ✅ Recipients ready');
    Logger.log('');
    
    // ========================================
    // BƯỚC 7: LẤY HOD NAME
    // ========================================
    Logger.log('👤 Step 7: Getting HOD name...');
    
    const masterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MASTER_SHEET);
    let hodName = 'Manager';
    
    if (masterSheet && hodEmail && hodValid) {
      const masterData = masterSheet.getDataRange().getValues();
      for (let i = 1; i < masterData.length; i++) {
        if (masterData[i][2] && masterData[i][2].toString().toLowerCase() === hodEmail.toLowerCase()) {
          hodName = masterData[i][0] || 'Manager';
          break;
        }
      }
    }
    
    Logger.log('  HOD Name: "' + hodName + '"');
    Logger.log('');
    
    // ========================================
    // BƯỚC 8: BUILD EMAIL CONTENT
    // ========================================
    Logger.log('📝 Step 8: Building email content...');
    
    const enrichedTripData = {
      ...tripData,
      hodName: hodName
    };
    
    const htmlBody = buildBusinessTripReportEmail(
      enrichedTripData,
      keyActivities,
      keyFindings,
      followUpActions,
      tripData.folderLink
    );
    
    Logger.log('  HTML length: ' + htmlBody.length + ' characters');
    Logger.log('  Status: ✅ Email content ready');
    Logger.log('');
    
    // ========================================
    // BƯỚC 9: GỬI EMAIL
    // ========================================
    Logger.log('📤 Step 9: Sending email...');
    Logger.log('  TO: ' + recipients);
    Logger.log('  CC: ' + (ccRecipients || 'None'));
    
    const subject = `Business Trip Report - ${tripData.pic || 'PIC'} - ${tripData.destination} - From ${tripData.startDate} to ${tripData.finishDate}`;
    
    try {
      MailApp.sendEmail({
        to: recipients,              // ✅ TO: Director only
        cc: ccRecipients || '',      // ✅ CC: HOD (if valid)
        subject: subject,
        htmlBody: htmlBody,
        name: 'Mani Medical Hanoi - Business Trip System'
      });
      
      Logger.log('  Status: ✅ EMAIL SENT!');
      Logger.log('');
      Logger.log('╔═══════════════════════════════════════╗');
      Logger.log('✅ SUCCESS - Email sent successfully!');
      Logger.log('╚═══════════════════════════════════════╝');
      
      return {
        success: true,
        message: 'Report email sent successfully!\n\n' +
                 '📧 TO: Director (' + directorEmail + ')\n' +
                 '📋 CC: HOD (' + (hodEmail || 'None') + ')'
      };
      
    } catch (mailError) {
      Logger.log('  Status: ❌ MAIL SEND FAILED');
      Logger.log('  Error: ' + mailError.message);
      throw mailError;
    }
    
  } catch (error) {
    Logger.log('');
    Logger.log('❌❌❌ CRITICAL ERROR ❌❌❌');
    Logger.log('Error: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    Logger.log('╚═══════════════════════════════════════╝');
    
    return {
      success: false,
      message: 'Error sending report email: ' + error.message + '\n\n' +
               'Check Apps Script logs for details.\n\n' +
               'Common issues:\n' +
               '• Column Z (Director email) is empty or invalid\n' +
               '• Email contains multiple addresses separated by ";"\n' +
               '• Array formulas not working properly'
    };
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
    
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;
    
    return null;
  } catch (error) {
    Logger.log('Error parsing date: ' + dateStr);
    return null;
  }
}

function calculateWorkingDays(startDate, finishDate) {
  if (!startDate || !finishDate) return 0;
  
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(Math.abs((finishDate - startDate) / oneDay)) + 1;
  
  return diffDays;
}

/**
 * Lấy tên PIC từ email với mapping chính xác
 * @param {string} email - Email cần convert sang tên
 * @returns {string} - Tên PIC tương ứng
 */
/**
 * Lấy tên PIC từ email với mapping CHÍNH XÁC
 * @param {string} email - Email cần convert sang tên
 * @returns {string} - Tên PIC tương ứng
 */
/**
 * Lấy tên PIC từ email với mapping CHÍNH XÁC
 * ✅ CẬP NHẬT: Bổ sung đầy đủ danh sách theo yêu cầu
 * @param {string} email - Email cần convert sang tên
 * @returns {string} - Tên PIC tương ứng
 */
function getPICNameFromEmail(email) {
  if (!email) {
    Logger.log('❌ ERROR: getPICNameFromEmail received empty email!');
    throw new Error('Email cannot be empty');
  }
  
  const emailLower = email.toString().toLowerCase().trim();
  
  Logger.log('=== getPICNameFromEmail ===');
  Logger.log('Input email: "' + emailLower + '"');
  
  // ✅ MAPPING ĐẦY ĐỦ - Hỗ trợ cả @mani.inc và @manimedicalhanoi.com
  const picMapping = {
    // --- @mani.inc domain ---
    'manithailand@mani.inc': 'Dao',
    'manithailand2@mani.inc': 'Yong',
    'manithailand3@mani.inc': 'Man',
    'manithailand1@mani.inc': 'Sui',
    'tt.tuyen@mani.inc': 'Tuyen',
    'nt.ha@mani.inc': 'Nguyen Ha',
    'marketing.mmh@mani.inc': 'Thuong',
    'marketing.mmh2@mani.inc': 'Bui Trang',
    'marketing.mmh1@mani.inc': 'Duc Anh',
    'mmh.product@mani.inc': 'Giang',
    'mmh.admin@mani.inc': 'Quynh Anh',
    'mmh.danang@mani.inc': 'Vinh',
    'mmh.hanoi@mani.inc': 'Minh Viet',
    'mmh.saigon@mani.inc': 'Phuong',
    'mmh.hanoi2@mani.inc': 'Viet Ha',
    'mmh.saigon2@mani.inc': 'Khang',
    'vtt.hoa@mani.inc': 'Hoa',
    'mmh.hanoi1@mani.inc': 'Ngoc',
    'mmh.backoffice1@mani.inc': 'Hau',
    'mmh.order@mani.inc': 'Dam Viet',
    'mmh.backoffice@mani.inc': 'Dam Ha',
    
    // --- @manimedicalhanoi.com domain (same mapping) ---
    'manithailand@manimedicalhanoi.com': 'Dao',
    'manithailand2@manimedicalhanoi.com': 'Yong',
    'manithailand3@manimedicalhanoi.com': 'Man',
    'manithailand1@manimedicalhanoi.com': 'Sui',
    'tt.tuyen@manimedicalhanoi.com': 'Tuyen',
    'nt.ha@manimedicalhanoi.com': 'Nguyen Ha',
    'marketing.mmh@manimedicalhanoi.com': 'Thuong',
    'marketing.mmh2@manimedicalhanoi.com': 'Bui Trang',
    'marketing.mmh1@manimedicalhanoi.com': 'Duc Anh',
    'mmh.product@manimedicalhanoi.com': 'Giang',
    'mmh.admin@manimedicalhanoi.com': 'Quynh Anh',
    'mmh.danang@manimedicalhanoi.com': 'Vinh',
    'mmh.hanoi@manimedicalhanoi.com': 'Minh Viet',
    'mmh.saigon@manimedicalhanoi.com': 'Phuong',
    'mmh.hanoi2@manimedicalhanoi.com': 'Viet Ha',
    'mmh.saigon1@manimedicalhanoi.com': 'Khang',
    'vtt.hoa@manimedicalhanoi.com': 'Hoa',
    'mmh.hanoi1@manimedicalhanoi.com': 'Ngoc',
    'mmh.backoffice1@manimedicalhanoi.com': 'Hau',
    'mmh.order@manimedicalhanoi.com': 'Dam Viet',
    'mmh.backoffice@manimedicalhanoi.com': 'Dam Ha',
    
    // --- Test account ---
    'ruby180924@gmail.com': 'Test'
  };
  
  const picName = picMapping[emailLower];
  
  if (picName) {
    Logger.log('✅ Found PIC name: "' + picName + '"');
    return picName;
  }
  
  // ✅ FALLBACK: Thử cross-domain (nếu login @mani.inc, tìm trong @manimedicalhanoi.com và ngược lại)
  let altEmail = '';
  if (emailLower.includes('@mani.inc')) {
    altEmail = emailLower.replace('@mani.inc', '@manimedicalhanoi.com');
  } else if (emailLower.includes('@manimedicalhanoi.com')) {
    altEmail = emailLower.replace('@manimedicalhanoi.com', '@mani.inc');
  }
  
  if (altEmail && picMapping[altEmail]) {
    Logger.log('✅ Found PIC name via cross-domain: "' + picMapping[altEmail] + '"');
    return picMapping[altEmail];
  }
  
  Logger.log('❌ No mapping found for: "' + emailLower + '"');
  throw new Error('Email "' + email + '" is not configured in PIC mapping.');
}/**
 * Lấy tên từ email (dùng cho HOD và Director)
 * @param {string} email - Email cần convert sang tên
 * @returns {string} - Tên người dùng
 */
function getNameFromEmail(email) {
  if (!email || email.trim() === '') return '';
  
  const nameMapping = {
    'tt.tuyen@manimedicalthanoi.com': 'Tuyen',
    'vtt.hoa@manimedicalthanoi.com': 'Hoa',
    'manithailand@manimedicalthanoi.com': 'Dao' // Director
  };
  
  const emailLower = email.toLowerCase().trim();
  return nameMapping[emailLower] || email.split('@')[0];
}
/**
 * Tự động điền email HOD và Director nếu thiếu
 * @param {Sheet} sheet - Google Sheet object
 * @param {number} rowNumber - Số dòng cần check
 * @param {string} userEmail - Email của PIC
 */
function ensureEmailsExist(sheet, rowNumber, userEmail) {
  try {
    let hodEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
    let directorEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
    
    hodEmail = hodEmail ? hodEmail.toString().trim() : '';
    directorEmail = directorEmail ? directorEmail.toString().trim() : '';
    
    let updated = false;
    
    // Nếu thiếu HOD email
    if (hodEmail === '') {
      hodEmail = 'tt.tuyen@manimedicalthanoi.com'; // Default HOD
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).setValue(hodEmail);
      updated = true;
      Logger.log('✅ Set default HOD email: ' + hodEmail);
    }
    
    // Nếu thiếu Director email
    if (directorEmail === '') {
      directorEmail = 'vtt.hoa@manimedicalthanoi.com'; // Default Director (Ha-san)
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).setValue(directorEmail);
      updated = true;
      Logger.log('✅ Set default Director email: ' + directorEmail);
    }
    
    // Nếu thiếu PIC email
    let picEmail = sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
    picEmail = picEmail ? picEmail.toString().trim() : '';
    
    if (picEmail === '') {
      sheet.getRange(rowNumber, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).setValue(userEmail);
      updated = true;
      Logger.log('✅ Set PIC email: ' + userEmail);
    }
    
    return updated;
    
  } catch (error) {
    Logger.log('⚠️ Error in ensureEmailsExist: ' + error.message);
    return false;
  }
}/**
 * Function test gửi email đơn giản để kiểm tra quyền
 * Chạy function này từ Apps Script Editor để test
 */
function testSendEmail() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    Logger.log('Testing email from: ' + userEmail);
    
    // Gửi email test đến chính mình
    MailApp.sendEmail({
      to: userEmail,
      subject: 'Test Email from Business Trip System',
      body: 'This is a test email. If you receive this, email sending is working correctly.',
      name: 'Business Trip System'
    });
    
    Logger.log('✅ Test email sent successfully to: ' + userEmail);
    Logger.log('Please check your inbox');
    
  } catch (error) {
    Logger.log('❌ Error sending test email: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}/**
 * Function test tạo new row và kiểm tra PIC name
 */
function testPICNameWithValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = 'mmh.product@manimedicalthanoi.com';
  
  const newRows = [{
    startDate: '2025-01-20',
    finishDate: '2025-01-22',
    destination: 'Test City',
    purpose: 'Test Purpose'
  }];
  
  Logger.log('=== TESTING PIC NAME ===');
  addNewRows(sheet, newRows, userEmail);
  
  // Kiểm tra kết quả
  const lastRow = sheet.getLastRow();
  const picName = sheet.getRange(lastRow, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
  const month = sheet.getRange(lastRow, columnLetterToIndex(CONFIG.COLUMNS.MONTH)).getValue();
  
  Logger.log('Result:');
  Logger.log('  Row: ' + lastRow);
  Logger.log('  Month: ' + month + ' (should be 202501)');
  Logger.log('  PIC: ' + picName + ' (should be Giang)');
  
  if (picName === 'Giang' && month === '202501') {
    Logger.log('✅ TEST PASSED!');
  } else {
    Logger.log('❌ TEST FAILED!');
  }
}/**
 * Function test gửi email với auto-fill emails
 */
function testEmailWithAutoFill() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = Session.getActiveUser().getEmail();
  
  // Tìm row của user
  const lastRow = sheet.getLastRow();
  let testRow = null;
  
  for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
    const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
    if (picEmail && picEmail.toString().toLowerCase() === userEmail.toLowerCase()) {
      testRow = i;
      break;
    }
  }
  
  if (!testRow) {
    Logger.log('❌ No row found for user: ' + userEmail);
    return;
  }
  
  Logger.log('=== TESTING EMAIL SEND ===');
  Logger.log('Test row: ' + testRow);
  
  // Ensure emails exist
  ensureEmailsExist(sheet, testRow, userEmail);
  
  // Try sending
  try {
    sendProposalEmail(sheet, [testRow], [], userEmail);
    Logger.log('✅ TEST PASSED - Email sent!');
  } catch (error) {
    Logger.log('❌ TEST FAILED: ' + error.message);
  }
}/**
 * Function kiểm tra và log PIC name mapping
 * Dùng để debug và verify mapping có đúng không
 */
function testPICNameMapping() {
  const testEmails = [
    'mmh.product@manimedicalthanoi.com',
    'marketing.mmh@manimedicalthanoi.com',
    'marketing.mmh1@manimedicalthanoi.com',
    'tt.tuyen@manimedicalthanoi.com'
  ];
  
  Logger.log('=== TESTING PIC NAME MAPPING ===');
  testEmails.forEach(email => {
    const picName = getPICNameFromEmail(email);
    Logger.log('Email: ' + email + ' → PIC: ' + picName);
  });
  Logger.log('=== END TEST ===');
}// Chạy function này trong Apps Script Editor
function testPICMapping() {
  // Test với email mmh.product@manimedicalthanoi.com
  const picName = getPICNameFromEmail('mmh.product@manimedicalthanoi.com');
  Logger.log('Result: ' + picName); // Phải là "Giang"
  
  if (picName === 'Giang') {
    Logger.log('✅ TEST PASSED!');
  } else {
    Logger.log('❌ TEST FAILED! Expected: Giang, Got: ' + picName);
  }
}// Test thêm dòng mới và kiểm tra PIC name
function testAddNewRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = 'mmh.product@manimedicalthanoi.com';
  
  const newRows = [{
    startDate: '2025-01-20',
    finishDate: '2025-01-22',
    destination: 'Test City',
    coTraveler: 'Test Person',
    purpose: 'Test Purpose',
    expectedResult: 'Test Result',
    estimatedCost: '1000 USD',
    schedule: 'Day 1: Meeting',
    folderName: '2025-01-20_Test_City'
  }];
  
  addNewRows(sheet, newRows, userEmail);
  
  // Kiểm tra kết quả
  const lastRow = sheet.getLastRow();
  const picName = sheet.getRange(lastRow, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
  const emailPIC = sheet.getRange(lastRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
  
  Logger.log('=== TEST RESULT ===');
  Logger.log('Last row: ' + lastRow);
  Logger.log('PIC name: ' + picName + ' (should be: Giang)');
  Logger.log('Email PIC: ' + emailPIC);
  Logger.log('==================');
  
  if (picName === 'Giang') {
    Logger.log('✅ TEST PASSED!');
  } else {
    Logger.log('❌ TEST FAILED!');
  }
}function testArrayFormulasNotOverwritten() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  // Kiểm tra các cột W, X, Y, Z của dòng cuối
  const emailHOD = sheet.getRange(lastRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
  const emailDirector = sheet.getRange(lastRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
  
  Logger.log('=== CHECKING ARRAY FORMULAS ===');
  Logger.log('Row: ' + lastRow);
  Logger.log('EMAIL_HOD (X): ' + emailHOD);
  Logger.log('EMAIL_DIRECTOR (Y): ' + emailDirector);
  
  if (emailHOD && emailDirector) {
    Logger.log('✅ Array formulas are working correctly!');
  } else {
    Logger.log('⚠️ Array formulas may need time to populate');
  }
}/**
 * Function debug để kiểm tra email columns
 * Chạy function này để xem email có đúng không
 */
function debugEmailColumns() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== DEBUG EMAIL COLUMNS ===');
    Logger.log('User email: ' + userEmail);
    Logger.log('Column W (EMAIL_PIC): ' + CONFIG.COLUMNS.EMAIL_PIC + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC));
    Logger.log('Column X (EMAIL_HOD): ' + CONFIG.COLUMNS.EMAIL_HOD + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD));
    Logger.log('Column Y (EMAIL_DIRECTOR): ' + CONFIG.COLUMNS.EMAIL_DIRECTOR + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR));
    Logger.log('Column Z (EMAIL_CC): ' + CONFIG.COLUMNS.EMAIL_CC + ' = Index ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC));
    
    // Tìm row của user
    const lastRow = sheet.getLastRow();
    let userRows = [];
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        userRows.push(i);
      }
    }
    
    Logger.log('Found ' + userRows.length + ' rows for user');
    
    // Kiểm tra từng row
    userRows.forEach(row => {
      Logger.log('\n--- ROW ' + row + ' ---');
      
      const picName = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      const picEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      const hodEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      const directorEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      const ccEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC)).getValue();
      
      Logger.log('PIC Name (D): "' + picName + '"');
      Logger.log('PIC Email (W): "' + picEmail + '"');
      Logger.log('HOD Email (X): "' + hodEmail + '"');
      Logger.log('Director Email (Y): "' + directorEmail + '"');
      Logger.log('CC Email (Z): "' + ccEmail + '"');
      
      if (!hodEmail && !directorEmail) {
        Logger.log('⚠️ WARNING: No emails found in this row!');
      }
    });
    
    Logger.log('\n=== END DEBUG ===');
    
  } catch (error) {
    Logger.log('❌ Error in debugEmailColumns: ' + error.message);
  }
}/**
 * ✅ FUNCTION DEBUG: Test gửi email với validation đầy đủ
 * Chạy function này từ Apps Script Editor để test
 */
function testEmailSendingV2() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== TESTING EMAIL SENDING V2.0 ===');
    Logger.log('User: ' + userEmail);
    
    // Tìm row của user
    const lastRow = sheet.getLastRow();
    let testRow = null;
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        testRow = i;
        break;
      }
    }
    
    if (!testRow) {
      Logger.log('❌ No row found for user');
      return;
    }
    
    Logger.log('Test row: ' + testRow);
    
    // Test sending
    const result = sendProposalEmail(sheet, [testRow], [], userEmail);
    
    if (result.success) {
      Logger.log('✅✅✅ TEST PASSED - Email sent successfully! ✅✅✅');
      Logger.log('Recipients: ' + result.message);
    } else {
      Logger.log('❌ TEST FAILED');
    }
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}

/**
 * ✅ FUNCTION DEBUG: Kiểm tra email columns
 */
function debugEmailColumnsV2() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== DEBUG EMAIL COLUMNS V2.0 ===');
    Logger.log('User: ' + userEmail);
    
    // Tìm rows của user
    const lastRow = sheet.getLastRow();
    let userRows = [];
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        userRows.push(i);
      }
    }
    
    Logger.log('Found ' + userRows.length + ' rows');
    
    userRows.forEach(row => {
      Logger.log('\n--- ROW ' + row + ' ---');
      
      const picName = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      const hodEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      const directorEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      
      Logger.log('PIC: "' + picName + '"');
      Logger.log('HOD Email (X): "' + hodEmail + '"');
      Logger.log('Director Email (Y): "' + directorEmail + '"');
      Logger.log('HOD Valid: ' + isValidEmail(hodEmail));
      Logger.log('Director Valid: ' + isValidEmail(directorEmail));
      
      // Test default emails
      if (!hodEmail || !directorEmail) {
        const defaultEmails = getDefaultEmailsForPIC(picName);
        Logger.log('Default HOD: ' + defaultEmails.hod);
        Logger.log('Default Director: ' + defaultEmails.director);
      }
    });
    
    Logger.log('\n=== END DEBUG ===');
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.message);
  }
}/**
 * ✅ FUNCTION MỚI: Kiểm tra và báo cáo tình trạng email columns
 * Giúp debug khi email không gửi được
 */
function checkEmailColumnsStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== EMAIL COLUMNS STATUS REPORT ===');
    Logger.log('User: ' + userEmail);
    Logger.log('Timestamp: ' + new Date().toString());
    Logger.log('');
    
    // Tìm các rows của user
    const lastRow = sheet.getLastRow();
    let userRows = [];
    let issuesFound = [];
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        userRows.push(i);
      }
    }
    
    Logger.log('📊 Found ' + userRows.length + ' rows for user\n');
    
    // Kiểm tra từng row
    userRows.forEach(row => {
      Logger.log('--- ROW ' + row + ' ---');
      
      const picName = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      const destination = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION)).getValue();
      const hodEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      const directorEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      const approvalStatus = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).getValue();
      
      Logger.log('Destination: ' + destination);
      Logger.log('PIC Name (D): "' + picName + '"');
      Logger.log('HOD Email (X): "' + hodEmail + '"');
      Logger.log('Director Email (Y): "' + directorEmail + '"');
      Logger.log('Approval Status: ' + approvalStatus);
      
      // Check issues
      let rowIssues = [];
      
      if (!picName || picName === '') {
        rowIssues.push('PIC name is empty');
      }
      
      if (!hodEmail || hodEmail.toString().trim() === '') {
        rowIssues.push('HOD email is empty');
      } else if (!isValidEmail(hodEmail)) {
        rowIssues.push('HOD email format is invalid');
      }
      
      if (!directorEmail || directorEmail.toString().trim() === '') {
        rowIssues.push('Director email is empty');
      } else if (!isValidEmail(directorEmail)) {
        rowIssues.push('Director email format is invalid');
      }
      
      if (rowIssues.length > 0) {
        Logger.log('⚠️ ISSUES: ' + rowIssues.join(', '));
        issuesFound.push({
          row: row,
          destination: destination,
          issues: rowIssues
        });
      } else {
        Logger.log('✅ OK');
      }
      
      Logger.log('');
    });
    
    // Summary
    Logger.log('=== SUMMARY ===');
    if (issuesFound.length === 0) {
      Logger.log('✅ All rows are OK - emails should send successfully');
    } else {
      Logger.log('⚠️ Found issues in ' + issuesFound.length + ' row(s):');
      issuesFound.forEach(item => {
        Logger.log('  Row ' + item.row + ' (' + item.destination + '): ' + item.issues.join(', '));
      });
    }
    
    Logger.log('=== END REPORT ===');
    
    // Show alert to user
    let alertMsg = 'Email Columns Status Report:\n\n';
    alertMsg += 'Total rows checked: ' + userRows.length + '\n';
    
    if (issuesFound.length === 0) {
      alertMsg += '\n✅ All rows are OK!\nEmails should send successfully.';
    } else {
      alertMsg += '\n⚠️ Found issues in ' + issuesFound.length + ' row(s):\n\n';
      issuesFound.forEach(item => {
        alertMsg += 'Row ' + item.row + ':\n';
        item.issues.forEach(issue => {
          alertMsg += '  • ' + issue + '\n';
        });
        alertMsg += '\n';
      });
      alertMsg += 'Please check the Apps Script logs for details.';
    }
    
    SpreadsheetApp.getUi().alert('Email Status Check', alertMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    Logger.log('❌ Error in checkEmailColumnsStatus: ' + error.message);
    SpreadsheetApp.getUi().alert('Error', 'Failed to check email status:\n' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ✅ FUNCTION MỚI: Test gửi email với UI mới
 * Dùng để test email template trước khi deploy
 */
function testEmailUIPreview() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const picName = getPICNameFromEmail(userEmail);
    
    // Tạo test data
    const testTrips = [
      {
        destination: 'Ho Chi Minh City, Vietnam',
        workingDate: '3',
        startDate: '15/01/2025',
        finishDate: '17/01/2025',
        purpose: 'Meet with Dr. Rumpa to discuss new orthopedic products and market expansion strategy for Q1 2025.',
        schedule: 'Day 1: Travel to HCMC, Day 2: Meeting with Dr. Rumpa at clinic, Day 3: Return to Hanoi',
        estimatedCost: '5,000,000 VND'
      }
    ];
    
    const greeting = 'Dear Ha-san and Tuyen-san';
    const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
    
    // Build HTML
    const htmlBody = buildBusinessTripProposalEmailV2(greeting, picName, testTrips, sheetUrl);
    
    // Gửi test email cho chính mình
    MailApp.sendEmail({
      to: userEmail,
      subject: 'TEST EMAIL - Business Trip Approval Request UI Preview',
      htmlBody: htmlBody,
      name: 'Mani Medical Hanoi - Business Trip System'
    });
    
    Logger.log('✅ Test email sent to: ' + userEmail);
    SpreadsheetApp.getUi().alert(
      'Test Email Sent',
      'A test email with the new UI has been sent to your email:\n\n' + userEmail + '\n\nPlease check your inbox (and spam folder) to preview the email design.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('❌ Error in testEmailUIPreview: ' + error.message);
    SpreadsheetApp.getUi().alert('Error', 'Failed to send test email:\n' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * ✅ FUNCTION MỚI: Debug email sending với logging chi tiết
 */
function debugEmailSendingFlow() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('=== DEBUG EMAIL SENDING FLOW ===');
    Logger.log('User: ' + userEmail);
    Logger.log('Timestamp: ' + new Date().toString());
    Logger.log('');
    
    // Tìm row đầu tiên của user
    const lastRow = sheet.getLastRow();
    let testRow = null;
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        testRow = i;
        break;
      }
    }
    
    if (!testRow) {
      Logger.log('❌ No row found for user');
      SpreadsheetApp.getUi().alert('No Data', 'No business trip found for your email.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    Logger.log('📍 Test row: ' + testRow);
    Logger.log('');
    
    // STEP 1: Check PIC name
    Logger.log('STEP 1: Checking PIC name...');
    const picName = getPICNameFromEmail(userEmail);
    Logger.log('  Result: "' + picName + '"');
    Logger.log('  Status: ' + (picName ? '✅ OK' : '❌ FAILED'));
    Logger.log('');
    
    // STEP 2: Check email columns
    Logger.log('STEP 2: Checking email columns...');
    let hodEmail = sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
    let directorEmail = sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
    
    hodEmail = hodEmail ? hodEmail.toString().trim() : '';
    directorEmail = directorEmail ? directorEmail.toString().trim() : '';
    
    Logger.log('  HOD Email (X): "' + hodEmail + '"');
    Logger.log('  Director Email (Y): "' + directorEmail + '"');
    
    if (hodEmail === '' || directorEmail === '') {
      Logger.log('  ⚠️ Empty emails detected! Waiting 5 seconds...');
      Utilities.sleep(5000);
      
      hodEmail = sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      directorEmail = sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      
      hodEmail = hodEmail ? hodEmail.toString().trim() : '';
      directorEmail = directorEmail ? directorEmail.toString().trim() : '';
      
      Logger.log('  After wait - HOD: "' + hodEmail + '"');
      Logger.log('  After wait - Director: "' + directorEmail + '"');
    }
    
    if (hodEmail === '' && directorEmail === '') {
      Logger.log('  ⚠️ Still empty! Using default emails...');
      const defaultEmails = getDefaultEmailsForPIC(picName);
      hodEmail = defaultEmails.hod;
      directorEmail = defaultEmails.director;
      Logger.log('  Default HOD: ' + hodEmail);
      Logger.log('  Default Director: ' + directorEmail);
    }
    
    const emailsOK = (hodEmail !== '' || directorEmail !== '');
    Logger.log('  Status: ' + (emailsOK ? '✅ OK' : '❌ FAILED'));
    Logger.log('');
    
    // STEP 3: Validate email format
    Logger.log('STEP 3: Validating email format...');
    const hodValid = hodEmail === '' || isValidEmail(hodEmail);
    const directorValid = directorEmail === '' || isValidEmail(directorEmail);
    
    Logger.log('  HOD valid: ' + (hodValid ? '✅' : '❌'));
    Logger.log('  Director valid: ' + (directorValid ? '✅' : '❌'));
    Logger.log('  Status: ' + (hodValid && directorValid ? '✅ OK' : '❌ FAILED'));
    Logger.log('');
    
    // STEP 4: Build email
    Logger.log('STEP 4: Building email...');
    try {
      const trips = [{
        destination: sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION)).getValue() || 'Test City',
        workingDate: sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.WORKING_DATE)).getValue() || '3',
        startDate: formatDate(sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.START_DATE)).getValue()),
        finishDate: formatDate(sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.FINISH_DATE)).getValue()),
        purpose: sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.PURPOSE)).getValue() || 'Test purpose',
        schedule: sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.SCHEDULE)).getValue() || 'Test schedule',
        estimatedCost: sheet.getRange(testRow, columnLetterToIndex(CONFIG.COLUMNS.ESTIMATED_COST)).getValue() || 'N/A'
      }];
      
      const greeting = 'Dear Manager';
      const sheetUrl = ss.getUrl();
      
      const htmlBody = buildBusinessTripProposalEmailV2(greeting, picName, trips, sheetUrl);
      
      Logger.log('  HTML length: ' + htmlBody.length + ' characters');
      Logger.log('  Status: ✅ OK');
    } catch (buildError) {
      Logger.log('  Status: ❌ FAILED');
      Logger.log('  Error: ' + buildError.message);
    }
    Logger.log('');
    
    // STEP 5: Test sending
    Logger.log('STEP 5: Testing email send...');
    
    if (!emailsOK || !hodValid || !directorValid) {
      Logger.log('  ⏭️ SKIPPED - Prerequisites failed');
      Logger.log('');
      Logger.log('=== SUMMARY ===');
      Logger.log('❌ Cannot proceed with email test due to validation failures.');
      Logger.log('Please fix the issues above and try again.');
      
      SpreadsheetApp.getUi().alert(
        'Debug Result',
        'Email validation failed. Please check the Apps Script logs for details.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      
      return;
    }
    
    const recipients = [hodEmail, directorEmail].filter(e => e !== '').join(',');
    Logger.log('  Recipients: ' + recipients);
    Logger.log('  CC: ' + userEmail);
    
    const confirmSend = SpreadsheetApp.getUi().alert(
      'Send Test Email?',
      'Recipients: ' + recipients + '\nCC: ' + userEmail + '\n\nSend test email now?',
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (confirmSend === SpreadsheetApp.getUi().Button.YES) {
      try {
        sendProposalEmail(sheet, [testRow], [], userEmail);
        Logger.log('  Status: ✅ SUCCESS');
        Logger.log('');
        Logger.log('=== SUMMARY ===');
        Logger.log('✅ All steps passed! Email sent successfully.');
        
        SpreadsheetApp.getUi().alert(
          'Success',
          'Test email sent successfully!\n\nRecipients: ' + recipients + '\nCC: ' + userEmail,
          SpreadsheetApp.getUi().ButtonSet.OK
        );
        
      } catch (sendError) {
        Logger.log('  Status: ❌ FAILED');
        Logger.log('  Error: ' + sendError.message);
        Logger.log('  Stack: ' + sendError.stack);
        Logger.log('');
        Logger.log('=== SUMMARY ===');
        Logger.log('❌ Email sending failed: ' + sendError.message);
        
        SpreadsheetApp.getUi().alert(
          'Send Failed',
          'Email sending failed:\n\n' + sendError.message + '\n\nCheck Apps Script logs for details.',
          SpreadsheetApp.getUi().ButtonSet.OK
        );
      }
    } else {
      Logger.log('  Status: ⏭️ CANCELLED by user');
      Logger.log('');
      Logger.log('=== SUMMARY ===');
      Logger.log('Test cancelled by user.');
    }
    
    Logger.log('=== END DEBUG ===');
    
  } catch (error) {
    Logger.log('❌ CRITICAL ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    
    SpreadsheetApp.getUi().alert(
      'Debug Error',
      'An error occurred during debugging:\n\n' + error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}/**
 * DEBUG FUNCTION - Kiểm tra column mapping và dữ liệu
 * Chạy function này để xem vấn đề
 */
function debugHODDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = Session.getActiveUser().getEmail();
  
  Logger.log('╔════════════════════════════════════════╗');
  Logger.log('║   DEBUG HOD APPROVAL DIALOG            ║');
  Logger.log('╚════════════════════════════════════════╝');
  Logger.log('');
  Logger.log('👤 Current User: ' + userEmail);
  Logger.log('📊 Sheet Name: ' + CONFIG.SHEET_NAME);
  Logger.log('');
  
  // STEP 1: Check if user is HOD
  Logger.log('─── STEP 1: Check HOD Permission ───');
  const isUserHOD = isHOD(userEmail);
  Logger.log('Is HOD: ' + (isUserHOD ? '✅ YES' : '❌ NO'));
  
  if (!isUserHOD) {
    Logger.log('');
    Logger.log('⚠️ USER IS NOT HOD!');
    Logger.log('Possible reasons:');
    Logger.log('1. Email not found in column Y (EMAIL_HOD)');
    Logger.log('2. Wrong email used');
    Logger.log('');
    Logger.log('Checking what emails are in column Y...');
    
    const lastRow = sheet.getLastRow();
    const hodEmailColumn = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD);
    const hodEmails = sheet.getRange(CONFIG.DATA_START_ROW, hodEmailColumn, 
                                     lastRow - CONFIG.DATA_START_ROW + 1, 1)
                           .getValues()
                           .flat()
                           .filter(email => email && email.toString().trim() !== '');
    
    Logger.log('');
    Logger.log('📧 Unique HOD emails found in column Y:');
    const uniqueEmails = [...new Set(hodEmails.map(e => e.toString().toLowerCase().trim()))];
    uniqueEmails.forEach(email => {
      Logger.log('  • ' + email);
    });
    
    Logger.log('');
    Logger.log('💡 SOLUTION: Add your email to column Y, or login with one of the emails above');
    return;
  }
  
  Logger.log('');
  
  // STEP 2: Check data retrieval
  Logger.log('─── STEP 2: Check Data Retrieval ───');
  
  const lastRow = sheet.getLastRow();
  Logger.log('Last row in sheet: ' + lastRow);
  Logger.log('Data start row: ' + CONFIG.DATA_START_ROW);
  Logger.log('Total data rows: ' + (lastRow - CONFIG.DATA_START_ROW + 1));
  Logger.log('');
  
  // STEP 3: Check column indexes
  Logger.log('─── STEP 3: Verify Column Indexes ───');
  Logger.log('EMAIL_HOD column: ' + CONFIG.COLUMNS.EMAIL_HOD + ' (index: ' + columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD) + ')');
  Logger.log('APPROVAL_STATUS column: ' + CONFIG.COLUMNS.APPROVAL_STATUS + ' (index: ' + columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS) + ')');
  Logger.log('');
  
  // STEP 4: Scan for matching rows
  Logger.log('─── STEP 4: Scan for Matching Rows ───');
  Logger.log('Looking for rows where:');
  Logger.log('  • Column Y = ' + userEmail);
  Logger.log('  • Column R = "Already sent propose email"');
  Logger.log('');
  
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, 28);
  const data = dataRange.getValues();
  
  let matchingRows = [];
  let totalRows = 0;
  let rowsWithHODEmail = 0;
  let rowsWithCorrectStatus = 0;
  
  for (let i = 0; i < data.length; i++) {
    totalRows++;
    const rowData = data[i];
    const actualRow = CONFIG.DATA_START_ROW + i;
    
    const emailHOD = rowData[25]; // Column Y (0-indexed: 24)
    const approvalStatus = rowData[17]; // Column R (0-indexed: 16)
    const pic = rowData[2]; // Column D
    const destination = rowData[6]; // Column H
    
    // Debug first 3 rows
    if (i < 3) {
      Logger.log('Row ' + actualRow + ':');
      Logger.log('  PIC: ' + pic);
      Logger.log('  Destination: ' + destination);
      Logger.log('  Email HOD (Y): "' + emailHOD + '"');
      Logger.log('  Approval Status (R): "' + approvalStatus + '"');
      Logger.log('');
    }
    
    const emailMatches = emailHOD && 
                        emailHOD.toString().toLowerCase().trim() === userEmail.toLowerCase().trim();
    
    const statusMatches = approvalStatus === 'Already sent propose email';
    
    if (emailMatches) rowsWithHODEmail++;
    if (statusMatches) rowsWithCorrectStatus++;
    
    if (emailMatches && statusMatches) {
      matchingRows.push({
        row: actualRow,
        pic: pic,
        destination: destination,
        status: approvalStatus
      });
    }
  }
  
  Logger.log('');
  Logger.log('─── STEP 5: Results Summary ───');
  Logger.log('Total rows scanned: ' + totalRows);
  Logger.log('Rows with your HOD email: ' + rowsWithHODEmail);
  Logger.log('Rows with "Already sent propose email": ' + rowsWithCorrectStatus);
  Logger.log('Matching rows (both conditions): ' + matchingRows.length);
  Logger.log('');
  
  if (matchingRows.length === 0) {
    Logger.log('❌ NO MATCHING ROWS FOUND!');
    Logger.log('');
    Logger.log('🔍 DIAGNOSIS:');
    
    if (rowsWithHODEmail === 0) {
      Logger.log('  ⚠️ Problem: No rows have your email in column Y');
      Logger.log('  💡 Solution: Check if array formulas in column Y are working');
      Logger.log('              Column Y should auto-populate based on PIC name');
    } else if (rowsWithCorrectStatus === 0) {
      Logger.log('  ⚠️ Problem: No rows have status "Already sent propose email"');
      Logger.log('  💡 Solution: Send a proposal email first from PIC menu');
      Logger.log('              Status will change from "Not Yet" to "Already sent propose email"');
    } else {
      Logger.log('  ⚠️ Problem: Email matches found, but wrong status');
      Logger.log('  💡 Solution: PIC needs to send proposal email first');
      Logger.log('');
      Logger.log('  Rows with your email but wrong status:');
      
      for (let i = 0; i < data.length && i < 10; i++) {
        const rowData = data[i];
        const actualRow = CONFIG.DATA_START_ROW + i;
        const emailHOD = rowData[24];
        const approvalStatus = rowData[16];
        const pic = rowData[2];
        
        if (emailHOD && emailHOD.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
          Logger.log('    • Row ' + actualRow + ' (PIC: ' + pic + '): Status = "' + approvalStatus + '"');
        }
      }
    }
  } else {
    Logger.log('✅ FOUND ' + matchingRows.length + ' MATCHING ROWS:');
    matchingRows.forEach(row => {
      Logger.log('  • Row ' + row.row + ': ' + row.pic + ' → ' + row.destination);
    });
    Logger.log('');
    Logger.log('❓ WHY ISN\'T DIALOG SHOWING?');
    Logger.log('   This is strange - data exists but dialog says "No Pending Approvals"');
    Logger.log('   Possible issue: getHODApprovalData() function has a bug');
  }
  
  Logger.log('');
  Logger.log('════════════════════════════════════════');
  Logger.log('END DEBUG');
  Logger.log('════════════════════════════════════════');
}/**
 * 🔍 DEBUG FUNCTION - Tìm nguyên nhân "No Pending Approvals"
 * Chạy function này từ Apps Script Editor
 */
function debugWhyNoPendingApprovals() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = Session.getActiveUser().getEmail();
  
  Logger.log('╔═══════════════════════════════════════╗');
  Logger.log('║  DEBUG: WHY NO PENDING APPROVALS?    ║');
  Logger.log('╚═══════════════════════════════════════╝');
  Logger.log('');
  Logger.log('👤 Logged in as: ' + userEmail);
  Logger.log('📅 Date: ' + new Date().toString());
  Logger.log('');
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BƯỚC 1: Kiểm tra isHOD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Logger.log('┌─── STEP 1: Check isHOD() ───┐');
  const isUserHOD = isHOD(userEmail);
  Logger.log('│ Result: ' + (isUserHOD ? '✅ YES - User is HOD' : '❌ NO - User is NOT HOD'));
  Logger.log('└──────────────────────────────┘');
  Logger.log('');
  
  if (!isUserHOD) {
    Logger.log('❌ PROBLEM FOUND: User is not recognized as HOD');
    Logger.log('   → Check if email exists in column Y (EMAIL_HOD)');
    Logger.log('');
    Logger.log('🔍 Scanning column Y for emails...');
    
    const lastRow = sheet.getLastRow();
    const hodEmailCol = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD);
    const hodEmails = sheet.getRange(CONFIG.DATA_START_ROW, hodEmailCol, lastRow - CONFIG.DATA_START_ROW + 1, 1)
                           .getValues()
                           .flat()
                           .filter(e => e && e.toString().trim() !== '');
    
    const uniqueEmails = [...new Set(hodEmails.map(e => e.toString().toLowerCase().trim()))];
    
    Logger.log('📧 Emails found in column Y:');
    uniqueEmails.forEach(email => {
      Logger.log('   • ' + email);
    });
    
    Logger.log('');
    Logger.log('💡 SOLUTION: Login with one of the emails above, or add your email to column Y');
    return;
  }
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BƯỚC 2: Scan toàn bộ sheet
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Logger.log('┌─── STEP 2: Scan All Rows ───┐');
  
  const lastRow = sheet.getLastRow();
  const hodEmailCol = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD);
  const statusCol = columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS);
  const picCol = columnLetterToIndex(CONFIG.COLUMNS.PIC);
  const destCol = columnLetterToIndex(CONFIG.COLUMNS.DESTINATION);
  
  Logger.log('│ Total rows in sheet: ' + lastRow);
  Logger.log('│ Data rows to scan: ' + (lastRow - CONFIG.DATA_START_ROW + 1));
  Logger.log('│ EMAIL_HOD column: ' + CONFIG.COLUMNS.EMAIL_HOD + ' (index ' + hodEmailCol + ')');
  Logger.log('│ APPROVAL_STATUS column: ' + CONFIG.COLUMNS.APPROVAL_STATUS + ' (index ' + statusCol + ')');
  Logger.log('└──────────────────────────────┘');
  Logger.log('');
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BƯỚC 3: Phân tích từng row
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Logger.log('┌─── STEP 3: Detailed Analysis ───┐');
  
  let totalRows = 0;
  let rowsWithYourEmail = 0;
  let rowsWithCorrectStatus = 0;
  let matchingRows = 0;
  const userEmailLower = userEmail.toLowerCase().trim();
  
  const matchedRowDetails = [];
  const yourEmailButWrongStatus = [];
  const correctStatusButWrongEmail = [];
  
  for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
    totalRows++;
    
    const emailHOD = sheet.getRange(i, hodEmailCol).getValue();
    const approvalStatus = sheet.getRange(i, statusCol).getValue();
    const pic = sheet.getRange(i, picCol).getValue();
    const destination = sheet.getRange(i, destCol).getValue();
    
    // Skip empty rows
    if (!pic || pic.toString().trim() === '') continue;
    
    const emailHODStr = emailHOD ? emailHOD.toString().toLowerCase().trim() : '';
    const statusStr = approvalStatus ? approvalStatus.toString().trim() : '';
    
    const emailMatches = emailHODStr === userEmailLower;
    const statusMatches = statusStr === 'Already sent propose email';
    
    if (emailMatches) rowsWithYourEmail++;
    if (statusMatches) rowsWithCorrectStatus++;
    
    if (emailMatches && statusMatches) {
      matchingRows++;
      matchedRowDetails.push({
        row: i,
        pic: pic,
        destination: destination
      });
    } else if (emailMatches && !statusMatches) {
      yourEmailButWrongStatus.push({
        row: i,
        pic: pic,
        status: statusStr
      });
    } else if (!emailMatches && statusMatches) {
      correctStatusButWrongEmail.push({
        row: i,
        pic: pic,
        emailHOD: emailHODStr
      });
    }
    
    // Log first 3 rows for detailed inspection
    if (i <= CONFIG.DATA_START_ROW + 2) {
      Logger.log('│ Row ' + i + ':');
      Logger.log('│   PIC: "' + pic + '"');
      Logger.log('│   Destination: "' + destination + '"');
      Logger.log('│   Email HOD (Y): "' + emailHODStr + '"');
      Logger.log('│   Status (R): "' + statusStr + '"');
      Logger.log('│   Email matches? ' + (emailMatches ? '✅' : '❌'));
      Logger.log('│   Status matches? ' + (statusMatches ? '✅' : '❌'));
      Logger.log('│');
    }
  }
  
  Logger.log('└──────────────────────────────────────┘');
  Logger.log('');
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BƯỚC 4: Kết quả
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Logger.log('┌─── STEP 4: Summary ───┐');
  Logger.log('│ Total rows scanned: ' + totalRows);
  Logger.log('│ Rows with YOUR email in Y: ' + rowsWithYourEmail);
  Logger.log('│ Rows with "Already sent propose email": ' + rowsWithCorrectStatus);
  Logger.log('│ ✅ MATCHING rows (both conditions): ' + matchingRows);
  Logger.log('└───────────────────────┘');
  Logger.log('');
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BƯỚC 5: Chẩn đoán
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Logger.log('┌─── STEP 5: Diagnosis ───┐');
  
  if (matchingRows > 0) {
    Logger.log('│ ✅ GOOD NEWS: Found ' + matchingRows + ' matching row(s)!');
    Logger.log('│');
    matchedRowDetails.forEach(row => {
      Logger.log('│   • Row ' + row.row + ': ' + row.pic + ' → ' + row.destination);
    });
    Logger.log('│');
    Logger.log('│ ❓ But why dialog shows "No Pending Approvals"?');
    Logger.log('│    → Possible bug in getHODApprovalData() function');
    Logger.log('│    → Check the data reading logic');
  } else {
    Logger.log('│ ❌ NO MATCHING ROWS FOUND');
    Logger.log('│');
    
    if (rowsWithYourEmail === 0) {
      Logger.log('│ 🔴 PROBLEM: No rows have your email in column Y');
      Logger.log('│    Your email: ' + userEmail);
      Logger.log('│');
      Logger.log('│ 💡 SOLUTION:');
      Logger.log('│    1. Check if array formula in column Y is working');
      Logger.log('│    2. Column Y should auto-populate based on PIC name');
      Logger.log('│    3. Or manually add your email to column Y');
    } else if (rowsWithCorrectStatus === 0) {
      Logger.log('│ 🟡 PROBLEM: No rows have status "Already sent propose email"');
      Logger.log('│');
      Logger.log('│ 💡 SOLUTION:');
      Logger.log('│    PIC needs to send proposal email first');
      Logger.log('│    Status will change from "Not Yet" to "Already sent propose email"');
    } else {
      Logger.log('│ 🟠 PROBLEM: Email and Status exist separately, but not together');
      Logger.log('│');
      
      if (yourEmailButWrongStatus.length > 0) {
        Logger.log('│ Rows with YOUR email but WRONG status:');
        yourEmailButWrongStatus.forEach(row => {
          Logger.log('│   • Row ' + row.row + ' (' + row.pic + '): Status = "' + row.status + '"');
        });
        Logger.log('│');
        Logger.log('│ 💡 SOLUTION: PIC needs to send proposal email first');
      }
      
      if (correctStatusButWrongEmail.length > 0) {
        Logger.log('│');
        Logger.log('│ Rows with CORRECT status but DIFFERENT email:');
        correctStatusButWrongEmail.forEach(row => {
          Logger.log('│   • Row ' + row.row + ' (' + row.pic + '): HOD = "' + row.emailHOD + '"');
        });
        Logger.log('│');
        Logger.log('│ 💡 This is normal - these trips belong to other HODs');
      }
    }
  }
  
  Logger.log('└──────────────────────────┘');
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
  Logger.log('END DEBUG');
  Logger.log('═══════════════════════════════════════');
}/**
 * Format date cho folder name
 * @param {Date|string} date - Date object hoặc date string
 * @returns {string} - Formatted date string (YYYYMMDD)
 */
function formatDateForFolder(date) {
  try {
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      // Parse date string (DD/MM/YYYY)
      const parts = date.split('/');
      if (parts.length === 3) {
        dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = new Date(date);
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  } catch (error) {
    Logger.log('Error formatting date for folder: ' + error.message);
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  }
}/**
 * 🔍 DEBUG FUNCTION - Kiểm tra email cho report
 * Chạy function này để kiểm tra tại sao không gửi được email
 */
function debugReportEmail() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    const userEmail = Session.getActiveUser().getEmail();
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('🔍 DEBUG REPORT EMAIL');
    Logger.log('═══════════════════════════════════════');
    Logger.log('Current user: ' + userEmail);
    Logger.log('');
    
    // Tìm rows của user với status Approved
    const lastRow = sheet.getLastRow();
    let approvedRows = [];
    
    for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
      const picEmail = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC)).getValue();
      const approvalStatus = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.APPROVAL_STATUS)).getValue();
      
      if (picEmail && picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        if (approvalStatus && approvalStatus.toString().trim() === 'Approved') {
          approvedRows.push(i);
        }
      }
    }
    
    Logger.log('📊 Found ' + approvedRows.length + ' approved trips for you');
    Logger.log('');
    
    if (approvedRows.length === 0) {
      Logger.log('❌ No approved trips found!');
      Logger.log('💡 Make sure you have at least one trip with status "Approved"');
      return;
    }
    
    // Kiểm tra từng row
    approvedRows.forEach(row => {
      Logger.log('─────────────────────────────────────');
      Logger.log('ROW ' + row);
      Logger.log('─────────────────────────────────────');
      
      const pic = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
      const destination = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION)).getValue();
      const hodEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD)).getValue();
      const directorEmail = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR)).getValue();
      const folderLink = sheet.getRange(row, columnLetterToIndex(CONFIG.COLUMNS.FOLDER_LINK)).getValue();
      
      Logger.log('PIC (Column D): "' + pic + '"');
      Logger.log('Destination: "' + destination + '"');
      Logger.log('Folder Link (Column P): ' + (folderLink ? '✅ OK' : '❌ EMPTY'));
      Logger.log('');
      Logger.log('📧 EMAIL CHECK:');
      Logger.log('  HOD Email (Column Y): "' + (hodEmail || 'EMPTY') + '"');
      Logger.log('  Director Email (Column Z): "' + (directorEmail || 'EMPTY') + '"');
      
      // Validation
      if (!hodEmail && !directorEmail) {
        Logger.log('');
        Logger.log('❌ PROBLEM: Both emails are EMPTY!');
        Logger.log('');
        Logger.log('💡 SOLUTION:');
        Logger.log('   1. Check if column Y and Z have ARRAYFORMULA');
        Logger.log('   2. Make sure PIC name in column D is exactly: "' + pic + '"');
        Logger.log('   3. Check Master sheet for email mapping');
      } else {
        Logger.log('  Status: ✅ At least one email found');
      }
      
      Logger.log('');
    });
    
    Logger.log('═══════════════════════════════════════');
    Logger.log('✅ DEBUG COMPLETED');
    Logger.log('═══════════════════════════════════════');
    
    // Show alert
    SpreadsheetApp.getUi().alert(
      'Debug Completed',
      'Please check View > Logs for detailed information.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
  }
}/**
 * ✅ HELPER FUNCTION MỚI: Parse date từ format dd/MM/yyyy
 * @param {string} dateStr - Date string in format dd/MM/yyyy
 * @returns {Date|null} - Date object hoặc null nếu parse lỗi
 */
function parseDateFromDDMMYYYY(dateStr) {
  if (!dateStr || dateStr === 'N/A') return null;
  
  try {
    // Kiểm tra nếu đã là Date object
    if (dateStr instanceof Date) return dateStr;
    
    // Parse string format dd/MM/yyyy
    const dateString = dateStr.toString().trim();
    const parts = dateString.split('/');
    
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      // Validate
      if (day > 0 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
        const date = new Date(year, month, day);
        Logger.log(`✅ Parsed date: ${dateString} => ${date.toDateString()}`);
        return date;
      }
    }
    
    // Fallback: try standard Date parsing
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate;
    }
    
    Logger.log(`⚠️ Could not parse date: ${dateStr}`);
    return null;
    
  } catch (error) {
    Logger.log(`❌ Error parsing date "${dateStr}": ${error.message}`);
    return null;
  }
}/**
 * ✅ FUNCTION MỚI: Lấy tên HOD từ email
 * Map email HOD sang tên để dùng trong greeting
 * @param {string} hodEmail - Email của HOD
 * @returns {string} - Tên HOD hoặc null nếu là Ha (Director)
 */
function getHODNameFromEmail(hodEmail) {
  if (!hodEmail || hodEmail.trim() === '') {
    return null;
  }
  
  const email = hodEmail.toString().toLowerCase().trim();
  
  // ✅ MAPPING EMAIL → TÊN HOD
  const hodMapping = {
    'nt.ha@manimedicalhanoi.com': null,           // Ha là Director, không thêm vào greeting
    'tt.tuyen@manimedicalhanoi.com': 'Tuyen',     // HOD Tuyen
    'vtt.hoa@manimedicalhanoi.com': 'Hoa'         // HOD Hoa
  };
  
  // Kiểm tra trong mapping
  if (hodMapping.hasOwnProperty(email)) {
    return hodMapping[email];
  }
  
  // Fallback: Tách tên từ email nếu không có trong mapping
  // Ví dụ: abc.xyz@domain.com → "Xyz"
  try {
    const username = email.split('@')[0]; // "tt.tuyen"
    const parts = username.split('.');    // ["tt", "tuyen"]
    if (parts.length > 1) {
      const name = parts[parts.length - 1]; // "tuyen"
      return name.charAt(0).toUpperCase() + name.slice(1); // "Tuyen"
    }
  } catch (e) {
    Logger.log('Error parsing HOD name from email: ' + e.message);
  }
  
  return null;
}/**
 * ✅ FUNCTION MỚI: Tạo greeting động cho email proposal
 * Luôn có "Dear Ha-san," (Director)
 * Thêm "Dear [HOD name]-san," nếu HOD không phải là Ha
 * @param {string} hodEmail - Email của HOD
 * @returns {string} - Greeting hoàn chỉnh
 */
function buildProposalGreeting(hodEmail) {
  // ✅ Luôn có Ha-san (Director)
  let greeting = 'Dear Ha-san';
  
  // ✅ Kiểm tra xem có cần thêm HOD không
  const hodName = getHODNameFromEmail(hodEmail);
  
  if (hodName && hodName !== '') {
    // Thêm HOD name vào greeting
    greeting += ',<br/>Dear ' + hodName + '-san';
  }
  
  return greeting;
}// ===========================
// USER GUIDE DIALOGS
// ===========================

/**
 * Hiển thị hướng dẫn sử dụng cho PIC
 * Dialog với 2 tabs: Tiếng Việt và English
 */
function showPICUserGuide() {
  try {
    const htmlContent = getHTMLContentPICGuide();
    const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'User Guide for PIC - Hướng dẫn sử dụng cho PIC');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    Logger.log('Error in showPICUserGuide: ' + error.message);
  }
}

/**
 * Tạo HTML content cho PIC User Guide
 * @returns {string} - HTML content
 */
/**
 * Tạo HTML content cho PIC User Guide
 * ✅ CẬP NHẬT: Theo user guide mới - nhấn mạnh PIC tự điền thông tin
 * @returns {string} - HTML content
 */
function getHTMLContentPICGuide() {
  const userEmail = Session.getActiveUser().getEmail();
  const picName = getPICNameFromEmail(userEmail);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    body { 
      font-family: Calibri, sans-serif;
      background: white;
      padding: 20px;
      font-size: 16px;
      line-height: 1.6;
    }
    
    .header {
      background: #4A90E2;
      color: white;
      padding: 20px;
      border: 3px solid #000;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 16px;
      margin: 5px 0;
    }
    
    .tabs {
      display: flex;
      border-bottom: 3px solid #000;
      margin-bottom: 20px;
    }
    
    .tab-button {
      flex: 1;
      padding: 15px;
      background: white;
      border: 3px solid #000;
      border-bottom: none;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      transition: all 0.2s;
    }
    
    .tab-button.active {
      background: #4A90E2;
      color: white;
    }
    
    .tab-button:hover:not(.active) {
      background: #f0f0f0;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .section {
      margin-bottom: 30px;
      padding: 20px;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    
    .section h2 {
      color: #4A90E2;
      font-size: 22px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #4A90E2;
    }
    
    .step {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-left: 4px solid #4A90E2;
      border-radius: 4px;
    }
    
    .step-number {
      display: inline-block;
      width: 30px;
      height: 30px;
      background: #4A90E2;
      color: white;
      text-align: center;
      line-height: 30px;
      border-radius: 50%;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .highlight {
      background: #fff3cd;
      padding: 15px;
      border-left: 4px solid #ffc107;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .warning {
      background: #f8d7da;
      padding: 15px;
      border-left: 4px solid #dc3545;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .success {
      background: #d4edda;
      padding: 15px;
      border-left: 4px solid #28a745;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .info-box {
      background: #e3f2fd;
      padding: 15px;
      border-left: 4px solid #2196F3;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    
    ul, ol {
      margin-left: 25px;
      margin-top: 10px;
    }
    
    li {
      margin: 8px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    
    th {
      background: #4A90E2;
      color: white;
      font-weight: bold;
    }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
    }
    
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-approved {
      background: #d4edda;
      color: #155724;
    }
    
    .status-rejected {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📘 BUSINESS TRIP MANAGEMENT SYSTEM</h1>
    <p><strong>User Guide for Staff/PIC</strong></p>
    <p>Hướng dẫn sử dụng dành cho nhân viên</p>
    <p style="margin-top: 10px;">User: <strong>${picName}</strong> (${userEmail})</p>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <button class="tab-button active" onclick="switchTab(event, 'vietnamese')">🇻🇳 Tiếng Việt</button>
    <button class="tab-button" onclick="switchTab(event, 'english')">🇬🇧 English</button>
  </div>

  <!-- VIETNAMESE TAB -->
  <div id="vietnamese" class="tab-content active">
    
    <!-- SECTION 1: GIỚI THIỆU HỆ THỐNG -->
    <div class="section">
      <h2>1. HỆ THỐNG HỖ TRỢ NHỮNG GÌ?</h2>
      <div class="success">
        <p><strong>✅ Hệ thống tự động giúp bạn:</strong></p>
        <ul style="margin-top: 10px;">
          <li>Gửi đề xuất công tác & Phê duyệt chỉ với 1 click</li>
          <li>Tự động tạo thư mục Google Drive cho tài liệu công tác</li>
          <li>Tự động tạo file báo cáo trong thư mục trên</li>
          <li>Theo dõi trạng thái phê duyệt theo thời gian thực</li>
          <li>Nhận thông báo email ở mọi giai đoạn</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 2: BƯỚC 1 - TRUY CẬP HỆ THỐNG -->
    <div class="section">
      <h2>BƯỚC 1: TRUY CẬP HỆ THỐNG</h2>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Mở Google Sheet</strong>
        <p style="margin-top: 8px;">
          Mở file: <code>"MMH Travel report"</code> (link sẽ được chia sẻ)
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Đăng nhập</strong>
        <p style="margin-top: 8px;">
          Đăng nhập bằng email công ty của bạn
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Cấp quyền (chỉ lần đầu tiên)</strong>
        <ul style="margin-top: 8px;">
          <li>Click <code>"Continue"</code> → Chọn email của bạn</li>
          <li>Click <code>"Advanced"</code> → <code>"Go to project"</code> → <code>"Allow"</code></li>
        </ul>
      </div>
    </div>

    <!-- SECTION 3: BƯỚC 2 - TẠO ĐỀ XUẤT CÔNG TÁC -->
    <div class="section">
      <h2>BƯỚC 2: TẠO ĐỀ XUẤT CÔNG TÁC ĐẦU TIÊN (QUAN TRỌNG!)</h2>
      
      <div class="warning">
        <p><strong>⚠️ LƯU Ý QUAN TRỌNG:</strong></p>
        <p style="margin-top: 8px;">
          <strong>BẠN PHẢI TỰ ĐIỀN ĐẦY ĐỦ THÔNG TIN VÀO SHEET TRƯỚC</strong> khi sử dụng hộp thoại để gửi đề xuất!
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Điền thông tin công tác vào Sheet</strong>
        <p style="margin-top: 8px;">Mở sheet và điền <strong>TẤT CẢ</strong> các thông tin sau:</p>
        <ul style="margin-top: 8px;">
          <li><strong>Start Date (Cột E)</strong>: Ngày bắt đầu công tác</li>
          <li><strong>Finish Date (Cột F)</strong>: Ngày kết thúc công tác</li>
          <li><strong>Destination (Cột H)</strong>: Địa điểm công tác</li>
          <li><strong>Co-Traveler (Cột I)</strong>: Người đi cùng (nếu có)</li>
          <li><strong>Purpose (Cột J)</strong>: Mục đích công tác</li>
          <li><strong>Expected Result (Cột K)</strong>: Kết quả mong đợi</li>
          <li><strong>Estimated Cost (Cột L)</strong>: Chi phí dự kiến</li>
          <li><strong>Total Cost (Cột M)</strong>: Tổng chi phí</li>
          <li><strong>Schedule (Cột N)</strong>: Lịch trình chi tiết</li>
        </ul>
      </div>
      
      <div class="highlight">
        <p><strong>💡 Lưu ý:</strong></p>
        <ul style="margin-top: 8px;">
          <li>Các thông tin khác sẽ được tự động điền bởi công thức</li>
          <li><strong>KHÔNG</strong> nhập dữ liệu vào các cột có công thức</li>
          <li>Hệ thống sẽ tự động tạo folder name, tính working days, etc.</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Mở Dialog Proposal</strong>
        <p style="margin-top: 8px;">
          Vào menu: <code>PIC Menu</code> → <code>Business Trip Plan & Report</code> → Tab <code>"Plan"</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Chọn chuyến công tác</strong>
        <p style="margin-top: 8px;">
          Click <code>"Select"</code> để chọn chuyến công tác bạn muốn đề xuất
        </p>
        <p style="margin-top: 5px;">
          (Hệ thống đã tự động chọn chuyến mới nhất của bạn)
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Kiểm tra checkbox</strong>
        <p style="margin-top: 8px;">
          Đảm bảo checkbox <code>"Send Proposal Email"</code> đã được tick
        </p>
        <p style="margin-top: 5px;">
          (Hệ thống đã tự động tick cho chuyến mới nhất)
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">5</span>
        <strong>Gửi đề xuất</strong>
        <p style="margin-top: 8px;">
          Click <code>"Save change"</code> → Email sẽ được gửi đến HOD & Director
        </p>
        <p style="margin-top: 5px;">
          Hệ thống sẽ <strong>tự động tạo thư mục Drive</strong> cho chuyến công tác của bạn
        </p>
      </div>
    </div>

    <!-- SECTION 4: BƯỚC 3 - THEO DÕI PHÊ DUYỆT -->
    <div class="section">
      <h2>BƯỚC 3: THEO DÕI TRẠNG THÁI PHÊ DUYỆT</h2>
      
      <div class="info-box">
        <p><strong>📊 Kiểm tra trạng thái tại cột <code>Approval Status (R)</code>:</strong></p>
        <table style="margin-top: 10px;">
          <tr>
            <th>Trạng thái</th>
            <th>Ý nghĩa</th>
          </tr>
          <tr>
            <td><span class="status-badge status-pending">Already sent propose email</span></td>
            <td>Đang chờ HOD xem xét</td>
          </tr>
          <tr>
            <td><span class="status-badge status-approved">Approved</span></td>
            <td>Đã được phê duyệt, sẵn sàng đi công tác</td>
          </tr>
          <tr>
            <td><span class="status-badge status-rejected">Rejected</span></td>
            <td>Bị từ chối, xem Manager Comment (cột S)</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- SECTION 5: BƯỚC 4 - NỘP BÁO CÁO SAU CÔNG TÁC -->
    <div class="section">
      <h2>BƯỚC 4: NỘP BÁO CÁO SAU CÔNG TÁC</h2>
      
      <div class="warning">
        <p><strong>⏰ DEADLINE: Trong vòng 3 ngày sau khi kết thúc công tác</strong></p>
      </div>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Mở Dialog Report</strong>
        <p style="margin-top: 8px;">
          Vào: <code>PIC Menu</code> → <code>Business Trip Plan & Report</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Chọn tab Report</strong>
        <p style="margin-top: 8px;">
          Chuyển sang tab <code>"Report"</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Chọn chuyến công tác cần báo cáo</strong>
        <p style="margin-top: 8px;">
          Select business trip bạn muốn báo cáo
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Điền nội dung báo cáo</strong>
        <ul style="margin-top: 8px;">
          <li><strong>Key Activities</strong>: Các hoạt động chính đã thực hiện</li>
          <li><strong>Key Findings</strong>: Phát hiện/kết quả quan trọng</li>
          <li><strong>Follow Up Actions</strong>: Hành động tiếp theo cần làm</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">5</span>
        <strong>Tạo báo cáo tự động</strong>
        <p style="margin-top: 8px;">
          Click <code>"Generate Report"</code> → Hệ thống sẽ:
        </p>
        <ul style="margin-top: 8px;">
          <li>Tự động điền báo cáo vào cột <code>"Report Result" (Q)</code></li>
          <li>Tự động tạo file báo cáo trong thư mục Drive đã tạo trước đó</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">6</span>
        <strong>Gửi email báo cáo (Tùy chọn)</strong>
        <p style="margin-top: 8px;">
          Nếu click <code>"Send Report Email"</code>, email sẽ được gửi đến HOD và Director
        </p>
      </div>
    </div>

    <!-- SECTION 6: TÍNH NĂNG CHÍNH -->
    <div class="section">
      <h2>TÍNH NĂNG CHÍNH CỦA HỆ THỐNG</h2>
      
      <div class="step">
        <strong>1. Tự động tạo Folder & Files</strong>
        <ul style="margin-top: 8px;">
          <li>Format tên thư mục: <code>YYYY-MM-DD_PIC_Destination</code></li>
          <li>Lưu trữ trong Drive công ty</li>
          <li>Tự động tạo file báo cáo trong thư mục</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>2. Thông báo Email tự động</strong>
        <ul style="margin-top: 8px;">
          <li>Gửi đề xuất → HOD & Director nhận thông báo</li>
          <li>Approved/Rejected → PIC nhận thông báo</li>
          <li>Nộp báo cáo → HOD & Director nhận báo cáo</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>3. Theo dõi Deadline</strong>
        <ul style="margin-top: 8px;">
          <li>Hệ thống tự động tính deadline 3 ngày sau công tác</li>
          <li>Tự động check: <code>"On time"</code> hoặc <code>"Late"</code></li>
          <li>Hiển thị số ngày còn lại trong cột <code>"Remain"</code></li>
        </ul>
      </div>
      
      <div class="step">
        <strong>4. Kiểm soát hoàn chỉnh</strong>
        <ul style="margin-top: 8px;">
          <li>Tất cả thay đổi được theo dõi</li>
          <li>Manager comment được lưu trữ</li>
          <li>Lịch sử email được duy trì</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 7: LƯU Ý QUAN TRỌNG -->
    <div class="section">
      <h2>⚠️ LƯU Ý QUAN TRỌNG</h2>
      
      <div class="warning">
        <ol>
          <li><strong>LUÔN điền đầy đủ thông tin vào Sheet TRƯỚC khi gửi proposal</strong></li>
          <li>Không nhập dữ liệu vào các cột có công thức tự động</li>
          <li>Kiểm tra kỹ thông tin trước khi click "Save change"</li>
          <li>Nộp báo cáo trong vòng 3 ngày sau khi kết thúc công tác</li>
          <li>Kiểm tra email thường xuyên để nhận thông báo phê duyệt</li>
        </ol>
      </div>
    </div>

    <!-- SECTION 8: HỖ TRỢ -->
    <div class="section">
      <h2>CẦN HỖ TRỢ?</h2>
      <div class="info-box">
        <p>Nếu gặp vấn đề khi sử dụng hệ thống, vui lòng liên hệ:</p>
        <ul style="margin-top: 8px;">
          <li>Email: <code>mmh.product@manimedicalthanoi.com</code></li>
          <li>Hoặc liên hệ IT Support</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ENGLISH TAB -->
  <div id="english" class="tab-content">
    
    <!-- SECTION 1: SYSTEM INTRODUCTION -->
    <div class="section">
      <h2>1. WHAT DOES THIS SYSTEM HELP YOU WITH?</h2>
      <div class="success">
        <p><strong>✅ This automated system helps you:</strong></p>
        <ul style="margin-top: 10px;">
          <li>Submit business trip proposals & Approvals by one click</li>
          <li>Auto-create Google Drive folders for trip documentation</li>
          <li>Auto-create report files in folders above</li>
          <li>Track approval status in real-time</li>
          <li>Receive email notifications at every stage</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 2: STEP 1 - ACCESS THE SYSTEM -->
    <div class="section">
      <h2>STEP 1: ACCESS THE SYSTEM</h2>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Open Google Sheet</strong>
        <p style="margin-top: 8px;">
          Open: <code>"MMH Travel report"</code> (link will be shared)
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Login</strong>
        <p style="margin-top: 8px;">
          Login with your company email
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Grant permissions (first time only)</strong>
        <ul style="margin-top: 8px;">
          <li>Click <code>"Continue"</code> → Select your email</li>
          <li>Click <code>"Advanced"</code> → <code>"Go to project"</code> → <code>"Allow"</code></li>
        </ul>
      </div>
    </div>

    <!-- SECTION 3: STEP 2 - CREATE YOUR FIRST PROPOSAL -->
    <div class="section">
      <h2>STEP 2: CREATE YOUR FIRST PROPOSAL (IMPORTANT!)</h2>
      
      <div class="warning">
        <p><strong>⚠️ CRITICAL NOTE:</strong></p>
        <p style="margin-top: 8px;">
          <strong>YOU MUST FILL IN ALL INFORMATION IN THE SHEET FIRST</strong> before using the dialog to send proposal!
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Fill in trip details in Sheet</strong>
        <p style="margin-top: 8px;">Open the sheet and fill in <strong>ALL</strong> the following information:</p>
        <ul style="margin-top: 8px;">
          <li><strong>Start Date (Column E)</strong>: Trip start date</li>
          <li><strong>Finish Date (Column F)</strong>: Trip end date</li>
          <li><strong>Destination (Column H)</strong>: Travel destination</li>
          <li><strong>Co-Traveler (Column I)</strong>: Travel companion (if any)</li>
          <li><strong>Purpose (Column J)</strong>: Trip purpose</li>
          <li><strong>Expected Result (Column K)</strong>: Expected outcomes</li>
          <li><strong>Estimated Cost (Column L)</strong>: Estimated budget</li>
          <li><strong>Total Cost (Column M)</strong>: Total cost</li>
          <li><strong>Schedule (Column N)</strong>: Detailed schedule</li>
        </ul>
      </div>
      
      <div class="highlight">
        <p><strong>💡 Note:</strong></p>
        <ul style="margin-top: 8px;">
          <li>All other information will be filled in automatically by the formula</li>
          <li><strong>DO NOT</strong> enter any additional data into columns with formulas</li>
          <li>System will auto-create folder name, calculate working days, etc.</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Open Proposal Dialog</strong>
        <p style="margin-top: 8px;">
          Go to menu: <code>PIC Menu</code> → <code>Business Trip Plan & Report</code> → Tab <code>"Plan"</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Select business trip</strong>
        <p style="margin-top: 8px;">
          Click <code>"Select"</code> to choose the business trip you want to propose
        </p>
        <p style="margin-top: 5px;">
          (System has automatically selected the newest trip)
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Check the box</strong>
        <p style="margin-top: 8px;">
          Ensure <code>"Send Proposal Email"</code> checkbox is ticked
        </p>
        <p style="margin-top: 5px;">
          (System has automatically checked the newest trip)
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">5</span>
        <strong>Send proposal</strong>
        <p style="margin-top: 8px;">
          Click <code>"Save change"</code> → Email will be sent to HOD & Director
        </p>
        <p style="margin-top: 5px;">
          System will <strong>auto-create Drive folder</strong> for your trip
        </p>
      </div>
    </div>

    <!-- SECTION 4: STEP 3 - TRACK APPROVAL -->
    <div class="section">
      <h2>STEP 3: TRACK APPROVAL STATUS</h2>
      
      <div class="info-box">
        <p><strong>📊 Check status in column <code>Approval Status (R)</code>:</strong></p>
        <table style="margin-top: 10px;">
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
          <tr>
            <td><span class="status-badge status-pending">Already sent propose email</span></td>
            <td>Waiting for HOD review</td>
          </tr>
          <tr>
            <td><span class="status-badge status-approved">Approved</span></td>
            <td>Approved, ready to travel</td>
          </tr>
          <tr>
            <td><span class="status-badge status-rejected">Rejected</span></td>
            <td>Rejected, check Manager Comment (column S)</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- SECTION 5: STEP 4 - SUBMIT REPORT -->
    <div class="section">
      <h2>STEP 4: SUBMIT REPORT AFTER TRIP</h2>
      
      <div class="warning">
        <p><strong>⏰ DEADLINE: Within 3 days after trip ends</strong></p>
      </div>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Open Report Dialog</strong>
        <p style="margin-top: 8px;">
          Go to: <code>PIC Menu</code> → <code>Business Trip Plan & Report</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Choose Report tab</strong>
        <p style="margin-top: 8px;">
          Switch to <code>"Report"</code> tab
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Select business trip to report</strong>
        <p style="margin-top: 8px;">
          Select the business trip you want to report
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Fill in report content</strong>
        <ul style="margin-top: 8px;">
          <li><strong>Key Activities</strong>: Main activities performed</li>
          <li><strong>Key Findings</strong>: Important discoveries/results</li>
          <li><strong>Follow Up Actions</strong>: Next actions needed</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">5</span>
        <strong>Generate automatic report</strong>
        <p style="margin-top: 8px;">
          Click <code>"Generate Report"</code> → System will:
        </p>
        <ul style="margin-top: 8px;">
          <li>Auto-fill report in column <code>"Report Result" (Q)</code></li>
          <li>Auto-create report file in previously created Drive folder</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">6</span>
        <strong>Send report email (Optional)</strong>
        <p style="margin-top: 8px;">
          If you click <code>"Send Report Email"</code>, email will be sent to HOD and Director
        </p>
      </div>
    </div>

    <!-- SECTION 6: KEY FEATURES -->
    <div class="section">
      <h2>KEY FEATURES</h2>
      
      <div class="step">
        <strong>1. Auto Folder & Files Creation</strong>
        <ul style="margin-top: 8px;">
          <li>Folder format: <code>YYYY-MM-DD_PIC_Destination</code></li>
          <li>Stored in company Drive</li>
          <li>Auto-create report file in folder</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>2. Email Notifications</strong>
        <ul style="margin-top: 8px;">
          <li>Proposal sent → HOD & Director notified</li>
          <li>Approved/Rejected → PIC notified</li>
          <li>Report submitted → HOD & Director receive report</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>3. Deadline Tracking</strong>
        <ul style="margin-top: 8px;">
          <li>System calculates 3-day deadline after trip</li>
          <li>Auto-checks: <code>"On time"</code> or <code>"Late"</code></li>
          <li>Shows remaining days in <code>"Remain"</code> column</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>4. Complete Audit Trail</strong>
        <ul style="margin-top: 8px;">
          <li>All changes tracked</li>
          <li>Manager comments saved</li>
          <li>Email history maintained</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 7: IMPORTANT NOTES -->
    <div class="section">
      <h2>⚠️ IMPORTANT NOTES</h2>
      
      <div class="warning">
        <ol>
          <li><strong>ALWAYS fill in all information in Sheet BEFORE sending proposal</strong></li>
          <li>Do not enter data into columns with automatic formulas</li>
          <li>Double-check information before clicking "Save change"</li>
          <li>Submit report within 3 days after trip ends</li>
          <li>Check email regularly for approval notifications</li>
        </ol>
      </div>
    </div>

    <!-- SECTION 8: SUPPORT -->
    <div class="section">
      <h2>NEED SUPPORT?</h2>
      <div class="info-box">
        <p>If you encounter any issues using the system, please contact:</p>
        <ul style="margin-top: 8px;">
          <li>Email: <code>mmh.product@manimedicalthanoi.com</code></li>
          <li>Or contact IT Support</li>
        </ul>
      </div>
    </div>
  </div>

<script>
  function switchTab(event, tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].classList.remove('active');
    }
    
    // Remove active class from all buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
      tabButtons[i].classList.remove('active');
    }
    
    // Show the selected tab and mark button as active
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
  }
</script>

</body>
</html>
  `;
}/**
 * Hiển thị hướng dẫn sử dụng cho HOD
 * Dialog với 2 tabs: Tiếng Việt và English
 */
function showHODUserGuide() {
  try {
    const htmlContent = getHTMLContentHODGuide();
    const html = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(1200)
      .setHeight(800);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'User Guide for HOD - Hướng dẫn sử dụng cho HOD');
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
    Logger.log('Error in showHODUserGuide: ' + error.message);
  }
}

/**
 * Tạo HTML content cho HOD User Guide
 * @returns {string} - HTML content
 */
function getHTMLContentHODGuide() {
  const userEmail = Session.getActiveUser().getEmail();
  const hodName = getNameFromEmail(userEmail);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    body { 
      font-family: Calibri, sans-serif;
      background: white;
      padding: 20px;
      font-size: 16px;
      line-height: 1.6;
    }
    
    .header {
      background: #E74C3C;
      color: white;
      padding: 20px;
      border: 3px solid #000;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .header p {
      font-size: 16px;
      margin: 5px 0;
    }
    
    .tabs {
      display: flex;
      border-bottom: 3px solid #000;
      margin-bottom: 20px;
    }
    
    .tab-button {
      flex: 1;
      padding: 15px;
      background: white;
      border: 3px solid #000;
      border-bottom: none;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      font-family: Calibri, sans-serif;
      transition: all 0.2s;
    }
    
    .tab-button.active {
      background: #E74C3C;
      color: white;
    }
    
    .tab-button:hover:not(.active) {
      background: #f0f0f0;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .section {
      margin-bottom: 30px;
      padding: 20px;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }
    
    .section h2 {
      color: #E74C3C;
      font-size: 22px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #E74C3C;
    }
    
    .step {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-left: 4px solid #E74C3C;
      border-radius: 4px;
    }
    
    .step-number {
      display: inline-block;
      width: 30px;
      height: 30px;
      background: #E74C3C;
      color: white;
      text-align: center;
      line-height: 30px;
      border-radius: 50%;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .highlight {
      background: #fff3cd;
      padding: 15px;
      border-left: 4px solid #ffc107;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .warning {
      background: #f8d7da;
      padding: 15px;
      border-left: 4px solid #dc3545;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .success {
      background: #d4edda;
      padding: 15px;
      border-left: 4px solid #28a745;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    .info-box {
      background: #e3f2fd;
      padding: 15px;
      border-left: 4px solid #2196F3;
      margin: 15px 0;
      border-radius: 4px;
    }
    
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    
    ul, ol {
      margin-left: 25px;
      margin-top: 10px;
    }
    
    li {
      margin: 8px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    
    th {
      background: #E74C3C;
      color: white;
      font-weight: bold;
    }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
    }
    
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-approved {
      background: #d4edda;
      color: #155724;
    }
    
    .status-rejected {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📘 BUSINESS TRIP MANAGEMENT SYSTEM</h1>
    <p><strong>User Guide for HOD/Managers</strong></p>
    <p>Hướng dẫn sử dụng dành cho Quản lý</p>
    <p style="margin-top: 10px;">User: <strong>${hodName}</strong> (${userEmail})</p>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <button class="tab-button active" onclick="switchTab(event, 'vietnamese')">🇻🇳 Tiếng Việt</button>
    <button class="tab-button" onclick="switchTab(event, 'english')">🇬🇧 English</button>
  </div>

  <!-- VIETNAMESE TAB -->
  <div id="vietnamese" class="tab-content active">
    
    <!-- SECTION 1: VAI TRÒ VÀ QUYỀN HẠN -->
    <div class="section">
      <h2>1. AI CÓ THỂ SỬ DỤNG HỆ THỐNG?</h2>
      
      <div class="success">
        <p><strong>✅ HOD/Manager (HOD Menu):</strong></p>
        <ul style="margin-top: 10px;">
          <li>Xem xét và phê duyệt/từ chối đề xuất công tác</li>
          <li>Xem dashboard công tác của team</li>
          <li>Thêm comment và feedback</li>
        </ul>
      </div>
      
      <div class="info-box">
        <p><strong>💡 Lưu ý về Director (Mrs. Ha):</strong></p>
        <p style="margin-top: 8px;">
          Mrs. Ha có cả quyền PIC và HOD, có thể:
        </p>
        <ul style="margin-top: 8px;">
          <li>Tạo đề xuất công tác như PIC</li>
          <li>Phê duyệt đề xuất như HOD</li>
          <li>Truy cập toàn bộ chức năng của hệ thống</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 2: TRUY CẬP HỆ THỐNG -->
    <div class="section">
      <h2>2. TRUY CẬP HỆ THỐNG</h2>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Đăng nhập Google Account</strong>
        <p style="margin-top: 8px;">
          Đăng nhập bằng email HOD của bạn: <code>${userEmail}</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Truy cập Google Sheet</strong>
        <p style="margin-top: 8px;">
          Mở file Google Sheet: <strong>"MMH Travel report"</strong><br/>
          Bạn sẽ thấy <strong>menu "HOD Menu"</strong> xuất hiện
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Cấp quyền (lần đầu tiên)</strong>
        <p style="margin-top: 8px;">
          Khi sử dụng menu lần đầu, làm theo hướng dẫn cấp quyền tương tự như PIC
        </p>
      </div>
      
      <div class="highlight">
        <p><strong>💡 Lưu ý:</strong></p>
        <p style="margin-top: 8px;">
          Menu HOD chỉ xuất hiện cho các email được config là HOD trong hệ thống.
        </p>
      </div>
    </div>

    <!-- SECTION 3: PHÊ DUYỆT ĐỀ XUẤT CÔNG TÁC -->
    <div class="section">
      <h2>3. PHÊ DUYỆT ĐỀ XUẤT CÔNG TÁC</h2>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Mở Dashboard Phê Duyệt</strong>
        <p style="margin-top: 8px;">
          Vào menu: <code>HOD Menu</code> → <code>Business Trip Approval</code>
        </p>
        <p style="margin-top: 5px;">
          Dashboard sẽ hiển thị <strong>TẤT CẢ</strong> các đề xuất công tác của team bạn với đầy đủ thông tin
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Xem xét đề xuất đang chờ</strong>
        <p style="margin-top: 8px;">
          Review các proposal có status: <span class="status-badge status-pending">Already sent propose email</span>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Chọn chuyến công tác cần phê duyệt</strong>
        <p style="margin-top: 8px;">
          Click <code>"Select"</code> trên chuyến công tác bạn muốn phê duyệt
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Thay đổi trạng thái phê duyệt</strong>
        <p style="margin-top: 8px;">Chọn <code>"Approval Decision"</code>:</p>
        <ul style="margin-top: 8px;">
          <li><strong>"Approved"</strong> → Phê duyệt và thông báo cho PIC</li>
          <li><strong>"Rejected"</strong> → Từ chối với comment giải thích</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">5</span>
        <strong>Thêm comment (nếu cần)</strong>
        <p style="margin-top: 8px;">
          Điền vào ô <code>"Manager Comment"</code> để:
        </p>
        <ul style="margin-top: 8px;">
          <li>Giải thích lý do từ chối</li>
          <li>Đưa ra gợi ý/yêu cầu bổ sung</li>
          <li>Lưu ý cho PIC về chuyến công tác</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">6</span>
        <strong>Xử lý phê duyệt</strong>
        <p style="margin-top: 8px;">
          Click <code>"Process Selected Trips"</code>
        </p>
        <p style="margin-top: 5px;">
          → Hệ thống sẽ tự động gửi email thông báo đến PIC
        </p>
      </div>
    </div>

    <!-- SECTION 4: XEM BÁO CÁO -->
    <div class="section">
      <h2>4. XEM BÁO CÁO SAU CÔNG TÁC</h2>
      
      <div class="info-box">
        <p><strong>📊 Dashboard HOD có 2 tabs:</strong></p>
        <ul style="margin-top: 10px;">
          <li><strong>Approval</strong>: Phê duyệt đề xuất mới</li>
          <li><strong>View Reports</strong>: Xem báo cáo đã hoàn thành</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Chuyển sang tab View Reports</strong>
        <p style="margin-top: 8px;">
          Trong dialog HOD Approval, click tab <code>"View Reports"</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Xem danh sách báo cáo</strong>
        <p style="margin-top: 8px;">
          Hiển thị tất cả chuyến công tác đã hoàn thành của team
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Kiểm tra chi tiết báo cáo</strong>
        <p style="margin-top: 8px;">
          Click vào folder link để xem file báo cáo chi tiết trong Drive
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Kiểm tra deadline</strong>
        <p style="margin-top: 8px;">
          Xem cột <code>"Check Deadline"</code> để biết báo cáo nộp:
        </p>
        <ul style="margin-top: 8px;">
          <li><span class="status-badge status-approved">On time</span> - Đúng hạn</li>
          <li><span class="status-badge status-rejected">Late</span> - Trễ hạn</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 5: TÍNH NĂNG CHÍNH -->
    <div class="section">
      <h2>5. TÍNH NĂNG CHÍNH CHO HOD</h2>
      
      <div class="step">
        <strong>1. Dashboard Tổng quan</strong>
        <ul style="margin-top: 8px;">
          <li>Xem tất cả chuyến công tác của team</li>
          <li>Filter theo status, tháng, PIC</li>
          <li>Thống kê tổng quan (số đề xuất, đã duyệt, từ chối)</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>2. Phê duyệt nhanh</strong>
        <ul style="margin-top: 8px;">
          <li>Approve/Reject chỉ với vài clicks</li>
          <li>Thêm comment trực tiếp trong dialog</li>
          <li>Email tự động gửi đến PIC</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>3. Theo dõi Deadline</strong>
        <ul style="margin-top: 8px;">
          <li>Xem các báo cáo nộp đúng/trễ hạn</li>
          <li>Số ngày còn lại trước deadline</li>
          <li>Cảnh báo tự động cho báo cáo trễ</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>4. Truy vết hoàn chỉnh</strong>
        <ul style="margin-top: 8px;">
          <li>Lịch sử tất cả thay đổi</li>
          <li>Comment được lưu trữ</li>
          <li>Email history đầy đủ</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 6: LƯU Ý QUAN TRỌNG -->
    <div class="section">
      <h2>⚠️ LƯU Ý QUAN TRỌNG</h2>
      
      <div class="warning">
        <ol>
          <li><strong>Kiểm tra email thường xuyên</strong> để nhận thông báo đề xuất mới</li>
          <li><strong>Xem xét kỹ thông tin</strong> trước khi phê duyệt</li>
          <li><strong>Thêm comment rõ ràng</strong> khi từ chối để PIC hiểu và chỉnh sửa</li>
          <li><strong>Phê duyệt kịp thời</strong> để không ảnh hưởng kế hoạch công tác</li>
          <li><strong>Theo dõi deadline báo cáo</strong> của team thường xuyên</li>
        </ol>
      </div>
    </div>

    <!-- SECTION 7: HỖ TRỢ -->
    <div class="section">
      <h2>CẦN HỖ TRỢ?</h2>
      <div class="info-box">
        <p>Nếu gặp vấn đề khi sử dụng hệ thống, vui lòng liên hệ:</p>
        <ul style="margin-top: 8px;">
          <li>Email: <code>mmh.product@manimedicalthanoi.com</code></li>
          <li>Hoặc liên hệ IT Support</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- ENGLISH TAB -->
  <div id="english" class="tab-content">
    
    <!-- SECTION 1: ROLES AND PERMISSIONS -->
    <div class="section">
      <h2>1. WHO CAN USE THIS SYSTEM?</h2>
      
      <div class="success">
        <p><strong>✅ HOD/Manager (HOD Menu):</strong></p>
        <ul style="margin-top: 10px;">
          <li>Review and approve/reject trip proposals</li>
          <li>View team trip dashboard</li>
          <li>Add comments and feedback</li>
        </ul>
      </div>
      
      <div class="info-box">
        <p><strong>💡 Note about Director (Mrs. Ha):</strong></p>
        <p style="margin-top: 8px;">
          Mrs. Ha has both PIC and HOD access, can:
        </p>
        <ul style="margin-top: 8px;">
          <li>Create trip proposals as PIC</li>
          <li>Approve proposals as HOD</li>
          <li>Access all system functions</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 2: ACCESS THE SYSTEM -->
    <div class="section">
      <h2>2. ACCESS THE SYSTEM</h2>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Login Google Account</strong>
        <p style="margin-top: 8px;">
          Login with your HOD email: <code>${userEmail}</code>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Access Google Sheet</strong>
        <p style="margin-top: 8px;">
          Open: <strong>"MMH Travel report"</strong><br/>
          You will see <strong>"HOD Menu"</strong> appear
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Grant permissions (first time)</strong>
        <p style="margin-top: 8px;">
          When using menu for the first time, follow the same permission steps as PIC
        </p>
      </div>
      
      <div class="highlight">
        <p><strong>💡 Note:</strong></p>
        <p style="margin-top: 8px;">
          HOD Menu only appears for emails configured as HOD in the system.
        </p>
      </div>
    </div>

    <!-- SECTION 3: APPROVE PROPOSALS -->
    <div class="section">
      <h2>3. APPROVE PROPOSALS</h2>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Open Approval Dashboard</strong>
        <p style="margin-top: 8px;">
          Go to menu: <code>HOD Menu</code> → <code>Business Trip Approval</code>
        </p>
        <p style="margin-top: 5px;">
          Dashboard displays <strong>ALL</strong> your team's trip proposals with full information
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>Review pending proposals</strong>
        <p style="margin-top: 8px;">
          Review proposals with status: <span class="status-badge status-pending">Already sent propose email</span>
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Select trip to approve</strong>
        <p style="margin-top: 8px;">
          Click <code>"Select"</code> on the business trip you want to approve
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Change approval status</strong>
        <p style="margin-top: 8px;">Select <code>"Approval Decision"</code>:</p>
        <ul style="margin-top: 8px;">
          <li><strong>"Approved"</strong> → Approves and notifies PIC</li>
          <li><strong>"Rejected"</strong> → Rejects with explanatory comment</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">5</span>
        <strong>Add comment (if needed)</strong>
        <p style="margin-top: 8px;">
          Fill in <code>"Manager Comment"</code> to:
        </p>
        <ul style="margin-top: 8px;">
          <li>Explain rejection reason</li>
          <li>Provide suggestions/additional requirements</li>
          <li>Note important points for PIC about the trip</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">6</span>
        <strong>Process approval</strong>
        <p style="margin-top: 8px;">
          Click <code>"Process Selected Trips"</code>
        </p>
        <p style="margin-top: 5px;">
          → System will automatically send email notification to PIC
        </p>
      </div>
    </div>

    <!-- SECTION 4: VIEW REPORTS -->
    <div class="section">
      <h2>4. VIEW REPORTS AFTER TRIP</h2>
      
      <div class="info-box">
        <p><strong>📊 HOD Dashboard has 2 tabs:</strong></p>
        <ul style="margin-top: 10px;">
          <li><strong>Approval</strong>: Approve new proposals</li>
          <li><strong>View Reports</strong>: View completed reports</li>
        </ul>
      </div>
      
      <div class="step">
        <span class="step-number">1</span>
        <strong>Switch to View Reports tab</strong>
        <p style="margin-top: 8px;">
          In HOD Approval dialog, click <code>"View Reports"</code> tab
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">2</span>
        <strong>View report list</strong>
        <p style="margin-top: 8px;">
          Displays all completed team trips
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">3</span>
        <strong>Check report details</strong>
        <p style="margin-top: 8px;">
          Click folder link to view detailed report file in Drive
        </p>
      </div>
      
      <div class="step">
        <span class="step-number">4</span>
        <strong>Check deadline</strong>
        <p style="margin-top: 8px;">
          View <code>"Check Deadline"</code> column to see if report is:
        </p>
        <ul style="margin-top: 8px;">
          <li><span class="status-badge status-approved">On time</span> - Submitted on time</li>
          <li><span class="status-badge status-rejected">Late</span> - Submitted late</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 5: KEY FEATURES -->
    <div class="section">
      <h2>5. KEY FEATURES FOR HOD</h2>
      
      <div class="step">
        <strong>1. Overview Dashboard</strong>
        <ul style="margin-top: 8px;">
          <li>View all team trips</li>
          <li>Filter by status, month, PIC</li>
          <li>Statistics overview (proposals, approved, rejected)</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>2. Quick Approval</strong>
        <ul style="margin-top: 8px;">
          <li>Approve/Reject with just a few clicks</li>
          <li>Add comments directly in dialog</li>
          <li>Email automatically sent to PIC</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>3. Deadline Tracking</strong>
        <ul style="margin-top: 8px;">
          <li>View reports submitted on-time/late</li>
          <li>Days remaining before deadline</li>
          <li>Automatic alerts for late reports</li>
        </ul>
      </div>
      
      <div class="step">
        <strong>4. Complete Audit Trail</strong>
        <ul style="margin-top: 8px;">
          <li>History of all changes</li>
          <li>Comments saved</li>
          <li>Complete email history</li>
        </ul>
      </div>
    </div>

    <!-- SECTION 6: IMPORTANT NOTES -->
    <div class="section">
      <h2>⚠️ IMPORTANT NOTES</h2>
      
      <div class="warning">
        <ol>
          <li><strong>Check email regularly</strong> to receive new proposal notifications</li>
          <li><strong>Review information carefully</strong> before approving</li>
          <li><strong>Add clear comments</strong> when rejecting so PIC understands and can revise</li>
          <li><strong>Approve timely</strong> to not affect work trip plans</li>
          <li><strong>Monitor report deadlines</strong> of your team regularly</li>
        </ol>
      </div>
    </div>

    <!-- SECTION 7: SUPPORT -->
    <div class="section">
      <h2>NEED SUPPORT?</h2>
      <div class="info-box">
        <p>If you encounter any issues using the system, please contact:</p>
        <ul style="margin-top: 8px;">
          <li>Email: <code>mmh.product@manimedicalthanoi.com</code></li>
          <li>Or contact IT Support</li>
        </ul>
      </div>
    </div>
  </div>

<script>
  function switchTab(event, tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].classList.remove('active');
    }
    
    // Remove active class from all buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
      tabButtons[i].classList.remove('active');
    }
    
    // Show the selected tab and mark button as active
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
  }
</script>

</body>
</html>
  `;
}/**
 * 🧪 FUNCTION DEBUG TOÀN DIỆN - Kiểm tra chi tiết vấn đề menu
 * Chạy function này từ Apps Script Editor để xem đầy đủ thông tin
 */
function debugMenuPermissionsDetailed() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = Session.getActiveUser().getEmail();
  
  Logger.log('╔═══════════════════════════════════════════════════════════╗');
  Logger.log('║          DEBUG MENU PERMISSIONS - DETAILED                ║');
  Logger.log('╚═══════════════════════════════════════════════════════════╝');
  Logger.log('');
  Logger.log('👤 Current User Email: ' + userEmail);
  Logger.log('📅 Debug Time: ' + new Date().toString());
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // BƯỚC 1: Kiểm tra CONFIG
  // ═══════════════════════════════════════════════════════════
  Logger.log('┌─── STEP 1: Check CONFIG ───┐');
  Logger.log('│ EMAIL_PIC (X): ' + CONFIG.COLUMNS.EMAIL_PIC);
  Logger.log('│ EMAIL_HOD (Y): ' + CONFIG.COLUMNS.EMAIL_HOD);
  Logger.log('│ EMAIL_DIRECTOR (Z): ' + CONFIG.COLUMNS.EMAIL_DIRECTOR);
  Logger.log('│ EMAIL_CC (AA): ' + CONFIG.COLUMNS.EMAIL_CC);
  Logger.log('└────────────────────────────────┘');
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // BƯỚC 2: Kiểm tra Column Indexes
  // ═══════════════════════════════════════════════════════════
  Logger.log('┌─── STEP 2: Column Indexes ───┐');
  const colX = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC);
  const colY = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_HOD);
  const colZ = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_DIRECTOR);
  const colAA = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_CC);
  
  Logger.log('│ X → Index: ' + colX);
  Logger.log('│ Y → Index: ' + colY);
  Logger.log('│ Z → Index: ' + colZ);
  Logger.log('│ AA → Index: ' + colAA);
  Logger.log('└────────────────────────────────┘');
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // BƯỚC 3: Đọc data từ các cột email
  // ═══════════════════════════════════════════════════════════
  Logger.log('┌─── STEP 3: Read Email Columns ───┐');
  
  const lastRow = sheet.getLastRow();
  Logger.log('│ Last Row: ' + lastRow);
  Logger.log('│ Data Start Row: ' + CONFIG.DATA_START_ROW);
  Logger.log('│ Total Data Rows: ' + (lastRow - CONFIG.DATA_START_ROW + 1));
  Logger.log('└────────────────────────────────────┘');
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // BƯỚC 4: Tìm email của user trong từng cột
  // ═══════════════════════════════════════════════════════════
  Logger.log('┌─── STEP 4: Search Your Email ───┐');
  Logger.log('│ Searching for: ' + userEmail);
  Logger.log('│');
  
  let foundInX = false;
  let foundInY = false;
  let foundInZ = false;
  let foundInAA = false;
  
  const normalizedUserEmail = userEmail.toLowerCase().trim();
  
  // Scan tất cả các rows
  for (let i = CONFIG.DATA_START_ROW; i <= lastRow; i++) {
    const emailX = sheet.getRange(i, colX).getValue();
    const emailY = sheet.getRange(i, colY).getValue();
    const emailZ = sheet.getRange(i, colZ).getValue();
    const emailAA = sheet.getRange(i, colAA).getValue();
    
    // Kiểm tra cột X
    if (emailX && emailX.toString().toLowerCase().trim() === normalizedUserEmail) {
      foundInX = true;
      Logger.log('│ ✅ FOUND in Column X at Row ' + i);
      Logger.log('│    Raw Value: "' + emailX + '"');
    }
    
    // Kiểm tra cột Y
    if (emailY && emailY.toString().toLowerCase().trim() === normalizedUserEmail) {
      foundInY = true;
      Logger.log('│ ✅ FOUND in Column Y at Row ' + i);
      Logger.log('│    Raw Value: "' + emailY + '"');
    }
    
    // Kiểm tra cột Z
    if (emailZ && emailZ.toString().toLowerCase().trim() === normalizedUserEmail) {
      foundInZ = true;
      Logger.log('│ ✅ FOUND in Column Z at Row ' + i);
      Logger.log('│    Raw Value: "' + emailZ + '"');
    }
    
    // Kiểm tra cột AA
    if (emailAA && emailAA.toString().toLowerCase().trim() === normalizedUserEmail) {
      foundInAA = true;
      Logger.log('│ ✅ FOUND in Column AA at Row ' + i);
      Logger.log('│    Raw Value: "' + emailAA + '"');
    }
  }
  
  Logger.log('│');
  Logger.log('│ SUMMARY:');
  Logger.log('│   Column X (PIC): ' + (foundInX ? '✅ YES' : '❌ NO'));
  Logger.log('│   Column Y (HOD): ' + (foundInY ? '✅ YES' : '❌ NO'));
  Logger.log('│   Column Z (Director): ' + (foundInZ ? '✅ YES' : '❌ NO'));
  Logger.log('│   Column AA (CC): ' + (foundInAA ? '✅ YES' : '❌ NO'));
  Logger.log('└────────────────────────────────────┘');
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // BƯỚC 5: Test function isHOD()
  // ═══════════════════════════════════════════════════════════
  Logger.log('┌─── STEP 5: Test isHOD() Function ───┐');
  
  try {
    const result = isHOD(userEmail);
    Logger.log('│ isHOD() Result: ' + (result ? '✅ TRUE' : '❌ FALSE'));
    Logger.log('│');
    Logger.log('│ Expected: ' + ((foundInX || foundInY || foundInZ || foundInAA) ? 'TRUE' : 'FALSE'));
    Logger.log('│ Actual: ' + (result ? 'TRUE' : 'FALSE'));
    
    if ((foundInX || foundInY || foundInZ || foundInAA) && !result) {
      Logger.log('│');
      Logger.log('│ ⚠️ PROBLEM DETECTED!');
      Logger.log('│    Your email is in the columns but isHOD() returns FALSE');
      Logger.log('│    This means there is a bug in isHOD() function');
    }
    
  } catch (error) {
    Logger.log('│ ❌ ERROR in isHOD(): ' + error.message);
    Logger.log('│ Stack: ' + error.stack);
  }
  
  Logger.log('└────────────────────────────────────────┘');
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // BƯỚC 6: Kiểm tra mẫu email trong columns để so sánh
  // ═══════════════════════════════════════════════════════════
  Logger.log('┌─── STEP 6: Sample Emails in Columns ───┐');
  Logger.log('│ Showing first 5 unique emails from each column:');
  Logger.log('│');
  
  // Column Y samples
  const emailsY = [];
  for (let i = CONFIG.DATA_START_ROW; i <= Math.min(lastRow, CONFIG.DATA_START_ROW + 20); i++) {
    const email = sheet.getRange(i, colY).getValue();
    if (email && email.toString().trim() !== '' && !emailsY.includes(email.toString())) {
      emailsY.push(email.toString());
      if (emailsY.length >= 5) break;
    }
  }
  
  Logger.log('│ Column Y (HOD) samples:');
  if (emailsY.length === 0) {
    Logger.log('│   ⚠️ No emails found in Column Y!');
  } else {
    emailsY.forEach(email => {
      Logger.log('│   • "' + email + '"');
    });
  }
  Logger.log('│');
  
  // Column Z samples
  const emailsZ = [];
  for (let i = CONFIG.DATA_START_ROW; i <= Math.min(lastRow, CONFIG.DATA_START_ROW + 20); i++) {
    const email = sheet.getRange(i, colZ).getValue();
    if (email && email.toString().trim() !== '' && !emailsZ.includes(email.toString())) {
      emailsZ.push(email.toString());
      if (emailsZ.length >= 5) break;
    }
  }
  
  Logger.log('│ Column Z (Director) samples:');
  if (emailsZ.length === 0) {
    Logger.log('│   ⚠️ No emails found in Column Z!');
  } else {
    emailsZ.forEach(email => {
      Logger.log('│   • "' + email + '"');
    });
  }
  
  Logger.log('└────────────────────────────────────────────┘');
  Logger.log('');
  
  // ═══════════════════════════════════════════════════════════
  // FINAL DIAGNOSIS
  // ═══════════════════════════════════════════════════════════
  Logger.log('╔═══════════════════════════════════════════════════════════╗');
  Logger.log('║                    FINAL DIAGNOSIS                        ║');
  Logger.log('╚═══════════════════════════════════════════════════════════╝');
  Logger.log('');
  
  if (!foundInX && !foundInY && !foundInZ && !foundInAA) {
    Logger.log('❌ PROBLEM: Your email is NOT in any column (X, Y, Z, AA)');
    Logger.log('');
    Logger.log('💡 SOLUTION:');
    Logger.log('   1. Check if you are logged in with correct email');
    Logger.log('   2. Add your email to one of these columns in the sheet');
    Logger.log('   3. Make sure array formulas are working properly');
  } else if ((foundInX || foundInY || foundInZ || foundInAA) && !isHOD(userEmail)) {
    Logger.log('❌ PROBLEM: Email found in columns but isHOD() returns FALSE');
    Logger.log('');
    Logger.log('💡 SOLUTION:');
    Logger.log('   1. There is a bug in isHOD() function');
    Logger.log('   2. Replace isHOD() function with the updated version');
    Logger.log('   3. Check if there are multiple isHOD() functions in your code');
  } else {
    Logger.log('✅ Everything looks correct!');
    Logger.log('');
    Logger.log('💡 Try these steps:');
    Logger.log('   1. Close and reopen the Google Sheet');
    Logger.log('   2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)');
    Logger.log('   3. Check if there are any Apps Script errors');
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('DEBUG COMPLETED - Check logs above for details');
  Logger.log('═══════════════════════════════════════════════════════════');
}/**
 * 🧪 TEST FUNCTION - Tạo menu thủ công để kiểm tra
 * Chạy function này từ Apps Script Editor
 */
function testCreateMenuManually() {
  const ui = SpreadsheetApp.getUi();
  const userEmail = Session.getActiveUser().getEmail();
  
  Logger.log('═══════════════════════════════════════════');
  Logger.log('TEST: Create Menu Manually');
  Logger.log('═══════════════════════════════════════════');
  Logger.log('');
  Logger.log('👤 User Email: ' + userEmail);
  
  try {
    // BƯỚC 1: Test isHOD()
    Logger.log('');
    Logger.log('┌─── STEP 1: Test isHOD() ───┐');
    const isUserHOD = isHOD(userEmail);
    Logger.log('│ isHOD() result: ' + (isUserHOD ? '✅ TRUE' : '❌ FALSE'));
    Logger.log('└─────────────────────────────┘');
    
    // BƯỚC 2: Tạo PIC Menu
    Logger.log('');
    Logger.log('┌─── STEP 2: Create PIC Menu ───┐');
    try {
      ui.createMenu('PIC Menu')
        .addItem('📖 User Guide', 'showPICUserGuide')
        .addSeparator()
        .addItem('Business Trip Plan & Report', 'showBusinessTripDialog')
        .addToUi();
      Logger.log('│ ✅ PIC Menu created successfully');
    } catch (error) {
      Logger.log('│ ❌ ERROR creating PIC Menu: ' + error.message);
      Logger.log('│ Stack: ' + error.stack);
    }
    Logger.log('└────────────────────────────────┘');
    
    // BƯỚC 3: Tạo HOD Menu (nếu có quyền)
    Logger.log('');
    Logger.log('┌─── STEP 3: Create HOD Menu ───┐');
    
    if (isUserHOD) {
      Logger.log('│ User has HOD permission → Creating HOD Menu...');
      try {
        ui.createMenu('HOD Menu')
          .addItem('📖 User Guide', 'showHODUserGuide')
          .addSeparator()
          .addItem('Business Trip Approval', 'showHODApprovalDialog')
          .addToUi();
        Logger.log('│ ✅ HOD Menu created successfully');
        Logger.log('│');
        Logger.log('│ 🎉 SUCCESS! Check your Google Sheet now.');
        Logger.log('│    You should see BOTH menus:');
        Logger.log('│    • PIC Menu');
        Logger.log('│    • HOD Menu');
      } catch (error) {
        Logger.log('│ ❌ ERROR creating HOD Menu: ' + error.message);
        Logger.log('│ Stack: ' + error.stack);
      }
    } else {
      Logger.log('│ ⚠️ User does NOT have HOD permission');
      Logger.log('│    Only PIC Menu will be created');
    }
    
    Logger.log('└────────────────────────────────┘');
    
    Logger.log('');
    Logger.log('═══════════════════════════════════════════');
    Logger.log('TEST COMPLETED');
    Logger.log('═══════════════════════════════════════════');
    
  } catch (error) {
    Logger.log('');
    Logger.log('❌ CRITICAL ERROR in testCreateMenuManually:');
    Logger.log('   ' + error.message);
    Logger.log('   Stack: ' + error.stack);
  }
}
/**
 * 🔍 DEBUG: Tại sao không tìm thấy business trip
 */
function debugWhyNoTripsFound() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const userEmail = Session.getActiveUser().getEmail();
  
  Logger.log('═══════════════════════════════════════');
  Logger.log('🔍 DEBUG: WHY NO TRIPS FOUND?');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  Logger.log('👤 Your login email: "' + userEmail + '"');
  Logger.log('');
  
  const lastRow = sheet.getLastRow();
  Logger.log('📊 Sheet info:');
  Logger.log('   Sheet name: ' + CONFIG.SHEET_NAME);
  Logger.log('   Last row: ' + lastRow);
  Logger.log('   Data start row: ' + CONFIG.DATA_START_ROW);
  Logger.log('');
  
  // BƯỚC 1: Kiểm tra cột X (EMAIL_PIC) - index trong sheet
  const colX = columnLetterToIndex(CONFIG.COLUMNS.EMAIL_PIC);
  Logger.log('📧 Column X (EMAIL_PIC) index: ' + colX);
  Logger.log('');
  
  // BƯỚC 2: Đọc trực tiếp từ cột X để xem có gì
  Logger.log('--- Sample emails in Column X (first 10 rows) ---');
  const uniqueEmails = new Set();
  
  for (let i = CONFIG.DATA_START_ROW; i <= Math.min(lastRow, CONFIG.DATA_START_ROW + 15); i++) {
    const cellValue = sheet.getRange(i, colX).getValue();
    const picName = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.PIC)).getValue();
    const dest = sheet.getRange(i, columnLetterToIndex(CONFIG.COLUMNS.DESTINATION)).getValue();
    
    Logger.log('Row ' + i + ':');
    Logger.log('   PIC (D): "' + picName + '"');
    Logger.log('   Email PIC (X): "' + cellValue + '"');
    Logger.log('   Destination (H): "' + dest + '"');
    Logger.log('   Match? ' + (cellValue && cellValue.toString().toLowerCase().trim() === userEmail.toLowerCase().trim() ? '✅ YES' : '❌ NO'));
    Logger.log('');
    
    if (cellValue && cellValue.toString().trim() !== '') {
      uniqueEmails.add(cellValue.toString().trim());
    }
  }
  
  Logger.log('');
  Logger.log('--- All unique emails found in Column X ---');
  uniqueEmails.forEach(email => {
    Logger.log('   • "' + email + '"');
    
    // So sánh chi tiết
    if (email.toLowerCase().includes('mmh.product')) {
      Logger.log('     ↳ Character comparison with your email:');
      Logger.log('       Sheet : ' + email);
      Logger.log('       Login : ' + userEmail);
      Logger.log('       Match : ' + (email.toLowerCase().trim() === userEmail.toLowerCase().trim() ? '✅' : '❌ DIFFERENT!'));
    }
  });
  
  Logger.log('');
  
  // BƯỚC 3: Kiểm tra bằng dataRange (giống getPICData)
  Logger.log('--- Simulate getPICData logic ---');
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, 28);
  const data = dataRange.getValues();
  
  let foundCount = 0;
  for (let i = 0; i < data.length; i++) {
    const emailFromArray = data[i][22]; // Index 22 = Column X
    if (emailFromArray && emailFromArray.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()) {
      foundCount++;
      if (foundCount <= 3) {
        Logger.log('   ✅ Match at array index ' + i + ' (Row ' + (CONFIG.DATA_START_ROW + i) + ')');
        Logger.log('      Email: "' + emailFromArray + '"');
      }
    }
  }
  
  Logger.log('');
  Logger.log('Total matches: ' + foundCount);
  
  if (foundCount === 0) {
    Logger.log('');
    Logger.log('❌ PROBLEM: No matches found!');
    Logger.log('');
    Logger.log('💡 POSSIBLE CAUSES:');
    Logger.log('   1. Your login email domain might differ from sheet email domain');
    Logger.log('   2. Array formula in Column X is not working');
    Logger.log('   3. Column X is empty for your rows');
    Logger.log('');
    Logger.log('💡 QUICK FIX: Check if the email domain matches:');
    Logger.log('   Your login: ' + userEmail);
    Logger.log('   Expected in sheet column X: same email exactly');
  } else {
    Logger.log('');
    Logger.log('✅ Matches found! getPICData should work.');
    Logger.log('   If dialog still shows error, there might be a timing issue.');
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
  Logger.log('DEBUG COMPLETED');
  Logger.log('═══════════════════════════════════════');
}// ===========================
// CALENDAR SYNC SYSTEM
// ===========================

/**
 * Department → Members mapping
 */
var DEPT_MEMBERS = {
  'CEO': ['Nguyen Ha'],
  'HOD': ['Tuyen', 'Hoa'],
  'Dental Sales Team': ['Minh Viet', 'Phuong', 'Vinh'],
  'Surgical Sales Team': ['Khang', 'Viet Ha'],
  'Product Team': ['Giang'],
  'Marketing Team': ['Thuong', 'Bui Trang', 'Quynh Anh', 'Duc Anh'],
  'Stock Team': ['Dam Ha', 'Minh Viet', 'Hau', 'Ngoc']
};

/**
 * FY mapping: FY66 = 202409-202508, FY67 = 202509-202608
 */
function getFYMonthRange(fy) {
  if (fy === 'FY66') return { start: 202409, end: 202508 };
  if (fy === 'FY67') return { start: 202509, end: 202608 };
  return null;
}

/**
 * Tháng → Cột mapping trên Calendar sheet (bắt đầu từ tháng 09)
 * Tháng 09→G, 10→H, 11→I, 12→J, 01→K, 02→L, 03→M, 04→N, 05→O, 06→P, 07→Q, 08→R
 */
function getCalendarColumnForMonth(monthNum) {
  var monthToCol = {
    9: 'G', 10: 'H', 11: 'I', 12: 'J',
    1: 'K', 2: 'L', 3: 'M', 4: 'N',
    5: 'O', 6: 'P', 7: 'Q', 8: 'R'
  };
  return monthToCol[monthNum] || null;
}

/**
 * ✅ MAIN: Cập nhật Calendar sheet dựa trên filter B5, C5, D5
 */
function updateCalendarSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var calSheet = ss.getSheetByName(CONFIG.CALENDAR_SHEET || 'Calander');
  var travelSheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!calSheet || !travelSheet) {
    Logger.log('⚠️ Calendar or Travel sheet not found');
    return;
  }
  
  var fy = calSheet.getRange('B5').getValue().toString().trim();
  var dept = calSheet.getRange('C5').getValue().toString().trim();
  var member = calSheet.getRange('D5').getValue().toString().trim();
  
  Logger.log('=== UPDATE CALENDAR ===');
  Logger.log('FY: ' + fy + ', Dept: ' + dept + ', Member: ' + member);
  
  var fyRange = getFYMonthRange(fy);
  if (!fyRange) {
    Logger.log('❌ Invalid FY: ' + fy);
    return;
  }
  
  // Xác định danh sách PIC
  var targetPICs = [];
  if (dept === 'All') {
    Object.keys(DEPT_MEMBERS).forEach(function(d) {
      targetPICs = targetPICs.concat(DEPT_MEMBERS[d]);
    });
  } else if (DEPT_MEMBERS[dept]) {
    if (member === 'All member' || member === 'All' || member === '') {
      targetPICs = DEPT_MEMBERS[dept];
    } else {
      targetPICs = [member];
    }
  }
  targetPICs = targetPICs.filter(function(v, i, a) { return a.indexOf(v) === i; });
  
  // Đọc data
  var lastRow = travelSheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) {
    clearCalendarCells(calSheet);
    return;
  }
  
  var dataRange = travelSheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, 28);
  var data = dataRange.getValues();
  
  var monthTrips = {};
  var totalCost = 0;
  var totalTrips = 0;
  
  for (var i = 0; i < data.length; i++) {
    var rowData = data[i];
    var picName = (rowData[2] || '').toString().trim();
    var monthVal = (rowData[1] || '').toString().trim();
    var startDate = rowData[3];
    var finishDate = rowData[4];
    var destination = (rowData[6] || '').toString().trim();
    var coTraveler = (rowData[7] || '').toString().trim();
    var purpose = (rowData[8] || '').toString().trim();
    var cost = rowData[11] || 0;
    var equipment = (rowData[13] || '').toString().trim();
    var approvalStatus = (rowData[17] || '').toString().trim();
    
    var picMatch = targetPICs.some(function(p) { return p.toLowerCase() === picName.toLowerCase(); });
    if (!picMatch) continue;
    
    var monthNum = parseInt(monthVal);
    if (isNaN(monthNum) || monthNum < fyRange.start || monthNum > fyRange.end) continue;
    if (!picName || !startDate || !finishDate || !destination) continue;
    
    var calMonth;
    if (startDate instanceof Date) {
      calMonth = startDate.getMonth() + 1;
    } else {
      calMonth = parseInt(monthVal.toString().slice(-2));
    }
    
    if (!monthTrips[calMonth]) monthTrips[calMonth] = [];
    
    var actualRow = CONFIG.DATA_START_ROW + i;
    var folderUrl = getFolderLinkFromSheet(travelSheet, actualRow);
    
    var startStr = '';
    var finishStr = '';
    var days = '';
    try {
      if (startDate instanceof Date) startStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      if (finishDate instanceof Date) finishStr = Utilities.formatDate(finishDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      if (startDate instanceof Date && finishDate instanceof Date) {
        days = Math.ceil((finishDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
    } catch (e) {
      startStr = startDate.toString();
      finishStr = finishDate.toString();
    }
    
    monthTrips[calMonth].push({
      pic: picName,
      startStr: startStr,
      finishStr: finishStr,
      days: days,
      destination: destination,
      coTraveler: coTraveler,
      purpose: purpose,
      cost: cost,
      equipment: equipment,
      folderUrl: folderUrl,
      approvalStatus: approvalStatus
    });
    
    totalCost += parseFloat(cost) || 0;
    totalTrips++;
  }
  
  // Xóa nội dung cũ
  clearCalendarCells(calSheet);
  
  // ✅ FIX 3: Ghi E5, F5 với format đúng: Bold, Centered, Lexend, size 12
  var e5Cell = calSheet.getRange('E5');
  e5Cell.setValue(totalTrips);
  e5Cell.setFontFamily('Lexend');
  e5Cell.setFontSize(12);
  e5Cell.setFontWeight('bold');
  e5Cell.setHorizontalAlignment('center');
  e5Cell.setVerticalAlignment('middle');
  
  var f5Cell = calSheet.getRange('F5');
  var costText = totalCost > 0 ? formatNumberWithCommas(totalCost) + ' vnd' : '0 vnd';
  f5Cell.setValue(costText);
  f5Cell.setFontFamily('Lexend');
  f5Cell.setFontSize(12);
  f5Cell.setFontWeight('bold');
  f5Cell.setHorizontalAlignment('center');
  f5Cell.setVerticalAlignment('middle');
  
  // ✅ Ghi từng tháng
  var allMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];
  
  allMonths.forEach(function(m) {
    var colLetter = getCalendarColumnForMonth(m);
    if (!colLetter) return;
    
    var trips = monthTrips[m] || [];
    if (trips.length === 0) return;
    
    var colIndex = columnLetterToIndex(colLetter);
    var cell = calSheet.getRange(5, colIndex);
    
    // ===== BUILD RICH TEXT =====
    var textParts = []; // {text, bold, italic, link}
    
    trips.forEach(function(trip, idx) {
      if (idx > 0) textParts.push({text: '\n\n', bold: false, italic: false});
      
      // ✅ Approval icon
      var statusIcon = '⏳';
      var status = (trip.approvalStatus || '').toLowerCase();
      if (status.indexOf('approved') !== -1) statusIcon = '✅';
      else if (status.indexOf('rejected') !== -1) statusIcon = '❌';
      else if (status.indexOf('already sent') !== -1) statusIcon = '📨';
      
      // Line 1: "1. ✅ GIANG 📅 (3 days | 20/05/2026 - 22/05/2026) : Ho Chi Minh"
      var headerLine = (idx + 1) + '. ' + statusIcon + ' ';
      textParts.push({text: headerLine, bold: false, italic: false});
      textParts.push({text: trip.pic.toUpperCase(), bold: true, italic: false});
      
      // Date part: 📅 (3 days | 20/05 - 22/05) : Destination
      var daysText = trip.days ? trip.days + ' days' : 'N/A';
      textParts.push({text: ' 📅 (', bold: false, italic: false});
      textParts.push({text: daysText, bold: true, italic: false});
      textParts.push({text: ' | ' + trip.startStr + ' - ' + trip.finishStr + ') : ', bold: false, italic: false});
      textParts.push({text: trip.destination, bold: true, italic: false});
      
      // Co-Traveller
      textParts.push({text: '\n', bold: false, italic: false});
      textParts.push({text: 'Co-Traveller: ', bold: false, italic: true});
      textParts.push({text: (trip.coTraveler || 'N/A'), bold: false, italic: false});
      
      // Cost
      textParts.push({text: '\n', bold: false, italic: false});
      textParts.push({text: 'Cost: ', bold: false, italic: true});
      var costVal = parseFloat(trip.cost) ? formatNumberWithCommas(parseFloat(trip.cost)) + ' vnd' : 'N/A';
      textParts.push({text: costVal, bold: false, italic: false});
      
      // Purpose
      textParts.push({text: '\n', bold: false, italic: false});
      textParts.push({text: 'Purpose: ', bold: false, italic: true});
      textParts.push({text: (trip.purpose || 'N/A'), bold: false, italic: false});
      
      // Equipment
      textParts.push({text: '\n', bold: false, italic: false});
      textParts.push({text: 'Equipment: ', bold: false, italic: true});
      textParts.push({text: (trip.equipment || 'N/A'), bold: false, italic: false});
      
      // Folder
      textParts.push({text: '\n📁 ', bold: false, italic: false});
      if (trip.folderUrl) {
        textParts.push({text: 'Folder', bold: false, italic: true, link: trip.folderUrl});
      } else {
        textParts.push({text: 'Folder: N/A', bold: false, italic: true});
      }
      
      // ✅ Approval — CHỈ icon + status, KHÔNG có chữ "Approval:"
      textParts.push({text: '\n' + statusIcon + ' ', bold: false, italic: false});
      textParts.push({text: (trip.approvalStatus || 'N/A'), bold: false, italic: true});
    });
    
    // ✅ Build full text string
    var fullText = '';
    textParts.forEach(function(p) { fullText += p.text; });
    
    // ✅ Build RichTextValue
    var richBuilder = SpreadsheetApp.newRichTextValue().setText(fullText);
    
    var pos = 0;
    textParts.forEach(function(p) {
      var start = pos;
      var end = pos + p.text.length;
      
      if (p.bold || p.italic || p.link) {
        var styleBuilder = SpreadsheetApp.newTextStyle();
        if (p.bold) styleBuilder.setBold(true);
        if (p.italic) styleBuilder.setItalic(true);
        richBuilder.setTextStyle(start, end, styleBuilder.build());
        
        if (p.link) {
          richBuilder.setLinkUrl(start, end, p.link);
        }
      }
      
      pos = end;
    });
    
    cell.setRichTextValue(richBuilder.build());
    cell.setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
    cell.setVerticalAlignment('top');
    cell.setFontFamily('Lexend');
    cell.setFontSize(10);
  });
  
  Logger.log('✅ Calendar updated successfully');
}

/**
 * Helper: Format number with commas (1234567 → 1,234,567)
 */
function formatNumberWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Xóa nội dung calendar cells (E5:R5)
 */
function clearCalendarCells(calSheet) {
  calSheet.getRange('E5:R5').clearContent();
  calSheet.getRange('E5:R5').clearFormat();
}

/**
 * Xóa nội dung calendar cells (E5:R5)
 */


/**
 * ✅ Setup Data Validation cho Calendar sheet (B5, C5, D5)
 * Chạy 1 lần để thiết lập dropdown
 */
function setupCalendarDropdowns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var calSheet = ss.getSheetByName(CONFIG.CALENDAR_SHEET || 'Calander');
  
  if (!calSheet) {
    Logger.log('❌ Calendar sheet not found');
    return;
  }
  
  // ✅ B5: FY dropdown
  var fyValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['FY66', 'FY67'], true)
    .setAllowInvalid(false)
    .build();
  calSheet.getRange('B5').setDataValidation(fyValidation);
  
  // ✅ C5: Department dropdown  
  var depts = ['All'].concat(Object.keys(DEPT_MEMBERS));
  var deptValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(depts, true)
    .setAllowInvalid(false)
    .build();
  calSheet.getRange('C5').setDataValidation(deptValidation);
  
  // ✅ D5: Mặc định "All member" — sẽ được cập nhật dynamic khi C5 thay đổi
  calSheet.getRange('D5').setValue('All member');
  
  Logger.log('✅ Calendar dropdowns setup complete');
}

/**
 * ✅ Update D5 dropdown khi C5 (Department) thay đổi
 */
function updateMemberDropdown(dept) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var calSheet = ss.getSheetByName(CONFIG.CALENDAR_SHEET || 'Calander');
  
  if (!calSheet) return;
  
  var memberCell = calSheet.getRange('D5');
  memberCell.clearDataValidations();
  
  if (dept === 'All' || !DEPT_MEMBERS[dept]) {
    memberCell.setValue('All member');
    var allValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['All member'], true)
      .setAllowInvalid(false)
      .build();
    memberCell.setDataValidation(allValidation);
  } else {
    var members = ['All member'].concat(DEPT_MEMBERS[dept]);
    var memberValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(members, true)
      .setAllowInvalid(false)
      .build();
    memberCell.setDataValidation(memberValidation);
    memberCell.setValue('All member');
  }
}

// ===========================
// ON EDIT TRIGGER
// ===========================

/**
 * ✅ Installable Edit Trigger
 * Trigger cả Calendar dropdown update VÀ Calendar data refresh
 * 
 * ⚡ SETUP: Chạy setupOnEditTrigger() 1 lần để cài đặt
 */
function onEditTrigger(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var sheetName = sheet.getName();
    
    // ===== CALENDAR SHEET: Update dropdown D5 khi C5 thay đổi =====
    if (sheetName === (CONFIG.CALENDAR_SHEET || 'Calander')) {
      var row = range.getRow();
      var col = range.getColumn();
      
      // C5 thay đổi → update D5 dropdown + refresh data
      if (row === 5 && col === 3) { // C5
        var dept = range.getValue().toString().trim();
        updateMemberDropdown(dept);
        updateCalendarSheet();
      }
      
      // B5 hoặc D5 thay đổi → refresh data
      if (row === 5 && (col === 2 || col === 4)) {
        updateCalendarSheet();
      }
    }
    
    // ===== MMH TRAVEL REPORT: Auto-sync Calendar khi data thay đổi =====
    if (sheetName === CONFIG.SHEET_NAME) {
      var editedRow = range.getRow();
      var editedCol = range.getColumn();
      
      // Chỉ sync khi edit vào các cột data quan trọng (D, E, F, H, I, J, M, O, S)
      // Tương ứng cột index: 4, 5, 6, 8, 9, 10, 13, 15, 19
      var triggerCols = [
        columnLetterToIndex('D'), // PIC
        columnLetterToIndex('E'), // Start Date
        columnLetterToIndex('F'), // Finish Date  
        columnLetterToIndex('H'), // Destination
        columnLetterToIndex('I'), // Co-Traveler
        columnLetterToIndex('J'), // Purpose
        columnLetterToIndex('M'), // Total Cost
        columnLetterToIndex('O'), // Equipment
        columnLetterToIndex('S')  // Approval Status
      ];
      
      if (editedRow >= CONFIG.DATA_START_ROW && triggerCols.indexOf(editedCol) !== -1) {
        // Kiểm tra xem có đủ data tối thiểu (D, E, F, H, I) không
        var pic = sheet.getRange(editedRow, columnLetterToIndex('D')).getValue();
        var startDate = sheet.getRange(editedRow, columnLetterToIndex('E')).getValue();
        var finishDate = sheet.getRange(editedRow, columnLetterToIndex('F')).getValue();
        var dest = sheet.getRange(editedRow, columnLetterToIndex('H')).getValue();
        var coTrav = sheet.getRange(editedRow, columnLetterToIndex('I')).getValue();
        
        if (pic && startDate && finishDate && dest && coTrav) {
          // Đủ data → sync Calendar
          updateCalendarSheet();
        }
      }
    }
    
  } catch (err) {
    Logger.log('⚠️ onEditTrigger error: ' + err.message);
  }
}

/**
 * ✅ Chạy 1 lần để cài đặt Installable Trigger
 */
function setupOnEditTrigger() {
  // Xóa trigger cũ (nếu có)
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onEditTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Tạo trigger mới
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  
  Logger.log('✅ onEditTrigger installed successfully');
}