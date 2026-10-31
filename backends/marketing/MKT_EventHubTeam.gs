/*************************************************************************************************
 * MMH — MKT_EventHubTeam.gs   (v1.3 · 31/10/2026) — người phụ trách mặc định theo vai trò của app "Sự kiện MKT"
 * Người dùng xác nhận 31/10/2026: Duc Anh = ấn phẩm (Design) · Trang = hậu cần (hàng thực hành, đồ MKT, quà NPP, gửi đồ, setup).
 * Theo Report Hub (ROLES ở Back end.gs): Thuong = Marketing Team Leader (Owner mặc định) · Minh Trang = Digital (bài đăng, form, nhóm Zalo).
 * ehTeamFix_ (1 lần, Script Property EH_TEAM_V = EH_TEAM_VER; chạy lại: action ehLink op=team):
 *   · tab TEAM: vai trò còn trống ⇒ điền người mặc định + ghi chú phạm vi việc.
 *   · sự kiện thật (không phải mẫu) còn trống vai trò ⇒ điền; việc của vai trò đó chưa có người, chưa Xong ⇒ giao (KHÔNG gửi email).
 *   · Design / Trade (EH_TEAM_FORCE): thay người cũ ở TEAM; sự kiện / việc đang mang người cũ đó (tự điền) ⇒ chuyển sang người mới.
 *   · Vai trò khác: không đổi người đã được chọn. Dữ liệu mẫu: nạp lại (ehSample op=seed) để dùng đúng người.
 *************************************************************************************************/
var EH_TEAM_DEF = { Owner: 'Thuong', Digital: 'Minh Trang', Design: 'Duc Anh', Trade: 'Trang' };
var EH_TEAM_NOTE = {
  Owner: 'Điều phối sự kiện, duyệt kết quả (mặc định: Trưởng nhóm Marketing)',
  Digital: 'Truyền thông online: bài đăng, form đăng ký, nhóm Zalo, check-in / CUSTOMER LIST',
  Design: 'Ấn phẩm: key visual, backdrop, standee, flyer, thẻ đeo, biểu mẫu',
  Trade: 'Hậu cần: địa điểm / gian hàng, hàng thực hành, đồ MKT, quà NPP, gửi đồ, setup',
  Sales: 'Sales / NPP phụ trách khách của sự kiện (chọn theo từng sự kiện)'
};
var EH_TEAM_VER = '2';
var EH_TEAM_FORCE = { Design: 1, Trade: 1 };   /* người dùng chỉ định rõ ⇒ thay cả người cũ (người cũ tự điền ⇒ việc chưa xong chuyển theo) */

function ehTeamDef_(){ var U = ehUsers_(), o = {}; for (var r in EH_TEAM_DEF) if (U[EH_TEAM_DEF[r]]) o[r] = EH_TEAM_DEF[r]; return o; }

function ehTeamFix_(force){
  var pr = PropertiesService.getScriptProperties();
  if (!force && pr.getProperty('EH_TEAM_V') === EH_TEAM_VER) return null;
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { ok: false, busy: true, error: 'Hệ thống đang bận, thử lại sau.' };
  try {
    var ss = ehBook_(), def = ehTeamDef_(), rep = { ok: true, def: def, team: [], events: 0, tasks: 0, missing: [] };
    for (var r0 in EH_TEAM_DEF) if (!def[r0]) rep.missing.push(EH_TEAM_DEF[r0] + ' (' + r0 + ') không có trong RH_Users');
    var prev = {};
    /* ① tab TEAM */
    ehRead_(ss, 'TEAM').forEach(function(t){
      var role = ehS_(t.role), ch = false;
      var old = ehS_(t.people).split(',')[0].trim();
      if (def[role] && (!old || (EH_TEAM_FORCE[role] && old !== def[role]))){ if (old) prev[role] = old; t.people = def[role]; ch = true; }
      if (EH_TEAM_NOTE[role] && !ehS_(t.note)){ t.note = EH_TEAM_NOTE[role]; ch = true; }
      if (ch){ ehPut_(ss, 'TEAM', EH.COLS.TEAM, t); rep.team.push(role + ' = ' + ehS_(t.people)); }
    });
    ehTeamDefault_.m = null;
    var cur = {}; ehRead_(ss, 'TEAM').forEach(function(t){ var p = ehS_(t.people).split(',')[0].trim(); if (p) cur[ehS_(t.role)] = p; });
    rep.current = cur; rep.replaced = prev;
    /* ② sự kiện thật còn trống vai trò + việc chưa giao */
    var now = ehNow_(), evBy = {};
    ehRead_(ss, 'EVENTS').forEach(function(e){
      if (ehS_(e.sample)) return;
      var web = /webinar/i.test(ehS_(e.type)), ch = false;
      ['Owner', 'Digital', 'Design', 'Trade'].forEach(function(r){
        if (r === 'Trade' && web) return;
        if (cur[r] && (!ehS_(e[r]) || (prev[r] && ehS_(e[r]) === prev[r]))){ e[r] = cur[r]; ch = true; }
      });
      if (ch){ e.updatedAt = now; e.updatedBy = 'Hệ thống'; ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, e); rep.events++; }
      evBy[ehS_(e.id)] = e;
    });
    ehRead_(ss, 'TASKS').forEach(function(t){
      var e = evBy[ehS_(t.eventId)], role = ehS_(t.role); if (!e || /^(Xong|Bỏ qua)$/.test(ehS_(t.status))) return;
      if (ehS_(t.pic) && !(prev[role] && ehS_(t.pic) === prev[role])) return;
      var p = ehS_(e[role]); if (!p || p === ehS_(t.pic)) return;
      t.pic = p; t.updatedAt = now; t.updatedBy = 'Hệ thống'; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); rep.tasks++;
    });
    if (rep.events || rep.tasks || rep.team.length) ehLog_(ss, { pic: 'Hệ thống' }, 'Giao theo vai trò', '', '', 'Người mặc định: ' + JSON.stringify(cur) + ' · ' + rep.events + ' sự kiện · ' + rep.tasks + ' việc (không gửi email)');
    pr.setProperty('EH_TEAM_V', EH_TEAM_VER);
    CacheService.getScriptCache().remove('eh_boot');
    rep.message = 'Đội mặc định — ' + JSON.stringify(cur) + ' · điền ' + rep.events + ' sự kiện · giao ' + rep.tasks + ' việc chưa có người' + (rep.missing.length ? ' · ' + rep.missing.join('; ') : '');
    return rep;
  } catch(err){ return { ok: false, error: String(err && err.message || err) }; }
  finally { try { lock.releaseLock(); } catch(e){} }
}
