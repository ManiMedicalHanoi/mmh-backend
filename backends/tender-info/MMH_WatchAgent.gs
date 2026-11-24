/* ════════════════════════════════════════════════════════════════════
   MMH_WatchAgent.gs v1.0 (18/11/2026, người dùng yêu cầu) — MÁY TÍNH TỰ TẢI FILE "CẦN AGENT" RỒI ĐƯA LÊN DRIVE
   File đính kèm muasamcong (QĐ phê duyệt, Báo cáo đánh giá, HSMT, Biên bản mở thầu…) chỉ tải được qua VNeGP Client Agent
   (http://localhost:1234) trên máy tính đã cài Agent ⇒ bot GitHub chỉ ghi tên + fileId vào info.agentFiles.
   Chương trình chạy ngầm trên máy người dùng (Tender-Result/theo-doi/agent/agent_worker.py, khoá bot WT_BOT_KEY) hỏi việc mỗi 2 phút:
     botAgentList {key, worker, agent: 1|0}  ⇒ { items: [{hit, no, inv, url, files: [{name, fileId, tab, type, tries}]}] }
       (file chưa done, thử < WTA.MAX_TRY lần; ghi WT_AGW_SEEN / WT_AGW_NAME / WT_AGW_AGENT để app hiện "Máy tải Agent: đang bật")
     botAgentPut  {key, hit, orig, name, mime, b64}  ⇒ lưu như wUpload (đúng thư mục + tên chuẩn + Sheet tổng hợp, đánh dấu done)
     botAgentPut  {key, hit, orig, err}              ⇒ ghi lỗi (tries + 1, lastErr) — quá WTA.MAX_TRY ⇒ không đưa lại (app vẫn có nút Thêm file)
   Máy tính xoá file tạm ngay sau khi tải lên (không lưu lại trên máy).

   v1.1 (19/11/2026, người dùng: "bấm tải trên app là tải luôn, không mở muasamcong, tải ẩn") — MÁY AGENT TẢI CẢ GÓI:
     wAgentReq {keys, want}  (app, phiên email) ⇒ info.agentReq = {at, by, want} ⇒ máy Agent nhận trong ≤ 1 phút
       (app cùng máy với máy Agent thì gửi thẳng http://127.0.0.1:8767/job, không qua đây; vẫn gọi botPkgStart / Put / Done)
     botAgentList trả thêm pkgs: [{hit, no, inv, url, want}] (agentReq chưa xong, gói không "Đang tải")
     botPkgStart {key, hit}            ⇒ gói "Đang tải" (bot GitHub bỏ qua; quá WT.LEASE_MIN thì bot lấy lại)
     botPkgPut   {key, hit, name, tag, mime, b64} ⇒ wtdUpload_ (tên chuẩn theo loại tài liệu, đúng thư mục, Sheet tổng hợp;
                  trùng tên tài liệu "cần Agent" ⇒ đánh dấu done)
     botPkgDone  {key, hit, n, err}    ⇒ agentReq.done; gói Đã tải / Không có file / Lỗi
   Bot GitHub (wtBotEligible_) nhường gói có agentReq < WTA.HOLD_MIN phút cho máy Agent.
   ════════════════════════════════════════════════════════════════════ */
const WTA = { MAX_TRY: 4, MAX_ITEMS: 25, MAX_PKGS: 10, HOLD_MIN: 10, SEC: { tbmt: 'tbmt', mo: 'mo', kq: 'kq', kh: 'kh' },
  TAG: { TBMT: 'tbmt', HSMT: 'tbmt', KQ: 'kq', MO: 'mo', KH: 'kh' } };

function wtaSeen_(p) {
  const P = PropertiesService.getScriptProperties();
  P.setProperty('WT_AGW_SEEN', wtNow_());
  if (wtS_(p.worker)) P.setProperty('WT_AGW_NAME', wtS_(p.worker).slice(0, 60));
  if (wtS_(p.agent) !== '') P.setProperty('WT_AGW_AGENT', wtTrue_(p.agent) ? '1' : '0');
}
function wtaStatus_() {
  const P = PropertiesService.getScriptProperties();
  return { seen: P.getProperty('WT_AGW_SEEN') || '', name: P.getProperty('WT_AGW_NAME') || '', agent: P.getProperty('WT_AGW_AGENT') || '', last: JSON.parse(P.getProperty('WT_AGW_LAST') || 'null') };
}

function wtaList_(p) {
  wtaSeen_(p);
  // 23/11/2026 (người dùng mở nhiều Chrome / nhiều tài khoản, mỗi trình duyệt cài tiện ích): giữ chỗ TỪNG FILE 15 phút cho máy đã nhận
  // (CacheService, khoá = gói | tên file) ⇒ máy khác không nhận trùng; máy đó tải xong (done) / báo lỗi thì file tự ra khỏi danh sách.
  const C = CacheService.getScriptCache(), who = wtS_(p.worker || p.bot) || 'agent', cand = [];
  wtHits_(wtBook_()).forEach(function (h) {
    if (h.status === WT.ST.WORK) return;   // 24/11/2026: lấy đủ ứng viên rồi mới xếp theo ưu tiên (agPri)
    const I = h.info || {}, fs = (I.agentFiles || []).filter(function (a) { return a && typeof a === 'object' && !a.done && a.fileId && (+a.tries || 0) < WTA.MAX_TRY; });
    if (fs.length) cand.push({ h: h, I: I, fs: fs });
  });
  // 24/11/2026 (MMH_WatchTT57.gs ▸ op=prio): gói có info.agPri (số nhỏ trước) được tải trước, còn lại giữ thứ tự cũ
  cand.forEach(function (c, i) { c.i = i; });
  cand.sort(function (a, b) { const x = a.I.agPri == null ? 99 : +a.I.agPri, y = b.I.agPri == null ? 99 : +b.I.agPri; return x - y || a.i - b.i; });
  if (cand.length > WTA.MAX_ITEMS * 3) cand.length = WTA.MAX_ITEMS * 3;
  const lk = function (h, a) { return 'wtaL:' + wtqHash_(h.key + '|' + a.name); };
  const keys = []; cand.forEach(function (c) { c.fs.forEach(function (a) { keys.push(lk(c.h, a)); }); });
  let held = {}; try { held = keys.length ? C.getAll(keys) : {}; } catch (e) { held = {}; }
  const items = [], put = {};
  let n = 0, skip = 0;
  cand.forEach(function (c) {
    if (n >= WTA.MAX_ITEMS) return;
    const fs = c.fs.filter(function (a) { const o = held[lk(c.h, a)]; if (o && o !== who) { skip++; return false; } return true; });
    if (!fs.length) return;
    fs.forEach(function (a) { put[lk(c.h, a)] = who; });
    items.push({ hit: c.h.key, no: c.h.no, inv: c.h.investor, url: wtS_(c.I.url), files: fs.map(function (a) { return { name: a.name, fileId: a.fileId, tab: a.tab || '', type: a.type || '', tries: +a.tries || 0 }; }) });
    n += fs.length;
  });
  try { if (Object.keys(put).length) C.putAll(put, 900); } catch (e) {}
  return { ok: true, items: items, n: n, held: skip, pkgs: wtaPkgs_() };
}

function wtaPut_(p) {
  wtaSeen_(p);
  const key = wtS_(p.hit), orig = wtS_(p.orig);
  const ss = wtBook_(), h = wtHits_(ss).filter(function (x) { return x.key === key; })[0];
  if (!h) return { ok: false, error: 'Không tìm thấy gói ' + key };
  const a = ((h.info || {}).agentFiles || []).filter(function (x) { return x && x.name === orig; })[0];
  if (!a) return { ok: false, error: 'Gói không có tài liệu "' + orig + '"' };
  if (a.done) return { ok: true, already: true };
  const P = PropertiesService.getScriptProperties();
  if (wtS_(p.err) || !wtS_(p.b64)) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
    try {
      const cur = wtHits_(ss).filter(function (x) { return x.key === key; })[0], info = Object.assign({}, cur.info);
      info.agentFiles = (info.agentFiles || []).map(function (x) { return x && x.name === orig ? Object.assign({}, x, { tries: (+x.tries || 0) + 1, lastErr: wtS_(p.err).slice(0, 200) || 'không có dữ liệu', at: wtNow_() }) : x; });
      wtSheet_(ss, WT.SH_H, WT.HH).getRange(cur.row, 7).setValue(JSON.stringify(info));
    } finally { lock.releaseLock(); }
    P.setProperty('WT_AGW_LAST', JSON.stringify({ at: wtNow_(), no: h.no, name: orig, ok: false, err: wtS_(p.err).slice(0, 160) }));
    wtBotLog_(ss, 'Máy tải Agent · ' + wtS_(p.worker || P.getProperty('WT_AGW_NAME')), key, 'agent', 'lỗi', orig + ': ' + wtS_(p.err).slice(0, 160));
    return { ok: true, recorded: true };
  }
  const docType = wtS_(a.type) || wtS_(orig).replace(/\.[a-z0-9]{2,5}$/i, '');
  const sec = WTA.SEC[wtS_(a.tab)] || '';
  const r = wtdUpload_({ boss: true, pic: 'Máy tải Agent', local: '' }, { key: key, b64: p.b64, name: wtS_(p.name) || orig, docType: docType, sec: sec, orig: orig, mime: wtS_(p.mime) });
  if (r && r.ok) P.setProperty('WT_AGW_LAST', JSON.stringify({ at: wtNow_(), no: h.no, name: r.name, ok: true }));
  return r;
}


/* ── v1.1: máy Agent tải CẢ GÓI ── */
function wtaAge_(s) { return s ? (Date.now() - new Date(String(s).replace(' ', 'T') + '+07:00').getTime()) / 6e4 : 1e9; }
function wtaPending_(h) { const r = (h.info || {}).agentReq; return !!(r && r.at && !r.done); }
function wtaPkgs_() {
  const out = [], seen = {};
  wtHits_(wtBook_()).forEach(function (h) {
    if (out.length >= WTA.MAX_PKGS || !h.no || !wtaPending_(h) || h.status === WT.ST.WORK) return;
    const b = wtBare_(h.no); if (seen[b]) return; seen[b] = 1;
    const I = h.info || {};
    out.push({ hit: h.key, no: h.no, inv: h.investor, url: wtS_(I.url), want: I.agentReq.want || I.want || [] });
  });
  return out;
}

/** app: nhờ máy Agent tải ngay các gói (keys = "k1,k2"); người bấm phải theo dõi gói (hoặc quản lý). */
function wtaReq_(me, p) {
  const keys = wtS_(p.keys).split(',').map(function (k) { return k.trim(); }).filter(String);
  if (!keys.length) return { ok: false, error: 'Chưa chọn gói.' };
  const want = wtWant_(p.want), lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  const done = [];
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH);
    wtHits_(ss).forEach(function (h) {
      if (keys.indexOf(h.key) < 0) return;
      if (!me.boss && !h.watchers.some(function (m) { return wtLocal_(m) === me.local; })) return;
      const info = Object.assign({}, h.info, { agentReq: { at: wtNow_(), by: me.pic, want: want } });
      sh.getRange(h.row, 7).setValue(JSON.stringify(info));
      if (h.status !== WT.ST.WORK) sh.getRange(h.row, 11).setValue(WT.ST.WAIT);
      done.push(h.key);
    });
  } finally { lock.releaseLock(); }
  return { ok: true, keys: done, agw: wtaStatus_() };
}

function wtaHit_(ss, key) { return wtHits_(ss).filter(function (x) { return x.key === key; })[0]; }

function wtaPkgStart_(p) {
  wtaSeen_(p);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), h = wtaHit_(ss, wtS_(p.hit));
    if (!h) return { ok: false, error: 'Không tìm thấy gói ' + wtS_(p.hit) };
    const sib = wtHits_(ss).filter(function (x) { return wtBare_(x.no) === wtBare_(h.no); });
    sib.forEach(function (x) { sh.getRange(x.row, 11, 1, 4).setValues([[WT.ST.WORK, JSON.stringify(x.files || []), x.tries + 1, wtNow_()]]); });
    const I = h.info || {};
    return { ok: true, hit: h.key, no: h.no, inv: h.investor, type: h.type, planNo: I.planNo || '', url: wtS_(I.url), want: (I.agentReq || {}).want || I.want || [], have: (h.files || []).map(function (f) { return f.name; }) };
  } finally { lock.releaseLock(); }
}

/** loại tài liệu chuẩn theo tab + tên file (giống docType của bot.mjs) */
function wtaDocType_(sec, name) {
  const t = wtFold_ ? wtFold_(name) : String(name).toLowerCase();
  const base = wtS_(name).replace(/\.[a-z0-9]{2,5}$/i, '').trim();
  if (/nha.?thau/.test(t) && /\.xlsx?$/i.test(name)) return sec === 'mo' ? 'Nhà thầu tham dự' : 'Danh sách nhà thầu';
  if (/hang.?hoa/.test(t) && /\.xlsx?$/i.test(name)) return 'Danh sách hàng hóa';
  if (/^(tbmt|thong.?bao.?moi.?thau)/.test(t) || /tai.?tbmt/.test(t)) return 'Thông báo mời thầu';
  if (sec === 'kq') {
    if (/quyet dinh|^qd|\bqd\b/.test(t)) return 'Quyết định phê duyệt KQLCNT';
    if (/bao cao|danh gia/.test(t)) return 'Báo cáo đánh giá tổng hợp E-HSDT';
  }
  if (sec === 'tbmt' && /quyet dinh/.test(t)) return 'Quyết định phê duyệt HSMT';
  if (sec === 'kh' && /quyet dinh/.test(t)) return 'Quyết định phê duyệt KHLCNT';
  if (/bien ban mo thau/.test(t)) return 'Biên bản mở thầu';
  return base.slice(0, 90) || 'Tài liệu';
}
function wtFold_(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }

function wtaPkgPut_(p) {
  wtaSeen_(p);
  const ss = wtBook_(), h = wtaHit_(ss, wtS_(p.hit));
  if (!h) return { ok: false, error: 'Không tìm thấy gói ' + wtS_(p.hit) };
  const name = wtS_(p.name), sec = WTA.TAG[wtS_(p.tag).toUpperCase()] || (h.type === 'khmt' ? 'kh' : 'tbmt');
  const fn = wtFold_(name).replace(/\.[a-z0-9]{2,5}$/, '').trim();
  const a = ((h.info || {}).agentFiles || []).filter(function (x) { return x && typeof x === 'object' && wtFold_(x.name).replace(/\.[a-z0-9]{2,5}$/, '').trim() === fn; })[0];
  const docType = a && a.type ? a.type : wtaDocType_(sec, name);
  return wtdUpload_({ boss: true, pic: 'Máy tải Agent', local: '' }, { key: h.key, b64: p.b64, name: name, docType: docType, sec: a && WTA.SEC[a.tab] ? WTA.SEC[a.tab] : sec, orig: a ? a.name : '', mime: wtS_(p.mime) });
}

function wtaPkgDone_(p) {
  wtaSeen_(p);
  const P = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
  let h;
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH); h = wtaHit_(ss, wtS_(p.hit));
    if (!h) return { ok: false, error: 'Không tìm thấy gói ' + wtS_(p.hit) };
    const n = parseInt(p.n, 10) || 0, err = wtS_(p.err).slice(0, 200);
    wtHits_(ss).filter(function (x) { return wtBare_(x.no) === wtBare_(h.no); }).forEach(function (x) {
      const info = Object.assign({}, x.info);
      if (info.agentReq) info.agentReq = Object.assign({}, info.agentReq, { done: wtNow_(), n: n, err: err });
      sh.getRange(x.row, 7).setValue(JSON.stringify(info));
      const st = (x.files || []).length ? WT.ST.DONE : err ? WT.ST.ERR : WT.ST.NOFILE;
      sh.getRange(x.row, 11).setValue(st);
      if (st === WT.ST.DONE) sh.getRange(x.row, 16).setValue(wtNow_());   // cột Xong lúc
    });
    P.setProperty('WT_AGW_LAST', JSON.stringify({ at: wtNow_(), no: h.no, name: n + ' file', ok: !err }));
    wtBotLog_(ss, 'Máy tải Agent · ' + wtS_(p.worker || P.getProperty('WT_AGW_NAME')), h.key, 'pkg', err ? 'lỗi' : 'xong', n + ' file' + (err ? ' · ' + err : ''));
  } finally { lock.releaseLock(); }
  return { ok: true };
}
