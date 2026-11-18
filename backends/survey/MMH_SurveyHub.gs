/**
 * MMH_SurveyHub.gs v1.0 (18/11/2026) — MMH Survey: MỘT NGUỒN cho mọi kết quả khảo sát + phân loại Surgical / Dental → sản phẩm.
 * Người dùng yêu cầu 18/11/2026: rà mọi kết quả khảo sát trên Drive, gom về folder "Product Survey" (Shared drive), chia theo nhóm
 * sản phẩm (Surgical / Dental) rồi theo sản phẩm, app MMH Survey lọc / xem theo cây đó.
 *
 * Folder gốc RSH.ROOT = "Product Survey":  <Nhóm>/<Sản phẩm>/<file>
 *   - file = Google Form, Google Sheet kết quả, file .xlsx (tự chuyển sang Google Sheet 1 lần) hoặc LỐI TẮT tới form / Sheet ở nơi khác.
 *   - Nhóm lấy từ tên folder cấp 1 (Surgical / Dental / Khác), sản phẩm = tên folder cấp 2 (thiếu ⇒ "Chung").
 *   - rshSync_: đi hết cây ⇒ khảo sát chưa có trong app thì thêm (Nguồn = drive), có rồi thì lấy nhóm / sản phẩm theo folder
 *     (trừ khi người dùng đã đổi trong app — Nguồn = app). Chạy ở rsTick (20 phút / lần) và rsList (≤ 1 lần / 15 phút).
 *   - rsSet (app): đổi nhóm / sản phẩm ⇒ CHUYỂN file / lối tắt sang đúng folder (thiếu thì tạo lối tắt).
 *   - rsScan (khoá SV_KEY hoặc Admin): quét MỌI Google Form + Sheet tên "khảo sát / survey / phản hồi…" mà máy chủ (mmh.product) mở được
 *     ⇒ op=dry: chỉ liệt kê + đề xuất phân loại; op=run: thêm vào app + tạo lối tắt trong Product Survey. Bỏ bài kiểm tra, form thử, form trống, form đăng ký.
 *     Chạy theo từng đoạn: off / n (danh sách ứng viên đệm 30 phút).
 * Phân loại tự động theo tên (rsClassify_) chỉ dùng khi chưa có folder / người dùng chưa chọn.
 */
var RSH = {
  VER: '1.0',
  ROOT: '1EAjHy69_BgIDfauTE3LlljCtnYHwL3sN',
  GROUPS: ['Surgical', 'Dental', 'Khác'],
  PRODUCTS: {
    'Surgical': ['Dao nhãn khoa', 'Chỉ khâu nhãn khoa', 'Móc mở vùng bè', 'Kìm vi phẫu', 'Trocar', 'Manipler (ghim da)', 'Eyeless', 'Chung'],
    'Dental': ['Trâm nội nha (JIZAI)', 'Mũi khoan (DIA-BURS)', 'Vật liệu MMG', 'Chỉ khâu nha khoa', 'IPR', 'Chung'],
    'Khác': ['Chung']
  },
  /* thứ tự quan trọng: sản phẩm cụ thể trước, "Chung" sau (so trên tên đã bỏ dấu) */
  RULES: [
    ['Surgical', 'Chung', /(glocom|glaucom).*(dich kinh|vong mac|dkvm)|(dich kinh|vong mac|dkvm).*(glocom|glaucom)/],
    ['Dental', 'Chỉ khâu nha khoa', /(chi khau|suture).*(nha khoa|dental)|(nha khoa|dental).*(chi khau|suture)/],
    ['Surgical', 'Móc mở vùng bè', /trabecul|\bhook\b|moc mo vung be|glocom|glaucom/],
    ['Surgical', 'Kìm vi phẫu', /forcep|kim vi phau|kep vi phau|dung cu vi phau|\bdkvm\b|dich kinh.{0,4}vong mac|vitreo/],
    ['Surgical', 'Manipler (ghim da)', /manipler|ghim da|stapler/],
    ['Surgical', 'Trocar', /trocar/],
    ['Surgical', 'Eyeless', /eyeless/],
    ['Surgical', 'Chỉ khâu nhãn khoa', /chi khau|suture|chi tham my|chi phau thuat/],
    ['Surgical', 'Dao nhãn khoa', /\bdao\b|knife|keratome|\bmsl\d*|\bmcu\d*|\blri\b|\bmvr\d*|crescent|\bslit\b/],
    ['Dental', 'Trâm nội nha (JIZAI)', /jizai|\btram\b|endo|noi nha|\bfiles?\b|niti/],
    ['Dental', 'Mũi khoan (DIA-BURS)', /\bburs?\b|mui khoan|dia-?burs/],
    ['Dental', 'IPR', /\bipr\b/],
    ['Dental', 'Vật liệu MMG', /composite|\bbond\b|tay trang|bleach|\bmmg\b|zirconia|primer|cement|vat lieu|\blab\b|labo/],
    ['Dental', 'Chung', /nha khoa|dental|rang ham mat|\brhm\b|nha si|\brang\b|nha chu|phuc hinh|implant|noi nha|gutta|\bgps?\b|mo mem/],
    ['Surgical', 'Chung', /nhan khoa|\bmat\b|ophthal|\bvos\b|apsoprs|tao hinh|oculo|mi mat|phau thuat|ngoai khoa|surgical/]
  ],
  SKIP: /bai kiem tra|kiem tra sau dao tao|\bquiz\b|\btest\b|\bthu nghiem\b|\(thu\)|ban sao|copy of|untitled|khong co tieu de|bieu mau khong co tieu de|\bmau\b/,
  REG: /dang ky|dang ki|registration|register|xac nhan tham du/,
  SURV: /khao sat|survey|phieu|y kien|danh gia|feedback|nhu cau|thoi quen|trai nghiem|questionnaire/,
  SHORTCUT: 'application/vnd.google-apps.shortcut',
  FORM: 'application/vnd.google-apps.form',
  SHEET: 'application/vnd.google-apps.spreadsheet',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function rshNk_(s) { return rsS_(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(); }
function rsClassify_(title) {
  var t = rshNk_(title);
  for (var i = 0; i < RSH.RULES.length; i++) if (RSH.RULES[i][2].test(t)) return { grp: RSH.RULES[i][0], prod: RSH.RULES[i][1] };
  return { grp: 'Khác', prod: 'Chung' };
}
function rshGrpOf_(name) {
  var t = rshNk_(name);
  if (/surg|ngoai khoa|nhan khoa|ophthal/.test(t)) return 'Surgical';
  if (/dent|nha khoa/.test(t)) return 'Dental';
  return 'Khác';
}
function rshGrpNorm_(g) { var x = rsS_(g); return RSH.GROUPS.indexOf(x) >= 0 ? x : rshGrpOf_(x); }

/* ---------- cây thư mục Product Survey ---------- */
function rshRoot_() { return DriveApp.getFolderById(RSH.ROOT); }
function rshSub_(f, name) { var it = f.getFoldersByName(name); return it.hasNext() ? it.next() : f.createFolder(name); }
function rshFolder_(grp, prod) { var g = rshSub_(rshRoot_(), rshGrpNorm_(grp)); return rshSub_(g, rsS_(prod) || 'Chung'); }
function rshWalk_() {
  var out = [];
  (function walk(folder, path) {
    var it = folder.getFiles();
    while (it.hasNext()) {
      var f = it.next(), mt = f.getMimeType(), w = { id: f.getId(), name: f.getName(), sc: false, tid: f.getId(), tmt: mt, path: path, parent: folder.getId() };
      if (mt === RSH.SHORTCUT) { try { w.tid = f.getTargetId(); w.tmt = f.getTargetMimeType(); w.sc = true; } catch (x) { continue; } }
      out.push(w);
    }
    if (path.length < 3) { var fi = folder.getFolders(); while (fi.hasNext()) { var s = fi.next(); walk(s, path.concat([s.getName()])); } }
  })(rshRoot_(), []);
  return out;
}
function rshMove_(id, from, to) { Drive.Files.update({}, id, null, { addParents: to, removeParents: from, supportsAllDrives: true }); }
function rshTrash_(id) { Drive.Files.update({ trashed: true }, id, null, { supportsAllDrives: true }); }
/** đặt khảo sát e vào Product Survey/<nhóm>/<sản phẩm>: chuyển file thật / lối tắt có sẵn, thiếu thì tạo lối tắt (tới Sheet kết quả, không có thì tới form) */
function rshPlace_(e, W) {
  var want = rshFolder_(e.grp || 'Khác', e.prod || 'Chung').getId(), ids = [e.sheetId, e.formId].filter(function (x) { return x; });
  var hits = (W || rshWalk_()).filter(function (w) { return ids.indexOf(w.tid) >= 0; });
  var real = hits.filter(function (w) { return !w.sc; }), scs = hits.filter(function (w) { return w.sc; }), moved = 0;
  real.forEach(function (w) { if (w.parent !== want) { rshMove_(w.id, w.parent, want); w.parent = want; moved++; } });
  if (real.length) { scs.forEach(function (w) { rshTrash_(w.id); }); return moved ? 'chuyển file' : 'đúng chỗ'; }
  if (scs.length) {
    var s0 = scs[0]; if (s0.parent !== want) { rshMove_(s0.id, s0.parent, want); s0.parent = want; moved++; }
    scs.slice(1).forEach(function (w) { rshTrash_(w.id); });
    return moved ? 'chuyển lối tắt' : 'đúng chỗ';
  }
  var tgt = e.sheetId || e.formId;
  var f = Drive.Files.create({ name: rsS_(e.title).slice(0, 200) || tgt, mimeType: RSH.SHORTCUT, shortcutDetails: { targetId: tgt }, parents: [want] }, null, { supportsAllDrives: true });
  if (W) W.push({ id: f.id, name: f.name, sc: true, tid: tgt, tmt: '', path: [rshGrpNorm_(e.grp), e.prod], parent: want });
  return 'tạo lối tắt';
}
/** file .xlsx trong Product Survey ⇒ bản Google Sheet cạnh đó (1 lần; nhớ ở Script Property RSX_<id>) */
function rshXlsx_(w) {
  var P = PropertiesService.getScriptProperties(), k = 'RSX_' + w.tid, id = P.getProperty(k);
  if (id) { try { if (!DriveApp.getFileById(id).isTrashed()) return id; } catch (x) {} }
  var base = rsS_(w.name).replace(/\.xlsx?$/i, '');
  var f = Drive.Files.copy({ name: base, mimeType: RSH.SHEET, parents: [w.parent] }, w.tid, { supportsAllDrives: true });
  P.setProperty(k, f.id); P.setProperty('RSXR_' + f.id, w.tid); return f.id;
}

/* ---------- đồng bộ Product Survey ⇒ danh sách app ---------- */
function rshSync_() {
  var W = rshWalk_(), L = rsRead_(), by = {}, rep = { files: W.length, added: 0, updated: 0, conv: 0, skip: [] };
  L.forEach(function (e) { if (e.formId) by[e.formId] = e; if (e.sheetId) by[e.sheetId] = e; });
  var conv = {};
  W.forEach(function (w) { if (!w.sc && (w.tmt === RSH.XLSX || /\.xlsx$/i.test(w.name))) { try { conv[rshXlsx_(w)] = 1; rep.conv++; } catch (x) { rep.skip.push(w.name + ': ' + x.message); } } });
  if (rep.conv) W = rshWalk_();
  W.forEach(function (w) {
    if (w.tmt !== RSH.FORM && w.tmt !== RSH.SHEET) return;
    var e = by[w.tid];
    var cls = w.path.length ? { grp: rshGrpOf_(w.path[0]), prod: w.path[1] || 'Chung' } : null;
    if (!e) {
      var r; try { r = rsResolve_(w.tid); } catch (x) { rep.skip.push(w.name + ': ' + x.message); return; }
      e = by[r.formId] || by[r.sheetId];
      if (!e) {
        if (!cls) cls = rsClassify_(r.title);
        var n = 0; try { n = rsCount_(r).n; } catch (x) {}
        e = rsAppend_({ id: r.id, formId: r.formId, sheetId: r.sheetId, title: r.title, by: 'Product Survey', at: new Date().toISOString(), watch: [], told: n, hidden: false, grp: cls.grp, prod: cls.prod, src: 'drive' });
        if (e.formId) by[e.formId] = e; if (e.sheetId) by[e.sheetId] = e; rep.added++; return;
      }
    }
    if (cls && e.src !== 'app' && (e.grp !== cls.grp || e.prod !== cls.prod)) { e.grp = cls.grp; e.prod = cls.prod; e.src = 'drive'; rsWriteRow_(e); rep.updated++; }
    if (!w.path.length && !e.hidden) { try { rshPlace_(e, W); rep.placed = (rep.placed || 0) + 1; rshXlsxFollow_(w.tid, W); } catch (x) { rep.skip.push(w.name + ': ' + x.message); } }
  });
  PropertiesService.getScriptProperties().setProperty('RSH_LAST', JSON.stringify({ at: new Date().toISOString(), files: rep.files, added: rep.added, updated: rep.updated, conv: rep.conv }));
  return rep;
}
/* file .xlsx gốc đi theo bản Google Sheet đã chuyển (cùng folder) */
function rshXlsxFollow_(sheetId, W) {
  var x = PropertiesService.getScriptProperties().getProperty('RSXR_' + sheetId); if (!x) return;
  var s = null, o = null; W.forEach(function (w) { if (w.tid === sheetId && !w.sc) s = w; if (w.tid === x && !w.sc) o = w; });
  if (s && o && o.parent !== s.parent) { rshMove_(o.id, o.parent, s.parent); o.parent = s.parent; }
}
/* Admin / khoá: đặt phân loại cho nhiều file một lần — set = "id:Nhóm:Sản phẩm;id:…" (id = form hoặc Sheet) */
function rshSetMany_(spec) {
  var L = rsRead_(), W = rshWalk_(), out = [];
  String(spec || '').split(';').forEach(function (part) {
    var a = part.split(':'); if (a.length < 3) return;
    var id = rsS_(a[0]), g = rshGrpNorm_(a[1]), pr = rsS_(a.slice(2).join(':')) || 'Chung', e = null;
    L.forEach(function (x) { if (!e && (x.formId === id || x.sheetId === id)) e = x; });
    if (!e) { out.push(id.slice(0, 10) + '|không có trong app'); return; }
    e.grp = g; e.prod = pr; e.src = 'app'; rsWriteRow_(e);
    var pl = ''; try { pl = rshPlace_(e, W); } catch (x) { pl = 'lỗi: ' + x.message; }
    out.push(id.slice(0, 10) + '|' + g + '/' + pr + '|' + pl + '|' + rsS_(e.title).slice(0, 50));
  });
  return out;
}
function rshSyncLazy_() {
  var c = CacheService.getScriptCache(); if (c.get('rsh_sync')) return; c.put('rsh_sync', '1', 900);
  var lock = LockService.getScriptLock(); if (!lock.tryLock(3000)) return;
  try { rshSync_(); } catch (x) { console.warn('rshSyncLazy_: ' + x.message); } finally { lock.releaseLock(); }
}

/* ---------- quét toàn bộ Drive mà máy chủ mở được ---------- */
function rshList_(q, kind) {
  var out = [], tok = null;
  do {
    var r = Drive.Files.list({ q: q, corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true, pageSize: 200,
      pageToken: tok || undefined, orderBy: 'modifiedTime desc', fields: 'nextPageToken,files(id,name,owners(emailAddress),modifiedTime)' });
    (r.files || []).forEach(function (f) { out.push({ id: f.id, k: kind, name: f.name, owner: f.owners && f.owners[0] ? rsLocal_(f.owners[0].emailAddress) : 'shared', mod: rsS_(f.modifiedTime).slice(0, 10) }); });
    tok = r.nextPageToken;
  } while (tok && out.length < 1500);
  return out;
}
function rshCandidates_() {
  var forms = rshList_("mimeType='" + RSH.FORM + "' and trashed=false", 'form');
  var words = ['khảo sát', 'Khảo sát', 'KHẢO SÁT', 'khao sat', 'survey', 'Survey', 'phản hồi', 'Phản hồi', 'câu trả lời', 'Câu trả lời', 'Responses', 'responses', 'feedback', 'Feedback'];
  var sheets = rshList_("mimeType='" + RSH.SHEET + "' and trashed=false and (" + words.map(function (w) { return "name contains '" + w + "'"; }).join(' or ') + ')', 'sheet');
  var seen = {}; return forms.concat(sheets).filter(function (c) { if (seen[c.id]) return false; seen[c.id] = 1; return true; });
}
/* lọc nhanh theo tên file trên Drive (không cần mở form) */
function rshPre_(name) {
  var t = rshNk_(name).replace(/\((cau tra loi|responses|ket qua|phan hoi)\)/g, '');
  if (RSH.SKIP.test(t)) return 'bài kiểm tra / thử';
  if (!RSH.SURV.test(t)) return RSH.REG.test(t) ? 'form đăng ký' : 'không phải khảo sát';
  if (RSH.REG.test(t) && !/khao sat|survey/.test(t)) return 'form đăng ký';
  return '';
}
function rshSkip_(row) {
  var t = rshNk_(row.title || row.name);
  if (!row.err) { var pre = rshPre_(row.title || row.name); if (pre) return pre; }
  if (row.err) return 'không mở được';
  if (row.quiz || RSH.SKIP.test(t)) return 'bài kiểm tra / thử';
  if (RSH.REG.test(t) && !/khao sat|survey/.test(t)) return 'form đăng ký';
  if (!(row.n > 0)) return 'chưa có câu trả lời';
  if (row.k === 'sheet' && row.cols < 3) return 'không phải bảng khảo sát';
  if (row.dupForm) return 'đã có form';
  if (row.sys) return 'file hệ thống';
  return '';
}
function rshScan_(p) {
  var t0 = Date.now(), off = Math.max(0, +p.off || 0), n = Math.max(1, Math.min(80, +p.n || 30)), run = p.op === 'run', C = CacheService.getScriptCache();
  var cand = null; if (off > 0) { try { cand = JSON.parse(C.get('rsh_scan') || 'null'); } catch (x) {} }
  if (!cand) { cand = rshCandidates_(); try { C.put('rsh_scan', JSON.stringify(cand), 1800); } catch (x) {} }
  var formIds = {}; cand.forEach(function (c) { if (c.k === 'form') formIds[c.id] = 1; });
  var sys = {}; try { sys[svLogSheet_().getParent().getId()] = 1; } catch (x) {}
  var sync = null; if (run && off === 0) { try { sync = rshSync_(); } catch (x) { sync = { err: x.message }; } }
  var L = rsRead_(), have = {}; L.forEach(function (e) { if (e.formId) have[e.formId] = e; if (e.sheetId) have[e.sheetId] = e; });
  var W = run ? rshWalk_() : null, out = [], i;
  for (i = off; i < cand.length && i < off + n; i++) {
    if (Date.now() - t0 > 240000) break;
    var c = cand[i], row = { k: c.k, id: c.id, name: c.name, owner: c.owner, mod: c.mod };
    var pre = rshPre_(c.name);
    if (pre && !have[c.id]) { row.skip = pre; var pc = rsClassify_(c.name); row.grp = pc.grp; row.prod = pc.prod; out.push(row); continue; }
    try {
      if (c.k === 'form') {
        var f = FormApp.openById(c.id), dest = '';
        try { if (f.getDestinationType() === FormApp.DestinationType.SPREADSHEET) dest = f.getDestinationId(); } catch (x) {}
        row.title = f.getTitle() || c.name; row.quiz = f.isQuiz(); row.sheet = dest;
        row.n = dest ? rsCount_({ id: 'f:' + c.id, formId: c.id, sheetId: dest }).n : f.getResponses().length;
      } else {
        var ss = SpreadsheetApp.openById(c.id), fu = ''; try { fu = ss.getFormUrl() || ''; } catch (x) {}
        var m = /\/forms\/d\/(?:e\/)?([\w-]{20,})/.exec(fu); if (m && formIds[m[1]]) row.dupForm = 1;
        if (fu) { try { var lf = FormApp.openByUrl(fu); if (formIds[lf.getId()]) row.dupForm = 1; } catch (x) {} }
        var sh = rsRespSheet_(ss, ''); row.title = ss.getName(); row.n = Math.max(0, sh.getLastRow() - 1); row.cols = sh.getLastColumn(); row.sys = !!sys[c.id];
      }
    } catch (x) { row.err = String(x && x.message || x).slice(0, 80); }
    var ex = have[c.id] || (row.sheet && have[row.sheet]);
    var cls = ex && ex.grp ? { grp: ex.grp, prod: ex.prod } : rsClassify_(row.title || c.name);
    row.grp = cls.grp; row.prod = cls.prod; row.skip = rshSkip_(row); row.inApp = ex ? (ex.hidden ? 'ẩn' : 'có') : '';
    if (run && !row.skip) {
      try {
        var e = ex;
        if (!e) {
          var r = c.k === 'form' ? { id: 'f:' + c.id, formId: c.id, sheetId: row.sheet || '', title: row.title } : rsResolve_(c.id);
          e = rsAppend_({ id: r.id, formId: r.formId, sheetId: r.sheetId, title: r.title, by: 'Rà soát Drive', at: new Date().toISOString(), watch: [], told: row.n, hidden: false, grp: cls.grp, prod: cls.prod, src: 'scan' });
          if (e.formId) have[e.formId] = e; if (e.sheetId) have[e.sheetId] = e; row.added = 1;
        } else if (!e.grp) { e.grp = cls.grp; e.prod = cls.prod; e.src = 'scan'; rsWriteRow_(e); }
        if (!e.hidden) row.place = rshPlace_(e, W);
      } catch (x) { row.place = 'lỗi: ' + String(x && x.message || x).slice(0, 80); }
    }
    out.push(row);
  }
  var next = i < cand.length ? i : null;
  var brief = p.brief === '1';
  return { ok: true, v: RSH.VER, op: run ? 'run' : 'dry', total: cand.length, forms: Object.keys(formIds).length, off: off, next: next, sync: sync,
    skipped: out.filter(function (r) { return r.skip; }).length,
    items: out.filter(function (r) { return !brief || !r.skip || r.n > 0; }).map(function (r) {
      return [r.k === 'form' ? 'F' : 'S', r.n == null ? '?' : r.n, r.grp + '/' + r.prod, r.skip || 'OK', r.inApp || '-', r.owner, r.mod, rsS_(r.title || r.name).slice(0, 70), r.place || '', r.id].join('|');
    }) };
}

/* ---------- đọc khảo sát chỉ có Sheet (không có / không mở được Google Form) ---------- */
function rsTs_(v) {
  if (v instanceof Date) return v.getTime();
  var s = rsS_(v), m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
  return 0;
}
/* câu chọn nhiều của Google Form nối bằng ", " — mảnh bắt đầu bằng chữ thường là phần tiếp của lựa chọn trước (lựa chọn có dấu phẩy) */
function rsSplit_(v) {
  var out = [];
  String(v).split(', ').forEach(function (p) {
    p = p.trim(); if (!p) return;
    var ch = p.charAt(0), cont = ch.toLowerCase() === ch && ch.toUpperCase() !== ch;
    if (out.length && cont) out[out.length - 1] += ', ' + p; else out.push(p);
  });
  return out;
}
function rsSheetData_(e, me, cnt, pii) {
  var ss = SpreadsheetApp.openById(e.sheetId), sh = rsRespSheet_(ss, e.formId), lr = sh.getLastRow(), lc = sh.getLastColumn();
  var base = { ok: true, v: RS.VER, id: e.id, title: e.title || ss.getName(), n: 0, last: cnt.last, pii: pii, formUrl: '', editUrl: '',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/' + e.sheetId + '/edit', accepting: false, src: 'sheet', questions: [], answers: [] };
  if (lr < 2 || lc < 1) return base;
  var hr = rsHeadRow_(sh); if (lr <= hr) return base;
  var V = sh.getRange(hr, 1, lr - hr + 1, lc).getValues(), H = V.shift().map(rsS_);
  V = V.filter(function (r) { return r.some(function (x) { return rsS_(x) !== ''; }); });
  var tc = -1; H.forEach(function (h, i) { if (tc < 0 && /^(timestamp|dấu thời gian|thời gian|ngày giờ|ngày gửi|submitted at)$/i.test(h)) tc = i; });
  if (tc < 0 && V.length && rsTs_(V[0][0])) tc = 0;
  var fb = 0; try { fb = DriveApp.getFileById(e.sheetId).getLastUpdated().getTime(); } catch (x) {}
  var TS = V.map(function (r) { return tc >= 0 ? (rsTs_(r[tc]) || fb) : fb; });
  var Q = [], cols = [], MULTI = /có thể chọn nhiều|chọn nhiều|chọn tối đa|chọn \d+\s*[–-]\s*\d+|chọn đúng \d+|select all|multiple/i;
  for (var c = 0; c < H.length; c++) {
    if (c === tc) continue;
    var vals = V.map(function (r) { return rsS_(r[c]); }), filled = vals.filter(function (x) { return x !== ''; });
    if (!filled.length || !H[c]) continue;
    var gm = /^(.*\S)\s*\[(.+)\]\s*$/.exec(H[c]);
    if (gm) {  // câu dạng lưới: "Câu 5 … [Hàng]"
      var stem = gm[1], g = Q.length && Q[Q.length - 1].t === 'grid' && Q[Q.length - 1]._stem === stem ? Q[Q.length - 1] : null;
      if (!g) { g = { k: Q.length, q: stem, grp: '', sec: '', t: 'grid', rows: [], cols: [], _stem: stem, _c: [], pii: false }; Q.push(g); }
      g.rows.push(gm[2]); g._c.push(c);
      filled.forEach(function (x) { if (g.cols.indexOf(x) < 0) g.cols.push(x); });
      continue;
    }
    var q = { k: Q.length, q: H[c], grp: '', sec: '', t: 'text', opts: [], other: false, pii: RS.PII.test(H[c]), _c: c };
    if (!q.pii) {
      var withComma = filled.filter(function (x) { return x.indexOf(', ') > 0; }).length, tok = {};
      if (MULTI.test(H[c]) || withComma >= Math.max(2, filled.length * 0.3)) {
        filled.forEach(function (x) { rsSplit_(x).forEach(function (t) { tok[t] = (tok[t] || 0) + 1; }); });
        var tk = Object.keys(tok), rep = tk.filter(function (t) { return tok[t] > 1; }).length;
        if (MULTI.test(H[c]) || (tk.length <= 30 && rep >= Math.min(3, tk.length))) {
          q.t = 'checkbox'; q.opts = tk.filter(function (t) { return tok[t] > 1 || tk.length <= 12; }).sort(function (a, b) { return tok[b] - tok[a]; });
        }
      }
      if (q.t === 'text') {
        var dc = {}; filled.forEach(function (x) { dc[x] = (dc[x] || 0) + 1; });
        var ds = Object.keys(dc), nums = ds.every(function (x) { return /^\d{1,2}$/.test(x); });
        if (nums && ds.length <= 11) {
          var lo = Math.min.apply(null, ds.map(Number)), hi = Math.max.apply(null, ds.map(Number));
          if (lo >= 1 && hi <= 5) { lo = 1; hi = 5; } else if (lo >= 0 && hi <= 10) { lo = Math.min(lo, 1); hi = Math.max(hi, 5); }
          q.t = 'scale'; q.lo = lo; q.hi = hi; q.ll = ''; q.hl = ''; for (var s = lo; s <= hi; s++) q.opts.push(String(s));
        } else if ((ds.length <= 12 && ds.length <= Math.max(3, filled.length * 0.6)) || (ds.length <= 30 && ds.length <= filled.length * 0.4)) {
          q.t = 'radio'; q.opts = ds.filter(function (x) { return dc[x] > 1 || ds.length <= 12; }).sort(function (a, b) { return dc[b] - dc[a]; });
        }
      }
    }
    Q.push(q);
  }
  var A = V.map(function (r, ri) {
    var a = Q.map(function (q) {
      if (q.t === 'grid') { var g = q._c.map(function (cc) { var x = rsS_(r[cc]); return x === '' ? null : x; }); return g.some(function (x) { return x != null; }) ? g : null; }
      var x = rsS_(r[q._c]); if (x === '') return null;
      if (q.pii && !pii) return null;
      return q.t === 'checkbox' ? rsSplit_(x) : x;
    });
    return [TS[ri], a];
  }).sort(function (x, y) { return x[0] - y[0]; });
  Q.forEach(function (q) { delete q._c; delete q._stem; });
  base.questions = Q; base.answers = A; base.n = A.length;
  return base;
}
