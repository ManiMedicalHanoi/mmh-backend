/*═══════════════════════════════════════════════════════════════════════════
  MMH CALENDAR — BACKEND 2 · BUSINESS TRIP  (thêm dưới dạng file .gs mới)
  MANI Medical Hanoi | Nguồn dữ liệu lịch CÔNG TÁC cho "MMH Calendar"

  → Dán TOÀN BỘ file này vào Apps Script project đang deploy ở URL:
    https://script.google.com/a/macros/manimedicalhanoi.com/s/AKfycbzAsSxx8NNQhjELq1dnASdXZo4o4sWvGaaHjIrBUkp8ljEb119hUnAdiiBXGfxRfgVniQ/exec

  ✅ AN TOÀN KHI DÁN CHUNG PROJECT: file này KHÔNG khai báo CONFIG hay helper
     nào ra phạm vi global — chỉ có doGet / doPost. Vì vậy sẽ KHÔNG xung đột
     với code sẵn có (const CONFIG, formatDate, columnLetterToIndex, …).
     Điều kiện duy nhất: project chưa có sẵn hàm tên doGet / doPost.
     (Nếu project đã có doGet → tạo 1 Apps Script project MỚI riêng cho lịch.)

  Sau khi dán:  Deploy ▸ Manage deployments ▸ (bản hiện tại) ▸ Edit ▸
                Version = "New version" ▸ Deploy.  Giữ nguyên URL /exec.

  Kiểm tra nhanh: mở thẳng URL /exec trên trình duyệt → phải thấy JSON
  {"ok":true,"source":"trip","events":[...]}.  Nếu thấy trang lỗi → còn xung đột.
═══════════════════════════════════════════════════════════════════════════*/

function doGet(e){ return MMHCAL_TRIP_(e); }
function doPost(e){ return MMHCAL_TRIP_(e); }

function MMHCAL_TRIP_(e){
  var CFG = {
    SHEET_ID: "15dAQYOG1aJRX-jByVmRFeSFOIPRtdVW7wDvwC_nxJUA",
    NAMES: ["MMH Travel report"],
    GID: 0,
    START: 4,                       // ★ dữ liệu bắt đầu ở dòng 4 (header ở dòng 3)
    C: { no:2, month:3, pic:4, start:5, finish:6, days:7, destination:8,
         coTraveler:9, purpose:10, costText:12, costTotal:13,
         equipment:15, folder:17, status:19 }
  };

  var cb = (e && e.parameter && e.parameter.callback) || "";
  var out;
  try { out = { ok:true, source:"trip", updated:now_(), events:build_() }; }
  catch(err){ out = { ok:false, error:String(err), source:"trip", events:[] }; }
  return reply_(out, cb);

  /*──────── BUILD ────────*/
  function build_(){
    var ss = SpreadsheetApp.openById(CFG.SHEET_ID);
    var c  = CFG.C;
    var sh = getSheet_(ss, CFG.NAMES, CFG.GID);
    if(!sh) return [];
    var last = sh.getLastRow();
    if(last < CFG.START) return [];
    var rows = sh.getRange(CFG.START, 1, last-CFG.START+1, sh.getLastColumn()).getValues();
    var events = [];

    rows.forEach(function(r, i){
      var iso = toISO_(r[c.start-1]);
      if(!iso) return;
      var pic  = str_(r[c.pic-1]);
      var dest = str_(r[c.destination-1]);
      if(!pic && !dest) return;

      var total = num_(r[c.costTotal-1]);
      if(!total) total = sumVnd_(str_(r[c.costText-1]));   // suy ra từ text nếu ô Total trống

      var co = str_(r[c.coTraveler-1]);
      events.push({
        id:"trip-"+i, kind:"trip",
        date: iso,
        endDate: toISO_(r[c.finish-1]) || iso,
        days: num_(r[c.days-1]) || diffDays_(iso, toISO_(r[c.finish-1])),
        pic: pic,
        title: dest || pic,
        destination: dest,
        coTraveler: co ? co : "No",
        purpose: str_(r[c.purpose-1]),
        costTotal: total,
        costText: str_(r[c.costText-1]),
        equipment: str_(r[c.equipment-1]) || "N/A",
        folder: str_(r[c.folder-1]),
        status: str_(r[c.status-1]) || "Pending"
      });
    });

    events.sort(function(a,b){ return a.date < b.date ? -1 : 1; });
    return events;
  }

  /*──────── HELPERS (đều là local — không rò rỉ global) ────────*/
  function getSheet_(ss, names, gid){
    for(var k=0;k<names.length;k++){ var s=ss.getSheetByName(names[k]); if(s) return s; }
    if(gid!=null){ var all=ss.getSheets(); for(var i=0;i<all.length;i++) if(all[i].getSheetId()===gid) return all[i]; }
    return null;
  }
  function sumVnd_(text){
    if(!text) return 0;
    var sum=0, m, re=/([\d.,]{4,})\s*(?:vnd|đ|d)?/gi;
    while((m=re.exec(text))!==null){
      var n = parseInt(String(m[1]).replace(/[.,]/g,""),10);
      if(!isNaN(n) && n>=1000) sum += n;
    }
    return sum;
  }
  function num_(v){ if(v==null||v==="") return 0; if(typeof v==="number") return v;
    var n=parseInt(String(v).replace(/[^\d]/g,""),10); return isNaN(n)?0:n; }
  function diffDays_(a,b){ if(!a||!b) return 0;
    var d=(new Date(b)-new Date(a))/86400000; return d>=0 ? Math.round(d)+1 : 1; }
  function toISO_(v){
    if(v==null || v==="") return "";
    if(Object.prototype.toString.call(v)==="[object Date]" && !isNaN(v))
      return Utilities.formatDate(v, Session.getScriptTimeZone()||"Asia/Bangkok", "yyyy-MM-dd");
    var s=String(v).trim(), m;
    if((m=s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return m[1]+"-"+pad_(m[2])+"-"+pad_(m[3]);
    if((m=s.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return m[3]+"-"+pad_(m[2])+"-"+pad_(m[1]);
    if((m=s.match(/^(\d{4})(\d{2})(\d{2})$/)))               return m[1]+"-"+m[2]+"-"+m[3];
    return "";
  }
  function pad_(n){ n=String(n); return n.length<2 ? "0"+n : n; }
  function str_(v){ return v==null ? "" : String(v).trim(); }
  function now_(){ return Utilities.formatDate(new Date(), Session.getScriptTimeZone()||"Asia/Bangkok", "yyyy-MM-dd HH:mm"); }
  function reply_(obj, cb){
    var json=JSON.stringify(obj);
    if(cb) return ContentService.createTextOutput(cb+"("+json+")").setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  }
}