/**
 * MMH TENDER INTELLIGENCE — APPS SCRIPT BACKEND v3.6
 *
 * MỚI v3.6 (so với v3.4/3.5):
 *  - Email gửi TỪ địa chỉ mmh.product@manimedicalhanoi.com
 *    → backend PHẢI được deploy bằng chính account mmh.product@ (Execute as: Me),
 *      hoặc địa chỉ đó được thêm làm alias "Send mail as" đã verify trong account deploy.
 *  - pingEmail() và sendReportEmail() nhận tham số from / fromName từ frontend:
 *      · fromName  → tên hiển thị người gửi (luôn áp dụng được)
 *      · from      → địa chỉ gửi (chỉ áp dụng khi là chính account deploy hoặc alias đã verify;
 *                    nếu Gmail từ chối alias, tự fallback gửi bằng account deploy + ghi log)
 *  - Mọi trigger (instant/weekly) cũng gửi từ EMAIL_FROM mặc định.
 *
 * SETUP 1 LẦN:
 *  1. ĐĂNG NHẬP Google bằng tài khoản mmh.product@manimedicalhanoi.com
 *  2. Paste file này vào Apps Script editor của account đó
 *  3. Run health() → Approve scopes (Gmail, Sheets, Triggers, Drive)
 *  4. (Tùy chọn) Nếu muốn gửi dưới alias khác: Gmail → Settings → Accounts →
 *     "Send mail as" → thêm & verify địa chỉ, rồi đặt EMAIL_FROM bên dưới.
 *  5. Run pingEmail('email-test@gmail.com') → kiểm tra inbox, xác nhận "From" đúng
 *  6. Run installTriggers()
 *  7. Deploy → Manage deployments → Edit → New version → Deploy
 *     (Execute as: Me [mmh.product@]; Who has access: Anyone)
 */

const CFG = {
  TENDER_SHEET_ID: '1KdaCm3DZbOMvRwtZW-nGiRrpkaEhywg69MKCrTs80Nk',
  MMH_ACCOUNT_1_ID: '1aO1tcaBY8i0SYX62jGa-vZZlQDWz4rMXVOiacfnkx0g',
  MMH_ACCOUNT_1_GID: '337471250',
  MMH_ACCOUNT_2_ID: '1RRvkkw26ePT7aHduwvSVNd7Zo54HKUexpZHMLQevHr4',
  MMH_ACCOUNT_2_GID: '853010724',
  EMAIL_FROM_NAME: 'MMH Product Team',
  // Địa chỉ người gửi mong muốn. Chỉ có hiệu lực nếu = account deploy hoặc alias đã verify.
  EMAIL_FROM: 'mmh.product@manimedicalhanoi.com',
  WISHLIST_SHEET_NAME: 'WISHLIST_REGISTRY',
  WISHLIST_STATE_SHEET_NAME: 'WISHLIST_STATE'
};

const KQDT_GID = '140997193';
const TBMT_GID = '1966248633';
const KHMT_GID = '719639388';

/* ============================================================
   ENTRY POINTS
   ============================================================ */
function doGet(e) {
  // ⭐ 17/11/2026 — app Theo dõi gói thầu + bot tải hồ sơ (MMH_Watch.gs): action w… / bot…
  const _wt = wtRoute_(e, false); if (_wt) return _wt;
  try {
    const action = (e && e.parameter && e.parameter.action) || 'health';
    if (action === 'health') return _json({ ok: true, ts: new Date().toISOString(), version: '3.6', emailFrom: CFG.EMAIL_FROM, features: ['no-domain-whitelist', 'wishlist-registry', 'instant-trigger', 'weekly-digest', 'full-schema-export', 'ping-email', 'mailapp-fallback', 'multi-recipients', 'custom-from-identity'] });
    if (action === 'fetchSheet') return _json({ values: fetchSheetValues(e.parameter.gid) });
    if (action === 'fetchMMHAccounts') return _json({ accounts: fetchMMHAccounts() });
    if (action === 'loadWishlist') return _json({ wishlist: loadWishlistFor(e.parameter.user) });
    if (action === 'pingEmail') return _json(pingEmail(e.parameter.to, e.parameter.from, e.parameter.fromName));
    return _json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return _json({ error: String(err.message || err), stack: String(err.stack || '') });
  }
}
function doPost(e) {
  const _wt = wtRoute_(e, true); if (_wt) return _wt;
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    if (action === 'confirmMMH') return _json(confirmMMH(body));
    if (action === 'sendReport' || action === 'sendDashboard') return _json(sendReportEmail(body));
    if (action === 'saveWishlist') return _json(saveWishlistFor(body));
    if (action === 'pingEmail') return _json(pingEmail(body.to, body.from, body.fromName));
    return _json({ error: 'Unknown action: ' + action });
  } catch (err) {
    return _json({ error: String(err.message || err), stack: String(err.stack || '') });
  }
}
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   EMAIL IDENTITY HELPERS (v3.6)
   ============================================================ */
// Trả về địa chỉ "from" hợp lệ để dùng với GmailApp option.
// GmailApp chỉ chấp nhận from = account đang chạy HOẶC alias đã được "Send mail as" verify.
// Nếu địa chỉ yêu cầu không nằm trong danh sách alias → trả null (gửi bằng địa chỉ mặc định account).
function _resolveFromAlias(requestedFrom) {
  const want = String(requestedFrom || CFG.EMAIL_FROM || '').trim().toLowerCase();
  if (!want) return null;
  try {
    const me = Session.getEffectiveUser().getEmail().toLowerCase();
    if (want === me) return want; // chính account deploy
  } catch (e) {}
  try {
    const aliases = GmailApp.getAliases() || [];
    for (const a of aliases) { if (String(a).toLowerCase() === want) return want; }
  } catch (e) {}
  return null; // không phải alias hợp lệ → để Gmail dùng địa chỉ mặc định
}
// Build option object cho GmailApp.sendEmail, kèm from nếu hợp lệ.
function _mailOptions(base, requestedFrom, requestedFromName) {
  const opts = Object.assign({}, base);
  opts.name = requestedFromName || CFG.EMAIL_FROM_NAME;
  const alias = _resolveFromAlias(requestedFrom);
  if (alias) opts.from = alias;
  return opts;
}

/* ============================================================
   FETCH SHEETS
   ============================================================ */
function fetchSheetValues(gid) {
  const ss = SpreadsheetApp.openById(CFG.TENDER_SHEET_ID);
  const sheet = _getSheetByGid(ss, gid);
  if (!sheet) throw new Error('Không tìm thấy sheet với gid=' + gid);
  return sheet.getDataRange().getDisplayValues();
}
function fetchMMHAccounts() {
  const accounts = [];
  try {
    const ss1 = SpreadsheetApp.openById(CFG.MMH_ACCOUNT_1_ID);
    const sheet1 = _getSheetByGid(ss1, CFG.MMH_ACCOUNT_1_GID);
    if (sheet1) {
      sheet1.getDataRange().getDisplayValues().forEach(row => row.forEach(cell => {
        const s = String(cell || '').trim();
        if (s && s.includes('/')) accounts.push(s);
      }));
    }
  } catch (e) {}
  try {
    const ss2 = SpreadsheetApp.openById(CFG.MMH_ACCOUNT_2_ID);
    const sheet2 = _getSheetByGid(ss2, CFG.MMH_ACCOUNT_2_GID);
    if (sheet2) {
      sheet2.getDataRange().getDisplayValues().forEach(row => row.forEach(cell => {
        const s = String(cell || '').trim();
        if (s && s.includes('/')) accounts.push(s);
      }));
    }
  } catch (e) {}
  return [...new Set(accounts)];
}
function _getSheetByGid(spreadsheet, gid) {
  const target = parseInt(gid, 10);
  for (const s of spreadsheet.getSheets()) if (s.getSheetId() === target) return s;
  return null;
}

/* ============================================================
   CONFIRM MMH MAPPING
   ============================================================ */
function confirmMMH(body) {
  const investor = String(body.investor || '').trim();
  const mmhName = String(body.mmhName || '').trim();
  const tinh = String(body.tinh || '').trim();
  const khuVuc = String(body.khuVuc || '').trim();
  if (!investor || !mmhName) throw new Error('Thiếu investor hoặc mmhName');
  let updated = 0;
  const ss = SpreadsheetApp.openById(CFG.TENDER_SHEET_ID);
  updated += _updateSheet(ss, KQDT_GID, 'BÊN MỜI THẦU', investor, mmhName, tinh, khuVuc);
  updated += _updateSheet(ss, TBMT_GID, 'BÊN MỜI THẦU', investor, mmhName, tinh, khuVuc);
  updated += _updateSheet(ss, KHMT_GID, 'TÊN CHỦ ĐẦU TƯ', investor, mmhName, tinh, khuVuc);
  return { ok: true, updated };
}
function _updateSheet(ss, gid, investorColName, investor, mmhName, tinh, khuVuc) {
  const sheet = _getSheetByGid(ss, gid);
  if (!sheet) return 0;
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return 0;
  let headerRow = -1, colInv = -1, colDiaBan = -1, colTinh = -1, colKhuVuc = -1;
  for (let i = 0; i < Math.min(8, data.length); i++) {
    const row = data[i].map(c => String(c || '').trim().toUpperCase());
    if (row.some(c => c.includes(investorColName.toUpperCase()))) {
      headerRow = i;
      row.forEach((c, idx) => {
        if (c.includes(investorColName.toUpperCase()) && colInv < 0) colInv = idx;
        if (c.includes('ĐỊA BÀN MMH')) colDiaBan = idx;
        if (c.includes('TỈNH THÀNH') || c.includes('TINH THANH')) colTinh = idx;
        if (c.includes('KHU VỰC') || c.includes('KHU VUC')) colKhuVuc = idx;
      });
      break;
    }
  }
  if (headerRow < 0 || colInv < 0) return 0;
  let count = 0;
  for (let i = headerRow + 1; i < data.length; i++) {
    if (String(data[i][colInv] || '').trim() === investor) {
      const rowNum = i + 1;
      if (colDiaBan >= 0) sheet.getRange(rowNum, colDiaBan + 1).setValue(mmhName);
      if (colTinh >= 0 && tinh) sheet.getRange(rowNum, colTinh + 1).setValue(tinh);
      if (colKhuVuc >= 0 && khuVuc) sheet.getRange(rowNum, colKhuVuc + 1).setValue(khuVuc);
      count++;
    }
  }
  return count;
}

/* ============================================================
   WISHLIST REGISTRY
   ============================================================ */
function _getOrCreateRegistrySheet(name) {
  const ss = SpreadsheetApp.openById(CFG.TENDER_SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['email', 'payload_json', 'updated_at']);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  return sheet;
}
function loadWishlistFor(email) {
  if (!email) return null;
  const sheet = _getOrCreateRegistrySheet(CFG.WISHLIST_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim().toLowerCase() === String(email).trim().toLowerCase()) {
      try { return JSON.parse(data[i][1] || '{}'); } catch (e) { return null; }
    }
  }
  return null;
}
function saveWishlistFor(body) {
  const email = String(body.user || '').trim();
  if (!email) throw new Error('Thiếu email user');
  const wishlist = body.wishlist || {};
  const json = JSON.stringify(wishlist);
  const sheet = _getOrCreateRegistrySheet(CFG.WISHLIST_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const ts = new Date().toISOString();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim().toLowerCase() === email.toLowerCase()) {
      sheet.getRange(i + 1, 2).setValue(json);
      sheet.getRange(i + 1, 3).setValue(ts);
      return { ok: true, updated: true };
    }
  }
  sheet.appendRow([email, json, ts]);
  return { ok: true, created: true };
}
function _getAllWishlists() {
  const sheet = _getOrCreateRegistrySheet(CFG.WISHLIST_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    const email = String(data[i][0] || '').trim();
    if (!email) continue;
    try {
      const wishlist = JSON.parse(data[i][1] || '{}');
      result.push({ email, wishlist });
    } catch (e) {}
  }
  return result;
}

/* ============================================================
   PING EMAIL — gửi 1 email test nhỏ, hỗ trợ from / fromName (v3.6)
   ============================================================ */
function pingEmail(to, requestedFrom, requestedFromName) {
  to = String(to || '').trim();
  if (!to) throw new Error('Thiếu địa chỉ email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Email không hợp lệ: ' + to);

  const remaining = MailApp.getRemainingDailyQuota();
  if (remaining <= 0) throw new Error('Hết quota gửi email hôm nay (đã gửi 100 email). Hãy thử lại sau 24h.');

  const fromName = requestedFromName || CFG.EMAIL_FROM_NAME;
  const wantFrom = String(requestedFrom || CFG.EMAIL_FROM || '').trim();
  const aliasFrom = _resolveFromAlias(wantFrom);
  const effectiveFrom = aliasFrom || (function(){ try { return Session.getEffectiveUser().getEmail(); } catch(e){ return wantFrom; } })();

  const subject = '[MMH Tender] Test email — Backend v3.6';
  const html = `<div style="font-family:Arial;color:#0E2F5F">
    <h2 style="color:#3A5CAA">✓ Email backend hoạt động tốt</h2>
    <p>Đây là email test từ MMH Tender Intelligence v3.6 backend.</p>
    <ul>
      <li>Thời gian: ${new Date().toLocaleString('vi-VN')}</li>
      <li>Người gửi (From): ${_esc(effectiveFrom)}${aliasFrom ? '' : ' (địa chỉ mặc định của account deploy)'}</li>
      <li>Quota còn lại hôm nay: ${remaining} email</li>
      <li>Gửi tới: ${_esc(to)}</li>
    </ul>
    ${aliasFrom ? '' : '<p style="font-size:12px;color:#B45309">⚠ Lưu ý: địa chỉ "'+_esc(wantFrom)+'" chưa phải account deploy hoặc alias đã verify, nên email gửi bằng địa chỉ mặc định. Để "From" đúng mmh.product@, hãy deploy backend bằng chính account đó, hoặc thêm alias "Send mail as" đã verify.</p>'}
    <p style="font-size:12px;color:#5B6E8C">Nếu nhận được email này nghĩa là backend đã sẵn sàng gửi báo cáo PDF + Excel.</p>
  </div>`;

  let method = 'GmailApp';
  try {
    GmailApp.sendEmail(to, subject, '', _mailOptions({ htmlBody: html }, wantFrom, fromName));
  } catch (gmailErr) {
    method = 'MailApp (fallback)';
    try {
      MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: fromName });
    } catch (mailErr) {
      throw new Error('Cả GmailApp và MailApp đều fail. GmailApp: ' + gmailErr.message + ' | MailApp: ' + mailErr.message);
    }
  }
  return { ok: true, to: to, from: effectiveFrom, fromAliasApplied: !!aliasFrom, method: method, quotaRemaining: MailApp.getRemainingDailyQuota(), ts: new Date().toISOString() };
}

/* ============================================================
   SEND REPORT EMAIL — PDF + Excel, hỗ trợ from / fromName (v3.6)
   ============================================================ */
function sendReportEmail(body) {
  const to = String(body.to || '').trim();
  if (!to) throw new Error('Thiếu địa chỉ email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Email không hợp lệ: ' + to);

  const remaining = MailApp.getRemainingDailyQuota();
  if (remaining <= 0) throw new Error('Hết quota gửi email hôm nay (100/ngày cho Gmail thường, 1500/ngày cho Workspace). Thử lại sau 24h.');

  const fromName = body.fromName || CFG.EMAIL_FROM_NAME;
  const wantFrom = String(body.from || CFG.EMAIL_FROM || '').trim();
  const aliasFrom = _resolveFromAlias(wantFrom);
  const effectiveFrom = aliasFrom || (function(){ try { return Session.getEffectiveUser().getEmail(); } catch(e){ return wantFrom; } })();

  const subject = body.subject || '[MMH Tender] Báo cáo';
  const kind = body.kind || 'report';
  const dateStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const attachments = [];
  let totalAttachSize = 0;
  if (body.pdfBase64) {
    const pdfBytes = Utilities.base64Decode(body.pdfBase64);
    totalAttachSize += pdfBytes.length;
    attachments.push(Utilities.newBlob(pdfBytes, 'application/pdf', `MMH_${kind}_${dateStr}.pdf`));
  }
  if (body.xlsxBase64) {
    const xlsxBytes = Utilities.base64Decode(body.xlsxBase64);
    totalAttachSize += xlsxBytes.length;
    attachments.push(Utilities.newBlob(xlsxBytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `MMH_${kind}_${dateStr}.xlsx`));
  }
  if (!attachments.length) throw new Error('Phải có ít nhất 1 file đính kèm (PDF hoặc Excel)');
  if (totalAttachSize > 24 * 1024 * 1024) {
    throw new Error('File đính kèm quá lớn: ' + Math.round(totalAttachSize/1024/1024) + 'MB (giới hạn 25MB). Hãy lọc bớt data trước khi gửi.');
  }

  const summary = body.summary || {};
  const filters = body.filters || {};
  const summaryRows = Object.entries(summary).map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #DDE5F2"><strong>${_esc(k.toUpperCase())}</strong></td><td style="padding:6px 12px;border:1px solid #DDE5F2">${_esc(v)}</td></tr>`).join('');
  const filterRows = Object.entries(filters).filter(([k, v]) => v && v !== 'all' && (!Array.isArray(v) || v.length)).map(([k, v]) => `<tr><td style="padding:6px 12px;border:1px solid #DDE5F2"><strong>${_esc(k)}</strong></td><td style="padding:6px 12px;border:1px solid #DDE5F2">${_esc(Array.isArray(v) ? v.join(', ') : v)}</td></tr>`).join('');
  const kindLabel = { search: 'Báo cáo lọc', dashboard: 'Báo cáo Dashboard', watchlist: 'Báo cáo Wishlist', drill: 'Báo cáo chi tiết', wishlist_instant: 'Wishlist - Phát hiện gói mới', wishlist_weekly: 'Wishlist Digest tuần', report: 'Báo cáo' }[kind] || 'Báo cáo';

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0E2F5F">
  <div style="background:linear-gradient(135deg,#0E2F5F,#3A5CAA);color:white;padding:24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:20px">${_esc(kindLabel)}</h2>
    <div style="font-size:13px;margin-top:6px;opacity:0.9">MMH Tender Intelligence · ${new Date().toLocaleString('vi-VN')}</div>
  </div>
  <div style="padding:20px;background:#F0F7FF;border:1px solid #DDE5F2;border-top:none;border-radius:0 0 8px 8px">
    <p style="font-size:14px;margin:0 0 12px">Xin chào,</p>
    <p style="font-size:14px;margin:0 0 16px">Đính kèm là báo cáo MMH Tender Intelligence với đầy đủ thông tin gói thầu (ngày phê duyệt, chủ đầu tư, tên gói, giá trúng, nhà thầu, số TBMT, v.v.). File <strong>PDF</strong> tiện xem nhanh, file <strong>Excel</strong> để phân tích sâu.</p>
    ${summaryRows ? `<h3 style="font-size:14px;color:#3A5CAA;margin:18px 0 8px">Tóm tắt</h3><table style="border-collapse:collapse;width:100%;font-size:13px">${summaryRows}</table>` : ''}
    ${filterRows ? `<h3 style="font-size:14px;color:#3A5CAA;margin:18px 0 8px">Bộ lọc</h3><table style="border-collapse:collapse;width:100%;font-size:13px">${filterRows}</table>` : ''}
    <p style="font-size:12px;color:#5B6E8C;margin:20px 0 0;padding-top:14px;border-top:3px solid #FFE100">Email tự động từ MMH Tender Intelligence · Người gửi: ${_esc(effectiveFrom)}.</p>
  </div>
</div>
  `.trim();

  let method = 'GmailApp';
  try {
    GmailApp.sendEmail(to, subject, '', _mailOptions({ htmlBody: htmlBody, attachments: attachments }, wantFrom, fromName));
  } catch (gmailErr) {
    method = 'MailApp (fallback)';
    try {
      MailApp.sendEmail({ to: to, subject: subject, htmlBody: htmlBody, attachments: attachments, name: fromName });
    } catch (mailErr) {
      throw new Error('GmailApp lỗi: ' + gmailErr.message + ' | MailApp lỗi: ' + mailErr.message + ' | Quota còn: ' + MailApp.getRemainingDailyQuota() + ' | Size đính kèm: ' + Math.round(totalAttachSize/1024) + 'KB');
    }
  }
  return { ok: true, to: to, from: effectiveFrom, fromAliasApplied: !!aliasFrom, method: method, attachments: attachments.length, attachSizeKB: Math.round(totalAttachSize/1024), quotaRemaining: MailApp.getRemainingDailyQuota(), ts: new Date().toISOString() };
}
function _esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

/* ============================================================
   TRIGGER INSTALLATION
   ============================================================ */
function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('triggerInstantWishlist').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('triggerWeeklyDigest').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8).create();
  Logger.log('✓ Triggers installed: triggerInstantWishlist (30min) + triggerWeeklyDigest (Fri 8AM)');
  return 'OK';
}
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'triggerInstantWishlist' || fn === 'triggerWeeklyDigest') ScriptApp.deleteTrigger(t);
  });
  Logger.log('✓ Removed wishlist triggers');
}

/* ============================================================
   HELPERS FOR WISHLIST MATCHING (server-side)
   ============================================================ */
function _normalizeInvestor(name) {
  if (!name) return '';
  let s = String(name).trim();
  s = s.replace(/^\s*(chủ\s*đầu\s*tư|chu\s*dau\s*tu|bên\s*mời\s*thầu|ben\s*moi\s*thau|cđt|cdt|bmt)\s*[:：\-–—]\s*/i, '');
  return s.replace(/\s+/g, ' ').trim();
}
function _normalizeKey(name) {
  return _normalizeInvestor(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}
function _extractTBMTNo(goiText) {
  if (!goiText) return '';
  const m = String(goiText).match(/[Ss][ốốoo]\s*[Tt]h[ôô]ng\s*b[áaảa]o\s*[:：]?\s*([A-Za-z0-9\-\.\s]+?)(?=\s*[\.\(]|$)/);
  if (m && m[1]) return m[1].trim().replace(/\s+/g, ' ');
  const m2 = String(goiText).match(/\b(IB\d{6,12}\s*-\s*\d{1,4})\b/i);
  return m2 ? m2[1].replace(/\s+/g, '') : '';
}
function _extractDate(value, mode) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  const s = String(value);
  const re = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  const matches = [];
  let m; while ((m = re.exec(s)) !== null) matches.push(m);
  if (!matches.length) return null;
  const x = mode === 'end' ? matches[matches.length - 1] : matches[0];
  const day = +x[1], month = +x[2], year = +x[3];
  if (year < 2000 || year > 2100) return null;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
}
function _parseSheet(rows, type) {
  const headers = type === 'kqdt' ? ['BÊN MỜI THẦU', 'TÊN GÓI THẦU'] : type === 'tbmt' ? ['BÊN MỜI THẦU', 'GÓI THẦU'] : ['TÊN CHỦ ĐẦU TƯ', 'TÊN GÓI THẦU'];
  let headerRow = -1, hmap = {};
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = (rows[i] || []).map(c => String(c || '').trim().toUpperCase());
    if (headers.every(h => r.some(c => c.includes(h)))) {
      headerRow = i;
      r.forEach((cell, idx) => { if (cell) hmap[cell] = idx; });
      break;
    }
  }
  if (headerRow < 0) return [];
  function findCol(keys) {
    for (const k of keys) {
      const up = k.toUpperCase();
      for (const hk of Object.keys(hmap)) if (hk.includes(up)) return hmap[hk];
    }
    return -1;
  }
  const fields = type === 'kqdt' ? {
    benMoiThau: ['BÊN MỜI THẦU'], tenDuAn: ['TÊN DỰ ÁN'], tenGoi: ['TÊN GÓI THẦU'],
    soThongBao: ['SỐ THÔNG BÁO'], hinhThuc: ['HÌNH THỨC LỰA CHỌN'],
    giaGoi: ['GIÁ GÓI THẦU'], giaTrung: ['GIÁ TRÚNG THẦU'],
    nhaTrung: ['NHÀ THẦU TRÚNG'], ngayPD: ['NGÀY PHÊ DUYỆT'],
    diaBan: ['ĐỊA BÀN MMH'], tinh: ['TỈNH THÀNH'], khuVuc: ['KHU VỰC']
  } : type === 'tbmt' ? {
    benMoiThau: ['BÊN MỜI THẦU'], goiThau: ['GÓI THẦU'], duAn: ['DỰ ÁN'],
    nguonVon: ['NGUỒN VỐN'], giaGoi: ['GIÁ GÓI THẦU'], hinhThuc: ['HÌNH THỨC LỰA CHỌN'],
    tgPhatHanh: ['THỜI GIAN PHÁT HÀNH HSMT'], tgMoThau: ['THỜI GIAN MỞ THẦU'],
    tgThucHien: ['THỜI GIAN THỰC HIỆN HỢP ĐỒNG'],
    diaBan: ['ĐỊA BÀN MMH'], tinh: ['TỈNH THÀNH'], khuVuc: ['KHU VỰC']
  } : {
    chuDauTu: ['TÊN CHỦ ĐẦU TƯ', 'CHỦ ĐẦU TƯ'], soKH: ['SỐ KẾ HOẠCH'],
    tenDuAn: ['TÊN DỰ ÁN'], noiDungPD: ['NỘI DUNG PHÊ DUYỆT'],
    tenGoi: ['TÊN GÓI THẦU'], nguonVon: ['NGUỒN VỐN'],
    giaGoi: ['GIÁ GÓI THẦU'], hinhThuc: ['HÌNH THỨC LỰA CHỌN'],
    hinhThucHD: ['HÌNH THỨC HỢP ĐỒNG'],
    tgLuaChon: ['THỜI GIAN LỰA CHỌN'], tgThucHien: ['THỜI GIAN THỰC HIỆN'],
    diaBan: ['ĐỊA BÀN MMH'], tinh: ['TỈNH THÀNH'], khuVuc: ['KHU VỰC']
  };
  const colIdx = {};
  Object.keys(fields).forEach(f => colIdx[f] = findCol(fields[f]));
  const out = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const obj = { _row: i + 1 };
    Object.keys(fields).forEach(f => obj[f] = colIdx[f] >= 0 ? rows[i][colIdx[f]] : '');
    if (type === 'tbmt') obj._tbmtNo = _extractTBMTNo(obj.goiThau);
    const investor = type === 'khmt' ? obj.chuDauTu : obj.benMoiThau;
    if (!investor) continue;
    obj._invKey = _normalizeKey(investor);
    out.push(obj);
  }
  return out;
}
function _findMatches(allRows, type, wishlist) {
  const inv = wishlist.investors || [];
  const kw = wishlist.keywords || [];
  return allRows.filter(r => {
    const goiName = type === 'tbmt' ? String(r.goiThau || '') : String(r.tenGoi || '');
    const folGoi = goiName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    let invMatch = !inv.length;
    if (!invMatch) {
      for (const w of inv) {
        if (w[type] === false) continue;
        if (_normalizeKey(w.name) === r._invKey) { invMatch = true; break; }
      }
    }
    if (!invMatch) return false;
    let kwMatch = !kw.length;
    if (!kwMatch) {
      for (const k of kw) {
        if (k[type] === false) continue;
        const folKw = String(k.text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        if (folGoi.indexOf(folKw) >= 0) { kwMatch = true; break; }
      }
    }
    return kwMatch && (inv.length || kw.length);
  });
}
function _loadAllTenderData() {
  const ss = SpreadsheetApp.openById(CFG.TENDER_SHEET_ID);
  const kqdtSheet = _getSheetByGid(ss, KQDT_GID);
  const tbmtSheet = _getSheetByGid(ss, TBMT_GID);
  const khmtSheet = _getSheetByGid(ss, KHMT_GID);
  return {
    kqdt: kqdtSheet ? _parseSheet(kqdtSheet.getDataRange().getDisplayValues(), 'kqdt') : [],
    tbmt: tbmtSheet ? _parseSheet(tbmtSheet.getDataRange().getDisplayValues(), 'tbmt') : [],
    khmt: khmtSheet ? _parseSheet(khmtSheet.getDataRange().getDisplayValues(), 'khmt') : []
  };
}

/* ============================================================
   BUILD PDF + EXCEL FOR WISHLIST EMAIL (server-side)
   ============================================================ */
function _buildWishlistExcel(matches) {
  const ss = SpreadsheetApp.openById(CFG.TENDER_SHEET_ID);
  const tempName = '_TEMP_EXPORT_' + Math.floor(Math.random() * 1e9);
  let tempSheet;
  try {
    tempSheet = ss.insertSheet(tempName);
    tempSheet.hideSheet();
    let row = 1;
    const kqdtMatches = matches.filter(m => m.type === 'kqdt');
    if (kqdtMatches.length) {
      tempSheet.getRange(row, 1).setValue('KQDT (' + kqdtMatches.length + ')').setFontWeight('bold').setBackground('#3A5CAA').setFontColor('#FFFFFF'); row++;
      const headers = ['Ngày PD', 'Số thông báo', 'Bên mời thầu', 'Tên dự án', 'Tên gói thầu', 'Hình thức', 'Giá gói', 'Giá trúng', 'Nhà trúng', 'Tỉnh', 'Khu vực', 'Địa bàn MMH', 'Khớp bởi'];
      tempSheet.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#CFE2F3'); row++;
      const data = kqdtMatches.map(m => [String(m.row.ngayPD || ''), String(m.row.soThongBao || ''), String(m.row.benMoiThau || ''), String(m.row.tenDuAn || ''), String(m.row.tenGoi || ''), String(m.row.hinhThuc || ''), m.row.giaGoi || 0, m.row.giaTrung || 0, String(m.row.nhaTrung || ''), String(m.row.tinh || ''), String(m.row.khuVuc || ''), String(m.row.diaBan || ''), m.matchedBy || '']);
      if (data.length) tempSheet.getRange(row, 1, data.length, headers.length).setValues(data); row += data.length + 2;
    }
    const khmtMatches = matches.filter(m => m.type === 'khmt');
    if (khmtMatches.length) {
      tempSheet.getRange(row, 1).setValue('KHMT (' + khmtMatches.length + ')').setFontWeight('bold').setBackground('#0E2F5F').setFontColor('#FFFFFF'); row++;
      const headers = ['Số KH', 'Nội dung phê duyệt', 'Tên dự án', 'Chủ đầu tư', 'Tên gói thầu', 'Nguồn vốn', 'Giá gói', 'HT lựa chọn', 'HT hợp đồng', 'TG lựa chọn', 'TG thực hiện', 'Tỉnh', 'Địa bàn MMH', 'Khớp bởi'];
      tempSheet.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#CFE2F3'); row++;
      const data = khmtMatches.map(m => [String(m.row.soKH || ''), String(m.row.noiDungPD || ''), String(m.row.tenDuAn || ''), String(m.row.chuDauTu || ''), String(m.row.tenGoi || ''), String(m.row.nguonVon || ''), m.row.giaGoi || 0, String(m.row.hinhThuc || ''), String(m.row.hinhThucHD || ''), String(m.row.tgLuaChon || ''), String(m.row.tgThucHien || ''), String(m.row.tinh || ''), String(m.row.diaBan || ''), m.matchedBy || '']);
      if (data.length) tempSheet.getRange(row, 1, data.length, headers.length).setValues(data); row += data.length + 2;
    }
    const tbmtMatches = matches.filter(m => m.type === 'tbmt');
    if (tbmtMatches.length) {
      tempSheet.getRange(row, 1).setValue('TBMT (' + tbmtMatches.length + ')').setFontWeight('bold').setBackground('#D4BD00').setFontColor('#0E2F5F'); row++;
      const headers = ['TG phát hành', 'Số TBMT', 'Bên mời thầu', 'Dự án', 'Gói thầu', 'Nguồn vốn', 'Giá gói', 'HT lựa chọn', 'TG mở thầu', 'TG thực hiện', 'Tỉnh', 'Địa bàn MMH', 'Khớp bởi'];
      tempSheet.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#CFE2F3'); row++;
      const data = tbmtMatches.map(m => [String(m.row.tgPhatHanh || ''), String(m.row._tbmtNo || ''), String(m.row.benMoiThau || ''), String(m.row.duAn || ''), String(m.row.goiThau || ''), String(m.row.nguonVon || ''), m.row.giaGoi || 0, String(m.row.hinhThuc || ''), String(m.row.tgMoThau || ''), String(m.row.tgThucHien || ''), String(m.row.tinh || ''), String(m.row.diaBan || ''), m.matchedBy || '']);
      if (data.length) tempSheet.getRange(row, 1, data.length, headers.length).setValues(data);
    }
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + CFG.TENDER_SHEET_ID + '/export?format=xlsx&gid=' + tempSheet.getSheetId();
    const blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
    return Utilities.base64Encode(blob.getBytes());
  } finally {
    if (tempSheet) ss.deleteSheet(tempSheet);
  }
}
function _buildWishlistPDF(email, matches, mode) {
  const kqdtMatches = matches.filter(m => m.type === 'kqdt');
  const khmtMatches = matches.filter(m => m.type === 'khmt');
  const tbmtMatches = matches.filter(m => m.type === 'tbmt');
  const modeLabel = mode === 'instant' ? 'Phát hiện gói mới' : 'Digest tuần';
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{font-family:'Aptos',Arial,sans-serif;color:#0E2F5F;font-size:11px;padding:20px}
    h1{font-size:20px;color:#3A5CAA;margin-bottom:6px}
    h2{font-size:14px;color:#3A5CAA;margin:16px 0 6px;border-bottom:2px solid #3A5CAA;padding-bottom:3px}
    .meta{color:#5B6E8C;font-size:10px;margin-bottom:12px}
    .filter-box{background:#F0F7FF;border:1px solid #DDE5F2;border-left:3px solid #3A5CAA;padding:8px 12px;margin:10px 0;font-size:10.5px}
    table{width:100%;border-collapse:collapse;font-size:9px;margin-top:4px}
    th{background:#3A5CAA;color:white;padding:5px 6px;text-align:left}
    td{padding:4px 6px;border-bottom:1px solid #DDE5F2}
    tr:nth-child(even){background:#F0F7FF}
    .footer{margin-top:24px;padding-top:8px;border-top:3px solid #FFE100;font-size:9px;color:#94A3B8;text-align:center}
  </style></head><body>`;
  html += `<h1>MMH Tender — Wishlist ${_esc(modeLabel)}</h1>`;
  html += `<div class="meta">Gửi tới: ${_esc(email)} · Thời gian: ${new Date().toLocaleString('vi-VN')}</div>`;
  html += `<div class="filter-box"><strong>Tổng:</strong> ${matches.length} gói khớp wishlist (${kqdtMatches.length} KQDT · ${khmtMatches.length} KHMT · ${tbmtMatches.length} TBMT)</div>`;
  if (kqdtMatches.length) {
    html += `<h2>KQDT (${kqdtMatches.length} gói)</h2><table><thead><tr><th>Ngày PD</th><th>Số TB</th><th>Bên mời thầu</th><th>Tên gói</th><th>Giá gói</th><th>Giá trúng</th><th>Nhà trúng</th><th>Khớp bởi</th></tr></thead><tbody>`;
    kqdtMatches.slice(0, 100).forEach(m => { const r = m.row; html += `<tr><td>${_esc(r.ngayPD)}</td><td>${_esc(r.soThongBao)}</td><td>${_esc(r.benMoiThau)}</td><td>${_esc(r.tenGoi)}</td><td>${_fmtVND(r.giaGoi)}</td><td>${_fmtVND(r.giaTrung)}</td><td>${_esc(r.nhaTrung)}</td><td>${_esc(m.matchedBy)}</td></tr>`; });
    html += `</tbody></table>`;
  }
  if (khmtMatches.length) {
    html += `<h2>KHMT (${khmtMatches.length} gói)</h2><table><thead><tr><th>Số KH</th><th>Chủ đầu tư</th><th>Tên gói</th><th>Giá gói</th><th>HT lựa chọn</th><th>TG thực hiện</th><th>Khớp bởi</th></tr></thead><tbody>`;
    khmtMatches.slice(0, 100).forEach(m => { const r = m.row; html += `<tr><td>${_esc(r.soKH)}</td><td>${_esc(r.chuDauTu)}</td><td>${_esc(r.tenGoi)}</td><td>${_fmtVND(r.giaGoi)}</td><td>${_esc(r.hinhThuc)}</td><td>${_esc(r.tgThucHien)}</td><td>${_esc(m.matchedBy)}</td></tr>`; });
    html += `</tbody></table>`;
  }
  if (tbmtMatches.length) {
    html += `<h2>TBMT (${tbmtMatches.length} gói)</h2><table><thead><tr><th>TG phát hành</th><th>Số TBMT</th><th>Bên mời</th><th>Gói thầu</th><th>Giá gói</th><th>TG mở thầu</th><th>Khớp bởi</th></tr></thead><tbody>`;
    tbmtMatches.slice(0, 100).forEach(m => { const r = m.row; html += `<tr><td>${_esc(r.tgPhatHanh)}</td><td>${_esc(r._tbmtNo)}</td><td>${_esc(r.benMoiThau)}</td><td>${_esc(r.goiThau)}</td><td>${_fmtVND(r.giaGoi)}</td><td>${_esc(r.tgMoThau)}</td><td>${_esc(m.matchedBy)}</td></tr>`; });
    html += `</tbody></table>`;
  }
  html += `<div class="footer">MMH Tender Intelligence v3.6 · ${new Date().toLocaleString('vi-VN')}</div></body></html>`;
  const blob = Utilities.newBlob(html, 'text/html', 'wishlist.html').getAs('application/pdf');
  return Utilities.base64Encode(blob.getBytes());
}
function _fmtVND(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' k';
  return Number(n).toLocaleString('vi-VN');
}

/* ============================================================
   INSTANT WISHLIST TRIGGER (every 30 min)
   ============================================================ */
function triggerInstantWishlist() {
  const wishlists = _getAllWishlists();
  if (!wishlists.length) return;
  const stateSheet = _getOrCreateRegistrySheet(CFG.WISHLIST_STATE_SHEET_NAME);
  const stateData = stateSheet.getDataRange().getValues();
  const stateMap = {};
  for (let i = 1; i < stateData.length; i++) {
    if (stateData[i][0]) stateMap[String(stateData[i][0]).toLowerCase()] = { row: i + 1, seenIds: String(stateData[i][1] || '') };
  }
  const allData = _loadAllTenderData();
  wishlists.forEach(item => {
    const email = item.email;
    const wishlist = item.wishlist;
    const notify = wishlist.notify || {};
    if (!notify.instantEmail) return;
    if (!(wishlist.investors || []).length && !(wishlist.keywords || []).length) return;
    const matches = [].concat(
      _findMatches(allData.kqdt, 'kqdt', wishlist).map(r => ({ type: 'kqdt', row: r, id: 'k:' + (r.soThongBao || r._row), matchedBy: _matchLabel(r, 'kqdt', wishlist) })),
      _findMatches(allData.tbmt, 'tbmt', wishlist).map(r => ({ type: 'tbmt', row: r, id: 't:' + (r._tbmtNo || r._row), matchedBy: _matchLabel(r, 'tbmt', wishlist) })),
      _findMatches(allData.khmt, 'khmt', wishlist).map(r => ({ type: 'khmt', row: r, id: 'h:' + (r.soKH || r._row), matchedBy: _matchLabel(r, 'khmt', wishlist) }))
    );
    const seenStr = (stateMap[email.toLowerCase()] || {}).seenIds || '';
    const seenIds = seenStr ? seenStr.split('|').filter(Boolean) : [];
    const seenSet = new Set(seenIds);
    const newMatches = matches.filter(m => !seenSet.has(m.id));
    const allIds = matches.map(m => m.id).slice(-5000);
    const newSeenStr = allIds.join('|');
    if (stateMap[email.toLowerCase()]) {
      stateSheet.getRange(stateMap[email.toLowerCase()].row, 2).setValue(newSeenStr);
      stateSheet.getRange(stateMap[email.toLowerCase()].row, 3).setValue(new Date().toISOString());
    } else {
      stateSheet.appendRow([email, newSeenStr, new Date().toISOString()]);
    }
    if (!seenStr) { Logger.log('Instant first-run for ' + email + ': ' + matches.length + ' baseline'); return; }
    if (!newMatches.length) return;
    Logger.log('Instant: ' + email + ' has ' + newMatches.length + ' new matches');
    const recipients = [];
    if (Array.isArray(wishlist.recipients) && wishlist.recipients.length) {
      wishlist.recipients.forEach(r => { if (r && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)) recipients.push(r); });
    }
    if (!recipients.length) recipients.push(email);
    try {
      const pdfBase64 = _buildWishlistPDF(email, newMatches, 'instant');
      const xlsxBase64 = _buildWishlistExcel(newMatches);
      const summary = { 'Gói mới phát hiện': newMatches.length, KQDT: newMatches.filter(m => m.type === 'kqdt').length, KHMT: newMatches.filter(m => m.type === 'khmt').length, TBMT: newMatches.filter(m => m.type === 'tbmt').length };
      recipients.forEach(rcp => {
        try {
          sendReportEmail({ to: rcp, from: CFG.EMAIL_FROM, fromName: CFG.EMAIL_FROM_NAME, subject: `[MMH Wishlist] ${newMatches.length} gói mới khớp wishlist`, kind: 'wishlist_instant', pdfBase64, xlsxBase64, summary });
          Logger.log('Instant sent to ' + rcp);
        } catch (e) { Logger.log('Instant email error for ' + rcp + ': ' + e.message); }
      });
    } catch (err) { Logger.log('Instant build error for ' + email + ': ' + err.message); }
  });
}

/* ============================================================
   WEEKLY DIGEST TRIGGER (Friday 8 AM)
   ============================================================ */
function triggerWeeklyDigest() {
  const wishlists = _getAllWishlists();
  if (!wishlists.length) return;
  const allData = _loadAllTenderData();
  wishlists.forEach(item => {
    const email = item.email;
    const wishlist = item.wishlist;
    const notify = wishlist.notify || {};
    if (!notify.weeklyEmail) return;
    if (!(wishlist.investors || []).length && !(wishlist.keywords || []).length) return;
    const cutoff = new Date(Date.now() - 7 * 86400000);
    const recent = (rows, type) => rows.filter(r => {
      const d = type === 'kqdt' ? _extractDate(r.ngayPD, 'direct') :
                type === 'tbmt' ? _extractDate(r.tgPhatHanh, 'embedded') :
                _extractDate(r.noiDungPD, 'end');
      return d && d >= cutoff;
    });
    const kqdtRecent = recent(allData.kqdt, 'kqdt');
    const tbmtRecent = recent(allData.tbmt, 'tbmt');
    const khmtRecent = recent(allData.khmt, 'khmt');
    const matches = [].concat(
      _findMatches(kqdtRecent, 'kqdt', wishlist).map(r => ({ type: 'kqdt', row: r, matchedBy: _matchLabel(r, 'kqdt', wishlist) })),
      _findMatches(tbmtRecent, 'tbmt', wishlist).map(r => ({ type: 'tbmt', row: r, matchedBy: _matchLabel(r, 'tbmt', wishlist) })),
      _findMatches(khmtRecent, 'khmt', wishlist).map(r => ({ type: 'khmt', row: r, matchedBy: _matchLabel(r, 'khmt', wishlist) }))
    );
    if (!matches.length) { Logger.log('Weekly: ' + email + ' — no matches this week'); return; }
    const recipients = [];
    if (Array.isArray(wishlist.recipients) && wishlist.recipients.length) {
      wishlist.recipients.forEach(r => { if (r && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)) recipients.push(r); });
    }
    if (!recipients.length) recipients.push(email);
    try {
      const pdfBase64 = _buildWishlistPDF(email, matches, 'weekly');
      const xlsxBase64 = _buildWishlistExcel(matches);
      const summary = { 'Tổng gói khớp 7 ngày qua': matches.length, KQDT: matches.filter(m => m.type === 'kqdt').length, KHMT: matches.filter(m => m.type === 'khmt').length, TBMT: matches.filter(m => m.type === 'tbmt').length };
      recipients.forEach(rcp => {
        try {
          sendReportEmail({ to: rcp, from: CFG.EMAIL_FROM, fromName: CFG.EMAIL_FROM_NAME, subject: `[MMH Wishlist] Digest tuần — ${matches.length} gói khớp`, kind: 'wishlist_weekly', pdfBase64, xlsxBase64, summary });
          Logger.log('Weekly: sent to ' + rcp + ' (' + matches.length + ' matches)');
        } catch (e) { Logger.log('Weekly email error for ' + rcp + ': ' + e.message); }
      });
    } catch (err) { Logger.log('Weekly build error for ' + email + ': ' + err.message); }
  });
}

function _matchLabel(row, type, wishlist) {
  const inv = wishlist.investors || [];
  const kw = wishlist.keywords || [];
  const goiName = type === 'tbmt' ? String(row.goiThau || '') : String(row.tenGoi || '');
  const folGoi = goiName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const parts = [];
  for (const w of inv) {
    if (w[type] === false) continue;
    if (_normalizeKey(w.name) === row._invKey) { parts.push('🏥 ' + w.name); break; }
  }
  for (const k of kw) {
    if (k[type] === false) continue;
    const folKw = String(k.text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    if (folGoi.indexOf(folKw) >= 0) { parts.push('🔑 ' + k.text); break; }
  }
  return parts.join(' · ');
}

/* ============================================================
   QUICK TEST FUNCTIONS
   ============================================================ */
function health() {
  const result = doGet({ parameter: { action: 'health' } });
  Logger.log(result.getContent());
  return JSON.parse(result.getContent());
}
function whoAmI() {
  // Kiểm tra account đang chạy backend + các alias "Send mail as"
  const me = Session.getEffectiveUser().getEmail();
  let aliases = [];
  try { aliases = GmailApp.getAliases(); } catch (e) {}
  Logger.log('Effective user (account deploy): ' + me);
  Logger.log('EMAIL_FROM mong muốn: ' + CFG.EMAIL_FROM);
  Logger.log('Aliases "Send mail as": ' + JSON.stringify(aliases));
  Logger.log('→ from "' + CFG.EMAIL_FROM + '" sẽ ' + (_resolveFromAlias(CFG.EMAIL_FROM) ? 'ÁP DỤNG ĐƯỢC' : 'KHÔNG áp dụng (gửi bằng địa chỉ mặc định ' + me + ')'));
  return { me, emailFromWanted: CFG.EMAIL_FROM, aliases, willApply: !!_resolveFromAlias(CFG.EMAIL_FROM) };
}
function testEmail() {
  const TEST_TO = 'nguyendoantruonggiang@gmail.com';
  try {
    const r = pingEmail(TEST_TO, CFG.EMAIL_FROM, CFG.EMAIL_FROM_NAME);
    Logger.log('✓ ' + JSON.stringify(r));
    return r;
  } catch (err) {
    Logger.log('✗ Lỗi: ' + err.message);
    return { ok: false, error: err.message };
  }
}
function testWeekly() { triggerWeeklyDigest(); return 'Triggered weekly — check inbox'; }
function testInstant() { triggerInstantWishlist(); return 'Triggered instant — check inbox if has new matches'; }
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => Logger.log(t.getHandlerFunction() + ' — ' + t.getEventType()));
  return triggers.length + ' triggers';
}