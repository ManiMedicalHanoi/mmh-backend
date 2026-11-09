/*************************************************************************************************
 * MMH — MKT_EventHubFast.gs   (v1.6 · 09/11/2026) — app "Sự kiện MKT" tải nhanh (người dùng: mở app đứng ở "Đang tải sự kiện…")
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Nguyên nhân: ehBoot_ chỉ lưu đệm khi dữ liệu < 95 KB (giữ 2 phút) ⇒ dữ liệu thật (hàng trăm việc + nhật ký + kế hoạch) KHÔNG BAO GIỜ
 * được đệm ⇒ mỗi lần mở app đọc lại ~12 tab Sheet + Drive. Nay:
 *  ① ehBigPut_ / ehBigGet_: đệm JSON lớn = chia mảnh (≤ 30.000 ký tự / mảnh — CacheService giới hạn 100 KB / giá trị, chữ Việt 2–3 byte),
 *     khoá chính giữ {v, n}; xoá khoá chính (CacheService…remove('eh_boot') ở mọi lệnh ghi) = huỷ cả bộ.
 *  ② ehBoot_: trúng đệm ⇒ KHÔNG mở file Sheet (danh tính tfWho_ đã đệm 10 phút; danh sách TEAM ▸ Quản lý nằm trong đệm `mgrs`).
 *  ③ ehBootWarm_ trong ehSyncTick_ (10 phút / lần): đệm nguội ⇒ dựng sẵn ⇒ người mở app luôn trúng đệm (TTL 25 phút).
 *  ④ ehBook_ chỉ kiểm / tạo tab 1 lần / 6 giờ / phiên bản (trước: mỗi lệnh gọi ~20 lần getSheetByName + getLastColumn).
 * Không dùng dịch vụ mới ⇒ không phải cấp quyền lại.
 *************************************************************************************************/
var EH_BC = { TTL: 1500, CHUNK: 30000, MAX: 90 };

function ehBigPut_(key, obj, ttl){
  try {
    var js = JSON.stringify(obj), n = Math.max(1, Math.ceil(js.length / EH_BC.CHUNK)); if (n > EH_BC.MAX) return false;
    var v = Utilities.getUuid().replace(/-/g, '').slice(0, 8), all = {};
    for (var i = 0; i < n; i++) all[key + '_' + v + '_' + i] = js.substr(i * EH_BC.CHUNK, EH_BC.CHUNK);
    var c = CacheService.getScriptCache(); c.putAll(all, ttl || EH_BC.TTL); c.put(key, JSON.stringify({ v: v, n: n, at: Date.now() }), ttl || EH_BC.TTL);
    return true;
  } catch(e){ return false; }
}
function ehBigGet_(key){
  try {
    var c = CacheService.getScriptCache(), m = JSON.parse(c.get(key) || 'null'); if (!m || !m.n || !m.v) return null;
    var keys = []; for (var i = 0; i < m.n; i++) keys.push(key + '_' + m.v + '_' + i);
    var got = c.getAll(keys), s = '';
    for (var j = 0; j < keys.length; j++){ if (got[keys[j]] == null) return null; s += got[keys[j]]; }
    return JSON.parse(s);
  } catch(e){ return null; }
}
/* dữ liệu chung của app (giống mọi người) — chỉ dựng khi đệm nguội */
function ehBootBuild_(ss){
  var plan = {}; ehRead_(ss, 'PLAN_JSON').forEach(function(r){ try { plan[ehS_(r.eventId)] = JSON.parse(r.json); } catch(e){} });
  var tpl = ehRead_(ss, 'TEMPLATE').map(ehClean2_);
  return { events: ehRead_(ss, 'EVENTS').map(ehClean2_), tasks: ehRead_(ss, 'TASKS').map(ehClean2_), files: ehRead_(ss, 'FILES').map(ehClean2_),
           log: ehRead_(ss, 'LOG').slice(-400).map(ehClean2_), comments: ehRead_(ss, 'COMMENTS').slice(-800).map(ehClean2_), meetings: ehRead_(ss, 'MEETINGS').map(ehClean2_),
           checkins: ehRead_(ss, 'CHECKINS').slice(-400).map(ehClean2_), notify: ehRead_(ss, 'NOTIFY').slice(-150).map(ehClean2_), plan: plan, people: ehPeople_(),
           roles: EH.ROLES, status: EH.STATUS, groups: tpl.filter(function(t){ return /lớn/i.test(ehS_(t.kind)); }).map(function(t){ return { group: t.group, role: t.role }; }),
           book: ss.getUrl(), filesUrl: ehFilesRoot_().getUrl(), mgrs: ehMgrs_(ss), builtAt: ehNow_() };
}
function ehBootWarm_(){
  if (ehBigGet_('eh_boot')) return 'warm';
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return 'busy';
  try { var ss = ehBook_(); ehBigPut_('eh_boot', ehBootBuild_(ss), EH_BC.TTL); try { ehLinkGet_(ss); } catch(e){} return 'built'; }
  finally { try { lock.releaseLock(); } catch(e){} }
}
/* ehBook_ ▸ kiểm / tạo tab: 1 lần / 6 giờ / phiên bản */
function ehEnsureTabsOnce_(ss){
  var c = CacheService.getScriptCache(), k = 'eh_tabs_' + EH.VER;
  if (c.get(k)) return;
  ehEnsureTabs_(ss); c.put(k, '1', 21600);
}
