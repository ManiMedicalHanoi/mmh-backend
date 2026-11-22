/* ════════════════════════════════════════════════════════════════════
   ⭐ 08/10/2026 · MMH_MailDomain.gs — chuẩn hoá MIỀN NGƯỜI NHẬN của mọi email gửi đi
   ⭐ 20/11/2026 (người dùng yêu cầu): email tới nhân sự MMH gửi tới đuôi @mani.inc — mọi địa chỉ @manimedicalhanoi.com
   được đổi sang @mani.inc (cùng phần trước @). Tài khoản GỬI (chủ script) không đổi. Trước 20/11 làm ngược lại (⇒ @manimedicalhanoi.com). Mọi lệnh MailApp.sendEmail / GmailApp.sendEmail trong dự án gọi qua mmhMail_ / mmhGmail_.
   Đăng nhập vẫn nhận cả 2 miền (so theo phần trước @). Code mới: KHÔNG gọi MailApp.sendEmail trực tiếp — dùng mmhMail_.
   ════════════════════════════════════════════════════════════════════ */
var MMH_MAIL_DOMAIN = 'mani.inc';
function mmhAddr_(s) {
  if (s == null) return s;
  if (Array.isArray(s)) return s.map(mmhAddr_);
  return String(s).replace(/@manimedicalhanoi\.com\b/gi, '@' + MMH_MAIL_DOMAIN);
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
function mmhFriendly_() { return new Error('Hệ thống đã gửi hết số email Google cho phép trong 24 giờ qua — email này chưa được gửi. Hạn mức tự phục hồi dần trong vòng 24 giờ; vui lòng thử lại sau hoặc báo Admin.'); }
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
  var o = mmhMailOpts_(mmhMailObj_(a, b, c, d));
  if (MMH_SELF) return mmhSelfGrab_(o);                               /* ⭐ 22/11/2026 — lượt tự gửi: gom thư, không gửi */
  return mmhSendObj_(o);
}
/* GmailApp.sendEmail(recipient, subject, body[, options]) */
function mmhGmail_(a, b, c, d) {
  var o = mmhMailObj_(a, b, c, d);
  if (mmhTestOn_()) o = tmMailHook_(o);
  o = mmhMailOpts_(o);
  if (MMH_SELF && !mmhTestOn_()) return mmhSelfGrab_(o);              /* ⭐ 22/11/2026 */
  var to = o.to, s = o.subject, bd = o.body || '', opt = {};
  for (var k in o) if (k !== 'to' && k !== 'subject' && k !== 'body') opt[k] = o[k];
  try { return GmailApp.sendEmail(to, s, bd, opt); }
  catch (e) {
    if (!mmhQuotaErr_(e)) throw e;
    if (typeof mmhMailApi_ === 'function') return mmhMailApi_(o);
    throw mmhFriendly_();
  }
}

/* ════════════════════════════════════════════════════════════════════
   ⭐ 22/11/2026 — TỰ GỬI TỪ GMAIL CỦA NGƯỜI DÙNG (người dùng yêu cầu: "ai tự gửi của người đó", hết lỗi hạn mức email của mmh.product).
   Lượt có p.selfMail=1 (báo cáo tuần / tháng của CRM) chạy trong mmhSelfRun_ ⇒ mmhMail_ / mmhGmail_ KHÔNG gửi mà GOM thư
   (người nhận đã chuẩn hoá miền, đính kèm base64) vào out.mails ⇒ app gửi bằng Gmail API của chính người bấm.
   Ghi nhận "đã gửi" (mmhSelfLog_: rpMark_ / rplAdd_) được HOÃN ⇒ out.ack (ký HMAC, khoá Script Property MMH_SELF_KEY, hạn 6 giờ)
   ⇒ app gửi xong gọi action selfAck ⇒ mmhSelfAck_ mới ghi. App gửi Gmail lỗi ⇒ gọi lại không có selfMail ⇒ hệ thống gửi như cũ.
   Chế độ TEST ⇒ luôn gửi như cũ. Không thêm quyền / dịch vụ Google mới.
   ════════════════════════════════════════════════════════════════════ */
var MMH_SELF = null;
function mmhSelfOn_() { return !!MMH_SELF; }
function mmhSelfBlob_(x) { return (x && typeof x.getBytes === 'function') ? x : (x && typeof x.getBlob === 'function' ? x.getBlob() : null); }
function mmhSelfRun_(p, fn) {
  if (String((p && p.selfMail) || '') !== '1' || mmhTestOn_()) return fn();
  MMH_SELF = { mails: [], log: [] };
  try {
    var out = fn();
    if (out && typeof out === 'object' && out.ok !== false && !out.download) {
      out.selfMail = 1;
      out.mails = MMH_SELF.mails;
      if (MMH_SELF.log.length) out.ack = mmhSelfSign_(MMH_SELF.log);
    }
    return out;
  } finally { MMH_SELF = null; }
}
function mmhSelfGrab_(o) {
  var att = [], inl = {};
  [].concat(o.attachments || []).forEach(function (x) {
    var b = mmhSelfBlob_(x); if (!b) return;
    att.push({ name: b.getName() || 'file', type: b.getContentType() || 'application/octet-stream', b64: Utilities.base64Encode(b.getBytes()) });
  });
  for (var k in (o.inlineImages || {})) {
    var b2 = mmhSelfBlob_(o.inlineImages[k]); if (b2) inl[k] = { type: b2.getContentType() || 'image/png', b64: Utilities.base64Encode(b2.getBytes()) };
  }
  MMH_SELF.mails.push({ to: String(o.to || ''), cc: String(o.cc || ''), bcc: String(o.bcc || ''), replyTo: String(o.replyTo || ''),
    subject: String(o.subject || ''), htmlBody: o.htmlBody ? String(o.htmlBody) : '', body: o.body ? String(o.body) : '', name: String(o.name || ''), att: att, inl: inl });
}
function mmhSelfFn_(fn) {
  if (fn === 'rpMark_' && typeof rpMark_ === 'function') return rpMark_;
  if (fn === 'rplAdd_' && typeof rplAdd_ === 'function') return rplAdd_;
  return null;
}
/* ghi nhận đã gửi: lượt tự gửi ⇒ hoãn tới selfAck; còn lại ⇒ chạy ngay */
function mmhSelfLog_(fn, args) {
  if (MMH_SELF) { MMH_SELF.log.push([fn, args]); return; }
  var f = mmhSelfFn_(fn); if (f) return f.apply(null, args);
}
function mmhSelfKey_() {
  var pr = PropertiesService.getScriptProperties(), k = pr.getProperty('MMH_SELF_KEY');
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('MMH_SELF_KEY', k); }
  return k;
}
function mmhSelfSig_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, mmhSelfKey_())); }
function mmhSelfSign_(log) {
  var s = Utilities.base64EncodeWebSafe(Utilities.newBlob(JSON.stringify({ l: log, x: Date.now() + 6 * 3600 * 1000, n: Utilities.getUuid() })).getBytes());
  return s + '.' + mmhSelfSig_(s);
}
function mmhSelfAck_(p) {
  var t = String((p && p.ack) || ''), i = t.lastIndexOf('.');
  if (i < 1) return { ok: false, error: 'Thiếu mã xác nhận' };
  var s = t.slice(0, i);
  if (mmhSelfSig_(s) !== t.slice(i + 1)) return { ok: false, error: 'Mã xác nhận không hợp lệ' };
  var j = null; try { j = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(s)).getDataAsString()); } catch (e) {}
  if (!j || !(j.x > Date.now())) return { ok: false, error: 'Mã xác nhận đã hết hạn' };
  var c = CacheService.getScriptCache(), ck = 'mmhsack_' + j.n;
  try { if (c.get(ck)) return { ok: true, dup: true }; c.put(ck, '1', 21600); } catch (e) {}
  var n = 0;
  (j.l || []).forEach(function (e) { var f = mmhSelfFn_(e && e[0]); if (f) { try { f.apply(null, e[1] || []); n++; } catch (x) {} } });
  return { ok: true, n: n };
}
