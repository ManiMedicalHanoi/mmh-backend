/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH · FOLLOW UP BY ACCOUNT (v1.0, 09/11/2026 — người dùng yêu cầu) — sheet "Follow up by Account" trong file CRM Surgical VN
   Dự báo doanh số FY của các NPP theo từng bệnh viện × mã sản phẩm, gộp mọi NPP (Hùng Vĩ · I-Care) + kênh tư nhân.

   LUỒNG TỰ ĐỘNG (trigger faSyncTrig mỗi giờ + chạy ngay khi sheet còn trống):
     1. Đọc thẳng (SpreadsheetApp, KHÔNG UrlFetch ⇒ không thêm quyền) 3 nguồn: file thầu Hùng Vĩ ("Tender FY66"), I-Care ("Tender FY65-67"),
        file KQTT dao toàn quốc ("Data xử lý") ⇒ gói thầu chuẩn hoá (MMH_FcCore.gs ▸ fcBuild_).
     2. Mỗi mã của 1 gói = 1 dòng: ① Existing · ② Duy trì · ③ Mở mới · Đang dự thầu (gói NPP chưa có kết quả). Giai đoạn tự điền:
        gói NPP trúng ⇒ "Đã trúng thầu", trượt ⇒ "Trượt thầu", chưa có kết quả ⇒ "Đang dự thầu".
     3. Gộp với dữ liệu đang có trên sheet theo "ID dòng": giữ mọi cột Sales đã điền (giai đoạn, tiến độ, cấu hình, hãng đề xuất, tiêu chí,
        cơ hội, ghi chú, ngày dự kiến) và SL / tháng bắt đầu / hiệu lực của dòng ② ③ (dòng ① luôn theo hợp đồng). Dòng tự động không còn trong
        dữ liệu: xoá nếu chưa ai sửa, còn lại giữ và KHÔNG tính vào dự báo ("Gói đã thay").
     4. Dòng Sales (kênh tư nhân + gói đang theo dõi): từ Tender Map (fuFcSave) hoặc từ "Theo dõi thầu" (fuSave ⇒ fcFromCase_). Dòng Sales có SL + tháng
        bắt đầu cùng bệnh viện + loại SP thay cho dòng ② ③ tự động (không cộng trùng).
     5. Doanh số: SL ÷ hiệu lực (tháng) × giá MANI → NPP theo mã (MMH_Prices.gs) × số tháng nằm trong FY; 12 cột SL theo tháng của FY.
   Nhật ký sửa: sheet ẩn "Follow up by Account · Lịch sử sửa". Sheet theo dõi gói cũ (FOLLOW UP TENDER) đổi tên "Follow up by Account · Nhật ký".

     GET  action=fuFcList  tk                 → { ok, v, fy, cols, rows, prices, stages, lists, sync }
     POST action=fuFcSave  tk rid id? hosp prov fid kenh code qty dur start stage prog cfg brand crit chance note due
     POST action=fuFcDel   tk rid id          (chỉ dòng Sales)
     GET  action=fuFcSync  key=<8 ký tự cuối ID Sheet> | phiên Admin [dry=1] → chạy đồng bộ ngay
     GET  action=fuFcDiag  key=…              → trạng thái, số dòng theo nhóm, tổng doanh số, lỗi nguồn
   ════════════════════════════════════════════════════════════════════════════════════════ */
var FA = {
  VER: '1.0', TAB: 'Follow up by Account', HIST: 'Follow up by Account · Lịch sử sửa', TRIG_V: 'fa1',
  SRC: {
    HV: { id:'1N42yeU1hSOMZT9BgVPZ8x625BGaNI705u5REkc1Uzx8', sheet:'Tender FY66', hdr:7, start:8, npp:'Hùng Vĩ', region:'North' },
    IC: { id:'1VfJVBJ4XTTOnjF2z3ZyZAq9PTIeIvB8Nf5a8fikT9Zs', sheet:'Tender FY65-67', hdr:9, start:10, npp:'I-Care', region:'South' },
    KQ: { id:'1lI1s1nEyRtSluQiCJu2sdkgZdP38A35qYFdzOvVXE7I', gid:1603394577, sheet:'Data xử lý', hdr:2 }
  },
  KEYS: ['id', 'caseId', 'kenh', 'grp', 'pic', 'npp', 'hosp', 'prov', 'tbmt', 'now', 'kindName', 'type', 'code', 'qty', 'dur', 'start', 'end',
         'per', 'price', 'valMonth', 'n', 'qtyFy', 'valFy', 'inFc', 'stage', 'prog', 'cfg', 'brand', 'crit', 'chance', 'note', 'due', 'others',
         'src', 'man', 'at', 'by', 'fid'],
  HDR: ['ID dòng', 'Mã theo dõi (gói)', 'Kênh', 'Nhóm', 'PIC', 'NPP', 'Bệnh viện / cơ sở', 'Tỉnh / thành', 'Số TBMT (gói gần nhất)', 'Tình hình hiện tại',
        'Loại sản phẩm', 'Nhóm SP', 'Mã SP', 'SL (cả gói)', 'Hiệu lực gói (tháng)', 'Bắt đầu (tháng)', 'Hết hiệu lực (tháng)',
        'SL / tháng', 'Đơn giá NPP (VND / cái)', 'Doanh số / tháng (VND)', 'Số tháng trong FY', 'SL trong FY', 'Doanh số FY (VND)', 'Tính vào dự báo',
        'Giai đoạn bán hàng', 'Tiến độ (phía BV)', 'Cấu hình', 'Hãng đề xuất', 'Tiêu chí ưu tiên', 'Cơ hội', 'Ghi chú', 'Ngày dự kiến (mốc tiếp)', 'SL hãng khác (tham chiếu)',
        'Nguồn', 'Sales đã sửa', 'Cập nhật lúc', 'Người cập nhật', 'Mã cơ sở (Tender Map)'],
  /* cột Sales điền — đồng bộ không bao giờ ghi đè */
  SALES: ['stage', 'prog', 'cfg', 'brand', 'crit', 'chance', 'note', 'due', 'fid'],
  /* dòng ② ③ / Sales: SL, mốc, hiệu lực do Sales quyết (chỉ điền lần đầu) */
  PLAN: ['code', 'qty', 'dur', 'start'],
  GRP_BG: { '①':'#E3F1E6', '②':'#E1ECFA', '③':'#FDEBD8', 'T':'#EEE7F7', 'Đ':'#FFF6D6' },
  BRANDS: ['All', 'Mani', 'Feather', 'Alcon', 'Aurolab', 'KAI', 'Surgistar', 'IKIT S.r.l', 'Iscon Surgicals', 'Microtrack Surgicals', 'Madhu', 'Heil Pharma', 'Surgi Edge', 'Surgical Specialties', 'Khác']
};
function faIx_(k){ if(!FA._ix){ FA._ix = {}; FA.KEYS.forEach(function(x, i){ FA._ix[x] = i; }); } return FA._ix[k]; }
function faFy_(){
  var d = new Date(), y = +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy'), m = +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'M');
  var fy = (m >= 9 ? y + 1 : y) - 1959; FC.FY = fy; FC.FY0 = fcMi_(fy + 1958, 9); FC.FY1 = FC.FY0 + 11;
  return { fy:fy, m0:FC.FY0, from:fcMs_(FC.FY0), to:fcMs_(FC.FY1) };
}
function faMonthsHdr_(){ var o = []; for(var i = FC.FY0; i <= FC.FY1; i++) o.push('T' + fcMs_(i)); return o; }

/* ══════════ NGUỒN ══════════ */
function faNorm_(h){ return String(h == null ? '' : h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[\r\n]+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim(); }
function faStr_(v){ if(v == null) return ''; if(Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); return String(v).replace(/\s+/g, ' ').trim(); }
function faNumV_(v){
  if(typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v == null ? '' : v).replace(/[^\d.,-]/g, ''); if(!s) return 0;
  if(/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, ''); else s = s.replace(/,/g, '');
  var n = parseFloat(s); return isFinite(n) ? n : 0;
}
function faDur_(v){ var n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/[^\d.]/g, '')); return (!isFinite(n) || n < 1 || n > 60) ? 0 : Math.round(n); }
function faRes_(r){ var s = faNorm_(r); if(!s) return ''; if(/^win|trung|thang/.test(s)) return 'Win'; if(/^fail|truot|lose|loss/.test(s)) return 'Fail'; if(/^cancel|huy/.test(s)) return 'Cancel'; if(/^pend|cho|dang/.test(s)) return 'Pending'; return ''; }
function faDateMi_(v, ref){
  if(v == null || v === '') return 0;
  var y, mo, d;
  if(Object.prototype.toString.call(v) === '[object Date]'){ if(isNaN(v)) return 0; y = v.getFullYear(); mo = v.getMonth() + 1; d = v.getDate(); }
  else {
    var s = String(v).replace(/\.0+$/, '').trim(), m;
    if((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))){ y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/.exec(s))){ y = +m[3]; mo = +m[2]; d = +m[1]; }
    else if((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))){ y = +m[1]; mo = +m[2]; d = +m[3]; }
    else return fcMonth_(s);
  }
  if(ref && fcMi_(y, mo) !== ref && d <= 12 && fcMi_(y, d) === ref){ var t = mo; mo = d; d = t; }     /* ngày ↔ tháng bị đảo */
  return (y > 2000 && y < 2100 && mo >= 1 && mo <= 12) ? fcMi_(y, mo) : 0;
}
/* file thầu NPP ⇒ gói (tách theo kết quả của từng dòng: Win / Fail / Pending) — cột dò theo tên tiêu đề như MMH_WinMap.gs */
function faReadNpp_(key){
  var c = FA.SRC[key], sh = SpreadsheetApp.openById(c.id).getSheetByName(c.sheet);
  if(!sh) throw new Error('Không thấy sheet "' + c.sheet + '" (' + c.npp + ')');
  var last = sh.getLastRow(), lc = sh.getLastColumn(); if(last < c.start) return [];
  var H = sh.getRange(c.hdr, 1, 1, lc).getValues()[0].map(faNorm_);
  var find = function(names, nth){ nth = nth || 1; var seen = 0; for(var i = 0; i < H.length; i++) for(var j = 0; j < names.length; j++) if(H[i] && H[i].indexOf(names[j]) === 0){ if(++seen === nth) return i; break; } return -1; };
  var C = { tbmt:find(['so thong bao moi thau', 'tbmt']), hosp:find(['hospital name', 'ten benh vien', 'chu dau tu']), city:find(['city', 'tinh', 'province']),
    addr:find(['address', 'dia chi']), month:find(['month', 'thang']), signed:find(['singed date', 'signed date']), pcode:find(['product code']),
    qty:find(['quantity', 'so luong']), res:find(['result of tender']), wonQty:find(['quantity', 'so luong'], 2), approve:find(['ngay phe duyet']), dur:find(['thoi gian thuc hien']) };
  C.won = -1; for(var w = 0; w < H.length; w++) if(H[w] === 'product'){ C.won = w; break; }
  if(C.hosp < 0 || C.pcode < 0) throw new Error(c.npp + ': thiếu cột Hospital name / Product code ở dòng ' + c.hdr);
  var V = sh.getRange(c.start, 1, last - c.start + 1, lc).getValues(), P = {}, out = [], prev = null;
  var PK = ['tbmt', 'hosp', 'city', 'addr', 'month', 'signed', 'approve', 'dur'];
  V.forEach(function(r){
    var g = function(k){ return C[k] < 0 ? '' : r[C[k]]; };
    var pc = faStr_(g('pcode')), hs = faStr_(g('hosp')), res = faRes_(g('res'));
    if(!pc && !hs) return;
    var o = {}; PK.forEach(function(k){ o[k] = g(k); });
    if(!hs && pc && prev) PK.forEach(function(k){ if(o[k] === '' || o[k] == null) o[k] = prev[k]; });
    prev = o;
    var mon = fcMonth_(o.month) || 0, st = faDateMi_(o.approve, mon) || mon || faDateMi_(o.signed);
    var tb = faStr_(o.tbmt).replace(/\s+/g, ''), won = res === 'Win';
    var qty = won ? (faNumV_(g('wonQty')) || faNumV_(g('qty'))) : faNumV_(g('qty'));
    var code = won && faStr_(g('won')) && FC_CODE_RE.test(faStr_(g('won'))) ? faStr_(g('won')) : pc; FC_CODE_RE.lastIndex = 0;
    var pkey = (tb || faStr_(o.hosp) + '|' + st) + '|' + (res || 'Pending');
    var p = P[pkey];
    if(!p){ p = P[pkey] = { src:key, npp:c.npp, region:c.region, tbmt:tb, hosp:faStr_(o.hosp), prov:faStr_(o.city), addr:faStr_(o.addr), start:st, dur:faDur_(o.dur) || 12, res:res || 'Pending', items:[] }; out.push(p); }
    fcSplit_(code, qty).forEach(function(it){ var t = fcType_(it.code); p.items.push({ code:it.code, type:t, qty:it.qty, mani:true, brand:'Mani' }); });
  });
  /* dòng không ghi kết quả: chỉ coi là "Đang dự thầu" khi còn mới (≤ 9 tháng, hoặc chưa có ngày); cũ hơn ⇒ bỏ */
  var now = fcMonth_(Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM'));
  return out.filter(function(p){ return p.items.length && p.res !== 'Cancel' && !(p.res === 'Pending' && p.start && p.start < now - 9); });
}
/* file KQTT toàn quốc ⇒ gói (mọi hãng) */
function faReadKq_(){
  var c = FA.SRC.KQ, book = SpreadsheetApp.openById(c.id), sh = null;
  book.getSheets().forEach(function(s){ if(s.getSheetId() === c.gid) sh = s; });
  sh = sh || book.getSheetByName(c.sheet);
  if(!sh) throw new Error('Không thấy sheet KQTT "' + c.sheet + '"');
  var last = sh.getLastRow(), lc = sh.getLastColumn(); if(last <= c.hdr) return [];
  var H = sh.getRange(c.hdr, 1, 1, lc).getValues()[0].map(faNorm_);
  var find = function(names, exact){ for(var j = 0; j < names.length; j++) for(var i = 0; i < H.length; i++) if(H[i] && (exact ? H[i] === names[j] : H[i].indexOf(names[j]) === 0)) return i; return -1; };
  var C = { tbmt:find(['kqtt code', 'ma kqtt', 'so tbmt', 'tbmt']), buyer:find(['buyer', 'chu dau tu', 'hospital name']), pcode:find(['product code', 'ma san pham', 'ky ma hieu']),
    mfr:find(['manufacturer', 'hang san xuat'], true), mfrNorm:find(['manufacturer_norm']), brand:find(['brand label', 'nhan hieu']), qty:find(['quantity', 'so luong']),
    dec:find(['decision issue date', 'ngay quyet dinh', 'ngay ra quyet dinh']), pub:find(['award publication date', 'ngay dang tai']), loc:find(['location', 'dia chi', 'dia diem']),
    month:find(['month', 'thang'], true), region:find(['region'], true), prov:find(['province_clean', 'tinh']), ktype:find(['knife type', 'product type', 'loai san pham']),
    dur:find(['contract duration', 'thoi han hop dong', 'thoi gian thuc hien']), exp:find(['expiration date', 'ngay het han']) };
  if(C.tbmt < 0 || C.buyer < 0) throw new Error('KQTT: thiếu cột KQTT Code / Buyer ở dòng ' + c.hdr);
  var V = sh.getRange(c.hdr + 1, 1, last - c.hdr, lc).getValues(), P = {}, out = [];
  V.forEach(function(r){
    var g = function(k){ return C[k] < 0 ? '' : r[C[k]]; };
    var tb = faStr_(g('tbmt')).replace(/\s+/g, ''), buyer = faStr_(g('buyer')); if(!tb && !buyer) return;
    var mon = fcMonth_(g('month')), st = mon || faDateMi_(g('dec')) || faDateMi_(g('pub'));
    var dur = faDur_(g('dur')), ex = faDateMi_(g('exp'));
    if(!dur && ex && st && ex >= st) dur = ex - st + 1;
    var brand = faStr_(g('mfrNorm')) || faStr_(g('mfr')) || faStr_(g('brand')), mani = /mani/i.test(brand + ' ' + faStr_(g('brand')));
    var pc = faStr_(g('pcode')), t = fcType_(mani ? pc : '', faStr_(g('ktype')));
    if(t === 'KHAC') t = fcType_('', faStr_(g('ktype')) + ' ' + pc);
    var key = (tb || buyer + '|' + st) + '|' + buyer, p = P[key];
    if(!p){ p = P[key] = { src:'KQ', npp:'', region:faStr_(g('region')), tbmt:tb, hosp:buyer, prov:faStr_(g('prov')), addr:faStr_(g('loc')), start:st, dur:dur || 12, res:'Win', items:[] }; out.push(p); }
    var code = mani ? ((fcSplit_(pc, 0)[0] || {}).code || FC.REP[t] || t) : (FC.REP[t] || t);
    p.items.push({ code:code, type:t, qty:faNumV_(g('qty')), mani:mani, brand:mani ? 'Mani' : (brand || 'Hãng khác') });
  });
  return out;
}

/* ══════════ SHEET ══════════ */
function faSheet_(){
  var book = ss(), sh = book.getSheetByName(FA.TAB), hdr = FA.HDR.concat(faMonthsHdr_());
  if(!sh){
    sh = book.insertSheet(FA.TAB, 0);
    sh.getRange(1, 1, 1, hdr.length).setValues([hdr]);
    faStyle_(sh, hdr.length);
  } else {
    var h = sh.getRange(1, 1, 1, hdr.length).getValues()[0];
    if(h.some(function(x, i){ return String(x) !== hdr[i]; })) sh.getRange(1, 1, 1, hdr.length).setValues([hdr]);
  }
  return sh;
}
function faStyle_(sh, n){
  sh.setFrozenRows(1); sh.setFrozenColumns(0);
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047').setWrap(true).setVerticalAlignment('middle');
  sh.getRange(1, faIx_('stage') + 1, 1, 8).setBackground('#FCE5CD');            /* cột Sales điền */
  sh.setRowHeight(1, 42);
  [[1, 140], [7, 260], [10, 260], [13, 110], [25, 170], [31, 300]].forEach(function(w){ try{ sh.setColumnWidth(w[0], w[1]); }catch(e){} });
  try{ sh.hideColumns(1, 2); }catch(e){}
}
function faRead_(sh){
  var last = sh.getLastRow(), out = []; if(last < 2) return out;
  var V = sh.getRange(2, 1, last - 1, FA.KEYS.length).getValues();
  V.forEach(function(r){
    if(!faStr_(r[0])) return;
    var o = {}; FA.KEYS.forEach(function(k, i){ o[k] = r[i]; });
    o.start = fcMonth_(o.start); o.end = fcMonth_(o.end); o.due = o.due instanceof Date ? faStr_(o.due) : faStr_(o.due);
    ['id', 'caseId', 'kenh', 'grp', 'pic', 'npp', 'hosp', 'prov', 'tbmt', 'now', 'kindName', 'type', 'code', 'stage', 'prog', 'cfg', 'brand', 'crit', 'chance', 'note', 'src', 'man', 'by', 'fid'].forEach(function(k){ o[k] = faStr_(o[k]).replace(/^'/, ''); });
    o.qty = faNumV_(o.qty); o.dur = faNumV_(o.dur); o.others = faNumV_(o.others);
    var m = /^Không — ((Gói đã thay|Thay bằng).*)$/.exec(faStr_(o.inFc)); if(m) o.stale = m[1];
    out.push(o);
  });
  return out;
}
/* tính các cột suy ra của 1 dòng */
function faDerive_(o){
  var t = o.type || fcType_(o.code), pr = faPriceOf_(o.code, t);
  o.type = t; o.kindName = FC_KIND_NAME[fcKind_(t)] || 'Dao';
  o.man = faStr_(o.man);
  if(!o.pic || o.man.indexOf('pic') < 0) o.pic = fuTerrOf_(o.prov, o.hosp, '') || o.pic || '';
  var c = fcCalc_(o, pr.per);
  o.end = c.end; o.per = Math.round(c.per * 100) / 100; o.price = pr.per; o.valMonth = Math.round(c.valMonth); o.n = c.n; o.qtyFy = Math.round(c.qtyFy);
  o.valFy = Math.round(c.valFy); o.months = c.months.map(function(x){ return Math.round(x * 10) / 10; });
  o.priceEst = pr.est;
  var why = fcIn_(o); o.inFc = why ? 'Không — ' + why : (pr.per ? 'Có' : 'Có (chưa có giá mã ' + o.code + ')');
  return o;
}
function faRowOut_(o){
  return FA.KEYS.map(function(k){
    var v = o[k];
    if(k === 'start' || k === 'end') return v ? fcMs_(v) : '';
    if(k === 'code' || k === 'tbmt') return v ? "'" + v : '';
    if(v == null) return '';
    return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
  }).concat(o.months || []);
}
function faWrite_(sh, rows){
  var hdr = FA.HDR.concat(faMonthsHdr_()), W = hdr.length;
  var last = sh.getLastRow(); if(last >= 2) sh.getRange(2, 1, last - 1, Math.max(W, sh.getLastColumn())).clearContent().setBackground(null);
  if(!rows.length) return;
  var V = rows.map(faRowOut_);
  sh.getRange(2, 1, V.length, W).setValues(V);
  var nf = function(k, f){ sh.getRange(2, faIx_(k) + 1, V.length, 1).setNumberFormat(f); };
  ['qty', 'others', 'qtyFy'].forEach(function(k){ nf(k, '#,##0'); }); ['price', 'valMonth', 'valFy'].forEach(function(k){ nf(k, '#,##0'); }); nf('per', '#,##0.0');
  sh.getRange(2, FA.KEYS.length + 1, V.length, 12).setNumberFormat('#,##0.0');
  sh.getRange(2, faIx_('grp') + 1, V.length, 1).setBackgrounds(rows.map(function(o){ return [FA.GRP_BG[o.kenh === 'Tư nhân' ? 'T' : o.stage === 'Đang dự thầu' ? 'Đ' : String(o.grp).charAt(0)] || null]; }));
  sh.getRange(2, faIx_('inFc') + 1, V.length, 1).setFontColor(null);
  /* danh sách thả xuống cho cột Sales điền (Giai đoạn · Tiến độ · Cấu hình · Hãng đề xuất · Tiêu chí · Cơ hội) */
  var dv = function(k, list, strict){ sh.getRange(2, faIx_(k) + 1, Math.max(V.length, 1) + 200, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(!strict).build()); };
  dv('stage', FC.STAGES.concat(['Giới thiệu', 'Demo', 'Đề xuất từ chuyên môn', 'Ký hợp đồng mua sắm', 'Sử dụng hàng', 'Không thành công', 'Dừng theo dõi']), true);
  dv('prog', FC.PROGRESS, true); dv('cfg', FC.CONFIG, true); dv('crit', FC.CRIT, true); dv('chance', FC.CHANCE, true); dv('brand', FA.BRANDS, false);
  dv('kenh', ['Thầu', 'Tư nhân'], true);
  try{ var f = sh.getFilter(); if(f) f.remove(); sh.getRange(1, 1, V.length + 1, W).createFilter(); }catch(e){}
}
function faHist_(by, id, field, oldV, newV){
  try{
    var book = ss(), sh = book.getSheetByName(FA.HIST);
    if(!sh){ sh = book.insertSheet(FA.HIST); sh.getRange(1, 1, 1, 6).setValues([['Lúc', 'Người sửa', 'ID dòng', 'Cột', 'Cũ', 'Mới']]).setFontWeight('bold'); sh.setFrozenRows(1); }
    try{ if(!sh.isSheetHidden()) sh.hideSheet(); }catch(e){}
    sh.appendRow([new Date(), by, id, field, String(oldV == null ? '' : oldV).slice(0, 300), String(newV == null ? '' : newV).slice(0, 300)]);
  }catch(e){}
}

/* ══════════ ĐỒNG BỘ ══════════ */
var FA_STAGE_OLD = { 'Giới thiệu sản phẩm':'Đã giới thiệu tới chuyên môn', 'Lên danh mục':'Đang xây cấu hình', 'Chốt cấu hình':'Đang xây cấu hình', 'Ra báo giá':'Đã gửi báo giá',
  'Ra HSMT':'Đang dự thầu', 'Đang chấm thầu':'Đang dự thầu', 'Đã trượt thầu':'Trượt thầu', 'Huỷ / dừng theo dõi':'Tạm dừng theo dõi' };
var FA_PROG_OLD = { 'Lên danh mục':'Xây dựng danh mục', 'Ra HSMT':'Đã ra HSMT', 'Đang chấm thầu':'Đang chấm thầu', 'Ra báo giá':'Yêu cầu báo giá' };
function faAuto_(id){ return /^[EDMB]\|/.test(id); }
function faHk_(o){ return fcHk_(o.hosp, fcProv_(o.prov)); }
/* gói đang theo dõi (Theo dõi thầu, MMH_TenderFU.gs) ⇒ dòng Sales "S|<mã theo dõi>|<mã SP>" */
function faFromCases_(){
  var out = [];
  try{
    fuCases_().forEach(function(c){
      if(/^TEST/i.test(c.pic)) return;
      var items = []; try{ items = JSON.parse(c.itemsJson || '[]'); }catch(e){ items = []; }
      if(!items.length) return;
      var priv = c.stage >= 11, st = FU.STAGES[c.stage] || '';
      st = FA_STAGE_OLD[c.stageNameRaw] || FA_STAGE_OLD[st] || st;
      items.forEach(function(it, j){
        if(!it || !it.code) return;
        out.push({ id:'S|' + c.id + '|' + String(it.code).toUpperCase() + (j ? '#' + j : ''), caseId:c.id, kenh:priv ? 'Tư nhân' : 'Thầu', grp:priv ? FC.GRP.P : '', npp:'',
          hosp:c.hosp, prov:c.prov, tbmt:c.tbmt || '', now:c.pkg || '', type:fcType_(it.code), code:String(it.code).toUpperCase(), qty:fuNum_(it.qty), dur:+c.dur || 12,
          start:fcMonth_(c.start) || 0, others:0, src:'Theo dõi thầu', stage:st, prog:FA_PROG_OLD[c.stageNameRaw] || '', note:c.note || '', due:c.due || '', fid:c.fid || '',
          man:'', at:c.at, by:c.pic });
      });
    });
  }catch(e){ Logger.log('faFromCases_: ' + e.message); }
  return out;
}
/* dòng Sales kênh thầu chưa có nhóm (gói từ "Theo dõi thầu") ⇒ ② nếu bệnh viện đang có hợp đồng / gói MANI, còn lại ③ */
function faGrpFill_(rows){
  var mani = {}; rows.forEach(function(r){ if(r.grp === FC.GRP.E || r.grp === FC.GRP.D) mani[faHk_(r)] = 1; });
  rows.forEach(function(r){ if(!r.grp) r.grp = r.kenh === 'Tư nhân' ? FC.GRP.P : (mani[faHk_(r)] ? FC.GRP.D : FC.GRP.M); });
}
/* lưu 1 gói ở "Theo dõi thầu" ⇒ cập nhật ngay các dòng S|<mã theo dõi>|… (không chờ lượt đồng bộ) */
function faCaseUpsert_(caseId){
  faFy_();
  var mine = faFromCases_().filter(function(c){ return c.caseId === caseId; });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = faSheet_(), rows = faRead_(sh), want = {}; mine.forEach(function(c){ want[c.id] = c; });
    for(var i = rows.length - 1; i >= 0; i--){                                 /* bỏ mã không còn trong gói */
      if(rows[i].id.indexOf('S|' + caseId + '|') === 0 && !want[rows[i].id]) sh.deleteRow(i + 2);
    }
    rows = faRead_(sh);
    faGrpFill_(rows.concat(mine));
    mine.forEach(function(c){
      var idx = -1; for(var j = 0; j < rows.length; j++) if(rows[j].id === c.id){ idx = j; break; }
      if(idx >= 0){ var o = rows[idx]; ['stage', 'note', 'due', 'qty', 'code', 'start', 'dur', 'prog'].forEach(function(k){ if(c[k] !== '' && c[k] != null && c[k] !== 0) o[k] = c[k]; }); o.at = c.at; o.by = c.by; c = o; }
      faDerive_(c);
      var row = faRowOut_(c);
      if(idx >= 0) sh.getRange(idx + 2, 1, 1, row.length).setValues([row]); else sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    });
    return mine.length;
  } finally { lock.releaseLock(); }
}
/* ⇒ { ok, n, by, val, err } — dry: không ghi */
function faSync_(opt){
  opt = opt || {};
  faFy_();
  var t0 = Date.now(), st = { at:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'), src:{}, err:'' }, pkgs = [];
  ['HV', 'IC'].forEach(function(k){ try{ var a = faReadNpp_(k); st.src[k] = a.length; pkgs = pkgs.concat(a); }catch(e){ st.err += FA.SRC[k].npp + ': ' + e.message + ' · '; } });
  try{ var kq = faReadKq_(); st.src.KQ = kq.length; pkgs = pkgs.concat(kq); }catch(e){ st.err += 'KQTT: ' + e.message + ' · '; }
  if(st.err){ faStatus_(st); return { ok:false, error:st.err, src:st.src }; }          /* nguồn lỗi ⇒ giữ nguyên sheet */
  var auto = fcBuild_(pkgs);
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try{
    if(!opt.dry && typeof faNewsTrack_ === 'function'){ try{ st.news = faNewsTrack_(pkgs); }catch(e){ st.newsErr = String(e && e.message || e).slice(0, 200); } }   /* MMH_FcNews.gs — sổ gói mới + báo gói theo dõi có kết quả */
    var sh = faSheet_(), old = faRead_(sh), byId = {}; old.forEach(function(o){ byId[o.id] = o; });
    var first = !old.length, out = [], seen = {};
    auto.forEach(function(a){
      if(seen[a.id]) return; seen[a.id] = 1;
      var o = byId[a.id], r = {};
      FA.KEYS.forEach(function(k){ r[k] = a[k] != null ? a[k] : ''; });
      r.man = ''; r.at = ''; r.by = ''; r.prog = ''; r.cfg = ''; r.brand = ''; r.crit = ''; r.chance = ''; r.note = ''; r.due = ''; r.fid = '';
      if(o){
        FA.SALES.forEach(function(k){ if(k !== 'stage') r[k] = o[k]; });
        r.man = o.man; r.at = o.at; r.by = o.by;
        if(/file FY68/.test(o.src) && !/file FY68/.test(r.src)) r.src = (r.src ? r.src + ' · ' : '') + 'file FY68';
        if(a.grp !== FC.GRP.E){ FA.PLAN.forEach(function(k){ if(o.man.indexOf(k) >= 0 || o[k] || k === 'qty') r[k] = (k === 'start' && !o[k] && a[k] && o.man.indexOf('start') < 0) ? a[k] : o[k]; }); }
        /* giai đoạn: dòng ① luôn "Đã trúng thầu" (theo kết quả); dòng khác giữ của Sales, trống ⇒ theo nguồn */
        r.stage = a.grp === FC.GRP.E ? a.stage : (o.stage || a.stage);
        if(o.man.indexOf('pic') >= 0) r.pic = o.pic;
      }
      out.push(r);
    });
    /* dòng Sales (S| …): đang có trên sheet + gói theo dõi mới / mới cập nhật */
    var sales = {};
    old.forEach(function(o){ if(!faAuto_(o.id)) sales[o.id] = o; });
    faFromCases_().forEach(function(c){
      var o = sales[c.id];
      if(!o){ sales[c.id] = c; return; }
      if(String(c.at) > String(o.at)){ ['stage', 'note', 'due', 'qty', 'code'].forEach(function(k){ if(c[k] !== '' && c[k] != null) o[k] = c[k]; }); o.at = c.at; o.by = c.by; }
    });
    var cover = {};                                     /* bệnh viện + loại SP có dòng Sales đủ SL + tháng ⇒ thay dòng ② ③ tự động */
    Object.keys(sales).forEach(function(id){ var o = sales[id]; if(o.kenh !== 'Tư nhân' && fuNum_(o.qty) > 0 && +o.start > 0 && !FC.OUT_STAGES[o.stage]) cover[faHk_(o) + '|' + (o.type || fcType_(o.code))] = 1; });
    out.forEach(function(r){ if((r.grp === FC.GRP.D || r.grp === FC.GRP.M) && cover[faHk_(r) + '|' + r.type]) r.stale = 'Thay bằng gói Sales đang theo dõi'; });
    /* dòng tự động cũ không còn trong dữ liệu: giữ nếu Sales đã sửa / ghi chú, còn lại bỏ */
    old.forEach(function(o){
      if(!faAuto_(o.id) || seen[o.id]) return;
      if(o.man || o.note || o.prog || o.cfg || o.chance || (o.stage && o.stage !== 'Đã trúng thầu' && o.stage !== 'Đang dự thầu')){ o.stale = 'Gói đã thay (dữ liệu thầu mới)'; out.push(o); }
    });
    Object.keys(sales).forEach(function(id){ out.push(sales[id]); });
    faGrpFill_(out);
    /* hạt giống: thông tin Sales trong 2 file mẫu FY68 (Hùng Vĩ) — chỉ 1 lần, chỉ điền ô trống */
    if(typeof faSeed_ === 'function') faSeed_(out);
    out.forEach(faDerive_);
    out.sort(function(a, b){
      return (a.kenh === 'Tư nhân') - (b.kenh === 'Tư nhân') || String(a.prov).localeCompare(String(b.prov)) || String(a.hosp).localeCompare(String(b.hosp)) ||
        String(a.grp).localeCompare(String(b.grp)) || String(a.type).localeCompare(String(b.type)) || String(a.code).localeCompare(String(b.code));
    });
    var sum = faSum_(out);
    st.n = out.length; st.by = sum.by; st.val = sum.val; st.ms = Date.now() - t0;
    if(!opt.dry){ faWrite_(sh, out); try{ faPriceSheet_(ss()); }catch(e){} faStatus_(st); try{ CacheService.getScriptCache().remove('fa_list'); }catch(e){} }
    return { ok:true, dry:!!opt.dry, n:out.length, by:sum.by, val:sum.val, src:st.src, ms:st.ms, first:first, news:st.news || st.newsErr || null };
  } finally { lock.releaseLock(); }
}
function faSum_(rows){
  var by = {}, val = 0;
  rows.forEach(function(r){ var k = r.kenh === 'Tư nhân' ? 'Tư nhân' : (r.stage === 'Đang dự thầu' && r.grp !== FC.GRP.E ? 'Đang dự thầu' : r.grp) || 'Khác';
    var b = by[k] = by[k] || { rows:0, inFc:0, val:0, dao:0, chi:0, ghim:0 }; b.rows++;
    if(/^Có/.test(r.inFc)){ b.inFc++; b.val += r.valFy; val += r.valFy; var kd = fcKind_(r.type); if(b[kd] != null) b[kd] += r.qtyFy; } });
  return { by:by, val:val };
}
function faStatus_(st){ try{ PropertiesService.getScriptProperties().setProperty('FA_SYNC', JSON.stringify(st).slice(0, 8000)); }catch(e){} }
function faSyncTrig(){ try{ faSync_({}); }catch(e){ faStatus_({ at:Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'), err:String(e && e.message || e) }); } }
function faTick_(){
  try{
    /* 11/11/2026: không chỉ tin cờ FA_TRIG — đồng bộ cuối cũ hơn 3 giờ ⇒ kiểm lại trigger thật (≤ 1 lần / giờ) và tạo lại nếu mất */
    var P = PropertiesService.getScriptProperties(), C = CacheService.getScriptCache();
    var st = {}; try{ st = JSON.parse(P.getProperty('FA_SYNC') || '{}'); }catch(e){}
    var age = st.at ? (Date.now() - new Date(String(st.at).replace(' ', 'T') + ':00+07:00').getTime()) / 36e5 : 99;
    if(P.getProperty('FA_TRIG') === FA.TRIG_V && age < 3) return;
    if(C.get('fa_tick')) return; C.put('fa_tick', '1', 3600);
    var have = ScriptApp.getProjectTriggers().filter(function(tr){ return tr.getHandlerFunction() === 'faSyncTrig'; });
    if(have.length === 1 && P.getProperty('FA_TRIG') === FA.TRIG_V) return;
    have.forEach(function(tr){ ScriptApp.deleteTrigger(tr); });
    ScriptApp.newTrigger('faSyncTrig').timeBased().everyHours(1).create();
    P.setProperty('FA_TRIG', FA.TRIG_V);
  }catch(e){ Logger.log('faTick_: ' + e.message); }
}

/* ══════════ API ══════════ */
function faKeyOk_(p){ return tfS_(p.key) && tfS_(p.key) === String(ssReal_().getId()).slice(-8); }
function faList_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  faTick_();
  var fy = faFy_(), sh = faSheet_();
  if(sh.getLastRow() < 2){ try{ faSync_({}); }catch(e){} }
  var rows = faRead_(sh).map(faDerive_);
  var cols = ['id', 'caseId', 'kenh', 'grp', 'pic', 'npp', 'hosp', 'prov', 'tbmt', 'now', 'kind', 'type', 'code', 'qty', 'dur', 'start', 'end', 'price', 'n', 'qtyFy', 'valFy',
              'inFc', 'stage', 'prog', 'cfg', 'brand', 'crit', 'chance', 'note', 'due', 'others', 'src', 'man', 'at', 'by', 'fid', 'months'];
  var out = rows.map(function(o){ return cols.map(function(c){
    if(c === 'kind') return fcKind_(o.type); if(c === 'start' || c === 'end') return o[c] ? fcMs_(o[c]) : ''; if(c === 'months') return o.months;
    if(c === 'at') return o.at instanceof Date ? Utilities.formatDate(o.at, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : faStr_(o.at);
    return o[c] == null ? '' : o[c]; }); });
  var P = faPrices_(), prices = {}; Object.keys(P).forEach(function(c){ prices[c] = [P[c].per, P[c].kind]; });
  var sync = {}; try{ sync = JSON.parse(PropertiesService.getScriptProperties().getProperty('FA_SYNC') || '{}'); }catch(e){}
  return { ok:true, v:FA.VER, fy:fy, me:{ pic:me.pic, admin:!!me.admin, level:me.level }, cols:cols, rows:out, prices:prices,
    stages:FC.STAGES, priv:['Giới thiệu', 'Demo', 'Đề xuất từ chuyên môn', 'Ký hợp đồng mua sắm', 'Sử dụng hàng', 'Không thành công', 'Dừng theo dõi'],
    lists:{ prog:FC.PROGRESS, cfg:FC.CONFIG, crit:FC.CRIT, chance:FC.CHANCE, brand:FA.BRANDS }, sync:{ at:sync.at || '', err:sync.err || '', n:sync.n || 0 } };
}
/* sửa 1 dòng (id) hoặc thêm dòng Sales mới */
function faSave_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  faFy_();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = faSheet_(), rows = faRead_(sh), id = tfS_(p.id), o = null, idx = -1;
    for(var i = 0; i < rows.length; i++) if(rows[i].id === id){ o = rows[i]; idx = i; break; }
    if(id && !o) return { ok:false, error:'Không tìm thấy dòng ' + id + ' (sheet vừa đồng bộ lại — tải lại Tender Map).' };
    var isNew = !o;
    if(isNew){
      var hosp = tfS_(p.hosp), code = tfS_(p.code).toUpperCase().replace(/\s+/g, '');
      if(!hosp) return { ok:false, error:'Chưa chọn cơ sở y tế.' };
      if(!code) return { ok:false, error:'Chưa nhập mã sản phẩm.' };
      var kenh = tfS_(p.kenh) === 'Tư nhân' ? 'Tư nhân' : 'Thầu';
      o = { id:'S|' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '|' + code, caseId:'', kenh:kenh,
            grp:kenh === 'Tư nhân' ? FC.GRP.P : (tfS_(p.grp) || FC.GRP.M), pic:'', npp:tfS_(p.npp), hosp:fuTxt_(hosp, 200), prov:fuTxt_(p.prov, 60), tbmt:fuTxt_(p.tbmt, 60), now:'', type:'', code:code,
            qty:0, dur:12, start:0, others:0, src:'Sales (Tender Map)', stage:'', prog:'', cfg:'', brand:'', crit:'', chance:'', note:'', due:'', man:'', fid:fuTxt_(p.fid, 40) };
      o.caseId = o.id.split('|')[1];
    }
    var set = function(k, v){ if(String(o[k]) !== String(v)){ faHist_(me.pic, o.id, k, o[k], v); o[k] = v; if(o.man.split(',').indexOf(k) < 0) o.man = o.man ? o.man + ',' + k : k; } };
    var auto1 = o.grp === FC.GRP.E;                                       /* ① theo hợp đồng: không sửa SL / mốc */
    if(p.code != null && !auto1 && !isNew) set('code', tfS_(p.code).toUpperCase().replace(/\s+/g, '').slice(0, 40));
    if(p.qty != null && !auto1) set('qty', fuNum_(p.qty));
    if(p.dur != null && !auto1) set('dur', Math.max(1, Math.min(60, parseInt(p.dur, 10) || 12)));
    if(p.start != null && !auto1) set('start', fcMonth_(p.start) || 0);
    var lim = function(k, v, list){ v = tfS_(v); if(list && v && list.indexOf(v) < 0) return; set(k, fuTxt_(v, k === 'note' ? 3000 : 120)); };
    if(p.stage != null) lim('stage', p.stage, FC.STAGES.concat(['Giới thiệu', 'Demo', 'Đề xuất từ chuyên môn', 'Ký hợp đồng mua sắm', 'Sử dụng hàng', 'Không thành công', 'Dừng theo dõi']));
    if(p.prog != null) lim('prog', p.prog, FC.PROGRESS); if(p.cfg != null) lim('cfg', p.cfg, FC.CONFIG); if(p.crit != null) lim('crit', p.crit, FC.CRIT);
    if(p.chance != null) lim('chance', p.chance, FC.CHANCE); if(p.brand != null) lim('brand', p.brand); if(p.note != null) lim('note', p.note);
    if(p.due != null) set('due', tfIso_(p.due) || '');
    o.at = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'); o.by = me.pic;
    faDerive_(o);
    var row = faRowOut_(o);
    if(isNew){ sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]); }
    else sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
    try{ CacheService.getScriptCache().remove('fa_list'); }catch(e){}
    return { ok:true, id:o.id, isNew:isNew };
  } finally { lock.releaseLock(); }
}
function faDel_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var id = tfS_(p.id); if(!id || faAuto_(id)) return { ok:false, error:'Chỉ xoá được dòng do Sales thêm (dòng lấy từ dữ liệu thầu không xoá — đổi giai đoạn "Tạm dừng theo dõi").' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = faSheet_(), rows = faRead_(sh);
    for(var i = 0; i < rows.length; i++) if(rows[i].id === id){ faHist_(me.pic, id, '(xoá dòng)', rows[i].code + ' × ' + rows[i].qty, ''); sh.deleteRow(i + 2); return { ok:true, id:id }; }
    return { ok:false, error:'Không tìm thấy dòng ' + id + '.' };
  } finally { lock.releaseLock(); }
}
function faSyncApi_(p){
  if(!faKeyOk_(p)){ var me = fuMe_(p); if(me.err || !me.admin) return { ok:false, code:'AUTH', error:'Cần khoá file hoặc phiên Admin.' }; }
  return faSync_({ dry:tfS_(p.dry) === '1' });
}
function faDiag_(p){
  if(!faKeyOk_(p)){ var me = fuMe_(p); if(me.err || !me.admin) return { ok:false, code:'AUTH', error:'Cần khoá file hoặc phiên Admin.' }; }
  var fy = faFy_(), sh = faSheet_(), rows = faRead_(sh); rows.forEach(faDerive_);
  var s = faSum_(rows), st = {}; try{ st = JSON.parse(PropertiesService.getScriptProperties().getProperty('FA_SYNC') || '{}'); }catch(e){}
  var top = rows.filter(function(r){ return /^Có/.test(r.inFc); }).sort(function(a, b){ return b.valFy - a.valFy; }).slice(0, 12).map(function(r){ return [r.grp, r.hosp, r.code, r.qty, fcMs_(r.start), r.dur, r.valFy]; });
  return { ok:true, v:FA.VER, fy:fy, rows:rows.length, by:s.by, val:s.val, sync:st, trig:PropertiesService.getScriptProperties().getProperty('FA_TRIG') || '', top:top };
}
