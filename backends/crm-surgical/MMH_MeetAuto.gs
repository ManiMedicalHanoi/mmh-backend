/* ⭐ 21/11/2026 — MMH_MeetAuto.gs (GIỐNG HỆT ở crm-surgical + crm-dental — sửa 1 nơi chép sang nơi kia): EMAIL BIÊN BẢN HỌP NHÓM TỰ GỬI 16:00 THỨ BẢY (giờ VN, người dùng yêu cầu).
   Nội dung = biên bản tuần ở sheet 13. WEEKLY MEETING (Meeting ID MT-<thứ Hai yyyyMMdd>-TEAMSURGICAL | TEAMDENTAL): tóm tắt tiếng Anh app CRM lưu ở Snapshot ▸ sumEn
   (dòng "**đậm**…\ný con") + ghi chú họp (Data: <phần>Note · <phần>N_<pic> · other). Thư thường tiếng Anh: Dear Tuyen san · To Tuyen · CC Nguyen Ha (email theo USER_MAP, mmhMail_).
   Tuần đã gửi (cột Emailed at ≥ thứ Hai) ⇒ bỏ qua. Trigger `mtaWeekly` (thứ Bảy 16:00) tự cài ở mtaTick_ (ping / boot / bundle / version / mt…), kiểm 6 giờ / lần.
   Kiểm tra: GET action=mtaRun key=<8 ký tự cuối ID Sheet CRM> op=status | dry (không gửi; trả tiêu đề + người nhận + độ dài) | send (gửi ngay, force=1 gửi cả khi tuần đã gửi). */
var MTA = { HOUR:16, TO:['Tuyen'], CC:['Nguyen Ha'], TZ:'Asia/Ho_Chi_Minh', MON:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
function mtaCfg_(){
  var d = /dental/.test(String(TEAM() || '').toLowerCase());
  return d ? { label:'Dental', tp:'TEAMDENTAL', pics:['Viet', 'Vinh', 'Phuong'],
               secs:[['fc','Forecast'], ['td','Sales opportunities'], ['od','Distributor support orders'], ['vis','Field visits & plan'], ['pr','Product presentations'], ['oth','Other matters']] }
           : { label:'Surgical', tp:'TEAMSURGICAL', pics:['Viet Ha', 'Khang'],
               secs:[['fc','Forecast'], ['td','Sales opportunities'], ['vis','Field visits & plan'], ['pr','Product presentations'], ['oth','Other matters']] };
}
function mtaPk_(p){ return String(p || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function mtaEsc_(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function mtaB_(h){ return h.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>'); }
function mtaMailOf_(pic){ for(var e in USER_MAP){ if(String(USER_MAP[e].pic) === pic) return e; } return ''; }
function mtaMonday_(d){ d = d || new Date(); var u = +Utilities.formatDate(d, MTA.TZ, 'u'); return Utilities.formatDate(new Date(d.getTime() - (u - 1) * 864e5), MTA.TZ, 'yyyy-MM-dd'); }
function mtaWk_(w){
  var p = function(s){ var a = s.split('-'); return { y:+a[0], m:+a[1] - 1, d:+a[2] }; }, a = p(w);
  var z = new Date(Date.UTC(a.y, a.m, a.d) + 6 * 864e5), b = { y:z.getUTCFullYear(), m:z.getUTCMonth(), d:z.getUTCDate() };
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
function mtaHtml_(cfg, w, rec){
  var F = 'font-family:Calibri,Aptos,Arial,sans-serif;font-size:14px;color:#000;line-height:1.5', d = (rec && rec.data) || {}, sm = (rec && rec.snap && rec.snap.sumEn) || {};
  var h = '<div style="' + F + '"><p style="margin:0 0 12px">Dear Tuyen san,</p>' +
    '<p style="margin:0 0 12px">This is the summary of the ' + cfg.label + ' team weekly meeting for the week of ' + mtaWk_(w) + '.</p>';
  if(!rec) h += '<p style="margin:0 0 12px">No meeting record was saved in MMH CRM for this week.</p>';
  else cfg.secs.forEach(function(s, i){
    var k = s[0];
    h += '<p style="margin:16px 0 4px"><b>' + (i + 1) + '. ' + mtaEsc_(s[1]) + '</b></p>';
    if(k === 'oth'){ h += String(d.other || '').trim() ? '<p style="margin:0 0 8px">' + mtaNl_(d.other) + '</p>' : '<p style="margin:0 0 8px">No other matters.</p>'; return; }
    var x = sm[k];
    if(x && x.res){ h += '<p style="margin:6px 0 0"><b><u>Results this week</u></b></p>' + mtaUl_(x.res) +
      '<p style="margin:6px 0 0"><b><u>Plan for next week</u></b></p>' + (x.plan && x.plan.length ? mtaUl_(x.plan) : '<p style="margin:0 0 8px">—</p>'); }
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
function mtaSend_(opt){
  opt = opt || {};
  var cfg = mtaCfg_(), w = mtaMonday_(), id = 'MT-' + w.replace(/-/g, '') + '-' + cfg.tp;
  var g = mtGet_(id), rec = g && g.ok ? g.rec : null;
  if(rec && !opt.force && String(rec.emailedAt || '') >= w) return { ok:true, skip:'sent', id:id, emailedAt:rec.emailedAt };
  var to = MTA.TO.map(mtaMailOf_).filter(String), cc = MTA.CC.map(mtaMailOf_).filter(String);
  var subject = '[MMH ' + cfg.label + '] Weekly team meeting minutes – ' + mtaWk_(w), html = mtaHtml_(cfg, w, rec);
  var out = { ok:true, id:id, week:w, rec:!!rec, sumEn:!!(rec && rec.snap && rec.snap.sumEn), subject:subject, to:MTA.TO, cc:MTA.CC, len:html.length };
  if(opt.dry) return out;
  if(!to.length) return { ok:false, error:'Không thấy email người nhận' };
  mmhMail_({ to:to.join(','), cc:cc.join(','), subject:subject, htmlBody:html, name:'MMH CRM · ' + cfg.label + ' Team' });
  if(rec){ try{ mtLocked_(function(){ var sht = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT); if(mtFindRow_(sht, id)) mtWriteRow_(sht, id, { 'Emailed at':mtNow_(), 'Emailed to':'Auto · ' + MTA.TO.concat(MTA.CC).join(', ') }); mtBump_(); return true; }); }catch(e){ out.markErr = String(e && e.message || e); } }
  out.sent = mtNow_();
  try{ PropertiesService.getScriptProperties().setProperty('MTA_LAST', JSON.stringify(out)); }catch(e){}
  return out;
}
/* trigger: thứ Bảy 16:00 giờ VN */
function mtaWeekly(){ try{ mtaSend_({}); }catch(e){ try{ PropertiesService.getScriptProperties().setProperty('MTA_LAST', JSON.stringify({ ok:false, at:new Date().toISOString(), error:String(e && e.message || e) })); }catch(_){} } }
function mtaTick_(){
  var C = CacheService.getScriptCache(); if(C.get('mta_tick')) return; C.put('mta_tick', '1', 6 * 3600);
  var has = ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'mtaWeekly'; });
  if(!has){ ScriptApp.newTrigger('mtaWeekly').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(MTA.HOUR).nearMinute(0).inTimezone(MTA.TZ).create();
    PropertiesService.getScriptProperties().setProperty('MTA_TRIG', new Date().toISOString()); }
}
function mtaRun_(p){
  if(!(String(p.key || '') && String(p.key) === String(ss().getId()).slice(-8))) return { ok:false, code:'KEY', error:'key?' };
  var op = String(p.op || 'status');
  if(op === 'dry') return mtaSend_({ dry:true });
  if(op === 'send') return mtaSend_({ force:String(p.force) === '1' });
  if(op === 'tick'){ CacheService.getScriptCache().remove('mta_tick'); mtaTick_(); }
  var tr = ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction() === 'mtaWeekly'; }).length, P = PropertiesService.getScriptProperties();
  return { ok:true, team:mtaCfg_().label, trigger:tr, trigAt:P.getProperty('MTA_TRIG') || '', last:P.getProperty('MTA_LAST') || '' };
}
