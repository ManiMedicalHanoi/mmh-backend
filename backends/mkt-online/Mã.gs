// ============================================================
// GOOGLE APPS SCRIPT - CALENDAR CONTENT MAPPING v4
// ============================================================

var MONTHS = ["202509","202510","202511","202512","202601","202602","202603","202604","202605","202606","202607","202608"];
var COL_D = 4;
var FONT = "Lexend";
var CONTENT_FONT_SIZE = 10;

var STATUS_PENDING_LIST = ["Chờ duyệt", "Phát sinh", "Pending"];
var STATUS_DONE_LIST = ["On air đúng hạn", "On air muộn"];
var ALL_STATUSES = ["Chờ duyệt", "Phát sinh", "Pending", "On air đúng hạn", "On air muộn", "Cancel"];

var STATUS_ICONS = {
  "Chờ duyệt": "⏳", "Phát sinh": "🆕", "Pending": "⏸️",
  "On air đúng hạn": "✅", "On air muộn": "⚠️", "Cancel": "❌"
};

// Format master: Design post, Video, Reels, Story, Photo
var FORMAT_ICONS = {
  "Design post": "🎨",
  "Video": "🎬",
  "Reels": "🎞️",
  "Story": "📱",
  "Photo": "📷"
};

var COLOR = {
  headerBg: "#2C3E50", headerFont: "#FFFFFF",
  totalBg: "#EBF5FB", monthHeaderBg: "#34495E", monthHeaderFont: "#FFFFFF",
  summaryBg: "#FEF9E7", summaryFont: "#7D6608",
  cellBorder: "#E5E8EB", altRowBg1: "#FFFFFF", altRowBg2: "#F7F9FC",
  pageBold: "#2C3E50", pillarColor: "#5D6D7E",
  statusGreen: "#2E7D56", statusOrange: "#C27A1A",
  statusRed: "#B0413E", statusGray: "#95A5A6",
  cancelText: "#AAAAAA", linkBlue: "#2980B9", filterBg: "#FDFEFE",
  summaryCountFont: "#5B4A1E", summaryDetailFont: "#8C7A3F",
  formatColor: "#6C7A89"
};

// ============================================================
// MENU & TRIGGERS
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu("📅 Calendar Sync")
    .addItem("🔄 Cập nhật Calendar Product", "updateCalendarProduct")
    .addItem("🔄 Cập nhật Calendar Event", "updateCalendarEvent")
    .addItem("🔄 Cập nhật tất cả", "updateAll")
    .addItem("⚙️ Thiết lập Filter", "setupFilters")
    .addItem("⚙️ Cài đặt Auto Trigger", "installTrigger")
    .addToUi();
}

function onEdit(e) {
  try { mktaOnEdit_(e); } catch (_e) {}            // ⭐ 13/10/2026: Ngày điền link / On-air thực tế / Status / Check deadline — phản hồi tức thì
  var name = e.source.getActiveSheet().getName();
  if (name === "PRODUCT REPORT") updateCalendarProduct();
  else if (name === "EVENT REPORT") updateCalendarEvent();
  else if (name === "CALENDAR PRODUCT CONTENT") {
    var r = e.range.getRow(), c = e.range.getColumn();
    if ((r === 3 || r === 4) && c === 3) updateCalendarProduct();
  } else if (name === "CALENDAR EVENT CONTENT") {
    if (e.range.getRow() === 3 && e.range.getColumn() === 3) updateCalendarEvent();
  }
}

function updateAll() {
  updateCalendarProduct();
  updateCalendarEvent();
  SpreadsheetApp.getActive().toast("Đã cập nhật xong!", "✅ Hoàn tất");
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === "onEdit") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onEdit").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getActive().toast("Đã cài trigger!", "✅");
}

// ============================================================
// SETUP FILTERS
// ============================================================
function setupFilters() {
  var ss = SpreadsheetApp.getActive();
  var prSheet = ss.getSheetByName("PRODUCT REPORT");
  var calProd = ss.getSheetByName("CALENDAR PRODUCT CONTENT");
  if (prSheet && calProd) {
    var prData = getSheetData(prSheet, 4);
    calProd.getRange("C3").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["All page"].concat(unique(prData, 6))).build()).setValue("All page").setFontFamily(FONT);
    calProd.getRange("C4").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["All Pillar"].concat(unique(prData, 4))).build()).setValue("All Pillar").setFontFamily(FONT);
  }
  var erSheet = ss.getSheetByName("EVENT REPORT");
  var calEvt = ss.getSheetByName("CALENDAR EVENT CONTENT");
  if (erSheet && calEvt) {
    var erData = getSheetData(erSheet, 5);
    calEvt.getRange("C3").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["All page"].concat(unique(erData, 6))).build()).setValue("All page").setFontFamily(FONT);
  }
  SpreadsheetApp.getActive().toast("Đã thiết lập filter!", "✅");
}

// ============================================================
// UPDATE CALENDAR PRODUCT CONTENT
// ============================================================
function updateCalendarProduct() {
  var ss = SpreadsheetApp.getActive();
  var prSheet = ss.getSheetByName("PRODUCT REPORT");
  var calSheet = ss.getSheetByName("CALENDAR PRODUCT CONTENT");
  if (!prSheet || !calSheet) return;

  var prData = getSheetData(prSheet, 4);
  var filterPage = calSheet.getRange("C3").getValue() || "All page";
  var filterPillar = calSheet.getRange("C4").getValue() || "All Pillar";

  var filtered = prData.filter(function(row) {
    if (filterPage !== "All page" && str(row[6]) !== filterPage) return false;
    if (filterPillar !== "All Pillar" && str(row[4]) !== filterPillar) return false;
    return true;
  });

  var types = unique(filtered, 3);
  var clearEnd = Math.max(calSheet.getLastRow(), 7 + types.length + 2);
  if (clearEnd >= 5) calSheet.getRange(5, 2, clearEnd - 4, 14).clearContent().clearFormat().setBorder(false,false,false,false,false,false);

  styleHeaderRow(calSheet, 5, true);
  writeSummaryRow(calSheet, 6, filtered, MONTHS, function(r) { return str(r[24]); }, 2, 3);

  for (var t = 0; t < types.length; t++) {
    var typeName = types[t];
    var rowNum = 7 + t;
    var typeRows = filtered.filter(function(r) { return str(r[3]) === typeName; });
    var isAlt = (t % 2 === 1);

    calSheet.getRange(rowNum, 2).setValue(typeName).setFontFamily(FONT).setFontSize(12)
      .setFontWeight("bold").setFontColor(COLOR.headerBg)
      .setBackground(isAlt ? COLOR.altRowBg2 : COLOR.altRowBg1).setVerticalAlignment("middle");

    calSheet.getRange(rowNum, 3).setValue(typeRows.length).setFontFamily(FONT).setFontSize(14)
      .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBackground(COLOR.totalBg).setFontColor(COLOR.headerBg);

    for (var m = 0; m < MONTHS.length; m++) {
      var col = COL_D + m;
      var mTypeRows = typeRows.filter(function(r) { return fmtMonth(r[2]) === MONTHS[m]; });
      var cell = calSheet.getRange(rowNum, col);
      cell.setBackground(isAlt ? COLOR.altRowBg2 : COLOR.altRowBg1)
        .setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
        .setFontFamily(FONT).setFontSize(CONTENT_FONT_SIZE);

      if (mTypeRows.length === 0) { cell.setValue(""); continue; }
      cell.setRichTextValue(buildProductRichText(mTypeRows));
    }
    calSheet.getRange(rowNum, 2, 1, 14).setBorder(null, null, true, null, null, null, COLOR.cellBorder, SpreadsheetApp.BorderStyle.SOLID);
  }

  calSheet.setColumnWidth(2, 140); calSheet.setColumnWidth(3, 100);
  for (var m = 0; m < 12; m++) calSheet.setColumnWidth(COL_D + m, 310);
}

// ============================================================
// UPDATE CALENDAR EVENT CONTENT
// ============================================================
function updateCalendarEvent() {
  var ss = SpreadsheetApp.getActive();
  var erSheet = ss.getSheetByName("EVENT REPORT");
  var calSheet = ss.getSheetByName("CALENDAR EVENT CONTENT");
  if (!erSheet || !calSheet) return;

  var erData = getSheetData(erSheet, 5);
  var filterPage = calSheet.getRange("C3").getValue() || "All page";
  var filtered = erData.filter(function(r) {
    if (filterPage !== "All page" && str(r[6]) !== filterPage) return false;
    return true;
  });

  var pillars = unique(filtered, 7);
  var clearEnd = Math.max(calSheet.getLastRow(), 7 + pillars.length + 2);
  if (clearEnd >= 5) calSheet.getRange(5, 2, clearEnd - 4, 14).clearContent().clearFormat().setBorder(false,false,false,false,false,false);

  styleHeaderRow(calSheet, 5, false);
  writeSummaryRow(calSheet, 6, filtered, MONTHS, function(r) { return str(r[13]); }, 3);

  for (var p = 0; p < pillars.length; p++) {
    var pillarName = pillars[p];
    var rowNum = 7 + p;
    var pRows = filtered.filter(function(r) { return str(r[7]) === pillarName; });
    var isAlt = (p % 2 === 1);

    calSheet.getRange(rowNum, 2).setValue(pillarName).setFontFamily(FONT).setFontSize(12)
      .setFontWeight("bold").setFontColor(COLOR.headerBg)
      .setBackground(isAlt ? COLOR.altRowBg2 : COLOR.altRowBg1).setVerticalAlignment("middle");

    calSheet.getRange(rowNum, 3).setValue(pRows.length).setFontFamily(FONT).setFontSize(14)
      .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setBackground(COLOR.totalBg).setFontColor(COLOR.headerBg);

    for (var m = 0; m < MONTHS.length; m++) {
      var col = COL_D + m;
      var mPRows = pRows.filter(function(r) { return fmtMonth(r[3]) === MONTHS[m]; });
      var cell = calSheet.getRange(rowNum, col);
      cell.setBackground(isAlt ? COLOR.altRowBg2 : COLOR.altRowBg1)
        .setVerticalAlignment("top").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
        .setFontFamily(FONT).setFontSize(CONTENT_FONT_SIZE);
      if (mPRows.length === 0) { cell.setValue(""); continue; }
      cell.setRichTextValue(buildEventRichText(mPRows));
    }
    calSheet.getRange(rowNum, 2, 1, 14).setBorder(null, null, true, null, null, null, COLOR.cellBorder, SpreadsheetApp.BorderStyle.SOLID);
  }

  calSheet.setColumnWidth(2, 160); calSheet.setColumnWidth(3, 100);
  for (var m = 0; m < 12; m++) calSheet.setColumnWidth(COL_D + m, 310);
}

// ============================================================
// SUMMARY ROW (2-line RichText)
// ============================================================
function writeSummaryRow(sheet, rowNum, filtered, months, getStatusFn, monthIdx, groupIdx) {
  var grandTotal = 0;
  var grandStatus = initStatusCount();
  var grandGroup = {};

  for (var m = 0; m < months.length; m++) {
    var mStr = months[m];
    var mRows = filtered.filter(function(r) { return fmtMonth(r[monthIdx]) === mStr; });
    var cnt = mRows.length;
    grandTotal += cnt;

    var ls = initStatusCount();
    var lg = {};
    mRows.forEach(function(r) {
      var s = getStatusFn(r);
      if (ls.hasOwnProperty(s)) { ls[s]++; grandStatus[s]++; }
      if (groupIdx !== undefined) {
        var g = str(r[groupIdx]) || "Other";
        lg[g] = (lg[g] || 0) + 1;
        grandGroup[g] = (grandGroup[g] || 0) + 1;
      }
    });

    var cell = sheet.getRange(rowNum, COL_D + m);
    cell.setRichTextValue(buildSummaryRichText(cnt, ls, groupIdx !== undefined ? lg : null));
    styleSummaryCell(cell);
  }

  var c6 = sheet.getRange(rowNum, 3);
  c6.setRichTextValue(buildSummaryRichText(grandTotal, grandStatus, groupIdx !== undefined ? grandGroup : null));
  styleSummaryCell(c6);
}

function buildSummaryRichText(count, statusMap, groupMap) {
  var builder = SpreadsheetApp.newRichTextValue();

  // Line 1: "X post" + optional type breakdown "(Jizai: 02 | Composite: 01)"
  var line1 = count + " post";
  if (groupMap && Object.keys(groupMap).length > 0) {
    var gParts = [];
    var keys = Object.keys(groupMap).sort();
    keys.forEach(function(k) {
      var num = groupMap[k];
      gParts.push(k + ": " + (num < 10 ? "0" : "") + num);
    });
    line1 += "  (" + gParts.join("  |  ") + ")";
  }

  // Line 2: status breakdown
  var parts = [];
  ALL_STATUSES.forEach(function(s) {
    if (statusMap[s] > 0) parts.push((STATUS_ICONS[s] || "") + " " + s + ": " + statusMap[s]);
  });
  var line2 = parts.join("  |  ");
  var fullText = line1 + "\n" + line2;
  builder.setText(fullText);

  builder.setTextStyle(0, line1.length,
    SpreadsheetApp.newTextStyle().setBold(true).setFontSize(11).setFontFamily(FONT).setForegroundColor(COLOR.summaryCountFont).build());
  if (line2.length > 0) {
    builder.setTextStyle(line1.length + 1, fullText.length,
      SpreadsheetApp.newTextStyle().setBold(false).setFontSize(8).setFontFamily(FONT).setForegroundColor(COLOR.summaryDetailFont).build());
  }
  return builder.build();
}

// ============================================================
// BUILD RICH TEXT - PRODUCT
// Hiển thị: Page > Pillar : Topic > Format icon > Status > Post
// (Đã loại bỏ dòng Content)
// ============================================================
function buildProductRichText(rows) {
  var builder = SpreadsheetApp.newRichTextValue();
  var fullText = "";
  var styles = [];
  var links = [];

  for (var i = 0; i < rows.length; i++) {
    if (i > 0) fullText += "\n\n";

    var row = rows[i];
    var page = str(row[6]) || "N/A";       // G
    var pillar = str(row[4]) || "";         // E
    var topic = str(row[5]) || "";          // F
    var format = str(row[9]) || "";         // J
    var onairDK = row[10];                  // K
    var onairTT = row[11];                  // L
    var status = str(row[24]);              // Y
    var linkPost = str(row[26]) || "";      // AA

    var isCancelled = (status === "Cancel");
    var formatIcon = FORMAT_ICONS[format] || "📄";
    var statusIcon = STATUS_ICONS[status] || "❓";

    // Line 1: Page (bold)
    var line1 = (i + 1) + ". " + page;
    var l1s = fullText.length;
    fullText += line1 + "\n";
    styles.push({s: l1s, e: l1s + line1.length, bold: true, italic: false,
      color: isCancelled ? COLOR.cancelText : COLOR.pageBold, strike: isCancelled});

    // Line 2: Pillar : Topic
    var line2 = pillar + " : " + topic;
    var l2s = fullText.length;
    fullText += line2 + "\n";
    styles.push({s: l2s, e: l2s + pillar.length + 3, bold: false, italic: false,
      color: isCancelled ? COLOR.cancelText : COLOR.pillarColor, strike: isCancelled});
    if (topic) {
      var ts = l2s + pillar.length + 3;
      styles.push({s: ts, e: ts + topic.length, bold: false, italic: true,
        color: isCancelled ? COLOR.cancelText : COLOR.pillarColor, strike: isCancelled});
    }

    // Line 3: Format (icon + value only)
    var line3 = formatIcon + " " + format;
    var l3s = fullText.length;
    fullText += line3 + "\n";
    styles.push({s: l3s, e: l3s + line3.length, bold: false, italic: false,
      color: isCancelled ? COLOR.cancelText : COLOR.formatColor, strike: isCancelled});

    // Line 4: Status
    var statusLine;
    if (isCancelled) {
      statusLine = statusIcon + " Cancel";
    } else {
      statusLine = statusIcon + " " + buildStatusStr(status, onairDK, onairTT);
    }
    var l4s = fullText.length;
    fullText += statusLine + "\n";
    styles.push({s: l4s, e: l4s + statusLine.length, bold: false, italic: false,
      color: isCancelled ? COLOR.cancelText : getStatusColor(status), strike: isCancelled});

    // Line 5: Post link
    var l5s = fullText.length;
    if (!isCancelled && linkPost && linkPost.indexOf("http") === 0) {
      var pl = "🔗 Post";
      fullText += pl;
      links.push({s: l5s, e: l5s + pl.length, url: linkPost});
      styles.push({s: l5s, e: l5s + pl.length, bold: false, italic: false, color: COLOR.linkBlue, strike: false});
    } else if (isCancelled) {
      var cp = "🔗 Post: N/A";
      fullText += cp;
      styles.push({s: l5s, e: l5s + cp.length, bold: false, italic: false, color: COLOR.cancelText, strike: true});
    } else {
      var np = "🔗 Post: N/A";
      fullText += np;
      styles.push({s: l5s, e: l5s + np.length, bold: false, italic: false, color: COLOR.statusGray, strike: false});
    }
  }

  builder.setText(fullText);
  applyStyles(builder, styles);
  applyLinks(builder, links);
  return builder.build();
}

// ============================================================
// BUILD RICH TEXT - EVENT
// Hiển thị: Page > Event : TypeContent > KOL > Format icon > Status > Post
// (Đã loại bỏ dòng Content)
// ============================================================
function buildEventRichText(rows) {
  var builder = SpreadsheetApp.newRichTextValue();
  var fullText = "";
  var styles = [];
  var links = [];

  for (var i = 0; i < rows.length; i++) {
    if (i > 0) fullText += "\n\n";

    var row = rows[i];
    var page = str(row[6]) || "N/A";        // G
    var event = str(row[4]) || "";           // E
    var kol = str(row[5]) || "";             // F
    var typeContent = str(row[8]) || "";     // I
    var format = str(row[10]) || "";         // K
    var onairDK = row[11];                   // L
    var onairTT = row[12];                   // M
    var status = str(row[13]) || "";         // N
    var linkPost = str(row[15]) || "";       // P

    var isCancelled = (status === "Cancel");
    var formatIcon = FORMAT_ICONS[format] || "📄";
    var statusIcon = STATUS_ICONS[status] || "❓";

    // 1. Page (bold)
    var line1 = (i + 1) + ". " + page;
    var l1s = fullText.length;
    fullText += line1 + "\n";
    styles.push({s: l1s, e: l1s + line1.length, bold: true, italic: false,
      color: isCancelled ? COLOR.cancelText : COLOR.pageBold, strike: isCancelled});

    // 2. Event : "TypeContent"
    var line2 = event + " : \"" + typeContent + "\"";
    var l2s = fullText.length;
    fullText += line2 + "\n";
    styles.push({s: l2s, e: l2s + event.length + 4, bold: false, italic: false,
      color: isCancelled ? COLOR.cancelText : COLOR.pillarColor, strike: isCancelled});
    if (typeContent) {
      var tcs = l2s + event.length + 4;
      styles.push({s: tcs, e: tcs + typeContent.length, bold: false, italic: true,
        color: isCancelled ? COLOR.cancelText : COLOR.pillarColor, strike: isCancelled});
    }

    // 3. KOL (nếu có)
    if (kol) {
      var kolLine = "👤 KOL: " + kol;
      var kls = fullText.length;
      fullText += kolLine + "\n";
      styles.push({s: kls, e: kls + kolLine.length, bold: false, italic: false,
        color: isCancelled ? COLOR.cancelText : COLOR.formatColor, strike: isCancelled});
    }

    // 4. Format (icon + value only)
    var fmtLine = formatIcon + " " + format;
    var fls = fullText.length;
    fullText += fmtLine + "\n";
    styles.push({s: fls, e: fls + fmtLine.length, bold: false, italic: false,
      color: isCancelled ? COLOR.cancelText : COLOR.formatColor, strike: isCancelled});

    // 5. Status
    var statusLine;
    if (isCancelled) {
      statusLine = statusIcon + " Cancel";
    } else {
      statusLine = statusIcon + " " + buildStatusStr(status, onairDK, onairTT);
    }
    var l5s = fullText.length;
    fullText += statusLine + "\n";
    styles.push({s: l5s, e: l5s + statusLine.length, bold: false, italic: false,
      color: isCancelled ? COLOR.cancelText : getStatusColor(status), strike: isCancelled});

    // 6. Post link
    var l6s = fullText.length;
    if (!isCancelled && linkPost && linkPost.indexOf("http") === 0) {
      var pl = "🔗 Post";
      fullText += pl;
      links.push({s: l6s, e: l6s + pl.length, url: linkPost});
      styles.push({s: l6s, e: l6s + pl.length, bold: false, italic: false, color: COLOR.linkBlue, strike: false});
    } else {
      var np = "🔗 Post: N/A";
      fullText += np;
      styles.push({s: l6s, e: l6s + np.length, bold: false, italic: false,
        color: isCancelled ? COLOR.cancelText : COLOR.statusGray, strike: isCancelled});
    }
  }

  builder.setText(fullText);
  applyStyles(builder, styles);
  applyLinks(builder, links);
  return builder.build();
}

// ============================================================
// STYLE HELPERS
// ============================================================
function applyStyles(builder, styles) {
  for (var i = 0; i < styles.length; i++) {
    var st = styles[i];
    if (st.s >= st.e) continue;
    builder.setTextStyle(st.s, st.e, SpreadsheetApp.newTextStyle()
      .setFontFamily(FONT).setFontSize(CONTENT_FONT_SIZE)
      .setForegroundColor(st.color).setBold(st.bold || false)
      .setItalic(st.italic || false).setStrikethrough(st.strike || false).build());
  }
}

function applyLinks(builder, links) {
  for (var i = 0; i < links.length; i++) {
    var lk = links[i];
    if (lk.s < lk.e) builder.setLinkUrl(lk.s, lk.e, lk.url);
  }
}

function styleHeaderRow(sheet, rowNum, isProduct) {
  sheet.getRange(rowNum, 2).setValue(isProduct ? "Type" : "Pillar")
    .setFontFamily(FONT).setFontSize(12).setFontWeight("bold")
    .setBackground(COLOR.headerBg).setFontColor(COLOR.headerFont)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.getRange(rowNum, 3).setValue("Total")
    .setFontFamily(FONT).setFontSize(12).setFontWeight("bold")
    .setBackground(COLOR.headerBg).setFontColor(COLOR.headerFont)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  for (var m = 0; m < MONTHS.length; m++) {
    sheet.getRange(rowNum, COL_D + m).setValue(MONTHS[m])
      .setFontFamily(FONT).setFontSize(12).setFontWeight("bold")
      .setBackground(COLOR.monthHeaderBg).setFontColor(COLOR.monthHeaderFont)
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
  }
  sheet.setRowHeight(rowNum, 35);
}

function styleSummaryCell(cell) {
  cell.setFontFamily(FONT).setBackground(COLOR.summaryBg)
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
}

function buildStatusStr(status, onairDK, onairTT) {
  if (STATUS_PENDING_LIST.indexOf(status) >= 0) {
    return status + " - Dự kiến vào " + fmtDate(onairDK);
  } else {
    return status + " vào " + fmtDate(onairTT);
  }
}

function getStatusColor(status) {
  if (status === "On air đúng hạn") return COLOR.statusGreen;
  if (status === "On air muộn" || status === "Phát sinh") return COLOR.statusOrange;
  if (status === "Cancel") return COLOR.statusRed;
  return COLOR.statusGray;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function getSheetData(sheet, startRow) {
  var lr = sheet.getLastRow(), lc = sheet.getLastColumn();
  if (lr < startRow || lc < 1) return [];
  return sheet.getRange(startRow, 1, lr - startRow + 1, lc).getValues();
}

function unique(data, colIdx) {
  var seen = {}, result = [];
  data.forEach(function(r) { var v = str(r[colIdx]); if (v && !seen[v]) { seen[v] = true; result.push(v); } });
  return result;
}

function str(val) { return (val || "").toString().trim(); }

function fmtMonth(val) {
  if (val === null || val === undefined || val === "") return "";
  // Date object
  if (val instanceof Date) {
    var y = val.getFullYear(), m = val.getMonth() + 1;
    if (y >= 2020 && y <= 2030) return y.toString() + (m < 10 ? "0" : "") + m;
  }
  // Number: YYYYMM or serial date
  if (typeof val === "number") {
    var intVal = Math.round(val);
    if (intVal >= 202001 && intVal <= 203012) return intVal.toString();
    if (intVal > 40000 && intVal < 60000) {
      var sd = new Date(Date.UTC(1899, 11, 30 + intVal));
      var sy = sd.getUTCFullYear(), sm = sd.getUTCMonth() + 1;
      if (sy >= 2020 && sy <= 2030) return sy.toString() + (sm < 10 ? "0" : "") + sm;
    }
  }
  var s = val.toString().trim();
  if (/^\d{6}$/.test(s)) return s;
  var dm = s.match(/^(\d{6})\.\d*$/); if (dm) return dm[1];
  var dash = s.match(/^(\d{4})-(\d{1,2})$/); if (dash) return dash[1] + (dash[2].length===1?"0":"") + dash[2];
  var sl = s.match(/^(\d{1,2})\/(\d{4})$/); if (sl) return sl[2] + (sl[1].length===1?"0":"") + sl[1];
  var fd = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (fd) return fd[3] + (fd[2].length===1?"0":"") + fd[2];
  try { var p = new Date(s); if (!isNaN(p.getTime())) { var py=p.getFullYear(),pm=p.getMonth()+1; if(py>=2020&&py<=2030) return py+(pm<10?"0":"")+pm; } } catch(e) {}
  return s;
}

function fmtDate(val) {
  if (!val) return "N/A";
  if (val instanceof Date) { var d = val.getDate(), m = val.getMonth() + 1, y = val.getFullYear(); return (d<10?"0":"")+d+"/"+(m<10?"0":"")+m+"/"+y; }
  return val.toString() || "N/A";
}

function initStatusCount() { var m = {}; ALL_STATUSES.forEach(function(s) { m[s] = 0; }); return m; }

// ============================================================
// ⭐ 13/10/2026 — TỰ ĐỘNG KHI SỬA (bản đầy đủ + chuyển đổi bố cục chạy ở backend marketing ▸ MKT_SheetAuto.gs,
//    trigger onChange + 10 phút/lần). Ở đây chỉ xử lý NGAY các dòng vừa sửa — công thức GIỐNG HỆT bản backend.
//    EVENT REPORT / PRODUCT REPORT: có Link report ⇒ Ngày điền link = hôm nay (xoá link ⇒ xoá ngày) · On-air thực tế = công thức
//      theo Ngày điền link · Month = công thức theo On-air dự kiến · Status = On air đúng hạn / On air muộn (không đụng Cancel).
//    ORDER REPORT: có Task Result ⇒ Ngày điền link = hôm nay · Check deadline report = công thức On time / Late.
//    Chỉ dùng SpreadsheetApp của chính file ⇒ không cần cấp quyền mới (trigger đơn giản).
// ============================================================
var MKTA_TABS = { 'EVENT REPORT': 'post', 'PRODUCT REPORT': 'post', 'ORDER REPORT': 'order' };

function mktaK_(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}
function mktaA1c_(c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; }
function mktaD_(v) {
  if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var s = String(v == null ? '' : v).trim(), m;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
function mktaHasF_(f, marks) {
  var x = String(f || '').replace(/\s+/g, '').toUpperCase(); if (!x) return false;
  for (var i = 0; i < marks.length; i++) if (x.indexOf(String(marks[i]).replace(/\s+/g, '').toUpperCase()) < 0) return false;
  return true;
}
function mktaOnEdit_(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet(), c1 = e.range.getColumn(), c2 = c1 + e.range.getNumColumns() - 1;
  if (!MKTA_TABS[sh.getName()]) return;
  mktaFixRows_(sh, e.range.getRow(), e.range.getNumRows(), [c1, c2]);
}
/* xử lý các dòng r0 … r0+n-1 (gọi từ onEdit hoặc mmhWrite) · cols = [c1,c2] cột vừa sửa (bỏ trống = mọi cột) */
function mktaFixRows_(sh, r0, n, cols) {
  var kind = MKTA_TABS[sh.getName()]; if (!kind) return;
  var hr = 0, H = null, lc = sh.getLastColumn(), top = sh.getRange(1, 1, Math.min(8, sh.getLastRow()), lc).getValues();
  var must = kind === 'order' ? 'deadline' : 'onairthucte';
  for (var r = 0; r < top.length && !hr; r++) if (top[r].some(function (h) { return mktaK_(h) === must; })) { hr = r + 1; H = top[r]; }
  if (!hr) return;
  if (r0 <= hr) { n -= hr - r0 + 1; r0 = hr + 1; }
  if (n <= 0 || n > 400) return;                                     // dán khối lớn ⇒ để backend xử lý
  var C = {}; H.forEach(function (h, i) { var k = mktaK_(h); if (k && !C[k]) C[k] = i + 1; });
  var col = function (names) {
    for (var i = 0; i < names.length; i++) if (C[names[i]]) return C[names[i]];
    for (var j = 0; j < names.length; j++) for (var k in C) if (k.indexOf(names[j]) === 0) return C[k];
    return 0;
  };
  var hit = function (c) { return !cols || (c && c >= cols[0] && c <= cols[1]); };
  var V = sh.getRange(r0, 1, n, lc).getValues(), F = sh.getRange(r0, 1, n, lc).getFormulas();
  var t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  if (kind === 'post') {
    var cm = col(['month']), ck = col(['onairdukien']), cl = col(['onairthucte']), cs = col(['status']), co = col(['linkreport']), cp = col(['ngaydienlink']);
    if (!ck || !cl || !cs || !co || !cp) return;
    if (!(hit(co) || hit(ck) || hit(cl) || hit(cs))) return;
    var K = mktaA1c_(ck), O = mktaA1c_(co), P = mktaA1c_(cp), ON = 'On air đúng hạn', LATE = 'On air muộn';
    try {
      var dv = sh.getRange(hr + 1, cs).getDataValidation(), L = dv ? (dv.getCriteriaValues()[0] || []) : [];
      L.forEach(function (x) { if (mktaK_(x) === 'onairdunghan') ON = String(x); if (mktaK_(x) === 'onairmuon') LATE = String(x); });
    } catch (x) {}
    for (var i = 0; i < n; i++) {
      var row = r0 + i, v = V[i], f = F[i], link = String(v[co - 1] || '').trim(), plan = v[ck - 1];
      if (!link && !String(plan || '').trim() && !String(v[cp - 1] || '').trim()) continue;
      var sDay = mktaD_(v[cp - 1]), man = !f[cl - 1] ? mktaD_(v[cl - 1]) : null;
      if (link) {
        if (man && (!sDay || sDay.getTime() !== man.getTime())) { sDay = man; sh.getRange(row, cp).setValue(man); }
        else if (!sDay) { sDay = today; sh.getRange(row, cp).setValue(today); }
      } else if (String(v[cp - 1] || '').trim() !== '') { sDay = null; sh.getRange(row, cp).setValue(''); }
      if (!mktaHasF_(f[cl - 1], ['IFERROR(INT(' + P + row + ')', 'TRIM(' + O + row + ')']))
        sh.getRange(row, cl).setFormula('=IF(OR(TRIM(' + O + row + ')="",' + P + row + '=""),"",IFERROR(INT(' + P + row + '),""))').setNumberFormat('dd/mm/yyyy');
      if (cm && String(plan || '').trim() && !mktaHasF_(f[cm - 1], ['"yyyymm"', K + row]))
        sh.getRange(row, cm).setFormula('=IF(' + K + row + '="","",IFERROR(VALUE(TEXT(IF(ISNUMBER(' + K + row + '),' + K + row + ',DATEVALUE(' + K + row + ')),"yyyymm")),""))');
      var pDay = mktaD_(plan), st = String(v[cs - 1] || '').trim();
      if (link && pDay && sDay && !/cancel/i.test(st)) {
        var want = sDay.getTime() <= pDay.getTime() ? ON : LATE;
        if (mktaK_(st) !== mktaK_(want)) sh.getRange(row, cs).setValue(want);
      }
    }
  } else {
    var cd = col(['deadline']), ct = col(['keytaskevent', 'keytask']), cr = col(['taskresult']), cc = col(['checkdeadlinereport']), cq = col(['ngaydienlink']);
    if (!cd || !cr || !cc || !cq) return;
    if (!(hit(cr) || hit(cd) || hit(ct) || hit(cc) || hit(cq))) return;
    var D = mktaA1c_(cd), Q = mktaA1c_(cq);
    for (var j = 0; j < n; j++) {
      var rw = r0 + j, w = V[j];
      if (!String(w[cd - 1] || '').trim() && !(ct && String(w[ct - 1] || '').trim())) continue;
      if (String(w[cr - 1] || '').trim() && String(w[cq - 1] || '').trim() === '') sh.getRange(rw, cq).setValue(today);
      if (!mktaHasF_(F[j][cc - 1], ['"On time"', 'INT(' + Q + rw + ')', 'INT(' + D + rw + ')']))
        sh.getRange(rw, cc).setFormula('=IFERROR(IF(' + D + rw + '="","",IF(' + Q + rw + '<>"",IF(INT(' + Q + rw + ')<=INT(' + D + rw + '),"On time","Late"),' +
          'IF(TODAY()>INT(' + D + rw + '),"Late",""))),"")');
    }
  }
}
