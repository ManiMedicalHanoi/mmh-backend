/**
 * MMH – APP "DỰ TRÙ NPP" (web app cho nhân sự MMH) · v1.0 · 08/11/2026
 * App: ManiMedicalHanoi/MMH-FY67-Turnover ▸ du-tru/ (nhánh của Turnover, giao diện riêng).
 *
 * Web app CHỈ đọc / ghi cột A–G của 3 sheet dữ liệu trong file gốc (không đụng công thức, SUM, DASHBOARD…):
 *   1 Dự trù cố định   — NPP gửi cho tháng T = tháng hiện tại + lead (số cố định, NPP cam kết lấy hết)
 *   2 Đặt hàng thực tế — MMH cập nhật, mỗi lần đặt 1 dòng (đặt nhiều lần trong tháng)
 *   3 Đặt hàng dự kiến — nhu cầu thực tế nhìn từ bây giờ, sửa bất cứ lúc nào cho các tháng từ tháng hiện tại
 * Mọi phép tính (dự trù chưa đặt hàng, cảnh báo, đề xuất) làm trên app, cùng luật với sheet SUM / LÊN DỰ TRÙ.
 *
 * Đăng nhập: phiên email công ty do Training Hub ký (tk, khoá RH_Secret của Training Master — đọc bằng SpreadsheetApp,
 * không thêm quyền mới). Quyền: sheet "PHÂN QUYỀN APP" của file gốc (Admin sửa trên app); Admin / Director / HOD xem + sửa mọi NPP.
 *
 * Action (GET, JSONP được qua callback=): ping · dtBoot (tk) · dtLines (tk, npp, m) · dtAccess (tk, Admin)
 * v1.1 (09/11/2026, người dùng: app mở chậm): dtBoot gửi dạng gọn (fmt 2: mảng số [NPP, mã, tháng, SL] đã cộng theo NPP + tháng + mã,
 *   chỉ từ tháng 09 của kỳ trước), đọc sheet theo getLastRow, bỏ dòng đơn chi tiết (tải riêng bằng dtLines khi mở tab Đặt hàng thực tế),
 *   đệm kết quả 10 phút trong CacheService (nén gzip, chia khúc) — lưu từ app / dòng cuối sheet đổi ⇒ đệm mới; phiên đăng nhập đệm 30 phút.
 * Action (POST JSON text/plain hoặc GET): dtSave (tk, ops) · dtAccessSave (tk, Admin) · dtLog (tk, ghi nhật ký xuất / nhập Excel)
 */

const DW = {
  VERSION: '1.1 · 09/11/2026',
  SHEET_ID: '1lhc4c0-sSlLRRgJ5e8hzkZslzsyl3ZBXiPJ5BslfSX4',            // file gốc "Dự trù NPP Dashboard" (dự phòng khi không có getActive)
  MASTER_ID: '1byCL6NjhqBuEcd-K5pxYRrQj2XXs6GMIvR79x45mHRQ',          // Training Master (RH_Users + RH_Secret)
  ACL: 'PHÂN QUYỀN APP',
  ACL_HEAD: ['Người dùng (tên PIC hoặc email)', 'NPP được xem (ALL hoặc tên, cách nhau dấu phẩy)', 'Quyền (Xem / Sửa)', 'Ghi chú', 'Cập nhật lúc', 'Người cập nhật'],
  APPLOG: 'NHẬT KÝ APP DỰ TRÙ',
  APPLOG_HEAD: ['Thời điểm', 'Người thực hiện', 'Việc', 'NPP', 'Chi tiết', 'Số dòng'],
  SH: { dt: '1 Dự trù cố định', tt: '2 Đặt hàng thực tế', dk: '3 Đặt hàng dự kiến' },
  MAX_OPS: 3000,
  TTL: 600,                 // giây — đệm dữ liệu boot
  WHO_TTL: 1800
};


// =====================================================================================
// CỬA VÀO
// =====================================================================================
function doGet(e) {
  const p = (e && e.parameter) || {};
  return dwOut_(dwRoute_(p.action || 'ping', p), p.callback);
}

function doPost(e) {
  let p = {};
  try { if (e && e.postData && e.postData.contents) p = JSON.parse(e.postData.contents); } catch (x) { p = {}; }
  const q = (e && e.parameter) || {};
  Object.keys(q).forEach(function (k) { if (p[k] === undefined) p[k] = q[k]; });
  return dwOut_(dwRoute_(p.action || 'ping', p), q.callback);
}

function dwOut_(o, cb) {
  const s = JSON.stringify(o);
  if (cb && /^[A-Za-z_$][\w$.]{0,80}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + s + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function dwRoute_(action, p) {
  try {
    if (action === 'ping') return { ok: true, app: 'du-tru-npp', v: DW.VERSION };
    const me = dwWho_(p);
    if (me.err) return { ok: false, code: 'AUTH', error: me.err };
    if (action === 'dtBoot') return dwBoot_(me, p);
    if (action === 'dtSave') return dwSave_(me, p);
    if (action === 'dtLines') return dwLines_(me, p);
    if (action === 'dtAccess') return dwAccessList_(me);
    if (action === 'dtAccessSave') return dwAccessSave_(me, p);
    if (action === 'dtLog') return dwLogApi_(me, p);
    return { ok: false, error: 'Không có lệnh ' + action };
  } catch (e) {
    return { ok: false, error: msg_(e) };
  }
}

function dwSs_() {
  try { const a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a; } catch (e) {}
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('MASTER_ID') || DW.SHEET_ID);
}


// =====================================================================================
// ĐĂNG NHẬP (phiên email công ty do Training Hub ký) + QUYỀN
// =====================================================================================
function dwS_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function dwLocal_(e) { return dwS_(e).toLowerCase().split('@')[0]; }
function dwTrue_(v) { return v === true || /^(true|1|x|yes|có)$/i.test(dwS_(v)); }
function dwSame_(a, b) { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/** ⇒ { local, pic, level, admin, dept, title } hoặc { err } */
function dwWho_(p) {
  const NEED = 'App Dự trù NPP chỉ dành cho nhân sự MMH — đăng nhập bằng email công ty.';
  const tk = dwS_(p.tk), dot = tk.indexOf('.');
  if (dot < 10) return { err: NEED };
  const data = tk.substring(0, dot), sig = tk.substring(dot + 1);
  let t;
  try { t = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(data)).getDataAsString()); } catch (e) { return { err: 'Phiên đăng nhập không hợp lệ.' }; }
  if (!t || !t.x || Date.now() > t.x) return { err: 'Phiên đăng nhập đã hết hạn — đăng nhập lại.' };
  if (t.e && String(t.e).indexOf('@') >= 0 && !/@(manimedicalhanoi\.com|mani\.inc)$/i.test(String(t.e))) return { err: NEED };
  const c = CacheService.getScriptCache();
  const key = 'dww_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, tk)).slice(0, 40);
  try { const hit = c.get(key); if (hit) return JSON.parse(hit); } catch (e) {}
  let book;
  try { book = SpreadsheetApp.openById(DW.MASTER_ID); } catch (e) { return { err: 'Máy chủ chưa đọc được Training Master để kiểm phiên đăng nhập.' }; }
  const sec = book.getSheetByName('RH_Secret'), s = sec ? dwS_(sec.getRange(2, 1).getValue()) : '';
  const want = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, s)).replace(/=+$/, '');
  if (s.length < 32 || !dwSame_(sig, want)) return { err: 'Phiên đăng nhập không hợp lệ.' };
  const us = book.getSheetByName('RH_Users');
  const V = us ? us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 12).getValues() : [];
  let u = null;
  V.forEach(function (r) { if (dwLocal_(r[0]) && dwLocal_(r[0]) === dwLocal_(t.e)) u = r; });
  if (!u) return { err: 'Tài khoản không có trong danh sách người dùng (RH_Users).' };
  if (!(u[4] === '' || dwTrue_(u[4]))) return { err: 'Tài khoản đã bị khoá.' };
  if ((t.s || 1) !== Math.max(1, parseInt(u[5], 10) || 1)) return { err: 'Phiên đăng nhập đã bị đăng xuất từ xa.' };
  const me = { local: dwLocal_(t.e), pic: dwS_(u[1]), level: dwS_(u[2]).toLowerCase(), admin: dwTrue_(u[3]), dept: dwS_(u[10]), title: dwS_(u[11]) };
  try { c.put(key, JSON.stringify(me), DW.WHO_TTL); } catch (e) {}
  return me;
}

function dwAclSheet_(ss) {
  let sh = ss.getSheetByName(DW.ACL);
  if (!sh) {
    sh = ss.insertSheet(DW.ACL, ss.getSheets().length);
    sh.getRange(1, 1, 1, DW.ACL_HEAD.length).setValues([DW.ACL_HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.setFrozenRows(1);
    [220, 320, 110, 260, 130, 140].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange(2, 4).setNote('Admin / Giám đốc / Trưởng bộ phận (RH_Users) luôn xem + sửa mọi NPP. Người khác cần có dòng ở đây. "*" ở cột A = mọi nhân sự.');
  }
  return sh;
}

function dwAclRows_(ss) {
  const sh = dwAclSheet_(ss), n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  return sh.getRange(2, 1, n, DW.ACL_HEAD.length).getValues().map(function (r, i) {
    return { row: i + 2, who: dwS_(r[0]), npps: dwS_(r[1]), role: /sửa|sua|edit/i.test(dwS_(r[2])) ? 'edit' : 'view', note: dwS_(r[3]), at: fmtTime_(r[4]), by: dwS_(r[5]) };
  }).filter(function (x) { return x.who; });
}

/** Quyền của người đăng nhập: { all, npps[], edit, admin } */
function dwAccess_(ss, me, nppList) {
  const boss = me.admin || me.level === 'director' || me.level === 'hod';
  if (boss) return { all: true, npps: nppList.slice(), edit: true, admin: !!me.admin, boss: true };
  const mine = { local: me.local, pic: key_(me.pic) };
  let npps = {}, edit = false, hit = false;
  dwAclRows_(ss).forEach(function (r) {
    const w = r.who.toLowerCase();
    if (!(w === '*' || dwLocal_(w) === mine.local || key_(r.who) === mine.pic)) return;
    hit = true;
    if (r.role === 'edit') edit = true;
    if (/^(all|\*|tất cả)$/i.test(r.npps)) nppList.forEach(function (n) { npps[key_(n)] = n; });
    else r.npps.split(/[,;\n]/).forEach(function (n) {
      const k = key_(n);
      nppList.forEach(function (x) { if (key_(x) === k) npps[k] = x; });
    });
  });
  const list = nppList.filter(function (n) { return npps[key_(n)]; });
  return { all: list.length === nppList.length && hit, npps: list, edit: edit && list.length > 0, admin: false, none: !list.length };
}


// =====================================================================================
// ĐỌC: dtBoot
// =====================================================================================
/** Danh mục: mã, tên, nhóm, đơn giá (cột có chữ "giá" ở dòng tiêu đề) */
function dwCatalog_(ss) {
  const sh = sheet_(ss, CFG.SH.DM), last = sh.getLastRow(), nc = Math.max(3, Math.min(sh.getLastColumn(), 12));
  if (last < 2) return { list: [], cols: [] };
  const head = sh.getRange(1, 1, 1, nc).getValues()[0].map(norm_);
  let cPrice = -1;
  head.forEach(function (h, i) { if (cPrice < 0 && i >= 2 && /giá|price/i.test(h)) cPrice = i; });
  const seen = {}, list = [];
  sh.getRange(2, 1, last - 1, nc).getValues().forEach(function (r) {
    const c = codeStr_(r[0]);
    if (!c || seen[key_(c)]) return;
    seen[key_(c)] = 1;
    const pr = cPrice >= 0 ? num_(r[cPrice]) : null;
    list.push([c, norm_(r[1]), norm_(r[2]), typeof pr === 'number' && !isNaN(pr) ? pr : 0]);
  });
  return { list: list, head: head, price: cPrice >= 0 ? head[cPrice] : '' };
}

function dwHead_(sh) { return sh.getRange(1, 1, 1, CFG.NCOL).getValues()[0].map(norm_); }

/** Đọc cột A–G từ dòng 2 tới dòng cuối có dữ liệu (getLastRow — không đọc hàng nghìn dòng trống cuối sheet) */
function dwRead_(sh) {
  const last = sh.getLastRow();
  return last < 2 ? [] : sh.getRange(2, 1, last - 1, CFG.NCOL).getValues();
}

/** Gộp 1 sheet thành mảng số phẳng [iNPP, iMã, tháng−m0 (số tháng), SL, …] — cộng theo NPP + tháng + mã */
function dwPack_(vals, allow, m0, codeIx, codes) {
  const sum = {}, out = [];
  const base = Math.floor(m0 / 100) * 12 + (m0 % 100 - 1);
  vals.forEach(function (r) {
    const k = key_(r[0]);
    if (!allow.hasOwnProperty(k)) return;
    const m = toYm_(r[1]); if (!m || m < m0) return;
    const code = codeStr_(r[3]); if (!code) return;
    const q = num_(r[5]); if (typeof q !== 'number' || isNaN(q)) return;
    let ci = codeIx[key_(code)];
    if (ci === undefined) { ci = codeIx[key_(code)] = codes.length; codes.push([code, norm_(r[4]), 'Khác', 0]); }
    const mo = Math.floor(m / 100) * 12 + (m % 100 - 1) - base;
    const kk = allow[k] + '|' + ci + '|' + mo;
    if (sum.hasOwnProperty(kk)) out[sum[kk] + 3] += q;
    else { sum[kk] = out.length; out.push(allow[k], ci, mo, q); }
  });
  return out;
}

function dwGen_() { return PropertiesService.getScriptProperties().getProperty('DW_GEN') || '0'; }
function dwBump_() { try { PropertiesService.getScriptProperties().setProperty('DW_GEN', String(Date.now())); } catch (e) {} }
function dwCacheGet_(k) {
  const c = CacheService.getScriptCache(), head = c.get(k);
  if (!head) return null;
  const n = +head, parts = c.getAll(Array.apply(null, Array(n)).map(function (_, i) { return k + '_' + i; }));
  let b64 = '';
  for (let i = 0; i < n; i++) { if (!parts[k + '_' + i]) return null; b64 += parts[k + '_' + i]; }
  try { return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(b64), 'application/x-gzip')).getDataAsString(); } catch (e) { return null; }
}
function dwCachePut_(k, str) {
  try {
    const b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(str, 'application/json')).getBytes());
    const SZ = 90000, o = {}, n = Math.ceil(b64.length / SZ);
    if (n > 40) return;
    for (let i = 0; i < n; i++) o[k + '_' + i] = b64.substr(i * SZ, SZ);
    const c = CacheService.getScriptCache();
    c.putAll(o, DW.TTL); c.put(k, String(n), DW.TTL);
  } catch (e) {}
}

function dwBoot_(me, p) {
  const ss = dwSs_();
  const S = settings_(ss);
  const acc = dwAccess_(ss, me, S.npps);
  const base = { ok: true, v: DW.VERSION, me: { pic: me.pic, local: me.local, level: me.level, admin: !!me.admin },
    access: { all: acc.all, edit: acc.edit, admin: acc.admin }, npps: acc.npps };
  if (acc.none) return Object.assign(base, { ok: false, code: 'NOACCESS',
    error: 'Tài khoản ' + me.pic + ' chưa được cấp quyền xem dự trù NPP. Liên hệ Admin (sheet "' + DW.ACL + '" của file gốc).' });
  const shs = { dt: sheet_(ss, DW.SH.dt), tt: sheet_(ss, DW.SH.tt), dk: sheet_(ss, DW.SH.dk) };
  const sig = [dwGen_(), S.cm, shs.dt.getLastRow(), shs.tt.getLastRow(), shs.dk.getLastRow(), acc.npps.join('|')].join('~');
  const ck = 'dwb_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sig)).slice(0, 22);
  let data = null;
  const hit = p.fresh ? null : dwCacheGet_(ck);
  if (hit) { try { data = JSON.parse(hit); data.cacheHit = true; } catch (e) { data = null; } }
  if (!data) {
    const allow = {};
    acc.npps.forEach(function (n, i) { allow[key_(n)] = i; });
    const cat = dwCatalog_(ss), codes = cat.list.slice(), codeIx = {};
    codes.forEach(function (r, i) { codeIx[key_(r[0])] = i; });
    const m0 = addM_(fy_(S.cm) * 100 + 9, -12);          // từ tháng 09 của kỳ trước
    const files = {};
    try { regRows_(ss).forEach(function (r) { if (allow.hasOwnProperty(key_(r.npp))) files[r.npp] = { url: r.url, synced: fmtTime_(r.synced), result: r.result }; }); } catch (e) {}
    data = {
      fmt: 2, m0: m0, at: nowText_(),
      dt: dwPack_(dwRead_(shs.dt), allow, m0, codeIx, codes),
      dk: dwPack_(dwRead_(shs.dk), allow, m0, codeIx, codes),
      tt: dwPack_(dwRead_(shs.tt), allow, m0, codeIx, codes),
      cat: { list: codes, nCat: cat.list.length, head: cat.head, price: cat.price },
      head: { dt: dwHead_(shs.dt), tt: dwHead_(shs.tt), dk: dwHead_(shs.dk) },
      files: files, sheetUrl: acc.boss ? ss.getUrl() : ''
    };
    dwCachePut_(ck, JSON.stringify(data));
  }
  const day = +Utilities.formatDate(new Date(), tz_(), 'd');
  return Object.assign(base, data, {
    today: fmt_(new Date(), 'yyyy-MM-dd'),
    set: { cm: S.cm, lead: S.lead, T: S.T, fromDT: gFromDT_(S), day: day, hanDay: G.HAN_DAY, watch: S.watch, high: S.high, tbN: S.tbN }
  });
}

/** Các lần đặt hàng thực tế (sheet 2) của 1 NPP trong 1 tháng: [[dòng sheet, mã, SL, ngày, ghi chú], …] */
function dwLines_(me, p) {
  const ss = dwSs_(), S = settings_(ss), acc = dwAccess_(ss, me, S.npps);
  const npp = acc.npps.filter(function (n) { return key_(n) === key_(p.npp); })[0];
  if (!npp) return { ok: false, code: 'FORBIDDEN', error: 'Không có quyền xem NPP này.' };
  const m = toYm_(p.m); if (!m) return { ok: false, error: 'Thiếu tháng.' };
  const out = [];
  dwRead_(sheet_(ss, DW.SH.tt)).forEach(function (r, i) {
    if (key_(r[0]) !== key_(npp) || toYm_(r[1]) !== m) return;
    const q = num_(r[5]); if (typeof q !== 'number' || isNaN(q)) return;
    const c3 = r[2], note = dwS_(r[6]);
    out.push([i + 2, codeStr_(r[3]), q, Object.prototype.toString.call(c3) === '[object Date]' ? fmt_(c3, 'dd/MM/yyyy') : dwS_(c3),
      /^App Dự trù ·/.test(note) ? '' : note.replace(/ · App Dự trù ·.*$/, '').slice(0, 80)]);
  });
  return { ok: true, npp: npp, m: m, lines: out };
}


// =====================================================================================
// GHI: dtSave
//   ops = [{ s:'dk'|'dt', npp, m, code, q }]          — đặt số (thay mọi dòng cùng NPP + tháng + mã); q = null ⇒ xoá
//         [{ s:'tt', op:'add', npp, m, code, q, day, note }] — thêm 1 lần đặt hàng thực tế
//         [{ s:'tt', op:'del', npp, m, code, q, row }]       — xoá 1 dòng đặt hàng (kiểm lại NPP + tháng + mã + SL)
// =====================================================================================
function dwSave_(me, p) {
  let ops = p.ops;
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { ops = null; } }
  if (!Array.isArray(ops) || !ops.length) return { ok: false, error: 'Không có thay đổi nào để lưu.' };
  if (ops.length > DW.MAX_OPS) return { ok: false, error: 'Quá nhiều dòng trong 1 lần lưu (' + ops.length + ').' };
  const rid = dwS_(p.rid), cache = CacheService.getScriptCache();
  if (rid) { const done = cache.get('dwrid_' + rid); if (done) return JSON.parse(done); }
  const ss = dwSs_();
  const S = settings_(ss);
  const acc = dwAccess_(ss, me, S.npps);
  if (!acc.edit) return { ok: false, code: 'FORBIDDEN', error: 'Tài khoản ' + me.pic + ' chỉ được xem, chưa có quyền sửa.' };
  const allowed = {};
  acc.npps.forEach(function (n) { allowed[key_(n)] = n; });
  const fromDT = gFromDT_(S), cat = catalog_(ss);
  const lock = LockService.getDocumentLock();
  try { lock.waitLock(30000); } catch (e) { return { ok: false, code: 'BUSY', error: BUSY }; }
  try {
    const stamp = 'App Dự trù · ' + me.pic + ' · ' + nowText_();
    const res = { ok: true, n: { dt: 0, dk: 0, tt: 0 }, skipped: [], added: [] };
    ['dt', 'dk', 'tt'].forEach(function (s) {
      const mine = ops.filter(function (o) { return o && o.s === s; });
      if (!mine.length) return;
      const sh = sheet_(ss, DW.SH[s]);
      const head = dwHead_(sh);
      const rows = readBlock_(sh), oldLen = rows.length;
      const kill = {};
      let changed = false;
      mine.forEach(function (o, j) {
        const npp = allowed[key_(o.npp)], m = toYm_(o.m), code = codeStr_(o.code);
        const tag = s + ' ' + (o.npp || '') + ' ' + lbl_(m) + ' ' + code;
        if (!npp) { res.skipped.push(tag + ': không có quyền NPP này'); return; }
        if (!m || !code) { res.skipped.push(tag + ': thiếu tháng / mã'); return; }
        const q = o.q === null || o.q === '' || o.q === undefined ? null : qty_(o.q);
        if (q !== null && (typeof q !== 'number' || isNaN(q) || q < 0 || q % 1 !== 0)) { res.skipped.push(tag + ': số lượng không hợp lệ'); return; }
        if (s === 'dt' && m < fromDT && !acc.admin) { res.skipped.push(tag + ': tháng đã chốt dự trù (đang nhận từ ' + lbl_(fromDT) + ')'); return; }
        if (s === 'dk' && m < S.cm && !acc.admin) { res.skipped.push(tag + ': tháng đã qua'); return; }
        const name = (cat.map[key_(code)] && cat.map[key_(code)].name) || norm_(o.name) || '';
        if (s === 'tt') {
          if (o.op === 'del') {
            const i = (+o.row || 0) - 2;
            const r = rows[i];
            if (!r || key_(r[0]) !== key_(npp) || toYm_(r[1]) !== m || key_(codeStr_(r[3])) !== key_(code) || (num_(r[5]) || 0) !== (+o.q || 0)) {
              res.skipped.push(tag + ': dòng ' + o.row + ' đã thay đổi — tải lại rồi xoá'); return;
            }
            kill[i] = 1; changed = true; res.n.tt++;
            return;
          }
          if (q === null || q === 0) { res.skipped.push(tag + ': số lượng trống'); return; }
          rows.push([npp, m, dwThird_('tt', head, m, S, o), code, name, q, norm_(o.note) ? norm_(o.note) + ' · ' + stamp : stamp]);
          res.added.push({ j: j, row: rows.length + 1 });
          changed = true; res.n.tt++;
          return;
        }
        // dự trù / dự kiến: thay mọi dòng cùng NPP + tháng + mã bằng 1 dòng (q null ⇒ chỉ xoá; dự trù 0 = xoá)
        let first = -1;
        rows.forEach(function (r, i) {
          if (kill[i]) return;
          if (key_(r[0]) === key_(npp) && toYm_(r[1]) === m && key_(codeStr_(r[3])) === key_(code)) {
            if (first < 0) first = i; else kill[i] = 1;
          }
        });
        const keep = !(q === null || (s === 'dt' && q === 0));
        if (keep) {
          const line = [npp, m, dwThird_(s, head, m, S, o, first >= 0 ? rows[first][2] : ''), code, name, q, stamp];
          if (first >= 0) rows[first] = line; else rows.push(line);
        } else if (first >= 0) kill[first] = 1;
        changed = true; res.n[s]++;
      });
      if (!changed) return;
      const out = rows.filter(function (_, i) { return !kill[i]; });
      writeBlock_(sh, out, oldLen);
      res.added.forEach(function (a) { a.row -= Object.keys(kill).filter(function (k) { return +k < a.row - 2; }).length; });
    });
    SpreadsheetApp.flush();
    dwBump_();
    const total = res.n.dt + res.n.dk + res.n.tt;
    if (total) dwLog_(ss, me, 'Lưu từ app', dwS_(p.npp) || [...new Set(ops.map(function (o) { return o.npp; }))].join(', '),
      'Dự trù ' + res.n.dt + ' · dự kiến ' + res.n.dk + ' · thực tế ' + res.n.tt + (dwS_(p.why) ? ' · ' + dwS_(p.why) : '') +
      (res.skipped.length ? ' · bỏ qua ' + res.skipped.length : ''), total);
    res.at = nowText_();
    if (rid) { try { cache.put('dwrid_' + rid, JSON.stringify(res), 21600); } catch (e) {} }
    return res;
  } finally {
    lock.releaseLock();
  }
}

/** Cột C: sheet 1 = tháng gửi (yyyymm); sheet 2 = ngày đặt nếu tiêu đề có "ngày"; sheet 3 = thời điểm cập nhật nếu tiêu đề có "ngày / gửi / cập nhật". */
function dwThird_(s, head, m, S, o, old) {
  const h = (head[2] || '').toLowerCase();
  if (s === 'dt') return toYm_(o.sent) || (old && toYm_(old)) || (m >= gFromDT_(S) ? S.cm : addM_(m, -S.lead));
  if (s === 'tt') {
    if (/ngày|date/.test(h)) return dwS_(o.day) || fmt_(new Date(), 'dd/MM/yyyy');
    return old || '';
  }
  if (/ngày|date/.test(h)) return fmt_(new Date(), 'dd/MM/yyyy');
  if (/gửi|cập nhật|tháng nhập/.test(h)) return S.cm;
  return old === undefined ? '' : old;
}


// =====================================================================================
// PHÂN QUYỀN (Admin) + NHẬT KÝ
// =====================================================================================
function dwAccessList_(me) {
  if (!me.admin) return { ok: false, code: 'FORBIDDEN', error: 'Chỉ Admin xem / sửa phân quyền.' };
  const ss = dwSs_(), S = settings_(ss);
  let people = [];
  try {
    const us = SpreadsheetApp.openById(DW.MASTER_ID).getSheetByName('RH_Users');
    people = us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 12).getValues()
      .filter(function (r) { return dwS_(r[1]) && (r[4] === '' || dwTrue_(r[4])); })
      .map(function (r) { return { pic: dwS_(r[1]), local: dwLocal_(r[0]), level: dwS_(r[2]).toLowerCase(), admin: dwTrue_(r[3]), dept: dwS_(r[10]), title: dwS_(r[11]) }; });
  } catch (e) {}
  return { ok: true, rows: dwAclRows_(ss), people: people, npps: S.npps };
}

function dwAccessSave_(me, p) {
  if (!me.admin) return { ok: false, code: 'FORBIDDEN', error: 'Chỉ Admin sửa phân quyền.' };
  let rows = p.rows;
  if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch (e) { rows = null; } }
  if (!Array.isArray(rows)) return { ok: false, error: 'Thiếu danh sách quyền.' };
  const ss = dwSs_(), sh = dwAclSheet_(ss);
  const old = Math.max(0, sh.getLastRow() - 1);
  const vals = rows.filter(function (r) { return r && dwS_(r.who); }).map(function (r) {
    return [dwS_(r.who), dwS_(r.npps) || 'ALL', r.role === 'edit' ? 'Sửa' : 'Xem', dwS_(r.note), new Date(), me.pic];
  });
  if (old) sh.getRange(2, 1, old, DW.ACL_HEAD.length).clearContent();
  if (vals.length) sh.getRange(2, 1, vals.length, DW.ACL_HEAD.length).setValues(vals);
  dwLog_(ss, me, 'Phân quyền', '', vals.length + ' dòng', vals.length);
  return dwAccessList_(me);
}

function dwLogApi_(me, p) {
  const ss = dwSs_();
  const acc = dwAccess_(ss, me, settings_(ss).npps);
  if (acc.none) return { ok: false, code: 'FORBIDDEN', error: 'Không có quyền.' };
  dwLog_(ss, me, dwS_(p.what).slice(0, 60) || 'Ghi chú', dwS_(p.npp).slice(0, 60), dwS_(p.detail).slice(0, 400), +p.n || '');
  return { ok: true };
}

function dwLog_(ss, me, what, npp, detail, n) {
  try {
    let sh = ss.getSheetByName(DW.APPLOG);
    if (!sh) {
      sh = ss.insertSheet(DW.APPLOG, ss.getSheets().length);
      sh.getRange(1, 1, 1, DW.APPLOG_HEAD.length).setValues([DW.APPLOG_HEAD]).setFontWeight('bold').setBackground('#CFE2F3');
      sh.setFrozenRows(1);
      [130, 140, 140, 160, 520, 70].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    }
    sh.appendRow([new Date(), me.pic, what, npp, detail, n]);
  } catch (e) {}
}
