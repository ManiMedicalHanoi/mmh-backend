/*************************************************************************************************
 * MMH — MKT_EventHubGate.gs   (Event Hub v1.8 · 17/11/2026) — TUYỂN SINH · ĐỐI TÁC / NPP · THÔNG BÁO ĐỐI TÁC · 5 CỔNG KIỂM SOÁT
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Người dùng (họp MA 11/2026, mục "Tiến độ cải tiến event"): thông báo đối tác đi từ Thương, cần xem tiến độ tuyển sinh trước mỗi sự kiện
 * để báo kịp thời; luật nhắc đặt theo từng sự kiện, gửi tới các đối tác / NPP cùng tổ chức; quản lý thấy nhanh tiến độ mọi sự kiện và đang tắc ở đâu;
 * NPP + các sếp cũng nắm được tình hình tuyển sinh.
 *
 * ① TUYỂN SINH (tab REG: eventId · readAt · json) — mỗi sự kiện:
 *    nguồn 1 = file đăng ký riêng (EVENTS.regUrl = link Google Sheet câu trả lời của Form; dò cột theo tên: Dấu thời gian · SĐT · Họ tên · NPP / Nguồn · Xác nhận),
 *    nguồn 2 = CUSTOMER LIST của file MKT Offline (số đếm đã có ở MKT_LINK). Lưu SỐ ĐẾM (không lưu họ tên / SĐT): tổng, xác nhận, theo ngày, theo nguồn / NPP,
 *    lịch sử từng ngày (hist) ⇒ đường tích luỹ so với nhịp cần đạt (EHG.PACE: D−21 30% · D−14 50% · D−7 80% · D−3 100% mục tiêu).
 *    ehgRegTick_ trong ehSyncTick_ (≤ 1 lần / 20 phút; file đăng ký chỉ đọc lại khi Drive báo đã sửa).
 * ② ĐỐI TÁC / NPP (tab PARTNERS): tên, loại, người liên hệ, email, cc, chỉ tiêu, từ khoá nguồn (khớp cột NPP của file đăng ký), mã trang theo dõi (token).
 * ③ LUẬT THÔNG BÁO (EVENTS.rules JSON, theo từng sự kiện): prog = cập nhật tuyển sinh ở các mốc D−n · low = nhắc NPP chưa đạt nhịp · final = nhắc lịch D−1
 *    · int = báo nội bộ (Owner + quản lý) khi tuyển sinh chậm. mode confirm = tạo "Chờ gửi" (tab PNOTICE) + báo Owner (Thương) bấm Gửi trên app;
 *    auto = gửi luôn. Email gửi qua mmhMail_ (miền @manimedicalhanoi.com), tên người gửi = Owner, Reply-To + CC = Owner (thông báo đi từ Thương).
 * ④ 5 CỔNG KIỂM SOÁT (ehgGates_, app tính giống hệt) theo Quy trình tổ chức sự kiện 21/10/2026: G1 Chốt kế hoạch · mở tuyển sinh (D−30) · G2 Ấn phẩm & hậu cần (D−7)
 *    · G3 Chốt danh sách · họp NPP (D−3) · G4 Tổ chức & check-in (D+1) · G5 Báo cáo & đóng (D+14).
 *    Cổng quá mốc mà thiếu điều kiện ⇒ "đang tắc" ⇒ email 1 lần (Owner + quản lý) + RH_Notify; thứ Hai: bảng tổng hợp tuyển sinh + cổng cho quản lý.
 * ⑤ TRANG ĐỐI TÁC: action ehPartner&k=<token> (không cần đăng nhập) — CHỈ số đếm của sự kiện + của chính đối tác đó (app: doi-tac.html?k=…).
 * Không thêm dịch vụ / quyền mới (SpreadsheetApp, DriveApp, mmhMail_ đã có).
 *************************************************************************************************/
var EHG = {
  VER: '1.8',
  EVERY: 1200,
  PACE: [[30, 0], [21, .3], [14, .5], [7, .8], [3, 1]],   /* mở tuyển sinh D−1 tháng (quy trình) */
  RULES: [
    { id: 'prog',  on: true, at: 'D-21,D-14,D-7,D-3', to: 'all',      mode: 'confirm' },
    { id: 'low',   on: true, at: 'D-14,D-7',          to: 'below',    mode: 'confirm' },
    { id: 'final', on: true, at: 'D-1',               to: 'all',      mode: 'confirm' },
    { id: 'int',   on: true, at: 'D-21,D-14,D-7,D-3', to: 'internal', mode: 'auto' }
  ],
  RULE_VI: { prog: 'Cập nhật tình hình tuyển sinh', low: 'Nhắc đối tác chưa đạt chỉ tiêu', final: 'Nhắc lịch trước 1 ngày', int: 'Báo nội bộ khi tuyển sinh chậm', manual: 'Thông báo gửi tay' },
  KINDS: ['NPP', 'Trường / Viện', 'Hội / Bệnh viện', 'KOL', 'Khác'],
  APP_P: 'https://manimedicalhanoi.github.io/MMH-Event-MKTOnline/doi-tac.html'
};
EH.COLS.PARTNERS = ['id', 'eventId', 'name', 'kind', 'contact', 'email', 'cc', 'quota', 'srcKey', 'token', 'active', 'note', 'by', 'at', 'sample'];
EH.COLS.PNOTICE  = ['id', 'key', 'eventId', 'ruleId', 'partnerId', 'to', 'cc', 'subject', 'mode', 'status', 'due', 'sentAt', 'by', 'note', 'sample'];
EH.COLS.REG      = ['eventId', 'readAt', 'json'];

/* ── nhịp tuyển sinh: tỉ lệ mục tiêu lẽ ra đã đạt ở ngày `iso` (nội suy giữa các mốc D−n) ── */
function ehgPace_(e, iso){
  var s = ehS_(e.start); if (!s) return 0;
  var n = ehDays_(iso, s), P = EHG.PACE;   /* n = số ngày còn lại tới D */
  if (n >= P[0][0]) return 0; if (n <= P[P.length - 1][0]) return 1;
  for (var i = 1; i < P.length; i++){
    if (n >= P[i][0]){ var a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * (a[0] - n) / (a[0] - b[0]); }
  }
  return 1;
}
function ehgNum_(v){ var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, '')); return isNaN(n) ? 0 : n; }
function ehgRules_(e){
  var r = null; try { r = JSON.parse(ehS_(e.rules) || 'null'); } catch(x){}
  var list = EHG.RULES.map(function(d){ var o = {}; for (var k in d) o[k] = d[k]; var c = r && r.list && r.list.filter(function(x){ return x.id === d.id; })[0]; if (c) ['on', 'at', 'mode'].forEach(function(k){ if (k in c) o[k] = c[k]; }); return o; });
  return { on: !r || r.on !== false, list: list };
}

/* ══════════ ① TUYỂN SINH ══════════ */
var EHG_COL = {
  time: /^(dau thoi gian|timestamp|thoi gian|thoi gian dang ky|ngay dang ky|ngay gio dang ky|ngay)$/,
  phone: /(so dien thoai|^sdt|dien thoai|phone|^tel|mobile|zalo)/,
  name: /(ho ten|ho va ten|full name|^name$|ten bac si|ten khach|^ten$)/,
  src: /(nha phan phoi|\bnpp\b|dai ly|distributor|\bnguon\b|gioi thieu|sales phu trach|nguoi phu trach|kenh dang ky|don vi moi|qua ai|partner|biet den|dang ky ho|nguoi dang ky)/,
  conf: /(xac nhan|check ?in|confirm|^tham du)/
};
/* đọc file đăng ký (Google Sheet) ⇒ số đếm. Chỉ trả SỐ, không trả tên / SĐT. */
function ehgRegRead_(url){
  var m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(String(url || '')); if (!m) return { issue: 'Link chưa đúng — dán link Google Sheet câu trả lời của Form đăng ký.' };
  if (/\/forms\//.test(url)) return { issue: 'Đây là link Form — mở Form ▸ Câu trả lời ▸ Liên kết với Trang tính, rồi dán link file Sheet đó.' };
  var ss; try { ss = SpreadsheetApp.openById(m[1]); } catch(e){ return { issue: 'Chưa mở được file — chia sẻ quyền xem file cho tài khoản hệ thống mmh.product.' }; }
  var best = null;
  ss.getSheets().slice(0, 8).forEach(function(sh){
    var lr = sh.getLastRow(), lc = Math.min(40, sh.getLastColumn()); if (lr < 2 || lc < 2) return;
    var top = sh.getRange(1, 1, Math.min(10, lr), lc).getValues(), hr = -1, hs = 0, col = {};
    top.forEach(function(r, i){
      var c = {}, sc = 0;
      r.forEach(function(h, j){ var k = ehNorm_(h); if (!k || k.length > 60) return; for (var t in EHG_COL) if (!(t in c) && EHG_COL[t].test(k)){ c[t] = j; sc++; } });
      if (sc > hs && ('phone' in c || 'name' in c)){ hs = sc; hr = i; col = c; }
    });
    if (hr < 0) return;
    var n = lr - hr - 1; if (!best || hs > best.hs || (hs === best.hs && n > best.n)) best = { sh: sh, hr: hr, col: col, hs: hs, n: n, lc: lc };
  });
  if (!best) return { issue: 'Không thấy cột Họ tên / Số điện thoại trong file.' };
  var V = best.n > 0 ? best.sh.getRange(best.hr + 2, 1, best.n, best.lc).getValues() : [], C = best.col, seen = {}, out = { reg: 0, conf: 0, days: {}, src: {}, cols: Object.keys(C), sheet: best.sh.getName(), file: ss.getName() };
  V.forEach(function(r){
    var ph = 'phone' in C ? String(r[C.phone]).replace(/\D/g, '') : '', nm = 'name' in C ? ehNorm_(r[C.name]) : '';
    if (!ph && !nm) return;
    var key = ph.length >= 9 ? 'p' + ph.slice(-9) : 'n' + nm; if (seen[key]) return; seen[key] = 1;
    out.reg++;
    if ('time' in C){ var t = r[C.time], d = t instanceof Date ? ehIso_(t) : (/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(t)) ? (function(x){ return x[3] + '-' + ('0' + x[2]).slice(-2) + '-' + ('0' + x[1]).slice(-2); })(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(t))) : ''); if (d) out.days[d] = (out.days[d] || 0) + 1; }
    if ('src' in C){ var s = String(r[C.src] == null ? '' : r[C.src]).replace(/\s+/g, ' ').trim().slice(0, 50) || '(không ghi)'; out.src[s] = (out.src[s] || 0) + 1; }
    if ('conf' in C && /^(co|yes|x|da|ky tay|zoom|xac nhan|tham du|true|1|ok)/.test(ehNorm_(r[C.conf]))) out.conf++;
  });
  if (!('conf' in C)) delete out.conf;
  var keys = Object.keys(out.src); if (keys.length > 40){ var top2 = keys.sort(function(a, b){ return out.src[b] - out.src[a]; }), o2 = {}; top2.slice(0, 39).forEach(function(k){ o2[k] = out.src[k]; }); o2['Khác'] = top2.slice(39).reduce(function(a, k){ return a + out.src[k]; }, 0); out.src = o2; }
  return out;
}
function ehgRegTick_(force){
  var c = CacheService.getScriptCache(); if (!force && c.get('ehg_tick')) return null; c.put('ehg_tick', '1', EHG.EVERY);
  var ss = ehBook_(), today = ehIso_(new Date()), events = ehRead_(ss, 'EVENTS'), link = {}, old = {}, rows = [], rep = { read: 0, kept: 0, issues: 0 };
  try { link = ehLinkGet_(ss); } catch(e){}
  var M = null;
  ehRead_(ss, 'REG').forEach(function(r){ try { old[ehS_(r.eventId)] = JSON.parse(r.json); } catch(e){} });
  events.forEach(function(e){
    var id = ehS_(e.id), o = old[id] || {}, x = { hist: o.hist || {} }, url = ehS_(e.regUrl), cu = (link[id] || {}).cust, en = ehS_(e.end || e.start);
    var live = ehS_(e.start) && ehDays_(today, ehS_(e.start)) <= 150 && (!en || ehDays_(en, today) <= 30) && ehS_(e.state) !== 'Huỷ';
    if (!live && !old[id]) return;
    if (!live){ rows.push({ eventId: id, readAt: o.at || '', json: JSON.stringify(o) }); rep.kept++; return; }
    if (url){
      var mod = ''; try { var fm = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(url); if (fm) mod = String(+DriveApp.getFileById(fm[1]).getLastUpdated()); } catch(er){}
      if (!force && o.url === url && mod && o.mod === mod && o.f){ x.f = o.f; }
      else { var r = ehgRegRead_(url); rep.read++; if (r.issue){ x.issue = r.issue; rep.issues++; if (o.f && o.url === url) x.f = o.f; } else x.f = r; }
      x.url = url; x.mod = mod;
    }
    if (!url && !ehS_(e.sample)){   /* v1.9: chưa dán link riêng ⇒ file Data đăng ký tổng (MKT_EventHubForm.gs), chỉ số đếm */
      if (M === null){ try { M = ehRegMaster_(force); } catch(er){ M = {}; } }
      var mm = ehRegMasterFor_(e, M);
      if (mm){ var sm = {}; if (mm.mani) sm['MANI'] = mm.mani; if (mm.npp) sm['NPP'] = mm.npp; if (mm.unk) sm['(không ghi)'] = mm.unk;
        x.f = { reg: mm.act, conf: mm.done, days: mm.days, src: sm, file: 'Data đăng ký sự kiện (tổng)', sheet: mm.tabs.join(', ').slice(0, 200), master: 1,
                cancel: mm.cancel, pending: mm.pending, other: mm.other, mani: mm.mani, npp: mm.npp }; rep.master = (rep.master || 0) + 1; }
    }
    if (ehS_(e.sample)) x.f = ehgSampleReg_(e, today);
    if (cu) x.c = { reg: +cu.reg || 0, conf: +cu.conf || 0, ok: +cu.ok || 0 };
    var off = (link[id] || {}).off; if (off && +off.tPart) x.tgt = +off.tPart;
    var reg = x.f ? x.f.reg : x.c ? x.c.reg : 0, conf = x.f && x.f.conf != null ? x.f.conf : x.c ? x.c.conf : 0;
    x.reg = Math.max(reg, x.c ? x.c.reg : 0); x.conf = conf; x.via = x.f ? 'file' : x.c ? 'cust' : '';
    if (x.via){ x.hist[today] = x.reg; var hk = Object.keys(x.hist).sort(); if (hk.length > 150) hk.slice(0, hk.length - 150).forEach(function(k){ delete x.hist[k]; }); }
    x.at = ehNow_();
    rows.push({ eventId: id, readAt: x.at, json: JSON.stringify(x).slice(0, 48000) });
  });
  ehRewrite_(ss, 'REG', EH.COLS.REG, rows);
  CacheService.getScriptCache().remove('eh_reg'); CacheService.getScriptCache().remove('eh_boot');
  rep.events = rows.length; PropertiesService.getScriptProperties().setProperty('EHG_LAST', JSON.stringify({ at: ehNow_(), rep: rep }));
  return rep;
}
function ehgRegGet_(ss){
  var hit = ehBigGet_('eh_reg'); if (hit) return hit;
  var out = {}; try { ehRead_(ss || ehBook_(), 'REG').forEach(function(r){ try { var x = JSON.parse(r.json); delete x.mod; out[ehS_(r.eventId)] = x; } catch(e){} }); } catch(e){}
  ehBigPut_('eh_reg', out, 1200); return out;
}
/* số mẫu cho sự kiện mẫu (cột sample = x): đăng ký rải theo ngày, 3 NPP */
function ehgSampleReg_(e, today){
  var tgt = +e.target || 60, st = ehDate_(ehS_(e.start)); if (!st) return null;
  var out = { reg: 0, conf: 0, days: {}, src: {}, cols: ['time', 'phone', 'name', 'src', 'conf'], sheet: 'Câu trả lời biểu mẫu 1', file: 'Đăng ký (mẫu)' };
  var NPP = ['NPP Miền Bắc (mẫu)', 'NPP Miền Trung (mẫu)', 'Đăng ký trực tiếp'], seed = String(e.id).split('').reduce(function(a, ch){ return a + ch.charCodeAt(0); }, 0);
  for (var k = 34; k >= 0; k--){
    var d = new Date(st.getTime() - k * 864e5), iso = ehIso_(d); if (iso > today) break;
    var n = Math.max(0, Math.round(tgt * (k > 21 ? .012 : k > 7 ? .03 : .045) + ((seed + k) % 3) - 1)); if (!n) continue;
    out.days[iso] = n; out.reg += n; for (var j = 0; j < n; j++){ var s = NPP[(seed + k + j) % 3]; out.src[s] = (out.src[s] || 0) + 1; }
  }
  out.conf = ehS_(e.end || e.start) < today ? Math.round(out.reg * .8) : 0;
  return out;
}

/* ── số liệu tuyển sinh của 1 sự kiện (dùng cho email + trang đối tác) ── */
function ehgStats_(e, R, partners, today){
  var x = R || {}, tgt = +e.target || +x.tgt || 0, reg = +x.reg || 0, pace = ehgPace_(e, today);   /* mục tiêu: app → file MKT Offline (Target participant) */
  var src = (x.f && x.f.src) || {}, P = (partners || []).filter(function(p){ return ehS_(p.eventId) === ehS_(e.id) && ehS_(p.active) !== 'Không'; });
  var byP = P.map(function(p){
    var key = ehNorm_(ehS_(p.srcKey) || ehS_(p.name)), n = null;
    if (key && x.f && x.f.cols && x.f.cols.indexOf('src') >= 0){ n = 0; Object.keys(src).forEach(function(s){ var k = ehNorm_(s); if (k && (k.indexOf(key) >= 0 || key.indexOf(k) >= 0)) n += src[s]; }); }
    return { id: ehS_(p.id), name: ehS_(p.name), quota: +p.quota || 0, n: n };
  });
  return { target: tgt, reg: reg, conf: +x.conf || 0, pct: tgt ? Math.round(reg / tgt * 100) : 0, paceN: Math.round(tgt * pace), pacePct: Math.round(pace * 100),
           dleft: ehS_(e.start) ? ehDays_(today, ehS_(e.start)) : null, byP: byP, via: x.via || '', at: x.at || '' };
}

/* ══════════ ④ 5 CỔNG KIỂM SOÁT (app index.html ▸ gates() tính giống hệt) ══════════ */
var EHG_GATES = [   /* theo "Quy trình tổ chức sự kiện" (20261021_MMH_Quy_trinh_to_chuc_su_kien.docx, thư mục Event FY68) */
  { k: 'G1', name: 'Chốt kế hoạch · mở tuyển sinh', phase: 'Lập kế hoạch', off: -30 },
  { k: 'G2', name: 'Ấn phẩm & hậu cần sẵn sàng', phase: 'Chuẩn bị', off: -7 },
  { k: 'G3', name: 'Chốt danh sách · họp NPP', phase: 'Tuyển sinh & chốt', off: -3 },
  { k: 'G4', name: 'Tổ chức & check-in', phase: 'Ngày D', off: 1, end: true },
  { k: 'G5', name: 'Báo cáo & đóng', phase: 'Sau sự kiện', off: 14, end: true }
];
function ehgGates_(e, tasks, R, partners, today){
  var L = tasks.filter(function(t){ return ehS_(t.eventId) === ehS_(e.id) && ehS_(t.parentId) && ehS_(t.status) !== 'Bỏ qua'; });
  if (!L.length) L = tasks.filter(function(t){ return ehS_(t.eventId) === ehS_(e.id) && ehS_(t.status) !== 'Bỏ qua'; });
  var find = function(re){ return L.filter(function(t){ return re.test(ehNorm_(t.title)); }); };
  var doneAll = function(arr){ return arr.length ? arr.every(function(t){ return ehS_(t.status) === 'Xong'; }) : null; };
  var task = function(label, re){ var a = find(re), d = doneAll(a); return d === null ? null : { t: label, ok: d }; };
  var st = ehgStats_(e, R, partners, today), roles = EH.ROLES.filter(function(r){ return ehS_(e[r]); }).length;
  var dS = ehDate_(ehS_(e.start)), dE = ehDate_(ehS_(e.end || e.start));
  var at = function(g){ var b = g.end ? dE : dS; if (!b) return ''; var d = new Date(b.getTime() + g.off * 864e5); return ehIso_(d); };
  var before = function(n, role){ if (!dS) return 0; var lim = ehIso_(new Date(dS.getTime() - n * 864e5)); return L.filter(function(t){ return ehS_(t.due) && ehS_(t.due) <= lim && ehS_(t.status) !== 'Xong' && (!role || ehS_(t.role) === role); }).length; };
  var left = function(n, role, lab){ var k = before(n, role); return { t: k ? k + ' việc ' + lab + ' (hạn ≤ D−' + n + ') chưa xong' : 'Việc ' + lab + ' đến D−' + n + ' đã xong', ok: !k }; };
  var npp = ehS_(e.npp), nP = (partners || []).filter(function(p){ return ehS_(p.eventId) === ehS_(e.id); }).length, web = /webinar|online|zoom/.test(ehNorm_(ehS_(e.type) + ' ' + ehS_(e.format)));
  var C = {
    G1: [{ t: 'Đủ đội sự kiện (Owner + ≥ 2 vai trò)', ok: !!ehS_(e.Owner) && roles >= 3 }, { t: 'Có mục tiêu số khách', ok: st.target > 0 },
         task('File kế hoạch tổng quan', /ke hoach tong quan|file ke hoach/),
         task('Chốt KOL (hợp đồng, lịch di chuyển)', /hop dong kol/), task('Phân công công việc', /phan cong cong viec|chia viec/),
         task('Form đăng ký (khảo sát trước, đồng ý dữ liệu)', /form dang ky/), ehgExpo_(e) ? null : { t: 'Kết nối file đăng ký (ghi rõ nguồn từng khách)', ok: !!(R && R.via === 'file') },
         npp || nP ? { t: 'Khai báo đối tác / NPP nhận thông báo', ok: nP > 0 } : null],
    G2: [left(7, 'Design', 'ấn phẩm & in ấn'), web ? null : left(7, 'Trade', 'hậu cần (địa điểm, đồ MKT, gửi đồ)')],
    G3: [task('Họp với NPP (muộn nhất D−3)', /hop voi npp/), task('Rà soát dữ liệu khách', /ra soat danh sach|ra soat du lieu/),
         st.target && R && R.via === 'file' ? { t: 'Đăng ký ≥ 80% mục tiêu (' + st.reg + '/' + st.target + ')', ok: st.reg >= st.target * .8 } : null, left(3, '', 'chuẩn bị')],
    G4: [task(web ? 'Báo cáo người tham dự Zoom' : 'Check-in có chữ ký', /check in|check-in/), task('Khảo sát sau sự kiện', /khao sat/), { t: 'Có số khách tham dự', ok: (+e.actual || 0) > 0 || st.conf > 0 }],
    G5: [task('Đối chiếu dữ liệu khách', /doi chieu du lieu/), task('Báo cáo sự kiện', /bao cao su kien/), task('Email báo cáo toàn MMH', /email bao cao/),
         L.some(function(t){ return /follow|chuyen doi|lien he lan dau/.test(ehNorm_(t.title)); }) ? { t: 'Số follow-up khách đã nhập', ok: L.some(function(t){ return ehgNum_(t.fuTotal) > 0; }) } : null,
         { t: 'Owner đóng sự kiện', ok: !!ehS_(e.closedAt) }]
  };
  var prev = true;
  return EHG_GATES.map(function(g){
    var crit = C[g.k].filter(Boolean), miss = crit.filter(function(c){ return !c.ok; }), due = at(g), pass = !miss.length && crit.length > 0;
    var s = pass ? 'pass' : (due && due < today ? 'late' : due && ehDays_(today, due) <= 5 ? 'risk' : 'open');
    var o = { k: g.k, name: g.name, phase: g.phase, due: due, state: s, crit: crit, miss: miss.map(function(c){ return c.t; }), cur: prev && !pass };
    if (!pass) prev = false;
    return o;
  });
}
function ehgExpo_(e){ return /trien lam|exhibition|booth/.test(ehNorm_(ehS_(e.type) + ' ' + ehS_(e.name))); }   /* triển lãm: không bắt buộc file đăng ký */
function ehgStuck_(G){ return G.filter(function(g){ return g.state === 'late'; })[0] || null; }

/* ══════════ ②③ LƯU: đối tác · luật · nguồn đăng ký · thông báo ══════════ */
function ehgTok_(){ return Utilities.getUuid().replace(/-/g, '').slice(0, 16); }
function ehSave4_(ss, me, op, d, events, evBy, now){
  if (!/^(partner|rules|reg|notice)\./.test(op)) return null;
  var ensure = function(n){ if (!ss.getSheetByName(n)){ var sh = ss.insertSheet(n); sh.getRange(1, 1, 1, EH.COLS[n].length).setValues([EH.COLS[n]]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF'); sh.setFrozenRows(1); } };
  ['PARTNERS', 'PNOTICE', 'REG'].forEach(ensure);
  var ev = evBy[ehS_(d.eventId || d.id)];
  if (op === 'notice.send' || op === 'notice.skip' || op === 'notice.preview'){
    var N = ehRead_(ss, 'PNOTICE'), n = d.nid ? N.filter(function(x){ return ehS_(x.id) === ehS_(d.nid); })[0] : null;
    if (n) ev = evBy[ehS_(n.eventId)];
  }
  if (!ev) return { ok:false, error:'Không thấy sự kiện.' };
  if (!ehCanEv_(me, ev)) return { ok:false, code:'PERM', error:'Chỉ Owner của sự kiện hoặc quản lý được làm việc này.' };
  var P = ehRead_(ss, 'PARTNERS');
  if (op === 'partner.save'){
    var name = ehS_(d.name); if (!name) return { ok:false, error:'Cần tên đối tác.' };
    var em = ehS_(d.email).replace(/[;\s]+/g, ',').replace(/^,|,$/g, ''), cc = ehS_(d.cc).replace(/[;\s]+/g, ',').replace(/^,|,$/g, '');
    if (em && !em.split(',').every(function(x){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); })) return { ok:false, error:'Email chưa đúng.' };
    var p = d.pid ? P.filter(function(x){ return ehS_(x.id) === ehS_(d.pid); })[0] : null, isNew = !p;
    if (!p) p = { id: 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(), eventId: ev.id, token: ehgTok_(), sample: ehS_(ev.sample) ? 'x' : '' };
    p.name = name; p.kind = ehS_(d.kind) || 'NPP'; p.contact = ehS_(d.contact); p.email = em; p.cc = cc; p.quota = ehgNum_(d.quota) || ''; p.srcKey = ehS_(d.srcKey); p.active = ehS_(d.active) === 'Không' ? 'Không' : 'Có'; p.note = ehS_(d.note); p.by = me.pic; p.at = now;
    if (isNew) ehAppend_(ss, 'PARTNERS', EH.COLS.PARTNERS, [p]); else ehPut_(ss, 'PARTNERS', EH.COLS.PARTNERS, p);
    ehLog_(ss, me, isNew ? 'Thêm đối tác' : 'Sửa đối tác', ev.id, '', name + (p.quota ? ' · chỉ tiêu ' + p.quota : ''));
    return { ok:true, partner: ehClean2_(p) };
  }
  if (op === 'partner.delete'){
    var px = P.filter(function(x){ return ehS_(x.id) === ehS_(d.pid); })[0]; if (!px) return { ok:true };
    ss.getSheetByName('PARTNERS').deleteRow(px._r); ehLog_(ss, me, 'Xoá đối tác', ev.id, '', ehS_(px.name));
    return { ok:true };
  }
  if (op === 'rules.save'){
    var cur = ehgRules_(ev), inp = d.rules || {};
    if ('on' in inp) cur.on = inp.on !== false && inp.on !== 'false';
    (inp.list || []).forEach(function(x){ var r = cur.list.filter(function(y){ return y.id === x.id; })[0]; if (!r) return;
      if ('on' in x) r.on = x.on === true || x.on === 'true'; if (x.mode === 'auto' || x.mode === 'confirm') r.mode = x.mode;
      if ('at' in x){ var at = String(x.at).toUpperCase().replace(/\s+/g, '').split(',').filter(function(s){ return /^D-\d{1,3}$/.test(s) || s === 'WEEKLY'; }).join(','); if (at) r.at = at.replace('WEEKLY', 'weekly'); } });
    ev.rules = JSON.stringify({ on: cur.on, list: cur.list.map(function(r){ return { id: r.id, on: r.on, at: r.at, mode: r.mode }; }) });
    ev.updatedAt = now; ev.updatedBy = me.pic; ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, ev); ehLog_(ss, me, 'Luật thông báo', ev.id, '', ev.rules.slice(0, 400));
    return { ok:true, event: ehClean2_(ev) };
  }
  if (op === 'reg.save'){
    var ch = [];
    if ('regUrl' in d && ehS_(d.regUrl) !== ehS_(ev.regUrl)){ ev.regUrl = ehS_(d.regUrl); ch.push('Nguồn đăng ký'); }
    if ('target' in d && ehgNum_(d.target) !== ehgNum_(ev.target)){ ev.target = ehgNum_(d.target) || ''; ch.push('Mục tiêu ' + ev.target); }
    var chk = ev.regUrl ? ehgRegRead_(ev.regUrl) : null;
    if (ch.length){ ev.updatedAt = now; ev.updatedBy = me.pic; ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, ev); ehLog_(ss, me, 'Tuyển sinh', ev.id, '', ch.join(' · ')); }
    try { CacheService.getScriptCache().remove('ehg_tick'); ehgRegTick_(true); } catch(e){}
    var R = ehgRegGet_(ss)[ev.id] || null;
    return { ok:true, event: ehClean2_(ev), reg: R, check: chk ? { issue: chk.issue || '', reg: chk.reg, cols: chk.cols, file: chk.file, sheet: chk.sheet } : null };
  }
  /* ── thông báo ── */
  var NT = ehRead_(ss, 'PNOTICE'), R2 = ehgRegGet_(ss)[ev.id] || {}, today = ehIso_(new Date());
  if (op === 'notice.preview' || op === 'notice.send'){
    var nn = d.nid ? NT.filter(function(x){ return ehS_(x.id) === ehS_(d.nid); })[0] : null;
    var pid = nn ? ehS_(nn.partnerId) : ehS_(d.pid), rule = nn ? ehS_(nn.ruleId) : (ehS_(d.ruleId) || 'manual');
    var pt = P.filter(function(x){ return ehS_(x.id) === pid; })[0]; if (!pt) return { ok:false, error:'Không thấy đối tác.' };
    var m = ehgMail_(ev, pt, rule, ehgStats_(ev, R2, P, today), d.intro);
    if (op === 'notice.preview') return { ok:true, mail: m };
    if (d.self){   /* Owner tự gửi từ hộp thư của mình ⇒ chỉ ghi nhận */
      if (nn){ nn.status = 'Tự gửi'; nn.sentAt = now; nn.by = me.pic; ehPut_(ss, 'PNOTICE', EH.COLS.PNOTICE, nn); }
      else ehAppend_(ss, 'PNOTICE', EH.COLS.PNOTICE, [{ id: 'PN' + ehgTok_().slice(0, 10), key: '', eventId: ev.id, ruleId: rule, partnerId: pid, to: m.to, cc: m.cc, subject: m.subject, mode: 'self', status: 'Tự gửi', due: today, sentAt: now, by: me.pic, note: '', sample: ehS_(ev.sample) ? 'x' : '' }]);
      ehLog_(ss, me, 'Thông báo đối tác', ev.id, '', 'Tự gửi: ' + ehS_(pt.name) + ' · ' + m.subject);
      return { ok:true, notices: ehRead_(ss, 'PNOTICE').filter(function(x){ return ehS_(x.eventId) === ev.id; }).map(ehClean2_) };
    }
    var res = ehgSend_(ev, pt, m, me);
    if (nn){ nn.status = res.ok ? 'Đã gửi' : 'Lỗi'; nn.sentAt = now; nn.by = me.pic; nn.note = res.err || ''; nn.to = m.to; nn.cc = m.cc; nn.subject = m.subject; ehPut_(ss, 'PNOTICE', EH.COLS.PNOTICE, nn); }
    else ehAppend_(ss, 'PNOTICE', EH.COLS.PNOTICE, [{ id: 'PN' + ehgTok_().slice(0, 10), key: '', eventId: ev.id, ruleId: rule, partnerId: pid, to: m.to, cc: m.cc, subject: m.subject, mode: 'manual', status: res.ok ? 'Đã gửi' : 'Lỗi', due: today, sentAt: now, by: me.pic, note: res.err || '', sample: ehS_(ev.sample) ? 'x' : '' }]);
    ehLog_(ss, me, 'Thông báo đối tác', ev.id, '', (res.ok ? 'Đã gửi: ' : 'Lỗi gửi: ') + ehS_(pt.name) + ' · ' + m.subject);
    if (!res.ok) return { ok:false, error: res.err };
    return { ok:true, sent: res.note || 'Đã gửi', notices: ehRead_(ss, 'PNOTICE').filter(function(x){ return ehS_(x.eventId) === ev.id; }).map(ehClean2_) };
  }
  if (op === 'notice.skip'){
    var ns = NT.filter(function(x){ return ehS_(x.id) === ehS_(d.nid); })[0]; if (!ns) return { ok:true };
    ns.status = 'Bỏ qua'; ns.by = me.pic; ns.sentAt = now; ehPut_(ss, 'PNOTICE', EH.COLS.PNOTICE, ns);
    return { ok:true, notices: ehRead_(ss, 'PNOTICE').filter(function(x){ return ehS_(x.eventId) === ev.id; }).map(ehClean2_) };
  }
  return { ok:false, error:'Không rõ thao tác ' + op };
}

/* ── email gửi đối tác (thư thường, tiếng Việt trang trọng; tên người gửi = Owner) ── */
function ehgMail_(ev, pt, rule, st, intro){
  var U = ehUsers_(), ow = ehS_(ev.Owner) || 'Marketing', owMail = U[ow] ? U[ow].email : '', title = U[ow] && U[ow].title ? U[ow].title : 'Marketing';
  var when = ehgDmy_(ev.start) + (ehS_(ev.end) && ev.end !== ev.start ? ' – ' + ehgDmy_(ev.end) : '');
  var where = [ehS_(ev.venue), ehS_(ev.city)].filter(String).join(', ');
  var link = EHG.APP_P + '?k=' + encodeURIComponent(ehS_(pt.token));
  var mine = st.byP.filter(function(x){ return x.id === ehS_(pt.id); })[0] || {}, rows = [];
  rows.push(['Sự kiện', ehS_(ev.name)], ['Thời gian', when + (st.dleft != null && st.dleft >= 0 ? ' (còn ' + st.dleft + ' ngày)' : '')]);
  if (where) rows.push(['Địa điểm', where]);
  rows.push(['Tổng số đăng ký', st.reg + (st.target ? ' / mục tiêu ' + st.target + ' (' + st.pct + '%)' : '')]);
  if (st.conf) rows.push(['Đã xác nhận tham dự', String(st.conf)]);
  if (mine.n != null) rows.push(['Đăng ký qua ' + ehS_(pt.name), mine.n + (mine.quota ? ' / chỉ tiêu ' + mine.quota + ' (' + Math.round(mine.n / mine.quota * 100) + '%)' : '')]);
  var lead = intro ? String(intro) :
    rule === 'final' ? 'MANI Medical Hanoi xin nhắc lịch sự kiện diễn ra vào ngày mai. Kính đề nghị Quý đối tác thông báo lại tới khách hàng đã đăng ký và hỗ trợ đón tiếp theo kế hoạch đã thống nhất.' :
    rule === 'low' ? 'MANI Medical Hanoi xin cập nhật tình hình đăng ký của sự kiện. Số khách đăng ký qua Quý đối tác hiện chưa đạt nhịp cần thiết so với chỉ tiêu đã thống nhất; kính mong Quý đối tác hỗ trợ đẩy mạnh mời khách trong những ngày tới.' :
    'MANI Medical Hanoi xin gửi Quý đối tác cập nhật tình hình đăng ký tham dự sự kiện đồng tổ chức như sau:';
  var td = 'padding:5px 14px 5px 0;vertical-align:top;border-bottom:1px solid #E3EAF2';
  var html = '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:14px;line-height:1.55;color:#232C36">' +
    '<p>Kính gửi Quý đối tác ' + ehH_(ehS_(pt.name)) + (ehS_(pt.contact) ? ' (' + ehH_(pt.contact) + ')' : '') + ',</p><p>' + ehH_(lead).replace(/\n/g, '<br>') + '</p>' +
    '<table style="border-collapse:collapse;margin:4px 0 14px">' + rows.map(function(r){ return '<tr><td style="' + td + ';color:#4F5B68">' + ehH_(r[0]) + '</td><td style="' + td + ';font-weight:600">' + ehH_(r[1]) + '</td></tr>'; }).join('') + '</table>' +
    '<p>Quý đối tác có thể xem số đăng ký cập nhật hằng ngày tại: <a href="' + link + '">' + link + '</a></p>' +
    '<p>Mọi trao đổi xin vui lòng phản hồi email này.</p><p>Trân trọng,<br><b>' + ehH_(ow) + '</b><br>' + ehH_(title) + ' · MANI Medical Hanoi</p></div>';
  var text = 'Kính gửi Quý đối tác ' + ehS_(pt.name) + ',\n\n' + lead + '\n\n' + rows.map(function(r){ return '- ' + r[0] + ': ' + r[1]; }).join('\n') +
    '\n\nXem số đăng ký cập nhật hằng ngày: ' + link + '\n\nTrân trọng,\n' + ow + '\n' + title + ' · MANI Medical Hanoi';
  var subj = (rule === 'final' ? 'Nhắc lịch' : 'Cập nhật đăng ký') + ' — ' + ehS_(ev.name) + ' (' + when + ')';
  var cc = [ehS_(pt.cc), owMail].filter(String).join(',');
  return { to: ehS_(pt.email), cc: cc, subject: subj, html: html, text: text, from: ow };
}
var EHG_DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
function ehgDmy_(iso){ var d = ehDate_(iso); return d ? EHG_DOW[d.getDay()] + ', ' + Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy') : ''; }
function ehgSend_(ev, pt, m, me){
  if (!m.to) return { ok:false, err:'Đối tác chưa có email.' };
  if (ehS_(ev.sample)) return { ok:true, note:'Dữ liệu mẫu — không gửi email thật' };
  var U = ehUsers_(), owMail = U[ehS_(ev.Owner)] ? U[ehS_(ev.Owner)].email : '';
  try {
    var msg = { to: m.to, subject: m.subject, body: m.text, htmlBody: m.html, name: (ehS_(ev.Owner) || 'Marketing') + ' · MANI Medical Hanoi' };
    if (m.cc) msg.cc = m.cc; if (owMail) msg.replyTo = owMail;
    mmhMail_(msg); return { ok:true };
  } catch(e){ return { ok:false, err: String(e && e.message || e).slice(0, 200) }; }
}

/* ══════════ ③④ HẰNG NGÀY: luật thông báo + cổng tắc (gọi ở trigger ehDaily) ══════════ */
function ehgDaily_(opt){
  opt = opt || {};
  var ss = ehBook_(), today = ehIso_(new Date()), now = ehNow_(), dow = new Date().getDay();
  var pr0 = PropertiesService.getScriptProperties();
  if (!opt.dry && !opt.force){ if (pr0.getProperty('EHG_DAY') === today) return { ok:true, skip:'Đã chạy hôm nay' }; pr0.setProperty('EHG_DAY', today); }
  ['PARTNERS', 'PNOTICE', 'REG'].forEach(function(n){ if (!ss.getSheetByName(n)) ehEnsureTabs_(ss); });
  var events = ehRead_(ss, 'EVENTS'), P = ehRead_(ss, 'PARTNERS'), NT = ehRead_(ss, 'PNOTICE'), T = ehRead_(ss, 'TASKS'), REG = ehgRegGet_(ss);
  T = T.filter(function(t){ return ehTaskFix_(t.title) !== null; }); events = events.filter(function(e){ var st = ehS_(e.start).slice(0, 10); return !st || st >= EH.FY_FROM; });   /* v2.4 */
  var have = {}; NT.forEach(function(n){ if (ehS_(n.key)) have[ehS_(n.key)] = 1; });
  var add = [], sent = 0, owners = {}, internal = [], U = ehUsers_(), mgrs = ehMgrs_(ss), feed = [];
  events.forEach(function(e){
    if (ehS_(e.state) === 'Huỷ' || ehS_(e.follow) === 'Không' || ehS_(e.closedAt) || !ehS_(e.start)) return;
    var dl = ehDays_(today, ehS_(e.start)); if (dl < 0) return;
    var RU = ehgRules_(e); if (!RU.on) return;
    var st = ehgStats_(e, REG[e.id], P, today), pace = ehgPace_(e, today);
    RU.list.forEach(function(r){
      if (!r.on) return;
      var hit = String(r.at).split(',').some(function(a){ return a === 'weekly' ? (dow === 1 && dl <= 35 && dl > 1) : ('D-' + dl) === a; }); if (!hit) return;
      if (r.to === 'internal'){
        if (st.target && st.via === 'file' && st.reg < st.target * pace * .9) internal.push({ e: e, st: st });   /* CUSTOMER LIST thường chỉ đủ sau sự kiện ⇒ không kết luận chậm */
        return;
      }
      st.byP.forEach(function(bp){
        var pt = P.filter(function(x){ return ehS_(x.id) === bp.id; })[0]; if (!pt || !ehS_(pt.email)) return;
        if (r.to === 'below' && !(bp.quota && bp.n != null && bp.n < bp.quota * pace * .9)) return;
        var key = e.id + '|' + r.id + '|' + bp.id + '|' + today; if (have[key]) return; have[key] = 1;
        var m = ehgMail_(e, pt, r.id, st), row = { id: 'PN' + ehgTok_().slice(0, 10), key: key, eventId: e.id, ruleId: r.id, partnerId: bp.id, to: m.to, cc: m.cc, subject: m.subject,
          mode: r.mode, status: 'Chờ gửi', due: today, sentAt: '', by: 'Hệ thống', note: '', sample: ehS_(e.sample) ? 'x' : '' };
        if (r.mode === 'auto' && !opt.dry){ var res = ehgSend_(e, pt, m, null); row.status = res.ok ? 'Đã gửi' : 'Lỗi'; row.sentAt = now; row.note = res.err || res.note || ''; if (res.ok) sent++; }
        else if (ehS_(e.Owner)) (owners[ehS_(e.Owner)] = owners[ehS_(e.Owner)] || []).push({ e: e, pt: pt, row: row });
        add.push(row);
      });
    });
  });
  /* cổng quá mốc chưa đạt ⇒ báo 1 lần / cổng (Owner + quản lý) */
  var pr = PropertiesService.getScriptProperties(), seen = {}, first = !pr.getProperty('EHG_LATE'); try { seen = JSON.parse(pr.getProperty('EHG_LATE') || '{}'); } catch(e){}
  var stuck = [];   /* lần chạy đầu: chỉ ghi nhận các cổng đang tắc (không dồn email), từ hôm sau mới báo cổng MỚI tắc */
  events.forEach(function(e){
    if (ehS_(e.sample) || ehS_(e.state) === 'Huỷ' || ehS_(e.follow) === 'Không' || ehS_(e.closedAt) || !ehS_(e.start) || !ehActive_(e, today)) return;
    var G = ehgGates_(e, T, REG[e.id], P, today), g = ehgStuck_(G); if (!g) return;
    var k = e.id + '|' + g.k; if (seen[k]) return; seen[k] = today; if (!first) stuck.push({ e: e, g: g });
  });
  var out = { ok: true, dry: !!opt.dry, notices: add.length, sent: sent, owners: Object.keys(owners), internal: internal.length, stuck: stuck.map(function(x){ return x.e.name + ' · ' + x.g.k + ' ' + x.g.name + ': ' + x.g.miss.join(', '); }) };
  if (opt.dry) return out;
  if (add.length) ehAppend_(ss, 'PNOTICE', EH.COLS.PNOTICE, add);
  pr.setProperty('EHG_LATE', JSON.stringify(seen));
  var mail = function(pic, subj, paras, url, kind, lines){
    var u = U[pic]; if (u && u.email){ var L = ehLetter_(pic, paras); try { mmhMail_({ to: u.email, subject: subj, body: L.text, htmlBody: L.html, name: 'Sự kiện MKT · MMH' }); } catch(e){} }
    feed.push(['N' + ehgTok_().slice(0, 12), new Date(), pic, 'event', kind, subj.replace(/^\[Sự kiện MKT\]\s*/, '').slice(0, 300), lines.join('\n').slice(0, 900), url, 'Hệ thống', '', '', '']);
  };
  Object.keys(owners).forEach(function(ow){
    var L = owners[ow].filter(function(x){ return !ehS_(x.e.sample); }); if (!L.length) return;
    var evs = {}; L.forEach(function(x){ evs[x.e.id] = x.e; });
    var lines = L.map(function(x){ return '• ' + ehS_(x.pt.name) + ' — ' + EHG.RULE_VI[x.row.ruleId] + ' · ' + ehS_(x.e.name); });
    mail(ow, '[Sự kiện MKT] ' + L.length + ' thông báo đối tác chờ bạn gửi', [{ html: '<p>Đến mốc gửi thông báo cho đối tác / NPP theo luật đã đặt. Mở app, xem trước nội dung rồi bấm <b>Gửi</b> (email đi tên bạn, đối tác trả lời về hộp thư của bạn):</p><ul style="padding-left:20px">' +
      Object.keys(evs).map(function(id){ return '<li><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(id) + '/partners">' + ehH_(ehEvLine_(evs[id])) + '</a> — ' + L.filter(function(x){ return x.e.id === id; }).map(function(x){ return ehH_(x.pt.name); }).join(', ') + '</li>'; }).join('') + '</ul>',
      text: lines.join('\n') }], EH.APP_URL + '#ev-' + encodeURIComponent(L[0].e.id) + '/partners', 'partner', lines);
  });
  if (internal.length || stuck.length){
    var to = {}; mgrs.forEach(function(m){ to[m] = 1; }); internal.concat(stuck).forEach(function(x){ if (ehS_(x.e.Owner)) to[ehS_(x.e.Owner)] = 1; });
    Object.keys(to).forEach(function(pic){
      var mineI = internal.filter(function(x){ return mgrs.indexOf(pic) >= 0 || ehS_(x.e.Owner) === pic; }), mineS = stuck.filter(function(x){ return mgrs.indexOf(pic) >= 0 || ehS_(x.e.Owner) === pic; });
      if (!mineI.length && !mineS.length) return;
      var paras = [], lines = [];
      if (mineI.length){ paras.push({ html: '<p><b>Tuyển sinh chậm so với nhịp cần đạt</b>:</p><ul style="padding-left:20px">' + mineI.map(function(x){ return '<li><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(x.e.id) + '/reg">' + ehH_(ehS_(x.e.name)) + '</a> — ' + x.st.reg + '/' + x.st.target + ' đăng ký (' + x.st.pct + '%), lẽ ra ≈ ' + x.st.paceN + ' · còn ' + x.st.dleft + ' ngày</li>'; }).join('') + '</ul>', text: '' });
        mineI.forEach(function(x){ lines.push('• Tuyển sinh chậm: ' + ehS_(x.e.name) + ' ' + x.st.reg + '/' + x.st.target); }); }
      if (mineS.length){ paras.push({ html: '<p><b>Sự kiện đang tắc ở cổng kiểm soát</b> (đã quá mốc mà chưa đủ điều kiện):</p><ul style="padding-left:20px">' + mineS.map(function(x){ return '<li><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(x.e.id) + '">' + ehH_(ehS_(x.e.name)) + '</a> — ' + x.g.k + ' ' + ehH_(x.g.name) + ' (mốc ' + ehD2_(x.g.due) + '): thiếu ' + ehH_(x.g.miss.join('; ')) + '</li>'; }).join('') + '</ul>', text: '' });
        mineS.forEach(function(x){ lines.push('• Tắc ' + x.g.k + ' ' + x.g.name + ': ' + ehS_(x.e.name)); }); }
      paras.forEach(function(p){ p.text = lines.join('\n'); });
      mail(pic, '[Sự kiện MKT] ' + [mineI.length ? mineI.length + ' sự kiện tuyển sinh chậm' : '', mineS.length ? mineS.length + ' sự kiện đang tắc' : ''].filter(String).join(' · '), [paras[0]].concat(paras.slice(1)), EH.APP_URL + '#board', 'gate', lines);
    });
  }
  if (feed.length) ehFeed_(feed);
  CacheService.getScriptCache().remove('eh_boot');
  return out;
}
/* thứ Hai — bảng tuyển sinh + cổng cho quản lý (nối vào email tổng hợp tuần của ehDaily_) */
function ehgWeekly_(events, T, today){
  var ss = ehBook_(), REG = ehgRegGet_(ss), P = ehRead_(ss, 'PARTNERS'), rows = [];
  events.filter(function(e){ return !ehS_(e.sample) && ehActive_(e, today) && ehS_(e.start) && ehDays_(today, ehS_(e.start)) <= 45; })
    .sort(function(a, b){ return a.start < b.start ? -1 : 1; }).forEach(function(e){
      var st = ehgStats_(e, REG[e.id], P, today), G = ehgGates_(e, T, REG[e.id], P, today), cur = G.filter(function(g){ return g.cur; })[0], sk = ehgStuck_(G);
      rows.push({ e: e, st: st, cur: cur, sk: sk });
    });
  if (!rows.length) return { html: '', text: '' };
  var td = 'padding:6px 10px;border-bottom:1px solid #E3EAF2;text-align:left;vertical-align:top';
  return { html: '<p><b>Tuyển sinh & cổng kiểm soát</b> (sự kiện 45 ngày tới)</p><table style="border-collapse:collapse;font-size:13.5px;margin:0 0 12px"><tr><th style="' + td + '">Sự kiện</th><th style="' + td + '">Đăng ký / mục tiêu</th><th style="' + td + '">Nhịp cần đạt</th><th style="' + td + '">Giai đoạn</th><th style="' + td + '">Đang tắc</th></tr>' +
    rows.map(function(r){ var low = r.st.target && r.st.via === 'file' && r.st.reg < r.st.paceN * .9;
      return '<tr><td style="' + td + '"><a href="' + EH.APP_URL + '#ev-' + encodeURIComponent(r.e.id) + '/reg">' + ehH_(r.e.name) + '</a><br><span style="color:#4F5B68">' + ehD2_(r.e.start) + '</span></td><td style="' + td + (low ? ';color:#B83A2E;font-weight:600' : '') + '">' + r.st.reg + (r.st.target ? ' / ' + r.st.target + ' (' + r.st.pct + '%)' : '') + '</td><td style="' + td + '">' + (r.st.target ? '≈ ' + r.st.paceN : '—') +
        '</td><td style="' + td + '">' + (r.cur ? ehH_(r.cur.k + ' · ' + r.cur.name) : 'Đã qua mọi cổng') + '</td><td style="' + td + (r.sk ? ';color:#B83A2E' : ';color:#888') + '">' + (r.sk ? ehH_(r.sk.miss.join('; ')) : '—') + '</td></tr>'; }).join('') + '</table>',
    text: 'Tuyển sinh & cổng kiểm soát:\n' + rows.map(function(r){ return '- ' + r.e.name + ' · ' + r.st.reg + (r.st.target ? '/' + r.st.target : '') + (r.sk ? ' · tắc ' + r.sk.k + ': ' + r.sk.miss.join('; ') : ''); }).join('\n') };
}

/* ══════════ ⑤ TRANG ĐỐI TÁC (không đăng nhập — chỉ số đếm) ══════════ */
function ehPartner_(p){
  var k = String(p.k || '').trim(); if (!/^[a-f0-9]{16}$/.test(k)) return { ok:false, error:'Link không hợp lệ.' };
  var c = CacheService.getScriptCache(), hit = c.get('ehp_' + k); if (hit) try { return JSON.parse(hit); } catch(e){}
  var ss = ehBook_(), P = ehRead_(ss, 'PARTNERS'), pt = P.filter(function(x){ return ehS_(x.token) === k; })[0];
  if (!pt || ehS_(pt.active) === 'Không') return { ok:false, error:'Link đã hết hiệu lực. Vui lòng liên hệ MANI Medical Hanoi.' };
  var ev = ehRead_(ss, 'EVENTS').filter(function(e){ return ehS_(e.id) === ehS_(pt.eventId); })[0]; if (!ev) return { ok:false, error:'Không thấy sự kiện.' };
  var today = ehIso_(new Date()), R = ehgRegGet_(ss)[ev.id] || {}, st = ehgStats_(ev, R, P, today), mine = st.byP.filter(function(x){ return x.id === ehS_(pt.id); })[0] || {};
  var days = {}; if (R.f && R.f.days && Object.keys(R.f.days).length) days = R.f.days; else { var prev = 0; Object.keys(R.hist || {}).sort().forEach(function(d){ days[d] = Math.max(0, R.hist[d] - prev); prev = R.hist[d]; }); }
  var out = { ok: true, partner: { name: ehS_(pt.name), quota: mine.quota || 0, n: mine.n }, event: { name: ehS_(ev.name), start: ehS_(ev.start), end: ehS_(ev.end || ev.start), city: ehS_(ev.city), venue: ehS_(ev.venue), type: ehS_(ev.type), format: ehS_(ev.format) },
    target: st.target, reg: st.reg, conf: st.conf, pct: st.pct, paceN: st.paceN, dleft: st.dleft, days: days, at: R.at || '', owner: ehS_(ev.Owner), sample: !!ehS_(ev.sample) };
  try { c.put('ehp_' + k, JSON.stringify(out), 600); } catch(e){}
  return out;
}
/* chẩn đoán / chạy tay: action ehGate&key=…&op=status|reg|daily (dry) */
function ehGateApi_(p){
  if (String(p.key || '') !== ehKey_()) return { ok:false, error:'Sai khoá' };
  var op = String(p.op || 'status');
  if (op === 'reg') return ehgRegTick_(true);
  if (op === 'daily') return ehgDaily_({ dry: String(p.run || '') !== '1' });
  var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EHG_LAST') || '{}'); } catch(e){}
  return { ok:true, ver: EHG.VER, last: last };
}
