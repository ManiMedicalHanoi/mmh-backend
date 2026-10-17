/**
 * ============================================================================
 *  MMH TRAINING HUB — CẦU NỐI ĐỌC FILE TURNOVER CHO MMH CRM  (v3.32, 17/10/2026)
 * ----------------------------------------------------------------------------
 *  Web app Turnover (backend `turnover`) deploy với quyền "chỉ người trong domain" ⇒ trình duyệt đăng nhập
 *  Gmail khác / nhiều tài khoản / Safari chặn cookie không đọc được (CRM báo "Không đọc được file Turnover").
 *  CRM gọi action `rhTurnover` khi đọc trực tiếp lỗi: Training Hub (web app "Anyone") kiểm rhKey + phiên email,
 *  rồi đọc web app Turnover bằng OAuth của chủ script (người trong domain) và trả nguyên JSON.
 *  Chỉ cho lệnh ĐỌC: getTurnoverData · getNppDetail · getMeta · getExplanations. Đệm 3 phút (bản ≤ 95 KB).
 *  Không thêm quyền mới: Training Hub đã dùng UrlFetchApp + ScriptApp.getOAuthToken() (Drive).
 * ============================================================================
 */
var RH_TO_URL = 'https://script.google.com/macros/s/AKfycbz26knlK_GE2mYlszlx947QWSLvfScrHFeB86XkaPWfDhKHi49cnVfCXS_kPUpkX2Fgww/exec';
var RH_TO_OPS = {getTurnoverData: 1, getNppDetail: 1, getMeta: 1, getExplanations: 1};

function apiRhTurnover(p) {
  hubRhKeyOk(p);
  var ck = rhCheck(p.tk);
  if (ck.err) throw new Error(ck.err + ' Vui lòng đăng nhập bằng email công ty.');
  var op = hubNorm(p.op) || 'getTurnoverData';
  if (!RH_TO_OPS[op]) return {ok: false, error: 'rhTurnover: không hỗ trợ ' + op};
  var q = {action: op};
  ['fy', 'seg', 'fresh', 'n'].forEach(function(k){ var v = hubNorm(p[k]); if (v) q[k] = v.substring(0, 120); });
  var qs = Object.keys(q).map(function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); }).join('&');
  var cache = CacheService.getScriptCache(), key = 'rhto:' + qs.substring(0, 200);
  if (q.fresh !== '1') {
    var hit = cache.get(key);
    if (hit) { try { var h = JSON.parse(hit); h.viaHub = true; h.hubCached = true; return h; } catch (e) {} }
  }
  var r = UrlFetchApp.fetch(RH_TO_URL + '?' + qs, {
    headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, muteHttpExceptions: true, followRedirects: true
  });
  var code = r.getResponseCode(), t = r.getContentText();
  if (code !== 200) { hubLog('WARN', 'rhTurnover', op + ' HTTP ' + code, String(t).substring(0, 200)); return {ok: false, error: 'File Turnover trả lỗi ' + code + ' — thử lại sau.'}; }
  var j;
  try { j = JSON.parse(t); } catch (e) {
    hubLog('WARN', 'rhTurnover', op + ' không phải JSON', String(t).substring(0, 200));
    return {ok: false, error: 'File Turnover trả về dữ liệu không đọc được — kiểm tra quyền của Training Hub với web app Turnover.'};
  }
  if (j && j.ok && t.length < 95000) { try { cache.put(key, t, 180); } catch (e) {} }
  if (j && typeof j === 'object') j.viaHub = true;
  return j;
}
