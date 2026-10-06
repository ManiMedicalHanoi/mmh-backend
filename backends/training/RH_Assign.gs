/**
 * ============================================================================
 *  ★ v3.14 — VIỆC ĐƯỢC GIAO TỪ REPORT HUB (sheet RH_Assign trong Training Master)
 * ----------------------------------------------------------------------------
 *  Report Hub ghi nhận mỗi lần giao việc (thêm task cho PIC khác / gửi email giao việc) ⇒
 *   · người nhận thấy popup "Việc mới được giao" + nhãn "✉ Email từ …" trên lịch;
 *   · người giao theo dõi: đã xem trên Report Hub chưa (SeenAt), đã hoàn thành chưa (DoneAt);
 *   · hoàn thành ⇒ tự email báo người giao (CC người nhận), mỗi việc 1 lần;
 *   · trao đổi (Replies) gắn vào việc: trả lời ngay trên Report Hub, bên kia nhận email.
 *  Email giao việc có thể gửi từ hộp thư của chính người giao (Report Hub mở sẵn thư trong Gmail / Outlook,
 *  tiêu đề có mã [MMH #A…]) hoặc từ hộp thư hệ thống như trước (Via = own | system).
 *
 *  Danh tính: phiên đăng nhập email (tk) nếu có; giai đoạn 1 vẫn nhận khoá cầu nối + tên (actor).
 *  Email từng người: sheet RH_Users (LastEmail nếu đã đăng nhập, ngược lại <phần trước @>@mani.inc).
 * ============================================================================
 */

var RH_ASSIGN = {
  SHEET  : 'RH_Assign',
  HEADER : ['Id', 'CreatedAt', 'Src', 'No', 'Name', 'KeyTask', 'Pic', 'Assigner', 'Start', 'Due', 'Via',
            'SeenAt', 'DoneAt', 'DoneMailAt', 'Result', 'Replies', 'Rid'],
  KEEP_DAYS : 180,          // danh sách trả về: việc giao trong 180 ngày gần nhất
  APP_URL   : 'https://manimedicalhanoi.github.io/MMH-Report/'
};

function rhaSheet() {
  return hubCached('shRhAssign', function(){
    return hubEnsureHeader(hubSheet(RH_ASSIGN.SHEET, true), RH_ASSIGN.HEADER);
  });
}

function rhaIso(v) {
  if (v instanceof Date) return hubFmt(v, "yyyy-MM-dd'T'HH:mm:ss");
  return hubNorm(v);
}
function rhaDay(v) {
  if (v instanceof Date) return hubFmt(v, 'yyyy-MM-dd');
  return hubNorm(v).substring(0, 10);
}

function rhaRead() {
  var sh = rhaSheet(), last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, RH_ASSIGN.HEADER.length).getValues(), out = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (!hubNorm(r[0])) continue;
    var replies = [];
    try { replies = r[15] ? JSON.parse(r[15]) : []; } catch (e) { replies = []; }
    out.push({
      row: i + 2, id: hubNorm(r[0]), createdAt: rhaIso(r[1]), src: hubNorm(r[2]) || 'marketing', no: hubNorm(r[3]),
      name: hubNorm(r[4]), keyTask: hubNorm(r[5]), pic: hubNorm(r[6]), assigner: hubNorm(r[7]),
      start: rhaDay(r[8]), due: rhaDay(r[9]), via: hubNorm(r[10]) || 'system',
      seenAt: rhaIso(r[11]), doneAt: rhaIso(r[12]), doneMailAt: rhaIso(r[13]), result: hubNorm(r[14]),
      replies: replies, rid: hubNorm(r[16])
    });
  }
  return out;
}

function rhaPublic(a) {
  return {id: a.id, createdAt: a.createdAt, src: a.src, no: a.no, name: a.name, keyTask: a.keyTask, pic: a.pic,
          assigner: a.assigner, start: a.start, due: a.due, via: a.via, seen: !!a.seenAt, seenAt: a.seenAt,
          done: !!a.doneAt, doneAt: a.doneAt, result: a.result, replies: a.replies};
}

/** Người thao tác: phiên email (tk) ⇒ chắc chắn; không có ⇒ khoá cầu nối + tên (giai đoạn 1) */
function rhaActor(p) {
  if (hubNorm(p.tk)) {
    var c = rhCheck(p.tk);
    if (c.u) return {pic: c.u.pic, local: c.u.local, verified: true};
  }
  hubRhKeyOk(p);
  var a = hubNorm(p.actor);
  if (!a) throw new Error('Report Hub: thiếu tên người thao tác.');
  var list = rhUsers(), k = hubKeyV(a);
  for (var i = 0; i < list.length; i++) if (hubKeyV(list[i].pic) === k) return {pic: list[i].pic, local: list[i].local, verified: false};
  return {pic: a, local: '', verified: false};
}

/** Email theo tên PIC (RH_Users) */
function rhaEmailOf(pic) {
  var list = rhUsers(), k = hubKeyV(pic);
  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    if (hubKeyV(u.pic) === k && u.active) return u.lastEmail || (u.local + '@' + HUB.SEND_DOMAIN);
  }
  return '';
}

function rhaSame(a, b) { return hubKeyV(a) === hubKeyV(b); }

/** Danh sách việc giao: items (180 ngày, người liên quan) + mine (việc giao cho tôi, chưa xong) */
function apiRhAssignList(p) {
  var me = rhaActor(p), cut = new Date(Date.now() - RH_ASSIGN.KEEP_DAYS * 86400000), all = rhaRead();
  var items = all.filter(function(a){ var d = new Date(a.createdAt); return isNaN(d.getTime()) || d >= cut; }).map(rhaPublic);
  var mine = items.filter(function(a){ return rhaSame(a.pic, me.pic) && !a.done; });
  var byMe = items.filter(function(a){ return rhaSame(a.assigner, me.pic); });
  return {ok:true, items: items, mine: mine, byMe: byMe};
}

/** Ghi nhận 1 lần giao việc (chống trùng theo rid) */
function apiRhAssignAdd(p) {
  var me = rhaActor(p);
  var name = hubNorm(p.name), pic = hubNorm(p.pic);
  if (!name || !pic) return {ok:false, error:'Thiếu tên công việc hoặc người nhận.'};
  if (rhaSame(pic, me.pic)) return {ok:false, error:'Không tự giao việc cho chính mình.'};
  var rid = hubNorm(p.rid);
  return hubWithLock(function(){
    if (rid) {
      var dup = rhaRead().filter(function(a){ return a.rid === rid; })[0];
      if (dup) return {ok:true, id: dup.id, repeated: true, item: rhaPublic(dup)};
    }
    var id = 'A' + hubFmt(new Date(), 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    var via = hubNorm(p.via) === 'own' ? 'own' : 'system';
    rhaSheet().appendRow([id, new Date(), hubNorm(p.src) || 'marketing', hubNorm(p.no), name, hubNorm(p.keyTask), pic, me.pic,
      hubNorm(p.start), hubNorm(p.due), via, '', '', '', '', '[]', rid]);
    hubLog('INFO', 'rhAssignAdd', me.pic + ' giao "' + name + '" cho ' + pic + ' (' + via + ')', id);
    return {ok:true, id: id};
  });
}

function rhaIds(p) { return hubNorm(p.ids).split(',').map(hubNorm).filter(Boolean); }

/** Người nhận đã thấy việc trên Report Hub */
function apiRhAssignSeen(p) {
  var me = rhaActor(p), ids = rhaIds(p);
  if (!ids.length) return {ok:true, n:0};
  var n = 0;
  hubWithLock(function(){
    var sh = rhaSheet();
    rhaRead().forEach(function(a){
      if (ids.indexOf(a.id) < 0 || a.seenAt || !rhaSame(a.pic, me.pic)) return;
      sh.getRange(a.row, 12).setValue(new Date()); n++;
    });
  });
  return {ok:true, n: n};
}

/** Hoàn thành ⇒ email báo người giao (CC người nhận), mỗi việc 1 lần */
function apiRhAssignDone(p) {
  var me = rhaActor(p), ids = rhaIds(p), result = hubNorm(p.result).substring(0, 1500), sent = [];
  if (!ids.length) return {ok:true, sent: sent};
  var todo = [];
  hubWithLock(function(){
    var sh = rhaSheet();
    rhaRead().forEach(function(a){
      if (ids.indexOf(a.id) < 0 || a.doneMailAt) return;
      if (!rhaSame(a.pic, me.pic) && !rhaSame(a.assigner, me.pic)) return;   // chỉ người nhận / người giao báo hoàn thành
      var now = new Date();
      sh.getRange(a.row, 13, 1, 3).setValues([[a.doneAt ? a.doneAt : now, now, result || a.result]]);
      todo.push(a);
    });
  });
  todo.forEach(function(a){
    var to = rhaEmailOf(a.assigner), cc = rhaEmailOf(a.pic);
    if (!to) return;
    var rows = [['Công việc', a.name], ['Thuộc Key Task', a.keyTask], ['Hạn', a.due ? hubFmt(hubToDate(a.due), 'dd/MM/yyyy') : ''],
                ['Hoàn thành lúc', hubFmt(new Date(), 'dd/MM/yyyy HH:mm')], ['Kết quả', result || a.result]];
    var inner = '<p style="margin:0 0 10px">Chào <b>' + hubEsc(a.assigner) + '</b>,</p>' +
      '<p style="margin:0 0 10px"><b>' + hubEsc(a.pic) + '</b> đã hoàn thành công việc bạn giao trên MMH Report Hub:</p>' +
      '<table style="border-collapse:collapse;font-size:14px;margin:4px 0 14px">' + rows.filter(function(r){ return r[1]; }).map(function(r){
        return '<tr><td style="color:#6B7B8C;padding:3px 16px 3px 0;vertical-align:top">' + r[0] + '</td><td style="font-weight:600">' + hubEsc(r[1]) + '</td></tr>';
      }).join('') + '</table>' + hubMailButton(RH_ASSIGN.APP_URL, 'Mở MMH Report Hub');
    try {
      MailApp.sendEmail({to: to, cc: cc && cc !== to ? cc : undefined, replyTo: cc || undefined,
        subject: '[MMH] Đã hoàn thành: ' + a.name + ' [#' + a.id + ']',
        htmlBody: hubMailShell('MMH REPORT HUB', 'Việc bạn giao đã hoàn thành', inner, 'Email tự động từ MMH Report Hub.'),
        name: 'MMH Report Hub'});
      sent.push(a.id);
    } catch (e) { hubLog('ERROR', 'rhAssignDone', 'Không gửi được email hoàn thành ' + a.id, e.message); }
  });
  return {ok:true, sent: sent};
}

/** Trao đổi gắn vào việc: người nhận ↔ người giao. Bên kia nhận email. */
function apiRhAssignReply(p) {
  var me = rhaActor(p), id = hubNorm(p.id), text = hubNorm(p.text).substring(0, 2000);
  if (!id || !text) return {ok:false, error:'Thiếu nội dung trả lời.'};
  var item = null;
  hubWithLock(function(){
    var a = rhaRead().filter(function(x){ return x.id === id; })[0];
    if (!a) throw new Error('Không tìm thấy việc được giao ' + id + '.');
    if (!rhaSame(a.pic, me.pic) && !rhaSame(a.assigner, me.pic)) throw new Error('Chỉ người giao hoặc người nhận được trả lời.');
    a.replies = (a.replies || []).concat([{by: me.pic, at: hubFmt(new Date(), "yyyy-MM-dd'T'HH:mm:ss"), text: text, v: me.verified ? 1 : 0}]).slice(-50);
    rhaSheet().getRange(a.row, 16).setValue(JSON.stringify(a.replies));
    if (rhaSame(a.pic, me.pic) && !a.seenAt) rhaSheet().getRange(a.row, 12).setValue(new Date());
    item = a;
  });
  var other = rhaSame(item.pic, me.pic) ? item.assigner : item.pic, to = rhaEmailOf(other), from = rhaEmailOf(me.pic);
  if (to) {
    var inner = '<p style="margin:0 0 10px">Chào <b>' + hubEsc(other) + '</b>,</p>' +
      '<p style="margin:0 0 8px"><b>' + hubEsc(me.pic) + '</b> trả lời về công việc <b>' + hubEsc(item.name) + '</b>:</p>' +
      '<div style="border-left:3px solid #CFE2F3;background:#F7FAFD;padding:10px 14px;margin:0 0 14px;white-space:pre-wrap">' + hubEsc(text) + '</div>' +
      hubMailButton(RH_ASSIGN.APP_URL, 'Trả lời trên MMH Report Hub');
    try {
      MailApp.sendEmail({to: to, replyTo: from || undefined, subject: 'Re: [MMH] ' + item.name + ' [#' + item.id + ']',
        htmlBody: hubMailShell('MMH REPORT HUB', 'Trao đổi về việc được giao', inner, 'Trả lời email này sẽ tới thẳng ' + hubEsc(me.pic) + '. Nội dung đã được lưu vào công việc trên Report Hub.'),
        name: me.pic + ' (MMH Report Hub)'});
    } catch (e) { hubLog('ERROR', 'rhAssignReply', 'Không gửi được email trả lời ' + id, e.message); }
  }
  return {ok:true, item: rhaPublic(item)};
}

/** Danh bạ email (soạn thư từ hộp thư của chính mình) — chỉ cho người đã đăng nhập email */
function apiRhDirectory(p) {
  var c = rhCheck(p.tk);
  if (c.err) return {ok:false, code:'AUTH', error: c.err};
  return {ok:true, people: rhUsers().filter(function(u){ return u.active; }).map(function(u){
    return {pic: u.pic, email: u.lastEmail || (u.local + '@' + HUB.SEND_DOMAIN)};
  })};
}
