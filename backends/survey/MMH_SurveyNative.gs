/**
 * MMH_SurveyNative.gs v1.1 (18/11/2026; v1.1: mục tiêu khảo sát · thêm loại câu rating (sao) / date / number · mã QR PNG + SVG (MMH_QR.gs) ·
 *   task Report Hub Marketing tự tạo khi tạo khảo sát (dưới Key task sự kiện) · trang gửi email Marketing khao-sat/gui.html: nsInfo / nsMailSend ⇒ email trang trọng
 *   (To Thuong + Trang, CC Tuyen + Nguyen Ha — tra email theo RH_Users) kèm QR, link khảo sát, link kết quả ⇒ task Report Hub Completed) — HỆ THỐNG KHẢO SÁT RIÊNG CỦA MMH (không dùng Google Form), người dùng yêu cầu 18/11/2026:
 *   - Trang trả lời theo phong cách MANI (trang tĩnh GitHub Pages `Training-Hub/khao-sat/?s=<mã>`), kết quả vẫn ghi vào GOOGLE SHEET.
 *   - Bắt buộc trước câu hỏi: ① đồng ý xử lý dữ liệu cá nhân ② họ tên + số điện thoại (+ nơi công tác) ③ theo dõi page Facebook
 *     MANI Dental (khảo sát nha khoa) / MANI Ophthalmic (khảo sát nhãn khoa) — bấm nút ⇒ mở app Facebook ⇒ quay lại trang tự sang phần câu hỏi.
 *     Facebook KHÔNG cho trang web kiểm tra một người đã theo dõi page hay chưa ⇒ ghi lại "đã bấm mở page lúc …" + bác sĩ tự xác nhận.
 *   - Kho chung: mọi khảo sát nằm trong Shared drive "Product Survey" ▸ <Nhóm> ▸ <Sản phẩm> ▸ <yyyymmdd Sự kiện> (cùng cây của MMH_SurveyHub.gs),
 *     tự vào danh sách app MMH Survey (tab KẾT QUẢ KHẢO SÁT, Nguồn = mmh) và tab "NGƯỜI THAM GIA KHẢO SÁT" của file nhật ký (người đồng ý dữ liệu, mọi khảo sát).
 *
 * Mỗi khảo sát = 1 file Google Sheet: tab "Câu trả lời" (1 dòng / lượt) + tab ẨN "_SPEC" (bản mô tả + vị trí cột từng câu).
 * Mã khảo sát: Script Property NS_<mã> = {sheetId, title, at, by}; NSS_<sheetId> = <mã>.
 *
 * Công khai (trang khảo sát, fetch không kèm cookie):
 *   GET  ?action=nsMeta&s=<mã>                       ⇒ {ok, survey:{…câu hỏi, không có cấu hình nội bộ}, token}
 *   POST {action:"nsSubmit", s, token, info:{id:giá trị}, consent:{agree, opt:[bool]}, follow:{st:"opened"|"before"|"", at}, answers:{qid: giá trị}, hp:"", ua}
 *        ⇒ {ok, rid} | {ok:false, code:"DUP"|"CLOSED"|"REQ"|"TOKEN"|"BUSY", error}
 * Có khoá SV_KEY (Claude / workflow Kiểm tra / trang tao.html):
 *   POST {action:"nsCreate", key, spec | pz}          ⇒ {ok, code, url, sheetUrl, folderUrl, nq}
 *   POST {action:"nsUpdate", key, s, spec | pz}       ⇒ sửa câu hỏi, GIỮ link + dữ liệu (câu mới ⇒ cột mới cuối bảng; khớp câu cũ theo id rồi theo chữ)
 *   GET  ?action=nsSet&key=…&s=…&open=0|1             ⇒ đóng / mở nhận câu trả lời
 *   GET  ?action=nsList&key=…                         ⇒ mọi khảo sát (mã, tiêu đề, số câu trả lời, link)
 *   GET  ?action=nsGet&key=…&s=…                      ⇒ bản mô tả đang dùng (để sửa)
 *
 * spec (khảo sát bác sĩ) = {
 *   title, intro, minutes, confirmation,
 *   grp: "Dental" | "Surgical",  prod: "<sản phẩm>" (cây Product Survey; thiếu ⇒ "Chung"),
 *   event: {name, date:"yyyy-mm-dd"}  (lưu theo sự kiện: thư mục "<yyyymmdd> <tên>" + cột Sự kiện),
 *   page: "dental" | "ophthalmic" | "none"  (mặc định theo grp: Dental ⇒ dental, Surgical ⇒ ophthalmic), followRequired (mặc định true),
 *   consent: true | {title, text, agree:{q,v}, optional:[{q,v}]}  (mặc định SV_CONSENT của MMH_SurveyAPI.gs — luôn có, không tắt được),
 *   info: [{id, q, t:"text"|"phone"|"radio"|"list", options, required}]  (mặc định Họ và tên* · Số điện thoại* · Nơi công tác*), infoExtra: [...] (thêm sau mặc định),
 *   oncePerPhone (mặc định true: mỗi SĐT trả lời 1 lần), notify: ["email"] (email mỗi lượt trả lời), editors: ["email"],
 *   objective: "mục tiêu khảo sát" (người dùng duyệt; in trong email gửi Marketing), owner: "<PIC người tạo>" (thiếu ⇒ người đăng nhập trang tao.html),
 *   mail: {to:[PIC], cc:[PIC]} (mặc định NS.MAIL), task: false | {type, keyNo, keyName} (task Report Hub; mặc định tự tạo),
 *   sections: [{ id, title, help, go:"<id phần>"|"submit", questions: [ Q ] }]
 * }
 * Q = { id, t: "radio"|"checkbox"|"list"|"text"|"phone"|"paragraph"|"scale"|"grid"|"checkgrid"|"rating"|"date"|"number"|"header",
 *       q, help, options:[ "…" | {v, go:"<id phần>"|"next"|"submit"} ], other, required (mặc định true; paragraph / header false), max,
 *       low, high, lowLabel, highLabel, rows, cols, max (rating: số sao 3–10, mặc định 5), min / max (number) }
 */
var NS = {
  VER: '1.1',
  PAGE: 'https://manimedicalhanoi.github.io/Training-Hub/khao-sat/',
  TAB: 'Câu trả lời', SPEC_TAB: '_SPEC', PEOPLE_TAB: 'NGƯỜI THAM GIA KHẢO SÁT',
  PEOPLE_HEAD: ['Thời gian', 'Họ và tên', 'Số điện thoại', 'Nơi công tác', 'Khảo sát', 'Sự kiện', 'Nhóm', 'Đồng ý xử lý dữ liệu', 'Nhận thông tin từ MMH', 'Theo dõi page', 'Mã khảo sát', 'Mã lượt'],
  FB: {
    dental: { name: 'MANI Dental', url: 'https://www.facebook.com/share/1GQTtanSu9/', line: 'Cập nhật thông tin sản phẩm, hội thảo và kiến thức nha khoa' },
    ophthalmic: { name: 'MANI Ophthalmic', url: 'https://www.facebook.com/share/1KCCXDVW8x/', line: 'Cập nhật thông tin sản phẩm, hội thảo và kỹ thuật phẫu thuật nhãn khoa' }
  },
  TYPES: ['radio', 'checkbox', 'list', 'text', 'phone', 'paragraph', 'scale', 'grid', 'checkgrid', 'rating', 'date', 'number', 'header'],
  SEND: 'https://manimedicalhanoi.github.io/Training-Hub/khao-sat/gui.html',
  APP: 'https://manimedicalhanoi.github.io/mmh-library/survey/',
  HUB_URL: 'https://script.google.com/macros/s/AKfycbzn-5chMgO7lQPKmot8P7UkP9C40MdCPtiTTa4H1gcKepVsnr1IYfcB7sSdK1_jrZYY/exec',   // Report Hub ▸ marketing
  MAIL: { to: ['Thuong', 'Trang'], cc: ['Tuyen', 'Nguyen Ha'] },   // người dùng chọn 18/11/2026 (Trang ≠ Minh Trang)
  TZ: 'Asia/Ho_Chi_Minh', CHUNK: 45000
};

function nsS_(v) { return String(v == null ? '' : v).trim(); }
function nsKey_() { return PropertiesService.getScriptProperties().getProperty('SV_KEY') || SV.KEY; }
function nsSecret_() {
  var P = PropertiesService.getScriptProperties(), s = P.getProperty('NS_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); P.setProperty('NS_SECRET', s); }
  return s;
}
function nsSig_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, nsSecret_())).replace(/=+$/, '').slice(0, 24); }
function nsOpt_(o) { return typeof o === 'object' && o ? { v: nsS_(o.v), go: nsS_(o.go) } : { v: nsS_(o), go: '' }; }
function nsLink_(code) { return NS.PAGE + '?s=' + code; }

/* ---------- chuẩn hoá + kiểm tra bản mô tả ---------- */
function nsNorm_(spec, old) {
  if (!spec || !nsS_(spec.title)) throw new Error('SPEC: thiếu title');
  var grp = /dent|nha/i.test(nsS_(spec.grp)) ? 'Dental' : /surg|nhan|ophth|ngoai/i.test(nsS_(spec.grp)) ? 'Surgical' : '';
  if (!grp) grp = rsClassify_(spec.title + ' ' + nsS_(spec.prod)).grp;
  if (grp === 'Khác') throw new Error('SPEC: grp phải là "Dental" hoặc "Surgical" (để chọn page Facebook + thư mục Product Survey)');
  var page = nsS_(spec.page) || (grp === 'Dental' ? 'dental' : 'ophthalmic');
  if (page !== 'none' && !NS.FB[page]) throw new Error('SPEC: page phải là dental / ophthalmic / none');
  var ev = spec.event && typeof spec.event === 'object' ? { name: nsS_(spec.event.name), date: nsS_(spec.event.date) } : { name: nsS_(spec.event), date: '' };
  if (ev.date && !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) throw new Error('SPEC: event.date dạng yyyy-mm-dd');
  var c = Object.assign({}, SV_CONSENT, typeof spec.consent === 'object' && spec.consent ? spec.consent : {});
  var info = Array.isArray(spec.info) && spec.info.length ? spec.info : [
    { id: 'name', q: 'Họ và tên', t: 'text', required: true },
    { id: 'phone', q: 'Số điện thoại', t: 'phone', required: true },
    { id: 'work', q: 'Nơi công tác (bệnh viện / phòng khám)', t: 'text', required: true }
  ];
  info = info.concat(Array.isArray(spec.infoExtra) ? spec.infoExtra : []).map(function (x, i) {
    var t = nsS_(x.t) || 'text';
    if (['text', 'phone', 'radio', 'list'].indexOf(t) < 0) throw new Error('SPEC: info "' + x.q + '" loại ' + t + ' chưa hỗ trợ');
    return { id: nsS_(x.id) || 'i' + (i + 1), q: nsS_(x.q), t: t, required: x.required !== false, options: (x.options || []).map(function (o) { return nsOpt_(o).v; }), help: nsS_(x.help) };
  });
  if (!info.some(function (x) { return x.t === 'phone'; })) throw new Error('SPEC: info phải có 1 ô số điện thoại (t:"phone")');
  /* id câu hỏi: giữ id đã có; không có ⇒ khớp chữ câu cũ ⇒ id mới */
  var oldQ = {}, maxN = 0;
  ((old && old.sections) || []).forEach(function (s) { s.questions.forEach(function (q) { oldQ[q.q] = oldQ[q.q] || q.id; var m = /^q(\d+)$/.exec(q.id); if (m) maxN = Math.max(maxN, +m[1]); }); });
  var seen = {}, secIds = {};
  var secs = (spec.sections || []).map(function (s, si) {
    var id = nsS_(s.id) || 's' + (si + 1);
    if (secIds[id]) throw new Error('SPEC: trùng id phần ' + id); secIds[id] = 1;
    return { id: id, title: nsS_(s.title), help: nsS_(s.help), go: nsS_(s.go), questions: (s.questions || []).map(function (q) {
      var t = nsS_(q.t) || 'radio';
      if (NS.TYPES.indexOf(t) < 0) throw new Error('SPEC: loại câu "' + t + '" không có (' + nsS_(q.q).slice(0, 40) + ')');
      var o = { id: nsS_(q.id) || oldQ[nsS_(q.q)] || '', t: t, q: nsS_(q.q), help: nsS_(q.help) };
      if (!o.q) throw new Error('SPEC: có câu không có nội dung (phần ' + id + ')');
      if (t === 'header') o.id = o.id || 'h' + Utilities.getUuid().slice(0, 6);
      if (!o.id) { maxN++; o.id = 'q' + maxN; }
      while (seen[o.id]) { maxN++; o.id = 'q' + maxN; }
      seen[o.id] = 1;
      if (t !== 'header') o.required = q.required != null ? !!q.required : t !== 'paragraph';
      if (t === 'radio' || t === 'checkbox' || t === 'list') {
        o.options = (q.options || []).map(nsOpt_).filter(function (x) { return x.v; });
        if (o.options.length < 2 && !q.other) throw new Error('SPEC: câu "' + o.q.slice(0, 50) + '" cần ≥ 2 lựa chọn');
        o.other = !!q.other;
        if (t === 'checkbox' && q.max) o.max = Math.max(1, parseInt(q.max, 10) || 0);
        if (t === 'checkbox') o.options.forEach(function (x) { x.go = ''; });
      }
      if (t === 'scale') {
        o.low = parseInt(q.low != null ? q.low : 1, 10); o.high = parseInt(q.high != null ? q.high : 5, 10);
        if (!(o.high > o.low) || o.high - o.low > 10) throw new Error('SPEC: thang điểm câu "' + o.q.slice(0, 50) + '" sai');
        o.lowLabel = nsS_(q.lowLabel); o.highLabel = nsS_(q.highLabel);
      }
      if (t === 'rating') { o.max = Math.max(3, Math.min(10, parseInt(q.max, 10) || 5)); o.lowLabel = nsS_(q.lowLabel); o.highLabel = nsS_(q.highLabel); }
      if (t === 'number') { if (q.min != null && q.min !== '') o.min = Number(q.min); if (q.max != null && q.max !== '') o.max = Number(q.max); o.unit = nsS_(q.unit); }
      if (t === 'grid' || t === 'checkgrid') {
        o.rows = (q.rows || []).map(nsS_).filter(String); o.cols = (q.cols || []).map(nsS_).filter(String);
        if (!o.rows.length || o.cols.length < 2) throw new Error('SPEC: câu lưới "' + o.q.slice(0, 50) + '" thiếu hàng / cột');
      }
      return o;
    }) };
  });
  if (!secs.length) throw new Error('SPEC: chưa có phần câu hỏi nào');
  /* câu sàng lọc (lựa chọn có go) phải là câu cuối của phần: câu sau nó chuyển sang phần "(tiếp)" — nếu không, chọn "Không làm ⇒ kết thúc" vẫn bị bắt trả lời các câu bên dưới */
  for (var si = 0; si < secs.length; si++) {
    var sq = secs[si].questions;
    for (var qi = 0; qi < sq.length - 1; qi++) {
      var qq = sq[qi];
      if ((qq.t === 'radio' || qq.t === 'list') && (qq.options || []).some(function (o) { return o.go; })) {
        var nid = secs[si].id + '_t', k = 2; while (secIds[nid]) nid = secs[si].id + '_t' + (k++); secIds[nid] = 1;
        var rest = { id: nid, title: secs[si].title ? secs[si].title + ' (tiếp)' : '', help: '', go: secs[si].go, questions: sq.splice(qi + 1) };
        qq.options.forEach(function (o) { if (!o.go || o.go === 'next') o.go = ''; });
        secs[si].go = ''; secs.splice(si + 1, 0, rest); break;
      }
    }
  }
  secs.forEach(function (s) {
    var gos = [s.go].concat([].concat.apply([], s.questions.map(function (q) { return (q.options || []).map(function (o) { return o.go; }); })));
    gos.forEach(function (g) { if (g && g !== 'next' && g !== 'submit' && !secIds[g]) throw new Error('SPEC: điều hướng tới phần "' + g + '" không có'); });
  });
  return {
    v: 1, title: nsS_(spec.title), intro: nsS_(spec.intro), minutes: parseInt(spec.minutes, 10) || 0, confirmation: nsS_(spec.confirmation),
    grp: grp, prod: nsS_(spec.prod) || 'Chung', event: ev, page: page, followRequired: page !== 'none' && spec.followRequired !== false,
    consent: { title: nsS_(c.title), text: nsS_(c.text), agree: { q: nsS_(c.agree.q), v: nsS_(c.agree.v) }, optional: (c.optional || []).map(function (x) { return { q: nsS_(x.q), v: nsS_(x.v) }; }) },
    objective: nsS_(spec.objective), owner: nsS_(spec.owner),
    mail: { to: nsPics_((spec.mail || {}).to, NS.MAIL.to), cc: nsPics_((spec.mail || {}).cc, NS.MAIL.cc) },
    task: spec.task === false ? false : (typeof spec.task === 'object' && spec.task ? { type: nsS_(spec.task.type), keyNo: nsS_(spec.task.keyNo), keyName: nsS_(spec.task.keyName) } : {}),
    info: info, oncePerPhone: spec.oncePerPhone !== false, open: old ? old.open !== false : spec.open !== false,
    notify: (spec.notify || []).map(nsS_).filter(function (x) { return /@/.test(x); }), editors: (spec.editors || []).map(nsS_).filter(function (x) { return /@/.test(x); }),
    sections: secs
  };
}

function nsPics_(v, def) { return (Array.isArray(v) ? v : v ? String(v).split(/\s*,\s*/) : def).map(nsS_).filter(String); }

/* ---------- lưu / đọc (tab ẩn _SPEC, mỗi ô ≤ 45.000 ký tự) ---------- */
function nsStoreSave_(ss, st) {
  var sh = ss.getSheetByName(NS.SPEC_TAB);
  if (!sh) { sh = ss.insertSheet(NS.SPEC_TAB); sh.hideSheet(); }
  var j = JSON.stringify(st), parts = [];
  for (var i = 0; i < j.length; i += NS.CHUNK) parts.push([j.slice(i, i + NS.CHUNK)]);
  sh.clear(); sh.getRange(1, 1, parts.length, 1).setValues(parts);
}
function nsStoreRead_(ss) {
  var sh = ss.getSheetByName(NS.SPEC_TAB); if (!sh || sh.getLastRow() < 1) throw new Error('Thiếu tab _SPEC trong file kết quả');
  return JSON.parse(sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return r[0]; }).join(''));
}
function nsReg_(code) {
  var j = PropertiesService.getScriptProperties().getProperty('NS_' + nsS_(code));
  return j ? JSON.parse(j) : null;
}
function nsCodeOfSheet_(sheetId) { return sheetId ? PropertiesService.getScriptProperties().getProperty('NSS_' + sheetId) : null; }
/** {reg, st, ss?} — đệm 10 phút (meta / nộp không phải mở file Sheet mỗi lượt) */
function nsLoad_(code, needSs) {
  var reg = nsReg_(code); if (!reg) return null;
  var c = CacheService.getScriptCache(), k = 'ns_st_' + code, st = null;
  if (!needSs) { try { var h = rsCacheGet_(c, k); if (h) return { reg: reg, st: h }; } catch (x) {} }
  var ss = SpreadsheetApp.openById(reg.sheetId); st = nsStoreRead_(ss);
  try { rsCachePut_(c, k, st, 600); } catch (x) {}
  return { reg: reg, st: st, ss: ss };
}
function nsDrop_(code) { try { CacheService.getScriptCache().remove('ns_st_' + code); CacheService.getScriptCache().remove('ns_meta_' + code); } catch (x) {} }

/* ---------- cột ---------- */
function nsQs_(st) { var o = []; st.spec.sections.forEach(function (s) { s.questions.forEach(function (q) { if (q.t !== 'header') o.push({ q: q, sec: s }); }); }); return o; }
function nsHeads_(st) {
  var sp = st.spec, H = [];
  H[0] = 'Dấu thời gian'; H[1] = 'Mã lượt trả lời';
  sp.info.forEach(function (x) { H[st.cols['info:' + x.id] - 1] = x.q; });
  H[st.cols['_agree'] - 1] = 'Đồng ý xử lý dữ liệu cá nhân';
  H[st.cols['_opt'] - 1] = 'Đồng ý nhận thông tin từ MMH';
  H[st.cols['_follow'] - 1] = sp.page === 'none' ? 'Theo dõi page' : 'Theo dõi page ' + NS.FB[sp.page].name;
  H[st.cols['_event'] - 1] = 'Sự kiện';
  nsQs_(st).forEach(function (x, i) {
    var lab = 'Câu ' + (i + 1) + '. ' + x.q.q, c = st.cols[x.q.id];
    if (x.q.t === 'grid' || x.q.t === 'checkgrid') x.q.rows.forEach(function (r, ri) { H[c[ri] - 1] = lab + ' [' + r + ']'; });
    else H[c - 1] = lab;
  });
  for (var i = 0; i < H.length; i++) if (H[i] == null) H[i] = '(câu đã bỏ)';
  return H;
}
/** cấp cột cho mọi trường chưa có (cột cũ giữ nguyên chỗ ⇒ dữ liệu cũ không lệch) */
function nsAssignCols_(st) {
  st.cols = st.cols || {}; var n = st.ncol || 2;
  function take(k, w) { if (st.cols[k] != null) return; if (w) { st.cols[k] = []; for (var i = 0; i < w; i++) st.cols[k].push(++n); } else st.cols[k] = ++n; }
  st.spec.info.forEach(function (x) { take('info:' + x.id); });
  ['_agree', '_opt', '_follow', '_event'].forEach(function (k) { take(k); });
  nsQs_(st).forEach(function (x) {
    var q = x.q;
    if (q.t === 'grid' || q.t === 'checkgrid') {
      var have = st.cols[q.id] || []; if (!Array.isArray(have)) have = [have];
      while (have.length < q.rows.length) have.push(++n);
      st.cols[q.id] = have;
    } else if (Array.isArray(st.cols[q.id])) st.cols[q.id] = st.cols[q.id][0]; else take(q.id);
  });
  st.ncol = n;
}
function nsWriteHead_(ss, st) {
  var sh = ss.getSheetByName(NS.TAB), H = nsHeads_(st);
  if (sh.getMaxColumns() < H.length) sh.insertColumnsAfter(sh.getMaxColumns(), H.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#E8F0F7').setFontColor('#2C4A5E').setWrap(true).setVerticalAlignment('top');
  sh.setFrozenRows(1);
}

/* ---------- tạo / sửa ---------- */
function nsCode_() {
  var A = 'abcdefghjkmnpqrstuvwxyz23456789', P = PropertiesService.getScriptProperties();
  for (var t = 0; t < 20; t++) {
    var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid()), s = '';
    for (var i = 0; i < 7; i++) s += A.charAt(((b[i] % 256) + 256) % A.length);
    if (!P.getProperty('NS_' + s)) return s;
  }
  throw new Error('Không cấp được mã khảo sát');
}
function nsFolder_(sp) {
  var f = rshFolder_(sp.grp, sp.prod);
  if (sp.event.name) f = rshSub_(f, ((sp.event.date || '').replace(/-/g, '') + ' ' + sp.event.name).trim().slice(0, 120));
  return f;
}
function nsCreate_(spec, by) {
  var sp = nsNorm_(spec, null), code = nsCode_(), folder = nsFolder_(sp);
  var name = [(sp.event.date || Utilities.formatDate(new Date(), NS.TZ, 'yyyy-MM-dd')).replace(/-/g, ''), sp.title].join(' · ') + ' · Kết quả';
  var file = Drive.Files.create({ name: name.slice(0, 200), mimeType: RSH.SHEET, parents: [folder.getId()] }, null, { supportsAllDrives: true });
  var ss = SpreadsheetApp.openById(file.id), sh = ss.getSheets()[0];
  try { ss.setSpreadsheetTimeZone(NS.TZ); } catch (x) {}
  sh.setName(NS.TAB);
  var st = { code: code, spec: sp, cols: {}, ncol: 2, at: new Date().toISOString(), by: by || '' };
  nsAssignCols_(st); nsWriteHead_(ss, st); nsStoreSave_(ss, st);
  sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 110);
  sp.editors.forEach(function (e) { try { ss.addEditor(e); } catch (x) {} });
  var reg = { sheetId: file.id, title: sp.title, at: st.at, by: by || '' }, P = PropertiesService.getScriptProperties();
  P.setProperty('NS_' + code, JSON.stringify(reg)); P.setProperty('NSS_' + file.id, code);
  var url = nsLink_(code), sheetUrl = 'https://docs.google.com/spreadsheets/d/' + file.id + '/edit';
  try { rsAppend_({ id: file.id, formId: '', sheetId: file.id, title: sp.title + (sp.event.name ? ' · ' + sp.event.name : ''), by: by || 'MMH Survey', at: st.at, watch: [], told: 0, hidden: false, grp: sp.grp, prod: sp.prod, src: 'mmh' }); } catch (x) { console.warn('nsCreate_ rsAppend_: ' + x.message); }
  svLog_({ type: 'mmh-survey', title: sp.title, items: nsQs_(st).length, shortUrl: url, sheetUrl: sheetUrl, editUrl: '', summaryUrl: '', formId: code, sheetId: file.id });
  /* task Report Hub cho người tạo (MMH_SurveyNotify.gs) — lỗi không chặn việc tạo khảo sát; trang gửi email tạo lại khi cần */
  st.owner = nsS_(sp.owner || by);
  if (sp.task !== false && st.owner) { try { st.task = nsHubTask_(st, st.owner); } catch (x) { st.taskErr = x.message; } nsStoreSave_(ss, st); }
  return { ok: true, code: code, url: url, sheetUrl: sheetUrl, folderUrl: 'https://drive.google.com/drive/folders/' + folder.getId(), nq: nsQs_(st).length, page: sp.page, grp: sp.grp, prod: sp.prod,
    send: NS.SEND + '?s=' + code, app: NS.APP + '#s=' + encodeURIComponent(file.id), owner: st.owner, task: st.task || null, taskErr: st.taskErr || '' };
}
function nsUpdate_(code, spec) {
  var L = nsLoad_(code, true); if (!L) throw new Error('Không có khảo sát mã ' + code);
  var st = L.st; st.spec = nsNorm_(spec, st.spec); nsAssignCols_(st);
  nsWriteHead_(L.ss, st); nsStoreSave_(L.ss, st); nsDrop_(code);
  var reg = L.reg; reg.title = st.spec.title; PropertiesService.getScriptProperties().setProperty('NS_' + code, JSON.stringify(reg));
  return { ok: true, code: code, url: nsLink_(code), nq: nsQs_(st).length };
}
function nsSetOpen_(code, open) {
  var L = nsLoad_(code, true); if (!L) throw new Error('Không có khảo sát mã ' + code);
  L.st.spec.open = !!open; nsStoreSave_(L.ss, L.st); nsDrop_(code);
  return { ok: true, code: code, open: !!open };
}

/* ---------- trang khảo sát ---------- */
function nsToken_(code) { var t = Date.now().toString(36); return t + '.' + nsSig_(code + '|' + t); }
function nsTokenOk_(code, tok) {
  var p = nsS_(tok).split('.'); if (p.length !== 2 || nsSig_(code + '|' + p[0]) !== p[1]) return false;
  var age = Date.now() - parseInt(p[0], 36); return age > 2000 && age < 3 * 864e5;
}
function nsMeta_(code) {
  var L = nsLoad_(code, false); if (!L) return { ok: false, code: 'NONE', error: 'Link khảo sát không đúng hoặc đã bị xoá.' };
  var sp = L.st.spec, fb = sp.page === 'none' ? null : NS.FB[sp.page];
  return { ok: true, v: NS.VER, token: nsToken_(code), survey: {
    s: code, title: sp.title, intro: sp.intro, minutes: sp.minutes, confirmation: sp.confirmation, grp: sp.grp, open: sp.open !== false,
    event: sp.event, page: fb ? { key: sp.page, name: fb.name, url: fb.url, line: fb.line } : null, followRequired: sp.followRequired,
    consent: sp.consent, info: sp.info, sections: sp.sections, nq: nsQs_(L.st).length
  } };
}
function nsPhone_(v) {
  var d = nsS_(v).replace(/[\s.\-()]/g, '');
  if (/^\+?84\d{9}$/.test(d)) d = '0' + d.replace(/^\+?84/, '');
  return /^0\d{9}$/.test(d) || /^\+\d{8,15}$/.test(d) ? d : '';
}
/** các phần người trả lời đi qua (giống trang: lựa chọn có go ⇒ phần đó / submit; không có ⇒ go của phần ⇒ phần kế) */
function nsPath_(sp, A) {
  var idx = {}, path = [], i = 0, guard = 0;
  sp.sections.forEach(function (s, k) { idx[s.id] = k; });
  while (i < sp.sections.length && guard++ < 200) {
    var s = sp.sections[i], nx = null; path.push(i);
    s.questions.forEach(function (q) {
      if ((q.t !== 'radio' && q.t !== 'list') || A[q.id] == null) return;
      (q.options || []).forEach(function (o) { if (o.go && o.go !== 'next' && o.v === A[q.id]) nx = o.go; });
    });
    nx = nx || s.go || 'next';
    if (nx === 'submit') break;
    i = nx === 'next' ? i + 1 : idx[nx];
    if (path.indexOf(i) >= 0) break;
  }
  return path;
}
/** kiểm 1 câu ⇒ [giá trị đã chuẩn hoá (chuỗi / mảng theo hàng)] hoặc lỗi */
function nsVal_(q, v) {
  var miss = v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  if (miss) { if (q.required) throw { req: q }; return null; }
  var ov = (q.options || []).map(function (o) { return o.v; });
  function one(x) {
    x = nsS_(x).slice(0, 2000); if (!x || /^Khác:\s*$/.test(x)) return '';
    if (ov.indexOf(x) >= 0) return x;
    if (q.other) return /^Khác:\s*/.test(x) ? x : 'Khác: ' + x;
    throw new Error('Lựa chọn không hợp lệ ở câu: ' + q.q.slice(0, 60));
  }
  switch (q.t) {
    case 'radio': case 'list': var r1 = one(v); if (!r1 && q.required) throw { req: q }; return r1 || null;
    case 'checkbox':
      var a = (Array.isArray(v) ? v : [v]).map(one).filter(String);
      if (q.max && a.length > q.max) throw new Error('Chọn tối đa ' + q.max + ' ý ở câu: ' + q.q.slice(0, 60));
      if (!a.length && q.required) throw { req: q };
      return a.join(', ');
    case 'scale':
      var n = parseInt(v, 10); if (!(n >= q.low && n <= q.high)) throw new Error('Điểm không hợp lệ ở câu: ' + q.q.slice(0, 60)); return n;
    case 'grid': case 'checkgrid':
      var o = typeof v === 'object' && v ? v : {}, out = q.rows.map(function (r, i) {
        var x = o[i] != null ? o[i] : o[r];
        var arr = (Array.isArray(x) ? x : x == null || x === '' ? [] : [x]).map(nsS_).filter(function (c) { return q.cols.indexOf(c) >= 0; });
        if (q.t === 'grid') arr = arr.slice(0, 1);
        return arr.join(', ');
      });
      if (q.required && out.some(function (x) { return !x; })) throw { req: q };
      return out;
    case 'rating':
      var rt = parseInt(v, 10); if (!(rt >= 1 && rt <= q.max)) throw new Error('Số sao không hợp lệ ở câu: ' + q.q.slice(0, 60)); return rt;
    case 'number':
      var nb = Number(String(v).replace(/\s/g, '').replace(',', '.'));
      if (!isFinite(nb) || (q.min != null && nb < q.min) || (q.max != null && nb > q.max)) throw new Error('Số chưa đúng ở câu: ' + q.q.slice(0, 60)); return nb;
    case 'date':
      var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nsS_(v)); if (!dm) throw new Error('Ngày chưa đúng ở câu: ' + q.q.slice(0, 60)); return dm[3] + '/' + dm[2] + '/' + dm[1];
    case 'phone':
      var ph = nsPhone_(v); if (!ph) throw new Error('Số điện thoại chưa đúng ở câu: ' + q.q.slice(0, 60)); return ph;
    default: return nsS_(v).slice(0, q.t === 'paragraph' ? 5000 : 1000);
  }
}
function nsSubmit_(b) {
  var code = nsS_(b.s);
  if (nsS_(b.hp)) return { ok: true, rid: 'R0' };  // ô bẫy: máy tự điền ⇒ bỏ qua im lặng
  if (!nsTokenOk_(code, b.token)) return { ok: false, code: 'TOKEN', error: 'Phiên trả lời đã hết hạn — tải lại trang (câu trả lời vẫn được giữ trên máy).' };
  var L = nsLoad_(code, false); if (!L) return { ok: false, code: 'NONE', error: 'Link khảo sát không đúng hoặc đã bị xoá.' };
  var st = L.st, sp = st.spec;
  if (sp.open === false) return { ok: false, code: 'CLOSED', error: 'Khảo sát đã đóng, cảm ơn Quý bác sĩ đã quan tâm.' };
  var cs = b.consent || {}, info = b.info || {}, A = b.answers || {}, fl = b.follow || {};
  if (!cs.agree) return { ok: false, code: 'REQ', step: 'consent', error: 'Vui lòng xác nhận đồng ý xử lý dữ liệu cá nhân.' };
  var row = [], put = function (c, v) { row[c - 1] = v; }, phone = '', name = '', work = '';
  try {
    sp.info.forEach(function (x) {
      var v = nsVal_({ t: x.t === 'list' ? 'radio' : x.t, q: x.q, required: x.required, options: x.options.map(function (o) { return { v: o }; }) }, info[x.id]);
      if (x.t === 'phone' && !phone) phone = v || '';
      if (x.id === 'name') name = v || ''; if (x.id === 'work') work = v || '';
      put(st.cols['info:' + x.id], v == null ? '' : x.t === 'phone' ? "'" + v : v);
    });
  } catch (e) { if (e && e.req) return { ok: false, code: 'REQ', step: 'info', error: 'Vui lòng điền: ' + e.req.q }; return { ok: false, code: 'REQ', step: 'info', error: e.message }; }
  var fst = nsS_(fl.st);
  if (sp.followRequired && fst !== 'opened' && fst !== 'before') return { ok: false, code: 'REQ', step: 'follow', error: 'Vui lòng theo dõi page ' + NS.FB[sp.page].name + ' trước khi trả lời.' };
  var fTxt = fst === 'opened' ? 'Đã mở page và xác nhận theo dõi' + (fl.at ? ' (' + Utilities.formatDate(new Date(Number(fl.at) || Date.now()), NS.TZ, 'HH:mm dd/MM') + ')' : '') : fst === 'before' ? 'Xác nhận đã theo dõi từ trước' : '';
  put(st.cols._agree, 'Đồng ý'); put(st.cols._opt, (cs.opt || []).some(Boolean) ? 'Đồng ý' : ''); put(st.cols._follow, fTxt);
  put(st.cols._event, sp.event.name ? ((sp.event.date ? Utilities.formatDate(new Date(sp.event.date + 'T00:00:00'), NS.TZ, 'dd/MM/yyyy') + ' · ' : '') + sp.event.name) : '');
  var path = nsPath_(sp, A), nAns = 0;
  try {
    path.forEach(function (si) {
      sp.sections[si].questions.forEach(function (q) {
        if (q.t === 'header') return;
        var v = nsVal_(q, A[q.id]), c = st.cols[q.id];
        if (v == null) return; nAns++;
        if (Array.isArray(c)) c.forEach(function (cc, i) { put(cc, v[i] || ''); }); else put(c, q.t === 'phone' ? "'" + v : v);
      });
    });
  } catch (e) { if (e && e.req) return { ok: false, code: 'REQ', step: 'q', qid: e.req.id, error: 'Vui lòng trả lời: ' + e.req.q }; return { ok: false, code: 'REQ', step: 'q', error: e.message }; }
  var lk = LockService.getScriptLock(); if (!lk.tryLock(25000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận, vui lòng bấm Gửi lại sau vài giây.' };
  var rid = 'R' + Date.now().toString(36).toUpperCase(), ss, sh;
  try {
    ss = SpreadsheetApp.openById(L.reg.sheetId); sh = ss.getSheetByName(NS.TAB);
    if (sp.oncePerPhone && phone && sh.getLastRow() > 1) {
      var pc = st.cols['info:' + (sp.info.filter(function (x) { return x.t === 'phone'; })[0].id)];
      var hit = sh.getRange(2, pc, sh.getLastRow() - 1, 1).createTextFinder(phone).matchEntireCell(true).findNext();
      if (hit) return { ok: false, code: 'DUP', error: 'Số điện thoại ' + phone + ' đã trả lời khảo sát này. Cảm ơn Quý bác sĩ!' };
    }
    row[0] = new Date(); row[1] = rid;
    for (var i = 0; i < st.ncol; i++) if (row[i] == null) row[i] = '';
    sh.appendRow(row.slice(0, st.ncol));
    nsPeople_(sp, code, rid, name, phone, work, (cs.opt || []).some(Boolean), fTxt);
  } finally { lk.releaseLock(); }
  try { CacheService.getScriptCache().remove('rsc2_' + L.reg.sheetId); } catch (x) {}
  if (sp.notify.length) {
    try {
      mmhMail_({ to: sp.notify.join(','), subject: '[Khảo sát] ' + sp.title + ' · 1 câu trả lời mới', htmlBody:
        '<p>Khảo sát <b>' + nsEsc_(sp.title) + '</b> vừa nhận 1 câu trả lời' + (work ? ' (' + nsEsc_(work) + ')' : '') + ', ' + nAns + ' câu.</p>' +
        '<p>Kết quả: <a href="https://docs.google.com/spreadsheets/d/' + L.reg.sheetId + '/edit">Google Sheet</a></p><p style="color:#888">Email tự động từ MMH Survey.</p>' });
    } catch (x) { console.warn('nsSubmit_ mail: ' + x.message); }
  }
  return { ok: true, rid: rid };
}
function nsEsc_(s) { return nsS_(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
/* kho chung người tham gia (đã đồng ý xử lý dữ liệu) — tab của file nhật ký "MMH Survey · Danh sách form đã tạo" */
function nsPeople_(sp, code, rid, name, phone, work, opt, fTxt) {
  try {
    var ss = svLogSheet_().getParent(), sh = ss.getSheetByName(NS.PEOPLE_TAB);
    if (!sh) { sh = ss.insertSheet(NS.PEOPLE_TAB); sh.getRange(1, 1, 1, NS.PEOPLE_HEAD.length).setValues([NS.PEOPLE_HEAD]).setFontWeight('bold').setBackground('#E8F0F7'); sh.setFrozenRows(1); }
    sh.appendRow([new Date(), name, phone ? "'" + phone : '', work, sp.title, sp.event.name, sp.grp, 'Đồng ý', opt ? 'Đồng ý' : '', fTxt, code, rid]);
  } catch (x) { console.warn('nsPeople_: ' + x.message); }
}

/* ---------- app MMH Survey (rsData_) đọc đúng loại câu theo bản mô tả ---------- */
function nsRsData_(e, code, cnt, pii) {
  var L = nsLoad_(code, true), st = L.st, sp = st.spec, sh = L.ss.getSheetByName(NS.TAB), lr = sh.getLastRow();
  var Q = [], M = [];
  sp.info.forEach(function (x) { var pi = x.t === 'phone' || x.id === 'name'; Q.push({ k: Q.length, q: x.q, grp: '', sec: 'Thông tin chung', t: x.t === 'radio' || x.t === 'list' ? 'radio' : 'text', opts: x.options || [], other: false, pii: pi }); M.push({ c: st.cols['info:' + x.id], pii: pi }); });
  if (sp.page !== 'none') { Q.push({ k: Q.length, q: 'Theo dõi page ' + NS.FB[sp.page].name, grp: '', sec: 'Thông tin chung', t: 'text', opts: [], other: false, pii: false }); M.push({ c: st.cols._follow }); }
  Q.push({ k: Q.length, q: 'Đồng ý nhận thông tin từ MMH', grp: '', sec: 'Thông tin chung', t: 'radio', opts: ['Đồng ý'], other: false, pii: false }); M.push({ c: st.cols._opt });
  nsQs_(st).forEach(function (x, i) {
    var q = x.q, o = { k: Q.length, q: 'Câu ' + (i + 1) + '. ' + q.q, grp: '', sec: x.sec.title, t: 'text', opts: [], other: !!q.other, pii: false };
    if (q.t === 'radio' || q.t === 'list') { o.t = 'radio'; o.opts = q.options.map(function (z) { return z.v; }); }
    else if (q.t === 'checkbox') { o.t = 'checkbox'; o.opts = q.options.map(function (z) { return z.v; }); }
    else if (q.t === 'scale') { o.t = 'scale'; o.lo = q.low; o.hi = q.high; o.ll = q.lowLabel; o.hl = q.highLabel; for (var s = q.low; s <= q.high; s++) o.opts.push(String(s)); }
    else if (q.t === 'grid' || q.t === 'checkgrid') { o.t = q.t; o.rows = q.rows; o.cols = q.cols; }
    else if (q.t === 'rating') { o.t = 'scale'; o.lo = 1; o.hi = q.max; o.ll = q.lowLabel || ''; o.hl = q.highLabel || ''; for (var s2 = 1; s2 <= q.max; s2++) o.opts.push(String(s2)); }
    else if (q.t === 'phone') o.pii = true;
    Q.push(o); M.push({ c: st.cols[q.id], t: q.t, opts: o.opts, pii: o.pii });
  });
  var V = lr > 1 ? sh.getRange(2, 1, lr - 1, Math.max(st.ncol, 2)).getValues() : [];
  var A = V.filter(function (r) { return nsS_(r[1]); }).map(function (r) {
    return [r[0] instanceof Date ? r[0].getTime() : rsTs_(r[0]), M.map(function (m) {
      if (m.pii && !pii) return null;
      if (Array.isArray(m.c)) { var g = m.c.map(function (c) { var x = nsS_(r[c - 1]); return x === '' ? null : (m.t === 'checkgrid' ? x.split(', ') : x); }); return g.some(function (x) { return x != null; }) ? g : null; }
      var x = nsS_(r[m.c - 1]); if (x === '') return null;
      if (m.t === 'checkbox') { var out = [], rest = x; m.opts.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (op) { var k = rest.indexOf(op); if (k >= 0) { out.push(op); rest = rest.slice(0, k) + rest.slice(k + op.length); } });
        rest.split(', ').map(nsS_).filter(function (z) { return z && z !== ','; }).forEach(function (z) { out.push(z.replace(/^,\s*/, '')); }); return out; }
      return x;
    })];
  }).sort(function (a, b) { return a[0] - b[0]; });
  return { ok: true, v: RS.VER, id: e.id, title: sp.title + (sp.event.name ? ' · ' + sp.event.name : ''), n: A.length, last: cnt.last, pii: pii, src: 'mmh',
    formUrl: nsLink_(code), editUrl: '', sheetUrl: 'https://docs.google.com/spreadsheets/d/' + L.reg.sheetId + '/edit', accepting: sp.open !== false, questions: Q, answers: A };
}

/* ---------- định tuyến ---------- */
function nsRoute_(a, p) {
  try {
    if (a === 'nsMeta') {
      var c = CacheService.getScriptCache(), k = 'ns_meta_' + nsS_(p.s), h = null;
      try { h = c.get(k); } catch (x) {}
      var m = h ? JSON.parse(h) : nsMeta_(nsS_(p.s));
      if (!h && m.ok) { try { c.put(k, JSON.stringify(m), 300); } catch (x) {} }
      if (m.ok) m.token = nsToken_(nsS_(p.s));
      return m;
    }
    if (a === 'nsSubmit') return nsSubmit_(p);
    /* nhân sự đăng nhập email (trang gui.html / tao.html): phiên tk của Training Hub */
    var me = p.tk ? rsWho_(p.tk) : null; if (me && me.err) me = null;
    if (a === 'nsInfo' || a === 'nsMailSend') {
      if (!me) return { ok: false, code: 'AUTH', error: 'Cần đăng nhập email công ty (mở Report Hub / CRM / Training Hub trên trình duyệt này rồi tải lại trang).' };
      return a === 'nsInfo' ? nsInfo_(nsS_(p.s), me) : nsMailSend_(nsS_(p.s), me, String(p.force) === '1');
    }
    if (nsS_(p.key) !== nsKey_()) return { ok: false, error: 'KEY' };
    var spec = p.spec; if (typeof spec === 'string') { try { spec = JSON.parse(spec); } catch (x) { spec = null; } }
    if (!spec && p.pz) spec = svUnz_(p.pz);
    if (a === 'nsCreate') return nsCreate_(spec, me ? me.pic : nsS_(p.by));
    if (a === 'nsUpdate') return nsUpdate_(nsS_(p.s), spec);
    if (a === 'nsSet') return nsSetOpen_(nsS_(p.s), String(p.open) !== '0' && String(p.open) !== 'false');
    if (a === 'nsTask') {  // tạo lại task Report Hub (khoá): s, owner?
      var Lt = nsLoad_(nsS_(p.s), true); if (!Lt) return { ok: false, error: 'Không có mã ' + p.s };
      var ow = nsS_(p.owner) || Lt.st.owner || Lt.st.by; Lt.st.owner = ow;
      try { Lt.st.task = nsHubTask_(Lt.st, ow); Lt.st.taskErr = ''; } catch (x) { Lt.st.taskErr = x.message; }
      nsStoreSave_(Lt.ss, Lt.st); nsDrop_(nsS_(p.s)); return { ok: !Lt.st.taskErr, task: Lt.st.task || null, error: Lt.st.taskErr || undefined };
    }
    if (a === 'nsGet') { var L = nsLoad_(nsS_(p.s), true); return L ? { ok: true, code: p.s, spec: L.st.spec, cols: L.st.cols } : { ok: false, error: 'Không có mã ' + p.s }; }
    if (a === 'nsList') {
      var P = PropertiesService.getScriptProperties().getProperties(), out = [];
      Object.keys(P).forEach(function (kk) {
        if (!/^NS_[a-z0-9]{7}$/.test(kk)) return;
        var r = JSON.parse(P[kk]), n = null; try { n = Math.max(0, SpreadsheetApp.openById(r.sheetId).getSheetByName(NS.TAB).getLastRow() - 1); } catch (x) {}
        out.push({ code: kk.slice(3), title: r.title, at: r.at, n: n, url: nsLink_(kk.slice(3)), sheetUrl: 'https://docs.google.com/spreadsheets/d/' + r.sheetId + '/edit' });
      });
      return { ok: true, v: NS.VER, items: out.sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); }) };
    }
    return { ok: false, error: 'Lệnh không có: ' + a };
  } catch (e) { return { ok: false, error: e && e.message || String(e) }; }
}
