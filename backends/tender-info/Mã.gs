/********************************************************************
 * 1. CẤU HÌNH HỆ THỐNG & CONSTANTS
 ********************************************************************/

const SHEET_EMAIL = 'Tải Email';
const SHEET_KQTT = 'Kết quả trúng thầu';
const SHEET_TBMT = 'Thông báo mời thầu';
const SHEET_KHLCNT = 'Kế hoạch lựa chọn nhà thầu';

// Cấu hình Folder ID MỚI
const FOLDERS = {
  KHLCNT: '1dIdsnXO1lL3_CnGrac-tmkrAy4ontNXv',     // Kế hoạch LCNT (Cột F)
  TBMT: '14dFUZJL9QeMwcDZQ3Q8gk_Tp4Cg1yhlU',       // Thông báo MT (Cột G)
  KQTT: '1AN3q8MTWjldwA9GhpD5RK0MsxsfA3MSm',       // Kết quả TT (Cột H)
  SHEET_KHAC: '1pks-mdGdZDI3isHNoLc_0YVn79FRgPFc', // File sheet khác (Cột I)
  DOC: '1ECValzckbu3pp6rdbygC9niSGx_1Rgwy',        // Tài liệu Doc (Cột J)
  PDF: '1KUd11E3tOIQRrrcbtxBBIz0MNAXnINnA',        // Tài liệu PDF (Cột K)
  SLIDE: '1TuGpk-V87nZAWpdF0MlCWqK3P8BkKg7V',      // Tài liệu Slide (Cột L)
  IMAGE: '1cqEa9h2nvMESw5JT_t4U9w86dJgOHFyY'       // File ảnh (Cột M)
};

// Cấu trúc cột Sheet "Tải Email" MỚI (Bắt đầu từ cột B = 2)
const COL_EMAIL = {
  DATE: 2,        // B: Ngày
  FROM: 3,        // C: Người gửi
  SUBJECT: 4,     // D: Tiêu đề
  BODY: 5,        // E: Nội dung
  FILE_KHLCNT: 6, // F: Kế hoạch lựa chọn nhà thầu
  FILE_TBMT: 7,   // G: Thông báo mời thầu
  FILE_KQTT: 8,   // H: Kết quả trúng thầu
  FILE_SHEET: 9,  // I: File google sheet khác
  FILE_DOC: 10,   // J: Tài liệu Google doc
  FILE_PDF: 11,   // K: Tài liệu PDF
  FILE_SLIDE: 12, // L: Tài liệu Google slide
  FILE_IMAGE: 13  // M: File ảnh
};




function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Tùy chọn')
    .addItem('📊 Dashboard Tổng hợp', 'showDashboardDialog')
    .addSeparator()
    .addItem('📥 Cập nhật thông tin thầu', 'showUpdateDialog')
    .addSeparator()
    .addSubMenu(ui.createMenu('⏰ Tự động hóa')
      .addItem('✅ Bật tự động tải email 17h', 'setupDailyEmailTrigger')
      .addItem('❌ Tắt tự động tải email', 'removeDailyEmailTrigger')
      .addItem('🔄 Chạy tải email ngay', 'autoFetchDailyEmails'))
    .addSeparator()
    .addItem('🔧 Fix lỗi dữ liệu (Cột H, N)', 'fixDataMissing')
    .addSeparator()
    .addItem('🔄 Reset Lịch sử tải', 'resetProcessedEmails')
    .addToUi();
}
// --- PHẦN 2: HÀM XỬ LÝ DỮ LIỆU AN TOÀN ---
function fixDataMissing() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  // Nếu sheet ít dòng quá thì dừng
  if (lastRow < 2) return;
  var numRows = lastRow - 1; // Số lượng dòng cần xử lý (trừ tiêu đề)

  // CHỈ ĐỌC CÁC CỘT CẦN THIẾT (Để không chạm vào các cột có công thức mảng khác)
  // Cột H = cột số 8
  // Cột I = cột số 9
  // Cột N = cột số 14
  
  var rangeH = sheet.getRange(2, 8, numRows, 1); 
  var rangeI = sheet.getRange(2, 9, numRows, 1);
  var rangeN = sheet.getRange(2, 14, numRows, 1);

  var valsH = rangeH.getValues();
  var valsI = rangeI.getValues();
  var valsN = rangeN.getValues();

  var countFixed = 0; // Đếm số dòng được sửa

  for (var i = 0; i < numRows; i++) {
    var valI = valsI[i][0]; // Dữ liệu cột I hiện tại
    var valN = valsN[i][0]; // Dữ liệu cột N hiện tại

    // ĐIỀU KIỆN: Cột I có text, cột N đang trống
    if (valI && typeof valI === 'string' && valI.trim() !== "" && valN === "") {
      
      var isRowUpdated = false;

      // --- XỬ LÝ 1: LẤY THỜI GIAN CHO CỘT N ---
      // Regex tìm dòng "Thời điểm bắt đầu..."
      var regexTime = /(?:Thời điểm bắt đầu|Th&#7901;i &#273;i&#7875;m b&#7855;t &#273;&#7847;u|Thời điểm bắt đầu ch&agrave;o gi&aacute; trực tuyến).*?:\s*([\s\S]*?)(\n|$)/i;
      var matchTime = valI.match(regexTime);
      
      if (matchTime && matchTime[1]) {
        valsN[i][0] = matchTime[1].trim(); // Cập nhật vào mảng N
        isRowUpdated = true;
      }

      // --- XỬ LÝ 2: LẤY GÓI THẦU CHO CỘT H ---
      // Regex tìm từ "Gói thầu" đến trước "Ngày đăng tải"
      var regexPackage = /(?:G&oacute;i thầu|Gói thầu)\s*:\s*([\s\S]*?)(?=\n\n|Ng&agrave;y đăng tải|Ng&agrave;y đăng tải th&ocirc;ng b&aacute;o|\nNg&agrave;y)/i;
      var matchPackage = valI.match(regexPackage);

      if (matchPackage && matchPackage[1]) {
        valsH[i][0] = matchPackage[1].trim(); // Cập nhật vào mảng H
        isRowUpdated = true;
      }

      if (isRowUpdated) countFixed++;
    }
  }

  // --- GHI LẠI DỮ LIỆU (CHỈ GHI CỘT H VÀ N) ---
  if (countFixed > 0) {
    rangeH.setValues(valsH); // Chỉ ghi đè cột H
    rangeN.setValues(valsN); // Chỉ ghi đè cột N
    
    SpreadsheetApp.getUi().alert("✅ Đã hoàn tất! Đã sửa dữ liệu cho " + countFixed + " dòng.\n(Các cột công thức khác vẫn an toàn).");
  } else {
    SpreadsheetApp.getUi().alert("⚠️ Không tìm thấy dòng nào cần sửa (Điều kiện: I có dữ liệu & N trống).");
  }
}
/********************************************************************
 * 2. BACKEND: XỬ LÝ DỮ LIỆU DASHBOARD & BÁO CÁO
 ********************************************************************/

function showDashboardDialog() {
  const html = HtmlService.createHtmlOutput(getDashboardHtml_())
    .setWidth(1400)
    .setHeight(900)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(html, 'Tổng hợp thông tin đấu thầu');
}

// Lấy dữ liệu từ Sheet với mapping mới
// Thay thế toàn bộ hàm getDashboardData cũ bằng đoạn code này
function getDashboardData() {
  const ss = SpreadsheetApp.getActive();
  
  // Hàm helper an toàn hơn: Xử lý cột động và convert Date
  const getData = (sheetName, numCols) => {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) {
      Logger.log('Sheet not found: ' + sheetName);
      return [];
    }
    const lastRow = sh.getLastRow();
    
    // Nếu không có dữ liệu (ít hơn 3 dòng) -> Trả về rỗng
    if (lastRow < 3) return [];
    
    // FIX QUAN TRỌNG 1: Kiểm tra cột thực tế để tránh lỗi "Out of bounds"
    const lastCol = sh.getLastColumn();
    // Dữ liệu bắt đầu từ cột B (index 2). Số cột khả dụng tính từ B là:
    const availableCols = Math.max(0, lastCol - 1); 
    
    // Nếu sheet rỗng cột -> Trả về rỗng
    if (availableCols === 0) return [];

    // Chỉ lấy số cột tối đa mà Sheet đang có (Min của Yêu cầu và Thực tế)
    const colsToGet = Math.min(numCols, availableCols);

    // Lấy dữ liệu thô
    let values = sh.getRange(3, 2, lastRow - 2, colsToGet).getValues();

    // FIX QUAN TRỌNG 2: Chuẩn hóa dữ liệu trước khi gửi về Client
    return values.map(row => {
      // a. Bù thêm các cột trống nếu Sheet thiếu cột so với config (để Client không bị lỗi index)
      while (row.length < numCols) {
        row.push('');
      }
      
      // b. Convert đối tượng Date thành String để tránh lỗi "No data returned" (Serialization Error)
      return row.map(cell => {
        if (cell instanceof Date) {
          return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        return cell;
      });
    });
  };

  try {
    // KQTT: 15 cột (B-P), KHLCNT: 18 cột (B-S), TBMT: 23 cột (B-X)
    const kqttData = getData(SHEET_KQTT, 15);
    const khlcntData = getData(SHEET_KHLCNT, 18);
    const tbmtData = getData(SHEET_TBMT, 23);

    // Lấy danh sách Tỉnh thành và Khu vực cho dropdown
    let allProvinces = new Set();
    let allRegions = new Set();
    
    // Hàm safe add giúp tránh lỗi null/undefined khi gọi toString()
    const safeAdd = (setObj, val) => {
      if (val !== null && val !== undefined && val !== '') {
        setObj.add(String(val).trim());
      }
    };
    
    // KQTT: Tỉnh thành = index 13 (O), Khu vực = index 14 (P)
    kqttData.forEach(row => {
      safeAdd(allProvinces, row[13]);
      safeAdd(allRegions, row[14]);
    });
    
    // KHLCNT: Tỉnh thành = index 16 (R), Khu vực = index 17 (S)
    khlcntData.forEach(row => {
      safeAdd(allProvinces, row[16]);
      safeAdd(allRegions, row[17]);
    });
    
    // TBMT: Tỉnh thành = index 21 (W), Khu vực = index 22 (X)
    tbmtData.forEach(row => {
      safeAdd(allProvinces, row[21]);
      safeAdd(allRegions, row[22]);
    });

    const result = {
      KQTT: kqttData,
      TBMT: tbmtData,
      KHLCNT: khlcntData,
      provinces: Array.from(allProvinces).sort(),
      regions: Array.from(allRegions).sort()
    };
    
    Logger.log('Total KQTT: ' + result.KQTT.length);
    Logger.log('Total KHLCNT: ' + result.KHLCNT.length);
    Logger.log('Total TBMT: ' + result.TBMT.length);
    
    return result;

  } catch (e) {
    Logger.log("FATAL ERROR in getDashboardData: " + e.toString());
    // Trả về object rỗng để client không báo lỗi "No data returned" mà hiển thị Dashboard trắng
    return {
      KQTT: [],
      TBMT: [],
      KHLCNT: [],
      provinces: [],
      regions: [],
      error: e.toString()
    };
  }
}

// Gửi Email PDF Báo cáo
function sendReportEmail(dataObj) {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    const subject = `[Report Summary] Bidding Information - ${dataObj.accountName}`;
    
    const htmlBody = createReportHtml_(dataObj);
    
    const blob = Utilities.newBlob(htmlBody, 'text/html', 'Bidding_Report.html');
    const pdf = blob.getAs('application/pdf').setName(`Report_${dataObj.accountName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    
    GmailApp.sendEmail(mmhAddr_(userEmail), subject, 
      `System has sent you a summary report for Investor: ${dataObj.accountName}.\n\n` +
      `Filter period: ${dataObj.filter.dateFrom} - ${dataObj.filter.dateTo}\n` +
      `See attached PDF file.`, 
      { attachments: [pdf] }
    );
    
    return { success: true, message: `Report sent to: ${userEmail}` };
  } catch (e) {
    return { success: false, message: "Error sending email: " + e.toString() };
  }
}

// Tạo HTML cho PDF (Backend rendering)
function createReportHtml_(data) {
  let html = `
    <html>
    <head>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; color: #333; font-size: 12px; margin: 20px; }
        h1 { color: #3b5998; border-bottom: 2px solid #3b5998; padding-bottom: 10px; font-size: 20px; }
        h2 { color: #3b5998;  font-size: 14px; }
        .meta { color: #3b5998; margin-bottom: 20px; font-style: italic; }
        .stats-box { display: table; width: 100%; margin-bottom: 20px; background: #f9f9f9; padding: 10px; border: 1px solid #ddd; }
        .stat-item { display: table-cell; text-align: center; padding: 0 10px; border-right: 1px solid #ddd; }
        .stat-item:last-child { border-right: none; }
        .stat-val { font-size: 16px; font-weight: bold; color: #3b5998; display: block; margin-top: 5px; }
        .section-header { color: #3b5998; padding: 8px; font-weight: bold; margin-top: 25px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #eee; border: 1px solid #999; padding: 5px; text-align: left; }
        td { border: 1px solid #ccc; padding: 5px; }
      </style>
    </head>
    <body>
      <h1>CẬP NHẬT THÔNG TIN THẦU</h1>
      <h2>${data.accountName.toUpperCase()}</h2>
      <div class="meta">
        Ngày xuất dữ liệu: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}<br/>
        Thời gian tra cứu: từ ${data.filter.dateFrom} đến ${data.filter.dateTo}
      </div>

      <div class="stats-box">
        <div class="stat-item">Tổng số gói thầu<span class="stat-val">${data.stats.countPkg}</span></div>
        <div class="stat-item">Số nhà thầu trúng thầu<span class="stat-val">${data.stats.countWinner}</span></div>
        <div class="stat-item">Giá trị trúng thầu<span class="stat-val">${data.stats.totalValue}</span></div>
      </div>

      <div class="section-header">1. KẾT QUẢ TRÚNG THẦU</div>
      <table>
        <thead><tr>
          <th>Ngày phê duyệt</th><th>Số TBMT</th><th>Dự án</th><th>Nhà thầu trúng thầu</th><th>Giá trị trúng thầu</th><th>Hình thức LCNT</th>
        </tr></thead>
        <tbody>
          ${data.rowsKQTT.length > 0 ? data.rowsKQTT.map(r => 
            `<tr><td>${r.colM || ''}</td><td>${r.colH || ''}</td><td>${r.colF || ''}</td><td>${r.colL || ''}</td><td>${r.colK || ''}</td><td>${r.colI || ''}</td></tr>`
          ).join('') : '<tr><td colspan="6">Không có KQTT nào trong thời gian này</td></tr>'}
        </tbody>
      </table>

      <div class="section-header">2. KẾ HOẠCH LỰA CHỌN NHÀ THẦU</div>
      <table>
        <thead><tr>
          <th>Hiệu lực thực hiện</th><th>Số KHLCNT</th><th>Dự án</th><th>Tên gói thầu</th><th>Tổng mức đầu tư</th><th>Nguồn vốn</th><th>Giá gói thầu</th>
        </tr></thead>
        <tbody>
          ${data.rowsKHLCNT.length > 0 ? data.rowsKHLCNT.map(r => 
            `<tr><td>${r.colP || ''}</td><td>${r.colE || ''}</td><td>${r.colF || ''}</td><td><b>${r.colJ || ''}</b></td><td>${r.colH || ''}</td><td>${r.colK || ''}</td><td>${r.colL || ''}</td></tr>`
          ).join('') : '<tr><td colspan="7">Không có KHLCNT nào trong thời gian này</td></tr>'}
        </tbody>
      </table>

      <div class="section-header">3. THÔNG BÁO MỜI THẦU</div>
      <table>
        <thead><tr>
          <th>Thời điểm mở thầu</th><th>Thời điểm đóng thầu</th><th>Tên gói thầu</th><th>Giá gói thầu</th><th>Bảo đảm dự thầu</th><th>Hiệu lực hợp đồng</th>
        </tr></thead>
        <tbody>
          ${data.rowsTBMT.length > 0 ? data.rowsTBMT.map(r => 
            `<tr><td>${r.colN || ''}</td><td>${r.colS || ''}</td><td><b>${r.colH || ''}</b></td><td>${r.colK || ''}</td><td>${r.colP || ''}</td><td>${r.colU || ''}</td></tr>`
          ).join('') : '<tr><td colspan="7">Không có kết quả trúng thầu nào trong thời gian này</td></tr>'}
        </tbody>
      </table>
    </body>
    </html>
  `;
  return html;
}

/********************************************************************
 * 3. BACKEND: LOGIC CẬP NHẬT DỮ LIỆU TỪ EMAIL
 ********************************************************************/

function showUpdateDialog() {
  const html = HtmlService.createHtmlOutput(getUpdateHtml_())
    .setWidth(800)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, 'Cập nhật thông tin thầu');
}

// Logic tải email và lưu file
/**
 * Tải email và xử lý file đính kèm
 * @param {Object} config - Cấu hình tải email
 * @returns {Object} Kết quả tải email và xử lý file
 */
/**
 * Tải email và xử lý file đính kèm
 * @param {Object} config - Cấu hình tải email
 * @returns {Object} Kết quả tải email và xử lý file
 */
function runFetchEmailsByType(config) {
  // CRITICAL: Khai báo tất cả biến ngay từ đầu
  const configType = config.type;
  const dateFrom = config.dateFrom;
  const dateTo = config.dateTo;
  const sender = config.sender;
  const subject = config.subject;
  
  Logger.log('=== START runFetchEmailsByType ===');
  Logger.log('Type: ' + configType);
  Logger.log('Date range: ' + dateFrom + ' to ' + dateTo);
  Logger.log('Sender: ' + sender);
  
  // Xác định folder và cột đích
  let targetFolderId, targetColIndex;
  
  if (configType === 'KQTT') {
    targetFolderId = FOLDERS.KQTT;
    targetColIndex = COL_EMAIL.FILE_KQTT;
  } else if (configType === 'TBMT') {
    targetFolderId = FOLDERS.TBMT;
    targetColIndex = COL_EMAIL.FILE_TBMT;
  } else if (configType === 'KHLCNT') {
    targetFolderId = FOLDERS.KHLCNT;
    targetColIndex = COL_EMAIL.FILE_KHLCNT;
  } else {
    targetFolderId = FOLDERS.SHEET_KHAC;
    targetColIndex = COL_EMAIL.FILE_SHEET;
  }

  // Xử lý ngày tháng
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  end.setDate(end.getDate() + 1);

  const tz = Session.getScriptTimeZone();
  
  // Xây dựng query Gmail - Hỗ trợ nhiều sender
  let query;
  if (sender.includes(',')) {
    const senderList = sender.split(',').map(function(s) { 
      return 'from:' + s.trim(); 
    }).join(' OR ');
    query = '(' + senderList + ') after:' + Utilities.formatDate(start, tz, 'yyyy/MM/dd') + ' before:' + Utilities.formatDate(end, tz, 'yyyy/MM/dd');
  } else {
    query = 'from:' + sender + ' after:' + Utilities.formatDate(start, tz, 'yyyy/MM/dd') + ' before:' + Utilities.formatDate(end, tz, 'yyyy/MM/dd');
  }
  
  if (subject) query += ' subject:"' + subject + '"';
  
  Logger.log('Gmail query: ' + query);

  const threads = GmailApp.search(query);
  Logger.log('Found ' + threads.length + ' threads');
  
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_EMAIL);
  const userProps = PropertiesService.getUserProperties();
  
  let emailCount = 0;
  const downloadedFiles = [];

  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      const msgId = msg.getId();
      
      // Kiểm tra đã xử lý chưa
      if (userProps.getProperty('processed_' + msgId)) {
        Logger.log('Skipping processed email: ' + msgId);
        return;
      }

      const date = msg.getDate();
      if (date < start || date >= end) return;

      const msgSubject = msg.getSubject();
      const msgFrom = msg.getFrom();
      const attachments = msg.getAttachments();
      
      Logger.log('Processing email: ' + msgSubject + ' | Attachments: ' + attachments.length);
      
      let fileLinks = [];
      
      // Xử lý TẤT CẢ file đính kèm
      if (attachments.length > 0) {
        attachments.forEach(function(att, attIndex) {
          try {
            const attName = att.getName();
            const attMimeType = att.getContentType();
            
            Logger.log('Attachment ' + attIndex + ': ' + attName + ' | Type: ' + attMimeType);
            
            // Chỉ xử lý file Excel/Google Sheets
            if (attMimeType.includes('spreadsheet') || 
                attMimeType.includes('excel') || 
                attName.endsWith('.xlsx') || 
                attName.endsWith('.xls') ||
                attName.endsWith('.xlsm')) {
              
              // Phát hiện folder đích dựa trên tên file
              const detectedFolder = detectFolderByFileName_(attName);
              
              // Xác định folder, type, và column index
              let actualFolderId = targetFolderId;
              let actualType = configType;
              let actualColIndex = targetColIndex;
              
              if (detectedFolder) {
                actualFolderId = detectedFolder.folderId;
                actualType = detectedFolder.type;
                actualColIndex = detectedFolder.colIndex;
                Logger.log('Detected folder from filename: ' + actualType);
              }
              
              const folder = DriveApp.getFolderById(actualFolderId);
              const datePrefix = Utilities.formatDate(date, tz, 'yyyyMMdd');
              const fileName = datePrefix + '_' + (attIndex + 1) + '_' + attName;
              
              // Lưu file gốc vào Drive
              const file = folder.createFile(att.copyBlob()).setName(fileName);
              const fileId = file.getId();
              const fileUrl = file.getUrl();
              
              Logger.log('Saved file: ' + fileName + ' | ID: ' + fileId);
              
              fileLinks.push(fileUrl);
              
              // Thêm vào danh sách để xử lý sau
              downloadedFiles.push({
                id: fileId,
                name: fileName,
                type: actualType,
                folderId: actualFolderId,
                originalMimeType: attMimeType
              });
            }
          } catch (e) {
            Logger.log('Error saving attachment: ' + e.message);
          }
        });
      }

      // Ghi thông tin vào sheet "Tải Email"
      const nextRow = Math.max(sheet.getLastRow() + 1, 3);
      sheet.getRange(nextRow, COL_EMAIL.DATE).setValue(date);
      sheet.getRange(nextRow, COL_EMAIL.FROM).setValue(msgFrom);
      sheet.getRange(nextRow, COL_EMAIL.SUBJECT).setValue(msgSubject);
      sheet.getRange(nextRow, COL_EMAIL.BODY).setValue(msg.getPlainBody().substring(0, 300));
      
      if (fileLinks.length > 0) {
        sheet.getRange(nextRow, targetColIndex).setValue(fileLinks.join('\n'));
      }

      // Đánh dấu đã xử lý
      userProps.setProperty('processed_' + msgId, '1');
      emailCount++;
    });
  });

  Logger.log('Total emails processed: ' + emailCount);
  Logger.log('Total files downloaded: ' + downloadedFiles.length);

  // ⭐ QUAN TRỌNG: Gọi function xử lý và dán dữ liệu
  let processResult = { KQTT: 0, KHLCNT: 0, TBMT: 0 };
  
  if (downloadedFiles.length > 0) {
    Logger.log('Starting to process downloaded files...');
    try {
      processResult = processDownloadedSheets(downloadedFiles);
      Logger.log('Process result: ' + JSON.stringify(processResult));
    } catch (e) {
      Logger.log('ERROR processing files: ' + e.toString());
      // Không throw error để vẫn trả về kết quả tải email
    }
  }

  Logger.log('=== END runFetchEmailsByType ===');
  return { 
    count: emailCount,
    filesDownloaded: downloadedFiles.length,
    rowsAdded: processResult
  };
}


function resetProcessedEmails() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Reset lịch sử tải?', 
    'Hệ thống sẽ tải lại các email cũ trong lần chạy tiếp theo.\n\nBạn có chắc chắn?', 
    ui.ButtonSet.YES_NO
  );
  
  if (response == ui.Button.YES) {
    const props = PropertiesService.getUserProperties();
    const data = props.getProperties();
    let count = 0;
    
    for (let key in data) {
      if (key.startsWith('processed_')) {
        props.deleteProperty(key);
        count++;
      }
    }
    
    ui.alert('✅ Đã xóa ' + count + ' bản ghi lịch sử tải.');
  }
}

/********************************************************************
 * 4. GIAO DIỆN HTML (DASHBOARD & UPDATE)
 ********************************************************************/

// 4.1 HTML Dashboard - VIẾT LẠI HOÀN TOÀN VỚI FIX
// 4.1 HTML Dashboard - UPDATED với MMH Account Management - FIXED
// 4.1 HTML Dashboard - FULL UPDATE với tất cả tính năng mới
// 4.1 HTML Dashboard - VERSION 2
// FIX: Thêm KHLCNT và TBMT rows cho PDF export
function getDashboardHtml_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; 
      background: #e9ebee; 
      color: #333; 
      height: 100vh; 
      display: flex; 
      flex-direction: column; 
      overflow: hidden; 
    }
    
    :root {
      --primary: #3b5998;
      --primary-dark: #2d4373;
      --bg-card: #f9f9f9;
      --bg-white: #ffffff;
      --border: #d3d6db;
      --text-muted: #666;
      --highlight-red: #d93025;
      --success-green: #28a745;
    }

    .loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .loading-overlay.hidden { display: none; }
    .spinner {
      width: 50px; height: 50px;
      border: 4px solid #e0e0e0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { margin-top: 15px; color: var(--primary); font-weight: bold; }

    .top-section { 
      background: var(--bg-white); 
      padding: 15px 20px; 
      border-bottom: 1px solid var(--border); 
      box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
    }
    
    .stats-global { display: flex; gap: 12px; margin-bottom: 15px; flex-wrap: wrap; }
    .card { 
      background: var(--bg-card); 
      border: 1px solid var(--border); 
      border-radius: 6px; 
      padding: 12px 16px; 
      flex: 1; 
      min-width: 120px; 
      text-align: center;
    }
    .card-title { font-size: 11px; color: var(--text-muted); font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
    .card-value { font-size: 24px; font-weight: bold; color: var(--primary); }
    
    .filter-container { 
      display: flex; 
      gap: 12px; 
      align-items: flex-end; 
      flex-wrap: wrap;
      background: #f0f2f5; 
      padding: 12px; 
      border-radius: 6px; 
      border: 1px solid #ddd; 
    }
    .filter-group { display: flex; flex-direction: column; }
    .filter-group label { font-size: 11px; font-weight: bold; color: #555; margin-bottom: 4px; text-transform: uppercase; }
    .filter-input, .filter-select { 
      padding: 8px 10px; 
      border: 1px solid #ccc; 
      border-radius: 4px; 
      font-family: inherit; 
      font-size: 13px; 
      min-width: 120px;
    }
    .filter-select { cursor: pointer; }
    .filter-checkbox { 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      padding-bottom: 8px;
    }
    .filter-checkbox input { width: 18px; height: 18px; cursor: pointer; }
    .filter-checkbox label { cursor: pointer; font-size: 13px; font-weight: 500; }
    
    .btn-view { 
      background: var(--primary); 
      color: white; 
      border: none; 
      padding: 10px 25px; 
      border-radius: 4px; 
      cursor: pointer; 
      font-weight: bold; 
      font-size: 13px;
      transition: background 0.2s; 
    }
    .btn-view:hover { background: var(--primary-dark); }
    .btn-view:disabled { background: #999; cursor: not-allowed; }
    
    .btn-update-mmh {
      background: var(--success-green);
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 12px;
      transition: background 0.2s;
    }
    .btn-update-mmh:hover { background: #218838; }
    .btn-update-mmh:disabled { background: #999; cursor: not-allowed; }
    
    .toggle-btn { 
      color: var(--primary); 
      font-size: 12px; 
      cursor: pointer; 
      text-decoration: underline; 
      margin-top: 8px; 
      display: inline-block; 
    }

    .main-container { 
      display: flex; 
      flex: 1; 
      overflow: hidden; 
      padding: 15px 20px; 
      gap: 15px; 
    }
    
    .left-panel { 
      width: 280px; 
      min-width: 250px;
      background: var(--bg-white); 
      border-radius: 8px; 
      border: 1px solid var(--border); 
      display: flex; 
      flex-direction: column; 
      overflow: hidden; 
    }
    .search-header { padding: 10px; border-bottom: 1px solid #eee; background: var(--bg-card); }
    .search-input { 
      width: 100%; 
      padding: 10px 12px; 
      border: 1px solid #ccc; 
      border-radius: 4px; 
      font-family: inherit; 
      font-size: 13px;
    }
    .search-input:focus { outline: none; border-color: var(--primary); }
    
    .account-list { flex: 1; overflow-y: auto; }
    .account-item { 
      padding: 12px 15px; 
      border-bottom: 1px solid #eee; 
      cursor: pointer; 
      transition: background 0.15s; 
    }
    .account-item:hover { background: #f0f4fa; }
    .account-item.active { background: #e7f0ff; border-left: 4px solid var(--primary); }
    .acc-name { font-weight: 600; font-size: 13px; color: #333; line-height: 1.4; }
    .acc-mmh { 
      font-size: 10px; 
      color: var(--success-green); 
      margin-top: 4px; 
      font-weight: bold; 
      display: none; 
    }
    .acc-mmh.visible { display: block; }

    .right-panel { 
      flex: 1; 
      background: var(--bg-white); 
      border-radius: 8px; 
      border: 1px solid var(--border); 
      display: flex; 
      flex-direction: column; 
      overflow: hidden; 
    }
    
    .content-header { 
      padding: 15px; 
      border-bottom: 1px solid #eee; 
      background: var(--bg-card); 
    }
    .header-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .selected-title { margin: 0; font-size: 16px; color: var(--primary); font-weight: bold; }
    .mmh-badge-container {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: 10px;
    }
    .mmh-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #d4edda;
      color: var(--success-green);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }
    .mmh-badge.hidden { display: none; }
    .mmh-badge svg { width: 14px; height: 14px; }
    .btn-edit-mmh {
      background: none;
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-edit-mmh:hover { background: var(--primary); color: white; }
    .btn-edit-mmh.hidden { display: none; }
    
    .mmh-search-section {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      padding-top: 10px;
      border-top: 1px dashed #ddd;
      margin-top: 10px;
    }
    .mmh-search-section.hidden { display: none; }
    .mmh-search-container {
      position: relative;
      flex: 1;
      min-width: 250px;
    }
    .mmh-search-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: inherit;
      font-size: 13px;
    }
    .mmh-search-input:focus { outline: none; border-color: var(--primary); }
    
    .mmh-autocomplete {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      max-height: 250px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ccc;
      border-top: none;
      border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      display: none;
    }
    .mmh-autocomplete.show { display: block; }
    .mmh-autocomplete-item {
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }
    .mmh-autocomplete-item:hover { background: #f0f4fa; }
    .mmh-autocomplete-item.selected { background: #e7f0ff; }
    .mmh-autocomplete-item:last-child { border-bottom: none; }
    .mmh-highlight { background: yellow; font-weight: bold; }
    .mmh-no-result {
      padding: 10px 12px;
      color: #999;
      font-style: italic;
      font-size: 13px;
    }
    
    .btn-confirm-mmh {
      background: var(--success-green);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 13px;
      white-space: nowrap;
    }
    .btn-confirm-mmh:hover { background: #218838; }
    .btn-confirm-mmh:disabled { background: #999; cursor: not-allowed; }
    
    .mini-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    .mini-spinner.hidden { display: none; }
    
    .sub-stats { display: flex; gap: 10px; padding: 12px 15px; background: white; flex-wrap: wrap; }
    .sub-card { 
      background: white; 
      border: 1px solid #ddd; 
      padding: 10px 12px; 
      border-radius: 5px; 
      text-align: center; 
      min-width: 100px;
    }
    .sub-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: bold; }
    .sub-val { font-size: 16px; font-weight: bold; color: var(--primary); margin-top: 4px; }
    .sub-card.highlight { background: #e8f0fe; border-color: #b4d5fe; }
    .sub-card.highlight .sub-val { font-size: 22px; color: var(--highlight-red); }

    .tabs { display: flex; border-bottom: 2px solid #ddd; padding: 0 15px; background: white; }
    .tab { 
      padding: 10px 20px; 
      cursor: pointer; 
      font-weight: bold; 
      color: #666; 
      border-radius: 5px 5px 0 0; 
      margin-right: 2px; 
      background: #eee; 
      transition: all 0.2s;
    }
    .tab:hover { background: #ddd; }
    .tab.active { background: var(--primary); color: white; }
    
    .tab-content { flex: 1; overflow: auto; padding: 0; display: none; }
    .tab-content.active { display: block; }

    .table-wrapper { overflow: auto; height: 100%; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { 
      background: #f0f2f5; 
      color: #333; 
      position: sticky; 
      top: 0; 
      padding: 10px 8px; 
      text-align: left; 
      border-bottom: 2px solid #ddd; 
      font-size: 11px;
      text-transform: uppercase;
      z-index: 10; 
    }
    td { 
      padding: 8px; 
      border-bottom: 1px solid #eee; 
      vertical-align: middle; 
      line-height: 1.4;
    }
    tr:nth-child(even) { background: #fcfcfc; }
    tr:hover { background: #f0f7ff; }
    td.bold-cell { font-weight: bold; color: var(--primary); }
    
    .btn-pdf { 
      background: var(--highlight-red); 
      color: white; 
      border: none; 
      padding: 8px 15px; 
      border-radius: 4px; 
      cursor: pointer; 
      font-weight: bold; 
      font-size: 12px;
    }
    .btn-pdf:hover { background: #b52a1f; }
    .btn-pdf:disabled { background: #ccc; cursor: not-allowed; }
    
    .hidden { display: none !important; }
    .text-center { text-align: center; }
    
    .empty-state { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      height: 100%; 
      color: #999; 
      padding: 40px;
    }
    .empty-state h3 { font-size: 16px; margin-bottom: 10px; }
    .empty-state p { font-size: 13px; }
    
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    }
    .toast.success { background: var(--success-green); }
    .toast.error { background: var(--highlight-red); }
    .toast.hidden { display: none; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    /* PDF Export Modal */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9998;
    }
    .modal-overlay.hidden { display: none; }
    .modal-box {
      background: white;
      border-radius: 8px;
      width: 450px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: 'Calibri', sans-serif;
    }
    .modal-header {
      background: var(--primary);
      color: white;
      padding: 15px 20px;
      border-radius: 8px 8px 0 0;
      font-weight: bold;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }
    .modal-body {
      padding: 20px;
      background: var(--bg-card);
    }
    .modal-section {
      margin-bottom: 15px;
    }
    .modal-section-title {
      font-size: 12px;
      font-weight: bold;
      color: var(--primary);
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .modal-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .modal-checkbox input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .modal-checkbox label {
      font-size: 13px;
      cursor: pointer;
    }
    .modal-radio-group {
      display: flex;
      gap: 20px;
    }
    .modal-radio {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .modal-radio input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .modal-radio label {
      font-size: 13px;
      cursor: pointer;
    }
    .modal-footer {
      padding: 15px 20px;
      background: white;
      border-top: 1px solid #ddd;
      border-radius: 0 0 8px 8px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .modal-btn {
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      border: none;
    }
    .modal-btn-cancel {
      background: #eee;
      color: #333;
    }
    .modal-btn-cancel:hover { background: #ddd; }
    .modal-btn-confirm {
      background: var(--primary);
      color: white;
    }
    .modal-btn-confirm:hover { background: var(--primary-dark); }
    .modal-btn-confirm:disabled { background: #999; cursor: not-allowed; }
  </style>
</head>
<body>

  <div id="loadingOverlay" class="loading-overlay">
    <div class="spinner"></div>
    <div class="loading-text" id="loadingText">Đang tải dữ liệu...</div>
  </div>

  <div id="toast" class="toast hidden"></div>

  <!-- PDF Export Modal -->
  <div id="pdfModal" class="modal-overlay hidden">
    <div class="modal-box">
      <div class="modal-header">
        <span>Xuất thông tin ra PDF</span>
        <button class="modal-close" onclick="closePdfModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="modal-section">
          <div class="modal-section-title">Nội dung báo cáo</div>
          <div class="modal-checkbox">
            <input type="checkbox" id="chkSalesHistory" checked>
            <label for="chkSalesHistory">Lịch sử trúng thầu (MMH Record)</label>
          </div>
          <div class="modal-checkbox">
            <input type="checkbox" id="chkAreaInfo" checked>
            <label for="chkAreaInfo">Thông tin địa bàn</label>
          </div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">Sản phẩm liên quan</div>
          <div class="modal-radio-group">
            <div class="modal-radio">
              <input type="radio" name="productType" id="rdoSurgery" value="Phẫu thuật" checked>
              <label for="rdoSurgery">Phẫu thuật</label>
            </div>
            <div class="modal-radio">
              <input type="radio" name="productType" id="rdoDental" value="Nha khoa">
              <label for="rdoDental">Nha khoa</label>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" onclick="closePdfModal()">Hủy</button>
        <button class="modal-btn modal-btn-confirm" id="btnConfirmPdf" onclick="confirmExportPdf()">Xuất PDF & Gửi Email</button>
      </div>
    </div>
  </div>

  <div class="top-section">
    <div id="collapsibleSection">
      <div class="stats-global">
        <div class="card">
          <div class="card-title">Kế hoạch LCNT</div>
          <div class="card-value" id="gKHLCNT">0</div>
        </div>
        <div class="card">
          <div class="card-title">Thông báo mời thầu</div>
          <div class="card-value" id="gTBMT">0</div>
        </div>
        <div class="card">
          <div class="card-title">Kết quả trúng thầu</div>
          <div class="card-value" id="gKQTT">0</div>
        </div>
        <div class="card">
          <div class="card-title">Giá trị chào thầu</div>
          <div class="card-value" id="gValBid">0</div>
        </div>
        <div class="card">
          <div class="card-title">Giá trị trúng thầu</div>
          <div class="card-value" id="gValWin">0</div>
        </div>
      </div>

      <div class="filter-container">
        <div class="filter-group">
          <label>Từ tháng</label>
          <input type="month" id="fDateFrom" class="filter-input">
        </div>
        <div class="filter-group">
          <label>Tới tháng</label>
          <input type="month" id="fDateTo" class="filter-input">
        </div>
        <div class="filter-group">
          <label>Tỉnh thành</label>
          <select id="fProvince" class="filter-select">
            <option value="">-- All --</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Khu vực</label>
          <select id="fRegion" class="filter-select">
            <option value="">-- All --</option>
          </select>
        </div>
        <div class="filter-checkbox">
          <input type="checkbox" id="fMMH">
          <label for="fMMH">Khách hàng của MMH</label>
        </div>
        <button class="btn-view" id="btnViewDetail" onclick="viewDetail()">CHI TIẾT</button>
        <button class="btn-update-mmh" id="btnUpdateMMH" onclick="updateMMHList()">🔄 Cập nhật MMH Account list</button>
      </div>
    </div>
    <div style="text-align:right;">
      <span class="toggle-btn" onclick="toggleHeader()">Ẩn/Hiện thống kê và bộ lọc</span>
    </div>
  </div>

  <div class="main-container">
    <div class="left-panel">
      <div class="search-header">
        <input type="text" id="searchBox" class="search-input" placeholder="Tìm kiếm chủ đầu tư..." onkeyup="filterAccountList()">
      </div>
      <div id="accountList" class="account-list">
        <div class="empty-state">
          <p>Bấm vào "CHI TIẾT" để xem danh sách chủ đầu tư</p>
        </div>
      </div>
    </div>

    <div class="right-panel">
      <div id="emptyState" class="empty-state">
        <h3>Chọn chủ đầu tư từ danh sách bên trái</h3>
        <p>Hoặc bấm vào "CHI TIẾT" để xác nhận bộ lọc và tải thông tin</p>
      </div>

      <div id="detailView" class="hidden" style="display:flex; flex-direction:column; height:100%;">
        <div class="content-header">
          <div class="header-top-row">
            <div style="display:flex; align-items:center;">
              <h2 id="accTitle" class="selected-title">Chủ đầu tư</h2>
              <div class="mmh-badge-container">
                <span id="mmhBadge" class="mmh-badge hidden">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  MMH Account
                </span>
                <button id="btnEditMMH" class="btn-edit-mmh hidden" onclick="enableEditMMH()">Edit</button>
              </div>
              <span id="confirmSpinner" class="mini-spinner hidden"></span>
            </div>
            <button class="btn-pdf" onclick="openPdfModal()">Xuất thông tin ra PDF</button>
          </div>
          
          <div id="mmhSearchSection" class="mmh-search-section">
            <div class="mmh-search-container">
              <input type="text" id="mmhSearchInput" class="mmh-search-input" 
                     placeholder="Tìm tên tương ứng trong MMH Account list..." 
                     autocomplete="off"
                     onfocus="onMMHSearchFocus()"
                     oninput="onMMHSearchInput()"
                     onkeydown="onMMHSearchKeydown(event)">
              <div id="mmhAutocomplete" class="mmh-autocomplete"></div>
            </div>
            <button class="btn-confirm-mmh" id="btnConfirmMMH" onclick="confirmMMHAccountAction()" disabled>
              ✓ Xác nhận tên account
            </button>
          </div>
        </div>

        <div class="sub-stats">
          <div class="sub-card">
            <div class="sub-label">KQTT</div>
            <div class="sub-val" id="sRowKQTT">0</div>
          </div>
          <div class="sub-card">
            <div class="sub-label">KHLCNT</div>
            <div class="sub-val" id="sRowKHLCNT">0</div>
          </div>
          <div class="sub-card">
            <div class="sub-label">TBMT</div>
            <div class="sub-val" id="sRowTBMT">0</div>
          </div>
          <div class="sub-card highlight">
            <div class="sub-label">Tên gói thầu</div>
            <div class="sub-val" id="sUniquePkg">0</div>
          </div>
          <div class="sub-card highlight">
            <div class="sub-label">Nhà thầu trúng thầu</div>
            <div class="sub-val" id="sUniqueWinner">0</div>
          </div>
          <div class="sub-card highlight">
            <div class="sub-label">Tổng Giá trị trúng thầu</div>
            <div class="sub-val" id="sTotalWinVal">0</div>
          </div>
        </div>

        <div class="tabs">
          <div class="tab active" onclick="switchTab('tabKQTT', this)">Kết quả trúng thầu</div>
          <div class="tab" onclick="switchTab('tabKHLCNT', this)">Kế hoạch LCNT</div>
          <div class="tab" onclick="switchTab('tabTBMT', this)">Thông báo mời thầu</div>
        </div>

        <div id="tabKQTT" class="tab-content active">
          <div class="table-wrapper"><table id="tblKQTT"></table></div>
        </div>
        <div id="tabKHLCNT" class="tab-content">
          <div class="table-wrapper"><table id="tblKHLCNT"></table></div>
        </div>
        <div id="tabTBMT" class="tab-content">
          <div class="table-wrapper"><table id="tblTBMT"></table></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    var rawData = { KQTT: [], TBMT: [], KHLCNT: [], provinces: [], regions: [] };
    var filteredData = { KQTT: [], TBMT: [], KHLCNT: [] };
    var accountMap = new Map();
    var currentAccountName = null;
    var currentMMHAccountName = null;
    var selectedMMHAccount = null;
    var mmhAccountList = [];
    var mmhAutocompleteIndex = -1;

    function parseVND(str) {
      if (!str) return 0;
      if (typeof str === 'number') return str;
      var cleanStr = String(str).split('.').join('').split(',').join('').trim();
      var num = parseFloat(cleanStr);
      return isNaN(num) ? 0 : num;
    }

    function formatVND(num) {
      if (!num || isNaN(num)) return '0';
      return num.toLocaleString('vi-VN');
    }

    function monthToYYYYMM(monthStr) {
      if (!monthStr) return null;
      return parseInt(monthStr.replace('-', ''));
    }

    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showToast(message, type) {
      var toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + type;
      setTimeout(function() {
        toast.classList.add('hidden');
      }, 3000);
    }

    function showLoading(show, text) {
      var overlay = document.getElementById('loadingOverlay');
      var loadingText = document.getElementById('loadingText');
      if (text) loadingText.textContent = text;
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
        loadingText.textContent = 'Đang tải dữ liệu...';
      }
    }

    function toggleHeader() {
      var el = document.getElementById('collapsibleSection');
      el.classList.toggle('hidden');
    }

    window.onload = function() {
      console.log('Dashboard initializing...');
      showLoading(true);
      
      var now = new Date();
      var fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      document.getElementById('fDateFrom').value = fromDate.toISOString().slice(0, 7);
      document.getElementById('fDateTo').value = now.toISOString().slice(0, 7);
      
      var filterIds = ['fDateFrom', 'fDateTo', 'fProvince', 'fRegion', 'fMMH'];
      for (var i = 0; i < filterIds.length; i++) {
        document.getElementById(filterIds[i]).addEventListener('change', applyFiltersRealtime);
      }
      
      google.script.run
        .withSuccessHandler(initData)
        .withFailureHandler(function(err) {
          showLoading(false);
          console.error('Error loading data:', err);
          showToast('Error loading data: ' + (err.message || err), 'error');
        })
        .getDashboardData();
      
      google.script.run
        .withSuccessHandler(function(list) {
          mmhAccountList = list || [];
          console.log('MMH Account list loaded:', mmhAccountList.length);
        })
        .withFailureHandler(function(err) {
          console.error('Error loading MMH list:', err);
        })
        .getMMHAccountList();
      
      document.addEventListener('click', function(e) {
        var container = document.querySelector('.mmh-search-container');
        if (container && !container.contains(e.target)) {
          document.getElementById('mmhAutocomplete').classList.remove('show');
        }
      });
    };

    function initData(data) {
      console.log('Data received from server:', data);
      showLoading(false);
      
      if (!data) {
        console.error('No data returned from server');
        showToast('No data returned from server', 'error');
        return;
      }
      
      rawData = data;
      populateDropdown('fProvince', data.provinces || []);
      populateDropdown('fRegion', data.regions || []);
      applyFiltersRealtime();
    }

    function populateDropdown(selectId, options) {
      var select = document.getElementById(selectId);
      select.innerHTML = '<option value="">-- All --</option>';
      for (var i = 0; i < options.length; i++) {
        if (options[i] && String(options[i]).trim() !== '') {
          var option = document.createElement('option');
          option.value = options[i];
          option.textContent = options[i];
          select.appendChild(option);
        }
      }
    }

    function applyFiltersRealtime() {
      var dFrom = monthToYYYYMM(document.getElementById('fDateFrom').value);
      var dTo = monthToYYYYMM(document.getElementById('fDateTo').value);
      var province = document.getElementById('fProvince').value;
      var region = document.getElementById('fRegion').value;
      var isMMH = document.getElementById('fMMH').checked;

      filteredData.KQTT = filterRows(rawData.KQTT, 1, 12, 13, 14, dFrom, dTo, province, region, isMMH);
      filteredData.KHLCNT = filterRows(rawData.KHLCNT, 1, 15, 16, 17, dFrom, dTo, province, region, isMMH);
      filteredData.TBMT = filterRows(rawData.TBMT, 1, 20, 21, 22, dFrom, dTo, province, region, isMMH);

      updateGlobalStats();
    }

    function filterRows(rows, monthIdx, mmhIdx, provinceIdx, regionIdx, dFrom, dTo, province, region, isMMH) {
      if (!rows || rows.length === 0) return [];
      
      var result = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        
        var hasData = false;
        for (var j = 0; j < r.length; j++) {
          if (r[j] !== null && r[j] !== undefined && String(r[j]).trim() !== '') {
            hasData = true;
            break;
          }
        }
        if (!hasData) continue;

        if (dFrom || dTo) {
          var monthVal = r[monthIdx];
          var monthNum = null;
          
          if (monthVal !== null && monthVal !== undefined) {
            if (typeof monthVal === 'number') {
              monthNum = Math.floor(monthVal);
            } else {
              var cleaned = String(monthVal).replace(/[^0-9]/g, '');
              if (cleaned) monthNum = parseInt(cleaned);
            }
          }
          
          if (monthNum) {
            if (dFrom && monthNum < dFrom) continue;
            if (dTo && monthNum > dTo) continue;
          }
        }
        
        if (isMMH) {
          var mmhVal = r[mmhIdx];
          if (!mmhVal || String(mmhVal).trim() === '') continue;
        }
        
        if (province && province !== '') {
          var provVal = r[provinceIdx];
          if (!provVal || String(provVal).trim() !== province) continue;
        }
        
        if (region && region !== '') {
          var regVal = r[regionIdx];
          if (!regVal || String(regVal).trim() !== region) continue;
        }
        
        result.push(r);
      }
      
      return result;
    }

    function updateGlobalStats() {
      document.getElementById('gKHLCNT').textContent = filteredData.KHLCNT.length;
      document.getElementById('gTBMT').textContent = filteredData.TBMT.length;
      document.getElementById('gKQTT').textContent = filteredData.KQTT.length;
      
      var sumBid = 0, sumWin = 0;
      for (var i = 0; i < filteredData.KQTT.length; i++) {
        sumBid += parseVND(filteredData.KQTT[i][8]);
        sumWin += parseVND(filteredData.KQTT[i][9]);
      }
      
      document.getElementById('gValBid').textContent = formatVND(sumBid);
      document.getElementById('gValWin').textContent = formatVND(sumWin);
    }

    function viewDetail() {
      showLoading(true, 'Đang xử lý danh sách chủ đầu tư...');
      
      setTimeout(function() {
        buildAccountMap();
        renderAccountList();
        showLoading(false);
        
        currentAccountName = null;
        currentMMHAccountName = null;
        selectedMMHAccount = null;
        document.getElementById('detailView').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
      }, 100);
    }

    function buildAccountMap() {
      accountMap.clear();
      processRows(filteredData.KQTT, 3, 12, 'KQTT');
      processRows(filteredData.KHLCNT, 5, 15, 'KHLCNT');
      processRows(filteredData.TBMT, 3, 20, 'TBMT');
    }

    function processRows(rows, ownerIdx, mmhIdx, type) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var owner = r[ownerIdx];
        if (!owner || String(owner).trim() === '') continue;
        
        var key = String(owner).trim();
        
        if (!accountMap.has(key)) {
          accountMap.set(key, { 
            name: key, 
            isMMH: false,
            mmhAccountName: '',
            data: { KQTT: [], TBMT: [], KHLCNT: [] } 
          });
        }
        
        var acc = accountMap.get(key);
        var mmhVal = r[mmhIdx];
        
        if (mmhVal && String(mmhVal).trim() !== '') {
          acc.isMMH = true;
          acc.mmhAccountName = String(mmhVal).trim();
        }
        
        acc.data[type].push(r);
      }
    }

    function renderAccountList() {
      var listEl = document.getElementById('accountList');
      listEl.innerHTML = '';
      
      var accounts = Array.from(accountMap.values());
      accounts.sort(function(a, b) { 
        return a.name.localeCompare(b.name, 'vi'); 
      });
      
      if (accounts.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>Không tìm thấy chủ đầu tư nào phù hợp với bộ lọc.</p></div>';
        return;
      }

      for (var i = 0; i < accounts.length; i++) {
        var acc = accounts[i];
        var div = document.createElement('div');
        div.className = 'account-item';
        div.setAttribute('data-name', acc.name.toLowerCase());
        div.setAttribute('data-ismmh', acc.isMMH ? 'true' : 'false');
        
        (function(accName) {
          div.onclick = function() { selectAccount(accName); };
        })(acc.name);
        
        var mmhClass = acc.isMMH ? 'acc-mmh visible' : 'acc-mmh';
        div.innerHTML = '<div class="acc-name">' + escapeHtml(acc.name) + '</div>' +
                       '<div class="' + mmhClass + '">✓ MMH Account</div>';
        
        listEl.appendChild(div);
      }
    }

    function filterAccountList() {
      var term = document.getElementById('searchBox').value.toLowerCase();
      var items = document.querySelectorAll('.account-item');
      for (var i = 0; i < items.length; i++) {
        var name = items[i].getAttribute('data-name');
        items[i].style.display = name.indexOf(term) >= 0 ? 'block' : 'none';
      }
    }

    function selectAccount(name) {
      currentAccountName = name;
      selectedMMHAccount = null;
      
      var items = document.querySelectorAll('.account-item');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('active');
        if (items[i].querySelector('.acc-name').textContent === name) {
          items[i].classList.add('active');
        }
      }

      document.getElementById('emptyState').classList.add('hidden');
      document.getElementById('detailView').classList.remove('hidden');
      document.getElementById('detailView').style.display = 'flex';
      
      document.getElementById('mmhSearchInput').value = '';
      document.getElementById('btnConfirmMMH').disabled = true;
      document.getElementById('mmhAutocomplete').classList.remove('show');
      
      var acc = accountMap.get(name);
      var mmhBadge = document.getElementById('mmhBadge');
      var btnEditMMH = document.getElementById('btnEditMMH');
      var mmhSearchSection = document.getElementById('mmhSearchSection');
      
      if (acc && acc.isMMH) {
        currentMMHAccountName = acc.mmhAccountName;
        mmhBadge.classList.remove('hidden');
        btnEditMMH.classList.remove('hidden');
        mmhSearchSection.classList.add('hidden');
      } else {
        currentMMHAccountName = null;
        mmhBadge.classList.add('hidden');
        btnEditMMH.classList.add('hidden');
        mmhSearchSection.classList.remove('hidden');
      }
      
      renderDetail(name);
    }

    function enableEditMMH() {
      document.getElementById('mmhBadge').classList.add('hidden');
      document.getElementById('btnEditMMH').classList.add('hidden');
      document.getElementById('mmhSearchSection').classList.remove('hidden');
      
      if (currentMMHAccountName) {
        document.getElementById('mmhSearchInput').value = currentMMHAccountName;
        selectedMMHAccount = currentMMHAccountName;
        document.getElementById('btnConfirmMMH').disabled = false;
      }
    }

    function renderDetail(name) {
      var acc = accountMap.get(name);
      if (!acc) return;

      document.getElementById('accTitle').textContent = name;
      document.getElementById('sRowKQTT').textContent = acc.data.KQTT.length;
      document.getElementById('sRowKHLCNT').textContent = acc.data.KHLCNT.length;
      document.getElementById('sRowTBMT').textContent = acc.data.TBMT.length;

      var uniquePkg = {};
      var uniqueWinner = {};
      var totalWin = 0;
      
      for (var i = 0; i < acc.data.KQTT.length; i++) {
        var r = acc.data.KQTT[i];
        if (r[4]) uniquePkg[String(r[4]).trim()] = true;
        if (r[10]) uniqueWinner[String(r[10]).trim()] = true;
        totalWin += parseVND(r[9]);
      }

      document.getElementById('sUniquePkg').textContent = Object.keys(uniquePkg).length;
      document.getElementById('sUniqueWinner').textContent = Object.keys(uniqueWinner).length;
      document.getElementById('sTotalWinVal').textContent = formatVND(totalWin);

      renderTable('tblKQTT', acc.data.KQTT, 
        ['Ngày phê duyệt', 'Số TBMT', 'Dự án', 'Nhà thầu trúng thầu', 'Giá trị trúng thầu', 'Hình thức LCNT'],
        [11, 6, 4, 10, 9, 7], [4, 10]);

      renderTable('tblKHLCNT', acc.data.KHLCNT,
        ['Thời gian thực hiện', 'Số KHLCNT', 'Dự án', 'Tên gói thầu', 'Tổng mức đầu tư', 'Nguồn vốn', 'Giá gói thầu', 'Hình thức LCNT'],
        [14, 3, 4, 8, 6, 9, 10, 11], [8]);

      renderTable('tblTBMT', acc.data.TBMT,
        ['Thời điểm mở thầu', 'Thời điểm đóng thầu', 'Tên gói thầu', 'Giá gói thầu', 'Bảo đảm dự thầu', 'Hiệu lực hợp đồng', 'Nội dung gói thầu', 'Hình thức LCNT'],
        [12, 17, 6, 9, 14, 19, 7, 11], [6]);
    }

    function renderTable(tblId, data, headers, colIndices, boldCols) {
      boldCols = boldCols || [];
      var tbl = document.getElementById(tblId);
      
      var html = '<thead><tr>';
      for (var h = 0; h < headers.length; h++) {
        html += '<th>' + headers[h] + '</th>';
      }
      html += '</tr></thead><tbody>';

      if (data.length === 0) {
        html += '<tr><td colspan="' + headers.length + '" class="text-center" style="padding:30px; color:#999;">Không có thông tin</td></tr>';
      } else {
        for (var i = 0; i < data.length; i++) {
          var row = data[i];
          html += '<tr>';
          for (var j = 0; j < colIndices.length; j++) {
            var idx = colIndices[j];
            var val = row[idx];
            
            if (val instanceof Date) {
              val = val.toLocaleDateString('vi-VN');
            }
            if (typeof val === 'number' && val > 1000) {
              val = val.toLocaleString('vi-VN');
            }
            
            var isBold = boldCols.indexOf(idx) >= 0;
            var cellClass = isBold ? 'bold-cell' : '';
            html += '<td class="' + cellClass + '">' + escapeHtml(val !== null && val !== undefined ? String(val) : '') + '</td>';
          }
          html += '</tr>';
        }
      }
      
      html += '</tbody>';
      tbl.innerHTML = html;
    }

    function switchTab(tabId, tabEl) {
      var tabs = document.querySelectorAll('.tab');
      var contents = document.querySelectorAll('.tab-content');
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
      for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
      tabEl.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    }

    // ========== MMH SEARCH FUNCTIONS ==========
    function onMMHSearchFocus() {
      var input = document.getElementById('mmhSearchInput');
      if (input.value.trim() === '') {
        showMMHAutocomplete(mmhAccountList.slice(0, 10));
      } else {
        onMMHSearchInput();
      }
    }

    function onMMHSearchInput() {
      var input = document.getElementById('mmhSearchInput');
      var term = input.value.trim().toLowerCase();
      
      mmhAutocompleteIndex = -1;
      
      if (term === '') {
        showMMHAutocomplete(mmhAccountList.slice(0, 10));
        document.getElementById('btnConfirmMMH').disabled = true;
        selectedMMHAccount = null;
        return;
      }
      
      var results = smartSearch(term, mmhAccountList);
      showMMHAutocomplete(results);
    }

    function smartSearch(term, list) {
      if (!term || !list || list.length === 0) return [];
      
      var termLower = term.toLowerCase();
      var termWords = termLower.split(/\\s+/).filter(function(w) { return w.length > 0; });
      
      var scored = [];
      
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        var itemLower = item.toLowerCase();
        var score = 0;
        
        if (itemLower === termLower) {
          score = 1000;
        } else if (itemLower.indexOf(termLower) === 0) {
          score = 500;
        } else if (itemLower.indexOf(termLower) >= 0) {
          score = 300;
        } else {
          var allWordsMatch = true;
          var wordScore = 0;
          for (var w = 0; w < termWords.length; w++) {
            if (itemLower.indexOf(termWords[w]) >= 0) {
              wordScore += 50;
            } else {
              allWordsMatch = false;
            }
          }
          if (allWordsMatch && termWords.length > 0) {
            score = 200 + wordScore;
          } else if (wordScore > 0) {
            score = wordScore;
          }
        }
        
        if (score === 0) {
          var fuzzyScore = fuzzyMatch(termLower, itemLower);
          if (fuzzyScore > 0.5) {
            score = Math.floor(fuzzyScore * 100);
          }
        }
        
        if (score > 0) {
          scored.push({ item: item, score: score });
        }
      }
      
      scored.sort(function(a, b) { return b.score - a.score; });
      return scored.slice(0, 15).map(function(s) { return s.item; });
    }

    function fuzzyMatch(needle, haystack) {
      if (needle.length === 0) return 0;
      if (haystack.length === 0) return 0;
      if (needle === haystack) return 1;
      
      var needleLen = needle.length;
      var haystackLen = haystack.length;
      
      if (needleLen > haystackLen) return 0;
      
      var matches = 0;
      var needleIdx = 0;
      
      for (var i = 0; i < haystackLen && needleIdx < needleLen; i++) {
        if (haystack[i] === needle[needleIdx]) {
          matches++;
          needleIdx++;
        }
      }
      
      if (needleIdx < needleLen) return 0;
      return matches / haystackLen;
    }

    function showMMHAutocomplete(results) {
      var dropdown = document.getElementById('mmhAutocomplete');
      var input = document.getElementById('mmhSearchInput');
      var term = input.value.trim().toLowerCase();
      
      if (results.length === 0) {
        dropdown.innerHTML = '<div class="mmh-no-result">Không tìm thấy kết quả phù hợp</div>';
        dropdown.classList.add('show');
        return;
      }
      
      var html = '';
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        var displayText = escapeHtml(item);
        
        if (term) {
          displayText = highlightMatch(displayText, term);
        }
        
        html += '<div class="mmh-autocomplete-item" data-value="' + escapeHtml(item) + '" onclick="selectMMHItem(this)">' + displayText + '</div>';
      }
      
      dropdown.innerHTML = html;
      dropdown.classList.add('show');
    }

    function highlightMatch(text, term) {
      if (!term) return text;
      var lowerText = text.toLowerCase();
      var lowerTerm = term.toLowerCase();
      var idx = lowerText.indexOf(lowerTerm);
      if (idx === -1) return text;
      
      var before = text.substring(0, idx);
      var match = text.substring(idx, idx + term.length);
      var after = text.substring(idx + term.length);
      
      return before + '<span class="mmh-highlight">' + match + '</span>' + after;
    }

    function selectMMHItem(el) {
      var value = el.getAttribute('data-value');
      document.getElementById('mmhSearchInput').value = value;
      document.getElementById('mmhAutocomplete').classList.remove('show');
      selectedMMHAccount = value;
      document.getElementById('btnConfirmMMH').disabled = false;
    }

    function onMMHSearchKeydown(event) {
      var dropdown = document.getElementById('mmhAutocomplete');
      var items = dropdown.querySelectorAll('.mmh-autocomplete-item');
      
      if (!dropdown.classList.contains('show') || items.length === 0) return;
      
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        mmhAutocompleteIndex = Math.min(mmhAutocompleteIndex + 1, items.length - 1);
        updateAutocompleteSelection(items);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        mmhAutocompleteIndex = Math.max(mmhAutocompleteIndex - 1, 0);
        updateAutocompleteSelection(items);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (mmhAutocompleteIndex >= 0 && mmhAutocompleteIndex < items.length) {
          selectMMHItem(items[mmhAutocompleteIndex]);
        }
      } else if (event.key === 'Escape') {
        dropdown.classList.remove('show');
      }
    }

    function updateAutocompleteSelection(items) {
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('selected');
      }
      if (mmhAutocompleteIndex >= 0 && mmhAutocompleteIndex < items.length) {
        items[mmhAutocompleteIndex].classList.add('selected');
        items[mmhAutocompleteIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    // ========== CONFIRM MMH ACCOUNT ==========
    function confirmMMHAccountAction() {
      if (!currentAccountName) {
        showToast('Vui lòng chọn chủ đầu tư trước!', 'error');
        return;
      }
      
      var mmhValue = selectedMMHAccount || document.getElementById('mmhSearchInput').value.trim();
      
      if (!mmhValue) {
        showToast('Vui lòng chọn hoặc nhập tên MMH Account!', 'error');
        return;
      }
      
      var spinner = document.getElementById('confirmSpinner');
      var btn = document.getElementById('btnConfirmMMH');
      spinner.classList.remove('hidden');
      btn.disabled = true;
      btn.textContent = 'Đang xử lý...';
      
      google.script.run
        .withSuccessHandler(function(result) {
          spinner.classList.add('hidden');
          btn.disabled = false;
          btn.textContent = '✓ Xác nhận tên account';
          
          if (result.success) {
            var totalUpdated = (result.updated.KQTT || 0) + (result.updated.KHLCNT || 0) + (result.updated.TBMT || 0);
            showToast('Đã cập nhật ' + totalUpdated + ' dòng thành công!', 'success');
            
            currentMMHAccountName = mmhValue;
            document.getElementById('mmhBadge').classList.remove('hidden');
            document.getElementById('btnEditMMH').classList.remove('hidden');
            document.getElementById('mmhSearchSection').classList.add('hidden');
            
            var acc = accountMap.get(currentAccountName);
            if (acc) {
              acc.isMMH = true;
              acc.mmhAccountName = mmhValue;
            }
            
            var items = document.querySelectorAll('.account-item');
            for (var i = 0; i < items.length; i++) {
              if (items[i].querySelector('.acc-name').textContent === currentAccountName) {
                items[i].querySelector('.acc-mmh').classList.add('visible');
                break;
              }
            }
            
            reloadDataAndUpdateStats();
          } else {
            showToast(result.message || 'Có lỗi xảy ra!', 'error');
          }
        })
        .withFailureHandler(function(err) {
          spinner.classList.add('hidden');
          btn.disabled = false;
          btn.textContent = '✓ Xác nhận tên account';
          showToast('Error: ' + (err.message || err), 'error');
        })
        .confirmMMHAccount(currentAccountName, mmhValue);
    }

    function reloadDataAndUpdateStats() {
      google.script.run
        .withSuccessHandler(function(data) {
          if (data) {
            rawData = data;
            applyFiltersRealtime();
            buildAccountMap();
            renderAccountList();
            
            if (currentAccountName) {
              selectAccount(currentAccountName);
            }
          }
        })
        .withFailureHandler(function(err) {
          console.error('Error reloading data:', err);
        })
        .getDashboardData();
    }

    // ========== UPDATE MMH LIST ==========
    function updateMMHList() {
      var btn = document.getElementById('btnUpdateMMH');
      btn.disabled = true;
      btn.textContent = '⏳ Đang cập nhật...';
      
      google.script.run
        .withSuccessHandler(function(result) {
          btn.disabled = false;
          btn.textContent = '🔄 Cập nhật MMH Account list';
          
          if (result.success) {
            showToast('Đã thêm ' + result.added + ' account mới vào danh sách!', 'success');
            
            google.script.run
              .withSuccessHandler(function(list) {
                mmhAccountList = list || [];
              })
              .getMMHAccountList();
          } else {
            showToast(result.message || 'Có lỗi xảy ra!', 'error');
          }
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.textContent = '🔄 Cập nhật MMH Account list';
          showToast('Error: ' + (err.message || err), 'error');
        })
        .updateMMHAccountListFromExternal();
    }

    // ========== PDF EXPORT FUNCTIONS ==========
    function openPdfModal() {
      if (!currentAccountName) {
        showToast('Vui lòng chọn chủ đầu tư trước!', 'error');
        return;
      }
      document.getElementById('pdfModal').classList.remove('hidden');
    }

    function closePdfModal() {
      document.getElementById('pdfModal').classList.add('hidden');
    }

    function confirmExportPdf() {
  var includeSalesHistory = document.getElementById('chkSalesHistory').checked;
  var includeAreaInfo = document.getElementById('chkAreaInfo').checked;
  var productType = document.querySelector('input[name="productType"]:checked').value;
  
  var btn = document.getElementById('btnConfirmPdf');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';
  
  // Lấy filter values
  var monthFrom = document.getElementById('fDateFrom').value.replace('-', '');
  var monthTo = document.getElementById('fDateTo').value.replace('-', '');
  
  console.log('=== PDF EXPORT DEBUG ===');
  console.log('Account:', currentAccountName);
  console.log('MMH Account:', currentMMHAccountName);
  console.log('Month From:', monthFrom);
  console.log('Month To:', monthTo);
  console.log('Include Area Info:', includeAreaInfo);
  
  // ⚡ FIX: Gọi getExternalDataForPDF trước
  google.script.run
    .withSuccessHandler(function(extResult) {
      console.log('External data result:', extResult);
      
      if (!extResult.success) {
        showToast('Error loading external data: ' + extResult.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Xuất PDF & Gửi Email';
        return;
      }
      
      // Log productPresentation data
      if (extResult.data && extResult.data.productPresentation) {
        console.log('Product Presentation rows:', extResult.data.productPresentation.count);
      } else {
        console.log('⚠️ No productPresentation in external data');
      }
      
      // Chuẩn bị payload
      var acc = accountMap.get(currentAccountName);
      
      // === KQTT rows ===
      var rowsKQTT = [];
      for (var i = 0; i < acc.data.KQTT.length; i++) {
        var r = acc.data.KQTT[i];
        rowsKQTT.push({
          colM: r[11] || '',
          colH: r[6] || '',
          colF: r[4] || '',
          colL: r[10] || '',
          colK: r[9] || '',
          colI: r[7] || ''
        });
      }
      
      // === KHLCNT rows ===
      var rowsKHLCNT = [];
      for (var i = 0; i < acc.data.KHLCNT.length; i++) {
        var r = acc.data.KHLCNT[i];
        rowsKHLCNT.push({
          colP: r[14] || '',
          colE: r[3] || '',
          colF: r[4] || '',
          colJ: r[8] || '',
          colH: r[6] || '',
          colK: r[9] || '',
          colL: r[10] || '',
          colM: r[11] || ''
        });
      }
      
      // === TBMT rows ===
      var rowsTBMT = [];
      for (var i = 0; i < acc.data.TBMT.length; i++) {
        var r = acc.data.TBMT[i];
        rowsTBMT.push({
          colT: r[18] || '',
          colS: r[17] || '',
          colH: r[6] || '',
          colK: r[9] || '',
          colP: r[14] || '',
          colU: r[19] || '',
          colM: r[11] || ''
        });
      }
      
      var payload = {
        accountName: currentAccountName,
        mmhAccountName: currentMMHAccountName || currentAccountName,
        filter: {
          dateFrom: document.getElementById('fDateFrom').value || 'N/A',
          dateTo: document.getElementById('fDateTo').value || 'N/A'
        },
        productType: productType,
        includeSalesHistory: includeSalesHistory,
        includeAreaInfo: includeAreaInfo,
        externalData: extResult.data,
        biddingData: {
          kqttCount: acc.data.KQTT.length,
          khlcntCount: acc.data.KHLCNT.length,
          tbmtCount: acc.data.TBMT.length,
          totalWinValue: document.getElementById('sTotalWinVal').textContent,
          kqttRows: rowsKQTT,
          khlcntRows: rowsKHLCNT,
          tbmtRows: rowsTBMT
        }
      };
      
      console.log('Payload prepared:', payload);
      
      // Gọi generate PDF
      google.script.run
        .withSuccessHandler(function(res) {
          closePdfModal();
          btn.disabled = false;
          btn.textContent = 'Xuất PDF & Gửi Email';
          showToast(res.message, res.success ? 'success' : 'error');
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.textContent = 'Xuất PDF & Gửi Email';
          showToast('Error: ' + (err.message || err), 'error');
        })
        .generateAdvancedPDF(payload);
    })
    .withFailureHandler(function(err) {
      btn.disabled = false;
      btn.textContent = 'Xuất PDF & Gửi Email';
      showToast('Error: ' + (err.message || err), 'error');
    })
    .getExternalDataForPDF(currentMMHAccountName || currentAccountName, monthFrom, monthTo, {
      includeSalesHistory: includeSalesHistory,
      includeAreaInfo: includeAreaInfo,
      productType: productType
    });
}

// ===================== KẾT THÚC CODE THAY THẾ =====================
  </script>
</body>
</html>`;
}

// 4.2 HTML Update Dialog
// 4.2 HTML Update Dialog
// ===================================================================
// CẬP NHẬT HTML UPDATE DIALOG
// Thay thế function getUpdateHtml_() trong file code gốc
// ===================================================================

function getUpdateHtml_() {
  return `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: 'Calibri', sans-serif; padding: 20px; background: #f9f9f9; }
    h2 { color: #3b5998; margin-top: 0; }
    
    /* ⭐ STYLE CHO BUTTON MỚI - TẢI TOÀN BỘ EMAIL */
    .full-fetch-container {
      margin-bottom: 30px;
      padding: 25px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }
    
    .full-fetch-title {
      color: white;
      font-size: 20px;
      font-weight: bold;
      margin: 0 0 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .full-fetch-desc {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .date-range-container {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .date-group {
      flex: 1;
      background: rgba(255, 255, 255, 0.15);
      padding: 15px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    
    .date-group label {
      display: block;
      color: white;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 13px;
    }
    
    .date-group input {
      width: 100%;
      padding: 10px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.95);
      font-size: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }
    
    .btn-full-fetch {
      background: white;
      color: #667eea;
      font-size: 16px;
      padding: 15px 30px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .btn-full-fetch:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
      background: #f8f9fa;
    }
    
    .btn-full-fetch:active {
      transform: translateY(0);
    }
    
    .btn-full-fetch:disabled {
      background: #e0e0e0;
      color: #999;
      cursor: not-allowed;
      transform: none;
    }
    
    .full-fetch-status {
      display: none;
      margin-top: 15px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .full-fetch-status.show {
      display: block;
    }
    
    .email-sources {
      margin-top: 15px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      backdrop-filter: blur(10px);
    }
    
    .email-sources-title {
      color: white;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .email-list {
      color: rgba(255, 255, 255, 0.9);
      font-size: 11px;
      line-height: 1.6;
      margin: 0;
      padding-left: 20px;
    }
    
    /* EXISTING STYLES */
    .tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 20px; }
    .tab { padding: 12px 24px; cursor: pointer; background: #eee; margin-right: 4px; border-radius: 4px 4px 0 0; font-weight: bold; color: #666; transition: background 0.2s; }
    .tab:hover { background: #ddd; }
    .tab.active { background: #3b5998; color: white; }
    .content { display: none; background: white; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
    .content.active { display: block; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input[type="text"], input[type="date"], select { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: inherit; }
    .btn-action { background: #3b5998; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 10px; font-weight: bold; font-size: 14px; }
    .btn-action:hover { background: #2d4373; }
    .btn-action:disabled { background: #999; cursor: not-allowed; }
    .status { margin-top: 15px; font-size: 14px; padding: 10px; border-radius: 4px; display: none; }
    .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .status.loading { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
    .result-detail { margin-top: 10px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h2>📥 Cập nhật thông tin thầu</h2>
  
  <!-- ⭐ SECTION MỚI: TẢI TOÀN BỘ EMAIL LỊCH SỬ -->
  <div class="full-fetch-container">
    <div class="full-fetch-title">
      <span>🚀</span>
      <span>Tải toàn bộ email lịch sử</span>
    </div>
    
    <div class="full-fetch-desc">
      Quét và tải <strong>TẤT CẢ</strong> email từ các nguồn "Báo đấu thầu" trong khoảng thời gian chỉ định. 
      Hệ thống sẽ tự động phân loại và cập nhật dữ liệu vào các sheet tương ứng với timestamp.
    </div>
    
    <div class="date-range-container">
      <div class="date-group">
        <label>📅 Từ ngày:</label>
        <input type="date" id="fullFetchFrom" value="2020-01-01">
      </div>
      <div class="date-group">
        <label>📅 Đến ngày:</label>
        <input type="date" id="fullFetchTo">
      </div>
    </div>
    
    <button class="btn-full-fetch" onclick="runFullFetch()">
      <span>📡</span>
      <span>Tải toàn bộ email từ "Báo đấu thầu"</span>
    </button>
    
    <div class="email-sources">
      <div class="email-sources-title">📧 Nguồn email sẽ được quét:</div>
      <ul class="email-list">
        <li>bantin@baodauthau.vn</li>
        <li>bantindauthaudientukq@gmail.com</li>
        <li>Bantindientu@baodauthau.vn</li>
        <li>bantindauthaudientu@gmail.com</li>
        <li>bantindauthau@taichinhdautu.vn</li>
      </ul>
    </div>
    
    <div id="fullFetchStatus" class="full-fetch-status"></div>
  </div>
  
  <!-- EXISTING TABS -->
  <div class="tabs">
    <div class="tab active" data-type="KQTT">Kết quả trúng thầu</div>
    <div class="tab" data-type="TBMT">Thông báo mời thầu</div>
    <div class="tab" data-type="KHLCNT">Kế hoạch LCNT</div>
  </div>

  <!-- TAB KQTT -->
  <div id="tab-KQTT" class="content active">
    <div class="form-group">
      <label>Ngày nhận Email:</label>
      <div style="display:flex; gap:10px;">
        <input type="date" id="dateFrom_KQTT">
        <input type="date" id="dateTo_KQTT">
      </div>
    </div>
    <div class="form-group">
      <label>Email được nhận từ:</label>
      <select id="sender_KQTT">
        <option value="bantin@baodauthau.vn,bantindauthaudientukq@gmail.com,Bantindientu@baodauthau.vn,bantindauthaudientu@gmail.com,bantindauthau@taichinhdautu.vn">⭐ Tất cả nguồn (Báo đấu thầu)</option>
        <option value="bantin@baodauthau.vn">bantin@baodauthau.vn</option>
        <option value="bantindauthaudientukq@gmail.com">bantindauthaudientukq@gmail.com</option>
        <option value="Bantindientu@baodauthau.vn">Bantindientu@baodauthau.vn</option>
        <option value="bantindauthaudientu@gmail.com">bantindauthaudientu@gmail.com</option>
        <option value="bantindauthau@taichinhdautu.vn">bantindauthau@taichinhdautu.vn</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tiêu đề email có chứa:</label>
      <input type="text" id="subj_KQTT" value="Thông tin đấu thầu (kết quả)">
    </div>
    <button class="btn-action" onclick="runUpdate('KQTT')">TẢI VÀ CẬP NHẬT THÔNG TIN (KQTT)</button>
    <div id="status_KQTT" class="status"></div>
  </div>

  <!-- TAB TBMT -->
  <div id="tab-TBMT" class="content">
    <div class="form-group">
      <label>Ngày nhận Email:</label>
      <div style="display:flex; gap:10px;">
        <input type="date" id="dateFrom_TBMT">
        <input type="date" id="dateTo_TBMT">
      </div>
    </div>
    <div class="form-group">
      <label>Email được nhận từ:</label>
      <select id="sender_TBMT">
        <option value="bantin@baodauthau.vn,bantindauthaudientukq@gmail.com,Bantindientu@baodauthau.vn,bantindauthaudientu@gmail.com,bantindauthau@taichinhdautu.vn">⭐ Tất cả nguồn (Báo đấu thầu)</option>
        <option value="bantin@baodauthau.vn">bantin@baodauthau.vn</option>
        <option value="bantindauthaudientukq@gmail.com">bantindauthaudientukq@gmail.com</option>
        <option value="Bantindientu@baodauthau.vn">Bantindientu@baodauthau.vn</option>
        <option value="bantindauthaudientu@gmail.com">bantindauthaudientu@gmail.com</option>
        <option value="bantindauthau@taichinhdautu.vn">bantindauthau@taichinhdautu.vn</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tiêu đề email có chứa:</label>
      <input type="text" id="subj_TBMT" value="Thông tin đấu thầu (thông báo)">
    </div>
    <button class="btn-action" onclick="runUpdate('TBMT')">TẢI VÀ CẬP NHẬT THÔNG TIN (TBMT)</button>
    <div id="status_TBMT" class="status"></div>
  </div>

  <!-- TAB KHLCNT -->
  <div id="tab-KHLCNT" class="content">
    <div class="form-group">
      <label>Ngày nhận Email:</label>
      <div style="display:flex; gap:10px;">
        <input type="date" id="dateFrom_KHLCNT">
        <input type="date" id="dateTo_KHLCNT">
      </div>
    </div>
    <div class="form-group">
      <label>Email được nhận từ:</label>
      <select id="sender_KHLCNT">
        <option value="bantin@baodauthau.vn,bantindauthaudientukq@gmail.com,Bantindientu@baodauthau.vn,bantindauthaudientu@gmail.com,bantindauthau@taichinhdautu.vn">⭐ Tất cả nguồn (Báo đấu thầu)</option>
        <option value="bantin@baodauthau.vn">bantin@baodauthau.vn</option>
        <option value="bantindauthaudientukq@gmail.com">bantindauthaudientukq@gmail.com</option>
        <option value="Bantindientu@baodauthau.vn">Bantindientu@baodauthau.vn</option>
        <option value="bantindauthaudientu@gmail.com">bantindauthaudientu@gmail.com</option>
        <option value="bantindauthau@taichinhdautu.vn">bantindauthau@taichinhdautu.vn</option>
      </select>
    </div>
    <div class="form-group">
      <label>Tiêu đề email có chứa:</label>
      <input type="text" id="subj_KHLCNT" value="Thông tin đấu thầu (kế hoạch)">
    </div>
    <button class="btn-action" onclick="runUpdate('KHLCNT')">TẢI VÀ CẬP NHẬT THÔNG TIN (KHLCNT)</button>
    <div id="status_KHLCNT" class="status"></div>
  </div>

  <script>
    // ⭐ FUNCTION MỚI: XỬ LÝ BUTTON TẢI TOÀN BỘ EMAIL
    function runFullFetch() {
      const btn = event.target.closest('.btn-full-fetch');
      const statusDiv = document.getElementById('fullFetchStatus');
      const dateFrom = document.getElementById('fullFetchFrom').value;
      const dateTo = document.getElementById('fullFetchTo').value;
      
      // Validation
      if (!dateFrom || !dateTo) {
        alert('⚠️ Vui lòng chọn đầy đủ khoảng thời gian!');
        return;
      }
      
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      
      if (fromDate > toDate) {
        alert('⚠️ "Từ ngày" phải nhỏ hơn "Đến ngày"!');
        return;
      }
      
      // Disable button
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span><span>Đang xử lý... Vui lòng đợi</span>';
      
      // Show status
      statusDiv.className = 'full-fetch-status show';
      statusDiv.innerHTML = \`
        <div style="color: #667eea; font-weight: bold; margin-bottom: 10px;">
          🔄 Đang quét email từ \${dateFrom} đến \${dateTo}...
        </div>
        <div style="font-size: 12px; color: #666;">
          Hệ thống đang tải và phân tích email từ 4 nguồn. Quá trình này có thể mất vài phút tùy thuộc vào số lượng email.
        </div>
      \`;
      
      // Call server function
      google.script.run
        .withSuccessHandler(function(result) {
          btn.disabled = false;
          btn.innerHTML = '<span>📡</span><span>Tải toàn bộ email từ "Báo đấu thầu"</span>';
          
          if (result.success) {
            const summary = result.data;
            const totalEmails = summary.KQTT.emails + summary.KHLCNT.emails + summary.TBMT.emails;
            const totalFiles = summary.KQTT.files + summary.KHLCNT.files + summary.TBMT.files;
            const totalRows = summary.KQTT.rows + summary.KHLCNT.rows + summary.TBMT.rows;
            
            statusDiv.innerHTML = \`
              <div style="color: #10b981; font-weight: bold; font-size: 16px; margin-bottom: 15px;">
                ✅ Hoàn tất thành công!
              </div>
              
              <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
                <div style="font-weight: bold; margin-bottom: 10px; color: #0369a1;">📊 Tổng quan:</div>
                <div style="font-size: 13px; line-height: 1.8;">
                  📧 Tổng email đã xử lý: <strong>\${totalEmails}</strong><br>
                  📁 Tổng file đã tải: <strong>\${totalFiles}</strong><br>
                  📝 Tổng dòng dữ liệu thêm mới: <strong>\${totalRows}</strong>
                </div>
              </div>
              
              <div style="background: #f0fdf4; padding: 15px; border-radius: 6px;">
                <div style="font-weight: bold; margin-bottom: 10px; color: #15803d;">📈 Chi tiết theo loại:</div>
                <div style="font-size: 12px; line-height: 2;">
                  <div style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Kết quả trúng thầu:</strong> \${summary.KQTT.emails} emails → \${summary.KQTT.files} files → <strong>\${summary.KQTT.rows} dòng</strong>
                  </div>
                  <div style="padding: 5px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Kế hoạch LCNT:</strong> \${summary.KHLCNT.emails} emails → \${summary.KHLCNT.files} files → <strong>\${summary.KHLCNT.rows} dòng</strong>
                  </div>
                  <div style="padding: 5px 0;">
                    <strong>Thông báo mời thầu:</strong> \${summary.TBMT.emails} emails → \${summary.TBMT.files} files → <strong>\${summary.TBMT.rows} dòng</strong>
                  </div>
                </div>
              </div>
              
              <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 6px; font-size: 12px; color: #92400e;">
                ℹ️ <strong>Lưu ý:</strong> Các dòng trùng lặp đã được tự động loại bỏ. Mỗi dòng được ghi nhận với timestamp chính xác.
              </div>
            \`;
          } else {
            statusDiv.innerHTML = \`
              <div style="color: #dc2626; font-weight: bold; margin-bottom: 10px;">
                ❌ Có lỗi xảy ra
              </div>
              <div style="font-size: 13px; color: #991b1b;">
                \${result.message || 'Unknown error'}
              </div>
            \`;
          }
        })
        .withFailureHandler(function(err) {
          btn.disabled = false;
          btn.innerHTML = '<span>📡</span><span>Tải toàn bộ email từ "Báo đấu thầu"</span>';
          
          statusDiv.innerHTML = \`
            <div style="color: #dc2626; font-weight: bold; margin-bottom: 10px;">
              ❌ Lỗi kết nối
            </div>
            <div style="font-size: 13px; color: #991b1b;">
              \${err.message || err}
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              Vui lòng thử lại hoặc kiểm tra console log để biết thêm chi tiết.
            </div>
          \`;
        })
        .fetchAllHistoricalEmails({
          dateFrom: dateFrom,
          dateTo: dateTo
        });
    }
    
    // Set default dates
    function setDefaultDates() {
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      
      // Set for individual tabs
      const types = ['KQTT', 'TBMT', 'KHLCNT'];
      for (let i = 0; i < types.length; i++) {
        const typeVal = types[i];
        document.getElementById('dateFrom_' + typeVal).value = formatDate(lastWeek);
        document.getElementById('dateTo_' + typeVal).value = formatDate(today);
      }
      
      // Set for full fetch (default to today)
      document.getElementById('fullFetchTo').value = formatDate(today);
    }
    
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }
    
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function() {
        const typeVal = this.getAttribute('data-type');
        
        // Remove active from all tabs
        const allTabs = document.querySelectorAll('.tab');
        for (let j = 0; j < allTabs.length; j++) {
          allTabs[j].classList.remove('active');
        }
        
        // Remove active from all contents
        const allContents = document.querySelectorAll('.content');
        for (let k = 0; k < allContents.length; k++) {
          allContents[k].classList.remove('active');
        }
        
        // Add active to clicked tab and corresponding content
        this.classList.add('active');
        document.getElementById('tab-' + typeVal).classList.add('active');
      });
    }
    
    function runUpdate(typeVal) {
      const statusEl = document.getElementById('status_' + typeVal);
      const btnEl = statusEl.previousElementSibling;
      
      // Show loading
      statusEl.style.display = 'block';
      statusEl.className = 'status loading';
      statusEl.innerHTML = '⏳ Đang tải emails và cập nhật thông tin...';
      btnEl.disabled = true;
      
      const payload = {
        type: typeVal,
        dateFrom: document.getElementById('dateFrom_' + typeVal).value,
        dateTo: document.getElementById('dateTo_' + typeVal).value,
        sender: document.getElementById('sender_' + typeVal).value,
        subject: document.getElementById('subj_' + typeVal).value
      };
      
      console.log('Payload:', payload);
      
      google.script.run
        .withSuccessHandler(function(res) {
          statusEl.className = 'status success';
          
          let msg = '✅ Đã cập nhật <b>' + res.count + '</b> emails, <b>' + res.filesDownloaded + '</b> File data được tải về.';
          
          if (res.rowsAdded) {
            const total = (res.rowsAdded.KQTT || 0) + (res.rowsAdded.KHLCNT || 0) + (res.rowsAdded.TBMT || 0);
            msg += '<div class="result-detail">';
            msg += '📊 Dữ liệu được cập nhật vào sheet (có timestamp):<br>';
            msg += '• Kết quả trúng thầu: <b>' + (res.rowsAdded.KQTT || 0) + '</b> thông tin<br>';
            msg += '• Kế hoạch LCNT: <b>' + (res.rowsAdded.KHLCNT || 0) + '</b> thông tin<br>';
            msg += '• Thông báo mời thầu: <b>' + (res.rowsAdded.TBMT || 0) + '</b> thông tin<br>';
            msg += '<b>Tổng cộng: ' + total + ' thông tin được thêm vào sheet</b>';
            msg += '</div>';
          }
          
          statusEl.innerHTML = msg;
          btnEl.disabled = false;
        })
        .withFailureHandler(function(err) {
          statusEl.className = 'status error';
          statusEl.innerHTML = '❌ Error: ' + (err.message || err);
          btnEl.disabled = false;
        })
        .runFetchEmailsByType(payload);
    }
    
    // Initialize on load
    setDefaultDates();
  </script>
</body>
</html>`;
}
/**
 * Xử lý dữ liệu từ các file Google Sheets đã tải xuống
 */
/**
 * Xử lý dữ liệu từ các file Google Sheets đã tải xuống
 * @param {Array} downloadedFiles - Danh sách file đã tải
 * @returns {Object} Số dòng đã thêm cho mỗi loại
 */
function processDownloadedSheets(downloadedFiles) {
  try {
    Logger.log('=== START processDownloadedSheets ===');
    Logger.log('Processing ' + downloadedFiles.length + ' files');
    
    if (!downloadedFiles || downloadedFiles.length === 0) {
      Logger.log('No files to process');
      return { KQTT: 0, KHLCNT: 0, TBMT: 0 };
    }
    
    const ss = SpreadsheetApp.getActive();
    const result = { KQTT: 0, KHLCNT: 0, TBMT: 0 };
    
    // Nhóm files theo type
    const filesByType = {
      KQTT: [],
      KHLCNT: [],
      TBMT: []
    };
    
    downloadedFiles.forEach(function(file) {
      if (filesByType[file.type]) {
        filesByType[file.type].push(file);
      }
    });
    
    Logger.log('Files by type: KQTT=' + filesByType.KQTT.length + 
               ', KHLCNT=' + filesByType.KHLCNT.length + 
               ', TBMT=' + filesByType.TBMT.length);
    
    // Xử lý từng loại
    if (filesByType.KQTT.length > 0) {
      result.KQTT = processFilesForSheet_(ss, filesByType.KQTT, SHEET_KQTT, 'KQTT');
      Logger.log('KQTT: Added ' + result.KQTT + ' rows');
    }
    
    if (filesByType.KHLCNT.length > 0) {
      result.KHLCNT = processFilesForSheet_(ss, filesByType.KHLCNT, SHEET_KHLCNT, 'KHLCNT');
      Logger.log('KHLCNT: Added ' + result.KHLCNT + ' rows');
    }
    
    if (filesByType.TBMT.length > 0) {
      result.TBMT = processFilesForSheet_(ss, filesByType.TBMT, SHEET_TBMT, 'TBMT');
      Logger.log('TBMT: Added ' + result.TBMT + ' rows');
    }
    
    Logger.log('=== END processDownloadedSheets ===');
    Logger.log('Final result: ' + JSON.stringify(result));
    
    return result;
    
  } catch (e) {
    Logger.log('FATAL ERROR in processDownloadedSheets: ' + e.toString());
    Logger.log('Stack: ' + e.stack);
    throw new Error('Error processing files: ' + e.message);
  }
}
/**
 * Xử lý files cho một sheet cụ thể
 * @param {Spreadsheet} ss - Spreadsheet hiện tại
 * @param {Array} files - Danh sách file cần xử lý
 * @param {string} sheetName - Tên sheet đích
 * @param {string} type - Loại dữ liệu (KQTT, KHLCNT, TBMT)
 * @returns {number} Số dòng đã thêm
 */
function processFilesForSheet_(ss, files, sheetName, type) {
  const targetSheet = ss.getSheetByName(sheetName);
  if (!targetSheet) {
    Logger.log('Sheet "' + sheetName + '" not found');
    return 0;
  }
  
  // Sắp xếp files theo tên (timestamp tăng dần)
  files.sort(function(a, b) { return a.name.localeCompare(b.name); });
  
  let totalRowsAdded = 0;
  const existingData = getExistingSheetData_(targetSheet);

  function isFileAlreadyProcessed_(targetSheet, fileName, sourceDataCol) {
    const lastRow = targetSheet.getLastRow();
    if (lastRow < 3) return false;
    
    const sourceDataColumn = targetSheet.getRange(3, sourceDataCol + 1, lastRow - 2, 1).getValues();
    const cleanFileName = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '');
    
    for (var i = 0; i < sourceDataColumn.length; i++) {
      if (String(sourceDataColumn[i][0]).trim() === cleanFileName) {
        return true;
      }
    }
    return false;
  }
  
  const mapping = getColumnMapping_(type);
  
  Logger.log('Processing ' + files.length + ' files for ' + type);
  Logger.log('Existing rows in target: ' + existingData.length);
  
  files.forEach(function(fileInfo, fileIndex) {
    try {
      Logger.log('--- Processing file ' + (fileIndex + 1) + '/' + files.length + ': ' + fileInfo.name);
      
      // Kiểm tra file đã được xử lý chưa
      if (isFileAlreadyProcessed_(targetSheet, fileInfo.name, mapping.sourceDataCol)) {
        Logger.log('File already processed, skipping: ' + fileInfo.name);
        return;
      }
      
      // Convert file nếu cần và mở spreadsheet
      const sourceSpreadsheet = openOrConvertFile_(fileInfo);
      if (!sourceSpreadsheet) {
        Logger.log('Could not open file: ' + fileInfo.name);
        return;
      }
      
      const sourceSheet = sourceSpreadsheet.getSheets()[0];
      const lastRow = sourceSheet.getLastRow();
      
      Logger.log('Source sheet last row: ' + lastRow);
      
      // Tìm dòng bắt đầu dữ liệu (tìm header)
      const dataStartRow = findDataStartRow_(sourceSheet);
      Logger.log('Data start row: ' + dataStartRow);
      
      if (lastRow < dataStartRow) {
        Logger.log('No data rows found in file');
        return;
      }
      
      // Đọc dữ liệu
      const numSourceCols = mapping.sourceColCount;
      const sourceData = sourceSheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, numSourceCols).getValues();
      Logger.log('Read ' + sourceData.length + ' rows from source');
      
      const rowsToAdd = [];
      const fileName = fileInfo.name.replace(/\.(xlsx|xlsm|xls)$/i, '');
      
      sourceData.forEach(function(row, rowIndex) {
        // Bỏ qua dòng trống (kiểm tra 3 cột đầu)
        if (!row[0] && !row[1] && !row[2]) {
          return;
        }
        
        // Tạo dòng mới theo mapping
        const newRow = new Array(mapping.targetColCount).fill('');
        
        // Map dữ liệu từ source sang target
        mapping.columnMap.forEach(function(map) {
          if (row[map.source] !== undefined && row[map.source] !== null) {
            newRow[map.target] = row[map.source];
          }
        });
        
        // Thêm nguồn data
        newRow[mapping.sourceDataCol] = fileName;
        
        // ⭐ MỚI: Thêm timestamp vào cột "Ngày cập nhật"
        const updateTime = Utilities.formatDate(
          new Date(), 
          Session.getScriptTimeZone(), 
          'yyyy-MM-dd HH:mm:ss'
        );
        newRow[mapping.updateTimeCol] = updateTime;
        
        // Kiểm tra trùng lặp
        if (!isDuplicateRow_(newRow, existingData)) {
          rowsToAdd.push(newRow);
          existingData.push(newRow); // Thêm vào để check duplicate cho các dòng tiếp theo
        }
      });
      
      Logger.log('Unique rows to add: ' + rowsToAdd.length);
      
      // Ghi dữ liệu vào sheet
      if (rowsToAdd.length > 0) {
        const nextRow = Math.max(targetSheet.getLastRow() + 1, 3);
        targetSheet.getRange(nextRow, 2, rowsToAdd.length, mapping.targetColCount).setValues(rowsToAdd);
        totalRowsAdded += rowsToAdd.length;
        Logger.log('Added ' + rowsToAdd.length + ' rows starting at row ' + nextRow);
        autoFillMMHLocation_(targetSheet, type, nextRow, rowsToAdd.length);
      }
      
    } catch (e) {
      Logger.log('ERROR processing file ' + fileInfo.name + ': ' + e.message);
      Logger.log('Stack: ' + e.stack);
    }
  });
  
  // Xóa dòng trùng lặp cuối cùng
  removeDuplicateRows_(targetSheet, 3, mapping.targetColCount);
  
  return totalRowsAdded;
}

/**
 * Mở hoặc convert file sang Google Sheets
 * @param {Object} fileInfo - Thông tin file
 * @returns {Spreadsheet|null} Spreadsheet object hoặc null nếu lỗi
 */
/**
 * Mở hoặc convert file sang Google Sheets
 * FIXED: Không dùng parents parameter
 */
function openOrConvertFile_(fileInfo) {
  try {
    const file = DriveApp.getFileById(fileInfo.id);
    const mimeType = file.getMimeType();
    
    Logger.log('Opening file: ' + fileInfo.name + ' | MimeType: ' + mimeType);
    
    // Nếu đã là Google Sheets
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      Logger.log('File is already Google Sheets');
      return SpreadsheetApp.openById(fileInfo.id);
    }
    
    // Nếu là Excel file, cần convert
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.ms-excel.sheet.macroEnabled.12') {
      
      Logger.log('Converting Excel to Google Sheets...');
      
      const blob = file.getBlob();
      
      // FIXED: Không dùng parents để tránh lỗi "File not found"
      const metadata = {
        title: 'CONVERTED_' + new Date().getTime() + '_' + file.getName(),
        mimeType: 'application/vnd.google-apps.spreadsheet'
      };
      
      const convertedFile = Drive.Files.insert(metadata, blob, { convert: true });
      Logger.log('Converted file ID: ' + convertedFile.id);
      
      return SpreadsheetApp.openById(convertedFile.id);
    }
    
    Logger.log('Unsupported file type: ' + mimeType);
    return null;
    
  } catch (e) {
    Logger.log('ERROR in openOrConvertFile_: ' + e.message);
    return null;
  }
}

/**
 * Tìm dòng bắt đầu dữ liệu (sau header)
 * @param {Sheet} sheet - Sheet nguồn
 * @returns {number} Số dòng bắt đầu dữ liệu
 */
function findDataStartRow_(sheet) {
  const lastRow = Math.min(sheet.getLastRow(), 20); // Kiểm tra tối đa 20 dòng đầu
  if (lastRow < 1) return 11; // Default
  
  const headerData = sheet.getRange(1, 1, lastRow, 5).getValues();
  
  // Tìm dòng header bằng keywords
  const headerKeywords = ['GÓI TIN', 'SỐ KẾ HOẠCH', 'TÊN DỰ ÁN', 'BÊN MỜI THẦU', 'STT', 'TT'];
  
  for (let i = 0; i < headerData.length; i++) {
    const row = headerData[i];
    const rowText = row.join(' ').toUpperCase();
    
    for (let j = 0; j < headerKeywords.length; j++) {
      if (rowText.includes(headerKeywords[j])) {
        Logger.log('Found header at row ' + (i + 1) + ': ' + rowText.substring(0, 50));
        return i + 2; // Dữ liệu bắt đầu sau header
      }
    }
  }
  
  // Default: dữ liệu từ dòng 11
  return 11;
}
/**
 * Mapping cấu trúc cột cho từng loại sheet
 * ⭐ ĐÃ BỔ SUNG CỘT "NGÀY CẬP NHẬT" 
 */
/**
 * ⭐⭐⭐ MAPPING HOÀN CHỈNH - VERIFIED 100% ⭐⭐⭐
 * Based on actual Excel file analysis
 */
function getColumnMapping_(type) {
  
  // ═══════════════════════════════════════════════════════════
  // 1. KQTT - KẾT QUẢ TRÚNG THẦU
  // ═══════════════════════════════════════════════════════════
  if (type === 'KQTT') {
    return {
      sheetName: SHEET_KQTT,
      sourceColCount: 10,      // Excel: A-J (10 cột)
      targetColCount: 17,      // Sheet: B-R (index 0-16)
      sourceDataCol: 15,       // Q (index 15) - Nguồn data
      updateTimeCol: 16,       // R (index 16) - Ngày cập nhật
      
      // ✅ MAPPING CHÍNH XÁC
      columnMap: [
        {source: 0, target: 2},   // Excel A (GÓI TIN) → Sheet D
        {source: 1, target: 3},   // Excel B (BÊN MỜI THẦU) → Sheet E
        {source: 2, target: 4},   // Excel C (TÊN DỰ ÁN) → Sheet F
        {source: 3, target: 5},   // Excel D (TÊN GÓI THẦU) → Sheet G
        {source: 4, target: 6},   // Excel E (SỐ THÔNG BÁO) → Sheet H
        {source: 5, target: 7},   // Excel F (HÌNH THỨC LỰA CHỌN) → Sheet I
        {source: 6, target: 8},   // Excel G (GIÁ GÓI THẦU) → Sheet J
        {source: 7, target: 9},   // Excel H (GIÁ TRÚNG THẦU) → Sheet K
        {source: 8, target: 10},  // Excel I (NHÀ THẦU TRÚNG THẦU) → Sheet L
        {source: 9, target: 11}   // Excel J (NGÀY PHÊ DUYỆT) → Sheet M
      ]
      
      // ❌ KHÔNG GHI: index 0, 1 (B, C - NĂM, THÁNG - CÔNG THỨC)
      // ❌ KHÔNG GHI: index 13, 14 (O, P - TỈNH THÀNH, KHU VỰC - CÔNG THỨC)
      // ⚠️ KHÔNG GHI: index 12 (N - ĐỊA BÀN MMH - Auto-fill sau)
      // ✅ GHI RIÊNG: index 15 (Q - NGUỒN DATA), index 16 (R - NGÀY CẬP NHẬT)
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // 2. KHLCNT - KẾ HOẠCH LỰA CHỌN NHÀ THẦU
  // ═══════════════════════════════════════════════════════════
  else if (type === 'KHLCNT') {
    return {
      sheetName: SHEET_KHLCNT,
      sourceColCount: 13,      // Excel: A-M (13 cột)
      targetColCount: 20,      // Sheet: B-U (index 0-19)
      sourceDataCol: 18,       // T (index 18) - Nguồn data
      updateTimeCol: 19,       // U (index 19) - Ngày cập nhật
      
      // ✅ MAPPING CHÍNH XÁC
      columnMap: [
        {source: 0, target: 2},   // Excel A (GÓI TIN) → Sheet D
        {source: 1, target: 3},   // Excel B (SỐ KẾ HOẠCH) → Sheet E
        {source: 2, target: 4},   // Excel C (TÊN DỰ ÁN) → Sheet F
        {source: 3, target: 5},   // Excel D (TÊN CHỦ ĐẦU TƯ) → Sheet G
        {source: 4, target: 6},   // Excel E (TỔNG MỨC ĐẦU TƯ) → Sheet H
        {source: 5, target: 7},   // Excel F (NỘI DUNG PHÊ DUYỆT) → Sheet I
        {source: 6, target: 8},   // Excel G (TÊN GÓI THẦU) → Sheet J
        {source: 7, target: 9},   // Excel H (NGUỒN VỐN) → Sheet K
        {source: 8, target: 10},  // Excel I (GIÁ GÓI THẦU) → Sheet L
        {source: 9, target: 11},  // Excel J (HÌNH THỨC LỰA CHỌN) → Sheet M
        {source: 10, target: 12}, // Excel K (HÌNH THỨC HỢP ĐỒNG) → Sheet N
        {source: 11, target: 13}, // Excel L (THỜI GIAN LỰA CHỌN) → Sheet O
        {source: 12, target: 14}  // Excel M (THỜI GIAN THỰC HIỆN) → Sheet P
      ]
      
      // ❌ KHÔNG GHI: index 0, 1 (B, C - NĂM, THÁNG - CÔNG THỨC)
      // ❌ KHÔNG GHI: index 16, 17 (R, S - TỈNH THÀNH, KHU VỰC - CÔNG THỨC)
      // ⚠️ KHÔNG GHI: index 15 (Q - ĐỊA BÀN MMH - Auto-fill sau)
      // ✅ GHI RIÊNG: index 18 (T - NGUỒN DATA), index 19 (U - NGÀY CẬP NHẬT)
    };
  }
  
  // ═══════════════════════════════════════════════════════════
  // 3. TBMT - THÔNG BÁO MỜI THẦU
  // ═══════════════════════════════════════════════════════════
  else if (type === 'TBMT') {
    return {
      sheetName: SHEET_TBMT,
      sourceColCount: 18,      // Excel: A-R (18 cột)
      targetColCount: 25,      // Sheet: B-Z (index 0-24)
      sourceDataCol: 23,       // Y (index 23) - Nguồn data
      updateTimeCol: 24,       // Z (index 24) - Ngày cập nhật
      
      // ✅ MAPPING CHÍNH XÁC
      columnMap: [
        {source: 0, target: 2},   // Excel A (GÓI TIN) → Sheet D
        {source: 1, target: 3},   // Excel B (BÊN MỜI THẦU) → Sheet E
        {source: 2, target: 4},   // Excel C (ĐỊA CHỈ BÊN MỜI THẦU) → Sheet F
        {source: 3, target: 5},   // Excel D (DỰ ÁN) → Sheet G
        {source: 4, target: 6},   // Excel E (GÓI THẦU) → Sheet H
        {source: 5, target: 7},   // Excel F (NỘI DUNG CHÍNH) → Sheet I
        {source: 6, target: 8},   // Excel G (NGUỒN VỐN) → Sheet J
        {source: 7, target: 9},   // Excel H (GIÁ GÓI THẦU) → Sheet K
        {source: 8, target: 10},  // Excel I (PHƯƠNG THỨC LỰA CHỌN) → Sheet L
        {source: 9, target: 11},  // Excel J (HÌNH THỨC LỰA CHỌN) → Sheet M
        {source: 10, target: 12}, // Excel K (THỜI GIAN PHÁT HÀNH) → Sheet N
        {source: 11, target: 13}, // Excel L (GIÁ BÁN 1 BỘ HSMT) → Sheet O
        {source: 12, target: 14}, // Excel M (BẢO ĐẢM DỰ THẦU) → Sheet P
        {source: 13, target: 15}, // Excel N (HÌNH THỨC BẢO ĐẢM) → Sheet Q
        {source: 14, target: 16}, // Excel O (ĐỊA ĐIỂM PHÁT HÀNH) → Sheet R
        {source: 15, target: 17}, // Excel P (THỜI GIAN ĐÓNG THẦU) → Sheet S
        {source: 16, target: 18}, // Excel Q (THỜI GIAN MỞ THẦU) → Sheet T
        {source: 17, target: 19}  // Excel R (THỜI GIAN THỰC HIỆN HĐ) → Sheet U
      ]
      
      // ❌ KHÔNG GHI: index 0, 1 (B, C - NĂM, THÁNG - CÔNG THỨC)
      // ❌ KHÔNG GHI: index 21, 22 (W, X - TỈNH THÀNH, KHU VỰC - CÔNG THỨC)
      // ⚠️ KHÔNG GHI: index 20 (V - ĐỊA BÀN MMH - Auto-fill sau)
      // ✅ GHI RIÊNG: index 23 (Y - NGUỒN DATA), index 24 (Z - NGÀY CẬP NHẬT)
    };
  }
  
  return null;
}
/**
 * Lấy mapping cột cho từng loại sheet
 * @param {string} type - Loại (KQTT, KHLCNT, TBMT)
 * @returns {Object} Mapping configuration
 */


/**
 * Lấy dữ liệu hiện có trong sheet để kiểm tra trùng lặp
 */
function getExistingSheetData_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  
  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(3, 2, lastRow - 2, lastCol - 1).getValues();
  
  return data;
}

/**
 * Kiểm tra dòng có trùng lặp không
 */
function isDuplicateRow_(newRow, existingData) {
  return existingData.some(function(existingRow) {
    // So sánh tất cả các cột
    return newRow.every(function(cell, index) {
      const existingCell = existingRow[index] || '';
      const newCell = cell || '';
      return String(existingCell).trim() === String(newCell).trim();
    });
  });
}

/**
 * Xóa các dòng trùng lặp trong sheet
 */
function removeDuplicateRows_(sheet, startRow, numCols) {
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  
  const data = sheet.getRange(startRow, 2, lastRow - startRow + 1, numCols).getValues();
  const uniqueRows = [];
  const seenRows = new Set();
  
  data.forEach(function(row) {
    const rowKey = row.map(function(cell) { 
      return String(cell || '').trim(); 
    }).join('|');
    
    if (!seenRows.has(rowKey)) {
      seenRows.add(rowKey);
      uniqueRows.push(row);
    }
  });
  
  // Nếu có dòng trùng lặp, xóa tất cả và ghi lại dữ liệu unique
  if (uniqueRows.length < data.length) {
    sheet.getRange(startRow, 2, data.length, numCols).clearContent();
    if (uniqueRows.length > 0) {
      sheet.getRange(startRow, 2, uniqueRows.length, numCols).setValues(uniqueRows);
    }
    Logger.log('Removed ' + (data.length - uniqueRows.length) + ' duplicate rows from ' + sheet.getName());
  }
}/**
 * DEBUG: Kiểm tra file đã tải và cấu trúc dữ liệu
 * Chạy function này từ Editor để xem logs
 */
function debugCheckDownloadedFiles() {
  Logger.log('=== DEBUG: Checking downloaded files ===');
  
  // Kiểm tra folder TBMT (vì bạn vừa tải TBMT)
  const folderId = FOLDERS.TBMT; // Thay đổi nếu cần test folder khác
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  
  let count = 0;
  while (files.hasNext() && count < 5) {
    const file = files.next();
    const fileName = file.getName();
    const fileId = file.getId();
    const mimeType = file.getMimeType();
    
    Logger.log('---');
    Logger.log('File: ' + fileName);
    Logger.log('ID: ' + fileId);
    Logger.log('MimeType: ' + mimeType);
    
    // Thử mở file
    try {
      let spreadsheet;
      
      if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        Logger.log('>> File is Google Sheets, opening directly...');
        spreadsheet = SpreadsheetApp.openById(fileId);
      } else {
        Logger.log('>> File is Excel, trying to convert...');
        
        // Convert xlsx to Google Sheets
        const blob = file.getBlob();
        const resource = {
          title: fileName + '_debug_converted',
          mimeType: MimeType.GOOGLE_SHEETS,
          parents: [{ id: folderId }]
        };
        
        const convertedFile = Drive.Files.insert(resource, blob, { convert: true });
        Logger.log('>> Converted file ID: ' + convertedFile.id);
        spreadsheet = SpreadsheetApp.openById(convertedFile.id);
        
        // Xóa file convert sau khi test
        // DriveApp.getFileById(convertedFile.id).setTrashed(true);
      }
      
      if (spreadsheet) {
        const sheet = spreadsheet.getSheets()[0];
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        
        Logger.log('>> Sheet name: ' + sheet.getName());
        Logger.log('>> Last row: ' + lastRow);
        Logger.log('>> Last col: ' + lastCol);
        
        // Đọc 15 dòng đầu để xem cấu trúc
        if (lastRow > 0) {
          const previewData = sheet.getRange(1, 1, Math.min(15, lastRow), Math.min(10, lastCol)).getValues();
          Logger.log('>> Preview first 15 rows:');
          previewData.forEach((row, idx) => {
            const rowStr = row.map(cell => String(cell).substring(0, 30)).join(' | ');
            Logger.log('   Row ' + (idx + 1) + ': ' + rowStr);
          });
        }
      }
      
    } catch (e) {
      Logger.log('>> ERROR: ' + e.message);
      Logger.log('>> Stack: ' + e.stack);
    }
    
    count++;
  }
  
  Logger.log('=== END DEBUG ===');
}
/**
 * DEBUG: Test convert một file xlsx sang Google Sheets
 * Chạy function này trước để kiểm tra convert có hoạt động không
 */
function testConvertSingleFile() {
  const TEST_FILE_ID = '1aEMheNAUjMwcry8CICTczsudtRgOVfZC'; // File TBMT từ log
  
  Logger.log('=== TEST CONVERT ===');
  
  try {
    const file = DriveApp.getFileById(TEST_FILE_ID);
    Logger.log('File name: ' + file.getName());
    
    const blob = file.getBlob();
    Logger.log('Blob size: ' + blob.getBytes().length + ' bytes');
    
    // Convert KHÔNG dùng parents
    const metadata = {
      title: 'TEST_CONVERT_' + new Date().getTime(),
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };
    
    const newFile = Drive.Files.insert(metadata, blob, { convert: true });
    Logger.log('SUCCESS! New file ID: ' + newFile.id);
    
    // Đọc thử
    const ss = SpreadsheetApp.openById(newFile.id);
    const sheet = ss.getSheets()[0];
    Logger.log('Last row: ' + sheet.getLastRow());
    
    // Preview 15 dòng đầu
    if (sheet.getLastRow() > 0) {
      const preview = sheet.getRange(1, 1, Math.min(15, sheet.getLastRow()), Math.min(8, sheet.getLastColumn())).getValues();
      preview.forEach((row, i) => {
        Logger.log('Row ' + (i+1) + ': ' + row.map(c => String(c).substring(0,25)).join(' | '));
      });
    }
    
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
  
  Logger.log('=== END TEST ===');
}
/********************************************************************
 * 5. MMH ACCOUNT MANAGEMENT FUNCTIONS
 ********************************************************************/

/**
 * Lấy danh sách MMH Account từ sheet "Master" cột C
 * @returns {Array} Danh sách MMH Account names
 */
function getMMHAccountList() {
  try {
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) {
      Logger.log('Sheet "Master" not found');
      return [];
    }
    
    const lastRow = masterSheet.getLastRow();
    if (lastRow < 3) return [];
    
    // Lấy data từ C3 đến C cuối
    const data = masterSheet.getRange(3, 3, lastRow - 2, 1).getValues();
    
    // Lọc các giá trị không rỗng và unique
    const uniqueAccounts = [];
    const seen = new Set();
    
    data.forEach(function(row) {
      const val = row[0];
      if (val && String(val).trim() !== '') {
        const trimmed = String(val).trim();
        if (!seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          uniqueAccounts.push(trimmed);
        }
      }
    });
    
    // Sắp xếp theo alphabet
    uniqueAccounts.sort(function(a, b) {
      return a.localeCompare(b, 'vi');
    });
    
    Logger.log('Found ' + uniqueAccounts.length + ' MMH accounts');
    return uniqueAccounts;
    
  } catch (e) {
    Logger.log('Error in getMMHAccountList: ' + e.message);
    return [];
  }
}

/**
 * Xác nhận và điền MMH Account vào các sheet
 * @param {string} selectedAccount - Tên account đã chọn từ danh sách bên trái
 * @param {string} mmhAccount - Tên MMH Account để điền vào
 * @returns {Object} Kết quả với số dòng đã cập nhật
 */
function confirmMMHAccount(selectedAccount, mmhAccount) {
  try {
    Logger.log('=== START confirmMMHAccount ===');
    Logger.log('Selected Account: ' + selectedAccount);
    Logger.log('MMH Account: ' + mmhAccount);
    
    if (!selectedAccount || !mmhAccount) {
      return { success: false, message: 'Missing account information', updated: { KQTT: 0, KHLCNT: 0, TBMT: 0 } };
    }
    
    const ss = SpreadsheetApp.getActive();
    const result = { KQTT: 0, KHLCNT: 0, TBMT: 0 };
    
    // 1. Cập nhật sheet "Kết quả trúng thầu" - Cột E (owner), Cột N (MMH)
    const sheetKQTT = ss.getSheetByName(SHEET_KQTT);
    if (sheetKQTT) {
      result.KQTT = updateMMHColumn_(sheetKQTT, 5, 14, selectedAccount, mmhAccount); // E=5, N=14
      Logger.log('KQTT updated: ' + result.KQTT + ' rows');
    }
    
    // 2. Cập nhật sheet "Kế hoạch lựa chọn nhà thầu" - Cột G (owner), Cột Q (MMH)
    const sheetKHLCNT = ss.getSheetByName(SHEET_KHLCNT);
    if (sheetKHLCNT) {
      result.KHLCNT = updateMMHColumn_(sheetKHLCNT, 7, 17, selectedAccount, mmhAccount); // G=7, Q=17
      Logger.log('KHLCNT updated: ' + result.KHLCNT + ' rows');
    }
    
    // 3. Cập nhật sheet "Thông báo mời thầu" - Cột E (owner), Cột V (MMH)
    const sheetTBMT = ss.getSheetByName(SHEET_TBMT);
    if (sheetTBMT) {
      result.TBMT = updateMMHColumn_(sheetTBMT, 5, 22, selectedAccount, mmhAccount); // E=5, V=22
      Logger.log('TBMT updated: ' + result.TBMT + ' rows');
    }
    
    const totalUpdated = result.KQTT + result.KHLCNT + result.TBMT;
    
    Logger.log('=== END confirmMMHAccount ===');
    Logger.log('Total updated: ' + totalUpdated);
    
    return { 
      success: true, 
      message: 'Updated ' + totalUpdated + ' rows successfully',
      updated: result 
    };
    
  } catch (e) {
    Logger.log('Error in confirmMMHAccount: ' + e.message);
    return { success: false, message: 'Error: ' + e.message, updated: { KQTT: 0, KHLCNT: 0, TBMT: 0 } };
  }
}

/**
 * Helper: Cập nhật cột MMH trong một sheet
 * @param {Sheet} sheet - Sheet cần cập nhật
 * @param {number} ownerCol - Số cột chứa tên owner (1-indexed)
 * @param {number} mmhCol - Số cột MMH cần điền (1-indexed)
 * @param {string} ownerName - Tên owner cần tìm
 * @param {string} mmhValue - Giá trị MMH cần điền
 * @returns {number} Số dòng đã cập nhật
 */
function updateMMHColumn_(sheet, ownerCol, mmhCol, ownerName, mmhValue) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return 0;
  
  // Lấy dữ liệu cột owner
  const ownerData = sheet.getRange(3, ownerCol, lastRow - 2, 1).getValues();
  
  let updatedCount = 0;
  const ownerNameLower = String(ownerName).trim().toLowerCase();
  
  for (let i = 0; i < ownerData.length; i++) {
    const cellValue = ownerData[i][0];
    if (cellValue && String(cellValue).trim().toLowerCase() === ownerNameLower) {
      // Điền MMH Account vào cột tương ứng
      sheet.getRange(i + 3, mmhCol).setValue(mmhValue);
      updatedCount++;
    }
  }
  
  return updatedCount;
}

/**
 * Cập nhật danh sách MMH Account từ file external
 * @returns {Object} Kết quả với số account đã thêm
 */
function updateMMHAccountListFromExternal() {
  try {
    Logger.log('=== START updateMMHAccountListFromExternal ===');
    
    const EXTERNAL_FILE_ID = '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g';
    const EXTERNAL_SHEET_NAME = 'Customer list';
    
    // Mở file external
    const externalSS = SpreadsheetApp.openById(EXTERNAL_FILE_ID);
    const externalSheet = externalSS.getSheetByName(EXTERNAL_SHEET_NAME);
    
    if (!externalSheet) {
      return { success: false, message: 'Cannot find sheet "Customer list" in external file', added: 0 };
    }
    
    const externalLastRow = externalSheet.getLastRow();
    if (externalLastRow < 7) {
      return { success: false, message: 'No data in external file', added: 0 };
    }
    
    // Lấy data từ C7:C của file external
    const externalData = externalSheet.getRange(7, 3, externalLastRow - 6, 1).getValues();
    Logger.log('External data rows: ' + externalData.length);
    
    // Lấy data hiện có từ sheet Master
    const ss = SpreadsheetApp.getActive();
    const masterSheet = ss.getSheetByName('Master');
    
    if (!masterSheet) {
      return { success: false, message: 'Cannot find sheet "Master"', added: 0 };
    }
    
    const masterLastRow = masterSheet.getLastRow();
    let existingAccounts = new Set();
    
    if (masterLastRow >= 3) {
      const existingData = masterSheet.getRange(3, 3, masterLastRow - 2, 1).getValues();
      existingData.forEach(function(row) {
        if (row[0] && String(row[0]).trim() !== '') {
          existingAccounts.add(String(row[0]).trim().toLowerCase());
        }
      });
    }
    
    Logger.log('Existing accounts: ' + existingAccounts.size);
    
    // Tìm các account mới (không duplicate)
    const newAccounts = [];
    externalData.forEach(function(row) {
      const val = row[0];
      if (val && String(val).trim() !== '') {
        const trimmed = String(val).trim();
        if (!existingAccounts.has(trimmed.toLowerCase())) {
          newAccounts.push([trimmed]);
          existingAccounts.add(trimmed.toLowerCase()); // Tránh duplicate trong batch hiện tại
        }
      }
    });
    
    Logger.log('New accounts to add: ' + newAccounts.length);
    
    // Thêm các account mới vào cuối cột C sheet Master
    if (newAccounts.length > 0) {
      const nextRow = Math.max(masterLastRow + 1, 3);
      masterSheet.getRange(nextRow, 3, newAccounts.length, 1).setValues(newAccounts);
    }
    
    Logger.log('=== END updateMMHAccountListFromExternal ===');
    
    return { 
      success: true, 
      message: 'Added ' + newAccounts.length + ' new accounts to MMH list',
      added: newAccounts.length 
    };
    
  } catch (e) {
    Logger.log('Error in updateMMHAccountListFromExternal: ' + e.message);
    return { success: false, message: 'Error: ' + e.message, added: 0 };
  }
}
/********************************************************************
 * 6. ADVANCED PDF EXPORT FUNCTIONS
 * Thêm vào cuối file code gốc
 ********************************************************************/

const EXTERNAL_FILE_ID = '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g';

/**
 * Lấy dữ liệu từ file external cho PDF export
 * @param {string} mmhAccountName - Tên MMH Account đã xác nhận
 * @param {string} monthFrom - Tháng bắt đầu (YYYYMM format)
 * @param {string} monthTo - Tháng kết thúc (YYYYMM format)
 * @param {Object} options - Các tùy chọn (includeSalesHistory, includeAreaInfo, productType)
 * @returns {Object} Dữ liệu cho PDF
 */
function getExternalDataForPDF(mmhAccountName, monthFrom, monthTo, options) {
  try {
    Logger.log('=== START getExternalDataForPDF ===');
    Logger.log('MMH Account: ' + mmhAccountName);
    Logger.log('Month range: ' + monthFrom + ' - ' + monthTo);
    Logger.log('Options: ' + JSON.stringify(options));
    
    const externalSS = SpreadsheetApp.openById(EXTERNAL_FILE_ID);
    const result = {
      salesHistory: null,
      weekAccount: null,
      cbc: null,
      accountInfo: null,
      productPresentation: null
    };
    
    // 1. Lấy Lịch sử trúng thầu
    if (options.includeSalesHistory) {
      result.salesHistory = getSalesHistoryData_(externalSS, mmhAccountName);
      Logger.log('✅ Sales History loaded: ' + (result.salesHistory ? result.salesHistory.rows.length : 0) + ' rows');
    }
    
    // 2. Lấy Thông tin địa bàn
    if (options.includeAreaInfo) {
      // 2.1 WEEK-Account
      result.weekAccount = getWeekAccountData_(externalSS, mmhAccountName, monthFrom, monthTo);
      Logger.log('✅ WEEK-Account loaded: ' + (result.weekAccount ? result.weekAccount.rows.length : 0) + ' rows');
      
      // 2.2 CBC
      result.cbc = getCBCData_(externalSS, mmhAccountName);
      Logger.log('✅ CBC loaded: ' + (result.cbc ? result.cbc.rows.length : 0) + ' rows');
      
      // 2.3 Account Info
      result.accountInfo = getAccountInfoData_(externalSS, mmhAccountName);
      Logger.log('✅ Account Info loaded: ' + (result.accountInfo ? 'YES' : 'NO'));
      
      // 2.4 Product Presentation - QUAN TRỌNG
      result.productPresentation = getProductPresentationData_(externalSS, mmhAccountName, monthFrom, monthTo);
      Logger.log('✅ Product Presentation loaded: ' + (result.productPresentation ? result.productPresentation.count : 0) + ' rows');
    }
    
    Logger.log('=== END getExternalDataForPDF ===');
    return { success: true, data: result };
    
  } catch (e) {
    Logger.log('❌ ERROR in getExternalDataForPDF: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return { success: false, message: e.message, data: null };
  }
}

/**
 * Lấy dữ liệu Lịch sử trúng thầu từ sheet "Customer sales record"
 * Mapping: C=Account name, I=Năm, K=Tên gói thầu, L=Nhà thầu trúng thầu,
 *          Q=Hãng sx, U=Loại sản phẩm, N=Mã sản phẩm, O=Số lượng, S=Giá trúng thầu
 */
/**
 * Lấy dữ liệu Lịch sử trúng thầu từ sheet "Tender Data"
 * CẬP NHẬT: Thay đổi tên sheet và mapping cột theo bố cục mới
 * @param {Spreadsheet} ss - Spreadsheet object
 * @param {string} accountName - Tên địa bàn cần lọc
 * @returns {Object} Dữ liệu rows và summary
 */
function getSalesHistoryData_(ss, accountName) {
  // ✅ CẬP NHẬT: Tên sheet mới
  const sheet = ss.getSheetByName('Tender Data');
  if (!sheet) {
    Logger.log('Sheet "Tender Data" not found');
    return { rows: [], summary: {} };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], summary: {} };
  
  // Lấy tất cả data (giả sử header ở dòng 1)
  // Đọc 21 cột (A-U) để bao gồm tất cả dữ liệu cần thiết
  const data = sheet.getRange(2, 1, lastRow - 1, 21).getValues();
  
  const rows = [];
  const yearSet = new Set();
  const uniquePackagesByYearProduct = {}; // { "2025|Knife": Set of package names }
  const summaryByYearProductContractor = {}; // { "2025|Knife|Công ty A": totalQty }
  
  const accountNameLower = String(accountName).trim().toLowerCase();
  
  data.forEach(function(row) {
    // ✅ CẬP NHẬT: Cột H (index 7) - Tên địa bàn
    const cellH = row[7];
    if (!cellH || String(cellH).trim().toLowerCase() !== accountNameLower) return;
    
    // ✅ CẬP NHẬT: Mapping cột mới
    const year = row[3] || '';          // D: Năm (index 3)
    const packageName = row[8] || '';   // I: Tên gói thầu (index 8)
    const contractor = row[12] || '';   // M: Nhà thầu trúng thầu (index 12)
    const manufacturer = row[16] || ''; // Q: Hãng sx (index 16)
    const productType = row[13] || '';  // N: Loại sản phẩm (index 14)
    const productCode = row[15] || '';  // P: Mã sản phẩm (index 15)
    const quantity = parseFloat(row[18]) || 0; // S: Số lượng (index 18)
    const winPrice = row[20] || '';     // U: Giá trúng thầu (index 20)
    
    if (year) yearSet.add(String(year));
    
    // Đếm unique package theo năm và loại SP
    const yearProductKey = year + '|' + productType;
    if (!uniquePackagesByYearProduct[yearProductKey]) {
      uniquePackagesByYearProduct[yearProductKey] = new Set();
    }
    if (packageName && String(packageName).trim() !== '') {
      uniquePackagesByYearProduct[yearProductKey].add(String(packageName).trim());
    }
    
    // Summary key cho tổng số lượng
    const summaryKey = year + '|' + productType + '|' + contractor;
    if (!summaryByYearProductContractor[summaryKey]) {
      summaryByYearProductContractor[summaryKey] = { 
        year: year, 
        productType: productType, 
        contractor: contractor, 
        totalQty: 0 
      };
    }
    summaryByYearProductContractor[summaryKey].totalQty += quantity;
    
    rows.push({
      year: year,
      packageName: packageName,
      contractor: contractor,
      manufacturer: manufacturer,
      productType: productType,
      productCode: productCode,
      quantity: quantity,
      winPrice: winPrice
    });
  });
  
  // === Tính tổng số gói thầu unique theo năm và loại SP ===
  const packageCountByYearProduct = [];
  for (var key in uniquePackagesByYearProduct) {
    const parts = key.split('|');
    const year = parts[0];
    const productType = parts[1] || 'Không xác định';
    const uniqueCount = uniquePackagesByYearProduct[key].size;
    
    if (uniqueCount > 0) {
      packageCountByYearProduct.push({
        year: year,
        productType: productType,
        count: uniqueCount
      });
    }
  }
  
  // Sort theo năm giảm dần, rồi theo productType
  packageCountByYearProduct.sort(function(a, b) {
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    return (a.productType || '').localeCompare(b.productType || '', 'vi');
  });
  
  // === Tính tổng số lượng sản phẩm theo năm, loại SP, nhà thầu ===
  const qtyByYearProductContractor = Object.values(summaryByYearProductContractor);
  
  // Sort: năm giảm dần, rồi theo productType giống nhau trước, rồi theo contractor
  qtyByYearProductContractor.sort(function(a, b) {
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    
    const productDiff = (a.productType || '').localeCompare(b.productType || '', 'vi');
    if (productDiff !== 0) return productDiff;
    
    return (a.contractor || '').localeCompare(b.contractor || '', 'vi');
  });
  
  // === Sort rows theo năm giảm dần ===
  rows.sort(function(a, b) {
    const yearDiff = parseInt(b.year) - parseInt(a.year);
    if (yearDiff !== 0) return yearDiff;
    
    const productDiff = (a.productType || '').localeCompare(b.productType || '', 'vi');
    if (productDiff !== 0) return productDiff;
    
    return (a.contractor || '').localeCompare(b.contractor || '', 'vi');
  });
  
  // Tính tổng unique packages
  let totalUniquePackages = 0;
  packageCountByYearProduct.forEach(function(item) {
    totalUniquePackages += item.count;
  });
  
  // Tạo summary
  const summary = {
    totalPackages: totalUniquePackages,
    years: Array.from(yearSet).sort(function(a, b) { return parseInt(b) - parseInt(a); }),
    packageCountByYearProduct: packageCountByYearProduct,
    byYearProductContractor: qtyByYearProductContractor
  };
  
  Logger.log('Sales history: ' + rows.length + ' rows, unique packages: ' + totalUniquePackages);
  return { rows: rows, summary: summary };
}

/**
 * Lấy dữ liệu từ sheet "WEEK- Account"
 * Mapping: C=Account name, F=Month (YYYYMM), D=PIC, H=Hành động, J=Cập nhật, K=Ngày bắt đầu
 */
function getWeekAccountData_(ss, accountName, monthFrom, monthTo) {
  const sheet = ss.getSheetByName('WEEK- Account');
  if (!sheet) {
    Logger.log('Sheet "WEEK- Account" not found');
    return { rows: [], summary: {}, latestUpdate: null };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], summary: {}, latestUpdate: null };
  
  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues(); // A-K = 11 cột
  
  const rows = [];
  const actionCount = {};
  let latestRow = null;
  let latestDate = null;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const accountNameLower = String(accountName).trim().toLowerCase();
  const mFrom = parseInt(monthFrom) || 0;
  const mTo = parseInt(monthTo) || 999999;
  
  data.forEach(function(row) {
    const cellC = row[2]; // C: Account name (index 2)
    if (!cellC || String(cellC).trim().toLowerCase() !== accountNameLower) return;
    
    const monthVal = parseInt(row[5]) || 0; // F: Month YYYYMM (index 5)
    
    // Kiểm tra trong khoảng thời gian
    if (monthVal < mFrom || monthVal > mTo) return;
    
    const pic = row[3] || '';           // D: PIC (index 3)
    const action = row[7] || '';        // H: Hành động (index 7)
    const plan = row[8] || '';          // I: Kế hoạch (index 8) - MỚI
    const update = row[9] || '';        // J: Cập nhật (index 9)
    const startDateRaw = row[10];       // K: Ngày bắt đầu (index 10)
    
    // Parse ngày
    let startDate = null;
    let startDateFormatted = '';
    if (startDateRaw instanceof Date) {
      startDate = startDateRaw;
      startDateFormatted = Utilities.formatDate(startDateRaw, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    } else if (startDateRaw) {
      startDateFormatted = String(startDateRaw);
      // Parse dd/mm/yyyy
      const parts = String(startDateRaw).split('/');
      if (parts.length === 3) {
        startDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    
    // Đếm hành động
    if (action) {
      const actionStr = String(action).trim();
      actionCount[actionStr] = (actionCount[actionStr] || 0) + 1;
    }
    
    // Tìm cập nhật gần nhất (ngày <= hôm nay và có nội dung cập nhật)
    if (startDate && startDate <= today && update && String(update).trim() !== '') {
      if (!latestDate || startDate > latestDate) {
        latestDate = startDate;
        latestRow = {
          pic: pic,
          action: action,
          plan: plan,
          update: update,
          startDate: startDateFormatted
        };
      }
    }
    
    // Thêm vào danh sách rows (để hiển thị bảng)
    rows.push({
      pic: pic,
      action: action,
      plan: plan,          // MỚI
      update: update,
      startDate: startDateFormatted
    });
  });
  
  // Sort rows theo ngày giảm dần
  rows.sort(function(a, b) {
    const parseDate = function(dateStr) {
      if (!dateStr) return new Date(0);
      const parts = String(dateStr).split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(0);
    };
    return parseDate(b.startDate) - parseDate(a.startDate);
  });
  
  Logger.log('WEEK-Account: ' + rows.length + ' rows in date range');
  
  return {
    rows: rows,
    summary: {
      totalVisits: rows.length,
      pic: rows.length > 0 ? rows[0].pic : '',
      actionBreakdown: actionCount
    },
    latestUpdate: latestRow
  };
}

/**
 * Lấy dữ liệu từ sheet "CBC" (Key Stakeholder)
 * Mapping: C=Account name, A=Tên Keystakeholder, H=Chuyên môn, J=Chức vụ,
 *          K=Vai trò, L=Tầm ảnh hưởng, M=Độ tin tưởng, N=Cập nhật
 */
function getCBCData_(ss, accountName) {
  const sheet = ss.getSheetByName('CBC');
  if (!sheet) {
    Logger.log('Sheet "CBC" not found');
    return { rows: [], total: 0 };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { rows: [], total: 0 };
  
  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues(); // A-N = 14 cột
  
  const rows = [];
  const accountNameLower = String(accountName).trim().toLowerCase();
  
  data.forEach(function(row) {
    const cellC = row[2]; // C: Account name (index 2)
    if (!cellC || String(cellC).trim().toLowerCase() !== accountNameLower) return;
    
    rows.push({
      name: row[5] || '',           // F: Tên Keystakeholder (index 0)
      expertise: row[7] || '',      // H: Chuyên môn (index 7)
      position: row[9] || '',       // J: Chức vụ (index 9)
      role: row[10] || '',          // K: Vai trò (index 10)
      influence: row[11] || '',     // L: Tầm ảnh hưởng (index 11)
      trust: row[12] || '',         // M: Độ tin tưởng (index 12)
      update: row[13] || ''         // N: Cập nhật (index 13)
    });
  });
  
  // Sắp xếp theo chức vụ: Giám đốc > Phó giám đốc > Trưởng > Phó > Others
  rows.sort(function(a, b) {
    return getPositionPriority_(a.position) - getPositionPriority_(b.position);
  });
  
  Logger.log('CBC: ' + rows.length + ' key stakeholders');
  return { rows: rows, total: rows.length };
}

/**
 * Helper: Xác định độ ưu tiên của chức vụ
 */
function getPositionPriority_(position) {
  const pos = String(position).toLowerCase();
  
  // Giám đốc (không phải Phó) = highest priority
  if (pos.indexOf('giám đốc') >= 0 && pos.indexOf('phó') < 0) return 1;
  
  // Phó giám đốc
  if (pos.indexOf('phó giám đốc') >= 0) return 2;
  
  // Có chữ "Trưởng"
  if (pos.indexOf('trưởng') >= 0) return 3;
  
  // Có chữ "Phó" (không phải Phó giám đốc)
  if (pos.indexOf('phó') >= 0) return 4;
  
  // Others
  return 5;
}
/**
 * Lấy dữ liệu từ sheet "Product Presentation"
 * Data bắt đầu từ DÒNG 6
 * Mapping: C=Account, D=PIC, I=Tháng, J=Ngày, K=File đào tạo, L=Kế hoạch & Kết quả
 */
/**
 * Lấy dữ liệu từ sheet "Product Presentation" - FIX HYPERLINK
 */
/**
 * Lấy dữ liệu từ sheet "Product Presentation" - FIX CHIP LINK
 * Xử lý cả Rich Text Link VÀ Formula HYPERLINK
 */
function getProductPresentationData_(ss, accountName, monthFrom, monthTo) {
  const sheet = ss.getSheetByName('Product Presentation');
  if (!sheet) {
    Logger.log('❌ Sheet "Product Presentation" not found');
    return { rows: [], count: 0 };
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 6) return { rows: [], count: 0 };
  
  const COL_ACCOUNT = 3;
  const COL_PIC = 4;
  const COL_MONTH = 9;
  const COL_DATE = 10;
  const COL_TRAINING = 11;
  const COL_PLAN_RESULT = 12;
  
  const numRows = lastRow - 5;
  const data = sheet.getRange(6, 1, numRows, 12).getValues();
  
  // Đọc CẢ rich text VÀ formula
  const trainingRange = sheet.getRange(6, COL_TRAINING, numRows, 1);
  const trainingRichTexts = trainingRange.getRichTextValues();
  const trainingFormulas = trainingRange.getFormulas();
  
  const rows = [];
  const accountNameLower = String(accountName).trim().toLowerCase();
  const mFrom = parseInt(monthFrom) || 0;
  const mTo = parseInt(monthTo) || 999999;
  
  Logger.log('🔎 Filtering for account: "' + accountName + '"');
  Logger.log('📅 Month range: ' + monthFrom + ' - ' + monthTo);
  
  data.forEach(function(row, index) {
    const cellAccount = row[COL_ACCOUNT - 1];
    if (!cellAccount || String(cellAccount).trim().toLowerCase() !== accountNameLower) return;
    
    const monthVal = parseInt(row[COL_MONTH - 1]) || 0;
    if (monthVal < mFrom || monthVal > mTo) return;
    
    const pic = row[COL_PIC - 1] || '';
    const dateRaw = row[COL_DATE - 1];
    const trainingFile = row[COL_TRAINING - 1] || '';
    const planResult = row[COL_PLAN_RESULT - 1] || '';
    
    let dateFormatted = '';
    if (dateRaw instanceof Date) {
      dateFormatted = Utilities.formatDate(dateRaw, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    } else if (dateRaw) {
      dateFormatted = String(dateRaw);
    }
    
    // ========================================
    // EXTRACT HYPERLINK - 3 PHƯƠNG PHÁP
    // ========================================
    let trainingLink = '';
    let trainingText = String(trainingFile);
    
    // 🔍 PHƯƠNG PHÁP 1: Rich Text Link (cho hyperlink thông thường)
    try {
      const richText = trainingRichTexts[index][0];
      if (richText) {
        const link = richText.getLinkUrl();
        if (link) {
          trainingLink = link;
          trainingText = richText.getText() || extractFolderNameFromUrl_(link);
          Logger.log('  ✅ RichText Link found: ' + trainingText);
        }
      }
    } catch (e) {
      // Ignore error, try next method
    }
    
    // 🔍 PHƯƠNG PHÁP 2: Formula HYPERLINK (cho chip link)
    if (!trainingLink) {
      try {
        const formula = trainingFormulas[index][0];
        if (formula) {
          // Match cả 2 format: =HYPERLINK("url","text") và =HYPERLINK("url")
          const match = formula.match(/=HYPERLINK\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?\s*\)/i);
          if (match) {
            trainingLink = match[1];
            trainingText = match[2] || extractFolderNameFromUrl_(trainingLink);
            Logger.log('  ✅ Formula Link found: ' + trainingText);
          }
        }
      } catch (e) {
        // Ignore error, try next method
      }
    }
    
    // 🔍 PHƯƠNG PHÁP 3: Direct URL (nếu cell chứa URL trực tiếp)
    if (!trainingLink && trainingFile && String(trainingFile).startsWith('http')) {
      trainingLink = String(trainingFile);
      trainingText = extractFolderNameFromUrl_(trainingLink);
      Logger.log('  ✅ Direct URL found: ' + trainingLink);
    }
    
    // 🔍 PHƯƠNG PHÁP 4: Check xem text có chứa URL không
    if (!trainingLink) {
      const urlMatch = String(trainingFile).match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        trainingLink = urlMatch[1];
        trainingText = extractFolderNameFromUrl_(trainingLink);
        Logger.log('  ✅ Embedded URL found: ' + trainingLink);
      }
    }
    
    Logger.log('📝 Final result for row ' + (index + 6) + ':');
    Logger.log('   Text: ' + trainingText);
    Logger.log('   Link: ' + (trainingLink || 'NO LINK'));
    
    rows.push({
      pic: pic,
      date: dateFormatted,
      trainingFile: trainingText,
      trainingLink: trainingLink,
      planResult: planResult
    });
  });
  
  Logger.log('📦 Total Product Presentation rows: ' + rows.length);
  
  return {
    rows: rows,
    count: rows.length
  };
}

/**
 * Extract tên folder/file từ Google Drive URL
 */
function extractFolderNameFromUrl_(url) {
  if (!url) return '';
  
  try {
    // Extract folder ID
    let match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const folderId = match[1];
      try {
        const folder = DriveApp.getFolderById(folderId);
        return folder.getName();
      } catch (e) {
        Logger.log('⚠️ Cannot access folder: ' + folderId);
        return url;
      }
    }
    
    // Extract file ID from various formats
    match = url.match(/[-\w]{25,}/);
    if (match) {
      const fileId = match[0];
      try {
        const file = DriveApp.getFileById(fileId);
        return file.getName();
      } catch (e) {
        Logger.log('⚠️ Cannot access file: ' + fileId);
        return url;
      }
    }
  } catch (e) {
    Logger.log('⚠️ Error extracting name from URL: ' + e.message);
  }
  
  // Fallback: trả về URL gốc
  return url;
}



/**
 * Lấy dữ liệu từ sheet "Account Info"
 * Mapping: C=Account name, F=Đánh giá tiềm năng, G=Thông tin tổng quan,
 *          H=Phân tích tình hình, I=Mục tiêu, J=Chiến lược, K=Hành động chính, L=Sản phẩm mục tiêu
 */
function getAccountInfoData_(ss, accountName) {
  const sheet = ss.getSheetByName('Account Info');
  if (!sheet) {
    Logger.log('Sheet "Account Info" not found');
    return null;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  
  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues(); // A-L = 12 cột
  
  const accountNameLower = String(accountName).trim().toLowerCase();
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    const cellC = row[2]; // C: Account name (index 2)
    if (cellC && String(cellC).trim().toLowerCase() === accountNameLower) {
      Logger.log('Account Info found for: ' + accountName);
      return {
        potential: row[5] || '',        // F: Đánh giá tiềm năng (index 5)
        overview: row[6] || '',         // G: Thông tin tổng quan (index 6)
        analysis: row[7] || '',         // H: Phân tích tình hình địa bàn (index 7)
        objective: row[8] || '',        // I: Mục tiêu (index 8)
        strategy: row[9] || '',         // J: Chiến lược (index 9)
        mainAction: row[10] || '',      // K: Hành động chính (index 10)
        targetProduct: row[11] || ''    // L: Sản phẩm mục tiêu (index 11)
      };
    }
  }
  
  Logger.log('Account Info NOT found for: ' + accountName);
  return null;
}

/**
 * Tạo và gửi PDF nâng cao
 */
function generateAdvancedPDF(payload) {
  try {
    Logger.log('=== START generateAdvancedPDF ===');
    Logger.log('Account: ' + payload.accountName);
    
    const userEmail = Session.getActiveUser().getEmail();
    const subject = '[Thông tin địa bàn] ' + payload.accountName;
    
    // Tạo HTML content cho PDF
    const htmlBody = createAdvancedReportHtml_(payload);
    
    // Convert to PDF
    const blob = Utilities.newBlob(htmlBody, 'text/html', 'Report.html');
    const monthFrom = payload.filter.dateFrom || 'N/A';
const monthTo = payload.filter.dateTo || 'N/A';
const pdfName = 'Thông tin địa bàn _ ' + payload.accountName + '_Từ ' + monthFrom + ' đến ' + monthTo + '.pdf';
const pdf = blob.getAs('application/pdf').setName(pdfName);
    
    // Gửi email
    GmailApp.sendEmail(mmhAddr_(userEmail), subject,
      'Please find the attached Account report for: ' + payload.accountName,
      { attachments: [pdf] }
    );
    
    Logger.log('PDF sent to: ' + userEmail);
    Logger.log('=== END generateAdvancedPDF ===');
    return { success: true, message: 'Report sent to: ' + userEmail };
    
  } catch (e) {
    Logger.log('ERROR in generateAdvancedPDF: ' + e.message);
    return { success: false, message: 'Error: ' + e.message };
  }
}

/**
 * Tạo HTML cho PDF nâng cao
 */
/**
 * Parse stakeholder info từ text update
 * @param {string} updateText - Nội dung cột J (update)
 * @returns {Array} Danh sách stakeholder được extract
 */
function parseStakeholdersFromUpdate_(updateText) {
  if (!updateText || String(updateText).indexOf('Expected Contact Person:') === -1) {
    return [];
  }
  
  const text = String(updateText);
  const stakeholders = [];
  
  // Tìm section Expected Contact Person
  const match = text.match(/Expected Contact Person:([\s\S]*?)(?=Actions Taken:|Current Situation:|$)/);
  if (!match) return [];
  
  const stakeholderSection = match[1].trim();
  
  // Split thành các stakeholder (phân tách bởi pattern "Tên - Chức vụ")
  const lines = stakeholderSection.split('\n');
  let currentStakeholder = null;
  
  for (var i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if this is a name line (contains " - " and not starting with "Role:" or "Influence:")
    if (line.indexOf(' - ') > 0 && !line.startsWith('Role:') && !line.startsWith('Influence:')) {
      // Save previous stakeholder if exists
      if (currentStakeholder) {
        stakeholders.push(currentStakeholder);
      }
      
      // Start new stakeholder
      const parts = line.split(' - ');
      currentStakeholder = {
        name: parts[0].trim(),
        position: parts[1] ? parts[1].trim() : '',
        role: '',
        influence: '',
        trust: ''
      };
    } else if (currentStakeholder) {
      // Parse Role, Influence, Trust
      if (line.startsWith('Role:')) {
        currentStakeholder.role = line.replace('Role:', '').trim();
      } else if (line.startsWith('Influence:')) {
        const influenceTrust = line.replace('Influence:', '').trim();
        const splitIdx = influenceTrust.indexOf('/ Trust:');
        if (splitIdx > 0) {
          currentStakeholder.influence = influenceTrust.substring(0, splitIdx).trim();
          currentStakeholder.trust = influenceTrust.substring(splitIdx + 8).trim();
        } else {
          currentStakeholder.influence = influenceTrust;
        }
      }
    }
  }
  
  // Don't forget last stakeholder
  if (currentStakeholder) {
    stakeholders.push(currentStakeholder);
  }
  
  return stakeholders;
}

/**
 * Aggregate stakeholder meetings từ weekAccount data
 * @param {Object} weekAccountData - Data từ getWeekAccountData_
 * @returns {Array} Danh sách stakeholder với số lần gặp và ngày gặp gần nhất
 */
function aggregateStakeholderMeetings_(weekAccountData) {
  if (!weekAccountData || !weekAccountData.rows) return [];
  
  const stakeholderMap = new Map();
  
  weekAccountData.rows.forEach(function(row) {
    const stakeholders = parseStakeholdersFromUpdate_(row.update);
    
    stakeholders.forEach(function(sh) {
      const key = sh.name + '|' + sh.position;
      
      if (!stakeholderMap.has(key)) {
        stakeholderMap.set(key, {
          name: sh.name,
          position: sh.position,
          role: sh.role,
          influence: sh.influence,
          trust: sh.trust,
          meetCount: 0,
          latestDate: null,
          latestDateStr: ''
        });
      }
      
      const existing = stakeholderMap.get(key);
      existing.meetCount++;
      
      // Update role, influence, trust if current has value
      if (sh.role) existing.role = sh.role;
      if (sh.influence) existing.influence = sh.influence;
      if (sh.trust) existing.trust = sh.trust;
      
      // Update latest date
      const parseDate = function(dateStr) {
        if (!dateStr) return new Date(0);
        const parts = String(dateStr).split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(0);
      };
      
      const currentDate = parseDate(row.startDate);
      if (!existing.latestDate || currentDate > existing.latestDate) {
        existing.latestDate = currentDate;
        existing.latestDateStr = row.startDate;
      }
    });
  });
  
  // Convert to array and sort by meet count desc
  const result = Array.from(stakeholderMap.values());
  result.sort(function(a, b) { return b.meetCount - a.meetCount; });
  
  return result;
}

/**
 * Format month từ YYYY-MM sang "tháng MM năm YYYY"
 */
function formatMonthYear_(monthStr) {
  if (!monthStr || monthStr.length < 7) return '';
  const year = monthStr.substring(0, 4);
  const month = monthStr.substring(5, 7);
  return 'tháng ' + month + ' năm ' + year;
}

/**
 * Tạo HTML cho PDF nâng cao - UPDATED VERSION
 */
function createAdvancedReportHtml_(payload) {
  const data = payload.externalData || {};
  const filter = payload.filter || {};
  const biddingData = payload.biddingData || {};
  
  // Format tháng/năm cho tiêu đề
  const fromMonthYear = formatMonthYear_(filter.dateFrom || '');
  const toMonthYear = formatMonthYear_(filter.dateTo || '');
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 15mm; }
    body { 
      font-family: 'Calibri', Arial, sans-serif; 
      font-size: 11px; 
      color: #333; 
      line-height: 1.5; 
    }
    h1 { 
      color: #3b5998; 
      font-size: 18px; 
      border-bottom: 2px solid #3b5998; 
      padding-bottom: 8px; 
      margin-bottom: 5px; 
    }
    h2 { 
      color: #3b5998; 
      font-size: 14px; 
      background: #f0f2f5; 
      padding: 8px 12px; 
      margin: 20px 0 10px 0; 
      border-left: 4px solid #3b5998; 
    }
    h3 { 
      color: #3b5998; 
      font-size: 12px; 
      margin: 15px 0 8px 0; 
    }
    .meta { 
      color: #666; 
      font-size: 10px; 
      margin-bottom: 15px; 
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      gap: 15px;
    }
    .header-left {
      flex: 1;
    }
    .header-left h2 {
      background: none;
      border: none;
      padding: 0;
      margin: 5px 0;
      font-size: 14px;
    }
    .info-line {
      margin: 3px 0;
      font-size: 11px;
      color: #666;
    }
    .info-line strong {
      color: #3b5998;
    }
    .header-right {
      flex-shrink: 0;
      margin-top: 0;
    }
    .highlight-box { 
      background: #e8f0fe; 
      border: 1px solid #b4d5fe; 
      border-radius: 4px; 
      padding: 12px; 
      margin: 10px 0; 
      font-size: 11px;
      line-height: 1.6;
    }
    .highlight-box strong { 
      color: #d93025; 
    }
    .stats-row { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 15px; 
    }
    .stat-box { 
      flex: 1; 
      background: #f9f9f9; 
      border: 1px solid #ddd; 
      border-radius: 4px; 
      padding: 10px; 
      text-align: center; 
    }
    .stat-box .label { 
      font-size: 9px; 
      color: #333; 
      text-transform: uppercase; 
      font-weight: bold;
    }
    .stat-box .value { 
      font-size: 16px; 
      font-weight: bold; 
      color: #3b5998; 
      margin-top: 4px; 
    }
    .stat-box.highlight .value { 
      color: #d93025; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 10px 0; 
      font-family: 'Calibri', Arial, sans-serif;
      font-size: 10px; 
    }
    th { 
      background: #f9f9f9; 
      color: #333; 
      font-weight: bold;
      padding: 8px 6px; 
      text-align: left; 
      font-size: 10px; 
      border: 1px solid #ddd;
    }
    td { 
      padding: 6px; 
      border: 1px solid #eee; 
      vertical-align: top; 
      font-size: 10px;
      color: #333;
    }
    td a {
      color: #3b5998;
      text-decoration: underline;
      word-break: break-word;
    }
    tr:nth-child(even) { 
      background: #fafafa; 
    }
    .split-table { 
      display: table; 
      width: 100%; 
      margin: 10px 0; 
    }
    .split-cell { 
      display: table-cell; 
      width: 50%; 
      padding: 10px; 
      vertical-align: top; 
      border: 1px solid #ddd; 
      background: #f9f9f9; 
    }
    .split-cell h4 { 
      margin: 0 0 8px 0; 
      color: #3b5998; 
      font-size: 11px; 
    }
    .section { 
      page-break-inside: avoid; 
      margin-bottom: 20px; 
    }
    .info-row { 
      margin: 8px 0; 
      font-size: 11px;
    }
    .info-label { 
      font-weight: bold; 
      color: #3b5998; 
    }
    .pre-wrap {
      white-space: pre-wrap;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <h1>THÔNG TIN ĐỊA BÀN</h1>
  <div class="meta">
    Ngày xuất dữ liệu: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}
  </div>
  
  <div class="header-container">
    <div class="header-left">
      <h2>${escapeHtml_(payload.accountName)}</h2>
      <div class="info-line">
        <strong>Đánh giá tiềm năng:</strong> ${escapeHtml_(data.accountInfo ? data.accountInfo.potential : 'N/A')}
      </div>
      <div class="info-line">
        <strong>Sản phẩm liên quan:</strong> ${escapeHtml_(payload.productType || 'N/A')}
      </div>
    </div>
    <div class="header-right">
      ${data.accountInfo ? createMatrixSVG_(data.accountInfo.potential) : ''}
    </div>
  </div>
`;

  // =====================================================
  // PHẦN 1: THÔNG TIN ĐẤU THẦU
  // =====================================================
  html += `
  <div class="section">
    <h2>1. THÔNG TIN ĐẤU THẦU</h2>
    <div style="font-size: 10px; font-style: italic; color: #666; margin-top: -8px; margin-bottom: 12px;">
      Cập nhật từ ${fromMonthYear} tới ${toMonthYear}
    </div>
    
    <div class="stats-row">
      <div class="stat-box">
        <div class="label">Kết quả trúng thầu</div>
        <div class="value">${biddingData.kqttCount || 0}</div>
      </div>
      <div class="stat-box">
        <div class="label">Kế hoạch LCNT</div>
        <div class="value">${biddingData.khlcntCount || 0}</div>
      </div>
      <div class="stat-box">
        <div class="label">Thông báo mời thầu</div>
        <div class="value">${biddingData.tbmtCount || 0}</div>
      </div>
      <div class="stat-box highlight">
        <div class="label">Tổng giá trị trúng thầu</div>
        <div class="value">${biddingData.totalWinValue || '0'}</div>
      </div>
    </div>
  </div>
`;

  // === 1.1. KẾT QUẢ TRÚNG THẦU ===
  html += `<div class="section"><h3>1.1. Kết quả trúng thầu</h3>`;
  if (biddingData.kqttRows && biddingData.kqttRows.length > 0) {
    html += `<table><thead><tr>
      <th>Ngày phê duyệt</th><th>Số TBMT</th><th style="width:25%">Dự án</th>
      <th>Nhà thầu trúng thầu</th><th>Giá trị trúng thầu</th><th>Hình thức LCNT</th>
    </tr></thead><tbody>`;
    biddingData.kqttRows.forEach(function(r) {
      html += `<tr><td>${escapeHtml_(r.colM)}</td><td>${escapeHtml_(r.colH)}</td><td>${escapeHtml_(r.colF)}</td>
        <td>${escapeHtml_(r.colL)}</td><td>${escapeHtml_(r.colK)}</td><td>${escapeHtml_(r.colI)}</td></tr>`;
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:#666; font-style:italic;">Không có dữ liệu kết quả trúng thầu trong khoảng thời gian này.</p>';
  }
  html += '</div>';

  // === 1.2. KẾ HOẠCH LCNT ===
  html += `<div class="section"><h3>1.2. Kế hoạch lựa chọn nhà thầu</h3>`;
  if (biddingData.khlcntRows && biddingData.khlcntRows.length > 0) {
    html += `<table><thead><tr>
      <th>Thời gian TH</th><th>Số KHLCNT</th><th style="width:20%">Dự án</th><th style="width:20%">Tên gói thầu</th>
      <th>Tổng mức ĐT</th><th>Nguồn vốn</th><th>Giá gói thầu</th><th>Hình thức LCNT</th>
    </tr></thead><tbody>`;
    biddingData.khlcntRows.forEach(function(r) {
      html += `<tr><td>${escapeHtml_(r.colP)}</td><td>${escapeHtml_(r.colE)}</td><td>${escapeHtml_(r.colF)}</td>
        <td>${escapeHtml_(r.colJ)}</td><td>${escapeHtml_(r.colH)}</td><td>${escapeHtml_(r.colK)}</td>
        <td>${escapeHtml_(r.colL)}</td><td>${escapeHtml_(r.colM)}</td></tr>`;
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:#666; font-style:italic;">Không có dữ liệu kế hoạch LCNT trong khoảng thời gian này.</p>';
  }
  html += '</div>';

  // === 1.3. THÔNG BÁO MỜI THẦU ===
  html += `<div class="section"><h3>1.3. Thông báo mời thầu</h3>`;
  if (biddingData.tbmtRows && biddingData.tbmtRows.length > 0) {
    html += `<table><thead><tr>
      <th>Thời điểm mở thầu</th><th>Thời điểm đóng thầu</th><th style="width:20%">Tên gói thầu</th>
      <th>Giá gói thầu</th><th>Bảo đảm DT</th><th>Hiệu lực HĐ</th><th>Hình thức LCNT</th>
    </tr></thead><tbody>`;
    biddingData.tbmtRows.forEach(function(r) {
      html += `<tr><td>${escapeHtml_(r.colT)}</td><td>${escapeHtml_(r.colS)}</td><td>${escapeHtml_(r.colH)}</td>
        <td>${escapeHtml_(r.colK)}</td><td>${escapeHtml_(r.colP)}</td><td>${escapeHtml_(r.colU)}</td>
        <td>${escapeHtml_(r.colM)}</td></tr>`;
    });
    html += '</tbody></table>';
  } else {
    html += '<p style="color:#666; font-style:italic;">Không có dữ liệu thông báo mời thầu trong khoảng thời gian này.</p>';
  }
  html += '</div>';

  // === 1.4. LỊCH SỬ TRÚNG THẦU ===
  if (payload.includeSalesHistory && data.salesHistory) {
    const sh = data.salesHistory;
    html += `<div class="section"><h3>1.4. Lịch sử trúng thầu (MMH Record)</h3>
    <div class="highlight-box">
      <strong>Tổng số gói thầu (unique):</strong> ${sh.summary.totalPackages || 0} gói<br/>`;
    
    if (sh.summary.packageCountByYearProduct && sh.summary.packageCountByYearProduct.length > 0) {
      sh.summary.packageCountByYearProduct.forEach(function(item) {
        html += `• Năm ${escapeHtml_(item.year)} - ${escapeHtml_(item.productType || 'Không xác định')}: <strong>${item.count}</strong> gói<br/>`;
      });
    }
    
    html += '<br/><strong>Tổng số lượng sản phẩm trúng thầu:</strong><br/>';
    if (sh.summary.byYearProductContractor && sh.summary.byYearProductContractor.length > 0) {
      sh.summary.byYearProductContractor.forEach(function(item) {
        if (item.totalQty > 0) {
          html += `• Năm ${escapeHtml_(item.year)} - ${escapeHtml_(item.productType || 'Không xác định')}: <strong>"${escapeHtml_(item.contractor)}"</strong> trúng thầu với <strong>${item.totalQty}</strong> chiếc<br/>`;
        }
      });
    } else {
      html += '• Không có dữ liệu<br/>';
    }
    html += '</div>';
    
    if (sh.rows && sh.rows.length > 0) {
      html += `<table><thead><tr>
        <th>Năm</th><th style="width:22%">Tên gói thầu</th><th>Nhà thầu trúng thầu</th>
        <th>Hãng SX</th><th>Loại SP</th><th>Mã SP</th><th>SL</th><th>Giá trúng thầu</th>
      </tr></thead><tbody>`;
      sh.rows.forEach(function(r) {
        html += `<tr><td>${escapeHtml_(r.year)}</td><td>${escapeHtml_(r.packageName)}</td><td>${escapeHtml_(r.contractor)}</td>
          <td>${escapeHtml_(r.manufacturer)}</td><td>${escapeHtml_(r.productType)}</td><td>${escapeHtml_(r.productCode)}</td>
          <td>${r.quantity}</td><td>${escapeHtml_(r.winPrice)}</td></tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div>';
  }

  // =====================================================
  // PHẦN 2: THÔNG TIN ĐỊA BÀN
  // =====================================================
  if (payload.includeAreaInfo) {
    html += '<div class="section"><h2>2. THÔNG TIN ĐỊA BÀN</h2>';
    
    // === 2.1 THÔNG TIN TỔNG QUAN (từ mục 2.3 cũ) ===
    if (data.accountInfo) {
      const ai = data.accountInfo;
      html += '<h3>2.1 Thông tin tổng quan</h3>';
      
      html += `<div class="split-table">
        <div class="split-cell">
          <h4>Thông tin tổng quan</h4>
          <div class="pre-wrap">${escapeHtml_(ai.overview)}</div>
        </div>
        <div class="split-cell">
          <h4>Phân tích tình hình địa bàn</h4>
          <div class="pre-wrap">${escapeHtml_(ai.analysis)}</div>
        </div>
      </div>`;
      
      html += `<div class="info-row"><span class="info-label">Sản phẩm mục tiêu:</span> ${escapeHtml_(ai.targetProduct)}</div>`;
      html += `<div class="info-row"><span class="info-label">Mục tiêu cụ thể:</span><br/><div class="pre-wrap">${escapeHtml_(ai.objective)}</div></div>`;
      
      html += `<div class="split-table">
        <div class="split-cell">
          <h4>Chiến lược</h4>
          <div class="pre-wrap">${escapeHtml_(ai.strategy)}</div>
        </div>
        <div class="split-cell">
          <h4>Hành động chính</h4>
          <div class="pre-wrap">${escapeHtml_(ai.mainAction)}</div>
        </div>
      </div>`;
    }
    
    // === 2.2 KEY STAKEHOLDERS ===
    if (data.cbc && data.cbc.rows && data.cbc.rows.length > 0) {
      html += '<h3>2.2 Key Stakeholders</h3>';
      html += `<div class="highlight-box">Tổng số Key Stakeholder: <strong>${data.cbc.total}</strong></div>`;
      html += `<table><thead><tr>
        <th>Chức vụ</th><th>Tên</th><th>Vai trò</th><th>Chuyên môn</th>
        <th>Tầm ảnh hưởng</th><th>Độ tin tưởng</th><th>Cập nhật</th>
      </tr></thead><tbody>`;
      data.cbc.rows.forEach(function(r) {
        html += `<tr><td>${escapeHtml_(r.position)}</td><td>${escapeHtml_(r.name)}</td><td>${escapeHtml_(r.role)}</td>
          <td>${escapeHtml_(r.expertise)}</td><td>${escapeHtml_(r.influence)}</td><td>${escapeHtml_(r.trust)}</td>
          <td>${escapeHtml_(r.update)}</td></tr>`;
      });
      html += '</tbody></table>';
    }
    
    // === 2.3 HOẠT ĐỘNG CỦA SALES TẠI ĐỊA BÀN (từ mục 2.1 cũ) ===
    if (data.weekAccount) {
      const wa = data.weekAccount;
      const pp = data.productPresentation || { count: 0, rows: [] };
      
      html += '<h3>2.3 Hoạt động của sales tại địa bàn</h3>';
      html += '<div class="highlight-box">';
      html += `Trong khoảng thời gian từ <strong>${fromMonthYear}</strong> đến <strong>${toMonthYear}</strong>, `;
      html += `<strong>${escapeHtml_(wa.summary.pic || 'PIC')}</strong> đã làm việc tại địa bàn này: <strong>${wa.summary.totalVisits}</strong> lần`;
      
      if (wa.summary.actionBreakdown && Object.keys(wa.summary.actionBreakdown).length > 0) {
        const actions = [];
        for (var action in wa.summary.actionBreakdown) {
          actions.push('<strong>' + wa.summary.actionBreakdown[action] + '</strong> lần "' + escapeHtml_(action) + '"');
        }
        html += '<br/>Chi tiết: ' + actions.join(', ');
      }
      
      html += `<br/><br/>Số buổi giới thiệu sản phẩm tại địa bàn này: <strong>${pp.count}</strong> buổi`;
      html += '</div>';
      
      // === Stakeholder Meetings Table ===
      const stakeholderMeetings = aggregateStakeholderMeetings_(wa);
      Logger.log('🔍 DEBUG: Stakeholder meetings count = ' + stakeholderMeetings.length);
      

if (stakeholderMeetings.length > 0) {
  Logger.log('✅ Generating stakeholder table HTML...');
  
  html += '<h4 style="color:#3b5998; font-size:11px; margin:15px 0 8px 0;">Key Stakeholder gặp mặt và làm việc</h4>';
  html += `<div class="highlight-box">Số Key Stakeholder gặp mặt: <strong>${stakeholderMeetings.length}</strong></div>`;
  html += `<table><thead><tr>
    <th>Tên</th><th>Chức vụ</th><th>Vai trò</th><th>Tầm ảnh hưởng</th>
    <th>Độ tin tưởng</th><th>Số lần gặp</th><th>Lần gặp gần nhất</th>
  </tr></thead><tbody>`;
  
  stakeholderMeetings.forEach(function(sh) {
    Logger.log('  → Adding row: ' + sh.name + ' | Meets: ' + sh.meetCount);
    html += `<tr>
      <td>${escapeHtml_(sh.name)}</td>
      <td>${escapeHtml_(sh.position)}</td>
      <td>${escapeHtml_(sh.role)}</td>
      <td>${escapeHtml_(sh.influence)}</td>
      <td>${escapeHtml_(sh.trust)}</td>
      <td><strong>${sh.meetCount}</strong></td>
      <td>${escapeHtml_(sh.latestDateStr)}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  
  Logger.log('✅ Stakeholder table HTML completed');
} else {
  Logger.log('⚠️ No stakeholder meetings found - table not generated');
}

      
      // === Chi tiết các lần gặp khách hàng ===
      html += '<h4 style="color:#3b5998; font-size:11px; margin:15px 0 8px 0;">Chi tiết các lần gặp khách hàng</h4>';
      
      if (wa.rows && wa.rows.length > 0) {
        html += `<table><thead><tr>
          <th style="width:10%">Ngày</th><th style="width:15%">Hành động</th>
          <th style="width:35%">Kế hoạch</th><th style="width:40%">Cập nhật</th>
        </tr></thead><tbody>`;
        wa.rows.forEach(function(r) {
          html += `<tr>
            <td>${escapeHtml_(r.startDate)}</td>
            <td>${escapeHtml_(r.action)}</td>
            <td class="pre-wrap">${escapeHtml_(r.plan)}</td>
            <td class="pre-wrap">${escapeHtml_(r.update)}</td>
          </tr>`;
        });
        html += '</tbody></table>';
      }
      
      // === Hoạt động giới thiệu sản phẩm ===
      html += '<h4 style="color:#3b5998; font-size:11px; margin:15px 0 8px 0;">Hoạt động giới thiệu sản phẩm</h4>';
      
      if (pp.rows && pp.rows.length > 0) {
        html += `<table><thead><tr>
          <th style="width:15%">Ngày</th><th style="width:25%">Bài đào tạo</th>
          <th style="width:60%">Kế hoạch & Kết quả</th>
        </tr></thead><tbody>`;
        pp.rows.forEach(function(r) {
          let trainingCell = '';
          if (r.trainingLink) {
            let displayText = r.trainingFile;
            if (displayText.startsWith('http')) {
              displayText = '📎 Xem tài liệu đào tạo';
            }
            trainingCell = `<a href="${escapeHtml_(r.trainingLink)}" target="_blank" style="color:#3b5998; text-decoration:underline; word-break:break-word;">${escapeHtml_(displayText)}</a>`;
          } else {
            trainingCell = escapeHtml_(r.trainingFile || '');
          }
          
          let planResultFormatted = escapeHtml_(r.planResult);
          planResultFormatted = planResultFormatted.replace(/\n/g, '<br/>');
          planResultFormatted = planResultFormatted.replace(/- /g, '<br/>• ');
          
          html += `<tr>
            <td style="vertical-align:top;">${escapeHtml_(r.date)}</td>
            <td style="vertical-align:top;">${trainingCell}</td>
            <td style="vertical-align:top;" class="pre-wrap">${planResultFormatted}</td>
          </tr>`;
        });
        html += '</tbody></table>';
      } else {
        html += '<p style="color:#666; font-style:italic;">Không có hoạt động giới thiệu sản phẩm trong khoảng thời gian này.</p>';
      }
    }
    
    html += '</div>';
  }

  html += '</body></html>';
  return html;
}

/**
 * Helper: Escape HTML
 */
function escapeHtml_(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Tạo biểu đồ 2x2 matrix SVG - FINAL VERSION
 */
function createMatrixSVG_(potential) {
  const potentialUpper = String(potential || '').toUpperCase().trim();
  let highlightQuadrant = '';
  
  const match = potentialUpper.match(/^([ABCD])\s*-/);
  if (match) {
    highlightQuadrant = match[1];
  }
  
  const svg = `
<svg width="160" height="160" viewBox="-20 -10 160 170" xmlns="http://www.w3.org/2000/svg" style="display: block;">
  <rect x="0" y="0" width="120" height="120" fill="#f9f9f9" stroke="#666" stroke-width="1"/>
  <line x1="60" y1="110" x2="60" y2="10" stroke="#666" stroke-width="2"/>
  <polygon points="60,10 57,15 63,15" fill="#666"/>
  <line x1="10" y1="60" x2="110" y2="60" stroke="#666" stroke-width="2"/>
  <polygon points="110,60 105,57 105,63" fill="#666"/>
  <rect x="10" y="60" width="50" height="50" fill="${highlightQuadrant === 'D' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="35" y="90" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'D' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'D' ? '#3b5998' : '#888'}" text-anchor="middle">D</text>
  <rect x="60" y="60" width="50" height="50" fill="${highlightQuadrant === 'C' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="85" y="90" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'C' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'C' ? '#3b5998' : '#888'}" text-anchor="middle">C</text>
  <rect x="10" y="10" width="50" height="50" fill="${highlightQuadrant === 'B' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="35" y="40" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'B' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'B' ? '#3b5998' : '#888'}" text-anchor="middle">B</text>
  <rect x="60" y="10" width="50" height="50" fill="${highlightQuadrant === 'A' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="85" y="40" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'A' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'A' ? '#3b5998' : '#888'}" text-anchor="middle">A</text>
  <text x="60" y="138" font-family="Arial, sans-serif" font-size="10" fill="#333" text-anchor="middle" font-weight="600">Thị phần Mani</text>
  <g transform="translate(-8, 60) rotate(-90)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="10" fill="#333" text-anchor="middle" font-weight="600">Tiềm năng</text>
  </g>
</svg>
  `;
  
  return svg;
}

/**
 * Helper: Escape HTML
 */
function escapeHtml_(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Helper: Format nội dung cập nhật với các label in đậm và màu xanh
 */
/**
 * Format nội dung cập nhật - FIX không giãn dòng
 */
/**
 * Format nội dung cập nhật - FIX không giãn dòng
 */
function formatUpdateContent_(content) {
  if (!content) return '';
  
  let formatted = escapeHtml_(content);
  
  // Các label cần in đậm và đổi màu
  const labels = [
    'Actions Taken:',
    'Actions taken:',
    'Current Situation:',
    'Current situation:',
    'Customer Feedback:',
    'Customer feedback:',
    'Opportunities:',
    'Opportunities / Next Steps:',
    'Next Steps:',
    'Next steps:'
  ];
  
  labels.forEach(function(label) {
    const escapedLabel = escapeHtml_(label);
    const regex = new RegExp(escapedLabel, 'gi');
    formatted = formatted.replace(regex, '<br/><strong style="color:#3b5998;">' + escapedLabel + '</strong>');
  });
  
  // Xử lý xuống dòng - GIỮ NGUYÊN, KHÔNG GIÃN
  formatted = formatted.replace(/\n/g, '<br/>');  // Mỗi \n = 1 <br/>
  formatted = formatted.replace(/- /g, '<br/>• '); // Bullet points
  
  // Loại bỏ <br/> thừa ở đầu
  formatted = formatted.replace(/^(<br\/>)+/, '');
  
  return '<div class="update-content" style="line-height:1.4;">' + formatted + '</div>';
}

/**
 * Helper: Escape HTML
 */
function escapeHtml_(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function setupDailyEmailTrigger() {
  // Xóa tất cả trigger cũ
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'autoFetchDailyEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Tạo trigger mới - 17:00 GMT+7 hàng ngày
  try {
    ScriptApp.newTrigger('autoFetchDailyEmails')
      .timeBased()
      .atHour(17)  // 17:00 GMT+7
      .everyDays(1)
      .inTimezone('Asia/Ho_Chi_Minh')  // GMT+7
      .create();
    
    Logger.log('✅ Daily email trigger created successfully at 17:00 GMT+7');
    SpreadsheetApp.getUi().alert(
      '✅ Đã thiết lập trigger tự động!\n\n' +
      'Hệ thống sẽ tự động tải email lúc 17:00 (GMT+7) mỗi ngày.\n' +
      'Quét tất cả email từ các nguồn:\n' +
      '• bantin@baodauthau.vn\n' +
      '• bantindauthaudientukq@gmail.com\n' +
      '• Bantindientu@baodauthau.vn\n' +
      '• bantindauthau@taichinhdautu.vn\n' +
      '• bantindauthaudientu@gmail.com'
    );
  } catch (e) {
    Logger.log('❌ ERROR creating trigger: ' + e.message);
    SpreadsheetApp.getUi().alert(
      '❌ Lỗi khi tạo trigger:\n\n' + e.message + 
      '\n\nVui lòng kiểm tra quyền trong Apps Script.'
    );
  }
}

/**
 * Xóa trigger tự động
 */
function removeDailyEmailTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'autoFetchDailyEmails') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  Logger.log('Removed ' + removed + ' email triggers');
  
  try {
    SpreadsheetApp.getUi().alert('✅ Đã xóa trigger tự động tải email.');
  } catch (e) {
    // Ignore if UI not available
  }
}

/**
 * Function được gọi tự động bởi trigger
 * Tải email cho tất cả 3 loại: KQTT, KHLCNT, TBMT
 */
/**
 * Function được gọi tự động bởi trigger
 * Tải email cho tất cả 3 loại: KQTT, KHLCNT, TBMT từ 4 email nguồn
 * Quét 24h trước thời điểm chạy
 */
/**
 * Tự động tải email hàng ngày từ TẤT CẢ email "Báo đấu thầu"
 * Trigger: Chạy hàng ngày lúc 17:00 GMT+7
 */
function autoFetchDailyEmails() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  const dateFrom = Utilities.formatDate(yesterday, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const dateTo = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  Logger.log('=== AUTO FETCH DAILY EMAILS ===');
  Logger.log('Date range: ' + dateFrom + ' to ' + dateTo);
  
  // ⭐ DANH SÁCH EMAIL CẬP NHẬT
  const emailList = [
    'bantin@baodauthau.vn',
    'bantindauthaudientukq@gmail.com', 
    'Bantindientu@baodauthau.vn',
    'bantindauthaudientu@gmail.com',
    'bantindauthau@taichinhdautu.vn',
    'mmh.product@mani.inc'
  ];
  
  const senderString = emailList.join(',');
  
  const results = {
    KQTT: { emails: 0, files: 0, rows: 0 },
    KHLCNT: { emails: 0, files: 0, rows: 0 },
    TBMT: { emails: 0, files: 0, rows: 0 }
  };
  
  try {
    // Tải KQTT
    Logger.log('\n--- Fetching KQTT ---');
    const kqttResult = runFetchEmailsByType({
      type: 'KQTT',
      dateFrom: dateFrom,
      dateTo: dateTo,
      sender: senderString,
      subject: '' 
    });
    results.KQTT.emails = kqttResult.count;
    results.KQTT.files = kqttResult.filesDownloaded;
    results.KQTT.rows = kqttResult.rowsAdded.KQTT || 0;
    
    // Tải KHLCNT
    Logger.log('\n--- Fetching KHLCNT ---');
    const khlcntResult = runFetchEmailsByType({
      type: 'KHLCNT',
      dateFrom: dateFrom,
      dateTo: dateTo,
      sender: senderString,
      subject: ''
    });
    results.KHLCNT.emails = khlcntResult.count;
    results.KHLCNT.files = khlcntResult.filesDownloaded;
    results.KHLCNT.rows = khlcntResult.rowsAdded.KHLCNT || 0;
    
    // Tải TBMT
    Logger.log('\n--- Fetching TBMT ---');
    const tbmtResult = runFetchEmailsByType({
      type: 'TBMT',
      dateFrom: dateFrom,
      dateTo: dateTo,
      sender: senderString,
      subject: ''
    });
    results.TBMT.emails = tbmtResult.count;
    results.TBMT.files = tbmtResult.filesDownloaded;
    results.TBMT.rows = tbmtResult.rowsAdded.TBMT || 0;
    
  } catch (e) {
    Logger.log('ERROR in autoFetchDailyEmails: ' + e.toString());
  }
  
  Logger.log('\n=== SUMMARY ===');
  Logger.log(JSON.stringify(results, null, 2));
  
  return results;
}function testPDFExport() {
  const testPayload = {
    accountName: 'Test Account',
    mmhAccountName: 'Test MMH',
    filter: {
      dateFrom: '2024-01',
      dateTo: '2025-12'
    },
    productType: 'Phẫu thuật',
    includeSalesHistory: true,
    includeAreaInfo: true,
    externalData: {
      salesHistory: {
        rows: [
          { year: '2024', packageName: 'Gói 1', contractor: 'Cty A', manufacturer: 'Hãng X', productType: 'Dao', productCode: 'D001', quantity: 10, winPrice: '100,000,000' }
        ],
        summary: {
          totalPackages: 1,
          years: ['2024'],
          packageCountByYearProduct: [{ year: '2024', productType: 'Dao', count: 1 }],
          byYearProductContractor: [{ year: '2024', productType: 'Dao', contractor: 'Cty A', totalQty: 10 }]
        }
      },
      weekAccount: {
        rows: [
          { pic: 'PIC Name', action: 'Gặp KH', plan: 'Kế hoạch test', update: 'Actions Taken:\n- Action 1\n- Action 2\nCurrent Situation:\n- Situation 1', startDate: '01/12/2024' }
        ],
        summary: { totalVisits: 1, pic: 'PIC Name', actionBreakdown: { 'Gặp KH': 1 } },
        latestUpdate: { pic: 'PIC Name', action: 'Gặp KH', update: 'Actions Taken:\n- Test action', startDate: '01/12/2024' }
      },
      cbc: {
        rows: [{ position: 'Giám đốc', name: 'Nguyễn A', role: 'Quyết định', expertise: 'Y tế', influence: 'Cao', trust: 'Tốt', update: 'Test' }],
        total: 1
      },
      accountInfo: {
        potential: 'Cao',
        overview: 'Overview test',
        analysis: 'Analysis test',
        objective: 'Objective test',
        strategy: 'Strategy test',
        mainAction: 'Action test',
        targetProduct: 'Product test'
      }
    },
    biddingData: {
      kqttCount: 1,
      khlcntCount: 2,
      tbmtCount: 3,
      totalWinValue: '500,000,000',
      kqttRows: [{ colM: '2024-12-01', colH: 'TBMT001', colF: 'Dự án test', colL: 'Nhà thầu A', colK: '100,000,000', colI: 'Đấu thầu rộng rãi' }],
      khlcntRows: [{ colP: '2024-12', colE: 'KH001', colF: 'Dự án test', colJ: 'Gói thầu test', colH: '1,000,000,000', colK: 'NSNN', colL: '200,000,000', colM: 'Đấu thầu' }],
      tbmtRows: [{ colT: '2024-12-15', colS: '2024-12-10', colH: 'Gói TBMT', colK: '300,000,000', colP: '10,000,000', colU: '12 tháng', colM: 'Chào giá' }]
    }
  };
  
  const html = createAdvancedReportHtml_(testPayload);
  Logger.log('Generated HTML length: ' + html.length);
  
  // Lưu để xem thử
  const blob = Utilities.newBlob(html, 'text/html', 'test_report.html');
  const pdf = blob.getAs('application/pdf').setName('test_report.pdf');
  
  // Lưu vào My Drive
  const file = DriveApp.createFile(pdf);
  Logger.log('Test PDF created: ' + file.getUrl());
  
  return file.getUrl();
}/**
 * Xác định folder đích dựa trên tên file
 */
function detectFolderByFileName_(fileName) {
  const upperName = fileName.toUpperCase();
  
  if (upperName.includes('TBMT')) {
    return { type: 'TBMT', folderId: FOLDERS.TBMT, colIndex: COL_EMAIL.FILE_TBMT };
  }
  if (upperName.includes('KQDT')) {
    return { type: 'KQTT', folderId: FOLDERS.KQTT, colIndex: COL_EMAIL.FILE_KQTT };
  }
  if (upperName.includes('KHMT')) {
    return { type: 'KHLCNT', folderId: FOLDERS.KHLCNT, colIndex: COL_EMAIL.FILE_KHLCNT };
  }
  
  return null;
}/**
 * Tự động điền "Địa bàn MMH" cho dòng mới dựa trên "Chủ đầu tư" đã có
 */
function autoFillMMHLocation_(targetSheet, type, startRow, numRows) {
  try {
    Logger.log('Auto-filling MMH location for ' + type);
    
    // Xác định cột Chủ đầu tư và Địa bàn MMH
    let ownerCol, mmhCol;
    if (type === 'KQTT') {
      ownerCol = 5;   // Cột E
      mmhCol = 14;    // Cột N
    } else if (type === 'KHLCNT') {
      ownerCol = 7;   // Cột G
      mmhCol = 17;    // Cột Q
    } else if (type === 'TBMT') {
      ownerCol = 5;   // Cột E
      mmhCol = 22;    // Cột V
    } else {
      return;
    }
    
    // Lấy toàn bộ data của 2 cột này
    const lastRow = targetSheet.getLastRow();
    if (lastRow < 3) return;
    
    const ownerData = targetSheet.getRange(3, ownerCol, lastRow - 2, 1).getValues();
    const mmhData = targetSheet.getRange(3, mmhCol, lastRow - 2, 1).getValues();
    
    // Tạo map: Chủ đầu tư → Địa bàn MMH
    const ownerToMMH = new Map();
    for (var i = 0; i < ownerData.length; i++) {
      const owner = String(ownerData[i][0] || '').trim().toLowerCase();
      const mmh = String(mmhData[i][0] || '').trim();
      
      if (owner && mmh && !ownerToMMH.has(owner)) {
        ownerToMMH.set(owner, mmh);
      }
    }
    
    Logger.log('Found ' + ownerToMMH.size + ' owner→MMH mappings');
    
    // Điền cho các dòng mới
    const newRowsOwnerData = targetSheet.getRange(startRow, ownerCol, numRows, 1).getValues();
    const mmhUpdates = [];
    
    for (var i = 0; i < newRowsOwnerData.length; i++) {
      const owner = String(newRowsOwnerData[i][0] || '').trim().toLowerCase();
      
      if (owner && ownerToMMH.has(owner)) {
        mmhUpdates.push([ownerToMMH.get(owner)]);
      } else {
        mmhUpdates.push(['']);
      }
    }
    
    // Ghi vào sheet
    if (mmhUpdates.length > 0) {
      targetSheet.getRange(startRow, mmhCol, mmhUpdates.length, 1).setValues(mmhUpdates);
      Logger.log('Auto-filled MMH location for ' + mmhUpdates.filter(r => r[0]).length + ' rows');
    }
    
  } catch (e) {
    Logger.log('ERROR in autoFillMMHLocation_: ' + e.message);
  }
}/**
 * Tạo biểu đồ 2x2 matrix SVG
 */
/**
 * Tạo biểu đồ 2x2 matrix SVG - Kích thước nhỏ gọn
 */
/**
 * Tạo biểu đồ 2x2 matrix SVG - CẬP NHẬT
 */
/**
 * Tạo biểu đồ 2x2 matrix SVG - FINAL VERSION
 */
function createMatrixSVG_(potential) {
  const potentialUpper = String(potential || '').toUpperCase().trim();
  let highlightQuadrant = '';
  
  const match = potentialUpper.match(/^([ABCD])\s*-/);
  if (match) {
    highlightQuadrant = match[1];
  }
  
  const svg = `
<svg width="160" height="160" viewBox="-20 -10 160 170" xmlns="http://www.w3.org/2000/svg" style="display: block;">
  <!-- Background -->
  <rect x="0" y="0" width="120" height="120" fill="#f9f9f9" stroke="#666" stroke-width="1"/>
  
  <!-- Grid lines with arrows -->
  <!-- Vertical line (Tiềm năng axis) -->
  <line x1="60" y1="110" x2="60" y2="10" stroke="#666" stroke-width="2"/>
  <polygon points="60,10 57,15 63,15" fill="#666"/>
  
  <!-- Horizontal line (Thị phần axis) -->
  <line x1="10" y1="60" x2="110" y2="60" stroke="#666" stroke-width="2"/>
  <polygon points="110,60 105,57 105,63" fill="#666"/>
  
  <!-- Quadrants -->
  <!-- D (Bottom-left) -->
  <rect x="10" y="60" width="50" height="50" fill="${highlightQuadrant === 'D' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="35" y="90" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'D' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'D' ? '#3b5998' : '#888'}" text-anchor="middle">D</text>
  
  <!-- C (Bottom-right) -->
  <rect x="60" y="60" width="50" height="50" fill="${highlightQuadrant === 'C' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="85" y="90" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'C' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'C' ? '#3b5998' : '#888'}" text-anchor="middle">C</text>
  
  <!-- B (Top-left) -->
  <rect x="10" y="10" width="50" height="50" fill="${highlightQuadrant === 'B' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="35" y="40" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'B' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'B' ? '#3b5998' : '#888'}" text-anchor="middle">B</text>
  
  <!-- A (Top-right) -->
  <rect x="60" y="10" width="50" height="50" fill="${highlightQuadrant === 'A' ? '#3b5998' : '#e8e8e8'}" opacity="0.3"/>
  <text x="85" y="40" font-family="Arial, sans-serif" font-size="28" font-weight="${highlightQuadrant === 'A' ? 'bold' : 'normal'}" 
        fill="${highlightQuadrant === 'A' ? '#3b5998' : '#888'}" text-anchor="middle">A</text>
  
  <!-- Axis labels -->
  <!-- Horizontal label (bottom) -->
  <text x="60" y="138" font-family="Arial, sans-serif" font-size="10" fill="#333" text-anchor="middle" font-weight="600">Thị phần Mani</text>
  
  <!-- Vertical label (left) -->
  <g transform="translate(-8, 60) rotate(-90)">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="10" fill="#333" text-anchor="middle" font-weight="600">Tiềm năng</text>
  </g>
</svg>
  `;
  
  return svg;
}function testRunFetchEmailsByType() {
  const testConfig = {
    type: 'KQTT',
    dateFrom: '2025-01-01',
    dateTo: '2025-01-10',
    sender: 'bantin@baodauthau.vn',
    subject: 'Thông tin đấu thầu'
  };
  
  Logger.log('Testing with config: ' + JSON.stringify(testConfig));
  
  try {
    const result = runFetchEmailsByType(testConfig);
    Logger.log('SUCCESS! Result: ' + JSON.stringify(result));
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
}/**
 * DEBUG: Kiểm tra Product Presentation mapping
 * Data bắt đầu từ dòng 6
 */
function debugProductPresentation() {
  const EXTERNAL_FILE_ID = '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g';
  
  Logger.log('=== PRODUCT PRESENTATION DEBUG ===');
  
  try {
    const ss = SpreadsheetApp.openById(EXTERNAL_FILE_ID);
    const sheet = ss.getSheetByName('Product Presentation');
    
    if (!sheet) {
      Logger.log('❌ Sheet "Product Presentation" not found');
      return;
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log('📊 Sheet dimensions: ' + lastRow + ' rows x ' + lastCol + ' cols');
    
    // Hiển thị header (dòng 5)
    Logger.log('\n📋 HEADER ROW (Row 5):');
    const headerRow = sheet.getRange(5, 1, 1, 12).getValues()[0];
    headerRow.forEach(function(cell, i) {
      const col = String.fromCharCode(65 + i); // A, B, C, ...
      Logger.log('  ' + col + ' (col ' + (i+1) + '): ' + cell);
    });
    
    // Hiển thị 5 dòng data đầu (từ dòng 6)
    Logger.log('\n📝 FIRST 5 DATA ROWS (Rows 6-10):');
    const dataRows = sheet.getRange(6, 1, Math.min(5, lastRow - 5), 12).getValues();
    dataRows.forEach(function(row, i) {
      Logger.log('\nRow ' + (i + 6) + ':');
      Logger.log('  C (Account): ' + row[2]);
      Logger.log('  D (PIC): ' + row[3]);
      Logger.log('  I (Month): ' + row[8]);
      Logger.log('  J (Date): ' + row[9]);
      Logger.log('  K (Training): ' + String(row[10]).substring(0, 50));
      Logger.log('  L (Plan/Result): ' + String(row[11]).substring(0, 50));
    });
    
    // Test với account từ dòng 6
    Logger.log('\n=== TESTING FILTER FUNCTION ===');
    
    // Lấy account đầu tiên từ dòng 6
    const firstAccount = sheet.getRange(6, 3).getValue();
    Logger.log('Testing with first account: "' + firstAccount + '"');
    
    const testMonthFrom = '202401';
    const testMonthTo = '202512';
    
    const result = getProductPresentationData_(ss, firstAccount, testMonthFrom, testMonthTo);
    
    Logger.log('\n=== RESULT ===');
    Logger.log('Total rows found: ' + result.count);
    
    if (result.count > 0) {
      Logger.log('\n📦 Details:');
      result.rows.forEach(function(r, i) {
        Logger.log('\n' + (i+1) + '.');
        Logger.log('  Date: ' + r.date);
        Logger.log('  PIC: ' + r.pic);
        Logger.log('  Training: ' + r.trainingFile);
        Logger.log('  Has Link: ' + (r.trainingLink ? 'YES' : 'NO'));
        Logger.log('  Plan/Result: ' + String(r.planResult).substring(0, 80));
      });
    } else {
      Logger.log('⚠️ No data found. Check:');
      Logger.log('  1. Account name exact match');
      Logger.log('  2. Month format (YYYYMM)');
      Logger.log('  3. Month range includes data months');
    }
    
  } catch (e) {
    Logger.log('❌ ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
  
  Logger.log('\n=== END DEBUG ===');
}/**
 * DEBUG: Test Rich Text Link Extraction
 */
function testRichTextExtraction() {
  const EXTERNAL_FILE_ID = '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g';
  const ss = SpreadsheetApp.openById(EXTERNAL_FILE_ID);
  const sheet = ss.getSheetByName('Product Presentation');
  
  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }
  
  Logger.log('=== TESTING RICH TEXT EXTRACTION ===');
  
  // Test với 5 rows đầu
  const richTexts = sheet.getRange(6, 11, 5, 1).getRichTextValues();
  
  richTexts.forEach(function(row, i) {
    const richText = row[0];
    Logger.log('\nRow ' + (i + 6) + ':');
    Logger.log('  Text: ' + richText.getText());
    Logger.log('  Link: ' + (richText.getLinkUrl() || 'NO LINK'));
  });
  
  Logger.log('\n=== END TEST ===');
}/**
 * DEBUG: Kiểm tra chi tiết row 10 - Chip Link
 */
function debugRow10ChipLink() {
  const EXTERNAL_FILE_ID = '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g';
  const ss = SpreadsheetApp.openById(EXTERNAL_FILE_ID);
  const sheet = ss.getSheetByName('Product Presentation');
  
  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }
  
  Logger.log('=== DEBUG ROW 10 - CHIP LINK ===');
  
  const cell = sheet.getRange('K10');
  
  // 1. Check value
  Logger.log('\n1. CELL VALUE:');
  Logger.log('   ' + cell.getValue());
  
  // 2. Check formula
  Logger.log('\n2. CELL FORMULA:');
  const formula = cell.getFormula();
  Logger.log('   ' + (formula || 'NO FORMULA'));
  
  // 3. Check rich text
  Logger.log('\n3. RICH TEXT:');
  const richText = cell.getRichTextValue();
  if (richText) {
    Logger.log('   Text: ' + richText.getText());
    Logger.log('   Link: ' + (richText.getLinkUrl() || 'NO LINK'));
  } else {
    Logger.log('   NO RICH TEXT');
  }
  
  // 4. Check display value
  Logger.log('\n4. DISPLAY VALUE:');
  Logger.log('   ' + cell.getDisplayValue());
  
  // 5. Try to extract with regex
  Logger.log('\n5. URL EXTRACTION ATTEMPT:');
  const cellValue = String(cell.getValue());
  const urlMatch = cellValue.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    Logger.log('   Found URL: ' + urlMatch[1]);
  } else {
    Logger.log('   No URL pattern found in value');
  }
  
  // 6. Check if it's a hyperlink
  Logger.log('\n6. HYPERLINK CHECK:');
  if (formula) {
    const hyperlinkMatch = formula.match(/=HYPERLINK\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?\s*\)/i);
    if (hyperlinkMatch) {
      Logger.log('   ✅ HYPERLINK Formula detected!');
      Logger.log('   URL: ' + hyperlinkMatch[1]);
      Logger.log('   Label: ' + (hyperlinkMatch[2] || 'NO LABEL'));
    } else {
      Logger.log('   ❌ Not a HYPERLINK formula');
    }
  }
  
  Logger.log('\n=== END DEBUG ===');
}/**
 * Kiểm tra và cảnh báo các cell không có link trong Product Presentation
 */
function checkMissingLinksInProductPresentation() {
  const EXTERNAL_FILE_ID = '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g';
  const ss = SpreadsheetApp.openById(EXTERNAL_FILE_ID);
  const sheet = ss.getSheetByName('Product Presentation');
  
  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 6) return;
  
  const numRows = lastRow - 5;
  const COL_TRAINING = 11;
  
  const values = sheet.getRange(6, COL_TRAINING, numRows, 1).getValues();
  const richTexts = sheet.getRange(6, COL_TRAINING, numRows, 1).getRichTextValues();
  const formulas = sheet.getRange(6, COL_TRAINING, numRows, 1).getFormulas();
  
  Logger.log('=== CHECKING MISSING LINKS ===');
  Logger.log('Total rows: ' + numRows);
  
  const missingLinks = [];
  
  for (var i = 0; i < numRows; i++) {
    const value = values[i][0];
    if (!value || String(value).trim() === '') continue;
    
    let hasLink = false;
    
    // Check rich text
    const richText = richTexts[i][0];
    if (richText && richText.getLinkUrl()) {
      hasLink = true;
    }
    
    // Check formula
    const formula = formulas[i][0];
    if (formula && formula.match(/=HYPERLINK/i)) {
      hasLink = true;
    }
    
    // Check URL in value
    if (String(value).match(/https?:\/\//)) {
      hasLink = true;
    }
    
    if (!hasLink) {
      missingLinks.push({
        row: i + 6,
        value: String(value).substring(0, 50)
      });
    }
  }
  
  Logger.log('\n📊 SUMMARY:');
  Logger.log('Total cells with data: ' + numRows);
  Logger.log('Cells missing links: ' + missingLinks.length);
  
  if (missingLinks.length > 0) {
    Logger.log('\n⚠️ CELLS WITHOUT LINKS:');
    missingLinks.forEach(function(item) {
      Logger.log('  Row ' + item.row + ': ' + item.value);
    });
  } else {
    Logger.log('\n✅ All cells have links!');
  }
  
  Logger.log('\n=== END CHECK ===');
}// Chạy function này để test
function testAutoFetch() {
  Logger.log('=== MANUAL TEST ===');
  const result = autoFetchDailyEmails();
  Logger.log('Test result: ' + JSON.stringify(result));
}function testStakeholderDebug() {
  // Dùng payload test đã có
  const testPayload = {
    accountName: 'Test Account',
    mmhAccountName: 'Test MMH',
    filter: {
      dateFrom: '2024-01',
      dateTo: '2025-12'
    },
    productType: 'Phẫu thuật',
    includeSalesHistory: false,
    includeAreaInfo: true,
    externalData: {
      weekAccount: {
        rows: [
          { 
            pic: 'PIC Name', 
            action: 'Gặp KH', 
            plan: 'Kế hoạch test', 
            update: 'Expected Contact Person:\nDr. Kim Cương - Bác sĩ nhãn khoa\nRole: User\nInfluence: 3 - Actively in the decision proces / Trust: 3 - Build-up of trust begin\nActions Taken:\n- Test',
            startDate: '01/12/2024' 
          }
        ],
        summary: { totalVisits: 1, pic: 'PIC Name' }
      }
    }
  };
  
  const html = createAdvancedReportHtml_(testPayload);
  Logger.log('Generated HTML length: ' + html.length);
}/**
 * ⭐ FUNCTION MỚI: Tải TOÀN BỘ email lịch sử từ tất cả nguồn
 * Được gọi từ button "Tải toàn bộ email" trong Update Dialog
 */
function fetchAllHistoricalEmails(config) {
  Logger.log('=== FETCH ALL HISTORICAL EMAILS ===');
  Logger.log('Config: ' + JSON.stringify(config));
  
  const dateFrom = config.dateFrom || '2020-01-01';
  const dateTo = config.dateTo || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // ⭐ DANH SÁCH EMAIL CẬP NHẬT
  const emailList = [
    'bantin@baodauthau.vn',
    'bantindauthaudientukq@gmail.com',
    'Bantindientu@baodauthau.vn',
    'bantindauthaudientu@gmail.com',
    'bantindauthau@taichinhdautu.vn',
    'mmh.product@mani.inc'
  ];
  
  const senderString = emailList.join(',');
  
  const results = {
    KQTT: { emails: 0, files: 0, rows: 0 },
    KHLCNT: { emails: 0, files: 0, rows: 0 },
    TBMT: { emails: 0, files: 0, rows: 0 }
  };
  
  try {
    // Tải KQTT
    Logger.log('\n--- Fetching ALL KQTT ---');
    const kqttResult = runFetchEmailsByType({
      type: 'KQTT',
      dateFrom: dateFrom,
      dateTo: dateTo,
      sender: senderString,
      subject: ''
    });
    results.KQTT.emails = kqttResult.count;
    results.KQTT.files = kqttResult.filesDownloaded;
    results.KQTT.rows = kqttResult.rowsAdded.KQTT || 0;
    
    // Tải KHLCNT
    Logger.log('\n--- Fetching ALL KHLCNT ---');
    const khlcntResult = runFetchEmailsByType({
      type: 'KHLCNT',
      dateFrom: dateFrom,
      dateTo: dateTo,
      sender: senderString,
      subject: ''
    });
    results.KHLCNT.emails = khlcntResult.count;
    results.KHLCNT.files = khlcntResult.filesDownloaded;
    results.KHLCNT.rows = khlcntResult.rowsAdded.KHLCNT || 0;
    
    // Tải TBMT
    Logger.log('\n--- Fetching ALL TBMT ---');
    const tbmtResult = runFetchEmailsByType({
      type: 'TBMT',
      dateFrom: dateFrom,
      dateTo: dateTo,
      sender: senderString,
      subject: ''
    });
    results.TBMT.emails = tbmtResult.count;
    results.TBMT.files = tbmtResult.filesDownloaded;
    results.TBMT.rows = tbmtResult.rowsAdded.TBMT || 0;
    
    Logger.log('\n=== SUMMARY ===');
    Logger.log(JSON.stringify(results, null, 2));
    
    return {
      success: true,
      message: 'Completed fetching all historical emails',
      data: results
    };
    
  } catch (e) {
    Logger.log('ERROR: ' + e.toString());
    return {
      success: false,
      message: 'Error: ' + e.message,
      data: results
    };
  }
}// Test 1: Kiểm tra mapping
function testMapping() {
  const mapping = getColumnMapping_('KQTT');
  Logger.log('KQTT mapping:');
  Logger.log('- sourceColCount: ' + mapping.sourceColCount);
  Logger.log('- targetColCount: ' + mapping.targetColCount);
  Logger.log('- sourceDataCol: ' + mapping.sourceDataCol);
  Logger.log('- updateTimeCol: ' + mapping.updateTimeCol);
}

// Test 2: Kiểm tra timestamp format
function testTimestamp() {
  const timestamp = Utilities.formatDate(
    new Date(), 
    Session.getScriptTimeZone(), 
    'yyyy-MM-dd HH:mm:ss'
  );
  Logger.log('Timestamp: ' + timestamp);
}/**
 * ⭐ DEBUG FUNCTION - Kiểm tra tại sao không quét được email
 * Chạy function này để xem chi tiết
 */
function debugEmailFetching() {
  Logger.log('=== BẮT ĐẦU DEBUG EMAIL FETCHING ===\n');
  
  // ============================================
  // BƯỚC 1: KIỂM TRA GMAIL QUERY
  // ============================================
  Logger.log('📧 BƯỚC 1: KIỂM TRA GMAIL QUERY\n');
  
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  
  const tz = Session.getScriptTimeZone();
  const dateFromStr = Utilities.formatDate(lastWeek, tz, 'yyyy/MM/dd');
  const dateToStr = Utilities.formatDate(today, tz, 'yyyy/MM/dd');
  
  // Test với TẤT CẢ 4 email sources
  const emailSources = [
    'bantin@baodauthau.vn',
    'bantindauthaudientukq@gmail.com',
    'Bantindientu@baodauthau.vn',
    'bantindauthaudientu@gmail.com',
    'bantindauthau@taichinhdautu.vn'
  ];
  
  Logger.log('Khoảng thời gian: ' + dateFromStr + ' đến ' + dateToStr);
  Logger.log('Email sources: ' + emailSources.join(', ') + '\n');
  
  // Test 1: Query KHÔNG có subject filter
  const senderList = emailSources.map(function(s) { 
    return 'from:' + s.trim(); 
  }).join(' OR ');
  
  const queryNoSubject = '(' + senderList + ') after:' + dateFromStr + ' before:' + dateToStr;
  Logger.log('Query (KHÔNG filter subject):');
  Logger.log(queryNoSubject + '\n');
  
  const threadsNoSubject = GmailApp.search(queryNoSubject);
  Logger.log('✅ Kết quả: Tìm thấy ' + threadsNoSubject.length + ' threads\n');
  
  // Test 2: Query CÓ subject filter
  const subjects = [
    'Thông tin đấu thầu (kết quả)',
    'Thông tin đấu thầu (thông báo)',
    'Thông tin đấu thầu (kế hoạch)'
  ];
  
  subjects.forEach(function(subj) {
    const queryWithSubject = queryNoSubject + ' subject:"' + subj + '"';
    Logger.log('Query (CÓ subject: "' + subj + '"):');
    Logger.log(queryWithSubject);
    
    const threads = GmailApp.search(queryWithSubject);
    Logger.log('✅ Kết quả: ' + threads.length + ' threads\n');
  });
  
  // ============================================
  // BƯỚC 2: KIỂM TRA PROCESSED STATUS
  // ============================================
  Logger.log('\n📝 BƯỚC 2: KIỂM TRA PROCESSED STATUS\n');
  
  const userProps = PropertiesService.getUserProperties();
  const allProps = userProps.getProperties();
  
  let processedCount = 0;
  for (var key in allProps) {
    if (key.startsWith('processed_')) {
      processedCount++;
    }
  }
  
  Logger.log('Số email đã được đánh dấu "processed": ' + processedCount);
  
  if (processedCount > 0) {
    Logger.log('⚠️ CÓ ' + processedCount + ' email đã được xử lý trước đó!');
    Logger.log('Đây có thể là nguyên nhân hệ thống bỏ qua email.\n');
  }
  
  // ============================================
  // BƯỚC 3: KIỂM TRA ATTACHMENT TRONG EMAIL
  // ============================================
  Logger.log('\n📎 BƯỚC 3: KIỂM TRA ATTACHMENT\n');
  
  if (threadsNoSubject.length > 0) {
    Logger.log('Kiểm tra 5 thread đầu tiên...\n');
    
    for (var i = 0; i < Math.min(5, threadsNoSubject.length); i++) {
      const thread = threadsNoSubject[i];
      const messages = thread.getMessages();
      
      Logger.log('--- Thread ' + (i + 1) + ' ---');
      Logger.log('Số message trong thread: ' + messages.length);
      
      messages.forEach(function(msg, msgIdx) {
        const msgId = msg.getId();
        const msgSubject = msg.getSubject();
        const msgFrom = msg.getFrom();
        const attachments = msg.getAttachments();
        
        Logger.log('\n  Message ' + (msgIdx + 1) + ':');
        Logger.log('  - ID: ' + msgId);
        Logger.log('  - From: ' + msgFrom);
        Logger.log('  - Subject: ' + msgSubject);
        Logger.log('  - Số attachment: ' + attachments.length);
        
        // Kiểm tra processed status
        const isProcessed = userProps.getProperty('processed_' + msgId);
        Logger.log('  - Đã processed? ' + (isProcessed ? 'CÓ ✅' : 'CHƯA ❌'));
        
        if (attachments.length > 0) {
          Logger.log('  - Danh sách attachment:');
          attachments.forEach(function(att, attIdx) {
            const attName = att.getName();
            const attMimeType = att.getContentType();
            Logger.log('    ' + (attIdx + 1) + '. ' + attName + ' (' + attMimeType + ')');
            
            // Kiểm tra có phải Excel file không
            const isExcel = attMimeType.includes('spreadsheet') || 
                           attMimeType.includes('excel') || 
                           attName.endsWith('.xlsx') || 
                           attName.endsWith('.xls') ||
                           attName.endsWith('.xlsm');
            
            if (isExcel) {
              Logger.log('      → ✅ Đây là Excel file, sẽ được xử lý');
            } else {
              Logger.log('      → ⚠️ KHÔNG phải Excel file, sẽ bị bỏ qua');
            }
          });
        }
      });
      
      Logger.log('\n');
    }
  }
  
  // ============================================
  // BƯỚC 4: KHUYẾN NGHỊ
  // ============================================
  Logger.log('\n💡 KHUYẾN NGHỊ:\n');
  
  if (threadsNoSubject.length === 0) {
    Logger.log('❌ VẤNĐỀ: Không tìm thấy email nào từ các nguồn "Báo đấu thầu"');
    Logger.log('   → Kiểm tra lại email sources có đúng không');
    Logger.log('   → Kiểm tra khoảng thời gian có chứa email không\n');
  } else if (processedCount > 0) {
    Logger.log('⚠️ VẤNĐỀ: Có ' + processedCount + ' email đã được đánh dấu processed');
    Logger.log('   → Chạy function resetProcessedEmails() để reset lại');
    Logger.log('   → Hoặc thay đổi khoảng thời gian để quét email mới\n');
  } else {
    Logger.log('✅ Query hoạt động tốt, tìm thấy ' + threadsNoSubject.length + ' threads');
    Logger.log('   → Kiểm tra xem có attachment Excel không');
    Logger.log('   → Kiểm tra subject filter có quá strict không\n');
  }
  
  Logger.log('=== KẾT THÚC DEBUG ===');
}/**
 * ⭐ DEBUG CỤ THỂ: Kiểm tra email ngày 4/12/2025
 */
function debugSpecificEmail_Dec4() {
  Logger.log('=== DEBUG EMAIL NGÀY 4/12/2025 ===\n');
  
  const tz = Session.getScriptTimeZone();
  
  // Tìm email từ ngày 4/12/2025
  const startDate = new Date('2025-12-04');
  const endDate = new Date('2025-12-05'); // Ngày 5/12 để bao gồm cả ngày 4/12
  
  const query = 'from:Bantindientu@baodauthau.vn after:2025/12/04 before:2025/12/05';
  
  Logger.log('📧 GMAIL QUERY:');
  Logger.log(query + '\n');
  
  const threads = GmailApp.search(query);
  Logger.log('✅ Tìm thấy: ' + threads.length + ' threads\n');
  
  if (threads.length === 0) {
    Logger.log('❌ KHÔNG TÌM THẤY EMAIL!');
    Logger.log('Thử query rộng hơn...\n');
    
    // Thử query rộng hơn
    const wideQuery = 'from:Bantindientu@baodauthau.vn after:2025/12/01 before:2025/12/10';
    const wideThreads = GmailApp.search(wideQuery);
    Logger.log('Query rộng (1-10/12): ' + wideThreads.length + ' threads\n');
    
    if (wideThreads.length > 0) {
      Logger.log('📋 DANH SÁCH EMAIL TRONG KHOẢNG 1-10/12:\n');
      wideThreads.forEach(function(thread, idx) {
        const msg = thread.getMessages()[0];
        Logger.log((idx + 1) + '. ' + msg.getSubject());
        Logger.log('   Date: ' + Utilities.formatDate(msg.getDate(), tz, 'yyyy-MM-dd HH:mm:ss'));
        Logger.log('   From: ' + msg.getFrom());
        Logger.log('   Attachments: ' + msg.getAttachments().length + '\n');
      });
    }
    
    return;
  }
  
  // Phân tích chi tiết email ngày 4/12
  threads.forEach(function(thread, threadIdx) {
    Logger.log('--- THREAD ' + (threadIdx + 1) + ' ---\n');
    
    const messages = thread.getMessages();
    Logger.log('Số message: ' + messages.length + '\n');
    
    messages.forEach(function(msg, msgIdx) {
      const msgId = msg.getId();
      const msgDate = msg.getDate();
      const msgSubject = msg.getSubject();
      const msgFrom = msg.getFrom();
      const attachments = msg.getAttachments();
      
      Logger.log('MESSAGE ' + (msgIdx + 1) + ':');
      Logger.log('📌 Message ID: ' + msgId);
      Logger.log('📅 Date: ' + Utilities.formatDate(msgDate, tz, 'yyyy-MM-dd HH:mm:ss'));
      Logger.log('✉️  From: ' + msgFrom);
      Logger.log('📝 Subject: ' + msgSubject);
      Logger.log('📎 Attachments: ' + attachments.length + '\n');
      
      // ⭐ KIỂM TRA PROCESSED STATUS
      const userProps = PropertiesService.getUserProperties();
      const isProcessed = userProps.getProperty('processed_' + msgId);
      
      Logger.log('🔍 PROCESSED STATUS:');
      if (isProcessed) {
        Logger.log('   ✅ ĐÃ ĐƯỢC XỬ LÝ (processed_' + msgId + ' = ' + isProcessed + ')');
        Logger.log('   ⚠️ ĐÂY LÀ NGUYÊN NHÂN - Email bị skip vì đã xử lý!\n');
      } else {
        Logger.log('   ❌ CHƯA XỬ LÝ\n');
      }
      
      // ⭐ KIỂM TRA SUBJECT MATCH
      Logger.log('🔍 SUBJECT MATCHING:');
      const subjectFilters = [
        'Thông tin đấu thầu (kết quả)',
        'Thông tin đấu thầu (thông báo)',
        'Thông tin đấu thầu (kế hoạch)'
      ];
      
      let subjectMatched = false;
      subjectFilters.forEach(function(filter) {
        if (msgSubject.includes(filter)) {
          Logger.log('   ✅ KHỚP với filter: "' + filter + '"');
          subjectMatched = true;
        }
      });
      
      if (!subjectMatched) {
        Logger.log('   ❌ KHÔNG KHỚP với bất kỳ filter nào');
        Logger.log('   ⚠️ ĐÂY CÓ THỂ LÀ NGUYÊN NHÂN!\n');
      } else {
        Logger.log('');
      }
      
      // ⭐ KIỂM TRA ATTACHMENTS
      if (attachments.length === 0) {
        Logger.log('⚠️ EMAIL KHÔNG CÓ ATTACHMENT!\n');
        return;
      }
      
      Logger.log('📎 CHI TIẾT ATTACHMENTS:\n');
      attachments.forEach(function(att, attIdx) {
        const attName = att.getName();
        const attMimeType = att.getContentType();
        const attSize = att.getSize();
        
        Logger.log('   Attachment ' + (attIdx + 1) + ':');
        Logger.log('   - Tên: ' + attName);
        Logger.log('   - MIME Type: ' + attMimeType);
        Logger.log('   - Size: ' + (attSize / 1024).toFixed(2) + ' KB');
        
        // ⭐ KIỂM TRA CÓ PHẢI EXCEL KHÔNG
        const isExcel = attMimeType.includes('spreadsheet') || 
                       attMimeType.includes('excel') || 
                       attName.endsWith('.xlsx') || 
                       attName.endsWith('.xls') ||
                       attName.endsWith('.xlsm');
        
        if (isExcel) {
          Logger.log('   → ✅ Đây là Excel file, SẼ ĐƯỢC XỬ LÝ');
          
          // ⭐ KIỂM TRA FOLDER DETECTION
          const detectedFolder = detectFolderByFileName_(attName);
          if (detectedFolder) {
            Logger.log('   → ✅ Detected folder: ' + detectedFolder.type);
            Logger.log('   → Folder ID: ' + detectedFolder.folderId);
          } else {
            Logger.log('   → ⚠️ KHÔNG PHÁT HIỆN ĐƯỢC FOLDER!');
            Logger.log('   → File có thể bị lưu vào folder mặc định');
          }
        } else {
          Logger.log('   → ❌ KHÔNG phải Excel file, SẼ BỊ BỎ QUA');
        }
        
        Logger.log('');
      });
    });
  });
  
  Logger.log('\n=== KẾT THÚC DEBUG ===');
}/**
 * Kiểm tra file trong Drive folder KQTT
 */
function checkFilesInDrive() {
  Logger.log('=== KIỂM TRA FILES TRONG DRIVE ===\n');
  
  const folderId = FOLDERS.KQTT; // Folder KQTT
  const folder = DriveApp.getFolderById(folderId);
  
  Logger.log('📁 Folder: ' + folder.getName());
  Logger.log('📁 Folder ID: ' + folderId + '\n');
  
  const files = folder.getFiles();
  const fileList = [];
  
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    const fileDate = file.getDateCreated();
    
    fileList.push({
      name: fileName,
      date: Utilities.formatDate(fileDate, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
    });
  }
  
  // Sort by name
  fileList.sort(function(a, b) { return a.name.localeCompare(b.name); });
  
  Logger.log('📊 TỔNG SỐ FILE: ' + fileList.length + '\n');
  Logger.log('📋 DANH SÁCH FILE:\n');
  
  fileList.forEach(function(file, idx) {
    Logger.log((idx + 1) + '. ' + file.name);
    Logger.log('   Created: ' + file.date);
    
    // Check if this is the missing file
    if (file.name.includes('KQDT_4_12_2025') || file.name.includes('20251204')) {
      Logger.log('   → ⭐ ĐÂY LÀ FILE NGÀY 4/12!');
    }
    
    Logger.log('');
  });
  
  // Check specifically for Dec 4 file
  Logger.log('\n🔍 TÌM KIẾM FILE NGÀY 4/12:');
  const found = fileList.some(function(file) {
    return file.name.includes('KQDT_4_12_2025') || 
           file.name.includes('20251204') ||
           file.name.includes('KQDT_04_12');
  });
  
  if (found) {
    Logger.log('✅ TÌM THẤY file ngày 4/12 trong Drive!');
  } else {
    Logger.log('❌ KHÔNG TÌM THẤY file ngày 4/12 trong Drive!');
    Logger.log('⚠️ File chưa được tải về hoặc có vấn đề trong quá trình download.');
  }
  
  Logger.log('\n=== KẾT THÚC KIỂM TRA ===');
}/**
 * ⭐ FORCE FETCH lại email ngày 4/12/2025
 */
function forceFetchDec4Email() {
  Logger.log('=== FORCE FETCH EMAIL 4/12/2025 ===\n');
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Xác nhận',
    'Bạn có muốn FORCE FETCH email ngày 4/12/2025?\n\n' +
    'Hệ thống sẽ:\n' +
    '1. Xóa processed status của email này\n' +
    '2. Tải lại file attachment\n' +
    '3. Cập nhật vào sheet',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    Logger.log('❌ Đã hủy');
    return;
  }
  
  // Step 1: Tìm email
  const query = 'from:Bantindientu@baodauthau.vn after:2025/12/04 before:2025/12/05';
  const threads = GmailApp.search(query);
  
  if (threads.length === 0) {
    Logger.log('❌ Không tìm thấy email!');
    ui.alert('Không tìm thấy email ngày 4/12/2025');
    return;
  }
  
  Logger.log('✅ Tìm thấy ' + threads.length + ' threads\n');
  
  const userProps = PropertiesService.getUserProperties();
  let processedCount = 0;
  
  // Step 2: Xóa processed status
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      const msgId = msg.getId();
      const key = 'processed_' + msgId;
      
      if (userProps.getProperty(key)) {
        Logger.log('Deleting: ' + key);
        userProps.deleteProperty(key);
        processedCount++;
      }
    });
  });
  
  Logger.log('\n✅ Đã xóa ' + processedCount + ' processed status');
  
  // Step 3: Fetch lại
  Logger.log('\n📥 Bắt đầu fetch...\n');
  
  const result = runFetchEmailsByType({
    type: 'KQTT',
    dateFrom: '2025-12-04',
    dateTo: '2025-12-05',
    sender: 'Bantindientu@baodauthau.vn',
    subject: '' // Bỏ subject filter
  });
  
  Logger.log('\n✅ KẾT QUẢ:');
  Logger.log('- Emails: ' + result.count);
  Logger.log('- Files: ' + result.filesDownloaded);
  Logger.log('- Rows: ' + JSON.stringify(result.rowsAdded));
  
  ui.alert(
    'Hoàn tất!',
    'Đã xử lý:\n' +
    '• Emails: ' + result.count + '\n' +
    '• Files tải về: ' + result.filesDownloaded + '\n' +
    '• Dòng thêm vào sheet: ' + (result.rowsAdded.KQTT || 0)
  );
  
  Logger.log('\n=== KẾT THÚC ===');
}/**
 * ⭐ DEBUG: Xem cấu trúc header của file Excel nguồn
 */
function analyzeExcelFileStructure() {
  Logger.log('=== PHÂN TÍCH CẤU TRÚC FILE EXCEL ===\n');
  
  // Lấy 1 file mẫu từ folder KQTT để phân tích
  const folderId = FOLDERS.KQTT;
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  
  if (!files.hasNext()) {
    Logger.log('❌ Không có file nào trong folder!');
    return;
  }
  
  const file = files.next();
  Logger.log('📄 Phân tích file: ' + file.getName() + '\n');
  
  try {
    // Mở file Excel
    const fileId = file.getId();
    const mimeType = file.getMimeType();
    
    let spreadsheet;
    
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      spreadsheet = SpreadsheetApp.openById(fileId);
    } else {
      Logger.log('Converting Excel to Google Sheets...');
      const blob = file.getBlob();
      const metadata = {
        title: 'TEMP_ANALYZE_' + new Date().getTime(),
        mimeType: 'application/vnd.google-apps.spreadsheet'
      };
      const convertedFile = Drive.Files.insert(metadata, blob, { convert: true });
      spreadsheet = SpreadsheetApp.openById(convertedFile.id);
    }
    
    const sheet = spreadsheet.getSheets()[0];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log('📊 Kích thước sheet: ' + lastRow + ' rows x ' + lastCol + ' columns\n');
    
    // Tìm header row (thường ở row 10)
    Logger.log('🔍 TÌM HEADER ROW:\n');
    
    for (var row = 1; row <= Math.min(15, lastRow); row++) {
      const rowData = sheet.getRange(row, 1, 1, Math.min(20, lastCol)).getValues()[0];
      const rowText = rowData.join(' | ');
      
      Logger.log('Row ' + row + ': ' + rowText);
      
      // Check if this is header
      if (rowText.includes('GÓI TIN') || rowText.includes('BÊN MỜI THẦU')) {
        Logger.log('   → ⭐ ĐÂY LÀ HEADER ROW!\n');
        
        // Hiển thị chi tiết header
        Logger.log('📋 CHI TIẾT HEADER (Row ' + row + '):\n');
        rowData.forEach(function(cell, colIdx) {
          if (cell && String(cell).trim() !== '') {
            const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
            Logger.log('   ' + colLetter + ' (col ' + (colIdx + 1) + '): ' + cell);
          }
        });
        
        Logger.log('\n📍 DATA BẮT ĐẦU TỪ ROW: ' + (row + 1));
        
        // Hiển thị 3 dòng data mẫu
        Logger.log('\n📝 MẪU DATA (3 rows đầu):\n');
        const sampleData = sheet.getRange(row + 1, 1, Math.min(3, lastRow - row), Math.min(15, lastCol)).getValues();
        sampleData.forEach(function(dataRow, idx) {
          Logger.log('Data row ' + (idx + 1) + ':');
          dataRow.forEach(function(cell, colIdx) {
            const colLetter = String.fromCharCode(65 + colIdx);
            if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
              Logger.log('   ' + colLetter + ': ' + String(cell).substring(0, 50));
            }
          });
          Logger.log('');
        });
        
        break;
      }
    }
    
  } catch (e) {
    Logger.log('❌ LỖI: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
  
  Logger.log('\n=== KẾT THÚC PHÂN TÍCH ===');
}/**
 * Xem cấu trúc header của các sheet đích
 */
function analyzeTargetSheetStructure() {
  Logger.log('=== PHÂN TÍCH CẤU TRÚC SHEET ĐÍCH ===\n');
  
  const ss = SpreadsheetApp.getActive();
  const sheets = [
    { name: SHEET_KQTT, desc: 'Kết quả trúng thầu' },
    { name: SHEET_KHLCNT, desc: 'Kế hoạch LCNT' },
    { name: SHEET_TBMT, desc: 'Thông báo mời thầu' }
  ];
  
  sheets.forEach(function(sheetInfo) {
    Logger.log('─────────────────────────────────────');
    Logger.log('📄 SHEET: ' + sheetInfo.name);
    Logger.log('─────────────────────────────────────\n');
    
    const sheet = ss.getSheetByName(sheetInfo.name);
    if (!sheet) {
      Logger.log('❌ Sheet không tồn tại!\n');
      return;
    }
    
    // Lấy header (row 2)
    const headerRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    Logger.log('📋 HEADER (Row 2):\n');
    headerRow.forEach(function(cell, colIdx) {
      if (cell && String(cell).trim() !== '') {
        const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
        const isFormula = sheet.getRange(3, colIdx + 1).getFormula() !== '';
        const formulaIndicator = isFormula ? ' 🔒 (CÓ CÔNG THỨC)' : ' ✏️ (GHI ĐƯỢC)';
        
        Logger.log('   ' + colLetter + ' (col ' + (colIdx + 1) + '): ' + cell + formulaIndicator);
      }
    });
    
    Logger.log('\n');
  });
  
  Logger.log('=== KẾT THÚC PHÂN TÍCH ===');
}/**
 * ⭐ Phân tích file KHMT (Kế hoạch LCNT)
 */
function analyzeKHMTFile() {
  Logger.log('=== PHÂN TÍCH FILE KHMT ===\n');
  
  // Lấy file từ folder KHLCNT
  const folderId = FOLDERS.KHLCNT; // ⭐ KHMT folder
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  
  if (!files.hasNext()) {
    Logger.log('❌ Không có file nào trong folder KHLCNT!');
    return;
  }
  
  const file = files.next();
  Logger.log('📄 Phân tích file: ' + file.getName() + '\n');
  
  try {
    const fileId = file.getId();
    const mimeType = file.getMimeType();
    
    let spreadsheet;
    
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      spreadsheet = SpreadsheetApp.openById(fileId);
    } else {
      Logger.log('Converting Excel to Google Sheets...');
      const blob = file.getBlob();
      const metadata = {
        title: 'TEMP_ANALYZE_KHMT_' + new Date().getTime(),
        mimeType: 'application/vnd.google-apps.spreadsheet'
      };
      const convertedFile = Drive.Files.insert(metadata, blob, { convert: true });
      spreadsheet = SpreadsheetApp.openById(convertedFile.id);
    }
    
    const sheet = spreadsheet.getSheets()[0];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log('📊 Kích thước sheet: ' + lastRow + ' rows x ' + lastCol + ' columns\n');
    
    // Tìm header row
    Logger.log('🔍 TÌM HEADER ROW:\n');
    
    for (var row = 1; row <= Math.min(15, lastRow); row++) {
      const rowData = sheet.getRange(row, 1, 1, Math.min(25, lastCol)).getValues()[0];
      const rowText = rowData.join(' | ');
      
      Logger.log('Row ' + row + ': ' + rowText.substring(0, 100));
      
      // Check if this is header
      if (rowText.includes('GÓI TIN') || rowText.includes('KẾ HOẠCH') || rowText.includes('CHỦ ĐẦU TƯ')) {
        Logger.log('   → ⭐ ĐÂY LÀ HEADER ROW!\n');
        
        // Hiển thị chi tiết header
        Logger.log('📋 CHI TIẾT HEADER (Row ' + row + '):\n');
        rowData.forEach(function(cell, colIdx) {
          if (cell && String(cell).trim() !== '') {
            const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
            Logger.log('   ' + colLetter + ' (col ' + (colIdx + 1) + '): ' + cell);
          }
        });
        
        Logger.log('\n📍 DATA BẮT ĐẦU TỪ ROW: ' + (row + 1));
        
        // Hiển thị 3 dòng data mẫu
        Logger.log('\n📝 MẪU DATA (3 rows đầu):\n');
        const sampleData = sheet.getRange(row + 1, 1, Math.min(3, lastRow - row), Math.min(18, lastCol)).getValues();
        sampleData.forEach(function(dataRow, idx) {
          Logger.log('Data row ' + (idx + 1) + ':');
          dataRow.forEach(function(cell, colIdx) {
            const colLetter = String.fromCharCode(65 + colIdx);
            if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
              Logger.log('   ' + colLetter + ': ' + String(cell).substring(0, 50));
            }
          });
          Logger.log('');
        });
        
        break;
      }
    }
    
  } catch (e) {
    Logger.log('❌ LỖI: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
  
  Logger.log('\n=== KẾT THÚC PHÂN TÍCH ===');
}/**
 * ⭐ Phân tích file TBMT (Thông báo mời thầu)
 */
function analyzeTBMTFile() {
  Logger.log('=== PHÂN TÍCH FILE TBMT ===\n');
  
  // Lấy file từ folder TBMT
  const folderId = FOLDERS.TBMT; // ⭐ TBMT folder
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  
  if (!files.hasNext()) {
    Logger.log('❌ Không có file nào trong folder TBMT!');
    return;
  }
  
  const file = files.next();
  Logger.log('📄 Phân tích file: ' + file.getName() + '\n');
  
  try {
    const fileId = file.getId();
    const mimeType = file.getMimeType();
    
    let spreadsheet;
    
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      spreadsheet = SpreadsheetApp.openById(fileId);
    } else {
      Logger.log('Converting Excel to Google Sheets...');
      const blob = file.getBlob();
      const metadata = {
        title: 'TEMP_ANALYZE_TBMT_' + new Date().getTime(),
        mimeType: 'application/vnd.google-apps.spreadsheet'
      };
      const convertedFile = Drive.Files.insert(metadata, blob, { convert: true });
      spreadsheet = SpreadsheetApp.openById(convertedFile.id);
    }
    
    const sheet = spreadsheet.getSheets()[0];
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    Logger.log('📊 Kích thước sheet: ' + lastRow + ' rows x ' + lastCol + ' columns\n');
    
    // Tìm header row
    Logger.log('🔍 TÌM HEADER ROW:\n');
    
    for (var row = 1; row <= Math.min(15, lastRow); row++) {
      const rowData = sheet.getRange(row, 1, 1, Math.min(25, lastCol)).getValues()[0];
      const rowText = rowData.join(' | ');
      
      Logger.log('Row ' + row + ': ' + rowText.substring(0, 100));
      
      // Check if this is header
      if (rowText.includes('GÓI TIN') || rowText.includes('BÊN MỜI THẦU') || rowText.includes('GÓI THẦU')) {
        Logger.log('   → ⭐ ĐÂY LÀ HEADER ROW!\n');
        
        // Hiển thị chi tiết header
        Logger.log('📋 CHI TIẾT HEADER (Row ' + row + '):\n');
        rowData.forEach(function(cell, colIdx) {
          if (cell && String(cell).trim() !== '') {
            const colLetter = String.fromCharCode(65 + colIdx); // A, B, C...
            Logger.log('   ' + colLetter + ' (col ' + (colIdx + 1) + '): ' + cell);
          }
        });
        
        Logger.log('\n📍 DATA BẮT ĐẦU TỪ ROW: ' + (row + 1));
        
        // Hiển thị 3 dòng data mẫu
        Logger.log('\n📝 MẪU DATA (3 rows đầu):\n');
        const sampleData = sheet.getRange(row + 1, 1, Math.min(3, lastRow - row), Math.min(23, lastCol)).getValues();
        sampleData.forEach(function(dataRow, idx) {
          Logger.log('Data row ' + (idx + 1) + ':');
          dataRow.forEach(function(cell, colIdx) {
            const colLetter = String.fromCharCode(65 + colIdx);
            if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
              Logger.log('   ' + colLetter + ': ' + String(cell).substring(0, 50));
            }
          });
          Logger.log('');
        });
        
        break;
      }
    }
    
  } catch (e) {
    Logger.log('❌ LỖI: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
  
  Logger.log('\n=== KẾT THÚC PHÂN TÍCH ===');
}