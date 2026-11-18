/*************************************************************************************************
 * MMH — MKT_EventHubForm.gs   (Event Hub v1.9 · 18/11/2026) — họp Marketing (Thương) 18/11/2026, người dùng chốt:
 *  ① MẪU VIỆC đọc thẳng sheet "Event form_Task" của file Report Hub Marketing (1. Vietnam - Sales & Marketing Action FY67-FY68):
 *     3 khối EXHIBITION · SEMINAR · WORKSHOP (dòng 3 = tên khối, dòng có "#" + "Task" = tiêu đề), mỗi khối 3 phase (# = I / II / III),
 *     mỗi việc: # · Task · PIC · Ngày bắt đầu · Ngày kết thúc dạng "D – 120" / "D" / "D + 3" / chữ ("Theo hạn BTC").
 *     action ehForm (đọc, đệm 10 phút) ⇒ app hiện checklist 3 phase để tick khi tạo sự kiện.
 *  ② Tạo việc theo mục đã tick (ehSave event.add / event.pick với `picks`): PIC theo mẫu (khớp tên RH_Users), hạn = NGÀY THẬT tính từ ngày D,
 *     mỗi phase 1 hạng mục lớn; cột mới ở CUỐI TASKS: phase · startAt · formKey. Sự kiện mới phát hiện từ file KHÔNG tự sinh việc nữa (EH_FORM_ON)
 *     ⇒ Owner mở sự kiện, bấm "Chọn việc theo mẫu".
 *  ③ TUYỂN SINH từ file "MMH - Data đăng ký sự kiện FY67" (backend mkt-reg, EH_REG_MASTER): mọi tab có cột "EVENT NAME" ⇒ đếm theo tên sự kiện:
 *     tổng · done · cancel · pending · MANI tuyển / NPP tuyển (cột "biết đến sự kiện qua") · theo ngày. CHỈ SỐ ĐẾM, không tên / SĐT.
 *  ④ Owner TRẢ LẠI việc chờ duyệt (Under review ⇒ Đang làm) ⇒ file đã nộp của việc đó chuyển vào Thùng rác Drive (khôi phục 30 ngày) + nhật ký.
 *************************************************************************************************/
var EH_FORM_ON = true;                                                  /* sự kiện mới từ file: không tự sinh việc theo TEMPLATE cũ */
var EH_REG_MASTER = '1fzV1vc-C0U-PdFq3O8P7mceOWs9hj5qGKY6eyYSvkS0';   /* MMH - Data đăng ký sự kiện FY67 */
var EH_FORM_KEYS = { EXHIBITION: 'Triển lãm', SEMINAR: 'Hội thảo', WORKSHOP: 'Workshop' };

function ehFormOff_(s){
  var t = String(s == null ? '' : s).replace(/[–—−]/g, '-').replace(/\s+/g, '').toUpperCase();
  var m = /^D([+-]\d+)?$/.exec(t); if (!m) return null;
  return m[1] ? +m[1] : 0;
}
/* đọc sheet Event form_Task ⇒ { forms: { EXHIBITION: { label, phases:[{ no, name, tasks:[{ no, title, pic, s, e, sText, eText, key }] }] } } } */
function ehFormTpl_(force){
  var c = CacheService.getScriptCache(), hit = !force && c.get('eh_form');
  if (hit){ try { return JSON.parse(hit); } catch(e){} }
  var book = ss(), sh = null;
  book.getSheets().forEach(function(x){ if (!sh && /event\s*form/i.test(x.getName())) sh = x; });
  if (!sh) return { ok:false, error:'Không thấy sheet "Event form_Task" trong file Report Hub Marketing.' };
  var V = sh.getRange(1, 1, Math.min(sh.getLastRow(), 200), Math.min(sh.getLastColumn(), 40)).getDisplayValues();
  var hr = -1; for (var i = 0; i < V.length && hr < 0; i++) if (V[i].filter(function(x){ return /^task$/i.test(String(x).trim()); }).length >= 2) hr = i;
  if (hr < 0) return { ok:false, error:'Sheet Event form_Task: không thấy dòng tiêu đề "# · Task · PIC".' };
  var H = V[hr].map(function(x){ return ehNorm_(x); }), starts = [];
  H.forEach(function(h, j){ if (h === 'task') starts.push(j - 1); });
  var forms = {};
  starts.forEach(function(c0, k){
    var c1 = k + 1 < starts.length ? starts[k + 1] - 1 : H.length - 1, col = { no: c0, title: c0 + 1 };
    for (var j = c0; j <= c1; j++){ var h = H[j];
      if (h === 'pic') col.pic = j; else if (/bat dau/.test(h)) col.s = j; else if (/ket thuc/.test(h)) col.e = j; }
    var label = ''; for (var r = 0; r < hr && !label; r++) for (var j2 = c0; j2 <= c1 && !label; j2++){ var t0 = String(V[r][j2]).trim(); if (/[A-Za-z]{4,}/.test(t0)) label = t0; }
    var key = /exhib|triển lãm|trien lam/i.test(label) ? 'EXHIBITION' : /work/i.test(label) ? 'WORKSHOP' : /semi|hội thảo|hoi thao/i.test(label) ? 'SEMINAR' : ('F' + k);
    var phases = [], ph = null;
    for (var r2 = hr + 1; r2 < V.length; r2++){
      var no = String(V[r2][col.no] || '').trim(), title = String(V[r2][col.title] || '').trim();
      if (!title) continue;
      if (/^(I|II|III|IV|V)$/i.test(no)){ ph = { no: no.toUpperCase(), name: title, tasks: [] }; phases.push(ph); continue; }
      if (!ph){ ph = { no: 'I', name: 'Chuẩn bị', tasks: [] }; phases.push(ph); }
      var sT = col.s != null ? String(V[r2][col.s] || '').trim() : '', eT = col.e != null ? String(V[r2][col.e] || '').trim() : '';
      ph.tasks.push({ no: no, title: title, pic: col.pic != null ? String(V[r2][col.pic] || '').trim() : '', s: ehFormOff_(sT), e: ehFormOff_(eT), sText: sT, eText: eT,
                      key: key + '|' + ph.no + '|' + ehNorm_(title).slice(0, 60) });
    }
    forms[key] = { label: label, type: EH_FORM_KEYS[key] || label, phases: phases };
  });
  var out = { ok:true, sheet: sh.getName(), at: ehNow_(), forms: forms };
  try { c.put('eh_form', JSON.stringify(out), 600); } catch(e){}
  return out;
}
function ehFormKeyOf_(type){
  var t = ehNorm_(type);
  return /trien lam|exhibit|booth/.test(t) ? 'EXHIBITION' : /workshop|thuc hanh|hands/.test(t) ? 'WORKSHOP' : 'SEMINAR';
}
/* tên PIC trong mẫu ("Thương", "Đức Anh", "Giang (Product Team)") ⇒ tên trong RH_Users */
function ehFormPic_(name){
  var n = ehNorm_(String(name || '').replace(/\(.*?\)/g, '')); if (!n) return '';
  var U = ehUsers_(), hit = '';
  Object.keys(U).forEach(function(k){ if (!hit && ehNorm_(k) === n) hit = k; });
  return hit || String(name || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
}
function ehFormDue_(e, off, end){
  if (off == null || !e.start) return '';
  var s = ehDate_(e.start), en = ehDate_(e.end || e.start); if (!(s instanceof Date)) return '';
  var b = off > 0 ? en : s; b.setDate(b.getDate() + off); return ehIso_(b);
}
/* picks = [{ key, title?, pic?, s?, e? }] (app gửi mục đã tick, có thể đã đổi PIC) ⇒ việc mới (bỏ việc trùng tên trong cùng phase đã có) */
function ehFormTasks_(e, picks, me, existing){
  var F = ehFormTpl_(); if (!F.ok) throw new Error(F.error);
  var fk = ehFormKeyOf_(e.type), form = F.forms[fk] || F.forms.SEMINAR; if (!form) throw new Error('Không có mẫu cho loại sự kiện này.');
  var want = {}; (picks || []).forEach(function(p){ if (p && p.key) want[String(p.key)] = p; });
  var out = [], order = 0, have = {}, parents = {};
  (existing || []).forEach(function(t){ if (ehS_(t.eventId) !== e.id) return; order = Math.max(order, +t.order || 0);
    if (!ehS_(t.parentId) && ehS_(t.phase)) parents[ehS_(t.phase)] = ehS_(t.id);
    have[ehS_(t.phase) + '|' + ehNorm_(t.title)] = 1; });
  form.phases.forEach(function(ph){
    var chosen = ph.tasks.filter(function(t){ return want[t.key]; });
    if (!chosen.length) return;
    var pname = ph.no + ' · ' + ph.name;
    if (!parents[pname]){
      var pid = ehId_('T'); parents[pname] = pid;
      out.push({ id: pid, eventId: e.id, parentId: '', group: pname, title: ph.name, role: '', pic: '', due: '', offset: '', unit: '', dueManual: '', status: 'Chưa làm',
                 proof: '', hint: '', note: '', order: ++order, doneAt: '', updatedAt: ehNow_(), updatedBy: me.pic, createdBy: me.pic, phase: pname, formKey: fk });
    }
    chosen.forEach(function(t){
      if (have[pname + '|' + ehNorm_(t.title)]) return;
      var p = want[t.key], s = p.s != null && p.s !== '' ? +p.s : t.s, en = p.e != null && p.e !== '' ? +p.e : t.e;
      /* hạn ghi chữ ("Theo hạn BTC") ⇒ để trống hạn, Owner tự đặt; ghi chữ vào gợi ý */
      var dueOff = en != null ? en : (t.eText ? null : s);
      out.push({ id: ehId_('T'), eventId: e.id, parentId: parents[pname], group: pname, title: ehS_(p.title) || t.title, role: '', pic: ehS_(p.pic) || ehFormPic_(t.pic),
                 due: dueOff == null ? '' : ehFormDue_(e, dueOff), offset: dueOff == null ? '' : dueOff, unit: '', dueManual: '', status: 'Chưa làm', proof: '',
                 hint: t.eText && en == null ? t.eText : '', note: '', order: ++order, doneAt: '', updatedAt: ehNow_(), updatedBy: me.pic, createdBy: me.pic,
                 phase: pname, startAt: ehFormDue_(e, s), formKey: fk, milestone: '-' });
    });
  });
  return out;
}
/* ehSave op event.pick: thêm việc theo mẫu cho sự kiện có sẵn (Owner / quản lý) */
function ehFormPickOp_(ss, me, d, evBy){
  var e = evBy[ehS_(d.eventId)]; if (!e) return { ok:false, error:'Không thấy sự kiện.' };
  if (!ehCanEv_(me, e)) return { ok:false, code:'PERM', error:'Chỉ Owner sự kiện hoặc quản lý được thêm việc theo mẫu.' };
  var tasks = ehFormTasks_(e, d.picks, me, ehRead_(ss, 'TASKS'));
  if (tasks.length) ehAppend_(ss, 'TASKS', EH.COLS.TASKS, tasks);
  ehLog_(ss, me, 'Thêm việc theo mẫu', e.id, '', tasks.filter(function(t){ return t.parentId; }).length + ' việc · mẫu ' + ehFormKeyOf_(e.type));
  var cnt = {}; tasks.forEach(function(t){ if (t.pic && t.parentId && t.pic !== me.pic) cnt[t.pic] = (cnt[t.pic] || 0) + 1; });
  Object.keys(cnt).forEach(function(p){ EH_N.push({ to: p, kind: 'team', ev: e, role: 'việc theo mẫu', count: cnt[p] }); });
  return { ok:true, tasks: tasks };
}

/* ③ tuyển sinh từ file Data đăng ký tổng ⇒ { <tên chuẩn hoá>: { name, n, done, cancel, pending, other, mani, npp, unk, days } } (đệm 10 phút) */
function ehRegMaster_(force){
  var c = CacheService.getScriptCache(), hit = !force && c.get('eh_regm');
  if (hit){ try { return JSON.parse(hit); } catch(e){} }
  var out = {}, book;
  try { book = SpreadsheetApp.openById(EH_REG_MASTER); } catch(e){ return { _err: 'Chưa mở được file Data đăng ký tổng.' }; }
  book.getSheets().forEach(function(sh){
    var lr = sh.getLastRow(), lc = Math.min(45, sh.getLastColumn()); if (lr < 2 || lc < 2) return;
    var H = sh.getRange(1, 1, 1, lc).getValues()[0].map(function(x){ return ehNorm_(x); });
    var cE = H.indexOf('event name'); if (cE < 0) return;
    var cT = -1, cS = -1, cTime = -1;
    H.forEach(function(h, j){ if (cT < 0 && /^tien trinh/.test(h)) cT = j; if (cS < 0 && /biet den su kien/.test(h)) cS = j; if (cTime < 0 && /^(timestamp|dau thoi gian)/.test(h)) cTime = j; });
    sh.getRange(2, 1, lr - 1, lc).getValues().forEach(function(r){
      var en = String(r[cE] || '').trim(); if (!en) return;
      var k = ehNorm_(en), o = out[k] = out[k] || { name: en, n: 0, done: 0, cancel: 0, pending: 0, other: 0, mani: 0, npp: 0, unk: 0, days: {}, tabs: {} };
      o.n++; o.tabs[sh.getName()] = 1;
      var st = cT >= 0 ? ehNorm_(r[cT]) : '';
      if (/^(done|hoan thanh|xong|da xac nhan|da dang ky|ok)/.test(st)) o.done++; else if (/(cancel|huy|khong tham)/.test(st)) o.cancel++; else if (/(pending|cho|dang)/.test(st)) o.pending++; else o.other++;
      var src = cS >= 0 ? ehNorm_(r[cS]) : '';
      if (!src) o.unk++; else if (/\bmani\b|\bmmh\b|mani medical/.test(src)) o.mani++; else o.npp++;
      if (cTime >= 0 && r[cTime] instanceof Date){ var dd = ehIso_(r[cTime]); o.days[dd] = (o.days[dd] || 0) + 1; }
    });
  });
  Object.keys(out).forEach(function(k){ out[k].tabs = Object.keys(out[k].tabs); });
  try { var js = JSON.stringify(out); if (js.length < 90000) c.put('eh_regm', js, 600); } catch(e){}
  return out;
}
/* khớp sự kiện ⇒ số đếm (tên trùng hoặc chứa nhau, ≥ 12 ký tự) */
function ehRegMasterFor_(e, M){
  if (!M || M._err) return null;
  var names = [ehNorm_(e.name), ehNorm_(e.offlineName)].filter(function(x){ return x && x.length >= 8; }), best = null;
  Object.keys(M).forEach(function(k){
    names.forEach(function(nm){
      var ok = k === nm || (k.length >= 12 && nm.indexOf(k) >= 0) || (nm.length >= 12 && k.indexOf(nm) >= 0);
      if (ok && (!best || M[k].n > best.n)) best = M[k];
    });
  });
  if (!best) return null;
  return { name: best.name, n: best.n, act: best.n - best.cancel, done: best.done, cancel: best.cancel, pending: best.pending, other: best.other,
           mani: best.mani, npp: best.npp, unk: best.unk, days: best.days, tabs: best.tabs };
}

/* ④ Owner trả lại việc chờ duyệt ⇒ file đã nộp vào Thùng rác Drive */
function ehFormTrashFiles_(ss, me, tk, why){
  var sh = ss.getSheetByName('FILES'); if (!sh) return 0;
  var F = ehRead_(ss, 'FILES').filter(function(f){ return ehS_(f.taskId) === ehS_(tk.id) && ehS_(f.driveId); }), n = 0, rows = [];
  F.forEach(function(f){ try { DriveApp.getFileById(ehS_(f.driveId)).setTrashed(true); n++; rows.push(f._r); } catch(e){} });
  rows.sort(function(a, b){ return b - a; }).forEach(function(r){ try { sh.deleteRow(r); } catch(e){} });
  if (n) ehLog_(ss, me, 'Trả lại · chuyển file vào Thùng rác', tk.eventId, tk.id, n + ' file · ' + F.map(function(f){ return ehS_(f.name); }).join(', ').slice(0, 300) + (why ? ' · lý do: ' + why : ''));
  return n;
}

/* action ehForm — op=tpl (mặc định: mẫu 3 khối, cho app) · op=reg (số đăng ký file tổng theo sự kiện) · force=1 đọc lại.
   Phiên email (ehMe_) hoặc key = 8 ký tự cuối EH.ROOT (workflow Kiểm tra). */
function ehFormApi_(p){
  var op = String(p.op || 'tpl'), force = String(p.force || '') === '1';
  if (String(p.key || '') !== ehKey_()){ var me = ehMe_(p, ehBook_()); if (me.err) return { ok:false, code:'AUTH', error: me.err }; }
  if (op === 'reg'){
    var M = ehRegMaster_(force); if (M._err) return { ok:false, error: M._err };
    var ev = ehRead_(ehBook_(), 'EVENTS'), hit = [], miss = [];
    ev.forEach(function(e){ var x = ehRegMasterFor_(e, M); if (x) hit.push({ id: e.id, name: e.name, start: e.start, reg: x.act, done: x.done, cancel: x.cancel, pending: x.pending, mani: x.mani, npp: x.npp, file: x.name }); });
    var used = {}; hit.forEach(function(h){ used[ehNorm_(h.file)] = 1; });
    Object.keys(M).forEach(function(k){ if (!used[k]) miss.push({ name: M[k].name, n: M[k].n, tabs: M[k].tabs }); });
    return { ok:true, events: hit, unmatched: miss };
  }
  var F = ehFormTpl_(force); if (!F.ok) return F;
  if (String(p.brief || '') === '1'){   /* chẩn đoán gọn */
    var b = {}; Object.keys(F.forms).forEach(function(k){ b[k] = F.forms[k].phases.map(function(ph){ return ph.no + ' ' + ph.name + ' (' + ph.tasks.length + ')'; }); });
    return { ok:true, sheet: F.sheet, forms: b, sample: (F.forms.SEMINAR || F.forms[Object.keys(F.forms)[0]] || { phases: [{ tasks: [] }] }).phases[0].tasks.slice(0, 4) };
  }
  return F;
}
