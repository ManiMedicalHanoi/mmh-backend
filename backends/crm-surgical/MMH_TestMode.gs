/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH_TestMode.gs — v1.0 (13/10/2026) · CHẾ ĐỘ TEST CỦA ADMIN · GIỐNG HỆT NHAU ở mọi backend
   (crm-dental · crm-surgical · crm-eyeless · crm-thai · management · backoffice · marketing · kpi · training)
   — sửa 1 file thì chép sang các backend còn lại.

   App (CRM / Report Hub) bật "Chế độ TEST" ⇒ mọi lệnh gửi kèm tm=1 + phiên email (tk) của Admin; người dùng = "TEST".
   ① CHỈ ADMIN: phiên email do Training Hub ký (RH_Secret của Training Master), RH_Users ▸ Admin = TRUE.
      Người khác gửi tm=1 hoặc PIC "TEST…" ⇒ bị từ chối (không ai giả làm TEST được).
   ② GHI THẬT vào file thật — PIC / tên bắt đầu bằng "TEST" (ảnh: TEST_<ngày>_<khách>_01.jpg, đề xuất công tác PIC "TEST").
   ③ EMAIL: mọi email gửi trong lượt gọi TEST chỉ tới Admin, tiêu đề "[TEST] …", bỏ CC / BCC, đầu thư ghi người nhận thật
      (hook tmMailHook_ trong MMH_MailDomain.gs). Kết quả trả về kèm _tm.mails ⇒ app vẽ "email lẽ ra gửi tới …".
   ④ ẨN với mọi người: tmScrub_ bỏ khỏi kết quả mọi phần tử có pic / account / assigner bắt đầu bằng "TEST"
      (trừ lượt gọi TEST). TEST không có trong Staff List / tab KPI ⇒ không cộng KPI.
   ⑤ VAI DIỄN: Admin đóng vai Giám đốc / Quản lý (tmAs) — CHỈ duyệt được hồ sơ TEST (tmCanDecide_), hồ sơ thật vẫn cần người thật.
   ⑥ tmClean: xoá dữ liệu TEST — xoá NỘI DUNG các dòng có PIC "TEST" (giữ công thức, KHÔNG xoá dòng ⇒ số dòng của người khác
      không đổi), dòng TEST trên file Business Trip (+ folder đã tạo khi duyệt), file Drive tên "TEST_…" trong các folder của backend.
   Không dùng dịch vụ Google mới ⇒ không phải cấp quyền lại.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var TMODE = {
  VER: '1.0',
  MASTER_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',        /* Training Master (RH_Users + RH_Secret) */
  KEYS: ['pic', 'PIC', 'Pic', 'picName', 'account', 'accountName', 'customer', 'assigner'],
  PIC_HDR: /^(pic|pic name|sales pic|nhan su|nguoi phu trach|person in charge|nguoi de xuat|assigner)$/,
  SKIP_SHEETS: /^(RH_Users|RH_Secret|RH_Perm|0\. Staff List|5\. Member KPI Monthly|3\. Detail KPI|KPI EMAIL DIRECTORY)$/i,
  FILE_DAYS: 120                                                     /* tmClean: file Drive "TEST_…" sửa trong 120 ngày gần đây */
};
var MMH_TEST = null;                                                 /* lượt gọi TEST: { email, local, pic, as, mails[] } */

function tmS_(v){ return v == null ? '' : String(v).trim(); }
/* "TEST", "TEST Dental", "TEST_20261013_…", "TEST (Giám đốc)" — chữ HOA, đứng đầu */
function tmIsTest_(v){ return /^TEST(\b|_)/.test(tmS_(v)); }
function tmOn_(){ return !!MMH_TEST; }
function tmNorm_(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim(); }
function tmLocal_(e){ return String(e || '').toLowerCase().split('@')[0].trim(); }
function tmB64_(x){ return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }
function tmSame_(a, b){ a = String(a || ''); b = String(b || ''); if(a.length !== b.length) return false; var d = 0; for(var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/* ───────── ① XÁC THỰC ADMIN (phiên email do Training Hub ký) ⇒ { email, local, pic, level, admin } hoặc { err } ───────── */
function tmWho_(tk){
  tk = tmS_(tk); var dot = tk.indexOf('.');
  if(dot < 10) return { err:'cần đăng nhập bằng email công ty.' };
  var data = tk.substring(0, dot), sig = tk.substring(dot + 1), t;
  try{ t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); }catch(e){ return { err:'phiên đăng nhập không hợp lệ.' }; }
  if(!t || !t.x || Date.now() > t.x) return { err:'phiên đăng nhập đã hết hạn — đăng nhập lại.' };
  var c = CacheService.getScriptCache(), key = 'tmw_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, tk)).slice(0, 40);
  try{ var hit = c.get(key); if(hit) return JSON.parse(hit); }catch(e){}
  var book;
  try{ book = SpreadsheetApp.openById(TMODE.MASTER_ID); }catch(e){ return { err:'backend chưa đọc được Training Master để kiểm phiên.' }; }
  var sec = book.getSheetByName('RH_Secret'), s = sec ? tmS_(sec.getRange(2, 1).getValue()) : '';
  if(s.length < 32 || !tmSame_(sig, tmB64_(Utilities.computeHmacSha256Signature(data, s)))) return { err:'phiên đăng nhập không hợp lệ.' };
  var us = book.getSheetByName('RH_Users'), V = us ? us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 6).getValues() : [], u = null;
  V.forEach(function(r){ if(tmLocal_(r[0]) === tmLocal_(t.e)) u = r; });
  if(!u) return { err:'tài khoản không có trong RH_Users.' };
  var active = u[4] === '' || u[4] === true || /^(true|1|x|yes)$/i.test(tmS_(u[4]));
  if(!active) return { err:'tài khoản đã bị khoá.' };
  if((t.s || 1) !== Math.max(1, parseInt(u[5], 10) || 1)) return { err:'phiên đăng nhập đã bị đăng xuất từ xa.' };
  var email = tmS_(u[0]).toLowerCase(); if(email.indexOf('@') < 0) email = tmLocal_(t.e) + '@manimedicalhanoi.com';
  if(typeof mmhAddr_ === 'function') email = mmhAddr_(email);
  var me = { email:email, local:tmLocal_(t.e), pic:tmS_(u[1]), level:tmS_(u[2]).toLowerCase(), admin:u[3] === true || /^(true|1|x|yes)$/i.test(tmS_(u[3])) };
  try{ c.put(key, JSON.stringify(me), 600); }catch(e){}
  return me;
}

/* Gọi ĐẦU MỖI LƯỢT (trước khi xử lý). p = tham số đã gộp; e = sự kiện doGet/doPost (lấy tm / tk trên URL khi thân POST là JSON).
   ⇒ null (đi tiếp) hoặc { ok:false, … } (trả lỗi ngay). */
function tmBegin_(p, e){
  MMH_TEST = null;
  p = p || {};
  var q = (e && e.parameter) || {};
  if(p.tm == null && q.tm != null) p.tm = q.tm;
  if(!p.tk && q.tk) p.tk = q.tk;
  var want = tmS_(p.tm) === '1';
  if(!want && !tmIsTest_(p.pic) && !tmIsTest_(p.forPic) && !tmIsTest_(p.actor)) return null;
  var me = tmWho_(p.tk);
  if(me.err) return { ok:false, code:'TEST_AUTH', error:'Chế độ TEST: ' + me.err };
  if(!me.admin) return { ok:false, code:'TEST_ADMIN', error:'Chế độ TEST chỉ dành cho Admin.' };
  MMH_TEST = { email:me.email, local:me.local, pic:me.pic, as:tmS_(p.tmAs), mails:[] };
  return null;
}

/* vai Giám đốc / Quản lý trong chế độ TEST: chỉ hồ sơ TEST */
function tmCanDecide_(recPic){ return !!MMH_TEST && tmIsTest_(recPic); }
function tmDecider_(){ return 'TEST (' + (MMH_TEST && MMH_TEST.as === 'dir' ? 'vai Giám đốc' : MMH_TEST && MMH_TEST.as === 'mgr' ? 'vai Quản lý' : 'Admin') + ')'; }

/* ───────── ③ EMAIL: gọi từ mmhMail_ / mmhGmail_ (MMH_MailDomain.gs) ───────── */
function tmMailHook_(o){
  if(!MMH_TEST || !o || typeof o !== 'object') return o;
  var orig = { to:tmS_(o.to), cc:tmS_(o.cc), bcc:tmS_(o.bcc) }, subj = tmS_(o.subject);
  o.to = MMH_TEST.email; delete o.cc; delete o.bcc;
  if(!/^\[TEST\]/.test(subj)) o.subject = '[TEST] ' + subj;
  var note = 'CHẾ ĐỘ TEST (Admin) — bản thật sẽ gửi: To ' + (orig.to || '—') + (orig.cc ? ' · CC ' + orig.cc : '') + (orig.bcc ? ' · BCC ' + orig.bcc : '') + '. Email này chỉ gửi về Admin.';
  var esc = function(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  if(o.htmlBody) o.htmlBody = '<div style="font-family:Calibri,Arial,sans-serif;font-size:12.5px;background:#FFF6D6;border:1px solid #E8C95A;color:#6B5200;padding:8px 12px;border-radius:8px;margin:0 0 12px">' + esc(note) + '</div>' + o.htmlBody;
  o.body = note + '\n\n' + (o.body || '');
  MMH_TEST.mails.push({ to:orig.to, cc:orig.cc, bcc:orig.bcc, subject:subj, sentTo:o.to, files:(o.attachments || []).length });
  return o;
}

/* ───────── ④ ẨN DỮ LIỆU TEST VỚI NGƯỜI THẬT · gắn _tm vào kết quả của lượt TEST ───────── */
function tmHit_(o){
  for(var i = 0; i < TMODE.KEYS.length; i++){ var v = o[TMODE.KEYS[i]]; if(typeof v === 'string' && tmIsTest_(v)) return true; }
  return false;
}
function tmWalk_(x, d){
  if(!x || typeof x !== 'object' || d > 8) return x;
  if(Array.isArray(x)){
    var out = [];
    for(var i = 0; i < x.length; i++){
      var el = x[i];
      if(el && typeof el === 'object' && !Array.isArray(el) && tmHit_(el)) continue;
      out.push(el && typeof el === 'object' ? tmWalk_(el, d + 1) : el);
    }
    return out;
  }
  for(var k in x) if(Object.prototype.hasOwnProperty.call(x, k) && x[k] && typeof x[k] === 'object') x[k] = tmWalk_(x[k], d + 1);
  return x;
}
/* gọi trong reply(): obj ⇒ obj (đã lọc / đã gắn _tm) */
function tmScrub_(obj){
  if(MMH_TEST){
    if(obj && typeof obj === 'object' && !Array.isArray(obj)) obj._tm = { on:true, ver:TMODE.VER, admin:MMH_TEST.email, as:MMH_TEST.as, mails:MMH_TEST.mails || [] };
    return obj;
  }
  try{ return tmWalk_(obj, 0); }catch(e){ return obj; }
}
/* lọc mảng dòng đọc từ sheet (dùng ở readTab… của từng backend) */
function tmKeep_(row){ return MMH_TEST || !row || typeof row !== 'object' || !tmHit_(row); }

/* ───────── ⑥ XOÁ DỮ LIỆU TEST ───────── */
function tmClearRow_(sh, row, nc){
  var rg = sh.getRange(row, 1, 1, nc), f = rg.getFormulas()[0], v = rg.getValues()[0], any = false;
  for(var j = 0; j < nc; j++){
    if(f[j]) continue;
    if(v[j] !== '' && v[j] !== null){ sh.getRange(row, j + 1).clearContent(); any = true; }
  }
  return any;
}
/* sheet có cột PIC (tiêu đề ở 10 hàng đầu) ⇒ xoá nội dung các dòng PIC "TEST…" */
function tmCleanSheet_(sh){
  if(TMODE.SKIP_SHEETS.test(sh.getName())) return 0;
  var lr = sh.getLastRow(), lc = sh.getLastColumn(); if(lr < 2 || lc < 1) return 0;
  var hr = Math.min(10, lr), H = sh.getRange(1, 1, hr, Math.min(lc, 60)).getDisplayValues(), hRow = 0, pc = 0;
  for(var i = 0; i < H.length && !pc; i++) for(var j = 0; j < H[i].length; j++) if(TMODE.PIC_HDR.test(tmNorm_(H[i][j]))){ hRow = i + 1; pc = j + 1; break; }
  if(!pc || lr <= hRow) return 0;
  var V = sh.getRange(hRow + 1, pc, lr - hRow, 1).getValues(), n = 0;
  for(var r = 0; r < V.length; r++) if(tmIsTest_(V[r][0]) && tmClearRow_(sh, hRow + 1 + r, lc)) n++;
  return n;
}
/* file Business Trip (MMH_TripFlow.gs) — dòng PIC "TEST…": bỏ folder đã tạo, xoá nội dung (giữ công thức) */
function tmCleanTrip_(){
  var out = { rows:0, folders:0 };
  if(typeof TF === 'undefined' || !TF.TRIP_ID) return out;
  var sh = SpreadsheetApp.openById(TF.TRIP_ID).getSheetByName(TF.TRIP_TAB); if(!sh) return out;
  var lr = sh.getLastRow(); if(lr < TF.DATA_ROW) return out;
  var V = sh.getRange(TF.DATA_ROW, TF.C.PIC, lr - TF.DATA_ROW + 1, 1).getValues(), nc = Math.max(28, Math.min(sh.getLastColumn(), 40));
  for(var i = 0; i < V.length; i++){
    if(!tmIsTest_(V[i][0])) continue;
    var row = TF.DATA_ROW + i;
    try{
      var link = sh.getRange(row, TF.C.FOLDER_LINK).getRichTextValue().getLinkUrl() || tmS_(sh.getRange(row, TF.C.FOLDER_LINK).getValue());
      var m = /folders\/([\w-]{20,})/.exec(link || '');
      if(m){ DriveApp.getFolderById(m[1]).setTrashed(true); out.folders++; }
    }catch(e){}
    if(tmClearRow_(sh, row, nc)) out.rows++;
  }
  return out;
}
function tmRoots_(){
  var r = [];
  try{ if(typeof photoFolderId_ === 'function') r.push(photoFolderId_()); }catch(e){}
  try{ if(typeof NA_ENV !== 'undefined' && NA_ENV.folderId) r.push(NA_ENV.folderId()); }catch(e){}
  try{ if(typeof WEEKLY_PDF_FOLDER_ID !== 'undefined') r.push(WEEKLY_PDF_FOLDER_ID); }catch(e){}
  try{ if(typeof TMODE_FOLDERS !== 'undefined') r = r.concat(TMODE_FOLDERS); }catch(e){}
  return r.map(tmS_).filter(function(x, i, a){ return x && a.indexOf(x) === i; });
}
function tmUnder_(file, roots){
  var seen = 0, q = [];
  try{ var it = file.getParents(); while(it.hasNext()) q.push({ f:it.next(), d:0 }); }catch(e){ return false; }
  while(q.length && seen < 30){
    var x = q.shift(); seen++;
    if(roots.indexOf(x.f.getId()) >= 0) return true;
    if(x.d < 4){ try{ var p = x.f.getParents(); while(p.hasNext()) q.push({ f:p.next(), d:x.d + 1 }); }catch(e){} }
  }
  return false;
}
function tmCleanDrive_(roots){
  if(!roots.length) return 0;
  var since = Utilities.formatDate(new Date(Date.now() - TMODE.FILE_DAYS * 86400000), 'UTC', "yyyy-MM-dd'T'HH:mm:ss");
  var it = DriveApp.searchFiles('title contains "TEST" and trashed = false and modifiedDate > "' + since + '"'), n = 0, k = 0;
  while(it.hasNext() && k < 400){
    var f = it.next(); k++;
    if(!/(^|[_\s-])TEST([_\s.-]|$)/.test(f.getName())) continue;
    if(!tmUnder_(f, roots)) continue;
    try{ f.setTrashed(true); n++; }catch(e){}
  }
  return n;
}
function tmClean_(){
  if(!MMH_TEST) return { ok:false, code:'TEST_ONLY', error:'Chỉ chạy được trong chế độ TEST của Admin.' };
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' }; }
  var res = { ok:true, sheets:[], rows:0, trip:0, folders:0, files:0, errors:[] };
  try{
    var book = (typeof ss === 'function') ? ss() : SpreadsheetApp.getActiveSpreadsheet();
    res.file = book.getName(); res.url = book.getUrl();
    book.getSheets().forEach(function(sh){
      try{ var n = tmCleanSheet_(sh); if(n){ res.sheets.push({ name:sh.getName(), rows:n }); res.rows += n; } }
      catch(e){ res.errors.push(sh.getName() + ': ' + (e && e.message || e)); }
    });
    try{ var t = tmCleanTrip_(); res.trip = t.rows; res.folders = t.folders; }catch(e){ res.errors.push('Business Trip: ' + (e && e.message || e)); }
    try{ res.files = tmCleanDrive_(tmRoots_()); }catch(e){ res.errors.push('Drive: ' + (e && e.message || e)); }
    SpreadsheetApp.flush();
  } finally { try{ lock.releaseLock(); }catch(e){} }
  /* app tải lại dữ liệu mới */
  try{ if(typeof bumpVersion === 'function') bumpVersion(); }catch(e){}
  try{ if(typeof touchVersion === 'function') touchVersion(); }catch(e){}
  try{ if(typeof naBump_ === 'function') naBump_(); }catch(e){}
  res.message = 'Đã xoá ' + res.rows + ' dòng TEST' + (res.sheets.length ? ' (' + res.sheets.map(function(x){ return x.name + ': ' + x.rows; }).join(', ') + ')' : '') +
    (res.trip ? ' · ' + res.trip + ' dòng Business Trip' : '') + (res.folders ? ' · ' + res.folders + ' folder công tác' : '') + (res.files ? ' · ' + res.files + ' file Drive' : '');
  return res;
}

/* router: trả null nếu không phải action của module này */
function tmRoute_(action, p){
  if(action === 'tmInfo') return { ok:true, ver:TMODE.VER, test:!!MMH_TEST, admin:MMH_TEST ? MMH_TEST.email : '',
    file:(function(){ try{ var b = (typeof ss === 'function') ? ss() : SpreadsheetApp.getActiveSpreadsheet(); return { name:b.getName(), url:b.getUrl() }; }catch(e){ return null; } })() };
  if(action === 'tmClean') return tmClean_();
  return null;
}
