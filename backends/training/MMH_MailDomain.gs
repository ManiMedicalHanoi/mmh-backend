/* ════════════════════════════════════════════════════════════════════
   ⭐ 08/10/2026 · MMH_MailDomain.gs — MỌI EMAIL GỬI ĐI DÙNG MIỀN @manimedicalhanoi.com
   Người dùng: email tới miền @mani.inc hay bị chặn / vào thư rác ⇒ đổi hết người nhận sang @manimedicalhanoi.com
   (cùng phần trước @). Mọi lệnh MailApp.sendEmail / GmailApp.sendEmail trong dự án gọi qua mmhMail_ / mmhGmail_.
   Đăng nhập vẫn nhận cả 2 miền (so theo phần trước @). Code mới: KHÔNG gọi MailApp.sendEmail trực tiếp — dùng mmhMail_.
   ════════════════════════════════════════════════════════════════════ */
var MMH_MAIL_DOMAIN = 'manimedicalhanoi.com';
function mmhAddr_(s) {
  if (s == null) return s;
  if (Array.isArray(s)) return s.map(mmhAddr_);
  return String(s).replace(/@mani\.inc\b/gi, '@' + MMH_MAIL_DOMAIN);
}
function mmhMailOpts_(o) {
  if (o && typeof o === 'object') ['to', 'cc', 'bcc', 'replyTo'].forEach(function (k) { if (o[k]) o[k] = mmhAddr_(o[k]); });
  return o;
}
/* MailApp.sendEmail(message) · (recipient, subject, body[, options]) · (to, replyTo, subject, body) */
function mmhMail_(a, b, c, d) {
  if (a && typeof a === 'object') return MailApp.sendEmail(mmhMailOpts_(a));
  if (arguments.length >= 4) {
    if (typeof d === 'string') return MailApp.sendEmail(mmhAddr_(a), mmhAddr_(b), c, d);
    return MailApp.sendEmail(mmhAddr_(a), b, c, mmhMailOpts_(d));
  }
  return MailApp.sendEmail(mmhAddr_(a), b, c);
}
/* GmailApp.sendEmail(recipient, subject, body[, options]) */
function mmhGmail_(a, b, c, d) {
  if (arguments.length >= 4) return GmailApp.sendEmail(mmhAddr_(a), b, c, mmhMailOpts_(d));
  return GmailApp.sendEmail(mmhAddr_(a), b, c);
}
