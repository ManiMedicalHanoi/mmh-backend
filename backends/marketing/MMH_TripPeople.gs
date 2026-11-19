/* ══════════════ MMH_TripPeople.gs — người đề xuất công tác còn thiếu trong file Business Trip (19/11/2026) ══════════════
 * GIỐNG HỆT ở backoffice / management / marketing (sửa 1 nơi ⇒ chép sang nơi khác).
 * Vấn đề: người mới (vd. Mai — Accounting, mmh.account@manimedicalhanoi.com) chưa có dòng ở sheet Master của file
 *   "Vietnam - Business trip Approval and Report" ⇒ công thức email cột Y–AB của dòng đề xuất ra lỗi ⇒ không xác định được
 *   người duyệt; tên cũng không có trong danh sách chọn PIC / người đi cùng (Master!E2:E30).
 * rhxEnsurePeople_(): thêm người trong RHX_PEOPLE còn thiếu vào Master (CHỈ ghi ô trống, không sửa / xoá dòng đã có):
 *   · cột E (MMH Member & Distributor, ô trống đầu tiên trong E2:E30)
 *   · cột I:M (Name · PIC Email · Director Email · HOD Email · CC Email) — dòng ngay dưới dòng cuối có tên ở cột I
 * Chạy ở tripMaster / tripPropose (≤ 1 lần / 6 giờ / backend, CacheService).                                          */
var RHX_PEOPLE = [
  /* [tên PIC trên file Business Trip, email PIC, email Director, email HOD, CC (trống = chép CC của người cùng HOD)] */
  ['Mai', 'mmh.account@manimedicalhanoi.com', 'nt.ha@manimedicalhanoi.com', 'vtt.hoa@manimedicalhanoi.com', '']
];
function rhxEnsurePeople_(force){
  var c = CacheService.getScriptCache(), ck = 'rhx_people_v1';
  if(!force && c.get(ck)) return { ok:true, cached:true };
  var out = { ok:true, addedE:[], addedI:[] };
  var ms = SpreadsheetApp.openById(RHX.TRIP_SHEET_ID).getSheetByName('Master');
  if(!ms) return { ok:false, error:'Không thấy sheet Master' };
  var norm = function(x){ return String(x == null ? '' : x).trim().toLowerCase(); };
  /* cột E (danh sách chọn PIC / người đi cùng) */
  var E = ms.getRange(2, 5, 29, 1).getValues();
  RHX_PEOPLE.forEach(function(p){
    if(E.some(function(r){ return norm(r[0]) === norm(p[0]); })) return;
    for(var i = 0; i < E.length; i++){
      if(norm(E[i][0]) === ''){ ms.getRange(2 + i, 5).setValue(p[0]); E[i][0] = p[0]; out.addedE.push(p[0]); return; }
    }
    out.fullE = true;
  });
  /* cột I:M (email theo người) */
  var last = Math.max(2, ms.getLastRow());
  var I = ms.getRange(2, 9, last - 1, 5).getValues(), lastI = 1;
  for(var k = 0; k < I.length; k++) if(norm(I[k][0])) lastI = k + 2;
  RHX_PEOPLE.forEach(function(p){
    if(I.some(function(r){ return norm(r[0]) === norm(p[0]); })) return;
    var cc = p[4];
    if(!cc){ for(var j = 0; j < I.length; j++){ if(norm(I[j][3]).split('@')[0] === norm(p[3]).split('@')[0] && String(I[j][4] || '').trim()){ cc = String(I[j][4]).trim(); break; } } }
    lastI += 1;
    var cur = ms.getRange(lastI, 9, 1, 5).getValues()[0];
    if(cur.some(function(x){ return String(x == null ? '' : x).trim() !== ''; })) return;   /* không ghi đè ô có dữ liệu */
    ms.getRange(lastI, 9, 1, 5).setValues([[p[0], p[1], p[2], p[3], cc || '']]);
    I.push([p[0], p[1], p[2], p[3], cc || '']); out.addedI.push(p[0] + ' (dòng ' + lastI + ')');
  });
  if(out.addedE.length || out.addedI.length){
    SpreadsheetApp.flush();
    try{ c.remove('rhx_trip_master_v127'); }catch(e){}
    try{ if(typeof logActivity === 'function') logActivity('System', 'add', 'Business Trip ▸ Master: thêm ' + out.addedE.concat(out.addedI).join(', '), 'Lịch công tác', ''); }catch(e){}
  }
  try{ c.put(ck, '1', 21600); }catch(e){}
  return out;
}
