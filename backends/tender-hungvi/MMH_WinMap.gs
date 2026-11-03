/**************************************************************************************************
 * MMH · WIN MAP — dữ liệu cho web "Bản đồ trúng thầu" (repo ManiMedicalHanoi/Tender-Result ▸ map/)
 * GIỐNG HỆT ở backend tender-icare và tender-hungvi (sửa 1 nơi ⇒ chép sang nơi kia). Chỉ ĐỌC sheet.
 *
 *   GET ?action=winMap[&from=202509][&callback=fn]
 *     → { ok, v, npp, region, sheet, from, exported, rows:[…] }
 *
 * Khác feed mặc định (chỉ dao): trả MỌI dòng thầu (dao + chỉ khâu + khác) có mốc thời gian ≥ from
 * (tháng phê duyệt gói thầu, hoặc Month / ngày ký giấy uỷ quyền khi chưa có ngày phê duyệt).
 * Dòng gộp ô (Hospital trống mà có Product code) lấy thông tin gói từ dòng trên.
 * Cột dò theo tên tiêu đề ở CONFIG.HEADER_ROW; cột trùng tên: lần 1 = phần chào thầu, lần 2 = phần trúng.
 **************************************************************************************************/
var WM_VER = '1.0';

function wmPayload_(p) {
  p = p || {};
  var from = +(p.from || 202509) || 202509;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_NAME + '"');
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  var base = { ok: true, v: WM_VER, npp: CONFIG.NPP, region: CONFIG.REGION, sheet: CONFIG.SHEET_NAME, from: from,
               exported: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'), rows: [] };
  if (lastRow < CONFIG.START_ROW) return base;

  var head = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var C = wmCols_(head);
  var data = sh.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, lastCol).getValues();
  var links = null;
  if (C.link >= 0) {
    try { links = sh.getRange(CONFIG.START_ROW, C.link + 1, data.length, 1).getRichTextValues(); } catch (e) { links = null; }
  }

  var PKG = ['tbmt', 'hospital', 'city', 'address', 'eff', 'exp', 'tender', 'project', 'company', 'signed', 'fy', 'month', 'approve', 'dur'];
  var prev = null;
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var g = function (k) { var c = C[k]; return (c == null || c < 0) ? '' : row[c]; };
    var pcode = wmStr_(g('pcode')), hosp = wmStr_(g('hospital')), res = wmStr_(g('result'));
    if (!pcode && !hosp && !res && !wmStr_(g('tbmt'))) { continue; }
    var r = {};
    PKG.forEach(function (k) { r[k] = g(k); });
    if (!hosp && pcode && prev) { PKG.forEach(function (k) { if (wmBlank_(r[k])) r[k] = prev[k]; }); }
    prev = r;

    var approve = wmDate_(r.approve, tz), signed = wmDate_(r.signed, tz);
    var monthKey = wmMonth_(r.month);
    var key = approve ? +approve.slice(0, 7).replace('-', '') : (monthKey || (signed ? +signed.slice(0, 7).replace('-', '') : 0));
    var anyKey = Math.max(key, monthKey || 0, signed ? +signed.slice(0, 7).replace('-', '') : 0);
    if (!anyKey || anyKey < from) continue;

    var dur = wmDur_(r.dur);
    var link = '';
    if (links && links[i] && links[i][0]) {
      try { link = links[i][0].getLinkUrl() || ''; } catch (e) { link = ''; }
    }
    if (!link) { var lv = wmStr_(g('link')); if (/^https?:\/\//i.test(lv)) link = lv; }

    base.rows.push({
      row: CONFIG.START_ROW + i,
      tbmt: wmStr_(r.tbmt).replace(/\s+/g, ''),
      hospital: wmStr_(r.hospital),
      city: wmStr_(r.city),
      address: wmStr_(r.address),
      tender: wmStr_(r.tender),
      project: wmStr_(r.project),
      company: wmStr_(r.company),
      signed: signed || '',
      fyCol: wmStr_(r.fy),
      month: monthKey || '',
      bidOpen: wmDate_(r.eff, tz) || '',
      bidClose: wmDate_(r.exp, tz) || '',
      pcode: pcode,
      qty: wmNum_(g('qty')),
      price: wmNum_(g('price')),
      unit: wmStr_(g('unit')),
      result: wmResult_(res),
      wonProduct: wmStr_(g('wonProduct')),
      wonQty: wmNum_(g('wonQty')),
      wonPrice: wmNum_(g('wonPrice')),
      total: wmNum_(g('total')),
      approve: approve || '',
      dur: dur,
      durRaw: wmStr_(r.dur),
      note: wmStr_(g('note')),
      link: link
    });
  }
  return base;
}

function wmCols_(head) {
  var norm = function (h) {
    return String(h == null ? '' : h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
      .replace(/[\r\n]+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim();
  };
  var H = head.map(norm);
  var find = function (names, nth) {
    nth = nth || 1; var seen = 0;
    for (var c = 0; c < H.length; c++) {
      for (var j = 0; j < names.length; j++) {
        if (H[c] && H[c].indexOf(names[j]) === 0) { seen++; if (seen === nth) return c; break; }
      }
    }
    return -1;
  };
  var C = {
    tbmt: find(['so thong bao moi thau', 'tbmt']),
    hospital: find(['hospital name', 'ten benh vien', 'chu dau tu']),
    city: find(['city', 'tinh', 'province']),
    address: find(['address', 'dia chi']),
    eff: find(['ngay hieu luc']),
    exp: find(['ngay het han']),
    tender: find(['name of tender']),
    project: find(['project name']),
    company: find(['the company authorized']),
    signed: find(['singed date', 'signed date']),
    fy: find(['fy']),
    month: find(['month', 'thang']),
    pcode: find(['product code']),
    qty: find(['quantity', 'so luong']),
    price: find(['price (vnd)', 'gia (vnd)', 'price']),
    unit: find(['unit', 'don vi']),
    result: find(['result of tender']),
    wonQty: find(['quantity', 'so luong'], 2),
    wonPrice: find(['price (vnd)', 'gia (vnd)', 'price'], 2),
    wonUnit: find(['unit', 'don vi'], 2),
    total: find(['total amount']),
    approve: find(['ngay phe duyet']),
    dur: find(['thoi gian thuc hien']),
    note: find(['note', 'ghi chu']),
    link: find(['link document', 'link'])
  };
  // cột "Product" (phần trúng) — khớp đúng tên, không lẫn "Product code"
  C.wonProduct = -1;
  for (var c = 0; c < H.length; c++) { if (H[c] === 'product') { C.wonProduct = c; break; } }
  // Hùng Vĩ: ô tiêu đề cột FY bị gõ nhầm ⇒ lấy cột ngay sau "Singed date"
  if (C.fy < 0 && C.signed >= 0 && C.month === C.signed + 2) C.fy = C.signed + 1;
  return C;
}

function wmStr_(v) {
  if (v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  return String(v).replace(/\s+/g, ' ').trim();
}
function wmBlank_(v) { return v == null || String(v).trim() === ''; }
function wmNum_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v == null ? '' : v).replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  else s = s.replace(/,/g, '');
  var n = parseFloat(s); return isFinite(n) ? n : 0;
}
function wmResult_(r) {
  var s = String(r || '').trim().toLowerCase();
  if (!s) return '';
  if (/^win|trung|thang/.test(s)) return 'Win';
  if (/^fail|truot|lose|loss/.test(s)) return 'Fail';
  if (/^cancel|huy/.test(s)) return 'Cancel';
  if (/^pend|cho/.test(s)) return 'Pending';
  return String(r).trim();
}
function wmDur_(v) {
  var n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.]/g, ''));
  if (!isFinite(n) || n < 1 || n > 60) return 12;
  return Math.round(n);
}
function wmMonth_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return v.getFullYear() * 100 + v.getMonth() + 1;
  var s = String(v == null ? '' : v).replace(/\.0+$/, '').trim();
  var m = s.match(/^(\d{4})(\d{2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return +s;
  m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (m) return +m[2] * 100 + +m[1];
  return 0;
}
/** → 'yyyy-MM-dd' hoặc '' — nhận Date, số yyyymmdd, chuỗi yyyymmdd / dd/MM/yyyy / yyyy-MM-dd. */
function wmDate_(v, tz) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : Utilities.formatDate(v, tz || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  var s = String(v).replace(/\.0+$/, '').trim(), m;
  var ok = function (y, mo, d) { return y > 2000 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31; };
  var fmt = function (y, mo, d) { return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2); };
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/)) && ok(+m[1], +m[2], +m[3])) return fmt(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)) && ok(+m[1], +m[2], +m[3])) return fmt(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/)) && ok(+m[3], +m[2], +m[1])) return fmt(+m[3], +m[2], +m[1]);
  return '';
}
