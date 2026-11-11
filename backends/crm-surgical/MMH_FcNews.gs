/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH_FcNews.gs — SỔ GÓI THẦU MỚI + THÔNG BÁO (10/11/2026, người dùng: "thầu mới cập nhật không được hiển thị, không biết lúc nào
   gói mình đang theo dõi ra kết quả, gói được điền thêm ở backend thì thông báo thế nào")

   Mỗi lượt đồng bộ Follow up by Account (faSync_, mỗi giờ) đã đọc đủ 3 nguồn: file thầu Hùng Vĩ, I-Care, KQTT toàn quốc.
   faNewsTrack_(gói) so với sổ (sheet ẨN "TENDER MAP · GÓI MỚI", 1 dòng / gói):
     · gói chưa có trong sổ                       ⇒ sự kiện "new"  (Lần đầu thấy = giờ đồng bộ)
     · gói NPP "Đang dự thầu" nay có Win / Fail    ⇒ sự kiện "res"  (Đổi kết quả lúc + Kết quả trước)
     · cùng số TBMT đã có ở nguồn khác (Hùng Vĩ chép sang KQTT) ⇒ ghi sổ, KHÔNG tính là mới
   Lượt đầu tiên: ghi toàn bộ làm "gốc" (không báo gì).

   Thông báo (sheet RH_Notify của Training Master ⇒ nút "Nhắc tôi" ở Report Hub / CRM, App = "Theo dõi thầu"):
     · NGAY trong lượt đồng bộ: gói ở cơ sở ĐANG THEO DÕI (gói Theo dõi thầu giai đoạn đang chạy, hoặc dòng Follow up by Account
       ② ③ / Đang dự thầu đã có giai đoạn) hoặc trùng số TBMT ⇒ PIC phụ trách địa bàn (fuTerrOf_) + người cập nhật cuối của gói.
     · Hằng ngày (fuDaily ~08:00): gói mới còn lại của địa bàn ⇒ 1 thông báo tóm tắt / PIC. Chỉ gói có mốc ≤ 12 tháng
       (bỏ dữ liệu cũ dán bù vào file).
   Action fuNews (phiên email công ty, hoặc khoá file) [days=45] ⇒ { cols, rows, base } cho mục "Mới cập nhật" của Tender Map.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var FN = {
  TAB: 'TENDER MAP · GÓI MỚI', V: 'n1',
  HDR: ['Lần đầu thấy', 'Khoá', 'Nguồn', 'Kết quả', 'Cơ sở', 'Tỉnh / thành', 'Số TBMT', 'Mốc (tháng)', 'Sản phẩm · SL', 'MANI trúng', 'PIC địa bàn',
        'Đổi kết quả lúc', 'Kết quả trước', 'Đã báo', 'Địa chỉ'],
  SRC: { HV:'Hùng Vĩ', IC:'iCare', KQ:'KQTT' },
  MAX_AGE_M: 12
};
function fnNow_(){ return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'); }
function fnTb_(s){ return String(s || '').toUpperCase().replace(/\s+/g, '').replace(/-\d{1,2}$/, ''); }
function fnKey_(p){ return p.src + '|' + (fnTb_(p.tbmt) || fcHk_(p.hosp, p.prov) + '|' + (p.start || '')); }
function fnSheet_(){
  var book = ss(), sh = book.getSheetByName(FN.TAB);
  if(!sh){ sh = book.insertSheet(FN.TAB); sh.getRange(1, 1, 1, FN.HDR.length).setValues([FN.HDR]).setFontWeight('bold').setBackground('#CFE2F3'); sh.setFrozenRows(1); }
  try{ if(!sh.isSheetHidden()) sh.hideSheet(); }catch(e){}
  return sh;
}
function fnRead_(sh){
  var last = sh.getLastRow(); if(last < 2) return [];
  return sh.getRange(2, 1, last - 1, FN.HDR.length).getValues().map(function(r){
    return { seen:r[0] instanceof Date ? Utilities.formatDate(r[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : tfS_(r[0]), key:tfS_(r[1]), src:tfS_(r[2]), res:tfS_(r[3]),
      hosp:tfS_(r[4]), prov:tfS_(r[5]), tbmt:tfS_(r[6]).replace(/^'/, ''), mon:tfS_(r[7]).replace(/^'/, ''), sum:tfS_(r[8]), mani:tfS_(r[9]), pic:tfS_(r[10]),
      chg:r[11] instanceof Date ? Utilities.formatDate(r[11], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : tfS_(r[11]), prev:tfS_(r[12]), told:tfS_(r[13]), addr:tfS_(r[14]) };
  }).filter(function(o){ return o.key; });
}
function fnRow_(o){ return [o.seen, o.key, o.src, o.res, o.hosp, o.prov, o.tbmt ? "'" + o.tbmt : '', o.mon ? "'" + o.mon : '', o.sum, o.mani, o.pic, o.chg, o.prev, o.told, o.addr || '']; }
/* gộp các gói cùng khoá (NPP tách Win / Fail / Pending của 1 TBMT thành nhiều gói) */
function fnMerge_(pkgs){
  var by = {}, out = [];
  pkgs.forEach(function(p){
    if(!p || !p.hosp) return;
    var k = fnKey_(p), g = by[k];
    if(!g){ g = by[k] = { key:k, src:p.src, hosp:p.hosp, prov:p.prov, addr:p.addr || '', tbmt:fnTb_(p.tbmt), start:p.start || 0, res:{}, it:{}, mani:false }; out.push(g); }
    g.res[p.res || 'Pending'] = 1; if(p.start && p.start > g.start) g.start = p.start;
    (p.items || []).forEach(function(i){
      var lab = (p.src === 'KQ' ? (i.mani ? 'MANI' : (i.brand || 'Hãng khác')) + ' ' : '') + (i.code || i.type);
      g.it[lab] = (g.it[lab] || 0) + (+i.qty || 0);
      if(p.res === 'Win' && (i.mani || p.src !== 'KQ')) g.mani = true;
    });
  });
  out.forEach(function(g){
    var r = Object.keys(g.res); g.resTxt = r.indexOf('Win') >= 0 ? 'Win' : r.indexOf('Fail') >= 0 ? 'Fail' : 'Pending';
    g.sum = Object.keys(g.it).slice(0, 8).map(function(k){ return k + ' × ' + g.it[k]; }).join(', ').slice(0, 300);
    g.mon = g.start ? fcMs_(g.start) : '';
  });
  return out;
}
/* cơ sở / số TBMT đang theo dõi: gói Theo dõi thầu đang chạy + dòng Follow up by Account (② ③ / Đang dự thầu / Sales) có giai đoạn chưa dừng */
function fnFollowed_(){
  var hk = {}, tb = {};
  try{ fuCases_().forEach(function(c){ if(!fuOpen_(c.stage) || /^TEST/i.test(c.pic)) return; var k = fcHk_(c.hosp, fcProv_(c.prov)); (hk[k] = hk[k] || []).push({ who:c.pic, what:c.stageName, id:c.id });
    if(c.tbmt) tb[fnTb_(c.tbmt)] = hk[k]; }); }catch(e){}
  try{ faRead_(faSheet_()).forEach(function(o){
    if(o.grp === FC.GRP.E || !o.stage || FC.OUT_STAGES[o.stage] || o.stage === 'Đã trúng thầu') return;
    var k = faHk_(o); (hk[k] = hk[k] || []).push({ who:o.by || o.pic, what:o.stage, id:o.id }); }); }catch(e){}
  return { hk:hk, tb:tb };
}
function fnLink_(o){ return FU.MAP_URL + '?new=1#' + encodeURIComponent(o.prov) + '/' + encodeURIComponent(o.hosp); }
function fnResTxt_(o){
  if(o.res === 'Pending') return (FN.SRC[o.src] || o.src) + ' đang dự thầu';
  if(o.src === 'KQ') return (o.mani === 'x' ? 'MANI trúng' : 'Hãng khác trúng') + ' (KQTT)';
  return (FN.SRC[o.src] || o.src) + (o.res === 'Win' ? ' trúng thầu (MANI)' : ' trượt thầu');
}
function fnNotify_(items){
  if(!items.length) return 0;
  var HDR = ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt'], now = new Date();
  var rows = items.map(function(x){ return ['N' + Utilities.getUuid().replace(/-/g, '').slice(0, 12), now, x.to, 'Theo dõi thầu', x.kind, x.title.slice(0, 300), String(x.text || '').slice(0, 900), x.url, 'Tender Map', '', x.id || '', '']; });
  var book = SpreadsheetApp.openById(TF.MASTER_ID), sh = book.getSheetByName('RH_Notify');
  if(!sh){ sh = book.insertSheet('RH_Notify'); sh.getRange(1, 1, 1, HDR.length).setValues([HDR]).setFontWeight('bold'); sh.setFrozenRows(1); }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HDR.length).setValues(rows);
  return rows.length;
}

/* gọi trong faSync_ (sau khi đọc đủ nguồn, trước khi ghi sheet Follow up by Account) */
function faNewsTrack_(pkgs){
  var sh = fnSheet_(), old = fnRead_(sh), byK = {}, tbSeen = {}, now = fnNow_();
  old.forEach(function(o){ byK[o.key] = o; if(o.tbmt) tbSeen[o.tbmt] = 1; });
  var base = !old.length, add = [], ev = [], dirty = false;
  fnMerge_(pkgs).forEach(function(g){
    var o = byK[g.key];
    if(!o){
      o = { seen:base ? 'gốc ' + now.slice(0, 10) : now, key:g.key, src:g.src, res:g.resTxt, hosp:g.hosp, prov:g.prov, tbmt:g.tbmt, mon:g.mon, sum:g.sum,
            mani:g.mani ? 'x' : '', pic:fuTerrOf_(g.prov, g.addr, ''), chg:'', prev:'', told:'', addr:g.addr };
      var copy = g.tbmt && tbSeen[g.tbmt];                     /* cùng TBMT đã có ở nguồn khác ⇒ không tính là mới */
      if(copy) o.seen = 'trùng ' + now.slice(0, 10);
      add.push(o); byK[g.key] = o; if(g.tbmt) tbSeen[g.tbmt] = 1;
      if(!base && !copy) ev.push({ t:'new', o:o, g:g });
      return;
    }
    if(o.res !== g.resTxt){
      if(o.res === 'Pending' && g.resTxt !== 'Pending'){ o.prev = o.res; o.chg = now; o.told = ''; ev.push({ t:'res', o:o, g:g }); }
      o.res = g.resTxt; dirty = true;
    }
    if(o.sum !== g.sum || o.mon !== g.mon || (g.mani ? 'x' : '') !== o.mani){ o.sum = g.sum; o.mon = g.mon; o.mani = g.mani ? 'x' : ''; dirty = true; }
  });
  /* thông báo ngay: gói ở cơ sở đang theo dõi / trùng TBMT gói theo dõi */
  var nNow = 0;
  if(ev.length){
    var F = fnFollowed_(), nowMi = fcMonth_(now.slice(0, 7)), items = [], done = {};
    ev.forEach(function(e){
      var o = e.o, hk = fcHk_(o.hosp, fcProv_(o.prov)), fol = (o.tbmt && F.tb[o.tbmt]) || F.hk[hk];
      if(!fol || (e.g.start && e.g.start < nowMi - FN.MAX_AGE_M)) return;
      var dk = (o.tbmt || hk) + '|' + o.res; if(done[dk]) return; done[dk] = 1;
      var to = {}; if(o.pic) to[o.pic] = 1; fol.forEach(function(f){ if(f.who && !/^TEST/i.test(f.who)) to[f.who] = 1; });
      var title = (e.t === 'res' ? 'Gói theo dõi có kết quả · ' : o.res === 'Pending' ? 'Gói mới NPP đang dự thầu ở cơ sở đang theo dõi · ' : 'Kết quả thầu mới ở cơ sở đang theo dõi · ') + o.hosp;
      var fl = {}; fol.forEach(function(f){ fl[f.what + ' (' + f.who + ')'] = 1; });
      var text = fnResTxt_(o) + (o.tbmt ? ' · TBMT ' + o.tbmt : '') + (o.mon ? ' · tháng ' + o.mon : '') + '\n' + o.sum +
        '\nĐang theo dõi: ' + Object.keys(fl).slice(0, 3).join('; ') + '\nMở Tender Map để cập nhật giai đoạn / kết quả.';
      Object.keys(to).forEach(function(p){ items.push({ to:p, kind:'result', title:title, text:text, url:fnLink_(o), id:o.key }); });
      o.told = now; dirty = true;
    });
    try{ nNow = fnNotify_(items); }catch(e){ Logger.log('faNewsTrack notify: ' + e.message); }
  }
  if(add.length || dirty){
    var all = old.concat(add);
    var last = sh.getLastRow(); if(last >= 2) sh.getRange(2, 1, last - 1, FN.HDR.length).clearContent();
    sh.getRange(2, 1, all.length, FN.HDR.length).setValues(all.map(fnRow_));
  }
  try{ CacheService.getScriptCache().remove('fn_list'); }catch(e){}
  return { base:base, added:add.length, events:ev.length, notified:nNow };
}

/* tóm tắt hằng ngày (fuDaily): gói mới / có kết quả kể từ lần tóm tắt trước, chưa báo riêng ⇒ 1 thông báo / PIC địa bàn */
function faNewsDigest_(){
  var P = PropertiesService.getScriptProperties(), since = P.getProperty('FA_NEWS_DIG') || '', now = fnNow_();
  var sh = fnSheet_(), rows = fnRead_(sh), nowMi = fcMonth_(now.slice(0, 7)), by = {};
  if(!since){ P.setProperty('FA_NEWS_DIG', now); return { first:true }; }
  rows.forEach(function(o){
    var t = /^\d{4}-/.test(o.seen) ? o.seen : '', c = o.chg || '';
    var hit = (t && t > since) || (c && c > since); if(!hit || (o.told && o.told > since) || !o.pic) return;
    var mi = fcMonth_(o.mon.replace(/^(\d{2})\/(\d{4})$/, '$2-$1')); if(mi && mi < nowMi - FN.MAX_AGE_M) return;
    (by[o.pic] = by[o.pic] || []).push(o);
  });
  var items = [];
  Object.keys(by).forEach(function(pic){
    var L = by[pic].sort(function(a, b){ return (b.mani === 'x') - (a.mani === 'x'); }), m = L.filter(function(o){ return o.mani === 'x'; }).length;
    items.push({ to:pic, kind:'news', title:L.length + ' kết quả thầu mới ở địa bàn' + (m ? ' · ' + m + ' MANI trúng' : '') + ' · ' + now.slice(8, 10) + '/' + now.slice(5, 7),
      text:L.slice(0, 6).map(function(o){ return '• ' + o.hosp + ' (' + o.prov + ') — ' + fnResTxt_(o); }).join('\n') + (L.length > 6 ? '\n… và ' + (L.length - 6) + ' gói khác' : '') + '\nXem ở Tender Map ▸ Mới cập nhật.',
      url:FU.MAP_URL + '?new=1', id:'digest|' + now.slice(0, 10) });
  });
  var n = 0; try{ n = fnNotify_(items); }catch(e){ Logger.log('faNewsDigest: ' + e.message); }
  P.setProperty('FA_NEWS_DIG', now);
  return { pics:Object.keys(by).length, notified:n };
}

/* app ▸ mục "Mới cập nhật": gói mới / đổi kết quả trong `days` ngày */
function fuNews_(p){
  if(!faKeyOk_(p)){ var me = fuMe_(p); if(me.err) return { ok:false, code:'AUTH', error:me.err }; }
  faTick_();
  var days = Math.max(1, Math.min(180, +p.days || 45)), since = Utilities.formatDate(new Date(Date.now() - days * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm');
  var C = CacheService.getScriptCache(), ck = 'fn_list|' + days;
  try{ var hit = C.get(ck); if(hit) return JSON.parse(hit); }catch(e){}
  var rows = fnRead_(fnSheet_()), base = '';
  rows.forEach(function(o){ var m = /^gốc (\d{4}-\d{2}-\d{2})/.exec(o.seen); if(m && (!base || m[1] < base)) base = m[1]; });
  var out = { ok:true, v:'1.0', days:days, since:since, base:base, last:'',
    cols:['seen', 'src', 'res', 'prev', 'chg', 'hosp', 'prov', 'tbmt', 'mon', 'mani', 'sum', 'pic'],
    rows:rows.filter(function(o){ return (/^\d{4}-/.test(o.seen) && o.seen >= since) || (o.chg && o.chg >= since); })
      .map(function(o){ return [/^\d{4}-/.test(o.seen) ? o.seen : '', o.src, o.res, o.prev, o.chg, o.hosp, o.prov, o.tbmt, o.mon, o.mani ? 1 : 0, o.sum, o.pic]; })
      .sort(function(a, b){ return String(b[4] || b[0]).localeCompare(String(a[4] || a[0])); }) };
  try{ var st = JSON.parse(PropertiesService.getScriptProperties().getProperty('FA_SYNC') || '{}'); out.last = st.at || ''; }catch(e){}
  try{ var s = JSON.stringify(out); if(s.length < 95000) C.put(ck, s, 600); }catch(e){}
  return out;
}
