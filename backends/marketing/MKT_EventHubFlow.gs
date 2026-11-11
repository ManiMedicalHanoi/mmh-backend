/*************************************************************************************************
 * MMH — MKT_EventHubFlow.gs   (v1.5 · 03/11/2026) — app "Sự kiện MKT" v2.4: không để rơi việc lập kế hoạch / follow-up / báo cáo
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ① Lập kế hoạch muộn: ehTasksFor_ KHÔNG còn tự "Bỏ qua" việc có hạn mẫu đã qua ⇒ ehCompress_ dồn hạn các việc đó vào 1/3 đầu
 *    khoảng thời gian còn lại tới ngày D (giữ thứ tự), dueManual = 'nén' (đổi ngày sự kiện không dời lại), sự kiện ghi latePlan
 *    = số ngày còn lại lúc tạo. Dữ liệu cũ (việc "Bỏ qua" tự động của sự kiện chưa kết thúc) ⇒ ehFlowMigrate_ chuyển lại 1 lần.
 * ② Đóng sự kiện: ehSave op event.close (Owner / quản lý; còn việc chưa xong ⇒ phải ghi lý do, các việc đó thành "Bỏ qua") ·
 *    event.reopen. Sự kiện đã diễn ra mà chưa đóng vẫn hiện trên app (khung "Sau sự kiện") và trong email tổng hợp tuần.
 * ③ Biên bản họp: mỗi dòng "Việc cần làm sau họp" ⇒ 1 việc thật trong hạng mục "Việc sau họp" (cột TASKS.noteId = id biên bản):
 *    @Tên = người làm (không có ⇒ Owner), hạn đọc từ chữ (dd/mm · thứ 2…7 / chủ nhật · T2…T7 · ngày mai · tuần sau), không có ⇒ ngày họp + 3 ngày làm việc.
 *    Sửa biên bản: dòng mới ⇒ việc mới, dòng bị xoá ⇒ việc chưa xong thành "Bỏ qua".
 * ④ Trạng thái "Pending" (TASKS.block = lý do, bắt buộc; email + thông báo Owner) · cập nhật tuần (tab CHECKINS: Xanh / Vàng / Đỏ,
 *    đã làm · vấn đề tồn đọng / cần hỗ trợ · tuần tới; Đỏ hoặc cần hỗ trợ ⇒ báo TEAM ▸ Quản lý) · mốc quan trọng (TASKS.milestone: x = mốc,
 *    - = không phải mốc, trống = theo tên việc EH_MS_RE) · số liệu follow-up khách (fuTotal · fuDone · fuOrder, người phụ trách nhập).
 * ⑤ Nhắc việc hằng ngày (MKT_EventHubPlus.gs ▸ ehDaily_): việc "Chờ duyệt" nhắc Owner (không nhắc người làm), "Pending" ⇒ Owner,
 *    trễ ≥ cfg.escDays ngày ⇒ TEAM ▸ Quản lý mỗi ngày, thứ Sáu nhắc Owner cập nhật tuần, mỗi email nhắc ghi thêm 1 dòng RH_Notify
 *    (nút "Nhắc tôi" của Report Hub / CRM — Sales thấy việc follow-up ngay trên CRM).
 * ⑥ Report Hub: việc của sự kiện (trừ Sales) ⇒ sub-task CHỈ ĐỌC "H:<id việc>" dưới Key task có TÊN TRÙNG tên sự kiện
 *    (Event_Sync.gs ▸ evsSync gọi ehHubSubs_) ⇒ báo cáo tuần Report Hub tự có tiến độ sự kiện, không phải nhập 2 lần.
 *    ⛔ 11/11/2026: ĐÃ TẮT theo yêu cầu người dùng (Event_Sync.gs v2.3 ▸ EVS_HUB = false, sub H: cũ được gỡ) — việc app Sự kiện
 *    không còn hiện / khoá trên Report Hub. Hàm ehHubSubs_ giữ lại, không còn ai gọi.
 * Không dùng dịch vụ mới (SpreadsheetApp / Properties / Cache / Lock / mmhMail_) ⇒ không phải cấp quyền lại.
 *************************************************************************************************/
var EH_FLOW_VER = '2';   /* 2: trạng thái "Vướng" (bản đầu) ⇒ "Pending" */
var EH_MS_RE = /duyet ke hoach|hop dong kol|form dang ky|key visual|set up hoan thien|bao cao su kien|chuyen doi/;
var EH_AFTER_DAYS = 60;      /* sự kiện đã diễn ra ≤ 60 ngày mà chưa đóng ⇒ vẫn theo dõi */

function ehMs_(t){ var m = ehS_(t.milestone); return m === 'x' || (m === '' && EH_MS_RE.test(ehNorm_(t.title))); }
function ehWeekOf_(iso){ var d = ehDate_(iso); if (!d) return ''; d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ehIso_(d); }
function ehMgrs_(ss){
  var L = [];
  ehRead_(ss, 'TEAM').forEach(function(r){ if (ehS_(r.role) === 'Quản lý') ehS_(r.people).split(',').forEach(function(x){ x = x.trim(); if (x && L.indexOf(x) < 0) L.push(x); }); });
  return L;
}
function ehRoleOf_(ev, pic){ var r = EH.ROLES.filter(function(x){ return ehS_(ev[x]) === pic; })[0]; return r || 'Owner'; }
/* sự kiện còn phải theo dõi: chưa huỷ, Theo dõi = Có, chưa đóng; sắp diễn ra / đang diễn ra / đã diễn ra ≤ EH_AFTER_DAYS ngày */
function ehActive_(e, today){
  if (!e || ehS_(e.sample) || ehS_(e.state) === 'Huỷ' || ehS_(e.follow) === 'Không' || ehS_(e.closedAt) || !ehS_(e.start)) return false;
  return ehDays_(ehS_(e.end || e.start), today) <= EH_AFTER_DAYS;
}

/* ══════════ ① LẬP KẾ HOẠCH MUỘN ══════════ */
/* list = việc của 1 sự kiện (đối tượng TASKS). Việc con có hạn < hôm nay ⇒ dồn vào [hôm nay … hôm nay + 1/3 thời gian còn lại]. Trả số ngày còn tới D (0 nếu không phải dồn). */
function ehCompress_(e, list, today){
  var late = list.filter(function(o){ return ehS_(o.parentId) && ehS_(o.due) && ehS_(o.due) < today && !/^(Xong|Bỏ qua)$/.test(ehS_(o.status)); });
  if (!late.length || !ehS_(e.start)) return 0;
  var left = Math.max(0, ehDays_(today, ehS_(e.start))), room = Math.max(0, Math.floor((left - 1) / 3));
  var dues = late.map(function(o){ return ehS_(o.due); }).sort(), min = dues[0], span = Math.max(1, ehDays_(min, today));
  late.forEach(function(o){
    var old = ehS_(o.due), k = ehDays_(min, old), n = room ? Math.round(k / span * room) : 0, d = ehDate_(today);
    d.setDate(d.getDate() + n);
    o.due = ehIso_(d); o.dueManual = 'nén';
    o.note = 'Lập kế hoạch muộn — hạn theo mẫu ' + ehD2_(old) + ' đã qua, dồn lại' + (ehS_(o.note) && !/Tạo khi đã qua hạn|Lập kế hoạch muộn/.test(o.note) ? '\n' + ehS_(o.note) : '');
  });
  return Math.max(1, left);
}
/* 1 lần: việc "Bỏ qua" tự động (bản cũ) của sự kiện chưa kết thúc ⇒ Chưa làm + dồn hạn */
function ehFlowMigrate_(){
  var pr = PropertiesService.getScriptProperties(); if (pr.getProperty('EH_FLOW_V') === EH_FLOW_VER) return null;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return null;
  try {
    var ss = ehBook_(), today = ehIso_(new Date()), by = {}, n = 0, evs = 0;
    var E = ehRead_(ss, 'EVENTS'); E.forEach(function(e){ by[ehS_(e.id)] = e; });
    var T = ehRead_(ss, 'TASKS'), G = {};
    T.forEach(function(t){
      if (ehS_(t.status) !== 'Bỏ qua' || !/Tạo khi đã qua hạn/.test(ehS_(t.note))) return;
      var e = by[ehS_(t.eventId)]; if (!e || ehS_(e.state) === 'Huỷ' || ehS_(e.end || e.start) < today) return;
      t.status = 'Chưa làm'; (G[e.id] = G[e.id] || []).push(t);
    });
    T.forEach(function(t){ if (ehS_(t.status) === 'Vướng'){ t.status = 'Pending'; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); n++; } });   /* v1.5.1: người dùng yêu cầu dùng từ formal "Pending" */
    Object.keys(G).forEach(function(id){
      var e = by[id], left = ehCompress_(e, G[id], today);
      G[id].forEach(function(t){ if (!ehS_(t.dueManual)) t.dueManual = 'nén'; t.updatedAt = ehNow_(); t.updatedBy = 'Hệ thống'; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); n++; });
      if (!ehS_(e.latePlan)){ e.latePlan = String(left || ehDays_(today, ehS_(e.start))); ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, e); }
      evs++;
    });
    pr.setProperty('EH_FLOW_V', EH_FLOW_VER);
    if (n){ CacheService.getScriptCache().remove('eh_boot'); ehLog_(ss, null, 'Nâng cấp', '', '', 'v1.5: ' + n + ' việc "Bỏ qua" tự động ở ' + evs + ' sự kiện chưa diễn ra ⇒ Chưa làm, hạn dồn lại'); }
    return { tasks: n, events: evs };
  } finally { try { lock.releaseLock(); } catch(e){} }
}

/* ══════════ ③ BIÊN BẢN HỌP ⇒ VIỆC ══════════ */
/* hạn trong chữ: dd/mm[/yyyy] · thứ 2…7 / T2…T7 / thứ hai…bảy / chủ nhật · ngày mai · tuần sau. Mốc = ngày họp. Không thấy ⇒ '' */
function ehParseDue_(s, baseIso){
  var b = ehDate_(baseIso) || ehDate_(ehIso_(new Date())), raw = String(s || '');
  var m = /(^|[^\d])(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?(?!\d)/.exec(raw);
  if (m){
    var d = +m[2], mo = +m[3] - 1, y = m[4] ? (+m[4] < 100 ? 2000 + +m[4] : +m[4]) : b.getFullYear();
    if (d >= 1 && d <= 31 && mo >= 0 && mo < 12){ var x = new Date(y, mo, d); if (!m[4] && x < b) x = new Date(y + 1, mo, d); return ehIso_(x); }
  }
  var t = ' ' + ehNorm_(raw) + ' ', next = / tuan sau | tuan toi /.test(t), dow = -1, W = { hai: 1, ba: 2, tu: 3, nam: 4, sau: 5, bay: 6 };
  var w1 = / (?:thu|t) ?([2-7]) /.exec(t), w2 = / thu (hai|ba|tu|nam|sau|bay) /.exec(t);
  if (w1) dow = +w1[1] - 1; else if (w2) dow = W[w2[1]]; else if (/ chu nhat /.test(t)) dow = 0;
  var r = new Date(b);
  if (dow >= 0){ var k = (dow - b.getDay() + 7) % 7 || 7; r.setDate(r.getDate() + k); if (next && ehWeekOf_(ehIso_(r)) === ehWeekOf_(ehIso_(b))) r.setDate(r.getDate() + 7); return ehIso_(r); }
  if (/ ngay mai /.test(t)){ r.setDate(r.getDate() + 1); return ehIso_(r); }
  if (next){ r.setDate(r.getDate() + 7); return ehIso_(r); }
  if (/ (hom nay|trong ngay) /.test(t)) return ehIso_(r);
  return '';
}
function ehNoteLines_(txt){ return String(txt || '').split(/\n/).map(function(x){ return x.replace(/^[\s•\-*+·–\d.)]+/, '').trim(); }).filter(function(x){ return x.length > 1; }); }
/* nt = biên bản vừa lưu ⇒ tạo / cập nhật việc; trả danh sách việc đổi (để app gộp ngay) */
function ehNoteTasks_(ss, me, ev, nt, now){
  var lines = ehNoteLines_(nt.actions), T = ehRead_(ss, 'TASKS'), today = ehIso_(new Date());
  var mine = T.filter(function(t){ return ehS_(t.noteId) === ehS_(nt.id); }), byKey = {};
  mine.forEach(function(t){ byKey[ehNorm_(t.title)] = t; });
  if (!lines.length && !mine.length) return [];
  var par = T.filter(function(t){ return ehS_(t.eventId) === ev.id && !ehS_(t.parentId) && ehNorm_(t.title) === 'viec sau hop'; })[0], add = [], out = [], seen = {};
  if (!par && lines.length){
    var nums = T.filter(function(t){ return ehS_(t.eventId) === ev.id && !ehS_(t.parentId); }).map(function(t){ return parseInt(ehS_(t.group), 10) || 0; });
    par = { id: ehId_('T'), eventId: ev.id, parentId: '', group: (Math.max.apply(null, [0].concat(nums)) + 1) + '. Việc sau họp', title: 'Việc sau họp', role: 'Owner', pic: ehS_(ev.Owner),
            due: '', offset: '', unit: '', dueManual: '', status: 'Chưa làm', proof: '', hint: 'Việc chốt trong biên bản họp', note: '', order: T.length + 1, doneAt: '', updatedAt: now,
            updatedBy: me.pic, createdBy: me.pic, sample: ehS_(ev.sample) ? 'x' : '' };
    add.push(par);
  }
  lines.forEach(function(line){
    var who = ehMentions_(line)[0] || '', title = line;
    if (who){ var i = title.toLowerCase().indexOf('@' + who.toLowerCase()); if (i >= 0) title = (title.slice(0, i) + title.slice(i + who.length + 1)).replace(/^[\s:,\-–]+/, '').replace(/\s{2,}/g, ' ').trim(); }
    title = (title || line).slice(0, 300); title = title.charAt(0).toUpperCase() + title.slice(1);
    var k = ehNorm_(title); if (!k || seen[k]) return; seen[k] = 1;
    var parsed = ehParseDue_(title, nt.date), due = parsed || ehIso_(ehAddWork_(ehDate_(nt.date), 3, ehHoli_()));
    if (!parsed && due < today) due = today;
    var ex = byKey[k];
    if (ex){
      var ch = false;
      if (who && who !== ehS_(ex.pic) && !/^(Xong)$/.test(ehS_(ex.status))){ ex.pic = who; ex.role = ehRoleOf_(ev, who); ch = true; EH_N.push({ to: who, kind: 'assign', ev: ev, task: ex }); }
      if (parsed && parsed !== ehS_(ex.due) && !/^(Xong)$/.test(ehS_(ex.status))){ ex.due = parsed; ch = true; }
      if (ehS_(ex.status) === 'Bỏ qua' && /Đã bỏ khỏi biên bản/.test(ehS_(ex.note))){ ex.status = 'Chưa làm'; ex.note = ''; ch = true; }
      if (ch){ ex.updatedAt = now; ex.updatedBy = me.pic; ehPut_(ss, 'TASKS', EH.COLS.TASKS, ex); out.push(ehClean2_(ex)); }
      return;
    }
    var t = { id: ehId_('T'), eventId: ev.id, parentId: par.id, group: par.group, title: title, role: who ? ehRoleOf_(ev, who) : 'Owner', pic: who || ehS_(ev.Owner), due: due,
              offset: '', unit: '', dueManual: 'x', status: 'Chưa làm', proof: '', hint: '', note: 'Từ biên bản họp ' + ehD2_(nt.date) + ' · ' + ehS_(nt.title), order: T.length + add.length + 1,
              doneAt: '', updatedAt: now, updatedBy: me.pic, createdBy: me.pic, sample: ehS_(ev.sample) ? 'x' : '', noteId: ehS_(nt.id) };
    add.push(t);
    if (t.pic) EH_N.push({ to: t.pic, kind: 'assign', ev: ev, task: t });
  });
  mine.forEach(function(t){
    if (seen[ehNorm_(t.title)] || /^(Xong|Bỏ qua)$/.test(ehS_(t.status))) return;
    t.status = 'Bỏ qua'; t.note = 'Đã bỏ khỏi biên bản họp'; t.updatedAt = now; t.updatedBy = me.pic; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); out.push(ehClean2_(t));
  });
  if (add.length) ehAppend_(ss, 'TASKS', EH.COLS.TASKS, add);
  if (add.length) ehLog_(ss, me, 'Việc từ biên bản họp', ev.id, '', ehS_(nt.title) + ' · ' + add.filter(function(x){ return x.parentId; }).length + ' việc');
  return out.concat(add.map(ehClean2_));
}

/* ══════════ ② ④ OP MỚI: event.close · event.reopen · checkin.save ══════════ */
function ehSave3_(ss, me, op, d, events, evBy, now){
  if (op === 'event.close' || op === 'event.reopen'){
    var ev = evBy[ehS_(d.id)]; if (!ev) return { ok:false, error:'Không thấy sự kiện.' };
    if (!ehCanEv_(me, ev)) return { ok:false, code:'PERM', error:'Chỉ quản lý hoặc Owner của sự kiện được đóng / mở lại sự kiện.' };
    if (op === 'event.reopen'){   /* việc bị "Bỏ qua" lúc đóng ⇒ trả lại Chưa làm */
      var back = [];
      ehRead_(ss, 'TASKS').forEach(function(t){
        if (ehS_(t.eventId) !== ev.id || ehS_(t.status) !== 'Bỏ qua' || !/^Đóng sự kiện: /.test(ehS_(t.note))) return;
        t.status = 'Chưa làm'; t.note = ehS_(t.note).split('\n').slice(1).join('\n'); t.updatedAt = now; t.updatedBy = me.pic; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); back.push(ehClean2_(t));
      });
      ev.closedAt = ''; ev.closedBy = ''; ev.closeNote = ''; ev.updatedAt = now; ev.updatedBy = me.pic; ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, ev);
      ehLog_(ss, me, 'Mở lại sự kiện', ev.id, '', ehS_(ev.name) + (back.length ? ' · mở lại ' + back.length + ' việc' : ''));
      return { ok:true, event: ehClean2_(ev), tasks: back };
    }
    var T = ehRead_(ss, 'TASKS'), par = {}, note = ehS_(d.note).slice(0, 500);
    T.forEach(function(t){ if (ehS_(t.parentId)) par[t.parentId] = 1; });
    var open = T.filter(function(t){ return ehS_(t.eventId) === ev.id && (ehS_(t.parentId) || !par[t.id]) && !/^(Xong|Bỏ qua)$/.test(ehS_(t.status)); });
    if (open.length && !note) return { ok:false, code:'OPEN', open: open.length, error:'Còn ' + open.length + ' việc chưa xong — ghi lý do để đóng sự kiện (các việc đó sẽ chuyển "Bỏ qua").' };
    var changed = [];
    open.forEach(function(t){ t.status = 'Bỏ qua'; t.note = 'Đóng sự kiện: ' + note + (ehS_(t.note) ? '\n' + ehS_(t.note) : ''); t.updatedAt = now; t.updatedBy = me.pic; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); changed.push(ehClean2_(t)); });
    ev.closedAt = now; ev.closedBy = me.pic; ev.closeNote = note; ev.updatedAt = now; ev.updatedBy = me.pic; ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, ev);
    ehLog_(ss, me, 'Đóng sự kiện', ev.id, '', ehS_(ev.name) + (open.length ? ' · bỏ qua ' + open.length + ' việc: ' + note : ''));
    return { ok:true, event: ehClean2_(ev), tasks: changed };
  }
  if (op === 'checkin.save'){
    var e = evBy[ehS_(d.eventId)]; if (!e) return { ok:false, error:'Không thấy sự kiện.' };
    var team = EH.ROLES.map(function(r){ return ehS_(e[r]); });
    if (!ehCanEv_(me, e) && team.indexOf(me.pic) < 0) return { ok:false, code:'PERM', error:'Chỉ đội sự kiện được cập nhật tình hình tuần.' };
    var rag = ehS_(d.rag); if (!/^(Xanh|Vàng|Đỏ)$/.test(rag)) return { ok:false, error:'Chọn tình hình: Xanh · Vàng · Đỏ.' };
    var today = ehIso_(new Date()), wk = ehWeekOf_(today), C = ehRead_(ss, 'CHECKINS');
    var c = C.filter(function(x){ return ehS_(x.eventId) === e.id && ehS_(x.week) === wk; })[0], isNew = !c;
    if (!c) c = { id: ehId_('K'), eventId: e.id, week: wk, sample: ehS_(e.sample) ? 'x' : '' };
    var old = isNew ? {} : { rag: ehS_(c.rag), help: ehS_(c.help) };
    c.rag = rag; c.done = ehS_(d.done).slice(0, 1500); c.block = ehS_(d.block).slice(0, 1500); c.help = ehS_(d.help).slice(0, 1000); c.next = ehS_(d.next).slice(0, 1500); c.by = me.pic; c.at = now;
    if (isNew) ehAppend_(ss, 'CHECKINS', EH.COLS.CHECKINS, [c]); else ehPut_(ss, 'CHECKINS', EH.COLS.CHECKINS, c);
    ehLog_(ss, me, 'Cập nhật tuần', e.id, '', rag + (c.done ? ' · ' + c.done.slice(0, 160) : '') + (c.block ? ' · Tồn đọng: ' + c.block.slice(0, 160) : ''));
    if ((rag === 'Đỏ' && old.rag !== 'Đỏ') || (c.help && c.help !== old.help)){
      var txt = 'Tình hình: ' + rag + (c.done ? '\nTuần này: ' + c.done : '') + (c.block ? '\nVấn đề tồn đọng: ' + c.block : '') + (c.help ? '\nCần hỗ trợ: ' + c.help : '') + (c.next ? '\nTuần tới: ' + c.next : '');
      ehMgrs_(ss).forEach(function(m){ EH_N.push({ to: m, kind: 'checkin', ev: e, task: null, text: txt, rag: rag }); });
    }
    return { ok:true, checkin: ehClean2_(c) };
  }
  return null;
}

/* ══════════ email: đoạn cho các loại mới (gọi từ ehMailFor_) ══════════ */
function ehFlowParas_(K, actor, paras){
  (K.block || []).forEach(function(x){
    var l = ehTaskLine_(x.task, x.ev, true);
    paras.push({ html: '<p>' + ehH_(actor) + ' chuyển việc dưới đây sang <b>Pending</b>' + (x.text ? ': “' + ehH_(x.text) + '”' : '.') + ' Bạn là Owner — hỗ trợ hoặc đổi hạn / đổi người giúp nhé.</p><ul style="padding-left:20px;margin:0 0 12px">' + l.html + '</ul>',
                 text: actor + ' chuyển Pending' + (x.text ? ': "' + x.text + '"' : '') + '\n' + l.text });
  });
  (K.checkin || []).forEach(function(x){
    var url = EH.APP_URL + '#ev-' + encodeURIComponent(ehS_(x.ev && x.ev.id));
    paras.push({ html: '<p>' + ehH_(actor) + ' vừa cập nhật tình hình tuần của sự kiện <b>' + ehH_(ehEvLine_(x.ev)) + '</b>:</p><p style="margin:0 0 12px;padding:8px 12px;border-left:3px solid ' + (x.rag === 'Đỏ' ? '#B83A2E' : '#C3CDD8') + ';color:#333">' +
                       ehH_(x.text).replace(/\n/g, '<br>') + '</p><p><a href="' + url + '">Mở sự kiện</a></p>', text: actor + ' cập nhật tuần · ' + ehEvLine_(x.ev) + ':\n' + x.text + '\n' + url });
  });
}
function ehFlowSubj_(K, items, evs){
  var ks = Object.keys(K);
  if (ks.length === 1 && K.block) return 'Pending: ' + ehS_(K.block[0].task.title) + ' · ' + (evs[0] || '');
  if (ks.length === 1 && K.checkin) return 'Cập nhật tuần: ' + (evs[0] || '') + ' · ' + K.checkin[0].rag + (/Cần hỗ trợ/.test(K.checkin[0].text) ? ' · cần hỗ trợ' : '');
  return '';
}

/* ══════════ ⑥ REPORT HUB: việc sự kiện ⇒ sub "H:" dưới Key task trùng tên — ĐÃ TẮT 11/11/2026 (Event_Sync.gs v2.3 EVS_HUB = false) ══════════ */
function ehHubSubs_(idx){
  var out = { subs: {}, keyNk: {} };
  if (!PropertiesService.getScriptProperties().getProperty('EH_BOOK')) return out;
  var ss = ehBook_(), today = ehIso_(new Date()), U = ehUsers_(), par = {}, files = {};
  var E = ehRead_(ss, 'EVENTS'), T = ehRead_(ss, 'TASKS');
  T.forEach(function(t){ if (ehS_(t.parentId)) par[t.parentId] = 1; });
  ehRead_(ss, 'FILES').forEach(function(f){ var k = ehS_(f.taskId); if (k) (files[k] = files[k] || []).push(ehS_(f.name)); });
  var MAP = { 'Xong': ['Completed', 100], 'Bỏ qua': ['Cancelled', 0], 'Chờ duyệt': ['In Progress', 90], 'Pending': ['In Progress', 30], 'Đang làm': ['In Progress', 50] };
  E.forEach(function(e){
    if (ehS_(e.sample) || ehS_(e.state) === 'Huỷ' || ehS_(e.follow) === 'Không' || !ehS_(e.start)) return;
    var dd = ehDays_(today, ehS_(e.start)); if (dd > 200 || ehDays_(ehS_(e.end || e.start), today) > 90) return;
    var nk = [evsNorm_(e.name), evsNorm_(e.offlineName)].filter(function(k){ return k && idx.byNk[k]; })[0]; if (!nk) return;
    var used = {};
    T.filter(function(t){ return ehS_(t.eventId) === e.id && (ehS_(t.parentId) || !par[t.id]); }).sort(function(a, b){ return (ehS_(a.due) || '9') < (ehS_(b.due) || '9') ? -1 : 1; }).forEach(function(t){
      var pic = ehS_(t.pic), u = U[pic]; if (!pic || ehS_(t.role) === 'Sales' || (u && /sales/i.test(u.dept + ' ' + u.title))) return;
      var st = ehS_(t.status) || 'Chưa làm', m = MAP[st] || ['To Do', 0], nm = ehS_(t.title).slice(0, 200), base = nm, n = 1;
      while (used[nm]) nm = base + ' (' + (++n) + ')'; used[nm] = 1;
      var R = ['App Sự kiện MKT · ' + ehS_(t.group).replace(/^\d+\.\s*/, '') + ' · ' + st];
      if (st === 'Pending' && ehS_(t.block)) R.push('Lý do Pending: ' + ehS_(t.block));
      if (ehS_(t.note) && !/^Lập kế hoạch muộn/.test(ehS_(t.note))) R.push('Ghi chú: ' + ehS_(t.note).slice(0, 300));
      if (files[t.id]) R.push('Đã nộp: ' + files[t.id].slice(0, 4).join(', ') + (files[t.id].length > 4 ? '…' : ''));
      R.push(EH.APP_URL + '#t-' + encodeURIComponent(t.id));
      var due = ehS_(t.due), o = { syncKey: 'H:' + t.id, parent: nk, type: '', keyTask: '', subTask: nm, pic: pic, result: R.join('\n'), start: due, planned: due,
                                   status: m[0], progress: m[1], meta: { s: 'eventhub', id: t.id, ev: e.id } };
      o.hash = evsHash_([o.subTask, o.pic, o.result, o.start, o.status, 'h1', nk].join('¦')); o.meta.h = o.hash;
      out.subs[o.syncKey] = o; out.keyNk[nk] = 1;
    });
  });
  return out;
}
