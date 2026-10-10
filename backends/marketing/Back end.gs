/*************************************************************************************************
 * MMH REPORT HUB — Google Apps Script backend  (v13.4 — MARKETING + SALES · 01.10.2026)
 * v13.4 (01.10.2026): BIÊN BẢN HỌP (sheet MEETING LOG) · lưu / lịch sử / so sánh / gửi email
 * v13.3: thêm FILE THAM CHIẾU cho task (lưu Drive: Phòng ban ▸ PIC ▸ YYYYMMDD_Tên task) — chạy authorizeDrive 1 lần
 * v13.2: Completed ⇒ giữ đúng finish date nếu ở quá khứ; chỉ task hạn tương lai mới nhảy về hôm nay
 * v13: Minh Trang thay Quỳnh Anh (cùng email mmh.admin) · chuyển Sub task sang Key task khác (moveSub)
 *      · siết quy tắc Completed: task đã hoàn thành KHÔNG BAO GIỜ nằm ở ngày tương lai
 * v10: chống ghi trùng (rid + LockService) · tự vá cột No/công thức cho dòng mới ·
 *      boot nhanh hơn (đọc sheet 1 lần, tác vụ nặng 5 phút/lần) · lệnh ghi trả về vân tay dữ liệu
 * v9: thêm PIC Surgical Sales (Viet Ha, Khang) · đổi 'Minh Viet' → 'Viet' ·
 *     Key task 'Customer visiting' đồng bộ tự động (xem file Visiting_Sync.gs)
 * Sheet nguồn:  "WEEKYLY new"  (Gantt: Key Task ▸ Sub Task)  &  "MONTH" (Monthly summary — BO layout)
 *
 * ───────── BỐ CỤC CỘT "WEEKY new" (giống Marketing) ─────────
 *  Header ở HÀNG 5, dữ liệu bắt đầu từ HÀNG 7.
 *  B=No | C=FY | D=Month | E=Type | F=Key Task | G=Sub Task | H=PIC | I=Task result/Link |
 *  J=Start | K=Planned Deadline | L=Revised Deadline | M=Leadtime |
 *  N=Status | O=% thực hiện | P=Actual finish | Q=Behavior
 *  → Công thức (KHÔNG ghi đè): B,C,D,M,P,Q
 *
 * ───────── BỐ CỤC CỘT "MONTH" (Marketing) ─────────
 *  Header ở HÀNG 2, dữ liệu bắt đầu từ HÀNG 3.
 *  B=No | C=FY | D=Month | E=Type Task | F=Key task | G=Plan-Result | H=PIC
 *
 * Master: Type Task ở cột D.
 *************************************************************************************************/

/* ══════════════ CONFIG ══════════════ */
var SHEET_WEEKLY  = 'WEEKYLY new';
var SHEET_MONTHLY = 'MONTH';
var SHEET_MASTER  = 'Master';
var WEEKLY_HEADER_ROW = 5;
var WEEKLY_DATA_ROW   = 7;
/* MONTH Marketing: header hàng 2, data hàng 3 */
var MONTHLY_HEADER_ROW = 2;
var MONTHLY_DATA_ROW   = 3;

var SOURCE = 'marketing';

var DIRECTOR_EMAIL = 'nt.ha@manimedicalhanoi.com';
var HEAD_BACKOFFICE_EMAIL = 'vtt.hoa@manimedicalhanoi.com';
var HOD_SM_EMAIL = 'tt.tuyen@manimedicalhanoi.com';
var CC_DEFAULT = [HEAD_BACKOFFICE_EMAIL, DIRECTOR_EMAIL, HOD_SM_EMAIL];

/* ══════════════ DANH BẠ NHÂN SỰ ══════════════ */
var USER_MAP = {
  'nt.ha@manimedicalhanoi.com'         : { pic:'Nguyen Ha', initials:'NH', role:'manager', level:'director', title:'Director',                    dept:'Sales & Marketing VN', team:'Management', canAssign:true },
  'tt.tuyen@manimedicalhanoi.com'      : { pic:'Tuyen',     initials:'TU', role:'manager', level:'hod',      title:'Head of Sales & Marketing VN', dept:'Sales & Marketing VN', team:'Sales & Marketing VN', canAssign:true },
  'mmh.product@manimedicalhanoi.com'   : { pic:'Giang',     initials:'GI', role:'manager', level:'lead',     title:'Product Team Leader',         dept:'Sales & Marketing VN', team:'Product Team', canAssign:true },
  'marketing.mmh@manimedicalhanoi.com' : { pic:'Thuong',    initials:'TH', role:'manager', level:'lead',     title:'Marketing Team Leader',       dept:'Sales & Marketing VN', team:'Marketing Team', canAssign:true },
  'marketing.mmh1@manimedicalhanoi.com': { pic:'Duc Anh',   initials:'DA', role:'pic',     level:'pic',      title:'Marketing PIC — Design',      dept:'Sales & Marketing VN', team:'Marketing Team', canAssign:false },
  'mmh.admin@manimedicalhanoi.com'     : { pic:'Minh Trang',initials:'MT', role:'pic',     level:'pic',      title:'Marketing PIC — Digital',     dept:'Sales & Marketing VN', team:'Marketing Team', canAssign:false },
  'marketing.mmh2@manimedicalhanoi.com': { pic:'Trang',     initials:'TR', role:'pic',     level:'pic',      title:'Marketing PIC',               dept:'Sales & Marketing VN', team:'Marketing Team', canAssign:false },
  'mmh.hanoi@manimedicalhanoi.com'     : { pic:'Viet',      initials:'VT', role:'manager', level:'lead',     title:'Dental Sales Team Leader',    dept:'Sales & Marketing VN', team:'Dental Sales Team', canAssign:true },
  'mmh.danang@manimedicalhanoi.com'    : { pic:'Vinh',      initials:'VI', role:'pic',     level:'pic',      title:'Dental Sales PIC',            dept:'Sales & Marketing VN', team:'Dental Sales Team', canAssign:false },
  'mmh.saigon@manimedicalhanoi.com'    : { pic:'Phuong',    initials:'PH', role:'pic',     level:'pic',      title:'Dental Sales PIC',            dept:'Sales & Marketing VN', team:'Dental Sales Team', canAssign:false },
  /* ⭐ v9: Surgical Sales — làm được mọi thao tác như PIC Marketing */
  'mmh.hanoi2@manimedicalhanoi.com'    : { pic:'Viet Ha',   initials:'VH', role:'pic',     level:'pic',      title:'Surgical Sales PIC — North',  dept:'Sales & Marketing VN', team:'Surgical Sales Team', canAssign:false },
  'mmh.saigon1@manimedicalhanoi.com'   : { pic:'Khang',     initials:'KH', role:'pic',     level:'pic',      title:'Surgical Sales PIC — South',  dept:'Sales & Marketing VN', team:'Surgical Sales Team', canAssign:false },
  'vtt.hoa@manimedicalhanoi.com'       : { pic:'Hoa',       initials:'HO', role:'manager', level:'hod',      title:'Head of Back Office',         dept:'Back-office', team:'Back-office', canAssign:true },
  'mmh.backoffice@manimedicalhanoi.com': { pic:'Dam Ha',    initials:'DH', role:'pic',     level:'lead',     title:'Stock Team Leader',           dept:'Back-office', team:'Stock Team', canAssign:false },
  'mmh.backoffice1@manimedicalhanoi.com':{ pic:'Hau',       initials:'HU', role:'pic',     level:'pic',      title:'Stock PIC',                   dept:'Back-office', team:'Stock Team', canAssign:false },
  'mmh.hanoi1@manimedicalhanoi.com'    : { pic:'Ngoc',      initials:'NG', role:'pic',     level:'pic',      title:'Accounting & Import-Export',  dept:'Back-office', team:'Accounting', canAssign:false },
  'mmh.order@manimedicalhanoi.com'     : { pic:'Dam Viet',  initials:'DV', role:'pic',     level:'pic',      title:'Purchasing & Sales Support',  dept:'Back-office', team:'Purchasing', canAssign:false }
};
var PIC_EMAIL = (function(){ var m={}; for(var e in USER_MAP){ m[USER_MAP[e].pic]=e; } return m; })();

function userByPic(pic){ var e=PIC_EMAIL[pic]; return e?Object.assign({email:e},USER_MAP[e]):null; }
function deptEmails(dept){ var out=[]; for(var e in USER_MAP){ if(USER_MAP[e].dept===dept) out.push(e); } return out; }
function teamEmails(team){ var out=[]; for(var e in USER_MAP){ if(USER_MAP[e].team===team) out.push(e); } return out; }
function hodEmail(dept){ for(var e in USER_MAP){ if(USER_MAP[e].dept===dept && USER_MAP[e].level==='hod') return e; } return ''; }
function teamLeadEmail(team){ for(var e in USER_MAP){ if(USER_MAP[e].team===team && USER_MAP[e].level==='lead') return e; } return ''; }
/* ⭐ To = tất cả thành viên cùng TEAM; CC = luôn có Nguyen Ha, Hoa, Tuyen */
function reportRecipients(senderPic){
  var u=userByPic(senderPic);
  var to = u ? teamEmails(u.team) : [PIC_EMAIL[senderPic]||''];
  if(!to.length && u) to=[u.email];
  to = to.filter(function(e,i,a){ return e && a.indexOf(e)===i; });
  return { to:to, cc:CC_DEFAULT.slice() };
}

var STATUS_OPTIONS = ['To Do','In Progress','Completed','Cancelled'];
var TYPE_OPTIONS = [
  'Marketing-Digital Marketing','Marketing-Design','Marketing-Event','Marketing-Project',
  'Marketing-Promotion','Marketing-Customer care',
  'Product-Training & Presentation','Product-Data Organization','Product-Customer Claim',
  'Sales-Surgical','Sales-Dental'
];

/* ══════════════ ⭐ v9 SHIM — chạy được cả khi CHƯA thêm file Visiting_Sync.gs ══════════════
   Nếu thiếu file đó, app vẫn hoạt động y như v8.1 (chỉ không có Customer visiting),
   thay vì chết ngay ở boot với lỗi "VISIT_COL_META is not defined". */
function _vsOn(){ return (typeof VISIT_COL_META !== 'undefined') && (typeof vsIsLockedRow === 'function'); }
function _vsColKey(){  return (typeof VISIT_COL_KEY  !== 'undefined') ? VISIT_COL_KEY  : 21; }
function _vsColMeta(){ return (typeof VISIT_COL_META !== 'undefined') ? VISIT_COL_META : 22; }
function _vsLocked(sh, row){
  try { return (typeof vsIsLockedRow === 'function') ? vsIsLockedRow(sh, row) : false; }
  catch(e){ return false; }
}
function _vsMsg(){
  return (typeof VS_LOCK_MSG !== 'undefined') ? VS_LOCK_MSG
    : 'Task được đồng bộ tự động từ sheet Field Report của Sales — không sửa/xoá trên Report Hub.';
}
function _vsSyncSafe(){ try{ if(typeof vsSyncThrottled === 'function') vsSyncThrottled(); }catch(e){} }
function _vsAppUrlsSafe(){ try{ return (typeof vsAppUrls === 'function') ? vsAppUrls() : {}; }catch(e){ return {}; } }
function _vsApiSafe(user, p){
  if (typeof vsApiSync !== 'function')
    return { ok:false, error:'Chưa thêm file Visiting_Sync.gs vào project Apps Script (hoặc chưa deploy version mới).' };
  return vsApiSync(user, p);
}

/* ══════════════ ROUTER ══════════════ */
function doGet(e)  { return handle(e, 'GET'); }
function doPost(e) { return handle(e, 'POST'); }

/* ══════════════ ⭐ v10: CHỐNG GHI TRÙNG + KHOÁ GHI ══════════════
 * Nguyên nhân "tạo 1 key task ra 3 dòng": web gửi lại lệnh ghi (bấm nhiều lần khi chưa thấy
 * task hiện ra, hoặc trình duyệt tự gửi lại khi mạng chập chờn). Nay:
 *   ① Mỗi lệnh ghi từ web mang mã "rid" duy nhất. Backend nhớ rid 30 phút (CacheService):
 *      gặp lại rid cũ ⇒ trả lại đúng kết quả lần trước, KHÔNG ghi thêm dòng nào.
 *   ② Mọi lệnh ghi xếp hàng qua LockService ⇒ 2 người thêm task cùng lúc không đè dòng nhau. */
var WRITE_ACTIONS = { updateSub:1, updateKey:1, updateResult:1, updateProgress:1, updateStatus:1,
  addKey:1, addSub:1, deleteRow:1, deleteKey:1, deleteSub:1, updateMonthly:1, addMonthly:1,
  updateMonth:1, addMonth:1, deleteMonthly:1, deleteMonth:1, setPriorityFlag:1, moveSub:1 };
function ridGet(rid){
  try{ var v = CacheService.getScriptCache().get('rid_'+rid); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
function ridPut(rid, out){
  try{ CacheService.getScriptCache().put('rid_'+rid, JSON.stringify(out).slice(0, 90000), 1800); }catch(e){}
}
/* ⭐ v11: KHÔNG cho sửa / xoá / thêm sub vào dòng LỊCH CÔNG TÁC (đồng bộ từ file Business Trip) */
function tripGuard(action, p){
  try{
    if(!/^(update|delete|addSub)/.test(action) || /Month/.test(action)) return null;
    if(typeof rhxIsTripRow !== 'function') return null;
    var sh = shWeekly(), row = 0;
    if(action === 'addSub') row = resolveRow(sh, { no:p.parentNo||p.keyNo, expect:p.expectKey });
    else row = resolveRow(sh, p);
    if(row && rhxIsTripRow(sh, row)) return { ok:false, error:RHX_LOCK_MSG };
  }catch(e){}
  return null;
}
function runWrite(action, p, fn){
  var rid = String(p.rid || '').trim();
  if(rid){ var prev = ridGet(rid); if(prev){ prev.dedup = true; return prev; } }
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây.' }; }
  var out;
  try{
    if(rid){ var prev2 = ridGet(rid); if(prev2){ prev2.dedup = true; return prev2; } }   /* kiểm lại sau khi có khoá */
    var _g = tripGuard(action, p); if(_g) return _g;                                        /* ⭐ v11 */
    out = fn();
    SpreadsheetApp.flush();
  } finally { try{ lock.releaseLock(); }catch(e){} }
  if(out && out.ok){ touchVersion(); out.v = dataVersion().v; }
  /* ⭐ v10.1: xoá dòng làm số No thay đổi ⇒ trả luôn danh sách mới để web đổi theo NGAY */
  if(out && (out.ok || out.stale) && /^(deleteKey|deleteSub|deleteRow|moveSub)$/.test(action)){
    try{ out.keyTasks = readWeekly(); }catch(e){}
  }
  if(rid && out && out.ok){ var _c={}; for(var _k in out){ if(_k!=='keyTasks') _c[_k]=out[_k]; } ridPut(rid, _c); }
  return out;
}

function handle(e, method){
  var p = {};
  try {
    p = (method === 'POST' && e && e.postData) ? JSON.parse(e.postData.contents) : ((e && e.parameter) || {});
  } catch(_) { p = (e && e.parameter) || {}; }

  var callback = p.callback || '';
  var out = { ok:false };
  try{
    var action = p.action || 'boot';
    var user = whoAmI(p);
    if(MM_POST[action]){                              /* ⭐ v13.4: biên bản họp — lưu / xoá / gửi email */
      return reply(mmOnce(p, function(){ return dispatch(action, user, p); }), callback);
    }
    if(action === 'uploadRef'){                       /* ⭐ v13.3: file tham chiếu — tự chống trùng + khoá ghi riêng */
      return reply(refUploadHandler(user, p), callback);
    }
    if(RHX_ONCE[action]){
      /* ⭐ v11: gửi email / đề xuất công tác — chống gửi trùng theo rid, KHÔNG giữ khoá ghi (có thể mất vài giây) */
      var _rid = String(p.rid||'').trim();
      var _prev = _rid ? ridGet(_rid) : null;
      if(_prev){ _prev.dedup = true; out = _prev; }
      else { out = dispatch(action, user, p); if(_rid && out && out.ok) ridPut(_rid, out); if(out && out.ok){ touchVersion(); out.v = dataVersion().v; } }
    } else if(WRITE_ACTIONS[action]){
      out = runWrite(action, p, function(){ return dispatch(action, user, p); });
    } else {
      out = dispatch(action, user, p);
    }
  }catch(err){
    out = { ok:false, error: String(err && err.message || err) };
  }
  return reply(out, callback);
}
var RHX_ONCE = { tfDecide:1, tripPropose:1, mailSend:1, tripReport:1, tripUpdate:1, tripDelete:1 };
var RHX_ACTIONS = { tripSync:1, tripMaster:1, tripPropose:1, mailSend:1, tripInfo:1, tripReport:1, tripUpdate:1, tripDelete:1 };   /* ⭐ v12.8: xem / báo cáo / sửa / xoá công tác */
function dispatch(action, user, p){
    var out;
    if(/^tf[A-Z]/.test(String(action)) && typeof tfRoute_ === 'function'){   /* ⭐ 10/10/2026: MMH_TripFlow.gs — Giám đốc duyệt công tác từ web, nhật ký đề xuất */
      var _tf = tfRoute_(String(action), user, p); if(_tf) return _tf;
    }
    if(RHX_ACTIONS[action]){                    /* ⭐ v11: file ReportHub_Trip_Mail.gs */
      if(typeof rhxDispatch !== 'function') return { ok:false, error:'Chưa thêm file ReportHub_Trip_Mail.gs vào project Apps Script (hoặc chưa deploy version mới).' };
      return rhxDispatch(action, user, p);
    }
    switch(action){
      case 'ping':          out = { ok:true, pong:true, pic:user.pic, source:SOURCE }; break;
      case 'version':       out = dataVersion(); break;   /* ⭐ v5.11: dấu vân tay dữ liệu */
      case 'sheets':        out = sheetInfo(); break;    /* ⭐ v5.12: kiểm tra đang đọc đúng sheet nào */
      case 'boot':          out = boot(user); break;
      /* ⭐ v10: tải NHẸ — chỉ danh sách task + vân tay (nhanh hơn boot 3–5 lần) */
      case 'weekly':        out = { ok:true, keyTasks: readWeekly(), v: dataVersion().v }; break;
      case 'healRows':      out = { ok:true, healed: healMissingNo() }; break;
      case 'monthly':       out = { ok:true, rows: readMonthly() }; break;
      case 'updateSub':     out = updateWeeklyRow(user, p); break;
      case 'updateKey':     out = updateWeeklyRow(user, p); break;
      case 'updateResult':  out = updateResultOnly(user, p); break;
      case 'updateProgress':out = updateProgressQuick(user, p); break;
      case 'updateStatus':  out = updateStatusQuick(user, p); break;
      case 'addKey':        out = addKeyTask(user, p); break;
      case 'addSub':        out = addSubTask(user, p); break;
      case 'moveSub':       out = moveSubTask(user, p); break;   /* ⭐ v13 */
      case 'refStatus':     out = refStatus(p); break;           /* ⭐ v13.3 */
      case 'mmList':        out = mmList(); break;               /* ⭐ v13.4: biên bản họp */
      case 'mmGet':         out = mmGet(p); break;
      case 'mmSave':        out = mmSave(user, p); break;
      case 'mmDelete':      out = mmDelete(user, p); break;
      case 'mmMail':        out = mmMail(user, p); break;
      case 'deleteRow':     out = deleteWeeklyRow(user, p); break;
      case 'deleteKey':     out = deleteByNo(user, p, 'key'); break;
      case 'deleteSub':     out = deleteByNo(user, p, 'sub'); break;
      case 'activityLog':   out = { ok:true, log: readActivityLog(p.from||'', p.to||'') }; break;
      case 'updateMonthly': out = updateMonthlyRow(user, p); break;
      case 'addMonthly':    out = addMonthlyRow(user, p); break;
      case 'updateMonth':   out = updateMonthlyByNo(user, p); break;
      case 'addMonth':      out = addMonthlyRow(user, p); break;
      case 'deleteMonthly': out = deleteMonthlyRow(user, p); break;
      case 'deleteMonth':   out = deleteMonthlyByNo(user, p); break;
      case 'assign':        out = sendAssign(user, p); break;
      case 'sendPriority':  out = sendPriority(user, p); break;
      case 'setPriorityFlag': out = setPriorityFlag(user, p); break;
      case 'weeklyReport':  out = sendWeeklyReport(user, p); break;
      case 'sendWeeklyReport': out = sendWeeklyReport(user, p); break;
      case 'clearActivity': out = clearActivityLog(user, p); break;
      case 'monthlyReport': out = sendMonthlyReport(user, p); break;
      case 'myTasks':       out = { ok:true, source:SOURCE, tasks: myTasksFor(p.pic||user.pic) }; break;
      case 'syncVisiting':  out = _vsApiSafe(user, p); break;   /* ⭐ v9: đồng bộ Customer visiting */
      default: out = { ok:false, error:'Unknown action: '+action };
    }
    return out;
}

function reply(obj, callback){
  var json = JSON.stringify(obj);
  if(callback){
    if(!/^[A-Za-z_$][\w$]*$/.test(callback)) callback = 'callback';
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ⭐ MỚI: đếm task của 1 PIC ở nguồn này (dùng cho notification cross-department) */
/* ⭐ Trả về task CỦA ĐÚNG PIC NÀY và CHƯA HOÀN THÀNH (bỏ Completed/Cancelled),
   để thông báo đầu trang chỉ hiện việc còn phải làm. */
function isOpenTask(s){
  var st=String((s&&s.status)||'');
  return !/complet/i.test(st) && !/cancel/i.test(st);
}
function myTasksFor(pic){
  var tp=String(pic||'').trim().toLowerCase();
  if(!tp) return [];
  var out=[];
  readWeekly().forEach(function(k){
    var subs=k.subs||[];
    subs.forEach(function(s){
      if(String(s.pic||'').trim().toLowerCase()!==tp) return;   // đúng PIC
      if(!isOpenTask(s)) return;                                // bỏ việc đã xong/huỷ
      out.push({ no:s.no, name:s.name||s.subTask, keyTask:k.keyTask, status:s.status,
                 deadline:s.revised||s.planned||'', progress:s.progress, overdue:isOverdueTask(s) });
    });
    // key task không có sub → tính như 1 việc
    if(!subs.length && String(k.pic||'').trim().toLowerCase()===tp && isOpenTask(k)){
      out.push({ no:k.no, name:k.keyTask, keyTask:k.keyTask, status:k.status,
                 deadline:k.revised||k.planned||'', progress:k.progress, overdue:isOverdueTask(k) });
    }
  });
  return out;
}
/* ⭐ MỚI: task quá hạn mà vẫn In Progress / To Do */
function isOverdueTask(s){
  var st=String(s.status||'');
  if(/complet/i.test(st) || /cancel/i.test(st)) return false;
  var eff=s.revised||s.planned||'';
  if(!eff) return false;
  return String(eff).slice(0,10) < todayISO();
}

/* ══════════════ AUTH ══════════════ */
function whoAmI(p){
  /* ⭐ v10: ưu tiên "actor" (người đang đăng nhập) — "pic" có thể là PIC của task đang sửa */
  var picName = String((p && (p.actor || p.pic)) || '').trim();
  if(picName){
    for(var email in USER_MAP){
      var u = USER_MAP[email];
      if(String(u.pic).trim().toLowerCase() === picName.toLowerCase()){
        return { email:email, pic:u.pic, role:u.role, title:u.title, level:u.level, known:true };
      }
    }
    /* PIC có trong sheet nhưng chưa có email (vd Trang, Hang) → vẫn cho dùng, chỉ không gửi mail được */
    return { email:'', pic:picName, role:'pic', title:'PIC', level:'pic', known:false };
  }
  return { email:'', pic:'', role:'guest', title:'', level:'', known:false };
}
function boot(user){
  var picList = [];
  for(var email in USER_MAP){
    var u = USER_MAP[email];
    picList.push({ pic:u.pic, role:u.role, title:u.title, initials:u.initials, dept:u.dept, team:u.team, level:u.level, canAssign:!!u.canAssign });
  }
  var mgrs=[]; for(var em in USER_MAP){ if(USER_MAP[em].canAssign) mgrs.push(USER_MAP[em].pic); }
  /* ⭐ v10: 2 tác vụ nặng (tự chuyển To Do→In Progress, quét sheet Sales) chỉ chạy
     tối đa 1 lần / 5 phút thay vì MỖI lần mở web ⇒ boot nhanh hơn rõ rệt. */
  /* ⭐ v12.2: khi trigger "làm ấm" (warmCache) đang chạy, 2 việc nặng dưới đây do trigger lo
     ⇒ người mở web KHÔNG phải chờ. Chưa có trigger thì chạy như cũ (tối đa 1 lần / 5 phút). */
  if(!warmActive()){
    ensureWarmTrigger();
    if(throttleOk('auto_start', 300)){ try{ autoStartDueTasks(); }catch(e){} }
    if(throttleOk('vs_sync', 300)){ _vsSyncSafe(); touchVersion(); }
  }
  var bkey = 'boot_' + dataVersion().v;       /* ⭐ v10.2: cả gói dữ liệu boot qua bộ nhớ đệm */
  var data = cGetBig(bkey);
  if(!data){
    data = buildBootData(readWeekly());
    cPutBig(bkey, data, cacheTtl());
  }
  return {
    ok:true, source:SOURCE,
    user: user,
    picList: picList,
    managers: mgrs,
    pics: data.pics,
    statusOptions: STATUS_OPTIONS,
    typeOptions: data.typeOptions,
    keyTasks: data.keyTasks,
    monthly: data.monthly,
    activityLog: data.activityLog,
    visitApp: _vsAppUrlsSafe(),                                                     /* ⭐ v9 */
    v: dataVersion().v                                                              /* ⭐ v10 */
  };
}
/* ⭐ v10: chỉ cho chạy lại sau N giây (dùng chung cho mọi người dùng) */
function throttleOk(key, sec){
  try{
    var c = CacheService.getScriptCache();
    if(c.get('thr_'+key)) return false;
    c.put('thr_'+key, '1', sec);
    return true;
  }catch(e){ return true; }
}
/* ⭐ PIC list: gộp USER_MAP + PIC thực tế trong sheet (Trang, Hang…) */
function readPicOptions(weeklyCache){
  var set={};
  Object.keys(PIC_EMAIL).forEach(function(p){ set[p]=1; });
  try{
    var ms=shMaster();
    if(ms){
      var vals=ms.getRange(3,2,200,1).getValues(); // Master!B3:B — PIC
      vals.forEach(function(r){ var v=String(r[0]||'').trim(); if(v) set[v]=1; });
    }
  }catch(e){}
  try{
    (weeklyCache || readWeekly()).forEach(function(k){
      if(k.pic) set[k.pic]=1;
      (k.subs||[]).forEach(function(s){ if(s.pic) set[s.pic]=1; });
    });
  }catch(e){}
  return Object.keys(set).sort();
}
function dateNDaysAgo(n){
  var d=new Date(); d.setDate(d.getDate()-n);
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
function autoStartDueTasks(){
  var sh=shWeekly(); if(!sh) return;
  var last=sh.getLastRow(); if(last<WEEKLY_DATA_ROW) return;
  var n=last-WEEKLY_DATA_ROW+1;
  var rng=sh.getRange(WEEKLY_DATA_ROW, 6, n, 10).getValues();
  var today=todayISO();
  var updates=[];
  for(var i=0;i<rng.length;i++){
    var r=rng[i];
    var f=String(r[0]||'').trim(), g=String(r[1]||'').trim();
    if(!f && !g) continue;
    var status=String(r[8]||'').trim();
    if(!/to\s*do/i.test(status)) continue;
    var start=d2s(r[4]);
    var planned=d2s(r[5]);
    var due = start || planned;
    if(due && String(due).slice(0,10) <= today){ updates.push(WEEKLY_DATA_ROW+i); }
  }
  if(updates.length) touchVersion();          /* ⭐ v10.2: đổi trạng thái ⇒ làm mới bộ nhớ đệm */
  updates.forEach(function(row){
    sh.getRange(row,14).setValue('In Progress');
    var curPct=pct100(sh.getRange(row,15).getValue());
    if(!curPct||curPct<=0) sh.getRange(row,15).setValue(pctToCell(25));
  });
  try{ healFutureDone(); }catch(e){}                           /* ⭐ v13 */
}
function isManager(user){ return user.role === 'manager'; }
function canAssignUser(user){
  if(!user || !user.pic) return false;
  for(var e in USER_MAP){ if(USER_MAP[e].pic===user.pic) return !!USER_MAP[e].canAssign; }
  return false;
}
function canEditPic(user, pic){
  if(canAssignUser(user)) return true;
  return String(pic||'').trim().toLowerCase() === String(user.pic||'').trim().toLowerCase();
}

/* ══════════════ ACTIVITY LOG ══════════════ */
var ACTIVITY_SHEET='ActivityLog';
function activitySheet(){
  var s=ss().getSheetByName(ACTIVITY_SHEET);
  if(!s){
    s=ss().insertSheet(ACTIVITY_SHEET);
    s.getRange(1,1,1,6).setValues([['Timestamp','PIC','Type','Detail','KeyTask','SubNo']]);
    s.setFrozenRows(1);
  }
  return s;
}
/* ══════════════ ⭐ v5.11: PHÁT HIỆN THAY ĐỔI DỮ LIỆU (kể cả XOÁ DÒNG THẲNG TRÊN SHEET) ══════════════
 * Web gọi action=version mỗi 20 giây. Nếu "vân tay" đổi ⇒ tự tải lại dữ liệu.
 * Vân tay = mốc thời gian do trigger onChange/onEdit ghi lại  +  số dòng cuối của 2 sheet.
 * ⇒ Kể cả khi CHƯA cài trigger, việc xoá/thêm dòng vẫn làm số dòng cuối thay đổi ⇒ vẫn bắt được. */
/* ══════════════ ⭐ v10.2: BỘ NHỚ ĐỆM (CacheService, chia nhỏ vì mỗi ô tối đa 100KB) ══════════════ */
var CACHE_TTL = 60;
function cPutBig(key, obj, ttl){
  try{
    var s = JSON.stringify(obj), c = CacheService.getScriptCache(), CH = 28000;
    var n = Math.ceil(s.length / CH) || 1, m = {};
    if(n > 80) return;                                    /* quá lớn thì thôi, đọc trực tiếp */
    for(var i=0;i<n;i++) m[key+'_'+i] = s.substr(i*CH, CH);
    m[key+'_n'] = String(n);
    /* ⭐ v12.2: xoá gói của vân tay CŨ cùng loại (wk_/boot_) — không để rác chiếm bộ nhớ đệm */
    var pre = String(key).split('_')[0], old = c.get('lastk_' + pre);
    if(old && old !== key){
      var on = parseInt(c.get(old + '_n'), 10) || 0, rm = [old + '_n'];
      for(var r=0;r<on;r++) rm.push(old + '_' + r);
      try{ c.removeAll(rm); }catch(_){}
    }
    m['lastk_' + pre] = key;
    c.putAll(m, ttl || CACHE_TTL);
  }catch(e){}
}
function cGetBig(key){
  try{
    var c = CacheService.getScriptCache(), n = parseInt(c.get(key+'_n'), 10);
    if(!n) return null;
    var ks = []; for(var i=0;i<n;i++) ks.push(key+'_'+i);
    var all = c.getAll(ks), s = '';
    for(var j=0;j<n;j++){ var part = all[key+'_'+j]; if(part == null) return null; s += part; }
    return JSON.parse(s);
  }catch(e){ return null; }
}
var _DV = null;   /* vân tay dữ liệu — tính 1 lần cho mỗi request */
function touchVersion(){
  _DV = null;
  try{ PropertiesService.getScriptProperties().setProperty('DATA_VERSION', String(Date.now())); }catch(e){}
}
function dataVersion(){
  if(_DV) return _DV;
  var stamp='0';
  try{ stamp = PropertiesService.getScriptProperties().getProperty('DATA_VERSION') || '0'; }catch(e){}
  var wr=0, mr=0;
  try{ var w=shWeekly();  if(w) wr=w.getLastRow(); }catch(e){}
  try{ var m=shMonthly(); if(m) mr=m.getLastRow(); }catch(e){}
  _DV = { ok:true, source:SOURCE, v: stamp+'|'+wr+'|'+mr };
  return _DV;
}
/* ══════════════ ⭐ v12.2: TĂNG TỐC MỞ APP — TRIGGER "LÀM ẤM" BỘ NHỚ ĐỆM ══════════════
 * Vấn đề cũ: bộ nhớ đệm chỉ sống 60 giây ⇒ ai mở app sau 1 phút không có người dùng là
 * Google phải đọc lại cả sheet WEEKLY (+ Monthly, Activity, Master) ⇒ chờ 5–15 giây.
 * Thêm nữa, mỗi 5 phút có 1 người "xui" phải chờ luôn việc quét sheet Sales và tự chuyển
 * To Do → In Progress ngay trong lúc mở app.
 * Cách làm mới:
 *   • Trigger warmCache chạy mỗi 10 phút (06:00–21:00): làm các việc nặng kia + dựng sẵn
 *     gói dữ liệu boot vào bộ nhớ đệm ⇒ người mở app lấy ngay, gần như không đọc sheet.
 *   • Bộ nhớ đệm gắn với "vân tay dữ liệu" nên sống được 6 giờ: có ai sửa qua web, hoặc sửa
 *     thẳng trên sheet (trigger onChange / hoặc warmCache so sánh nội dung) là vân tay đổi
 *     ⇒ tự đọc bản mới. Không bao giờ hiện dữ liệu cũ quá 10 phút.
 * Trigger TỰ CÀI ở lần mở app đầu tiên; có thể chạy tay hàm installSpeedTrigger cho chắc. */
var CACHE_LONG = 21600;           /* 6 giờ — mức tối đa của CacheService */
function warmActive(){
  try{
    var c = CacheService.getScriptCache(), hit = c.get('warm_on');
    if(hit) return hit === '1';
    var at = +(PropertiesService.getScriptProperties().getProperty('WARM_AT') || 0);
    var on = (Date.now() - at) < 13*3600*1000;          /* trigger còn chạy trong 13 giờ qua (tính cả đêm nghỉ) */
    c.put('warm_on', on ? '1' : '0', 300);
    return on;
  }catch(e){ return false; }
}
function cacheTtl(){ return warmActive() ? CACHE_LONG : CACHE_TTL; }
function buildBootData(weekly){
  return { pics: readPicOptions(weekly), typeOptions: readTypeOptions(), keyTasks: weekly,
           monthly: readMonthly(), activityLog: readActivityLog(dateNDaysAgo(35), '') };
}
/* tự cài trigger (tối đa 1 lần thử / 6 giờ) — web app chạy dưới quyền chủ file nên cài được */
function ensureWarmTrigger(){
  try{
    if(!throttleOk('warm_install', 21600)) return;
    var has = ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction()==='warmCache'; });
    if(!has) ScriptApp.newTrigger('warmCache').timeBased().everyMinutes(10).create();
  }catch(e){}
}
/* ⚠️ CÓ THỂ CHẠY TAY 1 LẦN: chọn hàm installSpeedTrigger → Run (cho chắc chắn trigger đã cài) */
function installSpeedTrigger(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='warmCache') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('warmCache').timeBased().everyMinutes(10).create();
  warmCache(true);
  return 'Đã cài trigger tăng tốc (làm ấm bộ nhớ đệm mỗi 10 phút) cho ' + SOURCE;
}
function warmCache(force){
  var tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  var h = +Utilities.formatDate(new Date(), tz, 'H');
  var props = PropertiesService.getScriptProperties();
  if(force !== true && (h < 6 || h >= 21)){               /* ban đêm: chỉ đánh dấu còn sống, không đọc sheet */
    props.setProperty('WARM_AT', String(Date.now())); return;
  }
  /* 1) các việc nặng trước đây nằm trong lúc mở app */
  var lock = LockService.getScriptLock();
  if(lock.tryLock(10000)){
    try{ autoStartDueTasks(); }catch(e){}
    finally{ lock.releaseLock(); }
  }
  if(typeof _vsSyncSafe === 'function' && SOURCE === 'marketing'){ try{ _vsSyncSafe(); }catch(e){} }
  /* 2) phát hiện sửa thẳng trên sheet mà trigger onChange bỏ lỡ: so "dấu" nội dung */
  _DV = null;
  var weekly = readWeeklyRaw();
  var data = buildBootData(weekly);
  var sig = '';
  try{
    var dg = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify([weekly, data.monthly]));
    sig = Utilities.base64Encode(dg);
  }catch(e){}
  var v0 = dataVersion().v, prev = String(props.getProperty('WARM_SIG') || '');
  var pv = prev.split('#');
  if(sig && pv.length === 2 && pv[0] === v0 && pv[1] !== sig){ touchVersion(); }   /* nội dung đổi mà vân tay chưa đổi */
  _DV = null;
  var v = dataVersion().v;
  if(sig) props.setProperty('WARM_SIG', v + '#' + sig);
  props.setProperty('WARM_AT', String(Date.now()));
  try{ CacheService.getScriptCache().put('warm_on', '1', 300); }catch(e){}
  /* 3) dựng sẵn bộ nhớ đệm cho vân tay hiện tại */
  cPutBig('wk_' + v, weekly, CACHE_LONG);
  cPutBig('boot_' + v, data, CACHE_LONG);
}
/* Trigger tự động: ai xoá/sửa/thêm dòng THẲNG TRÊN GOOGLE SHEET đều được ghi nhận */
/* ══════════════ ⭐ v13.2 (01.10): NGÀY CỦA TASK KHI CHUYỂN SANG COMPLETED ══════════════
 * (thay quy tắc v12.4 "luôn đặt hạn = hôm nay")
 *   · Finish date (Revised L, trống thì Planned K) ở QUÁ KHỨ hoặc HÔM NAY ⇒ GIỮ NGUYÊN,
 *     task hiện đúng ngày finish date đó trên lịch.
 *   · Finish date ở TƯƠNG LAI ⇒ Revised = hôm nay (hoàn thành sớm ⇒ nhảy về ngày hiện tại);
 *     Start ở tương lai ⇒ Start = hôm nay.
 *   · Task chưa có ngày nào ⇒ Revised = hôm nay (để có chỗ trên lịch).
 * Planned Deadline (cột K) không bao giờ bị sửa. Task đã Completed từ trước ⇒ không đóng dấu lại.  */
function stampDone(sh, row, prevStatus){
  try{
    if(/complet/i.test(String(prevStatus||''))) return false;
    var t = todayISO(), d = s2d(t);
    var v = sh.getRange(row, 10, 1, 3).getValues()[0];                  /* J Start · K Planned · L Revised */
    var st = String(d2s(v[0])).slice(0,10), pl = String(d2s(v[1])).slice(0,10), rv = String(d2s(v[2])).slice(0,10);
    var eff = rv || pl;
    if(!st && !eff){ if(!FORMULA_COLS[12]) sh.getRange(row, 12).setValue(d); return true; }
    if(eff && eff > t && !FORMULA_COLS[12]) sh.getRange(row, 12).setValue(d);   /* xong sớm hơn hạn */
    if(st && st > t && !FORMULA_COLS[10]) sh.getRange(row, 10).setValue(d);     /* xong sớm hơn ngày bắt đầu */
    return true;
  }catch(e){ return false; }
}
/* ══════════════ ⭐ v13: TASK COMPLETED KHÔNG ĐƯỢC NẰM Ở NGÀY TƯƠNG LAI ══════════════
 * stampDone chỉ chạy lúc task VỪA chuyển sang Completed. Còn lọt các trường hợp:
 *   ① task đã Completed rồi, sau đó sửa ngày bắt đầu / hạn sang tương lai;
 *   ② thêm task mới với trạng thái Completed nhưng ngày ở tương lai;
 *   ③ dữ liệu cũ (trước v12.4) hoặc sửa thẳng trên sheet khi chưa cài trigger.
 * ⇒ clampDoneFuture: dòng nào đang Completed mà Start (J) > hôm nay → Start = hôm nay;
 *    hạn hiệu lực (Revised L, nếu trống thì Planned K) > hôm nay → Revised = hôm nay.
 *    Ngày ở quá khứ giữ nguyên (task hoàn thành từ trước vẫn đúng ngày cũ).            */
function clampDoneFuture(sh, row){
  try{
    var v = sh.getRange(row, 10, 1, 5).getValues()[0];          /* J..N */
    if(!/complet/i.test(String(v[4]||''))) return false;
    var t = todayISO(), d = s2d(t), ch = false;
    var st = String(d2s(v[0])).slice(0,10), pl = String(d2s(v[1])).slice(0,10), rv = String(d2s(v[2])).slice(0,10);
    if(st && /^\d{4}-/.test(st) && st > t && !FORMULA_COLS[10]){ sh.getRange(row, 10).setValue(d); ch = true; }
    var eff = rv || pl;
    if(eff && /^\d{4}-/.test(eff) && eff > t && !FORMULA_COLS[12]){ sh.getRange(row, 12).setValue(d); ch = true; }
    return ch;
  }catch(e){ return false; }
}
/* quét cả sheet — dọn các dòng Completed còn nằm ở tương lai (chạy kèm autoStartDueTasks, tối đa 1 lần / 5 phút).
   Có thể chạy tay 1 lần trong Apps Script: chọn hàm healFutureDone → Run. */
function healFutureDone(){
  var sh = shWeekly(); if(!sh) return 0;
  var last = sh.getLastRow(); if(last < WEEKLY_DATA_ROW) return 0;
  var v = sh.getRange(WEEKLY_DATA_ROW, 10, last - WEEKLY_DATA_ROW + 1, 5).getValues();
  var t = todayISO(), d = s2d(t), n = 0;
  for(var i=0;i<v.length;i++){
    if(!/complet/i.test(String(v[i][4]||''))) continue;
    var row = WEEKLY_DATA_ROW + i;
    var st = String(d2s(v[i][0])).slice(0,10), pl = String(d2s(v[i][1])).slice(0,10), rv = String(d2s(v[i][2])).slice(0,10);
    if(st && /^\d{4}-/.test(st) && st > t && !FORMULA_COLS[10]){ sh.getRange(row, 10).setValue(d); n++; }
    var eff = rv || pl;
    if(eff && /^\d{4}-/.test(eff) && eff > t && !FORMULA_COLS[12]){ sh.getRange(row, 12).setValue(d); n++; }
  }
  if(n) touchVersion();
  return n;
}
/* sửa thẳng ô Status trên Google Sheet → cũng áp dụng quy tắc trên (cần trigger onEdit — hàm installTriggers) */
function doneStampOnEdit(e){
  if(!e || !e.range) return;
  var rg = e.range, sh = rg.getSheet(), w = shWeekly();
  if(!w || sh.getSheetId() !== w.getSheetId()) return;
  var c1 = rg.getColumn(), c2 = c1 + rg.getNumColumns() - 1;
  if(c1 > 14 || c2 < 10) return;                             /* ⭐ v13: sửa cột ngày J..L cũng kiểm tra */
  var r1 = Math.max(rg.getRow(), WEEKLY_DATA_ROW), r2 = rg.getRow() + rg.getNumRows() - 1;
  if(r2 < r1 || r2 - r1 > 200) return;
  if(c1 > 14 || c2 < 14){                                    /* chỉ sửa ngày (không đụng Status) */
    for(var q=r1;q<=r2;q++) clampDoneFuture(sh, q);
    return;
  }
  /* trạng thái TRƯỚC khi sửa: lấy từ bộ nhớ đệm của vân tay hiện tại (chưa đổi), hoặc e.oldValue */
  var prev = {};
  try{
    var old = cGetBig('wk_' + dataVersion().v);
    (old||[]).forEach(function(k){ prev[k.row] = k.status; (k.subs||[]).forEach(function(x){ prev[x.row] = x.status; }); });
  }catch(err){}
  var single = (r1 === r2 && rg.getNumColumns() === 1);
  var sts = sh.getRange(r1, 14, r2 - r1 + 1, 1).getValues();
  for(var i=0;i<sts.length;i++){
    var row = r1 + i, now = String(sts[i][0]||'');
    if(!/complet/i.test(now)) continue;
    var before = single && e.oldValue !== undefined ? String(e.oldValue||'') : prev[row];
    /* không biết trạng thái cũ → không đóng dấu "hoàn thành hôm nay", nhưng vẫn chặn ngày tương lai */
    if(before !== undefined && stampDone(sh, row, before)){
      if(pct100(sh.getRange(row,15).getValue()) < 100 && !FORMULA_COLS[15]) sh.getRange(row, 15).setValue(pctToCell(100));
      try{ syncKeyRollup(sh, String(sh.getRange(row,2).getValue()||'')); }catch(err){}
    }
    clampDoneFuture(sh, row);                                  /* ⭐ v13 */
  }
}
function onChangeTouch(e){
  try{ doneStampOnEdit(e); }catch(err){}   /* ⭐ v12.4 — chạy TRƯỚC khi đổi vân tay (cần trạng thái cũ) */
  touchVersion();
}
/* ⚠️ CHẠY TAY 1 LẦN trong Apps Script (chọn hàm installTriggers → Run) để bật cập nhật real-time */
function installTriggers(){
  var book = ss();
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='onChangeTouch') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onChangeTouch').forSpreadsheet(book).onChange().create();
  ScriptApp.newTrigger('onChangeTouch').forSpreadsheet(book).onEdit().create();
  try{ installSpeedTrigger(); }catch(e){}                     /* ⭐ v12.2 */
  touchVersion();
  return 'Đã cài trigger cập nhật real-time cho ' + SOURCE;
}
function logActivity(pic, type, detail, keyTask, subNo){
  touchVersion();   /* ⭐ v5.11: mọi thao tác ghi qua web cũng bump vân tay */
  try{
    var s=activitySheet();
    s.appendRow([ new Date().toISOString(), String(pic||''), String(type||''), String(detail||''), String(keyTask||''), String(subNo||'') ]);
  }catch(e){}
}
function clearActivityLog(user, p){
  if(String(p.pass||'')!=='1234') return { ok:false, error:'Sai mật khẩu' };
  var s=ss().getSheetByName(ACTIVITY_SHEET);
  if(!s) return { ok:true, message:'Không có lịch sử để xóa' };
  var last=s.getLastRow();
  if(last>1) s.deleteRows(2, last-1);
  return { ok:true, message:'Đã xóa sạch lịch sử thông báo' };
}
function readActivityLog(fromISO, toISO){
  var s=ss().getSheetByName(ACTIVITY_SHEET);
  if(!s) return [];
  var last=s.getLastRow(); if(last<2) return [];
  var vals=s.getRange(2,1,last-1,6).getValues();
  var out=[];
  for(var i=0;i<vals.length;i++){
    var v=vals[i];
    var ts=String(v[0]||''); if(!ts) continue;
    var day=ts.slice(0,10);
    if(fromISO && day<fromISO) continue;
    if(toISO && day>toISO) continue;
    out.push({ ts:ts, time:ts, pic:String(v[1]||''), type:String(v[2]||''), detail:String(v[3]||''), keyTask:String(v[4]||''), subNo:String(v[5]||'') });
  }
  out.sort(function(a,b){ return a.ts<b.ts?1:-1; });
  return out;
}

/* ══════════════ SHEET HELPERS ══════════════ */
/* ══════════════ ⭐ v5.12: KHOÁ SHEET THEO GID (KHÔNG SỢ ĐỔI TÊN SHEET) ══════════════
 * Trước đây sheet chỉ được tìm theo TÊN → ai đổi tên sheet là hệ thống gãy.
 * Nay:  ① tìm theo GID (mã sheet lấy từ URL — KHÔNG bao giờ đổi kể cả khi đổi tên)
 *       ② nếu sheet bị xoá / GID không còn → tự tìm lại THEO TÊN, không phân biệt hoa-thường,
 *          theo đúng thứ tự ưu tiên (vd "Weekly new" trước "Weekly", "MONTH" trước "Monthly").
 *       ③ cuối cùng mới thử khớp gần đúng (tên có chứa từ khoá).                        */
var SS_ID      = '14xyRkzhpTLy0IbTzgFx2pobzgNN9TdYUGtOuSW0rrw8';                      // ID bảng tính (lấy từ URL)
var GID_WEEKLY = 1713682543;
var GID_MONTHLY= 1490081555;
var GID_MASTER = 973490355;
var NAMES_WEEKLY  = ['Weekly new','Weeky new','Weekyly new','Weekly','Weeky'];   // ưu tiên từ trái sang phải
var NAMES_MONTHLY = ['MONTH','Monthly'];
var NAMES_MASTER  = ['Master','Master name'];

function ss(){
  try{
    if(SS_ID) return SpreadsheetApp.openById(SS_ID);
  }catch(e){}
  return SpreadsheetApp.getActiveSpreadsheet();   // dự phòng: bảng tính đang gắn script
}
var _SH_CACHE = {};
function resolveSheet(key, gid, names){
  if(_SH_CACHE[key]) return _SH_CACHE[key];
  var all = ss().getSheets(), i, j, sh=null;
  /* ① theo GID */
  if(gid){
    for(i=0;i<all.length;i++){ if(all[i].getSheetId()===gid){ sh=all[i]; break; } }
  }
  /* ② theo TÊN (không phân biệt hoa-thường), đúng thứ tự ưu tiên */
  if(!sh){
    for(j=0;j<names.length && !sh;j++){
      var want=String(names[j]).trim().toLowerCase();
      for(i=0;i<all.length;i++){
        if(String(all[i].getName()).trim().toLowerCase()===want){ sh=all[i]; break; }
      }
    }
  }
  /* ③ khớp gần đúng (tên CHỨA từ khoá) — vẫn theo thứ tự ưu tiên */
  if(!sh){
    for(j=0;j<names.length && !sh;j++){
      var key2=String(names[j]).trim().toLowerCase();
      for(i=0;i<all.length;i++){
        if(String(all[i].getName()).trim().toLowerCase().indexOf(key2)>=0){ sh=all[i]; break; }
      }
    }
  }
  if(sh) _SH_CACHE[key]=sh;
  return sh;
}
/* Kiểm tra nhanh: mở <URL /exec>?action=sheets → xem app đang đọc ĐÚNG sheet nào */
function sheetInfo(){
  function info(sh, gid){
    if(!sh) return { found:false, expectedGid:gid };
    return { found:true, name:sh.getName(), gid:sh.getSheetId(),
             matchedBy:(sh.getSheetId()===gid ? 'GID' : 'TÊN (GID cũ không còn)'),
             lastRow:sh.getLastRow() };
  }
  return { ok:true, source:SOURCE, spreadsheetId:SS_ID,
           allSheets: ss().getSheets().map(function(s){ return s.getName()+' (gid '+s.getSheetId()+')'; }),
           weekly: info(shWeekly(), GID_WEEKLY),
           monthly:info(shMonthly(), GID_MONTHLY),
           master: info(shMaster(),  GID_MASTER) };
}
function shWeekly(){  return resolveSheet('w', GID_WEEKLY,  NAMES_WEEKLY);  }
function shMonthly(){ return resolveSheet('m', GID_MONTHLY, NAMES_MONTHLY); }
function shMaster(){  return resolveSheet('x', GID_MASTER,  NAMES_MASTER);  }
/* Marketing: Type Task ở Master cột D (col 4), từ hàng 3 */
function readTypeOptions(){
  try{
    var ms = shMaster();
    if(!ms) return TYPE_OPTIONS;
    var last = ms.getLastRow();
    if(last < 3) return TYPE_OPTIONS;
    var vals = ms.getRange(3, 4, last-3+1, 1).getValues();
    var out = [];
    vals.forEach(function(r){ var v=String(r[0]||'').trim(); if(v && out.indexOf(v)<0) out.push(v); });
    return out.length ? out : TYPE_OPTIONS;
  }catch(e){ return TYPE_OPTIONS; }
}
function d2s(v){
  if(v instanceof Date){ return Utilities.formatDate(v, ss().getSpreadsheetTimeZone(), 'yyyy-MM-dd'); }
  return v == null ? '' : String(v);
}
function s2d(s){
  if(!s) return '';
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if(m) return new Date(+m[1], +m[2]-1, +m[3]);
  return s;
}
function pct100(v){
  if(v===''||v==null) return 0;
  if(typeof v==='number'){
    var nn = (v>0 && v<=1) ? Math.round(v*100) : Math.round(v);
    if(nn<0)nn=0; if(nn>100)nn=100; return nn;
  }
  var str=String(v).trim();
  var m=/^(-?\d+(?:\.\d+)?)\s*%?$/.exec(str);
  var n;
  if(m){ n=parseFloat(m[1]); if(n>0 && n<=1 && /\./.test(m[1])) n=n*100; }
  else { n=parseFloat(str.replace(/[^\d.\-]/g,'')); }
  if(isNaN(n)) n=0;
  n=Math.round(n);
  if(n<0)n=0; if(n>100)n=100;
  return n;
}
function pctToCell(v){ var n=pct100(v); return n/100; }
/* ⭐ Màu theo mức % — dùng chung email + PDF */
function progColor(p){
  p=Math.max(0,Math.min(100,Math.round(p||0)));
  if(p>=100) return '#1E9E5A';
  if(p>=75)  return '#3FA64B';
  if(p>=50)  return '#3A5CAA';
  if(p>=25)  return '#E08A00';
  return '#D9433F';
}

/* ══════════════ READ WEEKLY ══════════════ */
function readWeeklyRaw(){
  var sh = shWeekly();
  if(!sh) return [];
  var last = sh.getLastRow();
  if(last < WEEKLY_DATA_ROW) return [];
  var _vk = _vsColKey(), _vm = _vsColMeta();                    /* ⭐ v9 */
  var _vw = Math.min(24, sh.getMaxColumns()) - 1;               /* ⭐ v11: đọc tới cột X (cờ lịch công tác) */
  var rng = sh.getRange(WEEKLY_DATA_ROW, 2, last - WEEKLY_DATA_ROW + 1, _vw).getValues();
  var keys = [];
  var byPrefix = {};
  for(var i=0;i<rng.length;i++){
    var r = rng[i];
    var rowIndex = WEEKLY_DATA_ROW + i;
    var _f = String(r[4]||'').trim();
    var _g = String(r[5]||'').trim();
    if(!_f && !_g) continue;
    var no = normNo(r[0]);
    /* ⭐ v10: dòng CÓ nội dung nhưng cột No trống (thường do công thức cột B không kéo
       xuống tới dòng mới) — trước đây bị BỎ QUA ⇒ task vừa thêm "biến mất" trên web,
       người dùng bấm thêm lại ⇒ sheet có 2–3 dòng trùng. Nay tự vá rồi đọc lại. */
    if(!no) continue;
    var obj = rowToObj(r, rowIndex, no, _vk, _vm);
    var isKey = no.indexOf('.') < 0;
    if(isKey){
      obj.subs = []; keys.push(obj); byPrefix[no] = obj;
    } else {
      var prefix = no.split('.')[0];
      obj.parentNo = prefix; obj.name = obj.subTask;
      if(byPrefix[prefix]){
        if(!obj.type) obj.type = byPrefix[prefix].type || '';
        byPrefix[prefix].subs.push(obj);
      } else {
        var virt = { row:0, no:prefix, keyTask:'(Key '+prefix+')', subs:[obj], pic:obj.pic, fy:obj.fy, month:obj.month, type:obj.type, status:'', progress:0 };
        keys.push(virt); byPrefix[prefix]=virt;
      }
    }
  }
  /* ⭐ v10.2: hàm ĐỌC tuyệt đối không ghi sheet (bản 10.0 tự vá ở đây ⇒ mỗi lần mở web
     phải vá hàng loạt dòng ⇒ quá 30 giây). Dòng thiếu số No chỉ được vá khi THÊM MỚI,
     hoặc chạy tay hàm healMissingNo trong Apps Script. */
  return keys;
}
/* ⭐ v10.2: đọc qua BỘ NHỚ ĐỆM — dữ liệu chỉ đọc lại từ sheet khi "vân tay" thay đổi
   (có người sửa qua web / sửa thẳng trên sheet nếu đã cài trigger) hoặc sau 60 giây. */
function readWeekly(){
  var key = 'wk_' + dataVersion().v;
  var hit = cGetBig(key);
  if(hit) return hit;
  var r = readWeeklyRaw();
  cPutBig(key, r, cacheTtl());
  return r;
}
function normNo(v){
  var no = String(v==null?'':v).trim();
  if(/^\d+\.0$/.test(no)) no = no.replace(/\.0$/,'');
  return no;
}
/* ⭐ v10: 1 dòng sheet → object task (dùng chung cho readWeekly và kết quả trả về sau khi thêm) */
function rowToObj(r, rowIndex, no, _vk, _vm){
  var o = {
    row: rowIndex, no: no,
    fy: String(r[1]||''),
    month: String(r[2]||'').replace(/\D/g,'').slice(0,6),
    type: String(r[3]||''),
    keyTask: String(r[4]||''),
    subTask: String(r[5]||''),
    pic: String(r[6]||''),
    result: String(r[7]||''),
    start: d2s(r[8]),
    planned: d2s(r[9]),
    revised: d2s(r[10]),
    leadtime: r[11]==null?'':String(r[11]),
    status: String(r[12]||''),
    progress: pct100(r[13]),
    actual: d2s(r[14]),
    priority: (r[15]===true || String(r[15]).toLowerCase()==='true' || r[15]==='⭐'),
    priorityMailAt: d2s(r[16]),
    vSrc:  String(r[_vk - 2] || '').trim(),
    vMeta: (function(){ try { return JSON.parse(String(r[_vm - 2] || '') || 'null'); }
                        catch(e){ return null; } })()
  };
  return tripFlagInto(o, r);
}
/* ⭐ v11: dòng do đồng bộ LỊCH CÔNG TÁC tạo ra (cột W = "trip"/"trip-key", cột X = JSON) → chỉ đọc trên web */
function tripFlagInto(o, r){
  var f = String(r[21]==null?'':r[21]).trim();
  if(/^trip/.test(f)){
    o.vSrc = f;
    try{ o.vMeta = JSON.parse(String(r[22]||'') || 'null'); }catch(e){ o.vMeta = null; }
  }
  return o;
}

function readRowObj(sh, row){
  var _vk = _vsColKey(), _vm = _vsColMeta();
  var _vw = Math.min(24, sh.getMaxColumns()) - 1;
  var r = sh.getRange(row, 2, 1, _vw).getValues()[0];
  var o = rowToObj(r, row, normNo(r[0]), _vk, _vm);
  if(o.no.indexOf('.')>0){ o.parentNo=o.no.split('.')[0]; o.name=o.subTask; } else { o.subs=[]; }
  return o;
}

/* ══════════════ ⭐ v10: TỰ VÁ CỘT CÔNG THỨC CHO DÒNG MỚI ══════════════
   Khi web thêm dòng mới (cuối bảng hoặc chèn giữa block), công thức ở các cột
   B (No), C (FY), D (Month), M (Leadtime), P (Actual), Q (Behavior) KHÔNG tự kéo xuống.
   ⇒ Copy công thức của dòng gần nhất phía trên (tương đối theo dòng).
   Nếu cột dùng ARRAYFORMULA thì bỏ qua (công thức mảng tự tính). Nếu cột No vẫn trống
   (sheet không có công thức) ⇒ ghi thẳng số No để web luôn nhìn thấy task. */
var _ARR_COLS = null;
function colIsArray(sh, col){
  if(!_ARR_COLS){
    _ARR_COLS = {};
    try{
      var f = sh.getRange(1, 2, WEEKLY_DATA_ROW, 16).getFormulas();          /* B..Q, 1 lần đọc */
      for(var i=0;i<f.length;i++) for(var j=0;j<f[i].length;j++)
        if(/ARRAYFORMULA|BYROW\(|MAP\(|SCAN\(/i.test(String(f[i][j]||''))) _ARR_COLS[j+2] = true;
    }catch(e){}
  }
  return !!_ARR_COLS[col];
}
/* ⭐ v10.2: đọc gộp 1 lần (trước: ~24 lần gọi sheet cho mỗi dòng mới) */
function ensureRowFormulas(sh, row){
  try{
    var from = Math.max(WEEKLY_DATA_ROW, row - 40);
    if(row - from < 1) return;
    var fr = sh.getRange(from, 2, row - from + 1, 16).getFormulasR1C1();   /* B..Q */
    var cur = fr[fr.length - 1];
    var disp = sh.getRange(row, 2, 1, 16).getDisplayValues()[0];
    [2,3,4,13,16,17].forEach(function(c){
      var ix = c - 2;
      if(colIsArray(sh, c) || cur[ix] || String(disp[ix]||'') !== '') return;
      for(var i=fr.length-2;i>=0;i--){ if(fr[i][ix]){ sh.getRange(row, c).setFormulaR1C1(fr[i][ix]); return; } }
    });
  }catch(e){}
}
function computeNoFor(sh, row){
  var f = String(sh.getRange(row, 6).getValue()||'').trim();
  if(f) return String(nextKeyNo(sh));
  if(row <= WEEKLY_DATA_ROW) return String(nextKeyNo(sh));
  var vals = sh.getRange(WEEKLY_DATA_ROW, 2, row - WEEKLY_DATA_ROW, 1).getValues();
  var keyNo = '';
  for(var i=vals.length-1;i>=0;i--){ var s=normNo(vals[i][0]); if(s && s.indexOf('.')<0){ keyNo=s; break; } }
  if(!keyNo) return String(nextKeyNo(sh));
  var info = keyBlockInfo(sh, keyNo);
  return keyNo + '.' + (info.maxSub + 1);
}
/* Đảm bảo dòng có số No. Trả về số No cuối cùng. */
function ensureRowNo(sh, row, wantNo){
  ensureRowFormulas(sh, row);
  SpreadsheetApp.flush();
  var cell = sh.getRange(row, 2);
  var no = normNo(cell.getValue());
  if(no) return no;
  if(colIsArray(sh, 2)) return '';             /* công thức mảng tự tính — không được ghi đè */
  /* công thức (copy xuống hoặc có sẵn) vẫn ra ô trống ⇒ ghi thẳng số No để task luôn hiện */
  no = wantNo || computeNoFor(sh, row);
  if(no.indexOf('.') > 0){ cell.setNumberFormat('@'); cell.setValue(no); }
  else cell.setValue(parseInt(no, 10));
  return no;
}
/* Vá mọi dòng có nội dung mà cột No trống. Có thể chạy tay 1 lần trong Apps Script. */
function healMissingNo(rows){
  var sh = shWeekly(); if(!sh) return 0;
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(8000)) return 0;
  var n = 0;
  try{
    if(!rows){
      rows = [];
      var last = sh.getLastRow();
      if(last >= WEEKLY_DATA_ROW){
        var v = sh.getRange(WEEKLY_DATA_ROW, 2, last-WEEKLY_DATA_ROW+1, 6).getValues();
        for(var i=0;i<v.length;i++){
          if(!normNo(v[i][0]) && (String(v[i][4]||'').trim() || String(v[i][5]||'').trim())) rows.push(WEEKLY_DATA_ROW+i);
        }
      }
    }
    rows.forEach(function(r){ if(ensureRowNo(sh, r)) n++; });
    if(n){ SpreadsheetApp.flush(); touchVersion(); }
  } finally { try{ lock.releaseLock(); }catch(e){} }
  return n;
}

/* ══════════════ READ MONTHLY — MARKETING LAYOUT ══════════════
 * B=No | C=FY | D=Month | E=Type Task | F=Key task | G=Plan-Result | H=PIC */
function readMonthly(){
  var sh = shMonthly();
  if(!sh) return [];
  var last = sh.getLastRow();
  if(last < MONTHLY_DATA_ROW) return [];
  var rng = sh.getRange(MONTHLY_DATA_ROW, 2, last - MONTHLY_DATA_ROW + 1, 7).getValues();
  var rows = [];
  for(var i=0;i<rng.length;i++){
    var r = rng[i];
    var key = String(r[4]||'').trim();
    var type = String(r[3]||'').trim();
    if(!key && !type) continue;
    var txt = String(r[5]||'');
    rows.push({
      row: MONTHLY_DATA_ROW + i,
      no: String(r[0]==null?'':r[0]),
      fy: String(r[1]||''),
      month: String(r[2]||'').replace(/[^0-9]/g,'').slice(0,6),
      typeTask: type, type: type,
      keyTask: key, title: key,
      text: txt, content: txt,
      pic: String(r[6]||'')
    });
  }
  return rows;
}

/* ══════════════ CỘT CÔNG THỨC (WEEKLY) ══════════════ */
var FORMULA_COLS = { 2:true, 3:true, 4:true, 13:true, 16:true, 17:true };
function setIfWritable(sh, row, col, val){ if(FORMULA_COLS[col]) return; sh.getRange(row, col).setValue(val); }

/* ══════════════ UPDATE WEEKLY ROW ══════════════ */
/* ══════════════ ⭐ v10.1: XÁC ĐỊNH ĐÚNG DÒNG KHI SỐ No ĐÃ ĐỔI ══════════════
   Xoá 1 task ở giữa sheet ⇒ công thức cột No đánh lại số, các task phía dưới lùi 1 số.
   Web lúc đó vẫn cầm số CŨ ⇒ lệnh tiếp theo có thể trúng NHẦM task khác.
   Nay web gửi kèm tên task ("expect"). Backend kiểm tra dòng theo số No có đúng tên đó không;
   sai ⇒ tìm dòng mang đúng tên (ưu tiên dòng gần vị trí cũ nhất); không thấy ⇒ từ chối, KHÔNG ghi. */
function _normTxt(s){ return String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase(); }
function _rowTxt(v){ return _normTxt(v[1]) || _normTxt(v[0]); }      // v = [F, G]
function resolveRow(sh, p){
  var no = String(p.no||'').trim();
  if(!no) return parseInt(p.row,10) || 0;
  var row = rowByNo(sh, no);
  var exp = _normTxt(p.expect);
  if(!exp) return row;
  if(row){ if(_rowTxt(sh.getRange(row, 6, 1, 2).getValues()[0]) === exp) return row; }
  var last = sh.getLastRow(); if(last < WEEKLY_DATA_ROW) return 0;
  var vals = sh.getRange(WEEKLY_DATA_ROW, 6, last-WEEKLY_DATA_ROW+1, 2).getValues();
  var ref = row || parseInt(p.row,10) || 0, best = 0, bd = 1e9;
  for(var i=0;i<vals.length;i++){
    if(_rowTxt(vals[i]) !== exp) continue;
    var r = WEEKLY_DATA_ROW + i, d = ref ? Math.abs(r - ref) : i;
    if(d < bd){ bd = d; best = r; }
  }
  return best;
}
var STALE_MSG = ' — dữ liệu trên sheet vừa thay đổi (số thứ tự đã đánh lại). Web đã tải lại, vui lòng thao tác lại.';
function rowByNo(sh, no){
  no=String(no||'').trim(); if(!no) return 0;
  var last=sh.getLastRow();
  if(last<WEEKLY_DATA_ROW) return 0;
  var vals=sh.getRange(WEEKLY_DATA_ROW,2,last-WEEKLY_DATA_ROW+1,1).getValues();
  var norm=function(s){ s=String(s==null?'':s).trim(); return /^\d+\.0$/.test(s)?s.replace(/\.0$/,''):s; };
  for(var i=0;i<vals.length;i++){ if(norm(vals[i][0])===no) return WEEKLY_DATA_ROW+i; }
  return 0;
}
function updateWeeklyRow(user, p){
  var sh = shWeekly();
  var row = resolveRow(sh, p);                              /* ⭐ v10.1 */
  if(!row) return { ok:false, stale:true, error:'Không tìm thấy task '+(p.no||p.row||'')+STALE_MSG };
  var pic = String(sh.getRange(row, 8).getValue()||'');
  if(_vsLocked(sh, row)) return { ok:false, error:_vsMsg() };   /* ⭐ v9 */
  if(!canEditPic(user, pic)) return { ok:false, error:'Bạn chỉ được sửa task của mình ('+pic+' không phải bạn).' };
  var _prevSt = String(sh.getRange(row,14).getValue()||'');   /* ⭐ v12.4: trạng thái TRƯỚC khi sửa */
  var u = p.updates;
  if(typeof u === 'string'){ try{ u = JSON.parse(u); }catch(e){ u = null; } }
  u = u || {
    name:p.name, pic:p.pic, status:p.status, progress:p.progress,
    start:p.start, revised:p.revised, planned:p.planned, result:p.result,
    keyTask:p.keyTask, type:p.type
  };
  var COL = { result:9, start:10, planned:11, revised:12, status:14, progress:15,
              pic:8, keyTask:6, subTask:7, type:5, name:7 };
  Object.keys(u).forEach(function(k){
    if(u[k]===undefined || u[k]===null) return;
    if(!COL[k]) return;
    if(FORMULA_COLS[COL[k]]) return;
    var val = u[k];
    if(k==='start'||k==='planned'||k==='revised') val = s2d(val);
    if(k==='progress') val = pctToCell(val);
    sh.getRange(row, COL[k]).setValue(val);
  });
  if(u.status){
    if(/complet/i.test(u.status))       sh.getRange(row,15).setValue(pctToCell(100));
    else if(/cancel/i.test(u.status))   sh.getRange(row,15).setValue(pctToCell(0));
    else if(/to\s*do/i.test(u.status))  sh.getRange(row,15).setValue(pctToCell(0));
  }
  if(/complet/i.test(String(sh.getRange(row,14).getValue()||''))){ stampDone(sh, row, _prevSt); clampDoneFuture(sh, row); }   /* ⭐ v12.4 + v13 */
  try{ var _nm=String(sh.getRange(row,7).getValue()||sh.getRange(row,6).getValue()||''); logActivity(user.pic,'update','cập nhật công việc "'+_nm+'"','',String(sh.getRange(row,2).getValue()||'')); }catch(e){}
  var _roll = syncKeyRollup(sh, String(sh.getRange(row,2).getValue()||''));   /* ⭐ v8.1 */
  return { ok:true, message:'Đã cập nhật', keyRollup:_roll };
}
function updateResultOnly(user, p){
  var sh = shWeekly();
  var row = resolveRow(sh, p);                              /* ⭐ v10.1 */
  if(!row) return { ok:false, stale:true, error:'Không tìm thấy task '+(p.no||'')+STALE_MSG };
  var pic = String(sh.getRange(row, 8).getValue()||'');
  if(_vsLocked(sh, row)) return { ok:false, error:_vsMsg() };   /* ⭐ v9 */
  if(!canEditPic(user, pic)) return { ok:false, error:'Bạn chỉ được sửa task của mình.' };
  sh.getRange(row, 9).setValue(String(p.result==null?'':p.result));
  var nm=String(sh.getRange(row,7).getValue()||sh.getRange(row,6).getValue()||'');
  logActivity(user.pic,'update','cập nhật kết quả "'+nm+'"','',String(sh.getRange(row,2).getValue()||''));
  return { ok:true, message:'Đã lưu kết quả' };
}
/* ══════════════ ⭐ v8.1: TỰ TỔNG HỢP % + TRẠNG THÁI CHO KEY TASK ══════════════
   Thanh tiến độ của KEY TASK không nhập tay. Mỗi lần một sub-task đổi %/trạng thái,
   ghi lại vào DÒNG KEY TASK trên sheet:
       % key = trung bình % của các sub-task chưa bị Cancelled
       (Completed = 100%, To Do = 0%, In Progress tối thiểu 25%)
   Ví dụ 4 sub: 100 + 25 + 25 + 0 = 150 / 4 = 37.5 → 38%.
   Toàn bộ sub Completed ⇒ key = 100% và trạng thái Completed.                    */
function syncKeyRollup(sh, anyNo){
  try{
    var no = String(anyNo||'').trim().replace(/\.0$/,'');
    if(!no) return null;
    var keyNo = no.indexOf('.') > 0 ? no.split('.')[0] : no;
    var keyRow = rowByNo(sh, keyNo);
    if(!keyRow) return null;
    var last = sh.getLastRow();
    if(last < WEEKLY_DATA_ROW) return null;
    var vals = sh.getRange(WEEKLY_DATA_ROW, 2, last - WEEKLY_DATA_ROW + 1, 14).getValues(); // B..O
    var pcts = [], sts = [];
    for(var i=0;i<vals.length;i++){
      var n = String(vals[i][0]==null?'':vals[i][0]).trim().replace(/\.0$/,'');
      if(n.indexOf('.') < 0) continue;                 // bỏ dòng key
      if(n.split('.')[0] !== keyNo) continue;          // không thuộc key này
      var st = String(vals[i][12]||'');
      if(/cancel/i.test(st)) continue;                 // sub huỷ → không tính vào mẫu số
      var pc = /complet/i.test(st) ? 100 : pct100(vals[i][13]);
      if(/progress/i.test(st) && pc < 25) pc = 25;
      if(pc < 0) pc = 0; if(pc > 100) pc = 100;
      pcts.push(pc); sts.push(st);
    }
    if(!pcts.length) return null;                      // key không có sub → giữ nguyên
    var sum = 0; pcts.forEach(function(v){ sum += v; });
    var avg = Math.round(sum / pcts.length);
    var allDone = sts.every(function(x){ return /complet/i.test(x); });
    if(allDone) avg = 100;
    var newSt = allDone ? 'Completed' : (avg > 0 ? 'In Progress' : 'To Do');
    if(!FORMULA_COLS[15]) sh.getRange(keyRow, 15).setValue(pctToCell(avg));
    var _kPrev = String(sh.getRange(keyRow,14).getValue()||'');
    if(!FORMULA_COLS[14]) sh.getRange(keyRow, 14).setValue(newSt);
    if(allDone){ stampDone(sh, keyRow, _kPrev); clampDoneFuture(sh, keyRow); }   /* ⭐ v12.4 + v13 */
    return { keyNo:keyNo, progress:avg, status:newSt };
  }catch(e){ return null; }
}
function updateProgressQuick(user, p){
  var sh=shWeekly();
  var row = resolveRow(sh, p);                              /* ⭐ v10.1 */
  if(!row) return { ok:false, stale:true, error:'Không tìm thấy task '+(p.no||'')+STALE_MSG };
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(_vsLocked(sh, row)) return { ok:false, error:_vsMsg() };   /* ⭐ v9 */
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ sửa task của mình.' };
  var newPct=pct100(p.progress);
  sh.getRange(row,15).setValue(pctToCell(p.progress));
  var curStatus=String(sh.getRange(row,14).getValue()||'');
  var newStatus=curStatus;
  if(p.status){ newStatus=p.status; }
  else if(newPct>=100){ newStatus='Completed'; }
  else if(newPct>0 && (/to\s*do/i.test(curStatus)||!curStatus)){ newStatus='In Progress'; }
  if(newStatus!==curStatus) sh.getRange(row,14).setValue(newStatus);
  if(/complet/i.test(newStatus)){ stampDone(sh, row, curStatus); clampDoneFuture(sh, row); }   /* ⭐ v12.4 + v13 */
  var nm=String(sh.getRange(row,7).getValue()||sh.getRange(row,6).getValue()||'');
  var sno=String(sh.getRange(row,2).getValue()||'');
  logActivity(user.pic, 'progress', 'cập nhật tiến độ '+newPct+'% — "'+nm+'"', '', sno);
  var _roll = syncKeyRollup(sh, sno);   /* ⭐ v8.1 */
  return { ok:true, message:'Đã cập nhật %', progress: newPct, status:newStatus, keyRollup:_roll };
}
function updateStatusQuick(user, p){
  var sh=shWeekly();
  var row = resolveRow(sh, p);                              /* ⭐ v10.1 */
  if(!row) return { ok:false, stale:true, error:'Không tìm thấy task '+(p.no||'')+STALE_MSG };
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(_vsLocked(sh, row)) return { ok:false, error:_vsMsg() };   /* ⭐ v9 */
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ sửa task của mình.' };
  var st=String(p.status||'').trim();
  var _prevSt=String(sh.getRange(row,14).getValue()||'');
  sh.getRange(row,14).setValue(st);
  if(/complet/i.test(st)){ stampDone(sh, row, _prevSt); clampDoneFuture(sh, row); }   /* ⭐ v12.4 + v13 */
  var newPct=null;
  if(/complet/i.test(st)){ sh.getRange(row,15).setValue(pctToCell(100)); newPct=100; }
  else if(/cancel/i.test(st)){ sh.getRange(row,15).setValue(pctToCell(0)); newPct=0; }
  else if(/to\s*do/i.test(st)){ sh.getRange(row,15).setValue(pctToCell(0)); newPct=0; }
  else if(/progress/i.test(st)){
    var cur=pct100(sh.getRange(row,15).getValue());
    if(!cur || cur<=0){ sh.getRange(row,15).setValue(pctToCell(25)); newPct=25; }
  }
  var nm=String(sh.getRange(row,7).getValue()||sh.getRange(row,6).getValue()||'');
  var sno=String(sh.getRange(row,2).getValue()||'');
  logActivity(user.pic, /complet/i.test(st)?'complete':'update', (/complet/i.test(st)?'hoàn thành':'đổi trạng thái → '+st)+' — "'+nm+'"', '', sno);
  var _roll = syncKeyRollup(sh, sno);   /* ⭐ v8.1 */
  return { ok:true, message:'Đã đổi trạng thái', status:st, progress:newPct, keyRollup:_roll };
}

/* ══════════════ ADD KEY / SUB ══════════════ */
function addKeyTask(user, p){
  var targetPic = String(p.pic||'').trim() || user.pic;
  if(!canAssignUser(user) && targetPic.toLowerCase() !== String(user.pic||'').toLowerCase()){
    targetPic = user.pic;
  }
  var sh = shWeekly();
  var row = firstEmptyContentRow(sh);
  var wantNo = String(nextKeyNo(sh));
  writeWeekly(sh, row, {
    type:p.type||'', keyTask:p.keyTask||'', subTask:'', pic:targetPic, result:String(p.result||''),
    start:s2d(p.start), planned:s2d(p.planned), revised:'', status:p.status||'To Do',
    progress: statusPct(p.status, p.progress)
  });
  var no = ensureRowNo(sh, row, wantNo) || wantNo;          /* ⭐ v10 */
  clampDoneFuture(sh, row);                                   /* ⭐ v13: thêm mới ở trạng thái Completed */
  logActivity(user.pic, 'add', 'tạo Key Task mới', p.keyTask||'', no);
  var task = null; try{ task = readRowObj(sh, row); }catch(e){}
  return { ok:true, message:'Đã thêm Key Task '+no, no:no, row:row, task:task };
}
function firstEmptyContentRow(sh){
  var last = sh.getLastRow();
  if(last < WEEKLY_DATA_ROW) return WEEKLY_DATA_ROW;
  var n = last - WEEKLY_DATA_ROW + 1;
  var vals = sh.getRange(WEEKLY_DATA_ROW, 5, n, 3).getValues();
  var lastContent = WEEKLY_DATA_ROW - 1;
  for(var j=0;j<vals.length;j++){
    var e=String(vals[j][0]||'').trim();
    var f=String(vals[j][1]||'').trim();
    var g=String(vals[j][2]||'').trim();
    if(e||f||g) lastContent = WEEKLY_DATA_ROW + j;
  }
  var target = lastContent + 1;
  var maxRows = sh.getMaxRows();
  if(target > maxRows){ sh.insertRowsAfter(maxRows, target - maxRows); }
  return target;
}
function nextKeyNo(sh){
  var last=sh.getLastRow(); var max=0;
  if(last>=WEEKLY_DATA_ROW){
    var vals=sh.getRange(WEEKLY_DATA_ROW,2,last-WEEKLY_DATA_ROW+1,1).getValues();
    vals.forEach(function(v){ var s=String(v[0]||''); if(s && s.indexOf('.')<0){ var n=parseInt(s,10); if(!isNaN(n)&&n>max)max=n; } });
  }
  return max+1;
}
function statusPct(status, progress){
  if(/complet/i.test(status)) return 100;
  if(/progress/i.test(status)) return pct100(progress||0);
  return 0;
}
function addSubTask(user, p){
  var parentNo = String(p.parentNo || p.keyNo || p.keyTaskNo || '').trim();
  if(!parentNo) return { ok:false, error:'Thiếu Key Task cha' };
  var sh = shWeekly();
  if(!canAssignUser(user)){
    if(String(p.pic||'').toLowerCase() !== user.pic.toLowerCase())
      p.pic = user.pic;
  }
  if(p.expectKey){                                             /* ⭐ v10.1: số key có thể đã đổi */
    var kr = resolveRow(sh, { no:parentNo, expect:p.expectKey });
    if(!kr) return { ok:false, stale:true, error:'Không tìm thấy Key Task '+parentNo+STALE_MSG };
    parentNo = normNo(sh.getRange(kr,2).getValue()) || parentNo;
  }
  var info = keyBlockInfo(sh, parentNo);
  if(!info.keyRow) return { ok:false, error:'Không tìm thấy Key Task '+parentNo };
  var subNo = parentNo + '.' + (info.maxSub+1);
  var insertAfter = info.lastRow;
  var maxRows = sh.getMaxRows();
  if(insertAfter >= maxRows){ sh.insertRowsAfter(maxRows, insertAfter - maxRows + 2); }
  sh.insertRowsAfter(insertAfter, 1);
  var row = insertAfter + 1;
  writeWeekly(sh, row, {
    type:'', keyTask:'', subTask:p.name||'', pic:p.pic||'', result:String(p.result||''),
    start:s2d(p.start), planned:s2d(p.planned), revised:'', status:p.status||'To Do',
    progress: statusPct(p.status, p.progress)
  });
  var subNoActual = ensureRowNo(sh, row, subNo) || subNo;   /* ⭐ v10 */
  clampDoneFuture(sh, row);                                   /* ⭐ v13 */
  logActivity(user.pic, 'add', 'thêm sub-task "'+(p.name||'')+'"', p.parentKeyTask||'', subNoActual);
  var roll = syncKeyRollup(sh, subNoActual);
  var task = null; try{ task = readRowObj(sh, row); }catch(e){}
  return { ok:true, message:'Đã thêm Sub Task '+subNoActual, no:subNoActual, row:row, task:task, keyRollup:roll };
}
function keyBlockInfo(sh, parentNo){
  var last=sh.getLastRow();
  if(last < WEEKLY_DATA_ROW) return { keyRow:0, lastRow:0, subCount:0, maxSub:0 };
  var vals=sh.getRange(WEEKLY_DATA_ROW,2,last-WEEKLY_DATA_ROW+1,1).getValues();
  var norm=function(s){ s=String(s==null?'':s).trim(); return /^\d+\.0$/.test(s)?s.replace(/\.0$/,''):s; };
  var keyRow=0, lastRow=0, subCount=0, maxSub=0, seen=false;
  for(var i=0;i<vals.length;i++){
    var s=norm(vals[i][0]);
    var r=WEEKLY_DATA_ROW+i;
    if(s===parentNo){ keyRow=r; lastRow=r; seen=true; continue; }
    if(seen){
      if(s.indexOf(parentNo+'.')===0){
        subCount++; lastRow=r;
        var idx=parseInt(s.split('.')[1],10); if(!isNaN(idx)&&idx>maxSub) maxSub=idx;
      }
      else if(s && s.indexOf('.')<0){ break; }
    }
  }
  return { keyRow:keyRow, lastRow:lastRow||keyRow, subCount:subCount, maxSub:maxSub };
}
/* ══════════════ ⭐ v13: CHUYỂN SUB TASK SANG KEY TASK KHÁC ══════════════
 * Dùng khi lỡ thêm sub-task vào nhầm key task. Web gửi:
 *   no / expect          : số No + tên sub-task cần chuyển (kiểm tra đúng dòng như v10.1)
 *   targetNo / expectKey : key task đích (số No + tên)            — HOẶC —
 *   newKey               : { keyTask, type, pic } ⇒ tạo key task mới ở cuối bảng rồi chuyển vào
 * Cách làm: chèn 1 dòng mới ở cuối block key đích, chép toàn bộ ô dữ liệu (không chép ô công thức)
 * của dòng sub cũ sang, rồi xoá dòng cũ. Cột No / FY / Month… do công thức tự tính lại.
 * Sau đó tính lại % + trạng thái của CẢ key cũ lẫn key mới (syncKeyRollup). */
function moveSubTask(user, p){
  var sh = shWeekly(); if(!sh) return { ok:false, error:'Không tìm thấy sheet' };
  var srcRow = resolveRow(sh, { no:p.no, expect:p.expect, row:p.row });
  if(!srcRow) return { ok:false, stale:true, error:'Không tìm thấy sub-task '+(p.no||'')+STALE_MSG };
  var srcNo = normNo(sh.getRange(srcRow, 2).getValue());
  if(!srcNo || srcNo.indexOf('.') < 0) return { ok:false, error:'Chỉ chuyển được sub-task (dòng này là Key Task).' };
  var subPic = String(sh.getRange(srcRow, 8).getValue()||'');
  if(!canEditPic(user, subPic)) return { ok:false, error:'Bạn chỉ chuyển được sub-task của mình ('+subPic+').' };
  if(_vsLocked(sh, srcRow)) return { ok:false, error:_vsMsg() };
  if(typeof rhxIsTripRow === 'function' && rhxIsTripRow(sh, srcRow)) return { ok:false, error:(typeof RHX_LOCK_MSG!=='undefined'?RHX_LOCK_MSG:'Dòng lịch công tác — không chuyển được.') };
  var oldKeyNo = srcNo.split('.')[0];
  var oldKeyRow = rowByNo(sh, oldKeyNo);
  var oldKeyName = oldKeyRow ? String(sh.getRange(oldKeyRow, 6).getValue()||'') : '';
  var subName = String(sh.getRange(srcRow, 7).getValue()||'');

  /* ── 1) xác định key đích (hoặc tạo mới) ── */
  var nk = p.newKey;
  if(typeof nk === 'string'){ try{ nk = JSON.parse(nk); }catch(e){ nk = null; } }
  var targetNo = '', targetName = '', created = false, keyRow = 0;
  if(nk && String(nk.keyTask||'').trim()){
    var kPic = String(nk.pic||'').trim() || subPic || user.pic;
    if(!canAssignUser(user)) kPic = user.pic;
    var srcVals = sh.getRange(srcRow, 10, 1, 3).getValues()[0];          /* J..L của sub */
    keyRow = firstEmptyContentRow(sh);
    var wantNo = String(nextKeyNo(sh));
    writeWeekly(sh, keyRow, {
      type:String(nk.type||''), keyTask:String(nk.keyTask).trim(), subTask:'', pic:kPic, result:'',
      start:srcVals[0]||s2d(todayISO()), planned:srcVals[2]||srcVals[1]||'', revised:'', status:'To Do', progress:0
    });
    targetNo = ensureRowNo(sh, keyRow, wantNo) || wantNo;
    targetName = String(nk.keyTask).trim(); created = true;
    if(keyRow <= srcRow) srcRow++;                                       /* (không xảy ra: key mới luôn ở cuối) */
  } else {
    keyRow = resolveRow(sh, { no:p.targetNo, expect:p.expectKey });
    if(!keyRow) return { ok:false, stale:true, error:'Không tìm thấy Key Task đích '+(p.targetNo||'')+STALE_MSG };
    targetNo = normNo(sh.getRange(keyRow, 2).getValue());
    if(!targetNo || targetNo.indexOf('.') >= 0) return { ok:false, error:'Đích phải là một Key Task.' };
    if(targetNo === oldKeyNo) return { ok:false, error:'Sub-task đang nằm trong Key Task này rồi.' };
    if(_vsLocked(sh, keyRow)) return { ok:false, error:'Key Task đích đồng bộ tự động — không thêm sub-task thủ công được.' };
    if(typeof rhxIsTripRow === 'function' && rhxIsTripRow(sh, keyRow)) return { ok:false, error:'Key Task đích là lịch công tác — không thêm sub-task được.' };
    targetName = String(sh.getRange(keyRow, 6).getValue()||'');
  }

  /* ── 2) chèn dòng mới ở cuối block key đích ── */
  var info = keyBlockInfo(sh, targetNo);
  if(!info.keyRow) return { ok:false, error:'Không tìm thấy Key Task '+targetNo };
  var lastCol = Math.min(24, sh.getMaxColumns());
  var nCols = lastCol - 4;                                               /* E..X */
  var vals = sh.getRange(srcRow, 5, 1, nCols).getValues()[0];
  var fmls = sh.getRange(srcRow, 5, 1, nCols).getFormulas()[0];
  var insertAfter = info.lastRow;
  var maxRows = sh.getMaxRows();
  if(insertAfter >= maxRows){ sh.insertRowsAfter(maxRows, insertAfter - maxRows + 2); }
  sh.insertRowsAfter(insertAfter, 1);
  var newRow = insertAfter + 1;
  if(newRow <= srcRow) srcRow++;                                         /* dòng cũ bị đẩy xuống 1 */
  for(var j=0;j<nCols;j++){
    var col = 5 + j;
    if(col === 5 || col === 6) continue;                                 /* sub-task: Type / Key Task để trống */
    if(fmls[j]) continue;                                                /* ô công thức → để công thức tự kéo */
    if(col !== 17 && FORMULA_COLS[col]) continue;
    var v = vals[j];
    if(v === '' || v === null) continue;
    sh.getRange(newRow, col).setValue(v);
  }
  var wantSub = targetNo + '.' + (info.maxSub + 1);
  ensureRowNo(sh, newRow, wantSub);

  /* ── 3) xoá dòng cũ ── */
  sh.deleteRow(srcRow);
  if(srcRow < newRow) newRow--;
  if(srcRow < keyRow) keyRow--;
  SpreadsheetApp.flush();
  var newNo = normNo(sh.getRange(newRow, 2).getValue()) || wantSub;
  clampDoneFuture(sh, newRow);

  /* ── 4) tính lại % / trạng thái 2 key ── */
  var rollOld = null, rollNew = null;
  try{ rollOld = syncKeyRollup(sh, oldKeyNo); }catch(e){}
  try{ rollNew = syncKeyRollup(sh, normNo(sh.getRange(keyRow, 2).getValue()) || targetNo); }catch(e){}
  logActivity(user.pic, 'update', 'chuyển sub-task "'+subName+'" từ "'+oldKeyName+'" sang '+(created?'Key Task MỚI ':'')+'"'+targetName+'"', targetName, newNo);
  var task = null; try{ task = readRowObj(sh, newRow); }catch(e){}
  return { ok:true, message:'Đã chuyển sang Key Task '+targetNo+(created?' (mới tạo)':''),
           no:newNo, oldNo:srcNo, keyNo:targetNo, oldKeyNo:oldKeyNo, createdKey:created,
           task:task, keyRollup:rollNew, oldKeyRollup:rollOld };
}
/* ══════════════ ⭐ v13.3 (01.10): FILE THAM CHIẾU CHO TASK ══════════════
 * Web gửi file (base64) qua POST action "uploadRef" ⇒ lưu vào Google Drive:
 *     [Folder gốc REF_ROOT_ID] ▸ [Phòng ban] ▸ [PIC của task] ▸ YYYYMMDD_Tên task.ext
 *     (ngày = ngày bắt đầu của task; không có thì hạn; không có nữa thì hôm nay ·
 *      trùng tên ⇒ thêm _2, _3…)
 * Sau khi tải xong: thêm 1 dòng  "📎 <tên file> — <link>"  vào cột Kết quả (I) của task.
 * ⚠️ Lần đầu: chọn hàm authorizeDrive → Run để cấp quyền Google Drive cho script, rồi deploy version mới. */
var REF_ROOT_ID   = '1o6qy_qM3sjNl1V4_iE2kUCjaexHTeaEO';
var REF_DEPT_NAME = { marketing:'Marketing & Sales', backoffice:'Back Office', management:'Management' };
var REF_MAX_MB    = 25;
function authorizeDrive(){ var f = DriveApp.getFolderById(REF_ROOT_ID); return 'OK — script đã truy cập được folder: ' + f.getName(); }
function _refPicCol(){ return (typeof weeklyPicCol === 'function') ? weeklyPicCol() : 8; }
function _refSafe(s, max){
  s = String(s==null?'':s).replace(/[\\\/:*?"<>|#%\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
  if(max && s.length > max) s = s.slice(0, max).trim();
  return s;
}
function _refChild(parent, name){
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function _refUnique(folder, base, ext){
  var name = base + ext, n = 1;
  while(folder.getFilesByName(name).hasNext() && n < 99){ n++; name = base + '_' + n + ext; }
  return name;
}
/* web hỏi lại kết quả (khi trình duyệt không đọc được phản hồi của lệnh POST) */
function refStatus(p){
  var rid = String(p.rid||'').trim();
  var v = rid ? ridGet('ref_' + rid) : null;
  return v || { ok:true, none:true };
}
function refUploadHandler(user, p){
  var rid = String(p.rid||'').trim(), key = 'ref_' + rid;
  if(rid){
    var prev = ridGet(key);
    if(prev){ prev.dedup = true; return prev; }
    ridPut(key, { ok:false, pending:true, error:'Đang tải lên…' });
  }
  var out;
  try{ out = refUpload(user, p); }
  catch(e){ out = { ok:false, error:'Lỗi tải file: ' + String(e && e.message || e) }; }
  if(out && out.ok){ touchVersion(); out.v = dataVersion().v; }
  if(rid){ var c = {}; for(var k in out){ if(k !== 'result') c[k] = out[k]; } ridPut(key, c); }
  return out;
}
function refUpload(user, p){
  var b64 = String(p.data||'').replace(/^data:[^,]*,/, '');
  if(!b64) return { ok:false, error:'Không có dữ liệu file.' };
  if(b64.length * 0.75 > REF_MAX_MB * 1024 * 1024) return { ok:false, error:'File lớn hơn ' + REF_MAX_MB + ' MB.' };
  var bytes = Utilities.base64Decode(b64);
  var sh = shWeekly();
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây.' }; }
  try{
    var row = resolveRow(sh, { no:p.no, expect:p.expect, row:p.row });
    if(!row) return { ok:false, stale:true, error:'Không tìm thấy task ' + (p.no||'') + STALE_MSG };
    var pic = String(sh.getRange(row, _refPicCol()).getValue()||'').trim();
    if(!canEditPic(user, pic)) return { ok:false, error:'Bạn chỉ thêm file cho task của mình (' + pic + ').' };
    if(typeof _vsLocked === 'function' && _vsLocked(sh, row)) return { ok:false, error:(typeof _vsMsg === 'function' ? _vsMsg() : 'Dòng đồng bộ tự động — không thêm file được.') };
    if(typeof rhxIsTripRow === 'function' && rhxIsTripRow(sh, row)) return { ok:false, error:'Dòng lịch công tác — không thêm file được.' };
    var v = sh.getRange(row, 6, 1, 7).getValues()[0];          /* F Key · G Sub · H · I · J Start · K Planned · L Revised */
    var taskName = String(v[1]||'').trim() || String(v[0]||'').trim() || ('Task ' + (p.no||''));
    var day = String(d2s(v[4])).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) day = String(d2s(v[6])).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) day = String(d2s(v[5])).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) day = todayISO();
    var orig = String(p.fileName||'file');
    var mx = /(\.[A-Za-z0-9]{1,8})$/.exec(orig), ext = mx ? mx[1].toLowerCase() : '';
    var base = day.replace(/-/g,'') + '_' + (_refSafe(taskName, 90) || 'Task');
    var root = DriveApp.getFolderById(REF_ROOT_ID);
    var dept = _refChild(root, REF_DEPT_NAME[SOURCE] || SOURCE);
    var picF = _refChild(dept, _refSafe(pic || user.pic || 'Chưa có PIC', 60));
    var name = _refUnique(picF, base, ext);
    var file = picF.createFile(Utilities.newBlob(bytes, String(p.mimeType||'application/octet-stream'), name));
    try{ file.setDescription('MMH Report Hub · Task #' + (p.no||'') + ' · ' + taskName + ' · tải lên bởi ' + (user.pic||'') + ' · tên file gốc: ' + orig); }catch(e){}
    var url = file.getUrl();
    var cur = String(sh.getRange(row, 9).getValue()||'');
    var result = (cur ? cur.replace(/\s+$/,'') + '\n' : '') + '📎 ' + name + ' — ' + url;
    sh.getRange(row, 9).setValue(result);
    SpreadsheetApp.flush();
    try{ logActivity(user.pic, 'update', 'thêm file tham chiếu "' + name + '"', '', String(normNo(sh.getRange(row,2).getValue())||p.no||'')); }catch(e){}
    return { ok:true, url:url, name:name, folderUrl:picF.getUrl(), result:result, message:'Đã tải lên ' + name };
  } finally { try{ lock.releaseLock(); }catch(e){} }
}
/* ══════════════ ⭐ v13.4 (01.10): BIÊN BẢN HỌP ══════════════
 * Lưu ở sheet "MEETING LOG" (tự tạo). Mỗi biên bản 1 dòng:
 *   ID | Tiêu đề | Nhóm | Ngày họp | Từ ngày | Đến ngày | Thành phần | Nội dung họp | Tóm tắt |
 *   Data JSON (ghi chú) | Snapshot JSON (task trong kỳ lúc lưu) | Tạo lúc | Người tạo | Cập nhật lúc |
 *   Người cập nhật | Gửi email lúc | Gửi tới
 * Lệnh: mmList · mmGet (đọc) — mmSave · mmDelete · mmMail (POST, chống gửi trùng theo rid).
 * Gửi email: Trưởng nhóm / Quản lý (canAssign) hoặc nhân sự Marketing Team.            */
var MM_SHEET = 'MEETING LOG';
var MM_HEAD  = ['ID','Tiêu đề','Nhóm','Ngày họp','Từ ngày','Đến ngày','Thành phần','Nội dung họp','Tóm tắt',
                'Data JSON','Snapshot JSON','Tạo lúc','Người tạo','Cập nhật lúc','Người cập nhật','Gửi email lúc','Gửi tới'];
var MM_POST  = { mmSave:1, mmDelete:1, mmMail:1 };
function mmSheet(){
  var s = ss().getSheetByName(MM_SHEET);
  if(!s){
    s = ss().insertSheet(MM_SHEET);
    s.getRange(1, 1, s.getMaxRows(), MM_HEAD.length).setNumberFormat('@');
    s.getRange(1, 1, 1, MM_HEAD.length).setValues([MM_HEAD]).setFontWeight('bold').setBackground('#E3ECF5').setFontColor('#35506B');
    s.setFrozenRows(1);
    try{ s.setColumnWidth(2, 260); s.setColumnWidth(9, 320); s.setColumnWidth(10, 140); s.setColumnWidth(11, 140); }catch(e){}
  }
  return s;
}
function mmNow(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'); }
function mmTxt(v){ return (v instanceof Date) ? d2s(v) : String(v == null ? '' : v); }
function mmAll(){
  var s = mmSheet(), last = s.getLastRow();
  return { s:s, v: last < 2 ? [] : s.getRange(2, 1, last - 1, MM_HEAD.length).getValues() };
}
function mmMeta(r){
  return { id:mmTxt(r[0]), title:mmTxt(r[1]), group:mmTxt(r[2]), date:mmTxt(r[3]).slice(0,10), from:mmTxt(r[4]).slice(0,10), to:mmTxt(r[5]).slice(0,10),
           attendees:mmTxt(r[6]), topics:mmTxt(r[7]), summary:mmTxt(r[8]),
           createdAt:mmTxt(r[11]), createdBy:mmTxt(r[12]), updatedAt:mmTxt(r[13]), updatedBy:mmTxt(r[14]),
           emailedAt:mmTxt(r[15]), emailedTo:mmTxt(r[16]) };
}
function mmFind(id){
  var A = mmAll();
  for(var i = 0; i < A.v.length; i++){ if(mmTxt(A.v[i][0]) === String(id)) return { s:A.s, row:i + 2, r:A.v[i] }; }
  return null;
}
function mmList(){
  var L = mmAll().v.filter(function(r){ return mmTxt(r[0]); }).map(mmMeta);
  L.sort(function(a, b){ return (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt); });
  return { ok:true, list:L };
}
function mmGet(p){
  var f = mmFind(p.id); if(!f) return { ok:false, error:'Không tìm thấy biên bản ' + (p.id||'') };
  var m = mmMeta(f.r), dj = null, sj = null;
  try{ dj = JSON.parse(mmTxt(f.r[9]) || 'null'); }catch(e){}
  try{ sj = JSON.parse(mmTxt(f.r[10]) || 'null'); }catch(e){}
  m.data = dj; m.snap = sj;
  return { ok:true, rec:m };
}
function mmIsLead(user){ return canAssignUser(user); }
function mmCanSend(user){
  if(!user || !user.pic) return false;
  if(canAssignUser(user)) return true;
  for(var e in USER_MAP){ if(USER_MAP[e].pic === user.pic) return /marketing/i.test(String(USER_MAP[e].team||'')); }
  return false;
}
function mmParse(v){ if(v && typeof v === 'object') return v; try{ return JSON.parse(String(v||'')); }catch(e){ return null; } }
function mmSave(user, p){
  if(!user || !user.pic) return { ok:false, error:'Chưa đăng nhập.' };
  var rec = mmParse(p.rec) || {};
  var data = typeof p.data === 'string' ? p.data : JSON.stringify(p.data || {});
  var snap = typeof p.snap === 'string' ? p.snap : JSON.stringify(p.snap || {});
  if(data.length > 49000) return { ok:false, error:'Ghi chú quá dài (' + data.length + ' ký tự) — vui lòng rút gọn.' };
  if(snap.length > 49000) snap = JSON.stringify({ trimmed:true });
  var title = String(rec.title||'').trim(); if(!title) return { ok:false, error:'Thiếu tiêu đề biên bản.' };
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'Hệ thống đang bận, vui lòng thử lại.' }; }
  try{
    var now = mmNow(), id = String(rec.id||'').trim(), f = id ? mmFind(id) : null;
    if(f){
      var creator = mmTxt(f.r[12]), att = mmTxt(f.r[6]).toLowerCase();
      if(creator !== user.pic && !mmIsLead(user) && att.indexOf(String(user.pic).toLowerCase()) < 0)
        return { ok:false, error:'Chỉ người tạo, thành phần họp hoặc trưởng nhóm được sửa biên bản này.' };
    } else {
      id = 'MM-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }
    var row = [ id, title, String(rec.group||''), String(rec.date||''), String(rec.from||''), String(rec.to||''),
                [].concat(rec.attendees||[]).join(', '), [].concat(rec.topics||[]).join(' · '), String(rec.summary||'').slice(0, 4000),
                data, snap,
                f ? mmTxt(f.r[11]) : now, f ? mmTxt(f.r[12]) : user.pic, now, user.pic,
                f ? mmTxt(f.r[15]) : '', f ? mmTxt(f.r[16]) : '' ];
    var s = f ? f.s : mmSheet(), r = f ? f.row : Math.max(2, s.getLastRow() + 1);
    s.getRange(r, 1, 1, MM_HEAD.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();
    try{ logActivity(user.pic, f ? 'update' : 'add', (f ? 'cập nhật' : 'lưu') + ' biên bản họp "' + title + '"', '', ''); }catch(e){}
    return { ok:true, id:id, meta:mmMeta(row), message:'Đã lưu biên bản ' + title };
  } finally { try{ lock.releaseLock(); }catch(e){} }
}
function mmDelete(user, p){
  var f = mmFind(p.id); if(!f) return { ok:false, error:'Không tìm thấy biên bản.' };
  if(mmTxt(f.r[12]) !== user.pic && !mmIsLead(user)) return { ok:false, error:'Chỉ người tạo hoặc trưởng nhóm được xoá biên bản.' };
  f.s.deleteRow(f.row);
  try{ logActivity(user.pic, 'delete', 'xoá biên bản họp "' + mmTxt(f.r[1]) + '"', '', ''); }catch(e){}
  return { ok:true, message:'Đã xoá biên bản' };
}
function mmEmails(list){
  var out = [], bad = [];
  [].concat(list||[]).forEach(function(x){
    x = String(x||'').trim(); if(!x) return;
    var e = /@/.test(x) ? x : (PIC_EMAIL[x] || '');
    if(!e){ bad.push(x + ' (chưa có email)'); return; }
    if(!/^[^@\s]+@manimedicalhanoi\.com$/i.test(e)){ bad.push(x); return; }
    if(out.indexOf(e.toLowerCase()) < 0) out.push(e.toLowerCase());
  });
  return { list:out, bad:bad };
}
function mmMail(user, p){
  if(!mmCanSend(user)) return { ok:false, error:'Chỉ Trưởng nhóm / Quản lý hoặc Marketing team được gửi email biên bản họp.' };
  var f = mmFind(p.id); if(!f) return { ok:false, error:'Biên bản chưa được lưu — lưu trước khi gửi email.' };
  var to = mmEmails(mmParse(p.to) || p.to), cc = mmEmails(mmParse(p.cc) || p.cc);
  if(!to.list.length) return { ok:false, error:'Chưa chọn người nhận (To).' };
  if(user.email && to.list.indexOf(user.email.toLowerCase()) < 0 && cc.list.indexOf(user.email.toLowerCase()) < 0) cc.list.push(user.email.toLowerCase());
  cc.list = cc.list.filter(function(e){ return to.list.indexOf(e) < 0; });
  var subject = String(p.subject || mmTxt(f.r[1])).trim();
  var html = String(p.html || '');
  if(!html) return { ok:false, error:'Thiếu nội dung email.' };
  if(MailApp.getRemainingDailyQuota() < to.list.length + cc.list.length) return { ok:false, error:'Đã hết hạn mức gửi email trong ngày của Google.' };
  var opt = { to:to.list.join(','), subject:subject, htmlBody:html, name:'MMH Report Hub' };
  if(cc.list.length) opt.cc = cc.list.join(',');
  if(user.email) opt.replyTo = user.email;
  mmhMail_(opt);
  var now = mmNow(), sentTo = to.list.concat(cc.list.map(function(e){ return 'cc:' + e; })).join(', ');
  f.s.getRange(f.row, 16, 1, 2).setNumberFormat('@').setValues([[now + ' (' + user.pic + ')', sentTo]]);
  try{ logActivity(user.pic, 'update', 'gửi email biên bản họp "' + mmTxt(f.r[1]) + '"', '', ''); }catch(e){}
  return { ok:true, emailedAt:now, emailedTo:sentTo, skipped:to.bad.concat(cc.bad), message:'Đã gửi email tới ' + to.list.length + ' người nhận' + (cc.list.length ? ' + ' + cc.list.length + ' CC' : '') };
}
/* chạy 1 lệnh POST: chống gửi trùng theo rid + lưu kết quả để web hỏi lại (refStatus) */
function mmOnce(p, fn){
  var rid = String(p.rid||'').trim(), key = 'ref_' + rid;
  if(rid){ var prev = ridGet(key); if(prev){ prev.dedup = true; return prev; } ridPut(key, { ok:false, pending:true, error:'Đang xử lý…' }); }
  var out;
  try{ out = fn(); }catch(e){ out = { ok:false, error:String(e && e.message || e) }; }
  if(rid) ridPut(key, out);
  return out;
}
function writeWeekly(sh, row, o){
  setIfWritable(sh, row, 5,  o.type||'');
  setIfWritable(sh, row, 6,  o.keyTask||'');
  setIfWritable(sh, row, 7,  o.subTask||'');
  setIfWritable(sh, row, 8,  o.pic||'');
  setIfWritable(sh, row, 9,  o.result||'');
  setIfWritable(sh, row, 10, o.start||'');
  setIfWritable(sh, row, 11, o.planned||'');
  setIfWritable(sh, row, 12, o.revised||'');
  setIfWritable(sh, row, 14, o.status||'');
  setIfWritable(sh, row, 15, pctToCell(o.progress||0));
}

/* ══════════════ DELETE ══════════════ */
function deleteWeeklyRow(user, p){
  var row=parseInt(p.row,10);
  if(!row) return { ok:false, error:'Thiếu row' };
  var sh=shWeekly();
  var no=String(sh.getRange(row,2).getValue()||'').trim();
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ xoá task của mình.' };
  var nm=String(sh.getRange(row,7).getValue()||sh.getRange(row,6).getValue()||'');
  if(_vsLocked(sh, row)) return { ok:false, error:_vsMsg() };   /* ⭐ v9 */
  if(no.indexOf('.')<0){
    if(!isManager(user)) return { ok:false, error:'Chỉ quản lý được xoá cả Key Task.' };
    var info=keyBlockInfo(sh,no);
    var n=info.lastRow-info.keyRow+1;
    sh.deleteRows(info.keyRow, n);
    logActivity(user.pic,'delete','xoá Key Task "'+nm+'" ('+(n-1)+' sub)','',no);
    return { ok:true, message:'Đã xoá Key Task '+no+' và '+(n-1)+' sub-task' };
  }
  sh.deleteRow(row);
  logActivity(user.pic,'delete','xoá sub-task "'+nm+'"','',no);
  return { ok:true, message:'Đã xoá sub-task '+no };
}
function deleteByNo(user, p, kind){
  var no=String(p.no||'').trim();
  if(!no) return { ok:false, error:'Thiếu mã task' };
  var sh=shWeekly();
  var row=resolveRow(sh, p);                                   /* ⭐ v10.1 */
  if(!row) return { ok:false, stale:true, error:'Không tìm thấy task '+no+STALE_MSG };
  no = normNo(sh.getRange(row,2).getValue()) || no;             /* số No THẬT hiện tại của dòng đó */
  var pic=String(sh.getRange(row,8).getValue()||'');
  var nm=String(sh.getRange(row,7).getValue()||sh.getRange(row,6).getValue()||'');
  if(_vsLocked(sh, row)) return { ok:false, error:_vsMsg() };   /* ⭐ v9 */
  if(kind==='key' || no.indexOf('.')<0){
    if(!canAssignUser(user)) return { ok:false, error:'Chỉ Quản lý/Trưởng nhóm được xoá cả Key Task.' };
    var info=keyBlockInfo(sh,no);
    if(!info.keyRow) return { ok:false, error:'Không tìm thấy Key Task '+no };
    var n=info.lastRow-info.keyRow+1;
    sh.deleteRows(info.keyRow, n);
    logActivity(user.pic,'delete','xoá Key Task "'+nm+'" ('+(n-1)+' sub)','',no);
    return { ok:true, message:'Đã xoá Key Task '+no+' và '+(n-1)+' sub-task' };
  }
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ xoá sub-task của mình.' };
  sh.deleteRow(row);
  logActivity(user.pic,'delete','xoá sub-task "'+nm+'"','',no);
  return { ok:true, message:'Đã xoá sub-task '+no };
}

/* ══════════════ MONTHLY CRUD — MARKETING LAYOUT ══════════════
 * B=No(2) | C=FY(3) | D=Month(4) | E=Type(5) | F=Key(6) | G=Text(7) | H=PIC(8) */
function monthRowByNo(no){
  var sh=shMonthly(); if(!sh) return 0;
  var last=sh.getLastRow(); if(last<MONTHLY_DATA_ROW) return 0;
  var vals=sh.getRange(MONTHLY_DATA_ROW,2,last-MONTHLY_DATA_ROW+1,1).getValues();
  var target=String(no||'').trim();
  for(var i=0;i<vals.length;i++){ if(String(vals[i][0]==null?'':vals[i][0]).trim()===target) return MONTHLY_DATA_ROW+i; }
  return 0;
}
function updateMonthlyRow(user, p){
  var row=parseInt(p.row,10);
  if(!row) return { ok:false, error:'Thiếu row' };
  var sh=shMonthly();
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ sửa báo cáo của mình.' };
  var u=p.updates||{};
  var COL={ no:2, fy:3, month:4, typeTask:5, keyTask:6, text:7, pic:8 };
  Object.keys(u).forEach(function(k){ if(COL[k]) sh.getRange(row,COL[k]).setValue(u[k]); });
  return { ok:true, message:'Đã cập nhật Monthly' };
}
function addMonthlyRow(user, p){
  var sh=shMonthly();
  var targetPic=String(p.pic||'').trim()||user.pic;
  if(!canAssignUser(user) && targetPic.toLowerCase()!==String(user.pic||'').toLowerCase())
    targetPic=user.pic;
  var row=sh.getLastRow()+1;
  if(row < MONTHLY_DATA_ROW) row = MONTHLY_DATA_ROW;
  sh.getRange(row,2).setValue(p.no||'');
  sh.getRange(row,3).setValue(p.fy||'FY67');
  sh.getRange(row,4).setValue(p.month||'');
  sh.getRange(row,5).setValue(p.typeTask||p.type||'');
  sh.getRange(row,6).setValue(p.keyTask||p.title||'');
  sh.getRange(row,7).setValue(p.text||p.content||'');
  sh.getRange(row,8).setValue(targetPic);
  logActivity(user.pic,'add','thêm mục Monthly "'+(p.title||p.keyTask||'')+'"','','');
  return { ok:true, message:'Đã thêm Monthly', row:row };
}
function updateMonthlyByNo(user, p){
  var sh=shMonthly();
  var row=parseInt(p.row,10) || monthRowByNo(p.no);
  if(!row) return { ok:false, error:'Không tìm thấy mục cần sửa' };
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ sửa báo cáo của mình.' };
  if(p.content!=null||p.text!=null) sh.getRange(row,7).setValue(p.content!=null?p.content:p.text);
  if(p.title!=null||p.keyTask!=null) sh.getRange(row,6).setValue(p.title!=null?p.title:p.keyTask);
  if(p.type!=null||p.typeTask!=null) sh.getRange(row,5).setValue(p.type!=null?p.type:p.typeTask);
  logActivity(user.pic,'update','cập nhật Monthly','',String(p.no||''));
  return { ok:true, message:'Đã cập nhật Monthly' };
}
function deleteMonthlyByNo(user, p){
  var sh=shMonthly();
  var row=parseInt(p.row,10) || monthRowByNo(p.no);
  if(!row) return { ok:false, error:'Không tìm thấy mục cần xóa' };
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ xóa báo cáo của mình.' };
  var nm=String(sh.getRange(row,6).getValue()||'');
  sh.deleteRow(row);
  logActivity(user.pic,'delete','xóa mục Monthly "'+nm+'"','',String(p.no||''));
  return { ok:true, message:'Đã xóa mục Monthly' };
}
function deleteMonthlyRow(user, p){
  var row=parseInt(p.row,10);
  var sh=shMonthly();
  var pic=String(sh.getRange(row,8).getValue()||'');
  if(!canEditPic(user,pic)) return { ok:false, error:'Bạn chỉ xoá báo cáo của mình.' };
  sh.deleteRow(row);
  return { ok:true, message:'Đã xoá Monthly' };
}

/* ══════════════ ASSIGN / NHẮC VIỆC ══════════════ */
function sendAssign(user, p){
  if(!isManager(user)) return { ok:false, error:'Chỉ quản lý được assign/nhắc việc.' };
  var toPic = String(p.toPic||'').trim();
  var toEmail = PIC_EMAIL[toPic];
  if(!toEmail) return { ok:false, error:'Không tìm thấy email của '+toPic };
  var items = [];
  try{ items = p.items ? (typeof p.items==='string' ? JSON.parse(p.items) : p.items) : []; }catch(_){ items=[]; }
  if(!items.length) return { ok:false, error:'Chưa chọn công việc để nhắc.' };
  var note = String(p.note||'').trim();
  var rows = items.map(function(it, idx){
    var dl = it.deadline ? esc(fmtVN(it.deadline)) : '(chưa đặt hạn)';
    var td = 'padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt';
    return '<tr>'+
      '<td style="'+td+';text-align:center">'+(idx+1)+'</td>'+
      '<td style="'+td+'">'+esc(it.no||'')+'</td>'+
      '<td style="'+td+';color:#3A5CAA">'+esc(it.keyTask||'')+'</td>'+
      '<td style="'+td+'">'+esc(it.name||'')+'</td>'+
      '<td style="'+td+';text-align:center;white-space:nowrap">'+dl+'</td>'+
      '<td style="'+td+';text-align:center;white-space:nowrap">'+esc(it.status||'To Do')+'</td>'+
    '</tr>';
  }).join('');
  /* ⭐ v5.10: MẪU EMAIL GIAO / NHẮC VIỆC — theo template thống nhất của MMH */
  var body =
    '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.55;max-width:720px">'+
      '<div style="background:#FFF3CD;border-left:4px solid #E0900A;padding:10px 14px;border-radius:6px;margin:0 0 14px">'+
        '<b style="color:#8A5A00;font-size:12pt">\u2b50 CÔNG VIỆC CẦN ƯU TIÊN</b></div>'+
      '<p style="margin:0 0 10px"><b>Dear '+esc(toPic)+'</b>,</p>'+
      '<p style="margin:0 0 12px">'+esc(toPic)+' lưu ý ưu tiên hoàn thành các công việc sau:</p>'+
      '<table style="border-collapse:collapse;width:100%;margin:0 0 14px">'+
        '<thead><tr style="background:#0E2F5F;color:#FFFFFF">'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:34px">TT</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:60px;text-align:left">Mã</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;text-align:left">Key Task</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;text-align:left">Nội dung công việc</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:104px">Thời hạn</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:96px">Trạng thái</th>'+
        '</tr></thead><tbody>'+rows+'</tbody>'+
      '</table>'+
      (note ? '<p style="margin:0 0 12px"><b>Ghi chú:</b> '+esc(note).replace(/\n/g,'<br>')+'</p>' : '')+
      '<p style="margin:0 0 12px;color:#5A6A8A">Anh/chị vui lòng cập nhật tiến độ trên <b>MMH Report</b> sau khi hoàn thành.</p>'+
      '<p style="margin:14px 0 2px">Trân trọng,</p>'+
      '<p style="margin:0"><b>'+esc(user.pic)+'</b>'+(user.title?' — '+esc(user.title):'')+'</p>'+
      '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi · Marketing &amp; Product</p>'+
    '</div>';
  mmhMail_({ to:toEmail, cc:user.email, subject:'[MMH] \u2b50 Cong viec can uu tien - '+toPic, htmlBody:body, name:'MMH Report Hub' });
  logActivity(user.pic,'assign','giao/nhắc việc cho '+toPic+' ('+items.length+' việc)','','');
  return { ok:true, message:'Đã gửi nhắc việc ('+items.length+' công việc) tới '+toPic };
}

/* ══════════════ PRIORITY ══════════════ */
var CC_PRIORITY = ['tt.tuyen@manimedicalhanoi.com','vtt.hoa@manimedicalhanoi.com'];
function setPriorityFlag(user, p){
  if(!isManager(user)) return { ok:false, error:'Chỉ quản lý được đánh dấu ưu tiên.' };
  var sh=shWeekly();
  var row=parseInt(p.row,10) || rowByNo(sh, p.no);
  if(!row) return { ok:false, error:'Thiếu row' };
  sh.getRange(row,17).setValue(p.on==1||p.on===true||p.on==='1');
  return { ok:true };
}
function sendPriority(user, p){
  if(!isManager(user)) return { ok:false, error:'Chỉ quản lý/leader được gửi nhắc việc ưu tiên.' };
  var items = [];
  try{ items = p.items ? (typeof p.items==='string' ? JSON.parse(p.items) : p.items) : []; }catch(_){ items=[]; }
  items = items.filter(function(it){ return !/complet/i.test(String(it.status||'')); });
  if(!items.length) return { ok:false, error:'Không có việc ưu tiên nào cần nhắc.' };
  var note = String(p.note||'').trim();
  var manager = user.pic || 'Quản lý';
  var sent=[], skipped=[];
  var byPic = {};
  items.forEach(function(it){ var pic=String(it.pic||'').trim(); if(pic)(byPic[pic]=byPic[pic]||[]).push(it); });
  Object.keys(byPic).forEach(function(pic){
    var toEmail = PIC_EMAIL[pic];
    if(!toEmail){ skipped.push(pic); return; }
    var list = byPic[pic];
    var rows = list.map(function(it, idx){
      var dl = it.deadline ? esc(fmtVN(it.deadline)) : '(chưa đặt hạn)';
      return '<tr>'+
        '<td style="padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt;text-align:center">'+(idx+1)+'</td>'+
        '<td style="padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt">'+esc(it.no||'')+'</td>'+
        '<td style="padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt;color:#3A5CAA">'+esc(it.keyTask||'')+'</td>'+
        '<td style="padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt">'+esc(it.name||'')+'</td>'+
        '<td style="padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt;text-align:center;white-space:nowrap">'+dl+'</td>'+
        '<td style="padding:7px 10px;border:1px solid #C9D2E0;font-size:11pt;text-align:center;white-space:nowrap">'+esc(it.status||'')+'</td>'+
      '</tr>';
    }).join('');
    var body = '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.5;max-width:720px">'+
      '<div style="background:#FFF3CD;border-left:4px solid #E0900A;padding:10px 14px;border-radius:6px;margin:0 0 14px">'+
        '<b style="color:#8A5A00;font-size:12pt">\u2b50 CÔNG VIỆC CẦN ƯU TIÊN</b></div>'+
      '<p style="margin:0 0 10px"><b>Dear '+esc(pic)+'</b>,</p>'+
      '<p style="margin:0 0 12px">'+esc(manager)+' lưu ý '+esc(pic)+' ưu tiên hoàn thành các công việc sau:</p>'+
      '<table style="border-collapse:collapse;width:100%;margin:0 0 14px">'+
        '<thead><tr style="background:#0E2F5F;color:#FFFFFF">'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:34px">TT</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:56px;text-align:left">Mã</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;text-align:left">Key Task</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;text-align:left">Nội dung</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:96px">Thời hạn</th>'+
          '<th style="padding:7px 10px;border:1px solid #0E2F5F;font-size:11pt;width:96px">Trạng thái</th>'+
        '</tr></thead><tbody>'+rows+'</tbody>'+
      '</table>'+
      (note ? '<p style="margin:0 0 12px"><b>Ghi chú:</b> '+esc(note).replace(/\n/g,'<br>')+'</p>' : '')+
      '<p style="margin:14px 0 2px">Trân trọng,</p>'+
      '<p style="margin:0"><b>'+esc(manager)+'</b>'+(user.title?' — '+esc(user.title):'')+'</p>'+
      '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi · Marketing &amp; Product</p></div>';
    var ccList=[user.email].concat(CC_PRIORITY).filter(function(e,i,a){ return e && e!==toEmail && a.indexOf(e)===i; });
    mmhMail_({ to:toEmail, cc:ccList.join(','), subject:'[MMH] \u2b50 Công việc ưu tiên - '+pic, htmlBody:body, name:'MMH Report Hub' });
    sent.push(pic+' ('+list.length+' việc)');
  });
  try{ savePriorityLog(items); }catch(e){}
  if(!sent.length) return { ok:false, error:'Không gửi được (không tìm thấy email PIC).' };
  var msg='Đã gửi nhắc ưu tiên: '+sent.join(' · ');
  if(skipped.length) msg+=' · Bỏ qua (không có email): '+skipped.join(', ');
  logActivity(user.pic,'priority','gửi nhắc việc ưu tiên ('+items.length+' việc)','','');
  return { ok:true, message:msg, sentAt: todayISO() };
}
function savePriorityLog(items){
  if(!items || !items.length) return;
  var sh = shWeekly();
  var today = todayISO();
  items.forEach(function(it){
    var row = parseInt(it.row,10) || rowByNo(sh, it.no);
    if(!row) return;
    sh.getRange(row, 17).setValue(true);
    sh.getRange(row, 18).setValue(today);
  });
}

/* ══════════════ WEEKLY REPORT ══════════════ */
function addDaysISO(iso, n){
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso)); if(!m) return iso;
  var d=new Date(+m[1],+m[2]-1,+m[3]); d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
function isClosedStatus(st){ return /complet/i.test(st) || /cancel/i.test(st); }
/* ⭐ v8.0 — QUY TẮC LỌC BÁO CÁO TUẦN (thay logic cũ quá rộng)
   ① "This week"  (from = Thứ 2, to = Chủ nhật của tuần báo cáo):
       (a) Deadline hiệu lực (Revised || Planned) NẰM TRONG [from, to]
       (b) HOẶC quá hạn chưa xong: deadline < from  &&  status ≠ Completed/Cancelled
   ② "Plan for next week"  ([from+7, to+7]):
       CHỈ task có START DATE nằm trong khoảng đó (bỏ Completed / Cancelled)

   ĐÃ BỎ 4 mệnh đề gây rò rỉ:
     • || /progress/i.test(status)          → kéo MỌI task In Progress bất kể ngày
     • || inWeek(s.start,...)   (this week) → task mới bắt đầu, deadline còn xa
     • || (eff >= from)         (next week) → mọi task có deadline ở tương lai
     • || /progress|to do/i     (next week) → gần như toàn bộ bảng               */
var RPT_INCLUDE_ACTUAL_THIS_WEEK = false;  /* đổi true nếu muốn giữ lại task HOÀN THÀNH
                                              trong tuần dù deadline rơi tuần trước */
function isDoneStatus_(st){   return /complet/i.test(String(st||'')); }
function isCancelStatus_(st){ return /cancel/i.test(String(st||'')); }

/* ⭐ v8.1 — QUY TẮC "GIAO NHAU VỚI TUẦN" (overlap), thay cho quy tắc chỉ-theo-1-ngày.
   Lý do sửa:
     • "This week" cũ CHỈ lấy task có deadline trong tuần ⇒ trên web/email gần như
       chỉ còn task đã Completed; task To Do / In Progress có hạn ở tuần sau biến mất.
     • "Next week" cũ CHỈ lấy task có START DATE đúng trong tuần sau ⇒ sheet không
       điền cột Start date thì phần "Plan for next week" LUÔN TRỐNG (cả email lẫn PDF).
   Quy tắc mới: task thuộc về tuần [from,to] nếu KHOẢNG SỐNG của nó chạm vào tuần đó. */
function rptMatchThisWeek(s, from, to){
  var st  = String(s.start || '').slice(0,10);
  var eff = String(s.revised || s.planned || '').slice(0,10);
  var act = String(s.actual || '').slice(0,10);
  var open = !isDoneStatus_(s.status) && !isCancelStatus_(s.status);
  if(eff && eff >= from && eff <= to) return true;          /* hạn rơi trong tuần        */
  if(st  && st  >= from && st  <= to) return true;          /* bắt đầu trong tuần        */
  if(act && act >= from && act <= to) return true;          /* hoàn thành trong tuần     */
  if(open && st && st < from && (!eff || eff > to)) return true;  /* chạy xuyên tuần    */
  if(open && eff && eff < from) return true;                /* quá hạn, chưa xong        */
  if(open && !st && !eff) return true;                      /* chưa điền ngày, còn mở    */
  return false;
}
function rptMatchNextWeek(s, from, to){
  if(isClosedStatus(s.status)) return false;                /* plan không chứa việc đã xong/huỷ */
  var st  = String(s.start || '').slice(0,10);
  var eff = String(s.revised || s.planned || '').slice(0,10);
  if(st  && st  >= from && st  <= to) return true;          /* bắt đầu trong tuần sau    */
  if(eff && eff >= from && eff <= to) return true;          /* hạn rơi vào tuần sau      */
  if(st  && st  <= to && (!eff || eff >= from)) return true;/* đang chạy sang tuần sau   */
  if(eff && eff < from) return true;                        /* quá hạn → gánh sang tuần sau */
  if(!st && !eff) return true;                              /* chưa điền ngày, còn mở    */
  return false;
}
function filterKeysForPic(keys, targetPic, from, to, scope){
  var tp = String(targetPic||'').trim().toLowerCase();
  var isNext = (scope === 'nextweek');
  function subMatch(s){
    return isNext ? rptMatchNextWeek(s, from, to) : rptMatchThisWeek(s, from, to);
  }
  var out = [];
  keys.forEach(function(k){
    var mySubs = (k.subs||[]).filter(function(s){
      var sp = String(s.pic||'').trim().toLowerCase();
      var belongs = tp ? (sp===tp || (!sp && String(k.pic||'').trim().toLowerCase()===tp)) : true;
      return belongs && subMatch(s);
    });
    var keyBelongs = tp ? String(k.pic||'').trim().toLowerCase()===tp : true;
    /* ⭐ v8.0: key task KHÔNG có sub-task cũng phải qua bộ lọc ngày
       (trước đây lọt tự do vào phần "This week") */
    var keyOnly = keyBelongs && (k.subs||[]).length===0 && !isNext && subMatch(k);
    if(mySubs.length || keyOnly){
      out.push({ no:k.no, keyTask:k.keyTask, type:k.type, pic:k.pic,
                 planned:k.planned, revised:k.revised, progress:k.progress,
                 /* ⭐ v8.1: % của KEY TASK phải tính trên TOÀN BỘ sub-task (k.subs),
                    không phải trên mySubs đã lọc theo tuần/PIC — nếu không, key có
                    4 sub mà tuần này chỉ lọt 1 sub Completed sẽ hiện 100% sai. */
                 __kpct: ktPctGS(k), __ksubs:(k.subs||[]).length,
                 __src:k.__src||'', subs:mySubs });   /* ⭐ v7.2: giữ nhãn nguồn */
    }
  });
  return out;
}
/* ═══════════════════════════════════════════════════════════════════════════
 * ⭐ v7.2 — WEEKLY REPORT ĐA NGUỒN
 * Nguyên lý: báo cáo tuần của một PIC phải gom TOÀN BỘ job của người đó ở
 * cả 3 bảng tính (Marketing / Back Office / Management), không chỉ bảng
 * tính đang gắn với script này.
 *
 * ⚠ YÊU CẦU QUYỀN: tài khoản chạy script (người bấm "Gửi báo cáo") phải có
 * quyền XEM cả 3 bảng tính dưới đây. Thiếu quyền ở nguồn nào thì nguồn đó
 * bị bỏ qua, phần còn lại vẫn gửi bình thường (xem ghi chú cuối email).
 * ═══════════════════════════════════════════════════════════════════════ */
/* ⭐ v9.1 — Nhãn nguồn hiển thị cạnh Key Task trong email.
   Key task của đội Sales nằm CHUNG file backend Marketing nên trước đây bị gắn nhãn
   "Marketing". Nay suy nhãn theo Type task / tên key task để ra đúng đội. */
function xsSrcLabel(k, fallback){
  var t = String((k && k.type) || '') + ' ' + String((k && k.keyTask) || '');
  if (/sales?\s*[-–—]?\s*surgical|surgical\s+customer\s+visiting/i.test(t)) return 'Surgical Sales';
  if (/sales?\s*[-–—]?\s*dental|dental\s+customer\s+visiting/i.test(t))     return 'Dental Sales';
  return fallback;
}

var XS_SOURCES = {
  marketing:  { id:'14xyRkzhpTLy0IbTzgFx2pobzgNN9TdYUGtOuSW0rrw8', sheet:'WEEKYLY new',  dataRow:7, label:'Marketing'   },
  backoffice: { id:'1ciXlWLsoP0iYJkv1At84Cj90T4C1CCeHYcAt_z8yspA', sheet:'WEEKY new',    dataRow:7, label:'Back Office' },
  management: { id:'1bcclUW00gFGHiAu8A5y2PiiEhvv66dEbI0URS9L4OVQ', sheet:'TASK TRACKER', dataRow:5, label:'Management'  }
};
var XS_SKIPPED = [];   // nguồn không đọc được (thiếu quyền / đổi tên sheet)

/* Đọc sheet WEEKLY của MỘT nguồn bất kỳ theo spreadsheet ID.
   Bố cục cột B..S giống nhau ở cả 3 bảng tính, chỉ khác tên sheet + dòng data. */
function xsReadWeekly(srcKey){
  var cfg = XS_SOURCES[srcKey];
  if(!cfg) return [];
  var sh;
  try{
    var ss = SpreadsheetApp.openById(cfg.id);
    sh = ss.getSheetByName(cfg.sheet);
  }catch(err){
    XS_SKIPPED.push(cfg.label + ' (không mở được: ' + err + ')');
    return [];
  }
  if(!sh){ XS_SKIPPED.push(cfg.label + ' (không thấy sheet "' + cfg.sheet + '")'); return []; }

  var last = sh.getLastRow();
  if(last < cfg.dataRow) return [];
  var rng = sh.getRange(cfg.dataRow, 2, last - cfg.dataRow + 1, 18).getValues();

  var keys = [], byPrefix = {};
  for(var i=0;i<rng.length;i++){
    var r = rng[i];
    var no = String(r[0]==null?'':r[0]).trim();
    if(!no) continue;
    if(/^\d+\.0$/.test(no)) no = no.replace(/\.0$/,'');
    var _f = String(r[4]||'').trim(), _g = String(r[5]||'').trim();
    if(!_f && !_g) continue;

    var st  = String(r[12]||'').trim();
    var pctv = pct100(r[13]);
    /* In Progress mà % = 0 → coi như 25% cho khớp cách hiển thị trên web */
    if(/progress/i.test(st) && !pctv) pctv = 25;
    if(/complet/i.test(st)) pctv = 100;

    var obj = {
      row:0, no:no,
      fy: String(r[1]||''),
      month: String(r[2]||'').replace(/\D/g,'').slice(0,6),
      type: String(r[3]||''),
      keyTask: String(r[4]||''),
      subTask: String(r[5]||''),
      pic: String(r[6]||'').replace(/[\r\n]+/g,' ').trim(),
      result: String(r[7]||''),
      start: d2s(r[8]),
      planned: d2s(r[9]),
      revised: d2s(r[10]),
      leadtime: r[11]==null?'':String(r[11]),
      status: st,
      progress: pctv,
      actual: d2s(r[14]),
      __src: cfg.label
    };
    var isKey = no.indexOf('.') < 0;
    if(isKey){
      obj.subs = []; keys.push(obj); byPrefix[no] = obj;
    } else {
      var prefix = no.split('.')[0];
      obj.parentNo = prefix; obj.name = obj.subTask;
      if(byPrefix[prefix]){
        if(!obj.type) obj.type = byPrefix[prefix].type || '';
        byPrefix[prefix].subs.push(obj);
      } else {
        var virt = { row:0, no:prefix, keyTask:'(Key '+prefix+')', subs:[obj],
                     pic:obj.pic, fy:obj.fy, month:obj.month, type:obj.type,
                     status:'', progress:0, __src:cfg.label };
        keys.push(virt); byPrefix[prefix]=virt;
      }
    }
  }
  return keys;
}

/* Gom key task của CẢ 3 NGUỒN.
   Nguồn hiện tại vẫn dùng readWeekly() gốc để giữ nguyên các xử lý riêng
   (làm sạch PIC, chuẩn hoá status…); 2 nguồn còn lại đọc qua xsReadWeekly. */
function xsReadWeeklyAll(){
  XS_SKIPPED = [];
  var out = [];
  var mine = [];
  try{ mine = readWeekly() || []; }catch(err){ mine = []; }
  var myLabel = (XS_SOURCES[SOURCE] || {}).label || SOURCE;
  mine.forEach(function(k){
    var lb = xsSrcLabel(k, myLabel);          /* ⭐ v9.1: key task Sales không gắn nhãn Marketing */
    k.__src = lb;
    (k.subs||[]).forEach(function(s){ s.__src = lb; });
    out.push(k);
  });
  Object.keys(XS_SOURCES).forEach(function(key){
    if(key === SOURCE) return;
    xsReadWeekly(key).forEach(function(k){ out.push(k); });
  });
  return out;
}

function sendWeeklyReport(user, p){
  var thisFrom = p.from, thisTo = p.to;
  var nextFrom = addDaysISO(p.from, 7), nextTo = addDaysISO(p.to, 7);
  var option = p.option || 'self';
  var allKeys = xsReadWeeklyAll();   /* ⭐ v7.2: gom cả 3 nguồn */
  var targets = [];
  if(option === 'all'){
    for(var email in USER_MAP){ targets.push({ pic:USER_MAP[email].pic, email:email, title:USER_MAP[email].title }); }
  } else if(option === 'pic'){
    var picName = String(p.toPic||'').trim();
    var em = PIC_EMAIL[picName];
    if(!em) return { ok:false, error:'Không tìm thấy email của '+picName };
    targets.push({ pic:picName, email:em, title:(USER_MAP[em]||{}).title||'' });
  } else if(option === 'dept' || option === 'team'){
    if(!user.email) return { ok:false, error:'Tài khoản '+user.pic+' chưa có email — không gửi được.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title });
  } else {
    if(!user.email) return { ok:false, error:'Tài khoản '+user.pic+' chưa có email — không gửi được.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title, test:true });
  }
  var sent = [];
  targets.forEach(function(t){
    var recipient = { pic:t.pic, email:t.email, title:t.title };
    var thisKeys = filterKeysForPic(allKeys, t.pic, thisFrom, thisTo, 'thisweek');
    var nextKeys = filterKeysForPic(allKeys, t.pic, nextFrom, nextTo, 'nextweek');
    var html = buildCombinedReportHtml(recipient, thisFrom, thisTo, thisKeys, nextFrom, nextTo, nextKeys);
    var blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf')
                .setName('MMH_MKT_Weekly_'+t.pic.replace(/\s+/g,'')+'_'+thisFrom+'.pdf');
    var subject = 'RE: Weekly Report '+t.pic+' — Week '+fmtVN(thisFrom)+'–'+fmtVN(thisTo)+(t.test?' (test)':'');
    var toField, ccField;
    if(t.test){ toField = t.email; ccField = ''; }
    else {
      var rr = reportRecipients(t.pic);
      var toArr = rr.to.filter(function(e,i,a){ return e && a.indexOf(e)===i; });
      var ccArr = rr.cc.filter(function(e,i,a){ return e && toArr.indexOf(e)<0 && a.indexOf(e)===i; });
      toField = toArr.join(','); ccField = ccArr.join(',');
    }
    if(!t.test && t.email && (','+toField+','+ccField+',').indexOf(','+t.email+',')<0) ccField=(ccField?ccField+',':'')+t.email;   /* ⭐ CC chính người báo cáo */
    mmhMail_({
      to: toField, cc: ccField, subject: subject,
      htmlBody: buildCombinedEmailBody(recipient, thisFrom, thisTo, thisKeys, nextFrom, nextTo, nextKeys),
      attachments:[blob], name:t.pic+' (MMH Report Hub)', replyTo:t.email||undefined
    });
    logActivity(t.pic,'report','gửi báo cáo tuần '+fmtVN(thisFrom)+'–'+fmtVN(thisTo),'','');
    sent.push(t.pic);
  });
  return { ok:true, message:
      option==='all' ? ('Đã gửi báo cáo tuần cho '+sent.length+' PIC')
    : (option==='dept'||option==='team') ? ('Đã gửi báo cáo tuần của '+user.pic+' tới team (CC: Ha, Hoa, Tuyen)')
    : ('Đã gửi báo cáo tuần (thử) tới '+sent[0]) };
}
function subPctGS(s){
  if(/complet/i.test(s.status)) return 100;
  if(/cancel/i.test(s.status)) return 0;
  return pct100(s.progress);
}
function isOverdueGS(s){
  var st=String(s.status||'');
  if(/complet/i.test(st)||/cancel/i.test(st)) return false;
  var eff=s.revised||s.planned||'';
  if(!eff) return false;
  return String(eff).slice(0,10) < todayISO();
}
function emailProgBar(pct){
  var p=Math.max(0,Math.min(100,pct));
  var color = p>0 ? progColor(p) : '#C9D2E0';
  var fill = p<=0 ? '' : '<td width="'+p+'%" style="background:'+color+';height:11px;line-height:11px;font-size:0;border-radius:6px 0 0 6px">&nbsp;</td>';
  var empty = p>=100 ? '' : '<td width="'+(100-p)+'%" style="background:#E3E9F4;height:11px;line-height:11px;font-size:0">&nbsp;</td>';
  return '<table cellpadding="0" cellspacing="0" style="width:88px;border-collapse:collapse;border-radius:6px;overflow:hidden;table-layout:fixed">'
    +'<tr>'+fill+empty+'</tr></table>'
    +'<div style="font-size:9pt;font-weight:700;color:'+(p>0?color:'#0E2F5F')+';text-align:center;margin-top:2px">'+p+'%</div>';
}
function weeklyEmailTable(keys, isNext){
  function statusStyle(st){
    if(/complet/i.test(st)) return 'color:#1E6B3A;font-weight:700';
    if(/progress/i.test(st)) return 'color:#0E2F5F;font-weight:700';
    if(/cancel/i.test(st)) return 'color:#8A1C1C;font-weight:700';
    return 'color:#5A6A8A';
  }
  var colCount = 7;
  var bodyRows = '';
  keys.forEach(function(k){
    bodyRows +=
      '<tr style="background:#EEF3FB">'+
        '<td style="padding:6px 9px;font-weight:700;color:#0E2F5F" colspan="'+colCount+'">'+(k.__src?'<span style="display:inline-block;background:#0E2F5F;color:#fff;border-radius:4px;padding:1px 6px;font-size:8.5pt;font-weight:700;margin-right:6px">'+esc(k.__src)+'</span>':'')+esc(k.no)+' &nbsp; '+esc(k.keyTask)+' &nbsp;<span style="font-weight:800;color:'+progColor(ktPctShown(k))+'">'+ktPctShown(k)+'%</span></td>'+
      '</tr>';
    (k.subs||[]).forEach(function(s){
      var eff = s.revised || s.planned;
      var pct = subPctGS(s);
      var od = isOverdueGS(s);
      var rowBg = od ? 'background:#FFECEC;' : '';
      var odTag = od ? ' <span style="background:#D9433F;color:#fff;font-size:8pt;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap">QUÁ HẠN</span>' : '';
      bodyRows +=
        '<tr style="'+rowBg+'">'+
          '<td style="padding:6px 9px;color:#8A97B5;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7">'+esc(s.no)+'</td>'+
          '<td style="padding:6px 9px;border-top:1px solid #EEF1F7">'+esc(s.name||s.subTask)+odTag+'</td>'+
          '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7">'+esc(fmtVN(isNext ? (s.start||eff) : s.start))+'</td>'+
          '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7;'+(od?'color:#D9433F;font-weight:700':'')+'">'+esc(fmtVN(eff))+'</td>'+
          '<td style="padding:6px 9px;text-align:center;border-top:1px solid #EEF1F7">'+emailProgBar(pct)+'</td>'+
          '<td style="padding:6px 9px;border-top:1px solid #EEF1F7;font-size:9.5pt;line-height:1.5">'+cellRich(s.result||'')+'</td>'+
          '<td style="padding:6px 9px;text-align:center;white-space:nowrap;border-top:1px solid #EEF1F7;'+statusStyle(s.status)+'">'+esc(s.status||'—')+'</td>'+
        '</tr>';
    });
  });
  if(!bodyRows) bodyRows = '<tr><td colspan="'+colCount+'" style="padding:14px;text-align:center;color:#8A97B5">'+(isNext?'No planned task for next week.':'No task recorded for this week.')+'</td></tr>';
  var head3 = isNext ? 'Planned start' : 'Start date';
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">'+
    '<thead><tr style="background:#0E2F5F;color:#fff">'+
      '<th style="padding:7px 9px;width:42px;text-align:center">No.</th>'+
      '<th style="padding:7px 9px;text-align:left">Sub Task</th>'+
      '<th style="padding:7px 9px;width:82px;text-align:center">'+head3+'</th>'+
      '<th style="padding:7px 9px;width:82px;text-align:center">Deadline</th>'+
      '<th style="padding:7px 9px;width:100px;text-align:center">Tiến độ</th>'+
      '<th style="padding:7px 9px;text-align:left">Plan &amp; result</th>'+
      '<th style="padding:7px 9px;width:92px;text-align:center">Status</th>'+
    '</tr></thead><tbody>'+bodyRows+'</tbody></table>';
}
function cellRich(txt){
  txt=String(txt||'').trim();
  if(!txt) return '<span style="color:#B0B8C8">—</span>';
  var safe=esc(txt);
  safe=safe.replace(/^([^\n:]{1,32}:)/gm,'<b>$1</b>');
  safe=safe.replace(/\n/g,'<br>');
  return safe;
}
function buildCombinedEmailBody(user, tFrom, tTo, tKeys, nFrom, nTo, nKeys){
  return '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.5">'+
      '<p style="margin:0 0 10px">Dear all,</p>'+
      '<p style="margin:0 0 12px">Please find below my weekly report and the plan for next week.</p>'+
      '<p style="margin:0 0 12px"><b>Report by:</b> '+esc(user.pic)+(user.title?' ('+esc(user.title)+')':'')+'</p>'+
      '<h3 style="margin:14px 0 6px;font-size:12.5pt;color:#0E2F5F;border-left:4px solid #3A5CAA;padding-left:8px">\u2460 This week ('+fmtVN(tFrom)+' – '+fmtVN(tTo)+')</h3>'+
      weeklyEmailTable(tKeys, false)+
      '<h3 style="margin:18px 0 6px;font-size:12.5pt;color:#0E2F5F;border-left:4px solid #FFB300;padding-left:8px">\u2461 Plan for next week ('+fmtVN(nFrom)+' – '+fmtVN(nTo)+')</h3>'+
      weeklyEmailTable(nKeys, true)+
      '<p style="margin:16px 0 2px">Best regards,</p>'+
      '<p style="margin:0"><b>'+esc(user.pic)+'</b>'+(user.title?' \u2014 '+esc(user.title):'')+'</p>'+
      '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi \u00b7 Marketing &amp; Product</p>'+
    '</div>';
}
function pdfProgBar(pct){
  var p=Math.max(0,Math.min(100,Math.round(pct)));
  var color = p>0 ? progColor(p) : '#C9D2E0';
  return '<div style="background:#E3E9F4;border-radius:6px;height:10px;width:100%;overflow:hidden">'+
      '<div style="background:'+color+';width:'+p+'%;height:10px;border-radius:6px"></div>'+
    '</div>'+
    '<div style="font-size:8.5px;font-weight:700;color:'+(p>0?color:'#0E2F5F')+';text-align:center;margin-top:2px">'+p+'%</div>';
}
/* ⭐ v8.1: % hiển thị của key task — ưu tiên giá trị đã tính trên TOÀN BỘ sub-task */
function ktPctShown(k){ return (k && k.__kpct!=null) ? k.__kpct : ktPctGS(k); }
function ktPctGS(k){
  var subs=k.subs||[];
  if(!subs.length) return subPctGS(k);
  var act=subs.filter(function(s){ return !/cancel/i.test(s.status); });
  if(!act.length) return 0;
  var sum=0; act.forEach(function(s){ sum+=subPctGS(s); });
  return Math.round(sum/act.length);
}
function weeklyPdfBlocks(keys, isNext){
  function statusColor(st){ return /complet/i.test(st)?'#1E6B3A':/progress/i.test(st)?'#0E2F5F':/cancel/i.test(st)?'#8A1C1C':'#5A6A8A'; }
  var blocks='', totalSubs=0, overdueCnt=0;
  keys.forEach(function(k){
    var items=k.subs||[]; totalSubs+=items.length;
    var rowsHtml = items.length ? items.map(function(s){
        var eff = s.revised || s.planned;
        var pct = subPctGS(s);
        var od = isOverdueGS(s); if(od) overdueCnt++;
        return '<tr'+(od?' class="od"':'')+'>'+
          '<td style="text-align:center;white-space:nowrap">'+esc(s.no)+'</td>'+
          '<td>'+esc(s.name||s.subTask)+(od?' <span class="odtag">QUÁ HẠN</span>':'')+'</td>'+
          '<td style="white-space:nowrap;text-align:center">'+esc(fmtVN(isNext ? (s.start||eff) : s.start))+'</td>'+
          '<td style="white-space:nowrap;text-align:center'+(od?';color:#D9433F;font-weight:700':'')+'">'+esc(fmtVN(eff))+'</td>'+
          '<td style="text-align:center">'+pdfProgBar(pct)+'</td>'+
          '<td class="res">'+cellRich(s.result||'')+'</td>'+
          '<td style="color:'+statusColor(s.status)+';font-weight:600;white-space:nowrap;text-align:center">'+esc(s.status||'—')+'</td>'+
        '</tr>';
      }).join('')
      : '<tr><td colspan="7" style="color:#8A97B5;text-align:center">'+(isNext?'No planned sub-task':'No sub-task this week')+'</td></tr>';
    blocks +=
      '<div class="kt">'+
        '<div class="kt-h">'+
          '<span class="kt-no">'+esc(k.no)+'</span>'+
          '<span class="kt-name">'+esc(k.keyTask)+'</span>'+
          (k.type?'<span class="kt-type">'+esc(k.type)+'</span>':'')+
          '<span class="kt-pct-badge" style="color:'+progColor(ktPctShown(k))+'">'+ktPctShown(k)+'%</span>'+
          '<span class="kt-pic">PIC: '+esc(k.pic||'—')+'</span>'+
        '</div>'+
        '<table><thead><tr>'+
          '<th style="width:5%">No.</th><th style="width:26%">Sub Task</th>'+
          '<th style="width:9%">'+(isNext?'Planned start':'Start date')+'</th>'+
          '<th style="width:9%">Deadline</th><th style="width:11%">Tiến độ</th>'+
          '<th style="width:28%">Plan &amp; result</th><th style="width:12%">Status</th>'+
        '</tr></thead><tbody>'+rowsHtml+'</tbody></table>'+
      '</div>';
  });
  if(!blocks) blocks = '<p style="color:#5A6A8A;font-size:11px">'+(isNext?'No planned task for next week.':'No task recorded for this week.')+'</p>';
  return { blocks:blocks, keyCount:keys.length, totalSubs:totalSubs, overdue:overdueCnt };
}
function buildCombinedReportHtml(user, tFrom, tTo, tKeys, nFrom, nTo, nKeys){
  var t = weeklyPdfBlocks(tKeys, false);
  var n = weeklyPdfBlocks(nKeys, true);
  var issued = fmtVN(todayISO());
  return '<html><head><meta charset="utf-8"><style>'+
    '@page{size:A4 landscape;margin:11mm}'+
    'body{font-family:Aptos,\'Segoe UI\',Calibri,Arial,sans-serif;color:#1A2340;font-size:10px;margin:0}'+
    '.head{border-bottom:2.5px solid #0E2F5F;padding:0 0 10px;margin-bottom:8px}'+
    '.head h1{font-size:16px;margin:0;color:#0E2F5F;font-weight:700}'+
    '.head .meta{margin:5px 0 0;font-size:10px;color:#41506B}.head .meta b{color:#0E2F5F}'+
    '.sec{margin:12px 0 4px;font-size:13px;font-weight:800;color:#0E2F5F;padding:5px 10px;border-radius:5px;background:#EEF3FB;border-left:4px solid #3A5CAA}'+
    '.sec.next{border-left-color:#FFB300;background:#FFF7E6}'+
    '.summary{display:flex;gap:8px;margin:4px 0 10px}'+
    '.sm{border:1px solid #D4DDEF;border-radius:5px;padding:5px 11px;font-size:9.5px;color:#41506B}'+
    '.sm b{color:#0E2F5F;font-size:12px;display:block}'+
    '.sm.od{border-color:#F3B4B4;background:#FFF3F3}.sm.od b{color:#D9433F}'+
    '.kt{border:1px solid #D4DDEF;border-radius:5px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}'+
    '.kt-h{background:#F1F5FB;padding:7px 12px;display:flex;gap:12px;align-items:center;border-bottom:1px solid #D4DDEF}'+
    '.kt-no{font-weight:700;font-size:11px;color:#0E2F5F;background:#DCE6F4;border-radius:4px;padding:1px 8px}'+
    '.kt-name{font-weight:700;font-size:11.5px;flex:1;color:#0E2F5F}'+
    '.kt-pic{font-size:10px;color:#5A6A8A}'+
    '.kt-type{font-size:9px;background:#E8EDF6;color:#3A5CAA;padding:2px 9px;border-radius:4px;font-weight:600}'+
    '.kt-pct-badge{font-size:10px;font-weight:800;background:#DCE6F4;border-radius:9px;padding:1px 9px}'+
    'table{width:100%;border-collapse:collapse}'+
    'th{background:#0E2F5F;color:#fff;text-align:left;padding:6px 8px;font-size:9px;font-weight:600;border:none}'+
    'td{padding:5px 8px;border:none;border-bottom:1px solid #EEF1F7;vertical-align:top;color:#1A2340;font-size:9.5px}'+
    'td.res{font-size:9px;color:#41506B;line-height:1.5}td.res b{color:#0E2F5F}'+
    'tbody tr:nth-child(even) td{background:#FAFBFD}'+
    'tr.od td{background:#FFECEC!important}'+
    '.odtag{background:#D9433F;color:#fff;font-size:7.5px;font-weight:700;padding:1px 5px;border-radius:7px;white-space:nowrap}'+
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97B5;border-top:1px solid #E2E8F5;padding-top:7px;display:flex;justify-content:space-between}'+
    '</style></head><body>'+
    '<div class="head"><h1>MANI Medical Hanoi — Weekly Report &amp; Next-Week Plan</h1>'+
      '<div class="meta">Report week: <b>'+fmtVN(tFrom)+' → '+fmtVN(tTo)+'</b> &nbsp;|&nbsp; Issued by: <b>'+esc(user.pic)+'</b>'+(user.title?' ('+esc(user.title)+')':'')+' &nbsp;|&nbsp; Department: Marketing &amp; Product</div>'+
    '</div>'+
    '<div class="sec">\u2460 This week ('+fmtVN(tFrom)+' → '+fmtVN(tTo)+')</div>'+
    '<div class="summary"><div class="sm"><b>'+t.keyCount+'</b>Key tasks</div><div class="sm"><b>'+t.totalSubs+'</b>Sub-tasks</div>'+
      (t.overdue?'<div class="sm od"><b>'+t.overdue+'</b>Quá hạn</div>':'')+'</div>'+
    t.blocks+
    '<div class="sec next">\u2461 Plan for next week ('+fmtVN(nFrom)+' → '+fmtVN(nTo)+')</div>'+
    '<div class="summary"><div class="sm"><b>'+n.keyCount+'</b>Key tasks</div><div class="sm"><b>'+n.totalSubs+'</b>Planned sub-tasks</div></div>'+
    n.blocks+
    '<div class="foot"><span>Auto-generated by MMH Report Hub.</span><span>issued '+issued+'</span></div>'+
    '</body></html>';
}
function todayISO(){ var d = new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

/* ══════════════ MONTHLY REPORT ══════════════ */
function nextMonthStr(month){
  var y=parseInt(month.slice(0,4),10), m=parseInt(month.slice(4,6),10);
  m++; if(m>12){ m=1; y++; }
  return y+('0'+m).slice(-2);
}
function sendMonthlyReport(user, p){
  var month = String(p.month||'').replace(/\D/g,'').slice(0,6);
  if(!month){ return { ok:false, error:'Thiếu tháng báo cáo' }; }
  var nMonth = nextMonthStr(month);
  var option = p.option || 'self';
  var allData = readMonthly();
  var thisData = allData.filter(function(r){ return r.month===month; });
  var nextData = allData.filter(function(r){ return r.month===nMonth; });
  var mLabel=month.slice(4,6)+'/'+month.slice(0,4), nLabel=nMonth.slice(4,6)+'/'+nMonth.slice(0,4);

  if(option==='download'){
    var htmlThis = buildMonthlyAllHtml(user, month, thisData, false);
    var htmlNext = buildMonthlyAllHtml(user, nMonth, nextData, true);
    var blobThis = HtmlService.createHtmlOutput(htmlThis).getBlob().getAs('application/pdf').setName('MMH_MKT_Monthly_'+month+'.pdf');
    var blobNext = HtmlService.createHtmlOutput(htmlNext).getBlob().getAs('application/pdf').setName('MMH_MKT_Monthly_'+nMonth+'_Plan.pdf');
    return { ok:true, download:true,
      files:[
        { name:'MMH_MKT_Monthly_'+month+'.pdf', b64: Utilities.base64Encode(blobThis.getBytes()) },
        { name:'MMH_MKT_Monthly_'+nMonth+'_Plan.pdf', b64: Utilities.base64Encode(blobNext.getBytes()) }
      ],
      message:'Đã tạo 2 file PDF: tháng '+mLabel+' và tháng '+nLabel };
  }
  var targets=[];
  if(option==='all'){
    for(var email in USER_MAP){ targets.push({ pic:USER_MAP[email].pic, email:email, title:USER_MAP[email].title }); }
  } else if(option==='pic'){
    var pn=String(p.toPic||'').trim(); var em=PIC_EMAIL[pn];
    if(!em) return { ok:false, error:'Không tìm thấy email của '+pn };
    targets.push({ pic:pn, email:em, title:(USER_MAP[em]||{}).title||'' });
  } else if(option==='dept'||option==='team'){
    if(!user.email) return { ok:false, error:'Tài khoản '+user.pic+' chưa có email.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title });
  } else {
    if(!user.email) return { ok:false, error:'Tài khoản '+user.pic+' chưa có email.' };
    targets.push({ pic:user.pic, email:user.email, title:user.title, test:true });
  }
  var sent=[];
  targets.forEach(function(t){
    var tp=String(t.pic).trim().toLowerCase();
    var tRows=thisData.filter(function(r){ return String(r.pic||'').trim().toLowerCase()===tp; });
    var nRows=nextData.filter(function(r){ return String(r.pic||'').trim().toLowerCase()===tp; });
    var recipient={ pic:t.pic, email:t.email, title:t.title };
    var html = buildMonthlyHtml(recipient, month, nMonth, tRows, nRows);
    var blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf')
                .setName('MMH_MKT_Monthly_'+t.pic.replace(/\s+/g,'')+'_'+month+'.pdf');
    var toField, ccField;
    if(t.test){ toField=t.email; ccField=''; }
    else {
      var rr=reportRecipients(t.pic);
      var toArr=rr.to.filter(function(e,i,a){ return e && a.indexOf(e)===i; });
      var ccArr=rr.cc.filter(function(e,i,a){ return e && toArr.indexOf(e)<0 && a.indexOf(e)===i; });
      toField=toArr.join(','); ccField=ccArr.join(',');
    }
    if(!t.test && t.email && (','+toField+','+ccField+',').indexOf(','+t.email+',')<0) ccField=(ccField?ccField+',':'')+t.email;   /* ⭐ CC chính người báo cáo */
    mmhMail_({
      to:toField, cc:ccField,
      subject:'RE: Monthly Report '+t.pic+' — '+mLabel+' & plan '+nLabel+(t.test?' (test)':''),
      htmlBody: buildMonthlyEmailBody(recipient, mLabel, nLabel, tRows, nRows),
      attachments:[blob], name:t.pic+' (MMH Report Hub)', replyTo:t.email||undefined
    });
    logActivity(t.pic,'report','gửi báo cáo tháng '+mLabel,'','');
    sent.push(t.pic);
  });
  return { ok:true, message:
      option==='all' ? ('Đã gửi báo cáo tháng cho '+sent.length+' PIC')
    : (option==='dept'||option==='team') ? ('Đã gửi báo cáo tháng của '+user.pic+' tới team (CC: Ha, Hoa, Tuyen)')
    : ('Đã gửi báo cáo tháng (thử) tới '+sent[0]) };
}
function typeOrderIdx(t){ return 99; }
function fullName(pic){ return pic||''; }
function buildMonthlyAllHtml(user, month, rows, isNext){
  var mLabel=month.slice(4,6)+'/'+month.slice(0,4);
  var groups={}, order=[];
  rows.forEach(function(r){
    var t=String(r.typeTask||'—').trim();
    if(!groups[t]){ groups[t]={type:t, items:[]}; order.push(t); }
    groups[t].items.push(r);
  });
  order.sort(function(a,b){ return a.localeCompare(b); });
  var secNo=0;
  var body=order.map(function(t){
    secNo++;
    var g=groups[t];
    var blocks=g.items.map(function(r,i){
      var picBadge = r.pic ? '<span class="kt-pic">PIC: '+esc(r.pic)+'</span>' : '';
      return '<div class="kt-block">'+
          '<div class="kt-line"><span class="kt-idx">'+(i+1)+'/'+g.items.length+'</span>'+
            '<span class="kt-name">'+esc(r.keyTask||'')+'</span>'+picBadge+'</div>'+
          '<div class="pr-cell">'+cellRich(r.text||'')+'</div>'+
        '</div>';
    }).join('');
    return '<div class="type-sec"><div class="type-h"><span class="type-no">'+secNo+'</span>'+esc(t)+
      ' <span class="type-n">('+g.items.length+' key task)</span></div>'+blocks+'</div>';
  }).join('');
  if(!body) body='<p style="color:#5A6A8A">Không có công việc trong tháng này.</p>';
  var reportTitle = isNext ? 'Monthly Plan' : 'Monthly Report';
  return '<html><head><meta charset="utf-8"><style>'+
    '@page{size:A4 portrait;margin:13mm}'+
    'body{font-family:Aptos,\'Segoe UI\',Calibri,Arial,sans-serif;color:#1A2340;font-size:10px;margin:0}'+
    '.head{border-bottom:2.5px solid #0E2F5F;padding:0 0 10px;margin-bottom:12px}'+
    '.head h1{font-size:15px;margin:0 0 4px;color:#0E2F5F;font-weight:700}'+
    '.head .meta{margin:0;font-size:10.5px;color:#41506B;line-height:1.55}.head .meta b{color:#0E2F5F}'+
    '.type-sec{margin-bottom:14px}'+
    '.type-h{font-size:12.5px;font-weight:800;color:#0E2F5F;background:#EEF3FB;padding:8px 12px;border-radius:5px;border-left:4px solid #3A5CAA;margin-bottom:8px;page-break-after:avoid}'+
    '.type-no{display:inline-block;background:#0E2F5F;color:#fff;font-size:10px;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;margin-right:8px}'+
    '.type-n{font-weight:500;color:#5A6A8A;font-size:10px}'+
    '.kt-block{margin:0 0 9px;padding:0 0 0 6px}'+
    '.kt-line{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;page-break-after:avoid}'+
    '.kt-idx{font-size:9px;font-weight:700;color:#3A5CAA;background:#E8EEF9;border-radius:4px;padding:1px 7px;white-space:nowrap}'+
    '.kt-name{font-weight:700;font-size:11px;color:#0E2F5F;flex:1}'+
    '.kt-pic{font-size:9px;color:#5A6A8A;white-space:nowrap;background:#F1F5FB;border-radius:4px;padding:1px 8px}'+
    '.pr-cell{font-size:9px;color:#41506B;line-height:1.55;background:#FCFDFE;border:1px solid #EEF1F7;border-radius:5px;padding:8px 11px;margin-left:2px}'+
    '.pr-cell b{color:#0E2F5F}'+
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97B5;border-top:1px solid #E2E8F5;padding-top:7px;text-align:right}'+
    '</style></head><body>'+
    '<div class="head"><h1>'+reportTitle+' — Marketing &amp; Product Team</h1>'+
      '<div class="meta">Issued by: <b>'+esc(user.pic)+'</b><br>Period: <b>'+mLabel+'</b><br>Department: <b>Vietnam Sales &amp; Marketing</b></div></div>'+
    body+
    '<div class="foot">MMH Report Hub · xuất '+fmtVN(todayISO())+'</div></body></html>';
}
function monthlyEmailTable(rows, isNext){
  var body=rows.map(function(r){
    var txt=String(r.text||'').trim();
    return '<tr>'+
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;color:#3A5CAA;white-space:nowrap">'+esc(r.typeTask)+'</td>'+
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;font-weight:600">'+esc(r.keyTask||'')+'</td>'+
      (isNext ? '' : '<td style="border:1px solid #D8E0EF;padding:6px 9px;white-space:pre-wrap">'+(txt?esc(txt).replace(/\n/g,'<br>'):'<span style="color:#9AA3B5">—</span>')+'</td>')+
      '<td style="border:1px solid #D8E0EF;padding:6px 9px;text-align:center;white-space:nowrap">'+esc(r.pic||'')+'</td>'+
    '</tr>';
  }).join('');
  var colN = isNext?3:4;
  if(!body) body='<tr><td colspan="'+colN+'" style="border:1px solid #D8E0EF;padding:12px;text-align:center;color:#8A97B5">'+(isNext?'No plan for next month.':'No item for this month.')+'</td></tr>';
  return '<table style="border-collapse:collapse;width:100%;font-size:10.5pt;margin-bottom:6px">'+
    '<thead><tr style="background:#0E2F5F;color:#fff">'+
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;text-align:left;width:170px">Type</th>'+
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;text-align:left">Key Task</th>'+
      (isNext?'':'<th style="border:1px solid #0E2F5F;padding:7px 9px;text-align:left">Result</th>')+
      '<th style="border:1px solid #0E2F5F;padding:7px 9px;width:90px">PIC</th>'+
    '</tr></thead><tbody>'+body+'</tbody></table>';
}
function buildMonthlyEmailBody(user, mLabel, nLabel, tRows, nRows){
  return '<div style="font-family:Aptos,Calibri,\'Segoe UI\',Arial,sans-serif;font-size:11pt;color:#1A2340;line-height:1.5">'+
    '<p style="margin:0 0 4px"><b>Report by:</b> '+esc(user.pic)+(user.title?' ('+esc(user.title)+')':'')+'</p>'+
    '<div style="border-left:4px solid #0E2F5F;padding-left:10px;margin:14px 0 8px"><b style="font-size:12pt;color:#0E2F5F">\u2460 Kết quả tháng '+esc(mLabel)+'</b></div>'+
    monthlyEmailTable(tRows,false)+
    '<div style="border-left:4px solid #3A5CAA;padding-left:10px;margin:18px 0 8px"><b style="font-size:12pt;color:#3A5CAA">\u2461 Kế hoạch tháng '+esc(nLabel)+'</b></div>'+
    monthlyEmailTable(nRows,true)+
    '<p style="margin:16px 0 2px">Best regards,</p>'+
    '<p style="margin:0"><b>'+esc(user.pic)+'</b>'+(user.title?' \u2014 '+esc(user.title):'')+'</p>'+
    '<p style="margin:0;color:#5A6A8A;font-size:10pt">MANI Medical Hanoi \u00b7 Marketing &amp; Product</p></div>';
}
function monthlyPdfBlocks(rows, isNext){
  var blocks=rows.map(function(r){
    var txt=String(r.text||'').trim();
    var bodyTxt = isNext ? '' : (txt?esc(txt).replace(/\n/g,'<br>'):'<span style="color:#8A97B5">— no content —</span>');
    return '<div class="mr"><div class="mr-h"><span class="mr-t">'+esc(r.typeTask)+'</span><span class="mr-k">'+esc(r.keyTask||'')+'</span><span class="mr-pic">PIC: '+esc(r.pic||'—')+'</span></div>'+
      (isNext?'':'<div class="mr-b">'+bodyTxt+'</div>')+'</div>';
  }).join('');
  if(!blocks) blocks='<p style="color:#5A6A8A;font-size:10px">'+(isNext?'No plan for next month.':'No item recorded for this month.')+'</p>';
  return blocks;
}
function buildMonthlyHtml(user, month, nMonth, tRows, nRows){
  var mLabel=month.slice(4,6)+'/'+month.slice(0,4), nLabel=nMonth.slice(4,6)+'/'+nMonth.slice(0,4);
  return '<html><head><meta charset="utf-8"><style>'+
    '@page{size:A4 portrait;margin:14mm}'+
    'body{font-family:Aptos,\'Segoe UI\',Calibri,Arial,sans-serif;color:#1A2340;font-size:10.5px;margin:0}'+
    '.head{border-bottom:2.5px solid #0E2F5F;padding:0 0 10px;margin-bottom:14px}'+
    '.head h1{font-size:16px;margin:0;color:#0E2F5F;font-weight:700}'+
    '.head .meta{margin:5px 0 0;font-size:10px;color:#41506B}.head .meta b{color:#0E2F5F}'+
    '.sec{margin:6px 0 4px;font-size:12px;font-weight:700;padding:6px 10px;border-radius:4px}'+
    '.sec.this{background:#EAF0FA;color:#0E2F5F;border-left:4px solid #0E2F5F}'+
    '.sec.next{background:#EEF3FB;color:#3A5CAA;border-left:4px solid #3A5CAA}'+
    '.mr{border:1px solid #D4DDEF;border-radius:5px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}'+
    '.mr-h{background:#F1F5FB;padding:7px 12px;border-bottom:1px solid #D4DDEF;display:flex;gap:10px;align-items:center}'+
    '.mr-t{font-size:9px;background:#DCE6F4;color:#0E2F5F;padding:2px 9px;border-radius:4px;font-weight:700}'+
    '.mr-k{font-weight:700;font-size:11.5px;color:#0E2F5F;flex:1}'+
    '.mr-pic{font-size:9px;color:#5A6A8A}'+
    '.mr-b{padding:10px 12px;font-size:10px;line-height:1.6;color:#1A2340;white-space:pre-wrap}'+
    '.foot{margin-top:10px;font-size:8.5px;color:#8A97B5;border-top:1px solid #E2E8F5;padding-top:7px;text-align:right}'+
    '</style></head><body>'+
    '<div class="head"><h1>MANI Medical Hanoi — Monthly Report</h1>'+
      '<div class="meta">Issued by: <b>'+esc(user.pic)+'</b>'+(user.title?' ('+esc(user.title)+')':'')+' &nbsp;|&nbsp; Department: Marketing &amp; Product</div></div>'+
    '<div class="sec this">\u2460 Kết quả tháng '+mLabel+'</div>'+ monthlyPdfBlocks(tRows,false)+
    '<div class="sec next">\u2461 Kế hoạch tháng '+nLabel+'</div>'+ monthlyPdfBlocks(nRows,true)+
    '<div class="foot">MANI Medical Hanoi — Report Hub · issued '+fmtVN(todayISO())+'</div>'+
    '</body></html>';
}

/* ══════════════ UTILS ══════════════ */
function inWeek(dateStr, from, to){ if(!dateStr) return false; var s=String(dateStr).slice(0,10); return s>=from && s<=to; }
function fmtVN(iso){ if(!iso) return ''; var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso)); return m ? (m[3]+'/'+m[2]+'/'+m[1]) : String(iso); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }