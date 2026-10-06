/*************************************************************************************************
 * MMH REPORT HUB — Order_Sync.gs   (v1.0)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * KEY TASK "TƯ VẤN BÁN HÀNG" — TỰ SINH TỪ TAB "3. SALE ORDER" CỦA FILE CRM DENTAL
 *
 * Mỗi tháng có đơn hàng ⇒ sinh ĐÚNG MỘT key task:
 *      Tư vấn bán hàng 092026
 * Dưới mỗi key task luôn có đủ các dòng sub task, mỗi sales một dòng cho mỗi tuần:
 *      Đơn hàng Tuần 1 Tháng 09 từ Viet
 *      Đơn hàng Tuần 2 Tháng 09 từ Viet
 *      …
 * Tuần tính theo TUẦN LỊCH Thứ 2 → Chủ nhật, cắt gọn trong phạm vi tháng.
 *
 * Task Result của mỗi dòng:
 *      Chưa phát sinh đơn hàng trong tuần này
 *   hoặc
 *      Số đơn hàng: 3
 *      Số khách mua hàng: 2
 *      Tổng giá trị: 42.500.000 VNĐ
 *      Chi tiết:
 *      • REAMERS 21MM # 06: Số lượng 12
 *      • DIA-BURS EA-10: Số lượng 5
 *
 * Nguồn dữ liệu: file "MMH_Dental_CRM_FY68" · tab "3. SALE ORDER" (header hàng 3, data hàng 4).
 * Sales nhập trên web app CRM hoặc gõ thẳng trên sheet — cả hai đều được gom về đây.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * CÀI ĐẶT — CHẠY MỘT LẦN:
 *      installOrderTrigger()      → tự đồng bộ 10 phút/lần
 * KIỂM TRA:
 *      osDebug()                  → đọc được bao nhiêu đơn, tháng nào, PIC nào
 *      osSyncNow()                → chạy đồng bộ ngay, xem báo cáo kết quả
 *
 * ⚠ File này DÙNG CHUNG project với Visiting_Sync.gs và Code.gs của Report Hub.
 *   Nó chỉ đụng tới các dòng có khoá đồng bộ bắt đầu bằng "O:" ở cột U, nên hoàn toàn
 *   không ảnh hưởng tới phần "Customer visiting" đang chạy.
 *************************************************************************************************/

/* ══════════════ CONFIG ══════════════ */

/* Hai cột dấu vết đồng bộ — DÙNG CHUNG với Visiting_Sync.gs (U và V trên "WEEKYLY new") */
var OS_COL_KEY  = (typeof VISIT_COL_KEY  !== 'undefined') ? VISIT_COL_KEY  : 21;   // U
var OS_COL_META = (typeof VISIT_COL_META !== 'undefined') ? VISIT_COL_META : 22;   // V

var OS_BACK_MONTHS = 2;     // đồng bộ tháng hiện tại + 2 tháng trước
var OS_FWD_MONTHS  = 0;     // tháng tới chưa có đơn ⇒ không tạo trước
var OS_CHUNK       = 40;    // số dòng mỗi lô chèn
var OS_TIME_BUDGET = 240000;// 4 phút — dừng gọn trước trần 6 phút của trigger
var OS_MAX_INS     = 300;
var OS_MAX_UPD     = 400;

/* Tên key task: "Tư vấn bán hàng " + MMYYYY  →  "Tư vấn bán hàng 092026" */
var OS_KEY_PREFIX = 'Tư vấn bán hàng ';
var OS_TYPE_TASK  = 'Sales-Dental';
var OS_EMPTY_TEXT = 'Chưa phát sinh đơn hàng trong tuần này';

/* Nguồn: CHỈ nhóm Dental (theo yêu cầu). Muốn thêm nhóm khác thì khai thêm một mục ở đây. */
var OS_SOURCES = {
  dental: {
    label:     'Dental',
    enabled:   true,
    get ssId(){ return osCrmSsId_('dental'); },
    names:     ['3. SALE ORDER', 'SALE ORDER', 'Sale Order'],
    headerRow: 3,
    dataRow:   4,
    typeTask:  OS_TYPE_TASK,
    /* Danh sách sales LUÔN có dòng sub task, kể cả tuần không phát sinh đơn nào */
    pics:      ['Viet', 'Phuong', 'Vinh']
  }
};

/* Web app CRM — dùng để hỏi ID file, khỏi khai ID ở hai nơi.
   Đã có VS_CRM_WEBAPP bên Visiting_Sync.gs thì dùng chung luôn. */
var OS_CRM_WEBAPP = {
  dental: 'https://script.google.com/macros/s/AKfycbyzmhECZZfbOZUyXOK5O70ukwTgQ9DHp70MN-HUAL0wMpOptdTTbaGcvMEmcnCrCji6/exec'
};
function osCrmSsId_(team){
  /* ưu tiên dùng lại hàm của Visiting_Sync.gs để hai module luôn trỏ cùng một file */
  try { if (typeof vsCrmSsId_ === 'function') return vsCrmSsId_(team); } catch(e){}
  var pk = 'VS_' + String(team).toUpperCase() + '_SSID';
  var props = PropertiesService.getScriptProperties();
  var v = props.getProperty(pk);
  if (v && String(v).trim()) return String(v).trim();
  var url = OS_CRM_WEBAPP[team];
  if (!url) throw new Error('Chưa khai web app CRM cho nhóm "' + team + '"');
  var r = UrlFetchApp.fetch(url + '?action=sheetInfo&_ts=' + Date.now(),
          { muteHttpExceptions:true, followRedirects:true });
  var j = {};
  try { j = JSON.parse(r.getContentText()); } catch(e){}
  if (!j.ok || !j.id) throw new Error('Không lấy được ID file CRM ' + team + '.');
  props.setProperty(pk, j.id);
  return j.id;
}

/* Tên PIC ở sheet nguồn ⇄ tên PIC chuẩn trên Report Hub */
var OS_PIC_ALIAS = (typeof VS_PIC_ALIAS !== 'undefined') ? VS_PIC_ALIAS : {
  'viet':'Viet', 'minh viet':'Viet', 'phuong':'Phuong', 'vinh':'Vinh'
};
var OS_PIC_SKIP = { 'test':1, 'nguyen ha':1, 'ha':1, 'sale admin':1 };

/* ══════════════ TIỆN ÍCH ══════════════ */
function osNorm_(s){
  if (typeof vsNorm === 'function') return vsNorm(s);
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}
function osHash_(s){
  if (typeof vsHash === 'function') return vsHash(s);
  var h = 5381; s = String(s);
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function osS_(v){ return String(v === null || v === undefined ? '' : v).trim(); }
function osNum_(v){
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}
function osPicName_(raw){
  var n = String(raw || '').replace(/[\r\n]+/g, ' ').trim();
  /* cột PIC của Sale Order đôi khi ghi kiểu "Viet, Phuong" — lấy tên đầu tiên */
  if (n.indexOf(',') >= 0) n = n.split(',')[0].trim();
  var k = n.toLowerCase().replace(/\s+/g, ' ');
  return OS_PIC_ALIAS[k] || OS_PIC_ALIAS[k.replace(/\s/g, '')] || n;
}
function osPicSkipped_(name){
  return !!OS_PIC_SKIP[String(name || '').toLowerCase().replace(/\s+/g, ' ').trim()];
}
/* Ngày → 'yyyy-MM-dd'. Nhận Date, 'yyyy-MM-dd' và text 'dd/MM/yyyy'. */
function osDateISO_(v){
  if (typeof vsDateISO === 'function') return vsDateISO(v);
  if (v instanceof Date && !isNaN(v.getTime()))
    return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2);
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  var m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function osToDate_(iso){
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : '';
}
function osIso_(d){
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function osAddDays_(iso, k){
  var d = osToDate_(iso); if (!d) return iso;
  d.setDate(d.getDate() + k);
  return osIso_(d);
}
function osMonday_(iso){
  var d = osToDate_(iso); if (!d) return iso;
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return osIso_(d);
}
function osToday_(){ return osIso_(new Date()); }
function osYm_(d){ return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2); }
function osMonthWindow_(){
  var out = [], now = new Date();
  for (var i = -OS_BACK_MONTHS; i <= OS_FWD_MONTHS; i++)
    out.push(osYm_(new Date(now.getFullYear(), now.getMonth() + i, 1)));
  return out;
}
function osMonthsOf_(opt){
  var m = opt && opt.months;
  if (typeof m === 'string'){ try { m = JSON.parse(m); } catch(e){ m = String(m).split(/[,\s]+/); } }
  if (Object.prototype.toString.call(m) === '[object Array]'){
    var out = [];
    m.forEach(function(x){
      var v = String(x == null ? '' : x).replace(/\D/g, '').slice(0, 6);
      if (v.length === 6 && out.indexOf(v) < 0) out.push(v);
    });
    if (out.length) return out;
  }
  return osMonthWindow_();
}
/* Số tiền kiểu Việt Nam: 42500000 → "42.500.000 VNĐ" */
function osMoney_(v){
  var n = Math.round(osNum_(v));
  var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + s + ' VNĐ';
}
function osQty_(v){
  var n = osNum_(v);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ══════════════ TUẦN LỊCH TRONG THÁNG (Thứ 2 → Chủ nhật) ══════════════
   Tuần 1 = tuần chứa ngày 1 của tháng, cắt gọn trong phạm vi tháng để một đơn hàng
   không bị đếm ở hai tháng khác nhau.

   ⚠ Mẩu tuần quá ngắn được GỘP vào tuần bên cạnh. Ví dụ tháng 11/2026 ngày 1 rơi vào
   Chủ nhật và ngày 30 rơi vào Thứ 2: nếu không gộp sẽ ra 6 "tuần", trong đó hai tuần
   chỉ có đúng một ngày — mỗi sales 6 dòng sub task vô nghĩa. Sau khi gộp, tháng nào
   cũng chỉ còn 4–5 tuần thật sự. */
var OS_MIN_WEEK_DAYS = 4;
function osDaysBetween_(a, b){
  var d1 = osToDate_(a), d2 = osToDate_(b);
  if (!d1 || !d2) return 0;
  return Math.round((d2 - d1) / 86400000) + 1;
}
function osWeeksOfMonth_(ym){
  var y = parseInt(String(ym).slice(0, 4), 10), mo = parseInt(String(ym).slice(4, 6), 10);
  var first = new Date(y, mo - 1, 1), last = new Date(y, mo, 0);
  var mFrom = osIso_(first), mTo = osIso_(last);
  var out = [], cur = osMonday_(mFrom), i = 0;
  while (cur <= mTo && i < 8){
    i++;
    var wEnd = osAddDays_(cur, 6);
    out.push({
      from:  cur  < mFrom ? mFrom : cur,      /* cắt đầu tháng */
      to:    wEnd > mTo   ? mTo   : wEnd,     /* cắt cuối tháng */
      wFrom: cur,
      wTo:   wEnd
    });
    cur = osAddDays_(cur, 7);
  }
  /* gộp mẩu đầu tháng vào tuần kế, mẩu cuối tháng vào tuần trước */
  if (out.length > 1 && osDaysBetween_(out[0].from, out[0].to) < OS_MIN_WEEK_DAYS){
    out[1].from = out[0].from; out[1].wFrom = out[0].wFrom;
    out.shift();
  }
  var L = out.length - 1;
  if (out.length > 1 && osDaysBetween_(out[L].from, out[L].to) < OS_MIN_WEEK_DAYS){
    out[L - 1].to = out[L].to; out[L - 1].wTo = out[L].wTo;
    out.pop();
  }
  out.forEach(function(w, k){ w.no = k + 1; });
  return out;
}

/* ══════════════ ĐỌC TAB "3. SALE ORDER" ══════════════ */
/* Dò cột theo TÊN tiêu đề; không thấy thì dùng vị trí cột chuẩn của file CRM. */
var OS_HEADERS = {
  day:      ['day', 'ngaydat', 'orderdate', 'ngay'],
  month:    ['month'],
  fy:       ['fy'],
  orderNo:  ['orderno', 'ordernumber', 'sodonhang'],
  account:  ['accountname', 'account', 'tenkhachhang'],
  pic:      ['mmhsalespic', 'salespic', 'salepic', 'pic'],
  detail:   ['detailproduct', 'detail', 'chitiet'],
  ptype:    ['producttype', 'productgroup', 'nhomsanpham'],
  qty:      ['quantity', 'qty', 'soluong', 'sl'],
  price:    ['unitprice', 'dongia'],
  amount:   ['amount', 'thanhtien', 'giatri'],
  channel:  ['kenh', 'channel']
};
/* Vị trí cột chuẩn trên file CRM (B=2 … AA=27) — phương án dự phòng */
var OS_FIXED = { day:7, month:6, fy:5, orderNo:8, account:10, pic:17,
                 detail:18, ptype:19, qty:20, price:21, amount:22, channel:4 };

function osColMap_(headRow){
  var norm = headRow.map(osNorm_), map = {}, used = {};
  function take(f, i){ map[f] = i + 1; used[i] = 1; }
  for (var f in OS_HEADERS){
    var al = OS_HEADERS[f];
    for (var j = 0; j < al.length && !map[f]; j++)
      for (var i = 0; i < norm.length; i++)
        if (!used[i] && norm[i] && norm[i] === al[j]){ take(f, i); break; }
  }
  for (var f2 in OS_HEADERS){
    if (map[f2]) continue;
    var al2 = OS_HEADERS[f2];
    for (var j2 = 0; j2 < al2.length && !map[f2]; j2++)
      for (var i2 = 0; i2 < norm.length; i2++)
        if (!used[i2] && norm[i2] && norm[i2].indexOf(al2[j2]) === 0){ take(f2, i2); break; }
  }
  for (var f3 in OS_FIXED) if (!map[f3]) map[f3] = OS_FIXED[f3];
  return map;
}
function osResolveSheet_(cfg){
  var sp = SpreadsheetApp.openById(cfg.ssId), all = sp.getSheets(), sh = null, i, j;
  for (j = 0; j < cfg.names.length && !sh; j++){
    var want = osNorm_(cfg.names[j]);
    for (i = 0; i < all.length; i++) if (osNorm_(all[i].getName()) === want){ sh = all[i]; break; }
  }
  if (!sh) for (j = 0; j < cfg.names.length && !sh; j++){
    var k = osNorm_(cfg.names[j]);
    for (i = 0; i < all.length; i++) if (osNorm_(all[i].getName()).indexOf(k) >= 0){ sh = all[i]; break; }
  }
  if (!sh) throw new Error('không tìm thấy tab (' + cfg.names.join(' / ') + ')');
  return sh;
}
function osReadOrders_(srcKey){
  var cfg = OS_SOURCES[srcKey];
  if (!cfg) return [];
  var sh = osResolveSheet_(cfg);
  var lastRow = sh.getLastRow(), lastCol = Math.max(sh.getLastColumn(), 27);
  if (lastRow < cfg.dataRow) return [];

  var head = sh.getRange(cfg.headerRow, 1, 1, lastCol).getValues()[0];
  var C = osColMap_(head);
  var vals = sh.getRange(cfg.dataRow, 1, lastRow - cfg.dataRow + 1, lastCol).getValues();

  var out = [];
  for (var i = 0; i < vals.length; i++){
    var v = vals[i];
    var g = function(f){ return C[f] ? v[C[f] - 1] : ''; };

    var acc = osS_(g('account'));
    var pic = osPicName_(g('pic'));
    if (!acc && !osS_(g('orderNo'))) continue;          /* dòng trống */
    if (!pic || osPicSkipped_(pic)) continue;

    /* Ngày căn cứ theo cột Day; thiếu thì lấy tạm ngày 1 của cột Month */
    var iso = osDateISO_(g('day'));
    var ymRaw = osS_(g('month')).replace(/\D/g, '').slice(0, 6);
    if (!iso && ymRaw.length === 6) iso = ymRaw.slice(0, 4) + '-' + ymRaw.slice(4, 6) + '-01';
    if (!iso) continue;
    var ym = iso.slice(0, 4) + iso.slice(5, 7);

    out.push({
      src: srcKey, row: cfg.dataRow + i, ym: ym, day: iso, pic: pic,
      orderNo: osS_(g('orderNo')) || ('#' + (cfg.dataRow + i)),
      account: acc,
      detail:  osS_(g('detail')),
      ptype:   osS_(g('ptype')),
      channel: osS_(g('channel')),
      qty:     osNum_(g('qty')),
      price:   osNum_(g('price')),
      amount:  osNum_(g('amount')) || (osNum_(g('qty')) * osNum_(g('price')))
    });
  }
  return out;
}

/* ══════════════ DỰNG NỘI DUNG TASK RESULT ══════════════ */
/* Tên sản phẩm để gom nhóm dòng "Chi tiết".
   Ô Detail có thể chứa NHIỀU mã trên nhiều dòng (một đơn giá, một số lượng chung) —
   khi đó gom thành một mục "A + B" để số lượng không bị đếm trùng. */
function osProductKey_(it){
  var parts = String(it.detail || '')
    .split(/[\n;]+/).map(function(x){ return String(x).trim(); }).filter(Boolean);
  if (!parts.length) return osS_(it.ptype) || '(chưa ghi sản phẩm)';
  if (parts.length === 1) return parts[0];
  return parts.join(' + ');
}
function osResultText_(list){
  if (!list.length) return OS_EMPTY_TEXT;

  var orders = {}, customers = {}, prod = {}, prodOrder = [], total = 0;
  list.forEach(function(it){
    orders[osNorm_(it.orderNo) || it.orderNo] = it.orderNo;
    var ck = osNorm_(it.account);
    if (ck) customers[ck] = 1;
    total += osNum_(it.amount);
    var pk = osProductKey_(it);
    if (prod[pk] === undefined){ prod[pk] = 0; prodOrder.push(pk); }
    prod[pk] += osNum_(it.qty);
  });

  var nOrder = Object.keys(orders).length;
  var L = [];
  L.push('Số đơn hàng: ' + nOrder);
  L.push('Số khách mua hàng: ' + Object.keys(customers).length);
  L.push('Tổng giá trị: ' + osMoney_(total));
  L.push('Chi tiết:');
  prodOrder.sort(function(a, b){ return prod[b] - prod[a]; });
  prodOrder.forEach(function(p){
    L.push('• ' + p + ': Số lượng ' + osQty_(prod[p]));
  });
  /* liệt kê mã đơn để đối chiếu với nhật ký _ORDER_LOG bên file CRM */
  var nos = Object.keys(orders).map(function(k){ return orders[k]; }).sort();
  L.push('Mã đơn: ' + nos.join(' · '));
  return L.join('\n');
}
/* Trạng thái theo vị trí của tuần so với hôm nay */
function osStatusOf_(list, wk){
  var today = osToday_();
  if (wk.to < today)   return { status:'Completed',   pct: 100 };
  if (wk.from > today) return { status:'To Do',       pct: 0 };
  return list.length ? { status:'In Progress', pct: 50 } : { status:'In Progress', pct: 25 };
}

/* ══════════════ DỰNG DANH SÁCH DÒNG CẦN CÓ ══════════════ */
function osBuildWanted_(items, months, cfg, srcKey){
  var wanted = {}, titles = {};

  /* gom đơn theo tháng để biết tháng nào thật sự có phát sinh */
  var byMonth = {};
  items.forEach(function(it){
    if (months.indexOf(it.ym) < 0) return;
    (byMonth[it.ym] = byMonth[it.ym] || []).push(it);
  });

  Object.keys(byMonth).sort().forEach(function(ym){
    var rows  = byMonth[ym];
    if (!rows.length) return;                          /* tháng chưa có đơn ⇒ chưa tạo key task */
    var mm    = ym.slice(4, 6), yyyy = ym.slice(0, 4);
    var title = OS_KEY_PREFIX + mm + yyyy;             /* "Tư vấn bán hàng 092026" */
    titles[title] = cfg;

    /* danh sách sales: roster cố định + bất kỳ PIC nào có đơn trong tháng */
    var pics = (cfg.pics || []).slice();
    rows.forEach(function(it){ if (pics.indexOf(it.pic) < 0) pics.push(it.pic); });

    osWeeksOfMonth_(ym).forEach(function(wk){
      pics.forEach(function(pic){
        var mine = rows.filter(function(it){
          return it.pic === pic && it.day >= wk.from && it.day <= wk.to;
        });
        var st = osStatusOf_(mine, wk);
        var o = {
          syncKey: 'O:' + srcKey + ':' + osHash_(ym + '|' + wk.no + '|' + pic),
          title:   title,
          type:    '',
          keyTask: '',
          subTask: 'Đơn hàng Tuần ' + wk.no + ' Tháng ' + mm + ' từ ' + pic,
          pic:     pic,
          result:  osResultText_(mine),
          start:   wk.from,
          planned: wk.to,
          status:  st.status,
          progress: st.pct,
          meta: { s:'order', src:srcKey, ym:ym, wk:wk.no, pic:pic,
                  n:mine.length, amt:Math.round(mine.reduce(function(a, b){ return a + osNum_(b.amount); }, 0)) }
        };
        o.hash = osHash_([o.subTask, o.pic, o.result, o.start, o.planned, o.status, o.progress].join('¦'));
        o.meta.h = o.hash;
        wanted[o.syncKey] = o;
      });
    });
  });
  return { wanted: wanted, titles: titles };
}

/* ══════════════ QUÉT SHEET BACKEND ══════════════ */
function osDataRow_(){ return (typeof WEEKLY_DATA_ROW !== 'undefined') ? WEEKLY_DATA_ROW : 4; }
function osWeeklySheet_(){
  if (typeof shWeekly !== 'function')
    throw new Error('Không tìm thấy hàm shWeekly() — hãy dán file này vào ĐÚNG project Apps Script của Report Hub.');
  var sh = shWeekly();
  if (!sh) throw new Error('Không mở được sheet WEEKLY của Report Hub');
  return sh;
}
function osPctCell_(p){
  try { if (typeof pctToCell === 'function') return pctToCell(p); } catch(e){}
  return (osNum_(p) || 0) / 100;
}
function osFirstEmptyRow_(sh){
  try { if (typeof firstEmptyContentRow === 'function') return firstEmptyContentRow(sh); } catch(e){}
  var dr = osDataRow_(), last = sh.getLastRow();
  if (last < dr) return dr;
  var v = sh.getRange(dr, 5, last - dr + 1, 3).getValues();
  for (var i = v.length - 1; i >= 0; i--)
    if (osS_(v[i][0]) || osS_(v[i][1]) || osS_(v[i][2])) return dr + i + 1;
  return dr;
}
/* Chỉ mục các dòng của MODULE NÀY (khoá bắt đầu bằng "O:") + vị trí key task */
function osScan_(sh){
  var dr = osDataRow_(), last = sh.getLastRow();
  var idx = { keyRow:{}, sub:{}, blockEnd:{} };
  if (last < dr) return idx;
  var n = last - dr + 1;
  var w = Math.min(OS_COL_META, sh.getMaxColumns()) - 1;        // B..V
  var v = sh.getRange(dr, 2, n, w).getValues();
  var iKey = OS_COL_KEY - 2, iMeta = OS_COL_META - 2;
  var curTitle = '';
  for (var i = 0; i < n; i++){
    var row = dr + i;
    var e = osS_(v[i][3]), f = osS_(v[i][4]), g = osS_(v[i][5]);
    var sk = osS_(v[i][iKey]);
    var hasContent = !!(e || f || g || sk);
    if (f){ curTitle = f; idx.keyRow[f] = row; idx.blockEnd[f] = row; }
    else if (curTitle && hasContent) idx.blockEnd[curTitle] = row;
    if (sk && sk.indexOf('O:') === 0){
      var h = '';
      try { h = (JSON.parse(osS_(v[i][iMeta]) || '{}') || {}).h || ''; } catch(er){}
      idx.sub[sk] = { row: row, title: curTitle, hash: h };
    }
  }
  return idx;
}

/* ══════════════ GHI XUỐNG SHEET ══════════════ */
function osSetValuesSafe_(rng, vals){
  try { rng.setValues(vals); return ''; }
  catch(e1){
    try { rng.clearDataValidations(); } catch(e2){}
    try { rng.setValues(vals); return ''; }
    catch(e3){ return String(e3 && e3.message || e3); }
  }
}
function osWriteRows_(sh, startRow, rows){
  var n = rows.length;
  if (!n) return { ok:true, failed:[], err:'' };
  var el = [], no = [], uv = [];
  rows.forEach(function(o){
    /* E..L : Type | Key Task | Sub Task | PIC | Result | Start | Planned | Revised */
    el.push([ o.type || '', o.keyTask || '', o.subTask || '', o.pic || '', o.result || '',
              osToDate_(o.start) || '', osToDate_(o.planned) || '', '' ]);
    no.push([ o.status || '', osPctCell_(o.progress || 0) ]);                 // N..O
    uv.push([ o.syncKey || '', o.meta ? JSON.stringify(o.meta) : '' ]);       // U..V
  });
  var e1 = osSetValuesSafe_(sh.getRange(startRow, 5,  n, 8), el);
  var e2 = osSetValuesSafe_(sh.getRange(startRow, 14, n, 2), no);
  var e3 = osSetValuesSafe_(sh.getRange(startRow, OS_COL_KEY, n, 2), uv);
  if (!e1 && !e2 && !e3) return { ok:true, failed:[], err:'' };

  var failed = [], firstErr = e1 || e2 || e3;
  for (var i = 0; i < n; i++){
    var r = startRow + i;
    var a = osSetValuesSafe_(sh.getRange(r, 5,  1, 8), [el[i]]);
    var b = osSetValuesSafe_(sh.getRange(r, 14, 1, 2), [no[i]]);
    var c = osSetValuesSafe_(sh.getRange(r, OS_COL_KEY, 1, 2), [uv[i]]);
    if (a || b || c){ failed.push(r); firstErr = firstErr || a || b || c; }
  }
  return { ok: failed.length === 0, failed: failed, err: firstErr };
}
function osFillFormulas_(sh, fromRow, startRow, count){
  if (typeof vsFillDownFormulas === 'function'){
    try { return vsFillDownFormulas(sh, fromRow, startRow, count); } catch(e){}
  }
  if (!count || count < 1) return;
  [2, 3, 4, 13, 16, 17].forEach(function(c){
    var src = 0, min = Math.max(osDataRow_(), fromRow - 400);
    for (var r = fromRow; r >= min && !src; r--){
      var f = '';
      try { f = sh.getRange(r, c).getFormula(); } catch(e){}
      if (f && !/ARRAYFORMULA/i.test(f)) src = r;
    }
    if (!src) return;
    try { sh.getRange(src, c).copyTo(sh.getRange(startRow, c, count, 1)); } catch(e){}
  });
}

/* ══════════════ ĐỒNG BỘ CHÍNH ══════════════ */
function osSync(opt){
  opt = opt || {};
  var T0 = Date.now();
  function timeUp(){ return (Date.now() - T0) > OS_TIME_BUDGET; }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok:false, error:'Đang có tiến trình đồng bộ khác, thử lại sau.' };
  try {
    var sh = osWeeklySheet_();
    if (sh.getMaxColumns() < OS_COL_META)
      sh.insertColumnsAfter(sh.getMaxColumns(), OS_COL_META - sh.getMaxColumns());

    var rep = { ok:true, keysCreated:0, inserted:0, updated:0, deleted:0, failed:0,
                partial:false, seconds:0, sources:[], skipped:[], errors:[] };
    var months = osMonthsOf_(opt);
    var wanted = {}, titles = {}, failedSrc = {};

    Object.keys(OS_SOURCES).forEach(function(k){
      var cfg = OS_SOURCES[k];
      if (!cfg.enabled) return;
      if (opt.only && opt.only !== k) return;
      var items;
      try { items = osReadOrders_(k); }
      catch(err){ failedSrc[k] = 1; rep.skipped.push(cfg.label + ': ' + (err.message || err)); return; }
      var b = osBuildWanted_(items, months, cfg, k);
      Object.keys(b.wanted).forEach(function(sk){ wanted[sk] = b.wanted[sk]; });
      Object.keys(b.titles).forEach(function(t){ titles[t] = b.titles[t]; });
      var inWin = items.filter(function(it){ return months.indexOf(it.ym) >= 0; }).length;
      rep.sources.push(cfg.label + ': ' + inWin + ' dòng đơn hàng trong kỳ ' + months.join('/'));
    });

    /* ① Tạo KEY TASK còn thiếu */
    var idx = osScan_(sh);
    Object.keys(titles).sort().forEach(function(title){
      if (idx.keyRow[title]) return;
      var cfg = titles[title];
      var row = osFirstEmptyRow_(sh);
      var rk = osWriteRows_(sh, row, [{
        syncKey:'OK:' + title, type:cfg.typeTask, keyTask:title, subTask:'',
        pic:'', result:'', start:'', planned:'', status:'To Do', progress:0,
        meta:{ s:'ORDERKEY', t:cfg.label }
      }]);
      if (!rk.ok){ rep.errors.push('Key "' + title + '": ' + rk.err); return; }
      if (row > osDataRow_()) osFillFormulas_(sh, row - 1, row, 1);
      rep.keysCreated++;
    });
    if (rep.keysCreated) SpreadsheetApp.flush();

    /* ② XOÁ dòng không còn cần (đổi tháng, PIC bị gỡ khỏi roster…) */
    idx = osScan_(sh);
    var dels = [];
    Object.keys(idx.sub).forEach(function(sk){
      var cur = idx.sub[sk], w = wanted[sk], srcKey = sk.split(':')[1];
      if (!OS_SOURCES[srcKey] || !OS_SOURCES[srcKey].enabled) return;
      if (opt.only && opt.only !== srcKey) return;
      if (failedSrc[srcKey]) return;                    /* đọc nguồn lỗi ≠ nguồn rỗng */
      var ymOk = months.some(function(m){
        return cur.title.indexOf(OS_KEY_PREFIX + m.slice(4, 6) + m.slice(0, 4)) === 0;
      });
      if (!ymOk) return;                                /* ngoài cửa sổ ⇒ để yên */
      if (!w || w.title !== cur.title) dels.push(cur.row);
    });
    dels.sort(function(a, b){ return b - a; });
    for (var di = 0; di < dels.length; ){
      var end = dels[di], cnt = 1;
      while (di + cnt < dels.length && dels[di + cnt] === end - cnt) cnt++;
      sh.deleteRows(end - cnt + 1, cnt);
      rep.deleted += cnt; di += cnt;
    }
    if (rep.deleted) SpreadsheetApp.flush();

    /* ③ CẬP NHẬT tại chỗ — gom các dòng liền nhau thành một lệnh ghi */
    idx = osScan_(sh);
    var todo = [];
    Object.keys(wanted).forEach(function(sk){
      var w = wanted[sk], cur = idx.sub[sk];
      if (!cur || cur.title !== w.title) return;
      if (cur.hash && cur.hash === w.hash) return;
      todo.push({ row: cur.row, obj: w });
    });
    todo.sort(function(a, b){ return a.row - b.row; });
    todo = todo.slice(0, OS_MAX_UPD);
    for (var u = 0; u < todo.length; ){
      if (timeUp()){ rep.partial = true; break; }
      var grp = [todo[u].obj], u2 = u + 1;
      while (u2 < todo.length && todo[u2].row === todo[u2 - 1].row + 1 && grp.length < OS_CHUNK){
        grp.push(todo[u2].obj); u2++;
      }
      var ru = osWriteRows_(sh, todo[u].row, grp);
      if (ru.ok) rep.updated += grp.length;
      else {
        rep.failed += ru.failed.length;
        rep.updated += grp.length - ru.failed.length;
        if (rep.errors.length < 5) rep.errors.push('Cập nhật dòng ' + todo[u].row + ': ' + ru.err);
      }
      u = u2;
    }

    /* ④ CHÈN dòng mới, xếp ngay dưới key task tương ứng */
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
        if (insOps >= OS_MAX_INS || rep.partial) return;
        var after = idx.blockEnd[t] || idx.keyRow[t] || 0;
        if (!after){ rep.errors.push('Không thấy Key Task "' + t + '" — bỏ qua lượt này'); return; }
        var list = newByTitle[t].slice(0, OS_MAX_INS - insOps);
        /* sắp theo tuần rồi tới tên sales cho dễ đọc */
        list.sort(function(a, b){
          var wa = (a.meta && a.meta.wk) || 0, wb = (b.meta && b.meta.wk) || 0;
          if (wa !== wb) return wa - wb;
          return String(a.pic).localeCompare(String(b.pic));
        });
        for (var b = 0; b < list.length; b += OS_CHUNK){
          if (timeUp()){ rep.partial = true; break; }
          var chunk = list.slice(b, b + OS_CHUNK);
          var maxRows = sh.getMaxRows();
          if (after + chunk.length > maxRows) sh.insertRowsAfter(maxRows, after + chunk.length - maxRows);
          sh.insertRowsAfter(after, chunk.length);

          var ri = osWriteRows_(sh, after + 1, chunk);
          osFillFormulas_(sh, after, after + 1, chunk.length);
          if (!ri.ok){
            ri.failed.slice().sort(function(x, y){ return y - x; })
              .forEach(function(r){ try { sh.deleteRow(r); } catch(e){} });
            rep.failed += ri.failed.length;
            if (rep.errors.length < 5) rep.errors.push('Chèn "' + t + '": ' + ri.err);
          }
          var okCnt = chunk.length - (ri.failed ? ri.failed.length : 0);
          rep.inserted += okCnt; insOps += chunk.length; after += okCnt;
          SpreadsheetApp.flush();
        }
      });

    SpreadsheetApp.flush();

    /* ⑤ Tổng hợp % cho từng key task */
    if (!rep.partial && (rep.inserted || rep.updated || rep.deleted || rep.keysCreated)){
      var fresh = osScan_(sh);
      Object.keys(titles).forEach(function(t){
        var kr = fresh.keyRow[t]; if (!kr) return;
        var kno = osS_(sh.getRange(kr, 2).getValue());
        if (kno && typeof syncKeyRollup === 'function'){ try { syncKeyRollup(sh, kno); } catch(e){} }
      });
      try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
      try { if (typeof _SH_CACHE !== 'undefined') _SH_CACHE = {}; } catch(e){}
    }

    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'Tư vấn bán hàng — key mới ' + rep.keysCreated + ' · thêm ' + rep.inserted +
                  ' · cập nhật ' + rep.updated + ' · xoá ' + rep.deleted +
                  (rep.failed ? (' · LỖI GHI ' + rep.failed) : '') +
                  ' · ' + rep.seconds + 's' +
                  (rep.partial ? ' · CHƯA XONG (hết thời gian) — lượt sau chạy tiếp' : '') +
                  (rep.skipped.length ? (' · BỎ QUA: ' + rep.skipped.join(' | ')) : '') +
                  (rep.errors.length ? (' · ' + rep.errors.join(' | ')) : '');
    return rep;
  } catch(err){
    return { ok:false, error: String(err && err.message || err) };
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}

/* ══════════════ API / TRIGGER / VẬN HÀNH ══════════════ */
/* Gọi từ web app:  ?action=syncOrders            → đồng bộ
                    ?action=syncOrders&mode=status → chỉ xem tình trạng, không ghi */
function osApiSync(user, p){
  p = p || {};
  if (String(p.mode || '') === 'status'){
    try { return osStatusReport(); }
    catch(e){ return { ok:false, error:String(e && e.message || e) }; }
  }
  var r = osSync({ only: p.only || '', months: p.months || null });
  try {
    if (r && r.ok && typeof logActivity === 'function')
      logActivity((user && user.pic) || 'System', 'update', r.message, '', '');
  } catch(e){}
  return r;
}
/* Chạy tay từ trình soạn Apps Script */
function osSyncNow(){ var r = osSync({}); Logger.log(JSON.stringify(r, null, 2)); return r; }
function osSyncTick(){ osSync({}); }
/* Tối đa 1 lần / 90 giây — dùng khi web app gọi liên tục */
function osSyncThrottled(){
  var c = CacheService.getScriptCache();
  if (c.get('os_last')) return null;
  c.put('os_last', '1', 90);
  return osSync({});
}
function installOrderTrigger(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'osSyncTick') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('osSyncTick').timeBased().everyMinutes(10).create();
  var msg = 'Đã tạo trigger osSyncTick — 10 phút/lần.\n\n' +
            'Từ giờ mỗi khi có đơn hàng mới ở tab "3. SALE ORDER" (nhập từ app hoặc gõ tay ' +
            'trên sheet), key task "Tư vấn bán hàng" của tháng đó sẽ tự cập nhật.';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){}
  return msg;
}
function uninstallOrderTrigger(){
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === 'osSyncTick'){ ScriptApp.deleteTrigger(t); n++; }
  });
  try { SpreadsheetApp.getUi().alert('Đã gỡ ' + n + ' trigger đồng bộ đơn hàng.'); } catch(e){}
  return n;
}

/* ══════════════ KIỂM TRA / CHẨN ĐOÁN ══════════════ */
function osDebug(){
  var out = { window: osMonthWindow_() };
  try {
    var cfg = OS_SOURCES.dental;
    var sh = osResolveSheet_(cfg);
    out.file   = sh.getParent().getName();
    out.tab    = sh.getName() + ' (gid ' + sh.getSheetId() + ')';
    out.header = sh.getRange(cfg.headerRow, 1, 1, Math.max(sh.getLastColumn(), 27)).getValues()[0];
    out.colMap = osColMap_(out.header);
    var items  = osReadOrders_('dental');
    out.rows   = items.length;
    out.months = {};
    out.pics   = {};
    items.forEach(function(it){
      out.months[it.ym] = (out.months[it.ym] || 0) + 1;
      out.pics[it.pic]  = (out.pics[it.pic] || 0) + 1;
    });
    out.sample = items.slice(0, 3);
    /* xem thử nội dung một dòng sub task sẽ trông thế nào */
    var ym = osMonthWindow_()[OS_BACK_MONTHS];
    var wk = osWeeksOfMonth_(ym)[0];
    if (wk){
      var mine = items.filter(function(it){
        return it.ym === ym && it.pic === cfg.pics[0] && it.day >= wk.from && it.day <= wk.to;
      });
      out.previewTitle  = OS_KEY_PREFIX + ym.slice(4, 6) + ym.slice(0, 4);
      out.previewSub    = 'Đơn hàng Tuần ' + wk.no + ' Tháng ' + ym.slice(4, 6) + ' từ ' + cfg.pics[0];
      out.previewResult = osResultText_(mine);
      out.previewWeeks  = osWeeksOfMonth_(ym).map(function(w){ return 'Tuần ' + w.no + ': ' + w.from + ' → ' + w.to; });
    }
  } catch(e){ out.error = String(e.message || e); }
  Logger.log(JSON.stringify(out, null, 2));
  return out;
}
/* Bảng tình trạng cho web app: tháng nào đã đủ dòng, tháng nào còn thiếu */
function osStatusReport(){
  var out = { ok:true, defaultMonths: osMonthWindow_(), rows:[], errors:[] };
  var sh = osWeeklySheet_();
  var idx = osScan_(sh), months = osMonthWindow_();

  Object.keys(OS_SOURCES).forEach(function(k){
    var cfg = OS_SOURCES[k];
    if (!cfg.enabled) return;
    var items;
    try { items = osReadOrders_(k); }
    catch(e){ out.errors.push(cfg.label + ': ' + String(e.message || e)); return; }
    var b = osBuildWanted_(items, months, cfg, k);
    var byTitle = {};
    Object.keys(b.wanted).forEach(function(sk){
      var w = b.wanted[sk];
      var t = byTitle[w.title] || (byTitle[w.title] = { title:w.title, want:0, synced:0, stale:0, missing:0 });
      t.want++;
      var cur = idx.sub[sk];
      if (!cur || cur.title !== w.title) t.missing++;
      else if (cur.hash && cur.hash === w.hash) t.synced++;
      else t.stale++;
    });
    Object.keys(byTitle).sort().forEach(function(t){
      var x = byTitle[t];
      out.rows.push({
        src:k, label:cfg.label, title:x.title,
        keyExists: !!idx.keyRow[x.title],
        want:x.want, synced:x.synced, stale:x.stale, missing:x.missing,
        done: (x.missing === 0 && x.stale === 0 && x.want > 0)
      });
    });
  });
  out.rows.sort(function(a, b){ return a.title < b.title ? 1 : -1; });
  return out;
}
/* Gỡ sạch mọi dòng do module này sinh ra — dùng khi muốn dựng lại từ đầu */
function osResetAll(){
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch(e){}
  var sh = osWeeklySheet_(), dr = osDataRow_(), last = sh.getLastRow();
  if (last < dr) return 'Sheet chưa có dữ liệu.';
  var keys = sh.getRange(dr, OS_COL_KEY, last - dr + 1, 1).getValues();
  var kill = [];
  for (var i = 0; i < keys.length; i++){
    var k = osS_(keys[i][0]);
    if (k.indexOf('O:') === 0 || k.indexOf('OK:') === 0) kill.push(dr + i);
  }
  if (!kill.length){
    var m0 = 'Không có dòng nào của module Tư vấn bán hàng.';
    if (ui) ui.alert(m0);
    return m0;
  }
  if (ui && ui.alert('Xoá ' + kill.length + ' dòng "Tư vấn bán hàng" rồi dựng lại từ đầu?',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return 'Đã huỷ.';
  kill.sort(function(a, b){ return b - a; });
  for (var j = 0; j < kill.length; ){
    var end = kill[j], cnt = 1;
    while (j + cnt < kill.length && kill[j + cnt] === end - cnt) cnt++;
    sh.deleteRows(end - cnt + 1, cnt);
    j += cnt;
  }
  SpreadsheetApp.flush();
  var msg = 'Đã xoá ' + kill.length + ' dòng. Chạy osSyncNow() để dựng lại.';
  if (ui) ui.alert(msg);
  return msg;
}