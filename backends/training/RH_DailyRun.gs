/**
 * RH_DailyRun.gs — nút "Cập nhật ngay" của app MMH Daily (★ v3.41, 09/11/2026).
 *
 * App (GitHub Pages, công khai) KHÔNG giữ token nào. Người bấm phải đăng nhập email công ty (phiên `tk`); máy chủ này giữ token và gọi hộ:
 *   - writer=auto   ⇒ GitHub Actions workflow_dispatch (kho ManiMedicalHanoi/MMH-Daily, daily.yml) — token Script Property DAILY_GH_TOKEN
 *                      (fine-grained, chỉ kho MMH-Daily, quyền Actions: Read and write).
 *   - writer=claude ⇒ Routine Claude Code (API trigger `/fire`) — DAILY_RT_URL + DAILY_RT_TOKEN (tin tức), DAILY_RT_URL_IN + DAILY_RT_TOKEN_IN (nội bộ).
 *                      Chưa cấu hình ⇒ tự chạy bản tự động.
 *
 *   action dailyRun    (tk, kind=daily|weekly, writer=auto|claude, sources, topics, voice=edge|eleven, voices, show) ⇒ {ok, mode, session?}
 *   action dailyStatus (tk) ⇒ {ok, run:{status, conclusion, step, created, updated, url, by}}
 *   action dailySetup  (tk Admin; ghToken / rtUrl / rtToken / rtUrlIn / rtTokenIn / elevenMax; remove=gh|rt|rtIn) ⇒ cờ đã cấu hình (KHÔNG trả token)
 *   Giới hạn: mỗi người 1 lượt / 3 phút (Admin không giới hạn); ElevenLabs tối đa DAILY_ELEVEN_MAX lượt / ngày (mặc định 6).
 */
var DR = {OWNER: 'ManiMedicalHanoi', REPO: 'MMH-Daily', WF: 'daily.yml', GAP: 180,
          RT_BETA: 'experimental-cc-routine-2026-04-01'};

function drProps_() { return PropertiesService.getScriptProperties(); }
function drFlags_() {
  var p = drProps_();
  return {gh: !!p.getProperty('DAILY_GH_TOKEN'), claude: !!(p.getProperty('DAILY_RT_URL') && p.getProperty('DAILY_RT_TOKEN')),
          claudeIn: !!(p.getProperty('DAILY_RT_URL_IN') && p.getProperty('DAILY_RT_TOKEN_IN')),
          elevenMax: +(p.getProperty('DAILY_ELEVEN_MAX') || 6)};
}
function drGh_(method, path, body, token) {
  var opt = {method: method, muteHttpExceptions: true,
             headers: {Authorization: 'Bearer ' + (token || drProps_().getProperty('DAILY_GH_TOKEN')), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}};
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + DR.OWNER + '/' + DR.REPO + path, opt);
  var j = null; try { j = JSON.parse(res.getContentText()); } catch (e) {}
  return {code: res.getResponseCode(), json: j};
}
var drClean_ = function (v, re, max) { return String(v == null ? '' : v).toLowerCase().replace(re, '').slice(0, max || 200); };

function drFire_(url, token, text) {
  var res = UrlFetchApp.fetch(url, {method: 'post', muteHttpExceptions: true, contentType: 'application/json',
    headers: {Authorization: 'Bearer ' + token, 'anthropic-beta': DR.RT_BETA, 'anthropic-version': '2023-06-01'},
    payload: JSON.stringify({text: text})});
  var j = null; try { j = JSON.parse(res.getContentText()); } catch (e) {}
  return {code: res.getResponseCode(), json: j};
}

function apiDailyRun(p) {
  var r = rhCheck(p.tk);
  if (r.err) return {ok: false, code: 'AUTH', error: r.err + ' Vui lòng đăng nhập bằng email công ty.'};
  var u = r.u, admin = !!u.admin, f = drFlags_(), cache = CacheService.getScriptCache();
  var kind = p.kind === 'weekly' ? 'weekly' : 'daily';
  var writer = p.writer === 'claude' ? 'claude' : 'auto';
  var voice = p.voice === 'eleven' ? 'eleven' : 'edge';
  var sel = {sources: drClean_(p.sources, /[^a-z0-9.,\-]/g, 1500), topics: drClean_(p.topics, /[^a-z,]/g, 200),
             voices: drClean_(p.voices, /[^a-z0-9\-]/g, 40), show: drClean_(p.show, /[^a-z]/g, 20)};
  if (!admin) {
    var last = cache.get('drun:' + u.local);
    if (last) return {ok: false, code: 'BUSY', error: 'Bạn vừa bấm cập nhật. Đợi khoảng 3 phút rồi thử lại nhé.'};
  }
  if (voice === 'eleven') {
    var day = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd'), key = 'drel:' + day;
    var n = +(cache.get(key) || 0);
    if (n >= f.elevenMax && !admin) return {ok: false, code: 'ELEVEN_MAX', error: 'Hôm nay đã dùng hết ' + f.elevenMax + ' lượt giọng ElevenLabs. Chọn giọng miễn phí hoặc thử lại ngày mai.'};
    cache.put(key, String(n + 1), 6 * 3600);
  }
  var by = (u.pic || u.local || '').slice(0, 40);
  var out;
  var rtUrl = drProps_().getProperty(kind === 'weekly' ? 'DAILY_RT_URL_IN' : 'DAILY_RT_URL');
  var rtTok = drProps_().getProperty(kind === 'weekly' ? 'DAILY_RT_TOKEN_IN' : 'DAILY_RT_TOKEN');
  if (writer === 'claude' && rtUrl && rtTok) {
    var text = 'MMH Daily — yêu cầu từ app (' + by + '): ' + JSON.stringify({kind: kind, sources: sel.sources, topics: sel.topics, voice: voice, voices: sel.voices, show: sel.show}) +
      '. Làm theo CLAUDE.md của kho MMH-Daily (mục ' + (kind === 'weekly' ? 'B' : 'A') + '); khi chạy workflow / apply truyền DAILY_SOURCES, DAILY_TOPICS, DAILY_VOICE, DAILY_VOICES theo lựa chọn trên.';
    var fr = drFire_(rtUrl, rtTok, text);
    if (fr.code >= 300) return {ok: false, code: 'RT', error: 'Không mở được phiên Claude (mã ' + fr.code + '). Admin kiểm tra lại token Routine.'};
    out = {ok: true, mode: 'claude', session: (fr.json && fr.json.claude_code_session_url) || ''};
  } else {
    if (!f.gh) return {ok: false, code: 'NOSETUP', error: 'Admin chưa kết nối GitHub cho MMH Daily (Nội bộ ▸ Thiết lập).'};
    var inputs = {kind: kind, sources: sel.sources, topics: sel.topics, voice: voice, voices: sel.voices, by: by};
    if (sel.show) inputs.show = sel.show;
    var g = drGh_('post', '/actions/workflows/' + DR.WF + '/dispatches', {ref: 'main', inputs: inputs});
    if (g.code >= 300) {
      var why = (g.json && g.json.message) || ('mã ' + g.code);
      if (g.code === 401) why = 'token GitHub hết hạn / sai';
      if (g.code === 403 || g.code === 404) why = 'token GitHub không có quyền Actions trên kho MMH-Daily';
      return {ok: false, code: 'GH', error: 'Không chạy được: ' + why + '. Admin kết nối lại ở Nội bộ ▸ Thiết lập.'};
    }
    out = {ok: true, mode: 'auto', note: writer === 'claude' ? 'Chưa cấu hình phiên Claude — đang chạy bản tự động.' : ''};
  }
  cache.put('drun:' + u.local, '1', DR.GAP);
  cache.remove('drst');
  try { hubLog('INFO', 'dailyRun', by + ' · ' + kind + ' · ' + out.mode + ' · ' + voice, ''); } catch (e) {}
  return out;
}

function apiDailyStatus(p) {
  var r = rhCheck(p.tk);
  if (r.err) return {ok: false, code: 'AUTH', error: r.err};
  var cache = CacheService.getScriptCache(), c = cache.get('drst');
  if (c) return JSON.parse(c);
  if (!drFlags_().gh) return {ok: true, run: null, setup: drFlags_()};
  var g = drGh_('get', '/actions/workflows/' + DR.WF + '/runs?per_page=1');
  var run = g.json && g.json.workflow_runs && g.json.workflow_runs[0];
  var out = {ok: true, run: null};
  if (run) {
    var step = '';
    if (run.status !== 'completed') {
      var jb = drGh_('get', '/actions/runs/' + run.id + '/jobs');
      var job = jb.json && jb.json.jobs && jb.json.jobs[0];
      var st = job && (job.steps || []).filter(function (s) { return s.status === 'in_progress'; })[0];
      step = st ? st.name : (job ? job.name : '');
    }
    out.run = {id: run.id, status: run.status, conclusion: run.conclusion || '', step: step, event: run.event,
               created: run.created_at, updated: run.updated_at, url: run.html_url};
  }
  cache.put('drst', JSON.stringify(out), 10);
  return out;
}

function apiDailySetup(p) {
  var r = rhCheck(p.tk);
  if (r.err) return {ok: false, code: 'AUTH', error: r.err};
  if (!r.u.admin) return {ok: false, code: 'ADMIN', error: 'Chỉ Admin cấu hình được.'};
  var props = drProps_(), msg = [];
  var rm = String(p.remove || '');
  if (rm === 'gh') { props.deleteProperty('DAILY_GH_TOKEN'); msg.push('Đã gỡ token GitHub.'); }
  if (rm === 'rt') { props.deleteProperty('DAILY_RT_URL'); props.deleteProperty('DAILY_RT_TOKEN'); msg.push('Đã gỡ Routine tin tức.'); }
  if (rm === 'rtIn') { props.deleteProperty('DAILY_RT_URL_IN'); props.deleteProperty('DAILY_RT_TOKEN_IN'); msg.push('Đã gỡ Routine nội bộ.'); }
  var t = String(p.ghToken || '').trim();
  if (t) {
    var g = drGh_('get', '', null, t);
    if (g.code !== 200) return {ok: false, code: 'GH', error: 'Token không đọc được kho MMH-Daily (mã ' + g.code + ').'};
    props.setProperty('DAILY_GH_TOKEN', t); msg.push('Đã lưu token GitHub.');
  }
  var okUrl = function (u) { return /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/[\w-]+\/fire$/.test(u); };
  [['rtUrl', 'rtToken', 'DAILY_RT_URL', 'DAILY_RT_TOKEN', 'tin tức'], ['rtUrlIn', 'rtTokenIn', 'DAILY_RT_URL_IN', 'DAILY_RT_TOKEN_IN', 'nội bộ']].forEach(function (k) {
    var url = String(p[k[0]] || '').trim(), tok = String(p[k[1]] || '').trim();
    if (!url && !tok) return;
    if (!okUrl(url) || !tok) { msg.push('Routine ' + k[4] + ': cần đủ Fire URL (api.anthropic.com/…/fire) và token.'); return; }
    props.setProperty(k[2], url); props.setProperty(k[3], tok); msg.push('Đã lưu Routine ' + k[4] + '.');
  });
  if (p.elevenMax !== undefined && p.elevenMax !== '') props.setProperty('DAILY_ELEVEN_MAX', String(Math.max(0, Math.min(50, +p.elevenMax || 0))));
  CacheService.getScriptCache().remove('drst');
  return {ok: true, setup: drFlags_(), message: msg.join(' ') || 'Không có thay đổi.'};
}
