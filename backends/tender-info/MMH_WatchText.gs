/* ════════════════════════════════════════════════════════════════════
   MMH_WatchText.gs v1.1 (23/11/2026, người dùng yêu cầu; 24/11/2026 sửa OCR PDF + xuất chữ Google Docs, tự đọc lại dòng lỗi cũ) — ĐỌC CHỮ TÀI LIỆU THẦU ĐỂ QUÉT TỪ KHOÁ SẢN PHẨM MMH (miễn phí, không AI)
   Tài liệu: chương HSMT (yêu cầu kỹ thuật, phạm vi cung cấp…), Quyết định phê duyệt KHLCNT, Báo cáo đánh giá E-HSDT đã tải về Drive.
   · .docx ⇒ giải nén, đọc word/document.xml (không cần quyền mới)
   · .pdf / .doc ⇒ Google Drive đổi sang Google Docs có nhận dạng chữ (OCR — đọc được cả bản scan) ⇒ xuất chữ ⇒ xoá bản tạm
   · .rar / ảnh / file > WTE.MAX_MB ⇒ ghi trạng thái, không đọc
   Chữ đọc được quét bằng bộ từ khoá + quy tắc của MMH_WatchSuspect.gs ⇒ sheet ẩn "THEO DÕI · TỪ KHOÁ TÀI LIỆU" (1 dòng / file:
   số gói · loại · từ khoá + đoạn trích quanh từ khoá — KHÔNG lưu cả văn bản). Báo cáo sáng (MMH_WatchRoute.gs) đọc sheet này để tô từ khoá.
   Chạy: cuối wtmTick (15 phút) trong thời gian còn lại · action botText {key, op: status|run|one, id} (one = đọc thử 1 file, trả cách đọc + 600 ký tự đầu).
   ════════════════════════════════════════════════════════════════════ */
const WTE = {
  VER: '1.1',
  SH: 'THEO DÕI · TỪ KHOÁ TÀI LIỆU',
  HEAD: ['File ID', 'Số gói', 'Phần', 'Loại tài liệu', 'Tên file', 'Đọc lúc', 'Trạng thái', 'Số ký tự', 'Từ khoá (JSON)', 'Link', 'Cách đọc'],
  DOC_RE: /hồ sơ mời thầu|hsmt|yêu cầu.{0,12}kỹ thuật|chương\s*v\b|phạm vi cung cấp|danh mục hàng|quyết định phê duyệt khlcnt|kế hoạch lựa chọn|báo cáo đánh giá|biên bản mở thầu/i,
  MAX_MB: 15,
  MAX_HITS: 14,
  SNIP: 170
};
function wteSheet_(ss) {
  const sh = wtSheet_(ss || wtBook_(), WTE.SH, WTE.HEAD);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
  return sh;
}
/** xml docx ⇒ chữ */
function wteDocx_(blob) {
  const parts = Utilities.unzip(blob.setContentType('application/zip'));
  const doc = parts.filter(function (b) { return b.getName() === 'word/document.xml'; })[0];
  if (!doc) throw new Error('docx không có word/document.xml');
  return doc.getDataAsString('UTF-8').replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>|<\/w:tc>/g, ' \t ').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
/** Google Docs ⇒ chữ (thử lần lượt các cách Apps Script cho phép, không thêm quyền) */
function wteExport_(id) {
  const tries = [
    ['export-media', function () { const r = Drive.Files.export(id, 'text/plain', { alt: 'media' }); return typeof r === 'string' ? r : (r && r.getDataAsString ? r.getDataAsString('UTF-8') : ''); }],   // 24/11/2026: thiếu alt=media ⇒ "Export requires alt=media"
    ['export', function () { const r = Drive.Files.export(id, 'text/plain'); return typeof r === 'string' ? r : (r && r.getDataAsString ? r.getDataAsString('UTF-8') : ''); }],
    ['getAs', function () { return DriveApp.getFileById(id).getAs('text/plain').getDataAsString('UTF-8'); }]
  ];
  const errs = [];
  for (let i = 0; i < tries.length; i++) {
    try { const t = tries[i][1](); if (t && t.trim()) return { text: t, how: tries[i][0] }; errs.push(tries[i][0] + ': trống'); }
    catch (e) { errs.push(tries[i][0] + ': ' + String(e.message || e).slice(0, 120)); }
  }
  throw new Error(errs.join(' | '));
}
/** 1 file Drive ⇒ { text, how } */
function wteRead_(fileId) {
  const f = DriveApp.getFileById(fileId), name = f.getName(), mt = f.getMimeType(), size = f.getSize();
  if (/\.(rar|7z)$/i.test(name)) return { skip: 'file nén .rar — chưa đọc được' };
  if (mt === MimeType.GOOGLE_SHEETS) return { text: SpreadsheetApp.openById(fileId).getSheets().map(function (s) { return s.getDataRange().getDisplayValues().map(function (r) { return r.join(' \t '); }).join('\n'); }).join('\n'), how: 'sheet' };
  if (mt === MimeType.GOOGLE_DOCS) return wteExport_(fileId);
  if (size > WTE.MAX_MB * 1048576) return { skip: 'file lớn ' + Math.round(size / 1048576) + ' MB' };
  const blob = f.getBlob();
  if (/\.docx$/i.test(name) || mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return { text: wteDocx_(blob), how: 'docx' };
  if (/\.zip$/i.test(name)) {
    const out = [];
    Utilities.unzip(blob.setContentType('application/zip')).forEach(function (b) { if (/\.docx$/i.test(b.getName())) { try { out.push(wteDocx_(b)); } catch (e) {} } });
    if (out.length) return { text: out.join('\n'), how: 'zip-docx' };
    return { skip: 'zip không có .docx' };
  }
  if (!/\.(pdf|doc|rtf|odt)$/i.test(name) && !/pdf|msword/.test(mt)) return { skip: 'loại file ' + mt };
  // 24/11/2026: ghi mimeType Google Docs vào tài nguyên + ocr ⇒ "OCR is not supported for files of type application/vnd.google-apps.document" (mọi PDF đều lỗi).
  // Đúng cách Drive v2: KHÔNG ghi mimeType đích, blob mang đúng loại gốc, convert + ocr ⇒ Google Docs; OCR lỗi ⇒ thử đổi không OCR.
  const isPdf = /\.pdf$/i.test(name) || /pdf/.test(mt);
  if (isPdf) blob.setContentType('application/pdf');
  let tmp;
  try { tmp = Drive.Files.insert({ title: '_mmh_doc_text_' + name }, blob, isPdf ? { convert: true, ocr: true, ocrLanguage: 'vi' } : { convert: true }); }
  catch (e1) { tmp = Drive.Files.insert({ title: '_mmh_doc_text_' + name }, blob, { convert: true }); }
  try { const r = wteExport_(tmp.id); r.how = 'ocr+' + r.how; return r; }
  finally { try { Drive.Files.remove(tmp.id); } catch (e) { try { DriveApp.getFileById(tmp.id).setTrashed(true); } catch (x) {} } }
}
/** chữ ⇒ [{kw, spec:'dent'|'surg', high, grp, snip}] — quét từng dòng (tên hàng + thông số thường nằm cùng dòng / ô) */
function wteScan_(text) {
  if (!WTQ_KW) { try { wtqKwLoad_(wtmBook_('hh').book); } catch (e) { WTQ_KW = wtqKwCompile_(WTQ_KWDEF); } }
  const G = wtqGroups_(), out = [], seen = {}, cnt = { dent: 0, surg: 0 };
  const lines = String(text || '').replace(/\r/g, '').split(/\n+/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(function (x) { return x.length > 2; });
  lines.forEach(function (ln, i) {
    const kh = wtqKwHits_(WTQ_KW, ln);
    const rh = wtqClassify_(ln.slice(0, 200), ln);
    if (!kh.length && !rh.length) return;
    const specs = {};
    rh.forEach(function (c) { const t = wtqTabOf_((G[c] || {}).spec || ''); if (t) specs[t] = 1; });
    if (!rh.length) kh.forEach(function (k) { k.spec.forEach(function (s) { const t = wtqTabOf_(s); if (t) specs[t] = 1; }); });
    Object.keys(specs).forEach(function (t) { cnt[t]++; });
    if (out.length >= WTE.MAX_HITS) return;
    // đoạn trích: dòng này (+ dòng sau nếu quá ngắn — tên hàng và thông số hay bị tách dòng khi nhận dạng chữ)
    let snip = ln; if (snip.length < 60 && lines[i + 1]) snip += ' ' + lines[i + 1];
    snip = snip.slice(0, WTE.SNIP * 2);
    const k = snip.slice(0, 80); if (seen[k]) return; seen[k] = 1;
    out.push({ kw: kh.map(function (x) { return x.kw; }).join(' · '), spec: Object.keys(specs), high: rh.length ? rh[0] : '', grp: rh.length ? (G[rh[0]] || {}).name || '' : kh.map(function (x) { return x.groups; }).filter(String)[0] || '', snip: snip });
  });
  out.sort(function (a, b) { return (b.high ? 1 : 0) - (a.high ? 1 : 0); });
  return { hits: out, cnt: cnt };
}
/** tài liệu cần đọc (chưa có trong sheet), mới tải trước */
function wteTodo_(H, done) {
  const todo = [];
  H.forEach(function (h) {
    (h.files || []).forEach(function (f) {
      if (!f || !f.id || done[f.id] || f.gsheet) return;
      const t = wtS_(f.kind) + ' ' + wtS_(f.name);
      if (!WTE.DOC_RE.test(t)) return;
      todo.push({ id: f.id, bare: wtBare_(h.no), sec: wtS_(f.sec) || h.type, kind: wtS_(f.kind), name: wtS_(f.name), url: wtS_(f.url), at: h.done || h.found || '' });
    });
  });
  todo.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  return todo;
}
function wteRun_(opt) {
  opt = opt || {};
  const t0 = Date.now(), budget = opt.budget || 90000, ss = wtBook_(), sh = wteSheet_(ss);
  const V = wtRows_(sh, WTE.HEAD.length), done = {}, redo = {};
  // 24/11/2026: dòng lỗi do bug OCR / export cũ ⇒ đọc lại, ghi đè đúng dòng đó
  V.forEach(function (r, i) { const id = wtS_(r[0]); if (!id) return; if (/^Lỗi: .*(OCR is not supported|alt=media)/.test(wtS_(r[6]))) redo[id] = i + 2; else done[id] = 1; });
  const todo = wteTodo_(wtHits_(ss), done), res = { todo: todo.length, read: 0, skip: 0, err: 0, hits: 0 };
  const add = [];
  for (let i = 0; i < todo.length; i++) {
    if (Date.now() - t0 > budget) break;
    const d = todo[i];
    let row;
    try {
      const r = wteRead_(d.id);
      if (r.skip) { row = [d.id, d.bare, d.sec, d.kind, d.name, wtNow_(), r.skip, 0, '', d.url, '']; res.skip++; }
      else {
        const s = wteScan_(r.text);
        row = [d.id, d.bare, d.sec, d.kind, d.name, wtNow_(), s.hits.length ? 'Có từ khoá' : 'Không có từ khoá', r.text.length, JSON.stringify({ h: s.hits, c: s.cnt }).slice(0, 45000), d.url, r.how];
        res.read++; if (s.hits.length) res.hits++;
      }
    } catch (e) { row = [d.id, d.bare, d.sec, d.kind, d.name, wtNow_(), 'Lỗi: ' + String(e.message || e).slice(0, 200), 0, '', d.url, '']; res.err++; }
    if (redo[d.id]) { sh.getRange(redo[d.id], 1, 1, WTE.HEAD.length).setValues([row]); continue; }
    add.push(row);
    if (add.length >= 5) { sh.getRange(sh.getLastRow() + 1, 1, add.length, WTE.HEAD.length).setValues(add); add.length = 0; }
  }
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, WTE.HEAD.length).setValues(add);
  res.ms = Date.now() - t0;
  PropertiesService.getScriptProperties().setProperty('WTE_LAST', JSON.stringify(Object.assign({ at: wtNow_() }, res)));
  return res;
}
/** số gói ⇒ [{file, kind, sec, url, hits:[…], cnt}] (đọc sheet 1 lần / lượt) */
function wteHitsBy_() {
  const out = {};
  wtRows_(wteSheet_(), WTE.HEAD.length).forEach(function (r) {
    const b = wtS_(r[1]); if (!b) return;
    const j = wtJson_(wtS_(r[8]), null);
    (out[b] = out[b] || []).push({ id: wtS_(r[0]), sec: wtS_(r[2]), kind: wtS_(r[3]), name: wtS_(r[4]), status: wtS_(r[6]), url: wtS_(r[9]), hits: j ? j.h || [] : [], cnt: j ? j.c || {} : {} });
  });
  return out;
}
function wteAction_(p) {
  const op = wtS_(p.op) || 'status';
  if (op === 'status') {
    const st = {}; wtRows_(wteSheet_(), WTE.HEAD.length).forEach(function (r) { const k = wtS_(r[6]).split(':')[0]; st[k] = (st[k] || 0) + 1; });
    return { ok: true, v: WTE.VER, last: wtJson_(PropertiesService.getScriptProperties().getProperty('WTE_LAST'), null), status: st };
  }
  if (op === 'run') return Object.assign({ ok: true }, wteRun_({ budget: Math.min(240000, (+p.sec || 120) * 1000) }));
  if (op === 'one') {   // đọc thử 1 file, không ghi
    let id = wtS_(p.id);
    if (!id) { const t = wteTodo_(wtHits_(wtBook_()), {}).filter(function (x) { return !p.ext || new RegExp('\\.' + wtS_(p.ext) + '$', 'i').test(x.name); })[0]; if (!t) return { ok: false, error: 'không có tài liệu' }; id = t.id; }
    const t0 = Date.now();
    try {
      const r = wteRead_(id);
      if (r.skip) return { ok: true, id: id, skip: r.skip };
      const s = wteScan_(r.text);
      return { ok: true, id: id, name: DriveApp.getFileById(id).getName(), how: r.how, chars: r.text.length, head: r.text.slice(0, 600), hits: s.hits.slice(0, 5), cnt: s.cnt, ms: Date.now() - t0 };
    } catch (e) { return { ok: false, id: id, error: String(e.message || e), ms: Date.now() - t0 }; }
  }
  return { ok: false, error: 'op = status | run | one' };
}
