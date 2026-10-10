/*************************************************************************************************
 * MMH REPORT HUB — Visiting_Sync.gs   (v2.2)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ⭐ v2.2 — THÊM NGUỒN EYELESS (file MMH Eyeless CRM · tab "6. WEEKLY REPORT")
 *   ① VISIT_SOURCES.eyeless — Key Task "YYYYMM_Eyeless Customer visiting", Type "Sales-Eyeless"
 *   ② VS_CRM_WEBAPP.eyeless — URL web app Eyeless, ID sheet tự hỏi qua action 'sheetInfo'
 *   ③ AN TOÀN: nguồn nào đọc LỖI trong lượt đồng bộ (mạng chập chờn, web app chưa deploy…)
 *      thì KHÔNG xoá sub task của nguồn đó. Bản cũ coi "đọc lỗi" = "nguồn rỗng" ⇒ có thể xoá
 *      sạch Customer visiting của cả nhóm trong cửa sổ tháng.
 *   ④ Hàm cài đặt 1 lần: vsSetupEyeless()  — bổ sung Master (PIC Trang + Sales-Eyeless),
 *      gỡ chặn validation, kiểm tra đọc nguồn, rồi đồng bộ riêng Eyeless.
 *      Kiểm tra / chạy tay: vsDebugEyeless()  ·  vsSyncEyelessOnly()
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔧 v1.2 — SỬA LỖI "SURGICAL NHẢY DÒNG TRẮNG"
 *   ① vsWriteRows: nếu ô đích có Data Validation "Từ chối dữ liệu" (PIC 'Viet Ha'/'Khang',
 *      Type 'Sales-Surgical' chưa có trong Master) → setValues NÉM LỖI ⇒ cả vsSync dừng giữa
 *      chừng SAU KHI đã insertRowsAfter ⇒ để lại dòng trắng, cột U (syncKey) chưa ghi ⇒ lần
 *      chạy sau lại chèn tiếp ⇒ trắng chồng trắng. Nay: ghi có try/catch, tự gỡ validation
 *      trên đúng dải dòng hệ thống rồi ghi lại, cuối cùng mới ghi từng dòng; dòng nào vẫn
 *      hỏng thì XOÁ LẠI (rollback) chứ không để trống.
 *   ② vsScan: blockEnd trước đây lan qua CẢ dòng trống tới cuối bảng ⇒ key task cuối cùng
 *      (Surgical, do sort A→Z đứng sau Dental) luôn chèn sub ở tận đáy sheet. Nay chỉ mở rộng
 *      blockEnd trên dòng CÓ nội dung.
 *   ③ vsFillDownFormulas: copy công thức (No./FY/Month/Leadtime…) từ dòng gần nhất phía trên
 *      THỰC SỰ có công thức — trước đây lấy dòng ngay trên, nếu dòng đó trống thì cột B rỗng
 *      ⇒ readWeekly() bỏ qua dòng ⇒ webapp không thấy sub.
 *   ④ Tách hạn mức: VS_MAX_UPD (cập nhật) / VS_MAX_INS (chèn mới) — trước dùng chung 400 nên
 *      Surgical nhiều dòng thì hết quota trước khi kịp chèn. Xoá theo cụm liên tiếp (nhanh hơn).
 *   ⑤ Thêm: vsRepairVisiting() — dọn dòng trắng đang tồn, điền lại công thức rồi đồng bộ lại.
 *            vsDiagnose()       — báo cáo tình trạng nguồn + block + data validation.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ĐỒNG BỘ 1 CHIỀU:  Sheet Field Report của SALES  ──▶  Sheet backend "WEEKYLY new" (Report Hub)
 *
 * ⭐ v3.0+ — CẢ 3 NGUỒN (Dental · Surgical · Eyeless) nay đều là file CRM, tab "6. WEEKLY REPORT",
 *   header hàng 3, data hàng 4. Bố cục cũ bên dưới giữ lại để tham khảo.
 * ⚠ SHEET NGUỒN CÓ THỂ KHÁC CẤU TRÚC — module dò cột THEO TÊN HEADER, không hardcode:
 *
 *   SURGICAL — header hàng 4, data hàng 6 (hàng 5 là dòng chú thích Text/Select/Auto)
 *     B No | C FY | D Start Month | E Start date | F Finish date | G Sales PIC |
 *     H Check account name | I Product group | J Type task | K Type action | L Sales Process |
 *     M Plan | N Task Result | O Task Status | P Customer feedback type | Q Next Action |
 *     R Stop Reason | S Photo | T–W (email)
 *
 *   DENTAL — header hàng 2, data hàng 3
 *     B No | C Check account name | D Sale pic | E FY | F Start month | G Type task |
 *     H Type action | I Product | J Sales Process | K Plan | L Task result |
 *     M Date start | N Date finish | O Status | P Customer feedback type | Q Next Action |
 *     R Stop Reason | S KPI Photo
 *
 * Mỗi tháng (Start Month) sinh 1 KEY TASK:  202608_Surgical Customer visiting
 * Mỗi dòng nguồn khớp bộ lọc Type task → 1 SUB TASK bên dưới key đó.
 * SALES KHÔNG SỬA ĐƯỢC các dòng này trên Report Hub — chỉ đổi khi sửa sheet nguồn.
 *
 * CÀI ĐẶT (1 lần):   installVisitingTrigger()      ·  Eyeless: vsSetupEyeless()
 * KIỂM TRA:          vsDebugSurgical()  /  vsDebugDental()  /  vsDebugEyeless()
 * ĐỔI TÊN PIC:       migrateRenamePic('Minh Viet','Viet')
 *************************************************************************************************/

/* ══════════════ CONFIG ══════════════ */

/* 2 cột TRỐNG trên sheet "WEEKYLY new" làm dấu vết đồng bộ (nên ẩn 2 cột này đi).
   ⚠ Nếu U/V đã có dữ liệu → đổi sang 2 cột trống khác. */
var VISIT_COL_KEY  = 21;   // U — khoá đồng bộ:  V:<nguồn>:<dòng nguồn>  |  VK:<tên key task>
var VISIT_COL_META = 22;   // V — JSON tag hiển thị ở frontend

var VS_BACK_MONTHS = 2;    // đồng bộ tháng hiện tại + 2 tháng trước
var VS_FWD_MONTHS  = 1;    // + 1 tháng tới
var VS_MAX_UPD     = 400;  // trần dòng CẬP NHẬT mỗi lượt
var VS_MAX_INS     = 300;  // trần dòng CHÈN MỚI mỗi lượt (ngân sách RIÊNG — không bị update ăn hết)
var VS_MAX_DEL     = 600;  // trần dòng XOÁ mỗi lượt (đã gộp cụm liên tiếp nên nhanh hơn nhiều)
var VS_MAX_OPS     = VS_MAX_UPD;   // giữ tên cũ cho tương thích
var VS_REPAIR_MAX_DEL = 3000;      // trần dòng trắng xoá mỗi lần chạy vsRepairVisiting()
var VS_SWEEP_MAX   = 500;  // trần dòng trắng dọn tự động mỗi lượt đồng bộ
var VS_CHUNK       = 40;   // số dòng mỗi lô chèn/ghi — lô nhỏ để hết giờ vẫn trọn vẹn
var VS_TIME_BUDGET = 240000;  // 4 phút: dừng sạch sẽ trước trần 6 phút của trigger

/* ⭐ v1.8 (#7) — Dòng có "Check account name" chứa MMH = làm việc tại văn phòng.
   Chúng sinh ra Key Task riêng "YYYYMM_Working at office", sub task đặt tên
   YYYYMMDD_Office_<Type>, và KHÔNG hiện các tag Product / Feedback / Next action /
   Sales process (theo yêu cầu) — chỉ giữ tag trạng thái. */
var VS_OFFICE_SUFFIX = 'Working at office';
function vsIsOfficeAccount(accRaw){ return /(^|[^a-z])mmh([^a-z]|$)/i.test(String(accRaw || '')); }

var VISIT_SOURCES = {
  surgical: {
    label:     'Surgical',
    enabled:   true,
    /* ⭐ v3.0 — nay là file MMH Surgical CRM, tab "6. WEEKLY REPORT"
       (bố cục y hệt file Dental: header hàng 3, data hàng 4) */
    get ssId(){ return vsSurgicalSsId_(); },
    names:     ['6. WEEKLY REPORT', 'Weekly Report', 'Surgical weekly report'],
    gid:       0,
    headerRow: 3,
    dataRow:   4,
    typeTask:  'Sales-Surgical',
    keySuffix: 'Surgical Customer visiting',
    /* ⭐ v1.8 (#10): nhận thêm Distributor / Dealer / Clinics bên cạnh Hospital / University.
       Mỗi loại có tag riêng do vsTypeTag() sinh ra để phân biệt trên webapp. */
    typeRe:    /hospital|universit|clinic|dealer|distributor/i,
    appUrl:    'https://script.google.com/macros/s/AKfycbxxckrqwkfhE0fszm1XVdpYyEHU_PCKQWMKE_2wBnMTgoJCZ-1nRZ_fhOCPXXsVfEE/exec'
  },
  /* ⭐ v2.1 — NGUỒN DENTAL nay là file CRM "MMH_Dental_CRM_FY68", tab "6. WEEKLY REPORT".
     Sales nhập trên web app CRM ⇒ ghi vào tab đó ⇒ module này tự đẩy sang "WEEKYLY new".
     Header hàng 3, data hàng 4 (khác sheet Field Report cũ: header 2, data 3).
     ID file lấy từ Script Property 'VS_DENTAL_SSID' — chạy vsSetDentalSource() một lần
     để khai báo, khỏi phải sửa code. Bỏ trống thì dùng ID dự phòng bên dưới. */
  dental: {
    label:     'Dental',
    enabled:   true,
    get ssId(){ return vsDentalSsId_(); },
    names:     ['6. WEEKLY REPORT', 'Dental weekly report', 'Weekly Report'],
    gid:       1177906858,              // gid của tab "6. WEEKLY REPORT" (dự phòng nếu đổi tên tab)
    headerRow: 3,
    dataRow:   4,
    typeTask:  'Sales-Dental',
    keySuffix: 'Dental Customer visiting',
    /* ⚠ Dental gần như KHÔNG có Sale-Hospital. Dữ liệu thật: Sale-Clinics 9 · Sale-University 4 ·
       Sale-Distributor 3 · Sale-Dealer 1. Nếu chỉ muốn Hospital+University như Surgical
       → đổi thành  /hospital|universit/i  */
    typeRe:    /hospital|universit|clinic|dealer|distributor/i,   /* ⭐ v1.8 (#10) */
    appUrl:    'https://script.google.com/macros/s/AKfycbyzmhECZZfbOZUyXOK5O70ukwTgQ9DHp70MN-HUAL0wMpOptdTTbaGcvMEmcnCrCji6/exec'
  },
  /* ⭐ v2.2 — NGUỒN EYELESS: file CRM "MMH Eyeless CRM", tab "6. WEEKLY REPORT"
     (bố cục y hệt Dental/Surgical: header hàng 3, data hàng 4).
     Sales Eyeless nhập đi địa bàn trên web app CRM ⇒ module này tự đẩy sang "WEEKYLY new". */
  eyeless: {
    label:     'Eyeless',
    enabled:   true,
    get ssId(){ return vsEyelessSsId_(); },
    names:     ['6. WEEKLY REPORT', 'Eyeless weekly report', 'Weekly Report'],
    gid:       0,                       // chưa biết gid ⇒ dò theo tên tab
    headerRow: 3,
    dataRow:   4,
    typeTask:  'Sales-Eyeless',
    keySuffix: 'Eyeless Customer visiting',
    /* Khách Eyeless phần lớn là nhà máy sản xuất chỉ khâu ⇒ nhận thêm Factory / Manufacturer /
       Company / OEM / Partner bên cạnh 5 loại chuẩn, phòng khi Master list Eyeless khai thêm. */
    typeRe:    /hospital|universit|clinic|dealer|distributor|factory|manufactur|company|oem|partner/i,
    appUrl:    'https://script.google.com/macros/s/AKfycbxsoTRbRWZRaf-z7-xRy_oIkM-Yv1HoCOjVRO-K6oRRh3Dr7MMg4v53K0qqpMfZ_K5IAg/exec'
  }
};

/* ⭐ v3.0 — HAI FILE CRM RIÊNG (Dental và Surgical).
   Chỉ khai URL web app của mỗi file; ID sheet hỏi thẳng web app qua action
   'sheetInfo' rồi nhớ lại, khỏi phải khai ID ở hai nơi và khỏi khai nhầm.
   Muốn ép cứng thì đặt Script Property 'VS_DENTAL_SSID' / 'VS_SURGICAL_SSID'. */
var VS_CRM_WEBAPP = {
  dental:   'https://script.google.com/macros/s/AKfycbyzmhECZZfbOZUyXOK5O70ukwTgQ9DHp70MN-HUAL0wMpOptdTTbaGcvMEmcnCrCji6/exec',
  surgical: 'https://script.google.com/macros/s/AKfycbxxckrqwkfhE0fszm1XVdpYyEHU_PCKQWMKE_2wBnMTgoJCZ-1nRZ_fhOCPXXsVfEE/exec',
  eyeless:  'https://script.google.com/macros/s/AKfycbxsoTRbRWZRaf-z7-xRy_oIkM-Yv1HoCOjVRO-K6oRRh3Dr7MMg4v53K0qqpMfZ_K5IAg/exec'   /* ⭐ v2.2 */
};
function vsCrmSsId_(team){
  var pk = 'VS_' + String(team).toUpperCase() + '_SSID';
  var props = PropertiesService.getScriptProperties();
  try{
    var v = props.getProperty(pk);
    if (v && String(v).trim()) return String(v).trim();
  }catch(e){}
  var url = VS_CRM_WEBAPP[team];
  if (!url) throw new Error('Chưa khai web app CRM cho nhóm "' + team + '"');
  var r = UrlFetchApp.fetch(url + '?action=sheetInfo&_ts=' + Date.now(),
          { muteHttpExceptions:true, followRedirects:true });
  var j = {};
  try{ j = JSON.parse(r.getContentText()); }catch(e){}
  if (!j.ok || !j.id)
    throw new Error('Không lấy được ID file CRM ' + team +
      '. Kiểm tra file đó đã dán Code.gs v6.6 và Deploy New version chưa.');
  props.setProperty(pk, j.id);
  return j.id;
}
function vsDentalSsId_(){   return vsCrmSsId_('dental');   }
function vsSurgicalSsId_(){ return vsCrmSsId_('surgical'); }
function vsEyelessSsId_(){  return vsCrmSsId_('eyeless');  }   /* ⭐ v2.2 */
/* Xoá ID đã nhớ — dùng khi đổi file CRM */
function vsResetCrmIds(){
  var p = PropertiesService.getScriptProperties();
  p.deleteProperty('VS_DENTAL_SSID'); p.deleteProperty('VS_SURGICAL_SSID'); p.deleteProperty('VS_EYELESS_SSID');
  try{ SpreadsheetApp.getUi().alert('Đã xoá ID đã nhớ. Lần chạy tới sẽ hỏi lại web app CRM.'); }catch(e){}
}
/* ⭐ Khai báo file CRM làm nguồn Dental — chạy 1 lần từ trình soạn Apps Script.
   Dán ID file MMH_Dental_CRM_FY68 (đoạn giữa /d/ và /edit trên thanh địa chỉ). */
function vsSetDentalSource(){
  var ui = SpreadsheetApp.getUi();
  var cur = vsDentalSsId_();
  var r = ui.prompt('Nguồn Dental cho đồng bộ Visiting',
    'Dán ID file Google Sheet của MMH Dental CRM (tab "6. WEEKLY REPORT").\n\n' +
    'Đang dùng: ' + cur + '\n\n' +
    'ID nằm trong link: docs.google.com/spreadsheets/d/<ID>/edit',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var id = String(r.getResponseText()||'').trim().replace(/^.*\/d\//,'').replace(/\/.*$/,'');
  if (!id) return ui.alert('Chưa nhập ID.');
  try{
    var sp = SpreadsheetApp.openById(id);
    PropertiesService.getScriptProperties().setProperty('VS_DENTAL_SSID', id);
    ui.alert('Đã trỏ nguồn Dental sang:\n\n' + sp.getName() + '\n\n' +
             'Chạy tiếp vsDebugSource("dental") để kiểm tra đọc được bao nhiêu dòng.');
  }catch(e){ ui.alert('Không mở được file với ID này:\n' + e.message); }
}

/* Tên PIC ở sheet nguồn ⇄ tên PIC trong USER_MAP của Report Hub */
var VS_PIC_ALIAS = {
  'viet ha': 'Viet Ha',  'vietha': 'Viet Ha',
  'khang': 'Khang',      'le thanh khang': 'Khang',
  'trang': 'Trang',      'nguyen trang': 'Trang',   /* ⭐ v2.2 — Eyeless Sales PIC */
  'vinh': 'Vinh',        'phuong': 'Phuong',
  'viet': 'Viet',        'minh viet': 'Viet'      // ⭐ USER_MAP dùng "Viet"
};
/* PIC ở nguồn KHÔNG đưa sang Report Hub (dòng test / người ngoài team sales) */
var VS_PIC_SKIP = { 'test': 1, 'nguyen ha': 1, 'ha': 1 };

/* Loại account nhận diện trong chuỗi "Tên/Loại/Tỉnh/Vùng" */
var VS_ACC_TYPES = /^(hospital|clinic|clinics|university|universities|distributor|dealer|institute|factory|manufacturer|company|oem|mmh)$/i;

/* ══════════════ TIỆN ÍCH ══════════════ */
function vsNorm(s){
  return String(s == null ? '' : s)
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}
function vsHash(s){
  var h = 5381; s = String(s);
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}
function vsPicName(raw){
  var n = String(raw || '').replace(/[\r\n]+/g, ' ').trim();
  var k = n.toLowerCase().replace(/\s+/g, ' ');
  return VS_PIC_ALIAS[k] || VS_PIC_ALIAS[k.replace(/\s/g, '')] || n;
}
function vsPicSkipped(name){
  return !!VS_PIC_SKIP[String(name || '').toLowerCase().replace(/\s+/g, ' ').trim()];
}
function vsYm(d){ return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2); }
function vsMonthWindow(){
  var out = [], now = new Date();
  for (var i = -VS_BACK_MONTHS; i <= VS_FWD_MONTHS; i++) {
    out.push(vsYm(new Date(now.getFullYear(), now.getMonth() + i, 1)));
  }
  return out;
}

/* Ngày → 'yyyy-MM-dd'. Nhận Date, 'yyyy-MM-dd' và text 'dd/MM/yyyy'. */
function vsDateISO(v){
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2);
  }
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);          // dd/MM/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
/* Chống ngày/tháng bị hoán đổi: nếu ngày lệch Start Month mà hoán đổi thì khớp → đổi.
   VD đọc ra 2025-06-05 nhưng Start Month = 202505 ⇒ thực tế 06/05/2025 = 2025-05-06. */
function vsAlignDate(iso, ym){
  if (!iso || !ym || ym.length !== 6) return iso;
  if (iso.slice(0, 4) + iso.slice(5, 7) === ym) return iso;
  var y = iso.slice(0, 4), mo = iso.slice(5, 7), d = iso.slice(8, 10);
  if (+d >= 1 && +d <= 12 && (y + d) === ym) return y + '-' + d + '-' + mo;
  return iso;
}

/* ⭐ v1.8 (#11) — Sales Process thống nhất tiếng Anh trên toàn hệ thống.
   Sheet nguồn đang lẫn cả tiếng Việt lẫn tiếng Anh → quy về 4 giá trị chuẩn. */
var VS_PROCESS_MAP = {
  'tim hieu': 'Identify',   'identify': 'Identify',
  'thuyet phuc': 'Engage',  'engage':   'Engage',
  'chuyen doi': 'Convert',  'convert':  'Convert',
  'duy tri': 'Maintain',    'maintain': 'Maintain'
};
function vsProcessEN(v){
  var raw = String(v || '').trim();
  if (!raw) return '';
  var k = raw.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g,'a').replace(/[èéẹẻẽêềếệểễ]/g,'e')
    .replace(/[ìíịỉĩ]/g,'i').replace(/[òóọỏõôồốộổỗơờớợởỡ]/g,'o')
    .replace(/[ùúụủũưừứựửữ]/g,'u').replace(/[ỳýỵỷỹ]/g,'y').replace(/đ/g,'d')
    .replace(/[^a-z0-9]+/g,' ').trim();
  if (VS_PROCESS_MAP[k]) return VS_PROCESS_MAP[k];
  var hit = '';
  Object.keys(VS_PROCESS_MAP).forEach(function(x){ if (!hit && k.indexOf(x) >= 0) hit = VS_PROCESS_MAP[x]; });
  return hit || raw;
}

/* ⭐ v1.9 (#4) — KHOÁ ĐỒNG BỘ THEO NỘI DUNG, KHÔNG THEO SỐ DÒNG.
   Trước đây syncKey = 'V:<nguồn>:<số dòng>'. Sales xoá 1 dòng ở sheet gốc thì MỌI dòng
   bên dưới dịch lên ⇒ toàn bộ khoá đổi ⇒ hệ thống xoá hàng loạt rồi chèn lại hàng loạt,
   vượt trần VS_MAX_DEL nên dòng đã xoá ở nguồn vẫn nằm lại bên Report Hub.
   Nay khoá gồm PIC + ngày + tên account ⇒ xoá 1 dòng ở nguồn thì đúng 1 dòng bên Hub bị gỡ.
   Dòng trùng hệt nhau (cùng người, cùng ngày, cùng khách) được đánh số #2, #3… */
function vsMakeKey(srcKey, pic, iso, tag, seen){
  var base = 'V:' + srcKey + ':' +
             vsHash([String(pic || ''), String(iso || ''), String(tag || '')].join('¦'));
  seen[base] = (seen[base] || 0) + 1;
  return seen[base] > 1 ? (base + '#' + seen[base]) : base;
}

function vsIsVisitType(tt, re){
  var t = String(tt || '');
  if (!/^\s*sales?\s*[-–—]/i.test(t)) return false;
  return (re || /hospital|universit/i).test(t);
}
function vsTypeTag(tt){
  var t = String(tt || '');
  if (/universit/i.test(t))                      return 'University';
  if (/clinic/i.test(t))                         return 'Clinic';
  if (/dealer/i.test(t))                         return 'Dealer';
  if (/distributor/i.test(t))                    return 'Distributor';
  if (/factory|manufactur|oem/i.test(t))         return 'Factory';      /* ⭐ v2.2 — khách Eyeless */
  if (/public/i.test(t)  && /hospital/i.test(t)) return 'Public Hospital';
  if (/private/i.test(t) && /hospital/i.test(t)) return 'Private Hospital';
  if (/hospital/i.test(t))                       return 'Hospital';
  return t.replace(/^\s*sales?\s*[-–—]\s*/i, '');
}
/* "BỆNH VIỆN ĐH PHENIKAA/Ha Noi/North" → {name, accType:'', loc:'Ha Noi · North'}
   "Nhân Hòa/Clinic/Ho Chi Minh/South"  → {name, accType:'Clinic', loc:'Ho Chi Minh · South'} */
function vsSplitAccount(raw){
  var parts = String(raw || '').split('/').map(function(x){ return String(x).trim(); }).filter(Boolean);
  var name = parts.shift() || '';
  var accType = '', loc = [];
  parts.forEach(function(p){ if (!accType && VS_ACC_TYPES.test(p)) accType = p; else loc.push(p); });
  return { name: name, accType: accType, loc: loc.join(' · ') };
}

/* ══════════════ ĐỌC SHEET NGUỒN ══════════════ */
/* Alias header — phủ CẢ Surgical lẫn Dental (thứ tự = độ ưu tiên) */
var VS_HEADERS = {
  startMonth:   ['startmonth'],
  startDate:    ['startdate', 'datestart'],
  finishDate:   ['finishdate', 'datefinish'],
  pic:          ['salespic', 'salepic', 'pic'],
  account:      ['checkaccountname', 'accountname', 'account'],
  productGroup: ['productgroup', 'product'],
  typeTask:     ['typetask'],
  typeAction:   ['typeaction'],
  salesProcess: ['salesprocess'],
  plan:         ['plan'],
  taskResult:   ['taskresult', 'taskresultlink'],
  taskStatus:   ['taskstatus', 'status'],
  feedback:     ['customerfeedbacktype', 'customerfeedback', 'feedback'],
  nextAction:   ['nextaction'],
  stopReason:   ['stopreason'],
  photo:        ['photo', 'kpiphoto', 'photolink']
};
/* Field KHÔNG dò kiểu "chứa từ khoá" (dễ bắt nhầm cột khác) */
var VS_EXACT_ONLY = { plan: 1, pic: 1, account: 1, photo: 1, taskStatus: 1, productGroup: 1 };

function vsColMap(headRow){
  var norm = headRow.map(vsNorm), map = {}, used = {}, f, i, j;
  function take(f, i){ map[f] = i + 1; used[i] = 1; }
  /* ① khớp CHÍNH XÁC, theo thứ tự ưu tiên alias */
  for (f in VS_HEADERS) {
    for (j = 0; j < VS_HEADERS[f].length && !map[f]; j++) {
      for (i = 0; i < norm.length; i++) {
        if (!used[i] && norm[i] && norm[i] === VS_HEADERS[f][j]) { take(f, i); break; }
      }
    }
  }
  /* ② khớp GẦN ĐÚNG cho field còn thiếu */
  for (f in VS_HEADERS) {
    if (map[f] || VS_EXACT_ONLY[f]) continue;
    for (j = 0; j < VS_HEADERS[f].length && !map[f]; j++) {
      for (i = 0; i < norm.length; i++) {
        if (!used[i] && norm[i] && norm[i].indexOf(VS_HEADERS[f][j]) >= 0) { take(f, i); break; }
      }
    }
  }
  return map;
}

function vsResolveSourceSheet(cfg){
  var sp = SpreadsheetApp.openById(cfg.ssId);
  var all = sp.getSheets(), sh = null, i, j;
  /* ① theo TÊN (ưu tiên — gid trong link có thể sai) */
  for (j = 0; j < cfg.names.length && !sh; j++) {
    var want = vsNorm(cfg.names[j]);
    for (i = 0; i < all.length; i++) if (vsNorm(all[i].getName()) === want) { sh = all[i]; break; }
  }
  /* ② theo GID */
  if (!sh && cfg.gid) { for (i = 0; i < all.length; i++) if (all[i].getSheetId() === cfg.gid) { sh = all[i]; break; } }
  /* ③ tên CHỨA từ khoá */
  if (!sh) {
    for (j = 0; j < cfg.names.length && !sh; j++) {
      var k = vsNorm(cfg.names[j]);
      for (i = 0; i < all.length; i++) if (vsNorm(all[i].getName()).indexOf(k) >= 0) { sh = all[i]; break; }
    }
  }
  if (!sh) throw new Error('không tìm thấy tab (' + cfg.names.join(' / ') + ')');
  return sh;
}

function vsReadSource(srcKey){
  var cfg = VISIT_SOURCES[srcKey];
  if (!cfg) return [];
  var sh = vsResolveSourceSheet(cfg);
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < cfg.dataRow) return [];

  var head = sh.getRange(cfg.headerRow, 1, 1, lastCol).getValues()[0];
  var C = vsColMap(head);
  ['startDate', 'pic', 'account', 'typeTask'].forEach(function(f){
    if (!C[f]) throw new Error('thiếu cột "' + f + '" ở header hàng ' + cfg.headerRow);
  });

  var vals = sh.getRange(cfg.dataRow, 1, lastRow - cfg.dataRow + 1, lastCol).getValues();
  var out = [], i, seen = {};
  for (i = 0; i < vals.length; i++) {
    var v = vals[i];
    var g = function(f){ return C[f] ? v[C[f] - 1] : ''; };
    var typeTask = String(g('typeTask') || '').trim();
    if (!vsIsVisitType(typeTask, cfg.typeRe)) continue;

    var accRaw = String(g('account') || '').trim();
    var pic    = vsPicName(g('pic'));
    if (!accRaw || !pic || vsPicSkipped(pic)) continue;
    /* ⭐ v2.0 — BỎ HẲN nhánh "Working at office". Dòng có Check account name = MMH là việc
       nội bộ; Sales tự tạo Key Task cho các việc này trên webapp giống mọi phòng ban khác.
       Chỉ Customer visiting là đồng bộ tự động. */
    if (vsIsOfficeAccount(accRaw)) continue;
    var isOffice = false;

    /* ⭐ v1.8 (#9): THÁNG CĂN CỨ THEO "Start date", không dùng "Start month" nữa.
       Start month ở sheet nguồn hay bị điền lệch/để trống nên sub task rơi sai key task.
       Chỉ khi Start date rỗng mới lấy tạm Start month làm phương án dự phòng. */
    var smRaw = String(g('startMonth') || '').replace(/\D/g, '').slice(0, 6);
    var sIso  = vsDateISO(g('startDate'));
    if (sIso) sIso = vsAlignDate(sIso, smRaw.length === 6 ? smRaw : '');
    var ym = sIso ? (sIso.slice(0, 4) + sIso.slice(5, 7)) : smRaw;
    if (ym.length !== 6) continue;
    var fIso = vsAlignDate(vsDateISO(g('finishDate')), ym) || sIso;

    var acc = vsSplitAccount(accRaw);
    out.push({
      src: srcKey, row: cfg.dataRow + i, ym: ym, isOffice: isOffice,
      startDate: sIso, finishDate: fIso, pic: pic,
      accountRaw: accRaw, account: acc.name, accType: acc.accType, loc: acc.loc,
      productGroup: String(g('productGroup') || '').trim(),
      typeTask: typeTask,
      typeAction: String(g('typeAction') || '').trim(),
      salesProcess: vsProcessEN(g('salesProcess')),          /* ⭐ v1.8 (#11) */
      plan: String(g('plan') || '').trim(),
      taskResult: String(g('taskResult') || '').trim(),
      taskStatus: String(g('taskStatus') || '').trim(),
      feedback: String(g('feedback') || '').trim(),
      nextAction: String(g('nextAction') || '').trim(),
      stopReason: String(g('stopReason') || '').trim(),
      photo: String(g('photo') || '').trim().replace(/^#VALUE!$/, ''),
      syncKey: vsMakeKey(srcKey, pic, sIso, isOffice ? ('OFFICE|' + typeTask) : accRaw, seen)
    });
  }
  return out;
}

/* ══════════════ DỰNG NỘI DUNG DÒNG SUB TASK ══════════════ */
function vsResultText(it){
  var parts = [];
  var pTag = it.taskStatus ? ' [' + it.taskStatus + ']' : '';
  if (it.plan)   parts.push('📋 KẾ HOẠCH' + pTag + '\n' + it.plan);
  else if (pTag) parts.push('📋 KẾ HOẠCH' + pTag);

  var rTags = [];
  if (it.feedback)   rTags.push(it.feedback);
  if (it.nextAction) rTags.push(it.nextAction);
  var rTag = rTags.length ? ' [' + rTags.join('] [') + ']' : '';
  if (it.taskResult) parts.push('✅ KẾT QUẢ' + rTag + '\n' + it.taskResult);
  else if (rTag)     parts.push('✅ KẾT QUẢ' + rTag);

  if (it.stopReason) parts.push('⛔ Lý do dừng: ' + it.stopReason);
  if (it.photo)      parts.push('📷 ' + it.photo);
  return parts.join('\n\n');
}

/* Completed → 100 · "In Progress 25%/50%/75%" → đúng % đó ·
   Not Started / rỗng & chưa có Task Result → To Do */
function vsStatusOf(it){
  var st = String(it.taskStatus || '');
  var hasResult = !!String(it.taskResult || '').trim();
  if (/complet|hoàn thành/i.test(st)) return { status: 'Completed', pct: 100 };
  if (/cancel|huỷ|hủy/i.test(st))     return { status: 'Cancelled', pct: 0 };
  if (/progress|đang/i.test(st)) {
    var m = /(\d{1,3})\s*%/.exec(st);
    var p = m ? Math.max(0, Math.min(100, parseInt(m[1], 10))) : (hasResult ? 50 : 25);
    if (p < 25) p = 25;
    return { status: 'In Progress', pct: p };
  }
  if (!hasResult) return { status: 'To Do', pct: 0 };
  return { status: 'In Progress', pct: 50 };
}

/* ⭐ v1.8 (#7) — tên sub task của nhóm Office: YYYYMMDD_Office_<Type> */
function vsOfficeSubName(it){
  var d = String(it.startDate || '').replace(/\D/g, '').slice(0, 8) || (it.ym + '01');
  var ty = String(it.typeTask || '').split(/[-–—]/).slice(1).join('-').trim() || it.typeTask || 'Work';
  return d + '_Office_' + ty;
}

function vsBuildRow(it, cfg){
  var s = vsStatusOf(it);
  /* Dòng Office: chỉ giữ tag trạng thái, BỎ các tag Product group / Sales process /
     Customer feedback / Next action / Type khách hàng (yêu cầu #7). */
  var meta = it.isOffice ? {
    s: it.src, r: it.row, of: 1,
    tt: it.typeTask,
    ts: it.taskStatus,
    ph: it.photo
  } : {
    s:  it.src,                                    // nguồn → frontend dựng link Field Report
    r:  it.row,
    t:  it.accType || vsTypeTag(it.typeTask),      // Hospital / University / Clinic …
    tt: it.typeTask,
    ta: it.typeAction,
    pg: it.productGroup,
    sp: it.salesProcess,
    lo: it.loc,
    ts: it.taskStatus,
    fb: it.feedback,
    na: it.nextAction,
    ph: it.photo
  };
  var o = {
    syncKey: it.syncKey,
    title:   it.ym + '_' + (it.isOffice ? VS_OFFICE_SUFFIX : cfg.keySuffix),
    type: '', keyTask: '',
    subTask:  it.isOffice ? vsOfficeSubName(it) : it.account,
    pic:      it.pic,
    result:   vsResultText(it),
    start:    it.startDate,
    planned:  it.finishDate || it.startDate,
    status:   s.status,
    progress: s.pct,
    meta: meta
  };
  o.hash = vsHash([o.subTask, o.pic, o.result, o.start, o.planned, o.status, o.progress,
                   JSON.stringify(meta)].join('¦'));
  meta.h = o.hash;
  return o;
}

/* ══════════════ GHI XUỐNG SHEET BACKEND ══════════════ */
/* ⭐ v1.2 — Tìm dòng GẦN NHẤT PHÍA TRÊN thực sự có công thức ở cột `col`.
   Trước đây chỉ lấy đúng dòng ngay trên; nếu dòng đó trống (rất hay gặp ở cuối bảng)
   thì cột No./FY/Month không được điền ⇒ readWeekly() bỏ qua dòng ⇒ webapp không thấy. */
function vsFormulaSourceRow(sh, fromRow, col){
  var min = Math.max(WEEKLY_DATA_ROW, fromRow - 400);
  for (var r = fromRow; r >= min; r--) {
    var f = '';
    try { f = sh.getRange(r, col).getFormula(); } catch (e) {}
    if (f && !/ARRAYFORMULA/i.test(f)) return r;
  }
  return 0;
}
function vsFillDownFormulas(sh, fromRow, startRow, count){
  if (!count || count < 1) return;
  [2, 3, 4, 13, 16, 17].forEach(function(c){
    var src = vsFormulaSourceRow(sh, fromRow, c);
    if (!src) return;
    try { sh.getRange(src, c).copyTo(sh.getRange(startRow, c, count, 1)); } catch (e) {}
  });
}

/* ⭐ v1.2 — GHI AN TOÀN.
   Nguyên nhân gốc của lỗi "Surgical nhảy dòng trắng": cột PIC (H) / Type (E) / Status (N)
   trên sheet Report Hub có Data Validation kiểu "Từ chối dữ liệu". PIC Surgical ('Viet Ha',
   'Khang') và Type 'Sales-Surgical' KHÔNG có trong danh sách Master ⇒ setValues() ném lỗi
   ⇒ vsSync nhảy vào catch NGAY SAU khi đã insertRowsAfter() ⇒ dòng đã chèn nằm lại trắng
   trơn, cột U (syncKey) chưa kịp ghi ⇒ lần chạy kế tiếp coi như "chưa có" và chèn thêm nữa.
   Cách xử lý: thử ghi → lỗi thì GỠ VALIDATION đúng dải dòng hệ thống (dòng do máy đồng bộ,
   người dùng không nhập tay) rồi ghi lại → vẫn lỗi thì ghi từng dòng để khoanh vùng. */
function vsSetValuesSafe(rng, vals){
  try { rng.setValues(vals); return ''; }
  catch (e1) {
    try { rng.clearDataValidations(); } catch (e2) {}
    try { rng.setValues(vals); return ''; }
    catch (e3) { return String(e3 && e3.message || e3); }
  }
}

/* Trả về { ok, failed:[dòng lỗi], err:'thông báo đầu tiên' } — KHÔNG ném lỗi ra ngoài. */
function vsWriteRows(sh, startRow, rows){
  var n = rows.length;
  if (!n) return { ok: true, failed: [], err: '' };
  var el = [], no = [], uv = [];
  rows.forEach(function(o){
    /* E..L : Type | Key Task | Sub Task | PIC | Result | Start | Planned | Revised  (bỏ M = công thức) */
    el.push([o.type || '', o.keyTask || '', o.subTask || '', o.pic || '', o.result || '',
             s2d(o.start) || '', s2d(o.planned) || '', '']);
    no.push([o.status || '', pctToCell(o.progress || 0)]);                    // N..O
    uv.push([o.syncKey || '', o.meta ? JSON.stringify(o.meta) : '']);         // U..V
  });

  var e1 = vsSetValuesSafe(sh.getRange(startRow, 5,  n, 8), el);
  var e2 = vsSetValuesSafe(sh.getRange(startRow, 14, n, 2), no);
  var e3 = vsSetValuesSafe(sh.getRange(startRow, VISIT_COL_KEY, n, 2), uv);
  if (!e1 && !e2 && !e3) return { ok: true, failed: [], err: '' };

  /* Ghi lại từng dòng để chỉ loại đúng dòng hỏng, giữ các dòng còn lại */
  var failed = [], firstErr = e1 || e2 || e3;
  for (var i = 0; i < n; i++) {
    var r  = startRow + i;
    var a = vsSetValuesSafe(sh.getRange(r, 5,  1, 8), [el[i]]);
    var b = vsSetValuesSafe(sh.getRange(r, 14, 1, 2), [no[i]]);
    var c = vsSetValuesSafe(sh.getRange(r, VISIT_COL_KEY, 1, 2), [uv[i]]);
    if (a || b || c) { failed.push(r); firstErr = firstErr || a || b || c; }
  }
  return { ok: failed.length === 0, failed: failed, err: firstErr };
}

function vsScan(sh){
  var last = sh.getLastRow();
  var idx = { keyRow: {}, sub: {}, blockEnd: {}, lastContent: WEEKLY_DATA_ROW - 1, blank: [] };
  if (last < WEEKLY_DATA_ROW) return idx;
  var n = last - WEEKLY_DATA_ROW + 1;
  var w = Math.min(VISIT_COL_META, sh.getMaxColumns()) - 1;    // B..V (kẹp theo số cột thật)
  var v = sh.getRange(WEEKLY_DATA_ROW, 2, n, w).getValues();
  var iKey = VISIT_COL_KEY - 2, iMeta = VISIT_COL_META - 2;
  var curTitle = '';
  for (var i = 0; i < n; i++) {
    var row = WEEKLY_DATA_ROW + i;
    var e = String(v[i][3] || '').trim(), f = String(v[i][4] || '').trim(), g = String(v[i][5] || '').trim();
    var sk = String(v[i][iKey] || '').trim();
    var hasContent = !!(e || f || g || sk);
    if (hasContent) idx.lastContent = row; else idx.blank.push(row);

    if (f) { curTitle = f; idx.keyRow[f] = row; idx.blockEnd[f] = row; }
    /* ⭐ v1.2: CHỈ mở rộng blockEnd trên dòng CÓ nội dung.
       Trước đây dòng trống cũng được tính ⇒ blockEnd của key task CUỐI bảng
       (Surgical — sort A→Z nên luôn đứng sau Dental) = dòng cuối sheet
       ⇒ sub mới bị chèn tít dưới đáy, để lại một vùng trắng ở giữa. */
    else if (curTitle && hasContent) idx.blockEnd[curTitle] = row;

    if (sk && sk.indexOf('V:') === 0) {
      var h = '';
      try { h = (JSON.parse(String(v[i][iMeta] || '{}')) || {}).h || ''; } catch (er) {}
      idx.sub[sk] = { row: row, title: curTitle, hash: h };
    }
  }
  return idx;
}

/* ══════════════ DỌN DÒNG TRẮNG TRONG VÙNG VISITING (tự chữa lành) ══════════════
   ⭐ v1.6 — Bất kể lượt trước chết vì lý do gì (hết thời gian, lỗi ghi, mất mạng),
   dòng đã insertRowsAfter() mà chưa kịp ghi sẽ nằm lại TRẮNG và KHÔNG có syncKey ở cột U
   ⇒ lượt sau lại chèn tiếp ⇒ trắng chồng trắng. Nay MỖI lượt đồng bộ đều quét dọn trước.
   Chỉ dọn từ Key Task "Customer visiting" ĐẦU TIÊN trở xuống — phần Marketing phía trên
   giữ nguyên tuyệt đối, kể cả dòng trống người dùng cố ý chừa. */
function vsSweepBlanks(sh, cap){
  var lastRow = sh.getLastRow();
  if (lastRow < WEEKLY_DATA_ROW) return { found: 0, deleted: 0 };
  var idx = vsScan(sh), from = 0;
  Object.keys(idx.keyRow).forEach(function(t){
    if (!/Customer visiting/i.test(t)) return;
    if (!from || idx.keyRow[t] < from) from = idx.keyRow[t];
  });
  if (!from) return { found: 0, deleted: 0 };
  if (lastRow < from) return { found: 0, deleted: 0 };

  var lastCol = Math.max(sh.getLastColumn(), VISIT_COL_META);
  var vals = sh.getRange(from, 2, lastRow - from + 1, lastCol - 1).getValues();
  var blanks = [];
  for (var i = 0; i < vals.length; i++) {
    var any = false;
    for (var c = 0; c < vals[i].length; c++) {
      if (String(vals[i][c] == null ? '' : vals[i][c]).trim()) { any = true; break; }
    }
    if (!any) blanks.push(from + i);
  }
  var found = blanks.length;
  blanks = blanks.slice(-(cap || 500));
  blanks.sort(function(a, b){ return b - a; });
  var deleted = 0;
  for (var k = 0; k < blanks.length; ) {
    var end = blanks[k], cnt = 1;
    while (k + cnt < blanks.length && blanks[k + cnt] === end - cnt) cnt++;
    sh.deleteRows(end - cnt + 1, cnt);
    deleted += cnt; k += cnt;
  }
  if (deleted) SpreadsheetApp.flush();
  return { found: found, deleted: deleted };
}

/* ══════════════ ĐỒNG BỘ CHÍNH ══════════════ */
function vsSync(opt){
  opt = opt || {};
  /* ⭐ 10/10/2026 — lịch đi địa bàn của Sales không chép sang file MKT nữa (MMH_SalesMove.gs): chỉ dọn dòng cũ */
  if (typeof VS_MOVED !== 'undefined' && VS_MOVED && typeof vsMovedPurge_ === 'function') return vsMovedPurge_();
  var T0 = Date.now();
  function timeUp(){ return (Date.now() - T0) > VS_TIME_BUDGET; }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'Đang có tiến trình đồng bộ khác, thử lại sau.' };
  try {
    var sh = shWeekly();
    if (!sh) return { ok: false, error: 'Không mở được sheet WEEKLY của Report Hub' };
    if (sh.getMaxColumns() < VISIT_COL_META) sh.insertColumnsAfter(sh.getMaxColumns(), VISIT_COL_META - sh.getMaxColumns());

    var rep = { ok: true, keysCreated: 0, inserted: 0, updated: 0, deleted: 0,
                blankSwept: 0, failed: 0, partial: false, seconds: 0,
                sources: [], skipped: [], errors: [] };
    var months = vsMonthsOf(opt);
    var wanted = {}, titles = {};
    var failedSrc = {};   /* ⭐ v2.2 — nguồn đọc lỗi lượt này ⇒ KHÔNG xoá sub của nguồn đó */

    /* ⓪ TỰ CHỮA LÀNH: dọn dòng trắng sót lại của các lượt trước */
    try { var sw = vsSweepBlanks(sh, VS_SWEEP_MAX); rep.blankSwept = sw.deleted; } catch (e) {}

    Object.keys(VISIT_SOURCES).forEach(function(k){
      var cfg = VISIT_SOURCES[k];
      if (!cfg.enabled) return;
      if (opt.only && opt.only !== k) return;
      var items;
      try { items = vsReadSource(k); }
      catch (err) { failedSrc[k] = 1; rep.skipped.push(cfg.label + ': ' + (err.message || err)); return; }
      var cnt = 0;
      items.forEach(function(it){
        if (months.indexOf(it.ym) < 0) return;
        var o = vsBuildRow(it, cfg);
        wanted[o.syncKey] = o; titles[o.title] = cfg; cnt++;
      });
      rep.sources.push(cfg.label + ': ' + cnt + ' dòng trong kỳ ' + months.join('/'));
    });

    /* ① Tạo KEY TASK còn thiếu (nối cuối bảng — không xô lệch dòng cũ) */
    var idx = vsScan(sh);
    Object.keys(titles).sort().forEach(function(title){
      if (idx.keyRow[title]) return;
      var cfg = titles[title];
      var row = firstEmptyContentRow(sh);
      var rk = vsWriteRows(sh, row, [{
        syncKey: 'VK:' + title, type: cfg.typeTask, keyTask: title, subTask: '',
        pic: '', result: '', start: '', planned: '', status: 'To Do', progress: 0,
        meta: { s: 'KEY', t: cfg.label }
      }]);
      if (!rk.ok) { rep.errors.push('Key "' + title + '": ' + rk.err); return; }
      if (row > WEEKLY_DATA_ROW) vsFillDownFormulas(sh, row - 1, row, 1);
      rep.keysCreated++;
    });
    if (rep.keysCreated) SpreadsheetApp.flush();

    /* ② XOÁ sub đã gỡ ở nguồn / đổi sang tháng khác (xoá từ dưới lên, theo cụm) */
    idx = vsScan(sh);
    var dels = [];
    Object.keys(idx.sub).forEach(function(sk){
      var cur = idx.sub[sk], w = wanted[sk], srcKey = sk.split(':')[1];
      var cfg = VISIT_SOURCES[srcKey];
      if (!cfg || !cfg.enabled) return;
      if (opt.only && opt.only !== srcKey) return;
      if (failedSrc[srcKey]) return;          /* ⭐ v2.2 — đọc nguồn lỗi ≠ nguồn rỗng */
      var inWindow = months.some(function(m){ return cur.title.indexOf(m + '_') === 0; });
      if (!inWindow) return;
      if (!w || w.title !== cur.title) dels.push(cur.row);
    });
    dels.sort(function(a, b){ return b - a; });
    dels = dels.slice(0, VS_MAX_DEL);
    for (var di = 0; di < dels.length; ) {
      var end = dels[di], cnt = 1;
      while (di + cnt < dels.length && dels[di + cnt] === end - cnt) cnt++;
      sh.deleteRows(end - cnt + 1, cnt);
      rep.deleted += cnt; di += cnt;
    }
    if (rep.deleted) SpreadsheetApp.flush();

    /* ③ CẬP NHẬT tại chỗ — ⭐ v1.6 GOM DÒNG LIỀN NHAU THÀNH 1 LỆNH GHI.
       Trước đây mỗi dòng 1 lần vsWriteRows = 3 setValues; 187 dòng Surgical ⇒ ~560 lệnh
       ghi lẻ ⇒ thừa sức chạm trần 6 phút của trigger và chết giữa chừng. */
    idx = vsScan(sh);
    var todo = [];
    Object.keys(wanted).forEach(function(sk){
      var w = wanted[sk], cur = idx.sub[sk];
      if (!cur || cur.title !== w.title) return;
      if (cur.hash && cur.hash === w.hash) return;
      todo.push({ row: cur.row, obj: w });
    });
    todo.sort(function(a, b){ return a.row - b.row; });
    todo = todo.slice(0, VS_MAX_UPD);
    for (var u = 0; u < todo.length; ) {
      if (timeUp()) { rep.partial = true; break; }
      var grp = [todo[u].obj], u2 = u + 1;
      while (u2 < todo.length && todo[u2].row === todo[u2 - 1].row + 1 && grp.length < VS_CHUNK) {
        grp.push(todo[u2].obj); u2++;
      }
      var ru = vsWriteRows(sh, todo[u].row, grp);
      if (ru.ok) rep.updated += grp.length;
      else {
        rep.failed += ru.failed.length;
        rep.updated += grp.length - ru.failed.length;
        if (rep.errors.length < 5) rep.errors.push('Cập nhật dòng ' + todo[u].row + ': ' + ru.err);
      }
      u = u2;
    }

    /* ④ CHÈN sub mới — duyệt key từ DƯỚI lên để row phía trên không lệch */
    var newByTitle = {};
    Object.keys(wanted).forEach(function(sk){
      if (idx.sub[sk] && idx.sub[sk].title === wanted[sk].title) return;
      var t = wanted[sk].title;
      (newByTitle[t] = newByTitle[t] || []).push(wanted[sk]);
    });

    var insOps = 0;
    Object.keys(newByTitle)
      .sort(function(a, b){ return (idx.blockEnd[b] || 0) - (idx.blockEnd[a] || 0); })
      .forEach(function(t){
        if (insOps >= VS_MAX_INS || rep.partial) return;
        var after = idx.blockEnd[t];
        if (!after) {
          after = idx.keyRow[t] || 0;
          if (!after) { rep.errors.push('Không thấy Key Task "' + t + '" — bỏ qua lượt này'); return; }
        }
        var list = newByTitle[t].slice(0, VS_MAX_INS - insOps);
        list.sort(function(a, b){ return String(a.start).localeCompare(String(b.start)); });

        /* ⭐ v1.6 CHÈN THEO LÔ NHỎ: mỗi lô insert + ghi + điền công thức xong hẳn rồi mới
           sang lô kế. Nếu hết giờ giữa chừng, phần đã làm là TRỌN VẸN (có syncKey) và
           không để lại dòng trắng nào — lượt sau chạy tiếp phần còn lại. */
        for (var b = 0; b < list.length; b += VS_CHUNK) {
          if (timeUp()) { rep.partial = true; break; }
          var chunk = list.slice(b, b + VS_CHUNK);
          var maxRows = sh.getMaxRows();
          if (after + chunk.length > maxRows) sh.insertRowsAfter(maxRows, after + chunk.length - maxRows);
          sh.insertRowsAfter(after, chunk.length);

          var ri = vsWriteRows(sh, after + 1, chunk);
          vsFillDownFormulas(sh, after, after + 1, chunk.length);

          /* ROLLBACK: dòng nào ghi hỏng thì xoá lại, không để dòng trắng nằm lại */
          if (!ri.ok) {
            ri.failed.slice().sort(function(x, y){ return y - x; })
              .forEach(function(r){ try { sh.deleteRow(r); } catch (e) {} });
            rep.failed += ri.failed.length;
            if (rep.errors.length < 5) rep.errors.push('Chèn "' + t + '": ' + ri.err);
          }
          var okCnt = chunk.length - (ri.failed ? ri.failed.length : 0);
          rep.inserted += okCnt; insOps += chunk.length;
          after += okCnt;                       /* lô kế nối ngay sau lô vừa ghi */
          SpreadsheetApp.flush();
        }
      });

    SpreadsheetApp.flush();

    /* ⑤ Tổng hợp % + trạng thái cho từng Key Task (bỏ qua nếu đã hết giờ) */
    if (!rep.partial && (rep.inserted || rep.updated || rep.deleted || rep.keysCreated)) {
      var fresh = vsScan(sh);
      Object.keys(titles).forEach(function(t){
        if (timeUp()) { rep.partial = true; return; }
        var kr = fresh.keyRow[t]; if (!kr) return;
        var kno = String(sh.getRange(kr, 2).getValue() || '').trim();
        if (kno) { try { syncKeyRollup(sh, kno); } catch (e) {} }
      });
      try { touchVersion(); } catch (e) {}
      try { _SH_CACHE = {}; } catch (e) {}
    }

    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Customer visiting — key mới ' + rep.keysCreated + ' · thêm ' + rep.inserted +
                  ' · cập nhật ' + rep.updated + ' · xoá ' + rep.deleted +
                  (rep.blankSwept ? ' · dọn ' + rep.blankSwept + ' dòng trắng' : '') +
                  (rep.failed ? ' · LỖI GHI ' + rep.failed : '') +
                  ' · ' + rep.seconds + 's' +
                  (rep.partial ? ' · CHƯA XONG (hết thời gian) — lượt sau chạy tiếp' : '') +
                  (rep.skipped.length ? ' · BỎ QUA: ' + rep.skipped.join(' | ') : '') +
                  (rep.errors.length ? ' · ' + rep.errors.join(' | ') : '');
    return rep;
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* ⭐ v1.7 — Danh sách tháng cần xử lý: opt.months (đồng bộ tay, chọn tháng) hoặc cửa sổ mặc định */
function vsMonthsOf(opt){
  var m = opt && opt.months;
  if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = String(m).split(/[,\s]+/); } }
  if (Object.prototype.toString.call(m) === '[object Array]') {
    var out = [];
    m.forEach(function(x){
      var v = String(x == null ? '' : x).replace(/\D/g, '').slice(0, 6);
      if (v.length === 6 && out.indexOf(v) < 0) out.push(v);
    });
    if (out.length) return out;
  }
  return vsMonthWindow();
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * ⭐ v1.7 — vsStatusReport(): BẢNG TÌNH TRẠNG TỪNG THÁNG / TỪNG NHÓM
 * Frontend gọi để biết tháng nào ĐÃ đồng bộ đủ (loại trừ) và tháng nào còn thiếu.
 *   src      : surgical | dental
 *   ym       : 202608
 *   srcCount : số dòng hợp lệ ở sheet Field Report
 *   synced   : đã có trên Report Hub và khớp nội dung (không cần làm gì)
 *   stale    : đã có nhưng nội dung nguồn đã đổi → cần cập nhật
 *   missing  : chưa có trên Report Hub
 *   orphan   : còn trên Report Hub nhưng nguồn đã xoá → sẽ bị gỡ
 *   done     : true khi không còn việc gì phải làm cho tháng đó
 * ══════════════════════════════════════════════════════════════════════════════════════ */
function vsStatusReport(){
  var out = { ok: true, defaultMonths: vsMonthWindow(), rows: [], errors: [] };
  var sh = shWeekly();
  if (!sh) return { ok: false, error: 'Không mở được sheet WEEKLY' };
  var idx = vsScan(sh);

  Object.keys(VISIT_SOURCES).forEach(function(k){
    var cfg = VISIT_SOURCES[k];
    if (!cfg.enabled) return;
    var items;
    try { items = vsReadSource(k); }
    catch (e) { out.errors.push(cfg.label + ': ' + String(e.message || e)); return; }

    var byYm = {};
    items.forEach(function(it){
      var o = vsBuildRow(it, cfg);
      var gk = it.ym + '|' + o.title;                     /* ⭐ v1.8: tách riêng visiting / office */
      var b = byYm[gk] || (byYm[gk] = { ym: it.ym, title: o.title, srcCount: 0, synced: 0, stale: 0, missing: 0, keys: {} });
      b.srcCount++; b.keys[o.syncKey] = 1;
      var cur = idx.sub[o.syncKey];
      if (!cur || cur.title !== o.title) b.missing++;
      else if (cur.hash && cur.hash === o.hash) b.synced++;
      else b.stale++;
    });

    /* dòng còn trên Hub nhưng nguồn đã bỏ */
    Object.keys(idx.sub).forEach(function(sk){
      if (sk.indexOf('V:' + k + ':') !== 0) return;
      var t = idx.sub[sk].title || '';
      var ym = /^(\d{6})_/.exec(t); if (!ym) return;
      var gk2 = ym[1] + '|' + t;
      var b = byYm[gk2] || (byYm[gk2] = { ym: ym[1], title: t, srcCount: 0, synced: 0, stale: 0, missing: 0, keys: {} });
      if (!b.keys[sk]) b.orphan = (b.orphan || 0) + 1;
    });

    Object.keys(byYm).sort().forEach(function(gk){
      var b = byYm[gk], ym = b.ym, title = b.title;
      out.rows.push({
        src: k, label: cfg.label + (/Working at office/i.test(title) ? ' · Office' : ''),
        ym: ym, title: title,
        keyExists: !!idx.keyRow[title],
        srcCount: b.srcCount, synced: b.synced, stale: b.stale,
        missing: b.missing, orphan: b.orphan || 0,
        done: (b.missing === 0 && b.stale === 0 && (b.orphan || 0) === 0 && b.srcCount > 0)
      });
    });
  });

  out.rows.sort(function(a, b){ return a.ym === b.ym ? (a.src < b.src ? -1 : 1) : (a.ym < b.ym ? 1 : -1); });
  return out;
}

function vsSyncThrottled(){
  var c = CacheService.getScriptCache();
  if (c.get('vs_last')) return null;
  c.put('vs_last', '1', 90);              // tối đa 1 lần / 90 giây
  return vsSync({});
}

/* ══════════════ API / TRIGGER / VẬN HÀNH ══════════════ */
function vsApiSync(user, p){
  p = p || {};
  /* ⭐ v1.7: action 'syncVisiting' kiêm luôn 2 việc — dùng chung route sẵn có của Code chính,
     không phải sửa router. mode='status' → chỉ trả bảng tình trạng, KHÔNG ghi gì. */
  if (String(p.mode || '') === 'status') {
    try { return vsStatusReport(); }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }

  /* ⭐ v2.3 — CHỈ ĐỒNG BỘ ĐƠN HÀNG (key task "Tư vấn bán hàng").
     Web app CRM gọi ngay sau khi sales lưu đơn để dòng Đơn hàng cập nhật gần như tức thì,
     khỏi chờ trigger 10 phút. Dùng lại đúng route 'syncVisiting' sẵn có nên KHÔNG phải
     sửa router trong Code.gs của Report Hub. */
  var onlyOrders = /^orders?$/i.test(String(p.only || ''));
  if (onlyOrders) return vsRunOrderSync_(user, {});

  var T0 = Date.now();
  var r = vsSync({ only: p.only || '', months: p.months || null });
  try { if (r && r.ok) logActivity((user && user.pic) || 'System', 'update', r.message, '', ''); } catch (e) {}

  /* Còn thời gian thì chạy tiếp phần đơn hàng trong cùng một lượt */
  if (Date.now() - T0 < 150000){
    var o = vsRunOrderSync_(user, {});
    if (o) r.orders = o;
  } else if (r) r.orders = { skipped: 'hết thời gian — lượt sau chạy tiếp' };
  return r;
}
/* Gọi module Order_Sync.gs nếu file đó đã được dán vào project; chưa có thì bỏ qua êm. */
function vsRunOrderSync_(user, opt){
  if (typeof osSync !== 'function') return null;
  try {
    var o = osSync(opt || {});
    try { if (o && o.ok) logActivity((user && user.pic) || 'System', 'update', o.message, '', ''); } catch (e) {}
    return o;
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}
/* URL webapp Field Report cho frontend (không cần fix cứng trong HTML) */
function vsAppUrls(){
  var m = {};
  Object.keys(VISIT_SOURCES).forEach(function(k){ m[k] = VISIT_SOURCES[k].appUrl || ''; });
  return m;
}

function installVisitingTrigger(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'vsSyncTick') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('vsSyncTick').timeBased().everyMinutes(10).create();
  return 'Đã tạo trigger vsSyncTick — 10 phút/lần';
}
/* ⭐ v2.3 — một trigger lo cả hai việc: Customer visiting và Tư vấn bán hàng.
   Nhờ vậy không cần tạo thêm trigger riêng cho Order_Sync.gs. */
function vsSyncTick(){
  var T0 = Date.now();
  vsSync({});
  if (Date.now() - T0 < 150000) vsRunOrderSync_(null, {});
}

function vsIsLockedRow(sh, row){
  try { return !!String(sh.getRange(row, VISIT_COL_KEY).getValue() || '').trim(); }
  catch (e) { return false; }
}
var VS_LOCK_MSG = 'Task "Customer visiting" đồng bộ tự động từ sheet Field Report của Sales — ' +
                  'không sửa/xoá trên Report Hub. Bấm "Mở Field Report" để sửa ở nguồn.';

/* ── Kiểm tra map cột trước khi bật 1 nguồn ── */
/* ⭐ v2.1 — Nút ▶ Run trong trình soạn Apps Script KHÔNG truyền được đối số,
   nên gọi thẳng vsDebugSource sẽ có srcKey = undefined ⇒ lỗi "reading 'ssId'".
   Dùng hai hàm không tham số bên dưới, hoặc gọi vsDebugSource() rỗng (mặc định dental). */
function vsDebugDental(){   return vsDebugSource('dental');   }
/* Xem cả hai nguồn trong một lần chạy */
function vsDebugAll(){
  var out = { dental: vsDebugSource('dental'), surgical: vsDebugSource('surgical'), eyeless: vsDebugSource('eyeless') };
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
function vsDebugSurgical(){ return vsDebugSource('surgical'); }
function vsDebugEyeless(){  return vsDebugSource('eyeless');  }   /* ⭐ v2.2 */

function vsDebugSource(srcKey){
  srcKey = String(srcKey || 'dental').trim().toLowerCase();
  var cfg = VISIT_SOURCES[srcKey], out = { src: srcKey, label: cfg && cfg.label };
  if (!cfg) {
    out.error = 'Không có nguồn "' + srcKey + '". Nguồn hợp lệ: ' + Object.keys(VISIT_SOURCES).join(', ') +
                '. Chạy vsDebugDental() / vsDebugSurgical() / vsDebugEyeless() để khỏi phải truyền đối số.';
    Logger.log(JSON.stringify(out, null, 2));
    return out;
  }
  try {
    var sh = vsResolveSourceSheet(cfg);
    out.tab = sh.getName() + ' (gid ' + sh.getSheetId() + ')';
    out.header = sh.getRange(cfg.headerRow, 1, 1, sh.getLastColumn()).getValues()[0];
    out.colMap = vsColMap(out.header);
    var rows = vsReadSource(srcKey);
    out.matched = rows.length; out.months = {};
    rows.forEach(function(r){ out.months[r.ym] = (out.months[r.ym] || 0) + 1; });
    out.window = vsMonthWindow();
    out.sample = rows.slice(0, 2);
  } catch (e) { out.error = String(e.message || e); }
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * ⭐ v1.5 — vsFixPicValidation()  · GỠ ĐÚNG CÁI CHẶN Ở CỘT H (PIC)
 * ──────────────────────────────────────────────────────────────────────────────────────
 * vsEnsureMasterLists() ghi vào Master!B nhưng dropdown cột H lại trỏ tới MỘT DẢI KHÁC
 * (kiểu VALUE_IN_RANGE) nên thêm tên vào cuối Master không lọt vào danh sách hợp lệ.
 * Hàm này đọc THẲNG dải nguồn từ chính rule validation rồi:
 *   ① điền tên còn thiếu vào ô trống NẰM TRONG dải đó → dropdown hiện tên mới
 *   ② nếu dải đã kín chỗ → chuyển rule sang "Hiện cảnh báo" (allowInvalid = true) trên
 *      toàn cột H vùng dữ liệu. Dropdown giữ nguyên, người dùng vẫn chọn như cũ, chỉ khác
 *      là script không còn bị TỪ CHỐI khi ghi "Viet Ha" / "Khang".
 * ══════════════════════════════════════════════════════════════════════════════════════ */
function vsFixPicValidation(){
  var sh = shWeekly();
  if (!sh) return 'Không mở được sheet WEEKLY';
  var out = { need: [], sourceRange: '', filledIntoRange: [], relaxed: false, note: '' };

  var need = {};
  Object.keys(VISIT_SOURCES).forEach(function(k){
    if (!VISIT_SOURCES[k].enabled) return;
    try { vsReadSource(k).forEach(function(it){ if (it.pic) need[it.pic] = 1; }); } catch (e) {}
  });
  out.need = Object.keys(need);
  if (!out.need.length) { out.note = 'Không đọc được PIC từ nguồn nào'; Logger.log(JSON.stringify(out, null, 2)); return out; }

  var idx = vsScan(sh);
  var testRow = WEEKLY_DATA_ROW;
  Object.keys(idx.keyRow).forEach(function(t){ if (/Customer visiting/i.test(t)) testRow = idx.keyRow[t]; });

  var dv = sh.getRange(testRow, 8).getDataValidation();
  if (!dv) { out.note = 'Cột H không có validation — không cần gỡ'; Logger.log(JSON.stringify(out, null, 2)); return out; }
  if (dv.getAllowInvalid()) { out.note = 'Validation đang ở chế độ cảnh báo — không chặn ghi'; Logger.log(JSON.stringify(out, null, 2)); return out; }

  /* ① điền tên còn thiếu vào ô trống trong dải nguồn của dropdown */
  var missing = out.need.slice();
  try {
    var cv = dv.getCriteriaValues(), src = null;
    cv.forEach(function(x){ if (x && typeof x.getValues === 'function') src = x; });
    if (src) {
      out.sourceRange = "'" + src.getSheet().getName() + "'!" + src.getA1Notation();
      var vals = src.getValues(), have = {}, emptyIdx = [];
      vals.forEach(function(r, i){
        var s = String(r[0] || '').trim();
        if (s) have[s.toLowerCase()] = 1; else emptyIdx.push(i);
      });
      missing = out.need.filter(function(v){ return !have[v.toLowerCase()]; });
      var put = missing.slice(0, emptyIdx.length);
      put.forEach(function(name, j){
        src.getCell(emptyIdx[j] + 1, 1).setValue(name);
        out.filledIntoRange.push(name);
      });
      missing = missing.slice(put.length);
      if (out.filledIntoRange.length) SpreadsheetApp.flush();
    }
  } catch (e) { out.note = 'Không đọc được dải nguồn: ' + String(e.message || e); }

  /* ② còn thiếu → chuyển cột H sang "Hiện cảnh báo" */
  if (missing.length) {
    try {
      var soft = dv.copy().setAllowInvalid(true).build();
      var nRows = sh.getMaxRows() - WEEKLY_DATA_ROW + 1;
      sh.getRange(WEEKLY_DATA_ROW, 8, nRows, 1).setDataValidation(soft);
      out.relaxed = true;
      out.note = 'Dải nguồn hết chỗ cho: ' + missing.join(', ') +
                 ' → đã chuyển cột H sang "Hiện cảnh báo" (dropdown giữ nguyên).';
      SpreadsheetApp.flush();
    } catch (e2) {
      out.note = 'KHÔNG gỡ được validation: ' + String(e2.message || e2) +
                 ' — anh vào cột H → Dữ liệu → Xác thực dữ liệu → đổi sang "Hiện cảnh báo".';
    }
  }
  try { _SH_CACHE = {}; } catch (e) {}
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * ⭐ v1.4 — vsEnsureMasterLists()  · bổ sung tên vào Master (danh bạ chung)
 * ──────────────────────────────────────────────────────────────────────────────────────
 * Cột PIC (H) và Type (E) trên sheet WEEKYLY new lấy dropdown từ sheet Master
 * (Master!B từ dòng 3 = danh sách PIC · Master!D từ dòng 3 = danh sách Type task).
 * Dental chỉ ghi PIC "Phuong" — tên có sẵn nên chạy ngon. Surgical ghi "Viet Ha",
 * "Khang", "Giang" — 2 tên đầu là người mới thêm ở v9, CHƯA có trong Master ⇒ ô bị
 * Data Validation "Từ chối dữ liệu" chặn ⇒ setValues() ném lỗi ngay tại ô PIC, các ô
 * phía trước (Sub Task) đã kịp ghi còn toàn bộ phần sau thì không ⇒ đúng hiện tượng
 * "1 sub task duy nhất rồi trắng cả mảng".
 * Hàm này CHỈ THÊM tên còn thiếu vào cuối danh sách, không xoá/sửa gì sẵn có.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
function vsEnsureMasterLists(){
  var ms = shMaster();
  if (!ms) return 'Không mở được sheet Master';
  var added = { pics: [], types: [] };

  function lastFilled(col){
    var last = ms.getLastRow();
    if (last < 3) return 2;
    var v = ms.getRange(3, col, last - 2, 1).getValues(), r = 2;
    for (var i = 0; i < v.length; i++) if (String(v[i][0] || '').trim()) r = 3 + i;
    return r;
  }
  function existing(col){
    var last = ms.getLastRow(), set = {};
    if (last < 3) return set;
    ms.getRange(3, col, last - 2, 1).getValues().forEach(function(r){
      var s = String(r[0] || '').trim(); if (s) set[s.toLowerCase()] = 1;
    });
    return set;
  }
  function appendCol(col, list, bucket){
    var have = existing(col), want = [];
    list.forEach(function(v){
      v = String(v || '').trim();
      if (!v || have[v.toLowerCase()]) return;
      have[v.toLowerCase()] = 1; want.push([v]);
    });
    if (!want.length) return;
    var row = lastFilled(col) + 1;
    if (row + want.length > ms.getMaxRows()) ms.insertRowsAfter(ms.getMaxRows(), row + want.length - ms.getMaxRows());
    ms.getRange(row, col, want.length, 1).setValues(want);
    want.forEach(function(w){ bucket.push(w[0]); });
  }

  /* ① PIC — lấy đúng những tên mà 2 nguồn sẽ ghi sang, cộng danh bạ USER_MAP */
  var pics = {};
  Object.keys(VISIT_SOURCES).forEach(function(k){
    if (!VISIT_SOURCES[k].enabled) return;
    try { vsReadSource(k).forEach(function(it){ if (it.pic) pics[it.pic] = 1; }); } catch (e) {}
  });
  try { for (var em in USER_MAP) pics[USER_MAP[em].pic] = 1; } catch (e) {}
  appendCol(2, Object.keys(pics), added.pics);

  /* ② Type task — Sales-Surgical / Sales-Dental / Sales-Eyeless */
  var types = [];
  Object.keys(VISIT_SOURCES).forEach(function(k){ types.push(VISIT_SOURCES[k].typeTask); });
  appendCol(4, types, added.types);

  SpreadsheetApp.flush();
  try { _SH_CACHE = {}; } catch (e) {}
  var msg = 'Master: thêm PIC [' + (added.pics.join(', ') || 'không thiếu') + '] · ' +
            'thêm Type [' + (added.types.join(', ') || 'không thiếu') + ']';
  Logger.log(msg);
  return msg;
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * ⭐ v1.2 — vsRepairVisiting()  · CHẠY 1 LẦN ĐỂ DỌN HẬU QUẢ LỖI CŨ
 * ──────────────────────────────────────────────────────────────────────────────────────
 * ① Xoá mọi dòng TRẮNG HOÀN TOÀN (B..V rỗng) nằm giữa vùng dữ liệu của sheet WEEKYLY new
 * ② Điền lại công thức No./FY/Month/Leadtime cho dòng CÓ nội dung nhưng thiếu cột No.
 *    (đây là lý do sub đã ghi xuống sheet nhưng webapp không hiển thị)
 * ③ Đồng bộ lại từ đầu
 * Cách chạy: mở Apps Script → chọn hàm vsRepairVisiting → Run → xem Log.
 * ══════════════════════════════════════════════════════════════════════════════════════ */
function vsRepairVisiting(){
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return 'Đang có tiến trình khác, thử lại sau.';
  try {
    var sh = shWeekly();
    if (!sh) return 'Không mở được sheet WEEKLY';
    var out = { blankFound: 0, blankDeleted: 0, remaining: 0, formulaFixed: 0, picFix: '', master: '' };

    /* ⓪ GỠ CHẶN: validation cột PIC + bổ sung danh bạ Master */
    try { out.picFix = JSON.stringify(vsFixPicValidation()); } catch (e) { out.picFix = 'lỗi: ' + String(e.message || e); }
    try { out.master = vsEnsureMasterLists(); } catch (e) { out.master = 'lỗi Master: ' + String(e.message || e); }

    /* ⓪b ⭐ v2.0 — GỠ các Key Task "Working at office" do bản cũ sinh ra (kèm toàn bộ sub
       của nó). Từ nay Sales tự tạo key task cho việc nội bộ trên webapp. */
    try {
      var ix0 = vsScan(sh), killTitles = [];
      Object.keys(ix0.keyRow).forEach(function(t){ if (/Working at office/i.test(t)) killTitles.push(t); });
      var killRows = [];
      killTitles.forEach(function(t){
        killRows.push(ix0.keyRow[t]);
        Object.keys(ix0.sub).forEach(function(sk){ if (ix0.sub[sk].title === t) killRows.push(ix0.sub[sk].row); });
      });
      killRows.sort(function(a, b){ return b - a; });
      for (var q = 0; q < killRows.length; ) {
        var e0 = killRows[q], c0 = 1;
        while (q + c0 < killRows.length && killRows[q + c0] === e0 - c0) c0++;
        sh.deleteRows(e0 - c0 + 1, c0); q += c0;
      }
      out.officeRemoved = killRows.length;
      if (killRows.length) SpreadsheetApp.flush();
    } catch (e) { out.officeRemoved = 'lỗi: ' + String(e.message || e); }

    /* ① DỌN DÒNG TRẮNG trong vùng Customer visiting — dùng chung vsSweepBlanks() */
    var sw = vsSweepBlanks(sh, VS_REPAIR_MAX_DEL);
    out.blankFound = sw.found; out.blankDeleted = sw.deleted;
    out.remaining = sw.found - sw.deleted;

    /* ② điền lại công thức cho dòng có nội dung mà cột B (No.) rỗng */
    var last = sh.getLastRow();
    if (last >= WEEKLY_DATA_ROW) {
      var n = last - WEEKLY_DATA_ROW + 1;
      var vB = sh.getRange(WEEKLY_DATA_ROW, 2, n, 1).getValues();
      var vEG = sh.getRange(WEEKLY_DATA_ROW, 5, n, 3).getValues();
      for (var j = 0; j < n; j++) {
        var row = WEEKLY_DATA_ROW + j;
        var hasContent = String(vEG[j][0] || '').trim() || String(vEG[j][1] || '').trim() ||
                         String(vEG[j][2] || '').trim();
        if (!hasContent) continue;
        if (String(vB[j][0] || '').trim()) continue;
        if (row <= WEEKLY_DATA_ROW) continue;
        vsFillDownFormulas(sh, row - 1, row, 1);
        out.formulaFixed++;
      }
    }
    SpreadsheetApp.flush();
    try { _SH_CACHE = {}; } catch (e) {}
    try { touchVersion(); } catch (e) {}

    lock.releaseLock();
    var rep = vsSync({});
    var msg = 'GỠ Working at office: ' + out.officeRemoved + ' dòng || GỠ CHẶN PIC: ' + out.picFix +
              ' || ' + out.master +
              ' || DỌN DẸP: tìm thấy ' + out.blankFound + ' dòng trắng, đã xoá ' + out.blankDeleted +
              (out.remaining > 0 ? ' (CÒN ' + out.remaining + ' — CHẠY LẠI vsRepairVisiting() lần nữa)' : '') +
              ' · điền lại công thức ' + out.formulaFixed + ' dòng' +
              ' || ĐỒNG BỘ: ' + (rep && rep.message || rep && rep.error || '');
    Logger.log(msg);
    return msg;
  } catch (err) {
    return 'Lỗi: ' + String(err && err.message || err);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* ⭐ v1.3 — CHẠY ĐỒNG BỘ CHỈ RIÊNG SURGICAL và IN TOÀN BỘ BÁO CÁO (kể cả lỗi ghi).
   Chọn hàm này trong Apps Script → Run → xem tab "Nhật ký thực thi". */
function vsSyncSurgicalOnly(){
  var r = vsSync({ only: 'surgical' });
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}
function vsSyncDentalOnly(){
  var r = vsSync({ only: 'dental' });
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}
function vsSyncEyelessOnly(){                     /* ⭐ v2.2 */
  var r = vsSync({ only: 'eyeless' });
  Logger.log(JSON.stringify(r, null, 2));
  return r;
}

/* ══════════════════════════════════════════════════════════════════════════════════════
 * ⭐ v2.2 — vsSetupEyeless()  · CHẠY 1 LẦN SAU KHI DÁN FILE NÀY
 * ──────────────────────────────────────────────────────────────────────────────────────
 * ① Xoá ID file Eyeless đã nhớ (nếu có) ⇒ hỏi lại web app Eyeless qua action 'sheetInfo'
 * ② Kiểm tra đọc được tab "6. WEEKLY REPORT" của file Eyeless, map cột ra sao
 * ③ Bổ sung sheet Master: PIC "Trang" + Type task "Sales-Eyeless" (để dropdown & ghi không bị chặn)
 * ④ Gỡ chặn Data Validation cột PIC nếu cần
 * ⑤ Đồng bộ riêng Eyeless ngay
 * Cách chạy: Apps Script ▸ chọn hàm vsSetupEyeless ▸ ▶ Run ▸ xem "Nhật ký thực thi".
 * ══════════════════════════════════════════════════════════════════════════════════════ */
function vsSetupEyeless(){
  var L = [];
  try { PropertiesService.getScriptProperties().deleteProperty('VS_EYELESS_SSID'); } catch (e) {}
  try {
    var id = vsEyelessSsId_();
    L.push('① File Eyeless: ' + SpreadsheetApp.openById(id).getName() + ' (' + id + ')');
  } catch (e) {
    L.push('① ✗ KHÔNG lấy được file Eyeless: ' + String(e.message || e));
    L.push('   → Kiểm tra: project Eyeless đã dán Code.gs v7.2, Deploy quyền "Anyone", URL web app đúng chưa.');
    Logger.log(L.join('\n'));
    return L.join('\n');
  }
  var dbg = vsDebugSource('eyeless');
  if (dbg.error) L.push('② ✗ Đọc nguồn lỗi: ' + dbg.error);
  else L.push('② Tab ' + dbg.tab + ' · ' + dbg.matched + ' dòng Customer visiting hợp lệ · theo tháng ' + JSON.stringify(dbg.months));
  try { L.push('③ ' + vsEnsureMasterLists()); } catch (e) { L.push('③ ✗ Master: ' + String(e.message || e)); }
  try { L.push('④ Validation PIC: ' + JSON.stringify(vsFixPicValidation())); } catch (e) { L.push('④ ✗ ' + String(e.message || e)); }
  var r = vsSync({ only: 'eyeless' });
  L.push('⑤ ' + ((r && r.message) || (r && r.error) || JSON.stringify(r)));
  Logger.log(L.join('\n'));
  return L.join('\n');
}

/* ⭐ v1.3 — vsCheckValues(): đối chiếu GIÁ TRỊ mà Surgical sắp ghi với DATA VALIDATION
   đang đặt trên đúng dòng của block Surgical. Chỉ ĐỌC, không ghi gì cả.
   Nếu thấy "BỊ CHẶN" ở PIC hoặc Type → đó chính là lý do dòng bị trắng. */
function vsCheckValues(){
  var out = { block: '', rowTested: 0, cols: {}, verdict: [] };
  var sh = shWeekly(); if (!sh) return 'Không mở được sheet WEEKLY';
  var idx = vsScan(sh);

  /* tìm block Surgical mới nhất */
  var title = '';
  Object.keys(idx.keyRow).forEach(function(t){
    if (/Surgical Customer visiting/i.test(t) && t > title) title = t;
  });
  if (!title) return 'Chưa có Key Task Surgical nào trên sheet — chạy vsSyncSurgicalOnly() trước.';
  out.block = title;
  var testRow = idx.blockEnd[title] || idx.keyRow[title];
  out.rowTested = testRow;

  /* các giá trị Surgical sẽ ghi */
  var pics = {}, types = {}, sts = {};
  try {
    vsReadSource('surgical').forEach(function(it){ pics[it.pic] = 1; });
  } catch (e) { out.verdict.push('Không đọc được nguồn Surgical: ' + String(e.message || e)); }
  types[VISIT_SOURCES.surgical.typeTask] = 1;
  ['To Do', 'In Progress', 'Completed', 'Cancelled'].forEach(function(s){ sts[s] = 1; });

  [[5, 'E Type', types], [8, 'H PIC', pics], [14, 'N Status', sts]].forEach(function(c){
    var info = { validation: 'không có', allowInvalid: true, allowed: null, willWrite: Object.keys(c[2]) };
    try {
      var dv = sh.getRange(testRow, c[0]).getDataValidation();
      if (dv) {
        info.validation = String(dv.getCriteriaType());
        info.allowInvalid = dv.getAllowInvalid();
        var cv = dv.getCriteriaValues(), list = [];
        cv.forEach(function(x){
          if (Object.prototype.toString.call(x) === '[object Array]') list = list.concat(x);
          else if (x && typeof x.getValues === 'function') {
            x.getValues().forEach(function(rr){ if (String(rr[0] || '').trim()) list.push(String(rr[0]).trim()); });
          }
        });
        info.allowed = list;
        if (!info.allowInvalid && list.length) {
          var bad = info.willWrite.filter(function(v){ return v && list.indexOf(v) < 0; });
          if (bad.length) out.verdict.push('❌ ' + c[1] + ' BỊ CHẶN: ' + bad.join(', ') +
            ' — không có trong danh sách hợp lệ. Thêm các tên này vào sheet Master (nguồn của dropdown) hoặc đổi validation sang "Hiện cảnh báo".');
        }
      }
    } catch (e) { info.validation = 'lỗi đọc: ' + String(e.message || e); }
    out.cols[c[1]] = info;
  });

  if (!out.verdict.length) out.verdict.push('✅ Không có validation nào chặn — nếu vẫn trắng, xem log vsSyncSurgicalOnly().');
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/* ⭐ v1.2 — vsDiagnose(): xem NGUỒN đọc được bao nhiêu dòng, BLOCK trên sheet ra sao,
   và cột nào đang bật Data Validation "từ chối" (thủ phạm làm setValues ném lỗi). */
function vsDiagnose(){
  var out = { sources: {}, blocks: {}, validation: {}, blankRows: 0 };
  Object.keys(VISIT_SOURCES).forEach(function(k){
    var cfg = VISIT_SOURCES[k];
    if (!cfg.enabled) { out.sources[k] = 'disabled'; return; }
    try {
      var rows = vsReadSource(k), byMonth = {};
      rows.forEach(function(r){ byMonth[r.ym] = (byMonth[r.ym] || 0) + 1; });
      var pics = {};
      rows.forEach(function(r){ pics[r.pic] = (pics[r.pic] || 0) + 1; });
      out.sources[k] = { matched: rows.length, byMonth: byMonth, pics: pics, window: vsMonthWindow() };
    } catch (e) { out.sources[k] = 'LỖI: ' + String(e.message || e); }
  });
  try {
    var sh = shWeekly(), idx = vsScan(sh);
    out.blankRows = idx.blank.length;
    Object.keys(idx.keyRow).forEach(function(t){
      if (!/Customer visiting/i.test(t)) return;
      var subs = 0;
      Object.keys(idx.sub).forEach(function(sk){ if (idx.sub[sk].title === t) subs++; });
      out.blocks[t] = { keyRow: idx.keyRow[t], blockEnd: idx.blockEnd[t], subs: subs };
    });
    /* cột E(Type) H(PIC) N(Status) — kiểm tra validation ở dòng dữ liệu đầu tiên */
    [[5, 'E Type'], [8, 'H PIC'], [14, 'N Status']].forEach(function(c){
      try {
        var dv = sh.getRange(WEEKLY_DATA_ROW, c[0]).getDataValidation();
        if (!dv) { out.validation[c[1]] = 'không có'; return; }
        out.validation[c[1]] = {
          rejectInput: dv.getAllowInvalid() === false,
          values: (function(){ try { return dv.getCriteriaValues(); } catch (e) { return '?'; } })()
        };
      } catch (e) { out.validation[c[1]] = 'lỗi đọc'; }
    });
  } catch (e) { out.blocks = 'LỖI: ' + String(e.message || e); }
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

/* ── ĐỔI TÊN PIC trên toàn bộ dữ liệu cũ (vd 'Minh Viet' → 'Viet') ──
   Chạy 1 lần SAU KHI đã sửa USER_MAP. */
function migrateRenamePic(oldName, newName){
  var o = String(oldName || '').trim().toLowerCase(), nw = String(newName || '').trim();
  if (!o || !nw) throw new Error('Thiếu tên cũ / tên mới');
  var changed = { weekly: 0, monthly: 0, master: 0 };
  function fix(sh, startRow, col){
    if (!sh) return 0;
    var last = sh.getLastRow(); if (last < startRow) return 0;
    var rng = sh.getRange(startRow, col, last - startRow + 1, 1), v = rng.getValues(), c = 0;
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][0] || '').trim().toLowerCase() === o) { v[i][0] = nw; c++; }
    }
    if (c) rng.setValues(v);
    return c;
  }
  changed.weekly  = fix(shWeekly(),  WEEKLY_DATA_ROW,  8);   // H = PIC
  changed.monthly = fix(shMonthly(), MONTHLY_DATA_ROW, 8);   // H = PIC
  changed.master  = fix(shMaster(),  3,                2);   // B = PIC
  SpreadsheetApp.flush();
  try { CacheService.getScriptCache().removeAll(['fr_rows']); } catch (e) {}
  try { touchVersion(); } catch (e) {}
  var msg = 'Đã đổi "' + oldName + '" → "' + nw + '": Weekly ' + changed.weekly +
            ' · Monthly ' + changed.monthly + ' · Master ' + changed.master;
  Logger.log(msg);
  return msg;
}