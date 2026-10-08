/****************************************************************************************
 * MARKETING ACTION REPORT - MAILER & AUTOMATION SCRIPT
 * Version: 6.1 (2025-08-27)
 * Locale/Timezone: Asia/Ho_Chi_Minh
 *
 * 6.1 Changes:
 * - Chuyển "Xem tiến độ PIC" ra ngoài menu chính (tất cả user có thể sử dụng)
 * - Chuyển "Priority Reminder" ra ngoài menu chính (tất cả user có thể sử dụng)
 * - Bỏ giới hạn quyền Manager/Giang cho 2 tính năng này
 ****************************************************************************************/

const CONFIG = {
  SHEET_NAME: 'WEEK',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  DATA_START_ROW: 6,

 COL: {
  TYPE: 5,               // E - giữ nguyên
  KEY: 6,                // F - giữ nguyên  
  SUB: 7,                // G - giữ nguyên
  RESULT: 8,             // H - giữ nguyên
  PIC_NAME: 9,           // I - giữ nguyên
  START_WEEK: 10,        // J - MỚI: Start week
  START: 11,             // K - DI CHUYỂN: Start Date (cũ là J)
  FINISH: 12,            // L - DI CHUYỂN: Finish date (cũ là K)  
  DEADLINE: 13,          // M - DI CHUYỂN: Dead line (cũ là L)
  ASSIGNER: 14,          // N - MỚI: Assigner
  STATUS: 15,            // O - DI CHUYỂN: Status (cũ là N)
  ACTUAL_FINISH_DATE: 16,// P - MỚI: Actual finish date
  BEHAVIOR: 17,          // Q - DI CHUYỂN: Behavior (cũ là P)
  MANAGER_COMMENT: 18,   // R - DI CHUYỂN: Manager comment (cũ là Q)
  PRIORITY: 19,          // S - DI CHUYỂN: Priority Task (cũ là R)
  // XÓA CONFIRM_BY_MANAGER - không còn trong cấu trúc mới
  PIC_EMAIL: 20,         // T - giữ nguyên
  HOD_EMAIL: 21,         // U - giữ nguyên  
  DIRECTOR_EMAIL: 22,    // V - giữ nguyên
  CC_EMAIL: 23,          // W - giữ nguyên
  LOCK: 24,              // X - DI CHUYỂN: Lock (cũ là T)
  FILE_LINK_ROW: 2,      // giữ nguyên
  FILE_LINK_COL: 2,      // giữ nguyên
},

  LOCK_RANGE: { START_COL: 2, END_COL: 24 }, // B to X (thay đổi từ 23 thành 24)

  DATE_FMT_SHEET: 'dd/MM/yyyy',
  DATE_FMT_SUBJECT: 'dd/MM/yy',
  DATE_FMT_BODY: 'dd/MM/yy',

  STATUS: { COMPLETED: 'Completed' },

  PRIORITY_CC: 'tt.tuyen@manimedicalhanoi.com',

  DAILY_REMINDER_HOUR: 8,
  DAILY_REMINDER_MINUTE: 30,

  PROTECT_TAG_PREFIX: 'LOCK_ROW_',
  BACKUP_KEY_PREFIX: 'BACKUP_ROW_',

  // THÊM PIC_LIST DEFINITION (dựa trên email addresses có sẵn)
  PIC_LIST: {
    // Sẽ được build dynamic từ sheet data
    // Fallback cho test functions
    'Giang': 'mmh.product@manimedicalhanoi.com',
    'Manager': 'tt.tuyen@manimedicalhanoi.com'
  },

  // Roles definition
  ROLES: {
    PIC: 'PIC',
    HOD: 'HOD', 
    DIRECTOR: 'DIRECTOR',
    ADMIN: 'ADMIN'
  },
   EMAIL_PIC_MAPPING: {
    'tt.tuyen@manimedicalhanoi.com': 'Tuyen',
    'marketing.mmh@manimedicalhanoi.com': 'Thuong',
    'marketing.mmh2@manimedicalhanoi.com': 'Trang',
    'marketing.mmh1@manimedicalhanoi.com': 'Đức Anh',
    'mmh.product@manimedicalhanoi.com': 'Giang',
    'mmh.admin@manimedicalhanoi.com': 'Quỳnh Anh'
  },
  
  // ✅ PDF Folder
  PDF_FOLDER_TEAM: '1GZXKszflpKGbH0mfA8DcrquuNQ-ANXFq', // Team reports
  PDF_FOLDER_PIC: '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy',   // PIC reports
  
  // ✅ SHEETS config
  SHEETS: {
    WEEK: 'WEEK',
    MONTH: 'MONTH',
    MASTER: 'Master'
  },
  
  // ✅ MONTH COLS config
  COLS: {
    MONTH_ROW_NUM: 2,        // Column B - Row #
    MONTH_MONTH: 4,          // Column D - Month (YYYYMM)
    MONTH_PRIORITY: 5,       // Column E - Priority
    MONTH_TYPE: 6,           // Column F - Type Task  
    MONTH_KEY: 7,            // Column G - Key Task
    MONTH_PIC: 8,            // Column H - PIC
    MONTH_DEADLINE: 9,       // Column I - Deadline
    MONTH_STATUS: 10,        // Column J - Status
    MONTH_PLAN_REPORT: 11    // Column K - Plan & Report (với chip links)
  },

 MANAGER_EMAIL: 'tt.tuyen@manimedicalhanoi.com',
  GIANG_EMAIL: 'mmh.product@manimedicalhanoi.com',
  HOD_EMAILS: ['mmh.product@manimedicalhanoi.com', 'tt.tuyen@manimedicalhanoi.com']
};
// ================================ USER AUTHENTICATION SYSTEM =====================================

function _getUserRoles(userEmail) {
  if (!userEmail) return [];
  
  const normalizedEmail = userEmail.toLowerCase().trim();
  const roles = [];
  
  // Check if email is in PIC mapping
  const picName = CONFIG.EMAIL_PIC_MAPPING[normalizedEmail];
  if (picName) {
    roles.push(CONFIG.ROLES.PIC);
  }
  
  // Check if user is HOD
  if (CONFIG.HOD_EMAILS && CONFIG.HOD_EMAILS.map(e => e.toLowerCase()).includes(normalizedEmail)) {
    roles.push(CONFIG.ROLES.HOD);
  }
  
  // Check from sheet data
  const rows = _fetchAllRows();
  for (const row of rows) {
    // PIC check from sheet
    if (row.picEmail && row.picEmail.toLowerCase().trim() === normalizedEmail) {
      if (!roles.includes(CONFIG.ROLES.PIC)) {
        roles.push(CONFIG.ROLES.PIC);
      }
    }
    
    // HOD check from sheet
    if (row.hodEmail && row.hodEmail.toLowerCase().trim() === normalizedEmail) {
      if (!roles.includes(CONFIG.ROLES.HOD)) {
        roles.push(CONFIG.ROLES.HOD);
      }
    }
    
    // Director check from sheet
    if (row.directorEmail && row.directorEmail.toLowerCase().trim() === normalizedEmail) {
      if (!roles.includes(CONFIG.ROLES.DIRECTOR)) {
        roles.push(CONFIG.ROLES.DIRECTOR);
      }
    }
  }
  
  // Admin check
  if (normalizedEmail === CONFIG.MANAGER_EMAIL?.toLowerCase() || 
      normalizedEmail === CONFIG.GIANG_EMAIL?.toLowerCase()) {
    if (!roles.includes(CONFIG.ROLES.ADMIN)) {
      roles.push(CONFIG.ROLES.ADMIN);
    }
  }
  
  return roles;
}

function _getUserPICName(userEmail) {
  const rows = _fetchAllRows();
  
  for (const row of rows) {
    if (row.picEmail && row.picEmail.toLowerCase() === userEmail.toLowerCase()) {
      return row.picName;
    }
  }
  
  return null;
}

function _saveUserRole(userEmail, role) {
  const props = PropertiesService.getUserProperties();
  props.setProperty('USER_ROLE_' + userEmail, role);
  props.setProperty('LAST_CHECK_' + userEmail, new Date().getTime().toString());
}

function _getCachedUserRole(userEmail) {
  const props = PropertiesService.getUserProperties();
  const lastCheck = props.getProperty('LAST_CHECK_' + userEmail);
  
  // Cache for 24 hours
  if (lastCheck && (new Date().getTime() - parseInt(lastCheck)) < 24 * 60 * 60 * 1000) {
    return props.getProperty('USER_ROLE_' + userEmail);
  }
  
  return null;
}

function initializeUserAccess() {
  const currentUser = _getCurrentUserEmail();
  
  // ✅ SỬ DỤNG _getUserRoles() THAY VÌ _getUserRole()
  const userRoles = _getUserRoles(currentUser);
  
  if (!userRoles || userRoles.length === 0) {
    _showUnauthorizedDialog();
    return;
  }
  
  // Hiển thị confirmation với TẤT CẢ roles
  _showRoleConfirmation(currentUser, userRoles);
}

function _showRoleConfirmation(userEmail, roles) {
  const ui = _getUi();
  const roleText = {
    [CONFIG.ROLES.PIC]: 'PIC (Person In Charge)',
    [CONFIG.ROLES.HOD]: 'HOD (Head of Department)', 
    [CONFIG.ROLES.DIRECTOR]: 'Director',
    [CONFIG.ROLES.ADMIN]: 'Administrator'
  };
  
  // ✅ TẠO BADGES CHO TẤT CẢ ROLES
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  const roleBadgesHTML = rolesArray.map(role => 
    `<div class="role-badge">${roleText[role] || role}</div>`
  ).join('');
  
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
      .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .role-badge { background: #007bff; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 5px; }
      .btn { padding: 10px 30px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px; }
    </style>
    <div>
      <div class="success">
        <h2>✅ Access Granted!</h2>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Your Roles:</strong></p>
        ${roleBadgesHTML}
        <p>Your role-specific menus will appear after you close this dialog.</p>
        <p><strong>Next steps:</strong> Close dialog → Refresh page if needed</p>
      </div>
      
      <button class="btn" onclick="closeAndRefresh()">Continue & Refresh Menu</button>
    </div>
    
    <script>
      function closeAndRefresh() {
        google.script.run
          .withSuccessHandler(() => {
            google.script.host.close();
            setTimeout(() => {
              location.reload();
            }, 500);
          })
          .refreshUserMenu();
      }
    </script>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(500).setHeight(350),
    'User Access Confirmed'
  );
}
/// ===== MENU SETTINGS =====
const MENU_CONF = {
  TITLE: '📊 Hệ thống báo cáo tự động',
  ADVANCED_SUBMENU: false,              // true = gom 3 mục vào submenu; false = hiển thị ngay như ảnh 2
  ADVANCED_TITLE: '⚙️ Công cụ nâng cao'
};

// Hiển thị đầy đủ menu mỗi lần mở file
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const currentUser = _getCurrentUserEmail();
    const userRoles = _getUserRoles(currentUser);
    
    console.log(`User: ${currentUser}, Roles: ${userRoles.join(', ')}`);
    
    if (!userRoles || userRoles.length === 0) {
      ui.createMenu('🔐 System Access')
        .addItem('🚀 Initialize Access', 'initializeUserAccess')
        .addToUi();
      return;
    }
    
    _createRoleBasedMenu(ui, userRoles, currentUser);
    
  } catch (error) {
    console.error('Error in onOpen:', error);
    ui.createMenu('⚠️ Error - Try Debug')
      .addItem('🚀 Initialize Access', 'initializeUserAccess')
      .addItem('🔧 Debug Access', 'debugUserAccess')
      .addToUi();
  }
}
/**
 * ✅ NEW: Detect URLs trong text và chuyển thành chip link format
 * @param {string} text - Text có thể chứa URLs
 * @returns {string} HTML với chip links
 */
function _detectAndFormatChipLinks(text) {
  if (!text) return '';
  
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  
  // Replace URLs with chip link HTML
  return String(text).replace(urlPattern, function(url) {
    // Shorten display URL
    let displayUrl = url;
    try {
      const urlObj = new URL(url);
      displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 20) + '...' : urlObj.pathname);
    } catch (e) {
      displayUrl = url.length > 40 ? url.substring(0, 40) + '...' : url;
    }
    
    return `<a href="${url}" target="_blank" class="chip-link" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 12px;
      color: #1976d2;
      text-decoration: none;
      font-size: 12px;
      margin: 2px 0;
    ">🔗 ${displayUrl}</a>`;
  });
}

/**
 * ✅ NEW: Extract URLs from text
 * @param {string} text - Text có thể chứa URLs
 * @returns {Array} Array of URL strings
 */
function _extractUrls(text) {
  if (!text) return [];
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  return String(text).match(urlPattern) || [];
}

/**
 * ✅ NEW: Convert URLs in text to Google Sheets HYPERLINK format khi save
 * @param {string} text - Text with URLs
 * @returns {string} Text with URLs converted (or original text)
 */
function _convertUrlsToHyperlinks(text) {
  if (!text) return '';
  
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const urls = String(text).match(urlPattern);
  
  if (!urls || urls.length === 0) {
    return text; // Return original if no URLs
  }
  
  return text; // Keep as plain text, URLs will be clickable in Sheet
}
function _createRoleBasedMenu(ui, userRoles, currentUser) {
  // Admin/Help Menu (always available for all users)
  const adminMenu = ui.createMenu('🔧 Admin/Help')
    .addItem('🚀 Initial Setup', 'initializeUserAccess')
    .addItem('📋 Check System Status', 'checkSystemStatus')
    .addItem('📖 User Guide', 'showUserGuide')
    .addItem('🔄 Reset Access', 'resetUserAccess');
  
  // ✅ TẠO MENU CHO TẤT CẢ ROLES (không dùng switch-case)
  // Kiểm tra xem userRoles có phải là Array không
  const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
  
  // Tạo menu cho từng role
  rolesArray.forEach(role => {
    switch (role) {
      case CONFIG.ROLES.PIC:
        _createPICMenu(ui);
        break;
      case CONFIG.ROLES.HOD:
        _createHODMenu(ui);
        break;
      case CONFIG.ROLES.DIRECTOR:
        _createDirectorMenu(ui);
        break;
      case CONFIG.ROLES.ADMIN:
        _createAdminMenu(ui);
        break;
    }
  });
  
  adminMenu.addToUi();
}

function _createPICMenu(ui) {
  ui.createMenu('👤 PIC Menu')
    .addItem('📊 Cập nhật & Báo cáo', 'picUpdateAndReport')  // 🆕 UPDATED NAME & FUNCTION  // 🆕 UPDATED  // 🆕 CHANGED
    .addItem('📊 Cập nhật kế hoạch tháng', 'showMonthlyUpdateDialogV2')
    .addToUi();
}

function _createHODMenu(ui) {
  ui.createMenu('👑 HOD Menu')
    .addItem('📊 HOD Progress Tracking', '_showHODProgressTrackingDialog')
    .addItem('📊 Cập nhật và gửi báo cáo tháng', 'showMonthlyUpdateDialogV2')
    .addSeparator()  // ✅ THÊM SEPARATOR
    .addItem('📖 User Guide - HOD Tracking', 'showHODProgressTrackingGuide')  // ✅ THÊM MENU ITEM
    .addToUi();
}

function _createDirectorMenu(ui) {
  ui.createMenu('🎩 Director Menu')
    .addItem('📋 View All Reports', 'directorViewAllReports')
    .addItem('📊 Executive Dashboard', 'directorDashboard')
    .addToUi();
}

function _createAdminMenu(ui) {
  ui.createMenu('⚙️ Admin Menu')
    .addItem('🔧 System Setup', 'setupAllTriggers')
    .addItem('🧪 Test Functions', 'showTestMenu')
    .addItem('📊 View All Data', 'showSystemOverview')
    // REMOVED: .addItem('🔒 Lock/Unlock Management', 'showLockUnlockDialog')
    .addToUi();
}
/**
 * ✅ FIXED: HOD xem weekly progress của PIC (MULTI-ROLE SUPPORT)
 */
function hodViewPICWeeklyProgress() {
  const currentUser = _getCurrentUserEmail();
  
  // ✅ FIX: Sử dụng _checkUserHasAnyRole() thay vì check single role
  if (!_checkUserHasAnyRole(currentUser, [CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN])) {
    _getUi().alert('⚠ Access denied. HOD or Admin role required.');
    return;
  }
  
  _showHODPICProgressDialog();
}
/**
 * Show HOD dialog to choose a PIC for this week and options (PDF, reminders).
 * Opens the detailed table via showHODPICProgressDetailDialog(picName, sendPDF, sendReminder).
 */
function _showHODPICProgressDialog() {
  const ui = _getUi();

  // Lấy danh sách PIC theo tuần hiện tại (fallback CONFIG.PIC_LIST)
  const picNames = _getAllPICNames();
  if (!picNames.length) {
    ui.alert('No PIC found for this week. Please check column I (PIC Name).');
    return;
  }

  // Build <option>
  const optionsHtml = picNames.map(n => `<option value="${_htmlEsc(n)}">${_htmlEsc(n)}</option>`).join('');

  // UI: theo guideline “outputs in English”
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 18px; }
      h3 { margin: 0 0 10px; color: #2c5aa0; }
      .row { margin: 12px 0; }
      select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
      label { display: flex; align-items: center; gap: 10px; }
      input[type="checkbox"] { width: 16px; height: 16px; }
      .btns { text-align: center; margin-top: 18px; }
      .btn { padding: 10px 22px; border: none; border-radius: 6px; cursor: pointer; }
      .btn-primary { background: #28a745; color: #fff; }
      .btn-secondary { background: #6c757d; color: #fff; }
      .note { background: #f8f9fa; padding: 10px; border-radius: 6px; font-size: 13px; }
    </style>

    <div>
      <h3>📊 View PIC progress (weekly)</h3>
      <div class="note">
        Select a PIC to view all tasks within this week. You can also ask the system to email you a PDF
        and/or send priority reminders to that PIC.
      </div>

      <div class="row">
        <label for="picSelect"><strong>Choose PIC:</strong></label>
        <select id="picSelect">${optionsHtml}</select>
      </div>

      <div class="row">
        <label><input id="optPdf" type="checkbox" /> Email me a weekly PDF of this PIC</label>
      </div>
      <div class="row">
        <label><input id="optRemind" type="checkbox" /> Send priority reminders to this PIC now</label>
      </div>

      <div class="btns">
        <button class="btn btn-primary" onclick="go()">Continue</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
      </div>
    </div>

    <script>
      function go() {
        const pic = document.getElementById('picSelect').value;
        const sendPDF = document.getElementById('optPdf').checked;
        const sendReminder = document.getElementById('optRemind').checked;

        if (!pic) {
          alert('Please choose a PIC first.');
          return;
        }

        google.script.run
          .withFailureHandler(err => alert('❌ Error: ' + (err && err.message ? err.message : err)))
          .withSuccessHandler(() => {})
          .showHODPICProgressDetailDialog(pic, sendPDF, sendReminder);
      }
    </script>
  `;

  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(520).setHeight(420),
    'View PIC progress'
  );
}

/**
 * Collect unique PIC names from current-week rows.
 * Falls back to CONFIG.PIC_LIST keys if no data found.
 */
function _getAllPICNames() {
  try {
    const rows = _fetchAllRows(); // existing util
    const { monday, saturday } = _weekBounds(new Date()); // existing util

    const set = new Set();
    rows.forEach(r => {
      // r.picName is mapped from column I per CONFIG.COL.PIC_NAME
      if (r && r.picName && _isWithinWeek(r, monday, saturday)) {
        set.add(r.picName);
      }
    });

    // Fallback nếu tuần này chưa có dữ liệu
    if (set.size === 0 && CONFIG && CONFIG.PIC_LIST) {
      Object.keys(CONFIG.PIC_LIST).forEach(k => set.add(k));
    }

    return Array.from(set).sort();
  } catch (err) {
    console.error('_getAllPICNames error:', err);
    // fallback an toàn
    return CONFIG && CONFIG.PIC_LIST ? Object.keys(CONFIG.PIC_LIST) : [];
  }
}

   function showHODPICProgressDetailDialog(picName, sendPDF, sendReminder) {
  // Lấy dữ liệu tuần hiện tại của PIC
  const data = getHODPICWeeklyData(picName); // đã có sẵn: :contentReference[oaicite:7]{index=7}
  
  const ui = SpreadsheetApp.getUi();

  if (!data || data.length === 0) {
    ui.alert('Không có dữ liệu cho PIC ' + picName + ' trong tuần này.');
    return;
  }

  // Build từng hàng (server-side)
  const taskRows = data.map(task => {
    const bgColor = task.priority ? '#fff8cc' : '#ffffff';
    const checked = task.priority ? 'checked' : '';
    const comment = task.managerComment || '';
    return `
      <tr style="background: ${bgColor};" data-row="${task.row}">
        <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;">${task.row}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${task.startDate}</td>
        <td style="border:1px solid #ddd;padding:8px;">${task.keyTask}</td>
        <td style="border:1px solid #ddd;padding:8px;">${task.subTask}</td>
        <td style="border:1px solid #ddd;padding:8px;">${task.taskResult}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;color:#dc3545;font-weight:bold;">${task.deadline}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${task.actualFinishDate}</td>
        <td style="border:1px solid #ddd;padding:8px;text-align:center;">${task.status}</td>
        <td style="border:1px solid #ddd;padding:4px;text-align:center;">
          <input type="checkbox" id="priority_${task.row}" ${checked} style="width:18px;height:18px;">
        </td>
        <td style="border:1px solid #ddd;padding:4px;">
          <textarea id="comment_${task.row}" style="width:100%;height:40px;font-size:11px;" placeholder="Nhập comment...">${comment}</textarea>
        </td>
      </tr>
    `;
  }).join('');

  const { monday, saturday } = _weekBounds(new Date());
  const weekLabel = `${_formatDate(monday)} - ${_formatDate(saturday)}`;

  const detailHtml = `
    <div style="font-family:Arial,sans-serif;padding:15px;">
      <h3 style="color:#2c5aa0;text-align:center;">📋 Tiến độ công việc - ${picName}</h3>
      <p style="text-align:center;"><strong>Tổng số công việc: ${data.length}</strong> | <strong>Tuần:</strong> ${weekLabel}</p>

      <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;margin:10px 0;min-width:1200px;">
          <thead>
            <tr style="background:#2c5aa0;color:white;">
              <th style="border:1px solid #ddd;padding:10px;width:50px;">Row</th>
              <th style="border:1px solid #ddd;padding:10px;width:80px;">Start Date</th>
              <th style="border:1px solid #ddd;padding:10px;width:120px;">Key Task</th>
              <th style="border:1px solid #ddd;padding:10px;width:120px;">Sub Task</th>
              <th style="border:1px solid #ddd;padding:10px;width:200px;">Task Result</th>
              <th style="border:1px solid #ddd;padding:10px;width:80px;">⚠️ Deadline</th>
              <th style="border:1px solid #ddd;padding:10px;width:80px;">Actual Finish</th>
              <th style="border:1px solid #ddd;padding:10px;width:100px;">Status</th>
              <th style="border:1px solid #ddd;padding:10px;width:80px;">⭐ Priority</th>
              <th style="border:1px solid #ddd;padding:10px;width:150px;">Manager Comment</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>
      </div>

      <div style="text-align:center;margin-top:20px;">
        <button onclick="confirmActions('${picName}', ${sendPDF}, ${sendReminder})"
                style="padding:12px 25px;background:#28a745;color:white;border:none;border-radius:4px;margin:5px;">
          ✅ Xác nhận
        </button>
        <button onclick="google.script.host.close()"
                style="padding:12px 25px;background:#6c757d;color:white;border:none;border-radius:4px;margin:5px;">
          Đóng
        </button>
      </div>
    </div>

    <script>
      function confirmActions(picName, sendPDF, sendReminder) {
        const rows = document.querySelectorAll('table tbody tr');
        const updates = [];
        let priorityCount = 0;

        rows.forEach(row => {
          const rowNum = row.getAttribute('data-row');
          const priority = document.getElementById('priority_' + rowNum).checked;
          const comment = document.getElementById('comment_' + rowNum).value;

          updates.push({ row: parseInt(rowNum), priority: priority, managerComment: comment });
          if (priority) priorityCount++;
        });

        let confirmMsg = \`Bạn đã tạo nhắc nhở cho \${picName} với \${priorityCount} công việc quan trọng\`;
        if (sendPDF) confirmMsg += \` và muốn nhận email theo dõi công việc của \${picName} trong tuần này\`;
        if (sendReminder && priorityCount > 0) confirmMsg += \` và gửi email nhắc việc quan trọng\`;
        confirmMsg += \`. Bạn xác nhận chứ??\`;

        if (confirm(confirmMsg)) {
          google.script.run
            .withSuccessHandler((message) => {
              alert('✅ ' + message);
              google.script.host.close();
            })
            .withFailureHandler((error) => {
              alert('❌ Lỗi: ' + error.message);
            })
            .processHODPICActions(picName, updates, sendPDF, sendReminder);
        }
      }
    </script>
  `;

  ui.showModalDialog(
    HtmlService.createHtmlOutput(detailHtml).setWidth(1300).setHeight(700),
    `Tiến độ công việc - ${picName}`
  );
}
/**
 * Lấy data cho HOD PIC Weekly Progress
 * ✅ ĐÚNG COLUMNS MAPPING
 */
function getHODPICWeeklyData(selectedPIC) {
  const rows = _fetchAllRows();
  const { monday, saturday } = _weekBounds(new Date());
  
  const picRows = rows.filter(r => 
    r.picName === selectedPIC && 
    _isWithinWeek(r, monday, saturday)
  );
  
  if (picRows.length === 0) {
    return [];
  }
  
  // ✅ FIX: Map đúng columns
  return picRows.map(row => ({
    row: row.row,
    startDate: _fmtDateCell(row.start),          // ✅ Column K - Start Date
    keyTask: row.key || 'N/A',                   // ✅ Column F - Key Task
    subTask: row.sub || 'N/A',                   // ✅ Column G - Sub Task
    taskResult: row.result || 'N/A',             // ✅ Column H - Task Result
    deadline: _fmtDateCell(row.deadline),        // ✅ Column M - Deadline
    actualFinishDate: _fmtDateCell(row.actualFinishDate), // Column P (nếu có)
    status: row.status || 'N/A',                 // ✅ Column O - Status
    priority: row.priority || false,             // ✅ Column S - Priority (TRUE/FALSE)
    behavior: row.behavior || 'N/A',             // ✅ Column Q - Behavior
    managerComment: row.managerComment || ''     // Column R - Manager Comment
  }));
}

function processHODPICActions(picName, updates, sendPDF, sendReminder) {
  const currentUser = _getCurrentUserEmail();
  const sh = _sheet();
  
  // Cập nhật Priority và Manager Comment
  updates.forEach(update => {
    try {
      sh.getRange(update.row, CONFIG.COL.PRIORITY).setValue(update.priority);
      sh.getRange(update.row, CONFIG.COL.MANAGER_COMMENT).setValue(update.managerComment);
    } catch (error) {
      console.error(`Error updating row ${update.row}:`, error);
    }
  });
  
  let resultMessage = `Đã cập nhật ${updates.length} công việc cho ${picName}.`;
  const priorityTasks = updates.filter(u => u.priority);
  
  // Gửi PDF Report nếu được chọn
  // Gửi PDF Report nếu được chọn
  if (sendPDF) {
    try {
      const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
      const weekLabel = `${_formatDate(monday, 'dd/MM/yy')} - ${_formatDate(saturday, 'dd/MM/yy')}`;
      const planLabel = `${_formatDate(nextMonday, 'dd/MM/yy')} - ${_formatDate(nextSaturday, 'dd/MM/yy')}`;
      
      // ✅ FIX: Lấy lại FULL DATA từ sheet thay vì dùng updates
      const allRows = _fetchAllRows();
      const picRows = allRows.filter(r => r.picName === picName);
      
      // Lấy data tuần này
      const thisWeekRows = picRows.filter(r => _isWithinWeek(r, monday, saturday));
      
      // Cập nhật priority và comment vào thisWeekRows dựa trên updates
      thisWeekRows.forEach(task => {
        const update = updates.find(u => u.row === task.row);
        if (update) {
          task.priority = update.priority;
          task.managerComment = update.managerComment;
        }
      });
      
      // Lấy next week data
      const nextWeekRows = picRows.filter(r => _isWithin(r.start, nextMonday, nextSaturday));
      
      // ✅ Bây giờ thisWeekRows đã có ĐẦY ĐỦ: key, sub, result, priority, managerComment
      const pdfBlob = _generatePICProgressPDF(picName, thisWeekRows, nextWeekRows, weekLabel, planLabel);
      
      const subject = `[PDF REPORT] Theo dõi công việc ${picName} - Tuần ${weekLabel}`;
      const htmlBody = _buildDetailedPICProgressEmailHTML(picName, thisWeekRows, nextWeekRows, weekLabel, planLabel);
      
      mmhMail_({
        to: currentUser,
        cc: CONFIG.MANAGER_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
        attachments: [pdfBlob]
      });
      
      resultMessage += `\n📄 Đã gửi PDF báo cáo về email ${currentUser}.`;
    } catch (error) {
      console.error('PDF generation error:', error);
      resultMessage += `\n⚠️ Lỗi tạo PDF: ${error.message}`;
    }
  }
  
  // Gửi email nhắc việc quan trọng nếu được chọn
  if (sendReminder && priorityTasks.length > 0) {
  try {
    const picEmail = _resolvePicEmail(picName, '');
    if (picEmail) {
      const { monday, saturday } = _weekBounds(new Date());
      const weekLabel = `${_formatDate(monday)} - ${_formatDate(saturday)}`;
      const subject = `Important Tasks Reminder for ${picName} * Week ${weekLabel}`;
      
      // ✅ FIX: Transform data properties để match với email template
      const transformedTasks = priorityTasks.map(task => ({
        row: task.row,
        key: task.keyTask,           // ✅ keyTask → key
        sub: task.subTask,           // ✅ subTask → sub
        start: task.startDate,       // ✅ startDate → start
        deadline: task.deadline,
        status: task.status,
        behavior: task.behavior,
        managerComment: task.managerComment || ''
      }));
      
      const emailBody = _buildHODPriorityReminderEmailHTML(picName, transformedTasks, weekLabel);
      
      mmhMail_({
        to: picEmail,
        cc: currentUser,
        subject: subject,
        htmlBody: emailBody,
        name: 'Marketing Task Management System'
      });
      
      resultMessage += `\n📧 Sent priority reminder email to ${picName} (${priorityTasks.length} tasks).`;
    } else {
      resultMessage += `\n❌ Cannot find email for ${picName}.`;
    }
  } catch (error) {
    console.error('Priority reminder email error:', error);
    resultMessage += `\n❌ Error sending reminder email: ${error.message}`;
  }
}
  
  return resultMessage;
}

function _generateHODPICProgressPDF(picName, weekLabel, taskData) {
  try {
    const fileName = `Theo_doi_cong_viec_${picName}_${weekLabel.replace(/[\/\-\s]/g, '_')}`;
    const doc = DocumentApp.create(fileName);
    const body = doc.getBody();
    
    // Clear and setup
    body.clear();
    body.setMarginTop(25).setMarginBottom(25).setMarginLeft(25).setMarginRight(25);
    
    // Header
    const title = body.appendParagraph(`📊 BÁO CÁO THEO DÕI CÔNG VIỆC`);
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
         .setFontSize(18).setBold(true).setForegroundColor('#2c5aa0');
    
    const subtitle = body.appendParagraph(`${picName} - ${weekLabel}`);
    subtitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
           .setFontSize(14).setBold(true).setForegroundColor('#1e3d72');
    
    body.appendParagraph('');
    
    // Summary stats
    const priorityCount = taskData.filter(t => t.priority).length;
    const statsTable = body.appendTable();
    statsTable.setBorderWidth(1).setBorderColor('#dee2e6');
    
    const statsData = [
      ['PIC', picName],
      ['Tuần báo cáo', weekLabel],
      ['Tổng công việc', taskData.length.toString()],
      ['Công việc quan trọng', priorityCount.toString()],
      ['Được tạo bởi', 'HOD'],
      ['Thời gian tạo', new Date().toLocaleString()]
    ];
    
    statsData.forEach(([label, value]) => {
      const row = statsTable.appendTableRow();
      const labelCell = row.appendTableCell(label);
      const valueCell = row.appendTableCell(value);
      
      labelCell.setBackgroundColor('#e8f4fd');
      labelCell.setPaddingTop(8).setPaddingBottom(8);
      valueCell.setBackgroundColor('#ffffff');
      valueCell.setPaddingTop(8).setPaddingBottom(8);
      valueCell.getChild(0).asParagraph().setBold(true);
    });
    
    body.appendParagraph('');
    
    // Task details
    if (taskData.length > 0) {
      const taskTitle = body.appendParagraph('📋 CHI TIẾT CÔNG VIỆC');
      taskTitle.setFontSize(14).setBold(true).setForegroundColor('#2c3e50');
      
      const table = body.appendTable();
      table.setBorderWidth(1).setBorderColor('#dee2e6');
      
      // Header row
      const headerRow = table.appendTableRow();
      const headers = ['Row', 'Key Task', 'Sub Task', 'Deadline', 'Status', 'Priority', 'Manager Comment'];
      
      headers.forEach(headerText => {
        const cell = headerRow.appendTableCell(headerText);
        cell.setBackgroundColor('#2c5aa0');
        cell.getChild(0).asParagraph()
            .setForegroundColor('#ffffff')
            .setBold(true)
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        cell.setPaddingTop(10).setPaddingBottom(10);
      });
      
      // Data rows
      taskData.forEach(task => {
        const row = table.appendTableRow();
        const bgColor = task.priority ? '#fff8cc' : '#ffffff';
        
        const rowData = [
          task.row.toString(),
          task.keyTask,
          task.subTask,
          task.deadline,
          task.status,
          task.priority ? '⭐ Yes' : 'No',
          task.managerComment || 'N/A'
        ];
        
        rowData.forEach(cellData => {
          const cell = row.appendTableCell(cellData);
          cell.setBackgroundColor(bgColor);
          cell.setPaddingTop(8).setPaddingBottom(8);
          cell.getChild(0).asParagraph().setFontSize(10);
          cell.getChild(0).asParagraph().setForegroundColor('#000000');
        });
      });
    }
    
    // Footer
    body.appendParagraph('');
    const footer = body.appendParagraph(`Generated: ${new Date().toLocaleString()}`);
    footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
          .setFontSize(10).setItalic(true).setForegroundColor('#6c757d');
    
    doc.saveAndClose();
    Utilities.sleep(2000);
    
    const docId = doc.getId();
    const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
    pdfBlob.setName(fileName + '.pdf');
    
    DriveApp.getFileById(docId).setTrashed(true);
    return pdfBlob;
    
  } catch (error) {
    console.error('HOD PDF generation error:', error);
    // Fallback to text content
    const textContent = `BÁO CÁO THEO DÕI CÔNG VIỆC\n${picName} - ${weekLabel}\n\nTổng công việc: ${taskData.length}\nCông việc quan trọng: ${taskData.filter(t => t.priority).length}\n\nCHI TIẾT:\n${taskData.map((t, i) => `${i+1}. [Row ${t.row}] ${t.keyTask} - ${t.subTask} (Priority: ${t.priority ? 'Yes' : 'No'})`).join('\n')}`;
    
    return Utilities.newBlob(textContent, 'text/plain', picName + '_progress.txt');
  }
}

/**
 * ✅ FIXED: Build HOD Priority Reminder Email HTML
 * - Fixed table headers (8 columns with proper labels)
 * - Changed header color from red (#e74c3c) to blue (#2c5aa0)
 * - Improved contrast and readability
 * - Proper column styling
 */
/**
 * âœ… FIXED: Build HOD Priority Reminder Email HTML với đủ 8 columns
 * COLUMNS: Row, Key Task, Sub Task, Start Date, Deadline, Status, Behavior, Manager Comment
 */
function _buildHODPriorityReminderEmailHTML(picName, priorityTasks, weekLabel) {
  const currentDate = _formatDate(new Date(), 'dd/MM/yyyy HH:mm');
  const fileLink = _getFileLink();
  
  // âœ… Build table với đúng data mapping
  const taskRows = priorityTasks.map((task, index) => {
    // âœ… MAP ĐÚNG CÁC COLUMNS
    const rowNum = task.row || '';
    const keyTask = task.key || task.keyTask || 'No data'; // Column F
    const subTask = task.sub || task.subTask || 'No data'; // Column G
    const startDate = task.start || task.startDate ? _formatDate(task.start || task.startDate, 'dd/MM/yy') : 'N/A'; // Column K
    const deadline = task.deadline ? _formatDate(task.deadline, 'dd/MM/yy') : 'N/A'; // Column M
    const status = task.status || 'N/A'; // Column O
    const behavior = task.behavior || 'N/A'; // Column Q
    const managerComment = task.managerComment || 'N/A'; // Column R
    
    return `
    <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${rowNum}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${keyTask}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${subTask}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${startDate}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #dc3545; font-weight: bold;">${deadline}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${status}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${behavior}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${managerComment}</td>
    </tr>
    `;
  }).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .task-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .task-table th { background: #2c5aa0; color: white; padding: 10px; text-align: left; }
    </style>
</head>
<body>
    <div class="header">
        <h2>⚠️ IMPORTANT TASK REMINDER</h2>
        <h3>${picName}</h3>
        <p>Week: ${weekLabel}</p>
        <p>Generated: ${currentDate}</p>
    </div>
    
    <div style="background: #fff8e1; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <strong>📌 Note:</strong> You have <strong>${priorityTasks.length}</strong> priority tasks that need your attention this week.
    </div>
    
    <table class="task-table">
        <thead>
            <tr>
                <th>Row</th>
                <th>Key Task</th>
                <th>Sub Task</th>
                <th>Start Date</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Behavior</th>
                <th>Manager Comment</th>
            </tr>
        </thead>
        <tbody>
            ${taskRows}
        </tbody>
    </table>
    
    ${fileLink ? `
    <div style="text-align: center; margin: 20px 0;">
        <a href="${fileLink}" style="padding: 12px 25px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 6px;">
            📊 View in Sheet
        </a>
    </div>
    ` : ''}
    
    <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; margin-top: 30px;">
        <p><strong>Marketing Task Management System</strong></p>
        <p>Auto-generated Priority Reminder | ${currentDate}</p>
    </div>
</body>
</html>
  `;
}
// Đảm bảo cài add-on/trigger xong là có menu ngay
function onInstall(e) {
  onOpen(e);
}


function showInitializeDialog() {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    _showUnauthorizedDialog();
    return;
  }

  // Kiểm tra xem triggers đã được setup chưa
  const triggers = ScriptApp.getProjectTriggers();
  const hasAllTriggers = triggers.some(t => t.getHandlerFunction() === 'onEditInstallable') &&
                        triggers.some(t => t.getHandlerFunction() === 'weeklyReportJob') &&
                        triggers.some(t => t.getHandlerFunction() === 'dailyPriorityReminderJob');

  const ui = _getUi();
  let html;

  if (hasAllTriggers) {
    // Hệ thống đã được setup
    html = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .success { background: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: #155724; }
        .info { background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; color: #0c5460; }
        .button-group { margin-top: 20px; text-align: center; }
        .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary { background: #28a745; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
      </style>
      <div>
        <div class="success">
          <h2>✅ Hệ thống đã sẵn sàng!</h2>
          <p><strong>Chào mừng ${picName}!</strong></p>
          <p>Email của bạn: <strong>${currentUser}</strong></p>
        </div>
        
        <div class="info">
          <h3>🎯 Hệ thống đang hoạt động:</h3>
          <p>• ✅ Triggers tự động đã được cài đặt</p>
          <p>• ✅ Email báo cáo tuần tự động: Thứ 7, 17:00</p>
          <p>• ✅ Email nhắc nhở hàng ngày: 8:30</p>
          <p>• ✅ Bảo vệ dữ liệu tự động</p>
        </div>

        <div class="button-group">
          <button class="btn btn-primary" onclick="showGuide()">Xem hướng dẫn sử dụng</button>
          <button class="btn btn-secondary" onclick="google.script.host.close()">Đóng</button>
        </div>
      </div>
      
      <script>
        function showGuide() {
          google.script.run.showUserGuide();
          google.script.host.close();
        }
      </script>
    `;
  } else {
    // Cần setup hệ thống
    html = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .welcome { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .step { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #4285f4; }
        .button-group { margin-top: 20px; text-align: center; }
        .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; }
        .btn-primary { background: #4285f4; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
      </style>
      <div>
        <div class="welcome">
          <h2>🎉 Chào mừng ${picName} đến với Hệ thống Báo cáo Tự động!</h2>
          <p>Email của bạn: <strong>${currentUser}</strong></p>
        </div>
        
        <h3>📋 THIẾT LẬP LẦN ĐẦU:</h3>
        <div class="step">1. Nhấn "Cài đặt hệ thống" để khởi tạo triggers tự động</div>
        <div class="step">2. Cấp quyền khi hệ thống yêu cầu</div>
        <div class="step">3. Chờ thông báo "Thiết lập hoàn tất"</div>
        <div class="step">4. Hệ thống sẵn sàng sử dụng!</div>

        <div class="button-group">
          <button class="btn btn-primary" onclick="setupSystem()">Cài đặt hệ thống</button>
          <button class="btn btn-secondary" onclick="showGuide()">Xem hướng dẫn</button>
          <button class="btn btn-secondary" onclick="google.script.host.close()">Đóng</button>
        </div>
      </div>
      
      <script>
        function setupSystem() {
          google.script.run
            .withSuccessHandler(() => {
              alert('✅ Thiết lập hoàn tất! Hệ thống đã sẵn sàng sử dụng.');
              google.script.host.close();
            })
            .withFailureHandler((error) => {
              alert('❌ Lỗi: ' + error.message);
            })
            .setupAllTriggers();
        }
        
        function showGuide() {
          google.script.run.showUserGuide();
          google.script.host.close();
        }
      </script>
    `;
  }
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(600).setHeight(500),
    'Hệ thống báo cáo tự động - Marketing MMH'
  );
}



function checkSystemStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  const onEditTrigger = triggers.find(t => t.getHandlerFunction() === 'onEditInstallable');
  const weeklyTrigger = triggers.find(t => t.getHandlerFunction() === 'weeklyReportJob');
  const dailyTrigger = triggers.find(t => t.getHandlerFunction() === 'dailyPriorityReminderJob');
  
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  const isManager = currentUser === CONFIG.MANAGER_EMAIL;
  const isGiang = currentUser === CONFIG.GIANG_EMAIL;
  
  let status = `
📊 TRẠNG THÁI HỆ THỐNG BÁO CÁO TỰ ĐỘNG

👤 Thông tin người dùng:
Email: ${currentUser}
PIC: ${picName || 'Không xác định'}
Quyền: ${isManager ? 'Manager' : isGiang ? 'Manager/Giang' : 'User'}

🔧 Trạng thái Triggers:
• Edit Trigger: ${onEditTrigger ? '✅ Hoạt động' : '❌ Chưa cài đặt'}
• Weekly Report: ${weeklyTrigger ? '✅ Hoạt động' : '❌ Chưa cài đặt'}
• Daily Reminder: ${dailyTrigger ? '✅ Hoạt động' : '❌ Chưa cài đặt'}

📋 Hệ thống: ${triggers.length >= 3 ? '✅ Đã thiết lập đầy đủ' : '⚠️ Cần thiết lập lại'}

📁 Cấu trúc cột mới:
Q: Manager Comment | R: Priority | S: Confirm | T: Lock
U: Email PIC | V: Send Weekly | W: CC Email

🎯 Tính năng cho tất cả user:
• ✅ Xem tiến độ theo PIC
• ✅ Gửi nhắc Priority Tasks
• ✅ Gửi báo cáo manual
  `;
  
  _getUi().alert(status);
}

function resetUserAccess() {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    _getUi().alert('❌ Bạn không có quyền truy cập hệ thống này.');
    return;
  }
  
  _getUi().alert(`✅ Reset quyền truy cập thành công cho ${picName}!\nEmail: ${currentUser}`);
}

// ================================ USER MANAGEMENT =====================================

function _getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

function _getUserPICName(email) {
  for (const [picName, picEmail] of Object.entries(CONFIG.PIC_LIST)) {
    if (picEmail === email) {
      return picName;
    }
  }
  return null;
}

function _isManagerOrGiang(email) {
  return email === CONFIG.MANAGER_EMAIL || email === CONFIG.GIANG_EMAIL;
}

function _showUnauthorizedDialog() {
  const ui = _getUi();
  const currentUser = _getCurrentUserEmail();
  
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
      .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .contact { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
    <div>
      <h2>🚫 Không có quyền truy cập</h2>
      
      <div class="error">
        <p><strong>Email của bạn:</strong> ${currentUser}</p>
        <p>Email này không có trong danh sách được phép sử dụng hệ thống.</p>
      </div>
      
      <div class="contact">
        <h3>📞 Liên hệ để được cấp quyền:</h3>
        <p><strong>Manager:</strong> tt.tuyen@manimedicalhanoi.com</p>
      </div>
      
      <button onclick="google.script.host.close()" 
              style="padding:10px 30px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">
        Đóng
      </button>
    </div>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(500).setHeight(300),
    'Quyền truy cập bị từ chối'
  );
}

// ================================ TRIGGERS =============================================

function onEditInstallable(e) {
  try {
    const sh = e && e.range && e.range.getSheet();
    if (!sh || sh.getName() !== CONFIG.SHEET_NAME) return;

    const row = e.range.getRow(), col = e.range.getColumn();
    if (row < CONFIG.DATA_START_ROW) return;

    const currentUser = _getCurrentUserEmail();
    const isManagerOrGiang = _isManagerOrGiang(currentUser);

    // Check if trying to edit restricted columns - CẬP NHẬT vị trí cột Priority
    if (col === CONFIG.COL.PRIORITY && !isManagerOrGiang) { // Priority giờ ở cột S
      SpreadsheetApp.getActive().toast('Chỉ Manager và PIC Giang mới có quyền sửa cột này.', 'Không có quyền', 5);
      e.range.setValue('');
      return;
    }

    // Handle priority checking
    if (col === CONFIG.COL.PRIORITY) {
      _handlePriorityCheck(e);
    }

    // Auto-format date columns - CẬP NHẬT với cột mới
    if (col === CONFIG.COL.START || col === CONFIG.COL.FINISH || col === CONFIG.COL.DEADLINE || col === CONFIG.COL.ACTUAL_FINISH_DATE) {
      e.range.setNumberFormat(CONFIG.DATE_FMT_SHEET);
    }
    
    // Auto-format Start Week column (nếu cần format đặc biệt)
    if (col === CONFIG.COL.START_WEEK) {
      // Có thể thêm format logic cho Start Week nếu cần
      // Ví dụ: format as "Week 1", "Week 2", etc.
    }
    
  } catch (err) {
    console.error(`onEditInstallable error: ${err.stack}`);
    SpreadsheetApp.getActive().toast(`Error: ${err.message}`, 'Error', 8);
  }
}

// ============================== PRIORITY MAIL (R) ======================================

function _handlePriorityCheck(e) {
  if (e.value !== 'TRUE' || e.range.getRow() < CONFIG.DATA_START_ROW) return;
  const all = _fetchAllRows();
  const cur = all.find(r => r.row === e.range.getRow());
  if (!_validateTaskRow(cur)) {
    _getUi().alert('Please fill "Key Task", "Sub Task" and "Deadline" before sending reminder.');
    e.range.setValue(false); return;
  }
  const related = _findRelatedTasks(cur.key, cur.row, all);
  if (related.length) _showAutofillConfirmationDialog(cur, related);
  else processAutofillAndSendEmails('[]', cur.row);
}

function _showAutofillConfirmationDialog(sourceTask, relatedTasks) {
  const ui = _getUi();
  let html = `
  <style>body{font-family:Arial;font-size:14px}ul{list-style:none;padding:0}li{margin:8px 0}
  label{display:flex;align-items:center}input{margin-right:10px}.buttons{margin-top:16px}</style>
  <div>
    <p>Found tasks under same Key Task "<b>${_htmlEsc(sourceTask.key)}</b>". Send reminders?</p>
    <form id="f"><ul>`;
  relatedTasks.forEach(t => html +=
    `<li><label><input type="checkbox" name="taskRow" value="${t.row}" checked>
    <span>Row ${t.row}: ${_htmlEsc(t.sub)} (PIC: ${_htmlEsc(t.picName)})</span></label></li>`);
  html += `</ul></form><div class="buttons">
    <button onclick="run(true)">Send selected</button>
    <button onclick="run(false)">Only current</button></div></div>
    <script>
      function sel(){var a=document.getElementsByName('taskRow'),o=[];for(var i=0;i<a.length;i++)if(a[i].checked)o.push(+a[i].value);return JSON.stringify(o)}
      function run(all){google.script.run.withSuccessHandler(google.script.host.close)
        .processAutofillAndSendEmails(all?sel():'[]', ${sourceTask.row});}
    </script>`;
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(360), 'Confirm bulk reminder');
}

function processAutofillAndSendEmails(selectedRelatedRowsJSON, sourceRow) {
  const sh = _sheet();
  const all = _fetchAllRows();
  const selected = JSON.parse(selectedRelatedRowsJSON || '[]');
  const src = all.find(r => r.row === sourceRow);
  if (!src) return;

  const send = [src];
  selected.forEach(rn => { 
    sh.getRange(rn, CONFIG.COL.PRIORITY).setValue(true);
    const t = all.find(x => x.row === rn); 
    if (t) send.push(t); 
  });

  let n = 0; 
  const props = PropertiesService.getDocumentProperties();
  send.forEach(r => {
    const key = _reminderKey(new Date(), r.row);
    if (!props.getProperty(key)) { 
      _sendPriorityEmailForRow(r); 
      props.setProperty(key, 'sent'); 
      n++; 
    }
  });
  SpreadsheetApp.getActive().toast(n ? `Sent ${n} reminder email(s).` : `Already sent today.`, 'Info', 5);
}

function _validateTaskRow(r){return !!(r && r.key && r.sub && r.deadline);}

function _findRelatedTasks(key, srcRow, all){
  if(!key) return [];
  return all.filter(r => r.row !== srcRow && r.key === key && (r.status||'') !== CONFIG.STATUS.COMPLETED);
}

function _sendPriorityEmailForRow(r){
  const picEmail = _resolvePicEmail(r.picName, r.picEmail);
  if(!picEmail){console.warn(`No email for PIC "${r.picName}" at row ${r.row}`); return;}
  const subject = `[PRIORITY] ${_htmlEsc(r.picName||'')} — ${_htmlEsc(r.key||'Daily task')} — Deadline: ${_fmtDateCell(r.deadline)}`;
  const infoBox = _buildInfoBox('Task Status Information:', [
    `Key task: <b>${_valOrDash(r.key)||'Daily task'}</b>`,
    `Sub task: <b>${_valOrDash(r.sub)}</b>`,
    `Manager Comment: <b>${_valOrDash(r.managerComment)}</b>`,
    `Deadline: <b>${_fmtDateCell(r.deadline)}</b>`,
    `Status: <b>${_valOrDash(r.status)||'N/A'}</b>`
  ]);
  const table = _buildFullTable([r], { includeRowIndex: true, includeManagerComment: true });
  const link = _getFileLink();
  const body = `
  <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.4;color:#222;">
    ${_buildHeader('Please review the following urgent task:')}
    ${_buildDetailTopBlock(r.picName || '', _formatDate(new Date()), '', '')}
    ${infoBox}
    ${table}
    ${_buildLegend()} 
    ${link ? _buildCTA('View Detail in Sheet', link) : ''}
    <p style="margin-top:10px;">(Auto-generated by Apps Script)</p>
  </div>`;
  _sendMail({toList:[picEmail], ccList:[CONFIG.PRIORITY_CC], subject, htmlBody: body});
}

// =============================== LOCK / UNLOCK ========================================



// =========================== WEEKLY REPORT & REMINDER =================================

function weeklyReportJob(){
  const rows = _fetchAllRows();
  const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
  
  // REMOVED: lock checking logic
  
  const weekLabel = `From ${_twoDigitYear(monday)} - ${_twoDigitYear(saturday)}`;
  const planLabel = `${_twoDigitYear(nextMonday)} - ${_twoDigitYear(nextSaturday)}`;
  const fileLink = _getFileLink();
  
  // Group rows by HOD email addresses (column U) - using hodEmail instead of weeklyExtra
  const emailGroups = new Map();
  
  rows.forEach(row => {
    if (!row.hodEmail) return; // Skip rows without HOD emails
    
    const emails = _dedupeEmails([row.hodEmail]);
    emails.forEach(email => {
      if (!emailGroups.has(email)) {
        emailGroups.set(email, []);
      }
      emailGroups.get(email).push(row);
    });
  });

  emailGroups.forEach((groupRows, emailAddress) => {
    try {
      const thisWeekRows = _filterWeekRows(groupRows, monday, saturday);
      const nextWeekRows = _filterNextWeekRows(groupRows, nextMonday, nextSaturday);
      
      if (thisWeekRows.length === 0 && nextWeekRows.length === 0) return;

      // Calculate metrics
      const totalTask = thisWeekRows.length;
      const completedRows = thisWeekRows.filter(r => (r.status||'').toString().trim() === CONFIG.STATUS.COMPLETED);
      const completedCount = completedRows.length;
      const inprogressCount = thisWeekRows.filter(r => _isPendingStatus(r.status)).length;
      const importantCompletedCount = completedRows.filter(r => !!r.priority).length;
      const onTimeCount = thisWeekRows.filter(r => (r.behavior||'').toString().trim().toLowerCase() === 'on time').length;
      const otcr = totalTask ? Math.round((onTimeCount/totalTask)*1000)/10 : 0;

      // Build tables
      const tblCompleted = _buildFullTable(completedRows, { includeRowIndex: true, includeManagerComment: true });
      const inProgRows = thisWeekRows.filter(r => _isPendingStatus(r.status));
      const tblInProgress = _buildInProgressTable(inProgRows);
      const tblPlanNext = _buildPlanNextTable(nextWeekRows, { includeRowIndex: true });

      // Build email
      const allRows = thisWeekRows.concat(nextWeekRows);
      const pics = Array.from(new Set(allRows.map(r => r.picName).filter(Boolean))).join(', ');
      
      const subject = `Weekly Report * ${weekLabel} _Plan week ${planLabel}`;
      const body = _buildWeeklyEmailHTML({
        pic: pics, 
        weekLabel, 
        planLabel, 
        fileLink,
        totals: { totalTask, completedCount, inprogressCount, importantCompletedCount, otcr },
        tables: { tblCompleted, tblInProgress, tblPlanNext }
      });

      // Collect CC emails from all rows in this group
      const ccEmails = _dedupeEmails(allRows.map(r => r.ccEmail).filter(Boolean));
      
      const toList = [emailAddress];
      const ccList = ccEmails;

      _sendMail({ toList, ccList, subject, htmlBody: body });
      
      // REMOVED: _markRowsAsLocked(allRows);
      
      Utilities.sleep(700);
    } catch(err){ 
      console.error(`Weekly for email "${emailAddress}" error: ${err}`); 
    }
  });
}



function dailyPriorityReminderJob(){
  const rows = _fetchAllRows(), today = new Date();
  const props = PropertiesService.getDocumentProperties();
  rows.forEach(r =>{
    if (r.priority && (r.status||'').trim() !== CONFIG.STATUS.COMPLETED) {
      const key = _reminderKey(today, r.row);
      if(!props.getProperty(key)){ 
        _sendPriorityEmailForRow(r); 
        props.setProperty(key,'sent'); 
      }
    }
  });
}

/**
 * 🆕 UPDATED: Check if status is "Pending" (In Progress variants)
 * Now supports 5-level status system
 * @param {string} status
 * @returns {boolean}
 */
function _isPendingStatus(status) {
  const pendingStatuses = [
    'In Progress 25%',
    'In Progress 50%',
    'In Progress 75%',
    'In Progress',      // Keep old format for backward compatibility
    'On Hold',          // Keep old format for backward compatibility
    'Delayed'           // Keep old format for backward compatibility
  ];
  return status && pendingStatuses.includes(status.trim());
}

function _reminderKey(date,row){
  const y = Utilities.formatDate(date, _tz(), 'yyyyMMdd');
  return `REMINDER_${y}_ROW_${row}`;
}

function _isWithinWeek(row, monday, saturday) {
  // Chỉ kiểm tra Start Date (cột K)
  if (!row.start) return false;
  return _isWithin(row.start, monday, saturday);
}

// ================================ UTILITIES & HTML =====================================

function _getUi(){ return SpreadsheetApp.getUi(); }
function _sheet(){
  const sh = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_NAME);
  if(!sh) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found.`);
  return sh;
}
function _tz(){ return CONFIG.TIMEZONE; }
function _formatDate(dt, pattern = CONFIG.DATE_FMT_BODY){
  if(!dt) return '';
  try{ return Utilities.formatDate(dt, _tz(), pattern); }catch(_){ return ''; }
}
function _twoDigitYear(date){ return _formatDate(date, CONFIG.DATE_FMT_SUBJECT); }
function _htmlEsc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _buildWeeklyReportFileName(picName, referenceDate = new Date()) {
  // Tính tuần hiện tại (thứ 2 đến thứ 7)
  const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(referenceDate);
  
  // Format dd/mm/yy cho tuần hiện tại
  const currentWeekStart = _formatDate(monday, 'dd/MM/yy');
  const currentWeekEnd = _formatDate(saturday, 'dd/MM/yy');
  
  // Format dd/mm/yy cho tuần kế tiếp  
  const nextWeekStart = _formatDate(nextMonday, 'dd/MM/yy');
  const nextWeekEnd = _formatDate(nextSaturday, 'dd/MM/yy');
  
  // Format: "PIC"_Weekly Report XX-YY _Plan ZZ-UU
  return `${picName}_Weekly Report ${currentWeekStart}-${currentWeekEnd} _Plan ${nextWeekStart}-${nextWeekEnd}`;
}
function _valOrDash(v){ return v ? _htmlEsc(String(v)) : '-'; }
function _fmtDateCell(dt){ return dt ? _formatDate(dt, CONFIG.DATE_FMT_BODY) : '-'; }

function _toDate(v){
  if(v instanceof Date) return v;
  if(typeof v==='number' && v>1) return new Date(Math.round((v-25569)*86400*1000));
  if(typeof v==='string' && v.trim()){
    const p=v.trim().split(/[\/\-\.]/); 
    if(p.length>=3){ 
      const d=+p[0], m=(+p[1])-1, y=+p[2]; 
      const dt=new Date(y<100?2000+y:y,m,d); 
      if(!isNaN(dt)) return dt; 
    }
  }
  return null;
}

function _fetchAllRows(){
  const sh=_sheet(), last=sh.getLastRow();
  if(last<CONFIG.DATA_START_ROW) return [];
  const num=last-CONFIG.DATA_START_ROW+1;
  const values=sh.getRange(CONFIG.DATA_START_ROW,1,num,sh.getLastColumn()).getValues();
  return values.map((r,i)=>_rowToObj(r,i+CONFIG.DATA_START_ROW)).filter(o=>o.picName);
}

function _rowToObj(row, rowIndex){
  const c=CONFIG.COL, g=i=>row[i-1];
  return {
    row: rowIndex,
    type: g(c.TYPE),
    key: g(c.KEY),
    sub: g(c.SUB),
    result: g(c.RESULT),
    picName: g(c.PIC_NAME),
    startWeek: g(c.START_WEEK),           // MỚI - Start week
    start: _toDate(g(c.START)),           // DI CHUYỂN từ J sang K
    finish: _toDate(g(c.FINISH)),         // DI CHUYỂN từ K sang L
    deadline: _toDate(g(c.DEADLINE)),     // DI CHUYỂN từ L sang M
    assigner: g(c.ASSIGNER),              // MỚI - Assigner
    status: g(c.STATUS),                  // DI CHUYỂN từ N sang O
    actualFinishDate: _toDate(g(c.ACTUAL_FINISH_DATE)), // MỚI - Actual finish date
    behavior: g(c.BEHAVIOR),              // DI CHUYỂN từ P sang Q
    managerComment: g(c.MANAGER_COMMENT), // DI CHUYỂN từ Q sang R
    priority: Boolean(g(c.PRIORITY)),     // DI CHUYỂN từ R sang S
    // XÓA confirmByManager - không còn trong cấu trúc mới
    picEmail: g(c.PIC_EMAIL),             // giữ nguyên T
    hodEmail: g(c.HOD_EMAIL),             // giữ nguyên U  
    directorEmail: g(c.DIRECTOR_EMAIL),   // giữ nguyên V
    ccEmail: g(c.CC_EMAIL),               // giữ nguyên W
    lock: Boolean(g(c.LOCK)),             // DI CHUYỂN từ T sang X
    weeklyExtra: g(c.HOD_EMAIL)           // giữ nguyên (sử dụng HOD email)
  };
}

function _sendMail({toList, ccList, subject, htmlBody}){
  const {to, cc} = _ensureRecipientsOrThrow(toList, ccList);
  mmhMail_({ to, cc, subject, htmlBody, name: 'Marketing Task Bot' });
}

function _dedupeEmails(arr){
  const seen=new Set(), out=[];
  (arr||[]).forEach(s=>{
    if(!s) return;
    String(s).split(/[;,]/).map(x=>x.trim().toLowerCase()).filter(Boolean).forEach(p=>{
      if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p) && !seen.has(p)){ 
        seen.add(p); 
        out.push(p); 
      }
    });
  });
  return out;
}

function _ensureRecipientsOrThrow(toList, ccList){
  const to=_dedupeEmails(toList), cc=_dedupeEmails(ccList);
  if(!to.length) throw new Error('No valid recipient (To). Check weekly email addresses.');
  return { to: to.join(','), cc: cc.join(',') };
}

function _resolvePicEmail(picName, fallbackEmail){ 
  return CONFIG.PIC_LIST[picName] || _dedupeEmails([fallbackEmail])[0] || ''; 
}

function _getFileLink(){
  const v=_sheet().getRange(CONFIG.COL.FILE_LINK_ROW, CONFIG.COL.FILE_LINK_COL).getDisplayValue();
  return (v && /^https?:\/\//.test(v)) ? v : '';
}

function _isWithin(dt,start,end){ 
  if(!dt) return false; 
  const t=dt.getTime(); 
  return t>=start.getTime() && t<=end.getTime(); 
}

function _weekBounds(ref=new Date()){
  const d=new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const wd=d.getDay(), diff=wd===0? -6 : 1-wd;
  const mon=new Date(d); mon.setDate(d.getDate()+diff); mon.setHours(0,0,0,0);
  const sat=new Date(mon); sat.setDate(mon.getDate()+5); sat.setHours(23,59,59,999);
  const nMon=new Date(mon); nMon.setDate(mon.getDate()+7);
  const nSat=new Date(sat); nSat.setDate(sat.getDate()+7);
  return { monday:mon, saturday:sat, nextMonday:nMon, nextSaturday:nSat };
}

function _filterWeekRows(rows, s, e){
  return rows.filter(r => {
    // Chỉ kiểm tra Start Date (cột K)
    if (!r.start) return false;
    return _isWithin(r.start, s, e);
  });
}

function _filterNextWeekRows(rows, s, e){
  return rows.filter(r => _isWithin(r.start,s,e));
  // REMOVED: && !r.lock
}

// Function to extract and preserve links from cell content
function _extractAndPreserveLinks(cellContent) {
  if (!cellContent) return '-';
  
  const content = String(cellContent);
  
  // Check if content contains a URL pattern
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const matches = content.match(urlPattern);
  
  if (matches) {
    let result = content;
    matches.forEach(url => {
      // Extract filename from URL or use a shortened display text
      const displayText = url.includes('/') ? url.split('/').pop() || 'Link' : 'Link';
      const linkHtml = `<a href="${url}" style="color:#1e3d72;text-decoration:underline;font-weight:500;" target="_blank">${displayText}</a>`;
      result = result.replace(url, linkHtml);
    });
    return result;
  }
  
  return _valOrDash(content);
}

// ---------- HTML builders ----------

function _buildDetailTopBlock(pic, weekLabel, planLabel, _unused){
  const rows = [
    ['PIC:', _htmlEsc(pic)],
    ['Report:', _htmlEsc(weekLabel)],
    ['Plan:', _htmlEsc(planLabel)]
  ].map(([k,v])=>`
    <tr>
      <td style="width:180px;padding:6px 8px;border:1px solid #e5e5e5;background:#f7f9fc;"><b>${k}</b></td>
      <td style="padding:6px 8px;border:1px solid #e5e5e5;">${v || '-'}</td>
    </tr>`).join('');
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:8px 0 14px;">${rows}</table>`;
}

function _buildHeader(text){
  return `<div style="margin:0 0 10px;padding:8px 0;font-size:14px;">${_htmlEsc(text)}</div>`;
}

function _buildInfoBox(title, lines){
  const items = (lines||[]).map(li=>`<div style="margin:2px 0;">• ${li}</div>`).join('');
  return `<div style="border:1px solid #cfe5f5;background:#eaf6ff;padding:12px;margin:6px 0 12px;">
      <div style="font-weight:bold;margin-bottom:6px;">${_htmlEsc(title)}</div>${items}</div>`;
}

function _buildLegend(){
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:16px 0 12px;border:1px solid #eee;background:#fafafa;">
    <tr>
      <td colspan="2" style="font-weight:bold;padding:10px;border-bottom:1px solid #eee;">Color highlights:</td>
    </tr>
    <tr>
      <td style="width:24px;padding:8px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr><td width="14" height="14" style="background:#ffecec;border:1px solid #e5bcbc;"></td></tr>
        </table>
      </td>
      <td style="padding:8px 10px;">Delayed task</td>
    </tr>
    <tr>
      <td style="width:24px;padding:8px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr><td width="14" height="14" style="background:#fff8cc;border:1px solid #e6d97a;"></td></tr>
        </table>
      </td>
      <td style="padding:8px 10px;">Priority task</td>
    </tr>
  </table>`;
}

function _buildCTA(label, url){
  return `<div style="margin:18px 0;text-align:center;">
    <a href="${_htmlEsc(url)}" style="display:inline-block;padding:12px 20px;font-size:16px;font-weight:bold;
      background:#28a745;color:#fff;text-decoration:none;border-radius:6px;">${_htmlEsc(label)}</a></div>`;
}

function _buildFullTable(rows, opts = {}){
  const includeRowIndex = opts.includeRowIndex || false;
  const includeManagerComment = opts.includeManagerComment || false;
  
  // Headers theo đúng cấu trúc yêu cầu
  const headCols = [
    includeRowIndex ? '#' : null,
    includeRowIndex ? 'Row' : null,
    'Type',           // Column E
    'Priority',       // Column S
    'Key Task',       // Column F
    'Sub Task',       // Column G
    'Task Result',    // Column H
    includeManagerComment ? 'Manager Comment' : null, // Column R
    'Start Week',     // Column J
    'Start Date',     // Column K
    'Finish Date',    // Column L
    'Deadline',       // Column M
    'Assigner',       // Column N
    'Status',         // Column O
    'Actual Finish Date', // Column P
    'Behavior'        // Column Q
  ].filter(Boolean);
  
  const th = headCols.map(h => 
    `<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f2f6ff;">${h}</th>`
  ).join('');
  
  // ✅ XỬ LÝ KHI KHÔNG CÓ DATA
  if (!rows || rows.length === 0) {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
      <thead><tr>${th}</tr></thead>
      <tbody>
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;color:#999;font-style:italic;" colspan="${headCols.length}">
            No tasks found for this period
          </td>
        </tr>
      </tbody>
    </table>`;
  }
  
  // Build rows với đúng data
  const trs = rows.map((r, index) => {
    let bg = ''; 
    if (r.priority) bg = 'background:#fff8cc;'; // Yellow for priority
    if ((r.behavior||'').toString().trim().toLowerCase() === 'delayed') bg = 'background:#ffecec;'; // Red for delayed
    if ((r.status||'').toString().trim() === CONFIG.STATUS.COMPLETED) bg = 'background:#d4edda;'; // Green for completed
    
    const cells = [
      includeRowIndex ? `<td style="border:1px solid #ddd;padding:8px;text-align:center;width:40px;">${index + 1}</td>` : null,
      includeRowIndex ? `<td style="border:1px solid #ddd;padding:8px;text-align:center;width:50px;">${r.row}</td>` : null,
      `<td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.type)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${r.priority ? '⭐' : '-'}</td>`,
      // ✅ CRITICAL: Hiển thị data thực tế, không fallback ẩn
      `<td style="border:1px solid #ddd;padding:8px;">${r.key ? _htmlEsc(String(r.key)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;">${r.sub ? _htmlEsc(String(r.sub)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;word-wrap:break-word;max-width:300px;">${_extractAndPreserveLinks(r.result)}</td>`,
      includeManagerComment ? `<td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.managerComment)}</td>` : null,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${_valOrDash(r.startWeek)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.start)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.finish)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;color:#c00;">${_fmtDateCell(r.deadline)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${_valOrDash(r.assigner)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.status)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.actualFinishDate)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.behavior)}</td>`
    ].filter(Boolean);
    
    return `<tr style="${bg}">${cells.join('')}</tr>`;
  }).join('');
  
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
    <thead><tr>${th}</tr></thead>
    <tbody>${trs}</tbody>
  </table>`;
}


function _buildInProgressTable(rows){
  const heads = ['Row','Priority','Type','Key Task','Sub Task','Start','Finish','Status','Deadline']
    .map(h => `<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f2f6ff;">${h}</th>`).join('');
  
  if (!rows || rows.length === 0) {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
      <thead><tr>${heads}</tr></thead>
      <tbody>
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;color:#999;font-style:italic;" colspan="9">
            No in-progress tasks
          </td>
        </tr>
      </tbody>
    </table>`;
  }
  
  const body = rows.map(r => {
    let bg = ''; 
    if (r.priority) bg = 'background:#fff8cc;';
    if ((r.behavior||'').toString().trim().toLowerCase() === 'delayed') bg = 'background:#ffecec;';
    
    return `<tr style="${bg}">
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${r.row}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${r.priority ? '⭐' : '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.type)}</td>
      <td style="border:1px solid #ddd;padding:8px;">${r.key ? _htmlEsc(String(r.key)) : '<em style="color:#999;">No data</em>'}</td>
      <td style="border:1px solid #ddd;padding:8px;">${r.sub ? _htmlEsc(String(r.sub)) : '<em style="color:#999;">No data</em>'}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.start)}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.finish)}</td>
      <td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.status)}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;color:#c00;">${_fmtDateCell(r.deadline)}</td>
    </tr>`;
  }).join('');
  
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
    <thead><tr>${heads}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}


function _buildPlanNextTable(rows, opts = {}){
  const includeRowIndex = opts.includeRowIndex || false;
  
  const headCols = [
    includeRowIndex ? '#' : null,
    includeRowIndex ? 'Row' : null,
    'Type',
    'Priority',
    'Key Task',
    'Sub Task',
    'Start Date',
    'Deadline'
  ].filter(Boolean);
  
  const th = headCols.map(h => 
    `<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f2f6ff;">${h}</th>`
  ).join('');
  
  if (!rows || rows.length === 0) {
    return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
      <thead><tr>${th}</tr></thead>
      <tbody>
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;color:#999;font-style:italic;" colspan="${headCols.length}">
            No tasks planned for next week
          </td>
        </tr>
      </tbody>
    </table>`;
  }
  
  const trs = rows.map((r, index) => {
    let bg = ''; 
    if (r.priority) bg = 'background:#fff8cc;';
    if ((r.behavior||'').toString().trim().toLowerCase() === 'delayed') bg = 'background:#ffecec;';
    
    const cells = [
      includeRowIndex ? `<td style="border:1px solid #ddd;padding:8px;text-align:center;width:40px;">${index + 1}</td>` : null,
      includeRowIndex ? `<td style="border:1px solid #ddd;padding:8px;text-align:center;width:50px;">${r.row}</td>` : null,
      `<td style="border:1px solid #ddd;padding:8px;">${_valOrDash(r.type)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${r.priority ? '⭐' : '-'}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;">${r.key ? _htmlEsc(String(r.key)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;">${r.sub ? _htmlEsc(String(r.sub)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.start)}</td>`,
      `<td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;color:#c00;">${_fmtDateCell(r.deadline)}</td>`
    ].filter(Boolean);
    
    return `<tr style="${bg}">${cells.join('')}</tr>`;
  }).join('');
  
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
    <thead><tr>${th}</tr></thead>
    <tbody>${trs}</tbody>
  </table>`;
}

function _buildWeeklyEmailHTML({pic, weekLabel, planLabel, fileLink, totals, tables}){
  const statusBox = _buildInfoBox('Weekly Status Information:', [
    `Total Task: <b>${totals.totalTask}</b>`,
    `Completed Task: <b>${totals.completedCount}</b>`,
    `Inprogress: <b>${totals.inprogressCount}</b>`,
    `Importance task completed: <b>${totals.importantCompletedCount}</b>`,
    `On-time completion rate (OTCR): <b>${totals.otcr}%</b>`
  ]);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      /* Outlook compatibility styles */
      table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      .ExternalClass { width: 100%; }
      .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
      /* Fix for Outlook dark mode */
      [data-ogsc] .content { background-color: #ffffff !important; }
      [data-ogsb] .content { background-color: #ffffff !important; }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif;">
    <!--[if mso | IE]>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa;">
      <tr>
        <td>
    <![endif]-->
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
      <tr>
        <td align="center" style="padding: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 700px; background-color: #ffffff;" class="content">
            
            <!-- Header với background màu đậm cho Outlook -->
            <tr>
              <td style="background-color: #ffffff; color: #2c5aa0; padding: 25px; text-align: center; border: 2px solid #2c5aa0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="color: #ffffff; font-family: Arial, sans-serif;">
                      <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold; color: #1e3d72;">📈 WEEKLY REPORT</h1>
<h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: normal; color: #2c5aa0;">${_htmlEsc(pic)}</h2>
                      <div style="background-color: #1e3d72; padding: 12px; border-radius: 4px; margin-top: 10px;">
                        <div style="background-color: #e8f4fd; padding: 12px; border-radius: 4px; margin-top: 10px; border: 1px solid #2c5aa0;">
  <div style="color: #1e3d72; font-size: 14px; margin: 3px 0;"><strong>Report Period:</strong> ${_htmlEsc(weekLabel)}</div>
  <div style="color: #1e3d72; font-size: 14px; margin: 3px 0;"><strong>Plan Period:</strong> ${_htmlEsc(planLabel)}</div>
</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Content area với background trắng rõ ràng -->
            <tr>
              <td style="background-color: #ffffff; padding: 25px; color: #2c3e50; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.4;">
                
                <!-- Status Information với border rõ ràng -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 2px solid #2c5aa0; border-radius: 6px; margin: 15px 0;">
                  <tr>
                    <td style="background-color: #e8f4fd; padding: 15px; color: #2c3e50;">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #2c5aa0; font-size: 15px;">📊 Weekly Status Information:</div>
                      <div style="margin: 3px 0; color: #2c3e50;">• Total Task: <b>${totals.totalTask}</b></div>
                      <div style="margin: 3px 0; color: #2c3e50;">• Completed Task: <b>${totals.completedCount}</b></div>
                      <div style="margin: 3px 0; color: #2c3e50;">• Inprogress: <b>${totals.inprogressCount}</b></div>
                      <div style="margin: 3px 0; color: #2c3e50;">• Importance task completed: <b>${totals.importantCompletedCount}</b></div>
                      <div style="margin: 3px 0; color: #2c3e50;">• On-time completion rate (OTCR): <b>${totals.otcr}%</b></div>
                    </td>
                  </tr>
                </table>

                <!-- Section 1: Completed Tasks -->
                <div style="margin: 20px 0;">
                  <h3 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 8px; margin: 15px 0 10px 0; font-size: 16px;">1) Completed Task this week</h3>
                  ${tables.tblCompleted}
                </div>

                <!-- Section 2: In Progress Tasks -->
                <div style="margin: 20px 0;">
                  <h3 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 8px; margin: 15px 0 10px 0; font-size: 16px;">2) In progress Task</h3>
                  ${tables.tblInProgress}
                </div>

                <!-- Section 3: Next Week Plan -->
                <div style="margin: 20px 0;">
                  <h3 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 8px; margin: 15px 0 10px 0; font-size: 16px;">3) Plan for next week (${_htmlEsc(planLabel)})</h3>
                  ${tables.tblPlanNext}
                </div>

                <!-- Legend với background rõ ràng -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #dee2e6; background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                  <tr>
                    <td style="padding: 15px; color: #2c3e50;">
                      <div style="font-weight: bold; margin-bottom: 10px; color: #2c5aa0; font-size: 14px;">📊 Color highlights:</div>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="padding: 5px 10px;">
                            <div style="background: #ffecec; border: 2px solid #e5bcbc; padding: 8px 12px; border-radius: 4px; color: #721c24; font-weight: bold;">⚠️ Delayed task</div>
                          </td>
                          <td style="padding: 5px 10px;">
                            <div style="background: #fff8cc; border: 2px solid #e6d97a; padding: 8px 12px; border-radius: 4px; color: #856404; font-weight: bold;">⭐ Priority task</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${fileLink ? `
                <!-- CTA Button với background rõ ràng -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border: 2px solid #2c5aa0; border-radius: 6px; background-color: #2c5aa0;">
                        <tr>
                          <td style="padding: 12px 25px;">
                            <a href="${_htmlEsc(fileLink)}" style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: block;">🔍 View Detail in Sheet</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                ` : ''}
                
              </td>
            </tr>
            
            <!-- Footer với background tối -->
            <tr>
              <td style="background-color: #6c757d; color: #ffffff; padding: 15px; text-align: center; font-size: 12px;">
                <div style="color: #ffffff; margin: 3px 0;">(Auto-generated by Apps Script)</div>
                <div style="color: #ffffff; margin: 3px 0;">Marketing Task Management System</div>
              </td>
            </tr>
            
          </table>
        </td>
      </tr>
    </table>
    
    <!--[if mso | IE]>
        </td>
      </tr>
    </table>
    <![endif]-->
  </body>
  </html>`;
}

function _buildPICProgressEmail({pic, weekLabel, totalTasks, completedCount, pendingCount, priorityCount, otcr, rows, requesterPic, requesterEmail}) {
  const fileLink = _getFileLink();
  
  const statusBox = _buildInfoBox(`Tiến độ công việc tuần này của ${pic}:`, [
    `Tổng số Task: <b>${totalTasks}</b>`,
    `Các công việc đã hoàn thành: <b>${completedCount}</b>`,
    `Công việc Pending: <b>${pendingCount}</b>`,
    `Công việc quan trọng có liên quan: <b>${priorityCount}</b>`,
    `Tỉ lệ hoàn thành công việc đúng hạn: <b>${otcr}%</b>`
  ]);

  const table = _buildPICProgressTable(rows);
  
  return `
  <div style="font-family:Arial,sans-serif;font-size:13px;color:#222;line-height:1.4;">
    ${_buildHeader(`Sau đây là kế hoạch công việc của: ${pic}`)}
    <p style="margin:10px 0;"><strong>Plan: ${weekLabel}</strong></p>
    
    <div style="background: #e8f4fd; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 14px;">
      <strong>📞 Yêu cầu từ:</strong> ${requesterPic} (${requesterEmail})
    </div>
    
    ${statusBox}
    ${table}
    ${_buildLegend()}
    ${fileLink ? _buildCTA('View Detail in Sheet', fileLink) : ''}
    <p style="margin-top:10px;">(Auto-generated by Apps Script)</p>
  </div>`;
}

function _buildPICProgressTable(rows) {
  // ✅ DEBUG: Log data to check
  console.log('=== _buildPICProgressTable DEBUG ===');
  console.log('Total rows:', rows.length);
  if (rows.length > 0) {
    console.log('Sample row data:', {
      row: rows[0].row,
      type: rows[0].type,
      key: rows[0].key,
      sub: rows[0].sub,
      result: rows[0].result ? rows[0].result.substring(0, 50) : 'EMPTY',
      status: rows[0].status,
      deadline: rows[0].deadline
    });
  }
  
  const heads = ['Row','Type','Key Task','Sub Task','Task Result','Start Date','Finish Date','Status','Deadline']
    .map(h=>`<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f2f6ff;">${h}</th>`).join('');
  
  const body = rows.map(r => {
    let bg = '';
    if (r.priority) bg='background:#fff8cc;';
    if ((r.behavior||'').toString().trim().toLowerCase()==='delayed') bg='background:#ffecec;';
    
    // ✅ FIX: Remove fallback, show actual data or clear indication
    const typeDisplay = r.type ? _htmlEsc(String(r.type)) : '<em style="color:#999;">-</em>';
    const keyDisplay = r.key ? _htmlEsc(String(r.key)) : '<em style="color:#999;">No data</em>';
    const subDisplay = r.sub ? _htmlEsc(String(r.sub)) : '<em style="color:#999;">No data</em>';
    const statusDisplay = r.status ? _htmlEsc(String(r.status)) : '<em style="color:#999;">-</em>';
    
    return `<tr style="${bg}">
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${r.row}</td>
      <td style="border:1px solid #ddd;padding:8px;">${typeDisplay}</td>
      <td style="border:1px solid #ddd;padding:8px;">${keyDisplay}</td>
      <td style="border:1px solid #ddd;padding:8px;">${subDisplay}</td>
      <td style="border:1px solid #ddd;padding:8px;">${_extractAndPreserveLinks(r.result)}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.start)}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;">${_fmtDateCell(r.finish)}</td>
      <td style="border:1px solid #ddd;padding:8px;">${statusDisplay}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;color:#c00;">${_fmtDateCell(r.deadline)}</td>
    </tr>`;
  }).join('');
  
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
    <thead><tr>${heads}</tr></thead>
    <tbody>${body || `<tr><td style="border:1px solid #ddd;padding:8px;" colspan="9">No data</td></tr>`}</tbody>
  </table>`;
}

// ================================ SETUP & TEST =========================================

function setupAllTriggers(){
  ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onEditInstallable').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger('weeklyReportJob').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY)
    .atHour(17).nearMinute(0).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('dailyPriorityReminderJob').timeBased().everyDays(1)
    .atHour(CONFIG.DAILY_REMINDER_HOUR).nearMinute(CONFIG.DAILY_REMINDER_MINUTE)
    .inTimezone(CONFIG.TIMEZONE).create();
  _getUi().alert('✅ Đã cài đặt triggers: onEdit, Weekly (Thứ 7 17:00), Daily reminder.');
}

function testWeeklyReportForSinglePIC(picNameToTest='Giang'){
  const ui = _getUi(); 
  const rows = _fetchAllRows();
  const pic = (picNameToTest || 'Giang').trim();
  
  // Tìm tất cả dòng có PIC = picNameToTest
  const picRows = rows.filter(r => (r.picName || '').toString().trim() === pic);
  if(picRows.length === 0){ 
    ui.alert(`No tasks found for PIC "${pic}".`); 
    return; 
  }

  const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
  const weekLabel = `From ${_twoDigitYear(monday)} - ${_twoDigitYear(saturday)}`;
  const planLabel = `${_twoDigitYear(nextMonday)} - ${_twoDigitYear(nextSaturday)}`;
  const fileLink = _getFileLink();

  const thisWeek = _filterWeekRows(picRows, monday, saturday);
  const nextWeek = _filterNextWeekRows(picRows, nextMonday, nextSaturday);
  
  if(thisWeek.length === 0 && nextWeek.length === 0){ 
    ui.alert(`No tasks for PIC "${pic}" in this/next week.`); 
    return; 
  }

  const completedRows = thisWeek.filter(r => (r.status||'').toString().trim() === CONFIG.STATUS.COMPLETED);
  const inProgRows = thisWeek.filter(r => _isPendingStatus(r.status));
  const totals = {
    totalTask: thisWeek.length,
    completedCount: completedRows.length,
    inprogressCount: inProgRows.length,
    importantCompletedCount: completedRows.filter(r=>!!r.priority).length,
    otcr: thisWeek.length ? Math.round((thisWeek.filter(r => (r.behavior||'').toString().trim().toLowerCase()==='on time').length/thisWeek.length)*1000)/10 : 0
  };

  const allRows = thisWeek.concat(nextWeek);

  const body = _buildWeeklyEmailHTML({
    pic: pic, 
    weekLabel, 
    planLabel, 
    fileLink,
    totals,
    tables: {
      tblCompleted: _buildFullTable(completedRows,{includeRowIndex:true, includeManagerComment:true}),
      tblInProgress: _buildInProgressTable(inProgRows),
      tblPlanNext: _buildPlanNextTable(nextWeek,{includeRowIndex:true})
    }
  });

  const subject = `[TEST] ${pic}_Weekly Report * ${weekLabel} _Plan week ${planLabel}`;
  
  // Lấy email từ cột U (HOD Emails) của các dòng PIC này
  const toEmails = _dedupeEmails(allRows.map(r => r.hodEmail).filter(Boolean));
  // Lấy email từ cột W (CC Emails) của các dòng PIC này  
  const ccEmails = _dedupeEmails(allRows.map(r => r.ccEmail).filter(Boolean));
  
  if(toEmails.length === 0){
    ui.alert(`No HOD emails (column U) found for PIC "${pic}".`);
    return;
  }
  
  _sendMail({ toList: toEmails, ccList: ccEmails, subject, htmlBody: body });
  ui.alert(`Sent test weekly report for PIC: ${pic}\nTO: ${toEmails.join(', ')}\nCC: ${ccEmails.join(', ')}`);
}

function testPriorityEmail(){
  const r=_fetchAllRows().find(x=>x.priority);
  if(!r){ _getUi().alert('No row has Priority (R) to test.'); return; }
  _sendPriorityEmailForRow(r); 
  _getUi().alert('Sent priority email for row '+r.row);
}

function testPriorityReminderEmail(){
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    _getUi().alert('❌ Bạn không có quyền truy cập hệ thống này.');
    return;
  }

  const rows = _fetchAllRows();
  const priorityRows = rows.filter(r => 
    r.priority && 
    (r.status || '').toString().trim() !== CONFIG.STATUS.COMPLETED
  ).slice(0, 3); // Lấy tối đa 3 rows để test

  if (priorityRows.length === 0) {
    _getUi().alert('Không có công việc Priority nào để test.');
    return;
  }

  const subject = `[TEST] Priority Reminder - ${_formatDate(new Date())}`;
  const body = _buildPriorityReminderEmail(priorityRows);

  _sendMail({
    toList: [currentUser],
    ccList: [],
    subject,
    htmlBody: body
  });

  _getUi().alert(`✅ Đã gửi test email Priority Reminder với ${priorityRows.length} tasks!`);
}

function testPICProgressEmail(){
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    _getUi().alert('❌ Bạn không có quyền truy cập hệ thống này.');
    return;
  }

  // Test với PIC đầu tiên có dữ liệu
  const rows = _fetchAllRows();
  const pics = Array.from(new Set(rows.map(r => r.picName).filter(Boolean)));
  
  if (pics.length === 0) {
    _getUi().alert('Không có PIC nào để test.');
    return;
  }

  const testPIC = pics[0];
  const picRows = rows.filter(r => r.picName === testPIC);
  const { monday, saturday } = _weekBounds(new Date());
  const weekRows = picRows.filter(r => _isWithinWeek(r, monday, saturday));
  
  if (weekRows.length === 0) {
    _getUi().alert(`PIC ${testPIC} không có công việc trong tuần để test.`);
    return;
  }

  const completedTasks = weekRows.filter(r => (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED);
  const pendingTasks = weekRows.filter(r => _isPendingStatus(r.status));
  const priorityTasks = weekRows.filter(r => r.priority);
  
  const today = new Date();
  const tasksToDate = weekRows.filter(r => r.deadline && _toDate(r.deadline) <= today);
  const onTimeTasks = tasksToDate.filter(r => (r.behavior || '').toString().trim().toLowerCase() === 'on time');
  const otcr = tasksToDate.length > 0 ? Math.round((onTimeTasks.length / tasksToDate.length) * 1000) / 10 : 0;

  const weekLabel = `${_formatDate(monday)} - ${_formatDate(saturday)}`;
  const subject = `[TEST] Tiến độ của ${testPIC} - Tuần ${weekLabel} (yêu cầu: ${picName})`;
  const body = _buildPICProgressEmail({
    pic: testPIC,
    weekLabel,
    totalTasks: weekRows.length,
    completedCount: completedTasks.length,
    pendingCount: pendingTasks.length,
    priorityCount: priorityTasks.length,
    otcr,
    rows: weekRows,
    requesterPic: picName,
    requesterEmail: currentUser
  });

  _sendMail({
    toList: [currentUser],
    ccList: [CONFIG.MANAGER_EMAIL],
    subject,
    htmlBody: body
  });

  _getUi().alert(`✅ Đã gửi test email tiến độ của ${testPIC}!`);
}// ================================ PIC MENU FUNCTIONS =====================================



function _showPICWeeklyReportDialog(picName) {
     const rows = _fetchAllRows();
     const userRows = rows.filter(r => r.picName === picName);
     
     if (userRows.length === 0) {
       _getUi().alert(`No tasks found for PIC ${picName}.`);
       return;
     }
     
     // Check if Task Result is filled for all tasks
     const incompleteResults = userRows.filter(r => !r.result || r.result.toString().trim() === '');
     if (incompleteResults.length > 0) {
       const ui = _getUi();
       ui.alert(
         'Task Result Required',
         `Found ${incompleteResults.length} tasks without Task Result (Column H).\n\nRows: ${incompleteResults.map(r => r.row).join(', ')}\n\nPlease fill Task Result before sending report.`,
         ui.ButtonSet.OK
       );
       return;
     }
     
     const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
     const thisWeek = _filterWeekRows(userRows, monday, saturday);
     const nextWeek = _filterNextWeekRows(userRows, nextMonday, nextSaturday);
     
     const ui = _getUi();
     const html = `
       <style>
         body { font-family: Arial, sans-serif; padding: 20px; }
         .info-box { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
         .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
         .btn-group { text-align: center; margin-top: 20px; }
         .btn { padding: 12px 25px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
         .btn-primary { background: #28a745; color: white; }
         .btn-secondary { background: #6c757d; color: white; }
       </style>
       <div>
         <div class="info-box">
           <h3>📧 Send Weekly Report - ${picName}</h3>
           <p>Hệ thống sẽ gửi báo cáo tuần cho các công việc chưa khóa của bạn.</p>
         </div>
         
         <div class="summary">
           <div><strong>📊 Tổng quan:</strong></div>
           <p>• Công việc tuần này: <strong>${thisWeek.length}</strong></p>
           <p>• Kế hoạch tuần tới: <strong>${nextWeek.length}</strong></p>
           <p>• Tổng công việc sẽ gửi: <strong>${thisWeek.length + nextWeek.length}</strong></p>
         </div>

         <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin: 15px 0;">
           <strong>⚠️ Lưu ý:</strong> Sau khi gửi báo cáo, các công việc trong tuần này sẽ được khóa lại và hệ thống sẽ không gửi auto report.
         </div>

         <div class="btn-group">
           <button class="btn btn-primary" onclick="sendReport()">Gửi báo cáo ngay</button>
           <button class="btn btn-secondary" onclick="google.script.host.close()">Hủy bỏ</button>
         </div>
       </div>
       
       <script>
         function sendReport() {
           google.script.run
             .withSuccessHandler((message) => {
               alert('✅ ' + message);
               google.script.host.close();
             })
             .withFailureHandler((error) => {
               alert('❌ Lỗi: ' + error.message);
             })
             .sendManualWeeklyReport();
         }
       </script>
     `;
     
     ui.showModalDialog(
       HtmlService.createHtmlOutput(html).setWidth(500).setHeight(400),
       'Gửi báo cáo tuần - ' + picName
     );
   }

function _buildEnhancedPICWeeklyEmailHTML(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows) {
  const fileLink = _getFileLink();
  const currentDate = _formatDate(new Date(), 'dd/MM/yyyy HH:mm');
  
  // Calculate metrics
  const totalTask = thisWeekRows.length;
  const completedRows = thisWeekRows.filter(r => (r.status||'').toString().trim() === CONFIG.STATUS.COMPLETED);
  const completedCount = completedRows.length;
  const inprogressCount = thisWeekRows.filter(r => _isPendingStatus(r.status)).length;
  const importantCompletedCount = completedRows.filter(r => !!r.priority).length;
  const onTimeCount = thisWeekRows.filter(r => (r.behavior||'').toString().trim().toLowerCase() === 'on time').length;
  const otcr = totalTask ? Math.round((onTimeCount/totalTask)*1000)/10 : 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Outlook-specific resets */
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        td, th { border-collapse: collapse; }
        .ExternalClass { width: 100%; }
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
        /* Force background color in all email clients */
        body, #bodyTable, #bodyCell { 
            height: 100% !important; 
            margin: 0; 
            padding: 0; 
            width: 100% !important;
            background-color: #4682B4 !important;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #4682B4 !important; font-family: 'Segoe UI', Arial, sans-serif;">
    <!-- Outer table for consistent background -->
    <table id="bodyTable" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #4682B4 !important; min-height: 100vh;">
        <tr>
            <td id="bodyCell" align="center" style="padding: 40px 20px; background-color: #4682B4 !important;">
                
                <!-- Logo/Header Section with blue background -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 800px; margin-bottom: 20px;">
                    <tr>
                        <td style="text-align: center; color: #ffffff; padding: 20px;">
                            <h2 style="margin: 0; font-size: 24px; color: #ffffff;">📊 WEEKLY REPORT</h2>
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #ffffff;">Marketing Action Report - Mailer & Automation Script</p>
                        </td>
                    </tr>
                </table>
                
                <!-- Main content container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 800px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    
                    <!-- Header Section -->
                    <tr>
                      <td style="background: #ffffff; color: #1e3d72; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; border: 3px solid #2c5aa0; border-bottom: none;">
                            <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold; color: #1e3d72;">📈 WEEKLY REPORT</h1>
<h2 style="margin: 0 0 15px 0; font-size: 20px; font-weight: normal; color: #2c5aa0;">${picName}</h2>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #e8f4fd; border: 2px solid #2c5aa0; border-radius: 6px; margin-top: 15px;">
  <tr>
    <td style="padding: 15px; color: #1e3d72;">
      <div style="color: #1e3d72; margin: 5px 0;"><strong>Report Period:</strong> ${weekLabel}</div>
      <div style="color: #1e3d72; margin: 5px 0;"><strong>Plan Period:</strong> ${planLabel}</div>
      <div style="color: #1e3d72; margin: 5px 0;"><strong>Generated:</strong> ${currentDate}</div>
    </td>
  </tr>
</table>
                        </td>
                    </tr>
                    
                    <!-- Content Section -->
                    <tr>
                        <td style="padding: 30px; background-color: #ffffff;">
                            
                            <!-- Tech Notice -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 15px; color: #e65100;">
                                        <strong>📋 Complete Weekly Report</strong><br>
                                        <span style="color: #424242;">This email contains the complete weekly report with all task details, statistics, and planning information. PDF attachment is included for your records.</span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Statistics Grid -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                                <tr>
                                    <td width="33%" style="padding: 5px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #2c5aa0; border-radius: 6px;">
                                            <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                    <div style="font-size: 24px; font-weight: bold; color: #2c5aa0; margin-bottom: 5px;">${totalTask}</div>
                                                    <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total Tasks</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" style="padding: 5px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #28a745; border-radius: 6px;">
                                            <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                    <div style="font-size: 24px; font-weight: bold; color: #28a745; margin-bottom: 5px;">${completedCount}</div>
                                                    <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Completed</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" style="padding: 5px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #ffc107; border-radius: 6px;">
                                            <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                    <div style="font-size: 24px; font-weight: bold; color: #ffc107; margin-bottom: 5px;">${inprogressCount}</div>
                                                    <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">In Progress</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="33%" style="padding: 5px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #dc3545; border-radius: 6px;">
                                            <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                    <div style="font-size: 24px; font-weight: bold; color: #dc3545; margin-bottom: 5px;">${importantCompletedCount}</div>
                                                    <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Priority Completed</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" style="padding: 5px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #6f42c1; border-radius: 6px;">
                                            <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                    <div style="font-size: 24px; font-weight: bold; color: #6f42c1; margin-bottom: 5px;">${otcr}%</div>
                                                    <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">OTCR</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td width="33%" style="padding: 5px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-left: 4px solid #17a2b8; border-radius: 6px;">
                                            <tr>
                                                <td style="padding: 15px; text-align: center;">
                                                    <div style="font-size: 24px; font-weight: bold; color: #17a2b8; margin-bottom: 5px;">${nextWeekRows.length}</div>
                                                    <div style="color: #6c757d; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Next Week Plans</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            ${_buildOutlookCompatibleTaskSection('1. COMPLETED TASKS THIS WEEK', '✅', completedRows, true)}
                            
                            ${_buildOutlookCompatibleTaskSection('2. IN PROGRESS TASKS', '🔄', thisWeekRows.filter(r => _isPendingStatus(r.status)), false)}
                            
                            ${_buildOutlookCompatibleTaskSection(`3. PLAN FOR NEXT WEEK (${planLabel})`, '📅', nextWeekRows, false)}
                            
                            <!-- Legend -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <div style="font-weight: bold; margin-bottom: 10px; color: #2c3e50;">📊 Legend:</div>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background: #fff8e1; color: #f57c00; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px;">⭐ Priority Task</td>
                                                <td style="width: 10px;"></td>
                                                <td style="background: #e8f5e8; color: #2e7d32; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 10px;">✅ Completed Task</td>
                                                <td style="width: 10px;"></td>
                                                <td style="background: #ffebee; color: #c62828; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">⚠️ Delayed Task</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            ${fileLink ? `
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, #2c5aa0, #1e3d72); border-radius: 6px;">
                                                    <a href="${fileLink}" style="display: inline-block; padding: 12px 25px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px;">📊 View Live Data in Sheet</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px;">
                            <div style="margin-bottom: 5px;"><strong>Generated by Marketing Task Management System</strong></div>
                            <div style="margin-bottom: 5px;">PIC Weekly Report Module | ${new Date().toISOString()}</div>
                            <div style="font-size: 11px; font-style: italic;">
                                <em>This report contains complete task data, metrics, and planning information with PDF attachment.</em>
                            </div>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Bottom footer with blue background -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 800px; margin-top: 20px;">
                    <tr>
                        <td style="text-align: center; color: #ffffff; padding: 20px;">
                            ${fileLink ? `<p style="margin: 10px 0;"><a href="${fileLink}" style="color: #1e3d72; text-decoration: underline; font-weight: bold; background: #e8f4fd; padding: 8px 15px; border-radius: 4px; border: 1px solid #2c5aa0;">📊 View Live Data in Google Sheet</a></p>` : ''}
                            <p style="margin: 5px 0; font-size: 11px; color: #ffffff;">© 2025 Marketing Management System - All Rights Reserved</p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>`;
}function _buildOutlookCompatibleTaskSection(title, icon, tasks, includeResult = false) {
  // ALWAYS return content, even if empty
  const sectionStart = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td>
          <h3 style="color: #2c3e50; border-bottom: 2px solid #2c5aa0; padding-bottom: 8px; margin: 0 0 15px 0; font-size: 16px;">
            ${icon} ${title}
          </h3>
  `;
  
  const sectionEnd = `
        </td>
      </tr>
    </table>
  `;
  
  if (!tasks || tasks.length === 0) {
    return sectionStart + `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #dee2e6;">
        <tr>
          <td style="text-align: center; color: #6c757d; padding: 30px; font-style: italic;">
            No tasks available for this section
          </td>
        </tr>
      </table>
    ` + sectionEnd;
  }
  
  // ✅ FIX: Build header cells with Task Result column
  const headers = ['Row', 'Key Task', 'Sub Task'];
  if (includeResult) headers.push('Task Result'); // ⭐ THÊM CỘT NÀY
  headers.push('Start', 'Deadline', 'Status');
  
  // ✅ FIX: Adjust column widths khi có Task Result
  const getColumnWidth = (index, hasResult) => {
    if (hasResult) {
      // Khi có Task Result: Row(5%), Key(15%), Sub(20%), Result(20%), Start(12%), Deadline(12%), Status(16%)
      const widths = ['5%', '15%', '20%', '20%', '12%', '12%', '16%'];
      return widths[index] || 'auto';
    } else {
      // Khi không có Task Result: Row(6%), Key(18%), Sub(35%), Start(14%), Deadline(14%), Status(13%)
      const widths = ['6%', '18%', '35%', '14%', '14%', '13%'];
      return widths[index] || 'auto';
    }
  };
  
  const headerHtml = headers.map((h, index) => 
    `<th style="background: #2c5aa0; color: white; padding: 8px 6px; text-align: left; font-size: 11px; border: 1px solid #1e3d72; width: ${getColumnWidth(index, includeResult)};">${h}</th>`
  ).join('');
  
  // ✅ FIX: Build data rows with Task Result and correct highlighting
  const rowsHtml = tasks.map((task, index) => {
    // ✅ HIGHLIGHT LOGIC
    let bgColor = '#ffffff';
    const behaviorLower = (task.behavior || '').toString().trim().toLowerCase();
    const statusLower = (task.status || '').toString().trim().toLowerCase();
    
    // Priority task = yellow background
    if (task.priority) {
      bgColor = '#fff8e1';
    }
    // Completed task = green background  
    else if (statusLower === 'completed') {
      bgColor = '#e8f5e8';
    }
    // Delayed task = red/pink background
    else if (behaviorLower === 'delayed') {
      bgColor = '#ffebee';
    }
    
    const cells = [
      `<td style="background: ${bgColor}; padding: 6px 4px; text-align: center; border: 1px solid #dee2e6; font-weight: bold; font-size: 10px;">${task.row || (index + 1)}</td>`,
      `<td style="background: ${bgColor}; padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;">${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="background: ${bgColor}; padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px; line-height: 1.3;">${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}</td>`
    ];
    
    // ✅ ADD: Task Result column
    if (includeResult) {
      // Sử dụng _extractAndPreserveLinks để giữ clickable links
      const resultWithLinks = _extractAndPreserveLinks(task.result);
      // Truncate nếu quá dài nhưng giữ nguyên HTML links
      const finalResult = resultWithLinks.length > 150 ? resultWithLinks.substring(0, 147) + '...' : resultWithLinks;
      cells.push(`<td style="background: ${bgColor}; padding: 6px 4px; border: 1px solid #dee2e6; font-size: 9px; line-height: 1.3; word-wrap: break-word;">${finalResult}</td>`);
    }
    
    cells.push(
      `<td style="background: ${bgColor}; padding: 6px 4px; text-align: center; border: 1px solid #dee2e6; font-size: 10px;">${_fmtDateCell(task.start)}</td>`,
      `<td style="background: ${bgColor}; padding: 6px 4px; text-align: center; border: 1px solid #dee2e6; color: #dc3545; font-weight: bold; font-size: 10px;">${_fmtDateCell(task.deadline)}</td>`,
      `<td style="background: ${bgColor}; padding: 6px 4px; border: 1px solid #dee2e6; font-size: 10px;">${task.status ? _htmlEsc(String(task.status)) : '<em style="color:#999;">-</em>'}</td>`
    );
    
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
  
  return sectionStart + `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse; font-family: Arial, sans-serif; table-layout: fixed;">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  ` + sectionEnd;
}

function _buildEnhancedTaskSection(title, icon, tasks, includeResult = false) {
  if (tasks.length === 0) {
    return `
      <div class="section">
        <h3><span class="section-icon">${icon}</span>${title}</h3>
        <div class="no-data">No tasks available for this section</div>
      </div>
    `;
  }
  
  const tableHeaders = includeResult 
    ? '<th style="width: 40px;">Row</th><th style="width: 120px;">Key Task</th><th style="width: 150px;">Sub Task</th><th style="width: 200px;">Task Result</th><th style="width: 80px;">Start</th><th style="width: 80px;">Finish</th><th style="width: 80px;">Deadline</th><th style="width: 100px;">Status</th>'
    : '<th style="width: 40px;">Row</th><th style="width: 120px;">Key Task</th><th style="width: 180px;">Sub Task</th><th style="width: 80px;">Start</th><th style="width: 80px;">Deadline</th><th style="width: 100px;">Status</th>';
  
  const taskRows = tasks.map((task, index) => {
    let rowClass = '';
    if (task.priority) rowClass = 'priority-row';
    else if (task.status === CONFIG.STATUS.COMPLETED) rowClass = 'completed-row';
    else if ((task.behavior||'').toString().trim().toLowerCase() === 'delayed') rowClass = 'delayed-row';
    
    const priorityIndicator = task.priority ? '⭐ ' : '';
    const completedIndicator = task.status === CONFIG.STATUS.COMPLETED ? '✅ ' : '';
    
    if (includeResult) {
      return `
        <tr class="${rowClass}">
          <td style="text-align: center; font-weight: bold;">${task.row}</td>
          <td>${priorityIndicator}${completedIndicator}${_valOrDash(task.key)}</td>
          <td>${_valOrDash(task.sub)}</td>
          <td class="result-cell">${_extractAndPreserveLinks(task.result)}</td>
          <td style="text-align: center;">${_fmtDateCell(task.start)}</td>
          <td style="text-align: center;">${_fmtDateCell(task.finish)}</td>
          <td class="deadline-cell" style="text-align: center;">${_fmtDateCell(task.deadline)}</td>
          <td>${_valOrDash(task.status)}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="${rowClass}">
          <td style="text-align: center; font-weight: bold;">${task.row}</td>
          <td>${priorityIndicator}${completedIndicator}${_valOrDash(task.key)}</td>
          <td>${_valOrDash(task.sub)}</td>
          <td style="text-align: center;">${_fmtDateCell(task.start)}</td>
          <td class="deadline-cell" style="text-align: center;">${_fmtDateCell(task.deadline)}</td>
          <td>${_valOrDash(task.status)}</td>
        </tr>
      `;
    }
  }).join('');
  
  return `
    <div class="section">
      <h3><span class="section-icon">${icon}</span>${title}</h3>
      <table class="task-table">
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * 🆕 ENHANCED: Quick View + Edit + Add Tasks for PIC
 * Hiển thị dialog với 2 tabs:
 * - Tab 1: Cập nhật công việc hiện tại
 * - Tab 2: Thêm công việc mới
 */
/**
 * 🆕 ENHANCED COMBINED FUNCTION - Thay thế cả picViewWeekTasks() và picAddNewTaskBatch()
 * Hiển thị dialog với 2 tabs:
 * - Tab 1: Cập nhật công việc hiện tại (Quick View)
 * - Tab 2: Thêm công việc mới (Batch Add)
 */
/**
 * 🆕 ENHANCED COMBINED FUNCTION - Quick Review & Manage Tasks
 * Version: 2.0 - Updated with new requirements
 * - Tab 1: Cập nhật công việc hiện tại (editable Type & Key Task)
 * - Tab 2: Thêm công việc mới (auto-fill dates)
 * - 5 status options
 * - Color coding for priority & completed
 * - NO email functionality
 */
/**
 * COMPLETE FIXED VERSION - Quick Review & Manage Tasks
 * Features:
 * - Status column width: 120px (fixed from 150px)
 * - Autocomplete for Type & Key Task in both tabs
 * - Keyboard navigation support
 * - Clean and responsive UI
 */
function picQuickReviewTasks() {
  const currentUser = _getCurrentUserEmail();
  const userRole = _getCachedUserRole(currentUser);
  
  // Check quyền PIC
  if (userRole !== CONFIG.ROLES.PIC && userRole !== CONFIG.ROLES.HOD && userRole !== CONFIG.ROLES.ADMIN) {
    _getUi().alert('⛔ Access denied. PIC role required.');
    return;
  }
  
  const picName = _getUserPICName(currentUser);
  if (!picName) {
    _getUi().alert('⛔ Cannot identify PIC name.');
    return;
  }
  
  // Fetch data
  const rows = _fetchAllRows();
  const { monday, saturday } = _weekBounds(new Date());
  const weekRows = rows.filter(r => r.picName === picName && _isWithinWeek(r, monday, saturday));
  
  // Get options from Master sheet
  const typeOptions = _getTypeOptionsFromMaster();
  const keyTaskOptions = _getKeyTaskOptionsFromMaster();
  const statusOptions = _getStatusOptionsNew();
  
  // Calculate statistics
  const totalTasks = weekRows.length;
  const completedTasks = weekRows.filter(r => r.status === 'Completed').length;
  const priorityTasks = weekRows.filter(r => r.priority).length;
  const pendingTasks = weekRows.filter(r => _isPendingStatusNew(r.status)).length;
  const notStartedTasks = weekRows.filter(r => r.status === 'Not Started').length;
  
  const weekLabel = `${_formatDate(monday)} - ${_formatDate(saturday)}`;
  const ui = _getUi();
  
  // === BUILD HTML ===
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0;
          margin: 0;
        }
        
        .header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 25px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h2 {
          font-size: 24px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .tabs {
          display: flex;
          background: white;
          border-bottom: 2px solid #e0e0e0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .tab-button {
          flex: 1;
          padding: 15px;
          background: #f5f5f5;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
        }
        
        .tab-button:hover {
          background: #e8e8e8;
        }
        
        .tab-button.active {
          background: white;
          color: #2a5298;
          border-bottom-color: #2a5298;
        }
        
        .tab-content {
          display: none;
          padding: 25px;
          background: white;
          min-height: 500px;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        
        .summary-card:hover {
          transform: translateY(-5px);
        }
        
        .card-number {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .card-label {
          font-size: 13px;
          opacity: 0.9;
        }
        
        .summary-card:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .summary-card:nth-child(2) { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
        .summary-card:nth-child(3) { background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); }
        .summary-card:nth-child(4) { background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%); }
        .summary-card:nth-child(5) { background: linear-gradient(135deg, #6c757d 0%, #adb5bd 100%); }
        
        /* AUTOCOMPLETE STYLES */
        .autocomplete-container {
          position: relative;
        }
        
        .autocomplete-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
        }
        
        .autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background: white;
          border: 1px solid #ced4da;
          border-top: none;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          z-index: 1000;
          display: none;
        }
        
        .autocomplete-dropdown.active {
          display: block;
        }
        
        .autocomplete-item {
          padding: 10px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .autocomplete-item:hover {
          background-color: #e8f4fd;
        }
        
        .autocomplete-item.highlighted {
          background-color: #d0e9ff;
        }
        
        /* Task Table Styles */
        .task-table-container {
          overflow-x: auto;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .task-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }
        
        .task-table thead {
          background: #2a5298;
          color: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .task-table th {
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 2px solid #1e3c72;
        }
        
        .task-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }
        
        .task-table tr.priority-row {
          background-color: #fff8cc !important;
        }
        
        .task-table tr.completed-row {
          background-color: #d4edda !important;
        }
        
        .task-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        /* Form Elements */
        input[type="text"],
        input[type="date"],
        select,
        textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
        }
        
        input[type="date"] {
          padding: 8px 12px;
          min-height: 38px;
        }
        
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        textarea {
          resize: vertical;
          min-height: 60px;
        }
        
        select {
          cursor: pointer;
          background-color: white;
        }
        
        /* Buttons */
        .button-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
        }
        
        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
        
        .btn-add {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          padding: 10px 20px;
          margin-bottom: 15px;
        }
        
        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
        }
        
        .btn-delete {
          background: #dc3545;
          color: white;
          padding: 6px 12px;
          font-size: 12px;
        }
        
        .btn-delete:hover {
          background: #c82333;
        }
        
        /* Loading State */
        .loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .loading.active {
          display: flex;
        }
        
        .spinner {
          width: 60px;
          height: 60px;
          border: 6px solid #f3f3f3;
          border-top: 6px solid #2a5298;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .no-tasks {
          text-align: center;
          padding: 60px;
          color: #6c757d;
          font-style: italic;
        }
        
        .add-task-row {
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
          margin-bottom: 15px;
          padding: 15px;
          border-radius: 8px;
        }
        
        .add-task-row table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .add-task-row td {
          padding: 8px;
          vertical-align: top;
        }
        
        .add-task-row label {
          display: block;
          font-weight: 600;
          margin-bottom: 5px;
          font-size: 12px;
          color: #495057;
        }
        
        .instruction-box {
          background: #e7f3ff;
          border-left: 4px solid #2a5298;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        
        .instruction-box h4 {
          margin-bottom: 10px;
          color: #1e3c72;
        }
        
        .instruction-box ul {
          margin-left: 20px;
          line-height: 1.8;
        }
      </style>
    </head>
    <body>
      <div class="loading" id="loading">
        <div class="spinner"></div>
      </div>
      
      <div class="header">
        <h2>
          <span>📋</span>
          <span>Quick Review & Manage Tasks - ${_htmlEsc(picName)}</span>
        </h2>
        <p>Week: ${_htmlEsc(weekLabel)}</p>
      </div>
      
      <div class="tabs">
        <button class="tab-button active" onclick="showTab('update')">
          📝 Cập nhật công việc hiện tại
        </button>
        <button class="tab-button" onclick="showTab('add')">
          ➕ Thêm công việc mới
        </button>
      </div>
      
      <!-- TAB 1: UPDATE EXISTING TASKS -->
      <div id="tab-update" class="tab-content active">
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-number">${totalTasks}</div>
            <div class="card-label">TỔNG CÔNG VIỆC</div>
          </div>
          <div class="summary-card">
            <div class="card-number">${completedTasks}</div>
            <div class="card-label">HOÀN THÀNH</div>
          </div>
          <div class="summary-card">
            <div class="card-number">${pendingTasks}</div>
            <div class="card-label">PENDING</div>
          </div>
          <div class="summary-card">
            <div class="card-number">${priorityTasks}</div>
            <div class="card-label">QUAN TRỌNG</div>
          </div>
          <div class="summary-card">
            <div class="card-number">${notStartedTasks}</div>
            <div class="card-label">CHƯA BẮT ĐẦU</div>
          </div>
        </div>
        
        ${totalTasks > 0 ? `
          <div class="task-table-container">
            <table class="task-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Row</th>
                  <th style="width: 40px;">⭐</th>
                  <th style="width: 150px;">Type</th>
                  <th style="width: 200px;">Key Task</th>
                  <th style="width: 200px;">Sub Task</th>
                  <th style="width: 120px;">Start Date</th>
                  <th style="width: 120px;">Finish Date</th>
                  <th style="width: 120px;">Deadline</th>
                  <th style="width: 120px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${weekRows.map(task => {
                  let rowClass = '';
                  if (task.priority) rowClass = 'priority-row';
                  else if (task.status === 'Completed') rowClass = 'completed-row';
                  
                  return `
                    <tr class="${rowClass}" data-row="${task.row}">
                      <td style="font-weight: bold; text-align: center;">${task.row}</td>
                      <td style="text-align: center;">
                        <input type="checkbox" 
                               id="priority_${task.row}" 
                               ${task.priority ? 'checked' : ''}>
                      </td>
                      <td>
                        <div class="autocomplete-container">
                          <input type="text" 
                                 id="type_${task.row}" 
                                 class="autocomplete-input task-type" 
                                 value="${_htmlEsc(task.type || '')}"
                                 placeholder="Type to search..."
                                 autocomplete="off"
                                 data-options='${JSON.stringify(typeOptions)}'>
                          <div id="type_${task.row}_dropdown" class="autocomplete-dropdown"></div>
                        </div>
                      </td>
                      <td>
                        <div class="autocomplete-container">
                          <input type="text" 
                                 id="keyTask_${task.row}" 
                                 class="autocomplete-input task-key" 
                                 value="${_htmlEsc(task.key || '')}"
                                 placeholder="Type to search..."
                                 autocomplete="off"
                                 data-options='${JSON.stringify(keyTaskOptions)}'>
                          <div id="keyTask_${task.row}_dropdown" class="autocomplete-dropdown"></div>
                        </div>
                      </td>
                      <td>
                        <input type="text" 
                               id="subTask_${task.row}" 
                               value="${_htmlEsc(task.sub || '')}"
                               placeholder="Enter sub task">
                      </td>
                      <td>
                        <input type="date" 
                               id="startDate_${task.row}" 
                               value="${_formatDateForHTMLInput(task.start)}">
                      </td>
                      <td>
                        <input type="date" 
                               id="finishDate_${task.row}" 
                               value="${_formatDateForHTMLInput(task.finish)}">
                      </td>
                      <td>
                        <input type="date" 
                               id="deadline_${task.row}" 
                               value="${_formatDateForHTMLInput(task.deadline)}">
                      </td>
                      <td>
                        <select id="status_${task.row}">
                          ${statusOptions.map(opt => `
                            <option value="${opt}" ${task.status === opt ? 'selected' : ''}>
                              ${opt}
                            </option>
                          `).join('')}
                        </select>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="button-group">
            <button class="btn btn-primary" onclick="saveUpdates()">
              💾 LƯU CẬP NHẬT
            </button>
            <button class="btn btn-secondary" onclick="google.script.host.close()">
              🚪 ĐÓNG
            </button>
          </div>
        ` : `
          <div class="no-tasks">
            <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
            <p>Không có công việc nào trong tuần này</p>
          </div>
        `}
      </div>
      
      <!-- TAB 2: ADD NEW TASKS -->
      <div id="tab-add" class="tab-content">
        <div class="instruction-box">
          <h4>📌 Hướng dẫn thêm công việc:</h4>
          <ul>
            <li><strong>Type & Key Task:</strong> Gõ để tìm kiếm, dùng phím mũi tên để chọn</li>
            <li><strong>Ngày tháng:</strong> Chọn từ date picker</li>
            <li><strong>Priority:</strong> Tích vào nếu là công việc quan trọng</li>
            <li><strong>Tối thiểu:</strong> Type, Key Task, Sub Task, Start Date, Deadline</li>
          </ul>
        </div>
        
        <button class="btn btn-add" onclick="addTaskRow()">
          ➕ Thêm dòng mới
        </button>
        
        <div id="addTaskContainer">
          <!-- Task rows will be added here dynamically -->
        </div>
        
        <div class="button-group">
          <button class="btn btn-primary" onclick="saveNewTasks()">
            💾 LƯU CÔNG VIỆC MỚI
          </button>
          <button class="btn btn-secondary" onclick="google.script.host.close()">
            🚪 ĐÓNG
          </button>
        </div>
      </div>
      
      <script>
        let taskRowCounter = 0;
        
        // Tab switching
        function showTab(tabName) {
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          document.getElementById('tab-' + tabName).classList.add('active');
          event.target.classList.add('active');
          
          // Add first row when switching to add tab
          if (tabName === 'add' && document.getElementById('addTaskContainer').children.length === 0) {
            addTaskRow();
          }
        }
        
        // Add new task row with autocomplete
        function addTaskRow() {
          taskRowCounter++;
          const container = document.getElementById('addTaskContainer');
          const rowId = 'taskRow_' + taskRowCounter;
          
          const typeOptions = ${JSON.stringify(typeOptions)};
          const keyTaskOptions = ${JSON.stringify(keyTaskOptions)};
          const statusOptions = ${JSON.stringify(statusOptions)};
          
          const rowHTML = \`
            <div class="add-task-row" id="\${rowId}">
              <table>
                <tr>
                  <td style="width: 15%;">
                    <label>Type *</label>
                    <div class="autocomplete-container">
                      <input type="text" 
                             id="newType_\${taskRowCounter}" 
                             class="autocomplete-input" 
                             placeholder="Type to search..."
                             autocomplete="off"
                             data-options='\${JSON.stringify(typeOptions)}'
                             required>
                      <div id="newType_\${taskRowCounter}_dropdown" class="autocomplete-dropdown"></div>
                    </div>
                  </td>
                  <td style="width: 25%;">
                    <label>Key Task *</label>
                    <div class="autocomplete-container">
                      <input type="text" 
                             id="newKeyTask_\${taskRowCounter}" 
                             class="autocomplete-input" 
                             placeholder="Type to search..."
                             autocomplete="off"
                             data-options='\${JSON.stringify(keyTaskOptions)}'
                             required>
                      <div id="newKeyTask_\${taskRowCounter}_dropdown" class="autocomplete-dropdown"></div>
                    </div>
                  </td>
                  <td style="width: 25%;">
                    <label>Sub Task *</label>
                    <input type="text" id="newSubTask_\${taskRowCounter}" placeholder="Nhập sub task" required>
                  </td>
                  <td style="width: 10%;">
                    <label>Start Date *</label>
                    <input type="date" id="newStartDate_\${taskRowCounter}" 
                           onchange="autoFillDates(\${taskRowCounter})" required>
                  </td>
                  <td style="width: 10%;">
                    <label>Finish Date</label>
                    <input type="date" id="newFinishDate_\${taskRowCounter}">
                  </td>
                  <td style="width: 10%;">
                    <label>Deadline *</label>
                    <input type="date" id="newDeadline_\${taskRowCounter}" required>
                  </td>
                  <td style="width: 3%;">
                    <label>⭐</label>
                    <input type="checkbox" id="newPriority_\${taskRowCounter}">
                  </td>
                  <td style="width: 2%;">
                    <label>&nbsp;</label>
                    <button class="btn btn-delete" onclick="deleteTaskRow('\${rowId}')">🗑️</button>
                  </td>
                </tr>
                <tr>
                  <td colspan="8">
                    <label>Status</label>
                    <select id="newStatus_\${taskRowCounter}">
                      \${statusOptions.map((opt, idx) => 
                        '<option value="' + opt + '"' + (idx === 0 ? ' selected' : '') + '>' + opt + '</option>'
                      ).join('')}
                    </select>
                  </td>
                </tr>
              </table>
            </div>
          \`;
          
          container.insertAdjacentHTML('beforeend', rowHTML);
          
          // Initialize autocomplete for new row
          setTimeout(() => {
            initAutocomplete();
          }, 50);
        }
        
        // Auto-fill dates
        function autoFillDates(rowId) {
          const startDateInput = document.getElementById('newStartDate_' + rowId);
          const finishDateInput = document.getElementById('newFinishDate_' + rowId);
          const deadlineInput = document.getElementById('newDeadline_' + rowId);
          
          if (startDateInput.value) {
            if (!finishDateInput.value) {
              finishDateInput.value = startDateInput.value;
            }
            if (!deadlineInput.value) {
              deadlineInput.value = startDateInput.value;
            }
          }
        }
        
        function deleteTaskRow(rowId) {
          const row = document.getElementById(rowId);
          if (row) {
            row.remove();
          }
        }
        
        // Save updates from Tab 1
        function saveUpdates() {
          const updates = [];
          const rows = document.querySelectorAll('#tab-update tbody tr');
          
          rows.forEach(row => {
            const rowNum = row.getAttribute('data-row');
            if (!rowNum) return;
            
            updates.push({
              row: parseInt(rowNum),
              type: document.getElementById('type_' + rowNum).value,
              keyTask: document.getElementById('keyTask_' + rowNum).value,
              subTask: document.getElementById('subTask_' + rowNum).value,
              startDate: document.getElementById('startDate_' + rowNum).value,
              finishDate: document.getElementById('finishDate_' + rowNum).value,
              deadline: document.getElementById('deadline_' + rowNum).value,
              status: document.getElementById('status_' + rowNum).value,
              priority: document.getElementById('priority_' + rowNum).checked
            });
          });
          
          if (updates.length === 0) {
            alert('⚠️ Không có thay đổi nào để lưu');
            return;
          }
          
          const loading = document.getElementById('loading');
          loading.classList.add('active');
          
          google.script.run
            .withSuccessHandler(function(result) {
              loading.classList.remove('active');
              alert('✅ ' + result.message);
              google.script.host.close();
            })
            .withFailureHandler(function(error) {
              loading.classList.remove('active');
              alert('❌ Lỗi: ' + error.message);
            })
            .executePICCombinedUpdate(updates, false);
        }
        
        // Save new tasks from Tab 2
        function saveNewTasks() {
          const newTasks = [];
          
          for (let i = 1; i <= taskRowCounter; i++) {
            const typeElem = document.getElementById('newType_' + i);
            if (!typeElem) continue;
            
            const type = typeElem.value;
            const keyTask = document.getElementById('newKeyTask_' + i).value;
            const subTask = document.getElementById('newSubTask_' + i).value;
            const startDate = document.getElementById('newStartDate_' + i).value;
            const finishDate = document.getElementById('newFinishDate_' + i).value;
            const deadline = document.getElementById('newDeadline_' + i).value;
            const status = document.getElementById('newStatus_' + i).value;
            const priority = document.getElementById('newPriority_' + i).checked;
            
            if (!type || !keyTask || !subTask || !startDate || !deadline) {
              alert('⚠️ Vui lòng điền đầy đủ thông tin bắt buộc (*) cho tất cả các dòng!');
              return;
            }
            
            newTasks.push({
              type, keyTask, subTask, startDate, finishDate, deadline, status, priority
            });
          }
          
          if (newTasks.length === 0) {
            alert('⚠️ Vui lòng thêm ít nhất một công việc!');
            return;
          }
          
          const loading = document.getElementById('loading');
          loading.classList.add('active');
          
          google.script.run
            .withSuccessHandler(function(result) {
              loading.classList.remove('active');
              alert('✅ ' + result.message);
              google.script.host.close();
            })
            .withFailureHandler(function(error) {
              loading.classList.remove('active');
              alert('❌ Lỗi: ' + error.message);
            })
            .executePICCombinedAdd(newTasks, false);
        }
        
        // AUTOCOMPLETE FUNCTIONALITY
        function initAutocomplete() {
          const autocompleteInputs = document.querySelectorAll('.autocomplete-input');
          
          autocompleteInputs.forEach(input => {
            const options = JSON.parse(input.getAttribute('data-options') || '[]');
            const dropdownId = input.id + '_dropdown';
            const dropdown = document.getElementById(dropdownId);
            
            if (!dropdown) return;
            
            let selectedIndex = -1;
            
            // Input event - filter and show suggestions
            input.addEventListener('input', function() {
              const value = this.value.toLowerCase();
              selectedIndex = -1;
              
              if (value.length === 0) {
                dropdown.classList.remove('active');
                return;
              }
              
              // Filter options
              const filtered = options.filter(opt => 
                opt.toLowerCase().includes(value)
              );
              
              if (filtered.length === 0) {
                dropdown.classList.remove('active');
                return;
              }
              
              // Build dropdown items
              dropdown.innerHTML = filtered.map((opt, idx) => 
                \`<div class="autocomplete-item" data-value="\${opt}" data-index="\${idx}">
                  \${opt}
                </div>\`
              ).join('');
              
              dropdown.classList.add('active');
              
              // Add click handlers
              dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', function() {
                  input.value = this.getAttribute('data-value');
                  dropdown.classList.remove('active');
                });
              });
            });
            
            // Keyboard navigation
            input.addEventListener('keydown', function(e) {
              const items = dropdown.querySelectorAll('.autocomplete-item');
              
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateHighlight(items, selectedIndex);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                updateHighlight(items, selectedIndex);
              } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
              } else if (e.key === 'Escape') {
                dropdown.classList.remove('active');
              }
            });
            
            // Focus event - show all options
            input.addEventListener('focus', function() {
              if (this.value.length > 0) {
                this.dispatchEvent(new Event('input'));
              }
            });
            
            // Click outside to close
            document.addEventListener('click', function(e) {
              if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
              }
            });
          });
        }
        
        function updateHighlight(items, index) {
          items.forEach((item, idx) => {
            if (idx === index) {
              item.classList.add('highlighted');
              item.scrollIntoView({ block: 'nearest' });
            } else {
              item.classList.remove('highlighted');
            }
          });
        }
        
        // Initialize autocomplete when DOM is ready
        setTimeout(() => {
          initAutocomplete();
        }, 100);
        
      </script>
    </body>
    </html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1600).setHeight(850),
    'Quick Review & Manage Tasks - ' + picName
  );
}
/**
 * 🆕 NEW FUNCTION: Send Weekly Report with Preview Dialog
 * Hiển thị dialog với 2 tabs:
 * - Tab 1: This Week's Progress (read-only)
 * - Tab 2: Next Week's Plan (read-only)
 * PIC chỉ xem và confirm để gửi email
 */
/**
 * ✅ FIXED: PIC send weekly report (MULTI-ROLE SUPPORT)
 */
function picSendWeeklyReportWithPreview() {
  const currentUser = _getCurrentUserEmail();
  
  // ✅ FIX: Check multi-role permission
  if (!_checkUserHasAnyRole(currentUser, [CONFIG.ROLES.PIC, CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN])) {
    _getUi().alert('⛔ Access denied. PIC, HOD, or Admin role required.');
    return;
  }
  
  // Get all tasks for this PIC
  const rows = _fetchAllRows();
  const picRows = rows.filter(r => r.picName === picName);
  
  if (picRows.length === 0) {
    _getUi().alert(`📭 No tasks found for ${picName}`);
    return;
  }
  
  // Get week boundaries
  const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
  
  // Filter tasks by week
  const thisWeekRows = _filterWeekRows(picRows, monday, saturday);
  const nextWeekRows = _filterNextWeekRows(picRows, nextMonday, nextSaturday);
  
  const weekLabel = `${_formatDate(monday, 'dd/MM/yyyy')} - ${_formatDate(saturday, 'dd/MM/yyyy')}`;
  const planLabel = `${_formatDate(nextMonday, 'dd/MM/yyyy')} - ${_formatDate(nextSaturday, 'dd/MM/yyyy')}`;
  
  // Check if all tasks have Task Result filled
  const incompleteResults = thisWeekRows.filter(r => !r.result || r.result.toString().trim() === '');
  
  // Calculate metrics
  const totalTasks = thisWeekRows.length;
  const completedTasks = thisWeekRows.filter(r => r.status === CONFIG.STATUS.COMPLETED).length;
  const pendingTasks = thisWeekRows.filter(r => _isPendingStatus(r.status)).length;
  const priorityTasks = thisWeekRows.filter(r => r.priority).length;
  
  // Build HTML
  const ui = _getUi();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0;
          margin: 0;
        }
        
        .loading {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: none;
          z-index: 9999;
        }
        
        .loading.active {
          display: block;
        }
        
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid #fff;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 25px 30px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .warning-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px 20px;
          margin: 20px 30px;
          border-radius: 6px;
        }
        
        .warning-box h4 {
          color: #856404;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .warning-box ul {
          color: #856404;
          margin-left: 20px;
          line-height: 1.8;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          padding: 20px 30px;
          background: white;
          margin: 0 30px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card {
          text-align: center;
          padding: 15px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 8px;
        }
        
        .card-number {
          font-size: 32px;
          font-weight: bold;
          color: #2a5298;
          margin-bottom: 5px;
        }
        
        .card-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          font-weight: 600;
        }
        
        .tabs {
          display: flex;
          gap: 10px;
          padding: 0 30px;
          background: white;
          margin: 0 30px;
          border-radius: 8px 8px 0 0;
          overflow: hidden;
        }
        
        .tab-button {
          padding: 15px 30px;
          border: none;
          background: transparent;
          color: #666;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }
        
        .tab-button:hover {
          background: #f8f9fa;
        }
        
        .tab-button.active {
          color: #2a5298;
          border-bottom-color: #2a5298;
          background: #f8f9fa;
        }
        
        .tab-content {
          display: none;
          padding: 30px;
          background: white;
          margin: 0 30px 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-height: 500px;
          overflow-y: auto;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .task-table-container {
          overflow-x: auto;
        }
        
        .task-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .task-table thead {
          background: #2a5298;
          color: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .task-table th {
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          border-bottom: 2px solid #1e3c72;
        }
        
        .task-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
        }
        
        .task-table tr.priority-row {
          background-color: #fff8cc !important;
        }
        
        .task-table tr.completed-row {
          background-color: #d4edda !important;
        }
        
        .task-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        
        .no-tasks {
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }
        
        .legend {
          background: #f8f9fa;
          padding: 12px 20px;
          border-radius: 6px;
          margin-top: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .legend strong {
          margin-right: 10px;
        }
        
        .legend span {
          padding: 4px 12px;
          border-radius: 4px;
        }
        
        .button-group {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 25px;
          padding: 20px 30px;
          background: white;
          margin: 0 30px 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .btn {
          padding: 14px 40px;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          box-shadow: 0 4px 6px rgba(40, 167, 69, 0.3);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(40, 167, 69, 0.4);
        }
        
        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: #6c757d;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
      </style>
    </head>
    <body>
      <div class="loading" id="loading">
        <div class="spinner"></div>
      </div>
      
      <div class="header">
        <h2>
          <span>📧</span>
          <span>Send Weekly Report - ${_htmlEsc(picName)}</span>
        </h2>
        <p>Week: ${_htmlEsc(weekLabel)}</p>
      </div>
      
      ${incompleteResults.length > 0 ? `
      <div class="warning-box">
        <h4>⚠️ Task Result chưa hoàn thiện</h4>
        <ul>
          <li>Phát hiện <strong>${incompleteResults.length}</strong> công việc chưa có Task Result</li>
          <li>Rows: ${incompleteResults.map(r => r.row).join(', ')}</li>
          <li>Vui lòng điền Task Result trước khi gửi báo cáo</li>
        </ul>
      </div>
      ` : ''}
      
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-number">${totalTasks}</div>
          <div class="card-label">TOTAL TASKS</div>
        </div>
        <div class="summary-card">
          <div class="card-number">${completedTasks}</div>
          <div class="card-label">COMPLETED</div>
        </div>
        <div class="summary-card">
          <div class="card-number">${pendingTasks}</div>
          <div class="card-label">PENDING</div>
        </div>
        <div class="summary-card">
          <div class="card-number">${priorityTasks}</div>
          <div class="card-label">PRIORITY</div>
        </div>
      </div>
      
      <div class="tabs">
        <button class="tab-button active" onclick="showTab('thisweek')">
          📊 This Week's Progress
        </button>
        <button class="tab-button" onclick="showTab('nextweek')">
          📅 Next Week's Plan
        </button>
      </div>
      
      <!-- TAB 1: THIS WEEK'S PROGRESS -->
      <div id="tab-thisweek" class="tab-content active">
        ${thisWeekRows.length > 0 ? `
          <div class="task-table-container">
            <table class="task-table">
             <thead>
  <tr>
    <th style="width: 50px;">Row</th>
    <th style="width: 100px;">Start Date</th>
    <th style="width: 180px;">Key Task</th>
    <th style="width: 180px;">Sub Task</th>
    <th style="width: 200px;">Task Result</th>
    <th style="width: 100px;">Finish Date</th>
    <th style="width: 100px;">Deadline</th>
    <th style="width: 120px;">Status</th>
  </tr>
</thead>
              <tbody>
                ${thisWeekRows.map(task => {
  // 🆕 Logic màu sắc mới: Priority + Completed = xanh lá
  let rowClass = '';
  if (task.priority && task.status === CONFIG.STATUS.COMPLETED) {
    rowClass = 'completed-priority-row'; // Màu xanh cho cả priority và completed
  } else if (task.priority) {
    rowClass = 'priority-row'; // Màu vàng cho priority chưa completed
  } else if (task.status === CONFIG.STATUS.COMPLETED) {
    rowClass = 'completed-row'; // Màu xanh nhạt cho completed thường
  }
  
  return `
    <tr class="${rowClass}">
      <td style="font-weight: bold; text-align: center;">${task.row}</td>
      <td style="text-align: center;">${_formatDate(task.start, 'dd/MM/yyyy') || '-'}</td>
      <td>${_htmlEsc(task.key || '')}</td>
      <td>${_htmlEsc(task.sub || '')}</td>
      <td class="editable-cell" contenteditable="true" data-row="${task.row}" data-field="result">
        ${_htmlEsc(task.result || '')}
      </td>
      <td style="text-align: center;">${_formatDate(task.finish, 'dd/MM/yyyy') || '-'}</td>
      <td style="text-align: center;">${_formatDate(task.deadline, 'dd/MM/yyyy') || '-'}</td>
      <td class="status-cell">
        <select data-row="${task.row}" data-field="status" class="status-select">
          <option value="Not Started" ${task.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="On Hold" ${task.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
          <option value="Delayed" ${task.status === 'Delayed' ? 'selected' : ''}>Delayed</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${task.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
    </tr>
  `;
}).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="legend">
            <strong>Legend:</strong>
            <span style="background: #fff8cc;">⭐ Priority Task</span>
            <span style="background: #d4edda;">✅ Completed</span>
          </div>
        ` : `
          <div class="no-tasks">
            <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
            <p>No tasks for this week</p>
          </div>
        `}
      </div>
      
      <!-- TAB 2: NEXT WEEK'S PLAN -->
      <div id="tab-nextweek" class="tab-content">
        ${nextWeekRows.length > 0 ? `
          <div class="task-table-container">
            <table class="task-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Row</th>
                  <th style="width: 40px;">⭐</th>
                  <th style="width: 120px;">Type</th>
                  <th style="width: 180px;">Key Task</th>
                  <th style="width: 180px;">Sub Task</th>
                  <th style="width: 100px;">Start Date</th>
                  <th style="width: 100px;">Deadline</th>
                  <th style="width: 120px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${nextWeekRows.map(task => {
                  let rowClass = '';
                  if (task.priority) rowClass = 'priority-row';
                  
                  return `
                    <tr class="${rowClass}">
                      <td style="font-weight: bold; text-align: center;">${task.row}</td>
                      <td style="text-align: center;">${task.priority ? '⭐' : ''}</td>
                      <td>${_htmlEsc(task.type || '-')}</td>
                      <td>${_htmlEsc(task.key || '-')}</td>
                      <td>${_htmlEsc(task.sub || '-')}</td>
                      <td style="text-align: center;">${_formatDate(task.start, 'dd/MM') || '-'}</td>
                      <td style="text-align: center;">${_formatDate(task.deadline, 'dd/MM') || '-'}</td>
                      <td>${_htmlEsc(task.status || '-')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="legend">
            <strong>Legend:</strong>
            <span style="background: #fff8cc;">⭐ Priority Task</span>
          </div>
        ` : `
          <div class="no-tasks">
            <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
            <p>No planned tasks for next week</p>
          </div>
        `}
      </div>
      
      <div class="button-group">
        <button class="btn btn-primary" 
                onclick="sendReport()" 
                ${incompleteResults.length > 0 ? 'disabled' : ''}>
          📧 SEND REPORT
        </button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">
          🚪 CANCEL
        </button>
      </div>
      
      <script>
        function showTab(tabName) {
          // Hide all tabs
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Deactivate all buttons
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Show selected tab
          document.getElementById('tab-' + tabName).classList.add('active');
          
          // Activate corresponding button
          event.target.classList.add('active');
        }
        
        function sendReport() {
  if (confirm('Confirm sending weekly report to HOD and management?\\n\\nThe report will include:\\n- This week\\'s progress\\n- Next week\\'s plan\\n- PDF attachment')) {
    const loading = document.getElementById('loading');
    loading.classList.add('active');
    
    google.script.run
      .withSuccessHandler(function(result) {
        loading.classList.remove('active');
        alert('✅ ' + result);
        google.script.host.close();
      })
      .withFailureHandler(function(error) {
        loading.classList.remove('active');
        alert('❌ Error: ' + error.message);
      })
      .executePICSendWeeklyReport();
  }
}
      </script>
    </body>
    </html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1400).setHeight(850),
    'Send Weekly Report - ' + picName
  );
}

/**
 * 🆕 Backend function xử lý gửi email
 * Được gọi từ dialog Send Weekly Report
 */
/**
 * 🆕 ENHANCED: Gửi weekly report với updates và detailed response
 */
function executePICSendWeeklyReportWithUpdates(updates) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    // 🆕 Lưu updates trước khi gửi email
    if (updates && updates.length > 0) {
      const sh = _sheet();
      updates.forEach(update => {
        if (update.field === 'result') {
          sh.getRange(update.row, CONFIG.COL.RESULT).setValue(update.value);
        } else if (update.field === 'status') {
          sh.getRange(update.row, CONFIG.COL.STATUS).setValue(update.value);
        }
      });
    }
    
    // Call existing send email logic
    const result = executePICWeeklyReport();
    
    // 🆕 Return detailed info
    const hodEmails = _getHODEmails();
    const directorEmails = _getDirectorEmails();
    const ccEmails = [...directorEmails];
    
    return {
      success: true,
      message: result,
      recipients: `TO: ${hodEmails.join(', ')}\nCC: ${ccEmails.join(', ')}`,
      pdfStatus: '✅ PDF đã được đính kèm',
      updatedCount: updates ? updates.length : 0
    };
    
  } catch (error) {
    console.error('Error in executePICSendWeeklyReportWithUpdates:', error);
    throw new Error(`Failed to send weekly report: ${error.message}`);
  }
}

// 🆕 Giữ lại function cũ để backward compatible
function executePICSendWeeklyReport() {
  return executePICSendWeeklyReportWithUpdates([]);
}

/**
 * Helper function để format date input value cho display
 * @param {string} dateStr - dd/MM/yyyy hoặc empty
 * @returns {string} yyyy-MM-dd hoặc empty
 */
/**
 * 🔄 HELPER: Format date for HTML input type="date"
 * @param {Date|string} date
 * @returns {string} yyyy-MM-dd format hoặc empty string
 */
function _formatDateForHTMLInput(date) {
  if (!date) return '';
  
  try {
    let d;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      // Parse various date formats
      if (date.includes('/')) {
        // dd/MM/yyyy format
        const parts = date.split('/');
        if (parts.length === 3) {
          d = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
          d = new Date(date);
        }
      } else {
        d = new Date(date);
      }
    } else if (typeof date === 'number') {
      // Excel serial number
      d = new Date((date - 25569) * 86400 * 1000);
    } else {
      return '';
    }
    
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for HTML input:', error);
    return '';
  }
}

/**
 * 🔄 HELPER: Get status options for dropdown
 * @returns {Array<string>} Array of status options
 */
/**
 * 🆕 Get new 5-level status options
 * @returns {Array<string>} Array of status options
 */
function _getStatusOptionsNew() {
  return [
    'Not Started',
    'In Progress 25%',
    'In Progress 50%',
    'In Progress 75%',
    'Completed'
  ];
}

/**
 * Helper: Check if status is "Pending" (In Progress)
 * @param {string} status
 * @returns {boolean}
 */
function _isPendingStatusNew(status) {
  const pendingStatuses = ['In Progress 25%', 'In Progress 50%', 'In Progress 75%'];
  return status && pendingStatuses.includes(status.trim());
}

/**
 * 🔄 HELPER: Check if status is pending
 * @param {string} status
 * @returns {boolean}
 */
function _isPendingStatus(status) {
  const pendingStatuses = ['Not Started', 'In Progress', 'Pending'];
  return pendingStatuses.includes((status || '').toString().trim());
}

/**
 * 🆕 DEBUG: Test the new optimized empty row function
 */
function testFindEmptyRow() {
  try {
    const emptyRow = _findFirstEmptyRowOptimized();
    
    const ui = _getUi();
    ui.alert(
      'Test Find Empty Row', 
      `✅ Found empty row: ${emptyRow}\n\nThis function checks columns E, F, G, H, I, K, L, M, O for empty values.\n\nCheck console for detailed logs.`,
      ui.ButtonSet.OK
    );
    
    console.log('✅ _findFirstEmptyRowOptimized test completed');
    console.log('Empty row found:', emptyRow);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    const ui = _getUi();
    ui.alert('❌ Test Error', error.message, ui.ButtonSet.OK);
  }
}

/**
 * 🔄 ENHANCED: Get PIC name from current user email
 * Fallback mechanism để đảm bảo luôn có PIC name
 */
function _getUserPICName(userEmail) {
  try {
    // Method 1: Tìm trong data hiện có
    const rows = _fetchAllRows();
    const userRows = rows.filter(r => 
      r.picEmail && r.picEmail.toString().toLowerCase().trim() === userEmail.toLowerCase().trim()
    );
    
    if (userRows.length > 0 && userRows[0].picName) {
      return userRows[0].picName.toString().trim();
    }
    
    // Method 2: Check config mapping nếu có
    const emailToPicMap = {
      // Thêm mapping email -> PIC name nếu cần
      'giang@company.com': 'Giang',
      'user1@company.com': 'User1',
      // ... các mapping khác
    };
    
    const mappedPIC = emailToPicMap[userEmail.toLowerCase()];
    if (mappedPIC) {
      return mappedPIC;
    }
    
    // Method 3: Extract from email (fallback)
    const emailPrefix = userEmail.split('@')[0];
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    
  } catch (error) {
    console.error('Error getting PIC name:', error);
    // Ultimate fallback
    return userEmail.split('@')[0] || 'Unknown';
  }
}

/**
 * 🆕 CLEANUP: Remove old batch add function references
 * Chạy function này một lần để dọn dẹp triggers cũ nếu có
 */
function cleanupOldFunctions() {
  try {
    // Xóa các triggers cũ có thể tham chiếu đến functions đã bỏ
    const triggers = ScriptApp.getProjectTriggers();
    const oldFunctionNames = [
      'picAddNewTaskBatch',
      'showAddTaskDialog', 
      'addSingleTask',
      'picAddNewTask'
    ];
    
    let removedCount = 0;
    triggers.forEach(trigger => {
      if (oldFunctionNames.includes(trigger.getHandlerFunction())) {
        ScriptApp.deleteTrigger(trigger);
        removedCount++;
        console.log(`Removed old trigger: ${trigger.getHandlerFunction()}`);
      }
    });
    
    const ui = _getUi();
    ui.alert(
      'Cleanup Completed',
      `✅ Cleanup completed successfully!\n\nRemoved ${removedCount} old triggers.\n\nSystem is now optimized with the new combined function.`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('Cleanup error:', error);
    const ui = _getUi();
    ui.alert('⚠️ Cleanup Warning', `Cleanup completed with warnings: ${error.message}`, ui.ButtonSet.OK);
  }
}

function _showInteractiveWeekTasksDialog(picName, weekRows, monday, saturday) {
  const totalTasks = weekRows.length;
  const priorityTasks = weekRows.filter(r => r.priority).length;
  const completedTasks = weekRows.filter(r => (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED).length;
  const pendingTasks = weekRows.filter(r => _isPendingStatus(r.status)).length;
  
  const weekLabel = `${_formatDate(monday)} - ${_formatDate(saturday)}`;
  
  const taskRows = weekRows.map((r, index) => {
    const bgColor = r.priority ? '#fff8cc' : (r.status === CONFIG.STATUS.COMPLETED ? '#d4edda' : '#ffffff');
    const taskResult = r.result ? r.result.toString().substring(0, 100) + (r.result.length > 100 ? '...' : '') : '';
    
    return `
      <tr style="background: ${bgColor};" data-row="${r.row}">
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${r.row}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${_fmtDateCell(r.start)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.type)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.key)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.sub)}</td>
        <td style="border: 1px solid #ddd; padding: 4px;">
          <textarea id="result_${r.row}" style="width: 100%; height: 60px; font-size: 11px; border: 1px solid #ccc; resize: vertical;">${taskResult}</textarea>
        </td>
        <td style="border: 1px solid #ddd; padding: 4px;">
          <select id="status_${r.row}" style="width: 100%; padding: 4px;">
            <option value="In Progress 25%" ${r.status === 'In Progress 25%' ? 'selected' : ''}>In Progress 25%</option>
            <option value="In Progress 50%" ${r.status === 'In Progress 50%' ? 'selected' : ''}>In Progress 50%</option>
            <option value="In Progress 75%" ${r.status === 'In Progress 75%' ? 'selected' : ''}>In Progress 75%</option>
            <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="On Hold" ${r.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
          </select>
        </td>
        <td style="border: 1px solid #ddd; padding: 4px;">
          <input type="date" id="finish_${r.row}" value="${_formatDateForInput(r.finish)}" 
                 style="width: 100%; padding: 4px; text-align: center;">
        </td>
        <td style="border: 1px solid #ddd; padding: 4px;">
          <input type="date" id="deadline_${r.row}" value="${_formatDateForInput(r.deadline)}" 
                 style="width: 100%; padding: 4px; text-align: center; border: 2px solid #dc3545;">
        </td>
        <td style="border: 1px solid #ddd; padding: 4px; text-align: center;">
          <label style="display: flex; align-items: center; justify-content: center;">
            <input type="checkbox" id="priority_${r.row}" ${r.priority ? 'checked' : ''} 
                   style="width: 18px; height: 18px; margin: 0;">
            <span style="margin-left: 5px; font-size: 12px;">⭐</span>
          </label>
        </td>
      </tr>
    `;
  }).join('');
  
  const ui = _getUi();
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; font-size: 12px; }
      .header { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
      .stats { background: #f8f9fa; padding: 12px; border-radius: 6px; margin: 10px 0; display: flex; justify-content: space-between; }
      .stat-item { text-align: center; }
      .stat-number { font-size: 18px; font-weight: bold; color: #2c5aa0; }
      .stat-label { font-size: 10px; color: #666; text-transform: uppercase; }
      .task-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      .task-table th { background: #2c5aa0; color: white; border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
      .legend { background: #fafafa; padding: 8px; border-radius: 4px; margin: 10px 0; font-size: 11px; }
      .btn-group { text-align: center; margin-top: 15px; }
      .btn { padding: 10px 16px; margin: 3px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
      .btn-success { background: #28a745; color: white; }
      .btn-secondary { background: #6c757d; color: white; }
      .priority-notice { background: #fff8e1; border: 1px solid #ffd54f; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
    <div>
      <div class="header">
        <h3>👁️ Quick View: ${picName} - Week Tasks (Enhanced)</h3>
        <p><strong>Period:</strong> ${weekLabel}</p>
      </div>
      
      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">${totalTasks}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${priorityTasks}</div>
          <div class="stat-label">Priority Tasks</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${completedTasks}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${pendingTasks}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>
      
      <div class="priority-notice">
        <strong>✨ NEW FEATURES:</strong>
        <br>• 📅 <strong>Date Picker:</strong> Click on Finish Date and Deadline fields for easy date selection
        <br>• ⭐ <strong>Priority Tasks:</strong> Check the star checkbox to mark tasks as priority (updates Column S)
        <br>• 💾 <strong>Auto-save:</strong> All changes including priority status will be saved automatically
      </div>
      
      <div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">
        <table class="task-table">
          <thead>
            <tr>
              <th style="width: 50px;">Row</th>
              <th style="width: 80px;">Start Date</th>
              <th style="width: 100px;">Type</th>
              <th style="width: 120px;">Key Task</th>
              <th style="width: 120px;">Sub Task</th>
              <th style="width: 200px;">Task Result</th>
              <th style="width: 120px;">Status</th>
              <th style="width: 120px;">📅 Finish Date</th>
              <th style="width: 120px;">⚠️ Deadline</th>
              <th style="width: 80px;">⭐ Priority</th>
            </tr>
          </thead>
          <tbody>
            ${taskRows}
          </tbody>
        </table>
      </div>
      
      <div class="legend">
        <strong>Legend:</strong> 
        <span style="background: #fff8cc; padding: 2px 6px; border-radius: 3px;">🌟 Priority Task</span> | 
        <span style="background: #d4edda; padding: 2px 6px; border-radius: 3px;">✅ Completed</span> |
        <span style="background: #e8f4fd; padding: 2px 6px; border-radius: 3px;">📅 Date Picker Enabled</span>
      </div>
      
      <div class="btn-group">
        <button class="btn btn-success" onclick="saveAllChangesEnhanced()">💾 Save All Changes (Including Priority)</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Close</button>
      </div>
    </div>
    
    <script>
      function saveAllChangesEnhanced() {
        const rows = document.querySelectorAll('table tbody tr');
        const changes = [];
        
        rows.forEach(row => {
          const rowNum = row.getAttribute('data-row');
          const result = document.getElementById('result_' + rowNum).value;
          const status = document.getElementById('status_' + rowNum).value;
          const finish = document.getElementById('finish_' + rowNum).value;
          const deadline = document.getElementById('deadline_' + rowNum).value;
          const priority = document.getElementById('priority_' + rowNum).checked;
          
          changes.push({
            row: parseInt(rowNum),
            result: result,
            status: status,
            finish: finish,
            deadline: deadline,
            priority: priority
          });
        });
        
        google.script.run
          .withSuccessHandler((message) => {
            alert('✅ ' + message);
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('⛔ Error: ' + error.message);
          })
          .saveWeekTaskChangesEnhanced(changes);
      }
    </script>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1200).setHeight(700),
    `${picName} - Enhanced Interactive Week Tasks`
  );
}

function saveWeekTaskChangesEnhanced(changes) {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    throw new Error('Cannot identify PIC name.');
  }
  
  const sh = _sheet();
  let updatedCount = 0;
  let priorityUpdates = 0;
  
  changes.forEach(change => {
    try {
      // Update dates
      if (change.finish && change.finish !== '') {
        const finishDate = new Date(change.finish);
        if (!isNaN(finishDate.getTime())) {
          sh.getRange(change.row, CONFIG.COL.FINISH).setValue(finishDate).setNumberFormat(CONFIG.DATE_FMT_SHEET);
        }
      }
      
      if (change.deadline && change.deadline !== '') {
        const deadlineDate = new Date(change.deadline);
        if (!isNaN(deadlineDate.getTime())) {
          sh.getRange(change.row, CONFIG.COL.DEADLINE).setValue(deadlineDate).setNumberFormat(CONFIG.DATE_FMT_SHEET);
        }
      }
      
      // Update result and status
      sh.getRange(change.row, CONFIG.COL.RESULT).setValue(change.result || '');
      sh.getRange(change.row, CONFIG.COL.STATUS).setValue(change.status || '');
      
      // === MỚI: Update priority status ===
      sh.getRange(change.row, CONFIG.COL.PRIORITY).setValue(change.priority || false);
      if (change.priority) {
        priorityUpdates++;
      }
      
      updatedCount++;
    } catch (error) {
      console.error(`Error updating row ${change.row}:`, error);
    }
  });
  
  return `Updated ${updatedCount} tasks successfully!\n⭐ Priority tasks marked: ${priorityUpdates}`;
}

function _showPICWeekTasksDialog(picName, weekRows, monday, saturday) {
  const totalTasks = weekRows.length;
  const priorityTasks = weekRows.filter(r => r.priority).length;
  const completedTasks = weekRows.filter(r => (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED).length;
  const pendingTasks = weekRows.filter(r => _isPendingStatus(r.status)).length;
  
  const weekLabel = `${_formatDate(monday)} - ${_formatDate(saturday)}`;
  
  const taskRows = weekRows.map(r => {
    const bgColor = r.priority ? '#fff8cc' : (r.status === CONFIG.STATUS.COMPLETED ? '#d4edda' : '');
    return `
      <tr style="background: ${bgColor};">
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${r.row}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_fmtDateCell(r.start)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.type)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.key)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.sub)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.result)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_valOrDash(r.status)}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${_fmtDateCell(r.finish)}</td>
        <td style="border: 1px solid #ddd; padding: 6px; color: #c00; font-weight: bold;">${_fmtDateCell(r.deadline)}</td>
      </tr>
    `;
  }).join('');
  
  const ui = _getUi();
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 15px; font-size: 12px; }
      .header { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
      .stats { background: #f8f9fa; padding: 10px; border-radius: 6px; margin: 10px 0; }
      .task-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      .task-table th { background: #f2f6ff; border: 1px solid #ddd; padding: 8px; text-align: left; }
      .legend { background: #fafafa; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 11px; }
      .btn-group { text-align: center; margin-top: 15px; }
      .btn { padding: 8px 16px; margin: 3px; border: none; border-radius: 4px; cursor: pointer; }
      .btn-primary { background: #007bff; color: white; }
      .btn-success { background: #28a745; color: white; }
      .btn-secondary { background: #6c757d; color: white; }
    </style>
    <div>
      <div class="header">
        <h3>👁️ Quick View: ${picName} - Week Tasks</h3>
        <p><strong>Period:</strong> ${weekLabel}</p>
      </div>
      
      <div class="stats">
        <strong>📊 Week Statistics:</strong><br>
        • Total tasks: <strong>${totalTasks}</strong><br>
        • Priority tasks: <strong>${priorityTasks}</strong><br>
        • Completed: <strong>${completedTasks}</strong><br>
        • Pending: <strong>${pendingTasks}</strong>
      </div>
      
      <table class="task-table">
        <thead>
          <tr>
            <th>Row</th><th>Start Date</th><th>Type</th><th>Key Task</th>
            <th>Sub Task</th><th>Task Result</th><th>Status</th><th>Finish Date</th><th>Deadline</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
      
      <div class="legend">
        <strong>Legend:</strong> 
        <span style="background: #fff8cc; padding: 2px 6px;">Yellow = Priority Task</span> | 
        <span style="background: #d4edda; padding: 2px 6px;">Green = Completed</span>
      </div>
      
      <div class="btn-group">
        <button class="btn btn-primary" onclick="editTaskResults()">Edit Task Results</button>
        <button class="btn btn-success" onclick="updateTaskStatus()">Update Status</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Close</button>
      </div>
    </div>
    
    <script>
      function editTaskResults() {
        alert('Feature coming soon: Edit Task Results');
      }
      
      function updateTaskStatus() {
        alert('Feature coming soon: Update Task Status');
      }
    </script>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(900).setHeight(600),
    `${picName} - Week Tasks Overview`
  );
}

function executePICAddTask(taskData) {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    throw new Error('Cannot identify PIC name.');
  }
  
  const sh = _sheet();
  const lastRow = sh.getLastRow();
  const newRow = lastRow + 1;
  
  // Validate and parse dates
  const startDate = _parseDateString(taskData.startDate);
  const deadline = _parseDateString(taskData.deadline);
  
  if (!startDate || !deadline) {
    throw new Error('Invalid date format. Please use dd/mm/yyyy.');
  }
  
  // Add new row data - CẬP NHẬT theo cấu trúc mới
  sh.getRange(newRow, CONFIG.COL.TYPE).setValue(taskData.type);
  sh.getRange(newRow, CONFIG.COL.KEY).setValue(taskData.keyTask);
  sh.getRange(newRow, CONFIG.COL.SUB).setValue(taskData.subTask);
  sh.getRange(newRow, CONFIG.COL.RESULT).setValue(taskData.taskResult || '');
  sh.getRange(newRow, CONFIG.COL.PIC_NAME).setValue(picName);
  
  // MỚI - Start Week (có thể để trống hoặc tự động tính)
  sh.getRange(newRow, CONFIG.COL.START_WEEK).setValue('Week 1'); // Hoặc logic tự động
  
  // Các cột date đã di chuyển
  sh.getRange(newRow, CONFIG.COL.START).setValue(startDate).setNumberFormat(CONFIG.DATE_FMT_SHEET);
  sh.getRange(newRow, CONFIG.COL.DEADLINE).setValue(deadline).setNumberFormat(CONFIG.DATE_FMT_SHEET);
  
  // MỚI - Assigner (mặc định là PIC name hoặc Manager)
  
  
  return `New task added successfully at row ${newRow}!`;
}



function executePICAddTask(taskData) {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    throw new Error('Cannot identify PIC name.');
  }
  
  const sh = _sheet();
  const lastRow = sh.getLastRow();
  const newRow = lastRow + 1;
  
  // Validate and parse dates
  const startDate = _parseDateString(taskData.startDate);
  const deadline = _parseDateString(taskData.deadline);
  
  if (!startDate || !deadline) {
    throw new Error('Invalid date format. Please use dd/mm/yyyy.');
  }
  
  // Add new row data - CẬP NHẬT theo cấu trúc mới
  sh.getRange(newRow, CONFIG.COL.TYPE).setValue(taskData.type);
  sh.getRange(newRow, CONFIG.COL.KEY).setValue(taskData.keyTask);
  sh.getRange(newRow, CONFIG.COL.SUB).setValue(taskData.subTask);
  sh.getRange(newRow, CONFIG.COL.RESULT).setValue(taskData.taskResult || '');
  sh.getRange(newRow, CONFIG.COL.PIC_NAME).setValue(picName);
  // MỚI - có thể thêm Start Week nếu cần
  // sh.getRange(newRow, CONFIG.COL.START_WEEK).setValue('Week 1'); 
  sh.getRange(newRow, CONFIG.COL.START).setValue(startDate).setNumberFormat(CONFIG.DATE_FMT_SHEET);
  sh.getRange(newRow, CONFIG.COL.DEADLINE).setValue(deadline).setNumberFormat(CONFIG.DATE_FMT_SHEET);
  // MỚI - có thể thêm Assigner
  sh.getRange(newRow, CONFIG.COL.ASSIGNER).setValue(picName); // hoặc Manager name
  
  // Set PIC email
  sh.getRange(newRow, CONFIG.COL.PIC_EMAIL).setValue(currentUser);
  
  return `New task added successfully at row ${newRow}!`;
}

function _parseDateString(dateStr) {
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const year = parseInt(parts[2]);
    
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    
    return date;
  } catch (e) {
    return null;
  }
}// ================================ PDF GENERATION FUNCTIONS ===================================

function _generateAdvancedHTMLToPDF(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName, errorMsg) {
  console.log('Using advanced HTML-to-PDF fallback...');
  
  try {
    // Tạo HTML content chi tiết
    const currentDate = _formatDate(new Date(), 'dd/MM/yyyy HH:mm');
    const completedTasks = thisWeekRows.filter(r => (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED);
    const inProgressTasks = thisWeekRows.filter(r => _isPendingStatus(r.status));
    const priorityTasks = thisWeekRows.filter(r => r.priority);
    
    // Build comprehensive HTML
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Report - ${picName}</title>
    <style>
        @page { 
            size: A4; 
            margin: 20mm; 
        }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4;
            color: #2c3e50;
        }
        .header { 
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            text-align: center; 
        }
        .header h1 { 
            margin: 0 0 10px 0; 
            font-size: 24px; 
            font-weight: bold;
        }
        .header h2 { 
            margin: 0 0 15px 0; 
            font-size: 18px; 
            font-weight: normal;
            opacity: 0.9;
        }
        .info-section {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .info-table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 10px 0;
        }
        .info-table td { 
            padding: 8px 12px; 
            border: 1px solid #bdc3c7;
        }
        .info-table td:first-child { 
            font-weight: bold; 
            background: #3498db; 
            color: white; 
            width: 150px;
        }
        .stats {
            background: #e8f6f3;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .stats h3 {
            color: #27ae60;
            margin-top: 0;
            font-size: 16px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
        }
        .stat-item {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid #27ae60;
        }
        .section { 
            margin: 25px 0; 
            page-break-inside: avoid;
        }
        .section h3 { 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 8px; 
            margin-bottom: 15px;
            font-size: 16px;
        }
        .task-table { 
            width: 100%; 
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 11px;
        }
        .task-table th { 
            background: #3498db; 
            color: white; 
            padding: 10px 6px; 
            text-align: left; 
            font-weight: bold;
            border: 1px solid #2980b9;
        }
        .task-table td { 
            padding: 8px 6px; 
            border: 1px solid #bdc3c7;
            vertical-align: top;
        }
        .task-table tr:nth-child(even) { 
            background: #f8f9fa; 
        }
        .priority-task {
            background: #fff8cc !important;
            font-weight: bold;
        }
        .completed-task {
            background: #d4edda !important;
        }
        .deadline-cell {
            color: #e74c3c;
            font-weight: bold;
        }
        .footer { 
            margin-top: 30px; 
            font-size: 10px; 
            color: #7f8c8d; 
            text-align: center; 
            border-top: 1px solid #ecf0f1;
            padding-top: 15px;
        }
        .error-note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 12px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 11px;
        }
        .no-data {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📈 WEEKLY REPORT</h1>
        <h2>${picName}</h2>
        <p style="margin: 5px 0;"><strong>Report Period:</strong> ${weekLabel}</p>
        <p style="margin: 5px 0;"><strong>Plan Period:</strong> ${planLabel}</p>
        <p style="margin: 5px 0;"><strong>Generated:</strong> ${currentDate}</p>
    </div>
    
    ${errorMsg ? `<div class="error-note"><strong>⚠️ Technical Note:</strong> PDF generation encountered an issue (${errorMsg}). This HTML version contains complete data and has been automatically converted to PDF format.</div>` : ''}
    
    <div class="info-section">
        <table class="info-table">
            <tr>
                <td>PIC Name</td>
                <td>${picName}</td>
            </tr>
            <tr>
                <td>Report Period</td>
                <td>${weekLabel}</td>
            </tr>
            <tr>
                <td>Plan Period</td>
                <td>${planLabel}</td>
            </tr>
            <tr>
                <td>Generation Date</td>
                <td>${currentDate}</td>
            </tr>
        </table>
    </div>
    
    <div class="stats">
        <h3>📊 Summary Statistics</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <strong>This Week Tasks:</strong> ${thisWeekRows.length}
            </div>
            <div class="stat-item">
                <strong>Completed Tasks:</strong> ${completedTasks.length}
            </div>
            <div class="stat-item">
                <strong>In Progress Tasks:</strong> ${inProgressTasks.length}
            </div>
            <div class="stat-item">
                <strong>Priority Tasks:</strong> ${priorityTasks.length}
            </div>
            <div class="stat-item">
                <strong>Next Week Plans:</strong> ${nextWeekRows.length}
            </div>
            <div class="stat-item">
                <strong>Completion Rate:</strong> ${thisWeekRows.length > 0 ? Math.round((completedTasks.length / thisWeekRows.length) * 100) : 0}%
            </div>
        </div>
    </div>
    
    ${_buildHTMLTaskSection('1. COMPLETED TASKS THIS WEEK', completedTasks, true)}
    
    ${_buildHTMLTaskSection('2. IN PROGRESS TASKS', inProgressTasks, false)}
    
    ${_buildHTMLTaskSection(`3. PLAN FOR NEXT WEEK (${planLabel})`, nextWeekRows, false)}
    
    <div class="footer">
        <p><strong>Generated by Marketing Task Management System</strong></p>
        <p>File Format: HTML-to-PDF Conversion | ${new Date().toISOString()}</p>
        <p><em>This report contains all requested data in structured format</em></p>
    </div>
</body>
</html>`;
    
    // Tạo Google Doc từ HTML để convert PDF
    const doc = DocumentApp.create(`FALLBACK_${fileName}_${Date.now()}`);
    const docId = doc.getId();
    
    // Insert HTML content (simplified version cho Google Docs)
    const body = doc.getBody();
    body.clear();
    
    // Add title
    const title = body.appendParagraph('📈 WEEKLY REPORT - ' + picName);
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    title.setFontSize(18);
    title.setBold(true);
    
    // Add basic info
    body.appendParagraph(`Report Period: ${weekLabel}`);
    body.appendParagraph(`Plan Period: ${planLabel}`);
    body.appendParagraph(`Generated: ${currentDate}`);
    body.appendParagraph('');
    
    // Add sections với simple format
    if (completedTasks.length > 0) {
      body.appendParagraph('1. COMPLETED TASKS').setFontSize(14).setBold(true);
      completedTasks.forEach((task, i) => {
        body.appendParagraph(`${i+1}. ${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'} - ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}`);
      });
      body.appendParagraph('');
    }
    
    if (inProgressTasks.length > 0) {
      body.appendParagraph('2. IN PROGRESS TASKS').setFontSize(14).setBold(true);
      inProgressTasks.forEach((task, i) => {
        body.appendParagraph(`${i+1}. ${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'} - ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}`);
      });
      body.appendParagraph('');
    }
    
    if (nextWeekRows.length > 0) {
      body.appendParagraph('3. NEXT WEEK PLANS').setFontSize(14).setBold(true);
      nextWeekRows.forEach((task, i) => {
        body.appendParagraph(`${i+1}. ${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'} - ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}`);
      });
    }
    
    Utilities.sleep(2000);
    
    // Convert to PDF
    const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
    pdfBlob.setName(fileName + '_FALLBACK.pdf');
    
    // Cleanup
    DriveApp.getFileById(docId).setTrashed(true);
    
    console.log('Fallback PDF generated successfully');
    return pdfBlob;
    
  } catch (fallbackError) {
    console.error('Fallback PDF generation also failed:', fallbackError);
    
    // Ultimate fallback: Text-based PDF
    return _generateTextOnlyPDF(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName);
  }
}

function _buildHTMLTaskSection(title, tasks, includeResult) {
  if (tasks.length === 0) {
    return `
      <div class="section">
        <h3>${title}</h3>
        <div class="no-data">No tasks available</div>
      </div>
    `;
  }
  
  const tableHeaders = includeResult 
    ? '<th>No.</th><th>Key Task</th><th>Sub Task</th><th>Result</th><th>Start</th><th>Deadline</th><th>Status</th>'
    : '<th>No.</th><th>Key Task</th><th>Sub Task</th><th>Start</th><th>Deadline</th><th>Status</th>';
  
  const taskRows = tasks.map((task, index) => {
    const rowClass = task.priority ? 'priority-task' : 
                    (task.status === CONFIG.STATUS.COMPLETED ? 'completed-task' : '');
    
    const cells = includeResult 
      ? `<td>${index + 1}</td>
         <td>${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'}</td>
         <td>${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}</td>
         <td>${task.result || 'N/A'}</td>
         <td>${_fmtDateCell(task.start)}</td>
         <td class="deadline-cell">${_fmtDateCell(task.deadline)}</td>
         <td>${task.status ? _htmlEsc(String(task.status)) : '<em style="color:#999;">-</em>'}</td>`
      : `<td>${index + 1}</td>
         <td>${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'}</td>
         <td>${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}</td>
         <td>${_fmtDateCell(task.start)}</td>
         <td class="deadline-cell">${_fmtDateCell(task.deadline)}</td>
         <td>${task.status ? _htmlEsc(String(task.status)) : '<em style="color:#999;">-</em>'}</td>`;
    
    return `<tr class="${rowClass}">${cells}</tr>`;
  }).join('');
  
  return `
    <div class="section">
      <h3>${title}</h3>
      <table class="task-table">
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
    </div>
  `;
}

function _generateTextOnlyPDF(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName) {
  console.log('Using text-only PDF as ultimate fallback...');
  
  const doc = DocumentApp.create(`TEXT_${fileName}_${Date.now()}`);
  const body = doc.getBody();
  
  body.clear();
  body.appendParagraph('WEEKLY REPORT - ' + picName);
  body.appendParagraph('Report: ' + weekLabel);
  body.appendParagraph('Plan: ' + planLabel);
  body.appendParagraph('Generated: ' + new Date().toString());
  body.appendParagraph('');
  body.appendParagraph('SUMMARY:');
  body.appendParagraph('- This week tasks: ' + thisWeekRows.length);
  body.appendParagraph('- Next week plans: ' + nextWeekRows.length);
  body.appendParagraph('');
  body.appendParagraph('Note: This is a simplified text-only version due to technical limitations.');
  
  const docId = doc.getId();
  Utilities.sleep(1000);
  
  const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
  pdfBlob.setName(fileName + '_TEXT.pdf');
  
  DriveApp.getFileById(docId).setTrashed(true);
  
  return pdfBlob;
}

function _buildPDFTable(rows, includeResult = true) {
  if (rows.length === 0) {
    return '<p><em>No data available</em></p>';
  }
  
  // ✅ DEBUG LOG
  console.log('=== PDF Table Building ===');
  console.log('Rows count:', rows.length);
  if (rows.length > 0) {
    console.log('First row data:', rows[0].key, rows[0].sub, rows[0].result);
  }
  
  const headers = includeResult 
    ? ['Row', 'Type', 'Key Task', 'Sub Task', 'Task Result', 'Start', 'Finish', 'Status', 'Deadline']
    : ['Row', 'Type', 'Key Task', 'Sub Task', 'Start', 'Deadline'];
    
  const headerRow = headers.map(h => `<th>${h}</th>`).join('');
  
  const dataRows = rows.map(r => {
    const rowClass = r.priority ? 'priority' : (r.status === CONFIG.STATUS.COMPLETED ? 'completed' : '');
    
    // ✅ FIX: Show actual data without fallback
    const typeVal = r.type || '-';
    const keyVal = r.key || 'No data';  // ✅ Changed from hidden fallback
    const subVal = r.sub || 'No data';   // ✅ Changed from hidden fallback
    const resultVal = r.result || '-';
    const statusVal = r.status || '-';
    
    if (includeResult) {
      return `
        <tr class="${rowClass}">
          <td>${r.row}</td>
          <td>${typeVal}</td>
          <td>${keyVal}</td>
          <td>${subVal}</td>
          <td>${resultVal}</td>
          <td>${_fmtDateCell(r.start)}</td>
          <td>${_fmtDateCell(r.finish)}</td>
          <td>${statusVal}</td>
          <td style="color: #c00; font-weight: bold;">${_fmtDateCell(r.deadline)}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="${rowClass}">
          <td>${r.row}</td>
          <td>${typeVal}</td>
          <td>${keyVal}</td>
          <td>${subVal}</td>
          <td>${_fmtDateCell(r.start)}</td>
          <td style="color: #c00; font-weight: bold;">${_fmtDateCell(r.deadline)}</td>
        </tr>
      `;
    }
  }).join('');
  
  return `
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${dataRows}</tbody>
    </table>
  `;
}
function _buildPICWeeklyEmailHTML(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows) {
  const fileLink = _getFileLink();
  const currentDate = _formatDate(new Date());
  
  // Calculate metrics
  const totalTask = thisWeekRows.length;
  const completedRows = thisWeekRows.filter(r => (r.status||'').toString().trim() === CONFIG.STATUS.COMPLETED);
  const completedCount = completedRows.length;
  const inprogressCount = thisWeekRows.filter(r => _isPendingStatus(r.status)).length;
  const importantCompletedCount = completedRows.filter(r => !!r.priority).length;
  const onTimeCount = thisWeekRows.filter(r => (r.behavior||'').toString().trim().toLowerCase() === 'on time').length;
  const otcr = totalTask ? Math.round((onTimeCount/totalTask)*1000)/10 : 0;
  
  const statusBox = _buildInfoBox('Weekly Status Information:', [
    `PIC: <b>${picName}</b>`,
    `Report Date: <b>${currentDate}</b>`,
    `Total Task: <b>${totalTask}</b>`,
    `Completed Task: <b>${completedCount}</b>`,
    `Inprogress: <b>${inprogressCount}</b>`,
    `Importance task completed: <b>${importantCompletedCount}</b>`,
    `On-time completion rate (OTCR): <b>${otcr}%</b>`
  ]);

  const tblCompleted = _buildFullTable(completedRows, { includeRowIndex: true, includeManagerComment: true });
  const inProgRows = thisWeekRows.filter(r => _isPendingStatus(r.status));
  const tblInProgress = _buildInProgressTable(inProgRows);
  const tblPlanNext = _buildPlanNextTable(nextWeekRows, { includeRowIndex: true });

  return `
  <div style="font-family:Arial,sans-serif;font-size:13px;color:#222;line-height:1.4;">
    ${_buildHeader('Weekly Report & Next Week Plan:')}
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <h3 style="margin: 0 0 10px 0; color: #2c3e50;">📋 Report Summary</h3>
      <p><strong>PIC:</strong> ${picName}</p>
      <p><strong>This Week:</strong> ${weekLabel}</p>
      <p><strong>Next Week Plan:</strong> ${planLabel}</p>
      <p><strong>Report Date:</strong> ${currentDate}</p>
    </div>
    
    ${statusBox}

    <h3 style="margin:14px 0 6px;">1) Completed Task this week</h3>
    ${tblCompleted}

    <h3 style="margin:16px 0 6px;">2) In progress Task</h3>
    ${tblInProgress}

    <h3 style="margin:16px 0 6px;">3) Plan for next week (${_htmlEsc(planLabel)})</h3>
    ${tblPlanNext}

    ${_buildLegend()}
    ${fileLink ? _buildCTA('View Detail in Sheet', fileLink) : ''}
    
    <div style="margin-top: 20px; padding: 10px; background: #e8f4fd; border-radius: 6px;">
      <p style="margin: 0; font-size: 12px;">
        <strong>📎 PDF Report:</strong> Detailed weekly report is attached to this email.<br>
        <strong>📧 Sent to:</strong> HOD (Head of Department)<br>
        <strong>📋 CC:</strong> Director and relevant stakeholders
      </p>
    </div>
    
    <p style="margin-top:15px; color: #666; font-size: 11px;">
      (Auto-generated by Marketing Task Management System - PIC Module)
    </p>
  </div>`;
}// ================================ DEBUG FUNCTIONS =====================================

function debugUserAccess() {
  const currentUser = _getCurrentUserEmail();
  const rows = _fetchAllRows();
  
  console.log('=== DEBUG USER ACCESS ===');
  console.log('Current User Email:', currentUser);
  console.log('Total rows found:', rows.length);
  
  // Check if user email exists in any column
  let foundInPIC = false, foundInHOD = false, foundInDirector = false;
  
  rows.forEach((row, index) => {
    if (row.picEmail && row.picEmail.toLowerCase() === currentUser.toLowerCase()) {
      console.log(`Found in PIC Email at row ${row.row}, PIC Name: ${row.picName}`);
      foundInPIC = true;
    }
    if (row.hodEmail && row.hodEmail.toLowerCase() === currentUser.toLowerCase()) {
      console.log(`Found in HOD Email at row ${row.row}`);
      foundInHOD = true;
    }
    if (row.directorEmail && row.directorEmail.toLowerCase() === currentUser.toLowerCase()) {
      console.log(`Found in Director Email at row ${row.row}`);
      foundInDirector = true;
    }
  });
  
  if (!foundInPIC && !foundInHOD && !foundInDirector) {
    console.log('❌ User email NOT FOUND in any role column');
    console.log('Please check columns T, U, V in the sheet');
  }
  
  // ✅ SỬ DỤNG _getUserRoles() ĐỂ LẤY TẤT CẢ ROLES
  const userRoles = _getUserRoles(currentUser);
  console.log('Detected Roles:', userRoles);
  
  // Show result dialog
  const ui = _getUi();
  const result = `
DEBUG RESULTS:
Email: ${currentUser}
Found in PIC (Column T): ${foundInPIC}
Found in HOD (Column U): ${foundInHOD} 
Found in Director (Column V): ${foundInDirector}
Detected Roles: ${userRoles.length > 0 ? userRoles.join(', ') : 'NONE'}
Total Data Rows: ${rows.length}

${userRoles.length === 0 ? '❌ EMAIL NOT FOUND IN ANY ROLE COLUMN!' : '✅ Access should work with ' + userRoles.length + ' role(s)'}
  `;
  
  ui.alert('Debug User Access', result, ui.ButtonSet.OK);
}

function showColumnData() {
  const rows = _fetchAllRows();
  let emailData = 'COLUMN EMAIL DATA:\n\n';
  
  rows.slice(0, 10).forEach(row => {
    emailData += `Row ${row.row}:\n`;
    emailData += `  PIC: ${row.picName} | Email: ${row.picEmail || 'EMPTY'}\n`;
    emailData += `  HOD Email: ${row.hodEmail || 'EMPTY'}\n`;
    emailData += `  Director Email: ${row.directorEmail || 'EMPTY'}\n\n`;
  });
  
  const ui = _getUi();
  ui.alert('Column Data (First 10 rows)', emailData, ui.ButtonSet.OK);
}

// Fix the onOpen function to always show debug menu
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const currentUser = _getCurrentUserEmail();
    
    // ✅ SỬ DỤNG _getUserRoles() ĐỂ LẤY TẤT CẢ ROLES
    const userRoles = _getUserRoles(currentUser);
    
    if (!userRoles || userRoles.length === 0) {
      // Show basic menu for unauthorized users
      ui.createMenu('🔐 System Access')
        .addItem('🚀 Initialize Access', 'initializeUserAccess')
        .addToUi();
      return;
    }
    
    // ✅ TRUYỀN userRoles (ARRAY) VÀO _createRoleBasedMenu
    _createRoleBasedMenu(ui, userRoles, currentUser);
    
  } catch (error) {
    console.error('Error in onOpen:', error);
    ui.createMenu('⚠️ Error - Try Debug')
      .addItem('🚀 Initialize Access', 'initializeUserAccess')
      .addItem('🔧 Debug Access', 'debugUserAccess')
      .addToUi();
  }
}

function forceInitializeUser() {
  const currentUser = _getCurrentUserEmail();
  
  // Clear cached data
  const props = PropertiesService.getUserProperties();
  props.deleteProperty('USER_ROLE_' + currentUser);
  props.deleteProperty('LAST_CHECK_' + currentUser);
  
  // Force re-check
  initializeUserAccess();
}function refreshUserMenu() {
  // Clear cache and re-initialize
  const currentUser = _getCurrentUserEmail();
  const props = PropertiesService.getUserProperties();
  props.deleteProperty('USER_ROLE_' + currentUser);
  props.deleteProperty('LAST_CHECK_' + currentUser);
  
  // Trigger onOpen again
  onOpen();
  
  _getUi().alert('✅ Menu đã được refresh thành công!\nNếu vẫn không thấy menu role-specific, vui lòng reload trang.');
}function showTestMenu() {
  const ui = _getUi();
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      .btn { display: block; width: 100%; padding: 12px; margin: 8px 0; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
      .btn:hover { background: #0056b3; }
    </style>
    <div>
      <h3>🧪 Test Functions</h3>
      <button class="btn" onclick="google.script.run.testWeeklyReportForSinglePIC('Giang')">Test Weekly Report (Giang)</button>
      <button class="btn" onclick="google.script.run.testPriorityEmail()">Test Priority Email</button>
      <button class="btn" onclick="google.script.run.testPriorityReminderEmail()">Test Priority Reminder</button>
      <button class="btn" onclick="google.script.run.testPICProgressEmail()">Test PIC Progress Email</button>
      <button class="btn" onclick="google.script.host.close()">Close</button>
    </div>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(400).setHeight(300),
    'Test Functions Menu'
  );
}// ================================ PDF HELPER FUNCTIONS =====================================

/**
 * ✅ FIXED VERSION: Append tasks to PDF document
 * Hiển thị đúng data, không bị "No data" khi có thực data
 */
function _appendSimpleTaskListToDoc(body, rows, includeResult = true) {
  if (!rows || rows.length === 0) {
    body.appendParagraph('No tasks available for this period').setItalic(true);
    return;
  }
  
  console.log(`Appending ${rows.length} tasks to PDF document, includeResult: ${includeResult}`);
  
  rows.forEach((row, index) => {
    try {
      // ✅ CRITICAL FIX: Proper data extraction with trim and type conversion
      const rowNum = row.row || '?';
      const type = row.type && String(row.type).trim() ? String(row.type).trim() : '-';
      const priority = row.priority ? '⭐ ' : '';
      
      // ✅ FIX: Extract Key Task - CHỈ show "No data" khi THỰC SỰ không có data
      const keyTask = (row.key && String(row.key).trim()) 
        ? String(row.key).trim() 
        : 'No data';
      
      // ✅ FIX: Extract Sub Task - CHỈ show "No data" khi THỰC SỰ không có data
      const subTask = (row.sub && String(row.sub).trim()) 
        ? String(row.sub).trim() 
        : 'No data';
      
      // Task Result - optional
      const taskResult = (includeResult && row.result && String(row.result).trim()) 
        ? String(row.result).trim() 
        : '';
      
      // Dates
      const startDate = row.start ? _formatDate(row.start, 'dd/MM/yy') : '-';
      const finishDate = row.finish ? _formatDate(row.finish, 'dd/MM/yy') : '-';
      const deadline = row.deadline ? _formatDate(row.deadline, 'dd/MM/yy') : '-';
      
      // Status and Behavior
      const status = row.status && String(row.status).trim() ? String(row.status).trim() : '-';
      const behavior = row.behavior && String(row.behavior).trim() ? String(row.behavior).trim() : '-';
      
      // ✅ BUILD TASK DISPLAY
      // Line 1: Task number and type
      const headerLine = `${index + 1}. [Row ${rowNum}] ${priority}${type}`;
      const headerPara = body.appendParagraph(headerLine);
      headerPara.setBold(true);
      if (priority) {
        headerPara.setForegroundColor('#FF9800'); // Orange for priority
      }
      
      // Line 2: Key Task
      const keyPara = body.appendParagraph(`   Key Task: ${keyTask}`);
      if (keyTask !== 'No data') {
        keyPara.setForegroundColor('#000000'); // Black for actual data
      } else {
        keyPara.setForegroundColor('#999999').setItalic(true); // Gray italic for "No data"
      }
      
      // Line 3: Sub Task
      const subPara = body.appendParagraph(`   Sub Task: ${subTask}`);
      if (subTask !== 'No data') {
        subPara.setForegroundColor('#000000');
      } else {
        subPara.setForegroundColor('#999999').setItalic(true);
      }
      
      // Line 4: Task Result (if included)
      if (includeResult) {
        if (taskResult) {
          const resultPara = body.appendParagraph(`   Result: ${taskResult}`);
          resultPara.setForegroundColor('#2196F3'); // Blue for result
        } else {
          const resultPara = body.appendParagraph(`   Result: -`);
          resultPara.setForegroundColor('#999999');
        }
      }
      
      // Line 5: Dates and Status
      const detailLine = `   Start: ${startDate} | Finish: ${finishDate} | Deadline: ${deadline}`;
      body.appendParagraph(detailLine).setForegroundColor('#666666');
      
      const statusLine = `   Status: ${status} | Behavior: ${behavior}`;
      const statusPara = body.appendParagraph(statusLine);
      
      // Color code by behavior
      if (behavior.toLowerCase().includes('delay')) {
        statusPara.setForegroundColor('#F44336'); // Red for delayed
      } else if (behavior.toLowerCase().includes('on time')) {
        statusPara.setForegroundColor('#4CAF50'); // Green for on time
      } else {
        statusPara.setForegroundColor('#666666');
      }
      
      // Spacing
      body.appendParagraph(''); // Empty line
      
    } catch (e) {
      console.error(`Error appending task ${index} (row ${row.row}):`, e);
      console.error('Stack:', e.stack);
      body.appendParagraph(`${index + 1}. [Error processing task - Row ${row.row || '?'}]`)
        .setForegroundColor('#F44336')
        .setItalic(true);
    }
  });
  
  console.log(`Successfully appended ${rows.length} tasks to PDF document`);
}
function _generateDetailedFallbackReport(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName, errorMsg) {
  console.log('Generating detailed fallback HTML report...');
  
  const currentDate = _formatDate(new Date(), 'dd/MM/yyyy HH:mm');
  
  // Build task lists
  const completedTasks = thisWeekRows.filter(r => (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED);
  const inProgressTasks = thisWeekRows.filter(r => _isPendingStatus(r.status));
  
  const buildTaskList = (tasks, includeResult = true) => {
    if (tasks.length === 0) return '<p><em>No tasks</em></p>';
    
    return tasks.map((task, index) => {
      let html = `<div style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #007bff;">`;
      html += `<strong>${index + 1}. [Row ${task.row}] ${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'}</strong><br>`;
      html += `<strong>Sub Task:</strong> ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}<br>`;
      if (includeResult) html += `<strong>Result:</strong> ${task.result || 'N/A'}<br>`;
      html += `<strong>Start:</strong> ${_fmtDateCell(task.start)} | `;
      html += `<strong>Deadline:</strong> ${_fmtDateCell(task.deadline)}<br>`;
      if (task.status) html += `<strong>Status:</strong> ${task.status}<br>`;
      if (task.priority) html += `<span style="background: #fff8cc; padding: 2px 6px; border-radius: 3px;">⭐ PRIORITY</span>`;
      html += `</div>`;
      return html;
    }).join('');
  };
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Weekly Report - ${picName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            font-size: 14px; 
            margin: 20px; 
            line-height: 1.5;
          }
          .header { 
            background: #007bff; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
            text-align: center; 
          }
          .section { 
            margin: 20px 0; 
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
          }
          .section h3 { 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 5px; 
            margin-top: 0;
          }
          .stats {
            background: #e8f4fd; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 15px 0;
          }
          .footer { 
            margin-top: 30px; 
            font-size: 12px; 
            color: #666; 
            text-align: center; 
            border-top: 1px solid #eee;
            padding-top: 15px;
          }
          .error-note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📈 WEEKLY REPORT</h1>
          <h2>${picName}</h2>
          <p><strong>Report Period:</strong> ${weekLabel}</p>
          <p><strong>Plan Period:</strong> ${planLabel}</p>
          <p><strong>Generated:</strong> ${currentDate}</p>
        </div>
        
        ${errorMsg ? `<div class="error-note"><strong>⚠️ Note:</strong> PDF generation encountered an issue: ${errorMsg}. This HTML version contains all data.</div>` : ''}
        
        <div class="stats">
          <h3>📊 Summary Statistics</h3>
          <p><strong>This Week Tasks:</strong> ${thisWeekRows.length}</p>
          <p><strong>Completed Tasks:</strong> ${completedTasks.length}</p>
          <p><strong>In Progress Tasks:</strong> ${inProgressTasks.length}</p>
          <p><strong>Priority Tasks:</strong> ${thisWeekRows.filter(r => r.priority).length}</p>
          <p><strong>Next Week Plans:</strong> ${nextWeekRows.length}</p>
        </div>
        
        <div class="section">
          <h3>1. Completed Tasks This Week</h3>
          ${buildTaskList(completedTasks, true)}
        </div>
        
        <div class="section">
          <h3>2. In Progress Tasks</h3>
          ${buildTaskList(inProgressTasks, false)}
        </div>
        
        <div class="section">
          <h3>3. Plan for Next Week (${planLabel})</h3>
          ${buildTaskList(nextWeekRows, false)}
        </div>
        
        <div class="footer">
          <p>Generated by Marketing Task Management System</p>
          <p>${new Date().toISOString()}</p>
          <p><em>File format: HTML (PDF generation fallback)</em></p>
        </div>
      </body>
    </html>
  `;
  
  const blob = Utilities.newBlob(htmlContent, 'text/html', fileName + '_FALLBACK.html');
  return blob;
}// ✅ NEW HELPER: Format Plan & Result for HTML display
function _formatPlanResultForHTML(planResult) {
  if (!planResult || planResult === 'N/A') {
    return '<em style="color: #6c757d;">No result available</em>';
  }
  
  // Convert line breaks to <br> tags
  let formatted = planResult
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
  
  // Highlight patterns (if any bold markers exist like **text**)
  formatted = formatted
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<u>$1</u>');
  
  return formatted;
}function testPDFGeneration() {
  try {
    console.log('=== Starting PDF Generation Test ===');
    
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser) || 'TestPIC';
    
    console.log('Current User:', currentUser);
    console.log('PIC Name:', picName);
    
    const allRows = _fetchAllRows();
    console.log('Total rows fetched:', allRows.length);
    
    // Test với data thực hoặc tạo fake data
    let testRows = allRows.filter(r => r.picName === picName);
    console.log('Rows for PIC:', testRows.length);
    
    // Nếu không có data thật, tạo fake data để test
    if (testRows.length === 0) {
      console.log('No real data found, creating fake test data...');
      testRows = [
        {
          row: 999,
          type: 'Test Type',
          key: 'Test Key Task',
          sub: 'Test Sub Task',
          result: 'Test Result Content',
          picName: picName,
          start: new Date(),
          finish: new Date(),
          deadline: new Date(Date.now() + 7*24*60*60*1000), // 7 days from now
          status: CONFIG.STATUS.COMPLETED,
          priority: true
        },
        {
          row: 998,
          type: 'Test Type 2',
          key: 'Test Key Task 2',
          sub: 'Test Sub Task 2',
          result: 'Test Result Content 2',
          picName: picName,
          start: new Date(),
          finish: new Date(),
          deadline: new Date(Date.now() + 14*24*60*60*1000), // 14 days from now
          status: 'In Progress 50%',
          priority: false
        }
      ];
    } else {
      // Chỉ lấy 3 rows đầu để test
      testRows = testRows.slice(0, 3);
    }
    
    const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
    const weekLabel = `From ${_twoDigitYear(monday)} - ${_twoDigitYear(saturday)}`;
    const planLabel = `${_twoDigitYear(nextMonday)} - ${_twoDigitYear(nextSaturday)}`;
    
    console.log('Week Label:', weekLabel);
    console.log('Plan Label:', planLabel);
    
    const fileName = `TEST_${picName}_Weekly_Report_${Date.now()}`;
    console.log('File Name:', fileName);
    
    // Split test data
    const thisWeekRows = testRows.slice(0, 2); // First 2 for this week
    const nextWeekRows = testRows.slice(2); // Rest for next week
    
    console.log('This week rows:', thisWeekRows.length);
    console.log('Next week rows:', nextWeekRows.length);
    
    const pdfBlob = _generateWeeklyReportPDF(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName);
    
    console.log('PDF generated, file name:', pdfBlob.getName());
    console.log('PDF size:', pdfBlob.getBytes().length, 'bytes');
    
    // Test send email với PDF
    mmhMail_({
      to: currentUser,
      subject: '[TEST] PDF Generation Fix v2 - Weekly Report',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>🧪 PDF Generation Test Results</h3>
          <p><strong>PIC:</strong> ${picName}</p>
          <p><strong>Test Data:</strong> ${thisWeekRows.length} this week, ${nextWeekRows.length} next week</p>
          <p><strong>File Name:</strong> ${pdfBlob.getName()}</p>
          <p><strong>File Size:</strong> ${Math.round(pdfBlob.getBytes().length/1024)} KB</p>
          <p><strong>Generated:</strong> ${new Date()}</p>
          
          <div style="background: #e8f4fd; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <strong>📋 Test Instructions:</strong><br>
            1. Download the attached PDF<br>
            2. Check if it opens properly<br>
            3. Verify all content is displayed<br>
            4. Report any issues in console logs
          </div>
        </div>
      `,
      attachments: [pdfBlob]
    });
    
    _getUi().alert(`✅ Test PDF sent successfully!\n\nFile: ${pdfBlob.getName()}\nSize: ${Math.round(pdfBlob.getBytes().length/1024)} KB\n\nCheck your email and verify PDF content.`);
    
  } catch (error) {
    console.error('PDF Test Error:', error);
    console.error('Error Stack:', error.stack);
    _getUi().alert('❌ Test Error: ' + error.message + '\n\nCheck console logs for details.');
  }
}function _addEnhancedPDFTaskSection(body, title, tasks, includeResult = true) {
  console.log(`Adding enhanced PDF section: ${title} with ${tasks.length} tasks`);
  
  // Section title
  const sectionTitle = body.appendParagraph(title);
  sectionTitle.setFontSize(14).setBold(true).setForegroundColor('#2c5aa0');
  sectionTitle.setSpacingAfter(10);
  
  if (tasks.length === 0) {
    body.appendParagraph('No tasks available for this section')
      .setFontSize(12).setItalic(true).setForegroundColor('#6c757d');
    body.appendParagraph('');
    return;
  }
  
  // Create enhanced tasks table
  const table = body.appendTable();
  table.setBorderWidth(1);
  table.setBorderColor('#dee2e6');
  
  // ✅ FIX: Header row với Task Result column
  const headerRow = table.appendTableRow();
  const headers = ['Row', 'Key Task', 'Sub Task'];
  if (includeResult) headers.push('Task Result'); // ⭐ THÊM CỘT NÀY
  headers.push('Start Date', 'Deadline', 'Status');
  
  headers.forEach((headerText, index) => {
    const cell = headerRow.appendTableCell(headerText);
    cell.setBackgroundColor('#2c5aa0');
    cell.getChild(0).asParagraph()
        .setForegroundColor('#ffffff')
        .setBold(true)
        .setFontSize(9)
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    cell.setPaddingTop(8).setPaddingBottom(8)
        .setPaddingLeft(6).setPaddingRight(6);
    
    // ✅ FIX: Set column widths tối ưu cho PDF A4
    if (index === 0) cell.setWidth(35); // Row number
    else if (index === 1) cell.setWidth(100); // Key Task
    else if (index === 2) cell.setWidth(includeResult ? 80 : 120); // Sub Task
    else if (includeResult && index === 3) cell.setWidth(100); // Task Result
    else if (index === headers.length - 3) cell.setWidth(60); // Start Date
    else if (index === headers.length - 2) cell.setWidth(60); // Deadline
    else if (index === headers.length - 1) cell.setWidth(65); // Status
  });
  
  // ✅ FIX: Data rows with Task Result and highlighting
  tasks.forEach((task, index) => {
    const row = table.appendTableRow();
    
    // ✅ HIGHLIGHT LOGIC for PDF
    let bgColor = '#ffffff';
    const behaviorLower = (task.behavior || '').toString().trim().toLowerCase();
    const statusLower = (task.status || '').toString().trim().toLowerCase();
    
    if (task.priority) {
      bgColor = '#fff8e1'; // Yellow for priority
    } else if (statusLower === 'completed') {
      bgColor = '#e8f5e8'; // Green for completed
    } else if (behaviorLower === 'delayed') {
      bgColor = '#ffebee'; // Pink/red for delayed
    }
    
    // Build row data with Task Result
    const rowData = [
      (task.row || (index + 1)).toString(),
      task.key || 'Daily Task',
      task.sub || 'N/A'
    ];
    
    if (includeResult) {
      // ✅ ADD: Task Result - remove URLs vì PDF không support clickable links
      let resultText = task.result || 'N/A';
      // Remove URL patterns để tiết kiệm space trong PDF
      resultText = resultText.replace(/https?:\/\/[^\s]+/gi, '[Link]');
      // Truncate if still too long
      rowData.push(resultText.length > 100 ? resultText.substring(0, 97) + '...' : resultText);
    }
    
    rowData.push(
      _fmtDateCell(task.start),
      _fmtDateCell(task.deadline),
      task.status || 'N/A'
    );
    
    // Add cells with styling
    rowData.forEach((cellData, cellIndex) => {
      const cell = row.appendTableCell(cellData);
      cell.setBackgroundColor(bgColor); // ✅ APPLY BACKGROUND COLOR
      cell.setPaddingTop(8).setPaddingBottom(8)
          .setPaddingLeft(6).setPaddingRight(6);
      
      const para = cell.getChild(0).asParagraph();
      para.setFontSize(8);
      
      // Special formatting
      if (cellIndex === 0) { // Row number
        para.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .setBold(true)
            .setForegroundColor('#2c5aa0')
            .setFontSize(9);
      } else if (cellIndex === rowData.length - 2) { // Deadline
        para.setForegroundColor('#dc3545').setBold(true)
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      } else if (cellIndex === rowData.length - 3) { // Start date
        para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
      
      // Word wrap for long content
      if (cellData.length > 30) {
        para.setFontSize(9);
      }
    });
  });
  
  body.appendParagraph(''); // Spacing after table
  console.log(`Enhanced section ${title} added with ${tasks.length} tasks`);
}

function _generateEnhancedHTMLFallback(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName, errorMsg) {
  console.log('Generating enhanced HTML fallback due to PDF error:', errorMsg);
  
  const currentDate = _formatDate(new Date(), 'dd/MM/yyyy HH:mm');
  const completedTasks = thisWeekRows.filter(r => (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED);
  const inProgressTasks = thisWeekRows.filter(r => _isPendingStatus(r.status));
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weekly Report - ${picName} (PDF Fallback)</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; line-height: 1.4; color: #2c3e50; }
        .header { background: #2c5aa0; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
        .error-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .stats { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .section { margin: 25px 0; }
        .section h3 { color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 8px; }
        .task-item { background: #ffffff; border: 1px solid #dee2e6; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .priority { background: #fff8e1; border-color: #ffd54f; }
        .completed { background: #e8f5e8; border-color: #4caf50; }
        .delayed { background: #ffebee; border-color: #f44336; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📈 WEEKLY REPORT</h1>
        <h2>${picName}</h2>
        <p>Report: ${weekLabel} | Plan: ${planLabel}</p>
        <p>Generated: ${currentDate}</p>
    </div>
    
    <div class="error-notice">
        <strong>⚠️ PDF Generation Notice:</strong> ${errorMsg}<br>
        This HTML version contains complete data and can be saved as PDF using your browser's print function.
    </div>
    
    <div class="stats">
        <h3>📊 Summary Statistics</h3>
        <div>This Week Tasks: <strong>${thisWeekRows.length}</strong></div>
        <div>Completed Tasks: <strong>${completedTasks.length}</strong></div>
        <div>In Progress Tasks: <strong>${inProgressTasks.length}</strong></div>
        <div>Priority Tasks: <strong>${thisWeekRows.filter(r => r.priority).length}</strong></div>
        <div>Next Week Plans: <strong>${nextWeekRows.length}</strong></div>
    </div>
    
    ${_buildHTMLTaskList('1. COMPLETED TASKS THIS WEEK', completedTasks, true)}
    ${_buildHTMLTaskList('2. IN PROGRESS TASKS', inProgressTasks, false)}
    ${_buildHTMLTaskList(`3. PLAN FOR NEXT WEEK (${planLabel})`, nextWeekRows, false)}
    
    <div class="footer">
        <div>Generated by Marketing Task Management System</div>
        <div>File: ${fileName}_FALLBACK.html | ${new Date().toISOString()}</div>
    </div>
</body>
</html>
  `;
  
  const blob = Utilities.newBlob(htmlContent, 'text/html', fileName + '_FALLBACK.html');
  return blob;
}

function _buildHTMLTaskList(title, tasks, includeResult) {
  if (tasks.length === 0) {
    return `
      <div class="section">
        <h3>${title}</h3>
        <div style="text-align: center; color: #6c757d; font-style: italic; padding: 20px;">
          No tasks available for this section
        </div>
      </div>
    `;
  }
  
  const taskItems = tasks.map((task, index) => {
    let className = 'task-item';
    if (task.priority) className += ' priority';
    else if (task.status === CONFIG.STATUS.COMPLETED) className += ' completed';
    else if ((task.behavior||'').toString().trim().toLowerCase() === 'delayed') className += ' delayed';
    
    const priorityIndicator = task.priority ? '⭐ ' : '';
    const completedIndicator = task.status === CONFIG.STATUS.COMPLETED ? '✅ ' : '';
    
    return `
      <div class="${className}">
        <div><strong>${index + 1}. [Row ${task.row}] ${priorityIndicator}${completedIndicator}${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'}</strong></div>
        <div><strong>Sub Task:</strong> ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}</div>
        ${includeResult ? `<div><strong>Result:</strong> ${task.result || 'N/A'}</div>` : ''}
        <div><strong>Start:</strong> ${_fmtDateCell(task.start)} | <strong>Deadline:</strong> ${_fmtDateCell(task.deadline)}</div>
        <div><strong>Status:</strong> ${task.status ? _htmlEsc(String(task.status)) : '<em style="color:#999;">-</em>'}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="section">
      <h3>${title}</h3>
      ${taskItems}
    </div>
  `;
}function testEnhancedEmailReport() {
  try {
    console.log('=== TESTING ENHANCED EMAIL REPORT ===');
    
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser) || 'TestPIC';
    
    // Create comprehensive test data
    const testThisWeek = [
      {
        row: 1001,
        type: 'Marketing Campaign',
        key: 'Q4 Product Launch',
        sub: 'Social Media Strategy Development',
        result: 'Completed comprehensive campaign strategy with detailed audience analysis, content calendar, budget allocation, and performance metrics. Document includes 15 pages of strategic planning with competitor analysis and ROI projections.',
        picName: picName,
        start: new Date('2024-12-01'),
        finish: new Date('2024-12-05'),
        deadline: new Date('2024-12-06'),
        status: CONFIG.STATUS.COMPLETED,
        priority: true,
        behavior: 'on time'
      },
      {
        row: 1002,
        type: 'Content Creation',
        key: 'Blog Content Series',
        sub: 'Technical Articles Writing',
        result: 'Progress update: Completed 3 out of 5 articles. Articles focus on industry trends, best practices, and technical tutorials. Remaining 2 articles in review phase.',
        picName: picName,
        start: new Date('2024-11-28'),
        finish: new Date('2024-12-08'),
        deadline: new Date('2024-12-10'),
        status: 'In Progress 60%',
        priority: false,
        behavior: 'on time'
      },
      {
        row: 1003,
        type: 'Analytics',
        key: 'Monthly Performance Review',
        sub: 'Data Analysis and Reporting',
        result: 'Currently analyzing November performance data. Identified 15% increase in engagement rates and 8% improvement in conversion metrics.',
        picName: picName,
        start: new Date('2024-11-25'),
        finish: new Date('2024-12-07'),
        deadline: new Date('2024-12-08'),
        status: 'In Progress 80%',
        priority: true,
        behavior: 'on time'
      }
    ];
    
    const testNextWeek = [
      {
        row: 1004,
        type: 'Event Planning',
        key: 'Year-End Conference',
        sub: 'Venue Booking and Logistics Coordination',
        result: '',
        picName: picName,
        start: new Date('2024-12-09'),
        finish: new Date('2024-12-13'),
        deadline: new Date('2024-12-15'),
        status: 'Planned',
        priority: true,
        behavior: ''
      },
      {
        row: 1005,
        type: 'Brand Development',
        key: 'Visual Identity Update',
        sub: 'Logo and Brand Guidelines Revision',
        result: '',
        picName: picName,
        start: new Date('2024-12-10'),
        finish: new Date('2024-12-14'),
        deadline: new Date('2024-12-16'),
        status: 'Planned',
        priority: false,
        behavior: ''
      }
    ];
    
    const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
    const weekLabel = `From ${_twoDigitYear(monday)} - ${_twoDigitYear(saturday)}`;
    const planLabel = `${_twoDigitYear(nextMonday)} - ${_twoDigitYear(nextSaturday)}`;
    
    console.log('Generating enhanced HTML email...');
    const startTime = Date.now();
    
    const emailBody = _buildEnhancedPICWeeklyEmailHTML(picName, weekLabel, planLabel, testThisWeek, testNextWeek);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('Email generation completed in', duration, 'ms');
    console.log('Email body length:', emailBody.length, 'characters');
    
    // Send test email
    mmhMail_({
      to: currentUser,
      subject: `[TEST] Enhanced Weekly Report - ${picName} | ${weekLabel}`,
      htmlBody: emailBody
    });
    
    const ui = _getUi();
    ui.alert(
      'Enhanced Email Test Completed!', 
      `✅ Test Results:

Generation Time: ${duration}ms
Email Content: ${Math.round(emailBody.length/1024)} KB
Test Tasks: ${testThisWeek.length + testNextWeek.length}
Format: Enhanced HTML

📧 Test email sent to: ${currentUser}

Please check your email to verify:
- Professional formatting and layout
- All task data displayed correctly  
- Interactive elements working
- Statistics and metrics accurate
- Overall readability and presentation

This enhanced email format provides BETTER user experience than PDF attachments!`, 
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('Enhanced email test failed:', error);
    const ui = _getUi();
    ui.alert('Test Failed', `❌ Error: ${error.message}`, ui.ButtonSet.OK);
  }
}function debugPDFGeneration() {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser) || 'TestPIC';
    
    // Create test data
    const testThisWeek = [{
      row: 1,
      type: 'Test',
      key: 'Test Key Task',
      sub: 'Test Sub Task',
      result: 'Test Result Content',
      picName: picName,
      start: new Date(),
      finish: new Date(),
      deadline: new Date(),
      status: 'Completed',
      priority: true
    }];
    
    const testNextWeek = [{
      row: 2,
      type: 'Test',
      key: 'Next Week Task',
      sub: 'Planning Task',
      picName: picName,
      start: new Date(),
      deadline: new Date(),
      status: 'Planned',
      priority: false
    }];
    
    const fileName = `DEBUG_TEST_${Date.now()}`;
    const pdfBlob = _generateWeeklyReportPDF(
      picName,
      'Test Week Label',
      'Test Plan Label',
      testThisWeek,
      testNextWeek,
      fileName
    );
    
    // Send test email
    mmhMail_({
      to: currentUser,
      subject: '[DEBUG] PDF Test',
      htmlBody: 'Testing PDF generation - check attachment',
      attachments: [pdfBlob]
    });
    
    _getUi().alert('Debug PDF sent to your email. Check if it has content.');
    
  } catch (error) {
    _getUi().alert('Debug Error: ' + error.message);
    console.error('Debug error:', error);
  }
}function _generateSimpleTextPDF(picName, weekLabel, planLabel, thisWeekRows, nextWeekRows, fileName) {
  console.log('Using simple text PDF fallback...');
  
  const doc = DocumentApp.create(`SIMPLE_${fileName}_${Date.now()}`);
  const body = doc.getBody();
  
  body.clear();
  body.appendParagraph('WEEKLY REPORT - ' + picName).setFontSize(16).setBold(true);
  body.appendParagraph('Report: ' + weekLabel);
  body.appendParagraph('Plan: ' + planLabel);
  body.appendParagraph('Generated: ' + new Date().toString());
  body.appendParagraph('');
  
  body.appendParagraph('SUMMARY:').setBold(true);
  body.appendParagraph('- This week tasks: ' + thisWeekRows.length);
  body.appendParagraph('- Next week plans: ' + nextWeekRows.length);
  body.appendParagraph('');
  
  if (thisWeekRows.length > 0) {
    body.appendParagraph('THIS WEEK TASKS:').setBold(true);
    thisWeekRows.forEach((task, i) => {
      body.appendParagraph(`${i+1}. ${task.key || 'Task'} - ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}`);
    });
    body.appendParagraph('');
  }
  
  if (nextWeekRows.length > 0) {
    body.appendParagraph('NEXT WEEK PLANS:').setBold(true);
    nextWeekRows.forEach((task, i) => {
      body.appendParagraph(`${i+1}. ${task.key || 'Task'} - ${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}`);
    });
  }
  
  const docId = doc.getId();
  Utilities.sleep(1000);
  
  const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
  pdfBlob.setName(fileName + '_SIMPLE.pdf');
  
  DriveApp.getFileById(docId).setTrashed(true);
  return pdfBlob;
}/**
 * ✅ FIXED: HOD view monthly tasks (MULTI-ROLE SUPPORT)
 */
function hodViewMonthlyTasks() {
  const currentUser = _getCurrentUserEmail();
  
  // ✅ FIX: Check multi-role permission
  if (!_checkUserHasAnyRole(currentUser, [CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN])) {
    _getUi().alert('⛔ Access denied. HOD or Admin role required.');
    return;
  }
  
  _showMonthlyTasksDialog();
}

function _showMonthlyTasksDialog() {
  const ui = _getUi();
  
  // Get available months from MONTH sheet
  const ss = SpreadsheetApp.getActive();
  const monthSheet = ss.getSheetByName('MONTH');
  
  if (!monthSheet) {
    ui.alert('⛔ MONTH sheet not found. Please check sheet configuration.');
    return;
  }
  
  // Read month data from column D (YYYYMM format)
  const monthData = monthSheet.getRange('D6:D').getValues().flat().filter(v => v && v.toString().length === 6);
  const uniqueMonths = [...new Set(monthData)].sort().reverse(); // Latest first
  
  const monthOptions = uniqueMonths.map(month => {
    const year = month.toString().substring(0, 4);
    const monthNum = month.toString().substring(4, 6);
    const monthName = new Date(year, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
    return `<option value="${month}">${monthName} ${year} (${month})</option>`;
  }).join('');
  
  const html = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      .info-box { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
      .form-group { margin: 15px 0; }
      label { display: block; font-weight: bold; margin-bottom: 5px; }
      select, input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
      .options { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
      .btn-group { text-align: center; margin-top: 20px; }
      .btn { padding: 12px 25px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
      .btn-primary { background: #007bff; color: white; }
      .btn-success { background: #28a745; color: white; }
      .btn-secondary { background: #6c757d; color: white; }
      .checkbox-group { margin: 10px 0; }
    </style>
    <div>
      <div class="info-box">
        <h3>📈 Monthly Important Tasks Report</h3>
        <p>View and export monthly tasks from the MONTH sheet with PDF report generation.</p>
      </div>
      
      <div class="form-group">
        <label>Select Month:</label>
        <select id="monthSelect">
          <option value="">Choose month...</option>
          ${monthOptions}
        </select>
      </div>
      
      <div class="options">
        <h4>📤 Export Options:</h4>
        <div class="checkbox-group">
          <label>
            <input type="checkbox" id="sendToDirector" style="width: auto; margin-right: 8px;">
            Send copy to Director
          </label>
        </div>
        <div class="form-group">
          <label>Additional Recipients (optional):</label>
          <input type="text" id="additionalEmails" placeholder="email1@company.com, email2@company.com">
          <small>Separate multiple emails with commas</small>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" onclick="viewMonthlyData()">👁️ View Monthly Data</button>
        <button class="btn btn-success" onclick="exportMonthlyReport()">📄 Export PDF Report</button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">Cancel</button>
      </div>
    </div>
    
    <script>
      function viewMonthlyData() {
        const selectedMonth = document.getElementById('monthSelect').value;
        if (!selectedMonth) {
          alert('Please select a month first.');
          return;
        }
        
        google.script.run
          .withSuccessHandler((data) => {
            if (data) {
              showMonthlyDataPreview(data, selectedMonth);
            } else {
              alert('No data found for selected month.');
            }
          })
          .withFailureHandler((error) => {
            alert('⛔ Error: ' + error.message);
          })
          .getMonthlyTaskData(selectedMonth);
      }
      
      function exportMonthlyReport() {
        const selectedMonth = document.getElementById('monthSelect').value;
        const sendToDirector = document.getElementById('sendToDirector').checked;
        const additionalEmails = document.getElementById('additionalEmails').value;
        
        if (!selectedMonth) {
          alert('Please select a month first.');
          return;
        }
        
        google.script.run
          .withSuccessHandler((message) => {
            alert('✅ ' + message);
            google.script.host.close();
          })
          .withFailureHandler((error) => {
            alert('⛔ Error: ' + error.message);
          })
          .generateMonthlyReport(selectedMonth, sendToDirector, additionalEmails);
      }
      
     function showMonthlyDataPreview(data, selectedMonth) {
        const year = selectedMonth.substring(0, 4);
        const monthNum = selectedMonth.substring(4, 6);
        const monthName = new Date(year, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
        
        const rows = data.map((row, index) => 
          \`<tr style="background: \${index % 2 === 0 ? '#f8f9fa' : '#ffffff'};">
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">\${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2c5aa0;">\${row.rowNumber}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">\${row.keyTask}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">\${row.subTask}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">\${row.pic}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #dc3545; font-weight: bold;">\${row.deadline}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">\${row.status}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">\${row.planResult}</td>
          </tr>\`
        ).join('');
        
        const previewHtml = \`
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3 style="color: #2c5aa0; text-align: center;">📈 Monthly Tasks Preview - \${monthName} \${year}</h3>
            <p style="text-align: center; margin-bottom: 20px;"><strong>Total Tasks: \${data.length}</strong></p>
            
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0; min-width: 1000px;">
                <thead>
                  <tr style="background: #2c5aa0; color: white;">
                    <th style="border: 1px solid #ddd; padding: 10px; width: 40px;">#</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 50px;">Row</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 120px;">Key Task</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 150px;">Sub Task</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 80px;">PIC</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 90px;">Deadline</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 100px;">Status</th>
                    <th style="border: 1px solid #ddd; padding: 10px; width: 300px;">Plan & Result</th>
                  </tr>
                </thead>
                <tbody>
                  \${rows}
                </tbody>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <button onclick="google.script.host.close()" 
                      style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px;">
                Close Preview
              </button>
            </div>
          </div>
        \`;
        
        const ui = SpreadsheetApp.getUi();
        ui.showModalDialog(
          HtmlService.createHtmlOutput(previewHtml).setWidth(1100).setHeight(600),
          \`Monthly Tasks - \${monthName} \${year}\`
        );
      }
    </script>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(600).setHeight(500),
    'Monthly Important Tasks Report'
  );
}

/**
 * Lấy data từ MONTH sheet
 * ✅ COLUMNS TRONG MONTH SHEET:
 * - D: Month (YYYYMM)
 * - E: Type
 * - F: Key Task
 * - G: Sub Task  
 * - H: PIC
 * - I: Deadline
 * - J: Status
 * - K: Plan & Result
 */
/**
 * ✅ LẤY DỮ LIỆU MONTHLY TASKS TỪ SHEET "MONTH"
 * 
 * Cấu trúc sheet MONTH (row 6 trở đi):
 * - Column B: # (serial number)
 * - Column C: (có thể trống)
 * - Column D: Month (YYYYMM format) - dùng để filter
 * - Column E: Type Task
 * - Column F: Key Task
 * - Column G: PIC
 * - Column H: Deadline
 * - Column I: Status
 * - Column J: Plan & Result
 * 
 * ⚠️ KHÔNG có column Subtask trong Monthly Report!
 */
function getMonthlyTaskData(selectedMonth) {
  const ss = SpreadsheetApp.getActive();
  const monthSheet = ss.getSheetByName('MONTH');
  
  if (!monthSheet) {
    throw new Error('MONTH sheet not found');
  }
  
  const lastRow = monthSheet.getLastRow();
  if (lastRow < 6) {
    console.log('No data in MONTH sheet (lastRow < 6)');
    return [];
  }
  
  // ✅ Đọc từ column B đến J (9 columns)
  // B=serial, C=?, D=month, E=type, F=key, G=pic, H=deadline, I=status, J=result
  const dataRange = monthSheet.getRange(6, 2, lastRow - 5, 9);
  const values = dataRange.getValues();
  
  console.log(`Reading ${values.length} rows from MONTH sheet for month ${selectedMonth}`);
  
  const monthData = values
    .filter((row, index) => {
      // ✅ row[2] = Column D = Month (YYYYMM)
      if (!row[2]) return false;
      
      const rowMonth = row[2].toString().trim();
      const targetMonth = selectedMonth.toString().trim();
      
      return rowMonth === targetMonth;
    })
    .map((row, index) => {
      // ✅ ĐÚNG MAPPING:
      // row[0] = B (serial)
      // row[1] = C 
      // row[2] = D (month)
      // row[3] = E (type)
      // row[4] = F (key task)
      // row[5] = G (PIC)
      // row[6] = H (deadline)
      // row[7] = I (status)
      // row[8] = J (plan & result)
      
      return {
        rowNumber: index + 6,                                      // Row trong sheet
        serialNumber: row[0] || 'N/A',                            // Column B - #
        type: row[3] || 'N/A',                                    // Column E - Type
        keyTask: row[4] || 'N/A',                                 // Column F - Key Task
        pic: row[5] || 'N/A',                                     // Column G - PIC
        deadline: row[6] ? _formatDate(row[6]) : 'N/A',          // Column H - Deadline
        status: row[7] || 'N/A',                                  // Column I - Status
        planResult: row[8] ? _formatPlanResultWithLinks(row[8]) : 'N/A'  // Column J - Plan & Result
      };
    })
    .filter(task => task.serialNumber !== 'N/A'); // Chỉ lấy rows có serial number
  
  console.log(`Monthly data loaded: ${monthData.length} tasks for month ${selectedMonth}`);
  return monthData;
}

/**
 * Format Plan & Result với line breaks
 */
function _formatPlanResult(text) {
  if (!text) return 'N/A';
  
  const str = text.toString().trim();
  if (str === '') return 'N/A';
  
  // Preserve line breaks
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim())
    .join('\n');
}

// ✅ NEW HELPER FUNCTION: Format Plan & Result với line breaks
function _formatPlanResult(text) {
  if (!text) return 'N/A';
  
  const str = text.toString().trim();
  if (str === '') return 'N/A';
  
  // Preserve line breaks và formatting
  return str
    .replace(/\r\n/g, '\n') // Normalize line breaks
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim()) // Remove empty lines
    .join('\n');
}
/**
 * âœ… UPDATED: Calculate Monthly Statistics based on Type column (Column E)
 * Thêm: Event, Training, Research, Reporting, Project counts với detail
 */
function _calculateMonthlyStatistics(monthData) {
  const stats = {
    totalTasks: monthData.length,
    completedTasks: 0,
    eventCount: 0,
    trainingCount: 0,
    researchCount: 0,
    reportingCount: 0,
    projectCount: 0,
    projectDetails: [] // âœ… Thêm mảng chứa chi tiết projects
  };
  
  monthData.forEach(task => {
    // Count completed tasks
    if (task.status && task.status.toString().toLowerCase().includes('completed')) {
      stats.completedTasks++;
    }
    
    // âœ… Categorize by TYPE column (Column E) - QUAN TRỌNG!
    const type = (task.type || '').toString().trim();
    
    if (type === 'Marketing-Event') {
      stats.eventCount++;
    } else if (type === 'Product-Training & Presentation') {
      stats.trainingCount++;
    } else if (type === 'Product-Market Research') {
      stats.researchCount++;
    } else if (type === 'Management-Reporting') {
      stats.reportingCount++;
    } else if (type === 'Marketing-Project') {
      stats.projectCount++;
      // âœ… Thêm chi tiết project (Key Task từ Column F)
      stats.projectDetails.push({
        keyTask: task.keyTask || 'Unnamed Project',
        status: task.status || 'N/A'
      });
    }
  });
  
  return stats;
}
function generateMonthlyReport(selectedMonth, sendToDirector, additionalEmails) {
  const currentUser = _getCurrentUserEmail();
  const monthData = getMonthlyTaskData(selectedMonth);
  
  if (monthData.length === 0) {
    throw new Error('No data found for selected month');
  }
  
  const year = selectedMonth.substring(0, 4);
  const monthNum = selectedMonth.substring(4, 6);
  const monthName = new Date(year, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
  
  // Generate PDF
  const fileName = `Marketing Monthly Report ${monthNum}${year}`;
  const pdfBlob = _generateMonthlyReportPDF(monthData, monthName, year, fileName);
  
  // Prepare email
  const subject = `[MONTHLY REPORT] Marketing Tasks - ${monthName} ${year}`;
  const emailBody = _buildMonthlyReportEmailHTML(monthData, monthName, year);
  
  // Determine recipients
  const toEmails = [currentUser];
  const ccEmails = [];
  
  if (sendToDirector) {
    // Add director emails from any row
    const allRows = _fetchAllRows();
    const directorEmails = _dedupeEmails(allRows.map(r => r.directorEmail).filter(Boolean));
    ccEmails.push(...directorEmails);
  }
  
  if (additionalEmails && additionalEmails.trim()) {
    ccEmails.push(...additionalEmails.split(',').map(e => e.trim()).filter(Boolean));
  }
  
  // Send email
  mmhMail_({
    to: toEmails.join(','),
    cc: ccEmails.join(','),
    subject: subject,
    htmlBody: emailBody,
    attachments: [pdfBlob]
  });
  
  return `Monthly report sent successfully!\nTO: ${toEmails.join(', ')}\n${ccEmails.length > 0 ? `CC: ${ccEmails.join(', ')}` : ''}\nPDF: ${fileName}.pdf`;
}

/**
 * ✅ TẠO PDF CHO MONTHLY REPORT
 * - Có 8 cột: #, Row, Type, Key Task, PIC, Deadline, Status, Plan & Result
 * - KHÔNG có cột Subtask
 * - Plan & Result giữ nguyên line breaks
 * - Luôn tạo PDF, không tạo TXT
 */
/**
 * 📄 GENERATE PDF REPORT - VERSION 2.0
 * ✅ Nội dung giống email HTML
 * ✅ Font Calibri 11pt, heading 14pt bold
 * ✅ Statistics + Detailed tables
 * ✅ Filename: "Marketing Monthly Report MMYYYY"
 * 
 * @param {Array} tasks - Filtered tasks array
 * @param {string} filterMonth - YYYYMM format
 * @returns {Blob} PDF file blob
 */
/**
 * ============================================================
 * FUNCTION: _generateMonthlyReportPDF - FINAL VERSION
 * ============================================================
 * Cải tiến:
 * 1. Thêm "View Detail" link ở cuối PDF
 * 2. Bỏ cột "Type Task" ở các sections chính (chỉ giữ ở Other Activities)
 * 3. Column widths: Row (10%), Key Task (30%), Result (60%)
 * 4. Statistics: Bỏ KOL Partnership, thêm Project
 * 5. Thứ tự cards: Events → Project → Design → Training → Research
 */

function _generateMonthlyReportPDF(tasks, filterMonth) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('WEEK'); // Lấy WEEK sheet
    
    // ✅ GET SHEET URL
    const sheetUrl = ss.getUrl();
    
    // Format month display
    const monthDisplay = filterMonth ? _formatMonthDisplay(filterMonth) : 'All_Months';
    
    // Build filename
    let fileName;
    if (filterMonth && filterMonth.length === 6) {
      const mm = filterMonth.substring(4, 6);
      const yyyy = filterMonth.substring(0, 4);
      fileName = `Marketing Monthly Report ${mm}${yyyy}`;
    } else {
      fileName = `Marketing Monthly Report ${monthDisplay}`;
    }
    
    console.log(`Generating PDF: ${fileName}`);
    
    // ========== CALCULATE STATISTICS ==========
    const stats = {
      marketingEvents: 0,
      marketResearch: 0,
      training: 0,
      projects: 0,              // ✅ NEW: Projects thay vì KOL Partnership
      designPublications: 0,
      totalTasks: 0,
      completionRate: 0
    };
    
    // Total tasks
    stats.totalTasks = tasks.length;
    
    // Completion rate
    const completedCount = tasks.filter(t => {
      const status = (t.status || '').toString().trim();
      return status === 'Completed';
    }).length;
    
    stats.completionRate = stats.totalTasks > 0 
      ? Math.round((completedCount / stats.totalTasks) * 100) 
      : 0;
    
    // Marketing-Event (unique Key Tasks)
    const eventKeyTasks = new Set();
    tasks.filter(t => t.typeTask === 'Marketing-Event')
      .forEach(t => {
        if (t.keyTask && t.keyTask.trim() !== '') {
          eventKeyTasks.add(t.keyTask.trim());
        }
      });
    stats.marketingEvents = eventKeyTasks.size;
    
    // ✅ NEW: Marketing-Project (unique Key Tasks)
    const projectKeyTasks = new Set();
    tasks.filter(t => t.typeTask === 'Marketing-Project')
      .forEach(t => {
        if (t.keyTask && t.keyTask.trim() !== '') {
          projectKeyTasks.add(t.keyTask.trim());
        }
      });
    stats.projects = projectKeyTasks.size;
    
    // Marketing-Design (count rows)
    stats.designPublications = tasks.filter(t => t.typeTask === 'Marketing-Design').length;
    
    // Product-Training & Presentation (count rows)
    stats.training = tasks.filter(t => t.typeTask === 'Product-Training & Presentation').length;
    
    // Product-Market Research (count rows)
    stats.marketResearch = tasks.filter(t => t.typeTask === 'Product-Market Research').length;
    
    // ========== HELPER - FORMAT RESULT WITH LINE BREAKS ==========
    function formatResultWithLineBreaks(resultText) {
      if (!resultText || resultText.trim() === '') {
        return '<em style="color: #999;">No data</em>';
      }
      
      const formattedText = String(resultText)
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '<br>');
      
      return formattedText;
    }
    
    // ========== BUILD HTML FOR PDF ==========
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 9pt;
            color: black;
            line-height: 1.4;
            margin: 15px;
          }
          
          h1 {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          h2 {
            font-size: 11pt;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 10px;
          }
          
          h3 {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 12px;
            margin-bottom: 6px;
          }
          
          hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 10px 0;
          }
          
          /* SUMMARY STATS */
          .summary-container {
            display: table;
            width: 100%;
            margin-bottom: 15px;
          }
          
          .summary-box {
            display: inline-block;
            padding: 10px 20px;
            margin-right: 15px;
            border-radius: 4px;
            border-left: 4px solid;
            vertical-align: top;
          }
          
          .summary-box-total {
            background-color: #f0f4f8;
            border-left-color: #2c5aa0;
          }
          
          .summary-box-completion-high {
            background-color: #e8f5e9;
            border-left-color: #4caf50;
          }
          
          .summary-box-completion-medium {
            background-color: #fff8e1;
            border-left-color: #ffc107;
          }
          
          .summary-box-completion-low {
            background-color: #ffebee;
            border-left-color: #f44336;
          }
          
          .summary-label {
            font-size: 9pt;
            color: #666;
            display: inline;
          }
          
          .summary-number {
            font-size: 16pt;
            font-weight: bold;
            display: inline;
            margin-left: 8px;
          }
          
          .summary-number-total {
            color: #2c5aa0;
          }
          
          .summary-number-high {
            color: #2e7d32;
          }
          
          .summary-number-medium {
            color: #f57c00;
          }
          
          .summary-number-low {
            color: #c62828;
          }
          
          /* CARD BOXES */
          .card-container {
            display: table;
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px;
            margin-bottom: 15px;
          }
          
          .card-row {
            display: table-row;
          }
          
          .card-box {
            display: table-cell;
            width: 20%;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px 12px;
            text-align: center;
            background-color: #f9f9f9;
            vertical-align: middle;
          }
          
          .card-number {
            font-size: 24pt;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 6px;
          }
          
          .card-label {
            font-size: 8pt;
            color: #333;
            line-height: 1.3;
          }
          
          /* TABLES - Main sections (NO Type Task column) */
          table.main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          
          table.main-table th,
          table.main-table td {
            border: 1px solid #ddd;
            padding: 5px 6px;
            font-size: 8pt;
            line-height: 1.5;
          }
          
          table.main-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 8pt;
          }
          
          /* ✅ COLUMN WIDTHS - Main sections (3 columns: Row, Key Task, Result) */
          table.main-table th:nth-child(1),
          table.main-table td:nth-child(1) {
            width: 10%;
            text-align: center;
          }
          
          table.main-table th:nth-child(2),
          table.main-table td:nth-child(2) {
            width: 30%;
          }
          
          table.main-table th:nth-child(3),
          table.main-table td:nth-child(3) {
            width: 60%;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          /* TABLES - Other Activities (WITH Type Task column) */
          table.other-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          
          table.other-table th,
          table.other-table td {
            border: 1px solid #ddd;
            padding: 5px 6px;
            font-size: 8pt;
            line-height: 1.5;
          }
          
          table.other-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 8pt;
          }
          
          /* ✅ COLUMN WIDTHS - Other Activities (4 columns) */
          table.other-table th:nth-child(1),
          table.other-table td:nth-child(1) {
            width: 40px;
            text-align: center;
          }
          
          table.other-table th:nth-child(2),
          table.other-table td:nth-child(2) {
            width: 130px;
          }
          
          table.other-table th:nth-child(3),
          table.other-table td:nth-child(3) {
            width: 150px;
          }
          
          table.other-table th:nth-child(4),
          table.other-table td:nth-child(4) {
            width: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          /* VIEW DETAIL LINK */
          .view-detail {
            margin-top: 20px;
            padding: 12px;
            background-color: #f0f4f8;
            border-left: 4px solid #2c5aa0;
            border-radius: 4px;
          }
          
          .view-detail-title {
            font-size: 9pt;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 5px;
          }
          
          .view-detail-link {
            font-size: 8pt;
            color: #0066cc;
            word-wrap: break-word;
          }
          
          .footer {
            font-size: 8pt;
            color: #666;
            text-align: center;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <h1>Monthly Marketing Report</h1>
        <p style="margin-top: 0; font-size: 9pt;">Period: ${monthDisplay}</p>
        
        <hr>
        
        <!-- Statistics Overview -->
        <h2>Statistics Overview</h2>
        
        <!-- Summary Stats -->
        <div class="summary-container">
          <div class="summary-box summary-box-total">
            <span class="summary-label">Total Tasks:</span>
            <span class="summary-number summary-number-total">${stats.totalTasks}</span>
          </div>
          
          <div class="summary-box ${stats.completionRate >= 80 ? 'summary-box-completion-high' : stats.completionRate >= 50 ? 'summary-box-completion-medium' : 'summary-box-completion-low'}">
            <span class="summary-label">Completion Rate:</span>
            <span class="summary-number ${stats.completionRate >= 80 ? 'summary-number-high' : stats.completionRate >= 50 ? 'summary-number-medium' : 'summary-number-low'}">${stats.completionRate}%</span>
          </div>
        </div>
        
        <!-- ✅ Card Boxes - Thứ tự: Events → Project → Design → Training → Research -->
        <div class="card-container">
          <div class="card-row">
            <div class="card-box">
              <div class="card-number">${stats.marketingEvents}</div>
              <div class="card-label">Marketing Events</div>
            </div>
            
            <div class="card-box">
              <div class="card-number">${stats.projects}</div>
              <div class="card-label">Projects</div>
            </div>
            
            <div class="card-box">
              <div class="card-number">${stats.designPublications}</div>
              <div class="card-label">Design Publications</div>
            </div>
            
            <div class="card-box">
              <div class="card-number">${stats.training}</div>
              <div class="card-label">Training Activities</div>
            </div>
            
            <div class="card-box">
              <div class="card-number">${stats.marketResearch}</div>
              <div class="card-label">Market Research Studies</div>
            </div>
          </div>
        </div>
        
        <hr>
        
        <!-- Detailed Activities -->
        <h2>Detailed Activities</h2>
        
        ${_buildPDFMainSection('4.1. Marketing Events', 
          tasks.filter(t => t.typeTask === 'Marketing-Event'), formatResultWithLineBreaks)}
        
        ${_buildPDFMainSection('4.2. Digital Marketing', 
          tasks.filter(t => t.typeTask === 'Marketing-Digital Marketing'), formatResultWithLineBreaks)}
        
        ${_buildPDFMainSection('4.3. Marketing Design', 
          tasks.filter(t => t.typeTask === 'Marketing-Design'), formatResultWithLineBreaks)}
        
        ${_buildPDFMainSection('4.4. KOL Partnership Projects', 
          tasks.filter(t => t.typeTask === 'Marketing-KOL Partnership'), formatResultWithLineBreaks)}
        
        ${_buildPDFMainSection('4.5. Marketing Projects', 
          tasks.filter(t => t.typeTask === 'Marketing-Project'), formatResultWithLineBreaks)}
        
        ${_buildPDFMainSection('4.6. Training Activities', 
          tasks.filter(t => t.typeTask === 'Product-Training & Presentation'), formatResultWithLineBreaks)}
        
        ${_buildPDFMainSection('4.7. Market Research Studies', 
          tasks.filter(t => t.typeTask === 'Product-Market Research'), formatResultWithLineBreaks)}
        
        ${_buildPDFOtherSection('4.8. Other Activities', 
          tasks.filter(t => 
            t.typeTask !== 'Marketing-Event' &&
            t.typeTask !== 'Marketing-Digital Marketing' &&
            t.typeTask !== 'Marketing-Design' &&
            t.typeTask !== 'Marketing-KOL Partnership' &&
            t.typeTask !== 'Marketing-Project' &&
            t.typeTask !== 'Product-Training & Presentation' &&
            t.typeTask !== 'Product-Market Research'
          ), formatResultWithLineBreaks)}
        
        <!-- ✅ VIEW DETAIL -->
        <div class="view-detail">
          <div class="view-detail-title">📊 View Detail in Sheet</div>
          <div class="view-detail-link">${sheetUrl}</div>
        </div>
        
        <!-- Footer -->
        <hr>
        <p class="footer">
          Marketing Task Management System | Generated on ${new Date().toLocaleDateString('en-GB')}
        </p>
      </body>
      </html>
    `;
    
    // Convert HTML to PDF
    const blob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html');
    const pdf = blob.getAs('application/pdf').setName(fileName + '.pdf');
    
    return pdf;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

/**
 * ============================================================
 * HELPER: _buildPDFMainSection
 * ============================================================
 * Cho các sections chính (NO Type Task column)
 * Columns: Row (10%), Key Task (30%), Result (60%)
 */
function _buildPDFMainSection(title, categoryTasks, formatResultFunc) {
  if (categoryTasks.length === 0) {
    return `
      <h3>${title}</h3>
      <p style="font-style: italic; color: #666; font-size: 8pt;">No data available</p>
    `;
  }
  
  const tableRows = categoryTasks.map(task => {
    const formattedResult = formatResultFunc(task.planReport);
    
    return `
    <tr>
      <td>${task.rowNumber}</td>
      <td>${task.keyTask || ''}</td>
      <td>${formattedResult}</td>
    </tr>
  `;
  }).join('');
  
  return `
    <h3>${title}</h3>
    <table class="main-table">
      <thead>
        <tr>
          <th>Row</th>
          <th>Key Task</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * ============================================================
 * HELPER: _buildPDFOtherSection
 * ============================================================
 * Cho Other Activities (WITH Type Task column)
 * Columns: Row, Type Task, Key Task, Result
 */
function _buildPDFOtherSection(title, categoryTasks, formatResultFunc) {
  if (categoryTasks.length === 0) {
    return `
      <h3>${title}</h3>
      <p style="font-style: italic; color: #666; font-size: 8pt;">No data available</p>
    `;
  }
  
  const tableRows = categoryTasks.map(task => {
    const formattedResult = formatResultFunc(task.planReport);
    
    return `
    <tr>
      <td>${task.rowNumber}</td>
      <td>${task.typeTask || ''}</td>
      <td>${task.keyTask || ''}</td>
      <td>${formattedResult}</td>
    </tr>
  `;
  }).join('');
  
  return `
    <h3>${title}</h3>
    <table class="other-table">
      <thead>
        <tr>
          <th>Row</th>
          <th>Type Task</th>
          <th>Key Task</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * ============================================================
 * SUMMARY OF CHANGES
 * ============================================================
 * 
 * 1. VIEW DETAIL LINK:
 *    - Added at bottom of PDF
 *    - Shows sheet URL
 *    - Similar to Weekly Report
 * 
 * 2. REMOVED TYPE TASK COLUMN:
 *    - Marketing Events
 *    - Digital Marketing
 *    - Marketing Design
 *    - KOL Partnership
 *    - Marketing Projects
 *    - Training Activities
 *    - Market Research
 *    (Only kept in Other Activities)
 * 
 * 3. COLUMN WIDTHS (Main sections):
 *    - Row: 10%
 *    - Key Task: 30%
 *    - Result: 60%
 * 
 * 4. STATISTICS CHANGED:
 *    - Removed: KOL Partnership
 *    - Added: Projects (unique Key Tasks from Marketing-Project)
 * 
 * 5. CARD BOX ORDER:
 *    Marketing Events → Projects → Design → Training → Research
 */
function _buildPDFCategorySectionV2(title, categoryTasks, formatResultFunc) {
  if (categoryTasks.length === 0) {
    return `
      <h3>${title}</h3>
      <p style="font-style: italic; color: #666; font-size: 8pt;">No data available</p>
    `;
  }
  
  const tableRows = categoryTasks.map(task => {
    const formattedResult = formatResultFunc(task.planReport);
    
    return `
    <tr>
      <td>${task.rowNumber}</td>
      <td>${task.typeTask || ''}</td>
      <td>${task.keyTask || ''}</td>
      <td>${formattedResult}</td>
    </tr>
  `;
  }).join('');
  
  return `
    <h3>${title}</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Row</th>
          <th>Type Task</th>
          <th>Key Task</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * 🔧 HELPER FUNCTION - BUILD PDF CATEGORY SECTION
 * @param {string} title - Section title
 * @param {Array} categoryTasks - Tasks for this category
 * @returns {string} HTML string
 */

// ✅ NEW: Fallback text generation
function _generateMonthlyTextFallback(monthData, monthName, year) {
  const stats = _calculateMonthlyStatistics(monthData);
  
  let content = `MARKETING MONTHLY REPORT\n${monthName} ${year}\n\n`;
  content += `Total Tasks: ${stats.totalTasks}\n`;
  content += `Completed: ${stats.completedTasks}\n\n`;
  content += `TASK BREAKDOWN:\n`;
  content += `- Event: ${stats.eventCount} activities\n`;
  content += `- Training: ${stats.trainingCount} sessions\n`;
  content += `- Research: ${stats.researchCount} reports\n`;
  content += `- Meeting: ${stats.meetingCount} sessions\n`;
  content += `- Project: ${stats.projects.length} projects\n\n`;
  content += `DETAILED TASKS:\n`;
  
  monthData.forEach((t, i) => {
    content += `${i+1}. [Row ${t.rowNumber}] ${t.keyTask} - ${t.subTask} (${t.pic}) - ${t.status}\n`;
    if (t.planResult && t.planResult !== 'N/A') {
      content += `   Result: ${t.planResult}\n`;
    }
  });
  
  return content;
}
/**
 * Generate PIC Progress PDF Report
 * ✅ ALWAYS generates PDF (no txt fallback)
 * ✅ Proper filename matching email subject
 * ✅ Complete data mapping with all required columns
 */
function _generatePICProgressPDF(picName, thisWeekRows, nextWeekRows, weekLabel, planLabel) {
  try {
    console.log('=== Generating PIC Progress PDF ===');
    console.log('This week rows:', thisWeekRows.length);
    console.log('Next week rows:', nextWeekRows.length);
    
    // ✅ FIX 1.1: Generate filename matching email subject
    // ✅ FIX 1.1.1: Đổi format tên file PDF theo yêu cầu
// Format: Progress_PIC_Week_dd/mm/yy to dd/mm/yy
const fileName = `Progress_${picName}_Week_${weekLabel}`;
    
    // Create new Google Doc
    const doc = DocumentApp.create(`TEMP_PDF_${fileName}_${Date.now()}`);
    const body = doc.getBody();
    
    // Clear and setup margins
    body.clear();
    body.setMarginTop(20).setMarginBottom(20).setMarginLeft(20).setMarginRight(20);
    
    // === HEADER with proper background ===
    const headerTable = body.appendTable();
    headerTable.setBorderWidth(0);
    
    const headerRow = headerTable.appendTableRow();
    const headerCell = headerRow.appendTableCell();
    
    // ✅ FIX 1.2: Header with DARK background (like footer)
    headerCell.setBackgroundColor('#2c5aa0'); // Dark blue background
    headerCell.setPaddingTop(15).setPaddingBottom(15).setPaddingLeft(15).setPaddingRight(15);
    
    const titlePara = headerCell.appendParagraph('📊 PIC PROGRESS TRACKING REPORT');
    titlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
             .setFontSize(18).setBold(true)
             .setForegroundColor('#ffffff'); // ✅ White text on dark background
    
    const subtitlePara = headerCell.appendParagraph(picName);
    subtitlePara.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
                .setFontSize(14).setBold(true)
                .setForegroundColor('#ffffff'); // ✅ White text
    
    body.appendParagraph(''); // Spacing
    
    // === INFO TABLE ===
    const infoTable = body.appendTable();
    infoTable.setBorderWidth(1).setBorderColor('#2c5aa0');
    
    const addInfoRow = (label, value) => {
      const row = infoTable.appendTableRow();
      const labelCell = row.appendTableCell(label);
      const valueCell = row.appendTableCell(value);
      
      labelCell.setBackgroundColor('#f0f4f8').setBold(true);
      labelCell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(10).setPaddingRight(10);
      
      valueCell.setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(10).setPaddingRight(10);
    };
    
    addInfoRow('📅 Report Period:', weekLabel);
    addInfoRow('🎯 Next Week Plan:', planLabel);
    addInfoRow('👤 PIC Name:', picName);
    addInfoRow('📆 Generated:', _formatDate(new Date(), 'dd/MM/yyyy HH:mm'));
    
    body.appendParagraph(''); // Spacing
    
    // === THIS WEEK SUMMARY ===
    const totalThisWeek = thisWeekRows.length;
    const completedCount = thisWeekRows.filter(r => 
      (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED
    ).length;
    const onTimeCount = thisWeekRows.filter(r => 
      (r.behavior || '').toString().trim().toLowerCase() === 'on time'
    ).length;
    const onTimeRate = totalThisWeek > 0 ? Math.round((onTimeCount / totalThisWeek) * 100) : 0;
    const priorityCount = thisWeekRows.filter(r => r.priority).length;
    
    const summaryTitle = body.appendParagraph('📈 THIS WEEK SUMMARY');
    summaryTitle.setFontSize(14).setBold(true).setForegroundColor('#2c5aa0');
    
    const summaryTable = body.appendTable();
    summaryTable.setBorderWidth(1).setBorderColor('#dee2e6');
    
    const summaryRow = summaryTable.appendTableRow();
    
    const addSummaryCell = (label, value, color) => {
      const cell = summaryRow.appendTableCell();
      cell.setBackgroundColor('#f8f9fa');
      cell.setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(10).setPaddingRight(10);
      
      const labelPara = cell.appendParagraph(label);
      labelPara.setFontSize(10).setForegroundColor('#6c757d');
      
      const valuePara = cell.appendParagraph(value);
      valuePara.setFontSize(16).setBold(true).setForegroundColor(color);
    };
    
    addSummaryCell('Total Tasks', String(totalThisWeek), '#2c5aa0');
    addSummaryCell('Completed', String(completedCount), '#28a745');
    addSummaryCell('On-time Rate', `${onTimeRate}%`, '#17a2b8');
    addSummaryCell('Priority Tasks', String(priorityCount), '#ffc107');
    
    body.appendParagraph(''); // Spacing
    
    // === THIS WEEK TASKS TABLE ===
    if (thisWeekRows.length > 0) {
      const thisWeekTitle = body.appendParagraph(`📋 TASKS THIS WEEK (${weekLabel})`);
      thisWeekTitle.setFontSize(13).setBold(true).setForegroundColor('#2c5aa0');
      
      const taskTable = body.appendTable();
      taskTable.setBorderWidth(1).setBorderColor('#dee2e6');
      
      // Header row
      const headerRow = taskTable.appendTableRow();
      // ✅ FIX 1.2: Đúng columns theo yêu cầu - Row, Key Task (F), Sub Task (G), Deadline (M), Status (O), Manager Comment (R)
const headers = ['Row', 'Key Task', 'Sub Task', 'Deadline', 'Status', 'Manager Comment'];
      
      headers.forEach(h => {
        const cell = headerRow.appendTableCell(h);
        cell.setBackgroundColor('#2c5aa0');
        cell.setForegroundColor('#ffffff');
        cell.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(4).setPaddingRight(4);
        cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(9).setBold(true);
      });
      
      // ✅ FIX 1.3: Data rows with CORRECT column mapping
      thisWeekRows.forEach(task => {
        const dataRow = taskTable.appendTableRow();
        
        // Determine row background color
        let bgColor = '#ffffff';
        if (task.priority) bgColor = '#fff8e1'; // Yellow for priority
        else if ((task.status || '').toString().trim() === CONFIG.STATUS.COMPLETED) bgColor = '#e8f5e8'; // Green for completed
        else if ((task.behavior || '').toString().trim().toLowerCase() === 'delayed') bgColor = '#ffebee'; // Red for delayed
        
        const cellData = [
          String(task.row),
          task.priority ? '⭐' : '',
          _fmtDateCell(task.start),          // ✅ Column K - Start Date
          task.key || 'N/A',                 // ✅ Column F - Key Task
          task.sub || 'N/A',                 // ✅ Column G - Sub Task
          (task.result || 'N/A').toString().substring(0, 100), // ✅ Column H - Task Result
          _fmtDateCell(task.deadline),       // ✅ Column M - Deadline
          task.status || 'N/A',              // ✅ Column O - Status
          task.behavior || 'N/A'             // ✅ Column Q - Behavior
        ];
        
        cellData.forEach((data, index) => {
          const cell = dataRow.appendTableCell(data);
          cell.setBackgroundColor(bgColor);
          cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(3).setPaddingRight(3);
          const para = cell.getChild(0).asParagraph();
          para.setFontSize(8);
          if (index === 0 || index === 1) {
            para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          }
        });
      });
      
      body.appendParagraph(''); // Spacing
    }
    
    // === NEXT WEEK PLANS TABLE ===
    if (nextWeekRows.length > 0) {
      const nextWeekTitle = body.appendParagraph(`🎯 NEXT WEEK PLANS (${planLabel})`);
      nextWeekTitle.setFontSize(13).setBold(true).setForegroundColor('#2c5aa0');
      
      const planTable = body.appendTable();
      planTable.setBorderWidth(1).setBorderColor('#dee2e6');
      
      // Header row
      const planHeaderRow = planTable.appendTableRow();
      const planHeaders = ['Row', 'Priority', 'Start Date', 'Key Task', 'Sub Task', 'Deadline', 'Status'];
      
      planHeaders.forEach(h => {
        const cell = planHeaderRow.appendTableCell(h);
        cell.setBackgroundColor('#2c5aa0');
        cell.setForegroundColor('#ffffff');
        cell.setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(4).setPaddingRight(4);
        cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(9).setBold(true);
      });
      
      // Data rows
      nextWeekRows.forEach(task => {
        const dataRow = planTable.appendTableRow();
        
        let bgColor = task.priority ? '#fff8e1' : '#ffffff';
        
        const cellData = [
          String(task.row),
          task.priority ? '⭐' : '',
          _fmtDateCell(task.start),          // ✅ Column K
          task.key || 'N/A',                 // ✅ Column F
          task.sub || 'N/A',                 // ✅ Column G
          _fmtDateCell(task.deadline),       // ✅ Column M
          task.status || 'Planned'           // ✅ Column O
        ];
        
        cellData.forEach((data, index) => {
          const cell = dataRow.appendTableCell(data);
          cell.setBackgroundColor(bgColor);
          cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(3).setPaddingRight(3);
          const para = cell.getChild(0).asParagraph();
          para.setFontSize(8);
          if (index === 0 || index === 1) {
            para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          }
        });
      });
    }
    
    // === FOOTER with dark background ===
    body.appendParagraph(''); // Spacing
    
    const footerTable = body.appendTable();
    footerTable.setBorderWidth(0);
    
    const footerRow = footerTable.appendTableRow();
    const footerCell = footerRow.appendTableCell();
    
    // ✅ Dark background for footer (consistent with header)
    footerCell.setBackgroundColor('#6c757d');
    footerCell.setPaddingTop(12).setPaddingBottom(12);
    
    const footer1 = footerCell.appendParagraph('(Auto-generated by Apps Script)');
    footer1.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
           .setFontSize(10).setItalic(true)
           .setForegroundColor('#ffffff');
    
    const footer2 = footerCell.appendParagraph('Marketing Task Management System');
    footer2.setAlignment(DocumentApp.HorizontalAlignment.CENTER)
           .setFontSize(10).setItalic(true)
           .setForegroundColor('#ffffff');
    
    // Save and convert to PDF
    doc.saveAndClose();
    Utilities.sleep(2000);
    
    const docId = doc.getId();
    const pdfBlob = DriveApp.getFileById(docId).getAs('application/pdf');
    
    // ✅ FIX 1.1: Set PDF name to match email subject format
    pdfBlob.setName(fileName + '.pdf');
    
    // Cleanup temporary doc
    DriveApp.getFileById(docId).setTrashed(true);
    
    console.log('✅ PIC Progress PDF generated successfully:', fileName + '.pdf');
    return pdfBlob;
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in PDF generation:', error);
    console.error('Error stack:', error.stack);
    
    // ⚠️ IMPORTANT: Re-throw error instead of fallback to text
    // This ensures we can debug the real issue
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}
/**
 * Build detailed HTML email cho PIC Progress Tracking
 * ✅ ĐÚNG COLUMNS: F (key), G (sub), H (result), K (start), M (deadline), O (status), Q (behavior), S (priority)
 */
/**
 * Build detailed HTML email cho PIC Progress Tracking
 * ✅ FIXED: Header with dark background (white text visible)
 * ✅ ĐÚNG COLUMNS: F (key), G (sub), H (result), K (start), M (deadline), O (status), Q (behavior), S (priority)
 */
/**
 * ✅ BUILD HTML EMAIL CHO PIC PROGRESS REPORT
 * - Header màu xanh đậm với chữ trắng rõ ràng
 * - Hiển thị đầy đủ thống kê
 * - Table với data chính xác, không bị "No data" sai
 */
function _buildDetailedPICProgressEmailHTML(picName, thisWeekRows, nextWeekRows, weekLabel, planLabel) {
  console.log('Building detailed PIC progress email HTML...');
  console.log('This week rows:', thisWeekRows.length);
  console.log('Next week rows:', nextWeekRows.length);
  
  // ========== TÍNH TOÁN THỐNG KÊ ==========
  const totalThisWeek = thisWeekRows.length;
  const completedCount = thisWeekRows.filter(r => 
    (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED
  ).length;
  const onTimeCount = thisWeekRows.filter(r => 
    (r.behavior || '').toString().trim().toLowerCase() === 'on time'
  ).length;
  const onTimeRate = totalThisWeek > 0 ? 
    Math.round((onTimeCount / totalThisWeek) * 100) : 0;
  const priorityThisWeek = thisWeekRows.filter(r => r.priority).length;
  const priorityCompleted = thisWeekRows.filter(r => 
    r.priority && (r.status || '').toString().trim() === CONFIG.STATUS.COMPLETED
  ).length;
  
  const totalNextWeek = nextWeekRows.length;
  const priorityNextWeek = nextWeekRows.filter(r => r.priority).length;
  
  const fileLink = _getFileLink();
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
          font-family: Arial, sans-serif; 
          font-size: 14px; 
          line-height: 1.6; 
          color: #2c3e50; 
          margin: 0; 
          padding: 20px; 
          background-color: #f5f5f5;
        }
        
        .container { 
          max-width: 900px; 
          margin: 0 auto; 
          background: #ffffff; 
          border: 2px solid #2c5aa0; 
          border-radius: 8px; 
          overflow: hidden; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        /* ✅ HEADER - Background xanh đậm, chữ trắng */
        .header { 
          background: linear-gradient(135deg, #2c5aa0, #1e3d72);
          color: #ffffff;
          padding: 30px 20px; 
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 {
          color: #ffffff !important;
          margin: 0 0 10px 0;
          font-size: 26px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        
        .header .subtitle {
          color: #ffffff !important;
          margin: 0;
          font-size: 15px;
          opacity: 0.95;
        }
        
        .content { 
          padding: 30px 25px; 
        }
        
        .stats-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 15px; 
          margin: 25px 0; 
        }
        
        .stat-box { 
          background: #f8f9fa; 
          padding: 18px; 
          border-radius: 8px; 
          border-left: 4px solid #2c5aa0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        
        .stat-box-title {
          font-size: 16px;
          font-weight: bold;
          color: #2c5aa0;
          margin-bottom: 12px;
        }
        
        .stat-item {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .table-container { 
          overflow-x: auto; 
          margin: 20px 0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .task-table { 
          width: 100%; 
          border-collapse: collapse; 
          min-width: 1200px;
          background: #ffffff;
        }
        
        .task-table th { 
          background: #2c5aa0; 
          color: white; 
          padding: 12px 8px; 
          text-align: center; 
          font-size: 12px;
          font-weight: bold;
          border: 1px solid #1e3d72;
        }
        
        .task-table td { 
          padding: 10px 8px; 
          border: 1px solid #dee2e6; 
          font-size: 12px;
          vertical-align: top;
        }
        
        .priority-task { background: #fff8e1 !important; }
        .completed-task { background: #e8f5e8 !important; }
        .delayed-task { background: #ffebee !important; }
        
        .section-title {
          color: #2c5aa0;
          font-size: 20px;
          font-weight: bold;
          margin: 30px 0 15px 0;
          padding-bottom: 10px;
          border-bottom: 2px solid #2c5aa0;
        }
        
        .legend {
          background: #fff3cd;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #ffc107;
          margin-top: 25px;
        }
        
        .legend-title {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: bold;
          color: #856404;
        }
        
        .legend-items {
          margin: 0;
          font-size: 13px;
          color: #856404;
        }
        
        .legend-item {
          display: inline-block;
          padding: 4px 10px;
          margin-right: 10px;
          border-radius: 4px;
        }
        
        .footer { 
          background: linear-gradient(135deg, #6c757d, #495057);
          color: #ffffff;
          padding: 20px; 
          text-align: center; 
          font-size: 13px;
        }
        
        .footer-text {
          color: #ffffff !important;
          margin: 5px 0;
        }
        
        .btn-primary {
          display: inline-block;
          padding: 14px 30px;
          background: linear-gradient(135deg, #2c5aa0, #1e3d72);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 4px 8px rgba(44,90,160,0.3);
          transition: all 0.3s ease;
        }
        
        .btn-primary:hover {
          box-shadow: 0 6px 12px rgba(44,90,160,0.4);
          transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        
        <!-- ✅ HEADER - Background xanh, chữ trắng rõ ràng -->
        <div class="header">
            <h1 style="color: #ffffff !important;">📊 Progress Report for ${picName}</h1>
            <p class="subtitle" style="color: #ffffff !important;">
                <strong>Report Period:</strong> ${weekLabel} &nbsp;|&nbsp; <strong>Plan Period:</strong> ${planLabel}
            </p>
        </div>
        
        <!-- ✅ CONTENT -->
        <div class="content">
            
            <!-- Statistics Section -->
            <div style="background: linear-gradient(135deg, #e8f4fd, #d4e9f7); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 20px 0; color: #2c5aa0; text-align: center; font-size: 20px;">
                    📈 Weekly Performance Overview
                </h3>
                
                <div class="stats-grid">
                    <!-- This Week Stats -->
                    <div class="stat-box">
                        <div class="stat-box-title">📊 This Week (${weekLabel})</div>
                        <div class="stat-item">Total tasks: <strong style="color: #2c5aa0;">${totalThisWeek}</strong></div>
                        <div class="stat-item">Completed: <strong style="color: #28a745;">${completedCount}</strong></div>
                        <div class="stat-item">On-time rate: <strong style="color: #17a2b8;">${onTimeRate}%</strong></div>
                        <div class="stat-item">Priority tasks: <strong style="color: #ffc107;">${priorityThisWeek}</strong> 
                          <span style="font-size: 12px;">(Completed: ${priorityCompleted})</span>
                        </div>
                    </div>
                    
                    <!-- Next Week Stats -->
                    <div class="stat-box">
                        <div class="stat-box-title">🎯 Next Week Plans (${planLabel})</div>
                        <div class="stat-item">Total planned: <strong style="color: #2c5aa0;">${totalNextWeek}</strong></div>
                        <div class="stat-item">Priority tasks: <strong style="color: #ffc107;">${priorityNextWeek}</strong></div>
                        <div class="stat-item" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #dee2e6;">
                          <strong style="color: #6c757d;">Focus Areas:</strong><br>
                          <span style="font-size: 12px; color: #6c757d;">
                            ${priorityNextWeek > 0 ? '⭐ High priority items require attention' : '✅ Regular workflow planned'}
                          </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ✅ THIS WEEK TASKS TABLE -->
            ${thisWeekRows.length > 0 ? `
            <h3 class="section-title">📋 Tasks This Week (${weekLabel})</h3>
            <div class="table-container">
                <table class="task-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">Row</th>
                            <th style="width: 60px;">Priority</th>
                            <th style="width: 90px;">Start Date</th>
                            <th style="width: 150px;">Key Task</th>
                            <th style="width: 160px;">Sub Task</th>
                            <th style="width: 220px;">Task Result</th>
                            <th style="width: 90px;">Deadline</th>
                            <th style="width: 90px;">Status</th>
                            <th style="width: 80px;">Behavior</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${thisWeekRows.map(task => {
                          // Xác định row class để styling
                          let rowClass = '';
                          const behaviorLower = (task.behavior || '').toString().trim().toLowerCase();
                          const statusLower = (task.status || '').toString().trim().toLowerCase();
                          
                          if (task.priority) {
                            rowClass = 'priority-task';
                          } else if (statusLower === 'completed') {
                            rowClass = 'completed-task';
                          } else if (behaviorLower === 'delayed') {
                            rowClass = 'delayed-task';
                          }
                          
                          const priorityIcon = task.priority ? '⭐' : '';
                          
                          // ✅ Map data chính xác
                          const keyTask = task.key && String(task.key).trim() 
                            ? _htmlEsc(String(task.key)) 
                            : '<em style="color:#999;">No data available</em>';
                            
                          const subTask = task.sub && String(task.sub).trim() 
                            ? _htmlEsc(String(task.sub)) 
                            : '<em style="color:#999;">No data available</em>';
                          
                          const taskResult = task.result && String(task.result).trim()
                            ? _extractAndPreserveLinks(task.result)
                            : '<em style="color:#999;">No result yet</em>';
                          
                          const status = task.status && String(task.status).trim()
                            ? _htmlEsc(String(task.status))
                            : '<em style="color:#999;">Pending</em>';
                            
                          const behavior = task.behavior && String(task.behavior).trim()
                            ? _htmlEsc(String(task.behavior))
                            : '<em style="color:#999;">-</em>';
                          
                          return `
                            <tr class="${rowClass}">
                                <td style="text-align: center; font-weight: bold;">${task.row}</td>
                                <td style="text-align: center; font-size: 16px;">${priorityIcon}</td>
                                <td style="text-align: center;">${_fmtDateCell(task.start)}</td>
                                <td>${keyTask}</td>
                                <td>${subTask}</td>
                                <td style="word-wrap: break-word; max-width: 220px;">${taskResult}</td>
                                <td style="text-align: center; color: #dc3545; font-weight: bold;">${_fmtDateCell(task.deadline)}</td>
                                <td style="text-align: center;">${status}</td>
                                <td style="text-align: center;">${behavior}</td>
                            </tr>
                          `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ` : '<p style="text-align: center; padding: 30px; color: #6c757d; font-style: italic; background: #f8f9fa; border-radius: 6px;">No tasks scheduled for this week.</p>'}
            
            <!-- ✅ NEXT WEEK PLANS TABLE -->
            ${nextWeekRows.length > 0 ? `
            <h3 class="section-title">🎯 Next Week Plans (${planLabel})</h3>
            <div class="table-container">
                <table class="task-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">Row</th>
                            <th style="width: 60px;">Priority</th>
                            <th style="width: 90px;">Start Date</th>
                            <th style="width: 180px;">Key Task</th>
                            <th style="width: 200px;">Sub Task</th>
                            <th style="width: 90px;">Deadline</th>
                            <th style="width: 100px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nextWeekRows.map(task => {
                          const rowClass = task.priority ? 'priority-task' : '';
                          const priorityIcon = task.priority ? '⭐' : '';
                          
                          const keyTask = task.key && String(task.key).trim() 
                            ? _htmlEsc(String(task.key)) 
                            : '<em style="color:#999;">No data available</em>';
                            
                          const subTask = task.sub && String(task.sub).trim() 
                            ? _htmlEsc(String(task.sub)) 
                            : '<em style="color:#999;">No data available</em>';
                          
                          return `
                            <tr class="${rowClass}">
                                <td style="text-align: center; font-weight: bold;">${task.row}</td>
                                <td style="text-align: center; font-size: 16px;">${priorityIcon}</td>
                                <td style="text-align: center;">${_fmtDateCell(task.start)}</td>
                                <td>${keyTask}</td>
                                <td>${subTask}</td>
                                <td style="text-align: center; color: #dc3545; font-weight: bold;">${_fmtDateCell(task.deadline)}</td>
                                <td style="text-align: center;">${task.status || 'Planned'}</td>
                            </tr>
                          `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ` : '<p style="text-align: center; padding: 30px; color: #6c757d; font-style: italic; background: #f8f9fa; border-radius: 6px;">No plans scheduled for next week.</p>'}
            
            <!-- Legend -->
            <div class="legend">
                <p class="legend-title">📖 Legend</p>
                <p class="legend-items">
                    <span class="legend-item" style="background: #fff8e1;">⭐ Priority Task</span>
                    <span class="legend-item" style="background: #e8f5e8;">✅ Completed</span>
                    <span class="legend-item" style="background: #ffebee;">⏰ Delayed</span>
                </p>
            </div>
            
            <!-- View Sheet Button -->
            ${fileLink ? `
            <div style="text-align: center; margin: 35px 0 25px 0;">
                <a href="${_htmlEsc(fileLink)}" class="btn-primary" style="color: #ffffff !important;">
                    📊 View Complete Details in Sheet
                </a>
            </div>
            ` : ''}
            
        </div>
        
        <!-- ✅ FOOTER - Background tối, chữ trắng -->
        <div class="footer">
            <p class="footer-text" style="color: #ffffff !important;">
                <strong>Marketing Task Management System</strong>
            </p>
            <p class="footer-text" style="color: #ffffff !important; font-size: 12px;">
                Auto-generated on ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}
            </p>
        </div>
        
    </div>
</body>
</html>`;
}

/**
 * Build task table với đúng columns
 * ✅ Headers: Row | Priority (S) | Start (K) | Key (F) | Sub (G) | Result (H) | Deadline (M) | Status (O) | Behavior (Q)
 */
function _buildPICProgressTableHTML(tasks, includeBehavior = true) {
  if (tasks.length === 0) {
    return '<p style="text-align: center; color: #6c757d; font-style: italic;">No tasks available.</p>';
  }
  
  const headers = includeBehavior 
    ? ['Row', 'Priority (S)', 'Start (K)', 'Key Task (F)', 'Sub Task (G)', 'Task Result (H)', 'Deadline (M)', 'Status (O)', 'Behavior (Q)']
    : ['Row', 'Priority (S)', 'Start (K)', 'Key Task (F)', 'Sub Task (G)', 'Task Result (H)', 'Deadline (M)', 'Status (O)'];
  
  const widths = includeBehavior
    ? ['50px', '60px', '90px', '140px', '150px', '200px', '90px', '90px', '80px']
    : ['50px', '60px', '90px', '150px', '170px', '220px', '90px', '100px'];
  
  const headerHTML = headers.map((h, index) => 
    `<th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: ${widths[index]};">${h}</th>`
  ).join('');
  
  const rowsHTML = tasks.map((task, index) => {
    // ✅ HIGHLIGHTING LOGIC
    let rowClass = '';
    const behaviorLower = (task.behavior || '').toString().trim().toLowerCase();
    const statusLower = (task.status || '').toString().trim().toLowerCase();
    
    if (task.priority) {
      rowClass = 'priority-task'; // Yellow
    } else if (statusLower === 'completed') {
      rowClass = 'completed-task'; // Green
    } else if (behaviorLower === 'delayed') {
      rowClass = 'delayed-task'; // Red
    }
    
    const priorityIcon = task.priority ? '⭐' : '';
    
    const baseCells = [
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${task.row}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${priorityIcon}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${_fmtDateCell(task.start)}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px;">${task.key ? _htmlEsc(String(task.key)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px;">${task.sub ? _htmlEsc(String(task.sub)) : '<em style="color:#999;">No data</em>'}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; word-wrap: break-word;">${_extractAndPreserveLinks(task.result)}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; color: #dc3545; font-weight: bold;">${_fmtDateCell(task.deadline)}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${task.status ? _htmlEsc(String(task.status)) : '<em style="color:#999;">-</em>'}</td>`
    ];
    
    if (includeBehavior) {
      baseCells.push(`<td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${task.behavior ? _htmlEsc(String(task.behavior)) : '<em style="color:#999;">-</em>'}</td>`);
    }
    
    return `<tr class="${rowClass}">${baseCells.join('')}</tr>`;
  }).join('');
  
  return `
    <table class="task-table">
      <thead><tr>${headerHTML}</tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>
  `;
}

function _buildPICProgressTableHTML(tasks, includeBehavior = true) {
  if (tasks.length === 0) {
    return '<p style="text-align: center; color: #6c757d; font-style: italic;">Không có công việc nào.</p>';
  }
  
  // ✅ FIX: Headers với Task Result - Optimized widths
  const headers = includeBehavior 
    ? ['Row', 'Priority', 'Start Date', 'Key Task', 'Sub Task', 'Task Result', 'Deadline', 'Status', 'Behavior']
    : ['Row', 'Priority', 'Start Date', 'Key Task', 'Sub Task', 'Task Result', 'Deadline', 'Status'];
  
  // Định nghĩa widths cho từng column
  const widths = includeBehavior
    ? ['50px', '60px', '80px', '130px', '150px', '200px', '90px', '90px', '80px']
    : ['50px', '60px', '80px', '140px', '160px', '220px', '90px', '100px'];
  
  const headerHTML = headers.map((h, index) => 
    `<th style="border: 1px solid #ddd; padding: 8px; text-align: center; width: ${widths[index]};">${h}</th>`
  ).join('');
  
  const rowsHTML = tasks.map((task, index) => {
    // ✅ HIGHLIGHT LOGIC
    let rowClass = '';
    const behaviorLower = (task.behavior || '').toString().trim().toLowerCase();
    const statusLower = (task.status || '').toString().trim().toLowerCase();
    
    if (task.priority) {
      rowClass = 'priority-task'; // Yellow background
    } else if (statusLower === 'completed') {
      rowClass = 'completed-task'; // Green background
    } else if (behaviorLower === 'delayed') {
      rowClass = 'delayed-task'; // Red/pink background
    }
    
    const priorityIcon = task.priority ? '⭐' : '';
    
    const baseCells = [
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; width: ${widths[0]};">${task.row}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; width: ${widths[1]};">${priorityIcon}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; width: ${widths[2]};">${task.startDate}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; width: ${widths[3]};">${task.keyTask}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; width: ${widths[4]};">${task.subTask}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; width: ${widths[5]}; word-wrap: break-word;">${_extractAndPreserveLinks(task.taskResult)}</td>`, // ✅ TASK RESULT
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; color: #dc3545; font-weight: bold; width: ${widths[6]};">${task.deadline}</td>`,
      `<td style="border: 1px solid #ddd; padding: 6px; text-align: center; width: ${widths[7]};">${task.status}</td>`
    ];
    
    if (includeBehavior) {
      baseCells.push(`<td style="border: 1px solid #ddd; padding: 6px; text-align: center; width: ${widths[8]};">${task.behavior}</td>`);
    }
    
    return `<tr class="${rowClass}">${baseCells.join('')}</tr>`;
  }).join('');
  
  return `
    <table class="task-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
      <thead>
        <tr>${headerHTML}</tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
}
function _addPICProgressTableToPDF(body, tasks, includeBehavior = true) {
  const table = body.appendTable();
  table.setBorderWidth(1).setBorderColor('#dee2e6');
  
  // ✅ FIX: Header with Task Result - Optimized
  const headerRow = table.appendTableRow();
  const headers = includeBehavior
    ? ['Row', 'Priority', 'Start', 'Key Task', 'Sub Task', 'Task Result', 'Deadline', 'Status', 'Behavior']
    : ['Row', 'Priority', 'Start', 'Key Task', 'Sub Task', 'Task Result', 'Deadline', 'Status'];
  
  // Column widths optimized for A4 PDF
  const widths = includeBehavior
    ? [35, 45, 60, 100, 120, 180, 70, 70, 60]
    : [40, 50, 70, 120, 140, 200, 80, 80];
  
  headers.forEach((headerText, index) => {
    const cell = headerRow.appendTableCell(headerText);
    cell.setBackgroundColor('#2c5aa0');
    cell.getChild(0).asParagraph()
        .setForegroundColor('#000000')
        .setBold(true)
        .setFontSize(9)
        .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    cell.setPaddingTop(6).setPaddingBottom(6);
    if (widths[index]) cell.setWidth(widths[index]);
  });
  
  // ✅ FIX: Data rows with Task Result and highlighting
  tasks.forEach(task => {
    const row = table.appendTableRow();
    
    // ✅ HIGHLIGHT LOGIC for PDF
    let bgColor = '#ffffff';
    const behaviorLower = (task.behavior || '').toString().trim().toLowerCase();
    const statusLower = (task.status || '').toString().trim().toLowerCase();
    
    if (task.priority) {
      bgColor = '#fff8e1';
    } else if (statusLower === 'completed') {
      bgColor = '#e8f5e8';
    } else if (behaviorLower === 'delayed') {
      bgColor = '#ffebee';
    }
    
    const priorityText = task.priority ? '⭐' : '';
    
    // ✅ FIX: Truncate Task Result if too long for PDF
    let taskResultText = task.taskResult || 'N/A';
    if (taskResultText.length > 120) {
      taskResultText = taskResultText.substring(0, 117) + '...';
    }
    
    const baseData = [
      task.row.toString(),
      priorityText,
      task.startDate,
      task.keyTask,
      task.subTask,
      taskResultText,          // ✅ ADDED Task Result
      task.deadline,
      task.status
    ];
    
    if (includeBehavior) {
      baseData.push(task.behavior);
    }
    
    baseData.forEach((cellData, index) => {
      const cell = row.appendTableCell(cellData);
      cell.setBackgroundColor(bgColor); // ✅ APPLY HIGHLIGHT
      cell.setPaddingTop(5).setPaddingBottom(5);
      cell.getChild(0).asParagraph().setFontSize(8);
      
      // Special formatting
      if (index === 0) { // Row number
        cell.getChild(0).asParagraph()
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .setBold(true)
            .setFontSize(9);
      } else if (index === 1) { // Priority
        cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      } else if (index === 2) { // Start Date
        cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      } else if (index === baseData.length - (includeBehavior ? 2 : 1)) { // Deadline
        cell.getChild(0).asParagraph()
            .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .setForegroundColor('#dc3545')
            .setBold(true);
      } else if (index === baseData.length - 1 || (includeBehavior && index === baseData.length - 2)) { // Status or Behavior
        cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    });
  });
}
/**
 * Build HTML email cho Monthly Report
 * ✅ COLUMNS: E (type), F (key), G (sub), H (pic), I (deadline), J (status), K (plan & result)
 */


/**
 * Format Plan & Result cho HTML với line breaks
 */
function _formatPlanResultForHTML(planResult) {
  if (!planResult || planResult === 'N/A') {
    return '<em style="color: #6c757d;">No result available</em>';
  }
  
  // Convert line breaks to <br>
  let formatted = planResult
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
  
  return formatted;
}function _validateWeeklyReportData(thisWeekRows, nextWeekRows) {
  const result = {
    isValid: true,
    errorMessage: '',
    missingFields: []
  };
  
  // Validation cho công việc tuần này (cột E đến L)
  const thisWeekIncomplete = [];
  thisWeekRows.forEach(row => {
    const missing = [];
    
    if (!row.type || row.type.toString().trim() === '') missing.push('Type (E)');
    if (!row.key || row.key.toString().trim() === '') missing.push('Key Task (F)');
    if (!row.sub || row.sub.toString().trim() === '') missing.push('Sub Task (G)');
    if (!row.result || row.result.toString().trim() === '') missing.push('Task Result (H)');
    if (!row.start) missing.push('Start Date (K)');
    if (!row.finish) missing.push('Finish Date (L)');
    
    if (missing.length > 0) {
      thisWeekIncomplete.push(`Row ${row.row}: ${missing.join(', ')}`);
    }
  });
  
  // Validation cho kế hoạch tuần mới
  const nextWeekIncomplete = [];
  nextWeekRows.forEach(row => {
    const missing = [];
    
    if (!row.key || row.key.toString().trim() === '') missing.push('Key Task (F)');
    if (!row.sub || row.sub.toString().trim() === '') missing.push('Sub Task (G)');
    if (!row.start) missing.push('Start Date (K)');
    if (!row.status || row.status.toString().trim() === '') missing.push('Status (O)');
    
    if (missing.length > 0) {
      nextWeekIncomplete.push(`Row ${row.row}: ${missing.join(', ')}`);
    }
  });
  
  // Build error message nếu có lỗi
  if (thisWeekIncomplete.length > 0 || nextWeekIncomplete.length > 0) {
    result.isValid = false;
    result.errorMessage = 'Please complete missing information:\n\n';
    
    if (thisWeekIncomplete.length > 0) {
      result.errorMessage += '📋 THIS WEEK TASKS (Need complete info E-L):\n';
      result.errorMessage += thisWeekIncomplete.join('\n') + '\n\n';
    }
    
    if (nextWeekIncomplete.length > 0) {
      result.errorMessage += '📅 NEXT WEEK PLANS (Need Key Task, Sub Task, Start Date, Status):\n';
      result.errorMessage += nextWeekIncomplete.join('\n');
    }
  }
  
  return result;
}function _lockWeeklyTasks(tasks) {
  if (!tasks || tasks.length === 0) return;
  
  const sh = _sheet();
  tasks.forEach(task => {
    try {
      sh.getRange(task.row, CONFIG.COL.LOCK).setValue(true);
      console.log(`Locked task at row ${task.row}`);
    } catch (error) {
      console.error(`Error locking row ${task.row}:`, error);
    }
  });
  
  console.log(`Locked ${tasks.length} tasks after sending report`);
}function _formatDateForInput(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}
function _getTypeOptionsFromMaster() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) {
      console.warn('Master sheet not found');
      return [];
    }
    
    // Lấy data từ Master!$D$3:$D$34
    const typeRange = masterSheet.getRange('D3:D34');
    const typeValues = typeRange.getValues()
      .flat()
      .filter(v => v && String(v).trim() !== '');
    
    return typeValues;
  } catch (error) {
    console.error('Error getting Type options:', error);
    return [];
  }
}

/**
 * Lấy danh sách Key Task từ Master sheet
 * @returns {Array<string>} Mảng các Key Task options
 */
/**
 * Lấy danh sách Key Task từ Master sheet
 * @returns {Array<string>} Mảng các Key Task options
 */
function _getKeyTaskOptionsFromMaster() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) {
      console.warn('Master sheet not found');
      return [];
    }
    
    // Lấy data từ Master!$L:$L
    const keyTaskRange = masterSheet.getRange('L:L');
    const keyTaskValues = keyTaskRange.getValues()
      .flat()
      .filter(v => v && String(v).trim() !== '');
    
    // Remove duplicates và sort
    return [...new Set(keyTaskValues)].sort();
  } catch (error) {
    console.error('Error getting Key Task options:', error);
    return [];
  }
}

/**
 * Lấy data công việc của PIC trong tuần hiện tại
 * @param {string} picName - Tên PIC
 * @returns {Array<Object>} Mảng các task objects
 */
function _getPICWeekTasksData(picName) {
  const rows = _fetchAllRows();
  const { monday, saturday } = _weekBounds(new Date());
  
  // Filter tasks của PIC trong tuần này
  const picWeekTasks = rows.filter(r => 
    r.picName === picName && 
    _isWithinWeek(r, monday, saturday)
  );
  
  // Map sang format phù hợp cho dialog
  return picWeekTasks.map(task => ({
    row: task.row,
    type: task.type || '',
    keyTask: task.key || '',
    subTask: task.sub || '',
    taskResult: task.result || '',
    startDate: task.start ? _formatDate(task.start, 'dd/MM/yyyy') : '',
    finishDate: task.finish ? _formatDate(task.finish, 'dd/MM/yyyy') : '',
    deadline: task.deadline ? _formatDate(task.deadline, 'dd/MM/yyyy') : '',
    status: task.status || 'Not Started',
    behavior: task.behavior || '',
    priority: task.priority || false
  }));
}

/**
 * Xử lý cập nhật công việc từ PIC
 * @param {Array<Object>} updates - Mảng các updates
 * @returns {Object} Result message
 */
function executePICUpdateTasks(updates) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    const sh = _sheet();
    let updateCount = 0;
    
    // Validate và update từng task
    updates.forEach(update => {
      try {
        // Validate row belongs to this PIC
        const currentRowPIC = sh.getRange(update.row, CONFIG.COL.PIC_NAME).getValue();
        if (currentRowPIC !== picName) {
          console.warn(`Row ${update.row} does not belong to ${picName}`);
          return;
        }
        
        // Update các fields được phép sửa
        if (update.keyTask !== undefined) {
          sh.getRange(update.row, CONFIG.COL.KEY).setValue(update.keyTask);
        }
        
        if (update.subTask !== undefined) {
          sh.getRange(update.row, CONFIG.COL.SUB).setValue(update.subTask);
        }
        
        if (update.taskResult !== undefined) {
          sh.getRange(update.row, CONFIG.COL.RESULT).setValue(update.taskResult);
        }
        
        // Update dates với validation
        if (update.startDate) {
          const startDate = _parseDateString(update.startDate);
          if (startDate) {
            sh.getRange(update.row, CONFIG.COL.START)
              .setValue(startDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.finishDate) {
          const finishDate = _parseDateString(update.finishDate);
          if (finishDate) {
            sh.getRange(update.row, CONFIG.COL.FINISH)
              .setValue(finishDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.deadline) {
          const deadline = _parseDateString(update.deadline);
          if (deadline) {
            sh.getRange(update.row, CONFIG.COL.DEADLINE)
              .setValue(deadline)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.status !== undefined) {
          sh.getRange(update.row, CONFIG.COL.STATUS).setValue(update.status);
        }
        
        if (update.priority !== undefined) {
          sh.getRange(update.row, CONFIG.COL.PRIORITY).setValue(update.priority);
        }
        
        updateCount++;
        
      } catch (rowError) {
        console.error(`Error updating row ${update.row}:`, rowError);
      }
    });
    
    return {
      success: true,
      updateCount: updateCount,
      message: `Updated ${updateCount} task(s) successfully`
    };
    
  } catch (error) {
    console.error('Error in executePICUpdateTasks:', error);
    throw error;
  }
}

/**
 * Xử lý thêm công việc mới từ PIC
 * @param {Array<Object>} newTasks - Mảng các tasks mới
 * @returns {Object} Result message
 */
/**
 * 🆕 XỬ LÝ BATCH ADD TASKS - SỬ DỤNG LOGIC TÌM DÒNG TRỐNG MỚI
 * @param {Array<Object>} tasks - Array of task objects from dialog
 * @returns {Object} Result with success status and count
 */
function executePICAddTasksBatch(tasks) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    if (!tasks || tasks.length === 0) {
      throw new Error('No tasks provided.');
    }
    
    const sh = _sheet();
    let addCount = 0;
    const addedRows = []; // Track added rows for logging
    
    // Process each task
    tasks.forEach((task, index) => {
      try {
        // 🆕 SỬ DỤNG FUNCTION TÌM DÒNG TRỐNG MỚI
        const targetRow = _findFirstEmptyRow();
        
        console.log(`Adding task ${index + 1} to row ${targetRow}`);
        
        // Parse dates
        const startDate = new Date(task.startDate);
        const finishDate = task.finishDate ? new Date(task.finishDate) : startDate;
        const deadline = new Date(task.deadline);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(deadline.getTime())) {
          console.warn(`Invalid dates for task ${index + 1}: ${task.subTask}`);
          return;
        }
        
        // Write data to row - THEO ĐÚNG CẤU TRÚC CONFIG.COL
        sh.getRange(targetRow, CONFIG.COL.TYPE).setValue(task.type || '');
        sh.getRange(targetRow, CONFIG.COL.KEY).setValue(task.keyTask || '');
        sh.getRange(targetRow, CONFIG.COL.SUB).setValue(task.subTask || '');
        sh.getRange(targetRow, CONFIG.COL.RESULT).setValue(''); // Empty for new task
        sh.getRange(targetRow, CONFIG.COL.PIC_NAME).setValue(picName);
        
        // Start Week (có thể để trống hoặc tự động tính)
        // sh.getRange(targetRow, CONFIG.COL.START_WEEK).setValue('Week 1');
        
        // Dates with format
        sh.getRange(targetRow, CONFIG.COL.START)
          .setValue(startDate)
          .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        
        if (task.finishDate) {
          sh.getRange(targetRow, CONFIG.COL.FINISH)
            .setValue(finishDate)
            .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        }
        
        sh.getRange(targetRow, CONFIG.COL.DEADLINE)
          .setValue(deadline)
          .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        
        // Assigner (default to PIC name)
        
        
        // Status
        sh.getRange(targetRow, CONFIG.COL.STATUS).setValue(task.status || 'Not Started');
        
        // Priority
        sh.getRange(targetRow, CONFIG.COL.PRIORITY).setValue(task.priority || false);
        
        // PIC Email
       
        
        addCount++;
        addedRows.push(targetRow);
        
      } catch (taskError) {
        console.error(`Error adding task ${index + 1}:`, taskError);
      }
    });
    
    // Log summary
    console.log(`✅ Batch add completed: ${addCount}/${tasks.length} tasks added`);
    console.log(`Rows used: ${addedRows.join(', ')}`);
    
    return {
      success: true,
      addCount: addCount,
      totalRequested: tasks.length,
      addedRows: addedRows,
      message: `Successfully added ${addCount} out of ${tasks.length} task(s)`
    };
    
  } catch (error) {
    console.error('Error in executePICAddTasksBatch:', error);
    throw new Error(`Failed to add tasks: ${error.message}`);
  }
}/**
 * 🆕 DIALOG BATCH MODE - THÊM NHIỀU CÔNG VIỆC CÙNG LÚC
 * Hiển thị bảng với nhiều rows để PIC có thể thêm nhiều task một lần
 */

function _getStatusOptions() {
  return [
    'Not Started',
    'In Progress',
    'On Hold',
    'Delayed',
    'Completed',
    'Cancelled'
  ];
}/**
 * 🆕 ENHANCED: Xử lý cập nhật tasks từ tab 1 với email option
 * @param {Array<Object>} updates - Array of task updates
 * @param {boolean} sendEmail - Whether to send weekly report email
 * @returns {Object} Result with message
 */
function executePICCombinedUpdate(updates, sendEmail = false) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    const sh = _sheet();
    let updateCount = 0;
    const processedRows = [];
    
    // Process updates
    updates.forEach(update => {
      try {
        // Validate row belongs to this PIC
        const currentRowPIC = sh.getRange(update.row, CONFIG.COL.PIC_NAME).getValue();
        if (currentRowPIC !== picName) {
          console.warn(`Row ${update.row} does not belong to ${picName}`);
          return;
        }
        // 🆕 Update Type field (editable from dialog)
if (update.type !== undefined) {
  sh.getRange(update.row, CONFIG.COL.TYPE).setValue(update.type);
}
        // Update fields that are allowed to be modified
        if (update.keyTask !== undefined) {
          sh.getRange(update.row, CONFIG.COL.KEY).setValue(update.keyTask);
        }
        
        if (update.subTask !== undefined) {
          sh.getRange(update.row, CONFIG.COL.SUB).setValue(update.subTask);
        }
        
        if (update.taskResult !== undefined) {
          sh.getRange(update.row, CONFIG.COL.RESULT).setValue(update.taskResult);
        }
        
        // Update dates with validation
        if (update.startDate !== undefined) {
          const startDate = new Date(update.startDate);
          if (!isNaN(startDate.getTime())) {
            sh.getRange(update.row, CONFIG.COL.START)
              .setValue(startDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.finishDate !== undefined) {
          if (update.finishDate) {
            const finishDate = new Date(update.finishDate);
            if (!isNaN(finishDate.getTime())) {
              sh.getRange(update.row, CONFIG.COL.FINISH)
                .setValue(finishDate)
                .setNumberFormat(CONFIG.DATE_FMT_SHEET);
            }
          } else {
            sh.getRange(update.row, CONFIG.COL.FINISH).clearContent();
          }
        }
        
        if (update.deadline !== undefined) {
          const deadline = new Date(update.deadline);
          if (!isNaN(deadline.getTime())) {
            sh.getRange(update.row, CONFIG.COL.DEADLINE)
              .setValue(deadline)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.status !== undefined) {
          sh.getRange(update.row, CONFIG.COL.STATUS).setValue(update.status);
        }
        
        if (update.priority !== undefined) {
          sh.getRange(update.row, CONFIG.COL.PRIORITY).setValue(update.priority);
        }
        
        updateCount++;
        processedRows.push(update.row);
        
      } catch (updateError) {
        console.error(`Error updating row ${update.row}:`, updateError);
      }
    });
    
    let resultMessage = `Đã cập nhật ${updateCount}/${updates.length} công việc`;
    
    // Send email if requested
    if (sendEmail && updateCount > 0) {
      try {
        const emailResult = executePICWeeklyReport(); // Sử dụng function gửi email có sẵn
        resultMessage += `\n📧 ${emailResult}`;
      } catch (emailError) {
        console.error('Email send error:', emailError);
        resultMessage += `\n⚠️ Cập nhật thành công nhưng gửi email thất bại: ${emailError.message}`;
      }
    }
    
    return {
      success: true,
      updateCount: updateCount,
      processedRows: processedRows,
      message: resultMessage
    };
    
  } catch (error) {
    console.error('Error in executePICCombinedUpdate:', error);
    throw new Error(`Failed to update tasks: ${error.message}`);
  }
}

/**
 * 🆕 ENHANCED: Xử lý thêm tasks mới từ tab 2 với email option
 * @param {Array<Object>} newTasks - Array of new task objects
 * @param {boolean} sendEmail - Whether to send weekly report email
 * @returns {Object} Result with message
 */
function executePICCombinedAdd(newTasks, sendEmail = false) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    if (!newTasks || newTasks.length === 0) {
      throw new Error('No tasks provided.');
    }
    
    const sh = _sheet();
    let addCount = 0;
    const addedRows = [];
    
    // Process each new task
    newTasks.forEach((task, index) => {
      try {
        // 🆕 SỬ DỤNG FUNCTION TÌM DÒNG TRỐNG THÔNG MINH MỚI
        const targetRow = _findFirstEmptyRowOptimized();
        
        console.log(`Adding task ${index + 1} to row ${targetRow}`);
        
        // Parse and validate dates
        const startDate = new Date(task.startDate);
        const deadline = new Date(task.deadline);
        
        if (isNaN(startDate.getTime()) || isNaN(deadline.getTime())) {
          console.warn(`Invalid dates for task ${index + 1}: ${task.subTask}`);
          return;
        }
        
        // Write data to row - THEO ĐÚNG CẤU TRÚC CONFIG.COL
        sh.getRange(targetRow, CONFIG.COL.TYPE).setValue(task.type || '');
        sh.getRange(targetRow, CONFIG.COL.KEY).setValue(task.keyTask || '');
        sh.getRange(targetRow, CONFIG.COL.SUB).setValue(task.subTask || '');
        sh.getRange(targetRow, CONFIG.COL.RESULT).setValue(''); // Empty for new task
        sh.getRange(targetRow, CONFIG.COL.PIC_NAME).setValue(picName);
        
        // Dates with format
        sh.getRange(targetRow, CONFIG.COL.START)
          .setValue(startDate)
          .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        
        if (task.finishDate) {
          const finishDate = new Date(task.finishDate);
          if (!isNaN(finishDate.getTime())) {
            sh.getRange(targetRow, CONFIG.COL.FINISH)
              .setValue(finishDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        sh.getRange(targetRow, CONFIG.COL.DEADLINE)
          .setValue(deadline)
          .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        
        // Other fields
        sh.getRange(targetRow, CONFIG.COL.ASSIGNER).setValue(picName);
        sh.getRange(targetRow, CONFIG.COL.STATUS).setValue(task.status || 'Not Started');
        sh.getRange(targetRow, CONFIG.COL.PRIORITY).setValue(task.priority || false);
        
        
        addCount++;
        addedRows.push(targetRow);
        
      } catch (taskError) {
        console.error(`Error adding task ${index + 1}:`, taskError);
      }
    });
    
    let resultMessage = `Đã thêm ${addCount}/${newTasks.length} công việc mới`;
    if (addedRows.length > 0) {
      resultMessage += ` (dòng: ${addedRows.join(', ')})`;
    }
    
    // Send email if requested
    if (sendEmail && addCount > 0) {
      try {
        const emailResult = executePICWeeklyReport(); // Sử dụng function gửi email có sẵn
        resultMessage += `\n📧 ${emailResult}`;
      } catch (emailError) {
        console.error('Email send error:', emailError);
        resultMessage += `\n⚠️ Thêm công việc thành công nhưng gửi email thất bại: ${emailError.message}`;
      }
    }
    
    return {
      success: true,
      addCount: addCount,
      totalRequested: newTasks.length,
      addedRows: addedRows,
      message: resultMessage
    };
    
  } catch (error) {
    console.error('Error in executePICCombinedAdd:', error);
    throw new Error(`Failed to add tasks: ${error.message}`);
  }
}

/**
 * 🆕 OPTIMIZED: Tìm dòng trống thông minh - FIX TRIỆT ĐỂ
 * Chỉ kiểm tra các cột E, F, G, H, I, K, L, M, O như yêu cầu
 * @returns {number} Row number của dòng trống đầu tiên
 */
function _findFirstEmptyRowOptimized() {
  try {
    const sh = _sheet();
    const lastRow = sh.getLastRow();
    
    // Bắt đầu từ DATA_START_ROW (thường là 6)
    const startRow = CONFIG.DATA_START_ROW;
    
    // Lấy tất cả data trong vùng cần kiểm tra để tối ưu performance
    const checkCols = [
      CONFIG.COL.TYPE,     // E
      CONFIG.COL.KEY,      // F  
      CONFIG.COL.SUB,      // G
      CONFIG.COL.RESULT,   // H
      CONFIG.COL.PIC_NAME, // I
      CONFIG.COL.START,    // K
      CONFIG.COL.FINISH,   // L
      CONFIG.COL.DEADLINE, // M
      CONFIG.COL.STATUS    // O
    ];
    
    // 🚀 PERFORMANCE OPTIMIZATION: Lấy data một lần thay vì nhiều lần
    const dataRange = sh.getRange(startRow, 1, Math.max(100, lastRow - startRow + 1), 25);
    const allData = dataRange.getValues();
    
    // Duyệt qua từng dòng để tìm dòng trống
    for (let i = 0; i < allData.length; i++) {
      const currentRow = startRow + i;
      const rowData = allData[i];
      
      // Kiểm tra tất cả các cột cần thiết
      const isEmpty = checkCols.every(colIndex => {
        const value = rowData[colIndex - 1]; // Array index starts from 0
        
        // Kiểm tra giá trị rỗng - bao gồm null, undefined, empty string, spaces
        if (value === null || value === undefined || value === '') {
          return true;
        }
        
        // Kiểm tra string chỉ có spaces
        if (typeof value === 'string' && value.trim() === '') {
          return true;
        }
        
        return false;
      });
      
      if (isEmpty) {
        console.log(`Found empty row: ${currentRow}`);
        return currentRow;
      }
    }
    
    // Nếu không tìm thấy dòng trống, trả về dòng tiếp theo
    const nextRow = lastRow + 1;
    console.log(`No empty row found, using next row: ${nextRow}`);
    return nextRow;
    
  } catch (error) {
    console.error('Error in _findFirstEmptyRowOptimized:', error);
    // Fallback: trả về dòng cuối + 1
    const sh = _sheet();
    return sh.getLastRow() + 1;
  }
}/**
 * 🆕 ENHANCED Send Weekly Report - Version 2.0
 * Cải thiện theo yêu cầu chi tiết:
 * - Dialog box lớn nhất có thể
 * - Tiếng Việt cho UI, English cho function output
 * - Status 5 mức độ mới
 * - Thêm cột Priority (checkbox)
 * - Real-time statistics
 * - Color coding cho rows
 * - Smart send button activation
 */
function picSendWeeklyReportEnhanced() {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    _getUi().alert('❌ Không thể xác định PIC name.');
    return;
  }
  
  const rows = _fetchAllRows();
  const userRows = rows.filter(r => r.picName === picName);
  
  if (userRows.length === 0) {
    _getUi().alert(`Không tìm thấy công việc cho PIC ${picName}.`);
    return;
  }
  
  const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
  const thisWeek = _filterWeekRows(userRows, monday, saturday);
  const nextWeek = _filterNextWeekRows(userRows, nextMonday, nextSaturday);
  
  const weekLabel = `${_formatDate(monday, 'dd/MM')} - ${_formatDate(saturday, 'dd/MM')}`;
  const planLabel = `${_formatDate(nextMonday, 'dd/MM')} - ${_formatDate(nextSaturday, 'dd/MM')}`;
  
  _showEnhancedWeeklyReportDialog(picName, thisWeek, nextWeek, weekLabel, planLabel);
}

function _showEnhancedWeeklyReportDialog(picName, thisWeekTasks, nextWeekTasks, weekLabel, planLabel) {
  const ui = _getUi();
  
  // Build unique lists for autocomplete
  const allRows = _fetchAllRows();
  const uniqueKeyTasks = [...new Set(allRows.map(r => r.key).filter(Boolean))];
  const uniqueSubTasks = [...new Set(allRows.map(r => r.sub).filter(Boolean))];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 15px; 
          background: #f5f7fa;
          font-size: 15px;
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 15px;
          margin: -15px -15px 15px -15px;
          text-align: center;
          border-radius: 0 0 15px 15px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h2 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 13px; }
        
        .stats-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }
        
        .stat-box {
          background: white;
          padding: 10px 12px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid;
          transition: transform 0.2s;
        }
        
        .stat-box:hover { transform: translateY(-2px); }
        
        .stat-box.total { border-left-color: #3498db; }
        .stat-box.completed { border-left-color: #27ae60; background: #e8f5e8; }
        .stat-box.pending { border-left-color: #f39c12; }
        .stat-box.priority { border-left-color: #f1c40f; background: #fff9e6; }
        
        .stat-number { font-size: 20px; font-weight: bold; color: #2c3e50; }
        .stat-label { font-size: 11px; color: #7f8c8d; margin-top: 3px; }
        
        .notification-box {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 10px;
          color: #856404;
          font-size: 13px;  /* Thêm font-size nhỏ hơn */
  line-height: 1.4;  /* Thêm line-height */
        }
        
        .tabs {
  display: flex;
  margin-bottom: 12px;  /* Giảm từ 20px → 12px */
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tab-button {
  flex: 1;
  padding: 10px 15px;  /* Giảm từ 15px 20px → 10px 15px */
  background: #ecf0f1;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  transition: all 0.3s;
}
        
        .tab-button.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .tab-content {
  display: none;
  background: white;
  border-radius: 10px;
  padding: 15px;  /* Giảm từ 20px → 15px */
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-height: 680px;  /* ⭐ TĂNG từ 500px → 680px - QUAN TRỌNG NHẤT */
  overflow-y: auto;
}
        
        .tab-content.active { display: block; }
        
        .task-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        
        .task-table th {
  background: #34495e;
  color: white;
  padding: 14px 10px;  /* Tăng từ 12px 8px → 14px 10px */
  text-align: left;
  font-size: 14px;  /* ⭐ Tăng từ 12px → 14px */
  font-weight: 600;
  white-space: nowrap;  /* Thêm để tránh xuống dòng */
}
        
        .task-table td {
  padding: 12px 10px;  /* Tăng từ 10px 8px → 12px 10px */
  border-bottom: 1px solid #ddd;
  font-size: 14px;  /* ⭐ Tăng từ 12px → 14px */
  vertical-align: middle;  /* Thêm để căn giữa */
}
        
        .task-table tr:hover { background: #f8f9fa; }
        
        .task-table tr.priority-row { background: #fff9e6; }
        .task-table tr.completed-row { background: #e8f5e8; }
        .task-table tr.inprogress-row { background: #e3f2fd; }
        
        .editable-cell {
          position: relative;
        }
        
        .editable-cell input, .editable-cell select, .editable-cell textarea {
  width: 100%;
  border: 1px solid #ddd;
  padding: 8px 10px;  /* ⭐ Tăng từ 6px → 8px 10px */
  font-size: 14px;  /* ⭐ Tăng từ 12px → 14px */
  border-radius: 4px;
  background: white;
  box-sizing: border-box;  /* Thêm để tránh overflow */
}

.editable-cell textarea {
  min-height: 50px;  /* Tăng từ 40px → 50px */
  resize: vertical;
  line-height: 1.4;  /* Thêm line-height */
}
        
        .checkbox-cell {
          text-align: center;
          width: 50px;
        }
        
        .checkbox-cell input[type="checkbox"] {
  transform: scale(1.4);  /* Tăng từ 1.2 → 1.4 */
  cursor: pointer;
  margin: 0;  /* Thêm để căn giữa */
}
        
        .date-cell { width: 90px; }
        .status-cell { width: 120px; }
        .priority-cell { width: 60px; }
        
        .autocomplete-container {
          position: relative;
        }
        
        .autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          max-height: 150px;
          overflow-y: auto;
          z-index: 1000;
          display: none;
        }
        
        .autocomplete-dropdown.active { display: block; }
        
        .autocomplete-item {
  padding: 10px 14px;  /* Tăng từ 8px 12px → 10px 14px */
  cursor: pointer;
  border-bottom: 1px solid #eee;
  font-size: 14px;  /* Tăng từ 12px → 14px */
}
        
        .autocomplete-item:hover,
        .autocomplete-item.highlighted {
          background: #e3f2fd;
        }
        
        ..buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 15px;  /* Giảm từ 20px → 15px */
  padding-top: 15px;  /* Giảm từ 20px → 15px */
  border-top: 1px solid #ddd;
}
        
        .btn {
          padding: 12px 30px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 120px;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
        }
        
        .btn-primary:hover { transform: translateY(-2px); }
        
        .btn-primary:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: #ecf0f1;
          color: #2c3e50;
        }
        
        .btn-secondary:hover { background: #d5dbdb; }
        
        .loading {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 9999;
        }
        
        .loading.active { display: block; }
        
        .row-number { 
          font-weight: bold; 
          color: #3498db; 
          text-align: center;
          width: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>📊 Báo cáo tuần ${picName}</h2>
        <p>Công việc tuần này: ${weekLabel} | Kế hoạch tuần tới: ${planLabel}</p>
      </div>
      
      <div class="stats-container">
        <div class="stat-box total">
          <div class="stat-number" id="totalTasks">${thisWeekTasks.length}</div>
          <div class="stat-label">Tổng công việc</div>
        </div>
        <div class="stat-box completed">
          <div class="stat-number" id="completedTasks">${thisWeekTasks.filter(t => t.status === 'Completed').length}</div>
          <div class="stat-label">Hoàn thành</div>
        </div>
        <div class="stat-box pending">
          <div class="stat-number" id="pendingTasks">${thisWeekTasks.filter(t => t.status && t.status.includes('Progress')).length}</div>
          <div class="stat-label">Đang thực hiện</div>
        </div>
        <div class="stat-box priority">
          <div class="stat-number" id="priorityTasks">${thisWeekTasks.filter(t => t.priority).length}</div>
          <div class="stat-label">Việc quan trọng</div>
        </div>
      </div>
      
      <div id="notificationBox" class="notification-box">
        <span id="notificationText">Đang kiểm tra thông tin công việc...</span>
      </div>
      
      <div class="tabs">
        <button class="tab-button active" onclick="showTab('current')">📋 Công việc tuần này</button>
        <button class="tab-button" onclick="showTab('next')">📅 Kế hoạch tuần tới</button>
      </div>
      
      <div id="tab-current" class="tab-content active">
        <table class="task-table">
          <thead>
  <tr>
    <th style="width: 50px;">Row</th>
<th style="width: 70px;">Ưu tiên</th>
<th style="width: 95px;">Start Date</th>
<th style="width: 150px;">Type</th>
<th style="width: 220px;">Key Task</th>
<th style="width: 200px;">Sub Task</th>
<th style="width: 220px;">Task Result</th>
<th style="width: 95px;">Finish Date</th>
<th style="width: 95px;">Deadline</th>
<th style="width: 150px;">Status</th>
<th style="width: 85px;">Thao tác</th>
  </tr>
</thead>
          <tbody id="currentWeekTableBody">
            ${_buildCurrentWeekTableRows(thisWeekTasks, uniqueKeyTasks, uniqueSubTasks)}
          </tbody>
        </table>
      </div>
      
      <div id="tab-next" class="tab-content">
        <table class="task-table">
          <thead>
            <tr>
              <th class="row-number">Row</th>
              <th class="date-cell">Start Date</th>
              <th>Type</th>
              <th>Key Task</th>
              <th>Sub Task</th>
              <th class="date-cell">Deadline</th>
              <th class="status-cell">Status</th>
            </tr>
          </thead>
          <tbody id="nextWeekTableBody">
            ${_buildNextWeekTableRows(nextWeekTasks)}
          </tbody>
        </table>
      </div>
      
      <div class="buttons">
        <button class="btn btn-primary" id="sendReportBtn" onclick="sendReport()" disabled>
          📧 Gửi báo cáo
        </button>
        <button class="btn btn-secondary" onclick="google.script.host.close()">
          🚪 Đóng
        </button>
      </div>
      
      <div id="loading" class="loading">
        <p>⏳ Đang gửi báo cáo...</p>
      </div>
      
      <script>
        // Global data
        const uniqueKeyTasks = ${JSON.stringify(uniqueKeyTasks)};
        const uniqueSubTasks = ${JSON.stringify(uniqueSubTasks)};
        const uniqueTypes = ${JSON.stringify(uniqueTypes)};
        const statusOptions = ['Not Started', 'In Progress 25%', 'In Progress 50%', 'In Progress 75%', 'Completed'];
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
          initializeAutocomplete();
          updateStatistics();
          checkSendButtonState();
          updateRowColors();
        });
        
        function showTab(tabName) {
          // Hide all tabs
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Deactivate all buttons  
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          // Show selected tab
          document.getElementById('tab-' + tabName).classList.add('active');
          
          // Activate corresponding button
          event.target.classList.add('active');
        }
        
        function initializeAutocomplete() {
          document.querySelectorAll('input[data-autocomplete="type"]').forEach(input => {
    setupAutocomplete(input, uniqueTypes);
  });
          // Initialize autocomplete for Key Task inputs
          document.querySelectorAll('input[data-autocomplete="keyTask"]').forEach(input => {
            setupAutocomplete(input, uniqueKeyTasks);
          });
          
          // Initialize autocomplete for Sub Task inputs  
          document.querySelectorAll('input[data-autocomplete="subTask"]').forEach(input => {
            setupAutocomplete(input, uniqueSubTasks);
          });
        }
        
        function setupAutocomplete(input, dataList) {
          const container = input.closest('.autocomplete-container');
          if (!container) return;
          
          let dropdown = container.querySelector('.autocomplete-dropdown');
          if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'autocomplete-dropdown';
            container.appendChild(dropdown);
          }
          
          let highlightedIndex = -1;
          
          input.addEventListener('input', function() {
            const value = this.value.toLowerCase();
            dropdown.innerHTML = '';
            highlightedIndex = -1;
            
            if (value.length === 0) {
              dropdown.classList.remove('active');
              return;
            }
            
            const filtered = dataList.filter(item => 
              item.toLowerCase().includes(value)
            ).slice(0, 10);
            
            if (filtered.length === 0) {
              dropdown.classList.remove('active');
              return;
            }
            
            filtered.forEach((item, index) => {
              const div = document.createElement('div');
              div.className = 'autocomplete-item';
              div.textContent = item;
              div.addEventListener('click', function() {
                input.value = item;
                dropdown.classList.remove('active');
                input.dispatchEvent(new Event('change'));
              });
              dropdown.appendChild(div);
            });
            
            dropdown.classList.add('active');
          });
          
          input.addEventListener('keydown', function(e) {
            const items = dropdown.querySelectorAll('.autocomplete-item');
            
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
              updateHighlight(items, highlightedIndex);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              highlightedIndex = Math.max(highlightedIndex - 1, -1);
              updateHighlight(items, highlightedIndex);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (highlightedIndex >= 0 && items[highlightedIndex]) {
                items[highlightedIndex].click();
              }
            } else if (e.key === 'Escape') {
              dropdown.classList.remove('active');
              highlightedIndex = -1;
            }
          });
          
          // Close dropdown when clicking outside
          document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
              dropdown.classList.remove('active');
            }
          });
        }
        
        function updateHighlight(items, index) {
          items.forEach((item, idx) => {
            if (idx === index) {
              item.classList.add('highlighted');
              item.scrollIntoView({ block: 'nearest' });
            } else {
              item.classList.remove('highlighted');
            }
          });
        }
        
        function updateStatistics() {
          const currentRows = document.querySelectorAll('#currentWeekTableBody tr');
          let completed = 0;
          let pending = 0;
          let priority = 0;
          let incomplete = 0;
          let missingFinishDate = 0;
          
          currentRows.forEach(row => {
            const status = row.querySelector('select[name="status"]')?.value || '';
            const priorityChecked = row.querySelector('input[name="priority"]')?.checked || false;
            const taskResult = row.querySelector('textarea[name="taskResult"]')?.value?.trim() || '';
            const finishDate = row.querySelector('input[name="finishDate"]')?.value?.trim() || '';
            
            if (status === 'Completed') completed++;
            if (status.includes('Progress')) pending++;
            if (priorityChecked) priority++;
            if (!taskResult) incomplete++;
            if (!finishDate && status === 'Completed') missingFinishDate++;
          });
          
          document.getElementById('completedTasks').textContent = completed;
          document.getElementById('pendingTasks').textContent = pending;
          document.getElementById('priorityTasks').textContent = priority;
          
          // Update notification
          const notificationBox = document.getElementById('notificationBox');
          const notificationText = document.getElementById('notificationText');
          
          if (incomplete > 0 || missingFinishDate > 0) {
            let message = '';
            if (incomplete > 0) {
              message += \`Phát hiện \${incomplete} công việc chưa có task result\`;
            }
            if (missingFinishDate > 0) {
              if (message) message += ', ';
              message += \`\${missingFinishDate} việc chưa có finish date\`;
            }
            notificationText.textContent = message;
            notificationBox.style.display = 'block';
          } else {
            notificationText.textContent = 'Các công việc đã được cập nhật đầy đủ thông tin, hãy bấm "Gửi báo cáo" để báo cáo công việc tuần này và kế hoạch tuần tới';
            notificationBox.style.background = '#d4edda';
            notificationBox.style.color = '#155724';
            notificationBox.style.borderColor = '#c3e6cb';
          }
        }
        
        function checkSendButtonState() {
          const currentRows = document.querySelectorAll('#currentWeekTableBody tr');
          let allComplete = true;
          
          currentRows.forEach(row => {
            const taskResult = row.querySelector('textarea[name="taskResult"]')?.value?.trim() || '';
            const finishDate = row.querySelector('input[name="finishDate"]')?.value?.trim() || '';
            const status = row.querySelector('select[name="status"]')?.value || '';
            
            if (!taskResult || (!finishDate && status === 'Completed')) {
              allComplete = false;
            }
          });
          
          const sendBtn = document.getElementById('sendReportBtn');
          sendBtn.disabled = !allComplete;
        }
        
        function updateRowColors() {
          document.querySelectorAll('#currentWeekTableBody tr').forEach(row => {
            const status = row.querySelector('select[name="status"]')?.value || '';
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            
            // Remove existing classes
            row.classList.remove('priority-row', 'completed-row', 'inprogress-row');
            
            // Apply new classes based on rules
            if (status === 'Completed') {
              row.classList.add('completed-row'); // Blue wins over yellow
            } else if (priority) {
              row.classList.add('priority-row'); // Yellow for priority
            } else if (status.includes('Progress')) {
              row.classList.add('inprogress-row'); // Light blue for in progress
            }
          });
        }
        
        function onInputChange() {
          updateStatistics();
          checkSendButtonState();
          updateRowColors();
        }
        
        function sendReport() {
          if (!confirm('Xác nhận gửi báo cáo tuần này?\\n\\nBáo cáo sẽ bao gồm:\\n- Tiến độ công việc tuần này\\n- Kế hoạch tuần tới\\n- File PDF đính kèm')) {
            return;
          }
          
          // Collect all updates from current week tab
          const updates = [];
          document.querySelectorAll('#currentWeekTableBody tr').forEach(row => {
            const rowNum = parseInt(row.querySelector('.row-number').textContent);
            const update = {
              row: rowNum,
              priority: row.querySelector('input[name="priority"]').checked,
              keyTask: row.querySelector('input[name="keyTask"]').value,
              subTask: row.querySelector('input[name="subTask"]').value,
              taskResult: row.querySelector('textarea[name="taskResult"]').value,
              startDate: row.querySelector('input[name="startDate"]').value,
              finishDate: row.querySelector('input[name="finishDate"]').value,
              deadline: row.querySelector('input[name="deadline"]').value,
              status: row.querySelector('select[name="status"]').value
            };
            updates.push(update);
          });
          
          const loading = document.getElementById('loading');
          loading.classList.add('active');
          
          google.script.run
            .withSuccessHandler(function(result) {
              loading.classList.remove('active');
              alert('✅ ' + result);
              google.script.host.close();
            })
            .withFailureHandler(function(error) {
              loading.classList.remove('active');
              alert('❌ Lỗi: ' + error.message);
            })
            .executePICSendWeeklyReportWithUpdates(updates);
        }
        
        // Add event listeners to all inputs
        document.addEventListener('change', onInputChange);
        document.addEventListener('input', onInputChange);
      </script>
    </body>
    </html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1800).setHeight(1000),
    'Send Weekly Report - ' + picName
  );
}

function _buildCurrentWeekTableRows(tasks, uniqueKeyTasks, uniqueSubTasks, uniqueTypes) {
  return tasks.map(task => {
    const statusOptions = ['Not Started', 'In Progress 25%', 'In Progress 50%', 'In Progress 75%', 'Completed'];
    const statusSelect = statusOptions.map(option => 
      `<option value="${option}" ${task.status === option ? 'selected' : ''}>${option}</option>`
    ).join('');
    
    return `
      <tr>
        <!-- 1. Row -->
        <td class="row-number">${task.row}</td>
        
        <!-- 2. Priority -->
        <td class="checkbox-cell">
          <input type="checkbox" name="priority" ${task.priority ? 'checked' : ''}>
        </td>
        
        <!-- 3. Start Date -->
        <td class="editable-cell date-cell">
          <input type="date" name="startDate" value="${task.start ? _formatDateForInput(task.start) : ''}" onchange="autoFillDates(this, true)">
          <div class="error-message"></div>
        </td>
        
        <!-- 4. Type -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="type" 
                   value="${_htmlEsc(task.type || '')}" 
                   data-autocomplete="type"
                   placeholder="Select type...">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 5. Key Task -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" name="keyTask" value="${_htmlEsc(task.key || '')}" data-autocomplete="keyTask">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 6. Sub Task -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" name="subTask" value="${_htmlEsc(task.sub || '')}" data-autocomplete="subTask">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 7. Task Result -->
        <td class="editable-cell">
          <textarea name="taskResult">${_htmlEsc(task.result || '')}</textarea>
        </td>
        
        <!-- 8. Finish Date -->
        <td class="editable-cell date-cell">
          <input type="date" name="finishDate" value="${task.finish ? _formatDateForInput(task.finish) : ''}">
        </td>
        
        <!-- 9. Deadline -->
        <td class="editable-cell date-cell">
          <input type="date" name="deadline" value="${task.deadline ? _formatDateForInput(task.deadline) : ''}">
        </td>
        
        <!-- 10. Status -->
        <td class="editable-cell status-cell">
          <select name="status">${statusSelect}</select>
        </td>
        
        <!-- 11. Action -->
        <td class="action-cell">
          <button class="btn btn-delete" onclick="deleteRow(this)">🗑️ Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

function _buildNextWeekTableRows(tasks) {
  return tasks.map(task => `
    <tr>
      <td class="row-number">${task.row}</td>
      <td class="date-cell">${task.start ? _formatDate(task.start, 'dd/MM') : '-'}</td>
      <td>${_htmlEsc(task.type || '-')}</td>
      <td>${_htmlEsc(task.key || '-')}</td>
      <td>${_htmlEsc(task.sub || '-')}</td>
      <td class="date-cell">${task.deadline ? _formatDate(task.deadline, 'dd/MM') : '-'}</td>
      <td class="status-cell">${_htmlEsc(task.status || 'Not Started')}</td>
    </tr>
  `).join('');
}

function _formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function _htmlEsc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 🆕 Backend function xử lý gửi email với updates
 */
function executePICSendWeeklyReportWithUpdates(updates) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    // First, update all the tasks
    const sh = _sheet();
    let updateCount = 0;
    
    updates.forEach(update => {
      try {
        // Validate row belongs to this PIC
        const currentRowPIC = sh.getRange(update.row, CONFIG.COL.PIC_NAME).getValue();
        if (currentRowPIC !== picName) {
          console.warn(`Row ${update.row} does not belong to ${picName}`);
          return;
        }
        
        // Update fields
        if (update.keyTask !== undefined) {
          sh.getRange(update.row, CONFIG.COL.KEY).setValue(update.keyTask);
        }
        
        if (update.subTask !== undefined) {
          sh.getRange(update.row, CONFIG.COL.SUB).setValue(update.subTask);
        }
        
        if (update.taskResult !== undefined) {
          sh.getRange(update.row, CONFIG.COL.RESULT).setValue(update.taskResult);
        }
        
        // Update dates
        if (update.startDate) {
          const startDate = new Date(update.startDate);
          if (!isNaN(startDate.getTime())) {
            sh.getRange(update.row, CONFIG.COL.START)
              .setValue(startDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.finishDate) {
          const finishDate = new Date(update.finishDate);
          if (!isNaN(finishDate.getTime())) {
            sh.getRange(update.row, CONFIG.COL.FINISH)
              .setValue(finishDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.deadline) {
          const deadline = new Date(update.deadline);
          if (!isNaN(deadline.getTime())) {
            sh.getRange(update.row, CONFIG.COL.DEADLINE)
              .setValue(deadline)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
          }
        }
        
        if (update.status !== undefined) {
          sh.getRange(update.row, CONFIG.COL.STATUS).setValue(update.status);
        }
        
        if (update.priority !== undefined) {
          sh.getRange(update.row, CONFIG.COL.PRIORITY).setValue(update.priority);
        }
        
        updateCount++;
        
      } catch (rowError) {
        console.error(`Error updating row ${update.row}:`, rowError);
      }
    });
    
    // Then send the weekly report email
    const emailResult = executePICWeeklyReport();
    
    return `Đã cập nhật ${updateCount} công việc và ${emailResult}`;
    
  } catch (error) {
    console.error('Error in executePICSendWeeklyReportWithUpdates:', error);
    throw new Error(`Failed to send report: ${error.message}`);
  }
}/**
 * 🆕 Helper Functions cho Enhanced Weekly Report
 */

/**
 * Lấy danh sách tuần hiện tại và tuần tới
 */
function _weekBounds(date) {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  
  const nextSaturday = new Date(saturday);
  nextSaturday.setDate(saturday.getDate() + 7);
  
  return { monday, saturday, nextMonday, nextSaturday };
}

/**
 * Lọc các task trong tuần hiện tại
 */
function _filterWeekRows(rows, monday, saturday) {
  return rows.filter(row => {
    if (!row.start) return false;
    const startDate = new Date(row.start);
    return startDate >= monday && startDate <= saturday;
  });
}

/**
 * Lọc các task trong tuần tới
 */
function _filterNextWeekRows(rows, nextMonday, nextSaturday) {
  return rows.filter(row => {
    if (!row.start) return false;
    const startDate = new Date(row.start);
    return startDate >= nextMonday && startDate <= nextSaturday;
  });
}

/**
 * Format date cho display
 */
function _formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'dd/MM':
      return `${day}/${month}`;
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * 🆕 Cập nhật function executePICWeeklyReport để support email gửi
 * Function này đã có sẵn nhưng cần đảm bảo hoạt động với enhanced version
 */


/**
 * 🆕 Build simple task table for email
 */
function _buildSimpleTaskTable(tasks, title) {
  if (!tasks || tasks.length === 0) {
    return `<p><em>No ${title.toLowerCase()} for this period</em></p>`;
  }
  
  const tableRows = tasks.map(task => {
    const priority = task.priority ? '⭐ ' : '';
    const status = task.status || 'Not Started';
    
    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${task.row}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${priority}${_htmlEsc(task.key || '')}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${_htmlEsc(task.sub || '')}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${_htmlEsc(task.result || '')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${task.start ? _formatDate(task.start, 'dd/MM') : '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${task.deadline ? _formatDate(task.deadline, 'dd/MM') : '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${status}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <h3>${title}</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="border: 1px solid #ddd; padding: 8px;">Row</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Key Task</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Sub Task</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Result</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Start</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Deadline</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * 🆕 Build weekly email HTML
 */
function _buildWeeklyEmailHTML({pic, weekLabel, planLabel, fileLink, totals, tables}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="margin: 0;">📊 Weekly Report - ${pic}</h2>
        <p style="margin: 10px 0 0 0;">Week: ${weekLabel} | Next Week Plan: ${planLabel}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #ddd;">
        <h3>📈 Summary Statistics</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #3498db;">
            <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${totals.totalTask}</div>
            <div style="font-size: 12px; color: #7f8c8d;">Total Tasks</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #27ae60;">
            <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${totals.completedCount}</div>
            <div style="font-size: 12px; color: #7f8c8d;">Completed</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #f39c12;">
            <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${totals.inprogressCount}</div>
            <div style="font-size: 12px; color: #7f8c8d;">In Progress</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #f1c40f;">
            <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${totals.importantCompletedCount}</div>
            <div style="font-size: 12px; color: #7f8c8d;">Priority Completed</div>
          </div>
        </div>
      </div>
      
      <div style="background: white; padding: 20px; border: 1px solid #ddd; border-top: none;">
        ${tables.tblCompleted}
        ${tables.tblInProgress}
        ${tables.tblPlanNext}
        
        ${fileLink ? `<p style="margin-top: 20px;"><a href="${fileLink}" style="color: #007bff;">📋 View Full Sheet</a></p>` : ''}
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          <em>Auto-generated by Apps Script - ${_formatDate(new Date(), 'dd/MM/yyyy HH:mm')}</em>
        </p>
      </div>
    </div>
  `;
}

/**
 * 🆕 Get file link helper (nếu chưa có)
 */
function _getFileLink() {
  try {
    const sh = _sheet();
    const fileLink = sh.getRange(CONFIG.COL.FILE_LINK_ROW, CONFIG.COL.FILE_LINK_COL).getValue();
    return fileLink || SpreadsheetApp.getActive().getUrl();
  } catch (error) {
    console.error('Error getting file link:', error);
    return SpreadsheetApp.getActive().getUrl();
  }
}

/**
 * 🆕 Dedupe emails helper (nếu chưa có)
 */
function _dedupeEmails(arr) {
  const seen = new Set();
  const result = [];
  
  (arr || []).forEach(email => {
    if (!email) return;
    
    String(email).split(/[;,]/).forEach(part => {
      const trimmed = part.trim().toLowerCase();
      if (trimmed && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) && !seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    });
  });
  
  return result;
}/**
 * 🆕 ENHANCED UPDATE & REPORT SYSTEM - Version 3.0
 * Cải thiện hoàn toàn theo yêu cầu chi tiết:
 * 1. Đổi tên: "Send Weekly Report" → "Cập nhật & Báo cáo"
 * 2. Dialog tối đa kích thước với UI rõ ràng nhất
 * 3. Tab "Công việc tuần này": Add/Delete rows, real-time stats, validate dates
 * 4. Tab "Kế hoạch tuần tới": Layout mới, stats khác, Key tasks quan trọng với nhắc việc
 * 5. Checkbox "Gửi báo cáo" + nút "Xác nhận"
 * 6. Tự động điền Finish date = Start date
 * 7. Validate Start date trong tuần (Thứ 2-7)
 */

function picUpdateAndReport() {
  const currentUser = _getCurrentUserEmail();
  const picName = _getUserPICName(currentUser);
  
  if (!picName) {
    _getUi().alert('❌ Không thể xác định PIC name.');
    return;
  }
  
  const rows = _fetchAllRows();
  const userRows = rows.filter(r => r.picName === picName);
  
  if (userRows.length === 0) {
    _getUi().alert(`Không tìm thấy công việc cho PIC ${picName}.`);
    return;
  }
  
  const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
  const thisWeek = _filterWeekRows(userRows, monday, saturday);
  const nextWeek = _filterNextWeekRows(userRows, nextMonday, nextSaturday);
  
  const weekLabel = `${_formatDate(monday, 'dd/MM')} - ${_formatDate(saturday, 'dd/MM')}`;
  const planLabel = `${_formatDate(nextMonday, 'dd/MM')} - ${_formatDate(nextSaturday, 'dd/MM')}`;
  
  _showUpdateAndReportDialog(picName, thisWeek, nextWeek, weekLabel, planLabel, monday, saturday, nextMonday, nextSaturday);
}

/**
 * ============================================================================
 * _showUpdateAndReportDialog V3 - WEEKLY TASK MANAGEMENT
 * ============================================================================
 * VERSION 3 IMPROVEMENTS:
 * - Removed "In Progress" stat card
 * - Added toggle button to hide/show statistics section
 * - Add Task uses date input instead of dropdown
 * - Fixed Save Changes function
 * - Increased font sizes throughout
 * 
 * @param {string} picName - PIC name
 * @param {Array} thisWeekTasks - Tasks for current week
 * @param {Array} nextWeekTasks - Tasks for next week
 * @param {string} weekLabel - Label for current week
 * @param {string} planLabel - Label for next week
 * @param {Date} monday - Monday of current week
 * @param {Date} sunday - Sunday of current week
 * @param {Date} nextMonday - Monday of next week
 * @param {Date} nextSunday - Sunday of next week
 */
function _showUpdateAndReportDialog(picName, thisWeekTasks, nextWeekTasks, weekLabel, planLabel, monday, sunday, nextMonday, nextSunday) {
  const ui = _getUi();
  
  // Build unique lists for autocomplete
  const allRows = _fetchAllRows();
  const uniqueKeyTasks = _getKeyTaskOptionsFromMaster();
  const uniqueSubTasks = [...new Set(allRows.map(r => r.sub).filter(Boolean))];
  const uniqueTypes = _getTypeOptionsFromMaster();
  
  // Calculate statistics
  const totalThisWeek = thisWeekTasks.length;
  const completedCount = thisWeekTasks.filter(t => t.status === 'Completed').length;
  const completedPercent = totalThisWeek > 0 ? Math.round((completedCount / totalThisWeek) * 100) : 0;
  const totalNextWeek = nextWeekTasks.length;
  
  // Type task statistics for current week
  const typeTaskStats = {};
  thisWeekTasks.forEach(task => {
    const type = task.type || 'Unassigned';
    typeTaskStats[type] = (typeTaskStats[type] || 0) + 1;
  });
  
  // Build type stats cards HTML
  const typeStatsCardsHtml = Object.entries(typeTaskStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => `
      <div class="type-stat-card">
        <div class="type-stat-value">${count}</div>
        <div class="type-stat-label">${_escapeHtml(type.length > 18 ? type.substring(0, 15) + '...' : type)}</div>
      </div>
    `).join('');
  
  // Build datalist for autocomplete
  const typeTaskDatalist = uniqueTypes.map(type => 
    `<option value="${_escapeHtml(type)}">`
  ).join('');
  
  const keyTaskDatalist = uniqueKeyTasks.map(key => 
    `<option value="${_escapeHtml(key)}">`
  ).join('');
  
  const statusOptions = ['Not Started', 'In Progress 25%', 'In Progress 50%', 'In Progress 75%', 'Completed'];
  
  // Format dates for min/max attributes
  const mondayStr = _formatDateISO(monday);
  const sundayStr = _formatDateISO(sunday);
  const nextMondayStr = _formatDateISO(nextMonday);
  const nextSundayStr = _formatDateISO(nextSunday);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 16px; color: #333; background: #fff; }
        
        /* ==================== CHIP LINK STYLES ==================== */
        .chip-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          background: #e3f2fd;
          border: 1px solid #90caf9;
          border-radius: 18px;
          color: #1976d2;
          text-decoration: none;
          font-size: 14px;
          margin: 3px 5px 3px 0;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .chip-link:hover { background: #bbdefb; border-color: #64b5f6; }
        
        /* ==================== STATISTICS SECTION ==================== */
        .stats-section { 
          padding: 16px 24px; 
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
          border-bottom: 1px solid #dee2e6;
          transition: all 0.3s ease;
        }
        .stats-section.collapsed {
          display: none;
        }
        
        .stats-toggle-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 24px;
          background: #3b5998;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }
        .stats-toggle-bar:hover { background: #2d4373; }
        .stats-toggle-bar h2 { font-size: 18px; font-weight: 600; margin: 0; }
        .stats-toggle-bar .toggle-icon { 
          font-size: 20px; 
          transition: transform 0.3s;
        }
        .stats-toggle-bar.collapsed .toggle-icon { transform: rotate(180deg); }
        .stats-toggle-bar .week-info { font-size: 14px; opacity: 0.9; }
        
        .statistics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
        .stat-card { 
          background: white; 
          padding: 20px; 
          border-radius: 10px; 
          text-align: center; 
          border: 1px solid #e0e0e0; 
          transition: transform 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(59, 89, 152, 0.15); }
        .stat-label { font-size: 13px; color: #666; margin-bottom: 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
        .stat-value { font-size: 36px; font-weight: 800; }
        .stat-total { color: #3b5998; }
        .stat-completed { color: #28a745; }
        .stat-nextweek { color: #17a2b8; }
        
        /* Type Stats Cards */
        .type-stats-container { display: flex; flex-wrap: wrap; gap: 10px; }
        .type-stat-card { 
          background: white; 
          border: 1px solid #e0e0e0; 
          border-radius: 8px; 
          padding: 12px 16px; 
          min-width: 110px; 
          text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .type-stat-value { font-size: 24px; font-weight: 700; color: #3b5998; }
        .type-stat-label { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; font-weight: 600; }
        
        /* ==================== TABS ==================== */
        .tabs-container { display: flex; background: #f9f9f9; border-bottom: 2px solid #e0e0e0; }
        .tab-button { 
          flex: 1; 
          padding: 16px 24px; 
          background: #f9f9f9; 
          border: none; 
          cursor: pointer; 
          font-size: 16px; 
          font-weight: 700; 
          color: #666; 
          transition: all 0.3s;
          font-family: 'Calibri', sans-serif;
          border-bottom: 4px solid transparent;
        }
        .tab-button:hover { background: #f0f4ff; color: #3b5998; }
        .tab-button.active { 
          background: white; 
          color: #3b5998; 
          border-bottom: 4px solid #3b5998;
        }
        
        .tab-content { display: none; flex: 1; overflow: hidden; }
        .tab-content.active { display: flex; }
        
        /* ==================== MAIN CONTENT LAYOUT ==================== */
        .main-content { display: flex; flex: 1; overflow: hidden; height: calc(100vh - 180px); }
        .main-content.expanded { height: calc(100vh - 120px); }
        
        /* Task List Panel (Left) */
        .task-list-panel { 
          width: 420px; 
          min-width: 420px; 
          background: #f9f9f9; 
          border-right: 1px solid #e0e0e0; 
          display: flex; 
          flex-direction: column; 
        }
        
        .task-list-header { 
          padding: 16px 18px; 
          border-bottom: 1px solid #e0e0e0; 
          background: white; 
        }
        .task-list-header-row { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 12px; 
        }
        .task-list-header h3 { font-size: 18px; font-weight: 700; color: #333; margin: 0; }
        .task-count { font-size: 14px; color: #666; font-weight: 500; }
        
        /* Filter Section */
        .filter-section { 
          padding: 12px 18px; 
          background: #f0f4ff; 
          border-bottom: 1px solid #e0e0e0; 
          display: flex; 
          gap: 12px; 
          align-items: center; 
        }
        .filter-section label { font-size: 14px; font-weight: 700; color: #3b5998; }
        .filter-section select { 
          padding: 8px 12px; 
          border: 2px solid #3b5998; 
          border-radius: 6px; 
          font-size: 14px; 
          background: white;
          font-family: 'Calibri', sans-serif;
          font-weight: 500;
        }
        
        .btn-add-task { 
          padding: 10px 20px; 
          background: #28a745; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 15px; 
          font-weight: 700;
          font-family: 'Calibri', sans-serif;
          transition: all 0.2s;
        }
        .btn-add-task:hover { background: #218838; transform: translateY(-1px); }
        
        /* Task List Scroll */
        .task-list-scroll { flex: 1; overflow-y: auto; padding: 10px; }
        
        /* Task Item */
        .task-item { 
          background: white; 
          border: 1px solid #e0e0e0; 
          border-radius: 8px; 
          padding: 14px 16px; 
          margin-bottom: 10px; 
          cursor: pointer; 
          transition: all 0.2s; 
        }
        .task-item:hover { border-color: #3b5998; box-shadow: 0 3px 12px rgba(59, 89, 152, 0.12); }
        .task-item.active { border-color: #3b5998; border-width: 2px; background: #f0f4ff; }
        .task-item.priority { border-left: 4px solid #f1c40f; }
        .task-item.completed { border-left: 4px solid #28a745; opacity: 0.85; }
        .task-item.inprogress { border-left: 4px solid #3498db; }
        .task-item.new-task { border-left: 4px solid #17a2b8; background: #f0f9ff; }
        
        .task-type { font-size: 12px; font-weight: 700; color: #3b5998; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
        .task-keytask { font-size: 16px; font-weight: 700; color: #333; line-height: 1.4; margin-bottom: 5px; }
        .task-subtask { font-size: 14px; color: #666; font-style: italic; margin-bottom: 8px; }
        .task-meta { display: flex; gap: 12px; font-size: 13px; color: #888; flex-wrap: wrap; align-items: center; }
        .task-meta .deadline-info { color: #e74c3c; font-weight: 700; }
        .task-meta .status-badge { 
          padding: 4px 10px; 
          border-radius: 12px; 
          font-size: 12px; 
          font-weight: 700; 
        }
        .status-completed { background: #d4edda; color: #155724; }
        .status-inprogress { background: #cce5ff; color: #004085; }
        .status-notstarted { background: #f8f9fa; color: #6c757d; }
        
        /* ==================== DETAIL PANEL (Right) ==================== */
        .detail-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white; }
        .detail-empty { 
          flex: 1; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #999; 
          font-size: 17px; 
          flex-direction: column;
          gap: 12px;
        }
        .detail-empty-icon { font-size: 56px; opacity: 0.5; }
        
        .detail-content { flex: 1; display: none; flex-direction: column; overflow: hidden; }
        .detail-content.active { display: flex; }
        
        /* Detail Header */
        .detail-header { 
          padding: 18px 24px; 
          border-bottom: 1px solid #e0e0e0; 
          background: #f9f9f9; 
        }
        .detail-type { font-size: 13px; font-weight: 700; color: #3b5998; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-title { font-size: 20px; font-weight: 700; color: #333; margin-top: 8px; line-height: 1.4; }
        
        /* Sub Task Section (At Top) */
        .subtask-section {
          padding: 14px 24px;
          background: #fff3cd;
          border-bottom: 1px solid #ffeaa7;
        }
        .subtask-label { font-size: 12px; font-weight: 700; color: #856404; text-transform: uppercase; margin-bottom: 6px; }
.subtask-input { 
  font-size: 17px; 
  color: #333; 
  font-weight: 600; 
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  background: #fffef5;
  font-family: 'Calibri', sans-serif;
}
.subtask-input:focus {
  border-color: #f39c12;
  outline: none;
  background: white;
}
        
        /* Info Bar */
        .info-bar { 
          display: flex; 
          gap: 24px; 
          padding: 16px 24px; 
          background: white; 
          border-bottom: 1px solid #e0e0e0; 
          flex-wrap: wrap; 
          align-items: flex-end;
        }
        .info-item { display: flex; flex-direction: column; gap: 6px; }
        .info-item label { font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; }
        .info-item input, .info-item select { 
          padding: 10px 14px; 
          border: 1px solid #ddd; 
          border-radius: 8px; 
          font-size: 16px; 
          font-family: 'Calibri', sans-serif; 
          background: #f9f9f9; 
          min-width: 180px; 
        }
        .info-item input:focus, .info-item select:focus {
          border-color: #3b5998;
          outline: none;
          background: white;
        }
        
        /* Task Result Section */
        .task-result-section { 
          flex: 1; 
          padding: 18px 24px; 
          display: flex; 
          flex-direction: column; 
          overflow: auto; 
        }
        .task-result-header { 
          font-size: 16px; 
          font-weight: 700; 
          color: #3b5998; 
          margin-bottom: 12px; 
          padding: 10px 14px; 
          background: #f0f4ff; 
          border-left: 4px solid #3b5998; 
          border-radius: 0 8px 8px 0; 
        }
        .task-result-textarea { 
          flex: 1;
          width: 100%; 
          padding: 16px 18px; 
          border: 1px solid #ddd; 
          border-radius: 10px; 
          font-size: 17px; 
          font-family: 'Calibri', sans-serif; 
          line-height: 1.7; 
          resize: none;
          min-height: 180px;
          background: #fafafa;
        }
        .task-result-textarea:focus { 
          border-color: #3b5998; 
          outline: none; 
          background: white; 
        }
        
        /* Link Preview */
        .link-preview { 
          margin-top: 12px; 
          padding: 12px; 
          background: #f5f5f5; 
          border-radius: 8px; 
          min-height: 35px; 
        }
        .link-preview:empty::before { 
          content: 'URLs will appear as chip links here...'; 
          color: #999; 
          font-size: 14px; 
        }
        
        /* ==================== ADD TASK FORM ==================== */
        .add-task-form { 
          display: none; 
          background: #e8f5e9; 
          border: 2px solid #a5d6a7; 
          border-radius: 10px; 
          padding: 16px; 
          margin: 12px 10px; 
        }
        .add-task-form.active { display: block; }
        .add-task-form h4 { margin-bottom: 12px; color: #28a745; font-size: 15px; font-weight: 700; }
        .add-task-row { display: flex; gap: 12px; margin-bottom: 12px; }
        .add-task-field { flex: 1; }
        .add-task-field label { display: block; font-size: 13px; font-weight: 700; color: #555; margin-bottom: 5px; }
        .add-task-field input, .add-task-field select { 
          width: 100%; 
          padding: 10px 12px; 
          border: 1px solid #ccc; 
          border-radius: 6px; 
          font-size: 15px; 
          font-family: 'Calibri', sans-serif; 
        }
        .add-task-field input:focus { border-color: #28a745; outline: none; }
        .add-task-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px; }
        
        /* ==================== BUTTONS ==================== */
        .btn { 
          padding: 10px 20px; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 15px; 
          font-family: 'Calibri', sans-serif;
          border: none;
          font-weight: 700;
          transition: all 0.2s;
        }
        .btn-primary { background: #3b5998; color: white; }
        .btn-primary:hover { background: #2d4373; transform: translateY(-1px); }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover { background: #5a6268; }
        .btn-success { background: #28a745; color: white; }
        .btn-success:hover { background: #218838; }
        .btn-cancel { background: white; color: #666; border: 1px solid #ccc; }
        .btn-cancel:hover { background: #f8f9fa; }
        
        /* ==================== FOOTER ACTIONS ==================== */
        .footer-actions { 
          display: flex; 
          gap: 14px; 
          justify-content: space-between; 
          align-items: center;
          padding: 16px 24px; 
          background: #f9f9f9; 
          border-top: 2px solid #e0e0e0; 
        }
        .footer-left { display: flex; align-items: center; gap: 12px; }
        .footer-right { display: flex; gap: 12px; }
        
        .checkbox-option { display: flex; align-items: center; gap: 10px; }
        .checkbox-option input[type="checkbox"] { transform: scale(1.4); cursor: pointer; }
        .checkbox-option label { font-size: 15px; color: #333; cursor: pointer; font-weight: 500; }
        
        /* ==================== LOADING & TOAST ==================== */
        .loading-overlay { 
          display: none; 
          position: fixed; 
          top: 0; left: 0; 
          width: 100%; height: 100%; 
          background: rgba(255,255,255,0.95); 
          z-index: 9999; 
          justify-content: center; 
          align-items: center; 
        }
        .loading-overlay.active { display: flex; }
        .loading-spinner { 
          background: #f9f9f9; 
          padding: 40px 50px; 
          border-radius: 16px; 
          text-align: center; 
          border: 1px solid #e0e0e0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .loading-spinner p { font-size: 16px; font-weight: 600; color: #333; }
        .spinner { 
          border: 5px solid #e0e0e0; 
          border-top: 5px solid #3b5998; 
          border-radius: 50%; 
          width: 50px; height: 50px; 
          animation: spin 1s linear infinite; 
          margin: 0 auto 16px; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .toast { 
          position: fixed; 
          bottom: 24px; right: 24px; 
          padding: 14px 24px; 
          background: #333; 
          color: white; 
          border-radius: 10px; 
          font-size: 15px; 
          z-index: 10000; 
          opacity: 0; 
          transform: translateY(20px); 
          transition: all 0.3s ease;
          max-width: 400px;
        }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast.success { background: #28a745; }
        .toast.error { background: #dc3545; }
        
        /* ==================== SCROLLBAR ==================== */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #f0f0f0; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; }
        ::-webkit-scrollbar-thumb:hover { background: #aaa; }
      </style>
    </head>
    <body>
      <!-- Loading Overlay -->
      <div id="loading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Processing...</p>
        </div>
      </div>
      
      <!-- Toast Notification -->
      <div id="toast" class="toast"></div>
      
      <!-- ==================== STATS TOGGLE BAR ==================== -->
      <div class="stats-toggle-bar" id="statsToggleBar" onclick="toggleStats()">
        <div>
          <h2>📊 Weekly Update - ${_escapeHtml(picName)}</h2>
          <span class="week-info">This Week: ${weekLabel} | Next Week: ${planLabel}</span>
        </div>
        <span class="toggle-icon" id="toggleIcon">▲</span>
      </div>
      
      <!-- ==================== STATISTICS SECTION (Collapsible) ==================== -->
      <div class="stats-section" id="statsSection">
        <div class="statistics">
          <div class="stat-card">
            <div class="stat-label">Tasks This Week</div>
            <div class="stat-value stat-total" id="statTotalTasks">${totalThisWeek}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Completed</div>
            <div class="stat-value stat-completed" id="statCompleted">${completedPercent}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tasks Next Week</div>
            <div class="stat-value stat-nextweek" id="statNextWeek">${totalNextWeek}</div>
          </div>
        </div>
        
        <div class="type-stats-container" id="typeStatsContainer">${typeStatsCardsHtml}</div>
      </div>
      
      <!-- ==================== TABS ==================== -->
      <div class="tabs-container">
        <button class="tab-button active" onclick="showTab('thisWeek')" id="tabThisWeek">📋 Task this Week</button>
        <button class="tab-button" onclick="showTab('nextWeek')" id="tabNextWeek">📅 Plan Next Week</button>
      </div>
      
      <!-- ==================== TAB: THIS WEEK ==================== -->
      <div id="tabContentThisWeek" class="tab-content active">
        <div class="main-content" id="mainContentThisWeek">
          <!-- Task List Panel (Left) -->
          <div class="task-list-panel">
            <div class="task-list-header">
              <div class="task-list-header-row">
                <div>
                  <h3>Tasks</h3>
                  <div class="task-count" id="thisWeekTaskCount">${thisWeekTasks.length} task(s)</div>
                </div>
                <button class="btn-add-task" onclick="toggleAddTaskForm('thisWeek')">➕ Add Task</button>
              </div>
            </div>
            
            <!-- Filter Section -->
            <div class="filter-section">
              <label>📅 Filter by Date:</label>
              <select id="filterByDateThisWeek" onchange="filterTasksByDate('thisWeek')">
                <option value="">All Days</option>
              </select>
            </div>
            
            <!-- Add Task Form - Using Date Input -->
            <div id="addTaskFormThisWeek" class="add-task-form">
              <h4>➕ Add New Task (This Week)</h4>
              <div class="add-task-row">
                <div class="add-task-field">
                  <label>📅 Start Date *</label>
                  <input type="date" id="newStartDateThisWeek" min="${mondayStr}" max="${sundayStr}">
                </div>
              </div>
              <div class="add-task-row">
                <div class="add-task-field">
                  <label>Type Task *</label>
                  <input type="text" id="newTypeThisWeek" list="typeList" placeholder="Select type...">
                </div>
                <div class="add-task-field">
                  <label>Key Task *</label>
                  <input type="text" id="newKeyTaskThisWeek" list="keyTaskList" placeholder="Enter key task...">
                </div>
              </div>
              <div class="add-task-row">
                <div class="add-task-field">
                  <label>Sub Task</label>
                  <input type="text" id="newSubTaskThisWeek" placeholder="Enter sub task...">
                </div>
              </div>
              <div class="add-task-actions">
                <button class="btn btn-cancel" onclick="toggleAddTaskForm('thisWeek')">Cancel</button>
                <button class="btn btn-success" onclick="addNewTask('thisWeek')">Add Task</button>
              </div>
            </div>
            
            <div class="task-list-scroll" id="thisWeekTaskList"></div>
          </div>
          
          <!-- Detail Panel (Right) -->
          <div class="detail-panel">
            <div class="detail-empty" id="thisWeekDetailEmpty">
              <div class="detail-empty-icon">👈</div>
              <div>Select a task from the list to view details</div>
            </div>
            
            <div class="detail-content" id="thisWeekDetailContent">
              <div class="detail-header">
                <div class="detail-type" id="thisWeekDetailType">-</div>
                <div class="detail-title" id="thisWeekDetailTitle">-</div>
              </div>
              
              <!-- Sub Task Section (At Top Right) -->
              <!-- Sub Task Section (At Top Right) - EDITABLE -->
<div class="subtask-section">
  <div class="subtask-label">📌 Sub Task</div>
  <input type="text" class="subtask-input" id="thisWeekDetailSubTask" placeholder="Enter sub task...">
</div>
              
              <div class="info-bar">
                <div class="info-item">
                  <label>📅 Deadline</label>
                  <input type="date" id="thisWeekDetailDeadline">
                </div>
                <div class="info-item">
                  <label>📊 Status</label>
                  <select id="thisWeekDetailStatus">
                    ${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
                  </select>
                </div>
              </div>
              
              <div class="task-result-section">
                <div class="task-result-header">📝 Task Result</div>
                <textarea id="thisWeekDetailTaskResult" class="task-result-textarea" placeholder="Enter task result here..." oninput="updateLinkPreview('thisWeek')"></textarea>
                <div class="link-preview" id="thisWeekLinkPreview"></div>
              </div>
              
              <input type="hidden" id="thisWeekDetailRowNumber">
              <input type="hidden" id="thisWeekDetailTaskIndex">
            </div>
          </div>
        </div>
      </div>
      
      <!-- ==================== TAB: NEXT WEEK ==================== -->
      <div id="tabContentNextWeek" class="tab-content">
        <div class="main-content" id="mainContentNextWeek">
          <!-- Task List Panel (Left) -->
          <div class="task-list-panel">
            <div class="task-list-header">
              <div class="task-list-header-row">
                <div>
                  <h3>Planned Tasks</h3>
                  <div class="task-count" id="nextWeekTaskCount">${nextWeekTasks.length} task(s)</div>
                </div>
                <button class="btn-add-task" onclick="toggleAddTaskForm('nextWeek')">➕ Add Task</button>
              </div>
            </div>
            
            <!-- Filter Section -->
            <div class="filter-section">
              <label>📅 Filter by Date:</label>
              <select id="filterByDateNextWeek" onchange="filterTasksByDate('nextWeek')">
                <option value="">All Days</option>
              </select>
            </div>
            
            <!-- Add Task Form - Using Date Input (RESTRICTED to Next Week only) -->
            <div id="addTaskFormNextWeek" class="add-task-form">
              <h4>➕ Add New Task (Next Week)</h4>
              <div class="add-task-row">
                <div class="add-task-field">
                  <label>📅 Start Date * (Next week only)</label>
                  <input type="date" id="newStartDateNextWeek" min="${nextMondayStr}" max="${nextSundayStr}">
                </div>
              </div>
              <div class="add-task-row">
                <div class="add-task-field">
                  <label>Type Task *</label>
                  <input type="text" id="newTypeNextWeek" list="typeList" placeholder="Select type...">
                </div>
                <div class="add-task-field">
                  <label>Key Task *</label>
                  <input type="text" id="newKeyTaskNextWeek" list="keyTaskList" placeholder="Enter key task...">
                </div>
              </div>
              <div class="add-task-row">
                <div class="add-task-field">
                  <label>Sub Task</label>
                  <input type="text" id="newSubTaskNextWeek" placeholder="Enter sub task...">
                </div>
              </div>
              <div class="add-task-actions">
                <button class="btn btn-cancel" onclick="toggleAddTaskForm('nextWeek')">Cancel</button>
                <button class="btn btn-success" onclick="addNewTask('nextWeek')">Add Task</button>
              </div>
            </div>
            
            <div class="task-list-scroll" id="nextWeekTaskList"></div>
          </div>
          
          <!-- Detail Panel (Right) -->
          <div class="detail-panel">
            <div class="detail-empty" id="nextWeekDetailEmpty">
              <div class="detail-empty-icon">👈</div>
              <div>Select a task from the list to view details</div>
            </div>
            
            <div class="detail-content" id="nextWeekDetailContent">
              <div class="detail-header">
                <div class="detail-type" id="nextWeekDetailType">-</div>
                <div class="detail-title" id="nextWeekDetailTitle">-</div>
              </div>
              
              <!-- Sub Task Section (At Top Right) - EDITABLE -->
<div class="subtask-section">
  <div class="subtask-label">📌 Sub Task</div>
  <input type="text" class="subtask-input" id="nextWeekDetailSubTask" placeholder="Enter sub task...">
</div>
              
              <div class="info-bar">
                <div class="info-item">
                  <label>📅 Deadline</label>
                  <input type="date" id="nextWeekDetailDeadline">
                </div>
                <div class="info-item">
                  <label>📊 Status</label>
                  <select id="nextWeekDetailStatus">
                    ${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
                  </select>
                </div>
              </div>
              
              <div class="task-result-section">
                <div class="task-result-header">📝 Notes / Plan</div>
                <textarea id="nextWeekDetailTaskResult" class="task-result-textarea" placeholder="Enter notes or plan here..."></textarea>
              </div>
              
              <input type="hidden" id="nextWeekDetailRowNumber">
              <input type="hidden" id="nextWeekDetailTaskIndex">
            </div>
          </div>
        </div>
      </div>
      
      <!-- ==================== FOOTER ACTIONS ==================== -->
      <div class="footer-actions">
        <div class="footer-left">
          <div class="checkbox-option">
            <input type="checkbox" id="sendReportCheckbox">
            <label for="sendReportCheckbox">📧 Send Weekly Report Email with PDF</label>
          </div>
        </div>
        <div class="footer-right">
          <button class="btn btn-secondary" onclick="google.script.host.close()">🚪 Close</button>
          <button class="btn btn-primary" onclick="saveAllChanges()">💾 Save Changes</button>
        </div>
      </div>
      
      <!-- Datalists for Autocomplete -->
      <datalist id="typeList">${typeTaskDatalist}</datalist>
      <datalist id="keyTaskList">${keyTaskDatalist}</datalist>
      
      <script>
        // ==================== GLOBAL DATA ====================
        const thisWeekTasks = ${JSON.stringify(thisWeekTasks)};
        const nextWeekTasks = ${JSON.stringify(nextWeekTasks)};
        const picName = '${_escapeHtml(picName)}';
        const statusOptions = ${JSON.stringify(statusOptions)};
        
        const weekBounds = {
          monday: new Date('${monday.toISOString()}'),
          sunday: new Date('${sunday.toISOString()}'),
          nextMonday: new Date('${nextMonday.toISOString()}'),
          nextSunday: new Date('${nextSunday.toISOString()}')
        };
        
        // State management
        let thisWeekFilteredTasks = [...thisWeekTasks];
        let nextWeekFilteredTasks = [...nextWeekTasks];
        let thisWeekSelectedIndex = -1;
        let nextWeekSelectedIndex = -1;
        let modifiedTasksThisWeek = {};
        let modifiedTasksNextWeek = {};
        let newTasksThisWeek = [];
        let newTasksNextWeek = [];
        let statsVisible = true;
        
        // ==================== INITIALIZATION ====================
        document.addEventListener('DOMContentLoaded', function() {
          populateDateFilters();
          renderTaskList('thisWeek');
          renderTaskList('nextWeek');
        });
        
        // ==================== TOGGLE STATS ====================
        function toggleStats() {
          statsVisible = !statsVisible;
          const statsSection = document.getElementById('statsSection');
          const toggleBar = document.getElementById('statsToggleBar');
          const toggleIcon = document.getElementById('toggleIcon');
          const mainContentThisWeek = document.getElementById('mainContentThisWeek');
          const mainContentNextWeek = document.getElementById('mainContentNextWeek');
          
          if (statsVisible) {
            statsSection.classList.remove('collapsed');
            toggleBar.classList.remove('collapsed');
            toggleIcon.textContent = '▲';
            mainContentThisWeek.classList.remove('expanded');
            mainContentNextWeek.classList.remove('expanded');
          } else {
            statsSection.classList.add('collapsed');
            toggleBar.classList.add('collapsed');
            toggleIcon.textContent = '▼';
            mainContentThisWeek.classList.add('expanded');
            mainContentNextWeek.classList.add('expanded');
          }
        }
        
        // ==================== DATE HELPERS ====================
        function formatDateForDisplay(date) {
          if (!date) return '-';
          const d = new Date(date);
          if (isNaN(d.getTime())) return '-';
          return d.getDate().toString().padStart(2, '0') + '/' + 
                 (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
                 d.getFullYear();
        }
        
        function formatDateForInput(date) {
          if (!date) return '';
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return d.getFullYear() + '-' + 
                 (d.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                 d.getDate().toString().padStart(2, '0');
        }
        
        function getWeekDates(startDate, endDate) {
          const dates = [];
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          let current = new Date(startDate);
          
          while (current <= endDate) {
            const dateStr = formatDateForInput(current);
            const dayName = daysOfWeek[current.getDay()];
            const displayDate = current.getDate().toString().padStart(2, '0') + '/' + 
                               (current.getMonth() + 1).toString().padStart(2, '0');
            dates.push({
              value: dateStr,
              label: dayName + ' (' + displayDate + ')'
            });
            current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
          }
          return dates;
        }
        
        function populateDateFilters() {
          // This week filter
          const thisWeekDates = getWeekDates(weekBounds.monday, weekBounds.sunday);
          const filterThisWeek = document.getElementById('filterByDateThisWeek');
          thisWeekDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date.value;
            option.textContent = date.label;
            filterThisWeek.appendChild(option);
          });
          
          // Next week filter
          const nextWeekDates = getWeekDates(weekBounds.nextMonday, weekBounds.nextSunday);
          const filterNextWeek = document.getElementById('filterByDateNextWeek');
          nextWeekDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date.value;
            option.textContent = date.label;
            filterNextWeek.appendChild(option);
          });
        }
        
        // ==================== TAB SWITCHING ====================
        function showTab(tabName) {
          // Save current task before switching
          if (tabName === 'nextWeek' && thisWeekSelectedIndex >= 0) {
            saveCurrentTaskToMemory('thisWeek');
          } else if (tabName === 'thisWeek' && nextWeekSelectedIndex >= 0) {
            saveCurrentTaskToMemory('nextWeek');
          }
          
          // Update tab buttons
          document.getElementById('tabThisWeek').classList.toggle('active', tabName === 'thisWeek');
          document.getElementById('tabNextWeek').classList.toggle('active', tabName === 'nextWeek');
          
          // Update tab content
          document.getElementById('tabContentThisWeek').classList.toggle('active', tabName === 'thisWeek');
          document.getElementById('tabContentNextWeek').classList.toggle('active', tabName === 'nextWeek');
        }
        
        // ==================== TASK LIST RENDERING ====================
        function renderTaskList(week) {
          const tasks = week === 'thisWeek' ? thisWeekFilteredTasks : nextWeekFilteredTasks;
          const container = document.getElementById(week + 'TaskList');
          const countEl = document.getElementById(week + 'TaskCount');
          
          container.innerHTML = '';
          
          if (tasks.length === 0) {
            container.innerHTML = '<div style="padding: 50px; text-align: center; color: #999;"><div style="font-size: 50px; margin-bottom: 15px;">📭</div><div style="font-size: 16px;">No tasks found</div></div>';
            countEl.textContent = '0 task(s)';
            return;
          }
          
          tasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.className = 'task-item';
            item.setAttribute('data-index', index);
            
            // Apply status classes
            if (task.isNew) item.classList.add('new-task');
            else if (task.priority) item.classList.add('priority');
            else if (task.status === 'Completed') item.classList.add('completed');
            else if (task.status && task.status.includes('Progress')) item.classList.add('inprogress');
            
            // Status badge class
            let statusBadgeClass = 'status-notstarted';
            if (task.status === 'Completed') statusBadgeClass = 'status-completed';
            else if (task.status && task.status.includes('Progress')) statusBadgeClass = 'status-inprogress';
            
            // Deadline display
            const deadlineDisplay = task.deadline ? formatDateForDisplay(task.deadline) : '-';
            
            item.innerHTML = \`
              <div class="task-type">\${escapeHtml(task.type || '-')}</div>
              <div class="task-keytask">\${escapeHtml(task.key || task.keyTask || '-')}\${task.isNew ? ' <span style="color:#17a2b8;font-size:12px;font-weight:700;">[NEW]</span>' : ''}</div>
              <div class="task-subtask">\${escapeHtml(task.sub || task.subTask || '')}</div>
              <div class="task-meta">
                <span class="deadline-info">📅 \${deadlineDisplay}</span>
                <span class="status-badge \${statusBadgeClass}">\${escapeHtml(task.status || 'Not Started')}</span>
              </div>
            \`;
            
            item.onclick = () => selectTask(week, index);
            container.appendChild(item);
          });
          
          countEl.textContent = tasks.length + ' task(s)';
        }
        
        // ==================== FILTER BY DATE ====================
        function filterTasksByDate(week) {
          const filterValue = document.getElementById('filterByDate' + capitalizeFirst(week)).value;
          const sourceTasks = week === 'thisWeek' ? thisWeekTasks : nextWeekTasks;
          const newTasks = week === 'thisWeek' ? newTasksThisWeek : newTasksNextWeek;
          
          let filtered;
          if (!filterValue) {
            filtered = [...newTasks, ...sourceTasks];
          } else {
            filtered = [...newTasks.filter(t => t.startDate === filterValue), 
                        ...sourceTasks.filter(t => {
                          if (!t.start) return false;
                          return formatDateForInput(t.start) === filterValue;
                        })];
          }
          
          if (week === 'thisWeek') {
            thisWeekFilteredTasks = filtered;
            thisWeekSelectedIndex = -1;
            document.getElementById('thisWeekDetailContent').classList.remove('active');
            document.getElementById('thisWeekDetailEmpty').style.display = 'flex';
          } else {
            nextWeekFilteredTasks = filtered;
            nextWeekSelectedIndex = -1;
            document.getElementById('nextWeekDetailContent').classList.remove('active');
            document.getElementById('nextWeekDetailEmpty').style.display = 'flex';
          }
          
          renderTaskList(week);
        }
        
        // ==================== SELECT TASK ====================
        function selectTask(week, index) {
          // Save previous task first
          if (week === 'thisWeek' && thisWeekSelectedIndex >= 0) {
            saveCurrentTaskToMemory('thisWeek');
          } else if (week === 'nextWeek' && nextWeekSelectedIndex >= 0) {
            saveCurrentTaskToMemory('nextWeek');
          }
          
          const tasks = week === 'thisWeek' ? thisWeekFilteredTasks : nextWeekFilteredTasks;
          const task = tasks[index];
          
          // Update selected index
          if (week === 'thisWeek') thisWeekSelectedIndex = index;
          else nextWeekSelectedIndex = index;
          
          // Highlight selected item
          const container = document.getElementById(week + 'TaskList');
          container.querySelectorAll('.task-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
          });
          
          // Show detail panel
          document.getElementById(week + 'DetailEmpty').style.display = 'none';
          document.getElementById(week + 'DetailContent').classList.add('active');
          
          // Populate detail fields
document.getElementById(week + 'DetailType').textContent = task.type || '-';
document.getElementById(week + 'DetailTitle').textContent = task.key || task.keyTask || '-';
document.getElementById(week + 'DetailSubTask').value = task.sub || task.subTask || '';
          document.getElementById(week + 'DetailDeadline').value = task.deadline ? formatDateForInput(task.deadline) : '';
          document.getElementById(week + 'DetailStatus').value = task.status || 'Not Started';
          document.getElementById(week + 'DetailTaskResult').value = task.result || task.taskResult || '';
          document.getElementById(week + 'DetailRowNumber').value = task.row || '';
          document.getElementById(week + 'DetailTaskIndex').value = index;
          
          // Update link preview for this week
          if (week === 'thisWeek') {
            updateLinkPreview('thisWeek');
          }
          
          // Load from modified tasks if exists
          const rowNum = task.row;
          const modifiedTasks = week === 'thisWeek' ? modifiedTasksThisWeek : modifiedTasksNextWeek;
          if (rowNum && modifiedTasks[rowNum]) {
            const mod = modifiedTasks[rowNum];
            if (mod.deadline !== undefined) document.getElementById(week + 'DetailDeadline').value = mod.deadline;
            if (mod.status !== undefined) document.getElementById(week + 'DetailStatus').value = mod.status;
            if (mod.taskResult !== undefined) document.getElementById(week + 'DetailTaskResult').value = mod.taskResult;
          }
        }
        
        // ==================== SAVE TASK TO MEMORY ====================
        function saveCurrentTaskToMemory(week) {
          const selectedIndex = week === 'thisWeek' ? thisWeekSelectedIndex : nextWeekSelectedIndex;
          if (selectedIndex < 0) return;
          
          const tasks = week === 'thisWeek' ? thisWeekFilteredTasks : nextWeekFilteredTasks;
          const task = tasks[selectedIndex];
          
          const currentDeadline = document.getElementById(week + 'DetailDeadline').value;
const currentStatus = document.getElementById(week + 'DetailStatus').value;
const currentTaskResult = document.getElementById(week + 'DetailTaskResult').value;
const currentSubTask = document.getElementById(week + 'DetailSubTask').value;
          
          // Update task object for new tasks
          // Update task object for new tasks
if (task.isNew) {
  task.deadline = currentDeadline;
  task.status = currentStatus;
  task.taskResult = currentTaskResult;
  task.result = currentTaskResult;
  task.subTask = currentSubTask;
  task.sub = currentSubTask;
            
            // Update in new tasks array
            const newTasks = week === 'thisWeek' ? newTasksThisWeek : newTasksNextWeek;
            const newTaskIndex = newTasks.findIndex(t => t === task);
            if (newTaskIndex >= 0) {
              newTasks[newTaskIndex] = task;
            }
            return;
          }
          
          const rowNum = task.row;
          if (!rowNum) return;
          
          // Always save to modified tasks
          const modifiedTasks = week === 'thisWeek' ? modifiedTasksThisWeek : modifiedTasksNextWeek;
          modifiedTasks[rowNum] = {
  row: rowNum,
  type: task.type,
  keyTask: task.key || task.keyTask,
  subTask: currentSubTask,  // <-- Lấy từ input thay vì task cũ
  deadline: currentDeadline,
  status: currentStatus,
  taskResult: currentTaskResult,
            startDate: task.start ? formatDateForInput(task.start) : '',
            finishDate: currentStatus === 'Completed' ? formatDateForInput(new Date()) : ''
          };
          
          // Update task in memory
tasks[selectedIndex].deadline = currentDeadline;
tasks[selectedIndex].status = currentStatus;
tasks[selectedIndex].result = currentTaskResult;
tasks[selectedIndex].taskResult = currentTaskResult;
tasks[selectedIndex].sub = currentSubTask;
tasks[selectedIndex].subTask = currentSubTask;
        }
        
        // ==================== ADD NEW TASK ====================
        function toggleAddTaskForm(week) {
          const weekCap = capitalizeFirst(week);
          const form = document.getElementById('addTaskForm' + weekCap);
          form.classList.toggle('active');
          if (form.classList.contains('active')) {
            document.getElementById('newType' + weekCap).focus();
          }
        }
        
        function addNewTask(week) {
          const weekCap = capitalizeFirst(week);
          const startDate = document.getElementById('newStartDate' + weekCap).value;
          const typeTask = document.getElementById('newType' + weekCap).value.trim();
          const keyTask = document.getElementById('newKeyTask' + weekCap).value.trim();
          const subTask = document.getElementById('newSubTask' + weekCap).value.trim();
          
          if (!startDate) { showToast('Please select a start date.', 'error'); return; }
          if (!typeTask) { showToast('Please select a Type Task.', 'error'); return; }
          if (!keyTask) { showToast('Please enter a Key Task.', 'error'); return; }
          
          const newTask = {
            row: null,
            type: typeTask,
            key: keyTask,
            keyTask: keyTask,
            sub: subTask,
            subTask: subTask,
            result: '',
            taskResult: '',
            start: new Date(startDate),
            startDate: startDate,
            deadline: startDate,
            status: 'Not Started',
            priority: false,
            isNew: true
          };
          
          if (week === 'thisWeek') {
            newTasksThisWeek.unshift(newTask);
            thisWeekFilteredTasks.unshift(newTask);
          } else {
            newTasksNextWeek.unshift(newTask);
            nextWeekFilteredTasks.unshift(newTask);
          }
          
          // Clear form
          document.getElementById('newStartDate' + weekCap).value = '';
          document.getElementById('newType' + weekCap).value = '';
          document.getElementById('newKeyTask' + weekCap).value = '';
          document.getElementById('newSubTask' + weekCap).value = '';
          toggleAddTaskForm(week);
          
          renderTaskList(week);
          updateStatistics();
          showToast('✅ Task added! Click "Save Changes" to save.', 'success');
          
          // Select the new task
          selectTask(week, 0);
        }
        
        function capitalizeFirst(str) {
          return str.charAt(0).toUpperCase() + str.slice(1);
        }
        
        // ==================== LINK PREVIEW (CHIP LINKS) ====================
        function updateLinkPreview(week) {
          const textarea = document.getElementById(week + 'DetailTaskResult');
          const preview = document.getElementById(week + 'LinkPreview');
          if (!textarea || !preview) return;
          
          const text = textarea.value;
          const urlPattern = /(https?:\\/\\/[^\\s<>"{}|\\\\\\^\\x60\\[\\]]+)/gi;
          const urls = text.match(urlPattern);
          
          if (urls && urls.length > 0) {
            preview.innerHTML = urls.map(url => {
              let displayUrl = url;
              try {
                const urlObj = new URL(url);
                displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 17) + '...' : urlObj.pathname);
              } catch(e) {}
              return '<a href="' + url + '" target="_blank" class="chip-link">🔗 ' + displayUrl + '</a>';
            }).join(' ');
          } else {
            preview.innerHTML = '';
          }
        }
        
        // ==================== STATISTICS UPDATE ====================
        function updateStatistics() {
          const allThisWeek = [...newTasksThisWeek, ...thisWeekTasks];
          const allNextWeek = [...newTasksNextWeek, ...nextWeekTasks];
          
          const totalThisWeek = allThisWeek.length;
          const completedCount = allThisWeek.filter(t => t.status === 'Completed').length;
          const completedPercent = totalThisWeek > 0 ? Math.round((completedCount / totalThisWeek) * 100) : 0;
          
          document.getElementById('statTotalTasks').textContent = totalThisWeek;
          document.getElementById('statCompleted').textContent = completedPercent + '%';
          document.getElementById('statNextWeek').textContent = allNextWeek.length;
        }
        
        // ==================== VALIDATE BEFORE SEND REPORT ====================
        function validateTaskResults() {
          // Collect all this week tasks including new ones
          const allThisWeek = [...thisWeekTasks];
          const missingResults = [];
          
          // Check original tasks
          allThisWeek.forEach((task, index) => {
            const rowNum = task.row;
            let finalResult = task.result || task.taskResult || '';
            
            // Check if modified
            if (rowNum && modifiedTasksThisWeek[rowNum]) {
              finalResult = modifiedTasksThisWeek[rowNum].taskResult || '';
            }
            
            if (!finalResult || !finalResult.trim()) {
              missingResults.push(task.key || task.keyTask || 'Task at row ' + rowNum);
            }
          });
          
          // Check new tasks
          newTasksThisWeek.forEach((task, index) => {
            const finalResult = task.taskResult || task.result || '';
            if (!finalResult || !finalResult.trim()) {
              missingResults.push(task.key || task.keyTask || 'New Task ' + (index + 1));
            }
          });
          
          return missingResults;
        }
        
        // ==================== SAVE ALL CHANGES ====================
        function saveAllChanges() {
          console.log('saveAllChanges called');
          
          // Save current task first
          if (thisWeekSelectedIndex >= 0) saveCurrentTaskToMemory('thisWeek');
          if (nextWeekSelectedIndex >= 0) saveCurrentTaskToMemory('nextWeek');
          
          const sendReport = document.getElementById('sendReportCheckbox').checked;
          
          // Validate Task Results if sending report
          if (sendReport) {
            const missingResults = validateTaskResults();
            if (missingResults.length > 0) {
              const displayList = missingResults.slice(0, 5).map(t => '• ' + t).join('\\n');
              const moreText = missingResults.length > 5 ? '\\n... and ' + (missingResults.length - 5) + ' more' : '';
              showToast('❌ Please fill Task Result for all tasks before sending report.', 'error');
              alert('Missing Task Result for:\\n' + displayList + moreText);
              return;
            }
          }
          
          // Prepare data for current week updates
          const currentWeekUpdates = Object.values(modifiedTasksThisWeek).map(task => ({
            row: task.row,
            type: task.type,
            keyTask: task.keyTask,
            subTask: task.subTask,
            taskResult: task.taskResult,
            startDate: task.startDate,
            finishDate: task.finishDate || '',
            deadline: task.deadline,
            status: task.status,
            priority: task.priority || false
          }));
          
          // Prepare new tasks for current week
          const currentWeekNewTasks = newTasksThisWeek.map(t => ({
            type: t.type,
            keyTask: t.keyTask || t.key,
            subTask: t.subTask || t.sub,
            taskResult: t.taskResult || t.result || '',
            startDate: t.startDate,
            finishDate: '',
            deadline: t.deadline || t.startDate,
            status: t.status || 'Not Started',
            priority: t.priority || false
          }));
          
          // Prepare data for next week updates
          const nextWeekUpdates = Object.values(modifiedTasksNextWeek).map(task => ({
            row: task.row,
            type: task.type,
            keyTask: task.keyTask,
            subTask: task.subTask,
            taskResult: task.taskResult,
            startDate: task.startDate,
            deadline: task.deadline,
            status: task.status,
            priority: task.priority || false
          }));
          
          // Prepare new tasks for next week
          const nextWeekNewTasks = newTasksNextWeek.map(t => ({
            type: t.type,
            keyTask: t.keyTask || t.key,
            subTask: t.subTask || t.sub,
            taskResult: t.taskResult || t.result || '',
            startDate: t.startDate,
            deadline: t.deadline || t.startDate,
            status: t.status || 'Not Started',
            priority: t.priority || false
          }));
          
          console.log('Current Week Updates:', currentWeekUpdates);
          console.log('Current Week New Tasks:', currentWeekNewTasks);
          console.log('Next Week Updates:', nextWeekUpdates);
          console.log('Next Week New Tasks:', nextWeekNewTasks);
          console.log('Send Report:', sendReport);
          
          // Check if there's anything to save
          const hasChanges = currentWeekUpdates.length > 0 || currentWeekNewTasks.length > 0 || 
                            nextWeekUpdates.length > 0 || nextWeekNewTasks.length > 0;
          
          if (!hasChanges && !sendReport) {
            showToast('No changes to save.', 'error');
            return;
          }
          
          showLoading(true);
          
          // Call backend function
          google.script.run
            .withSuccessHandler(function(result) {
              showLoading(false);
              console.log('Save result:', result);
              
              // Clear modified tracking
              modifiedTasksThisWeek = {};
              modifiedTasksNextWeek = {};
              newTasksThisWeek = [];
              newTasksNextWeek = [];
              
              // Remove isNew flag from tasks
              thisWeekFilteredTasks.forEach(t => delete t.isNew);
              nextWeekFilteredTasks.forEach(t => delete t.isNew);
              
              showToast('✅ ' + result, 'success');
              
              // Close dialog after delay
              setTimeout(() => {
                google.script.host.close();
              }, 2500);
            })
            .withFailureHandler(function(error) {
              showLoading(false);
              console.error('Save error:', error);
              showToast('❌ Error: ' + error.message, 'error');
            })
            .executeUpdateAndReport({
              currentWeekUpdates: currentWeekUpdates,
              currentWeekNewTasks: currentWeekNewTasks,
              nextWeekUpdates: nextWeekUpdates,
              nextWeekNewTasks: nextWeekNewTasks,
              sendReport: sendReport,
              priorityReminders: [],
              rowsToDelete: []
            });
        }
        
        // ==================== UTILITY FUNCTIONS ====================
        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
        
        function showLoading(show) {
          document.getElementById('loading').classList.toggle('active', show);
        }
        
        function showToast(message, type = '') {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.className = 'toast ' + type;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 4000);
        }
      </script>
    </body>
    </html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1450).setHeight(900),
    'Weekly Update & Report - ' + picName
  );
}

/**
 * Helper: Format date to ISO string (YYYY-MM-DD)
 */
function _formatDateISO(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + 
         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getDate()).padStart(2, '0');
}

/**
 * Helper: Escape HTML characters
 */
function _escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * ✅ BUILD CURRENT WEEK TABLE ROWS - ADVANCED VERSION
 * Features:
 * - Autocomplete thông minh cho Type, Key Task, Sub Task
 * - Data source từ Master sheet (tránh conflict với Data Validation)
 * - Auto-fill dates logic
 * - Row color coding based on priority/status
 * - Full keyboard navigation support
 * 
 * @param {Array} tasks - Array of task objects
 * @param {Array} uniqueKeyTasks - Autocomplete options for Key Task (từ Master!L:L)
 * @param {Array} uniqueSubTasks - Autocomplete options for Sub Task
 * @param {Array} uniqueTypes - Autocomplete options for Type (từ Master!D3:D34)
 * @returns {string} HTML table rows
 */
function _buildCurrentWeekTableRowsAdvanced(tasks, uniqueKeyTasks, uniqueSubTasks, uniqueTypes) {
  if (!tasks || tasks.length === 0) {
    return `
      <tr>
        <td colspan="11" style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
          <p>Không có công việc nào trong tuần này</p>
        </td>
      </tr>
    `;
  }
  
  const statusOptions = [
    'Not Started', 
    'In Progress 25%', 
    'In Progress 50%', 
    'In Progress 75%', 
    'Completed'
  ];
  
  return tasks.map(task => {
    const statusSelect = statusOptions.map(option => 
      `<option value="${option}" ${task.status === option ? 'selected' : ''}>${option}</option>`
    ).join('');
    
    return `
      <tr>
        <!-- 1. Row Number -->
        <td class="row-number">${task.row}</td>
        
        <!-- 2. Priority Checkbox -->
        <td class="checkbox-cell">
          <input type="checkbox" 
                 name="priority" 
                 ${task.priority ? 'checked' : ''}
                 onchange="updateRowColors()">
        </td>
        
        <!-- 3. Start Date -->
        <td class="editable-cell date-cell">
          <input type="date" 
                 name="startDate" 
                 value="${task.start ? _formatDateForInput(task.start) : ''}" 
                 onchange="autoFillDates(this, true)">
          <div class="error-message"></div>
        </td>
        
        <!-- 4. Type - ✅ VỚI AUTOCOMPLETE -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="type" 
                   value="${_htmlEsc(task.type || '')}" 
                   data-autocomplete="type"
                   placeholder="Select type..."
                   autocomplete="off">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 5. Key Task - ✅ VỚI AUTOCOMPLETE -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="keyTask" 
                   value="${_htmlEsc(task.key || '')}" 
                   data-autocomplete="keyTask"
                   placeholder="Enter key task..."
                   autocomplete="off">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 6. Sub Task - ✅ VỚI AUTOCOMPLETE -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="subTask" 
                   value="${_htmlEsc(task.sub || '')}" 
                   data-autocomplete="subTask"
                   placeholder="Enter sub task..."
                   autocomplete="off">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 7. Task Result -->
<td class="editable-cell">
  <textarea name="taskResult" 
            rows="2" 
            placeholder="Enter task result...">${_convertBrToNewline(task.result || '')}</textarea>
</td>
        
        <!-- 8. Finish Date -->
        <td class="editable-cell date-cell">
          <input type="date" 
                 name="finishDate" 
                 value="${task.finish ? _formatDateForInput(task.finish) : ''}">
        </td>
        
        <!-- 9. Deadline -->
        <td class="editable-cell date-cell">
          <input type="date" 
                 name="deadline" 
                 value="${task.deadline ? _formatDateForInput(task.deadline) : ''}">
        </td>
        
        <!-- 10. Status -->
        <td class="editable-cell status-cell">
          <select name="status" onchange="updateRowColors()">
            ${statusSelect}
          </select>
        </td>
        
        <!-- 11. Action -->
        <td class="action-cell">
          <button class="btn btn-delete" 
                  onclick="deleteRow(this)">🗑️ Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

function _buildNextWeekTableRowsAdvanced(tasks, uniqueKeyTasks, uniqueSubTasks, uniqueTypes) {
  return tasks.map(task => {
    const statusOptions = ['Not Started', 'In Progress 25%', 'In Progress 50%', 'In Progress 75%', 'Completed'];
    const statusSelect = statusOptions.map(option => 
      `<option value="${option}" ${task.status === option ? 'selected' : ''}>${option}</option>`
    ).join('');
    
    return `
      <tr>
        <!-- 1. Row -->
        <td class="row-number">${task.row}</td>
        
        <!-- 2. Priority - ✅ DI CHUYỂN LÊN VỊ TRÍ 2 -->
        <td class="checkbox-cell">
          <input type="checkbox" 
                 name="priority" 
                 ${task.priority ? 'checked' : ''}
                 onchange="updateRowColors()">
        </td>
        
        <!-- 3. Start Date - ✅ DI CHUYỂN XUỐNG VỊ TRÍ 3 -->
        <td class="editable-cell date-cell">
          <input type="date" 
                 name="startDate" 
                 value="${task.start ? _formatDateForInput(task.start) : ''}" 
                 onchange="autoFillDates(this, false)">
          <div class="error-message"></div>
        </td>
        
        <!-- 4. Type -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="type" 
                   value="${_htmlEsc(task.type || '')}" 
                   data-autocomplete="type"
                   placeholder="Select type...">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 5. Key Task -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="keyTask" 
                   value="${_htmlEsc(task.key || '')}" 
                   data-autocomplete="keyTask"
                   placeholder="Enter key task...">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 6. Sub Task -->
        <td class="editable-cell">
          <div class="autocomplete-container">
            <input type="text" 
                   name="subTask" 
                   value="${_htmlEsc(task.sub || '')}" 
                   data-autocomplete="subTask"
                   placeholder="Enter sub task...">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        
        <!-- 7. Deadline -->
        <td class="editable-cell date-cell">
          <input type="date" 
                 name="deadline" 
                 value="${task.deadline ? _formatDateForInput(task.deadline) : ''}">
        </td>
        
        <!-- 8. Status -->
        <td class="editable-cell status-cell">
          <select name="status" onchange="updateRowColors()">
            ${statusSelect}
          </select>
        </td>
        
        <!-- 9. Thao tác -->
        <td class="action-cell">
          <button class="btn btn-delete" 
                  onclick="deleteRow(this)">🗑️ Xóa</button>
        </td>
      </tr>
    `;
  }).join('');
}

function _buildPriorityTasksList(nextWeekTasks) {
  const priorityTasks = nextWeekTasks.filter(t => t.priority && t.key);
  
  if (priorityTasks.length === 0) {
    return '<p style="text-align: center; color: #666; font-style: italic;">Chưa có việc quan trọng nào</p>';
  }
  
  return priorityTasks.map(task => `
    <div class="priority-task-item">
      <span><strong>Row ${task.row}:</strong> ${_htmlEsc(task.key)}</span>
      <button class="btn btn-priority" onclick="togglePriorityReminder('${task.row}', '${_htmlEsc(task.key)}')">
        🔔 Nhắc việc hàng ngày
      </button>
    </div>
  `).join('');
}/**
 * 🆕 BACKEND FUNCTIONS cho Enhanced Update & Report System
 * Xử lý tất cả logic update, add tasks, send email và priority reminders
 */

/**
 * Main backend function xử lý tất cả updates từ dialog
 * @param {Object} data - Object chứa tất cả data từ dialog
 * @returns {string} Result message
 */
function executeUpdateAndReport(data) {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    const {
      currentWeekUpdates = [],
      currentWeekNewTasks = [],
      nextWeekUpdates = [],
      nextWeekNewTasks = [],
      sendReport = false,
      priorityReminders = [],
      rowsToDelete = [] // 🆕 THÊM DÒNG NÀY
    } = data;
    
    let updateCount = 0;
    let addCount = 0;
    let deleteCount = 0; // 🆕 THÊM BIẾN NÀY
    let resultMessages = [];
    let detailedStats = {
      currentWeekUpdated: 0,
      nextWeekUpdated: 0,
      currentWeekAdded: 0,
      nextWeekAdded: 0,
      rowsDeleted: 0, // 🆕 THÊM DÒNG NÀY
      fieldsChanged: []
    };
    
    // 🆕 0. DELETE ROWS FIRST (trước khi update/add để tránh conflict)
    if (rowsToDelete.length > 0) {
      console.log(`🗑️ Processing ${rowsToDelete.length} rows for deletion`);
      const deleteResult = _deleteRowsFromSheet(rowsToDelete, picName);
      deleteCount = deleteResult.count;
      detailedStats.rowsDeleted = deleteResult.count;
      
      if (deleteResult.count > 0) {
        resultMessages.push(`🗑️ Đã xóa ${deleteResult.count} dòng (rows: ${deleteResult.deletedRows.join(', ')})`);
      }
    }
    
    // 1. UPDATE EXISTING TASKS - Current Week
    if (currentWeekUpdates.length > 0) {
      const updateResult = _processTaskUpdates(currentWeekUpdates, picName);
      updateCount += updateResult.count;
      detailedStats.currentWeekUpdated = updateResult.count;
      detailedStats.fieldsChanged.push(...updateResult.details);
      
      if (updateResult.count > 0) {
        resultMessages.push(`✅ Đã cập nhật ${updateResult.count} công việc tuần này`);
      }
    }
    
    // 2. UPDATE EXISTING TASKS - Next Week  
    if (nextWeekUpdates.length > 0) {
      const updateResult = _processTaskUpdates(nextWeekUpdates, picName);
      updateCount += updateResult.count;
      detailedStats.nextWeekUpdated = updateResult.count;
      detailedStats.fieldsChanged.push(...updateResult.details);
      
      if (updateResult.count > 0) {
        resultMessages.push(`✅ Đã cập nhật ${updateResult.count} kế hoạch tuần tới`);
      }
    }
    
    // 3. ADD NEW TASKS - Current Week
    if (currentWeekNewTasks.length > 0) {
      const addResult = _processNewTasks(currentWeekNewTasks, picName, true);
      addCount += addResult.count;
      detailedStats.currentWeekAdded = addResult.count;
      
      if (addResult.count > 0) {
        resultMessages.push(`✅ Đã thêm ${addResult.count} công việc mới tuần này (rows: ${addResult.addedRows.join(', ')})`);
      }
    }
    
    // 4. ADD NEW TASKS - Next Week
    if (nextWeekNewTasks.length > 0) {
      const addResult = _processNewTasks(nextWeekNewTasks, picName, false);
      addCount += addResult.count;
      detailedStats.nextWeekAdded = addResult.count;
      
      if (addResult.count > 0) {
        resultMessages.push(`✅ Đã thêm ${addResult.count} kế hoạch mới tuần tới (rows: ${addResult.addedRows.join(', ')})`);
      }
    }
    
    // 5. SEND PRIORITY REMINDERS (if selected)
    if (priorityReminders.length > 0) {
      const reminderResult = _sendPriorityRemindersForTasks(priorityReminders, picName);
      if (reminderResult.count > 0) {
        resultMessages.push(`📧 Đã gửi ${reminderResult.count} email nhắc việc quan trọng`);
      }
    }
    
    // 6. SEND WEEKLY REPORT (if checked)
    if (sendReport) {
      try {
        const emailResult = executePICWeeklyReport();
        resultMessages.push(`📧 ${emailResult}`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        resultMessages.push(`⚠️ Lỗi gửi email: ${emailError.message}`);
      }
    }
    
    // 🆕 BUILD DETAILED SUMMARY MESSAGE
    let summaryMessage = '═══════════════════════════════════\n';
    summaryMessage += `✅ TỔNG KẾT CẬP NHẬT - ${picName}\n`;
    summaryMessage += '═══════════════════════════════════\n\n';
    
    // Stats
    const totalChanges = updateCount + addCount;
    if (totalChanges > 0) {
      summaryMessage += `📊 Tổng số thay đổi: ${totalChanges}\n`;
      summaryMessage += `   • Cập nhật: ${updateCount} tasks\n`;
      summaryMessage += `   • Thêm mới: ${addCount} tasks\n\n`;
      
      // Detailed breakdown
      if (detailedStats.currentWeekUpdated > 0) {
        summaryMessage += `📝 Tuần này - Cập nhật: ${detailedStats.currentWeekUpdated} tasks\n`;
      }
      if (detailedStats.currentWeekAdded > 0) {
        summaryMessage += `➕ Tuần này - Thêm mới: ${detailedStats.currentWeekAdded} tasks\n`;
      }
      if (detailedStats.nextWeekUpdated > 0) {
        summaryMessage += `📝 Tuần tới - Cập nhật: ${detailedStats.nextWeekUpdated} tasks\n`;
      }
      if (detailedStats.nextWeekAdded > 0) {
        summaryMessage += `➕ Tuần tới - Thêm mới: ${detailedStats.nextWeekAdded} tasks\n`;
      }
      // 🆕 THÊM DÒNG NÀY
      if (detailedStats.rowsDeleted > 0) {
        summaryMessage += `🗑️ Đã xóa: ${detailedStats.rowsDeleted} dòng\n`;
      }
      
      summaryMessage += '\n';
      
      // Show which fields were changed (first 5 rows)
      if (detailedStats.fieldsChanged.length > 0) {
        summaryMessage += '📋 Chi tiết thay đổi:\n';
        detailedStats.fieldsChanged.slice(0, 5).forEach(change => {
          summaryMessage += `   • Row ${change.row}: ${change.fields.join(', ')}\n`;
        });
        if (detailedStats.fieldsChanged.length > 5) {
          summaryMessage += `   • ... và ${detailedStats.fieldsChanged.length - 5} thay đổi khác\n`;
        }
      }
    } else {
      summaryMessage += '⚠️ Không có thay đổi nào được thực hiện.\n';
    }
    
    // Additional actions
    if (resultMessages.length > 0) {
      summaryMessage += '\n📮 Các hành động khác:\n';
      resultMessages.forEach(msg => {
        summaryMessage += `   ${msg}\n`;
      });
    }
    
    summaryMessage += '\n═══════════════════════════════════';
    
    return summaryMessage;
    
  } catch (error) {
    console.error('Error in executeUpdateAndReport:', error);
    throw new Error(`Failed to update and report: ${error.message}`);
  }
}
/**
 * Process task updates for existing rows
 * @param {Array<Object>} updates - Array of update objects
 * @param {string} picName - PIC name for validation
 * @returns {Object} Result with count
 */
/**
 * ✅ HOÀN CHỈNH: Process task updates for existing rows
 * Lưu TẤT CẢ các fields: Type, Key Task, Sub task, Task Result, Start/Finish/Deadline dates, Status, Priority
 * @param {Array<Object>} updates - Array of update objects
 * @param {string} picName - PIC name for validation
 * @returns {Object} Result with count and details
 */
function _processTaskUpdates(updates, picName) {
  const sh = _sheet();
  let updateCount = 0;
  const updatedFields = []; // Track which fields were updated
  
  updates.forEach(update => {
    try {
      // Validate row belongs to this PIC
      const currentRowPIC = sh.getRange(update.row, CONFIG.COL.PIC_NAME).getValue();
      if (currentRowPIC !== picName) {
        console.warn(`Row ${update.row} does not belong to ${picName}`);
        return;
      }
      
      let fieldsChangedInRow = [];
      
      // 🆕 1. UPDATE TYPE (Cột E)
     // 1. UPDATE TYPE (Cột E) - 🆕 SỬ DỤNG SAFE SET VALUE
if (update.type !== undefined) {
  _safeSetValue(update.row, CONFIG.COL.TYPE, update.type);
  fieldsChangedInRow.push('Type');
}

// 2. UPDATE KEY TASK (Cột F) - 🆕 SỬ DỤNG SAFE SET VALUE
if (update.keyTask !== undefined) {
  _safeSetValue(update.row, CONFIG.COL.KEY, update.keyTask);
  fieldsChangedInRow.push('Key Task');
}
      
      // 3. UPDATE SUB TASK (Cột G)
      if (update.subTask !== undefined) {
        sh.getRange(update.row, CONFIG.COL.SUB).setValue(update.subTask);
        fieldsChangedInRow.push('Sub Task');
      }
      // 4. UPDATE TASK RESULT (Cột H) - 🆕 THÊM ĐOẠN NÀY
      if (update.taskResult !== undefined) {
        sh.getRange(update.row, CONFIG.COL.RESULT).setValue(update.taskResult);
        fieldsChangedInRow.push('Task Result');
      }
      
      
      // 5. UPDATE START DATE (Cột K)
      if (update.startDate !== undefined) {
        if (update.startDate) {
          const startDate = new Date(update.startDate);
          if (!isNaN(startDate.getTime())) {
            sh.getRange(update.row, CONFIG.COL.START)
              .setValue(startDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
            fieldsChangedInRow.push('Start Date');
          }
        } else {
          sh.getRange(update.row, CONFIG.COL.START).clearContent();
        }
      }
      
      // 6. UPDATE FINISH DATE (Cột L)
      if (update.finishDate !== undefined) {
        if (update.finishDate) {
          const finishDate = new Date(update.finishDate);
          if (!isNaN(finishDate.getTime())) {
            sh.getRange(update.row, CONFIG.COL.FINISH)
              .setValue(finishDate)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
            fieldsChangedInRow.push('Finish Date');
          }
        } else {
          sh.getRange(update.row, CONFIG.COL.FINISH).clearContent();
        }
      }
      
      // 7. UPDATE DEADLINE (Cột M)
      if (update.deadline !== undefined) {
        if (update.deadline) {
          const deadline = new Date(update.deadline);
          if (!isNaN(deadline.getTime())) {
            sh.getRange(update.row, CONFIG.COL.DEADLINE)
              .setValue(deadline)
              .setNumberFormat(CONFIG.DATE_FMT_SHEET);
            fieldsChangedInRow.push('Deadline');
          }
        }
      }
      
      // 8. UPDATE STATUS (Cột O)
      if (update.status !== undefined) {
        sh.getRange(update.row, CONFIG.COL.STATUS).setValue(update.status);
        fieldsChangedInRow.push('Status');
      }
      
      // 9. UPDATE PRIORITY (Cột S)
      if (update.priority !== undefined) {
        sh.getRange(update.row, CONFIG.COL.PRIORITY).setValue(update.priority);
        fieldsChangedInRow.push('Priority');
      }
      
      // Track changes
      if (fieldsChangedInRow.length > 0) {
        updateCount++;
        updatedFields.push({
          row: update.row,
          fields: fieldsChangedInRow
        });
      }
      
    } catch (rowError) {
      console.error(`Error updating row ${update.row}:`, rowError);
    }
  });
  
  return {
    count: updateCount,
    details: updatedFields
  };
}

/**
 * Process new tasks to be added
 * @param {Array<Object>} newTasks - Array of new task objects
 * @param {string} picName - PIC name
 * @param {boolean} isCurrentWeek - Whether tasks are for current week
 * @returns {Object} Result with count
 */
/**
 * ✅ HOÀN CHỈNH: Process new tasks and add to empty rows
 * @param {Array<Object>} newTasks - Array of new task objects
 * @param {string} picName - PIC name
 * @param {boolean} isCurrentWeek - Whether tasks are for current week
 * @returns {Object} Result with count and added rows
 */
function _processNewTasks(newTasks, picName, isCurrentWeek) {
  const sh = _sheet();
  let addCount = 0;
  const addedRows = [];
  
  newTasks.forEach((task, index) => {
    try {
      // 🆕 Sử dụng function tìm dòng trống tối ưu
      const targetRow = _findFirstEmptyRowOptimized();
      
      console.log(`Adding task ${index + 1} to row ${targetRow}`);
      
      // 1. SET TYPE (Cột E) - 🆕 SỬ DỤNG SAFE SET VALUE
_safeSetValue(targetRow, CONFIG.COL.TYPE, task.type || '');

// 2. SET KEY TASK (Cột F) - 🆕 SỬ DỤNG SAFE SET VALUE
_safeSetValue(targetRow, CONFIG.COL.KEY, task.keyTask || '');
      
      // 3. SET SUB TASK (Cột G) - BẮT BUỘC
      sh.getRange(targetRow, CONFIG.COL.SUB).setValue(task.subTask || '');
      
      // 4. SET TASK RESULT (Cột H) - Optional
      sh.getRange(targetRow, CONFIG.COL.RESULT).setValue(task.taskResult || '');
      
      // 5. SET PIC NAME (Cột I)
      sh.getRange(targetRow, CONFIG.COL.PIC_NAME).setValue(picName);
      
      // 6. SET START DATE (Cột K)
      if (task.startDate) {
        const startDate = new Date(task.startDate);
        if (!isNaN(startDate.getTime())) {
          sh.getRange(targetRow, CONFIG.COL.START)
            .setValue(startDate)
            .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        }
      }
      
      // 7. SET FINISH DATE (Cột L)
      if (task.finishDate) {
        const finishDate = new Date(task.finishDate);
        if (!isNaN(finishDate.getTime())) {
          sh.getRange(targetRow, CONFIG.COL.FINISH)
            .setValue(finishDate)
            .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        }
      }
      
      // 8. SET DEADLINE (Cột M) - BẮT BUỘC
      if (task.deadline) {
        const deadline = new Date(task.deadline);
        if (!isNaN(deadline.getTime())) {
          sh.getRange(targetRow, CONFIG.COL.DEADLINE)
            .setValue(deadline)
            .setNumberFormat(CONFIG.DATE_FMT_SHEET);
        }
      }
      
      // 9. SET STATUS (Cột O)
      sh.getRange(targetRow, CONFIG.COL.STATUS).setValue(task.status || 'Not Started');
      
      // 10. SET PRIORITY (Cột S)
      sh.getRange(targetRow, CONFIG.COL.PRIORITY).setValue(task.priority || false);
      
      addCount++;
      addedRows.push(targetRow);
      
    } catch (taskError) {
      console.error(`Error adding task ${index + 1}:`, taskError);
    }
  });
  
  console.log(`Successfully added ${addCount}/${newTasks.length} ${isCurrentWeek ? 'current' : 'next'} week tasks to rows: ${addedRows.join(', ')}`);
  
  return { count: addCount, addedRows };
}
/**
 * 🆕 DELETE ROWS FROM SHEET
 * Xóa các dòng được chỉ định khỏi Google Sheet
 * CRITICAL: Xóa từ dưới lên trên để tránh index shift
 * @param {Array<number>} rowNumbers - Array of row numbers to delete
 * @param {string} picName - PIC name for validation
 * @returns {Object} Result with count and deleted rows
 */
function _deleteRowsFromSheet(rowNumbers, picName) {
  if (!rowNumbers || rowNumbers.length === 0) {
    return { count: 0, deletedRows: [] };
  }
  
  const sh = _sheet();
  let deleteCount = 0;
  const deletedRows = [];
  
  // 🔥 CRITICAL: Sort descending để xóa từ dưới lên trên
  // Tránh việc index bị shift khi xóa
  const sortedRows = [...rowNumbers].sort((a, b) => b - a);
  
  console.log('Deleting rows in order:', sortedRows);
  
  sortedRows.forEach(rowNum => {
    try {
      // Validate row belongs to this PIC (security check)
      const currentRowPIC = sh.getRange(rowNum, CONFIG.COL.PIC_NAME).getValue();
      
      if (currentRowPIC !== picName) {
        console.warn(`⚠️ Row ${rowNum} does not belong to ${picName}, skipping deletion`);
        return;
      }
      
      // Validate row is not header/protected row
      if (rowNum < CONFIG.DATA_START_ROW) {
        console.warn(`⚠️ Row ${rowNum} is protected (header row), skipping deletion`);
        return;
      }
      
      // 🗑️ DELETE THE ROW
      sh.deleteRow(rowNum);
      
      deleteCount++;
      deletedRows.push(rowNum);
      console.log(`✅ Deleted row ${rowNum}`);
      
    } catch (rowError) {
      console.error(`❌ Error deleting row ${rowNum}:`, rowError);
    }
  });
  
  return {
    count: deleteCount,
    deletedRows: deletedRows
  };
}
/**
 * Send priority reminders for selected tasks
 * @param {Array<string>} taskRows - Array of row numbers
 * @param {string} picName - PIC name requesting
 * @returns {Object} Result with count
 */
function _sendPriorityRemindersForTasks(taskRows, picName) {
  try {
    const allRows = _fetchAllRows();
    const currentUser = _getCurrentUserEmail();
    let sentCount = 0;
    
    taskRows.forEach(rowNum => {
      try {
        const taskRow = allRows.find(r => r.row === parseInt(rowNum));
        if (!taskRow) {
          console.warn(`Task row ${rowNum} not found`);
          return;
        }
        
        // Validate this is PIC's task
        if (taskRow.picName !== picName) {
          console.warn(`Row ${rowNum} does not belong to ${picName}`);
          return;
        }
        
        // Send priority email for this specific row
        _sendPriorityEmailForRow(taskRow);
        
        // Get PIC and HOD emails for CC
        const picEmail = _resolvePicEmail(taskRow.picName, taskRow.picEmail) || currentUser;
        const hodEmail = taskRow.hodEmail;
        
        console.log(`✅ Sent priority reminder for Row ${rowNum}: ${taskRow.key} to ${picEmail}`);
        sentCount++;
        
      } catch (rowError) {
        console.error(`Error sending priority reminder for row ${rowNum}:`, rowError);
      }
    });
    
    return { count: sentCount };
    
  } catch (error) {
    console.error('Error in _sendPriorityRemindersForTasks:', error);
    return { count: 0 };
  }
}

/**
 * Resolve PIC email from name or direct email
 * @param {string} picName - PIC name
 * @param {string} picEmail - Direct PIC email
 * @returns {string} Resolved email
 */
function _resolvePicEmail(picName, picEmail) {
  // If direct email is provided, use it
  if (picEmail && picEmail.includes('@')) {
    return picEmail;
  }
  
  // Otherwise try to resolve from CONFIG.PIC_LIST
  if (picName && CONFIG.PIC_LIST[picName]) {
    return CONFIG.PIC_LIST[picName];
  }
  
  // Fallback: try to find from all rows
  const allRows = _fetchAllRows();
  const userRow = allRows.find(r => r.picName === picName && r.picEmail);
  
  return userRow ? userRow.picEmail : null;
}

/**
 * Enhanced executePICWeeklyReport with better error handling
 * @returns {string} Result message
 */
/**
 * ✅ ENHANCED: Execute PIC Weekly Report with PDF Attachment
 * Generates weekly report email with PDF file attached
 * PDF filename matches email subject
 * @returns {string} Result message with PDF status
 */
/**
 * ✅ ENHANCED: Execute PIC Weekly Report with PDF Attachment
 * Generates weekly report email with PDF file attached
 * PDF built directly from raw data for reliability
 * @returns {string} Result message with PDF status
 */
function executePICWeeklyReport() {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    if (!picName) {
      throw new Error('Cannot identify PIC name.');
    }
    
    const rows = _fetchAllRows();
    const userRows = rows.filter(r => r.picName === picName);
    
    if (userRows.length === 0) {
      throw new Error(`No tasks found for PIC ${picName}.`);
    }
    
    const { monday, saturday, nextMonday, nextSaturday } = _weekBounds(new Date());
    const thisWeek = _filterWeekRows(userRows, monday, saturday);
    const nextWeek = _filterNextWeekRows(userRows, nextMonday, nextSaturday);
    
    if (thisWeek.length === 0 && nextWeek.length === 0) {
      return 'Không có công việc trong tuần này và tuần tới để báo cáo.';
    }
    
    const weekLabel = `${_formatDate(monday, 'dd/MM')} - ${_formatDate(saturday, 'dd/MM')}`;
    const planLabel = `${_formatDate(nextMonday, 'dd/MM')} - ${_formatDate(nextSaturday, 'dd/MM')}`;
    const fileLink = _getFileLink();
    
    // Calculate metrics
    const totalTask = thisWeek.length;
    const completedRows = thisWeek.filter(r => (r.status || '').toString().trim() === 'Completed');
    const completedCount = completedRows.length;
    
    // Calculate Pending tasks
    const pendingTasks = thisWeek.filter(r => {
      const status = (r.status || '').toString().trim();
      return status === 'Not Started' || 
             status === 'In Progress' ||
             status === 'In Progress 25%' ||
             status === 'In Progress 50%' ||
             status === 'In Progress 75%';
    });
    const pendingCount = pendingTasks.length;
    // ⭐ THÊM MỚI: Calculate Pending Task this month
// ⭐ TÍNH TOÁN: Pending from 01/mm (chỉ lấy In Progress 25/50/75%)
    const firstDayOfMonth = new Date(saturday.getFullYear(), saturday.getMonth(), 1);
    const pendingFromMonth = userRows.filter(r => {
      const status = (r.status || '').toString().trim();
      const isInProgressStatus = status === 'In Progress 25%' || 
                                  status === 'In Progress 50%' || 
                                  status === 'In Progress 75%';
      
      if (!isInProgressStatus) return false;
      
      // Check if Start Date is between first day of month and saturday
      const startDate = r.start ? new Date(r.start) : null;
      return startDate && startDate >= firstDayOfMonth && startDate <= saturday;
    });
    const pendingFromMonthCount = pendingFromMonth.length;
    
    // ⭐ TÍNH TOÁN: Plan Next Week
    const planNextWeekCount = nextWeek.length;
    
    // Calculate Important tasks (giữ lại cho PDF nếu cần)
    const importantTasks = thisWeek.filter(r => !!r.priority);
    const importantCount = importantTasks.length;
    
    // Calculate Completed Rate
    const completedRate = totalTask > 0 ? Math.round((completedCount / totalTask) * 100) : 0;
    
    // Calculate OTCR (On Time Completion Rate)
    const onTimeTasks = thisWeek.filter(r => {
      const behavior = (r.behavior || '').toString().trim().toLowerCase();
      const status = (r.status || '').toString().trim();
      return behavior === 'on time' && status === 'Completed';
    });
    const otcr = completedCount > 0 ? Math.round((onTimeTasks.length / completedCount) * 100) : 0;
    
    // ⭐ Lấy tháng hiện tại cho label "Pending from 01/mm"
    const currentMonth = Utilities.formatDate(saturday, 'GMT+7', 'MM');
    
    // Package totals for reuse
    const totals = {
      totalTask,
      completedCount,
      pendingCount,
      pendingFromMonthCount,
      planNextWeekCount,
      importantCount,
      completedRate,
      otcr,
      currentMonth
    };
    
    // ⭐ QUÉT CHIP LINKS CHỈ CHO CÁC TASKS CẦN THIẾT
    console.log('🔍 Scanning chip links for report tasks...');
    _enrichTasksWithChipLinks(thisWeek);
    _enrichTasksWithChipLinks(pendingTasks);
    console.log('✅ Chip links enriched');
    
    // Build email content
    const subject = `${picName}_Weekly Report * ${weekLabel} _Plan week ${planLabel}`;
    
    const emailBody = _buildAdvancedWeeklyEmailHTML({
      pic: picName,
      weekLabel,
      planLabel,
      fileLink,
      totals: totals,
      thisWeekTasks: thisWeek,
      pendingTasks: pendingTasks,
      nextWeekTasks: nextWeek
    });
    
    // Get recipient emails
    const allReportRows = thisWeek.concat(nextWeek);
    const toEmails = _dedupeEmails(allReportRows.map(r => r.hodEmail).filter(Boolean));
    const ccEmails = _dedupeEmails(allReportRows.map(r => r.ccEmail).filter(Boolean));
    
    // Add PIC email to CC
    ccEmails.push(currentUser);
    
    if (toEmails.length === 0) {
      throw new Error('Không tìm thấy email HOD trong dữ liệu công việc.');
    }
    
    // ========================================================================
    // ✅ GENERATE PDF FROM RAW DATA (more reliable than parsing HTML)
    // ========================================================================
    let pdfAttachment = null;
    let pdfGenerationError = null;
    
    try {
      console.log('🔄 Generating PDF from raw data...');
      const pdfStartTime = Date.now();
      
      // Call NEW function with raw data
      pdfAttachment = _generateWeeklyReportPDF(
  picName,
  weekLabel,
  planLabel,
  totals,
  thisWeek,
  pendingTasks,
  nextWeek,
  subject,
  fileLink  // ← THÊM DÒNG NÀY
);
      
      const pdfDuration = Date.now() - pdfStartTime;
      
      if (pdfAttachment && pdfAttachment.getBytes().length > 1000) {
        const pdfSizeKB = Math.round(pdfAttachment.getBytes().length / 1024);
        console.log(`✅ PDF generated in ${pdfDuration}ms`);
        console.log(`📎 ${pdfAttachment.getName()}, Size: ${pdfSizeKB} KB`);
      } else {
        console.warn('⚠️ PDF too small or empty');
        pdfAttachment = null;
      }
      
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError.message);
      console.error('Stack:', pdfError.stack);
      pdfGenerationError = pdfError.message;
      pdfAttachment = null;
    }
    
    // ========================================================================
    // SEND EMAIL WITH PDF
    // ========================================================================
    const attachments = pdfAttachment ? [pdfAttachment] : [];
    
    _sendMail({
      toList: toEmails,
      ccList: ccEmails,
      subject: subject,
      htmlBody: emailBody,
      attachments: attachments
    });
    
    // ========================================================================
    // BUILD RESULT MESSAGE
    // ========================================================================
    let resultMessage = `✅ Đã gửi báo cáo thành công tới ${toEmails.length} HOD email`;
    resultMessage += `\n📧 TO: ${toEmails.join(', ')}`;
    resultMessage += `\n📋 CC: ${ccEmails.join(', ')}`;
    
    if (pdfAttachment) {
      resultMessage += `\n\n📎 PDF đính kèm: ${pdfAttachment.getName()}`;
      resultMessage += `\n📊 Kích thước: ${Math.round(pdfAttachment.getBytes().length / 1024)} KB`;
    } else if (pdfGenerationError) {
      resultMessage += `\n\n⚠️ PDF không được tạo: ${pdfGenerationError}`;
      resultMessage += `\n📧 Nội dung đầy đủ có trong email HTML`;
    }
    
    return resultMessage;
    
  } catch (error) {
    console.error('❌ Error in executePICWeeklyReport:', error);
    console.error('Stack:', error.stack);
    throw new Error(`Failed to send weekly report: ${error.message}`);
  }
}
/**
 * Extract chip links from Task Result column for specific tasks
 * @param {Array} tasks - Array of task objects with row property
 * @returns {void} - Modifies tasks array in place
 */
/**
 * Extract chip links và full rich text từ Task Result column
 * @param {Array} tasks - Array of task objects with row property
 * @returns {void} - Modifies tasks array in place
 */
/**
 * Extract chip links và build HTML từ rich text runs
 * @param {Array} tasks - Array of task objects with row property
 * @returns {void} - Modifies tasks array in place
 */
function _enrichTasksWithChipLinks(tasks) {
  if (!tasks || tasks.length === 0) return;
  
  const sheet = _sheet();
  const resultCol = CONFIG.COL.RESULT;
  
  tasks.forEach(task => {
    if (!task.row) return;
    
    try {
      const richText = sheet.getRange(task.row, resultCol).getRichTextValue();
      
      if (!richText) {
        task.resultHTML = null; // Không có rich text
        return;
      }
      
      const runs = richText.getRuns();
      let htmlParts = [];
      
      // ⭐ BUILD HTML TỪ TỪNG RUN
      runs.forEach(run => {
        const url = run.getLinkUrl();
        const text = run.getText();
        
        if (!text) return;
        
        if (url) {
          // ⭐ CÓ LINK → Tạo <a> tag
          const escapedText = _htmlEsc(text);
          htmlParts.push(`<a href="${url}" target="_blank" style="color:#0066cc; text-decoration:underline; font-weight:500;">${escapedText}</a>`);
        } else {
          // ⭐ KHÔNG CÓ LINK → Plain text
          htmlParts.push(_htmlEsc(text));
        }
      });
      
      // ⭐ Nối tất cả parts thành HTML
      task.resultHTML = htmlParts.join('');
      
    } catch (error) {
      console.error(`Error extracting chip links for row ${task.row}:`, error);
      task.resultHTML = null;
    }
  });
}
/**
 * Build advanced HTML email for weekly report
 * @param {Object} params - Email parameters
 * @returns {string} HTML content
 */
/**
 * 🆕 ENHANCED: Build advanced HTML email for weekly report
 * Updated with new header, metrics, and improved table layouts
 * @param {Object} params - Email parameters
 * @returns {string} HTML content
 */
/**
 * ✅ ENHANCED: Build advanced HTML email for weekly report  
 * Updated with NEW DESIGN matching the image:
 * - Blue gradient header (#4299E1 → #2B6CB0)
 * - Improved metrics boxes with distinct colors
 * - Better typography and spacing
 * - Performance metrics section
 */
/**
 * ✅ OUTLOOK-COMPATIBLE: Build advanced HTML email for weekly report  
 * Fixed issues:
 * 1. Header text visible in Outlook (table-based, no gradient fallback)
 * 2. 6 Performance metrics (Total, Completed, In Progress, Priority, Completed Rate, OTCR)
 * 3. Footer visible in Outlook (table-based layout)
 */
/**
 * 🎯 TÓM TẮT THAY ĐỔI
 * ===================
 * Sửa lại function _buildAdvancedWeeklyEmailHTML với thiết kế đơn giản, chuyên nghiệp:
 * 
 * THAY ĐỔI CHÍNH:
 * ✅ Font: Calibri 11pt (thay vì Arial)
 * ✅ Màu sắc: CHỈ đen trắng (bỏ tất cả màu xanh, vàng, đỏ, xanh lá)
 * ✅ Heading: 14pt Bold màu đen (thay vì 18pt màu xanh)
 * ✅ Bỏ background màu trong metrics boxes
 * ✅ Bỏ màu trong table headers (chỉ dùng border đen)
 * ✅ Bỏ highlight rows (priority, completed)
 * ✅ Header/Footer: nền trắng, chữ đen
 */

/**
 * ✅ SIMPLIFIED: Build simple, professional HTML email for weekly report
 * Design principles:
 * - Font: Calibri 11pt
 * - Colors: Black text only
 * - Headings: 14pt Bold
 * - No colored backgrounds
 * - No highlights
 * - Professional black & white design
 * 
 * @param {Object} params - Email parameters
 * @param {string} params.pic - PIC name
 * @param {string} params.weekLabel - Week label
 * @param {string} params.planLabel - Plan label
 * @param {string} params.fileLink - Link to sheet
 * @param {Object} params.totals - Statistics object
 * @param {Array} params.thisWeekTasks - This week tasks
 * @param {Array} params.pendingTasks - Pending tasks
 * @param {Array} params.nextWeekTasks - Next week tasks
 * @returns {string} HTML content
 */
function _buildAdvancedWeeklyEmailHTML({pic, weekLabel, planLabel, fileLink, totals, thisWeekTasks, pendingTasks, nextWeekTasks}) {
  const currentDate = _formatDate(new Date(), 'dd/MM/yyyy HH:mm');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style>
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
  <style>
    body { 
      font-family: Calibri, Arial, sans-serif; 
      font-size: 11pt;
      color: #000000;
      margin: 0; 
      padding: 0; 
      background-color: #ffffff;
      line-height: 1.6;
    }
    
    table { 
      border-collapse: collapse; 
      mso-table-lspace: 0pt; 
      mso-table-rspace: 0pt; 
    }
    
    /* Section titles - 14pt Bold */
    .section-title { 
      color: #000000; 
      font-size: 14pt; 
      font-weight: bold; 
      padding: 8px 0;
      margin: 20px 0 10px 0;
    }
    
    /* Task tables */
    .task-table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 11pt; 
      margin-bottom: 20px; 
    }
    
    .task-table th { 
      background-color: #ffffff;
      color: #000000; 
      padding: 10px 8px; 
      text-align: left; 
      font-weight: bold;
      border: 1px solid #000000;
    }
    
    .task-table td { 
      border: 1px solid #000000; 
      padding: 8px; 
      background-color: #ffffff;
      color: #000000;
    }
  </style>
</head>
<body style="margin:0; padding:20px; background-color:#ffffff; font-family:Calibri, Arial, sans-serif; font-size:11pt; color:#000000;">
  
  <!-- Greeting -->
  <p style="margin:0 0 10px 0; font-size:11pt; color:#000000;">
    <strong>Dear Tuyen san,</strong>
  </p>
  
  <!-- Introduction -->
  <p style="margin:0 0 10px 0; font-size:11pt; color:#000000; line-height:1.6;">
    I would like to submit my working report for the week of <strong>${weekLabel}</strong> and my work plan for the upcoming week <strong>${planLabel}</strong>.
  </p>
  
  <!-- Statistic Overview -->
  <p style="margin:25px 0 15px 0; font-size:14pt; color:#000000; font-weight:bold; font-family:Calibri, Arial, sans-serif;">
    Statistics Overview
  </p>
  
  <!-- Summary Info - Total Task & Completion Rate -->
  <div style="margin:0 0 20px 0; padding:15px; background:#f9f9f9; border-left:4px solid #3b5998;">
    <div style="margin:0 0 8px 0; font-size:11pt; color:#000000;">
      <span style="color:#6c757d;">Total Tasks:</span> 
      <strong style="color:#3b5998; font-size:13pt;">${totals.totalTask || 0}</strong>
    </div>
    <div style="margin:0; font-size:11pt; color:#000000;">
      <span style="color:#6c757d;">Completion Rate:</span> 
      <strong style="color:#dc3545; font-size:13pt;">${totals.completedRate || 0}%</strong>
    </div>
  </div>
  
  <!-- CARD BOX LAYOUT - 4 cards (nền xám full, cùng kích thước) -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px 0; table-layout:fixed;">
    <tr>
      <!-- Card 1: Completed -->
      <td style="padding:0 10px 0 0; width:25%; vertical-align:top;">
        <div style="background:#f9f9f9; border:1px solid #dee2e6; border-radius:8px; padding:35px 20px; text-align:center; height:130px; display:block;">
          <div style="font-size:36pt; font-weight:bold; color:#3b5998; margin:0 0 15px 0; line-height:1;">
            ${totals.completedCount || 0}
          </div>
          <div style="font-size:10pt; color:#000000; line-height:1.3; font-family:Calibri, Arial, sans-serif;">
            Completed
          </div>
        </div>
      </td>
      
      <!-- Card 2: In Progress -->
      <td style="padding:0 10px; width:25%; vertical-align:top;">
        <div style="background:#f9f9f9; border:1px solid #dee2e6; border-radius:8px; padding:35px 20px; text-align:center; height:130px; display:block;">
          <div style="font-size:36pt; font-weight:bold; color:#3b5998; margin:0 0 15px 0; line-height:1;">
            ${totals.pendingCount || 0}
          </div>
          <div style="font-size:10pt; color:#000000; line-height:1.3; font-family:Calibri, Arial, sans-serif;">
            In Progress
          </div>
        </div>
      </td>
      
      <!-- Card 3: Plan Next Week -->
      <td style="padding:0 10px; width:25%; vertical-align:top;">
        <div style="background:#f9f9f9; border:1px solid #dee2e6; border-radius:8px; padding:35px 20px; text-align:center; height:130px; display:block;">
          <div style="font-size:36pt; font-weight:bold; color:#3b5998; margin:0 0 15px 0; line-height:1;">
            ${totals.planNextWeekCount || 0}
          </div>
          <div style="font-size:10pt; color:#000000; line-height:1.3; font-family:Calibri, Arial, sans-serif;">
            Plan Next Week
          </div>
        </div>
      </td>
      
      <!-- Card 4: Pending from 01/mm -->
      <td style="padding:0 0 0 10px; width:25%; vertical-align:top;">
        <div style="background:#f9f9f9; border:1px solid #dee2e6; border-radius:8px; padding:35px 20px; text-align:center; height:130px; display:block;">
          <div style="font-size:36pt; font-weight:bold; color:#3b5998; margin:0 0 15px 0; line-height:1;">
            ${totals.pendingFromMonthCount || 0}
          </div>
          <div style="font-size:10pt; color:#000000; line-height:1.3; font-family:Calibri, Arial, sans-serif;">
            Pending from 01/${totals.currentMonth}
          </div>
        </div>
      </td>
    </tr>
  </table>
  
  <!-- Completed Tasks Section -->
  <div class="section-title">Completed Tasks This Week</div>
  ${_buildSimpleTaskTableV2(
    thisWeekTasks.filter(t => (t.status || '').toString().trim() === 'Completed'),
    true,
    'completed'
  )}
  
  <!-- Pending Tasks Section -->
  <div class="section-title">Pending Tasks</div>
  ${_buildSimpleTaskTableV2(pendingTasks || [], false, 'pending')}
  
  <!-- Next Week Plan Section -->
  <div class="section-title">Next Week Plan (${planLabel})</div>
  ${_buildSimpleTaskTableV2(nextWeekTasks || [], false, 'plan')}
  
  <!-- Link to Sheet -->
  ${fileLink ? `
  <p style="margin:30px 0 20px 0; text-align:center;">
    <a href="${_htmlEsc(fileLink)}" style="display:inline-block; background-color:#ffffff; color:#000000; padding:10px 20px; text-decoration:none; border:2px solid #000000; font-weight:bold; font-size:11pt; font-family:Calibri, Arial, sans-serif;">
      View Full Sheet
    </a>
  </p>
  ` : ''}
  
  <!-- Footer -->
  <div style="margin-top:40px; padding-top:20px; border-top:1px solid #000000; text-align:center; font-size:10pt; color:#666666;">
    <p style="margin:0;">Auto-generated by Marketing Task Management System</p>
    <p style="margin:5px 0 0 0;">PIC: ${_htmlEsc(pic)} | Generated: ${currentDate}</p>
  </div>
  
</body>
</html>
  `;
}

/**
 * ✅ NEW HELPER: Build simple task table without colors
 * Replacement for _buildOutlookCompatibleTaskTable
 * 
 * @param {Array} tasks - Tasks array
 * @param {boolean} includeFinish - Include finish column
 * @param {string} type - Table type (completed/pending/plan)
 * @returns {string} HTML table
 */
function _buildSimpleTaskTableV2(tasks, includeFinish, type) {
  if (!tasks || tasks.length === 0) {
    return `
      <p style="padding:20px; text-align:center; color:#666666; font-style:italic; font-family:Calibri, Arial, sans-serif; font-size:11pt;">
        No tasks available for this section
      </p>
    `;
  }
  
  // Build header - THAY "#" → "Row"
  // Build header - CHUẨN HÓA: 3 bảng cùng kích thước
  let headerCells = '';
  if (type === 'completed') {
    headerCells = `
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:60px; font-family:Calibri, Arial, sans-serif;">Row</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:50px; font-family:Calibri, Arial, sans-serif;">Priority</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:80px; font-family:Calibri, Arial, sans-serif;">Start</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:160px; font-family:Calibri, Arial, sans-serif;">Key Task</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:180px; font-family:Calibri, Arial, sans-serif;">Sub Task</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:400px; font-family:Calibri, Arial, sans-serif;">Task Result / Update</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:80px; font-family:Calibri, Arial, sans-serif;">Finish</th>
    `;
  } else if (type === 'pending') {
    headerCells = `
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:60px; font-family:Calibri, Arial, sans-serif;">Row</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:50px; font-family:Calibri, Arial, sans-serif;">Priority</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:80px; font-family:Calibri, Arial, sans-serif;">Start</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:160px; font-family:Calibri, Arial, sans-serif;">Key Task</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:180px; font-family:Calibri, Arial, sans-serif;">Sub Task</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:400px; font-family:Calibri, Arial, sans-serif;">Task Result / Update</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:80px; font-family:Calibri, Arial, sans-serif;">Status</th>
    `;
  } else { // plan
    headerCells = `
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:60px; font-family:Calibri, Arial, sans-serif;">Row</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:50px; font-family:Calibri, Arial, sans-serif;">Priority</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:80px; font-family:Calibri, Arial, sans-serif;">Start</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:160px; font-family:Calibri, Arial, sans-serif;">Key Task</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:180px; font-family:Calibri, Arial, sans-serif;">Sub Task</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; border:1px solid #000000; width:400px; font-family:Calibri, Arial, sans-serif;">Task Result / Update</th>
      <th style="background-color:#f0f0f0; color:#000000; padding:10px 8px; text-align:center; border:1px solid #000000; width:80px; font-family:Calibri, Arial, sans-serif;">Status</th>
    `;
  }
  
  // Build rows - CHUẨN HÓA: 3 bảng cùng cấu trúc
  const rowsHTML = tasks.map((task, index) => {
    const priorityIcon = task.priority ? '⭐' : '';
    const actualRowNumber = task.row || (index + 1);
    
    let cells = '';
    
    if (type === 'completed') {
      // ✅ COMPLETED: Row, Priority, Start, Key Task, Sub Task, Task Result/Update, Finish
      cells = `
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${actualRowNumber}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${priorityIcon}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_fmtDateCell(task.start)}</td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;"><strong>${_htmlEsc(task.key || 'N/A')}</strong></td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_htmlEsc(task.sub || 'N/A')}</td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt; vertical-align:top; white-space:pre-wrap; word-wrap:break-word;">${_formatTaskResultWithLinks(task.result, task.resultHTML)}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_fmtDateCell(task.finish)}</td>
      `;
    } else if (type === 'pending') {
      // ✅ PENDING: Row, Priority, Start, Key Task, Sub Task, Task Result/Update, Status
      const status = (task.status || '').toString().trim();
      
      cells = `
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${actualRowNumber}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${priorityIcon}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_fmtDateCell(task.start)}</td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;"><strong>${_htmlEsc(task.key || 'N/A')}</strong></td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_htmlEsc(task.sub || 'N/A')}</td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt; vertical-align:top; white-space:pre-wrap; word-wrap:break-word;">${_formatTaskResultWithLinks(task.result, task.resultHTML)}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_htmlEsc(status || 'N/A')}</td>
      `;
    } else { // plan
      // ✅ PLAN: Row, Priority, Start, Key Task, Sub Task, Task Result/Update, Status
      cells = `
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${actualRowNumber}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${priorityIcon}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_fmtDateCell(task.start)}</td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;"><strong>${_htmlEsc(task.key || 'N/A')}</strong></td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_htmlEsc(task.sub || 'N/A')}</td>
        <td style="border:1px solid #000000; padding:8px; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt; vertical-align:top; white-space:pre-wrap; word-wrap:break-word;">${_formatTaskResultWithLinks(task.result, task.resultHTML)}</td>
        <td style="border:1px solid #000000; padding:8px; text-align:center; background-color:#ffffff; color:#000000; font-family:Calibri, Arial, sans-serif; font-size:11pt;">${_htmlEsc(task.status || 'Planned')}</td>
      `;
    }
    
    return `<tr>${cells}</tr>`;
  }).join('');
  
  return `
    <table class="task-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="1010" style="border-collapse:collapse; table-layout:fixed; margin-bottom:20px; border:1px solid #000000;">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
}
// ============================================================================
// HƯỚNG DẪN SỬ DỤNG
// ============================================================================
/*
📍 BƯỚC 1: MỞ FILE CODE CỦA BẠN
   - Mở Google Apps Script Editor
   - Tìm file "Giang Test" hoặc file chứa code của bạn

📍 BƯỚC 2: TÌM VÀ THAY THẾ FUNCTION
   Location: Dòng 12378 đến dòng 12643
   
   ⚠️ LƯU Ý: 
   - Bạn cũng cần thêm helper function _buildSimpleTaskTable (xem bên dưới)
   - Function này thay thế cho _buildOutlookCompatibleTaskTable

📍 BƯỚC 3: THÊM HELPER FUNCTION MỚI
   - Thêm function _buildSimpleTaskTable vào file của bạn
   - Function này nằm trong file này (dòng 270-420)
   
   Vị trí đề xuất: Đặt ngay sau function _buildAdvancedWeeklyEmailHTML
   (tức là sau dòng 12643)

📍 BƯỚC 4: KIỂM TRA
   - Save code
   - Chạy function gửi email thử
   - Kiểm tra email nhận được có đúng format không

✅ KẾT QUẢ MONG ĐỢI:
   - Email hiển thị với font Calibri 11pt
   - Tất cả text màu đen
   - Heading 14pt Bold
   - Không có màu sắc nào khác ngoài đen trắng
   - Table có border đen rõ ràng
   - Không có background màu trong cells

❌ NẾU GẶP VẤN ĐỀ:
   1. "ReferenceError: _buildSimpleTaskTable is not defined"
      → Bạn chưa thêm helper function _buildSimpleTaskTable
      
   2. Email vẫn có màu
      → Kiểm tra lại xem đã thay thế đúng function chưa
      → Clear cache trình duyệt email
      
   3. Font không đổi sang Calibri
      → Email client có thể không hỗ trợ Calibri
      → Sẽ fallback sang Arial (vẫn ok)

💡 TIP: 
   Nếu muốn thay đổi thêm (ví dụ: size khác, border khác),
   chỉ cần tìm và sửa các giá trị trong style inline.
*/
/**
 * 🆕 Build Completed Tasks section with metrics
 * @param {Array} completedTasks - Array of completed tasks
 * @param {number} completedRate - Completion rate percentage
 * @param {number} otcr - On-time completion rate percentage
 * @returns {string} HTML for completed tasks section
 */
/**
 * ✅ Build Completed Tasks section with enhanced metrics
 * @param {Array} completedTasks - Array of completed tasks
 * @param {number} completedRate - Completion rate percentage
 * @param {number} otcr - On-time completion rate percentage
 * @returns {string} HTML for completed tasks section
 */
function _buildCompletedTasksSection(completedTasks, completedRate, otcr) {
  if (!completedTasks || completedTasks.length === 0) {
    return '<div class="no-data">No completed tasks this week</div>';
  }
  
  // ✅ NEW METRICS DISPLAY with 2-column grid
  const metricsHTML = `
    <div class="metrics">
      <div class="metrics-title">
        <span style="font-size: 20px;">📊</span>
        <span>Performance Metrics</span>
      </div>
      <div class="metrics-grid">
        <div class="metric-item" style="border-left: 3px solid #27AE60;">
          <div class="metric-label">Completed Rate</div>
          <div class="metric-value" style="color: #27AE60;">${completedRate}%</div>
        </div>
        <div class="metric-item" style="border-left: 3px solid #4A90E2;">
          <div class="metric-label">OTCR (On-Time Completion)</div>
          <div class="metric-value" style="color: #4A90E2;">${otcr}%</div>
        </div>
      </div>
    </div>
  `;
  
  // Build table rows
  const rowsHTML = completedTasks.map((task, index) => {
    const priorityIcon = task.priority ? '⭐' : '';
    const rowClass = task.priority ? 'priority-row' : 'completed-row';
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 40px; font-weight: 600;">${index + 1}</td>
        <td style="text-align: center; width: 50px;">${priorityIcon}</td>
        <td style="width: 180px;"><strong>${_htmlEsc(task.key || 'N/A')}</strong></td>
        <td style="width: 200px;">${_htmlEsc(task.sub || 'N/A')}</td>
        <td style="width: 220px;">${_htmlEsc(task.result || 'N/A')}</td>
        <td style="text-align: center; width: 70px;">${_fmtDateCell(task.start)}</td>
        <td style="text-align: center; width: 70px;">${_fmtDateCell(task.finish)}</td>
        <td style="text-align: center; width: 70px; color: #dc3545; font-weight: 600;">${_fmtDateCell(task.deadline)}</td>
      </tr>
    `;
  }).join('');
  
  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th style="width: 50px;">⭐</th>
          <th style="width: 180px;">Key Task</th>
          <th style="width: 200px;">Sub Task</th>
          <th style="width: 220px;">Task Result</th>
          <th style="width: 70px;">Start</th>
          <th style="width: 70px;">Finish</th>
          <th style="width: 70px;">Deadline</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
  
  return metricsHTML + tableHTML;
}
/**
 * Build advanced task table for email
 * @param {Array} tasks - Task array
 * @param {boolean} includeResult - Whether to include task result column
 * @returns {string} HTML table
 */
function _buildAdvancedTaskTable(tasks, includeResult = true) {
  if (!tasks || tasks.length === 0) {
    return `<p style="text-align: center; color: #7f8c8d; font-style: italic; margin: 20px 0;">No tasks available for this section</p>`;
  }
  
  const headers = includeResult ? 
    ['Row', 'Priority', 'Key Task', 'Sub Task', 'Task Result', 'Start', 'Deadline', 'Status'] :
    ['Row', 'Priority', 'Key Task', 'Sub Task', 'Start', 'Deadline', 'Status'];
  
  const headerHtml = headers.map(h => 
    `<th style="background: #34495e; color: white; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600;">${h}</th>`
  ).join('');
  
  const rowsHtml = tasks.map(task => {
    const priority = task.priority ? '⭐' : '';
    const rowClass = task.priority ? 'background: #fff9c4;' : '';
    
    const cells = [
      `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; ${rowClass}">${task.row}</td>`,
      `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; ${rowClass}">${priority}</td>`,
      `<td style="border: 1px solid #ddd; padding: 8px; ${rowClass}">${_htmlEsc(task.key || '')}</td>`,
      `<td style="border: 1px solid #ddd; padding: 8px; ${rowClass}">${_htmlEsc(task.sub || '')}</td>`
    ];
    
    if (includeResult) {
      cells.push(`<td style="border: 1px solid #ddd; padding: 8px; ${rowClass}">${_htmlEsc(task.result || '')}</td>`);
    }
    
    cells.push(
      `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; ${rowClass}">${task.start ? _formatDate(task.start, 'dd/MM') : '-'}</td>`,
      `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; ${rowClass}">${task.deadline ? _formatDate(task.deadline, 'dd/MM') : '-'}</td>`,
      `<td style="border: 1px solid #ddd; padding: 8px; ${rowClass}">${_htmlEsc(task.status || 'Not Started')}</td>`
    );
    
    return `<tr>${cells.join('')}</tr>`;
  }).join('');
  
  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}/**
 * 🆕 HELPER FUNCTIONS cho Enhanced Update & Report System
 * Các functions hỗ trợ cần thiết cho hệ thống mới
 */

/**
 * Enhanced _weekBounds với timezone support
 * @param {Date} date - Reference date
 * @returns {Object} Week boundaries
 */
function _weekBounds(date) {
  const d = new Date(date);
  
  // Set to Vietnam timezone
  d.setHours(d.getHours() + 7); // UTC+7
  
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  
  const nextSaturday = new Date(saturday);
  nextSaturday.setDate(saturday.getDate() + 7);
  
  return { monday, saturday, nextMonday, nextSaturday };
}

/**
 * Enhanced _filterWeekRows với better date handling
 * @param {Array} rows - All rows
 * @param {Date} monday - Week start
 * @param {Date} saturday - Week end
 * @returns {Array} Filtered rows
 */
function _filterWeekRows(rows, monday, saturday) {
  return rows.filter(row => {
    if (!row.start) return false;
    
    const startDate = _toDate(row.start);
    if (!startDate) return false;
    
    // Set timezone for comparison
    const compareDate = new Date(startDate);
    compareDate.setHours(compareDate.getHours() + 7); // UTC+7
    
    return compareDate >= monday && compareDate <= saturday;
  });
}

/**
 * Enhanced _filterNextWeekRows với better date handling
 * @param {Array} rows - All rows
 * @param {Date} nextMonday - Next week start
 * @param {Date} nextSaturday - Next week end
 * @returns {Array} Filtered rows
 */
function _filterNextWeekRows(rows, nextMonday, nextSaturday) {
  return rows.filter(row => {
    if (!row.start) return false;
    
    const startDate = _toDate(row.start);
    if (!startDate) return false;
    
    // Set timezone for comparison
    const compareDate = new Date(startDate);
    compareDate.setHours(compareDate.getHours() + 7); // UTC+7
    
    return compareDate >= nextMonday && compareDate <= nextSaturday;
  });
}

/**
 * Enhanced _formatDate với multiple format support
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format string
 * @returns {string} Formatted date
 */
function _formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  
  let d;
  if (date instanceof Date) {
    d = new Date(date);
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else if (typeof date === 'number') {
    // Handle Excel serial dates
    d = new Date(Math.round((date - 25569) * 86400 * 1000));
  } else {
    return '';
  }
  
  if (isNaN(d.getTime())) return '';
  
  // Add timezone offset for Vietnam
  d.setHours(d.getHours() + 7); // UTC+7
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'dd/MM':
      return `${day}/${month}`;
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'dd/MM/yy':
      return `${day}/${month}/${String(year).slice(-2)}`;
    case 'dd-MM-yyyy':
      return `${day}-${month}-${year}`;
    case 'dd/MM/yyyy HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Enhanced _formatDateForInput cho HTML date inputs
 * @param {Date|string|number} date - Date to format
 * @returns {string} YYYY-MM-DD format
 */
/**
 * ✅ FIXED: Enhanced _formatDateForInput cho HTML date inputs
 * Không cộng thêm timezone offset để tránh date bị lệch
 * @param {Date|string|number} date - Date to format
 * @returns {string} YYYY-MM-DD format
 */
function _formatDateForInput(date) {
  if (!date) return '';
  
  try {
    let d;
    if (date instanceof Date) {
      d = new Date(date);
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else if (typeof date === 'number') {
      // Handle Excel serial dates
      d = new Date(Math.round((date - 25569) * 86400 * 1000));
    } else {
      return '';
    }
    
    if (isNaN(d.getTime())) return '';
    
    // ✅ FIX: Sử dụng getUTCFullYear/getUTCMonth/getUTCDate 
    // để lấy date components mà không bị ảnh hưởng bởi timezone
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for HTML input:', error);
    return '';
  }
}

/**
 * Enhanced _htmlEsc với better string handling
 * @param {*} str - String to escape
 * @returns {string} Escaped string
 */
function _htmlEsc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
}

/**
 * Enhanced _dedupeEmails với better validation
 * @param {Array} arr - Array of email strings
 * @returns {Array} Deduplicated email array
 */
function _dedupeEmails(arr) {
  const seen = new Set();
  const result = [];
  
  (arr || []).forEach(emailStr => {
    if (!emailStr) return;
    
    // Split by common separators
    String(emailStr).split(/[;,\s]+/).forEach(email => {
      const trimmed = email.trim().toLowerCase();
      
      // Enhanced email validation
      if (trimmed && 
          /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed) && 
          !seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    });
  });
  
  return result;
}

/**
 * Enhanced _sendMail với better error handling
 * @param {Object} params - Email parameters
 */
/**
 * Enhanced _sendMail với attachment support
 * @param {Object} params - Email parameters
 * @param {Array|string} params.toList - Recipients
 * @param {Array|string} params.ccList - CC recipients
 * @param {string} params.subject - Email subject
 * @param {string} params.htmlBody - HTML body content
 * @param {Array<Blob>} params.attachments - Optional PDF attachments
 */
function _sendMail({toList, ccList, subject, htmlBody, attachments}){
  const {to, cc} = _ensureRecipientsOrThrow(toList, ccList);
  
  const emailConfig = {
    to: to,
    cc: cc,
    subject: subject,
    htmlBody: htmlBody,
    name: 'Marketing Task System'
  };
  
  // Add attachments if provided
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    emailConfig.attachments = attachments;
  }
  
  mmhMail_(emailConfig);
  
  console.log(`✅ Email sent to: ${to}${cc ? `, CC: ${cc}` : ''}`);
}

/**
 * Enhanced _getFileLink với fallback
 * @returns {string} File URL
 */
function _getFileLink() {
  try {
    const sh = _sheet();
    const fileLink = sh.getRange(CONFIG.COL.FILE_LINK_ROW, CONFIG.COL.FILE_LINK_COL).getValue();
    
    if (fileLink && typeof fileLink === 'string' && fileLink.startsWith('http')) {
      return fileLink;
    }
    
    // Fallback to current spreadsheet URL
    return SpreadsheetApp.getActive().getUrl();
    
  } catch (error) {
    console.error('Error getting file link:', error);
    return SpreadsheetApp.getActive().getUrl();
  }
}

/**
 * Enhanced _toDate với better parsing
 * @param {*} v - Value to convert to date
 * @returns {Date|null} Parsed date or null
 */
function _toDate(v) {
  try {
    if (v instanceof Date) {
      return isNaN(v.getTime()) ? null : v;
    }
    
    if (typeof v === 'number' && v > 1) {
      // Excel serial date
      const date = new Date(Math.round((v - 25569) * 86400 * 1000));
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof v === 'string' && v.trim()) {
      // Try different formats
      const formats = [
        // ISO format
        /^\d{4}-\d{2}-\d{2}$/,
        // DD/MM/YYYY format
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        // DD-MM-YYYY format
        /^\d{1,2}-\d{1,2}-\d{4}$/
      ];
      
      const str = v.trim();
      
      // Try ISO format first
      if (formats[0].test(str)) {
        const date = new Date(str);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Try DD/MM/YYYY format
      if (formats[1].test(str)) {
        const parts = str.split('/');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Try DD-MM-YYYY format
      if (formats[2].test(str)) {
        const parts = str.split('-');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
      }
      
      // Fallback to native Date parsing
      const date = new Date(str);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Enhanced _sheet function với error handling
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The worksheet
 */
function _sheet() {
  try {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
    }
    
    return sheet;
    
  } catch (error) {
    console.error('Error getting sheet:', error);
    throw new Error(`Cannot access sheet: ${error.message}`);
  }
}

/**
 * Enhanced _getUi function với error handling
 * @returns {GoogleAppsScript.Base.Ui} The UI object
 */
function _getUi() {
  try {
    return SpreadsheetApp.getUi();
  } catch (error) {
    console.error('Error getting UI:', error);
    throw new Error('Cannot access UI');
  }
}

/**
 * Get current user's cached role for performance
 * @param {string} userEmail - User email
 * @returns {string|null} User role
 */
function _getCachedUserRole(userEmail) {
  try {
    // Try cache first
    const cache = CacheService.getScriptCache();
    const cacheKey = `user_role_${userEmail}`;
    const cachedRole = cache.get(cacheKey);
    
    if (cachedRole) {
      return cachedRole;
    }
    
    // Get fresh role
    const role = _getUserRole(userEmail);
    
    // Cache for 30 minutes
    if (role) {
      cache.put(cacheKey, role, 1800);
    }
    
    return role;
    
  } catch (error) {
    console.error('Error getting cached user role:', error);
    // Fallback to direct role lookup
    return _getUserRole(userEmail);
  }
}

/**
 * Validate user has required permissions
 * @param {string} userEmail - User email
 * @param {Array<string>} requiredRoles - Required roles
 * @returns {boolean} Has permission
 */
/**
 * ✅ UPDATED: Validate user has required permissions (MULTI-ROLE SUPPORT)
 * @param {string} userEmail - User email
 * @param {Array<string>} requiredRoles - Required roles (user needs at least one)
 * @returns {boolean} Has permission
 */
function _hasPermission(userEmail, requiredRoles = []) {
  // ✅ SỬ DỤNG HELPER MỚI thay vì _getCachedUserRole()
  return _checkUserHasAnyRole(userEmail, requiredRoles);
}

/**
 * Enhanced error logging
 * @param {string} functionName - Function name
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
function _logError(functionName, error, context = {}) {
  const errorInfo = {
    function: functionName,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    user: _getCurrentUserEmail(),
    context: context
  };
  
  console.error('🔥 ERROR:', JSON.stringify(errorInfo, null, 2));
  
  // Could also save to a log sheet or external service
}

/**
 * Safe function execution wrapper
 * @param {Function} fn - Function to execute
 * @param {string} functionName - Function name for logging
 * @param {*} defaultReturn - Default return value on error
 * @returns {*} Function result or default
 */
function _safeExecute(fn, functionName, defaultReturn = null) {
  try {
    return fn();
  } catch (error) {
    _logError(functionName, error);
    return defaultReturn;
  }
}

/**
 * Test function để verify tất cả functions hoạt động
 */
function testUpdateAndReportSystem() {
  try {
    const currentUser = _getCurrentUserEmail();
    const picName = _getUserPICName(currentUser);
    
    console.log('🧪 Testing Update & Report System...');
    console.log(`Current User: ${currentUser}`);
    console.log(`PIC Name: ${picName}`);
    
    // Test week bounds
    const weekBounds = _weekBounds(new Date());
    console.log('Week Bounds:', weekBounds);
    
    // Test format functions
    const testDate = new Date();
    console.log('Format Date Tests:');
    console.log(`dd/MM: ${_formatDate(testDate, 'dd/MM')}`);
    console.log(`dd/MM/yyyy: ${_formatDate(testDate, 'dd/MM/yyyy')}`);
    console.log(`Input format: ${_formatDateForInput(testDate)}`);
    
    // Test email validation
    const testEmails = ['test@example.com', 'invalid-email', 'user2@domain.com'];
    const cleanEmails = _dedupeEmails(testEmails);
    console.log('Email deduplication:', cleanEmails);
    
    _getUi().alert('✅ Update & Report System test completed successfully!\n\nCheck console for detailed logs.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    _getUi().alert(`❌ Test failed: ${error.message}`);
  }
}/**
 * 🆕 Lấy danh sách Type từ Master sheet
 * @returns {Array<string>} Mảng các Type options
 */
function _getTypeOptionsFromMaster() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) {
      console.warn('Master sheet not found');
      return [];
    }
    
    // Lấy data từ Master!$D$3:$D$34
    const typeRange = masterSheet.getRange('D3:D34');
    const typeValues = typeRange.getValues()
      .flat()
      .filter(v => v && String(v).trim() !== '');
    
    // Remove duplicates và sort
    return [...new Set(typeValues)].sort();
  } catch (error) {
    console.error('Error getting Type options:', error);
    return [];
  }
}/**
 * 🆕 Build Pending Tasks section
 * Shows tasks with status: Not Started, In Progress, In Progress 25/50/75%
 * @param {Array} pendingTasks - Array of pending tasks
 * @returns {string} HTML for pending tasks section
 */
/**
 * ✅ Build Pending Tasks section
 */
function _buildPendingTasksSection(pendingTasks) {
  if (!pendingTasks || pendingTasks.length === 0) {
    return '<div class="no-data">No pending tasks</div>';
  }
  
  const rowsHTML = pendingTasks.map((task, index) => {
    const priorityIcon = task.priority ? '⭐' : '';
    const rowClass = task.priority ? 'priority-row' : '';
    
    // Color-code status
    let statusColor = '#6c757d'; // default gray
    const status = (task.status || '').toString().trim();
    if (status.includes('25%')) statusColor = '#dc3545'; // red
    else if (status.includes('50%')) statusColor = '#fd7e14'; // orange
    else if (status.includes('75%')) statusColor = '#28a745'; // green
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 40px; font-weight: 600;">${index + 1}</td>
        <td style="text-align: center; width: 50px;">${priorityIcon}</td>
        <td style="width: 180px;"><strong>${_htmlEsc(task.key || 'N/A')}</strong></td>
        <td style="width: 200px;">${_htmlEsc(task.sub || 'N/A')}</td>
        <td style="width: 220px;">${_htmlEsc(task.result || 'N/A')}</td>
        <td style="text-align: center; width: 70px;">${_fmtDateCell(task.start)}</td>
        <td style="text-align: center; width: 90px; color: ${statusColor}; font-weight: 600;">${_htmlEsc(status)}</td>
        <td style="text-align: center; width: 70px; color: #dc3545; font-weight: 600;">${_fmtDateCell(task.deadline)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th style="width: 50px;">⭐</th>
          <th style="width: 180px;">Key Task</th>
          <th style="width: 200px;">Sub Task</th>
          <th style="width: 220px;">Task Result</th>
          <th style="width: 70px;">Start</th>
          <th style="width: 90px;">Status</th>
          <th style="width: 70px;">Deadline</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
}

/**
 * ✅ Build Next Week Plan section
 */
function _buildNextWeekPlanSection(nextWeekTasks) {
  if (!nextWeekTasks || nextWeekTasks.length === 0) {
    return '<div class="no-data">No tasks planned for next week</div>';
  }
  
  const rowsHTML = nextWeekTasks.map((task, index) => {
    const priorityIcon = task.priority ? '⭐' : '';
    const rowClass = task.priority ? 'priority-row' : '';
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 40px; font-weight: 600;">${index + 1}</td>
        <td style="text-align: center; width: 50px;">${priorityIcon}</td>
        <td style="width: 200px;"><strong>${_htmlEsc(task.key || 'N/A')}</strong></td>
        <td style="width: 220px;">${_htmlEsc(task.sub || 'N/A')}</td>
        <td style="text-align: center; width: 70px;">${_fmtDateCell(task.start)}</td>
        <td style="text-align: center; width: 70px; color: #dc3545; font-weight: 600;">${_fmtDateCell(task.deadline)}</td>
        <td style="text-align: center; width: 90px;">${_htmlEsc(task.status || 'Planned')}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th style="width: 50px;">⭐</th>
          <th style="width: 200px;">Key Task</th>
          <th style="width: 220px;">Sub Task</th>
          <th style="width: 70px;">Start</th>
          <th style="width: 70px;">Deadline</th>
          <th style="width: 90px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>
  `;
}/**
 * ✅ Build Outlook-compatible task table
 * @param {Array} tasks - Task array
 * @param {boolean} includeFinish - Include finish date column
 * @param {string} type - Table type: 'completed', 'pending', 'plan'
 * @returns {string} HTML table
 */
/**
 * ✅ NEW: Generate PDF from HTML content for Weekly Report
 * Creates a Google Doc, converts to PDF, then cleans up
 * @param {string} htmlContent - HTML content from _buildAdvancedWeeklyEmailHTML
 * @param {string} subject - Email subject (used as PDF filename)
 * @returns {Blob} PDF blob ready for email attachment
 */
/**
 * ✅ REWRITTEN: Generate Weekly Report PDF directly from raw data
 * More reliable than parsing HTML - builds PDF structure manually
 * @param {string} picName - PIC name
 * @param {string} weekLabel - Current week label (dd/MM - dd/MM)
 * @param {string} planLabel - Next week label (dd/MM - dd/MM)
 * @param {Object} totals - Statistics object
 * @param {Array} thisWeekTasks - This week tasks array
 * @param {Array} pendingTasks - Pending tasks array
 * @param {Array} nextWeekTasks - Next week tasks array
 * @param {string} subject - Email subject (for filename)
 * @returns {Blob} PDF blob
 */
/**
 * ✅ ENHANCED v2: Generate Beautiful Weekly Report PDF
 * Improved layout matching the reference images
 * @param {string} picName - PIC name
 * @param {string} weekLabel - Current week label
 * @param {string} planLabel - Next week label
 * @param {Object} totals - Statistics object
 * @param {Array} thisWeekTasks - This week tasks
 * @param {Array} pendingTasks - Pending tasks
 * @param {Array} nextWeekTasks - Next week tasks
 * @param {string} subject - Email subject
 * @returns {Blob} PDF blob
 */
/**
 * ✅ REWRITTEN: Generate Weekly Report PDF with HTML-to-PDF approach
 * Style: Same as Monthly PDF (Calibri 9pt, clean black/white)
 * Content: Based on _buildAdvancedWeeklyEmailHTML
 * 
 * @param {string} picName - PIC name
 * @param {string} weekLabel - Current week label (dd/MM - dd/MM)
 * @param {string} planLabel - Next week label (dd/MM - dd/MM)
 * @param {Object} totals - Statistics object
 * @param {Array} thisWeekTasks - This week tasks array
 * @param {Array} pendingTasks - Pending tasks array
 * @param {Array} nextWeekTasks - Next week tasks array
 * @param {string} subject - Email subject (used for filename)
 * @param {string} fileLink - Sheet URL for footer link
 * @returns {Blob} PDF blob
 */
function _generateWeeklyReportPDF(picName, weekLabel, planLabel, totals, thisWeekTasks, pendingTasks, nextWeekTasks, subject, fileLink) {
  try {
    console.log('🎯 Generating Weekly Report PDF...');
    
    // Parse dates from weekLabel and planLabel
    const currentYear = new Date().getFullYear();
    const reportDates = _parseWeekLabel(weekLabel, currentYear);
    const planDates = _parseWeekLabel(planLabel, currentYear);
    
    // Filter completed tasks
    const completedTasks = thisWeekTasks.filter(t => 
      (t.status || '').toString().trim() === 'Completed'
    );
    
    // Helper: Format result with line breaks and preserve formatting
    function formatResultWithLineBreaks(resultText, resultHTML) {
      if (!resultText || resultText.trim() === '') {
        return '<em style="color: #999;">No data</em>';
      }
      
      // If we have HTML with links, use it
      if (resultHTML && resultHTML.trim() !== '') {
        return resultHTML
          .replace(/\r\n/g, '<br>')
          .replace(/\n/g, '<br>')
          .replace(/\r/g, '<br>');
      }
      
      // Otherwise format plain text
      const formattedText = String(resultText)
        .replace(/\r\n/g, '<br>')
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '<br>');
      
      return formattedText;
    }
    
    // Build HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 9pt;
            color: black;
            line-height: 1.4;
            margin: 15px;
          }
          
          h1 {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          h2 {
            font-size: 11pt;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 10px;
          }
          
          h3 {
            font-size: 10pt;
            font-weight: bold;
            margin-top: 12px;
            margin-bottom: 6px;
          }
          
          hr {
            border: none;
            border-top: 1px solid #ddd;
            margin: 10px 0;
          }
          
          .header-info {
            font-size: 9pt;
            line-height: 1.6;
            margin-bottom: 10px;
          }
          
          .header-info p {
            margin: 2px 0;
          }
          
          /* SUMMARY STATS */
          .summary-container {
            display: table;
            width: 100%;
            margin-bottom: 15px;
          }
          
          .summary-box {
            display: inline-block;
            padding: 10px 20px;
            margin-right: 15px;
            border-radius: 4px;
            border-left: 4px solid;
            vertical-align: top;
          }
          
          .summary-box-total {
            background-color: #f0f4f8;
            border-left-color: #2c5aa0;
          }
          
          .summary-box-completion-high {
            background-color: #e8f5e9;
            border-left-color: #4caf50;
          }
          
          .summary-box-completion-medium {
            background-color: #fff8e1;
            border-left-color: #ffc107;
          }
          
          .summary-box-completion-low {
            background-color: #ffebee;
            border-left-color: #f44336;
          }
          
          .summary-label {
            font-size: 9pt;
            color: #666;
            display: inline;
          }
          
          .summary-number {
            font-size: 16pt;
            font-weight: bold;
            display: inline;
            margin-left: 8px;
          }
          
          .summary-number-total {
            color: #2c5aa0;
          }
          
          .summary-number-high {
            color: #2e7d32;
          }
          
          .summary-number-medium {
            color: #f57c00;
          }
          
          .summary-number-low {
            color: #c62828;
          }
          
          /* CARD BOXES - 4 cards in 1 row */
          .card-container {
            display: table;
            width: 100%;
            border-collapse: separate;
            border-spacing: 6px;
            margin-bottom: 15px;
          }
          
          .card-row {
            display: table-row;
          }
          
          .card-box {
            display: table-cell;
            width: 25%;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px 12px;
            text-align: center;
            background-color: #f9f9f9;
            vertical-align: middle;
          }
          
          .card-number {
            font-size: 24pt;
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 6px;
          }
          
          .card-label {
            font-size: 8pt;
            color: #333;
            line-height: 1.3;
          }
          
          /* TABLES - 4 columns only */
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            table-layout: fixed;
          }
          
          table.data-table th,
          table.data-table td {
            border: 1px solid #ddd;
            padding: 5px 6px;
            font-size: 8pt;
            line-height: 1.5;
            vertical-align: top;
          }
          
          table.data-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            font-size: 8pt;
            text-align: center;
          }
          
          /* COLUMN WIDTHS - 4 columns */
          table.data-table th:nth-child(1),
          table.data-table td:nth-child(1) {
            width: 40px;
            text-align: center;
          }
          
          table.data-table th:nth-child(2),
          table.data-table td:nth-child(2) {
            width: 140px;
          }
          
          table.data-table th:nth-child(3),
          table.data-table td:nth-child(3) {
            width: 160px;
          }
          
          table.data-table th:nth-child(4),
          table.data-table td:nth-child(4) {
            width: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          
          .footer {
            font-size: 8pt;
            color: #666;
            text-align: center;
            margin-top: 15px;
          }
          
          .footer a {
            color: #2c5aa0;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <h1>Weekly Report</h1>
        <div class="header-info">
          <p><strong>PIC:</strong> ${picName}</p>
          <p><strong>Report:</strong> from ${reportDates.from} to ${reportDates.to}</p>
          <p><strong>Plan:</strong> from ${planDates.from} to ${planDates.to}</p>
        </div>
        
        <hr>
        
        <!-- Statistics Overview -->
<h2>Statistics Overview</h2>

<!-- Summary Stats - Total Tasks & Completion Rate -->
<div class="summary-container">
  <div class="summary-box summary-box-total">
    <span class="summary-label">Total Tasks:</span>
    <span class="summary-number summary-number-total">${totals.totalTask || 0}</span>
  </div>
  
  <div class="summary-box ${totals.completedRate >= 80 ? 'summary-box-completion-high' : totals.completedRate >= 50 ? 'summary-box-completion-medium' : 'summary-box-completion-low'}">
    <span class="summary-label">Completion Rate:</span>
    <span class="summary-number ${totals.completedRate >= 80 ? 'summary-number-high' : totals.completedRate >= 50 ? 'summary-number-medium' : 'summary-number-low'}">${totals.completedRate || 0}%</span>
  </div>
</div>

<!-- 4 Card Boxes -->
<div class="card-container">
  <div class="card-row">
    <div class="card-box">
      <div class="card-number">${totals.completedCount || 0}</div>
      <div class="card-label">Completed</div>
    </div>
    
    <div class="card-box">
      <div class="card-number">${totals.pendingCount || 0}</div>
      <div class="card-label">In Progress</div>
    </div>
    
    <div class="card-box">
      <div class="card-number">${totals.planNextWeekCount || 0}</div>
      <div class="card-label">Plan Next Week</div>
    </div>
    
    <div class="card-box">
      <div class="card-number">${totals.pendingFromMonthCount || 0}</div>
      <div class="card-label">Pending from 01/${totals.currentMonth || ''}</div>
    </div>
  </div>
</div>
        
        <hr>
        
        <!-- Completed Tasks Section -->
        ${_buildPDFTaskSection('Completed Tasks This Week', completedTasks, formatResultWithLineBreaks)}
        
        <!-- Pending Tasks Section -->
        ${_buildPDFTaskSection('Pending Tasks', pendingTasks, formatResultWithLineBreaks)}
        
        <!-- Plan Next Week Section -->
        ${_buildPDFTaskSection('Plan Next Week (' + planLabel + ')', nextWeekTasks, formatResultWithLineBreaks)}
        
        <!-- Footer -->
        <hr>
        <p class="footer">
          ${fileLink ? '<a href="' + fileLink + '">View detail</a> | ' : ''}Marketing Task Management System | Generated on ${new Date().toLocaleDateString('en-GB')}
        </p>
      </body>
      </html>
    `;
    
    // Convert HTML to PDF
    const blob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html');
    const sanitizedName = subject
      .replace(/[*_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
    const pdf = blob.getAs('application/pdf').setName(sanitizedName + '.pdf');
    
    console.log('✅ Weekly PDF generated:', sanitizedName + '.pdf');
    return pdf;
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

/**
 * Helper: Parse week label to get from/to dates
 * @param {string} weekLabel - Format: "dd/MM - dd/MM"
 * @param {number} year - Year
 * @returns {Object} {from: "dd/mm/yyyy", to: "dd/mm/yyyy"}
 */
function _parseWeekLabel(weekLabel, year) {
  try {
    const parts = weekLabel.split(' - ');
    if (parts.length !== 2) {
      return { from: weekLabel, to: weekLabel };
    }
    
    const from = parts[0].trim() + '/' + year;
    const to = parts[1].trim() + '/' + year;
    
    return { from, to };
  } catch (e) {
    return { from: weekLabel, to: weekLabel };
  }
}

/**
 * Helper: Build PDF task section with 4 columns
 * @param {string} title - Section title
 * @param {Array} tasks - Tasks array
 * @param {Function} formatResultFunc - Function to format result text
 * @returns {string} HTML string
 */
function _buildPDFTaskSection(title, tasks, formatResultFunc) {
  if (!tasks || tasks.length === 0) {
    return `
      <h3>${title}</h3>
      <p style="font-style: italic; color: #666; font-size: 8pt;">No data available</p>
    `;
  }
  
  const tableRows = tasks.map(task => {
    const formattedResult = formatResultFunc(task.result, task.resultHTML);
    const actualRowNumber = task.row || '';
    
    return `
    <tr>
      <td>${actualRowNumber}</td>
      <td><strong>${task.key || 'N/A'}</strong></td>
      <td>${task.sub || 'N/A'}</td>
      <td>${formattedResult}</td>
    </tr>
  `;
  }).join('');
  
  return `
    <h3>${title}</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Row</th>
          <th>Key Task</th>
          <th>Sub Task</th>
          <th>Task Result / Update</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * ✅ Helper: Add metric cell with beautiful styling
 * @private
 */
// ✅ CODE MỚI - ĐÃ THU NHỎ HỢP LÝ:


/**
 * Helper function to extract and add task section to PDF
 * @private
 */
function _addTaskSectionToPDF(body, htmlContent, sectionTitle, sectionClass) {
  // Find section in HTML
  const sectionRegex = new RegExp(`<div class="${sectionClass}"[^>]*>([\\s\\S]*?)<\\/table>`, 'i');
  const sectionMatch = htmlContent.match(sectionRegex);
  
  if (!sectionMatch) {
    console.log(`Section ${sectionTitle} not found in HTML`);
    return;
  }
  
  // Add section title
  const title = body.appendParagraph(sectionTitle);
  title.setFontSize(13);
  title.setBold(true);
  title.setForegroundColor('#1e3d72');
  title.setSpacingBefore(10);
  
  // Extract table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = Array.from(sectionMatch[1].matchAll(rowRegex));
  
  if (rows.length <= 1) {
    // No data rows (only header or empty)
    const noData = body.appendParagraph('No tasks in this section');
    noData.setItalic(true);
    noData.setForegroundColor('#6c757d');
    body.appendParagraph('');
    return;
  }
  
  // Create table in document
  const table = body.appendTable();
  
  rows.forEach((rowMatch, rowIndex) => {
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells = Array.from(rowMatch[1].matchAll(cellRegex));
    
    if (cells.length === 0) return;
    
    const docRow = table.appendTableRow();
    
    cells.forEach((cellMatch, cellIndex) => {
      // Clean HTML tags from cell content
      let cellText = cellMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      
      // Handle empty cells
      if (!cellText || cellText === '-') cellText = '-';
      
      const docCell = docRow.appendTableCell(cellText);
      const para = docCell.getChild(0).asParagraph();
      
      // Style header row
      if (rowIndex === 0) {
        docCell.setBackgroundColor('#2c5aa0');
        para.setForegroundColor('#ffffff');
        para.setBold(true);
        para.setFontSize(9);
      } else {
        // Check if row is priority (contains ⭐)
        if (cellText.includes('⭐') || rowMatch[1].includes('priority-row')) {
          docCell.setBackgroundColor('#fff8e1');
        }
        para.setFontSize(8);
      }
      
      // Adjust cell padding
      docCell.setPaddingTop(4);
      docCell.setPaddingBottom(4);
      docCell.setPaddingLeft(4);
      docCell.setPaddingRight(4);
      
      // Center align certain columns (index, priority, dates, status)
      if (cellIndex === 0 || cellIndex === 1 || cellIndex === 5 || cellIndex === 6 || cellIndex === 7) {
        para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    });
  });
  
  table.setBorderWidth(1);
  table.setBorderColor('#dee2e6');
  body.appendParagraph(''); // Spacing after table
}/**
 * ✅ Helper: Append beautiful task table with proper column widths
 * @private
 */
/**
 * 🆕 HELPER FUNCTION: Tạm xóa Data Validation của một range
 * @param {GoogleAppsScript.Spreadsheet.Range} range - Range cần xóa validation
 * @returns {GoogleAppsScript.Spreadsheet.DataValidation|null} - Validation rule đã xóa (để restore sau)
 */
function _removeDataValidation(range) {
  try {
    const validation = range.getDataValidation();
    if (validation) {
      range.clearDataValidations();
      return validation;
    }
    return null;
  } catch (error) {
    console.warn('Error removing data validation:', error);
    return null;
  }
}

/**
 * 🆕 HELPER FUNCTION: Khôi phục Data Validation cho một range
 * @param {GoogleAppsScript.Spreadsheet.Range} range - Range cần restore validation
 * @param {GoogleAppsScript.Spreadsheet.DataValidation} validation - Validation rule cần restore
 */
function _restoreDataValidation(range, validation) {
  try {
    if (validation) {
      range.setDataValidation(validation);
    }
  } catch (error) {
    console.warn('Error restoring data validation:', error);
  }
}

/**
 * 🆕 SAFE SET VALUE: Set value với xử lý Data Validation
 * Tạm xóa validation → setValue → Restore validation
 * @param {number} row - Row number
 * @param {number} col - Column number
 * @param {any} value - Value to set
 */
function _safeSetValue(row, col, value) {
  const sh = _sheet();
  const range = sh.getRange(row, col);
  
  // Lưu validation rule hiện tại
  const validation = _removeDataValidation(range);
  
  // Set value
  range.setValue(value);
  
  // Restore validation
  if (validation) {
    _restoreDataValidation(range, validation);
  }
}/**
 * Hiển thị dialog theo dõi tiến độ công việc cho HOD
 * HOD có thể xem tất cả công việc, filter theo PIC, và mark Priority
 */
/**
 * ✅ FIXED: Hiển thị dialog theo dõi tiến độ công việc cho HOD
 * HOD có thể xem tất cả công việc, filter theo PIC, và mark Priority
 * 
 * FIXES:
 * - Dùng system role authentication thay vì check sheet "master"
 * - Fallback mechanism cho HOD name
 * - Compatible với multiple roles system
 */
/**
 * ✅ FIXED: HOD Progress Tracking Dialog với MULTI-ROLE support
 */
function _showHODProgressTrackingDialog() {
  const ui = _getUi();
  const currentUser = _getCurrentUserEmail();
  
  // ✅ FIX: SỬ DỤNG _checkUserHasAnyRole() thay vì check single role
  if (!_checkUserHasAnyRole(currentUser, [CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN])) {
    const userRoles = _getUserRoles(currentUser);
    const rolesText = userRoles && userRoles.length > 0 ? userRoles.join(', ') : 'NONE';
    ui.alert(`⛔ Access denied. HOD or Admin role required.\n\nYour current roles: ${rolesText}`);
    return;
  }
  
  // ✅ LẤY HOD NAME VỚI FALLBACK
  let hodName = _getHODNameFromEmail(currentUser);
  
  if (!hodName) {
    hodName = currentUser.split('@')[0].toUpperCase();
    console.log('HOD name not found in master sheet, using email prefix:', hodName);
  }
  
  // ============ GIỮ NGUYÊN PHẦN CODE CÒN LẠI ============
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
const dataSheet = ss.getSheetByName(CONFIG.SHEET_NAME); // Dùng CONFIG

if (!dataSheet) {
  ui.alert(`❌ Sheet "${CONFIG.SHEET_NAME}" not found. Please check sheet configuration.`);
  return;
}
  
  // Lấy danh sách tất cả PIC
  const allPICs = _getAllPICNames();
  
  // Lấy date bounds cho tuần này và tuần tới
 const today = new Date();
const { monday, saturday } = _weekBounds(today);
const { monday: nextMonday, saturday: nextSaturday } = _weekBounds(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  
  const weekLabel = _formatWeekLabel(monday, saturday);
  const planLabel = _formatWeekLabel(nextMonday, nextSaturday);
  
  // Lấy tất cả công việc của tuần này và tuần tới
  const allRows = _fetchAllRows();
  // ✅ CODE MỚI - COPY VÀO ĐÂY
const thisWeekTasks = allRows.filter(r => {
  if (!r.start) return false;  // ✅ ĐÚNG: Sử dụng r.start thay vì r.startDate
  const startDate = new Date(r.start);
  return startDate >= monday && startDate <= saturday;
});

const nextWeekTasks = allRows.filter(r => {
  if (!r.start) return false;  // ✅ ĐÚNG: Sử dụng r.start thay vì r.startDate
  const startDate = new Date(r.start);
  return startDate >= nextMonday && startDate <= nextSaturday;
});
  
  // Build unique lists
  const uniqueKeyTasks = _getKeyTaskOptionsFromMaster();
  const uniqueSubTasks = [...new Set(allRows.map(r => r.sub).filter(Boolean))];
  const uniqueTypes = _getTypeOptionsFromMaster();
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* COPY TOÀN BỘ CSS TỪ DOCUMENT BẠN GỬI */
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 10px; 
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          font-size: 14px;
          color: #333;
        }
        
        .container {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 100%;
          height: calc(100vh - 20px);
          display: flex;
          flex-direction: column;
        }
        
        .header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 12px 15px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%);
          animation: shimmer 3s ease-in-out infinite;
        }
        .header button:hover {
  background: rgba(255,255,255,0.4);
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.header button:active {
  transform: translateY(-50%) scale(0.95);
}
        @keyframes shimmer {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
        }
        
        .header h2 { 
          margin: 0; 
          font-size: 22px;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
          z-index: 1;
        }
        
        .header p { 
          margin: 5px 0 0 0;
          opacity: 0.9; 
          font-size: 13px;
          position: relative;
          z-index: 1;
        }
        
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .stats-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding: 10px 15px;
          background: #f8f9fa;
        }
        
        .stat-box {
          background: white;
          padding: 8px 10px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-left: 4px solid;
          transition: all 0.3s;
          cursor: pointer;
        }
        
        .stat-box:hover { 
          transform: translateY(-3px); 
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .stat-box.total { border-left-color: #3498db; }
        .stat-box.completed { 
          border-left-color: #27ae60; 
          background: linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%);
        }
        .stat-box.pending { 
          border-left-color: #f39c12; 
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        }
        .stat-box.priority { 
          border-left-color: #f1c40f; 
          background: linear-gradient(135deg, #fff9c4 0%, #f7dc6f 100%);
        }
        
        .stat-number { 
          font-size: 20px;
          font-weight: bold; 
          color: #2c3e50; 
          margin-bottom: 3px;
        }
        
        .stat-label { 
          font-size: 10px;
          color: #7f8c8d; 
          font-weight: 600;
        }
        
        .tabs {
          display: flex;
          background: white;
          margin: 0 15px;
          border-radius: 10px 10px 0 0;
          overflow: hidden;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }
        
        .tab-button {
          flex: 1;
          padding: 10px 15px;
          background: #ecf0f1;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #2c3e50;
          transition: all 0.3s;
          position: relative;
        }
        
        .tab-button.active {
  background: #1e3c72;
  border-bottom: 3px solid #2a5298;
}
        
        .tab-button:hover:not(.active) {
          background: #d5dbdb;
          transform: translateY(-1px);
        }
        
        .tab-content {
          display: none;
          background: white;
          margin: 0 15px;
          border-radius: 0 0 10px 10px;
          padding: 12px 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          flex: 1;
          overflow-y: auto;
        }
        
        .tab-content.active { display: block; }
        
        .table-container {
          max-height: calc(100vh - 380px);
          overflow-y: auto;
          border: 1px solid #ddd;
          border-radius: 8px;
        }
        
        .task-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }
        
        .task-table th {
          background: linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%);
          color: white;
          padding: 14px 10px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
          white-space: nowrap;
        }
        
        .task-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #eee;
          font-size: 13px;
          vertical-align: middle;
        }
        
        .task-table tr:hover { background: #f8f9fa; }
        
        .task-table tr.priority-row { 
          background: linear-gradient(135deg, #fff9c4 0%, #f7dc6f 100%);
          border-left: 3px solid #f1c40f;
        }
        .task-table tr.completed-row { 
          background: linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%);
          border-left: 3px solid #27ae60;
        }
        .task-table tr.inprogress-row { 
          background: linear-gradient(135deg, #aed6f1 0%, #85c1e9 100%);
          border-left: 3px solid #3498db;
        }
        
        .readonly-cell {
          background: #f8f9fa;
          color: #555;
          padding: 10px 8px;
        }
        
        .checkbox-cell {
          text-align: center;
          width: 50px;
        }
        
        .checkbox-cell input[type="checkbox"] {
          transform: scale(1.5);
          cursor: pointer;
          margin: 0;
        }
        
        .date-cell { width: 100px; }
        .status-cell { width: 140px; }
        .priority-cell { width: 60px; }
        .row-cell { width: 50px; }
        .pic-cell { width: 120px; }
        
        .filter-select {
          padding: 8px 12px;
          border: 2px solid #8e44ad;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          background: white;
          color: #2c3e50;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 160px;
        }
        
        .filter-select:hover {
          border-color: #9b59b6;
          box-shadow: 0 2px 8px rgba(142, 68, 173, 0.2);
        }
        
        .filter-select:focus {
          outline: none;
          border-color: #9b59b6;
          box-shadow: 0 0 0 3px rgba(142, 68, 173, 0.2);
        }
        
        .btn {
          padding: 8px 15px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          margin: 0 5px;
        }
        
        .btn-clear-filter {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
          padding: 8px 15px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .btn-clear-filter:hover {
          background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
        }
        
        .task-table tr.filtered-out {
          display: none;
        }
        
        .filter-info {
          background: #e8daef;
          border: 1px solid #8e44ad;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 10px;
          font-size: 12px;
          color: #6c3483;
          font-weight: 600;
          text-align: center;
        }
        
        .actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          padding: 12px 15px;
          background: #f8f9fa;
          border-top: 1px solid #ddd;
          flex-wrap: wrap;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          padding: 12px 30px;
          font-size: 14px;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(142, 68, 173, 0.4);
        }
        
        .btn-primary:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .btn-secondary {
          background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
          color: white;
          padding: 12px 30px;
          font-size: 14px;
        }
        
        .btn-secondary:hover {
          background: linear-gradient(135deg, #7f8c8d 0%, #6c757d 100%);
        }
        
        .btn-email {
          background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
          color: white;
          padding: 12px 30px;
          font-size: 14px;
        }
        
        .btn-email:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
        }
        
        .loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .loading.active { display: flex; }
        
        .spinner {
          width: 60px;
          height: 60px;
          border: 6px solid #f3f3f3;
          border-top: 6px solid #8e44ad;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .row-number { 
          font-weight: bold; 
          color: #8e44ad; 
          text-align: center;
        }
        .hod-comment-cell textarea {
  width: 100%;
  min-height: 50px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s;
}

.hod-comment-cell textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.hod-comment-cell textarea.changed {
  background-color: #fff3cd;
  border-color: #ffc107;
}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
  <h2 style="margin: 0; position: relative; padding-right: 50px;">
    👁️ Theo dõi tiến độ công việc - ${hodName} (HOD)
    <button onclick="openGuide()" 
            title="Hướng dẫn sử dụng"
            style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%);
                   background: rgba(255,255,255,0.2); color: white; border: 2px solid white;
                   width: 38px; height: 38px; border-radius: 50%; cursor: pointer;
                   font-size: 20px; font-weight: bold; transition: all 0.3s;">
      ?
    </button>
  </h2>
  <p style="margin: 8px 0 0 0;">Tuần này: ${weekLabel} | Tuần tới: ${planLabel}</p>
</div>
        
        <div class="content">
          <div class="stats-container" id="statsContainer">
            <div class="stat-box total">
              <div class="stat-number" id="totalTasks">0</div>
              <div class="stat-label">Tổng công việc</div>
            </div>
            <div class="stat-box completed">
              <div class="stat-number" id="completedTasks">0</div>
              <div class="stat-label">Hoàn thành</div>
            </div>
            <div class="stat-box pending">
              <div class="stat-number" id="pendingTasks">0</div>
              <div class="stat-label">Đang thực hiện</div>
            </div>
            <div class="stat-box priority">
              <div class="stat-number" id="priorityTasks">0</div>
              <div class="stat-label">Việc quan trọng</div>
            </div>
          </div>
          
          <div class="tabs">
            <button class="tab-button active" onclick="showTab('current')">📋 Công việc tuần này</button>
            <button class="tab-button" onclick="showTab('next')">📅 Kế hoạch tuần tới</button>
          </div>
          
          <div id="tab-current" class="tab-content active">
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
              <div style="display: flex; gap: 6px; align-items: center;">
                <label style="font-weight: 600; font-size: 13px; white-space: nowrap;">👤 Xem theo PIC:</label>
                <select id="filterByPIC" class="filter-select" onchange="applyFilters()">
                  <option value="">Tất cả PIC</option>
                  ${allPICs.map(pic => `<option value="${pic}">${pic}</option>`).join('')}
                </select>
              </div>
              
              <div style="display: flex; gap: 6px; align-items: center;">
                <label style="font-weight: 600; font-size: 13px; white-space: nowrap;">📅 Kiểm tra theo ngày:</label>
                <select id="filterByDate" class="filter-select" onchange="applyFilters()">
                  <option value="">Tất cả các ngày</option>
                </select>
              </div>
              
              <div style="display: flex; gap: 6px; align-items: center;">
                <label style="font-weight: 600; font-size: 13px; white-space: nowrap;">📊 Xem theo trạng thái:</label>
                <select id="filterByStatus" class="filter-select" onchange="applyFilters()">
                  <option value="">Tất cả trạng thái</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress 25%">In Progress 25%</option>
                  <option value="In Progress 50%">In Progress 50%</option>
                  <option value="In Progress 75%">In Progress 75%</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              
              <button class="btn btn-clear-filter" onclick="clearFilters()">
                🔄 Xóa bộ lọc
              </button>
            </div>
            
            <div class="table-container">
              <table class="task-table">
                <thead>
                  <tr>
                    <th class="row-cell">Row</th>
                    <th class="pic-cell">PIC</th>
                    <th class="priority-cell">Quan trọng</th>
                    <th class="date-cell">Start Date</th>
                    <th style="width: 120px;">Type</th>
                    <th>Key Task</th>
                    <th>Sub Task</th>
                    <th>Task Result</th>
                    <th class="date-cell">Finish Date</th>
                    <th class="date-cell">Deadline</th>
                    <th class="status-cell">Status</th>
                     <th style="width: 200px;">HOD Comment</th>  <!-- ✅ THÊM DÒNG NÀY -->
                  </tr>
                </thead>
                <tbody id="currentWeekTableBody">
                  ${_buildHODCurrentWeekTableRows(thisWeekTasks)}
                </tbody>
              </table>
            </div>
          </div>
          
          <div id="tab-next" class="tab-content">
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
              <div style="display: flex; gap: 6px; align-items: center;">
                <label style="font-weight: 600; font-size: 13px; white-space: nowrap;">👤 Xem theo PIC:</label>
                <select id="filterByPICNext" class="filter-select" onchange="applyNextFilters()">
                  <option value="">Tất cả PIC</option>
                  ${allPICs.map(pic => `<option value="${pic}">${pic}</option>`).join('')}
                </select>
              </div>
              
              <button class="btn btn-clear-filter" onclick="clearNextFilters()">
                🔄 Xóa bộ lọc
              </button>
            </div>
            
            <div class="table-container">
              <table class="task-table">
                <thead>
                  <tr>
                    <th class="row-cell">Row</th>
                    <th class="pic-cell">PIC</th>
                    <th class="priority-cell">Quan trọng</th>
                    <th class="date-cell">Start Date</th>
                    <th>Type</th>
                    <th>Key Task</th>
                    <th>Sub Task</th>
                    <th class="date-cell">Deadline</th>
                    <th class="status-cell">Status</th>
                  </tr>
                </thead>
                <tbody id="nextWeekTableBody">
                  ${_buildHODNextWeekTableRows(nextWeekTasks)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div class="actions">
  <div style="display: flex; align-items: center; gap: 15px; justify-content: center;">
    <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
      <input type="checkbox" id="sendToTeam" style="width: 18px; height: 18px;">
      <span style="font-weight: 600;">📧 Nhắc việc cả team</span>
    </label>
  </div>
  
  <button class="btn btn-primary" onclick="sendReminderEmails()">
    📨 Gửi email nhắc việc
  </button>
  <button class="btn btn-secondary" onclick="google.script.host.close()">
    ❌ Đóng
  </button>
</div>
      </div>
      
      <div id="loading" class="loading">
        <div class="spinner"></div>
      </div>
      
      <script>
        const weekBounds = {
          monday: new Date('${monday.toISOString()}'),
          saturday: new Date('${saturday.toISOString()}'),
          nextMonday: new Date('${nextMonday.toISOString()}'),
          nextSaturday: new Date('${nextSaturday.toISOString()}')
        };
        
        const weekDates = [];
        
        function generateWeekDates() {
  const start = new Date(weekBounds.monday);
  const end = new Date(weekBounds.saturday);
  
  const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  
  let current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const dateStr = year + '-' + month + '-' + day;
    
    const dayName = daysOfWeek[current.getDay()];
    const displayDate = day + '/' + month;
    
    weekDates.push({
      value: dateStr,
      label: dayName + ' (' + displayDate + ')'
    });
    
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
}
        
        function populateDateFilter() {
          const select = document.getElementById('filterByDate');
          if (!select) return;
          
          while (select.options.length > 1) {
            select.remove(1);
          }
          
          weekDates.forEach(date => {
            const option = document.createElement('option');
            option.value = date.value;
            option.textContent = date.label;
            select.appendChild(option);
          });
        }
        
        document.addEventListener('DOMContentLoaded', function() {
          generateWeekDates();
          populateDateFilter();
          updateStatistics();
          updateRowColors();
        });
        
        function showTab(tabName) {
          document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
          });
          
          document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
          });
          
          document.getElementById('tab-' + tabName).classList.add('active');
          event.target.classList.add('active');
          
          if (tabName === 'current') {
            clearFilters();
            updateStatistics();
          } else {
            clearNextFilters();
          }
        }
        
        function updateStatistics() {
          const currentRows = document.querySelectorAll('#currentWeekTableBody tr:not(.filtered-out)');
          let completed = 0;
          let pending = 0;
          let priority = 0;
          
          currentRows.forEach(row => {
            const status = row.getAttribute('data-status') || '';
            const priorityChecked = row.querySelector('input[name="priority"]')?.checked || false;
            
            if (status === 'Completed') completed++;
            if (status.includes('Progress')) pending++;
            if (priorityChecked) priority++;
          });
          
          document.getElementById('totalTasks').textContent = currentRows.length;
          document.getElementById('completedTasks').textContent = completed;
          document.getElementById('pendingTasks').textContent = pending;
          document.getElementById('priorityTasks').textContent = priority;
        }
        
        function updateRowColors() {
          document.querySelectorAll('#currentWeekTableBody tr').forEach(row => {
            const status = row.getAttribute('data-status') || '';
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            
            row.classList.remove('priority-row', 'completed-row', 'inprogress-row');
            
            if (status === 'Completed') {
              row.classList.add('completed-row');
            } else if (priority) {
              row.classList.add('priority-row');
            } else if (status.includes('Progress')) {
              row.classList.add('inprogress-row');
            }
          });
          
          document.querySelectorAll('#nextWeekTableBody tr').forEach(row => {
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            
            row.classList.remove('priority-row');
            if (priority) {
              row.classList.add('priority-row');
            }
          });
        }
        
        function onPriorityChange() {
          updateStatistics();
          updateRowColors();
        }
        
        function applyFilters() {
          const picFilter = document.getElementById('filterByPIC').value;
          const dateFilter = document.getElementById('filterByDate').value;
          const statusFilter = document.getElementById('filterByStatus').value;
          
          const rows = document.querySelectorAll('#currentWeekTableBody tr');
          let visibleCount = 0;
          
          rows.forEach(row => {
            const pic = row.getAttribute('data-pic') || '';
            const startDate = row.getAttribute('data-start-date') || '';
            const status = row.getAttribute('data-status') || '';
            
            let showRow = true;
            
            if (picFilter && pic !== picFilter) showRow = false;
            if (dateFilter && startDate !== dateFilter) showRow = false;
            if (statusFilter && status !== statusFilter) showRow = false;
            
            if (showRow) {
              row.classList.remove('filtered-out');
              visibleCount++;
            } else {
              row.classList.add('filtered-out');
            }
          });
          
          updateFilterInfo(picFilter, dateFilter, statusFilter, visibleCount, rows.length);
          updateStatistics();
        }
        
        function clearFilters() {
          document.getElementById('filterByPIC').value = '';
          document.getElementById('filterByDate').value = '';
          document.getElementById('filterByStatus').value = '';
          
          document.querySelectorAll('#currentWeekTableBody tr').forEach(row => {
            row.classList.remove('filtered-out');
          });
          
          const filterInfo = document.getElementById('filterInfo');
          if (filterInfo) filterInfo.remove();
          
          updateStatistics();
        }
        
        function applyNextFilters() {
          const picFilter = document.getElementById('filterByPICNext').value;
          
          const rows = document.querySelectorAll('#nextWeekTableBody tr');
          
          rows.forEach(row => {
            const pic = row.getAttribute('data-pic') || '';
            
            if (picFilter && pic !== picFilter) {
              row.classList.add('filtered-out');
            } else {
              row.classList.remove('filtered-out');
            }
          });
        }
        
        function clearNextFilters() {
          document.getElementById('filterByPICNext').value = '';
          
          document.querySelectorAll('#nextWeekTableBody tr').forEach(row => {
            row.classList.remove('filtered-out');
          });
        }
        
        function updateFilterInfo(picFilter, dateFilter, statusFilter, visibleCount, totalCount) {
          let filterInfo = document.getElementById('filterInfo');
          if (!filterInfo) {
            filterInfo = document.createElement('div');
            filterInfo.id = 'filterInfo';
            filterInfo.className = 'filter-info';
            
            const tableContainer = document.querySelector('#tab-current .table-container');
            tableContainer.parentNode.insertBefore(filterInfo, tableContainer);
          }
          
          if (!picFilter && !dateFilter && !statusFilter) {
            filterInfo.remove();
            return;
          }
          
          let filterText = '🔍 Đang lọc: ';
          const filters = [];
          
          if (picFilter) filters.push(\`PIC: \${picFilter}\`);
          if (dateFilter) {
            const selectedOption = document.querySelector(\`#filterByDate option[value="\${dateFilter}"]\`);
            filters.push(\`Ngày: \${selectedOption.textContent}\`);
          }
          if (statusFilter) filters.push(\`Trạng thái: \${statusFilter}\`);
          
          filterText += filters.join(' | ');
          filterText += \` | Hiển thị: \${visibleCount}/\${totalCount} công việc\`;
          
          filterInfo.textContent = filterText;
        }
        
        function confirmChanges() {
          const loading = document.getElementById('loading');
          loading.classList.add('active');
          
          const currentRows = document.querySelectorAll('#currentWeekTableBody tr');
          const nextRows = document.querySelectorAll('#nextWeekTableBody tr');
          
          const priorityUpdates = [];
          
          currentRows.forEach(row => {
            const rowNum = parseInt(row.getAttribute('data-row'));
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            
            if (rowNum) {
              priorityUpdates.push({
                row: rowNum,
                priority: priority
              });
            }
          });
          
          nextRows.forEach(row => {
            const rowNum = parseInt(row.getAttribute('data-row'));
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            
            if (rowNum) {
              priorityUpdates.push({
                row: rowNum,
                priority: priority
              });
            }
          });
          
          google.script.run
            .withSuccessHandler(function(result) {
              loading.classList.remove('active');
              alert('✅ ' + result);
              google.script.host.close();
            })
            .withFailureHandler(function(error) {
              loading.classList.remove('active');
              alert('❌ Lỗi: ' + error.message);
            })
            .executeHODPriorityUpdate(priorityUpdates);
        }
        
        function sendReminderEmails() {
          const currentRows = document.querySelectorAll('#currentWeekTableBody tr');
          const nextRows = document.querySelectorAll('#nextWeekTableBody tr');
          
          const priorityTasks = [];
          
          currentRows.forEach(row => {
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            if (priority) {
              const rowNum = parseInt(row.getAttribute('data-row'));
              const pic = row.getAttribute('data-pic');
              const keyTask = row.getAttribute('data-key-task');
              const startDate = row.getAttribute('data-start-date');
              const deadline = row.getAttribute('data-deadline');
              const status = row.getAttribute('data-status');
              
              if (rowNum && pic) {
                priorityTasks.push({
                  row: rowNum,
                  pic: pic,
                  keyTask: keyTask || '',
                  startDate: startDate || '',
                  deadline: deadline || '',
                  status: status || '',
                  weekType: 'current'
                });
              }
            }
          });
          
          nextRows.forEach(row => {
            const priority = row.querySelector('input[name="priority"]')?.checked || false;
            if (priority) {
              const rowNum = parseInt(row.getAttribute('data-row'));
              const pic = row.getAttribute('data-pic');
              const keyTask = row.getAttribute('data-key-task');
              const startDate = row.getAttribute('data-start-date');
              const deadline = row.getAttribute('data-deadline');
              const status = row.getAttribute('data-status');
              
              if (rowNum && pic) {
                priorityTasks.push({
                  row: rowNum,
                  pic: pic,
                  keyTask: keyTask || '',
                  startDate: startDate || '',
                  deadline: deadline || '',
                  status: status || '',
                  weekType: 'next'
                });
              }
            }
          });
          
          if (priorityTasks.length === 0) {
            alert('⚠️ Không có công việc quan trọng nào được đánh dấu để gửi email.');
            return;
          }
          
          if (!confirm(\`Bạn có chắc muốn gửi email nhắc việc cho \${priorityTasks.length} công việc quan trọng?\`)) {
            return;
          }
          
          const loading = document.getElementById('loading');
          loading.classList.add('active');
          
          google.script.run
            .withSuccessHandler(function(result) {
              loading.classList.remove('active');
              alert('✅ ' + result);
            })
            .withFailureHandler(function(error) {
              loading.classList.remove('active');
              alert('❌ Lỗi: ' + error.message);
            })
            .sendHODPriorityReminderEmails(priorityTasks);
        }
        // ✅ Mark textarea as changed
function markCommentChanged(textarea) {
  textarea.classList.add('changed');
}

// ✅ NEW: Send reminder emails based on filter + team checkbox
function sendReminderEmails() {
  const loading = document.getElementById('loading');
  loading.classList.add('active');
  
  const sendToTeam = document.getElementById('sendToTeam').checked;
  
  // Collect filtered tasks with comments
  const currentRows = document.querySelectorAll('#currentWeekTableBody tr:not(.filtered-out)');
  const filteredTasks = [];
  const commentUpdates = [];
  
  currentRows.forEach(row => {
    const rowNum = parseInt(row.getAttribute('data-row'));
    const pic = row.getAttribute('data-pic');
    const startDate = row.getAttribute('data-start-date');
    const status = row.getAttribute('data-status');
    const priority = row.querySelector('input[name="priority"]')?.checked || false;
    
    // Get HOD comment
    const hodCommentTextarea = row.querySelector('textarea[name="hodComment"]');
    const hodComment = hodCommentTextarea ? hodCommentTextarea.value.trim() : '';
    
    if (rowNum) {
      // Collect for email
      filteredTasks.push({
        row: rowNum,
        pic: pic,
        startDate: startDate,
        status: status,
        priority: priority,
        hodComment: hodComment
      });
      
      // Collect for update
      if (hodComment) {
        commentUpdates.push({
          row: rowNum,
          comment: hodComment
        });
      }
    }
  });
  
  if (filteredTasks.length === 0) {
    loading.classList.remove('active');
    alert('⚠️ Không có công việc nào để gửi email.');
    return;
  }
  
  // Send email
  google.script.run
    .withSuccessHandler(function(result) {
      loading.classList.remove('active');
      alert('✅ ' + result);
      google.script.host.close();
    })
    .withFailureHandler(function(error) {
      loading.classList.remove('active');
      alert('❌ Lỗi: ' + error.message);
    })
    .processHODReminderEmails(filteredTasks, commentUpdates, sendToTeam);
}
function openGuide() {
        google.script.run
          .withSuccessHandler(() => {
            console.log('User guide opened');
          })
          .withFailureHandler((error) => {
            alert('❌ Không thể mở hướng dẫn: ' + error.message);
          })
          .showHODProgressTrackingGuide();
      }
      function validatePriorityChange(checkbox) {
  const status = checkbox.getAttribute('data-status') || '';
  
  if (checkbox.checked && status === 'Completed') {
    checkbox.checked = false;
    alert('⚠️ Không thể đánh dấu "Quan trọng" cho công việc đã hoàn thành (Status: Completed)');
    return false;
  }
  
  onPriorityChange();
  return true;
}
      </script>
    </body>
    </html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1850).setHeight(1050),
    'Theo dõi tiến độ công việc - ' + hodName
  );
}/**
 * Build table rows cho tuần hiện tại (HOD view) - READ ONLY trừ Priority
 */
/**
 * ✅ FIXED: Build table rows cho tuần này (HOD view) - READ ONLY trừ Priority
 * FIX: Dùng đúng field names: picName (not pic), start (not startDate)
 */
/**
 * ✅ ENHANCED: Build table rows cho tuần này với HOD Comment (EDITABLE)
 */
function _buildHODCurrentWeekTableRows(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<tr><td colspan="12" style="text-align: center; padding: 20px; color: #999;">Không có công việc nào trong tuần này</td></tr>';
  }
  
  return tasks.map(task => {
    const priorityChecked = task.priority ? 'checked' : '';
    const startDateValue = task.start ? _formatDateForInput(task.start) : '';
    const picName = task.picName || '';
    const hodComment = task.managerComment || ''; // ✅ Lấy từ cột R
    
    return `
      <tr data-row="${task.row}" 
          data-pic="${_escapeHtml(picName)}"
          data-start-date="${startDateValue}"
          data-status="${_escapeHtml(task.status || '')}">
        <td class="row-number">${task.row}</td>
        <td class="readonly-cell pic-cell">${_escapeHtml(picName)}</td>
        <td class="checkbox-cell">
  <input type="checkbox" 
         name="priority" 
         ${priorityChecked} 
         data-status="${_escapeHtml(task.status || '')}"
         onchange="validatePriorityChange(this)">
</td>
        </td>
        <td class="readonly-cell date-cell">${_formatDateDisplay(task.start)}</td>
        <td class="readonly-cell">${_escapeHtml(task.type || '')}</td>
        <td class="readonly-cell">${_escapeHtml(task.key || '')}</td>
        <td class="readonly-cell">${_escapeHtml(task.sub || '')}</td>
        <td class="readonly-cell">${_escapeHtml(task.result || '')}</td>
        <td class="readonly-cell date-cell">${_formatDateDisplay(task.finish)}</td>
        <td class="readonly-cell date-cell">${_formatDateDisplay(task.deadline)}</td>
        <td class="readonly-cell status-cell">${_escapeHtml(task.status || '')}</td>
        <td class="editable-cell hod-comment-cell">
          <textarea name="hodComment" 
                    placeholder="Nhập HOD comment..."
                    rows="2"
                    onchange="markCommentChanged(this)">${_escapeHtml(hodComment)}</textarea>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Build table rows cho tuần tới (HOD view) - READ ONLY trừ Priority
 */
/**
 * ✅ FIXED: Build table rows cho tuần tới (HOD view) - READ ONLY trừ Priority
 * FIX: Dùng đúng field names: picName (not pic), start (not startDate)
 */
function _buildHODNextWeekTableRows(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #999;">Không có kế hoạch nào cho tuần tới</td></tr>';
  }
  
  return tasks.map(task => {
    const priorityChecked = task.priority ? 'checked' : '';
    
    // ✅ FIX: Dùng task.start thay vì task.startDate
    const startDateValue = task.start ? _formatDateForInput(task.start) : '';
    const deadlineValue = task.deadline ? _formatDateForInput(task.deadline) : '';
    
    // ✅ FIX: Dùng task.picName thay vì task.pic
    const picName = task.picName || '';
    
    return `
      <tr data-row="${task.row}" 
          data-pic="${_escapeHtml(picName)}"
          data-key-task="${_escapeHtml(task.key || '')}"
          data-start-date="${startDateValue}"
          data-deadline="${deadlineValue}"
          data-status="${_escapeHtml(task.status || '')}">
        <td class="row-number">${task.row}</td>
        <td class="readonly-cell pic-cell">${_escapeHtml(picName)}</td>
        <td class="checkbox-cell">
          <input type="checkbox" name="priority" ${priorityChecked} onchange="onPriorityChange()">
        </td>
        <td class="readonly-cell date-cell">${_formatDateDisplay(task.start)}</td>
        <td class="readonly-cell">${_escapeHtml(task.type || '')}</td>
        <td class="readonly-cell">${_escapeHtml(task.key || '')}</td>
        <td class="readonly-cell">${_escapeHtml(task.sub || '')}</td>
        <td class="readonly-cell date-cell">${_formatDateDisplay(task.deadline)}</td>
        <td class="readonly-cell status-cell">${_escapeHtml(task.status || '')}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Get danh sách tất cả PIC names
 */
/**
 * ✅ FIXED: Get all PIC names from current week data
 * Dùng _fetchAllRows() thay vì hardcode sheet name
 */
function _getAllPICNames() {
  try {
    const rows = _fetchAllRows(); // Sử dụng helper có sẵn
    const { monday, saturday } = _weekBounds(new Date());

    const set = new Set();
    rows.forEach(r => {
      // Collect PIC names from current week
      if (r && r.picName && _isWithinWeek(r, monday, saturday)) {
        set.add(r.picName);
      }
    });

    // Fallback nếu tuần này chưa có dữ liệu
    if (set.size === 0 && CONFIG && CONFIG.PIC_LIST) {
      Object.keys(CONFIG.PIC_LIST).forEach(k => set.add(k));
    }

    return Array.from(set).sort();
    
  } catch (err) {
    console.error('_getAllPICNames error:', err);
    // Fallback an toàn
    return CONFIG && CONFIG.PIC_LIST ? Object.keys(CONFIG.PIC_LIST) : [];
  }
}

/**
 * Get HOD name từ email
 */
/**
 * ✅ ENHANCED: Get HOD name từ email
 * Tìm trong sheet "master" trước, sau đó fallback sang sheet WEEK
 */
function _getHODNameFromEmail(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // METHOD 1: Tìm trong sheet "master" (column F - HOD Email, column A - HOD Name)
  const masterSheet = ss.getSheetByName('master');
  
  if (masterSheet) {
    const lastRow = masterSheet.getLastRow();
    if (lastRow >= 2) {
      const data = masterSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      
      for (let i = 0; i < data.length; i++) {
        const hodEmail = data[i][5]; // Column F
        if (hodEmail && hodEmail.toString().trim().toLowerCase() === email.toLowerCase()) {
          return data[i][0].toString().trim(); // Column A - HOD name
        }
      }
    }
  }
  
  // METHOD 2: Fallback - Tìm trong sheet WEEK (cột U - HOD Email)
  const rows = _fetchAllRows();
  const hodRow = rows.find(r => 
    r.hodEmail && r.hodEmail.toLowerCase() === email.toLowerCase()
  );
  
  if (hodRow && hodRow.picName) {
    // Nếu tìm thấy, có thể dùng PIC name hoặc tạo HOD label
    return `HOD (${email.split('@')[0]})`;
  }
  
  // METHOD 3: Ultimate fallback - Extract từ email
  return email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
}

/**
 * Helper: Format date for display (DD/MM/YYYY)
 */
function _formatDateDisplay(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '';
  }
}

/**
 * Helper: Format date for input (YYYY-MM-DD)
 */
function _formatDateForInput(date) {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
}

/**
 * Helper: Escape HTML để prevent XSS
 */
/**
 * Execute HOD Priority Update - chỉ update cột Priority
 * @param {Array} priorityUpdates - Array of {row, priority}
 * @return {String} Success message
 */
function executeHODPriorityUpdate(priorityUpdates) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dataSheet = ss.getSheetByName('Data');
    
    if (!priorityUpdates || priorityUpdates.length === 0) {
      return 'No priority changes to update.';
    }
    
    // Update từng row
    priorityUpdates.forEach(update => {
      const row = update.row;
      const priority = update.priority;
      
      // Column C = Priority (checkbox)
      dataSheet.getRange(row, 3).setValue(priority);
    });
    
    SpreadsheetApp.flush();
    
    return `Successfully updated priority for ${priorityUpdates.length} task(s).`;
    
  } catch (error) {
    console.error('Error in executeHODPriorityUpdate:', error);
    throw new Error('Failed to update priority: ' + error.message);
  }
}/**
 * Send HOD Priority Reminder Emails - Vietnam Template
 * @param {Array} priorityTasks - Array of priority tasks
 * @return {String} Success message
 */
function sendHODPriorityReminderEmails(priorityTasks) {
  try {
    if (!priorityTasks || priorityTasks.length === 0) {
      return 'No priority tasks to send reminders for.';
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userEmail = Session.getActiveUser().getEmail();
    const hodName = _getHODNameFromEmail(userEmail);
    
    // Group tasks by PIC
    const tasksByPIC = {};
    
    priorityTasks.forEach(task => {
      if (!tasksByPIC[task.pic]) {
        tasksByPIC[task.pic] = [];
      }
      tasksByPIC[task.pic].push(task);
    });
    
    // Get PIC emails from master sheet
    const picEmails = _getPICEmailsMap();
    
    let emailsSent = 0;
    const failedPICs = [];
    
    // Send email to each PIC với tasks của họ
    Object.keys(tasksByPIC).forEach(picName => {
      const picEmail = picEmails[picName];
      
      if (!picEmail) {
        console.warn(`No email found for PIC: ${picName}`);
        failedPICs.push(picName);
        return;
      }
      
      const tasks = tasksByPIC[picName];
      
      // Build email content theo Vietnam template
      const emailHTML = _buildVietnamHODPriorityReminderEmailForPIC(picName, tasks, hodName, userEmail);
      
      const subject = `⚠️ NHẮC NHỞ CÔNG VIỆC ƯU TIÊN - ${_formatDateDDMMYYYY(new Date())}`;
      
      try {
        mmhMail_({
          to: picEmail,
          subject: subject,
          htmlBody: emailHTML
        });
        
        emailsSent++;
        console.log(`Email sent successfully to ${picName} (${picEmail})`);
      } catch (emailError) {
        console.error(`Failed to send email to ${picName} (${picEmail}):`, emailError);
        failedPICs.push(picName);
      }
    });
    
    let resultMessage = `Successfully sent priority reminder emails to ${emailsSent} PIC(s).`;
    
    if (failedPICs.length > 0) {
      resultMessage += ` Failed to send to: ${failedPICs.join(', ')}.`;
    }
    
    return resultMessage;
    
  } catch (error) {
    console.error('Error in sendHODPriorityReminderEmails:', error);
    throw new Error('Failed to send reminder emails: ' + error.message);
  }
}/**
 * Build Vietnam style HOD Priority Reminder Email cho 1 PIC cụ thể
 * @param {String} picName - Tên PIC
 * @param {Array} tasks - Array of priority tasks của PIC này
 * @param {String} hodName - Tên HOD
 * @param {String} hodEmail - Email HOD
 * @return {String} HTML content
 */
/**
 * ✅ UPDATED: Build Vietnam style HOD Priority Reminder Email cho 1 PIC cụ thể
 * THÊM: Cột HOD Comment trong task table
 * @param {String} picName - Tên PIC
 * @param {Array} tasks - Array of priority tasks của PIC này
 * @param {String} hodName - Tên HOD
 * @param {String} hodEmail - Email HOD
 * @return {String} HTML content
 */
/**
 * ✅ UPDATED: Build email cho individual PIC - màu xanh chuyên nghiệp
 */
function _buildVietnamHODPriorityReminderEmailForPIC(picName, tasks, hodName, hodEmail) {
  const currentDate = _formatDateDDMMYYYY(new Date());
  const fileLink = _getFileLink();
  
  // Tách tasks theo current week và next week
  const currentWeekTasks = tasks.filter(t => t.weekType === 'current');
  const nextWeekTasks = tasks.filter(t => t.weekType === 'next');
  
  // Build bảng tasks với HOD Comment
  const taskTable = _buildVietnamPriorityTaskTableForPIC(currentWeekTasks, nextWeekTasks);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 14px; 
            line-height: 1.6; 
            color: #2c3e50; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .email-container { 
            max-width: 900px; 
            margin: 0 auto; 
            background: #ffffff; 
            border: 2px solid #3d4f5d; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .content { 
            padding: 30px 25px; 
        }
        .greeting { 
            font-size: 16px; 
            font-weight: 700; 
            color: #3d4f5d; 
            margin: 0 0 20px 0; 
        }
        .message { 
            margin: 15px 0; 
            text-align: justify; 
            line-height: 1.8;
        }
        .priority-notice { 
            background: #eef2f5; 
            border: 2px solid #3d4f5d; 
            border-left: 6px solid #3d4f5d;
            padding: 20px; 
            border-radius: 8px; 
            margin: 25px 0; 
        }
        .priority-notice strong {
            color: #3d4f5d;
        }
        .task-section {
            margin: 30px 0;
        }
        .section-title {
            background: #3d4f5d;
            color: white;
            padding: 12px 15px;
            margin: 0 0 15px 0;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
        }
        .task-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 20px 0;
            font-size: 13px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .task-table th {
            background: #3d4f5d;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #2c3e50;
        }
        .task-table td {
            padding: 10px;
            border: 1px solid #dee2e6;
            vertical-align: top;
        }
        .task-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .task-table tr:hover {
            background: #e8f4fd;
        }
        .priority-row {
            background: #fff3cd !important;
            font-weight: 600;
        }
        .priority-icon {
            color: #f39c12;
            font-size: 16px;
        }
        .deadline-cell {
            color: #e74c3c;
            font-weight: bold;
        }
        .comment-cell {
            background: #fffbea;
            font-style: italic;
            color: #856404;
            max-width: 200px;
            word-wrap: break-word;
        }
        .status-badge {
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            display: inline-block;
        }
        .status-completed {
            background: #d4edda;
            color: #155724;
        }
        .status-inprogress {
            background: #d1ecf1;
            color: #0c5460;
        }
        .status-notstarted {
            background: #f8d7da;
            color: #721c24;
        }
        .footer { 
            background: #ecf0f1; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #7f8c8d; 
            border-top: 2px solid #bdc3c7; 
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: #eef2f5;
            border: 2px solid #3d4f5d;
            border-radius: 8px;
        }
        .cta-button {
            display: inline-block;
            padding: 14px 35px;
            background: #3d4f5d;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 15px;
            box-shadow: 0 4px 6px rgba(61, 79, 93, 0.3);
        }
        .note-box {
            background: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 6px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- ✅ OUTLOOK-COMPATIBLE HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3d4f5d;">
            <tr>
                <td align="center" style="padding: 25px 20px; background-color: #3d4f5d;">
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, sans-serif; font-weight: bold;">
                        ⚠️ NHẮC NHỞ CÔNG VIỆC ƯU TIÊN
                    </h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #ffffff; font-family: Arial, sans-serif;">
                        Marketing Team Priority Tasks Reminder
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="content">
            <p class="greeting">Dear ${picName},</p>
            
            <div class="message">
                Chị gửi lại các công việc cần ưu tiên hoàn thành trước, em theo sát tiến độ và hoàn thành trước deadline theo các nội dung như sau:
            </div>
            
            <div class="priority-notice">
                <strong style="font-size: 15px;">📋 THÔNG TIN QUAN TRỌNG:</strong><br><br>
                📊 Tổng số công việc ưu tiên: <strong>${tasks.length} công việc</strong><br>
                📅 Ngày gửi nhắc nhở: <strong>${currentDate}</strong><br>
                👤 Người gửi: <strong>${_getHODDisplayName(hodEmail)}</strong><br>
                ⏰ Yêu cầu: <strong style="color: #e74c3c;">Hoàn thành đúng deadline</strong>
            </div>
            
            ${taskTable}
            
            <div class="note-box">
                <strong style="color: #2c3e50;">📌 Lưu ý quan trọng:</strong><br>
                Em vui lòng cập nhật tiến độ thường xuyên và báo cáo kịp thời nếu có khó khăn hoặc cần hỗ trợ.
            </div>
            
            ${fileLink ? `
            <div class="cta-section">
                <p style="margin: 0 0 15px 0; font-weight: bold; color: #3d4f5d; font-size: 16px;">
                    📊 Cập nhật tiến độ công việc tại đây:
                </p>
                <a href="${fileLink}" class="cta-button" style="color: white;">
                    📝 Mở Google Sheet
                </a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p style="margin: 0; font-weight: 600; color: #2c3e50;">Marketing Task Management System</p>
            <p style="margin: 8px 0 0 0;">Auto-generated Priority Reminder | Sent on ${currentDate}</p>
        </div>
    </div>
</body>
</html>
  `;
}
/**
 * ✅ NEW: Build individual PIC reminder email HTML
 * Custom greeting and content for filtered tasks
 */
/**
 * ✅ UPDATED: Build individual PIC reminder email - màu xanh chuyên nghiệp
 */
function _buildIndividualPICReminderEmail(picName, tasks, weekLabel, hodEmail) {
  const currentDate = _formatDateDDMMYYYY(new Date());
  const fileLink = _getFileLink();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: Calibri, Arial, sans-serif; 
      font-size: 11pt; 
      color: #000000; 
      margin: 0; 
      padding: 20px; 
    }
    h1 { 
      font-size: 14pt; 
      font-weight: bold; 
      color: #000000; 
      margin: 10px 0 15px; 
    }
    h2 { 
      font-size: 12pt; 
      font-weight: bold; 
      color: #000000; 
      margin: 20px 0 10px; 
    }
    p { 
      margin: 10px 0; 
      line-height: 1.6; 
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 15px 0; 
    }
    th, td { 
      border: 1px solid #000000; 
      padding: 8px; 
      text-align: left; 
    }
    th { 
      font-weight: bold; 
      background-color: #ffffff; 
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #000000; 
    }
  </style>
</head>
<body>
  <h1>VIỆC ƯU TIÊN CẦN HOÀN THÀNH</h1>
  
  <p><strong>Dear ${picName},</strong></p>
  
  <p>Chị gửi email để lưu ý em về việc hoàn thành các công việc ưu tiên sau đúng hạn, cụ thể:</p>
  
  <h2>Danh sách công việc ưu tiên (Tuần ${weekLabel})</h2>
  
  <table>
    <thead>
      <tr>
        <th>Row</th>
        <th>Key Task</th>
        <th>Sub Task</th>
        <th>Start Date</th>
        <th>Deadline</th>
        <th>Status</th>
        <th>HOD Comment</th>
      </tr>
    </thead>
    <tbody>
      ${tasks.map(task => `
      <tr>
        <td>${task.row || '-'}</td>
        <td>${task.key || task.keyTask || 'N/A'}</td>
        <td>${task.sub || task.subTask || 'N/A'}</td>
        <td>${task.start ? _formatDate(task.start, 'dd/MM/yy') : '-'}</td>
        <td>${task.deadline ? _formatDate(task.deadline, 'dd/MM/yy') : '-'}</td>
        <td>${task.status || 'Not Started'}</td>
        <td>${task.managerComment || task.comment || '-'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  
  <p style="margin-top: 20px;">Em vui lòng cập nhật tiến độ thường xuyên và báo cáo kịp thời nếu có khó khăn hoặc cần hỗ trợ.</p>

  <p><strong>Link cập nhật:</strong> <a href="${fileLink}" style="color: #000000; text-decoration: underline;">Google Sheet</a></p>
  
  <div class="footer">
    <p><strong>Trần Thái Tuyên</strong></p>
    <p>Marketing & Sales Manager</p>
    <p>Mani Medical Hanoi</p>
    <p>${currentDate}</p>
  </div>
</body>
</html>
  `;
}

/**
 * ✅ Build task table with HOD Comment column
 */
function _buildPriorityTaskTableWithComment(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<p style="text-align: center; color: #999;">Không có công việc nào.</p>';
  }
  
  const rows = tasks.map((task, index) => {
    const rowClass = task.priority ? 'priority-row' : '';
    const priorityIcon = task.priority ? '⭐' : '';
    const hodComment = task.managerComment || '-';
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 40px;">${index + 1}</td>
        <td style="text-align: center; width: 50px;">${priorityIcon}</td>
        <td style="width: 150px;">${_escapeHtml(task.key || 'N/A')}</td>
        <td style="width: 150px;">${_escapeHtml(task.sub || 'N/A')}</td>
        <td style="text-align: center; width: 80px;">${_fmtDateCell(task.start)}</td>
        <td class="deadline-cell" style="text-align: center; width: 80px;">${_fmtDateCell(task.deadline)}</td>
        <td style="text-align: center; width: 100px;">${_escapeHtml(task.status || 'N/A')}</td>
        <td class="comment-cell" style="width: 180px;">${_escapeHtml(hodComment)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="task-table">
      <thead>
        <tr>
          <th>#</th>
          <th>⭐</th>
          <th>Key Task</th>
          <th>Sub Task</th>
          <th>Start</th>
          <th>Deadline</th>
          <th>Status</th>
          <th>HOD Comment</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}
/**
 * Build bảng tasks cho Vietnam email template
 * @param {Array} currentWeekTasks - Tasks tuần này
 * @param {Array} nextWeekTasks - Tasks tuần tới
 * @return {String} HTML table
 */
/**
 * ✅ NEW: Build priority task table cho Vietnam email với HOD Comment
 * @param {Array} currentWeekTasks - Tasks trong tuần này
 * @param {Array} nextWeekTasks - Tasks tuần tới
 * @return {String} HTML table
 */
function _buildVietnamPriorityTaskTableForPIC(currentWeekTasks, nextWeekTasks) {
  let html = '';
  
  // Section 1: Current week tasks
  if (currentWeekTasks && currentWeekTasks.length > 0) {
    html += `
      <div class="task-section">
        <div class="section-title">
          📋 CÔNG VIỆC ƯU TIÊN TUẦN NÀY (${currentWeekTasks.length} việc)
        </div>
        ${_buildPriorityTaskTableHTML(currentWeekTasks)}
      </div>
    `;
  }
  
  // Section 2: Next week tasks
  if (nextWeekTasks && nextWeekTasks.length > 0) {
    html += `
      <div class="task-section">
        <div class="section-title">
          📅 KẾ HOẠCH ƯU TIÊN TUẦN TỚI (${nextWeekTasks.length} việc)
        </div>
        ${_buildPriorityTaskTableHTML(nextWeekTasks)}
      </div>
    `;
  }
  
  // No tasks message
  if (!html) {
    html = '<p style="text-align: center; color: #999; font-style: italic; padding: 20px;">Không có công việc ưu tiên nào.</p>';
  }
  
  return html;
}

/**
 * ✅ NEW: Build HTML table với đầy đủ columns bao gồm HOD Comment
 * @param {Array} tasks - Array of tasks
 * @return {String} HTML table
 */
function _buildPriorityTaskTableHTML(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<p style="text-align: center; color: #999;">Không có dữ liệu</p>';
  }
  
  const rows = tasks.map((task, index) => {
    const rowClass = task.priority ? 'priority-row' : '';
    const priorityIcon = task.priority ? '<span class="priority-icon">⭐</span>' : '';
    
    // Get HOD Comment
    const hodComment = task.managerComment || '-';
    
    // Format status với badge
    let statusBadge = '';
    const status = (task.status || '').toString().trim();
    if (status === 'Completed') {
      statusBadge = `<span class="status-badge status-completed">✅ ${status}</span>`;
    } else if (status.includes('Progress')) {
      statusBadge = `<span class="status-badge status-inprogress">🔄 ${status}</span>`;
    } else if (status === 'Not Started') {
      statusBadge = `<span class="status-badge status-notstarted">⏸️ ${status}</span>`;
    } else {
      statusBadge = status;
    }
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 40px; font-weight: 600;">${index + 1}</td>
        <td style="text-align: center; width: 50px;">${priorityIcon}</td>
        <td style="width: 140px;"><strong>${_escapeHtml(task.key || 'N/A')}</strong></td>
        <td style="width: 140px;">${_escapeHtml(task.sub || 'N/A')}</td>
        <td style="text-align: center; width: 80px;">${_fmtDateCell(task.start)}</td>
        <td class="deadline-cell" style="text-align: center; width: 80px;">${_fmtDateCell(task.deadline)}</td>
        <td style="text-align: center; width: 110px;">${statusBadge}</td>
        <td class="comment-cell" style="width: 180px;">${_escapeHtml(hodComment)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="task-table">
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th style="width: 50px;">⭐</th>
          <th style="width: 140px;">Key Task</th>
          <th style="width: 140px;">Sub Task</th>
          <th style="width: 80px;">Start</th>
          <th style="width: 80px;">Deadline</th>
          <th style="width: 110px;">Status</th>
          <th style="width: 180px;">💬 HOD Comment</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Get Google Sheet file link
 * @return {String} Sheet URL
 */
function _getFileLink() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getUrl();
  } catch (e) {
    console.error('Error getting file link:', e);
    return '';
  }
}/**
 * Get ALL roles for a user email (có thể có nhiều roles)
 * @param {string} userEmail - Email của user
 * @returns {Array<string>} Array of roles
 */
/**
 * ✅ FIXED: Lấy TẤT CẢ roles của user (với NULL SAFETY)
 * @param {string} userEmail - Email của user
 * @returns {Array<string>} Array of roles (có thể rỗng nếu không tìm thấy)
 */
function _getUserRoles(userEmail) {
  // ✅ FIX 1: VALIDATE INPUT - TRÁNH UNDEFINED/NULL
  if (!userEmail || typeof userEmail !== 'string') {
    console.warn('_getUserRoles: Invalid userEmail parameter:', userEmail);
    return [];
  }
  
  const rows = _fetchAllRows();
  const roles = new Set();
  
  // ✅ FIX 2: SAFE LOWERCASE CONVERSION
  let emailLower;
  try {
    emailLower = userEmail.trim().toLowerCase();
  } catch (error) {
    console.error('Error converting email to lowercase:', error);
    return [];
  }
  
  // Validate CONFIG constants before using
  if (!CONFIG || !CONFIG.ROLES) {
    console.error('CONFIG or CONFIG.ROLES is undefined');
    return [];
  }
  
  // 1. Check ADMIN first (highest priority)
  try {
    if (CONFIG.MANAGER_EMAIL && emailLower === CONFIG.MANAGER_EMAIL.toLowerCase()) {
      roles.add(CONFIG.ROLES.ADMIN);
    }
    if (CONFIG.GIANG_EMAIL && emailLower === CONFIG.GIANG_EMAIL.toLowerCase()) {
      roles.add(CONFIG.ROLES.ADMIN);
    }
  } catch (error) {
    console.error('Error checking admin emails:', error);
  }
  
  // 2. Check HOD_EMAILS config
  try {
    if (CONFIG.HOD_EMAILS && Array.isArray(CONFIG.HOD_EMAILS)) {
      if (CONFIG.HOD_EMAILS.some(email => email && email.toLowerCase() === emailLower)) {
        roles.add(CONFIG.ROLES.HOD);
      }
    }
  } catch (error) {
    console.error('Error checking HOD_EMAILS:', error);
  }
  
  // 3. Check ALL rows for PIC, HOD, Director emails
  for (const row of rows) {
    if (!row) continue; // Skip null/undefined rows
    
    try {
      // ✅ FIX 3: SAFE EMAIL COMPARISON với trim() và empty check
      // Check PIC Email (Column T)
      if (row.picEmail && typeof row.picEmail === 'string') {
        const picEmailLower = row.picEmail.trim().toLowerCase();
        if (picEmailLower && picEmailLower === emailLower) {
          roles.add(CONFIG.ROLES.PIC);
        }
      }
      
      // Check HOD Email (Column U)
      if (row.hodEmail && typeof row.hodEmail === 'string') {
        const hodEmailLower = row.hodEmail.trim().toLowerCase();
        if (hodEmailLower && hodEmailLower === emailLower) {
          roles.add(CONFIG.ROLES.HOD);
        }
      }
      
      // Check Director Email (Column V)
      if (row.directorEmail && typeof row.directorEmail === 'string') {
        const directorEmailLower = row.directorEmail.trim().toLowerCase();
        if (directorEmailLower && directorEmailLower === emailLower) {
          roles.add(CONFIG.ROLES.DIRECTOR);
        }
      }
    } catch (error) {
      console.error(`Error checking row ${row.row || 'unknown'}:`, error);
      continue; // Skip this row but continue checking others
    }
  }
  
  // Convert Set to Array
  const rolesArray = Array.from(roles);
  
  // Log for debugging
  console.log(`_getUserRoles for ${userEmail}: ${rolesArray.length > 0 ? rolesArray.join(', ') : 'NONE'}`);
  
  return rolesArray;
}/**
 * ✅ NEW: Kiểm tra xem user có ít nhất 1 trong các required roles không
 * Support MULTI-ROLE system - user có thể có nhiều roles đồng thời
 * 
 * @param {string} userEmail - Email của user cần check
 * @param {Array<string>} requiredRoles - Danh sách các roles được phép (ít nhất 1)
 * @returns {boolean} true nếu user có ít nhất 1 role trong danh sách
 * 
 * @example
 * // Check xem user có phải HOD hoặc ADMIN không
 * if (_checkUserHasAnyRole(email, [CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN])) {
 *   // Cho phép access
 * }
 */
/**
 * ✅ FIXED: Kiểm tra xem user có ít nhất 1 trong các required roles không
 * Support MULTI-ROLE system với NULL SAFETY
 * 
 * @param {string} userEmail - Email của user cần check
 * @param {Array<string>} requiredRoles - Danh sách các roles được phép (ít nhất 1)
 * @returns {boolean} true nếu user có ít nhất 1 role trong danh sách
 */
/**
 * ✅ NEW: Kiểm tra user có ít nhất 1 trong các required roles không
 * @param {string} userEmail - Email của user
 * @param {Array<string>} requiredRoles - Danh sách roles cần check
 * @returns {boolean} true nếu user có ít nhất 1 role matching
 */
function _checkUserHasAnyRole(userEmail, requiredRoles) {
  // Validation
  if (!userEmail || typeof userEmail !== 'string') {
    console.warn('_checkUserHasAnyRole: Invalid userEmail');
    return false;
  }
  
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
    console.warn('_checkUserHasAnyRole: Invalid requiredRoles');
    return false;
  }
  
  // Lấy TẤT CẢ roles của user
  let userRoles;
  try {
    userRoles = _getUserRoles(userEmail);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return false;
  }
  
  if (!userRoles || userRoles.length === 0) {
    console.log(`No roles found for user: ${userEmail}`);
    return false;
  }
  
  // Check xem có ít nhất 1 role matching không
  const hasPermission = userRoles.some(role => requiredRoles.includes(role));
  
  console.log(`Permission check for ${userEmail}:`);
  console.log(`  User roles: ${userRoles.join(', ')}`);
  console.log(`  Required: ${requiredRoles.join(', ')}`);
  console.log(`  Result: ${hasPermission}`);
  
  return hasPermission;
}/**
 * ✅ EMERGENCY DEBUG: Test all role-related functions
 * Run this from Apps Script Editor when encountering errors
 */
function emergencyDebugRoles() {
  console.log('=== EMERGENCY DEBUG START ===');
  
  try {
    // Test 1: Get current user
    const currentUser = _getCurrentUserEmail();
    console.log('✅ Current user:', currentUser);
    
    // Test 2: Check if user is valid
    if (!currentUser) {
      console.error('❌ Cannot get current user email');
      return;
    }
    
    // Test 3: Test _getUserRoles()
    console.log('\n--- Testing _getUserRoles() ---');
    const userRoles = _getUserRoles(currentUser);
    console.log('User roles:', userRoles);
    console.log('Roles count:', userRoles ? userRoles.length : 0);
    
    // Test 4: Test _checkUserHasAnyRole()
    console.log('\n--- Testing _checkUserHasAnyRole() ---');
    const hasHOD = _checkUserHasAnyRole(currentUser, [CONFIG.ROLES.HOD]);
    console.log('Has HOD role:', hasHOD);
    
    const hasHODorAdmin = _checkUserHasAnyRole(currentUser, [CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN]);
    console.log('Has HOD or Admin:', hasHODorAdmin);
    
    // Test 5: Check CONFIG
    console.log('\n--- Checking CONFIG ---');
    console.log('CONFIG.ROLES:', CONFIG.ROLES);
    console.log('CONFIG.HOD_EMAILS:', CONFIG.HOD_EMAILS);
    console.log('CONFIG.MANAGER_EMAIL:', CONFIG.MANAGER_EMAIL);
    
    // Test 6: Sample rows
    console.log('\n--- Checking Data Rows ---');
    const rows = _fetchAllRows();
    console.log('Total rows:', rows.length);
    
    if (rows.length > 0) {
      const sampleRow = rows[0];
      console.log('Sample row structure:');
      console.log('  picEmail:', sampleRow.picEmail);
      console.log('  hodEmail:', sampleRow.hodEmail);
      console.log('  directorEmail:', sampleRow.directorEmail);
    }
    
    // Show result in UI
    _getUi().alert(
      'Emergency Debug Complete',
      'Check the console (View > Logs) for detailed debug information.\n\n' +
      `Current User: ${currentUser}\n` +
      `Roles Found: ${userRoles ? userRoles.join(', ') : 'NONE'}\n` +
      `Total Data Rows: ${rows.length}`,
      _getUi().ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Emergency debug error:', error);
    console.error('Stack:', error.stack);
    
    _getUi().alert(
      'Emergency Debug Error',
      `Error: ${error.message}\n\nCheck the console for full stack trace.`,
      _getUi().ButtonSet.OK
    );
  }
  
  console.log('=== EMERGENCY DEBUG END ===');
}/**
 * ✅ NEW: Format week label from Monday to Saturday
 * @param {Date} monday - Monday date
 * @param {Date} saturday - Saturday date
 * @returns {string} Formatted label (dd/MM - dd/MM)
 */
function _formatWeekLabel(monday, saturday) {
  if (!monday || !saturday) return '';
  
  try {
    const startDay = monday.getDate().toString().padStart(2, '0');
    const startMonth = (monday.getMonth() + 1).toString().padStart(2, '0');
    
    const endDay = saturday.getDate().toString().padStart(2, '0');
    const endMonth = (saturday.getMonth() + 1).toString().padStart(2, '0');
    
    return `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
  } catch (error) {
    console.error('Error formatting week label:', error);
    return '';
  }
}/**
 * ✅ NEW: Process HOD reminder emails with 2 flows
 * @param {Array} filteredTasks - Filtered tasks from dialog
 * @param {Array} commentUpdates - HOD comment updates
 * @param {boolean} sendToTeam - Send to team or individual PIC
 */
function processHODReminderEmails(filteredTasks, commentUpdates, sendToTeam) {
  try {
    const sh = _sheet();
    const allRows = _fetchAllRows();
    const { monday, saturday } = _weekBounds(new Date());
    
    // ✅ 1. LẤY TẤT CẢ TASKS TRONG TUẦN HIỆN TẠI
    const thisWeekTasks = allRows.filter(r => {
      if (!r.start) return false;
      const startDate = new Date(r.start);
      return startDate >= monday && startDate <= saturday;
    });
    
    // ✅ 2. ĐỒNG BỘ PRIORITY: SET LẠI TẤT CẢ (bao gồm cả bỏ tick)
    thisWeekTasks.forEach(task => {
      const filteredTask = filteredTasks.find(ft => ft.row === task.row);
      const newPriorityValue = filteredTask ? filteredTask.priority : false;
      
      // Update cột S (Priority)
      sh.getRange(task.row, CONFIG.COL.PRIORITY).setValue(newPriorityValue);
    });
    
    // ✅ 3. UPDATE HOD COMMENTS
    if (commentUpdates && commentUpdates.length > 0) {
      commentUpdates.forEach(update => {
        sh.getRange(update.row, CONFIG.COL.MANAGER_COMMENT).setValue(update.comment);
      });
    }
    
    // Flush để đảm bảo ghi dữ liệu
    SpreadsheetApp.flush();
    
    // ✅ 4. CHỈ GỬI EMAIL CHO CÁC DÒNG CÓ PRIORITY = TRUE
    const tasksToEmail = filteredTasks.filter(t => t.priority === true);
    
    if (tasksToEmail.length === 0) {
      return '⚠️ Không có công việc ưu tiên nào được chọn để gửi email.';
    }
    
    // ✅ 5. GỬI EMAIL
    const currentUser = _getCurrentUserEmail();
    const weekLabel = `${_formatDate(monday, 'dd/MM')} - ${_formatDate(saturday, 'dd/MM')}`;
    const currentDate = _formatDateDDMMYYYY(new Date());
    
    if (sendToTeam) {
      return _sendTeamReminderEmail(tasksToEmail, weekLabel, currentUser);
    } else {
      return _sendIndividualPICReminder(tasksToEmail, weekLabel, currentDate, currentUser);
    }
    
  } catch (error) {
    console.error('Error in processHODReminderEmails:', error);
    throw new Error('Không thể gửi email: ' + error.message);
  }
}

/**
 * ✅ FLOW 1: Send team reminder using existing structure
 */
/**
 * ✅ FIXED: Send team reminder - GỬI CHO TẤT CẢ PICs
 * Email tổng hợp tất cả priority tasks, gửi cho tất cả PIC có tasks
 */
function _sendTeamReminderEmail(filteredTasks, weekLabel, hodEmail) {
  try {
    // Lấy full data từ sheet
    const allRows = _fetchAllRows();
    const { monday, saturday } = _weekBounds(new Date());
    
    // Lấy TẤT CẢ priority tasks trong tuần (bất kể filter)
    const allPriorityTasks = allRows.filter(r => {
      return r.priority && 
             r.start && 
             _isWithinWeek(r, monday, saturday);
    });
    
    if (allPriorityTasks.length === 0) {
      return '⚠️ Không có công việc ưu tiên nào để gửi email.';
    }
    
    // Collect TẤT CẢ PIC emails
    const allPICEmails = new Set();
    allPriorityTasks.forEach(task => {
      if (task.picEmail) {
        allPICEmails.add(task.picEmail.toLowerCase().trim());
      }
    });
    
    if (allPICEmails.size === 0) {
      return '❌ Không tìm thấy email của các PIC.';
    }
    
    // Convert Set to Array
    const recipientEmails = Array.from(allPICEmails).join(',');
    
    // Add weekType for email template
    const tasksWithWeekType = allPriorityTasks.map(task => ({
      ...task,
      weekType: 'current' // Tất cả đều là tuần hiện tại
    }));
    
    // Build email subject
    const subject = `[Priority Tasks] Team Marketing - Week ${weekLabel}`;
    
    // Build email HTML - GỬI CHO TEAM
    const htmlBody = _buildTeamPriorityReminderEmail(
      tasksWithWeekType,
      weekLabel,
      hodEmail
    );
    
    // Send email
    mmhMail_({
      to: recipientEmails,
      cc: hodEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: 'Marketing Task Management System'
    });
    
    const picCount = allPICEmails.size;
    return `✅ Đã gửi email nhắc việc ưu tiên cho ${picCount} PICs (${allPriorityTasks.length} công việc)`;
    
  } catch (error) {
    console.error('Error in _sendTeamReminderEmail:', error);
    throw new Error('Không thể gửi email team: ' + error.message);
  }
}

/**
 * ✅ FLOW 2: Send individual PIC reminder with filtered tasks
 */
function _sendIndividualPICReminder(filteredTasks, weekLabel, currentDate, hodEmail) {
  // Group by PIC
  const tasksByPIC = {};
  filteredTasks.forEach(task => {
    if (!tasksByPIC[task.pic]) {
      tasksByPIC[task.pic] = [];
    }
    tasksByPIC[task.pic].push(task);
  });
  
  let sentCount = 0;
  const allRows = _fetchAllRows();
  
  Object.keys(tasksByPIC).forEach(picName => {
    const picTasks = tasksByPIC[picName];
    
    // Get full task data
    const fullTasks = picTasks.map(ft => {
      const fullRow = allRows.find(r => r.row === ft.row);
      return fullRow || ft;
    });
    
    const picEmail = fullTasks[0].picEmail;
    if (!picEmail) return;
    
    // Build custom email for individual PIC
    const subject = `Email nhắc việc_${picName}_${currentDate}`;
    const htmlBody = _buildIndividualPICReminderEmail(
      picName,
      fullTasks,
      weekLabel,
      hodEmail
    );
    
    mmhMail_({
      to: picEmail,
      cc: hodEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: 'Marketing Task Management System'
    });
    
    sentCount++;
  });
  
  return `✅ Đã gửi email nhắc việc cá nhân cho ${sentCount} PIC`;
}/**
 * ✅ Format date thành chuỗi dd/MM/yyyy (Vietnamese format)
 * @param {Date} date - Date object cần format
 * @return {String} Date string trong format dd/MM/yyyy
 */
function _formatDateDDMMYYYY(date) {
  if (!date) return '';
  
  // Convert sang Date object nếu cần
  const d = date instanceof Date ? date : new Date(date);
  
  // Validate date
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}/**
 * ✅ NEW: Build email HTML cho TEAM (nhiều PICs)
 * Greeting: "Dear team"
 * Content: Nhắc việc cho tất cả PICs
 * @param {Array} tasks - All priority tasks
 * @param {String} weekLabel - Week label
 * @param {String} hodEmail - HOD email
 * @return {String} HTML content
 */
/**
 * ✅ UPDATED: Build email HTML cho TEAM với màu xanh chuyên nghiệp
 * Fix Outlook compatibility cho header
 */
function _buildTeamPriorityReminderEmail(tasks, weekLabel, hodEmail) {
  const currentDate = _formatDateDDMMYYYY(new Date());
  const fileLink = _getFileLink();
  
  // Build task table
  const taskTable = _buildTeamPriorityTaskTable(tasks);
  
  // Count PICs
  const uniquePICs = new Set(tasks.map(t => t.picName).filter(Boolean));
  const picCount = uniquePICs.size;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 14px; 
            line-height: 1.6; 
            color: #2c3e50; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
        }
        .email-container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: #ffffff; 
            border: 2px solid #3d4f5d; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .content { 
            padding: 30px 25px; 
            background: white;
        }
        .greeting { 
            font-size: 16px; 
            font-weight: 700; 
            color: #3d4f5d; 
            margin: 0 0 20px 0; 
        }
        .message { 
            margin: 15px 0; 
            text-align: justify; 
            line-height: 1.8;
            color: #2c3e50;
        }
        .priority-notice { 
            background: #eef2f5; 
            border: 2px solid #3d4f5d; 
            border-left: 6px solid #3d4f5d;
            padding: 20px; 
            border-radius: 8px; 
            margin: 25px 0; 
        }
        .priority-notice strong {
            color: #3d4f5d;
        }
        .task-section {
            margin: 30px 0;
        }
        .section-title {
            background: #3d4f5d;
            color: white;
            padding: 12px 15px;
            margin: 0 0 15px 0;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
        }
        .task-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 20px 0;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .task-table th {
            background: #3d4f5d;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #2c3e50;
        }
        .task-table td {
            padding: 10px 8px;
            border: 1px solid #dee2e6;
            vertical-align: top;
            color: #2c3e50;
        }
        .task-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .task-table tr:hover {
            background: #e8f4fd;
        }
        .priority-row {
            background: #fff3cd !important;
            font-weight: 600;
        }
        .deadline-cell {
            color: #e74c3c;
            font-weight: bold;
        }
        .comment-cell {
            background: #fffbea;
            font-style: italic;
            color: #856404;
            max-width: 180px;
            word-wrap: break-word;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            display: inline-block;
        }
        .status-completed {
            background: #d4edda;
            color: #155724;
        }
        .status-inprogress {
            background: #d1ecf1;
            color: #0c5460;
        }
        .status-notstarted {
            background: #f8d7da;
            color: #721c24;
        }
        .footer { 
            background: #ecf0f1; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #7f8c8d; 
            border-top: 2px solid #bdc3c7; 
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: #eef2f5;
            border: 2px solid #3d4f5d;
            border-radius: 8px;
        }
        .cta-button {
            display: inline-block;
            padding: 14px 35px;
            background: #3d4f5d;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 15px;
            box-shadow: 0 4px 6px rgba(61, 79, 93, 0.3);
        }
        .note-box {
            background: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 6px;
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- ✅ OUTLOOK-COMPATIBLE HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #3d4f5d;">
            <tr>
                <td align="center" style="padding: 25px 20px; background-color: #3d4f5d;">
                    <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-family: Arial, sans-serif; font-weight: bold;">
                        ⚠️ NHẮC NHỞ CÔNG VIỆC ƯU TIÊN
                    </h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #ffffff; font-family: Arial, sans-serif;">
                        Marketing Team Priority Tasks Reminder
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="content">
            <p class="greeting">Dear team,</p>
            
            <div class="message">
                Chị gửi email này để nhắc các em về việc hoàn thành các công việc ưu tiên đúng hạn. Các em vui lòng theo sát tiến độ và hoàn thành trước deadline theo các nội dung như sau:
            </div>
            
            <div class="priority-notice">
                <strong style="font-size: 15px;">📋 THÔNG TIN QUAN TRỌNG:</strong><br><br>
                📊 Tổng số công việc ưu tiên: <strong>${tasks.length} công việc</strong><br>
                👥 Số lượng PICs: <strong>${picCount} người</strong><br>
                📅 Ngày gửi nhắc nhở: <strong>${currentDate}</strong><br>
                📆 Tuần: <strong>${weekLabel}</strong><br>
                👤 Người gửi: <strong>${_getHODDisplayName(hodEmail)}</strong><br>
                ⏰ Yêu cầu: <strong style="color: #e74c3c;">Hoàn thành đúng deadline</strong>
            </div>
            
            <div class="section-title">
                📋 DANH SÁCH CÔNG VIỆC ƯU TIÊN (${tasks.length} việc)
            </div>
            
            ${taskTable}
            
            <div class="note-box">
                <strong style="color: #2c3e50;">📌 Lưu ý quan trọng:</strong><br>
                Các em vui lòng cập nhật tiến độ thường xuyên và báo cáo kịp thời nếu có khó khăn hoặc cần hỗ trợ.
            </div>
            
            ${fileLink ? `
            <div class="cta-section">
                <p style="margin: 0 0 15px 0; font-weight: bold; color: #3d4f5d; font-size: 16px;">
                    📊 Cập nhật tiến độ công việc tại đây:
                </p>
                <a href="${fileLink}" class="cta-button" style="color: white;">
                    📝 Mở Google Sheet
                </a>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p style="margin: 0; font-weight: 600; color: #2c3e50;">Marketing Task Management System</p>
            <p style="margin: 8px 0 0 0;">Auto-generated Team Priority Reminder | Sent on ${currentDate}</p>
        </div>
    </div>
</body>
</html>
  `;
}/**
 * ✅ NEW: Build task table cho team email
 * Columns: Row, PIC, Start Date, Key Task, Sub Task, Task Result, Status, HOD Comment
 * @param {Array} tasks - All priority tasks
 * @return {String} HTML table
 */
function _buildTeamPriorityTaskTable(tasks) {
  if (!tasks || tasks.length === 0) {
    return '<p style="text-align: center; color: #999;">Không có dữ liệu</p>';
  }
  
  // Group by PIC for better organization
  const tasksByPIC = {};
  tasks.forEach(task => {
    const pic = task.picName || 'Unknown';
    if (!tasksByPIC[pic]) {
      tasksByPIC[pic] = [];
    }
    tasksByPIC[pic].push(task);
  });
  
  let html = '';
  
  // Build table for each PIC
  Object.keys(tasksByPIC).sort().forEach(picName => {
    const picTasks = tasksByPIC[picName];
    
    html += `
      <div style="margin-bottom: 25px;">
        <h4 style="color: #e74c3c; margin: 15px 0 10px 0; padding-left: 5px; border-left: 4px solid #e74c3c;">
          👤 ${_escapeHtml(picName)} (${picTasks.length} công việc)
        </h4>
        ${_buildPriorityTaskTableWithAllColumns(picTasks)}
      </div>
    `;
  });
  
  return html;
}

/**
 * ✅ NEW: Build task table HTML với TẤT CẢ columns cần thiết
 * Columns: Row, Start Date, Key Task, Sub Task, Task Result, Status, HOD Comment
 * @param {Array} tasks - Tasks array
 * @return {String} HTML table
 */
function _buildPriorityTaskTableWithAllColumns(tasks) {
  const rows = tasks.map((task, index) => {
    const rowClass = task.priority ? 'priority-row' : '';
    const hodComment = task.managerComment || '-';
    
    // Format status với badge
    let statusBadge = '';
    const status = (task.status || '').toString().trim();
    if (status === 'Completed') {
      statusBadge = `<span class="status-badge status-completed">✅ ${status}</span>`;
    } else if (status.includes('Progress')) {
      statusBadge = `<span class="status-badge status-inprogress">🔄 ${status}</span>`;
    } else if (status === 'Not Started') {
      statusBadge = `<span class="status-badge status-notstarted">⏸️ ${status}</span>`;
    } else {
      statusBadge = status || '-';
    }
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 50px; font-weight: 600;">${task.row || '-'}</td>
        <td style="text-align: center; width: 80px;">${_fmtDateCell(task.start)}</td>
        <td style="width: 140px;"><strong>${_escapeHtml(task.key || '-')}</strong></td>
        <td style="width: 130px;">${_escapeHtml(task.sub || '-')}</td>
        <td style="width: 150px; font-size: 11px;">${_escapeHtml(task.result || '-')}</td>
        <td style="text-align: center; width: 100px;">${statusBadge}</td>
        <td class="comment-cell" style="width: 150px;">${_escapeHtml(hodComment)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="task-table">
      <thead>
        <tr>
          <th style="width: 50px;">Row</th>
          <th style="width: 80px;">Start Date</th>
          <th style="width: 140px;">Key Task</th>
          <th style="width: 130px;">Sub Task</th>
          <th style="width: 150px;">Task Result</th>
          <th style="width: 100px;">Status</th>
          <th style="width: 150px;">💬 HOD Comment</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}/**
 * ✅ Get HOD display name from email
 * @param {String} hodEmail - HOD email address
 * @return {String} Display name
 */
function _getHODDisplayName(hodEmail) {
  if (!hodEmail) return 'Test';
  
  const email = hodEmail.toLowerCase().trim();
  
  // Map emails to names
  const emailNameMap = {
    'tt.tuyen@manimedicalhanoi.com': 'Tuyên',
    'nt.ha@manimedicalhanoi.com': 'Hà'
  };
  
  return emailNameMap[email] || 'Test';
}/**
 * ✅ Enable daily reminders cho các PIC sau khi HOD gửi email nhắc việc
 * Lưu tracking data vào Properties Service
 * @param {Array} priorityTasks - Array of priority tasks đã gửi email
 * @param {String} hodEmail - Email của HOD gửi nhắc việc
 */
function _enableDailyRemindersForTasks(priorityTasks, hodEmail) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const trackingKey = 'DAILY_REMINDER_TRACKING';
    
    // Get existing tracking data
    let trackingData = {};
    const existingData = scriptProperties.getProperty(trackingKey);
    if (existingData) {
      trackingData = JSON.parse(existingData);
    }
    
    // Group tasks by PIC email
    const tasksByPIC = {};
    priorityTasks.forEach(task => {
      const picEmail = task.picEmail;
      if (!picEmail) return;
      
      if (!tasksByPIC[picEmail]) {
        tasksByPIC[picEmail] = {
          picName: task.picName,
          taskRows: [],
          hodEmail: hodEmail,
          enabledDate: new Date().toISOString()
        };
      }
      tasksByPIC[picEmail].taskRows.push(task.row);
    });
    
    // Merge with existing tracking
    Object.keys(tasksByPIC).forEach(picEmail => {
      if (trackingData[picEmail]) {
        // Merge task rows (avoid duplicates)
        const existingRows = trackingData[picEmail].taskRows || [];
        const newRows = tasksByPIC[picEmail].taskRows;
        trackingData[picEmail].taskRows = [...new Set([...existingRows, ...newRows])];
      } else {
        trackingData[picEmail] = tasksByPIC[picEmail];
      }
    });
    
    // Save back to Properties
    scriptProperties.setProperty(trackingKey, JSON.stringify(trackingData));
    
    console.log('Daily reminders enabled for PICs:', Object.keys(tasksByPIC));
    
  } catch (error) {
    console.error('Error enabling daily reminders:', error);
  }
}/**
 * ✅ MAIN FUNCTION: Send daily priority reminders
 * Chạy tự động mỗi ngày 8:30 AM
 * Gửi email cho các PIC có deadline tasks hôm nay hoặc quá hạn
 */
function sendDailyPriorityReminders() {
  try {
    console.log('=== STARTING DAILY PRIORITY REMINDERS ===');
    
    const scriptProperties = PropertiesService.getScriptProperties();
    const trackingKey = 'DAILY_REMINDER_TRACKING';
    const trackingData = scriptProperties.getProperty(trackingKey);
    
    if (!trackingData) {
      console.log('No tracking data found. No daily reminders to send.');
      return;
    }
    
    const tracking = JSON.parse(trackingData);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for comparison
    
    const allRows = _fetchAllRows();
    let emailsSent = 0;
    let tasksCompleted = 0;
    
    // Process each PIC
    Object.keys(tracking).forEach(picEmail => {
      const picTracking = tracking[picEmail];
      const picName = picTracking.picName;
      const hodEmail = picTracking.hodEmail;
      const trackedRows = picTracking.taskRows || [];
      
      // Get tasks for this PIC
      const picTasks = allRows.filter(r => 
        trackedRows.includes(r.row) && 
        r.priority && 
        r.picEmail === picEmail
      );
      
      if (picTasks.length === 0) {
        console.log(`No tasks found for ${picName}`);
        return;
      }
      
      // Separate tasks: on deadline today, overdue, completed
      const todayTasks = [];
      const overdueTasks = [];
      const completedTasks = [];
      
      picTasks.forEach(task => {
        const status = (task.status || '').toString().trim();
        
        // Check if completed
        if (status === 'Completed') {
          completedTasks.push(task.row);
          return;
        }
        
        // Check deadline
        if (!task.deadline) return;
        
        const deadline = new Date(task.deadline);
        deadline.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((today - deadline) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // Deadline is today
          todayTasks.push(task);
        } else if (diffDays > 0) {
          // Overdue
          task.daysPastDeadline = diffDays;
          overdueTasks.push(task);
        }
      });
      
      // Remove completed tasks from tracking
      if (completedTasks.length > 0) {
        picTracking.taskRows = trackedRows.filter(row => !completedTasks.includes(row));
        tasksCompleted += completedTasks.length;
      }
      
      // Send email if there are tasks due today or overdue
      const tasksToRemind = [...todayTasks, ...overdueTasks];
      
      if (tasksToRemind.length > 0) {
        const isOverdue = overdueTasks.length > 0;
        const maxDaysPast = isOverdue ? Math.max(...overdueTasks.map(t => t.daysPastDeadline)) : 0;
        
        const emailBody = _buildDailyReminderEmail(
          picName,
          todayTasks,
          overdueTasks,
          hodEmail,
          isOverdue,
          maxDaysPast
        );
        
        const subject = isOverdue 
          ? `⚠️ [OVERDUE] Daily Reminder - ${picName} - ${_formatDateDDMMYYYY(today)}`
          : `📌 Daily Deadline Reminder - ${picName} - ${_formatDateDDMMYYYY(today)}`;
        
        // Send email
        mmhMail_({
          to: picEmail,
          cc: hodEmail,
          subject: subject,
          htmlBody: emailBody,
          name: 'Marketing Task Management System'
        });
        
        emailsSent++;
        console.log(`Sent reminder to ${picName} (${tasksToRemind.length} tasks)`);
      }
    });
    
    // Update tracking (remove completed tasks)
    scriptProperties.setProperty(trackingKey, JSON.stringify(tracking));
    
    console.log(`=== DAILY REMINDERS COMPLETE ===`);
    console.log(`Emails sent: ${emailsSent}`);
    console.log(`Tasks completed: ${tasksCompleted}`);
    
  } catch (error) {
    console.error('Error in sendDailyPriorityReminders:', error);
    // Don't throw - allow trigger to continue
  }
}/**
 * ✅ Build HTML email cho daily reminder
 * @param {String} picName - PIC name
 * @param {Array} todayTasks - Tasks with deadline today
 * @param {Array} overdueTasks - Overdue tasks
 * @param {String} hodEmail - HOD email
 * @param {Boolean} isOverdue - Has overdue tasks
 * @param {Number} maxDaysPast - Max days past deadline
 * @return {String} HTML content
 */
function _buildDailyReminderEmail(picName, todayTasks, overdueTasks, hodEmail, isOverdue, maxDaysPast) {
  const currentDate = _formatDateDDMMYYYY(new Date());
  const fileLink = _getFileLink();
  const hodName = _getHODDisplayName(hodEmail);
  
  const allTasks = [...todayTasks, ...overdueTasks];
  const totalTasks = allTasks.length;
  
  // Build greeting message
  let greetingMessage = '';
  if (isOverdue) {
    greetingMessage = `
      <strong>Dear ${picName},</strong><br><br>
      Đã có <strong style="color: #e74c3c;">${maxDaysPast} ngày</strong> kể từ deadline để hoàn thành các công việc ưu tiên sau. 
      Vui lòng cập nhật lại tiến độ công việc.<br><br>
      <em style="font-size: 13px; color: #7f8c8d;">
        Hệ thống sẽ gửi email nhắc việc hàng ngày cho đến khi bạn xác nhận đã hoàn thành các công việc này.
      </em>
    `;
  } else {
    greetingMessage = `
      <strong>Dear ${picName},</strong><br><br>
      Hôm nay là deadline cho các công việc ưu tiên sau. 
      Hãy lưu ý để hoàn thành các công việc này theo đúng tiến độ.
    `;
  }
  
  // Build task table
  const taskTableHTML = _buildDailyReminderTaskTable(todayTasks, overdueTasks);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            font-size: 14px; 
            line-height: 1.6; 
            color: #2c3e50; 
            margin: 0; 
            padding: 20px; 
        }
        .email-container { 
            max-width: 900px; 
            margin: 0 auto; 
            background: #ffffff; 
            border: 2px solid ${isOverdue ? '#e74c3c' : '#3d4f5d'}; 
            border-radius: 8px; 
        }
        .content { padding: 25px; }
        .greeting { 
            font-size: 15px; 
            margin-bottom: 20px; 
            line-height: 1.8;
            background: ${isOverdue ? '#fff5f5' : '#eef2f5'};
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid ${isOverdue ? '#e74c3c' : '#3d4f5d'};
        }
        .info-box {
            background: #eef2f5;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .task-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
        }
        .task-table th {
            background: ${isOverdue ? '#e74c3c' : '#3d4f5d'};
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
        }
        .task-table td {
            border: 1px solid #ddd;
            padding: 10px 8px;
        }
        .task-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .overdue-row {
            background: #ffebee !important;
            font-weight: 600;
        }
        .today-row {
            background: #fff3cd !important;
        }
        .footer {
            background: #ecf0f1;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #7f8c8d;
            border-radius: 0 0 6px 6px;
        }
        .deadline-cell {
            color: #e74c3c;
            font-weight: bold;
        }
        .comment-cell {
            background: #fffbea;
            font-style: italic;
            color: #856404;
        }
        .cta-section {
            text-align: center;
            margin: 25px 0;
            padding: 20px;
            background: #e8f4fd;
            border-radius: 6px;
        }
        .cta-button {
            display: inline-block;
            padding: 12px 30px;
            background: ${isOverdue ? '#e74c3c' : '#3d4f5d'};
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
        }
        .auto-note {
            font-size: 11px;
            font-style: italic;
            color: #7f8c8d;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" 
               style="background-color: ${isOverdue ? '#e74c3c' : '#3d4f5d'};">
            <tr>
                <td align="center" style="padding: 20px; background-color: ${isOverdue ? '#e74c3c' : '#3d4f5d'};">
                    <h2 style="margin: 0; font-size: 22px; color: #ffffff; font-family: Arial, sans-serif;">
                        ${isOverdue ? '⚠️ NHẮC VIỆC QUÁ HẠN' : '📌 NHẮC VIỆC DEADLINE HÔM NAY'}
                    </h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; color: #ffffff; font-family: Arial, sans-serif;">
                        Daily Priority Tasks Reminder
                    </p>
                </td>
            </tr>
        </table>
        
        <div class="content">
            <div class="greeting">
                ${greetingMessage}
            </div>
            
            <div class="info-box">
                <strong style="font-size: 15px;">📋 CHI TIẾT:</strong><br><br>
                📊 Số lượng công việc ưu tiên: <strong>${totalTasks} công việc</strong><br>
                ${overdueTasks.length > 0 ? `🔴 Quá hạn: <strong style="color: #e74c3c;">${overdueTasks.length} công việc</strong><br>` : ''}
                ${todayTasks.length > 0 ? `📅 Deadline hôm nay: <strong>${todayTasks.length} công việc</strong><br>` : ''}
                👤 Nhắc việc: <strong>${hodName}</strong><br>
                📅 Ngày gửi: <strong>${currentDate}</strong>
            </div>
            
            ${taskTableHTML}
            
            ${fileLink ? `
            <div class="cta-section">
                <p style="margin: 0 0 15px 0; font-weight: bold; color: #2c3e50; font-size: 15px;">
                    📊 Vui lòng cập nhật tiến độ công việc tại đây:
                </p>
                <a href="${fileLink}" class="cta-button" style="color: white;">
                    📝 Cập nhật Google Sheet
                </a>
                <p class="auto-note">
                    Hệ thống nhắc việc sẽ tiếp tục cho đến khi công việc được xác nhận là "Completed"
                </p>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p style="margin: 5px 0;">Marketing Task Management System - Auto Daily Reminder</p>
            <p style="margin: 5px 0; font-size: 11px;">Sent on ${currentDate} at 8:30 AM</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * ✅ Build task table for daily reminder
 */
function _buildDailyReminderTaskTable(todayTasks, overdueTasks) {
  const allTasks = [...todayTasks, ...overdueTasks];
  
  if (allTasks.length === 0) {
    return '<p style="text-align: center; color: #999;">Không có công việc</p>';
  }
  
  const rows = allTasks.map((task, index) => {
    const isOverdue = task.daysPastDeadline > 0;
    const rowClass = isOverdue ? 'overdue-row' : 'today-row';
    const hodComment = task.managerComment || '-';
    
    return `
      <tr class="${rowClass}">
        <td style="text-align: center; width: 40px;">${index + 1}</td>
        <td style="width: 50px; text-align: center;">${task.row}</td>
        <td style="width: 150px;"><strong>${_escapeHtml(task.key || '-')}</strong></td>
        <td style="width: 140px;">${_escapeHtml(task.sub || '-')}</td>
        <td style="text-align: center; width: 80px;">${_fmtDateCell(task.start)}</td>
        <td class="deadline-cell" style="text-align: center; width: 80px;">
          ${_fmtDateCell(task.deadline)}
          ${isOverdue ? `<br><span style="font-size: 11px;">(+${task.daysPastDeadline} ngày)</span>` : ''}
        </td>
        <td style="text-align: center; width: 100px;">${_escapeHtml(task.status || '-')}</td>
        <td class="comment-cell" style="width: 150px;">${_escapeHtml(hodComment)}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="task-table">
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th style="width: 50px;">Row</th>
          <th style="width: 150px;">Key Task</th>
          <th style="width: 140px;">Sub Task</th>
          <th style="width: 80px;">Start</th>
          <th style="width: 80px;">Deadline</th>
          <th style="width: 100px;">Status</th>
          <th style="width: 150px;">💬 HOD Comment</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}/**
 * ✅ TEST FUNCTION: Preview daily reminder email HTML
 * Tạo sample data để test email template
 */
function testDailyReminderEmail() {
  const ui = _getUi();
  
  // Sample data - TODAY TASKS
  const todayTasks = [
    {
      row: 15,
      picName: 'Giang',
      key: 'Bleaching_Seminar_Iran',
      sub: 'Thi Ngoc Trang_Ho Chi Minh',
      result: 'Completed presentation',
      start: new Date('2025-10-06'),
      deadline: new Date(), // Today
      status: 'In Progress 75%',
      managerComment: 'Cần hoàn thành hôm nay',
      priority: true
    },
    {
      row: 20,
      picName: 'Giang',
      key: 'External Training',
      sub: 'I care _ Opthalmic Sutures',
      result: 'Draft ready',
      start: new Date('2025-10-07'),
      deadline: new Date(), // Today
      status: 'In Progress 50%',
      managerComment: 'Ưu tiên cao',
      priority: true
    }
  ];
  
  // Sample data - OVERDUE TASKS
  const overdueTasks = [
    {
      row: 10,
      picName: 'Giang',
      key: 'Research Report',
      sub: 'VietNam Dentistry Overview',
      result: 'In progress',
      start: new Date('2025-10-01'),
      deadline: new Date('2025-10-06'), // 2 days ago
      status: 'In Progress 25%',
      managerComment: 'Cần update gấp',
      priority: true,
      daysPastDeadline: 2
    }
  ];
  
  // Test ON-TIME email
  const onTimeEmail = _buildDailyReminderEmail(
    'Giang',
    todayTasks,
    [],
    'tt.tuyen@manimedicalhanoi.com',
    false,
    0
  );
  
  // Test OVERDUE email
  const overdueEmail = _buildDailyReminderEmail(
    'Giang',
    todayTasks,
    overdueTasks,
    'tt.tuyen@manimedicalhanoi.com',
    true,
    2
  );
  
  // Display both versions in dialog
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial; padding: 20px; }
        .tab-buttons { margin-bottom: 20px; }
        .tab-button { 
          padding: 10px 20px; 
          margin-right: 10px; 
          cursor: pointer; 
          border: 2px solid #3d4f5d;
          background: white;
          border-radius: 6px;
        }
        .tab-button.active { 
          background: #3d4f5d; 
          color: white; 
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        iframe { width: 100%; height: 600px; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <h2>📧 Preview Daily Reminder Email</h2>
      
      <div class="tab-buttons">
        <button class="tab-button active" onclick="showTab('ontime')">
          📌 On-time (Deadline hôm nay)
        </button>
        <button class="tab-button" onclick="showTab('overdue')">
          ⚠️ Overdue (Quá hạn 2 ngày)
        </button>
      </div>
      
      <div id="ontime" class="tab-content active">
        <h3>Email cho deadline hôm nay (không quá hạn)</h3>
        <iframe srcdoc="${_escapeHtml(onTimeEmail)}"></iframe>
      </div>
      
      <div id="overdue" class="tab-content">
        <h3>Email cho tasks quá hạn 2 ngày</h3>
        <iframe srcdoc="${_escapeHtml(overdueEmail)}"></iframe>
      </div>
      
      <script>
        function showTab(tabName) {
          document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
          
          document.getElementById(tabName).classList.add('active');
          event.target.classList.add('active');
        }
      </script>
    </body>
    </html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1000).setHeight(750),
    '📧 Preview Daily Reminder Email'
  );
}/**
 * ✅ Setup daily trigger để gửi reminders lúc 8:30 AM
 * Chạy function này 1 lần để kích hoạt trigger
 */
function setupDailyReminderTrigger() {
  try {
    // Delete existing triggers first
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendDailyPriorityReminders') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger - 8:30 AM every day
    ScriptApp.newTrigger('sendDailyPriorityReminders')
      .timeBased()
      .atHour(8)
      .nearMinute(30)
      .everyDays(1)
      .create();
    
    console.log('✅ Daily reminder trigger created successfully - will run at 8:30 AM every day');
    _getUi().alert('✅ Đã setup trigger thành công!\n\nHệ thống sẽ tự động gửi email nhắc việc vào 8:30 sáng hàng ngày.');
    
  } catch (error) {
    console.error('Error setting up trigger:', error);
    _getUi().alert('❌ Lỗi khi setup trigger: ' + error.message);
  }
}/**
 * ✅ Manual test - Gửi thử email cho 1 PIC cụ thể
 * Dùng để test trước khi enable trigger
 */
function manualTestDailyReminder() {
  const ui = _getUi();
  
  // Prompt for PIC email
  const response = ui.prompt(
    'Test Daily Reminder',
    'Nhập email PIC để test (ví dụ: mmh.product@manimedicalhanoi.com):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  const testPICEmail = response.getResponseText().trim();
  if (!testPICEmail) {
    ui.alert('⚠️ Vui lòng nhập email PIC');
    return;
  }
  
  // Get all priority tasks for this PIC
  const allRows = _fetchAllRows();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const picTasks = allRows.filter(r => 
    r.priority && 
    r.picEmail === testPICEmail &&
    r.status !== 'Completed'
  );
  
  if (picTasks.length === 0) {
    ui.alert(`⚠️ Không tìm thấy priority tasks cho email: ${testPICEmail}`);
    return;
  }
  
  // Separate today and overdue tasks
  const todayTasks = [];
  const overdueTasks = [];
  
  picTasks.forEach(task => {
    if (!task.deadline) return;
    
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - deadline) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      todayTasks.push(task);
    } else if (diffDays > 0) {
      task.daysPastDeadline = diffDays;
      overdueTasks.push(task);
    }
  });
  
  if (todayTasks.length === 0 && overdueTasks.length === 0) {
    ui.alert('⚠️ Không có tasks deadline hôm nay hoặc quá hạn.');
    return;
  }
  
  // Send test email
  const picName = picTasks[0].picName;
  const hodEmail = Session.getActiveUser().getEmail();
  const isOverdue = overdueTasks.length > 0;
  const maxDaysPast = isOverdue ? Math.max(...overdueTasks.map(t => t.daysPastDeadline)) : 0;
  
  const emailBody = _buildDailyReminderEmail(
    picName,
    todayTasks,
    overdueTasks,
    hodEmail,
    isOverdue,
    maxDaysPast
  );
  
  const subject = `[TEST] Daily Reminder - ${picName}`;
  
  mmhMail_({
    to: testPICEmail,
    cc: hodEmail,
    subject: subject,
    htmlBody: emailBody,
    name: 'Marketing Task Management System'
  });
  
  ui.alert(`✅ Đã gửi test email!\n\nTo: ${testPICEmail}\nTasks: ${todayTasks.length + overdueTasks.length}`);
}/**
 * ✅ Show HOD Progress Tracking User Guide
 * Hướng dẫn chi tiết về tính năng HOD Progress Tracking
 */
function showHODProgressTrackingGuide() {
  const ui = _getUi();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #2c3e50;
        }
        .container {
            max-width: 900px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
            background: linear-gradient(135deg, #3d4f5d, #2c3e50);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 15px;
        }
        .content {
            padding: 30px;
            max-height: 70vh;
            overflow-y: auto;
        }
        .section {
            margin-bottom: 35px;
            padding-bottom: 25px;
            border-bottom: 2px solid #ecf0f1;
        }
        .section:last-child {
            border-bottom: none;
        }
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #3d4f5d;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-icon {
            font-size: 24px;
        }
        .subsection {
            margin: 20px 0;
            padding-left: 20px;
            border-left: 3px solid #3d4f5d;
        }
        .subsection h4 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 16px;
        }
        .step-box {
            background: #eef2f5;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            border-left: 4px solid #3d4f5d;
        }
        .step-number {
            display: inline-block;
            background: #3d4f5d;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-weight: bold;
            margin-right: 10px;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 12px;
            margin: 8px 0;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 4px solid #28a745;
        }
        .feature-list li:before {
            content: "✓";
            color: #28a745;
            font-weight: bold;
            margin-right: 10px;
            font-size: 16px;
        }
        .warning-box {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .info-box {
            background: #d1ecf1;
            border: 1px solid #0c5460;
            border-left: 4px solid #0c5460;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .flow-diagram {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.8;
            overflow-x: auto;
        }
        .footer {
            background: #ecf0f1;
            padding: 20px;
            text-align: center;
            border-top: 2px solid #bdc3c7;
        }
        .btn-close {
            background: #3d4f5d;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
        }
        .btn-close:hover {
            background: #2c3e50;
        }
        .highlight {
            background: #fff3cd;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
        }
        .email-example {
            background: white;
            border: 2px solid #3d4f5d;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            font-size: 13px;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #ecf0f1;
        }
        .tab {
            padding: 12px 20px;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 15px;
            font-weight: 600;
            color: #7f8c8d;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
        }
        .tab.active {
            color: #3d4f5d;
            border-bottom-color: #3d4f5d;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 HOD PROGRESS TRACKING</h1>
            <p>Hướng dẫn sử dụng chi tiết - User Guide v2.0</p>
        </div>
        
        <div class="content">
            <!-- TABS -->
            <div class="tabs">
                <button class="tab active" onclick="showTab('overview')">📋 Tổng quan</button>
                <button class="tab" onclick="showTab('usage')">🚀 Hướng dẫn</button>
                <button class="tab" onclick="showTab('email')">📧 Email Auto</button>
                <button class="tab" onclick="showTab('faq')">❓ FAQ</button>
            </div>
            
            <!-- TAB 1: TỔNG QUAN -->
            <div id="overview" class="tab-content active">
                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">🎯</span>
                        Giới thiệu hệ thống
                    </div>
                    <p style="font-size: 15px; line-height: 1.8;">
                        <strong>HOD Progress Tracking</strong> là công cụ giúp HOD theo dõi, quản lý và nhắc việc 
                        cho team một cách hiệu quả. Hệ thống tự động hóa việc gửi email nhắc việc và theo dõi 
                        tiến độ công việc ưu tiên.
                    </p>
                </div>

                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">✨</span>
                        Tính năng chính
                    </div>
                    <ul class="feature-list">
                        <li><strong>Xem tiến độ theo tuần:</strong> Hiển thị tất cả công việc của team trong tuần hiện tại và tuần tới</li>
                        <li><strong>Filter thông minh:</strong> Lọc theo PIC, ngày, và trạng thái công việc</li>
                        <li><strong>Đánh dấu Priority:</strong> Tick chọn công việc ưu tiên cần nhắc việc</li>
                        <li><strong>HOD Comment:</strong> Thêm comment trực tiếp cho từng công việc</li>
                        <li><strong>Email nhắc việc cá nhân:</strong> Gửi email cho PIC cụ thể theo filter</li>
                        <li><strong>Email nhắc việc team:</strong> Gửi email cho tất cả PICs có priority tasks</li>
                        <li><strong>Email tự động hàng ngày:</strong> Hệ thống tự động nhắc việc vào 8:30 AM</li>
                    </ul>
                </div>

                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">👥</span>
                        Ai nhận được email?
                    </div>
                    
                    <div class="subsection">
                        <h4>📌 Email nhắc việc cá nhân (Individual)</h4>
                        <div class="info-box">
                            <strong>Người nhận:</strong> PIC của các dòng đang được lọc<br>
                            <strong>CC:</strong> HOD (người gửi)<br>
                            <strong>Subject:</strong> Email nhắc việc_[PIC]_[Ngày]
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>📢 Email nhắc việc team (Team-wide)</h4>
                        <div class="info-box">
                            <strong>Người nhận:</strong> TẤT CẢ PICs có priority tasks trong tuần<br>
                            <strong>CC:</strong> HOD (người gửi)<br>
                            <strong>Subject:</strong> [Priority Tasks] Team Marketing - Week [...]
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>⏰ Email tự động hàng ngày (Daily Auto)</h4>
                        <div class="info-box">
                            <strong>Thời gian:</strong> 8:30 AM mỗi ngày<br>
                            <strong>Người nhận:</strong> PIC có deadline = hôm nay HOẶC quá hạn<br>
                            <strong>CC:</strong> HOD đã gửi email nhắc việc ban đầu<br>
                            <strong>Dừng khi:</strong> Status = "Completed"
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: HƯỚNG DẪN SỬ DỤNG -->
            <div id="usage" class="tab-content">
                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">🚀</span>
                        Hướng dẫn sử dụng từng bước
                    </div>

                    <div class="step-box">
                        <div><span class="step-number">1</span><strong>Mở HOD Progress Tracking</strong></div>
                        <p style="margin: 10px 0 0 38px;">
                            Menu: <span class="highlight">HOD Menu → HOD Progress Tracking</span>
                        </p>
                    </div>

                    <div class="step-box">
                        <div><span class="step-number">2</span><strong>Xem danh sách công việc</strong></div>
                        <p style="margin: 10px 0 0 38px;">
                            Hệ thống hiển thị 2 tabs:<br>
                            • <strong>Công việc tuần này:</strong> Tất cả tasks có Start Date trong tuần<br>
                            • <strong>Kế hoạch tuần tới:</strong> Tasks có Start Date tuần sau
                        </p>
                    </div>

                    <div class="step-box">
                        <div><span class="step-number">3</span><strong>Lọc công việc (Optional)</strong></div>
                        <p style="margin: 10px 0 0 38px;">
                            Sử dụng các filter:<br>
                            • <strong>Xem theo PIC:</strong> Chỉ hiển thị tasks của 1 PIC<br>
                            • <strong>Kiểm tra theo ngày:</strong> Lọc theo Start Date<br>
                            • <strong>Xem theo trạng thái:</strong> Lọc theo Status
                        </p>
                    </div>

                    <div class="step-box">
                        <div><span class="step-number">4</span><strong>Đánh dấu Priority & Comment</strong></div>
                        <p style="margin: 10px 0 0 38px;">
                            • Tick vào checkbox <span class="highlight">Quan trọng</span> cho các việc ưu tiên<br>
                            • Nhập <span class="highlight">HOD Comment</span> vào cột cuối cùng<br>
                            • Comment sẽ được lưu vào sheet và hiển thị trong email
                        </p>
                    </div>

                    <div class="step-box">
                        <div><span class="step-number">5</span><strong>Gửi email nhắc việc</strong></div>
                        <p style="margin: 10px 0 0 38px;">
                            <strong>Option A - Nhắc cá nhân:</strong><br>
                            • KHÔNG tích "Nhắc việc cả team"<br>
                            • Click "Gửi email nhắc việc"<br>
                            • Email gửi cho PIC của các dòng đang lọc<br><br>
                            
                            <strong>Option B - Nhắc cả team:</strong><br>
                            • TÍCH vào "Nhắc việc cả team"<br>
                            • Click "Gửi email nhắc việc"<br>
                            • Email gửi cho TẤT CẢ PICs có priority tasks
                        </p>
                    </div>

                    <div class="warning-box">
                        <strong>⚠️ Lưu ý quan trọng:</strong><br>
                        • Filter chỉ ảnh hưởng đến email CÁ NHÂN<br>
                        • Email TEAM luôn gửi cho TẤT CẢ priority tasks trong tuần<br>
                        • HOD Comment sẽ được lưu vào sheet khi gửi email
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">📊</span>
                        Thống kê và Metrics
                    </div>
                    <p>Phần đầu dialog hiển thị:</p>
                    <ul style="line-height: 2;">
                        <li><strong>Tổng công việc:</strong> Số lượng tasks trong tuần</li>
                        <li><strong>Hoàn thành:</strong> Tasks có Status = "Completed"</li>
                        <li><strong>Đang thực hiện:</strong> Tasks có Status = "In Progress..."</li>
                        <li><strong>Việc quan trọng:</strong> Số tasks được đánh dấu Priority</li>
                    </ul>
                </div>
            </div>

            <!-- TAB 3: EMAIL TỰ ĐỘNG -->
            <div id="email" class="tab-content">
                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">📧</span>
                        Email nhắc việc tự động hàng ngày
                    </div>
                    
                    <div class="subsection">
                        <h4>🔄 Cách hoạt động</h4>
                        <div class="flow-diagram">
HOD gửi email nhắc việc (Cá nhân HOẶC Team)
    ↓
Hệ thống lưu tracking cho các priority tasks
    ↓
Mỗi ngày 8:30 AM
    ↓
Kiểm tra deadline tasks:
  • Deadline = hôm nay?      → Gửi email "Deadline hôm nay"
  • Deadline đã qua?         → Gửi email "Quá hạn X ngày"
  • Status = "Completed"?    → Dừng gửi email cho task này
    ↓
Gửi email riêng cho từng PIC
    ↓
Tiếp tục hàng ngày cho đến khi PIC update Status = "Completed"
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>📅 Khi nào email được gửi?</h4>
                        <div class="step-box">
                            <strong>Trường hợp 1: Deadline hôm nay</strong>
                            <p style="margin: 10px 0 0 0;">
                                • Gửi vào 8:30 AM ngày deadline<br>
                                • Subject: 📌 Daily Deadline Reminder<br>
                                • Nội dung: "Hôm nay là deadline cho các công việc ưu tiên sau..."
                            </p>
                        </div>

                        <div class="step-box">
                            <strong>Trường hợp 2: Quá hạn (Overdue)</strong>
                            <p style="margin: 10px 0 0 0;">
                                • Gửi vào 8:30 AM mỗi ngày sau deadline<br>
                                • Subject: ⚠️ [OVERDUE] Daily Reminder<br>
                                • Nội dung: "Đã có X ngày kể từ deadline..."<br>
                                • Email có màu đỏ để nhấn mạnh
                            </p>
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>🛑 Khi nào email DỪNG gửi?</h4>
                        <div class="info-box">
                            Email tự động sẽ DỪNG gửi khi:<br>
                            • PIC cập nhật Status = <span class="highlight">"Completed"</span> cho task đó<br>
                            • Task được remove khỏi priority (bỏ tick Priority)
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>📧 Nội dung email tự động</h4>
                        <div class="email-example">
                            <strong style="color: #3d4f5d;">📌 Email Deadline hôm nay:</strong><br><br>
                            Dear [PIC],<br><br>
                            Hôm nay là deadline cho các công việc ưu tiên sau. 
                            Hãy lưu ý để hoàn thành các công việc này theo đúng tiến độ.<br><br>
                            
                            <strong>📋 CHI TIẾT:</strong><br>
                            • Số lượng công việc: X công việc<br>
                            • Nhắc việc: [HOD Name]<br><br>
                            
                            [Bảng danh sách tasks với columns: Row, Key Task, Sub Task, Start, Deadline, Status, HOD Comment]<br><br>
                            
                            📊 Vui lòng cập nhật tiến độ công việc tại đây: [Link to Sheet]<br>
                            <em style="font-size: 11px; color: #7f8c8d;">
                                Hệ thống nhắc việc sẽ tiếp tục cho đến khi công việc được xác nhận là "Completed"
                            </em>
                        </div>

                        <div class="email-example" style="border-color: #e74c3c;">
                            <strong style="color: #e74c3c;">⚠️ Email Quá hạn:</strong><br><br>
                            Dear [PIC],<br><br>
                            Đã có <strong style="color: #e74c3c;">X ngày</strong> kể từ deadline để hoàn thành các công việc ưu tiên sau. 
                            Vui lòng cập nhật lại tiến độ công việc.<br><br>
                            
                            <em style="font-size: 13px; color: #7f8c8d;">
                                Hệ thống sẽ gửi email nhắc việc hàng ngày cho đến khi bạn xác nhận đã hoàn thành các công việc này.
                            </em><br><br>
                            
                            [Same format as above]
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 4: FAQ -->
            <div id="faq" class="tab-content">
                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">❓</span>
                        Câu hỏi thường gặp
                    </div>

                    <div class="subsection">
                        <h4>1. Làm sao để dừng email tự động cho 1 task?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> PIC cần update Status của task đó thành "Completed" trên Google Sheet. 
                            Hệ thống sẽ tự động dừng gửi email cho task đó từ ngày hôm sau.
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>2. Email team gửi cho ai?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Email team gửi cho TẤT CẢ PICs có ít nhất 1 priority task trong tuần, 
                            bất kể bạn có filter hay không. Filter chỉ ảnh hưởng đến email cá nhân.
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>3. HOD Comment có bắt buộc không?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Không bắt buộc. Bạn có thể để trống. Tuy nhiên, comment giúp 
                            PIC hiểu rõ hơn về yêu cầu và sẽ được hiển thị trong email nhắc việc.
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>4. Có thể xem lại email đã gửi không?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Có. Tất cả email đã gửi đều có trong Sent folder của email bạn. 
                            Email có CC cho HOD nên bạn sẽ nhận được bản copy.
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>5. Nếu task chưa đến deadline thì có nhận email không?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Email tự động CHỈ gửi khi:<br>
                            • Deadline = hôm nay, HOẶC<br>
                            • Deadline đã qua (overdue)<br>
                            Nếu deadline còn xa thì chưa nhận email tự động.
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>6. Email tự động gửi vào thời gian nào?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Email tự động được gửi vào <strong>8:30 AM mỗi ngày</strong> 
                            (giờ Việt Nam). Thời gian này được cài đặt trong trigger tự động.
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>7. Có thể test email trước khi gửi không?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Có. Bạn có thể:<br>
                            • Preview nội dung ngay trong dialog trước khi click gửi<br>
                            • Gửi test cho chính mình bằng cách filter 1 task và gửi email cá nhân
                        </div>
                    </div>

                    <div class="subsection">
                        <h4>8. Priority checkbox có ảnh hưởng gì?</h4>
                        <div class="info-box">
                            <strong>Trả lời:</strong> Priority checkbox quyết định:<br>
                            • Task có được gửi email nhắc việc hay không<br>
                            • Task có nhận email tự động hàng ngày hay không<br>
                            • Task có được highlight màu vàng trong email hay không
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">
                        <span class="section-icon">💡</span>
                        Tips & Best Practices
                    </div>
                    <ul class="feature-list">
                        <li>Chỉ đánh dấu Priority cho các việc THỰC SỰ quan trọng</li>
                        <li>Sử dụng HOD Comment để clarify requirements</li>
                        <li>Gửi email cá nhân khi cần nhắc 1-2 PICs cụ thể</li>
                        <li>Gửi email team khi muốn remind toàn bộ team về priorities</li>
                        <li>Check tracking data định kỳ để đảm bảo email auto hoạt động tốt</li>
                        <li>Khuyến khích PICs update Status thường xuyên để tránh spam email</li>
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <button class="btn-close" onclick="google.script.host.close()">
                Đóng hướng dẫn
            </button>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Deactivate all tab buttons
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Activate clicked tab button
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
  `;
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(950).setHeight(700),
    '📖 HOD Progress Tracking - User Guide'
  );
}/**
 * 📊 LẤY DATA TỪ MONTH SHEET VỚI ĐẦY ĐỦ THÔNG TIN
 * Columns: D=Month, E=Type, F=Key Task, G=PIC, H=Deadline, I=Status, J=Plan&Report, K=Priority
 */
/**
 * ✅ ENHANCED: Get Monthly Plan Data với Rich Text Links support
 * Lấy cả hyperlinks từ chip links trong cột Plan & Report
 */
function getMonthlyPlanDataImproved(selectedMonth) {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) {
      console.error('MONTH sheet not found');
      return [];
    }
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) {
      console.log('No data in MONTH sheet (lastRow < 6)');
      return [];
    }
    
    // Column mapping (1-based):
    // B=2: Serial#, C=3: Empty check, D=4: Month, E=5: Type Task, 
    // F=6: Key Task, G=7: PIC, H=8: Deadline, I=9: Status, 
    // J=10: Plan & Report, K=11: Priority
    
    // Đọc từ column B đến K (10 columns)
    const dataRange = monthSheet.getRange(6, 2, lastRow - 5, 10);
    const values = dataRange.getValues();
    
    console.log(`Reading ${values.length} rows from MONTH sheet`);
    
    const monthData = [];
    
    values.forEach((row, index) => {
      const actualRow = index + 6;
      
      // row[0] = B (Serial), row[1] = C (empty check), row[2] = D (Month)
      // row[3] = E (Type), row[4] = F (Key), row[5] = G (PIC)
      // row[6] = H (Deadline), row[7] = I (Status)
      // row[8] = J (Plan & Report), row[9] = K (Priority)
      
      const monthValue = row[2] ? row[2].toString().trim() : '';
      
      // Filter theo month nếu có
      if (selectedMonth && monthValue !== selectedMonth.toString().trim()) {
        return;
      }
      
      // ✅ Format deadline cho HTML date input (YYYY-MM-DD)
      let deadlineStr = '';
      let deadlineDisplay = '';
      if (row[6]) {
        try {
          const d = new Date(row[6]);
          if (!isNaN(d.getTime())) {
            deadlineStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            deadlineDisplay = Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
          }
        } catch (e) {
          deadlineStr = String(row[6]);
          deadlineDisplay = String(row[6]);
        }
      }
      
      // ✅ Get Plan & Report với Rich Text và Links
      let planReportText = row[8] ? String(row[8]) : '';
      let planReportHtml = _convertUrlsToChipLinksHtml(planReportText);
      
      // Cố gắng lấy rich text nếu có
      try {
        const richTextData = _getRichTextAndLinks(monthSheet, actualRow, 10); // Column J
        if (richTextData.htmlFormatted) {
          planReportHtml = richTextData.htmlFormatted;
          planReportText = richTextData.text;
        }
      } catch (e) {
        console.warn(`Could not get rich text for row ${actualRow}:`, e.message);
      }
      
      monthData.push({
        rowNumber: actualRow,
        serialNumber: row[0] ? String(row[0]) : '',
        month: monthValue,
        typeTask: row[3] ? String(row[3]).trim() : '',
        keyTask: row[4] ? String(row[4]).trim() : '',
        pic: row[5] ? String(row[5]).trim() : '',
        deadline: deadlineStr,
        deadlineDisplay: deadlineDisplay,
        status: row[7] ? String(row[7]).trim() : 'Not Started',
        planReport: planReportText,
        planReportHtml: planReportHtml,
        priority: row[9] === true || row[9] === 'TRUE' || row[9] === 'true'
      });
    });
    
    console.log(`Filtered ${monthData.length} tasks with valid data`);
    return monthData;
    
  } catch (error) {
    console.error('Error in getMonthlyPlanDataImproved:', error);
    throw new Error(`Failed to get monthly data: ${error.message}`);
  }
}
function _getAvailableMonthsImproved() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    // Đọc column D (Month)
    const monthValues = monthSheet.getRange(6, 4, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '' && v.toString().length === 6)
      .map(v => v.toString().trim());
    
    return [...new Set(monthValues)].sort().reverse();
  } catch (error) {
    console.error('Error getting available months:', error);
    return [];
  }
}

/**
 * ✅ NEW: Extract text và links từ RichTextValue
 * Trả về object chứa text gốc và array các links
 */
function _extractRichTextWithLinks(richText) {
  if (!richText) {
    return { text: '', links: [] };
  }
  
  const text = richText.getText();
  const links = [];
  
  // Lấy tất cả runs từ rich text
  const runs = richText.getRuns();
  
  runs.forEach(run => {
    const url = run.getLinkUrl();
    if (url) {
      const linkText = run.getText();
      links.push({
        text: linkText,
        url: url
      });
    }
  });
  
  // Cũng detect URLs trong plain text (không phải hyperlink)
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const plainUrls = text.match(urlPattern) || [];
  
  plainUrls.forEach(url => {
    // Chỉ thêm nếu chưa có trong links
    const exists = links.some(l => l.url === url);
    if (!exists) {
      // Lấy tên file/folder từ URL nếu có thể
      const displayName = _getDisplayNameFromUrl(url);
      links.push({
        text: displayName,
        url: url
      });
    }
  });
  
  return { text: text, links: links };
}

/**
 * ✅ NEW: Lấy display name từ URL (tên file/folder)
 */
function _getDisplayNameFromUrl(url) {
  try {
    // Google Drive file/folder
    if (url.includes('drive.google.com')) {
      // Thử lấy tên từ Drive API
      const fileIdMatch = url.match(/[-\w]{25,}/);
      if (fileIdMatch) {
        try {
          const file = DriveApp.getFileById(fileIdMatch[0]);
          return file.getName();
        } catch (e) {
          try {
            const folder = DriveApp.getFolderById(fileIdMatch[0]);
            return folder.getName();
          } catch (e2) {
            // Fallback: return shortened URL
            return 'Drive Link';
          }
        }
      }
    }
    
    // Google Docs/Sheets/Slides
    if (url.includes('docs.google.com')) {
      const fileIdMatch = url.match(/\/d\/([-\w]+)/);
      if (fileIdMatch) {
        try {
          const file = DriveApp.getFileById(fileIdMatch[1]);
          return file.getName();
        } catch (e) {
          return 'Google Doc';
        }
      }
    }
    
    // Default: return hostname + path
    const urlObj = new URL(url);
    return urlObj.hostname;
    
  } catch (e) {
    // Fallback
    return url.length > 30 ? url.substring(0, 30) + '...' : url;
  }
}

/**
 * Helper: Format month từ YYYYMM sang MM/YYYY
 */
function _formatMonthDisplay(yyyymm) {
  if (!yyyymm || yyyymm.toString().length !== 6) return '';
  
  const year = yyyymm.toString().substring(0, 4);
  const month = yyyymm.toString().substring(4, 6);
  
  return `${month}/${year}`;
}

/**
 * Helper: Lấy danh sách unique months từ MONTH sheet
 */
function _getAvailableMonths() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    // Đọc column D (Month)
    const monthValues = monthSheet.getRange(6, 4, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().length === 6)
      .map(v => v.toString());
    
    // Get unique và sort (latest first)
    return [...new Set(monthValues)].sort().reverse();
    
  } catch (error) {
    console.error('Error getting available months:', error);
    return [];
  }
}

/**
 * Helper: Lấy danh sách unique PICs từ MONTH sheet
 */
function _getMonthlyPICs() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    // Đọc column G (PIC)
    const picValues = monthSheet.getRange(6, 7, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    // Get unique và sort
    return [...new Set(picValues)].sort();
    
  } catch (error) {
    console.error('Error getting PICs:', error);
    return [];
  }
}/**
 * 🆕 MAIN FUNCTION: Hiển thị dialog "Cập nhật kế hoạch tháng - MKT Team"
 * Cho phép cả PIC và HOD sử dụng
 */
/**
 * 🆕 ADVANCED MONTHLY UPDATE DIALOG - PHIÊN BẢN HOÀN CHỈNH
 * Features:
 * ✅ Smart autocomplete cho Type Task, Key Task, PIC
 * ✅ Date picker cho Deadline
 * ✅ Status dropdown 5 levels
 * ✅ Rich text formatting cho Plan & Report
 * ✅ Add new row functionality
 * ✅ Real-time statistics (chỉ đếm dòng có Type Task)
 * ✅ Real-time color coding
 * ✅ Auto-save với data validation handling
 */
/**
 * 🆕 ADVANCED MONTHLY UPDATE DIALOG - PHIÊN BẢN CẢI THIỆN
 * ✅ Chỉ load các dòng có thay đổi
 * ✅ Bảo vệ dòng 1-5 (header area)
 * ✅ Change tracking với data attributes
 */
/**
 * ============================================================================
 * 🎯 showMonthlyUpdateDialog - PHIÊN BẢN MỚI
 * ============================================================================
 * 📅 Updated: 2025
 * 📝 Thay đổi chính:
 *    - Layout Master-Detail sau khi Apply Filter
 *    - Font Calibri, màu nền #f9f9f9, highlight #3b5998
 *    - Tạo PDF không gửi email, lưu vào folder chỉ định
 * ============================================================================
 */
function _findFirstEmptyRowByColumnC(monthSheet) {
  const START_ROW = 6;
  const lastRow = monthSheet.getLastRow();
  
  if (lastRow < START_ROW) {
    console.log(`Sheet has only ${lastRow} rows, returning row ${START_ROW}`);
    return START_ROW;
  }
  
  // Đọc column C từ dòng 6 đến cuối
  const colCValues = monthSheet.getRange(START_ROW, 3, lastRow - START_ROW + 1, 1).getValues();
  
  // Tìm dòng đầu tiên có column C trống
  for (let i = 0; i < colCValues.length; i++) {
    const value = colCValues[i][0];
    if (!value || value.toString().trim() === '') {
      const foundRow = START_ROW + i;
      console.log(`Found empty row at ${foundRow} (column C is empty)`);
      return foundRow;
    }
  }
  
  // Nếu không tìm thấy, trả về dòng tiếp theo sau lastRow
  console.log(`No empty row found in column C, returning row ${lastRow + 1}`);
  return lastRow + 1;
}

/**
 * ✅ IMPROVED: Safe set value với xử lý Data Validation và Rich Text
 * @param {Sheet} sheet - Sheet object
 * @param {number} row - Row number
 * @param {number} col - Column number
 * @param {any} value - Value to set
 * @param {boolean} preserveRichText - Whether to preserve rich text formatting
 */
function _safeSetValueForMONTHImproved(sheet, row, col, value, preserveRichText = false) {
  try {
    const cell = sheet.getRange(row, col);
    
    // Lưu validation rule hiện tại
    const validation = cell.getDataValidation();
    
    // Xóa validation tạm thời
    if (validation) {
      cell.clearDataValidations();
    }
    
    // Set giá trị
    if (preserveRichText && typeof value === 'object' && value.richTextValue) {
      cell.setRichTextValue(value.richTextValue);
    } else {
      cell.setValue(value);
    }
    
    // Khôi phục validation nếu có
    if (validation) {
      try {
        cell.setDataValidation(validation);
      } catch (e) {
        console.warn(`Could not restore validation for cell (${row}, ${col}):`, e.message);
      }
    }
    
    return true;
  } catch (e) {
    console.error(`Error updating cell (${row}, ${col}):`, e.message);
    return false;
  }
}
function _createRichTextWithLinks(text) {
  if (!text) return null;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const textStr = String(text);
  
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  
  // Build rich text
  const builder = SpreadsheetApp.newRichTextValue().setText(textStr);
  
  let match;
  while ((match = urlPattern.exec(textStr)) !== null) {
    const url = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + url.length;
    
    try {
      builder.setLinkUrl(startIndex, endIndex, url);
    } catch (e) {
      console.warn('Could not set link URL:', e.message);
    }
  }
  
  return builder.build();
}

/**
 * ✅ NEW: Lấy text và links từ RichTextValue của cell
 * @param {Sheet} sheet - Sheet object
 * @param {number} row - Row number
 * @param {number} col - Column number
 * @returns {Object} - { text: string, links: Array<{text, url}>, htmlFormatted: string }
 */
function _getRichTextAndLinks(sheet, row, col) {
  const cell = sheet.getRange(row, col);
  const richText = cell.getRichTextValue();
  
  const result = {
    text: cell.getValue() ? String(cell.getValue()) : '',
    links: [],
    htmlFormatted: ''
  };
  
  if (!richText) {
    // Fallback: detect URLs trong plain text
    result.htmlFormatted = _convertUrlsToChipLinksHtml(result.text);
    return result;
  }
  
  const text = richText.getText();
  result.text = text;
  
  // Lấy tất cả runs từ rich text
  const runs = richText.getRuns();
  let htmlParts = [];
  let lastEnd = 0;
  
  runs.forEach(run => {
    const runText = run.getText();
    const linkUrl = run.getLinkUrl();
    const startIndex = run.getStartIndex();
    const endIndex = run.getEndIndex();
    
    // Thêm text trước run nếu có
    if (startIndex > lastEnd) {
      const plainText = text.substring(lastEnd, startIndex);
      htmlParts.push(_escapeHtml(plainText));
    }
    
    if (linkUrl) {
      // Đây là hyperlink
      result.links.push({
        text: runText,
        url: linkUrl
      });
      htmlParts.push(`<a href="${_escapeHtml(linkUrl)}" target="_blank" class="chip-link">🔗 ${_escapeHtml(runText)}</a>`);
    } else {
      htmlParts.push(_escapeHtml(runText));
    }
    
    lastEnd = endIndex;
  });
  
  // Thêm text còn lại
  if (lastEnd < text.length) {
    const remaining = text.substring(lastEnd);
    htmlParts.push(_escapeHtml(remaining));
  }
  
  result.htmlFormatted = htmlParts.join('').replace(/\n/g, '<br>');
  
  // Nếu không có links trong rich text, detect URLs trong plain text
  if (result.links.length === 0) {
    result.htmlFormatted = _convertUrlsToChipLinksHtml(text);
  }
  
  return result;
}

/**
 * ✅ NEW: Convert URLs trong text thành chip links HTML
 * @param {string} text - Text có thể chứa URLs
 * @returns {string} - HTML với chip links
 */
function _convertUrlsToChipLinksHtml(text) {
  if (!text) return '';
  
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(urlPattern, function(url) {
      let displayUrl = url;
      try {
        const urlObj = new URL(url);
        displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 20) + '...' : urlObj.pathname);
      } catch (e) {
        displayUrl = url.length > 35 ? url.substring(0, 35) + '...' : url;
      }
      return `<a href="${url}" target="_blank" class="chip-link">🔗 ${displayUrl}</a>`;
    });
}

/**
 * ✅ HTML escape helper
 */
function _escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function showMonthlyUpdateDialogImproved() {
  const ui = SpreadsheetApp.getUi();
  const currentUser = Session.getActiveUser().getEmail();
  
  // Check permission (giả sử function này đã có)
  // if (!_checkUserHasAnyRole(currentUser, [CONFIG.ROLES.PIC, CONFIG.ROLES.HOD, CONFIG.ROLES.ADMIN])) {
  //   ui.alert('⛔ Access denied. PIC, HOD or Admin role required.');
  //   return;
  // }
  
  const userName = currentUser.split('@')[0] || 'User';
  
  // Lấy available months và PICs
  const availableMonths = _getAvailableMonthsImproved();
  const availablePICs = _getMonthlyPICsFromSheetImproved();
  
  if (availableMonths.length === 0) {
    ui.alert('⚠ Không có dữ liệu trong MONTH sheet.\nVui lòng kiểm tra sheet configuration.');
    return;
  }
  
  // Lấy autocomplete options (giả sử functions này đã có)
  const typeOptions = _getTypeOptionsFromMasterSafe();
  const keyTaskOptions = _getKeyTaskOptionsFromMasterSafe();
  
  // Lấy tất cả data từ MONTH sheet
  const allData = getMonthlyPlanDataImproved(null);
  
  // Tính thống kê theo Type Task
  const typeTaskStats = {};
  allData.forEach(task => {
    if (task.typeTask && task.typeTask.trim() !== '') {
      const type = task.typeTask.trim();
      typeTaskStats[type] = (typeTaskStats[type] || 0) + 1;
    }
  });
  
  // Lấy tháng hiện tại (format YYYYMM)
  const currentDate = new Date();
  const currentMonth = currentDate.getFullYear().toString() + 
                      (currentDate.getMonth() + 1).toString().padStart(2, '0');

  // Build month options
  const monthOptions = availableMonths.map(month => {
    const year = month.substring(0, 4);
    const mm = month.substring(4, 6);
    const display = mm + '/' + year;
    const isCurrentMonth = month === currentMonth;
    return `<option value="${month}" ${isCurrentMonth ? 'selected' : ''}>T${display}</option>`;
  }).join('');
  
  // Build PIC options
  const picOptions = availablePICs.map(pic => 
    `<option value="${_escapeHtml(pic)}">${_escapeHtml(pic)}</option>`
  ).join('');
  
  // Build Type Task options for autocomplete
  const typeTaskOptionsHtml = typeOptions.map(type => 
    `<option value="${_escapeHtml(type)}">`
  ).join('');
  
  // Status options
  const statusOptions = [
    'Not Started',
    'In Progress 25%',
    'In Progress 50%',
    'In Progress 75%',
    'Completed'
  ];
  
  // Build Type Task Stats Cards HTML
  const typeStatsCardsHtml = Object.entries(typeTaskStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => `
      <div class="type-stat-card">
        <div class="type-stat-value">${count}</div>
        <div class="type-stat-label">${_escapeHtml(type.length > 25 ? type.substring(0, 22) + '...' : type)}</div>
      </div>
    `).join('');
  
  // ✅ Build HTML với tất cả cải tiến
  const html = _buildMonthlyDialogHtml(
    userName,
    monthOptions,
    picOptions,
    typeTaskOptionsHtml,
    statusOptions,
    typeStatsCardsHtml,
    allData,
    typeOptions,
    availableMonths
  );
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1400).setHeight(850),
    'Monthly Plan Update - ' + userName
  );
}

/**
 * ✅ Build HTML cho dialog với tất cả cải tiến
 */
function _buildMonthlyDialogHtml(userName, monthOptions, picOptions, typeTaskOptionsHtml, statusOptions, typeStatsCardsHtml, allData, typeOptions, availableMonths) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        /* ============================================
           🎨 GLOBAL STYLES - Calibri, Clean Design
           ============================================ */
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        body { 
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; 
          padding: 0; 
          background: #ffffff;
          font-size: 14px;
          color: #333;
        }
        
        /* ✅ IMPROVED: Chip Link Styles - Tích hợp trong text */
        .chip-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          background: #e3f2fd;
          border: 1px solid #90caf9;
          border-radius: 16px;
          color: #1976d2;
          text-decoration: none;
          font-size: 13px;
          margin: 2px 4px 2px 0;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .chip-link:hover {
          background: #bbdefb;
          border-color: #64b5f6;
          text-decoration: none;
        }
        
        /* ✅ Type Task Statistics Cards */
        .type-stats-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f5f7fa;
          border-radius: 8px;
        }
        .type-stat-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 10px 14px;
          min-width: 120px;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .type-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 89, 152, 0.15);
        }
        .type-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #3b5998;
        }
        .type-stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          margin-top: 4px;
          line-height: 1.3;
        }
        
        /* ✅ IMPROVED: Add Task Form với Month Selection */
        .btn-add-task {
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Calibri', sans-serif;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .btn-add-task:hover {
          background: #218838;
        }
        
        .add-task-form {
          display: none;
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .add-task-form.active {
          display: block;
        }
        .add-task-form h4 {
          margin-bottom: 12px;
          color: #28a745;
        }
        .add-task-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .add-task-field {
          flex: 1;
        }
        .add-task-field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #555;
          margin-bottom: 4px;
        }
        .add-task-field input,
        .add-task-field select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Calibri', sans-serif;
        }
        .add-task-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        /* ============================================
           📊 INITIAL VIEW - Statistics & Filters
           ============================================ */
        .initial-view {
          padding: 20px;
          transition: all 0.3s ease;
        }
        .initial-view.hidden {
          display: none;
        }
        
        /* Header */
        .header {
          background: #f9f9f9;
          color: #333;
          padding: 20px 24px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
        }
        .header h1 { 
          font-size: 22px; 
          font-weight: 600;
          margin-bottom: 6px; 
          color: #3b5998;
        }
        .header p { 
          color: #666; 
          font-size: 14px; 
        }
        
        /* Statistics Cards */
        .statistics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e0e0e0;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 4px 12px rgba(59, 89, 152, 0.15);
        }
        .stat-label { 
          font-size: 12px; 
          color: #666; 
          margin-bottom: 8px; 
          text-transform: uppercase;
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        .stat-value { 
          font-size: 32px; 
          font-weight: 700; 
        }
        .stat-total { color: #3b5998; }
        .stat-notstarted { color: #6c757d; }
        .stat-inprogress { color: #0066cc; }
        .stat-completed { color: #28a745; }
        
        /* Initial Filter Section */
        .initial-filters {
          background: #f9f9f9;
          padding: 20px 24px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }
        .initial-filters h3 {
          font-size: 16px;
          font-weight: 600;
          color: #3b5998;
          margin-bottom: 16px;
        }
        .filter-row {
          display: flex;
          gap: 20px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
        }
        .filter-group label {
          font-size: 13px;
          font-weight: 600;
          color: #555;
        }
        .filter-group select {
          padding: 10px 14px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Calibri', sans-serif;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .filter-group select:focus {
          border-color: #3b5998;
          outline: none;
        }
        .btn-apply-filter {
          padding: 10px 28px;
          background: #3b5998;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Calibri', sans-serif;
          transition: background 0.2s;
        }
        .btn-apply-filter:hover { 
          background: #2d4373; 
        }
        .btn-apply-filter:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        /* ============================================
           📋 DETAIL VIEW - Master-Detail Layout
           ============================================ */
        .detail-view {
          display: none;
          height: 100vh;
          flex-direction: column;
        }
        .detail-view.active {
          display: flex;
        }
        
        /* Sticky Filter Header */
        .filter-header {
          background: #f9f9f9;
          padding: 14px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .filter-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .filter-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #3b5998;
          margin: 0;
        }
        .filter-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 13px;
        }
        .filter-badge strong {
          color: #3b5998;
        }
        .filter-header-actions {
          display: flex;
          gap: 10px;
        }
        .btn-back {
          padding: 8px 16px;
          background: white;
          color: #555;
          border: 1px solid #ccc;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-family: 'Calibri', sans-serif;
          transition: all 0.2s;
        }
        .btn-back:hover {
          background: #f0f0f0;
        }
        .btn-create-pdf {
          padding: 8px 16px;
          background: #3b5998;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Calibri', sans-serif;
          transition: background 0.2s;
        }
        .btn-create-pdf:hover {
          background: #2d4373;
        }
        
        /* Main Content Area */
        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        /* Left Panel - Task List */
        .task-list-panel {
          width: 400px;
          min-width: 400px;
          background: #f9f9f9;
          border-right: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .task-list-header {
          padding: 14px 16px;
          border-bottom: 1px solid #e0e0e0;
          background: white;
        }
        .task-list-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .task-list-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        .task-list-header .task-count {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
        .task-list-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        
        /* ✅ IMPROVED: Task Item với Deadline Display */
        .task-item {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .task-item:hover {
          border-color: #3b5998;
          box-shadow: 0 2px 8px rgba(59, 89, 152, 0.1);
        }
        .task-item.active {
          border-color: #3b5998;
          border-width: 2px;
          background: #f0f4ff;
        }
        .task-item.priority {
          border-left: 3px solid #f1c40f;
        }
        .task-item.completed {
          border-left: 3px solid #28a745;
          opacity: 0.8;
        }
        .task-item.inprogress {
          border-left: 3px solid #0066cc;
        }
        .task-item.new-task {
          border-left: 3px solid #17a2b8;
          background: #f0f9ff;
        }
        .task-type {
          font-size: 11px;
          font-weight: 600;
          color: #3b5998;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .task-keytask {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          line-height: 1.4;
          word-break: break-word;
        }
        .task-meta {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          font-size: 12px;
          color: #888;
          flex-wrap: wrap;
        }
        .task-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        /* ✅ NEW: Deadline highlight trong task meta */
        .task-meta .deadline-info {
          color: #e74c3c;
          font-weight: 600;
        }
        
        /* Right Panel - Detail View */
        .detail-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: white;
        }
        .detail-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 15px;
        }
        .detail-content {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        .detail-content.active {
          display: flex;
        }
        
        /* Detail Header */
        .detail-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
          background: #f9f9f9;
        }
        .detail-title {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .detail-type {
          font-size: 13px;
          font-weight: 600;
          color: #3b5998;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* ✅ IMPROVED: Info Bar - Deadline & Status với font lớn hơn */
        .info-bar {
          display: flex;
          gap: 24px;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          flex-wrap: wrap;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .info-item label {
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-item input[type="date"],
        .info-item select {
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 15px;
          font-family: 'Calibri', sans-serif;
          background: #f9f9f9;
          min-width: 180px;
        }
        .info-item input[type="date"]:focus,
        .info-item select:focus {
          border-color: #3b5998;
          outline: none;
          background: white;
        }
        .priority-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .priority-toggle input[type="checkbox"] {
          transform: scale(1.3);
          cursor: pointer;
        }
        .priority-toggle label {
          font-size: 14px;
          color: #666;
          cursor: pointer;
        }
        
        /* ✅ IMPROVED: Plan & Report Section với font lớn hơn */
        .plan-section {
          flex: 1;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .plan-section label {
          font-size: 14px;
          font-weight: 600;
          color: #3b5998;
          margin-bottom: 10px;
          display: block;
        }
        .plan-section textarea {
          flex: 1;
          width: 100%;
          padding: 16px 18px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
          font-family: 'Calibri', sans-serif;
          line-height: 1.7;
          resize: none;
          background: #f9f9f9;
          transition: all 0.2s;
        }
        .plan-section textarea:focus {
          border-color: #3b5998;
          outline: none;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 89, 152, 0.1);
        }
        
        /* ✅ IMPROVED: Plan Report Display với Chip Links tích hợp */
        .plan-report-display {
          padding: 16px 18px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 8px;
          min-height: 200px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 16px;
          overflow-y: auto;
        }
        .plan-report-display .chip-link {
          display: inline-flex;
          font-size: 13px;
        }
        
        /* Detail Footer */
        .detail-footer {
          padding: 16px 24px;
          border-top: 1px solid #e0e0e0;
          background: #f9f9f9;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Calibri', sans-serif;
          transition: all 0.2s;
        }
        .btn-save {
          background: #3b5998;
          color: white;
        }
        .btn-save:hover {
          background: #2d4373;
        }
        .btn-cancel {
          background: white;
          color: #666;
          border: 1px solid #ccc;
        }
        .btn-cancel:hover {
          background: #f0f0f0;
        }
        
        /* Loading Overlay */
        .loading-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,0.9);
          z-index: 9999;
          justify-content: center;
          align-items: center;
        }
        .loading-overlay.active { 
          display: flex; 
        }
        .loading-spinner {
          background: #f9f9f9;
          padding: 40px 50px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #e0e0e0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .spinner {
          border: 4px solid #e0e0e0;
          border-top: 4px solid #3b5998;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        .loading-spinner p {
          font-size: 15px;
          color: #555;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Toast Notification */
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 14px 24px;
          background: #333;
          color: white;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10000;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
        }
        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }
        .toast.success {
          background: #28a745;
        }
        .toast.error {
          background: #dc3545;
        }
        
        /* PDF Options Modal */
        .pdf-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 10000;
          justify-content: center;
          align-items: center;
        }
        .pdf-modal.active {
          display: flex;
        }
        .pdf-modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 400px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .pdf-modal-content h3 {
          color: #3b5998;
          margin-bottom: 20px;
        }
        .pdf-option {
          padding: 16px;
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pdf-option:hover {
          border-color: #3b5998;
          background: #f0f4ff;
        }
        .pdf-option h4 {
          color: #333;
          margin-bottom: 4px;
        }
        .pdf-option p {
          font-size: 12px;
          color: #666;
          margin: 0;
        }
        
        /* Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f0f0f0;
        }
        ::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
      </style>
    </head>
    <body>
      <!-- Loading Overlay -->
      <div id="loading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Processing...</p>
        </div>
      </div>
      
      <!-- Toast Notification -->
      <div id="toast" class="toast"></div>
      
      <!-- PDF Options Modal -->
      <div id="pdfModal" class="pdf-modal">
        <div class="pdf-modal-content">
          <h3>📄 Create PDF Report</h3>
          <div class="pdf-option" onclick="createTeamPDF()">
            <h4>📊 Team Report (All Members)</h4>
            <p>Create comprehensive report for entire team based on selected month</p>
          </div>
          <div class="pdf-option" onclick="createPICPDF()">
            <h4>👤 PIC Report (Current Filter)</h4>
            <p>Create report for currently filtered PIC only</p>
          </div>
          <button class="btn btn-cancel" onclick="closePdfModal()" style="margin-top: 12px; width: 100%;">
            Cancel
          </button>
        </div>
      </div>
      
      <!-- ============================================
           INITIAL VIEW - Statistics & Filter Selection
           ============================================ -->
      <div id="initialView" class="initial-view">
        <!-- Header -->
        <div class="header">
          <h1>📊 Monthly Plan Update</h1>
          <p>Welcome, ${_escapeHtml(userName)}! Select month and PIC to view and update tasks.</p>
        </div>
        
        <!-- Statistics -->
        <div class="statistics">
          <div class="stat-card">
            <div class="stat-label">Total Tasks</div>
            <div class="stat-value stat-total" id="totalTasks">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Not Started</div>
            <div class="stat-value stat-notstarted" id="notStarted">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">In Progress</div>
            <div class="stat-value stat-inprogress" id="inProgress">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Completed</div>
            <div class="stat-value stat-completed" id="completed">0</div>
          </div>
        </div>
        
        <!-- Type Task Statistics -->
        <div class="type-stats-container">
          ${typeStatsCardsHtml}
        </div>
        
        <!-- Filter Section -->
        <div class="initial-filters">
          <h3>🔍 Select Filters to Continue</h3>
          <div class="filter-row">
            <div class="filter-group">
              <label>📅 Month</label>
              <select id="filterMonth">
                <option value="">-- Select Month --</option>
                ${monthOptions}
              </select>
            </div>
            <div class="filter-group">
              <label>👤 PIC</label>
              <select id="filterPIC">
                <option value="">-- All PICs --</option>
                ${picOptions}
              </select>
            </div>
            <div class="filter-group">
              <label>📊 Status</label>
              <select id="filterStatus">
                <option value="">-- All Status --</option>
                ${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <button class="btn-apply-filter" id="btnApplyFilter" onclick="applyFilterAndShowDetail()">
              Apply Filter →
            </button>
          </div>
        </div>
      </div>
      
      <!-- ============================================
           DETAIL VIEW - Master-Detail Layout
           ============================================ -->
      <div id="detailView" class="detail-view">
        <!-- Sticky Filter Header -->
        <div class="filter-header">
          <div class="filter-header-left">
            <h2>📋 Task List</h2>
            <div class="filter-badge">
              <span>Month:</span>
              <strong id="displayMonth">-</strong>
            </div>
            <div class="filter-badge" id="picBadge" style="display:none;">
              <span>PIC:</span>
              <strong id="displayPIC">-</strong>
            </div>
            <div class="filter-badge" id="statusBadge" style="display:none;">
              <span>Status:</span>
              <strong id="displayStatus">-</strong>
            </div>
          </div>
          <div class="filter-header-actions">
            <button class="btn-back" onclick="backToInitialView()">
              ← Back
            </button>
            <button class="btn-create-pdf" onclick="showPdfOptions()">
              📄 Create PDF Report
            </button>
            <button class="btn btn-save" onclick="saveAllChanges()">
              💾 Save All Changes
            </button>
          </div>
        </div>
        
        <!-- Main Content Area -->
        <div class="main-content">
          <!-- Left Panel - Task List -->
          <div class="task-list-panel">
            <div class="task-list-header">
              <div class="task-list-header-row">
                <div>
                  <h3>Tasks</h3>
                  <div class="task-count" id="taskCount">0 task(s)</div>
                </div>
                <button class="btn-add-task" onclick="toggleAddTaskForm()">
                  ➕ Add Task
                </button>
              </div>
              
              <!-- ✅ IMPROVED: Add Task Form với Month Selection -->
              <div id="addTaskForm" class="add-task-form">
                <h4>➕ Add New Task</h4>
                <div class="add-task-row">
                  <!-- ✅ NEW: Month Selection -->
                  <div class="add-task-field">
                    <label>📅 Month *</label>
                    <select id="newTaskMonth">
                      ${availableMonths.map(month => {
                        const year = month.substring(0, 4);
                        const mm = month.substring(4, 6);
                        return `<option value="${month}">T${mm}/${year}</option>`;
                      }).join('')}
                    </select>
                  </div>
                  <div class="add-task-field">
                    <label>Type Task *</label>
                    <input type="text" id="newTypeTask" list="typeTaskList" placeholder="Select or type...">
                    <datalist id="typeTaskList">
                      ${typeTaskOptionsHtml}
                    </datalist>
                  </div>
                </div>
                <div class="add-task-row">
                  <div class="add-task-field">
                    <label>Key Task *</label>
                    <input type="text" id="newKeyTask" placeholder="Enter key task description...">
                  </div>
                </div>
                <div class="add-task-actions">
                  <button class="btn btn-cancel" onclick="toggleAddTaskForm()">Cancel</button>
                  <button class="btn btn-save" onclick="addNewTask()">Add Task</button>
                </div>
              </div>
              
              <!-- Type Task Stats in Detail View -->
              <div id="typeStatsDetail" class="type-stats-container" style="margin-top: 10px; display: none;">
              </div>
            </div>
            <div class="task-list-scroll" id="taskListScroll">
              <!-- Task items will be rendered here -->
            </div>
          </div>
          
          <!-- Right Panel - Detail View -->
          <div class="detail-panel">
            <div class="detail-empty" id="detailEmpty">
              <span>👈 Select a task from the list to view details</span>
            </div>
            
            <div class="detail-content" id="detailContent">
              <!-- Detail Header -->
              <div class="detail-header">
                <div class="detail-type" id="detailType">-</div>
                <div class="detail-title" id="detailTitle">-</div>
              </div>
              
              <!-- ✅ IMPROVED: Info Bar - Deadline & Status -->
              <div class="info-bar">
                <div class="info-item">
                  <label>📅 Deadline</label>
                  <input type="date" id="detailDeadline">
                </div>
                <div class="info-item">
                  <label>📊 Status</label>
                  <select id="detailStatus">
                    ${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
                  </select>
                </div>
                <div class="priority-toggle">
                  <input type="checkbox" id="detailPriority">
                  <label for="detailPriority">⭐ Priority Task</label>
                </div>
              </div>
              
              <!-- ✅ IMPROVED: Plan & Report Section với font lớn hơn -->
              <div class="plan-section">
                <label>📝 Plan & Report</label>
                <textarea id="detailPlanReport" placeholder="Enter your plan and report details here...&#10;&#10;You can paste links and they will be displayed as clickable chip links."></textarea>
              </div>
              
              <!-- Hidden fields -->
              <input type="hidden" id="detailRowNumber">
              <input type="hidden" id="detailTaskIndex">
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // ============================================
        // 📦 DATA & STATE
        // ============================================
        const allTasks = ${JSON.stringify(allData)};
        const statusOptions = ${JSON.stringify(statusOptions)};
        const typeOptions = ${JSON.stringify(typeOptions)};
        const availableMonths = ${JSON.stringify(availableMonths)};
        const currentUserPIC = '${_escapeHtml(userName)}';
        
        let filteredTasks = [];
        let selectedTaskIndex = -1;
        let modifiedTasks = {}; // Track changes: { rowNumber: { field: value, ... } }
        let newTasksToAdd = []; // Track new tasks to be added
        
        // ============================================
        // 🚀 INITIALIZATION
        // ============================================
        document.addEventListener('DOMContentLoaded', function() {
          updateInitialStatistics();
          
          // Set default month for add task form
          const filterMonth = document.getElementById('filterMonth');
          const newTaskMonth = document.getElementById('newTaskMonth');
          if (filterMonth && filterMonth.value && newTaskMonth) {
            newTaskMonth.value = filterMonth.value;
          }
        });
        
        // ============================================
        // 📊 STATISTICS
        // ============================================
        function updateInitialStatistics() {
          const validTasks = allTasks.filter(t => t.typeTask && t.typeTask.trim() !== '');
          
          const total = validTasks.length;
          const notStarted = validTasks.filter(t => t.status === 'Not Started').length;
          const inProgress = validTasks.filter(t => t.status && t.status.includes('In Progress')).length;
          const completed = validTasks.filter(t => t.status === 'Completed').length;
          
          document.getElementById('totalTasks').textContent = total;
          document.getElementById('notStarted').textContent = notStarted;
          document.getElementById('inProgress').textContent = inProgress;
          document.getElementById('completed').textContent = completed;
        }
        
        function updateTypeStatsDetail() {
          const typeStats = {};
          filteredTasks.forEach(task => {
            if (task.typeTask) {
              typeStats[task.typeTask] = (typeStats[task.typeTask] || 0) + 1;
            }
          });
          
          const container = document.getElementById('typeStatsDetail');
          const entries = Object.entries(typeStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
          
          if (entries.length > 0) {
            container.innerHTML = entries.map(([type, count]) => \`
              <div class="type-stat-card" style="padding: 6px 10px; min-width: 80px;">
                <div class="type-stat-value" style="font-size: 18px;">\${count}</div>
                <div class="type-stat-label" style="font-size: 9px;">\${escapeHtml(type.substring(0, 20))}</div>
              </div>
            \`).join('');
            container.style.display = 'flex';
          } else {
            container.style.display = 'none';
          }
        }
        
        // ============================================
        // 🔍 FILTER & NAVIGATION
        // ============================================
        function applyFilterAndShowDetail() {
          const monthFilter = document.getElementById('filterMonth').value;
          const picFilter = document.getElementById('filterPIC').value;
          const statusFilter = document.getElementById('filterStatus').value;
          
          if (!monthFilter) {
            showToast('Please select a month to continue.', 'error');
            return;
          }
          
          // Filter tasks
          filteredTasks = allTasks.filter((task, index) => {
            task._originalIndex = index;
            
            if (!task.typeTask || task.typeTask.trim() === '') return false;
            if (monthFilter && task.month !== monthFilter) return false;
            if (picFilter && task.pic !== picFilter) return false;
            if (statusFilter && task.status !== statusFilter) return false;
            
            return true;
          });
          
          // Add new tasks to the beginning
          filteredTasks = [...newTasksToAdd.filter(t => !monthFilter || t.month === monthFilter), ...filteredTasks];
          
          if (filteredTasks.length === 0 && newTasksToAdd.length === 0) {
            showToast('No tasks found with the selected filters.', 'error');
            return;
          }
          
          // Update display badges
          const mm = monthFilter.substring(4, 6);
          const yyyy = monthFilter.substring(0, 4);
          document.getElementById('displayMonth').textContent = mm + '/' + yyyy;
          
          if (picFilter) {
            document.getElementById('displayPIC').textContent = picFilter;
            document.getElementById('picBadge').style.display = 'inline-flex';
          } else {
            document.getElementById('picBadge').style.display = 'none';
          }
          
          if (statusFilter) {
            document.getElementById('displayStatus').textContent = statusFilter;
            document.getElementById('statusBadge').style.display = 'inline-flex';
          } else {
            document.getElementById('statusBadge').style.display = 'none';
          }
          
          // Set default month for add task form
          document.getElementById('newTaskMonth').value = monthFilter;
          
          // Render task list
          renderTaskList();
          updateTypeStatsDetail();
          
          // Switch to detail view
          document.getElementById('initialView').classList.add('hidden');
          document.getElementById('detailView').classList.add('active');
          
          window.scrollTo(0, 0);
        }
        
        function backToInitialView() {
          if (Object.keys(modifiedTasks).length > 0 || newTasksToAdd.length > 0) {
            if (!confirm('You have unsaved changes. Are you sure you want to go back?')) {
              return;
            }
          }
          
          filteredTasks = [];
          selectedTaskIndex = -1;
          modifiedTasks = {};
          newTasksToAdd = [];
          
          document.getElementById('detailView').classList.remove('active');
          document.getElementById('initialView').classList.remove('hidden');
          
          document.getElementById('detailContent').classList.remove('active');
          document.getElementById('detailEmpty').style.display = 'flex';
          
          document.getElementById('addTaskForm').classList.remove('active');
        }
        
        // ============================================
        // 📋 TASK LIST RENDERING
        // ============================================
        function renderTaskList() {
          const container = document.getElementById('taskListScroll');
          container.innerHTML = '';
          
          filteredTasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.className = 'task-item';
            item.setAttribute('data-index', index);
            
            // Add status class
            if (task.isNew) {
              item.classList.add('new-task');
            } else if (task.priority) {
              item.classList.add('priority');
            } else if (task.status === 'Completed') {
              item.classList.add('completed');
            } else if (task.status && task.status.includes('In Progress')) {
              item.classList.add('inprogress');
            }
            
            // ✅ IMPROVED: Format deadline display
            let deadlineDisplay = '-';
            if (task.deadline) {
              try {
                const d = new Date(task.deadline);
                deadlineDisplay = d.toLocaleDateString('en-GB'); // dd/MM/yyyy
              } catch (e) {
                deadlineDisplay = task.deadline;
              }
            } else if (task.deadlineDisplay) {
              deadlineDisplay = task.deadlineDisplay;
            }
            
            // ✅ IMPROVED: Show deadline prominently in task meta
            item.innerHTML = \`
              <div class="task-type">\${escapeHtml(task.typeTask || '-')}</div>
              <div class="task-keytask">\${escapeHtml(task.keyTask || '-')}\${task.isNew ? ' <span style="color:#17a2b8;font-size:10px;">NEW</span>' : ''}</div>
              <div class="task-meta">
                <span class="deadline-info">📅 \${deadlineDisplay}</span>
                <span>📊 \${escapeHtml(task.status || '-')}</span>
              </div>
            \`;
            
            item.onclick = () => selectTask(index);
            container.appendChild(item);
          });
          
          document.getElementById('taskCount').textContent = filteredTasks.length + ' task(s)';
        }
        
        // ============================================
        // 📝 TASK DETAIL MANAGEMENT
        // ============================================
        function selectTask(index) {
          if (selectedTaskIndex >= 0) {
            saveCurrentTaskToMemory();
          }
          
          selectedTaskIndex = index;
          const task = filteredTasks[index];
          
          // Update active state in list
          document.querySelectorAll('.task-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
          });
          
          // Show detail content
          document.getElementById('detailEmpty').style.display = 'none';
          document.getElementById('detailContent').classList.add('active');
          
          // Populate detail fields
          document.getElementById('detailType').textContent = task.typeTask || '-';
          document.getElementById('detailTitle').textContent = task.keyTask || '-';
          
          // ✅ IMPROVED: Set deadline value
          document.getElementById('detailDeadline').value = task.deadline || '';
          document.getElementById('detailStatus').value = task.status || 'Not Started';
          document.getElementById('detailPriority').checked = task.priority || false;
          
          // ✅ IMPROVED: Set Plan & Report với plain text (không HTML)
          document.getElementById('detailPlanReport').value = task.planReport || '';
          
          // Store references
          document.getElementById('detailRowNumber').value = task.rowNumber || '';
          document.getElementById('detailTaskIndex').value = index;
          
          // Check if this task has been modified
          const rowNum = task.rowNumber;
          if (rowNum && modifiedTasks[rowNum]) {
            const mod = modifiedTasks[rowNum];
            if (mod.deadline !== undefined) document.getElementById('detailDeadline').value = mod.deadline;
            if (mod.status !== undefined) document.getElementById('detailStatus').value = mod.status;
            if (mod.priority !== undefined) document.getElementById('detailPriority').checked = mod.priority;
            if (mod.planReport !== undefined) document.getElementById('detailPlanReport').value = mod.planReport;
          }
        }
        
        function saveCurrentTaskToMemory() {
          if (selectedTaskIndex < 0) return;
          
          const task = filteredTasks[selectedTaskIndex];
          const rowNum = task.rowNumber;
          
          // For new tasks, save differently
          if (task.isNew) {
            task.deadline = document.getElementById('detailDeadline').value;
            task.status = document.getElementById('detailStatus').value;
            task.priority = document.getElementById('detailPriority').checked;
            task.planReport = document.getElementById('detailPlanReport').value;
            return;
          }
          
          if (!rowNum || rowNum < 6) return;
          
          const currentDeadline = document.getElementById('detailDeadline').value;
          const currentStatus = document.getElementById('detailStatus').value;
          const currentPriority = document.getElementById('detailPriority').checked;
          const currentPlanReport = document.getElementById('detailPlanReport').value;
          
          // Check for changes
          const hasChanges = (
            currentDeadline !== (task.deadline || '') ||
            currentStatus !== (task.status || 'Not Started') ||
            currentPriority !== (task.priority || false) ||
            currentPlanReport !== (task.planReport || '')
          );
          
          if (hasChanges) {
            modifiedTasks[rowNum] = {
              rowNumber: rowNum,
              typeTask: task.typeTask,
              keyTask: task.keyTask,
              pic: task.pic,
              deadline: currentDeadline,
              status: currentStatus,
              priority: currentPriority,
              planReport: currentPlanReport
            };
            
            // Update the task in filteredTasks for UI consistency
            filteredTasks[selectedTaskIndex].deadline = currentDeadline;
            filteredTasks[selectedTaskIndex].status = currentStatus;
            filteredTasks[selectedTaskIndex].priority = currentPriority;
            filteredTasks[selectedTaskIndex].planReport = currentPlanReport;
            
            // Re-render task list
            renderTaskList();
            
            // Re-select the current task
            document.querySelectorAll('.task-item')[selectedTaskIndex]?.classList.add('active');
          }
        }
        
        // ============================================
        // ➕ ADD NEW TASK
        // ============================================
        function toggleAddTaskForm() {
          const form = document.getElementById('addTaskForm');
          form.classList.toggle('active');
          
          if (form.classList.contains('active')) {
            document.getElementById('newTypeTask').focus();
          }
        }
        
        function addNewTask() {
          const taskMonth = document.getElementById('newTaskMonth').value;
          const typeTask = document.getElementById('newTypeTask').value.trim();
          const keyTask = document.getElementById('newKeyTask').value.trim();
          
          if (!taskMonth) {
            showToast('Please select a month.', 'error');
            return;
          }
          
          if (!typeTask) {
            showToast('Please select a Type Task.', 'error');
            return;
          }
          
          if (!keyTask) {
            showToast('Please enter a Key Task.', 'error');
            return;
          }
          
          const filterPIC = document.getElementById('filterPIC').value || currentUserPIC;
          
          // Create new task object
          const newTask = {
            rowNumber: null,
            month: taskMonth,
            typeTask: typeTask,
            keyTask: keyTask,
            pic: filterPIC,
            deadline: '',
            deadlineDisplay: '',
            status: 'Not Started',
            planReport: '',
            planReportHtml: '',
            priority: false,
            isNew: true
          };
          
          // Add to new tasks array
          newTasksToAdd.push(newTask);
          
          // Add to filtered tasks at the beginning
          filteredTasks.unshift(newTask);
          
          // Re-render
          renderTaskList();
          updateTypeStatsDetail();
          
          // Clear form
          document.getElementById('newTypeTask').value = '';
          document.getElementById('newKeyTask').value = '';
          toggleAddTaskForm();
          
          showToast('✅ Task added! Click "Save All Changes" to save.', 'success');
          
          // Select the new task
          selectTask(0);
        }
        
        // ============================================
        // 💾 SAVE CHANGES
        // ============================================
        function saveAllChanges() {
          saveCurrentTaskToMemory();
          
          const updates = Object.values(modifiedTasks);
          const newTasks = newTasksToAdd.map(t => ({
            ...t,
            deadline: t.deadline || '',
            status: t.status || 'Not Started',
            planReport: t.planReport || '',
            priority: t.priority || false
          }));
          
          if (updates.length === 0 && newTasks.length === 0) {
            showToast('No changes to save.', 'error');
            return;
          }
          
          showLoading(true);
          
          const filterMonth = document.getElementById('filterMonth').value;
          const filterPIC = document.getElementById('filterPIC').value;
          
          google.script.run
            .withSuccessHandler(function(result) {
              showLoading(false);
              modifiedTasks = {};
              newTasksToAdd = [];
              
              // Remove isNew flag from tasks
              filteredTasks.forEach(t => delete t.isNew);
              
              showToast('✅ ' + result, 'success');
              
              renderTaskList();
            })
            .withFailureHandler(function(error) {
              showLoading(false);
              showToast('❌ Error: ' + error.message, 'error');
            })
            .executeMonthlyPlanUpdateImproved(updates, newTasks, filterMonth, filterPIC);
        }
        
        // ============================================
        // 📄 PDF GENERATION
        // ============================================
        function showPdfOptions() {
          document.getElementById('pdfModal').classList.add('active');
        }
        
        function closePdfModal() {
          document.getElementById('pdfModal').classList.remove('active');
        }
        
        function createTeamPDF() {
          closePdfModal();
          const filterMonth = document.getElementById('filterMonth').value;
          
          if (!filterMonth) {
            showToast('Please select a month first.', 'error');
            return;
          }
          
          showLoading(true);
          
          google.script.run
            .withSuccessHandler(function(result) {
              showLoading(false);
              showToast('✅ ' + result, 'success');
            })
            .withFailureHandler(function(error) {
              showLoading(false);
              showToast('❌ Error: ' + error.message, 'error');
            })
            .createMonthlyTeamPDFReportImproved(filterMonth);
        }
        
        function createPICPDF() {
          closePdfModal();
          const filterMonth = document.getElementById('filterMonth').value;
          const filterPIC = document.getElementById('filterPIC').value;
          
          if (!filterMonth) {
            showToast('Please select a month first.', 'error');
            return;
          }
          
          showLoading(true);
          
          google.script.run
            .withSuccessHandler(function(result) {
              showLoading(false);
              showToast('✅ ' + result, 'success');
            })
            .withFailureHandler(function(error) {
              showLoading(false);
              showToast('❌ Error: ' + error.message, 'error');
            })
            .createMonthlyPICPDFReportImproved(filterMonth, filterPIC);
        }
        
        // ============================================
        // 🛠️ UTILITY FUNCTIONS
        // ============================================
        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }
        
        function showLoading(show) {
          document.getElementById('loading').classList.toggle('active', show);
        }
        
        function showToast(message, type = '') {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.className = 'toast ' + type;
          toast.classList.add('show');
          
          setTimeout(() => {
            toast.classList.remove('show');
          }, 4000);
        }
      </script>
    </body>
    </html>
  `;
}
function executeMonthlyPlanUpdateImproved(updates, newTasks, filterMonth, filterPIC) {
  if ((!updates || updates.length === 0) && (!newTasks || newTasks.length === 0)) {
    return 'No changes to save.';
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthSheet = ss.getSheetByName('MONTH');
  
  if (!monthSheet) {
    throw new Error('MONTH sheet not found.');
  }
  
  let successCount = 0;
  let errorCount = 0;
  let newTaskCount = 0;
  
  // Column indexes (1-based)
  const COL_SERIAL = 2;      // Column B
  const COL_CHECK = 3;       // Column C - dùng để kiểm tra dòng trống
  const COL_MONTH = 4;       // Column D
  const COL_TYPE = 5;        // Column E - Type Task
  const COL_KEY = 6;         // Column F - Key Task
  const COL_PIC = 7;         // Column G
  const COL_DEADLINE = 8;    // Column H
  const COL_STATUS = 9;      // Column I
  const COL_PLAN_REPORT = 10;// Column J
  const COL_PRIORITY = 11;   // Column K
  
  // ========== PROCESS UPDATES TO EXISTING TASKS ==========
  if (updates && updates.length > 0) {
    updates.forEach(task => {
      try {
        const rowNum = parseInt(task.rowNumber);
        
        if (!rowNum || rowNum < 6) {
          console.warn('Invalid row number:', task.rowNumber);
          errorCount++;
          return;
        }
        
        // Update Deadline (Column H)
        if (task.deadline !== undefined) {
          if (task.deadline) {
            const deadlineDate = new Date(task.deadline);
            if (!isNaN(deadlineDate.getTime())) {
              _safeSetValueForMONTHImproved(monthSheet, rowNum, COL_DEADLINE, deadlineDate);
              monthSheet.getRange(rowNum, COL_DEADLINE).setNumberFormat('dd/MM/yyyy');
            }
          } else {
            _safeSetValueForMONTHImproved(monthSheet, rowNum, COL_DEADLINE, '');
          }
        }
        
        // Update Status (Column I)
        if (task.status !== undefined) {
          _safeSetValueForMONTHImproved(monthSheet, rowNum, COL_STATUS, task.status);
        }
        
        // Update Plan & Report (Column J) với Rich Text nếu có links
        if (task.planReport !== undefined) {
          const planText = task.planReport || '';
          const richText = _createRichTextWithLinks(planText);
          
          if (richText) {
            const cell = monthSheet.getRange(rowNum, COL_PLAN_REPORT);
            const validation = cell.getDataValidation();
            if (validation) cell.clearDataValidations();
            
            cell.setRichTextValue(richText);
            
            if (validation) {
              try { cell.setDataValidation(validation); } catch (e) {}
            }
          } else {
            _safeSetValueForMONTHImproved(monthSheet, rowNum, COL_PLAN_REPORT, planText);
          }
        }
        
        // Update Priority (Column K)
        if (task.priority !== undefined) {
          _safeSetValueForMONTHImproved(monthSheet, rowNum, COL_PRIORITY, task.priority ? 'TRUE' : 'FALSE');
        }
        
        successCount++;
        console.log(`Updated row ${rowNum} successfully`);
        
      } catch (e) {
        console.error('Error updating row:', task.rowNumber, e.message);
        errorCount++;
      }
    });
  }
  
  // ========== PROCESS NEW TASKS ==========
  if (newTasks && newTasks.length > 0) {
    // Lấy validation rules từ row mẫu (row 6) nếu có
    let typeValidation = null;
    let statusValidation = null;
    
    try {
      typeValidation = monthSheet.getRange(6, COL_TYPE).getDataValidation();
      statusValidation = monthSheet.getRange(6, COL_STATUS).getDataValidation();
    } catch (e) {
      console.warn('Could not get sample validations');
    }
    
    newTasks.forEach((task) => {
      try {
        // ✅ IMPROVED: Tìm dòng trống theo column C thay vì cuối sheet
        const targetRow = _findFirstEmptyRowByColumnC(monthSheet);
        
        if (targetRow < 6) {
          console.error(`Invalid target row ${targetRow}, skipping new task`);
          errorCount++;
          return;
        }
        
        const serialNum = targetRow - 5;
        
        console.log(`Adding new task at row ${targetRow}`);
        
        // Set Serial Number (Column B)
        monthSheet.getRange(targetRow, COL_SERIAL).setValue(serialNum);
        
        // Set Month (Column D)
        monthSheet.getRange(targetRow, COL_MONTH).setValue(task.month);
        
        // Set Type Task (Column E) với validation
        const typeCell = monthSheet.getRange(targetRow, COL_TYPE);
        _safeSetValueForMONTHImproved(monthSheet, targetRow, COL_TYPE, task.typeTask);
        if (typeValidation) {
          try { typeCell.setDataValidation(typeValidation); } catch (e) {}
        }
        
        // Set Key Task (Column F)
        _safeSetValueForMONTHImproved(monthSheet, targetRow, COL_KEY, task.keyTask || '');
        
        // Set PIC (Column G)
        _safeSetValueForMONTHImproved(monthSheet, targetRow, COL_PIC, task.pic || '');
        
        // Set Deadline (Column H)
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            monthSheet.getRange(targetRow, COL_DEADLINE)
              .setValue(deadlineDate)
              .setNumberFormat('dd/MM/yyyy');
          }
        }
        
        // Set Status (Column I) với validation
        const statusCell = monthSheet.getRange(targetRow, COL_STATUS);
        _safeSetValueForMONTHImproved(monthSheet, targetRow, COL_STATUS, task.status || 'Not Started');
        if (statusValidation) {
          try { statusCell.setDataValidation(statusValidation); } catch (e) {}
        }
        
        // Set Plan & Report (Column J) với Rich Text
        const planText = task.planReport || '';
        if (planText) {
          const richText = _createRichTextWithLinks(planText);
          if (richText) {
            monthSheet.getRange(targetRow, COL_PLAN_REPORT).setRichTextValue(richText);
          } else {
            monthSheet.getRange(targetRow, COL_PLAN_REPORT).setValue(planText);
          }
        }
        
        // Set Priority (Column K)
        monthSheet.getRange(targetRow, COL_PRIORITY).setValue(task.priority ? 'TRUE' : 'FALSE');
        
        newTaskCount++;
        
      } catch (e) {
        console.error('Error adding new task:', e.message);
        errorCount++;
      }
    });
  }
  
  SpreadsheetApp.flush();
  
  let result = [];
  if (successCount > 0) result.push(`Updated ${successCount} task(s)`);
  if (newTaskCount > 0) result.push(`Added ${newTaskCount} new task(s)`);
  if (errorCount > 0) result.push(`${errorCount} error(s)`);
  
  return result.length > 0 ? result.join(', ') + ' successfully.' : 'No changes made.';
}

// ============================================================================
// 📄 PDF FUNCTIONS
// ============================================================================

/**
 * ✅ IMPROVED: Create Team PDF Report với chip links
 */
function createMonthlyTeamPDFReportImproved(filterMonth) {
  const PDF_FOLDER_ID = '1GZXKszflpKGbH0mfA8DcrquuNQ-ANXFq';
  
  try {
    const allData = getMonthlyPlanDataImproved(filterMonth);
    
    if (allData.length === 0) {
      throw new Error('No data found for the selected month.');
    }
    
    // Build HTML với chip links
    const htmlContent = _buildMonthlyPDFHtmlWithLinks(allData, filterMonth, null);
    
    // Create PDF
    const blob = HtmlService.createHtmlOutput(htmlContent)
      .getBlob()
      .getAs('application/pdf');
    
    // Build filename
    let fileName;
    if (filterMonth && filterMonth.length === 6) {
      const mm = filterMonth.substring(4, 6);
      const yyyy = filterMonth.substring(0, 4);
      fileName = `Marketing Monthly Report ${mm}${yyyy}.pdf`;
    } else {
      fileName = `Marketing Monthly Report All.pdf`;
    }
    
    blob.setName(fileName);
    
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    
    // Delete existing file if exists
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
    
    const pdfFile = folder.createFile(blob);
    
    return `PDF created: ${fileName}\nLink: ${pdfFile.getUrl()}`;
    
  } catch (error) {
    console.error('Error creating team PDF:', error);
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
}

/**
 * ✅ IMPROVED: Create PIC PDF Report với chip links
 */
function createMonthlyPICPDFReportImproved(filterMonth, filterPIC) {
  const PDF_FOLDER_ID = '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy';
  
  try {
    const allData = getMonthlyPlanDataImproved(filterMonth);
    const filteredData = filterPIC 
      ? allData.filter(task => task.pic === filterPIC)
      : allData;
    
    if (filteredData.length === 0) {
      throw new Error('No data found for the selected filters.');
    }
    
    // Build HTML với chip links
    const htmlContent = _buildMonthlyPDFHtmlWithLinks(filteredData, filterMonth, filterPIC);
    
    // Create PDF
    const blob = HtmlService.createHtmlOutput(htmlContent)
      .getBlob()
      .getAs('application/pdf');
    
    // Build filename
    let fileName;
    if (filterMonth && filterMonth.length === 6) {
      const mm = filterMonth.substring(4, 6);
      const yyyy = filterMonth.substring(0, 4);
      fileName = filterPIC 
        ? `Monthly Report ${mm}${yyyy} - ${filterPIC}.pdf`
        : `Monthly Report ${mm}${yyyy}.pdf`;
    } else {
      fileName = `Monthly Report - ${filterPIC || 'All'}.pdf`;
    }
    
    blob.setName(fileName);
    
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    
    // Delete existing
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
    
    const pdfFile = folder.createFile(blob);
    
    return `PDF created: ${fileName}\nLink: ${pdfFile.getUrl()}`;
    
  } catch (error) {
    console.error('Error creating PIC PDF:', error);
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
}

/**
 * ✅ NEW: Build PDF HTML với chip links preserved
 */
function _buildMonthlyPDFHtmlWithLinks(tasks, filterMonth, filterPIC) {
  const monthDisplay = filterMonth ? 
    filterMonth.substring(4, 6) + '/' + filterMonth.substring(0, 4) : 'All Months';
  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  
  // Calculate Statistics
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'Completed').length
  };
  stats.completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;
  
  // Helper: Format Plan Report với links
  function formatPlanReportForPDF(task) {
    // Ưu tiên dùng planReportHtml nếu có
    if (task.planReportHtml && task.planReportHtml.trim() !== '') {
      return task.planReportHtml;
    }
    
    // Fallback: convert URLs to links
    if (!task.planReport || String(task.planReport).trim() === '') {
      return '<em style="color: #999;">No data</em>';
    }
    
    return _convertUrlsToChipLinksHtml(task.planReport);
  }
  
  // Build task rows
  const taskRows = tasks.map((task, index) => {
    const formattedResult = formatPlanReportForPDF(task);
    const escapedType = _escapeHtml(task.typeTask || '');
    const escapedKey = _escapeHtml(task.keyTask || '');
    const deadlineDisplay = task.deadlineDisplay || task.deadline || '-';
    
    return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 11pt;">${index + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11pt;">${escapedType}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11pt;">${escapedKey}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 11pt;">${deadlineDisplay}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 11pt;">${_escapeHtml(task.status || '-')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11pt; line-height: 1.6;">${formattedResult}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Calibri', Arial, sans-serif;
          font-size: 11pt;
          color: #333;
          line-height: 1.6;
          margin: 20px;
        }
        h1 {
          font-size: 16pt;
          color: #2c5aa0;
          margin-bottom: 5px;
        }
        .subtitle {
          font-size: 11pt;
          color: #666;
          margin-bottom: 20px;
        }
        .stats {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }
        .stat-box {
          padding: 15px 25px;
          background: #f5f7fa;
          border-left: 4px solid #2c5aa0;
          border-radius: 4px;
        }
        .stat-value {
          font-size: 24pt;
          font-weight: bold;
          color: #2c5aa0;
        }
        .stat-label {
          font-size: 10pt;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th {
          background: #2c5aa0;
          color: white;
          padding: 10px 8px;
          text-align: left;
          font-size: 11pt;
          font-weight: 600;
        }
        .chip-link {
          display: inline;
          padding: 2px 8px;
          background: #e3f2fd;
          border: 1px solid #90caf9;
          border-radius: 12px;
          color: #1976d2;
          text-decoration: none;
          font-size: 10pt;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 9pt;
          color: #888;
        }
      </style>
    </head>
    <body>
      <h1>📊 Monthly Task Report${filterPIC ? ' - ' + _escapeHtml(filterPIC) : ''}</h1>
      <p class="subtitle">Period: ${monthDisplay} | Generated: ${currentDate}</p>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">${stats.totalTasks}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-box" style="border-color: ${stats.completionRate >= 80 ? '#4caf50' : stats.completionRate >= 50 ? '#ffc107' : '#f44336'};">
          <div class="stat-value" style="color: ${stats.completionRate >= 80 ? '#2e7d32' : stats.completionRate >= 50 ? '#f57c00' : '#c62828'};">${stats.completionRate}%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th style="width: 15%;">Type Task</th>
            <th style="width: 20%;">Key Task</th>
            <th style="width: 10%;">Deadline</th>
            <th style="width: 10%;">Status</th>
            <th>Plan & Report</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
      
      <div class="footer">
        Marketing Task Management System | Generated on ${new Date().toLocaleDateString('en-GB')}
      </div>
    </body>
    </html>
  `;
}
function _getMonthlyPICsFromSheetImproved() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    // Đọc column G (PIC)
    const picValues = monthSheet.getRange(6, 7, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    return [...new Set(picValues)].sort();
  } catch (error) {
    console.error('Error getting PICs from sheet:', error);
    return [];
  }
}

/**
 * Safe version của _getTypeOptionsFromMaster
 */
function _getTypeOptionsFromMasterSafe() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) return [];
    
    // Giả sử Type options ở column A từ row 2
    const lastRow = masterSheet.getLastRow();
    if (lastRow < 2) return [];
    
    const values = masterSheet.getRange(2, 1, lastRow - 1, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    return [...new Set(values)];
  } catch (error) {
    console.error('Error getting type options:', error);
    return [];
  }
}

/**
 * Safe version của _getKeyTaskOptionsFromMaster
 */
function _getKeyTaskOptionsFromMasterSafe() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) return [];
    
    // Giả sử Key Task options ở column B từ row 2
    const lastRow = masterSheet.getLastRow();
    if (lastRow < 2) return [];
    
    const values = masterSheet.getRange(2, 2, lastRow - 1, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    return [...new Set(values)];
  } catch (error) {
    console.error('Error getting key task options:', error);
    return [];
  }
}
/**
 * ✅ NEW: Execute Monthly Plan Update V3 - Handles both updates and new tasks
 */
/**
 * ✅ FIXED: Execute Monthly Plan Update V3 - Handles Data Validation
 * Xóa validation → Update → Restore validation
 */
function executeMonthlyPlanUpdateV3(updates, newTasks, filterMonth, filterPIC) {
  if ((!updates || updates.length === 0) && (!newTasks || newTasks.length === 0)) {
    return 'No changes to save.';
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthSheet = ss.getSheetByName('MONTH');
  
  if (!monthSheet) {
    throw new Error('MONTH sheet not found.');
  }
  
  let successCount = 0;
  let errorCount = 0;
  let newTaskCount = 0;
  
  // ✅ Column indexes (1-based) - ĐÚNG MAPPING
  const COL_SERIAL = 2;        // Column B
const COL_MONTH = 4;         // Column D
const COL_TYPE = 5;          // Column E - Type Task ✅
const COL_KEY = 6;           // Column F - Key Task ✅
const COL_PIC = 7;           // Column G
const COL_DEADLINE = 8;      // Column H
const COL_STATUS = 9;        // Column I
const COL_PLAN_REPORT = 10;  // Column J
const COL_PRIORITY = 11;     // Column K
  
  // ✅ HELPER: Update cell với Data Validation handling
  function updateCellSafe(sheet, row, col, value) {
    try {
      const cell = sheet.getRange(row, col);
      
      // Lưu validation rule hiện tại
      const validation = cell.getDataValidation();
      
      // Xóa validation tạm thời
      if (validation) {
        cell.clearDataValidations();
      }
      
      // Set giá trị
      cell.setValue(value);
      
      // Khôi phục validation nếu có
      if (validation) {
        try {
          cell.setDataValidation(validation);
        } catch (e) {
          console.warn(`Could not restore validation for cell (${row}, ${col}):`, e.message);
        }
      }
      
      return true;
    } catch (e) {
      console.error(`Error updating cell (${row}, ${col}):`, e.message);
      return false;
    }
  }
  
  // ========== PROCESS UPDATES TO EXISTING TASKS ==========
  if (updates && updates.length > 0) {
    updates.forEach(task => {
      try {
        const rowNum = parseInt(task.rowNumber);
        
        if (!rowNum || rowNum < 6) {
          console.warn('Invalid row number:', task.rowNumber);
          errorCount++;
          return;
        }
        
        // Update Priority (Column E)
        updateCellSafe(monthSheet, rowNum, COL_PRIORITY, task.priority ? 'TRUE' : 'FALSE');
        
        // Update Deadline (Column I)
        if (task.deadline !== undefined) {
          updateCellSafe(monthSheet, rowNum, COL_DEADLINE, task.deadline);
        }
        
        // Update Status (Column J) - CÓ DATA VALIDATION
        if (task.status !== undefined) {
          updateCellSafe(monthSheet, rowNum, COL_STATUS, task.status);
        }
        
        // Update Plan & Report (Column K)
        if (task.planReport !== undefined) {
          updateCellSafe(monthSheet, rowNum, COL_PLAN_REPORT, task.planReport);
        }
        
        successCount++;
        console.log(`Updated row ${rowNum} successfully`);
        
      } catch (e) {
        console.error('Error updating row:', task.rowNumber, e.message);
        errorCount++;
      }
    });
  }
  
  // ========== PROCESS NEW TASKS ==========
  if (newTasks && newTasks.length > 0) {
    const lastRow = monthSheet.getLastRow();
    
    // Lấy validation rules từ row mẫu (row 6) nếu có
    let typeValidation = null;
    let statusValidation = null;
    
    try {
      typeValidation = monthSheet.getRange(6, COL_TYPE).getDataValidation();
      statusValidation = monthSheet.getRange(6, COL_STATUS).getDataValidation();
    } catch (e) {
      console.warn('Could not get sample validations');
    }
    
    newTasks.forEach((task, index) => {
      try {
        const newRow = lastRow + index + 1;
        const serialNum = newRow - 5;
        
        // Set values
        monthSheet.getRange(newRow, COL_SERIAL).setValue(serialNum);
        monthSheet.getRange(newRow, COL_MONTH).setValue(task.month);
        monthSheet.getRange(newRow, COL_PRIORITY).setValue(task.priority ? 'TRUE' : 'FALSE');
        
        // Type Task với validation
        const typeCell = monthSheet.getRange(newRow, COL_TYPE);
        typeCell.setValue(task.typeTask);
        if (typeValidation) {
          try { typeCell.setDataValidation(typeValidation); } catch (e) {}
        }
        
        // Key Task
        monthSheet.getRange(newRow, COL_KEY).setValue(task.keyTask);
        
        // PIC
        monthSheet.getRange(newRow, COL_PIC).setValue(task.pic);
        
        // Deadline
        if (task.deadline) {
          monthSheet.getRange(newRow, COL_DEADLINE).setValue(task.deadline);
        }
        
        // Status với validation
        const statusCell = monthSheet.getRange(newRow, COL_STATUS);
        statusCell.setValue(task.status || 'Not Started');
        if (statusValidation) {
          try { statusCell.setDataValidation(statusValidation); } catch (e) {}
        }
        
        // Plan & Report
        monthSheet.getRange(newRow, COL_PLAN_REPORT).setValue(task.planReport || '');
        
        newTaskCount++;
        console.log(`Added new task at row ${newRow}`);
        
      } catch (e) {
        console.error('Error adding new task:', e.message);
        errorCount++;
      }
    });
  }
  
  SpreadsheetApp.flush();
  
  let result = [];
  if (successCount > 0) result.push(`Updated ${successCount} task(s)`);
  if (newTaskCount > 0) result.push(`Added ${newTaskCount} new task(s)`);
  if (errorCount > 0) result.push(`${errorCount} error(s)`);
  
  return result.length > 0 ? result.join(', ') + ' successfully.' : 'No changes made.';
}

/**
 * ✅ NEW: Create Team PDF Report (All Members)
 * Lưu vào folder https://drive.google.com/drive/folders/1GZXKszflpKGbH0mfA8DcrquuNQ-ANXFq
 */
/**
 * ✅ FIXED: Create Team PDF Report - Render HTML đúng cách
 * Lưu vào folder: https://drive.google.com/drive/folders/1GZXKszflpKGbH0mfA8DcrquuNQ-ANXFq
 */
function createMonthlyTeamPDFReport(filterMonth) {
  const PDF_FOLDER_ID = '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy?hl=vi';
  
  try {
    const allData = getMonthlyPlanData(filterMonth);
    
    if (allData.length === 0) {
      throw new Error('No data found for the selected month.');
    }
    
    // Build HTML using _buildMonthlyReportEmailHTML
    const htmlContent = _buildMonthlyReportEmailHTML(allData, filterMonth);
    
    // ✅ FIXED: Create PDF properly
    const blob = HtmlService.createHtmlOutput(htmlContent)
      .getBlob()
      .getAs('application/pdf');
    
    // Build filename
    let fileName;
    if (filterMonth && filterMonth.length === 6) {
      const mm = filterMonth.substring(4, 6);
      const yyyy = filterMonth.substring(0, 4);
      fileName = `Marketing Monthly Report ${mm}${yyyy}.pdf`;
    } else {
      fileName = `Marketing Monthly Report All.pdf`;
    }
    
    blob.setName(fileName);
    
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    
    // Delete existing file if exists
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
    
    const pdfFile = folder.createFile(blob);
    
    return `PDF created: ${fileName}\nLink: ${pdfFile.getUrl()}`;
    
  } catch (error) {
    console.error('Error creating team PDF:', error);
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
}

/**
 * ✅ FIXED: Create PIC PDF Report
 * Lưu vào folder: https://drive.google.com/drive/folders/1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy
 */
function createMonthlyPICPDFReport(filterMonth, filterPIC) {
  const PDF_FOLDER_ID = '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy?hl=vi';
  
  try {
    const allData = getMonthlyPlanData(filterMonth);
    const filteredData = filterPIC 
      ? allData.filter(task => task.pic === filterPIC)
      : allData;
    
    if (filteredData.length === 0) {
      throw new Error('No data found for the selected filters.');
    }
    
    // Build HTML - sử dụng format giống Team Report
    const htmlContent = _buildMonthlyPICReportHTML(filteredData, filterMonth, filterPIC);
    
    // Create PDF
    const blob = HtmlService.createHtmlOutput(htmlContent)
      .getBlob()
      .getAs('application/pdf');
    
    // Build filename
    let fileName;
    if (filterMonth && filterMonth.length === 6) {
      const mm = filterMonth.substring(4, 6);
      const yyyy = filterMonth.substring(0, 4);
      fileName = filterPIC 
        ? `Monthly Report ${mm}${yyyy} - ${filterPIC}.pdf`
        : `Monthly Report ${mm}${yyyy}.pdf`;
    } else {
      fileName = `Monthly Report - ${filterPIC || 'All'}.pdf`;
    }
    
    blob.setName(fileName);
    
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    
    // Delete existing
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }
    
    const pdfFile = folder.createFile(blob);
    
    return `PDF created: ${fileName}\nLink: ${pdfFile.getUrl()}`;
    
  } catch (error) {
    console.error('Error creating PIC PDF:', error);
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
}

/**
 * ✅ NEW: Tạo PDF từ HTML Content đúng cách
 * Sử dụng HtmlService để render HTML thành PDF
 */
function _createPDFFromHTML(htmlContent) {
  try {
    // Phương pháp 1: Sử dụng HtmlService (đơn giản nhất)
    const htmlOutput = HtmlService.createHtmlOutput(htmlContent);
    const blob = htmlOutput.getBlob();
    const pdfBlob = blob.getAs('application/pdf');
    
    return pdfBlob;
    
  } catch (error) {
    console.error('Error in _createPDFFromHTML:', error);
    
    // Fallback: Tạo Google Doc rồi export PDF
    try {
      return _createPDFViaGoogleDoc(htmlContent);
    } catch (e2) {
      throw new Error('Failed to create PDF: ' + error.message);
    }
  }
}

/**
 * ✅ FALLBACK: Tạo PDF qua Google Doc
 */
function _createPDFViaGoogleDoc(htmlContent) {
  // Tạo temp Google Doc
  const tempDoc = DocumentApp.create('Temp_PDF_' + Date.now());
  const docId = tempDoc.getId();
  
  try {
    // Parse HTML và insert vào Doc
    const body = tempDoc.getBody();
    
    // Clear default content
    body.clear();
    
    // Insert HTML content (simplified - Google Docs không support full HTML)
    // Chuyển đổi HTML sang plain text với formatting cơ bản
    const plainText = _htmlToPlainText(htmlContent);
    body.appendParagraph(plainText);
    
    tempDoc.saveAndClose();
    
    // Export as PDF
    const file = DriveApp.getFileById(docId);
    const pdfBlob = file.getAs('application/pdf');
    
    // Cleanup
    file.setTrashed(true);
    
    return pdfBlob;
    
  } catch (error) {
    // Cleanup on error
    DriveApp.getFileById(docId).setTrashed(true);
    throw error;
  }
}

/**
 * ✅ NEW: Build HTML cho PIC Report (giống format Team Report)
 */
function _buildMonthlyPICReportHTML(tasks, filterMonth, filterPIC) {
  const monthDisplay = filterMonth ? _formatMonthDisplay(filterMonth) : 'All Months';
  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  
  // Calculate Statistics
  const stats = {
    totalTasks: tasks.length,
    completionRate: 0,
    marketingEvents: 0,
    marketResearch: 0,
    training: 0,
    projects: 0,
    design: 0
  };
  
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  stats.completionRate = stats.totalTasks > 0 
    ? Math.round((completedCount / stats.totalTasks) * 100) 
    : 0;
  
  // Count by type (unique Key Tasks for events)
  const eventKeyTasks = new Set();
  tasks.filter(t => t.typeTask === 'Marketing-Event')
    .forEach(t => { if (t.keyTask) eventKeyTasks.add(t.keyTask.trim()); });
  stats.marketingEvents = eventKeyTasks.size;
  
  stats.marketResearch = tasks.filter(t => t.typeTask === 'Product-Market Research').length;
  stats.training = tasks.filter(t => t.typeTask === 'Product-Training & Presentation').length;
  stats.projects = tasks.filter(t => t.typeTask === 'Marketing-Project').length;
  stats.design = tasks.filter(t => t.typeTask === 'Marketing-Design').length;
  
  // Helper: Format Result
  function formatResult(text) {
    if (!text || String(text).trim() === '') {
      return '<em style="color: #999;">No data</em>';
    }
    
    let formatted = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '<br>');
    
    // Convert URLs to links
    const urlPattern = /(https?:\/\/[^\s<]+)/gi;
    formatted = formatted.replace(urlPattern, '<a href="$1" style="color: #1976d2;">$1</a>');
    
    return formatted;
  }
  
  // Helper: Build Category Table
  function buildCategoryTable(title, categoryTasks, showTypeColumn) {
    if (categoryTasks.length === 0) {
      return `
        <h3 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-top: 20px; margin-bottom: 10px;">
          ${title}
        </h3>
        <p style="font-family: Calibri; font-size: 11pt; color: #666; font-style: italic; margin-bottom: 20px;">
          No data available
        </p>
      `;
    }
    
    const headerRow = showTypeColumn 
      ? `<tr style="background-color: #f0f0f0;">
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold; text-align: center; width: 50px;">Row</th>
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold; width: 120px;">Type Task</th>
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold; width: 180px;">Key Task</th>
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold;">Result</th>
         </tr>`
      : `<tr style="background-color: #f0f0f0;">
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold; text-align: center; width: 50px;">Row</th>
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold; width: 200px;">Key Task</th>
           <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold;">Result</th>
         </tr>`;
    
    const tableRows = categoryTasks.map(task => {
      const formattedResult = formatResult(task.planReport);
      const escapedType = (task.typeTask || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escapedKey = (task.keyTask || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      if (showTypeColumn) {
        return `
          <tr>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; text-align: center;">${task.rowNumber}</td>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt;">${escapedType}</td>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt;">${escapedKey}</td>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; line-height: 1.5;">${formattedResult}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; text-align: center;">${task.rowNumber}</td>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt;">${escapedKey}</td>
            <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; line-height: 1.5;">${formattedResult}</td>
          </tr>
        `;
      }
    }).join('');
    
    return `
      <h3 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-top: 20px; margin-bottom: 10px;">
        ${title}
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>${headerRow}</thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUrl = ss.getUrl();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="font-family: Calibri; font-size: 11pt; color: black; line-height: 1.6; margin: 0; padding: 20px; background-color: #ffffff;">
      
      <h1 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-bottom: 5px;">
        Monthly Task Report${filterPIC ? ' - ' + filterPIC : ''}
      </h1>
      <p style="font-family: Calibri; font-size: 11pt; color: black; margin-top: 0; margin-bottom: 20px;">
        Period: ${monthDisplay} | Generated: ${currentDate}
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      
      <h2 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-bottom: 15px;">
        Statistics Overview
      </h2>
      
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 12px 24px; background-color: #f0f4f8; border-left: 4px solid #2c5aa0; border-radius: 4px; margin-right: 15px;">
          <span style="font-size: 11pt; color: #666;">Total Tasks:</span>
          <span style="font-size: 20pt; font-weight: bold; color: #2c5aa0; margin-left: 10px;">${stats.totalTasks}</span>
        </span>
        <span style="display: inline-block; padding: 12px 24px; background-color: ${stats.completionRate >= 80 ? '#e8f5e9' : stats.completionRate >= 50 ? '#fff8e1' : '#ffebee'}; border-left: 4px solid ${stats.completionRate >= 80 ? '#4caf50' : stats.completionRate >= 50 ? '#ffc107' : '#f44336'}; border-radius: 4px;">
          <span style="font-size: 11pt; color: #666;">Completion Rate:</span>
          <span style="font-size: 20pt; font-weight: bold; color: ${stats.completionRate >= 80 ? '#2e7d32' : stats.completionRate >= 50 ? '#f57c00' : '#c62828'}; margin-left: 10px;">${stats.completionRate}%</span>
        </span>
      </div>
      
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 20px;">
        <tr>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background-color: #f9f9f9; width: 20%;">
            <div style="font-size: 28pt; font-weight: bold; color: #2c5aa0; margin-bottom: 5px;">${stats.marketingEvents}</div>
            <div style="font-size: 9pt; color: #333;">Marketing Events</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background-color: #f9f9f9; width: 20%;">
            <div style="font-size: 28pt; font-weight: bold; color: #2c5aa0; margin-bottom: 5px;">${stats.projects}</div>
            <div style="font-size: 9pt; color: #333;">Projects</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background-color: #f9f9f9; width: 20%;">
            <div style="font-size: 28pt; font-weight: bold; color: #2c5aa0; margin-bottom: 5px;">${stats.design}</div>
            <div style="font-size: 9pt; color: #333;">Design</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background-color: #f9f9f9; width: 20%;">
            <div style="font-size: 28pt; font-weight: bold; color: #2c5aa0; margin-bottom: 5px;">${stats.training}</div>
            <div style="font-size: 9pt; color: #333;">Training</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; background-color: #f9f9f9; width: 20%;">
            <div style="font-size: 28pt; font-weight: bold; color: #2c5aa0; margin-bottom: 5px;">${stats.marketResearch}</div>
            <div style="font-size: 9pt; color: #333;">Research</div>
          </td>
        </tr>
      </table>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <h2 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-bottom: 15px;">
        Detailed Activities
      </h2>
      
      ${buildCategoryTable('Marketing Events', tasks.filter(t => t.typeTask === 'Marketing-Event'), false)}
      ${buildCategoryTable('Digital Marketing', tasks.filter(t => t.typeTask === 'Marketing-Digital Marketing'), false)}
      ${buildCategoryTable('Design', tasks.filter(t => t.typeTask === 'Marketing-Design'), false)}
      ${buildCategoryTable('KOL Partnership', tasks.filter(t => t.typeTask === 'Marketing-KOL Partnership'), false)}
      ${buildCategoryTable('Projects', tasks.filter(t => t.typeTask === 'Marketing-Project'), false)}
      ${buildCategoryTable('Training', tasks.filter(t => t.typeTask === 'Product-Training & Presentation'), false)}
      ${buildCategoryTable('Research', tasks.filter(t => t.typeTask === 'Product-Market Research'), false)}
      ${buildCategoryTable('Other Activities', 
        tasks.filter(t => 
          t.typeTask !== 'Marketing-Event' &&
          t.typeTask !== 'Marketing-Digital Marketing' &&
          t.typeTask !== 'Marketing-Design' &&
          t.typeTask !== 'Marketing-KOL Partnership' &&
          t.typeTask !== 'Marketing-Project' &&
          t.typeTask !== 'Product-Training & Presentation' &&
          t.typeTask !== 'Product-Market Research'
        ), true)}
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-family: Calibri; font-size: 11pt; color: #1976d2; margin-bottom: 10px;">
        📊 <a href="${sheetUrl}" style="color: #1976d2;">View Detail in Sheet</a>
      </p>
      <p style="font-family: Calibri; font-size: 10pt; color: #666; text-align: center; margin: 0;">
        Marketing Task Management System | Generated on ${new Date().toLocaleDateString('en-GB')}
      </p>
      
    </body>
    </html>
  `;
}


/**
 * ============================================================================
 * 🔧 SERVER-SIDE FUNCTIONS
 * ============================================================================
 */

/**
 * ✅ executeMonthlyPlanUpdateV2 - Cập nhật tasks (không gửi email)
 * @param {Array} updates - Danh sách tasks đã thay đổi
 * @param {string} filterMonth - Tháng đã chọn
 * @param {string} filterPIC - PIC đã chọn (optional)
 * @returns {string} - Kết quả thực hiện
 */
function executeMonthlyPlanUpdateV2(updates, filterMonth, filterPIC) {
  if (!updates || updates.length === 0) {
    return 'No changes to save.';
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthSheet = ss.getSheetByName(CONFIG.SHEETS.MONTH);
  
  if (!monthSheet) {
    throw new Error('MONTH sheet not found.');
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  updates.forEach(task => {
    try {
      const rowNum = task.rowNumber;
      
      if (!rowNum || rowNum < 6) {
        console.warn('Invalid row number:', rowNum);
        errorCount++;
        return;
      }
      
      // Update cells
      // Column mapping (adjust based on your CONFIG):
      // Priority: Column E (5)
      // TypeTask: Column F (6) 
      // KeyTask: Column G (7)
      // PIC: Column H (8)
      // Deadline: Column I (9)
      // Status: Column J (10)
      // PlanReport: Column K (11)
      
      const priorityCol = CONFIG.COLS.MONTH_PRIORITY || 5;
      const deadlineCol = CONFIG.COLS.MONTH_DEADLINE || 9;
      const statusCol = CONFIG.COLS.MONTH_STATUS || 10;
      const planReportCol = CONFIG.COLS.MONTH_PLAN_REPORT || 11;
      
      // Update Priority
      monthSheet.getRange(rowNum, priorityCol).setValue(task.priority ? 'TRUE' : 'FALSE');
      
      // Update Deadline
      if (task.deadline) {
        monthSheet.getRange(rowNum, deadlineCol).setValue(task.deadline);
      }
      
      // Update Status
      if (task.status) {
        monthSheet.getRange(rowNum, statusCol).setValue(task.status);
      }
      
      // Update Plan & Report
      monthSheet.getRange(rowNum, planReportCol).setValue(task.planReport || '');
      
      successCount++;
      
    } catch (e) {
      console.error('Error updating row:', task.rowNumber, e);
      errorCount++;
    }
  });
  
  SpreadsheetApp.flush();
  
  return `Updated ${successCount} task(s) successfully.` + (errorCount > 0 ? ` (${errorCount} error(s))` : '');
}


/**
 * ✅ createMonthlyPDFReport - Tạo PDF report và lưu vào folder
 * @param {string} filterMonth - Tháng để tạo report
 * @param {string} filterPIC - PIC (optional)
 * @returns {string} - Kết quả và link PDF
 */
function createMonthlyPDFReport(filterMonth, filterPIC) {
  // Folder ID từ link: https://drive.google.com/drive/folders/1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy
  const PDF_FOLDER_ID = '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy';
  
  try {
    // Lấy dữ liệu theo filter
    const allData = getMonthlyPlanData(null);
    const filteredData = allData.filter(task => {
      if (!task.typeTask || task.typeTask.trim() === '') return false;
      if (filterMonth && task.month !== filterMonth) return false;
      if (filterPIC && task.pic !== filterPIC) return false;
      return true;
    });
    
    if (filteredData.length === 0) {
      throw new Error('No data found for the selected filters.');
    }
    
    // Format month display
    const monthDisplay = filterMonth ? 
      filterMonth.substring(4, 6) + '/' + filterMonth.substring(0, 4) : 
      'All';
    
    // Tạo HTML content cho PDF
    const htmlContent = buildPDFHtmlContent(filteredData, monthDisplay, filterPIC);
    
    // Tạo tên file
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const fileName = `Monthly_Report_${filterMonth || 'All'}_${filterPIC ? filterPIC.replace(/[^a-zA-Z0-9]/g, '') : 'AllPICs'}_${timestamp}.pdf`;
    
    // Tạo PDF từ HTML
    const blob = HtmlService.createHtmlOutput(htmlContent)
      .getBlob()
      .setName(fileName)
      .getAs('application/pdf');
    
    // Lưu vào folder
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    const pdfFile = folder.createFile(blob);
    const pdfUrl = pdfFile.getUrl();
    
    return `PDF created successfully!\nFile: ${fileName}\nLink: ${pdfUrl}`;
    
  } catch (e) {
    console.error('Error creating PDF:', e);
    throw new Error('Failed to create PDF: ' + e.message);
  }
}


/**
 * ✅ buildPDFHtmlContent - Tạo HTML content cho PDF
 * @param {Array} tasks - Danh sách tasks
 * @param {string} monthDisplay - Tháng hiển thị
 * @param {string} picFilter - PIC filter
 * @returns {string} - HTML content
 */
function buildPDFHtmlContent(tasks, monthDisplay, picFilter) {
  const currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  
  // Group tasks by Type
  const tasksByType = {};
  tasks.forEach(task => {
    const type = task.typeTask || 'Other';
    if (!tasksByType[type]) {
      tasksByType[type] = [];
    }
    tasksByType[type].push(task);
  });
  
  // Statistics
  const stats = {
    total: tasks.length,
    notStarted: tasks.filter(t => t.status === 'Not Started').length,
    inProgress: tasks.filter(t => t.status && t.status.includes('In Progress')).length,
    completed: tasks.filter(t => t.status === 'Completed').length
  };
  
  // Build task rows HTML
  let taskRowsHtml = '';
  Object.keys(tasksByType).forEach(type => {
    const typeTasks = tasksByType[type];
    
    taskRowsHtml += `
      <tr class="type-header">
        <td colspan="6" style="background:#3b5998; color:white; font-weight:bold; padding:10px;">
          ${_htmlEsc(type)} (${typeTasks.length} tasks)
        </td>
      </tr>
    `;
    
    typeTasks.forEach((task, idx) => {
      const deadlineStr = task.deadline || '-';
      const statusClass = task.status === 'Completed' ? 'completed' : 
                         (task.status && task.status.includes('In Progress') ? 'inprogress' : '');
      
      taskRowsHtml += `
        <tr class="${statusClass}">
          <td style="padding:8px; border:1px solid #ddd;">${idx + 1}</td>
          <td style="padding:8px; border:1px solid #ddd;">${_htmlEsc(task.keyTask || '-')}</td>
          <td style="padding:8px; border:1px solid #ddd;">${_htmlEsc(task.pic || '-')}</td>
          <td style="padding:8px; border:1px solid #ddd;">${deadlineStr}</td>
          <td style="padding:8px; border:1px solid #ddd;">${_htmlEsc(task.status || '-')}</td>
          <td style="padding:8px; border:1px solid #ddd; white-space:pre-wrap;">${_htmlEsc(task.planReport || '-')}</td>
        </tr>
      `;
    });
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Calibri', Arial, sans-serif;
          font-size: 11px;
          color: #333;
          margin: 20px;
        }
        .header {
          background: #3b5998;
          color: white;
          padding: 20px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 22px;
        }
        .header p {
          margin: 0;
          opacity: 0.9;
        }
        .stats {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-box {
          background: #f9f9f9;
          border: 1px solid #ddd;
          padding: 12px 20px;
          text-align: center;
          min-width: 100px;
        }
        .stat-box .label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
        }
        .stat-box .value {
          font-size: 24px;
          font-weight: bold;
          color: #3b5998;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background: #f9f9f9;
          padding: 10px;
          text-align: left;
          border: 1px solid #ddd;
          font-weight: 600;
        }
        tr.completed td {
          background: #e8f5e9;
        }
        tr.inprogress td {
          background: #e3f2fd;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #888;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Monthly Task Report</h1>
        <p>Month: ${monthDisplay} ${picFilter ? '| PIC: ' + _htmlEsc(picFilter) : '| All PICs'}</p>
        <p>Generated: ${currentDate}</p>
      </div>
      
      <div class="stats">
        <div class="stat-box">
          <div class="label">Total</div>
          <div class="value">${stats.total}</div>
        </div>
        <div class="stat-box">
          <div class="label">Not Started</div>
          <div class="value" style="color:#6c757d;">${stats.notStarted}</div>
        </div>
        <div class="stat-box">
          <div class="label">In Progress</div>
          <div class="value" style="color:#0066cc;">${stats.inProgress}</div>
        </div>
        <div class="stat-box">
          <div class="label">Completed</div>
          <div class="value" style="color:#28a745;">${stats.completed}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:25%;">Key Task</th>
            <th style="width:12%;">PIC</th>
            <th style="width:10%;">Deadline</th>
            <th style="width:13%;">Status</th>
            <th style="width:35%;">Plan & Report</th>
          </tr>
        </thead>
        <tbody>
          ${taskRowsHtml}
        </tbody>
      </table>
      
      <div class="footer">
        Marketing Monthly Report - Confidential
      </div>
    </body>
    </html>
  `;
}/**
 * 💾 XỬ LÝ CẬP NHẬT MONTHLY PLAN
 * Save Priority và Plan & Report về MONTH sheet
 */
/**
 * 💾 XỬ LÝ CẬP NHẬT VÀ THÊM MỚI - PHIÊN BẢN CẢI THIỆN
 * ✅ Chỉ xử lý các dòng có thay đổi
 * ✅ Validate rowNumber >= 6
 * @param {Array} updates - Existing row updates (CHỈ CÁC DÒNG CÓ THAY ĐỔI)
 * @param {Array} newRows - New rows to add
 * @param {boolean} sendEmail - Send email report
 */
/**
 * 💾 XỬ LÝ CẬP NHẬT VÀ THÊM MỚI - PHIÊN BẢN IMPROVED
 * ✅ Tách riêng email sending để không block
 * ✅ Better error handling
 * ✅ Return ngay lập tức
 * @param {Array} updates - Existing row updates
 * @param {Array} newRows - New rows to add
 * @param {boolean} sendEmail - Send email report
 */
/**
 * 💾 XỬ LÝ CẬP NHẬT VÀ THÊM MỚI - PHIÊN BẢN IMPROVED V2.0
 * ✅ Nhận filter params từ dialog
 * ✅ Truyền filter params cho email function
 * ✅ Tách riêng email sending để không block
 * ✅ Better error handling
 * 
 * @param {Array} updates - Existing row updates
 * @param {Array} newRows - New rows to add
 * @param {boolean} sendEmail - Send email report
 * @param {string} filterMonth - Month filter value (YYYYMM format) từ dialog
 * @param {string} filterPIC - PIC filter value từ dialog
 */
function executeMonthlyPlanUpdate(updates, newRows, sendEmail, filterMonth, filterPIC) {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) {
      throw new Error('MONTH sheet not found');
    }
    
    let updateCount = 0;
    let addCount = 0;
    let skippedCount = 0;
    
    console.log(`📊 Starting executeMonthlyPlanUpdate...`);
    console.log(`   - Updates: ${updates.length}`);
    console.log(`   - New rows: ${newRows.length}`);
    console.log(`   - Send email: ${sendEmail}`);
    console.log(`   - Filter Month: ${filterMonth || 'None'}`);
    console.log(`   - Filter PIC: ${filterPIC || 'None'}`);
    
    // ✅ 1. PROCESS UPDATES - Chỉ các dòng có thay đổi
    console.log(`Processing ${updates.length} updated rows...`);
    
    updates.forEach(update => {
      try {
        const row = update.rowNumber;
        
        // ✅ CRITICAL VALIDATION: Đảm bảo rowNumber >= 6
        if (row < 6) {
          console.warn(`⚠️ Skipping row ${row} - cannot update header area (rows 1-5)`);
          skippedCount++;
          return;
        }
        
        // ✅ VALIDATE: Row phải tồn tại trong sheet
        const lastRow = monthSheet.getLastRow();
        if (row > lastRow) {
          console.warn(`⚠️ Skipping row ${row} - exceeds last row ${lastRow}`);
          skippedCount++;
          return;
        }
        
        console.log(`Updating row ${row}...`);
        
        // Update Priority (Column K) - SAFE SET
        if (update.priority !== undefined) {
          _safeSetValueForMONTH(monthSheet, row, 11, update.priority);
        }
        
        // Update Plan & Report (Column J) - SAFE SET
        if (update.planReport !== undefined) {
          const formattedPlan = _convertNewlineToBullets(update.planReport);
          _safeSetValueForMONTH(monthSheet, row, 10, formattedPlan);
        }
        
        // Update Type Task (Column E) - SAFE SET
        if (update.typeTask !== undefined && update.typeTask.trim() !== '') {
          _safeSetValueForMONTH(monthSheet, row, 5, update.typeTask);
        }
        
        // Update Key Task (Column F) - SAFE SET
        if (update.keyTask !== undefined && update.keyTask.trim() !== '') {
          _safeSetValueForMONTH(monthSheet, row, 6, update.keyTask);
        }
        
        // Update PIC (Column G) - SAFE SET
        if (update.pic !== undefined && update.pic.trim() !== '') {
          _safeSetValueForMONTH(monthSheet, row, 7, update.pic);
        }
        
        // Update Deadline (Column H)
        if (update.deadline !== undefined && update.deadline !== '') {
          const deadlineDate = new Date(update.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            monthSheet.getRange(row, 8)
              .setValue(deadlineDate)
              .setNumberFormat('dd/mm/yyyy');
          }
        }
        
        // Update Status (Column I) - SAFE SET
        if (update.status !== undefined) {
          _safeSetValueForMONTH(monthSheet, row, 9, update.status);
        }
        
        updateCount++;
        
      } catch (error) {
        console.error(`Error updating row ${update.rowNumber}:`, error);
        skippedCount++;
      }
    });
    
    // ✅ 2. PROCESS NEW ROWS
    console.log(`Processing ${newRows.length} new rows...`);
    
    newRows.forEach(newRow => {
      try {
        // Validate: phải có Type Task
        if (!newRow.typeTask || newRow.typeTask.trim() === '') {
          console.log('Skipping new row without Type Task');
          return;
        }
        
        // ✅ Find first empty row (BẮT ĐẦU TỪ DÒNG 6)
        const targetRow = _findFirstEmptyRowInMONTH(monthSheet);
        
        // ✅ VALIDATE: targetRow >= 6
        if (targetRow < 6) {
          console.error(`⚠️ Invalid target row ${targetRow}, skipping new row`);
          return;
        }
        
        console.log(`Adding new row to MONTH sheet at row ${targetRow}`);
        
        // Set Month (Column D)
        if (newRow.month && newRow.month.length === 6) {
          monthSheet.getRange(targetRow, 4).setValue(newRow.month);
        }
        
        // Set Type Task (Column E) - SAFE SET
        _safeSetValueForMONTH(monthSheet, targetRow, 5, newRow.typeTask);
        
        // Set Key Task (Column F) - SAFE SET
        _safeSetValueForMONTH(monthSheet, targetRow, 6, newRow.keyTask || '');
        
        // Set PIC (Column G) - SAFE SET
        _safeSetValueForMONTH(monthSheet, targetRow, 7, newRow.pic || '');
        
        // Set Deadline (Column H)
        if (newRow.deadline && newRow.deadline !== '') {
          const deadlineDate = new Date(newRow.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            monthSheet.getRange(targetRow, 8)
              .setValue(deadlineDate)
              .setNumberFormat('dd/mm/yyyy');
          }
        }
        
        // Set Status (Column I) - SAFE SET
        _safeSetValueForMONTH(monthSheet, targetRow, 9, newRow.status || 'Not Started');
        
        // Set Plan & Report (Column J)
        const formattedPlan = _convertNewlineToBullets(newRow.planReport || '');
        monthSheet.getRange(targetRow, 10).setValue(formattedPlan);
        
        // Set Priority (Column K)
        monthSheet.getRange(targetRow, 11).setValue(newRow.priority || false);
        
        addCount++;
        
      } catch (error) {
        console.error('Error adding new row:', error);
        skippedCount++;
      }
    });
    
    // ✅ 3. BUILD RESULT MESSAGE
    const resultParts = [];
    if (updateCount > 0) resultParts.push(`Updated ${updateCount} row(s)`);
    if (addCount > 0) resultParts.push(`Added ${addCount} new row(s)`);
    if (skippedCount > 0) resultParts.push(`Skipped ${skippedCount} invalid row(s)`);
    
    const resultMessage = resultParts.join(', ');
    
    console.log(`✅ Final result: ${resultMessage}`);
    
    // ✅ 4. IMPROVED EMAIL HANDLING WITH FILTER PARAMS
    // 🆕 GỬI EMAIL ASYNC - KHÔNG BLOCK MAIN PROCESS
    if (sendEmail) {
      try {
        console.log('⏳ Attempting to send monthly report email...');
        console.log(`   📧 Filter Month: ${filterMonth || 'All'}`);
        console.log(`   📧 Filter PIC: ${filterPIC || 'All'}`);
        
        // ⭐ TRUYỀN FILTER PARAMS VÀO EMAIL FUNCTION
        sendMonthlyReportEmail(filterMonth, filterPIC);
        
        console.log('✅ Email sent successfully');
        return `${resultMessage} successfully! Email report has been sent.`;
      } catch (emailError) {
        // ⚠️ NẾU EMAIL FAIL, VẪN RETURN SUCCESS CHO UPDATE
        console.error('❌ Email sending failed:', emailError);
        return `${resultMessage} successfully! ⚠️ However, email failed to send: ${emailError.message}`;
      }
    }
    
    return `${resultMessage} successfully!`;
    
  } catch (error) {
    console.error('❌ Error in executeMonthlyPlanUpdate:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(`Failed to update: ${error.message}`);
  }
}

/**
 * 📧 GỬI EMAIL BÁO CÁO THÁNG
 */
/**
 * 📧 GỬI EMAIL BÁO CÁO THÁNG - IMPROVED
 * ✅ Better validation
 * ✅ More informative error messages
 */


/**
 * Helper: Build HTML email cho monthly report
 */
/**
 * 📝 BUILD HTML EMAIL - VERSION 2.0 IMPROVED
 * ✅ Simple Calibri style, no colors
 * ✅ Compact statistics table (2 columns layout)
 * ✅ New statistics logic
 * ✅ 8 category tables
 * 
 * @param {Array} tasks - Filtered tasks array
 * @param {string} filterMonth - YYYYMM format
 * @returns {string} HTML email body
 */
function _buildMonthlyReportEmailHTML(tasks, filterMonth) {
  const monthDisplay = filterMonth ? _formatMonthDisplay(filterMonth) : 'All Months';
  
  // ========== CALCULATE STATISTICS ==========
  const stats = {
    marketingEvents: 0,      // 3.1: Unique Key Tasks
    marketResearch: 0,       // 3.2: Count rows
    training: 0,             // 3.3: Count rows
    kolPartnership: 0,       // 3.4: Unique Key Tasks
    designPublications: 0,   // 3.5: Count rows
    // ✅ NEW: Thêm 2 chỉ số mới
    totalTasks: 0,           // Tổng số dòng
    completionRate: 0        // % Completed
  };
  
  // ✅ NEW: Tính tổng số tasks
  stats.totalTasks = tasks.length;
  
  // ✅ NEW: Tính tỉ lệ Completed
  const completedCount = tasks.filter(t => {
    const status = (t.status || '').toString().trim();
    return status === 'Completed';
  }).length;
  
  stats.completionRate = stats.totalTasks > 0 
    ? Math.round((completedCount / stats.totalTasks) * 100) 
    : 0;
  
  // 3.1: Marketing-Event (unique Key Tasks)
  const eventKeyTasks = new Set();
  tasks.filter(t => t.typeTask === 'Marketing-Event')
    .forEach(t => {
      if (t.keyTask && t.keyTask.trim() !== '') {
        eventKeyTasks.add(t.keyTask.trim());
      }
    });
  stats.marketingEvents = eventKeyTasks.size;
  
  // 3.2: Product-Market Research (count rows)
  stats.marketResearch = tasks.filter(t => t.typeTask === 'Product-Market Research').length;
  
  // 3.3: Product-Training & Presentation (count rows)
  stats.training = tasks.filter(t => t.typeTask === 'Product-Training & Presentation').length;
  
  // 3.4: Marketing-KOL Partnership (unique Key Tasks)
  const kolKeyTasks = new Set();
  tasks.filter(t => t.typeTask === 'Marketing-KOL Partnership')
    .forEach(t => {
      if (t.keyTask && t.keyTask.trim() !== '') {
        kolKeyTasks.add(t.keyTask.trim());
      }
    });
  stats.kolPartnership = kolKeyTasks.size;
  
  // 3.5: Marketing-Design (count rows)
  stats.designPublications = tasks.filter(t => t.typeTask === 'Marketing-Design').length;
  
  // ========== HELPER FUNCTION - FORMAT RESULT WITH LINE BREAKS ==========
  // ✅ NEW: Helper để preserve line breaks trong Result
  function formatResultWithLineBreaks(resultText) {
    if (!resultText || resultText.trim() === '') {
      return '<em style="color: #999;">No data</em>';
    }
    
    // Convert newlines to <br> tags
    const formattedText = String(resultText)
      .replace(/\r\n/g, '<br>')  // Windows line breaks
      .replace(/\n/g, '<br>')    // Unix line breaks
      .replace(/\r/g, '<br>');   // Old Mac line breaks
    
    return formattedText;
  }
  
  // ========== HELPER FUNCTION - BUILD CATEGORY TABLE (NO MONTH COLUMN) ==========
  // ✅ UPDATED: Bỏ cột Month
  function buildCategoryTable(title, categoryTasks) {
    if (categoryTasks.length === 0) {
      return `
        <h3 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-top: 20px; margin-bottom: 10px;">
          ${title}
        </h3>
        <p style="font-family: Calibri; font-size: 11pt; color: #666; font-style: italic; margin-bottom: 20px;">
          No data available
        </p>
      `;
    }
    
    const tableRows = categoryTasks.map(task => {
      // ✅ Format Result với line breaks
      const formattedResult = formatResultWithLineBreaks(task.planReport);
      
      return `
      <tr>
        <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; text-align: center; width: 50px;">
          ${task.rowNumber}
        </td>
        <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; width: 160px;">
          ${task.typeTask || ''}
        </td>
        <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; width: 200px;">
          ${task.keyTask || ''}
        </td>
        <td style="border: 1px solid #ddd; padding: 6px 8px; font-family: Calibri; font-size: 11pt; line-height: 1.5;">
          ${formattedResult}
        </td>
      </tr>
    `;
    }).join('');
    
    return `
      <h3 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-top: 20px; margin-bottom: 10px;">
        ${title}
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold; text-align: center;">Row</th>
            <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold;">Type Task</th>
            <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold;">Key Task</th>
            <th style="border: 1px solid #ddd; padding: 8px; font-family: Calibri; font-size: 11pt; font-weight: bold;">Result</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  }
  
  // ========== BUILD EMAIL HTML ==========
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="font-family: Calibri; font-size: 11pt; color: black; line-height: 1.6; margin: 0; padding: 20px; background-color: #ffffff;">
      
      <!-- Header -->
      <h1 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-bottom: 5px;">
        Monthly Marketing Report
      </h1>
      <p style="font-family: Calibri; font-size: 11pt; color: black; margin-top: 0; margin-bottom: 20px;">
        Period: ${monthDisplay}
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      
      <!-- Statistics Section -->
      <h2 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-bottom: 15px;">
        Statistics Overview
      </h2>
      
      <!-- ✅ NEW: Summary Stats (Total Tasks & Completion Rate) -->
      <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: center;">
        <!-- Total Tasks -->
        <div style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #f0f4f8;
          border-left: 4px solid #2c5aa0;
          border-radius: 4px;
        ">
          <span style="font-size: 11pt; color: #666; font-family: Calibri;">Total Tasks:</span>
          <span style="font-size: 20pt; font-weight: bold; color: #2c5aa0; margin-left: 10px; font-family: Calibri;">
            ${stats.totalTasks}
          </span>
        </div>
        
        <!-- Completion Rate -->
        <div style="
          display: inline-block;
          padding: 12px 24px;
          background-color: ${stats.completionRate >= 80 ? '#e8f5e9' : stats.completionRate >= 50 ? '#fff8e1' : '#ffebee'};
          border-left: 4px solid ${stats.completionRate >= 80 ? '#4caf50' : stats.completionRate >= 50 ? '#ffc107' : '#f44336'};
          border-radius: 4px;
        ">
          <span style="font-size: 11pt; color: #666; font-family: Calibri;">Completion Rate:</span>
          <span style="font-size: 20pt; font-weight: bold; color: ${stats.completionRate >= 80 ? '#2e7d32' : stats.completionRate >= 50 ? '#f57c00' : '#c62828'}; margin-left: 10px; font-family: Calibri;">
            ${stats.completionRate}%
          </span>
        </div>
      </div>
      
      <!-- Card Container with 5 boxes in a row -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 20px;">
        <tr>
          <!-- Card 1: Marketing Events -->
          <td style="
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px 15px;
            text-align: center;
            background-color: #f9f9f9;
            width: 20%;
          ">
            <div style="font-size: 32pt; font-weight: bold; color: #2c5aa0; margin-bottom: 8px;">
              ${stats.marketingEvents}
            </div>
            <div style="font-size: 9pt; color: #333; font-family: Calibri;">
              Marketing Events
            </div>
          </td>
          
          <!-- Card 2: Market Research -->
          <td style="
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px 15px;
            text-align: center;
            background-color: #f9f9f9;
            width: 20%;
          ">
            <div style="font-size: 32pt; font-weight: bold; color: #2c5aa0; margin-bottom: 8px;">
              ${stats.marketResearch}
            </div>
            <div style="font-size: 9pt; color: #333; font-family: Calibri;">
              Research Report
            </div>
          </td>
          
          <!-- Card 3: Training Activities -->
          <td style="
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px 15px;
            text-align: center;
            background-color: #f9f9f9;
            width: 20%;
          ">
            <div style="font-size: 32pt; font-weight: bold; color: #2c5aa0; margin-bottom: 8px;">
              ${stats.training}
            </div>
            <div style="font-size: 9pt; color: #333; font-family: Calibri;">
              Training Activities
            </div>
          </td>
          
          <!-- Card 4: KOL Partnership -->
          <td style="
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px 15px;
            text-align: center;
            background-color: #f9f9f9;
            width: 20%;
          ">
            <div style="font-size: 32pt; font-weight: bold; color: #2c5aa0; margin-bottom: 8px;">
              ${stats.kolPartnership}
            </div>
            <div style="font-size: 9pt; color: #333; font-family: Calibri;">
              KOL Partnership 
            </div>
          </td>
          
          <!-- Card 5: Design Publications -->
          <td style="
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px 15px;
            text-align: center;
            background-color: #f9f9f9;
            width: 20%;
          ">
            <div style="font-size: 32pt; font-weight: bold; color: #2c5aa0; margin-bottom: 8px;">
              ${stats.designPublications}
            </div>
            <div style="font-size: 9pt; color: #333; font-family: Calibri;">
              Design Publications
            </div>
          </td>
        </tr>
      </table>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      
      <!-- Detailed Tables by Category -->
      <h2 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: black; margin-bottom: 15px;">
        Detailed Activities
      </h2>
      
      ${buildCategoryTable('4.1. Marketing Events', 
        tasks.filter(t => t.typeTask === 'Marketing-Event'))}
      
      ${buildCategoryTable('4.2. Digital Marketing', 
        tasks.filter(t => t.typeTask === 'Marketing-Digital Marketing'))}
      
      ${buildCategoryTable('4.3. Design', 
        tasks.filter(t => t.typeTask === 'Marketing-Design'))}
      
      ${buildCategoryTable('4.4. KOL Partnership', 
        tasks.filter(t => t.typeTask === 'Marketing-KOL Partnership'))}
      
      ${buildCategoryTable('4.5. Projects', 
        tasks.filter(t => t.typeTask === 'Marketing-Project'))}
      
      ${buildCategoryTable('4.6. Training', 
        tasks.filter(t => t.typeTask === 'Product-Training & Presentation'))}
      
      ${buildCategoryTable('4.7. Research', 
        tasks.filter(t => t.typeTask === 'Product-Market Research'))}
      
      ${buildCategoryTable('4.8. Other Activities', 
        tasks.filter(t => 
          t.typeTask !== 'Marketing-Event' &&
          t.typeTask !== 'Marketing-Digital Marketing' &&
          t.typeTask !== 'Marketing-Design' &&
          t.typeTask !== 'Marketing-KOL Partnership' &&
          t.typeTask !== 'Marketing-Project' &&
          t.typeTask !== 'Product-Training & Presentation' &&
          t.typeTask !== 'Product-Market Research'
        ))}
      
      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
      <p style="font-family: Calibri; font-size: 10pt; color: #666; text-align: center; margin: 0;">
        Marketing Task Management System | Generated on ${new Date().toLocaleDateString('en-GB')}
      </p>
      
    </body>
    </html>
  `;
}
/**
 * 🆕 BUILD TABLE ROWS - ADVANCED VERSION
 * Với autocomplete, date picker, status dropdown
 */
/**
 * 🆕 BUILD TABLE ROWS - ADVANCED VERSION WITH CHANGE TRACKING
 * Thêm data-original-* attributes để track changes
 */
function _buildMonthlyTaskRowsAdvanced(tasks, typeOptions, keyTaskOptions, picOptions, statusOptions) {
  if (!tasks || tasks.length === 0) {
    return '<tr><td colspan="9" style="text-align: center; padding: 30px; color: #999;">Không có dữ liệu</td></tr>';
  }
  
  return tasks.map(task => {
    const rowClass = task.priority ? 'priority' : '';
    const priorityChecked = task.priority ? 'checked' : '';
    
    // Build status select
    const statusSelect = statusOptions.map(opt => 
      `<option value="${opt}" ${task.status === opt ? 'selected' : ''}>${opt}</option>`
    ).join('');
    
    // ✅ THÊM: Data attributes để track giá trị ban đầu
    const deadlineValue = task.deadline ? _formatDateForInput(task.deadline) : '';
    
    return `
      <tr class="${rowClass}" 
          data-row="${task.rowNumber}"
          data-original-priority="${task.priority ? 'true' : 'false'}"
          data-original-type="${_htmlEsc(task.typeTask)}"
          data-original-keytask="${_htmlEsc(task.keyTask)}"
          data-original-pic="${_htmlEsc(task.pic)}"
          data-original-deadline="${deadlineValue}"
          data-original-status="${_htmlEsc(task.status)}"
          data-original-plan="${_htmlEsc(task.planReport)}">
        
        <td class="col-row">${task.serialNumber || task.rowNumber}</td>
        <td class="col-priority">
          <input type="checkbox" name="priority" ${priorityChecked} onchange="updateRowColors()">
        </td>
        <td class="col-month">${_htmlEsc(task.monthDisplay)}</td>
        <td class="col-type">
          <div class="autocomplete-container">
            <input type="text" 
                   data-autocomplete="type" 
                   class="autocomplete-input" 
                   value="${_htmlEsc(task.typeTask)}"
                   placeholder="Type to search..."
                   onchange="updateRowColors()">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        <td class="col-keytask">
          <div class="autocomplete-container">
            <input type="text" 
                   data-autocomplete="keyTask" 
                   class="autocomplete-input" 
                   value="${_htmlEsc(task.keyTask)}"
                   placeholder="Type to search...">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        <td class="col-pic">
          <div class="autocomplete-container">
            <input type="text" 
                   data-autocomplete="pic" 
                   class="autocomplete-input" 
                   value="${_htmlEsc(task.pic)}"
                   placeholder="Select PIC...">
            <div class="autocomplete-dropdown"></div>
          </div>
        </td>
        <td class="col-deadline">
          <input type="date" value="${deadlineValue}">
        </td>
        <td class="col-status">
          <select name="status" onchange="updateRowColors()">${statusSelect}</select>
        </td>
        <td class="col-plan">
     <textarea name="planReport">${_convertBrToNewlineForDisplay(task.planReport || '')}</textarea>
   </td>
      </tr>
    `;
  }).join('');
}
/**
 * ✅ Helper: Chuyển đổi <br> thành xuống dòng thực sự
 * Để hiển thị đúng trong textarea
 */
function _convertBrToNewline(text) {
  if (!text) return '';
  
  // Chuyển các dạng <br>, <br/>, <BR>, etc thành \n
  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();
}
/**
 * Format Plan & Report để hiển thị với preserved formatting
 */
function _formatPlanReportForDisplay(text) {
  if (!text) return '';
  // Preserve line breaks and basic formatting
  return String(text).trim();
}

/**
 * Convert deadline format từ dd/mm/yyyy sang yyyy-mm-dd cho input[type="date"]
 */
function _convertDeadlineToInputFormat(deadline) {
  if (!deadline) return '';
  
  try {
    // Nếu deadline là dd/mm/yyyy
    const parts = deadline.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '';
  } catch (error) {
    console.error('Error converting deadline:', error);
    return '';
  }
}

/**
 * Lấy PIC options từ Master sheet
 */
function _getPICOptionsFromMaster() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) {
      console.warn('Master sheet not found');
      return [];
    }
    
    // Lấy data từ Master!$G$3:$G$10
    const picRange = masterSheet.getRange('G3:G10');
    const picValues = picRange.getValues()
      .flat()
      .filter(v => v && String(v).trim() !== '');
    
    return [...new Set(picValues)].sort();
  } catch (error) {
    console.error('Error getting PIC options:', error);
    return [];
  }
}

/**
 * Lấy PICs từ MONTH sheet (cho filter)
 */
function _getMonthlyPICsFromSheet() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    // Đọc column G (PIC)
    const picValues = monthSheet.getRange(6, 7, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    return [...new Set(picValues)].sort();
  } catch (error) {
    console.error('Error getting PICs from sheet:', error);
    return [];
  }
}/**
 * 💾 XỬ LÝ CẬP NHẬT VÀ THÊM MỚI - PHIÊN BẢN HOÀN CHỈNH
 * @param {Array} updates - Existing row updates
 * @param {Array} newRows - New rows to add
 * @param {boolean} sendEmail - Send email report
 */


/**
 * SAFE SET VALUE cho MONTH sheet với xử lý Data Validation
 */
function _safeSetValueForMONTH(sheet, row, col, value) {
  const range = sheet.getRange(row, col);
  
  // Remove validation
  const validation = range.getDataValidation();
  if (validation) {
    range.clearDataValidations();
  }
  
  // Set value
  range.setValue(value);
  
  // Restore validation
  if (validation) {
    range.setDataValidation(validation);
  }
}

/**
 * Tìm dòng trống đầu tiên trong MONTH sheet
 */
/**
 * ✅ CẢI THIỆN: Tìm dòng trống đầu tiên trong MONTH sheet
 * BẮT BUỘC: Chỉ tìm từ dòng 6 trở đi (dòng 1-5 là header)
 */
function _findFirstEmptyRowInMONTH(monthSheet) {
  const lastRow = monthSheet.getLastRow();
  
  // ✅ CRITICAL: Bắt đầu từ dòng 6 (data rows)
  const START_ROW = 6;
  
  // Nếu sheet chưa có dữ liệu đến dòng 6, trả về dòng 6
  if (lastRow < START_ROW) {
    console.log(`Sheet has only ${lastRow} rows, returning row ${START_ROW}`);
    return START_ROW;
  }
  
  // Tìm dòng trống từ dòng 6 đến lastRow + 1
  for (let row = START_ROW; row <= lastRow + 1; row++) {
    // Check if row is empty (check column E - Type Task)
    const typeTask = monthSheet.getRange(row, 5).getValue(); // Column E
    
    if (!typeTask || String(typeTask).trim() === '') {
      console.log(`Found empty row at ${row}`);
      return row;
    }
  }
  
  // ✅ Nếu không tìm thấy dòng trống, trả về dòng tiếp theo sau lastRow
  const nextRow = lastRow + 1;
  console.log(`No empty row found, using next row ${nextRow}`);
  
  // ✅ DOUBLE CHECK: Đảm bảo nextRow >= START_ROW
  return Math.max(nextRow, START_ROW);
}

/**
 * 📧 GỬI EMAIL BÁO CÁO THÁNG
 */
/**
 * 📧 GỬI EMAIL BÁO CÁO THÁNG - IMPROVED VERSION V2.0
 * ✅ Nhận filter params
 * ✅ Gửi đúng data theo bộ lọc
 * ✅ Tạo và đính kèm PDF report
 * 
 * @param {string} filterMonth - YYYYMM format
 * @param {string} filterPIC - PIC name
 */
function sendMonthlyReportEmail(filterMonth, filterPIC) {
  try {
    console.log('📧 Starting monthly report email process...');
    console.log(`Filters - Month: ${filterMonth}, PIC: ${filterPIC}`);
    
    const currentUser = _getCurrentUserEmail();
    
    if (!currentUser || currentUser.trim() === '') {
      throw new Error('Cannot identify current user email');
    }
    
    // ✅ Get filtered data
    const filteredData = getMonthlyPlanData(filterMonth, filterPIC);
    console.log(`Found ${filteredData.length} filtered tasks`);
    
    if (!filteredData || filteredData.length === 0) {
      console.warn('⚠️ No filtered data to send, skipping...');
      return;
    }
    
    // ✅ Build email HTML with new format
    const emailBody = _buildMonthlyReportEmailHTML(filteredData, filterMonth);
    
    if (!emailBody || emailBody.length < 100) {
      throw new Error('Email body is too short or empty');
    }
    
    // ✅ Generate PDF report
    console.log('📄 Generating PDF report...');
    const pdfBlob = _generateMonthlyReportPDF(filteredData, filterMonth);
    console.log('✅ PDF generated successfully');
    
    // ✅ Build subject and filename
    const monthDisplay = filterMonth ? _formatMonthDisplay(filterMonth) : 'All Months';
    const subject = `Monthly Marketing Report - ${monthDisplay}`;
    
    // ✅ Send email with PDF attachment
    console.log(`📤 Sending email to: ${currentUser}`);
    mmhMail_({
      to: currentUser,
      subject: subject,
      htmlBody: emailBody,
      attachments: [pdfBlob]  // ⭐ ĐÍNH KÈM PDF
    });
    
    console.log('✅ Monthly report email sent successfully with PDF attachment!');
    
  } catch (error) {
    console.error('❌ Error in sendMonthlyReportEmail:', error);
    throw new Error(`Failed to send monthly email: ${error.message}`);
  }
}

/**
 * Build HTML email cho monthly report
 */
/**
 * ✅ NEW: Format Task Result with bullet points and clickable links
 */
function _formatTaskResultWithBullets(text) {
  if (!text || text === 'N/A') {
    return '<em style="color:#999;">N/A</em>';
  }
  
  const str = text.toString().trim();
  if (str === '') {
    return '<em style="color:#999;">N/A</em>';
  }
  
  // Normalize line breaks
  const normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by line breaks
  const lines = normalized.split('\n').filter(line => line.trim() !== '');
  
  // If only 1 line, format as single paragraph with clickable links
  if (lines.length === 1) {
    return _makeLinksClickable(_htmlEsc(lines[0]));
  }
  
  // Multiple lines → Convert to bullet points
  const bulletItems = lines.map(line => {
    const trimmedLine = line.trim();
    const formattedLine = _makeLinksClickable(_htmlEsc(trimmedLine));
    return `<li style="margin:4px 0; line-height:1.4;">${formattedLine}</li>`;
  }).join('');
  
  return `
    <ul style="margin:0; padding-left:20px; font-family:Calibri, Arial, sans-serif; font-size:11pt; color:#000000;">
      ${bulletItems}
    </ul>
  `;
}

/**
 * ✅ NEW: Convert URLs to clickable links
 */
function _makeLinksClickable(text) {
  const urlPattern = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  
  return text.replace(urlPattern, (url) => {
    const href = url.startsWith('www.') ? 'http://' + url : url;
    return `<a href="${href}" style="color:#0066cc; text-decoration:underline; font-family:Calibri, Arial, sans-serif;" target="_blank">${url}</a>`;
  });
}/**
 * ✅ NEW HELPER: Convert <br> tags to newlines for textarea display
 * @param {string} str - String với <br> tags
 * @returns {string} String với newlines
 */
function _convertBrToNewline(str) {
  if (!str) return '';
  
  return String(str)
    // Replace các dạng <br> tag về newline
    .replace(/<br\s*\/?>/gi, '\n')  // <br>, <br/>, <br />
    // Escape HTML entities để tránh XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/**
 * ✅ Helper: Chuyển đổi text xuống dòng thành bullet points
 * Để lưu vào sheet dưới format phù hợp
 */
function _formatDateForInput(dateValue) {
  try {
    if (!dateValue) return '';
    
    let date;
    if (typeof dateValue === 'string') {
      // Nếu là string, parse nó
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) return '';
    
    // Format YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
    
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}/**
 * ✅ Chuyển <br> thành xuống dòng (để hiển thị)
 */
/**
    * ✅ Convert <br> tags và HTML entities thành newlines
    * Để hiển thị đúng trong textarea
    * 
    * Xử lý:
    * - <br>, <br/>, <br />, <BR>, etc.
    * - &lt;br&gt; (escaped HTML entities)
    * - Multiple consecutive <br> tags
    */
   function _convertBrToNewlineForDisplay(text) {
     if (!text) return '';
     
     let result = String(text);
     
     // Step 1: Decode HTML entities trước (nếu có)
     // &lt;br&gt; → <br>
     result = result
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>');
     
     // Step 2: Convert tất cả dạng <br> thành \n
     // Xử lý: <br>, <br/>, <br />, <BR>, etc.
     result = result.replace(/<br\s*\/?>/gi, '\n');
     
     // Step 3: Remove multiple consecutive newlines (optional)
     // Giữ tối đa 2 newlines liên tiếp để preserve spacing
     result = result.replace(/\n{3,}/g, '\n\n');
     
     return result.trim();
   }

/**
 * ✅ Chuyển xuống dòng thành bullet points (để lưu)
 */
/**
    * ✅ Convert newlines thành bullet points để lưu vào sheet
    * 
    * Xử lý thông minh:
    * - Tự động detect và giữ nguyên bullets hiện có
    * - Chỉ thêm bullets cho lines chưa có
    * - Support nhiều dạng bullets: •, -, *, 1., 2), etc.
    * - Preserve formatting của user
    */
   function _convertNewlineToBullets(text) {
     if (!text) return '';
     
     const textStr = String(text).trim();
     if (textStr === '') return '';
     
     // Split và clean lines
     const lines = textStr
       .split('\n')
       .map(line => line.trim())
       .filter(line => line !== '');
     
     // Nếu chỉ có 1 dòng, return nguyên (không thêm bullet)
     if (lines.length === 1) {
       return lines[0];
     }
     
     // Process từng line
     return lines.map(line => {
       // ✅ IMPROVED REGEX: Detect nhiều dạng bullets
       // Matches:
       // - "• Item" (bullet point)
       // - "- Item" (dash)
       // - "* Item" (asterisk)
       // - "1. Item" (numbered list with dot)
       // - "1) Item" (numbered list with parenthesis)
       // - "a. Item" (lettered list)
       const hasBullet = /^([•\-\*]|[\da-zA-Z]+[\.\)])\s+/.test(line);
       
       if (hasBullet) {
         // Đã có bullet, giữ nguyên
         return line;
       }
       
       // Chưa có bullet, thêm •
       return `• ${line}`;
     }).join('\n');
   }/**
 * 🧪 DEBUG FUNCTION: Test monthly update process
 * Sử dụng để kiểm tra xem process có hoạt động không
 */
function debugMonthlyUpdate() {
  try {
    const ui = _getUi();
    
    console.log('🧪 Starting debug test...');
    
    // Test 1: Check MONTH sheet exists
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    if (!monthSheet) {
      ui.alert('❌ MONTH sheet not found!');
      return;
    }
    console.log('✅ MONTH sheet found');
    
    // Test 2: Check data retrieval
    console.log('📊 Testing data retrieval...');
    const testData = getMonthlyPlanData(null);
    console.log(`✅ Retrieved ${testData.length} tasks`);
    
    // Test 3: Check email building
    console.log('🏗️ Testing email HTML building...');
    if (testData.length > 0) {
      const emailHTML = _buildMonthlyReportEmailHTML(testData);
      console.log(`✅ Email HTML built: ${emailHTML.length} characters`);
    }
    
    // Test 4: Check current user
    const currentUser = _getCurrentUserEmail();
    console.log(`✅ Current user: ${currentUser}`);
    
    ui.alert(
      '✅ Debug Test Complete', 
      `MONTH Sheet: ✅ Found\nTasks Retrieved: ${testData.length}\nCurrent User: ${currentUser}\n\nCheck console logs for details`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    _getUi().alert('❌ Error: ' + error.message);
  }
}/**
 * ⭐ NEW: Format Task Result với bullet points và clickable links
 * @param {string} result - Task result text
 * @returns {string} Formatted HTML
 */
/**
 * Format Task Result với chip links
 * @param {string} result - Plain text result (fallback)
 * @param {Array} chipLinks - Array of {text, url} objects
 * @param {string} richText - Full rich text content
 * @returns {string} Formatted HTML
 */
/**
 * Format Task Result với chip links
 * @param {string} result - Plain text result (fallback)
 * @param {string} resultHTML - Pre-built HTML with links (from rich text)
 * @returns {string} Formatted HTML
 */
/**
 * Format Task Result với chip links
 * @param {string} result - Plain text result (fallback)
 * @param {string} resultHTML - Pre-built HTML with links (from rich text)
 * @returns {string} Formatted HTML
 */
function _formatTaskResultWithLinks(result, resultHTML) {
  // ⭐ ƯU TIÊN DÙNG HTML ĐÃ BUILD (nếu có chip links)
  let text = resultHTML || result;
  
  if (!text || String(text).trim() === '') {
    return '<em style="color:#999;">No data</em>';
  }
  
  text = String(text);
  
  // ⭐ Xử lý xuống dòng thành bullet points
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return '<em style="color:#999;">No data</em>';
  }
  
  // Nếu chỉ 1 dòng
  if (lines.length === 1) {
    // Xử lý plain URLs (nếu không có <a> tag rồi)
    let line = lines[0];
    if (!line.includes('<a ')) {
      const urlRegex = /(https?:\/\/[^\s<"]+)/g;
      line = line.replace(urlRegex, '<a href="$1" target="_blank" style="color:#0066cc; text-decoration:underline;">$1</a>');
    }
    return '• ' + line;
  }
  
  // Nhiều dòng → format với bullets
  const bulletItems = lines.map(line => {
    // Xử lý plain URLs (nếu không có <a> tag rồi)
    if (!line.includes('<a ')) {
      const urlRegex = /(https?:\/\/[^\s<"]+)/g;
      line = line.replace(urlRegex, '<a href="$1" target="_blank" style="color:#0066cc; text-decoration:underline;">$1</a>');
    }
    return '• ' + line;
  }).join('<br>');
  
  return bulletItems;
}/**
 * DEBUG SCRIPT - Test chip links extraction
 * Copy paste function này vào Apps Script và chạy
 */
function debugChipLinks() {
  try {
    // 1. Lấy sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('WEEK');
    console.log('✅ Sheet found');
    
    // 2. Test với row cụ thể (thay 1163 bằng row number của bạn)
    const testRow = 4364; // ⭐ THAY ĐỔI ROW NUMBER NÀY
    const resultCol = 8; // Column H (Task Result)
    
    console.log(`\n🔍 Testing Row ${testRow}, Column ${resultCol}`);
    
    // 3. Lấy plain text
    const plainValue = sheet.getRange(testRow, resultCol).getValue();
    console.log(`📝 Plain text: "${plainValue}"`);
    
    // 4. Lấy rich text
    const richText = sheet.getRange(testRow, resultCol).getRichTextValue();
    
    if (!richText) {
      console.log('❌ No rich text found!');
      return;
    }
    
    console.log('✅ Rich text found!');
    
    // 5. Extract runs
    const runs = richText.getRuns();
    console.log(`📊 Number of runs: ${runs.length}`);
    
    // 6. Loop through runs
    runs.forEach((run, index) => {
      const text = run.getText();
      const url = run.getLinkUrl();
      
      console.log(`\n--- Run ${index + 1} ---`);
      console.log(`Text: "${text}"`);
      console.log(`URL: ${url || 'No URL'}`);
      
      if (url) {
        console.log(`✅ CHIP LINK FOUND: "${text}" → ${url}`);
      }
    });
    
    // 7. Build HTML
    let htmlParts = [];
    runs.forEach(run => {
      const url = run.getLinkUrl();
      const text = run.getText();
      
      if (!text) return;
      
      if (url) {
        // Escape HTML
        const escapedText = text.replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#39;');
        
        htmlParts.push(`<a href="${url}" target="_blank" style="color:#0066cc; text-decoration:underline; font-weight:500;">${escapedText}</a>`);
      } else {
        htmlParts.push(text);
      }
    });
    
    const finalHTML = htmlParts.join('');
    console.log(`\n🎨 Final HTML: ${finalHTML}`);
    
    // 8. Test format function
    const formatted = _formatTaskResultWithLinks(plainValue, finalHTML);
    console.log(`\n📧 Formatted for email: ${formatted}`);
    
    console.log('\n✅ DEBUG COMPLETE!');
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    console.error('Stack:', error.stack);
  }
}

// Helper function
function _formatTaskResultWithLinks(result, resultHTML) {
  let text = resultHTML || result;
  
  if (!text || String(text).trim() === '') {
    return '<em style="color:#999;">No data</em>';
  }
  
  text = String(text);
  
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return '<em style="color:#999;">No data</em>';
  }
  
  if (lines.length === 1) {
    let line = lines[0];
    if (!line.includes('<a ')) {
      const urlRegex = /(https?:\/\/[^\s<"]+)/g;
      line = line.replace(urlRegex, '<a href="$1" target="_blank" style="color:#0066cc; text-decoration:underline;">$1</a>');
    }
    return '• ' + line;
  }
  
  const bulletItems = lines.map(line => {
    if (!line.includes('<a ')) {
      const urlRegex = /(https?:\/\/[^\s<"]+)/g;
      line = line.replace(urlRegex, '<a href="$1" target="_blank" style="color:#0066cc; text-decoration:underline;">$1</a>');
    }
    return '• ' + line;
  }).join('<br>');
  
  return bulletItems;
}/**
 * ============================================================================
 * 🎯 MONTHLY UPDATE DIALOG - PHIÊN BẢN V3 HOÀN CHỈNH
 * ============================================================================
 * 📅 Updated: 2025
 * 🔧 Fixes V3:
 *    1. Chip link hiển thị đúng trong dialog và PDF
 *    2. Format sheet: bỏ "•", thêm icon 📋 Plan & result, headers màu xanh
 *    3. PDF Team Report: dùng template đúng với chip links
 *    4. Folder PDF: 1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy
 * ============================================================================
 */

// ============================================================================
// 🔧 HELPER FUNCTIONS
// ============================================================================

/**
 * ✅ FIXED: Tìm dòng trống đầu tiên theo column E (Type Task)
 */
function _findFirstEmptyRowByColumnE(monthSheet) {
  const START_ROW = 6;
  const lastRow = monthSheet.getLastRow();
  
  if (lastRow < START_ROW) {
    return START_ROW;
  }
  
  const colEValues = monthSheet.getRange(START_ROW, 5, lastRow - START_ROW + 1, 1).getValues();
  
  for (let i = 0; i < colEValues.length; i++) {
    const value = colEValues[i][0];
    if (!value || value.toString().trim() === '') {
      return START_ROW + i;
    }
  }
  
  return lastRow + 1;
}

/**
 * ✅ FIXED: Lấy PIC name từ email
 */
function _getPICNameFromEmail(email) {
  if (!email) return 'Unknown';
  
  const normalizedEmail = email.toLowerCase().trim();
  
  if (typeof CONFIG !== 'undefined' && CONFIG.EMAIL_PIC_MAPPING) {
    for (const [mappedEmail, picName] of Object.entries(CONFIG.EMAIL_PIC_MAPPING)) {
      if (mappedEmail.toLowerCase() === normalizedEmail) {
        return picName;
      }
    }
  }
  
  const fallbackMapping = {
    'tt.tuyen@manimedicalhanoi.com': 'Tuyen',
    'marketing.mmh@manimedicalhanoi.com': 'Thuong',
    'marketing.mmh2@manimedicalhanoi.com': 'Trang',
    'marketing.mmh1@manimedicalhanoi.com': 'Đức Anh',
    'mmh.product@manimedicalhanoi.com': 'Giang',
    'mmh.admin@manimedicalhanoi.com': 'Quỳnh Anh'
  };
  
  if (fallbackMapping[normalizedEmail]) {
    return fallbackMapping[normalizedEmail];
  }
  
  return email.split('@')[0];
}

/**
 * ✅ V3: Build Plan & Report Content - Format mới với icon 📋
 */
function _buildPlanReportContent(planResult, innovation, issue) {
  let content = '';
  
  if (planResult && planResult.trim()) {
    content += '📋 Plan & result\n' + planResult.trim();
  }
  
  if (innovation && innovation.trim()) {
    if (content) content += '\n';
    content += '✅ Innovation, Good points\n' + innovation.trim();
  }
  
  if (issue && issue.trim()) {
    if (content) content += '\n';
    content += '❌ Issue & Correct Action\n' + issue.trim();
  }
  
  return content;
}

/**
 * ✅ V3: Parse Plan & Report Sections - Hỗ trợ format mới
 */
function _parsePlanReportSections(content) {
  if (!content) {
    return { planResult: '', innovation: '', issue: '' };
  }
  
  const text = String(content);
  
  const planPatterns = [
    /^📋\s*Plan\s*&?\s*result/im,
    /^1\.\s*Plan\s*&?\s*result/im,
    /^Plan\s*&?\s*result/im
  ];
  
  const innovationPatterns = [
    /^✅\s*Innovation,?\s*Good\s*points/im,
    /^•?\s*2\.?\s*✅?\s*Innovation,?\s*Good\s*points/im,
    /^2\.?\s*✅?\s*Innovation/im
  ];
  
  const issuePatterns = [
    /^❌\s*Issue\s*&?\s*Correct\s*Action/im,
    /^•?\s*3\.?\s*❌?\s*Issue\s*&?\s*Correct\s*Action/im,
    /^3\.?\s*❌?\s*Issue/im
  ];
  
  let planResult = '', innovation = '', issue = '';
  let planHeaderEnd = -1, innovationStart = -1, innovationHeaderEnd = -1, issueStart = -1, issueHeaderEnd = -1;
  
  for (const pattern of planPatterns) {
    const match = text.match(pattern);
    if (match) {
      planHeaderEnd = match.index + match[0].length;
      break;
    }
  }
  
  for (const pattern of innovationPatterns) {
    const match = text.match(pattern);
    if (match) {
      innovationStart = match.index;
      innovationHeaderEnd = match.index + match[0].length;
      break;
    }
  }
  
  for (const pattern of issuePatterns) {
    const match = text.match(pattern);
    if (match) {
      issueStart = match.index;
      issueHeaderEnd = match.index + match[0].length;
      break;
    }
  }
  
  if (planHeaderEnd >= 0) {
    const endPos = innovationStart >= 0 ? innovationStart : (issueStart >= 0 ? issueStart : text.length);
    planResult = text.substring(planHeaderEnd, endPos).trim();
  } else if (innovationStart < 0 && issueStart < 0) {
    planResult = text.trim();
  }
  
  if (innovationHeaderEnd >= 0) {
    const endPos = issueStart >= 0 ? issueStart : text.length;
    innovation = text.substring(innovationHeaderEnd, endPos).trim();
  }
  
  if (issueHeaderEnd >= 0) {
    issue = text.substring(issueHeaderEnd).trim();
  }
  
  return { planResult, innovation, issue };
}

/**
 * ✅ V3: Tạo Rich Text với Headers màu xanh và Hyperlinks
 */
function _createRichTextWithFormattedSections(text) {
  if (!text) return null;
  
  const textStr = String(text);
  const BLUE_COLOR = '#3b5998';
  
  try {
    const builder = SpreadsheetApp.newRichTextValue().setText(textStr);
    
    const blueStyle = SpreadsheetApp.newTextStyle()
      .setForegroundColor(BLUE_COLOR)
      .setBold(true)
      .build();
    
    const headerPatterns = [
      /📋\s*Plan\s*&?\s*result/gi,
      /✅\s*Innovation,?\s*Good\s*points/gi,
      /❌\s*Issue\s*&?\s*Correct\s*Action/gi
    ];
    
    headerPatterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(textStr)) !== null) {
        builder.setTextStyle(match.index, match.index + match[0].length, blueStyle);
      }
    });
    
    const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
    let urlMatch;
    const urlRegex = new RegExp(urlPattern.source, urlPattern.flags);
    while ((urlMatch = urlRegex.exec(textStr)) !== null) {
      builder.setLinkUrl(urlMatch.index, urlMatch.index + urlMatch[0].length, urlMatch[0]);
    }
    
    return builder.build();
  } catch (e) {
    console.warn('Could not create formatted rich text:', e.message);
    return null;
  }
}

/**
 * ✅ V3: Convert URLs to Chip Links HTML
 */
function _convertUrlsToChipLinksHtml(text) {
  if (!text) return '';
  
  let result = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const urlPattern = /(https?:\/\/[^\s&lt;&gt;"{}|\\^`\[\]]+)/gi;
  
  result = result.replace(urlPattern, function(url) {
    const cleanUrl = url.replace(/&amp;/g, '&');
    let displayUrl = cleanUrl;
    try {
      const urlObj = new URL(cleanUrl);
      const pathname = urlObj.pathname.length > 25 ? urlObj.pathname.substring(0, 22) + '...' : urlObj.pathname;
      displayUrl = urlObj.hostname + pathname;
    } catch (e) {
      displayUrl = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl;
    }
    return `<a href="${cleanUrl}" target="_blank" class="chip-link">🔗 ${displayUrl}</a>`;
  });
  
  result = result.replace(/\n/g, '<br>');
  
  return result;
}

/**
 * Safe set value với Data Validation handling
 */
function _safeSetValueForMONTH(sheet, row, col, value) {
  try {
    const cell = sheet.getRange(row, col);
    const validation = cell.getDataValidation();
    if (validation) cell.clearDataValidations();
    cell.setValue(value);
    if (validation) try { cell.setDataValidation(validation); } catch (e) {}
    return true;
  } catch (e) {
    console.error(`Error updating cell (${row}, ${col}):`, e.message);
    return false;
  }
}

/**
 * HTML escape
 */
function _escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format month display
 */
function _formatMonthDisplay(monthStr) {
  if (!monthStr || monthStr.length !== 6) return monthStr;
  return `${monthStr.substring(4, 6)}/${monthStr.substring(0, 4)}`;
}

// ============================================================================
// 📊 DATA FUNCTIONS
// ============================================================================

/**
 * Lấy Type Task options từ Master!D3:D
 */
function _getTypeTaskOptionsFromMaster() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    if (!masterSheet) return [];
    
    const lastRow = masterSheet.getLastRow();
    if (lastRow < 3) return [];
    
    const values = masterSheet.getRange(3, 4, lastRow - 2, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    return [...new Set(values)].sort();
  } catch (error) {
    console.error('Error getting type options:', error);
    return [];
  }
}

/**
 * Get Monthly Plan Data với parsing sections
 */
function getMonthlyPlanDataV2(selectedMonth) {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    const dataRange = monthSheet.getRange(6, 2, lastRow - 5, 10);
    const values = dataRange.getValues();
    
    const monthData = [];
    
    values.forEach((row, index) => {
      const actualRow = index + 6;
      const monthValue = row[2] ? row[2].toString().trim() : '';
      
      if (selectedMonth && monthValue !== selectedMonth.toString().trim()) {
        return;
      }
      
      let deadlineStr = '', deadlineDisplay = '';
      if (row[6]) {
        try {
          const d = new Date(row[6]);
          if (!isNaN(d.getTime())) {
            deadlineStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            deadlineDisplay = Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
          }
        } catch (e) {
          deadlineStr = String(row[6]);
          deadlineDisplay = String(row[6]);
        }
      }
      
      const planReportRaw = row[8] ? String(row[8]) : '';
      const sections = _parsePlanReportSections(planReportRaw);
      const planReportHtml = _convertUrlsToChipLinksHtml(planReportRaw);
      
      monthData.push({
        rowNumber: actualRow,
        serialNumber: row[0] ? String(row[0]) : '',
        month: monthValue,
        typeTask: row[3] ? String(row[3]).trim() : '',
        keyTask: row[4] ? String(row[4]).trim() : '',
        pic: row[5] ? String(row[5]).trim() : '',
        deadline: deadlineStr,
        deadlineDisplay: deadlineDisplay,
        status: row[7] ? String(row[7]).trim() : 'Not Started',
        planReport: planReportRaw,
        planReportHtml: planReportHtml,
        planResult: sections.planResult,
        innovation: sections.innovation,
        issue: sections.issue,
        priority: row[9] === true || row[9] === 'TRUE' || row[9] === 'true'
      });
    });
    
    return monthData;
  } catch (error) {
    console.error('Error in getMonthlyPlanDataV2:', error);
    throw new Error(`Failed to get monthly data: ${error.message}`);
  }
}

/**
 * Get available months
 */
function _getAvailableMonthsV2() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    const monthValues = monthSheet.getRange(6, 4, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '' && v.toString().length === 6)
      .map(v => v.toString().trim());
    
    return [...new Set(monthValues)].sort().reverse();
  } catch (error) {
    return [];
  }
}

/**
 * Get PICs from sheet
 */
function _getMonthlyPICsFromSheetV2() {
  try {
    const ss = SpreadsheetApp.getActive();
    const monthSheet = ss.getSheetByName('MONTH');
    if (!monthSheet) return [];
    
    const lastRow = monthSheet.getLastRow();
    if (lastRow < 6) return [];
    
    const picValues = monthSheet.getRange(6, 7, lastRow - 5, 1).getValues()
      .flat()
      .filter(v => v && v.toString().trim() !== '')
      .map(v => v.toString().trim());
    
    return [...new Set(picValues)].sort();
  } catch (error) {
    return [];
  }
}

// ============================================================================
// 🎯 MAIN DIALOG FUNCTION
// ============================================================================

/**
 * ✅ MAIN: Show Monthly Update Dialog V3
 */
function showMonthlyUpdateDialogV2() {
  const ui = SpreadsheetApp.getUi();
  const currentUserEmail = Session.getActiveUser().getEmail();
  const userName = _getPICNameFromEmail(currentUserEmail);
  
  const availableMonths = _getAvailableMonthsV2();
  const availablePICs = _getMonthlyPICsFromSheetV2();
  const typeOptions = _getTypeTaskOptionsFromMaster();
  const allData = getMonthlyPlanDataV2(null);
  
  const typeTaskStats = {};
  allData.forEach(task => {
    if (task.typeTask && task.typeTask.trim() !== '') {
      const type = task.typeTask.trim();
      typeTaskStats[type] = (typeTaskStats[type] || 0) + 1;
    }
  });
  
  const currentDate = new Date();
  const currentMonth = currentDate.getFullYear().toString() + 
                      (currentDate.getMonth() + 1).toString().padStart(2, '0');
  
  const html = _buildMonthlyDialogHtmlV3(
    userName, currentUserEmail, availableMonths, availablePICs, 
    typeOptions, allData, typeTaskStats, currentMonth
  );
  
  ui.showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(1450).setHeight(880),
    'Monthly Plan Update - ' + userName
  );
}

/**
 * ✅ V3: Build HTML cho dialog với chip links
 */
function _buildMonthlyDialogHtmlV3(userName, userEmail, availableMonths, availablePICs, typeOptions, allData, typeTaskStats, currentMonth) {
  
  const monthOptions = availableMonths.map(month => {
    const year = month.substring(0, 4);
    const mm = month.substring(4, 6);
    return `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>T${mm}/${year}</option>`;
  }).join('');
  
  const picOptions = availablePICs.map(pic => 
    `<option value="${_escapeHtml(pic)}">${_escapeHtml(pic)}</option>`
  ).join('');
  
  const typeTaskDatalist = typeOptions.map(type => 
    `<option value="${_escapeHtml(type)}">`
  ).join('');
  
  const statusOptions = ['Not Started', 'In Progress 25%', 'In Progress 50%', 'In Progress 75%', 'Completed'];
  
  const typeStatsCardsHtml = Object.entries(typeTaskStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type, count]) => `
      <div class="type-stat-card">
        <div class="type-stat-value">${count}</div>
        <div class="type-stat-label">${_escapeHtml(type.length > 25 ? type.substring(0, 22) + '...' : type)}</div>
      </div>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <base target="_top">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333; background: #fff; }
        
        /* Chip Link Styles - V3 IMPROVED */
        .chip-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: #e3f2fd;
          border: 1px solid #90caf9;
          border-radius: 16px;
          color: #1976d2;
          text-decoration: none;
          font-size: 13px;
          margin: 2px 4px 2px 0;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .chip-link:hover { background: #bbdefb; border-color: #64b5f6; text-decoration: none; }
        
        /* Stats Cards */
        .type-stats-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 8px; }
        .type-stat-card { background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 14px; min-width: 120px; text-align: center; }
        .type-stat-value { font-size: 24px; font-weight: 700; color: #3b5998; }
        .type-stat-label { font-size: 10px; color: #666; text-transform: uppercase; margin-top: 4px; }
        
        /* Views */
        .initial-view { padding: 20px; }
        .initial-view.hidden { display: none; }
        
        .header { background: #f9f9f9; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
        .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 6px; color: #3b5998; }
        .header p { color: #666; font-size: 14px; }
        
        .statistics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .stat-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e0e0e0; }
        .stat-label { font-size: 12px; color: #666; margin-bottom: 8px; text-transform: uppercase; }
        .stat-value { font-size: 32px; font-weight: 700; }
        .stat-total { color: #3b5998; }
        .stat-notstarted { color: #6c757d; }
        .stat-inprogress { color: #0066cc; }
        .stat-completed { color: #28a745; }
        
        .initial-filters { background: #f9f9f9; padding: 20px 24px; border-radius: 8px; border: 1px solid #e0e0e0; }
        .initial-filters h3 { font-size: 16px; font-weight: 600; color: #3b5998; margin-bottom: 16px; }
        .filter-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; }
        .filter-group { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
        .filter-group label { font-size: 13px; font-weight: 600; color: #555; }
        .filter-group select, .filter-group input { padding: 10px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; font-family: 'Calibri', sans-serif; background: white; }
        
        .btn-apply-filter { padding: 10px 28px; background: #3b5998; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
        .btn-apply-filter:hover { background: #2d4373; }
        
        .detail-view { display: none; height: 100vh; flex-direction: column; }
        .detail-view.active { display: flex; }
        
        .filter-header { background: #f9f9f9; padding: 14px 20px; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between; }
        .filter-header-left { display: flex; align-items: center; gap: 20px; }
        .filter-header h2 { font-size: 16px; font-weight: 600; color: #3b5998; margin: 0; }
        .filter-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: white; border: 1px solid #ddd; border-radius: 20px; font-size: 13px; }
        .filter-badge strong { color: #3b5998; }
        .filter-header-actions { display: flex; gap: 10px; }
        
        .btn-back, .btn-create-pdf, .btn { padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-family: 'Calibri', sans-serif; }
        .btn-back { background: white; color: #555; border: 1px solid #ccc; }
        .btn-create-pdf { background: #3b5998; color: white; border: none; font-weight: 600; }
        .btn-save { background: #3b5998; color: white; border: none; padding: 10px 24px; font-weight: 600; }
        .btn-cancel { background: white; color: #666; border: 1px solid #ccc; }
        
        .main-content { display: flex; flex: 1; overflow: hidden; }
        
        /* Task List */
        .task-list-panel { width: 420px; min-width: 420px; background: #f9f9f9; border-right: 1px solid #e0e0e0; display: flex; flex-direction: column; }
        .task-list-header { padding: 14px 16px; border-bottom: 1px solid #e0e0e0; background: white; }
        .task-list-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .task-list-header h3 { font-size: 14px; font-weight: 600; color: #333; margin: 0; }
        .task-count { font-size: 12px; color: #666; margin-top: 4px; }
        .task-list-scroll { flex: 1; overflow-y: auto; padding: 8px; }
        
        .btn-add-task { padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
        
        /* Add Task Form */
        .add-task-form { display: none; background: #f0f9f0; border: 1px solid #c8e6c9; border-radius: 8px; padding: 16px; margin-top: 12px; }
        .add-task-form.active { display: block; }
        .add-task-form h4 { margin-bottom: 12px; color: #28a745; font-size: 14px; }
        .add-task-row { display: flex; gap: 12px; margin-bottom: 12px; }
        .add-task-field { flex: 1; }
        .add-task-field label { display: block; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 4px; }
        .add-task-field input, .add-task-field select { width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; font-family: 'Calibri', sans-serif; }
        .add-task-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 12px; }
        
        /* Task Item */
        .task-item { background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
        .task-item:hover { border-color: #3b5998; box-shadow: 0 2px 8px rgba(59, 89, 152, 0.1); }
        .task-item.active { border-color: #3b5998; border-width: 2px; background: #f0f4ff; }
        .task-item.priority { border-left: 3px solid #f1c40f; }
        .task-item.completed { border-left: 3px solid #28a745; opacity: 0.8; }
        .task-item.inprogress { border-left: 3px solid #0066cc; }
        .task-item.new-task { border-left: 3px solid #17a2b8; background: #f0f9ff; }
        .task-type { font-size: 11px; font-weight: 600; color: #3b5998; text-transform: uppercase; margin-bottom: 6px; }
        .task-keytask { font-size: 14px; font-weight: 500; color: #333; line-height: 1.4; }
        .task-meta { display: flex; gap: 12px; margin-top: 8px; font-size: 12px; color: #888; flex-wrap: wrap; }
        .task-meta .deadline-info { color: #e74c3c; font-weight: 600; }
        
        /* Detail Panel */
        .detail-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white; }
        .detail-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #999; font-size: 15px; }
        .detail-content { flex: 1; display: none; flex-direction: column; overflow: hidden; }
        .detail-content.active { display: flex; }
        
        .detail-header { padding: 20px 24px; border-bottom: 1px solid #e0e0e0; background: #f9f9f9; }
        .detail-title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 8px; line-height: 1.4; }
        .detail-type { font-size: 13px; font-weight: 600; color: #3b5998; text-transform: uppercase; }
        
        .info-bar { display: flex; gap: 24px; padding: 16px 24px; background: white; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap; }
        .info-item { display: flex; flex-direction: column; gap: 6px; }
        .info-item label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; }
        .info-item input, .info-item select { padding: 10px 14px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; font-family: 'Calibri', sans-serif; background: #f9f9f9; min-width: 180px; }
        .priority-toggle { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .priority-toggle input[type="checkbox"] { transform: scale(1.3); cursor: pointer; }
        .priority-toggle label { font-size: 14px; color: #666; cursor: pointer; }
        
        /* Plan & Report Section */
        .plan-section { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; overflow: auto; }
        .plan-section-title { font-size: 14px; font-weight: 600; color: #3b5998; margin-bottom: 15px; }
        
        .plan-part { margin-bottom: 20px; }
        .plan-part-header { font-size: 14px; font-weight: 700; color: #3b5998; margin-bottom: 8px; padding: 8px 12px; background: #f0f4ff; border-left: 4px solid #3b5998; border-radius: 0 6px 6px 0; }
        .plan-part-header.innovation { color: #28a745; border-left-color: #28a745; background: #e8f5e9; }
        .plan-part-header.issue { color: #e74c3c; border-left-color: #e74c3c; background: #ffebee; }
        
        .plan-part textarea { width: 100%; padding: 14px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; font-family: 'Calibri', sans-serif; line-height: 1.7; resize: vertical; min-height: 100px; background: #fafafa; }
        .plan-part textarea:focus { border-color: #3b5998; outline: none; background: white; }
        .plan-part textarea.main-plan { min-height: 180px; }
        
        /* Link Preview Area */
        .link-preview { margin-top: 8px; padding: 10px; background: #f5f5f5; border-radius: 6px; min-height: 30px; }
        .link-preview:empty::before { content: 'URLs will appear as chip links here...'; color: #999; font-size: 13px; }
        
        .detail-footer { padding: 16px 24px; border-top: 1px solid #e0e0e0; background: #f9f9f9; display: flex; justify-content: flex-end; gap: 12px; }
        
        /* Loading & Toast */
        .loading-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 9999; justify-content: center; align-items: center; }
        .loading-overlay.active { display: flex; }
        .loading-spinner { background: #f9f9f9; padding: 40px 50px; border-radius: 12px; text-align: center; border: 1px solid #e0e0e0; }
        .spinner { border: 4px solid #e0e0e0; border-top: 4px solid #3b5998; border-radius: 50%; width: 48px; height: 48px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .toast { position: fixed; bottom: 24px; right: 24px; padding: 14px 24px; background: #333; color: white; border-radius: 8px; font-size: 14px; z-index: 10000; opacity: 0; transform: translateY(20px); transition: all 0.3s ease; }
        .toast.show { opacity: 1; transform: translateY(0); }
        .toast.success { background: #28a745; }
        .toast.error { background: #dc3545; }
        
        /* PDF Modal */
        .pdf-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; justify-content: center; align-items: center; }
        .pdf-modal.active { display: flex; }
        .pdf-modal-content { background: white; border-radius: 12px; padding: 24px; width: 420px; }
        .pdf-modal-content h3 { color: #3b5998; margin-bottom: 20px; }
        .pdf-option { padding: 16px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px; cursor: pointer; }
        .pdf-option:hover { border-color: #3b5998; background: #f0f4ff; }
        .pdf-option h4 { color: #333; margin-bottom: 4px; }
        .pdf-option p { font-size: 12px; color: #666; margin: 0; }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f0f0f0; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div id="loading" class="loading-overlay"><div class="loading-spinner"><div class="spinner"></div><p>Processing...</p></div></div>
      <div id="toast" class="toast"></div>
      
      <!-- PDF Modal -->
      <div id="pdfModal" class="pdf-modal">
        <div class="pdf-modal-content">
          <h3>📄 Create PDF Report</h3>
          <div class="pdf-option" onclick="createTeamPDF()">
            <h4>📊 Team Report (All Members)</h4>
            <p>Create comprehensive report for entire team</p>
          </div>
          <div class="pdf-option" onclick="createPICPDF()">
            <h4>👤 PIC Report (Current Filter)</h4>
            <p>Create report for current PIC only</p>
          </div>
          <button class="btn btn-cancel" onclick="closePdfModal()" style="margin-top: 12px; width: 100%;">Cancel</button>
        </div>
      </div>
      
      <!-- INITIAL VIEW -->
      <div id="initialView" class="initial-view">
        <div class="header">
          <h1>📊 Monthly Plan Update</h1>
          <p>Welcome, ${_escapeHtml(userName)}! Select month and PIC to view and update tasks.</p>
        </div>
        
        <div class="statistics">
          <div class="stat-card"><div class="stat-label">Total Tasks</div><div class="stat-value stat-total" id="totalTasks">0</div></div>
          <div class="stat-card"><div class="stat-label">Not Started</div><div class="stat-value stat-notstarted" id="notStarted">0</div></div>
          <div class="stat-card"><div class="stat-label">In Progress</div><div class="stat-value stat-inprogress" id="inProgress">0</div></div>
          <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value stat-completed" id="completed">0</div></div>
        </div>
        
        <div class="type-stats-container">${typeStatsCardsHtml}</div>
        
        <div class="initial-filters">
          <h3>🔍 Select Filters to Continue</h3>
          <div class="filter-row">
            <div class="filter-group">
              <label>📅 Month</label>
              <select id="filterMonth"><option value="">-- Select Month --</option>${monthOptions}</select>
            </div>
            <div class="filter-group">
              <label>👤 PIC</label>
              <select id="filterPIC"><option value="">-- All PICs --</option>${picOptions}</select>
            </div>
            <div class="filter-group">
              <label>📊 Status</label>
              <select id="filterStatus"><option value="">-- All Status --</option>${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
            </div>
            <button class="btn-apply-filter" onclick="applyFilterAndShowDetail()">Apply Filter →</button>
          </div>
        </div>
      </div>
      
      <!-- DETAIL VIEW -->
      <div id="detailView" class="detail-view">
        <div class="filter-header">
          <div class="filter-header-left">
            <h2>📋 Task List</h2>
            <div class="filter-badge"><span>Month:</span><strong id="displayMonth">-</strong></div>
            <div class="filter-badge" id="picBadge" style="display:none;"><span>PIC:</span><strong id="displayPIC">-</strong></div>
          </div>
          <div class="filter-header-actions">
            <button class="btn-back" onclick="backToInitialView()">← Back</button>
            <button class="btn-create-pdf" onclick="showPdfOptions()">📄 Create PDF</button>
            <button class="btn btn-save" onclick="saveAllChanges()">💾 Save All Changes</button>
          </div>
        </div>
        
        <div class="main-content">
          <div class="task-list-panel">
            <div class="task-list-header">
              <div class="task-list-header-row">
                <div><h3>Tasks</h3><div class="task-count" id="taskCount">0 task(s)</div></div>
                <button class="btn-add-task" onclick="toggleAddTaskForm()">➕ Add Task</button>
              </div>
              
              <div id="addTaskForm" class="add-task-form">
                <h4>➕ Add New Task</h4>
                <div class="add-task-row">
                  <div class="add-task-field">
                    <label>📅 Month (YYYYMM) *</label>
                    <input type="month" id="newTaskMonth" placeholder="Select month...">
                  </div>
                  <div class="add-task-field">
                    <label>Type Task *</label>
                    <input type="text" id="newTypeTask" list="typeTaskList" placeholder="Select or type...">
                    <datalist id="typeTaskList">${typeTaskDatalist}</datalist>
                  </div>
                </div>
                <div class="add-task-row">
                  <div class="add-task-field">
                    <label>Key Task *</label>
                    <input type="text" id="newKeyTask" placeholder="Enter key task description...">
                  </div>
                </div>
                <div class="add-task-actions">
                  <button class="btn btn-cancel" onclick="toggleAddTaskForm()">Cancel</button>
                  <button class="btn btn-save" onclick="addNewTask()">Add Task</button>
                </div>
              </div>
            </div>
            <div class="task-list-scroll" id="taskListScroll"></div>
          </div>
          
          <div class="detail-panel">
            <div class="detail-empty" id="detailEmpty">👈 Select a task from the list to view details</div>
            
            <div class="detail-content" id="detailContent">
              <div class="detail-header">
                <div class="detail-type" id="detailType">-</div>
                <div class="detail-title" id="detailTitle">-</div>
              </div>
              
              <div class="info-bar">
                <div class="info-item"><label>📅 Deadline</label><input type="date" id="detailDeadline"></div>
                <div class="info-item"><label>📊 Status</label><select id="detailStatus">${statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}</select></div>
                <div class="priority-toggle"><input type="checkbox" id="detailPriority"><label for="detailPriority">⭐ Priority Task</label></div>
              </div>
              
              <div class="plan-section">
                <div class="plan-section-title">📝 Plan & Report</div>
                
                <div class="plan-part">
                  <div class="plan-part-header">📋 Plan & Result</div>
                  <textarea id="detailPlanResult" class="main-plan" placeholder="Enter your plan and results here..." oninput="updateLinkPreview('planResult')"></textarea>
                  <div class="link-preview" id="linkPreviewPlanResult"></div>
                </div>
                
                <div class="plan-part">
                  <div class="plan-part-header innovation">✅ Innovation, Good points</div>
                  <textarea id="detailInnovation" placeholder="Enter innovations and good points..." oninput="updateLinkPreview('innovation')"></textarea>
                  <div class="link-preview" id="linkPreviewInnovation"></div>
                </div>
                
                <div class="plan-part">
                  <div class="plan-part-header issue">❌ Issue & Correct Action</div>
                  <textarea id="detailIssue" placeholder="Enter issues and corrective actions..." oninput="updateLinkPreview('issue')"></textarea>
                  <div class="link-preview" id="linkPreviewIssue"></div>
                </div>
              </div>
              
              <input type="hidden" id="detailRowNumber">
              <input type="hidden" id="detailTaskIndex">
            </div>
          </div>
        </div>
      </div>
      
      <script>
        const allTasks = ${JSON.stringify(allData)};
        const statusOptions = ${JSON.stringify(statusOptions)};
        const currentUserEmail = '${_escapeHtml(userEmail)}';
        const currentUserPIC = '${_escapeHtml(userName)}';
        
        let filteredTasks = [];
        let selectedTaskIndex = -1;
        let modifiedTasks = {};
        let newTasksToAdd = [];
        
        document.addEventListener('DOMContentLoaded', function() {
          updateInitialStatistics();
          const now = new Date();
          document.getElementById('newTaskMonth').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        });
        
        function updateInitialStatistics() {
          const validTasks = allTasks.filter(t => t.typeTask && t.typeTask.trim() !== '');
          document.getElementById('totalTasks').textContent = validTasks.length;
          document.getElementById('notStarted').textContent = validTasks.filter(t => t.status === 'Not Started').length;
          document.getElementById('inProgress').textContent = validTasks.filter(t => t.status && t.status.includes('In Progress')).length;
          document.getElementById('completed').textContent = validTasks.filter(t => t.status === 'Completed').length;
        }
        
        // ✅ V3: Convert URLs to chip links HTML
        function convertUrlsToChipLinks(text) {
          if (!text) return '';
          let result = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const urlPattern = /(https?:\\/\\/[^\\s&lt;&gt;"{}|\\\\\\^\\x60\\[\\]]+)/gi;
          result = result.replace(urlPattern, function(url) {
            const cleanUrl = url.replace(/&amp;/g, '&');
            let displayUrl = cleanUrl;
            try {
              const urlObj = new URL(cleanUrl);
              const pathname = urlObj.pathname.length > 25 ? urlObj.pathname.substring(0, 22) + '...' : urlObj.pathname;
              displayUrl = urlObj.hostname + pathname;
            } catch (e) {
              displayUrl = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl;
            }
            return '<a href="' + cleanUrl + '" target="_blank" class="chip-link">🔗 ' + displayUrl + '</a>';
          });
          return result.replace(/\\n/g, '<br>');
        }
        
        // ✅ V3: Update link preview khi nhập text
        function updateLinkPreview(field) {
          const textarea = document.getElementById('detail' + field.charAt(0).toUpperCase() + field.slice(1));
          const preview = document.getElementById('linkPreview' + field.charAt(0).toUpperCase() + field.slice(1));
          if (textarea && preview) {
            const text = textarea.value;
            const urlPattern = /(https?:\\/\\/[^\\s<>"{}|\\\\\\^\\x60\\[\\]]+)/gi;
            const urls = text.match(urlPattern);
            if (urls && urls.length > 0) {
              preview.innerHTML = urls.map(url => {
                let displayUrl = url;
                try {
                  const urlObj = new URL(url);
                  displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 17) + '...' : urlObj.pathname);
                } catch(e) {}
                return '<a href="' + url + '" target="_blank" class="chip-link">🔗 ' + displayUrl + '</a>';
              }).join(' ');
            } else {
              preview.innerHTML = '';
            }
          }
        }
        
        function applyFilterAndShowDetail() {
          const monthFilter = document.getElementById('filterMonth').value;
          const picFilter = document.getElementById('filterPIC').value;
          const statusFilter = document.getElementById('filterStatus').value;
          
          if (!monthFilter) { showToast('Please select a month to continue.', 'error'); return; }
          
          filteredTasks = allTasks.filter((task, index) => {
            task._originalIndex = index;
            if (!task.typeTask || task.typeTask.trim() === '') return false;
            if (monthFilter && task.month !== monthFilter) return false;
            if (picFilter && task.pic !== picFilter) return false;
            if (statusFilter && task.status !== statusFilter) return false;
            return true;
          });
          
          filteredTasks = [...newTasksToAdd.filter(t => !monthFilter || t.month === monthFilter), ...filteredTasks];
          
          if (filteredTasks.length === 0 && newTasksToAdd.length === 0) {
            showToast('No tasks found with the selected filters.', 'error');
            return;
          }
          
          const mm = monthFilter.substring(4, 6);
          const yyyy = monthFilter.substring(0, 4);
          document.getElementById('displayMonth').textContent = mm + '/' + yyyy;
          
          if (picFilter) {
            document.getElementById('displayPIC').textContent = picFilter;
            document.getElementById('picBadge').style.display = 'inline-flex';
          } else {
            document.getElementById('picBadge').style.display = 'none';
          }
          
          document.getElementById('newTaskMonth').value = yyyy + '-' + mm;
          
          renderTaskList();
          document.getElementById('initialView').classList.add('hidden');
          document.getElementById('detailView').classList.add('active');
        }
        
        function backToInitialView() {
          if (Object.keys(modifiedTasks).length > 0 || newTasksToAdd.length > 0) {
            if (!confirm('You have unsaved changes. Are you sure?')) return;
          }
          filteredTasks = []; selectedTaskIndex = -1; modifiedTasks = {}; newTasksToAdd = [];
          document.getElementById('detailView').classList.remove('active');
          document.getElementById('initialView').classList.remove('hidden');
          document.getElementById('detailContent').classList.remove('active');
          document.getElementById('detailEmpty').style.display = 'flex';
          document.getElementById('addTaskForm').classList.remove('active');
        }
        
        function renderTaskList() {
          const container = document.getElementById('taskListScroll');
          container.innerHTML = '';
          
          filteredTasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.className = 'task-item';
            item.setAttribute('data-index', index);
            
            if (task.isNew) item.classList.add('new-task');
            else if (task.priority) item.classList.add('priority');
            else if (task.status === 'Completed') item.classList.add('completed');
            else if (task.status && task.status.includes('In Progress')) item.classList.add('inprogress');
            
            let deadlineDisplay = task.deadlineDisplay || task.deadline || '-';
            
            item.innerHTML = \`
              <div class="task-type">\${escapeHtml(task.typeTask || '-')}</div>
              <div class="task-keytask">\${escapeHtml(task.keyTask || '-')}\${task.isNew ? ' <span style="color:#17a2b8;font-size:10px;">NEW</span>' : ''}</div>
              <div class="task-meta">
                <span class="deadline-info">📅 \${deadlineDisplay}</span>
                <span>📊 \${escapeHtml(task.status || '-')}</span>
              </div>
            \`;
            
            item.onclick = () => selectTask(index);
            container.appendChild(item);
          });
          
          document.getElementById('taskCount').textContent = filteredTasks.length + ' task(s)';
        }
        
        function selectTask(index) {
          if (selectedTaskIndex >= 0) saveCurrentTaskToMemory();
          
          selectedTaskIndex = index;
          const task = filteredTasks[index];
          
          document.querySelectorAll('.task-item').forEach((item, i) => item.classList.toggle('active', i === index));
          
          document.getElementById('detailEmpty').style.display = 'none';
          document.getElementById('detailContent').classList.add('active');
          
          document.getElementById('detailType').textContent = task.typeTask || '-';
          document.getElementById('detailTitle').textContent = task.keyTask || '-';
          document.getElementById('detailDeadline').value = task.deadline || '';
          document.getElementById('detailStatus').value = task.status || 'Not Started';
          document.getElementById('detailPriority').checked = task.priority || false;
          
          document.getElementById('detailPlanResult').value = task.planResult || '';
          document.getElementById('detailInnovation').value = task.innovation || '';
          document.getElementById('detailIssue').value = task.issue || '';
          
          // Update link previews
          updateLinkPreview('PlanResult');
          updateLinkPreview('Innovation');
          updateLinkPreview('Issue');
          
          document.getElementById('detailRowNumber').value = task.rowNumber || '';
          document.getElementById('detailTaskIndex').value = index;
          
          const rowNum = task.rowNumber;
          if (rowNum && modifiedTasks[rowNum]) {
            const mod = modifiedTasks[rowNum];
            if (mod.deadline !== undefined) document.getElementById('detailDeadline').value = mod.deadline;
            if (mod.status !== undefined) document.getElementById('detailStatus').value = mod.status;
            if (mod.priority !== undefined) document.getElementById('detailPriority').checked = mod.priority;
            if (mod.planResult !== undefined) document.getElementById('detailPlanResult').value = mod.planResult;
            if (mod.innovation !== undefined) document.getElementById('detailInnovation').value = mod.innovation;
            if (mod.issue !== undefined) document.getElementById('detailIssue').value = mod.issue;
          }
        }
        
        function saveCurrentTaskToMemory() {
          if (selectedTaskIndex < 0) return;
          
          const task = filteredTasks[selectedTaskIndex];
          
          const currentDeadline = document.getElementById('detailDeadline').value;
          const currentStatus = document.getElementById('detailStatus').value;
          const currentPriority = document.getElementById('detailPriority').checked;
          const currentPlanResult = document.getElementById('detailPlanResult').value;
          const currentInnovation = document.getElementById('detailInnovation').value;
          const currentIssue = document.getElementById('detailIssue').value;
          
          if (task.isNew) {
            task.deadline = currentDeadline;
            task.status = currentStatus;
            task.priority = currentPriority;
            task.planResult = currentPlanResult;
            task.innovation = currentInnovation;
            task.issue = currentIssue;
            return;
          }
          
          const rowNum = task.rowNumber;
          if (!rowNum || rowNum < 6) return;
          
          const hasChanges = (
            currentDeadline !== (task.deadline || '') ||
            currentStatus !== (task.status || 'Not Started') ||
            currentPriority !== (task.priority || false) ||
            currentPlanResult !== (task.planResult || '') ||
            currentInnovation !== (task.innovation || '') ||
            currentIssue !== (task.issue || '')
          );
          
          if (hasChanges) {
            modifiedTasks[rowNum] = {
              rowNumber: rowNum,
              typeTask: task.typeTask,
              keyTask: task.keyTask,
              pic: task.pic,
              deadline: currentDeadline,
              status: currentStatus,
              priority: currentPriority,
              planResult: currentPlanResult,
              innovation: currentInnovation,
              issue: currentIssue
            };
            
            filteredTasks[selectedTaskIndex].deadline = currentDeadline;
            filteredTasks[selectedTaskIndex].status = currentStatus;
            filteredTasks[selectedTaskIndex].priority = currentPriority;
            filteredTasks[selectedTaskIndex].planResult = currentPlanResult;
            filteredTasks[selectedTaskIndex].innovation = currentInnovation;
            filteredTasks[selectedTaskIndex].issue = currentIssue;
            
            renderTaskList();
            document.querySelectorAll('.task-item')[selectedTaskIndex]?.classList.add('active');
          }
        }
        
        function toggleAddTaskForm() {
          const form = document.getElementById('addTaskForm');
          form.classList.toggle('active');
          if (form.classList.contains('active')) document.getElementById('newTypeTask').focus();
        }
        
        function addNewTask() {
          const monthInput = document.getElementById('newTaskMonth').value;
          const typeTask = document.getElementById('newTypeTask').value.trim();
          const keyTask = document.getElementById('newKeyTask').value.trim();
          
          if (!monthInput) { showToast('Please select a month.', 'error'); return; }
          if (!typeTask) { showToast('Please select a Type Task.', 'error'); return; }
          if (!keyTask) { showToast('Please enter a Key Task.', 'error'); return; }
          
          const taskMonth = monthInput.replace('-', '');
          
          const newTask = {
            rowNumber: null,
            month: taskMonth,
            typeTask: typeTask,
            keyTask: keyTask,
            pic: currentUserPIC,
            deadline: '',
            deadlineDisplay: '',
            status: 'Not Started',
            planReport: '',
            planResult: '',
            innovation: '',
            issue: '',
            priority: false,
            isNew: true
          };
          
          newTasksToAdd.push(newTask);
          filteredTasks.unshift(newTask);
          
          renderTaskList();
          
          document.getElementById('newTypeTask').value = '';
          document.getElementById('newKeyTask').value = '';
          toggleAddTaskForm();
          
          showToast('✅ Task added! Click "Save All Changes" to save.', 'success');
          selectTask(0);
        }
        
        // ✅ V3: Build content với format mới
        function buildPlanReportContent(planResult, innovation, issue) {
          let content = '';
          if (planResult && planResult.trim()) content += '📋 Plan & result\\n' + planResult.trim();
          if (innovation && innovation.trim()) { if (content) content += '\\n'; content += '✅ Innovation, Good points\\n' + innovation.trim(); }
          if (issue && issue.trim()) { if (content) content += '\\n'; content += '❌ Issue & Correct Action\\n' + issue.trim(); }
          return content;
        }
        
        function saveAllChanges() {
          saveCurrentTaskToMemory();
          
          const updates = Object.values(modifiedTasks);
          const newTasks = newTasksToAdd.map(t => ({
            ...t,
            planReport: buildPlanReportContent(t.planResult || '', t.innovation || '', t.issue || '')
          }));
          
          if (updates.length === 0 && newTasks.length === 0) { showToast('No changes to save.', 'error'); return; }
          
          showLoading(true);
          
          const filterMonth = document.getElementById('filterMonth').value;
          const filterPIC = document.getElementById('filterPIC').value;
          
          google.script.run
            .withSuccessHandler(function(result) {
              showLoading(false);
              modifiedTasks = {};
              newTasksToAdd = [];
              filteredTasks.forEach(t => delete t.isNew);
              showToast('✅ ' + result, 'success');
              renderTaskList();
            })
            .withFailureHandler(function(error) {
              showLoading(false);
              showToast('❌ Error: ' + error.message, 'error');
            })
            .executeMonthlyPlanUpdateV2Fixed(updates, newTasks, filterMonth, filterPIC);
        }
        
        function showPdfOptions() { document.getElementById('pdfModal').classList.add('active'); }
        function closePdfModal() { document.getElementById('pdfModal').classList.remove('active'); }
        
        function createTeamPDF() {
          closePdfModal();
          saveCurrentTaskToMemory();
          const updates = Object.values(modifiedTasks);
          const newTasks = newTasksToAdd.map(t => ({ ...t, planReport: buildPlanReportContent(t.planResult || '', t.innovation || '', t.issue || '') }));
          showLoading(true);
          const filterMonth = document.getElementById('filterMonth').value;
          const filterPIC = document.getElementById('filterPIC').value;
          
          google.script.run.withSuccessHandler(function() {
            modifiedTasks = {}; newTasksToAdd = [];
            google.script.run.withSuccessHandler(function(result) { showLoading(false); showToast('✅ ' + result, 'success'); })
              .withFailureHandler(function(error) { showLoading(false); showToast('❌ Error: ' + error.message, 'error'); })
              .createMonthlyTeamPDFReportV2(filterMonth);
          }).withFailureHandler(function(error) { showLoading(false); showToast('❌ Save Error: ' + error.message, 'error'); })
            .executeMonthlyPlanUpdateV2Fixed(updates, newTasks, filterMonth, filterPIC);
        }
        
        function createPICPDF() {
          closePdfModal();
          saveCurrentTaskToMemory();
          const updates = Object.values(modifiedTasks);
          const newTasks = newTasksToAdd.map(t => ({ ...t, planReport: buildPlanReportContent(t.planResult || '', t.innovation || '', t.issue || '') }));
          showLoading(true);
          const filterMonth = document.getElementById('filterMonth').value;
          const filterPIC = document.getElementById('filterPIC').value;
          
          google.script.run.withSuccessHandler(function() {
            modifiedTasks = {}; newTasksToAdd = [];
            google.script.run.withSuccessHandler(function(result) { showLoading(false); showToast('✅ ' + result, 'success'); })
              .withFailureHandler(function(error) { showLoading(false); showToast('❌ Error: ' + error.message, 'error'); })
              .createMonthlyPICPDFReportV2(filterMonth, filterPIC);
          }).withFailureHandler(function(error) { showLoading(false); showToast('❌ Save Error: ' + error.message, 'error'); })
            .executeMonthlyPlanUpdateV2Fixed(updates, newTasks, filterMonth, filterPIC);
        }
        
        function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
        function showLoading(show) { document.getElementById('loading').classList.toggle('active', show); }
        function showToast(message, type = '') { const toast = document.getElementById('toast'); toast.textContent = message; toast.className = 'toast ' + type; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 4000); }
      </script>
    </body>
    </html>
  `;
}

// ============================================================================
// 💾 SAVE FUNCTION
// ============================================================================

/**
 * ✅ V3: Execute Monthly Plan Update với Rich Text có màu headers
 */
function executeMonthlyPlanUpdateV2Fixed(updates, newTasks, filterMonth, filterPIC) {
  if ((!updates || updates.length === 0) && (!newTasks || newTasks.length === 0)) {
    return 'No changes to save.';
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const monthSheet = ss.getSheetByName('MONTH');
  if (!monthSheet) throw new Error('MONTH sheet not found.');
  
  let successCount = 0, errorCount = 0, newTaskCount = 0;
  
  const COL_SERIAL = 2, COL_MONTH = 4, COL_TYPE = 5, COL_KEY = 6, COL_PIC = 7;
  const COL_DEADLINE = 8, COL_STATUS = 9, COL_PLAN_REPORT = 10, COL_PRIORITY = 11;
  
  // PROCESS UPDATES
  if (updates && updates.length > 0) {
    updates.forEach(task => {
      try {
        const rowNum = parseInt(task.rowNumber);
        if (!rowNum || rowNum < 6) { errorCount++; return; }
        
        const planReportContent = _buildPlanReportContent(task.planResult || '', task.innovation || '', task.issue || '');
        
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            _safeSetValueForMONTH(monthSheet, rowNum, COL_DEADLINE, deadlineDate);
            monthSheet.getRange(rowNum, COL_DEADLINE).setNumberFormat('dd/MM/yyyy');
          }
        } else {
          _safeSetValueForMONTH(monthSheet, rowNum, COL_DEADLINE, '');
        }
        
        _safeSetValueForMONTH(monthSheet, rowNum, COL_STATUS, task.status || 'Not Started');
        
        // ✅ V3: Rich Text với màu headers
        const richText = _createRichTextWithFormattedSections(planReportContent);
        if (richText) {
          const cell = monthSheet.getRange(rowNum, COL_PLAN_REPORT);
          const validation = cell.getDataValidation();
          if (validation) cell.clearDataValidations();
          cell.setRichTextValue(richText);
          if (validation) try { cell.setDataValidation(validation); } catch (e) {}
        } else {
          _safeSetValueForMONTH(monthSheet, rowNum, COL_PLAN_REPORT, planReportContent);
        }
        
        _safeSetValueForMONTH(monthSheet, rowNum, COL_PRIORITY, task.priority ? 'TRUE' : 'FALSE');
        successCount++;
      } catch (e) {
        console.error('Error updating row:', task.rowNumber, e.message);
        errorCount++;
      }
    });
  }
  
  // PROCESS NEW TASKS
  if (newTasks && newTasks.length > 0) {
    let typeValidation = null, statusValidation = null;
    try {
      typeValidation = monthSheet.getRange(6, COL_TYPE).getDataValidation();
      statusValidation = monthSheet.getRange(6, COL_STATUS).getDataValidation();
    } catch (e) {}
    
    newTasks.forEach((task) => {
      try {
        const targetRow = _findFirstEmptyRowByColumnE(monthSheet);
        if (targetRow < 6) { errorCount++; return; }
        
        const serialNum = targetRow - 5;
        monthSheet.getRange(targetRow, COL_SERIAL).setValue(serialNum);
        monthSheet.getRange(targetRow, COL_MONTH).setValue(task.month);
        
        _safeSetValueForMONTH(monthSheet, targetRow, COL_TYPE, task.typeTask);
        if (typeValidation) try { monthSheet.getRange(targetRow, COL_TYPE).setDataValidation(typeValidation); } catch (e) {}
        
        _safeSetValueForMONTH(monthSheet, targetRow, COL_KEY, task.keyTask || '');
        _safeSetValueForMONTH(monthSheet, targetRow, COL_PIC, task.pic || '');
        
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline);
          if (!isNaN(deadlineDate.getTime())) {
            monthSheet.getRange(targetRow, COL_DEADLINE).setValue(deadlineDate).setNumberFormat('dd/MM/yyyy');
          }
        }
        
        _safeSetValueForMONTH(monthSheet, targetRow, COL_STATUS, task.status || 'Not Started');
        if (statusValidation) try { monthSheet.getRange(targetRow, COL_STATUS).setDataValidation(statusValidation); } catch (e) {}
        
        const planReportContent = task.planReport || '';
        if (planReportContent) {
          const richText = _createRichTextWithFormattedSections(planReportContent);
          if (richText) {
            monthSheet.getRange(targetRow, COL_PLAN_REPORT).setRichTextValue(richText);
          } else {
            monthSheet.getRange(targetRow, COL_PLAN_REPORT).setValue(planReportContent);
          }
        }
        
        monthSheet.getRange(targetRow, COL_PRIORITY).setValue(task.priority ? 'TRUE' : 'FALSE');
        newTaskCount++;
      } catch (e) {
        console.error('Error adding new task:', e.message);
        errorCount++;
      }
    });
  }
  
  SpreadsheetApp.flush();
  
  let result = [];
  if (successCount > 0) result.push(`Updated ${successCount} task(s)`);
  if (newTaskCount > 0) result.push(`Added ${newTaskCount} new task(s)`);
  if (errorCount > 0) result.push(`${errorCount} error(s)`);
  
  return result.length > 0 ? result.join(', ') + ' successfully.' : 'No changes made.';
}

// ============================================================================
// 📄 PDF FUNCTIONS - V3 với Chip Links
// ============================================================================

/**
 * ✅ V3: Create Team PDF Report
 * Folder: 1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy
 */
function createMonthlyTeamPDFReportV2(filterMonth) {
  const PDF_FOLDER_ID = '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy';
  
  try {
    const allData = getMonthlyPlanDataV2(filterMonth);
    if (allData.length === 0) throw new Error('No data found.');
    
    const htmlContent = _buildMonthlyReportPDFHTML(allData, filterMonth, null);
    const blob = HtmlService.createHtmlOutput(htmlContent).getBlob().getAs('application/pdf');
    
    let fileName = filterMonth && filterMonth.length === 6 
      ? `Marketing_Monthly_Report_${filterMonth.substring(4, 6)}${filterMonth.substring(0, 4)}.pdf`
      : 'Marketing_Monthly_Report_All.pdf';
    
    blob.setName(fileName);
    
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) existingFiles.next().setTrashed(true);
    
    const pdfFile = folder.createFile(blob);
    return `PDF created: ${fileName}\nLink: ${pdfFile.getUrl()}`;
  } catch (error) {
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
}

/**
 * ✅ V3: Create PIC PDF Report
 */
function createMonthlyPICPDFReportV2(filterMonth, filterPIC) {
  const PDF_FOLDER_ID = '1tBreNkqDOKeP7FrPtPnSAAEWbwOHIFGy';
  
  try {
    const allData = getMonthlyPlanDataV2(filterMonth);
    const filteredData = filterPIC ? allData.filter(t => t.pic === filterPIC) : allData;
    if (filteredData.length === 0) throw new Error('No data found for this PIC.');
    
    const htmlContent = _buildMonthlyReportPDFHTML(filteredData, filterMonth, filterPIC);
    const blob = HtmlService.createHtmlOutput(htmlContent).getBlob().getAs('application/pdf');
    
    let fileName = filterMonth && filterMonth.length === 6 
      ? `Monthly_Report_${filterMonth.substring(4, 6)}${filterMonth.substring(0, 4)}${filterPIC ? '_' + filterPIC : ''}.pdf`
      : `Monthly_Report_${filterPIC || 'All'}.pdf`;
    
    blob.setName(fileName);
    
    const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) existingFiles.next().setTrashed(true);
    
    const pdfFile = folder.createFile(blob);
    return `PDF created: ${fileName}\nLink: ${pdfFile.getUrl()}`;
  } catch (error) {
    throw new Error(`Failed to create PDF: ${error.message}`);
  }
}

/**
 * ✅ V3: Build PDF HTML với Chip Links - Dựa trên template của user
 */
function _buildMonthlyReportPDFHTML(tasks, filterMonth, filterPIC) {
  const monthDisplay = filterMonth ? _formatMonthDisplay(filterMonth) : 'All Months';
  
  // Statistics
  const stats = {
    marketingEvents: 0, marketResearch: 0, training: 0, 
    kolPartnership: 0, designPublications: 0, totalTasks: tasks.length, completionRate: 0
  };
  
  const completedCount = tasks.filter(t => (t.status || '').toString().trim() === 'Completed').length;
  stats.completionRate = stats.totalTasks > 0 ? Math.round((completedCount / stats.totalTasks) * 100) : 0;
  
  const eventKeyTasks = new Set();
  tasks.filter(t => t.typeTask === 'Marketing-Event').forEach(t => { if (t.keyTask) eventKeyTasks.add(t.keyTask.trim()); });
  stats.marketingEvents = eventKeyTasks.size;
  
  stats.marketResearch = tasks.filter(t => t.typeTask === 'Product-Market Research').length;
  stats.training = tasks.filter(t => t.typeTask === 'Product-Training & Presentation').length;
  
  const kolKeyTasks = new Set();
  tasks.filter(t => t.typeTask === 'Marketing-KOL Partnership').forEach(t => { if (t.keyTask) kolKeyTasks.add(t.keyTask.trim()); });
  stats.kolPartnership = kolKeyTasks.size;
  
  stats.designPublications = tasks.filter(t => t.typeTask === 'Marketing-Design').length;
  
  // Helper: Format result với chip links
  function formatResultWithChipLinks(resultText) {
    if (!resultText || resultText.trim() === '') return '<em style="color: #999;">No data</em>';
    
    let text = String(resultText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    const urlPattern = /(https?:\/\/[^\s&lt;&gt;"{}|\\^`\[\]]+)/gi;
    text = text.replace(urlPattern, function(url) {
      const cleanUrl = url.replace(/&amp;/g, '&');
      let displayUrl = cleanUrl;
      try {
        const urlObj = new URL(cleanUrl);
        displayUrl = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 17) + '...' : urlObj.pathname);
      } catch (e) { displayUrl = cleanUrl.length > 40 ? cleanUrl.substring(0, 37) + '...' : cleanUrl; }
      return `<a href="${cleanUrl}" target="_blank" style="display:inline-block;padding:3px 10px;background:#e3f2fd;border:1px solid #90caf9;border-radius:12px;color:#1976d2;text-decoration:none;font-size:10pt;margin:2px 0;">🔗 ${displayUrl}</a>`;
    });
    
    return text.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>');
  }
  
  // Helper: Build category table
  function buildCategoryTable(title, categoryTasks) {
    if (categoryTasks.length === 0) {
      return `<h3 style="font-family:Calibri;font-size:14pt;font-weight:bold;color:black;margin-top:20px;margin-bottom:10px;">${title}</h3>
              <p style="font-family:Calibri;font-size:11pt;color:#666;font-style:italic;margin-bottom:20px;">No data available</p>`;
    }
    
    const rows = categoryTasks.map(task => `
      <tr>
        <td style="border:1px solid #ddd;padding:6px 8px;font-family:Calibri;font-size:11pt;text-align:center;width:50px;vertical-align:top;">${task.rowNumber}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;font-family:Calibri;font-size:11pt;width:200px;vertical-align:top;">${_escapeHtml(task.keyTask || '')}</td>
        <td style="border:1px solid #ddd;padding:6px 8px;font-family:Calibri;font-size:11pt;line-height:1.6;vertical-align:top;">${formatResultWithChipLinks(task.planReport)}</td>
      </tr>
    `).join('');
    
    return `
      <h3 style="font-family:Calibri;font-size:14pt;font-weight:bold;color:black;margin-top:20px;margin-bottom:10px;">${title}</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr style="background-color:#f0f0f0;">
          <th style="border:1px solid #ddd;padding:8px;font-family:Calibri;font-size:11pt;font-weight:bold;text-align:center;">Row</th>
          <th style="border:1px solid #ddd;padding:8px;font-family:Calibri;font-size:11pt;font-weight:bold;">Key Task</th>
          <th style="border:1px solid #ddd;padding:8px;font-family:Calibri;font-size:11pt;font-weight:bold;">Result</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
  
  const titleSuffix = filterPIC ? ` - ${_escapeHtml(filterPIC)}` : '';
  
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="font-family:Calibri;font-size:11pt;color:black;line-height:1.6;margin:0;padding:20px;background-color:#fff;">
      <h1 style="font-family:Calibri;font-size:14pt;font-weight:bold;color:black;margin-bottom:5px;">Monthly Marketing Report${titleSuffix}</h1>
      <p style="font-family:Calibri;font-size:11pt;color:black;margin-top:0;margin-bottom:20px;">Period: ${monthDisplay}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
      
      <h2 style="font-family:Calibri;font-size:14pt;font-weight:bold;color:black;margin-bottom:15px;">Statistics Overview</h2>
      <table style="margin-bottom:20px;"><tr>
        <td style="padding:12px 24px;background-color:#f0f4f8;border-left:4px solid #2c5aa0;border-radius:4px;">
          <span style="font-size:11pt;color:#666;">Total Tasks:</span>
          <span style="font-size:20pt;font-weight:bold;color:#2c5aa0;margin-left:10px;">${stats.totalTasks}</span>
        </td>
        <td style="width:20px;"></td>
        <td style="padding:12px 24px;background-color:${stats.completionRate >= 80 ? '#e8f5e9' : stats.completionRate >= 50 ? '#fff8e1' : '#ffebee'};border-left:4px solid ${stats.completionRate >= 80 ? '#4caf50' : stats.completionRate >= 50 ? '#ffc107' : '#f44336'};border-radius:4px;">
          <span style="font-size:11pt;color:#666;">Completion Rate:</span>
          <span style="font-size:20pt;font-weight:bold;color:${stats.completionRate >= 80 ? '#2e7d32' : stats.completionRate >= 50 ? '#f57c00' : '#c62828'};margin-left:10px;">${stats.completionRate}%</span>
        </td>
      </tr></table>
      
      <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:20px;"><tr>
        <td style="border:1px solid #ddd;border-radius:8px;padding:20px 15px;text-align:center;background-color:#f9f9f9;width:20%;">
          <div style="font-size:32pt;font-weight:bold;color:#2c5aa0;margin-bottom:8px;">${stats.marketingEvents}</div>
          <div style="font-size:9pt;color:#333;">Marketing Events</div>
        </td>
        <td style="border:1px solid #ddd;border-radius:8px;padding:20px 15px;text-align:center;background-color:#f9f9f9;width:20%;">
          <div style="font-size:32pt;font-weight:bold;color:#2c5aa0;margin-bottom:8px;">${stats.marketResearch}</div>
          <div style="font-size:9pt;color:#333;">Research Report</div>
        </td>
        <td style="border:1px solid #ddd;border-radius:8px;padding:20px 15px;text-align:center;background-color:#f9f9f9;width:20%;">
          <div style="font-size:32pt;font-weight:bold;color:#2c5aa0;margin-bottom:8px;">${stats.training}</div>
          <div style="font-size:9pt;color:#333;">Training Activities</div>
        </td>
        <td style="border:1px solid #ddd;border-radius:8px;padding:20px 15px;text-align:center;background-color:#f9f9f9;width:20%;">
          <div style="font-size:32pt;font-weight:bold;color:#2c5aa0;margin-bottom:8px;">${stats.kolPartnership}</div>
          <div style="font-size:9pt;color:#333;">KOL Partnership</div>
        </td>
        <td style="border:1px solid #ddd;border-radius:8px;padding:20px 15px;text-align:center;background-color:#f9f9f9;width:20%;">
          <div style="font-size:32pt;font-weight:bold;color:#2c5aa0;margin-bottom:8px;">${stats.designPublications}</div>
          <div style="font-size:9pt;color:#333;">Design Publications</div>
        </td>
      </tr></table>
      
      <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;">
      <h2 style="font-family:Calibri;font-size:14pt;font-weight:bold;color:black;margin-bottom:15px;">Detailed Activities</h2>
      
      ${buildCategoryTable('4.1. Marketing Events', tasks.filter(t => t.typeTask === 'Marketing-Event'))}
      ${buildCategoryTable('4.2. Digital Marketing', tasks.filter(t => t.typeTask === 'Marketing-Digital Marketing'))}
      ${buildCategoryTable('4.3. Design', tasks.filter(t => t.typeTask === 'Marketing-Design'))}
      ${buildCategoryTable('4.4. KOL Partnership', tasks.filter(t => t.typeTask === 'Marketing-KOL Partnership'))}
      ${buildCategoryTable('4.5. Projects', tasks.filter(t => t.typeTask === 'Marketing-Project'))}
      ${buildCategoryTable('4.6. Training', tasks.filter(t => t.typeTask === 'Product-Training & Presentation'))}
      ${buildCategoryTable('4.7. Research', tasks.filter(t => t.typeTask === 'Product-Market Research'))}
      ${buildCategoryTable('4.8. Other Activities', tasks.filter(t => 
        t.typeTask !== 'Marketing-Event' && t.typeTask !== 'Marketing-Digital Marketing' && 
        t.typeTask !== 'Marketing-Design' && t.typeTask !== 'Marketing-KOL Partnership' && 
        t.typeTask !== 'Marketing-Project' && t.typeTask !== 'Product-Training & Presentation' && 
        t.typeTask !== 'Product-Market Research'))}
      
      <hr style="border:none;border-top:1px solid #ddd;margin:30px 0;">
      <p style="font-family:Calibri;font-size:10pt;color:#666;text-align:center;margin:0;">
        Marketing Task Management System | Generated on ${new Date().toLocaleDateString('en-GB')}
      </p>
    </body></html>`;
}