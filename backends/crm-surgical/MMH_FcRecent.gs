/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH_FcRecent.gs — CẬP NHẬT GẦN ĐÂY của phần thầu / mua sắm (Tender Map) — CHỈ ĐỌC (10/11/2026)

   Người dùng hỏi: "những thông tin nào mới được cập nhật ở các backend thầu / follow up mua sắm & thầu, Sales đã cập nhật ở địa bàn nào".
   Không ghi gì, không trả email. Gọi qua workflow Kiểm tra ▸ ping (≤ 6000 ký tự ⇒ chia phần + off / n):

     GET action=fuRecent key=<8 ký tự cuối ID Sheet CRM Surgical> [days=30] [part=sum|fu|fa|loc|src] [src=HV|IC|KQ] [off=0] [n=25] [full=1]
       sum  — số lượt theo PIC / tỉnh trong kỳ: Theo dõi thầu (sheet Nhật ký), sửa Follow up by Account (sheet Lịch sử sửa + dòng Sales),
              ghim vị trí / tên chuẩn (TENDER MAP · VỊ TRÍ ĐỊA BÀN), giờ sửa cuối của 3 file nguồn (Hùng Vĩ · I-Care · KQTT) + số gói mới
       fu   — từng lần cập nhật Theo dõi thầu trong kỳ (mới trước)
       fa   — từng lần sửa Follow up by Account trong kỳ (lịch sử sửa, kèm bệnh viện / tỉnh / mã)
       loc  — từng lần ghim vị trí / đặt tên chuẩn trong kỳ
       src  — gói mới ở file nguồn (src=HV|IC|KQ): mốc (phê duyệt / tháng) từ 2 tháng trước, NPP thêm "Đang dự thầu"
   ════════════════════════════════════════════════════════════════════════════════════════ */
function frT_(d){ return d instanceof Date && !isNaN(d) ? Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : tfS_(d); }
function frCut_(s, n){ s = tfS_(s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function frInc_(m, k, by){ k = k || '(trống)'; m[k] = (m[k] || 0) + (by || 1); }

function fuRecent_(p){
  if(!faKeyOk_(p)){ var me = fuMe_(p); if(me.err || !me.admin) return { ok:false, code:'AUTH', error:'Cần khoá file hoặc phiên Admin.' }; }
  var days = Math.max(1, Math.min(400, +p.days || 30)), now = new Date(), sinceD = new Date(now.getTime() - days * 864e5);
  var since = Utilities.formatDate(sinceD, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'), part = tfS_(p.part) || 'sum';
  var off = Math.max(0, +p.off || 0), n = Math.max(1, Math.min(80, +p.n || 25));
  var page = function(list){ return { total:list.length, off:off, rows:list.slice(off, off + n) }; };
  var out = { ok:true, v:'1.0', now:frT_(now), days:days, since:since, part:part };

  /* ── Theo dõi thầu (Follow up by Account · Nhật ký): mỗi lần lưu = 1 dòng ── */
  var fuRows = function(){
    var sh = fuSheet_(), last = sh.getLastRow(); if(last < 2) return [];
    return sh.getRange(2, 1, last - 1, FU.HDR.length).getValues().map(fuRowOut_)
      .filter(function(o){ return o[1] && o[0] >= since && !/^TEST/i.test(o[3]); })
      .sort(function(a, b){ return a[0] < b[0] ? 1 : -1; });
  };
  /* ── Follow up by Account: bảng id ⇒ bệnh viện / tỉnh / mã ── */
  var faMap = function(){ var m = {}; try{ faRead_(faSheet_()).forEach(function(o){ m[o.id] = o; }); }catch(e){} return m; };
  var histRows = function(){
    var sh = ss().getSheetByName(FA.HIST); if(!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues().map(function(r){ return [frT_(r[0]), tfS_(r[1]), tfS_(r[2]), tfS_(r[3]), tfS_(r[4]), tfS_(r[5])]; })
      .filter(function(r){ return r[0] >= since && !/^TEST/i.test(r[1]); }).sort(function(a, b){ return a[0] < b[0] ? 1 : -1; });
  };
  var locRows = function(){
    var sh = ss().getSheetByName(VM.TAB); if(!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, VM.HDR.length).getValues().map(function(r){ return [frT_(r[0]), tfS_(r[1]), tfS_(r[2]), tfS_(r[3]), tfS_(r[8]), tfS_(r[9]), tfS_(r[7]), tfS_(r[11])]; })
      .filter(function(r){ return r[0] >= since && !/^TEST/i.test(r[5]); }).sort(function(a, b){ return a[0] < b[0] ? 1 : -1; });
  };
  /* gói ở file nguồn có mốc từ 2 tháng trước (+ NPP: còn "Đang dự thầu") */
  var nowMi = fcMonth_(Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM'));
  var srcPk = function(key){
    var pk = key === 'KQ' ? faReadKq_() : faReadNpp_(key);
    return pk.filter(function(x){ return (x.start && x.start >= nowMi - 2) || x.res === 'Pending'; })
      .sort(function(a, b){ return (b.start || 9e9) - (a.start || 9e9); });
  };
  var srcUpd = function(id){ try{ return frT_(DriveApp.getFileById(id).getLastUpdated()); }catch(e){ return ''; } };

  if(part === 'fu'){
    out.fu = page(fuRows().map(function(o){
      return [o[0].slice(5, 16), o[3], o[23] || fuTerrOf_(o[7], o[8], o[22]), frCut_(o[6], 48), o[7], o[2], o[16], frCut_(o[12], 60), frCut_(o[18], 110), o[17], o[24]];
    }));
    out.cols = ['lúc', 'người cập nhật', 'PIC địa bàn', 'cơ sở', 'tỉnh', 'lần', 'giai đoạn', 'sản phẩm · SL', 'ghi chú', 'mốc', 'bắt đầu'];
    return out;
  }
  if(part === 'fa'){
    var M = faMap();
    out.fa = page(histRows().map(function(r){ var o = M[r[2]] || {};
      var mv = function(v){ return /^(start|end)$/.test(r[3]) && /^\d{5}$/.test(v) ? fcMs_(+v) : v; };
      return [r[0].slice(5, 16), r[1], frCut_(o.hosp || r[2], 44), o.prov || '', o.code || '', r[3], frCut_(mv(r[4]), 30), frCut_(mv(r[5]), 60)]; }));
    out.cols = ['lúc', 'người sửa', 'cơ sở', 'tỉnh', 'mã', 'cột', 'cũ', 'mới'];
    return out;
  }
  if(part === 'loc'){
    out.loc = page(locRows().map(function(r){ return [r[0].slice(5, 16), r[5], r[1], frCut_(r[2], 40), r[3], r[4], frCut_(r[6], 40), frCut_(r[7], 40)]; }));
    out.cols = ['lúc', 'người', 'mã KH', 'khách', 'tỉnh', 'nguồn', 'cơ sở Tender Map', 'tên chuẩn'];
    return out;
  }
  if(part === 'src'){
    var key = (tfS_(p.src) || 'HV').toUpperCase(); if(!FA.SRC[key]) return { ok:false, error:'src = HV | IC | KQ' };
    out.src = key; out.upd = srcUpd(FA.SRC[key].id);
    out.pk = page(srcPk(key).map(function(x){
      var it = {}; x.items.forEach(function(i){ frInc_(it, (key === 'KQ' ? (i.mani ? 'MANI ' : i.brand + ' ') : '') + i.type, i.qty); });
      return [x.start ? fcMs_(x.start) : '', x.res, frCut_(x.hosp, 46), x.prov, x.tbmt, Object.keys(it).map(function(k){ return k + ' ' + it[k]; }).join(', ').slice(0, 90)];
    }));
    out.cols = ['mốc', 'kết quả', 'cơ sở', 'tỉnh', 'TBMT', 'loại · SL'];
    return out;
  }

  /* ── sum ── */
  var F = fuRows(), fu = { n:F.length, cases:{}, byPic:{}, byProv:{}, byStage:{}, last:F.length ? F[0][0] : '' };
  F.forEach(function(o){
    fu.cases[o[1]] = 1; frInc_(fu.byPic, o[3]); frInc_(fu.byStage, o[16]);
    var pv = o[7] || '(chưa rõ tỉnh)', b = fu.byProv[pv] || (fu.byProv[pv] = { n:0, pic:{}, hosp:{} });
    b.n++; b.pic[o[3]] = 1; b.hosp[frCut_(o[6], 40)] = 1;
  });
  fu.cases = Object.keys(fu.cases).length;
  Object.keys(fu.byProv).forEach(function(k){ var b = fu.byProv[k]; fu.byProv[k] = [b.n, Object.keys(b.pic).join(' · '), Object.keys(b.hosp).slice(0, 6).join(' | ')]; });
  out.fu = fu;
  try{ var all = fuCases_(); out.fu.open = all.filter(function(c){ return fuOpen_(c.stage) && !/^TEST/i.test(c.pic); }).length; out.fu.allCases = all.length; }catch(e){}

  var M2 = faMap(), H = histRows(), fa = { edits:H.length, byBy:{}, byProv:{}, byField:{}, last:H.length ? H[0][0] : '' };
  H.forEach(function(r){ var o = M2[r[2]] || {}; frInc_(fa.byBy, r[1]); frInc_(fa.byField, r[3]); frInc_(fa.byProv, (o.prov || '?') + ' · ' + (r[1] || '?')); });
  var appRows = 0, salesRows = 0, filled = {};
  Object.keys(M2).forEach(function(id){ var o = M2[id];
    if(/^S\|/.test(id)) salesRows++;
    if(tfS_(o.at) && frT_(o.at) >= since) appRows++;
    if(o.stage || o.note || o.prog) frInc_(filled, o.prov || '?');
  });
  fa.rowsEditedInPeriod = appRows; fa.salesRows = salesRows; fa.rows = Object.keys(M2).length;
  fa.filledByProv = filled;   /* dòng đã có giai đoạn / ghi chú / tiến độ (gồm cả phần điền sẵn từ 2 file FY68) */
  out.fa = fa;

  var L = locRows(), loc = { n:L.length, byBy:{}, bySrc:{}, byProv:{} };
  L.forEach(function(r){ frInc_(loc.byBy, r[5]); frInc_(loc.bySrc, r[4] || 'ghim'); frInc_(loc.byProv, r[3]); });
  out.loc = loc;

  out.src = {};
  ['HV', 'IC', 'KQ'].forEach(function(k){
    var o = { upd:srcUpd(FA.SRC[k].id) };
    try{ var pk = srcPk(k); o.recent = pk.length; o.pending = pk.filter(function(x){ return x.res === 'Pending'; }).length;
      o.byMonth = {}; pk.forEach(function(x){ frInc_(o.byMonth, x.start ? fcMs_(x.start) : 'chưa có mốc'); }); }catch(e){ o.err = String(e && e.message || e).slice(0, 160); }
    out.src[k] = o;
  });
  try{ out.sync = JSON.parse(PropertiesService.getScriptProperties().getProperty('FA_SYNC') || '{}'); delete out.sync.by; }catch(e){}
  return out;
}
