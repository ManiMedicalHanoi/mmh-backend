/*═══════════════════════════════════════════════════════════════════════════════════════
  MMH REPORT HUB — FILE BỔ SUNG DÙNG CHUNG  (v12.9 — TĂNG TỐC xem / sửa / xoá / báo cáo công tác · v12.8 — SỬA / XOÁ chuyến công tác từ web · đề xuất: chọn nhiều điểm đến/người đi cùng, chi phí theo dòng · NHẬP BÁO CÁO CÔNG TÁC từ web)
  ① ĐỒNG BỘ LỊCH CÔNG TÁC   : file "Vietnam - Business trip Approval and Report" ➜ sheet WEEKLY
  ② ĐỀ XUẤT CÔNG TÁC TỪ WEB : ghi 1 dòng mới vào "MMH Travel report" + gửi email xin duyệt
                               (đúng mẫu email / người nhận của hệ thống Business Trip hiện tại);
                               cấp quản lý vẫn DUYỆT bằng HOD Menu trên Google Sheet như cũ.
  ③ GỬI EMAIL GIAO VIỆC      : email văn bản thường (không HTML), soạn ngay trên web
  ④ BÁO CÁO CÔNG TÁC TỪ WEB  : (chỉ chuyến đã Approved) — giống nút "Generate & Save Report" của
                               hệ thống Business Trip: tạo file Google Doc báo cáo trong folder chuyến đi,
                               ghi cột R (Report) + cột U (ngày báo cáo), gửi email báo cáo To Director / CC HOD.
                               ⚠️ Sau khi cập nhật: chạy tay hàm rhxAuthorize 1 lần để cấp quyền Drive + Docs.

  CÁCH CÀI: trong MỖI project Apps Script của Report Hub (Marketing & Sales, Back Office):
     + (dấu cộng) ▸ Script ▸ đặt tên "ReportHub_Trip_Mail" ▸ dán TOÀN BỘ file này ▸ Lưu
     Chọn hàm  installTripTriggers  ▸ Run 1 lần (cấp quyền) ▸ Deploy ▸ New version.
  ĐIỀU KIỆN: tài khoản đang deploy Web App phải có quyền SỬA file Business Trip.

  Dòng do hệ thống tạo trên sheet WEEKLY được đánh dấu ở cột W (= "trip" / "trip-key")
  và cột X (thông tin nhận dạng). ĐỪNG xoá 2 cột này. Các dòng này CHỈ ĐỌC trên web:
  muốn sửa thì sửa trên file Business Trip, hệ thống tự đồng bộ lại.
═══════════════════════════════════════════════════════════════════════════════════════*/

var RHX = {
  TRIP_SHEET_ID : '15dAQYOG1aJRX-jByVmRFeSFOIPRtdVW7wDvwC_nxJUA',
  TRIP_NAMES    : ['MMH Travel report'],
  TRIP_START    : 4,                       // đọc từ dòng 4 (header dòng 3; dòng 4 là dòng "Auto")
  TRIP_WRITE_START : 5,                    // ⭐ v11.2: dòng dữ liệu đầu tiên — nơi các ARRAYFORMULA bắt đầu
  /* ⭐ v11.2: các cột do CÔNG THỨC MẢNG tự tính trên file Business Trip — TUYỆT ĐỐI không ghi đè
     (B No · C Month · G Working date · P Folder name · Y–AB email) */
  TRIP_AUTO_COLS : { 2:1, 3:1, 7:1, 16:1, 25:1, 26:1, 27:1, 28:1 },
  // cột (1-based) trên sheet "MMH Travel report" — khớp CONFIG của hệ thống Business Trip
  T: { NO:2, MONTH:3, PIC:4, START:5, FINISH:6, DAYS:7, DEST:8, CO:9, PURPOSE:10, EXPECT:11,
       ESTCOST:12, TOTAL:13, SCHEDULE:14, EQUIP:15, FOLDER_NAME:16, FOLDER_LINK:17, REPORT:18,
       APPROVAL:19, COMMENT:20, REPORT_DATE:21, EMAIL_PIC:25, EMAIL_HOD:26, EMAIL_DIRECTOR:27, EMAIL_CC:28 },
  PARENT_FOLDER_ID : '1HMrQ4xZWSEUIvD7varHG-m4s4nOKpX1o',   // ⭐ v12.6: folder gốc chứa folder từng chuyến (CONFIG.PARENT_FOLDER_ID của hệ thống Business Trip)
  COL_FLAG : 23,                           // W trên sheet WEEKLY: "trip" | "trip-key"
  COL_META : 24,                           // X trên sheet WEEKLY: JSON nhận dạng
  KEY_TYPE_HINT : /trip|công tác|cong tac|travel/i,   // loại việc: lấy từ danh sách chọn có sẵn (Master) nếu khớp
  WINDOW_BACK_MONTHS : 2,                  // đồng bộ chuyến đi từ 2 tháng trước …
  WINDOW_FWD_MONTHS  : 6,                  // … tới 6 tháng sau
  /* Tên PIC khác nhau giữa 2 hệ thống (Business Trip  ➜  Report Hub) */
  NAME_TO_HUB : { 'Minh Viet':'Viet', 'Bui Trang':'Trang' },
  NAME_TO_TRIP: { 'Viet':'Minh Viet', 'Trang':'Bui Trang' }
};

/* PIC nào hiện ở backend nào (theo title / phòng ban trong USER_MAP của project này)
   · Marketing & Sales : phòng Sales & Marketing VN (trừ Director)
   · Back Office       : phòng Back-office
   · Management        : Director                                                           */
function rhxInScope(hubPic){
  var u = null;
  for(var e in USER_MAP){ if(String(USER_MAP[e].pic).toLowerCase() === String(hubPic).toLowerCase()){ u = USER_MAP[e]; break; } }
  if(!u) return false;
  var src = (typeof SOURCE !== 'undefined') ? SOURCE : '';
  if(src === 'marketing')  return /sales\s*&\s*marketing/i.test(u.dept) && u.level !== 'director';
  if(src === 'backoffice') return /back.?office/i.test(u.dept);
  if(src === 'management') return u.level === 'director';
  return false;
}
function rhxHubName(tripPic){ var p = String(tripPic||'').trim(); return RHX.NAME_TO_HUB[p] || p; }
function rhxTripName(hubPic){ var p = String(hubPic||'').trim(); return RHX.NAME_TO_TRIP[p] || p; }

/* ⭐ v11.1: ghi ô AN TOÀN — ô có danh sách chọn (data validation) từ chối giá trị lạ thì bỏ qua,
   không làm dừng cả lần đồng bộ (lỗi "vi phạm quy tắc xác thực dữ liệu"). */
/* Ô có danh sách chọn (Dropdown / Danh sách từ dải ô) — giá trị có nằm trong danh sách không? */
function rhxAllowed(rg, val, dv0){
  try{
    var dv = dv0 !== undefined ? dv0 : rg.getDataValidation(); if(!dv) return true;
    if(dv.getAllowInvalid && dv.getAllowInvalid()) return true;
    var C = SpreadsheetApp.DataValidationCriteria, t = dv.getCriteriaType(), cv = dv.getCriteriaValues(), list = null;
    if(t == C.VALUE_IN_LIST) list = cv[0] || [];
    else if(t == C.VALUE_IN_RANGE){ list = []; (cv[0].getValues()||[]).forEach(function(r){ r.forEach(function(x){ list.push(x); }); }); }
    else return true;                                  /* kiểu khác (ngày, số…) → để Sheets tự kiểm */
    var v = String(val).trim().toLowerCase();
    for(var i=0;i<list.length;i++){ if(String(list[i]).trim().toLowerCase() === v) return true; }
    return false;
  }catch(e){ return true; }
}
function rhxSet(sh, row, col, val, dv){
  var rg = sh.getRange(row, col);
  /* ⭐ v12.9 — trước đây flush sau MỖI ô (rất chậm). Nay chỉ flush khi ô có danh sách chọn */
  if(dv === undefined){ try{ dv = rg.getDataValidation(); }catch(e){ dv = null; } }
  if(dv && val !== '' && val != null && !(val instanceof Date) && typeof val !== 'number' && !rhxAllowed(rg, val, dv)){
    try{ Logger.log('Bỏ qua ô ' + rg.getA1Notation() + ' — danh sách chọn không có "' + val + '"'); }catch(_){}
    return false;
  }
  try{ rg.setValue(val); if(dv) SpreadsheetApp.flush(); return true; }   /* ô có danh sách chọn: flush ngay để lỗi (nếu có) nổ trong try */
  catch(e){
    if(/xác thực|validation|vi phạm|violates/i.test(String(e && e.message || e))){
      try{ Logger.log('Bỏ qua ô ' + sh.getRange(row, col).getA1Notation() + ' (danh sách chọn không có "' + val + '")'); }catch(_){}
      return false;
    }
    throw e;
  }
}
/* Ghi 1 dòng WEEKLY (thay cho writeWeekly — tránh lỗi danh sách chọn) */
function rhxWriteRow(sh, row, o){
  var picCol = (typeof weeklyPicCol === 'function') ? weeklyPicCol() : 8;
  var D = null; try{ D = sh.getRange(row, 1, 1, 15).getDataValidations()[0]; }catch(e){}   /* ⭐ v12.9 — đọc 1 lần cho cả dòng */
  var dv = function(c){ return D ? (D[c-1] || null) : undefined; };
  if(o.type) rhxSet(sh, row, 5, o.type, dv(5));
  if(o.keyTask) rhxSet(sh, row, 6, o.keyTask, dv(6));
  if(o.subTask) rhxSet(sh, row, 7, o.subTask, dv(7));
  if(o.pic) rhxSet(sh, row, picCol, o.pic, dv(picCol));
  if(o.result) rhxSet(sh, row, 9, o.result, dv(9));
  if(o.start) rhxSet(sh, row, 10, o.start, dv(10));
  if(o.planned) rhxSet(sh, row, 11, o.planned, dv(11));
  if(o.status) rhxSet(sh, row, 14, o.status, dv(14));
  rhxSet(sh, row, 15, (o.progress||0)/100, dv(15));
}
/* Loại việc cho key "Lịch công tác": chọn trong danh sách có sẵn, không có thì để trống */
function rhxTripType(){
  try{
    var opts = (typeof readTypeOptions === 'function') ? readTypeOptions() : [];
    for(var i=0;i<opts.length;i++){ if(RHX.KEY_TYPE_HINT.test(String(opts[i]))) return opts[i]; }
  }catch(e){}
  return '';
}

/* ══════════════ ĐIỀU PHỐI (được Code.gs gọi) ══════════════ */
function rhxDispatch(action, user, p){
  switch(action){
    case 'tripSync':    return rhxTripSync(false);
    case 'tripMaster':  return rhxTripMaster(user, p);
    case 'tripPropose': return rhxTripPropose(user, p);
    case 'mailSend':    return rhxMailSend(user, p);
    case 'tripInfo':    return rhxTripInfo(user, p);        /* ⭐ v12.6 */
    case 'tripReport':  return rhxTripReport(user, p);      /* ⭐ v12.6 */
    case 'tripUpdate':  return rhxTripUpdate(user, p);      /* ⭐ v12.8 */
    case 'tripDelete':  return rhxTripDelete(user, p);      /* ⭐ v12.8 */
  }
  return null;
}
/* Dòng WEEKLY do đồng bộ công tác tạo ra → không cho sửa/xoá trên web */
function rhxIsTripRow(sh, row){
  try{ return /^trip/.test(String(sh.getRange(row, RHX.COL_FLAG).getValue()||'')); }catch(e){ return false; }
}
var RHX_LOCK_MSG = 'Lịch công tác được đồng bộ tự động từ file Business Trip — vui lòng cập nhật trên file đó (hệ thống sẽ tự đồng bộ lại).';

/* ══════════════ TIỆN ÍCH ══════════════ */
function rhxTripSheet(){
  var ss = SpreadsheetApp.openById(RHX.TRIP_SHEET_ID);
  for(var i=0;i<RHX.TRIP_NAMES.length;i++){ var s = ss.getSheetByName(RHX.TRIP_NAMES[i]); if(s) return s; }
  return ss.getSheets()[0];
}
function rhxTz(){ try{ return Session.getScriptTimeZone() || 'Asia/Bangkok'; }catch(e){ return 'Asia/Bangkok'; } }
function rhxISO(v){
  if(v == null || v === '') return '';
  if(Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return Utilities.formatDate(v, rhxTz(), 'yyyy-MM-dd');
  var s = String(v).trim(), m;
  if((m = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return m[1]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[3]).slice(-2);
  if((m = s.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return '';
}
function rhxDMY(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m ? (m[3]+'/'+m[2]+'/'+m[1]) : ''; }
function rhxDate(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m ? new Date(+m[1], +m[2]-1, +m[3]) : ''; }
function rhxStr(v){ return v == null ? '' : String(v).trim(); }
function rhxNum(v){ if(typeof v === 'number') return v; var n = parseInt(String(v||'').replace(/[^\d]/g,''),10); return isNaN(n)?0:n; }
function rhxMonthShift(ym, k){ var y = +ym.slice(0,4), m = +ym.slice(4,6)-1+k; var d = new Date(y, m, 1); return d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2); }
function rhxTodayISO(){ return Utilities.formatDate(new Date(), rhxTz(), 'yyyy-MM-dd'); }
function rhxEmailOf(pic){
  for(var e in USER_MAP){ if(String(USER_MAP[e].pic).toLowerCase() === String(pic||'').toLowerCase()) return e; }
  return '';
}

/* ══════════════ ① ĐỌC FILE BUSINESS TRIP ══════════════ */
function rhxReadTrips(){
  var sh = rhxTripSheet(), T = RHX.T;
  var last = sh.getLastRow(); if(last < RHX.TRIP_START) return [];
  var n = last - RHX.TRIP_START + 1;
  var rng = sh.getRange(RHX.TRIP_START, 1, n, 28);
  var vals = rng.getValues();
  var links = null;
  try{ links = sh.getRange(RHX.TRIP_START, T.FOLDER_LINK, n, 1).getRichTextValues(); }catch(e){}
  var out = [];
  for(var i=0;i<vals.length;i++){
    var o = rhxTripObj_(vals[i], RHX.TRIP_START + i, links ? links[i][0] : null);
    if(o) out.push(o);
  }
  return out;
}
/* ⭐ v12.9 — 1 dòng của file Business Trip ⇒ object chuyến đi (dùng chung cho đọc cả file và đọc 1 dòng) */
function rhxTripObj_(r, rowNo, rich){
    var T = RHX.T;
    var pic = rhxStr(r[T.PIC-1]), start = rhxISO(r[T.START-1]);
    if(!pic || !start) return null;
    var link = '';
    try{ if(rich){ link = rich.getLinkUrl() || ''; } }catch(e){}
    if(!link){ var q = rhxStr(r[T.FOLDER_LINK-1]); if(/^https?:\/\//i.test(q)) link = q; }
    return ({
      tripRow: rowNo,
      no: rhxStr(r[T.NO-1]).replace(/\.0$/,''),
      pic: pic, hubPic: rhxHubName(pic),
      start: start, finish: rhxISO(r[T.FINISH-1]) || start,
      days: rhxNum(r[T.DAYS-1]),
      dest: rhxStr(r[T.DEST-1]), co: rhxStr(r[T.CO-1]),
      purpose: rhxStr(r[T.PURPOSE-1]), expect: rhxStr(r[T.EXPECT-1]),
      report: rhxStr(r[T.REPORT-1]), approval: rhxStr(r[T.APPROVAL-1]) || 'Not Yet',
      comment: rhxStr(r[T.COMMENT-1]), folder: link,
      estCost: rhxStr(r[T.ESTCOST-1]), total: rhxNum(r[T.TOTAL-1]), schedule: rhxStr(r[T.SCHEDULE-1]),
      equip: rhxStr(r[T.EQUIP-1]), folderName: rhxStr(r[T.FOLDER_NAME-1]), reportDate: rhxISO(r[T.REPORT_DATE-1]),
      emailHod: rhxStr(r[T.EMAIL_HOD-1]), emailDir: rhxStr(r[T.EMAIL_DIRECTOR-1])
    });
}
function rhxReadTripRow_(row){
  var sh = rhxTripSheet(); row = +row || 0;
  if(row < RHX.TRIP_START || row > sh.getLastRow()) return null;
  var v = sh.getRange(row, 1, 1, 28).getValues()[0], rich = null;
  try{ rich = sh.getRange(row, RHX.T.FOLDER_LINK).getRichTextValue(); }catch(e){}
  return rhxTripObj_(v, row, rich);
}
function rhxTripId(t){ return 'T' + (t.no || t.tripRow) + '|' + t.pic; }
function rhxSubName(t){
  var days = t.days || Math.max(1, Math.round((rhxDate(t.finish) - rhxDate(t.start))/86400000) + 1);
  return 'Đi công tác ' + (t.dest || '—') + ' · ' + days + ' ngày · Từ ' + rhxDMY(t.start) + ' đến ' + rhxDMY(t.finish);
}
function rhxSubResult(t){
  var s = 'Kế hoạch công tác\n'
        + '1. Mục đích: ' + (t.purpose || '—') + '\n'
        + '2. Kết quả mong đợi: ' + (t.expect || '—') + '\n'
        + '\nCập nhật\n'
        + (t.report || '(Chưa có Business trip Report)');
  var tail = ['Phê duyệt: ' + t.approval + (t.comment ? ' — ' + t.comment : '')];
  if(t.folder) tail.push('Folder: ' + t.folder);
  return s + '\n\n' + tail.join('\n');
}
/* Trạng thái task ← tình trạng chuyến đi */
function rhxSubStatus(t){
  var today = rhxTodayISO();
  if(/reject|từ chối/i.test(t.approval)) return { status:'Cancelled', pct:0 };
  if(t.report)                            return { status:'Completed', pct:100 };
  if(/approv|duyệt/i.test(t.approval)){
    if(today < t.start)  return { status:'To Do', pct:0 };
    if(today <= t.finish) return { status:'In Progress', pct:50 };
    return { status:'In Progress', pct:75 };            // đã đi xong, chờ báo cáo
  }
  return { status:'To Do', pct:0 };                     // chờ duyệt
}

/* ══════════════ ① ĐỒNG BỘ VÀO SHEET WEEKLY ══════════════
   Mỗi tháng 1 KEY TASK "Lịch công tác MMYYYY", mỗi chuyến đi của PIC thuộc phòng ban này
   là 1 SUB TASK. Thêm mới / cập nhật / xoá theo đúng file Business Trip.                */
function rhxTripSync(fromTrigger){
  if(typeof shWeekly !== 'function') return { ok:false, error:'Thiếu hàm shWeekly trong Code.gs' };
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(20000)) return { ok:false, error:'Hệ thống đang bận, thử lại sau.' };
  var stat = { added:0, updated:0, removed:0, keys:0 };
  try{
    var sh = shWeekly(); if(!sh) return { ok:false, error:'Không tìm thấy sheet WEEKLY' };
    if(sh.getMaxColumns() < RHX.COL_META) sh.insertColumnsAfter(sh.getMaxColumns(), RHX.COL_META - sh.getMaxColumns());
    var thisM = Utilities.formatDate(new Date(), rhxTz(), 'yyyyMM');
    var mFrom = rhxMonthShift(thisM, -RHX.WINDOW_BACK_MONTHS), mTo = rhxMonthShift(thisM, RHX.WINDOW_FWD_MONTHS);
    var trips = rhxReadTrips().filter(function(t){
      var m = t.start.replace(/-/g,'').slice(0,6);
      return m >= mFrom && m <= mTo && rhxInScope(t.hubPic);
    });
    var want = {}; trips.forEach(function(t){ want[rhxTripId(t)] = t; });

    /* --- quét các dòng đồng bộ đang có --- */
    function scan(){
      var last = sh.getLastRow(), res = { keys:{}, subs:{} };
      if(last < WEEKLY_DATA_ROW) return res;
      var v = sh.getRange(WEEKLY_DATA_ROW, 2, last - WEEKLY_DATA_ROW + 1, RHX.COL_META - 1).getValues();
      for(var i=0;i<v.length;i++){
        var flag = String(v[i][RHX.COL_FLAG-2]||''), meta = {};
        if(!/^trip/.test(flag)) continue;
        try{ meta = JSON.parse(String(v[i][RHX.COL_META-2]||'{}')); }catch(e){}
        var row = WEEKLY_DATA_ROW + i;
        if(flag === 'trip-key' && meta.m) res.keys[meta.m] = { row:row, no:normNo(v[i][0]) };
        else if(flag === 'trip' && meta.id) res.subs[meta.id] = { row:row, m:meta.m, vals:v[i] };
      }
      return res;
    }
    var cur = scan();
    var touchedKeys = {};
    var picCol = (typeof weeklyPicCol === 'function') ? weeklyPicCol() : 8;

    /* 1) CẬP NHẬT dòng đã có */
    Object.keys(cur.subs).forEach(function(id){
      var t = want[id]; if(!t) return;
      var r = cur.subs[id], v = r.vals, st = rhxSubStatus(t);
      var name = rhxSubName(t), res = rhxSubResult(t);
      var changed = false, D = null;
      function setIf(col, idx, val, cmp){
        var old = v[idx];
        var same = cmp ? cmp(old, val) : (String(old==null?'':old) === String(val));
        if(same) return;
        if(D === null){ try{ D = sh.getRange(r.row, 1, 1, 15).getDataValidations()[0]; }catch(e){ D = false; } }
        if(rhxSet(sh, r.row, col, val, D ? (D[col-1] || null) : undefined)) changed = true;
      }
      setIf(7,  5, name);
      setIf(picCol, picCol-2, t.hubPic);
      setIf(9,  7, res);
      setIf(10, 8, rhxDate(t.start),  function(a){ return rhxISO(a) === t.start; });
      setIf(11, 9, rhxDate(t.finish), function(a){ return rhxISO(a) === t.finish; });
      setIf(14, 12, st.status);
      setIf(15, 13, st.pct/100, function(a){ return Math.round((Number(a)||0)*100) === st.pct || Number(a) === st.pct; });
      if(changed){ stat.updated++; touchedKeys[r.m] = 1; }
    });

    /* 2) XOÁ dòng không còn trong file công tác (chỉ trong khung thời gian đồng bộ) */
    var dels = [];
    Object.keys(cur.subs).forEach(function(id){
      var r = cur.subs[id];
      if(!want[id] && r.m && r.m >= mFrom && r.m <= mTo) dels.push(r.row);
    });
    dels.sort(function(a,b){ return b-a; }).forEach(function(row){ sh.deleteRow(row); stat.removed++; });
    if(dels.length) cur = scan();

    /* 3) THÊM chuyến đi mới — theo từng tháng */
    var newBy = {};
    trips.forEach(function(t){
      var id = rhxTripId(t); if(cur.subs[id]) return;
      var m = t.start.replace(/-/g,'').slice(0,6);
      (newBy[m] = newBy[m] || []).push(t);
    });
    Object.keys(newBy).sort().forEach(function(m){
      cur = scan();
      var key = cur.keys[m];
      if(!key){
        var krow = firstEmptyContentRow(sh);
        var kpic = rhxKeyPic();
        var wantKno = String(nextKeyNo(sh));
        rhxWriteRow(sh, krow, { type:rhxTripType(), keyTask:'Lịch công tác ' + m.slice(4,6) + m.slice(0,4), pic:kpic,
          start:rhxDate(m.slice(0,4)+'-'+m.slice(4,6)+'-01'), status:'To Do', progress:0 });
        var kno = ensureRowNo(sh, krow, wantKno) || '';
        sh.getRange(krow, RHX.COL_FLAG, 1, 2).setValues([['trip-key', JSON.stringify({ m:m })]]);
        key = { row:krow, no:normNo(sh.getRange(krow,2).getValue()) || kno };
        stat.keys++;
      }
      newBy[m].sort(function(a,b){ return a.start < b.start ? -1 : 1; }).forEach(function(t){
        var info = keyBlockInfo(sh, key.no);
        var after = info.lastRow || key.row;
        sh.insertRowsAfter(after, 1);
        var row = after + 1, st = rhxSubStatus(t);
        rhxWriteRow(sh, row, { subTask:rhxSubName(t), pic:t.hubPic, result:rhxSubResult(t),
          start:rhxDate(t.start), planned:rhxDate(t.finish), status:st.status, progress:st.pct });
        ensureRowNo(sh, row, key.no + '.' + (info.maxSub + 1));
        sh.getRange(row, RHX.COL_FLAG, 1, 2).setValues([['trip', JSON.stringify({ id:rhxTripId(t), m:m, r:t.tripRow })]]);
        stat.added++;
      });
      touchedKeys[m] = 1;
    });

    /* 4) Tổng hợp % cho key task các tháng có thay đổi */
    if(stat.added || stat.updated || stat.removed){
      cur = scan();
      Object.keys(touchedKeys).forEach(function(m){ var k = cur.keys[m]; if(k && k.no) try{ syncKeyRollup(sh, k.no); }catch(e){} });
      SpreadsheetApp.flush();
      if(typeof touchVersion === 'function') touchVersion();
    }
  } finally { try{ lock.releaseLock(); }catch(e){} }
  return { ok:true, message:'Đồng bộ lịch công tác: +' + stat.added + ' · cập nhật ' + stat.updated + ' · xoá ' + stat.removed, stat:stat };
}
function rhxKeyPic(){   /* PIC của key "Lịch công tác": trưởng phòng của backend này */
  var src = (typeof SOURCE !== 'undefined') ? SOURCE : '';
  for(var e in USER_MAP){
    var u = USER_MAP[e];
    if(src === 'marketing'  && u.level === 'hod' && /sales/i.test(u.dept)) return u.pic;
    if(src === 'backoffice' && u.level === 'hod' && /back/i.test(u.dept))  return u.pic;
    if(src === 'management' && u.level === 'director') return u.pic;
  }
  return '';
}

/* ── TRIGGER: tự đồng bộ khi file Business Trip thay đổi + mỗi 10 phút ── */
function installTripTriggers(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    var h = t.getHandlerFunction();
    if(h === 'rhxTripOnChange' || h === 'rhxTripTimer') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('rhxTripOnChange').forSpreadsheet(RHX.TRIP_SHEET_ID).onChange().create();
  ScriptApp.newTrigger('rhxTripTimer').timeBased().everyMinutes(10).create();
  var r = rhxTripSync(false);
  return 'Đã cài trigger đồng bộ lịch công tác. ' + (r && r.message || '');
}
function rhxTripOnChange(e){
  try{
    var c = CacheService.getScriptCache();
    if(c.get('rhx_trip_busy')) return;
    c.put('rhx_trip_busy', '1', 20);            /* gộp nhiều lần sửa liên tiếp thành 1 lần đồng bộ */
    Utilities.sleep(3000);
    rhxTripSync(true);
  }catch(err){}
}
function rhxTripTimer(){ try{ rhxTripSync(true); }catch(e){} }

/* ══════════════ ② ĐỀ XUẤT CÔNG TÁC TỪ WEB ══════════════ */
function rhxTripMaster(user, p){
  /* ⭐ v12.7: đọc ĐÚNG cột của sheet Master (như getMasterData của hệ thống Business Trip):
       C = Tỉnh / thành (Vietnam-Thailand province - Japan - Germany)
       E = MMH Member & Distributor  (người / đơn vị đi cùng)
       F = Equipment-assets in/out                                                        */
  var c = CacheService.getScriptCache(), hit = c.get('rhx_trip_master_v127');
  var master = hit ? JSON.parse(hit) : null;
  if(!master){
    var ms = SpreadsheetApp.openById(RHX.TRIP_SHEET_ID).getSheetByName('Master');
    master = { destinations:[], coTravelers:[], equipment:[] };
    if(ms){
      var last = Math.max(2, ms.getLastRow());
      var v = ms.getRange(2, 3, last - 1, 4).getValues();          /* C..F */
      var add = function(arr, x){ x = rhxStr(x); if(x && arr.indexOf(x) < 0) arr.push(x); };
      v.forEach(function(r){
        add(master.destinations, r[0]);                              /* C */
        if(!/^test$/i.test(rhxStr(r[2]))) add(master.coTravelers, r[2]);   /* E (bỏ dòng "Test") */
        add(master.equipment, r[3]);                                 /* F */
      });
    }
    try{ c.put('rhx_trip_master_v127', JSON.stringify(master), 900); }catch(e){}
  }
  var tripPic = rhxTripName(p.forPic || user.pic);
  var rec = rhxTripRecipients(tripPic, rhxEmailOf(p.forPic || user.pic), null);
  return { ok:true, master:master, tripPic:tripPic, to:rec.to, cc:rec.cc };
}
/* Người nhận email xin duyệt — GIỐNG sendProposalEmail của hệ thống Business Trip:
   To = email Director (cột AA), CC = email HOD (cột Z) + PIC; Director tự đề xuất → To Hoa   */
function rhxDefaultEmails(picName){
  var MAP = {
    'Dao':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Yong':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Man':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Sui':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Thuong':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Trang':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Bui Trang':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Duc Anh':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Giang':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Vinh':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Minh Viet':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Phuong':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Khang':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Viet Ha':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},
    'Ngoc':{hod:'tt.tuyen@mani.inc',director:'nt.ha@mani.inc'},'Minh Trang':{hod:'vtt.hoa@mani.inc',director:'nt.ha@mani.inc'},
    'Hau':{hod:'vtt.hoa@mani.inc',director:'nt.ha@mani.inc'},'Dam Viet':{hod:'vtt.hoa@mani.inc',director:'nt.ha@mani.inc'},
    'Dam Ha':{hod:'vtt.hoa@mani.inc',director:'nt.ha@mani.inc'},'Hoa':{hod:'vtt.hoa@mani.inc',director:'nt.ha@mani.inc'},
    'Tuyen':{hod:'nt.ha@mani.inc',director:'nt.ha@mani.inc'},'Nguyen Ha':{hod:'nt.ha@mani.inc',director:'nt.ha@mani.inc'}
  };
  return MAP[picName] || { hod:'tt.tuyen@mani.inc', director:'nt.ha@mani.inc' };
}
function rhxValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim()); }
function rhxTripRecipients(tripPic, picEmail, rowVals){
  var T = RHX.T;
  var hod = rowVals ? rhxStr(rowVals[T.EMAIL_HOD-1]) : '';
  var dir = rowVals ? rhxStr(rowVals[T.EMAIL_DIRECTOR-1]) : '';
  if(!hod || !dir){ var d = rhxDefaultEmails(tripPic); if(!hod) hod = d.hod; if(!dir) dir = d.director; }
  var isDirector = /^nt\.ha@/i.test(String(picEmail||''));
  if(isDirector) return { to:'vt.hoa@mani.inc', cc:picEmail, hod:hod, director:dir };
  var cc = [picEmail].filter(rhxValidEmail);
  if(rhxValidEmail(hod)) cc.unshift(hod);
  return { to:dir, cc:cc.join(','), hod:hod, director:dir };
}
function rhxGreeting(hodEmail){
  var g = 'Dear Ha-san';
  var e = String(hodEmail||'').toLowerCase().trim(), name = null;
  var MAP = { 'nt.ha@manimedicalhanoi.com':null, 'tt.tuyen@manimedicalhanoi.com':'Tuyen', 'vtt.hoa@manimedicalhanoi.com':'Hoa' };
  if(MAP.hasOwnProperty(e)) name = MAP[e];
  else { var u = e.split('@')[0].split('.'); if(u.length > 1 && !/^ha$/i.test(u[u.length-1])){ var x = u[u.length-1]; name = x.charAt(0).toUpperCase() + x.slice(1); } }
  return name ? (g + ',<br/>Dear ' + name + '-san') : g;
}
function rhxEsc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/\n/g,'<br/>'); }
/* Email xin duyệt — cùng mẫu với buildBusinessTripProposalEmailV2 */
function rhxProposalHtml(greeting, picName, trip, sheetUrl){
  var td = 'border:1px solid #000000;padding:8px;font-family:Calibri,sans-serif;font-size:11pt;';
  var th = td + 'font-weight:bold;';
  var eq = String(trip.equipment||'').trim().toLowerCase();
  var hasEq = eq !== '' && eq !== 'none' && eq !== 'n/a';
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
    + '<td style="'+td+'text-align:center;">' + trip.row + '</td><td style="'+td+'">' + rhxEsc(trip.destination) + '</td>'
    + '<td style="'+td+'text-align:center;">' + trip.workingDate + '</td><td style="'+td+'text-align:center;">' + trip.startDate + '</td>'
    + '<td style="'+td+'text-align:center;">' + trip.finishDate + '</td><td style="'+td+'">' + rhxEsc(trip.purpose) + '</td>'
    + '<td style="'+td+'">' + rhxEsc(trip.schedule) + '</td><td style="'+td+'text-align:right;">' + rhxEsc(trip.estimatedCost) + '</td>'
    + '<td style="'+td+'">' + rhxEsc(trip.equipment || 'N/A') + '</td></tr></tbody></table>'
    + (hasEq ? '<p style="margin:20px 0 10px 0;line-height:1.6;font-weight:bold;">Equipment Commitment:</p>'
      + '<p style="margin:0 0 5px 0;line-height:1.6;">1. I will comply with all safety and information security regulations when using the above equipment and assets outside the office.</p>'
      + '<p style="margin:0 0 5px 0;line-height:1.6;">2. All equipment and assets will be returned to the company upon completion of the business trip as stated in each proposal above.</p>'
      + '<p style="margin:0 0 15px 0;line-height:1.6;">3. I take full responsibility for any loss, damage, or costs incurred while these equipment and assets are outside the office.</p>' : '')
    + '<p style="margin:20px 0 15px 0;line-height:1.6;">Please review and approve at your earliest convenience.</p>'
    + '<p style="margin:20px 0 0 0;"><a href="' + sheetUrl + '" style="color:#0066cc;text-decoration:underline;font-weight:bold;">Click here to review</a></p>'
    + '<p style="margin:30px 0 0 0;line-height:1.6;">Best regards,<br/><strong>' + rhxEsc(picName) + '</strong></p>'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:30px;padding-top:15px;border-top:1px solid #000000;"><tr>'
    + '<td style="font-size:10pt;">Mani Medical Hanoi - Business Trip Management System</td>'
    + '<td style="text-align:right;font-size:10pt;">' + Utilities.formatDate(new Date(), rhxTz(), 'dd/MM/yyyy HH:mm') + '</td>'
    + '</tr></table></td></tr></table></body></html>';
}
function rhxTripPropose(user, p){
  var f = p.trip; if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
  if(!f) return { ok:false, error:'Thiếu dữ liệu đề xuất' };
  /* ⭐ v12.6: chi phí nhập theo DÒNG (mô tả + số tiền) → gộp vào 1 ô "Estimated costs", tổng tự cộng */
  var cl = f.costLines; if(typeof cl === 'string'){ try{ cl = JSON.parse(cl); }catch(e){ cl = null; } }
  if(Array.isArray(cl) && cl.length){
    var sum = 0, lines = [];
    cl.forEach(function(x){
      var d = rhxStr(x && x.d), a = rhxNum(x && x.a);
      if(!d && !a) return;
      sum += a; lines.push((d || 'Chi phí') + ': ' + rhxMoney(a));
    });
    if(lines.length){ f.estimatedCost = lines.join('\n'); f.totalCost = String(sum); }
  }
  ['destination','coTraveler'].forEach(function(k){ if(Array.isArray(f[k])) f[k] = f[k].join(', '); });
  var hubPic = String(user.pic||'').trim();
  var picEmail = rhxEmailOf(hubPic);
  if(!picEmail) return { ok:false, error:'Không tìm thấy email của ' + hubPic + ' trong danh bạ.' };
  var tripPic = rhxTripName(hubPic);
  /* bắt buộc đủ các trường B → O như hệ thống Business Trip */
  var need = [['startDate','Start date'],['finishDate','Finish date'],['destination','Destination'],['coTraveler','Co-traveler'],
              ['purpose','Purpose'],['expectedResult','Expected result'],['estimatedCost','Estimated costs'],['totalCost','Total estimated costs'],
              ['schedule','Schedule'],['equipment','Equipment']];
  var miss = need.filter(function(x){ return !String(f[x[0]]==null?'':f[x[0]]).trim(); }).map(function(x){ return x[1]; });
  if(miss.length) return { ok:false, error:'Vui lòng điền đủ: ' + miss.join(', ') };
  var s = rhxDate(rhxISO(f.startDate)), fi = rhxDate(rhxISO(f.finishDate));
  if(!s || !fi) return { ok:false, error:'Ngày không hợp lệ' };
  if(fi < s) return { ok:false, error:'Finish date phải sau hoặc bằng Start date' };

  var sh = rhxTripSheet(), T = RHX.T;
  var lock = LockService.getScriptLock();                     /* 2 người đề xuất cùng lúc không trùng dòng */
  if(!lock.tryLock(20000)) return { ok:false, error:'Hệ thống đang bận, vui lòng thử lại sau vài giây.' };
  var row = 0, days = Math.round(Math.abs(fi - s)/86400000) + 1;
  try{
    /* dòng trống đầu tiên (cột D→M trống) từ dòng 5 — như findEmptyRow của hệ thống Business Trip */
    var last = sh.getLastRow(), W0 = RHX.TRIP_WRITE_START;
    if(last >= W0){
      var v = sh.getRange(W0, T.PIC, last - W0 + 1, 10).getValues();
      for(var i=0;i<v.length;i++){ if(v[i].every(function(c){ return c === '' || c == null || String(c).trim() === ''; })){ row = W0 + i; break; } }
    }
    if(!row) row = Math.max(last + 1, W0);
    if(row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), row - sh.getMaxRows());
    /* xoá danh sách chọn của dòng (như addNewRows gốc) — CHỈ các cột nhập tay */
    [T.PIC, T.START, T.FINISH, T.DEST, T.CO, T.PURPOSE, T.EXPECT, T.ESTCOST, T.TOTAL, T.SCHEDULE, T.EQUIP, T.APPROVAL].forEach(function(c){
      try{ sh.getRange(row, c).clearDataValidations(); }catch(e){}
    });
    var set = function(col, val){ if(RHX.TRIP_AUTO_COLS[col]) return; sh.getRange(row, col).setValue(val); };
    set(T.PIC, tripPic); set(T.START, s); set(T.FINISH, fi);
    set(T.DEST, f.destination); set(T.CO, f.coTraveler); set(T.PURPOSE, f.purpose); set(T.EXPECT, f.expectedResult);
    set(T.ESTCOST, f.estimatedCost); set(T.TOTAL, rhxNum(f.totalCost)); set(T.SCHEDULE, f.schedule); set(T.EQUIP, f.equipment);
    set(T.APPROVAL, 'Not Yet');
    /* công thức theo dòng (U→X: ngày báo cáo, deadline…) — copy từ dòng phía trên nếu dòng mới chưa có */
    try{
      var fr = sh.getRange(Math.max(W0, row - 30), 21, Math.max(1, row - Math.max(W0, row - 30)), 4).getFormulasR1C1();
      var cur = sh.getRange(row, 21, 1, 4).getFormulasR1C1()[0];
      for(var c=0;c<4;c++){
        if(cur[c]) continue;
        for(var k=fr.length-1;k>=0;k--){ if(fr[k][c]){ sh.getRange(row, 21 + c).setFormulaR1C1(fr[k][c]); break; } }
      }
    }catch(e){}
    try{
      var ms = sh.getParent().getSheetByName('Master');
      if(ms) sh.getRange(row, T.PIC).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ms.getRange('E2:E30'), true).setAllowInvalid(false).build());
    }catch(e){}
  } finally { try{ lock.releaseLock(); }catch(e){} }
  SpreadsheetApp.flush();
  Utilities.sleep(2500);                                       /* đợi công thức email (cột Y→AB) tính xong */
  var rv = sh.getRange(row, 1, 1, 28).getValues()[0];
  var no = rhxStr(rv[T.NO-1]).replace(/\.0$/,'') || String(row - 4);        /* No do công thức mảng tự tính */
  var rec = rhxTripRecipients(tripPic, picEmail, rv);
  if(!rhxValidEmail(rec.to)) return { ok:false, error:'Đã ghi dòng ' + row + ' nhưng không xác định được người duyệt — hãy gửi email từ file Business Trip.' };
  var trip = { row:row, destination:f.destination, workingDate:days, startDate:rhxDMY(rhxISO(f.startDate)), finishDate:rhxDMY(rhxISO(f.finishDate)),
               purpose:f.purpose, schedule:f.schedule, estimatedCost:f.estimatedCost, equipment:f.equipment };
  var html = rhxProposalHtml(rhxGreeting(rec.hod), tripPic, trip, sh.getParent().getUrl());
  MailApp.sendEmail({ to:rec.to, cc:rec.cc, replyTo:picEmail,
    subject:'Approval Business trip - ' + trip.startDate.replace(/\//g,'') + ' - ' + tripPic,
    htmlBody:html, name:'Mani Medical Hanoi - Business Trip System' });
  /* ⭐ v12.8: như hệ thống gốc — đã gửi email xin duyệt ⇒ "Already sent propose email"
     (HOD Menu ▸ duyệt chỉ liệt kê các chuyến ở trạng thái này) */
  try{ sh.getRange(row, T.APPROVAL).setValue('Already sent propose email'); SpreadsheetApp.flush(); }catch(e){}
  try{ if(typeof logActivity === 'function') logActivity(hubPic, 'add', 'đề xuất công tác ' + f.destination + ' (' + trip.startDate + ' → ' + trip.finishDate + ')', 'Lịch công tác', ''); }catch(e){}
  var sync = null;
  if(rhxInScope(hubPic)){ try{ sync = rhxTripSync(false); }catch(e){} }
  return { ok:true, message:'Đã gửi đề xuất công tác tới ' + rec.to + ' (CC: ' + rec.cc + '). Chờ phê duyệt trên file Business Trip.', tripRow:row, sync:sync };
}

/* ══════════════ ④ BÁO CÁO CÔNG TÁC TỪ WEB (⭐ v12.6) ══════════════ */
function rhxMoney(n){ n = Math.round(Number(n)||0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function rhxApproved(a){ a = String(a||''); return /approv|duyệt/i.test(a) && !/not|reject|từ chối|chưa/i.test(a); }
function rhxFolderId(url){
  var u = String(url||'').trim(), m;
  if(!u || /^open folder$/i.test(u)) return '';
  if((m = u.match(/\/folders\/([a-zA-Z0-9_-]+)/))) return m[1];
  if((m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/))) return m[1];
  if(/^[a-zA-Z0-9_-]{25,}$/.test(u)) return u;
  return '';
}
/* tìm chuyến đi theo mã nhận dạng (T<No>|PIC) — dòng trên file có thể đã xê dịch */
function rhxFindTrip(p){
  var id = rhxStr(p.id), r = +p.r || 0, i;
  /* ⭐ v12.9 — đọc thẳng dòng đã biết (1 dòng thay vì cả file); lệch dòng mới quét cả file */
  if(r){ try{ var one = rhxReadTripRow_(r); if(one && (!id || rhxTripId(one) === id)) return one; }catch(e){} }
  var all = rhxReadTrips();
  if(id){ for(i=0;i<all.length;i++){ if(rhxTripId(all[i]) === id) return all[i]; } }
  if(r){ for(i=0;i<all.length;i++){ if(all[i].tripRow === r) return all[i]; } }
  return null;
}
function rhxCanReport(user, t){
  if(String(user.pic||'').toLowerCase() === String(t.hubPic||'').toLowerCase()) return true;
  try{ return typeof canAssignUser === 'function' && canAssignUser(user); }catch(e){ return false; }
}
function rhxTripInfo(user, p){
  var t = rhxFindTrip(p);
  if(!t) return { ok:false, error:'Không tìm thấy chuyến công tác trên file Business Trip (có thể đã bị xoá hoặc đổi dòng).' };
  return { ok:true, trip:{
    id:rhxTripId(t), row:t.tripRow, no:t.no, pic:t.pic, hubPic:t.hubPic, start:t.start, finish:t.finish, days:t.days,
    dest:t.dest, co:t.co, purpose:t.purpose, expect:t.expect, estCost:t.estCost, total:t.total, schedule:t.schedule,
    equip:t.equip, folder:t.folder, report:t.report, reportDate:t.reportDate, approval:t.approval, comment:t.comment,
    approved:rhxApproved(t.approval), canReport:rhxCanReport(user, t),
    canEdit:rhxTripPerm(user, t).canEdit, canDelete:rhxTripPerm(user, t).canDelete } };
}
/* tạo file Google Doc báo cáo — cùng bố cục generateWordReport của hệ thống Business Trip */
function rhxReportDoc(t, folderId, ka, kf, fu){
  var folder = DriveApp.getFolderById(folderId);
  var docName = t.folderName || ('BusinessTrip_Report_' + rhxDMY(t.start) + '_' + t.dest);
  var doc = DocumentApp.create(docName), body = doc.getBody();
  function head(txt, lv, size){ var h = body.appendParagraph(txt); h.setHeading(lv); h.editAsText().setBold(true).setFontSize(size).setForegroundColor('#000000'); return h; }
  function para(txt){ var x = body.appendParagraph(txt || 'N/A'); x.setSpacingBefore(5); x.setSpacingAfter(5); x.setLineSpacing(1.3);
                      x.editAsText().setBold(false).setFontSize(11).setForegroundColor('#000000'); return x; }
  function clean(v){ return String(v||'').split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; }).join('\n') || 'N/A'; }
  var tt = head('BUSINESS TRIP REPORT', DocumentApp.ParagraphHeading.HEADING1, 14); tt.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(''); body.appendHorizontalRule(); body.appendParagraph('');
  head('I. TRIP INFORMATION', DocumentApp.ParagraphHeading.HEADING2, 11); body.appendParagraph('');
  var tb = body.appendTable(); tb.setBorderWidth(0.5);
  [['Destination:', t.dest], ['Date:', rhxDMY(t.start) + ' to ' + rhxDMY(t.finish)], ['Duration:', (t.days || '') + ' day(s)'],
   ['Purpose:', t.purpose], ['Co-Traveler:', t.co || 'None'], ['Estimated Cost:', t.estCost], ['Total Cost:', t.total ? rhxMoney(t.total) + ' VND' : 'N/A'],
   ['PIC:', t.pic]].forEach(function(r){
    var row = tb.appendTableRow(), a = row.appendTableCell(r[0]), b = row.appendTableCell(String(r[1] || 'N/A'));
    a.setBackgroundColor('#E8E8E8'); a.editAsText().setBold(true).setFontSize(11).setForegroundColor('#000000'); a.setWidth(150);
    b.editAsText().setBold(false).setFontSize(11).setForegroundColor('#000000');
    [a,b].forEach(function(c){ c.setPaddingLeft(10); c.setPaddingRight(10); c.setPaddingTop(8); c.setPaddingBottom(8); });
  });
  body.appendParagraph(''); body.appendHorizontalRule(); body.appendParagraph('');
  head('II. BUSINESS TRIP REPORT', DocumentApp.ParagraphHeading.HEADING2, 14); body.appendParagraph('');
  head('🎯 Key Activities', DocumentApp.ParagraphHeading.HEADING3, 11); para(clean(ka)); body.appendParagraph('');
  head('💡 Key Findings', DocumentApp.ParagraphHeading.HEADING3, 11);   para(clean(kf)); body.appendParagraph('');
  head('📌 Follow Up Actions', DocumentApp.ParagraphHeading.HEADING3, 11); para(clean(fu));
  body.appendParagraph(''); body.appendHorizontalRule(); body.appendParagraph('');
  var ft = body.appendParagraph('Report generated on: ' + Utilities.formatDate(new Date(), rhxTz(), 'dd/MM/yyyy HH:mm'));
  ft.setAlignment(DocumentApp.HorizontalAlignment.RIGHT); ft.editAsText().setItalic(true).setFontSize(9).setForegroundColor('#666666');
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(folder);
  return doc.getUrl();
}
/* email báo cáo — cùng mẫu buildBusinessTripReportEmail: To Director, CC HOD */
function rhxReportHtml(t, hodName, ka, kf, fu, folderLink){
  function bl(v){ return String(v||'').split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l; }).map(rhxEsc).join('<br/>') || 'N/A'; }
  var P = 'font-family:Calibri,sans-serif;font-size:11pt;color:#000000;';
  return '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /></head>'
    + '<body style="margin:0;padding:0;'+P+'"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td style="padding:20px;">'
    + '<p style="margin:0 0 10px 0;'+P+'">Dear Ha-san,</p>'
    + (hodName ? '<p style="margin:0 0 20px 0;'+P+'">Dear ' + rhxEsc(hodName) + '-san,</p>' : '')
    + '<p style="margin:0 0 15px 0;'+P+'line-height:1.6;">Here is my report for business trip at <strong>' + rhxEsc(t.dest) + '</strong> for <strong>' + (t.days || '') + ' days</strong>:</p>'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;background-color:#f9f9f9;border:1px solid #000000;"><tr><td style="padding:15px;">'
    + '<p style="margin:0 0 8px 0;'+P+'"><strong>Total Cost:</strong> ' + (t.total ? rhxMoney(t.total) : 'N/A') + ' VND</p>'
    + '<p style="margin:0 0 8px 0;'+P+'line-height:1.6;"><strong>Schedule:</strong> ' + rhxEsc(t.schedule || 'N/A') + '</p>'
    + '<p style="margin:0;'+P+'line-height:1.6;"><strong>Purpose:</strong> ' + rhxEsc(t.purpose || 'N/A') + '</p></td></tr></table>'
    + '<p style="margin:20px 0 10px 0;'+P+'font-weight:bold;">I. Key Activities</p><p style="margin:0 0 15px 0;'+P+'line-height:1.8;">' + bl(ka) + '</p>'
    + '<p style="margin:20px 0 10px 0;'+P+'font-weight:bold;">II. Key Findings</p><p style="margin:0 0 15px 0;'+P+'line-height:1.8;">' + bl(kf) + '</p>'
    + '<p style="margin:20px 0 10px 0;'+P+'font-weight:bold;">III. Follow Up Actions</p><p style="margin:0 0 15px 0;'+P+'line-height:1.8;">' + bl(fu) + '</p>'
    + (folderLink ? '<p style="margin:30px 0 0 0;'+P+'">Please <a href="' + folderLink + '" style="color:#000000;text-decoration:underline;font-weight:bold;">click here</a> to see more detail about this trip.</p>' : '')
    + '<p style="margin:30px 0 0 0;'+P+'line-height:1.6;">Best regards,<br/><strong>' + rhxEsc(t.pic) + '</strong></p>'
    + '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:30px;padding-top:15px;border-top:1px solid #000000;"><tr>'
    + '<td style="font-family:Calibri,sans-serif;font-size:10pt;color:#000000;">Mani Medical Hanoi - Business Trip Management System</td>'
    + '<td style="text-align:right;font-family:Calibri,sans-serif;font-size:10pt;color:#000000;">' + Utilities.formatDate(new Date(), rhxTz(), 'dd/MM/yyyy HH:mm') + '</td>'
    + '</tr></table></td></tr></table></body></html>';
}
function rhxHodName(hodEmail){
  var e = String(hodEmail||'').toLowerCase().trim(); if(!e) return '';
  var MAP = { 'tt.tuyen@mani.inc':'Tuyen', 'tt.tuyen@manimedicalhanoi.com':'Tuyen', 'vtt.hoa@mani.inc':'Hoa', 'vtt.hoa@manimedicalhanoi.com':'Hoa', 'vt.hoa@mani.inc':'Hoa' };
  if(MAP[e]) return MAP[e];
  var u = e.split('@')[0].split('.'); var x = u[u.length-1];
  if(!x || /^ha$/i.test(x)) return '';                      /* HOD chính là Director → chỉ "Dear Ha-san" */
  return x.charAt(0).toUpperCase() + x.slice(1);
}
function rhxTripReport(user, p){
  var ka = rhxStr(p.keyActivities), kf = rhxStr(p.keyFindings), fu = rhxStr(p.followUp);
  if(!ka || !kf || !fu) return { ok:false, error:'Vui lòng điền đủ 3 mục: Key Activities, Key Findings, Follow Up Actions.' };
  var t = rhxFindTrip(p);
  if(!t) return { ok:false, error:'Không tìm thấy chuyến công tác trên file Business Trip (có thể đã bị xoá hoặc đổi dòng).' };
  if(!rhxCanReport(user, t)) return { ok:false, error:'Chỉ ' + t.hubPic + ' (hoặc quản lý) được nhập báo cáo cho chuyến đi này.' };
  if(!rhxApproved(t.approval)) return { ok:false, error:'Chuyến đi chưa được phê duyệt (Approval Status: ' + t.approval + ') — chỉ nhập báo cáo được sau khi Approved.' };
  var sh = rhxTripSheet(), T = RHX.T, row = t.tripRow, warn = [];
  /* 1) folder của chuyến đi (chưa có thì tạo trong folder gốc, tên = cột P) */
  var folder = t.folder, fid = rhxFolderId(folder);
  if(!fid){
    if(t.folderName){
      try{
        var par = DriveApp.getFolderById(RHX.PARENT_FOLDER_ID), it = par.getFoldersByName(t.folderName);
        var fo = it.hasNext() ? it.next() : par.createFolder(t.folderName);
        folder = fo.getUrl(); fid = fo.getId();
        sh.getRange(row, T.FOLDER_LINK).setRichTextValue(SpreadsheetApp.newRichTextValue().setText('Open Folder').setLinkUrl(folder).build());
      }catch(e){ warn.push('Không tạo được folder chuyến đi: ' + e.message); }
    } else warn.push('Dòng ' + row + ' chưa có Folder name (cột P) nên chưa tạo được folder / file báo cáo.');
  }
  /* 2) file Google Doc báo cáo */
  var docLink = '';
  if(fid){ try{ docLink = rhxReportDoc(t, fid, ka, kf, fu); }catch(e){ warn.push('Không tạo được file báo cáo: ' + e.message); } }
  /* 3) ghi Report (R) + ngày báo cáo (U) — đúng như "Generate & Save Report" */
  var bullet = ['**I. Key Activities**', ka, '', '**II. Key Findings**', kf, '', '**III. Follow Up Actions**', fu].join('\n');
  sh.getRange(row, T.REPORT).setValue(bullet);
  try{ sh.getRange(row, T.REPORT_DATE).setValue(new Date()); }catch(e){}
  SpreadsheetApp.flush();
  /* 4) email báo cáo: To Director (AA) · CC HOD (Z) */
  var mailed = false, sendMail = !(p.sendEmail === false || p.sendEmail === 'false' || p.sendEmail === '0' || p.sendEmail === 0);
  if(sendMail){
    var dir = t.emailDir, hod = t.emailHod;
    if(!rhxValidEmail(dir) || !rhxValidEmail(hod)){ var d = rhxDefaultEmails(t.pic); if(!rhxValidEmail(dir)) dir = d.director; if(!rhxValidEmail(hod)) hod = d.hod; }
    if(rhxValidEmail(dir)){
      try{
        MailApp.sendEmail({ to:dir, cc:(rhxValidEmail(hod) && hod !== dir) ? hod : '', replyTo:rhxEmailOf(t.hubPic) || '',
          subject:'Business Trip Report - ' + t.pic + ' - ' + t.dest + ' - From ' + rhxDMY(t.start) + ' to ' + rhxDMY(t.finish),
          htmlBody:rhxReportHtml(t, rhxHodName(hod), ka, kf, fu, folder), name:'Mani Medical Hanoi - Business Trip System' });
        mailed = true;
      }catch(e){ warn.push('Đã lưu báo cáo nhưng gửi email thất bại: ' + e.message); }
    } else warn.push('Không xác định được email Director — chưa gửi email báo cáo.');
  }
  try{ if(typeof logActivity === 'function') logActivity(user.pic, 'complete', 'báo cáo công tác ' + t.dest + ' (' + rhxDMY(t.start) + ' → ' + rhxDMY(t.finish) + ')', 'Lịch công tác', ''); }catch(e){}
  var sync = rhxSyncSoon_(p);
  return { ok:true, message:'Đã lưu báo cáo công tác' + (docLink ? ' · đã tạo file báo cáo' : '') + (mailed ? ' · đã gửi email báo cáo' : ''),
           docLink:docLink, folder:folder, mailed:mailed, warn:warn, sync:sync };
}
/* ⭐ v12.9 — web gửi bgSync=1 ⇒ lệnh ghi trả kết quả NGAY; đồng bộ sheet WEEKLY do web gọi "tripSync" chạy nền ngay sau đó
   (người dùng không phải chờ). Web cũ không gửi bgSync ⇒ vẫn đồng bộ luôn như trước. */
function rhxSyncSoon_(p){
  if(p && String(p.bgSync||'') === '1') return { later:true };            /* web CRM v23 tự gọi tripSync chạy nền */
  try{ return rhxTripSync(false); }catch(e){ return null; }               /* web cũ: đồng bộ luôn như trước */
}
/* ⚠️ CHẠY TAY 1 LẦN sau khi cập nhật file này: cấp quyền Google Drive + Google Docs (tạo file báo cáo) */
function rhxAuthorize(){
  var r = DriveApp.getFolderById(RHX.PARENT_FOLDER_ID).getName();
  var d = DocumentApp.create('rhx_auth_test'); DriveApp.getFileById(d.getId()).setTrashed(true);
  return 'Đã cấp quyền Drive + Docs. Folder gốc công tác: ' + r;
}
/* ══════════════ ⑤ SỬA / XOÁ CHUYẾN CÔNG TÁC TỪ WEB (⭐ v12.8) ══════════════
 * Quyền:  · PIC của chuyến đi: SỬA và XOÁ khi chuyến CHƯA được duyệt (Not Yet / Already sent propose email / Rejected)
 *         · Quản lý (được giao việc): như trên + XOÁ được cả chuyến đã Approved
 *         · Chuyến đã Approved: KHÔNG sửa trên web (tránh đổi kế hoạch sau khi sếp đã duyệt)
 * Sửa  = ghi đè các cột nhập tay E→O trên file Business Trip (giống updateRow của hệ thống gốc),
 *        tuỳ chọn gửi lại email xin duyệt → trạng thái "Already sent propose email" (Rejected thì xoá ý kiến cũ).
 * Xoá  = xoá TRẮNG dữ liệu nhập tay của dòng đó trên file Business Trip (không xoá hẳn dòng để các công thức
 *        mảng B/C/G/P và số No của các chuyến khác không bị xô lệch); dòng trống sẽ được dùng lại cho đề xuất sau.
 *        Task công tác trên sheet WEEKLY tự biến mất ở lần đồng bộ ngay sau đó.                                 */
function rhxTripPerm(user, t){
  var isPic = String(user.pic||'').toLowerCase() === String(t.hubPic||'').toLowerCase();
  var mgr = false; try{ mgr = typeof canAssignUser === 'function' && canAssignUser(user); }catch(e){}
  var ap = rhxApproved(t.approval);
  return { canEdit:(isPic || mgr) && !ap, canDelete:(isPic && !ap) || mgr, approved:ap };
}
function rhxNormTrip(f){
  var cl = f.costLines; if(typeof cl === 'string'){ try{ cl = JSON.parse(cl); }catch(e){ cl = null; } }
  if(Array.isArray(cl) && cl.length){
    var sum = 0, lines = [];
    cl.forEach(function(x){ var d = rhxStr(x && x.d), a = rhxNum(x && x.a); if(!d && !a) return; sum += a; lines.push((d || 'Chi phí') + ': ' + rhxMoney(a)); });
    if(lines.length){ f.estimatedCost = lines.join('\n'); f.totalCost = String(sum); }
  }
  ['destination','coTraveler','equipment'].forEach(function(k){ if(Array.isArray(f[k])) f[k] = f[k].join(', '); });
  return f;
}
function rhxTripUpdate(user, p){
  var f = p.trip; if(typeof f === 'string'){ try{ f = JSON.parse(f); }catch(e){ f = null; } }
  if(!f) return { ok:false, error:'Thiếu dữ liệu cần sửa' };
  f = rhxNormTrip(f);
  var t = rhxFindTrip(p);
  if(!t) return { ok:false, error:'Không tìm thấy chuyến công tác trên file Business Trip (có thể đã bị xoá hoặc đổi dòng).' };
  var pm = rhxTripPerm(user, t);
  if(pm.approved) return { ok:false, error:'Chuyến đi đã được Approved — không sửa trên web. Nếu cần đổi kế hoạch, hãy báo quản lý (có thể xoá chuyến này và đề xuất lại).' };
  if(!pm.canEdit) return { ok:false, error:'Chỉ ' + t.hubPic + ' (hoặc quản lý) được sửa chuyến đi này.' };
  var need = [['startDate','Start date'],['finishDate','Finish date'],['destination','Destination'],['coTraveler','Co-traveler'],
              ['purpose','Purpose'],['expectedResult','Expected result'],['estimatedCost','Estimated costs'],['totalCost','Total estimated costs'],
              ['schedule','Schedule'],['equipment','Equipment']];
  var miss = need.filter(function(x){ return !String(f[x[0]]==null?'':f[x[0]]).trim(); }).map(function(x){ return x[1]; });
  if(miss.length) return { ok:false, error:'Vui lòng điền đủ: ' + miss.join(', ') };
  var s = rhxDate(rhxISO(f.startDate)), fi = rhxDate(rhxISO(f.finishDate));
  if(!s || !fi) return { ok:false, error:'Ngày không hợp lệ' };
  if(fi < s) return { ok:false, error:'Finish date phải sau hoặc bằng Start date' };
  var sh = rhxTripSheet(), T = RHX.T, row = t.tripRow;
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(20000)) return { ok:false, error:'Hệ thống đang bận, vui lòng thử lại sau vài giây.' };
  try{
    [T.START, T.FINISH, T.DEST, T.CO, T.PURPOSE, T.EXPECT, T.ESTCOST, T.TOTAL, T.SCHEDULE, T.EQUIP].forEach(function(c){
      try{ sh.getRange(row, c).clearDataValidations(); }catch(e){}
    });
    var set = function(col, val){ if(RHX.TRIP_AUTO_COLS[col]) return; sh.getRange(row, col).setValue(val); };
    set(T.START, s); set(T.FINISH, fi); set(T.DEST, f.destination); set(T.CO, f.coTraveler);
    set(T.PURPOSE, f.purpose); set(T.EXPECT, f.expectedResult); set(T.ESTCOST, f.estimatedCost);
    set(T.TOTAL, rhxNum(f.totalCost)); set(T.SCHEDULE, f.schedule); set(T.EQUIP, f.equipment);
  } finally { try{ lock.releaseLock(); }catch(e){} }
  SpreadsheetApp.flush();
  var mailed = false, warn = [];
  var resend = !(p.resend === false || p.resend === 'false' || p.resend === '0' || p.resend === 0);
  if(resend){
    try{
      var rv = sh.getRange(row, 1, 1, 28).getValues()[0];
      var picEmail = rhxEmailOf(t.hubPic) || rhxStr(rv[T.EMAIL_PIC-1]);
      var rec = rhxTripRecipients(t.pic, picEmail, rv);
      if(!rhxValidEmail(rec.to)) throw new Error('không xác định được người duyệt');
      var days = Math.round(Math.abs(fi - s)/86400000) + 1;
      var trip = { row:row, destination:f.destination, workingDate:days, startDate:rhxDMY(rhxISO(f.startDate)), finishDate:rhxDMY(rhxISO(f.finishDate)),
                   purpose:f.purpose, schedule:f.schedule, estimatedCost:f.estimatedCost, equipment:f.equipment };
      if(/reject/i.test(t.approval)) sh.getRange(row, T.COMMENT).setValue('');          /* như hệ thống gốc: gửi lại → xoá ý kiến cũ */
      MailApp.sendEmail({ to:rec.to, cc:rec.cc, replyTo:picEmail || '',
        subject:'Approval Business trip - ' + trip.startDate.replace(/\//g,'') + ' - ' + t.pic,
        htmlBody:rhxProposalHtml(rhxGreeting(rec.hod), t.pic, trip, sh.getParent().getUrl()), name:'Mani Medical Hanoi - Business Trip System' });
      sh.getRange(row, T.APPROVAL).setValue('Already sent propose email');
      mailed = true;
    }catch(e){ warn.push('Đã lưu thay đổi nhưng chưa gửi lại được email xin duyệt: ' + e.message); }
  }
  try{ if(typeof logActivity === 'function') logActivity(user.pic, 'update', 'sửa đề xuất công tác ' + f.destination + ' (' + rhxDMY(rhxISO(f.startDate)) + ' → ' + rhxDMY(rhxISO(f.finishDate)) + ')', 'Lịch công tác', ''); }catch(e){}
  var sync = rhxSyncSoon_(p);
  return { ok:true, message:'Đã cập nhật chuyến công tác trên file Business Trip' + (mailed ? ' · đã gửi lại email xin duyệt' : ''), warn:warn, sync:sync };
}
function rhxTripDelete(user, p){
  var t = rhxFindTrip(p);
  if(!t) return { ok:true, message:'Chuyến đi không còn trên file Business Trip — đã đồng bộ lại.', sync:(function(){ try{ return rhxTripSync(false); }catch(e){ return null; } })() };
  var pm = rhxTripPerm(user, t);
  if(!pm.canDelete) return { ok:false, error: pm.approved ? 'Chuyến đi đã được Approved — chỉ quản lý mới xoá được.' : ('Chỉ ' + t.hubPic + ' (hoặc quản lý) được xoá chuyến đi này.') };
  var sh = rhxTripSheet(), T = RHX.T, row = t.tripRow;
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(20000)) return { ok:false, error:'Hệ thống đang bận, vui lòng thử lại sau vài giây.' };
  try{
    /* kiểm tra lại đúng chuyến (PIC + ngày đi) trước khi xoá */
    var cur = sh.getRange(row, 1, 1, 28).getValues()[0];
    if(rhxStr(cur[T.PIC-1]) !== t.pic || rhxISO(cur[T.START-1]) !== t.start) return { ok:false, error:'Dữ liệu trên file vừa thay đổi — vui lòng tải lại rồi thử lại.' };
    /* ⭐ v12.9 — đọc công thức 1 lần rồi xoá theo từng đoạn cột liền nhau (trước: đọc + ghi xen kẽ từng ô, rất chậm) */
    var FU = []; try{ FU = sh.getRange(row, 21, 1, 4).getFormulasR1C1()[0]; }catch(e){}
    var cols = [];
    for(var c = T.PIC; c <= 24; c++){                              /* D → X: xoá trắng các ô nhập tay, giữ công thức mảng */
      if(RHX.TRIP_AUTO_COLS[c]) continue;
      if(c >= 21 && FU[c-21]) continue;                             /* U–X: giữ công thức theo dòng */
      cols.push(c);
    }
    for(var k = 0; k < cols.length; ){
      var a = cols[k], b = a; while(k + 1 < cols.length && cols[k+1] === b + 1){ k++; b++; } k++;
      var rg = sh.getRange(row, a, 1, b - a + 1);
      try{ rg.clearDataValidations(); }catch(e){}
      rg.clearContent();
    }
    try{
      var ms = sh.getParent().getSheetByName('Master');
      if(ms) sh.getRange(row, T.PIC).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ms.getRange('E2:E30'), true).setAllowInvalid(false).build());
    }catch(e){}
  } finally { try{ lock.releaseLock(); }catch(e){} }
  SpreadsheetApp.flush();
  try{ if(typeof logActivity === 'function') logActivity(user.pic, 'delete', 'xoá chuyến công tác ' + t.dest + ' (' + rhxDMY(t.start) + ' → ' + rhxDMY(t.finish) + ') của ' + t.pic, 'Lịch công tác', ''); }catch(e){}
  var sync = rhxSyncSoon_(p);
  return { ok:true, message:'Đã xoá chuyến công tác ' + t.dest + ' (' + rhxDMY(t.start) + ') khỏi file Business Trip', sync:sync };
}
/* ══════════════ ③ GỬI EMAIL GIAO VIỆC (văn bản thường) ══════════════ */
function rhxMailSend(user, p){
  function list(x){ if(!x) return []; if(typeof x === 'string'){ try{ var j = JSON.parse(x); if(Array.isArray(j)) return j; }catch(e){} return x.split(/[,;]/); } return x; }
  function resolve(arr){
    var out = [];
    list(arr).forEach(function(v){
      v = String(v||'').trim(); if(!v) return;
      var e = rhxValidEmail(v) ? v : rhxEmailOf(v);
      if(e && /@(manimedicalhanoi\.com|mani\.inc)$/i.test(e) && out.indexOf(e) < 0) out.push(e);   /* chỉ gửi trong công ty */
    });
    return out;
  }
  var to = resolve(p.to), cc = resolve(p.cc);
  var me = rhxEmailOf(user.pic);
  if(me && to.indexOf(me) < 0 && cc.indexOf(me) < 0) cc.push(me);
  if(!to.length) return { ok:false, error:'Chưa chọn người nhận (hoặc người nhận chưa có email trong danh bạ).' };
  var subject = String(p.subject||'').trim(), body = String(p.body||'').trim();
  if(!subject || !body) return { ok:false, error:'Thiếu tiêu đề hoặc nội dung email.' };
  MailApp.sendEmail({ to:to.join(','), cc:cc.join(','), replyTo:me || undefined, subject:subject,
    body: body + '\n\n—\nGửi từ MMH Report Hub bởi ' + user.pic + (me ? ' <' + me + '>' : ''),
    name: user.pic + ' (MMH Report Hub)' });
  try{ if(typeof logActivity === 'function') logActivity(user.pic, 'assign', 'gửi email "' + subject + '" tới ' + to.join(', '), '', String(p.no||'')); }catch(e){}
  return { ok:true, message:'Đã gửi email tới ' + to.join(', ') + (cc.length ? ' (CC: ' + cc.join(', ') + ')' : '') };
}