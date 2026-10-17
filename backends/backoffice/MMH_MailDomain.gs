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
/* ⭐ 13/10/2026 — Chế độ TEST của Admin (MMH_TestMode.gs): lượt gọi TEST ⇒ mọi email chỉ về Admin, tiêu đề [TEST] */
function mmhTestOn_() { return typeof tmMailHook_ === 'function' && typeof MMH_TEST !== 'undefined' && !!MMH_TEST; }
function mmhMailObj_(a, b, c, d) {
  if (a && typeof a === 'object') return a;
  if (typeof d === 'string') return { to: a, replyTo: b, subject: c, body: d };
  var o = {}; if (d && typeof d === 'object') for (var k in d) o[k] = d[k];
  o.to = a; o.subject = b; o.body = c; return o;
}
/* ⭐ 17/10/2026 — HẠN MỨC EMAIL: Apps Script giới hạn số NGƯỜI NHẬN / ngày cho mỗi tài khoản chạy script (dùng chung mọi dự án).
   Hết hạn mức ⇒ "Service invoked too many times for one day: email". Backend nào có file MMH_MailFallback.gs (hàm mmhMailApi_)
   sẽ tự gửi lại qua Gmail API của cùng tài khoản (hạn mức riêng của Gmail). Không có ⇒ báo câu dễ hiểu. */
function mmhQuotaErr_(e) { return /too many times|quota|Service invoked|Dịch vụ được gọi quá nhiều/i.test(String((e && e.message) || e || '')); }
function mmhRcpt_(o) { var n = 0; ['to', 'cc', 'bcc'].forEach(function (k) { if (o && o[k]) n += String(o[k]).split(',').filter(function (x) { return x.trim(); }).length; }); return n; }
function mmhFriendly_() { return new Error('Hôm nay hệ thống đã gửi hết số email Google cho phép (hạn mức theo ngày). Vui lòng thử lại sau 7 giờ sáng mai hoặc báo Admin.'); }
function mmhSendObj_(o) {
  var api = (typeof mmhMailApi_ === 'function');
  if (api) { try { if (MailApp.getRemainingDailyQuota() < Math.max(1, mmhRcpt_(o))) return mmhMailApi_(o); } catch (_q) {} }
  try { return MailApp.sendEmail(o); }
  catch (e) {
    if (!mmhQuotaErr_(e)) throw e;
    if (api) return mmhMailApi_(o);
    throw mmhFriendly_();
  }
}
/* MailApp.sendEmail(message) · (recipient, subject, body[, options]) · (to, replyTo, subject, body) */
function mmhMail_(a, b, c, d) {
  if (mmhTestOn_()) return mmhSendObj_(mmhMailOpts_(tmMailHook_(mmhMailObj_(a, b, c, d))));
  return mmhSendObj_(mmhMailOpts_(mmhMailObj_(a, b, c, d)));
}
/* GmailApp.sendEmail(recipient, subject, body[, options]) */
function mmhGmail_(a, b, c, d) {
  var o = mmhMailObj_(a, b, c, d);
  if (mmhTestOn_()) o = tmMailHook_(o);
  o = mmhMailOpts_(o);
  var to = o.to, s = o.subject, bd = o.body || '', opt = {};
  for (var k in o) if (k !== 'to' && k !== 'subject' && k !== 'body') opt[k] = o[k];
  try { return GmailApp.sendEmail(to, s, bd, opt); }
  catch (e) {
    if (!mmhQuotaErr_(e)) throw e;
    if (typeof mmhMailApi_ === 'function') return mmhMailApi_(o);
    throw mmhFriendly_();
  }
}
