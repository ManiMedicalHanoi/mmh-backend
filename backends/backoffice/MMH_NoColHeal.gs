/* ══════════════ ⭐ 07/11/2026 — TỰ GỠ Ô CHẶN CỘT No. (B) CỦA SHEET WEEKLY ══════════════
 * Cột No. dùng MỘT công thức mảng ở B7 (MAP / ARRAYFORMULA) trải xuống cả cột. Chỉ cần 1 ô bên dưới có
 * nội dung (gõ / dán đè, vd. dán cả dòng từ chỗ khác) là công thức không trải được ⇒ B7 = #REF!,
 * mọi ô No. trống ⇒ backend bỏ qua mọi dòng (readWeeklyRaw cần số No.) ⇒ Report Hub không thấy việc nào.
 * Sự cố 06/11/2026: B1024, B1032, B1033, B1034 bị dán công thức FY ⇒ nhóm Back office trắng dữ liệu.
 * Cách gỡ: B7 là công thức mảng mà đang báo lỗi ⇒ xoá nội dung các ô cột B dưới B7 (chỉ cột B; khi công thức
 * đang lỗi thì mọi ô có nội dung ở đó đều là ô chặn). Tối đa 1 lần / 2 phút, chỉ đọc 1 ô khi không lỗi.
 * Lần gỡ gần nhất: Script Property NOCOL_HEAL_LAST (giờ · ô · nội dung cũ); xem qua ?action=sheets. */
var NOCOL_ARR_RE = /^=\s*(ARRAYFORMULA|MAP|BYROW|SCAN)\s*\(/i;

function noColHeal_(force){
  try{
    if(force !== true && !throttleOk('nocol_heal', 120)) return null;
    var sh = shWeekly(); if(!sh) return null;
    var top = sh.getRange(WEEKLY_DATA_ROW, 2);
    var dv = String(top.getDisplayValue() || '');
    if(dv.charAt(0) !== '#') return null;                      /* không lỗi ⇒ thôi (chỉ đọc 1 ô) */
    if(!NOCOL_ARR_RE.test(String(top.getFormula() || ''))) return null;
    var last = sh.getLastRow();
    if(last <= WEEKLY_DATA_ROW) return null;
    var rng = sh.getRange(WEEKLY_DATA_ROW + 1, 2, last - WEEKLY_DATA_ROW, 1);
    var fs = rng.getFormulas(), vs = rng.getValues(), cells = [], olds = [];
    for(var i = 0; i < vs.length; i++){
      var f = fs[i][0], v = vs[i][0];
      if(f || (v !== '' && v !== null)){
        cells.push('B' + (WEEKLY_DATA_ROW + 1 + i));
        olds.push(String(f || v).slice(0, 80));
      }
    }
    if(!cells.length) return { ok:false, error:dv, cleared:[] };   /* lỗi vì lý do khác ⇒ không đụng gì */
    sh.getRangeList(cells).clearContent();
    SpreadsheetApp.flush();
    var log = { at: new Date().toISOString(), error: dv, cleared: cells, old: olds };
    try{ PropertiesService.getScriptProperties().setProperty('NOCOL_HEAL_LAST', JSON.stringify(log).slice(0, 8000)); }catch(e){}
    try{ touchVersion(); }catch(e){}
    return log;
  }catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}

/* tình trạng cột No. cho ?action=sheets */
function noColInfo_(){
  try{
    var sh = shWeekly(); if(!sh) return null;
    var top = sh.getRange(WEEKLY_DATA_ROW, 2), last = null;
    try{ last = JSON.parse(PropertiesService.getScriptProperties().getProperty('NOCOL_HEAL_LAST') || 'null'); }catch(e){}
    return { top: String(top.getDisplayValue() || ''), array: NOCOL_ARR_RE.test(String(top.getFormula() || '')), lastHeal: last };
  }catch(e){ return { error:String(e && e.message || e) }; }
}
