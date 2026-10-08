/* ════════════════════════════════════════════════════════════════════
   ★ v3.15 (07/10/2026) · RH_UpdMail.gs — EMAIL THÔNG BÁO CẬP NHẬT HỆ THỐNG
   Report Hub / MMH CRM ▸ Thông báo cập nhật ▸ "Gửi email cập nhật" (chỉ Admin).
   POST action=rhUpdMail, payload:
     tk, app ('report' | 'crm'), subject, html (dùng <img src="cid:…">), images [{cid, url}], pdfs [{url, name}] (hoặc pdf {url, name}),
     to [] / audience 'all' (mọi người dùng đang hoạt động trong RH_Users), cc [], test (true ⇒ chỉ gửi cho chính người bấm), rid.
   · Ảnh và file PDF chỉ lấy từ GitHub Pages của 2 app (manimedicalhanoi.github.io/MMH-Report | MMH-CRM) ⇒ không dùng làm cổng tải file lạ.
   · Người nhận chỉ email công ty (@mani.inc / @manimedicalhanoi.com), tối đa 200. Chống gửi trùng theo rid (6 giờ).
   · Gửi kiểu "no-reply"; ghi nhật ký sheet RH_UpdMail (Training Master).
   ════════════════════════════════════════════════════════════════════ */
var RH_UPD = {
  HOST: /^https:\/\/manimedicalhanoi\.github\.io\/(MMH-Report|MMH-CRM)\/[\w\-./%]+$/,
  DOMAIN: /^[^@\s]+@(mani\.inc|manimedicalhanoi\.com)$/i,
  MAX_TO: 200, MAX_IMG: 15, MAX_PDF: 22 * 1024 * 1024,
  LOG: 'RH_UpdMail'
};

/* ⭐ v3.18 — CHỮ KÝ theo người gửi (để trong kho riêng tư — không đưa SĐT / email nhân sự vào repo app công khai).
   Email có chỗ <!--SIGN--> ⇒ thay bằng chữ ký của người bấm gửi; chưa có chữ ký riêng ⇒ tên PIC. */
var RH_UPD_SIGN = {
  'mmh.product': '<p style="margin:0 0 14px;font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#000">Giang.</p>' +
    '<div style="font-family:\'Times New Roman\',Times,serif;font-size:12pt;line-height:1.35;color:#000">' +
    '<b>NGUYỄN DOÃN TRƯỜNG GIANG</b><br><b>Surgical &amp; Product Team Leader – Marketing Department</b><br><b>MANI MEDICAL HÀ NỘI Co., Ltd</b><br>' +
    'Phone/Zalo: 0947 892 412<br><div style="height:6px"></div>Email: <a href="mailto:mmh.product@mani.inc">mmh.product@mani.inc</a><br>' +
    'Website: <a href="http://www.mani.co.jp/">http://www.mani.co.jp/</a></div>'
};
function rhUpdSign(u) {
  var s = RH_UPD_SIGN[String(u && u.local || '').toLowerCase()];
  return s || ('<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:11pt"><b>' + hubNorm(u && u.pic) + '</b><br>MANI Medical Hanoi</div>');
}
function apiRhUpdSign(p) {
  var c = rhCheck(p.tk);
  if (c.err) return {ok: false, code: 'AUTH', error: c.err};
  if (!c.u.admin) return {ok: false, code: 'FORBIDDEN', error: 'Chỉ Admin.'};
  return {ok: true, html: rhUpdSign(c.u)};
}

function rhUpdEmails(list) {
  var out = [], seen = {};
  (Array.isArray(list) ? list : String(list || '').split(/[,;\s]+/)).forEach(function (e) {
    e = hubNorm(e).toLowerCase();
    if (!e || !RH_UPD.DOMAIN.test(e) || seen[e]) return;
    seen[e] = 1; out.push(e);
  });
  return out;
}
function rhUpdFetch(url, kind) {
  url = hubNorm(url);
  if (!RH_UPD.HOST.test(url)) throw new Error('Đường dẫn ' + kind + ' không hợp lệ: ' + url);
  var r = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: true});
  if (r.getResponseCode() !== 200) throw new Error('Không tải được ' + kind + ' (' + r.getResponseCode() + '): ' + url);
  return r.getBlob();
}

function apiRhUpdMail(p) {
  var c = rhCheck(p.tk);
  if (c.err) return {ok: false, code: 'AUTH', error: c.err + ' Vui lòng đăng nhập bằng email.'};
  var u = c.u;
  if (!u.admin) return {ok: false, code: 'FORBIDDEN', error: 'Chỉ Admin được gửi email thông báo cập nhật.'};   /* v3.17: chỉ Admin (người dùng yêu cầu 08/10/2026) */
  var app = p.app === 'crm' ? 'crm' : 'report';
  var subject = hubNorm(p.subject).substring(0, 180), html = String(p.html || '');
  if (!subject || html.length < 40) return {ok: false, error: 'Thiếu tiêu đề hoặc nội dung email.'};
  if (html.length > 400000) return {ok: false, error: 'Nội dung email quá dài.'};
  html = html.split('<!--SIGN-->').join(rhUpdSign(u));
  var test = hubBool(p.test), me = (u.local + '@' + HUB.SEND_DOMAIN).toLowerCase();

  var rid = hubNorm(p.rid), sc = hubSC();
  if (rid && !test) { var hit = sc.get('updmail:' + rid); if (hit) { try { var o = JSON.parse(hit); o.dup = true; return o; } catch (e) {} } }

  var to, cc = [];
  if (test) to = [me];
  else {
    to = p.audience === 'all'
      ? rhUsers().filter(function (x) { return x.active; }).map(function (x) { return x.local + '@' + HUB.SEND_DOMAIN; })
      : rhUpdEmails(p.to);
    to = rhUpdEmails(to);
    cc = rhUpdEmails(p.cc).filter(function (e) { return to.indexOf(e) < 0; });
  }
  if (!to.length) return {ok: false, error: 'Chưa có người nhận hợp lệ (chỉ email công ty).'};
  if (to.length + cc.length > RH_UPD.MAX_TO) return {ok: false, error: 'Quá nhiều người nhận (tối đa ' + RH_UPD.MAX_TO + ').'};
  try { if (MailApp.getRemainingDailyQuota() < to.length + cc.length) return {ok: false, error: 'Hết hạn mức gửi email hôm nay của hệ thống — thử lại ngày mai.'}; } catch (e) {}

  var inline = {}, files = [], linked = [];
  try {
    (Array.isArray(p.images) ? p.images : []).slice(0, RH_UPD.MAX_IMG).forEach(function (im) {
      var cid = String(im && im.cid || '').replace(/[^\w\-]/g, '');
      if (!cid || html.indexOf('cid:' + cid) < 0) return;
      inline[cid] = rhUpdFetch(im.url, 'ảnh').setName(cid + '.jpg');
    });
    /* ⭐ v3.16 — nhiều file PDF (HDSD toàn hệ thống + HDSD riêng của bản cập nhật, EN / VN): đính kèm theo thứ tự tới khi đủ 22 MB,
       file còn lại chỉ để link (nội dung email luôn có link tải) */
    var pdfs = (Array.isArray(p.pdfs) ? p.pdfs : []).concat(p.pdf && p.pdf.url ? [p.pdf] : []).slice(0, 4), total = 0, seenU = {};
    pdfs.forEach(function (f) {
      if (!f || !f.url || seenU[f.url]) return; seenU[f.url] = 1;
      var b = rhUpdFetch(f.url, 'file PDF'), n = b.getBytes().length;
      if (total + n > RH_UPD.MAX_PDF) { linked.push(hubNorm(f.name || f.url)); return; }
      total += n;
      files.push(b.setName(hubNorm(f.name || 'User_Guide.pdf').replace(/[^\w\-. ]/g, '_')).setContentType('application/pdf'));
    });
  } catch (e) { return {ok: false, error: e.message}; }

  var mail = {to: to.join(','), subject: (test ? '[TEST] ' : '') + subject, htmlBody: html, inlineImages: inline,
              attachments: files, name: app === 'crm' ? 'MMH CRM' : 'MMH Report Hub', noReply: true};
  if (cc.length) mail.cc = cc.join(',');
  try { mmhMail_(mail); }
  catch (e) {
    if (!/noReply|no-reply|reply/i.test(String(e.message))) return {ok: false, error: 'Gửi email lỗi: ' + e.message};
    delete mail.noReply; mail.replyTo = me;
    try { mmhMail_(mail); } catch (e2) { return {ok: false, error: 'Gửi email lỗi: ' + e2.message}; }
  }
  var out = {ok: true, sent: to.length + cc.length, to: to, cc: cc, test: test, files: files.length, linked: linked};
  try {
    var ss = hubSS(), sh = ss.getSheetByName(RH_UPD.LOG);
    if (!sh) { sh = ss.insertSheet(RH_UPD.LOG); sh.appendRow(['Time', 'By', 'App', 'Subject', 'Recipients', 'Test', 'Rid']); }
    sh.appendRow([new Date(), u.pic, app, subject, to.length + cc.length, test ? 'x' : '', rid]);
  } catch (e) {}
  if (rid && !test) try { sc.put('updmail:' + rid, JSON.stringify(out), 21600); } catch (e) {}
  return out;
}
