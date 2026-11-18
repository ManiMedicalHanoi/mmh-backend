/*************************************************************************************************
 * MMH — MKT_EventHubRH.gs   (Event Hub v2.2 · 18/11/2026) — nối app Sự kiện MKT ⇄ Report Hub Marketing (CHỈ ĐỌC, không chép việc sang sheet WEEKLY):
 *  ① ehRhKeys_: Key task trên Report Hub ứng với từng sự kiện (tên key trùng tên sự kiện / tên ở file MKT Offline, so không dấu) ⇒ app hiện
 *     "Report Hub: Key task 140 · Thuong · 5 sub-task · 3 xong" + nút mở Report Hub; boot trả `rhk` (đệm 5 phút).
 *  ② ehEvListExtra_: danh sách gợi ý tên sự kiện của Report Hub (evList) thêm sự kiện tạo trên app Sự kiện (chưa có ở file MKT Offline) + mã sự kiện
 *     `eh` / link app `u` / folder `f` ⇒ Report Hub cảnh báo trùng Key task theo SỰ KIỆN (mọi tháng), vẫn cho tạo khi cần (người dùng chốt 18/11/2026).
 *************************************************************************************************/
function ehRhKeys_(events){
  var c = CacheService.getScriptCache(), hit = c.get('eh_rhk');
  if (hit){ try { return JSON.parse(hit); } catch(e){} }
  var out = {}, keys = [];
  try { var r = readWeekly(); keys = Array.isArray(r) ? r : (r && r.keys) || []; } catch(e){ return out; }
  var by = {};
  keys.forEach(function(k){ var n = ehNorm_(k.keyTask); if (n && !/^(lich cong tac|internal meeting|mmh monthly)/.test(n)) (by[n] = by[n] || []).push(k); });
  (events || []).forEach(function(e){
    var names = [ehNorm_(e.name), ehNorm_(e.offlineName)].filter(function(x){ return x && x.length >= 8; }), L = [];
    names.forEach(function(n){ (by[n] || []).forEach(function(k){ if (L.indexOf(k) < 0) L.push(k); }); });
    if (!L.length) return;
    out[ehS_(e.id)] = L.slice(0, 5).map(function(k){
      var subs = k.subs || [], d = subs.filter(function(s){ return /^(done|completed|xong|hoàn thành)/i.test(String(s.status || '')); }).length;
      return { no: String(k.no), name: String(k.keyTask), pic: String(k.pic || ''), st: String(k.status || ''), m: String(k.month || ''), n: subs.length, d: d };
    });
  });
  try { c.put('eh_rhk', JSON.stringify(out), 300); } catch(e){}
  return out;
}
/* evList (Report Hub) + sự kiện của app Sự kiện MKT */
function ehEvListExtra_(list){
  var ev = []; try { ev = ehRead_(ehBook_(), 'EVENTS'); } catch(e){ return list; }
  var by = {}; list.forEach(function(x){ by[ehNorm_(x.n)] = x; });
  ev.forEach(function(e){
    if (ehS_(e.sample) || ehS_(e.follow) === 'Không' || ehS_(e.state) === 'Huỷ') return;
    var n1 = ehNorm_(e.name), n2 = ehNorm_(e.offlineName), x = by[n2] || by[n1];
    if (!x){   /* cùng ngày bắt đầu + chung từ ⇒ cùng sự kiện */
      list.forEach(function(y){ if (!x && y.s === ehS_(e.start)){ var w = ehWords_(y.n); if (ehWords_(e.name).some(function(t){ return w.indexOf(t) >= 0; })) x = y; } });
    }
    var u = EH.APP_URL + '#ev-' + ehS_(e.id);
    if (x){ x.eh = ehS_(e.id); x.u = u; if (!x.f && ehS_(e.folderUrl)) x.f = ehS_(e.folderUrl); return; }
    if (!ehS_(e.start)) return;
    list.push({ n: ehS_(e.name), s: ehS_(e.start), e: ehS_(e.end) || ehS_(e.start), ym: ehS_(e.start).slice(0, 7).replace('-', ''), t: ehS_(e.type), src: 'APP',
                eh: ehS_(e.id), u: u, f: ehS_(e.folderUrl), np: 0 });
  });
  list.sort(function(a, b){ return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
  return list;
}
