/*************************************************************************************************
 * MMH — MKT_EventHub.gs   (v1.1 · 31/10/2026) — backend của app "Sự kiện MKT" (repo ManiMedicalHanoi/MMH-Event-MKTOnline)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Kho dữ liệu: 1 Google Sheet "MMH · Event Hub FY68" + thư mục "Event Hub · Tệp tải lên", TỰ TẠO trong thư mục Event FY68
 * (EH.ROOT) ở lần chạy đầu (ID nhớ ở Script Property EH_BOOK / EH_FILES). Tab:
 *   EVENTS · TASKS · FILES · LOG          — dữ liệu app (app ghi qua ehSave / ehUpload)
 *   TEMPLATE · TEAM                       — mẫu việc (task lớn / task phụ, loại bằng chứng) + người mặc định theo vai trò, quản lý
 *   PLAN_JSON + Nhiệm vụ · Chương trình · Khuyến mại · Agenda · Nhân sự · Đồ MKT · Quà NPP · Kết quả · Gian hàng
 *                                         — đọc từ các FILE KẾ HOẠCH (Google Sheet tên "yyyymmdd[-dd]_…") trong thư mục Event FY68
 *   NGUỒN FILE                            — file nào đã đọc, lúc nào, đọc được gì, lỗi gì
 * Sự kiện = file kế hoạch (khớp với sự kiện cùng ngày ở PLAN_EVENT / REPORT_EVENT của file MKT Offline) + sự kiện chỉ có ở file Offline.
 * Sự kiện mới (có ngày, chưa diễn ra) ⇒ tạo việc theo TEMPLATE (EH_GEN): task lớn = hạng mục, task phụ = việc cụ thể có "Bằng chứng"
 * (file · ảnh · link · không). Chuyển "Xong" khi việc cần bằng chứng mà chưa nộp ⇒ từ chối.
 * Quyền (phiên email `tk` do Training Hub ký — tfWho_ ở MMH_TripFlow.gs): xem = mọi người đăng nhập; quản lý (Admin / Director / HOD /
 * TEAM ▸ Quản lý) + Owner của sự kiện: sửa sự kiện, giao việc, đổi hạn, thêm / xoá việc; người phụ trách việc: trạng thái, ghi chú, nộp file / link.
 * Đồng bộ: evsSyncTick (10 phút) ⇒ ehSyncTick_ · action ehSync (mode=status chỉ xem) · tay: ehSyncNow().
 * Không dùng dịch vụ mới (SpreadsheetApp / DriveApp / Properties / Cache / Lock / MailApp qua mmhMail_ / ScriptApp) ⇒ không phải cấp quyền lại.
 * v1.1: email giao việc / chờ duyệt / bình luận / nhắc việc hằng ngày, tạo sự kiện trên app, dữ liệu mẫu — xem MKT_EventHubPlus.gs.
 * v1.2: dữ liệu file MKT Offline (REPORT_EVENT, đếm CUSTOMER LIST) + file Digital (EVENT REPORT, ORDER REPORT) theo sự kiện — xem MKT_EventHubLink.gs.
 *************************************************************************************************/
var EH = {
  VER: '1.2',
  ROOT: '1maHn2DD34aJBaNnH4q9Di0YH2wMurYuZ',     /* thư mục Drive "Event FY68" */
  BOOK_NAME: 'MMH · Event Hub FY68 (dữ liệu app Sự kiện MKT)',
  FILES_NAME: 'Event Hub · Tệp tải lên',
  APP_URL: 'https://manimedicalhanoi.github.io/MMH-Event-MKTOnline/',
  FY_FROM: '2026-09-01', FY_TO: '2027-08-31',
  MAX_MB: 25,
  BUDGET: 150000,                 /* chạy chung lượt evsSyncTick (giới hạn 6 phút) */
  ROLES: ['Owner', 'Digital', 'Design', 'Trade', 'Sales'],
  STATUS: ['Chưa làm', 'Đang làm', 'Chờ duyệt', 'Xong', 'Bỏ qua'],
  COLS: {
    EVENTS: ['id', 'name', 'start', 'end', 'type', 'city', 'venue', 'organizer', 'format', 'purpose', 'audience', 'scale', 'speakers', 'fee',
             'npp', 'sales', 'kpi', 'products', 'state', 'follow', 'Owner', 'Digital', 'Design', 'Trade', 'Sales', 'planFileId', 'planUrl',
             'folderId', 'folderUrl', 'src', 'offlineName', 'dateWarn', 'note', 'updatedAt', 'updatedBy',
             'cover', 'target', 'actual', 'budgetPlan', 'budgetActual', 'sample'],
    TASKS: ['id', 'eventId', 'parentId', 'group', 'title', 'role', 'pic', 'due', 'offset', 'unit', 'dueManual', 'status', 'proof', 'hint', 'note', 'order',
            'doneAt', 'updatedAt', 'updatedBy', 'createdBy', 'priority', 'sample'],
    FILES: ['id', 'eventId', 'taskId', 'kind', 'name', 'url', 'driveId', 'mime', 'size', 'by', 'at', 'note', 'thumb', 'sample'],
    COMMENTS: ['id', 'eventId', 'taskId', 'by', 'at', 'text', 'mentions', 'sample'],
    NOTIFY: ['at', 'to', 'kind', 'eventId', 'taskId', 'subject', 'ok', 'by'],
    LOG: ['at', 'by', 'action', 'eventId', 'taskId', 'text'],
    TEMPLATE: ['kind', 'group', 'title', 'role', 'proof', 'offset', 'unit', 'apply', 'hint'],
    TEAM: ['role', 'people', 'note'],
    PLAN_JSON: ['eventId', 'fileId', 'readAt', 'json'],
    SRC: ['fileId', 'name', 'url', 'updated', 'parsed', 'readAt', 'eventId', 'found', 'issue']
  }
};
var EH_SRC_TAB = 'NGUỒN FILE';
/* mẫu việc mặc định (SOP MMHSOP_0XX) — sửa trong tab TEMPLATE của file Event Hub */
var EH_TPL = [
  ['Task lớn', '1. Kế hoạch & phê duyệt', 'Kế hoạch & phê duyệt', 'Owner', '', '', '', 'Tất cả', ''],
  ['Task phụ', '1. Kế hoạch & phê duyệt', 'File kế hoạch tổng quan (Overview, nhân sự, checklist)', 'Owner', 'link', -30, 'Lịch', 'Tất cả', 'Dán link Google Sheet kế hoạch'],
  ['Task phụ', '1. Kế hoạch & phê duyệt', 'Giám đốc duyệt kế hoạch + ngân sách', 'Owner', '', -28, 'Lịch', 'Tất cả', ''],
  ['Task lớn', '2. KOL & đối tác', 'KOL & đối tác', 'Owner', '', '', '', 'Tất cả', ''],
  ['Task phụ', '2. KOL & đối tác', 'Hợp đồng KOL + lịch di chuyển', 'Owner', 'file', -30, 'Lịch', 'Tất cả', 'PDF hợp đồng / lịch trình'],
  ['Task phụ', '2. KOL & đối tác', 'Chia việc với NPP, Trường / Viện', 'Owner', '', -30, 'Lịch', 'Tất cả', ''],
  ['Task phụ', '2. KOL & đối tác', 'Họp với NPP (agenda, nhân sự, bán hàng)', 'Owner', 'file', -3, 'Lịch', 'Tất cả', 'Biên bản họp'],
  ['Task lớn', '3. Tuyển sinh', 'Tuyển sinh', 'Digital', '', '', '', 'Tất cả', ''],
  ['Task phụ', '3. Tuyển sinh', 'Form đăng ký (khảo sát trước, đồng ý dữ liệu)', 'Digital', 'link', -30, 'Lịch', 'Tất cả', 'Link Google Form'],
  ['Task phụ', '3. Tuyển sinh', 'Nhóm Zalo khách tham dự', 'Digital', 'link', -30, 'Lịch', 'Tất cả', 'Link nhóm'],
  ['Task phụ', '3. Tuyển sinh', 'Sales / NPP gửi đủ thông tin khách đăng ký hộ', 'Sales', '', -5, 'Lịch', 'Tất cả', ''],
  ['Task phụ', '3. Tuyển sinh', 'Rà soát danh sách khách trước sự kiện', 'Digital', 'file', -3, 'Lịch', 'Tất cả', 'Danh sách check-in'],
  ['Task lớn', '4. Truyền thông', 'Truyền thông', 'Digital', '', '', '', 'Tất cả', ''],
  ['Task phụ', '4. Truyền thông', 'Bài đăng teaser', 'Digital', 'link', -14, 'Lịch', 'Tất cả', 'Link bài đăng Facebook'],
  ['Task phụ', '4. Truyền thông', 'Bài giới thiệu chương trình / KOL', 'Digital', 'link', -10, 'Lịch', 'Tất cả', 'Link bài đăng Facebook'],
  ['Task phụ', '4. Truyền thông', 'Bài đếm ngược', 'Digital', 'link', -3, 'Lịch', 'Tất cả', 'Link bài đăng Facebook'],
  ['Task phụ', '4. Truyền thông', 'Bài cảm ơn + ảnh recap', 'Digital', 'link', 1, 'Làm việc', 'Tất cả', 'Link bài đăng Facebook'],
  ['Task phụ', '4. Truyền thông', 'Video recap highlight', 'Digital', 'link', 2, 'Làm việc', 'Tất cả', 'Link video'],
  ['Task lớn', '5. Thiết kế ấn phẩm', 'Thiết kế ấn phẩm', 'Design', '', '', '', 'Tất cả', ''],
  ['Task phụ', '5. Thiết kế ấn phẩm', 'Key visual / poster sự kiện', 'Design', 'file', -21, 'Lịch', 'Tất cả', 'PDF hoặc ảnh'],
  ['Task phụ', '5. Thiết kế ấn phẩm', 'Backdrop / vách gian hàng', 'Design', 'file', -10, 'Lịch', 'Trực tiếp', 'PDF in ấn'],
  ['Task phụ', '5. Thiết kế ấn phẩm', 'Standee', 'Design', 'file', -10, 'Lịch', 'Trực tiếp', 'PDF in ấn'],
  ['Task phụ', '5. Thiết kế ấn phẩm', 'Flyer / brochure / CTKM', 'Design', 'file', -10, 'Lịch', 'Tất cả', 'PDF'],
  ['Task phụ', '5. Thiết kế ấn phẩm', 'Thẻ đeo, bảng tên, biểu mẫu check-in', 'Design', 'file', -7, 'Lịch', 'Trực tiếp', 'PDF'],
  ['Task lớn', '6. Hậu cần & gian hàng', 'Hậu cần & gian hàng', 'Trade', '', '', '', 'Trực tiếp', ''],
  ['Task phụ', '6. Hậu cần & gian hàng', 'Đặt địa điểm / gian hàng', 'Trade', 'file', -30, 'Lịch', 'Trực tiếp', 'Báo giá / hợp đồng'],
  ['Task phụ', '6. Hậu cần & gian hàng', 'Chốt setup, tea break, kỹ thuật', 'Trade', '', -14, 'Lịch', 'Trực tiếp', ''],
  ['Task phụ', '6. Hậu cần & gian hàng', 'Đồ MKT + đồ thực hành + quà tạm ứng NPP', 'Trade', '', -10, 'Lịch', 'Trực tiếp', ''],
  ['Task phụ', '6. Hậu cần & gian hàng', 'Gửi đồ đi tỉnh', 'Trade', 'file', -7, 'Lịch', 'Ngoài Hà Nội', 'Phiếu gửi hàng'],
  ['Task phụ', '6. Hậu cần & gian hàng', 'Set up hoàn thiện (ảnh gian hàng)', 'Trade', 'image', -1, 'Lịch', 'Trực tiếp', 'Ảnh chụp'],
  ['Task lớn', '7. Ngày D', 'Ngày D', 'Owner', '', '', '', 'Tất cả', ''],
  ['Task phụ', '7. Ngày D', 'Check-in có chữ ký (webinar: báo cáo Zoom)', 'Digital', 'file', 0, 'Lịch', 'Tất cả', 'Scan danh sách ký / file Zoom'],
  ['Task phụ', '7. Ngày D', 'Ảnh / video sự kiện', 'Digital', 'image', 0, 'Lịch', 'Tất cả', 'Ảnh đẹp nhất'],
  ['Task phụ', '7. Ngày D', 'Khảo sát QR trước bế mạc', 'Digital', 'link', 0, 'Lịch', 'Tất cả', 'Link kết quả khảo sát'],
  ['Task phụ', '7. Ngày D', 'Bán hàng tại sự kiện', 'Sales', '', 0, 'Lịch', 'Trực tiếp', ''],
  ['Task lớn', '8. Sau sự kiện', 'Sau sự kiện', 'Owner', '', '', '', 'Tất cả', ''],
  ['Task phụ', '8. Sau sự kiện', 'Đối chiếu dữ liệu khách ⇒ CUSTOMER LIST', 'Digital', 'link', 3, 'Làm việc', 'Tất cả', 'Link file đã đối chiếu'],
  ['Task phụ', '8. Sau sự kiện', 'Kiểm kê quà tạm ứng NPP', 'Trade', '', 3, 'Làm việc', 'Trực tiếp', ''],
  ['Task phụ', '8. Sau sự kiện', 'Báo cáo sự kiện', 'Owner', 'file', 5, 'Làm việc', 'Tất cả', 'PDF / link báo cáo'],
  ['Task phụ', '8. Sau sự kiện', 'Email báo cáo toàn MMH', 'Owner', '', 7, 'Làm việc', 'Tất cả', ''],
  ['Task lớn', '9. Follow-up', 'Follow-up khách', 'Sales', '', '', '', 'Tất cả', ''],
  ['Task phụ', '9. Follow-up', 'Liên hệ lần đầu khách quan tâm', 'Sales', '', 5, 'Làm việc', 'Tất cả', ''],
  ['Task phụ', '9. Follow-up', 'Kết quả chuyển đổi đơn hàng', 'Sales', '', 20, 'Làm việc', 'Tất cả', '']
];
var EH_TEAM = [['Owner', '', 'Người điều phối mặc định cho sự kiện mới'], ['Digital', '', ''], ['Design', '', ''], ['Trade', '', ''], ['Sales', '', ''],
               ['Quản lý', '', 'Thêm người có quyền quản lý mọi sự kiện (ngoài Admin / Director / HOD), cách nhau bởi dấu phẩy']];

/* ── tiện ích ── */
function ehS_(v){ return v == null ? '' : (v instanceof Date ? ehIso_(v) : String(v).trim()); }
function ehIso_(d){ return (d instanceof Date && !isNaN(d.getTime())) ? Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : ''; }
function ehDate_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function ehNow_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss"); }
function ehId_(p){ return p + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function ehNorm_(s){ return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim(); }   /* giữ dấu cách (≠ evsNorm_) */
function ehWords_(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').split(/[^a-z0-9]+/).filter(function(w){ return w.length > 2; }); }
function ehAddWork_(d, n, holi){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()), k = 0; while (k < n){ x.setDate(x.getDate() + 1); var w = x.getDay(); if (w && w !== 6 && !holi[ehIso_(x)]) k++; } return x; }
function ehHoli_(){ var h = {}; try { (RPL_CAL.VN['2026'] ? RPL_CAL.VN['2026'].off : []).forEach(function(md){ h['2026-' + md] = 1; }); } catch(e){} return h; }
function ehDue_(ev, offset, unit){
  if (offset === '' || offset == null || !ev.start) return '';
  var n = Number(offset), s = ehDate_(ev.start), e = ehDate_(ev.end || ev.start);
  if (!(s instanceof Date)) return '';
  if (n <= 0){ s.setDate(s.getDate() + n); return ehIso_(s); }
  if (unit === 'Làm việc') return ehIso_(ehAddWork_(e, n, ehHoli_()));
  e.setDate(e.getDate() + n); return ehIso_(e);
}

/* ── sổ dữ liệu ── */
function ehBook_(){
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty('EH_BOOK'), ss = null;
  if (id){ try { ss = SpreadsheetApp.openById(id); } catch(e){ ss = null; } }
  if (!ss){
    ss = SpreadsheetApp.create(EH.BOOK_NAME);
    try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(EH.ROOT)); } catch(e){}
    pr.setProperty('EH_BOOK', ss.getId());
  }
  ehEnsureTabs_(ss);
  return ss;
}
function ehEnsureTabs_(ss){
  var plan = ehPlanTabs_(), want = [['EVENTS'], ['TASKS'], ['FILES'], ['COMMENTS'], ['TEMPLATE'], ['TEAM'], ['LOG'], ['NOTIFY'], ['PLAN_JSON'], [EH_SRC_TAB, 'SRC']];
  plan.forEach(function(t){ want.push([t.name, null, t.cols]); });
  want.forEach(function(w){
    var name = w[0], cols = w[2] || EH.COLS[w[1] || name], sh = ss.getSheetByName(name);
    if (!sh){
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#003047').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
      if (name === 'TEMPLATE') sh.getRange(2, 1, EH_TPL.length, cols.length).setValues(EH_TPL);
      if (name === 'TEAM') sh.getRange(2, 1, EH_TEAM.length, cols.length).setValues(EH_TEAM);
      if (name === 'PLAN_JSON') sh.hideSheet();
    } else if (!w[2] && sh.getLastColumn() < cols.length){   /* v1.1: tab cũ thiếu cột mới ⇒ ghi lại dòng tiêu đề (cột mới luôn thêm ở cuối) */
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#003047').setFontColor('#FFFFFF');
    }
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def && ss.getSheets().length > 1){ try { ss.deleteSheet(def); } catch(e){} }
}
function ehFilesRoot_(){
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty('EH_FILES');
  if (id){ try { return DriveApp.getFolderById(id); } catch(e){} }
  var f = DriveApp.getFolderById(EH.ROOT).createFolder(EH.FILES_NAME);
  pr.setProperty('EH_FILES', f.getId());
  return f;
}
/* đọc 1 tab ⇒ [{…, _r: số dòng}] theo tiêu đề dòng 1 */
function ehRead_(ss, name){
  var sh = ss.getSheetByName(name); if (!sh) return [];
  var last = sh.getLastRow(), lc = sh.getLastColumn(); if (last < 2 || lc < 1) return [];
  var V = sh.getRange(1, 1, last, lc).getValues(), H = V[0].map(ehS_), out = [];
  for (var i = 1; i < V.length; i++){
    if (!V[i].some(function(x){ return x !== '' && x != null; })) continue;
    var o = { _r: i + 1 }; H.forEach(function(h, j){ if (h) o[h] = V[i][j] instanceof Date ? ehIso_(V[i][j]) : V[i][j]; }); out.push(o);
  }
  return out;
}
function ehRow_(cols, o){ return cols.map(function(c){ var v = o[c]; return v == null ? '' : v; }); }
function ehAppend_(ss, name, cols, objs){
  if (!objs.length) return;
  var sh = ss.getSheetByName(name), r = sh.getLastRow() + 1;
  sh.getRange(r, 1, objs.length, cols.length).setValues(objs.map(function(o){ return ehRow_(cols, o); }));
}
function ehPut_(ss, name, cols, o){ ss.getSheetByName(name).getRange(o._r, 1, 1, cols.length).setValues([ehRow_(cols, o)]); }
function ehRewrite_(ss, name, cols, objs){
  var sh = ss.getSheetByName(name), last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, Math.max(cols.length, sh.getLastColumn())).clearContent();
  if (objs.length) sh.getRange(2, 1, objs.length, cols.length).setValues(objs.map(function(o){ return ehRow_(cols, o); }));
}
function ehLog_(ss, me, action, evId, taskId, text){
  try { ehAppend_(ss, 'LOG', EH.COLS.LOG, [{ at: ehNow_(), by: me && me.pic || 'Hệ thống', action: action, eventId: evId || '', taskId: taskId || '', text: String(text || '').slice(0, 500) }]); } catch(e){}
}

/* ══════════════ ĐỌC FILE KẾ HOẠCH (bản JS của docs/event-hub/parse_events.py) ══════════════ */
function ehGrid_(sh){
  var mr = Math.min(sh.getLastRow(), 400), mc = Math.min(sh.getLastColumn(), 20);
  if (mr < 1 || mc < 1) return [];
  var rg = sh.getRange(1, 1, mr, mc), V = rg.getDisplayValues();
  var g = V.map(function(r){ return r.map(function(x){ return String(x == null ? '' : x).trim(); }); });
  try {
    rg.getMergedRanges().forEach(function(m){
      var v = g[m.getRow() - 1] ? g[m.getRow() - 1][m.getColumn() - 1] : '';
      for (var r = m.getRow(); r <= Math.min(m.getLastRow(), mr); r++)
        for (var c = m.getColumn(); c <= Math.min(m.getLastColumn(), mc); c++) g[r - 1][c - 1] = v;
    });
  } catch(e){}
  return g;
}
function ehHdr_(g, must, from){
  must = must.map(ehNorm_);
  for (var i = from || 0; i < g.length; i++){
    var row = g[i].map(ehNorm_);
    if (must.every(function(m){ return row.some(function(x){ return x === m || x.indexOf(m) === 0; }); })) return i;
  }
  return -1;
}
function ehCol_(hdr, names){
  var h = hdr.map(ehNorm_);
  for (var k = 0; k < names.length; k++){ var n = ehNorm_(names[k]); for (var j = 0; j < h.length; j++) if (h[j] === n || h[j].indexOf(n) === 0) return j; }
  return -1;
}
function ehTable_(g, must, cols, carry){
  var h = ehHdr_(g, must); if (h < 0) return [];
  var idx = {}; Object.keys(cols).forEach(function(k){ idx[k] = ehCol_(g[h], cols[k]); });
  var out = [], last = {};
  for (var i = h + 1; i < g.length; i++){
    var row = g[i];
    if (!row.some(function(x){ return x; })){ if (out.length) break; else continue; }
    var rec = {}; Object.keys(idx).forEach(function(k){ rec[k] = idx[k] >= 0 && idx[k] < row.length ? row[idx[k]] : ''; });
    (carry || []).forEach(function(k){ if (rec[k]) last[k] = rec[k]; else rec[k] = last[k] || ''; });
    out.push(rec);
  }
  return out;
}
var EH_OV = { 'ten su kien':'name', 'ngay to chuc':'dateText', 'don vi to chuc':'organizer', 'dia diem':'venue', 'thoi gian':'time', 'so luong khach':'guests',
  'hinh thuc su kien':'format', 'muc dich su kien':'purpose', 'doi tuong huong toi':'audience', 'quy mo':'scale', 'bao cao vien':'speakers',
  'dang ky phi':'fee', 'npp tham du':'npp', 'san pham trong tam':'products', 'sale mmh ho tro':'sales', 'doi tac to chuc':'partner', 'kpi':'kpi' };
function ehOverview_(g){
  var info = {}, tasks = [];
  g.slice(0, 30).forEach(function(row){
    row.forEach(function(cell, j){
      var k = EH_OV[ehNorm_(cell)];
      if (k && !(k in info)){ for (var x = j + 1; x < row.length; x++) if (row[x] && row[x] !== cell){ info[k] = row[x]; break; } if (!(k in info)) info[k] = ''; }
    });
  });
  var h = ehHdr_(g, ['hạng mục', 'chi tiết']);
  if (h >= 0){
    var H = g[h], cg = ehCol_(H, ['hạng mục']), cd = ehCol_(H, ['chi tiết']), cp = ehCol_(H, ['đơn vị phụ trách']), cn = ehCol_(H, ['ghi chú']), grp = '';
    for (var i = h + 1; i < g.length; i++){
      var row = g[i];
      if (!row.some(function(x){ return x; })){ if (tasks.length) break; else continue; }
      var vals = {}; row.forEach(function(x){ if (x) vals[x] = 1; });
      var vk = Object.keys(vals);
      if (vk.length === 1 && ehNorm_(vk[0]).indexOf('chuong trinh khuyen mai') === 0) break;
      grp = row[cg] || grp; var d = cd >= 0 ? row[cd] : ''; if (!d) continue;
      var notes = cn >= 0 ? row.slice(cn).filter(function(x, k, a){ return x && a.indexOf(x) === k; }) : [];
      tasks.push({ group: grp, detail: d, owner: cp >= 0 ? row[cp] : '', note: notes.join(' / ') });
    }
  }
  return { info: info, tasks: tasks };
}
function ehStaff_(g){
  var h = ehHdr_(g, ['công ty', 'họ tên']); if (h < 0) return [];
  var H = g[h], cc = ehCol_(H, ['công ty']), cn = ehCol_(H, ['họ tên']), cnote = ehCol_(H, ['ghi chú']), cno = Math.max(ehCol_(H, ['no', 'stt']), 0);
  var start = h + 1; while (start < g.length && !/^\d/.test(g[start][cno] || '')) start++;
  var phases = {};
  for (var j = cn + 1; j < (cnote > 0 ? cnote : H.length); j++){
    var labs = []; for (var r = h + 1; r < start; r++){ var v = g[r][j]; if (v && v !== H[j] && labs.indexOf(v) < 0) labs.push(v); }
    phases[j] = labs.join(' · ').replace(/\n/g, ' ');
  }
  var out = [];
  for (var i = start; i < g.length; i++){
    var row = g[i]; if (!row.slice(cno + 1).some(function(x){ return x; })) continue;
    if (!(row[cc] || row[cn])) continue;
    var ts = []; Object.keys(phases).forEach(function(j){ if (row[j]) ts.push({ phase: phases[j], task: row[j] }); });
    out.push({ company: row[cc], name: row[cn], tasks: ts, note: cnote > 0 ? row[cnote] : '' });
  }
  return out;
}
function ehSessions_(g){
  var h = ehHdr_(g, ['hạng mục']); if (h < 0) return [];
  var H = g[h], c0 = ehCol_(H, ['hạng mục']), out = [];
  for (var j = c0 + 1; j < H.length; j++){
    if (!H[j] || H[j] === H[c0]) continue;
    var s = { session: H[j] };
    for (var i = h + 1; i < g.length; i++) if (g[i][c0] && g[i][j]) s[g[i][c0]] = g[i][j];
    out.push(s);
  }
  return out;
}
function ehKV_(g){ var o = {}; g.forEach(function(r){ var x = r.filter(function(v){ return v; }); if (x.length >= 2) o[x[0]] = x[1]; }); return o; }
function ehParsePlan_(ss){
  var ev = { info: {}, tasks: [], promo: [], activities: [], sessions: [], staff: [], agenda: [], checklist: [], booth: {}, gifts: [], results: [], mc: [] };
  ss.getSheets().forEach(function(sh){
    var t = ehNorm_(sh.getName()), g = ehGrid_(sh); if (!g.length) return;
    if (t.indexOf('overview') === 0){ var o = ehOverview_(g); ev.info = o.info; ev.tasks = o.tasks; }
    if (t.indexOf('overview') === 0 || t.indexOf('activities') === 0){
      var promo = ehTable_(g, ['sản phẩm', 'chương trình khuyến mại'], { product:['sản phẩm'], offer:['chương trình khuyến mại'], gift:['quà tặng'], qty:['sl quà'], note:['ghi chú'] });
      ev.promo = ev.promo.concat(promo.filter(function(p){ return p.product; }));
      if (t.indexOf('activities') === 0){
        var act = ehTable_(g, ['hoạt động', 'thời lượng'], { title:['hoạt động'], duration:['thời lượng'], content:['nội dung'], pic:['pic'], note:['ghi chú'] });
        ev.activities = ev.activities.concat(act.filter(function(a){ return a.title; }));
        if (!promo.length && !act.length) ev.sessions = ev.sessions.concat(ehSessions_(g));
      }
    } else if (t.indexOf('staff') >= 0 || t.indexOf('nhan su') === 0){
      ev.staff = ev.staff.concat(ehStaff_(g));
    } else if (t.indexOf('checklist') === 0){
      ev.checklist = ev.checklist.concat(ehTable_(g, ['marketing material'], { no:['stt'], group:['group'], category:['category'], item:['marketing material'], unit:['unit'],
        qty:['quantity'], note:['note'], pic:['pic'], status:['status'] }, ['no', 'group', 'category']).filter(function(r){ return r.item; }));
    } else if (t.indexOf('agenda') === 0){
      ev.agenda = ev.agenda.concat(ehTable_(g, ['detail', 'pic'], { no:['no'], date:['date'], kind:['kind'], time:['time'], detail:['detail'], pic:['pic'], note:['note'] },
        ['no', 'date', 'kind']).filter(function(r){ return r.detail; }));
    } else if (t.indexOf('booth') === 0){
      ev.booth = ehKV_(g);
    } else if (t.indexOf('qua ung') === 0){
      ev.gifts = ev.gifts.concat(ehTable_(g, ['nhà phân phối'], { npp:['nhà phân phối'], item:['sản phẩm'], advance:['tổng tạm ứng'], used:['tổng xuất'], diff:['chênh lệch'],
        status:['tình trạng'] }, ['npp']).filter(function(r){ return r.item; }));
    } else if (t.indexOf('report') === 0){
      ev.results = ev.results.concat(ehTable_(g, ['chỉ số'], { no:['stt'], metric:['chỉ số'], unit:['đơn vị'], actual:['thực đạt'], note:['ghi chú'] }, ['no']).filter(function(r){ return r.metric; }));
    } else if (t.indexOf('kich ban') >= 0){
      ev.mc = ev.mc.concat(ehTable_(g, ['thời gian', 'hoạt động'], { time:['thời gian'], activity:['hoạt động'], detail:['chi tiết'] }));
    }
  });
  return ev;
}
/* "20261112-13_Dental_Products_Exhibition_…_Hai_Phong" ⇒ ngày, loại, thành phố */
var EH_CITY = [['hai phong', 'Hải Phòng'], ['haiphong', 'Hải Phòng'], ['ninh binh', 'Ninh Bình'], ['hanoi', 'Hà Nội'], ['ha noi', 'Hà Nội'],
               ['ho chi minh', 'TP.HCM'], ['hcm', 'TP.HCM'], ['da nang', 'Đà Nẵng'], ['can tho', 'Cần Thơ'], ['nghe an', 'Nghệ An']];
function ehNameMeta_(name){
  var m = /^(\d{8})(?:\s*[-–]\s*(\d{2}|\d{4}))?/.exec(String(name).replace(/\s+/g, ''));
  if (!m) return null;
  var y = m[1].slice(0, 4), mo = m[1].slice(4, 6), d = m[1].slice(6, 8), start = y + '-' + mo + '-' + d, end = start;
  if (m[2] && m[2].length === 2) end = y + '-' + mo + '-' + m[2];
  else if (m[2] && m[2].length === 4){ var yy = +y; if (+m[2].slice(0, 2) < +mo) yy++; end = yy + '-' + m[2].slice(0, 2) + '-' + m[2].slice(2); }
  if (end < start) end = start;
  var n = ehNorm_(name), type = /exhibition|trien lam|booth/.test(n) ? 'Triển lãm' : /workshop|hands on/.test(n) ? 'Workshop' : /webinar/.test(n) ? 'Webinar' :
          /seminar|hoi thao|training|tap huan|course/.test(n) ? 'Hội thảo' : 'Sự kiện';
  var city = ''; for (var i = 0; i < EH_CITY.length && !city; i++){ var c = EH_CITY[i][0]; if (n.slice(-c.length - 2).indexOf(c) >= 0 || new RegExp('\\b' + c + '$').test(n)) city = EH_CITY[i][1]; }
  return { start: start, end: end, type: type, city: city };
}
function ehProducts_(plan, extra){
  var src = [plan.info.products, plan.promo.map(function(p){ return p.product; }).join(' '), plan.checklist.map(function(c){ return c.item; }).join(' '), extra].join(' ').toLowerCase(), out = [];
  [['jizai', 'JIZAI'], ['composite', 'Composite'], ['bleach', "Bleach'N Shine"], ['1559', '#1559L'], ['mani bond', 'MANI Bond'], ['dia-bur', 'Dia-Burs'], ['manipler', 'Manipler'], ['knife', 'Ophthalmic Knife']]
    .forEach(function(k){ if (src.indexOf(k[0]) >= 0 && out.indexOf(k[1]) < 0) out.push(k[1]); });
  return out.join(', ');
}
function ehType_(s){ var n = ehNorm_(s); return /webinar|online|zoom/.test(n) ? 'Webinar' : /exhibition|trien lam|booth/.test(n) ? 'Triển lãm' : /workshop|hands on/.test(n) ? 'Workshop' :
  /seminar|hoi thao|conference|hoi nghi|training|tap huan|course/.test(n) ? 'Hội thảo' : 'Sự kiện'; }
function ehFirst_(s){ return String(s || '').split('\n')[0].replace(/^[•\s]+|[\s:–-]+$/g, '').trim(); }
function ehClean_(s){ return String(s || '').replace(/\s*\n\s*/g, ' · ').replace(/^[\s·]+|[\s·]+$/g, ''); }

/* liệt kê Google Sheet kế hoạch trong thư mục Event FY68 (2 cấp thư mục con), bỏ sổ Event Hub + thư mục tệp */
function ehPlanFiles_(){
  var out = [], skip = {}, pr = PropertiesService.getScriptProperties();
  skip[pr.getProperty('EH_BOOK') || '-'] = 1; skip[pr.getProperty('EH_FILES') || '-'] = 1;
  function walk(fo, depth){
    var it = fo.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (it.hasNext()){ var f = it.next(); if (skip[f.getId()]) continue; if (!/^\s*\d{8}/.test(f.getName())) continue;
      out.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), updated: f.getLastUpdated().toISOString() }); }
    var xl = fo.getFilesByType(MimeType.MICROSOFT_EXCEL);
    while (xl.hasNext()){ var x = xl.next(); if (/^\s*\d{8}/.test(x.getName())) out.push({ id: x.getId(), name: x.getName(), url: x.getUrl(), updated: x.getLastUpdated().toISOString(), xlsx: true }); }
    if (depth >= 2) return;
    var sub = fo.getFolders(); while (sub.hasNext()){ var s = sub.next(); if (!skip[s.getId()]) walk(s, depth + 1); }
  }
  walk(DriveApp.getFolderById(EH.ROOT), 0);
  return out;
}

/* ══════════════ ĐỒNG BỘ ══════════════ */
function ehSyncTick_(){ var c = CacheService.getScriptCache(); if (c.get('eh_tick')) return; c.put('eh_tick', '1', 240); try { ehSync_({}); } catch(e){} try { ehTrig_(); } catch(e){} try { ehLinkTick_(); } catch(e){} }   /* v1.2: + file MKT Offline / Digital (MKT_EventHubLink.gs) */
function ehSync_(opt){
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok:false, error:'Đang có tiến trình ghi khác, thử lại sau.' };
  var T0 = Date.now(), rep = { ok:true, files:0, parsed:0, evNew:0, tasksNew:0, issues:[] };
  try {
    var ss = ehBook_(), pr = PropertiesService.getScriptProperties();
    var events = ehRead_(ss, 'EVENTS'), byId = {}, sig0 = {};
    var sigOf = function(e){ return JSON.stringify(EH.COLS.EVENTS.filter(function(c){ return c !== 'updatedAt' && c !== 'updatedBy'; }).map(function(c){ return ehS_(e[c]); })); };
    events.forEach(function(e){ byId[ehS_(e.id)] = e; sig0[ehS_(e.id)] = sigOf(e); });
    var srcRows = ehRead_(ss, EH_SRC_TAB), srcBy = {}; srcRows.forEach(function(r){ srcBy[ehS_(r.fileId)] = r; });
    var planRows = ehRead_(ss, 'PLAN_JSON'), planBy = {}; planRows.forEach(function(r){ planBy[ehS_(r.eventId)] = r; });
    var today = ehIso_(new Date()), dirty = { ev:{}, plan:false, src:false };

    /* ① file kế hoạch */
    var files = []; try { files = ehPlanFiles_(); } catch(e){ rep.issues.push('Không đọc được thư mục Event FY68: ' + (e.message || e)); }
    rep.files = files.length;
    files.forEach(function(f){
      var meta = ehNameMeta_(f.name), sr = srcBy[f.id] || { fileId: f.id };
      sr.name = f.name; sr.url = f.url; sr.updated = f.updated;
      if (!srcBy[f.id]){ srcBy[f.id] = sr; }
      dirty.src = true;
      if (f.xlsx){ sr.issue = 'File Excel — mở bằng Google Trang tính rồi Tệp ▸ Lưu dưới dạng Google Trang tính để app đọc được'; return; }
      if (!meta){ sr.issue = 'Tên file không bắt đầu bằng ngày yyyymmdd'; return; }
      if (meta.start < EH.FY_FROM || meta.start > EH.FY_TO) { sr.issue = 'Ngoài FY68'; return; }
      var ev = events.filter(function(e){ return ehS_(e.planFileId) === f.id; })[0];
      if (!ev){   /* khớp sự kiện chỉ có ở file Offline cùng ngày */
        var cand = events.filter(function(e){ return !ehS_(e.planFileId) && !ehS_(e.sample) && ehS_(e.start) === meta.start; });
        if (cand.length > 1){ var w = ehWords_(f.name); cand.sort(function(a, b){ return ehOverlap_(w, b) - ehOverlap_(w, a); }); }
        ev = cand[0];
      }
      if (!ev){ ev = { id: 'EV' + meta.start.replace(/-/g, '').slice(2) + '-' + evsHash_(f.id).slice(0, 4).toUpperCase(), follow: meta.start >= today ? 'Có' : 'Không',
                       src: 'FILE', state: '' }; EH.ROLES.forEach(function(r){ ev[r] = ehTeamDefault_(ss, r); }); events.push(ev); byId[ev.id] = ev; rep.evNew++; }
      ev.planFileId = f.id; ev.planUrl = f.url; ev.start = meta.start; ev.end = meta.end;
      if (!ev.type || ev.src === 'FILE' || ev.src === 'OFFLINE+FILE') ev.type = meta.type;
      if (meta.city) ev.city = meta.city;
      if (ev.src === 'OFFLINE') ev.src = 'OFFLINE+FILE';
      dirty.ev[ev.id] = 1; sr.eventId = ev.id;
      var need = !planBy[ev.id] || ehS_(planBy[ev.id].fileId) !== f.id || ehS_(sr.parsed) !== f.updated || opt.force;
      if (!need || Date.now() - T0 > EH.BUDGET) return;
      try {
        var plan = ehParsePlan_(SpreadsheetApp.openById(f.id)), I = plan.info;
        ev.name = ehFirst_(I.name) || ev.name || f.name; ev.venue = ehClean_(I.venue); ev.organizer = ehFirst_(I.organizer); ev.format = ehClean_(I.format);
        ev.purpose = ehClean_(I.purpose); ev.audience = ehClean_(I.audience); ev.scale = ehClean_(I.scale || I.guests); ev.speakers = ehClean_(I.speakers);
        ev.fee = ehClean_(I.fee); ev.npp = ehClean_(I.npp); ev.sales = ehClean_(I.sales); ev.kpi = ehClean_(I.kpi); ev.products = ehProducts_(plan, f.name);
        ev.dateWarn = '';
        var dt = ehClean_(I.dateText);
        if (/TBC|chưa chốt|dự kiến/i.test(dt + ' ' + ev.venue)) ev.state = ev.state || 'Chờ chốt';
        var dm = /(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(20\d\d)/.exec(dt) || /\d{1,2}\s*[-–]\s*\d{1,2}\s*\/\s*(\d{1,2})\s*\/\s*(20\d\d)/.exec(dt);
        if (dm){ var mon = dm.length === 4 ? +dm[2] : +dm[1]; if (mon && mon !== +meta.start.slice(5, 7)) ev.dateWarn = 'Trong file ghi "' + dt.split(' · ')[0] + '", tên file ghi tháng ' + (+meta.start.slice(5, 7)); }
        plan.dateText = dt;
        var js = JSON.stringify(plan); if (js.length > 49000) { plan.mc = []; js = JSON.stringify(plan).slice(0, 49000); }
        planBy[ev.id] = { eventId: ev.id, fileId: f.id, readAt: ehNow_(), json: js, _new: !planBy[ev.id], _r: planBy[ev.id] && planBy[ev.id]._r };
        dirty.plan = true; rep.parsed++;
        sr.readAt = ehNow_(); sr.parsed = f.updated; sr.issue = ev.dateWarn || '';
        sr.found = ['tasks', 'sessions', 'activities', 'promo', 'agenda', 'staff', 'checklist', 'gifts', 'results'].filter(function(k){ return plan[k] && plan[k].length; }).join(', ');
      } catch(e){ sr.issue = 'Lỗi đọc: ' + (e.message || e); }
    });

    /* ② sự kiện ở file MKT Offline (PLAN_EVENT / REPORT_EVENT) chưa có file kế hoạch */
    var off = []; try { off = evsReadEvents_(); } catch(e){ rep.issues.push('File MKT Offline: ' + (e.message || e)); }
    off.forEach(function(o){
      if (o.approx || o.start < EH.FY_FROM || o.start > EH.FY_TO) return;
      var ev = events.filter(function(e){ return ehS_(e.offlineName) && evsNorm_(e.offlineName) === o.nk; })[0];
      if (!ev){
        var cand = events.filter(function(e){ return !ehS_(e.offlineName) && !ehS_(e.sample) && ehS_(e.start) === o.start; });
        if (cand.length > 1){ var w = ehWords_(o.name + ' ' + o.place); cand.sort(function(a, b){ return ehOverlap_(w, b) - ehOverlap_(w, a); }); }
        ev = cand[0];
      }
      if (!ev){ ev = { id: 'EV' + o.start.replace(/-/g, '').slice(2) + '-' + evsHash_(o.nk).slice(0, 4).toUpperCase(), name: o.name, start: o.start, end: o.end,
                       type: ehType_(o.form + ' ' + o.type), city: o.place, src: 'OFFLINE', follow: o.start >= today ? 'Có' : 'Không', state: '' };
                  EH.ROLES.forEach(function(r){ ev[r] = ehTeamDefault_(ss, r); }); events.push(ev); byId[ev.id] = ev; rep.evNew++; }
      if (!ehS_(ev.offlineName)) { ev.offlineName = o.name; dirty.ev[ev.id] = 1; }
      if (ev.src === 'OFFLINE'){ ev.name = o.name; ev.start = o.start; ev.end = o.end; ev.city = ev.city || o.place; ev.products = ev.products || o.product; dirty.ev[ev.id] = 1; }
      if (/cancel|huỷ|hủy/i.test(o.plan + ' ' + o.action) && ev.state !== 'Huỷ'){ ev.state = 'Huỷ'; dirty.ev[ev.id] = 1; }
    });

    /* ③ ghi EVENTS (sự kiện mới: thêm dòng, cũ: ghi lại dòng có đổi) */
    var now = ehNow_();
    events.forEach(function(e){
      if (!dirty.ev[e.id] || (e._r && sig0[e.id] === sigOf(e))) return;
      e.updatedAt = now; e.updatedBy = e.updatedBy || 'Hệ thống';
      if (e._r) ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, e); else { ehAppend_(ss, 'EVENTS', EH.COLS.EVENTS, [e]); e._r = ss.getSheetByName('EVENTS').getLastRow(); }
    });

    /* ④ việc cho sự kiện mới + hạn theo ngày D (việc chưa đổi hạn tay) */
    var gen = {}; try { gen = JSON.parse(pr.getProperty('EH_GEN') || '{}'); } catch(e){}
    var tpl = ehRead_(ss, 'TEMPLATE'), tasks = ehRead_(ss, 'TASKS'), has = {};
    tasks.forEach(function(t){ has[ehS_(t.eventId)] = 1; });
    var add = [];
    events.forEach(function(e){
      if (gen[e.id] || has[e.id] || ehS_(e.follow) !== 'Có' || !ehS_(e.start) || ehS_(e.start) < today || e.state === 'Huỷ') return;
      add = add.concat(ehTasksFor_(e, tpl)); gen[e.id] = today;
    });
    if (add.length){ ehAppend_(ss, 'TASKS', EH.COLS.TASKS, add); rep.tasksNew = add.length; }
    pr.setProperty('EH_GEN', JSON.stringify(gen));
    var moved = 0;
    tasks.forEach(function(t){
      if (ehS_(t.dueManual) || ehS_(t.offset) === '') return;
      var e = byId[ehS_(t.eventId)]; if (!e) return;
      var d = ehDue_(e, t.offset, ehS_(t.unit)); if (d && d !== ehS_(t.due)){ t.due = d; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); moved++; }
    });
    rep.dueMoved = moved;

    /* ⑤ dữ liệu kế hoạch: PLAN_JSON + các tab dễ đọc */
    if (dirty.plan){
      ehRewrite_(ss, 'PLAN_JSON', EH.COLS.PLAN_JSON, Object.keys(planBy).map(function(k){ return planBy[k]; }));
      ehWritePlanTabs_(ss, planBy, byId);
    }
    if (dirty.src) ehRewrite_(ss, EH_SRC_TAB, EH.COLS.SRC, Object.keys(srcBy).map(function(k){ return srcBy[k]; }));
    rep.events = events.length; rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Event Hub — ' + rep.files + ' file kế hoạch (đọc lại ' + rep.parsed + ') · ' + rep.events + ' sự kiện (mới ' + rep.evNew + ') · tạo ' + rep.tasksNew + ' việc · ' + rep.seconds + 's' +
      (rep.issues.length ? ' · ' + rep.issues.join(' | ') : '');
    pr.setProperty('EH_LAST', JSON.stringify({ at: Date.now(), msg: rep.message }));
    CacheService.getScriptCache().remove('eh_boot');
    return rep;
  } catch(err){ return { ok:false, error: String(err && err.message || err) }; }
  finally { try { lock.releaseLock(); } catch(e){} }
}
function ehOverlap_(words, ev){ var s = ehWords_([ev.name, ev.city, ev.venue, ev.offlineName].join(' ')); return words.filter(function(w){ return s.indexOf(w) >= 0; }).length; }
function ehTeamDefault_(ss, role){
  if (!ehTeamDefault_.m){ ehTeamDefault_.m = {}; ehRead_(ss, 'TEAM').forEach(function(r){ ehTeamDefault_.m[ehS_(r.role)] = ehS_(r.people).split(',')[0].trim(); }); }
  return ehTeamDefault_.m[role] || '';
}
function ehTasksFor_(e, tpl){
  var out = [], parents = {}, order = 0, n = ehNorm_(e.city + ' ' + e.venue), live = e.type !== 'Webinar';
  tpl.forEach(function(t){
    var ap = ehS_(t.apply) || 'Tất cả';
    if (ap === 'Trực tiếp' && !live) return;
    if (ap === 'Webinar' && live) return;
    if (ap === 'Ngoài Hà Nội' && (!live || /ha noi|hanoi/.test(n) || !n)) return;
    if (ap === 'Triển lãm' && e.type !== 'Triển lãm') return;
    if (ap === 'Workshop' && e.type !== 'Workshop') return;
    var big = /lớn/i.test(ehS_(t.kind)), role = ehS_(t.role), id = ehId_('T');
    var o = { id: id, eventId: e.id, parentId: big ? '' : (parents[ehS_(t.group)] || ''), group: ehS_(t.group), title: ehS_(t.title), role: role,
              pic: e[role] || '', due: big ? '' : ehDue_(e, t.offset, ehS_(t.unit)), offset: big ? '' : t.offset, unit: ehS_(t.unit), dueManual: '',
              status: 'Chưa làm', proof: ehS_(t.proof), hint: ehS_(t.hint), note: '', order: ++order, doneAt: '', updatedAt: ehNow_(), updatedBy: 'Hệ thống', createdBy: 'Hệ thống' };
    if (big) parents[o.group] = id;
    out.push(o);
  });
  /* việc có hạn đã qua lúc tạo ⇒ Bỏ qua (Owner xem lại) */
  var t0 = ehIso_(new Date());
  out.forEach(function(o){ if (o.due && o.due < t0){ o.status = 'Bỏ qua'; o.note = 'Tạo khi đã qua hạn — Owner xem lại'; } });
  return out;
}
var EH_PLAN_TABS = null;
function ehPlanTabs_(){
  if (EH_PLAN_TABS) return EH_PLAN_TABS;
  var c = function(a){ return ['Mã SK', 'Sự kiện'].concat(a); };
  EH_PLAN_TABS = [
    { name: 'Nhiệm vụ', key: 'tasks', cols: c(['Hạng mục', 'Chi tiết', 'Đơn vị phụ trách', 'Ghi chú']), f: function(x){ return [x.group, x.detail, x.owner, x.note]; } },
    { name: 'Chương trình', key: 'sessions', cols: c(['Lớp / phiên', 'Nội dung']), f: function(x){ var o = []; Object.keys(x).forEach(function(k){ if (k !== 'session') o.push(k + ': ' + x[k]); }); return [x.session, o.join('\n')]; } },
    { name: 'Hoạt động', key: 'activities', cols: c(['Hoạt động', 'Thời lượng', 'Nội dung', 'PIC', 'Ghi chú']), f: function(x){ return [x.title, x.duration, x.content, x.pic, x.note]; } },
    { name: 'Khuyến mại', key: 'promo', cols: c(['Sản phẩm', 'Ưu đãi', 'Quà tặng', 'SL quà', 'Ghi chú']), f: function(x){ return [x.product, x.offer, x.gift, x.qty, x.note]; } },
    { name: 'Agenda', key: 'agenda', cols: c(['Ngày', 'Giai đoạn', 'Giờ', 'Nội dung', 'PIC', 'Ghi chú']), f: function(x){ return [x.date, x.kind, x.time, x.detail, x.pic, x.note]; } },
    { name: 'Nhân sự', key: 'staff', cols: c(['Công ty', 'Họ tên', 'Nhiệm vụ theo giai đoạn', 'Ghi chú']), f: function(x){ return [x.company, x.name, x.tasks.map(function(t){ return t.phase + ': ' + t.task; }).join('\n'), x.note]; } },
    { name: 'Đồ MKT', key: 'checklist', cols: c(['Nhóm', 'Loại', 'Hạng mục', 'ĐVT', 'SL', 'Ghi chú', 'PIC', 'Trạng thái']), f: function(x){ return [x.group, x.category, x.item, x.unit, x.qty, x.note, x.pic, x.status]; } },
    { name: 'Quà NPP', key: 'gifts', cols: c(['NPP', 'Quà', 'Tạm ứng', 'Xuất', 'Chênh lệch', 'Tình trạng']), f: function(x){ return [x.npp, x.item, x.advance, x.used, x.diff, x.status]; } },
    { name: 'Kết quả', key: 'results', cols: c(['Nhóm', 'Chỉ số', 'Đơn vị', 'Thực đạt', 'Ghi chú']), f: function(x){ return [x.no, x.metric, x.unit, x.actual, x.note]; } }
  ];
  return EH_PLAN_TABS;
}
function ehWritePlanTabs_(ss, planBy, byId){
  ehPlanTabs_().forEach(function(t){
    var rows = [];
    Object.keys(planBy).forEach(function(id){
      var p; try { p = JSON.parse(planBy[id].json); } catch(e){ return; }
      var ev = byId[id] || {};
      (p[t.key] || []).forEach(function(x){ rows.push([id, ev.name || ''].concat(t.f(x))); });
    });
    var sh = ss.getSheetByName(t.name), last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, t.cols.length).clearContent();
    if (rows.length) sh.getRange(2, 1, rows.length, t.cols.length).setValues(rows);
  });
}

/* ══════════════ API ══════════════ */
function ehMe_(p, ss){
  var me = tfWho_(p); if (me.err) return me;
  var mgr = me.admin || /^(director|hod|manager|leader)$/.test(me.level);
  if (!mgr){ ehRead_(ss, 'TEAM').forEach(function(r){ if (ehS_(r.role) === 'Quản lý' && ehS_(r.people).split(',').map(function(x){ return x.trim(); }).indexOf(me.pic) >= 0) mgr = true; }); }
  me.manager = !!mgr; return me;
}
function ehCanEv_(me, ev){ return !!me.manager || (ev && ehS_(ev.Owner) === me.pic); }
/* người dùng (RH_Users: Email · Pic · Level · Admin · Active · … · Dept (K) · Title (L)) — app chỉ nhận pic / level / dept / title, KHÔNG nhận email */
function ehUsers_(){
  if (ehUsers_.m) return ehUsers_.m;
  var m = {};
  try {
    var us = SpreadsheetApp.openById(TF.MASTER_ID).getSheetByName('RH_Users'), n = Math.max(1, us.getLastRow() - 1), V = us.getRange(2, 1, n, Math.max(12, Math.min(13, us.getLastColumn()))).getValues();
    V.forEach(function(r){
      var pic = ehS_(r[1]), act = r[4] === '' || r[4] === true || /^(true|1|x|yes)$/i.test(ehS_(r[4]));
      if (!pic || !act || /^TEST/i.test(pic)) return;
      var em = ehS_(r[0]).toLowerCase(); if (em && em.indexOf('@') < 0) em += '@manimedicalhanoi.com';
      m[pic] = { email: em, level: ehS_(r[2]).toLowerCase(), admin: r[3] === true || /^(true|1|x|yes)$/i.test(ehS_(r[3])), dept: ehS_(r[10]), title: ehS_(r[11]) };
    });
  } catch(e){}
  ehUsers_.m = m; return m;
}
function ehPeople_(){ var U = ehUsers_(); return Object.keys(U).map(function(k){ return { pic: k, level: U[k].level, dept: U[k].dept, title: U[k].title }; }); }
function ehRoute_(action, user, p){
  p = p || {};
  if (p.payload && typeof p.payload === 'string'){ try { var x = JSON.parse(p.payload); for (var k in x) if (!(k in p)) p[k] = x[k]; } catch(e){} }
  try {
    if (action === 'ehBoot') return ehBoot_(p);
    if (action === 'ehSave') return ehOnce_(p, function(){ return ehSaveN_(p); });
    if (action === 'ehSample') return ehSample_(p);
    if (action === 'ehDaily') return ehDailyApi_(p);
    if (action === 'ehLink') return ehLinkApi_(p);   /* v1.2 — MKT_EventHubLink.gs */
    if (action === 'ehUpload') return ehOnce_(p, function(){ return ehUpload_(p); });
    if (action === 'ehSync'){
      if (String(p.mode || '') === 'status'){ var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EH_LAST') || '{}'); } catch(e){} return { ok:true, ver:EH.VER, last:last }; }
      if (String(p.key || '') !== ehKey_()){
        var ss = ehBook_(), me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error:me.err };
        if (!me.manager) return { ok:false, error:'Chỉ quản lý được chạy đồng bộ ngay.' };
      }
      return ehSync_({ force: String(p.force || '') === '1' });
    }
    return { ok:false, error:'Không rõ lệnh ' + action };
  } catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}
function ehOnce_(p, fn){
  var rid = String(p.rid || '').trim(), key = 'eh_' + rid;
  if (rid && typeof ridGet === 'function'){ var prev = ridGet(key); if (prev){ prev.dedup = true; return prev; } }
  var lock = LockService.getScriptLock(); if (!lock.tryLock(25000)) return { ok:false, busy:true, error:'Hệ thống đang bận, thử lại sau vài giây.' };
  var out; try { out = fn(); SpreadsheetApp.flush(); } finally { try { lock.releaseLock(); } catch(e){} }
  if (rid && out && out.ok && typeof ridPut === 'function') ridPut(key, out);
  CacheService.getScriptCache().remove('eh_boot');
  return out;
}
function ehClean2_(o){ var x = {}; for (var k in o) if (k !== '_r') x[k] = o[k]; return x; }
function ehBoot_(p){
  var ss = ehBook_(), me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error:me.err };
  var c = CacheService.getScriptCache(), hit = c.get('eh_boot'), base = null;
  if (hit){ try { base = JSON.parse(hit); } catch(e){} }
  if (!base){
    var plan = {}; ehRead_(ss, 'PLAN_JSON').forEach(function(r){ try { plan[ehS_(r.eventId)] = JSON.parse(r.json); } catch(e){} });
    var tpl = ehRead_(ss, 'TEMPLATE').map(ehClean2_);
    base = { events: ehRead_(ss, 'EVENTS').map(ehClean2_), tasks: ehRead_(ss, 'TASKS').map(ehClean2_), files: ehRead_(ss, 'FILES').map(ehClean2_),
             log: ehRead_(ss, 'LOG').slice(-400).map(ehClean2_), comments: ehRead_(ss, 'COMMENTS').slice(-800).map(ehClean2_),
             notify: ehRead_(ss, 'NOTIFY').slice(-150).map(ehClean2_), plan: plan, people: ehPeople_(), roles: EH.ROLES, status: EH.STATUS,
             groups: tpl.filter(function(t){ return /lớn/i.test(ehS_(t.kind)); }).map(function(t){ return { group: t.group, role: t.role }; }),
             book: ss.getUrl(), filesUrl: ehFilesRoot_().getUrl() };
    try { var js = JSON.stringify(base); if (js.length < 95000) c.put('eh_boot', js, 120); } catch(e){}
  }
  var last = {}; try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('EH_LAST') || '{}'); } catch(e){}
  try { base.link = ehLinkGet_(ss); } catch(e){ base.link = {}; }   /* v1.2: dữ liệu file MKT Offline / Digital theo sự kiện */
  base.ok = true; base.me = { pic: me.pic, manager: me.manager, admin: !!me.admin, level: me.level }; base.sync = last; base.ver = EH.VER; base.cfg = ehCfg_();
  if (!me.manager) base.notify = (base.notify || []).filter(function(n){ return n.to === me.pic || n.by === me.pic; });
  return base;
}
/* ehSave: op = task.add | task.update | task.delete | event.update | link.add | file.delete */
function ehSave_(p){
  var ss = ehBook_(), me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error:me.err };
  var op = String(p.op || ''), d = p.data || {}; if (typeof d === 'string'){ try { d = JSON.parse(d); } catch(e){ d = {}; } }
  var events = ehRead_(ss, 'EVENTS'), evBy = {}; events.forEach(function(e){ evBy[ehS_(e.id)] = e; });
  var now = ehNow_();
  var x2 = ehSave2_(ss, me, op, d, events, evBy, now); if (x2) return x2;   /* v1.1 — MKT_EventHubPlus.gs */
  if (op === 'event.update'){
    var ev = evBy[ehS_(d.id)]; if (!ev) return { ok:false, error:'Không thấy sự kiện.' };
    if (!ehCanEv_(me, ev)) return { ok:false, code:'PERM', error:'Chỉ quản lý hoặc Owner của sự kiện được sửa.' };
    var allow = ['state', 'follow', 'note', 'Owner', 'Digital', 'Design', 'Trade', 'Sales', 'name', 'start', 'end', 'type', 'city', 'venue', 'organizer',
                 'purpose', 'audience', 'scale', 'products', 'cover', 'target', 'actual', 'budgetPlan', 'budgetActual', 'kpi', 'speakers', 'npp'], ch = [], old = {};
    EH.ROLES.forEach(function(r){ old[r] = ehS_(ev[r]); });
    var oldStart = ehS_(ev.start), oldEnd = ehS_(ev.end);
    if ('start' in d && !/^\d{4}-\d{2}-\d{2}$/.test(ehS_(d.start))) return { ok:false, error:'Ngày bắt đầu không hợp lệ.' };
    if ('end' in d && ehS_(d.end) && ehS_(d.end) < ehS_('start' in d ? d.start : ev.start)) return { ok:false, error:'Ngày kết thúc trước ngày bắt đầu.' };
    if (!me.manager) allow = allow.filter(function(k){ return k !== 'Owner'; });
    allow.forEach(function(k){ if (k in d && ehS_(d[k]) !== ehS_(ev[k])){ ch.push(k + ': ' + ehS_(ev[k]) + ' → ' + ehS_(d[k])); ev[k] = ehS_(d[k]); } });
    if (!ch.length) return { ok:true, event: ehClean2_(ev) };
    ev.updatedAt = now; ev.updatedBy = me.pic; ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, ev);
    /* đổi đội ⇒ việc chưa giao tay (người = người cũ của vai trò) đổi theo */
    var tasks = ehRead_(ss, 'TASKS'), moved = [];
    EH.ROLES.forEach(function(r){
      if (!(r in d) || old[r] === ehS_(ev[r])) return;
      tasks.forEach(function(t){ if (ehS_(t.eventId) === ev.id && ehS_(t.role) === r && ehS_(t.status) !== 'Xong' && ehS_(t.pic) === old[r]){ t.pic = ev[r]; t.updatedAt = now; t.updatedBy = me.pic; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); moved.push(ehClean2_(t));
        if (t.pic && d.notify !== false && ehS_(t.status) !== 'Bỏ qua') EH_N.push({ to: t.pic, kind: 'assign', ev: ev, task: t }); } });
    });
    /* v1.1: đổi ngày ⇒ dời hạn các việc chưa đổi hạn tay */
    if (ehS_(ev.start) !== oldStart || ehS_(ev.end) !== oldEnd){
      tasks.forEach(function(t){
        if (ehS_(t.eventId) !== ev.id || ehS_(t.dueManual) || ehS_(t.offset) === '') return;
        var nd = ehDue_(ev, t.offset, ehS_(t.unit)); if (nd && nd !== ehS_(t.due)){ t.due = nd; ehPut_(ss, 'TASKS', EH.COLS.TASKS, t); if (!moved.some(function(m){ return m.id === t.id; })) moved.push(ehClean2_(t)); }
      });
    }
    ehLog_(ss, me, 'Sửa sự kiện', ev.id, '', ch.join(' · ').slice(0, 480));
    return { ok:true, event: ehClean2_(ev), tasks: moved };
  }
  var tasks2 = ehRead_(ss, 'TASKS'), tBy = {}; tasks2.forEach(function(t){ tBy[ehS_(t.id)] = t; });
  if (op === 'task.add'){
    var ev2 = evBy[ehS_(d.eventId)]; if (!ev2) return { ok:false, error:'Không thấy sự kiện.' };
    var par = d.parentId ? tBy[ehS_(d.parentId)] : null;
    if (!ehCanEv_(me, ev2) && !(par && ehS_(par.pic) === me.pic)) return { ok:false, code:'PERM', error:'Chỉ quản lý, Owner hoặc người phụ trách task lớn được thêm việc.' };
    if (!ehS_(d.title)) return { ok:false, error:'Cần tên việc.' };
    var t = { id: ehS_(d.id) || ehId_('T'), eventId: ev2.id, parentId: par ? par.id : '', group: par ? ehS_(par.group) : ehS_(d.group || d.title), title: ehS_(d.title),
              role: ehS_(d.role || (par && par.role)), pic: ehS_(d.pic), due: ehS_(d.due), offset: '', unit: '', dueManual: ehS_(d.due) ? 'x' : '', status: 'Chưa làm',
              proof: ehS_(d.proof), note: ehS_(d.note), order: tasks2.length + 1, doneAt: '', updatedAt: now, updatedBy: me.pic, createdBy: me.pic };
    if (/^tmp-/.test(t.id)) t.id = ehId_('T');
    if (/^(cao|gấp|high)$/i.test(ehS_(d.priority))) t.priority = 'Cao';
    if (ehS_(ev2.sample)) t.sample = 'x';
    ehAppend_(ss, 'TASKS', EH.COLS.TASKS, [t]);
    ehLog_(ss, me, 'Thêm việc', ev2.id, t.id, t.title + (t.pic ? ' · giao ' + t.pic : ''));
    if (t.pic && d.notify !== false) EH_N.push({ to: t.pic, kind: 'assign', ev: ev2, task: t });
    return { ok:true, task: t, tmp: ehS_(d.id) };
  }
  var tk = tBy[ehS_(d.id)];
  if (op === 'task.update' || op === 'task.delete'){
    if (!tk) return { ok:false, error:'Không thấy việc (có thể đã bị xoá).' };
    var ev3 = evBy[ehS_(tk.eventId)], boss = ehCanEv_(me, ev3), mine = ehS_(tk.pic) === me.pic;
    if (op === 'task.delete'){
      if (!boss) return { ok:false, code:'PERM', error:'Chỉ quản lý hoặc Owner được xoá việc.' };
      var dels = tasks2.filter(function(t){ return t.id === tk.id || ehS_(t.parentId) === tk.id; }).map(function(t){ return t._r; }).sort(function(a, b){ return b - a; });
      dels.forEach(function(r){ ss.getSheetByName('TASKS').deleteRow(r); });
      ehLog_(ss, me, 'Xoá việc', tk.eventId, tk.id, tk.title);
      return { ok:true, deleted: tasks2.filter(function(t){ return t.id === tk.id || ehS_(t.parentId) === tk.id; }).map(function(t){ return t.id; }) };
    }
    if (!boss && !mine) return { ok:false, code:'PERM', error:'Bạn không phụ trách việc này.' };
    var bossKeys = ['title', 'pic', 'due', 'proof', 'role', 'priority'], anyKeys = ['status', 'note'], ch2 = [], st0 = ehS_(tk.status);
    (boss ? bossKeys.concat(anyKeys) : anyKeys).forEach(function(k){ if (k in d && ehS_(d[k]) !== ehS_(tk[k])){ ch2.push(k); tk['_old_' + k] = tk[k]; tk[k] = ehS_(d[k]); } });
    if ('due' in d && ch2.indexOf('due') >= 0) tk.dueManual = 'x';
    if (ch2.indexOf('status') >= 0){
      if (tk.status === 'Xong'){
        var need = ehS_(tk.proof);
        if (need){
          var fl = ehRead_(ss, 'FILES').filter(function(f){ return ehS_(f.taskId) === tk.id && (need !== 'image' || ehS_(f.kind) === 'image' || /^image\//.test(ehS_(f.mime))); });
          if (!fl.length) return { ok:false, code:'PROOF', error: need === 'link' ? 'Dán link bài đăng / kết quả trước khi chuyển Xong.' : 'Tải file ' + (need === 'image' ? 'ảnh' : 'ấn phẩm / tài liệu') + ' lên trước khi chuyển Xong.' };
        }
        tk.doneAt = now;
      } else tk.doneAt = '';
    }
    if (!ch2.length) return { ok:true, task: ehClean2_(tk) };
    tk.updatedAt = now; tk.updatedBy = me.pic;
    var keep = {}; for (var kk in tk) if (!/^_old_/.test(kk)) keep[kk] = tk[kk];
    ehPut_(ss, 'TASKS', EH.COLS.TASKS, keep);
    ehLog_(ss, me, 'Cập nhật việc', tk.eventId, tk.id, tk.title + ' · ' + ch2.map(function(k){ return k + ' → ' + ehS_(tk[k]); }).join(' · '));
    /* v1.1: email — giao người mới · nộp chờ duyệt ⇒ Owner · Owner trả lại ⇒ người làm */
    if (ch2.indexOf('pic') >= 0 && keep.pic && d.notify !== false) EH_N.push({ to: keep.pic, kind: 'assign', ev: ev3, task: keep });
    if (ch2.indexOf('status') >= 0 && keep.status === 'Chờ duyệt' && ev3 && ehS_(ev3.Owner)) EH_N.push({ to: ehS_(ev3.Owner), kind: 'review', ev: ev3, task: keep });
    if (ch2.indexOf('status') >= 0 && st0 === 'Chờ duyệt' && /^(Đang làm|Chưa làm)$/.test(keep.status) && keep.pic && keep.pic !== me.pic)
      EH_N.push({ to: keep.pic, kind: 'return', ev: ev3, task: keep, text: ehS_(d.reason || keep.note) });
    return { ok:true, task: ehClean2_(keep) };
  }
  if (op === 'link.add'){
    var url = ehS_(d.url); if (!/^https?:\/\//i.test(url)) return { ok:false, error:'Link phải bắt đầu bằng http:// hoặc https://' };
    var ev4 = evBy[ehS_(d.eventId)]; if (!ev4) return { ok:false, error:'Không thấy sự kiện.' };
    var t4 = d.taskId ? tBy[ehS_(d.taskId)] : null;
    if (t4 && !ehCanEv_(me, ev4) && ehS_(t4.pic) !== me.pic) return { ok:false, code:'PERM', error:'Bạn không phụ trách việc này.' };
    var f = { id: ehId_('F'), eventId: ev4.id, taskId: t4 ? t4.id : '', kind: 'link', name: ehS_(d.name) || ehLinkName_(url), url: url, driveId: '', mime: '', size: '', by: me.pic, at: now, note: ehS_(d.note) };
    ehAppend_(ss, 'FILES', EH.COLS.FILES, [f]);
    ehLog_(ss, me, 'Thêm link', ev4.id, f.taskId, f.name + ' · ' + url);
    return { ok:true, file: f };
  }
  if (op === 'file.delete'){
    var files = ehRead_(ss, 'FILES'), fx = files.filter(function(x){ return ehS_(x.id) === ehS_(d.id); })[0]; if (!fx) return { ok:true };
    var ev5 = evBy[ehS_(fx.eventId)];
    if (!ehCanEv_(me, ev5) && ehS_(fx.by) !== me.pic) return { ok:false, code:'PERM', error:'Chỉ người tải lên, Owner hoặc quản lý được xoá.' };
    ss.getSheetByName('FILES').deleteRow(fx._r);
    if (ehS_(fx.driveId)){ try { DriveApp.getFileById(fx.driveId).setTrashed(true); } catch(e){} }
    ehLog_(ss, me, 'Xoá tệp', fx.eventId, fx.taskId, fx.name);
    return { ok:true, deleted: fx.id };
  }
  return { ok:false, error:'op không hợp lệ: ' + op };
}
function ehLinkName_(u){
  if (/facebook\.com|fb\.watch/i.test(u)) return 'Bài đăng Facebook';
  if (/forms\.gle|docs\.google\.com\/forms/i.test(u)) return 'Google Form';
  if (/zalo\.me/i.test(u)) return 'Nhóm Zalo';
  if (/docs\.google\.com\/spreadsheets/i.test(u)) return 'Google Sheet';
  if (/youtu/i.test(u)) return 'Video YouTube';
  return u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
}
/* tải file: data = base64 (≤ EH.MAX_MB) ⇒ thư mục "Event Hub · Tệp tải lên/<yyyymmdd Tên sự kiện>/<Hạng mục>" */
function ehUpload_(p){
  var ss = ehBook_(), me = ehMe_(p, ss); if (me.err) return { ok:false, code:'AUTH', error:me.err };
  var events = ehRead_(ss, 'EVENTS'), ev = events.filter(function(e){ return ehS_(e.id) === ehS_(p.eventId); })[0];
  if (!ev) return { ok:false, error:'Không thấy sự kiện.' };
  var tk = p.taskId ? ehRead_(ss, 'TASKS').filter(function(t){ return ehS_(t.id) === ehS_(p.taskId); })[0] : null;
  var team = EH.ROLES.map(function(r){ return ehS_(ev[r]); });
  if (!ehCanEv_(me, ev) && !(tk && ehS_(tk.pic) === me.pic) && team.indexOf(me.pic) < 0) return { ok:false, code:'PERM', error:'Chỉ người trong đội sự kiện được tải tệp lên.' };
  var b64 = String(p.data || '').replace(/^data:[^,]*,/, ''); if (!b64) return { ok:false, error:'Thiếu nội dung file.' };
  if (b64.length * 0.75 > EH.MAX_MB * 1048576) return { ok:false, error:'File lớn hơn ' + EH.MAX_MB + ' MB — tải lên Drive rồi dán link.' };
  var root = ehFilesRoot_(), evName = (ehS_(ev.start).replace(/-/g, '') + ' ' + ehS_(ev.name)).slice(0, 90), fo = null;
  if (ehS_(ev.folderId)){ try { fo = DriveApp.getFolderById(ev.folderId); } catch(e){ fo = null; } }
  if (!fo){ fo = root.createFolder(evName); ev.folderId = fo.getId(); ev.folderUrl = fo.getUrl(); ehPut_(ss, 'EVENTS', EH.COLS.EVENTS, ev); }
  var sub = fo, gname = tk ? ehS_(tk.group) : 'Chung';
  if (gname){ var it = fo.getFoldersByName(gname); sub = it.hasNext() ? it.next() : fo.createFolder(gname); }
  var name = ehS_(p.name) || 'tep', mime = ehS_(p.mime) || 'application/octet-stream';
  var file = sub.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, name));
  var kind = /^image\//.test(mime) ? 'image' : 'file';
  var f = { id: ehId_('F'), eventId: ev.id, taskId: tk ? tk.id : '', kind: kind, name: name, url: file.getUrl(), driveId: file.getId(), mime: mime,
            size: Math.round(b64.length * 0.75), by: me.pic, at: ehNow_(), note: ehS_(p.note) };
  ehAppend_(ss, 'FILES', EH.COLS.FILES, [f]);
  ehLog_(ss, me, 'Tải tệp', ev.id, f.taskId, name);
  return { ok:true, file: f, folderUrl: fo.getUrl() };
}
function ehSyncNow(){ var r = ehSync_({ force: true }); Logger.log(JSON.stringify(r, null, 2)); return r; }
