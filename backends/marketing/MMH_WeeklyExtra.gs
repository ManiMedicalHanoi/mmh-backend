/* ═══════════════════════════════════════════════════════════════════════════
 * MMH_WeeklyExtra.gs — v1.0 (23/10/2026)
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
