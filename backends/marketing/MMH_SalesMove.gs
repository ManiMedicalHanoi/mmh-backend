/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH_SalesMove.gs — v1.0 (10/10/2026) · CHỈ backend Marketing
   "AI VỀ NHÀ ĐẤY" (người dùng yêu cầu): dữ liệu của Sales Team (Dental / Surgical / Eyeless) không nằm trong file MKT nữa.
   ① Lịch đi địa bàn: KHÔNG chép từ file CRM sang tab WEEKYLY new nữa (Kết nối file sales.gs ▸ vsSync tắt).
      Trigger cũ vẫn chạy ⇒ mỗi lượt chỉ dọn các dòng đã chép trước đây (cột U bắt đầu bằng "V:" / "VK:").
      Đơn hàng "Tư vấn bán hàng" (cột U "O:") KHÔNG đụng tới.
   ② Công việc khác của Sales: app CRM chép sang sheet ALL TASK của file CRM nhóm (MMH_SalesTasks.gs ▸ atImport),
      chép xong gọi salesTasksDrop ⇒ xoá đúng các key task đó (khớp tên + PIC + ngày bắt đầu) khỏi file MKT.
   ════════════════════════════════════════════════════════════════════════════════════════ */
var VS_MOVED = true;

/* ① dọn dòng lịch đi địa bàn đã chép (gọi từ đầu vsSync khi VS_MOVED) */
function vsMovedPurge_(){
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(20000)) return { ok:false, error:'Đang có tiến trình khác, thử lại sau.' };
  var removed = 0;
  try{
    var sh = shWeekly(); if(!sh) return { ok:false, error:'Không mở được sheet WEEKLY' };
    var last = sh.getLastRow(); if(last < WEEKLY_DATA_ROW) return { ok:true, moved:true, removed:0 };
    var col = (typeof VISIT_COL_KEY !== 'undefined') ? VISIT_COL_KEY : 21;
    if(sh.getMaxColumns() < col) return { ok:true, moved:true, removed:0 };
    var v = sh.getRange(WEEKLY_DATA_ROW, col, last - WEEKLY_DATA_ROW + 1, 1).getValues(), rows = [];
    v.forEach(function(r, i){ if(/^VK?:/.test(String(r[0] || ''))) rows.push(WEEKLY_DATA_ROW + i); });
    /* xoá theo cụm liên tiếp, từ dưới lên */
    for(var i = rows.length - 1; i >= 0; ){
      var end = rows[i], start = end; i--;
      while(i >= 0 && rows[i] === start - 1){ start = rows[i]; i--; }
      sh.deleteRows(start, end - start + 1); removed += end - start + 1;
    }
    if(removed){ SpreadsheetApp.flush(); if(typeof touchVersion === 'function') touchVersion(); }
  } finally { try{ lock.releaseLock(); }catch(e){} }
  return { ok:true, moved:true, removed:removed, message:'Lịch đi địa bàn của Sales không còn chép sang file MKT' + (removed ? ' — đã dọn ' + removed + ' dòng cũ.' : '.') };
}

/* ② xoá các key task Sales đã chuyển sang file CRM. p.items = [{ keyTask, pic, start }] */
function smNorm_(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim(); }
function smIso_(v){
  if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd');
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[0] : '';
}
function smSalesPic_(pic){
  var k = smNorm_(pic);
  for(var e in USER_MAP){ var u = USER_MAP[e]; if(smNorm_(u.pic) === k) return /sales team/i.test(u.team || ''); }
  return false;
}
function smDrop_(user, p){
  if(typeof tfWho_ === 'function'){ var me = tfWho_(p); if(me.err) return { ok:false, code:'AUTH', error:me.err }; }
  var items = p.items; if(typeof items === 'string'){ try{ items = JSON.parse(items); }catch(e){ items = null; } }
  if(!Array.isArray(items) || !items.length) return { ok:true, removed:0, keys:0 };
  var want = {}; items.forEach(function(x){ want[smNorm_(x.keyTask) + '|' + smNorm_(x.pic) + '|' + smIso_(x.start)] = 1; });
  var lock = LockService.getScriptLock();
  if(!lock.tryLock(25000)) return { ok:false, error:'Hệ thống đang bận, thử lại sau vài giây.' };
  var removed = 0, keys = 0, skipped = 0;
  try{
    var sh = shWeekly(), last = sh.getLastRow(); if(last < WEEKLY_DATA_ROW) return { ok:true, removed:0, keys:0 };
    var W = Math.min(23, sh.getMaxColumns()) - 1;
    var v = sh.getRange(WEEKLY_DATA_ROW, 2, last - WEEKLY_DATA_ROW + 1, W).getValues();
    /* dựng các khối key task (key + sub bên dưới tới key kế tiếp) */
    var blocks = [], cur = null;
    v.forEach(function(r, i){
      var row = WEEKLY_DATA_ROW + i, F = String(r[4] || '').trim(), G = String(r[5] || '').trim();
      var synced = !!String(r[19] || '').trim() || (W >= 22 && /^trip/.test(String(r[21] || '')));   /* cột U khoá đồng bộ · cột W lịch công tác */
      if(F){ cur = { start:row, end:row, type:String(r[3] || ''), key:F, pic:String(r[6] || ''), st:smIso_(r[8]), synced:synced }; blocks.push(cur); }
      else if(G && cur){ cur.end = row; if(synced) cur.synced = true; }
    });
    var del = blocks.filter(function(b){
      if(!want[smNorm_(b.key) + '|' + smNorm_(b.pic) + '|' + b.st]) return false;
      if(b.synced || !(/^sales-/i.test(b.type) || smSalesPic_(b.pic))){ skipped++; return false; }
      return true;
    });
    del.sort(function(a, b){ return b.start - a.start; }).forEach(function(b){ sh.deleteRows(b.start, b.end - b.start + 1); removed += b.end - b.start + 1; keys++; });
    if(removed){ SpreadsheetApp.flush(); if(typeof touchVersion === 'function') touchVersion(); }
    try{ if(keys && typeof logActivity === 'function') logActivity(user.pic || 'CRM', 'delete', 'chuyển ' + keys + ' key task Công việc khác của Sales sang file CRM', '', ''); }catch(e){}
  } finally { try{ lock.releaseLock(); }catch(e){} }
  return { ok:true, removed:removed, keys:keys, skipped:skipped, message:'Đã chuyển ' + keys + ' key task của Sales ra khỏi file MKT.' };
}
