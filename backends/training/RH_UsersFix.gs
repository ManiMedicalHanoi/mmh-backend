/**
 * ============================================================================
 *  ★ v3.42 (10/11/2026) — RÀ SOÁT + CẤP LẠI QUYỀN ĐĂNG NHẬP (sheet RH_Users)
 * ----------------------------------------------------------------------------
 *  Nhóm Thái (Dao, Miew, Yong, Man, Sui) trước đây vào CRM bằng mật khẩu chung (hết hạn 31/10/2026)
 *  nên chưa có dòng trong RH_Users ⇒ đăng nhập email báo "chưa được cấp quyền".
 *  rhEnsureUsers_(): thêm người còn thiếu / mở khoá người bị khoá theo RH_ENSURE.USERS (không đổi người đã có,
 *  tên PIC đã dùng cho email khác ⇒ bỏ qua, báo trong kết quả). Tự chạy 1 lần khi 1 trong các email này xin mã.
 *
 *  Chẩn đoán: workflow "Kiểm tra" ▸ ping = training?action=rhUsersDiag&key=<8 ký tự cuối Script ID>&full=1
 *    · mặc định: danh sách người dùng (phần trước @, PIC, vai trò, khoá / mở, lần đăng nhập cuối) + người còn thiếu
 *    · &op=ensure: chạy rhEnsureUsers_() ngay
 * ============================================================================
 */

var RH_ENSURE = {
  VER: 'th1',
  /** [phần trước @, PIC (đúng tên trong CRM / Report Hub), level, Dept, Title] */
  USERS: [
    ['manithailand',  'Dao',  'lead', 'Sales & Marketing TH', 'Thailand Surgical Team Leader'],
    ['manithailand4', 'Miew', 'pic',  'Sales & Marketing TH', 'Thailand Surgical Sales PIC'],
    ['manithailand2', 'Yong', 'pic',  'Sales & Marketing TH', 'Thailand Dental - Commercial Lead'],
    ['manithailand3', 'Man',  'pic',  'Sales & Marketing TH', 'Thailand Dental - Training & Education Lead'],
    ['manithailand1', 'Sui',  'pic',  'Sales & Marketing TH', 'Thailand Dental - Marketing Lead']
  ]
};

function rhEnsureLocals_() {
  return RH_ENSURE.USERS.map(function(x){ return x[0]; });
}

/** Thêm / mở khoá người trong RH_ENSURE.USERS. Trả {added:[], unlocked:[], ok:[], skipped:[]} */
function rhEnsureUsers_() {
  var out = {added: [], unlocked: [], ok: [], skipped: []};
  hubWithLock(function(){
    var sh = rhUsersSheet(), last = sh.getLastRow();
    var vals = last < 2 ? [] : sh.getRange(2, 1, last - 1, RH_AUTH.HEADER.length).getValues();
    RH_ENSURE.USERS.forEach(function(e){
      var local = e[0], pic = e[1], hit = -1, picOther = '';
      for (var i = 0; i < vals.length; i++) {
        var l = hubPrefix(vals[i][0]);
        if (l === local) { hit = i; break; }
        if (l && hubKeyV(vals[i][1]) === hubKeyV(pic)) picOther = l;
      }
      if (hit >= 0) {
        var r = vals[hit], row = hit + 2, act = r[4] === '' ? true : hubBool(r[4]);
        if (!hubNorm(r[1])) sh.getRange(row, 2).setValue(pic);
        if (!act) {
          sh.getRange(row, 5).setValue(true);
          sh.getRange(row, 10).setValue('Mở lại quyền (nhóm Thái) · ' + hubFmt(new Date(), 'dd/MM/yyyy HH:mm'));
          out.unlocked.push(pic);
        } else out.ok.push(pic);
        return;
      }
      if (picOther) { out.skipped.push(pic + ' (tên đã dùng cho ' + picOther + ')'); return; }
      sh.appendRow([local + '@' + HUB.SEND_DOMAIN, pic, e[2], false, true, 1, '', 0, '',
        'Cấp quyền nhóm Thái · ' + hubFmt(new Date(), 'dd/MM/yyyy HH:mm'), e[3], e[4], '{}']);
      try { sh.getRange(sh.getLastRow(), 4, 1, 2).insertCheckboxes(); } catch (er) {}
      vals.push([local + '@' + HUB.SEND_DOMAIN, pic]);
      out.added.push(pic);
    });
  });
  try { hubSC().remove('rhUsers'); } catch (e) {}
  delete HUB_MEM.rhUsers;
  try { PropertiesService.getScriptProperties().setProperty('RH_ENSURE_V', RH_ENSURE.VER); } catch (e) {}
  hubLog('INFO', 'rhEnsureUsers', 'Thêm: ' + out.added.join(', ') + ' · Mở khoá: ' + out.unlocked.join(', ') +
    ' · Bỏ qua: ' + out.skipped.join(', '), '');
  return out;
}

/** Gọi từ apiRhAuthStart khi email trong danh sách chưa có / bị khoá — chạy tối đa 1 lần mỗi phiên bản RH_ENSURE.VER */
function rhEnsureOnStart_(local) {
  if (rhEnsureLocals_().indexOf(hubPrefix(local)) < 0) return false;
  var done = '';
  try { done = PropertiesService.getScriptProperties().getProperty('RH_ENSURE_V') || ''; } catch (e) {}
  if (done === RH_ENSURE.VER) return false;
  rhEnsureUsers_();
  return true;
}

function apiRhUsersDiag(p) {
  if (hubNorm(p.key) !== ScriptApp.getScriptId().slice(-8)) return {ok: false, code: 'KEY'};
  var ens = null;
  if (hubNorm(p.op) === 'ensure') ens = rhEnsureUsers_();
  try { hubSC().remove('rhUsers'); } catch (e) {}
  delete HUB_MEM.rhUsers;
  var list = rhUsers(), seenL = {}, seenP = {}, dup = [];
  var users = list.map(function(u){
    if (seenL[u.local]) dup.push('email ' + u.local); seenL[u.local] = 1;
    var k = hubKeyV(u.pic); if (seenP[k]) dup.push('PIC ' + u.pic); seenP[k] = 1;
    return [u.local, u.pic, u.level + (u.admin ? '+admin' : ''), u.active ? 'mở' : 'KHOÁ', u.dept || '',
            u.lastLogin ? String(u.lastLogin).slice(0, 10) : '-', u.logins];
  });
  var expect = RH_AUTH.SEED.map(function(s){ return s[1]; }).concat(RH_ENSURE.USERS.map(function(x){ return x[1]; }));
  var missing = [], locked = [];
  expect.forEach(function(pic){
    var u = list.filter(function(x){ return hubKeyV(x.pic) === hubKeyV(pic); })[0];
    if (!u) missing.push(pic); else if (!u.active) locked.push(pic);
  });
  return {ok: true, ensure: ens, ensureVer: PropertiesService.getScriptProperties().getProperty('RH_ENSURE_V') || '',
    total: list.length, active: list.filter(function(u){ return u.active; }).length,
    missing: missing, locked: locked, duplicate: dup,
    cols: ['local', 'pic', 'level', 'active', 'dept', 'lastLogin', 'logins'], users: users};
}
