/*************************************************************************************************
 * MMH_PhotoCheck.gs — CẢNH BÁO ĐỘ TIN CẬY ẢNH ĐI ĐỊA BÀN TRONG BÁO CÁO TUẦN · v1.0 (17/11/2026, người dùng yêu cầu)
 * GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless (sửa 1 nơi ⇒ chép sang 2 nơi kia).
 *
 * Luật: trong tuần báo cáo, 2 ảnh đi địa bàn LIÊN TIẾP của cùng PIC, cùng ngày, ở 2 khách KHÁC nhau, cách nhau < 15 phút
 * (giờ chụp 📷 cột W; ảnh cũ chưa có giờ chụp ⇒ giờ tải 🕒) ⇒ "ảnh bất thường" (giống bộ phát hiện PHA của app CRM v35.5).
 * · Sales GỬI CHÍNH THỨC báo cáo tuần của mình (option team) mà có ảnh bất thường ⇒ phải có giải trình (app gửi photoNote),
 *   thiếu ⇒ { ok:false, code:'PHOTO_NOTE', n, chains } ⇒ KHÔNG gửi.
 * · Giải trình lưu Script Property PHN|<pic>|<thứ Hai tuần> = { text, at, by, n } ⇒ quản lý gửi thay (pic / all) vẫn kèm được.
 * · Email + PDF báo cáo tuần: khối "CẢNH BÁO VỀ ĐỘ TIN CẬY CỦA THÔNG TIN CẬP NHẬT" ở đầu (danh sách ảnh + giải trình;
 *   chưa có giải trình ⇒ ghi rõ). Không ảnh bất thường ⇒ không thêm gì.
 *************************************************************************************************/
var PHC = { GAP: 15 };
function phcTime_(r){
  var s = (typeof parseShotAt_ === 'function' ? parseShotAt_(r.gpsInfo) : '') || (typeof parseUpAt_ === 'function' ? parseUpAt_(r.gpsInfo) : '');
  var m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/.exec(S(s)); if (!m) return null;
  return { at: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime(), day: m[1] + '-' + m[2] + '-' + m[3], hm: ('0' + m[4]).slice(-2) + ':' + m[5],
           src: (typeof parseShotAt_ === 'function' && parseShotAt_(r.gpsInfo)) ? 'shot' : 'up' };
}
function phcAcc_(r){ try{ return S(parseCheckName(S(r.account)).name) || S(r.account); }catch(e){ return S(r.account); } }
/* chuỗi ảnh < 15 phút ở khách khác nhau ⇒ { n: số ảnh liên quan, chains:[{ day, items:[{ hm, acc, row, src }] }] } */
function phcDetect_(all, pic, from, to){
  var by = {};
  (all || []).forEach(function(r){
    if (S(r.pic) !== S(pic) || !S(r.photo)) return;
    var t = phcTime_(r); if (!t || t.day < from || t.day > to) return;
    (by[t.day] = by[t.day] || []).push({ r: r, t: t, acc: phcAcc_(r) });
  });
  var chains = [], rows = {};
  Object.keys(by).sort().forEach(function(d){
    var L = by[d].sort(function(a, b){ return a.t.at - b.t.at; }), cur = null;
    for (var i = 1; i < L.length; i++){
      var p = L[i - 1], q = L[i], gap = (q.t.at - p.t.at) / 60000;
      if (gap < PHC.GAP && normName_(q.acc) !== normName_(p.acc)){
        if (!cur){ cur = { day: d, items: [ { hm: p.t.hm, acc: p.acc, row: p.r._row, src: p.t.src } ] }; chains.push(cur); rows[p.r._row] = 1; }
        cur.items.push({ hm: q.t.hm, acc: q.acc, row: q.r._row, src: q.t.src, gap: Math.round(gap) }); rows[q.r._row] = 1;
      } else cur = null;
    }
  });
  return { n: Object.keys(rows).length, chains: chains };
}
function phcMon_(iso){ var d = new Date(S(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return S(iso).slice(0, 10); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function phcKey_(pic, from){ return 'PHN|' + S(pic) + '|' + phcMon_(from) + ((typeof tmSb_ === 'function' && tmSb_()) ? '|SB' : ''); }
function phcNote_(pic, from){ try{ var o = JSON.parse(props_().getProperty(phcKey_(pic, from)) || 'null'); return o && S(o.text) ? o : null; }catch(e){ return null; } }
/* app gửi photoNote = { pic, from, text, n } ⇒ lưu (chỉ chính PIC, quản lý gửi thay thì ghi kèm người ghi) */
function phcNoteIn_(p, user){
  var o = p.photoNote; if (typeof o === 'string'){ try{ o = JSON.parse(o); }catch(e){ o = null; } }
  if (!o || !S(o.text)) return null;
  var pic = S(o.pic) || S(p.toPic) || S(user && user.pic), from = S(o.from) || S(p.from);
  var rec = { text: S(o.text).slice(0, 2000), at: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'), by: S(user && user.pic), n: +o.n || 0 };
  try{ props_().setProperty(phcKey_(pic, from), JSON.stringify(rec)); }catch(e){}
  return rec;
}
function phcEsc_(s){ return S(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
/* khối đầu email / PDF */
function phcHtml_(ch, note){
  if (!ch || !ch.n) return '';
  var d2 = function(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); return m ? m[3] + '/' + m[2] : iso; };
  var list = ch.chains.map(function(c){
    return '<li style="margin:2px 0">' + d2(c.day) + ': ' + c.items.map(function(x, i){
      return '<b>' + x.hm + '</b> ' + phcEsc_(x.acc) + (i ? ' <span style="color:#8A5A00">(' + x.gap + ' phút)</span>' : ''); }).join(' → ') +
      (c.items.some(function(x){ return x.src === 'up'; }) ? ' <span style="color:#6B7A90">· có ảnh chỉ có giờ tải</span>' : '') + '</li>';
  }).join('');
  return '<div style="font-family:Aptos,Calibri,Arial,sans-serif;border:1.5px solid #D9981F;background:#FFF8E8;border-radius:8px;padding:12px 16px;margin:0 0 16px;color:#3A2A00;font-size:13px;line-height:1.5">' +
    '<div style="font-weight:700;font-size:14px;color:#8A3B00;margin-bottom:4px">CẢNH BÁO VỀ ĐỘ TIN CẬY CỦA THÔNG TIN CẬP NHẬT</div>' +
    '<div>Có <b>' + ch.n + ' ảnh</b> cuộc gặp khách hàng chụp cách nhau dưới ' + PHC.GAP + ' phút (ở các khách khác nhau):</div>' +
    '<ul style="margin:6px 0 8px 18px;padding:0">' + list + '</ul>' +
    (note ? '<div><b>Giải trình của sales</b> (' + phcEsc_(note.at) + (note.by ? ' · ' + phcEsc_(note.by) : '') + '):<br>' + phcEsc_(note.text).replace(/\n/g, '<br>') + '</div>'
          : '<div style="color:#B83A2E"><b>Chưa có giải trình.</b></div>') + '</div>';
}
