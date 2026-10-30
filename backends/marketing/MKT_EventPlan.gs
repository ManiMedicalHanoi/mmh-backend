/*************************************************************************************************
 * MMH — MKT_EventPlan.gs   (v1.0 · 30/10/2026)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * FILE "Kế hoạch & tiến độ sự kiện" (1 file chung cho MỌI sự kiện — theo SOP MMHSOP_0XX Quy trình tổ chức sự kiện).
 * Tab: Dashboard · Giao việc · Sự kiện · Mẫu việc · Cài đặt · Hướng dẫn (bố cục dựng sẵn từ file mẫu .xlsx, tải lên Drive).
 *
 *  ① Tab "Sự kiện" = danh sách sự kiện đọc từ file "2. Vietnam - Marketing Offline FY68" (REPORT_EVENT + PLAN_EVENT,
 *     dùng chung evsReadEvents_ của Event_Sync.gs). Cột A–J do hệ thống ghi (sắp theo ngày D), cột K Owner + L Theo dõi
 *     do người dùng nhập — được GIỮ theo Mã SK. Mã SK = "EV-" + băm tên không dấu; đổi tên sự kiện mà ngày D không đổi
 *     ⇒ giữ mã cũ (việc đã giao không bị nhân đôi). Sự kiện không còn trong file Offline ⇒ giữ dòng, Nguồn = "Đã xoá".
 *  ② Sự kiện MỚI có ngày cụ thể, D ≥ hôm nay ⇒ tạo bộ việc ở tab "Giao việc" theo tab "Mẫu việc" (chèn theo thứ tự ngày D),
 *     người phụ trách = người mặc định theo vai trò (tab Cài đặt A:B). Việc có hạn đã qua lúc tạo ⇒ "Bỏ qua" + ghi chú
 *     để Owner xem lại. Mỗi sự kiện chỉ tạo 1 lần (Script Property EP_GEN) — Owner xoá việc thì không tạo lại.
 *     Áp dụng: Tất cả · Trực tiếp · Webinar · Ngoài Hà Nội (Hình thức / Type of event / Place của sự kiện).
 *  ③ Lần đồng bộ đầu: xoá dữ liệu ví dụ của file mẫu (Mã SK "VD-…", người "(ví dụ)").
 * Tên sự kiện / Hạn / Ngày D / Cảnh báo là CÔNG THỨC (tên vùng SK_A, SK_B, SK_C, SK_D, SK_L, HOLI, PEOPLE có sẵn trong file mẫu) ⇒ đổi ngày D ở
 * file Offline thì mọi hạn tự tính lại; Owner gõ ngày đè lên ô Hạn thì giữ.
 * Chạy: evsSyncTick (10 phút / lần) · action=epSync (mode=status chỉ xem) · tay: epSyncNow().
 * Không dùng dịch vụ mới (SpreadsheetApp / PropertiesService / LockService) ⇒ không phải cấp quyền lại.
 *************************************************************************************************/
var EP = {
  VER: '1.0',
  ID: '',                       /* ID file Google Sheet "Kế hoạch & tiến độ sự kiện" (hoặc Script Property EP_ID) */
  SH_EV: 'Sự kiện', SH_TASK: 'Giao việc', SH_TPL: 'Mẫu việc', SH_SET: 'Cài đặt',
  FIRST: 5,                     /* dòng dữ liệu đầu tiên của mọi tab (tiêu đề ở dòng 4) */
  BACK_DAYS: 60,                /* sự kiện kết thúc trong 60 ngày qua → tương lai mới đưa vào danh sách */
  EV_COLS: 12,                  /* A..L */
  TASK_COLS: 18                 /* A..R */
};
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

/* ── công thức (giống hệt file mẫu .xlsx) ── */
function epEvF_(r){
  var G = "'Giao việc'";
  return [
    '=IF(A' + r + '="","",COUNTIFS(' + G + '!$M$5:$M$3004,A' + r + ',' + G + '!$I$5:$I$3004,"<>Bỏ qua"))',
    '=IF(A' + r + '="","",COUNTIFS(' + G + '!$M$5:$M$3004,A' + r + ',' + G + '!$I$5:$I$3004,"Xong"))',
    '=IF(A' + r + '="","",COUNTIFS(' + G + '!$M$5:$M$3004,A' + r + ',' + G + '!$L$5:$L$3004,"*QUÁ HẠN*"))',
    '=IF(A' + r + '="","",COUNTIFS(' + G + '!$M$5:$M$3004,A' + r + ',' + G + '!$L$5:$L$3004,"CHƯA GIAO*"))',
    '=IF(OR(A' + r + '="",N(M' + r + ')=0),"",N' + r + '/M' + r + ')',
    '=IF(Q' + r + '="","",REPT("█",ROUND(Q' + r + '*10,0))&REPT("░",10-ROUND(Q' + r + '*10,0)))',
    '=IF(C' + r + '="","Chưa có ngày",IF(C' + r + '>TODAY(),"Còn "&(C' + r + '-TODAY())&" ngày",IF(IF(D' + r + '="",C' + r + ',D' + r + ')>=TODAY(),"Đang diễn ra","Đã qua "&(TODAY()-IF(D' + r + '="",C' + r + ',D' + r + '))&" ngày")))',
    '=IF(AND(A' + r + '<>"",L' + r + '="Có",ISNUMBER(C' + r + ')),IF(IF(D' + r + '="",C' + r + ',D' + r + ')>=TODAY()-35,C' + r + '+ROW()/100000,""),"")'
  ];   /* M..T */
}
function epTaskF_(r){
  var end = 'IFERROR(IF(INDEX(SK_D,MATCH(M' + r + ',SK_A,0))="",B' + r + ',INDEX(SK_D,MATCH(M' + r + ',SK_A,0))),B' + r + ')';
  var F = 'F' + r, H = 'H' + r;
  return {
    A: '=IF(M' + r + '="","",IFERROR(INDEX(SK_B,MATCH(M' + r + ',SK_A,0))&"",""))',
    B: '=IF(M' + r + '="","",IFERROR(INDEX(SK_C,MATCH(M' + r + ',SK_A,0)),""))',
    C: '=IF(O' + r + '="","",IF(O' + r + '=0,"D",IF(O' + r + '<0,"D"&O' + r + ',"D+"&O' + r + ')))',
    H: '=IF(OR(B' + r + '="",O' + r + '=""),"",IF(O' + r + '>0,IF(P' + r + '="Làm việc",WORKDAY(' + end + ',O' + r + ',HOLI),' + end + '+O' + r + '),B' + r + '+O' + r + '))',
    L: '=IF(E' + r + '="","",IF(I' + r + '="Bỏ qua","—",IF(I' + r + '="Xong",IF(AND(ISNUMBER(J' + r + '),ISNUMBER(' + H + '),J' + r + '>' + H + '),"Xong trễ","Xong"),' +
       'IF(' + F + '="","CHƯA GIAO","")&IF(NOT(ISNUMBER(' + H + ')),"",IF(TODAY()>' + H + ',IF(' + F + '=""," · ","")&"QUÁ HẠN "&(TODAY()-' + H + ')&" ngày",' +
       'IF(' + H + '-TODAY()<=3,IF(' + F + '=""," · ","")&"Đến hạn "&IF(' + H + '=TODAY(),"hôm nay","trong "&(' + H + '-TODAY())&" ngày"),""))))))',
    Q: '=IF(AND(E' + r + '<>"",R' + r + '="Có",I' + r + '<>"Xong",I' + r + '<>"Bỏ qua",ISNUMBER(' + H + ')),' + H + '+ROW()/100000,"")',
    R: '=IF(M' + r + '="","",IFERROR(INDEX(SK_L,MATCH(M' + r + ',SK_A,0)),""))'
  };
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
function epDelRows_(sh, rows){   /* xoá dòng (số dòng tăng dần) — gom đoạn liền, xoá từ dưới lên */
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
  var ev = ss.getSheetByName(EP.SH_EV), tk = ss.getSheetByName(EP.SH_TASK), st = ss.getSheetByName(EP.SH_SET);
  var n = 0;
  if (tk){
    var lt = epLastRow_(tk, 13), del = [];
    if (lt >= EP.FIRST) tk.getRange(EP.FIRST, 13, lt - EP.FIRST + 1, 1).getValues().forEach(function(r, i){ if (/^VD-/.test(evsS_(r[0]))) del.push(EP.FIRST + i); });
    if (del.length){ epDelRows_(tk, del); n += del.length; }
  }
  if (ev){
    var le = epLastRow_(ev, 1);
    if (le >= EP.FIRST){
      var v = ev.getRange(EP.FIRST, 1, le - EP.FIRST + 1, EP.EV_COLS).getValues();
      v.forEach(function(r, i){ if (/^VD-/.test(evsS_(r[0]))) ev.getRange(EP.FIRST + i, 1, 1, EP.EV_COLS).clearContent(); });
    }
  }
  if (st){   /* người "(ví dụ)" ở Cài đặt: cột B (mặc định theo vai trò) + D:F (danh sách người) */
    var b = st.getRange(EP.FIRST, 2, 40, 1).getValues(), d = st.getRange(EP.FIRST, 4, 40, 3).getValues(), ch = false;
    b.forEach(function(r){ if (/\(ví dụ\)/.test(evsS_(r[0]))){ r[0] = ''; ch = true; } });
    d.forEach(function(r){ if (/\(ví dụ\)/.test(evsS_(r[0]))){ r[0] = r[1] = r[2] = ''; ch = true; } });
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

/* ══════════════ ĐỒNG BỘ ══════════════ */
function epSync(opt){
  opt = opt || {};
  var id = epId_();
  if (!id) return { ok:true, skipped:true, message:'Chưa khai báo file Kế hoạch & tiến độ sự kiện (EP.ID / EP_ID).' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok:false, error:'Đang có tiến trình ghi khác, thử lại sau.' };
  var T0 = Date.now(), rep = { ok:true, evNew:0, evUpd:0, tasksNew:0, parts:[], errors:[] };
  try {
    var ss = SpreadsheetApp.openById(id);
    var ev = ss.getSheetByName(EP.SH_EV), tk = ss.getSheetByName(EP.SH_TASK);
    if (!ev || !tk) return { ok:false, error:'File không có tab "' + EP.SH_EV + '" / "' + EP.SH_TASK + '".' };
    try { epCleanSample_(ss, rep); } catch(e){ rep.errors.push('Xoá ví dụ: ' + (e.message || e)); }

    var src = evsReadEvents_(), today = epIso_(new Date());
    var lo = epIso_(new Date(Date.now() - EP.BACK_DAYS * 864e5));
    src = src.filter(function(e){ return e.end >= lo; });

    /* ① danh sách hiện có trong file */
    var le = epLastRow_(ev, 1), cur = [];
    if (le >= EP.FIRST) cur = ev.getRange(EP.FIRST, 1, le - EP.FIRST + 1, EP.EV_COLS).getValues().filter(function(r){ return evsS_(r[0]); });
    var byKey = {}; cur.forEach(function(r){ byKey[evsS_(r[0])] = r; });
    var seen = {}, rows = [], fresh = [];
    var sset = epSettings_(ss), owner = sset.roles['MKT Leader'] || '';
    src.forEach(function(e){
      var k = epKey_(e.nk);
      if (!byKey[k]){   /* đổi tên? cùng ngày D, mã cũ không còn trong nguồn */
        var cand = cur.filter(function(r){ return !seen[evsS_(r[0])] && epIso_(r[2]) === e.start && !src.some(function(x){ return epKey_(x.nk) === evsS_(r[0]); }); });
        if (cand.length === 1) k = evsS_(cand[0][0]);
      }
      if (seen[k]) return; seen[k] = 1;
      var old = byKey[k], form = epForm_(e);
      var st = [e.plan, e.action].filter(function(x){ return x; }).join(' · ');
      var row = [k, e.name, epDate_(e.start), e.end && e.end !== e.start ? epDate_(e.end) : '', e.type, form, e.place, e.kol,
                 e.src === 'R' ? 'REPORT' : 'PLAN', st,
                 old ? old[10] : owner, old ? old[11] : (e.start >= today && !e.approx ? 'Có' : 'Không')];
      /* trước chưa có ngày cụ thể, nay có ngày (chưa diễn ra) ⇒ bật Theo dõi */
      if (old && !(old[2] instanceof Date) && !e.approx && e.start >= today && evsS_(old[11]) === 'Không') row[11] = 'Có';
      if (e.approx){ row[2] = ''; row[3] = ''; row[9] = (st ? st + ' · ' : '') + 'chưa có ngày cụ thể (' + e.ym + ')'; }
      if (!old){ rep.evNew++; fresh.push({ k:k, e:e, form:form, row:row }); }
      rows.push(row);
    });
    cur.forEach(function(r){ var k = evsS_(r[0]); if (!seen[k]){ var x = r.slice(); x[8] = 'Đã xoá'; rows.push(x); } });
    rows.sort(function(a, b){
      var x = epIso_(a[2]) || '9999', y = epIso_(b[2]) || '9999';
      return x < y ? -1 : x > y ? 1 : (evsS_(a[1]) < evsS_(b[1]) ? -1 : 1);
    });

    /* ghi A..L (chỉ khi khác) + công thức M..T cho dòng chưa có */
    var sig = function(list){ return JSON.stringify(list.map(function(r){ return r.map(function(v){ return v instanceof Date ? epIso_(v) : evsS_(v); }); })); };
    var n = rows.length;
    if (sig(rows) !== sig(cur)){
      if (n) ev.getRange(EP.FIRST, 1, n, EP.EV_COLS).setValues(rows);
      if (le >= EP.FIRST + n) ev.getRange(EP.FIRST + n, 1, le - EP.FIRST - n + 1, EP.EV_COLS).clearContent();
      rep.evUpd = 1;
      if (n){
        var fm = ev.getRange(EP.FIRST, 13, n, 1).getFormulas(), need = [];
        for (var i = 0; i < n; i++) if (!fm[i][0]) need.push(EP.FIRST + i);
        need.forEach(function(r){ ev.getRange(r, 13, 1, 8).setFormulas([epEvF_(r)]); });
      }
    }

    /* ② tạo việc cho sự kiện mới */
    var pr = PropertiesService.getScriptProperties(), gen = {};
    try { gen = JSON.parse(pr.getProperty('EP_GEN_' + id) || '{}'); } catch(e){ gen = {}; }
    var tpl = epTemplate_(ss);
    if (!tpl.length) rep.errors.push('Tab Mẫu việc trống');
    var lt = epLastRow_(tk, 13), keysInSheet = {};
    var tkKeys = lt >= EP.FIRST ? tk.getRange(EP.FIRST, 13, lt - EP.FIRST + 1, 1).getValues() : [];
    tkKeys.forEach(function(r){ var k = evsS_(r[0]); if (k) keysInSheet[k] = 1; });
    var finalRows = {}; rows.forEach(function(r){ finalRows[evsS_(r[0])] = r; });
    var todo = Object.keys(finalRows).filter(function(k){
      var r = finalRows[k];
      return !gen[k] && !keysInSheet[k] && evsS_(r[11]) === 'Có' && r[2] instanceof Date && epIso_(r[2]) >= today && evsS_(r[8]) !== 'Đã xoá';
    }).sort(function(a, b){ return epIso_(finalRows[a][2]) < epIso_(finalRows[b][2]) ? -1 : 1; });
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    todo.forEach(function(k){
      if (Date.now() - T0 > 240000){ rep.partial = true; return; }
      var r = finalRows[k], start = r[2], end = r[3] instanceof Date ? r[3] : start, form = evsS_(r[5]), place = evsS_(r[6]);
      var list = tpl.filter(function(t){ return epApplies_(t.app, form, place); });
      if (!list.length) return;
      /* chèn theo thứ tự ngày D: trước dòng đầu tiên có Ngày D (cột B) lớn hơn */
      var lastNow = epLastRow_(tk, 13), at = lastNow + 1;
      if (lastNow >= EP.FIRST){
        var bv = tk.getRange(EP.FIRST, 2, lastNow - EP.FIRST + 1, 1).getValues();
        for (var i = 0; i < bv.length; i++){ if (bv[i][0] instanceof Date && bv[i][0] > start){ at = EP.FIRST + i; break; } }
      }
      if (at <= lastNow) tk.insertRowsBefore(at, list.length);
      var vals = list.map(function(t){
        var due = epDue_(start, end, t.n, t.unit, sset.holi), late = due < t0;
        return ['', '', '', t.grp, t.job, sset.roles[t.role] || '', t.co, '', late ? 'Bỏ qua' : 'Chưa làm', '',
                late ? 'Tạo khi đã qua hạn — Owner xem lại (đã làm ⇒ Xong, cần làm ⇒ Chưa làm)' : '', '', k, t.ma, t.n, t.unit, '', ''];
      });
      tk.getRange(at, 1, vals.length, EP.TASK_COLS).setValues(vals);
      var fB = [], fH = [], fL = [], fQ = [];
      for (var j = 0; j < vals.length; j++){ var f = epTaskF_(at + j); fB.push([f.A, f.B, f.C]); fH.push([f.H]); fL.push([f.L]); fQ.push([f.Q, f.R]); }
      tk.getRange(at, 1, vals.length, 3).setFormulas(fB);
      tk.getRange(at, 8, vals.length, 1).setFormulas(fH);
      tk.getRange(at, 12, vals.length, 1).setFormulas(fL);
      tk.getRange(at, 17, vals.length, 2).setFormulas(fQ);
      gen[k] = epIso_(new Date()); rep.tasksNew += vals.length;
      SpreadsheetApp.flush();
    });
    pr.setProperty('EP_GEN_' + id, JSON.stringify(gen));
    rep.events = n;
    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Kế hoạch sự kiện — ' + n + ' sự kiện (mới ' + rep.evNew + ') · tạo ' + rep.tasksNew + ' việc · ' + rep.seconds + 's' +
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
