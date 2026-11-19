/*************************************************************************************************
 * MMH — MKT_EventHubFY.gs   (Event Hub v2.4 · 19/11/2026) — góp ý của nhóm Marketing (Thương):
 *  ① "Nhiều dữ liệu cũ quá, chỉ lấy sự kiện FY68 từ 01/09/2026 đến nay" ⇒ ehFyTrim_ (trong ehBootBuild_): app CHỈ nhận sự kiện có ngày bắt đầu ≥ EH.FY_FROM
 *     (sự kiện chưa có ngày: chỉ sự kiện tạo trên app / dữ liệu mẫu) + việc / tệp / bình luận / biên bản … của các sự kiện đó.
 *  ② "3 thẻ sự kiện không biết lấy thông tin từ đâu" — do quét thư mục Event FY68 gặp Google Sheet tên bắt đầu bằng ngày mà KHÔNG phải file kế hoạch
 *     (vd. "20261019 LIST CUSTOMER"). Nay: tên file kiểu danh sách khách / khảo sát / đăng ký ⇒ đồng bộ bỏ qua (không tạo sự kiện mới);
 *     sự kiện đã lỡ tạo từ file đó (nguồn FILE, chưa có việc) ⇒ không gửi về app. Mỗi sự kiện gửi kèm planName (tên file kế hoạch) để app ghi rõ NGUỒN.
 *  ③ Việc: "Chia việc với NPP, Trường / Viện" ⇒ "Phân công công việc"; bỏ việc "Giám đốc duyệt kế hoạch + ngân sách" (mẫu việc + dữ liệu gửi về app).
 *  KHÔNG xoá / sửa dòng nào trong sheet — chỉ lọc dữ liệu gửi về app.
 *  Chẩn đoán (chỉ đọc): action ehEvDiag (key = 8 ký tự cuối EH.ROOT hoặc quản lý) ⇒ mọi sự kiện + nguồn + số việc + lý do ẩn.
 *************************************************************************************************/
var EH_FY = {
  JUNK_RE: /list customer|customer list|danh sach (khach|kh\b)|data (khach|dang ky)|du lieu khach|khao sat|survey|check ?in|form dang ky|ket qua dang ky/
};
function ehIsJunkFile_(name){ return EH_FY.JUNK_RE.test(ehNorm_(name)); }
/* "…_EN" = bản tiếng Anh của file kế hoạch cùng ngày (vd. VOS Da Nang_EN) */
function ehIsEnCopy_(name, files){
  var n = ehNorm_(name); if (!/ en$/.test(n)) return false;
  var d = (/^(\d{8})/.exec(String(name).replace(/\s+/g, '')) || [])[1];
  return (files || []).some(function(f){ var m = ehNorm_(f.name); return m !== n && !/ en$/.test(m) && d && String(f.name).replace(/\s+/g, '').indexOf(d) === 0; });
}
/* sự kiện tạo từ 1 Google Sheet KHÔNG đọc ra kế hoạch (không có TÊN SỰ KIỆN, không bảng nhiệm vụ / agenda) */
function ehNoPlan_(plan){ if (!plan) return true; var I = plan.info || {}; return !ehS_(I.name) && !(plan.tasks || []).length && !(plan.agenda || []).length && !(plan.sessions || []).length; }
/* tên việc: null = bỏ, chuỗi = tên (đã đổi nếu cần) */
function ehTaskFix_(title){
  var n = ehNorm_(title);
  if (/giam doc duyet ke hoach/.test(n)) return null;
  if (/^chia viec voi npp/.test(n)) return 'Phân công công việc';
  return title;
}
function ehFySrc_(ss){ var m = {}; try { ehRead_(ss, EH_SRC_TAB).forEach(function(r){ var id = ehS_(r.eventId); if (id && !m[id]) m[id] = { name: ehS_(r.name), url: ehS_(r.url) }; }); } catch(e){} return m; }
/* lý do không gửi sự kiện về app ('' = gửi) */
function ehFyHide_(e, nTask, src, plan){
  var st = ehS_(e.start).slice(0, 10), from = EH.FY_FROM;
  if (st && st < from) return 'Trước FY68 (' + st + ')';
  if (!st && !/^(APP|SAMPLE)$/.test(ehS_(e.src))) return 'Chưa có ngày';
  if (ehS_(e.src) === 'FILE' && !nTask){
    var fn = (src && src.name) || ehS_(e.name);
    if (ehIsJunkFile_(fn) || ehIsJunkFile_(e.name)) return 'File không phải kế hoạch sự kiện: ' + fn;
    if (!ehS_(e.offlineName) && plan !== undefined && ehNoPlan_(plan)) return 'File không đọc ra kế hoạch (không có tên sự kiện / nhiệm vụ), không có trong MKT Offline: ' + fn;
  }
  return '';
}
function ehFyTrim_(o, ss){
  var src = ehFySrc_(ss), nT = {};
  (o.tasks || []).forEach(function(t){ var k = ehS_(t.eventId); nT[k] = (nT[k] || 0) + 1; });
  var keep = {};
  o.events = (o.events || []).filter(function(e){ var id = ehS_(e.id); if (ehFyHide_(e, nT[id] || 0, src[id], (o.plan || {})[id] || null)) return false; keep[id] = 1; return true; });
  o.events.forEach(function(e){ var s = src[ehS_(e.id)]; if (s){ e.planName = s.name; if (!ehS_(e.planUrl)) e.planUrl = s.url; } });
  var byEv = function(x){ var id = ehS_(x.eventId); return !id || keep[id]; };
  ['tasks', 'files', 'log', 'comments', 'meetings', 'checkins', 'partners', 'pnotice', 'notify'].forEach(function(k){ if (o[k]) o[k] = o[k].filter(byEv); });
  var drop = {};
  o.tasks = (o.tasks || []).filter(function(t){ var x = ehTaskFix_(t.title); if (x === null){ drop[ehS_(t.id)] = 1; return false; } t.title = x; return true; });
  if (Object.keys(drop).length) o.tasks.forEach(function(t){ if (drop[ehS_(t.parentId)]) t.parentId = ''; });
  if (o.plan) Object.keys(o.plan).forEach(function(k){ if (!keep[k]) delete o.plan[k]; });
  o.fyFrom = EH.FY_FROM;
  return o;
}
function ehEvDiagApi_(p){
  var ss = ehBook_();
  if (String(p.key || '') !== ehKey_()){ var me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error: me.err }; if (!me.manager) return { ok:false, error:'Chỉ quản lý.' }; }
  var src = ehFySrc_(ss), tasks = ehRead_(ss, 'TASKS'), nT = {}, plan = {};
  ehRead_(ss, 'PLAN_JSON').forEach(function(r){ try { plan[ehS_(r.eventId)] = JSON.parse(r.json); } catch(e){ plan[ehS_(r.eventId)] = {}; } });
  tasks.forEach(function(t){ var k = ehS_(t.eventId); nT[k] = (nT[k] || 0) + 1; });
  var rows = ehRead_(ss, 'EVENTS').map(function(e){ var id = ehS_(e.id);
    return { id: id, name: ehS_(e.name).slice(0, 70), start: ehS_(e.start).slice(0, 10), src: ehS_(e.src), sample: ehS_(e.sample), file: (src[id] || {}).name || '', off: ehS_(e.offlineName).slice(0, 60),
             tasks: nT[id] || 0, hide: ehFyHide_(e, nT[id] || 0, src[id], plan[id] || null) }; });
  if (String(p.only || '') === 'hide') rows = rows.filter(function(r){ return r.hide; });
  if (String(p.only || '') === 'show') rows = rows.filter(function(r){ return !r.hide; });
  return { ok:true, from: EH.FY_FROM, n: rows.length, hidden: rows.filter(function(r){ return r.hide; }).length, rows: rows };
}
