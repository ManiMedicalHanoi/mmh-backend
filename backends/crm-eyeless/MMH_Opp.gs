/*************************************************************************************************
 * MMH_Opp.gs — v1.0 (11/11/2026) · CƠ HỘI THẦU / MUA SẮM theo khách hàng — dữ liệu cho Working Map của app CRM (doanh số dự kiến).
 * FILE GIỐNG HỆT NHAU ở crm-dental · crm-eyeless · crm-thai · crm-thai-dental (sửa 1 nơi ⇒ chép sang nơi khác).
 * Surgical VN KHÔNG dùng file này: Working Map đọc / ghi Theo dõi thầu sẵn có (crm-surgical MMH_TenderFU.gs ▸ fuList / fuSave).
 *
 * Sheet "CƠ HỘI THẦU · MUA SẮM" (nhóm VN) / "OPPORTUNITIES" (nhóm Thái) — hiện, GHI NỐI TIẾP: mỗi lần cập nhật 1 cơ hội = 1 dòng mới
 * (cùng ID, Lần + 1), không sửa / xoá dòng cũ ⇒ giữ đủ lịch sử. Trạng thái hiện tại = dòng mới nhất của ID đó. Xoá = 1 dòng mới có cột Đã xoá = x.
 * Giai đoạn dùng CÙNG SỐ với Theo dõi thầu Surgical: 1 Chưa tiếp cận · 2 Đã giới thiệu tới chuyên môn · 3 Đang xây cấu hình · 4 Đã gửi báo giá · 5 Đang dự thầu ·
 *   7 Đã trúng thầu · 8 Trượt thầu · 9 Tạm dừng · 10 Không tham dự | mua sắm tư nhân 11 Giới thiệu · 12 Demo · 13 Đề xuất từ chuyên môn · 14 Ký hợp đồng mua sắm ·
 *   15 Đang sử dụng hàng · 18 Không thành công · 19 Dừng theo dõi.
 * Sản phẩm (cột JSON) = [{g: nhóm (vd. diaburs · jizai · composite), code: mã chi tiết (không bắt buộc), qty, price (không bắt buộc), cur: USD | VND | THB}]
 *   — nhập theo nhóm chỉ cần số lượng; có mã chi tiết thì bắt buộc đơn giá. Doanh số dự kiến (USD) = Σ SL × đơn giá quy đổi theo tỷ giá CỐ ĐỊNH OPP.RATE.
 * Ai: phiên email công ty (`tk`, Training Hub ký — tmWho_ ở MMH_TestMode.gs; không thêm dịch vụ Google ⇒ không phải cấp quyền lại).
 *   Sales thấy / sửa cơ hội của mình; trưởng nhóm / HOD / Giám đốc / Admin thấy + sửa mọi cơ hội của nhóm.
 *   GET/POST action=oppList  tk        → { ok, v, me, rows:[{id, rev, at, pic, acc, code, prov, kind, stage, lines, usd, due, note}] } (bản mới nhất mỗi ID, bỏ đã xoá)
 *   GET/POST action=oppSave  tk rid rec=<JSON {id?, acc, code, prov, kind, stage, lines, due, note, del?}> → { ok, rec }
 *************************************************************************************************/
var OPP = {
  VER: '1.0',
  RATE: { USD: 1, VND: 26700, THB: 33 },
  HDR_VI: ['Cập nhật lúc', 'ID', 'Lần', 'PIC', 'Email', 'Mã KH', 'Khách hàng', 'Tỉnh', 'Loại', 'Giai đoạn (số)', 'Giai đoạn', 'Sản phẩm', 'Doanh số dự kiến (USD)',
           'Mốc tiếp theo', 'Tình hình', 'Sản phẩm (JSON)', 'Mã yêu cầu', 'Đã xoá'],
  HDR_EN: ['Updated at', 'ID', 'Rev', 'PIC', 'E-mail', 'Account code', 'Account', 'Province', 'Type', 'Stage no.', 'Stage', 'Products', 'Est. sales (USD)',
           'Next date', 'Situation', 'Products (JSON)', 'Request ID', 'Deleted'],
  STG_VI: ['', 'Chưa tiếp cận', 'Đã giới thiệu tới chuyên môn', 'Đang xây cấu hình', 'Đã gửi báo giá', 'Đang dự thầu', '', 'Đã trúng thầu', 'Trượt thầu', 'Tạm dừng', 'Không tham dự',
           'Giới thiệu', 'Demo', 'Đề xuất từ chuyên môn', 'Ký hợp đồng mua sắm', 'Đang sử dụng hàng', '', '', 'Không thành công', 'Dừng theo dõi'],
  STG_EN: ['', 'Not approached', 'Introduced to specialists', 'Building specifications', 'Quotation sent', 'Bidding', '', 'Won', 'Lost', 'Paused', 'Not participating',
           'Introduction', 'Demo', 'Proposal from clinicians', 'Purchase contract', 'Using products', '', '', 'Unsuccessful', 'Stopped']
};
function oppEn_(){ try{ return typeof CFG !== 'undefined' && /thai/i.test(String(CFG.TEAM || '')); }catch(e){ return false; } }
function oppS_(v){ return v == null ? '' : String(v).trim(); }
function oppBook_(){ return (typeof ss === 'function') ? ss() : ss_(); }
function oppSheet_(){
  var en = oppEn_(), name = en ? 'OPPORTUNITIES' : 'CƠ HỘI THẦU · MUA SẮM', book = oppBook_(), s = book.getSheetByName(name);
  if(!s){
    var H = en ? OPP.HDR_EN : OPP.HDR_VI;
    s = book.insertSheet(name);
    s.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#003047').setFontColor('#FFFFFF').setWrap(true);
    s.setFrozenRows(1);
    [130, 120, 45, 80, 170, 100, 220, 110, 80, 60, 170, 280, 110, 100, 260, 200, 120, 60].forEach(function(w, i){ try{ s.setColumnWidth(i + 1, w); }catch(e){} });
    try{ s.getRange(1, 1).setNote(en ? 'Written by the CRM app (Working Map). Append only: one row per update, the newest row of an ID is the current state.'
                                     : 'Do app CRM (Working Map) ghi. Ghi nối tiếp: mỗi lần cập nhật 1 dòng, dòng mới nhất của 1 ID là trạng thái hiện tại.'); }catch(e){}
  }
  return s;
}
function oppWho_(p){
  var me = (typeof tmWho_ === 'function') ? tmWho_(p.tk) : { err:'no session check' };
  if(me.err) return { err:(oppEn_() ? 'Please sign in with your company e-mail (' : 'Cần đăng nhập bằng email công ty (') + me.err + ')' };
  if(typeof MMH_TEST !== 'undefined' && MMH_TEST && MMH_TEST.sb && typeof tmSbWho_ === 'function'){ try{ var w = tmSbWho_(); if(w && w.pic) me.pic = w.pic; }catch(e){} }
  me.all = !!(me.admin || /^(director|hod|lead|manager)$/.test(String(me.level || '')));
  return me;
}
function oppEq_(a, b){ var x = oppS_(a).toLowerCase(), y = oppS_(b).toLowerCase(); return !!x && x === y; }
function oppUsd_(lines){
  return (lines || []).reduce(function(s, l){ var q = parseFloat(l.qty), pr = parseFloat(l.price), r = OPP.RATE[l.cur] || 1; return s + ((q > 0 && pr > 0) ? q * pr / r : 0); }, 0);
}
function oppRows_(){
  var s = oppSheet_(), n = s.getLastRow() - 1; if(n < 1) return [];
  var tz = Session.getScriptTimeZone();
  return s.getRange(2, 1, n, 18).getValues().filter(function(r){ return oppS_(r[1]); }).map(function(r){
    var lines = []; try{ lines = JSON.parse(oppS_(r[15]) || '[]'); }catch(e){}
    var d = function(v){ return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : oppS_(v).slice(0, 10); };
    return { at:(r[0] instanceof Date ? Utilities.formatDate(r[0], tz, 'yyyy-MM-dd HH:mm') : oppS_(r[0])), id:oppS_(r[1]), rev:+r[2] || 1, pic:oppS_(r[3]),
      code:oppS_(r[5]), acc:oppS_(r[6]), prov:oppS_(r[7]), kind:/^(pri|mua|purchase)/i.test(oppS_(r[8])) ? 'pri' : 'pub', stage:+r[9] || 0,
      lines:lines, usd:+r[12] || 0, due:d(r[13]), note:oppS_(r[14]), rid:oppS_(r[16]), del:/^x$/i.test(oppS_(r[17])) };
  });
}
function oppLatest_(rows){
  var cur = {}; rows.forEach(function(r){ if(!cur[r.id] || r.rev >= cur[r.id].rev) cur[r.id] = r; });
  return Object.keys(cur).map(function(k){ return cur[k]; });
}
function oppList_(p){
  var me = oppWho_(p); if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var rows = oppLatest_(oppRows_()).filter(function(r){ return !r.del && (me.all || oppEq_(r.pic, me.pic)); });
  rows.forEach(function(r){ delete r.rid; delete r.del; });
  return { ok:true, v:OPP.VER, me:{ pic:me.pic, all:me.all }, rows:rows };
}
function oppSave_(p){
  var me = oppWho_(p); if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var en = oppEn_(), rec = p.rec;
  if(typeof rec === 'string'){ try{ rec = JSON.parse(rec); }catch(e){ rec = null; } }
  if(!rec || typeof rec !== 'object') return { ok:false, error:'rec?' };
  var stage = parseInt(rec.stage, 10) || 0, STG = en ? OPP.STG_EN : OPP.STG_VI, del = !!rec.del;
  if(!del && !STG[stage]) return { ok:false, code:'STAGE', error:en ? 'Please choose a stage.' : 'Chưa chọn giai đoạn.' };
  var acc = oppS_(rec.acc).slice(0, 200); if(!acc) return { ok:false, error:en ? 'Please choose an account.' : 'Chưa chọn khách hàng.' };
  var lines = (Array.isArray(rec.lines) ? rec.lines : []).slice(0, 40).map(function(l){
    var cur = /^(USD|VND|THB)$/.test(oppS_(l && l.cur)) ? oppS_(l.cur) : (en ? 'THB' : 'VND');
    return { g:oppS_(l && l.g).slice(0, 30), code:oppS_(l && l.code).slice(0, 80), qty:Math.max(0, parseFloat(l && l.qty) || 0), price:Math.max(0, parseFloat(l && l.price) || 0) || '', cur:cur };
  }).filter(function(l){ return l.qty > 0; });
  if(!del && !lines.length) return { ok:false, code:'QTY', error:en ? 'Enter a quantity on at least one product line.' : 'Nhập số lượng cho ít nhất 1 dòng sản phẩm.' };
  if(!del && lines.some(function(l){ return l.code && !(l.price > 0); })) return { ok:false, code:'PRICE', error:en ? 'A line with a detailed code needs a unit price.' : 'Dòng có mã chi tiết cần đơn giá.' };
  var rid = oppS_(p.rid).slice(0, 80);
  var lock = LockService.getScriptLock(); if(!lock.tryLock(25000)) return { ok:false, error:en ? 'The system is busy — please try again.' : 'Hệ thống đang bận — thử lại sau ít giây.' };
  try{
    var rows = oppRows_(), id = oppS_(rec.id), prev = null, rev = 1;
    if(rid){ var hit = rows.filter(function(r){ return r.rid === rid; })[0]; if(hit){ delete hit.rid; return { ok:true, dup:true, rec:hit }; } }
    if(id){
      rows.forEach(function(r){ if(r.id === id){ rev = Math.max(rev, r.rev + 1); if(!prev || r.rev >= prev.rev) prev = r; } });
      if(!prev) return { ok:false, code:'ID', error:en ? 'This opportunity was not found — reload and try again.' : 'Không tìm thấy cơ hội này — tải lại rồi thử lại.' };
      if(!me.all && !oppEq_(prev.pic, me.pic)) return { ok:false, code:'OWNER', error:en ? 'Only the PIC of this opportunity (or a manager) can change it.' : 'Chỉ PIC của cơ hội (hoặc quản lý) được sửa.' };
    } else id = 'OP' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
    if(del && prev){ lines = prev.lines; stage = prev.stage; }
    var pic = prev ? prev.pic : (oppS_(rec.pic) && me.all ? oppS_(rec.pic) : me.pic), usd = Math.round(oppUsd_(lines) * 100) / 100;
    var txt = lines.map(function(l){ return (l.code || l.g) + ' ' + l.qty + (l.price ? ' × ' + l.price + ' ' + l.cur : ''); }).join('; ');
    var kind = (rec.kind === 'pri' || stage >= 11) ? 'pri' : 'pub';
    var row = [new Date(), id, rev, pic, me.email || '', oppS_(rec.code).slice(0, 40) || (prev ? prev.code : ''), acc, oppS_(rec.prov).slice(0, 80) || (prev ? prev.prov : ''),
      kind === 'pri' ? (en ? 'Purchase' : 'Mua sắm') : (en ? 'Tender' : 'Thầu'), stage, STG[stage] || '', txt.slice(0, 2000), usd,
      oppS_(rec.due).slice(0, 10), oppS_(rec.note).slice(0, 2000), JSON.stringify(lines), rid, del ? 'x' : ''];
    var s = oppSheet_(); s.getRange(s.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    return { ok:true, rec:{ at:Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), id:id, rev:rev, pic:pic, code:row[5], acc:acc, prov:row[7], kind:kind,
      stage:stage, lines:lines, usd:usd, due:row[13], note:row[14], del:del } };
  } finally { lock.releaseLock(); }
}
function oppRoute_(a, p){
  try{
    if(a === 'oppList') return oppList_(p);
    if(a === 'oppSave') return oppSave_(p);
    if(a === 'oppMeta') return { ok:true, v:OPP.VER, rate:OPP.RATE, stages:oppEn_() ? OPP.STG_EN : OPP.STG_VI };
  }catch(e){ return { ok:false, error:String(e && e.message || e) }; }
  return null;
}
