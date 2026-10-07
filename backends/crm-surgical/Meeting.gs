/* ════════════════════════════════════════════════════════════════════
   MMH CRM — HỌP TUẦN SURGICAL  ·  Meeting.gs  v1.0  (25/09/2026)
   ────────────────────────────────────────────────────────────────────
   File MỚI, thêm vào project Apps Script của file MMH_Surgical_CRM
   (Extensions → Apps Script → dấu ＋ cạnh "Files" → Script → đặt tên
   "Meeting"). KHÔNG sửa gì trong Code.gs ngoài 2 dòng móc nối:

     function doGet(e) {
       var _mt = mtHandle_(e, false); if (_mt) return _mt;   // ⭐ Họp tuần
       …giữ nguyên phần còn lại…
     }
     function doPost(e) {
       var _mt = mtHandle_(e, true);  if (_mt) return _mt;   // ⭐ Họp tuần
       …giữ nguyên phần còn lại…
     }

   Mọi action của module bắt đầu bằng "mt" + chữ hoa (mtList, mtSave…),
   action khác trả null ⇒ Code.gs xử lý như cũ, không ảnh hưởng gì.

   Sheet tự tạo khi chạy mtSetup() lần đầu (hoặc lần gọi đầu tiên):
     · 13. WEEKLY MEETING — mỗi dòng = 1 buổi họp tuần với 1 PIC
                            (ID cố định MT-yyyymmdd-PIC ⇒ lưu lại là ghi đè,
                             không bao giờ trùng dòng)
     · 14. TENDER TRACK   — danh sách gói thầu theo dõi, sửa trực tiếp
   Action:
     mtList            → danh sách biên bản (nhẹ, không kèm JSON)
     mtGet  id         → 1 biên bản đầy đủ
     mtSave            → lưu / cập nhật biên bản
     mtTenders         → danh sách gói thầu
     mtTenderSave      → thêm / sửa gói thầu
     mtTenderDelete id → xoá mềm (cột Deleted = x, vẫn giữ lịch sử)
     mtMail            → gửi email cập nhật tuần (chỉ nhận địa chỉ @manimedicalhanoi.com)
   Sau khi thêm file: chạy mtSetup() một lần để cấp quyền gửi mail và tạo
   2 sheet, rồi Deploy → Manage deployments → ✎ Edit → Version: New version
   → Deploy (giữ nguyên URL /exec đang dùng).
   ════════════════════════════════════════════════════════════════════ */

var MT_CFG = {
  SS_ID     : "",                         // để trống = file Google Sheet gắn với script này
  SH_MEET   : "13. WEEKLY MEETING",
  SH_TENDER : "14. TENDER TRACK",
  MAIL_RE   : /^[^@\s]+@manimedicalhanoi\.com$/i,
  MAIL_NAME : "MMH CRM · Surgical Sales Team",
  CELL_MAX  : 49000
};

var MT_MEET_HDR = [
  "Meeting ID","Week start","Tuần","FY","Sales PIC",
  "Số lượt tuần này","Đã hoàn thành","Số lượt tuần sau","Ghi chú địa bàn",
  "NPP","Tháng NPP","A/F tháng (USD)","Budget tháng (USD)","% tháng","% FY lũy kế",
  "Theo forecast","Rủi ro","✅ Positive factors","❌ Negative factors","➡️ Follow up action",
  "Số gói thầu","DS thầu còn lại FY (VND)","Ghi chú thầu","Thông tin khác",
  "Created by","Created at","Updated by","Updated at","Emailed at","Emailed to",
  "Data (JSON)","Snapshot (JSON)"          // 2 cột JSON luôn để CUỐI ⇒ mtList đọc nhanh, bỏ qua được
];
var MT_MEET_TEXT = ["Meeting ID","Week start","Tuần","FY","Tháng NPP","Created at","Updated at","Emailed at"];

var MT_TENDER_HDR = [
  "Tender ID","Sales PIC","Bệnh viện","Account","Product group","Product detail",
  "Số lượng","Đơn vị","Đơn giá (VND)","Giá trị (VND)","Trạng thái","Kết quả",
  "Tháng KQTT","Hiệu lực (tháng)","NPP","Ghi chú",
  "Created by","Created at","Updated by","Updated at","Deleted"
];
var MT_TENDER_TEXT = ["Tender ID","Tháng KQTT","Created at","Updated at"];

/* map tên trường app ⇄ tên cột sheet thầu */
var MT_TENDER_MAP = {
  id:"Tender ID", pic:"Sales PIC", hosp:"Bệnh viện", account:"Account", prod:"Product group",
  detail:"Product detail", qty:"Số lượng", unit:"Đơn vị", price:"Đơn giá (VND)", value:"Giá trị (VND)",
  status:"Trạng thái", won:"Kết quả", kqtt:"Tháng KQTT", valid:"Hiệu lực (tháng)", npp:"NPP", note:"Ghi chú",
  createdBy:"Created by", createdAt:"Created at", updatedBy:"Updated by", updatedAt:"Updated at"
};

/* ───────── cổng vào ───────── */
function mtHandle_(e, isPost) {
  var p = (e && e.parameter) || {};
  var body = null;
  if (isPost && e && e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch (x) { body = null; }
  }
  var action = String((body && body.action) || p.action || "");
  if (!/^mt[A-Z]/.test(action)) return null;          // không phải của module ⇒ Code.gs xử lý
  var q = {};
  Object.keys(p).forEach(function (k) { q[k] = p[k]; });
  if (body) Object.keys(body).forEach(function (k) { q[k] = body[k]; });
  var out;
  try { out = mtRoute_(action, q); }
  catch (err) { out = { ok: false, error: String((err && err.message) || err) }; }
  var txt = JSON.stringify(out), cb = String(p.callback || "");
  if (cb && /^[\w$.]+$/.test(cb))
    return ContentService.createTextOutput(cb + "(" + txt + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

function mtRoute_(a, q) {
  switch (a) {
    case "mtList":         return mtList_();
    case "mtGet":          return mtGet_(String(q.id || ""));
    case "mtSave":         return mtLocked_(function () { return mtSave_(q); });
    case "mtTenders":      return mtTenders_();
    case "mtTenderSave":   return mtLocked_(function () { return mtTenderSave_(q); });
    case "mtTenderDelete": return mtLocked_(function () { return mtTenderDelete_(q); });
    case "mtMail":         return mtMail_(q);
    default:               return { ok: false, error: "Unknown action: " + a };
  }
}

/* chạy tay 1 lần: cấp quyền + tạo 2 sheet */
function mtSetup() {
  mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  Logger.log("Đã tạo sheet. Quota email còn lại hôm nay: " + MailApp.getRemainingDailyQuota());
}

/* ───────── tiện ích sheet ───────── */
function mtLocked_(fn) {
  var lk = LockService.getScriptLock();
  if (!lk.tryLock(20000)) return { ok: false, error: "Hệ thống đang bận ghi dữ liệu, thử lại sau vài giây." };
  try { var r = fn(); SpreadsheetApp.flush(); return r; }
  finally { lk.releaseLock(); }
}
function mtSS_() {
  var ss = MT_CFG.SS_ID ? SpreadsheetApp.openById(MT_CFG.SS_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Không mở được file Google Sheet — điền MT_CFG.SS_ID trong Meeting.gs.");
  return ss;
}
function mtSheet_(name, hdr, textCols) {
  var ss = mtSS_(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, hdr.length).setValues([hdr])
      .setFontWeight("bold").setBackground("#CFE2F3").setFontColor("#003047").setWrap(true);
    sh.setFrozenRows(1);
    (textCols || []).forEach(function (h) {
      var c = hdr.indexOf(h) + 1;
      if (c > 0) sh.getRange(2, c, sh.getMaxRows() - 1, 1).setNumberFormat("@");
    });
    return sh;
  }
  /* sheet cũ thiếu cột ⇒ thêm vào cuối, không đụng cột có sẵn */
  var lastC = Math.max(1, sh.getLastColumn());
  var cur = sh.getRange(1, 1, 1, lastC).getValues()[0].map(function (h) { return String(h || "").trim(); });
  var add = hdr.filter(function (h) { return cur.indexOf(h) < 0; });
  if (add.length) sh.getRange(1, cur.length + 1, 1, add.length).setValues([add])
    .setFontWeight("bold").setBackground("#CFE2F3").setFontColor("#003047");
  return sh;
}
function mtHdr_(sh) {
  var h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  var m = {}; h.forEach(function (x, i) { x = String(x || "").trim(); if (x && !(x in m)) m[x] = i; });
  return { list: h, map: m, n: h.length };
}
function mtTz_() { return Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh"; }
function mtNow_() { return Utilities.formatDate(new Date(), mtTz_(), "yyyy-MM-dd HH:mm"); }
function mtStr_(v, fmt) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Utilities.formatDate(v, mtTz_(), fmt || "yyyy-MM-dd");
  return String(v);
}
function mtJ_(v) {
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch (e) { return v; }
}
function mtFindRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2 || !id) return 0;
  var f = sh.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
function mtReadAll_(sh) {
  var last = sh.getLastRow(), H = mtHdr_(sh);
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, H.n).getValues();
  return vals.map(function (r, i) {
    var o = { _r: i + 2 };
    H.list.forEach(function (h, j) { h = String(h || "").trim(); if (h) o[h] = r[j]; });
    return o;
  }).filter(function (o) { return String(o[H.list[0]] || "").trim(); });
}
/* ghi 1 dòng theo tên cột; dòng đã có thì chỉ đè đúng các cột được gửi lên */
function mtWriteRow_(sh, id, obj) {
  var H = mtHdr_(sh), r = mtFindRow_(sh, id), isNew = !r;
  if (isNew) r = sh.getLastRow() + 1;
  var cur = isNew ? new Array(H.n).fill("") : sh.getRange(r, 1, 1, H.n).getValues()[0];
  Object.keys(obj).forEach(function (h) {
    if (h in H.map) cur[H.map[h]] = (obj[h] === undefined || obj[h] === null) ? "" : obj[h];
  });
  sh.getRange(r, 1, 1, H.n).setValues([cur]);
  return { row: r, isNew: isNew };
}
function mtCell_(s) {
  s = String(s == null ? "" : s);
  return s.length > MT_CFG.CELL_MAX ? s.slice(0, MT_CFG.CELL_MAX) : s;
}

/* ───────── BIÊN BẢN HỌP ───────── */
function mtCacheKey_() {
  var v = "0";
  try { v = PropertiesService.getScriptProperties().getProperty("mt_ver") || "0"; } catch (e) {}
  return "mt_list_" + v;
}
function mtBump_() {
  try { PropertiesService.getScriptProperties().setProperty("mt_ver", String(Date.now())); } catch (e) {}
}
function mtList_() {
  var ck = mtCacheKey_(), cache = CacheService.getScriptCache();
  try { var hit = cache.get(ck); if (hit) { var j = JSON.parse(hit); j.cached = true; return j; } } catch (e) {}
  var sh = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  var H = mtHdr_(sh), stop = ("Data (JSON)" in H.map) ? H.map["Data (JSON)"] : H.n;
  var rows = [];
  if (sh.getLastRow() >= 2 && stop > 0) {
    /* chỉ đọc các cột trước 2 cột JSON — nhẹ hơn hàng chục lần */
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, stop).getValues();
    rows = vals.map(function (r) {
      var o = {}; for (var j = 0; j < stop; j++) { var h = String(H.list[j] || "").trim(); if (h) o[h] = r[j]; }
      return o;
    }).filter(function (o) { return String(o["Meeting ID"] || "").trim(); });
  }
  var list = rows.map(function (o) {
    return {
      id: String(o["Meeting ID"]), week: mtStr_(o["Week start"]), wlabel: mtStr_(o["Tuần"]),
      fy: mtStr_(o["FY"]), pic: mtStr_(o["Sales PIC"]),
      nCur: Number(o["Số lượt tuần này"]) || 0, nDone: Number(o["Đã hoàn thành"]) || 0,
      nNxt: Number(o["Số lượt tuần sau"]) || 0,
      npp: mtStr_(o["NPP"]), nppMonth: mtStr_(o["Tháng NPP"]),
      pm: mtStr_(o["% tháng"]), pf: mtStr_(o["% FY lũy kế"]),
      nTender: Number(o["Số gói thầu"]) || 0, tRemain: Number(o["DS thầu còn lại FY (VND)"]) || 0,
      createdBy: mtStr_(o["Created by"]), createdAt: mtStr_(o["Created at"], "yyyy-MM-dd HH:mm"),
      updatedBy: mtStr_(o["Updated by"]), updatedAt: mtStr_(o["Updated at"], "yyyy-MM-dd HH:mm"),
      emailedAt: mtStr_(o["Emailed at"], "yyyy-MM-dd HH:mm"), emailedTo: mtStr_(o["Emailed to"])
    };
  });
  list.sort(function (a, b) { return a.week < b.week ? 1 : a.week > b.week ? -1 : (a.pic < b.pic ? -1 : 1); });
  var out = { ok: true, list: list, t: Date.now() };
  try { cache.put(ck, JSON.stringify(out), 120); } catch (e) {}
  return out;
}

function mtGet_(id) {
  if (!id) return { ok: false, error: "Thiếu Meeting ID" };
  var sh = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  var r = mtFindRow_(sh, id);
  if (!r) return { ok: false, error: "Không tìm thấy biên bản " + id };
  var H = mtHdr_(sh), v = sh.getRange(r, 1, 1, H.n).getValues()[0];
  var g = function (h) { return (h in H.map) ? v[H.map[h]] : ""; };
  var data = mtJ_(String(g("Data (JSON)") || "{}")), snap = mtJ_(String(g("Snapshot (JSON)") || "{}"));
  return { ok: true, rec: {
    id: id, week: mtStr_(g("Week start")), wlabel: mtStr_(g("Tuần")), fy: mtStr_(g("FY")), pic: mtStr_(g("Sales PIC")),
    data: (data && typeof data === "object") ? data : {},
    snap: (snap && typeof snap === "object") ? snap : {},
    createdBy: mtStr_(g("Created by")), createdAt: mtStr_(g("Created at"), "yyyy-MM-dd HH:mm"),
    updatedBy: mtStr_(g("Updated by")), updatedAt: mtStr_(g("Updated at"), "yyyy-MM-dd HH:mm"),
    emailedAt: mtStr_(g("Emailed at"), "yyyy-MM-dd HH:mm"), emailedTo: mtStr_(g("Emailed to"))
  } };
}

function mtSave_(q) {
  var id = String(q.id || "").trim();
  if (!/^MT-\d{8}-[A-Z0-9]+$/.test(id)) return { ok: false, error: "Meeting ID không hợp lệ: " + id };
  var sh = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
  var row = mtJ_(q.row) || {}, by = String(q.by || q.pic || "").trim(), now = mtNow_();
  var data = typeof q.data === "string" ? q.data : JSON.stringify(q.data || {});
  var snap = typeof q.snap === "string" ? q.snap : JSON.stringify(q.snap || {});
  if (snap.length > MT_CFG.CELL_MAX) return { ok: false, error: "Snapshot quá lớn (" + snap.length + " ký tự)" };
  if (data.length > MT_CFG.CELL_MAX) return { ok: false, error: "Nội dung biên bản quá dài (" + data.length + " ký tự)" };
  var obj = {};
  MT_MEET_HDR.forEach(function (h) {
    if (h in row && ["Meeting ID", "Data (JSON)", "Snapshot (JSON)", "Created by", "Created at",
                     "Updated by", "Updated at", "Emailed at", "Emailed to"].indexOf(h) < 0)
      obj[h] = (typeof row[h] === "string") ? mtCell_(row[h]) : row[h];
  });
  obj["Meeting ID"] = id;
  obj["Data (JSON)"] = data;
  obj["Snapshot (JSON)"] = snap;
  obj["Updated by"] = by;
  obj["Updated at"] = now;
  var exists = mtFindRow_(sh, id);
  if (!exists) { obj["Created by"] = by; obj["Created at"] = now; }
  var w = mtWriteRow_(sh, id, obj);
  mtBump_();
  return { ok: true, id: id, row: w.row, isNew: w.isNew, updatedAt: now, updatedBy: by };
}

/* ───────── THẦU ───────── */
function mtTenderObj_(o) {
  var t = {};
  Object.keys(MT_TENDER_MAP).forEach(function (k) {
    var v = o[MT_TENDER_MAP[k]];
    t[k] = (k === "kqtt") ? mtStr_(v, "yyyy-MM")
         : (k === "createdAt" || k === "updatedAt") ? mtStr_(v, "yyyy-MM-dd HH:mm")
         : (v instanceof Date ? mtStr_(v) : v);
  });
  return t;
}
function mtTenders_() {
  var sh = mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  var list = mtReadAll_(sh).filter(function (o) { return !String(o["Deleted"] || "").trim(); }).map(mtTenderObj_);
  return { ok: true, list: list, t: Date.now() };
}
function mtTenderSave_(q) {
  var t = mtJ_(q.tender) || {};
  var id = String(t.id || "").trim();
  if (!/^TD-[a-z0-9-]+$/i.test(id)) return { ok: false, error: "Tender ID không hợp lệ" };
  if (!String(t.hosp || "").trim()) return { ok: false, error: "Thiếu tên bệnh viện" };
  var sh = mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  var by = String(q.by || q.pic || "").trim(), now = mtNow_();
  var qty = Number(t.qty) || 0, price = Number(t.price) || 0;
  var obj = {
    "Tender ID": id, "Sales PIC": String(t.pic || ""), "Bệnh viện": String(t.hosp || ""),
    "Account": String(t.account || ""), "Product group": String(t.prod || ""),
    "Product detail": String(t.detail || ""), "Số lượng": qty, "Đơn vị": String(t.unit || ""),
    "Đơn giá (VND)": price, "Giá trị (VND)": qty * price, "Trạng thái": String(t.status || ""),
    "Kết quả": String(t.won || ""), "Tháng KQTT": String(t.kqtt || ""),
    "Hiệu lực (tháng)": Number(t.valid) || "", "NPP": String(t.npp || ""), "Ghi chú": mtCell_(t.note || ""),
    "Updated by": by, "Updated at": now, "Deleted": ""
  };
  if (!mtFindRow_(sh, id)) { obj["Created by"] = by; obj["Created at"] = now; }
  mtWriteRow_(sh, id, obj);
  var r = mtFindRow_(sh, id), H = mtHdr_(sh), v = sh.getRange(r, 1, 1, H.n).getValues()[0], o = {};
  H.list.forEach(function (h, j) { h = String(h || "").trim(); if (h) o[h] = v[j]; });
  return { ok: true, tender: mtTenderObj_(o) };
}
function mtTenderDelete_(q) {
  var id = String(q.id || "").trim();
  var sh = mtSheet_(MT_CFG.SH_TENDER, MT_TENDER_HDR, MT_TENDER_TEXT);
  if (!mtFindRow_(sh, id)) return { ok: false, error: "Không tìm thấy gói thầu " + id };
  mtWriteRow_(sh, id, { "Deleted": "x", "Updated by": String(q.by || q.pic || ""), "Updated at": mtNow_() });
  return { ok: true, id: id };
}

/* ───────── EMAIL ───────── */
function mtMail_(q) {
  var clean = function (arr) {
    arr = mtJ_(arr); if (typeof arr === "string") arr = arr.split(/[,;\s]+/);
    var out = [];
    (arr || []).forEach(function (x) { x = String(x || "").trim(); if (MT_CFG.MAIL_RE.test(x) && out.indexOf(x) < 0) out.push(x); });
    return out;
  };
  var to = clean(q.to), cc = clean(q.cc).filter(function (x) { return to.indexOf(x) < 0; });
  if (!to.length) return { ok: false, error: "Chưa có người nhận hợp lệ (chỉ nhận địa chỉ @manimedicalhanoi.com)" };
  var subject = String(q.subject || "Cập nhật hoạt động Surgical Team").slice(0, 200);
  var html = String(q.html || "");
  if (!html) return { ok: false, error: "Email trống" };
  var opt = { to: to.join(","), subject: subject, htmlBody: html, name: MT_CFG.MAIL_NAME };
  if (cc.length) opt.cc = cc.join(",");
  var rp = String(q.replyTo || "").trim();
  if (MT_CFG.MAIL_RE.test(rp)) opt.replyTo = rp;
  MailApp.sendEmail(opt);

  /* đóng dấu đã gửi lên các biên bản của tuần */
  var ids = mtJ_(q.ids) || [], now = mtNow_();
  if (typeof ids === "string") ids = ids.split(",");
  if (ids.length) {
    mtLocked_(function () {
      var sh = mtSheet_(MT_CFG.SH_MEET, MT_MEET_HDR, MT_MEET_TEXT);
      ids.forEach(function (id) {
        id = String(id || "").trim();
        if (id && mtFindRow_(sh, id)) mtWriteRow_(sh, id, { "Emailed at": now, "Emailed to": to.concat(cc).join(", ") });
      });
      mtBump_();
      return true;
    });
  }
  var left = -1; try { left = MailApp.getRemainingDailyQuota(); } catch (e) {}
  return { ok: true, message: "Đã gửi email tới " + to.join(", ") + (cc.length ? " (cc " + cc.join(", ") + ")" : ""),
           sentAt: now, quota: left };
}