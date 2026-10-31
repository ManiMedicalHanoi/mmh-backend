/*************************************************************************************************
 * MMH — MKT_EventHubPlus.gs   (v1.1 · 31/10/2026) — phần mở rộng của MKT_EventHub.gs (app "Sự kiện MKT")
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ① Email thư thường (mmhMail_, 1 email / người / lượt ghi): giao việc · nộp "Chờ duyệt" (⇒ Owner) · Owner trả lại (⇒ người làm)
 *    · bình luận / nhắc tên @Tên · nhắc việc thủ công (task.remind / event.remind) · đội sự kiện mới (event.add).
 *    Mọi email ghi vào tab NOTIFY. Bật / tắt từng loại: cấu hình (Script Property EH_CFG, app ▸ Cài đặt — quản lý).
 * ② Nhắc việc hằng ngày — trigger ehDaily (tự cài ở ehSyncTick_, giờ = cfg.remindHour, bỏ Chủ nhật + ngày nghỉ RPL_CAL):
 *    mỗi người 1 email: việc quá hạn + đến hạn trong cfg.before ngày; Owner thêm việc trễ / chưa giao của sự kiện mình điều phối;
 *    thứ Hai (cfg.weekly): bản tổng hợp các sự kiện 30 ngày tới cho TEAM ▸ Quản lý. Xem trước: action ehDaily (dry, mặc định).
 * ③ ehSave thêm op: event.add · event.delete · comment.add · comment.delete · task.remind · event.remind · cfg.save
 * ④ Dữ liệu mẫu: action ehSample op=seed|clear|status (phiên Admin hoặc key = 8 ký tự cuối EH.ROOT). Mọi dòng có cột sample = x,
 *    tên sự kiện "(mẫu)", người phụ trách = nhân sự thật trong RH_Users ⇒ thử "Việc của tôi" được; KHÔNG email / nhắc việc cho dữ liệu mẫu,
 *    đồng bộ file kế hoạch không khớp vào sự kiện mẫu. Xoá: op=clear (hoặc app ▸ Cài đặt).
 *************************************************************************************************/
var EH_N = [];   /* email của lượt ghi hiện tại — ehSave_ đẩy vào, ehSaveN_ gửi */
var EH_CFG_DEF = { mailAssign: true, mailReview: true, mailComment: true, remind: true, remindHour: 8, before: 2, ownerDigest: true, weekly: true };
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
function ehD2_(iso){ var d = ehDate_(iso); return d ? Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd/MM') + ' (' + EH_DOW[d.getDay()] + ')' : 'chưa có hạn'; }
function ehDays_(a, b){ var x = ehDate_(a), y = ehDate_(b); return (x && y) ? Math.round((y - x) / 864e5) : 0; }
function ehH_(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
var EH_PROOF_VI = { file: 'file ấn phẩm / tài liệu', image: 'ảnh', link: 'link (bài đăng, form, video…)' };

/* ══════════ ① EMAIL ══════════ */
/* N = [{to, kind, ev, task, text, role, count}] ⇒ gộp theo người nhận ⇒ 1 email; trả [{pic, ok}] */
function ehNotify_(ss, me, N, opt){
  opt = opt || {};
  var cfg = ehCfg_(), U = ehUsers_(), need = { assign:'mailAssign', team:'mailAssign', review:'mailReview', 'return':'mailReview', comment:'mailComment', mention:'mailComment' };
  var by = {}, order = [], out = [];
  N.forEach(function(n){
    if (!n.to) return;
    if (!opt.self && me && n.to === me.pic) return;
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
  return out;
}
function ehTaskLine_(t, ev, withEv){
  var today = ehIso_(new Date()), due = ehS_(t.due), late = due && due < today ? ehDays_(due, today) : 0;
  var parts = [(withEv && ev ? ehS_(ev.name) + ' · ' : '') + 'hạn ' + ehD2_(due) + (late ? ' — trễ ' + late + ' ngày' : due === today ? ' — hôm nay' : '')];
  if (ehS_(t.proof)) parts.push('khi xong cần nộp ' + (EH_PROOF_VI[ehS_(t.proof)] || ehS_(t.proof)));
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
    var where = x.task ? 'việc “' + ehH_(x.task.title) + '”' : 'sự kiện';
    var url = EH.APP_URL + (x.task ? '#t-' + encodeURIComponent(ehS_(x.task.id)) : '#ev-' + encodeURIComponent(ehS_(x.ev && x.ev.id)));
    paras.push({ html: '<p>' + ehH_(actor) + (k === 'mention' ? ' nhắc đến bạn' : ' bình luận') + ' ở ' + where + ' — ' + evTxt(x) + ':</p>' +
                       '<p style="margin:0 0 12px;padding:8px 12px;border-left:3px solid #C3CDD8;color:#333">' + ehH_(x.text).replace(/\n/g, '<br>') + '</p><p><a href="' + url + '">Trả lời trên app</a></p>',
                 text: actor + (k === 'mention' ? ' nhắc đến bạn' : ' bình luận') + ' ở ' + where.replace(/[“”]/g, '"') + ':\n"' + x.text + '"\n' + url });
  }); });
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
  else if (ks.length === 1 && (K.mention || K.comment)) subj = actor + (K.mention ? ' nhắc đến bạn' : ' bình luận') + ' · ' + (one && one.task ? ehS_(one.task.title) : evs[0] || '');
  else if (ks.length === 1 && K.remind) subj = 'Nhắc việc: ' + items.length + ' việc' + (multiEv ? '' : ' · ' + evs[0]);
  else if (ks.length === 1 && K.team) subj = 'Sự kiện mới: ' + evs[0];
  else subj = items.length + ' cập nhật mới cho bạn' + (multiEv ? '' : ' · ' + evs[0]);
  var L = ehLetter_(pic, paras);
  return { subject: '[Sự kiện MKT] ' + subj, html: L.html, text: L.text };
}

/* ══════════ ③ OP MỚI CỦA ehSave ══════════ */
function ehSave2_(ss, me, op, d, events, evBy, now){
  if (op === 'cfg.save'){
    if (!me.manager) return { ok:false, code:'PERM', error:'Chỉ quản lý được đổi cài đặt.' };
    var c = ehCfg_(), h0 = c.remindHour;
    ['mailAssign', 'mailReview', 'mailComment', 'remind', 'ownerDigest', 'weekly'].forEach(function(k){ if (k in d) c[k] = d[k] === true || d[k] === 'true' || d[k] === 1 || d[k] === '1'; });
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
    ehAppend_(ss, 'EVENTS', EH.COLS.EVENTS, [e]);
    var tasks = d.template === false || d.template === '0' ? [] : ehTasksFor_(e, ehRead_(ss, 'TEMPLATE'));
    var today = ehIso_(new Date());
    tasks.forEach(function(t){   /* hạn gốc đã qua lúc tạo ⇒ hạn = hôm nay (Owner xem lại), không bỏ qua */
      if (t.status === 'Bỏ qua'){ t.status = 'Chưa làm'; t.note = 'Hạn theo mẫu ' + ehD2_(t.due) + ' đã qua lúc tạo sự kiện'; t.due = today; t.dueManual = 'x'; }
      t.createdBy = me.pic;
    });
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
    var names = ehPeople_().map(function(x){ return x.pic; }).sort(function(a, b){ return b.length - a.length; }), low = text.toLowerCase(), ment = [];
    names.forEach(function(n){ var k = '@' + n.toLowerCase(); if (low.indexOf(k) >= 0 && ment.indexOf(n) < 0){ ment.push(n); low = low.split(k).join(' '); } });
    var c = { id: /^tmp-/.test(ehS_(d.id)) || !ehS_(d.id) ? ehId_('C') : ehS_(d.id), eventId: ev2.id, taskId: tk ? ehS_(tk.id) : '', by: me.pic, at: now, text: text, mentions: ment.join(', '), sample: ehS_(ev2.sample) ? 'x' : '' };
    if (/^tmp-/.test(c.id)) c.id = ehId_('C');
    ehAppend_(ss, 'COMMENTS', EH.COLS.COMMENTS, [c]);
    ehLog_(ss, me, 'Bình luận', ev2.id, c.taskId, (tk ? tk.title + ' · ' : '') + text.slice(0, 200));
    var sent = {}; ment.forEach(function(n){ sent[n] = 1; EH_N.push({ to: n, kind: 'mention', ev: ev2, task: tk, text: text }); });
    if (tk && ehS_(tk.pic) && !sent[tk.pic]){ sent[tk.pic] = 1; EH_N.push({ to: ehS_(tk.pic), kind: 'comment', ev: ev2, task: tk, text: text }); }
    if (ehS_(ev2.Owner) && !sent[ev2.Owner]) EH_N.push({ to: ehS_(ev2.Owner), kind: 'comment', ev: ev2, task: tk, text: text });
    return { ok:true, comment: c, tmp: ehS_(d.id) };
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
  [['EVENTS', 'id'], ['TASKS', 'eventId'], ['FILES', 'eventId'], ['COMMENTS', 'eventId'], ['LOG', 'eventId'], ['PLAN_JSON', 'eventId']].forEach(function(x){
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
  return ehDaily_({ force: true, dry: String(p.send || '') !== '1', pic: ehS_(p.pic), weekly: String(p.weekly || '') === '1' });
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
  var lim = ehIso_(new Date(now.getTime() + (+cfg.before || 0) * 864e5)), per = {}, own = {}, live = [];
  T.forEach(function(t){
    var e = evBy[ehS_(t.eventId)]; if (!e || ehS_(e.sample) || ehS_(e.state) === 'Huỷ' || ehS_(e.follow) === 'Không') return;
    if (!ehS_(t.parentId) && par[t.id]) return;
    live.push(t);
    if (/^(Xong|Bỏ qua)$/.test(ehS_(t.status))) return;
    var due = ehS_(t.due); if (!due || due > lim) return;
    var x = { task: t, ev: e, late: due < today };
    if (ehS_(t.pic)) (per[t.pic] = per[t.pic] || []).push(x);
    var ow = ehS_(e.Owner);
    if (cfg.ownerDigest && ow && ow !== ehS_(t.pic) && (x.late || !ehS_(t.pic))) (own[ow] = own[ow] || []).push(x);
  });
  var weekly = (opt.weekly || (now.getDay() === 1 && cfg.weekly)), mgrs = [];
  if (weekly) ehRead_(ss, 'TEAM').forEach(function(r){ if (ehS_(r.role) === 'Quản lý') ehS_(r.people).split(',').forEach(function(x){ x = x.trim(); if (x && mgrs.indexOf(x) < 0) mgrs.push(x); }); });
  var who = Object.keys(per).concat(Object.keys(own)).concat(mgrs).filter(function(x, i, a){ return a.indexOf(x) === i; });
  if (opt.pic) who = who.filter(function(x){ return x === opt.pic; });
  var U = ehUsers_(), logs = [], preview = [];
  who.forEach(function(pic){
    var mine = (per[pic] || []).sort(function(a, b){ return ehS_(a.task.due) < ehS_(b.task.due) ? -1 : 1; }), mo = own[pic] || [], paras = [];
    var late = mine.filter(function(x){ return x.late; }), soon = mine.filter(function(x){ return !x.late; });
    if (late.length) paras.push(ehList_('<b>' + late.length + ' việc quá hạn</b> — hoàn thành hoặc báo Owner để đổi hạn:', late, true));
    if (soon.length) paras.push(ehList_('<b>' + soon.length + ' việc đến hạn</b> ' + (cfg.before ? 'trong ' + cfg.before + ' ngày tới' : 'hôm nay') + ':', soon, true));
    if (mo.length) paras.push(ehList_('Sự kiện bạn điều phối có <b>' + mo.filter(function(x){ return x.late; }).length + ' việc trễ</b> của người khác' +
                                      (mo.some(function(x){ return !ehS_(x.task.pic); }) ? ' và việc <b>chưa giao</b>' : '') + ':', mo.slice(0, 25), true));
    if (mgrs.indexOf(pic) >= 0) paras.push(ehWeekly_(events, live, today));
    if (!paras.length) return;
    var subj = '[Sự kiện MKT] Việc cần làm ' + Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'dd/MM') + ': ' +
               [late.length ? late.length + ' quá hạn' : '', soon.length ? soon.length + ' sắp đến hạn' : '', mo.length ? mo.length + ' cần theo dõi' : '', mgrs.indexOf(pic) >= 0 ? 'tổng hợp tuần' : ''].filter(String).join(' · ');
    var L = ehLetter_(pic, paras), u = U[pic], row = { at: ehNow_(), to: pic, kind: 'daily', eventId: '', taskId: '', subject: subj, ok: '', by: 'Hệ thống' };
    if (!u || !u.email) row.ok = 'Không có email';
    else if (opt.dry) row.ok = 'Xem trước';
    else { try { mmhMail_({ to: u.email, subject: subj, body: L.text, htmlBody: L.html, name: 'Sự kiện MKT · MMH' }); row.ok = 'Đã gửi'; } catch(e){ row.ok = 'Lỗi: ' + String(e && e.message || e).slice(0, 140); } }
    logs.push(row); preview.push({ to: pic, subject: subj, late: late.length, soon: soon.length, owner: mo.length, ok: row.ok, html: opt.dry && opt.pic ? L.html : undefined });
  });
  if (logs.length && !opt.dry){ try { ehAppend_(ss, 'NOTIFY', EH.COLS.NOTIFY, logs); } catch(e){} }
  return { ok:true, dry: !!opt.dry, date: today, people: preview.length, items: preview };
}
function ehWeekly_(events, live, today){
  var lim = ehIso_(new Date(ehDate_(today).getTime() + 30 * 864e5)), rows = [];
  events.filter(function(e){ return !ehS_(e.sample) && ehS_(e.state) !== 'Huỷ' && ehS_(e.start) >= today && ehS_(e.start) <= lim; })
    .sort(function(a, b){ return a.start < b.start ? -1 : 1; }).forEach(function(e){
      var ts = live.filter(function(t){ return ehS_(t.eventId) === e.id && ehS_(t.status) !== 'Bỏ qua'; }), done = ts.filter(function(t){ return ehS_(t.status) === 'Xong'; }).length;
      var late = ts.filter(function(t){ return ehS_(t.status) !== 'Xong' && ehS_(t.due) && ehS_(t.due) < today; }).length, none = ts.filter(function(t){ return !ehS_(t.pic) && ehS_(t.status) !== 'Xong'; }).length;
      rows.push({ e: e, pct: ts.length ? Math.round(done / ts.length * 100) : 0, late: late, none: none, n: ts.length });
    });
  if (!rows.length) return { html: '<p>Tổng hợp tuần: không có sự kiện trong 30 ngày tới.</p>', text: 'Tổng hợp tuần: không có sự kiện trong 30 ngày tới.' };
  var td = 'padding:6px 10px;border-bottom:1px solid #E6EAEF;text-align:left';
  return { html: '<p><b>Tổng hợp tuần — sự kiện 30 ngày tới</b></p><table style="border-collapse:collapse;font-size:13.5px;margin:0 0 12px"><tr><th style="' + td + '">Sự kiện</th><th style="' + td + '">Ngày</th><th style="' + td + '">Xong</th><th style="' + td + '">Trễ</th><th style="' + td + '">Chưa giao</th><th style="' + td + '">Owner</th></tr>' +
                   rows.map(function(r){ return '<tr><td style="' + td + '"><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(r.e.id) + '">' + ehH_(r.e.name) + '</a></td><td style="' + td + '">' + ehD2_(r.e.start) + '</td><td style="' + td + '">' + r.pct + '%</td><td style="' + td + (r.late ? ';color:#B83A2E;font-weight:600' : '') + '">' + r.late + '</td><td style="' + td + '">' + r.none + '</td><td style="' + td + '">' + ehH_(r.e.Owner || '—') + '</td></tr>'; }).join('') + '</table>',
           text: 'Tổng hợp tuần — sự kiện 30 ngày tới:\n' + rows.map(function(r){ return '- ' + r.e.name + ' · ' + ehD2_(r.e.start) + ' · xong ' + r.pct + '% · trễ ' + r.late + ' · chưa giao ' + r.none; }).join('\n') };
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
    var cnt = function(){ var o = {}; ['EVENTS', 'TASKS', 'FILES', 'COMMENTS'].forEach(function(t){ var R = ehRead_(ss, t); o[t] = { all: R.length, sample: R.filter(function(r){ return ehS_(r.sample); }).length }; }); return o; };
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
  var sales = all.filter(function(p){ return /sale|dental|surgical|eyeless|kinh doanh/.test(tag(p)) && mkt.indexOf(p) < 0; });
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
  var tpl = ehRead_(ss, 'TEMPLATE'), E = [], TK = [], F = [], C = [], LG = [], now = ehNow_();
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
    e.Owner = pick([lead, mkt[0], pick(mkt, 1)], i); e.Digital = pick(mkt, i + 1); e.Design = i === 3 ? '' : pick(mkt, i + 2); e.Trade = x.type === 'Webinar' ? '' : pick(mkt, i + 3); e.Sales = pick(sales, i);
    E.push(e);
    var ts = ehTasksFor_(e, tpl), kids = {}, endIso = e.end, past = endIso < ehIso_(today);
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
    if (past) cm(null, e.Owner, 'Tổng kết: ' + (x.actual || '') + ' khách tham dự / mục tiêu ' + x.target + '. Báo cáo đã gửi toàn MMH.', 24 * (ehDays_(e.end, ehIso_(today)) - 6));
  });
  C.forEach(function(c){ var m = []; all.forEach(function(n){ if (c.text.indexOf('@' + n) >= 0) m.push(n); }); c.mentions = m.join(', '); });
  LG.sort(function(a, b){ return a.at < b.at ? -1 : 1; });
  ehAppend_(ss, 'EVENTS', EH.COLS.EVENTS, E);
  ehAppend_(ss, 'TASKS', EH.COLS.TASKS, TK);
  ehAppend_(ss, 'FILES', EH.COLS.FILES, F);
  ehAppend_(ss, 'COMMENTS', EH.COLS.COMMENTS, C);
  ehAppend_(ss, 'LOG', EH.COLS.LOG, LG);
  return { events: E.length, tasks: TK.length, files: F.length, comments: C.length, log: LG.length, owner: lead, team: { mkt: mkt.length, sales: sales.length } };
}
