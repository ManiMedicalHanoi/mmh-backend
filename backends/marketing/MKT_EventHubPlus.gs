/*************************************************************************************************
 * MMH — MKT_EventHubPlus.gs   (v1.4 · 02/11/2026) — phần mở rộng của MKT_EventHub.gs (app "Sự kiện MKT")
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ① Email thư thường (mmhMail_, 1 email / người / lượt ghi): giao việc · nộp "Chờ duyệt" (⇒ Owner) · Owner trả lại (⇒ người làm)
 *    · bình luận / nhắc tên @Tên · nhắc việc thủ công (task.remind / event.remind) · đội sự kiện mới (event.add).
 *    Mọi email ghi vào tab NOTIFY. Bật / tắt từng loại: cấu hình (Script Property EH_CFG, app ▸ Cài đặt — quản lý).
 * ② Nhắc việc hằng ngày — trigger ehDaily (tự cài ở ehSyncTick_, giờ = cfg.remindHour, bỏ Chủ nhật + ngày nghỉ RPL_CAL):
 *    mỗi người 1 email: việc quá hạn + đến hạn trong cfg.before ngày; Owner thêm việc trễ / chưa giao của sự kiện mình điều phối;
 *    thứ Hai (cfg.weekly): bản tổng hợp các sự kiện 30 ngày tới cho TEAM ▸ Quản lý. Xem trước: action ehDaily (dry, mặc định).
 * ③ ehSave thêm op: event.add · event.delete · comment.add · comment.delete · task.remind · event.remind · cfg.save
 *    v1.4: note.add · note.update · note.delete — BIÊN BẢN HỌP (tab MEETINGS: ngày họp, tiêu đề, người dự, nội dung, việc cần làm; @Tên trong biên bản ⇒ thông báo).
 * ⑤ v1.4 — HỘP THÔNG BÁO CHUNG: mỗi thông báo (kể cả dữ liệu mẫu, kể cả khi tắt email) ghi 1 dòng vào sheet RH_Notify của Training Master
 *    (TF.MASTER_ID, ghi thẳng bằng SpreadsheetApp) ⇒ Report Hub / CRM hiện ở nút chuông "Thông báo" (Training Hub rhNotifyList, RH_Notify.gs).
 * ⑥ v1.5 (03/11/2026): nhắc việc theo bậc (Chờ duyệt ⇒ Owner · Pending ⇒ Owner · trễ ≥ escDays ⇒ quản lý mỗi ngày · thứ Sáu nhắc cập nhật tuần),
 *    email nhắc ghi thêm RH_Notify, biên bản họp ⇒ việc, email tuần có sự kiện chưa đóng + tình hình tuần — xem MKT_EventHubFlow.gs.
 * ④ Dữ liệu mẫu: action ehSample op=seed|clear|status (phiên Admin hoặc key = 8 ký tự cuối EH.ROOT). Mọi dòng có cột sample = x,
 *    tên sự kiện "(mẫu)", người phụ trách = nhân sự thật trong RH_Users ⇒ thử "Việc của tôi" được; KHÔNG email / nhắc việc cho dữ liệu mẫu,
 *    đồng bộ file kế hoạch không khớp vào sự kiện mẫu. Xoá: op=clear (hoặc app ▸ Cài đặt).
 *************************************************************************************************/
var EH_N = [];   /* email của lượt ghi hiện tại — ehSave_ đẩy vào, ehSaveN_ gửi */
var EH_CFG_DEF = { mailAssign: true, mailReview: true, mailComment: true, remind: true, remindHour: 8, before: 2, ownerDigest: true, weekly: true, escalate: true, escDays: 3, checkin: true };
var EH_IMG = 'https://manimedicalhanoi.github.io/Training-Hub/media/brand/';
var EH_DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function ehKey_(){ return EH.ROOT.slice(-8); }
function ehCfg_(){
  var c = {}; try { c = JSON.parse(PropertiesService.getScriptProperties().getProperty('EH_CFG') || '{}') || {}; } catch(e){}
  var o = {}; for (var k in EH_CFG_DEF) o[k] = (k in c) ? c[k] : EH_CFG_DEF[k]; return o;
}
function ehTrig_(force){
  var c = CacheService.getScriptCache(); if (!force && c.get('eh_trg')) return; c.put('eh_trg', '1', 21600);
  var ts = ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction() === 'ehDaily'; });
  if (ts.length && !force) return;
  ts.forEach(function(t){ ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('ehDaily').timeBased().everyDays(1).atHour(Math.max(5, Math.min(20, +ehCfg_().remindHour || 8))).nearMinute(10).create();
}
function ehSaveN_(p){
  EH_N = [];
  var out = ehSave_(p);
  if (out && out.ok && EH_N.length){
    try { var ss = ehBook_(), me = ehMe_(p, ss); out.mailed = ehNotify_(ss, me, EH_N, {}); } catch(e){ out.mailErr = String(e && e.message || e); }
  }
  EH_N = [];
  return out;
}
/* @Tên trong văn bản ⇒ danh sách PIC (tên dài khớp trước: "@Minh Trang" không bị hiểu là "@Trang") */
function ehMentions_(text){
  var names = ehPeople_().map(function(x){ return x.pic; }).sort(function(a, b){ return b.length - a.length; }), low = String(text || '').toLowerCase(), ment = [];
  names.forEach(function(n){ var k = '@' + n.toLowerCase(); if (low.indexOf(k) >= 0 && ment.indexOf(n) < 0){ ment.push(n); low = low.split(k).join(' '); } });
  return ment;
}
/* ⑤ hộp thông báo chung (Training Master ▸ RH_Notify) — Report Hub / CRM đọc qua Training Hub rhNotifyList */
var EH_NOTIFY_HDR = ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt'];
function ehFeed_(rows){
  if (!rows.length) return;
  try {
    var book = SpreadsheetApp.openById(TF.MASTER_ID), sh = book.getSheetByName('RH_Notify');
    if (!sh){ sh = book.insertSheet('RH_Notify'); sh.getRange(1, 1, 1, EH_NOTIFY_HDR.length).setValues([EH_NOTIFY_HDR]).setFontWeight('bold'); sh.setFrozenRows(1); }
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, EH_NOTIFY_HDR.length).setValues(rows);
  } catch(e){ Logger.log('ehFeed_: ' + (e && e.message || e)); }
}
function ehFeedRow_(pic, actor, items, subject){
  var one = items.length === 1 ? items[0] : null, x0 = items[0], txt = '';
  var withText = items.filter(function(x){ return x.text; })[0];
  if (withText) txt = withText.text;
  else txt = items.filter(function(x){ return x.task; }).map(function(x){ return '• ' + ehS_(x.task.title) + (ehS_(x.task.due) ? ' (hạn ' + ehD2_(x.task.due) + ')' : ''); }).join('\n');
  var kinds = []; items.forEach(function(x){ var k = x.note ? 'note' : x.kind; if (kinds.indexOf(k) < 0) kinds.push(k); });
  var url = EH.APP_URL + (one && one.task ? '#t-' + encodeURIComponent(ehS_(one.task.id)) : '#ev-' + encodeURIComponent(ehS_(x0.ev && x0.ev.id)) + (x0.note ? '/notes' : (x0.kind === 'mention' || x0.kind === 'comment') && !x0.task ? '/talk' : ''));
  return ['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), new Date(), pic, 'event', kinds.join(','), String(subject || '').replace(/^\[Sự kiện MKT\]\s*/, '').slice(0, 300),
          String(txt || '').slice(0, 900), url, actor, x0.ev ? ehS_(x0.ev.id) : '', one && one.task ? ehS_(one.task.id) : '', ''];
}
function ehD2_(iso){ var d = ehDate_(iso); return d ? Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd/MM') + ' (' + EH_DOW[d.getDay()] + ')' : 'chưa có hạn'; }
function ehDays_(a, b){ var x = ehDate_(a), y = ehDate_(b); return (x && y) ? Math.round((y - x) / 864e5) : 0; }
function ehH_(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
var EH_PROOF_VI = { file: 'file ấn phẩm / tài liệu', image: 'ảnh', link: 'link (bài đăng, form, video…)' };

/* ══════════ ① EMAIL ══════════ */
/* N = [{to, kind, ev, task, text, role, count}] ⇒ gộp theo người nhận ⇒ 1 email; trả [{pic, ok}] */
function ehNotify_(ss, me, N, opt){
  opt = opt || {};
  var cfg = ehCfg_(), U = ehUsers_(), need = { assign:'mailAssign', team:'mailAssign', review:'mailReview', 'return':'mailReview', comment:'mailComment', mention:'mailComment', block:'mailReview', checkin:'mailReview' };
  var by = {}, order = [], out = [], fBy = {}, fOrder = [];
  N.forEach(function(n){
    if (!n.to) return;
    if (!opt.self && me && n.to === me.pic) return;
    if (!opt.dry && n.kind !== 'daily'){ if (!fBy[n.to]){ fBy[n.to] = []; fOrder.push(n.to); } fBy[n.to].push(n); }
    if (n.ev && ehS_(n.ev.sample)){ if (!out.some(function(o){ return o.pic === n.to; })) out.push({ pic: n.to, ok: 'Dữ liệu mẫu — không gửi email thật' }); return; }
    if (need[n.kind] && !cfg[need[n.kind]]) return;
    if (!by[n.to]){ by[n.to] = []; order.push(n.to); }
    if (n.task && by[n.to].some(function(x){ return x.task && x.task.id === n.task.id && x.kind === n.kind; })) return;
    by[n.to].push(n);
  });
  var logs = [], actor = me && me.pic ? me.pic : 'Hệ thống', actorMail = me && me.pic && U[me.pic] ? U[me.pic].email : '';
  order.forEach(function(pic){
    var items = by[pic], m = ehMailFor_(pic, actor, items), u = U[pic];
    var kinds = []; items.forEach(function(x){ if (kinds.indexOf(x.kind) < 0) kinds.push(x.kind); });
    var row = { at: ehNow_(), to: pic, kind: kinds.join(','), eventId: items[0].ev ? ehS_(items[0].ev.id) : '', taskId: items.length === 1 && items[0].task ? ehS_(items[0].task.id) : '',
                subject: m.subject, ok: '', by: actor };
    if (!u || !u.email) row.ok = 'Không có email';
    else if (opt.dry) row.ok = 'Xem trước';
    else {
      try {
        var msg = { to: u.email, subject: m.subject, body: m.text, htmlBody: m.html, name: 'Sự kiện MKT · MMH' };
        if (actorMail && actorMail !== u.email) msg.replyTo = actorMail;
        mmhMail_(msg); row.ok = 'Đã gửi';
      } catch(e){ row.ok = 'Lỗi: ' + String(e && e.message || e).slice(0, 140); }
    }
    logs.push(row); out.push({ pic: pic, ok: row.ok });
  });
  if (logs.length && !opt.dry){ try { ehAppend_(ss, 'NOTIFY', EH.COLS.NOTIFY, logs); } catch(e){} }
  if (fOrder.length) ehFeed_(fOrder.map(function(pic){ return ehFeedRow_(pic, actor, fBy[pic], ehMailFor_(pic, actor, fBy[pic]).subject); }));
  return out;
}
function ehTaskLine_(t, ev, withEv){
  var today = ehIso_(new Date()), due = ehS_(t.due), late = due && due < today ? ehDays_(due, today) : 0;
  var parts = [(withEv && ev ? ehS_(ev.name) + ' · ' : '') + 'hạn ' + ehD2_(due) + (late ? ' — trễ ' + late + ' ngày' : due === today ? ' — hôm nay' : '')];
  if (ehS_(t.proof)) parts.push('khi xong nộp ' + (EH_PROOF_VI[ehS_(t.proof)] || ehS_(t.proof)) + ' hoặc ghi kết quả bằng chữ');   /* v1.7 */
  if (ehS_(t.priority) === 'Cao') parts.push('ưu tiên cao');
  var url = EH.APP_URL + '#t-' + encodeURIComponent(ehS_(t.id));
  return { text: '- ' + ehS_(t.title) + ' (' + parts.join(' · ') + ')\n  ' + url,
           html: '<li style="margin:0 0 8px"><a href="' + url + '" style="color:#1F4E9A;font-weight:600;text-decoration:none">' + ehH_(t.title) + '</a><br><span style="color:#555">' + ehH_(parts.join(' · ')) + '</span>' +
                 (ehS_(t.note) && !/Tạo khi đã qua hạn/.test(t.note) ? '<br><span style="color:#555">Ghi chú: ' + ehH_(String(t.note).slice(0, 300)) + '</span>' : '') + '</li>' };
}
function ehEvLine_(ev){ return ehS_(ev.name) + ' (' + ehD2_(ev.start) + (ehS_(ev.end) && ev.end !== ev.start ? ' – ' + ehD2_(ev.end) : '') + (ehS_(ev.city) ? ', ' + ehS_(ev.city) : '') + ')'; }
function ehLetter_(pic, paras){   /* thư thường: lời chào · các đoạn · ký tên */
  var html = '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a">' +
             '<p>Chào ' + ehH_(pic) + ',</p>' + paras.map(function(x){ return x.html; }).join('') +
             '<p>Mở app để cập nhật: <a href="' + EH.APP_URL + '">' + EH.APP_URL + '</a></p>' +
             '<p>Trân trọng,<br>Sự kiện MKT · MANI Medical Hanoi</p>' +
             '<p style="color:#888;font-size:12px">Email tự động từ app Sự kiện MKT. Trả lời email này sẽ gửi tới người vừa thao tác (nếu có).</p></div>';
  var text = 'Chào ' + pic + ',\n\n' + paras.map(function(x){ return x.text; }).join('\n\n') + '\n\nMở app: ' + EH.APP_URL + '\n\nTrân trọng,\nSự kiện MKT · MANI Medical Hanoi';
  return { html: html, text: text };
}
function ehList_(intro, items, withEv){
  var L = items.map(function(x){ return ehTaskLine_(x.task, x.ev, withEv); });
  return { html: '<p>' + intro + '</p><ul style="padding-left:20px;margin:0 0 12px">' + L.map(function(l){ return l.html; }).join('') + '</ul>',
           text: intro.replace(/<[^>]+>/g, '') + '\n' + L.map(function(l){ return l.text; }).join('\n') };
}
function ehMailFor_(pic, actor, items){
  var K = {}; items.forEach(function(x){ (K[x.kind] = K[x.kind] || []).push(x); });
  var paras = [], evs = []; items.forEach(function(x){ if (x.ev && evs.indexOf(ehS_(x.ev.name)) < 0) evs.push(ehS_(x.ev.name)); });
  var multiEv = evs.length > 1, evTxt = function(x){ return x.ev ? '<b>' + ehH_(ehEvLine_(x.ev)) + '</b>' : ''; };
  if (K.team) K.team.forEach(function(x){ paras.push({ html: '<p>' + ehH_(actor) + ' vừa tạo sự kiện ' + evTxt(x) + '. Bạn ở vai trò <b>' + ehH_(x.role) + '</b>' + (x.count ? ', được giao ' + x.count + ' việc.' : '.') + '</p>',
                                                       text: actor + ' vừa tạo sự kiện ' + ehEvLine_(x.ev) + '. Bạn ở vai trò ' + x.role + (x.count ? ', được giao ' + x.count + ' việc.' : '.') }); });
  if (K.assign) paras.push(ehList_(ehH_(actor) + ' vừa giao cho bạn ' + (K.assign.length > 1 ? K.assign.length + ' việc' : 'việc sau') + (multiEv ? ':' : ' trong sự kiện ' + evTxt(K.assign[0]) + ':'), K.assign, multiEv));
  if (K.review) paras.push(ehList_('Có ' + K.review.length + ' việc đã nộp kết quả, <b>chờ bạn duyệt</b> (bấm vào việc ▸ xem tệp / link ▸ chọn Xong, hoặc Đang làm để trả lại):', K.review, true));
  if (K['return']) K['return'].forEach(function(x){
    var l = ehTaskLine_(x.task, x.ev, true);
    paras.push({ html: '<p>' + ehH_(actor) + ' <b>trả lại</b> việc để chỉnh sửa' + (x.text ? ': “' + ehH_(x.text) + '”' : '.') + '</p><ul style="padding-left:20px;margin:0 0 12px">' + l.html + '</ul>',
                 text: actor + ' trả lại việc để chỉnh sửa' + (x.text ? ': "' + x.text + '"' : '.') + '\n' + l.text });
  });
  ['mention', 'comment'].forEach(function(k){ (K[k] || []).forEach(function(x){
    var where = x.note ? 'biên bản họp “' + ehH_(x.note.title) + '”' : x.task ? 'việc “' + ehH_(x.task.title) + '”' : 'sự kiện';
    var url = EH.APP_URL + (x.task ? '#t-' + encodeURIComponent(ehS_(x.task.id)) : '#ev-' + encodeURIComponent(ehS_(x.ev && x.ev.id)) + (x.note ? '/notes' : '/talk'));
    paras.push({ html: '<p>' + ehH_(actor) + (k === 'mention' ? ' nhắc đến bạn' : ' bình luận') + ' ở ' + where + ' — ' + evTxt(x) + ':</p>' +
                       '<p style="margin:0 0 12px;padding:8px 12px;border-left:3px solid #C3CDD8;color:#333">' + ehH_(x.text).replace(/\n/g, '<br>') + '</p><p><a href="' + url + '">Trả lời trên app</a></p>',
                 text: actor + (k === 'mention' ? ' nhắc đến bạn' : ' bình luận') + ' ở ' + where.replace(/[“”]/g, '"') + ':\n"' + x.text + '"\n' + url });
  }); });
  ehFlowParas_(K, actor, paras);   /* v1.5: Pending · cập nhật tuần (MKT_EventHubFlow.gs) */
  if (K.remind){
    var msg = K.remind.filter(function(x){ return x.text; })[0];
    paras.push(ehList_(ehH_(actor) + ' nhắc bạn các việc sau' + (multiEv ? '' : ' của sự kiện ' + evTxt(K.remind[0])) + ':', K.remind, multiEv));
    if (msg) paras.push({ html: '<p>Lời nhắn: “' + ehH_(msg.text) + '”</p>', text: 'Lời nhắn: "' + msg.text + '"' });
  }
  var one = items.length === 1 ? items[0] : null, subj;
  var ks = Object.keys(K);
  if (ks.length === 1 && K.assign) subj = one ? 'Việc mới: ' + ehS_(one.task.title) + ' · ' + ehS_(one.ev && one.ev.name) : 'Bạn được giao ' + items.length + ' việc' + (multiEv ? '' : ' · ' + evs[0]);
  else if (ks.length === 1 && K.review) subj = 'Chờ duyệt: ' + (one ? ehS_(one.task.title) : items.length + ' việc') + (multiEv ? '' : ' · ' + evs[0]);
  else if (ks.length === 1 && K['return']) subj = 'Cần chỉnh sửa: ' + ehS_(K['return'][0].task.title);
  else if (ks.length === 1 && K.mention && one && one.note) subj = actor + ' nhắc đến bạn trong biên bản họp · ' + evs[0];
  else if (ks.length === 1 && (K.mention || K.comment)) subj = actor + (K.mention ? ' nhắc đến bạn' : ' bình luận') + ' · ' + (one && one.task ? ehS_(one.task.title) : evs[0] || '');
  else if (ks.length === 1 && K.remind) subj = 'Nhắc việc: ' + items.length + ' việc' + (multiEv ? '' : ' · ' + evs[0]);
  else if (ks.length === 1 && K.team) subj = 'Sự kiện mới: ' + evs[0];
  else if (ehFlowSubj_(K, items, evs)) subj = ehFlowSubj_(K, items, evs);
  else subj = items.length + ' cập nhật mới cho bạn' + (multiEv ? '' : ' · ' + evs[0]);
  var L = ehLetter_(pic, paras);
  return { subject: '[Sự kiện MKT] ' + subj, html: L.html, text: L.text };
}

/* ══════════ ③ OP MỚI CỦA ehSave ══════════ */
function ehSave2_(ss, me, op, d, events, evBy, now){
  if (op === 'cfg.save'){
    if (!me.manager) return { ok:false, code:'PERM', error:'Chỉ quản lý được đổi cài đặt.' };
    var c = ehCfg_(), h0 = c.remindHour;
    ['mailAssign', 'mailReview', 'mailComment', 'remind', 'ownerDigest', 'weekly', 'escalate', 'checkin'].forEach(function(k){ if (k in d) c[k] = d[k] === true || d[k] === 'true' || d[k] === 1 || d[k] === '1'; });
    if ('escDays' in d) c.escDays = Math.max(1, Math.min(14, parseInt(d.escDays, 10) || 3));
    if ('remindHour' in d) c.remindHour = Math.max(5, Math.min(20, parseInt(d.remindHour, 10) || 8));
    if ('before' in d) c.before = Math.max(0, Math.min(7, parseInt(d.before, 10) || 0));
    PropertiesService.getScriptProperties().setProperty('EH_CFG', JSON.stringify(c));
    if (c.remindHour !== h0){ try { ehTrig_(true); } catch(e){} }
    ehLog_(ss, me, 'Cài đặt', '', '', 'Email / nhắc việc: ' + JSON.stringify(c));
    return { ok:true, cfg: c };
  }
  if (op === 'event.add'){
    if (!me.manager) return { ok:false, code:'PERM', error:'Chỉ quản lý được tạo sự kiện mới.' };
    var name = ehS_(d.name), st = ehS_(d.start), en = ehS_(d.end) || st;
    if (!name) return { ok:false, error:'Cần tên sự kiện.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(st)) return { ok:false, error:'Cần ngày bắt đầu.' };
    if (en < st) return { ok:false, error:'Ngày kết thúc trước ngày bắt đầu.' };
    var e = { id: 'EV' + st.replace(/-/g, '').slice(2) + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase(), name: name, start: st, end: en,
              type: ehS_(d.type) || 'Hội thảo', city: ehS_(d.city), venue: ehS_(d.venue), organizer: ehS_(d.organizer) || 'MMH', purpose: ehS_(d.purpose), audience: ehS_(d.audience),
              scale: ehS_(d.scale), products: ehS_(d.products), kpi: ehS_(d.kpi), note: ehS_(d.note), cover: ehS_(d.cover), target: ehS_(d.target), budgetPlan: ehS_(d.budgetPlan),
              state: ehS_(d.state), follow: 'Có', src: 'APP', updatedAt: now, updatedBy: me.pic };
    EH.ROLES.forEach(function(r){ e[r] = (r in d) ? ehS_(d[r]) : ehTeamDefault_(ss, r); });
    var tasks = d.template === false || d.template === '0' ? [] : ehTasksFor_(e, ehRead_(ss, 'TEMPLATE'));   /* v1.5: hạn mẫu đã qua ⇒ dồn hạn (ehCompress_) */
    var today = ehIso_(new Date());
    if (tasks.late) e.latePlan = String(tasks.late);
    tasks.forEach(function(t){ t.createdBy = me.pic; });
    ehAppend_(ss, 'EVENTS', EH.COLS.EVENTS, [e]);
    if (tasks.length) ehAppend_(ss, 'TASKS', EH.COLS.TASKS, tasks);
    var pr = PropertiesService.getScriptProperties(), gen = {}; try { gen = JSON.parse(pr.getProperty('EH_GEN') || '{}'); } catch(x){} gen[e.id] = today; pr.setProperty('EH_GEN', JSON.stringify(gen));
    ehLog_(ss, me, 'Tạo sự kiện', e.id, '', e.name + ' · ' + e.start + ' · ' + tasks.length + ' việc theo mẫu');
    if (d.notify !== false){
      var cnt = {}; tasks.forEach(function(t){ if (t.pic && t.parentId) cnt[t.pic] = (cnt[t.pic] || 0) + 1; });
      var done = {};
      EH.ROLES.forEach(function(r){ var who = ehS_(e[r]); if (!who || done[who]) return; done[who] = 1;
        var roles = EH.ROLES.filter(function(x){ return ehS_(e[x]) === who; }).join(' + ');
        EH_N.push({ to: who, kind: 'team', ev: e, role: roles, count: cnt[who] || 0 }); });
    }
    return { ok:true, event: e, tasks: tasks, tmp: ehS_(d.id) };
  }
  if (op === 'event.delete'){
    var ev = evBy[ehS_(d.id)]; if (!ev) return { ok:true };
    if (!me.manager) return { ok:false, code:'PERM', error:'Chỉ quản lý được xoá sự kiện.' };
    if (ehS_(ev.src) !== 'APP' && !ehS_(ev.sample)) return { ok:false, error:'Sự kiện lấy từ file kế hoạch / file MKT Offline — xoá ở file nguồn, hoặc đặt Theo dõi = Không.' };
    ehDropEvents_(ss, [ev.id]);
    ehLog_(ss, me, 'Xoá sự kiện', ev.id, '', ev.name);
    return { ok:true, deleted: ev.id };
  }
  if (op === 'comment.add'){
    var ev2 = evBy[ehS_(d.eventId)]; if (!ev2) return { ok:false, error:'Không thấy sự kiện.' };
    var text = ehS_(d.text).slice(0, 2000); if (!text) return { ok:false, error:'Bình luận trống.' };
    var tk = d.taskId ? ehRead_(ss, 'TASKS').filter(function(t){ return ehS_(t.id) === ehS_(d.taskId); })[0] : null;
    var ment = ehMentions_(text);
    var c = { id: /^tmp-/.test(ehS_(d.id)) || !ehS_(d.id) ? ehId_('C') : ehS_(d.id), eventId: ev2.id, taskId: tk ? ehS_(tk.id) : '', by: me.pic, at: now, text: text, mentions: ment.join(', '), sample: ehS_(ev2.sample) ? 'x' : '' };
    if (/^tmp-/.test(c.id)) c.id = ehId_('C');
    ehAppend_(ss, 'COMMENTS', EH.COLS.COMMENTS, [c]);
    ehLog_(ss, me, 'Bình luận', ev2.id, c.taskId, (tk ? tk.title + ' · ' : '') + text.slice(0, 200));
    var sent = {}; ment.forEach(function(n){ sent[n] = 1; EH_N.push({ to: n, kind: 'mention', ev: ev2, task: tk, text: text }); });
    if (tk && ehS_(tk.pic) && !sent[tk.pic]){ sent[tk.pic] = 1; EH_N.push({ to: ehS_(tk.pic), kind: 'comment', ev: ev2, task: tk, text: text }); }
    if (ehS_(ev2.Owner) && !sent[ev2.Owner]) EH_N.push({ to: ehS_(ev2.Owner), kind: 'comment', ev: ev2, task: tk, text: text });
    return { ok:true, comment: c, tmp: ehS_(d.id) };
  }
  if (op === 'note.add' || op === 'note.update'){
    var ev6 = evBy[ehS_(d.eventId)]; if (!ev6) return { ok:false, error:'Không thấy sự kiện.' };
    var team6 = EH.ROLES.map(function(r){ return ehS_(ev6[r]); });
    if (!ehCanEv_(me, ev6) && team6.indexOf(me.pic) < 0) return { ok:false, code:'PERM', error:'Chỉ người trong đội sự kiện được ghi biên bản họp.' };
    var dt = ehS_(d.date); if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) return { ok:false, error:'Cần ngày họp.' };
    var body = ehS_(d.content).slice(0, 20000), act6 = ehS_(d.actions).slice(0, 8000);
    if (!body && !act6 && !ehS_(d.title)) return { ok:false, error:'Biên bản trống.' };
    var M = ehRead_(ss, 'MEETINGS'), nt, old6 = '';
    if (op === 'note.update'){
      nt = M.filter(function(x){ return ehS_(x.id) === ehS_(d.id); })[0]; if (!nt) return { ok:false, error:'Không thấy biên bản (có thể đã bị xoá).' };
      if (ehS_(nt.by) !== me.pic && !ehCanEv_(me, ev6)) return { ok:false, code:'PERM', error:'Chỉ người ghi, Owner hoặc quản lý được sửa biên bản.' };
      old6 = ehS_(nt.content) + ' ' + ehS_(nt.actions);
    } else nt = { id: /^tmp-/.test(ehS_(d.id)) || !ehS_(d.id) ? ehId_('M') : ehS_(d.id), eventId: ev6.id, by: me.pic, at: now, sample: ehS_(ev6.sample) ? 'x' : '' };
    nt.date = dt; nt.title = ehS_(d.title).slice(0, 200) || 'Họp ' + dt.slice(8) + '/' + dt.slice(5, 7); nt.attendees = ehS_(d.attendees).slice(0, 500);
    nt.content = body; nt.actions = act6; nt.updatedAt = now; nt.updatedBy = me.pic;
    if (op === 'note.add') ehAppend_(ss, 'MEETINGS', EH.COLS.MEETINGS, [nt]); else ehPut_(ss, 'MEETINGS', EH.COLS.MEETINGS, nt);
    ehLog_(ss, me, op === 'note.add' ? 'Thêm biên bản họp' : 'Sửa biên bản họp', ev6.id, '', nt.title + ' · ' + dt);
    var txt6 = nt.title + ' (' + dt.slice(8) + '/' + dt.slice(5, 7) + '): ' + (body + (act6 ? '\nViệc cần làm: ' + act6 : '')).slice(0, 600);
    ehMentions_(body + ' ' + act6 + ' ' + nt.attendees).forEach(function(n){ if (old6.indexOf('@' + n) < 0) EH_N.push({ to: n, kind: 'mention', ev: ev6, task: null, text: txt6, note: nt }); });
    var nTasks = ehNoteTasks_(ss, me, ev6, nt, now);   /* v1.5: mỗi dòng "Việc cần làm sau họp" ⇒ 1 việc (MKT_EventHubFlow.gs) */
    return { ok:true, note: ehClean2_(nt), tmp: ehS_(d.id), tasks: nTasks };
  }
  if (op === 'note.delete'){
    var M2 = ehRead_(ss, 'MEETINGS'), nx = M2.filter(function(x){ return ehS_(x.id) === ehS_(d.id); })[0]; if (!nx) return { ok:true };
    if (ehS_(nx.by) !== me.pic && !ehCanEv_(me, evBy[ehS_(nx.eventId)])) return { ok:false, code:'PERM', error:'Chỉ người ghi, Owner hoặc quản lý được xoá biên bản.' };
    ss.getSheetByName('MEETINGS').deleteRow(nx._r);
    ehLog_(ss, me, 'Xoá biên bản họp', nx.eventId, '', ehS_(nx.title) + ' · ' + ehS_(nx.date));
    return { ok:true, deleted: nx.id };
  }
  if (op === 'comment.delete'){
    var cs = ehRead_(ss, 'COMMENTS'), cx = cs.filter(function(x){ return ehS_(x.id) === ehS_(d.id); })[0]; if (!cx) return { ok:true };
    if (ehS_(cx.by) !== me.pic && !me.manager) return { ok:false, code:'PERM', error:'Chỉ người viết hoặc quản lý được xoá bình luận.' };
    ss.getSheetByName('COMMENTS').deleteRow(cx._r);
    return { ok:true, deleted: cx.id };
  }
  if (op === 'task.remind' || op === 'event.remind'){
    var cache = CacheService.getScriptCache(), T = ehRead_(ss, 'TASKS');
    if (op === 'task.remind'){
      var t1 = T.filter(function(t){ return ehS_(t.id) === ehS_(d.id); })[0]; if (!t1) return { ok:false, error:'Không thấy việc.' };
      var e1 = evBy[ehS_(t1.eventId)];
      if (!ehCanEv_(me, e1)) return { ok:false, code:'PERM', error:'Chỉ quản lý hoặc Owner của sự kiện được gửi nhắc.' };
      if (!ehS_(t1.pic)) return { ok:false, error:'Việc chưa có người phụ trách.' };
      var ck = 'ehr_' + t1.id, last = cache.get(ck); if (last && !ehS_(e1.sample)) return { ok:false, error:'Đã nhắc việc này lúc ' + last + ' — chờ 20 phút rồi nhắc lại.' };
      cache.put(ck, Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm'), 1200);
      EH_N.push({ to: ehS_(t1.pic), kind: 'remind', ev: e1, task: t1, text: ehS_(d.text) });
      ehLog_(ss, me, 'Nhắc việc', e1.id, t1.id, t1.title + ' ⇒ ' + t1.pic + (ehS_(d.text) ? ' · ' + ehS_(d.text) : ''));
      return { ok:true, reminded: [ehS_(t1.pic)] };
    }
    var e2 = evBy[ehS_(d.eventId)]; if (!e2) return { ok:false, error:'Không thấy sự kiện.' };
    if (!ehCanEv_(me, e2)) return { ok:false, code:'PERM', error:'Chỉ quản lý hoặc Owner của sự kiện được gửi nhắc.' };
    var ck2 = 'ehre_' + e2.id; if (cache.get(ck2) && !ehS_(e2.sample)) return { ok:false, error:'Vừa nhắc cả đội sự kiện này — chờ 20 phút rồi nhắc lại.' };
    var lim = ehIso_(new Date(Date.now() + (parseInt(d.days, 10) || 7) * 864e5)), par = {}, who = {};
    T.forEach(function(t){ if (ehS_(t.parentId)) par[t.parentId] = 1; });
    T.forEach(function(t){
      if (ehS_(t.eventId) !== e2.id || !ehS_(t.pic) || ehS_(t.pic) === me.pic || (!ehS_(t.parentId) && par[t.id])) return;
      if (/^(Xong|Bỏ qua)$/.test(ehS_(t.status)) || !ehS_(t.due) || ehS_(t.due) > lim) return;
      if (d.pics && d.pics.length && d.pics.indexOf(ehS_(t.pic)) < 0) return;
      who[t.pic] = 1; EH_N.push({ to: ehS_(t.pic), kind: 'remind', ev: e2, task: t, text: ehS_(d.text) });
    });
    var L = Object.keys(who); if (!L.length) return { ok:false, error:'Không có việc nào chưa xong đến hạn trong ' + (parseInt(d.days, 10) || 7) + ' ngày tới.' };
    cache.put(ck2, '1', 1200);
    ehLog_(ss, me, 'Nhắc việc', e2.id, '', 'Nhắc ' + L.join(', ') + (ehS_(d.text) ? ' · ' + ehS_(d.text) : ''));
    return { ok:true, reminded: L };
  }
  return null;
}
/* xoá sự kiện + việc + tệp + bình luận + nhật ký + kế hoạch (dùng cho event.delete và dữ liệu mẫu) */
function ehDropEvents_(ss, ids){
  var bad = {}; ids.forEach(function(i){ bad[i] = 1; });
  var n = 0;
  [['EVENTS', 'id'], ['TASKS', 'eventId'], ['FILES', 'eventId'], ['COMMENTS', 'eventId'], ['MEETINGS', 'eventId'], ['CHECKINS', 'eventId'], ['LOG', 'eventId'], ['PLAN_JSON', 'eventId']].forEach(function(x){
    var rows = ehRead_(ss, x[0]), keep = rows.filter(function(r){ return !bad[ehS_(r[x[1]])] && !(x[0] !== 'LOG' && x[0] !== 'PLAN_JSON' && ehS_(r.sample) && ids.SAMPLE); });
    if (keep.length !== rows.length){ n += rows.length - keep.length; ehRewrite_(ss, x[0], EH.COLS[x[0]], keep); }
  });
  try {
    var pr = PropertiesService.getScriptProperties(), gen = JSON.parse(pr.getProperty('EH_GEN') || '{}'), ch = false;
    ids.forEach(function(i){ if (gen[i]){ delete gen[i]; ch = true; } }); if (ch) pr.setProperty('EH_GEN', JSON.stringify(gen));
  } catch(e){}
  return n;
}

/* ══════════ ② NHẮC VIỆC HẰNG NGÀY ══════════ */
function ehDaily(){ try { ehDaily_({}); } catch(e){ Logger.log('ehDaily: ' + (e && e.message || e)); } }
function ehDailyApi_(p){
  if (String(p.key || '') !== ehKey_()){
    var ss = ehBook_(), me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error:me.err };
    if (!me.manager) return { ok:false, code:'PERM', error:'Chỉ quản lý được xem trước / gửi nhắc việc.' };
  }
  return ehDaily_({ force: true, dry: String(p.send || '') !== '1', pic: ehS_(p.pic), weekly: String(p.weekly || '') === '1', checkin: String(p.checkin || '') === '1' });
}
function ehDaily_(opt){
  opt = opt || {};
  var cfg = ehCfg_(), now = new Date(), today = ehIso_(now), pr = PropertiesService.getScriptProperties();
  if (!opt.force){
    if (!cfg.remind) return { ok:true, skip:'Đã tắt nhắc việc' };
    if (now.getDay() === 0 || ehHoli_()[today]) return { ok:true, skip:'Ngày nghỉ' };
    if (pr.getProperty('EH_DAILY') === today) return { ok:true, skip:'Đã gửi hôm nay' };
    pr.setProperty('EH_DAILY', today);
  }
  var ss = ehBook_(), events = ehRead_(ss, 'EVENTS'), evBy = {}, T = ehRead_(ss, 'TASKS'), par = {};
  events.forEach(function(e){ evBy[ehS_(e.id)] = e; });
  T.forEach(function(t){ if (ehS_(t.parentId)) par[t.parentId] = 1; });
  var lim = ehIso_(new Date(now.getTime() + (+cfg.before || 0) * 864e5)), escD = Math.max(1, +cfg.escDays || 3);
  var per = {}, own = {}, wait = {}, blk = {}, esc = [], live = [];
  var push = function(m, k, x){ (m[k] = m[k] || []).push(x); };
  T.forEach(function(t){
    var e = evBy[ehS_(t.eventId)]; if (!e || ehS_(e.sample) || ehS_(e.state) === 'Huỷ' || ehS_(e.follow) === 'Không' || ehS_(e.closedAt)) return;   /* v1.5: sự kiện đã đóng ⇒ thôi nhắc */
    if (!ehS_(t.parentId) && par[t.id]) return;
    live.push(t);
    var st = ehS_(t.status); if (/^(Xong|Bỏ qua)$/.test(st)) return;
    var due = ehS_(t.due), pic = ehS_(t.pic), ow = ehS_(e.Owner), x = { task: t, ev: e, late: !!due && due < today };
    /* v1.5: đã nộp "Chờ duyệt" ⇒ đến lượt Owner, không nhắc người làm · "Pending" ⇒ Owner hỗ trợ */
    if (st === 'Chờ duyệt'){ if (cfg.ownerDigest && ow && ow !== pic) push(wait, ow, x); return; }
    if (st === 'Pending'){ if (ow && ow !== pic) push(blk, ow, x); if (cfg.escalate && ehDays_(ehS_(t.updatedAt).slice(0, 10) || today, today) >= 2) esc.push(x); return; }
    if (!due || due > lim) return;
    if (pic) push(per, pic, x);
    if (cfg.ownerDigest && ow && ow !== pic && (x.late || !pic)) push(own, ow, x);
    if (cfg.escalate && x.late && ehDays_(due, today) >= escD) esc.push(x);
  });
  var mgrs = ehMgrs_(ss), weekly = (opt.weekly || (now.getDay() === 1 && cfg.weekly));
  /* thứ Sáu: Owner chưa cập nhật tình hình tuần cho sự kiện đang theo dõi */
  var ck = {}, wk = ehWeekOf_(today), CK = ehRead_(ss, 'CHECKINS'), hasCk = {};
  CK.forEach(function(c){ if (ehS_(c.week) === wk) hasCk[ehS_(c.eventId)] = 1; });
  if (cfg.checkin && (now.getDay() === 5 || opt.checkin)) events.forEach(function(e){
    if (!ehActive_(e, today) || hasCk[e.id] || !ehS_(e.Owner) || ehDays_(today, ehS_(e.start)) > 60) return;
    push(ck, ehS_(e.Owner), e);
  });
  var who = [].concat(Object.keys(per), Object.keys(own), Object.keys(wait), Object.keys(blk), Object.keys(ck), esc.length ? mgrs : [], weekly ? mgrs : []).filter(function(x, i, a){ return a.indexOf(x) === i; });
  if (opt.pic) who = who.filter(function(x){ return x === opt.pic; });
  var U = ehUsers_(), logs = [], preview = [], feed = [];
  var byDue = function(a, b){ return ehS_(a.task.due) < ehS_(b.task.due) ? -1 : 1; };
  who.forEach(function(pic){
    var mine = (per[pic] || []).sort(byDue), mo = own[pic] || [], wt = (wait[pic] || []).sort(byDue), bk = blk[pic] || [], cks = ck[pic] || [], paras = [];
    var late = mine.filter(function(x){ return x.late; }), soon = mine.filter(function(x){ return !x.late; }), ex = mgrs.indexOf(pic) >= 0 ? esc.sort(byDue) : [];
    if (late.length) paras.push(ehList_('<b>' + late.length + ' việc quá hạn</b> — hoàn thành, hoặc chuyển “Pending” trên app nếu cần Owner hỗ trợ:', late, true));
    if (soon.length) paras.push(ehList_('<b>' + soon.length + ' việc đến hạn</b> ' + (cfg.before ? 'trong ' + cfg.before + ' ngày tới' : 'hôm nay') + ':', soon, true));
    if (wt.length) paras.push(ehList_('<b>' + wt.length + ' việc đã nộp, chờ bạn duyệt</b> (người làm không bị nhắc nữa — việc đang nằm ở bạn):', wt, true));
    if (bk.length) paras.push(ehList_('<b>' + bk.length + ' việc Pending</b>, người làm cần bạn hỗ trợ:', bk.map(function(x){ var t = {}; for (var k in x.task) t[k] = x.task[k]; t.note = 'Lý do Pending: ' + ehS_(x.task.block); return { task: t, ev: x.ev }; }), true));
    if (mo.length) paras.push(ehList_('Sự kiện bạn điều phối có <b>' + mo.filter(function(x){ return x.late; }).length + ' việc trễ</b> của người khác' +
                                      (mo.some(function(x){ return !ehS_(x.task.pic); }) ? ' và việc <b>chưa giao</b>' : '') + ':', mo.slice(0, 25), true));
    if (cks.length) paras.push({ html: '<p><b>Cập nhật tình hình tuần</b> (1 phút / sự kiện: Xanh · Vàng · Đỏ, đã làm gì, vấn đề tồn đọng):</p><ul style="padding-left:20px;margin:0 0 12px">' +
                                       cks.map(function(e){ return '<li><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(e.id) + '/week">' + ehH_(ehEvLine_(e)) + '</a></li>'; }).join('') + '</ul>',
                                 text: 'Cập nhật tình hình tuần:\n' + cks.map(function(e){ return '- ' + ehEvLine_(e) + '\n  ' + EH.APP_URL + '#ev-' + e.id + '/week'; }).join('\n') });
    if (ex.length) paras.push(ehList_('<b>' + ex.length + ' việc trễ từ ' + escD + ' ngày / Pending từ 2 ngày</b> ở các sự kiện (bạn nhận vì là quản lý):', ex.slice(0, 30).map(function(x){ var t = {}; for (var k in x.task) t[k] = x.task[k]; t.note = (ehS_(t.pic) ? 'Người làm: ' + t.pic : 'Chưa giao người') + (ehS_(t.block) ? ' · Lý do Pending: ' + t.block : ''); return { task: t, ev: x.ev }; }), true));
    if (weekly && mgrs.indexOf(pic) >= 0) paras.push(ehWeekly_(events, live, today, CK));
    if (!paras.length) return;
    var subj = '[Sự kiện MKT] Việc cần làm ' + Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'dd/MM') + ': ' +
               [late.length ? late.length + ' quá hạn' : '', soon.length ? soon.length + ' sắp đến hạn' : '', wt.length ? wt.length + ' chờ bạn duyệt' : '', bk.length ? bk.length + ' Pending' : '',
                mo.length ? mo.length + ' cần theo dõi' : '', cks.length ? 'cập nhật tuần' : '', ex.length ? ex.length + ' trễ lâu' : '', weekly && mgrs.indexOf(pic) >= 0 ? 'tổng hợp tuần' : ''].filter(String).join(' · ');
    var L = ehLetter_(pic, paras), u = U[pic], row = { at: ehNow_(), to: pic, kind: 'daily', eventId: '', taskId: '', subject: subj, ok: '', by: 'Hệ thống' };
    if (!u || !u.email) row.ok = 'Không có email';
    else if (opt.dry) row.ok = 'Xem trước';
    else { try { mmhMail_({ to: u.email, subject: subj, body: L.text, htmlBody: L.html, name: 'Sự kiện MKT · MMH' }); row.ok = 'Đã gửi'; } catch(e){ row.ok = 'Lỗi: ' + String(e && e.message || e).slice(0, 140); } }
    logs.push(row); preview.push({ to: pic, subject: subj, late: late.length, soon: soon.length, wait: wt.length, block: bk.length, owner: mo.length, esc: ex.length, ok: row.ok, html: opt.dry && opt.pic ? L.html : undefined });
    /* v1.5: hộp thông báo chung (Report Hub / CRM ▸ Nhắc tôi) — 1 dòng / người / ngày */
    var lines = [].concat(late, soon, wt, bk).slice(0, 8).map(function(x){ return '• ' + ehS_(x.task.title) + ' — ' + ehS_(x.ev.name) + (ehS_(x.task.due) ? ' (hạn ' + ehD2_(x.task.due) + ')' : ''); });
    if (cks.length) lines.push('• Cập nhật tình hình tuần: ' + cks.map(function(e){ return ehS_(e.name); }).join(', '));
    feed.push(['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), new Date(), pic, 'event', 'daily', subj.replace(/^\[Sự kiện MKT\]\s*/, '').slice(0, 300), lines.join('\n').slice(0, 900),
               EH.APP_URL + (cks.length && !mine.length ? '#ev-' + encodeURIComponent(cks[0].id) + '/week' : '#mine'), 'Hệ thống', '', '', '']);
  });
  if (logs.length && !opt.dry){ try { ehAppend_(ss, 'NOTIFY', EH.COLS.NOTIFY, logs); } catch(e){} }
  if (feed.length && !opt.dry) ehFeed_(feed);
  return { ok:true, dry: !!opt.dry, date: today, people: preview.length, items: preview };
}
/* tổng hợp tuần cho quản lý: sự kiện 30 ngày tới + sự kiện đã diễn ra chưa đóng · tình hình tuần gần nhất (Owner cập nhật) */
function ehWeekly_(events, live, today, CK){
  var lim = ehIso_(new Date(ehDate_(today).getTime() + 30 * 864e5)), rows = [], last = {};
  (CK || []).forEach(function(c){ var k = ehS_(c.eventId); if (!last[k] || ehS_(c.week) + ehS_(c.at) > ehS_(last[k].week) + ehS_(last[k].at)) last[k] = c; });
  events.filter(function(e){ return ehActive_(e, today) && ehS_(e.start) <= lim; })
    .sort(function(a, b){ return a.start < b.start ? -1 : 1; }).forEach(function(e){
      var ts = live.filter(function(t){ return ehS_(t.eventId) === e.id && ehS_(t.status) !== 'Bỏ qua'; }), done = ts.filter(function(t){ return ehS_(t.status) === 'Xong'; }).length;
      var late = ts.filter(function(t){ return ehS_(t.status) !== 'Xong' && ehS_(t.due) && ehS_(t.due) < today; }).length, none = ts.filter(function(t){ return !ehS_(t.pic) && ehS_(t.status) !== 'Xong'; }).length;
      var blk = ts.filter(function(t){ return ehS_(t.status) === 'Pending'; }).length, c = last[e.id], after = ehS_(e.end || e.start) < today;
      rows.push({ e: e, pct: ts.length ? Math.round(done / ts.length * 100) : 0, late: late, none: none, blk: blk, n: ts.length, c: c, after: after });
    });
  if (!rows.length) return { html: '<p>Tổng hợp tuần: không có sự kiện nào đang theo dõi.</p>', text: 'Tổng hợp tuần: không có sự kiện nào đang theo dõi.' };
  var td = 'padding:6px 10px;border-bottom:1px solid #E6EAEF;text-align:left;vertical-align:top', col = { 'Xanh': '#2E7D4F', 'Vàng': '#B26B00', 'Đỏ': '#B83A2E' };
  var tw = ehWeekOf_(today), ckTxt = function(r){ var c = r.c; if (!c) return 'Chưa cập nhật'; return (ehS_(c.week) === tw ? '' : '(tuần ' + ehD2_(c.week).slice(0, 5) + ') ') + c.rag + (ehS_(c.block) ? ' · Tồn đọng: ' + ehS_(c.block) : '') + (ehS_(c.help) ? ' · Cần hỗ trợ: ' + ehS_(c.help) : ''); };
  return { html: '<p><b>Tổng hợp tuần — sự kiện đang theo dõi</b> (30 ngày tới + đã diễn ra chưa đóng)</p><table style="border-collapse:collapse;font-size:13.5px;margin:0 0 12px"><tr><th style="' + td + '">Sự kiện</th><th style="' + td + '">Ngày</th><th style="' + td + '">Xong</th><th style="' + td + '">Trễ</th><th style="' + td + '">Pending</th><th style="' + td + '">Chưa giao</th><th style="' + td + '">Owner cập nhật tuần</th></tr>' +
                   rows.map(function(r){ var c = r.c;
                     return '<tr><td style="' + td + '"><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(r.e.id) + '">' + ehH_(r.e.name) + '</a>' + (r.after ? '<br><span style="color:#B26B00">Đã diễn ra · chưa đóng</span>' : '') + '</td><td style="' + td + '">' + ehD2_(r.e.start) + '</td><td style="' + td + '">' + r.pct +
                       '%</td><td style="' + td + (r.late ? ';color:#B83A2E;font-weight:600' : '') + '">' + r.late + '</td><td style="' + td + (r.blk ? ';color:#B26B00;font-weight:600' : '') + '">' + r.blk + '</td><td style="' + td + '">' + r.none +
                       '</td><td style="' + td + (c ? ';color:' + (col[c.rag] || '#333') : ';color:#888') + '">' + ehH_(ckTxt(r)) + '</td></tr>'; }).join('') + '</table>',
           text: 'Tổng hợp tuần — sự kiện đang theo dõi:\n' + rows.map(function(r){ return '- ' + r.e.name + ' · ' + ehD2_(r.e.start) + (r.after ? ' · đã diễn ra, chưa đóng' : '') + ' · xong ' + r.pct + '% · trễ ' + r.late + ' · Pending ' + r.blk + ' · chưa giao ' + r.none + ' · ' + ckTxt(r); }).join('\n') };
}

/* ══════════ ④ DỮ LIỆU MẪU ══════════ */
function ehSample_(p){
  var ss = ehBook_(), me = null;
  if (String(p.key || '') !== ehKey_()){
    me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error:me.err };
    if (!me.admin) return { ok:false, code:'PERM', error:'Chỉ Admin được nạp / xoá dữ liệu mẫu.' };
  }
  var op = String(p.op || 'status'), lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok:false, busy:true, error:'Hệ thống đang bận, thử lại sau.' };
  try {
    var cnt = function(){ var o = {}; ['EVENTS', 'TASKS', 'FILES', 'COMMENTS', 'MEETINGS', 'CHECKINS'].forEach(function(t){ var R = ehRead_(ss, t); o[t] = { all: R.length, sample: R.filter(function(r){ return ehS_(r.sample); }).length }; }); return o; };
    var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EH_LAST') || '{}'); } catch(e){}
    if (op === 'status') return { ok:true, ver: EH.VER, book: ss.getUrl(), counts: cnt(), sync: last, cfg: ehCfg_() };
    var ids = ehRead_(ss, 'EVENTS').filter(function(e){ return ehS_(e.sample); }).map(function(e){ return ehS_(e.id); });
    var removed = ids.length ? ehDropEvents_(ss, ids) : 0;
    var out = { ok:true, removed: removed };
    if (op === 'seed') out.seeded = ehSampleSeed_(ss, me);
    SpreadsheetApp.flush(); CacheService.getScriptCache().remove('eh_boot');
    out.counts = cnt(); out.book = ss.getUrl();
    return out;
  } finally { try { lock.releaseLock(); } catch(e){} }
}
function ehSampleSeed_(ss, me){
  var U = ehUsers_(), all = Object.keys(U), today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var add = function(n){ var d = new Date(today); d.setDate(d.getDate() + n); return ehIso_(d); };
  var tag = function(p){ return (U[p].dept + ' ' + U[p].title).toLowerCase(); };
  var mkt = all.filter(function(p){ return /mkt|marketing|digital|design|trade|truyền thông|thiết kế/.test(tag(p)); });
  var DEF = ehTeamDef_();   /* v1.3 */
  var sales = all.filter(function(p){ var ti = U[p].title.toLowerCase(); return /sale|kinh doanh/.test(ti) && !/marketing|admin|director|giám đốc|head|hod/.test(ti) && !U[p].admin; });
  if (!sales.length) sales = all.filter(function(p){ return /sale|dental|surgical|eyeless|kinh doanh/.test(tag(p)) && mkt.indexOf(p) < 0; });
  var lead = (me && me.pic) || all.filter(function(p){ return U[p].admin; })[0] || mkt[0] || all[0] || 'Admin';
  if (mkt.length < 4) mkt = mkt.concat(all.filter(function(p){ return mkt.indexOf(p) < 0 && sales.indexOf(p) < 0 && p !== lead; })).slice(0, 6);
  if (!mkt.length) mkt = [lead];
  if (!sales.length) sales = all.slice(-3).length ? all.slice(-3) : [lead];
  var seed = 11, rnd = function(){ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  var pick = function(a, i){ return a[((i % a.length) + a.length) % a.length]; };
  var EVS = [
    { name: 'Workshop Composite thẩm mỹ răng trước (mẫu)', s: 6, n: 0, type: 'Workshop', city: 'Hà Nội', venue: 'Phòng hội thảo tầng 5, 18 Tam Trinh (mẫu)', products: 'Composite, MANI Bond', target: 40, budget: 45e6, cover: 'ws-comp-1.jpg',
      purpose: 'Giới thiệu bộ Composite MANI cho phục hình răng trước, tăng khách dùng thử', audience: 'Bác sĩ phục hình, nha khoa thẩm mỹ', kpi: '40 khách tham dự · 15 khách mua thử' },
    { name: 'Webinar nội nha với trâm JIZAI (mẫu)', s: 13, n: 0, type: 'Webinar', city: 'Online', venue: 'Zoom Webinar', products: 'JIZAI', target: 150, budget: 8e6, cover: 'ws-jizai-3.jpg',
      purpose: 'Chia sẻ quy trình tạo hình ống tủy với JIZAI', audience: 'Bác sĩ nội nha toàn quốc', kpi: '150 người đăng ký · 90 người xem trực tiếp' },
    { name: 'Triển lãm Răng Hàm Mặt miền Bắc (mẫu)', s: 20, n: 2, type: 'Triển lãm', city: 'Hải Phòng', venue: 'Trung tâm Hội nghị TP (mẫu) · gian hàng B12', products: "JIZAI, Composite, Bleach'N Shine, #1559L", target: 300, budget: 180e6, cover: 'carbide-app.jpg',
      purpose: 'Gian hàng 18m², bán hàng cùng NPP, thu thông tin khách', audience: 'Bác sĩ RHM miền Bắc', kpi: '300 lượt ghé gian hàng · 120 khách để lại thông tin' },
    { name: 'Hội thảo phẫu thuật nhãn khoa (mẫu)', s: 41, n: 1, type: 'Hội thảo', city: 'Đà Nẵng', venue: 'Khách sạn (chờ chốt)', products: 'Ophthalmic Knife, Manipler', target: 80, budget: 90e6, cover: 'knife-hero.jpg', state: 'Chờ chốt',
      purpose: 'Giới thiệu dao nhãn khoa MANI cho bác sĩ phẫu thuật', audience: 'Bác sĩ nhãn khoa miền Trung', kpi: '80 khách · 10 bệnh viện dùng thử' },
    { name: 'JIZAI Journey — hands-on (mẫu)', s: 70, n: 1, type: 'Workshop', city: 'TP.HCM', venue: 'Trung tâm đào tạo (mẫu)', products: 'JIZAI', target: 30, budget: 60e6, cover: 'ws-jizai-1.jpg',
      purpose: 'Thực hành tạo hình ống tủy trên răng nhựa', audience: 'Bác sĩ nội nha', kpi: '30 học viên · 20 bộ JIZAI bán ra' },
    { name: 'Hội nghị Phục hình thẩm mỹ (mẫu)', s: -18, n: 1, type: 'Hội thảo', city: 'Hà Nội', venue: 'Khách sạn (mẫu)', products: 'Composite, Dia-Burs', target: 120, actual: 134, budget: 70e6, spent: 64.5e6, cover: 'ws-restorative.jpg',
      purpose: 'Báo cáo khoa học + gian hàng', audience: 'Bác sĩ phục hình', kpi: '120 khách · 30 đơn hàng' },
    { name: "Webinar Bleach'N Shine (mẫu)", s: -35, n: 0, type: 'Webinar', city: 'Online', venue: 'Zoom Webinar', products: "Bleach'N Shine", target: 100, actual: 96, budget: 6e6, spent: 5.2e6, cover: 'bleach-shine.png',
      purpose: 'Giới thiệu sản phẩm tẩy trắng', audience: 'Bác sĩ nha khoa thẩm mỹ', kpi: '100 người xem' }
  ];
  var tpl = ehRead_(ss, 'TEMPLATE'), E = [], TK = [], F = [], C = [], LG = [], MT = [], CK = [], now = ehNow_(), wk0 = ehWeekOf_(ehIso_(today));
  var IMG = [[/key visual|poster/i, ['ws-comp-1.jpg', 'ws-jizai-1.jpg', 'ws-led-hn.jpg', 'ws-restorative.jpg', 'ws-led-vp.jpg', 'knife-hero.jpg', 'bleach-shine.png']],
             [/backdrop|vách/i, ['ws-jizai-2.jpg']], [/standee/i, ['standee.png']], [/flyer|brochure|ctkm/i, ['line-01.png', 'line-02.png', 'diabur-ipr.png', 'line-04.png']],
             [/thẻ đeo|bảng tên|check-in có/i, ['catalog-p3.png']], [/set ?up|gian hàng \(ảnh/i, ['ws-jizai-kit.jpg']], [/ảnh \/ video/i, ['ws-jizai-3.jpg', 'ws-comp-2.jpg', 'ws-comp-3.jpg']],
             [/teaser|giới thiệu chương|đếm ngược|cảm ơn/i, ['line-03.png', 'line-05.png', 'line-06.png', 'ws-comp-3.jpg', 'comp-nano.png', 'mani-bond.png']], [/video recap/i, ['ws-jizai-3.jpg']]];
  var imgFor = function(title, i){ for (var k = 0; k < IMG.length; k++) if (IMG[k][0].test(title)) return pick(IMG[k][1], i); return ''; };
  var pdf = EH.APP_URL + 'sample/tai-lieu-mau.pdf';
  EVS.forEach(function(x, i){
    var e = { id: 'EVMAU-' + (i + 1), name: x.name, start: add(x.s), end: add(x.s + x.n), type: x.type, city: x.city, venue: x.venue, organizer: 'MMH', purpose: x.purpose, audience: x.audience,
              scale: x.target + ' khách', kpi: x.kpi, products: x.products, state: x.state || '', follow: 'Có', src: 'SAMPLE', cover: x.cover, target: x.target, actual: x.actual || '',
              budgetPlan: x.budget, budgetActual: x.spent || '', npp: 'NPP khu vực (mẫu)', note: 'Dữ liệu mẫu để thử app — xoá ở Cài đặt ▸ Dữ liệu mẫu.', updatedAt: now, updatedBy: 'Hệ thống', sample: 'x' };
    /* v1.3: đúng vai trò (MKT_EventHubTeam.gs) — Owner Thuong · Digital Minh Trang · Design Duc Anh · Trade (hậu cần) Trang */
    e.Owner = DEF.Owner || lead; e.Digital = DEF.Digital || pick(mkt, i + 1); e.Design = i === 3 ? '' : (DEF.Design || pick(mkt, i + 2)); e.Trade = x.type === 'Webinar' ? '' : (DEF.Trade || pick(mkt, i + 3)); e.Sales = pick(sales, i);
    E.push(e);
    var ts = ehTasksFor_(e, tpl, { keep: true }), kids = {}, endIso = e.end, past = endIso < ehIso_(today);
    ts.forEach(function(t){ if (t.parentId) kids[t.parentId] = 1; });
    ts.forEach(function(t, j){
      t.sample = 'x'; t.note = ''; t.status = 'Chưa làm'; t.createdBy = 'Hệ thống';
      if (!t.parentId && kids[t.id]) return;
      var dd = ehDays_(ehIso_(today), t.due), r = rnd(), st;
      if (past) st = (/chuyển đổi|follow/i.test(t.title + t.group) && r < .5) ? 'Đang làm' : 'Xong';
      else if (!t.due) st = 'Chưa làm';
      else if (dd < -3) st = r < .9 ? 'Xong' : 'Đang làm';
      else if (dd < 0) st = r < .55 ? 'Xong' : r < .85 ? 'Đang làm' : 'Chưa làm';
      else if (dd <= 4) st = r < .2 ? 'Xong' : r < .55 ? 'Chờ duyệt' : r < .82 ? 'Đang làm' : 'Chưa làm';
      else if (dd <= 10) st = r < .15 ? 'Xong' : r < .4 ? 'Đang làm' : 'Chưa làm';
      else st = r < .06 ? 'Đang làm' : 'Chưa làm';
      if (st === 'Chờ duyệt' && !t.proof) st = 'Đang làm';
      t.status = st;
      if (r > .93 && st !== 'Xong') t.priority = 'Cao';
      if (st === 'Xong' || st === 'Chờ duyệt'){
        var dn = ehDate_(t.due) || new Date(today); dn.setDate(dn.getDate() - Math.floor(rnd() * 3)); if (dn > today) dn = new Date(today);
        var at = ehIso_(dn) + 'T' + ('0' + (9 + Math.floor(rnd() * 8))).slice(-2) + ':' + ('0' + Math.floor(rnd() * 60)).slice(-2) + ':00';
        if (st === 'Xong') t.doneAt = at;
        t.updatedAt = at; t.updatedBy = t.pic || e.Owner;
        LG.push({ at: at, by: t.pic || e.Owner, action: 'Cập nhật việc', eventId: e.id, taskId: t.id, text: t.title + ' · status → ' + st });
        if (t.proof){
          var im = imgFor(t.title, i + j), f = { id: 'FMAU-' + e.id.slice(-1) + '-' + j, eventId: e.id, taskId: t.id, by: t.pic || e.Owner, at: at, sample: 'x', size: '' };
          if (t.proof === 'link'){
            f.kind = 'link';
            if (/form/i.test(t.title)){ f.name = 'Google Form đăng ký (mẫu)'; f.url = 'https://docs.google.com/forms/'; }
            else if (/zalo/i.test(t.title)){ f.name = 'Nhóm Zalo khách tham dự (mẫu)'; f.url = 'https://zalo.me/'; }
            else if (/video/i.test(t.title)){ f.name = 'Video recap (mẫu)'; f.url = EH_IMG + (im || 'ws-jizai-3.jpg'); f.thumb = f.url; }
            else if (/sheet|kế hoạch|đối chiếu|khảo sát/i.test(t.title)){ f.name = /khảo sát/i.test(t.title) ? 'Kết quả khảo sát QR (mẫu)' : 'Google Sheet (mẫu)'; f.url = 'https://docs.google.com/spreadsheets/'; }
            else { f.name = 'Bài đăng Facebook (mẫu)'; f.url = EH_IMG + (im || 'line-03.png'); f.thumb = f.url; }
          } else if (im){ f.kind = 'image'; f.mime = /png$/.test(im) ? 'image/png' : 'image/jpeg'; f.url = EH_IMG + im; f.thumb = f.url; f.name = t.title.split(/[\/(,]/)[0].trim() + ' (mẫu).' + im.split('.').pop(); }
          else { f.kind = 'file'; f.mime = 'application/pdf'; f.url = pdf; f.name = t.title.split(/[\/(,+]/)[0].trim().replace(/\s+/g, '_') + '_(mau).pdf'; }
          F.push(f);
          LG.push({ at: at, by: f.by, action: f.kind === 'link' ? 'Thêm link' : 'Tải tệp', eventId: e.id, taskId: t.id, text: f.name });
        }
      }
    });
    TK = TK.concat(ts);
    /* bình luận mẫu */
    var leaf = ts.filter(function(t){ return t.parentId; }), kv = leaf.filter(function(t){ return /key visual/i.test(t.title); })[0], fm = leaf.filter(function(t){ return /form đăng ký/i.test(t.title); })[0];
    var cAt = function(h){ var d = new Date(Date.now() - h * 3600e3); return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss"); };
    var cm = function(t, by, txt, h){ C.push({ id: 'CMAU-' + e.id.slice(-1) + '-' + C.length, eventId: e.id, taskId: t ? t.id : '', by: by, at: cAt(h), text: txt, mentions: '', sample: 'x' }); };
    if (!past && i < 4){
      if (kv && e.Design){ cm(kv, e.Design, 'Bản v2 đã chỉnh logo MANI và thêm QR đăng ký. @' + e.Owner + ' xem giúp em nhé.', 30 + i * 5); cm(kv, e.Owner, 'Ổn rồi, đổi chữ ngày sang màu vàng MANI là duyệt.', 26 + i * 5); }
      if (fm) cm(fm, e.Digital, 'Form đã có câu hỏi "Đồng ý sử dụng dữ liệu" và trường Nơi công tác.', 50 + i * 3);
      cm(null, e.Owner, (e.Trade ? '@' + e.Trade + ' chốt giúp phòng / gian hàng trước thứ Sáu. ' : '') + '@' + e.Sales + ' cập nhật số khách NPP đăng ký hộ vào nhóm Zalo.', 20 + i * 7);
      cm(null, e.Sales, 'NPP báo đã có ' + Math.round(x.target * .45) + ' khách đăng ký, em gửi danh sách trong nhóm Zalo rồi ạ.', 8 + i * 4);
    }
    /* biên bản họp mẫu */
    var mAt = function(d){ return ehIso_(new Date(today.getTime() + d * 864e5)); };
    if (!past && i < 4){
      MT.push({ id: 'MMAU-' + i + '-1', eventId: e.id, date: mAt(-9 - i), title: 'Họp khởi động', attendees: [e.Owner, e.Digital, e.Design, e.Trade, e.Sales].filter(String).join(', '),
                content: '- Chốt chủ đề, KOL và địa điểm.\n- Mục tiêu ' + x.target + ' khách, ngân sách dự kiến ' + Math.round(x.budget / 1e6) + ' triệu.\n- NPP hỗ trợ mời khách khu vực.',
                actions: (e.Design ? '@' + e.Design + ' gửi key visual bản 1 trước ' + ehD2_(mAt(-2 - i)) + '\n' : '') + '@' + e.Digital + ' mở form đăng ký + nhóm Zalo', by: e.Owner, at: mAt(-9 - i) + 'T15:00:00', sample: 'x' });
      MT.push({ id: 'MMAU-' + i + '-2', eventId: e.id, date: mAt(-2), title: 'Họp với NPP', attendees: [e.Owner, e.Sales, 'NPP (mẫu)'].join(', '),
                content: '- NPP xác nhận ' + Math.round(x.target * .45) + ' khách đăng ký.\n- Thống nhất chương trình khuyến mại tại sự kiện.\n- Chia ca trực bàn bán hàng.',
                actions: '@' + e.Sales + ' gửi danh sách khách trước ' + ehD2_(mAt(1)) + (e.Trade ? '\n@' + e.Trade + ' chuẩn bị quà tạm ứng NPP' : ''), by: e.Owner, at: mAt(-2) + 'T10:30:00', sample: 'x' });
    }
    if (past) cm(null, e.Owner, 'Tổng kết: ' + (x.actual || '') + ' khách tham dự / mục tiêu ' + x.target + '. Báo cáo đã gửi toàn MMH.', 24 * (ehDays_(e.end, ehIso_(today)) - 6));
    /* v1.5: tình hình tuần · việc Pending · số liệu follow-up · sự kiện đã đóng (mẫu) */
    if (!past && i < 3) CK.push({ id: 'KMAU-' + i, eventId: e.id, week: wk0, rag: ['Xanh', 'Vàng', 'Đỏ'][i], by: e.Owner, at: now, sample: 'x',
      done: ['Đã chốt KOL, mở form đăng ký, key visual đã duyệt.', 'Đã có 60 người đăng ký, bài teaser đã đăng.', 'Đã đặt gian hàng, NPP xác nhận tham gia.'][i],
      block: ['', 'Chưa chốt được link Zoom Webinar bản trả phí.', 'Backdrop chưa in kịp, nhà in báo trễ 3 ngày.'][i], help: i === 2 ? 'Cần duyệt thêm 5 triệu chi phí in gấp.' : '',
      next: ['Đăng bài giới thiệu KOL, chốt danh sách check-in.', 'Đăng bài đếm ngược, gửi nhắc lịch cho khách.', 'Gửi đồ đi Hải Phòng, chốt ca trực gian hàng.'][i] });
    if (!past && i === 1){ var bt = leaf.filter(function(t){ return !/^(Xong|Chờ duyệt)$/.test(t.status) && t.due >= ehIso_(today); })[0]; if (bt){ bt.status = 'Pending'; bt.block = 'Chờ NPP xác nhận số lượng — cần Owner gọi NPP giúp'; } }
    if (past) ts.forEach(function(t){ if (/liên hệ lần đầu/i.test(t.title)){ t.fuTotal = Math.round((x.actual || x.target) * .4); t.fuDone = Math.round((x.actual || x.target) * .25); } if (/chuyển đổi/i.test(t.title)){ t.fuTotal = Math.round((x.actual || x.target) * .4); t.fuOrder = Math.round((x.actual || x.target) * .07); } });
    if (past && i === EVS.length - 1){ ts.forEach(function(t){ if (t.parentId && t.status !== 'Xong'){ t.status = 'Xong'; t.doneAt = ehIso_(today) + 'T09:00:00'; } }); e.closedAt = add(-3) + 'T16:00:00'; e.closedBy = e.Owner; }
  });
  C.forEach(function(c){ var m = []; all.forEach(function(n){ if (c.text.indexOf('@' + n) >= 0) m.push(n); }); c.mentions = m.join(', '); });
  LG.sort(function(a, b){ return a.at < b.at ? -1 : 1; });
  ehAppend_(ss, 'EVENTS', EH.COLS.EVENTS, E);
  ehAppend_(ss, 'TASKS', EH.COLS.TASKS, TK);
  ehAppend_(ss, 'FILES', EH.COLS.FILES, F);
  ehAppend_(ss, 'COMMENTS', EH.COLS.COMMENTS, C);
  MT.forEach(function(m){ m.updatedAt = m.at; m.updatedBy = m.by; });
  ehAppend_(ss, 'MEETINGS', EH.COLS.MEETINGS, MT);
  ehAppend_(ss, 'CHECKINS', EH.COLS.CHECKINS, CK);
  MT.forEach(function(m){ var ev = E.filter(function(x){ return x.id === m.eventId; })[0]; try { ehNoteTasks_(ss, { pic: m.by }, ev, m, m.at); } catch(x){} });   /* v1.5: việc từ biên bản họp mẫu */
  EH_N = [];
  ehAppend_(ss, 'LOG', EH.COLS.LOG, LG);
  return { events: E.length, tasks: TK.length, files: F.length, comments: C.length, meetings: MT.length, checkins: CK.length, log: LG.length, owner: lead, team: { mkt: mkt.length, sales: sales.length } };
}
