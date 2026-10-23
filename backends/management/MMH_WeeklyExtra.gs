/* ═══════════════════════════════════════════════════════════════════════════
 * MMH_WeeklyExtra.gs — v1.1 (23/10/2026)
 * GIỐNG HỆT NHAU ở marketing / backoffice / management (sửa 1 nơi ⇒ chép sang nơi khác).
 *
 * Báo cáo tuần (email + PDF) thêm khối "Đào tạo (Training Hub)": các buổi đào tạo
 * người báo cáo là trainer hoặc được mời, trong tuần báo cáo (kết quả) và tuần sau (kế hoạch).
 * Dữ liệu buổi đào tạo do app Report Hub gửi kèm lệnh weeklyReport (tham số `trn`, JSON,
 * lấy từ Training Hub rhSessions) ⇒ backend không cần quyền mới (không UrlFetch).
 * Công tác: đã có sẵn trong báo cáo (Key task "Lịch công tác MMYYYY" do ReportHub_Trip_Mail đồng bộ).
 * ═══════════════════════════════════════════════════════════════════════ */
function wxTrnList_(p){
  var a = p && p.trn;
  if (typeof a === 'string'){ try{ a = JSON.parse(a); }catch(e){ a = null; } }
  return Array.isArray(a) ? a.slice(0, 60) : [];
}
function wxTrnKey_(list, pic, from, to, isNext){
  var today = todayISO();
  var subs = [];
  list.forEach(function(t){
    var d = String(t.d || '').slice(0, 10);
    if (!d || d < from || d > to) return;
    var st = String(t.st || '');
    if (/cancel/i.test(st)) return;
    var done = /complet/i.test(st);
    if (isNext && done) return;
    var lines = [];
    if (t.tm) lines.push('Thời gian: ' + t.tm);
    lines.push('Vai trò: ' + (t.ro === 'tr' ? 'Trainer' : 'Học viên'));
    if (t.tr) lines.push('Trainer: ' + t.tr);
    var kind = [t.ty, t.ca].filter(function(x){ return x; }).join(' · ');
    if (kind) lines.push('Loại: ' + kind);
    if (t.pu) lines.push('Mục đích: ' + t.pu);
    if (t.au) lines.push('Học viên: ' + t.au);
    if (t.f)  lines.push('Tài liệu: ' + t.f);
    subs.push({ no:'', name:String(t.tp || 'Buổi đào tạo'), pic:pic, result:lines.join('\n'),
                start:d, planned:d, revised:'', actual:done ? d : '',
                status: done ? 'Completed' : (d < today ? 'Chờ cập nhật' : 'Kế hoạch'),
                progress: done ? 100 : 0, __noOd:true, __src:'Training Hub' });
  });
  if (!subs.length) return null;
  subs.sort(function(a, b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  subs.forEach(function(s, i){ s.no = 'ĐT.' + (i + 1); });
  var k = { no:'ĐT', keyTask:'Đào tạo (Training Hub)', type:'Training', pic:pic, __src:'Training Hub', subs:subs };
  k.__kpct = ktPctGS(k); k.__ksubs = subs.length;
  return k;
}
/* gắn khối đào tạo vào danh sách key task của 1 người nhận báo cáo */
function wxAppend_(keys, p, pic, from, to, isNext){
  try{
    var who = String(p && (p.trnPic || p.pic) || '').trim().toLowerCase();
    if (!who || who !== String(pic || '').trim().toLowerCase()) return keys;
    var k = wxTrnKey_(wxTrnList_(p), pic, from, to, isNext);
    return k ? keys.concat([k]) : keys;
  }catch(e){ return keys; }
}

/* ═══ v1.1 (23/10/2026): việc QUÁ HẠN tách thành mục riêng "Overdue tasks" ═══
   Trước: việc quá hạn chưa xong lặp lại ở cả "This week" lẫn "Plan for next week".
   Nay: sub quá hạn (isOverdueGS) rút khỏi 2 mục đó, gom (không trùng) vào mục ② Overdue tasks. */
function wxSplitOd_(keys){
  var keep = [], od = [];
  (keys || []).forEach(function(k){
    var a = [], b = [];
    (k.subs || []).forEach(function(s){ (isOverdueGS(s) ? b : a).push(s); });
    if (a.length) keep.push(wxWith_(k, a));
    if (b.length) od.push(wxWith_(k, b));
  });
  return { keep:keep, od:od };
}
function wxWith_(k, subs){ var o = {}; for (var x in k) o[x] = k[x]; o.subs = subs; return o; }
function wxMergeOd_(a, b){
  var out = [], by = {};
  a.concat(b).forEach(function(k){
    var id = (k.__src || '') + '|' + k.no, t = by[id];
    if (!t){ t = by[id] = wxWith_(k, []); t.__seen = {}; out.push(t); }
    k.subs.forEach(function(s){ var sid = String(s.no || s.name); if (!t.__seen[sid]){ t.__seen[sid] = 1; t.subs.push(s); } });
  });
  out.forEach(function(k){ delete k.__seen; k.subs.sort(function(x, y){ return String(x.revised || x.planned || '') < String(y.revised || y.planned || '') ? -1 : 1; }); });
  return out;
}
/* dùng trong sendWeeklyReport: { t: this week, n: next week, o: overdue } */
function wxOverdue_(thisKeys, nextKeys){
  var a = wxSplitOd_(thisKeys), b = wxSplitOd_(nextKeys);
  return { t:a.keep, n:b.keep, o:wxMergeOd_(a.od, b.od) };
}
function wxOdCount_(keys){ var n = 0; (keys || []).forEach(function(k){ n += (k.subs || []).length; }); return n; }
function wxOdEmail_(keys){
  if (!keys) return '';
  var n = wxOdCount_(keys);
  return '<h3 style="margin:18px 0 6px;font-size:12.5pt;color:#8A1C1C;border-left:4px solid #D9433F;padding-left:8px">② Overdue tasks — past deadline, not completed ('+n+')</h3>'+
    (n ? weeklyEmailTable(keys, false)
       : '<p style="margin:0 0 6px;color:#5A6A8A;font-size:10pt">No overdue task.</p>');
}
function wxOdPdf_(keys){
  if (!keys) return '';
  var n = weeklyPdfBlocks(keys, false);
  return '<div class="sec" style="border-left-color:#D9433F;background:#FFF3F3;color:#8A1C1C">② Overdue tasks — past deadline, not completed</div>'+
    '<div class="summary"><div class="sm od"><b>'+n.totalSubs+'</b>Overdue sub-tasks</div><div class="sm"><b>'+n.keyCount+'</b>Key tasks</div></div>'+
    (n.totalSubs ? n.blocks : '<p style="color:#5A6A8A;font-size:11px">No overdue task.</p>');
}
