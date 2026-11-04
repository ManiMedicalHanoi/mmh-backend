/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH · FOLLOW UP TENDER — theo dõi gói thầu dao / chỉ khâu nhãn khoa theo địa bàn (web Tender Map, 04/11/2026)
   Chỉ có ở backend CRM Surgical VN. Sheet ẨN "FOLLOW UP TENDER" trong file CRM này (code tự tạo + tự ẩn).

   GHI NỐI TIẾP, KHÔNG BAO GIỜ SỬA / XOÁ DÒNG CŨ: mỗi lần PIC cập nhật 1 gói = 1 dòng mới (cùng "Mã theo dõi", "Lần" + 1)
   ⇒ giữ đủ lịch sử từng bước: Giới thiệu → Lên danh mục → Chốt cấu hình → Ra báo giá → Ra HSMT → Đang chấm thầu
   → Đã trúng / Đã trượt (hoặc Huỷ / dừng). Trạng thái hiện tại = dòng mới nhất của mã đó.

   Xác thực: phiên đăng nhập email công ty (tk do Training Hub ký, như Report Hub / CRM) — tfWho_ (MMH_TripFlow.gs).
   Không dùng dịch vụ Google mới (chỉ Spreadsheet đã có) ⇒ không phải cấp quyền lại.

     GET/POST action=fuMeta                    → { ok, v, stages }                       (không cần đăng nhập)
     GET/POST action=fuList  tk                → { ok, v, me, stages, cols, rows:[[…]] }  (mọi dòng, cũ → mới)
     POST     action=fuSave  tk rid case? fid hosp prov addr pkg tbmt ptype items[] value stage due note ll
                                               → { ok, rec:[…], cols }
   ════════════════════════════════════════════════════════════════════════════════════════ */
var FU = {
  VER: '1.0',
  TAB: 'FOLLOW UP TENDER',
  HDR: ['Thời gian cập nhật', 'Mã theo dõi', 'Lần', 'PIC', 'Email', 'Mã cơ sở', 'Cơ sở y tế', 'Tỉnh / thành', 'Địa chỉ',
        'Tên gói thầu', 'Số TBMT', 'Loại sản phẩm', 'Sản phẩm · SL ước tính', 'Tổng SL', 'Giá trị ước tính (VND)',
        'Bước', 'Giai đoạn', 'Ngày dự kiến', 'Tình hình (ghi chú)', 'Sản phẩm (JSON)', 'Mã yêu cầu', 'Nguồn', 'Toạ độ'],
  COLS: ['at', 'id', 'rev', 'pic', 'mail', 'fid', 'hosp', 'prov', 'addr', 'pkg', 'tbmt', 'ptype', 'itemsTxt', 'qty', 'value',
         'stage', 'stageName', 'due', 'note', 'items', 'rid', 'src', 'll'],
  STAGES: ['', 'Giới thiệu sản phẩm', 'Lên danh mục', 'Chốt cấu hình', 'Ra báo giá', 'Ra HSMT', 'Đang chấm thầu',
           'Đã trúng thầu', 'Đã trượt thầu', 'Huỷ / dừng theo dõi'],
  MAX_ITEMS: 40
};

function fuRoute_(action, p){
  try{
    if(action === 'fuMeta') return { ok:true, v:FU.VER, stages:FU.STAGES };
    if(action === 'fuList') return fuList_(p);
    if(action === 'fuSave') return fuSave_(p);
    return { ok:false, error:'Unknown action: ' + action };
  }catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}

function fuMe_(p){
  if(!tfS_(p && p.tk)) return { err:'Cần đăng nhập bằng email công ty.' };
  var me = tfWho_(p);
  if(me && me.err && /duyệt công tác/.test(me.err)) me.err = 'Cần đăng nhập bằng email công ty.';
  return me;
}

function fuSheet_(){
  var book = ss(), sh = book.getSheetByName(FU.TAB);
  if(!sh){
    sh = book.insertSheet(FU.TAB);
    sh.getRange(1, 1, 1, FU.HDR.length).setValues([FU.HDR]).setFontWeight('bold').setBackground('#CFE2F3');
    sh.setFrozenRows(1);
  } else {
    var h = sh.getRange(1, 1, 1, FU.HDR.length).getValues()[0];
    if(h.some(function(x, i){ return tfS_(x) !== FU.HDR[i]; })) sh.getRange(1, 1, 1, FU.HDR.length).setValues([FU.HDR]).setFontWeight('bold');
  }
  try{ if(!sh.isSheetHidden()) sh.hideSheet(); }catch(e){}
  return sh;
}

function fuRowOut_(r){
  r = r.map(function(v){ return typeof v === 'string' && v.charAt(0) === "'" ? v.slice(1) : v; });
  var at = r[0] instanceof Date && !isNaN(r[0]) ? Utilities.formatDate(r[0], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss') : tfS_(r[0]);
  var due = r[17] instanceof Date && !isNaN(r[17]) ? Utilities.formatDate(r[17], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : tfS_(r[17]);
  return [at, tfS_(r[1]), +r[2] || 1, tfS_(r[3]), tfS_(r[4]), tfS_(r[5]), tfS_(r[6]), tfS_(r[7]), tfS_(r[8]), tfS_(r[9]), tfS_(r[10]),
          tfS_(r[11]), tfS_(r[12]), +r[13] || 0, +r[14] || 0, +r[15] || 0, tfS_(r[16]), due, tfS_(r[18]), tfS_(r[19]), tfS_(r[20]),
          tfS_(r[21]), tfS_(r[22])];
}

function fuList_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var sh = fuSheet_(), last = sh.getLastRow(), rows = [];
  if(last >= 2){
    sh.getRange(2, 1, last - 1, FU.HDR.length).getValues().forEach(function(r){ if(tfS_(r[1])) rows.push(fuRowOut_(r)); });
  }
  return { ok:true, v:FU.VER, me:{ pic:me.pic, local:me.local, level:me.level, admin:!!me.admin }, stages:FU.STAGES, cols:FU.COLS, rows:rows };
}

/* chuỗi bắt đầu bằng = + - @ ⇒ thêm ' để Sheet không hiểu thành công thức */
function fuTxt_(v, max){ var s = tfS_(v).replace(/\r\n?/g, '\n'); if(max && s.length > max) s = s.slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function fuNum_(v){ var n = Number(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; }

function fuSave_(p){
  var me = fuMe_(p);
  if(me.err) return { ok:false, code:'AUTH', error:me.err };
  var hosp = tfS_(p.hosp), stage = parseInt(p.stage, 10) || 0;
  if(!hosp) return { ok:false, error:'Chưa chọn cơ sở y tế.' };
  if(!(stage >= 1 && stage < FU.STAGES.length)) return { ok:false, error:'Chưa chọn giai đoạn của gói thầu.' };
  var items = p.items;
  if(typeof items === 'string'){ try{ items = JSON.parse(items); }catch(e){ items = []; } }
  items = (Array.isArray(items) ? items : []).slice(0, FU.MAX_ITEMS).map(function(it){
    return { code:tfS_(it && it.code).slice(0, 40), qty:fuNum_(it && it.qty), kind:/^chi/i.test(tfS_(it && it.kind)) ? 'chi' : 'dao', name:tfS_(it && it.name).slice(0, 80) };
  }).filter(function(it){ return it.code; });
  var due = tfIso_(p.due);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try{
    var sh = fuSheet_(), last = sh.getLastRow(), id = tfS_(p['case']), rev = 1;
    var rid = tfS_(p.rid).slice(0, 80);
    if(last >= 2){
      var V = sh.getRange(2, 1, last - 1, FU.HDR.length).getValues();
      for(var i = 0; i < V.length; i++){
        if(rid && tfS_(V[i][20]) === rid) return { ok:true, dup:true, rec:fuRowOut_(V[i]), cols:FU.COLS };   /* gửi lại cùng mã yêu cầu */
        if(id && tfS_(V[i][1]) === id) rev = Math.max(rev, (+V[i][2] || 1) + 1);
      }
      if(id && rev === 1) return { ok:false, error:'Không tìm thấy gói đang theo dõi ' + id + '.' };
    } else if(id) return { ok:false, error:'Không tìm thấy gói đang theo dõi ' + id + '.' };
    if(!id) id = 'FU' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    var qty = items.reduce(function(a, it){ return a + it.qty; }, 0);
    var txt = items.map(function(it){ return it.code + ' × ' + (it.qty || '?'); }).join('; ');
    var row = [new Date(), id, rev, me.pic, me.local, fuTxt_(p.fid, 40), fuTxt_(hosp, 200), fuTxt_(p.prov, 60), fuTxt_(p.addr, 300),
      fuTxt_(p.pkg, 300), fuTxt_(p.tbmt, 60), fuTxt_(p.ptype, 40), fuTxt_(txt, 2000), qty, fuNum_(p.value), stage, FU.STAGES[stage],
      due, fuTxt_(p.note, 3000), JSON.stringify(items), rid, fuTxt_(p.src || 'Tender Map', 40), fuTxt_(p.ll, 40)];
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    return { ok:true, rec:fuRowOut_(row), cols:FU.COLS };
  } finally { lock.releaseLock(); }
}
