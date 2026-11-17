/* ══════════════ MMH_TripDiag.gs — chẩn đoán báo cáo công tác (CHỈ ĐỌC, không ghi / không gửi gì) ══════════════
 * GIỐNG HỆT ở marketing / management (2 backend có quyền đọc Gmail — KHÔNG chép sang backoffice: thêm quyền ⇒ web app hỏng).
 * ?action=tripDiag&key=<8 ký tự cuối SS_ID>[&days=3][&pic=Tuyen][&part=rows|mail|log|all]
 *   rows : dòng file Business Trip có ngày báo cáo (cột U) trong `days` ngày, hoặc của `pic` (chuyến bắt đầu ≤ 90 ngày trước)
 *          + file trong folder chuyến đi được tạo trong `days` ngày (file Google Doc báo cáo)
 *   mail : thư "Business Trip Report" trong hộp thư của tài khoản chạy backend (đã gửi / nhận) trong `days` ngày + hạn mức email còn lại
 *   log  : nhật ký thao tác web (ActivityLog) có chữ "báo cáo công tác" trong `days` ngày
 * Gọi qua workflow Kiểm tra ▸ ping "marketing?action=tripDiag&key=…&full=1".                                      */
function tripDiag_(p){
  if(String(p.key || '') !== String(SS_ID).slice(-8)) return { ok:false, error:'key' };
  var days = Math.max(1, Math.min(30, +p.days || 3)), part = String(p.part || 'all'), who = String(p.pic || '').trim().toLowerCase();
  var tz = 'Asia/Ho_Chi_Minh', since = new Date(Date.now() - days * 864e5), out = { ok:true, source:SOURCE, ver:'1.0', days:days };
  function f(d){ return (d instanceof Date) ? Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm') : String(d == null ? '' : d); }
  function on(x){ return part === x || part === 'all'; }
  if(on('rows')){
    try{
      var sh = rhxTripSheet(), T = RHX.T, last = sh.getLastRow(), n = last - RHX.TRIP_START + 1, rows = [];
      if(n > 0){
        var V = sh.getRange(RHX.TRIP_START, 1, n, 28).getValues(), L = null;
        try{ L = sh.getRange(RHX.TRIP_START, T.FOLDER_LINK, n, 1).getRichTextValues(); }catch(e){}
        var old = new Date(Date.now() - 90 * 864e5);
        for(var i = 0; i < V.length; i++){
          var r = V[i], pic = String(r[T.PIC-1] || '').trim(); if(!pic) continue;
          var rd = r[T.REPORT_DATE-1], st = r[T.START-1];
          var hit = (rd instanceof Date && rd >= since) ||
                    (who && (pic.toLowerCase() === who || rhxHubName(pic).toLowerCase() === who) && st instanceof Date && st >= old);
          if(!hit) continue;
          var link = ''; try{ link = L ? (L[i][0].getLinkUrl() || '') : ''; }catch(e){}
          var o = { row:RHX.TRIP_START + i, no:String(r[T.NO-1]), pic:pic, start:f(st), finish:f(r[T.FINISH-1]), dest:String(r[T.DEST-1]).slice(0, 60),
                    co:String(r[T.CO-1]).slice(0, 80), approval:String(r[T.APPROVAL-1]), reportLen:String(r[T.REPORT-1] || '').length,
                    reportDate:f(rd), emailPic:String(r[T.EMAIL_PIC-1]), emailHod:String(r[T.EMAIL_HOD-1]), emailDir:String(r[T.EMAIL_DIRECTOR-1]),
                    emailCc:String(r[T.EMAIL_CC-1]), folder:!!link };
          var fid = rhxFolderId(link);
          if(fid){
            try{
              var it = DriveApp.getFolderById(fid).getFiles(), fl = [];
              while(it.hasNext() && fl.length < 15){ var fi = it.next(); if(fi.getDateCreated() >= since) fl.push(f(fi.getDateCreated()) + ' · ' + fi.getName().slice(0, 60) + ' · ' + fi.getOwner().getEmail().split('@')[0]); }
              o.newFiles = fl;
            }catch(e){ o.folderErr = String(e.message).slice(0, 80); }
          }
          rows.push(o);
        }
      }
      out.rows = rows;
    }catch(e){ out.rowsErr = String(e.message).slice(0, 200); }
  }
  if(on('mail')){
    try{ out.quota = MailApp.getRemainingDailyQuota(); }catch(e){}
    try{ out.me = Session.getEffectiveUser().getEmail().split('@')[0]; }catch(e){}
    try{
      var th = GmailApp.search('subject:"Business Trip Report" newer_than:' + days + 'd', 0, 40), mails = [];
      th.forEach(function(t){
        t.getMessages().forEach(function(m){
          if(m.getDate() < since) return;
          mails.push({ at:f(m.getDate()), from:m.getFrom(), to:m.getTo(), cc:m.getCc(), subject:m.getSubject().slice(0, 140) });
        });
      });
      mails.sort(function(a, b){ return a.at < b.at ? 1 : -1; });
      out.mails = mails.slice(0, 40);
    }catch(e){ out.mailErr = String(e.message).slice(0, 200); }
    try{
      var bo = GmailApp.search('from:mailer-daemon newer_than:' + days + 'd', 0, 10);
      out.bounces = bo.map(function(t){ return f(t.getLastMessageDate()) + ' · ' + t.getFirstMessageSubject().slice(0, 100); });
    }catch(e){}
  }
  if(on('log')){
    try{
      var s = activitySheet(), lr = s.getLastRow(), k = Math.min(1500, lr - 1), lg = [];
      if(k > 0){
        var A = s.getRange(lr - k + 1, 1, k, 6).getValues();
        A.forEach(function(r){
          var t = new Date(r[0]); if(isNaN(t) || t < since) return;
          if(/công tác|cong tac|trip/i.test(String(r[3]) + ' ' + String(r[4]))) lg.push(f(t) + ' · ' + r[1] + ' · ' + r[2] + ' · ' + String(r[3]).slice(0, 90));
        });
      }
      out.log = lg.slice(-40);
    }catch(e){ out.logErr = String(e.message).slice(0, 200); }
  }
  return out;
}
