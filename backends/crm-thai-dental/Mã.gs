/*****************************************************************************
 * MMH THAILAND DENTAL REPORT SYSTEM  v2.1
 * Spreadsheet: Thailand Dental Action FY67
 *----------------------------------------------------------------------------
 * v2.1 (2026-04-24):
 *  - All dialog/alert/error messages now in English
 *  - Weekly: filter STRICTLY by Start date (column K) only — Status decides Completed vs Pending bucket
 *  - "Issued by" consistently uses PIC name (or "ALL by PIC" for whole-team mode)
 *  - Bỏ chữ ký đỏ SVG theo file MRPT mẫu
 *  - PDF layout & màu sắc khớp file MRPT (Aptos, header xám, "Issued by" dưới title)
 *  - Monthly: cấu trúc PIC → tasks (mỗi PIC 1 trang)
 *  - Weekly: 3 bảng (Completed / Pending / Plan Next Week) với màu MRPT
 *  - Super-user routing:
 *      + Super-user (nt.ha, mmh.product) → email CHỈ gửi cho super-user, không CC ai
 *      + Regular PIC → routing bình thường (Ha/Shuhei + Hoa + PIC)
 *  - Monthly có thêm option "ALL by PIC" (chỉ super-user thấy):
 *      + Sinh 1 PDF với tất cả PIC (mỗi PIC 1 trang, theo style MRPT)
 *  - Weekly chỉ chọn theo PIC (super-user xem dropdown chọn 1 PIC)
 *  - Email body: TUYỆT ĐỐI KHÔNG ICON, chỉ đen + xám
 *----------------------------------------------------------------------------
 * SETUP (1 lần):
 *   1. Extensions → Apps Script → paste toàn bộ code → Save
 *   2. Run "td_setup" → cấp quyền
 *   3. Reload Sheet → menu "📊 MMH Report" xuất hiện
 *****************************************************************************/

var TD_CFG = {
  TEAM_NAME:  'Thailand Dental Sales & Marketing',
  TEAM_SHORT: 'TH_Dental',
  DEPARTMENT: 'Thailand Dental Sales & Marketing',
  SHEET_URL:  'https://docs.google.com/spreadsheets/d/1ONYLqqBaw4dPoN4jZJg8a1A5GAvfAuzM-Gsp_UHI7O4/edit',

  SUPER_USERS: [
    'nt.ha@manimedicalhanoi.com',
    'mmh.product@manimedicalhanoi.com'
  ],

  // --- PIC database ---
  PICS: [
    { name: 'Sui',     fullName: 'Sui',     email: 'manithailand1@manimedicalhanoi.com' },
    { name: 'Somchai', fullName: 'Somchai', email: 'manithailand2@manimedicalhanoi.com' },
    { name: 'Man',     fullName: 'Man',     email: 'manithailand3@manimedicalhanoi.com' }
  ],

  // --- Weekly recipients (for non-super-user only) ---
  // To = Shuhei, CC = Hoa + Ha + PIC
  WEEKLY_TO:      's-takahashi@mani.inc',
  WEEKLY_TO_NAME: 'Shuhei',
  WEEKLY_CC:      ['vtt.hoa@manimedicalhanoi.com', 'nt.ha@manimedicalhanoi.com'],
  GREETING_NAMES: ['Shuhei', 'Ha'],

  // --- Sheets ---
  WEEK_SHEET:    'WEEK',
  MONTHLY_SHEET: 'MONTHLY REPORT',

  WEEK_HEADER_ROW: 3,
  WEEK_DATA_START: 5,
  WEEK_COL: {
    NO: 2, ACCOUNT: 3, PIC: 4, FY: 5, START_MONTH: 6,
    TYPE_TASK: 7, TYPE_ACTION: 8, TASK: 9, TASK_RESULT: 10,
    START_DATE: 11, FINISH_DATE: 12, DEADLINE: 13, ASSIGNER: 14,
    STATUS: 15, ACTUAL_FINISH: 16, BEHAVIOR: 17, COMMENT: 18
  },

  MONTHLY_HEADER_ROW: 3,
  MONTHLY_DATA_START: 5,
  MONTHLY_COL: {
    NO: 2, TYPE_TASK: 3, PIC: 4, AREA: 5, FY: 6,
    MONTH: 7, PLAN: 8, RESULT: 9
  },

  // Type-Task display order in Monthly (Dental adds Clinics & Digital Marketing)
  TYPE_TASK_ORDER: [
    'Management-Turnover',
    'Management-Budgeting',
    'Sale-Distributor',
    'Sale-Hospital',
    'Sale-Clinics',
    'Sale-University',
    'Marketing-Event',
    'Marketing-Digital Marketing',
    'Marketing-KOL Partnership',
    'Back office-Registration'
  ],

  PIC_ORDER: ['Sui', 'Somchai', 'Man'],

  COLOR: {
    TEXT:       '#000000',
    HEADER_BG:  '#E5E7EB',
    BORDER:     '#9CA3AF',
    SEPARATOR:  '#6B7280',
    LINK:       '#1155CC',
    EMAIL_GRAY: '#6B7280',
    EMAIL_LIGHTGRAY: '#D1D5DB',
    EMAIL_BG:   '#F3F4F6',
    WHITE:      '#FFFFFF'
  }
};

/*============================================================================
 * SETUP & MENU
 *============================================================================*/
function td_setup() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'td_buildMenu') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('td_buildMenu')
    .forSpreadsheet(SpreadsheetApp.getActive()).onOpen().create();
  td_buildMenu();
  SpreadsheetApp.getUi().alert('Setup Complete',
    'Menu "MMH Report" is now active.\n\nClose and reopen the file to make the menu appear stably.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}
function td_buildMenu() {
  SpreadsheetApp.getUi().createMenu('📊 MMH Report')
    .addItem('📅 Weekly Report', 'td_showWeeklyDialog')
    .addItem('📆 Monthly Report', 'td_showMonthlyDialog')
    .addSeparator()
    .addItem('⚙️ Reinstall Trigger', 'td_setup')
    .addToUi();
}

/*============================================================================
 * USER CONTEXT HELPERS
 *============================================================================*/
function td_currentUserEmail_() {
  return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
}
function td_isSuperUser_(email) {
  return TD_CFG.SUPER_USERS.indexOf(String(email).toLowerCase()) > -1;
}
function td_findPicByEmail_(email) {
  const e = String(email).toLowerCase();
  for (const p of TD_CFG.PICS) {
    if (String(p.email).toLowerCase() === e) return p;
  }
  return null;
}
function td_findPicByName_(name) {
  const n = String(name).toLowerCase();
  for (const p of TD_CFG.PICS) {
    if (String(p.name).toLowerCase() === n) return p;
  }
  return null;
}
function td_getPicContext_() {
  const email = td_currentUserEmail_();
  const isSuper = td_isSuperUser_(email);
  const currentPic = td_findPicByEmail_(email);
  return {
    email: email,
    isSuper: isSuper,
    currentPic: currentPic,
    allPics: TD_CFG.PICS
  };
}

/*============================================================================
 * DATE & STRING HELPERS
 *============================================================================*/
function td_weekBoundsOf_(d) {
  // Mon → Sun (ISO)
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = dt.getDay();   // 0=Sun, 1=Mon, ...
  const offset = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + offset);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  return { start: mon, end: sun };
}
function td_nextWeekBoundsOf_(d) {
  const wk = td_weekBoundsOf_(d);
  const nm = new Date(wk.start.getFullYear(), wk.start.getMonth(), wk.start.getDate() + 7);
  return td_weekBoundsOf_(nm);
}
function td_fmtDM_(d)   { return Utilities.formatDate(d, 'GMT+7', 'dd/MM/yy'); }
function td_fmtDMY_(d)  { return Utilities.formatDate(d, 'GMT+7', 'dd/MM/yyyy'); }
function td_fmtISO_(d)  { return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd'); }
function td_escHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/*============================================================================
 * WEEKLY DIALOG
 *============================================================================*/
function td_showWeeklyDialog() {
  const ctx = td_getPicContext_();
  if (!ctx.isSuper && !ctx.currentPic) {
    SpreadsheetApp.getUi().alert(
      'Access Denied',
      'Your email (' + ctx.email + ') does not match any PIC in the configuration.\n\n' +
      'Please contact admin to be added to the PIC list.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const picOptions = ctx.isSuper
    ? TD_CFG.PICS.map(p => ({ name: p.name, label: p.name + ' (' + p.email + ')' }))
    : [{ name: ctx.currentPic.name, label: ctx.currentPic.name }];

  const html = HtmlService.createHtmlOutput(
    td_weeklyDialogHtml_(picOptions, ctx.isSuper, new Date())
  ).setWidth(480).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Weekly Report - ' + TD_CFG.TEAM_NAME);
}
function td_weeklyDialogHtml_(picOptions, isSuper, now) {
  const today = td_fmtISO_(now);
  const picOpts = picOptions.map(p =>
    '<option value="' + td_escHtml_(p.name) + '">' + td_escHtml_(p.label) + '</option>'
  ).join('');
  const superNote = isSuper
    ? '<div class="info"><b>Super-user mode:</b> The report email will be sent only to your address (no CC) for testing/tracking by PIC.</div>'
    : '';
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    "body{font-family:'Aptos','Segoe UI',Arial,sans-serif;padding:20px;margin:0;color:#000}" +
    'h3{margin:0 0 15px;font-size:16px}' +
    'label{font-weight:600;font-size:13px;display:block;margin-top:10px}' +
    'select,input{width:100%;padding:10px;font-size:14px;border:1px solid #9CA3AF;border-radius:6px;background:#fff;color:#000;margin-top:6px;box-sizing:border-box}' +
    'button{background:#374151;color:#fff;padding:12px 24px;border:0;border-radius:6px;cursor:pointer;font-size:14px;margin-top:18px;font-weight:600;width:100%}' +
    'button:hover{background:#1F2937}' +
    'button:disabled{background:#9CA3AF;cursor:not-allowed}' +
    '.info{background:#F3F4F6;border-left:3px solid #374151;padding:10px 12px;border-radius:4px;margin:14px 0;font-size:12.5px;line-height:1.6}' +
    '.status{margin-top:14px;padding:10px;border-radius:6px;display:none;font-size:13px}' +
    '.status.loading{display:block;background:#F3F4F6;color:#000}' +
    '.status.success{display:block;background:#F0FDF4;color:#166534}' +
    '.status.error{display:block;background:#FEF2F2;color:#991B1B}' +
    '.spinner{display:inline-block;width:14px;height:14px;border:2px solid #374151;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '</style></head><body>' +
    '<h3>Weekly Report</h3>' +
    superNote +
    '<label>PIC:</label><select id="picSel">' + picOpts + '</select>' +
    '<label>Reference date (in target week):</label>' +
    '<input type="date" id="refDate" value="' + today + '">' +
    '<div class="info">The system will compute the week (Mon-Sun) containing this reference date, ' +
    'pull tasks whose <b>Start date</b> falls in that week (Completed / Pending), ' +
    'and tasks whose Start date falls in the next week (Plan).</div>' +
    '<button id="btn" onclick="submit()">Generate &amp; Send</button>' +
    '<div id="status" class="status"></div>' +
    '<script>' +
    'function submit(){' +
      'var p=document.getElementById("picSel").value;' +
      'var d=document.getElementById("refDate").value;' +
      'if(!p||!d){alert("Please select PIC and date");return;}' +
      'var b=document.getElementById("btn"),s=document.getElementById("status");' +
      'b.disabled=true;s.className="status loading";' +
      's.innerHTML=\'<span class="spinner"></span>Generating PDF and sending email, please wait 30-60s...\';' +
      'google.script.run' +
        '.withSuccessHandler(function(x){s.className="status success";s.innerHTML="Done: "+x;b.disabled=false;})' +
        '.withFailureHandler(function(e){s.className="status error";s.innerHTML="Error: "+e.message;b.disabled=false;})' +
        '.td_generateWeekly(p,d);' +
    '}' +
    '</script></body></html>';
}

/*============================================================================
 * MONTHLY DIALOG
 *============================================================================*/
function td_showMonthlyDialog() {
  const ctx = td_getPicContext_();
  if (!ctx.isSuper && !ctx.currentPic) {
    SpreadsheetApp.getUi().alert(
      'Access Denied',
      'Your email (' + ctx.email + ') does not match any PIC in the configuration.',
      SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  const periods = td_getAvailablePeriods_();
  if (!periods.months.length && !periods.quarters.length) {
    SpreadsheetApp.getUi().alert('No data found in sheet "' + TD_CFG.MONTHLY_SHEET + '"');
    return;
  }
  const picOptions = ctx.isSuper
    ? [{ name: '__ALL__', label: 'ALL by PIC (whole team)' }]
        .concat(TD_CFG.PICS.map(p => ({ name: p.name, label: p.name + ' (' + p.email + ')' })))
    : [{ name: ctx.currentPic.name, label: ctx.currentPic.name }];

  const html = HtmlService.createHtmlOutput(
    td_monthlyDialogHtml_(picOptions, ctx.isSuper, periods)
  ).setWidth(500).setHeight(540);
  SpreadsheetApp.getUi().showModalDialog(html, 'Monthly Report - ' + TD_CFG.TEAM_NAME);
}
function td_getAvailablePeriods_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(TD_CFG.MONTHLY_SHEET);
  if (!sh) throw new Error('Sheet not found: ' + TD_CFG.MONTHLY_SHEET);
  const lastRow = sh.getLastRow();
  if (lastRow < TD_CFG.MONTHLY_DATA_START) return { months: [], quarters: [] };
  const n = lastRow - TD_CFG.MONTHLY_DATA_START + 1;
  const vals = sh.getRange(TD_CFG.MONTHLY_DATA_START, TD_CFG.MONTHLY_COL.MONTH, n, 1).getValues();
  const set = new Set();
  vals.forEach(r => {
    const v = r[0];
    if (v !== '' && v !== null && v !== undefined) set.add(String(v).trim());
  });
  const months = [], quarters = [];
  set.forEach(v => {
    if (/^Q\d+FY\d+$/i.test(v)) quarters.push(v);
    else if (/^\d{6}$/.test(v)) months.push(v);
  });
  months.sort((a, b) => b.localeCompare(a));
  quarters.sort((a, b) => {
    const k = q => { const m = q.match(/Q(\d+)FY(\d+)/i); return m ? parseInt(m[2]) * 10 + parseInt(m[1]) : 0; };
    return k(b) - k(a);
  });
  return { months: months, quarters: quarters };
}
function td_fmtPeriodDisplay_(p) {
  const s = String(p).trim();
  if (s.toUpperCase().indexOf('Q') > -1) return s;
  if (s.length === 6) return s.substring(4, 6) + '/' + s.substring(0, 4);
  return s;
}
function td_fmtPeriodFilename_(p) {
  const s = String(p).trim();
  if (s.toUpperCase().indexOf('Q') > -1) return s;
  if (s.length === 6) return s.substring(4, 6) + s.substring(0, 4);
  return s;
}
function td_nextMonth_(yyyymm) {
  const s = String(yyyymm).trim();
  if (s.length !== 6) return s;
  let y = parseInt(s.substring(0, 4), 10);
  let m = parseInt(s.substring(4, 6), 10) + 1;
  if (m > 12) { m = 1; y++; }
  return y + ('0' + m).slice(-2);
}
function td_monthlyDialogHtml_(picOptions, isSuper, periods) {
  const monthOpts = periods.months.map(p =>
    '<option value="' + td_escHtml_(p) + '">' + td_escHtml_(td_fmtPeriodDisplay_(p)) + '</option>'
  ).join('');
  const quarterOpts = periods.quarters.map(p =>
    '<option value="' + td_escHtml_(p) + '">' + td_escHtml_(p) + '</option>'
  ).join('');
  const picOpts = picOptions.map(p =>
    '<option value="' + td_escHtml_(p.name) + '">' + td_escHtml_(p.label) + '</option>'
  ).join('');
  const hasMonths = periods.months.length > 0;
  const hasQuarters = periods.quarters.length > 0;
  const defaultMode = hasMonths ? 'month' : 'quarter';
  const superNote = isSuper
    ? '<div class="info"><b>Super-user mode:</b> The report email will be sent only to your address for testing/tracking. You can pick a specific PIC or <b>"ALL by PIC"</b> to export the whole team (each PIC on a separate page).</div>'
    : '';
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    "body{font-family:'Aptos','Segoe UI',Arial,sans-serif;padding:20px;margin:0;color:#000}" +
    'h3{margin:0 0 12px;font-size:16px}' +
    'label{font-weight:600;font-size:13px;display:block;margin-top:8px}' +
    'select{width:100%;padding:10px;font-size:14px;border:1px solid #9CA3AF;border-radius:6px;background:#fff;color:#000;margin-top:6px;box-sizing:border-box}' +
    'button{background:#374151;color:#fff;padding:12px 24px;border:0;border-radius:6px;cursor:pointer;font-size:14px;margin-top:15px;font-weight:600;width:100%}' +
    'button:hover{background:#1F2937}' +
    'button:disabled{background:#9CA3AF;cursor:not-allowed}' +
    '.tab-group{display:flex;gap:8px;margin:8px 0 12px;background:#F3F4F6;padding:4px;border-radius:8px}' +
    '.tab-label{flex:1;display:flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:all .15s}' +
    '.tab-label:has(input:checked){background:#374151;color:#fff}' +
    '.tab-label input{display:none}' +
    '.tab-label.disabled{opacity:.4;cursor:not-allowed}' +
    '.box{margin-top:6px}' +
    '.info{background:#F3F4F6;border-left:3px solid #374151;padding:10px 12px;border-radius:4px;margin:12px 0;font-size:12.5px;line-height:1.6}' +
    '.status{margin-top:14px;padding:10px;border-radius:6px;display:none;font-size:13px}' +
    '.status.loading{display:block;background:#F3F4F6;color:#000}' +
    '.status.success{display:block;background:#F0FDF4;color:#166534}' +
    '.status.error{display:block;background:#FEF2F2;color:#991B1B}' +
    '.spinner{display:inline-block;width:14px;height:14px;border:2px solid #374151;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '</style></head><body>' +
    '<h3>Monthly Report</h3>' +
    superNote +
    '<label>PIC:</label><select id="picSel">' + picOpts + '</select>' +
    '<label>Report period:</label>' +
    '<div class="tab-group">' +
      '<label class="tab-label' + (hasMonths ? '' : ' disabled') + '">' +
        '<input type="radio" name="mode" value="month" ' + (defaultMode === 'month' ? 'checked' : '') +
        (hasMonths ? '' : ' disabled') + ' onchange="switchMode()">By Month</label>' +
      '<label class="tab-label' + (hasQuarters ? '' : ' disabled') + '">' +
        '<input type="radio" name="mode" value="quarter" ' + (defaultMode === 'quarter' ? 'checked' : '') +
        (hasQuarters ? '' : ' disabled') + ' onchange="switchMode()">By Quarter</label>' +
    '</div>' +
    '<div id="monthBox" class="box" style="display:' + (defaultMode === 'month' ? 'block' : 'none') + '">' +
      '<select id="monthSel">' + monthOpts + '</select>' +
    '</div>' +
    '<div id="quarterBox" class="box" style="display:' + (defaultMode === 'quarter' ? 'block' : 'none') + '">' +
      '<select id="quarterSel">' + quarterOpts + '</select>' +
    '</div>' +
    '<div class="info">' +
    '<b>Note:</b><br>' +
    '&bull; <b>By Month</b> &rarr; sends 2 PDFs: Report for that month + Plan for the next month<br>' +
    '&bull; <b>By Quarter</b> &rarr; sends 1 PDF (quarterly report)' +
    '</div>' +
    '<button id="btn" onclick="submit()">Generate &amp; Send</button>' +
    '<div id="status" class="status"></div>' +
    '<script>' +
    'function switchMode(){' +
      'var m=document.querySelector(\'input[name="mode"]:checked\').value;' +
      'document.getElementById("monthBox").style.display=m==="month"?"block":"none";' +
      'document.getElementById("quarterBox").style.display=m==="quarter"?"block":"none";' +
    '}' +
    'function submit(){' +
      'var pic=document.getElementById("picSel").value;' +
      'var mode=document.querySelector(\'input[name="mode"]:checked\').value;' +
      'var p=mode==="month"?document.getElementById("monthSel").value:document.getElementById("quarterSel").value;' +
      'if(!pic||!p){alert("Please complete all fields");return;}' +
      'var b=document.getElementById("btn"),s=document.getElementById("status");' +
      'b.disabled=true;s.className="status loading";' +
      's.innerHTML=\'<span class="spinner"></span>Generating PDF and sending email, please wait 30-90s...\';' +
      'google.script.run' +
        '.withSuccessHandler(function(x){s.className="status success";s.innerHTML="Done: "+x;b.disabled=false;})' +
        '.withFailureHandler(function(e){s.className="status error";s.innerHTML="Error: "+e.message;b.disabled=false;})' +
        '.td_generateMonthly(pic,p);' +
    '}' +
    '</script></body></html>';
}

/*============================================================================
 * WEEKLY GENERATOR
 *============================================================================*/
function td_generateWeekly(picName, refDateIso) {
  const ctx = td_getPicContext_();
  if (!ctx.isSuper && !ctx.currentPic) throw new Error('You do not have permission to run this report');

  const pic = td_findPicByName_(picName);
  if (!pic) throw new Error('PIC not found: ' + picName);

  // Regular PIC can only generate for themselves
  if (!ctx.isSuper && ctx.currentPic.name !== pic.name) {
    throw new Error('You can only generate a report for PIC: ' + ctx.currentPic.name);
  }

  const refDate = new Date(refDateIso + 'T00:00:00+07:00');
  const tw = td_weekBoundsOf_(refDate);
  const nw = td_nextWeekBoundsOf_(refDate);

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(TD_CFG.WEEK_SHEET);
  if (!sh) throw new Error('Sheet not found: ' + TD_CFG.WEEK_SHEET);

  const data = td_readWeekData_(sh, pic, tw, nw);
  const html = td_buildWeeklyEmailHtml_(pic, tw, nw, data, ctx.isSuper);
  const pdf  = td_buildWeeklyPdf_(pic, tw, nw, data);
  const sent = td_sendWeeklyEmail_(pic, tw, nw, html, pdf, ctx);
  return 'Weekly Report (' + pic.name + ') sent to ' + sent;
}

function td_readWeekData_(sh, pic, thisWk, nextWk) {
  const lastRow = sh.getLastRow();
  const startRow = TD_CFG.WEEK_DATA_START;
  if (lastRow < startRow) return { completed: [], pending: [], plan: [] };
  const n = lastRow - startRow + 1;
  const lastCol = Math.max(TD_CFG.WEEK_COL.COMMENT, sh.getLastColumn());
  const range = sh.getRange(startRow, 1, n, lastCol);
  const values = range.getValues();
  const richValues = range.getRichTextValues();

  const C = TD_CFG.WEEK_COL;
  const completed = [], pending = [], plan = [];

  function parseDate(v) {
    if (v instanceof Date) return v;
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    // dd/MM/yyyy
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(+m[3], +m[2]-1, +m[1]);
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function inRange(d, b) {
    if (!d) return false;
    const t = d.getTime();
    return t >= b.start.getTime() && t <= (b.end.getTime() + 86399999);
  }

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const richRow = richValues[i];
    const rowPic = String(row[C.PIC - 1] || '').trim();
    if (rowPic.toLowerCase() !== pic.name.toLowerCase()) continue;

    const startD = parseDate(row[C.START_DATE - 1]);
    if (!startD) continue;   // skip rows with no Start date

    const finishD = parseDate(row[C.FINISH_DATE - 1]);
    const status = String(row[C.STATUS - 1] || '').trim().toLowerCase();
    const actualFinishD = parseDate(row[C.ACTUAL_FINISH - 1]);

    const item = {
      rowIndex: startRow + i,
      account:    { plain: row[C.ACCOUNT - 1],     rich: richRow[C.ACCOUNT - 1] },
      typeAction: { plain: row[C.TYPE_ACTION - 1], rich: richRow[C.TYPE_ACTION - 1] },
      task:       { plain: row[C.TASK - 1],        rich: richRow[C.TASK - 1] },
      taskResult: { plain: row[C.TASK_RESULT - 1], rich: richRow[C.TASK_RESULT - 1] },
      startDate:  startD,
      finishDate: finishD,
      actualFinishDate: actualFinishD,
      status: status
    };

    // Filter ONLY by Start date (column K). Status decides Completed vs Pending bucket.
    const isDone = status === 'done' || status === 'completed' ||
                   status === 'hoàn thành' || status === 'finished' ||
                   status === 'complete';

    if (inRange(startD, thisWk)) {
      if (isDone) completed.push(item);
      else        pending.push(item);
    } else if (inRange(startD, nextWk)) {
      plan.push(item);
    }
  }

  // Sort by start date ascending
  const byStart = (a, b) => (a.startDate ? a.startDate.getTime() : 0) - (b.startDate ? b.startDate.getTime() : 0);
  completed.sort(byStart); pending.sort(byStart); plan.sort(byStart);
  return { completed: completed, pending: pending, plan: plan };
}

/* RichTextValue → HTML (preserve bold/italic/underline/color/link/line-break) */
function td_richToHtml_(field) {
  if (!field) return '';
  const rich = field.rich;
  if (!rich) return td_escHtml_(field.plain).replace(/\n/g, '<br>');
  const text = rich.getText();
  if (!text) return '';
  const runs = rich.getRuns();
  let html = '';
  runs.forEach(run => {
    const segText = text.substring(run.getStartIndex(), run.getEndIndex());
    const style = run.getTextStyle();
    const link = run.getLinkUrl();
    let css = '';
    if (style) {
      if (style.isBold()) css += 'font-weight:bold;';
      if (style.isItalic()) css += 'font-style:italic;';
      if (style.isUnderline()) css += 'text-decoration:underline;';
      const fg = style.getForegroundColor();
      // Email chỉ dùng đen + xám: bỏ qua màu chữ trong source, chỉ giữ #000
      // Nếu link thì dùng màu link mặc định (sẽ override bên dưới)
      if (fg && fg !== '#000000' && !link) {
        // Convert mọi màu thành đen để tuân thủ "đen + xám đơn thuần"
      }
    }
    let safe = td_escHtml_(segText).replace(/\n/g, '<br>');
    if (link) {
      // Link trong email: xám đậm, gạch chân (không màu xanh)
      safe = '<a href="' + td_escHtml_(link) + '" style="color:#374151;text-decoration:underline">' + safe + '</a>';
    } else {
      // Auto-detect URLs trong text
      safe = td_autolinkPlain_(safe);
    }
    if (css) html += '<span style="' + css + '">' + safe + '</span>';
    else html += safe;
  });
  return html;
}
function td_autolinkPlain_(safeHtml) {
  // safeHtml đã được escape; tìm URL trong text raw
  return safeHtml.replace(/(https?:\/\/[^\s<>"']+)/g, function(url) {
    let trail = '';
    while (/[.,;:!?)]/.test(url[url.length - 1])) {
      trail = url[url.length - 1] + trail;
      url = url.slice(0, -1);
    }
    return '<a href="' + url + '" style="color:#374151;text-decoration:underline">' + url + '</a>' + trail;
  });
}

function td_buildWeeklyEmailHtml_(pic, tw, nw, data, isSuper) {
  const C = TD_CFG.COLOR;
  const greetingNames = isSuper ? [pic.name] : TD_CFG.GREETING_NAMES;
  const greetingHtml = greetingNames.map(n => 'Dear ' + td_escHtml_(n) + ' san').join(',<br>');

  const total = data.completed.length + data.pending.length;
  const periodLine =
    'This week: ' + td_fmtDM_(tw.start) + ' - ' + td_fmtDM_(tw.end) +
    ' &nbsp;|&nbsp; Plan week: ' + td_fmtDM_(nw.start) + ' - ' + td_fmtDM_(nw.end);

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FFFFFF">' +
    '<div style="font-family:Calibri,Arial,sans-serif;color:#000000;font-weight:bold;font-size:11pt;max-width:980px;margin:0 auto;padding:18px 14px">' +

    // Header block
    '<div style="border-bottom:1px solid #D1D5DB;padding-bottom:10px;margin-bottom:14px">' +
      '<div style="font-size:18pt;font-weight:bold;color:#000000">Weekly Report</div>' +
      '<div style="font-size:10pt;color:#6B7280;margin-top:2px;font-weight:bold">Issued by: ' + td_escHtml_(pic.name) + '</div>' +
      '<div style="font-size:10pt;color:#6B7280;font-weight:bold">' + TD_CFG.TEAM_NAME + ' &middot; ' + TD_CFG.DEPARTMENT + '</div>' +
      '<div style="font-size:11pt;color:#000000;margin-top:6px;font-weight:bold">' + periodLine + '</div>' +
    '</div>' +

    '<p style="margin:0 0 8px;font-weight:bold">' + greetingHtml + ',</p>' +
    '<p style="margin:0 0 14px;font-weight:bold">Below is the weekly report of <span style="color:#000">' + td_escHtml_(pic.name) + '</span> ' +
    'for the week of <span style="color:#000">' + td_fmtDM_(tw.start) + ' - ' + td_fmtDM_(tw.end) + '</span> ' +
    'and the plan for next week (<span style="color:#000">' + td_fmtDM_(nw.start) + ' - ' + td_fmtDM_(nw.end) + '</span>).</p>' +

    // Stats overview
    '<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-weight:bold">' +
      '<tr>' +
        '<td style="width:33%;background:#F3F4F6;border:1px solid #D1D5DB;padding:8px 10px;font-weight:bold">' +
          '<div style="font-size:9pt;color:#6B7280">This week (Total)</div>' +
          '<div style="font-size:14pt;color:#000000;font-weight:bold">' + total + '</div>' +
        '</td>' +
        '<td style="width:33%;background:#F3F4F6;border:1px solid #D1D5DB;padding:8px 10px;font-weight:bold">' +
          '<div style="font-size:9pt;color:#6B7280">Completed / Pending</div>' +
          '<div style="font-size:14pt;color:#000000;font-weight:bold">' + data.completed.length + ' / ' + data.pending.length + '</div>' +
        '</td>' +
        '<td style="width:34%;background:#F3F4F6;border:1px solid #D1D5DB;padding:8px 10px;font-weight:bold">' +
          '<div style="font-size:9pt;color:#6B7280">Plan next week</div>' +
          '<div style="font-size:14pt;color:#000000;font-weight:bold">' + data.plan.length + '</div>' +
        '</td>' +
      '</tr>' +
    '</table>' +

    td_buildWeeklyTableHtml_('I. Completed this week', data.completed, true) +
    td_buildWeeklyTableHtml_('II. Pending', data.pending, true) +
    td_buildWeeklyTableHtml_('III. Plan next week', data.plan, false) +

    '<p style="margin:18px 0 4px;font-weight:bold">' +
      '<a href="' + TD_CFG.SHEET_URL + '" style="color:#374151;text-decoration:underline;font-weight:bold">View Detail (Google Sheet)</a>' +
    '</p>' +

    '<div style="margin-top:24px;padding-top:10px;border-top:1px solid #D1D5DB;font-size:10pt;color:#6B7280;font-weight:bold">' +
      'Best regards,<br>' +
      td_escHtml_(pic.name) + (pic.fullName && pic.fullName !== pic.name ? ' (' + td_escHtml_(pic.fullName) + ')' : '') + '<br>' +
      TD_CFG.TEAM_NAME +
    '</div>' +

    '</div></body></html>';
}

function td_buildWeeklyTableHtml_(title, items, withResult) {
  const C = TD_CFG.COLOR;
  let html = '<div style="font-size:12pt;font-weight:bold;color:#000000;margin:14px 0 6px">' + td_escHtml_(title) + '</div>';
  if (!items.length) {
    html += '<div style="font-size:10pt;color:#6B7280;font-style:italic;font-weight:bold;margin-bottom:8px">(No data)</div>';
    return html;
  }
  // Header row
  const cols = withResult
    ? [
        { label: '#',           width: '4%',  align: 'center' },
        { label: 'Start date',  width: '8%',  align: 'center' },
        { label: 'Account',     width: '13%', align: 'left' },
        { label: 'Type Action', width: '11%', align: 'left' },
        { label: 'Task',        width: '24%', align: 'left' },
        { label: 'Task Result', width: '32%', align: 'left' },
        { label: 'Finish date', width: '8%',  align: 'center' }
      ]
    : [
        { label: '#',           width: '4%',  align: 'center' },
        { label: 'Start date',  width: '8%',  align: 'center' },
        { label: 'Account',     width: '14%', align: 'left' },
        { label: 'Type Action', width: '13%', align: 'left' },
        { label: 'Task',        width: '53%', align: 'left' },
        { label: 'Finish date', width: '8%',  align: 'center' }
      ];

  html += '<table style="width:100%;border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:10.5pt;font-weight:bold">';
  html += '<thead><tr>';
  cols.forEach(c => {
    html += '<th style="background:#D9D9D9;border:1px solid #9CA3AF;padding:6px 8px;font-weight:bold;color:#000000;text-align:' + c.align + ';width:' + c.width + '">' + c.label + '</th>';
  });
  html += '</tr></thead><tbody>';

  items.forEach((it, i) => {
    const startStr = it.startDate ? td_fmtDM_(it.startDate) : '';
    const finishStr = it.actualFinishDate ? td_fmtDM_(it.actualFinishDate) : (it.finishDate ? td_fmtDM_(it.finishDate) : '');
    html += '<tr>';
    html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;text-align:center;vertical-align:top;font-weight:bold">' + (i + 1) + '</td>';
    html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;text-align:center;vertical-align:top;font-weight:bold">' + td_escHtml_(startStr) + '</td>';
    html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;vertical-align:top;font-weight:bold">' + td_richToHtml_(it.account) + '</td>';
    html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;vertical-align:top;font-weight:bold">' + td_richToHtml_(it.typeAction) + '</td>';
    html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;vertical-align:top;font-weight:bold">' + td_richToHtml_(it.task) + '</td>';
    if (withResult) {
      html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;vertical-align:top;font-weight:bold">' + td_richToHtml_(it.taskResult) + '</td>';
    }
    html += '<td style="border:1px solid #9CA3AF;padding:6px 8px;text-align:center;vertical-align:top;font-weight:bold">' + td_escHtml_(finishStr) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function td_makeWeeklyFilename_(pic, tw, nw) {
  return 'Weekly Report_' + TD_CFG.TEAM_SHORT + '_' + pic.name + '_' +
         Utilities.formatDate(tw.start, 'GMT+7', 'yyyyMMdd') + '-' +
         Utilities.formatDate(tw.end, 'GMT+7', 'yyyyMMdd') + '.pdf';
}

function td_buildWeeklyPdf_(pic, tw, nw, data) {
  const tempName = '_TD_WK_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
  const tempSS = SpreadsheetApp.create(tempName);
  try {
    td_layoutWeeklyTempSheet_(tempSS, pic, tw, nw, data);
    SpreadsheetApp.flush();
    Utilities.sleep(2500);
    const fname = td_makeWeeklyFilename_(pic, tw, nw);
    return td_exportPdf_(tempSS, fname, true);   // landscape
  } finally {
    try { DriveApp.getFileById(tempSS.getId()).setTrashed(true); }
    catch (e) { console.warn('Không xóa được temp: ' + e.message); }
  }
}

function td_layoutWeeklyTempSheet_(tempSS, pic, tw, nw, data) {
  const C = TD_CFG.COLOR;
  const sh = tempSS.getActiveSheet();
  sh.setName('Weekly');

  // 7 cols ~ A4 landscape (1040px usable at 0.3" margin)
  // No(40) | Start(75) | Account(150) | Type Action(110) | Task(280) | Task Result(310) | Finish(75) = 1040
  const widths = [40, 75, 150, 110, 280, 310, 75];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));

  let r = 1;
  // Title
  sh.getRange(r, 1, 1, 7).merge().setValue('Weekly Report — ' + TD_CFG.TEAM_NAME)
    .setFontFamily('Aptos').setFontSize(18).setFontWeight('bold')
    .setFontColor(C.TEXT).setHorizontalAlignment('left');
  sh.setRowHeight(r, 28); r++;

  sh.getRange(r, 1, 1, 7).merge().setValue('Issued by: ' + pic.name)
    .setFontFamily('Aptos').setFontSize(11).setFontColor(C.TEXT).setHorizontalAlignment('left');
  r++;
  sh.getRange(r, 1, 1, 7).merge()
    .setValue('Period: This week ' + td_fmtDM_(tw.start) + ' - ' + td_fmtDM_(tw.end) +
              '   |   Plan week ' + td_fmtDM_(nw.start) + ' - ' + td_fmtDM_(nw.end))
    .setFontFamily('Aptos').setFontSize(12).setFontColor(C.TEXT).setHorizontalAlignment('left');
  r++;
  sh.getRange(r, 1, 1, 7).merge().setValue('Department: ' + TD_CFG.DEPARTMENT)
    .setFontFamily('Aptos').setFontSize(11).setFontColor(C.TEXT).setHorizontalAlignment('left');
  r++;

  sh.getRange(r, 1, 1, 7).setBorder(null, null, true, null, false, false,
    C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
  r++;
  r++;

  // Section I: Completed this week
  r = td_writeWeeklySection_(sh, r, 'I. Completed this week', data.completed, true);
  r++;
  r = td_writeWeeklySection_(sh, r, 'II. Pending', data.pending, true);
  r++;
  r = td_writeWeeklySection_(sh, r, 'III. Plan next week', data.plan, false);

  // Footer hyperlink
  r += 2;
  const cell = sh.getRange(r, 1);
  const rtv = SpreadsheetApp.newRichTextValue()
    .setText('🔗 View Google Sheet')
    .setLinkUrl(TD_CFG.SHEET_URL)
    .setTextStyle(SpreadsheetApp.newTextStyle()
      .setFontFamily('Aptos').setFontSize(10)
      .setForegroundColor(C.LINK).setUnderline(true).build())
    .build();
  cell.setRichTextValue(rtv);
  sh.getRange(r, 1, 1, 7).merge();
  sh.getRange(r, 1).setHorizontalAlignment('center');
}

function td_writeWeeklySection_(sh, r, title, items, withResult) {
  const C = TD_CFG.COLOR;

  // Section heading
  sh.getRange(r, 1, 1, 7).merge().setValue(title)
    .setFontFamily('Aptos').setFontSize(13).setFontWeight('bold')
    .setFontColor(C.TEXT).setHorizontalAlignment('left');
  sh.setRowHeight(r, 24); r++;

  if (!items.length) {
    sh.getRange(r, 1, 1, 7).merge().setValue('(No data)')
      .setFontFamily('Aptos').setFontSize(11).setFontStyle('italic').setFontColor('#6B7280');
    r++;
    return r;
  }

  // Header row
  const headers = withResult
    ? ['#', 'Start date', 'Account', 'Type Action', 'Task', 'Task Result', 'Finish date']
    : ['#', 'Start date', 'Account', 'Type Action', 'Task', '',            'Finish date'];

  const headerRange = sh.getRange(r, 1, 1, 7);
  headerRange.setValues([headers])
    .setFontFamily('Aptos').setFontSize(11).setFontWeight('bold')
    .setBackground(C.HEADER_BG).setFontColor(C.TEXT)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, true, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);

  if (!withResult) {
    // Merge Task across cols 5-6
    sh.getRange(r, 5, 1, 2).merge();
  }
  sh.setRowHeight(r, 24); r++;

  // Data rows
  items.forEach((it, i) => {
    const startStr = it.startDate ? td_fmtDM_(it.startDate) : '';
    const finishStr = it.actualFinishDate ? td_fmtDM_(it.actualFinishDate) : (it.finishDate ? td_fmtDM_(it.finishDate) : '');

    sh.getRange(r, 1).setValue(i + 1).setHorizontalAlignment('center');
    sh.getRange(r, 2).setValue(startStr).setHorizontalAlignment('center');
    td_writeRichOrPlain_(sh.getRange(r, 3), it.account);
    td_writeRichOrPlain_(sh.getRange(r, 4), it.typeAction);
    td_writeRichOrPlain_(sh.getRange(r, 5), it.task);
    if (withResult) {
      td_writeRichOrPlain_(sh.getRange(r, 6), it.taskResult);
    }
    sh.getRange(r, 7).setValue(finishStr).setHorizontalAlignment('center');

    if (!withResult) sh.getRange(r, 5, 1, 2).merge();

    sh.getRange(r, 1, 1, 7)
      .setFontFamily('Aptos').setVerticalAlignment('top').setWrap(true)
      .setBorder(true, true, true, true, true, true, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);

    // Linkify URLs in cells with data
    td_linkifyUrls_(sh.getRange(r, 3));
    td_linkifyUrls_(sh.getRange(r, 4));
    td_linkifyUrls_(sh.getRange(r, 5));
    if (withResult) td_linkifyUrls_(sh.getRange(r, 6));

    td_ensureMinFont_(sh.getRange(r, 1, 1, 7), 10);
    r++;
  });

  return r;
}

function td_writeRichOrPlain_(cell, field) {
  if (!field) return;
  const rich = field.rich;
  if (rich && rich.getText() !== '') {
    cell.setRichTextValue(rich);
  } else if (field.plain !== '' && field.plain != null) {
    cell.setValue(field.plain);
  }
}

function td_sendWeeklyEmail_(pic, tw, nw, html, pdf, ctx) {
  const subject = '[' + pic.name + ']_Weekly Report ' +
    td_fmtDM_(tw.start) + ' - ' + td_fmtDM_(tw.end) +
    '_Plan week ' + td_fmtDM_(nw.start) + ' - ' + td_fmtDM_(nw.end);

  let to, cc;
  if (ctx.isSuper) {
    // Super-user mode: chỉ gửi cho chính super-user
    to = ctx.email;
    cc = [];
  } else {
    // Regular PIC: routing bình thường
    to = TD_CFG.WEEKLY_TO;
    cc = TD_CFG.WEEKLY_CC.slice();
    if (pic.email && cc.indexOf(pic.email) === -1 && pic.email !== to) cc.push(pic.email);
  }

  MailApp.sendEmail({
    to: to,
    cc: cc.join(','),
    subject: subject,
    htmlBody: html,
    attachments: [pdf],
    name: TD_CFG.TEAM_NAME
  });
  return to + (cc.length ? ' (CC: ' + cc.join(', ') + ')' : '');
}

/*============================================================================
 * MONTHLY GENERATOR
 *============================================================================*/
function td_generateMonthly(picName, period) {
  const ctx = td_getPicContext_();
  if (!ctx.isSuper && !ctx.currentPic) throw new Error('You do not have permission to run this report');

  const isAll = picName === '__ALL__';
  if (isAll && !ctx.isSuper) throw new Error('Only super-users can run "ALL by PIC"');

  if (!isAll) {
    const pic = td_findPicByName_(picName);
    if (!pic) throw new Error('PIC not found: ' + picName);
    if (!ctx.isSuper && ctx.currentPic.name !== pic.name) {
      throw new Error('You can only generate a report for PIC: ' + ctx.currentPic.name);
    }
  }

  const isQuarter = String(period).toUpperCase().indexOf('Q') > -1;
  const attachments = [];

  if (isQuarter) {
    attachments.push(td_buildMonthlyPdf_(picName, period, 'Report'));
  } else {
    attachments.push(td_buildMonthlyPdf_(picName, period, 'Report'));
    attachments.push(td_buildMonthlyPdf_(picName, td_nextMonth_(period), 'Plan'));
  }

  const sent = td_sendMonthlyEmail_(picName, period, isQuarter, attachments, ctx);
  return attachments.length + ' PDF file(s) sent to ' + sent;
}

function td_buildMonthlyPdf_(picName, period, reportType) {
  const source = SpreadsheetApp.getActive().getSheetByName(TD_CFG.MONTHLY_SHEET);
  if (!source) throw new Error('Sheet not found: ' + TD_CFG.MONTHLY_SHEET);

  const tempName = '_TD_MO_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
  const tempSS = SpreadsheetApp.create(tempName);
  try {
    td_layoutMonthly_(source, tempSS, picName, period, reportType);
    SpreadsheetApp.flush();
    Utilities.sleep(3000);
    const fname = (reportType === 'Report' ? 'Monthly Report_' : 'Monthly Plan_') +
                  TD_CFG.TEAM_SHORT + '_' +
                  (picName === '__ALL__' ? 'ALL' : picName) + '_' +
                  td_fmtPeriodFilename_(period) + '.pdf';
    return td_exportPdf_(tempSS, fname, false);   // portrait
  } finally {
    try { DriveApp.getFileById(tempSS.getId()).setTrashed(true); }
    catch (e) { console.warn('Không xóa được temp: ' + e.message); }
  }
}

function td_layoutMonthly_(source, tempSS, picName, period, reportType) {
  const C = TD_CFG.COLOR;
  const M = TD_CFG.MONTHLY_COL;
  const lastRow = source.getLastRow();
  if (lastRow < TD_CFG.MONTHLY_DATA_START) {
    const s = tempSS.getActiveSheet();
    s.setName('Empty');
    td_configureMonthlySheet_(s);
    let r = td_writeMonthlyHeader_(s, picName, period, reportType, 1);
    s.getRange(r, 1, 1, 2).merge().setValue('No data')
      .setFontFamily('Aptos').setFontSize(12).setFontStyle('italic').setFontColor(C.TEXT);
    return;
  }

  const n = lastRow - TD_CFG.MONTHLY_DATA_START + 1;
  const lastCol = Math.max(M.RESULT, source.getLastColumn());
  const allData = source.getRange(TD_CFG.MONTHLY_DATA_START, 1, n, lastCol).getValues();

  // Lọc theo period
  const periodFiltered = [];
  for (let i = 0; i < allData.length; i++) {
    if (String(allData[i][M.MONTH - 1]).trim() === String(period).trim()) {
      periodFiltered.push({ row: allData[i], sourceRow: TD_CFG.MONTHLY_DATA_START + i });
    }
  }

  // Lọc theo PIC (nếu không phải ALL)
  const isAll = picName === '__ALL__';
  const filtered = isAll
    ? periodFiltered
    : periodFiltered.filter(it => String(it.row[M.PIC - 1] || '').trim().toLowerCase() === picName.toLowerCase());

  if (!filtered.length) {
    const s = tempSS.getActiveSheet();
    s.setName('Empty');
    td_configureMonthlySheet_(s);
    let r = td_writeMonthlyHeader_(s, picName, period, reportType, 1);
    r++;
    s.getRange(r, 1, 1, 2).merge()
      .setValue('No data for period ' + td_fmtPeriodDisplay_(period) +
                (isAll ? '' : ' (PIC: ' + picName + ')'))
      .setFontFamily('Aptos').setFontSize(12).setFontStyle('italic').setFontColor(C.TEXT);
    return;
  }

  // Group theo PIC
  const picOrder = [];
  const picMap = {};
  filtered.forEach(it => {
    const pic = String(it.row[M.PIC - 1] || 'N/A').trim();
    if (!picMap[pic]) { picMap[pic] = []; picOrder.push(pic); }
    picMap[pic].push(it);
  });

  // Sort PIC theo PIC_ORDER trong config
  const configOrder = (TD_CFG.PIC_ORDER || []).map(p => String(p).toLowerCase());
  picOrder.sort((a, b) => {
    const ia = configOrder.indexOf(String(a).toLowerCase());
    const ib = configOrder.indexOf(String(b).toLowerCase());
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  // Render mỗi PIC sang 1 sheet riêng → mỗi sheet 1 trang PDF
  picOrder.forEach((pic, idx) => {
    const items = picMap[pic];
    let sheet;
    if (idx === 0) {
      sheet = tempSS.getActiveSheet();
      sheet.setName(td_safeSheetName_('PIC_' + (idx + 1) + '_' + pic));
    } else {
      sheet = tempSS.insertSheet(td_safeSheetName_('PIC_' + (idx + 1) + '_' + pic));
    }
    td_configureMonthlySheet_(sheet);

    let r = 1;
    if (idx === 0) {
      r = td_writeMonthlyHeader_(sheet, picName, period, reportType, r);
      r++;
    }

    r = td_writeMonthlyPicBlock_(sheet, source, items, pic, r);

    // Dashed separator
    r++;
    sheet.getRange(r, 1, 1, 2).setBorder(null, null, true, null, false, false,
      C.SEPARATOR, SpreadsheetApp.BorderStyle.DASHED);
    r++;

    // Footer hyperlink at last PIC
    if (idx === picOrder.length - 1) {
      r += 2;
      td_writeMonthlyFooter_(sheet, r);
    }
  });
}

function td_configureMonthlySheet_(sheet) {
  // 2 cols × 395px = 790px ~ A4 portrait fitw at 0.3" margin
  sheet.setColumnWidth(1, 395);
  sheet.setColumnWidth(2, 395);
}

function td_safeSheetName_(name) {
  return String(name).replace(/[\\\/?*\[\]]/g, '_').substring(0, 90);
}

function td_writeMonthlyHeader_(sh, picName, period, reportType, startRow) {
  const C = TD_CFG.COLOR;
  let r = startRow;
  const isAll = picName === '__ALL__';
  const issuedBy = isAll ? 'ALL by PIC' : picName;

  const title = (reportType === 'Report' ? 'Monthly Report' : 'Monthly Plan') + ' — ' + TD_CFG.TEAM_NAME;
  sh.getRange(r, 1, 1, 2).merge().setValue(title)
    .setFontFamily('Aptos').setFontSize(18).setFontWeight('bold')
    .setFontColor(C.TEXT).setHorizontalAlignment('left');
  sh.setRowHeight(r, 28); r++;

  sh.getRange(r, 1, 1, 2).merge().setValue('Issued by: ' + issuedBy)
    .setFontFamily('Aptos').setFontSize(11).setFontColor(C.TEXT).setHorizontalAlignment('left');
  r++;
  sh.getRange(r, 1, 1, 2).merge().setValue('Period: ' + td_fmtPeriodDisplay_(period))
    .setFontFamily('Aptos').setFontSize(12).setFontColor(C.TEXT).setHorizontalAlignment('left');
  r++;
  sh.getRange(r, 1, 1, 2).merge().setValue('Department: ' + TD_CFG.DEPARTMENT)
    .setFontFamily('Aptos').setFontSize(11).setFontColor(C.TEXT).setHorizontalAlignment('left');
  r++;

  sh.getRange(r, 1, 1, 2).setBorder(null, null, true, null, false, false,
    C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
  r++;
  return r;
}

function td_writeMonthlyPicBlock_(sheet, source, items, pic, r) {
  const C = TD_CFG.COLOR;
  const M = TD_CFG.MONTHLY_COL;

  const areas = Array.from(new Set(
    items.map(it => String(it.row[M.AREA - 1] || '').trim()).filter(a => a)
  ));
  const picLabel = 'PIC: ' + pic + (areas.length ? '  —  ' + areas.join(', ') : '');

  sheet.getRange(r, 1, 1, 2).merge().setValue(picLabel)
    .setFontFamily('Aptos').setFontSize(13).setFontWeight('bold')
    .setFontColor(C.TEXT)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sheet.setRowHeight(r, 26); r++;
  r++;

  // Sort theo TYPE_TASK_ORDER, các task không có trong list đặt sau theo order gốc
  const used = {};
  let taskNum = 1;
  TD_CFG.TYPE_TASK_ORDER.forEach(tt => {
    items.filter(it => String(it.row[M.TYPE_TASK - 1]).trim() === tt)
         .forEach(it => {
           r = td_writeMonthlyTaskSection_(sheet, source, it, tt, taskNum, r);
           used[it.sourceRow] = true;
           taskNum++;
         });
  });
  items.forEach(it => {
    if (used[it.sourceRow]) return;
    const tt = String(it.row[M.TYPE_TASK - 1] || 'Others').trim();
    r = td_writeMonthlyTaskSection_(sheet, source, it, tt, taskNum, r);
    taskNum++;
  });
  return r;
}

function td_writeMonthlyTaskSection_(sheet, source, item, typeTask, num, r) {
  const C = TD_CFG.COLOR;
  const M = TD_CFG.MONTHLY_COL;

  // Section heading
  sheet.getRange(r, 1, 1, 2).merge().setValue(num + '. ' + typeTask)
    .setFontFamily('Aptos').setFontSize(12).setFontWeight('bold')
    .setFontColor(C.TEXT).setHorizontalAlignment('left');
  sheet.setRowHeight(r, 22); r++;

  // Plan | Result header
  sheet.getRange(r, 1).setValue('Plan');
  sheet.getRange(r, 2).setValue('Result');
  sheet.getRange(r, 1, 1, 2)
    .setFontFamily('Aptos').setFontSize(11).setFontWeight('bold')
    .setBackground(C.HEADER_BG).setFontColor(C.TEXT)
    .setHorizontalAlignment('left').setVerticalAlignment('middle')
    .setBorder(true, true, true, true, true, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(r, 22); r++;

  // Content
  const sr = item.sourceRow;
  td_copyCellFormatted_(source.getRange(sr, M.PLAN),   sheet.getRange(r, 1));
  td_copyCellFormatted_(source.getRange(sr, M.RESULT), sheet.getRange(r, 2));
  td_linkifyUrls_(sheet.getRange(r, 1));
  td_linkifyUrls_(sheet.getRange(r, 2));

  sheet.getRange(r, 1, 1, 2)
    .setFontFamily('Aptos')
    .setVerticalAlignment('top').setWrap(true)
    .setBorder(true, true, true, true, true, false, C.BORDER, SpreadsheetApp.BorderStyle.SOLID);
  td_ensureMinFont_(sheet.getRange(r, 1, 1, 2), 11);

  r++; r++;
  return r;
}

function td_writeMonthlyFooter_(sheet, r) {
  const C = TD_CFG.COLOR;
  const cell = sheet.getRange(r, 1);
  const rtv = SpreadsheetApp.newRichTextValue()
    .setText('🔗 View Google Sheet')
    .setLinkUrl(TD_CFG.SHEET_URL)
    .setTextStyle(SpreadsheetApp.newTextStyle()
      .setFontFamily('Aptos').setFontSize(10)
      .setForegroundColor(C.LINK).setUnderline(true).build())
    .build();
  cell.setRichTextValue(rtv);
  sheet.getRange(r, 1, 1, 2).merge();
  sheet.getRange(r, 1).setHorizontalAlignment('center');
}

function td_sendMonthlyEmail_(picName, period, isQuarter, attachments, ctx) {
  const C = TD_CFG.COLOR;
  const isAll = picName === '__ALL__';
  const issuedBy = isAll ? 'ALL by PIC' : picName;

  const label = td_fmtPeriodDisplay_(period);
  const nextLabel = !isQuarter ? td_fmtPeriodDisplay_(td_nextMonth_(period)) : '';

  // Email luôn gửi cho currentUser (super hoặc PIC) — monthly là báo cáo cá nhân
  const to = ctx.email;

  const subject = '[' + TD_CFG.TEAM_SHORT + ']_' +
                  (isQuarter ? 'Quarterly Report' : 'Monthly Report') + '_' +
                  issuedBy + '_' + label;

  const headerHtml =
    '<div style="border-bottom:1px solid #D1D5DB;padding-bottom:10px;margin-bottom:14px">' +
      '<div style="font-size:18pt;font-weight:bold;color:#000000">' +
        (isQuarter ? 'Quarterly Report' : 'Monthly Report') + '</div>' +
      '<div style="font-size:10pt;color:#6B7280;margin-top:2px;font-weight:bold">Issued by: ' + td_escHtml_(issuedBy) + '</div>' +
      '<div style="font-size:10pt;color:#6B7280;font-weight:bold">' + TD_CFG.TEAM_NAME + ' &middot; ' + TD_CFG.DEPARTMENT + '</div>' +
    '</div>';

  const listHtml = isQuarter
    ? '<ul style="margin:6px 0 14px 18px;padding:0">' +
        '<li style="font-weight:bold">Quarterly Report &mdash; ' + td_escHtml_(period) + '</li>' +
      '</ul>'
    : '<ul style="margin:6px 0 14px 18px;padding:0">' +
        '<li style="font-weight:bold">Monthly Report &mdash; ' + td_escHtml_(label) + '</li>' +
        '<li style="font-weight:bold">Monthly Plan &mdash; ' + td_escHtml_(nextLabel) + '</li>' +
      '</ul>';

  const body =
    '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#FFFFFF">' +
    '<div style="font-family:Calibri,Arial,sans-serif;color:#000000;font-weight:bold;font-size:11pt;max-width:680px;margin:0 auto;padding:18px 14px">' +
      headerHtml +
      '<p style="margin:0 0 8px;font-weight:bold">Dear team,</p>' +
      '<p style="margin:0 0 6px;font-weight:bold">Please find attached the <span style="color:#000">' +
        (isQuarter ? 'quarterly report (' + td_escHtml_(period) + ')' : 'monthly report (' + td_escHtml_(label) + ')') +
        '</span> for <span style="color:#000">' + td_escHtml_(issuedBy) + '</span>, ' +
        '<span style="color:#000">' + TD_CFG.TEAM_NAME + '</span>.</p>' +
      listHtml +
      '<p style="margin:14px 0 4px;font-weight:bold">' +
        '<a href="' + TD_CFG.SHEET_URL + '" style="color:#374151;text-decoration:underline;font-weight:bold">View Detail (Google Sheet)</a>' +
      '</p>' +
      (ctx.isSuper
        ? '<div style="background:#F3F4F6;border-left:3px solid #6B7280;padding:8px 12px;margin:14px 0;font-size:10pt;color:#6B7280;font-weight:bold">' +
          'Super-user mode: this email is sent only to your address for testing/tracking.</div>'
        : '') +
      '<div style="margin-top:24px;padding-top:10px;border-top:1px solid #D1D5DB;font-size:10pt;color:#6B7280;font-weight:bold">' +
        'Best regards,<br>' +
        td_escHtml_(issuedBy) + '<br>' +
        TD_CFG.TEAM_NAME +
      '</div>' +
    '</div></body></html>';

  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: body,
    attachments: attachments,
    name: TD_CFG.TEAM_NAME
  });
  return to;
}

/*============================================================================
 * SHARED PDF HELPERS
 *============================================================================*/

/** Copy 1 cell nguồn → đích, giữ rich text / background / wrap. */
function td_copyCellFormatted_(srcCell, dstCell) {
  const rtv = srcCell.getRichTextValue();
  if (rtv && rtv.getText() !== '') {
    dstCell.setRichTextValue(rtv);
  } else {
    const val = srcCell.getValue();
    if (val !== '' && val !== null && val !== undefined) dstCell.setValue(val);
  }
  dstCell.setBackground(srcCell.getBackground());
  dstCell.setHorizontalAlignment(srcCell.getHorizontalAlignment());
  dstCell.setVerticalAlignment(srcCell.getVerticalAlignment());
  dstCell.setWrap(srcCell.getWrap());
}

/** Detect URL trong cell → link xanh + gạch chân (PDF), preserve style cũ. */
function td_linkifyUrls_(cell) {
  const rtv = cell.getRichTextValue();
  if (!rtv) return;
  const text = rtv.getText();
  if (!text) return;

  const urlRegex = /https?:\/\/[^\s<>"'\)\]]+/g;
  const matches = [];
  let m;
  while ((m = urlRegex.exec(text)) !== null) {
    let url = m[0];
    let trim = 0;
    while (url.length > 0 && /[.,;:!?)]/.test(url[url.length - 1])) {
      url = url.slice(0, -1); trim++;
    }
    if (url.length > 0) {
      matches.push({ start: m.index, end: m.index + m[0].length - trim, url: url });
    }
  }
  if (!matches.length) return;

  const builder = SpreadsheetApp.newRichTextValue().setText(text);
  const runs = rtv.getRuns();
  runs.forEach(run => {
    const s = run.getTextStyle();
    if (s) builder.setTextStyle(run.getStartIndex(), run.getEndIndex(), s);
    const lu = run.getLinkUrl();
    if (lu) builder.setLinkUrl(run.getStartIndex(), run.getEndIndex(), lu);
  });
  matches.forEach(match => {
    let orig = null;
    for (const run of runs) {
      if (run.getStartIndex() <= match.start && run.getEndIndex() >= match.end) {
        orig = run.getTextStyle(); break;
      }
    }
    const styleBuilder = orig
      ? orig.copy().setForegroundColor(TD_CFG.COLOR.LINK).setUnderline(true)
      : SpreadsheetApp.newTextStyle().setForegroundColor(TD_CFG.COLOR.LINK).setUnderline(true);
    builder.setTextStyle(match.start, match.end, styleBuilder.build());
    builder.setLinkUrl(match.start, match.end, match.url);
  });
  cell.setRichTextValue(builder.build());
}

function td_ensureMinFont_(range, minSize) {
  const sizes = range.getFontSizes();
  let changed = false;
  for (let i = 0; i < sizes.length; i++)
    for (let j = 0; j < sizes[i].length; j++)
      if (!sizes[i][j] || sizes[i][j] < minSize) { sizes[i][j] = minSize; changed = true; }
  if (changed) range.setFontSizes(sizes);
}

function td_exportPdf_(tempSS, filename, landscape) {
  const ssId = tempSS.getId();
  const params = {
    format: 'pdf',
    size: 'A4',
    portrait: landscape ? 'false' : 'true',
    fitw: 'true',
    top_margin:    '0.3',
    bottom_margin: '0.3',
    left_margin:   '0.3',
    right_margin:  '0.3',
    horizontal_alignment: 'CENTER',
    gridlines:  'false',
    printtitle: 'false',
    sheetnames: 'false'
  };
  const qs = Object.keys(params).map(k => k + '=' + params[k]).join('&');
  const url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' + qs;

  let lastErr = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      const code = res.getResponseCode();
      if (code === 200) {
        return res.getBlob().setName(filename);
      }
      lastErr = 'HTTP ' + code + ' (attempt ' + attempt + ')';
    } catch (e) {
      lastErr = e.message + ' (attempt ' + attempt + ')';
    }
    if (attempt < 3) Utilities.sleep(3000);
  }
  throw new Error('PDF export failed after 3 attempts: ' + lastErr);
}