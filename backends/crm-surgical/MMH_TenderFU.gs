/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH · FOLLOW UP TENDER — theo dõi gói thầu dao / chỉ khâu nhãn khoa theo địa bàn (web Tender Map, 04/11/2026)
   Chỉ có ở backend CRM Surgical VN. Sheet ẨN "FOLLOW UP TENDER" trong file CRM này (code tự tạo + tự ẩn).

   GHI NỐI TIẾP, KHÔNG BAO GIỜ SỬA / XOÁ DÒNG CŨ: mỗi lần PIC cập nhật 1 gói = 1 dòng mới (cùng "Mã theo dõi", "Lần" + 1)
   ⇒ giữ đủ lịch sử từng bước: Giới thiệu → Lên danh mục → Chốt cấu hình → Ra báo giá → Ra HSMT → Đang chấm thầu
   → Đã trúng / Đã trượt (hoặc Huỷ / dừng). Trạng thái hiện tại = dòng mới nhất của mã đó.

   v1.1 (04/11/2026): bỏ bắt đăng nhập (người cập nhật = tên gõ trên app).
   v1.2 (04/11/2026, người dùng yêu cầu): CHỈ tài khoản email công ty **@manimedicalhanoi.com / @mani.inc** mới XEM và GHI được (fuList / fuSave cần phiên `tk`
   hợp lệ — tfWho_ ở MMH_TripFlow.gs, ký bằng RH_Secret của Training Master, tài khoản đang hoạt động trong RH_Users). Người cập nhật = tên + email trong phiên
   (không còn ô gõ tên). Không phiên / sai miền ⇒ { ok:false, code:'AUTH' }. Không dùng dịch vụ Google mới ⇒ không phải cấp quyền lại.

     GET/POST action=fuMeta                    → { ok, v, stages }
     GET/POST action=fuList  tk                → { ok, v, me, people, stages, cols, rows:[[…]] }  (mọi dòng, cũ → mới)
     POST     action=fuSave  tk rid case? fid hosp prov addr pkg tbmt ptype items[] value stage due note ll
                                               → { ok, rec:[…], cols }
     GET      action=fuCrm   tk hosp prov olds → { ok, acc, alt, visits, cbc, orders }   (v1.3: địa bàn khớp tên + tỉnh trong CRM Surgical)
     GET      action=fuRemind op=dry|run [mail=0] key=<8 ký tự cuối ID Sheet> (hoặc phiên Admin) → kế hoạch / chạy nhắc việc

   v1.3 (04/11/2026, người dùng duyệt đề xuất review Tender Map):
   · NHẮC VIỆC — trigger hằng ngày fuDaily (~08:00, tự cài khi có người mở Theo dõi thầu: fuTick_): gói đang theo dõi (giai đoạn 1–6)
     có mốc dự kiến trong 3 ngày tới / đã quá mốc mà chưa cập nhật ⇒ 1 dòng sheet RH_Notify (Training Master) cho PIC — hiện ở nút "Nhắc tôi" của
     Report Hub / CRM, bấm mở Tender Map đúng cơ sở; gói ≥ 30 ngày chưa cập nhật ⇒ nhắc PIC + trưởng nhóm (ORDER_APPROVERS.surgical), nhắc lại mỗi tuần.
     Đã nhắc ghi ở Script Property FU_REMIND_LOG (không nhắc trùng). Thứ Hai: email tóm tắt (mmhMail_) cho từng PIC có gói đang theo dõi + 1 email tổng cho trưởng nhóm.
   v1.3.1 (05/11/2026): sửa v1.2 từ chối nhầm MỌI phiên (phiên chỉ có phần trước @ ⇒ không khớp mẫu miền) ⇒ đăng nhập xong vẫn quay lại ô nhập email.
   · fuCrm — chi tiết cơ sở trên Tender Map hiện dữ liệu CRM Surgical: mã / PIC địa bàn, lượt gặp 12 tháng, người liên hệ (CBC, không SĐT), đơn hàng 12 tháng.
     Cần phiên email công ty như fuList.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var FU = {
  VER: '1.3.1',
  MAP_URL: 'https://manimedicalhanoi.github.io/Tender-Result/map/',
  SOON_DAYS: 3, STALE_DAYS: 30, TRIG_V: 'fu1',
  DOMAINS: /@(manimedicalhanoi\.com|mani\.inc)$/i,
  TAB: 'FOLLOW UP TENDER',
  HDR: ['Thời gian cập nhật', 'Mã theo dõi', 'Lần', 'PIC', 'Email', 'Mã cơ sở', 'Cơ sở y tế', 'Tỉnh / thành', 'Địa chỉ',
        'Tên gói thầu', 'Số TBMT', 'Loại sản phẩm', 'Sản phẩm · SL ước tính', 'Tổng SL', 'Giá trị ước tính (VND)',
        'Bước', 'Giai đoạn', 'Ngày dự kiến', 'Tình hình (ghi chú)', 'Sản phẩm (JSON)', 'Mã yêu cầu', 'Nguồn', 'Toạ độ'],
  COLS: ['at', 'id', 'rev', 'pic', 'mail', 'fid', 'hosp', 'prov', 'addr', 'pkg', 'tbmt', 'ptype', 'itemsTxt', 'qty', 'value',
         'stage', 'stageName', 'due', 'note', 'items', 'rid', 'src', 'll'],
  STAGES: ['', 'Giới thiệu sản phẩm', 'Lên danh mục', 'Chốt cấu hình', 'Ra báo giá', 'Ra HSMT', 'Đang chấm thầu',
           'Đã trúng thầu', 'Đã trượt thầu', 'Huỷ / dừng theo dõi'],
  MAX_ITEMS: 40
};

function fuRoute_(action, p){
  try{
    if(action === 'fuMeta') return { ok:true, v:FU.VER, stages:FU.STAGES };
    if(action === 'fuList') return fuList_(p);
    if(action === 'fuSave') return fuSave_(p);
    if(action === 'fuCrm') return fuCrm_(p);
    if(action === 'fuRemind') return fuRemindApi_(p);
    return { ok:false, error:'Unknown action: ' + action };
  }catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}

/* danh tính: CHỈ phiên email công ty hợp lệ (v1.2). Lỗi ⇒ { err } */
function fuMail_(tk){   /* email trong phiên (phần dữ liệu của tk; chữ ký đã được tfWho_ kiểm) — Training Hub ghi phần trước @ (vd. "mmh.product") */
  try{ var d = tfS_(tk), dot = d.indexOf('.'); return tfS_(JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(d.substring(0, dot))).getDataAsString()).e).toLowerCase(); }catch(e){ return ''; }
}
function fuMe_(p){
  var AUTH = 'Theo dõi thầu chỉ dành cho tài khoản email công ty (@manimedicalhanoi.com hoặc @mani.inc) — đăng nhập để xem.';
  if(!tfS_(p && p.tk)) return { err:AUTH };
  var me = null; try{ me = tfWho_(p); }catch(e){ me = { err:String(e && e.message || e) }; }
  if(!me || me.err || !me.pic) return { err:(me && me.err) || AUTH };
  /* v1.3.1 — phiên của Training Hub chỉ ghi PHẦN TRƯỚC @ (rhaToken_: e = u.local) và chỉ cấp cho email công ty (rhAuthStart / rhAuthVerify kiểm HUB.DOMAINS)
     ⇒ chỉ từ chối khi phiên có ghi đủ email mà khác miền công ty (v1.2 từ chối nhầm mọi phiên vì "mmh.product" không có @…) */
  var mail = fuMail_(p.tk);
  if(mail.indexOf('@') >= 0 && !FU.DOMAINS.test(mail)) return { err:AUTH };
  return { pic:me.pic, local:me.local || '', level:me.level || '', admin:!!me.admin, tk:true, mail:mail };
}
/* tên nhân sự đang hoạt động (RH_Users của Training Master) — chỉ tên, không email; đệm 1 giờ */
function fuPeople_(){
  var c = CacheService.getScriptCache(), hit = null;
  try{ hit = c.get('fu_people'); if(hit) return JSON.parse(hit); }catch(e){}
  var out = [];
  try{
    var us = SpreadsheetApp.openById(TF.MASTER_ID).getSheetByName('RH_Users');
    if(us && us.getLastRow() > 1){
      us.getRange(2, 1, us.getLastRow() - 1, 5).getValues().forEach(function(r){
        var n = tfS_(r[1]), active = r[4] === '' || r[4] === true || /^(true|1|x|yes)$/i.test(tfS_(r[4]));
        if(n && active && !/^TEST/i.test(n) && out.indexOf(n) < 0) out.push(n);
      });
    }
    out.sort(function(a, b){ return a.localeCompare(b); });
    c.put('fu_people', JSON.stringify(out), 3600);
  }catch(e){}
  return out;
}

function fuSheet_(){
  var book = ss(), sh = book.getSheetByName(FU.TAB);
  if(!sh){
    sh = book.insertSheet(FU.TAB);
    sh.getRange(1, 1, 1, FU.HDR.length).setValues([FU.HDR]).setFontWeight('bold').setBackground('#CFE2F3');
    sh.setFrozenRows(1);
  } else {
    var h = sh.getRange(1, 1, 1, FU.HDR.length).getValues()[0];
    if(h.some(function(x, i){ return tfS_(x) !== FU.HDR[i]; })) sh.getRange(1, 1, 1, FU.HDR.length).setValues([FU.HDR]).setFontWeight('bold');
  }
  try{ if(!sh.isSheetHidden()) sh.hideSheet(); }catch(e){}
  return sh;
}

function fuRowOut_(r){
  r = r.map(function(v){ return typeof v === 'string' && v.charAt(0) === "'" ? v.slice(1) : v; });
  var at = r[0] instanceof Date && !isNaN(r[0]) ? Utilities.formatDate(r[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss') : tfS_(r[0]);
  var due = r[17] instanceof Date && !isNaN(r[17]) ? Utilities.formatDate(r[17], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : tfS_(r[17]);
  return [at, tfS_(r[1]), +r[2] || 1, tfS_(r[3]), tfS_(r[4]), tfS_(r[5]), tfS_(r[6]), tfS_(r[7]), tfS_(r[8]), tfS_(r[9]), tfS_(r[10]),
          tfS_(r[11]), tfS_(r[12]), +r[13] || 0, +r[14] || 0, +r[15] || 0, tfS_(r[16]), due, tfS_(r[18]), tfS_(r[19]), tfS_(r[20]),
          tfS_(r[21]), tfS_(r[22])];
}

function fuList_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', v:FU.VER, error:me.err, stages:FU.STAGES };
  fuTick_();
  var sh = fuSheet_(), last = sh.getLastRow(), rows = [];
  if(last >= 2){
    sh.getRange(2, 1, last - 1, FU.HDR.length).getValues().forEach(function(r){ if(tfS_(r[1])) rows.push(fuRowOut_(r)); });
  }
  return { ok:true, v:FU.VER, me:{ pic:me.pic, local:me.local, level:me.level, admin:!!me.admin, tk:me.tk }, people:fuPeople_(), stages:FU.STAGES, cols:FU.COLS, rows:rows };
}

/* chuỗi bắt đầu bằng = + - @ ⇒ thêm ' để Sheet không hiểu thành công thức */
function fuTxt_(v, max){ var s = tfS_(v).replace(/\r\n?/g, '\n'); if(max && s.length > max) s = s.slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function fuNum_(v){ var n = Number(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; }

function fuSave_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var hosp = tfS_(p.hosp), stage = parseInt(p.stage, 10) || 0;
  if(!hosp) return { ok:false, error:'Chưa chọn cơ sở y tế.' };
  if(!(stage >= 1 && stage < FU.STAGES.length)) return { ok:false, error:'Chưa chọn giai đoạn của gói thầu.' };
  var items = p.items;
  if(typeof items === 'string'){ try{ items = JSON.parse(items); }catch(e){ items = []; } }
  items = (Array.isArray(items) ? items : []).slice(0, FU.MAX_ITEMS).map(function(it){
    return { code:tfS_(it && it.code).slice(0, 40), qty:fuNum_(it && it.qty), kind:/^chi/i.test(tfS_(it && it.kind)) ? 'chi' : 'dao', name:tfS_(it && it.name).slice(0, 80) };
  }).filter(function(it){ return it.code; });
  var due = tfIso_(p.due);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = fuSheet_(), last = sh.getLastRow(), id = tfS_(p['case']), rev = 1;
    var rid = tfS_(p.rid).slice(0, 80);
    if(last >= 2){
      var V = sh.getRange(2, 1, last - 1, FU.HDR.length).getValues();
      for(var i = 0; i < V.length; i++){
        if(rid && tfS_(V[i][20]) === rid) return { ok:true, dup:true, rec:fuRowOut_(V[i]), cols:FU.COLS };   /* gửi lại cùng mã yêu cầu */
        if(id && tfS_(V[i][1]) === id) rev = Math.max(rev, (+V[i][2] || 1) + 1);
      }
      if(id && rev === 1) return { ok:false, error:'Không tìm thấy gói đang theo dõi ' + id + '.' };
    } else if(id) return { ok:false, error:'Không tìm thấy gói đang theo dõi ' + id + '.' };
    if(!id) id = 'FU' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    var qty = items.reduce(function(a, it){ return a + it.qty; }, 0);
    var txt = items.map(function(it){ return it.code + ' × ' + (it.qty || '?'); }).join('; ');
    var row = [new Date(), id, rev, fuTxt_(me.pic, 60), me.local, fuTxt_(p.fid, 40), fuTxt_(hosp, 200), fuTxt_(p.prov, 60), fuTxt_(p.addr, 300),
      fuTxt_(p.pkg, 300), fuTxt_(p.tbmt, 60), fuTxt_(p.ptype, 40), fuTxt_(txt, 2000), qty, fuNum_(p.value), stage, FU.STAGES[stage],
      due, fuTxt_(p.note, 3000), JSON.stringify(items), rid, fuTxt_(p.src || 'Tender Map', 40), fuTxt_(p.ll, 40)];
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    return { ok:true, rec:fuRowOut_(row), cols:FU.COLS };
  } finally { lock.releaseLock(); }
}

/* ═════════════ v1.3 — NHẮC VIỆC (RH_Notify + email thứ Hai) ═════════════ */
function fuToday_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function fuAddDays_(iso, n){ var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function fuDays_(a, b){ var x = new Date(String(a).slice(0, 10) + 'T00:00:00'), y = new Date(String(b).slice(0, 10) + 'T00:00:00'); return (isNaN(x) || isNaN(y)) ? 0 : Math.round((y - x) / 864e5); }
function fuD2_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function fuH_(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
/* gói = các dòng cùng Mã theo dõi; trạng thái = dòng mới nhất (Lần lớn nhất) */
function fuCases_(){
  var sh = fuSheet_(), last = sh.getLastRow(); if(last < 2) return [];
  var by = {}, order = [];
  sh.getRange(2, 1, last - 1, FU.HDR.length).getValues().forEach(function(r){
    var o = fuRowOut_(r), id = o[1]; if(!id) return;
    var c = by[id]; if(!c){ c = by[id] = { first:o, last:o }; order.push(id); }
    if((+o[2] || 1) >= (+c.last[2] || 1)) c.last = o;
  });
  return order.map(function(id){ var L = by[id].last;
    return { id:id, at:L[0], start:by[id].first[0], pic:L[3], hosp:L[6], prov:L[7], pkg:L[9], tbmt:L[10], stage:+L[15] || 0, stageName:L[16], due:L[17], note:L[18], items:L[12] }; });
}
function fuLink_(c){ return FU.MAP_URL + '?v=fu#' + encodeURIComponent(c.prov) + '/' + encodeURIComponent(c.hosp); }
function fuMgrs_(){ try{ return (typeof ORDER_APPROVERS !== 'undefined' && ORDER_APPROVERS.surgical) ? ORDER_APPROVERS.surgical.slice() : []; }catch(e){ return []; } }
function fuLogGet_(){ try{ return JSON.parse(PropertiesService.getScriptProperties().getProperty('FU_REMIND_LOG') || '{}') || {}; }catch(e){ return {}; } }
function fuLogPut_(log){
  var t = fuToday_(), keys = Object.keys(log).filter(function(k){ return fuDays_(log[k], t) <= 60; }).sort(function(a, b){ return log[b] < log[a] ? -1 : 1; }).slice(0, 220), o = {};
  keys.forEach(function(k){ o[k] = log[k]; });
  try{ PropertiesService.getScriptProperties().setProperty('FU_REMIND_LOG', JSON.stringify(o)); }catch(e){}
}
/* kế hoạch nhắc của hôm nay: [{key, to, c, title, text}] — chưa nhắc (theo FU_REMIND_LOG) */
function fuPlan_(today){
  var t = today || fuToday_(), soon = fuAddDays_(t, FU.SOON_DAYS), log = fuLogGet_(), out = [], mg = fuMgrs_();
  fuCases_().forEach(function(c){
    if(!(c.stage >= 1 && c.stage <= 6) || /^TEST/i.test(c.pic)) return;
    var at = String(c.at).slice(0, 10), age = fuDays_(at, t), what = c.stageName + ' · ' + (c.pkg || c.id);
    if(c.due && c.due <= soon && c.due >= at){                                     /* mốc sắp tới / đã qua mà chưa cập nhật sau mốc */
      var k = c.id + '|due|' + c.due;
      if(!log[k]) out.push({ key:k, to:c.pic, c:c, title:(c.due < t ? 'Quá mốc dự kiến ' : 'Sắp tới mốc ') + fuD2_(c.due) + ' · ' + c.hosp,
        text:what + (c.note ? ' — ' + c.note.slice(0, 220) : '') + '\nCập nhật giai đoạn trên Tender Map ▸ Theo dõi thầu.' });
    }
    if(age >= FU.STALE_DAYS){                                                       /* lâu chưa cập nhật: nhắc lại mỗi 7 ngày */
      var k2 = c.id + '|stale|' + Math.floor(age / 7);
      if(!log[k2]){
        out.push({ key:k2, to:c.pic, c:c, title:age + ' ngày chưa cập nhật gói theo dõi · ' + c.hosp, text:what + '\nLần cập nhật cuối ' + fuD2_(at) + ' — ghi tình hình mới hoặc chuyển "Huỷ / dừng theo dõi".' });
        mg.forEach(function(m){ if(String(m).toLowerCase() !== String(c.pic).toLowerCase()) out.push({ key:k2 + '|' + m, to:m, c:c, title:'Gói theo dõi ' + age + ' ngày chưa cập nhật · ' + c.hosp, text:'PIC ' + c.pic + ' · ' + what + ' · cập nhật cuối ' + fuD2_(at) }); });
      }
    }
  });
  return out;
}
/* ghi thông báo vào RH_Notify (Training Master) — cùng cột với app Sự kiện MKT; App = "Theo dõi thầu" (nút "Nhắc tôi" hiện thẳng tên này) */
function fuNotify_(plan){
  if(!plan.length) return 0;
  var HDR = ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt'], now = new Date();
  var rows = plan.map(function(x){ return ['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), now, x.to, 'Theo dõi thầu', 'remind', x.title.slice(0, 300), String(x.text || '').slice(0, 900), fuLink_(x.c), 'Tender Map', '', x.c.id, '']; });
  var book = SpreadsheetApp.openById(TF.MASTER_ID), sh = book.getSheetByName('RH_Notify');
  if(!sh){ sh = book.insertSheet('RH_Notify'); sh.getRange(1, 1, 1, HDR.length).setValues([HDR]).setFontWeight('bold'); sh.setFrozenRows(1); }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HDR.length).setValues(rows);
  return rows.length;
}
/* email PIC theo tên (RH_Users: A email, B tên, E đang hoạt động) */
function fuMailOf_(){
  var m = {};
  try{
    var us = SpreadsheetApp.openById(TF.MASTER_ID).getSheetByName('RH_Users');
    us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 5).getValues().forEach(function(r){
      var n = tfS_(r[1]), em = tfS_(r[0]).toLowerCase(), act = r[4] === '' || r[4] === true || /^(true|1|x|yes)$/i.test(tfS_(r[4]));
      if(!n || !em || !act || /^TEST/i.test(n)) return; if(em.indexOf('@') < 0) em += '@manimedicalhanoi.com'; m[n.toLowerCase()] = em;
    });
  }catch(e){}
  return m;
}
/* thứ Hai: mỗi PIC 1 email các gói đang theo dõi của mình + 1 email tổng cho trưởng nhóm (thư thường, như email hệ thống khác) */
function fuWeekly_(dry){
  var t = fuToday_(), open = fuCases_().filter(function(c){ return c.stage >= 1 && c.stage <= 6 && !/^TEST/i.test(c.pic); });
  if(!open.length) return { sent:0, pics:0 };
  var M = fuMailOf_(), by = {}, sent = 0, miss = [];
  open.forEach(function(c){ (by[c.pic] = by[c.pic] || []).push(c); });
  function row(c){ var at = String(c.at).slice(0, 10), age = fuDays_(at, t);
    return '<tr><td style="padding:4px 8px;border-top:1px solid #E6EAEF"><a href="' + fuH_(fuLink_(c)) + '">' + fuH_(c.hosp) + '</a><br><span style="color:#55667D">' + fuH_(c.pkg || c.id) + '</span></td>' +
      '<td style="padding:4px 8px;border-top:1px solid #E6EAEF">' + fuH_(c.stageName) + '</td><td style="padding:4px 8px;border-top:1px solid #E6EAEF">' + (c.due ? fuD2_(c.due) : '—') + '</td>' +
      '<td style="padding:4px 8px;border-top:1px solid #E6EAEF;' + (age >= FU.STALE_DAYS ? 'color:#B42318;font-weight:600' : '') + '">' + fuD2_(at) + (age >= FU.STALE_DAYS ? ' (' + age + ' ngày)' : '') + '</td></tr>'; }
  function table(L){ return '<table style="border-collapse:collapse;font-size:13px"><tr style="background:#F0F7FF;text-align:left"><th style="padding:4px 8px">Cơ sở · gói</th><th style="padding:4px 8px">Giai đoạn</th><th style="padding:4px 8px">Mốc dự kiến</th><th style="padding:4px 8px">Cập nhật cuối</th></tr>' + L.map(row).join('') + '</table>'; }
  var sortL = function(L){ return L.sort(function(a, b){ return String(a.due || '9999').localeCompare(String(b.due || '9999')) || a.stage - b.stage; }); };
  var foot = '<p>Mở Tender Map ▸ <b>Theo dõi thầu</b> để cập nhật: <a href="' + FU.MAP_URL + '?v=fu">' + FU.MAP_URL + '</a></p><p>Best regards,<br>MMH Tender Map</p>' +
    '<p style="color:#8C9AAD;font-size:12px">Email tự động mỗi thứ Hai — vui lòng không trả lời.</p>';
  Object.keys(by).forEach(function(pic){
    var em = M[pic.toLowerCase()]; if(!em){ miss.push(pic); return; }
    var L = sortL(by[pic]), stale = L.filter(function(c){ return fuDays_(c.at, t) >= FU.STALE_DAYS; }).length;
    var html = '<p>Dear ' + fuH_(pic) + ',</p><p>Tuần này bạn đang theo dõi <b>' + L.length + '</b> gói thầu dao / chỉ khâu' + (stale ? ', trong đó <b>' + stale + '</b> gói đã ≥ ' + FU.STALE_DAYS + ' ngày chưa cập nhật' : '') + ':</p>' + table(L) + foot;
    if(!dry){ try{ mmhMail_({ to:em, subject:'[Tender Map] Gói thầu đang theo dõi tuần ' + fuD2_(t) + ' · ' + L.length + ' gói', htmlBody:html, body:'Mở Tender Map ▸ Theo dõi thầu: ' + FU.MAP_URL }); sent++; }catch(e){ miss.push(pic + ' (' + e.message + ')'); } }
    else sent++;
  });
  var mg = fuMgrs_().map(function(m){ return M[String(m).toLowerCase()]; }).filter(Boolean);
  if(mg.length){
    var stale = open.filter(function(c){ return fuDays_(c.at, t) >= FU.STALE_DAYS; }).length;
    var hon = fuMgrs_().map(function(m){ return (typeof NA_HONOR !== 'undefined' && NA_HONOR[m]) || ('anh/chị ' + m); }).join(', ');
    var html = '<p>Dear ' + fuH_(hon) + ',</p><p>Tổng hợp theo dõi thầu dao / chỉ khâu tuần ' + fuD2_(t) + ': <b>' + open.length + '</b> gói đang theo dõi, <b>' + stale + '</b> gói ≥ ' + FU.STALE_DAYS + ' ngày chưa cập nhật.</p>' +
      Object.keys(by).sort().map(function(pic){ return '<p style="margin:12px 0 4px"><b>' + fuH_(pic) + '</b> · ' + by[pic].length + ' gói</p>' + table(sortL(by[pic])); }).join('') + foot;
    if(!dry){ try{ mmhMail_({ to:mg.join(','), subject:'[Tender Map] Tổng hợp theo dõi thầu tuần ' + fuD2_(t), htmlBody:html, body:'Mở Tender Map ▸ Theo dõi thầu: ' + FU.MAP_URL }); sent++; }catch(e){ miss.push('trưởng nhóm (' + e.message + ')'); } }
    else sent++;
  }
  return { sent:sent, pics:Object.keys(by).length, miss:miss };
}
/* trigger hằng ngày (~08:00): nhắc vào RH_Notify; thứ Hai thêm email tóm tắt */
function fuDaily(){
  var lock = LockService.getScriptLock(); if(!lock.tryLock(5000)) return;
  try{
    var t = fuToday_(); if(new Date(t + 'T00:00:00').getDay() === 0) return;          /* Chủ nhật nghỉ */
    var plan = fuPlan_(t), log = fuLogGet_(), n = 0;
    try{ n = fuNotify_(plan); plan.forEach(function(x){ log[x.key] = t; }); fuLogPut_(log); }catch(e){ Logger.log('fuDaily notify: ' + e.message); }
    var w = null;
    if(new Date(t + 'T00:00:00').getDay() === 1 && PropertiesService.getScriptProperties().getProperty('FU_WEEK') !== t){
      w = fuWeekly_(false); PropertiesService.getScriptProperties().setProperty('FU_WEEK', t);
    }
    PropertiesService.getScriptProperties().setProperty('FU_LAST', JSON.stringify({ at:new Date().toISOString(), notify:n, weekly:w }));
  } finally { lock.releaseLock(); }
}
/* tự cài trigger fuDaily (1 lần / phiên bản TRIG_V) — gọi khi có người mở Theo dõi thầu */
function fuTick_(){
  try{
    var P = PropertiesService.getScriptProperties(); if(P.getProperty('FU_TRIG') === FU.TRIG_V) return;
    ScriptApp.getProjectTriggers().forEach(function(tr){ if(tr.getHandlerFunction() === 'fuDaily') ScriptApp.deleteTrigger(tr); });
    ScriptApp.newTrigger('fuDaily').timeBased().everyDays(1).atHour(8).inTimezone('Asia/Ho_Chi_Minh').create();
    P.setProperty('FU_TRIG', FU.TRIG_V);
  }catch(e){ Logger.log('fuTick_: ' + e.message); }
}
/* thử / chạy tay: action=fuRemind op=dry|run|week [mail=0] key=<8 ký tự cuối ID Sheet> hoặc phiên Admin */
function fuRemindApi_(p){
  var okKey = tfS_(p.key) && tfS_(p.key) === String(ssReal_().getId()).slice(-8);
  if(!okKey){ var me = fuMe_(p); if(me.err || !me.admin) return { ok:false, code:'AUTH', error:'Cần khoá file hoặc phiên Admin.' }; }
  var op = tfS_(p.op) || 'dry', plan = fuPlan_(tfIso_(p.today) || '');
  var info = { trigger:PropertiesService.getScriptProperties().getProperty('FU_TRIG') || '', last:PropertiesService.getScriptProperties().getProperty('FU_LAST') || '', cases:fuCases_().length };
  if(op === 'dry') return { ok:true, v:FU.VER, op:op, info:info, plan:plan.map(function(x){ return { to:x.to, title:x.title }; }), weekly:fuWeekly_(true) };
  if(op === 'tick'){ PropertiesService.getScriptProperties().deleteProperty('FU_TRIG'); fuTick_(); return { ok:true, trigger:PropertiesService.getScriptProperties().getProperty('FU_TRIG') }; }
  if(op === 'week') return { ok:true, weekly:fuWeekly_(tfS_(p.mail) === '0') };
  var n = fuNotify_(plan), log = fuLogGet_(), t = fuToday_(); plan.forEach(function(x){ log[x.key] = t; }); fuLogPut_(log);
  return { ok:true, op:op, notified:n };
}

/* ═════════════ v1.3 — fuCrm: dữ liệu CRM Surgical của 1 cơ sở (Tender Map ▸ chi tiết cơ sở) ═════════════ */
function fuNk_(s){
  var k = ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ') + ' ';
  for(var i = 0; i < 2; i++) k = k.replace(/ bvdk /g, ' benh vien da khoa ').replace(/ bv /g, ' benh vien ').replace(/ ttyt /g, ' trung tam y te ').replace(/ dk /g, ' da khoa ')
    .replace(/ tw /g, ' trung uong ').replace(/ tp /g, ' thanh pho ').replace(/ hcm /g, ' ho chi minh ').replace(/ (tinh|thanh pho) /g, ' ');
  return k.replace(/\s+/g, '');
}
function fuPk_(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '').replace(/^(thanhpho|tp|tinh)/, '').replace(/^(hcm|tphcm|saigon)$/, 'hochiminh'); }
function fuCrm_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var hosp = tfS_(p.hosp), key = fuNk_(hosp); if(key.length < 6) return { ok:false, error:'Thiếu tên cơ sở.' };
  var provs = [tfS_(p.prov)].concat(tfS_(p.olds).split('|')).map(fuPk_).filter(Boolean);
  var ck = 'fucrm|' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, key + '|' + provs.join(','))).slice(0, 22), C = CacheService.getScriptCache();
  try{ var hit = C.get(ck); if(hit) return JSON.parse(hit); }catch(e){}
  var okProv = function(pv){ var k = fuPk_(pv); return !k || provs.indexOf(k) >= 0; };
  var cand = customerIndex().map(function(c){ var k = fuNk_(c.name), sc = 0;
      if(k === key) sc = 3; else if(k.length >= 10 && key.length >= 10 && (k.indexOf(key) >= 0 || key.indexOf(k) >= 0) && Math.min(k.length, key.length) / Math.max(k.length, key.length) >= 0.75) sc = 2;
      return { c:c, sc:sc + (fuPk_(c.province) && provs.indexOf(fuPk_(c.province)) >= 0 ? 0.5 : 0) }; })
    .filter(function(x){ return x.sc >= 2 && okProv(x.c.province); }).sort(function(a, b){ return b.sc - a.sc; });
  var out = { ok:true, v:FU.VER, acc:null, alt:0 };
  if(cand.length){
    var acc = cand[0].c, ak = fuNk_(acc.name), since = Utilities.formatDate(new Date(Date.now() - 365 * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    out.acc = { code:acc.code, name:acc.name, type:acc.type, province:acc.province, area:acc.area, pic:acc.pic }; out.alt = cand.length - 1;
    var vis = readTab('weekly').filter(function(r){ var a = parseCheckName(S(r.account)); return fuNk_(a.name || r.account) === ak && okProv(a.province || r.province); })
      .map(function(r){ return { d:d2s(r.start), pic:S(r.pic), act:S(r.typeAction), st:S(r.status), res:S(r.result).slice(0, 240), fb:S(r.feedback).slice(0, 160) }; })
      .filter(function(v){ return v.d && v.d <= fuToday_(); }).sort(function(a, b){ return a.d < b.d ? 1 : -1; });
    var v12 = vis.filter(function(v){ return v.d >= since; }), done = v12.filter(function(v){ return /^complete/i.test(v.st); }).length;
    out.visits = { n12:v12.length, done12:done, total:vis.length, last:vis.slice(0, 5) };
    out.cbc = readTab('cbc').filter(function(r){ return S(r.code) === acc.code; }).slice(0, 15)
      .map(function(r){ return { name:S(r.contact), title:S(r.jobTitle), spec:S(r.specialize), role:S(r.role), inf:S(r.influence) }; }).filter(function(x){ return x.name; });
    var ords = readTab('order').filter(function(r){ return (S(r.code) === acc.code || fuNk_(r.name) === ak) && d2s(r.day) >= since; }), nos = {}, amt = 0, pr = {}, lastD = '';
    ords.forEach(function(r){ nos[S(r.orderNo) || (d2s(r.day) + '|' + S(r.pic))] = 1; amt += num(r.amount); var k = S(r.ptype) || S(r.detail).slice(0, 40) || '—'; pr[k] = (pr[k] || 0) + num(r.qty); if(d2s(r.day) > lastD) lastD = d2s(r.day); });
    out.orders = { n:Object.keys(nos).length, amount:Math.round(amt), last:lastD, prods:Object.keys(pr).map(function(k){ return [k, pr[k]]; }).sort(function(a, b){ return b[1] - a[1]; }).slice(0, 8) };
  }
  try{ C.put(ck, JSON.stringify(out), 600); }catch(e){}
  return out;
}

