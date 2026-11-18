/**
 * MMH_SurveyNotify.gs v1.0 (18/11/2026) — khảo sát MMH ⇒ task Report Hub + email gửi Marketing (người dùng yêu cầu 18/11/2026).
 *
 * ① Tạo khảo sát (nsCreate_) ⇒ nsHubTask_: 1 task trên Report Hub Marketing cho người tạo (owner):
 *    có sự kiện ⇒ sub-task "Khảo sát bác sĩ · <tiêu đề>" dưới Key task trùng tên sự kiện (nsKeyMatch_: ngày yyyymmdd + từ trong tên),
 *    không thấy key / không có sự kiện ⇒ Key task mới "Khảo sát bác sĩ · <sự kiện | tiêu đề>". Trạng thái In Progress, kết quả = link khảo sát + link trang gửi email.
 *    Gọi web app Report Hub Marketing (NS.HUB_URL, action addKey / addSub / updateResult / updateStatus — như app Report Hub, actor = owner).
 * ② Trang Training-Hub/khao-sat/gui.html?s=<mã> (phiên email tk): nsInfo = tóm tắt + bản xem trước email; bấm "Xác nhận hoàn thành & gửi email" ⇒ nsMailSend:
 *    email trang trọng To NS.MAIL.to · CC NS.MAIL.cc (tra email theo tên PIC ở RH_Users của Training Master — không ghi email trong code),
 *    mục tiêu · đối tượng · số câu · nhóm câu hỏi · link khảo sát · QR (ảnh trong thư + đính kèm PNG + SVG) · link kết quả (app MMH Survey + Google Sheet);
 *    chia sẻ quyền xem Sheet kết quả cho người nhận, thêm người nhận vào danh sách theo dõi của app MMH Survey; task Report Hub ⇒ Completed.
 *    Chỉ gửi 1 lần (sửa khảo sát sau đó KHÔNG gửi lại); force=1 mới gửi lại.
 * Người được gửi: người tạo khảo sát, Admin / Director / HOD.
 */
var NS_VN = { 'Thuong': 'Thương', 'Tuyen': 'Tuyên', 'Nguyen Ha': 'Nguyễn Hà', 'Duc Anh': 'Đức Anh', 'Hoa': 'Hòa', 'Viet': 'Việt', 'Viet Ha': 'Việt Hà', 'Phuong': 'Phương' };   // tên hiển thị có dấu trong email
function nsVN_(pic) { return NS_VN[pic] || pic; }
function nsVNs_(a) { return (a || []).map(nsVN_); }
function nsHubCall_(body) {
  body.rid = body.rid || ('ns' + Utilities.getUuid());
  var r = UrlFetchApp.fetch(NS.HUB_URL, { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true, followRedirects: true });
  var t = r.getContentText();
  try { return JSON.parse(t); } catch (x) { throw new Error('Report Hub không trả lời đúng (' + r.getResponseCode() + ')'); }
}
function nsHubKeys_() {
  var r = UrlFetchApp.fetch(NS.HUB_URL + '?action=weekly', { muteHttpExceptions: true, followRedirects: true });
  var o = JSON.parse(r.getContentText());
  if (!o.ok) throw new Error('Không đọc được Report Hub: ' + (o.error || ''));
  return o.keyTasks || [];
}
/** Key task của sự kiện: điểm = ngày yyyymmdd trong tên (+3) + tỉ lệ từ của tên sự kiện có trong tên key (×4) + đúng loại Marketing-Event (+1) */
function nsKeyMatch_(keys, ev) {
  if (!ev || !ev.name) return null;
  var nk = function (s) { return rshNk_(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
  var d8 = (ev.date || '').replace(/-/g, ''), en = nk(ev.name), toks = en.split(' ').filter(function (w) { return w.length >= 3; });
  var best = null, bs = 0;
  keys.forEach(function (k) {
    var name = nk(k.keyTask || ''); if (!name) return;
    var sc = 0;
    if (name === en) sc += 10;
    if (d8 && name.indexOf(d8) >= 0) sc += 3;
    if (toks.length) sc += 4 * toks.filter(function (w) { return (' ' + name + ' ').indexOf(' ' + w + ' ') >= 0; }).length / toks.length;
    if (/event/i.test(k.type || '')) sc += 1;
    if (sc > bs) { bs = sc; best = k; }
  });
  return bs >= 4 ? best : null;
}
function nsToday_() { return Utilities.formatDate(new Date(), NS.TZ, 'yyyy-MM-dd'); }
function nsTaskName_(sp) { return 'Khảo sát bác sĩ · ' + sp.title; }
function nsTaskResult_(st, extra) {
  return ['Link khảo sát: ' + nsLink_(st.code), 'Gửi email + QR cho Marketing: ' + NS.SEND + '?s=' + st.code].concat(extra || []).join('\n');
}
function nsHubTask_(st, owner) {
  var sp = st.spec, today = nsToday_(), due = sp.event.date && sp.event.date >= today ? sp.event.date : today, t = sp.task || {};
  var key = null;
  if (t.keyNo || t.keyName) key = { no: t.keyNo, keyTask: t.keyName };
  else if (sp.event.name) { try { key = nsKeyMatch_(nsHubKeys_(), sp.event); } catch (x) { console.warn('nsHubTask_ keys: ' + x.message); } }
  if (key && key.no) {
    var name = nsTaskName_(sp);
    var r = nsHubCall_({ action: 'addSub', actor: owner, pic: owner, parentNo: String(key.no), expectKey: key.keyTask || '', parentKeyTask: key.keyTask || '',
      name: name, result: nsTaskResult_(st), start: today, planned: due, status: 'In Progress', progress: 50 });
    if (!r.ok) throw new Error(r.error || 'Report Hub từ chối thêm sub-task');
    return { no: String(r.no), name: name, key: key.keyTask || '', keyNo: String(key.no), kind: 'sub', at: new Date().toISOString() };
  }
  var kname = 'Khảo sát bác sĩ · ' + (sp.event.name || sp.title);
  var r2 = nsHubCall_({ action: 'addKey', actor: owner, pic: owner, keyTask: kname, type: t.type || (sp.event.name ? 'Marketing-Event' : 'Product-Data Organization'),
    result: nsTaskResult_(st), start: today, planned: due, status: 'In Progress', progress: 50 });
  if (!r2.ok) throw new Error(r2.error || 'Report Hub từ chối thêm Key task');
  return { no: String(r2.no), name: kname, key: '', keyNo: String(r2.no), kind: 'key', at: new Date().toISOString() };
}
/** task ⇒ Completed + ghi kết quả (đã gửi email lúc …) */
function nsHubDone_(st, owner, line) {
  var t = st.task; if (!t || !t.no) return { ok: false, error: 'Chưa có task Report Hub' };
  var r1 = nsHubCall_({ action: 'updateResult', actor: owner, no: t.no, expect: t.name, result: nsTaskResult_(st, [line]) });
  var r2 = nsHubCall_({ action: 'updateStatus', actor: owner, no: t.no, expect: t.name, status: 'Completed' });
  if (!r2.ok) return { ok: false, error: r2.error || r1.error || 'Report Hub từ chối' };
  t.status = 'Completed'; t.doneAt = new Date().toISOString();
  return { ok: true };
}

/* ---------- người nhận: tên PIC ⇒ email (RH_Users, Training Master) ---------- */
function nsStaff_(pics) {
  var us = SpreadsheetApp.openById(SVTM.ID).getSheetByName('RH_Users');
  var V = us ? us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 12).getValues() : [];
  return pics.map(function (pic) {
    var hit = null;
    V.forEach(function (r) { if (!hit && nsS_(r[1]).toLowerCase() === nsS_(pic).toLowerCase() && (r[4] === '' || rsTrue_(r[4]))) hit = r; });
    var em = hit ? nsS_(hit[0]) : '';
    if (em && em.indexOf('@') < 0) em += '@manimedicalhanoi.com';
    return { pic: pic, email: em };
  });
}

/* ---------- nội dung email ---------- */
function nsGroups_(sp) {
  var out = [];
  sp.sections.forEach(function (s) {
    var n = s.questions.filter(function (q) { return q.t !== 'header'; }).length; if (!n) return;
    var base = s.title.replace(/\s*\(tiếp\)\s*$/i, '');
    var last = out[out.length - 1];
    if (last && last.title === base) last.n += n; else out.push({ title: base || 'Phần ' + (out.length + 1), n: n });
  });
  return out;
}
function nsFmtDate_(d) { return d ? d.split('-').reverse().join('/') : ''; }
function nsMailParts_(st, toList, owner) {
  var sp = st.spec, L = nsLoad_(st.code, false), reg = L.reg, fb = sp.page === 'none' ? null : NS.FB[sp.page];
  var nq = nsQs_(st).length, groups = nsGroups_(sp), ev = sp.event.name ? sp.event.name + (sp.event.date ? ' (' + nsFmtDate_(sp.event.date) + ')' : '') : '';
  var url = nsLink_(st.code), app = NS.APP + '#s=' + encodeURIComponent(reg.sheetId), sheet = 'https://docs.google.com/spreadsheets/d/' + reg.sheetId + '/edit';
  var who = sp.grp === 'Dental' ? 'Bác sĩ nha khoa' : 'Bác sĩ nhãn khoa';
  var subject = '[Khảo sát bác sĩ] ' + sp.title + (sp.event.name ? ' – ' + sp.event.name : '');
  var e = nsEsc_, P = 'margin:0 0 12px', TD = 'padding:3px 12px 3px 0;vertical-align:top';
  var info = [
    ['Mục tiêu khảo sát', sp.objective || '(chưa ghi)'],
    ['Đối tượng', who],
    ['Số câu hỏi', nq + ' câu' + (sp.minutes ? ', thời gian trả lời khoảng ' + sp.minutes + ' phút' : '')],
    ev ? ['Sự kiện', ev] : null
  ].filter(Boolean);
  var html = '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1E2B36">' +
    '<p style="' + P + '">Kính gửi Team Marketing (' + e(toList.map(function (x) { return nsVN_(x.pic); }).join(', ')) + '),</p>' +
    '<p style="' + P + '">Bộ khảo sát bác sĩ <b>' + e(sp.title) + '</b>' + (ev ? ' dành cho sự kiện <b>' + e(ev) + '</b>' : '') + ' đã hoàn thành và sẵn sàng sử dụng. Thông tin cụ thể như sau:</p>' +
    '<table style="border-collapse:collapse;margin:0 0 12px">' + info.map(function (r) { return '<tr><td style="' + TD + ';color:#5E6E7C;white-space:nowrap">' + e(r[0]) + '</td><td style="' + TD + '">' + e(r[1]) + '</td></tr>'; }).join('') + '</table>' +
    '<p style="margin:0 0 4px"><b>Nội dung câu hỏi</b></p><ul style="margin:0 0 12px;padding-left:20px">' +
    groups.map(function (g) { return '<li>' + e(g.title) + ' (' + g.n + ' câu)</li>'; }).join('') + '</ul>' +
    '<p style="' + P + '">Trước phần câu hỏi, bác sĩ xác nhận đồng ý xử lý dữ liệu cá nhân, điền họ tên, số điện thoại, nơi công tác' + (fb ? ' và theo dõi page ' + e(fb.name) + ' trên Facebook' : '') + '.</p>' +
    '<p style="margin:0 0 4px"><b>Link khảo sát gửi bác sĩ</b></p><p style="' + P + '"><a href="' + e(url) + '">' + e(url) + '</a></p>' +
    '<p style="margin:0 0 6px"><b>Mã QR</b> (đính kèm: file PNG để chèn slide / màn hình, file SVG để in ấn khổ lớn)</p>' +
    '<p style="' + P + '"><img src="cid:qr" width="180" height="180" alt="Mã QR khảo sát" style="border:1px solid #BCD4E6"></p>' +
    '<p style="margin:0 0 4px"><b>Theo dõi kết quả</b></p><ul style="margin:0 0 12px;padding-left:20px">' +
    '<li>Thống kê và biểu đồ (app MMH Survey, đăng nhập email công ty): <a href="' + e(app) + '">' + e(app) + '</a></li>' +
    '<li>Dữ liệu chi tiết (Google Sheet): <a href="' + e(sheet) + '">' + e(sheet) + '</a></li></ul>' +
    '<p style="' + P + '">Nhờ Team Marketing đưa link và mã QR vào ấn phẩm, chương trình sự kiện; theo dõi số lượng phản hồi và phối hợp follow-up bác sĩ sau sự kiện.</p>' +
    '<p style="margin:0">Trân trọng,</p><p style="margin:0">' + e(nsVN_(owner) || 'Mani Medical Hanoi') + '</p><p style="margin:0;color:#5E6E7C">Công ty TNHH Mani Medical Hà Nội</p></div>';
  return { subject: subject, html: html, url: url, app: app, sheet: sheet, groups: groups, nq: nq, ev: ev, who: who };
}
function nsCanSend_(st, me) { return !!(me && (me.admin || me.priv || me.pic === st.owner || me.pic === st.by)); }
function nsInfo_(code, me) {
  var L = nsLoad_(code, true); if (!L) return { ok: false, error: 'Không có khảo sát mã ' + code };
  var st = L.st, sp = st.spec, to = sp.mail.to.map(function (p) { return { pic: p }; }), cc = sp.mail.cc.map(function (p) { return { pic: p }; });
  var m = nsMailParts_(st, to, st.owner || st.by);
  var qr = 'data:image/png;base64,' + Utilities.base64Encode(nsQrPng_(m.url, 600).getBytes());
  return { ok: true, v: NS.VER, code: code, title: sp.title, objective: sp.objective, grp: sp.grp, event: sp.event, nq: m.nq, minutes: sp.minutes, groups: m.groups, open: sp.open !== false,
    url: m.url, app: m.app, sheet: m.sheet, owner: st.owner || st.by || '', canSend: nsCanSend_(st, me), task: st.task || null, taskErr: st.taskErr || '',
    mail: { to: nsVNs_(sp.mail.to), cc: nsVNs_(sp.mail.cc), subject: m.subject, html: m.html.replace('cid:qr', qr), sent: st.mail || null } };
}
function nsMailSend_(code, me, force) {
  var L = nsLoad_(code, true); if (!L) return { ok: false, error: 'Không có khảo sát mã ' + code };
  var st = L.st, sp = st.spec;
  if (!nsCanSend_(st, me)) return { ok: false, code: 'PERM', error: 'Chỉ người tạo khảo sát hoặc Admin / Giám đốc / Trưởng bộ phận gửi được email này.' };
  if (st.mail && st.mail.at && !force) return { ok: false, code: 'SENT', error: 'Email đã gửi lúc ' + Utilities.formatDate(new Date(st.mail.at), NS.TZ, 'HH:mm dd/MM/yyyy') + '.', sent: st.mail };
  var to = nsStaff_(sp.mail.to), cc = nsStaff_(sp.mail.cc), miss = to.concat(cc).filter(function (x) { return !x.email; }).map(function (x) { return x.pic; });
  if (!to.some(function (x) { return x.email; })) return { ok: false, error: 'Không tìm thấy email của ' + sp.mail.to.join(', ') + ' trong danh sách người dùng (RH_Users).' };
  var owner = st.owner || st.by || me.pic, m = nsMailParts_(st, to, owner);
  var png = nsQrPng_(m.url, 1000, 'QR khảo sát - ' + sp.title.slice(0, 60) + '.png');
  var svg = Utilities.newBlob(nsQrSvg_(m.url), 'image/svg+xml', 'QR khảo sát - ' + sp.title.slice(0, 60) + '.svg');
  var own = nsStaff_([owner])[0];
  var o = { to: to.filter(function (x) { return x.email; }).map(function (x) { return x.email; }).join(','), cc: cc.filter(function (x) { return x.email; }).map(function (x) { return x.email; }).join(','),
    subject: m.subject, htmlBody: m.html, inlineImages: { qr: nsQrPng_(m.url, 600, 'qr.png') }, attachments: [png, svg], name: nsVN_(owner) + ' · Mani Medical Hanoi' };
  if (own && own.email) o.replyTo = own.email;
  if (!o.cc) delete o.cc;
  mmhMail_(o);
  var notes = [];
  /* quyền xem Sheet kết quả + theo dõi trên app MMH Survey */
  try { DriveApp.getFileById(L.reg.sheetId).addViewers(to.concat(cc).filter(function (x) { return x.email; }).map(function (x) { return x.email; })); }
  catch (x) { notes.push('Chưa chia sẻ được Sheet kết quả (' + x.message + ') — Sheet nằm trong Product Survey, người trong Shared drive vẫn mở được.'); }
  try { rsRead_().forEach(function (e) { if (e.sheetId === L.reg.sheetId) { sp.mail.to.forEach(function (p) { if (e.watch.indexOf(p) < 0) e.watch.push(p); }); rsWriteRow_(e); } }); } catch (x) {}
  st.mail = { at: new Date().toISOString(), by: me.pic, to: nsVNs_(sp.mail.to), cc: nsVNs_(sp.mail.cc), miss: miss };
  var line = 'Đã gửi email Marketing (' + nsVNs_(sp.mail.to).join(', ') + '; CC ' + nsVNs_(sp.mail.cc).join(', ') + ') lúc ' + Utilities.formatDate(new Date(), NS.TZ, 'HH:mm dd/MM/yyyy');
  var task = { ok: false };
  try {
    if (!st.task || !st.task.no) { st.task = nsHubTask_(st, owner); st.taskErr = ''; }
    task = nsHubDone_(st, owner, line);
  } catch (x) { task = { ok: false, error: x.message }; }
  if (!task.ok) notes.push('Email đã gửi nhưng chưa đánh dấu hoàn thành task Report Hub: ' + task.error);
  nsStoreSave_(L.ss, st); nsDrop_(code);
  return { ok: true, sent: st.mail, task: st.task || null, taskOk: !!task.ok, miss: miss, notes: notes };
}
