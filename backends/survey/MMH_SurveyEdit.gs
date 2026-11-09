/**
 * MMH_SurveyEdit.gs v1.1 (09/11/2026; v1.1: thêm trang mới rồi chuyển chỗ bằng số thứ tự — moveItem không nhận PageBreakItem) — ĐỌC và SỬA TẠI CHỖ một Google Form đã có (giữ nguyên link trả lời + câu trả lời cũ).
 * Người dùng yêu cầu: sửa form khảo sát đã gửi bác sĩ mà không đổi link. Sửa tại chỗ = giữ mã (id) từng câu ⇒ câu trả lời cũ vẫn gắn đúng câu,
 * cột trong Sheet kết quả giữ nguyên (đổi tên câu ⇒ Google tự đổi tiêu đề cột cho lượt mới).
 *
 *   ?action=formDump&key=…&formId=…[&off=0&n=12]   ⇒ {ok, title, desc, conf, responses, total, items:[{i,id,t,q,h,r,c,o,…}]}
 *        t = radio|checkbox|list|text|paragraph|scale|grid|checkgrid|header|page|… · c = lựa chọn ("Giá trị ⇒ submit" / "⇒ #id phần")
 *   ?action=formEdit&key=…&formId=…&pz=<gzip base64url JSON {ops:[…]}>[&dry=1]   (hoặc POST {action, key, formId, ops, dry})
 *        dry=1 ⇒ chỉ kiểm tra + in kế hoạch, KHÔNG sửa.
 *
 * ops (áp theo thứ tự; câu chỉ định bằng id (ưu tiên, lấy từ formDump) hoặc i = số thứ tự LÚC ĐỌC — mọi tham chiếu được dò TRƯỚC khi sửa):
 *   {op:"form", title, desc, conf}                                   tiêu đề / lời mở đầu / lời cảm ơn
 *   {op:"set", id|i, q, help, required, options:[…], other, max, low, high, lowLabel, highLabel, rows, cols, go}
 *        q giữ tiền tố "Câu n." sẵn có (trừ khi q tự ghi "Câu …"); options như spec tạo form ({v, go:"submit"|"next"|<id phần>|<tên phần>});
 *        lựa chọn không ghi go ⇒ giữ điều hướng cũ của lựa chọn cùng tên. go (với page) = phần này xong thì đi đâu.
 *        Không đổi được LOẠI câu (sẽ mất dữ liệu) ⇒ dùng delete + add.
 *   {op:"add", after|before: id|i (bỏ trống = cuối form), q:{t,q,help,options,…} | {t:"page", q:"Tên phần", help}, num:false}
 *   {op:"delete", id|i}                                               dữ liệu cũ của câu vẫn còn trong Sheet kết quả
 *   {op:"move", id|i, after|before: id|i}
 *   {op:"renumber"}                                                   đánh lại "Câu 1., Câu 2. …" (tự chạy khi có add / delete / move)
 * Mỗi lần sửa thật ⇒ sheet nhật ký ▸ tab EDIT (thời gian, formId, ops, bản trước khi sửa) để tra / hoàn tác tay.
 * Bài kiểm tra (quiz, chấm trên máy chủ theo id câu) ⇒ chỉ cho "form" + "set" phần chữ (q / help), không thêm / xoá / đổi lựa chọn.
 */
var SVE = { VER: '1.1', NUM: /^Câu\s+\d+\s*[.:]\s*/ };

function svEdT_(it) {
  var T = FormApp.ItemType, t = it.getType();
  var m = {}; m[T.MULTIPLE_CHOICE] = 'radio'; m[T.CHECKBOX] = 'checkbox'; m[T.LIST] = 'list'; m[T.TEXT] = 'text'; m[T.PARAGRAPH_TEXT] = 'paragraph';
  m[T.SCALE] = 'scale'; m[T.GRID] = 'grid'; m[T.CHECKBOX_GRID] = 'checkgrid'; m[T.SECTION_HEADER] = 'header'; m[T.PAGE_BREAK] = 'page';
  return m[t] || String(t).toLowerCase();
}
function svEdCast_(it) {
  switch (svEdT_(it)) {
    case 'radio': return it.asMultipleChoiceItem(); case 'checkbox': return it.asCheckboxItem(); case 'list': return it.asListItem();
    case 'text': return it.asTextItem(); case 'paragraph': return it.asParagraphTextItem(); case 'scale': return it.asScaleItem();
    case 'grid': return it.asGridItem(); case 'checkgrid': return it.asCheckboxGridItem(); case 'header': return it.asSectionHeaderItem();
    case 'page': return it.asPageBreakItem(); default: return null;
  }
}
function svEdNavOf_(c) {  // điều hướng của 1 lựa chọn: null | 'submit' | 'restart' | <PageBreakItem>
  try { var g = c.getGotoPage(); if (g) return g; } catch (x) {}
  try {
    var nt = c.getPageNavigationType(), N = FormApp.PageNavigationType;
    if (nt === N.SUBMIT) return 'submit'; if (nt === N.RESTART) return 'restart';
  } catch (x) {}
  return null;
}
function svEdNavTxt_(n) { return !n ? '' : (typeof n === 'string' ? ' ⇒ ' + n : ' ⇒ #' + n.getId()); }

function svEdDumpItem_(it, i) {
  var t = svEdT_(it), c = svEdCast_(it), o = { i: i, id: it.getId(), t: t, q: it.getTitle() };
  var h = it.getHelpText(); if (h) o.h = h;
  if (c && c.isRequired) { try { if (c.isRequired()) o.r = 1; } catch (x) {} }
  if (/^(radio|checkbox|list)$/.test(t)) {
    o.c = c.getChoices().map(function (ch) { return ch.getValue() + svEdNavTxt_(svEdNavOf_(ch)); });
    if (t !== 'list') { try { if (c.hasOtherOption()) o.o = 1; } catch (x) {} }
  } else if (t === 'scale') { o.lo = c.getLowerBound(); o.hi = c.getUpperBound(); o.ll = c.getLeftLabel(); o.hl = c.getRightLabel(); }
  else if (t === 'grid' || t === 'checkgrid') { o.rows = c.getRows(); o.cols = c.getColumns(); }
  else if (t === 'page') {
    try { var g = c.getGoToPage(); if (g) o.go = '#' + g.getId(); else { var nt = c.getPageNavigationType(); if (nt === FormApp.PageNavigationType.SUBMIT) o.go = 'submit'; } } catch (x) {}
  }
  return o;
}

function svEdDump_(formId, off, n) {
  var form = FormApp.openById(formId), items = form.getItems(), total = items.length;
  off = Math.max(0, Number(off) || 0); n = Math.max(1, Math.min(200, Number(n) || 12));
  var out = { ok: true, v: SV.VER, formId: formId, total: total, off: off, n: n, items: [] };
  if (off === 0) {
    out.title = form.getTitle(); out.desc = form.getDescription(); out.conf = form.getConfirmationMessage();
    try { out.responses = form.getResponses().length; } catch (x) { out.responsesErr = x.message; }
    try { out.accepting = form.isAcceptingResponses(); out.published = form.isPublished(); } catch (x) {}
    try { out.url = form.getPublishedUrl(); } catch (x) {}
    out.quiz = !!svQuizCfg_(formId);
  }
  for (var i = off; i < Math.min(total, off + n); i++) out.items.push(svEdDumpItem_(items[i], i));
  return out;
}

/* ---------- sửa ---------- */
function svEdFind_(items, ref) {  // ref = id (số / chuỗi số) hoặc {i}
  if (ref == null || ref === '') return null;
  var s = String(ref);
  for (var k = 0; k < items.length; k++) if (String(items[k].getId()) === s) return items[k];
  return null;
}
function svEdRef_(items, op, idKey, iKey) {
  if (op[idKey] != null && op[idKey] !== '') { var a = svEdFind_(items, op[idKey]); if (!a) throw new Error('Không có câu id ' + op[idKey]); return a; }
  if (op[iKey] != null && op[iKey] !== '') { var it = items[Number(op[iKey])]; if (!it) throw new Error('Không có câu thứ ' + op[iKey]); return it; }
  return null;
}
function svEdIdx_(form, it) { var id = it.getId(), all = form.getItems(); for (var k = 0; k < all.length; k++) if (all[k].getId() === id) return k; return -1; }

function svEdGo_(form, go, pages) {
  var N = FormApp.PageNavigationType;
  if (!go || go === 'next') return N.CONTINUE;
  if (go === 'submit') return N.SUBMIT;
  if (go === 'restart') return N.RESTART;
  var s = String(go).replace(/^#/, ''), all = form.getItems(FormApp.ItemType.PAGE_BREAK);
  for (var k = 0; k < all.length; k++) if (String(all[k].getId()) === s) return all[k].asPageBreakItem();
  if (pages && pages[s]) return pages[s];
  var low = s.toLowerCase();
  for (var j = 0; j < all.length; j++) { var t = all[j].getTitle().toLowerCase(); if (t === low || t.indexOf(low + '.') === 0 || t.indexOf('phần ' + low + '.') === 0) return all[j].asPageBreakItem(); }
  throw new Error('Không tìm thấy phần "' + go + '" để điều hướng');
}

function svEdSetChoices_(form, c, t, opts, quiz, pages) {
  var N = FormApp.PageNavigationType, old = {};
  c.getChoices().forEach(function (ch) { old[ch.getValue()] = svEdNavOf_(ch); });
  var anyNav = t !== 'checkbox' && (opts.some(function (o) { return o.go; }) || Object.keys(old).some(function (k) { return old[k]; }));
  c.setChoices(opts.map(function (o) {
    if (quiz) return c.createChoice(o.v, !!o.correct);
    if (!anyNav) return c.createChoice(o.v);
    var nav;
    if (o.go) nav = svEdGo_(form, o.go, pages);
    else { var on = old[o.v]; nav = !on ? N.CONTINUE : (on === 'submit' ? N.SUBMIT : on === 'restart' ? N.RESTART : on); }
    return c.createChoice(o.v, nav);  // nav = PageNavigationType hoặc PageBreakItem
  }));
}

function svEdApplySet_(form, it, op, quiz, pages, plan) {
  var t = svEdT_(it), c = svEdCast_(it), done = [];
  if (!c) throw new Error('Câu #' + it.getId() + ' loại ' + t + ' chưa sửa được');
  if (op.t && op.t !== t) throw new Error('Câu #' + it.getId() + ' là "' + t + '" — không đổi loại được (dùng delete + add)');
  if (op.q != null) {
    var cur = it.getTitle(), pre = (cur.match(SVE.NUM) || [''])[0], q = String(op.q);
    c.setTitle(pre && !SVE.NUM.test(q) ? pre + q : q); done.push('tiêu đề');
  }
  if (op.help != null) { c.setHelpText(String(op.help)); done.push('ghi chú'); }
  if (quiz && (op.options || op.other != null || op.required != null || op.max)) throw new Error('Bài kiểm tra: chỉ sửa được chữ câu hỏi / ghi chú');
  if (op.required != null && c.setRequired) { c.setRequired(!!op.required); done.push(op.required ? 'bắt buộc' : 'không bắt buộc'); }
  if (op.options) {
    if (!/^(radio|checkbox|list)$/.test(t)) throw new Error('Câu #' + it.getId() + ' không có lựa chọn');
    svEdSetChoices_(form, c, t, svOpts_(op), false, pages); done.push(op.options.length + ' lựa chọn');
  }
  if (op.other != null) { if (t === 'list') throw new Error('Danh sách thả xuống không có ô "Khác"'); c.showOtherOption(!!op.other); done.push('ô Khác ' + (op.other ? 'bật' : 'tắt')); }
  if (op.max != null && t === 'checkbox') {
    if (Number(op.max) > 0) c.setValidation(FormApp.createCheckboxValidation().setHelpText('Xin chọn tối đa ' + op.max + ' ý.').requireSelectAtMost(Number(op.max)).build());
    else c.clearValidation();
    done.push('chọn tối đa ' + (op.max || 'không giới hạn'));
  }
  if (t === 'scale' && (op.low != null || op.high != null)) { c.setBounds(op.low != null ? op.low : c.getLowerBound(), op.high != null ? op.high : c.getUpperBound()); done.push('thang điểm'); }
  if (t === 'scale' && (op.lowLabel != null || op.highLabel != null)) { c.setLabels(op.lowLabel != null ? op.lowLabel : c.getLeftLabel(), op.highLabel != null ? op.highLabel : c.getRightLabel()); done.push('nhãn thang'); }
  if ((t === 'grid' || t === 'checkgrid') && op.rows) { c.setRows(op.rows); done.push('hàng'); }
  if ((t === 'grid' || t === 'checkgrid') && op.cols) { c.setColumns(op.cols); done.push('cột'); }
  if (t === 'page' && op.go != null) { c.setGoToPage(svEdGo_(form, op.go, pages)); done.push('đi tiếp ⇒ ' + op.go); }
  plan.push('Sửa #' + it.getId() + ' «' + it.getTitle().slice(0, 50) + '»: ' + (done.join(', ') || 'không đổi gì'));
}

function svEdAdd_(form, q, num, pages) {
  if (q.t === 'page') {
    var pb = form.addPageBreakItem().setTitle(q.q || ''); if (q.help) pb.setHelpText(q.help);
    if (q.id) pages[q.id] = pb;
    return pb;
  }
  var q2 = Object.assign({}, q);
  if (num && q.t !== 'header' && !SVE.NUM.test(String(q.q || ''))) q2.q = 'Câu 0. ' + q.q;  // số thật do renumber
  var opts = svOpts_(q2), hasGo = opts.some(function (o) { return o.go; });
  if (hasGo) q2.options = opts.map(function (o) { return o.v; });
  var before = form.getItems().length;
  svAdd_(form, q2, false, []);
  var it = form.getItems()[before];
  if (hasGo) svEdSetChoices_(form, svEdCast_(it), q2.t || 'radio', opts, false, pages);
  return it;
}

function svEdRenumber_(form) {
  var n = 0, ch = 0;
  form.getItems().forEach(function (it) {
    var t = it.getTitle();
    if (!SVE.NUM.test(t)) return;
    n++;
    var nt = t.replace(SVE.NUM, 'Câu ' + n + '. ');
    if (nt !== t) { it.setTitle(nt); ch++; }
  });
  return { numbered: n, changed: ch };
}

function svEdit_(formId, ops, dry) {
  if (!formId) throw new Error('Thiếu formId');
  if (!Array.isArray(ops) || !ops.length) throw new Error('Thiếu ops');
  var form = FormApp.openById(formId), quiz = !!svQuizCfg_(formId), items = form.getItems();
  var numbered = items.some(function (it) { return SVE.NUM.test(it.getTitle()); });
  // dò mọi tham chiếu trước khi sửa (số thứ tự i = lúc đọc)
  var R = ops.map(function (op, k) {
    var r = { op: op };
    try {
      if (!/^(form|set|add|delete|move|renumber)$/.test(op.op)) throw new Error('op lạ "' + op.op + '"');
      if (op.op === 'set' || op.op === 'delete' || op.op === 'move') { r.it = svEdRef_(items, op, 'id', 'i'); if (!r.it) throw new Error('thiếu id / i'); }
      if (op.op === 'add' || op.op === 'move') { r.after = svEdRef_(items, op, 'after', 'afterI'); r.before = svEdRef_(items, op, 'before', 'beforeI'); }
      if (op.op === 'add' && !(op.q && (op.q.q || op.q.t === 'page'))) throw new Error('add thiếu q');
      if (quiz && /^(add|delete|move)$/.test(op.op)) throw new Error('Bài kiểm tra: không thêm / xoá / đổi chỗ câu được (máy chủ chấm theo id câu)');
    } catch (e) { throw new Error('ops[' + k + '] ' + e.message); }
    return r;
  });
  var before = svEdDump_(formId, 0, 200), plan = [], pages = {}, struct = false, deleted = {};
  if (dry) {
    R.forEach(function (r) {
      var op = r.op, nm = r.it ? '#' + r.it.getId() + ' «' + r.it.getTitle().slice(0, 50) + '»' : '';
      plan.push(op.op === 'form' ? 'Sửa thông tin form: ' + Object.keys(op).filter(function (k) { return k !== 'op'; }).join(', ')
        : op.op === 'set' ? 'Sửa ' + nm + ': ' + Object.keys(op).filter(function (k) { return !/^(op|id|i)$/.test(k); }).join(', ')
        : op.op === 'add' ? 'Thêm ' + (op.q.t || 'radio') + ' «' + String(op.q.q || '').slice(0, 50) + '» ' + (r.after ? 'sau #' + r.after.getId() : r.before ? 'trước #' + r.before.getId() : 'cuối form')
        : op.op === 'delete' ? 'Xoá ' + nm
        : op.op === 'move' ? 'Chuyển ' + nm + ' ' + (r.after ? 'sau #' + r.after.getId() : 'trước #' + (r.before && r.before.getId()))
        : 'Đánh lại số câu');
    });
    return { ok: true, dry: true, v: SV.VER, formId: formId, quiz: quiz, responses: before.responses, plan: plan };
  }
  R.forEach(function (r) {
    var op = r.op;
    if (r.it && deleted[r.it.getId()]) throw new Error('Câu #' + r.it.getId() + ' đã bị xoá ở bước trước');
    if (op.op === 'form') {
      if (op.title != null) form.setTitle(op.title);
      if (op.desc != null) form.setDescription(op.desc);
      if (op.conf != null) form.setConfirmationMessage(op.conf);
      plan.push('Sửa thông tin form');
    } else if (op.op === 'set') svEdApplySet_(form, r.it, op, quiz, pages, plan);
    else if (op.op === 'add') {
      var it = svEdAdd_(form, op.q, numbered && op.num !== false, pages);
      var to = form.getItems().length - 1;
      if (r.after) to = svEdIdx_(form, r.after) + 1; else if (r.before) to = svEdIdx_(form, r.before);
      var at = svEdIdx_(form, it);  // moveItem chỉ nhận Item chung / số thứ tự (PageBreakItem báo lỗi) ⇒ luôn dùng số thứ tự
      if (to !== at) form.moveItem(at, to);
      plan.push('Thêm #' + it.getId() + ' «' + it.getTitle().slice(0, 50) + '» ở vị trí ' + to); struct = true;
    } else if (op.op === 'delete') {
      plan.push('Xoá #' + r.it.getId() + ' «' + r.it.getTitle().slice(0, 50) + '»');
      deleted[r.it.getId()] = 1; form.deleteItem(r.it); struct = true;
    } else if (op.op === 'move') {
      var from = svEdIdx_(form, r.it), dest;
      if (r.after) { dest = svEdIdx_(form, r.after); if (from > dest) dest++; } else if (r.before) { dest = svEdIdx_(form, r.before); if (from < dest) dest--; }
      else throw new Error('move thiếu after / before');
      form.moveItem(from, dest); plan.push('Chuyển #' + r.it.getId() + ' tới vị trí ' + dest); struct = true;
    } else if (op.op === 'renumber') { struct = true; }
  });
  var rn = null;
  if (struct && numbered) { rn = svEdRenumber_(form); plan.push('Đánh lại số câu: ' + rn.numbered + ' câu (' + rn.changed + ' câu đổi số)'); }
  svEdLog_(formId, ops, before, plan);
  return { ok: true, v: SV.VER, formId: formId, responses: before.responses, plan: plan, url: before.url, total: form.getItems().length };
}

function svEdLog_(formId, ops, before, plan) {
  try {
    var ss = svLogSheet_().getParent(), sh = ss.getSheetByName('EDIT');
    if (!sh) { sh = ss.insertSheet('EDIT'); sh.appendRow(['Thời gian', 'Form ID', 'Tiêu đề', 'Đã làm', 'Lệnh (ops)', 'Bản trước khi sửa (JSON)']); }
    sh.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), formId, before.title, plan.join('\n'),
      JSON.stringify(ops).slice(0, 45000), JSON.stringify(before).slice(0, 45000)]);
  } catch (x) { console.warn('svEdLog_: ' + x.message); }
}

/* gọi từ svHandle_ (đã kiểm khoá) */
function svEdRoute_(a, p, body) {
  body = body || {};
  var fid = body.formId || p.formId;
  if (a === 'formDump') return svEdDump_(fid, body.off != null ? body.off : p.off, body.n || p.n);
  var ops = body.ops;
  if (!ops && (body.pz || p.pz)) ops = svUnz_(body.pz || p.pz);
  if (!ops && p.p) ops = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p.p)).getDataAsString('UTF-8'));
  if (ops && !Array.isArray(ops)) ops = ops.ops;
  var dry = !!(body.dry || p.dry === '1');
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { return svEdit_(fid, ops, dry); } finally { lock.releaseLock(); }
}
