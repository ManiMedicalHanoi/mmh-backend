/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH · BẢN ĐỒ HOẠT ĐỘNG SALES (web Tender Map ▸ chế độ "Hoạt động", 05/11/2026) — chỉ ở backend CRM Surgical VN
   Đọc tab 1. CUSTOMER CODE (danh sách địa bàn) + 6. WEEKLY REPORT (Customer visiting / mọi việc khách hàng của Viet Ha, Khang…)
   ⇒ app vẽ bản đồ hoạt động theo kỳ / tháng. Mọi phiên email công ty đều xem được dữ liệu của cả nhóm (người dùng yêu cầu 05/11/2026).

   VỊ TRÍ ĐỊA BÀN: sheet ẨN "TENDER MAP · VỊ TRÍ ĐỊA BÀN" (ghi nối tiếp, dòng mới nhất của 1 mã KH là vị trí đang dùng):
   mã KH ⇄ toạ độ chính xác và / hoặc cơ sở y tế trong danh mục của Tender Map (csyt.js) — người dùng ghim trên bản đồ hoặc chọn cơ sở.
   App tự định vị khi chưa ghim: cơ sở trùng tên trong danh mục ⇒ cụm GPS ảnh viếng thăm (cột W) ⇒ phường / quận trong địa chỉ ⇒ tâm tỉnh.

     GET action=fuVisits   tk [from=yyyy-mm-dd]  → { ok, v, from, to, accCols, acc:[[…]], pics, acts, sts, cols, rows:[[…]] }   (gọn: chỉ số, không chữ dài)
         v1.1 (08/11/2026, người dùng: bấm khách / rê chuột phải hiện ngay, có ảnh lần đi địa bàn gần nhất): mỗi khách thêm
         `last` = ≤ 3 lượt gần nhất (đến hôm nay) [ngày, PIC, loại, trạng thái, kết quả ≤ 200, phản hồi ≤ 100, bước tiếp theo ≤ 120, [mã ảnh Drive ≤ 4]]
         và `ph` = [ngày, [mã ảnh]] của lượt gần nhất có ảnh (ảnh CRM chia sẻ "ai có link" ⇒ app hiện drive.google.com/thumbnail?id=…).
     GET action=fuVisitLog tk code | name+prov   → { ok, acc, rows:[{…}] }   (mọi lượt của 1 khách hàng, mới trước, đủ kết quả / phản hồi / bước tiếp theo)
     POST action=fuLocSave tk code name prov lat lng fid fname src note [op=clear] → { ok, loc }
   ════════════════════════════════════════════════════════════════════════════════════════ */
var VM = {
  VER: '1.1',
  TAB: 'TENDER MAP · VỊ TRÍ ĐỊA BÀN',
  HDR: ['Thời gian', 'Mã KH', 'Tên khách hàng', 'Tỉnh / thành', 'Vĩ độ', 'Kinh độ', 'Mã cơ sở (Tender Map)', 'Tên cơ sở (Tender Map)', 'Nguồn', 'Người cập nhật', 'Ghi chú', 'Tên chuẩn'],
  FROM: '2025-09-01',                      /* FY67 */
  ACC_COLS: ['code', 'name', 'type', 'province', 'area', 'pic', 'address', 'gps', 'loc', 'std', 'kind', 'last', 'ph'],
  LAST_N: 3,
  ROW_COLS: ['d', 'pic', 'acc', 'act', 'st', 'lat', 'lng', 'photo', 'task']
};

function vmSheet_(){
  var book = ss(), sh = book.getSheetByName(VM.TAB);
  if(!sh){
    sh = book.insertSheet(VM.TAB);
    sh.getRange(1, 1, 1, VM.HDR.length).setValues([VM.HDR]).setFontWeight('bold').setBackground('#CFE2F3');
    sh.setFrozenRows(1);
  } else if(tfS_(sh.getRange(1, VM.HDR.length).getValue()) !== VM.HDR[VM.HDR.length - 1]){
    sh.getRange(1, 1, 1, VM.HDR.length).setValues([VM.HDR]).setFontWeight('bold');                /* thêm cột mới ở cuối (Tên chuẩn) */
  }
  try{ if(!sh.isSheetHidden()) sh.hideSheet(); }catch(e){}
  return sh;
}
/* mã KH ⇒ vị trí đang dùng (dòng mới nhất; dòng "xoá" = bỏ ghim) */
function vmLocs_(){
  var sh = vmSheet_(), last = sh.getLastRow(), m = {};
  if(last < 2) return m;
  sh.getRange(2, 1, last - 1, VM.HDR.length).getValues().forEach(function(r){
    var c = tfS_(r[1]); if(!c) return;
    var lat = Number(r[4]), lng = Number(r[5]), fid = tfS_(r[6]);
    var std = tfS_(r[11]), prev = m[c];
    if(tfS_(r[8]) === 'tên'){ if(prev) prev[7] = std; else m[c] = ['', '', '', '', '', tfS_(r[9]), '', std]; return; }          /* dòng chỉ đổi tên chuẩn */
    if(!(lat && lng) && !fid){ if(prev && prev[7]) m[c] = ['', '', '', '', '', '', '', prev[7]]; else delete m[c]; return; }
    m[c] = [lat || '', lng || '', fid, tfS_(r[7]), tfS_(r[8]) || 'tay', tfS_(r[9]), r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : tfS_(r[0]), std || (prev && prev[7]) || ''];
  });
  return m;
}
function vmGps_(cell){
  var g = parseGps_(cell).gps, m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(String(g || ''));
  if(!m) return null;
  var lat = +m[1], lng = +m[2];
  return (lat > 7 && lat < 24.5 && lng > 101.5 && lng < 118) ? [lat, lng] : null;
}
/* cụm GPS: trung vị + số điểm trong bán kính 1,5 km quanh trung vị */
function vmCluster_(pts){
  if(!pts || !pts.length) return null;
  var la = pts.map(function(p){ return p[0]; }).sort(function(a, b){ return a - b; }), lo = pts.map(function(p){ return p[1]; }).sort(function(a, b){ return a - b; });
  var mid = Math.floor(pts.length / 2), cl = la[mid], cg = lo[mid], cos = Math.cos(cl * Math.PI / 180);
  var k = pts.filter(function(p){ var dy = (p[0] - cl) * 111, dx = (p[1] - cg) * 111 * cos; return dx * dx + dy * dy <= 2.25; }).length;
  return [Math.round(cl * 1e5) / 1e5, Math.round(cg * 1e5) / 1e5, pts.length, k];
}

/* mã ảnh Drive trong ô Photo link (nhiều link cách nhau dấu cách / xuống dòng) */
function vmPhotoIds_(cell){
  var out = [];
  (S(cell).match(/[-\w]{25,}/g) || []).forEach(function(id){ if(out.indexOf(id) < 0 && out.length < 4) out.push(id); });
  return out;
}
function vmCut_(v, n){ v = S(v).replace(/\s*\n+\s*/g, ' · ').replace(/\s+/g, ' ').trim(); return v.length > n ? v.slice(0, n - 1) + '…' : v; }
/* danh sách địa bàn + mọi lượt việc khách hàng (dạng gọn) — đệm theo phiên bản 2 tab */
function vmCore_(from){
  return cachedFor_('VM2|' + from, ['customer', 'weekly'], function(){
    var acc = [], byCode = {}, byChk = {}, byNm = {}, pts = {};
    readTab('customer').forEach(function(c){
      var code = S(c.code); if(!code || byCode[code] != null) return;
      byCode[code] = acc.length;
      acc.push([code, S(c.name), S(c.type), S(c.province), S(c.area), S(c.pic), S(c.address), null]);
      byChk[normName_(checkName(c))] = byCode[code];
      var nk = normName_(c.name) + '|' + normName_(c.province); if(!(nk in byNm)) byNm[nk] = byCode[code];
    });
    var pics = [], acts = [], sts = [], tasks = [], rows = [], to = fuAddDays_(fuToday_(), 92), today = fuToday_(), last = {}, ph = {};
    function ix(arr, v){ var i = arr.indexOf(v); if(i < 0){ arr.push(v); i = arr.length - 1; } return i; }
    readTab('weekly').forEach(function(r){
      var d = d2s(r.start); if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      var raw = S(r.account), a = parseCheckName(raw), nm = a.name || raw;
      if(!nm || /^TBD$/i.test(nm)) return;
      var ai = byChk[normName_(raw)];
      if(ai == null) ai = byNm[normName_(nm) + '|' + normName_(a.province || r.province)];
      if(ai == null){                                                                 /* khách chưa có trong 1. CUSTOMER CODE */
        var xk = 'x|' + normName_(nm) + '|' + normName_(a.province || r.province);
        ai = byCode[xk]; if(ai == null){ ai = byCode[xk] = acc.length; acc.push(['', nm, a.type || S(r.type), a.province || S(r.province), a.area || S(r.area), S(r.pic), '', null]); }
      }
      var g = vmGps_(r.gpsInfo);
      if(g && /^visit/i.test(S(r.typeAction))) (pts[ai] = pts[ai] || []).push(g);
      if(d <= today){                                                                   /* v1.1 — lượt gần nhất + ảnh gần nhất (mọi thời gian) */
        var ids = vmPhotoIds_(r.photo);
        if(ids.length && !(ph[ai] && ph[ai][0] >= d)) ph[ai] = [d, ids];
        var L = last[ai] = last[ai] || [];
        if(L.length < VM.LAST_N || d > L[L.length - 1][0]){
          L.push([d, S(r.pic), S(r.typeAction), S(r.status), vmCut_(r.result, 200), vmCut_(r.feedback, 100), vmCut_(r.nextAction, 120), ids]);
          L.sort(function(x, y){ return x[0] < y[0] ? 1 : x[0] > y[0] ? -1 : 0; });
          if(L.length > VM.LAST_N) L.length = VM.LAST_N;
        }
      }
      if(d < from || d > to) return;
      rows.push([d, ix(pics, S(r.pic) || '—'), ai, ix(acts, S(r.typeAction) || '—'), ix(sts, S(r.status) || '—'), g ? g[0] : '', g ? g[1] : '', S(r.photo) ? 1 : 0, ix(tasks, S(r.typeTask) || '—')]);
    });
    Object.keys(pts).forEach(function(i){ acc[i][7] = vmCluster_(pts[i]); });
    acc.forEach(function(a, i){ a[8] = null; a[9] = null; a[10] = null; a[11] = last[i] || null; a[12] = ph[i] || null; });
    rows.sort(function(x, y){ return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0; });
    return { acc:acc, pics:pics, acts:acts, sts:sts, tasks:tasks, rows:rows, to:to };
  });
}
function fuVisits_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var from = tfIso_(p.from) || VM.FROM, core = vmCore_(from), L = vmLocs_();
  var STD = (typeof VM_STD !== 'undefined') ? VM_STD : {};
  var acc = core.acc.map(function(a){ var o = a.slice(), sd = a[0] && STD[a[0]]; o[8] = (a[0] && L[a[0]]) || null;
    o[9] = (o[8] && o[8][7]) || (sd && (typeof sd === 'string' ? sd : sd[0])) || ''; o[10] = (sd && typeof sd !== 'string' && sd[1]) || ''; return o; });
  return { ok:true, v:VM.VER, from:from, to:core.to, today:fuToday_(), accCols:VM.ACC_COLS, acc:acc, pics:core.pics, acts:core.acts, sts:core.sts, tasks:core.tasks, cols:VM.ROW_COLS, rows:core.rows };
}
/* nhật ký đầy đủ của 1 khách hàng (mọi thời gian) */
function fuVisitLog_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var code = tfS_(p.code), acc = null;
  if(code) acc = readTab('customer').filter(function(c){ return S(c.code) === code; })[0] || null;
  var chk = acc ? normName_(checkName(acc)) : '', nk = acc ? normName_(acc.name) + '|' + normName_(acc.province) : normName_(p.name) + '|' + normName_(p.prov);
  if(!acc && nk.length < 6) return { ok:false, error:'Thiếu mã / tên khách hàng.' };
  var cut = function(v, n){ v = S(v); return v.length > n ? v.slice(0, n) + '…' : v; };
  var rows = readTab('weekly').filter(function(r){ var raw = S(r.account), a = parseCheckName(raw);
      return (chk && normName_(raw) === chk) || normName_(a.name || raw) + '|' + normName_(a.province || r.province) === nk; })
    .map(function(r){ var g = parseGps_(r.gpsInfo), gp = vmGps_(r.gpsInfo), ph = /https?:\/\/\S+/.exec(S(r.photo));
      return { no:S(r.no), d:d2s(r.start), f:d2s(r.finish), pic:S(r.pic), task:S(r.typeTask), act:S(r.typeAction), proc:S(r.process), prod:S(r.product),
               plan:cut(r.plan, 600), res:cut(r.result, 1500), st:S(r.status), fb:cut(r.feedback, 400), next:cut(r.nextAction, 400), stop:cut(r.stopReason, 300),
               photo:ph ? ph[0] : '', gps:gp ? gp[0] + ',' + gp[1] : '', addr:cut(g.gpsAddr, 160) }; })
    .sort(function(a, b){ return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }).slice(0, 300);
  return { ok:true, v:VM.VER, acc:acc ? { code:S(acc.code), name:S(acc.name), type:S(acc.type), province:S(acc.province), area:S(acc.area), pic:S(acc.pic), address:S(acc.address) } : null, rows:rows };
}
/* ghim vị trí / gắn cơ sở y tế cho 1 mã KH (ghi nối tiếp; op=clear ⇒ bỏ ghim) */
function fuLocSave_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var code = tfS_(p.code); if(!code) return { ok:false, error:'Thiếu mã khách hàng.' };
  var clear = tfS_(p.op) === 'clear', lat = Number(p.lat), lng = Number(p.lng), fid = tfS_(p.fid).slice(0, 60);
  if(!clear && tfS_(p.op) !== 'name'){
    var okLL = lat > 7 && lat < 24.5 && lng > 101.5 && lng < 118;
    if(!okLL && !fid) return { ok:false, error:'Vị trí nằm ngoài Việt Nam.' };
    if(!okLL){ lat = ''; lng = ''; }
  }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = vmSheet_();
    if(tfS_(p.op) === 'name'){                                                                    /* chỉ đổi tên chuẩn của khách (tên đúng ngoài đời) */
      sh.getRange(sh.getLastRow() + 1, 1, 1, VM.HDR.length).setValues([[new Date(), fuTxt_(code, 40), fuTxt_(p.name, 200), fuTxt_(p.prov, 60), '', '', '', '', 'tên', fuTxt_(me.pic, 60), fuTxt_(p.note, 300), fuTxt_(p.std, 200)]]);
      return { ok:true, code:code, loc:vmLocs_()[code] || null };
    }
    var row = [new Date(), fuTxt_(code, 40), fuTxt_(p.name, 200), fuTxt_(p.prov, 60), clear ? '' : (lat === '' ? '' : Math.round(lat * 1e6) / 1e6), clear ? '' : (lng === '' ? '' : Math.round(lng * 1e6) / 1e6),
               clear ? '' : fuTxt_(fid, 60), clear ? '' : fuTxt_(p.fname, 200), clear ? 'xoá' : fuTxt_(p.src || 'tay', 20), fuTxt_(me.pic, 60), fuTxt_(p.note, 300), ''];
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  } finally { lock.releaseLock(); }
  return { ok:true, code:code, loc:vmLocs_()[code] || null };
}

/* chẩn đoán (khoá = 8 ký tự cuối ID Sheet, gọi qua workflow Kiểm tra): danh sách khách 1. CUSTOMER CODE — chỉ tên cơ sở / loại / tỉnh / PIC (không SĐT)
   ⇒ để chuẩn hoá tên bệnh viện / phòng khám tư (MMH_AccNames.gs ▸ VM_STD). off / n = phân trang, types = chỉ đếm loại */
function fuAccDiag_(p){
  if(!(tfS_(p.key) && tfS_(p.key) === String(ssReal_().getId()).slice(-8))) return { ok:false, code:'AUTH', error:'Cần khoá file.' };
  var L = readTab('customer').map(function(c){ return [S(c.code), S(c.name), S(c.type), S(c.province), S(c.pic)]; }).filter(function(r){ return r[0]; });
  var types = {}; L.forEach(function(r){ types[r[2] || '—'] = (types[r[2] || '—'] || 0) + 1; });
  if(tfS_(p.types) === '1') return { ok:true, n:L.length, types:types };
  var ty = tfS_(p.type), off = parseInt(p.off, 10) || 0, n = Math.min(200, parseInt(p.n, 10) || 60);
  if(ty) L = L.filter(function(r){ return new RegExp(ty, 'i').test(r[2]); });
  return { ok:true, n:L.length, off:off, rows:L.slice(off, off + n).map(function(r){ return r.join('|'); }) };
}

