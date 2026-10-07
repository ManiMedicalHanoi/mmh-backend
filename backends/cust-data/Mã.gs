/*************************************************************************************************
 * MMH — EVENT CUSTOMER BACKEND  (v2.3 · 01/10/2026)
 * ───────────────────────────────────────────────────────────────────────────────────────────────
 * Dán file này vào Apps Script của Google Sheet DỮ LIỆU KHÁCH HÀNG EVENT
 *   https://docs.google.com/spreadsheets/d/1fJlW-23rgyZEdYXPfcojTRX0P9xEDrgI4QUxw5kUXgw/edit
 *
 * ⭐ v2.3 — SỬA KHÁCH EVENT NHA KHOA BỊ THIẾU
 *   ① Tỉnh có tiền tố ("TP. Hồ Chí Minh", "Thành phố Huế", "Tỉnh Thái Bình", "TP Hà Nội"…) nay nhận
 *      đúng miền. Trước đây không nhận ra ⇒ rơi về North / Viet ⇒ sales miền Nam, Trung không thấy khách.
 *   ② Nhận diện dòng event nới ra: ngày YYYYMMDD ở bất kỳ đâu (kể cả "20230926Composite"), ngày dạng
 *      26/09/2023, hoặc dòng có EVENT_FY (FY67, FY68…) mà nguồn không phải Google / Online / Data sales…
 *   ③ Ghi DÒNG MỚI trước, rồi mới bù Ghi chú / Area / PIC; phần bù gom theo lô (RangeList) thay vì từng ô
 *      ⇒ không còn quá 6 phút giữa chừng làm mất khách mới.
 *   ④ Menu ⑥ — Sửa Area / PIC của khách event đã gán nhầm miền (chỉ dòng PIC còn đúng giá trị tự gán).
 *   ⑤ Menu ⑦ — Thống kê khách bị bỏ qua: không phải event · trùng SĐT · đã có trong CRM · chờ đồng bộ.
 *   ⑥ Sửa lỗi menu ① gọi crmAccounts_() thiếu nhóm.
 *
 * LÀM 2 VIỆC:
 *   ① API cho web app MMH CRM đọc danh sách khách event
 *   ② Đồng bộ 1 chiều: khách event  ──▶  tab "2. CBC" của file CRM (Nha khoa → Dental · Nhãn khoa → Surgical)
 *
 * QUY TẮC ÁNH XẠ CỘT:
 *   NAME          → K  Account PIC      (tên người liên hệ)
 *   PHONE NUMBER  → L  Telephone
 *   ADDRESS       → F  Address
 *   WORKPLACE     → E  Account name
 *   PROVINCE      → G  Province
 *   TITLE         → M  Job title
 *   SPECIALITY    → N  Specialize
 *   Tên event     → R  Ghi chú  = "Khách hàng từ Event: <tên event>"
 *   Nguồn + thời điểm nhập → S  Log tạo mới
 *   Customer code / Account type / Area / MMH sales PIC: tự dò từ tab "1. CUSTOMER CODE"
 *   theo WORKPLACE; không khớp thì để trống, sales gán account sau ngay trên app.
 *
 * HAI SHEET NGUỒN CÓ BỐ CỤC KHÁC NHAU — module dò cột THEO TÊN HEADER, không hardcode:
 *   Nha khoa  (gid 1836783168): NO NAME PHONE ADDRESS PROVINCE TITLE WORKPLACE SPECIALITY SOURCES EVENT_FY
 *   Nhãn khoa (gid 1270537886): NO NAME PHONE ADDRESS PROVINCE EMAIL WORKPLACE DETAILS SOURCES EVENT_FY
 *
 * CÀI ĐẶT 1 LẦN:  menu "MMH Event" ▸ ① Kiểm tra kết nối  ▸ ② Đồng bộ ngay  ▸ ③ Bật tự động
 * SAU KHI DÁN BẢN v2.3: chạy ⑦ (xem khách bị bỏ qua) ▸ ② (đồng bộ) ▸ ⑥ (sửa miền / PIC gán nhầm)
 *************************************************************************************************/

/* ══════════════════════════ CẤU HÌNH ══════════════════════════ */

var APP_NAME = 'MMH Event Customer';

/* HAI ĐÍCH GHI RIÊNG BIỆT: Nha khoa → CRM Dental · Nhãn khoa → CRM Surgical.
   Chỉ cần URL web app; ID file lấy tự động qua action "sheetInfo" rồi nhớ vào Script Property. */
var CRM_TARGETS = {
  dental: {
    label:  'Dental',
    webapp: 'https://script.google.com/macros/s/AKfycbyzmhECZZfbOZUyXOK5O70ukwTgQ9DHp70MN-HUAL0wMpOptdTTbaGcvMEmcnCrCji6/exec',
    ssId:   ''                       /* để trống ⇒ tự dò; điền tay nếu muốn cố định */
  },
  ophthalmic: {
    label:  'Surgical',
    webapp: 'https://script.google.com/macros/s/AKfycbxxckrqwkfhE0fszm1XVdpYyEHU_PCKQWMKE_2wBnMTgoJCZ-1nRZ_fhOCPXXsVfEE/exec',
    ssId:   ''
  }
};
function crmSsIdOf_(srcKey){
  var t = CRM_TARGETS[srcKey];
  if (!t) throw new Error('Không có đích ghi cho nhóm "' + srcKey + '"');
  if (t.ssId) return t.ssId;
  var pk = 'CRM_SSID_' + srcKey, props = PropertiesService.getScriptProperties();
  var cached = props.getProperty(pk);
  if (cached) return cached;
  var r = UrlFetchApp.fetch(t.webapp + '?action=sheetInfo&_ts=' + Date.now(),
          { muteHttpExceptions:true, followRedirects:true });
  var j = {};
  try { j = JSON.parse(r.getContentText()); } catch(e){}
  if (!j.ok || !j.id)
    throw new Error('Không lấy được ID file CRM ' + t.label +
      '. Kiểm tra Web App của file đó đã dán Code.gs mới và Deploy New version chưa.');
  props.setProperty(pk, j.id);
  return j.id;
}
var CRM_TAB_CBC   = '2. CBC';
var CRM_TAB_CUST  = '1. CUSTOMER CODE';
var CRM_HEADER_ROW = 3;
var CRM_DATA_ROW   = 4;

/* Cột tab "2. CBC" (đánh số từ 1 = cột A) */
var CBC_COL = {
  code:2, cbcCode:3, type:4, name:5, address:6, province:7, area:8, pic:9,
  cbcNo:10, contact:11, phone:12, jobTitle:13, specialize:14,
  role:15, influence:16, trust:17, note:18, log:19,
  keyAccPic:21, keyAccNo:22            /* U, V — khoá ghép, cũng là công thức */
};
/* Kéo công thức của dòng ngay phía trên xuống các dòng vừa thêm */
function copyFormulaDown_(sh, startRow, nRows, cols){
  if (startRow <= CRM_DATA_ROW) return;
  cols.forEach(function(c){
    try {
      var src = sh.getRange(startRow - 1, c);
      if (!src.getFormula()) return;
      src.copyTo(sh.getRange(startRow, c, nRows, 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    } catch(e){}
  });
}
/* Cột tab "1. CUSTOMER CODE" */
var CUST_COL = { code:2, name:3, type:4, address:5, province:6, area:7, pic:8 };

/* Hai sheet nguồn trong CHÍNH file này */
var EVENT_SOURCES = [
  { key:'dental',     label:'Nha khoa',  gid:1836783168, headerRow:1,
    names:['Nha khoa - Data dữ liệu khách hàng','Nha khoa'] },
  { key:'ophthalmic', label:'Nhãn khoa', gid:1270537886, headerRow:3,
    names:['Nhãn khoa - Data dữ liệu khách hàng','Nhãn khoa'] }
];

/* Tên cột chấp nhận được (đã bỏ dấu, bỏ khoảng trắng, viết thường) */
var EV_HEADERS = {
  no:         ['no','stt'],
  name:       ['name','hoten','tenkhachhang','fullname'],
  phone:      ['phonenumber','phone','sodienthoai','dienthoai','sdt'],
  address:    ['address','diachi'],
  province:   ['province','tinh','tinhthanh'],
  title:      ['title','chucvu','chucdanh'],
  workplace:  ['workplace','noicongtac','donvi'],
  speciality: ['speciality','specialize','specialty','chuyenkhoa'],
  email:      ['email'],
  details:    ['details','detail','chitiet'],
  sources:    ['sources','source','nguon'],
  eventFy:    ['eventfy','fy']
};

/* Chỉ nhận khách THỰC SỰ đến từ event. EVENT_ONLY = false ⇒ lấy tất cả. */
var EVENT_ONLY   = true;
var EVENT_NAME_RE = /^\s*(\d{8})\s*[_\-\s]/;
/* ⭐ v2.3 — nới nhận diện: YYYYMMDD ở bất kỳ đâu, hoặc ngày dd/mm/yyyy */
var EVENT_DATE_ANY = /(^|\D)(20\d{6})(\D|$)|(^|\D)\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2}(\D|$)/;
/* nguồn KHÔNG phải event (khách online, data sales…) — có EVENT_FY cũng bỏ */
var NON_EVENT_RE = /google|online|website|web\b|facebook|fanpage|zalo|tiktok|data\s*sales|hotline|giới thiệu|gioi thieu|referral|order/i;
function isEventRow_(ev, fy){
  var s = S_(ev);
  if (!s) return false;
  if (EVENT_NAME_RE.test(s) || EVENT_DATE_ANY.test(s)) return true;
  return /^FY\s?\d{2}$/i.test(S_(fy)) && !NON_EVENT_RE.test(s) && norm_(s) !== 'event';
}

/* GÁN PIC THEO KHU VỰC: Province → Area (học từ "1. CUSTOMER CODE", bảng cứng dự phòng) → PIC.
   Khách dò được Account đã có PIC thì ưu tiên PIC của Account. */
var PIC_BY_AREA = {
  dental:     { North:'Viet',    South:'Phuong', Central:'Vinh' },   /* nha khoa */
  ophthalmic: { North:'Viet Ha', South:'Khang',  Central:'' }        /* nhãn khoa · ngoại khoa */
};
var AREA_FALLBACK = 'North';

/* ⭐ v2.3 — khoá tỉnh: bỏ dấu + bỏ tiền tố "Thành phố / Tỉnh / TP" */
function provKey_(v){ return key_(v).replace(/^(thanhpho|tinh|tp)/, ''); }

/* Bảng tỉnh → miền (cả tên cũ lẫn tên sau sáp nhập T7/2025). Viết không dấu. */
var PROVINCE_AREA_MAP = (function(){
  var m = {};
  function put(area, list){ list.forEach(function(x){ m[provKey_(x)] = area; }); }
  put('North', ['Hanoi','Ha Noi','Hai Phong','Quang Ninh','Bac Ninh','Bac Giang','Hai Duong',
    'Hung Yen','Thai Binh','Nam Dinh','Ha Nam','Ninh Binh','Vinh Phuc','Phu Tho','Thai Nguyen',
    'Bac Kan','Cao Bang','Lang Son','Tuyen Quang','Ha Giang','Yen Bai','Lao Cai','Lai Chau',
    'Dien Bien','Son La','Hoa Binh','Thanh Hoa','HN']);
  put('Central', ['Nghe An','Ha Tinh','Quang Binh','Quang Tri','Hue','Thua Thien Hue','Da Nang',
    'Quang Nam','Quang Ngai','Binh Dinh','Phu Yen','Khanh Hoa','Ninh Thuan','Binh Thuan',
    'Kon Tum','Gia Lai','Dak Lak','Dac Lac','Dak Nong','Lam Dong','Buon Ma Thuot','Nha Trang','Vinh','DN']);
  put('South', ['Ho Chi Minh','HCM','TPHCM','HCMC','Sai Gon','Saigon','SG','Binh Duong','Dong Nai',
    'Ba Ria Vung Tau','Vung Tau','Tay Ninh','Binh Phuoc','Long An','Tien Giang','Ben Tre','Tra Vinh',
    'Vinh Long','Dong Thap','An Giang','Kien Giang','Can Tho','Hau Giang','Soc Trang','Bac Lieu','Ca Mau']);
  return m;
})();

/* Học Province → Area từ danh mục account thật (chính xác hơn bảng cứng) */
function provinceAreaFromCrm_(accs){
  var cnt = {};
  (accs.list || []).forEach(function(a){
    var p = provKey_(a.province), ar = S_(a.area);
    if (!p || !ar) return;
    if (!cnt[p]) cnt[p] = {};
    cnt[p][ar] = (cnt[p][ar] || 0) + 1;
  });
  var out = {};
  for (var p in cnt){
    var best = '', bn = 0;
    for (var ar in cnt[p]) if (cnt[p][ar] > bn){ bn = cnt[p][ar]; best = ar; }
    out[p] = best;
  }
  return out;
}
function areaOf_(province, learned){
  var p = provKey_(province);
  if (!p) return '';
  return (learned && learned[p]) || PROVINCE_AREA_MAP[p] || '';
}
function picOf_(srcKey, area){
  var t = PIC_BY_AREA[srcKey] || PIC_BY_AREA.dental;
  return S_(t[S_(area)]) || '';
}

/* ══════════════════════════ TIỆN ÍCH ══════════════════════════ */

function S_(v){ return (v === null || v === undefined) ? '' : String(v).trim(); }
function norm_(v){
  return S_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
              .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
}
function key_(v){ return norm_(v).replace(/[^a-z0-9]/g,''); }
function phoneKey_(v){
  var d = S_(v).replace(/\D/g,'');
  if (!d) return '';
  if (d.length > 9 && d.indexOf('84') === 0) d = '0' + d.slice(2);   /* +84… → 0… */
  return d.slice(-9);                                                /* so 9 số cuối */
}
function nowStr_(){
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function colA1_(c){ var s = ''; while (c > 0){ var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; }
/* Ghi nhiều ô cùng giá trị bằng RangeList — nhanh hơn hàng trăm lệnh setValue */
function writeGrouped_(sh, cells){
  var grp = {};
  cells.forEach(function(x){
    var k = x.col + '|' + x.val;
    (grp[k] = grp[k] || { val:x.val, a1:[] }).a1.push(colA1_(x.col) + x.row);
  });
  Object.keys(grp).forEach(function(k){
    var g = grp[k];
    for (var i = 0; i < g.a1.length; i += 400) sh.getRangeList(g.a1.slice(i, i + 400)).setValue(g.val);
  });
}
function colMap_(headRow){
  var n = headRow.map(key_), map = {}, used = {}, f, j, i;
  for (f in EV_HEADERS){
    for (j = 0; j < EV_HEADERS[f].length && !map[f]; j++){
      for (i = 0; i < n.length; i++){
        if (!used[i] && n[i] && n[i] === EV_HEADERS[f][j]){ map[f] = i + 1; used[i] = 1; break; }
      }
    }
  }
  return map;
}
function resolveSheet_(cfg){
  var sp = SpreadsheetApp.getActiveSpreadsheet(), all = sp.getSheets(), i, j;
  for (j = 0; j < cfg.names.length; j++){
    var want = key_(cfg.names[j]);
    for (i = 0; i < all.length; i++) if (key_(all[i].getName()) === want) return all[i];
  }
  for (i = 0; i < all.length; i++) if (all[i].getSheetId() === cfg.gid) return all[i];
  /* dò lỏng theo tên — chịu được hậu tố kiểu "… - Đã sát nhập" */
  for (i = 0; i < all.length; i++){
    var nm = norm_(all[i].getName());
    if (cfg.key === 'dental'     && nm.indexOf('nha khoa') >= 0 && nm.indexOf('nhan khoa') < 0) return all[i];
    if (cfg.key === 'ophthalmic' && nm.indexOf('nhan khoa') >= 0) return all[i];
  }
  var best = null, bestN = 0;
  for (i = 0; i < all.length; i++){
    try{
      if (!findHeaderRow_(all[i], 1)) continue;
      var n = all[i].getLastRow();
      if (n > bestN){ bestN = n; best = all[i]; }
    }catch(e){}
  }
  if (best) return best;
  throw new Error('Không tìm thấy sheet nguồn "' + cfg.label + '" (gid ' + cfg.gid + ')');
}

/* ══════════════════════════ ĐỌC KHÁCH EVENT ══════════════════════════ */

/* Tên event: ưu tiên ô có dạng ngày, vì tuỳ sheet nó nằm ở DETAILS (nhãn khoa) hay SOURCES (nha khoa). */
function pickEventName_(details, sources){
  var d = S_(details), s = S_(sources);
  if (EVENT_NAME_RE.test(d)) return d;
  if (EVENT_NAME_RE.test(s)) return s;
  if (EVENT_DATE_ANY.test(d)) return d;
  if (EVENT_DATE_ANY.test(s)) return s;
  if (d && norm_(d) !== 'event') return d;
  return s;
}
function eventDate_(evName){
  var s = S_(evName), m = /(^|\D)(20\d{2})(\d{2})(\d{2})(\D|$)/.exec(s);
  if (m) return m[2] + '-' + m[3] + '-' + m[4];
  m = /(^|\D)(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})(\D|$)/.exec(s);
  if (m) return m[4] + '-' + ('0' + m[3]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  return '';
}

/* Tự dò hàng header trong 8 hàng đầu (sheet hay bị chèn thêm dòng / đổi tên). */
function findHeaderRow_(sh, prefer){
  var lastCol = Math.max(1, sh.getLastColumn());
  var scan = [prefer, 1, 2, 3, 4, 5, 6, 7, 8];
  for (var i = 0; i < scan.length; i++){
    var r = scan[i];
    if (!r || r > sh.getLastRow()) continue;
    var head = sh.getRange(r, 1, 1, lastCol).getValues()[0];
    if (colMap_(head).name) return r;
  }
  return 0;
}
/* keepAll = true ⇒ trả cả dòng không phải event (cờ isEvent) — dùng cho thống kê ⑦ */
function readEventSource_(cfg, keepAll){
  var sh = resolveSheet_(cfg);
  var lastCol = Math.max(1, sh.getLastColumn());
  var hr = findHeaderRow_(sh, cfg.headerRow);
  if (!hr)
    throw new Error('Sheet "' + sh.getName() + '" không có cột NAME trong 8 hàng đầu — ' +
                    'kiểm tra lại tiêu đề cột của sheet này.');
  var lastRow = sh.getLastRow();
  if (lastRow <= hr) return [];
  var head = sh.getRange(hr, 1, 1, lastCol).getValues()[0];
  var C = colMap_(head);

  var nRow = lastRow - hr;
  var vals = sh.getRange(hr + 1, 1, nRow, lastCol).getValues();
  var out = [];
  for (var i = 0; i < nRow; i++){
    var v = vals[i];
    var g = function(f){ return C[f] ? S_(v[C[f] - 1]) : ''; };
    var name = g('name');
    if (!name) continue;
    var ev = pickEventName_(g('details'), g('sources'));
    var isEv = !EVENT_ONLY || isEventRow_(ev, g('eventFy'));
    if (!isEv && !keepAll) continue;
    out.push({
      src:        cfg.key,
      srcLabel:   cfg.label,
      row:        hr + 1 + i,
      no:         g('no'),
      name:       name,
      phone:      g('phone'),
      phoneKey:   phoneKey_(g('phone')),
      address:    g('address'),
      province:   g('province'),
      title:      g('title'),
      workplace:  g('workplace'),
      speciality: g('speciality'),
      email:      g('email'),
      event:      ev,
      eventDate:  eventDate_(ev),
      fy:         g('eventFy'),
      isEvent:    isEv
    });
  }
  return out;
}
function readAllEvents_(){
  var out = [], i;
  for (i = 0; i < EVENT_SOURCES.length; i++){
    try { out = out.concat(readEventSource_(EVENT_SOURCES[i])); }
    catch(e){ /* một sheet hỏng không chặn sheet còn lại */ }
  }
  return out;
}

/* ══════════════════════════ ĐỌC PHÍA CRM ══════════════════════════ */

function crmSS_(srcKey){ return SpreadsheetApp.openById(crmSsIdOf_(srcKey)); }
function crmSheet_(name, srcKey){
  var sh = crmSS_(srcKey).getSheetByName(name);
  if (!sh) throw new Error('File CRM ' + (CRM_TARGETS[srcKey] ? CRM_TARGETS[srcKey].label : srcKey) +
                           ' không có tab "' + name + '"');
  return sh;
}
/* Danh mục account để dò WORKPLACE → Customer code */
function crmAccounts_(srcKey){
  var sh = crmSheet_(CRM_TAB_CUST, srcKey), last = sh.getLastRow();
  var out = { byName:{}, list:[] };
  if (last < CRM_DATA_ROW) return out;
  var n = last - CRM_DATA_ROW + 1;
  var v = sh.getRange(CRM_DATA_ROW, 1, n, 10).getValues();
  for (var i = 0; i < n; i++){
    var name = S_(v[i][CUST_COL.name - 1]);
    if (!name) continue;
    var rec = {
      row: CRM_DATA_ROW + i,
      code: S_(v[i][CUST_COL.code - 1]),
      name: name,
      type: S_(v[i][CUST_COL.type - 1]),
      province: S_(v[i][CUST_COL.province - 1]),
      area: S_(v[i][CUST_COL.area - 1]),
      pic: S_(v[i][CUST_COL.pic - 1])
    };
    out.list.push(rec);
    out.byName[key_(name)] = rec;
  }
  return out;
}
/* CBC hiện có — để khỏi ghi trùng */
function crmCbc_(srcKey){
  var sh = crmSheet_(CRM_TAB_CBC, srcKey), last = sh.getLastRow();
  var out = { byPhone:{}, byNameAcc:{}, maxNoByCode:{}, rows:[], sheet:sh, lastRow:last };
  if (last < CRM_DATA_ROW) return out;
  var n = last - CRM_DATA_ROW + 1;
  var v = sh.getRange(CRM_DATA_ROW, 1, n, CBC_COL.log).getValues();
  for (var i = 0; i < n; i++){
    var contact = S_(v[i][CBC_COL.contact - 1]);
    var phone   = S_(v[i][CBC_COL.phone - 1]);
    if (!contact && !phone) continue;      /* dòng chỉ có công thức, chưa có dữ liệu thật */
    var rec = {
      row: CRM_DATA_ROW + i,
      code: S_(v[i][CBC_COL.code - 1]),
      accName: S_(v[i][CBC_COL.name - 1]),
      province: S_(v[i][CBC_COL.province - 1]),
      area: S_(v[i][CBC_COL.area - 1]),
      pic:  S_(v[i][CBC_COL.pic - 1]),
      contact: contact,
      phone: phone,
      phoneKey: phoneKey_(phone),
      note: S_(v[i][CBC_COL.note - 1]),
      cbcNo: parseInt(S_(v[i][CBC_COL.cbcNo - 1]).replace(/\D/g,''), 10) || 0
    };
    out.rows.push(rec);
    if (rec.phoneKey) out.byPhone[rec.phoneKey] = rec;
    out.byNameAcc[key_(rec.contact) + '|' + key_(rec.accName)] = rec;
    var c = rec.code || key_(rec.accName);
    if (rec.cbcNo > (out.maxNoByCode[c] || 0)) out.maxNoByCode[c] = rec.cbcNo;
  }
  return out;
}

/* ══════════════════════════ ĐỒNG BỘ SANG "2. CBC" ══════════════════════════ */

function noteForEvent_(ev){ return 'Khách hàng từ Event: ' + S_(ev); }
function logLine_(rec){
  return 'Nhập từ Event ' + nowStr_() + ' · ' + APP_NAME +
         ' · nguồn ' + rec.srcLabel + ' dòng ' + rec.row;
}

/* Đồng bộ TẤT CẢ nhóm — mỗi nhóm ghi vào file CRM của chính nhóm đó */
function syncEventToCbc(limit){
  var out = { ok:true, byTeam:{}, added:0, updated:0, skipped:0, fixed:0, noAccount:0, noPic:0, total:0 };
  var msgs = [], errs = [];
  EVENT_SOURCES.forEach(function(cfg){
    var r = syncOneTeam_(cfg.key, limit);
    out.byTeam[cfg.key] = r;
    if (!r.ok){ errs.push(cfg.label + ': ' + r.error); return; }
    ['added','updated','skipped','fixed','noAccount','noPic','total'].forEach(function(k){
      out[k] += (r[k] || 0); });
    msgs.push(cfg.label + ' → ' + (CRM_TARGETS[cfg.key] ? CRM_TARGETS[cfg.key].label : cfg.key) +
              ': thêm ' + r.added + ' · bù ' + r.fixed + ' · bỏ qua ' + r.skipped + (r.more ? ' · còn ' + r.more + ' chờ lượt sau' : ''));
  });
  out.message = msgs.join('\n') + (errs.length ? ('\n⚠️ ' + errs.join('\n⚠️ ')) : '');
  if (errs.length && !msgs.length){ out.ok = false; out.error = errs.join(' · '); }
  return out;
}

/* Đồng bộ một nhóm (dental / ophthalmic) sang đúng file CRM của nhóm đó */
function syncOneTeam_(srcKey, limit){
  limit = limit || 300;
  var cfg = null;
  EVENT_SOURCES.forEach(function(c){ if (c.key === srcKey) cfg = c; });
  if (!cfg) return { ok:false, error:'Không có nhóm "' + srcKey + '"' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch(e){ return { ok:false, error:'Đang có lượt đồng bộ khác chạy' }; }

  try {
    var events = readEventSource_(cfg);        /* CHỈ khách của nhóm này */
    var accs   = crmAccounts_(srcKey);
    var cbc    = crmCbc_(srcKey);
    var sh     = cbc.sheet;
    var learned = provinceAreaFromCrm_(accs);

    var added = 0, updated = 0, skipped = 0, noAccount = 0, noPic = 0, fixed = 0, more = 0;
    var seenPhone = {};
    var newRows = [], noteFix = [], stampFix = [];

    for (var i = 0; i < events.length; i++){
      var e = events[i];

      /* trùng ngay trong chính file nguồn */
      if (e.phoneKey){
        if (seenPhone[e.phoneKey]) { skipped++; continue; }
        seenPhone[e.phoneKey] = 1;
      }

      /* đã có bên CRM? */
      var hit = e.phoneKey ? cbc.byPhone[e.phoneKey] : null;
      if (!hit) hit = cbc.byNameAcc[key_(e.name) + '|' + key_(e.workplace)];
      if (hit){
        var want = noteForEvent_(e.event);
        if (e.event && hit.note.indexOf(S_(e.event)) < 0){
          noteFix.push({ row: hit.row, note: hit.note ? (hit.note + ' · ' + want) : want });
          updated++;
        } else skipped++;

        /* dòng đồng bộ trước có thể còn TRỐNG Area/PIC ⇒ điền bù */
        var accH  = e.workplace ? accs.byName[key_(e.workplace)] : null;
        var areaH = (accH && S_(accH.area)) || areaOf_(e.province, learned) || AREA_FALLBACK;
        var picH  = (accH && S_(accH.pic))  || picOf_(e.src, areaH);
        if (!S_(hit.area) && areaH){ stampFix.push({ row:hit.row, col:CBC_COL.area, val:areaH }); fixed++; }
        if (!S_(hit.pic)  && picH ){ stampFix.push({ row:hit.row, col:CBC_COL.pic,  val:picH  }); fixed++; }
        continue;
      }

      if (newRows.length >= limit){ more++; continue; }

      var acc = e.workplace ? accs.byName[key_(e.workplace)] : null;
      if (!acc && e.workplace) noAccount++;

      var area = (acc && S_(acc.area)) || areaOf_(e.province, learned) || AREA_FALLBACK;
      var pic  = (acc && S_(acc.pic)) || picOf_(e.src, area);
      if (!pic) noPic++;

      var codeKey = acc ? acc.code : key_(e.workplace);
      cbc.maxNoByCode[codeKey] = (cbc.maxNoByCode[codeKey] || 0) + 1;

      /* B (Customer code), C (CBC code), J (CBC No.) là CÔNG THỨC ⇒ chỉ điền cột dữ liệu */
      var line = [];
      line[CBC_COL.type - 1]       = acc ? acc.type : '';
      line[CBC_COL.name - 1]       = e.workplace || (acc ? acc.name : '');
      line[CBC_COL.address - 1]    = e.address;
      line[CBC_COL.province - 1]   = e.province || (acc ? acc.province : '');
      line[CBC_COL.area - 1]       = area;
      line[CBC_COL.pic - 1]        = pic;
      line[CBC_COL.contact - 1]    = e.name;
      line[CBC_COL.phone - 1]      = e.phone;
      line[CBC_COL.jobTitle - 1]   = e.title;
      line[CBC_COL.specialize - 1] = e.speciality;
      line[CBC_COL.role - 1]       = '';
      line[CBC_COL.influence - 1]  = '';
      line[CBC_COL.trust - 1]      = '';
      line[CBC_COL.note - 1]       = noteForEvent_(e.event);
      line[CBC_COL.log - 1]        = logLine_(e);
      for (var c = 0; c < CBC_COL.log; c++) if (line[c] === undefined) line[c] = '';
      newRows.push(line);
      added++;
    }

    /* ⭐ v2.3 — ① ghi DÒNG MỚI trước (quan trọng nhất) */
    if (newRows.length){
      ensureCbcLogHeader_(sh);
      /* không dùng getLastRow(): cột công thức kéo sẵn xuống hàng nghìn dòng */
      var start = firstFreeCbcRow_(sh);
      var need  = start + newRows.length - 1;
      if (need > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());

      /* chỉ ghi D→I và K→S, chừa B, C (mã) và J (CBC No.) cho công thức */
      var segs = [[CBC_COL.type, CBC_COL.pic], [CBC_COL.contact, CBC_COL.log]];
      segs.forEach(function(sg){
        var w = sg[1] - sg[0] + 1;
        var blk = newRows.map(function(r){ return r.slice(sg[0] - 1, sg[1]); });
        sh.getRange(start, sg[0], newRows.length, w).setValues(blk);
      });
      copyFormulaDown_(sh, start, newRows.length,
        [CBC_COL.code, CBC_COL.cbcCode, CBC_COL.cbcNo, CBC_COL.keyAccPic, CBC_COL.keyAccNo]);
      SpreadsheetApp.flush();
    }
    /* ② bù Area / PIC theo lô · ③ bổ sung ghi chú event */
    if (stampFix.length) writeGrouped_(sh, stampFix);
    for (var k = 0; k < noteFix.length; k++)
      sh.getRange(noteFix[k].row, CBC_COL.note).setValue(noteFix[k].note);
    SpreadsheetApp.flush();
    if (added || updated || fixed) bumpCrmCache_(srcKey);   /* để app thấy ngay */

    var msg = cfg.label + ' → ' + CRM_TARGETS[srcKey].label + ': đã thêm ' + added + ' CBC mới · cập nhật ghi chú ' + updated +
              ' · bỏ qua ' + skipped + ' (đã có hoặc trùng)' +
              (more ? (' · còn ' + more + ' khách chờ lượt sau') : '') +
              (noAccount ? (' · ' + noAccount + ' khách chưa dò được Account') : '') +
              (fixed ? (' · điền bù Area/PIC cho ' + fixed + ' ô còn trống') : '') +
              (noPic ? (' · ' + noPic + ' khách chưa xác định được PIC (thiếu tỉnh)') : '');
    return { ok:true, team:srcKey, target:CRM_TARGETS[srcKey].label,
             added:added, updated:updated, skipped:skipped, fixed:fixed, more:more,
             noAccount:noAccount, noPic:noPic, total:events.length, message:msg };
  } catch(err){
    return { ok:false, error:String(err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}

/* Báo cho CRM xoá bộ nhớ đệm sau khi ta ghi thẳng vào sheet của nó */
function bumpCrmCache_(srcKey){
  try {
    var t = CRM_TARGETS[srcKey];
    if (!t || !t.webapp) return false;
    var r = UrlFetchApp.fetch(t.webapp + '?action=bumpCache&_ts=' + Date.now(),
      { muteHttpExceptions:true, followRedirects:true });
    return r.getResponseCode() === 200;
  } catch(e){ return false; }
}

/* Dòng trống đầu tiên theo các cột nhập tay (Account PIC K, Account name E, Telephone L) */
function firstFreeCbcRow_(sh){
  var last = sh.getLastRow();
  if (last < CRM_DATA_ROW) return CRM_DATA_ROW;
  var n = last - CRM_DATA_ROW + 1;
  var contact = sh.getRange(CRM_DATA_ROW, CBC_COL.contact, n, 1).getValues();
  var accName = sh.getRange(CRM_DATA_ROW, CBC_COL.name,    n, 1).getValues();
  var phone   = sh.getRange(CRM_DATA_ROW, CBC_COL.phone,   n, 1).getValues();
  var lastData = CRM_DATA_ROW - 1;
  for (var i = 0; i < n; i++){
    if (S_(contact[i][0]) || S_(accName[i][0]) || S_(phone[i][0])) lastData = CRM_DATA_ROW + i;
  }
  return lastData + 1;
}

/* Cột S "Log tạo mới" — tạo tiêu đề nếu tab CBC chưa có */
function ensureCbcLogHeader_(sh){
  try {
    if (!S_(sh.getRange(CRM_HEADER_ROW, CBC_COL.log).getValue()))
      sh.getRange(CRM_HEADER_ROW, CBC_COL.log).setValue('Log tạo mới');
  } catch(e){}
}

/* ══════════════════ ⭐ v2.3 — SỬA AREA / PIC CỦA KHÁCH EVENT GÁN NHẦM MIỀN ══════════════════
   Chỉ đụng dòng: ghi chú "Khách hàng từ Event" · KHÔNG khớp account nào · miền tính lại theo tỉnh khác
   miền đang ghi · PIC đang ghi đúng là PIC tự gán của miền cũ (tức chưa ai sửa tay). */
function fixEventAreaPic(){
  var out = [];
  EVENT_SOURCES.forEach(function(cfg){
    try {
      var accs = crmAccounts_(cfg.key), learned = provinceAreaFromCrm_(accs);
      var sh = crmSheet_(CRM_TAB_CBC, cfg.key), last = sh.getLastRow();
      if (last < CRM_DATA_ROW){ out.push(CRM_TARGETS[cfg.key].label + ': chưa có dữ liệu'); return; }
      var n = last - CRM_DATA_ROW + 1, v = sh.getRange(CRM_DATA_ROW, 1, n, CBC_COL.log).getValues();
      var cells = [], fix = 0;
      for (var i = 0; i < n; i++){
        if (S_(v[i][CBC_COL.note - 1]).indexOf('Khách hàng từ Event') < 0) continue;
        if (accs.byName[key_(v[i][CBC_COL.name - 1])]) continue;            /* có account thật ⇒ giữ */
        var want = areaOf_(v[i][CBC_COL.province - 1], learned);
        if (!want) continue;
        var curA = S_(v[i][CBC_COL.area - 1]), curP = S_(v[i][CBC_COL.pic - 1]);
        if (curA === want) continue;
        if (curP && curP !== picOf_(cfg.key, curA)) continue;               /* PIC đã sửa tay ⇒ không đụng */
        var r = CRM_DATA_ROW + i;
        cells.push({ row:r, col:CBC_COL.area, val:want });
        cells.push({ row:r, col:CBC_COL.pic,  val:picOf_(cfg.key, want) });
        fix++;
      }
      if (cells.length){ writeGrouped_(sh, cells); SpreadsheetApp.flush(); bumpCrmCache_(cfg.key); }
      out.push(CRM_TARGETS[cfg.key].label + ': chuyển đúng miền / PIC cho ' + fix + ' khách');
    } catch(e){ out.push(cfg.label + ': lỗi — ' + e.message); }
  });
  var msg = 'Sửa Area / PIC khách event theo tỉnh\n\n' + out.join('\n');
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return { ok:true, message:msg };
}

/* ══════════════════ ⭐ v2.3 — THỐNG KÊ KHÁCH BỊ BỎ QUA ══════════════════ */
function diagEvent_(srcKey){
  var cfg = null; EVENT_SOURCES.forEach(function(c){ if (c.key === srcKey) cfg = c; });
  var all = readEventSource_(cfg, true), cbc = crmCbc_(srcKey);
  var st = { total:all.length, nonEvent:0, dup:0, inCrm:0, pending:0, noProv:0, nonEvSrc:{} }, seen = {};
  all.forEach(function(e){
    if (!e.isEvent){ st.nonEvent++; var k = S_(e.event) || '(trống)'; st.nonEvSrc[k] = (st.nonEvSrc[k] || 0) + 1; return; }
    if (e.phoneKey){ if (seen[e.phoneKey]){ st.dup++; return; } seen[e.phoneKey] = 1; }
    var hit = (e.phoneKey && cbc.byPhone[e.phoneKey]) || cbc.byNameAcc[key_(e.name) + '|' + key_(e.workplace)];
    if (hit) st.inCrm++; else st.pending++;
    if (!areaOf_(e.province)) st.noProv++;
  });
  var top = Object.keys(st.nonEvSrc).sort(function(a,b){ return st.nonEvSrc[b] - st.nonEvSrc[a]; }).slice(0, 8)
    .map(function(k){ return '      · ' + k.slice(0, 60) + ' — ' + st.nonEvSrc[k]; });
  return [cfg.label + ' → ' + CRM_TARGETS[srcKey].label,
    '   Dòng có tên khách: ' + st.total,
    '   Không nhận là event (bỏ qua): ' + st.nonEvent + (top.length ? '\n' + top.join('\n') : ''),
    '   Trùng SĐT trong file nguồn: ' + st.dup,
    '   Đã có trong CRM: ' + st.inCrm,
    '   Chưa có trong CRM (sẽ thêm ở lượt đồng bộ): ' + st.pending,
    '   Tỉnh không nhận ra miền (bảng cứng): ' + st.noProv].join('\n');
}
function menuDiag(){
  var L = [];
  EVENT_SOURCES.forEach(function(c){ try { L.push(diagEvent_(c.key)); } catch(e){ L.push(c.label + ': lỗi — ' + e.message); } });
  SpreadsheetApp.getUi().alert('Thống kê khách event\n\n' + L.join('\n\n'));
}

/* ══════════════════════════ API CHO WEB APP CRM ══════════════════════════ */

function doGet(e){  return handle_(e); }
function doPost(e){ return handle_(e); }

function handle_(e){
  var p = (e && e.parameter) || {};
  var cb = p.callback || '';
  var out;
  try {
    switch (S_(p.action) || 'list'){
      case 'ping':     out = { ok:true, pong:true, app:APP_NAME, ver:'2.3' }; break;
      case 'list':     out = apiList_(p);   break;
      case 'events':   out = apiEvents_(S_(p.team));  break;
      case 'sync':     out = S_(p.team) ? syncOneTeam_(S_(p.team), parseInt(p.limit,10) || 300)
                                        : syncEventToCbc(parseInt(p.limit,10) || 300); break;
      case 'backfill': out = backfillEventPic(S_(p.team) || ''); break;
      case 'fixArea':  out = fixEventAreaPic(); break;
      case 'stats':    out = apiStats_();   break;
      default:         out = { ok:false, error:'Unknown action: ' + S_(p.action) };
    }
  } catch(err){ out = { ok:false, error:String(err.message || err) }; }

  var body = JSON.stringify(out);
  if (cb){
    if (!/^[A-Za-z_$][\w$]*$/.test(cb)) cb = 'callback';
    return ContentService.createTextOutput(cb + '(' + body + ');')
                         .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function apiList_(p){
  var rows = readAllEvents_();
  var team = S_(p.team);
  if (team) rows = rows.filter(function(r){ return r.src === team; });
  var ev = S_(p.event), q = norm_(p.q), fy = S_(p.fy);
  if (ev) rows = rows.filter(function(r){ return S_(r.event) === ev; });
  if (fy) rows = rows.filter(function(r){ return S_(r.fy) === fy; });
  if (q)  rows = rows.filter(function(r){
    return norm_([r.name, r.phone, r.workplace, r.province, r.event].join(' ')).indexOf(q) >= 0;
  });
  var limit = parseInt(p.limit, 10) || 5000;
  return { ok:true, count:rows.length, rows:rows.slice(0, limit) };
}
function apiEvents_(team){
  var rows = readAllEvents_(), m = {};
  if (team) rows = rows.filter(function(r){ return r.src === team; });
  rows.forEach(function(r){
    var k = S_(r.event); if (!k) return;
    if (!m[k]) m[k] = { event:k, date:r.eventDate, fy:r.fy, src:r.srcLabel, n:0 };
    m[k].n++;
  });
  var list = Object.keys(m).map(function(k){ return m[k]; })
                   .sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
  return { ok:true, events:list, total:rows.length };
}
function apiStats_(){
  var rows = readAllEvents_();
  var byFy = {}, bySrc = {}, withPhone = 0, withWork = 0;
  rows.forEach(function(r){
    byFy[S_(r.fy) || '—']  = (byFy[S_(r.fy) || '—'] || 0) + 1;
    bySrc[r.srcLabel]      = (bySrc[r.srcLabel] || 0) + 1;
    if (r.phoneKey)  withPhone++;
    if (r.workplace) withWork++;
  });
  return { ok:true, total:rows.length, byFy:byFy, bySource:bySrc,
           withPhone:withPhone, withWorkplace:withWork };
}

/* ══════════════════════════ MENU & TRIGGER ══════════════════════════ */

function onOpen(){
  try {
    SpreadsheetApp.getUi().createMenu('MMH Event')
      .addItem('① Kiểm tra kết nối & dữ liệu', 'menuCheck')
      .addSeparator()
      .addItem('② Đồng bộ sang CBC ngay (cả 2 nhóm)', 'menuSync')
      .addItem('②a Chỉ đồng bộ Nha khoa → Dental',    'menuSyncDental')
      .addItem('②c Chỉ đồng bộ Nhãn khoa → Surgical', 'menuSyncSurgical')
      .addItem('②b Điền bù Area / PIC cho CBC từ Event', 'menuBackfill')
      .addItem('③ Bật đồng bộ tự động (mỗi giờ)', 'installEventTrigger')
      .addItem('④ Tắt đồng bộ tự động',        'removeEventTrigger')
      .addSeparator()
      .addItem('⑤ Quên ID file CRM đã nhớ (khi đổi file)', 'resetCrmIds')
      .addItem('⑥ Sửa Area / PIC khách event gán nhầm miền', 'fixEventAreaPic')
      .addItem('⑦ Thống kê khách bị bỏ qua / chờ đồng bộ', 'menuDiag')
      .addToUi();
  } catch(e){}
}

function menuCheck(){
  var ui = SpreadsheetApp.getUi(), L = [];
  L.push('APP: ' + APP_NAME + ' v2.3');
  L.push('');
  L.push('── SHEET NGUỒN ──');
  EVENT_SOURCES.forEach(function(cfg){
    try {
      var sh = resolveSheet_(cfg);
      var hr = findHeaderRow_(sh, cfg.headerRow);
      var rows = readEventSource_(cfg);
      var C = colMap_(sh.getRange(hr || cfg.headerRow, 1, 1, sh.getLastColumn()).getValues()[0]);
      L.push('✓ ' + cfg.label + ' → "' + sh.getName() + '"');
      L.push('   header hàng ' + hr + ' · khách từ event: ' + rows.length);
      L.push('   cột nhận diện được: ' + Object.keys(C).join(', '));
      if (rows.length) L.push('   ví dụ: ' + rows[0].name + ' · ' + rows[0].event);
    } catch(err){ L.push('✗ ' + cfg.label + ': ' + err.message); }
  });
  L.push('');
  L.push('── FILE CRM ĐÍCH (mỗi nhóm một file) ──');
  EVENT_SOURCES.forEach(function(cfg){
    var t = CRM_TARGETS[cfg.key];
    try {
      var id = crmSsIdOf_(cfg.key);
      var sp = SpreadsheetApp.openById(id);
      var accs = crmAccounts_(cfg.key);
      L.push('✓ ' + cfg.label + ' → ' + sp.getName());
      L.push('   id ' + id);
      L.push('   CBC: ' + crmCbc_(cfg.key).rows.length + ' · Account: ' + accs.list.length +
             ' · học được ' + Object.keys(provinceAreaFromCrm_(accs)).length + ' tỉnh → miền');
    } catch(err){
      L.push('✗ ' + cfg.label + ' → ' + (t ? t.label : '?') + ': ' + err.message);
    }
  });
  L.push('');
  L.push('── GÁN PIC THEO KHU VỰC ──');
  EVENT_SOURCES.forEach(function(cfg){
    var t = PIC_BY_AREA[cfg.key] || {};
    L.push('  ' + cfg.label + ': North→' + (t.North || '(trống)') +
           ' · Central→' + (t.Central || '(trống)') +
           ' · South→' + (t.South || '(trống)'));
  });
  L.push('');
  L.push('── ĐỒNG BỘ TỰ ĐỘNG ──');
  L.push(hasEventTrigger_() ? '✓ Đang bật (mỗi giờ)' : '✗ Chưa bật — chạy mục ③');
  ui.alert(L.join('\n'));
}

function menuSync(){
  var r = syncEventToCbc(300);
  SpreadsheetApp.getUi().alert(r.ok ? r.message : ('Lỗi: ' + r.error));
}
function menuSyncDental(){
  var r = syncOneTeam_('dental', 300);
  SpreadsheetApp.getUi().alert(r.ok ? r.message : ('Lỗi: ' + r.error));
}
function menuSyncSurgical(){
  var r = syncOneTeam_('ophthalmic', 300);
  SpreadsheetApp.getUi().alert(r.ok ? r.message : ('Lỗi: ' + r.error));
}
/* Xoá ID đã nhớ, buộc dò lại từ web app (dùng khi đổi file CRM) */
function resetCrmIds(){
  var p = PropertiesService.getScriptProperties();
  EVENT_SOURCES.forEach(function(c){ p.deleteProperty('CRM_SSID_' + c.key); });
  SpreadsheetApp.getUi().alert('Đã xoá ID đã nhớ. Lần chạy tới sẽ hỏi lại web app CRM.');
}

/* Quét tab 2. CBC: dòng có Ghi chú "Khách hàng từ Event" mà còn trống Area hoặc PIC thì điền */
function backfillEventPic(srcKey){
  if (!srcKey){
    var all = { ok:true, fixed:0, noPic:0 }, ms = [];
    EVENT_SOURCES.forEach(function(c){
      var r = backfillEventPic(c.key);
      all.fixed += (r.fixed||0); all.noPic += (r.noPic||0);
      ms.push(CRM_TARGETS[c.key].label + ': ' + (r.ok ? (r.fixed + ' ô') : ('lỗi — ' + r.error)));
    });
    all.message = 'Điền bù Area/PIC — ' + ms.join(' · ');
    return all;
  }
  try {
    var accs = crmAccounts_(srcKey), learned = provinceAreaFromCrm_(accs);
    var sh = crmSheet_(CRM_TAB_CBC, srcKey), last = sh.getLastRow();
    if (last < CRM_DATA_ROW) return { ok:true, fixed:0, message:'Tab CBC chưa có dữ liệu' };
    var n = last - CRM_DATA_ROW + 1;
    var v = sh.getRange(CRM_DATA_ROW, 1, n, CBC_COL.log).getValues();

    var srcByPhone = {};
    readAllEvents_().forEach(function(e){ if (e.phoneKey) srcByPhone[e.phoneKey] = e.src; });

    var fixed = 0, noPic = 0, cells = [];
    for (var i = 0; i < n; i++){
      var note = S_(v[i][CBC_COL.note - 1]);
      if (note.indexOf('Khách hàng từ Event') < 0) continue;
      var row  = CRM_DATA_ROW + i;
      var area = S_(v[i][CBC_COL.area - 1]);
      var pic  = S_(v[i][CBC_COL.pic - 1]);
      if (area && pic) continue;

      var accName = S_(v[i][CBC_COL.name - 1]);
      var acc  = accName ? accs.byName[key_(accName)] : null;
      var prov = S_(v[i][CBC_COL.province - 1]);
      var src  = srcByPhone[phoneKey_(v[i][CBC_COL.phone - 1])] || srcKey;

      var wantArea = area || (acc && S_(acc.area)) || areaOf_(prov, learned) || AREA_FALLBACK;
      var wantPic  = pic  || (acc && S_(acc.pic))  || picOf_(src, wantArea);
      if (!area && wantArea){ cells.push({ row:row, col:CBC_COL.area, val:wantArea }); fixed++; }
      if (!pic  && wantPic ){ cells.push({ row:row, col:CBC_COL.pic,  val:wantPic  }); fixed++; }
      if (!wantPic) noPic++;
    }
    if (cells.length){ writeGrouped_(sh, cells); SpreadsheetApp.flush(); }
    if (fixed) bumpCrmCache_(srcKey);
    return { ok:true, team:srcKey, fixed:fixed, noPic:noPic,
             message:'Đã điền ' + fixed + ' ô Area/PIC còn trống' +
                     (noPic ? (' · ' + noPic + ' dòng chưa xác định được PIC (thiếu tỉnh)') : '') };
  } catch(e){ return { ok:false, error:String(e.message || e) }; }
}
function menuBackfill(){
  var r = backfillEventPic();
  SpreadsheetApp.getUi().alert(r.message);
}

function hasEventTrigger_(){
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++)
    if (t[i].getHandlerFunction() === 'syncEventTick') return true;
  return false;
}
function installEventTrigger(){
  removeEventTrigger();
  ScriptApp.newTrigger('syncEventTick').timeBased().everyHours(1).create();
  try { SpreadsheetApp.getUi().alert('Đã bật đồng bộ tự động mỗi giờ.'); } catch(e){}
}
function removeEventTrigger(){
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++)
    if (t[i].getHandlerFunction() === 'syncEventTick') ScriptApp.deleteTrigger(t[i]);
}
function syncEventTick(){ syncEventToCbc(300); }