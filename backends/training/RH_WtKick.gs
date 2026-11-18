/* ════════════════════════════════════════════════════════════════════
   RH_WtKick.gs — ĐÁNH THỨC BOT TẢI HỒ SƠ THẦU (18/11/2026, HUB v3.47)
   Lịch cron 5 phút của GitHub (workflow "Theo dõi gói thầu — tải hồ sơ", kho mmh-backend) gần như không tự chạy
   (GitHub dồn / bỏ lịch của kho nhỏ) ⇒ hàng đợi tải của app Theo dõi gói thầu đứng.
   Trigger hwWarm (5 phút / lần, chạy ổn định) gọi wtkTick_: hỏi tender-info `wPing` (công khai: số gói Chờ tải / Đang tải)
   ⇒ còn gói chờ và GitHub không có lượt nào đang chạy / chờ ⇒ workflow_dispatch tender-dl.yml. Lượt bot tự gọi lượt kế khi còn gói.
   Token: Script Property WT_GH_TOKEN (fine-grained, kho mmh-backend: Actions Read & write) — không có ⇒ thử DAILY_GH_TOKEN.
   action wtKick (phiên tk, mọi nhân sự: app gọi ngay sau khi đưa gói vào hàng đợi) · wtKickSetup (Admin: ghToken | remove=1) · trạng thái lượt cuối: WTK_LAST.
   ════════════════════════════════════════════════════════════════════ */
var WTK = {
  PING: 'https://script.google.com/macros/s/AKfycbwv3R7EACqtt3pQZfMWRQFilC4E0W7td8Z8xWxQW6P7UckqFjWFJSFxcOWBZknHplhQuQ/exec?action=wPing',
  REPO: 'ManiMedicalHanoi/mmh-backend', WF: 'tender-dl.yml', GAP_S: 280
};
function wtkTok_() { var P = PropertiesService.getScriptProperties(); return P.getProperty('WT_GH_TOKEN') || P.getProperty('DAILY_GH_TOKEN') || ''; }
function wtkGh_(method, path, body, tok) {
  var opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + (tok || wtkTok_()), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + WTK.REPO + path, opt), j = null;
  try { j = JSON.parse(res.getContentText()); } catch (e) {}
  return { code: res.getResponseCode(), json: j };
}
/** force = người dùng vừa bấm tải (bỏ qua giờ làm việc, khoảng cách ngắn hơn) */
function wtkTick_(force) {
  var sc = CacheService.getScriptCache(), P = PropertiesService.getScriptProperties();
  var now = new Date(), h = +Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'H');
  if (!force && (h < 6 || h >= 22)) return { skip: 'ngoài giờ' };
  if (sc.get(force ? 'wtk:f' : 'wtk')) return { skip: 'vừa kiểm' };
  sc.put(force ? 'wtk:f' : 'wtk', '1', force ? 60 : WTK.GAP_S);
  var tok = wtkTok_(), out = { at: Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss') };
  if (!tok) { out.skip = 'chưa có token GitHub'; P.setProperty('WTK_LAST', JSON.stringify(out)); return out; }
  try {
    var pr = UrlFetchApp.fetch(WTK.PING, { muteHttpExceptions: true, followRedirects: true }), pj = null;
    try { pj = JSON.parse(pr.getContentText()); } catch (e) {}
    out.wait = pj ? (+pj.wait || 0) : -1;
    if (!pj || !pj.ok) out.skip = 'không đọc được tender-info';
    else if (!out.wait) out.skip = 'hàng đợi trống';
    else {
      var busy = 0;
      ['in_progress', 'queued'].forEach(function (st) { var g = wtkGh_('get', '/actions/workflows/' + WTK.WF + '/runs?per_page=3&status=' + st); if (g.code === 200 && g.json) busy += +g.json.total_count || 0; else out.err = 'GitHub ' + g.code; });
      if (out.err) out.skip = out.err === 'GitHub 401' || out.err === 'GitHub 403' || out.err === 'GitHub 404' ? 'token không có quyền Actions kho mmh-backend' : out.err;
      else if (busy) out.skip = 'bot đang chạy';
      else { var d = wtkGh_('post', '/actions/workflows/' + WTK.WF + '/dispatches', { ref: 'main' }); out.kick = d.code; if (d.code !== 204) out.skip = 'không gọi được workflow (' + d.code + ')'; }
    }
  } catch (e) { out.skip = 'lỗi: ' + String(e.message || e).slice(0, 160); }
  P.setProperty('WTK_LAST', JSON.stringify(out));
  return out;
}
function apiWtKick(p) {
  var r = rhCheck(p.tk);
  if (r.err) return { ok: false, code: 'AUTH', error: r.err };
  var o = wtkTick_(true);
  return { ok: true, kicked: o.kick === 204, r: o };
}
function apiWtKickSetup(p) {
  var r = rhCheck(p.tk);
  if (r.err) return { ok: false, code: 'AUTH', error: r.err };
  var P = PropertiesService.getScriptProperties(), last = JSON.parse(P.getProperty('WTK_LAST') || 'null');
  if (!r.u.admin) return { ok: true, has: !!wtkTok_(), last: last };
  if (String(p.remove || '') === '1') { P.deleteProperty('WT_GH_TOKEN'); return { ok: true, has: !!wtkTok_(), msg: 'Đã gỡ token.' }; }
  var t = String(p.ghToken || '').trim();
  if (t) {
    var g = wtkGh_('get', '/actions/workflows/' + WTK.WF, null, t);
    if (g.code !== 200) return { ok: false, code: 'GH', error: 'Token không đọc được workflow tải hồ sơ ở kho mmh-backend (mã ' + g.code + '). Cần quyền Actions: Read and write.' };
    P.setProperty('WT_GH_TOKEN', t);
    CacheService.getScriptCache().remove('wtk:f');
    return { ok: true, has: true, msg: 'Đã lưu token — bot tự chạy khi có gói chờ.', r: wtkTick_(true) };
  }
  return { ok: true, has: !!wtkTok_(), own: !!P.getProperty('WT_GH_TOKEN'), last: last };
}
