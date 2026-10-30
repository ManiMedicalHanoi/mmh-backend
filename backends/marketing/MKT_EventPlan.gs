/*************************************************************************************************
 * MMH — MKT_EventPlan.gs   (v1.1 · 30/10/2026)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * FILE "Kế hoạch & tiến độ sự kiện" (1 file chung cho MỌI sự kiện — theo SOP MMHSOP_0XX Quy trình tổ chức sự kiện).
 * Tab: Dashboard · Điều phối · Giao việc · Sự kiện · Nhật ký · Mẫu việc · Cài đặt · Hướng dẫn
 * (bố cục dựng sẵn từ file mẫu docs/ke-hoach-su-kien/Ke_hoach_su_kien_MMH.xlsx, tải lên Drive).
 *
 *  ① Tab "Sự kiện" = danh sách sự kiện đọc từ file "2. Vietnam - Marketing Offline FY68" (REPORT_EVENT + PLAN_EVENT,
 *     dùng chung evsReadEvents_ của Event_Sync.gs). Cột A–J do hệ thống ghi (sắp theo ngày D); K–O = ĐỘI của sự kiện
 *     (Owner · Digital · Trade · Sales · Đầu mối NPP) + P Theo dõi do Owner nhập — GIỮ theo Mã SK. Sự kiện mới: đội lấy từ
 *     Cài đặt (người mặc định theo vai trò). Mã SK = "EV-" + băm tên không dấu; đổi tên mà ngày D không đổi ⇒ giữ mã cũ.
 *     Sự kiện không còn trong file Offline ⇒ giữ dòng, Nguồn = "Đã xoá".
 *  ② Sự kiện MỚI có ngày cụ thể, D ≥ hôm nay, Theo dõi = Có ⇒ chèn bộ việc ở "Giao việc" theo "Mẫu việc" (theo thứ tự ngày D),
 *     người phụ trách = người của đội theo vai trò (cột ẩn U _auto nhớ người tự giao). Việc có hạn đã qua lúc tạo ⇒ "Bỏ qua"
 *     + ghi chú để Owner xem lại. Mỗi sự kiện chỉ tạo 1 lần (EP_GEN_<id>).
 *  ③ Đổi người trong đội ⇒ việc có Người phụ trách = _auto (chưa giao tay) đổi theo; việc Owner đã giao tay giữ nguyên.
 *  ④ Trigger onEdit cài trên file (epOnEdit): Giao việc — sửa G..L ⇒ cột N "Cập nhật" = giờ (ghi chú = người sửa);
 *     Trạng thái = Xong mà Ngày xong trống ⇒ điền hôm nay. Sự kiện — sửa đội ⇒ chạy ③ ngay.
 *  ⑤ Lần đồng bộ đầu: xoá dữ liệu ví dụ (Mã SK "VD-…", người / nhật ký "(ví dụ)"); ô chọn ở Điều phối trống / sai ⇒ chọn sự kiện sắp tới.
 * Tên sự kiện / Ngày D / Hạn / Cảnh báo ở Giao việc là CÔNG THỨC (tên vùng SK_A, SK_B, SK_C, SK_D, SK_TD, SEL_K, SEL_N, HOLI, PEOPLE
 * có sẵn trong file mẫu) — PHẢI giống hệt docs/ke-hoach-su-kien/build_plan.py.
 * Chạy: evsSyncTick (10 phút / lần) · action=epSync (mode=status chỉ xem) · tay: epSyncNow().
 * Không dùng dịch vụ mới (SpreadsheetApp / ScriptApp trigger / PropertiesService / LockService) ⇒ không phải cấp quyền lại.
 *************************************************************************************************/
var EP = {
  VER: '1.1',
  ID: '',                       /* ID file Google Sheet "Kế hoạch & tiến độ sự kiện" (hoặc Script Property EP_ID) */
  SH_EV: 'Sự kiện', SH_TASK: 'Giao việc', SH_TPL: 'Mẫu việc', SH_SET: 'Cài đặt', SH_LOG: 'Nhật ký', SH_SEL: 'Điều phối',
  FIRST: 5,                     /* dòng dữ liệu đầu tiên (tiêu đề ở dòng 4) */
  BACK_DAYS: 60,                /* sự kiện kết thúc trong 60 ngày qua → tương lai mới đưa vào danh sách */
  EV_COLS: 16,                  /* Sự kiện A..P (K..O đội, P theo dõi) */
  TASK_COLS: 22,                /* Giao việc A..V */
  TEAM: { 'MKT Leader':10, 'Digital MKT':11, 'Trade MKT':12, 'Sales':13, 'NPP / đối tác':14 }   /* vai trò → cột (0-based) ở tab Sự kiện */
};
/* cột Giao việc (1-based) */
var EPC = { ev:1, d:2, moc:3, grp:4, job:5, role:6, who:7, co:8, due:9, st:10, done:11, note:12, alert:13, upd:14,
            sk:15, ma:16, n:17, unit:18, sort:19, td:20, auto:21, sel:22 };
function epId_(){ var p = ''; try { p = PropertiesService.getScriptProperties().getProperty('EP_ID') || ''; } catch(e){} return p || EP.ID; }
function epIso_(d){ return (d instanceof Date && !isNaN(d.getTime())) ? Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : ''; }
function epDate_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function epKey_(nk){ return 'EV-' + evsHash_(nk).toUpperCase(); }
function epForm_(e){
  var s = evsNorm_([e.form, e.type, e.place].join(' '));
  return /webinar|online|zoom|livestream/.test(s) ? 'Webinar' : 'Trực tiếp';
}
function epApplies_(app, form, place){
  app = evsS_(app);
  if (!app || app === 'Tất cả') return true;
  if (app === 'Ngoài Hà Nội') return form === 'Trực tiếp' && !/hanoi|hn$/.test(evsNorm_(place));
  return app === form;
}

/* ── công thức (giống hệt file mẫu) ── */
function epEvF_(r){
  var G = "'Giao việc'", O = G + '!$O$5:$O$3004', J = G + '!$J$5:$J$3004', M = G + '!$M$5:$M$3004';
  return [
    '=IF(A' + r + '="","",COUNTIFS(' + O + ',A' + r + ',' + J + ',"<>Bỏ qua"))',
    '=IF(A' + r + '="","",COUNTIFS(' + O + ',A' + r + ',' + J + ',"Xong"))',
    '=IF(A' + r + '="","",COUNTIFS(' + O + ',A' + r + ',' + M + ',"*QUÁ HẠN*"))',
    '=IF(A' + r + '="","",COUNTIFS(' + O + ',A' + r + ',' + M + ',"*CHƯA GIAO*"))',
    '=IF(OR(A' + r + '="",N(Q' + r + ')=0),"",R' + r + '/Q' + r + ')',
    '=IF(U' + r + '="","",REPT("█",ROUND(U' + r + '*10,0))&REPT("░",10-ROUND(U' + r + '*10,0)))',
    '=IF(C' + r + '="","Chưa có ngày",IF(C' + r + '>TODAY(),"Còn "&(C' + r + '-TODAY())&" ngày",IF(IF(D' + r + '="",C' + r + ',D' + r + ')>=TODAY(),"Đang diễn ra","Đã qua "&(TODAY()-IF(D' + r + '="",C' + r + ',D' + r + '))&" ngày")))',
    '=IF(AND(A' + r + '<>"",P' + r + '="Có",ISNUMBER(C' + r + ')),IF(IF(D' + r + '="",C' + r + ',D' + r + ')>=TODAY()-35,C' + r + '+ROW()/100000,""),"")'
  ];   /* Q..X */
}
function epTaskF_(r){
  var x = function(c){ return c + r; };
  var end = 'IFERROR(IF(INDEX(SK_D,MATCH(' + x('O') + ',SK_A,0))="",' + x('B') + ',INDEX(SK_D,MATCH(' + x('O') + ',SK_A,0))),' + x('B') + ')';
  var I = x('I'), G = x('G'), J = x('J');
  var parts = 'IF(' + G + '=""," · CHƯA GIAO","")&IF(NOT(ISNUMBER(' + I + ')),"",IF(TODAY()>' + I + '," · QUÁ HẠN "&(TODAY()-' + I + ')&" ngày",' +
              'IF(' + I + '-TODAY()<=3," · Đến hạn "&IF(' + I + '=TODAY(),"hôm nay","trong "&(' + I + '-TODAY())&" ngày"),"")))' +
              '&IF(' + J + '="Chờ đối tác"," · Chờ đối tác"&IF(ISNUMBER(' + x('N') + ')," "&(TODAY()-INT(' + x('N') + '))&" ngày",""),"")';
  return {
    A: '=IF(' + x('O') + '="","",IFERROR(INDEX(SK_B,MATCH(' + x('O') + ',SK_A,0))&"",""))',
    B: '=IF(' + x('O') + '="","",IFERROR(INDEX(SK_C,MATCH(' + x('O') + ',SK_A,0)),""))',
    C: '=IF(' + x('Q') + '="","",IF(' + x('Q') + '=0,"D",IF(' + x('Q') + '<0,"D"&' + x('Q') + ',"D+"&' + x('Q') + ')))',
    I: '=IF(OR(' + x('B') + '="",' + x('Q') + '=""),"",IF(' + x('Q') + '>0,IF(' + x('R') + '="Làm việc",WORKDAY(' + end + ',' + x('Q') + ',HOLI),' + end + '+' + x('Q') + '),' + x('B') + '+' + x('Q') + '))',
    M: '=IF(' + x('E') + '="","",IF(' + J + '="Bỏ qua","—",IF(' + J + '="Xong",IF(AND(ISNUMBER(' + x('K') + '),ISNUMBER(' + I + '),' + x('K') + '>' + I + '),"Xong trễ","Xong"),' +
       'MID(' + parts + ',4,200))))',
    S: '=IF(AND(' + x('E') + '<>"",' + x('T') + '="Có",' + J + '<>"Xong",' + J + '<>"Bỏ qua",ISNUMBER(' + I + ')),' + I + '+ROW()/100000,"")',
    T: '=IF(' + x('O') + '="","",IFERROR(INDEX(SK_TD,MATCH(' + x('O') + ',SK_A,0)),""))',
    V: '=IF(AND(' + x('O') + '<>"",' + x('O') + '=SEL_K,' + J + '<>"Xong",' + J + '<>"Bỏ qua"),IF(ISNUMBER(' + I + '),' + I + ',99999)+ROW()/100000,"")'
  };
}
function epWriteTaskF_(sh, r0, n){
  var abc = [], i_ = [], m_ = [], st = [], v_ = [];
  for (var j = 0; j < n; j++){ var f = epTaskF_(r0 + j); abc.push([f.A, f.B, f.C]); i_.push([f.I]); m_.push([f.M]); st.push([f.S, f.T]); v_.push([f.V]); }
  sh.getRange(r0, EPC.ev, n, 3).setFormulas(abc);
  sh.getRange(r0, EPC.due, n, 1).setFormulas(i_);
  sh.getRange(r0, EPC.alert, n, 1).setFormulas(m_);
  sh.getRange(r0, EPC.sort, n, 2).setFormulas(st);
  sh.getRange(r0, EPC.sel, n, 1).setFormulas(v_);
}
/* hạn tính sẵn (để biết việc nào đã qua hạn lúc tạo) — T2–T6 trừ ngày nghỉ */
function epDue_(start, end, n, unit, holi){
  var base = n > 0 ? end : start, d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  if (n <= 0 || unit !== 'Làm việc'){ d.setDate(d.getDate() + n); return d; }
  var k = 0;
  while (k < n){ d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6 && !holi[epIso_(d)]) k++; }
  return d;
}

/* ── đọc / ghi ── */
function epLastRow_(sh, col){
  var last = sh.getLastRow(); if (last < EP.FIRST) return EP.FIRST - 1;
  var v = sh.getRange(EP.FIRST, col, last - EP.FIRST + 1, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (evsS_(v[i][0])) return EP.FIRST + i;
  return EP.FIRST - 1;
}
function epDelRows_(sh, rows){   /* xoá dòng — gom đoạn liền, xoá từ dưới lên */
  rows = rows.slice().sort(function(a, b){ return b - a; });
  var i = 0;
  while (i < rows.length){
    var top = rows[i], n = 1;
    while (i + n < rows.length && rows[i + n] === top - n) n++;
    sh.deleteRows(top - n + 1, n); i += n;
  }
}
function epCleanSample_(ss, rep){
  var pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('EP_CLEAN_' + ss.getId())) return;
  var ev = ss.getSheetByName(EP.SH_EV), tk = ss.getSheetByName(EP.SH_TASK), st = ss.getSheetByName(EP.SH_SET), lg = ss.getSheetByName(EP.SH_LOG);
  var n = 0, VD = /\(ví dụ\)/;
  if (tk){
    var lt = epLastRow_(tk, EPC.sk), del = [];
    if (lt >= EP.FIRST) tk.getRange(EP.FIRST, EPC.sk, lt - EP.FIRST + 1, 1).getValues().forEach(function(r, i){ if (/^VD-/.test(evsS_(r[0]))) del.push(EP.FIRST + i); });
    if (del.length){ epDelRows_(tk, del); n += del.length; }
  }
  if (lg){
    var ll = epLastRow_(lg, 2), dl = [];
    if (ll >= EP.FIRST) lg.getRange(EP.FIRST, 2, ll - EP.FIRST + 1, 1).getValues().forEach(function(r, i){ if (VD.test(evsS_(r[0]))) dl.push(EP.FIRST + i); });
    if (dl.length) epDelRows_(lg, dl);
  }
  if (ev){
    var le = epLastRow_(ev, 1);
    if (le >= EP.FIRST) ev.getRange(EP.FIRST, 1, le - EP.FIRST + 1, EP.EV_COLS).getValues().forEach(function(r, i){
      if (/^VD-/.test(evsS_(r[0]))) ev.getRange(EP.FIRST + i, 1, 1, EP.EV_COLS).clearContent();
    });
  }
  if (st){   /* người "(ví dụ)" ở Cài đặt: cột B (mặc định theo vai trò) + D:F (danh sách người) */
    var b = st.getRange(EP.FIRST, 2, 40, 1).getValues(), d = st.getRange(EP.FIRST, 4, 40, 3).getValues(), ch = false;
    b.forEach(function(r){ if (VD.test(evsS_(r[0]))){ r[0] = ''; ch = true; } });
    d.forEach(function(r){ if (VD.test(evsS_(r[0]))){ r[0] = r[1] = r[2] = ''; ch = true; } });
    if (ch){ st.getRange(EP.FIRST, 2, 40, 1).setValues(b); st.getRange(EP.FIRST, 4, 40, 3).setValues(d); }
  }
  pr.setProperty('EP_CLEAN_' + ss.getId(), String(Date.now()));
  rep.parts.push('Xoá dữ liệu ví dụ (' + n + ' việc)');
}
function epTemplate_(ss){
  var sh = ss.getSheetByName(EP.SH_TPL); if (!sh) return [];
  var last = epLastRow_(sh, 3); if (last < EP.FIRST) return [];
  return sh.getRange(EP.FIRST, 1, last - EP.FIRST + 1, 8).getValues().filter(function(r){ return evsS_(r[2]); }).map(function(r){
    return { ma:evsS_(r[0]), grp:evsS_(r[1]), job:evsS_(r[2]), role:evsS_(r[3]), co:evsS_(r[4]),
             n:Math.round(evsNum_(r[5])), unit:evsS_(r[6]) === 'Làm việc' ? 'Làm việc' : 'Lịch', app:evsS_(r[7]) || 'Tất cả' };
  });
}
function epSettings_(ss){
  var sh = ss.getSheetByName(EP.SH_SET), roles = {}, holi = {};
  if (!sh) return { roles:roles, holi:holi };
  sh.getRange(EP.FIRST, 1, 20, 2).getValues().forEach(function(r){ if (evsS_(r[0])) roles[evsS_(r[0])] = evsS_(r[1]); });
  sh.getRange(EP.FIRST, 8, 60, 1).getValues().forEach(function(r){ var s = epIso_(r[0]); if (s) holi[s] = 1; });
  return { roles:roles, holi:holi };
}
/* người phụ trách theo vai trò của 1 sự kiện (đội ở tab Sự kiện, không có ⇒ Cài đặt) */
function epWho_(evRow, role, sset){
  var c = EP.TEAM[role];
  if (c !== undefined && evRow) return evsS_(evRow[c]);
  return sset.roles[role] || '';
}
/* ③ việc chưa giao tay (Người phụ trách = _auto) ⇒ theo đội hiện tại. onlyKey: chỉ 1 sự kiện */
function epReassign_(ss, sset, onlyKey){
  var ev = ss.getSheetByName(EP.SH_EV), tk = ss.getSheetByName(EP.SH_TASK);
  var le = epLastRow_(ev, 1), lt = epLastRow_(tk, EPC.sk);
  if (le < EP.FIRST || lt < EP.FIRST) return 0;
  var byKey = {};
  ev.getRange(EP.FIRST, 1, le - EP.FIRST + 1, EP.EV_COLS).getValues().forEach(function(r){ if (evsS_(r[0])) byKey[evsS_(r[0])] = r; });
  var n = lt - EP.FIRST + 1;
  var role = tk.getRange(EP.FIRST, EPC.role, n, 2).getValues();     /* F vai trò · G người */
  var meta = tk.getRange(EP.FIRST, EPC.sk, n, 1).getValues();
  var auto = tk.getRange(EP.FIRST, EPC.auto, n, 1).getValues();
  var ch = 0, gOut = [], uOut = [];
  for (var i = 0; i < n; i++){
    var k = evsS_(meta[i][0]), g = evsS_(role[i][1]), u = evsS_(auto[i][0]);
    gOut.push([role[i][1]]); uOut.push([auto[i][0]]);
    if (!k || (onlyKey && k !== onlyKey) || !byKey[k]) continue;
    if (g !== u) continue;                                   /* Owner đã giao tay */
    var want = epWho_(byKey[k], evsS_(role[i][0]), sset);
    if (want !== u){ gOut[i] = [want]; uOut[i] = [want]; ch++; }
  }
  if (ch){ tk.getRange(EP.FIRST, EPC.who, n, 1).setValues(gOut); tk.getRange(EP.FIRST, EPC.auto, n, 1).setValues(uOut); }
  return ch;
}
function epEnsureTrigger_(id){
  var pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('EP_TRIG_' + id)) return;
  try {
    var has = ScriptApp.getProjectTriggers().some(function(t){
      var src = ''; try { src = t.getTriggerSourceId() || ''; } catch(e){}
      return t.getHandlerFunction() === 'epOnEdit' && src === id;
    });
    if (!has) ScriptApp.newTrigger('epOnEdit').forSpreadsheet(id).onEdit().create();
    pr.setProperty('EP_TRIG_' + id, String(Date.now()));
  } catch(e){}
}
/* ④ onEdit trên file Kế hoạch sự kiện */
function epOnEdit(e){
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet(), name = sh.getName(), r0 = e.range.getRow(), c0 = e.range.getColumn();
    var nr = e.range.getNumRows(), nc = e.range.getNumColumns();
    if (r0 + nr - 1 < EP.FIRST) return;
    if (name === EP.SH_TASK){
      if (c0 + nc - 1 < EPC.who || c0 > EPC.note) return;     /* chỉ G..L */
      var who = ''; try { who = (e.user && e.user.getEmail && e.user.getEmail()) || Session.getActiveUser().getEmail() || ''; } catch(x){}
      var top = Math.max(r0, EP.FIRST), n = r0 + nr - top;
      var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var st = sh.getRange(top, EPC.st, n, 2).getValues(), ev = sh.getRange(top, EPC.job, n, 1).getValues();
      var stamp = [], notes = [], doneCh = false;
      for (var i = 0; i < n; i++){
        var has = !!evsS_(ev[i][0]);
        stamp.push([has ? now : '']); notes.push([has && who ? 'Sửa bởi ' + who : '']);
        if (has && evsS_(st[i][0]) === 'Xong' && !(st[i][1] instanceof Date)){ st[i][1] = t0; doneCh = true; }
      }
      var rg = sh.getRange(top, EPC.upd, n, 1); rg.setValues(stamp); rg.setNotes(notes);
      if (doneCh && c0 <= EPC.st && c0 + nc - 1 >= EPC.st) sh.getRange(top, EPC.done, n, 1).setValues(st.map(function(r){ return [r[1]]; }));
      return;
    }
    if (name === EP.SH_EV && c0 <= 15 && c0 + nc - 1 >= 11){   /* đội K..O */
      var ss = sh.getParent(), keys = sh.getRange(Math.max(r0, EP.FIRST), 1, nr, 1).getValues();
      var lock = LockService.getScriptLock(); if (!lock.tryLock(5000)) return;
      try { var sset = epSettings_(ss); keys.forEach(function(k){ if (evsS_(k[0])) epReassign_(ss, sset, evsS_(k[0])); }); }
      finally { lock.releaseLock(); }
    }
  } catch(err){ try { console.log('epOnEdit: ' + (err && err.message || err)); } catch(x){} }
}

/* ══════════════ ĐỒNG BỘ ══════════════ */
function epSync(opt){
  opt = opt || {};
  var id = epId_();
  if (!id) return { ok:true, skipped:true, message:'Chưa khai báo file Kế hoạch & tiến độ sự kiện (EP.ID / EP_ID).' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok:false, error:'Đang có tiến trình ghi khác, thử lại sau.' };
  var T0 = Date.now(), rep = { ok:true, evNew:0, evUpd:0, tasksNew:0, reassigned:0, parts:[], errors:[] };
  try {
    var ss = SpreadsheetApp.openById(id);
    var ev = ss.getSheetByName(EP.SH_EV), tk = ss.getSheetByName(EP.SH_TASK);
    if (!ev || !tk) return { ok:false, error:'File không có tab "' + EP.SH_EV + '" / "' + EP.SH_TASK + '".' };
    epEnsureTrigger_(id);
    try { epCleanSample_(ss, rep); } catch(e){ rep.errors.push('Xoá ví dụ: ' + (e.message || e)); }

    var src = evsReadEvents_(), today = epIso_(new Date());
    var lo = epIso_(new Date(Date.now() - EP.BACK_DAYS * 864e5));
    src = src.filter(function(e){ return e.end >= lo; });
    var sset = epSettings_(ss);

    /* ① danh sách sự kiện */
    var le = epLastRow_(ev, 1), cur = [];
    if (le >= EP.FIRST) cur = ev.getRange(EP.FIRST, 1, le - EP.FIRST + 1, EP.EV_COLS).getValues().filter(function(r){ return evsS_(r[0]); });
    var byKey = {}; cur.forEach(function(r){ byKey[evsS_(r[0])] = r; });
    var srcKeys = {}; src.forEach(function(e){ srcKeys[epKey_(e.nk)] = 1; });
    var seen = {}, rows = [];
    src.forEach(function(e){
      var k = epKey_(e.nk);
      if (!byKey[k]){   /* đổi tên? cùng ngày D, mã cũ không còn trong nguồn */
        var cand = cur.filter(function(r){ var ck = evsS_(r[0]); return !seen[ck] && !srcKeys[ck] && epIso_(r[2]) === e.start; });
        if (cand.length === 1) k = evsS_(cand[0][0]);
      }
      if (seen[k]) return; seen[k] = 1;
      var old = byKey[k], st = [e.plan, e.action].filter(function(x){ return x; }).join(' · ');
      var row = [k, e.name, epDate_(e.start), e.end && e.end !== e.start ? epDate_(e.end) : '', e.type, epForm_(e), e.place, e.kol,
                 e.src === 'R' ? 'REPORT' : 'PLAN', st];
      Object.keys(EP.TEAM).forEach(function(role){ row[EP.TEAM[role]] = old ? old[EP.TEAM[role]] : (sset.roles[role] || ''); });
      row[15] = old ? old[15] : (e.start >= today && !e.approx ? 'Có' : 'Không');
      /* trước chưa có ngày cụ thể, nay có ngày (chưa diễn ra) ⇒ bật Theo dõi */
      if (old && !(old[2] instanceof Date) && !e.approx && e.start >= today && evsS_(old[15]) === 'Không') row[15] = 'Có';
      if (e.approx){ row[2] = ''; row[3] = ''; row[9] = (st ? st + ' · ' : '') + 'chưa có ngày cụ thể (' + e.ym + ')'; }
      if (!old) rep.evNew++;
      rows.push(row);
    });
    cur.forEach(function(r){ var k = evsS_(r[0]); if (!seen[k]){ var x = r.slice(); x[8] = 'Đã xoá'; rows.push(x); } });
    rows.sort(function(a, b){
      var x = epIso_(a[2]) || '9999', y = epIso_(b[2]) || '9999';
      return x < y ? -1 : x > y ? 1 : (evsS_(a[1]) < evsS_(b[1]) ? -1 : 1);
    });
    var sig = function(list){ return JSON.stringify(list.map(function(r){ return r.map(function(v){ return v instanceof Date ? epIso_(v) : evsS_(v); }); })); };
    var n = rows.length;
    if (sig(rows) !== sig(cur)){
      if (n) ev.getRange(EP.FIRST, 1, n, EP.EV_COLS).setValues(rows);
      if (le >= EP.FIRST + n) ev.getRange(EP.FIRST + n, 1, le - EP.FIRST - n + 1, EP.EV_COLS).clearContent();
      rep.evUpd = 1;
      if (n){
        var fm = ev.getRange(EP.FIRST, 17, n, 1).getFormulas();
        for (var i = 0; i < n; i++) if (!fm[i][0]) ev.getRange(EP.FIRST + i, 17, 1, 8).setFormulas([epEvF_(EP.FIRST + i)]);
      }
    }

    /* ② tạo việc cho sự kiện mới */
    var pr = PropertiesService.getScriptProperties(), gen = {};
    try { gen = JSON.parse(pr.getProperty('EP_GEN_' + id) || '{}'); } catch(e){ gen = {}; }
    var tpl = epTemplate_(ss);
    if (!tpl.length) rep.errors.push('Tab Mẫu việc trống');
    var lt = epLastRow_(tk, EPC.sk), inSheet = {};
    if (lt >= EP.FIRST) tk.getRange(EP.FIRST, EPC.sk, lt - EP.FIRST + 1, 1).getValues().forEach(function(r){ var k = evsS_(r[0]); if (k) inSheet[k] = 1; });
    var fin = {}; rows.forEach(function(r){ fin[evsS_(r[0])] = r; });
    var todo = Object.keys(fin).filter(function(k){
      var r = fin[k];
      return !gen[k] && !inSheet[k] && evsS_(r[15]) === 'Có' && r[2] instanceof Date && epIso_(r[2]) >= today && evsS_(r[8]) !== 'Đã xoá';
    }).sort(function(a, b){ return epIso_(fin[a][2]) < epIso_(fin[b][2]) ? -1 : 1; });
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    todo.forEach(function(k){
      if (Date.now() - T0 > 240000){ rep.partial = true; return; }
      var r = fin[k], start = r[2], end = r[3] instanceof Date ? r[3] : start, form = evsS_(r[5]), place = evsS_(r[6]);
      var list = tpl.filter(function(t){ return epApplies_(t.app, form, place); });
      if (!list.length) return;
      var lastNow = epLastRow_(tk, EPC.sk), at = lastNow + 1;   /* chèn trước dòng đầu có Ngày D lớn hơn */
      if (lastNow >= EP.FIRST){
        var bv = tk.getRange(EP.FIRST, EPC.d, lastNow - EP.FIRST + 1, 1).getValues();
        for (var i = 0; i < bv.length; i++){ if (bv[i][0] instanceof Date && bv[i][0] > start){ at = EP.FIRST + i; break; } }
      }
      if (at <= lastNow) tk.insertRowsBefore(at, list.length);
      var vals = list.map(function(t){
        var due = epDue_(start, end, t.n, t.unit, sset.holi), late = due < t0, who = epWho_(r, t.role, sset);
        return ['', '', '', t.grp, t.job, t.role, who, t.co, '', late ? 'Bỏ qua' : 'Chưa làm', '',
                late ? 'Tạo khi đã qua hạn — Owner xem lại (đã làm ⇒ Xong, cần làm ⇒ Chưa làm)' : '', '', '',
                k, t.ma, t.n, t.unit, '', '', who, ''];
      });
      tk.getRange(at, 1, vals.length, EP.TASK_COLS).setValues(vals);
      epWriteTaskF_(tk, at, vals.length);
      gen[k] = epIso_(new Date()); rep.tasksNew += vals.length;
      SpreadsheetApp.flush();
    });
    pr.setProperty('EP_GEN_' + id, JSON.stringify(gen));

    /* ③ đội đổi ⇒ việc chưa giao tay đổi theo */
    try { rep.reassigned = epReassign_(ss, sset, null); } catch(e){ rep.errors.push('Giao lại theo đội: ' + (e.message || e)); }

    /* ⑤ ô chọn sự kiện ở Điều phối */
    try {
      var sel = ss.getSheetByName(EP.SH_SEL);
      if (sel){
        var cell = sel.getRange(3, 2), curName = evsS_(cell.getValue());
        var names = rows.map(function(r){ return evsS_(r[1]); });
        if (!curName || names.indexOf(curName) < 0){
          var nx = rows.filter(function(r){ return r[2] instanceof Date && epIso_(r[2]) >= today && evsS_(r[15]) === 'Có'; })[0] || rows[0];
          if (nx) cell.setValue(evsS_(nx[1]));
        }
      }
    } catch(e){ rep.errors.push('Ô chọn Điều phối: ' + (e.message || e)); }

    rep.events = n;
    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Kế hoạch sự kiện — ' + n + ' sự kiện (mới ' + rep.evNew + ') · tạo ' + rep.tasksNew + ' việc · giao lại ' + rep.reassigned + ' · ' + rep.seconds + 's' +
      (rep.parts.length ? ' · ' + rep.parts.join(' · ') : '') + (rep.errors.length ? ' · ' + rep.errors.join(' | ') : '');
    pr.setProperty('EP_LAST', JSON.stringify({ at:Date.now(), msg:rep.message }));
    return rep;
  } catch(err){
    return { ok:false, error:String(err && err.message || err) };
  } finally { try { lock.releaseLock(); } catch(e){} }
}
/* action=epSync — mode=status: chỉ xem lần chạy cuối · còn lại: đồng bộ ngay (≤ 1 lần / 20 giây) */
function epApi_(user, p){
  p = p || {};
  if (String(p.mode || '') === 'status'){
    var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EP_LAST') || '{}'); } catch(e){}
    return { ok:true, ver:EP.VER, id:epId_() ? 'set' : '', last:last };
  }
  if (typeof throttleOk === 'function' && !throttleOk('ep_api', 20)) return { ok:true, skipped:true, message:'Vừa đồng bộ — đợi vài giây.' };
  return epSync({});
}
function epSyncNow(){ var r = epSync({}); Logger.log(JSON.stringify(r, null, 2)); return r; }
