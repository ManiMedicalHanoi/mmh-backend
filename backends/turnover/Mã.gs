/* ════════════════════════════════════════════════════════════════════
   MMH TURNOVER — BACKEND + DASHBOARD + PPT  ·  FILE DUY NHẤT
   Code.gs                                                      v6.2
   ⭐ v6.2 (02/10/2026) · CHỈ SỬA PHẦN 7 (tab KPI TURNOVER), các phần khác giữ nguyên 100%:
     Tab KPI TURNOVER tự theo cột Agg của từng mã (file KPI gửi sang _KPI_SRC):
       · Agg = SUM (Target theo tháng, file KPI đã đổi): Actual tháng = doanh số của tháng đó (tháng đã đóng),
         Target quý = tổng 3 tháng, Actual quý = tổng 3 tháng, Actual FY = tổng các tháng.
       · Agg = LAST (Target lũy kế như cũ): giữ cách tính lũy kế cũ.
     Sau khi dán: menu 📊 MMH Report ▸ Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR 1 lần để dựng lại tab KPI TURNOVER.
   ⭐ v6.1 (02/10/2026) · CHỈ SỬA PHẦN 7 (KPI TURNOVER), các phần khác giữ nguyên 100%:
     ① Công thức tab _KPI_ACT bọc ARRAYFORMULA ⇒ bộ lọc nhiều giá trị {"Dental";"MMG"}, {"VIET THAI";"MECI"}…
        cộng đủ mọi giá trị (trước chỉ cộng giá trị đầu ⇒ thiếu MMG, thiếu MECI).
     ② KHÔNG còn ghi Actual sang sheet 3. Detail KPI của file KPI khi sửa SUM TURNOVER: việc này do KpiSyncCenter
        (file KPI) làm, tính thẳng từ SUM TURNOVER (Type 1 Turnover, lọc Segment Report). Tránh 2 nơi ghi 2 số khác nhau.
     ③ Thêm F6-02, F6-02a/b/c (Type JIZAI) và điều kiện Segment Report = Surgical cho F1-01, F2-01 → F2-04 (để tab
        KPI TURNOVER khớp KPI). Sau khi dán: menu 📊 MMH Report ▸ Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR 1 lần.
     Code này không đọc / ghi cột Target của file KPI (Target chỉ do file KPI đẩy sang tab _KPI_SRC).
   ────────────────────────────────────────────────────────────────────
   File này gộp 4 phần vào MỘT file .gs. Dán đè lên Code.gs hiện tại
   là xong — KHÔNG cần tạo thêm file nào, KHÔNG cần bật API nào.

     PHẦN 1 · BACKEND     — nguyên văn Code.gs v2.1 đang chạy:
                            doGet / getTurnoverData_ / getExplanations_ /
                            getEditLog_ / logEdit / installEditLogTrigger.
                            GIỮ NGUYÊN 100%, không sửa một dòng nào,
                            nên WebApp phục vụ file HTML chạy y như cũ.
     PHẦN 2 · MODEL       — lớp tổng hợp số liệu dùng chung cho
                            Dashboard và PPT.
     PHẦN 2A · CÔNG THỨC  — sinh SUMIFS vào tab ẩn "_DashCalc".
     PHẦN 3 · DASHBOARD   — tab "Dashboard" REALTIME.
     PHẦN 4 · PPT EXPORT  — xuất .pptx 9 slide theo đúng template.
     PHẦN 5 · TRIGGER     — tự dựng lại Dashboard khi đổi bộ lọc.

   ── DASHBOARD REALTIME HOẠT ĐỘNG THẾ NÀO ───────────────────────────
   Dashboard KHÔNG ghi số cứng. Mọi ô số là công thức:
     · Tab ẩn "_DashCalc" chứa SUMIFS đọc thẳng tab "SUM TURNOVER"
       (lọc theo Type / Month / Country / Segment / Distributor / FY).
     · Dashboard chỉ SUMPRODUCT các dòng đó với "mặt nạ kỳ" — cũng là
       công thức đọc từ chính ô dropdown Period / Quarter / Month.
     · GAP = ô Forecast − ô Budget;  %GAP = GAP / Budget.
   Hệ quả:
     · Sửa số trong SUM TURNOVER  → Dashboard đổi NGAY.
     · Đổi Period / Quarter / Month / Data → số đổi NGAY.
     · Đổi View → cần dựng lại bố cục, trigger tự làm việc đó.

   ── BỘ LỌC TRÊN DASHBOARD (hàng 5) ─────────────────────────────────
     VIEW    : Overview · By Segment · By Country · By Distributor ·
               GAP Analysis · Explanations
     DATA    : Turnover (K USD) · Jizai (Sheet before FY68, K USD from FY68)
     PERIOD  : FY (full year) · Quarter · Month
     QUARTER : Q1..Q4          MONTH : 12 tháng của FY    FY : FY67, FY68 … (⭐ v4.0, ô L5)
   View "Overview" có bảng theo 6 nhóm đúng như ảnh yêu cầu:
     TH Surgical · TH Dental/MMG · VN Surgical · VN Dental ·
     VN MMG · VN Eyeless

   ── CÀI ĐẶT ────────────────────────────────────────────────────────
   1) Mở Google Sheet → Extensions → Apps Script.
   2) Mở file Code.gs, XOÁ HẾT, dán toàn bộ file này vào, Ctrl+S.
      (Nếu trước đó đã tạo file MMH_Report riêng thì XOÁ file đó đi,
       vì mọi thứ đã nằm trong file này.)
   3) Chạy hàm checkReportSetup một lần để cấp quyền và soát cấu hình.
   4) Chạy hàm buildDashboard.
   5) Mở lại Sheet → menu 📊 MMH Report →
        "Cài trigger tự refresh Dashboard".
   6) Muốn xuất PowerPoint: menu 📊 MMH Report →
        "Xuất PowerPoint (theo bộ lọc Dashboard)".

   ⚠ Deploy lại WebApp (Deploy → Manage deployments → New version)
     nếu muốn HTML dùng bản code này; phần backend không đổi nên
     không deploy lại cũng không sao.

   ── OAUTH SCOPES (appsscript.json) ─────────────────────────────────
     "https://www.googleapis.com/auth/spreadsheets"
     "https://www.googleapis.com/auth/drive"
     "https://www.googleapis.com/auth/script.scriptapp"
   ════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════
   v6.0 — (02/10/2026) OVERVIEW / SEGMENT-COUNTRY-DISTRIBUTOR: dropdown F/A SOURCE
          removed. Forecast / Actual always follows one rule: Actual when the
          month is due and Actual is entered, otherwise Forecast (same as the
          web). BUDGET VIEW moved to cell K6 on both sheets.
   v5.9 — (02/10/2026) TYPE NAMES: the Type column of SUM TURNOVER may use any name;
          rows are grouped by the word they contain (Jizai › Composite ›
          Turnover), so a renamed Type keeps its LY / YoY and its KPI codes.
          From FY68 Jizai and Composite are in USD like Turnover: the reports,
          the web and the PPT show K USD; Jizai before FY68 stays in sheets and
          its YoY vs an FY in another unit is left blank (not comparable).
   v5.8 — (02/10/2026) OVERVIEW / SEGMENT-COUNTRY-DISTRIBUTOR: new dropdown
          BUDGET VIEW (Budget Mani / Budget Distributor) drives every Budget,
          Vs. Budget and Achievement figure. New columns Forecast and Actual
          before Forecast / Actual. Charts removed. SEGMENT-COUNTRY-DISTRIBUTOR
          gets BUDGET cards (single + YTD). Web payload carries budgetDist.
   v5.7 — (01/10/2026) Charts: data under each chart on the same sheet (v5.6 used
          another tab, which Google refuses). Font Lexend on every generated
          sheet and chart. NEW PART 7: sheet "KPI TURNOVER" + two-way link with
          the MMH KPI FY68 file (targets / weights in, turnover actuals out, on
          every edit). The KPI file needs TurnoverLink.gs (run ktSetup once).
   v5.6 — (01/10/2026) Charts on OVERVIEW / SEGMENT-COUNTRY-DISTRIBUTOR
          were empty: their data sat in columns hidden by the build. Chart
          data now lives on the hidden helper tab _YQ_Chart.
   v5.5 — (01/10/2026) YEAR is now "OVERVIEW", QUARTER-MONTH is now
          "SEGMENT-COUNTRY-DISTRIBUTOR" (the build renames the old tabs).
          Achievement cards replaced by GAP cards (% with the money gap
          below). Softer progress colours, cleaner charts, Single and
          Cumulative halves framed.
   v5.4 — SOFT COLORS (30/09/2026): YEAR / QUARTER-MONTH / DASHBOARD use
          the palette of the FY68 Market & Strategy Report template
          (white, slate titles, soft blue, cream highlights).
   v5.2 — explanations removed from YEAR / QUARTER-MONTH (web shows them
          on hover). Re-running the build deletes the old _YQ_Expl tab.
   v5.1 — fix #VALUE! in Budget: helper ranges always the same size.
   ════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════
   v5.0 — YEAR & QUARTER-MONTH SHEETS (30/09/2026)
   ────────────────────────────────────────────────────────────────────
   NEW  PART 6 (end of this file) + menu 📊 MMH Report →
        "📅 Build YEAR & QUARTER-MONTH sheets" (function
        buildYearQuarterSheets). It creates, inside this Google Sheet:
          · YEAR           — FY → Quarter → Month, Segment, 6 groups,
                             Distributors, Country report × Segment
          · QUARTER-MONTH  — Single + Cumulative for one quarter/month,
                             same sections + "Lookup by item" explorer
          · hidden helpers _YQ_Lists, _YQ_Key, _YQ_Expl
        Everything in English, every number a live SUMIFS formula, every
        explanation a live lookup on "Forecast Explanation Input"
        (key = FY + time + Single/Cumulative + Country report + Segment +
        Distributor, newest Ver wins).
   ALSO Menu and web-facing error messages in English · EditLog ignores
        dropdown clicks on the new sheets (so the web does not reload
        for them). The web backend (doGet & co.) is otherwise unchanged.
   ════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════
   v4.1 — cache 10 phút (tự làm mới khi sửa Sheet), &fresh=1 để bỏ qua
          cache, mỗi dòng trả thêm "phys" (nước thật) + payload.ctyTh để
          web so sánh cùng kỳ năm trước theo cùng một cách gom nước.
   v4.0 — THAY ĐỔI (26/09/2026)
   ────────────────────────────────────────────────────────────────────
   1) FY ĐỘNG: web / Dashboard / PPT đọc được FY67, FY68, … (không còn
      viết cứng FY67). Web gọi ?action=getTurnoverData&fy=FY68; bỏ trống
      → tự chọn FY chứa tháng hiện tại. Dashboard có thêm ô chọn FY (L5).
   2) QUY TẮC ACTUAL/FORECAST MỚI (không đụng tới cột Q của Sheet):
        Tháng đã qua (tháng hiện tại tính từ ngày 25) VÀ đã có Actual
        → dùng Actual; còn lại → dùng Forecast.
      Trước đây tới ngày 25 là chuyển sang Actual kể cả khi chưa ai nhập
      Actual → số tụt về 0.
   3) GOM NƯỚC theo cột "Country" (nước thật) + bảng COUNTRY_GROUPS theo
      FY, thay vì cột "Country report" gõ tay (đang ghi lẫn lộn ở FY68).
   4) NPP gom theo Tên + Segment (trước chỉ theo tên → NPP bán nhiều
      segment bị gán sai nhóm).
   5) Dashboard: vùng SUMIFS mở (dòng thêm mới vẫn được cộng); ô Month
      không còn bị Sheets tự đổi thành ngày; khoá chống dựng chồng; tab
      đích là "DASHBOARD_new" và chỉ ghi đè khi A1 có dấu của script.
   6) Kiểm tra sức khỏe dữ liệu: ?action=getHealth — dòng không khớp giữa
      tab nhập và SUM TURNOVER, giá trị có dấu cách thừa, tháng đã qua
      chưa có Actual, Forecast nhập ít, bản giải thích ghi ngày tương lai.
   7) Cache chia khúc (vượt được giới hạn 100KB), lastModified thật,
      sắp xếp version theo số, EditLog bỏ qua thao tác trên Dashboard.
   ════════════════════════════════════════════════════════════════════ */


/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PHẦN 1 — BACKEND                                                ║
   ╚══════════════════════════════════════════════════════════════════╝ */

// ─── CONFIG ───────────────────────────────────────────────────────
const CONFIG = {
  SPREADSHEET_ID : "1bujnLrxerjUM1gR3aOoy3r4gvTp4pNyPwJM-ra5iFe8",

  // Tab 1: TURNOVER
  SHEET_NAME     : "SUM TURNOVER",
  HEADER_ROW     : 4,
  DATA_START_ROW : 6,

  // Tab 2: EXPLANATIONS
  EXPL_SHEET_NAME     : "Forecast Explanation Input",
  EXPL_HEADER_ROW     : 3,
  EXPL_DATA_START_ROW : 5,

  // ⭐ v4.0 — FY_FILTER / VALID_MONTHS là FY ĐANG XEM, do setFyContext_()
  //   gán lại mỗi lần chạy. Giá trị dưới đây chỉ là mặc định ban đầu.
  FY_FILTER      : "FY67",
  FY_DEFAULT     : "",                          // "" = tự chọn FY chứa tháng hiện tại
  FY_ANCHOR      : { fy:67, startYear:2025 },   // FY67 = 09/2025 → 08/2026
  FY_START_MONTH : 9,                           // FY bắt đầu từ tháng 9
  ACTUAL_CUTOFF_DAY : 25,                       // tháng hiện tại: từ ngày này mới xét Actual
  TURNOVER_TYPE  : "1 Turnover",
  USD_FROM_FY    : 68,      /* ⭐ v5.9 — từ FY68 Jizai / Composite cũng tính bằng USD như Turnover */

  VALID_MONTHS   : ["202509","202510","202511","202512",
                    "202601","202602","202603","202604",
                    "202605","202606","202607","202608"],

  COLUMN_MAP : {
    type        : "Type",
    fy          : "FY",
    quarter     : "Quater",
    month       : "Month",
    segment     : "Segment Report",
    distributor : "Distributor",
    country     : "Country report",
    products    : "Products",              /* ⭐ v5.3 — nhóm sản phẩm, Dental CRM cần cột này */
    budget      : "Budget Mani USD",
    budgetDist  : "Budget Distributor USD",  /* ⭐ v5.8 — cột N, cho BUDGET VIEW = Budget Distributor */
    forecast    : "Actual/Forecast USD",   // cột Q — chỉ dùng khi không tìm thấy 2 cột dưới
    fcRaw       : "Forecast USD",          /* ⭐ v4.0 — cột O */
    actual      : "Actual USD",            /* ⭐ v4.0 — cột P */
    countryPhys : "Country"                /* ⭐ v4.0 — cột J (nước thật) */
  },

  EXPL_COLUMN_MAP : {
    type        : "Type",
    country     : "Country report",
    segment     : "Segment",
    distributor : "Distributor",
    budget      : "Budget Mani",
    forecast    : "Forecast/Actual",
    vsb         : "Vs. Budget",
    pctVsb      : "% Vs. Budget",
    single      : "Single/Culmulative",
    typeFct     : "Type Forecast/Actual",
    fctTime     : "Explaination time",
    fy          : "FY",
    ver         : "Ver",
    lastestFc   : "Lastest forecast/Actual",
    vsLastestFc : "Vs. Lastest forecast",
    explanation : "Explanation"
  },

  SEGMENT_ORDER : ["Dental", "Eyeless", "MMG", "Surgical"],

  CACHE_TTL_SEC  : 600,     // ⭐ v4.1 — 10 phút; sửa Sheet (EditLog trigger) hoặc nút Refresh trên web sẽ làm mới ngay
  CACHE_VER      : "v11",    // bump to invalidate all caches at once

  // ⭐ v4.0 — GOM NƯỚC. "country" = theo cột Country (nước thật, khuyến nghị);
  //   "report" = theo cột "Country report" như bản cũ.
  COUNTRY_GROUP_BY : "country",
  // Mỗi FY: nước nào thuộc nhóm TH (còn lại thuộc nhóm VN) + nhãn hiển thị.
  // FY không khai báo → dùng khai báo của FY gần nhất phía trước.
  // FY68: Myanmar chuyển sang nhóm Thái — theo đa số dòng "Thailand/Myanmar"
  //       đang nhập trong Sheet. Nếu không đúng ý, sửa ở đây là xong.
  COUNTRY_GROUPS : {
    FY67 : { th:["Thailand"],           labels:{ TH:"Thailand",         VN:"Viet Nam and others" } },
    FY68 : { th:["Thailand","Myanmar"], labels:{ TH:"Thailand/Myanmar", VN:"Vietnam/Lao/Cambodia" } }
  },

  // ⭐ v4.0 — các tab nhập để đối chiếu với SUM TURNOVER (kiểm tra sức khỏe)
  INPUT_TABS : [
    { name:"Budget Input",   value:"Budget Mani USD", header:4, start:6 },
    { name:"Forecast Input", value:"Forecast USD",    header:4, start:6 },
    { name:"Actual input",   value:"Actual USD",      header:4, start:6 }
  ]
};


/* ════════════════════════════════════════════════════════════════════
   ⭐ v4.0 — FY ĐỘNG
   ════════════════════════════════════════════════════════════════════ */
var FY_MON_ = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function pad2_(n){ n = String(n); return n.length < 2 ? "0" + n : n; }
function fyNum_(fy){ var m = String(fy || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : NaN; }

// "FY68" → { fy, keys:["202609",…], full:["09/2026",…], lbl:["Sep",…], range:"Sep-26 → Aug-27" }
function fyInfo_(fy) {
  var n  = fyNum_(fy);
  if (isNaN(n)) n = CONFIG.FY_ANCHOR.fy;
  var y0 = CONFIG.FY_ANCHOR.startYear + (n - CONFIG.FY_ANCHOR.fy);
  var sm = CONFIG.FY_START_MONTH;
  var keys = [], full = [], lbl = [], yy = [];
  for (var i = 0; i < 12; i++) {
    var mo = (sm - 1 + i) % 12 + 1;
    var yr = y0 + Math.floor((sm - 1 + i) / 12);
    keys.push(String(yr) + pad2_(mo));
    full.push(pad2_(mo) + "/" + yr);
    lbl.push(FY_MON_[mo - 1]);
    yy.push(String(yr).slice(2));
  }
  return { fy:"FY" + n, n:n, startYear:y0, keys:keys, full:full, lbl:lbl, yy:yy,
           range: lbl[0] + "-" + yy[0] + " → " + lbl[11] + "-" + yy[11] };
}
function fyPublic_(info){
  return { fy:info.fy, keys:info.keys, full:info.full, lbl:info.lbl, yy:info.yy, range:info.range };
}

// "202609" → 68
function fyOfMonthKey_(key) {
  key = String(key || "");
  var y = parseInt(key.slice(0, 4), 10), m = parseInt(key.slice(4, 6), 10);
  if (isNaN(y) || isNaN(m)) return NaN;
  var startY = (m >= CONFIG.FY_START_MONTH) ? y : y - 1;
  return CONFIG.FY_ANCHOR.fy + (startY - CONFIG.FY_ANCHOR.startYear);
}

function todayKeyDay_() {
  var tz = Session.getScriptTimeZone(), d = new Date();
  return { key: Utilities.formatDate(d, tz, "yyyyMM"),
           day: parseInt(Utilities.formatDate(d, tz, "d"), 10),
           ymd: Utilities.formatDate(d, tz, "yyyyMMdd") };
}
function currentFy_() { return "FY" + fyOfMonthKey_(todayKeyDay_().key); }

// Danh sách FY có trong SUM TURNOVER (đọc cột FY, thiếu thì suy từ Month)
function listFys_() {
  var cache = CacheService.getScriptCache();
  var key = cacheKey_("fylist", "all");
  var hit = cache.get(key);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var seen = {};
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    var lastRow = sh ? sh.getLastRow() : 0;
    if (sh && lastRow >= CONFIG.DATA_START_ROW) {
      var header = sh.getRange(CONFIG.HEADER_ROW, 1, 1, sh.getLastColumn()).getValues()[0];
      var idx = autoDetectColumns_(header, { fy:CONFIG.COLUMN_MAP.fy, month:CONFIG.COLUMN_MAP.month });
      var n = lastRow - CONFIG.DATA_START_ROW + 1;
      var fyv = idx.fy >= 0 ? sh.getRange(CONFIG.DATA_START_ROW, idx.fy + 1, n, 1).getValues() : [];
      var mov = idx.month >= 0 ? sh.getRange(CONFIG.DATA_START_ROW, idx.month + 1, n, 1).getValues() : [];
      for (var i = 0; i < n; i++) {
        var f = fyv[i] ? String(fyv[i][0] || "").toUpperCase().trim() : "";
        if (/^FY\d+$/.test(f)) { seen[f] = 1; continue; }
        var k = mov[i] ? normMonth_(mov[i][0]) : "";
        var num = fyOfMonthKey_(k);
        if (!isNaN(num)) seen["FY" + num] = 1;
      }
    }
  } catch (e) {}
  var out = Object.keys(seen).sort(function(a, b){ return fyNum_(a) - fyNum_(b); });
  try { cache.put(key, JSON.stringify(out), 300); } catch (e) {}
  return out;
}

function resolveFy_(fy) {
  fy = String(fy || "").toUpperCase().trim();
  if (/^FY\d+$/.test(fy)) return fy;
  if (CONFIG.FY_DEFAULT) return CONFIG.FY_DEFAULT;
  var cur = currentFy_(), list = listFys_();
  if (!list.length || list.indexOf(cur) >= 0) return cur;
  return list[list.length - 1];
}

// Gán FY đang xem cho toàn bộ script (CONFIG + RPT dùng chung)
function setFyContext_(fy) {
  var info = fyInfo_(resolveFy_(fy));
  CONFIG.FY_FILTER    = info.fy;
  CONFIG.VALID_MONTHS = info.keys.slice();
  if (typeof RPT !== "undefined") {
    RPT.MFULL  = info.full.slice();
    RPT.MLBL   = info.lbl.slice();
    RPT.FYINFO = info;
    var g = countryGroupCfg_(info.fy);
    RPT.CTYL = { TH:g.labels.TH, VN:g.labels.VN };
  }
  return info;
}

// Cấu hình gom nước cho 1 FY
function countryGroupCfg_(fy) {
  var G = CONFIG.COUNTRY_GROUPS || {};
  var keys = Object.keys(G).sort(function(a, b){ return fyNum_(a) - fyNum_(b); });
  if (!keys.length) return { th:["Thailand"], labels:{ TH:"Thailand", VN:"Viet Nam" } };
  var n = fyNum_(fy), pick = keys[0];
  keys.forEach(function(k){ if (fyNum_(k) <= n) pick = k; });
  return G[pick];
}
// → "TH" | "VN"
function ctyGroupCode_(phys, report, cfg) {
  var p = String(phys || "").trim().toLowerCase();
  if (CONFIG.COUNTRY_GROUP_BY === "country" && p) {
    return (cfg.th || []).some(function(x){ return String(x).toLowerCase() === p; }) ? "TH" : "VN";
  }
  return String(report || "").toLowerCase().indexOf("thai") >= 0 ? "TH" : "VN";
}

// Month cell → "yyyyMM"
function normMonth_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyyMM");
  if (typeof v === "number") return String(Math.round(v));
  return String(v).trim().replace(/\.0+$/, "");
}

// So sánh version: cả hai là số → so theo số; không thì so chuỗi
function cmpVer_(a, b) {
  var sa = String(a == null ? "" : a), sb = String(b == null ? "" : b);
  if (/^\d+$/.test(sa) && /^\d+$/.test(sb)) { var d = Number(sa) - Number(sb); return d < 0 ? -1 : (d > 0 ? 1 : 0); }
  return sa < sb ? -1 : (sa > sb ? 1 : 0);
}

function ruleText_() {
  return "Months that are due (current month from day " + CONFIG.ACTUAL_CUTOFF_DAY +
         ") AND already have Actual → Actual; otherwise → Forecast.";
}

function lastModified_() {
  try { return DriveApp.getFileById(CONFIG.SPREADSHEET_ID).getLastUpdated().getTime(); }
  catch (e) { return Date.now(); }
}


/* ════════════════════════════════════════════════════════════════════
   ⭐ v4.0 — CACHE: chia khúc (1 khoá CacheService tối đa 100KB) +
   "thế hệ" cache: sửa Sheet là mọi khoá cũ tự hết hiệu lực.
   ════════════════════════════════════════════════════════════════════ */
function cacheGen_() {
  try { return CacheService.getScriptCache().get("mmh_cache_gen") || "0"; } catch (e) { return "0"; }
}
function bumpCacheGen_() {
  try { CacheService.getScriptCache().put("mmh_cache_gen", String(Date.now()), 21600); } catch (e) {}
}
function cacheKey_(kind, fy) {
  return kind + "_" + CONFIG.CACHE_VER + "_" + cacheGen_() + "_" + fy;
}
function cachePutBig_(cache, key, str, ttl) {
  try {
    var CH = 30000;                       // ~30k ký tự ≈ < 100KB kể cả tiếng Việt
    var n = Math.ceil(str.length / CH);
    if (n > 60) return;                   // quá lớn → bỏ qua cache
    var obj = {};
    for (var i = 0; i < n; i++) obj[key + "#" + i] = str.substr(i * CH, CH);
    obj[key] = "__chunks__" + n;
    cache.putAll(obj, ttl);
  } catch (e) {}
}
function cacheGetBig_(cache, key) {
  try {
    var h = cache.get(key);
    if (!h) return null;
    if (h.indexOf("__chunks__") !== 0) return h;
    var n = parseInt(h.slice(10), 10), keys = [];
    for (var i = 0; i < n; i++) keys.push(key + "#" + i);
    var got = cache.getAll(keys), parts = [];
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) return null; parts.push(got[keys[j]]); }
    return parts.join("");
  } catch (e) { return null; }
}


// ═══════════════════════════════════════════════════════════════════
function doGet(e) {
  const params  = (e && e.parameter) || {};
  const action  = params.action   || "getTurnoverData";
  const cb      = params.callback || "";
  const fyReq   = String(params.fy || "").toUpperCase().trim();     // ⭐ v4.0
  if (params.fresh === "1") bumpCacheGen_();                          // ⭐ v4.1 — nút Refresh: bỏ qua cache

  let payload;
  try {
    if (action === "getMeta") {
      payload = getMeta_();
    } else if (action === "getTurnoverData") {
      payload = getTurnoverData_(fyReq);
      if (payload.ok) {
        try {
          const ex = getExplanations_(payload.fy);
          if (ex && ex.ok) {
            payload.versions       = ex.versions;
            payload.futureVersions = ex.futureVersions || [];
          } else if (ex && ex.error) {
            payload.versionsError = ex.error;
          }
        } catch (e2) {
          payload.versionsError = String(e2 && e2.message || e2);
        }
      }
    } else if (action === "getExplanations") {
      payload = getExplanations_(fyReq);
    } else if (action === "getHealth") {
      payload = getHealth_(fyReq);
    } else if (action === "getNppDetail") {        // ⭐ v4.2 Họp tuần Surgical
      payload = getNppDetail_(fyReq, params.seg);
    } else if (action === "getEditLog") {
      payload = getEditLog_(params.n ? parseInt(params.n,10) : 10);
    } else {
      payload = { ok:false, error:"Unknown action: " + action };
    }
  } catch (err) {
    payload = { ok:false, error: String(err && err.message || err) };
  }

  const body = JSON.stringify(payload);
  if (cb) {
    return ContentService
      .createTextOutput(cb + "(" + body + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════════════════════════
function getMeta_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return {
    ok           : true,
    t            : Date.now(),
    lastModified : lastModified_(),       // ⭐ v4.0 — thời điểm sửa file thật
    title        : ss.getName()
  };
}


function emptyHealth_() {
  return { droppedRows:0, droppedBudget:0, droppedValue:0, unknownSegments:{},
           spaceValues:[], missingCountry:0, samples:[] };
}


// ═══════════════════════════════════════════════════════════════════
// getTurnoverData_(fy) — ⭐ v4.0
//   payload.rows      = "1 Turnover"  của FY đang xem
//   payload.rowsJizai = "2 Jizai Qty" của FY đang xem
//   Mỗi dòng: forecast = giá trị Actual/Forecast theo QUY TẮC MỚI:
//     tháng đã qua (tháng hiện tại tính từ ngày 25) VÀ loại số đó đã có
//     Actual trong tháng → Actual ; còn lại → Forecast.
//   Kèm: fy, fyList, fyInfo, ctyLabels, monthStatus, health.
// ═══════════════════════════════════════════════════════════════════
function getTurnoverData_(fy) {
  const info  = setFyContext_(fy);
  const cache = CacheService.getScriptCache();
  const key   = cacheKey_("turnover", info.fy);
  const hit   = cacheGetBig_(cache, key);
  if (hit) {
    try { const j = JSON.parse(hit); j.cached = true; return j; } catch(e) {}
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) return { ok:false, error: "Tab '" + CONFIG.SHEET_NAME + "' not found." };

  const cg   = countryGroupCfg_(info.fy);
  const base = {
    ok        : true,
    t         : Date.now(),
    lastModified : lastModified_(),
    fy        : info.fy,
    fyList    : listFys_(),
    fyInfo    : fyPublic_(info),
    ctyLabels : cg.labels,
    ctyTh     : cg.th,              // ⭐ v4.1 — để web gom nước 2 năm theo cùng một cách (so sánh cùng kỳ)
    rule      : ruleText_()
  };

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < CONFIG.DATA_START_ROW) {
    return Object.assign(base, { count:0, rows:[], rowsJizai:[], rowsComposite:[],
                                 monthStatus:{ turnover:[], jizai:[] }, health:emptyHealth_() });
  }

  const header = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const data   = sh.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, lastCol).getValues();
  const idx    = autoDetectColumns_(header, CONFIG.COLUMN_MAP);

  const required = ["month","segment","distributor","country","budget","forecast"];
  const missing  = required.filter(function(k){ return idx[k] < 0; });
  if (missing.length) {
    return { ok:false, error:"Missing columns (Turnover): " + missing.join(", ") + " | Header: " + header.join(" | ") };
  }

  const validSet = {};
  info.keys.forEach(function(m){ validSet[m] = 1; });

  const fyIdx    = idx.fy   >= 0 ? idx.fy   : -1;
  const typeIdx  = idx.type >= 0 ? idx.type : -1;
  const hasSplit = idx.fcRaw >= 0 && idx.actual >= 0;
  const SEGS_OK  = { Dental:1, Eyeless:1, MMG:1, Surgical:1 };

  // Normalize Type cell — ⭐ v5.9 any name works: the word Jizai wins, then Composite, then Turnover
  function classifyType_(s){ return typeKind_(s); }

  const health = emptyHealth_();
  const spaceSeen = {};
  function noteSpace_(label, raw) {
    if (typeof raw !== "string" || !raw) return;
    if (raw !== raw.trim()) {
      var k = label + ": \"" + raw + "\"";
      if (!spaceSeen[k]) { spaceSeen[k] = 1; if (health.spaceValues.length < 15) health.spaceValues.push(k); }
    }
  }

  // ── Lượt 1: đọc các dòng thuộc FY đang xem + cộng Actual theo (loại, tháng)
  const recs   = [];
  const actSum = {};
  for (let r = 0; r < data.length; r++) {
    const row = data[r];

    const tKind = typeIdx >= 0 ? classifyType_(row[typeIdx]) : "turnover";
    if (tKind !== "turnover" && tKind !== "jizai" && tKind !== "composite") continue;

    const month = normMonth_(row[idx.month]);
    if (!month || !validSet[month]) continue;

    if (fyIdx >= 0) {
      const fyVal = String(row[fyIdx]||"").toUpperCase().trim();
      if (fyVal && fyVal !== CONFIG.FY_FILTER.toUpperCase()) continue;
    }

    const segRaw  = row[idx.segment], distRaw = row[idx.distributor], ctyRaw = row[idx.country];
    const prodRaw = idx.products >= 0 ? row[idx.products] : "";
    noteSpace_("Segment", segRaw); noteSpace_("Distributor", distRaw);
    noteSpace_("Country report", ctyRaw); noteSpace_("Products", prodRaw);

    const segment     = String(segRaw  || "").trim();
    const distributor = String(distRaw || "").trim();
    const country     = String(ctyRaw  || "").trim();
    const phys        = idx.countryPhys >= 0 ? String(row[idx.countryPhys] || "").trim() : "";

    const budget = toNumF_(row[idx.budget]);
    const budD   = idx.budgetDist >= 0 ? toNumF_(row[idx.budgetDist]) : 0;   // ⭐ v5.8
    const fcAF   = toNumF_(row[idx.forecast]);
    const fcRaw  = hasSplit ? toNumF_(row[idx.fcRaw])  : fcAF;
    const act    = hasSplit ? toNumF_(row[idx.actual]) : 0;

    if (hasSplit && act !== 0) actSum[tKind + "|" + month] = (actSum[tKind + "|" + month] || 0) + act;

    const hasNum = (budget !== 0 || budD !== 0 || fcRaw !== 0 || act !== 0);
    if (!segment || !distributor || !country) {
      if (hasNum) {
        health.droppedRows++;
        if (tKind === "turnover") { health.droppedBudget += budget; health.droppedValue += (act || fcRaw); }
        if (health.samples.length < 8) {
          health.samples.push("Row " + (r + CONFIG.DATA_START_ROW) + ": " +
            [tKind, month, segment || "(no Segment)", distributor || "(no Distributor)",
             country || "(no Country report)"].join(" · "));
        }
      }
      continue;
    }
    if (!SEGS_OK[segment] && hasNum) {
      health.unknownSegments[segment] = (health.unknownSegments[segment] || 0) + 1;
    }
    if (!phys && hasNum && idx.countryPhys >= 0) health.missingCountry++;

    recs.push({ kind:tKind, month:month, segment:segment, distributor:distributor,
                country:country, phys:phys,
                products: String(prodRaw || "").trim(),
                budget:budget, budD:budD, fcRaw:fcRaw, act:act, fcAF:fcAF });
  }

  // ── Lượt 2: áp quy tắc Actual/Forecast + gom nước
  const now = todayKeyDay_();
  function isClosed_(kind, month) {
    if (!hasSplit) return false;
    const past = (month < now.key) || (month === now.key && now.day >= CONFIG.ACTUAL_CUTOFF_DAY);
    return past && (actSum[kind + "|" + month] || 0) !== 0;
  }

  const rows = [], rowsJizai = [], rowsComposite = [];
  const stat = { turnover:{}, jizai:{} };
  recs.forEach(function(x){
    const closed = isClosed_(x.kind, x.month);
    const val    = hasSplit ? (closed ? x.act : x.fcRaw) : x.fcAF;

    if (stat[x.kind]) {
      const st = stat[x.kind][x.month] || (stat[x.kind][x.month] = { bud:0, filled:0 });
      if (x.budget !== 0) { st.bud++; if (val !== 0) st.filled++; }
    }
    if (x.budget === 0 && x.budD === 0 && val === 0) return;

    const cty = ctyGroupCode_(x.phys, x.country, cg);
    const rec = {
      month       : x.month,
      country     : cg.labels[cty],
      cty         : cty,
      phys        : x.phys,          // ⭐ v4.1 — nước thật (cột Country)
      segment     : x.segment,
      distributor : x.distributor,
      products    : x.products,
      budget      : x.budget,
      budgetDist  : x.budD,          // ⭐ v5.8 — Budget Distributor USD (web BUDGET VIEW)
      forecast    : val
    };
    if      (x.kind === "turnover") rows.push(rec);
    else if (x.kind === "jizai")    rowsJizai.push(rec);
    else                            rowsComposite.push(rec);
  });

  function statusArr_(kind) {
    return info.keys.map(function(m){
      const st = (stat[kind] && stat[kind][m]) || { bud:0, filled:0 };
      return { m:m, closed:isClosed_(kind, m), bud:st.bud, filled:st.filled };
    });
  }

  const out = Object.assign(base, {
    count          : rows.length,
    countJizai     : rowsJizai.length,
    countComposite : rowsComposite.length,
    rows           : rows,
    rowsJizai      : rowsJizai,
    rowsComposite  : rowsComposite,
    ruleMode       : hasSplit ? "actual-if-available" : "sheet-column-Q",
    monthStatus    : { turnover:statusArr_("turnover"), jizai:statusArr_("jizai") },
    health         : health
  });

  cachePutBig_(cache, key, JSON.stringify(out), CONFIG.CACHE_TTL_SEC);
  return out;
}


// ═══════════════════════════════════════════════════════════════════
// getExplanations_ v2.1 — fixed
// ═══════════════════════════════════════════════════════════════════
function getExplanations_(fy) {
  setFyContext_(fy);                                  // ⭐ v4.0 — lọc theo FY đang xem
  const cache = CacheService.getScriptCache();
  const key   = cacheKey_("explanations", CONFIG.FY_FILTER);
  const hit   = cacheGetBig_(cache, key);
  if (hit) {
    try { const j = JSON.parse(hit); j.cached = true; return j; } catch(e) {}
  }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(CONFIG.EXPL_SHEET_NAME);
  if (!sh) return { ok:false, error:"Tab '" + CONFIG.EXPL_SHEET_NAME + "' not found." };

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < CONFIG.EXPL_DATA_START_ROW) {
    return { ok:true, t:Date.now(), fy:CONFIG.FY_FILTER, versions: [], futureVersions: [] };
  }

  // Try header detection at the configured row first; if any required column
  // is still missing, scan a few candidate rows (1..8) and pick the one that
  // resolves the most columns. This rescues sheets where the header drifted
  // up/down or where a header cell was left blank (e.g. "`" placeholder).
  const HEADER_SCAN_ROWS = 8;
  const allHeaderRange = sh.getRange(1, 1, Math.min(HEADER_SCAN_ROWS, lastRow), lastCol).getValues();

  function pickBestHeader_(){
    let bestRow = CONFIG.EXPL_HEADER_ROW - 1;
    let bestIdx = autoDetectColumns_(allHeaderRange[bestRow] || [], CONFIG.EXPL_COLUMN_MAP);
    let bestHits = Object.keys(bestIdx).filter(function(k){ return bestIdx[k] >= 0; }).length;
    for (let r = 0; r < allHeaderRange.length; r++) {
      if (r === bestRow) continue;
      const cand = autoDetectColumns_(allHeaderRange[r], CONFIG.EXPL_COLUMN_MAP);
      const hits = Object.keys(cand).filter(function(k){ return cand[k] >= 0; }).length;
      if (hits > bestHits) { bestHits = hits; bestRow = r; bestIdx = cand; }
    }
    return { row: bestRow, idx: bestIdx };
  }

  const headerPick = pickBestHeader_();
  const headerRowIdx = headerPick.row;             // 0-indexed
  const header = allHeaderRange[headerRowIdx];
  const idx    = headerPick.idx;
  const dataStartRow = Math.max(CONFIG.EXPL_DATA_START_ROW, headerRowIdx + 2);
  const data   = sh.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, lastCol).getValues();

  // ── Inference fallback for blanks: if Segment header is empty (sheet has "`"
  // placeholder) but Country & Distributor are at columns N and N+2, assume
  // Segment lives at N+1. Same logic for any column that's clearly between two
  // detected siblings.
  function inferBetween_(beforeKey, afterKey, missingKey) {
    if (idx[missingKey] >= 0) return;
    const a = idx[beforeKey], b = idx[afterKey];
    if (a >= 0 && b >= 0 && b - a === 2) {
      idx[missingKey] = a + 1;
    }
  }
  inferBetween_("country", "distributor", "segment");
  inferBetween_("forecast", "pctVsb",      "vsb");
  inferBetween_("budget",   "vsb",         "forecast");

  const required = ["country","segment","ver","explanation"];
  const missing  = required.filter(function(k){ return idx[k] < 0; });
  if (missing.length) {
    return {
      ok    : false,
      error : "Missing columns (Explanation): " + missing.join(", "),
      headerRow: headerRowIdx + 1,
      header: header,
      idx   : idx
    };
  }

  const versions = {};

  for (let r=0; r<data.length; r++) {
    const row = data[r];

    // Skip nếu không có Ver
    const verRaw = row[idx.ver];
    if (verRaw === "" || verRaw === null || verRaw === undefined) continue;
    const ver = normalizeVer_(verRaw);
    if (!ver) continue;

    // Filter FY67
    if (idx.fy >= 0) {
      const fyVal = String(row[idx.fy]||"").toUpperCase().trim();
      if (fyVal && fyVal !== CONFIG.FY_FILTER.toUpperCase()) continue;
    }

    const singleRaw = idx.single >= 0 ? String(row[idx.single]||"").trim() : "";
    const isCumulative = /^cul/i.test(singleRaw);   // catches "Cumulative" and "Culmulative"

    const countryRaw = String(row[idx.country]||"").trim();
    const segmentRaw = String(row[idx.segment]||"").trim();
    const distRaw    = idx.distributor >= 0 ? String(row[idx.distributor]||"").trim() : "";
    const explRaw    = String(row[idx.explanation]||"").trim();
    const typeRaw    = idx.type >= 0 ? String(row[idx.type]||"").trim() : "";

    if (!countryRaw) continue;

    // ── Row classification (anchored on Type=Total, fall back to suffix) ──
    const typeIsTotal     = /^total$/i.test(typeRaw);
    const isGrandTotal    = /^grand total$/i.test(countryRaw);
    const countryHasTotal = !isGrandTotal && / total$/i.test(countryRaw);
    const segmentHasTotal = / total$/i.test(segmentRaw);
    const hasDistributor  = !!distRaw && !/total$/i.test(distRaw);

    // Country Total: country cell ends in " Total" OR (Type=Total AND no segment & no distributor)
    const isCountryTotal  = !isGrandTotal && (countryHasTotal || (typeIsTotal && !segmentRaw && !hasDistributor));
    // Segment Total: segment cell ends in " Total" OR (Type=Total AND segment present AND no distributor)
    const isSegmentTotal  = !isGrandTotal && !isCountryTotal && (segmentHasTotal || (typeIsTotal && segmentRaw && !hasDistributor));
    // Distributor row: has a non-total distributor name and isn't classified above
    const isDistRow       = hasDistributor && !isGrandTotal && !isCountryTotal && !isSegmentTotal;

    if (!isGrandTotal && !isCountryTotal && !isSegmentTotal && !isDistRow) continue;

    // Clean " Total" suffix
    var countryClean = countryRaw.replace(/\s*total\s*$/i, "").trim();
    var segmentClean = segmentRaw.replace(/\s*total\s*$/i, "").trim();
    if (isGrandTotal) countryClean = "";

    var explClean = explRaw;
    if (/^not\s*requirement\s*$/i.test(explClean)) explClean = "";

    var coCode, coName;
    if (isGrandTotal) {
      coCode = "g"; coName = "Grand Total";
    } else if (countryClean.toLowerCase().indexOf("thai") >= 0) {
      coCode = "t"; coName = "Thailand";
    } else {
      coCode = "v"; coName = "Viet Nam and others";
    }

    const fctTime = idx.fctTime >= 0 ? String(row[idx.fctTime]||"").trim() : "";
    const tFct    = idx.typeFct >= 0 ? String(row[idx.typeFct]||"").trim() : "";
    const sKey = isCumulative ? "C" : "S";
    const vKey = ver + "|" + fctTime + "|" + tFct + "|" + sKey;

    if (!versions[vKey]) {
      versions[vKey] = {
        v   : ver,
        ft  : fctTime,
        tFct: tFct,
        sc  : isCumulative ? "Cumulative" : "Single",
        fy  : idx.fy >= 0 ? String(row[idx.fy]||"").trim() : "",
        l   : buildVersionLabel_(ver, fctTime, tFct, isCumulative),
        t   : buildVersionTitle_(fctTime, isCumulative, tFct),
        p   : monthToQuarter_(fctTime),
        countries: {}
      };
    }

    const numbers = {
      b   : toNumF_(row[idx.budget]),
      f   : toNumF_(row[idx.forecast]),
      vsb : toNumF_(row[idx.vsb]),
      pct : idx.pctVsb >= 0 ? toPct_(row[idx.pctVsb]) : "",
      lf  : idx.lastestFc >= 0 ? toNumF_(row[idx.lastestFc]) : 0,
      vlf : idx.vsLastestFc >= 0 ? toNumF_(row[idx.vsLastestFc]) : 0,
      e   : explClean
    };

    if (!versions[vKey].countries[coCode]) {
      versions[vKey].countries[coCode] = {
        code     : coCode,
        name     : coName,
        total    : null,
        segments : {}
      };
    }
    const co = versions[vKey].countries[coCode];

    if (isGrandTotal || isCountryTotal) {
      co.total = numbers;
    } else if (isSegmentTotal) {
      if (!co.segments[segmentClean]) {
        co.segments[segmentClean] = { name: segmentClean, total: null, distributors: [] };
      }
      co.segments[segmentClean].total = numbers;
    } else if (isDistRow) {
      if (!co.segments[segmentClean]) {
        co.segments[segmentClean] = { name: segmentClean, total: null, distributors: [] };
      }
      co.segments[segmentClean].distributors.push(Object.assign({name: distRaw}, numbers));
    }
  }

  // Convert object → array
  const COUNTRY_ORDER = ["t", "v", "g"];
  const SEGMENT_ORDER = CONFIG.SEGMENT_ORDER;

  const arr = Object.keys(versions).map(function(k){
    const ver = versions[k];
    ver.countries = COUNTRY_ORDER
      .filter(function(co){ return ver.countries[co]; })
      .map(function(co){
        const country = ver.countries[co];
        const ordered = SEGMENT_ORDER
          .filter(function(sg){ return country.segments[sg]; })
          .map(function(sg){ return country.segments[sg]; });
        // append any segments that aren't in SEGMENT_ORDER (forward compat)
        const extra = Object.keys(country.segments)
          .filter(function(sg){ return SEGMENT_ORDER.indexOf(sg) < 0; })
          .sort()
          .map(function(sg){ return country.segments[sg]; });
        country.segments = ordered.concat(extra);
        return country;
      });
    return ver;
  });

  arr.sort(function(a,b){
    var cv = cmpVer_(a.v, b.v);                        // ⭐ v4.0 — so theo số
    if (cv) return cv;
    var aFt = a.ft || "", bFt = b.ft || "";
    if (aFt !== bFt) return aFt < bFt ? -1 : 1;
    return (a.sc === "Cumulative" ? 1 : 0) - (b.sc === "Cumulative" ? 1 : 0);
  });

  // ⭐ v4.0 — version ghi ngày trong tương lai (web sẽ coi là "mới nhất")
  const today = todayKeyDay_().ymd;
  const futureVersions = [];
  arr.forEach(function(v){
    const s = String(v.v || "");
    if (/^\d{8}$/.test(s) && s > today && futureVersions.indexOf(s) < 0) futureVersions.push(s);
  });

  const out = {
    ok       : true,
    t        : Date.now(),
    fy       : CONFIG.FY_FILTER,
    count    : arr.length,
    versions : arr,
    futureVersions : futureVersions
  };

  cachePutBig_(cache, key, JSON.stringify(out), CONFIG.CACHE_TTL_SEC);
  return out;
}


// ═══════════════════════════════════════════════════════════════════
// autoDetectColumns_ — prefer EXACT match before prefix match
// ═══════════════════════════════════════════════════════════════════
// ⭐ v5.9 — Type group of a Type cell, whatever its exact name ("1 Turnover", "2 Jizai Qty",
//   "2 Jizai Turnover", "3 Composite USD"…): Jizai › Composite › Turnover. Same rule as _YQ_Key!X.
function typeKind_(s) {
  s = String(s || "").toLowerCase().trim();
  if (!s) return "";
  if (s.indexOf("jizai")     >= 0) return "jizai";
  if (s.indexOf("composite") >= 0) return "composite";
  if (s.indexOf("turnover")  >= 0) return "turnover";
  return "";
}
// ⭐ v5.9 — Jizai is counted in sheets before FY68, in USD from FY68
function jizaiInSheets_(fy) {
  var n = parseInt(String(fy || "").replace(/\D/g, ""), 10) || 0;
  return n > 0 && n < CONFIG.USD_FROM_FY;
}

function autoDetectColumns_(header, columnMap) {
  const idx = {};
  const headerLower = header.map(function(h){ return String(h||"").toLowerCase().trim(); });

  Object.keys(columnMap).forEach(function(k){
    const needle = String(columnMap[k]).toLowerCase().trim();
    idx[k] = -1;
    // Pass 1: exact match
    for (let i=0; i<headerLower.length; i++) {
      if (headerLower[i] === needle) { idx[k] = i; break; }
    }
    if (idx[k] >= 0) return;
    // Pass 2: prefix match (skip if header equals another mapped needle exactly — guards
    // against "Type" stealing "Type Forecast/Actual" when "Type" header missing)
    const otherNeedles = Object.keys(columnMap)
      .filter(function(kk){ return kk !== k; })
      .map(function(kk){ return String(columnMap[kk]).toLowerCase().trim(); });
    for (let i=0; i<headerLower.length; i++) {
      const h = headerLower[i];
      if (!h) continue;
      if (otherNeedles.indexOf(h) >= 0) continue;   // skip — owned by someone else
      if (h.indexOf(needle) === 0) { idx[k] = i; break; }
    }
  });
  return idx;
}


// ═══════════════════════════════════════════════════════════════════
function normalizeVer_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return String(Math.round(v));
  var s = String(v).trim();
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, "");
  return s;
}

function buildVersionLabel_(ver, fctTime, tFct, isCumulative) {
  const title = buildVersionTitle_(fctTime, isCumulative, tFct);
  const cumTag = isCumulative ? " [Cumulative]" : "";
  return title + cumTag + " · ver " + ver;
}

function buildVersionTitle_(fctTime, isCumulative, tFct) {
  const prefix = isCumulative ? "Cumulative " : (tFct ? tFct + " " : "Forecast ");
  if (!fctTime) return prefix.trim() + " (KUSD)";
  if (/^Q[1-4]$/i.test(fctTime) || /^FY/i.test(fctTime)) {
    return prefix + fctTime + " (KUSD)";
  }
  if (fctTime.length < 6) return prefix + fctTime + " (KUSD)";
  const yr = fctTime.substring(0,4);
  const mo = fctTime.substring(4,6);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = parseInt(mo,10) - 1;
  const monthLabel = (mi>=0 && mi<12) ? MONTHS[mi] : mo;
  const yy = yr.substring(2,4);
  return prefix + monthLabel + "-" + yy + " (KUSD)";
}

function monthToQuarter_(fctTime) {
  if (!fctTime) return "FY";
  if (/^Q[1-4]$/i.test(fctTime)) return fctTime.toUpperCase();
  if (/^FY/i.test(fctTime)) return "FY";
  if (fctTime.length < 6) return "FY";
  const m = fctTime.substring(4,6);
  const Q = {
    "09":"Q1","10":"Q1","11":"Q1",
    "12":"Q2","01":"Q2","02":"Q2",
    "03":"Q3","04":"Q3","05":"Q3",
    "06":"Q4","07":"Q4","08":"Q4"
  };
  return Q[m] || "FY";
}


// ═══════════════════════════════════════════════════════════════════
// toNumF_ — keep fractions (do NOT round). Use when sheet might store
// values like 22.4 KUSD where rounding changes the displayed number.
function toNumF_(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[, ]/g,"").replace(/[^\d.\-]/g,"");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Integer rounding kept for backward callers (none right now).
function toNum_(v) { return Math.round(toNumF_(v)); }

// Convert "−74%" or 0.74 → string "+74%" / "-74%" (always with sign)
function toPct_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") {
    // Heuristic: |v|<=5 → treat as ratio (e.g. 0.74 = 74%)
    const v100 = Math.abs(v) <= 5 ? v * 100 : v;
    const sign = v100 >= 0 ? "+" : "−";          // unicode minus matches the sheet
    return sign + Math.round(Math.abs(v100)) + "%";
  }
  // Already a string: pass through, normalize unicode minus
  var s = String(v).trim().replace(/^-/, "−");
  if (s.indexOf("%") < 0 && !isNaN(parseFloat(s))) s += "%";
  return s;
}


// ═══════════════════════════════════════════════════════════════════
function testRun() {
  const meta = getMeta_();
  Logger.log("META: " + JSON.stringify(meta));

  const data = getTurnoverData_("");
  if (!data.ok) {
    Logger.log("LỖI Turnover: " + data.error);
  } else {
    Logger.log("── TURNOVER ──");
    Logger.log("Số row: " + data.count);
    let tb=0, tf=0;
    data.rows.forEach(function(r){ tb+=r.budget; tf+=r.forecast; });
    Logger.log("Tổng Budget "   + data.fy + " = " + tb.toLocaleString());
    Logger.log("Tổng Forecast " + data.fy + " = " + tf.toLocaleString());
  }

  const ex = getExplanations_(data.fy);
  if (!ex.ok) {
    Logger.log("LỖI Explanations: " + ex.error);
    return;
  }
  Logger.log("── EXPLANATIONS v2.1 ──");
  Logger.log("Số version: " + ex.count);
  if (ex.versions.length > 0) {
    const last = ex.versions[ex.versions.length - 1];
    Logger.log("Version mới nhất: " + last.l);
    Logger.log("  Countries: " + last.countries.length);
    last.countries.forEach(function(co){
      Logger.log("    - " + co.name + " (total: " + (co.total ? "yes" : "NO") + ", " + co.segments.length + " segments)");
      co.segments.forEach(function(sg){
        const dlist = sg.distributors.map(function(d){return d.name;}).join(", ");
        Logger.log("        · " + sg.name + " (total: " + (sg.total ? "B"+sg.total.b+" F"+sg.total.f : "NO") + ", " + sg.distributors.length + " dist: " + dlist + ")");
      });
    });
  }

  Logger.log("── EDIT LOG ──");
  const log = getEditLog_(5);
  Logger.log("Trigger installed: " + log.triggerInstalled);
  Logger.log("Entries: " + (log.entries||[]).length);
  (log.entries||[]).forEach(function(e){
    Logger.log("  " + new Date(e.ts).toISOString() + " · " + e.user + " · " + e.sheet + " " + e.cell + " · " + e.colName + " → " + e.value);
  });
}


// ═══════════════════════════════════════════════════════════════════
function clearCache() {
  // ⭐ v4.0 — đổi "thế hệ" cache → mọi khoá cũ (mọi FY) hết hiệu lực
  bumpCacheGen_();
  const c = CacheService.getScriptCache();
  ["v1","v2","v3","v4","v5","v6","v7","v8"].forEach(function(v){
    c.remove("turnover_" + v);
    c.remove("explanations_" + v);
  });
  Logger.log("Cache đã xóa.");
}


/* ════════════════════════════════════════════════════════════════════
   EDIT LOG — "Newest update" banner feed
   ──────────────────────────────────────────────────────────────────── */

const EDITLOG_SHEET = "EditLog";
const EDITLOG_MAX   = 500;

function logEdit(e) {
  try {
    if (!e || !e.range) return;
    const ss = e.source || SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sh = e.range.getSheet();
    const sheetName = sh.getName();
    if (sheetName === EDITLOG_SHEET) return;
    // ⭐ v4.0 — thao tác trên Dashboard / tab tính toán không phải sửa dữ liệu
    if (sheetName === DASH.SHEET || sheetName === CALC || sheetName === DASH.DATA) return;
    // ⭐ v5.0 — dropdowns on YEAR / QUARTER-MONTH and their helper tabs are not data edits
    if (sheetName === YQ.YEAR || sheetName === YQ.QM || sheetName === YQ.OLD.YEAR || sheetName === YQ.OLD.QM || sheetName.indexOf("_YQ_") === 0) return;
    if (sheetName === KPT.VIEW || sheetName === KPT.SRC || sheetName === KPT.ACT) return;          // ⭐ v5.7

    let user = "";
    try { user = (e.user && e.user.getEmail && e.user.getEmail()) || ""; } catch (ignore) {}
    if (!user) { try { user = Session.getActiveUser().getEmail() || ""; } catch (ignore) {} }
    if (!user) user = "Someone";

    const a1   = e.range.getA1Notation();
    const col  = e.range.getColumn();
    const colLetter = a1.replace(/[0-9]/g, "");

    let colName = "";
    try {
      const hdrRow = (sheetName === CONFIG.EXPL_SHEET_NAME) ? CONFIG.EXPL_HEADER_ROW :
                     (sheetName === CONFIG.SHEET_NAME)      ? CONFIG.HEADER_ROW : 1;
      const h = sh.getRange(hdrRow, col).getValue();
      if (h) colName = String(h).trim();
    } catch (ignore) {}

    let newVal = "";
    try { newVal = (e.value != null) ? String(e.value) : ""; } catch (ignore) {}
    if (newVal.length > 60) newVal = newVal.slice(0, 59) + "…";

    let log = ss.getSheetByName(EDITLOG_SHEET);
    if (!log) {
      log = ss.insertSheet(EDITLOG_SHEET);
      log.appendRow(["Timestamp", "User", "Sheet", "Cell", "Column", "ColumnName", "NewValue"]);
      log.setFrozenRows(1);
    }
    log.appendRow([new Date(), user, sheetName, a1, colLetter, colName, newVal]);

    const n = log.getLastRow();
    if (n > EDITLOG_MAX + 1) log.deleteRows(2, n - (EDITLOG_MAX + 1));

    // Invalidate the explanations cache so a subsequent dashboard refresh
    // sees the new edit immediately. Without this, edits on the source
    // sheet are masked by the 60-second cache.
    bumpCacheGen_();          // ⭐ v4.0 — mọi FY
  } catch (err) {
    Logger.log("logEdit error: " + err);
  }
  // ⭐ v5.7 — turnover actuals → "3. Detail KPI" of the KPI file, right after an edit of SUM TURNOVER
  try {
    if (e && e.range && e.range.getSheet().getName() === CONFIG.SHEET_NAME) kptPushToKpi_("edit");
  } catch (errK) { Logger.log("KPI push error: " + errK); }
}

function installEditLogTrigger() {
  const ssId = CONFIG.SPREADSHEET_ID;
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === "logEdit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("logEdit")
    .forSpreadsheet(ssId)
    .onEdit()
    .create();
  const ss = SpreadsheetApp.openById(ssId);
  if (!ss.getSheetByName(EDITLOG_SHEET)) {
    const log = ss.insertSheet(EDITLOG_SHEET);
    log.appendRow(["Timestamp", "User", "Sheet", "Cell", "Column", "ColumnName", "NewValue"]);
    log.setFrozenRows(1);
  }
  Logger.log("EditLog trigger installed. Run testRun() to verify.");
}

// Return the most recent N edit-log entries (newest first).
// Also exposes triggerInstalled flag so the HTML banner can show a setup hint
// when the spreadsheet owner hasn't run installEditLogTrigger() yet.
function getEditLog_(n) {
  n = n || 10;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const log = ss.getSheetByName(EDITLOG_SHEET);

    // Check trigger status
    var triggerInstalled = false;
    try {
      ScriptApp.getProjectTriggers().forEach(function(t){
        if (t.getHandlerFunction() === "logEdit" &&
            t.getEventType() === ScriptApp.EventType.ON_EDIT) {
          triggerInstalled = true;
        }
      });
    } catch (ignore) {}

    if (!log) {
      return {
        ok:true, t:Date.now(), entries:[],
        triggerInstalled: triggerInstalled,
        note: triggerInstalled
          ? "EditLog sheet not yet created — make an edit on the source spreadsheet."
          : "Run installEditLogTrigger() once in the Apps Script editor to start recording edits."
      };
    }
    const last = log.getLastRow();
    if (last < 2) return { ok:true, t:Date.now(), entries:[], triggerInstalled: triggerInstalled };

    const take  = Math.min(n, last - 1);
    const start = last - take + 1;
    const vals  = log.getRange(start, 1, take, 7).getValues();

    const entries = vals.map(function(r){
      const ts = (r[0] instanceof Date) ? r[0].getTime() : Date.now();
      let user = String(r[1] || "Someone");
      const at = user.indexOf("@");
      if (at > 0) user = user.slice(0, at);
      return {
        ts:ts, user:user, sheet:String(r[2]||""), cell:String(r[3]||""),
        col:String(r[4]||""), colName:String(r[5]||""), value:String(r[6]||"")
      };
    }).reverse();

    return { ok:true, t:Date.now(), entries:entries, triggerInstalled: triggerInstalled };
  } catch (err) {
    return { ok:false, error:String(err && err.message || err) };
  }
}


/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PHẦN 1 — MODEL : lớp tổng hợp số liệu dùng chung                ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const RPT = {

  MLBL  : ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"],
  MFULL : ["09/2025","10/2025","11/2025","12/2025","01/2026","02/2026",
           "03/2026","04/2026","05/2026","06/2026","07/2026","08/2026"],
  QIDX  : [[0,1,2],[3,4,5],[6,7,8],[9,10,11]],
  QLBL  : ["Q1","Q2","Q3","Q4"],
  FYINFO: null,          // ⭐ v4.0 — setFyContext_() gán; MFULL/MLBL/CTYL cũng được gán lại

  SEGS  : ["Dental","Surgical","Eyeless","MMG"],
  CTYS  : ["TH","VN"],
  CTYL  : { TH:"Thailand", VN:"Viet Nam" },

  // Nhóm hiển thị ở Overview / PPT (đúng thứ tự trong ảnh)
  GROUP_ORDER : ["TH Surgical","TH Dental/MMG","VN Surgical",
                 "VN Dental","VN MMG","VN Eyeless"],

  // ── Bảng màu lấy trực tiếp từ MMH_REPORT_template.pptx ──
  C : {
    navy    : "#35506B",   // chữ đậm / heading (soft slate, FY68 template)
    blue    : "#5B87B8",   // sub-title (soft blue, FY68 template)
    panel   : "#EBEEF7",   // nền băng tiêu đề block
    border  : "#DDE3EA",   // viền card
    soft    : "#E2E8F0",   // viền / nền nhạt
    barBg   : "#C4D2E4",   // thanh Budget Mani
    pos     : "#4F8F6C",   // trên budget
    neg     : "#B26B7A",   // dưới budget
    gray    : "#707070",
    gray2   : "#595959",
    white   : "#FFFFFF",
    page    : "#FFFFFF",
    chBud   : "#EDE9A9",   // cột Budget trong chart (accent3 lum60)
    chAct   : "#D9D9D9",   // cột Actual/Forecast trong chart
    grid    : "#EEEEEE",
    yellow  : "#FFE600"    // MANI yellow
  }
};


// ═══════════════════════════════════════════════════════════════════
// buildModel_ — tổng hợp toàn bộ số liệu cho 1 lựa chọn bộ lọc
//   opt = { mode:"turnover"|"jizai", period:"fy"|"qtr"|"month",
//           qi:0..3, mi:0..11, fy:"FY68" }   (⭐ v4.0 — fy)
// ═══════════════════════════════════════════════════════════════════
function buildModel_(opt) {
  opt        = opt || {};
  var mode   = (opt.mode === "jizai") ? "jizai" : "turnover";
  var period = opt.period || "fy";
  var qi     = (opt.qi == null) ? 3  : Math.max(0, Math.min(3,  +opt.qi));
  var mi     = (opt.mi == null) ? 10 : Math.max(0, Math.min(11, +opt.mi));

  var data = getTurnoverData_(opt.fy || CONFIG.FY_FILTER);   // ⭐ v4.0 — đặt luôn FY context
  if (!data.ok) throw new Error(data.error || "Could not read the Turnover data.");

  var rows  = (mode === "jizai") ? (data.rowsJizai || []) : (data.rows || []);
  var qtyU  = (mode === "jizai") && jizaiInSheets_(data.fy);   // ⭐ v5.9 — Jizai in USD from FY68
  var scale = qtyU ? 1 : 1000;                    // USD → K USD
  var unit  = qtyU ? "Sheet" : "K USD";

  var MI = {};
  CONFIG.VALID_MONTHS.forEach(function(m, i){ MI[m] = i; });

  // ── Gom dữ liệu ─────────────────────────────────────────────────
  var mAll   = z12_();                 // grand total theo tháng
  var gGroup = {};                     // group  → [12]
  var gSeg   = {};                     // seg    → [12]
  var gCty   = {};                     // cty    → [12]
  var gSC    = {};                     // cty|seg→ [12]
  var gDist  = {};                     // dist   → {cty,seg,m[12]}

  rows.forEach(function(r){
    var idx = MI[String(r.month).trim()];
    if (idx == null) return;

    var seg = String(r.segment || "").trim();
    if (RPT.SEGS.indexOf(seg) < 0) return;

    var cty = r.cty || ctyCode_(r.country);          // ⭐ v4.0 — nhóm nước tính sẵn ở backend
    var gk  = groupKey_(cty, seg);
    var dn  = String(r.distributor || "").trim() || "(n/a)";
    var dk  = dn + "|" + seg;                          // ⭐ v4.0 — NPP gom theo Tên + Segment
    var bm  = (+r.budget   || 0) / scale;
    var fc  = (+r.forecast || 0) / scale;

    mAll[idx].bm += bm;  mAll[idx].fc += fc;

    add12_(gGroup, gk,          idx, bm, fc);
    add12_(gSeg,   seg,         idx, bm, fc);
    add12_(gCty,   cty,         idx, bm, fc);
    add12_(gSC,    cty+"|"+seg, idx, bm, fc);

    if (!gDist[dk]) gDist[dk] = { name:dn, cty:cty, seg:seg, m:z12_() };
    gDist[dk].m[idx].bm += bm;
    gDist[dk].m[idx].fc += fc;
  });

  // ── Khoảng thời gian ────────────────────────────────────────────
  var singleIdx, endM, pLabel, pShort;
  if (period === "qtr") {
    singleIdx = RPT.QIDX[qi].slice();
    endM      = RPT.QIDX[qi][2];
    pShort    = RPT.QLBL[qi];
    pLabel    = RPT.QLBL[qi] + " (" + RPT.MLBL[RPT.QIDX[qi][0]] + "–" + RPT.MLBL[endM] + ")";
  } else if (period === "month") {
    singleIdx = [mi];
    endM      = mi;
    pShort    = RPT.MFULL[mi];
    pLabel    = RPT.MFULL[mi];
  } else {
    singleIdx = [0,1,2,3,4,5,6,7,8,9,10,11];
    endM      = 11;
    pShort    = CONFIG.FY_FILTER;
    pLabel    = CONFIG.FY_FILTER + " (" + ((RPT.FYINFO && RPT.FYINFO.range) || "") + ")";
  }
  var cumIdx = []; for (var i = 0; i <= endM; i++) cumIdx.push(i);
  var fyIdx  = [0,1,2,3,4,5,6,7,8,9,10,11];

  // ── Đóng gói ────────────────────────────────────────────────────
  function pack(arr){
    return {
      single : sum_(arr, singleIdx),
      cum    : sum_(arr, cumIdx),
      fy     : sum_(arr, fyIdx),
      m      : arr
    };
  }

  var groupKeys = RPT.GROUP_ORDER.filter(function(k){ return !!gGroup[k]; });
  Object.keys(gGroup).forEach(function(k){
    if (groupKeys.indexOf(k) < 0) groupKeys.push(k);
  });

  var groups = groupKeys.map(function(k){
    var p = pack(gGroup[k]); p.key = k; return p;
  });

  var segs = RPT.SEGS.filter(function(s){ return !!gSeg[s]; }).map(function(s){
    var p = pack(gSeg[s]); p.key = s; return p;
  });

  var ctys = RPT.CTYS.filter(function(c){ return !!gCty[c]; }).map(function(c){
    var p = pack(gCty[c]); p.key = c; p.name = RPT.CTYL[c]; return p;
  });

  var segCty = [];
  RPT.CTYS.forEach(function(c){
    RPT.SEGS.forEach(function(s){
      var a = gSC[c+"|"+s]; if (!a) return;
      var p = pack(a); p.cty = c; p.seg = s; p.key = c + " " + s;
      segCty.push(p);
    });
  });

  var dists = Object.keys(gDist).map(function(dn){
    var d = gDist[dn];
    var p = pack(d.m);
    p.key = dn; p.name = d.name; p.cty = d.cty; p.seg = d.seg;   // key = "Tên|Segment"
    p.group = groupKey_(d.cty, d.seg);
    return p;
  }).sort(function(a,b){ return b.fy.fc - a.fy.fc; });

  var months = mAll.map(function(x, i){
    return { i:i, lbl:RPT.MLBL[i], full:RPT.MFULL[i],
             bm:x.bm, fc:x.fc, gap:x.fc - x.bm };
  });

  var quarters = RPT.QIDX.map(function(q, k){
    var bm = 0, fc = 0;
    q.forEach(function(i){ bm += mAll[i].bm; fc += mAll[i].fc; });
    return { lbl:RPT.QLBL[k], bm:bm, fc:fc, gap:fc - bm };
  });

  var versions = [];
  try { var ex = getExplanations_(CONFIG.FY_FILTER); if (ex && ex.ok) versions = ex.versions || []; }
  catch (e) {}

  return {
    fyName      : CONFIG.FY_FILTER,                   // ⭐ v4.0 ("fy" bên dưới là tổng cả năm)
    monthStatus : data.monthStatus || null,
    mode        : mode,
    unit        : unit,
    period      : period,
    qi          : qi,
    mi          : mi,
    periodLabel : pLabel,
    periodShort : pShort,
    endM        : endM,
    cumLabel    : (period === "fy") ? CONFIG.FY_FILTER
                                    : "YTD " + RPT.MFULL[endM],
    singleIdx   : singleIdx,
    cumIdx      : cumIdx,

    single   : sum_(mAll, singleIdx),
    cum      : sum_(mAll, cumIdx),
    fy       : sum_(mAll, fyIdx),

    months   : months,
    quarters : quarters,
    groups   : groups,
    segs     : segs,
    ctys     : ctys,
    segCty   : segCty,
    dists    : dists,
    versions : versions,
    fetchedAt: new Date()
  };
}


/* ── helpers ───────────────────────────────────────────────────── */

function z12_(){
  var a = []; for (var i = 0; i < 12; i++) a.push({bm:0, fc:0}); return a;
}

function add12_(store, key, idx, bm, fc){
  if (!store[key]) store[key] = z12_();
  store[key][idx].bm += bm;
  store[key][idx].fc += fc;
}

function sum_(arr, idxs){
  var bm = 0, fc = 0;
  idxs.forEach(function(i){ if (arr[i]) { bm += arr[i].bm; fc += arr[i].fc; } });
  var gap = fc - bm;
  return { bm:bm, fc:fc, gap:gap, gp: bm > 0 ? (gap / bm * 100) : 0 };
}

function ctyCode_(c){
  return String(c || "").toLowerCase().indexOf("thai") >= 0 ? "TH" : "VN";
}

function groupKey_(cty, seg){
  if (cty === "TH") {
    if (seg === "Surgical") return "TH Surgical";
    if (seg === "Eyeless")  return "TH Eyeless";
    return "TH Dental/MMG";                 // Dental + MMG gộp chung
  }
  return "VN " + seg;
}

// Group → { cty:'t'|'v', segs:[...] } dùng để tra Explanation
function groupToExpl_(gk){
  if (gk === "TH Surgical")   return { co:"t", segs:["Surgical"] };
  if (gk === "TH Dental/MMG") return { co:"t", segs:["Dental","MMG"] };
  if (gk === "TH Eyeless")    return { co:"t", segs:["Eyeless"] };
  return { co:"v", segs:[ gk.replace(/^VN\s+/, "") ] };
}


// ═══════════════════════════════════════════════════════════════════
// EXPLANATION LOOKUP
//   pickVersion_(versions, {ft, sc, ver}) → version mới nhất khớp
// ═══════════════════════════════════════════════════════════════════
function pickVersion_(versions, f){
  f = f || {};
  var list = (versions || []).filter(function(v){
    if (f.ver && String(v.v) !== String(f.ver)) return false;
    if (f.sc  && v.sc !== f.sc)                 return false;
    if (f.ft  && v.ft !== f.ft)                 return false;
    return true;
  });
  if (!list.length && f.ft) {                    // nới lỏng: bỏ lọc ft
    list = (versions || []).filter(function(v){
      if (f.ver && String(v.v) !== String(f.ver)) return false;
      if (f.sc  && v.sc !== f.sc)                 return false;
      return true;
    });
  }
  if (!list.length) return null;
  list.sort(function(a,b){
    var cv = cmpVer_(a.v, b.v);            // ⭐ v4.0 — so theo số
    if (cv) return -cv;
    if (a.ft !== b.ft) return (a.ft||"") < (b.ft||"") ? 1 : -1;
    return 0;
  });
  return list[0];
}

// Lấy explanation cho 1 group ở 1 version
function explForGroup_(ver, gk){
  if (!ver) return "";
  var map = groupToExpl_(gk);
  var co  = (ver.countries || []).filter(function(c){ return c.code === map.co; })[0];
  if (!co) return "";
  var out = [];
  map.segs.forEach(function(sName){
    var sg = (co.segments || []).filter(function(s){ return s.name === sName; })[0];
    if (sg && sg.total && sg.total.e) out.push(sg.total.e);
  });
  return out.join("  •  ");
}

// Lấy explanation cấp Grand Total
function explGrand_(ver){
  if (!ver) return "";
  var g = (ver.countries || []).filter(function(c){ return c.code === "g"; })[0];
  return (g && g.total && g.total.e) ? g.total.e : "";
}

// Danh sách distributor kèm chênh lệch giữa 2 version (dùng cho slide 8)
function versionDrivers_(vNew, vOld){
  if (!vNew) return { dec:[], inc:[], decTotal:0, incTotal:0 };

  function flat(v){
    var out = {};
    (v && v.countries || []).forEach(function(co){
      if (co.code === "g") return;
      (co.segments || []).forEach(function(sg){
        (sg.distributors || []).forEach(function(d){
          out[co.code + "|" + sg.name + "|" + d.name] = {
            co:co.code, seg:sg.name, name:d.name, f:d.f || 0, e:d.e || ""
          };
        });
      });
    });
    return out;
  }

  var A = flat(vNew), B = flat(vOld);
  var items = [];
  Object.keys(A).forEach(function(k){
    var a = A[k], b = B[k];
    var delta = a.f - (b ? b.f : 0);
    if (Math.abs(delta) < 0.5) return;
    items.push({
      group : groupKey_(a.co === "t" ? "TH" : "VN", a.seg),
      name  : a.name,
      delta : delta,
      expl  : a.e
    });
  });

  var dec = items.filter(function(x){ return x.delta < 0; })
                 .sort(function(a,b){ return a.delta - b.delta; });
  var inc = items.filter(function(x){ return x.delta > 0; })
                 .sort(function(a,b){ return b.delta - a.delta; });

  return {
    dec      : groupBy_(dec),
    inc      : groupBy_(inc),
    decTotal : dec.reduce(function(s,x){ return s + x.delta; }, 0),
    incTotal : inc.reduce(function(s,x){ return s + x.delta; }, 0)
  };
}

function groupBy_(items){
  var o = {}, order = [];
  items.forEach(function(x){
    if (!o[x.group]) { o[x.group] = { group:x.group, total:0, rows:[] }; order.push(x.group); }
    o[x.group].total += x.delta;
    o[x.group].rows.push(x);
  });
  return order.map(function(g){ return o[g]; });
}


/* ── formatters dùng chung ─────────────────────────────────────── */

function nfmt_(n){
  if (n == null || isNaN(n)) return "—";
  var r = Math.round(n);
  return r.toLocaleString("en-US");
}

function gfmt_(n){
  if (n == null || isNaN(n)) return "—";
  var r = Math.round(n);
  return (r >= 0 ? "+" : "-") + Math.abs(r).toLocaleString("en-US");
}

function pfmt_(n){
  if (n == null || isNaN(n)) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}


/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PHẦN 2 — DASHBOARD : tab "Dashboard" trong file Sheet backend   ║
   ║  Bộ lọc  : View / Data / Period / Quarter / Month  (hàng 5)      ║
   ║  Bố cục  : ẩn gridlines, không border, phân theo "khoảng ô"      ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const DASH = {
  SHEET   : "DASHBOARD_new",      // ⭐ v4.0 — đúng tên tab đang dùng trong file
  DATA    : "_DashChartData",     // sheet ẩn chứa nguồn dữ liệu cho chart
  MARK    : "«MMH-AUTO-DASHBOARD — tab này do script quản lý, đừng nhập tay»",

  // Hàng cố định của thanh điều khiển
  R_TITLE : 2,
  R_LABEL : 4,
  R_CTRL  : 5,
  R_BODY  : 7,

  // Độ rộng cột (px)  A=spacer, B=label, C..J=dữ liệu, K=spacer, L:M = ô chọn FY (⭐ v4.0)
  COLW    : { A:18, B:172, C:112, D:120, E:104, F:84, G:112, H:120, I:104, J:84, K:18, L:84, M:18 },

  VIEWS   : ["Overview","By Segment","By Country","By Distributor","GAP Analysis","Explanations"],
  MODES   : ["Turnover","Jizai"],              // ⭐ v5.9 — Jizai is in USD from FY68
  PERIODS : ["FY (full year)","Quarter","Month"]
};


/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PHẦN 2A — LỚP CÔNG THỨC REALTIME                                ║
   ║  Dashboard KHÔNG ghi số cứng. Mọi ô số đều là công thức trỏ về    ║
   ║  sheet ẩn "_DashCalc", nơi chứa SUMIFS đọc thẳng tab             ║
   ║  "SUM TURNOVER". Sửa số nguồn → Dashboard đổi ngay, không cần     ║
   ║  chạy lại script. Đổi Period/Quarter/Month/Data cũng recalc ngay. ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const CALC = "_DashCalc";

var FXX = null;              // ngữ cảnh công thức của lần dựng hiện tại

function fxCol_(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

function fxQ_(name) { return "'" + String(name).replace(/'/g, "''") + "'!"; }

/* Dựng sheet _DashCalc. Trả về { rowOf } hoặc null nếu không dò được cột. */
function fxBuild_(ss, m) {
  var src = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!src) return null;

  var lastRow = src.getLastRow(), lastCol = src.getLastColumn();
  if (lastRow < CONFIG.DATA_START_ROW) return null;

  var header = src.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var idx    = autoDetectColumns_(header, CONFIG.COLUMN_MAP);
  var need   = ["type","month","segment","distributor","country","budget","forecast"];
  for (var i = 0; i < need.length; i++) if (idx[need[i]] < 0) return null;

  var SQ = fxQ_(CONFIG.SHEET_NAME);
  // ⭐ v4.0 — vùng MỞ ($M$6:$M) → dòng thêm mới sau này vẫn được cộng
  function R(k) {
    var L = fxCol_(idx[k] + 1);
    return SQ + "$" + L + "$" + CONFIG.DATA_START_ROW + ":$" + L;
  }

  // Cột Month lưu số hay chuỗi? Tiêu chí SUMIFS phải cùng kiểu.
  var nP = Math.min(300, lastRow - CONFIG.DATA_START_ROW + 1);
  var probe = src.getRange(CONFIG.DATA_START_ROW, idx.month + 1, nP, 1).getValues();
  var monthIsNum = false;
  for (var p = 0; p < probe.length; p++) {
    if (typeof probe[p][0] === "number") { monthIsNum = true; break; }
  }

  // FY: bám đúng logic của getTurnoverData_ (ô trống vẫn được tính)
  var fyv = [""];
  if (idx.fy >= 0) {
    var fvals = src.getRange(CONFIG.DATA_START_ROW, idx.fy + 1,
                             lastRow - CONFIG.DATA_START_ROW + 1, 1).getValues();
    var hasOther = false, hasBlank = false;
    for (var q = 0; q < fvals.length; q++) {
      var t = String(fvals[q][0] == null ? "" : fvals[q][0]).toUpperCase().trim();
      if (!t) hasBlank = true;
      else if (t !== String(CONFIG.FY_FILTER).toUpperCase()) hasOther = true;
    }
    if (hasOther) {
      fyv = ["," + R("fy") + ',"' + CONFIG.FY_FILTER + '"'];
      if (hasBlank) fyv.push("," + R("fy") + ',""');
    }
  }

  // ⭐ v4.0 — quy tắc Actual/Forecast mới cần 2 cột O (Forecast) & P (Actual)
  var split  = idx.fcRaw >= 0 && idx.actual >= 0;
  // ⭐ v4.0 — gom nước theo cột Country (nước thật)
  var byPhys = CONFIG.COUNTRY_GROUP_BY === "country" && idx.countryPhys >= 0;
  var cg     = countryGroupCfg_(CONFIG.FY_FILTER);

  function sumExpr_(metric, monthRef, extra, alts) {
    alts = (alts && alts.length) ? alts : [""];
    var parts = [];
    fyv.forEach(function(f){
      alts.forEach(function(a){
        parts.push("SUMIFS(" + R(metric) +
          "," + R("type")        + ",$B$2" +
          "," + R("type")        + ",$B$4" +
          "," + R("type")        + ',"<>*composite*"' +
          "," + R("month")       + "," + monthRef +
          "," + R("segment")     + ',"<>"' +
          "," + R("distributor") + ',"<>"' +
          "," + R("country")     + ',"<>"' +
          (extra || "") + a + f + ")");
      });
    });
    return parts.join("+");
  }
  function ctyAlts_(cty) {
    if (byPhys) {
      if (cty === "TH") return cg.th.map(function(c){ return "," + R("countryPhys") + ',"' + c + '"'; });
      return [ cg.th.map(function(c){ return "," + R("countryPhys") + ',"<>' + c + '"'; }).join("") ];
    }
    return [ "," + R("country") + (cty === "TH" ? ',"*thai*"' : ',"<>*thai*"') ];
  }
  // Ô Fct/Actual tháng k: đã chốt → Actual (cột P), chưa → Forecast (cột O)
  function fcCell_(k, extra, alts) {
    var mref = fxCol_(15 + k) + "$5";
    if (!split) return "=" + sumExpr_("forecast", mref, extra, alts);
    return "=IF(" + fxCol_(3 + k) + "$9," + sumExpr_("actual", mref, extra, alts) + "," +
           sumExpr_("fcRaw", mref, extra, alts) + ")";
  }

  // ── Dựng sheet ──
  var calc = ss.getSheetByName(CALC);
  if (!calc) calc = ss.insertSheet(CALC);
  calc.clear();

  var D     = fxQ_(DASH.SHEET);
  var qList = "{" + RPT.QLBL.map(function(x){ return '"' + x + '"'; }).join(";") + "}";
  var mList = "{" + RPT.MFULL.map(function(x){ return '"' + x + '"'; }).join(";") + "}";

  calc.getRange(1, 1, 3, 2).setValues([
    ["endM",  '=IF(' + D + '$F$5="' + DASH.PERIODS[1] + '",MATCH(' + D + '$H$5,' + qList + ',0)*3,' +
              'IF(' + D + '$F$5="' + DASH.PERIODS[2] + '",MATCH(TO_TEXT(' + D + '$J$5),' + mList + ',0),12))'],
    ["type",  '=IF(' + D + '$D$5="' + DASH.MODES[1] + '","*Jizai*","*Turnover*")'],
    ["scale", jizaiInSheets_(CONFIG.FY_FILTER) ? '=IF(' + D + '$D$5="' + DASH.MODES[1] + '",1,1000)' : 1000]   // ⭐ v5.9
  ]);
  // ⭐ v5.9 — Turnover mode must not pick up a Type such as "Jizai Turnover" / "Composite Turnover"
  calc.getRange(4, 1, 1, 2).setValues([["type excl.", '=IF(' + D + '$D$5="' + DASH.MODES[1] + '","*","<>*jizai*")']]);

  var keys = CONFIG.VALID_MONTHS.map(function(k){ return monthIsNum ? Number(k) : String(k); });
  calc.getRange(5, 1, 1, 2).setValues([["monthKey", "B=budget · F=forecast · " + CONFIG.FY_FILTER]]);
  calc.getRange(5, 3,  1, 12).setValues([keys]);
  calc.getRange(5, 15, 1, 12).setValues([keys]);

  var mS = [], mC = [], mY = [], fl = [];
  for (var i2 = 0; i2 < 12; i2++) {
    var qi = Math.floor(i2 / 3) + 1;
    var Lk = fxCol_(3 + i2);
    mS.push('=IF(' + D + '$F$5="' + DASH.PERIODS[1] + '",IF(' + D + '$H$5="Q' + qi + '",1,0),' +
            'IF(' + D + '$F$5="' + DASH.PERIODS[2] + '",IF(TO_TEXT(' + D + '$J$5)="' + RPT.MFULL[i2] + '",1,0),1))');
    mC.push('=IF(' + (i2 + 1) + '<=$B$1,1,0)');
    mY.push(1);
    // ⭐ v4.0 — cờ "tháng đã chốt": đã qua (tháng hiện tại từ ngày cutoff) VÀ đã có Actual
    fl.push(split
      ? '=AND(OR(VALUE(' + Lk + '$5)<VALUE(TEXT(TODAY(),"yyyyMM")),' +
          'AND(VALUE(' + Lk + '$5)=VALUE(TEXT(TODAY(),"yyyyMM")),DAY(TODAY())>=' + CONFIG.ACTUAL_CUTOFF_DAY + ')),' +
          'SUMIFS(' + R("actual") + ',' + R("type") + ',$B$2,' + R("type") + ',$B$4,' + R("type") + ',"<>*composite*",' + R("month") + ',' + Lk + '$5)<>0)'
      : false);
  }
  calc.getRange(6, 1, 4, 2).setValues([["maskSingle",""],["maskCum",""],["maskFY",""],
                                       ["closed", split ? "TRUE = dùng Actual" : "(không tách O/P)"]]);
  calc.getRange(6, 3, 1, 12).setValues([mS]);
  calc.getRange(7, 3, 1, 12).setValues([mC]);
  calc.getRange(8, 3, 1, 12).setValues([mY]);
  calc.getRange(9, 3, 1, 12).setValues([fl]);

  // ── Các dòng thực thể ──
  var rowOf = {}, out = [], r = 10;

  function addSum_(key, label, extra, alts) {
    var line = [key, label], k;
    for (k = 0; k < 12; k++) line.push("=" + sumExpr_("budget", fxCol_(3 + k) + "$5", extra, alts));
    for (k = 0; k < 12; k++) line.push(fcCell_(k, extra, alts));
    out.push(line); rowOf[key] = r++;
  }
  function addRef_(key, label, srcKeys) {
    var live = srcKeys.filter(function(k){ return rowOf[k]; });
    var line = [key, label];
    for (var c = 0; c < 24; c++) {
      var L = fxCol_(3 + c);
      line.push(live.length ? "=" + live.map(function(k){ return L + rowOf[k]; }).join("+") : 0);
    }
    out.push(line); rowOf[key] = r++;
  }

  RPT.CTYS.forEach(function(cty){
    RPT.SEGS.forEach(function(seg){
      addSum_("SC|" + cty + "|" + seg, RPT.CTYL[cty] + " - " + seg,
        "," + R("segment") + ',"' + seg + '"', ctyAlts_(cty));
    });
  });

  // ⭐ v4.0 — NPP theo Tên + Segment
  (m.dists || []).forEach(function(d){
    addSum_("D|" + d.key, d.name + " · " + d.seg,
      "," + R("distributor") + ',"' + String(d.name).replace(/"/g, '""') + '"' +
      "," + R("segment")     + ',"' + String(d.seg).replace(/"/g, '""') + '"', null);
  });

  var allSC = [];
  RPT.CTYS.forEach(function(cty){
    RPT.SEGS.forEach(function(seg){ allSC.push("SC|" + cty + "|" + seg); });
  });

  RPT.SEGS.forEach(function(seg){
    addRef_("S|" + seg, seg, RPT.CTYS.map(function(c){ return "SC|" + c + "|" + seg; }));
  });
  RPT.CTYS.forEach(function(cty){
    addRef_("C|" + cty, RPT.CTYL[cty], RPT.SEGS.map(function(s){ return "SC|" + cty + "|" + s; }));
  });

  var gmap = {};
  RPT.CTYS.forEach(function(cty){
    RPT.SEGS.forEach(function(seg){
      var gk = groupKey_(cty, seg);
      if (!gmap[gk]) gmap[gk] = [];
      gmap[gk].push("SC|" + cty + "|" + seg);
    });
  });
  Object.keys(gmap).forEach(function(gk){ addRef_("G|" + gk, gk, gmap[gk]); });

  addRef_("GRAND", "GRAND TOTAL", allSC);

  if (out.length) calc.getRange(10, 1, out.length, 26).setValues(out);
  calc.setColumnWidth(1, 200).setColumnWidth(2, 180);
  try { calc.hideSheet(); } catch (e) {}

  return { rowOf:rowOf, monthIsNum:monthIsNum, split:split, byPhys:byPhys };
}


/* ── Bộ sinh công thức cho ô trên Dashboard ────────────────────────
   key    : "GRAND" | "G|<nhóm>" | "S|<segment>" | "C|<TH|VN>"
            | "SC|<cty>|<seg>" | "D|<distributor>"
   metric : "b" (budget) | "f" (forecast)
   mask   : "s" (kỳ đang chọn) | "c" (luỹ kế) | "y" (cả FY)
   fb     : giá trị số dự phòng khi chưa dựng được _DashCalc          */
function fxN_(key, metric, mask, fb) {
  if (!FXX || !FXX.rowOf || !FXX.rowOf[key]) return (fb == null ? 0 : fb);
  var r  = FXX.rowOf[key];
  var mr = (mask === "c") ? 7 : (mask === "y" ? 8 : 6);
  var c1 = (metric === "b") ? "C" : "O";
  var c2 = (metric === "b") ? "N" : "Z";
  var Q  = fxQ_(CALC);
  return "=IFERROR(SUMPRODUCT(" + Q + "$" + c1 + "$" + r + ":$" + c2 + "$" + r +
         "," + Q + "$C$" + mr + ":$N$" + mr + ")/" + Q + "$B$3,0)";
}

// GAP = Forecast − Budget, trỏ vào 2 ô ngay trên cùng dòng Dashboard
function fxGap_(row, bmCol, fcCol, fb) {
  if (!FXX) return (fb == null ? 0 : fb);
  return "=" + fcCol + row + "-" + bmCol + row;
}

// %GAP = GAP / Budget
function fxPct_(row, gapCol, bmCol, fb) {
  if (!FXX) return (fb == null ? 0 : fb);
  return "=IFERROR(" + gapCol + row + "/" + bmCol + row + ",0)";
}

// GAP của cả kỳ (Forecast − Budget) khi không có sẵn 2 ô để trừ
function fxGapAgg_(key, mask, fb) {
  if (!FXX || !FXX.rowOf || !FXX.rowOf[key]) return (fb == null ? 0 : fb);
  var r  = FXX.rowOf[key];
  var mr = (mask === "c") ? 7 : (mask === "y" ? 8 : 6);
  var Q  = fxQ_(CALC);
  var mk = "," + Q + "$C$" + mr + ":$N$" + mr + ")";
  return "=IFERROR((SUMPRODUCT(" + Q + "$O$" + r + ":$Z$" + r + mk +
         "-SUMPRODUCT(" + Q + "$C$" + r + ":$N$" + r + mk + ")/" + Q + "$B$3,0)";
}

// Giá trị 1 tháng (dùng cho dữ liệu biểu đồ)
function fxMonth_(key, metric, mi, fb) {
  if (!FXX || !FXX.rowOf || !FXX.rowOf[key]) return (fb == null ? 0 : fb);
  var r = FXX.rowOf[key];
  var L = fxCol_((metric === "b" ? 3 : 15) + mi);
  var Q = fxQ_(CALC);
  return "=IFERROR(" + Q + "$" + L + "$" + r + "/" + Q + "$B$3,0)";
}

// GAP của 1 tháng
function fxMonthGap_(key, mi, fb) {
  if (!FXX || !FXX.rowOf || !FXX.rowOf[key]) return (fb == null ? 0 : fb);
  var r  = FXX.rowOf[key];
  var Lb = fxCol_(3 + mi), Lf = fxCol_(15 + mi), Q = fxQ_(CALC);
  return "=IFERROR((" + Q + "$" + Lf + "$" + r + "-" + Q + "$" + Lb + "$" + r +
         ")/" + Q + "$B$3,0)";
}

// Tổng 1 quý (3 tháng liên tiếp)
function fxQtr_(key, metric, qi, fb) {
  if (!FXX || !FXX.rowOf || !FXX.rowOf[key]) return (fb == null ? 0 : fb);
  var r = FXX.rowOf[key], Q = fxQ_(CALC);
  var a = fxCol_((metric === "b" ? 3 : 15) + RPT.QIDX[qi][0]);
  var b = fxCol_((metric === "b" ? 3 : 15) + RPT.QIDX[qi][2]);
  return "=IFERROR(SUM(" + Q + "$" + a + "$" + r + ":$" + b + "$" + r + ")/" + Q + "$B$3,0)";
}

function fxQtrGap_(key, qi, fb) {
  if (!FXX || !FXX.rowOf || !FXX.rowOf[key]) return (fb == null ? 0 : fb);
  var r = FXX.rowOf[key], Q = fxQ_(CALC);
  var ab = fxCol_(3  + RPT.QIDX[qi][0]), bb = fxCol_(3  + RPT.QIDX[qi][2]);
  var af = fxCol_(15 + RPT.QIDX[qi][0]), bf = fxCol_(15 + RPT.QIDX[qi][2]);
  return "=IFERROR((SUM(" + Q + "$" + af + "$" + r + ":$" + bf + "$" + r + ")-SUM(" +
         Q + "$" + ab + "$" + r + ":$" + bb + "$" + r + "))/" + Q + "$B$3,0)";
}


// ═══════════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 MMH Report")
    .addItem("📅 Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR sheets", "buildYearQuarterSheets")   // ⭐ v5.0
    .addItem("🎯 Send turnover actuals to the KPI file now", "kptSyncNow")                        // ⭐ v5.7
    .addSeparator()
    .addItem("Build / refresh Dashboard", "buildDashboard")
    .addItem("Export PowerPoint (Dashboard filters)", "exportReportPpt")
    .addSeparator()
    .addItem("Install Dashboard auto-refresh trigger", "installDashboardTrigger")
    .addItem("Remove Dashboard trigger", "removeDashboardTrigger")
    .addSeparator()
    .addItem("🔧 Check setup", "checkReportSetup")
    .addItem("🩺 Check data health", "showDataHealth")        // ⭐ v4.0
    .addToUi();
}


// ═══════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════
function buildDashboard() {
  // ⭐ v4.0 — khoá: đổi dropdown liên tục không làm 2 lần dựng chạy chồng nhau
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) { Logger.log("buildDashboard: đang có lần dựng khác — bỏ qua."); return "BUSY"; }
  try { return buildDashboardCore_(); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}

// Tab do script quản lý: có dấu ở A1, hoặc đang trống hoàn toàn
function isAutoDash_(sh) {
  if (sh.getLastRow() === 0 && sh.getLastColumn() === 0) return true;
  return String(sh.getRange(1, 1).getValue() || "").indexOf("MMH-AUTO-DASHBOARD") >= 0;
}

function buildDashboardCore_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(DASH.SHEET);
  if (!sh) sh = ss.insertSheet(DASH.SHEET, 0);
  else if (!isAutoDash_(sh)) {
    throw new Error("Tab '" + DASH.SHEET + "' không có dấu của script ở ô A1 — dừng lại để tránh xoá nhầm dữ liệu. " +
                    "Đổi DASH.SHEET sang tên tab khác hoặc xoá tab đó rồi chạy lại.");
  }

  var ctrl = readControls_(sh);          // giữ lại lựa chọn hiện tại
  var m    = buildModel_(ctrlToOpt_(ctrl));

  resetSheet_(sh);
  sh.getRange(1, 1).setValue(DASH.MARK).setFontSize(7).setFontColor("#B9C3CE");   // ⭐ v4.0

  // Dựng lớp công thức realtime (sheet ẩn _DashCalc) TRƯỚC khi vẽ,
  // để mọi ô số phía dưới đều là công thức trỏ vào đó.
  FXX = null;
  try {
    FXX = fxBuild_(ss, m);
  } catch (fxErr) {
    FXX = null;
    Logger.log("fxBuild_ lỗi, Dashboard sẽ ghi số tĩnh: " + fxErr);
  }

  drawControlBar_(sh, ctrl, m);

  var ctx = { sh:sh, ss:ss, row:DASH.R_BODY, m:m, charts:[], dataRow:1 };
  prepareDataSheet_(ss);

  switch (ctrl.view) {
    case "By Segment"    : viewSegment_(ctx);     break;
    case "By Country"    : viewCountry_(ctx);     break;
    case "By Distributor": viewDistributor_(ctx); break;
    case "GAP Analysis"  : viewGap_(ctx);         break;
    case "Explanations"  : viewExplanations_(ctx);break;
    default              : viewOverview_(ctx);
  }

  finishSheet_(sh, ctx);
  ss.setActiveSheet(sh);
  return "OK";
}


// Chạy khi người dùng đổi dropdown ở thanh lọc (hàng 5) của tab Dashboard
function dashboardOnEdit_(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== DASH.SHEET) return;
  if (e.range.getRow() !== DASH.R_CTRL) return;
  if (e.range.getColumn() > 13) return;        // ⭐ v4.0 — thêm ô FY ở L5
  buildDashboard();
}


/* ══════════════════════════════════════════════════════════════════
   THANH ĐIỀU KHIỂN
   ══════════════════════════════════════════════════════════════════ */

function readControls_(sh) {
  var d = {
    view   : DASH.VIEWS[0],
    mode   : DASH.MODES[0],
    period : DASH.PERIODS[0],
    qtr    : "Q4",
    month  : "",
    fy     : ""
  };
  var v = null;
  try {
    v = sh.getRange(DASH.R_CTRL, 2, 1, 12).getValues()[0];      // B5 … M5
    if (DASH.VIEWS.indexOf(v[0])   >= 0) d.view   = v[0];
    if (DASH.MODES.indexOf(v[2])   >= 0) d.mode   = v[2];
    if (DASH.PERIODS.indexOf(v[4]) >= 0) d.period = v[4];
    if (RPT.QLBL.indexOf(v[6])     >= 0) d.qtr    = v[6];
    var f = String(v[10] || "").toUpperCase().trim();          // ⭐ v4.0 — ô FY (L5)
    if (/^FY\d+$/.test(f)) d.fy = f;
  } catch (err) {}

  // ⭐ v4.0 — đặt FY trước rồi mới kiểm tra tháng (danh sách tháng theo FY)
  setFyContext_(d.fy);
  d.fy = CONFIG.FY_FILTER;

  // Ô Month có thể đã bị Sheets đổi thành NGÀY (vd 01/12/2025) → đổi lại "MM/yyyy"
  var ms = monthCellText_(v ? v[8] : "");
  if (RPT.MFULL.indexOf(ms) >= 0) {
    d.month = ms;
  } else if (ms && ms.length >= 2) {                            // đổi FY → giữ cùng tháng lịch
    var same = RPT.MFULL.filter(function(x){ return x.slice(0, 2) === ms.slice(0, 2); })[0];
    if (same) d.month = same;
  }
  if (!d.month) {
    var now = todayKeyDay_().key, k = CONFIG.VALID_MONTHS.indexOf(now);
    d.month = RPT.MFULL[k >= 0 ? k : 11];
  }
  return d;
}

// Giá trị ô Month (chuỗi / ngày / số) → "MM/yyyy"
function monthCellText_(x) {
  if (x === null || x === undefined || x === "") return "";
  if (x instanceof Date) return Utilities.formatDate(x, Session.getScriptTimeZone(), "MM/yyyy");
  var s = String(x).trim();
  if (/^\d{6}(\.0+)?$/.test(s)) return s.slice(4, 6) + "/" + s.slice(0, 4);   // 202612 → 12/2026
  var m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return pad2_(m[1]) + "/" + m[2];
  return s;
}

function ctrlToOpt_(c) {
  return {
    mode   : /jizai/i.test(String(c.mode || "")) ? "jizai" : "turnover",
    period : c.period === "Quarter" ? "qtr" : (c.period === "Month" ? "month" : "fy"),
    qi     : Math.max(0, RPT.QLBL.indexOf(c.qtr)),
    mi     : Math.max(0, RPT.MFULL.indexOf(c.month)),
    fy     : c.fy || ""                                        // ⭐ v4.0
  };
}

// Danh sách FY cho ô chọn (luôn có FY đang xem)
function fyChoices_(cur) {
  var list = listFys_().slice();
  if (cur && list.indexOf(cur) < 0) list.push(cur);
  if (!list.length) list = [CONFIG.FY_FILTER];
  return list.sort(function(a, b){ return fyNum_(a) - fyNum_(b); });
}

function drawControlBar_(sh, c, m) {
  // Tiêu đề
  mset_(sh, DASH.R_TITLE, 2, 1, 6,
        "MMH TURNOVER DASHBOARD  ·  " + CONFIG.FY_FILTER,
        { size:19, bold:true, color:RPT.C.navy, valign:"middle" });

  mset_(sh, DASH.R_TITLE, 8, 1, 3,
        "Dựng bố cục: " + Utilities.formatDate(new Date(),
            Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm") + " · số tự cập nhật",
        { size:9, color:RPT.C.gray, align:"right", valign:"middle" });

  sh.setRowHeight(DASH.R_TITLE, 34);
  sh.setRowHeight(DASH.R_LABEL, 16);
  sh.setRowHeight(DASH.R_CTRL, 26);

  var labels = [
    [2,  "VIEW"],
    [4,  "DATA"],
    [6,  "PERIOD"],
    [8,  "QUARTER"],
    [10, "MONTH"],
    [12, "FY"]                      // ⭐ v4.0
  ];
  labels.forEach(function(x){
    mset_(sh, DASH.R_LABEL, x[0], 1, 2, x[1],
          { size:8, bold:true, color:RPT.C.gray, valign:"bottom" });
  });

  var ctrls = [
    [2,  c.view,   DASH.VIEWS],
    [4,  c.mode,   DASH.MODES],
    [6,  c.period, DASH.PERIODS],
    [8,  c.qtr,    RPT.QLBL],
    [10, c.month,  RPT.MFULL],
    [12, c.fy,     fyChoices_(c.fy)]      // ⭐ v4.0
  ];
  ctrls.forEach(function(x){
    var r = sh.getRange(DASH.R_CTRL, x[0], 1, 2);
    r.merge();
    r.setNumberFormat("@");               // ⭐ v4.0 — giữ dạng chữ, "12/2025" không bị đổi thành ngày
    r.setValue(x[1]);
    r.setFontSize(11).setFontWeight("bold").setFontColor(RPT.C.navy)
     .setBackground(RPT.C.panel).setVerticalAlignment("middle")
     .setHorizontalAlignment("center");
    r.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(x[2], true).setAllowInvalid(false).build());
  });

  // Làm mờ 2 ô Quarter / Month khi không dùng đến
  if (c.period !== "Quarter")
    sh.getRange(DASH.R_CTRL, 8, 1, 2).setFontColor("#B9C3CE").setBackground("#F5F7FA");
  if (c.period !== "Month")
    sh.getRange(DASH.R_CTRL, 10, 1, 2).setFontColor("#B9C3CE").setBackground("#F5F7FA");

  // Dòng ngữ cảnh
  mset_(sh, DASH.R_CTRL + 1, 2, 1, 9,
        c.view + "   ·   " + m.periodLabel + "   ·   Đơn vị: " + m.unit +
        (FXX && FXX.split ? "   ·   Fct/Actual: có Actual thì dùng Actual" : "") +
        (FXX ? "   ·   ⚡ REALTIME (ô số là công thức SUMIFS, tự cập nhật theo tab '" +
                CONFIG.SHEET_NAME + "')"
             : "   ·   ⚠ chế độ số tĩnh — chạy lại menu để cập nhật"),
        { size:9, bold:true, color:(FXX ? RPT.C.blue : RPT.C.neg), valign:"middle" });
}


/* ══════════════════════════════════════════════════════════════════
   VIEW 1 — OVERVIEW
   ══════════════════════════════════════════════════════════════════ */

function viewOverview_(ctx) {
  var m = ctx.m;

  kpiStrip_(ctx, "SINGLE  ·  "     + m.periodLabel, m.single, m.unit, "GRAND", "s");
  kpiStrip_(ctx, "CUMULATIVE  ·  " + m.cumLabel,    m.cum,    m.unit, "GRAND", "c");

  // ── Bảng theo NHÓM (đúng ảnh gửi kèm) ──
  bandTitle_(ctx, "SEGMENT GROUP  ·  Single vs Cumulative", 2, 10);

  var sh = ctx.sh, r = ctx.row;
  mset_(sh, r, 2, 2, 1, "SEGMENT GROUP", subHdrStyle_());
  mset_(sh, r, 3, 1, 4, "SINGLE  —  " + m.periodShort,
        subHdrStyle_({ align:"center", bg:"#F2F6FC" }));
  mset_(sh, r, 7, 1, 4, "CUMULATIVE  —  " + m.cumLabel,
        subHdrStyle_({ align:"center", bg:"#F2F6FC" }));

  var h2 = ["Budget","Fct/Actual","GAP","%GAP","Budget","Fct/Actual","GAP","%GAP"];
  h2.forEach(function(t, i){
    mset_(sh, r + 1, 3 + i, 1, 1, t,
          subHdrStyle_({ size:9, align:"center", bg:"#F2F6FC" }));
  });
  sh.setRowHeight(r, 22); sh.setRowHeight(r + 1, 18);
  ctx.row = r + 2;

  // Cột trên sheet:  B nhãn | C D E F single | G H I J cumulative
  var R0 = ctx.row;
  var body = [], vals = [];
  m.groups.forEach(function(g, i){
    var k  = "G|" + g.key;
    var rr = R0 + i;
    body.push([g.key,
      fxN_(k, "b", "s", g.single.bm), fxN_(k, "f", "s", g.single.fc),
      fxGap_(rr, "C", "D", g.single.gap), fxPct_(rr, "E", "C", g.single.gp / 100),
      fxN_(k, "b", "c", g.cum.bm),    fxN_(k, "f", "c", g.cum.fc),
      fxGap_(rr, "G", "H", g.cum.gap), fxPct_(rr, "I", "G", g.cum.gp / 100)]);
    vals.push([g.key, g.single.bm, g.single.fc, g.single.gap, g.single.gp / 100,
                      g.cum.bm,    g.cum.fc,    g.cum.gap,    g.cum.gp / 100]);
  });
  var rT = R0 + m.groups.length;
  body.push(["GRAND TOTAL",
    fxN_("GRAND", "b", "s", m.single.bm), fxN_("GRAND", "f", "s", m.single.fc),
    fxGap_(rT, "C", "D", m.single.gap),   fxPct_(rT, "E", "C", m.single.gp / 100),
    fxN_("GRAND", "b", "c", m.cum.bm),    fxN_("GRAND", "f", "c", m.cum.fc),
    fxGap_(rT, "G", "H", m.cum.gap),      fxPct_(rT, "I", "G", m.cum.gp / 100)]);
  vals.push(["GRAND TOTAL", m.single.bm, m.single.fc, m.single.gap, m.single.gp / 100,
                            m.cum.bm,    m.cum.fc,    m.cum.gap,    m.cum.gp / 100]);

  numTable_(ctx, body, { gapCols:[4,8], pctCols:[5,9], totalRow:true, vals:vals });
  gapRows_(ctx, 1);

  // ── Charts ──
  bandTitle_(ctx, "SINGLE  " + m.periodShort + "   ·   Budget vs Fct/Actual vs GAP        |        " +
                  "CUMULATIVE  " + m.cumLabel + "   ·   Budget vs Fct/Actual vs GAP", 2, 10);

  var rgA = pushData_(ctx, [["", "Value"],
    ["Budget Mani", fxN_("GRAND", "b", "s", m.single.bm)],
    ["Fct/Actual",  fxN_("GRAND", "f", "s", m.single.fc)],
    ["GAP",         fxGapAgg_("GRAND", "s", m.single.gap)]]);
  var rgB = pushData_(ctx, [["", "Value"],
    ["Budget Mani", fxN_("GRAND", "b", "c", m.cum.bm)],
    ["Fct/Actual",  fxN_("GRAND", "f", "c", m.cum.fc)],
    ["GAP",         fxGapAgg_("GRAND", "c", m.cum.gap)]]);

  chartSlot_(ctx, 13, [
    { range:rgA, type:"col", w:496, h:262, col:2,
      title:"SINGLE " + m.periodShort, colors:[RPT.C.blue] },
    { range:rgB, type:"col", w:496, h:262, col:7,
      title:"CUMULATIVE " + m.cumLabel, colors:[RPT.C.blue] }
  ]);

  bandTitle_(ctx, "GAP by SEGMENT GROUP   ·   Single (trái)  |  Cumulative (phải)", 2, 10);

  var gs = [["Group","GAP"]], gc = [["Group","GAP"]];
  m.groups.slice().reverse().forEach(function(g){
    gs.push([g.key, fxGapAgg_("G|" + g.key, "s", g.single.gap)]);
    gc.push([g.key, fxGapAgg_("G|" + g.key, "c", g.cum.gap)]);
  });
  var rgC = pushData_(ctx, gs), rgD = pushData_(ctx, gc);

  chartSlot_(ctx, 14, [
    { range:rgC, type:"bar", w:496, h:280, col:2,
      title:"Single GAP", colors:[RPT.C.neg] },
    { range:rgD, type:"bar", w:496, h:280, col:7,
      title:"Cumulative GAP", colors:[RPT.C.pos] }
  ]);

  // ── Xu hướng FY ──
  bandTitle_(ctx, CONFIG.FY_FILTER + " Turnover by MONTH   |   by QUARTER", 2, 10);

  var mm = [["Month","Budget Mani","Fct/Actual","GAP"]];
  m.months.forEach(function(x, i){
    mm.push([x.lbl, fxMonth_("GRAND", "b", i, x.bm),
                    fxMonth_("GRAND", "f", i, x.fc),
                    fxMonthGap_("GRAND", i, x.gap)]);
  });
  var qq = [["Quarter","Budget Mani","Fct/Actual","GAP"]];
  m.quarters.forEach(function(x, i){
    qq.push([x.lbl, fxQtr_("GRAND", "b", i, x.bm),
                    fxQtr_("GRAND", "f", i, x.fc),
                    fxQtrGap_("GRAND", i, x.gap)]);
  });

  var rgM = pushData_(ctx, mm), rgQ = pushData_(ctx, qq);
  chartSlot_(ctx, 16, [
    { range:rgM, type:"combo", w:640, h:320, col:2,
      title:CONFIG.FY_FILTER + " by Month",
      colors:[RPT.C.chBud, RPT.C.chAct, RPT.C.blue] },
    { range:rgQ, type:"combo", w:352, h:320, col:8,
      title:CONFIG.FY_FILTER + " by Quarter",
      colors:[RPT.C.chBud, RPT.C.chAct, RPT.C.blue] }
  ]);

  // ── Bảng Segment × Country ──
  bandTitle_(ctx, "SUMMARY  ·  Segment × Country  (" + m.periodLabel + ")", 2, 10);
  header_(ctx, ["Segment × Country","Budget","Fct/Actual","GAP","%GAP",
                "Budget FY","Fct/Actual FY","GAP FY","%GAP FY"]);
  var R1 = ctx.row, rows = [], v2 = [];
  m.segCty.forEach(function(x, i){
    var k = "SC|" + x.cty + "|" + x.seg, rr = R1 + i;
    rows.push([RPT.CTYL[x.cty] + " — " + x.seg,
      fxN_(k, "b", "s", x.single.bm), fxN_(k, "f", "s", x.single.fc),
      fxGap_(rr, "C", "D", x.single.gap), fxPct_(rr, "E", "C", x.single.gp / 100),
      fxN_(k, "b", "y", x.fy.bm),    fxN_(k, "f", "y", x.fy.fc),
      fxGap_(rr, "G", "H", x.fy.gap), fxPct_(rr, "I", "G", x.fy.gp / 100)]);
    v2.push(["", x.single.bm, x.single.fc, x.single.gap, x.single.gp / 100,
                 x.fy.bm,     x.fy.fc,     x.fy.gap,     x.fy.gp / 100]);
  });
  numTable_(ctx, rows, { gapCols:[4,8], pctCols:[5,9], vals:v2 });
}


/* ══════════════════════════════════════════════════════════════════
   VIEW 2 — BY SEGMENT
   ══════════════════════════════════════════════════════════════════ */

function viewSegment_(ctx) {
  var m = ctx.m;
  kpiStrip_(ctx, "TỔNG  ·  " + m.periodLabel, m.single, m.unit, "GRAND", "s");

  var sd = [["Segment","Budget Mani","Fct/Actual","GAP"]];
  m.segs.forEach(function(s){
    var k = "S|" + s.key;
    sd.push([s.key, fxN_(k, "b", "s", s.single.bm),
                    fxN_(k, "f", "s", s.single.fc),
                    fxGapAgg_(k, "s", s.single.gap)]);
  });
  var rg = pushData_(ctx, sd);
  bandTitle_(ctx, "SEGMENT  ·  Budget vs Fct/Actual vs GAP", 2, 10);
  chartSlot_(ctx, 15, [{ range:rg, type:"combo", w:1000, h:300, col:2,
    title:"", colors:[RPT.C.chBud, RPT.C.chAct, RPT.C.blue] }]);

  m.segs.forEach(function(s){
    bandTitle_(ctx, "📦  " + s.key.toUpperCase() +
      "     ·     " + m.periodShort + ": " + nfmt_(s.single.fc) + " " + m.unit +
      "   (" + gfmt_(s.single.gap) + " / " + pfmt_(s.single.gp) + ")", 2, 10);

    header_(ctx, ["Distributor","Country","Budget","Fct/Actual","GAP","%GAP",
                  "Budget FY","Fct/Actual FY","GAP FY"]);

    // Cột sheet: B tên | C country | D E F G single | H I J FY
    var R0 = ctx.row, rows = [], vals = [];
    m.dists.filter(function(d){ return d.seg === s.key; })
      .sort(function(a,b){ return b.single.fc - a.single.fc; })
      .forEach(function(d, i){
        var k = "D|" + d.key, rr = R0 + i;
        rows.push([d.name, RPT.CTYL[d.cty],
          fxN_(k, "b", "s", d.single.bm), fxN_(k, "f", "s", d.single.fc),
          fxGap_(rr, "D", "E", d.single.gap), fxPct_(rr, "F", "D", d.single.gp / 100),
          fxN_(k, "b", "y", d.fy.bm),     fxN_(k, "f", "y", d.fy.fc),
          fxGap_(rr, "H", "I", d.fy.gap)]);
        vals.push(["", "", d.single.bm, d.single.fc, d.single.gap, d.single.gp / 100,
                           d.fy.bm, d.fy.fc, d.fy.gap]);
      });
    if (!rows.length) {
      rows = [["(không có dữ liệu)", "", 0, 0, 0, 0, 0, 0, 0]];
      vals = [["", "", 0, 0, 0, 0, 0, 0, 0]];
    }
    numTable_(ctx, rows, { gapCols:[5,9], pctCols:[6], textCols:[2], startNum:3, vals:vals });
    gapRows_(ctx, 1);
  });
}


/* ══════════════════════════════════════════════════════════════════
   VIEW 3 — BY COUNTRY
   ══════════════════════════════════════════════════════════════════ */

function viewCountry_(ctx) {
  var m = ctx.m;

  m.ctys.forEach(function(c){
    kpiStrip_(ctx, c.name.toUpperCase() + "  ·  " + m.periodLabel,
              c.single, m.unit, "C|" + c.key, "s");
  });

  bandTitle_(ctx, "COUNTRY  ·  Budget vs Fct/Actual vs GAP", 2, 10);
  var cd = [["Country","Budget Mani","Fct/Actual","GAP"]];
  m.ctys.forEach(function(c){
    var k = "C|" + c.key;
    cd.push([c.name, fxN_(k, "b", "s", c.single.bm),
                     fxN_(k, "f", "s", c.single.fc),
                     fxGapAgg_(k, "s", c.single.gap)]);
  });
  var rgC = pushData_(ctx, cd);

  var gd = [["Group","GAP"]];
  m.groups.slice().reverse().forEach(function(g){
    gd.push([g.key, fxGapAgg_("G|" + g.key, "s", g.single.gap)]);
  });
  var rgG = pushData_(ctx, gd);

  chartSlot_(ctx, 14, [
    { range:rgC, type:"combo", w:496, h:280, col:2, title:"Country",
      colors:[RPT.C.chBud, RPT.C.chAct, RPT.C.blue] },
    { range:rgG, type:"bar", w:496, h:280, col:7, title:"GAP by group",
      colors:[RPT.C.neg] }
  ]);

  m.ctys.forEach(function(c){
    bandTitle_(ctx, "🌏  " + c.name.toUpperCase(), 2, 10);
    header_(ctx, ["Segment","Budget","Fct/Actual","GAP","%GAP",
                  "Budget CUM","Fct/Actual CUM","GAP CUM","%GAP CUM"]);

    var R0 = ctx.row, rows = [], vals = [];
    var list = m.segCty.filter(function(x){ return x.cty === c.key; });
    list.forEach(function(x, i){
      var k = "SC|" + x.cty + "|" + x.seg, rr = R0 + i;
      rows.push([x.seg,
        fxN_(k, "b", "s", x.single.bm), fxN_(k, "f", "s", x.single.fc),
        fxGap_(rr, "C", "D", x.single.gap), fxPct_(rr, "E", "C", x.single.gp / 100),
        fxN_(k, "b", "c", x.cum.bm),    fxN_(k, "f", "c", x.cum.fc),
        fxGap_(rr, "G", "H", x.cum.gap), fxPct_(rr, "I", "G", x.cum.gp / 100)]);
      vals.push(["", x.single.bm, x.single.fc, x.single.gap, x.single.gp / 100,
                     x.cum.bm,    x.cum.fc,    x.cum.gap,    x.cum.gp / 100]);
    });
    var rT = R0 + list.length, kc = "C|" + c.key;
    rows.push(["TOTAL",
      fxN_(kc, "b", "s", c.single.bm), fxN_(kc, "f", "s", c.single.fc),
      fxGap_(rT, "C", "D", c.single.gap), fxPct_(rT, "E", "C", c.single.gp / 100),
      fxN_(kc, "b", "c", c.cum.bm),    fxN_(kc, "f", "c", c.cum.fc),
      fxGap_(rT, "G", "H", c.cum.gap), fxPct_(rT, "I", "G", c.cum.gp / 100)]);
    vals.push(["", c.single.bm, c.single.fc, c.single.gap, c.single.gp / 100,
                   c.cum.bm,    c.cum.fc,    c.cum.gap,    c.cum.gp / 100]);

    numTable_(ctx, rows, { gapCols:[4,8], pctCols:[5,9], totalRow:true, vals:vals });
    gapRows_(ctx, 1);
  });
}


/* ══════════════════════════════════════════════════════════════════
   VIEW 4 — BY DISTRIBUTOR
   ══════════════════════════════════════════════════════════════════ */

function viewDistributor_(ctx) {
  var m = ctx.m;
  kpiStrip_(ctx, "TỔNG  ·  " + m.periodLabel, m.single, m.unit, "GRAND", "s");

  var top = m.dists.slice().sort(function(a,b){ return b.single.fc - a.single.fc; })
                   .slice(0, 12);
  var dd = [["Distributor","Budget Mani","Fct/Actual","GAP"]];
  top.forEach(function(d){
    var k = "D|" + d.key;
    dd.push([d.name + " · " + d.seg, fxN_(k, "b", "s", d.single.bm),
                     fxN_(k, "f", "s", d.single.fc),
                     fxGapAgg_(k, "s", d.single.gap)]);
  });
  var rg = pushData_(ctx, dd);

  bandTitle_(ctx, "DISTRIBUTOR  ·  Budget vs Fct/Actual vs GAP  (Top 12)", 2, 10);
  chartSlot_(ctx, 16, [{ range:rg, type:"combo", w:1000, h:320, col:2, title:"",
    colors:[RPT.C.chBud, RPT.C.chAct, RPT.C.blue] }]);

  bandTitle_(ctx, "DISTRIBUTOR DETAIL  ·  " + m.periodLabel, 2, 10);
  header_(ctx, ["Distributor","Segment","Budget","Fct/Actual","GAP","%GAP",
                "Budget FY","Fct/Actual FY","GAP FY"]);

  var R0 = ctx.row, rows = [], vals = [];
  m.dists.forEach(function(d, i){
    var k = "D|" + d.key, rr = R0 + i;
    rows.push([d.name + "  (" + RPT.CTYL[d.cty] + ")", d.seg,
      fxN_(k, "b", "s", d.single.bm), fxN_(k, "f", "s", d.single.fc),
      fxGap_(rr, "D", "E", d.single.gap), fxPct_(rr, "F", "D", d.single.gp / 100),
      fxN_(k, "b", "y", d.fy.bm),     fxN_(k, "f", "y", d.fy.fc),
      fxGap_(rr, "H", "I", d.fy.gap)]);
    vals.push(["", "", d.single.bm, d.single.fc, d.single.gap, d.single.gp / 100,
                       d.fy.bm, d.fy.fc, d.fy.gap]);
  });
  numTable_(ctx, rows, { gapCols:[5,9], pctCols:[6], textCols:[2], startNum:3, vals:vals });
}


/* ══════════════════════════════════════════════════════════════════
   VIEW 5 — GAP ANALYSIS
   ══════════════════════════════════════════════════════════════════ */

function viewGap_(ctx) {
  var m   = ctx.m;
  var pos = m.dists.filter(function(d){ return d.single.gap > 0; })
                   .sort(function(a,b){ return b.single.gap - a.single.gap; });
  var neg = m.dists.filter(function(d){ return d.single.gap < 0; })
                   .sort(function(a,b){ return a.single.gap - b.single.gap; });

  var sumP = pos.reduce(function(s,d){ return s + d.single.gap; }, 0);
  var sumN = neg.reduce(function(s,d){ return s + d.single.gap; }, 0);

  kpiStrip_(ctx, "GAP  ·  " + m.periodLabel, m.single, m.unit, "GRAND", "s");

  bandTitle_(ctx, "ABOVE BUDGET  " + gfmt_(sumP) + "   |   BELOW BUDGET  " + gfmt_(sumN), 2, 10);

  var sh = ctx.sh, r = ctx.row;
  mset_(sh, r, 2, 1, 4, "🟢  ABOVE BUDGET",
        subHdrStyle_({ align:"left", bg:"#EAF4EE", color:RPT.C.pos }));
  mset_(sh, r, 7, 1, 4, "🔴  BELOW BUDGET",
        subHdrStyle_({ align:"left", bg:"#FAEDF0", color:RPT.C.neg }));
  ctx.row = r + 1;

  var n = Math.max(pos.length, neg.length, 1);
  var block = [], bvals = [];
  for (var i = 0; i < n; i++) {
    var p = pos[i], q = neg[i];
    block.push([
      p ? p.name : "", p ? p.seg : "",
      p ? fxN_("D|" + p.key, "f", "s", p.single.fc) : "",
      p ? fxGapAgg_("D|" + p.key, "s", p.single.gap) : "",
      "",
      q ? q.name : "", q ? q.seg : "",
      q ? fxN_("D|" + q.key, "f", "s", q.single.fc) : "",
      q ? fxGapAgg_("D|" + q.key, "s", q.single.gap) : ""
    ]);
    bvals.push([p ? p.single.gap : 0, q ? q.single.gap : 0]);
  }
  var rgB = sh.getRange(ctx.row, 2, block.length, 9);
  rgB.setValues(block);
  rgB.setFontSize(10).setFontFamily("Aptos").setVerticalAlignment("middle");
  sh.getRange(ctx.row, 4, block.length, 2).setNumberFormat("#,##0;(#,##0)");
  sh.getRange(ctx.row, 9, block.length, 2).setNumberFormat("#,##0;(#,##0)");
  sh.getRange(ctx.row, 5, block.length, 1).setFontColor(RPT.C.pos).setFontWeight("bold");
  sh.getRange(ctx.row, 10, block.length, 1).setFontColor(RPT.C.neg).setFontWeight("bold");
  zebra_(sh, ctx.row, block.length, 2, 4);
  zebra_(sh, ctx.row, block.length, 7, 4);
  ctx.row += block.length;
  gapRows_(ctx, 1);

  var wd = [["Distributor","GAP"]];
  m.dists.slice().sort(function(a,b){ return a.single.gap - b.single.gap; })
    .slice(0, 14).forEach(function(d){
      wd.push([d.name + " · " + d.seg, fxGapAgg_("D|" + d.key, "s", d.single.gap)]);
    });
  var rgW = pushData_(ctx, wd);

  bandTitle_(ctx, "GAP RANKING  ·  toàn bộ distributor", 2, 10);
  chartSlot_(ctx, 18, [{ range:rgW, type:"bar", w:1000, h:360, col:2, title:"",
    colors:[RPT.C.neg] }]);

  bandTitle_(ctx, "GAP CONTRIBUTION", 2, 10);
  header_(ctx, ["Distributor","Segment","Budget","Fct/Actual","GAP","%GAP",
                "Contribution","GAP CUM","GAP FY"]);

  // Cột sheet: B tên | C seg | D bm | E fc | F gap | G %gap | H contrib | I cum | J fy
  var tot  = Math.abs(m.single.gap) || 1;
  var list = m.dists.slice()
    .sort(function(a,b){ return Math.abs(b.single.gap) - Math.abs(a.single.gap); });
  var R0 = ctx.row, RN = R0 + list.length - 1;
  var rows = [], vals = [];
  list.forEach(function(d, i){
    var k = "D|" + d.key, rr = R0 + i;
    rows.push([d.name, d.seg,
      fxN_(k, "b", "s", d.single.bm), fxN_(k, "f", "s", d.single.fc),
      fxGap_(rr, "D", "E", d.single.gap), fxPct_(rr, "F", "D", d.single.gp / 100),
      (FXX ? "=IFERROR(F" + rr + "/SUMPRODUCT(ABS($F$" + R0 + ":$F$" + RN + ")),0)"
           : d.single.gap / tot),
      fxGapAgg_(k, "c", d.cum.gap),
      fxGapAgg_(k, "y", d.fy.gap)]);
    vals.push(["", "", d.single.bm, d.single.fc, d.single.gap, d.single.gp / 100,
                       d.single.gap / tot, d.cum.gap, d.fy.gap]);
  });
  numTable_(ctx, rows, { gapCols:[5,8,9], pctCols:[6,7], textCols:[2], startNum:3, vals:vals });
}


/* ══════════════════════════════════════════════════════════════════
   VIEW 6 — EXPLANATIONS
   ══════════════════════════════════════════════════════════════════ */

function viewExplanations_(ctx) {
  var m  = ctx.m;
  var vs = m.versions || [];

  if (!vs.length) {
    bandTitle_(ctx, "EXPLANATIONS", 2, 10);
    mset_(ctx.sh, ctx.row, 2, 1, 9,
      "Chưa có dữ liệu ở tab '" + CONFIG.EXPL_SHEET_NAME + "'.",
      { size:11, color:RPT.C.gray });
    ctx.row += 2;
    return;
  }

  bandTitle_(ctx, "VERSION HISTORY  ·  " + vs.length + " version", 2, 10);
  header_(ctx, ["Version","Forecast time","Type","Single/Cum","Budget",
                "Fct/Actual","GAP","%GAP","Countries"]);

  var rows = vs.slice().reverse().map(function(v){
    var g = (v.countries || []).filter(function(c){ return c.code === "g"; })[0];
    var t = g && g.total ? g.total : { b:0, f:0, vsb:0 };
    var b = (t.b || 0) / 1000, f = (t.f || 0) / 1000;
    return [v.v, v.ft || "—", v.tFct || "—", v.sc, b, f, f - b,
            b > 0 ? (f - b) / b : 0, (v.countries || []).length];
  });
  numTable_(ctx, rows, { gapCols:[7], pctCols:[8], textCols:[2,3,4], startNum:5 });
  gapRows_(ctx, 1);

  var latest = pickVersion_(vs, {});
  bandTitle_(ctx, "CHI TIẾT  ·  " + (latest ? latest.l : ""), 2, 10);
  header_(ctx, ["Country / Segment / Distributor","","Budget","Fct/Actual",
                "GAP","%GAP","Latest Fct","vs Latest","Explanation"]);

  var out = [];
  (latest && latest.countries || []).forEach(function(co){
    if (co.total) out.push(["▸ " + co.name, "", co.total.b / 1000, co.total.f / 1000,
      co.total.vsb / 1000, pctToNum_(co.total.pct), co.total.lf / 1000,
      co.total.vlf / 1000, co.total.e || ""]);
    (co.segments || []).forEach(function(sg){
      if (sg.total) out.push(["    " + sg.name, "", sg.total.b / 1000, sg.total.f / 1000,
        sg.total.vsb / 1000, pctToNum_(sg.total.pct), sg.total.lf / 1000,
        sg.total.vlf / 1000, sg.total.e || ""]);
      (sg.distributors || []).forEach(function(d){
        out.push(["        · " + d.name, "", d.b / 1000, d.f / 1000, d.vsb / 1000,
          pctToNum_(d.pct), d.lf / 1000, d.vlf / 1000, d.e || ""]);
      });
    });
  });
  if (!out.length) out = [["(trống)", "", 0, 0, 0, 0, 0, 0, ""]];
  numTable_(ctx, out, { gapCols:[5,8], pctCols:[6], textCols:[2,9], startNum:3, wrapLast:true });
}

function pctToNum_(s){
  if (s == null || s === "") return 0;
  var v = parseFloat(String(s).replace("−", "-").replace("%", "").replace(/[+ ]/g, ""));
  return isNaN(v) ? 0 : v / 100;
}


/* ══════════════════════════════════════════════════════════════════
   BUILDING BLOCKS
   ══════════════════════════════════════════════════════════════════ */

function resetSheet_(sh) {
  sh.getCharts().forEach(function(c){ sh.removeChart(c); });
  var maxR = Math.max(sh.getMaxRows(), 400);
  var maxC = Math.max(sh.getMaxColumns(), 14);
  if (sh.getMaxRows()    < maxR) sh.insertRowsAfter(sh.getMaxRows(), maxR - sh.getMaxRows());
  if (sh.getMaxColumns() < maxC) sh.insertColumnsAfter(sh.getMaxColumns(), maxC - sh.getMaxColumns());

  var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  all.breakApart();
  all.clear();
  all.clearDataValidations();
  all.clearNote();
  all.setBackground(RPT.C.white)
     .setFontFamily("Aptos").setFontSize(10).setFontColor(RPT.C.navy)
     .setVerticalAlignment("middle").setWrap(false);

  sh.setHiddenGridlines(true);
  Object.keys(DASH.COLW).forEach(function(L, i){
    sh.setColumnWidth(i + 1, DASH.COLW[L]);
  });
  for (var c = Object.keys(DASH.COLW).length + 1; c <= sh.getMaxColumns(); c++) sh.setColumnWidth(c, 20);
  sh.setFrozenRows(DASH.R_CTRL + 1);
}

function finishSheet_(sh, ctx) {
  // Cắt bớt hàng thừa để trang nhìn gọn
  var need = ctx.row + 4;
  if (sh.getMaxRows() > need + 20) sh.deleteRows(need, sh.getMaxRows() - need);
  SpreadsheetApp.flush();
}

// Băng tiêu đề block
function bandTitle_(ctx, text, c1, c2) {
  var sh = ctx.sh, r = ctx.row;
  var rg = sh.getRange(r, c1, 1, c2 - c1 + 1);
  rg.merge().setValue("  " + text);
  rg.setBackground(RPT.C.panel).setFontColor(RPT.C.navy)
    .setFontWeight("bold").setFontSize(11).setFontFamily("Aptos")
    .setVerticalAlignment("middle").setHorizontalAlignment("left");
  sh.setRowHeight(r, 26);
  ctx.row = r + 1;
}

// Dải KPI 4 ô
/* Dải KPI 4 ô. key/mask có thì 4 ô là CÔNG THỨC (realtime);
   không có thì ghi số tĩnh lấy từ model. */
function kpiStrip_(ctx, label, agg, unit, key, mask) {
  var sh = ctx.sh, r = ctx.row;
  mset_(sh, r, 2, 1, 9, label + "     ·     Đơn vị: " + unit,
        { size:10, bold:true, color:RPT.C.blue });
  sh.setRowHeight(r, 20);
  r++;

  var vr  = r + 1;                       // dòng chứa số
  var live = !!(FXX && key && FXX.rowOf && FXX.rowOf[key]);

  var boxes = [
    { c:2, w:2, lbl:"BUDGET MANI",
      v: live ? fxN_(key, "b", mask, agg.bm) : agg.bm,
      fmt:"#,##0;(#,##0)", col:RPT.C.navy, bg:"#F4F7FC" },
    { c:4, w:2, lbl:"FORECAST / ACTUAL",
      v: live ? fxN_(key, "f", mask, agg.fc) : agg.fc,
      fmt:"#,##0;(#,##0)", col:RPT.C.navy, bg:"#F4F7FC" },
    { c:6, w:2, lbl:"GAP vs BUDGET",
      v: live ? "=D" + vr + "-B" + vr : agg.gap,
      fmt:"+#,##0;-#,##0;0",
      col:(agg.gap >= 0 ? RPT.C.pos : RPT.C.neg),
      bg:(agg.gap >= 0 ? "#EAF4EE" : "#FAEDF0") },
    { c:8, w:3, lbl:"% vs BUDGET",
      v: live ? "=IFERROR(F" + vr + "/B" + vr + ",0)" : (agg.gp / 100),
      fmt:"+0.0%;-0.0%;0.0%",
      col:(agg.gp >= 0 ? RPT.C.pos : RPT.C.neg),
      bg:(agg.gp >= 0 ? "#EAF4EE" : "#FAEDF0") }
  ];

  boxes.forEach(function(b){
    mset_(sh, r, b.c, 1, b.w, b.lbl,
      { size:8, bold:true, color:RPT.C.gray, bg:b.bg, align:"left", valign:"bottom" });
    var rg = mset_(sh, r + 1, b.c, 1, b.w, b.v,
      { size:17, bold:true, color:b.col, bg:b.bg, align:"left", valign:"top" });
    rg.setNumberFormat(b.fmt);
  });

  sh.setRowHeight(r, 17);
  sh.setRowHeight(r + 1, 32);
  ctx.row = r + 2;
  gapRows_(ctx, 1);
}

// Header của bảng
function header_(ctx, titles) {
  var sh = ctx.sh, r = ctx.row;
  titles.forEach(function(t, i){
    var rg = sh.getRange(r, 2 + i);
    rg.setValue(t)
      .setBackground("#F2F6FC").setFontColor(RPT.C.navy)
      .setFontWeight("bold").setFontSize(9).setFontFamily("Aptos")
      .setHorizontalAlignment(i === 0 ? "left" : "center")
      .setVerticalAlignment("middle").setWrap(true);
  });
  sh.setRowHeight(r, 24);
  ctx.row = r + 1;
}

/* numTable_ — đổ bảng số
   opt = { gapCols:[colIdx1-based trong bảng...], pctCols:[...],
           textCols:[...], startNum:<cột số đầu tiên>, totalRow:bool,
           wrapLast:bool } */
function numTable_(ctx, rows, opt) {
  opt = opt || {};
  if (!rows.length) return;
  var sh = ctx.sh, r = ctx.row, n = rows.length, w = rows[0].length;

  var rg = sh.getRange(r, 2, n, w);
  rg.setValues(rows);
  rg.setFontFamily("Aptos").setFontSize(10).setFontColor(RPT.C.navy)
    .setVerticalAlignment("middle").setHorizontalAlignment("right");
  sh.getRange(r, 2, n, 1).setHorizontalAlignment("left").setFontWeight("bold");

  (opt.textCols || []).forEach(function(c){
    sh.getRange(r, 1 + c, n, 1).setHorizontalAlignment("left").setFontWeight("normal");
  });

  var startNum = opt.startNum || 2;
  sh.getRange(r, 1 + startNum, n, w - startNum + 1).setNumberFormat("#,##0;(#,##0)");

  // opt.vals = ma trận số song song với rows, dùng để tô màu theo dấu
  // (vì rows có thể chứa công thức nên không đọc ngược từ sheet được)
  function pick(c) {
    if (!opt.vals) return null;
    return opt.vals.map(function(x){ var v = x[c - 1]; return (typeof v === "number") ? v : 0; });
  }

  (opt.gapCols || []).forEach(function(c){
    var g = sh.getRange(r, 1 + c, n, 1);
    g.setNumberFormat("+#,##0;-#,##0;0").setFontWeight("bold");
    colorSigned_(sh, r, 1 + c, n, pick(c));
  });
  (opt.pctCols || []).forEach(function(c){
    var p = sh.getRange(r, 1 + c, n, 1);
    p.setNumberFormat("+0.0%;-0.0%;0.0%").setFontWeight("bold");
    colorSigned_(sh, r, 1 + c, n, pick(c));
  });

  if (opt.wrapLast) {
    sh.getRange(r, 1 + w, n, 1).setWrap(true).setHorizontalAlignment("left")
      .setFontSize(9).setFontColor(RPT.C.gray2);
  }

  zebra_(sh, r, n, 2, w);

  if (opt.totalRow) {
    sh.getRange(r + n - 1, 2, 1, w)
      .setBackground("#E7EDF7").setFontWeight("bold").setFontSize(10.5);
  }
  for (var i = 0; i < n; i++) sh.setRowHeight(r + i, opt.wrapLast ? 34 : 21);
  ctx.row = r + n;
}

function colorSigned_(sh, row, col, n, arr) {
  var vals;
  if (arr && arr.length === n) vals = arr.map(function(x){ return [x]; });
  else                        vals = sh.getRange(row, col, n, 1).getValues();
  var cols = vals.map(function(v){
    var x = +v[0];
    return [ isNaN(x) ? RPT.C.navy : (x >= 0 ? RPT.C.pos : RPT.C.neg) ];
  });
  sh.getRange(row, col, n, 1).setFontColors(cols);
}

function zebra_(sh, row, n, c1, w) {
  for (var i = 1; i < n; i += 2) {
    sh.getRange(row + i, c1, 1, w).setBackground("#F7F9FC");
  }
}

function gapRows_(ctx, k) {
  for (var i = 0; i < k; i++) ctx.sh.setRowHeight(ctx.row + i, 10);
  ctx.row += k;
}

// Ghi + merge + format 1 ô
function mset_(sh, row, col, rows, cols, val, st) {
  st = st || {};
  var rg = sh.getRange(row, col, rows, cols);
  if (rows > 1 || cols > 1) rg.merge();
  rg.setValue(val);
  rg.setFontFamily("Aptos")
    .setFontSize(st.size || 10)
    .setFontWeight(st.bold ? "bold" : "normal")
    .setFontColor(st.color || RPT.C.navy)
    .setHorizontalAlignment(st.align || "left")
    .setVerticalAlignment(st.valign || "middle");
  if (st.bg) rg.setBackground(st.bg);
  return rg;
}

function subHdrStyle_(o) {
  o = o || {};
  return {
    size  : o.size  || 10,
    bold  : true,
    color : o.color || RPT.C.navy,
    bg    : o.bg    || "#E7EDF7",
    align : o.align || "left",
    valign: "middle"
  };
}


/* ══════════════════════════════════════════════════════════════════
   CHARTS
   ══════════════════════════════════════════════════════════════════ */

function prepareDataSheet_(ss) {
  var d = ss.getSheetByName(DASH.DATA);
  if (!d) d = ss.insertSheet(DASH.DATA);
  d.clear();
  d.hideSheet();
  return d;
}

// Ghi 1 khối dữ liệu vào sheet ẩn, trả về Range để chart tham chiếu
function pushData_(ctx, matrix) {
  var d    = ctx.ss.getSheetByName(DASH.DATA);
  var rows = matrix.length, cols = matrix[0].length;
  var rg   = d.getRange(ctx.dataRow, 1, rows, cols);
  rg.setValues(matrix);
  ctx.dataRow += rows + 2;
  return rg;
}

/* chartSlot_ — chừa chỗ rồi chèn 1..n chart vào cùng dải hàng
   specs[i] = { range, type:"col"|"bar"|"combo", w, h, col, title, colors } */
function chartSlot_(ctx, heightRows, specs) {
  var sh = ctx.sh, anchor = ctx.row;
  for (var i = 0; i < heightRows; i++) sh.setRowHeight(anchor + i, 21);

  specs.forEach(function(s){
    var b = sh.newChart().addRange(s.range)
      .setPosition(anchor, s.col, 6, 4)
      .setNumHeaders(1)
      .setOption("width",  s.w)
      .setOption("height", s.h)
      .setOption("title",  s.title || "")
      .setOption("titleTextStyle", { color:RPT.C.navy, fontSize:12, bold:true, fontName:"Aptos" })
      .setOption("fontName", "Aptos")
      .setOption("backgroundColor", "#FFFFFF")
      .setOption("chartArea", { left:"14%", top:"14%", width:"82%", height:"70%" })
      .setOption("legend", { position:"bottom", textStyle:{ fontSize:10, color:RPT.C.gray } })
      .setOption("colors", s.colors || [RPT.C.blue])
      .setOption("hAxis", { textStyle:{ fontSize:10, color:RPT.C.gray2 },
                            gridlines:{ color:"#F0F0F0" } })
      .setOption("vAxis", { textStyle:{ fontSize:10, color:RPT.C.gray },
                            gridlines:{ color:RPT.C.grid },
                            baselineColor:"#CCCCCC" });

    if (s.type === "bar") {
      b = b.asBarChart().setOption("bar", { groupWidth:"62%" });
    } else if (s.type === "combo") {
      b = b.setChartType(Charts.ChartType.COMBO)
           .setOption("seriesType", "bars")
           .setOption("series", { 2:{ type:"line", color:RPT.C.blue,
                                      lineWidth:2, pointSize:5 } })
           .setOption("bar", { groupWidth:"70%" });
    } else {
      b = b.asColumnChart().setOption("bar", { groupWidth:"55%" })
           .setOption("legend", { position:"none" });
    }
    sh.insertChart(b.build());
  });

  ctx.row = anchor + heightRows;
  gapRows_(ctx, 1);
}


/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PHẦN 3 — PPT EXPORT : dựng 9 slide theo MMH_REPORT_template     ║
   ║  Mặc định engine "pptx" — xuất thẳng .pptx, KHÔNG cần API nào.   ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const PPT = {
  // ── ENGINE ────────────────────────────────────────────────────────
  //  "pptx"   (MẶC ĐỊNH) → xuất thẳng file .pptx bằng OOXML + zip.
  //                        KHÔNG cần bật Google Slides API. Nhanh nhất.
  //  "slides"            → dựng file Google Slides rồi export .pptx.
  //                        Cần bật Google Slides API ở Services (+).
  //                        Chỉ dùng khi muốn giữ master của template MANI.
  ENGINE : "pptx",

  // Chỉ dùng khi ENGINE = "slides": ID bản Google Slides convert từ
  // MMH_REPORT_template.pptx. Để "" thì tự vẽ header.
  TEMPLATE_ID : "",

  // Thư mục Drive chứa file xuất ra ("" = My Drive gốc)
  OUT_FOLDER_ID : "",

  // Dải header trên mỗi slide. BRAND_TEXT = "" để bỏ hẳn chữ.
  DRAW_HEADER : true,
  BRAND_TEXT  : "MANI",

  LAYOUT_NAME : "\u30bf\u30a4\u30c8\u30eb\u3068\u30b3\u30f3\u30c6\u30f3\u30c4",  // layout của template
  FONT        : "Aptos",

  H1 : "I. Sales budget, actual performance and future forecast"
};


/* ══════════════════════════════════════════════════════════════════
   ENTRY POINT
   ══════════════════════════════════════════════════════════════════ */
function exportReportPpt() {
  var ss   = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var dsh  = ss.getSheetByName(DASH.SHEET);
  var ctrl;
  if (dsh) ctrl = readControls_(dsh);
  else {
    setFyContext_("");
    ctrl = { view:"Overview", mode:"Turnover", period:"Month", qtr:"Q4",
             month:RPT.MFULL[10], fy:CONFIG.FY_FILTER };
  }

  var m  = buildModel_(ctrlToOpt_(ctrl));                 // Turnover
  var mj = buildModel_(ctrlToOpt_({ mode:"Jizai", period:ctrl.period,
                                    qtr:ctrl.qtr, month:ctrl.month, fy:ctrl.fy }));

  var name = "MMH_REPORT_" + CONFIG.FY_FILTER + "_" +
             m.periodShort.replace(/[\/ ]/g, "") + "_" +
             Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");

  var D = Deck_(PPT.ENGINE === "slides" ? slidesPrim_(name) : pptxPrims_());

  slide1_Content_(D);
  slide2_Result_(D, m);
  slide3_BySegment_(D, m);
  slide4_Jizai_(D, mj);
  slide5_Forecast_(D, m);
  slide6_FyOverview_(D, m);
  slide7_FyBySegment_(D, m);
  slide8_VersionCompare_(D, m);
  slide9_Closing_(D);

  var file = D.finish(name);

  try {
    SpreadsheetApp.getUi().alert(
      "Đã tạo xong PowerPoint",
      "Engine: " + D.kind + "\nFile: " + file.getName() + "\n\nLink:\n" + file.getUrl(),
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return file.getUrl();
}


/* ══════════════════════════════════════════════════════════════════
   DECK — lớp vẽ dùng chung cho cả 2 engine.
   Mọi toạ độ tính bằng INCH theo khổ gốc 13.333" × 7.5";
   engine tự lo việc quy đổi.
   ══════════════════════════════════════════════════════════════════ */
function Deck_(prim) {

  var api = {

    kind : prim.kind,

    newSlide : function(){
      var p = prim.newSlide();
      if (PPT.DRAW_HEADER && prim.drawHeader !== false) api.brandHeader(p);
      return p;
    },

    // Dải vàng góc trên phải + chữ thương hiệu
    brandHeader : function(page){
      api.rect(page, 8.55, -1.05, 5.20, 1.75,
               { fill:RPT.C.yellow, round:true });
      if (PPT.BRAND_TEXT) {
        api.txt(page, 11.20, 0.06, 2.00, 0.50,
                [{ t:PPT.BRAND_TEXT, size:30, bold:true, italic:true, color:"#111111" }],
                { align:"r" });
      }
    },

    rect : function(page, x, y, w, h, o){ prim.rect(page, x, y, w, h, o || {}); },

    txt : function(page, x, y, w, h, runs, o){ prim.txt(page, x, y, w, h, runs, o || {}); },

    /* ── Tiêu đề chuẩn của mọi slide nội dung ── */
    slideHead : function(page, subTitle){
      api.txt(page, 0.50, 0.22, 9.40, 0.46,
              [{ t:PPT.H1, size:18, bold:true, color:RPT.C.navy }], { valign:"m" });
      api.rect(page, 0.55, 0.755, 0.135, 0.135, { fill:RPT.C.blue });
      api.txt(page, 0.72, 0.64, 11.40, 0.36,
              [{ t:subTitle, size:15, bold:true, color:RPT.C.blue }], { valign:"m" });
    },

    /* ── Card có băng tiêu đề (dùng khắp slide 2/5/6/8) ── */
    panel : function(page, x, y, w, h, title){
      api.rect(page, x, y, w, h, { fill:RPT.C.white, line:RPT.C.border, round:true });
      api.rect(page, x, y, w, 0.34, { fill:RPT.C.panel, round:true, noLine:true });
      api.txt(page, x, y + 0.04, w, 0.26,
              [{ t:title, size:11.5, bold:true, color:RPT.C.navy }], { align:"c", valign:"m" });
    },

    /* ── Băng ngang đơn giản ── */
    band : function(page, x, y, w, h, runs, o){
      o = o || {};
      api.rect(page, x, y, w, h,
        { fill:o.fill || RPT.C.panel, line:o.line || null, round:true });
      api.txt(page, x + 0.10, y + 0.02, w - 0.20, h - 0.04, runs,
        { align:o.align || "l", valign:"m" });
    },

    /* ── Cặp thanh Budget / Actual + %  + "aK → bK (±cK)" ── */
    barPair : function(page, x, y, maxW, bm, fc, o){
      o = o || {};
      var bh   = o.bh || 0.09;
      var gap  = fc - bm;
      var top  = Math.max(Math.abs(bm), Math.abs(fc), 1);
      var wB   = Math.max(0.01, maxW * (Math.abs(bm) / top));
      var wF   = Math.max(0.01, maxW * (Math.abs(fc) / top));
      var col  = gap >= 0 ? RPT.C.pos : RPT.C.neg;

      api.rect(page, x, y, wB, bh, { fill:RPT.C.barBg, round:true });
      api.rect(page, x, y + bh + 0.05, wF, bh, { fill:col, round:true });

      var pct = bm > 0 ? (gap / bm * 100) : 0;
      api.txt(page, x + maxW + 0.05, y - 0.03, o.pctW || 0.80, 0.22,
              [{ t:(pct >= 0 ? "+" : "") + pct.toFixed(1) + "%",
                 size:o.pctSize || 10, bold:true, color:col }],
              { align:o.pctAlign || "l", valign:"m" });

      api.txt(page, x, y + 2 * bh + 0.12, o.valW || 2.20, 0.16,
              [{ t: nfmt_(bm) + "K → " + nfmt_(fc) + "K   (" + gfmt_(gap) + "K)",
                 size:o.valSize || 9, bold:true, color:RPT.C.gray2 }], { valign:"m" });
    },

    /* ── Chart cột đứng (1 series, tô màu theo dấu) ── */
    colChart : function(page, x, y, w, h, items, o){
      o = o || {};
      var n = items.length;
      if (!n) return;
      var vals = items.map(function(i){ return i.v; });
      var maxV = Math.max.apply(null, vals.concat([0]));
      var minV = Math.min.apply(null, vals.concat([0]));
      var topPad = 0.22, catH = 0.20;
      var botPad = (minV < 0) ? 0.22 : 0;          // chỗ cho nhãn cột âm
      var pT = y + topPad, pB = y + h - catH - botPad, pH = pB - pT;
      var rng  = (maxV - minV) || 1;
      var zeroY = pT + (maxV / rng) * pH;
      var slot  = w / n, bw = slot * 0.44;

      api.rect(page, x, zeroY, w, 0.008, { fill:"#CCCCCC" });

      items.forEach(function(it, i){
        var cx  = x + slot * i + (slot - bw) / 2;
        var len = Math.abs(it.v) / rng * pH;
        var by  = it.v >= 0 ? zeroY - len : zeroY;
        api.rect(page, cx, by, bw, Math.max(len, 0.012),
                 { fill: it.c || (it.v >= 0 ? RPT.C.chBud : RPT.C.neg) });
        var ly = it.v >= 0 ? by - 0.20 : by + Math.max(len, 0.012) + 0.01;
        api.txt(page, x + slot * i, ly, slot, 0.20,
                [{ t:(o.signed ? gfmt_(it.v) : nfmt_(it.v)),
                   size:11, bold:true, color:RPT.C.navy }], { align:"c", valign:"m" });
        api.txt(page, x + slot * i, y + h - catH, slot, catH,
                [{ t:it.lbl, size:9, color:RPT.C.gray2 }], { align:"c", valign:"m" });
      });
    },

    /* ── Chart thanh ngang (GAP theo nhóm) ── */
    barChart : function(page, x, y, w, h, items, o){
      o = o || {};
      var n = items.length; if (!n) return;
      var catW = o.catW || 1.15;
      var vals = items.map(function(i){ return i.v; });
      var pos  = Math.max.apply(null, vals.concat([0]));
      var neg  = Math.abs(Math.min.apply(null, vals.concat([0])));
      var padL = neg > 0 ? 0.74 : 0.04;            // chỗ cho nhãn giá trị âm
      var padR = pos > 0 ? 0.74 : 0.04;
      var pX   = x + catW + padL, pW = w - catW - padL - padR;
      var tot  = (pos + neg) || 1;
      var zeroX = pX + (neg / tot) * pW;
      var rowH = h / n, bh = Math.min(rowH * 0.52, 0.24);

      items.forEach(function(it, i){
        var cy  = y + rowH * i + (rowH - bh) / 2;
        var len = Math.abs(it.v) / tot * pW;
        var bx  = it.v >= 0 ? zeroX : zeroX - len;
        api.txt(page, x, cy - 0.05, catW - 0.08, bh + 0.10,
                [{ t:it.lbl, size:9.5, color:RPT.C.navy }], { align:"r", valign:"m" });
        api.rect(page, bx, cy, Math.max(len, 0.012), bh,
                 { fill: it.v >= 0 ? RPT.C.pos : RPT.C.neg });
        var lx = it.v >= 0 ? bx + Math.max(len, 0.012) + 0.03 : bx - 0.71;
        api.txt(page, lx, cy - 0.05, 0.68, bh + 0.10,
                [{ t:gfmt_(it.v), size:10, bold:true, color:RPT.C.navy }],
                { align: it.v >= 0 ? "l" : "r", valign:"m" });
      });
    },

    /* ── Chart cột nhóm 2 series + nhãn GAP (tháng / quý / distributor) ── */
    groupChart : function(page, x, y, w, h, cats, o){
      o = o || {};
      var n = cats.length; if (!n) return;
      var topPad = 0.24, catH = 0.20, legH = o.legend === false ? 0 : 0.20;
      var pT = y + topPad, pB = y + h - catH - legH, pH = pB - pT;

      var all = [];
      cats.forEach(function(c){ all.push(c.bm, c.fc, c.gap); });
      var maxV = Math.max.apply(null, all.concat([0]));
      var minV = Math.min.apply(null, all.concat([0]));
      var rng  = (maxV - minV) || 1;
      var zeroY = pT + (maxV / rng) * pH;
      var slot = w / n, bw = slot * 0.30;

      api.rect(page, x, zeroY, w, 0.008, { fill:"#CCCCCC" });

      cats.forEach(function(c, i){
        var base = x + slot * i + slot * 0.5 - bw;
        [[c.bm, RPT.C.chBud, base], [c.fc, RPT.C.chAct, base + bw]].forEach(function(s){
          var len = Math.abs(s[0]) / rng * pH;
          var by  = s[0] >= 0 ? zeroY - len : zeroY;
          api.rect(page, s[2], by, bw, Math.max(len, 0.01), { fill:s[1] });
        });
        var topBar = zeroY - (Math.max(c.bm, c.fc, 0) / rng * pH);
        var gy = Math.max(y, topBar - 0.19);
        api.txt(page, x + slot * i, gy, slot, 0.18,
                [{ t:gfmt_(c.gap), size:8, bold:true,
                   color: c.gap >= 0 ? RPT.C.pos : RPT.C.neg }], { align:"c", valign:"m" });
        api.txt(page, x + slot * i, pB, slot, catH,
                [{ t:c.lbl, size:8.5, color:RPT.C.gray2 }], { align:"c", valign:"m" });
      });

      if (o.legend !== false) {
        var ly = y + h - legH;
        api.rect(page, x + w/2 - 1.55, ly + 0.06, 0.16, 0.07, { fill:RPT.C.chBud, round:true });
        api.txt(page, x + w/2 - 1.34, ly, 1.00, 0.18,
                [{ t:"Budget Mani", size:8.5, color:RPT.C.gray }], { valign:"m" });
        api.rect(page, x + w/2 - 0.20, ly + 0.06, 0.16, 0.07, { fill:RPT.C.chAct, round:true });
        api.txt(page, x + w/2 + 0.01, ly, 1.20, 0.18,
                [{ t:"Forecast / Actual", size:8.5, color:RPT.C.gray }], { valign:"m" });
      }
    },

    /* ── Khung trống cho người dùng tự điền ── */
    inputFrame : function(page, x, y, w, h, hint){
      api.rect(page, x, y, w, h, { fill:RPT.C.white, line:RPT.C.soft, round:true });
      api.txt(page, x + 0.12, y + 0.08, w - 0.24, h - 0.16,
              [{ t:hint, size:9.5, italic:true, color:"#AAB4C0" }], { valign:"t" });
    },

    finish : function(name){ return prim.finish(name); }
  };

  return api;
}


/* ══════════════════════════════════════════════════════════════════
   ENGINE "slides" — dựng Google Slides rồi export .pptx
   Chỉ dùng khi PPT.ENGINE = "slides" VÀ đã bật Google Slides API.
   ══════════════════════════════════════════════════════════════════ */
function slidesPrim_(name) {
  if (typeof Slides === "undefined") {
    throw new Error('PPT.ENGINE = "slides" cần bật Google Slides API ' +
                    '(Services + → Google Slides API). Hoặc đổi PPT.ENGINE = "pptx".');
  }

  var pres = PPT.TEMPLATE_ID
    ? SlidesApp.openById(DriveApp.getFileById(PPT.TEMPLATE_ID).makeCopy(name).getId())
    : SlidesApp.create(name);
  pres.getSlides().forEach(function(s){ s.remove(); });
  var presId = pres.getId();
  var K      = pres.getPageWidth() / 960;      // 960pt = 13.333"
  var layoutId = PPT.TEMPLATE_ID ? _layoutId_(pres, PPT.LAYOUT_NAME) : null;
  pres.saveAndClose();

  var reqs = [], uid = 0;

  function nid(p){ return p + (++uid) + "_" + Date.now().toString(36); }
  function PT(inch){ return inch * 72 * K; }
  function rgb(hex){
    hex = String(hex).replace("#", "");
    return { red   : parseInt(hex.substr(0,2),16)/255,
             green : parseInt(hex.substr(2,2),16)/255,
             blue  : parseInt(hex.substr(4,2),16)/255 };
  }
  function elProps(page, x, y, w, h){
    return {
      pageObjectId : page,
      size      : { width:{magnitude:PT(w), unit:"PT"}, height:{magnitude:PT(h), unit:"PT"} },
      transform : { scaleX:1, scaleY:1, translateX:PT(x), translateY:PT(y), unit:"PT" }
    };
  }

  return {
    kind : "slides",
    // Có template → master đã có header MANI, không vẽ đè
    drawHeader : !PPT.TEMPLATE_ID,

    newSlide : function(){
      var id = nid("sl");
      var r  = { createSlide: { objectId:id } };
      r.createSlide.slideLayoutReference = layoutId
        ? { layoutId: layoutId } : { predefinedLayout: "BLANK" };
      reqs.push(r);
      reqs.push({ updatePageProperties: {
        objectId : id,
        pageProperties : { pageBackgroundFill:
          { solidFill: { color:{ rgbColor: rgb(RPT.C.white) } } } },
        fields : "pageBackgroundFill.solidFill.color"
      }});
      return id;
    },

    rect : function(page, x, y, w, h, o){
      var id = nid("rc");
      reqs.push({ createShape: {
        objectId : id,
        shapeType: o.round ? "ROUND_RECTANGLE" : "RECTANGLE",
        elementProperties : elProps(page, x, y, w, h)
      }});
      var sp = {};
      sp.shapeBackgroundFill = o.fill
        ? { solidFill: { color:{ rgbColor: rgb(o.fill) } } }
        : { propertyState: "NOT_RENDERED" };
      sp.outline = o.line
        ? { outlineFill : { solidFill: { color:{ rgbColor: rgb(o.line) } } },
            weight      : { magnitude: (o.lineW || 0.75) * K, unit:"PT" },
            dashStyle   : "SOLID" }
        : { propertyState: "NOT_RENDERED" };
      reqs.push({ updateShapeProperties: {
        objectId:id, shapeProperties:sp,
        fields:"shapeBackgroundFill,outline" } });
    },

    txt : function(page, x, y, w, h, runs, o){
      var id = nid("tx");
      reqs.push({ createShape: {
        objectId : id, shapeType : "TEXT_BOX",
        elementProperties : elProps(page, x, y, w, h)
      }});
      reqs.push({ updateShapeProperties: { objectId:id, shapeProperties:{
        shapeBackgroundFill : o.bg
          ? { solidFill: { color:{ rgbColor: rgb(o.bg) } } }
          : { propertyState:"NOT_RENDERED" },
        outline : { propertyState:"NOT_RENDERED" },
        contentAlignment : (o.valign === "m" ? "MIDDLE"
                          : o.valign === "b" ? "BOTTOM" : "TOP")
      }, fields:"shapeBackgroundFill,outline,contentAlignment" } });

      var full = runs.map(function(r){ return r.t; }).join("");
      if (!full) full = " ";
      reqs.push({ insertText: { objectId:id, text:full, insertionIndex:0 } });

      var pos = 0;
      runs.forEach(function(r){
        var len = String(r.t || "").length;
        if (len > 0) {
          reqs.push({ updateTextStyle: {
            objectId  : id,
            textRange : { type:"FIXED_RANGE", startIndex:pos, endIndex:pos + len },
            style : {
              fontFamily : PPT.FONT,
              fontSize   : { magnitude: (r.size || 10) * K, unit:"PT" },
              bold       : !!r.bold,
              italic     : !!r.italic,
              foregroundColor : { opaqueColor: { rgbColor: rgb(r.color || RPT.C.navy) } }
            },
            fields : "fontFamily,fontSize,bold,italic,foregroundColor"
          }});
        }
        pos += len;
      });

      reqs.push({ updateParagraphStyle: {
        objectId  : id,
        textRange : { type:"ALL" },
        style : {
          alignment   : (o.align === "c" ? "CENTER" : o.align === "r" ? "END" : "START"),
          lineSpacing : o.ls || 100,
          spaceAbove  : { magnitude:0, unit:"PT" },
          spaceBelow  : { magnitude:0, unit:"PT" }
        },
        fields : "alignment,lineSpacing,spaceAbove,spaceBelow"
      }});
    },

    finish : function(fname){
      var CH = 400;
      for (var i = 0; i < reqs.length; i += CH) {
        Slides.Presentations.batchUpdate({ requests: reqs.slice(i, i + CH) }, presId);
      }
      var url  = "https://docs.google.com/presentation/d/" + presId + "/export/pptx";
      var blob = UrlFetchApp.fetch(url, {
        headers : { Authorization: "Bearer " + ScriptApp.getOAuthToken() }
      }).getBlob().setName(fname + ".pptx");
      var folder = PPT.OUT_FOLDER_ID ? DriveApp.getFolderById(PPT.OUT_FOLDER_ID)
                                     : DriveApp.getRootFolder();
      return folder.createFile(blob);
    }
  };
}

function _layoutId_(pres, name) {
  var found = null;
  pres.getLayouts().forEach(function(l){
    try { if (!found && l.getLayoutName() === name) found = l.getObjectId(); } catch (e) {}
  });
  if (!found) { try { found = pres.getLayouts()[1].getObjectId(); } catch (e) {} }
  return found;
}


/* ══════════════════════════════════════════════════════════════════
   PPTX ENGINE — xuất thẳng file .pptx bằng OOXML + Utilities.zip()
   KHÔNG cần bật Google Slides API, không qua Google Slides.
   ══════════════════════════════════════════════════════════════════ */

const OOXML = {
  NS : 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
       'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
       'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"',
  RELNS : 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"',
  RT    : "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  EMU   : 914400,            // 1 inch
  W     : 12192000,          // 13.333"
  H     : 6858000            // 7.5"
};

function xesc_(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/\u000b/g," ");
}
function hx_(c){ return String(c || "#000000").replace("#","").toUpperCase(); }
function emu_(inch){ return Math.round(inch * OOXML.EMU); }


/* ── Primitive layer cho engine .pptx ───────────────────────────── */
function pptxPrims_() {
  var slides = [];      // slides[i] = mảng chuỗi XML của shape
  var sid    = 1;

  function shapeXml(x, y, w, h, geom, adj, fillXml, lnXml, bodyXml){
    sid++;
    return '<p:sp><p:nvSpPr><p:cNvPr id="' + sid + '" name="s' + sid + '"/>' +
           '<p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>' +
           '<a:xfrm><a:off x="' + emu_(x) + '" y="' + emu_(y) + '"/>' +
           '<a:ext cx="' + Math.max(emu_(w), 1) + '" cy="' + Math.max(emu_(h), 1) + '"/></a:xfrm>' +
           '<a:prstGeom prst="' + geom + '"><a:avLst>' + adj + '</a:avLst></a:prstGeom>' +
           fillXml + lnXml + '</p:spPr>' + bodyXml + '</p:sp>';
  }

  // Gom runs thành các đoạn (tách theo "\n")
  function paras_(runs){
    var out = [[]];
    runs.forEach(function(r){
      String(r.t == null ? "" : r.t).split("\n").forEach(function(part, i){
        if (i > 0) out.push([]);
        if (part.length) out[out.length - 1].push({
          t:part, size:r.size, bold:r.bold, italic:r.italic, color:r.color });
      });
    });
    return out;
  }

  function bodyXml_(runs, o){
    o = o || {};
    var anchor = (o.valign === "m") ? "ctr" : (o.valign === "b") ? "b" : "t";
    var algn   = (o.align  === "c") ? "ctr" : (o.align  === "r") ? "r"  : "l";
    var lnPct  = Math.round((o.ls || 100) * 1000);

    var ps = paras_(runs || []).map(function(rs){
      var body = rs.map(function(r){
        return '<a:r><a:rPr lang="en-US" sz="' + Math.round((r.size || 10) * 100) + '"' +
               (r.bold ? ' b="1"' : '') + (r.italic ? ' i="1"' : '') + ' dirty="0">' +
               '<a:solidFill><a:srgbClr val="' + hx_(r.color || RPT.C.navy) + '"/></a:solidFill>' +
               '<a:latin typeface="' + PPT.FONT + '"/><a:cs typeface="' + PPT.FONT + '"/></a:rPr>' +
               '<a:t>' + xesc_(r.t) + '</a:t></a:r>';
      }).join("");
      return '<a:p><a:pPr algn="' + algn + '"><a:lnSpc><a:spcPct val="' + lnPct + '"/></a:lnSpc>' +
             '<a:spcBef><a:spcPts val="0"/></a:spcBef>' +
             '<a:spcAft><a:spcPts val="0"/></a:spcAft></a:pPr>' + body + '</a:p>';
    }).join("");

    return '<p:txBody><a:bodyPr lIns="45720" tIns="0" rIns="45720" bIns="0" ' +
           'anchor="' + anchor + '" wrap="square"><a:noAutofit/></a:bodyPr>' +
           '<a:lstStyle/>' + ps + '</p:txBody>';
  }

  return {
    kind : "pptx",

    newSlide : function(){ slides.push([]); return slides.length - 1; },

    rect : function(page, x, y, w, h, o){
      o = o || {};
      var geom = "rect", adj = "";
      if (o.round) {
        geom = "roundRect";
        // bán kính ~0.06" → thanh mảnh thành viên thuốc, card bo nhẹ
        var a = Math.min(50000, Math.round(0.06 / Math.max(Math.min(w, h), 0.001) * 100000));
        adj = '<a:gd name="adj" fmla="val ' + a + '"/>';
      }
      var fill = o.fill ? '<a:solidFill><a:srgbClr val="' + hx_(o.fill) + '"/></a:solidFill>'
                        : '<a:noFill/>';
      var ln = o.line
        ? '<a:ln w="' + Math.round((o.lineW || 0.75) * 12700) + '">' +
          '<a:solidFill><a:srgbClr val="' + hx_(o.line) + '"/></a:solidFill></a:ln>'
        : '<a:ln><a:noFill/></a:ln>';
      slides[page].push(shapeXml(x, y, w, h, geom, adj, fill, ln,
        '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>'));
    },

    txt : function(page, x, y, w, h, runs, o){
      o = o || {};
      var fill = o.bg ? '<a:solidFill><a:srgbClr val="' + hx_(o.bg) + '"/></a:solidFill>'
                      : '<a:noFill/>';
      slides[page].push(shapeXml(x, y, w, h, "rect", "", fill,
        '<a:ln><a:noFill/></a:ln>', bodyXml_(runs, o)));
    },

    // Đóng gói .pptx và ghi ra Drive
    finish : function(name){
      var files = pptxPackage_(slides);
      var blobs = Object.keys(files).map(function(path){
        return Utilities.newBlob(files[path], "application/xml", path);
      });
      var zip = Utilities.zip(blobs, name + ".pptx");
      zip.setContentType(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      var folder = PPT.OUT_FOLDER_ID ? DriveApp.getFolderById(PPT.OUT_FOLDER_ID)
                                     : DriveApp.getRootFolder();
      return folder.createFile(zip);
    },

    // Dùng khi test ngoài Apps Script
    _files : function(){ return pptxPackage_(slides); }
  };
}


/* ── Đóng gói toàn bộ part của file .pptx ───────────────────────── */
function pptxPackage_(slides) {
  var n = slides.length;
  var F = {};

  // [Content_Types].xml
  var ov = "";
  for (var i = 1; i <= n; i++) {
    ov += '<Override PartName="/ppt/slides/slide' + i + '.xml" ContentType=' +
          '"application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
  }
  F["[Content_Types].xml"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    ov + '</Types>';

  F["_rels/.rels"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships ' + OOXML.RELNS + '><Relationship Id="rId1" Type="' + OOXML.RT +
    '/officeDocument" Target="ppt/presentation.xml"/></Relationships>';

  // presentation.xml
  var sldIds = "", presRels = '<Relationship Id="rId1" Type="' + OOXML.RT +
                              '/slideMaster" Target="slideMasters/slideMaster1.xml"/>';
  for (var s = 1; s <= n; s++) {
    sldIds  += '<p:sldId id="' + (255 + s) + '" r:id="rId' + (s + 1) + '"/>';
    presRels += '<Relationship Id="rId' + (s + 1) + '" Type="' + OOXML.RT +
                '/slide" Target="slides/slide' + s + '.xml"/>';
  }
  presRels += '<Relationship Id="rId' + (n + 2) + '" Type="' + OOXML.RT +
              '/theme" Target="theme/theme1.xml"/>';

  F["ppt/presentation.xml"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation ' + OOXML.NS + ' saveSubsetFonts="1">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + sldIds + '</p:sldIdLst>' +
    '<p:sldSz cx="' + OOXML.W + '" cy="' + OOXML.H + '"/>' +
    '<p:notesSz cx="6858000" cy="9144000"/></p:presentation>';

  F["ppt/_rels/presentation.xml.rels"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships ' + OOXML.RELNS + '>' + presRels + '</Relationships>';

  // slideMaster
  F["ppt/slideMasters/slideMaster1.xml"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldMaster ' + OOXML.NS + '><p:cSld><p:bg><p:bgPr>' +
    '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/>' +
    '</p:bgPr></p:bg><p:spTree>' + emptyTree_() + '</p:spTree></p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" ' +
    'accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" ' +
    'hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>';

  F["ppt/slideMasters/_rels/slideMaster1.xml.rels"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships ' + OOXML.RELNS + '>' +
    '<Relationship Id="rId1" Type="' + OOXML.RT + '/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="' + OOXML.RT + '/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>';

  // slideLayout (blank)
  F["ppt/slideLayouts/slideLayout1.xml"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldLayout ' + OOXML.NS + ' type="blank" preserve="1"><p:cSld name="Blank">' +
    '<p:spTree>' + emptyTree_() + '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';

  F["ppt/slideLayouts/_rels/slideLayout1.xml.rels"] =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships ' + OOXML.RELNS + '>' +
    '<Relationship Id="rId1" Type="' + OOXML.RT + '/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>';

  F["ppt/theme/theme1.xml"] = themeXml_();

  // slides
  slides.forEach(function(shapes, i){
    F["ppt/slides/slide" + (i + 1) + ".xml"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<p:sld ' + OOXML.NS + '><p:cSld><p:spTree>' + emptyTree_() +
      shapes.join("") + '</p:spTree></p:cSld>' +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';

    F["ppt/slides/_rels/slide" + (i + 1) + ".xml.rels"] =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships ' + OOXML.RELNS + '>' +
      '<Relationship Id="rId1" Type="' + OOXML.RT + '/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
      '</Relationships>';
  });

  return F;
}

function emptyTree_(){
  return '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
         '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
         '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
}

function themeXml_(){
  function sc(n, v){ return '<a:' + n + '><a:srgbClr val="' + v + '"/></a:' + n + '>'; }
  var fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  var line = '<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">' + fill +
             '<a:prstDash val="solid"/></a:ln>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="MMH">' +
    '<a:themeElements><a:clrScheme name="MMH">' +
    '<a:dk1><a:sysClr val="windowText" lastClr="003047"/></a:dk1>' +
    '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
    sc("dk2","003047") + sc("lt2","EBEEF7") +
    sc("accent1","3A5CAA") + sc("accent2","4F8F6C") + sc("accent3","E6DE77") +
    sc("accent4","B26B7A") + sc("accent5","C4D2E4") + sc("accent6","FFE600") +
    sc("hlink","3A5CAA") + sc("folHlink","707070") + '</a:clrScheme>' +
    '<a:fontScheme name="MMH"><a:majorFont><a:latin typeface="' + PPT.FONT +
    '"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="' + PPT.FONT +
    '"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    '<a:fmtScheme name="MMH">' +
    '<a:fillStyleLst>' + fill + fill + fill + '</a:fillStyleLst>' +
    '<a:lnStyleLst>' + line + line + line + '</a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst>' + fill + fill + fill + '</a:bgFillStyleLst>' +
    '</a:fmtScheme></a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 1 — CONTENT
   ══════════════════════════════════════════════════════════════════ */
function slide1_Content_(D) {
  var p = D.newSlide();
  D.txt(p, 0.57, 0.69, 5.00, 0.55,
        [{ t:"CONTENT", size:30, bold:true, color:RPT.C.navy }], { valign:"m" });
  D.txt(p, 0.57, 2.02, 11.53, 2.33, [
    { t:"I.  Sales budget, actual performance and future forecast\n", size:20, color:RPT.C.navy },
    { t:"II. Marketing Activities\n",                                  size:20, color:RPT.C.navy },
    { t:"III. MMH Organization",                                       size:20, color:RPT.C.navy }
  ], { valign:"t", ls:150 });
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 2 / 5 — SALES RESULT & FORECAST (4 panel)
   ══════════════════════════════════════════════════════════════════ */
function slide2_Result_(D, m) {
  buildFourPanel_(D, m, {
    sub      : "MMH Sales Result " + m.periodShort + "  |   Unit: " + m.unit,
    mid      : "Actual",
    singleTag: "SINGLE " + m.periodShort,
    cumTag   : "CUMULATIVE " + m.cumLabel
  });
}

function slide5_Forecast_(D, m) {
  buildFourPanel_(D, m, {
    sub      : "MMH Sales Forecast " + m.periodShort + "  |   Unit: " + m.unit,
    mid      : "Forecast",
    singleTag: "SINGLE " + m.periodShort,
    cumTag   : "CUMULATIVE " + m.cumLabel
  });
}

function buildFourPanel_(D, m, o) {
  var p = D.newSlide();
  D.slideHead(p, o.sub);

  // Hai ô nhận xét (sinh tự động từ số liệu)
  D.rect(p, 0.44, 1.15, 6.05, 1.09, { fill:RPT.C.panel, round:true });
  D.txt(p, 0.56, 1.22, 5.81, 0.95,
        [{ t:narrative_(m.single, m.periodShort, m.groups, "single", m.unit),
           size:12, color:RPT.C.navy }], { valign:"t", ls:105 });

  D.rect(p, 6.82, 1.15, 6.05, 1.09, { fill:RPT.C.panel, round:true });
  D.txt(p, 6.94, 1.22, 5.81, 0.95,
        [{ t:narrative_(m.cum, m.cumLabel, m.groups, "cum", m.unit),
           size:12, color:RPT.C.navy }], { valign:"t", ls:105 });

  // Panel 1 — Single: Budget vs Actual vs GAP
  D.panel(p, 0.46, 2.35, 6.05, 2.46, o.singleTag + "   |   Budget vs. Forecast/Actual");
  D.colChart(p, 0.58, 2.75, 5.81, 2.06, [
    { lbl:"Budget Mani", v:m.single.bm,  c:RPT.C.chBud },
    { lbl:o.mid,         v:m.single.fc,  c:RPT.C.chAct },
    { lbl:"GAP",         v:m.single.gap, c:(m.single.gap>=0?RPT.C.pos:RPT.C.neg) }
  ]);

  // Panel 2 — Cumulative
  D.panel(p, 6.82, 2.35, 6.05, 2.46, o.cumTag + "   |   Budget vs. Forecast/Actual");
  D.colChart(p, 6.94, 2.75, 5.81, 2.06, [
    { lbl:"Budget Mani", v:m.cum.bm,  c:RPT.C.chBud },
    { lbl:o.mid,         v:m.cum.fc,  c:RPT.C.chAct },
    { lbl:"GAP",         v:m.cum.gap, c:(m.cum.gap>=0?RPT.C.pos:RPT.C.neg) }
  ]);

  // Panel 3 / 4 — GAP theo nhóm (đảo thứ tự để vẽ từ dưới lên như PowerPoint)
  var gs = m.groups.slice().map(function(g){ return { lbl:g.key, v:g.single.gap }; });
  var gc = m.groups.slice().map(function(g){ return { lbl:g.key, v:g.cum.gap }; });

  D.panel(p, 0.46, 4.92, 6.05, 2.46, o.singleTag + "   |   GAP by segment");
  D.barChart(p, 0.58, 5.32, 5.81, 2.00, gs);

  D.panel(p, 6.82, 4.92, 6.05, 2.46, o.cumTag + "   |   GAP by segment");
  D.barChart(p, 6.94, 5.32, 5.81, 2.00, gc);
}

function narrative_(agg, label, groups, key, unit) {
  var dir  = agg.gap >= 0 ? "increased" : "reduced";
  var sign = agg.gap >= 0 ? "+" : "-";
  var top  = groups.slice().sort(function(a,b){
    return Math.abs(b[key].gap) - Math.abs(a[key].gap);
  }).slice(0, 2).map(function(g){
    return g.key + " (" + gfmt_(g[key].gap) + "K)";
  }).join(", ");
  return label + " sales " + dir + " " + sign + nfmt_(Math.abs(agg.gap)) + "K (" +
         pfmt_(agg.gp) + ") vs. budget. Main drivers: " + top + ".";
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 3 — BUDGET → ACTUAL BY SEGMENT (6 nhóm)
   ══════════════════════════════════════════════════════════════════ */
function slide3_BySegment_(D, m) {
  var p = D.newSlide();
  D.slideHead(p, "MMH Sales Result " + m.periodShort +
                 "  -  Budget → Actual by segment   |   Unit: " + m.unit);

  // Header bảng
  D.rect(p, 0.46, 1.42, 12.69, 0.28, { fill:RPT.C.panel, round:true });
  var hdr = [
    [0.52, 1.05, "SEGMENT"],
    [1.40, 1.90, "SINGLE – " + m.periodShort],
    [3.42, 3.62, " EXPLANATION"],
    [7.16, 2.02, "CUMULATIVE – " + m.cumLabel],
    [9.18, 3.97, " EXPLANATION"]
  ];
  hdr.forEach(function(h, i){
    D.txt(p, h[0], 1.45, h[1], 0.22,
          [{ t:h[2], size:(i === 1 || i === 3) ? 9.5 : 11,
             bold:true, color:RPT.C.navy }], { valign:"m" });
  });

  var vS = pickVersion_(m.versions, { sc:"Single",     ft:ftKey_(m) });
  var vC = pickVersion_(m.versions, { sc:"Cumulative", ft:ftKey_(m) });

  var rows  = m.groups.slice(0, 6);
  var top0  = 1.79, pitch = 0.89;

  rows.forEach(function(g, i){
    var T = top0 + pitch * i;

    D.txt(p, 0.50, T + 0.26, 0.92, 0.42,
          [{ t:g.key, size:10.5, bold:true, color:RPT.C.navy }], { valign:"m" });

    D.barPair(p, 1.40, T + 0.12, 1.15, g.single.bm, g.single.fc,
              { valW:1.98, pctW:0.78, pctSize:10, valSize:8.5 });
    D.barPair(p, 7.16, T + 0.12, 1.15, g.cum.bm, g.cum.fc,
              { valW:1.98, pctW:0.78, pctSize:10, valSize:8.5 });

    explCard_(D, p, 3.38, T, 3.66, 0.78, explForGroup_(vS, g.key));
    explCard_(D, p, 9.14, T, 3.97, 0.78, explForGroup_(vC, g.key));

    D.rect(p, 0.46, T + 0.83, 12.40, 0.012, { fill:RPT.C.soft });
  });

  // Legend
  D.rect(p, 0.48, 7.17, 0.20, 0.08, { fill:RPT.C.barBg, round:true });
  D.txt(p, 0.74, 7.10, 1.20, 0.20,
        [{ t:"Budget Mani", size:9, color:RPT.C.gray }], { valign:"m" });
  D.rect(p, 1.88, 7.17, 0.20, 0.08, { fill:RPT.C.pos, round:true });
  D.rect(p, 2.14, 7.17, 0.20, 0.08, { fill:RPT.C.neg, round:true });
  D.txt(p, 2.44, 7.10, 6.00, 0.20, [
    { t:"Forecast / Actual - ", size:9, color:RPT.C.gray },
    { t:"above budget",        size:9, bold:true, color:RPT.C.pos },
    { t:" / ",                 size:9, color:RPT.C.gray },
    { t:"below budget",        size:9, bold:true, color:RPT.C.neg }
  ], { valign:"m" });
}

function explCard_(D, p, x, y, w, h, text) {
  D.rect(p, x, y, w, h, { fill:RPT.C.white, line:RPT.C.soft, round:true });
  if (text) {
    D.txt(p, x + 0.10, y + 0.06, w - 0.20, h - 0.12,
          [{ t:clip_(text, 205), size:9.5, color:RPT.C.navy }], { valign:"t", ls:95 });
  } else {
    D.txt(p, x + 0.10, y + 0.06, w - 0.20, h - 0.12,
          [{ t:"…", size:9.5, italic:true, color:"#AAB4C0" }], { valign:"t" });
  }
}

function clip_(s, n) {
  s = String(s || "");
  return s.length > n ? s.substring(0, n - 1) + "…" : s;
}

function ftKey_(m) {
  if (m.period === "month") return CONFIG.VALID_MONTHS[m.mi];
  if (m.period === "qtr")   return RPT.QLBL[m.qi];
  return null;
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 4 — JIZAI
   ══════════════════════════════════════════════════════════════════ */
function slide4_Jizai_(D, mj) {
  var p = D.newSlide();
  D.slideHead(p, "Jizai Sales Result " + mj.periodShort + "   |   Unit: " + (mj.unit || "Sheet"));

  drawJizaiBlock_(D, p, {
    bandY : 1.16, cardY : 1.50, chartX : 3.69, chartY : 1.48, chartW : 8.35,
    title : "SINGLE " + mj.periodShort + "   |   Jizai sales by distributor",
    totLbl: "TOTAL -  " + mj.periodShort,
    agg   : mj.single,
    dists : mj.dists.map(function(d){
              return { lbl:d.name, bm:d.single.bm, fc:d.single.fc, gap:d.single.gap }; })
  });

  drawJizaiBlock_(D, p, {
    bandY : 3.34, cardY : 3.68, chartX : 3.69, chartY : 3.66, chartW : 8.35,
    title : "CUMULATIVE " + mj.cumLabel + "   |   Jizai sales by distributor",
    totLbl: "TOTAL -  " + mj.cumLabel,
    agg   : mj.cum,
    dists : mj.dists.map(function(d){
              return { lbl:d.name, bm:d.cum.bm, fc:d.cum.fc, gap:d.cum.gap }; })
  });

  // Activities — KHUNG TRỐNG để tự điền
  D.band(p, 0.46, 5.52, 11.64, 0.28,
         [{ t:"JIZAI ACTIVITIES", size:10.5, bold:true, color:RPT.C.navy }]);

  D.rect(p, 0.46, 5.86, 5.71, 1.22, { fill:RPT.C.white, line:RPT.C.soft, round:true });
  D.txt(p, 0.58, 5.90, 5.45, 0.20,
        [{ t:"THAILAND", size:10, bold:true, color:RPT.C.blue }], { valign:"m" });
  D.txt(p, 0.58, 6.12, 5.45, 0.90,
        [{ t:"▸ …\n▸ …\n▸ Offline: … | Event: … | Total: … sheets",
           size:10.5, italic:true, color:"#AAB4C0" }], { valign:"t", ls:120 });

  D.rect(p, 6.75, 5.86, 5.36, 1.22, { fill:RPT.C.white, line:RPT.C.soft, round:true });
  D.txt(p, 6.87, 5.90, 5.10, 0.20,
        [{ t:"VIETNAM", size:10, bold:true, color:RPT.C.blue }], { valign:"m" });
  D.txt(p, 6.87, 6.12, 5.10, 0.90,
        [{ t:"▸ …\n▸ …\n▸ Event: … | Tender: … | Offline: … | Total: … sheets",
           size:10.5, italic:true, color:"#AAB4C0" }], { valign:"t", ls:120 });
}

function drawJizaiBlock_(D, p, o) {
  D.band(p, 0.46, o.bandY, 11.45, 0.28,
         [{ t:o.title, size:10.5, bold:true, color:RPT.C.navy }]);

  D.rect(p, 0.46, o.cardY, 2.55, 1.74, { fill:RPT.C.white, line:RPT.C.border, round:true });
  D.txt(p, 0.58, o.cardY + 0.32, 2.31, 0.20,
        [{ t:o.totLbl, size:10, bold:true, color:RPT.C.navy }], { valign:"m" });

  var bm = o.agg.bm, fc = o.agg.fc, gap = fc - bm;
  var top = Math.max(bm, fc, 1);
  var col = gap >= 0 ? RPT.C.pos : RPT.C.neg;
  D.rect(p, 0.58, o.cardY + 0.67, Math.max(1.50 * bm / top, 0.01), 0.12,
         { fill:RPT.C.barBg, round:true });
  D.rect(p, 0.58, o.cardY + 0.87, Math.max(1.50 * fc / top, 0.01), 0.12,
         { fill:col, round:true });
  D.txt(p, 2.10, o.cardY + 0.70, 0.81, 0.24,
        [{ t:pfmt_(o.agg.gp).replace(".0", ""), size:13, bold:true, color:col }],
        { align:"r", valign:"m" });
  D.txt(p, 0.58, o.cardY + 1.07, 2.31, 0.20,
        [{ t:nfmt_(bm) + "  →  " + nfmt_(fc) + "   (" + gfmt_(gap) + ")",
           size:10, color:RPT.C.gray }], { valign:"m" });
  D.rect(p, 0.58, o.cardY + 1.38, 0.16, 0.07, { fill:RPT.C.barBg, round:true });
  D.txt(p, 0.79, o.cardY + 1.32, 0.90, 0.18,
        [{ t:"Budget Mani", size:8, color:RPT.C.gray }], { valign:"m" });
  D.rect(p, 1.72, o.cardY + 1.38, 0.16, 0.07, { fill:RPT.C.neg, round:true });
  D.txt(p, 1.93, o.cardY + 1.32, 0.80, 0.18,
        [{ t:"Actual", size:8, color:RPT.C.gray }], { valign:"m" });

  D.groupChart(p, o.chartX, o.chartY, o.chartW, 1.76,
               o.dists.slice(0, 9), { legend:true });
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 6 — FY OVERVIEW
   ══════════════════════════════════════════════════════════════════ */
function slide6_FyOverview_(D, m) {
  var p = D.newSlide();
  D.slideHead(p, "MMH Sales Forecast " + CONFIG.FY_FILTER + "  |   Unit: " + m.unit);

  D.rect(p, 0.46, 1.25, 12.41, 0.56, { fill:RPT.C.panel, round:true });
  D.txt(p, 0.58, 1.29, 12.17, 0.48,
        [{ t:narrative_(m.fy, CONFIG.FY_FILTER, m.groups, "fy", m.unit),
           size:12, color:RPT.C.navy }], { valign:"m" });

  D.panel(p, 0.46, 2.01, 4.35, 2.28, CONFIG.FY_FILTER + " TOTAL - Budget vs. Forecast");
  D.colChart(p, 0.56, 2.39, 4.15, 1.78, [
    { lbl:"Budget Mani", v:m.fy.bm,  c:RPT.C.chBud },
    { lbl:"Forecast",    v:m.fy.fc,  c:RPT.C.chAct },
    { lbl:"GAP",         v:m.fy.gap, c:(m.fy.gap>=0?RPT.C.pos:RPT.C.neg) }
  ]);

  D.panel(p, 5.03, 2.01, 7.84, 2.28, CONFIG.FY_FILTER + " GAP by segment group");
  D.colChart(p, 5.13, 2.39, 7.64, 1.78,
    m.groups.map(function(g){
      return { lbl:g.key, v:g.fy.gap, c:(g.fy.gap>=0?RPT.C.pos:RPT.C.neg) };
    }), { signed:true });

  D.panel(p, 0.46, 4.41, 7.72, 2.92,
          CONFIG.FY_FILTER + " Turnover by MONTH - Budget vs. Forecast/Actual vs. GAP");
  D.groupChart(p, 0.56, 4.79, 7.52, 2.42,
    m.months.map(function(x){ return { lbl:x.lbl, bm:x.bm, fc:x.fc, gap:x.gap }; }));

  D.panel(p, 8.40, 4.41, 4.47, 2.92, CONFIG.FY_FILTER + " Turnover by QUARTER");
  D.groupChart(p, 8.50, 4.79, 4.27, 2.42,
    m.quarters.map(function(x){ return { lbl:x.lbl, bm:x.bm, fc:x.fc, gap:x.gap }; }));
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 7 — FY BUDGET → FORECAST BY SEGMENT (card)
   ══════════════════════════════════════════════════════════════════ */
function slide7_FyBySegment_(D, m) {
  var p = D.newSlide();
  D.slideHead(p, "MMH Sales Forecast " + CONFIG.FY_FILTER +
                 "  -  Budget → Forecast by segment   |   Unit: " + m.unit);

  var below = m.groups.filter(function(g){ return g.fy.gap <  0; })
                      .sort(function(a,b){ return a.fy.gap - b.fy.gap; });
  var above = m.groups.filter(function(g){ return g.fy.gap >= 0; })
                      .sort(function(a,b){ return b.fy.gap - a.fy.gap; });

  var sumB = below.reduce(function(s,g){ return s + g.fy.gap; }, 0);
  var sumA = above.reduce(function(s,g){ return s + g.fy.gap; }, 0);

  var vFy = pickVersion_(m.versions, { sc:"Cumulative" }) || pickVersion_(m.versions, {});

  D.band(p, 0.46, 1.26, 12.41, 0.30, [
    { t:"BELOW BUDGET  -  segments under " + CONFIG.FY_FILTER + " budget     Total: ",
      size:11, bold:true, color:RPT.C.navy },
    { t:gfmt_(sumB) + "K", size:11, bold:true, color:RPT.C.neg }
  ], { fill:RPT.C.white, line:RPT.C.neg });
  layoutCards_(D, p, below, 1.64, 2.18, 1.23, vFy);

  D.band(p, 0.46, 4.07, 12.41, 0.30, [
    { t:"ABOVE BUDGET  -  segments over " + CONFIG.FY_FILTER + " budget     Total: ",
      size:11, bold:true, color:RPT.C.navy },
    { t:gfmt_(sumA) + "K", size:11, bold:true, color:RPT.C.pos }
  ], { fill:RPT.C.white, line:RPT.C.pos });
  layoutCards_(D, p, above, 4.41, 2.76, 1.78, vFy);
}

function layoutCards_(D, p, groups, y, h, explH, ver) {
  var n = groups.length; if (!n) return;
  var X0 = 0.46, TOTW = 12.41, gapX = 0.29;
  var w  = (TOTW - gapX * (n - 1)) / n;

  groups.forEach(function(g, i){
    var x = X0 + (w + gapX) * i;
    D.rect(p, x, y, w, h, { fill:RPT.C.white, line:RPT.C.soft, round:true });
    D.txt(p, x + 0.12, y + 0.06, w - 0.24, 0.24,
          [{ t:g.key, size:11, bold:true, color:RPT.C.navy }], { valign:"m" });

    var maxW = Math.min(w - 1.20, 4.97);
    D.barPair(p, x + 0.12, y + 0.34, maxW, g.fy.bm, g.fy.fc,
              { bh:0.10, valW:w - 0.24, valSize:9, pctSize:12, pctW:0.85 });

    D.rect(p, x + 0.10, y + 0.88, w - 0.20, explH,
           { fill:RPT.C.soft, round:true });
    var e = explForGroup_(ver, g.key);
    D.txt(p, x + 0.20, y + 0.94, w - 0.40, explH - 0.12,
          [ e ? { t:clip_(e, 420), size:9.5, color:RPT.C.navy }
              : { t:"…", size:9.5, italic:true, color:"#AAB4C0" } ],
          { valign:"t", ls:105 });
  });
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 8 — SO SÁNH 2 VERSION + DRIVERS
   ══════════════════════════════════════════════════════════════════ */
function slide8_VersionCompare_(D, m) {
  var p = D.newSlide();

  var vs = (m.versions || []).filter(function(v){ return v.sc === "Cumulative"; });
  if (vs.length < 2) vs = (m.versions || []).slice();
  vs.sort(function(a,b){ return a.v < b.v ? -1 : 1; });

  var vNew = vs[vs.length - 1] || null;
  var vOld = vs[vs.length - 2] || null;

  D.slideHead(p, "MMH Sales forecast " + CONFIG.FY_FILTER +
                 (vNew ? " " + vNew.v : "") + "    |   Unit: " + m.unit);

  var fNew = grandF_(vNew), fOld = grandF_(vOld), bud = grandB_(vNew) || m.fy.bm;
  var dv   = fNew - fOld;

  D.rect(p, 0.35, 1.16, 12.56, 0.35, { fill:RPT.C.white, line:RPT.C.border, round:true });
  D.txt(p, 0.50, 1.19, 12.26, 0.29, [
    { t:CONFIG.FY_FILTER + " forecast:  " + nfmt_(fOld) + "K (ver. " +
        (vOld ? vOld.v : "—") + ")  →  ", size:11, color:RPT.C.navy },
    { t:nfmt_(fNew) + "K", size:11, bold:true, color:RPT.C.navy },
    { t:" (ver. " + (vNew ? vNew.v : "—") + "),  ", size:11, color:RPT.C.navy },
    { t:gfmt_(dv) + "K", size:11, bold:true, color:(dv >= 0 ? RPT.C.pos : RPT.C.neg) },
    { t:".    Gap vs. budget: ", size:11, color:RPT.C.navy },
    { t:gfmt_(fNew - bud) + "K", size:11, bold:true,
      color:((fNew - bud) >= 0 ? RPT.C.pos : RPT.C.neg) },
    { t:"  (" + pfmt_(bud > 0 ? (fNew - bud) / bud * 100 : 0) +
        " vs. Budget " + nfmt_(bud) + "K).", size:11, color:RPT.C.navy }
  ], { valign:"m" });

  D.panel(p, 0.46, 1.52, 5.00, 2.40, "Budget, Forecast, Gap – 2 Versions");
  D.groupChart(p, 0.56, 1.86, 4.80, 1.96, [
    { lbl:"Ver. " + (vOld ? vOld.v : "—"), bm:bud, fc:fOld, gap:fOld - bud },
    { lbl:"Ver. " + (vNew ? vNew.v : "—"), bm:bud, fc:fNew, gap:fNew - bud }
  ]);

  var drv = versionDrivers_(vNew, vOld);
  var byGroup = {};
  drv.dec.concat(drv.inc).forEach(function(g){
    byGroup[g.group] = (byGroup[g.group] || 0) + g.total / 1000;
  });
  var cats = Object.keys(byGroup).map(function(k){ return { lbl:k, v:byGroup[k] }; })
                   .sort(function(a,b){ return a.v - b.v; });

  D.panel(p, 5.62, 1.52, 7.25, 2.40, "GAP between 2 versions  -  by segment & country");
  D.barChart(p, 6.00, 1.86, 6.77, 1.96, cats.length ? cats : [{ lbl:"—", v:0 }],
             { catW:1.55 });

  // Decrease / Increase drivers
  driverPanel_(D, p, 0.46, 3.96, 6.12, 3.38, "DECREASE DRIVERS", drv.dec,
               drv.decTotal / 1000, RPT.C.neg);
  driverPanel_(D, p, 6.75, 3.96, 6.12, 3.38, "INCREASE DRIVERS", drv.inc,
               drv.incTotal / 1000, RPT.C.pos);
}

function grandF_(v){
  if (!v) return 0;
  var g = (v.countries || []).filter(function(c){ return c.code === "g"; })[0];
  return g && g.total ? (g.total.f || 0) / 1000 : 0;
}
function grandB_(v){
  if (!v) return 0;
  var g = (v.countries || []).filter(function(c){ return c.code === "g"; })[0];
  return g && g.total ? (g.total.b || 0) / 1000 : 0;
}

function driverPanel_(D, p, x, y, w, h, title, groups, total, color) {
  D.rect(p, x, y, w, h, { fill:RPT.C.white, line:RPT.C.soft, round:true });
  D.rect(p, x, y, w, 0.32, { fill:RPT.C.white, line:color, round:true });
  D.txt(p, x + 0.12, y + 0.04, w - 0.24, 0.24, [
    { t:title + "      Total: ", size:10.5, bold:true, color:RPT.C.navy },
    { t:gfmt_(total) + "K",      size:10.5, bold:true, color:color }
  ], { valign:"m" });

  var cy = y + 0.40, maxY = y + h - 0.12;
  groups.slice(0, 4).forEach(function(g){
    var rows  = g.rows.slice(0, 3);
    var cardH = 0.28 + rows.length * 0.35;
    if (cy + cardH > maxY) return;

    D.rect(p, x + 0.10, cy, w - 0.20, cardH, { fill:RPT.C.soft, round:true });
    D.txt(p, x + 0.20, cy + 0.04, w - 0.40, 0.20, [
      { t:g.group,                        size:11, bold:true, color:RPT.C.navy },
      { t:"     " + gfmt_(g.total / 1000) + "K", size:11, bold:true, color:color }
    ], { valign:"m" });

    rows.forEach(function(r, i){
      D.txt(p, x + 0.24, cy + 0.26 + i * 0.35, w - 0.44, 0.34, [
        { t:"▸  ",  size:9.5, color:color },
        { t:r.name, size:9.5, bold:true, color:RPT.C.navy },
        { t:"   " + gfmt_(r.delta / 1000) + "K   ", size:9.5, bold:true, color:color },
        { t:clip_(r.expl || "…", 130), size:9.5, color:RPT.C.gray2 }
      ], { valign:"t", ls:95 });
    });
    cy += cardH + 0.08;
  });

  if (!groups.length) {
    D.txt(p, x + 0.20, y + 0.50, w - 0.40, 0.40,
          [{ t:"Chưa đủ 2 version để so sánh — điền tay tại đây.",
             size:9.5, italic:true, color:"#AAB4C0" }], { valign:"t" });
  }
}


/* ══════════════════════════════════════════════════════════════════
   SLIDE 9 — CLOSING
   ══════════════════════════════════════════════════════════════════ */
function slide9_Closing_(D) {
  var p = D.newSlide();
  D.txt(p, 0.57, 3.05, 12.20, 1.00,
        [{ t:"Thank you", size:36, bold:true, color:RPT.C.navy }], { align:"c", valign:"m" });
}


/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PHẦN 4 — TRIGGER : tự refresh Dashboard khi đổi bộ lọc          ║
   ║  Dùng trigger RIÊNG, không đụng tới logEdit() của Code.gs.       ║
   ╚══════════════════════════════════════════════════════════════════╝ */

/* ════════════════════════════════════════════════════════════════════
   ⭐ v4.0 — KIỂM TRA SỨC KHỎE DỮ LIỆU  (?action=getHealth&fy=FY68)
   Trả về danh sách cảnh báo dễ hiểu để web hiện lên.
   ════════════════════════════════════════════════════════════════════ */
function getHealth_(fy) {
  var info  = setFyContext_(fy);
  var cache = CacheService.getScriptCache();
  var key   = cacheKey_("health", info.fy);
  var hit   = cacheGetBig_(cache, key);
  if (hit) { try { var j = JSON.parse(hit); j.cached = true; return j; } catch (e) {} }

  var issues = [];
  var d = getTurnoverData_(info.fy);
  var fm = function(k){ return String(k).slice(4, 6) + "/" + String(k).slice(0, 4); };

  if (d.ok && d.health) {
    var h = d.health;
    if (h.droppedRows) issues.push({ level:"warn",
      title:"Rows with numbers but missing Segment / Distributor / Country report — not counted",
      detail:h.droppedRows + " rows · Budget " + nfmt_(h.droppedBudget) + " USD · Fct/Actual " + nfmt_(h.droppedValue) + " USD",
      samples:h.samples });
    var us = Object.keys(h.unknownSegments || {});
    if (us.length) issues.push({ level:"warn",
      title:"Unknown segment (not Dental / Eyeless / MMG / Surgical) — ignored by the report",
      detail:us.map(function(s){ return "\"" + s + "\" (" + h.unknownSegments[s] + " rows)"; }).join(", ") });
    if (h.missingCountry) issues.push({ level:"info",
      title:"Rows without 'Country' — grouped by 'Country report' instead",
      detail:h.missingCountry + " rows" });
    if ((h.spaceValues || []).length) issues.push({ level:"warn",
      title:"Values with extra spaces at the start/end — can break row matching in the Sheet",
      detail:h.spaceValues.length + " different value(s)", samples:h.spaceValues });
  }

  try {
    checkInputTabs_(info).forEach(function(c){
      if (!c.rows) return;
      issues.push({ level:"error",
        title:"Tab '" + c.tab + "': " + c.rows + " rows have numbers but match NO row in SUM TURNOVER",
        detail:"These numbers are not in the report. Turnover missing: " + nfmt_(c.amount) + " USD",
        samples:c.samples });
    });
  } catch (e) { issues.push({ level:"info", title:"Could not cross-check the input tabs", detail:String(e) }); }

  if (d.ok && d.monthStatus && d.ruleMode === "actual-if-available") {
    var ms = d.monthStatus.turnover || [], now = todayKeyDay_();
    var pend = ms.filter(function(x){
      var past = x.m < now.key || (x.m === now.key && now.day >= CONFIG.ACTUAL_CUTOFF_DAY);
      return past && !x.closed && x.bud > 0;
    }).map(function(x){ return fm(x.m); });
    if (pend.length) issues.push({ level:"warn",
      title:"Month is due but has no Actual yet — the report uses Forecast for now",
      detail:pend.join(", ") });
    var low = ms.filter(function(x){ return !x.closed && x.bud > 0 && x.filled / x.bud < 0.5; })
                .map(function(x){ return fm(x.m) + " (" + x.filled + "/" + x.bud + ")"; });
    if (low.length) issues.push({ level:"info",
      title:"Forecast barely entered (under 50% of budget rows) — GAP for these months is not meaningful yet",
      detail:low.join(", ") });
  }

  try {
    var ex = getExplanations_(info.fy);
    if (ex && ex.futureVersions && ex.futureVersions.length) issues.push({ level:"info",
      title:"Explanation versions dated in the future (the web treats them as the latest)",
      detail:ex.futureVersions.map(function(v){ return v.slice(6, 8) + "/" + v.slice(4, 6) + "/" + v.slice(0, 4); }).join(", ") });
  } catch (e) {}

  var out = { ok:true, t:Date.now(), fy:info.fy, issues:issues };
  cachePutBig_(cache, key, JSON.stringify(out), 300);
  return out;
}

// Đối chiếu từng tab nhập với SUM TURNOVER theo đúng cách công thức SUMIFS
// của Sheet khớp dòng: cột CHECK (B) + cột Products (L).
function checkInputTabs_(info) {
  var ss  = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sum = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sum) return [];

  function readTab_(sh, hRow, sRow, valName) {
    var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    if (lastRow < sRow) return [];
    var hdr = sh.getRange(hRow, 1, 1, lastCol).getValues()[0];
    var ix  = autoDetectColumns_(hdr, { key:"CHECK", type:"Type", fy:"FY", month:"Month",
                                        prod:"Products", val:valName || "Budget Mani USD" });
    if (ix.key < 0 || ix.prod < 0) return [];
    var vals = sh.getRange(sRow, 1, lastRow - sRow + 1, lastCol).getValues();
    return vals.map(function(r, i){
      return { row:i + sRow, key:String(r[ix.key] || ""), prod:String(r[ix.prod] == null ? "" : r[ix.prod]),
               type:ix.type >= 0 ? String(r[ix.type] || "") : "",
               fy:ix.fy >= 0 ? String(r[ix.fy] || "").toUpperCase().trim() : "",
               month:ix.month >= 0 ? normMonth_(r[ix.month]) : "",
               val:(valName && ix.val >= 0) ? toNumF_(r[ix.val]) : 0 };
    });
  }
  function k_(x){ return (x.key + "||" + x.prod).toLowerCase(); }   // SUMIFS không phân biệt hoa/thường

  var inFy = {}; info.keys.forEach(function(m){ inFy[m] = 1; });
  var set = {};
  readTab_(sum, CONFIG.HEADER_ROW, CONFIG.DATA_START_ROW, null).forEach(function(x){ if (x.key) set[k_(x)] = 1; });

  var res = [];
  (CONFIG.INPUT_TABS || []).forEach(function(t){
    var sh = ss.getSheetByName(t.name);
    if (!sh) return;
    var c = { tab:t.name, rows:0, amount:0, samples:[] };
    readTab_(sh, t.header, t.start, t.value).forEach(function(x){
      if (!x.key || !x.val) return;
      if (!(x.fy === info.fy || (!x.fy && inFy[x.month]))) return;
      if (set[k_(x)]) return;
      c.rows++;
      if (/turnover/i.test(x.type)) c.amount += x.val;
      if (c.samples.length < 8) c.samples.push("Row " + x.row + ": " + x.key + " · \"" + x.prod + "\" = " + nfmt_(x.val));
    });
    res.push(c);
  });
  return res;
}


const DASH_TRIGGER = "dashboardEditTrigger_";

// Handler của trigger onEdit dạng installable
function dashboardEditTrigger_(e) {
  try { dashboardOnEdit_(e); } catch (err) { Logger.log("dashboardEditTrigger_: " + err); }
}

// Cài trigger (chạy 1 lần, từ menu 📊 MMH Report)
function installDashboardTrigger() {
  removeDashboardTrigger();
  ScriptApp.newTrigger(DASH_TRIGGER)
    .forSpreadsheet(CONFIG.SPREADSHEET_ID)
    .onEdit()
    .create();
  Logger.log("Đã cài trigger Dashboard.");
  try {
    SpreadsheetApp.getUi().alert(
      "Xong",
      "Từ giờ đổi dropdown ở hàng 5 của tab Dashboard là bảng tự dựng lại.",
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (ignore) {}
}

// Gỡ trigger
function removeDashboardTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === DASH_TRIGGER) ScriptApp.deleteTrigger(t);
  });
}

/* ── ⭐ v4.0 — showDataHealth(): hộp thoại liệt kê cảnh báo dữ liệu của FY đang chọn ── */
function showDataHealth() {
  var fy = "";
  try {
    var sh = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(DASH.SHEET);
    if (sh) fy = readControls_(sh).fy;
  } catch (e) {}
  bumpCacheGen_();                                   // đọc số mới nhất
  var h = getHealth_(fy), L = [];
  L.push("FY " + h.fy + " — " + (h.issues.length ? h.issues.length + " cảnh báo" : "không có cảnh báo 👍"));
  h.issues.forEach(function(x, i){
    L.push("");
    L.push((i + 1) + ". " + x.title);
    if (x.detail) L.push("   " + x.detail);
    (x.samples || []).slice(0, 5).forEach(function(s){ L.push("   - " + s); });
  });
  var msg = L.join("\n");
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert("MMH — Sức khỏe dữ liệu", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

/* ── checkReportSetup() — soát nhanh trước khi dựng Dashboard ────── */
function checkReportSetup() {
  var L = [];
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    L.push("File Sheet     : " + ss.getName());

    var src = ss.getSheetByName(CONFIG.SHEET_NAME);
    L.push("Tab dữ liệu    : " + (src ? CONFIG.SHEET_NAME + " (" + src.getLastRow() + " dòng)"
                                      : "KHÔNG THẤY '" + CONFIG.SHEET_NAME + "'"));
    var ex = ss.getSheetByName(CONFIG.EXPL_SHEET_NAME);
    L.push("Tab giải trình : " + (ex ? CONFIG.EXPL_SHEET_NAME : "KHÔNG THẤY (tab Explanations sẽ trống)"));

    var d = getTurnoverData_("");
    L.push("");
    L.push("FY đang xem      : " + (d.fy || "?") + "  ·  FY có trong file: " + ((d.fyList || []).join(", ") || "?"));
    L.push("Quy tắc Fct/Act  : " + (d.ruleMode === "actual-if-available" ? ruleText_() : "theo cột Q của Sheet (không thấy cột O/P)"));
    L.push("getTurnoverData_ : " + (d.ok ? d.rows.length + " dòng turnover, " +
                                           d.rowsJizai.length + " dòng jizai"
                                         : "LỖI — " + d.error));

    var m  = buildModel_({ mode:"turnover", period:"fy", fy:d.fy });
    L.push("Model FY         : Budget " + nfmt_(m.fy.bm) + "K  ·  Forecast " +
           nfmt_(m.fy.fc) + "K  ·  " + m.dists.length + " distributor  ·  " +
           m.versions.length + " version giải trình");

    FXX = fxBuild_(ss, m);
    L.push("");
    if (FXX) {
      L.push("Lớp công thức    : OK — " + Object.keys(FXX.rowOf).length +
             " dòng SUMIFS trong tab ẩn " + CALC);
      L.push("Cột Month kiểu   : " + (FXX.monthIsNum ? "SỐ" : "CHUỖI"));
      L.push("→ Dashboard sẽ chạy REALTIME.");
    } else {
      L.push("Lớp công thức    : KHÔNG dựng được (thiếu cột trong COLUMN_MAP).");
      L.push("→ Dashboard vẫn chạy nhưng ghi số tĩnh, phải bấm menu để làm mới.");
    }
    L.push("");
    try {
      var hl = getHealth_(d.fy);
      L.push("Sức khỏe dữ liệu : " + (hl.issues.length ? hl.issues.length + " cảnh báo" : "không có cảnh báo"));
      hl.issues.slice(0, 6).forEach(function(x){ L.push("  • " + x.title + (x.detail ? " — " + x.detail : "")); });
    } catch (eH) { L.push("Sức khỏe dữ liệu : lỗi — " + eH); }
    L.push("");
    L.push("Engine PPT       : " + PPT.ENGINE);
  } catch (e) {
    L.push("LỖI: " + (e && e.message || e));
  }

  var msg = L.join("\n");
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert("MMH Report — kiểm tra cấu hình", msg,
                                 SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
  return msg;
}


// Tự kiểm tra nhanh — chạy hàm này trong editor để xem log
function testReportSuite() {
  var m = buildModel_({ mode:"turnover", period:"month", mi:10 });
  Logger.log("Kỳ           : " + m.periodLabel + "  |  Đơn vị: " + m.unit);
  Logger.log("Single       : B " + nfmt_(m.single.bm) + "  F " + nfmt_(m.single.fc) +
             "  GAP " + gfmt_(m.single.gap) + " (" + pfmt_(m.single.gp) + ")");
  Logger.log("Cumulative   : B " + nfmt_(m.cum.bm) + "  F " + nfmt_(m.cum.fc) +
             "  GAP " + gfmt_(m.cum.gap));
  Logger.log("Nhóm         : " + m.groups.map(function(g){
    return g.key + " " + gfmt_(g.single.gap); }).join("  |  "));
  Logger.log("Distributor  : " + m.dists.length + "   Version: " + m.versions.length);
  Logger.log("PPT engine   : " + PPT.ENGINE +
             (PPT.ENGINE === "pptx" ? "  (OOXML trực tiếp — không cần API)"
                                    : "  (cần Google Slides API)"));
  if (PPT.ENGINE === "slides") {
    Logger.log("Slides API   : " + (typeof Slides !== "undefined"
               ? "ĐÃ bật" : "CHƯA bật — Services (+) → Google Slides API"));
    Logger.log("Template     : " + (PPT.TEMPLATE_ID || "(trống)"));
  }
}



/* ════════════════════════════════════════════════════════════════════
   ⭐ v4.2 — HỌP TUẦN SURGICAL (MMH CRM) · ?action=getNppDetail
   ────────────────────────────────────────────────────────────────────
   Trả số liệu SUM TURNOVER theo từng NPP × sản phẩm × tháng, gọn nhẹ,
   tách riêng các cột mà getTurnoverData_ gộp lại:
     bm = Budget Mani USD        bd = Budget Distributor USD
     fc = Forecast USD           ac = Actual USD
     v  = Actual/Forecast theo QUY TẮC MỚI (giống hệt getTurnoverData_)
     cl = 1 nếu tháng đã chốt Actual
   Tham số: fy=FY68 (bỏ trống = FY hiện tại) · seg=Surgical (nhiều segment
   ngăn bằng dấu phẩy, theo cột "Segment Report").
   Cache 10 phút + tự hết hạn ngay khi sửa Sheet (EditLog trigger đổi
   "thế hệ" cache) ⇒ web nhận số mới gần như tức thì mà vẫn cực nhẹ.
   ════════════════════════════════════════════════════════════════════ */
function getNppDetail_(fy, seg) {
  const info  = setFyContext_(fy);
  const segs  = String(seg || "Surgical").split(",")
                  .map(function(s){ return s.trim().toLowerCase(); })
                  .filter(function(s){ return !!s; });
  const cache = CacheService.getScriptCache();
  const key   = cacheKey_("npp_" + segs.join("+"), info.fy);
  const hit   = cacheGetBig_(cache, key);
  if (hit) { try { const j = JSON.parse(hit); j.cached = true; return j; } catch (e) {} }

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) return { ok:false, error:"Tab '" + CONFIG.SHEET_NAME + "' not found." };

  const out = {
    ok: true, t: Date.now(), lastModified: lastModified_(),
    fy: info.fy, fyInfo: fyPublic_(info), rule: ruleText_(), segments: segs,
    cols: ["m","d","p","bm","bd","fc","ac","v","cl"], rows: [], closed: {}
  };
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < CONFIG.DATA_START_ROW) return out;

  const header = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  const data   = sh.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, lastCol).getValues();
  const map    = Object.assign({}, CONFIG.COLUMN_MAP, { budgetDist: "Budget Distributor USD" });
  const idx    = autoDetectColumns_(header, map);
  const miss   = ["month","segment","distributor","budget","forecast"].filter(function(k){ return idx[k] < 0; });
  if (miss.length) return { ok:false, error:"Missing columns (Turnover): " + miss.join(", ") };

  const validSet = {}; info.keys.forEach(function(m){ validSet[m] = 1; });
  const hasSplit = idx.fcRaw >= 0 && idx.actual >= 0;
  const r2 = function(x){ return Math.round(x * 100) / 100; };

  // Lượt 1: dòng "1 Turnover" của FY + tổng Actual theo tháng (mọi segment — đúng quy tắc chốt tháng)
  const recs = [], actSum = {};
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (idx.type >= 0 && typeKind_(row[idx.type]) !== "turnover") continue;     // ⭐ v5.9
    const month = normMonth_(row[idx.month]);
    if (!month || !validSet[month]) continue;
    if (idx.fy >= 0) {
      const f = String(row[idx.fy] || "").toUpperCase().trim();
      if (f && f !== info.fy) continue;
    }
    const act = hasSplit ? toNumF_(row[idx.actual]) : 0;
    if (act !== 0) actSum[month] = (actSum[month] || 0) + act;
    const sg = String(row[idx.segment] || "").trim().toLowerCase();
    if (segs.length && segs.indexOf(sg) < 0) continue;
    const dist = String(row[idx.distributor] || "").trim();
    if (!dist) continue;
    recs.push({ m:month, d:dist,
      p : idx.products >= 0 ? String(row[idx.products] || "").trim() : "",
      bm: toNumF_(row[idx.budget]),
      bd: idx.budgetDist >= 0 ? toNumF_(row[idx.budgetDist]) : 0,
      fc: hasSplit ? toNumF_(row[idx.fcRaw]) : toNumF_(row[idx.forecast]),
      ac: act, af: toNumF_(row[idx.forecast]) });
  }

  // Lượt 2: áp quy tắc Actual/Forecast y như getTurnoverData_
  const now = todayKeyDay_();
  info.keys.forEach(function(m){
    const past = (m < now.key) || (m === now.key && now.day >= CONFIG.ACTUAL_CUTOFF_DAY);
    if (hasSplit && past && (actSum[m] || 0) !== 0) out.closed[m] = 1;
  });
  recs.forEach(function(x){
    const cl = out.closed[x.m] ? 1 : 0;
    const v  = hasSplit ? (cl ? x.ac : x.fc) : x.af;
    if (!x.bm && !x.bd && !x.fc && !x.ac && !v) return;
    out.rows.push([x.m, x.d, x.p, r2(x.bm), r2(x.bd), r2(x.fc), r2(x.ac), r2(v), cl]);
  });
  out.count = out.rows.length;
  out.ruleMode = hasSplit ? "actual-if-available" : "sheet-column-Q";

  cachePutBig_(cache, key, JSON.stringify(out), CONFIG.CACHE_TTL_SEC);
  return out;
}





/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PART 6 — OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR SHEETS   v6.0   ║
   ║  Built by buildYearQuarterSheets() (menu 📊 MMH Report).          ║
   ╚══════════════════════════════════════════════════════════════════╝

   WHAT IT BUILDS (inside this Google Sheet)
     OVERVIEW       Fiscal-year view: Total (Year → Quarter → Month),
                    Segment, 6 Segment × Country groups, Distributors,
                    Country report × Segment, KPI strip (no charts).
     SEGMENT-COUNTRY-DISTRIBUTOR
                    One quarter or one month: SINGLE + CUMULATIVE (from
                    the FY start) for the same sections, KPI strip
                    and the "Lookup by item" explorer
                    (Segment / Country / Country report / Segment ×
                    Country / Distributor → every quarter and month).
     _YQ_Lists      (hidden) dropdown lists.
     _YQ_Key        (hidden) one helper row per SUM TURNOVER row:
                    trimmed keys, 6-group code, Actual/Forecast value.

   HOW IT STAYS REAL-TIME
     Every number is a SUMIFS formula on SUM TURNOVER. Change a dropdown or any
     input cell → the sheets recalculate instantly. No trigger needed.
     Run the builder again only when a NEW distributor / FY / type
     appears (the ✓/⚠ check lines tell you when).

   BUDGET VIEW (dropdown on each sheet, v5.8)
     "Budget Mani" or "Budget Distributor" — every Budget figure, Vs. Budget
     and Achievement of that sheet follows it. Columns Forecast (Forecast USD)
     and Actual (Actual USD) are shown before Forecast / Actual.

   FORECAST / ACTUAL (fixed rule, v6.0 — the F/A SOURCE dropdown was removed)
     Month due (current month from day 25) AND Actual entered for that month
     → Actual, otherwise Forecast. Same rule as the web dashboard. Without
     the Forecast USD / Actual USD columns: column Actual/Forecast USD.
   ════════════════════════════════════════════════════════════════════ */

const YQ = {
  YEAR  : "OVERVIEW",                          // ⭐ v5.5 — was "YEAR"
  QM    : "SEGMENT-COUNTRY-DISTRIBUTOR",       // ⭐ v5.5 — was "QUARTER-MONTH"
  OLD   : { YEAR:"YEAR", QM:"QUARTER-MONTH" },
  LISTS : "_YQ_Lists",
  KEY   : "_YQ_Key",
  EXPL  : "_YQ_Expl",
  CHART : "_YQ_Chart",                          // old helper tab (v5.6) — removed by the builder
  MARK  : "«MMH-AUTO-YQ · built by script — edit only the cream dropdown cells»",
  MIN_ROWS : 6000,

  RULES      : ["Actual if entered", "Column Q (sheet)"],
  EXPL_MODES : ["Latest version", "Full year", "Q1", "Q2", "Q3", "Q4"],
  DIMS       : ["Segment", "Country", "Country report", "Segment × Country", "Distributor"],
  SEGS       : ["Surgical", "Dental", "MMG", "Eyeless"],
  CTY_ORDER  : ["Thailand", "Myanmar", "Viet Nam", "Lao", "Cambodia"],
  PERIODS    : [["Q1 (Sep-Nov)",1,3],["Q2 (Dec-Feb)",4,6],["Q3 (Mar-May)",7,9],["Q4 (Jun-Aug)",10,12],
                ["Sep",1,1],["Oct",2,2],["Nov",3,3],["Dec",4,4],["Jan",5,5],["Feb",6,6],
                ["Mar",7,7],["Apr",8,8],["May",9,9],["Jun",10,10],["Jul",11,11],["Aug",12,12]],
  GROUPS : [
    { code:"G1", name:"TH/MM Surgical",     def:"Surgical · Thailand + Myanmar",            rep:"TH", segs:["Surgical"] },
    { code:"G2", name:"TH Dental/MMG",      def:"Dental + MMG · Thailand",                   rep:"TH", segs:["Dental","MMG"] },
    { code:"G3", name:"VN Surgical",        def:"Surgical · Viet Nam",                       rep:"VN", segs:["Surgical"] },
    { code:"G4", name:"VN/LA/KH/MM Dental", def:"Dental · Viet Nam, Lao, Cambodia, Myanmar", rep:"VN", segs:["Dental"] },
    { code:"G5", name:"VN/LA/KH/MM MMG",    def:"MMG · Viet Nam, Lao, Cambodia, Myanmar",    rep:"VN", segs:["MMG"] },
    { code:"G6", name:"VN Eyeless",         def:"Eyeless · Viet Nam",                        rep:"VN", segs:["Eyeless"] }
  ],
  OTHER : { code:"Other", name:"Other (outside G1–G6)", def:"Any Segment × Country not covered by G1–G6", rep:"VN", segs:[] },
  // Display order of distributors inside each group (new ones are appended A→Z)
  DIST_ORDER : {
    G1:["AFTA-INNOTECH|Thailand","MAHACHAK|Thailand","NOVATEC|Thailand","AV|Myanmar"],
    G2:["DDI|Thailand","DEVA|Thailand","PROMPT DENT|Thailand","VRP DENT|Thailand"],
    G3:["HUNG VI|Viet Nam","ICARE|Viet Nam","AN TAM|Viet Nam","MHI|Viet Nam","BAO LINH|Viet Nam"],
    G4:["UDOM|Myanmar","NAM DUNG|Viet Nam","VIET THAI|Viet Nam","SPI|Viet Nam","MECI|Viet Nam","ENT|Lao","MEDTRONICAM|Cambodia"],
    G5:["UDOM|Myanmar","NAM DUNG|Viet Nam","SPI|Viet Nam","VIET THAI|Viet Nam","MECI|Viet Nam","ENT|Lao"],
    G6:["CPT|Viet Nam","USM|Viet Nam"]
  },

  C : {   // soft palette of the FY68 Market & Strategy Report template
    title:"#35506B", sub:"#5B87B8", label:"#7F8C9A", note:"#6E8095", text:"#3A4A5A",
    band:"#5B87B8", band2:"#35506B", bandS:"#EAF1F8", bandC:"#FFF6D9", head:"#F3F5F8", total:"#FAFBFC", line:"#DDE3EA",
    input:"#FFF6D9", inputLine:"#EFCB4A", link:"#1155CC", neg:"#C2605C", pos:"#4E9A78", amber:"#C9962E",
    fillPos:"#86BFA3", fillAmb:"#E6BC6A", fillNeg:"#E2A29E", boxS:"#9DBCDB", boxC:"#E9CF6E",
    hilite:"#FFF6D9", kpi:"#FFFFFF", white:"#FFFFFF", barBud:"#C5D2DF", barFa:"#5B87B8", lineLy:"#E0B43C"
  },
  BUDGETS : ["Budget Mani", "Budget Distributor"],   // ⭐ v5.8 — BUDGET VIEW dropdown
  KINDS   : ["Turnover", "Jizai", "Composite"],         // ⭐ v5.9 — Type group (any Type name containing the word)
  USD_FROM_FY : 68,                                     // ⭐ v5.9 — from FY68 Jizai / Composite are in USD like Turnover
  FONT : "Lexend",                              // ⭐ v5.7 — font of every generated sheet and chart
  NUM : '#,##0.0;-#,##0.0;"-"',
  PCT : '+0.0%;-0.0%;"-"',
  ACH : '0.0%;-0.0%;"-"'
};


/* ── Menu entry point ─────────────────────────────────────────────── */
function buildYearQuarterSheets() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) { Logger.log("buildYearQuarterSheets: another build is running — skipped."); return "BUSY"; }
  var msg;
  try { msg = yqBuildAll_(); }
  catch (e) { msg = "ERROR: " + (e && e.stack || e); }
  finally { try { lock.releaseLock(); } catch (e2) {} }
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert("MMH — OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e3) {}
  return msg;
}


/* ── Orchestrator ─────────────────────────────────────────────────── */
function yqBuildAll_() {
  var ss  = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var src = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!src) throw new Error("Tab '" + CONFIG.SHEET_NAME + "' not found.");

  var X = yqScan_(ss, src);                       // column letters + lists from the data

  // ⭐ v5.5 — the two reports were renamed: YEAR → OVERVIEW, QUARTER-MONTH → SEGMENT-COUNTRY-DISTRIBUTOR.
  //   An old script-built tab is renamed (keeps your dropdown choices); if the new name is
  //   already taken, the old script-built tab is removed after the rebuild.
  var leftovers = [];
  [[YQ.OLD.YEAR, YQ.YEAR], [YQ.OLD.QM, YQ.QM]].forEach(function(p){
    var o = ss.getSheetByName(p[0]);
    if (!o || String(o.getRange(1, 1).getValue() || "").indexOf("MMH-AUTO-YQ") < 0) return;
    if (!ss.getSheetByName(p[1])) o.setName(p[1]); else leftovers.push(o);
  });

  // 1) make sure every sheet exists BEFORE any formula refers to it
  var keep = {};
  var shY = yqPrepSheet_(ss, YQ.YEAR,  0, keep);
  var shQ = yqPrepSheet_(ss, YQ.QM,    1, keep);
  var shL = yqPrepSheet_(ss, YQ.LISTS, null, keep);
  var shK = yqPrepSheet_(ss, YQ.KEY,   null, keep);
  var oldC = ss.getSheetByName(YQ.CHART);                 // v5.7 — helper tab no longer used
  if (oldC && String(oldC.getRange(1, 1).getValue() || "").indexOf("MMH-AUTO-YQ") >= 0) ss.deleteSheet(oldC);
  // v5.2 — explanations are no longer shown on the sheets: remove the old helper tab
  var oldE = ss.getSheetByName(YQ.EXPL);
  if (oldE && String(oldE.getRange(1, 1).getValue() || "").indexOf("MMH-AUTO-YQ") >= 0) ss.deleteSheet(oldE);
  X.keep = keep;


  // 2) helper sheets, then the two reports
  yqBuildLists_(shL, X);
  yqBuildKey_(shK, X);
  var yInfo = yqBuildYear_(shY, X);
  var qInfo = yqBuildQM_(shQ, X);

  // Lexend on the two reports (whole sheet, so typed notes match too)
  [shY, shQ].forEach(function(s){ try { s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).setFontFamily(YQ.FONT); } catch (e) {} });

  // 3) formulas that point at cells of the reports (written last)
  yqFinishKey_(shK, X, yInfo, qInfo);
  yqFinishLists_(shL, X, qInfo);

  [shL, shK].forEach(function(s){ try { s.hideSheet(); } catch (e) {} });

  // ⭐ v5.7 — KPI TURNOVER (PART 7) — never stops the two reports
  var kptMsg = "";
  try { kptMsg = kptBuild_(ss, X); } catch (eK) { kptMsg = "⚠ KPI TURNOVER could not be built: " + (eK && eK.message || eK); }
  leftovers.forEach(function(o){ try { ss.deleteSheet(o); } catch (e) {} });
  SpreadsheetApp.flush();
  ss.setActiveSheet(shY);

  return "Done ✓\n\n" +
    "OVERVIEW and SEGMENT-COUNTRY-DISTRIBUTOR were built from '" + CONFIG.SHEET_NAME + "' (" + X.nData + " data rows).\n" +
    "Fiscal years: " + X.fys.join(", ") + "\n" +
    "Distributors listed: " + X.distCount + "\n" +
    "Forecast / Actual: " + (X.split ? "Actual if entered and the month is due, otherwise Forecast" : "column Actual/Forecast USD (Forecast / Actual USD split columns not found)") + "\n\n" +
    "Everything is formula-based: change a dropdown (cream cells) or any input tab and the numbers update immediately.\n" +
    "Run this menu again only when a new distributor, FY or data type appears." +
    (kptMsg ? "\n\n" + kptMsg : "");
}


/* ── Scan SUM TURNOVER + Forecast Explanation Input ───────────────── */
function yqScan_(ss, src) {
  var lastRow = src.getLastRow(), lastCol = src.getLastColumn();
  var header  = src.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var map = Object.assign({}, CONFIG.COLUMN_MAP, { mani:"Mani Distributor name", budgetDist:"Budget Distributor USD" });
  var idx = autoDetectColumns_(header, map);
  var need = ["type","fy","month","segment","distributor","country","budget","forecast","countryPhys"];
  var miss = need.filter(function(k){ return idx[k] < 0; });
  if (miss.length) throw new Error("Missing columns in '" + CONFIG.SHEET_NAME + "': " + miss.join(", "));

  var L = function(k){ return idx[k] >= 0 ? fxCol_(idx[k] + 1) : ""; };
  var N = Math.max(YQ.MIN_ROWS, lastRow + 1500);
  // ⭐ v5.1 — Google Sheets cuts a range to the real size of the tab: if SUM TURNOVER has fewer
  //   rows than N, 'SUM TURNOVER'!M6:M6000 becomes shorter than the helper columns and SUMIFS
  //   returns #VALUE! ("array arguments are of different size"). Add blank rows at the bottom.
  if (src.getMaxRows() < N) src.insertRowsAfter(src.getMaxRows(), N - src.getMaxRows());
  var X = {
    ss: ss,
    N : N,
    col: { type:L("type"), fy:L("fy"), month:L("month"), seg:L("segment"), dist:L("distributor"),
           cr:L("country"), phys:L("countryPhys"), bud:L("budget"), fa:L("forecast"),
           fc:L("fcRaw"), act:L("actual"), budD:L("budgetDist") },
    split: idx.fcRaw >= 0 && idx.actual >= 0,
    nData: 0
  };

  // ---- lists from the data
  var n = Math.max(0, lastRow - CONFIG.DATA_START_ROW + 1);
  var data = n ? src.getRange(CONFIG.DATA_START_ROW, 1, n, lastCol).getValues() : [];
  var types = {}, ctys = {}, reps = {}, segs = {}, dists = {}, mani = {}, hasOther = false;
  data.forEach(function(r){
    var t   = String(r[idx.type] || "").trim();
    var seg = String(r[idx.segment] || "").trim();
    var dn  = String(r[idx.distributor] || "").trim();
    var ph  = String(r[idx.countryPhys] || "").trim();
    var cr  = String(r[idx.country] || "").trim();
    if (!t && !seg && !dn) return;
    X.nData++;
    if (t) types[yqKindOf_(t)] = 1;                   // ⭐ v5.9 — Type group, not the raw name
    if (seg) segs[seg] = 1;
    if (ph) ctys[ph] = 1;
    if (cr) reps[cr] = reps[cr] || (String(r[idx.fy] || "").trim() || "~");
    if (!seg || !dn) return;
    var g = yqGroupOf_(seg, ph);
    if (g === "Other") hasOther = true;
    var k = g + "|" + dn + "|" + ph;
    dists[k] = { g:g, dist:dn, cty:ph };
    if (idx.mani >= 0 && r[idx.mani] && !mani[dn]) mani[dn] = String(r[idx.mani]).trim();
  });

  X.fys = listFys_();
  var cur = currentFy_();
  if (!X.fys.length) X.fys = [cur];
  X.defaultFy = X.fys.indexOf(cur) >= 0 ? cur : X.fys[X.fys.length - 1];

  X.types = YQ.KINDS.filter(function(k){ return types[k]; })
             .concat(Object.keys(types).filter(function(k){ return YQ.KINDS.indexOf(k) < 0; }).sort());
  if (!X.types.length) X.types = [YQ.KINDS[0]];
  X.defaultType = X.types.indexOf(YQ.KINDS[0]) >= 0 ? YQ.KINDS[0] : X.types[0];

  X.segs = YQ.SEGS.filter(function(s){ return segs[s]; })
             .concat(Object.keys(segs).filter(function(s){ return YQ.SEGS.indexOf(s) < 0; }).sort());
  X.ctys = YQ.CTY_ORDER.filter(function(c){ return ctys[c]; })
             .concat(Object.keys(ctys).filter(function(c){ return YQ.CTY_ORDER.indexOf(c) < 0; }).sort());
  X.reps = Object.keys(reps).sort(function(a, b){
    var fa = reps[a], fb = reps[b]; if (fa !== fb) return fa < fb ? -1 : 1;
    var ta = /thai/i.test(a) ? 0 : 1, tb = /thai/i.test(b) ? 0 : 1; if (ta !== tb) return ta - tb;
    return a < b ? -1 : 1;
  });

  X.groups = YQ.GROUPS.slice();
  if (hasOther) X.groups.push(YQ.OTHER);
  X.distByGroup = {};
  X.distCount = 0;
  X.groups.forEach(function(G){
    var list = Object.keys(dists).map(function(k){ return dists[k]; }).filter(function(d){ return d.g === G.code; });
    var order = YQ.DIST_ORDER[G.code] || [];
    list.sort(function(a, b){
      var ia = order.indexOf(a.dist + "|" + a.cty), ib = order.indexOf(b.dist + "|" + b.cty);
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      if (ia !== ib) return ia - ib;
      return (a.dist + a.cty) < (b.dist + b.cty) ? -1 : 1;
    });
    list.forEach(function(d){ d.mani = mani[d.dist] || ""; });
    X.distByGroup[G.code] = list;
    X.distCount += list.length;
  });
  X.distItems = [];
  X.groups.forEach(function(G){
    X.distByGroup[G.code].forEach(function(d){
      var it = d.dist + " (" + d.cty + ")";
      if (X.distItems.indexOf(it) < 0) X.distItems.push(it);
    });
  });

  return X;
}

// ⭐ v5.9 — Type group of a Type cell (same rule as _YQ_Key!X and typeKind_ of the web data):
//   the word Jizai wins, then Composite, then Turnover — so "2 Jizai Turnover" is Jizai.
function yqKindOf_(t) {
  var s = String(t || "").trim();
  if (/jizai/i.test(s)) return "Jizai";
  if (/composite/i.test(s)) return "Composite";
  if (/turnover/i.test(s)) return "Turnover";
  return s;
}
// divisor of the reports: Jizai (or a Qty type) before FY68 is counted in sheets (÷1), the rest in K USD (÷1000)
function yqDivX_(fyNo) {
  return 'IF(AND(OR($E$6="Jizai",REGEXMATCH($E$6,"(?i)qty|pcs")),' + fyNo + '<' + YQ.USD_FROM_FY + '),1,1000)';
}

// Same rule as the _YQ_Key!A formula (keep both in sync)
function yqGroupOf_(seg, cty) {
  var s = String(seg || "").toLowerCase(), c = String(cty || "").toLowerCase();
  var vlkm = /^(viet nam|lao|cambodia|myanmar)$/.test(c);
  if (s === "surgical" && (c === "thailand" || c === "myanmar")) return "G1";
  if ((s === "dental" || s === "mmg") && c === "thailand") return "G2";
  if (s === "surgical" && c === "viet nam") return "G3";
  if (s === "dental" && vlkm) return "G4";
  if (s === "mmg" && vlkm) return "G5";
  if (s === "eyeless" && c === "viet nam") return "G6";
  return "Other";
}


/* ── Sheet preparation (never deletes a sheet the script did not build) ── */
function yqPrepSheet_(ss, name, pos, keep) {
  var sh = ss.getSheetByName(name);
  if (sh) {
    var a1    = String(sh.getRange(1, 1).getValue() || "");
    var empty = sh.getLastRow() === 0 && sh.getLastColumn() === 0;
    if (a1.indexOf("MMH-AUTO-YQ") < 0 && !empty) {
      // an older / manual sheet with the same name → keep it, renamed, as a backup
      sh.setName(name + " (old " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyMMdd-HHmm") + ")");
      sh = null;
    }
  }
  if (!sh) {
    sh = (pos == null) ? ss.insertSheet(name) : ss.insertSheet(name, pos);
  } else {
    if (name === YQ.YEAR || name === YQ.QM) keep[name] = yqReadKeep_(sh, name);
    sh.getCharts().forEach(function(c){ sh.removeChart(c); });
    sh.setConditionalFormatRules([]);
    var full = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
    full.breakApart();
    full.clearDataValidations();
    sh.clear();
    try { sh.showColumns(1, sh.getMaxColumns()); } catch (e) {}
    try { sh.showRows(1, sh.getMaxRows()); } catch (e) {}
    sh.setFrozenRows(0); sh.setFrozenColumns(0);
  }
  // a new tab has only 26 columns / 1000 rows — the reports need more
  if (sh.getMaxColumns() < 45) sh.insertColumnsAfter(sh.getMaxColumns(), 45 - sh.getMaxColumns());
  if (sh.getMaxRows() < 400) sh.insertRowsAfter(sh.getMaxRows(), 400 - sh.getMaxRows());
  sh.getRange(1, 1).setValue(YQ.MARK).setFontSize(7).setFontColor("#B9C3CE");
  return sh;
}

// Keep the user's current dropdown choices across a rebuild
function yqReadKeep_(sh, name) {
  var k = {};
  try {
    if (name === YQ.YEAR) {
      k.fy = sh.getRange("C6").getDisplayValue(); k.type = sh.getRange("E6").getDisplayValue();
      k.bud = yqFirstIn_([sh.getRange("K6").getDisplayValue(), sh.getRange("M6").getDisplayValue()], YQ.BUDGETS);
    } else {
      k.fy = sh.getRange("C6").getDisplayValue(); k.per = sh.getRange("D6").getDisplayValue();
      k.type = sh.getRange("E6").getDisplayValue();
      k.bud = yqFirstIn_([sh.getRange("K6").getDisplayValue(), sh.getRange("N6").getDisplayValue()], YQ.BUDGETS);
      var r = parseInt(PropertiesService.getScriptProperties().getProperty("YQ_QM_EXROW") || "0", 10);
      if (r > 0) { k.dim = sh.getRange(r, 3).getDisplayValue(); k.item = sh.getRange(r, 4).getDisplayValue(); }
    }
  } catch (e) {}
  return k;
}


/* ── Small helpers ────────────────────────────────────────────────── */
function yqQ_(name) { return "'" + String(name).replace(/'/g, "''") + "'!"; }
function yqS_(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }          // string literal
function yqST_(X, c) { return yqQ_(CONFIG.SHEET_NAME) + "$" + c + "$" + CONFIG.DATA_START_ROW + ":$" + c + "$" + X.N; }
function yqK_(X, c)  { return yqQ_(YQ.KEY) + "$" + c + "$" + CONFIG.DATA_START_ROW + ":$" + c + "$" + X.N; }
function yqEX_(c)    { return yqQ_(YQ.EXPL) + "$" + c + "$3:$" + c; }
function yqFirstIn_(vals, list) { for (var i = 0; i < vals.length; i++) if (list.indexOf(vals[i]) >= 0) return vals[i]; return ""; }
function yqPick_(v, list, dflt) { return (v && list.indexOf(v) >= 0) ? v : dflt; }

// SUMIFS on SUM TURNOVER through the _YQ_Key helper columns.
//   val: "BUD" (Budget Mani) or a _YQ_Key column letter: L/M F/A, T/U Budget by BUDGET VIEW, V Forecast, W Actual
//   s/e: formula expressions for the first / last month code (yyyymm)
//   crit: [[_YQ_Key column, criterion expression], …]
function yqSum_(X, val, s, e, crit) {
  var vr = yqK_(X, val === "BUD" ? "N" : val);          // ⭐ v5.1 — every range from _YQ_Key (same size)
  var f = "SUMIFS(" + vr + "," + yqK_(X, "X") + ",$E$6," +
          yqK_(X, "F") + ',">="&' + s + "," + yqK_(X, "F") + ',"<="&' + e;
  (crit || []).forEach(function(c){ f += "," + yqK_(X, c[0]) + "," + c[1]; });
  return f + ")/$Z$3";
}

function yqSpark_(num, den) {
  return '=IF(N(' + den + ')<=0,"",SPARKLINE(MAX(0,MIN(1,' + num + '/' + den + ')),{"charttype","bar";"max",1;"color1",IF(' +
         num + '>=' + den + ',"' + YQ.C.fillPos + '",IF(' + num + '>=0.9*' + den + ',"' + YQ.C.fillAmb + '","' + YQ.C.fillNeg + '"))}))';
}
function yqMonthCode_(i, fyCell) {            // FY month index 1..12 → yyyymm
  return "IF(" + i + "<=4,(1958+" + fyCell + ")*100+8+" + i + ",(1959+" + fyCell + ")*100+" + i + "-4)";
}
function yqMLabel_(codeCell) { return 'TEXT(DATE(INT(' + codeCell + '/100),MOD(' + codeCell + ',100),1),"mmm-yy")'; }


/* ── _YQ_Lists ────────────────────────────────────────────────────── */
function yqBuildLists_(sh, X) {
  sh.getRange("B1").setValue("Dropdown lists for OVERVIEW / SEGMENT-COUNTRY-DISTRIBUTOR — rebuilt by the menu (📊 MMH Report → Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR)");
  var col = function(r, c, arr){ if (arr.length) sh.getRange(r, c, arr.length, arr[0].length).setValues(arr); };
  sh.getRange("B4").setValue("FY");
  col(5, 2, X.fys.map(function(f){ return [f]; }));

  sh.getRange("E4:G4").setValues([["Period", "Start k", "End k"]]);
  col(5, 5, YQ.PERIODS.map(function(p){ return [p[0], p[1], p[2]]; }));

  sh.getRange("L4:N4").setValues([["Type", "Unit", "Divisor"]]);
  col(5, 12, X.types.map(function(t){ var q = t === "Jizai" || /qty|pcs/i.test(t);
    return [t, q ? "Sheets before FY" + YQ.USD_FROM_FY + " · K USD from FY" + YQ.USD_FROM_FY : "K USD", q ? "by FY" : 1000]; }));

  sh.getRange("P4:R4").setValues([["Code", "Group", "Definition"]]);
  col(5, 16, X.groups.map(function(g){ return [g.code, g.name, g.def]; }));

  sh.getRange("AF4").setValue("Budget view");                              // ⭐ v5.8
  col(5, 32, YQ.BUDGETS.map(function(m){ return [m]; }));

  sh.getRange("W3").setValue("count");
  sh.getRange("W4").setValue("View by →");
  sh.getRange(4, 24, 1, 5).setValues([YQ.DIMS]);
  var lists = [X.segs, X.ctys, X.reps,
               X.groups.filter(function(g){ return g.code !== "Other"; }).map(function(g){ return g.code + " " + g.name; }),
               X.distItems];
  lists.forEach(function(L, j){
    var c = 24 + j;
    sh.getRange(3, c).setFormula("=COUNTA(" + fxCol_(c) + "5:" + fxCol_(c) + "300)");
    if (L.length) sh.getRange(5, c, L.length, 1).setValues(L.map(function(v){ return [v]; }));
  });
  sh.getRange("AD4").setValue("Items of the view chosen in SEGMENT-COUNTRY-DISTRIBUTOR (dependent dropdown)");
  sh.getRange("A1:AF4").setFontWeight("bold");
  sh.setColumnWidths(1, 32, 110);
}
function yqFinishLists_(sh, X, q) {
  var dimCell = yqQ_(YQ.QM) + "$C$" + q.exSel;
  var colExpr = "INDEX($X$5:$AB$300,0,MATCH(" + dimCell + ",$X$4:$AB$4,0))";
  sh.getRange("AD5").setFormula("=IFERROR(FILTER(" + colExpr + "," + colExpr + "<>\"\"),\"\")");
}


/* ── _YQ_Key ──────────────────────────────────────────────────────── */
function yqBuildKey_(sh, X) {
  if (sh.getMaxRows() < X.N + 5) sh.insertRowsAfter(sh.getMaxRows(), X.N + 5 - sh.getMaxRows());
  var n = X.N, S = function(c){ return yqQ_(CONFIG.SHEET_NAME) + c + "6:" + c + n; }, R = function(c){ return c + "6:" + c + n; };
  sh.getRange("B2").setValue("Helper — one row per row of '" + CONFIG.SHEET_NAME + "' (same row numbers). Do not type here.");
  sh.getRange(4, 1, 1, 24).setValues([["Group","Dist (Country)","Explorer key","Segment","Country","Month","Country report",
    "Distributor","Type","FY","F/A (actual if entered)","F/A for OVERVIEW","F/A for SEGMENT-COUNTRY-DISTRIBUTOR","Budget Mani",
    "Closed? Type","Month","Actual sum","Closed (1 = use Actual)","Budget Distributor",
    "Budget for OVERVIEW","Budget for SEGMENT-COUNTRY-DISTRIBUTOR","Forecast","Actual","Type group"]]);
  sh.getRange("A4:X4").setFontWeight("bold").setBackground(YQ.C.head);

  var f = {};
  f.D = "=ARRAYFORMULA(TRIM(" + S(X.col.seg) + "))";
  f.E = "=ARRAYFORMULA(TRIM(" + S(X.col.phys) + "))";
  f.F = "=ARRAYFORMULA(IFERROR(VALUE(TRIM(" + S(X.col.month) + "&\"\")),\"\"))";
  f.G = "=ARRAYFORMULA(TRIM(" + S(X.col.cr) + "))";
  f.H = "=ARRAYFORMULA(TRIM(" + S(X.col.dist) + "))";
  f.I = "=ARRAYFORMULA(TRIM(" + S(X.col.type) + "))";
  f.J = "=ARRAYFORMULA(UPPER(TRIM(" + S(X.col.fy) + ")))";
  f.N = "=ARRAYFORMULA(IFERROR(" + S(X.col.bud) + "*1,0))";
  // ⭐ v5.8 — Budget Distributor, Forecast, Actual (0 when the column is missing)
  var num = function(c){ return c ? "=ARRAYFORMULA(IFERROR(" + S(c) + "*1,0))" : "=ARRAYFORMULA(" + R("N") + "*0)"; };
  f.S = num(X.col.budD);
  f.V = num(X.col.fc);
  f.W = num(X.col.act);
  // ⭐ v5.9 — Type group: Jizai › Composite › Turnover (whatever the exact Type name is)
  f.X = "=ARRAYFORMULA(IF(" + R("I") + "=\"\",\"\",IF(REGEXMATCH(" + R("I") + ",\"(?i)jizai\"),\"Jizai\",IF(REGEXMATCH(" + R("I") +
        ",\"(?i)composite\"),\"Composite\",IF(REGEXMATCH(" + R("I") + ",\"(?i)turnover\"),\"Turnover\"," + R("I") + ")))))";
  var D = R("D"), E = R("E"), VLKM = "REGEXMATCH(" + E + ",\"(?i)^(viet nam|lao|cambodia|myanmar)$\")";
  f.A = "=ARRAYFORMULA(IF(" + D + "=\"\",\"\"," +
        "IF((" + D + "=\"Surgical\")*((" + E + "=\"Thailand\")+(" + E + "=\"Myanmar\")),\"G1\"," +
        "IF(((" + D + "=\"Dental\")+(" + D + "=\"MMG\"))*(" + E + "=\"Thailand\"),\"G2\"," +
        "IF((" + D + "=\"Surgical\")*(" + E + "=\"Viet Nam\"),\"G3\"," +
        "IF((" + D + "=\"Dental\")*" + VLKM + ",\"G4\"," +
        "IF((" + D + "=\"MMG\")*" + VLKM + ",\"G5\"," +
        "IF((" + D + "=\"Eyeless\")*(" + E + "=\"Viet Nam\"),\"G6\",\"Other\"))))))))";
  f.B = "=ARRAYFORMULA(IF(" + D + "=\"\",\"\"," + R("H") + "&\" (\"&" + E + "&\")\"))";
  // closed-month table: (type, month) → Actual entered & month due
  f.O = "=IFERROR(SORT(UNIQUE(FILTER({" + R("X") + "," + R("F") + "}," + R("X") + "<>\"\"," + R("F") + "<>\"\"))),\"\")";
  if (X.split) {
    f.Q = "=ARRAYFORMULA(IF(O6:O=\"\",\"\",SUMIFS(" + S(X.col.act) + "," + R("X") + ",O6:O," + R("F") + ",P6:P)))";
    f.R = "=ARRAYFORMULA(IF(O6:O=\"\",\"\",IF((Q6:Q<>0)*((P6:P<VALUE(TEXT(TODAY(),\"yyyymm\")))+" +
          "(P6:P=VALUE(TEXT(TODAY(),\"yyyymm\")))*(DAY(TODAY())>=" + CONFIG.ACTUAL_CUTOFF_DAY + ")),1,0)))";
    f.K = "=ARRAYFORMULA(IF(" + R("F") + "=\"\",\"\",IF(IFERROR(VLOOKUP(" + R("X") + "&\"|\"&" + R("F") +
          ",{O6:O&\"|\"&P6:P,R6:R},2,FALSE),0)=1,IFERROR(" + S(X.col.act) + "*1,0),IFERROR(" + S(X.col.fc) + "*1,0))))";
  } else {
    f.K = "=ARRAYFORMULA(IFERROR(" + S(X.col.fa) + "*1,0))";
  }
  Object.keys(f).forEach(function(c){ sh.getRange(c + "6").setFormula(f[c]); });
  sh.getRange("F6:F").setNumberFormat("0");
  sh.getRange("P6:P").setNumberFormat("0");
  sh.setFrozenRows(5);
}
function yqFinishKey_(sh, X, y, q) {
  var n = X.N, R = function(c){ return c + "6:" + c + n; };
  var S = yqQ_(CONFIG.SHEET_NAME) + X.col.fa + "6:" + X.col.fa + n;
  var dim = yqQ_(YQ.QM) + "$Z$10";
  sh.getRange("C6").setFormula("=ARRAYFORMULA(IF(" + R("D") + "=\"\",\"\",IF(" + dim + "=1," + R("D") + ",IF(" + dim + "=2," + R("E") +
    ",IF(" + dim + "=3," + R("G") + ",IF(" + dim + "=4," + R("A") + "," + R("B") + "))))))");
  // ⭐ v6.0 — one fixed F/A rule (column K: Actual if entered and month due, else Forecast) for both reports
  sh.getRange("L6").setFormula("=ARRAYFORMULA(" + R("K") + ")");
  sh.getRange("M6").setFormula("=ARRAYFORMULA(" + R("K") + ")");
  // ⭐ v5.8 — Budget of each report by its BUDGET VIEW dropdown (OVERVIEW!M6, SEGMENT-COUNTRY-DISTRIBUTOR!N6)
  sh.getRange("T6").setFormula("=ARRAYFORMULA(IF(" + yqQ_(YQ.YEAR) + "$K$6=" + yqS_(YQ.BUDGETS[1]) + "," + R("S") + "," + R("N") + "))");
  sh.getRange("U6").setFormula("=ARRAYFORMULA(IF(" + yqQ_(YQ.QM) + "$K$6=" + yqS_(YQ.BUDGETS[1]) + "," + R("S") + "," + R("N") + "))");
}


/* ── Shared styling helpers ───────────────────────────────────────── */
function yqStyleTitle_(sh, title) {
  sh.setHiddenGridlines(true);
  sh.getRange("B2").setValue(title).setFontSize(18).setFontWeight("bold").setFontColor(YQ.C.title);
  sh.getRange("B3").setFontSize(11).setFontColor(YQ.C.sub);
  sh.setRowHeight(2, 32);
}
function yqStyleSelect_(rg) {
  rg.setBackground(YQ.C.input).setFontWeight("bold").setFontSize(12).setFontColor(YQ.C.title)
    .setHorizontalAlignment("left").setVerticalAlignment("middle")
    .setBorder(null, null, true, null, null, null, YQ.C.inputLine, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}
function yqStyleLabel_(rg) { rg.setFontSize(9).setFontWeight("bold").setFontColor(YQ.C.label); }
function yqValidate_(rg, srcRange, allowInvalid) {
  rg.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(srcRange, true)
    .setAllowInvalid(!!allowInvalid).setHelpText("Pick a value from the list").build());
}
function yqSection_(sh, r, num, title, lastCol) {
  sh.getRange(r, 2).setValue(num).setBackground(YQ.C.band).setFontColor(YQ.C.white)
    .setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center");
  sh.getRange(r, 3).setValue(title).setFontSize(13).setFontWeight("bold").setFontColor(YQ.C.title);
  sh.getRange(r, 2, 1, lastCol - 1).setBorder(null, null, true, null, null, null, YQ.C.band, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(r, 26);
}
function yqHead_(sh, r, c1, values) {
  var rg = sh.getRange(r, c1, 1, values.length);
  rg.setValues([values]).setBackground(YQ.C.head).setFontColor(YQ.C.title).setFontWeight("bold").setFontSize(10)
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true)
    .setBorder(true, null, true, null, null, null, YQ.C.band, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(r, 34);
  return rg;
}
function yqRowStyle_(sh, r, c1, w, kind) {
  var rg = sh.getRange(r, c1, 1, w);
  rg.setBorder(null, null, true, null, null, null, YQ.C.line, SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment("top").setFontColor(YQ.C.text).setFontSize(10.5);
  if (kind === "total") rg.setBackground(YQ.C.head).setFontWeight("bold").setFontSize(12).setFontColor(YQ.C.title);
  else if (kind === "sub") rg.setBackground(YQ.C.head).setFontWeight("bold").setFontSize(11).setFontColor(YQ.C.title);
  else if (kind === "sum") rg.setBackground(YQ.C.total).setFontWeight("bold").setFontColor(YQ.C.title);
  return rg;
}
function yqNote_(sh, r, c, text) {
  sh.getRange(r, c).setValue(text).setFontSize(9).setFontColor(YQ.C.note).setFontStyle("italic");
}
function yqCheckStyle_(rg) { rg.setFontSize(9.5).setFontColor(YQ.C.note).setFontStyle("italic"); }
function yqLinks_(sh, r, gid, items) {
  sh.getRange(r, 3).setValue("Go to:").setFontSize(9).setFontWeight("bold").setFontColor(YQ.C.label).setHorizontalAlignment("right");
  items.forEach(function(it, j){
    sh.getRange(r, 4 + j).setFormula('=HYPERLINK("#gid=' + gid + '&range=B' + it[1] + '","' + it[0] + '")')
      .setFontSize(9.5).setFontColor(YQ.C.link);
  });
}
function yqSignRules_(sh, a1s) {
  var rules = sh.getConditionalFormatRules();
  a1s.forEach(function(a1){
    var rg = sh.getRange(a1), tl = a1.split(":")[0].replace(/\$/g, "");
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=AND(ISNUMBER(" + tl + ")," + tl + "<0)")
      .setFontColor(YQ.C.neg).setRanges([rg]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=AND(ISNUMBER(" + tl + ")," + tl + ">0)")
      .setFontColor(YQ.C.pos).setRanges([rg]).build());
  });
  sh.setConditionalFormatRules(rules);
}
function yqAddRule_(sh, a1, formula, bg) {
  var rules = sh.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(bg)
    .setRanges([sh.getRange(a1)]).build());
  sh.setConditionalFormatRules(rules);
}
function yqKpi_(sh, r, c, span, label, valueF, fmt, subF) {
  var l = sh.getRange(r, c, 1, span), v = sh.getRange(r + 1, c, 1, span), s = sh.getRange(r + 2, c, 1, span);
  if (span > 1) { l.merge(); v.merge(); s.merge(); }
  l.setValue(label).setFontSize(8.5).setFontWeight("bold").setFontColor(YQ.C.label).setBackground(YQ.C.kpi)
   .setHorizontalAlignment("center").setVerticalAlignment("bottom");
  v.setFormula(valueF).setNumberFormat(fmt).setFontSize(17).setFontWeight("bold").setFontColor(YQ.C.title)
   .setBackground(YQ.C.kpi).setHorizontalAlignment("center").setVerticalAlignment("middle");
  s.setFormula(subF || '=""').setFontSize(9).setFontColor(YQ.C.note).setBackground(YQ.C.kpi)
   .setHorizontalAlignment("center").setVerticalAlignment("top");
  sh.getRange(r, c, 3, span).setBorder(true, true, true, true, null, null, YQ.C.line, SpreadsheetApp.BorderStyle.SOLID);
}
// sign colour of a text cell (sub-line of a card) taken from the number above it
function yqSignRef_(sh, a1, ref) {
  var rules = sh.getConditionalFormatRules(), rg = sh.getRange(a1);
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=AND(ISNUMBER(" + ref + ")," + ref + "<0)").setFontColor(YQ.C.neg).setRanges([rg]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=AND(ISNUMBER(" + ref + ")," + ref + ">0)").setFontColor(YQ.C.pos).setRanges([rg]).build());
  sh.setConditionalFormatRules(rules);
}
// ⭐ v5.8 — frame around the SINGLE (D:L) and CUMULATIVE (N:V) halves of rows r1..r2 (9 columns each)
function yqBoxes_(sh, r1, r2) {
  if (r2 < r1) return;
  sh.getRange(r1, 4, r2 - r1 + 1, 9).setBorder(true, true, true, true, null, null, YQ.C.boxS, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange(r1, 14, r2 - r1 + 1, 9).setBorder(true, true, true, true, null, null, YQ.C.boxC, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}
function yqWidths_(sh, map) { Object.keys(map).forEach(function(k){ sh.setColumnWidth(map[k][0], map[k][1]); }); }


/* ════════════════════════════════════════════════════════════════════
   OVERVIEW (fiscal year)
   ⭐ v5.8 — columns: B # · C label · D Budget (Mani or Distributor, cell K6) · E Forecast ·
             F Actual · G Forecast/Actual · H Vs. Budget +/- · I Vs. Budget % · J LY ·
             K YoY +/- · L YoY % · M Achievement · N spacer · O definition. No charts.
   ════════════════════════════════════════════════════════════════════ */
function yqBuildYear_(sh, X) {
  var K = X.keep[YQ.YEAR] || {}, C = YQ.C, LST = yqQ_(YQ.LISTS), LS = X.ss.getSheetByName(YQ.LISTS);
  var LAST = 15;                                   // last visible column (O)
  var FA = "L", BUD = "T";                         // _YQ_Key: F/A and Budget (by BUDGET BASIS) of this sheet
  if (sh.getMaxColumns() < 40) sh.insertColumnsAfter(sh.getMaxColumns(), 40 - sh.getMaxColumns());
  yqWidths_(sh, { A:[1,14], B:[2,46], C:[3,250], D:[4,104], E:[5,100], F:[6,100], G:[7,112], H:[8,100], I:[9,86],
                  J:[10,104], K:[11,100], L:[12,86], M:[13,140], N:[14,12], O:[15,300] });
  yqStyleTitle_(sh, "MMH TURNOVER  ·  OVERVIEW  ·  FISCAL YEAR");

  // ── parameters (hidden columns Y:Z) ──
  var P = [
    ["FY no.",            '=IFERROR(VALUE(REGEXEXTRACT($C$6,"\\d+")),0)'],
    ["divisor",           "=" + yqDivX_("$Z$2")],
    ["FY start",          "=(1958+$Z$2)*100+9"],
    ["FY end",            "=(1959+$Z$2)*100+8"],
    ["TH report",         "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$C$6," + yqK_(X,"X") + "=\"Turnover\",ISNUMBER(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),\"Thailand\")"],
    ["VN report",         "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$C$6," + yqK_(X,"X") + "=\"Turnover\"," + yqK_(X,"G") + "<>\"\",ISERROR(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),\"Viet Nam and others\")"],
    ["LY TH report",      "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$G$6," + yqK_(X,"X") + "=\"Turnover\",ISNUMBER(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),$Z$6)"],
    ["LY VN report",      "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$G$6," + yqK_(X,"X") + "=\"Turnover\"," + yqK_(X,"G") + "<>\"\",ISERROR(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),$Z$7)"],
    ["(unused)",          '=""'],
    ["is turnover",       '=$E$6="Turnover"'],
    ["this month",        '=VALUE(TEXT(TODAY(),"yyyymm"))'],
    ["last due month",    '=IF(DAY(TODAY())>=' + CONFIG.ACTUAL_CUTOFF_DAY + ',$Z$12,VALUE(TEXT(EDATE(TODAY(),-1),"yyyymm")))'],
    ["YTD end",           "=MIN($Z$5,$Z$13)"],
    ["months due",        "=IF($Z$14<$Z$4,0,(INT($Z$14/100)-INT($Z$4/100))*12+MOD($Z$14,100)-MOD($Z$4,100)+1)"],
    ["YTD budget",        "=IF($Z$15=0,0," + yqSum_(X, BUD, "$Z$4", "$Z$14", []) + ")"],
    ["YTD F/A",           "=IF($Z$15=0,0," + yqSum_(X, FA, "$Z$4", "$Z$14", []) + ")"],
    ["LY comparable",     "=" + yqDivX_("($Z$2-1)") + "=$Z$3"]          // Z18 — ⭐ v5.9 same unit as LY?
  ];
  P.forEach(function(p, i){ sh.getRange(2 + i, 25).setValue(p[0]); sh.getRange(2 + i, 26).setFormula(p[1]); });

  // ── selectors (row 5 labels, row 6 cream cells) ──
  sh.getRange("C5").setValue("FISCAL YEAR (FY)  ▾"); sh.getRange("E5").setValue("DATA TYPE  ▾");
  sh.getRange("G5").setValue("COMPARED WITH (LY)"); sh.getRange("I5").setValue("UNIT");
  sh.getRange("K5").setValue("BUDGET VIEW  ▾");                // ⭐ v6.0 — F/A SOURCE dropdown removed (fixed rule)
  yqStyleLabel_(sh.getRange("C5:L5"));
  sh.getRange("C6").setValue(yqPick_(K.fy, X.fys, X.defaultFy));
  sh.getRange("E6:F6").merge(); sh.getRange("E6").setValue(yqPick_(K.type, X.types, X.defaultType));
  sh.getRange("K6:L6").merge(); sh.getRange("K6").setValue(yqPick_(K.bud, YQ.BUDGETS, YQ.BUDGETS[0]));
  [sh.getRange("C6"), sh.getRange("E6:F6"), sh.getRange("K6:L6")].forEach(yqStyleSelect_);
  yqValidate_(sh.getRange("C6"), LS.getRange("B5:B" + (4 + X.fys.length)));
  yqValidate_(sh.getRange("E6"), LS.getRange("L5:L" + (4 + X.types.length)));
  yqValidate_(sh.getRange("K6"), LS.getRange("AF5:AF6"));
  sh.getRange("G6").setFormula('="FY"&($Z$2-1)');
  sh.getRange("I6").setFormula('=IF($Z$3=1,"Sheets","K USD")');
  sh.getRange("G6:I6").setFontWeight("bold").setFontSize(12).setFontColor(C.sub);
  sh.setRowHeight(6, 26);
  sh.getRange("B3").setFormula('="Reporting period: "&$C$6&"  ("&' + yqMLabel_("$Z$4") + '&" → "&' + yqMLabel_("$Z$5") +
    '&")   ·   Unit: "&$I$6&"   ·   Type: "&$E$6&"   ·   Budget: "&$K$6&"   ·   Compared with: "&$G$6');
  yqNote_(sh, 7, 2, "▸ Cream cells are dropdowns. BUDGET VIEW switches every Budget figure between Budget Mani and Budget Distributor. " +
    "Every number is a live SUMIFS on '" + CONFIG.SHEET_NAME + "'.");

  var r = 14, rows = {};
  // header labels that follow the dropdowns: Budget (D) and LY (J)
  var fixHead = function(rr){ sh.getRange(rr, 4).setFormula("=$K$6"); sh.getRange(rr, 10).setFormula('="LY "&$G$6'); };
  var cellsOf = function(rr, s, e, crit, ly){
    return ["=" + yqSum_(X, BUD, s, e, crit), "=" + yqSum_(X, "V", s, e, crit), "=" + yqSum_(X, "W", s, e, crit),
      "=" + yqSum_(X, FA, s, e, crit),
      "=G" + rr + "-D" + rr, '=IF(D' + rr + '=0,"",H' + rr + '/D' + rr + ')',
      "=IF($Z$18," + yqSum_(X, FA, "(" + s + "-100)", "(" + e + "-100)", ly || crit) + ",0)",
      '=IF($Z$18,G' + rr + '-J' + rr + ',"")', '=IF(N(J' + rr + ')=0,"",K' + rr + '/J' + rr + ')',
      yqSpark_("G" + rr, "D" + rr)];
  };

  // ═ 1.1 TOTAL ═
  rows.s11 = r;
  yqSection_(sh, r, "1.1", "TOTAL  ·  MMH turnover  (Year → Quarter → Month)", LAST); r++;
  yqHead_(sh, r, 2, ["#", "Period", "Budget", "Forecast", "Actual", "Forecast / Actual", "Vs. Budget +/-", "Vs. Budget %",
                     "LY", "YoY +/-", "YoY %", "Achievement"]);
  fixHead(r);
  var hdr11 = r; r++;
  var qRows = [];
  var line = function(rr, label, s, e, kind, num){
    sh.getRange(rr, 2, 1, 12).setValues([[num, label].concat(cellsOf(rr, s, e, [], null))]);
    yqRowStyle_(sh, rr, 2, 12, kind);
  };
  sh.getRange(r, 23).setFormula("=$Z$4"); sh.getRange(r, 24).setFormula("=$Z$5");
  line(r, '="MMH TOTAL  "&$C$6', "$W$" + r, "$X$" + r, "total", "Σ"); var fyRow = r; r++;
  for (var q = 0; q < 4; q++) {
    var m1 = q * 3 + 1, m3 = q * 3 + 3;
    sh.getRange(r, 23).setFormula("=" + yqMonthCode_(m1, "$Z$2")); sh.getRange(r, 24).setFormula("=" + yqMonthCode_(m3, "$Z$2"));
    line(r, '="Quarter ' + (q + 1) + '   ("&' + yqMLabel_("W" + r) + '&" → "&' + yqMLabel_("X" + r) + '&")"',
         "$W$" + r, "$X$" + r, "sub", "Q" + (q + 1));
    qRows.push(r); r++;
    for (var m = m1; m <= m3; m++) {
      sh.getRange(r, 23).setFormula("=" + yqMonthCode_(m, "$Z$2")); sh.getRange(r, 24).setFormula("=W" + r);
      line(r, "=" + yqMLabel_("W" + r), "$W$" + r, "$X$" + r, "", "");
      r++;
    }
  }
  var end11 = r - 1;
  sh.getRange(r, 3).setFormula('=IF(ABS(' + qRows.map(function(x){ return "G" + x; }).join("+") + '-G' + fyRow + ')+ABS(' +
    qRows.map(function(x){ return "D" + x; }).join("+") + '-D' + fyRow + ')<0.001,"✓ The 4 quarters add up to the full-year total","⚠ The quarters do not add up to the full-year total")');
  yqCheckStyle_(sh.getRange(r, 3)); r += 2;

  // ═ 1.2 SEGMENT ═
  var head12 = ["#", "", "Budget", "Forecast", "Actual", "Forecast / Actual", "Vs. Budget +/-", "Vs. Budget %", "LY", "YoY +/-", "YoY %",
                "Achievement", "", ""];
  var numRow = function(rr, num, label, crit, lyCrit, kind, def){
    sh.getRange(rr, 2, 1, 14).setValues([[num, label].concat(cellsOf(rr, "$Z$4", "$Z$5", crit, lyCrit), ["", def || ""])]);
    yqRowStyle_(sh, rr, 2, 12, kind);
  };
  var sumVals = function(rr, label, fn){        // fn(col) → formula of a summed column
    return [label, fn("D"), fn("E"), fn("F"), fn("G"), "=G" + rr + "-D" + rr, '=IF(D' + rr + '=0,"",H' + rr + '/D' + rr + ')',
            fn("J"), '=IF($Z$18,G' + rr + '-J' + rr + ',"")', '=IF(N(J' + rr + ')=0,"",K' + rr + '/J' + rr + ')'];
  };
  var sumRow = function(rr, label, from, to){
    sh.getRange(rr, 3, 1, 10).setValues([sumVals(rr, label, function(c){ return "=SUM(" + c + from + ":" + c + to + ")"; })]);
    sh.getRange(rr, 13).setFormula(yqSpark_("G" + rr, "D" + rr));
    yqRowStyle_(sh, rr, 2, 12, "sum");
  };
  var check = function(rr, t, okTxt, badTxt){
    sh.getRange(rr, 3).setFormula('=IF(ABS(D' + t + '-D' + fyRow + ')+ABS(G' + t + '-G' + fyRow + ')+ABS(J' + t + '-J' + fyRow +
      ')<0.001,"' + okTxt + '","' + badTxt + '"&TEXT(G' + fyRow + '-G' + t + ',"#,##0.0"))');
    yqCheckStyle_(sh.getRange(rr, 3));
  };

  rows.s12 = r;
  yqSection_(sh, r, "1.2", "BY SEGMENT  ·  Segment Report", LAST); r++;
  head12[1] = "Segment"; yqHead_(sh, r, 2, head12.slice(0, 12)); fixHead(r); r++;
  var s12a = r;
  X.segs.forEach(function(sg, i){ numRow(r, i + 1, sg, [["D", yqS_(sg)]], null, "", ""); r++; });
  sumRow(r, "Segment total", s12a, r - 1); var t12 = r; r++;
  check(r, t12, "✓ Matches 1.1 Total", "⚠ Differs from 1.1 Total by "); r += 2;

  // ═ 1.3 GROUPS ═
  rows.s13 = r;
  yqSection_(sh, r, "1.3", "BY SEGMENT × COUNTRY  ·  6 regional groups", LAST); r++;
  head12[1] = "Segment × Country group"; var h13 = head12.slice(0, 14); h13[13] = "Group definition";
  yqHead_(sh, r, 2, h13); fixHead(r);
  sh.getRange(r, 14).setBackground(null).setBorder(false, false, false, false, false, false); r++;
  var s13a = r;
  X.groups.forEach(function(G){
    numRow(r, G.code, G.name, [["A", yqS_(G.code)]], null, "", G.def);
    sh.getRange(r, 15).setFontSize(9.5).setFontColor(C.note); r++;
  });
  sumRow(r, "Total of the groups", s13a, r - 1); var t13 = r; r++;
  check(r, t13, "✓ Matches 1.1 Total", "⚠ Data outside the groups: "); r++;
  yqNote_(sh, r, 3, "Country codes: TH = Thailand · MM = Myanmar · VN = Viet Nam · LA = Lao · KH = Cambodia"); r += 2;

  // ═ 1.4 DISTRIBUTORS ═
  rows.s14 = r;
  yqSection_(sh, r, "1.4", "BY SEGMENT × COUNTRY × DISTRIBUTOR", LAST); r++;
  head12[1] = "Group / Distributor (Country)"; var h14 = head12.slice(0, 14); h14[13] = "Distributor name (Mani)";
  yqHead_(sh, r, 2, h14); fixHead(r);
  sh.getRange(r, 14).setBackground(null).setBorder(false, false, false, false, false, false); r++;
  var distRows = [];
  X.groups.forEach(function(G){
    numRow(r, G.code, G.name, [["A", yqS_(G.code)]], null, "sub", G.def);
    sh.getRange(r, 15).setFontSize(9.5).setFontColor(C.note); r++;
    (X.distByGroup[G.code] || []).forEach(function(d){
      numRow(r, "", "     " + d.dist + "  (" + d.cty + ")", [["A", yqS_(G.code)], ["H", yqS_(d.dist)], ["E", yqS_(d.cty)]], null, "", d.mani);
      sh.getRange(r, 15).setFontSize(9.5).setFontColor(C.note);
      distRows.push(r); r++;
    });
  });
  var dsum = distRows.length ? distRows.map(function(x){ return "G" + x; }).join("+") : "0";
  sh.getRange(r, 3).setFormula('=IF(ABS(' + dsum + '-G' + fyRow + ')<0.001,"✓ Distributors add up to 1.1 Total",' +
    '"⚠ A distributor is not listed in 1.4 — run 📊 MMH Report → Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR again · difference: "&TEXT(G' + fyRow + '-(' + dsum + '),"#,##0.0"))');
  yqCheckStyle_(sh.getRange(r, 3)); r += 2;

  // ═ 1.5 COUNTRY REPORT × SEGMENT ═
  rows.s15 = r;
  yqSection_(sh, r, "1.5", "BY COUNTRY REPORT × SEGMENT", LAST); r++;
  head12[1] = "Country report / Segment"; yqHead_(sh, r, 2, head12.slice(0, 12)); fixHead(r); r++;
  var repTotals = [];
  [["$Z$6", "$Z$8"], ["$Z$7", "$Z$9"]].forEach(function(pair, j){
    numRow(r, j === 0 ? "TH" : "VN", "=" + pair[0], [["G", pair[0]]], [["G", pair[1]]], "sub", "");
    repTotals.push(r); r++;
    X.segs.forEach(function(sg){
      numRow(r, "", "     " + sg, [["G", pair[0]], ["D", yqS_(sg)]], [["G", pair[1]], ["D", yqS_(sg)]], "", "");
      r++;
    });
  });
  sh.getRange(r, 3, 1, 10).setValues([sumVals(r, "Total of the Country reports",
    function(c){ return "=" + repTotals.map(function(x){ return c + x; }).join("+"); })]);
  sh.getRange(r, 13).setFormula(yqSpark_("G" + r, "D" + r));
  yqRowStyle_(sh, r, 2, 12, "sum"); var t15 = r; r++;
  sh.getRange(r, 3).setFormula('=IF(ABS(G' + t15 + '-G' + fyRow + ')<0.001,"✓ Matches 1.1 Total","⚠ Rows with another Country report: "&TEXT(G' +
    fyRow + '-G' + t15 + ',"#,##0.0"))');
  yqCheckStyle_(sh.getRange(r, 3)); r++;
  yqNote_(sh, r, 3, "LY of a Country report uses the name that Country report had last year (e.g. Thailand ↔ Thailand/Myanmar)."); r += 2;

  yqNote_(sh, r, 2, "Notes: Budget = Budget Mani or Budget Distributor (cell K6) · Forecast = column Forecast USD · Actual = column Actual USD · " +
    "Forecast / Actual = Actual for closed months (Actual entered, month due), Forecast for the others · Vs. Budget % = (Forecast/Actual − Budget) ÷ Budget · " +
    "YoY % = (Forecast/Actual − LY) ÷ LY · Achievement bar = Forecast/Actual ÷ Budget (green ≥ 100%, amber ≥ 90%).");
  var lastRow = r;

  // ── KPI strip (rows 10-12) ──
  yqKpi_(sh, 10, 3, 1, '=UPPER("FY "&$K$6)', "=D" + fyRow, YQ.NUM, '="Full year "&$C$6');
  yqKpi_(sh, 10, 4, 2, "FORECAST / ACTUAL", "=G" + fyRow, YQ.NUM, '="Actual + Forecast  ·  "&$C$6');
  yqKpi_(sh, 10, 6, 2, "GAP vs BUDGET  ·  FY", "=I" + fyRow, YQ.PCT, '=IF(D' + fyRow + '=0,"",TEXT(H' + fyRow + ',"+#,##0.0;-#,##0.0;0")&"  "&$I$6)');
  yqKpi_(sh, 10, 8, 2, "GAP vs BUDGET  ·  DUE MONTHS", '=IF(N($Z$16)=0,"",($Z$17-$Z$16)/$Z$16)', YQ.PCT,
    '=IF($Z$15=0,"No month due yet",TEXT($Z$17-$Z$16,"+#,##0.0;-#,##0.0;0")&"  ·  "&$Z$15&"/12 months due")');
  yqKpi_(sh, 10, 10, 2, "YoY  vs  LY", "=L" + fyRow, YQ.PCT, '=IF($Z$18,"LY "&$G$6&": "&TEXT(J' + fyRow + ',"#,##0.0"),"LY "&$G$6&" in sheets · not comparable")');
  yqKpi_(sh, 10, 12, 2, "TIME ELAPSED IN THE FY", "=$Z$15/12", YQ.ACH,
    '=SPARKLINE($Z$15,{"charttype","bar";"max",12;"color1","' + C.band + '"})');
  sh.setRowHeight(11, 30);

  // ── number formats + conditional formats ──
  sh.getRange("D" + hdr11 + ":H" + lastRow).setNumberFormat(YQ.NUM);
  sh.getRange("J" + hdr11 + ":K" + lastRow).setNumberFormat(YQ.NUM);
  sh.getRange("I" + hdr11 + ":I" + lastRow).setNumberFormat(YQ.PCT);
  sh.getRange("L" + hdr11 + ":L" + lastRow).setNumberFormat(YQ.PCT);
  sh.getRange("D" + hdr11 + ":L" + lastRow).setHorizontalAlignment("right");
  sh.getRange("B" + hdr11 + ":B" + lastRow).setHorizontalAlignment("center").setFontColor(C.band).setFontWeight("bold");
  yqSignRules_(sh, ["H" + (hdr11 + 1) + ":I" + lastRow, "K" + (hdr11 + 1) + ":L" + lastRow, "F11:G11", "H11:I11", "J11:K11"]);
  yqSignRef_(sh, "F12:G12", "$F$11"); yqSignRef_(sh, "H12:I12", "$H$11");
  yqAddRule_(sh, "B" + (hdr11 + 1) + ":M" + end11, "=AND($W" + (hdr11 + 1) + "=$X" + (hdr11 + 1) + ",$W" + (hdr11 + 1) + "=$Z$14)", C.hilite);

  // ── links ──
  yqLinks_(sh, 8, sh.getSheetId(), [["1.1 Total", rows.s11], ["1.2 Segment", rows.s12], ["1.3 Groups", rows.s13],
                                    ["1.4 Distributors", rows.s14], ["1.5 Country report", rows.s15]]);

  sh.hideColumns(23, 18);                          // W:AN helpers (row codes W:X, parameters Y:Z)
  return { fyRow:fyRow };
}


/* ════════════════════════════════════════════════════════════════════
   SEGMENT-COUNTRY-DISTRIBUTOR (quarter / month)
   ⭐ v5.8 — SINGLE block D:L and CUMULATIVE block N:V, each:
             Budget (by BUDGET VIEW, cell K6) · Forecast · Actual · Forecast/Actual ·
             Vs. Budget +/- · Vs. Budget % · LY · YoY +/- · YoY %.  M / W separators,
             X definition. Budget cards for SINGLE and YTD. No charts.
   ════════════════════════════════════════════════════════════════════ */
function yqBuildQM_(sh, X) {
  var K = X.keep[YQ.QM] || {}, C = YQ.C, LST = yqQ_(YQ.LISTS), LS = X.ss.getSheetByName(YQ.LISTS);
  var LAST = 24, FA = "M", BUD = "U";
  if (sh.getMaxColumns() < 42) sh.insertColumnsAfter(sh.getMaxColumns(), 42 - sh.getMaxColumns());
  yqWidths_(sh, { A:[1,14], B:[2,46], C:[3,240], D:[4,96], E:[5,92], F:[6,92], G:[7,104], H:[8,92], I:[9,84], J:[10,96], K:[11,92], L:[12,78],
                  M:[13,14], N:[14,96], O:[15,92], P:[16,92], Q:[17,104], R:[18,92], S:[19,84], T:[20,96], U:[21,92], V:[22,78],
                  W:[23,14], X:[24,280] });
  // NB: X is the visible "definition" column; parameters live in hidden Y:Z, row codes in hidden AO:AP
  yqStyleTitle_(sh, "MMH TURNOVER  ·  SEGMENT · COUNTRY · DISTRIBUTOR  (quarter / month)");

  var curMonIdx = (function(){ var k = todayKeyDay_().key; var i = parseInt(k.slice(4, 6), 10); return (i + 3) % 12 + 1; })();
  var defPer = YQ.PERIODS[3 + curMonIdx][0];
  // params Y:Z rows 2..20
  var P = [
    ["FY no.",        '=IFERROR(VALUE(REGEXEXTRACT($C$6,"\\d+")),0)'],
    ["divisor",       "=" + yqDivX_("$Z$2")],
    ["start k",       "=IFERROR(INDEX(" + LST + "$F$5:$F$20,MATCH($D$6," + LST + "$E$5:$E$20,0)),1)"],
    ["end k",         "=IFERROR(INDEX(" + LST + "$G$5:$G$20,MATCH($D$6," + LST + "$E$5:$E$20,0)),1)"],
    ["start code",    "=" + yqMonthCode_("$Z$4", "$Z$2")],
    ["end code",      "=" + yqMonthCode_("$Z$5", "$Z$2")],
    ["FY start",      "=(1958+$Z$2)*100+9"],
    ["explorer crit", ""],                                   // Z9 — written with the explorer
    ["dim idx",       ""],                                   // Z10
    ["TH report",     "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$C$6," + yqK_(X,"X") + "=\"Turnover\",ISNUMBER(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),\"Thailand\")"],
    ["VN report",     "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$C$6," + yqK_(X,"X") + "=\"Turnover\"," + yqK_(X,"G") + "<>\"\",ISERROR(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),\"Viet Nam and others\")"],
    ["LY TH report",  "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$G$6," + yqK_(X,"X") + "=\"Turnover\",ISNUMBER(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),$Z$11)"],
    ["LY VN report",  "=IFERROR(INDEX(FILTER(" + yqK_(X,"G") + "," + yqK_(X,"J") + "=$G$6," + yqK_(X,"X") + "=\"Turnover\"," + yqK_(X,"G") + "<>\"\",ISERROR(SEARCH(\"thai\"," + yqK_(X,"G") + "))),1),$Z$12)"],
    ["expl time single", '=IF($Z$4=$Z$5,TEXT($Z$6,"0"),LEFT($D$6,2))'],
    ["expl time cumul.", '=TEXT($Z$7,"0")'],
    ["is turnover",      '=$E$6="Turnover"'],
    ["explorer LY crit", ""],                                // Z18
    ["FY end",           "=(1959+$Z$2)*100+8"],
    ["FY budget",        "=" + yqSum_(X, BUD, "$Z$8", "$Z$19", [])],
    ["LY comparable",    "=" + yqDivX_("($Z$2-1)") + "=$Z$3"]           // Z21 — ⭐ v5.9 same unit as LY?
  ];
  P.forEach(function(p, i){ sh.getRange(2 + i, 25).setValue(p[0]); if (p[1]) sh.getRange(2 + i, 26).setFormula(p[1]); });

  // selectors
  sh.getRange("C5").setValue("FISCAL YEAR (FY)  ▾"); sh.getRange("D5").setValue("PERIOD: MONTH / QUARTER  ▾");
  sh.getRange("E5").setValue("DATA TYPE  ▾"); sh.getRange("G5").setValue("COMPARED WITH (LY)");
  sh.getRange("I5").setValue("UNIT"); sh.getRange("K5").setValue("BUDGET VIEW  ▾");   // ⭐ v6.0 — F/A SOURCE removed
  yqStyleLabel_(sh.getRange("C5:L5"));
  sh.getRange("C6").setValue(yqPick_(K.fy, X.fys, X.defaultFy));
  sh.getRange("D6").setValue(yqPick_(K.per, YQ.PERIODS.map(function(p){ return p[0]; }), defPer));
  sh.getRange("E6:F6").merge(); sh.getRange("E6").setValue(yqPick_(K.type, X.types, X.defaultType));
  sh.getRange("K6:L6").merge(); sh.getRange("K6").setValue(yqPick_(K.bud, YQ.BUDGETS, YQ.BUDGETS[0]));
  [sh.getRange("C6"), sh.getRange("D6"), sh.getRange("E6:F6"), sh.getRange("K6:L6")].forEach(yqStyleSelect_);
  yqValidate_(sh.getRange("C6"), LS.getRange("B5:B" + (4 + X.fys.length)));
  yqValidate_(sh.getRange("D6"), LS.getRange("E5:E20"));
  yqValidate_(sh.getRange("E6"), LS.getRange("L5:L" + (4 + X.types.length)));
  yqValidate_(sh.getRange("K6"), LS.getRange("AF5:AF6"));
  sh.getRange("G6").setFormula('="FY"&($Z$2-1)');
  sh.getRange("I6").setFormula('=IF($Z$3=1,"Sheets","K USD")');
  sh.getRange("G6:I6").setFontWeight("bold").setFontSize(12).setFontColor(C.sub);
  sh.setRowHeight(6, 26);
  sh.getRange("B3").setFormula('="Reporting period: "&$C$6&" · "&$D$6&"   ·   Unit: "&$I$6&"   ·   Type: "&$E$6&"   ·   Budget: "&$K$6&"   ·   Compared with: "&$G$6');
  yqNote_(sh, 7, 2, "▸ Cream cells are dropdowns. SINGLE = the chosen quarter / month only · CUMULATIVE = from the FY start (Sep) to the end of the chosen period · " +
    "BUDGET VIEW switches every Budget figure between Budget Mani and Budget Distributor. Numbers are live SUMIFS on '" + CONFIG.SHEET_NAME + "'.");

  var singleLbl = '=IF($Z$4=$Z$5,"SINGLE MONTH  ·  "&' + yqMLabel_("$Z$6") + ',"SINGLE QUARTER  ·  "&LEFT($D$6,2)&" "&$C$6&"  ("&' +
                  yqMLabel_("$Z$6") + '&" → "&' + yqMLabel_("$Z$7") + '&")")';
  var cumLbl = '="CUMULATIVE (from FY start)  ·  "&' + yqMLabel_("$Z$8") + '&" → "&' + yqMLabel_("$Z$7");
  var band = function(rr, fS, vC){                // band labels over the two halves
    sh.getRange(rr, 4, 1, 9).merge(); sh.getRange(rr, 14, 1, 9).merge();
    if (fS) sh.getRange(rr, 4).setFormula(fS);
    if (vC && vC.charAt(0) === "=") sh.getRange(rr, 14).setFormula(vC); else sh.getRange(rr, 14).setValue(vC);
    sh.getRange(rr, 4).setBackground(C.bandS).setFontColor(C.title).setFontWeight("bold").setHorizontalAlignment("center");
    sh.getRange(rr, 14).setBackground(C.bandC).setFontColor(C.title).setFontWeight("bold").setHorizontalAlignment("center");
  };
  var blockHead = function(rr){ band(rr, singleLbl, cumLbl); };
  var HALF = ["Budget", "Forecast", "Actual", "Forecast / Actual", "Vs. Budget +/-", "Vs. Budget %", "LY (same period)", "YoY +/-", "YoY %"];
  var colHead = function(rr, first, lastLabel){
    var v = ["#", first].concat(HALF, [""], HALF);
    if (lastLabel) { v.push(""); v.push(lastLabel); }
    yqHead_(sh, rr, 2, v);
    sh.getRange(rr, 4).setFormula("=$K$6"); sh.getRange(rr, 14).setFormula("=$K$6");
    [13, 23].forEach(function(c){ sh.getRange(rr, c).setBackground(null).setBorder(false, false, false, false, false, false); });
  };
  // one half: Budget, Forecast, Actual, F/A, +/-, %, LY, YoY +/-, YoY %   (c = first column letter index 0 → D, 10 → N)
  var half = function(rr, s, e, crit, ly, L){   // L = 9 column letters of the half
    return ["=" + yqSum_(X, BUD, s, e, crit), "=" + yqSum_(X, "V", s, e, crit), "=" + yqSum_(X, "W", s, e, crit),
      "=" + yqSum_(X, FA, s, e, crit),
      "=" + L[3] + rr + "-" + L[0] + rr, '=IF(' + L[0] + rr + '=0,"",' + L[4] + rr + '/' + L[0] + rr + ')',
      "=IF($Z$21," + yqSum_(X, FA, "(" + s + "-100)", "(" + e + "-100)", ly) + ",0)",
      '=IF($Z$21,' + L[3] + rr + "-" + L[6] + rr + ',"")', '=IF(N(' + L[6] + rr + ')=0,"",' + L[7] + rr + '/' + L[6] + rr + ')'];
  };
  var LS1 = ["D","E","F","G","H","I","J","K","L"], LC1 = ["N","O","P","Q","R","S","T","U","V"];
  // one data row: single (D..L) + cumulative (N..V) + definition (X)
  var dataRow = function(rr, num, label, crit, lyCrit, kind, def, per){
    per = per || { s:"$Z$6", e:"$Z$7", cs:"$Z$8", ce:"$Z$7" };
    var ly = lyCrit || crit;
    var v = [num, label].concat(half(rr, per.s, per.e, crit, ly, LS1), [""], half(rr, per.cs, per.ce, crit, ly, LC1), ["", def || ""]);
    sh.getRange(rr, 2, 1, v.length).setValues([v]);
    yqRowStyle_(sh, rr, 2, 21, kind);
  };
  var sumHalf = function(rr, L, fn){
    return [fn(L[0]), fn(L[1]), fn(L[2]), fn(L[3]),
      "=" + L[3] + rr + "-" + L[0] + rr, '=IF(' + L[0] + rr + '=0,"",' + L[4] + rr + '/' + L[0] + rr + ')', fn(L[6]),
      '=IF($Z$21,' + L[3] + rr + "-" + L[6] + rr + ',"")', '=IF(N(' + L[6] + rr + ')=0,"",' + L[7] + rr + '/' + L[6] + rr + ')'];
  };
  var sumWrite = function(rr, label, fn){
    var v = [label].concat(sumHalf(rr, LS1, fn), [""], sumHalf(rr, LC1, fn));
    sh.getRange(rr, 3, 1, v.length).setValues([v]);
    yqRowStyle_(sh, rr, 2, 21, "sum");
  };
  var sumRow = function(rr, label, from, to){ sumWrite(rr, label, function(c){ return "=SUM(" + c + from + ":" + c + to + ")"; }); };
  var check = function(rr, t, tot, okTxt, badTxt){
    sh.getRange(rr, 3).setFormula('=IF(' + ["D","G","J","N","Q","T"].map(function(c){ return "ABS(" + c + t + "-" + c + tot + ")"; }).join("+") +
      '<0.001,"' + okTxt + '","' + badTxt + '"&TEXT(G' + tot + '-G' + t + ',"#,##0.0"))');
    yqCheckStyle_(sh.getRange(rr, 3));
  };

  var r = 14, rows = {};
  // ═ 1.1 TOTAL ═
  rows.s11 = r; yqSection_(sh, r, "1.1", "TOTAL  ·  MMH turnover", LAST); r++;
  blockHead(r); r++;
  colHead(r, "Total"); var hdr11 = r; r++;
  dataRow(r, "Σ", "MMH TOTAL", [], null, "total", ""); var tot = r; yqBoxes_(sh, tot - 2, tot); r += 2;

  // ═ 1.2 SEGMENT ═
  rows.s12 = r; yqSection_(sh, r, "1.2", "BY SEGMENT  ·  Segment Report", LAST); r++;
  blockHead(r); r++; colHead(r, "Segment"); r++;
  var a = r;
  X.segs.forEach(function(sg, i){ dataRow(r, i + 1, sg, [["D", yqS_(sg)]], null, "", ""); r++; });
  sumRow(r, "Segment total", a, r - 1); var t = r; yqBoxes_(sh, a - 2, t); r++;
  check(r, t, tot, "✓ Matches 1.1 Total", "⚠ Differs from 1.1 Total by "); r += 2;

  // ═ 1.3 GROUPS ═
  rows.s13 = r; yqSection_(sh, r, "1.3", "BY SEGMENT × COUNTRY  ·  6 regional groups", LAST); r++;
  blockHead(r); r++; colHead(r, "Segment × Country group", "Group definition"); r++;
  a = r;
  X.groups.forEach(function(Gp){
    dataRow(r, Gp.code, Gp.name, [["A", yqS_(Gp.code)]], null, "", Gp.def);
    sh.getRange(r, 24).setFontSize(9.5).setFontColor(C.note); r++;
  });
  sumRow(r, "Total of the groups", a, r - 1); t = r; yqBoxes_(sh, a - 2, t); r++;
  check(r, t, tot, "✓ Matches 1.1 Total", "⚠ Data outside the groups: "); r++;
  yqNote_(sh, r, 3, "Country codes: TH = Thailand · MM = Myanmar · VN = Viet Nam · LA = Lao · KH = Cambodia"); r += 2;

  // ═ 1.4 DISTRIBUTORS ═
  rows.s14 = r; yqSection_(sh, r, "1.4", "BY SEGMENT × COUNTRY × DISTRIBUTOR", LAST); r++;
  blockHead(r); r++; colHead(r, "Group / Distributor (Country)", "Distributor name (Mani)"); r++;
  var dRows = [], a14 = r;
  X.groups.forEach(function(Gp){
    dataRow(r, Gp.code, Gp.name, [["A", yqS_(Gp.code)]], null, "sub", Gp.def);
    sh.getRange(r, 24).setFontSize(9.5).setFontColor(C.note); r++;
    (X.distByGroup[Gp.code] || []).forEach(function(d){
      dataRow(r, "", "     " + d.dist + "  (" + d.cty + ")", [["A", yqS_(Gp.code)], ["H", yqS_(d.dist)], ["E", yqS_(d.cty)]], null, "", d.mani);
      sh.getRange(r, 24).setFontSize(9.5).setFontColor(C.note);
      dRows.push(r); r++;
    });
  });
  yqBoxes_(sh, a14 - 2, r - 1);
  var ds = dRows.length ? dRows.map(function(x){ return "Q" + x; }).join("+") : "0";
  sh.getRange(r, 3).setFormula('=IF(ABS(' + ds + '-Q' + tot + ')<0.001,"✓ Distributors add up to 1.1 Total (cumulative)",' +
    '"⚠ A distributor is not listed in 1.4 — run 📊 MMH Report → Build OVERVIEW & SEGMENT-COUNTRY-DISTRIBUTOR again · difference: "&TEXT(Q' + tot + '-(' + ds + '),"#,##0.0"))');
  yqCheckStyle_(sh.getRange(r, 3)); r += 2;

  // ═ 1.5 COUNTRY REPORT × SEGMENT ═
  rows.s15 = r; yqSection_(sh, r, "1.5", "BY COUNTRY REPORT × SEGMENT", LAST); r++;
  blockHead(r); r++; colHead(r, "Country report / Segment"); r++;
  var reps = [], a15 = r;
  [["$Z$11", "$Z$13", "TH"], ["$Z$12", "$Z$14", "VN"]].forEach(function(pr){
    dataRow(r, pr[2], "=" + pr[0], [["G", pr[0]]], [["G", pr[1]]], "sub", ""); reps.push(r); r++;
    X.segs.forEach(function(sg){
      dataRow(r, "", "     " + sg, [["G", pr[0]], ["D", yqS_(sg)]], [["G", pr[1]], ["D", yqS_(sg)]], "", ""); r++;
    });
  });
  sumWrite(r, "Total of the Country reports", function(c){ return "=" + reps.map(function(x){ return c + x; }).join("+"); });
  t = r; yqBoxes_(sh, a15 - 2, t); r++;
  check(r, t, tot, "✓ Matches 1.1 Total", "⚠ Rows with another Country report: "); r += 2;

  // ═ 1.6 EXPLORER ═
  rows.s16 = r;
  yqSection_(sh, r, "1.6", "LOOKUP BY ITEM  ·  Quarter / Month turnover of the item you choose", LAST); r++;
  sh.getRange(r, 3).setValue("VIEW BY  ▾"); sh.getRange(r, 4).setValue("ITEM  ▾"); yqStyleLabel_(sh.getRange(r, 3, 1, 2)); r++;
  var exSel = r;
  PropertiesService.getScriptProperties().setProperty("YQ_QM_EXROW", String(exSel));
  var dim0  = yqPick_(K.dim, YQ.DIMS, "Segment × Country");
  sh.getRange(r, 3).setValue(dim0);
  sh.getRange(r, 4, 1, 4).merge();
  var itemList = { "Segment":X.segs, "Country":X.ctys, "Country report":X.reps,
                   "Segment × Country":X.groups.filter(function(g){ return g.code !== "Other"; }).map(function(g){ return g.code + " " + g.name; }),
                   "Distributor":X.distItems }[dim0] || [];
  sh.getRange(r, 4).setValue(yqPick_(K.item, itemList, itemList[0] || ""));
  yqStyleSelect_(sh.getRange(r, 3)); yqStyleSelect_(sh.getRange(r, 4, 1, 4));
  yqValidate_(sh.getRange(r, 3), LS.getRange("X4:AB4"));
  yqValidate_(sh.getRange(r, 4), LS.getRange("AD5:AD300"), true);
  sh.getRange(r, 9).setFormula('=IF(COUNTIF(' + LST + '$AD$5:$AD$300,$D$' + r + ')=0,"⚠ This item does not belong to the chosen view — pick the item again","")')
    .setFontWeight("bold").setFontColor(C.neg);
  sh.setRowHeight(r, 26); r++;
  // Z9 / Z10 / Z18 — explorer parameters
  sh.getRange("Z9").setFormula('=IF($Z$10=4,LEFT($D$' + exSel + ',2),$D$' + exSel + ')');
  sh.getRange("Z10").setFormula('=IFERROR(MATCH($C$' + exSel + ',' + LST + '$X$4:$AB$4,0),4)');
  sh.getRange("Z18").setFormula('=IF($Z$10=3,IF(ISNUMBER(SEARCH("thai",$D$' + exSel + ')),$Z$13,$Z$14),$Z$9)');
  yqNote_(sh, r, 3, "▸ Choose the view first, then the item. Cream row = the period chosen in cell D6. " +
    "Each row: SINGLE = that quarter / month · CUMULATIVE = FY start → end of that row."); r++;
  band(r, '="SINGLE (each row\'s quarter / month)  ·  "&$C$6', "CUMULATIVE (FY start → end of each row's period)"); r++;
  colHead(r, ""); sh.getRange(r, 3).setFormula('="Period  ·  "&$D$' + exSel); var exHdr = r; r++;
  var exCrit = [["C", "$Z$9"]], exLy = [["C", "$Z$18"]];
  var exRows = [];
  var exRow = function(rr, num, label, sCode, eCode, kind){
    sh.getRange(rr, 41).setFormula(sCode); sh.getRange(rr, 42).setFormula(eCode);     // AO / AP = row codes
    dataRow(rr, num, label, exCrit, exLy, kind, "", { s:"$AO$" + rr, e:"$AP$" + rr, cs:"$Z$8", ce:"$AP$" + rr });
    exRows.push(rr);
  };
  exRow(r, "Σ", '="Full year "&$C$6', "=$Z$8", "=$Z$19", "total"); r++;
  for (var q = 0; q < 4; q++) {
    var m1 = q * 3 + 1, m3 = q * 3 + 3;
    exRow(r, "Q" + (q + 1), '="Quarter ' + (q + 1) + '   ("&' + yqMLabel_("AO" + r) + '&" → "&' + yqMLabel_("AP" + r) + '&")"',
          "=" + yqMonthCode_(m1, "$Z$2"), "=" + yqMonthCode_(m3, "$Z$2"), "sub"); r++;
    for (var m = m1; m <= m3; m++) {
      exRow(r, "", "=" + yqMLabel_("AO" + r), "=" + yqMonthCode_(m, "$Z$2"), "=AO" + r, "");
      r++;
    }
  }
  var exEnd = r - 1; yqBoxes_(sh, exHdr - 1, exEnd); r += 2;
  yqNote_(sh, r, 2, "Notes: Budget = Budget Mani or Budget Distributor (cell K6) · Forecast = column Forecast USD · Actual = column Actual USD · " +
    "Forecast / Actual = Actual for closed months (Actual entered, month due), Forecast for the others · Vs. Budget % = (Forecast/Actual − Budget) ÷ Budget · " +
    "YoY % = (Forecast/Actual − LY) ÷ LY · LY = Forecast/Actual of the same period last year · CUMULATIVE = from September (FY start) to the end of the chosen month / quarter.");
  var lastRow = r;

  // ── KPI strip: SINGLE cards over D:L, CUMULATIVE cards over N:V, each half framed ──
  yqKpi_(sh, 10, 3, 1, "PERIOD", "=$D$6", "@", '=$C$6&"  ·  "&$I$6');
  yqKpi_(sh, 10, 4, 2, "BUDGET  ·  SINGLE", "=D" + tot, YQ.NUM, "=$K$6");
  yqKpi_(sh, 10, 6, 2, "F/A  ·  SINGLE", "=G" + tot, YQ.NUM, '="Actual "&TEXT(F' + tot + ',"#,##0.0")&"  ·  Fcst "&TEXT(E' + tot + ',"#,##0.0")');
  yqKpi_(sh, 10, 8, 2, "GAP vs BUDGET  ·  SINGLE", "=I" + tot, YQ.PCT, '=IF(D' + tot + '=0,"",TEXT(H' + tot + ',"+#,##0.0;-#,##0.0;0")&"  "&$I$6)');
  yqKpi_(sh, 10, 10, 3, "YoY  ·  SINGLE", "=L" + tot, YQ.PCT, '=IF($Z$21,"LY "&TEXT(J' + tot + ',"#,##0.0"),"LY in sheets · not comparable")');
  yqKpi_(sh, 10, 14, 2, "BUDGET  ·  YTD", "=N" + tot, YQ.NUM, '=$K$6&" YTD"');
  yqKpi_(sh, 10, 16, 2, "F/A  ·  CUMULATIVE (YTD)", "=Q" + tot, YQ.NUM, '="Actual "&TEXT(P' + tot + ',"#,##0.0")&"  ·  Fcst "&TEXT(O' + tot + ',"#,##0.0")');
  yqKpi_(sh, 10, 18, 2, "GAP vs BUDGET  ·  YTD", "=S" + tot, YQ.PCT, '=IF(N' + tot + '=0,"",TEXT(R' + tot + ',"+#,##0.0;-#,##0.0;0")&"  "&$I$6)');
  yqKpi_(sh, 10, 20, 3, "YoY  ·  YTD", "=V" + tot, YQ.PCT, '=IF($Z$21,"LY YTD "&TEXT(T' + tot + ',"#,##0.0"),"LY in sheets · not comparable")');
  yqKpi_(sh, 10, 24, 1, "GAP vs FULL-YEAR BUDGET", '=IF(N($Z$20)=0,"",(Q' + tot + '-$Z$20)/$Z$20)', YQ.PCT,
    '=IF(N($Z$20)=0,"",TEXT(Q' + tot + '-$Z$20,"+#,##0.0;-#,##0.0;0")&" of "&TEXT($Z$20,"#,##0"))');
  band(9, singleLbl, cumLbl);
  yqBoxes_(sh, 9, 12);
  sh.setRowHeight(11, 30);

  // ── formats ──
  ["D","E","F","G","H","J","K","N","O","P","Q","R","T","U"].forEach(function(c){ sh.getRange(c + hdr11 + ":" + c + lastRow).setNumberFormat(YQ.NUM); });
  ["I","L","S","V"].forEach(function(c){ sh.getRange(c + hdr11 + ":" + c + lastRow).setNumberFormat(YQ.PCT); });
  sh.getRange("D" + hdr11 + ":V" + lastRow).setHorizontalAlignment("right");
  sh.getRange("B" + hdr11 + ":B" + lastRow).setHorizontalAlignment("center").setFontColor(C.band).setFontWeight("bold");
  yqSignRules_(sh, ["H" + hdr11 + ":I" + lastRow, "K" + hdr11 + ":L" + lastRow, "R" + hdr11 + ":S" + lastRow, "U" + hdr11 + ":V" + lastRow,
                    "H11:I11", "J11:L11", "R11:S11", "T11:V11", "X11"]);
  yqSignRef_(sh, "H12:I12", "$H$11"); yqSignRef_(sh, "R12:S12", "$R$11"); yqSignRef_(sh, "X12", "$X$11");
  yqAddRule_(sh, "B" + exRows[0] + ":V" + exEnd, "=AND($AO" + exRows[0] + "=$Z$6,$AP" + exRows[0] + "=$Z$7)", C.hilite);

  yqLinks_(sh, 8, sh.getSheetId(), [["1.1 Total", rows.s11], ["1.2 Segment", rows.s12], ["1.3 Groups", rows.s13],
                                    ["1.4 Distributors", rows.s14], ["1.5 Country report", rows.s15], ["1.6 Lookup by item", rows.s16]]);

  sh.hideColumns(25, 18);                          // Y:AP helpers (parameters Y:Z, row codes AO:AP)
  return { exSel:exSel, tot:tot };
}

/* ╔══════════════════════════════════════════════════════════════════╗
   ║  PART 7 — KPI TURNOVER · two-way link with "MMH KPI FY68"   v5.7 ║
   ╚══════════════════════════════════════════════════════════════════╝
   What it does
   · Sheet "KPI TURNOVER" (this file): the same layout as "5. Member KPI Monthly"
     of the KPI file, but only the Sales – Turnover codes (F…) of every member.
       – Targets, weights, members, departments: from the KPI file (written into the
         hidden tab _KPI_SRC by the KPI file's script, the moment they change there).
       – Actual: computed here, live, from SUM TURNOVER (hidden tab _KPI_ACT):
         Actual USD, cumulative from September, closed months only — the rule of the
         KPI file ("4. Rule") and of its KPI Hub. Turnover codes are NOT capped at 130%.
   · Turnover → KPI file: every edit of SUM TURNOVER writes the turnover actuals into the
     "<month> Actual" cells of "3. Detail KPI" (immediately, through the edit trigger
     of this file). Cells with a formula are never touched; a month locked by the KPI rule
     (after 16:00 on the 2nd of the next month) is only filled when it is still empty.
   · The KPI file's script also re-reads _KPI_ACT every 5 minutes (safety net).
   Setup: KPI file → paste TurnoverLink.gs → run ktSetup once. This file: run the menu
   build once (it builds KPI TURNOVER together with OVERVIEW / SEGMENT-COUNTRY-DISTRIBUTOR).
   ════════════════════════════════════════════════════════════════════ */
const KPT = {
  VIEW : "KPI TURNOVER",
  SRC  : "_KPI_SRC",
  ACT  : "_KPI_ACT",
  MARK : "«MMH-AUTO-KPI · built by script — do not type here»",
  MAXL : 300,                // rows available for member lines on KPI TURNOVER
  FIRST: 6,                  // first data row on KPI TURNOVER and on _KPI_SRC (same row = same line)
  DETAIL: "3. Detail KPI",
  LOG  : "_CRM_SYNC_LOG",
  TZ   : "Asia/Ho_Chi_Minh",
  // filters of each turnover code on SUM TURNOVER (same as the KPI Hub · checked: Budget Mani of
  // each filter = FY68 Target of the code in 3. Detail KPI). Keys are compared without case,
  // spaces, accents or symbols.
  SPEC : [
    ["F0-00",  { kind:"turnover" },                                          "All rows of Type Turnover"],
    ["F1-00",  { kind:"turnover", seg:["surgical"], cty:["thailand","myanmar"] }, "Segment Report Surgical · Country Thailand + Myanmar"],
    ["F1-01",  { kind:"turnover", seg:["surgical"], dist:["novatec"] },                        "Distributor NOVATEC"],
    ["F2-00",  { sum:["F2-01","F2-02","F2-03","F2-04"] },                    "Sum of F2-01 to F2-04"],
    ["F2-01",  { kind:"turnover", seg:["surgical"], dist:["hungvi"] },                         "Distributor HUNG VI"],
    ["F2-02",  { kind:"turnover", seg:["surgical"], dist:["mhi"] },                            "Distributor MHI"],
    ["F2-03",  { kind:"turnover", seg:["surgical"], dist:["icare"] },                          "Distributor ICARE"],
    ["F2-04",  { kind:"turnover", seg:["surgical"], dist:["antam"] },                          "Distributor AN TAM"],
    ["F3-00",  { sum:["F3-01","F3-02","F3-03"] },                            "Sum of F3-01 to F3-03"],
    ["F3-01",  { kind:"turnover", seg:["dental","mmg"], dist:["namdung"] },  "Distributor NAM DUNG · Segment Dental + MMG"],
    ["F3-02",  { kind:"turnover", seg:["dental","mmg"], dist:["spi"] },      "Distributor SPI · Segment Dental + MMG"],
    ["F3-03",  { kind:"turnover", seg:["dental","mmg"], dist:["vietthai","meci"] }, "Distributor VIET THAI + MECI · Segment Dental + MMG"],
    ["F4-00",  { kind:"turnover", seg:["dental","mmg"], cty:["thailand"] },  "Segment Dental + MMG · Country Thailand"],
    ["F5-00",  { kind:"turnover", seg:["eyeless"] },                         "Segment Report Eyeless"],
    ["F6-01",  { kind:"composite", cty:["vietnam"] },                        "Type Composite · Country Viet Nam"],
    ["F6-01a", { kind:"composite", dist:["namdung"] },                       "Composite · NAM DUNG"],
    ["F6-01b", { kind:"composite", dist:["spi"] },                           "Composite · SPI"],
    ["F6-01c", { kind:"composite", dist:["vietthai","meci"] },               "Composite · VIET THAI + MECI"],
    ["F6-02",  { sum:["F6-02a","F6-02b","F6-02c"] },                         "Sum of F6-02a to F6-02c"],
    ["F6-02a", { kind:"jizai", dist:["namdung"] },                           "Jizai · NAM DUNG"],
    ["F6-02b", { kind:"jizai", dist:["spi"] },                               "Jizai · SPI"],
    ["F6-02c", { kind:"jizai", dist:["vietthai","meci"] },                   "Jizai · VIET THAI + MECI"],
    ["F6-03",  { kind:"turnover", prod:["trabeculotomyhook","microforcep","microforceps"] }, "Products Trabeculotomy Hook + Micro Forcep"]
  ]
};

function kptKey_(s) { return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, ""); }

/* ── menu: push turnover actuals to the KPI file now ── */
function kptSyncNow() {
  var msg;
  try { var r = kptPushToKpi_("menu"); msg = r.note ? "Từ v6.1, Actual doanh số trên file KPI do KpiSyncCenter của file KPI ghi (menu ⚡ KPI Sync ▸ 🔄 Cập nhật Manual)." : r.ok ? "Done ✓ — " + r.cells + " cell(s) updated in '" + KPT.DETAIL + "' (" + r.codes + " code(s))" + (r.locked ? " · " + r.locked + " locked month cell(s) kept" : "") : "⚠ " + r.error; }
  catch (e) { msg = "ERROR: " + (e && e.message || e); }
  try { SpreadsheetApp.getUi().alert("MMH — KPI TURNOVER", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e2) {}
  return msg;
}

/* ── build _KPI_SRC (shell), _KPI_ACT and KPI TURNOVER ─────────────── */
function kptBuild_(ss, X) {
  var src = ss.getSheetByName(KPT.SRC);
  if (!src) {
    src = ss.insertSheet(KPT.SRC);
    if (src.getMaxColumns() < 30) src.insertColumnsAfter(src.getMaxColumns(), 30 - src.getMaxColumns());
    src.getRange("A1").setValue(KPT.MARK);
    src.getRange("B1").setValue("Written by the script of the KPI file (TurnoverLink.gs) — targets, weights and members of the turnover KPIs.");
    src.getRange("A2:H2").setValues([["KPI file ID", "", "KPI file URL", "", "Last update", "", "FY", ""]]);
    src.getRange("A3").setValue("Months");
    src.getRange(5, 1, 1, 29).setValues([["Kind", "#", "Department", "Member", "Position", "KPI Code", "KPI Group", "KPI name", "Unit", "Agg",
      "FY Target", "FY Weight", "Q1 W", "Q2 W", "Q3 W", "Q4 W", "M1 T", "M2 T", "M3 T", "M4 T", "M5 T", "M6 T", "M7 T", "M8 T", "M9 T", "M10 T", "M11 T", "M12 T", "Note"]]);
  }
  if (src.getMaxRows() < KPT.FIRST + KPT.MAXL + 5) src.insertRowsAfter(src.getMaxRows(), KPT.FIRST + KPT.MAXL + 5 - src.getMaxRows());
  if (src.getMaxColumns() < 30) src.insertColumnsAfter(src.getMaxColumns(), 30 - src.getMaxColumns());

  var act = kptPrep_(ss, KPT.ACT, null, 45, 60);
  kptBuildAct_(act, X);
  var qSh = ss.getSheetByName(YQ.QM), pos = 2;
  try { if (qSh) pos = qSh.getIndex(); } catch (e) {}                 // right after SEGMENT-COUNTRY-DISTRIBUTOR
  var view = kptPrep_(ss, KPT.VIEW, pos, 120, KPT.FIRST + KPT.MAXL + 10);
  kptBuildView_(view);
  [src, act].forEach(function(s){ try { s.hideSheet(); } catch (e) {} });
  return "KPI TURNOVER built (" + KPT.SPEC.length + " turnover codes computed from " + CONFIG.SHEET_NAME + ")." +
         (String(src.getRange("B2").getValue() || "") ? "" : "\n⚠ The KPI file has not sent its targets yet: open the KPI file → Apps Script → run ktSetup once.");
}
function kptPrep_(ss, name, pos, cols, rows) {
  var sh = ss.getSheetByName(name);
  if (sh && String(sh.getRange(1, 1).getValue() || "").indexOf("MMH-AUTO-KPI") < 0 && sh.getLastRow() > 0) {
    sh.setName(name + " (old " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyMMdd-HHmm") + ")"); sh = null;
  }
  if (!sh) sh = pos == null ? ss.insertSheet(name) : ss.insertSheet(name, pos);
  else {
    sh.setConditionalFormatRules([]);
    var full = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
    full.breakApart(); sh.clear();
    try { sh.showColumns(1, sh.getMaxColumns()); } catch (e) {}
    sh.setFrozenRows(0); sh.setFrozenColumns(0);
  }
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  sh.getRange(1, 1).setValue(KPT.MARK).setFontSize(7).setFontColor("#B9C3CE");
  return sh;
}

// exact values of one SUM TURNOVER column whose key is in keys
function kptExact_(vals, keys) { return vals.filter(function(v){ return keys.indexOf(kptKey_(v)) >= 0; }); }

function kptBuildAct_(sh, X) {
  var srcTab = X.ss.getSheetByName(CONFIG.SHEET_NAME);
  var n = Math.max(0, srcTab.getLastRow() - CONFIG.DATA_START_ROW + 1);
  var hdr = srcTab.getRange(CONFIG.HEADER_ROW, 1, 1, srcTab.getLastColumn()).getValues()[0];
  var idx = autoDetectColumns_(hdr, CONFIG.COLUMN_MAP);
  var distinct = function(i){ if (i < 0 || !n) return []; var o = {}; srcTab.getRange(CONFIG.DATA_START_ROW, i + 1, n, 1).getValues().forEach(function(r){ var v = String(r[0] || "").trim(); if (v) o[v] = 1; }); return Object.keys(o); };
  var L = { type:distinct(idx.type), seg:distinct(idx.segment), cty:distinct(idx.countryPhys), dist:distinct(idx.distributor), prod:distinct(idx.products) };
  // ⭐ v5.9 — match the Type group (_YQ_Key!X), so a renamed Type ("Jizai Turnover", "Composite USD", …) still counts right
  var typeOf = { turnover:"Turnover", composite:"Composite", jizai:"Jizai" };
  var prodCol = idx.products >= 0 ? fxCol_(idx.products + 1) : "";
  var valCol  = X.split ? X.col.act : X.col.fa;

  // default months (FY of the reports) — replaced by the KPI file's months once it has written _KPI_SRC
  var fyNo = parseInt(String(X.defaultFy).replace(/\D/g, ""), 10) || 68;
  var defM = []; for (var k = 1; k <= 12; k++) defM.push(k <= 4 ? (1958 + fyNo) * 100 + 8 + k : (1959 + fyNo) * 100 + k - 4);

  sh.getRange("B1").setValue("Turnover KPI actuals — Actual USD of '" + CONFIG.SHEET_NAME + "', cumulative from the FY start, closed months only (same rule as the KPI file). Formulas only.")
    .setFontWeight("bold");
  var head = ["KPI Code", "Type", "Filter on " + CONFIG.SHEET_NAME];
  sh.getRange(3, 1, 1, 3).setValues([head]);
  var mHead = [], q = [], c = [];
  for (var j = 0; j < 12; j++) {
    mHead.push("=IF(N(" + yqQ_(KPT.SRC) + fxCol_(2 + j) + "3)>0," + yqQ_(KPT.SRC) + fxCol_(2 + j) + "3," + defM[j] + ")");
    q.push("=" + fxCol_(4 + j) + "3"); c.push("=" + fxCol_(4 + j) + "3");
  }
  sh.getRange(3, 4, 1, 12).setFormulas([mHead]);      // D3:O3  cumulative actual (closed months)
  sh.getRange(2, 4).setValue("CUMULATIVE ACTUAL (closed months)");
  sh.getRange(3, 17, 1, 12).setFormulas([q]);         // Q3:AB3 monthly actual
  sh.getRange(2, 17).setValue("MONTHLY ACTUAL");
  sh.getRange(3, 29, 1, 12).setFormulas([c]);         // AC3:AN3 month closed?
  sh.getRange(2, 29).setValue("MONTH CLOSED (Actual entered)");

  var rowOf = {}; KPT.SPEC.forEach(function(s, i){ rowOf[s[0]] = 4 + i; });
  var missing = [];
  KPT.SPEC.forEach(function(s, i){
    var r = 4 + i, code = s[0], sp = s[1], line = [];
    sh.getRange(r, 1, 1, 3).setValues([[code, sp.sum ? "sum" : typeOf[sp.kind], s[2]]]);
    if (sp.sum) {
      for (var j2 = 0; j2 < 12; j2++) {
        var col = fxCol_(4 + j2), refs = sp.sum.map(function(cc){ return col + rowOf[cc]; }).join(",");
        line.push("=IF(COUNT(" + refs + ")=0,\"\",SUM(" + refs + "))");
      }
      sh.getRange(r, 4, 1, 12).setFormulas([line]);
      return;
    }
    // criteria (exact names found in the data); 2 lists max: first vertical, second horizontal
    var crit = [[yqK_(X, "X"), yqS_(typeOf[sp.kind])]], lists = 0, bad = false;
    var addList = function(rangeExpr, keys, vals){
      var ex = kptExact_(vals, keys);
      if (!ex.length) { bad = true; missing.push(code + " (" + keys.join("/") + ")"); ex = ["§none§"]; }
      if (ex.length === 1) { crit.push([rangeExpr, yqS_(ex[0])]); return; }
      lists++;
      crit.push([rangeExpr, "{" + ex.map(yqS_).join(lists === 1 ? ";" : ",") + "}"]);
    };
    if (sp.seg)  addList(yqK_(X, "D"), sp.seg, L.seg);
    if (sp.cty)  addList(yqK_(X, "E"), sp.cty, L.cty);
    if (sp.dist) addList(yqK_(X, "H"), sp.dist, L.dist);
    if (sp.prod && prodCol) addList(yqST_(X, prodCol), sp.prod, L.prod);
    var mon = [], clo = [], cum = [];
    for (var j3 = 0; j3 < 12; j3++) {
      var mCell = fxCol_(17 + j3) + "$3";
      var f = "SUMIFS(" + yqST_(X, valCol) + "," + yqK_(X, "F") + "," + mCell;
      crit.forEach(function(cr){ f += "," + cr[0] + "," + cr[1]; });
      mon.push("=ARRAYFORMULA(SUM(" + f + ")))");                       // v6.1: cộng đủ mọi giá trị của bộ lọc {…}
      var cCell = fxCol_(29 + j3) + "$3";
      clo.push(X.split
        ? "=IFERROR(COUNTIFS(" + yqQ_(YQ.KEY) + "$O$6:$O," + yqS_(typeOf[sp.kind]) + "," + yqQ_(YQ.KEY) + "$P$6:$P," + cCell + "," + yqQ_(YQ.KEY) + "$R$6:$R,1)>0,FALSE)"
        : "=" + cCell + "<=VALUE(TEXT(IF(DAY(TODAY())>=" + CONFIG.ACTUAL_CUTOFF_DAY + ",TODAY(),EDATE(TODAY(),-1)),\"yyyymm\"))");
      cum.push("=IF(" + fxCol_(29 + j3) + r + ",SUM($Q" + r + ":" + fxCol_(17 + j3) + r + "),\"\")");
    }
    sh.getRange(r, 17, 1, 12).setFormulas([mon]);
    sh.getRange(r, 29, 1, 12).setFormulas([clo]);
    sh.getRange(r, 4, 1, 12).setFormulas([cum]);
    if (bad) sh.getRange(r, 3).setValue(s[2] + "  ⚠ name not found in " + CONFIG.SHEET_NAME);
  });
  sh.getRange(4, 4, KPT.SPEC.length, 25).setNumberFormat("#,##0.00");
  sh.getRange("A3:AN3").setFontWeight("bold");
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(YQ.FONT);
  sh.setFrozenRows(3);
  return missing;
}

/* KPI TURNOVER: one row = the line of the same row on _KPI_SRC (written by the KPI file) */
function kptBuildView_(sh) {
  var C = YQ.C, S = yqQ_(KPT.SRC), A = yqQ_(KPT.ACT), F = KPT.FIRST, Lr = F + KPT.MAXL - 1;
  var HELP = 97;                       // CS: 12 monthly actuals side by side (for LOOKUP)
  var KIND = HELP + 13;                // DF: kind of the line (line / total / blank)
  var col = fxCol_;
  var mCol = function(j){ return 35 + 5 * j; };                  // AI, AN, … target column of month j
  var head = ["#", "Department", "Member", "Position", "KPI Code", "KPI Group", "KPI name", "Unit", "Agg",
              "FY Target", "FY Actual", "FY Weight", "FY %", "FY % x W"];
  for (var q = 1; q <= 4; q++) head.push("Q" + q + " Target", "Q" + q + " Actual", "Q" + q + " Weight", "Q" + q + " %", "Q" + q + " % x W");
  var monthHead = [];
  for (var j = 0; j < 12; j++) { ["Target", "Actual", "Weight", "%", "% x W"].forEach(function(x){ monthHead.push(x); }); }
  head = head.concat(monthHead); head.push("Check");

  sh.setHiddenGridlines(true);
  sh.getRange("B1").setFormula('="MMH "&IF(' + S + '$H$2="","FY68",' + S + '$H$2)&"  ·  KPI TURNOVER  ·  member KPIs of the Sales – Turnover codes"')
    .setFontSize(16).setFontWeight("bold").setFontColor(C.title);
  sh.getRange("B2").setFormula('=IF(' + S + '$B$2="","⚠ Waiting for the KPI file: open MMH KPI FY68 → Extensions → Apps Script → run ktSetup once",' +
    '"Targets, weights and members: KPI file (updated "&TEXT(' + S + '$F$2,"dd/mm/yyyy hh:mm")&")  ·  Actual: live from ' + CONFIG.SHEET_NAME + '")')
    .setFontSize(10).setFontColor(C.sub);
  sh.getRange("B3").setValue("Actual = Actual USD in " + CONFIG.SHEET_NAME + ", closed months only (rule of the KPI file) · Agg SUM: amount of each month, quarter = sum of its 3 months · " +
    "Agg LAST: cumulative from September, quarter = quarter-end minus previous quarter-end · Turnover KPIs are not capped at 130% · Edit targets and weights in the KPI file, not here.")
    .setFontSize(9).setFontStyle("italic").setFontColor(C.note);
  // month labels row 4 (above the 5 columns of each month)
  for (var j0 = 0; j0 < 12; j0++) sh.getRange(4, mCol(j0)).setFormula('=IF(N(' + A + col(4 + j0) + '$3)=0,"",TEXT(DATE(INT(' + A + col(4 + j0) + '$3/100),MOD(' + A + col(4 + j0) + '$3,100),1),"mmm-yy"))');
  ["FY", "Q1", "Q2", "Q3", "Q4"].forEach(function(t, i){ sh.getRange(4, 10 + 5 * i).setValue(t); });
  sh.getRange(5, 1, 1, head.length).setValues([head]);

  var rows = [];
  for (var r = F; r <= Lr; r++) {
    var k = S + "$A" + r, line = [];
    var isT = k + '="total"';
    // total row = the member's lines just above it (count sent by the KPI file in column B); INDIRECT avoids a circular reference
    var blk = 'INDIRECT(ADDRESS(ROW()-N(' + S + '$B' + r + '),COLUMN())&":"&ADDRESS(ROW()-1,COLUMN()))';
    var wc = function(c, lineF){ return "=IF(" + isT + ",IF(COUNT(" + blk + ")=0,\"\",SUM(" + blk + "))," + lineF + ")"; };
    var hR = function(a, b){ return "$" + col(HELP + a) + r + ":$" + col(HELP + b) + r; };   // helper actual range months a..b
    // A..I
    line.push("=IF(" + k + '="line",' + S + "B" + r + ",IF(" + isT + "," + S + "D" + r + ',""))');
    line.push("=IF(" + isT + ',"TOTAL  -  "&' + S + "D" + r + '&"  (turnover KPIs)",IF(' + k + '="line",' + S + "C" + r + ',""))');
    line.push("=IF(" + k + '="line",' + S + "D" + r + ',"")');
    line.push("=IF(" + k + '="line",' + S + "E" + r + ',"")');
    ["F", "G", "H", "I", "J"].forEach(function(c){ line.push("=IF(" + k + '="line",' + S + c + r + ',"")'); });
    // FY (J..N)
    line.push("=IF(OR($E" + r + '="",' + S + "K" + r + '=""),"",' + S + "K" + r + ")");
    line.push("=IF(OR($E" + r + '="",COUNT(' + hR(0, 11) + ')=0),"",IF($I' + r + '="SUM",SUM(' + hR(0, 11) + '),LOOKUP(1E+308,' + hR(0, 11) + ")))");   // v6.2
    line.push(wc(12, "IF(OR($E" + r + '="",' + S + "L" + r + '=""),"",' + S + "L" + r + ")"));
    line.push("=IF(OR(K" + r + '="",J' + r + '="",N(J' + r + ')=0),"",K' + r + "/J" + r + ")");
    line.push(wc(14, "IF(OR(M" + r + '="",L' + r + '=""),"",M' + r + "*L" + r + ")"));
    // quarters (O..AH)
    for (var qq = 0; qq < 4; qq++) {
      var base = 15 + 5 * qq, endM = qq * 3 + 2, prevM = qq * 3 - 1, wSrc = col(13 + qq);
      var tEnd = col(mCol(endM)) + r, tPrev = qq ? col(mCol(prevM)) + r : "";
      var t3 = [0, 1, 2].map(function(z){ return col(mCol(qq * 3 + z)) + r; }).join(",");          // v6.2: 3 target tháng
      line.push("=IF($E" + r + '="","",IF($I' + r + '="SUM",IF(COUNT(' + t3 + ')=0,"",SUM(' + t3 + ')),IF(' + tEnd + '="","",' + tEnd + (qq ? "-N(" + tPrev + ")" : "") + ")))");
      line.push("=IF(OR($E" + r + '="",COUNT(' + hR(qq * 3, endM) + ')=0),"",IF($I' + r + '="SUM",SUM(' + hR(qq * 3, endM) + '),LOOKUP(1E+308,' + hR(0, endM) + ")" +
                (qq ? "-IF(COUNT(" + hR(0, prevM) + ")=0,0,LOOKUP(1E+308," + hR(0, prevM) + "))" : "") + "))");
      line.push(wc(base + 2, "IF(OR($E" + r + '="",' + S + wSrc + r + '=""),"",' + S + wSrc + r + ")"));
      line.push("=IF(OR(" + col(base + 1) + r + '="",' + col(base) + r + '="",N(' + col(base) + r + ')=0),"",' + col(base + 1) + r + "/" + col(base) + r + ")");
      line.push(wc(base + 4, "IF(OR(" + col(base + 3) + r + '="",' + col(base + 2) + r + '=""),"",' + col(base + 3) + r + "*" + col(base + 2) + r + ")"));
    }
    // months (AI..CP)
    for (var mj = 0; mj < 12; mj++) {
      var b = mCol(mj), qW = col(17 + 5 * Math.floor(mj / 3));          // Q / V / AA / AF
      line.push("=IF(OR($E" + r + '="",' + S + col(17 + mj) + r + '=""),"",' + S + col(17 + mj) + r + ")");
      var idxC = "INDEX(" + A + "$" + col(4 + mj) + "$4:$" + col(4 + mj) + "$60,MATCH($E" + r + "," + A + "$A$4:$A$60,0))",          // lũy kế (chỉ tháng đã đóng)
          idxM = "INDEX(" + A + "$" + col(17 + mj) + "$4:$" + col(17 + mj) + "$60,MATCH($E" + r + "," + A + "$A$4:$A$60,0))";         // số của tháng
      line.push("=IF($E" + r + '="","",IFERROR(IF($I' + r + '="SUM",IF(' + idxC + '="","",' + idxM + '),' + idxC + '),""))');   // v6.2: theo Agg
      line.push(wc(b + 2, "IF(OR($E" + r + '="",' + qW + r + '=""),"",' + qW + r + ")"));
      line.push("=IF(OR(" + col(b + 1) + r + '="",' + col(b) + r + '="",N(' + col(b) + r + ')=0),"",' + col(b + 1) + r + "/" + col(b) + r + ")");
      line.push(wc(b + 4, "IF(OR(" + col(b + 3) + r + '="",' + col(b + 2) + r + '=""),"",' + col(b + 3) + r + "*" + col(b + 2) + r + ")"));
    }
    // CQ check
    line.push("=IF($E" + r + '="","",IF(COUNTIF(' + A + "$A$4:$A$60,$E" + r + ')=0,"No turnover source in ' + CONFIG.SHEET_NAME + ' (enter it in the KPI file)",IF(' +
              S + "AC" + r + '="","",' + S + "AC" + r + ")))");
    line.push("");                                                     // CR (gap)
    for (var hj = 0; hj < 12; hj++) line.push("=" + col(mCol(hj) + 1) + r);   // CS..DD helper actuals
    line.push("");                                                     // DE
    line.push("=" + k);                                                // DF kind
    rows.push(line);
  }
  sh.getRange(F, 1, rows.length, rows[0].length).setFormulas(rows);

  // ── look ──
  var W = head.length;
  sh.getRange(5, 1, 1, W).setBackground(C.head).setFontColor(C.title).setFontWeight("bold").setFontSize(9.5).setWrap(true)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBorder(true, null, true, null, null, null, C.band, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(4, 1, 1, W).setFontWeight("bold").setFontColor(C.sub).setFontSize(10);
  sh.setRowHeight(5, 40);
  sh.getRange(F, 1, KPT.MAXL, W).setFontSize(10).setFontColor(C.text).setVerticalAlignment("middle");
  // number formats
  var money = [10, 11], pctW = [12, 13, 14], i;
  for (i = 0; i < 4; i++) { money.push(15 + 5 * i, 16 + 5 * i); pctW.push(17 + 5 * i, 18 + 5 * i, 19 + 5 * i); }
  for (i = 0; i < 12; i++) { money.push(mCol(i), mCol(i) + 1); pctW.push(mCol(i) + 2, mCol(i) + 3, mCol(i) + 4); }
  money.forEach(function(c){ sh.getRange(F, c, KPT.MAXL, 1).setNumberFormat("#,##0"); });
  pctW.forEach(function(c){ sh.getRange(F, c, KPT.MAXL, 1).setNumberFormat("0.0%"); });
  sh.getRange(F, 10, KPT.MAXL, W - 10).setHorizontalAlignment("right");
  // column widths
  yqWidths_(sh, { A:[1,34], B:[2,170], C:[3,96], D:[4,150], E:[5,64], F:[6,120], G:[7,300], H:[8,46], I:[9,46] });
  for (i = 10; i <= W - 1; i++) sh.setColumnWidth(i, 78);
  sh.setColumnWidth(W, 260);
  // band per block: FY / quarter / month group header colours
  sh.getRange(4, 10, 1, 5).setBackground(C.bandC);
  for (i = 0; i < 4; i++) sh.getRange(4, 15 + 5 * i, 1, 5).setBackground(i % 2 ? "#FFFFFF" : C.bandS);
  for (i = 0; i < 12; i++) sh.getRange(4, mCol(i), 1, 5).setBackground(i % 2 ? "#FFFFFF" : "#F7F9FB");
  // conditional formats: total rows · % colour code of the KPI rule (sheet 6)
  var rules = [], kindCol = "$" + col(KIND) + F;
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=" + kindCol + '="total"')
    .setBackground(C.head).setBold(true).setRanges([sh.getRange(F, 1, KPT.MAXL, W)]).build());
  var pctRanges = [sh.getRange(F, 13, KPT.MAXL, 1)];
  for (i = 0; i < 4; i++) pctRanges.push(sh.getRange(F, 18 + 5 * i, KPT.MAXL, 1));
  for (i = 0; i < 12; i++) pctRanges.push(sh.getRange(F, mCol(i) + 3, KPT.MAXL, 1));
  var tl = "M" + F;   // relative top-left of the first % range — rule formulas use the cell itself through INDIRECT-free relative refs
  [["<0.9", "#EEF1F5"], ["<1", "#E3EEF8"], ["<=1.2", "#FFF6D9"], [">1.2", "#E6F2EC"]].forEach(function(p, n){
    pctRanges.forEach(function(rg){
      var a1 = rg.getA1Notation().split(":")[0];
      var cond = n === 0 ? "AND(ISNUMBER(" + a1 + ")," + a1 + "<0.9)" : n === 1 ? "AND(ISNUMBER(" + a1 + ")," + a1 + ">=0.9," + a1 + "<1)" :
                 n === 2 ? "AND(ISNUMBER(" + a1 + ")," + a1 + ">=1," + a1 + "<=1.2)" : "AND(ISNUMBER(" + a1 + ")," + a1 + ">1.2)";
      rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=" + cond).setBackground(p[1]).setRanges([rg]).build());
    });
  });
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEFT($' + col(W) + F + ',2)="No"')
    .setFontColor("#A87514").setRanges([sh.getRange(F, W, KPT.MAXL, 1)]).build());
  sh.setConditionalFormatRules(rules);
  sh.setFrozenRows(5); sh.setFrozenColumns(5);
  sh.hideColumns(W + 1, KIND - W);                                    // CR..DF helpers
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily(YQ.FONT);
}

/* ── Turnover → KPI file: write the actuals into 3. Detail KPI ─────── */
function kptReadAct_(act) {
  var last = act.getLastRow(); if (last < 4) return null;
  var v = act.getRange(3, 1, last - 2, 15).getValues();
  var months = v[0].slice(3, 15).map(function(x){ return parseInt(x, 10) || 0; });
  var rows = {};
  for (var i = 1; i < v.length; i++) { var code = String(v[i][0] || "").trim(); if (code) rows[code] = v[i].slice(3, 15); }
  return { months:months, rows:rows };
}
function kptPushToKpi_(why) {
  /* v6.1: tắt — Actual doanh số trên file KPI do KpiSyncCenter (file KPI) tính thẳng từ SUM TURNOVER */
  return { ok:true, cells:0, codes:0, locked:0, note:"KpiSyncCenter ghi Actual" };
}
function kptPushToKpi_old_(why) {
  var ss  = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var src = ss.getSheetByName(KPT.SRC), act = ss.getSheetByName(KPT.ACT);
  if (!src || !act) return { ok:false, error:"KPI TURNOVER is not built yet — run the menu build once." };
  var kid = String(src.getRange("B2").getValue() || "").trim();
  if (!kid) return { ok:false, error:"The KPI file is not linked yet — open MMH KPI FY68 → Apps Script → run ktSetup once." };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok:false, error:"busy" };
  try {
    SpreadsheetApp.flush();
    var table = kptReadAct_(act); if (!table) return { ok:false, error:"_KPI_ACT is empty" };
    return ktWriteTurnoverActuals_(SpreadsheetApp.openById(kid), table, "turnover · " + (why || "edit"));
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/* SAME function in the KPI file (TurnoverLink.gs) — keep both in sync.
   table = { months:[12 yyyymm], rows:{ code:[12 cumulative values or ""] } } */
function ktWriteTurnoverActuals_(kss, table, source) {
  var sh = kss.getSheetByName("3. Detail KPI");
  if (!sh) return { ok:false, error:"sheet '3. Detail KPI' not found in the KPI file" };
  var lastCol = sh.getLastColumn(), lastRow = sh.getLastRow();
  var hdr = sh.getRange(4, 1, 1, lastCol).getDisplayValues()[0];
  var colOf = {};
  table.months.forEach(function(m, j){
    for (var c = 0; c < hdr.length; c++) if (String(hdr[c]).replace(/\s+/g, " ").trim() === m + " Actual") { colOf[j] = c + 1; break; }
  });
  var cols = Object.keys(colOf).map(function(j){ return colOf[j]; });
  if (!cols.length) return { ok:false, error:"no '<yyyymm> Actual' columns found in row 4 of 3. Detail KPI" };
  var c1 = Math.min.apply(null, cols), c2 = Math.max.apply(null, cols);
  var codes = sh.getRange(5, 2, lastRow - 4, 1).getValues().map(function(r){ return String(r[0] || "").trim(); });
  var blk = sh.getRange(5, c1, lastRow - 4, c2 - c1 + 1), vals = blk.getValues(), fmls = blk.getFormulas();
  var now = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMddHHmm");
  var lockOf = function(m){ var y = Math.floor(m / 100), mo = m % 100 + 1; if (mo > 12) { mo = 1; y++; } return String(y) + ("0" + mo).slice(-2) + "021600"; };
  var cells = 0, locked = 0, touched = {};
  Object.keys(table.rows).forEach(function(code){
    var ri = codes.indexOf(code); if (ri < 0) return;
    table.rows[code].forEach(function(v, j){
      if (v === "" || v === null || v === undefined || isNaN(Number(v)) || !colOf[j]) return;
      var ci = colOf[j] - c1, cur = vals[ri][ci], num = Math.round(Number(v) * 100) / 100;
      if (fmls[ri][ci]) return;                                              // a formula in the KPI file wins
      if (cur !== "" && cur !== null && Math.abs(Number(cur) - num) < 0.005) return;
      if (now >= lockOf(table.months[j]) && cur !== "" && cur !== null) { locked++; return; }   // month closed by the KPI rule
      sh.getRange(5 + ri, colOf[j]).setValue(num); cells++; touched[code] = 1;
    });
  });
  var nCodes = Object.keys(touched).length;
  if (cells) {
    var log = kss.getSheetByName("_CRM_SYNC_LOG");
    if (log) { try { log.insertRowBefore(2); log.getRange(2, 1, 1, 4).setValues([[new Date(), source, "push", nCodes + " code(s) · " + cells + " cell(s)"]]);
                     if (log.getLastRow() > 400) log.deleteRows(401, log.getLastRow() - 400); } catch (e) {} }
  }
  return { ok:true, cells:cells, codes:nCodes, locked:locked };
}