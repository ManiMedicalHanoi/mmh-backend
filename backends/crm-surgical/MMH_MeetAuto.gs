/* ⭐ 21/11/2026 — MMH_MeetAuto.gs (GIỐNG HỆT ở crm-surgical + crm-dental — sửa 1 nơi chép sang nơi kia): EMAIL BIÊN BẢN HỌP NHÓM TỰ GỬI 16:00 THỨ BẢY (giờ VN, người dùng yêu cầu).
   Nội dung = biên bản tuần ở sheet 13. WEEKLY MEETING (Meeting ID MT-<thứ Hai yyyyMMdd>-TEAMSURGICAL | TEAMDENTAL): tóm tắt tiếng Anh app CRM lưu ở Snapshot ▸ sumEn
   (dòng "**đậm**…\ný con") + ghi chú họp (Data: <phần>Note · <phần>N_<pic> · other). Thư thường tiếng Anh: Dear Tuyen san · To Tuyen · CC Nguyen Ha (email theo USER_MAP, mmhMail_).
   Tuần đã gửi (cột Emailed at ≥ thứ Hai) ⇒ bỏ qua. Trigger `mtaWeekly` (thứ Bảy 16:00) CHỈ cài ở crm-dental (mtaTick_ ở ping / boot / bundle / version / mt…, kiểm 6 giờ / lần):
   backend crm-surgical không có quyền script.scriptapp ⇒ trigger của Dental gửi luôn biên bản Surgical (mở file CRM Surgical bằng openById — cùng chủ script). Không cài trigger ở Surgical (tránh gửi 2 lần).
   Kiểm tra: GET action=mtaRun key=<8 ký tự cuối ID Sheet CRM> op=status | check (Dental: thử đọc biên bản Surgical, không gửi) | dry | send (gửi ngay, force=1 gửi cả khi tuần đã gửi) [team=surgical|dental]. */
var MTA = { HOUR:16, TO:['Tuyen'], CC:['Nguyen Ha'], TZ:'Asia/Ho_Chi_Minh', MON:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
var MTA_SURG_ID = '16ke8ZRvmbG6TUte-oDLFSGzKbW9_PA98EJnLo5LoauM';   /* file CRM Surgical (MMH_Surgical_CRM) */
function mtaCfg_(team){
  var d = team ? team === 'dental' : /dental/.test(String(TEAM() || '').toLowerCase());
  return d ? { label:'Dental', tp:'TEAMDENTAL', pics:['Viet', 'Vinh', 'Phuong'],
               secs:[['fc','Forecast'], ['td','Sales opportunities'], ['od','Distributor support orders'], ['vis','Field visits & plan'], ['pr','Product presentations'], ['oth','Other matters']] }
           : { label:'Surgical', tp:'TEAMSURGICAL', pics:['Viet Ha', 'Khang'],
               secs:[['fc','Forecast'], ['td','Sales opportunities'], ['vis','Field visits & plan'], ['pr','Product presentations'], ['oth','Other matters']] };
}
function mtaPk_(p){ return String(p || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function mtaEsc_(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function mtaB_(h){ return h.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>'); }
function mtaMailOf_(pic){ for(var e in USER_MAP){ if(String(USER_MAP[e].pic) === pic) return e; } return ''; }
function mtaMondayOf_(w){ var a = w.split('-'), z = new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])), u = z.getUTCDay() || 7; return mtaAdd_(w, 1 - u); }
function mtaMonday_(d){ d = d || new Date(); var u = +Utilities.formatDate(d, MTA.TZ, 'u'); return Utilities.formatDate(new Date(d.getTime() - (u - 1) * 864e5), MTA.TZ, 'yyyy-MM-dd'); }
function mtaAdd_(w, n){ var a = w.split('-'), z = new Date(Date.UTC(+a[0], +a[1] - 1, +a[2]) + n * 864e5); return Utilities.formatDate(z, 'UTC', 'yyyy-MM-dd'); }
function mtaWk_(w, e){
  var p = function(s){ var a = s.split('-'); return { y:+a[0], m:+a[1] - 1, d:+a[2] }; }, a = p(w), b = p(e || mtaAdd_(w, 6));
  return a.d + (a.m !== b.m ? ' ' + MTA.MON[a.m] : '') + (a.y !== b.y ? ' ' + a.y : '') + ' – ' + b.d + ' ' + MTA.MON[b.m] + ' ' + b.y;
}
function mtaUl_(L){
  return '<ul style="margin:2px 0 8px;padding-left:22px">' + L.map(function(x){
    var a = String(x).split('\n'), sub = a.slice(1).filter(function(s){ return s.trim(); });
    return '<li style="margin:2px 0">' + mtaB_(mtaEsc_(a[0])) + (sub.length ? '<ul style="margin:2px 0 4px;padding-left:20px;list-style-type:circle">' +
      sub.map(function(s){ return '<li>' + mtaB_(mtaEsc_(s)) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
  }).join('') + '</ul>';
}
function mtaNl_(s){ return mtaEsc_(s).replace(/\r?\n/g, '<br>'); }
function mtaHtml_(cfg, w, rec, e){
  e = e || mtaAdd_(w, 6); var nx = mtaAdd_(mtaMondayOf_(e), 7);
  var F = 'font-family:Calibri,Aptos,Arial,sans-serif;font-size:14px;color:#000;line-height:1.5', d = (rec && rec.data) || {}, sm = (rec && rec.snap && rec.snap.sumEn) || {};
  var h = '<div style="' + F + '"><p style="margin:0 0 12px">Dear Tuyen san,</p>' +
    '<p style="margin:0 0 12px">This is the summary of the ' + cfg.label + ' team meeting covering ' + mtaWk_(w, e) + '.</p>';
  if(!rec) h += '<p style="margin:0 0 12px">No meeting record was saved in MMH CRM for this week.</p>';
  else cfg.secs.forEach(function(s, i){
    var k = s[0];
    h += '<p style="margin:16px 0 4px"><b>' + (i + 1) + '. ' + mtaEsc_(s[1]) + '</b></p>';
    if(k === 'oth'){ h += String(d.other || '').trim() ? '<p style="margin:0 0 8px">' + mtaNl_(d.other) + '</p>' : '<p style="margin:0 0 8px">No other matters.</p>'; return; }
    var x = sm[k];
    if(x && x.res){ h += '<p style="margin:6px 0 0"><b><u>Results (' + mtaWk_(w, e) + ')</u></b></p>' + mtaUl_(x.res) +
      '<p style="margin:6px 0 0"><b><u>Plan for next week (' + mtaWk_(nx) + ')</u></b></p>' + (x.plan && x.plan.length ? mtaUl_(x.plan) : '<p style="margin:0 0 8px">—</p>'); }
    else h += '<p style="margin:0 0 8px">Data not available.</p>';
    var o = []; if(String(d[k + 'Note'] || '').trim()) o.push(['General', d[k + 'Note']]);
    cfg.pics.forEach(function(p){ var v = d[k + 'N_' + mtaPk_(p)]; if(String(v || '').trim()) o.push([p, v]); });
    if(String(d[k + 'Prev'] || '').trim()) o.push(['Results (typed)', d[k + 'Prev']]); if(String(d[k + 'Plan'] || '').trim()) o.push(['Plan (typed)', d[k + 'Plan']]);
    if(o.length) h += '<p style="margin:6px 0 0"><b><u>Meeting notes</u></b></p><ul style="margin:2px 0 8px;padding-left:22px">' +
      o.map(function(n){ return '<li><b>' + mtaEsc_(n[0]) + ':</b> ' + mtaNl_(n[1]) + '</li>'; }).join('') + '</ul>';
  });
  h += '<p style="margin:20px 0 4px">Best regards,</p><p style="margin:0">' + cfg.label + ' Team<br>MANI Medical Hanoi</p>' +
    '<p style="margin:14px 0 0;font-size:12px;color:#555">This e-mail is sent automatically by MMH CRM every Saturday at 16:00.</p></div>';
  return h;
}
/* gửi biên bản tuần này. opt: { dry, force } */
/* đọc biên bản (sheet 13. WEEKLY MEETING) của 1 file bất kỳ ⇒ { sht, rec } */
function mtaGet_(book, id){
  var sht = book.getSheetByName(MT_CFG.SH_MEET); if(!sht) return { sht:null, rec:null };
  var r = mtFindRow_(sht, id); if(!r) return { sht:sht, rec:null };
  var H = mtHdr_(sht), v = sht.getRange(r, 1, 1, H.n).getValues()[0], g = function(h){ return (h in H.map) ? v[H.map[h]] : ''; };
  var data = mtJ_(String(g('Data (JSON)') || '{}')), snap = mtJ_(String(g('Snapshot (JSON)') || '{}'));
  return { sht:sht, rec:{ id:id, data:(data && typeof data === 'object') ? data : {}, snap:(snap && typeof snap === 'object') ? snap : {}, emailedAt:mtStr_(g('Emailed at'), 'yyyy-MM-dd HH:mm') } };
}
/* opt: { dry, force, team:'surgical'|'dental' (mặc định nhóm của backend) } */
function mtaSend_(opt){
  opt = opt || {};
  var cfg = mtaCfg_(opt.team), own = !opt.team || opt.team === (/dental/.test(String(TEAM() || '').toLowerCase()) ? 'dental' : 'surgical');
  var book = own ? ss() : SpreadsheetApp.openById(MTA_SURG_ID), pk = mtaPick_(book, cfg.tp, opt.force);
  if(pk.skip) return { ok:true, skip:pk.skip, id:pk.id || '', period:pk.a ? pk.a + ' → ' + pk.b : '' };
  var w = pk.a, e = pk.b, id = pk.id || ('MT-' + w.replace(/-/g, '') + '-' + cfg.tp), G = pk.id ? mtaGet_(book, id) : { sht:null, rec:null }, rec = G.rec;
  var to = MTA.TO.map(mtaMailOf_).filter(String), cc = MTA.CC.map(mtaMailOf_).filter(String);
  var subject = '[MMH ' + cfg.label + '] Team meeting minutes – ' + mtaWk_(w, e), html = mtaHtml_(cfg, w, rec, e);
  var out = { ok:true, id:id, week:w, to_:e, rec:!!rec, sumEn:!!(rec && rec.snap && rec.snap.sumEn), subject:subject, to:MTA.TO, cc:MTA.CC, len:html.length };
  if(opt.dry) return out;
  if(!to.length) return { ok:false, error:'Không thấy email người nhận' };
  mmhMail_({ to:to.join(','), cc:cc.join(','), subject:subject, htmlBody:html, name:'MMH CRM · ' + cfg.label + ' Team' });
  if(rec && G.sht){ try{ mtLocked_(function(){ if(mtFindRow_(G.sht, id)) mtWriteRow_(G.sht, id, { 'Emailed at':mtNow_(), 'Emailed to':'Auto · ' + MTA.TO.concat(MTA.CC).join(', ') }); if(own) mtBump_(); return true; }); }catch(e){ out.markErr = String(e && e.message || e); } }
  out.sent = mtNow_();
  try{ PropertiesService.getScriptProperties().setProperty('MTA_LAST_' + cfg.tp, JSON.stringify(out)); }catch(e){}
  return out;
}
/* v1.1 (21/11/2026): KỲ HỌP Từ – Đến (app CRM v39.0, Data._to / cột Tuần "dd/MM/yyyy – dd/MM/yyyy"; biên bản cũ = thứ Hai + 6 ngày).
   Chọn kỳ CHƯA gửi email đã kết thúc (Đến ≤ hôm nay, trong 14 ngày) mới nhất; kỳ đang chạy / đã gửi ⇒ bỏ qua; không có biên bản nào gần đây ⇒ email báo chưa có biên bản (tuần hiện tại). */
function mtaPick_(book, tp, force){
  var today = Utilities.formatDate(new Date(), MTA.TZ, 'yyyy-MM-dd'), sht = book.getSheetByName(MT_CFG.SH_MEET), L = [];
  if(sht && sht.getLastRow() >= 2){
    var H = mtHdr_(sht), V = sht.getRange(2, 1, sht.getLastRow() - 1, H.n).getValues(), ci = function(h){ return (h in H.map) ? H.map[h] : -1; };
    var iId = ci('Meeting ID'), iW = ci('Week start'), iL = ci('Tuần'), iE = ci('Emailed at'), iD = ci('Data (JSON)');
    V.forEach(function(r){
      var id = String(r[iId] || ''); if(id.slice(-tp.length - 1) !== '-' + tp) return;
      var a = mtStr_(r[iW]); if(!/^\d{4}-\d{2}-\d{2}$/.test(a)) return;
      var d = iD >= 0 ? mtJ_(String(r[iD] || '{}')) : {}; d = (d && typeof d === 'object') ? d : {};
      var m = /(\d{2})\/(\d{2})\/(\d{4})\s*[–-]\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(String(iL >= 0 ? r[iL] : '') || '');
      var b = /^\d{4}-\d{2}-\d{2}$/.test(String(d._to || '')) ? d._to : m ? m[6] + '-' + m[5] + '-' + m[4] : mtaAdd_(a, 6);
      var em = iE >= 0 ? mtStr_(r[iE], 'yyyy-MM-dd HH:mm') : '';
      L.push({ id:id, a:a, b:b, sent:!!em && em.slice(0, 10) >= a });
    });
  }
  var lim = mtaAdd_(today, -13), C = L.filter(function(x){ return (force || !x.sent) && x.b <= today && x.b >= lim; }).sort(function(x, y){ return x.b < y.b ? 1 : -1; });
  if(C.length) return C[0];
  var run = L.filter(function(x){ return x.a <= today && x.b > today; })[0]; if(run) return { skip:'running', id:run.id, a:run.a, b:run.b };
  var done = L.filter(function(x){ return x.sent && x.b >= mtaAdd_(today, -6); })[0]; if(done) return { skip:'sent', id:done.id, a:done.a, b:done.b };
  var w = mtaMonday_(); return { a:w, b:mtaAdd_(w, 6), id:'' };
}
/* trigger: thứ Bảy 16:00 giờ VN */
function mtaWeekly(){
  ['dental', 'surgical'].forEach(function(t){
    try{ mtaSend_({ team:t }); }catch(e){ try{ PropertiesService.getScriptProperties().setProperty('MTA_LAST_' + mtaCfg_(t).tp, JSON.stringify({ ok:false, at:new Date().toISOString(), error:String(e && e.message || e) })); }catch(_){} }
  });
}
function mtaTick_(){
  if(!/dental/.test(String(TEAM() || '').toLowerCase())) return;   /* chỉ backend Dental giữ trigger (gửi cả Surgical) */
  var C = CacheService.getScriptCache(); if(C.get('mta_tick')) return; C.put('mta_tick', '1', 6 * 3600);
  var has = ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'mtaWeekly'; });
  if(!has){ ScriptApp.newTrigger('mtaWeekly').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(MTA.HOUR).nearMinute(0).inTimezone(MTA.TZ).create();
    PropertiesService.getScriptProperties().setProperty('MTA_TRIG', new Date().toISOString()); }
}
function mtaRun_(p){
  if(!(String(p.key || '') && String(p.key) === String(ss().getId()).slice(-8))) return { ok:false, code:'KEY', error:'key?' };
  var op = String(p.op || 'status');
  var tm = /^(surgical|dental)$/.test(String(p.team || '')) ? String(p.team) : '';
  if(op === 'dry') return mtaSend_({ dry:true, team:tm });
  if(op === 'send') return mtaSend_({ force:String(p.force) === '1', team:tm });
  if(op === 'tick'){ CacheService.getScriptCache().remove('mta_tick'); mtaTick_(); }
  var tr = -1; try{ tr = ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction() === 'mtaWeekly'; }).length; }catch(e){}
  var P = PropertiesService.getScriptProperties();
  var out = { ok:true, team:mtaCfg_().label, trigger:tr, trigAt:P.getProperty('MTA_TRIG') || '', lastDental:P.getProperty('MTA_LAST_TEAMDENTAL') || '', lastSurgical:P.getProperty('MTA_LAST_TEAMSURGICAL') || '' };
  if(op === 'check'){ try{ out.surgical = mtaSend_({ dry:true, team:'surgical' }); }catch(e){ out.surgical = { ok:false, error:String(e && e.message || e) }; } }
  return out;
}
