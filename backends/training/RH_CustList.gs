/* ════════════════════════════════════════════════════════════════════════════════════════════════
   RH_CustList.gs — v1.0 (13/10/2026) · SHEET "Customer list" TRONG MMH - Training Master
   ─────────────────────────────────────────────────────────────────────────────────────────────
   Người dùng yêu cầu: sales lên kế hoạch đào tạo khách hàng phải chọn được ĐẠI LÝ (Dealer) và NHÀ PHÂN PHỐI (Distributor)
   của mọi sales Nha khoa ở cột Target Audience của sheet Training Report.
   ① Đồng bộ 1 chiều (mỗi giờ + lần đầu ngay khi backend được gọi): file CRM Dental ▸ tab "1. CUSTOMER CODE" (Account type = Dealer /
      Distributor) ⇒ sheet "Customer list" (ghi đè toàn bộ dữ liệu, KHÔNG gõ tay vào sheet này — sửa khách ở CRM).
      Tên chọn (cột B) = "DTB - <tên NPP>" / "Dealer - <tên đại lý>" (giống cách đang ghi "DTB - Hùng Vĩ").
   ② Cột "Danh sách chọn Target Audience" (cột M) = các nhóm ở Master!F (giữ nguyên như cũ) + toàn bộ khách ở cột B
      ⇒ ô Target Audience (cột K) của mọi sheet "Training Report FYxx" lấy danh sách thả xuống từ cột M này
      (chế độ "cảnh báo" — vẫn gõ được nhiều tên như trước). Master!F không bị đổi ⇒ Training Hub vẫn dùng nhóm người nhận như cũ.
   Hàm chạy tay trong trình soạn: tclSyncNow(). Không dùng dịch vụ Google mới (SpreadsheetApp, ScriptApp, PropertiesService).
   ════════════════════════════════════════════════════════════════════════════════════════════════ */
var TCL = {
  VER      : '1.0',
  SHEET    : 'Customer list',
  DENTAL_ID: '13aLqhO4H7he4LeHWNCdwNRhGXcIzieuNtFcA0BJJJj0',     // MMH_Dental_CRM (backend crm-dental)
  TAB      : '1. CUSTOMER CODE', DATA_ROW: 4,
  COL      : { code: 2, name: 3, type: 4, address: 5, province: 6, area: 7, pic: 8 },
  REPORT_RE: /^training report fy\d+$/,
  HEAD     : ['No', 'Target Audience (tên chọn)', 'Account name', 'Account type', 'Customer code', 'Province', 'Area', 'Sales PIC', 'Address', 'Nguồn', '', 'Danh sách chọn Target Audience'],
  OPT_COL  : 13, ROW0: 4,
  EVERY_H  : 1
};
function tclKind_(t) {
  var k = hubDeaccent(String(t || '')).toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^(distributor|npp|nha phan phoi)/.test(k)) return 'DTB';
  if (/^(dealer|dai ly)/.test(k)) return 'Dealer';
  return '';
}
/* đọc đại lý / NPP của file CRM Dental */
function tclRead_() {
  var sh = SpreadsheetApp.openById(TCL.DENTAL_ID).getSheetByName(TCL.TAB);
  if (!sh) throw new Error('File CRM Dental không có tab "' + TCL.TAB + '"');
  var lr = sh.getLastRow(), C = TCL.COL, out = [], seen = {};
  if (lr < TCL.DATA_ROW) return out;
  sh.getRange(TCL.DATA_ROW, 1, lr - TCL.DATA_ROW + 1, C.pic).getValues().forEach(function (r) {
    var name = hubNorm(r[C.name - 1]).replace(/\s+/g, ' '), kind = tclKind_(r[C.type - 1]);
    if (!name || !kind) return;
    var label = kind + ' - ' + name, k = label.toLowerCase();
    if (seen[k]) return; seen[k] = 1;
    out.push({ label: label, name: name, type: hubNorm(r[C.type - 1]), kind: kind, code: hubNorm(r[C.code - 1]), province: hubNorm(r[C.province - 1]),
               area: hubNorm(r[C.area - 1]), pic: hubNorm(r[C.pic - 1]), address: hubNorm(r[C.address - 1]) });
  });
  out.sort(function (a, b) { return (a.kind === b.kind ? 0 : a.kind === 'DTB' ? -1 : 1) || a.pic.localeCompare(b.pic) || a.name.localeCompare(b.name); });
  return out;
}
function tclMasterAud_() {
  var out = [];
  try {
    var ms = hubSheet(HUB.SHEETS.MASTER, false), lr = ms.getLastRow();
    if (lr >= 3) ms.getRange(3, 6, lr - 2, 1).getValues().forEach(function (r) { var v = hubNorm(r[0]); if (v && out.indexOf(v) < 0) out.push(v); });
  } catch (e) {}
  return out;
}
function tclSync_(why) {
  var ss = hubSS(), list = tclRead_(), aud = tclMasterAud_(), t0 = Date.now();
  var sh = ss.getSheetByName(TCL.SHEET), isNew = !sh;
  if (!sh) sh = ss.insertSheet(TCL.SHEET);
  var NC = TCL.OPT_COL, R0 = TCL.ROW0;
  var opts = aud.slice(); list.forEach(function (x) { if (opts.indexOf(x.label) < 0) opts.push(x.label); });
  var n = Math.max(list.length, opts.length, 1);
  if (sh.getMaxColumns() < NC) sh.insertColumnsAfter(sh.getMaxColumns(), NC - sh.getMaxColumns());
  if (sh.getMaxRows() < R0 + n + 5) sh.insertRowsAfter(sh.getMaxRows(), R0 + n + 5 - sh.getMaxRows());
  var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  sh.getRange(1, 1, 2, 2).setValues([['', 'CUSTOMER LIST — Đại lý (Dealer) & Nhà phân phối (DTB) của Dental sales · tự đồng bộ từ CRM Dental mỗi giờ · KHÔNG gõ tay vào sheet này'],
                                     ['', 'Cập nhật ' + now + ' · ' + list.length + ' khách (' + list.filter(function (x) { return x.kind === 'DTB'; }).length + ' NPP) · nguồn: MMH_Dental_CRM ▸ ' + TCL.TAB + ' · cột M = danh sách thả xuống của ô Target Audience (sheet Training Report)']]);
  var last = Math.max(sh.getLastRow(), R0);
  if (last >= R0) sh.getRange(R0, 1, last - R0 + 1, NC).clearContent();
  var rows = [];
  for (var i = 0; i < n; i++) {
    var x = list[i], r = x ? ['', i + 1, x.label, x.name, x.type, x.code, x.province, x.area, x.pic, x.address, 'CRM Dental', '', opts[i] || '']
                           : ['', '', '', '', '', '', '', '', '', '', '', '', opts[i] || ''];
    rows.push(r.slice(1, NC + 1));
  }
  sh.getRange(R0, 2, n, NC - 1).setValues(rows.map(function (r) { return r.slice(0, NC - 1); }));
  if (isNew || sh.getRange(3, 2).getValue() !== TCL.HEAD[0]) {
    sh.getRange(3, 2, 1, TCL.HEAD.length).setValues([TCL.HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047');
    sh.getRange(1, 2).setFontWeight('bold').setFontSize(13).setFontColor('#003047');
    sh.getRange(2, 2).setFontColor('#6B7280').setFontStyle('italic');
    sh.setFrozenRows(3); sh.setColumnWidth(1, 16); sh.setColumnWidth(3, 300); sh.setColumnWidth(4, 260); sh.setColumnWidth(10, 280); sh.setColumnWidth(13, 300);
    sh.getRange(3, TCL.OPT_COL, 1, 1).setBackground('#FFF2CC');
    try { sh.setTabColor('#3A5CAA'); } catch (e) {}
  }
  var nv = tclValidate_(ss, sh.getRange(R0, TCL.OPT_COL, Math.max(opts.length, 1), 1));
  PropertiesService.getScriptProperties().setProperty('TCL_AT', String(Date.now()));
  var msg = list.length + ' khách · ' + opts.length + ' lựa chọn · Target Audience ở ' + nv + ' sheet · ' + Math.round((Date.now() - t0) / 1000) + 's';
  try { hubLog('INFO', 'tclSync ' + (why || ''), msg, ''); } catch (e) {}
  return { ok: true, customers: list.length, options: opts.length, sheets: nv, msg: msg };
}
/* ô Target Audience (cột K) của mọi sheet "Training Report FYxx" ⇒ danh sách thả xuống = cột M của Customer list */
function tclValidate_(ss, optRange) {
  var n = 0;
  ss.getSheets().forEach(function (sh) {
    if (!TCL.REPORT_RE.test(hubNorm(sh.getName()).toLowerCase())) return;
    var lc = Math.min(sh.getLastColumn(), 40), top = sh.getRange(1, 1, Math.min(10, sh.getMaxRows()), lc).getValues(), hr = -1, col = -1;
    for (var i = 0; i < top.length && hr < 0; i++) for (var j = 0; j < top[i].length; j++) if (hubKey(top[i][j]) === 'targetaudience') { hr = i + 1; col = j + 1; break; }
    if (hr < 0) return;
    var r0 = hr + 1, cnt = sh.getMaxRows() - hr; if (cnt < 1) return;
    var cur = null; try { cur = sh.getRange(r0, col).getDataValidation(); } catch (e) {}
    var b = cur ? cur.copy() : SpreadsheetApp.newDataValidation();
    sh.getRange(r0, col, cnt, 1).setDataValidation(b.requireValueInRange(optRange, true).setAllowInvalid(true).build());
    n++;
  });
  return n;
}
function tclSync() { try { return tclSync_('trigger'); } catch (e) { try { hubLog('ERROR', 'tclSync', String(e && e.message || e), ''); } catch (e2) {} return { ok: false, error: String(e) }; } }
function tclSyncNow() { var r = tclSync_('manual'); Logger.log(JSON.stringify(r)); return r; }
/* gọi ở đầu mỗi lượt (hubDispatch): lần đầu ⇒ cài trigger mỗi giờ + chạy ngay ở nền; không làm chậm lượt gọi */
function tclTick_() {
  var P = PropertiesService.getScriptProperties();
  if (P.getProperty('TCL_TRIG') === TCL.VER) return;
  var last = Number(P.getProperty('TCL_TRY') || 0); if (Date.now() - last < 10 * 60000) return;
  P.setProperty('TCL_TRY', String(Date.now()));
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'tclSync') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('tclSync').timeBased().everyHours(TCL.EVERY_H).create();
  ScriptApp.newTrigger('tclSync').timeBased().after(5000).create();
  P.setProperty('TCL_TRIG', TCL.VER);
}
