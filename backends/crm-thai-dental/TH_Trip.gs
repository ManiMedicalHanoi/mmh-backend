/*************************************************************************************************
 * TH_Trip.gs — v1.0 (09/11/2026) · BUSINESS TRIPS OF THE THAILAND TEAMS (identical file in crm-thai + crm-thai-dental)
 *
 * User request 09/11/2026: each Thailand team has its OWN Business Trip file (not the Vietnam file):
 *   · Thailand Dental   → "Thailand Dental - Business trip Approval and Report"   (1w6jn6Vs…, script 1lti8Kke…)
 *   · Thailand Surgical → "Thailand Surgical - Business trip Approval and Report" (1B3KifUW…, script 1O1fLyoF…)
 * Every trip flow of the CRM app (propose · view · edit / re-send · delete · report · calendar) reads / writes THAT file,
 * the same way as the PIC Menu of the file itself (script "BUSINESS TRIP MANAGEMENT SYSTEM", backends trip-thai-*):
 *   propose  → new row: No · Month · PIC · Start · Finish · Working date · Destination · Co-traveler · Purpose · Expected result ·
 *              Estimated costs · Total estimated costs (THB) · Schedule · Approval Status "Not Yet"; proposal e-mail
 *              "Approval Business trip - ddMMyyyy - PIC" (same template) To Director (else HOD), CC HOD + PIC ⇒ "Already sent propose email".
 *              The HOD still approves with the HOD Menu of the Google Sheet (Approved / Rejected + e-mail to the PIC).
 *   report   → only Approved trips: trip folder (parent folder of the system, name = column "Folder name"), report document
 *              (Word file in the folder), column "Business trip Report" (I. Key Activities / II. Key Findings / III. Follow Up Actions)
 *              + "Actual report date"; e-mail "Business Trip Report - …" To Shuhei-san, CC Director.
 *   edit     → not Approved yet: overwrite the input columns, optionally re-send the proposal e-mail (Rejected ⇒ comment cleared).
 *   delete   → PIC (not Approved) or managers: clear the input cells of the row (formulas kept).
 * Columns are found by their HEADER NAME (row with "PIC" + "Start date"), formulas of the row above are copied to a new row.
 * Money is always Thai baht (THB). All texts are English (Thailand teams).
 * Override the file: Script Property THT_FILE = <Sheet id>.
 *************************************************************************************************/
var THT = {
  FILES: { 'Thailand Dental': '1w6jn6Vsc4WvWJFTsyf2dRFdElnVWq8CS76pVbQKxlhc', 'Thailand Surgical': '1B3KifUWTc_l5G6fCrHl22T3Msb125W8VzU6sTy20WZA' },
  SHEET: 'MMH Travel report', MASTER: 'Master',
  PARENT_FOLDER_ID: '1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',      /* CONFIG.PARENT_FOLDER_ID of the Business Trip system */
  REPORT_TO: 's-takahashi@mani.inc',                          /* Shuhei-san — main recipient of the report e-mail */
  DIRECTOR: 'nt.ha@manimedicalhanoi.com',
  CUR: 'THB',
  /* header name (lower case, no spaces) → key */
  HEAD: { 'no.': 'NO', 'no': 'NO', 'month': 'MONTH', 'pic': 'PIC', 'startdate': 'START', 'finishdate': 'FINISH', 'workingdate': 'DAYS',
          'destination': 'DEST', 'co-traveler': 'CO', 'purpose': 'PURPOSE', 'expectedresult': 'EXPECT', 'estimatedcosts': 'ESTCOST',
          'totalestimatedcosts': 'TOTAL', 'schedule': 'SCHEDULE', 'foldername': 'FOLDER_NAME', 'businesstripreport': 'REPORT',
          'approvalstatus': 'APPROVAL', "manager'scomment": 'COMMENT', 'actualreportdate': 'REPORT_DATE', 'reportdeadline': 'DEADLINE',
          'picemail': 'EMAIL_PIC', 'emailpic': 'EMAIL_PIC', 'directoremail': 'EMAIL_DIR', 'emaildirector': 'EMAIL_DIR',
          'hodemail': 'EMAIL_HOD', 'emailhod': 'EMAIL_HOD', 'ccemail': 'EMAIL_CC' },
  /* fallback = CONFIG.COLUMNS of the Business Trip system */
  DEF: { NO: 2, MONTH: 3, PIC: 4, START: 5, FINISH: 6, DAYS: 7, DEST: 8, CO: 9, PURPOSE: 10, EXPECT: 11, ESTCOST: 12, TOTAL: 13, SCHEDULE: 14,
         FOLDER_NAME: 15, FOLDER_LINK: 16, REPORT: 17, APPROVAL: 18, COMMENT: 19, REPORT_DATE: 20, DEADLINE: 21, EMAIL_PIC: 24,
         EMAIL_DIR: 25, EMAIL_HOD: 26, EMAIL_CC: 27 },
  INPUT: ['START', 'FINISH', 'DEST', 'CO', 'PURPOSE', 'EXPECT', 'ESTCOST', 'TOTAL', 'SCHEDULE'],
  W: 27
};
var _THT = null;

/* ── helpers ── */
function thtS_(v){ return v == null ? '' : String(v).trim(); }
function thtTz_(){ try{ return Session.getScriptTimeZone() || 'Asia/Bangkok'; }catch(e){ return 'Asia/Bangkok'; } }
function thtIso_(v){
  if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, thtTz_(), 'yyyy-MM-dd');
  var s = thtS_(v), m;
  if((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return m[0];
  if((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function thtDate_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function thtDmy_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function thtDays_(a, b){ var x = thtDate_(a), y = thtDate_(b || a); return x && y ? Math.round(Math.abs(y - x) / 86400000) + 1 : ''; }
function thtNum_(v){ if(typeof v === 'number') return v; var n = parseFloat(String(v || '').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; }
function thtMoney_(n){ return Math.round(Number(n) || 0).toLocaleString('en-US'); }
function thtEsc_(t){ return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function thtEscBr_(t){ return thtEsc_(t).replace(/\n/g, '<br/>'); }
function thtMail_(e){ return /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(thtS_(e)); }
function thtKey_(s){ return thtS_(s).toLowerCase().replace(/\s+/g, ''); }
function thtNm_(s){ return thtS_(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function thtApproved_(a){ a = String(a || ''); return /approv/i.test(a) && !/not|reject/i.test(a); }
function thtTeam_(){ try{ return CFG.TEAM; }catch(e){ return ''; } }
function thtFileId_(){
  var v = ''; try{ v = PropertiesService.getScriptProperties().getProperty('THT_FILE') || ''; }catch(e){}
  return v || THT.FILES[thtTeam_()] || '';
}
function thtUrl_(){ return 'https://docs.google.com/spreadsheets/d/' + thtFileId_() + '/edit'; }
function thtBook_(){
  if(_THT && _THT.book) return _THT.book;
  var id = thtFileId_(); if(!id) throw new Error('No Business Trip file for team "' + thtTeam_() + '".');
  var b; try{ b = SpreadsheetApp.openById(id); }
  catch(e){ throw new Error('The CRM cannot open the Business Trip file of ' + thtTeam_() + ' (Editor access needed): ' + (e && e.message || e)); }
  _THT = { book: b }; return b;
}
/* sheet + columns (by header name) + first data row */
function thtLay_(){
  if(_THT && _THT.lay) return _THT.lay;
  var book = thtBook_(), sh = book.getSheetByName(THT.SHEET);
  if(!sh) throw new Error('The Business Trip file has no sheet "' + THT.SHEET + '".');
  var lc = Math.max(THT.W, Math.min(sh.getLastColumn(), 40)), V = sh.getRange(1, 1, 8, lc).getValues(), hr = 0, C = {};
  for(var i = 0; i < V.length && !hr; i++){
    var ks = V[i].map(thtKey_);
    if(ks.indexOf('pic') >= 0 && ks.indexOf('startdate') >= 0){
      hr = i + 1;
      ks.forEach(function(k, j){ var key = THT.HEAD[k] || (/^folderlink/.test(k) ? 'FOLDER_LINK' : ''); if(key && !C[key]) C[key] = j + 1; });
    }
  }
  if(!hr){ hr = 3; C = {}; }
  Object.keys(THT.DEF).forEach(function(k){ if(!C[k]) C[k] = THT.DEF[k]; });
  /* the row under the header is the "Auto / Choose / Text" hint row */
  var hint = sh.getRange(hr + 1, C.PIC).getValue(), data = /^(choose|auto|text)$/i.test(thtS_(hint)) ? hr + 2 : hr + 1;
  _THT.lay = { sh: sh, C: C, hdr: hr, data: data, W: Math.max(lc, THT.W) };
  return _THT.lay;
}
/* sheet Master: C destinations · E members · I name → J PIC email · K Director · L HOD · M CC */
function thtMaster_(){
  if(_THT && _THT.M) return _THT.M;
  var sh = thtBook_().getSheetByName(THT.MASTER); if(!sh) throw new Error('The Business Trip file has no sheet "Master".');
  var n = Math.max(1, sh.getLastRow() - 1), V = sh.getRange(2, 1, n, 13).getValues();
  var col = function(c){ var o = []; V.forEach(function(r){ var x = thtS_(r[c]); if(x && o.indexOf(x) < 0) o.push(x); }); return o; };
  var people = {}, first = null;
  V.forEach(function(r){ var nm = thtS_(r[8]); if(!nm) return;
    people[nm] = { pic: thtS_(r[9]), dir: thtS_(r[10]), hod: thtS_(r[11]), cc: thtS_(r[12]) }; if(!first && thtMail_(r[10])) first = people[nm]; });
  _THT.M = { destinations: col(2), coTravelers: col(4), people: people, first: first };
  return _THT.M;
}
/* CRM PIC ⇒ name in the Business Trip file */
function thtName_(pic){
  var M = thtMaster_(), k = thtNm_(pic), names = Object.keys(M.people).concat(M.coTravelers);
  return names.filter(function(x){ return thtNm_(x) === k; })[0] || names.filter(function(x){ return thtNm_(x).indexOf(k) >= 0 && k; })[0] || thtS_(pic);
}
function thtPicMail_(name){
  var M = thtMaster_(), p = M.people[name];
  if(p && thtMail_(p.pic)) return p.pic;
  try{ var u = USERS[name] || USERS[Object.keys(USERS).filter(function(x){ return thtNm_(x) === thtNm_(name); })[0]]; if(u && thtMail_(u.email)) return u.email; }catch(e){}
  return '';
}
/* approvers of a PIC: sheet Master; a PIC not in Master (e.g. Yong, Miew) ⇒ the team's first Master entry, else the Director */
function thtWho_(name){
  var M = thtMaster_(), p = M.people[name] || M.first || {};
  var dir = thtMail_(p.dir) ? p.dir : THT.DIRECTOR, hod = thtMail_(p.hod) ? p.hod : dir;
  return { me: thtPicMail_(name), dir: dir, hod: hod, cc: p.cc || '', inMaster: !!M.people[name] };
}
/* a team PIC missing from Master I:M (e.g. Yong, Miew) ⇒ add one row (PIC e-mail + approvers of the first entry), so the e-mail
   formulas (X–AA) and the HOD Menu of the file see the trips of that PIC. Only team PICs with a company e-mail. */
function thtEnsurePerson_(name){
  try{
    var M = thtMaster_(); if(M.people[name]) return false;
    var team = []; try{ team = TEAM_PICS; }catch(e){}
    if(!team.some(function(x){ return thtNm_(x) === thtNm_(name); })) return false;
    var me = thtPicMail_(name), f = M.first || {}; if(!thtMail_(me)) return false;
    var sh = thtBook_().getSheetByName(THT.MASTER), last = sh.getLastRow(), I = sh.getRange(2, 9, Math.max(1, last - 1), 1).getValues(), r = 2;
    for(var i = 0; i < I.length; i++) if(thtS_(I[i][0])) r = i + 3;
    sh.getRange(r, 9, 1, 5).setValues([[name, me, f.dir || THT.DIRECTOR, f.hod || f.dir || THT.DIRECTOR, f.cc || '']]);
    M.people[name] = { pic: me, dir: f.dir || THT.DIRECTOR, hod: f.hod || f.dir || THT.DIRECTOR, cc: f.cc || '' };
    return true;
  }catch(e){ return false; }
}
function thtGreeting_(hod){
  var g = 'Dear Ha-san', e = thtS_(hod).toLowerCase();
  if(e && e !== THT.DIRECTOR){ var nm = { 'tt.tuyen@manimedicalhanoi.com': 'Tuyen', 'vtt.hoa@manimedicalhanoi.com': 'Hoa' }[e];
    if(!nm){ var parts = e.split('@')[0].split('.'); nm = parts[parts.length - 1]; nm = nm.charAt(0).toUpperCase() + nm.slice(1); }
    g += ',<br/>Dear ' + thtEsc_(nm) + '-san'; }
  return g;
}

/* ── trip object of a row ── */
function thtObj_(r, row, rich){
  var L = thtLay_(), C = L.C, g = function(k){ return r[C[k] - 1]; };
  var pic = thtS_(g('PIC')), st = thtIso_(g('START'));
  if(!pic || !st || /^(choose|auto|pic)$/i.test(pic)) return null;
  var link = ''; try{ if(rich) link = rich.getLinkUrl() || ''; }catch(e){}
  if(!link){ var q = thtS_(g('FOLDER_LINK')); if(/^https?:\/\//i.test(q)) link = q; }
  var fi = thtIso_(g('FINISH')) || st, no = thtS_(g('NO')).replace(/\.0+$/, '');
  return { tripRow: row, no: no, pic: pic, hubPic: pic, start: st, finish: fi, days: thtNum_(g('DAYS')) || thtDays_(st, fi),
           dest: thtS_(g('DEST')), co: thtS_(g('CO')), purpose: thtS_(g('PURPOSE')), expect: thtS_(g('EXPECT')),
           estCost: thtS_(g('ESTCOST')), total: thtNum_(g('TOTAL')), schedule: thtS_(g('SCHEDULE')), equip: '',
           folderName: thtS_(g('FOLDER_NAME')), folder: link, report: thtS_(g('REPORT')), approval: thtS_(g('APPROVAL')) || 'Not Yet',
           comment: thtS_(g('COMMENT')), reportDate: thtIso_(g('REPORT_DATE')), emailPic: thtS_(g('EMAIL_PIC')),
           emailDir: thtS_(g('EMAIL_DIR')), emailHod: thtS_(g('EMAIL_HOD')), currency: THT.CUR };
}
function thtId_(t){ return 'T' + (t.no || t.tripRow) + '|' + t.pic; }
function thtRows_(){
  var L = thtLay_(), last = L.sh.getLastRow(); if(last < L.data) return [];
  var n = last - L.data + 1, V = L.sh.getRange(L.data, 1, n, L.W).getValues(), R = null, out = [];
  try{ R = L.sh.getRange(L.data, L.C.FOLDER_LINK, n, 1).getRichTextValues(); }catch(e){}
  V.forEach(function(r, i){ var o = thtObj_(r, L.data + i, R ? R[i][0] : null); if(o) out.push(o); });
  return out;
}
function thtRow_(row){
  var L = thtLay_(); row = +row || 0; if(row < L.data || row > L.sh.getLastRow()) return null;
  var v = L.sh.getRange(row, 1, 1, L.W).getValues()[0], rich = null;
  try{ rich = L.sh.getRange(row, L.C.FOLDER_LINK).getRichTextValue(); }catch(e){}
  return thtObj_(v, row, rich);
}
function thtFind_(p){
  var id = thtS_(p.id), r = +p.r || 0, all, i;
  if(r){ try{ var one = thtRow_(r); if(one && (!id || thtId_(one) === id)) return one; }catch(e){} }
  all = thtRows_();
  if(id) for(i = 0; i < all.length; i++) if(thtId_(all[i]) === id) return all[i];
  if(r) for(i = 0; i < all.length; i++) if(all[i].tripRow === r) return all[i];
  return null;
}
function thtPerm_(user, t){
  var isPic = thtNm_(user && user.pic) === thtNm_(t.pic), mgr = false;
  try{ mgr = typeof isMgr_ === 'function' && isMgr_(user.pic); }catch(e){}
  var ap = thtApproved_(t.approval);
  return { canEdit: (isPic || mgr) && !ap, canDelete: (isPic && !ap) || mgr, canReport: isPic || mgr, approved: ap };
}

/* ── costs: lines {d, a, c} ⇒ "Gasoline: 2,350 THB" lines + total (always THB) ── */
function thtCosts_(f){
  var cl = f.costLines; if(typeof cl === 'string'){ try{ cl = JSON.parse(cl); }catch(e){ cl = null; } }
  if(Array.isArray(cl) && cl.length){
    var sum = 0, lines = [];
    cl.forEach(function(x){ var d = thtS_(x && x.d), a = Math.round(thtNum_(x && x.a)); if(!d && !a) return; sum += a; lines.push((d || 'Expense') + ': ' + thtMoney_(a) + ' ' + THT.CUR); });
    if(lines.length){ f.estimatedCost = lines.join('\n'); f.totalCost = sum; }
  } else {
    f.estimatedCost = thtS_(f.estimatedCost).replace(/\b(VND|USD|BATH|baht)\b/gi, THT.CUR);
    f.totalCost = Math.round(thtNum_(f.totalCost));
  }
  ['destination', 'coTraveler'].forEach(function(k){ if(Array.isArray(f[k])) f[k] = f[k].join(', '); });
  return f;
}

/* ── e-mail templates (same as the Business Trip system) ── */
function thtProposalHtml_(greeting, picName, trip){
  var td = 'border:1px solid #000000;padding:8px;font-family:Aptos,Calibri,sans-serif;font-size:11pt;', th = td + 'font-weight:bold;color:#000000;';
  var p = 'margin:0 0 15px 0;font-family:Aptos,Calibri,sans-serif;font-size:11pt;color:#000000;line-height:1.6;';
  return '<div style="font-family:Aptos,Calibri,sans-serif;font-size:11pt;color:#000000;padding:20px">' +
    '<p style="margin:0 0 20px 0;font-size:14pt;font-weight:bold">Business Trip Approval Request</p>' +
    '<p style="' + p + '">' + greeting + ',</p>' +
    '<p style="' + p + '">I would like to request your approval for the following business trip(s). Please review the details below:</p>' +
    '<table cellspacing="0" cellpadding="0" border="1" width="100%" style="border-collapse:collapse;margin:20px 0;border:1px solid #000000">' +
    '<tr style="background-color:#f0f0f0"><th style="' + th + 'text-align:center">Row</th><th style="' + th + '">Destination</th><th style="' + th + 'text-align:center">Days</th>' +
    '<th style="' + th + 'text-align:center">Start Date</th><th style="' + th + 'text-align:center">Finish Date</th><th style="' + th + '">Purpose</th><th style="' + th + '">Schedule</th><th style="' + th + '">Estimated Cost</th></tr>' +
    '<tr><td style="' + td + 'text-align:center">' + trip.row + '</td><td style="' + td + '">' + thtEscBr_(trip.destination) + '</td><td style="' + td + 'text-align:center">' + thtEsc_(trip.workingDate) + '</td>' +
    '<td style="' + td + 'text-align:center">' + thtEsc_(trip.startDate) + '</td><td style="' + td + 'text-align:center">' + thtEsc_(trip.finishDate) + '</td>' +
    '<td style="' + td + '">' + thtEscBr_(trip.purpose) + '</td><td style="' + td + '">' + thtEscBr_(trip.schedule) + '</td><td style="' + td + 'text-align:right">' + thtEscBr_(trip.estimatedCost) +
    (trip.total ? '<br/><b>Total: ' + thtMoney_(trip.total) + ' ' + THT.CUR + '</b>' : '') + '</td></tr></table>' +
    '<p style="' + p + '">Please review and approve at your earliest convenience.</p>' +
    '<p style="margin:20px 0 0 0"><a href="' + thtUrl_() + '" style="color:#0066cc;text-decoration:underline;font-weight:bold">Click here to review</a></p>' +
    '<p style="margin:30px 0 0 0;line-height:1.6">Best regards,<br/><strong>' + thtEsc_(picName) + '</strong></p>' +
    '<p style="margin-top:30px;padding-top:15px;border-top:1px solid #000000;font-size:10pt">Mani Medical Hanoi - Business Trip Management System · ' +
    Utilities.formatDate(new Date(), thtTz_(), 'dd/MM/yyyy HH:mm') + ' · sent from MMH CRM</p></div>';
}
function thtBullets_(text){
  return String(text || '').split('\n').map(function(l){ return l.trim(); }).filter(String).map(function(l){ return '• ' + thtEsc_(l); }).join('<br/>') || 'N/A';
}
function thtReportHtml_(t, ka, kf, fu, folder){
  var p = 'font-family:Aptos,Calibri,sans-serif;font-size:11pt;color:#000000;';
  return '<div style="' + p + 'padding:20px">' +
    '<p style="margin:0 0 10px 0">Dear Ha san,</p><p style="margin:0 0 20px 0">Dear Shuhei san,</p>' +
    '<p style="margin:0 0 15px 0;line-height:1.6">Here is my report for business trip at <strong>' + thtEsc_(t.dest) + '</strong> for <strong>' + thtEsc_(t.days) + ' days</strong>:</p>' +
    '<div style="margin:20px 0;background-color:#f9f9f9;border:1px solid #000000;padding:15px">' +
    '<p style="margin:0 0 8px 0"><strong>Total Cost:</strong> ' + (t.total ? thtMoney_(t.total) + ' ' + THT.CUR : 'N/A') + '</p>' +
    '<p style="margin:0 0 8px 0;line-height:1.6"><strong>Schedule:</strong> ' + thtEscBr_(t.schedule || 'N/A') + '</p>' +
    '<p style="margin:0;line-height:1.6"><strong>Purpose:</strong> ' + thtEscBr_(t.purpose || 'N/A') + '</p></div>' +
    '<p style="margin:20px 0 10px 0;font-weight:bold">I. Key Activities</p><p style="margin:0 0 15px 0;line-height:1.8">' + thtBullets_(ka) + '</p>' +
    '<p style="margin:20px 0 10px 0;font-weight:bold">II. Key Findings</p><p style="margin:0 0 15px 0;line-height:1.8">' + thtBullets_(kf) + '</p>' +
    '<p style="margin:20px 0 10px 0;font-weight:bold">III. Follow Up Actions</p><p style="margin:0 0 15px 0;line-height:1.8">' + thtBullets_(fu) + '</p>' +
    (folder ? '<p style="margin:30px 0 0 0">Please <a href="' + folder + '" style="color:#000000;text-decoration:underline;font-weight:bold">click here</a> to see more detail about this trip.</p>' : '') +
    '<p style="margin:30px 0 0 0;line-height:1.6">Best regards,<br/><strong>' + thtEsc_(t.pic) + '</strong></p>' +
    '<p style="margin-top:30px;padding-top:15px;border-top:1px solid #000000;font-size:10pt">Mani Medical Hanoi - Business Trip Management System · ' +
    Utilities.formatDate(new Date(), thtTz_(), 'dd/MM/yyyy HH:mm') + ' · sent from MMH CRM</p></div>';
}
function thtSendProposal_(t, f, row){
  var w = thtWho_(t.pic), to = w.dir || w.hod, cc = [];
  if(w.hod && w.hod.toLowerCase() !== String(to).toLowerCase()) cc.push(w.hod);
  if(w.me && cc.indexOf(w.me) < 0) cc.push(w.me);
  if(!thtMail_(to)) throw new Error('no approver e-mail (sheet Master)');
  var sd = thtDmy_(thtIso_(f.startDate)), fd = thtDmy_(thtIso_(f.finishDate) || thtIso_(f.startDate));
  var trip = { row: row, destination: f.destination, workingDate: thtDays_(thtIso_(f.startDate), thtIso_(f.finishDate)), startDate: sd, finishDate: fd,
               purpose: f.purpose, schedule: f.schedule, estimatedCost: f.estimatedCost, total: f.totalCost };
  var opt = { to: to, subject: 'Approval Business trip - ' + sd.replace(/\//g, '') + ' - ' + t.pic,
              htmlBody: thtProposalHtml_(thtGreeting_(w.hod), t.pic, trip), name: t.pic + ' (MMH CRM)' };
  if(cc.length) opt.cc = cc.join(',');
  if(w.me) opt.replyTo = w.me;
  mmhMail_(opt);
  return { to: to, cc: cc.join(', ') };
}
/* write the formulas of the row above into the cells of a new row that have none (No / Month / Working date / Folder name / deadline …) */
function thtFormulas_(sh, row, L, written){
  if(row <= L.data) return;
  try{
    var prev = sh.getRange(row - 1, 1, 1, L.W).getFormulasR1C1()[0], cur = sh.getRange(row, 1, 1, L.W).getFormulasR1C1()[0];
    prev.forEach(function(f, j){ if(f && !cur[j] && !written[j + 1]) sh.getRange(row, j + 1).setFormulaR1C1(f); });
  }catch(e){}
}

/* ════════ actions ════════ */
function thtMaster2(user, p){
  var M = thtMaster_(), nm = thtName_(thtS_(p.forPic) || user.pic), w = thtWho_(nm);
  var co = M.coTravelers.filter(function(x){ return thtNm_(x) !== thtNm_(nm); });
  return { ok: true, master: { destinations: M.destinations, coTravelers: co, equipment: [] }, tripName: nm,
           to: w.dir, cc: [w.hod !== w.dir ? w.hod : '', w.me].filter(String).join(', '), file: thtUrl_(), currency: THT.CUR, noEquip: true, team: thtTeam_() };
}
function thtPropose(user, p){
  var f = p.trip; if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
  if(!f) return { ok: false, error: 'Missing trip data.' };
  f = thtCosts_(f);
  var start = thtIso_(f.startDate), fin = thtIso_(f.finishDate) || start;
  if(!start || !thtS_(f.destination)) return { ok: false, error: 'Start date and Destination are required.' };
  if(fin < start) return { ok: false, error: 'Finish date must be on or after the Start date.' };
  var L = thtLay_(), sh = L.sh, C = L.C, nm = thtName_(thtS_(p.forPic) || user.pic);
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok: false, error: 'The system is busy, please try again in a few seconds.' }; }
  thtEnsurePerson_(nm);
  var row, no = 0;
  try{
    var last = Math.max(sh.getLastRow(), L.data - 1), V = last >= L.data ? sh.getRange(L.data, 1, last - L.data + 1, L.W).getValues() : [];
    var lastUsed = L.data - 1, empty = 0, maxNo = 0;
    for(var i = 0; i < V.length; i++){
      var r = V[i], pc = thtS_(r[C.PIC - 1]), stv = r[C.START - 1], n = parseInt(thtS_(r[C.NO - 1]), 10);
      if(n > maxNo) maxNo = n;
      if(pc || stv){ lastUsed = L.data + i;
        if(thtNm_(pc) === thtNm_(nm) && thtIso_(stv) === start && thtIso_(r[C.FINISH - 1]) === fin && thtNm_(r[C.DEST - 1]) === thtNm_(f.destination))
          return { ok: true, dup: true, row: L.data + i, message: 'This trip is already in the Business Trip file (row ' + (L.data + i) + ').' };
      }
    }
    /* first empty row after the last trip (like findEmptyRow of the system, never above the last trip) */
    row = lastUsed + 1;
    if(row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 20);
    if(row > L.data){ try{ sh.getRange(row - 1, 2, 1, L.W - 1).copyTo(sh.getRange(row, 2, 1, L.W - 1), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); }catch(e){} }
    var cur = sh.getRange(row, 1, 1, L.W).getFormulas()[0], written = {};
    var set = function(k, v){ var c = C[k]; if(!c || cur[c - 1]) return; written[c] = 1; var rg = sh.getRange(row, c); try{ rg.clearDataValidations(); }catch(e){} rg.setValue(v); };
    no = maxNo + 1;
    set('NO', no);
    set('MONTH', start.replace(/-/g, '').slice(0, 6));
    set('PIC', nm); set('START', thtDate_(start)); set('FINISH', thtDate_(fin)); set('DAYS', thtDays_(start, fin));
    set('DEST', thtS_(f.destination)); set('CO', thtS_(f.coTraveler)); set('PURPOSE', thtS_(f.purpose)); set('EXPECT', thtS_(f.expectedResult));
    set('ESTCOST', thtS_(f.estimatedCost)); set('TOTAL', f.totalCost || ''); set('SCHEDULE', thtS_(f.schedule));
    set('APPROVAL', 'Not Yet');
    thtFormulas_(sh, row, L, written);
    try{ var ms = thtBook_().getSheetByName(THT.MASTER);
         if(ms) sh.getRange(row, C.PIC).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ms.getRange('E2:E30'), true).setAllowInvalid(true).build()); }catch(e){}
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  var mailed = false, rec = null, warn = '';
  try{
    rec = thtSendProposal_({ pic: nm }, f, row);
    sh.getRange(row, C.APPROVAL).setValue('Already sent propose email'); mailed = true;
  }catch(e){ warn = String(e && e.message || e); }
  try{ NA_ENV.log(user, 'trip', f.destination, start + ' – ' + fin + ' · row ' + row); }catch(e){}
  return { ok: true, row: row, no: String(no), tripName: nm, to: rec ? rec.to : '', cc: rec ? rec.cc : '', file: thtUrl_(),
           message: 'Trip proposal saved to the ' + thtTeam_() + ' Business Trip file (row ' + row + ')' +
             (mailed ? ' and the approval e-mail was sent to ' + rec.to + '.' : ' — the approval e-mail was NOT sent: ' + warn) };
}
function thtInfo(user, p){
  var t = thtFind_(p); if(!t) return { ok: false, error: 'Trip not found in the Business Trip file (it may have been deleted or moved).' };
  var pm = thtPerm_(user, t);
  return { ok: true, trip: { id: thtId_(t), row: t.tripRow, no: t.no, pic: t.pic, hubPic: t.pic, start: t.start, finish: t.finish, days: t.days,
    dest: t.dest, co: t.co, purpose: t.purpose, expect: t.expect, estCost: t.estCost, total: t.total, schedule: t.schedule, equip: '',
    folder: t.folder, report: t.report, reportDate: t.reportDate, approval: t.approval, comment: t.comment, currency: THT.CUR,
    approved: pm.approved, canReport: pm.canReport, canEdit: pm.canEdit, canDelete: pm.canDelete, file: thtUrl_() } };
}
function thtUpdate(user, p){
  var f = p.trip; if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
  if(!f) return { ok: false, error: 'Missing trip data.' };
  f = thtCosts_(f);
  var t = thtFind_(p); if(!t) return { ok: false, error: 'Trip not found in the Business Trip file (it may have been deleted or moved).' };
  var pm = thtPerm_(user, t);
  if(pm.approved) return { ok: false, error: 'This trip is already Approved — it cannot be edited in the CRM. Ask your manager (the trip can be deleted and proposed again).' };
  if(!pm.canEdit) return { ok: false, error: 'Only ' + t.pic + ' (or a manager) can edit this trip.' };
  var s = thtIso_(f.startDate), fi = thtIso_(f.finishDate) || s;
  if(!s || !thtS_(f.destination)) return { ok: false, error: 'Start date and Destination are required.' };
  if(fi < s) return { ok: false, error: 'Finish date must be on or after the Start date.' };
  var L = thtLay_(), sh = L.sh, C = L.C, row = t.tripRow;
  var lock = LockService.getScriptLock(); if(!lock.tryLock(20000)) return { ok: false, error: 'The system is busy, please try again in a few seconds.' };
  try{
    var cur = sh.getRange(row, 1, 1, L.W).getFormulas()[0];
    var set = function(k, v){ var c = C[k]; if(!c || cur[c - 1]) return; var rg = sh.getRange(row, c); try{ rg.clearDataValidations(); }catch(e){} rg.setValue(v); };
    set('START', thtDate_(s)); set('FINISH', thtDate_(fi)); set('DAYS', thtDays_(s, fi)); set('MONTH', s.replace(/-/g, '').slice(0, 6));
    set('DEST', thtS_(f.destination)); set('CO', thtS_(f.coTraveler)); set('PURPOSE', thtS_(f.purpose)); set('EXPECT', thtS_(f.expectedResult));
    set('ESTCOST', thtS_(f.estimatedCost)); set('TOTAL', f.totalCost || ''); set('SCHEDULE', thtS_(f.schedule));
  } finally { try{ lock.releaseLock(); }catch(e){} }
  SpreadsheetApp.flush();
  var mailed = false, warn = [];
  var resend = !(p.sendEmail === false || p.sendEmail === 'false' || p.sendEmail === '0' || p.resend === 'false' || p.resend === false);
  if(resend){
    try{
      thtSendProposal_(t, f, row);
      if(/reject/i.test(t.approval)) sh.getRange(row, C.COMMENT).setValue('');
      sh.getRange(row, C.APPROVAL).setValue('Already sent propose email'); mailed = true;
    }catch(e){ warn.push('Saved, but the approval e-mail was not re-sent: ' + (e && e.message || e)); }
  }
  try{ NA_ENV.log(user, 'trip', f.destination, 'edit · row ' + row); }catch(e){}
  return { ok: true, message: 'Trip updated in the Business Trip file' + (mailed ? ' · approval e-mail re-sent' : ''), warn: warn };
}
function thtDelete(user, p){
  var t = thtFind_(p); if(!t) return { ok: true, message: 'The trip is no longer in the Business Trip file.' };
  var pm = thtPerm_(user, t);
  if(!pm.canDelete) return { ok: false, error: pm.approved ? 'This trip is Approved — only a manager can delete it.' : 'Only ' + t.pic + ' (or a manager) can delete this trip.' };
  var L = thtLay_(), sh = L.sh, C = L.C, row = t.tripRow;
  var lock = LockService.getScriptLock(); if(!lock.tryLock(20000)) return { ok: false, error: 'The system is busy, please try again in a few seconds.' };
  try{
    var v = sh.getRange(row, 1, 1, L.W).getValues()[0], fm = sh.getRange(row, 1, 1, L.W).getFormulas()[0];
    if(thtNm_(v[C.PIC - 1]) !== thtNm_(t.pic) || thtIso_(v[C.START - 1]) !== t.start) return { ok: false, error: 'The file has just changed — please reload and try again.' };
    var keep = {}; ['EMAIL_PIC', 'EMAIL_DIR', 'EMAIL_HOD', 'EMAIL_CC'].forEach(function(k){ keep[C[k]] = 1; });
    for(var c = C.NO; c <= L.W; c++){
      if(fm[c - 1] || keep[c] || c === C.NO) continue;
      var rg = sh.getRange(row, c); try{ rg.clearDataValidations(); }catch(e){} rg.clearContent();
    }
  } finally { try{ lock.releaseLock(); }catch(e){} }
  SpreadsheetApp.flush();
  try{ NA_ENV.log(user, 'trip', t.dest, 'delete · row ' + row); }catch(e){}
  return { ok: true, message: 'Trip ' + t.dest + ' (' + thtDmy_(t.start) + ') deleted from the Business Trip file.' };
}
function thtFolderId_(url){
  var u = thtS_(url), m;
  if((m = u.match(/\/folders\/([a-zA-Z0-9_-]+)/))) return m[1];
  if((m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/))) return m[1];
  return /^[a-zA-Z0-9_-]{25,}$/.test(u) ? u : '';
}
/* report document: Word file (HTML) in the trip folder — same content as generateWordReport of the system */
function thtReportDoc_(t, fid, ka, kf, fu){
  var info = [['PIC:', t.pic], ['Destination:', t.dest], ['Date:', thtDmy_(t.start) + ' to ' + thtDmy_(t.finish)], ['Duration:', t.days + ' day(s)'],
              ['Purpose:', t.purpose], ['Co-Traveler:', t.co || 'None'], ['Estimated Cost:', t.estCost], ['Total Cost:', t.total ? thtMoney_(t.total) + ' ' + THT.CUR : 'N/A']];
  var sec = function(h, x){ return '<h3>' + h + '</h3><p style="margin-left:20px;text-align:justify;line-height:1.3">' + thtEscBr_(x || 'N/A') + '</p>'; };
  var html = '<html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt">' +
    '<h1 style="text-align:center">BUSINESS TRIP REPORT</h1><hr/><h2>I. TRIP INFORMATION</h2><table border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse">' +
    info.map(function(r){ return '<tr><td style="background:#E8E8E8;font-weight:bold;width:150px">' + r[0] + '</td><td>' + thtEscBr_(r[1] || 'N/A') + '</td></tr>'; }).join('') +
    '</table><hr/><h2>II. BUSINESS TRIP REPORT</h2>' + sec('1. Key Activities', ka) + sec('2. Key Findings', kf) + sec('3. Follow Up Actions', fu) +
    '<hr/><p style="text-align:right;font-style:italic;font-size:9pt;color:#666666">Report generated on: ' + Utilities.formatDate(new Date(), thtTz_(), 'dd/MM/yyyy HH:mm') + '</p></body></html>';
  var name = (t.folderName || ('BusinessTrip_Report_' + thtDmy_(t.start).replace(/\//g, '') + '_' + t.dest)).replace(/[\\/:*?"<>|]+/g, ' ').replace(/,\s*$/, '');
  var file = DriveApp.getFolderById(fid).createFile(Utilities.newBlob(html, 'application/msword', name + '.doc'));
  return file.getUrl();
}
function thtReport(user, p){
  var ka = thtS_(p.keyActivities), kf = thtS_(p.keyFindings), fu = thtS_(p.followUp);
  if(!ka || !kf || !fu) return { ok: false, error: 'Please fill in all 3 parts: Key Activities, Key Findings, Follow Up Actions.' };
  var t = thtFind_(p); if(!t) return { ok: false, error: 'Trip not found in the Business Trip file (it may have been deleted or moved).' };
  var pm = thtPerm_(user, t);
  if(!pm.canReport) return { ok: false, error: 'Only ' + t.pic + ' (or a manager) can report this trip.' };
  if(!pm.approved) return { ok: false, error: 'This trip is not approved yet (Approval Status: ' + t.approval + ') — the report can be entered after it is Approved.' };
  var L = thtLay_(), sh = L.sh, C = L.C, row = t.tripRow, warn = [];
  /* 1) trip folder (name = column "Folder name"; empty ⇒ same pattern as the sheet formula) */
  var folder = t.folder, fid = thtFolderId_(folder);
  if(!fid){
    var fname = t.folderName || ((t.no ? t.no + '.' : '') + t.start.replace(/-/g, '').slice(0, 6) + ' Travel report - ' + t.dest + '-' + t.pic + ',');
    try{
      var par = DriveApp.getFolderById(THT.PARENT_FOLDER_ID), it = par.getFoldersByName(fname);
      var fo = it.hasNext() ? it.next() : par.createFolder(fname);
      folder = fo.getUrl(); fid = fo.getId(); t.folderName = fname;
      sh.getRange(row, C.FOLDER_LINK).setValue(folder);
    }catch(e){ warn.push('Trip folder not created: ' + (e && e.message || e)); }
  }
  /* 2) report document */
  var docLink = '';
  if(fid){ try{ docLink = thtReportDoc_(t, fid, ka, kf, fu); }catch(e){ warn.push('Report document not created: ' + (e && e.message || e)); } }
  /* 3) column "Business trip Report" + "Actual report date" (like "Generate & Save Report") */
  sh.getRange(row, C.REPORT).setValue(['**I. Key Activities**', ka, '', '**II. Key Findings**', kf, '', '**III. Follow Up Actions**', fu].join('\n'));
  try{ sh.getRange(row, C.REPORT_DATE).setValue(new Date()); }catch(e){}
  SpreadsheetApp.flush();
  /* 4) e-mail To Shuhei-san · CC Director */
  var mailed = false, sendMail = !(p.sendEmail === false || p.sendEmail === 'false' || p.sendEmail === '0' || p.sendEmail === 0);
  if(sendMail){
    try{
      var w = thtWho_(t.pic), dir = thtMail_(t.emailDir) ? t.emailDir : w.dir;
      var opt = { to: THT.REPORT_TO, subject: 'Business Trip Report - ' + t.pic + ' - ' + t.dest + ' - From ' + thtDmy_(t.start) + ' to ' + thtDmy_(t.finish),
                  htmlBody: thtReportHtml_(t, ka, kf, fu, folder), name: t.pic + ' (MMH CRM)' };
      var cc = [dir, w.me].filter(function(e, i, a){ return thtMail_(e) && a.indexOf(e) === i; });
      if(cc.length) opt.cc = cc.join(',');
      if(w.me) opt.replyTo = w.me;
      mmhMail_(opt); mailed = true;
    }catch(e){ warn.push('Report saved, but the e-mail failed: ' + (e && e.message || e)); }
  }
  try{ NA_ENV.log(user, 'trip', t.dest, 'report · row ' + row); }catch(e){}
  return { ok: true, message: 'Business trip report saved' + (docLink ? ' · report document created' : '') + (mailed ? ' · report e-mail sent to Shuhei-san' : ''),
           docLink: docLink, folder: folder, mailed: mailed, warn: warn };
}
/* calendar: trips of the team (2 months back → 6 months ahead), same shape as tfTrips of the VN CRMs, English texts */
function thtStatus_(ap, report, st, fi){
  var today = Utilities.formatDate(new Date(), thtTz_(), 'yyyy-MM-dd');
  if(/reject/i.test(ap)) return { status: 'Cancelled', pct: 0 };
  if(report) return { status: 'Completed', pct: 100 };
  if(thtApproved_(ap)){ if(today < st) return { status: 'To Do', pct: 0 }; return { status: 'In Progress', pct: today <= fi ? 50 : 75 }; }
  return { status: 'To Do', pct: 0 };
}
function thtTrips(user, p){
  var c = CacheService.getScriptCache(), ck = 'tht_trips';
  if(!p.force){ try{ var hit = c.get(ck); if(hit) return JSON.parse(hit); }catch(e){} }
  var now = new Date(), from = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() - 2, 1), thtTz_(), 'yyyy-MM-dd'),
      to = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() + 7, 0), thtTz_(), 'yyyy-MM-dd'), out = [];
  var pics = []; try{ pics = TEAM_PICS.slice(); }catch(e){}
  thtRows_().forEach(function(t){
    if(t.start < from || t.start > to) return;
    var pic = pics.filter(function(x){ return thtNm_(x) === thtNm_(t.pic); })[0] || t.pic;
    var s = thtStatus_(t.approval, t.report, t.start, t.finish), m = t.start.replace(/-/g, '').slice(0, 6);
    out.push({ no: 'BT' + (t.no || t.tripRow), row: 0, keyTask: 'Business trips ' + m.slice(4, 6) + '/' + m.slice(0, 4), type: 'Business trip', pic: pic,
      subTask: 'Business trip ' + (t.dest || '—') + ' · ' + t.days + ' day(s) · ' + thtDmy_(t.start) + ' – ' + thtDmy_(t.finish),
      result: 'Trip plan\n1. Purpose: ' + (t.purpose || '—') + '\n2. Expected result: ' + (t.expect || '—') +
        '\n\nReport\n' + (t.report || '(No business trip report yet)') + '\n\nApproval: ' + t.approval + (t.comment ? ' — ' + t.comment : ''),
      start: t.start, planned: t.finish, revised: '', status: s.status, progress: s.pct, approval: t.approval,
      vSrc: 'trip', vMeta: { id: thtId_(t), r: t.tripRow, m: m } });
  });
  out.sort(function(a, b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  var res = { ok: true, trips: out, file: thtUrl_(), at: new Date().toISOString() };
  try{ c.put(ck, JSON.stringify(res), 120); }catch(e){}
  return res;
}
/* router: trip actions of the Thailand CRMs (all go to the team's own Business Trip file) */
function thtRoute_(a, user, p){
  try{
    var r = null;
    if(a === 'tripMaster2' || a === 'tripMaster') r = thtMaster2(user, p);
    else if(a === 'tripPropose2' || a === 'tripPropose') r = thtPropose(user, p);
    else if(a === 'tripInfo') r = thtInfo(user, p);
    else if(a === 'tripUpdate') r = thtUpdate(user, p);
    else if(a === 'tripDelete') r = thtDelete(user, p);
    else if(a === 'tripReport') r = thtReport(user, p);
    else if(a === 'tfTrips' || a === 'tripList') r = thtTrips(user, p);
    else if(a === 'tripSync') r = { ok: true, later: true };
    else return null;
    if(r && r.ok && /^trip(Propose2?|Update|Delete|Report)$/.test(a)){ try{ CacheService.getScriptCache().remove('tht_trips'); }catch(e){} }
    return r;
  }catch(e){ return { ok: false, error: String(e && e.message || e) }; }
}
