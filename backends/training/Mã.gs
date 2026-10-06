/**
 * ============================================
 * MMH TRAINING MANAGEMENT SYSTEM
 * Google Apps Script for Training Management
 * Version 3.8 - Updated 30/03/2026
 * ============================================
 * 
 * CHANGES IN v3.8:
 * - SINGLE DOMAIN: Only send emails & calendar invites to @mani.inc
 *   (removed @manimedicalhanoi.com to fix duplicate calendar entries)
 *   Login still works with EITHER domain (prefix matching)
 * - PRE-TRAINING TIME INPUT: Trainer must confirm training time (From-To)
 *   for each session before sending Pre-Training email
 * - Email body now includes training time
 * - Calendar event uses trainer-specified time instead of default 9-10
 * - Training time displayed in Calendar Overview & Plan Calendar sheets
 * - Training time stored in DocumentProperties for persistent display
 * 
 * CHANGES IN v3.7:
 * - Calendar Overview: Shows Folder / Meeting Link / Record for ALL statuses (Plan + Completed)
 * - Calendar Overview: Fixed whitespace trim on key matching (real-time sync fix)
 * - Calendar Overview: Added SpreadsheetApp.flush() before sync for reliable real-time updates
 * - Plan Calendar: Now shows Folder + Meeting Link for Plan items
 * - Links displayed with icons: 📁 Folder, 🔗 Meeting Link, 📝 Record
 * - Better error logging in onEditTrigger for debugging
 * 
 * CHANGES IN v3.6:
 * - NEW COLUMN MAPPING: M=Meeting Link, N=Record, O=Summary&Feedback,
 *   P=Post Training Assessment, Q=Assessment Result, R/S=Checkboxes
 * - Meeting Link now read from sheet (column M) instead of dialog input
 * - sendPreTrainingEmails simplified: no more meetingLink/time params
 * - All getRange expanded to 18 columns (B through S)
 * 
 * CHANGES IN v3.5:
 * - Pre-Training dialog simplified: CC + Calendar only
 * - Internal Training validation: columns E-M must be filled before sending
 * 
 * CHANGES IN v3.4:
 * - Dual domain support: @manimedicalhanoi.com + @mani.inc
 * - Login works with either domain
 * - Emails sent to BOTH domains for every recipient
 * - Trainer also receives the email (TO list)
 * - CC autocomplete: no Enter needed, auto-includes typed text on Send
 * 
 * COLUMN MAPPING (v3.6):
 *   B(2)  = No             (ArrayFormula - DO NOT WRITE)
 *   C(3)  = Month          (ArrayFormula - DO NOT WRITE)
 *   D(4)  = Training Folder
 *   E(5)  = Actual Date
 *   F(6)  = Training Type
 *   G(7)  = Training Category
 *   H(8)  = Training Topic
 *   I(9)  = Training Purpose
 *   J(10) = Trainer
 *   K(11) = Target Audience
 *   L(12) = Status (Plan / Cancel / Completed)
 *   M(13) = Meeting Link        ★ NEW
 *   N(14) = Record Link         (was M)
 *   O(15) = Summary & Feedback  (was P)
 *   P(16) = Post Training Assessment (was N)
 *   Q(17) = Assessment Result   (was O)
 *   R(18) = Pre-Training ✓      (was Q)
 *   S(19) = After-Training ✓    (was R)
 * 
 * COMPLETE SYSTEM FLOW:
 * 
 * [Pre-Training Email] → Creates Folder + Status="Plan" + Email + Google Calendar (YELLOW)
 *   ↓ Trainer confirms training time (From-To) before sending
 *   ↓ All participants receive: Email with time + Calendar invite at specified time
 * 
 * [Status changed to "Cancel" in column L] → Calendar event DELETED for everyone
 *   ↓ Google sends cancellation notification to all guests automatically
 * 
 * [After-Training Email] → Validates required columns + Status="Completed" + Email + Calendar (GREEN)
 *   ↓ All participants see: Calendar event turns GREEN with [Completed] title
 * 
 * [Status changed manually in column L] → Real-time sync:
 *   - "Plan" → Calendar event YELLOW
 *   - "Completed" → Calendar event GREEN  
 *   - "Cancel" → Calendar event DELETED (disappears for everyone)
 *
 * TRIGGERS NEEDED:
 *   1. onEditTrigger → On edit (status/content changes)
 *   2. onChangeTrigger → On change (row deletion)
 *
 * OAUTH SCOPES (appsscript.json):
 *   spreadsheets, drive, gmail.send, calendar, userinfo.email,
 *   script.container.ui, script.external_request
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  SHEETS: {
    REPORT: 'Training Report FY67',
    PLAN: 'Training Plan FY67',
    OVERVIEW: 'Training Report FY67  Calendar',
    PLAN_CALENDAR: 'Training Plan Calendar',
    MASTER: 'Master'
  },
  // ★ v3.6: Updated column mapping
  REPORT_COLUMNS: {
    NO: 2,                        // B - ArrayFormula (DO NOT WRITE)
    MONTH: 3,                     // C - ArrayFormula (DO NOT WRITE)
    TRAINING_FOLDER: 4,           // D
    ACTUAL_DATE: 5,               // E
    TRAINING_TYPE: 6,             // F
    TRAINING_CATEGORY: 7,         // G
    TRAINING_TOPIC: 8,            // H
    TRAINING_PURPOSE: 9,          // I
    TRAINER: 10,                  // J
    TARGET_AUDIENCE: 11,          // K
    STATUS: 12,                   // L (Plan / Cancel / Completed)
    MEETING_LINK: 13,             // M ★ NEW
    RECORD_LINK: 14,              // N (was M=13)
    SUMMARY_FEEDBACK: 15,         // O (was P=16)
    POST_TRAINING_ASSESSMENT: 16, // P (was N=14)
    ASSESSMENT_RESULT: 17,        // Q (was O=15)
    PRE_TRAINING: 18,             // R (was Q=17)
    AFTER_TRAINING: 19            // S (was R=18)
  },
  DATA_START_ROW: 5,
  DATA_COLUMNS: 18,              // ★ v3.6: 18 columns (B2 through S19)
  PARENT_FOLDER_ID: '1L2MhTlISQ_cmj_7-X88i6jW7knNyGMvJ',
  FOLDER_MAP: {
  'Functional Skills': '18HOaDnd5WL9FjIrThBZqaUsHgtLkbwPw',
  'Product':           '1oBkfBQkyrqdHaxZJn1b2cw-R4EzKwNjC',
  'Compliance':        '14LTroYyR-QVEGSK8ken79ylUnS0YRa9N',
  'SOP':               '1lQE7reqTVQO9a_TxqJZEgFShDCVtQC8Z'
},
  // ★ v3.8: Both domains recognized for login, but only SEND_DOMAIN used for outgoing
  DOMAINS: ['manimedicalhanoi.com', 'mani.inc'],
  SEND_DOMAIN: 'mani.inc'
};

// ★ v3.8: CC_EMAIL_LIST - ONLY @mani.inc domain
const CC_EMAIL_LIST = [
  'manithailand@mani.inc',
  'manithailand2@mani.inc',
  'manithailand1@mani.inc',
  'tt.tuyen@mani.inc',
  'nt.ha@mani.inc',
  'marketing.mmh@mani.inc',
  'marketing.mmh2@mani.inc',
  'marketing.mmh1@mani.inc',
  'mmh.product@mani.inc',
  'mmh.admin@mani.inc',
  'mmh.danang@mani.inc',
  'mmh.hanoi@mani.inc',
  'mmh.saigon@mani.inc',
  'mmh.hanoi2@mani.inc',
  'mmh.saigon2@mani.inc',
  'vtt.hoa@mani.inc',
  'mmh.hanoi1@mani.inc',
  'mmh.backoffice1@mani.inc',
  'mmh.order@mani.inc',
  'mmh.backoffice@mani.inc',
  'manithailand3@mani.inc'
];

// ★ v3.8: EMAIL_MAPPING - ONLY @mani.inc domain
const EMAIL_MAPPING = {
  'Dao': 'manithailand@mani.inc',
  'Yong': 'manithailand2@mani.inc',
  'Man': 'manithailand3@mani.inc',
  'Sui': 'manithailand1@mani.inc',
  'Tuyen': 'tt.tuyen@mani.inc',
  'Nguyen Ha': 'nt.ha@mani.inc',
  'Thuong': 'marketing.mmh@mani.inc',
  'Trang': 'marketing.mmh2@mani.inc',
  'Duc Anh': 'marketing.mmh1@mani.inc',
  'Giang': 'mmh.product@mani.inc',
  'Quynh Anh': 'mmh.admin@mani.inc',
  'Vinh': 'mmh.danang@mani.inc',
  'Minh Viet': 'mmh.hanoi@mani.inc',
  'Phuong': 'mmh.saigon@mani.inc',
  'Viet Ha': 'mmh.hanoi2@mani.inc',
  'Khang': 'mmh.saigon2@mani.inc',
  'Hoa': 'vtt.hoa@mani.inc',
  'Ngoc': 'mmh.hanoi1@mani.inc',
  'Hau': 'mmh.backoffice1@mani.inc ',
  'Dam Viet': 'mmh.order@mani.inc',
  'Dam Ha': 'mmh.backoffice@mani.inc'
};

// ============================================
// MENU
// ============================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📧 Send Email')
    .addItem('Pre Training Email', 'showPreTrainingDialog')
    .addItem('After Training Email', 'showAfterTrainingDialog')
    .addToUi();
}

// ============================================
// TRIGGERS
// ============================================

function onEditTrigger(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.SHEETS.REPORT) return;
    var row = e.range.getRow();
    if (row < CONFIG.DATA_START_ROW) return;

    var col = e.range.getColumn();
    // ★ v3.7: columns B(2) through S(19)
    if (col >= 2 && col <= 19) {
      // ★ v3.7: Flush first to ensure latest data is written before calendar sync
      SpreadsheetApp.flush();

      try {
        updateTrainingOverviewSilent();
      } catch (ovErr) {
        Logger.log('Overview calendar sync error: ' + ovErr.message);
      }
      try {
        updateTrainingPlanCalendar();
      } catch (planErr) {
        Logger.log('Plan calendar sync error: ' + planErr.message);
      }

      if (col === CONFIG.REPORT_COLUMNS.STATUS) {
        var newStatus = (e.range.getValue() || '').toString().trim();
        if (newStatus === 'Cancel' || newStatus === 'Completed' || newStatus === 'Plan') {
          try {
            var rowData = sheet.getRange(row, 2, 1, CONFIG.DATA_COLUMNS).getValues()[0];
            var date = rowData[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2];
            var topic = rowData[CONFIG.REPORT_COLUMNS.TRAINING_TOPIC - 2];
            var audience = rowData[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE - 2];
            var category = rowData[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2];
            
            updateCalendarEventForStatus(date, topic, audience, category, newStatus);
            SpreadsheetApp.getActiveSpreadsheet().toast(
              'Status → ' + newStatus + '. Calendar synced.',
              'Calendar Sync', 4
            );
          } catch (calErr) {
            Logger.log('Google Calendar sync on status change error: ' + calErr.message);
          }
        }
      } else {
        SpreadsheetApp.getActiveSpreadsheet().toast('Calendar synced', 'Auto Update', 2);
      }
    }
  } catch (err) {
    Logger.log('onEditTrigger error: ' + err.message + ' | Stack: ' + err.stack);
  }
}

function onChangeTrigger(e) {
  try {
    if (!e) return;
    var changeType = e.changeType;
    if (changeType === 'REMOVE_ROW' || changeType === 'INSERT_ROW') {
      var activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      if (activeSheet.getName() !== CONFIG.SHEETS.REPORT) return;
      Logger.log('onChange detected: ' + changeType + ' - syncing calendars...');
      updateTrainingOverviewSilent();
      updateTrainingPlanCalendar();
      SpreadsheetApp.getActiveSpreadsheet().toast('Calendar synced (row ' + changeType.toLowerCase().replace('_', ' ') + ')', 'Auto Update', 3);
    }
  } catch (err) {
    Logger.log('onChangeTrigger error: ' + err.message);
  }
}

// ============================================
// ★ v3.8: SINGLE DOMAIN UTILITY FUNCTIONS
// Login recognizes BOTH domains, but outgoing only uses @mani.inc
// ============================================

function getEmailPrefix(email) {
  if (!email) return '';
  var atIndex = email.indexOf('@');
  if (atIndex === -1) return email.toLowerCase().trim();
  return email.substring(0, atIndex).toLowerCase().trim();
}

function isKnownDomain(email) {
  if (!email) return false;
  var lower = email.toLowerCase().trim();
  for (var i = 0; i < CONFIG.DOMAINS.length; i++) {
    if (lower.endsWith('@' + CONFIG.DOMAINS[i])) return true;
  }
  return false;
}

/**
 * ★ v3.8: CHANGED - Only expands to @mani.inc (single domain)
 * Previously returned both @manimedicalhanoi.com and @mani.inc
 */
function expandToDualDomain(email) {
  if (!email) return [];
  var trimmed = email.trim();
  if (!isKnownDomain(trimmed)) return [trimmed];
  var prefix = getEmailPrefix(trimmed);
  // ★ v3.8: Only return @mani.inc
  return [prefix + '@' + CONFIG.SEND_DOMAIN];
}

function expandAllToDualDomain(emailArray) {
  if (!emailArray || emailArray.length === 0) return [];
  var seen = {};
  var result = [];
  for (var i = 0; i < emailArray.length; i++) {
    var expanded = expandToDualDomain(emailArray[i]);
    for (var j = 0; j < expanded.length; j++) {
      var key = expanded[j].toLowerCase();
      if (!seen[key]) { seen[key] = true; result.push(expanded[j]); }
    }
  }
  return result;
}

function getTrainerEmails(trainerName) {
  var baseEmail = EMAIL_MAPPING[trainerName];
  if (!baseEmail) return [];
  return expandToDualDomain(baseEmail);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * ★ v3.8: Login still matches by prefix, so BOTH domains work for login
 */
function getCurrentUserName() {
  var email = Session.getActiveUser().getEmail().toLowerCase().trim();
  var loginPrefix = getEmailPrefix(email);
  for (var name in EMAIL_MAPPING) {
    var mappedPrefix = getEmailPrefix(EMAIL_MAPPING[name]);
    if (mappedPrefix === loginPrefix) return name;
  }
  return null;
}

function getAudienceEmails(audience) {
  if (!audience) return null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.getSheetByName(CONFIG.SHEETS.MASTER);
  if (master) {
    var lr = master.getLastRow();
    if (lr >= 3) {
      var data = master.getRange(3, 6, lr - 2, 2).getValues();
      for (var i = 0; i < data.length; i++) {
        if ((data[i][0] || '').toString().trim() === audience.trim() && data[i][1]) {
          var baseEmails = data[i][1].toString().split(/[;,]/).map(function(e) { return e.trim(); }).filter(function(e) { return e && e.includes('@'); });
          return expandAllToDualDomain(baseEmails);
        }
      }
    }
  }
  if (EMAIL_MAPPING[audience]) return expandToDualDomain(EMAIL_MAPPING[audience]);
  return null;
}

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  var d = new Date(date);
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function formatDateForFolder(date) {
  if (!date) return '';
  if (typeof date === 'string') { var p = date.split('/'); if (p.length === 3) return p[2] + p[1] + p[0]; return date; }
  var d = new Date(date);
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Get trainer data for dialog display
 * ★ v3.6: Updated to read 18 columns and use new column mapping
 */
function getTrainerData(filterMode) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.REPORT);
  var currentUserName = getCurrentUserName();
  if (!currentUserName) return { error: 'Cannot identify user from login email. Please check email mapping.' };

  var lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) return { error: 'No training data available.' };

  var data = sheet.getRange(CONFIG.DATA_START_ROW, 2, lastRow - CONFIG.DATA_START_ROW + 1, CONFIG.DATA_COLUMNS).getValues();
  var result = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var trainer = row[CONFIG.REPORT_COLUMNS.TRAINER - 2];
    if (trainer !== currentUserName) continue;

    var status = (row[CONFIG.REPORT_COLUMNS.STATUS - 2] || '').toString().trim();
    var preChecked = row[CONFIG.REPORT_COLUMNS.PRE_TRAINING - 2];
    var afterChecked = row[CONFIG.REPORT_COLUMNS.AFTER_TRAINING - 2];

    if (filterMode === 'pre') {
      if (status !== '' && status !== 'Plan') continue;
      if (preChecked) continue;
    } else if (filterMode === 'after') {
      if (status !== 'Plan') continue;
      if (afterChecked) continue;
    }

    result.push({
      rowIndex: i + CONFIG.DATA_START_ROW,
      actualDate: formatDate(row[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2]),
      trainingType: row[CONFIG.REPORT_COLUMNS.TRAINING_TYPE - 2],
      trainingCategory: row[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2],
      trainingTopic: row[CONFIG.REPORT_COLUMNS.TRAINING_TOPIC - 2],
      trainingPurpose: row[CONFIG.REPORT_COLUMNS.TRAINING_PURPOSE - 2],
      trainer: trainer,
      targetAudience: row[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE - 2],
      trainingFolder: row[CONFIG.REPORT_COLUMNS.TRAINING_FOLDER - 2],
      status: status,
      meetingLink: row[CONFIG.REPORT_COLUMNS.MEETING_LINK - 2],
      recordLink: row[CONFIG.REPORT_COLUMNS.RECORD_LINK - 2],
      summaryFeedback: row[CONFIG.REPORT_COLUMNS.SUMMARY_FEEDBACK - 2],
      postTrainingAssessment: row[CONFIG.REPORT_COLUMNS.POST_TRAINING_ASSESSMENT - 2],
      assessmentResult: row[CONFIG.REPORT_COLUMNS.ASSESSMENT_RESULT - 2],
      preTrainingChecked: preChecked,
      afterTrainingChecked: afterChecked
    });
  }

  return { data: result, trainerName: currentUserName };
}

function hasHyperlink(sheet, row, col) {
  var cell = sheet.getRange(row, col);
  var rt = cell.getRichTextValue();
  if (rt) { if (rt.getLinkUrl()) return true; var runs = rt.getRuns(); for (var r = 0; r < runs.length; r++) { if (runs[r].getLinkUrl()) return true; } }
  var f = cell.getFormula(); if (f && f.toUpperCase().includes('HYPERLINK')) return true;
  var v = cell.getValue(); if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) return true;
  return false;
}

function getHyperlinkUrl(sheet, row, col) {
  var cell = sheet.getRange(row, col);
  var rt = cell.getRichTextValue();
  if (rt) { var u = rt.getLinkUrl(); if (u) return u; var runs = rt.getRuns(); for (var r = 0; r < runs.length; r++) { var url = runs[r].getLinkUrl(); if (url) return url; } }
  var f = cell.getFormula(); if (f) { var m = f.match(/HYPERLINK\s*\(\s*"([^"]+)"/i); if (m) return m[1]; }
  var v = cell.getValue(); if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) return v;
  return null;
}

function writeValueWithValidation(sheet, row, col, value) {
  var cell = sheet.getRange(row, col);
  var val = cell.getDataValidation();
  cell.clearDataValidations();
  cell.setValue(value);
  if (val) cell.setDataValidation(val);
}

// ============================================
// CALENDAR EVENT ID STORAGE
// ============================================

function getCalendarEventKey(date, topic, audience) {
  var dateStr = '';
  if (date instanceof Date) {
    dateStr = date.getFullYear() + '' + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
  } else if (typeof date === 'string') {
    dateStr = date.replace(/\//g, '');
  } else {
    dateStr = String(date);
  }
  return 'calEvt_' + dateStr + '|' + (topic || '').toString().trim() + '|' + (audience || '').toString().trim();
}

function saveCalendarEventId(date, topic, audience, eventId) {
  var key = getCalendarEventKey(date, topic, audience);
  PropertiesService.getDocumentProperties().setProperty(key, eventId);
  Logger.log('Saved calendar event ID: ' + key + ' -> ' + eventId);
}

function getCalendarEventId(date, topic, audience) {
  var key = getCalendarEventKey(date, topic, audience);
  return PropertiesService.getDocumentProperties().getProperty(key);
}

function removeCalendarEventId(date, topic, audience) {
  var key = getCalendarEventKey(date, topic, audience);
  PropertiesService.getDocumentProperties().deleteProperty(key);
}

// ============================================
// ★ v3.8: TRAINING TIME STORAGE
// Stores training time (HH:MM - HH:MM) per session
// Used for calendar overview display
// ============================================

function getTrainingTimeKey(date, topic, audience) {
  var dateStr = '';
  if (date instanceof Date) {
    dateStr = date.getFullYear() + '' + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
  } else if (typeof date === 'string') {
    dateStr = date.replace(/\//g, '');
  } else {
    dateStr = String(date);
  }
  return 'trainTime_' + dateStr + '|' + (topic || '').toString().trim() + '|' + (audience || '').toString().trim();
}

function saveTrainingTime(date, topic, audience, timeFrom, timeTo) {
  var key = getTrainingTimeKey(date, topic, audience);
  var timeStr = timeFrom + ' - ' + timeTo;
  PropertiesService.getDocumentProperties().setProperty(key, timeStr);
  Logger.log('Saved training time: ' + key + ' -> ' + timeStr);
}

function getTrainingTime(date, topic, audience) {
  var key = getTrainingTimeKey(date, topic, audience);
  return PropertiesService.getDocumentProperties().getProperty(key);
}

// ============================================
// CALENDAR EVENT STATUS UPDATE
// ============================================

function updateCalendarEventForStatus(date, topic, audience, category, newStatus) {
  var eventId = getCalendarEventId(date, topic, audience);
  if (!eventId) {
    Logger.log('No calendar event found for: ' + topic + ' / ' + audience);
    return;
  }

  try {
    var calendar = CalendarApp.getDefaultCalendar();
    var event = calendar.getEventById(eventId);

    if (!event) {
      Logger.log('Calendar event not found (may have been deleted): ' + eventId);
      removeCalendarEventId(date, topic, audience);
      return;
    }

    if (newStatus === 'Cancel') {
      event.deleteEvent();
      removeCalendarEventId(date, topic, audience);
      Logger.log('Calendar event CANCELLED and deleted: ' + eventId);

    } else if (newStatus === 'Completed') {
      var currentTitle = event.getTitle();
      if (currentTitle.indexOf('[Completed]') === -1) {
        event.setTitle('[Completed] ' + currentTitle.replace('[Training]', '').replace('[Cancelled]', '').trim());
      }
      var currentDesc = event.getDescription();
      event.setDescription('STATUS: COMPLETED\n\n' + currentDesc.replace(/^STATUS:.*\n\n/m, ''));
      try { event.setColor(CalendarApp.EventColor.GREEN); } catch (e) {}
      Logger.log('Calendar event updated to COMPLETED: ' + eventId);

    } else if (newStatus === 'Plan') {
      var currentTitle = event.getTitle();
      var cleanTitle = currentTitle.replace('[Completed]', '').replace('[Cancelled]', '').trim();
      if (cleanTitle.indexOf('[Training]') === -1) cleanTitle = '[Training] ' + cleanTitle;
      event.setTitle(cleanTitle);
      var currentDesc = event.getDescription();
      event.setDescription('STATUS: PLANNED\n\n' + currentDesc.replace(/^STATUS:.*\n\n/m, ''));
      try { event.setColor(CalendarApp.EventColor.YELLOW); } catch (e) {}
      Logger.log('Calendar event restored to PLAN: ' + eventId);
    }

  } catch (error) {
    Logger.log('updateCalendarEventForStatus error: ' + error.message);
  }
}

// ============================================================
// PATCH v3.8 → v3.9: MULTI-FOLDER SUPPORT BY TRAINING CATEGORY
// Chỉ thay thế 2 đoạn code dưới đây trong file Apps Script
// ============================================================

// ============================================================
// ĐOẠN 1: Thay thế trong CONFIG object
// Tìm dòng: PARENT_FOLDER_ID: '1L2MhTlISQ_cmj_7-X88i6jW7knNyGMvJ',
// Thay bằng:
// ============================================================

/*
  PARENT_FOLDER_ID: '1L2MhTlISQ_cmj_7-X88i6jW7knNyGMvJ', // fallback nếu category không khớp
  FOLDER_MAP: {
    'Functional Skills': '18HOaDnd5WL9FjIrThBZqaUsHgtLkbwPw',
    'Product':           '1oBkfBQkyrqdHaxZJn1b2cw-R4EzKwNjC',
    'Compliance':        '14LTroYyR-QVEGSK8ken79ylUnS0YRa9N',
    'SOP':               '1lQE7reqTVQO9a_TxqJZEgFShDCVtQC8Z'
  },
*/

// ============================================================
// ĐOẠN 2: Thay thế toàn bộ hàm createTrainingFolderForRow
// ============================================================

function createTrainingFolderForRow(rowIndex, updateStatus) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.REPORT);

    // Nếu folder đã tồn tại → trả về luôn, không tạo lại
    if (hasHyperlink(sheet, rowIndex, CONFIG.REPORT_COLUMNS.TRAINING_FOLDER)) {
      return {
        success: true,
        folderUrl: getHyperlinkUrl(sheet, rowIndex, CONFIG.REPORT_COLUMNS.TRAINING_FOLDER),
        folderName: 'existing'
      };
    }

    var rowData = sheet.getRange(rowIndex, 2, 1, CONFIG.DATA_COLUMNS).getValues()[0];
    var actualDate       = rowData[CONFIG.REPORT_COLUMNS.ACTUAL_DATE       - 2];
    var trainingType     = rowData[CONFIG.REPORT_COLUMNS.TRAINING_TYPE     - 2];
    var trainingCategory = (rowData[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2] || '').toString().trim();
    var targetAudience   = rowData[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE   - 2];

    // ★ v3.9: Chọn folder mẹ dựa trên Training Category (cột G)
    var parentFolderId = CONFIG.FOLDER_MAP[trainingCategory] || CONFIG.PARENT_FOLDER_ID;
    Logger.log('createTrainingFolderForRow: category="' + trainingCategory + '" → parentFolderId=' + parentFolderId);

    var dateStr    = formatDateForFolder(actualDate);
    var folderName = dateStr + '_' + trainingType + '_' + trainingCategory + '_' + targetAudience;

    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var newFolder    = parentFolder.createFolder(folderName);
    var folderUrl    = newFolder.getUrl();

    // Ghi hyperlink vào cột D
    var cell = sheet.getRange(rowIndex, CONFIG.REPORT_COLUMNS.TRAINING_FOLDER);
    cell.setRichTextValue(
      SpreadsheetApp.newRichTextValue()
        .setText(folderName)
        .setLinkUrl(folderUrl)
        .build()
    );

    // Set status = "Plan" nếu được yêu cầu
    if (updateStatus) {
      writeValueWithValidation(sheet, rowIndex, CONFIG.REPORT_COLUMNS.STATUS, 'Plan');
    }

    Logger.log('Folder created: ' + folderName + ' in ' + parentFolderId);
    return { success: true, folderUrl: folderUrl, folderName: folderName };

  } catch (error) {
    Logger.log('createTrainingFolderForRow error: ' + error.message);
    return { success: false, message: error.message };
  }
}

// ============================================
// SHARED CC AUTOCOMPLETE COMPONENT
// ============================================

function getCcAutocompleteCss() {
  return '.cc-wrapper{position:relative;}'
    + '.cc-chips{display:flex;flex-wrap:wrap;gap:5px;padding:8px;border:1px solid #ccc;border-radius:4px;min-height:38px;background:white;cursor:text;}'
    + '.cc-chips:focus-within{border-color:#4472C4;box-shadow:0 0 4px rgba(68,114,196,.3);}'
    + '.cc-chip{background:#4472C4;color:white;padding:3px 8px;border-radius:12px;font-size:12px;display:flex;align-items:center;}'
    + '.cc-chip-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.cc-chip-x{margin-left:6px;cursor:pointer;font-weight:bold;font-size:14px;line-height:1;}'
    + '.cc-chip-x:hover{color:#ff6b6b;}'
    + '.cc-input{border:none;outline:none;flex:1;min-width:180px;font-size:13px;padding:4px 0;}'
    + '.cc-dropdown{position:absolute;left:0;right:0;top:100%;background:white;border:1px solid #ccc;border-top:none;border-radius:0 0 4px 4px;max-height:180px;overflow-y:auto;z-index:999;display:none;}'
    + '.cc-dropdown.open{display:block;}'
    + '.cc-option{padding:8px 12px;cursor:pointer;font-size:13px;}'
    + '.cc-option:hover,.cc-option.active{background:#e8f4fc;}'
    + '.cc-option .cc-highlight{font-weight:bold;color:#4472C4;}';
}

function getCcAutocompleteJs(s) {
  s = s || '';
  return 'var ccEmails' + s + '=[];'
    + 'var ccAllEmails' + s + '=' + JSON.stringify(CC_EMAIL_LIST) + ';'
    + 'var ccActiveIdx' + s + '=-1;'
    + 'function ccRender' + s + '(){var c=document.getElementById("ccChips' + s + '");c.innerHTML=ccEmails' + s + '.map(function(em,i){'
    + '  var isCustom=ccAllEmails' + s + '.indexOf(em)===-1;'
    + '  var bgColor=isCustom?"#6c757d":"#4472C4";'
    + '  return\'<span class="cc-chip" style="background:\'+bgColor+\'"><span class="cc-chip-text">\'+escapeHtml(em)+\'</span><span class="cc-chip-x" onclick="ccRemove' + s + '(\'+i+\')">&times;</span></span>\';'
    + '}).join("")+\'<input class="cc-input" id="ccInput' + s + '" type="text" placeholder="Type to search or enter email address..." oninput="ccFilter' + s + '()" onkeydown="ccKeydown' + s + '(event)" onfocus="ccFilter' + s + '()" onblur="setTimeout(function(){ccClose' + s + '()},200)">\';}'
    + 'function ccRemove' + s + '(i){ccEmails' + s + '.splice(i,1);ccRender' + s + '();}'
    + 'function ccFilter' + s + '(){var inp=document.getElementById("ccInput' + s + '");if(!inp)return;var q=inp.value.toLowerCase();var dd=document.getElementById("ccDropdown' + s + '");var f=ccAllEmails' + s + '.filter(function(e){return e.toLowerCase().indexOf(q)!==-1&&ccEmails' + s + '.indexOf(e)===-1;});if(f.length===0||q.length===0){dd.classList.remove("open");dd.innerHTML="";ccActiveIdx' + s + '=-1;return;}dd.innerHTML=f.map(function(e,i){var h=e.replace(new RegExp("("+q.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&")+")","gi"),\'<span class="cc-highlight">$1</span>\');return\'<div class="cc-option" data-email="\'+e+\'" onclick="ccPick' + s + '(this)" onmouseenter="ccActiveIdx' + s + '=\'+i+\';ccHL' + s + '()">\'+h+\'</div>\';}).join("");dd.classList.add("open");ccActiveIdx' + s + '=-1;}'
    + 'function ccPick' + s + '(el){var e=el.getAttribute("data-email");if(e&&ccEmails' + s + '.indexOf(e)===-1)ccEmails' + s + '.push(e);ccRender' + s + '();ccClose' + s + '();}'
    + 'function ccClose' + s + '(){var d=document.getElementById("ccDropdown' + s + '");if(d){d.classList.remove("open");d.innerHTML="";}ccActiveIdx' + s + '=-1;}'
    + 'function ccKeydown' + s + '(e){'
    + '  var dd=document.getElementById("ccDropdown' + s + '");var opts=dd.querySelectorAll(".cc-option");'
    + '  if(e.key==="ArrowDown"){e.preventDefault();ccActiveIdx' + s + '=Math.min(ccActiveIdx' + s + '+1,opts.length-1);ccHL' + s + '();}'
    + '  else if(e.key==="ArrowUp"){e.preventDefault();ccActiveIdx' + s + '=Math.max(ccActiveIdx' + s + '-1,0);ccHL' + s + '();}'
    + '  else if(e.key==="Enter"){'
    + '    e.preventDefault();'
    + '    if(ccActiveIdx' + s + '>=0&&opts[ccActiveIdx' + s + ']){ccPick' + s + '(opts[ccActiveIdx' + s + ']);}'
    + '    else{'
    + '      var cv=e.target.value.trim();'
    + '      if(cv&&cv.indexOf("@")!==-1&&ccEmails' + s + '.indexOf(cv)===-1){ccEmails' + s + '.push(cv);ccRender' + s + '();ccClose' + s + '();}'
    + '    }'
    + '  }'
    + '  else if(e.key==="Backspace"&&e.target.value===""&&ccEmails' + s + '.length>0){ccEmails' + s + '.pop();ccRender' + s + '();}'
    + '}'
    + 'function ccHL' + s + '(){var opts=document.getElementById("ccDropdown' + s + '").querySelectorAll(".cc-option");for(var i=0;i<opts.length;i++)opts[i].classList.remove("active");if(ccActiveIdx' + s + '>=0&&opts[ccActiveIdx' + s + ']){opts[ccActiveIdx' + s + '].classList.add("active");opts[ccActiveIdx' + s + '].scrollIntoView({block:"nearest"});}}'
    // Auto-includes typed text on Send (no Enter needed)
    + 'function getCcStr' + s + '(){'
    + '  var inp=document.getElementById("ccInput' + s + '");'
    + '  if(inp&&inp.value.trim()&&inp.value.trim().indexOf("@")!==-1){'
    + '    var cv=inp.value.trim();'
    + '    if(ccEmails' + s + '.indexOf(cv)===-1)ccEmails' + s + '.push(cv);'
    + '  }'
    + '  return ccEmails' + s + '.join(",");'
    + '}'
    + 'document.addEventListener("DOMContentLoaded",function(){ccRender' + s + '();});';
}

function getCcAutocompleteHtml(s) {
  s = s || '';
  return '<div class="cc-wrapper"><div class="cc-chips" id="ccChips' + s + '" onclick="var inp=document.getElementById(\'ccInput' + s + '\');if(inp)inp.focus();"></div><div class="cc-dropdown" id="ccDropdown' + s + '"></div></div>';
}

// ============================================
// PRE-TRAINING EMAIL
// ★ v3.8: Added training time input (From-To) per session
// ★ v3.6: Meeting Link read from sheet column M
// Dialog has CC + Calendar + Time
// ============================================

function showPreTrainingDialog() {
  var result = getTrainerData('pre');
  if (result.error) { SpreadsheetApp.getUi().alert('Error', result.error, SpreadsheetApp.getUi().ButtonSet.OK); return; }
  if (result.data.length === 0) { SpreadsheetApp.getUi().alert('Notification', 'No training sessions require Pre-Training email.', SpreadsheetApp.getUi().ButtonSet.OK); return; }
  var html = createPreTrainingDialogHtml(result.data, result.trainerName);
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(850).setHeight(600), 'Pre Training - Send notification email');
}

/**
 * ★ v3.8: Pre-Training dialog now includes time input per session in Step 2
 */
function createPreTrainingDialogHtml(data, trainerName) {
  var rows = '';
  for (var i = 0; i < data.length; i++) {
    var it = data[i];
    rows += '<tr><td style="padding:8px;border:1px solid #ddd;"><input type="checkbox" name="training" value="' + it.rowIndex + '" data-topic="' + escapeHtml(it.trainingTopic) + '" data-audience="' + escapeHtml(it.targetAudience) + '" data-date="' + it.actualDate + '"></td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + it.actualDate + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.trainingType) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.trainingCategory) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.trainingTopic) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.targetAudience) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + (it.status || '<span style="color:#999;">Empty</span>') + '</td></tr>';
  }
  var ccCss = getCcAutocompleteCss(), ccHtml = getCcAutocompleteHtml('P'), ccJs = getCcAutocompleteJs('P');

  return '<!DOCTYPE html><html><head><style>'
    + 'body{font-family:Calibri,Arial,sans-serif;font-size:14px;padding:15px;margin:0;}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:15px;}'
    + 'th{background:#4472C4;color:white;padding:10px 8px;border:1px solid #ddd;text-align:left;}'
    + 'td{padding:8px;border:1px solid #ddd;}tr:nth-child(even){background:#f9f9f9;}tr:hover{background:#e8f4fc;}'
    + '.btn-container{text-align:right;margin-top:15px;}'
    + 'button{padding:10px 20px;margin-left:10px;cursor:pointer;font-size:14px;border-radius:4px;}'
    + '.btn-next{background:#4472C4;color:white;border:none;}.btn-next:hover{background:#3366b3;}'
    + '.btn-send{background:#28a745;color:white;border:none;}.btn-send:hover{background:#218838;}'
    + '.btn-back{background:#6c757d;color:white;border:none;}.btn-back:hover{background:#5a6268;}'
    + '.btn-cancel{background:#f0f0f0;color:#333;border:1px solid #ccc;}.btn-cancel:hover{background:#e0e0e0;}'
    + '.info{background:#e8f4fc;padding:10px;border-radius:4px;margin-bottom:15px;}'
    + '.step{display:none;}.step.active{display:block;}'
    + '.form-group{margin-bottom:15px;}.form-group label{display:block;font-weight:bold;margin-bottom:5px;}'
    + '.form-group small{color:#666;display:block;margin-top:5px;}'
    + '.selected-summary{background:#e8f4fc;padding:15px;border-radius:4px;margin-bottom:15px;}'
    + '.selected-summary ul{margin:10px 0 0;padding-left:20px;}'
    + '#status{margin-top:10px;padding:10px;display:none;border-radius:4px;}'
    + '.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}'
    + '.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}'
    // ★ v3.8: Time input styles
    + '.time-section{background:#fff8e1;padding:15px;border-radius:4px;border:1px solid #ffe082;margin-bottom:15px;}'
    + '.time-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:8px;background:white;border-radius:4px;border:1px solid #eee;}'
    + '.time-row:last-child{margin-bottom:0;}'
    + '.time-row label{font-weight:bold;flex:1;font-size:13px;}'
    + '.time-row input[type=time]{padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:14px;width:120px;}'
    + '.time-row span.time-dash{font-weight:bold;color:#666;}'
    + ccCss
    + '</style></head><body>'
    // STEP 1
    + '<div id="step1" class="step active">'
    + '<div class="info"><strong>Step 1/2 - Trainer:</strong> ' + trainerName + '<br><small>Select training sessions to send Pre-Training notification email</small></div>'
    + '<table><thead><tr><th style="width:40px;">Select</th><th>Date</th><th>Type</th><th>Category</th><th>Topic</th><th>Audience</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="btn-container"><button class="btn-cancel" onclick="google.script.host.close()">Close</button><button class="btn-next" onclick="goToStep2()">Next &rarr;</button></div></div>'
    // STEP 2 - CC + Calendar + ★ v3.8: Training Time
    + '<div id="step2" class="step">'
    + '<div class="info"><strong>Step 2/2 - Training Time, CC &amp; Calendar</strong><br><small>Confirm training time, add CC recipients and send</small></div>'
    // ★ v3.8: Training Time Section
    + '<div class="time-section">'
    + '<label style="display:block;font-weight:bold;margin-bottom:10px;">⏰ Training Time (Required)</label>'
    + '<small style="color:#666;display:block;margin-bottom:10px;">Please confirm the training time for each session below:</small>'
    + '<div id="timeInputs"></div>'
    + '</div>'
    + '<div id="selSummary" class="selected-summary"><strong>Selected:</strong><ul id="selList"></ul></div>'
    + '<div class="form-group"><label>CC Emails (Optional)</label>' + ccHtml + '<small>Type to search from list or type an email address. No need to press Enter - it will be included automatically.</small></div>'
    + '<div class="form-group" style="background:#f8f9fa;padding:12px;border-radius:4px;border:1px solid #e0e0e0;">'
    + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">'
    + '<input type="checkbox" id="addToCalendar" checked style="width:18px;height:18px;flex-shrink:0;">'
    + '<span>Add to Google Calendar</span></label>'
    + '<small style="margin-left:26px;">Creates a calendar event and sends invite to all attendees (audience + CC)</small></div>'
    + '<div id="status"></div>'
    + '<div class="btn-container"><button class="btn-back" onclick="goBack()">&larr; Back</button><button class="btn-cancel" onclick="google.script.host.close()">Close</button><button class="btn-send" onclick="doSend()">Send Emails</button></div></div>'
    + '<script>'
    + 'var selRows=[],selDetails=[];'
    + 'function escapeHtml(t){if(!t)return"";var d=document.createElement("div");d.textContent=t;return d.innerHTML;}'
    + 'function goToStep2(){'
    + '  var cbs=document.querySelectorAll("input[name=training]:checked");'
    + '  if(cbs.length===0){alert("Please select at least one session.");return;}'
    + '  selRows=[];selDetails=[];'
    + '  cbs.forEach(function(c){'
    + '    selRows.push(parseInt(c.value));'
    + '    selDetails.push({row:parseInt(c.value),topic:c.getAttribute("data-topic"),audience:c.getAttribute("data-audience"),date:c.getAttribute("data-date")});'
    + '  });'
    // Build time inputs for each selected session
    + '  var timeHtml="";'
    + '  selDetails.forEach(function(x,idx){'
    + '    timeHtml+="<div class=\\"time-row\\">"'
    + '      +"<label>"+escapeHtml(x.topic)+" ("+escapeHtml(x.audience)+") - "+x.date+"</label>"'
    + '      +"<input type=\\"time\\" id=\\"timeFrom_"+idx+"\\" value=\\"09:00\\">"'
    + '      +"<span class=\\"time-dash\\"> — </span>"'
    + '      +"<input type=\\"time\\" id=\\"timeTo_"+idx+"\\" value=\\"10:00\\">"'
    + '      +"</div>";'
    + '  });'
    + '  document.getElementById("timeInputs").innerHTML=timeHtml;'
    + '  document.getElementById("selList").innerHTML=selDetails.map(function(x){'
    + '    return"<li><strong>"+escapeHtml(x.topic)+"</strong> for "+escapeHtml(x.audience)+" on "+x.date+"</li>";'
    + '  }).join("");'
    + '  document.getElementById("step1").classList.remove("active");'
    + '  document.getElementById("step2").classList.add("active");'
    + '}'
    + 'function goBack(){document.getElementById("step2").classList.remove("active");document.getElementById("step1").classList.add("active");}'
    // ★ v3.8: Collect time data and pass to backend
    + 'function doSend(){'
    + '  var cc=getCcStrP();'
    + '  var cal=document.getElementById("addToCalendar").checked;'
    // Validate and collect times
    + '  var timesData=[];'
    + '  var timeValid=true;'
    + '  for(var i=0;i<selDetails.length;i++){'
    + '    var tf=document.getElementById("timeFrom_"+i).value;'
    + '    var tt=document.getElementById("timeTo_"+i).value;'
    + '    if(!tf||!tt){alert("Please enter training time for all sessions.");timeValid=false;break;}'
    + '    if(tf>=tt){alert("End time must be after start time for: "+selDetails[i].topic);timeValid=false;break;}'
    + '    timesData.push({row:selDetails[i].row,timeFrom:tf,timeTo:tt});'
    + '  }'
    + '  if(!timeValid)return;'
    + '  showStatus("Creating folders, sending emails"+(cal?" & calendar invites":"")+"...","success");'
    + '  google.script.run'
    + '    .withSuccessHandler(function(r){'
    + '      if(r.success){showStatus(r.message,"success");setTimeout(function(){google.script.host.close();},2500);}'
    + '      else{showStatus(r.message,"error");}'
    + '    })'
    + '    .withFailureHandler(function(e){showStatus("Error: "+e.message,"error");})'
    + '    .sendPreTrainingEmails(selRows,cc,cal,timesData);'
    + '}'
    + 'function showStatus(m,t){var s=document.getElementById("status");s.textContent=m;s.className=t;s.style.display="block";}'
    + ccJs
    + '</script></body></html>';
}

/**
 * Send Pre-Training emails
 * ★ v3.8: Added timesData param [{row, timeFrom, timeTo}]
 *          Emails sent only to @mani.inc
 *          Training time included in email body
 * ★ v3.6: Meeting Link read from sheet column M
 * Internal Training: validates columns E-M before sending
 */
function sendPreTrainingEmails(selectedRows, ccEmailsStr, addToCalendar, timesData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.REPORT);
  var successCount = 0, errorMessages = [];
  var calendarCount = 0;

  Logger.log('===== sendPreTrainingEmails v3.8 =====');
  Logger.log('selectedRows: ' + JSON.stringify(selectedRows));
  Logger.log('ccEmailsStr: ' + ccEmailsStr);
  Logger.log('addToCalendar: ' + addToCalendar);
  Logger.log('timesData: ' + JSON.stringify(timesData));

  // ★ v3.8: Build a lookup map for time data by row
  var timeMap = {};
  if (timesData && timesData.length > 0) {
    for (var t = 0; t < timesData.length; t++) {
      timeMap[timesData[t].row] = { timeFrom: timesData[t].timeFrom, timeTo: timesData[t].timeTo };
    }
  }

  var ccList = [];
  if (ccEmailsStr && ccEmailsStr.trim()) {
    var rawCcList = ccEmailsStr.split(',').map(function(e) { return e.trim(); }).filter(function(e) { return e && e.includes('@'); });
    ccList = expandAllToDualDomain(rawCcList);
  }

  var trainerName = getCurrentUserName();

  for (var r = 0; r < selectedRows.length; r++) {
    var rowIndex = selectedRows[r];
    try {
      var rowData = sheet.getRange(rowIndex, 2, 1, CONFIG.DATA_COLUMNS).getValues()[0];
      var rawDate = rowData[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2];
      var actualDate = formatDate(rawDate);
      var trainingType = (rowData[CONFIG.REPORT_COLUMNS.TRAINING_TYPE - 2] || '').toString().trim();
      var trainingCategory = rowData[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2];
      var trainingTopic = rowData[CONFIG.REPORT_COLUMNS.TRAINING_TOPIC - 2];
      var trainingPurpose = rowData[CONFIG.REPORT_COLUMNS.TRAINING_PURPOSE - 2];
      var trainer = rowData[CONFIG.REPORT_COLUMNS.TRAINER - 2];
      var targetAudience = rowData[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE - 2];

      // ★ v3.8: Get training time for this row
      var timeFrom = '09:00';
      var timeTo = '10:00';
      if (timeMap[rowIndex]) {
        timeFrom = timeMap[rowIndex].timeFrom;
        timeTo = timeMap[rowIndex].timeTo;
      }

      // ★ v3.6: Read Meeting Link from sheet column M
      var meetingLink = (rowData[CONFIG.REPORT_COLUMNS.MEETING_LINK - 2] || '').toString().trim();
      // Also check if it's a hyperlink
      if (!meetingLink) {
        var mlUrl = getHyperlinkUrl(sheet, rowIndex, CONFIG.REPORT_COLUMNS.MEETING_LINK);
        if (mlUrl) meetingLink = mlUrl;
      }

      // ★ v3.5: INTERNAL TRAINING VALIDATION - Columns E to M must be filled
      if (trainingType === 'Internal') {
        var internalRequired = [
          { col: CONFIG.REPORT_COLUMNS.ACTUAL_DATE, name: 'Actual Date (E)' },
          { col: CONFIG.REPORT_COLUMNS.TRAINING_TYPE, name: 'Training Type (F)' },
          { col: CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY, name: 'Training Category (G)' },
          { col: CONFIG.REPORT_COLUMNS.TRAINING_TOPIC, name: 'Training Topic (H)' },
          { col: CONFIG.REPORT_COLUMNS.TRAINING_PURPOSE, name: 'Training Purpose (I)' },
          { col: CONFIG.REPORT_COLUMNS.TRAINER, name: 'Trainer (J)' },
          { col: CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE, name: 'Target Audience (K)' },
          { col: CONFIG.REPORT_COLUMNS.STATUS, name: 'Status (L)' },
          { col: CONFIG.REPORT_COLUMNS.MEETING_LINK, name: 'Meeting Link (M)', isLink: true }
        ];
        var missingFields = [];
        for (var v = 0; v < internalRequired.length; v++) {
          var rc = internalRequired[v];
          if (rc.isLink) {
            var cellVal = rowData[rc.col - 2];
            var hasLink = hasHyperlink(sheet, rowIndex, rc.col);
            if (!cellVal && !hasLink) missingFields.push(rc.name);
          } else {
            var val = rowData[rc.col - 2];
            if (val === null || val === undefined || val.toString().trim() === '') {
              missingFields.push(rc.name);
            }
          }
        }
        if (missingFields.length > 0) {
          errorMessages.push('Row ' + rowIndex + ' [Internal Training]: Please complete the following before sending: ' + missingFields.join(', '));
          continue;
        }
      }

      var audienceEmails = getAudienceEmails(targetAudience);
      if (!audienceEmails || audienceEmails.length === 0) { errorMessages.push('Row ' + rowIndex + ': Email not found for "' + targetAudience + '"'); continue; }

      // ★ v3.8: Trainer emails - only @mani.inc
      var trainerDualEmails = getTrainerEmails(trainer);
      var allToEmails = [];
      var toSeen = {};
      for (var a = 0; a < audienceEmails.length; a++) {
        var key = audienceEmails[a].toLowerCase();
        if (!toSeen[key]) { toSeen[key] = true; allToEmails.push(audienceEmails[a]); }
      }
      for (var ti = 0; ti < trainerDualEmails.length; ti++) {
        var key = trainerDualEmails[ti].toLowerCase();
        if (!toSeen[key]) { toSeen[key] = true; allToEmails.push(trainerDualEmails[ti]); }
      }

      Logger.log('Row ' + rowIndex + ' TO (@mani.inc only): ' + JSON.stringify(allToEmails));
      Logger.log('Row ' + rowIndex + ' Meeting Link (from sheet): ' + meetingLink);
      Logger.log('Row ' + rowIndex + ' Training Time: ' + timeFrom + ' - ' + timeTo);

      // ===== CREATE FOLDER + SET STATUS = "Plan" =====
      var folderResult = createTrainingFolderForRow(rowIndex, true);
      var folderUrl = folderResult.success ? folderResult.folderUrl : '';

      // Detect platform from meeting link
      var platform = 'the meeting link';
      if (meetingLink) {
        var ll = meetingLink.toLowerCase();
        if (ll.indexOf('teams') !== -1) platform = 'Microsoft Teams';
        else if (ll.indexOf('zoom') !== -1) platform = 'Zoom';
        else if (ll.indexOf('meet.google') !== -1) platform = 'Google Meet';
      }

      // ===== HTML EMAIL =====
      // ★ v3.8: Added training time to email body
      var html = '<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#333;">'
        + '<p>Dear ' + escapeHtml(targetAudience) + ',</p>'
        + '<p>You have a training session on <strong>' + actualDate + '</strong>.</p>'
        + '<table style="border-collapse:collapse;margin:10px 0;">'
        + '<tr><td style="padding:6px 12px;font-weight:bold;">Trainer:</td><td style="padding:6px 12px;">' + escapeHtml(trainer) + '</td></tr>'
        + '<tr><td style="padding:6px 12px;font-weight:bold;">Topic:</td><td style="padding:6px 12px;">' + escapeHtml(trainingTopic) + '</td></tr>'
        + '<tr><td style="padding:6px 12px;font-weight:bold;">Time:</td><td style="padding:6px 12px;"><strong>' + timeFrom + ' - ' + timeTo + '</strong></td></tr>';
      if (trainingPurpose && trainingPurpose.toString().trim()) {
        html += '<tr><td style="padding:6px 12px;font-weight:bold;">Training Purpose:</td><td style="padding:6px 12px;">' + escapeHtml(trainingPurpose) + '</td></tr>';
      }
      html += '</table>';

      // ★ v3.6: Meeting link from sheet
      if (meetingLink) {
        html += '<p style="background:#e8f4fc;padding:12px;border-radius:4px;border-left:4px solid #4472C4;">'
          + 'Please access the following link via <strong>' + platform + '</strong> to attend this training session:<br>'
          + '<a href="' + meetingLink + '" style="color:#1a73e8;font-size:15px;font-weight:bold;">&#128279; Join ' + platform + ' Meeting</a></p>';
      }

      if (folderUrl) {
        html += '<p style="background:#f0f7ff;padding:12px;border-radius:4px;border-left:4px solid #ED7D31;">'
          + '&#128193; <a href="' + folderUrl + '" style="color:#1a73e8;font-weight:bold;">Training Folder</a><br>'
          + '<span style="font-size:13px;color:#666;">This folder stores all photos, documents and materials related to this training session.</span></p>';
      }

      html += '<p>Please be prepared and join on time.</p>'
        + '<p>Best regards,<br><strong>' + escapeHtml(trainer) + '</strong></p></div>';

      var plain = 'Dear ' + targetAudience + ',\n\nYou have a training session on ' + actualDate + '.\n\nTrainer: ' + trainer + '\nTopic: ' + trainingTopic + '\nTime: ' + timeFrom + ' - ' + timeTo + '\n';
      if (trainingPurpose && trainingPurpose.toString().trim()) plain += 'Training Purpose: ' + trainingPurpose + '\n';
      if (meetingLink) plain += '\nJoin via ' + platform + ': ' + meetingLink + '\n';
      if (folderUrl) plain += '\nTraining Folder: ' + folderUrl + '\n';
      plain += '\nBest regards,\n' + trainer;

      var opts = { htmlBody: html };
      if (ccList.length > 0) opts.cc = ccList.join(',');
      GmailApp.sendEmail(allToEmails.join(','), '(Notification) ' + actualDate + '_' + trainingCategory + ' Training_' + targetAudience, plain, opts);

      sheet.getRange(rowIndex, CONFIG.REPORT_COLUMNS.PRE_TRAINING).setValue(true);

      // ★ v3.8: Save training time to DocumentProperties
      saveTrainingTime(rawDate, trainingTopic, targetAudience, timeFrom, timeTo);

      // ===== CREATE GOOGLE CALENDAR EVENT =====
      // ★ v3.8: Pass timeFrom/timeTo to calendar event
      if (addToCalendar) {
        try {
          var calResult = createCalendarEvent(rawDate, trainingTopic, trainingCategory, trainer, trainingPurpose, targetAudience, allToEmails, ccList, meetingLink, platform, folderUrl, timeFrom, timeTo);
          if (calResult.success) {
            calendarCount++;
            saveCalendarEventId(rawDate, trainingTopic, targetAudience, calResult.eventId);
          } else {
            errorMessages.push('Row ' + rowIndex + ' Calendar: ' + calResult.message);
          }
        } catch (calErr) {
          errorMessages.push('Row ' + rowIndex + ' Calendar Error: ' + calErr.message);
        }
      }

      successCount++;

    } catch (error) {
      errorMessages.push('Row ' + rowIndex + ': ' + error.message);
    }
  }

  try { updateTrainingOverviewSilent(); updateTrainingPlanCalendar(); } catch (e) {}

  var msg = 'Emails sent: ' + successCount + '/' + selectedRows.length;
  msg += '\nTraining Folders created. Status set to "Plan".';
  // ★ v3.8: Updated message - single domain
  msg += '\nEmails delivered to @mani.inc domain';
  if (addToCalendar) {
    msg += '\nCalendar events created: ' + calendarCount + '/' + successCount;
    if (calendarCount === 0 && successCount > 0) {
      msg += '\n\n⚠ Calendar events failed! Please run "testCalendarAccess" from Apps Script Editor first to grant Calendar permission.';
    }
  }
  if (errorMessages.length > 0) msg += '\n\nDetails:\n' + errorMessages.join('\n');

  if (successCount === selectedRows.length && (calendarCount === successCount || !addToCalendar)) {
    return { success: true, message: msg };
  } else if (successCount > 0) {
    return { success: true, message: msg };
  }
  return { success: false, message: 'Failed to send emails.\n\n' + errorMessages.join('\n') };
}

/**
 * Create a Google Calendar event
 * ★ v3.8: Uses trainer-specified timeFrom/timeTo instead of default 9-10
 */
function createCalendarEvent(rawDate, topic, category, trainer, purpose, audience, audienceEmails, ccEmails, meetingLink, platform, folderUrl, timeFrom, timeTo) {
  Logger.log('--- createCalendarEvent START (v3.8) ---');
  Logger.log('rawDate: ' + rawDate + ' | topic: ' + topic);
  Logger.log('time: ' + timeFrom + ' - ' + timeTo);
  Logger.log('audienceEmails: ' + JSON.stringify(audienceEmails));
  
  try {
    var eventDate;
    if (rawDate instanceof Date) {
      eventDate = new Date(rawDate);
    } else if (typeof rawDate === 'string') {
      var parts = rawDate.split('/');
      if (parts.length === 3) {
        eventDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        eventDate = new Date(rawDate);
      }
    } else {
      eventDate = new Date(rawDate);
    }

    if (isNaN(eventDate.getTime())) {
      return { success: false, message: 'Invalid date' };
    }

    // ★ v3.8: Parse trainer-specified time
    var startHour = 9, startMin = 0, endHour = 10, endMin = 0;
    if (timeFrom) {
      var fromParts = timeFrom.split(':');
      if (fromParts.length >= 2) {
        startHour = parseInt(fromParts[0]);
        startMin = parseInt(fromParts[1]);
      }
    }
    if (timeTo) {
      var toParts = timeTo.split(':');
      if (toParts.length >= 2) {
        endHour = parseInt(toParts[0]);
        endMin = parseInt(toParts[1]);
      }
    }

    var startTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), startHour, startMin);
    var endTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), endHour, endMin);

    var eventTitle = '[Training] ' + category + ' - ' + topic;

    var description = 'TRAINING SESSION DETAILS\n'
      + '========================\n\n'
      + 'Topic: ' + topic + '\n'
      + 'Category: ' + category + '\n'
      + 'Trainer: ' + trainer + '\n'
      + 'Audience: ' + audience + '\n'
      + 'Time: ' + timeFrom + ' - ' + timeTo + '\n';
    
    if (purpose && purpose.toString().trim()) {
      description += 'Training Purpose: ' + purpose + '\n';
    }

    if (meetingLink) {
      description += '\n--- JOIN MEETING ---\n'
        + 'Platform: ' + platform + '\n'
        + 'Link: ' + meetingLink + '\n';
    }

    if (folderUrl) {
      description += '\n--- TRAINING MATERIALS ---\n'
        + 'Training Folder: ' + folderUrl + '\n'
        + '(Photos, documents and materials related to this training session)\n';
    }

    // Collect all guest emails, remove duplicates
    var allGuests = [];
    var guestMap = {};
    for (var i = 0; i < audienceEmails.length; i++) {
      var em = audienceEmails[i].trim().toLowerCase();
      if (em && !guestMap[em]) { guestMap[em] = true; allGuests.push(audienceEmails[i].trim()); }
    }
    for (var j = 0; j < ccEmails.length; j++) {
      var em2 = ccEmails[j].trim().toLowerCase();
      if (em2 && !guestMap[em2]) { guestMap[em2] = true; allGuests.push(ccEmails[j].trim()); }
    }

    Logger.log('Creating event: "' + eventTitle + '" | Time: ' + timeFrom + '-' + timeTo + ' | Guests: ' + allGuests.length);
    
    var calendar = CalendarApp.getDefaultCalendar();
    var event = calendar.createEvent(eventTitle, startTime, endTime, {
      description: description,
      location: meetingLink || '',
      guests: allGuests.join(','),
      sendInvites: true
    });

    try { event.setColor(CalendarApp.EventColor.YELLOW); } catch (colorErr) {}

    Logger.log('Calendar event CREATED: ID=' + event.getId());
    return { success: true, eventId: event.getId() };

  } catch (error) {
    Logger.log('createCalendarEvent FAILED: ' + error.message);
    return { success: false, message: error.message };
  }
}

// ============================================
// AFTER-TRAINING EMAIL
// ★ v3.8: Emails sent only to @mani.inc
// ★ v3.6: Updated column references
// ============================================

function showAfterTrainingDialog() {
  var result = getTrainerData('after');
  if (result.error) { SpreadsheetApp.getUi().alert('Error', result.error, SpreadsheetApp.getUi().ButtonSet.OK); return; }
  if (result.data.length === 0) { SpreadsheetApp.getUi().alert('Notification', 'No training sessions require After Training email.\n\nOnly rows with Status = "Plan" are shown.', SpreadsheetApp.getUi().ButtonSet.OK); return; }
  var html = createAfterTrainingDialogHtml(result.data, result.trainerName);
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(850).setHeight(580), 'After Training - Send notification email');
}

function createAfterTrainingDialogHtml(data, trainerName) {
  var rows = '';
  for (var i = 0; i < data.length; i++) {
    var it = data[i];
    rows += '<tr><td style="padding:8px;border:1px solid #ddd;"><input type="checkbox" name="training" value="' + it.rowIndex + '" data-topic="' + escapeHtml(it.trainingTopic) + '" data-audience="' + escapeHtml(it.targetAudience) + '" data-date="' + it.actualDate + '"></td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + it.actualDate + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.trainingCategory) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.trainingTopic) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + escapeHtml(it.targetAudience) + '</td></tr>';
  }
  var ccCss = getCcAutocompleteCss(), ccHtml = getCcAutocompleteHtml('A'), ccJs = getCcAutocompleteJs('A');

  return '<!DOCTYPE html><html><head><style>'
    + 'body{font-family:Calibri,Arial,sans-serif;font-size:14px;padding:15px;margin:0;}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:15px;}'
    + 'th{background:#4472C4;color:white;padding:10px 8px;border:1px solid #ddd;text-align:left;}'
    + 'td{padding:8px;border:1px solid #ddd;}tr:nth-child(even){background:#f9f9f9;}tr:hover{background:#e8f4fc;}'
    + '.btn-container{text-align:right;margin-top:15px;}'
    + 'button{padding:10px 20px;margin-left:10px;cursor:pointer;font-size:14px;border-radius:4px;}'
    + '.btn-send{background:#28a745;color:white;border:none;}.btn-send:hover{background:#218838;}'
    + '.btn-next{background:#4472C4;color:white;border:none;}.btn-next:hover{background:#3366b3;}'
    + '.btn-back{background:#6c757d;color:white;border:none;}.btn-back:hover{background:#5a6268;}'
    + '.btn-cancel{background:#f0f0f0;color:#333;border:1px solid #ccc;}.btn-cancel:hover{background:#e0e0e0;}'
    + '.info{background:#e8f4fc;padding:10px;border-radius:4px;margin-bottom:15px;}'
    + '.step{display:none;}.step.active{display:block;}'
    + '.form-group{margin-bottom:15px;}.form-group label{display:block;font-weight:bold;margin-bottom:5px;}'
    + '.form-group small{color:#666;display:block;margin-top:5px;}'
    + '.selected-summary{background:#e8f4fc;padding:15px;border-radius:4px;margin-bottom:15px;}'
    + '.selected-summary ul{margin:10px 0 0;padding-left:20px;}'
    + '#status{margin-top:10px;padding:10px;display:none;border-radius:4px;}'
    + '.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}'
    + '.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}'
    + ccCss
    + '</style></head><body>'
    + '<div id="step1" class="step active">'
    + '<div class="info"><strong>Step 1/2 - Trainer:</strong> ' + trainerName + '<br><small>Select training sessions (Status = "Plan") to send After Training email</small></div>'
    + '<table><thead><tr><th style="width:40px;">Select</th><th>Date</th><th>Category</th><th>Topic</th><th>Audience</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<div class="btn-container"><button class="btn-cancel" onclick="google.script.host.close()">Close</button><button class="btn-next" onclick="goToStep2()">Next &rarr;</button></div></div>'
    + '<div id="step2" class="step">'
    + '<div class="info"><strong>Step 2/2 - Confirm &amp; CC</strong><br><small>Review selection and add CC recipients</small></div>'
    + '<div class="selected-summary"><strong>Selected:</strong><ul id="selList"></ul></div>'
    + '<div class="form-group"><label>CC Emails (Optional)</label>' + ccHtml + '<small>Type to search from list or type an email address. No need to press Enter - it will be included automatically.</small></div>'
    + '<div id="status"></div>'
    + '<div class="btn-container"><button class="btn-back" onclick="goBack()">&larr; Back</button><button class="btn-cancel" onclick="google.script.host.close()">Close</button><button class="btn-send" onclick="doSend()">Send Emails</button></div></div>'
    + '<script>'
    + 'var selRows=[],selDetails=[];'
    + 'function escapeHtml(t){if(!t)return"";var d=document.createElement("div");d.textContent=t;return d.innerHTML;}'
    + 'function goToStep2(){var cbs=document.querySelectorAll("input[name=training]:checked");if(cbs.length===0){alert("Please select at least one session.");return;}selRows=[];selDetails=[];cbs.forEach(function(c){selRows.push(parseInt(c.value));selDetails.push({topic:c.getAttribute("data-topic"),audience:c.getAttribute("data-audience"),date:c.getAttribute("data-date")});});document.getElementById("selList").innerHTML=selDetails.map(function(x){return"<li><strong>"+escapeHtml(x.topic)+"</strong> for "+escapeHtml(x.audience)+" on "+x.date+"</li>";}).join("");document.getElementById("step1").classList.remove("active");document.getElementById("step2").classList.add("active");}'
    + 'function goBack(){document.getElementById("step2").classList.remove("active");document.getElementById("step1").classList.add("active");}'
    + 'function doSend(){var cc=getCcStrA();showStatus("Validating and sending emails...","success");google.script.run.withSuccessHandler(function(r){if(r.success){showStatus(r.message,"success");setTimeout(function(){google.script.host.close();},2500);}else{showStatus(r.message,"error");}}).withFailureHandler(function(e){showStatus("Error: "+e.message,"error");}).sendAfterTrainingEmails(selRows,cc);}'
    + 'function showStatus(m,t){var s=document.getElementById("status");s.textContent=m;s.className=t;s.style.display="block";}'
    + ccJs
    + '</script></body></html>';
}

/**
 * Send After Training emails
 * ★ v3.8: Emails sent only to @mani.inc
 * ★ v3.6: Updated column references for validation and data reading
 * Validates: D-L + N-Q (except M=Meeting Link)
 */
function sendAfterTrainingEmails(selectedRows, ccEmailsStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.REPORT);
  var successCount = 0, errorMessages = [];

  var ccList = [];
  if (ccEmailsStr && ccEmailsStr.trim()) {
    var rawCcList = ccEmailsStr.split(',').map(function(e) { return e.trim(); }).filter(function(e) { return e && e.includes('@'); });
    ccList = expandAllToDualDomain(rawCcList);
  }

  // ★ v3.6: Updated required columns for After Training validation
  // Columns C-L + N + O + P + Q (exclude M=Meeting Link)
  var requiredColumns = [
    { col: CONFIG.REPORT_COLUMNS.MONTH, name: 'Month (C)' },
    { col: CONFIG.REPORT_COLUMNS.TRAINING_FOLDER, name: 'Training Folder (D)', isLink: true },
    { col: CONFIG.REPORT_COLUMNS.ACTUAL_DATE, name: 'Actual Date (E)' },
    { col: CONFIG.REPORT_COLUMNS.TRAINING_TYPE, name: 'Training Type (F)' },
    { col: CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY, name: 'Training Category (G)' },
    { col: CONFIG.REPORT_COLUMNS.TRAINING_TOPIC, name: 'Training Topic (H)' },
    { col: CONFIG.REPORT_COLUMNS.TRAINING_PURPOSE, name: 'Training Purpose (I)' },
    { col: CONFIG.REPORT_COLUMNS.TRAINER, name: 'Trainer (J)' },
    { col: CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE, name: 'Target Audience (K)' },
    { col: CONFIG.REPORT_COLUMNS.STATUS, name: 'Status (L)' },
    // M (Meeting Link) is EXCLUDED from After-Training validation
    { col: CONFIG.REPORT_COLUMNS.RECORD_LINK, name: 'Record Link (N)', isLink: true },
    { col: CONFIG.REPORT_COLUMNS.SUMMARY_FEEDBACK, name: 'Summary & Feedback (O)' },
    { col: CONFIG.REPORT_COLUMNS.POST_TRAINING_ASSESSMENT, name: 'Post-training Assessment (P)', isLink: true },
    { col: CONFIG.REPORT_COLUMNS.ASSESSMENT_RESULT, name: 'Assessment Result (Q)' }
  ];

  for (var r = 0; r < selectedRows.length; r++) {
    var rowIndex = selectedRows[r];
    try {
      var rowData = sheet.getRange(rowIndex, 2, 1, CONFIG.DATA_COLUMNS).getValues()[0];

      // ===== VALIDATE REQUIRED COLUMNS =====
      var missingFields = [];
      for (var v = 0; v < requiredColumns.length; v++) {
        var rc = requiredColumns[v];
        if (rc.isLink) {
          var cellVal = rowData[rc.col - 2];
          var hasLink = hasHyperlink(sheet, rowIndex, rc.col);
          if (!cellVal && !hasLink) missingFields.push(rc.name);
        } else {
          var val = rowData[rc.col - 2];
          if (val === null || val === undefined || val.toString().trim() === '') {
            missingFields.push(rc.name);
          }
        }
      }

      if (missingFields.length > 0) {
        errorMessages.push('Row ' + rowIndex + ': Please complete the following information before sending: ' + missingFields.join(', '));
        continue;
      }

      // ===== GATHER DATA =====
      var actualDate = formatDate(rowData[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2]);
      var trainingCategory = rowData[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2];
      var trainingTopic = rowData[CONFIG.REPORT_COLUMNS.TRAINING_TOPIC - 2];
      var trainer = rowData[CONFIG.REPORT_COLUMNS.TRAINER - 2];
      var targetAudience = rowData[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE - 2];
      var summaryFeedback = rowData[CONFIG.REPORT_COLUMNS.SUMMARY_FEEDBACK - 2];

      var audienceEmails = getAudienceEmails(targetAudience);
      if (!audienceEmails || audienceEmails.length === 0) { errorMessages.push('Row ' + rowIndex + ': Email not found for "' + targetAudience + '"'); continue; }

      // ★ v3.8: Trainer emails - only @mani.inc
      var trainerDualEmails = getTrainerEmails(trainer);
      var allToEmails = [];
      var toSeen = {};
      for (var a = 0; a < audienceEmails.length; a++) {
        var key = audienceEmails[a].toLowerCase();
        if (!toSeen[key]) { toSeen[key] = true; allToEmails.push(audienceEmails[a]); }
      }
      for (var ti = 0; ti < trainerDualEmails.length; ti++) {
        var key = trainerDualEmails[ti].toLowerCase();
        if (!toSeen[key]) { toSeen[key] = true; allToEmails.push(trainerDualEmails[ti]); }
      }

      // ★ v3.6: Updated column references for URLs
      var folderUrl = getHyperlinkUrl(sheet, rowIndex, CONFIG.REPORT_COLUMNS.TRAINING_FOLDER) || '';
      var recordUrl = getHyperlinkUrl(sheet, rowIndex, CONFIG.REPORT_COLUMNS.RECORD_LINK);
      var assessmentUrl = getHyperlinkUrl(sheet, rowIndex, CONFIG.REPORT_COLUMNS.POST_TRAINING_ASSESSMENT);

      var subject = '(Completed) ' + actualDate + '_' + trainingCategory + ' Training_' + targetAudience;

      // ===== BUILD HTML EMAIL =====
      var htmlBody = '<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#333;">'
        + '<p>Dear ' + escapeHtml(targetAudience) + ',</p>'
        + '<p>Thank you for attending the training session on <strong>&quot;' + escapeHtml(trainingTopic) + '&quot;</strong> '
        + 'shared by <strong>' + escapeHtml(trainer) + '</strong> on <strong>' + actualDate + '</strong>.</p>';

      if (summaryFeedback && summaryFeedback.toString().trim()) {
        var fbHtml = escapeHtml(summaryFeedback.toString()).replace(/\n/g, '<br>');
        htmlBody += '<div style="background:#f0f7ff;padding:12px 16px;border-radius:4px;border-left:4px solid #4472C4;margin:10px 0;">'
          + '<p style="margin:0 0 8px;font-weight:bold;color:#4472C4;">Summary &amp; Feedback:</p>'
          + '<p style="margin:0;">' + fbHtml + '</p></div>';
      }

      htmlBody += '<p>Here are the training materials for your reference:</p>'
        + '<table style="border-collapse:collapse;margin:10px 0;">';

      if (folderUrl) {
        htmlBody += '<tr><td style="padding:6px 12px;">&#128193;</td><td style="padding:6px 12px;"><a href="' + folderUrl + '" style="color:#1a73e8;text-decoration:none;">Training Folder</a></td></tr>';
      }
      if (recordUrl) {
        htmlBody += '<tr><td style="padding:6px 12px;">&#128221;</td><td style="padding:6px 12px;"><a href="' + recordUrl + '" style="color:#1a73e8;text-decoration:none;">Training Record</a></td></tr>';
      }
      if (assessmentUrl) {
        htmlBody += '<tr><td style="padding:6px 12px;">&#128203;</td><td style="padding:6px 12px;"><a href="' + assessmentUrl + '" style="color:#1a73e8;text-decoration:none;"><strong>Post-training Assessment</strong></a></td></tr>';
      }
      htmlBody += '</table>';

      if (assessmentUrl) {
        htmlBody += '<p style="background:#fff3cd;padding:10px;border-radius:4px;border-left:4px solid #ffc107;">'
          + '<strong>&#9888; Action Required:</strong> Please complete the '
          + '<a href="' + assessmentUrl + '" style="color:#1a73e8;">Post-training Assessment</a> at your earliest convenience.</p>';
      }

      htmlBody += '<p>Best regards,<br><strong>' + escapeHtml(trainer) + '</strong></p></div>';

      var plain = 'Dear ' + targetAudience + ',\n\nThank you for attending "' + trainingTopic + '" by ' + trainer + ' on ' + actualDate + '.\n\n';
      if (summaryFeedback && summaryFeedback.toString().trim()) plain += 'Summary & Feedback:\n' + summaryFeedback + '\n\n';
      if (folderUrl) plain += 'Training Folder: ' + folderUrl + '\n';
      if (recordUrl) plain += 'Training Record: ' + recordUrl + '\n';
      if (assessmentUrl) plain += 'Post-training Assessment: ' + assessmentUrl + '\n';
      plain += '\nBest regards,\n' + trainer;

      var opts = { htmlBody: htmlBody };
      if (ccList.length > 0) opts.cc = ccList.join(',');
      GmailApp.sendEmail(allToEmails.join(','), subject, plain, opts);

      // ===== SET STATUS = "Completed" =====
      writeValueWithValidation(sheet, rowIndex, CONFIG.REPORT_COLUMNS.STATUS, 'Completed');
      // ★ v3.6: After-Training checkbox now at column S(19)
      sheet.getRange(rowIndex, CONFIG.REPORT_COLUMNS.AFTER_TRAINING).setValue(true);

      // ===== UPDATE GOOGLE CALENDAR EVENT TO COMPLETED =====
      try {
        var rawDateForCal = rowData[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2];
        updateCalendarEventForStatus(rawDateForCal, trainingTopic, targetAudience, trainingCategory, 'Completed');
      } catch (calErr) {
        Logger.log('Calendar update to Completed failed for row ' + rowIndex + ': ' + calErr.message);
      }

      successCount++;

    } catch (error) {
      errorMessages.push('Row ' + rowIndex + ': ' + error.message);
    }
  }

  try { updateTrainingOverviewSilent(); updateTrainingPlanCalendar(); } catch (e) {}

  // ★ v3.8: Updated message - single domain
  if (successCount === selectedRows.length) return { success: true, message: 'Successfully sent ' + successCount + ' After Training email(s).\nStatus updated to "Completed".\nEmails delivered to @mani.inc domain' };
  if (successCount > 0) return { success: true, message: 'Sent ' + successCount + '/' + selectedRows.length + '.\n\nErrors:\n' + errorMessages.join('\n') };
  return { success: false, message: 'Cannot send emails.\n\n' + errorMessages.join('\n') };
}

// ============================================
// TRAINING OVERVIEW (Calendar) UPDATE
// ★ v3.8: Now includes training time in display
// ============================================

var MONTH_COLUMN_MAPPING = {
  '202509': 5, '202510': 6, '202511': 7, '202512': 8,
  '202601': 9, '202602': 10, '202603': 11, '202604': 12,
  '202605': 13, '202606': 14, '202607': 15, '202608': 16
};

function updateTrainingOverview() {
  updateTrainingOverviewCore();
  SpreadsheetApp.getUi().alert('Success', 'Training Report FY67 Calendar has been updated!', SpreadsheetApp.getUi().ButtonSet.OK);
}

function updateTrainingOverviewSilent() { updateTrainingOverviewCore(); }

function updateTrainingOverviewCore() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // ★ v3.7: Flush first to ensure we read the latest data
  SpreadsheetApp.flush();
  var reportSheet = ss.getSheetByName(CONFIG.SHEETS.REPORT);
  var overviewSheet = ss.getSheetByName(CONFIG.SHEETS.OVERVIEW);
  if (!reportSheet || !overviewSheet) {
    Logger.log('updateTrainingOverviewCore: Sheet not found! REPORT=' + !!reportSheet + ', OVERVIEW=' + !!overviewSheet + ' (name="' + CONFIG.SHEETS.OVERVIEW + '")');
    return;
  }
  var reportLastRow = reportSheet.getLastRow();
  if (reportLastRow < CONFIG.DATA_START_ROW) {
    var ovLast = overviewSheet.getLastRow();
    if (ovLast >= CONFIG.DATA_START_ROW) {
      overviewSheet.getRange(CONFIG.DATA_START_ROW, 4, ovLast - CONFIG.DATA_START_ROW + 1, 13).clearContent();
    }
    return;
  }

  // ★ v3.6: Read 18 columns (B through S)
  var reportData = reportSheet.getRange(CONFIG.DATA_START_ROW, 2, reportLastRow - CONFIG.DATA_START_ROW + 1, CONFIG.DATA_COLUMNS).getValues();
  var lookup = {};

  for (var i = 0; i < reportData.length; i++) {
    var row = reportData[i];
    var ri = i + CONFIG.DATA_START_ROW;
    var month = row[CONFIG.REPORT_COLUMNS.MONTH - 2];
    var tType = row[CONFIG.REPORT_COLUMNS.TRAINING_TYPE - 2];
    var tCat = row[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2];
    var topic = row[CONFIG.REPORT_COLUMNS.TRAINING_TOPIC - 2];
    var trainer = row[CONFIG.REPORT_COLUMNS.TRAINER - 2];
    var audience = row[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE - 2];
    var status = (row[CONFIG.REPORT_COLUMNS.STATUS - 2] || '').toString().trim();
    var rawDate = row[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2];
    if (!tType || !tCat || !month) continue;
    if (['Plan', 'Completed', 'Cancel'].indexOf(status) === -1) continue;
    var ms = formatMonthToString(month);
    if (!ms) continue;
    var key = tType.toString().trim() + '|' + tCat.toString().trim() + '|' + ms;
    if (!lookup[key]) lookup[key] = [];

    // ★ v3.8: Look up stored training time
    var trainingTime = getTrainingTime(rawDate, topic, audience);

    lookup[key].push({
      actualDate: formatDate(rawDate),
      topic: topic, trainer: trainer, audience: audience, status: status,
      // ★ v3.7: Include ALL link types
      folderUrl: getHyperlinkUrl(reportSheet, ri, CONFIG.REPORT_COLUMNS.TRAINING_FOLDER),
      meetingLink: getHyperlinkUrl(reportSheet, ri, CONFIG.REPORT_COLUMNS.MEETING_LINK)
        || (row[CONFIG.REPORT_COLUMNS.MEETING_LINK - 2] || '').toString().trim(),
      recordUrl: getHyperlinkUrl(reportSheet, ri, CONFIG.REPORT_COLUMNS.RECORD_LINK),
      // ★ v3.8: Training time
      trainingTime: trainingTime
    });
  }

  var ovLast = overviewSheet.getLastRow();
  if (ovLast < CONFIG.DATA_START_ROW) return;
  var ovTC = overviewSheet.getRange(CONFIG.DATA_START_ROW, 2, ovLast - CONFIG.DATA_START_ROW + 1, 2).getValues();
  overviewSheet.getRange(CONFIG.DATA_START_ROW, 4, ovLast - CONFIG.DATA_START_ROW + 1, 13).clearContent();

  for (var i = 0; i < ovTC.length; i++) {
    var rIdx = i + CONFIG.DATA_START_ROW;
    var tt = ovTC[i][0], tc = ovTC[i][1];
    if (!tt || !tc) continue;
    // ★ v3.7: Trim both sides to prevent whitespace mismatch
    var ttTrim = tt.toString().trim();
    var tcTrim = tc.toString().trim();
    for (var ms in MONTH_COLUMN_MAPPING) {
      var key = ttTrim + '|' + tcTrim + '|' + ms;
      if (lookup[key] && lookup[key].length > 0) {
        overviewSheet.getRange(rIdx, MONTH_COLUMN_MAPPING[ms]).setRichTextValue(buildRichTextForOverview(lookup[key]));
      }
    }
  }

  updateTotalColumn(overviewSheet, ovLast);
  SpreadsheetApp.flush();
}

/**
 * ★ v3.8: Added training time display (⏰ HH:MM - HH:MM)
 * ★ v3.7: Show Folder / Meeting Link / Record for ALL statuses (Plan + Completed)
 * Only Cancel shows strikethrough without links
 */
function buildRichTextForOverview(sessions) {
  var ft = '', styles = [];
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (i > 0) ft += '\n\n';
    var icon = s.status === 'Completed' ? '\u2705 ' : (s.status === 'Plan' ? '\uD83D\uDCCB ' : '\u274C ');

    if (s.status === 'Cancel') {
      // Cancelled: strikethrough topic, no links
      ft += (i + 1) + '. ' + icon + s.actualDate + ': ';
      var ts = ft.length; ft += s.topic; styles.push({ s: ts, e: ft.length, st: true });
      ft += ' [CANCELLED]';
      ft += '\n';
      var a = ft.length; ft += 'Trainer: '; styles.push({ s: a, e: ft.length, i: true });
      var b = ft.length; ft += s.trainer; styles.push({ s: b, e: ft.length, b: true });
      ft += '\n';
      var c = ft.length; ft += 'Audience: '; styles.push({ s: c, e: ft.length, i: true });
      var d = ft.length; ft += s.audience; styles.push({ s: d, e: ft.length, b: true });
    } else {
      // Plan or Completed: bold topic + show ALL available links
      ft += (i + 1) + '. ' + icon + s.actualDate + ': ';
      var ts = ft.length; ft += s.topic; styles.push({ s: ts, e: ft.length, b: true });
      ft += '\n';
      var a = ft.length; ft += 'Trainer: '; styles.push({ s: a, e: ft.length, i: true });
      var b = ft.length; ft += s.trainer; styles.push({ s: b, e: ft.length, b: true });
      ft += '\n';
      var c = ft.length; ft += 'Audience: '; styles.push({ s: c, e: ft.length, i: true });
      var d = ft.length; ft += s.audience; styles.push({ s: d, e: ft.length, b: true });

      // ★ v3.8: Show training time
      if (s.trainingTime) {
        ft += '\n\u23F0 ';
        var tStart = ft.length; ft += 'Time: ' + s.trainingTime; styles.push({ s: tStart, e: ft.length, b: true });
      }

      // ★ v3.7: Show links for BOTH Plan and Completed
      if (s.folderUrl) {
        ft += '\n\uD83D\uDCC1 ';
        var fStart = ft.length; ft += 'Training Folder'; styles.push({ s: fStart, e: ft.length, l: s.folderUrl });
      }
      if (s.meetingLink) {
        ft += '\n\uD83D\uDD17 ';
        var mStart = ft.length; ft += 'Meeting Link'; styles.push({ s: mStart, e: ft.length, l: s.meetingLink });
      }
      if (s.recordUrl) {
        ft += '\n\uD83D\uDCDD ';
        var rStart = ft.length; ft += 'Training Record'; styles.push({ s: rStart, e: ft.length, l: s.recordUrl });
      }
    }
  }
  var builder = SpreadsheetApp.newRichTextValue().setText(ft);
  for (var j = 0; j < styles.length; j++) {
    var x = styles[j];
    if (x.b) builder.setTextStyle(x.s, x.e, SpreadsheetApp.newTextStyle().setBold(true).build());
    if (x.i) builder.setTextStyle(x.s, x.e, SpreadsheetApp.newTextStyle().setItalic(true).build());
    if (x.st) builder.setTextStyle(x.s, x.e, SpreadsheetApp.newTextStyle().setStrikethrough(true).setForegroundColor('#999').build());
    if (x.l) {
      builder.setLinkUrl(x.s, x.e, x.l);
      builder.setTextStyle(x.s, x.e, SpreadsheetApp.newTextStyle().setForegroundColor('#1a73e8').setUnderline(true).build());
    }
  }
  return builder.build();
}

function updateTotalColumn(sheet, lastRow) {
  for (var row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
    var total = 0;
    for (var col = 5; col <= 16; col++) {
      var v = sheet.getRange(row, col).getValue();
      if (v && v.toString().trim()) {
        var text = v.toString();
        var completed = (text.match(/^\d+\.\s*\u2705/gm) || []).length;
        var planned = (text.match(/^\d+\.\s*\uD83D\uDCCB/gm) || []).length;
        total += completed + planned;
      }
    }
    var cell = sheet.getRange(row, 4);
    if (!cell.getFormula()) cell.setValue(total);
  }
}

// ============================================
// TRAINING PLAN CALENDAR
// ★ v3.8: Now includes training time in display
// ============================================

function updateTrainingPlanCalendar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reportSheet = ss.getSheetByName(CONFIG.SHEETS.REPORT);
  var planSheet = ss.getSheetByName(CONFIG.SHEETS.PLAN_CALENDAR);
  if (!planSheet) { planSheet = ss.insertSheet(CONFIG.SHEETS.PLAN_CALENDAR); setupPlanCalendarSheet(planSheet); SpreadsheetApp.flush(); }
  if (planSheet.getLastRow() < CONFIG.DATA_START_ROW) { setupPlanCalendarSheet(planSheet); SpreadsheetApp.flush(); }
  var pLast = planSheet.getLastRow();
  if (pLast < CONFIG.DATA_START_ROW) return;
  var rLast = reportSheet.getLastRow();

  planSheet.getRange(CONFIG.DATA_START_ROW, 4, pLast - CONFIG.DATA_START_ROW + 1, 13).clearContent();

  if (rLast < CONFIG.DATA_START_ROW) { SpreadsheetApp.flush(); return; }

  // ★ v3.6: Read 18 columns
  var rData = reportSheet.getRange(CONFIG.DATA_START_ROW, 2, rLast - CONFIG.DATA_START_ROW + 1, CONFIG.DATA_COLUMNS).getValues();
  var lookup = {};
  for (var i = 0; i < rData.length; i++) {
    var row = rData[i];
    var ri = i + CONFIG.DATA_START_ROW;
    var tType = row[CONFIG.REPORT_COLUMNS.TRAINING_TYPE - 2];
    var tCat = row[CONFIG.REPORT_COLUMNS.TRAINING_CATEGORY - 2];
    var status = (row[CONFIG.REPORT_COLUMNS.STATUS - 2] || '').toString().trim();
    if (!tType || !tCat || status !== 'Plan') continue;
    var rawDate = row[CONFIG.REPORT_COLUMNS.ACTUAL_DATE - 2];
    var topic = row[CONFIG.REPORT_COLUMNS.TRAINING_TOPIC - 2];
    var audience = row[CONFIG.REPORT_COLUMNS.TARGET_AUDIENCE - 2];
    var ms = formatMonthToString(row[CONFIG.REPORT_COLUMNS.MONTH - 2]);
    if (!ms) continue;
    var key = tType.toString().trim() + '|' + tCat.toString().trim() + '|' + ms;
    if (!lookup[key]) lookup[key] = [];

    // ★ v3.8: Look up stored training time
    var trainingTime = getTrainingTime(rawDate, topic, audience);

    lookup[key].push({
      actualDate: formatDate(rawDate),
      topic: topic,
      trainer: row[CONFIG.REPORT_COLUMNS.TRAINER - 2],
      audience: audience,
      // ★ v3.7: Include links in Plan Calendar too
      folderUrl: getHyperlinkUrl(reportSheet, ri, CONFIG.REPORT_COLUMNS.TRAINING_FOLDER),
      meetingLink: getHyperlinkUrl(reportSheet, ri, CONFIG.REPORT_COLUMNS.MEETING_LINK)
        || (row[CONFIG.REPORT_COLUMNS.MEETING_LINK - 2] || '').toString().trim(),
      // ★ v3.8: Training time
      trainingTime: trainingTime
    });
  }

  var pTC = planSheet.getRange(CONFIG.DATA_START_ROW, 2, pLast - CONFIG.DATA_START_ROW + 1, 2).getValues();
  for (var i = 0; i < pTC.length; i++) {
    if (!pTC[i][0] || !pTC[i][1]) continue;
    for (var ms in MONTH_COLUMN_MAPPING) {
      var key = pTC[i][0].toString().trim() + '|' + pTC[i][1].toString().trim() + '|' + ms;
      if (lookup[key] && lookup[key].length > 0) {
        planSheet.getRange(i + CONFIG.DATA_START_ROW, MONTH_COLUMN_MAPPING[ms]).setRichTextValue(buildPlanCalRT(lookup[key]));
      }
    }
  }

  for (var row = CONFIG.DATA_START_ROW; row <= pLast; row++) {
    var total = 0;
    for (var col = 5; col <= 16; col++) {
      var v = planSheet.getRange(row, col).getValue();
      if (v && v.toString().trim()) { var m = v.toString().match(/^\d+\./gm); if (m) total += m.length; }
    }
    var cell = planSheet.getRange(row, 4);
    if (!cell.getFormula()) cell.setValue(total);
  }
  SpreadsheetApp.flush();
}

/**
 * ★ v3.8: Plan Calendar now shows Training Time + Folder + Meeting Link
 * ★ v3.7: Plan Calendar now shows Folder + Meeting Link
 */
function buildPlanCalRT(sessions) {
  var ft = '', styles = [];
  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (i > 0) ft += '\n\n';
    ft += (i + 1) + '. \uD83D\uDCCB ' + s.actualDate + ': ';
    var ts = ft.length; ft += s.topic; styles.push({ s: ts, e: ft.length, b: true });
    ft += '\n';
    var a = ft.length; ft += 'Trainer: '; styles.push({ s: a, e: ft.length, i: true });
    var b = ft.length; ft += s.trainer; styles.push({ s: b, e: ft.length, b: true });
    ft += '\n';
    var c = ft.length; ft += 'Audience: '; styles.push({ s: c, e: ft.length, i: true });
    var d = ft.length; ft += s.audience; styles.push({ s: d, e: ft.length, b: true });
    // ★ v3.8: Show training time in Plan Calendar
    if (s.trainingTime) {
      ft += '\n\u23F0 ';
      var tStart = ft.length; ft += 'Time: ' + s.trainingTime; styles.push({ s: tStart, e: ft.length, b: true });
    }
    // ★ v3.7: Show links in Plan Calendar
    if (s.folderUrl) {
      ft += '\n\uD83D\uDCC1 ';
      var fStart = ft.length; ft += 'Training Folder'; styles.push({ s: fStart, e: ft.length, l: s.folderUrl });
    }
    if (s.meetingLink) {
      ft += '\n\uD83D\uDD17 ';
      var mStart = ft.length; ft += 'Meeting Link'; styles.push({ s: mStart, e: ft.length, l: s.meetingLink });
    }
  }
  var builder = SpreadsheetApp.newRichTextValue().setText(ft);
  for (var j = 0; j < styles.length; j++) {
    if (styles[j].b) builder.setTextStyle(styles[j].s, styles[j].e, SpreadsheetApp.newTextStyle().setBold(true).build());
    if (styles[j].i) builder.setTextStyle(styles[j].s, styles[j].e, SpreadsheetApp.newTextStyle().setItalic(true).build());
    if (styles[j].l) {
      builder.setLinkUrl(styles[j].s, styles[j].e, styles[j].l);
      builder.setTextStyle(styles[j].s, styles[j].e, SpreadsheetApp.newTextStyle().setForegroundColor('#1a73e8').setUnderline(true).build());
    }
  }
  return builder.build();
}

function setupPlanCalendarSheet(sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = ['', 'Training Type', 'Training Category', 'Total', '202509', '202510', '202511', '202512', '202601', '202602', '202603', '202604', '202605', '202606', '202607', '202608'];
  sheet.getRange(4, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(4, 1, 1, headers.length).setFontWeight('bold').setBackground('#4472C4').setFontColor('white');
  var ov = ss.getSheetByName(CONFIG.SHEETS.OVERVIEW);
  if (ov && ov.getLastRow() >= CONFIG.DATA_START_ROW) {
    var data = ov.getRange(CONFIG.DATA_START_ROW, 2, ov.getLastRow() - CONFIG.DATA_START_ROW + 1, 2).getValues().filter(function(r) { return r[0] || r[1]; });
    if (data.length > 0) sheet.getRange(CONFIG.DATA_START_ROW, 2, data.length, 2).setValues(data);
  }
  sheet.setColumnWidth(1, 30); sheet.setColumnWidth(2, 120); sheet.setColumnWidth(3, 150); sheet.setColumnWidth(4, 60);
  for (var c = 5; c <= 16; c++) sheet.setColumnWidth(c, 200);
}

function formatMonthToString(month) {
  if (!month) return null;
  if (typeof month === 'string') { var c = month.toString().trim(); if (/^\d{6}$/.test(c)) return c; }
  if (typeof month === 'number') { var s = month.toString(); if (/^\d{6}$/.test(s)) return s; }
  if (month instanceof Date) return month.getFullYear().toString() + String(month.getMonth() + 1).padStart(2, '0');
  return null;
}

// ============================================
// TESTING & DIAGNOSTICS
// ============================================

function testCalendarAccess() {
  try {
    var calendar = CalendarApp.getDefaultCalendar();
    var calName = calendar.getName();
    var calId = calendar.getId();
    
    var now = new Date();
    var testStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 55);
    var testEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    
    var testEvent = calendar.createEvent('[TEST] Calendar Access Test - Please Delete', testStart, testEnd, {
      description: 'This is a test event created by MMH Training System to verify Calendar access.\nYou can safely delete this event.'
    });
    
    testEvent.deleteEvent();
    
    SpreadsheetApp.getUi().alert(
      'Calendar Access OK!',
      'Calendar Name: ' + calName + '\n'
      + 'Calendar ID: ' + calId + '\n\n'
      + 'Test event was created and deleted successfully.\n'
      + 'Calendar integration is ready to use!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Calendar Access FAILED',
      'Error: ' + error.message + '\n\n'
      + 'Possible causes:\n'
      + '1. Calendar permission not granted - Run this function again and click "Allow" on the popup\n'
      + '2. Google Calendar API not enabled\n'
      + '3. Account restrictions',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function testCreateCalendarEvent() {
  try {
    var calendar = CalendarApp.getDefaultCalendar();
    var trainerEmail = Session.getActiveUser().getEmail();
    
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var startTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0);
    var endTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0);
    
    var event = calendar.createEvent(
      '[Training TEST] Demo Training Session',
      startTime,
      endTime,
      {
        description: 'This is a test training calendar event.\n\nTrainer: Test\nTopic: Demo\n\nYou can delete this event.',
        guests: trainerEmail,
        sendInvites: false
      }
    );
    
    event.setColor(CalendarApp.EventColor.YELLOW);
    
    SpreadsheetApp.getUi().alert(
      'Test Event Created!',
      'Event: [Training TEST] Demo Training Session\n'
      + 'Date: ' + startTime.toLocaleDateString() + ' 10:00 - 11:00\n'
      + 'Event ID: ' + event.getId() + '\n\n'
      + 'Check your Google Calendar for tomorrow!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Test Failed', 'Error: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function testCurrentUser() {
  var e = Session.getActiveUser().getEmail();
  var n = getCurrentUserName();
  var prefix = getEmailPrefix(e);
  var dualEmails = n ? getTrainerEmails(n) : [];
  SpreadsheetApp.getUi().alert('Test - Single Domain v3.8',
    'Login Email: ' + e + '\n'
    + 'Email Prefix: ' + prefix + '\n'
    + 'Matched Name: ' + (n || 'Not found') + '\n'
    + 'Send Domain: @' + CONFIG.SEND_DOMAIN + '\n'
    + 'Outgoing Emails: ' + (dualEmails.length > 0 ? dualEmails.join(', ') : 'N/A') + '\n\n'
    + 'Column Mapping v3.6:\n'
    + 'M=' + CONFIG.REPORT_COLUMNS.MEETING_LINK + ' (Meeting Link)\n'
    + 'N=' + CONFIG.REPORT_COLUMNS.RECORD_LINK + ' (Record)\n'
    + 'O=' + CONFIG.REPORT_COLUMNS.SUMMARY_FEEDBACK + ' (Summary)\n'
    + 'P=' + CONFIG.REPORT_COLUMNS.POST_TRAINING_ASSESSMENT + ' (Assessment)\n'
    + 'Q=' + CONFIG.REPORT_COLUMNS.ASSESSMENT_RESULT + ' (Result)\n'
    + 'R=' + CONFIG.REPORT_COLUMNS.PRE_TRAINING + ' (Pre ✓)\n'
    + 'S=' + CONFIG.REPORT_COLUMNS.AFTER_TRAINING + ' (After ✓)',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}/**
 * ============================================================
 * MMH TRAINING FOLDER MANAGER
 * File bổ sung cho MMH TRAINING MANAGEMENT SYSTEM v3.8
 * Version 1.0 - 10/08/2026
 * ============================================================
 *
 * CHỨC NĂNG:
 *   Tạo folder Training trên Google Drive cho các dòng trong
 *   sheet "Training Report FY67", tự động chọn FOLDER MẸ dựa
 *   trên cột G (Training Category):
 *
 *     Product           → 1oBkfBQkyrqdHaxZJn1b2cw-R4EzKwNjC
 *     Funtional skills  → 18HOaDnd5WL9FjIrThBZqaUsHgtLkbwPw
 *     Compliance        → 14LTroYyR-QVEGSK8ken79ylUnS0YRa9N
 *     SOP               → 1lQE7reqTVQO9a_TxqJZEgFShDCVtQC8Z
 *
 *   Tên folder: YYYYMMDD_TrainingType_TrainingCategory_TargetAudience
 *   Ví dụ:      20260612_External_Product_DTB - Hùng Vĩ
 *
 * NGUYÊN TẮC AN TOÀN:
 *   - KHÔNG tạo lại folder cho dòng đã có link ở cột D
 *   - KHÔNG ghi đè bất kỳ dữ liệu nào ngoài cột D
 *   - KHÔNG đổi Status (cột L), không gửi email, không tạo calendar
 *   - Nếu trong folder mẹ đã có folder trùng tên → dùng lại, không tạo trùng
 *   - Sau khi tạo: ghi vào cột D dạng HYPERLINK (tên folder hiển thị,
 *     URL ẩn bên dưới)
 *
 * CÁCH DÙNG:
 *   Menu "📁 Training Folder" → "Tạo folder theo Training Category"
 *
 * LƯU Ý KHI CÀI ĐẶT:
 *   File này có định nghĩa onOpen() để dựng cả 2 menu (Send Email +
 *   Training Folder). Vì vậy phải XOÁ (hoặc đổi tên) hàm onOpen() cũ
 *   trong file Code.gs — xem hướng dẫn kèm theo.
 * ============================================================
 */


// ============================================================
// CẤU HÌNH
// ============================================================

var TFM_CONFIG = {
  SHEET_NAME: 'Training Report FY67',
  DATA_START_ROW: 5,

  // Cột theo bố cục sheet (B..S)
  COL: {
    NO: 2,          // B
    MONTH: 3,       // C
    FOLDER: 4,      // D - Training Folder  (nơi ghi hyperlink)
    DATE: 5,        // E - Actual Date
    TYPE: 6,        // F - Training Type
    CATEGORY: 7,    // G - Training Category
    TOPIC: 8,       // H
    PURPOSE: 9,     // I
    TRAINER: 10,    // J
    AUDIENCE: 11,   // K - Target Audience
    STATUS: 12      // L
  },

  // Folder mẹ mặc định nếu Category không khớp bảng dưới
  FALLBACK_PARENT_ID: '1L2MhTlISQ_cmj_7-X88i6jW7knNyGMvJ',

  /**
   * Bảng ánh xạ Training Category → Folder mẹ.
   * "keys" là các cách viết đã chuẩn hoá (bỏ dấu cách, ký tự đặc biệt,
   * chữ thường) — nhờ vậy khớp được cả "Funtional skills",
   * "Functional Skills", "functional skill"...
   */
  CATEGORY_FOLDERS: [
    {
      label: 'Product',
      id: '1oBkfBQkyrqdHaxZJn1b2cw-R4EzKwNjC',
      keys: ['product', 'products', 'productknowledge', 'sanpham']
    },
    {
      label: 'Funtional skills',
      id: '18HOaDnd5WL9FjIrThBZqaUsHgtLkbwPw',
      keys: ['funtionalskills', 'funtionalskill', 'functionalskills',
             'functionalskill', 'funtionalskil', 'softskills', 'softskill',
             'skills', 'skill']
    },
    {
      label: 'Compliance',
      id: '14LTroYyR-QVEGSK8ken79ylUnS0YRa9N',
      keys: ['compliance', 'complaince', 'complainance', 'compliant',
             'complain', 'tuanthu']
    },
    {
      label: 'SOP',
      id: '1lQE7reqTVQO9a_TxqJZEgFShDCVtQC8Z',
      keys: ['sop', 'sops', 'standardoperatingprocedure',
             'standardoperatingprocedures', 'quytrinh']
    }
  ],

  // Bỏ qua các dòng có Status = Cancel
  SKIP_STATUS: ['cancel', 'cancelled', 'canceled'],

  // Dừng an toàn trước giới hạn 6 phút của Apps Script (mili giây)
  TIME_BUDGET_MS: 4.5 * 60 * 1000
};


// ============================================================
// MENU  (dựng CẢ HAI menu: Send Email + Training Folder)
// ============================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();

  // Menu cũ - giữ nguyên các chức năng email hiện có
  ui.createMenu('📧 Send Email')
    .addItem('Pre Training Email', 'showPreTrainingDialog')
    .addItem('After Training Email', 'showAfterTrainingDialog')
    .addToUi();

  // Menu mới
  ui.createMenu('📁 Training Folder')
    .addItem('Tạo folder theo Training Category', 'showTrainingFolderDialog')
    .addSeparator()
    .addItem('Kiểm tra mapping Category ↔ Folder mẹ', 'tfmCheckCategoryMapping')
    .addToUi();
}


// ============================================================
// HÀM TIỆN ÍCH (đặt tiền tố tfm_ để không đụng hàm trong Code.gs)
// ============================================================

/** Chuẩn hoá chuỗi: bỏ dấu cách / ký tự đặc biệt, đưa về chữ thường */
function tfmNormalizeKey(text) {
  if (text === null || text === undefined) return '';
  return text.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Trả về { id, label, matched } của folder mẹ theo Training Category */
function tfmResolveParentFolder(category) {
  var key = tfmNormalizeKey(category);
  if (key) {
    for (var i = 0; i < TFM_CONFIG.CATEGORY_FOLDERS.length; i++) {
      var item = TFM_CONFIG.CATEGORY_FOLDERS[i];
      if (item.keys.indexOf(key) !== -1) {
        return { id: item.id, label: item.label, matched: true };
      }
    }
    // Khớp mềm: category chứa key hoặc ngược lại (vd "Product - Dental")
    for (var j = 0; j < TFM_CONFIG.CATEGORY_FOLDERS.length; j++) {
      var it = TFM_CONFIG.CATEGORY_FOLDERS[j];
      for (var k = 0; k < it.keys.length; k++) {
        if (it.keys[k].length >= 3 && key.indexOf(it.keys[k]) !== -1) {
          return { id: it.id, label: it.label, matched: true };
        }
      }
    }
  }
  return { id: TFM_CONFIG.FALLBACK_PARENT_ID, label: 'Chung (fallback)', matched: false };
}

/** Đổi giá trị ô Actual Date thành chuỗi YYYYMMDD */
function tfmFormatDateYmd(value) {
  if (value === null || value === undefined || value === '') return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.getFullYear()
      + ('0' + (value.getMonth() + 1)).slice(-2)
      + ('0' + value.getDate()).slice(-2);
  }

  var s = value.toString().trim();

  // dd/mm/yyyy hoặc yyyy/mm/dd
  var parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    var p0 = parts[0].trim(), p1 = parts[1].trim(), p2 = parts[2].trim();
    if (p0.length === 4) {                       // yyyy-mm-dd
      return p0 + ('0' + p1).slice(-2) + ('0' + p2).slice(-2);
    }
    if (p2.length === 4) {                       // dd/mm/yyyy
      return p2 + ('0' + p1).slice(-2) + ('0' + p0).slice(-2);
    }
  }

  // yyyymmdd sẵn
  if (/^\d{8}$/.test(s)) return s;

  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.getFullYear()
      + ('0' + (d.getMonth() + 1)).slice(-2)
      + ('0' + d.getDate()).slice(-2);
  }
  return '';
}

/** Loại bỏ ký tự không hợp lệ trong tên folder Drive */
function tfmCleanNamePart(text) {
  if (text === null || text === undefined) return '';
  return text.toString()
    .replace(/[\\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Dựng tên folder: YYYYMMDD_Type_Category_Audience */
function tfmBuildFolderName(ymd, type, category, audience) {
  return [
    ymd,
    tfmCleanNamePart(type),
    tfmCleanNamePart(category),
    tfmCleanNamePart(audience)
  ].join('_');
}

/** Kiểm tra ô đã có link/nội dung folder hay chưa */
function tfmCellHasFolder(sheet, row, col) {
  var cell = sheet.getRange(row, col);

  var rt = cell.getRichTextValue();
  if (rt) {
    if (rt.getLinkUrl()) return true;
    var runs = rt.getRuns();
    for (var r = 0; r < runs.length; r++) {
      if (runs[r].getLinkUrl()) return true;
    }
  }

  var f = cell.getFormula();
  if (f && f.toUpperCase().indexOf('HYPERLINK') !== -1) return true;

  var v = cell.getValue();
  if (v !== null && v !== undefined && v.toString().trim() !== '') return true;

  return false;
}

/** Lấy sheet Training Report, báo lỗi rõ ràng nếu không tìm thấy */
function tfmGetReportSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TFM_CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + TFM_CONFIG.SHEET_NAME
      + '". Vui lòng kiểm tra lại tên sheet trong TFM_CONFIG.SHEET_NAME.');
  }
  return sheet;
}

function tfmEscapeHtml(text) {
  if (text === null || text === undefined) return '';
  return text.toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


// ============================================================
// QUÉT SHEET - TÌM CÁC DÒNG CHƯA CÓ FOLDER
// ============================================================

function tfmScanRowsNeedingFolder() {
  var sheet = tfmGetReportSheet();
  var lastRow = sheet.getLastRow();
  var startRow = TFM_CONFIG.DATA_START_ROW;

  if (lastRow < startRow) {
    return { ready: [], invalid: [], totalScanned: 0 };
  }

  var numRows = lastRow - startRow + 1;
  var data = sheet.getRange(startRow, 2, numRows, 18).getValues();

  var ready = [];
  var invalid = [];
  var totalScanned = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + startRow;

    var rawDate = row[TFM_CONFIG.COL.DATE - 2];
    var type = (row[TFM_CONFIG.COL.TYPE - 2] || '').toString().trim();
    var category = (row[TFM_CONFIG.COL.CATEGORY - 2] || '').toString().trim();
    var audience = (row[TFM_CONFIG.COL.AUDIENCE - 2] || '').toString().trim();
    var topic = (row[TFM_CONFIG.COL.TOPIC - 2] || '').toString().trim();
    var status = (row[TFM_CONFIG.COL.STATUS - 2] || '').toString().trim();

    // Dòng trống hoàn toàn (chỉ có checkbox / công thức) → bỏ qua
    var isEmptyRow = !rawDate && !type && !category && !audience && !topic;
    if (isEmptyRow) continue;

    totalScanned++;

    // Bỏ qua dòng Cancel
    if (TFM_CONFIG.SKIP_STATUS.indexOf(status.toLowerCase()) !== -1) continue;

    // Đã có folder ở cột D → KHÔNG tạo lại
    if (tfmCellHasFolder(sheet, rowIndex, TFM_CONFIG.COL.FOLDER)) continue;

    // Kiểm tra đủ thông tin để đặt tên folder
    var ymd = tfmFormatDateYmd(rawDate);
    var missing = [];
    if (!ymd) missing.push('Actual Date (E)');
    if (!type) missing.push('Training Type (F)');
    if (!category) missing.push('Training Category (G)');
    if (!audience) missing.push('Target Audience (K)');

    if (missing.length > 0) {
      invalid.push({
        rowIndex: rowIndex,
        topic: topic,
        missing: missing.join(', ')
      });
      continue;
    }

    var parent = tfmResolveParentFolder(category);

    ready.push({
      rowIndex: rowIndex,
      ymd: ymd,
      type: type,
      category: category,
      audience: audience,
      topic: topic,
      status: status,
      folderName: tfmBuildFolderName(ymd, type, category, audience),
      parentLabel: parent.label,
      matched: parent.matched
    });
  }

  return { ready: ready, invalid: invalid, totalScanned: totalScanned };
}


// ============================================================
// DIALOG CHỌN DÒNG & TẠO FOLDER
// ============================================================

function showTrainingFolderDialog() {
  var scan;
  try {
    scan = tfmScanRowsNeedingFolder();
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi', err.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  if (scan.ready.length === 0 && scan.invalid.length === 0) {
    SpreadsheetApp.getUi().alert(
      'Không có dòng nào cần tạo folder',
      'Đã quét ' + scan.totalScanned + ' dòng có dữ liệu.\n\n'
      + 'Tất cả đều đã có link folder ở cột D (hoặc có Status = Cancel).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  var html = tfmBuildDialogHtml(scan);
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(950).setHeight(620),
    'Tạo Training Folder theo Training Category'
  );
}

function tfmBuildDialogHtml(scan) {
  var rows = '';
  for (var i = 0; i < scan.ready.length; i++) {
    var it = scan.ready[i];
    var warn = it.matched
      ? ''
      : '<div style="color:#c62828;font-size:11px;margin-top:3px;">⚠ Category không khớp bảng mapping → sẽ vào folder Chung</div>';

    rows += '<tr>'
      + '<td style="text-align:center;"><input type="checkbox" class="rowChk" value="' + it.rowIndex + '" checked></td>'
      + '<td>' + it.rowIndex + '</td>'
      + '<td>' + tfmEscapeHtml(it.type) + '</td>'
      + '<td>' + tfmEscapeHtml(it.category) + '</td>'
      + '<td>' + tfmEscapeHtml(it.audience) + '</td>'
      + '<td><code>' + tfmEscapeHtml(it.folderName) + '</code>' + warn + '</td>'
      + '<td><span class="badge ' + (it.matched ? 'ok' : 'no') + '">' + tfmEscapeHtml(it.parentLabel) + '</span></td>'
      + '</tr>';
  }

  var invalidHtml = '';
  if (scan.invalid.length > 0) {
    var lis = '';
    for (var j = 0; j < scan.invalid.length; j++) {
      lis += '<li>Dòng ' + scan.invalid[j].rowIndex + ': thiếu ' + tfmEscapeHtml(scan.invalid[j].missing) + '</li>';
    }
    invalidHtml = '<div class="warnbox"><strong>⚠ ' + scan.invalid.length
      + ' dòng chưa đủ thông tin để đặt tên folder (không tạo được):</strong><ul>' + lis + '</ul></div>';
  }

  var tableHtml = scan.ready.length > 0
    ? '<table><thead><tr>'
      + '<th style="width:45px;"><input type="checkbox" id="chkAll" checked></th>'
      + '<th style="width:55px;">Dòng</th><th style="width:80px;">Type</th>'
      + '<th style="width:120px;">Category</th><th style="width:150px;">Audience</th>'
      + '<th>Tên folder sẽ tạo</th><th style="width:130px;">Folder mẹ</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>'
    : '<div class="warnbox">Không có dòng nào đủ điều kiện tạo folder.</div>';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
    + 'body{font-family:Calibri,Arial,sans-serif;font-size:13px;padding:15px;margin:0;}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:15px;}'
    + 'th{background:#4472C4;color:#fff;padding:8px;border:1px solid #ddd;text-align:left;position:sticky;top:0;}'
    + 'td{padding:7px 8px;border:1px solid #ddd;vertical-align:top;}'
    + 'tr:nth-child(even){background:#f9f9f9;}tr:hover{background:#e8f4fc;}'
    + 'code{background:#f4f6f8;padding:2px 5px;border-radius:3px;font-size:12px;}'
    + '.info{background:#e8f4fc;padding:10px 12px;border-radius:4px;margin-bottom:12px;border-left:4px solid #4472C4;}'
    + '.warnbox{background:#fff3cd;border:1px solid #ffe082;border-left:4px solid #ffc107;padding:10px 12px;border-radius:4px;margin-bottom:12px;}'
    + '.warnbox ul{margin:6px 0 0;padding-left:20px;}'
    + '.badge{display:inline-block;padding:3px 8px;border-radius:10px;font-size:11px;color:#fff;}'
    + '.badge.ok{background:#28a745;}.badge.no{background:#c62828;}'
    + '.tablewrap{max-height:330px;overflow:auto;border:1px solid #eee;border-radius:4px;}'
    + '.btn-container{text-align:right;margin-top:14px;}'
    + 'button{padding:9px 18px;margin-left:10px;cursor:pointer;font-size:13px;border-radius:4px;}'
    + '.btn-go{background:#28a745;color:#fff;border:none;}.btn-go:hover{background:#218838;}'
    + '.btn-cancel{background:#f0f0f0;color:#333;border:1px solid #ccc;}'
    + '#status{margin-top:10px;padding:10px;display:none;border-radius:4px;white-space:pre-wrap;}'
    + '.success{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}'
    + '.error{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}'
    + '</style></head><body>'
    + '<div class="info"><strong>' + scan.ready.length + ' dòng</strong> chưa có folder ở cột D và đủ thông tin để tạo.<br>'
    + '<small>Dòng đã có link folder và dòng Status = Cancel đã được loại khỏi danh sách. '
    + 'Hệ thống chỉ ghi vào cột D, không thay đổi Status hay bất kỳ cột nào khác.</small></div>'
    + invalidHtml
    + '<div class="tablewrap">' + tableHtml + '</div>'
    + '<div id="status"></div>'
    + '<div class="btn-container">'
    + '<button class="btn-cancel" onclick="google.script.host.close()">Đóng</button>'
    + '<button class="btn-go" id="btnGo" onclick="doCreate()">Tạo folder</button></div>'
    + '<script>'
    + 'var all=document.getElementById("chkAll");'
    + 'if(all){all.addEventListener("change",function(){'
    + '  var cbs=document.querySelectorAll(".rowChk");'
    + '  for(var i=0;i<cbs.length;i++)cbs[i].checked=all.checked;'
    + '});}'
    + 'function showStatus(m,t){var s=document.getElementById("status");s.textContent=m;s.className=t;s.style.display="block";}'
    + 'function doCreate(){'
    + '  var cbs=document.querySelectorAll(".rowChk:checked");'
    + '  if(cbs.length===0){alert("Vui lòng chọn ít nhất 1 dòng.");return;}'
    + '  var rows=[];for(var i=0;i<cbs.length;i++)rows.push(parseInt(cbs[i].value));'
    + '  document.getElementById("btnGo").disabled=true;'
    + '  showStatus("Đang tạo "+rows.length+" folder trên Google Drive, vui lòng đợi...","success");'
    + '  google.script.run'
    + '    .withSuccessHandler(function(r){'
    + '      showStatus(r.message, r.success?"success":"error");'
    + '      document.getElementById("btnGo").disabled=false;'
    + '    })'
    + '    .withFailureHandler(function(e){'
    + '      showStatus("Lỗi: "+e.message,"error");'
    + '      document.getElementById("btnGo").disabled=false;'
    + '    })'
    + '    .tfmCreateFolders(rows);'
    + '}'
    + '</script></body></html>';
}


// ============================================================
// TẠO FOLDER (được gọi từ dialog)
// ============================================================

function tfmCreateFolders(selectedRows) {
  var started = new Date().getTime();
  var sheet;
  try {
    sheet = tfmGetReportSheet();
  } catch (err) {
    return { success: false, message: err.message };
  }

  var created = 0, reused = 0, skipped = 0, remaining = 0;
  var errors = [];
  var parentCache = {};

  for (var i = 0; i < selectedRows.length; i++) {

    // Dừng an toàn trước giới hạn 6 phút
    if (new Date().getTime() - started > TFM_CONFIG.TIME_BUDGET_MS) {
      remaining = selectedRows.length - i;
      break;
    }

    var rowIndex = selectedRows[i];

    try {
      // Kiểm tra lại lần cuối: đã có folder thì bỏ qua
      if (tfmCellHasFolder(sheet, rowIndex, TFM_CONFIG.COL.FOLDER)) {
        skipped++;
        continue;
      }

      var rowData = sheet.getRange(rowIndex, 2, 1, 18).getValues()[0];
      var rawDate = rowData[TFM_CONFIG.COL.DATE - 2];
      var type = (rowData[TFM_CONFIG.COL.TYPE - 2] || '').toString().trim();
      var category = (rowData[TFM_CONFIG.COL.CATEGORY - 2] || '').toString().trim();
      var audience = (rowData[TFM_CONFIG.COL.AUDIENCE - 2] || '').toString().trim();

      var ymd = tfmFormatDateYmd(rawDate);
      if (!ymd || !type || !category || !audience) {
        errors.push('Dòng ' + rowIndex + ': thiếu dữ liệu (Date/Type/Category/Audience).');
        continue;
      }

      var folderName = tfmBuildFolderName(ymd, type, category, audience);
      var parent = tfmResolveParentFolder(category);

      var parentFolder = parentCache[parent.id];
      if (!parentFolder) {
        parentFolder = DriveApp.getFolderById(parent.id);
        parentCache[parent.id] = parentFolder;
      }

      // Nếu folder mẹ đã có folder trùng tên → dùng lại
      var folder = null;
      var existing = parentFolder.getFoldersByName(folderName);
      if (existing.hasNext()) {
        folder = existing.next();
        reused++;
      } else {
        folder = parentFolder.createFolder(folderName);
        created++;
      }

      var url = folder.getUrl();

      // Ghi hyperlink vào cột D
      sheet.getRange(rowIndex, TFM_CONFIG.COL.FOLDER).setRichTextValue(
        SpreadsheetApp.newRichTextValue()
          .setText(folderName)
          .setLinkUrl(url)
          .build()
      );

      Logger.log('Row ' + rowIndex + ' → ' + parent.label + ' / ' + folderName + ' | ' + url);

    } catch (error) {
      errors.push('Dòng ' + rowIndex + ': ' + error.message);
    }
  }

  SpreadsheetApp.flush();

  var msg = 'HOÀN TẤT\n'
    + '• Folder tạo mới: ' + created + '\n'
    + '• Folder đã có sẵn trên Drive (dùng lại, không tạo trùng): ' + reused + '\n'
    + '• Bỏ qua vì cột D đã có link: ' + skipped;

  if (remaining > 0) {
    msg += '\n\n⏳ Còn ' + remaining + ' dòng chưa xử lý do gần hết thời gian cho phép của Apps Script.'
      + '\nVui lòng đóng cửa sổ và chạy lại menu một lần nữa.';
  }
  if (errors.length > 0) {
    msg += '\n\nLỗi:\n' + errors.join('\n');
  }

  return { success: errors.length === 0, message: msg };
}


// ============================================================
// CÔNG CỤ KIỂM TRA MAPPING
// ============================================================

function tfmCheckCategoryMapping() {
  var sheet;
  try {
    sheet = tfmGetReportSheet();
  } catch (err) {
    SpreadsheetApp.getUi().alert('Lỗi', err.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  var lastRow = sheet.getLastRow();
  var startRow = TFM_CONFIG.DATA_START_ROW;
  var report = 'GIÁ TRỊ "Training Category" ĐANG CÓ TRONG SHEET\n'
    + '============================================\n\n';

  if (lastRow >= startRow) {
    var values = sheet.getRange(startRow, TFM_CONFIG.COL.CATEGORY, lastRow - startRow + 1, 1).getValues();
    var counts = {};
    for (var i = 0; i < values.length; i++) {
      var v = (values[i][0] || '').toString().trim();
      if (!v) continue;
      counts[v] = (counts[v] || 0) + 1;
    }
    for (var name in counts) {
      var p = tfmResolveParentFolder(name);
      report += (p.matched ? '✅ ' : '⚠️ ') + '"' + name + '"  (' + counts[name] + ' dòng)\n'
        + '     → ' + p.label + '\n     → ' + p.id + '\n\n';
    }
  }

  report += '--------------------------------------------\n'
    + 'Folder mẹ mặc định khi không khớp:\n' + TFM_CONFIG.FALLBACK_PARENT_ID;

  SpreadsheetApp.getUi().alert('Kiểm tra mapping Category ↔ Folder mẹ', report,
    SpreadsheetApp.getUi().ButtonSet.OK);
}


/**
 * Chạy thử quyền truy cập Drive (chạy trực tiếp trong Apps Script Editor
 * lần đầu tiên để cấp quyền).
 */
function tfmTestDriveAccess() {
  var lines = [];
  for (var i = 0; i < TFM_CONFIG.CATEGORY_FOLDERS.length; i++) {
    var item = TFM_CONFIG.CATEGORY_FOLDERS[i];
    try {
      var f = DriveApp.getFolderById(item.id);
      lines.push('✅ ' + item.label + ' → ' + f.getName());
    } catch (e) {
      lines.push('❌ ' + item.label + ' → LỖI: ' + e.message);
    }
  }
  SpreadsheetApp.getUi().alert('Kiểm tra quyền truy cập Drive',
    lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}