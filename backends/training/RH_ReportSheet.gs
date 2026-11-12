/* ════════════════════════════════════════════════════════════════════════════════════════
   RH_ReportSheet.gs — v1.0 (12/11/2026) · TÌM SHEET BUỔI ĐÀO TẠO KHI TÊN SHEET BỊ ĐỔI
   ────────────────────────────────────────────────────────────────────────────────────────
   Sự cố 12/11/2026: sheet "Training Report FY67" trong MMH - Training Master không còn tên đó ⇒ mọi lệnh đọc / ghi buổi
   đào tạo báo "Không tìm thấy sheet: Training Report FY67" (Training Hub, CRM T&E, lịch Report Hub, KPI đào tạo).
   hubReportSheetName_() ⇒ tên sheet buổi đào tạo đang dùng:
     ① Script Property HUB_REPORT_SHEET (nếu sheet còn) · ② HUB.SHEETS.REPORT ("Training Report FY67")
     ③ dò mọi sheet có ĐÚNG bố cục Training Report của Hub: tiêu đề dòng 3 — F Training Type · G Training Category ·
        H Training Topic · J Trainer · L Status (Hub ghi theo số cột cố định nên bố cục phải khớp). Nhiều sheet ⇒ ưu tiên
        sheet có nhiều Session ID nhất, rồi số FY lớn nhất trong tên. Tìm được ⇒ nhớ ở HUB_REPORT_SHEET + ghi HUB_Log.
   Không tìm được ⇒ báo lỗi dễ hiểu (khôi phục bằng Lịch sử phiên bản của file Training Master).
   Đổi tên sheet lần sau: Hub tự nhận lại (bố cục giữ nguyên). Không dùng dịch vụ Google mới.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var HRS = { PROP: 'HUB_REPORT_SHEET' };

function hubReportLayoutOk_(sh) {
  try {
    if (sh.getLastColumn() < HUB.COL.STATUS) return false;
    var H = sh.getRange(3, 1, 1, HUB.COL.STATUS).getValues()[0].map(hubKey), C = HUB.COL;
    return H[C.TYPE - 1] === 'trainingtype' && H[C.CATEGORY - 1] === 'trainingcategory' && H[C.TOPIC - 1] === 'trainingtopic' &&
           H[C.TRAINER - 1] === 'trainer' && H[C.STATUS - 1] === 'status';
  } catch (e) { return false; }
}

function hubReportSheetName_() {
  if (HUB_MEM.reportName) return HUB_MEM.reportName;
  var ss = hubSS(), P = PropertiesService.getScriptProperties(), saved = P.getProperty(HRS.PROP) || '';
  var names = [saved, HUB.SHEETS.REPORT].filter(Boolean);
  for (var i = 0; i < names.length; i++) {
    var sh = ss.getSheetByName(names[i]);
    if (sh && (names[i] === HUB.SHEETS.REPORT || hubReportLayoutOk_(sh))) return (HUB_MEM.reportName = names[i]);
  }
  var best = null;
  ss.getSheets().forEach(function(s){
    var nm = s.getName();
    if (nm === HUB.TEST.SHEET || !hubReportLayoutOk_(s)) return;
    var lr = s.getLastRow(), sid = 0;
    if (lr >= HUB.DATA_START_ROW) {
      sid = s.getRange(HUB.DATA_START_ROW, HUB.COL.SID, lr - HUB.DATA_START_ROW + 1, 1).getValues()
             .filter(function(r){ return /^S\d{8}-\d+/.test(hubNorm(r[0])); }).length;
    }
    var fy = Number((/fy\s*(\d+)/i.exec(nm) || [])[1] || 0), named = /training\s*report/i.test(nm) ? 1 : 0;
    var score = [sid, named, fy];
    if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && (score[1] > best.score[1] || (score[1] === best.score[1] && score[2] > best.score[2]))))
      best = {name: nm, score: score};
  });
  if (!best) throw new Error('Không tìm thấy sheet buổi đào tạo "' + HUB.SHEETS.REPORT + '" trong file Training Master (có thể đã bị đổi tên hoặc xoá). ' +
                             'Admin: mở file Training Master ▸ Tệp ▸ Lịch sử phiên bản để khôi phục sheet.');
  if (best.name !== saved) {
    P.setProperty(HRS.PROP, best.name);
    hubLog('WARN', 'reportSheet', 'Không còn sheet "' + HUB.SHEETS.REPORT + '" ⇒ dùng sheet "' + best.name + '" (' + best.score[0] + ' Session ID)', saved ? 'trước: ' + saved : '');
  }
  return (HUB_MEM.reportName = best.name);
}

/* Sheet lịch / kế hoạch của hệ thống cũ (Mã.gs) cũng bị đổi tên cùng lúc (12/11/2026: "Training Report FY67  Calendar" ⇒
   "Training Report Calendar", "Training Plan FY67" ⇒ "Training Plan FY 67") ⇒ còn tên cũ thì dùng, không thì tìm theo tên. */
function hubSheetLike_(oldName, test) {
  var k = 'like:' + oldName;
  if (HUB_MEM[k]) return HUB_MEM[k];
  var ss = hubSS(), hit = '';
  if (ss.getSheetByName(oldName)) hit = oldName;
  else ss.getSheets().forEach(function(s){ if (!hit && test(hubNorm(s.getName()).toLowerCase().replace(/\s+/g, ' '))) hit = s.getName(); });
  return (HUB_MEM[k] = hit || oldName);
}
function hubOverviewSheetName_() { return hubSheetLike_('Training Report FY67  Calendar', function(n){ return /training report/.test(n) && /calendar/.test(n); }); }
function hubPlanSheetName_() { return hubSheetLike_('Training Plan FY67', function(n){ return /^training plan/.test(n) && !/calendar/.test(n); }); }
