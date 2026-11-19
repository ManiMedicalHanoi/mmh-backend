/* ══════════════════════════════════════════════════════════════════════════════════════════
 * IPR_Flow.gs — các nút trong menu "IPR Launch": giao việc, xin duyệt / duyệt việc, xin duyệt / quyết định phase,
 * nhắc việc hằng tuần. Email tiếng Anh, thư thường, KHÔNG ghi chức danh trong lời văn; gửi qua mmhMail_.
 * ══════════════════════════════════════════════════════════════════════════════════════════ */
function iprTeam_(ss) {
  var sh = ss.getSheetByName(T.setup), out = {};
  if (!sh) return out;
  sh.getRange(SU.team0, 2, SU.teamN, 5).getValues().forEach(function (r) {
    if (r[0]) out[String(r[0]).trim()] = { name: String(r[1] || '').trim(), email: String(r[2] || '').trim(), mail: String(r[4] || 'Yes') !== 'No' };
  });
  return out;
}
function iprPlan_(ss, i) { return ss.getSheetByName(T.setup).getRange(SU.plan0 + i, 9).getValue(); }
function iprMe_(ss) {
  var me = '';
  try { me = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (_) {}
  var team = iprTeam_(ss), who = { email: me, roles: [], name: '' };
  Object.keys(team).forEach(function (role) {
    var e = team[role].email.toLowerCase();
    if (me && e && e.split('@')[0] === me.split('@')[0]) { who.roles.push(role); who.name = who.name || team[role].name; }
  });
  return who;
}
function iprUrl_(ss, tab) { var s = ss.getSheetByName(tab); return ss.getUrl() + (s ? '#gid=' + s.getSheetId() : ''); }
function iprDate_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/yyyy') : (d || ''); }
function iprSign_(who) { return 'Best regards,\n' + (who && who.name ? who.name : 'IPR-01EF Launch Tracker'); }
function iprSend_(ss, to, subject, lines, who) {
  var t = (Array.isArray(to) ? to : [to]).filter(function (x) { return x && x.email; });
  if (!t.length) return '';
  var names = t.map(function (x) { return x.name; }).filter(String);
  var body = 'Dear ' + (names.length ? names.join(', ') : 'colleague') + ',\n\n' + lines.join('\n') + '\n\n' + iprSign_(who);
  var opt = { to: t.map(function (x) { return x.email; }).join(','), subject: '[IPR-01EF Launch] ' + subject, body: body, name: 'IPR-01EF Launch Tracker' };
  if (who && who.email) opt.replyTo = who.email;
  mmhMail_(opt);
  return names.join(', ');
}
function iprLog_(ss, by, action, item, detail, sentTo) {
  var sh = ss.getSheetByName(T.appr); if (!sh) return;
  var last = Math.max(sh.getLastRow(), AP.hist0 - 1), r = last + 1;
  var col = sh.getRange(AP.hist0, 2, Math.max(1, last - AP.hist0 + 1), 1).getValues();
  for (var i = 0; i < col.length; i++) if (col[i][0] === '') { r = AP.hist0 + i; break; }
  sh.getRange(r, 2, 1, 6).setValues([[new Date(), by, action, item, detail, sentTo || '']]);
  sh.getRange(r, 2).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
  sh.getRange(r, 2, 1, 6).setFontSize(9.5).setBorder(true, true, true, true, true, true, K.grid, SpreadsheetApp.BorderStyle.SOLID);
}
function iprTasks_(ss) {
  var sh = ss.getSheetByName(T.tasks), last = sh.getLastRow();
  if (last < TK.r0) return { sh: sh, rows: [] };
  var v = sh.getRange(TK.r0, 1, last - TK.r0 + 1, TC.last).getValues(), rows = [];
  v.forEach(function (r, i) { if (String(r[TC.no - 1]).trim()) rows.push({ row: TK.r0 + i, v: r, g: function (k) { return this.v[TC[k] - 1]; } }); });
  return { sh: sh, rows: rows };
}
function iprSelTask_(ss) {
  var ui = SpreadsheetApp.getUi(), sh = ss.getActiveSheet();
  if (sh.getName() !== T.tasks) { ui.alert('Open the tab "' + T.tasks + '" and select a cell in the task row first.'); return null; }
  var r = sh.getActiveRange().getRow();
  var v = sh.getRange(r, 1, 1, TC.last).getValues()[0];
  if (r < TK.r0 || !String(v[TC.no - 1]).trim()) { ui.alert('Select a cell in a task row (a row with a number in column No.).'); return null; }
  return { sh: sh, row: r, v: v, g: function (k) { return v[TC[k] - 1]; } };
}
function iprWho_(team, role) { var t = team[role]; return t && t.email && t.mail ? { name: t.name || role, email: t.email } : null; }

/* ── Thêm dòng việc ─────────────────────────────────────────────────────────────────────── */
function iprAddTaskRow() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getActiveSheet(), ui = SpreadsheetApp.getUi();
  if (sh.getName() !== T.tasks) { ui.alert('Open the tab "' + T.tasks + '" and select the row above the new task.'); return; }
  var r = Math.max(sh.getActiveRange().getRow(), TK.r0), last = sh.getLastRow(), src = -1;
  for (var k = r; k <= last && src < 0; k++) if (sh.getRange(k, TC.flag).getFormula()) src = k;
  for (var k2 = r; k2 >= TK.r0 && src < 0; k2--) if (sh.getRange(k2, TC.flag).getFormula()) src = k2;
  if (src < 0) { ui.alert('No task row found to copy the formulas from. Use menu Update / rebuild tracker.'); return; }
  sh.insertRowAfter(r);
  var nr = r + 1, from = src >= nr ? src + 1 : src;
  sh.getRange(from, 1, 1, TC.last).copyTo(sh.getRange(nr, 1, 1, TC.last));
  TK_IN.forEach(function (c) { sh.getRange(nr, c).clearContent(); });
  sh.setActiveRange(sh.getRange(nr, TC.no));
  ss.toast('New task row added. Type the number and choose the Step.', 'IPR Launch', 6);
}

/* ── Giao việc ──────────────────────────────────────────────────────────────────────────── */
function iprSendAssignments() {
  var ss = SpreadsheetApp.getActive(), ui = SpreadsheetApp.getUi(), team = iprTeam_(ss), who = iprMe_(ss), T_ = iprTasks_(ss), by = {};
  T_.rows.forEach(function (t) {
    var st = t.g('st'), pic = String(t.g('pic') || '').trim();
    if (!pic || st === 'Done' || st === 'Cancelled' || t.g('sent')) return;
    (by[pic] = by[pic] || []).push(t);
  });
  var roles = Object.keys(by);
  if (!roles.length) { ui.alert('No new assignments: every open task with a PIC has already been emailed.'); return; }
  var miss = roles.filter(function (r) { return !iprWho_(team, r); });
  var msg = roles.map(function (r) { return '· ' + r + (team[r] && team[r].name ? ' (' + team[r].name + ')' : '') + ': ' + by[r].length + ' task(s)' + (miss.indexOf(r) >= 0 ? ' — no email in SETUP, skipped' : ''); }).join('\n');
  if (ui.alert('Send assignment emails', msg + '\n\nSend now?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var url = iprUrl_(ss, T.tasks), today = new Date(), sent = 0;
  roles.forEach(function (role) {
    var to = iprWho_(team, role); if (!to) return;
    var lines = ['The following tasks of the IPR-01EF launch have been assigned to you:', ''];
    by[role].forEach(function (t) { lines.push('  ' + t.g('no') + '  ' + t.g('task') + (t.g('pe') ? '  —  plan end ' + iprDate_(t.g('pe')) : '')); });
    lines.push('', 'Please update Status, Actual end and the evidence file in the tab "' + T.tasks + '":', url);
    iprSend_(ss, to, 'Tasks assigned to you', lines, who);
    by[role].forEach(function (t) { T_.sh.getRange(t.row, TC.sent).setValue(today); });
    iprLog_(ss, who.name || who.email || 'Tracker', 'Assignment sent', by[role].length + ' task(s)', by[role].map(function (t) { return t.g('no'); }).join(', '), to.name);
    sent++;
  });
  ss.toast('Assignment emails sent: ' + sent + '.', 'IPR Launch', 6);
}

/* ── Xin duyệt / duyệt một việc ─────────────────────────────────────────────────────────── */
function iprSubmitTask() {
  var ss = SpreadsheetApp.getActive(), ui = SpreadsheetApp.getUi(), t = iprSelTask_(ss); if (!t) return;
  var ab = String(t.g('ab') || '').trim();
  if (!ab) { ui.alert('Task ' + t.g('no') + ' has no "Approval by". Set it (owner) or simply set Status = Done.'); return; }
  if (t.g('chk') && /^Not allowed/.test(t.g('chk'))) { ui.alert('Cannot submit: ' + t.g('chk')); return; }
  if (t.g('nf') === 'Yes' && !t.g('ev')) { ui.alert('Attach the evidence file (column Evidence file) before submitting.'); return; }
  var team = iprTeam_(ss), who = iprMe_(ss), to = iprWho_(team, ab);
  if (ui.alert('Submit for approval', 'Task ' + t.g('no') + ' · ' + t.g('task') + '\nApprover: ' + ab + (to ? ' (' + to.name + ')' : ' — no email in SETUP') + '\n\nContinue?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  t.sh.getRange(t.row, TC.st).setValue('Waiting approval');
  var name = to ? iprSend_(ss, to, 'Approval request – task ' + t.g('no'), ['Task ' + t.g('no') + ' of the IPR-01EF launch is ready for your approval:', '', '  ' + t.g('task'),
    t.g('ev') ? '  Evidence: ' + iprEvidence_(t.sh, t.row) : '', '', 'To approve: select the task row in the tab "' + T.tasks + '" and use menu IPR Launch ▸ Approve selected task.', iprUrl_(ss, T.tasks)], who) : '';
  iprLog_(ss, who.name || who.email || 'PIC', 'Task submitted', t.g('no') + ' ' + t.g('task'), 'Waiting approval', name);
  ss.toast('Task ' + t.g('no') + ' is waiting for approval.', 'IPR Launch', 6);
}
function iprEvidence_(sh, r) {
  var c = sh.getRange(r, TC.ev), f = c.getFormula(), m = /HYPERLINK\("([^"]+)"/i.exec(f || '');
  if (m) return m[1];
  try { var rt = c.getRichTextValue(); if (rt && rt.getLinkUrl()) return rt.getLinkUrl(); } catch (_) {}
  return String(c.getValue() || '');
}
function iprApproveTask() {
  var ss = SpreadsheetApp.getActive(), ui = SpreadsheetApp.getUi(), t = iprSelTask_(ss); if (!t) return;
  var ab = String(t.g('ab') || '').trim(), team = iprTeam_(ss), who = iprMe_(ss);
  if (!ab) { ui.alert('Task ' + t.g('no') + ' does not need an approval.'); return; }
  var ap = team[ab];
  if (!ap || !ap.email) { ui.alert('No email for "' + ab + '" in SETUP · Team & plan. Fill it first so the tracker can check who approves.'); return; }
  if (who.roles.indexOf(ab) < 0) { ui.alert('Only ' + ab + ' (' + ap.email + ') can approve task ' + t.g('no') + '. You are signed in as ' + (who.email || 'an unknown account') + '.'); return; }
  if (t.g('nf') === 'Yes' && !t.g('ev')) { ui.alert('The evidence file is missing. Ask the PIC to attach it first.'); return; }
  if (t.g('open') > 0) { ui.alert('A task in "Depends on" is not Done yet (' + t.g('dep') + ').'); return; }
  var res = ui.prompt('Approve task ' + t.g('no'), t.g('task') + '\n\nComment (optional). Press Cancel to stop.', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var now = new Date();
  t.sh.getRange(t.row, TC.ao).setValue(now);
  if (!t.g('ae')) t.sh.getRange(t.row, TC.ae).setValue(now);
  t.sh.getRange(t.row, TC.st).setValue('Done');
  var pic = iprWho_(team, String(t.g('pic') || '')), cm = res.getResponseText();
  var name = pic ? iprSend_(ss, pic, 'Task ' + t.g('no') + ' approved', ['Task ' + t.g('no') + ' has been approved and marked Done:', '', '  ' + t.g('task'), cm ? '\nComment: ' + cm : '', '', iprUrl_(ss, T.tasks)], who) : '';
  iprLog_(ss, who.name || ab, 'Task approved', t.g('no') + ' ' + t.g('task'), cm || 'Approved', name);
  ss.toast('Task ' + t.g('no') + ' approved.', 'IPR Launch', 6);
}

/* ── Phase: xin duyệt + quyết định ──────────────────────────────────────────────────────── */
function iprPhases_(ss) {
  var sh = ss.getSheetByName(T.appr), v = sh.getRange(AP.ph0, 2, 4, 14).getValues();
  return v.map(function (r, i) { return { p: i + 1, row: AP.ph0 + i, name: r[0], approver: r[1], req: r[2], rec: r[3], sub: r[4], dec: r[5], date: r[6], com: r[7], status: r[8], reqT: r[9], reqM: r[10] }; });
}
function iprCrit_(ss, p) {
  var sh = ss.getSheetByName(T.appr), n = Math.max(1, (AP.cr1 || AP.cr0 + 21) - AP.cr0 + 1), last = sh.getLastRow();
  var v = sh.getRange(AP.cr0, 2, Math.min(25, last - AP.cr0 + 1), 8).getValues(), out = [];
  v.forEach(function (r) { if (+r[6] === p && r[0]) out.push({ text: r[0], type: r[1], met: r[3] === 'Met' }); });
  return out;
}
function iprSubmitPhase() {
  var ss = SpreadsheetApp.getActive(), ui = SpreadsheetApp.getUi(), ph = iprPhases_(ss), who = iprMe_(ss), team = iprTeam_(ss);
  var open = ph.filter(function (x) { return x.dec !== 'Approved'; });
  if (!open.length) { ui.alert('Every phase is already approved.'); return; }
  var res = ui.prompt('Submit a phase for approval', open.map(function (x) { return x.p + ' — ' + x.name + ' · ' + x.status + ' · required met ' + x.req; }).join('\n') + '\n\nType the phase number:', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var p = +String(res.getResponseText()).trim(), x = ph[p - 1];
  if (!x || x.dec === 'Approved') { ui.alert('Phase number not valid or already approved.'); return; }
  if (x.reqM !== x.reqT) {
    var miss = iprCrit_(ss, p).filter(function (c) { return c.type === 'Required' && !c.met; }).map(function (c) { return '· ' + c.text; });
    ui.alert('Cannot submit Phase ' + p + ': required criteria not met yet.\n\n' + miss.join('\n')); return;
  }
  var sh = ss.getSheetByName(T.appr);
  sh.getRange(x.row, 6).setValue(new Date()); sh.getRange(x.row, 7).setValue(''); sh.getRange(x.row, 8).setValue('');
  var gdRole = String(iprPlan_(ss, 3) || ROLES.gd), to = iprWho_(team, gdRole), crit = iprCrit_(ss, p);
  var rec = crit.filter(function (c) { return c.type === 'Recommended'; });
  var lines = ['Phase ' + p + ' (' + PHASES[p - 1][0] + ') of the IPR-01EF launch is ready for your review.',
    'Required criteria met: ' + x.reqT + ' / ' + x.reqT + '. Recommended criteria met: ' + rec.filter(function (c) { return c.met; }).length + ' / ' + rec.length + '.', ''];
  crit.forEach(function (c) { lines.push('  ' + (c.met ? 'Met      ' : 'Not met  ') + c.text + (c.type === 'Recommended' ? ' (recommended)' : '')); });
  lines.push('', 'Please record your decision with menu IPR Launch ▸ Review & decide a phase, in the tab "' + T.appr + '":', iprUrl_(ss, T.appr));
  var name = to ? iprSend_(ss, to, 'Phase ' + p + ' approval request – ' + PHASES[p - 1][0], lines, who) : '';
  iprLog_(ss, who.name || who.email || 'Owner', 'Phase submitted', 'Phase ' + p + ' · ' + PHASES[p - 1][0], 'Waiting approval', name);
  ss.toast('Phase ' + p + ' submitted' + (name ? ' to ' + name : ' (no approver email in SETUP)') + '.', 'IPR Launch', 6);
}
function iprReviewPhase() {
  var ss = SpreadsheetApp.getActive(), ph = iprPhases_(ss), items = ph.map(function (x) {
    var crit = iprCrit_(ss, x.p);
    return '<div class="ph"><div class="hd"><b>Phase ' + x.p + ' · ' + esc_(PHASES[x.p - 1][0]) + '</b><span class="st">' + esc_(x.status) + '</span></div>' +
      '<div class="cr">' + crit.map(function (c) { return '<div class="' + (c.met ? 'ok' : (c.type === 'Required' ? 'no' : 'rec')) + '">' + (c.met ? 'Met' : 'Not met') + ' · ' + esc_(c.text) + (c.type === 'Recommended' ? ' <i>(recommended)</i>' : '') + '</div>'; }).join('') + '</div>' +
      (x.dec === 'Approved' ? '<div class="done">Approved ' + esc_(iprDate_(x.date)) + '</div>' :
        '<textarea id="c' + x.p + '" placeholder="Comment"></textarea><div class="bt"><button onclick="go(' + x.p + ',\'Approved\')"' + (x.reqM === x.reqT ? '' : ' disabled title="Required criteria not met"') + '>Approve</button>' +
        '<button class="ret" onclick="go(' + x.p + ',\'Returned\')">Return</button></div>') + '</div>';
  }).join('');
  var html = '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#1F2933;margin:10px}.ph{border:1px solid #D8DEE4;margin-bottom:10px}.hd{background:#2C4A5E;color:#fff;padding:7px 9px;display:flex;justify-content:space-between}' +
    '.st{font-size:11px}.cr{padding:6px 9px}.cr div{padding:2px 0}.ok{color:#2F6F66}.no{color:#8A4A3A;font-weight:bold}.rec{color:#7A5B12}.done{padding:7px 9px;background:#E3EFEC;color:#2F6F66;font-weight:bold}' +
    'textarea{width:calc(100% - 20px);margin:0 9px;height:44px;font-family:Arial;font-size:12px}.bt{padding:7px 9px;display:flex;gap:8px}button{background:#2F6F66;color:#fff;border:0;padding:6px 14px;cursor:pointer}' +
    'button.ret{background:#8A4A3A}button[disabled]{background:#C3CCD4;cursor:not-allowed}#m{padding:6px 0;color:#2C4A5E;font-weight:bold}</style>' +
    '<div id="m"></div>' + items +
    '<script>function go(p,d){var c=document.getElementById("c"+p).value;document.getElementById("m").textContent="Saving…";' +
    'google.script.run.withSuccessHandler(function(r){document.getElementById("m").textContent=r;}).withFailureHandler(function(e){document.getElementById("m").textContent=e.message;}).iprDecide(p,d,c);}</script>';
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(html).setTitle('Review & decide a phase'));
}
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function iprDecide(p, decision, comment) {
  var ss = SpreadsheetApp.getActive(), who = iprMe_(ss), team = iprTeam_(ss), gdRole = String(iprPlan_(ss, 3) || ROLES.gd), gd = team[gdRole];
  if (!gd || !gd.email) throw new Error('No email for "' + gdRole + '" in SETUP · Team & plan.');
  if (who.roles.indexOf(gdRole) < 0) throw new Error('Only ' + gdRole + ' (' + gd.email + ') can decide a phase. Signed in as ' + (who.email || 'unknown') + '.');
  if (decision !== 'Approved' && decision !== 'Returned') throw new Error('Unknown decision.');
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    var x = iprPhases_(ss)[p - 1];
    if (!x) throw new Error('Phase not found.');
    if (decision === 'Approved' && x.reqM !== x.reqT) throw new Error('Required criteria not met yet.');
    if (decision === 'Returned' && !String(comment || '').trim()) throw new Error('Please write what has to be completed.');
    var sh = ss.getSheetByName(T.appr), now = new Date();
    sh.getRange(x.row, 7, 1, 3).setValues([[decision, now, comment || '']]);
    sh.getRange(x.row, 15).setValue(gdRole);
    SpreadsheetApp.flush();
    var sentTo = '';
    if (decision === 'Approved') {
      var nextP = p + 1, roles = {};
      iprTasks_(ss).rows.forEach(function (t) { var ph = +String(t.g('no')).split('.')[0]; if (ph === nextP && t.g('pic') && t.g('st') !== 'Done' && t.g('st') !== 'Cancelled') roles[t.g('pic')] = 1; });
      var owner = String(iprPlan_(ss, 2) || ROLES.hsm); roles[owner] = 1;
      var to = Object.keys(roles).map(function (r) { return iprWho_(team, r); }).filter(Boolean);
      sentTo = iprSend_(ss, to, 'Phase ' + p + ' approved' + (nextP <= 4 ? ' – Phase ' + nextP + ' is open' : ''),
        ['Phase ' + p + ' (' + PHASES[p - 1][0] + ') of the IPR-01EF launch has been approved on ' + iprDate_(now) + '.', comment ? 'Comment: ' + comment : '',
          nextP <= 4 ? 'Phase ' + nextP + ' (' + PHASES[nextP - 1][0] + ') is now open. Please start your tasks and keep the tab "' + T.tasks + '" up to date.' : 'The launch project is closed.', '', iprUrl_(ss, T.tasks)], who);
    } else {
      var ow = iprWho_(team, String(iprPlan_(ss, 2) || ROLES.hsm));
      sentTo = ow ? iprSend_(ss, ow, 'Phase ' + p + ' returned', ['Phase ' + p + ' (' + PHASES[p - 1][0] + ') of the IPR-01EF launch has been returned for completion.', '', 'To complete: ' + comment, '',
        'Submit it again with menu IPR Launch ▸ Submit a phase for approval when ready.', iprUrl_(ss, T.appr)], who) : '';
      sh.getRange(x.row, 6).setValue('');
    }
    iprLog_(ss, who.name || gdRole, 'Phase ' + decision.toLowerCase(), 'Phase ' + p + ' · ' + PHASES[p - 1][0], comment || decision, sentTo);
    return 'Phase ' + p + ' ' + decision.toLowerCase() + (sentTo ? ' · email sent to ' + sentTo : '') + '. Close this panel to refresh.';
  } finally { lock.releaseLock(); }
}

/* ── Nhắc việc hằng tuần ────────────────────────────────────────────────────────────────── */
function iprReminderIsOn_() { try { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'iprWeeklyReminder'; }); } catch (_) { return false; } }
function iprReminderOn() {
  var ss = SpreadsheetApp.getActive();
  if (!iprReminderIsOn_()) ScriptApp.newTrigger('iprWeeklyReminder').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).nearMinute(30).inTimezone('Asia/Bangkok').create();
  try { ss.getSheetByName(T.setup).getRange(SU.plan0 + 9, 9).setValue('On · Monday 08:30'); } catch (_) {}
  ss.toast('Weekly reminder is on: every Monday around 08:30.', 'IPR Launch', 6);
}
function iprReminderOff() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'iprWeeklyReminder') ScriptApp.deleteTrigger(t); });
  try { ss.getSheetByName(T.setup).getRange(SU.plan0 + 9, 9).setValue('Off'); } catch (_) {}
  ss.toast('Weekly reminder is off.', 'IPR Launch', 6);
}
function iprWeeklyReminder(e) {
  var ss = SpreadsheetApp.getActive(), team = iprTeam_(ss), who = e ? { name: '', email: '' } : iprMe_(ss), today = new Date(), by = {}, url = iprUrl_(ss, T.tasks);
  var soon = new Date(today.getTime() + 14 * 864e5), summary = { overdue: 0, blocked: 0, confirm: 0, soon: 0 };
  iprTasks_(ss).rows.forEach(function (t) {
    var st = t.g('st'), fl = t.g('flag'), pe = t.g('pe'), pic = String(t.g('pic') || '');
    if (st === 'Done' || st === 'Cancelled') return;
    var why = fl === 'Overdue' ? 'overdue since ' + iprDate_(pe) : fl === 'Blocked' ? 'waiting for ' + t.g('dep') : fl === 'To confirm' ? 'status to confirm' : fl === 'Phase locked' ? 'previous phase not approved' :
      (pe instanceof Date && pe <= soon ? 'due ' + iprDate_(pe) : '');
    if (!why) return;
    if (fl === 'Overdue') summary.overdue++; else if (fl === 'Blocked' || fl === 'Phase locked') summary.blocked++; else if (fl === 'To confirm') summary.confirm++; else summary.soon++;
    (by[pic || '(no PIC)'] = by[pic || '(no PIC)'] || []).push('  ' + t.g('no') + '  ' + t.g('task') + '  —  ' + why);
  });
  var sent = [];
  Object.keys(by).forEach(function (role) {
    var to = iprWho_(team, role); if (!to) return;
    sent.push(iprSend_(ss, to, 'Weekly reminder – your open tasks', ['Here are your IPR-01EF launch tasks that need attention this week:', ''].concat(by[role]).concat(['', 'Please update them in the tab "' + T.tasks + '":', url]), who));
  });
  var owner = iprWho_(team, String(iprPlan_(ss, 2) || ROLES.hsm));
  if (owner) {
    var lines = ['Weekly summary of the IPR-01EF launch:', '', '  Overdue: ' + summary.overdue + '   Blocked: ' + summary.blocked + '   To confirm: ' + summary.confirm + '   Due within 14 days: ' + summary.soon, ''];
    Object.keys(by).forEach(function (r) { lines.push(r + ':'); lines = lines.concat(by[r]); lines.push(''); });
    lines.push('Overview: ' + iprUrl_(ss, T.ov));
    sent.push(iprSend_(ss, owner, 'Weekly summary', lines, who));
  }
  iprLog_(ss, e ? 'Tracker (weekly)' : (who.name || who.email || 'Tracker'), 'Weekly reminder', Object.keys(by).length + ' PIC(s)', 'Overdue ' + summary.overdue + ' · blocked ' + summary.blocked + ' · to confirm ' + summary.confirm + ' · due soon ' + summary.soon, sent.filter(String).join('; '));
  if (!e) ss.toast('Weekly reminder sent to ' + sent.filter(String).length + ' person(s).', 'IPR Launch', 6);
}
