/**
 * ==================================================================
 *  EXPENSE APPROVAL SYSTEM v7.0 LITE | MANI Medical Hanoi
 * ==================================================================
 *  Luồng 2 cấp:
 *    PIC đề xuất → HOD duyệt (cấp 1) → Director duyệt cuối (cấp 2)
 *    → PIC cập nhật sau mua hàng → Kế toán kiểm chứng từ
 *
 *  Nhận diện người dùng: theo EMAIL ĐANG ĐĂNG NHẬP trình duyệt.
 *  Cột AE / AF / AG (PIC / HOD / CC email) KHÔNG còn bắt buộc:
 *  hệ thống tự lấy email từ PIC_MAPPING theo tên PIC ở cột D,
 *  và tự điền vào các cột này nếu đang trống.
 *
 *  Cách cài: xoá toàn bộ code cũ trong Apps Script, dán file này,
 *  Save, rồi chạy menu 🛠️ Admin/Help > Initial Setup một lần.
 * ==================================================================
 */

// ======================= 1. CẤU HÌNH =======================

const ACC_CC = 'vtt.hoa@mani.inc; mmh.hanoi1@mani.inc';   // CC mặc định (Kế toán)
const TUYEN_ = 'tt.tuyen@mani.inc';
const HOA_ = 'vtt.hoa@mani.inc';
const pic_ = (picEmail, hodEmail, parentFolderId) => ({ picEmail, hodEmail, ccEmails: ACC_CC, parentFolderId });

const CONFIG = {
  SHEET_NAME: 'Expense Approval',
  START_ROW: 7,          // dữ liệu bắt đầu từ dòng 7
  LAST_COL: 43,          // đọc đến cột AQ
  DIRECTOR_EMAILS: ['nt.ha@manimedicalhanoi.com'],
  ACCOUNTANT_EMAILS: ['vtt.hoa@mani.inc', 'mmh.hanoi1@mani.inc'],
  PAYMENT_TYPES: ['Post- Pay/ MMH account', 'Post- Pay/ Personal account', 'Pre- Pay/ MMH account', 'Pre- Pay/ Personal account'],

  // Tên PIC (key) phải trùng CHÍNH XÁC với giá trị ở cột D
  PIC_MAPPING: {
    'Dao':        pic_('manithailand@manimedicalhanoi.com',    'manithailand@manimedicalhanoi.com', '1ejJPVIO7kOCY7PKVqQrZSg0OX1NWhV6T'),
    'Somchai':    pic_('manithailand2@manimedicalhanoi.com',   'nt.ha@manimedicalhanoi.com',        '1jgZbFfAy5rrKUov7bzH2De5v5sx0Nnle'),
    'Sui':        pic_('manithailand1@manimedicalhanoi.com',   'nt.ha@manimedicalhanoi.com',        '1jgZbFfAy5rrKUov7bzH2De5v5sx0Nnle'),
    'Tuyen':      pic_('tt.tuyen@manimedicalhanoi.com',        'tt.tuyen@mani.inc',                 '1kLMNVtvq2njjdn1urudi9jT4h5XaUL03'),
    'Nguyen Ha':  pic_('nt.ha@manimedicalhanoi.com',           'nt.ha@mani.inc',                    '1kLMNVtvq2njjdn1urudi9jT4h5XaUL03'),
    'Thuong':     pic_('marketing.mmh@manimedicalhanoi.com',   'tt.tuyen@mani.inc;tt.tuyen@manimedicalhanoi.com', '1uS3cDPtLLHF2m2O1X-D4tGyHVCUjo0Lt'),
    'Trang':      pic_('marketing.mmh2@manimedicalhanoi.com',  TUYEN_, '1e2o3Oz89McHjnbVXehHOWSdKykAaCTI5'),
    'Linh':       pic_('marketing.mmh1@manimedicalhanoi.com',  TUYEN_, '1hjRKLCJRqM3yXgWzUtYdGrb-XvY-AXSx'),
    'Giang':      pic_('mmh.product@manimedicalhanoi.com',     TUYEN_, '18bzPPU4N_jDLFDRf1cNMN-4rgv_-IuVy'),
    'Minh Trang': pic_('mmh.admin@manimedicalhanoi.com',       TUYEN_, '18bzPPU4N_jDLFDRf1cNMN-4rgv_-IuVy'),   // MỚI: tài khoản mmh.admin
    'Hau':        pic_('mmh.backoffice1@manimedicalhanoi.com', TUYEN_, '18bzPPU4N_jDLFDRf1cNMN-4rgv_-IuVy'),   // ĐỔI: mmh.backoffice1
    'Vinh':       pic_('mmh.danang@manimedicalhanoi.com',      TUYEN_, '1-yucOYhfEx6C8NJKcHBvMabluz_GDPKF'),
    'Minh Viet':  pic_('mmh.hanoi@manimedicalhanoi.com',       TUYEN_, '1-yucOYhfEx6C8NJKcHBvMabluz_GDPKF'),
    'Phuong':     pic_('mmh.saigon@manimedicalhanoi.com',      TUYEN_, '1-yucOYhfEx6C8NJKcHBvMabluz_GDPKF'),
    'Viet Ha':    pic_('mmh.hanoi2@manimedicalhanoi.com',      TUYEN_, '1q_GN-bqhraCrUaX_nvjERuz56tRNYaYL'),
    'Khang':      pic_('mmh.saigon2@manimedicalhanoi.com',     TUYEN_, '1q_GN-bqhraCrUaX_nvjERuz56tRNYaYL'),
    'Hoa':        pic_('vtt.hoa@manimedicalhanoi.com',         HOA_,   '1-Gpq_xjlMPtxvlVzjvuEf-VS1C2f7Rg-'),
    'Ngoc':       pic_('mmh.hanoi1@manimedicalhanoi.com',      HOA_,   '1-Gpq_xjlMPtxvlVzjvuEf-VS1C2f7Rg-'),
    'Hang':       pic_('ntt.hang@manimedicalhanoi.com',        HOA_,   '1VWlOCHBek5GKHjuXmYusBrItOcpRqHao'),
    'Dam Viet':   pic_('mmh.order@manimedicalhanoi.com',       HOA_,   '1VWlOCHBek5GKHjuXmYusBrItOcpRqHao'),
    'Dam Ha':     pic_('mmh.backoffice@manimedicalhanoi.com',  HOA_,   '1VWlOCHBek5GKHjuXmYusBrItOcpRqHao')
  },

  COL: {
    PROPOSAL_MONTH: 2,    // B
    PROPOSAL_DATE: 3,     // C
    PIC_NAME: 4,          // D
    DOC_TYPE: 5,          // E
    DOC_NO: 7,            // G
    DESC: 8,              // H
    QTY: 9,               // I
    UNIT: 10,             // J
    UNIT_PRICE: 11,       // K
    AMOUNT: 12,           // L  (Estimate Amount = I*K)
    CURRENCY: 13,         // M
    EXPENSE_TYPE: 15,     // O
    SUPPLIER: 16,         // P
    PAYMENT_TYPE: 17,     // Q
    FOLDER_LINK: 18,      // R
    ACT_QTY: 19,          // S  (S..Z: After Purchase)
    ACT_UNIT: 20,         // T
    ACT_UNIT_PRICE: 21,   // U
    ACT_AMOUNT: 22,       // V
    PAYMENT_REQUEST: 23,  // W
    ACT_SUPPLIER: 24,     // X
    ACT_PAYMENT_TYPE: 25, // Y
    PAYMENT_STATUS: 26,   // Z
    HARD_DOC: 27,         // AA
    ACC_APPROVAL: 28,     // AB
    STATUS: 30,           // AD  PIC Status (Proposed)
    PIC_EMAIL: 31,        // AE  (không bắt buộc)
    HOD_EMAIL: 32,        // AF  (không bắt buộc)
    CC_EMAIL: 33,         // AG  (không bắt buộc)
    HOD_STATUS: 34,       // AH
    HOD_COMMENT: 35,      // AI
    APPROVED_AMOUNT: 36,  // AJ
    DIRECTOR_STATUS: 37,  // AK  ("Approved" hoặc nội dung lý do từ chối)
    LOCK: 38,             // AL
    EXPENSED_MONTH: 39,   // AM  (YYYYMM)
    RATE: 41,             // AO
    PARENT_FOLDER: 43     // AQ  (dự phòng nếu PIC chưa có parentFolderId)
  }
};


// ======================= 2. TIỆN ÍCH CHUNG =======================

const ALIAS_ = { 'manimedicalhanoi.com': 'mani.inc' };   // 2 domain coi là cùng 1 người
let TZ_ = null;

function normEmail_(s) {
  const m = String(s || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  return m ? m[0] : '';
}
function emailKey_(e) {
  const n = normEmail_(e);
  if (!n) return '';
  const p = n.split('@');
  return p[0] + '@' + (ALIAS_[p[1]] || p[1]);
}
function sameEmail_(a, b) { const A = emailKey_(a); return !!A && A === emailKey_(b); }
function inList_(email, list) { return (list || []).some(e => sameEmail_(e, email)); }
function parseEmails_(s) {
  const out = [], seen = {};
  String(s || '').split(/[;,\s]+/).forEach(p => {
    const e = normEmail_(p), k = emailKey_(e);
    if (e && !seen[k]) { seen[k] = 1; out.push(e); }
  });
  return out;
}
function uniqEmails_(arr) { return parseEmails_([].concat.apply([], arr).join(';')); }

function currentUser_() {
  try { return normEmail_(Session.getActiveUser().getEmail()); } catch (e) { return ''; }
}

function picInfo_(name) { return CONFIG.PIC_MAPPING[String(name || '').trim()] || null; }
function picByEmail_(email) {
  const k = Object.keys(CONFIG.PIC_MAPPING).find(n => sameEmail_(CONFIG.PIC_MAPPING[n].picEmail, email));
  return k ? Object.assign({ name: k }, CONFIG.PIC_MAPPING[k]) : null;
}
function hodOf_(email) {
  return Object.keys(CONFIG.PIC_MAPPING).filter(n => inList_(email, parseEmails_(CONFIG.PIC_MAPPING[n].hodEmail)));
}

function tz_() { return TZ_ || (TZ_ = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone()); }
function sh_() {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!s) throw new Error('Sheet "' + CONFIG.SHEET_NAME + '" not found.');
  return s;
}
function num_(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v || '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}
function monthKey_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyyMM');
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})[\/-](\d{4})$/);
  if (m) return m[2] + ('0' + m[1]).slice(-2);
  return s.replace(/[-\/.]/g, '');
}
function fmtMonth_(k) { k = String(k || ''); return k.length === 6 ? k.slice(0, 4) + '-' + k.slice(4) : k; }
function fmtDate_(v, f) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), f || 'dd/MM/yyyy');
  return f ? '' : String(v || '');
}
function esc_(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtAmt_(n, cur) {
  const dec = (!cur || cur === 'VND') ? 0 : 2;
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dec }) + (cur ? ' ' + cur : '');
}
function sumBy_(items, field) {
  const t = {};
  items.forEach(x => { const c = x.currency || 'N/A'; t[c] = (t[c] || 0) + (Number(x[field]) || 0); });
  return t;
}
function fmtTotals_(t) {
  const p = Object.keys(t).filter(c => t[c] > 0).map(c => fmtAmt_(t[c], c));
  return p.length ? p.join(' + ') : '0';
}
function json_(o) { return JSON.stringify(o).replace(/</g, '\\u003c'); }
function alert_(title, msg) { SpreadsheetApp.getUi().alert(title, msg, SpreadsheetApp.getUi().ButtonSet.OK); }
function show_(html, title, w, h) {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(w).setHeight(h), title);
}
function withLock_(fn) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) throw new Error('System is busy (another user is saving). Please try again in a moment.');
  try { return fn(); } finally { lock.releaseLock(); }
}
function sheetLink_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = sh_();
  try {
    const cell = sh.getRange('B1'), rt = cell.getRichTextValue(), u = rt && rt.getLinkUrl();
    if (u) return u;
    const m = String(cell.getValue()).match(/https?:\/\/\S+/);
    if (m) return m[0];
  } catch (e) {}
  return ss.getUrl() + '#gid=' + sh.getSheetId();
}
// Ghi 1 dải ô; nếu bị Data Validation chặn thì xoá validation đúng ô đó rồi ghi lại
function writeCells_(sh, row, col, values) {
  const rng = sh.getRange(row, col, 1, values.length);
  try { rng.setValues([values]); }
  catch (e) {
    values.forEach((v, i) => {
      const c = rng.getCell(1, i + 1);
      try { c.setValue(v); } catch (er) { c.clearDataValidations(); c.setValue(v); }
    });
  }
}


// ======================= 3. ĐỌC DỮ LIỆU =======================

function loadItems_() {
  const sh = sh_(), C = CONFIG.COL, start = CONFIG.START_ROW, last = sh.getLastRow();
  if (last < start) return [];
  const n = last - start + 1, cols = Math.min(sh.getMaxColumns(), CONFIG.LAST_COL);
  const vals = sh.getRange(start, 1, n, cols).getValues();
  const rForm = sh.getRange(start, C.FOLDER_LINK, n, 1).getFormulas();
  return vals.map((v, i) => toItem_(v, start + i, rForm[i][0]));
}

function toItem_(v, row, rFormula) {
  const C = CONFIG.COL;
  const g = c => (v[c - 1] === undefined || v[c - 1] === null) ? '' : v[c - 1];
  const s = c => String(g(c)).trim();
  const picName = s(C.PIC_NAME), map = picInfo_(picName);
  // Ưu tiên PIC_MAPPING theo tên ở cột D; cột AE/AF/AG chỉ là dự phòng
  const picEmail = map ? normEmail_(map.picEmail) : normEmail_(g(C.PIC_EMAIL));
  const hodEmails = map ? parseEmails_(map.hodEmail) : parseEmails_(g(C.HOD_EMAIL));
  const ccEmails = parseEmails_(map ? map.ccEmails : (s(C.CC_EMAIL) || ACC_CC));
  const dir = s(C.DIRECTOR_STATUS);
  const qty = num_(g(C.QTY)), unitPrice = num_(g(C.UNIT_PRICE));
  const folderM = String(rFormula || '').match(/HYPERLINK\(\s*"([^"]+)"/i);
  const rVal = s(C.FOLDER_LINK);
  return {
    row, picName, picEmail, hodEmails, ccEmails,
    aeRaw: s(C.PIC_EMAIL), afRaw: s(C.HOD_EMAIL), agRaw: s(C.CC_EMAIL),
    proposalMonth: monthKey_(g(C.PROPOSAL_MONTH)),
    proposalDate: fmtDate_(g(C.PROPOSAL_DATE)),
    docType: s(C.DOC_TYPE), docNo: s(C.DOC_NO), desc: s(C.DESC),
    qty, unit: s(C.UNIT), unitPrice,
    amount: num_(g(C.AMOUNT)), amountRaw: g(C.AMOUNT),
    currency: s(C.CURRENCY), rate: s(C.RATE),
    expenseType: s(C.EXPENSE_TYPE), supplier: s(C.SUPPLIER), paymentType: s(C.PAYMENT_TYPE),
    expensedMonth: monthKey_(g(C.EXPENSED_MONTH)),
    status: s(C.STATUS), hodStatus: s(C.HOD_STATUS), hodComment: s(C.HOD_COMMENT),
    approvedAmount: num_(g(C.APPROVED_AMOUNT)),
    directorStatus: !dir ? 'Not yet' : (dir === 'Approved' ? 'Approved' : 'Rejected'),
    directorComment: dir && dir !== 'Approved' ? dir : '',
    locked: g(C.LOCK) === true,
    actQty: num_(g(C.ACT_QTY)), actUnit: s(C.ACT_UNIT), actUnitPrice: num_(g(C.ACT_UNIT_PRICE)),
    actAmount: num_(g(C.ACT_AMOUNT)), paymentRequestRaw: g(C.PAYMENT_REQUEST),
    actSupplier: s(C.ACT_SUPPLIER), actPaymentType: s(C.ACT_PAYMENT_TYPE), paymentStatus: s(C.PAYMENT_STATUS),
    hardDoc: s(C.HARD_DOC), accApproval: s(C.ACC_APPROVAL),
    folderUrl: folderM ? folderM[1] : (rVal.indexOf('drive.google.com') >= 0 ? rVal : ''),
    parentFolder: s(C.PARENT_FOLDER)
  };
}

function index_(all) { const o = {}; all.forEach(x => { o[x.row] = x; }); return o; }
function groupByDoc_(items) {
  const g = {};
  items.forEach(x => { const k = x.docType + '|' + x.docNo; (g[k] = g[k] || []).push(x); });
  return g;
}

// Các trường bắt buộc khi đề xuất (trừ Expensed Record Month: kiểm tra riêng vì nhập trong dialog)
function missingBase_(it) {
  const m = [];
  if (!it.proposalMonth) m.push('Proposal Month');
  if (!it.docNo) m.push('Document No');
  if (!it.desc) m.push('Description');
  if (!(it.qty > 0)) m.push('Qty');
  if (!it.unit) m.push('Unit');
  if (!(it.unitPrice > 0)) m.push('Unit Price');
  if (!(it.amount > 0)) m.push(String(it.amountRaw).charAt(0) === '#' ? 'Estimate Amount (formula error ' + it.amountRaw + ')' : 'Estimate Amount');
  if (!it.currency) m.push('Currency');
  if (!it.rate) m.push('Rate');
  if (!it.hodEmails.length) m.push('HOD (PIC name in column D not found in PIC_MAPPING)');
  return m;
}


// ======================= 4. PHÂN QUYỀN & MENU =======================

function getRoles_(user, items) {
  user = user || currentUser_();
  const pic = picByEmail_(user);
  const r = {
    user, picName: pic ? pic.name : '',
    isDirector: inList_(user, CONFIG.DIRECTOR_EMAILS),
    isAccountant: inList_(user, CONFIG.ACCOUNTANT_EMAILS),
    isHOD: hodOf_(user).length > 0,
    isPIC: !!pic
  };
  r.isPIC = r.isPIC || r.isAccountant;
  if (user && (!r.isPIC || !r.isHOD)) {
    (items || loadItems_()).forEach(x => {
      if (sameEmail_(x.picEmail, user)) r.isPIC = true;
      if (inList_(user, x.hodEmails)) r.isHOD = true;
    });
  }
  return r;
}

function need_(r, flag, label) {
  if (!r.user) {
    alert_('Sign-in required', 'Cannot detect your email.\n\nPlease run 🛠️ Admin/Help > Initial Setup and authorize the script.');
    return false;
  }
  if (r[flag]) return true;
  alert_('Permission Denied', 'Signed in as: ' + r.user + '\n\nThis function requires the ' + label + ' role.\n\n' +
    '• PIC / HOD: recognized from PIC_MAPPING in the script\n• Director / Accountant: DIRECTOR_EMAILS / ACCOUNTANT_EMAILS\n\nContact the administrator if this is wrong.');
  return false;
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🛠️ Admin/Help')
    .addItem('🚀 Initial Setup', 'initialSetup')
    .addItem('🔐 My Permissions', 'showMyPermissions')
    .addSeparator()
    .addItem('❓ Help', 'showHelp')
    .addToUi();
  let r;
  try { r = getRoles_(); } catch (e) { return; }
  if (!r.user) return;
  if (r.isPIC) ui.createMenu('📝 PIC Menu')
    .addItem('📋 Expense Proposal', 'showProposeDialog').addSeparator()
    .addItem('📦 After Purchase Update', 'showAfterPurchaseDialog').addSeparator()
    .addItem('📖 Guide', 'showPICGuide').addToUi();
  if (r.isHOD) ui.createMenu('✅ HOD Menu')
    .addItem('📝 Review & Submit', 'showApproveDialog').addSeparator()
    .addItem('📖 Guide', 'showHODGuide').addToUi();
  if (r.isDirector) ui.createMenu('👑 Director Menu')
    .addItem('📊 Overview & Final Approval', 'showDirectorOverviewDialog').addSeparator()
    .addItem('📖 Guide', 'showDirectorGuide').addToUi();
  if (r.isAccountant) ui.createMenu('💰 Accountant Menu')
    .addItem('📋 Hard Document Received…', 'showHardDocumentDialog')
    .addItem('📄 Document Approval…', 'showDocumentApprovalDialog').addSeparator()
    .addItem('📖 Guide', 'showAccountantGuide').addToUi();
}

// HOD duyệt tay trên sheet (cột AH) → tự mở khoá / giữ khoá
function onEdit(e) {
  try {
    const rg = e.range, C = CONFIG.COL;
    if (rg.getSheet().getName() !== CONFIG.SHEET_NAME || rg.getNumRows() > 1 || rg.getRow() < CONFIG.START_ROW || rg.getColumn() !== C.HOD_STATUS) return;
    const sh = rg.getSheet(), row = rg.getRow();
    if (e.value === 'Rejected') {
      sh.getRange(row, C.STATUS).clearContent();
      sh.getRange(row, C.LOCK).setValue(false);
      e.source.toast('Row ' + row + ' unlocked due to rejection.', 'Auto Unlocked', 3);
    } else if (e.value === 'Approved') {
      sh.getRange(row, C.LOCK).setValue(true);
    }
  } catch (err) {}
}


// ======================= 5. PIC: ĐỀ XUẤT =======================

function showProposeDialog() {
  const all = loadItems_(), r = getRoles_(null, all);
  if (!need_(r, 'isPIC', 'PIC')) return;
  const items = all.filter(x => sameEmail_(x.picEmail, r.user));
  if (!items.length) return alert_('No Items', 'No expense rows found for ' + r.user + '.\n\nColumn D (PIC Name) must contain your name exactly as in PIC_MAPPING' + (r.picName ? ': "' + r.picName + '"' : '') + '.');
  const data = {
    cur: Utilities.formatDate(new Date(), tz_(), 'yyyyMM'),
    items: items.map(x => ({
      row: x.row, proposalMonth: x.proposalMonth, expensedMonth: x.expensedMonth, docType: x.docType, docNo: x.docNo,
      desc: x.desc, qty: x.qty, unit: x.unit, unitPrice: x.unitPrice, amount: x.amount, currency: x.currency, rate: x.rate,
      supplier: x.supplier, paymentType: x.paymentType,
      propose: x.status === 'Proposed' ? 'Proposed' : 'Not yet',
      hod: x.hodStatus || 'Not yet', director: x.directorStatus, approvedAmount: x.approvedAmount,
      locked: x.locked || x.status === 'Proposed', missing: missingBase_(x)
    }))
  };
  const name = esc_(r.picName || r.user);
  show_(page_({
    a: '#667eea', b: '#764ba2',
    title: '📤 Expense Propose - ' + name + ' (PIC)', subtitle: 'Select items to propose for approval',
    stats: [['sDoc', 'Total<br>Documents', '#3498db'], ['sItem', 'Total<br>Items', '#e74c3c'], ['sAmt', 'Total Amount<br>(Estimate)', '#f39c12'], ['sApr', 'Total Approved<br>Amount', '#2ecc71']],
    filters: fsel_('fPM', '📅 Proposal Month') + fsel_('fEM', '📆 Expensed Record Month') +
      fsel_('fPS', '📋 Propose', opts_(['Not yet', 'Proposed'])) + fsel_('fHS', '✅ HOD', opts_(['Approved', 'Rejected', 'Not yet'])) +
      fsel_('fDS', '👑 Director', opts_(['Approved', 'Rejected', 'Not yet'])) + fsel_('fDT', '📝 Doc Type') + fsel_('fDN', '📄 Doc No') +
      '<button class="btn btn-red" onclick="clearF()">🔄 Clear</button>',
    before: '<div class="legend"><span><i style="background:#d4edda"></i><b>Approved by Both</b></span><span><i style="background:#fff3cd"></i><b>Rejected (can re-propose)</b></span></div><div class="info" id="info"></div>',
    thead: th_(['Select', 'Row', 'No', 'Proposal Month', 'Expensed Record Month', 'Document No', 'Description', 'Qty', 'Unit', 'Unit Price', 'Estimate Amount', 'Currency', 'Rate', 'Estimate Supplier', 'Payment Type']),
    actions: '<div><label><input type="checkbox" id="sendHOD" checked> 📧 Send to HOD</label><label><input type="checkbox" id="ccAcc"> 📧 CC Accountant</label></div>' +
      '<div><button class="btn btn-primary" onclick="submit()">✅ Confirm Proposal</button> <button class="btn btn-grey" onclick="google.script.host.close()">❌ Cancel</button></div>',
    data, script: PROPOSE_JS_
  }), 'Expense Propose - ' + (r.picName || r.user), 1850, 1000);
}

function handlePropose(p) {
  return withLock_(() => {
    const sh = sh_(), C = CONFIG.COL, user = currentUser_();
    const rows = (p.rows || []).map(Number);
    if (!rows.length) throw new Error('Please select at least one item.');

    // 1. Ghi Expensed Record Month (AM)
    Object.keys(p.months || {}).forEach(r => {
      if (rows.indexOf(Number(r)) >= 0) sh.getRange(Number(r), C.EXPENSED_MONTH).setValue(String(p.months[r]).replace('-', ''));
    });
    SpreadsheetApp.flush();

    // 2. Đọc lại & kiểm tra
    const all = loadItems_(), byRow = index_(all), roles = getRoles_(user, all);
    if (!roles.isPIC) throw new Error('Account ' + user + ' has no PIC permission.');
    const items = rows.map(r => byRow[r]).filter(Boolean), errs = [];
    items.forEach(it => {
      if (!sameEmail_(it.picEmail, user)) errs.push('Row ' + it.row + ': you are not the PIC of this item (column D: ' + (it.picName || 'empty') + ')');
      else if (it.locked || it.status === 'Proposed') errs.push('Row ' + it.row + ': already proposed / locked');
      else {
        const m = missingBase_(it);
        if (!it.expensedMonth) m.unshift('Expensed Record Month');
        if (m.length) errs.push('Row ' + it.row + ' (' + (it.docNo || 'No Doc No') + '): missing ' + m.join(', '));
      }
    });
    if (errs.length) throw new Error('Cannot submit proposal:\n\n' + errs.join('\n'));

    // 3. Cập nhật trạng thái theo vai trò của PIC
    const grp = { pic: [], picHod: [], picDir: [] };
    items.forEach(it => {
      const r = it.row;
      it.isRepropose = it.hodStatus === 'Rejected' || it.directorStatus === 'Rejected';
      it.prevBy = it.hodStatus === 'Rejected' ? 'HOD' : 'Director';
      it.prevComment = it.hodStatus === 'Rejected' ? it.hodComment : it.directorComment;
      if (it.isRepropose || it.hodStatus || it.directorStatus !== 'Not yet') {
        [C.HOD_STATUS, C.HOD_COMMENT, C.APPROVED_AMOUNT, C.DIRECTOR_STATUS].forEach(c => sh.getRange(r, c).clearContent());
      }
      fillContacts_(sh, it);
      sh.getRange(r, C.STATUS).setValue('Proposed');
      sh.getRange(r, C.LOCK).setValue(true);
      it.status = 'Proposed'; it.locked = true; it.hodStatus = ''; it.hodComment = ''; it.directorStatus = 'Not yet';
      it.approvedAmount = it.amount;

      if (inList_(it.picEmail, CONFIG.DIRECTOR_EMAILS)) {          // PIC là Director: tự duyệt cả 2 cấp
        writeCells_(sh, r, C.HOD_STATUS, ['Approved']);
        sh.getRange(r, C.APPROVED_AMOUNT).setValue(it.amount);
        sh.getRange(r, C.DIRECTOR_STATUS).setValue('Approved');
        it.hodStatus = 'Approved'; it.directorStatus = 'Approved';
        grp.picDir.push(it);
      } else if (inList_(it.picEmail, it.hodEmails)) {            // PIC kiêm HOD: tự duyệt cấp 1
        writeCells_(sh, r, C.HOD_STATUS, ['Approved']);
        sh.getRange(r, C.APPROVED_AMOUNT).setValue(it.amount);
        it.hodStatus = 'Approved';
        grp.picHod.push(it);
      } else grp.pic.push(it);
    });
    SpreadsheetApp.flush();

    const f = grp.picDir.length ? ensureFolders_(grp.picDir, all) : null;
    const link = sheetLink_(), lines = ['✅ Proposed ' + items.length + ' item(s).', ''];
    if (grp.pic.length) lines.push('📧 ' + grp.pic.length + ' item(s): waiting for HOD approval');
    if (grp.picHod.length) lines.push('⚡ ' + grp.picHod.length + ' item(s): you are also HOD, auto-approved level 1, waiting for Director');
    if (grp.picDir.length) lines.push('🎯 ' + grp.picDir.length + ' item(s): you are Director, auto-approved both levels');
    if (f && f.failed.length) lines.push('⚠️ Folder issues: ' + f.failed.join('; '));
    lines.push('');
    if (p.sendToHOD === false) lines.push('📧 Email notification was not sent (as per your selection).');
    else {
      if (grp.pic.length) lines.push(trySend_(() => mailProposal_(grp.pic, all, link, !!p.ccAccountant), 'HOD'));
      if (grp.picHod.length) lines.push(trySend_(() => mailHodApproved_(grp.picHod, link, user, true), 'Director'));
      if (grp.picDir.length) lines.push(trySend_(() => mailDirectorSelfPlan_(grp.picDir, link), 'Accountant'));
    }
    return lines.join('\n');
  });
}

// Tự điền AE/AF/AG nếu đang trống (không ghi đè dữ liệu / công thức có sẵn)
function fillContacts_(sh, it) {
  const C = CONFIG.COL;
  if (!it.aeRaw && it.picEmail) sh.getRange(it.row, C.PIC_EMAIL).setValue(it.picEmail);
  if (!it.afRaw && it.hodEmails.length) sh.getRange(it.row, C.HOD_EMAIL).setValue(it.hodEmails.join('; '));
  if (!it.agRaw && it.ccEmails.length) sh.getRange(it.row, C.CC_EMAIL).setValue(it.ccEmails.join('; '));
}


// ======================= 6. HOD: DUYỆT CẤP 1 =======================

function canHod_(it, user) { return it.status === 'Proposed' && !it.hodStatus && it.locked && inList_(user, it.hodEmails); }

function showApproveDialog() {
  const all = loadItems_(), r = getRoles_(null, all);
  if (!need_(r, 'isHOD', 'HOD')) return;
  const items = all.filter(x => canHod_(x, r.user));
  if (!items.length) return alert_('No Items', 'No items pending approval for your account.');
  show_(page_({
    a: '#42a5f5', b: '#1e88e5', bg: 'linear-gradient(135deg,#e3f2fd 0%,#bbdefb 100%)',
    title: '✅ HOD Approval Center', subtitle: 'Statistics update automatically based on filters and selections',
    stats: [['sItem', 'Total Items'], ['sDoc', 'Total Documents'], ['sADoc', 'Approved Documents'], ['sEst', 'Total Estimate'], ['sApr', 'Approved Amount']],
    filters: fsel_('fPIC', '👤 PIC') + fsel_('fDT', '📝 Doc Type') + fsel_('fDN', '📄 Doc No'),
    before: '<div class="banner" id="vb"></div>',
    thead: th_(['Select', 'Row', 'PIC', 'Document No', 'Description', 'Estimate Amount', 'Currency', 'Supplier', 'HOD Approval', 'HOD Comment', 'Approval Amount']),
    actions: '<div></div><div><button class="btn btn-ok" id="btnSubmit" onclick="submit()">Submit HOD Decisions</button> <button class="btn btn-grey" onclick="google.script.host.close()">Cancel</button></div>',
    data: { items: items.map(x => ({ row: x.row, picName: x.picName, docType: x.docType, docNo: x.docNo, desc: x.desc, amount: x.amount, currency: x.currency, supplier: x.supplier })) },
    script: HOD_JS_
  }), 'HOD Approval & Rejection Center', 1800, 900);
}

function handleHODDecisions(data) {
  return withLock_(() => {
    const sh = sh_(), C = CONFIG.COL, user = currentUser_(), all = loadItems_(), byRow = index_(all);
    const rejIn = data.rejections || [];
    const noCmt = rejIn.filter(d => !String(d.comment || '').trim());
    if (noCmt.length) throw new Error('Comment is required for rejection: row ' + noCmt.map(d => d.row).join(', '));
    const app = [], rej = [];
    let skipped = 0;
    (data.approvals || []).forEach(d => {
      const it = byRow[d.row];
      if (!it || !canHod_(it, user)) { skipped++; return; }
      const amt = Number(d.approvedAmount);
      it.approvedAmount = isFinite(amt) && amt >= 0 ? amt : it.amount;
      it.hodComment = String(d.comment || '').trim();
      writeCells_(sh, it.row, C.HOD_STATUS, ['Approved', it.hodComment, it.approvedAmount]);   // AH, AI, AJ
      it.hodStatus = 'Approved';
      app.push(it);
    });
    rejIn.forEach(d => {
      const it = byRow[d.row];
      if (!it || !canHod_(it, user)) { skipped++; return; }
      it.hodComment = String(d.comment).trim();
      writeCells_(sh, it.row, C.HOD_STATUS, ['Rejected', it.hodComment]);   // AH, AI
      sh.getRange(it.row, C.STATUS).clearContent();                       // AD
      sh.getRange(it.row, C.LOCK).setValue(false);                        // AL
      rej.push(it);
    });
    SpreadsheetApp.flush();
    const link = sheetLink_(), lines = ['Successfully processed ' + (app.length + rej.length) + ' item(s):', '✅ Approved: ' + app.length, '❌ Rejected: ' + rej.length];
    if (skipped) lines.push('ℹ️ Skipped (already processed by someone else): ' + skipped);
    lines.push('');
    if (app.length) lines.push(trySend_(() => mailHodApproved_(app, link, user, false), 'Director (CC PIC)'));
    if (rej.length) lines.push(trySend_(() => mailHodRejected_(rej, link), 'PIC (rejected)'));
    return lines.join('\n');
  });
}


// ======================= 7. DIRECTOR: DUYỆT CUỐI =======================

function showDirectorOverviewDialog() {
  const all = loadItems_(), r = getRoles_(null, all);
  if (!need_(r, 'isDirector', 'Director')) return;
  const items = all.filter(x => x.status === 'Proposed' && x.hodStatus === 'Approved' && x.locked);
  if (!items.length) return alert_('No Items', 'No items available for director overview.');
  show_(page_({
    a: '#667eea', b: '#764ba2',
    title: '👑 Director Overview & Final Approval', subtitle: 'Review and make final decisions on expense approvals',
    stats: [['sDoc', 'Total<br>Documents', '#3498db'], ['sItem', 'Total<br>Items', '#e74c3c'], ['sOk', 'Already<br>Approved', '#2ecc71'], ['sEst', 'Total Amount<br>(Estimate)', '#f39c12'], ['sAct', 'Total Amount<br>(Actual)', '#9b59b6']],
    filters: fsel_('fPIC', '👤 PIC') + fsel_('fPM', '📅 Proposal Month') + fsel_('fFA', '✅ Final approval', opts_(['Approved', 'Not yet', 'Rejected'])) +
      fsel_('fDT', '📄 Doc Type') + fsel_('fDN', '🔢 Doc No') + '<button class="btn btn-red" onclick="clearF()">🔄 Clear Filters</button>',
    thead: th_(['☑️', 'Row', 'PIC', 'Proposal Month', 'Doc No', 'Description', 'Estimate', 'HOD Approved', 'Currency', 'Supplier', 'Payment Type', 'Director Approval', 'Final approval', 'Director Comment']),
    actions: '<div><label><input type="checkbox" id="sendEmail" checked> Send Email Notifications</label></div>' +
      '<div><button class="btn btn-ok" onclick="submit()">✅ Confirm Updates</button> <button class="btn btn-grey" onclick="google.script.host.close()">❌ Cancel</button></div>',
    data: { items: items.map(x => ({
      row: x.row, picName: x.picName, proposalMonth: x.proposalMonth, docType: x.docType, docNo: x.docNo, desc: x.desc,
      amount: x.amount, approvedAmount: x.approvedAmount, actualAmount: x.actAmount, currency: x.currency,
      supplier: x.supplier, paymentType: x.paymentType, director: x.directorStatus, comment: x.directorComment })) },
    script: DIRECTOR_JS_
  }), 'Overview & Final Approval', 1650, 950);
}

function handleDirectorUpdate(p) {
  return withLock_(() => {
    const sh = sh_(), C = CONFIG.COL, user = currentUser_();
    if (!inList_(user, CONFIG.DIRECTOR_EMAILS)) throw new Error('Only Director accounts can give final approval.');
    const all = loadItems_(), byRow = index_(all);
    const ups = (p.updates || []).filter(u => { const it = byRow[u.row]; return it && it.status === 'Proposed' && it.hodStatus === 'Approved' && it.locked; });
    const bad = ups.filter(u => u.approval === 'Rejected' && !String(u.comment || '').trim());
    if (bad.length) throw new Error('Comment is required for rejection: row ' + bad.map(u => u.row).join(', '));
    const app = [], rej = [];
    let same = 0;
    ups.forEach(u => {
      const it = byRow[u.row];
      if (u.approval === 'Approved') {
        if (it.directorStatus === 'Approved') { same++; return; }       // không đổi → không gửi lại email
        sh.getRange(it.row, C.DIRECTOR_STATUS).setValue('Approved');
        it.directorStatus = 'Approved';
        app.push(it);
      } else {
        it.comment = String(u.comment).trim();
        sh.getRange(it.row, C.DIRECTOR_STATUS).setValue(it.comment);   // AK = lý do từ chối
        sh.getRange(it.row, C.HOD_STATUS).clearContent();               // AH
        sh.getRange(it.row, C.STATUS).clearContent();                   // AD
        sh.getRange(it.row, C.LOCK).setValue(false);                    // AL
        rej.push(it);
      }
    });
    SpreadsheetApp.flush();
    const f = app.length ? ensureFolders_(app, all) : null;   // luôn tạo folder khi Director duyệt
    const link = sheetLink_(), lines = ['✅ Approved: ' + app.length, '❌ Rejected: ' + rej.length];
    if (same) lines.push('ℹ️ Unchanged (skipped): ' + same);
    if (f) {
      lines.push('📁 Folders: ' + f.created + ' created, ' + f.linked + ' row(s) linked');
      if (f.failed.length) lines.push('⚠️ Folder issues:\n' + f.failed.join('\n'));
    }
    lines.push('');
    if (!p.sendEmail) lines.push('📧 Email notification skipped (as requested)');
    else {
      if (app.length) lines.push(trySend_(() => mailDirectorApproved_(app, link, user), 'PIC & HOD (approved)'));
      if (rej.length) lines.push(trySend_(() => mailDirectorRejected_(rej, link), 'PIC & HOD (rejected)'));
    }
    return 'Update successful!\n\n' + lines.join('\n');
  });
}


// ======================= 8. PIC: SAU MUA HÀNG =======================

function showAfterPurchaseDialog() {
  const all = loadItems_(), r = getRoles_(null, all);
  if (!need_(r, 'isPIC', 'PIC')) return;
  const items = all.filter(x => x.directorStatus === 'Approved' && x.docNo && (r.isAccountant || sameEmail_(x.picEmail, r.user)));
  if (!items.length) return alert_('No Items', 'No Director-approved items found for after purchase update.');
  const name = esc_(r.picName || r.user);
  show_(page_({
    a: '#667eea', b: '#764ba2',
    title: '📦 After Purchase Update', subtitle: 'Update payment and supplier information for approved expenses - ' + name,
    stats: [['sDoc', 'Total Document No'], ['sItem', 'Total Items'], ['sDone', 'Payment to Supplier (Done)'], ['sPaid', 'Total Amount Paid']],
    filters: fsel_('fM', '📅 Expensed Record Month') + fsel_('fDT', '📋 Doc Type') + fsel_('fDN', '📄 Doc No') +
      fsel_('fPT', '💳 Payment Type', opts_(CONFIG.PAYMENT_TYPES)) + fsel_('fST', '✅ Status of Payment', opts_(['Done', 'Not yet'])) +
      '<button class="btn btn-red" onclick="clearF()">🔄 Clear All Filters</button>',
    before: '<div class="info" id="info"></div>',
    thead: th_(['Select', 'Row', 'Document No', 'Description', 'Quantity', 'Unit', 'Unit Price', 'Amount', 'Payment Request Date', 'Supplier', 'Payment Type', 'Status of Payment']),
    actions: '<div></div><div><button class="btn btn-ok" onclick="submit()">✅ Confirm Update</button> <button class="btn btn-grey" onclick="google.script.host.close()">❌ Cancel</button></div>',
    data: {
      types: CONFIG.PAYMENT_TYPES,
      items: items.map(x => {
        const qty = x.actQty || x.qty || 1, price = x.actUnitPrice || x.unitPrice || 0;
        return {
          row: x.row, docType: x.docType, docNo: x.docNo, desc: x.desc, currency: x.currency, expensedMonth: x.expensedMonth,
          qty, unit: x.actUnit || x.unit || 'Lần', unitPrice: price, amount: x.actAmount || qty * price,
          paymentDate: fmtDate_(x.paymentRequestRaw, 'yyyy-MM-dd'),
          supplier: x.actSupplier || x.supplier, paymentType: x.actPaymentType || x.paymentType, paymentStatus: x.paymentStatus || 'Not yet'
        };
      })
    },
    script: AFTER_JS_
  }), 'After Purchase Update - ' + (r.picName || r.user), 1850, 1000);
}

function handleAfterPurchaseUpdate(p) {
  return withLock_(() => {
    const sh = sh_(), C = CONFIG.COL, user = currentUser_(), all = loadItems_(), r = getRoles_(user, all), byRow = index_(all);
    if (!r.isPIC) throw new Error('No PIC permission.');
    const done = [];
    (p.updates || []).forEach(u => {
      const it = byRow[u.row];
      if (!it || it.directorStatus !== 'Approved') return;
      if (!r.isAccountant && !sameEmail_(it.picEmail, user)) return;
      const qty = num_(u.qty) || 1, price = num_(u.unitPrice);
      let pay = it.paymentRequestRaw;
      if (u.paymentDate) { const d = String(u.paymentDate).split('-').map(Number); pay = new Date(d[0], d[1] - 1, d[2]); }
      writeCells_(sh, it.row, C.ACT_QTY, [qty, u.unit || 'Lần', price, qty * price, pay, u.supplier || '', u.paymentType || '', u.paymentStatus || 'Not yet']);   // S..Z
      done.push(it);
    });
    const need = done.filter(x => !x.folderUrl);
    const f = need.length ? ensureFolders_(need, all) : null;
    let msg = 'Successfully updated ' + done.length + ' item(s).';
    if (f && f.created) msg += '\n📁 ' + f.created + ' folder(s) created.';
    if (f && f.failed.length) msg += '\n⚠️ Folder issues:\n' + f.failed.join('\n');
    return msg;
  });
}


// ======================= 9. KẾ TOÁN =======================

function showHardDocumentDialog() { accountantDialog_('hard'); }
function showDocumentApprovalDialog() { accountantDialog_('approval'); }

function accountantDialog_(mode) {
  const all = loadItems_(), r = getRoles_(null, all);
  if (!need_(r, 'isAccountant', 'Accountant')) return;
  const items = all.filter(x => x.hodStatus === 'Approved' && x.directorStatus === 'Approved' && x.docNo);
  if (!items.length) return alert_('No Items', 'No items available. Items must be approved by both HOD and Director first.');
  const hard = mode === 'hard';
  show_(page_({
    a: hard ? '#2196F3' : '#4caf50', b: hard ? '#1976D2' : '#388e3c', bg: '#f8f9fa',
    title: hard ? '💰 Hard Document Received Status' : '📄 Document Approval by Accountant',
    subtitle: hard ? 'Confirm physical documents received (column AA)' : 'Confirm or request revision of documents (column AB)',
    filters: '<div class="fg" style="min-width:280px"><label>🔍 Search</label><input id="fQ" oninput="apply()" placeholder="Document No, Description, PIC..."></div>' +
      fsel_('fPIC', '👤 PIC') + fsel_('fST', '📌 Current Status') +
      '<button class="btn btn-grey" style="padding:6px 12px;font-size:12px" onclick="selAll(true)">Select All</button>' +
      '<button class="btn btn-grey" style="padding:6px 12px;font-size:12px" onclick="selAll(false)">Select None</button>',
    thead: th_(['Select', 'Row', 'PIC Name', 'Document Type', 'Document No', 'Description', 'Approved Amount', 'Current Status', 'New Status']),
    actions: '<div>' + (hard ? '' : '<label><input type="checkbox" id="sendRev" checked> 📧 Send revision email to PIC for "Request rev" items</label>') + '</div>' +
      '<div><button class="btn btn-primary" onclick="submit()">' + (hard ? 'Update Hard Document Status' : 'Update Document Approval') + '</button> <button class="btn btn-grey" onclick="google.script.host.close()">Cancel</button></div>',
    data: { mode, items: items.map(x => ({ row: x.row, picName: x.picName, docType: x.docType, docNo: x.docNo, desc: x.desc, approvedAmount: x.approvedAmount, currency: x.currency, current: hard ? x.hardDoc : x.accApproval })) },
    script: ACC_JS_
  }), hard ? 'Hard Document Status' : 'Document Approval', 1400, 900);
}

function handleAccountantUpdate(p) {
  return withLock_(() => {
    const user = currentUser_();
    if (!inList_(user, CONFIG.ACCOUNTANT_EMAILS)) throw new Error('Only Accountant accounts can update document status.');
    const hard = p.mode === 'hard', col = hard ? CONFIG.COL.HARD_DOC : CONFIG.COL.ACC_APPROVAL;
    const allowed = hard ? ['Done', 'Not yet'] : ['Confirm', 'Request rev'];
    const sh = sh_(), byRow = index_(loadItems_()), rev = [];
    let n = 0;
    (p.updates || []).forEach(u => {
      const it = byRow[u.row];
      if (!it || it.hodStatus !== 'Approved' || it.directorStatus !== 'Approved' || allowed.indexOf(u.status) < 0) return;
      writeCells_(sh, it.row, col, [u.status]);
      n++;
      if (!hard && u.status === 'Request rev') rev.push(it);
    });
    let msg = 'Updated ' + (hard ? 'hard document status' : 'document approval') + ' for ' + n + ' item(s).';
    if (rev.length) msg += '\n' + rev.length + ' item(s) marked as "Request rev".' + (p.sendEmail ? '\n' + trySend_(() => mailRevision_(rev, sheetLink_(), user), 'PIC (revision request)') : '');
    return msg;
  });
}


// ======================= 10. FOLDER GOOGLE DRIVE =======================

function folderIdFrom_(s) { const m = String(s || '').match(/[-\w]{25,}/); return m ? m[0] : ''; }

// Tạo (hoặc dùng lại) folder tên = Document No trong folder cha của PIC; ghi link vào cột R
function ensureFolders_(items, all) {
  const sh = sh_(), res = { created: 0, linked: 0, failed: [] }, groups = {};
  items.forEach(x => { if (x.docNo) (groups[x.docNo] = groups[x.docNo] || []).push(x); });
  Object.keys(groups).forEach(docNo => {
    const g = groups[docNo];
    try {
      let url = ((all || []).find(x => x.docNo === docNo && x.folderUrl) || {}).folderUrl || '';
      if (!url) {
        const map = picInfo_(g[0].picName);
        const pid = (map && map.parentFolderId) || folderIdFrom_(g[0].parentFolder);
        if (!pid) throw new Error('no parent folder configured for PIC "' + g[0].picName + '"');
        const parent = DriveApp.getFolderById(pid), found = parent.getFoldersByName(docNo);
        let folder;
        if (found.hasNext()) folder = found.next();
        else { folder = parent.createFolder(docNo); res.created++; }
        url = folder.getUrl();
      }
      g.forEach(x => {
        if (!x.folderUrl) {
          sh.getRange(x.row, CONFIG.COL.FOLDER_LINK).setFormula('=HYPERLINK("' + url + '","📁 ' + docNo.replace(/"/g, '""') + '")');
          res.linked++;
        }
        x.folderUrl = url;
      });
    } catch (e) { res.failed.push(docNo + ': ' + e.message); }
  });
  return res;
}


// ======================= 11. EMAIL =======================

function sendMail_(to, cc, subject, html) {
  to = uniqEmails_([].concat(to));
  cc = uniqEmails_([].concat(cc || [])).filter(e => !inList_(e, to));
  if (!to.length) throw new Error('no recipient');
  if (MailApp.getRemainingDailyQuota() <= 0) throw new Error('daily email quota exhausted');
  MailApp.sendEmail({ to: to.join(','), cc: cc.join(','), subject: subject, htmlBody: html, name: 'MMH Expense Approval' });
}
function eachDoc_(items, fn) {
  const groups = groupByDoc_(items), errs = [];
  let n = 0;
  Object.keys(groups).forEach(k => {
    try { fn(groups[k], groups[k][0]); n++; } catch (e) { errs.push(groups[k][0].docNo + ': ' + e.message); }
  });
  if (errs.length) throw new Error(n + ' sent, ' + errs.length + ' failed (' + errs.join('; ') + ')');
  return n;
}
function trySend_(fn, label) {
  try { const n = fn(); return '📧 Email sent to ' + label + (typeof n === 'number' ? ' (' + n + ' email(s))' : ''); }
  catch (e) { return '⚠️ Email to ' + label + ' failed: ' + e.message; }
}

const TD_ = 'border:1px solid #d0d0d0;padding:6px;';
function mTable_(cols, rows, foot) {
  let h = '<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:10px 0;font-size:10.5pt;"><thead><tr>' +
    cols.map(c => '<th style="' + TD_ + 'background:#f2f2f2;text-align:' + (c[1] || 'left') + ';font-weight:700;">' + c[0] + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map((v, i) => '<td style="' + TD_ + 'text-align:' + (cols[i][1] || 'left') + ';">' + v + '</td>').join('') + '</tr>').join('') + '</tbody>';
  if (foot) {
    const pad = cols.length - foot.span - foot.cells.length;
    h += '<tfoot><tr style="background:#f5f5f5;font-weight:700;"><td colspan="' + foot.span + '" style="' + TD_ + 'text-align:right;">' + foot.label + '</td>' +
      foot.cells.map(c => '<td style="' + TD_ + 'text-align:right;">' + c + '</td>').join('') +
      (pad > 0 ? '<td colspan="' + pad + '" style="' + TD_ + '"></td>' : '') + '</tr></tfoot>';
  }
  return h + '</table>';
}
function mBox_(html, color) { return '<div style="margin:12px 0;padding:10px 14px;border-left:4px solid ' + (color || '#4472C4') + ';background:#f7f9fc;">' + html + '</div>'; }
function mList_(title, list) { return '<div style="margin:14px 0 0;"><b>' + title + '</b><ul style="margin:6px 0 0;padding-left:18px;">' + list.map(i => '<li style="margin:3px 0;">' + i + '</li>').join('') + '</ul></div>'; }
function mailShell_(heading, body, table, after, link, linkText) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#ffffff;">' +
    '<div style="max-width:960px;margin:0 auto;padding:20px;font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#000000;line-height:1.45;">' +
    '<h2 style="margin:0 0 12px;font-size:14pt;font-weight:700;color:#000;">' + heading + '</h2>' + body + (table || '') + (after || '') +
    '<p style="margin:18px 0 0;"><a href="' + link + '" style="color:#1a73e8;text-decoration:underline;font-weight:600;">' + (linkText || 'Open Expense Sheet') + '</a></p>' +
    '<p style="margin:22px 0 0;padding-top:10px;border-top:1px solid #e0e0e0;font-size:9pt;color:#666;">Automated notification from Expense Approval System | ' +
    Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm') + '</p></div></body></html>';
}

function docStatus_(docNo, all) {
  const st = { total: 0, sent: 0, hod: 0, dir: 0, est: {}, apr: {} };
  all.filter(x => x.docNo === docNo).forEach(x => {
    const c = x.currency || 'N/A';
    st.total++;
    st.est[c] = (st.est[c] || 0) + x.amount;
    if (x.status === 'Proposed') {
      if (!x.hodStatus || x.hodStatus === 'Rejected') st.sent++;
      if (x.hodStatus === 'Approved') st.hod++;
      if (x.directorStatus === 'Approved') st.dir++;
    }
    if (x.directorStatus === 'Approved') st.apr[c] = (st.apr[c] || 0) + x.approvedAmount;
  });
  return st;
}

// (1) PIC đề xuất / đề xuất lại → HOD
function mailProposal_(items, all, link, ccAcc) {
  return eachDoc_(items, (g, f) => {
    const re = g.some(x => x.isRepropose), st = docStatus_(f.docNo, all);
    const cols = [['Row', 'center'], ['No', 'center'], ['Name/Description'], ['Qty', 'center'], ['Unit', 'center'], ['Amount', 'right'], ['Expense Type'], ['Supplier']];
    if (re) cols.push(['Previous Rejection']);
    const rows = g.map((x, i) => {
      const r = [x.row, i + 1, esc_(x.desc), x.qty, esc_(x.unit), fmtAmt_(x.amount, x.currency), esc_(x.expenseType), esc_(x.supplier)];
      if (re) r.push(x.isRepropose ? '<span style="color:#d32f2f;"><b>[' + x.prevBy + ']</b> ' + esc_(x.prevComment) + '</span>' : '');
      return r;
    });
    const body = '<p>Dear HOD,</p><p>Please review the following ' + (re ? 'revised ' : '') + 'expense proposal.</p>' +
      mBox_('<b>PIC:</b> ' + esc_(f.picName) + '<br><b>Proposal Date:</b> ' + esc_(f.proposalDate) + '<br><b>Document Type:</b> ' + esc_(f.docType) + '<br><b>Document No:</b> ' + esc_(f.docNo)) +
      (re ? mBox_('<b>⚠️ Re-proposal:</b> items marked below were previously rejected and have been revised by the PIC based on the feedback.', '#d32f2f') : '') +
      mBox_('<b>Document ' + esc_(f.docNo) + ' status</b> (total ' + st.total + ' item(s))<br>• ' + st.sent + ' item(s) sent for approval<br>• ' + st.hod +
        ' item(s) approved by HOD<br>• ' + st.dir + ' item(s) approved by Director<br><b>Estimate amount:</b> ' + fmtTotals_(st.est) + '<br><b>Approved amount:</b> ' + fmtTotals_(st.apr), '#ff9800');
    const tbl = mTable_(cols, rows, { span: 5, label: (re ? 'Revised' : 'Proposal') + ' Total:', cells: [fmtTotals_(sumBy_(g, 'amount'))] });
    sendMail_(f.hodEmails, [f.picEmail].concat(ccAcc ? f.ccEmails : []),
      (re ? '[Re-Proposed]' : '[Expense Approval]') + ' - ' + f.picName + ' - ' + f.docType + ' - ' + f.docNo,
      mailShell_(re ? 'REVISED EXPENSE PROPOSAL FOR REVIEW' : 'EXPENSE PROPOSAL FOR REVIEW', body, tbl, '', link, 'Click here to review and approve/reject'));
  });
}

// (2) HOD duyệt (hoặc PIC kiêm HOD tự duyệt) → Director, CC PIC & HOD (1 email gộp)
function mailHodApproved_(items, link, hodUser, auto) {
  const groups = groupByDoc_(items), keys = Object.keys(groups), f0 = items[0];
  let sections = '';
  keys.forEach(k => {
    const g = groups[k], f = g[0];
    sections += '<div style="margin:16px 0 4px;font-weight:700;">' + esc_(f.docType) + ' - ' + esc_(f.docNo) + '</div>' +
      '<div>PIC: ' + esc_(f.picName) + ' | Items: ' + g.length + ' | Total approved: ' + fmtTotals_(sumBy_(g, 'approvedAmount')) + '</div>' +
      mTable_([['Row', 'center'], ['Description'], ['Estimate', 'right'], ['HOD Approved', 'right'], ['Supplier'], ['HOD Comment']],
        g.map(x => [x.row, esc_(x.desc), fmtAmt_(x.amount, x.currency), fmtAmt_(x.approvedAmount, x.currency), esc_(x.supplier), esc_(x.hodComment)]));
  });
  const body = '<p>Dear Director,</p><p>The following expense request(s) have been ' + (auto ? 'proposed by a PIC who is also HOD (level 1 auto-approved)' : 'approved by HOD (' + esc_(hodUser) + ')') +
    ' and are pending your final approval.</p><ul style="margin:0 0 8px 18px;padding:0;"><li><b>Documents:</b> ' + keys.length + '</li><li><b>Items:</b> ' + items.length +
    '</li><li><b>Total approved by HOD:</b> ' + fmtTotals_(sumBy_(items, 'approvedAmount')) + '</li></ul>';
  const after = mList_('Next steps', ['<b>Director:</b> 👑 Director Menu > Overview & Final Approval (please review within 24 to 48 hours)',
    '<b>PIC:</b> please prepare all required documents', 'PIC will receive another email once the Director has reviewed']);
  const subject = keys.length === 1 ? '[HOD Approved] - ' + f0.picName + ' - ' + f0.docType + ' - ' + f0.docNo
    : '[HOD Approved] ' + keys.length + ' documents - Pending Director approval';
  sendMail_(CONFIG.DIRECTOR_EMAILS, items.map(x => x.picEmail).concat([].concat.apply([], items.map(x => x.hodEmails))), subject,
    mailShell_('EXPENSE REQUEST APPROVED BY HOD', body, sections, after, link));
  return 1;
}

// (3) HOD từ chối → PIC, CC HOD
function mailHodRejected_(items, link) {
  return eachDoc_(items, (g, f) => {
    const body = '<p>Dear ' + esc_(f.picName) + ',</p><p>Your expense request has been rejected by HOD. Please review the reasons below and make the necessary adjustments before re-submitting.</p>' +
      '<p><b>Document:</b> ' + esc_(f.docType) + ' - ' + esc_(f.docNo) + '</p>';
    const tbl = mTable_([['Row', 'center'], ['No', 'center'], ['Description'], ['Qty', 'center'], ['Unit', 'center'], ['Amount', 'right'], ['HOD Comment']],
      g.map((x, i) => [x.row, i + 1, esc_(x.desc), x.qty, esc_(x.unit), fmtAmt_(x.amount, x.currency), esc_(x.hodComment)]),
      { span: 5, label: 'Total Rejected:', cells: [fmtTotals_(sumBy_(g, 'amount'))] });
    const after = mList_('Next steps', ['Review the rejection reasons above', 'Correct the row(s) in the sheet (rows are unlocked)', 'Re-submit via 📝 PIC Menu > Expense Proposal']);
    sendMail_([f.picEmail], f.hodEmails, '[HOD Rejected] - ' + f.picName + ' - ' + f.docType + ' - ' + f.docNo, mailShell_('EXPENSE REQUEST REJECTED', body, tbl, after, link));
  });
}

// (4) Director duyệt → PIC + HOD, CC Kế toán
function mailDirectorApproved_(items, link, director) {
  return eachDoc_(items, (g, f) => {
    const body = '<p>Dear ' + esc_(f.picName) + ',</p><p>Your expense request has been approved by the Director and is ready for processing.</p>' +
      '<p><b>Document:</b> ' + esc_(f.docType) + ' - ' + esc_(f.docNo) + '<br><b>Approved by Director:</b> ' + esc_(director) + '</p>';
    const tbl = mTable_([['Row', 'center'], ['Description'], ['Proposal Month', 'center'], ['Expensed Record Month', 'center'], ['Estimate Amount', 'right'], ['Approved Amount', 'right']],
      g.map(x => [x.row, esc_(x.desc), fmtMonth_(x.proposalMonth), fmtMonth_(x.expensedMonth), fmtAmt_(x.amount, x.currency), fmtAmt_(x.approvedAmount, x.currency)]),
      { span: 4, label: 'Total:', cells: [fmtTotals_(sumBy_(g, 'amount')), fmtTotals_(sumBy_(g, 'approvedAmount'))] });
    const folder = f.folderUrl ? 'Please upload the required documents for Accounting at: <a href="' + f.folderUrl + '" style="color:#1a73e8;font-weight:600;">📁 ' + esc_(f.docNo) + '</a>'
      : 'Please submit the required documents to Accounting';
    const after = mList_('Next steps', [folder, 'Update actual purchase info via 📝 PIC Menu > After Purchase Update', 'Accounting will verify and process payment']);
    sendMail_([f.picEmail].concat(f.hodEmails), f.ccEmails, '[Director Approved] - ' + f.picName + ' - ' + f.docType + ' - ' + f.docNo,
      mailShell_('DIRECTOR FINAL APPROVAL', body, tbl, after, link));
  });
}

// (5) Director từ chối → PIC + HOD
function mailDirectorRejected_(items, link) {
  return eachDoc_(items, (g, f) => {
    const body = '<p>Dear ' + esc_(f.picName) + ',</p><p>Your expense request has <b>not</b> been approved by the Director. Please review the comments below and update your submission if necessary.</p>' +
      '<p><b>Document:</b> ' + esc_(f.docType) + ' - ' + esc_(f.docNo) + '</p>';
    const tbl = mTable_([['Row', 'center'], ['No', 'center'], ['Description'], ['Qty', 'center'], ['Unit', 'center'], ['Approved Amount', 'right'], ['Director Comment']],
      g.map((x, i) => [x.row, i + 1, esc_(x.desc), x.qty, esc_(x.unit), fmtAmt_(x.approvedAmount, x.currency), esc_(x.comment)]),
      { span: 5, label: 'Total Rejected:', cells: [fmtTotals_(sumBy_(g, 'approvedAmount'))] });
    const after = mList_('Next steps', ["Review the Director's comments carefully", 'Correct the row(s) in the sheet (rows are unlocked)', 'Re-submit via 📝 PIC Menu > Expense Proposal (goes through HOD again)']);
    sendMail_([f.picEmail].concat(f.hodEmails), [], '[Director Rejected] - ' + f.picName + ' - ' + f.docType + ' - ' + f.docNo,
      mailShell_('EXPENSE REQUEST REJECTED BY DIRECTOR', body, tbl, after, link));
  });
}

// (6) Director tự đề xuất → Kế toán
function mailDirectorSelfPlan_(items, link) {
  return eachDoc_(items, (g, f) => {
    const body = '<p>Dear Hoa san,</p><p>This is my expense plan for <b>' + esc_(f.docType) + '</b> document: <b>' + esc_(f.docNo) + '</b>.</p>';
    const tbl = mTable_([['Row', 'center'], ['Description'], ['Proposal Month', 'center'], ['Expensed Record Month', 'center'], ['Estimate Amount', 'right']],
      g.map(x => [x.row, esc_(x.desc), fmtMonth_(x.proposalMonth), fmtMonth_(x.expensedMonth), fmtAmt_(x.amount, x.currency)]),
      { span: 4, label: 'Total Amount:', cells: [fmtTotals_(sumBy_(g, 'amount'))] });
    const after = '<p>I will provide the related documents as soon as possible.' +
      (f.folderUrl ? ' Documents folder: <a href="' + f.folderUrl + '" style="color:#1a73e8;">📁 ' + esc_(f.docNo) + '</a>' : '') +
      '</p><p>Thank you for your support.</p><p>Best regards,<br><b>' + esc_(f.picName) + '</b></p>';
    sendMail_(f.ccEmails.length ? f.ccEmails : CONFIG.ACCOUNTANT_EMAILS, [f.picEmail], '[Director Expense Plan] - ' + f.docType + ' - ' + f.docNo,
      mailShell_('DIRECTOR EXPENSE PLAN', body, tbl, after, link));
  });
}

// (7) Kế toán yêu cầu bổ sung chứng từ → PIC, CC HOD + Kế toán
function mailRevision_(items, link, accountant) {
  return eachDoc_(items, (g, f) => {
    const body = '<p>Dear ' + esc_(f.picName) + ',</p><p>The Accountant has reviewed your approved expense documents and identified items that require additional documentation or revision.</p>' +
      mBox_('<b>Document Type:</b> ' + esc_(f.docType) + '<br><b>Document No:</b> ' + esc_(f.docNo) + '<br><b>Reviewed by:</b> ' + esc_(accountant), '#ff9800');
    const tbl = mTable_([['Row', 'center'], ['No', 'center'], ['Description'], ['Document Type'], ['Document No']],
      g.map((x, i) => [x.row, i + 1, esc_(x.desc), esc_(x.docType), esc_(x.docNo)]));
    const after = mList_('Action required', ['Complete supporting documentation', 'Original receipts or invoices', 'Any additional required approvals',
      f.folderUrl ? 'Upload to: <a href="' + f.folderUrl + '" style="color:#1a73e8;">📁 ' + esc_(f.docNo) + '</a>' : 'Submit the documents to the Accounting department']);
    sendMail_([f.picEmail], f.hodEmails.concat(f.ccEmails), '[Document Request] Document Revision Required - ' + f.docType + ' - ' + f.docNo,
      mailShell_('DOCUMENT REVISION REQUIRED', body, tbl, after, link));
  });
}


// ======================= 12. KHUNG GIAO DIỆN DIALOG =======================

function th_(labels) { return labels.map(l => '<th>' + l + '</th>').join(''); }
function opts_(list) { return list.map(v => '<option value="' + esc_(v) + '">' + esc_(v) + '</option>').join(''); }
function fsel_(id, label, opts) {
  return '<div class="fg"><label>' + label + ':</label><select id="' + id + '" onchange="apply()"><option value="">All</option>' + (opts || '') + '</select></div>';
}

function page_(o) {
  const stats = o.stats ? '<div class="stats" style="grid-template-columns:repeat(' + o.stats.length + ',1fr)">' +
    o.stats.map(s => '<div class="stat"' + (s[2] ? ' style="border-top-color:' + s[2] + '"' : '') + '><div class="v" id="' + s[0] + '">0</div><div class="l">' + s[1] + '</div></div>').join('') + '</div>' : '';
  return '<!DOCTYPE html><html><head><base target="_top"><meta charset="UTF-8">' + css_(o.a, o.b, o.bg) + '</head><body><div class="container">' +
    '<div class="header"><h2>' + o.title + '</h2><p>' + o.subtitle + '</p></div>' + stats +
    (o.filters ? '<div class="filters">' + o.filters + '</div>' : '') + (o.before || '') +
    '<div class="tw"><table><thead><tr>' + o.thead + '</tr></thead><tbody id="tb"></tbody></table></div>' +
    '<div class="actions">' + o.actions + '</div></div>' +
    '<div class="loading" id="loading"><div class="spinner"></div><div>Processing your request...</div></div>' +
    '<script>' + JS_ + '\nvar DATA=' + json_(o.data) + ';\n' + o.script + '</script></body></html>';
}

function css_(a, b, bg) {
  return `<style>
*{box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:10px;background:${bg || 'linear-gradient(135deg,' + a + ' 0%,' + b + ' 100%)'};font-size:13px;color:#333}
.container{background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden;display:flex;flex-direction:column;height:calc(100vh - 20px)}
.header{background:linear-gradient(135deg,${a} 0%,${b} 100%);color:#fff;padding:12px 16px;text-align:center}
.header h2{margin:0 0 3px;font-size:19px}.header p{margin:0;font-size:12px;opacity:.95}
.stats{display:grid;gap:8px;padding:10px 15px;background:#f8f9fa;border-bottom:2px solid #e9ecef}
.stat{background:#fff;padding:9px;border-radius:8px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.1);border-top:3px solid ${a};transition:transform .2s}
.stat:hover{transform:translateY(-2px);box-shadow:0 4px 10px rgba(0,0,0,.15)}
.stat .v{font-size:18px;font-weight:700;color:#2c3e50;margin-bottom:3px;word-break:break-word}
.stat .l{font-size:10px;color:#7f8c8d;font-weight:600;line-height:1.3}
.filters{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;padding:10px 15px;border-bottom:1px solid #ddd}
.fg{display:flex;flex-direction:column;gap:3px;min-width:140px}
.fg label{font-weight:600;font-size:11px;color:#495057;white-space:nowrap}
.fg select,.fg input{padding:6px 10px;border:2px solid ${a};border-radius:6px;font-size:12px;font-weight:600;background:#fff;color:#2c3e50}
.fg select:focus,.fg input:focus{outline:none;box-shadow:0 0 0 3px rgba(102,126,234,.2)}
.btn{padding:9px 22px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .25s;color:#fff}
.btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.2)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,${a} 0%,${b} 100%)}
.btn-ok{background:linear-gradient(135deg,#66bb6a 0%,#43a047 100%)}
.btn-grey{background:#95a5a6}
.btn-red{background:linear-gradient(135deg,#e74c3c 0%,#c0392b 100%);padding:6px 12px;font-size:11px;height:32px}
.info{margin:8px 15px 0;padding:7px 10px;border-radius:6px;font-size:12px;font-weight:600;text-align:center;background:#e3f2fd;color:#1976d2}
.info.ok{background:#d4edda;color:#155724;border-left:4px solid #28a745}
.info.warn{background:#fff3cd;color:#856404;border-left:4px solid #ffc107}
.banner{display:none;margin:8px 15px 0;padding:10px 16px;border-radius:8px;background:#fff8e1;border:2px solid #ffc107;color:#e65100;font-size:12px}
.banner.show{display:block}.banner ul{margin:4px 0 0;padding-left:20px}
.legend{display:flex;gap:15px;justify-content:center;padding:6px;background:#f1f3f5;border-bottom:1px solid #dee2e6;font-size:11px}
.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{width:16px;height:16px;border-radius:4px;border:1px solid #adb5bd;display:inline-block}
.tw{flex:1;overflow:auto;padding:8px 15px}
table{width:100%;border-collapse:collapse;background:#fff}
th{background:linear-gradient(135deg,${a} 0%,${b} 100%);color:#fff;padding:10px 7px;text-align:left;font-size:12px;font-weight:600;position:sticky;top:0;z-index:5;white-space:nowrap}
td{padding:7px 6px;border-bottom:1px solid #eee;font-size:12px;vertical-align:middle}
tbody tr:hover{background:#f5f7ff}
tr.hide{display:none}tr.g{background:#d4edda}tr.y{background:#fff3cd}tr.r{background:#f8d7da}
td.num{text-align:right}td.c{text-align:center}td.rn{font-weight:700;color:${a};text-align:center}
td input[type=text],td input[type=number],td input[type=date],td input[type=month],td select{padding:5px;border:1px solid #ccc;border-radius:4px;font-size:12px;width:100%}
td input.err{border:2px solid #f44336!important;background:#ffebee}
.actions{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 15px;border-top:2px solid #e9ecef;flex-wrap:wrap}
.actions label{font-size:13px;display:inline-flex;align-items:center;gap:6px;margin-right:16px;cursor:pointer;user-select:none}
input[type=checkbox]{width:16px;height:16px;cursor:pointer}
.loading{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:99;justify-content:center;align-items:center;flex-direction:column;color:#fff;font-weight:600}
.loading.active{display:flex}
.spinner{width:56px;height:56px;border:6px solid #f3f3f3;border-top:6px solid ${a};border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px}
@keyframes spin{to{transform:rotate(360deg)}}
</style>`;
}

// ---------- JS dùng chung phía trình duyệt ----------
const JS_ = `
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n,cur){n=Number(n)||0;return n.toLocaleString('en-US',{maximumFractionDigits:(!cur||cur==='VND')?0:2});}
function fmtMonth(k){k=String(k||'');return k.length===6?k.slice(0,4)+'-'+k.slice(4):k;}
function totals(m){var p=[];for(var c in m){if(m[c]>0)p.push(fmt(m[c],c)+' '+c);}return p.length?p.join(' + '):'0';}
function uniq(a){var o={},r=[];a.forEach(function(x){if(x!==''&&x!=null&&!o[x]){o[x]=1;r.push(x);}});return r.sort();}
function col(k){return IT.map(function(x){return x[k];});}
function fillSelect(id,vals,f){var s=document.getElementById(id);vals.forEach(function(v){var o=document.createElement('option');o.value=v;o.textContent=f?f(v):v;s.appendChild(o);});}
function hasOpt(s,v){return Array.prototype.some.call(s.options,function(o){return o.value===v;});}
function val(id){return document.getElementById(id).value;}
function setText(id,t){document.getElementById(id).textContent=t;}
function tr(it){return document.getElementById('r_'+it.row);}
function shown(it){return !tr(it).classList.contains('hide');}
function busy(on){document.getElementById('loading').classList.toggle('active',on);document.querySelectorAll('.btn').forEach(function(b){b.disabled=on;});}
function run(fn,payload){busy(true);google.script.run.withSuccessHandler(function(msg){busy(false);alert(msg);google.script.host.close();}).withFailureHandler(function(e){busy(false);if(typeof apply==='function')apply(true);alert('❌ '+(e&&e.message?e.message:e));})[fn](payload);}
`;

// ---------- Dialog: PIC đề xuất ----------
const PROPOSE_JS_ = `
var IT=DATA.items;
function em(it){var e=document.getElementById('em_'+it.row);return e&&e.value?e.value.replace('-',''):'';}
function miss(it){var m=it.missing.slice();if(!em(it))m.unshift('Expensed Record Month');return m;}
function picked(it){var c=tr(it).querySelector('.ck');return shown(it)&&c.checked&&!c.disabled;}
function render(){var h='';IT.forEach(function(it,i){
 var cls=(it.hod==='Approved'&&it.director==='Approved')?'g':((it.hod==='Rejected'||it.director==='Rejected')?'y':'');
 h+='<tr id="r_'+it.row+'" class="'+cls+'">'+
 '<td class="c"><input type="checkbox" class="ck"'+(it.locked?' disabled':' checked')+' onchange="apply()"></td>'+
 '<td class="rn">'+it.row+'</td><td class="c">'+(i+1)+'</td><td class="c">'+esc(fmtMonth(it.proposalMonth))+'</td>'+
 '<td class="c"><input type="month" id="em_'+it.row+'" value="'+esc(fmtMonth(it.expensedMonth))+'"'+(it.locked?' disabled':'')+' onchange="apply()" style="width:135px"></td>'+
 '<td>'+esc(it.docNo)+'</td><td>'+esc(it.desc)+'</td><td class="c">'+esc(it.qty||'')+'</td><td class="c">'+esc(it.unit)+'</td>'+
 '<td class="num">'+fmt(it.unitPrice,it.currency)+'</td><td class="num"><b>'+fmt(it.amount,it.currency)+'</b></td>'+
 '<td class="c">'+esc(it.currency)+'</td><td class="num">'+esc(it.rate)+'</td><td>'+esc(it.supplier)+'</td><td class="c">'+esc(it.paymentType||'TBD')+'</td></tr>';});
 document.getElementById('tb').innerHTML=h;}
function apply(){
 var f={pm:val('fPM'),em:val('fEM'),ps:val('fPS'),hs:val('fHS'),ds:val('fDS'),dt:val('fDT'),dn:val('fDN')};
 var docs={},n=0,amt={},apr={},ms={},sel=0;
 IT.forEach(function(it){
  var show=(!f.pm||it.proposalMonth===f.pm)&&(!f.em||it.expensedMonth===f.em)&&(!f.ps||it.propose===f.ps)&&(!f.hs||it.hod===f.hs)&&(!f.ds||it.director===f.ds)&&(!f.dt||it.docType===f.dt)&&(!f.dn||it.docNo===f.dn);
  tr(it).classList.toggle('hide',!show);if(!show)return;
  n++;if(it.docNo)docs[it.docNo]=1;var c=it.currency||'N/A';amt[c]=(amt[c]||0)+it.amount;
  if(it.director==='Approved')apr[c]=(apr[c]||0)+it.approvedAmount;
  if(picked(it)){sel++;miss(it).forEach(function(x){ms[x]=(ms[x]||0)+1;});}
 });
 setText('sDoc',Object.keys(docs).length);setText('sItem',n);setText('sAmt',totals(amt));setText('sApr',totals(apr));
 var info=document.getElementById('info'),keys=Object.keys(ms);
 if(!sel){info.className='info';info.textContent='No item selected';}
 else if(!keys.length){info.className='info ok';info.textContent='✅ All information is complete, ready to submit proposal ('+sel+' item(s) selected)';}
 else{info.className='info warn';info.innerHTML='⚠️ <b>Missing Information:</b> '+keys.map(function(k){return '"'+esc(k)+'": '+ms[k]+' row(s)';}).join(' | ');}
}
function clearF(){['fEM','fHS','fDS','fDT','fDN'].forEach(function(id){document.getElementById(id).value='';});
 var pm=document.getElementById('fPM');pm.value=hasOpt(pm,DATA.cur)?DATA.cur:'';document.getElementById('fPS').value='Not yet';apply();}
function submit(){var rows=[],months={},errs=[];
 IT.forEach(function(it){if(!picked(it))return;rows.push(it.row);if(em(it))months[it.row]=em(it);
  var m=miss(it);if(m.length)errs.push('Row '+it.row+' ('+(it.docNo||'No Doc No')+'): '+m.join(', '));});
 if(!rows.length){alert('⚠️ Please select at least one item to propose.');return;}
 if(errs.length){alert('⚠️ Cannot submit proposal - missing required information:\\n\\n'+errs.join('\\n')+'\\n\\nPlease fill in all required information first.');return;}
 if(!confirm('Confirm proposal for '+rows.length+' item(s)?'))return;
 run('handlePropose',{rows:rows,months:months,sendToHOD:document.getElementById('sendHOD').checked,ccAccountant:document.getElementById('ccAcc').checked});}
fillSelect('fPM',uniq(col('proposalMonth')),fmtMonth);fillSelect('fEM',uniq(col('expensedMonth')),fmtMonth);
fillSelect('fDT',uniq(col('docType')));fillSelect('fDN',uniq(col('docNo')));
render();clearF();
`;

// ---------- Dialog: HOD ----------
const HOD_JS_ = `
var IT=DATA.items;
function picked(it){return shown(it)&&tr(it).querySelector('.ck').checked;}
function render(){var h='';IT.forEach(function(it){
 h+='<tr id="r_'+it.row+'"><td class="c"><input type="checkbox" class="ck" checked onchange="apply()"></td>'+
 '<td class="rn">'+it.row+'</td><td>'+esc(it.picName)+'</td><td>'+esc(it.docNo)+'</td><td>'+esc(it.desc)+'</td>'+
 '<td class="num">'+fmt(it.amount,it.currency)+'</td><td class="c">'+esc(it.currency)+'</td><td>'+esc(it.supplier)+'</td>'+
 '<td><select id="sel_'+it.row+'" onchange="apply()"><option>Approved</option><option>Rejected</option></select></td>'+
 '<td><input type="text" id="cmt_'+it.row+'" placeholder="Optional comment..." oninput="apply()" style="min-width:170px"></td>'+
 '<td><input type="number" id="amt_'+it.row+'" value="'+it.amount+'" min="0" step="any" oninput="apply()" style="width:130px;text-align:right"></td></tr>';});
 document.getElementById('tb').innerHTML=h;}
function apply(){
 var f={p:val('fPIC'),t:val('fDT'),d:val('fDN')},n=0,docs={},adocs={},est={},apr={},issues=[];
 IT.forEach(function(it){
  var show=(!f.p||it.picName===f.p)&&(!f.t||it.docType===f.t)&&(!f.d||it.docNo===f.d);tr(it).classList.toggle('hide',!show);
  var dec=val('sel_'+it.row),cm=document.getElementById('cmt_'+it.row),need=dec==='Rejected'&&!cm.value.trim();
  cm.classList.toggle('err',need);cm.placeholder=dec==='Rejected'?'Required for rejection':'Optional comment...';
  if(!picked(it))return;
  n++;docs[it.docNo]=1;var c=it.currency||'N/A';est[c]=(est[c]||0)+it.amount;
  if(dec==='Approved'){adocs[it.docNo]=1;apr[c]=(apr[c]||0)+(parseFloat(val('amt_'+it.row))||0);}
  else if(need)issues.push('Row '+it.row+': Comment is REQUIRED for rejection');
 });
 if(!n)issues.unshift('Please select at least one item.');
 setText('sItem',n);setText('sDoc',Object.keys(docs).length);setText('sADoc',Object.keys(adocs).length);setText('sEst',totals(est));setText('sApr',totals(apr));
 var b=document.getElementById('vb');b.classList.toggle('show',issues.length>0);
 b.innerHTML='<b>Validation Issues:</b><ul>'+issues.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
 document.getElementById('btnSubmit').disabled=issues.length>0;}
function submit(){var a=[],r=[];
 IT.forEach(function(it){if(!picked(it))return;var d={row:it.row,comment:val('cmt_'+it.row).trim(),approvedAmount:parseFloat(val('amt_'+it.row))||0};(val('sel_'+it.row)==='Approved'?a:r).push(d);});
 if(!confirm('Submit HOD decisions?\\n\\n✅ Approve: '+a.length+'\\n❌ Reject: '+r.length))return;
 run('handleHODDecisions',{approvals:a,rejections:r});}
fillSelect('fPIC',uniq(col('picName')));fillSelect('fDT',uniq(col('docType')));fillSelect('fDN',uniq(col('docNo')));
render();apply();
`;

// ---------- Dialog: Director ----------
const DIRECTOR_JS_ = `
var IT=DATA.items;
function picked(it){return shown(it)&&tr(it).querySelector('.ck').checked;}
function render(){var h='';IT.forEach(function(it){
 var cls=it.director==='Approved'?'g':(it.director==='Rejected'?'r':''),rj=it.director==='Rejected';
 h+='<tr id="r_'+it.row+'" class="'+cls+'"><td class="c"><input type="checkbox" class="ck"'+(it.director==='Not yet'?' checked':'')+'></td>'+
 '<td class="rn">'+it.row+'</td><td>'+esc(it.picName)+'</td><td class="c">'+esc(fmtMonth(it.proposalMonth))+'</td><td>'+esc(it.docNo)+'</td><td>'+esc(it.desc)+'</td>'+
 '<td class="num">'+fmt(it.amount,it.currency)+'</td><td class="num"><b>'+fmt(it.approvedAmount,it.currency)+'</b></td><td class="c">'+esc(it.currency)+'</td>'+
 '<td>'+esc(it.supplier)+'</td><td>'+esc(it.paymentType)+'</td><td class="c">'+esc(it.director)+'</td>'+
 '<td><select id="sel_'+it.row+'" onchange="apply()"><option'+(rj?'':' selected')+'>Approved</option><option'+(rj?' selected':'')+'>Rejected</option></select></td>'+
 '<td><input type="text" id="cmt_'+it.row+'" value="'+esc(it.comment)+'" placeholder="Required for rejection..." oninput="apply()" style="min-width:180px"></td></tr>';});
 document.getElementById('tb').innerHTML=h;}
function apply(){
 var f={p:val('fPIC'),m:val('fPM'),a:val('fFA'),t:val('fDT'),d:val('fDN')},docs={},n=0,ok=0,est={},act={};
 IT.forEach(function(it){
  var show=(!f.p||it.picName===f.p)&&(!f.m||it.proposalMonth===f.m)&&(!f.a||it.director===f.a)&&(!f.t||it.docType===f.t)&&(!f.d||it.docNo===f.d);
  tr(it).classList.toggle('hide',!show);
  var cm=document.getElementById('cmt_'+it.row);cm.classList.toggle('err',val('sel_'+it.row)==='Rejected'&&!cm.value.trim());
  if(!show)return;n++;docs[it.docNo]=1;if(it.director==='Approved')ok++;
  var c=it.currency||'N/A';est[c]=(est[c]||0)+it.amount;act[c]=(act[c]||0)+it.actualAmount;});
 setText('sDoc',Object.keys(docs).length);setText('sItem',n);setText('sOk',ok);setText('sEst',totals(est));setText('sAct',totals(act));}
function clearF(){['fPIC','fPM','fFA','fDT','fDN'].forEach(function(id){document.getElementById(id).value='';});apply();}
function submit(){var u=[],e=[];
 IT.forEach(function(it){if(!picked(it))return;var d={row:it.row,approval:val('sel_'+it.row),comment:val('cmt_'+it.row).trim()};
  if(d.approval==='Rejected'&&!d.comment)e.push('Row '+it.row+': Comment is required for rejection');u.push(d);});
 if(!u.length){alert('Please select at least one item to update.');return;}
 if(e.length){alert('Validation Error:\\n\\n'+e.join('\\n'));return;}
 var se=document.getElementById('sendEmail').checked;
 if(!confirm('You are about to update '+u.length+' item(s).\\n\\nEmail notification: '+(se?'YES':'NO')+'\\n\\nContinue?'))return;
 run('handleDirectorUpdate',{updates:u,sendEmail:se});}
fillSelect('fPIC',uniq(col('picName')));fillSelect('fPM',uniq(col('proposalMonth')),fmtMonth);
fillSelect('fDT',uniq(col('docType')));fillSelect('fDN',uniq(col('docNo')));
render();document.getElementById('fFA').value='Not yet';apply();
`;

// ---------- Dialog: After Purchase ----------
const AFTER_JS_ = `
var IT=DATA.items;
function sel(list,cur){if(cur&&list.indexOf(cur)<0)list=list.concat([cur]);return '<option value="">Select...</option>'+list.map(function(t){return '<option'+(t===cur?' selected':'')+'>'+esc(t)+'</option>';}).join('');}
function render(){var h='';IT.forEach(function(it){var d=it.paymentStatus==='Done';
 h+='<tr id="r_'+it.row+'"><td class="c"><input type="checkbox" class="ck"></td><td class="rn">'+it.row+'</td><td>'+esc(it.docNo)+'</td><td>'+esc(it.desc)+'</td>'+
 '<td><input type="text" id="q_'+it.row+'" value="'+it.qty+'" oninput="numOnly(this);calc('+it.row+')" style="width:80px;text-align:right"></td>'+
 '<td><input type="text" id="u_'+it.row+'" value="'+esc(it.unit)+'" style="width:70px"></td>'+
 '<td><input type="text" id="p_'+it.row+'" value="'+it.unitPrice+'" oninput="numOnly(this);calc('+it.row+')" style="width:110px;text-align:right"></td>'+
 '<td class="num" id="a_'+it.row+'" style="color:#2e7d32;font-weight:600">'+fmt(it.amount,it.currency)+'</td>'+
 '<td><input type="date" id="d_'+it.row+'" value="'+esc(it.paymentDate)+'" style="width:140px"></td>'+
 '<td><input type="text" id="s_'+it.row+'" value="'+esc(it.supplier)+'" style="min-width:150px"></td>'+
 '<td><select id="t_'+it.row+'" style="min-width:180px">'+sel(DATA.types,it.paymentType)+'</select></td>'+
 '<td><select id="st_'+it.row+'" onchange="apply(true)"><option'+(d?'':' selected')+'>Not yet</option><option'+(d?' selected':'')+'>Done</option></select></td></tr>';});
 document.getElementById('tb').innerHTML=h;}
function numOnly(el){var v=el.value.replace(/[^0-9.,]/g,'').replace(/,/g,'.');var p=v.split('.');if(p.length>2)v=p[0]+'.'+p.slice(1).join('');el.value=v;}
function amt(it){return (parseFloat(val('q_'+it.row))||0)*(parseFloat(val('p_'+it.row))||0);}
function calc(row){var it=IT.filter(function(x){return x.row===row;})[0];setText('a_'+row,fmt(amt(it),it.currency));apply(true);}
function apply(keep){
 var f={m:val('fM'),t:val('fDT'),d:val('fDN'),p:val('fPT'),s:val('fST')},docs={},n=0,done=0,paid={};
 IT.forEach(function(it){
  var show=(!f.m||it.expensedMonth===f.m)&&(!f.t||it.docType===f.t)&&(!f.d||it.docNo===f.d)&&(!f.p||it.paymentType===f.p)&&(!f.s||it.paymentStatus===f.s);
  tr(it).classList.toggle('hide',!show);if(keep!==true)tr(it).querySelector('.ck').checked=show;
  if(!show)return;n++;docs[it.docNo]=1;
  if(val('st_'+it.row)==='Done'){done++;var c=it.currency||'N/A';paid[c]=(paid[c]||0)+amt(it);}});
 setText('sDoc',Object.keys(docs).length);setText('sItem',n);setText('sDone',done);setText('sPaid',totals(paid));
 setText('info',n===IT.length?'Showing all items ('+n+' items)':'Showing '+n+' of '+IT.length+' items (filtered)');}
function clearF(){['fM','fDT','fDN','fPT','fST'].forEach(function(id){document.getElementById(id).value='';});apply();}
function submit(){var u=[];
 IT.forEach(function(it){if(!shown(it)||!tr(it).querySelector('.ck').checked)return;
  u.push({row:it.row,qty:val('q_'+it.row),unit:val('u_'+it.row),unitPrice:val('p_'+it.row),paymentDate:val('d_'+it.row),supplier:val('s_'+it.row),paymentType:val('t_'+it.row),paymentStatus:val('st_'+it.row)});});
 if(!u.length){alert('Please select at least one item to update.');return;}
 if(!confirm('Confirm update for '+u.length+' item(s)?'))return;
 run('handleAfterPurchaseUpdate',{updates:u});}
fillSelect('fM',uniq(col('expensedMonth')),fmtMonth);fillSelect('fDT',uniq(col('docType')));fillSelect('fDN',uniq(col('docNo')));
render();apply();
`;

// ---------- Dialog: Kế toán ----------
const ACC_JS_ = `
var IT=DATA.items,OPT=DATA.mode==='hard'?['Done','Not yet']:['Confirm','Request rev'];
function color(s){return (s==='Done'||s==='Confirm')?'#4caf50':((s==='Not yet'||s==='Request rev')?'#f44336':'#757575');}
function render(){var h='';IT.forEach(function(it){var cur=it.current||'Not set';
 h+='<tr id="r_'+it.row+'"><td class="c"><input type="checkbox" class="ck" checked></td><td class="rn">'+it.row+'</td><td>'+esc(it.picName)+'</td>'+
 '<td>'+esc(it.docType)+'</td><td>'+esc(it.docNo)+'</td><td>'+esc(it.desc)+'</td><td class="num">'+fmt(it.approvedAmount,it.currency)+' '+esc(it.currency)+'</td>'+
 '<td class="c" style="color:'+color(cur)+';font-weight:700">'+esc(cur)+'</td>'+
 '<td><select id="n_'+it.row+'">'+OPT.map(function(o){return '<option'+(o===it.current?' selected':'')+'>'+o+'</option>';}).join('')+'</select></td></tr>';});
 document.getElementById('tb').innerHTML=h;}
function apply(){var q=val('fQ').toLowerCase(),p=val('fPIC'),s=val('fST');
 IT.forEach(function(it){var show=(!p||it.picName===p)&&(!s||(it.current||'Not set')===s)&&(!q||(it.docNo+' '+it.desc+' '+it.picName+' '+it.docType).toLowerCase().indexOf(q)>=0);
  tr(it).classList.toggle('hide',!show);});}
function selAll(on){IT.forEach(function(it){if(shown(it))tr(it).querySelector('.ck').checked=on;});}
function submit(){var u=[];
 IT.forEach(function(it){if(shown(it)&&tr(it).querySelector('.ck').checked)u.push({row:it.row,status:val('n_'+it.row)});});
 if(!u.length){alert('Please select items to update.');return;}
 if(!confirm('Update '+(DATA.mode==='hard'?'hard document status':'document approval')+' for '+u.length+' item(s)?'))return;
 var se=document.getElementById('sendRev');
 run('handleAccountantUpdate',{mode:DATA.mode,updates:u,sendEmail:!!(se&&se.checked)});}
fillSelect('fPIC',uniq(col('picName')));fillSelect('fST',OPT.concat(['Not set']));
render();apply();
`;


// ======================= 13. HƯỚNG DẪN, TRỢ GIÚP, CÀI ĐẶT =======================

function showPICGuide() { showGuide_('pic'); }
function showHODGuide() { showGuide_('hod'); }
function showDirectorGuide() { showGuide_('director'); }
function showAccountantGuide() { showGuide_('accountant'); }

const GUIDES_ = {
  pic: { color: '#3498db', title: '📝 PIC (Person In Charge) Guide', blocks: [
    ['workflow', 'Your role', 'You create expense rows and submit them for 2-level approval (HOD → Director). The system recognizes you by the Google account you are signed in with. <b>You do not need to type any email</b> in columns AE/AF/AG: they are filled automatically from your PIC name in column D.'],
    ['step', 'Step 1: Enter data (from row 7)', '<b>B</b> Proposal Month · <b>C</b> Proposal Date · <b>D</b> PIC Name (exactly your name in the list) · <b>E</b> Document Type · <b>G</b> Document No · <b>H</b> Description · <b>I</b> Qty · <b>J</b> Unit · <b>K</b> Unit Price · <b>L</b> Amount (=I*K) · <b>M</b> Currency · <b>O</b> Expense Type · <b>P</b> Supplier · <b>Q</b> Payment Type · <b>AO</b> Rate'],
    ['step', 'Step 2: PIC Menu > Expense Proposal', 'Filter by month/status, set <b>Expensed Record Month</b>, tick the rows and click Confirm Proposal. Only rows that are <b>visible and ticked</b> are submitted. A banner shows any missing required field.'],
    ['trigger', 'What the system does', '• AD = "Proposed", AL ticked (row locked)<br>• Email to your HOD (CC you; CC Accountant if ticked)<br>• If you are also HOD: level 1 is auto-approved and the Director is notified<br>• If you are the Director: both levels are auto-approved and Accounting receives your expense plan'],
    ['step', 'Step 3: If rejected', 'The row is unlocked and shows again as "Not yet" (yellow). Correct it and propose again from the same dialog. The email is marked <b>[Re-Proposed]</b> with the previous rejection reason.'],
    ['step', 'Step 4: After Director approval', 'A Drive folder (name = Document No) is linked in column R. Use <b>PIC Menu > After Purchase Update</b> to record actual qty, unit price, payment date, supplier, payment type and payment status (columns S to Z).'],
    ['tip', 'Tips', '• Rows with the same Document No are grouped into one email<br>• Locked rows (AL ticked) cannot be proposed again until rejected<br>• If the menu does not appear, run 🛠️ Admin/Help > Initial Setup']
  ]},
  hod: { color: '#27ae60', title: '✅ HOD Guide', blocks: [
    ['workflow', 'Your role', 'You give the level 1 decision for PICs whose HOD is your account (from PIC_MAPPING).'],
    ['step', 'HOD Menu > Review & Submit', 'Shows only items "Proposed" and waiting for your decision. For each row choose <b>Approved / Rejected</b>, add a comment and adjust the <b>Approval Amount</b> if needed. Statistics update as you filter and select.'],
    ['trigger', 'Approve', '• AH = "Approved", AI = comment, AJ = approval amount<br>• One email to the Director (CC PIC and you) to request final approval'],
    ['trigger', 'Reject (comment required)', '• AH = "Rejected", AI = comment, AD cleared, AL unticked<br>• Email to PIC (CC you); the PIC can fix and re-propose'],
    ['tip', 'Tips', '• You can partially approve (Approval Amount lower than estimate)<br>• Be specific in rejection comments to avoid back-and-forth']
  ]},
  director: { color: '#9b59b6', title: '👑 Director Guide', blocks: [
    ['workflow', 'Your role', 'You give the final (level 2) approval for items already approved by HOD.'],
    ['step', 'Director Menu > Overview & Final Approval', 'Default filter shows "Not yet" items. Choose Approved / Rejected per row (comment required to reject) and click Confirm Updates. Rows whose decision did not change are skipped, so no duplicate email is sent.'],
    ['trigger', 'Approve', '• AK = "Approved"<br>• Drive folder created (or reused) under the PIC\'s parent folder, link written to column R (always, even if email is turned off)<br>• Email to PIC + HOD, CC Accounting, with the folder link'],
    ['trigger', 'Reject', '• AK = your comment, AH and AD cleared, AL unticked<br>• Email to PIC + HOD; the item goes through HOD again after re-proposal'],
    ['tip', 'Note', 'Your own proposals (PIC "Nguyen Ha") are auto-approved at both levels and sent to Accounting as an expense plan.']
  ]},
  accountant: { color: '#e67e22', title: '💰 Accountant Guide', blocks: [
    ['workflow', 'Your role', 'You verify documents for items approved by both HOD and Director. Accountants can also propose their own expenses (PIC Menu) and see all items in After Purchase Update.'],
    ['step', 'Hard Document Received', 'Set column <b>AA</b> to "Done" or "Not yet" when physical documents arrive.'],
    ['step', 'Document Approval', 'Set column <b>AB</b> to "Confirm" or "Request rev". If the email option is ticked, PICs of "Request rev" items receive a revision request (CC HOD and Accounting) including the folder link.'],
    ['tip', 'Checklist before Confirm', 'Original receipts/invoices · amounts match column AJ · VAT documents · policy compliance']
  ]}
};

function showGuide_(key) {
  const g = GUIDES_[key], st = { workflow: '#eef5ff', step: '#ffffff', trigger: '#f3e5f5', tip: '#fff3cd' };
  const html = '<div style="font-family:\'Segoe UI\',Arial,sans-serif;padding:16px;line-height:1.6;font-size:14px;">' +
    '<h2 style="color:#2c3e50;border-bottom:3px solid ' + g.color + ';padding-bottom:8px;margin-top:0;">' + g.title + '</h2>' +
    g.blocks.map(b => '<div style="background:' + st[b[0]] + ';padding:10px 14px;margin:10px 0;border-left:4px solid ' + g.color + ';border-radius:4px;"><b>' + b[1] + '</b><div style="margin-top:4px;">' + b[2] + '</div></div>').join('') +
    '</div>';
  show_(html, g.title.replace(/^\S+\s/, ''), 900, 680);
}

function showHelp() {
  const r = getRoles_(), yn = v => v ? '✅ Yes' : '❌ No';
  const html = '<div style="font-family:\'Segoe UI\',Arial,sans-serif;padding:16px;line-height:1.6;font-size:14px;">' +
    '<h2 style="color:#1e3a8a;border-bottom:3px solid #3b82f6;padding-bottom:8px;margin-top:0;">EXPENSE APPROVAL SYSTEM v7.0 Lite</h2>' +
    '<div style="background:#e3f2fd;padding:12px 16px;border-left:5px solid #2196f3;border-radius:6px;"><b>Workflow</b><ol style="margin:6px 0 0;">' +
    '<li><b>PIC</b> enters rows and proposes (PIC Menu > Expense Proposal)</li><li><b>HOD</b> approves or rejects (level 1)</li>' +
    '<li><b>Director</b> gives final approval (level 2); a Drive folder is created per Document No</li>' +
    '<li><b>PIC</b> records actual purchase data (After Purchase Update)</li><li><b>Accountant</b> confirms documents</li></ol>' +
    'Rejected items unlock automatically and can be re-proposed from the same proposal dialog.</div>' +
    '<div style="background:#f3e5f5;padding:12px 16px;border-left:5px solid #9c27b0;border-radius:6px;margin-top:12px;"><b>Your account</b><br>' +
    'Signed in as: ' + esc_(r.user || '(not detected, run Initial Setup)') + '<br>PIC: ' + yn(r.isPIC) + (r.picName ? ' (' + esc_(r.picName) + ')' : '') +
    ' · HOD: ' + yn(r.isHOD) + ' · Director: ' + yn(r.isDirector) + ' · Accountant: ' + yn(r.isAccountant) + '</div>' +
    '<div style="background:#fff3e0;padding:12px 16px;border-left:5px solid #ff9800;border-radius:6px;margin-top:12px;"><b>Email rule</b><br>' +
    'Recipients are resolved automatically from the PIC name in column D (PIC_MAPPING in the script). Columns AE/AF/AG are optional and are filled in automatically when empty. ' +
    'To add or change a person, update PIC_MAPPING and add the same name to the column D dropdown.</div></div>';
  show_(html, 'Help Guide', 900, 600);
}

function showMyPermissions() {
  const r = getRoles_(), yn = v => v ? '✅' : '❌';
  let quota = '?';
  try { quota = MailApp.getRemainingDailyQuota(); } catch (e) {}
  const hodFor = r.user ? hodOf_(r.user) : [];
  alert_('My Permissions',
    'Signed in as: ' + (r.user || '(not detected)') + '\n\n' +
    yn(r.isPIC) + ' PIC' + (r.picName ? ' (' + r.picName + ')' : r.isAccountant ? ' (as Accountant)' : '') + '\n' +
    yn(r.isHOD) + ' HOD' + (hodFor.length ? ' of: ' + hodFor.join(', ') : '') + '\n' +
    yn(r.isDirector) + ' Director\n' + yn(r.isAccountant) + ' Accountant\n\n' +
    'Email quota remaining today: ' + quota +
    (r.user ? '' : '\n\nRun 🛠️ Admin/Help > Initial Setup to authorize the script.'));
}

function initialSetup() {
  try { MailApp.getRemainingDailyQuota(); } catch (e) {}
  try { DriveApp.getRootFolder(); } catch (e) {}
  onOpen();
  showMyPermissions();
}
