/* ════════════════════════════════════════════════════════════════════
   MMH_Watch.gs v1.0 (17/11/2026) — THEO DÕI GÓI THẦU THEO CHỦ ĐẦU TƯ + HÀNG ĐỢI TẢI HỒ SƠ
   Người dùng: tự nhập trên app (Tender-Result/theo-doi/) chủ đầu tư cần theo dõi + loại tin (Kế hoạch LCNT ·
   Thông báo mời thầu · Kết quả LCNT) + từ khoá (tuỳ chọn). Mỗi lượt quét (trigger wtTick 30 phút / lần) đọc 3 tab
   do luồng email hằng ngày ghi (Kết quả trúng thầu · Thông báo mời thầu · Kế hoạch lựa chọn nhà thầu) ⇒ gói mới của
   chủ đầu tư đang theo dõi ⇒ sheet "THEO DÕI · GÓI TÌM THẤY" + thông báo (RH_Notify ⇒ nút "Nhắc tôi" của Report Hub / CRM,
   email nếu bật) + hàng đợi tải hồ sơ cho BOT chạy trên máy ở Việt Nam (muasamcong chặn máy chủ nước ngoài):
   bot lấy việc (botNext) ⇒ tải TBMT / HSMT / Excel kết quả ⇒ gửi file (botFile, lưu Drive theo chủ đầu tư) ⇒ báo xong (botDone).

   App (phiên email công ty do Training Hub ký, tham số tk):
     wGoods {hang, win, dm, place, mode} / {op:'facets'} (lọc hàng hóa trúng thầu ở file tổng, MMH_WatchGoods.gs) ·
     wAcct / wName (tên chung CĐT ⇄ CRM ⇄ danh mục cơ sở y tế, MMH_WatchNames.gs) ·
     wQuick {nos} (Tải ngay: số TBMT / KHLCNT bất kỳ ⇒ hàng đợi, không cần theo dõi) · wBoot · wInvestors · wSave {w: JSON} · wDel {id} · wHit {key, op: dl|skip} · wScan · wBotKey (Admin)
   Bot (khoá WT_BOT_KEY, Admin lấy trong app ▸ Cài đặt bot):
     botAgentList / botAgentPut (máy tính có Agent tự tải file đính kèm, MMH_WatchAgent.gs) ·
     botPeek {key} (đếm, không giữ chỗ) · botNext {key, n} · botFile {key, hit, name, mime, b64} · botDone {key, hit, status: done|nofile|error, note, info}
   Lần đầu theo dõi 1 chủ đầu tư: hiện gói trong WT.BASE_DAYS ngày gần nhất (không báo), tự tải gói trong WT.DL_BASE_DAYS ngày.
   ════════════════════════════════════════════════════════════════════ */
const WT = {
  VER: '1.9',
  MASTER_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',   // Training Master (RH_Users, RH_Secret, RH_Notify)
  APP_URL: 'https://manimedicalhanoi.github.io/Tender-Result/theo-doi/',
  SH_W: 'THEO DÕI · DANH SÁCH',
  SH_H: 'THEO DÕI · GÓI TÌM THẤY',
  SH_L: 'THEO DÕI · NHẬT KÝ BOT',
  HW: ['ID', 'Email', 'Người theo dõi', 'Chủ đầu tư', 'Khoá CĐT', 'Loại tin', 'Từ khoá', 'Tự tải hồ sơ', 'Báo email', 'Đang theo dõi', 'Tạo lúc', 'Sửa lúc', 'Quét lần đầu'],
  HH: ['Khoá', 'Loại', 'Số', 'Chủ đầu tư', 'Khoá CĐT', 'Tên gói', 'Thông tin (JSON)', 'Ngày tin', 'Tìm thấy lúc', 'Người theo dõi', 'Trạng thái', 'File (JSON)', 'Số lần thử', 'Lần thử cuối', 'Ghi chú', 'Xong lúc', 'Dòng nguồn'],
  HL: ['Lúc', 'Bot', 'Khoá', 'Việc', 'Kết quả', 'Ghi chú'],
  TYPES: { khmt: 'Kế hoạch LCNT', tbmt: 'Thông báo mời thầu', kqdt: 'Kết quả LCNT' },
  ST: { WAIT: 'Chờ tải', WORK: 'Đang tải', DONE: 'Đã tải', NOFILE: 'Không có file', ERR: 'Lỗi', OFF: 'Không tải' },
  BASE_DAYS: 120, DL_BASE_DAYS: 30, LEASE_MIN: 30, MAX_TRY: 5, WHO_TTL: 1800,
  ROOT_NAME: 'Theo dõi gói thầu · Hồ sơ tải về',
  MAX_FILE: 35 * 1024 * 1024
};
const WT_NOTIFY_HDR = ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt'];

/* ══════════ ĐIỀU HƯỚNG (gọi đầu doGet / doPost của Webapp.gs) ══════════ */
function wtRoute_(e, isPost) {
  let p = (e && e.parameter) ? Object.assign({}, e.parameter) : {};
  if (isPost && !p.action && e && e.postData && e.postData.contents) {
    try { const j = JSON.parse(e.postData.contents); if (j && typeof j === 'object') p = Object.assign(p, j); } catch (x) { return null; }
  }
  const a = String(p.action || '');
  if (!/^(w[A-Z]\w*|bot[A-Z]\w*)$/.test(a)) return null;
  let out;
  try { out = wtDo_(a, p); } catch (x) { out = { ok: false, error: String((x && x.message) || x) }; }
  const cb = String(p.callback || '');
  if (cb && /^[\w.$]+$/.test(cb)) return ContentService.createTextOutput(cb + '(' + JSON.stringify(out) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function wtDo_(a, p) {
  if (a === 'wPing') {   // chẩn đoán công khai: lần quét cuối + trigger 30 phút có thật không (không trả dữ liệu)
    const P = PropertiesService.getScriptProperties(); let trig = -1;
    try { trig = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'wtTick'; }).length; } catch (e) {}
    // số gói Chờ tải / Đang tải (Training Hub hwWarm đọc ⇒ đánh thức bot khi còn gói; đệm 60 giây)
    let q = null; const c = CacheService.getScriptCache();
    try { q = JSON.parse(c.get('wt_q') || 'null'); } catch (e) {}
    if (!q) { q = { wait: 0, work: 0, agWait: 0 }; try { wtHits_(wtBook_()).forEach(function (h) { if (h.status === WT.ST.WAIT) { if ((h.info || {}).ag) q.agWait++; else q.wait++; } else if (h.status === WT.ST.WORK) q.work++; }); c.put('wt_q', JSON.stringify(q), 60); } catch (e) { q.err = String(e.message || e); } }
    return { ok: true, app: 'tender-watch', v: WT.VER, lastScan: P.getProperty('WT_LAST_SCAN') || '', trig: trig, invV: P.getProperty('WT_INV_V') || '', recV: P.getProperty('WT_REC_V') || '', allV: P.getProperty('WT_ALL_V') || '', wait: q.wait, work: q.work, agWait: q.agWait || 0, botSeen: P.getProperty('WT_BOT_SEEN') || '' };
  }
  if (/^bot/.test(a)) {
    if (!wtBotOk_(p.key)) {
      // v1.9 — tiện ích Chrome / Edge "MMH Tải hồ sơ thầu" dùng PHIÊN EMAIL của người cài (không cần khoá bot), chỉ các lệnh tải (MMH_WatchExt.gs)
      if (!wtS_(p.tk) || WTX.ACTIONS.indexOf(a) < 0) return { ok: false, code: 'KEY', error: 'Khoá bot không đúng.' };
      const ext = wtWho_(p);
      if (ext.err) return { ok: false, code: 'AUTH', error: ext.err };
      p.bot = p.worker = wtxName_(ext, p);
      p._ext = ext;
    }
    if (a === 'botHello') return wtxHello_(p);
    if (a === 'botSaveTo') { if (p._ext) return { ok: false, code: 'KEY', error: 'Cần khoá bot.' }; return wtsSaveTo_(p); }   // MMH_WatchSave.gs
    if (a === 'botGrabInv' || a === 'botGoodsScan' || a === 'botGoodsWrite') {   // MMH_WatchBulk.gs — chỉ khoá bot (không cho tiện ích dùng phiên email)
      if (p._ext) return { ok: false, code: 'KEY', error: 'Cần khoá bot.' };
      return a === 'botGrabInv' ? wtbGrabInv_(p) : a === 'botGoodsScan' ? wtbGoodsScan_(p) : wtbGoodsWrite_(p);
    }
    if (a === 'botPeek') { wtBotSeen_(p.bot); return { ok: true, n: wtBotEligible_(wtHits_(wtBook_()), !p._ext).length }; }
    if (a === 'botNext') return wtBotNext_(p);
    if (a === 'botFile') return wtBotFile_(p);
    if (a === 'botDone') return wtBotDone_(p);
    if (a === 'botRequeue') return wtdRequeue_(p);
    if (a === 'botNames') {   // đối chiếu tên (chỉ đọc, khoá bot): chủ đầu tư Báo Đấu Thầu + chủ đầu tư trong file tổng hàng hóa + người theo dõi
      const inv = wtdInvestors_({}), d = wtgData_(), g = {};
      d.rows.forEach(function (r) { const k = r[2] + '|' + r[1]; g[k] = (g[k] || 0) + 1; });
      return { ok: true, inv: inv.list || [], goods: Object.keys(g).map(function (k) { const x = k.split('|'); return [x[0], x[1], g[k]]; }),
        watches: wtWatches_(wtBook_()).map(function (w) { return w.investor; }), dec: wnDecisions_() };
    }
    if (a === 'botNameSync') return wnSync_(p);   // lượt đối chiếu tên (MMH_WatchNames.gs)
    if (a === 'botMerge') return Object.assign({ ok: true }, wtmMerge_({ force: wtTrue_(p.force) }));
    if (a === 'botPing') { wtBotSeen_(p.bot); return { ok: true, v: WT.VER }; }
    if (a === 'botAgentList') return wtaList_(p);
    if (a === 'botAgentPut') return wtaPut_(p);
    if (a === 'botPkgStart') return wtaPkgStart_(p);
    if (a === 'botPkgPut') return wtaPkgPut_(p);
    if (a === 'botPkgDone') return wtaPkgDone_(p);
    return { ok: false, error: 'Không có lệnh ' + a };
  }
  const me = wtWho_(p);
  if (me.err) return { ok: false, code: 'AUTH', error: me.err };
  wtEnsureTrig_();
  if (a === 'wBoot') return wtBoot_(me, p);
  if (a === 'wInvestors') return wtdInvestors_(p);
  if (a === 'wSave') return wtSave_(me, p);
  if (a === 'wDel') return wtDel_(me, p);
  if (a === 'wHit') return wtHitOp_(me, p);
  if (a === 'wScan') { const r = wtScan_({}); return { ok: true, scan: r }; }
  if (a === 'wBotKey') return wtBotKey_(me, p);
  if (a === 'wQuick') return wtQuick_(me, p);
  if (a === 'wAgentReq') return wtaReq_(me, p);
  if (a === 'wDocs') return wtdDocs_(me, p);
  if (a === 'wPkgs') return wtdPkgs_(me, p);
  if (a === 'wRecent') return wtdRecent_(me, p);
  if (a === 'wAll') return wtdAll_(me, p);
  if (a === 'wMerge') { if (!me.boss) return { ok: false, error: 'Chỉ quản lý chạy gộp tay được.' }; return Object.assign({ ok: true }, wtmMerge_({ force: wtTrue_(p.force) })); }
  if (a === 'wUpload') return wtdUpload_(me, p);
  if (a === 'wGrab') return wtdGrab_(me, p);
  if (a === 'wGoods') return wtgGoods_(me, p);
  if (a === 'wAcct') return wnAcct_(me, p);
  if (a === 'wName') return wnName_(me, p);
  return { ok: false, error: 'Không có lệnh ' + a };
}

/* ══════════ ĐĂNG NHẬP (phiên Training Hub, giống dwWho_ của du-tru-npp) ══════════ */
function wtS_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function wtLocal_(e) { return wtS_(e).toLowerCase().split('@')[0]; }
function wtTrue_(v) { return v === true || /^(true|1|x|yes|có)$/i.test(wtS_(v)); }
function wtSame_(a, b) { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

function wtWho_(p) {
  const NEED = 'App Theo dõi gói thầu chỉ dành cho nhân sự MMH — đăng nhập bằng email công ty.';
  const tk = wtS_(p.tk), dot = tk.indexOf('.');
  if (dot < 10) return { err: NEED };
  const data = tk.substring(0, dot), sig = tk.substring(dot + 1);
  let t;
  try { t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); } catch (e) { return { err: 'Phiên đăng nhập không hợp lệ.' }; }
  if (!t || !t.x || Date.now() > t.x) return { err: 'Phiên đăng nhập đã hết hạn — đăng nhập lại.' };
  if (t.e && String(t.e).indexOf('@') >= 0 && !/@(manimedicalhanoi\.com|mani\.inc)$/i.test(String(t.e))) return { err: NEED };
  const c = CacheService.getScriptCache();
  const key = 'wtw_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, tk)).slice(0, 40);
  try { const hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) {}
  let book;
  try { book = SpreadsheetApp.openById(WT.MASTER_ID); } catch (e) { return { err: 'Máy chủ chưa đọc được Training Master để kiểm phiên đăng nhập.' }; }
  const sec = book.getSheetByName('RH_Secret'), s = sec ? wtS_(sec.getRange(2, 1).getValue()) : '';
  const want = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, s)).replace(/=+$/, '');
  if (s.length < 32 || !wtSame_(sig, want)) return { err: 'Phiên đăng nhập không hợp lệ.' };
  const us = book.getSheetByName('RH_Users');
  const V = us ? us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 12).getValues() : [];
  let u = null;
  V.forEach(function (r) { if (wtLocal_(r[0]) && wtLocal_(r[0]) === wtLocal_(t.e)) u = r; });
  if (!u) return { err: 'Tài khoản không có trong danh sách người dùng (RH_Users).' };
  if (!(u[4] === '' || wtTrue_(u[4]))) return { err: 'Tài khoản đã bị khoá.' };
  if ((t.s || 1) !== Math.max(1, parseInt(u[5], 10) || 1)) return { err: 'Phiên đăng nhập đã bị đăng xuất từ xa.' };
  const raw = wtS_(u[0]);
  const me = {
    local: wtLocal_(t.e), mail: raw.indexOf('@') > 0 ? raw.toLowerCase() : wtLocal_(t.e) + '@manimedicalhanoi.com',
    pic: wtS_(u[1]), level: wtS_(u[2]).toLowerCase(), admin: wtTrue_(u[3])
  };
  me.boss = me.admin || me.level === 'director' || me.level === 'hod';
  try { c.put(key, JSON.stringify(me), WT.WHO_TTL); } catch (e) {}
  return me;
}

/* ══════════ SHEET ══════════ */
function wtBook_() { return SpreadsheetApp.openById(CFG.TENDER_SHEET_ID); }
function wtSheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, ss.getSheets().length);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#CFE2F3');
    sh.setFrozenRows(1);
  }
  return sh;
}
function wtRows_(sh, n) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, n).getValues();
}
function wtNorm_(s) {
  return wtS_(s).replace(/^\s*(chủ\s*đầu\s*tư|bên\s*mời\s*thầu|cđt|bmt)\s*[:：\-–—]\s*/i, '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}
function wtNow_() { return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'); }
function wtJson_(s, d) { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } }

function wtWatches_(ss) {
  const sh = wtSheet_(ss, WT.SH_W, WT.HW);
  return wtRows_(sh, WT.HW.length).map(function (r, i) {
    return {
      row: i + 2, id: wtS_(r[0]), mail: wtS_(r[1]).toLowerCase(), pic: wtS_(r[2]), investor: wtS_(r[3]), invKey: wtS_(r[4]),
      types: wtS_(r[5]).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return WT.TYPES[x]; }),
      keywords: wtS_(r[6]).split(/[;\n]/).map(function (x) { return x.trim(); }).filter(String),
      dl: wtTrue_(r[7]), email: wtTrue_(r[8]), active: wtTrue_(r[9]), at: wtS_(r[10]), upd: wtS_(r[11]), scanned: wtS_(r[12])
    };
  }).filter(function (w) { return w.id; });
}

/* ══════════ ĐỌC 3 TAB DỮ LIỆU THẦU ══════════ */
const WT_COLS = {
  kqdt: { anchor: ['BÊN MỜI THẦU', 'TÊN GÓI THẦU'], inv: ['BÊN MỜI THẦU'], name: ['TÊN GÓI THẦU'], no: ['SỐ THÔNG BÁO'], proj: ['TÊN DỰ ÁN'],
    price: ['GIÁ GÓI THẦU'], win: ['GIÁ TRÚNG THẦU'], winner: ['NHÀ THẦU TRÚNG THẦU', 'NHÀ THẦU TRÚNG'], form: ['HÌNH THỨC LỰA CHỌN'],
    date: ['NGÀY PHÊ DUYỆT'], prov: ['TỈNH THÀNH'], upd: ['THỜI GIAN CẬP NHẤT', 'THỜI GIAN CẬP NHẬT'], month: ['THÁNG'] },
  tbmt: { anchor: ['BÊN MỜI THẦU', 'GÓI THẦU'], inv: ['BÊN MỜI THẦU'], name: ['GÓI THẦU'], no: ['SỐ THÔNG BÁO', 'SỐ TBMT'], proj: ['DỰ ÁN'],
    price: ['GIÁ GÓI THẦU'], form: ['HÌNH THỨC LỰA CHỌN'], date: ['THỜI GIAN PHÁT HÀNH HSMT'], open: ['THỜI GIAN MỞ THẦU'],
    prov: ['TỈNH THÀNH'], upd: ['THỜI GIAN CẬP NHẤT', 'THỜI GIAN CẬP NHẬT'], month: ['THÁNG'] },
  khmt: { anchor: ['CHỦ ĐẦU TƯ', 'TÊN GÓI THẦU'], inv: ['TÊN CHỦ ĐẦU TƯ', 'CHỦ ĐẦU TƯ'], name: ['TÊN GÓI THẦU'], no: ['SỐ KẾ HOẠCH'], proj: ['TÊN DỰ ÁN'],
    price: ['GIÁ GÓI THẦU'], form: ['HÌNH THỨC LỰA CHỌN'], date: ['THỜI GIAN LỰA CHỌN'], prov: ['TỈNH THÀNH'],
    upd: ['THỜI GIAN CẬP NHẤT', 'THỜI GIAN CẬP NHẬT'], month: ['THÁNG'] }
};

/** Cột theo tên tiêu đề: trùng hẳn ⇒ bắt đầu bằng ⇒ chứa (vd. "GÓI THẦU" không khớp nhầm "GIÁ GÓI THẦU") */
function wtCol_(hdr, keys) {
  for (const mode of [0, 1, 2]) for (const k of keys) {
    for (let i = 0; i < hdr.length; i++) {
      const h = hdr[i];
      if (!h) continue;
      if ((mode === 0 && h === k) || (mode === 1 && h.indexOf(k) === 0) || (mode === 2 && h.indexOf(k) >= 0)) return i;
    }
  }
  return -1;
}
function wtNo_(s) { return wtS_(s).toUpperCase().replace(/\s+/g, ''); }
function wtDateOf_(s) {
  s = wtS_(s);
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) return m[1] + '-' + m[2] + '-01';
  return '';
}

function wtLoad_(ss) {
  const out = {};
  Object.keys(WT_COLS).forEach(function (type) {
    const C = WT_COLS[type], gid = { kqdt: KQDT_GID, tbmt: TBMT_GID, khmt: KHMT_GID }[type], sh = _getSheetByGid(ss, gid), rows = [];
    out[type] = rows;
    if (!sh) return;
    const V = sh.getDataRange().getDisplayValues();
    let hr = -1, hdr = [];
    for (let i = 0; i < Math.min(10, V.length); i++) {
      const r = V[i].map(function (c) { return wtS_(c).toUpperCase().replace(/\s+/g, ' '); });
      if (C.anchor.every(function (h) { return r.some(function (c) { return c.indexOf(h) >= 0; }); })) { hr = i; hdr = r; break; }
    }
    if (hr < 0) return;
    const ix = {};
    Object.keys(C).forEach(function (k) { if (Array.isArray(C[k]) && k !== 'anchor') ix[k] = wtCol_(hdr, C[k]); });
    const g = function (r, k) { return ix[k] >= 0 ? wtS_(r[ix[k]]) : ''; };
    for (let i = hr + 1; i < V.length; i++) {
      const r = V[i], inv = g(r, 'inv');
      if (!inv) continue;
      let name = g(r, 'name'), no = wtNo_(g(r, 'no'));
      if (!no && type !== 'khmt') no = wtNo_(_extractTBMTNo(name));
      name = name.replace(/\s*\(Số thông báo:[^)]*\)\s*$/i, '');
      rows.push({
        type: type, row: i + 1, inv: _normalizeInvestor(inv), invKey: wtNorm_(inv), name: name, no: no, proj: g(r, 'proj'),
        price: g(r, 'price'), win: g(r, 'win'), winner: g(r, 'winner'), form: g(r, 'form'), open: g(r, 'open'), prov: g(r, 'prov'),
        date: wtDateOf_(g(r, 'date')) || wtDateOf_(g(r, 'upd')) || wtDateOf_(g(r, 'month')),
        upd: wtDateOf_(g(r, 'upd')) || wtDateOf_(g(r, 'date')) || wtDateOf_(g(r, 'month'))
      });
    }
  });
  return out;
}

/* ══════════ DANH SÁCH CHỦ ĐẦU TƯ (cho ô chọn của app) ══════════ */
function wtInvestors_(p) {
  const c = CacheService.getScriptCache(), ck = 'wt_inv1';
  if (!wtTrue_(p.fresh)) { const hit = wtBigGet_(c, ck); if (hit) return Object.assign(JSON.parse(hit), { cached: true }); }
  const data = wtLoad_(wtBook_()), by = {};
  ['khmt', 'tbmt', 'kqdt'].forEach(function (type, ti) {
    data[type].forEach(function (r) {
      let x = by[r.invKey];
      if (!x) x = by[r.invKey] = [r.inv, 0, 0, 0, '', r.prov];
      x[1 + ti]++;
      if (r.upd > x[4]) x[4] = r.upd;
      if (!x[5] && r.prov) x[5] = r.prov;
    });
  });
  const list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (b[1] + b[2] + b[3]) - (a[1] + a[2] + a[3]); });
  const res = { ok: true, cols: ['name', 'khmt', 'tbmt', 'kqdt', 'last', 'prov'], list: list, at: wtNow_() };
  wtBigPut_(c, ck, JSON.stringify(res), 21600);
  return res;
}
function wtBigPut_(c, k, s, ttl) {
  const n = Math.ceil(s.length / 90000), o = {};
  for (let i = 0; i < n; i++) o[k + '_' + i] = s.slice(i * 90000, (i + 1) * 90000);
  o[k] = String(n);
  try { c.putAll(o, ttl); } catch (e) {}
}
function wtBigGet_(c, k) {
  try {
    const n = parseInt(c.get(k), 10);
    if (!n) return null;
    const keys = []; for (let i = 0; i < n; i++) keys.push(k + '_' + i);
    const g = c.getAll(keys); let s = '';
    for (let i = 0; i < n; i++) { if (g[keys[i]] == null) return null; s += g[keys[i]]; }
    return s;
  } catch (e) { return null; }
}

/* ══════════ APP: BOOT / LƯU / XOÁ ══════════ */
function wtBoot_(me, p) {
  const ss = wtBook_(), all = wtWatches_(ss);
  const mine = me.boss && wtTrue_(p.all) ? all : all.filter(function (w) { return w.mail === me.mail || wtLocal_(w.mail) === me.local; });
  const H = wtHits_(ss), ids = {};
  mine.forEach(function (w) { ids[w.mail] = 1; });
  ids[me.mail] = 1;
  const hits = H.filter(function (h) {
    return h.watchers.some(function (m) { return ids[m] || wtLocal_(m) === me.local; });
  }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || b.found.localeCompare(a.found); }).slice(0, 800)
    .map(function (h) { return wtHitOut_(h); });
  const P = PropertiesService.getScriptProperties();
  return {
    ok: true, v: WT.VER, me: { pic: me.pic, mail: me.mail, boss: me.boss, admin: me.admin },
    watches: mine.map(function (w) { return { id: w.id, mail: w.mail, pic: w.pic, investor: w.investor, types: w.types, keywords: w.keywords, dl: w.dl, email: w.email, active: w.active, at: w.at, scanned: w.scanned }; }),
    hits: hits, types: WT.TYPES,
    bot: { seen: P.getProperty('WT_BOT_SEEN') || '', name: P.getProperty('WT_BOT_NAME') || '', hasKey: !!P.getProperty('WT_BOT_KEY'),
      queue: H.filter(function (h) { return h.status === WT.ST.WAIT || h.status === WT.ST.WORK; }).length },
    nm: wtJson_(P.getProperty('WN_STAT'), null),
    lastScan: P.getProperty('WT_LAST_SCAN') || '', sumUrl: wtdSumUrl_(), rootUrl: wtdRootUrl_(), mg: wtmUrls_(), mgLast: JSON.parse(P.getProperty('WT_MG_LAST') || 'null'), invV: P.getProperty('WT_INV_V') || '', recV: P.getProperty('WT_REC_V') || '', allV: P.getProperty('WT_ALL_V') || '', agw: wtaStatus_(), ext: wtxStatus_()
  };
}
/** info gọn cho app (18/11/2026): bỏ fields / kqFields / moFields / pkgs… (mỗi gói vài KB — 800 gói ⇒ vài MB mỗi lần mở app, đầy bộ nhớ trình duyệt dùng chung) */
const WT_INFO_KEEP = ['agentReq', 'url', 'prov', 'want', 'winner', 'win', 'price', 'open', 'form', 'bidName', 'investor', 'quick', 'by', 'grab', 'n', 'planNo', 'proj'];
function wtInfoSlim_(I) {
  I = I || {}; const o = {};
  WT_INFO_KEEP.forEach(function (k) { if (I[k] !== undefined && I[k] !== null && I[k] !== '') o[k] = I[k]; });
  const F = I.fields || {}, c = F['Thời điểm đóng thầu'] || F['Thời điểm mở thầu']; if (c) o.close = c;
  if (Array.isArray(I.agentFiles)) o.agentFiles = I.agentFiles.map(function (a) {
    return a && typeof a === 'object' ? { name: a.name, type: a.type, tab: a.tab, done: a.done, url: a.url, file: a.file, fileId: a.fileId, tries: a.tries } : a;
  });
  return o;
}
function wtHitOut_(h) {
  return { key: h.key, type: h.type, no: h.no, investor: h.investor, name: h.name, info: wtInfoSlim_(h.info), date: h.date, found: h.found,
    status: h.status, files: h.files, tries: h.tries, note: h.note, done: h.done, last: h.last, watchers: h.watchers.length };   // last = lúc bắt đầu tải (app ước tính %)
}

function wtSave_(me, p) {
  const w = typeof p.w === 'string' ? wtJson_(p.w, null) : p.w;
  if (!w || !wtS_(w.investor)) return { ok: false, error: 'Chưa chọn chủ đầu tư.' };
  const types = (w.types || []).filter(function (t) { return WT.TYPES[t]; });
  if (!types.length) return { ok: false, error: 'Chọn ít nhất 1 loại tin.' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  let id;
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_W, WT.HW), all = wtWatches_(ss), now = wtNow_();
    const inv = _normalizeInvestor(w.investor), key = wtNorm_(inv);
    let cur = w.id ? all.filter(function (x) { return x.id === wtS_(w.id); })[0] : null;
    if (w.id && !cur) return { ok: false, error: 'Mục theo dõi không còn — tải lại app.' };
    if (cur && cur.mail !== me.mail && wtLocal_(cur.mail) !== me.local && !me.admin) return { ok: false, error: 'Chỉ người tạo hoặc Admin được sửa mục này.' };
    if (!cur) {
      const dup = all.filter(function (x) { return x.invKey === key && (x.mail === me.mail || wtLocal_(x.mail) === me.local); })[0];
      if (dup) cur = dup;
    }
    const row = [cur ? cur.id : 'W' + Utilities.getUuid().replace(/-/g, '').slice(0, 10), cur ? cur.mail : me.mail, cur ? cur.pic : me.pic,
      inv, key, types.join(','), (w.keywords || []).map(wtS_).filter(String).join('; '), w.dl === false ? 'Không' : 'Có',
      w.email ? 'Có' : 'Không', w.active === false ? 'Không' : 'Có', cur ? cur.at : now, now, cur && cur.invKey === key ? cur.scanned : ''];
    if (cur) sh.getRange(cur.row, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    id = row[0];
  } finally { lock.releaseLock(); }
  let scan = null;
  try { scan = wtScan_({ only: id }); } catch (e) { scan = { error: String(e.message || e) }; }
  return Object.assign(wtBoot_(me, {}), { saved: id, scan: scan });
}

function wtDel_(me, p) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_W, WT.HW);
    const cur = wtWatches_(ss).filter(function (x) { return x.id === wtS_(p.id); })[0];
    if (!cur) return { ok: true, gone: true };
    if (cur.mail !== me.mail && wtLocal_(cur.mail) !== me.local && !me.admin) return { ok: false, error: 'Chỉ người tạo hoặc Admin được xoá mục này.' };
    sh.deleteRow(cur.row);
  } finally { lock.releaseLock(); }
  return wtBoot_(me, {});
}

/** Loại tài liệu người dùng chọn tải (app ▸ hộp "Chọn tài liệu"); trống = tải mọi loại. Lưu ở info.want, bot đọc qua job.info.want */
const WT_WANT = ['tbmt', 'hsmt', 'mo', 'kq', 'nt', 'hh', 'qd', 'kh'];
function wtWant_(v) {
  const a = (Array.isArray(v) ? v : String(v || '').split(',')).map(function (x) { return wtS_(x).toLowerCase(); }).filter(function (x) { return WT_WANT.indexOf(x) >= 0; });
  return a.length && a.length < WT_WANT.length ? a.filter(function (x, i) { return a.indexOf(x) === i; }) : [];
}
function wtInfoWant_(info, want) { const o = Object.assign({}, info || {}); if (want.length) o.want = want; else delete o.want; return JSON.stringify(o); }

function wtHitOp_(me, p) {
  const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss);
  const h = H.filter(function (x) { return x.key === wtS_(p.key); })[0];
  if (!h) return { ok: false, error: 'Không tìm thấy gói.' };
  if (!me.boss && !h.watchers.some(function (m) { return wtLocal_(m) === me.local; })) return { ok: false, error: 'Bạn không theo dõi gói này.' };
  if (p.op === 'dl') {
    const q = wtReq_(sh, h, me, wtWant_(p.want), wtTrue_(p.force), true);
    if (q.skip) return { ok: true, key: h.key, skipped: q.skip, status: h.status, at: h.done || h.last || '', n: (h.files || []).length };
    return { ok: true, key: h.key, status: WT.ST.WAIT };
  }
  if (p.op === 'skip') { if (h.status === WT.ST.WORK) return { ok: false, error: 'Gói đang tải — đợi bot tải xong.' }; sh.getRange(h.row, 11).setValue(WT.ST.OFF); return { ok: true, key: h.key, status: WT.ST.OFF }; }
  return { ok: false, error: 'Thao tác không hợp lệ.' };
}

/* ══════════ TẢI NGAY (số bất kỳ) ══════════ */
function wtQuick_(me, p) {
  const nos = String(p.nos || '').toUpperCase().match(/(IB|PL)\d{8,12}(-\d+)?/g) || [];
  if (!nos.length) return { ok: false, error: 'Chưa có số TBMT / KHLCNT hợp lệ (IB… hoặc PL…).' };
  if (nos.length > 30) return { ok: false, error: 'Tối đa 30 số mỗi lần.' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  const out = [], skipped = [], want = wtWant_(p.want), force = wtTrue_(p.force);
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss), now = wtNow_(), add = [];
    const bare = function (n) { return String(n || '').toUpperCase().replace(/\s+/g, '').replace(/-\d+$/, ''); };
    [...new Set(nos.map(bare))].forEach(function (b) {
      const ex = H.filter(function (h) { return bare(h.no) === b; });
      if (ex.length) {
        ex.forEach(function (h) {
          const q = wtReq_(sh, h, me, want, force);
          if (q.skip) skipped.push({ key: h.key, no: h.no, why: q.skip, at: h.done || h.last || '', n: (h.files || []).length }); else out.push(h.key);
        });
        return;
      }
      const type = /^PL/.test(b) ? 'khmt' : 'tbmt', key = 'n:' + b;
      add.push([key, type, b, '(đang tra)', '', b, wtInfoWant_({ quick: 1, by: me.pic }, want), '', now, me.mail, WT.ST.WAIT, '[]', 0, '', '', '', 'tải ngay']);
      out.push(key);
    });
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, WT.HH.length).setValues(add);
  } finally { lock.releaseLock(); }
  return Object.assign(wtBoot_(me, {}), { queued: out, skipped: skipped });
}

/** CHỐNG TẢI LẶP (18/11/2026, người dùng yêu cầu): yêu cầu tải 1 gói đã có trong GÓI TÌM THẤY.
 *  Đang tải ⇒ bỏ qua ('work') · Chờ tải ⇒ chỉ gộp loại tài liệu ('wait') · Đã tải / Không có file ⇒ bỏ qua ('done') trừ khi force (người dùng bấm "Tải lại")
 *  · Lỗi / Không tải / trống ⇒ đưa lại vào hàng đợi. Luôn thêm người bấm vào danh sách theo dõi gói. */
function wtReq_(sh, h, me, want, force, noWatch) {
  const w = !noWatch && h.watchers.indexOf(me.mail) < 0 ? h.watchers.concat([me.mail]) : h.watchers;
  if (w !== h.watchers) sh.getRange(h.row, 10).setValue(w.join(', '));
  if (h.status === WT.ST.WORK) return { skip: 'work' };
  if (h.status === WT.ST.WAIT) {
    const cur = (h.info || {}).want || [];
    const m = !cur.length || !want.length ? [] : cur.concat(want.filter(function (x) { return cur.indexOf(x) < 0; }));
    sh.getRange(h.row, 7).setValue(wtInfoWant_(h.info, m.length >= WT_WANT.length ? [] : m));
    return { skip: 'wait' };
  }
  if (!force && (h.status === WT.ST.DONE || h.status === WT.ST.NOFILE)) return { skip: 'done' };
  sh.getRange(h.row, 7).setValue(wtInfoWant_(h.info, want));
  sh.getRange(h.row, 11, 1, 4).setValues([[WT.ST.WAIT, JSON.stringify(h.files || []), 0, wtNow_()]]);   // cột 14 = lúc vào hàng đợi (app: "đã chờ x phút"; bot ghi đè khi bắt đầu tải)
  return {};
}

/* ══════════ GÓI TÌM THẤY ══════════ */
function wtHits_(ss) {
  const sh = wtSheet_(ss, WT.SH_H, WT.HH);
  return wtRows_(sh, WT.HH.length).map(function (r, i) {
    return {
      row: i + 2, key: wtS_(r[0]), type: wtS_(r[1]), no: wtS_(r[2]), investor: wtS_(r[3]), invKey: wtS_(r[4]), name: wtS_(r[5]),
      info: wtJson_(wtS_(r[6]), {}), date: wtS_(r[7]), found: wtS_(r[8]),
      watchers: wtS_(r[9]).split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(String),
      status: wtS_(r[10]), files: wtJson_(wtS_(r[11]), []), tries: parseInt(r[12], 10) || 0, last: wtS_(r[13]), note: wtS_(r[14]),
      done: wtS_(r[15]), src: wtS_(r[16])
    };
  }).filter(function (h) { return h.key; });
}

/** Quét: gói của chủ đầu tư đang theo dõi ⇒ thêm vào GÓI TÌM THẤY; gói mới (không phải lượt đầu) ⇒ thông báo */
function wtScan_(opt) {
  opt = opt || {};
  const ss = wtBook_(), all = wtWatches_(ss).filter(function (w) { return w.active && w.types.length && (!opt.only || w.id === opt.only); });
  const P = PropertiesService.getScriptProperties();
  if (!all.length) { P.setProperty('WT_LAST_SCAN', wtNow_() + ' · 0 mục theo dõi'); return { watches: 0, added: 0 }; }
  const data = opt.data || wtLoad_(ss), today = new Date();
  const ago = function (d, n) { if (!d) return false; const t = new Date(d + 'T00:00:00+07:00'); return (today - t) / 864e5 <= n; };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return { busy: true };
  const res = { watches: all.length, added: 0, linked: 0, notify: 0 };
  try {
    const shH = wtSheet_(ss, WT.SH_H, WT.HH), shW = wtSheet_(ss, WT.SH_W, WT.HW), H = wtHits_(ss), byKey = {};
    H.forEach(function (h) { byKey[h.key] = h; });
    const add = [], news = {}, now = wtNow_(), touched = {};
    all.forEach(function (w) {
      const base = !w.scanned, kws = w.keywords.map(wtNorm_).filter(String);
      const firstDay = base ? '' : Utilities.formatDate(new Date(new Date(w.scanned.replace(' ', 'T') + '+07:00').getTime() - 3 * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
      w.types.forEach(function (type) {
        const group = {};
        data[type].forEach(function (r) {
          if (r.invKey !== w.invKey) return;
          if (kws.length) { const nm = wtNorm_(r.name + ' ' + r.proj); if (!kws.some(function (k) { return nm.indexOf(k) >= 0; })) return; }
          const key = type + ':' + (r.no || ('r' + r.row));
          if (!group[key]) group[key] = { key: key, r: r, names: [] };
          if (group[key].names.indexOf(r.name) < 0) group[key].names.push(r.name);
        });
        Object.keys(group).forEach(function (key) {
          const g = group[key], r = g.r;
          const ex = byKey[key];
          if (ex) {
            if (ex.watchers.indexOf(w.mail) < 0) { ex.watchers.push(w.mail); touched[ex.row] = ex.watchers.join(', '); res.linked++; }
            return;
          }
          if (base && !ago(r.upd || r.date, WT.BASE_DAYS)) return;
          // lượt sau: gói cũ (cập nhật trước lần quét đầu − 3 ngày) mà chưa có trong danh sách = đã bị bỏ ở lượt đầu ⇒ không coi là mới
          if (!base && (r.upd || r.date) && (r.upd || r.date) < firstDay) return;
          const dl = w.dl && !!r.no && (!base || ago(r.upd || r.date, WT.DL_BASE_DAYS));
          const name = g.names.length > 1 ? g.names[0] + ' (+' + (g.names.length - 1) + ' gói)' : g.names[0];
          const info = { proj: r.proj, price: r.price, win: r.win, winner: r.winner, form: r.form, open: r.open, prov: r.prov, n: g.names.length };
          if (g.names.length > 1) info.names = g.names.slice(0, 30);
          const h = { key: key, type: type, no: r.no, investor: w.investor, invKey: r.invKey, name: name, info: info, date: r.date, found: now,
            watchers: [w.mail], status: dl ? WT.ST.WAIT : WT.ST.OFF, src: type + '!' + r.row };
          byKey[key] = h; add.push(h);
          if (!base) { (news[w.mail] = news[w.mail] || { w: w, list: [] }).list.push(h); }
        });
      });
      if (base) shW.getRange(w.row, 13).setValue(now);
    });
    Object.keys(touched).forEach(function (row) { shH.getRange(+row, 10).setValue(touched[row]); });
    if (add.length) {
      shH.getRange(shH.getLastRow() + 1, 1, add.length, WT.HH.length).setValues(add.map(function (h) {
        return [h.key, h.type, h.no, h.investor, h.invKey, h.name, JSON.stringify(h.info), h.date, h.found, h.watchers.join(', '), h.status, '[]', 0, '', '', '', h.src];
      }));
    }
    res.added = add.length;
    res.notify = wtNotifyNew_(news);
  } finally { lock.releaseLock(); }
  P.setProperty('WT_LAST_SCAN', wtNow_() + ' · ' + res.watches + ' mục · ' + res.added + ' gói mới');
  return res;
}

/* ══════════ THÔNG BÁO ══════════ */
function wtFeed_(rows) {
  if (!rows.length) return;
  try {
    const book = SpreadsheetApp.openById(WT.MASTER_ID);
    let sh = book.getSheetByName('RH_Notify');
    if (!sh) { sh = book.insertSheet('RH_Notify'); sh.getRange(1, 1, 1, WT_NOTIFY_HDR.length).setValues([WT_NOTIFY_HDR]).setFontWeight('bold'); sh.setFrozenRows(1); }
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, WT_NOTIFY_HDR.length).setValues(rows);
  } catch (e) { Logger.log('wtFeed_: ' + (e && e.message || e)); }
}
function wtFeedRow_(pic, kind, title, text, url) {
  return ['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), new Date(), pic, 'Theo dõi gói thầu', kind, String(title).slice(0, 300), String(text).slice(0, 900), url, 'Hệ thống', '', '', ''];
}
function wtH_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/** news = { mail: { w, list:[hit] } } ⇒ 1 thông báo / người (+ email nếu mục theo dõi bật) */
function wtNotifyNew_(news) {
  const feed = []; let n = 0;
  Object.keys(news).forEach(function (mail) {
    const x = news[mail], list = x.list;
    if (!list.length) return;
    const lines = list.map(function (h) { return '• ' + WT.TYPES[h.type] + ' · ' + h.investor + ' · ' + h.name + (h.no ? ' (' + h.no + ')' : ''); });
    const title = list.length + ' tin thầu mới — ' + (list.length === 1 ? list[0].investor : 'các chủ đầu tư bạn theo dõi');
    feed.push(wtFeedRow_(x.w.pic, 'new', title, lines.slice(0, 12).join('\n'), WT.APP_URL + (list.length === 1 ? '#g=' + encodeURIComponent(list[0].key) : '#moi')));
    n++;
    if (!x.w.email) return;
    try {
      const td = '<td style="padding:5px 8px;border-bottom:1px solid #E6EAEF;vertical-align:top">';
      const rows = list.map(function (h) {
        const I = h.info || {}, money = function (v) { const n = wtdMoney_(v); return n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ' : ''; };
        const meta = [I.price ? 'Giá gói: ' + money(I.price) : '', I.win ? 'Giá trúng: ' + money(I.win) : '', I.winner ? 'Nhà thầu trúng: ' + I.winner : '', I.form || '', I.open ? 'Mở / đóng thầu: ' + I.open : ''].filter(String).join(' · ');
        return '<tr>' + td + wtH_(WT.TYPES[h.type]) + '</td>' + td + wtH_(h.investor) + (I.prov ? '<br><span style="color:#6B7280">' + wtH_(I.prov) + '</span>' : '') + '</td>' + td +
          '<a href="' + WT.APP_URL + '#g=' + encodeURIComponent(h.key) + '" style="color:#3A5CAA;text-decoration:none"><b>' + wtH_(h.name) + '</b></a>' + (meta ? '<br><span style="color:#4B5563;font-size:12px">' + wtH_(meta) + '</span>' : '') + '</td>' + td + wtH_(h.no) + '</td></tr>';
      }).join('');
      const kw = (x.w.keywords || []).length ? '<br>Từ khoá đang lọc: <b>' + wtH_(x.w.keywords.join(', ')) + '</b>' : '';
      mmhMail_({
        to: mail, subject: '[Theo dõi gói thầu] ' + title, name: CFG.EMAIL_FROM_NAME,
        htmlBody: '<div style="font-family:Aptos,Arial,sans-serif;font-size:14px;color:#1F2937">Dear ' + wtH_(x.w.pic || '') + ',<br><br>Có ' + list.length +
          ' tin thầu mới của chủ đầu tư bạn đang theo dõi.' + kw + '<br><br><table style="border-collapse:collapse;font-size:13px"><tr style="background:#F0F7FF"><th align="left" style="padding:4px 8px">Loại</th><th align="left" style="padding:4px 8px">Chủ đầu tư</th><th align="left" style="padding:4px 8px">Gói thầu</th><th align="left" style="padding:4px 8px">Số</th></tr>' +
          rows + '</table><br>Bấm tên gói để mở trên app. Hồ sơ (nếu bật tự tải) có trên app và thư mục Drive sau khi máy chủ tải xong.<br><br>Best regards,<br>MMH Product Team</div>'
      });
    } catch (e) { Logger.log('wtNotifyNew_ mail ' + mail + ': ' + e.message); }
  });
  wtFeed_(feed);
  return n;
}

/* ══════════ TRIGGER ══════════ */
function wtTick() {
  try { wtEnsureTrig_(); } catch (e) {}   // tự cài trigger gộp 15 phút (wtmTick) dù chưa ai mở app
  try { const data = wtLoad_(wtBook_()); try { wtdInvBuild_(data); } catch (e) { Logger.log('wtdInvBuild_: ' + e.message); } try { wtdPkgBuild_(data); } catch (e) { Logger.log('wtdPkgBuild_: ' + e.message); } try { wtdRecentBuild_(data); } catch (e) { Logger.log('wtdRecentBuild_: ' + e.message); } try { wtdAllBuild_(data); } catch (e) { Logger.log('wtdAllBuild_: ' + e.message); } wtScan_({ data: data }); try { wtbAuto_(data); } catch (e) { Logger.log('wtbAuto_: ' + e.message); } } catch (e) { Logger.log('wtTick: ' + e.message); PropertiesService.getScriptProperties().setProperty('WT_LAST_SCAN', wtNow_() + ' · lỗi: ' + e.message); }
}
function wtEnsureTrig_() {
  const P = PropertiesService.getScriptProperties();
  // cờ đã cài + lần quét cuối < 2 giờ ⇒ tin; quá lâu chưa quét ⇒ kiểm trigger thật (bài học Tender Map 11/11/2026: cờ có mà trigger không chạy)
  const last = (P.getProperty('WT_LAST_SCAN') || '').slice(0, 19), age = last ? (Date.now() - new Date(last.replace(' ', 'T') + '+07:00').getTime()) / 6e4 : 1e9;
  if (P.getProperty('WT_TRIG') === '2' && age < 120) return;
  try {
    const T = ScriptApp.getProjectTriggers();
    if (!T.some(function (t) { return t.getHandlerFunction() === 'wtTick'; })) ScriptApp.newTrigger('wtTick').timeBased().everyMinutes(30).create();
    if (!T.some(function (t) { return t.getHandlerFunction() === 'wtmTick'; })) ScriptApp.newTrigger('wtmTick').timeBased().everyMinutes(15).create();   // gộp 2 file tổng (MMH_WatchMerge.gs)
    P.setProperty('WT_TRIG', '2');
  } catch (e) { Logger.log('wtEnsureTrig_: ' + e.message); }
}
/** Chạy tay trong trình soạn: cài trigger + quét ngay */
function wtSetup() { PropertiesService.getScriptProperties().deleteProperty('WT_TRIG'); wtEnsureTrig_(); return wtScan_({}); }

/* ══════════ BOT (máy ở Việt Nam) ══════════ */
function wtBotOk_(k) { const s = PropertiesService.getScriptProperties().getProperty('WT_BOT_KEY') || ''; return s.length >= 24 && wtSame_(wtS_(k), s); }
function wtBotSeen_(name) { const P = PropertiesService.getScriptProperties(); P.setProperty('WT_BOT_SEEN', wtNow_()); if (name) P.setProperty('WT_BOT_NAME', wtS_(name).slice(0, 60)); }
function wtBotKey_(me, p) {
  if (!me.admin) return { ok: false, error: 'Chỉ Admin xem được khoá bot.' };
  const P = PropertiesService.getScriptProperties();
  let k = P.getProperty('WT_BOT_KEY');
  if (!k || wtTrue_(p.renew)) { k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); P.setProperty('WT_BOT_KEY', k); }
  return { ok: true, key: k, url: ScriptApp.getService().getUrl() };
}
function wtBotLog_(ss, bot, key, job, result, note) {
  try { wtSheet_(ss, WT.SH_L, WT.HL).appendRow([wtNow_(), wtS_(bot), key, job, result, String(note || '').slice(0, 500)]); } catch (e) {}
}

/** Gói bot cần làm: Chờ tải · Lỗi (chưa quá số lần, thử lại sau ≥ 1 giờ) · Đang tải quá hạn giữ chỗ */
function wtBare_(no) { return String(no || '').toUpperCase().replace(/\s+/g, '').replace(/-\d+$/, ''); }
// cloud = bot GitHub (khoá bot). Gói info.ag = 1 (TBMT / KHLCNT tự đặt hằng ngày — 19/11/2026 người dùng: "tải về hôm sau khi bật bot tải qua Agent")
// CHỈ dành cho tiện ích trên máy có VNeGP Agent ⇒ bot cloud không nhận (không tốn phút GitHub), wPing không đếm vào `wait` (Training Hub không đánh thức bot cloud vì chúng).
function wtBotEligible_(H, cloud) {
  const now = Date.now(), age = function (s) { return s ? (now - new Date(String(s).replace(' ', 'T') + '+07:00').getTime()) / 6e4 : 1e9; };
  return H.filter(function (h) {
    if (!h.no) return false;
    if (cloud && (h.info || {}).ag) return false;
    if (h.status === WT.ST.WAIT) return !((h.info || {}).agentReq && !(h.info || {}).agentReq.done && age((h.info || {}).agentReq.at) < WTA.HOLD_MIN);   // nhường máy Agent
    if (h.status === WT.ST.WORK) return age(h.last) > WT.LEASE_MIN;
    if (h.status === WT.ST.ERR) return h.tries < WT.MAX_TRY && age(h.last) > 60;
    return false;
  });
}
/** Lấy tối đa n việc: Chờ tải · Lỗi (chưa quá số lần, thử lại sau ≥ 1 giờ) · Đang tải quá hạn giữ chỗ */
function wtBotNext_(p) {
  wtBotSeen_(p.bot);
  const n = Math.min(10, Math.max(1, parseInt(p.n, 10) || 3)), ss = wtBook_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: true, jobs: [] };
  try {
    const sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss), jobs = [], E = wtBotEligible_(H, !p._ext), taken = {};
    // cùng 1 số gói có thể có 2 dòng (TBMT + Kết quả) ⇒ chỉ 1 lượt tải; số đang có dòng "Đang tải" (chưa hết hạn) ⇒ bỏ qua
    H.forEach(function (h) { if (h.status === WT.ST.WORK && E.indexOf(h) < 0) taken[wtBare_(h.no)] = 1; });
    // 19/11/2026 (người dùng: "ưu tiên cho bot tải các gói ở các bv mắt trước"): chủ đầu tư có chữ "mắt" (có dấu) hoặc gói tải hàng loạt đi trước, rồi ngày mới trước
    // 19/11/2026 (2) lịch tải: info.pri nếu có (1 = gói vật tư mới hằng ngày, 3 = tồn đọng vật tư "tải sau") · không có ⇒ địa bàn đã trao đổi (bệnh viện mắt / bệnh viện từng có KQTT dao = gói hàng loạt cũ) 0 · gói người dùng tự đặt 1
    const pri = function (h) { const i = h.info || {}; if (typeof i.pri === 'number') return i.pri; return (/mắt/i.test(String(h.investor || '').normalize('NFC')) || i.bulk) ? 0 : 1; };
    E.sort(function (a, b) { return pri(a) - pri(b) || (b.date || '').localeCompare(a.date || ''); }).forEach(function (h) {
      const b = wtBare_(h.no);
      if (jobs.length >= n || taken[b]) return;
      taken[b] = 1;
      const sib = E.filter(function (x) { return wtBare_(x.no) === b; });
      const ws = sib.map(function (x) { return (x.info || {}).want || []; }), want = ws.some(function (w) { return !w.length; }) ? [] : [].concat.apply([], ws).filter(function (x, i, a) { return a.indexOf(x) === i; });
      sib.forEach(function (x) { sh.getRange(x.row, 11, 1, 4).setValues([[WT.ST.WORK, JSON.stringify(x.files || []), x.tries + 1, wtNow_()]]); });
      const info = Object.assign({}, h.info); if (want.length) info.want = want; else delete info.want;
      jobs.push({ key: h.key, type: h.type, no: h.no, investor: h.investor, name: h.name, info: info, date: h.date, sib: sib.map(function (x) { return x.key; }) });
    });
    return { ok: true, jobs: jobs };
  } finally { lock.releaseLock(); }
}

function wtRoot_() {
  const P = PropertiesService.getScriptProperties();
  const id = P.getProperty('WT_ROOT');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  let parent;
  try { const it = DriveApp.getFileById(CFG.TENDER_SHEET_ID).getParents(); if (it.hasNext()) parent = it.next(); } catch (e) {}
  const f = parent ? parent.createFolder(WT.ROOT_NAME) : DriveApp.createFolder(WT.ROOT_NAME);
  P.setProperty('WT_ROOT', f.getId());
  return f;
}
function wtSub_(parent, name) {
  name = wtS_(name).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 120) || 'Khác';
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function wtBotFile_(p) {
  const ss = wtBook_(), h = wtHits_(ss).filter(function (x) { return x.key === wtS_(p.hit); })[0];
  if (!h) return { ok: false, error: 'Không có gói ' + p.hit };
  const b64 = wtS_(p.b64);
  if (!b64) return { ok: false, error: 'Thiếu nội dung file.' };
  const bytes = Utilities.base64Decode(b64);
  if (bytes.length > WT.MAX_FILE) return { ok: false, error: 'File quá lớn (> 35 MB).' };
  const name = wtS_(p.name).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150) || ('file_' + Date.now());
  const inv = h.investor && h.investor !== '(đang tra)' ? h.investor : (wtS_(p.investor) || 'Tải ngay');
  const sec = wtS_(p.sec) in WTD.DIR ? wtS_(p.sec) : (h.type === 'khmt' ? 'kh' : h.type === 'kqdt' ? 'kq' : 'tbmt');
  const pkgNo = sec === 'kh' && wtS_(p.planNo) ? wtS_(p.planNo) : h.no;
  const folder = wtdPkgFolder_(sec, pkgNo, inv);
  const sv = wtdSave_(folder, name, bytes, wtS_(p.mime));
  const f = { getUrl: function () { return sv.url; }, getId: function () { return sv.id; } };
  const lock = LockService.getScriptLock();
  if (lock.tryLock(20000)) {
    try {
      const sh = wtSheet_(ss, WT.SH_H, WT.HH), cur = wtHits_(ss).filter(function (x) { return x.key === h.key; })[0];
      const files = (cur.files || []).filter(function (x) { return x.name !== name && x.name !== sv.name; });
      files.push({ name: sv.name, url: f.getUrl(), id: f.getId(), size: bytes.length, kind: wtS_(p.kind), sec: sec, gsheet: sv.gsheet });
      sh.getRange(cur.row, 12).setValue(JSON.stringify(files));
    } finally { lock.releaseLock(); }
    wtdDocsBust_();
  }
  return { ok: true, id: f.getId(), url: f.getUrl(), name: sv.name, gsheet: sv.gsheet, folder: folder.getUrl() };
}

function wtBotDone_(p) {
  wtBotSeen_(p.bot);
  const ss = wtBook_(), st = { done: WT.ST.DONE, nofile: WT.ST.NOFILE, error: WT.ST.ERR }[wtS_(p.status)] || WT.ST.ERR;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY' };
  let h;
  try {
    const sh = wtSheet_(ss, WT.SH_H, WT.HH);
    h = wtHits_(ss).filter(function (x) { return x.key === wtS_(p.hit); })[0];
    if (!h) return { ok: false, error: 'Không có gói ' + p.hit };
    const info = Object.assign({}, h.info, typeof p.info === 'string' ? wtJson_(p.info, {}) : (p.info || {}));
    // tài liệu cần Agent mà người dùng đã tự tải lên (wUpload) ⇒ giữ dấu done + link khi bot chạy lại
    const prevAg = {}; ((h.info || {}).agentFiles || []).forEach(function (a) { if (a && a.done) prevAg[a.name] = a; });
    if (info.agentFiles) info.agentFiles = info.agentFiles.map(function (a) { return prevAg[a.name] ? Object.assign({}, a, { done: prevAg[a.name].done, url: prevAg[a.name].url, file: prevAg[a.name].file }) : a; });
    p._agDone = prevAg;
    sh.getRange(h.row, 7).setValue(JSON.stringify(info));
    if (info.investor && (!h.investor || h.investor === '(đang tra)')) sh.getRange(h.row, 4, 1, 2).setValues([[wtS_(info.investor), wtNorm_(info.investor)]]);
    if (info.bidName && (!h.name || h.name === h.no)) sh.getRange(h.row, 6).setValue(wtS_(info.bidName).slice(0, 300));
    sh.getRange(h.row, 11).setValue(st);
    sh.getRange(h.row, 15, 1, 2).setValues([[wtS_(p.note).slice(0, 500), st === WT.ST.ERR ? '' : wtNow_()]]);
    h.status = st;
    // dòng khác cùng số gói (TBMT ⇄ Kết quả) đang chờ / đang tải ⇒ nhận cùng kết quả + file
    const files = JSON.stringify(h.files || []);
    wtHits_(ss).forEach(function (x) {
      if (x.key === h.key || wtBare_(x.no) !== wtBare_(h.no) || [WT.ST.WAIT, WT.ST.WORK, WT.ST.ERR].indexOf(x.status) < 0) return;
      sh.getRange(x.row, 7).setValue(JSON.stringify(Object.assign({}, x.info, info)));
      sh.getRange(x.row, 11, 1, 2).setValues([[st, files]]);
      sh.getRange(x.row, 15, 1, 2).setValues([[wtS_(p.note).slice(0, 500), st === WT.ST.ERR ? '' : wtNow_()]]);
    });
  } finally { lock.releaseLock(); }
  wtBotLog_(ss, p.bot, h.key, 'done', st, p.note);
  let sumN = 0;
  try {
    const docs = (typeof p.docs === 'string' ? wtJson_(p.docs, []) : (p.docs || [])).filter(function (d) { return !(d.agent && p._agDone && p._agDone[d.name]); });
    const inf = typeof p.info === 'string' ? wtJson_(p.info, {}) : (p.info || {});
    sumN = wtdSumWrite_(h, inf, docs);
  } catch (e) { Logger.log('wtdSumWrite_: ' + e.message); wtBotLog_(ss, p.bot, h.key, 'sum', 'lỗi', e.message); }
  if (st === WT.ST.DONE) {
    const fresh = wtHits_(ss).filter(function (x) { return x.key === h.key; })[0] || h;
    const W = wtWatches_(ss), feed = [];
    fresh.watchers.forEach(function (m) {
      const w = W.filter(function (x) { return x.mail === m; })[0];
      if (!w) return;
      feed.push(wtFeedRow_(w.pic, 'files', 'Đã tải hồ sơ: ' + fresh.name, WT.TYPES[fresh.type] + ' · ' + fresh.investor + ' · ' + fresh.no + ' · ' + (fresh.files || []).length + ' file',
        WT.APP_URL + '#g=' + encodeURIComponent(fresh.key)));
    });
    wtFeed_(feed);
  }
  return { ok: true, status: st, sum: sumN, sumUrl: wtdSumUrl_() };
}
