/*************************************************************************************************
 * MMH — MKT_EventHubSheet.gs   (Event Hub v2.1 · 18/11/2026) — người dùng: "xem các header, style, đề mục ở các sheet thôi, tạo bố cục TRẮNG về mặt nội dung;
 *   điền dữ liệu trực tiếp trên sheet mới, hoặc điền từ app thì cũng được fill vào sheet. Đừng động đến bất kỳ dữ liệu nào đang có ở các sheet sự kiện."
 *  ① ehTplBlank_: làm trắng FILE MẪU (chỉ bản sao do hệ thống tạo trong folder "_MẪU file kế hoạch", tên bắt đầu "MẪU") — giữ tiêu đề, đề mục CHỮ HOA,
 *     dòng tiêu đề bảng (+ dòng tiêu đề phụ trước dòng dữ liệu đầu), công thức, định dạng, ô gộp, danh sách thả xuống; xoá chữ / số / ngày của sự kiện cũ.
 *     action ehFolders op=tplblank (quản lý / key). File kế hoạch của sự kiện đang có KHÔNG BAO GIỜ bị ghi.
 *  ② ehPlanFill_: app ⇒ file tổng — CHỈ file do hệ thống tạo cho sự kiện mới (Script Property EH_AUTOPLAN): ghi ô giá trị cạnh đề mục Overview
 *     (TÊN SỰ KIỆN, NGÀY TỔ CHỨC, ĐƠN VỊ TỔ CHỨC, ĐỊA ĐIỂM, HÌNH THỨC, MỤC ĐÍCH, ĐỐI TƯỢNG, SẢN PHẨM TRỌNG TÂM, NPP, QUY MÔ, BÁO CÁO VIÊN, KPI)
 *     lúc tạo sự kiện + mỗi lần sửa trên app. Sheet ⇒ app: lượt đồng bộ đọc file như mọi sự kiện (ô trống trong file không xoá thông tin app).
 *************************************************************************************************/
var EH_SHEET = { TPL_DIR: '_MẪU file kế hoạch', MAX_R: 400, MAX_C: 26 };

function ehIsLabel_(v){
  var s = String(v == null ? '' : v).trim();
  return !!s && s.length <= 60 && /[A-ZÀ-Ỹ]/.test(s) && s === s.toUpperCase() && !/^\d/.test(s);
}
/* chỉ cho làm trắng bản sao mẫu của hệ thống */
function ehTplSafe_(fileId){
  try {
    var f = DriveApp.getFileById(fileId); if (!/^MẪU/.test(f.getName())) return false;
    var ps = f.getParents(); while (ps.hasNext()){ if (ps.next().getName() === EH_SHEET.TPL_DIR) return true; }
  } catch(e){}
  return false;
}
function ehTplBlank_(fileId){
  if (!ehTplSafe_(fileId)) return { ok:false, error:'Chỉ làm trắng được file MẪU trong folder "' + EH_SHEET.TPL_DIR + '".' };
  var ss = SpreadsheetApp.openById(fileId), rep = [];
  ss.getSheets().forEach(function(sh){
    var lr = Math.min(sh.getLastRow(), EH_SHEET.MAX_R), lc = Math.min(sh.getLastColumn(), EH_SHEET.MAX_C);
    if (lr < 1 || lc < 1){ rep.push(sh.getName() + ': trống'); return; }
    var rg = sh.getRange(1, 1, lr, lc), V = rg.getValues(), F = rg.getFormulas(), D = rg.getDisplayValues();
    var ov = /^overview/i.test(ehNorm_(sh.getName())), hdr = -1, keepTo = -1;
    if (!ov){   /* dòng tiêu đề bảng = dòng đầu (≤ 8) có ≥ 3 ô chữ ngắn */
      for (var r = 0; r < Math.min(8, lr) && hdr < 0; r++){
        var t = D[r].filter(function(x, j){ return x && !F[r][j] && String(x).length <= 40 && !/^\d+([.,]\d+)?$/.test(x); });
        if (t.length >= 3) hdr = r;
      }
      keepTo = hdr;
      if (hdr >= 0){   /* dòng tiêu đề phụ: trước dòng dữ liệu đầu (cột No / STT có số) */
        var cNo = D[hdr].map(function(x){ return ehNorm_(x); }).indexOf('no'); if (cNo < 0) cNo = D[hdr].map(function(x){ return ehNorm_(x); }).indexOf('stt');
        if (cNo >= 0) for (var r2 = hdr + 1; r2 < Math.min(lr, hdr + 4); r2++){ if (/^\d/.test(D[r2][cNo])) break; if (D[r2].some(String)) keepTo = r2; }
      }
    }
    /* Overview: bảng nhiệm vụ (dòng có ≥ 3 đề mục CHỮ HOA, vd. HẠNG MỤC · CHI TIẾT · ĐƠN VỊ PHỤ TRÁCH) ⇒ dưới đó chỉ giữ đề mục ở cột đầu bảng */
    var tH = -1, tC = -1;
    if (!ov && hdr < 0) ov = true;   /* tab không có bảng rõ ràng ⇒ làm như Overview (giữ đề mục CHỮ HOA) */
    if (ov) for (var r3 = 0; r3 < lr && tH < 0; r3++){ var labs = []; D[r3].forEach(function(x, j3){ if (ehIsLabel_(x)) labs.push(j3); }); if (labs.length >= 3){ tH = r3; tC = labs[0]; } }
    var keepCell = function(i, j){
      if (!ov) return false;                                  /* bảng: dưới dòng tiêu đề xoá hết (trừ công thức) */
      if (tH >= 0 && i > tH) return j === tC && ehIsLabel_(D[i][j]);
      return ehIsLabel_(D[i][j]);
    };
    var cl = [], n = 0;
    for (var i = 0; i < lr; i++){
      var start = -1;
      for (var j = 0; j <= lc; j++){
        var kill = j < lc && i > (ov ? 0 : keepTo) && V[i][j] !== '' && V[i][j] !== null && !F[i][j] && !keepCell(i, j) && V[i][j] !== false;
        if (kill){ if (start < 0) start = j; n++; }
        else if (start >= 0){ cl.push(sh.getRange(i + 1, start + 1, 1, j - start).getA1Notation()); start = -1; }
      }
    }
    for (var k = 0; k < cl.length; k += 400) sh.getRangeList(cl.slice(k, k + 400)).clearContent();
    rep.push(sh.getName() + ': xoá ' + n + ' ô' + (hdr >= 0 ? ' (giữ đến dòng ' + (keepTo + 1) + ')' : ''));
  });
  PropertiesService.getScriptProperties().setProperty('EH_TPL_BLANK_' + fileId, ehNow_());
  return { ok:true, file: ss.getName(), url: ss.getUrl(), sheets: rep };
}

/* ── app ⇒ file tổng (chỉ file hệ thống tạo) ── */
function ehAutoPlans_(){ try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('EH_AUTOPLAN') || '{}'); } catch(e){ return {}; } }
function ehAutoPlanAdd_(id){ var m = ehAutoPlans_(); m[id] = ehNow_(); PropertiesService.getScriptProperties().setProperty('EH_AUTOPLAN', JSON.stringify(m)); }
var EH_FILL = [['ten su kien', 'name'], ['ngay to chuc', '_date'], ['don vi to chuc', 'organizer'], ['dia diem', '_venue'], ['hinh thuc su kien', '_format'],
  ['muc dich su kien', 'purpose'], ['doi tuong huong toi', 'audience'], ['san pham trong tam', 'products'], ['npp tham du', 'npp'], ['quy mo', 'scale'],
  ['bao cao vien', 'speakers'], ['kpi', 'kpi']];
function ehFillVal_(ev, k){
  var f = function(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ehS_(iso)); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  if (k === '_date'){ var a = f(ev.start), b = f(ev.end); return a ? (b && b !== a ? a + ' - ' + b : a) : ''; }
  if (k === '_venue') return [ehS_(ev.venue), ehS_(ev.city)].filter(String).join(' · ');
  if (k === '_format') return ehS_(ev.format) || ehS_(ev.type);
  return ehS_(ev[k]);
}
/* keys = danh sách trường app vừa đổi (trống = mọi trường) */
function ehPlanFill_(ev, keys){
  var id = ehS_(ev.planFileId); if (!id || !ehAutoPlans_()[id]) return 0;
  var ss; try { ss = SpreadsheetApp.openById(id); } catch(e){ return 0; }
  var sh = null; ss.getSheets().forEach(function(x){ if (!sh && /^overview/i.test(ehNorm_(x.getName()))) sh = x; }); if (!sh) return 0;
  var lr = Math.min(sh.getLastRow(), 40), lc = Math.min(sh.getLastColumn(), 12); if (lr < 1 || lc < 2) return 0;
  var D = sh.getRange(1, 1, lr, lc).getDisplayValues(), F = sh.getRange(1, 1, lr, lc).getFormulas(), n = 0, want = keys && keys.length ? keys : null;
  var map = {}; EH_FILL.forEach(function(x){ map[x[0]] = x[1]; });
  var dep = { _date: ['start', 'end'], _venue: ['venue', 'city'], _format: ['format', 'type'] };
  for (var i = 0; i < lr; i++) for (var j = 0; j < lc - 1; j++){
    var k = map[ehNorm_(D[i][j])]; if (!k) continue;
    if (want && !(dep[k] || [k]).some(function(x){ return want.indexOf(x) >= 0; })) continue;
    var cell = sh.getRange(i + 1, j + 1), mr = cell.getMergedRanges(), w = mr.length ? mr[0].getNumColumns() : 1, c = j + w;
    if (c >= lc || map[ehNorm_(D[i][c])] || F[i][c]) continue;
    var v = ehFillVal_(ev, k); if (String(D[i][c]) === v) continue;
    sh.getRange(i + 1, c + 1).setValue(v); n++;
  }
  return n;
}
