/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH_TripFlow.gs — v1.0 (10/10/2026) · DÙNG CHUNG mọi backend có đề xuất công tác
   (Report Hub: management · backoffice · marketing — CRM: crm-dental · crm-surgical · crm-eyeless)
   GIỐNG HỆT NHAU ở mọi backend — sửa 1 file thì chép sang các backend còn lại.

   ① NHẬT KÝ ĐỀ XUẤT RIÊNG từng backend: tab "Business Trip Log" trong bảng tính của chính backend
      (tự tạo). Mỗi đề xuất 1 dòng; trạng thái duyệt / folder / báo cáo tự cập nhật lại từ file
      Business Trip (file gốc để duyệt + làm Business Trip Report) mỗi lần đọc nhật ký.
   ② EMAIL theo đúng mẫu hệ thống Business Trip:
        · xin duyệt   "Business Trip Approval Request" — To Director, CC HOD + người đề xuất
        · phê duyệt   "Dear all, This email is to confirm the approval…" — To người đề xuất, CC Director + cột AB
        · từ chối     như mẫu Rejected của hệ thống Business Trip
   ③ GIÁM ĐỐC DUYỆT TỪ WEB (Report Hub / CRM): tfPending (danh sách chờ duyệt của MỌI người) ·
      tfDecide (duyệt / từ chối nhiều chuyến 1 lần — mỗi chuyến 1 email riêng tới đúng người đề xuất).
      Chỉ Director (phiên đăng nhập email, kiểm chữ ký bằng khoá RH_Secret của Training Master).
   Không dùng dịch vụ Google mới (chỉ Spreadsheet / Drive / Mail đã có) ⇒ không phải cấp quyền lại.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var TF = {
  VER: '1.0',
  TRIP_ID: '15dAQYOG1aJRX-jByVmRFeSFOIPRtdVW7wDvwC_nxJUA',          /* file "Vietnam - Business trip Approval and Report" */
  TRIP_TAB: 'MMH Travel report', DATA_ROW: 5,
  PARENT_FOLDER: '1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',
  MASTER_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',        /* Training Master (RH_Users + RH_Secret) */
  DIRECTOR: { local:'nt.ha', email:'nt.ha@manimedicalhanoi.com', name:'Ha Nguyen' },
  LOG_TAB: 'Business Trip Log',
  LOG_HDR: ['Logged at','Source','PIC','Trip row','No','Start date','Finish date','Days','Destination','Co-traveler','Purpose',
            'Expected result','Estimated costs','Total','Schedule','Equipment','Approval status','Decided by','Decided at',
            'Comment','Folder link','Report','Email to','Email cc','Request id'],
  /* cột (1-based) trên "MMH Travel report" */
  C: { NO:2, PIC:4, START:5, FINISH:6, DAYS:7, DEST:8, CO:9, PURPOSE:10, EXPECT:11, ESTCOST:12, TOTAL:13, SCHEDULE:14,
       EQUIP:15, FOLDER_NAME:16, FOLDER_LINK:17, REPORT:18, APPROVAL:19, COMMENT:20, EMAIL_PIC:25, EMAIL_HOD:26, EMAIL_DIR:27, EMAIL_CC:28 },
  PENDING_DAYS: 120                                                  /* chờ duyệt: chuyến có ngày về trong 120 ngày gần đây trở đi */
};

/* ───────── tiện ích ───────── */
function tfS_(v){ return v == null ? '' : String(v).trim(); }
function tfTz_(){ try{ return Session.getScriptTimeZone() || 'Asia/Bangkok'; }catch(e){ return 'Asia/Bangkok'; } }
function tfIso_(v){
  if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tfTz_(), 'yyyy-MM-dd');
  var s = tfS_(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return m[0];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if(m) return m[3] + '-' + ('0'+m[2]).slice(-2) + '-' + ('0'+m[1]).slice(-2);
  return '';
}
function tfDmy_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m ? m[3]+'/'+m[2]+'/'+m[1] : ''; }
function tfDays_(a, b){ var x = new Date(a + 'T00:00:00'), y = new Date((b || a) + 'T00:00:00'); return Math.round(Math.abs(y - x) / 86400000) + 1; }
function tfEsc_(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/\n/g,'<br/>'); }
function tfEmails_(s){ return String(s||'').split(/[;,\s]+/).map(function(x){ return x.trim(); }).filter(function(x){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x); }); }
function tfLocal_(e){ return String(e||'').toLowerCase().split('@')[0].trim(); }
function tfSrc_(){
  if(typeof SOURCE !== 'undefined' && SOURCE) return String(SOURCE);
  try{ if(typeof TEAM === 'function') return 'crm-' + TEAM(); }catch(e){}
  return 'backend';
}
function tfOwnSS_(){ return (typeof ss === 'function') ? ss() : SpreadsheetApp.getActiveSpreadsheet(); }
function tfTripSheet_(){
  var sh = SpreadsheetApp.openById(TF.TRIP_ID).getSheetByName(TF.TRIP_TAB);
  if(!sh) throw new Error('File Business Trip không có sheet "' + TF.TRIP_TAB + '"');
  return sh;
}
/* email luôn đi bằng miền @manimedicalhanoi.com (mmhMail_ nếu backend đã có MMH_MailDomain.gs) */
function tfMail_(o){
  if(typeof mmhMail_ === 'function') return mmhMail_(o);
  ['to','cc','replyTo'].forEach(function(k){ if(o[k]) o[k] = String(o[k]).replace(/@mani\.inc\b/gi, '@manimedicalhanoi.com'); });
  return MailApp.sendEmail(o);
}
function tfUniq_(a){ var seen = {}; return a.filter(function(e){ var k = tfLocal_(e); if(!k || seen[k]) return false; seen[k] = 1; return true; }); }

/* ───────── ② MẪU EMAIL (đúng hệ thống Business Trip) ───────── */
/* lời chào: luôn "Dear Ha-san," + HOD (nếu HOD không phải Giám đốc) */
function tfGreeting_(hodEmail){
  var l = tfLocal_(hodEmail), name = '';
  var MAP = { 'nt.ha':'', 'tt.tuyen':'Tuyen', 'vtt.hoa':'Hoa', 'vt.hoa':'Hoa' };
  if(MAP.hasOwnProperty(l)) name = MAP[l];
  else { var u = l.split('.'); if(u.length > 1 && !/^ha$/i.test(u[u.length-1])){ var x = u[u.length-1]; name = x.charAt(0).toUpperCase() + x.slice(1); } }
  return 'Dear Ha-san' + (name ? ',<br/>Dear ' + name + '-san' : '');
}
/* t: { row, destination, days, startDate, finishDate (dd/MM/yyyy), purpose, schedule, estimatedCost, equipment } */
function tfProposalHtml_(greeting, picName, t, sheetUrl){
  var td = 'border:1px solid #000000;padding:8px;font-family:Calibri,sans-serif;font-size:11pt;vertical-align:middle;';
  var th = td + 'font-weight:bold;';
  var eq = tfS_(t.equipment).toLowerCase(), hasEq = eq !== '' && eq !== 'none' && eq !== 'n/a' && eq !== 'no';
  return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head>'
    + '<body style="margin:0;padding:0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;">'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:20px;">'
    + '<p style="margin:0 0 20px 0;font-size:14pt;font-weight:bold;">Business Trip Approval Request</p>'
    + '<p style="margin:0 0 15px 0;line-height:1.6;">' + greeting + ',</p>'
    + '<p style="margin:0 0 15px 0;line-height:1.6;">I would like to request your approval for the following business trip(s). Please review the details below:</p>'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="1" width="100%" style="border-collapse:collapse;margin:20px 0;border:1px solid #000000;">'
    + '<thead><tr style="background-color:#f0f0f0;">'
    + '<th style="'+th+'text-align:center;">Row</th><th style="'+th+'">Destination</th><th style="'+th+'text-align:center;">Days</th>'
    + '<th style="'+th+'text-align:center;">Start Date</th><th style="'+th+'text-align:center;">Finish Date</th><th style="'+th+'">Purpose</th>'
    + '<th style="'+th+'">Schedule</th><th style="'+th+'">Estimated Cost</th><th style="'+th+'">Equipment</th></tr></thead><tbody><tr>'
    + '<td style="'+td+'text-align:center;">' + tfEsc_(t.row) + '</td><td style="'+td+'">' + tfEsc_(t.destination) + '</td>'
    + '<td style="'+td+'text-align:center;">' + tfEsc_(t.days) + '</td><td style="'+td+'text-align:center;">' + tfEsc_(t.startDate) + '</td>'
    + '<td style="'+td+'text-align:center;">' + tfEsc_(t.finishDate) + '</td><td style="'+td+'">' + tfEsc_(t.purpose) + '</td>'
    + '<td style="'+td+'">' + tfEsc_(t.schedule) + '</td><td style="'+td+'text-align:right;">' + tfEsc_(t.estimatedCost) + '</td>'
    + '<td style="'+td+'">' + tfEsc_(t.equipment || 'N/A') + '</td></tr></tbody></table>'
    + (hasEq ? '<p style="margin:20px 0 10px 0;line-height:1.6;font-weight:bold;">Equipment Commitment:</p>'
      + '<p style="margin:0 0 5px 0;line-height:1.6;">1. I will comply with all safety and information security regulations when using the above equipment and assets outside the office.</p>'
      + '<p style="margin:0 0 5px 0;line-height:1.6;">2. All equipment and assets will be returned to the company upon completion of the business trip as stated in each proposal above.</p>'
      + '<p style="margin:0 0 15px 0;line-height:1.6;">3. I take full responsibility for any loss, damage, or costs incurred while these equipment and assets are outside the office.</p>' : '')
    + '<p style="margin:20px 0 15px 0;line-height:1.6;">Please review and approve at your earliest convenience.</p>'
    + '<p style="margin:20px 0 0 0;"><a href="' + sheetUrl + '" style="color:#0066cc;text-decoration:underline;font-weight:bold;">Click here to review</a></p>'
    + '<p style="margin:30px 0 0 0;line-height:1.6;">Best regards,<br/><strong>' + tfEsc_(picName) + '</strong></p>'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:30px;padding-top:15px;border-top:1px solid #000000;"><tr>'
    + '<td style="font-size:10pt;">Mani Medical Hanoi - Business Trip Management System</td>'
    + '<td style="text-align:right;font-size:10pt;">' + Utilities.formatDate(new Date(), tfTz_(), 'dd/MM/yyyy HH:mm') + '</td>'
    + '</tr></table></td></tr></table></body></html>';
}
function tfSign_(){
  return '<p style="margin:0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;line-height:1.6;">Best regards,<br/>'
    + '<strong>' + TF.DIRECTOR.name + '</strong><br/>General Director<br/>Mani Medical Hanoi Co., Ltd</p>'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:30px;padding-top:15px;border-top:1px solid #cccccc;"><tr>'
    + '<td style="font-family:Calibri,sans-serif;font-size:9pt;color:#666666;">Mani Medical Hanoi - Business Trip Management System</td>'
    + '<td style="text-align:right;font-family:Calibri,sans-serif;font-size:9pt;color:#666666;">' + Utilities.formatDate(new Date(), tfTz_(), 'dd/MM/yyyy HH:mm') + '</td></tr></table>';
}
function tfWrap_(inner){
  return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head>'
    + '<body style="margin:0;padding:0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;">'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:20px;">' + inner
    + '</td></tr></table></body></html>';
}
var TF_P = 'margin:0 0 15px 0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;line-height:1.6;';
var TF_UL = 'margin:0 0 20px 0;padding-left:20px;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;line-height:1.8;';
/* t: { pic, destination, days, startDate, finishDate, purpose, estimatedCost } */
function tfApprovalHtml_(t){
  return tfWrap_('<p style="'+TF_P+'">Dear all,</p>'
    + '<p style="'+TF_P+'">This email is to confirm the approval of the business trip proposal. Details are as follows:</p>'
    + '<ul style="'+TF_UL+'"><li><strong>Traveler:</strong> ' + tfEsc_(t.pic) + '</li>'
    + '<li><strong>Destination:</strong> ' + tfEsc_(t.destination || 'N/A') + '</li>'
    + '<li><strong>Duration:</strong> ' + tfEsc_(t.days) + ' days, from ' + tfEsc_(t.startDate || 'N/A') + ' to ' + tfEsc_(t.finishDate || 'N/A') + '</li>'
    + '<li><strong>Purpose:</strong> ' + tfEsc_(t.purpose || 'N/A') + '</li>'
    + '<li><strong>Estimated Cost:</strong> ' + tfEsc_(t.estimatedCost || 'N/A') + '</li></ul>'
    + '<p style="margin:0 0 10px 0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;">Dear ' + tfEsc_(t.pic) + '-san,</p>'
    + '<p style="margin:0 0 10px 0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;">Please kindly:</p>'
    + '<ul style="'+TF_UL+'"><li>Complete the Business Trip Report after your trip (within 3 days)</li>'
    + '<li>Submit all receipts (if any) to Accounting by the end of the month</li>'
    + '<li>Upload all related documents to the designated folder</li></ul>'
    + '<p style="margin:0 0 30px 0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;">Thank you.</p>' + tfSign_());
}
function tfRejectHtml_(t, comment){
  return tfWrap_('<p style="'+TF_P+'">Dear ' + tfEsc_(t.pic) + '-san,</p>'
    + '<p style="'+TF_P+'">This email is to inform you that your business trip proposal to <strong>' + tfEsc_(t.destination || 'N/A') + '</strong> for '
    + tfEsc_(t.days) + ' days, from ' + tfEsc_(t.startDate || 'N/A') + ' to ' + tfEsc_(t.finishDate || 'N/A')
    + ', has been rejected. Please find my comment explaining the reason for this decision below:</p>'
    + '<div style="margin:20px 0;padding:15px;background-color:#f8f8f8;border-left:4px solid #d32f2f;"><p style="margin:0;font-family:Calibri,sans-serif;font-size:11pt;color:#000000;font-style:italic;">"'
    + tfEsc_(comment || 'No comment provided') + '"</p></div>' + tfSign_());
}

/* Gửi email xin duyệt theo mẫu chuẩn. o: { tripPic, picEmail, hodEmail, dirEmail, ccExtra[], row, destination, start, finish (ISO),
   purpose, schedule, estimatedCost, equipment, sheetUrl } ⇒ { to, cc } */
function tfSendProposal_(o){
  var dir = tfEmails_(o.dirEmail)[0] || TF.DIRECTOR.email;
  var hod = tfEmails_(o.hodEmail)[0] || '';
  var pic = tfEmails_(o.picEmail)[0] || '';
  var to = dir, cc;
  if(tfLocal_(pic) === TF.DIRECTOR.local){ to = 'vtt.hoa@manimedicalhanoi.com'; cc = [pic]; }   /* Giám đốc tự đề xuất ⇒ như hệ thống gốc */
  else cc = tfUniq_([hod].concat(o.ccExtra || []).concat([pic]).filter(function(e){ return e && tfLocal_(e) !== tfLocal_(to); }));
  var t = { row:o.row, destination:o.destination, days:tfDays_(o.start, o.finish), startDate:tfDmy_(o.start), finishDate:tfDmy_(o.finish || o.start),
            purpose:o.purpose, schedule:o.schedule, estimatedCost:o.estimatedCost, equipment:o.equipment };
  var html = tfProposalHtml_(tfGreeting_(hod), o.tripPic, t, o.sheetUrl || ('https://docs.google.com/spreadsheets/d/' + TF.TRIP_ID + '/edit'));
  var mail = { to:to, subject:'Approval Business trip - ' + t.startDate.replace(/\//g,'') + ' - ' + o.tripPic, htmlBody:html,
               name:'Mani Medical Hanoi - Business Trip System' };
  if(cc.length) mail.cc = cc.join(',');
  if(pic) mail.replyTo = pic;
  tfMail_(mail);
  return { to:to, cc:cc.join(', ') };
}

/* ───────── ① NHẬT KÝ RIÊNG TỪNG BACKEND ───────── */
function tfLogSheet_(){
  var book = tfOwnSS_(), sh = book.getSheetByName(TF.LOG_TAB);
  if(!sh){
    sh = book.insertSheet(TF.LOG_TAB);
    sh.getRange(1, 1, 1, TF.LOG_HDR.length).setValues([TF.LOG_HDR]).setFontWeight('bold').setBackground('#CFE2F3');
    sh.setFrozenRows(1);
  }
  return sh;
}
/* r: { pic, row, no, start, finish, destination, coTraveler, purpose, expectedResult, estimatedCost, totalCost, schedule, equipment, to, cc, rid } */
function tfLogAppend_(r){
  try{
    var sh = tfLogSheet_();
    sh.appendRow([new Date(), tfSrc_(), r.pic, r.row || '', r.no || '', r.start ? new Date(r.start + 'T00:00:00') : '', r.finish ? new Date(r.finish + 'T00:00:00') : '',
      r.start ? tfDays_(r.start, r.finish) : '', r.destination || '', r.coTraveler || '', r.purpose || '', r.expectedResult || '', r.estimatedCost || '',
      Number(r.totalCost) || '', r.schedule || '', r.equipment || '', r.status || 'Already sent propose email', '', '', '', '', '', r.to || '', r.cc || '', r.rid || '']);
    return true;
  }catch(e){ return false; }
}
/* đọc nhật ký + cập nhật trạng thái / folder / báo cáo từ file Business Trip (khớp theo dòng + PIC + ngày đi) */
function tfLogRead_(pic){
  var sh = tfLogSheet_(), n = sh.getLastRow() - 1; if(n < 1) return [];
  var V = sh.getRange(2, 1, n, TF.LOG_HDR.length).getValues();
  var trip = null, last = 0;
  try{ trip = tfTripSheet_(); last = trip.getLastRow(); }catch(e){}
  var T = TF.C, out = [], upd = [];
  V.forEach(function(r, i){
    var item = { logRow:i + 2, at:r[0] instanceof Date ? r[0].toISOString() : tfS_(r[0]), source:tfS_(r[1]), pic:tfS_(r[2]), row:+r[3] || 0, no:tfS_(r[4]),
      start:tfIso_(r[5]), finish:tfIso_(r[6]), days:+r[7] || 0, dest:tfS_(r[8]), co:tfS_(r[9]), purpose:tfS_(r[10]), expect:tfS_(r[11]),
      estCost:tfS_(r[12]), total:+r[13] || 0, schedule:tfS_(r[14]), equip:tfS_(r[15]), approval:tfS_(r[16]), decidedBy:tfS_(r[17]),
      decidedAt:r[18] instanceof Date ? r[18].toISOString() : tfS_(r[18]), comment:tfS_(r[19]), folder:tfS_(r[20]), report:tfS_(r[21]) };
    if(pic && tfLocal_(item.pic) !== tfLocal_(pic) && item.pic.toLowerCase().indexOf(String(pic).toLowerCase()) < 0) return;
    var settled = /rejected/i.test(item.approval) || (/approved/i.test(item.approval) && item.report && item.folder);
    if(trip && item.row >= TF.DATA_ROW && item.row <= last && !settled){
      try{
        var tv = trip.getRange(item.row, 1, 1, 28).getValues()[0];
        if(tfIso_(tv[T.START-1]) === item.start && tfS_(tv[T.PIC-1]).toLowerCase() === item.pic.toLowerCase()){
          var link = ''; try{ link = trip.getRange(item.row, T.FOLDER_LINK).getRichTextValue().getLinkUrl() || ''; }catch(e){}
          if(!link && /^https?:/i.test(tfS_(tv[T.FOLDER_LINK-1]))) link = tfS_(tv[T.FOLDER_LINK-1]);
          var ap = tfS_(tv[T.APPROVAL-1]) || item.approval, rep = tfS_(tv[T.REPORT-1]), no = tfS_(tv[T.NO-1]).replace(/\.0$/, '');
          if(ap !== item.approval || link !== item.folder || rep !== item.report || (no && no !== item.no)){
            item.approval = ap; item.folder = link; item.report = rep; item.no = no || item.no; item.comment = tfS_(tv[T.COMMENT-1]) || item.comment;
            upd.push(item);
          }
        }
      }catch(e){}
    }
    out.push(item);
  });
  upd.forEach(function(it){
    try{
      sh.getRange(it.logRow, 5).setValue(it.no);
      sh.getRange(it.logRow, 17).setValue(it.approval);
      sh.getRange(it.logRow, 20, 1, 3).setValues([[it.comment, it.folder, it.report]]);
    }catch(e){}
  });
  return out;
}
function tfLogMark_(row, pic, start, status, by, comment, folder){
  try{
    var sh = tfOwnSS_().getSheetByName(TF.LOG_TAB); if(!sh) return;
    var n = sh.getLastRow() - 1; if(n < 1) return;
    var V = sh.getRange(2, 3, n, 5).getValues();
    for(var i = V.length - 1; i >= 0; i--){
      if(+V[i][1] === +row && tfS_(V[i][0]).toLowerCase() === String(pic).toLowerCase() && tfIso_(V[i][3]) === start){
        sh.getRange(i + 2, 17, 1, 5).setValues([[status, by, new Date(), comment || '', folder || '']]); return;
      }
    }
  }catch(e){}
}

/* ───────── ③ XÁC THỰC GIÁM ĐỐC (phiên email do Training Hub ký) ───────── */
function tfB64_(x){ return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }
function tfSame_(a, b){ a = String(a||''); b = String(b||''); if(a.length !== b.length) return false; var d = 0; for(var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
/* ⇒ { local, pic, level, admin } hoặc { err } */
function tfWho_(p){
  var tk = tfS_(p.tk), dot = tk.indexOf('.');
  if(dot < 10) return { err:'Cần đăng nhập bằng email công ty để duyệt công tác.' };
  var data = tk.substring(0, dot), sig = tk.substring(dot + 1), t;
  try{ t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); }catch(e){ return { err:'Phiên đăng nhập không hợp lệ.' }; }
  if(!t || !t.x || Date.now() > t.x) return { err:'Phiên đăng nhập đã hết hạn — đăng nhập lại.' };
  var c = CacheService.getScriptCache(), key = 'tfw_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, tk)).slice(0, 40);
  try{ var hit = c.get(key); if(hit) return JSON.parse(hit); }catch(e){}
  var book;
  try{ book = SpreadsheetApp.openById(TF.MASTER_ID); }catch(e){ return { err:'Backend chưa đọc được Training Master để kiểm phiên đăng nhập.' }; }
  var sec = book.getSheetByName('RH_Secret'), s = sec ? tfS_(sec.getRange(2, 1).getValue()) : '';
  if(s.length < 32 || !tfSame_(sig, tfB64_(Utilities.computeHmacSha256Signature(data, s)))) return { err:'Phiên đăng nhập không hợp lệ.' };
  var us = book.getSheetByName('RH_Users'), V = us ? us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 6).getValues() : [], u = null;
  V.forEach(function(r){ if(tfLocal_(r[0]) === tfLocal_(t.e)) u = r; });
  if(!u) return { err:'Tài khoản không có trong RH_Users.' };
  var active = u[4] === '' || u[4] === true || /^(true|1|x|yes)$/i.test(tfS_(u[4]));
  if(!active) return { err:'Tài khoản đã bị khoá.' };
  if((t.s || 1) !== Math.max(1, parseInt(u[5], 10) || 1)) return { err:'Phiên đăng nhập đã bị đăng xuất từ xa.' };
  var me = { local:tfLocal_(t.e), pic:tfS_(u[1]), level:tfS_(u[2]).toLowerCase(), admin:u[3] === true || /^(true|1|x|yes)$/i.test(tfS_(u[3])) };
  try{ c.put(key, JSON.stringify(me), 600); }catch(e){}
  return me;
}
function tfIsDirector_(me){ return !!me && !me.err && (me.level === 'director' || me.local === TF.DIRECTOR.local); }

/* ───────── ③ DANH SÁCH CHỜ DUYỆT ───────── */
function tfPendingStatus_(s){ s = tfS_(s); return !s || /^(not yet|already sent propose email|pending|chờ duyệt)$/i.test(s); }
function tfPending(user, p){
  var me = tfWho_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  if(!tfIsDirector_(me) && !me.admin) return { ok:true, director:false, items:[], count:0 };
  var sh = tfTripSheet_(), last = sh.getLastRow(); if(last < TF.DATA_ROW) return { ok:true, director:tfIsDirector_(me), items:[], count:0 };
  var V = sh.getRange(TF.DATA_ROW, 1, last - TF.DATA_ROW + 1, 28).getValues(), T = TF.C, out = [];
  var minIso = Utilities.formatDate(new Date(Date.now() - TF.PENDING_DAYS * 86400000), tfTz_(), 'yyyy-MM-dd');
  V.forEach(function(r, i){
    var pic = tfS_(r[T.PIC-1]), st = tfIso_(r[T.START-1]); if(!pic || !st) return;
    if(!tfPendingStatus_(r[T.APPROVAL-1])) return;
    var fi = tfIso_(r[T.FINISH-1]) || st; if(fi < minIso) return;
    out.push({ row:TF.DATA_ROW + i, no:tfS_(r[T.NO-1]).replace(/\.0$/, ''), pic:pic, start:st, finish:fi, days:tfDays_(st, fi),
      dest:tfS_(r[T.DEST-1]), co:tfS_(r[T.CO-1]), purpose:tfS_(r[T.PURPOSE-1]), expect:tfS_(r[T.EXPECT-1]), estCost:tfS_(r[T.ESTCOST-1]),
      total:Number(r[T.TOTAL-1]) || 0, schedule:tfS_(r[T.SCHEDULE-1]), equip:tfS_(r[T.EQUIP-1]), status:tfS_(r[T.APPROVAL-1]) || 'Not Yet' });
  });
  out.sort(function(a, b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : a.row - b.row; });
  return { ok:true, director:tfIsDirector_(me), items:out, count:out.length, file:'https://docs.google.com/spreadsheets/d/' + TF.TRIP_ID + '/edit' };
}

/* ───────── ③ DUYỆT / TỪ CHỐI NHIỀU CHUYẾN ─────────
   p.items = [{ row, pic, start, decision:'approve'|'reject', comment }]  — mỗi chuyến 1 email riêng tới người đề xuất */
function tfDecide(user, p){
  var me = tfWho_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  if(!tfIsDirector_(me)) return { ok:false, code:'FORBIDDEN', error:'Chỉ Giám đốc được duyệt đề xuất công tác.' };
  var items = p.items; if(typeof items === 'string'){ try{ items = JSON.parse(items); }catch(e){ items = null; } }
  if(!Array.isArray(items) || !items.length) return { ok:false, error:'Chưa chọn chuyến nào.' };
  var sh = tfTripSheet_(), T = TF.C, res = [];
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' }; }
  try{
    items.forEach(function(d){
      var row = +d.row || 0, r = { row:row, pic:tfS_(d.pic), ok:false };
      try{
        if(row < TF.DATA_ROW || row > sh.getLastRow()) throw new Error('Không tìm thấy dòng ' + row);
        var v = sh.getRange(row, 1, 1, 28).getValues()[0];
        if(tfS_(v[T.PIC-1]).toLowerCase() !== r.pic.toLowerCase() || tfIso_(v[T.START-1]) !== tfIso_(d.start))
          throw new Error('Dòng ' + row + ' trên file Business Trip đã thay đổi — tải lại danh sách.');
        if(!tfPendingStatus_(v[T.APPROVAL-1])){ r.ok = true; r.already = tfS_(v[T.APPROVAL-1]); res.push(r); return; }
        var ok = d.decision !== 'reject', status = ok ? 'Approved' : 'Rejected', comment = tfS_(d.comment);
        if(!ok && !comment) throw new Error('Từ chối cần ghi lý do');
        sh.getRange(row, T.APPROVAL).setValue(status);
        if(comment) sh.getRange(row, T.COMMENT).setValue(comment);
        var folder = '';
        if(ok){
          try{
            var cur = ''; try{ cur = sh.getRange(row, T.FOLDER_LINK).getRichTextValue().getLinkUrl() || ''; }catch(e){}
            if(!cur) cur = /^https?:/i.test(tfS_(v[T.FOLDER_LINK-1])) ? tfS_(v[T.FOLDER_LINK-1]) : '';
            var fname = tfS_(v[T.FOLDER_NAME-1]);
            if(!cur && fname){
              var par = DriveApp.getFolderById(TF.PARENT_FOLDER), it = par.getFoldersByName(fname);
              var f = it.hasNext() ? it.next() : par.createFolder(fname);
              cur = f.getUrl();
              sh.getRange(row, T.FOLDER_LINK).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('Open Folder').setLinkUrl(cur).build());
            }
            folder = cur;
          }catch(e){ r.folderErr = String(e && e.message || e); }
        }
        SpreadsheetApp.flush();
        var st = tfIso_(v[T.START-1]), fi = tfIso_(v[T.FINISH-1]) || st;
        var t = { pic:tfS_(v[T.PIC-1]), destination:tfS_(v[T.DEST-1]), days:tfDays_(st, fi), startDate:tfDmy_(st), finishDate:tfDmy_(fi),
                  purpose:tfS_(v[T.PURPOSE-1]), estimatedCost:tfS_(v[T.ESTCOST-1]) };
        var picEmail = tfEmails_(v[T.EMAIL_PIC-1])[0] || '';
        if(picEmail){
          var cc = ok ? tfUniq_(tfEmails_(v[T.EMAIL_DIR-1]).concat(tfEmails_(v[T.EMAIL_CC-1]))).filter(function(e){ return tfLocal_(e) !== tfLocal_(picEmail); })
                      : tfEmails_(v[T.EMAIL_DIR-1]).filter(function(e){ return tfLocal_(e) !== tfLocal_(picEmail); });
          if(!cc.some(function(e){ return tfLocal_(e) === TF.DIRECTOR.local; })) cc.unshift(TF.DIRECTOR.email);
          var subj = '[' + status + '] Business trip - ' + t.pic + ' - ' + (t.destination || 'Unknown') + ' - From ' + t.startDate + ' to ' + t.finishDate;
          tfMail_({ to:picEmail, cc:cc.join(','), replyTo:TF.DIRECTOR.email, subject:subj,
                    htmlBody: ok ? tfApprovalHtml_(t) : tfRejectHtml_(t, comment), name:'Mani Medical Hanoi - Business Trip System' });
          r.mailed = picEmail;
        } else r.mailErr = 'Dòng ' + row + ' chưa có email người đề xuất (cột Y)';
        tfLogMark_(row, t.pic, st, status, me.pic || 'Director', comment, folder);
        r.ok = true; r.status = status; r.folder = folder;
      }catch(e){ r.error = String(e && e.message || e); }
      res.push(r);
    });
  } finally { try{ lock.releaseLock(); }catch(e){} }
  var okN = res.filter(function(x){ return x.ok; }).length;
  return { ok:okN > 0, results:res, done:okN, failed:res.length - okN,
           error: okN ? '' : (res[0] && res[0].error) || 'Không duyệt được', message:'Đã xử lý ' + okN + '/' + res.length + ' đề xuất.' };
}
/* nhật ký đề xuất công tác của backend này (báo cáo / lịch đọc từ đây) */
function tfLog(user, p){ return { ok:true, source:tfSrc_(), items:tfLogRead_(tfS_(p.forPic)) }; }

/* router: trả null nếu không phải action của module này */
function tfRoute_(action, user, p){
  if(action === 'tfPending') return tfPending(user, p);
  if(action === 'tfDecide')  return tfDecide(user, p);
  if(action === 'tfLog')     return tfLog(user, p);
  if(action === 'tfVer')     return { ok:true, ver:TF.VER, source:tfSrc_() };
  return null;
}
