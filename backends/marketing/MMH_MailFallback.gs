/* ════════════════════════════════════════════════════════════════════
   ⭐ 17/10/2026 · MMH_MailFallback.gs — GỬI EMAIL QUA GMAIL API KHI HẾT HẠN MỨC APPS SCRIPT
   Chỉ đặt ở backend ĐÃ có quyền gọi UrlFetch + Gmail (marketing / management / training) — KHÔNG thêm quyền mới.
   mmhMail_ / mmhGmail_ (MMH_MailDomain.gs) gọi mmhMailApi_(o) khi MailApp báo hết hạn mức ngày
   ("Service invoked too many times for one day: email") hoặc hạn mức còn lại < số người nhận.
   o = { to, cc, bcc, replyTo, subject, body, htmlBody, name, from, attachments:[Blob|File], inlineImages:{cid:Blob} }
   ════════════════════════════════════════════════════════════════════ */
function mmhMailApi_(o) {
  o = o || {};
  var me = ''; try { me = Session.getEffectiveUser().getEmail(); } catch (e) {}
  var from = o.from || me;
  var raw = mmhMime_(o, from);
  var res = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ raw: Utilities.base64EncodeWebSafe(raw) })
  });
  var code = res.getResponseCode();
  if (code >= 200 && code < 300) { try { console.log('mmhMailApi_: gửi qua Gmail API · ' + (o.subject || '')); } catch (e) {} return; }
  try { console.warn('mmhMailApi_ ' + code + ': ' + res.getContentText().slice(0, 300)); } catch (e) {}
  throw new Error('Hệ thống đã gửi hết số email Google cho phép trong 24 giờ qua — email này chưa được gửi. Hạn mức tự phục hồi dần trong vòng 24 giờ; vui lòng thử lại sau hoặc báo Admin.');
}
function mmhB64_(bytesOrStr) {
  var b = typeof bytesOrStr === 'string' ? Utilities.newBlob(bytesOrStr).getBytes() : bytesOrStr;
  return Utilities.base64Encode(b).replace(/(.{76})/g, '$1\r\n');
}
function mmhHdr_(s) {   /* tiêu đề / tên có dấu ⇒ RFC 2047 */
  s = String(s == null ? '' : s);
  return /^[\x20-\x7E]*$/.test(s) ? s : '=?UTF-8?B?' + Utilities.base64Encode(Utilities.newBlob(s).getBytes()) + '?=';
}
function mmhBlob_(x) { return (x && typeof x.getBytes === 'function') ? x : (x && typeof x.getBlob === 'function' ? x.getBlob() : null); }
function mmhMime_(o, from) {
  var nl = '\r\n', id = Utilities.getUuid().replace(/-/g, '');
  var H = [];
  H.push('MIME-Version: 1.0');
  H.push('From: ' + (o.name ? mmhHdr_(o.name) + ' <' + from + '>' : from));
  H.push('To: ' + String(o.to || ''));
  if (o.cc) H.push('Cc: ' + String(o.cc));
  if (o.bcc) H.push('Bcc: ' + String(o.bcc));
  if (o.replyTo) H.push('Reply-To: ' + String(o.replyTo));
  H.push('Subject: ' + mmhHdr_(o.subject || ''));
  var text = String(o.body || '');
  var alt = 'alt' + id, rel = 'rel' + id, mix = 'mix' + id;
  var altPart = 'Content-Type: multipart/alternative; boundary="' + alt + '"' + nl + nl +
    '--' + alt + nl + 'Content-Type: text/plain; charset=UTF-8' + nl + 'Content-Transfer-Encoding: base64' + nl + nl + mmhB64_(text || ' ') + nl +
    (o.htmlBody ? '--' + alt + nl + 'Content-Type: text/html; charset=UTF-8' + nl + 'Content-Transfer-Encoding: base64' + nl + nl + mmhB64_(String(o.htmlBody)) + nl : '') +
    '--' + alt + '--' + nl;
  var body = altPart;
  var inl = o.inlineImages || {}, cids = Object.keys(inl);
  if (cids.length) {
    body = 'Content-Type: multipart/related; boundary="' + rel + '"' + nl + nl + '--' + rel + nl + altPart;
    cids.forEach(function (cid) {
      var b = mmhBlob_(inl[cid]); if (!b) return;
      body += '--' + rel + nl + 'Content-Type: ' + (b.getContentType() || 'image/png') + nl + 'Content-Transfer-Encoding: base64' + nl +
        'Content-ID: <' + cid + '>' + nl + 'Content-Disposition: inline; filename="' + cid + '"' + nl + nl + mmhB64_(b.getBytes()) + nl;
    });
    body += '--' + rel + '--' + nl;
  }
  var att = (o.attachments || []).map(mmhBlob_).filter(Boolean);
  if (att.length) {
    var m = 'Content-Type: multipart/mixed; boundary="' + mix + '"' + nl + nl + '--' + mix + nl + body;
    att.forEach(function (b) {
      var nm = b.getName() || 'file';
      m += '--' + mix + nl + 'Content-Type: ' + (b.getContentType() || 'application/octet-stream') + '; name="' + mmhHdr_(nm) + '"' + nl +
        'Content-Transfer-Encoding: base64' + nl + 'Content-Disposition: attachment; filename="' + mmhHdr_(nm) + '"; filename*=UTF-8\'\'' + encodeURIComponent(nm) + nl + nl +
        mmhB64_(b.getBytes()) + nl;
    });
    m += '--' + mix + '--' + nl;
    body = m;
  }
  return H.join(nl) + nl + body;
}
/* chẩn đoán: hạn mức email còn lại của tài khoản chạy script */
function mmhMailInfo_(probe) {
  var left = -1, me = '', api = ''; try { left = MailApp.getRemainingDailyQuota(); } catch (e) {} try { me = Session.getEffectiveUser().getEmail(); } catch (e) {}
  if (probe) { try { var r = UrlFetchApp.fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
    api = r.getResponseCode() + ' ' + r.getContentText().replace(/\s+/g, ' ').slice(0, 120).replace(/"emailAddress":\s*"[^"]*"/, '"emailAddress":"…"'); } catch (e) { api = 'ERR ' + e.message; } }
  return { mailLeft: left, mailApi: true, apiProbe: api, sender: me ? me.replace(/^(.).*(@.*)$/, '$1…$2') : '' };
}
