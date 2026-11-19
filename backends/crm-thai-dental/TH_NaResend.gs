/* ═══════════════════════════════════════════════════════════════════════════════════════
   naResend (18/11/2026, người dùng yêu cầu) — GỬI LẠI email xin duyệt Mở mới / SKU mới cho đúng người duyệt hiện tại
   (đổi người duyệt Dao + Tuyen ⇒ Owen; case đang chờ đã gửi cho người cũ).
   ?action=naResend&key=<8 ký tự cuối ID Sheet>                → liệt kê case Pending (chỉ đọc)
   ?action=naResend&key=…&op=send&id=<case>&cc=Nguyen Ha,Giang → gửi lại: To = người duyệt hiện tại (NA_APPROVERS_TH), CC = tên trong `cc`
                                                                  (thiếu `cc` ⇒ như lúc gửi thường: Director + HR + PIC); ghi lại subTo / subAt + nhật ký case.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
function thdNaResendApi_(p){
  var key = str_(p.key), sid = ss_().getId();
  if(!key || key !== sid.slice(-8)) return { ok: false, error: 'key?' };
  var op = str_(p.op) || 'list';
  if(op === 'list'){
    return { ok: true, approvers: naApprovers_('Yong'), cases: naReadAll_().filter(function(o){ return o.status === NA_ST.pending; })
      .map(function(o){ return { id: o.id, pic: o.pic, type: o.type, account: o.account, kpi: o.kpi, month: o.month, subTo: o.subTo, subAt: o.subAt, files: (o.files || []).length }; }) };
  }
  if(op !== 'send') return { ok: false, error: 'op?' };
  var o, to, aps, wk, lock = LockService.getScriptLock();
  try{ lock.waitLock(20000); }catch(e){ return { ok: false, error: 'Busy' }; }
  try{
    o = naFind_(str_(p.id));
    if(!o) return { ok: false, error: 'Case not found' };
    if(o.status !== NA_ST.pending) return { ok: false, error: 'Case is not pending: ' + o.status };
    aps = naApprovers_(o.pic);
    to = aps.map(function(x){ return NA_ENV.email(x); }).filter(String);
    if(!to.length) return { ok: false, error: 'No approver for ' + o.pic };
    wk = naWeeklyProof_(o.pic, o.account, o.orderDate);
    o.weekly = naWeeklyText_(wk);
    o.subTo = aps.join(', '); o.subAt = naNow_();
    naLogLine_(o, 'Admin', 'request re-sent → ' + o.subTo);
    o.updated = naNow_();
    naWrite_(o); naBump_();
  } finally { lock.releaseLock(); }
  var names = str_(p.cc) ? str_(p.cc).split(/\s*,\s*/) : null;
  /* 19/11/2026 — CC mặc định (Director · kế toán Hòa · PIC) LUÔN có; `cc` chỉ THÊM người (lần gửi lại 18/11 thiếu chị Hòa) */
  var cc = [NA_ENV.director, NA_ENV.hr, NA_ENV.email(o.pic)].concat(names ? names.map(function(n){ return NA_ENV.email(n); }) : [])
    .filter(function(e, i, a){ return e && a.indexOf(e) === i && to.indexOf(e) < 0; });
  var mail = naSendMail_(o, 'submit', { pic: o.pic }, to, cc, wk);
  try{ NA_ENV.log({ pic: 'Admin' }, 'resend', o.account, 'case ' + o.id + ' → ' + o.subTo + ' · cc ' + cc.length); }catch(e){}
  return { ok: !!mail.ok, id: o.id, to: aps, cc: ['Nguyen Ha', 'Hoa', o.pic].concat(names || []), mail: { ok: mail.ok, files: mail.files, warn: mail.warn, error: mail.error } };
}
