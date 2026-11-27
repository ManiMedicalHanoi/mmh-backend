/* ═══════════════════════════════════════════════════════════════════════════════════════
   EV_Content.gs — v1.0 (27/11/2026) · Thailand Dental — ONLINE CONTENT log for KPI C17-07 (Sui)
   Sui (email 26/11/2026, agreed with Owen san): every piece of content published online counts, target 6 posts / month.
   There was no file listing the posts ⇒ C17-07 stayed empty. This file adds sheet "ONLINE CONTENT" to the event file:
     row 1 title · row 2 how to fill · row 3 header · data from row 4 (one row = one post)
     A Date posted · B Channel · C Content type · D Product · E Title / topic · F Link · G PIC · H Status · I Note
   KPI (kpi ▸ KpiThaiEvents.gs th_dent ▸ C17-07): rows with Status = Published and a link (http…), by the month of Date posted.
   Action (router in Mã.gs):  content {key = last 8 characters of the Sheet ID, op = status | setup | list}
     · status  READ ONLY: sheet names of the file, whether ONLINE CONTENT exists, rows per month
     · setup   creates the sheet when missing (an existing sheet is never touched: only missing drop-downs are added)
     · list    rows (date, channel, type, product, title, link, pic, status)
   ═══════════════════════════════════════════════════════════════════════════════════════ */
var EVCT = {
  SHEET: 'ONLINE CONTENT', HDR: 3, FIRST: 4, LAST: 1500,
  COLS: ['Date posted', 'Channel', 'Content type', 'Product', 'Title / topic', 'Link', 'PIC', 'Status', 'Note'],
  WIDTH: [110, 110, 150, 140, 320, 300, 70, 100, 220],
  CHANNELS: ['Facebook', 'LINE OA', 'Instagram', 'TikTok', 'YouTube', 'Website', 'Other'],
  TYPES: ['Product', 'Event', 'Education / Clinical', 'Promotion', 'Company / Brand', 'Other'],
  PRODUCTS: ['Jizai and handfile', 'Bur', 'Composite', 'Bond', 'Several products', 'Other', '-'],
  STATUS: ['Published', 'Planned', 'Cancelled'],
  TITLE: 'THAILAND DENTAL – ONLINE CONTENT FY68',
  HOW: 'One row = one post. Fill: Date posted · Channel · Content type · Product · Title · Link (required) · PIC · Status. ' +
       'KPI C17-07 counts the rows with Status = Published and a link, by the month of Date posted (KPI file updated about every 5 minutes). ' +
       'Plan a post ahead: Status = Planned, change it to Published and paste the link once it is online.'
};

function evContent_(p){
  if(evStr_(p.key) !== EV_CFG.SHEET_ID.slice(-8)) return { ok:false, code:'KEY' };
  var op = evStr_(p.op) || 'status';
  if(op === 'setup'){
    var lock = LockService.getScriptLock();
    try{ lock.waitLock(25000); }catch(e){ return { ok:false, error:'busy' }; }
    try{ return evcSetup_(); } finally { lock.releaseLock(); }
  }
  if(op === 'list') return { ok:true, rows: evcRows_() };
  return evcStatus_();
}

function evcStatus_(){
  var ss = evSS_(), s = ss.getSheetByName(EVCT.SHEET), out = { ok:true, file: ss.getName(),
    sheets: ss.getSheets().map(function(x){ return x.getName() + (x.isSheetHidden() ? ' (hidden)' : ''); }), exists: !!s };
  if(!s) return out;
  var rows = evcRows_(), by = {};
  rows.forEach(function(r){ var m = r.date.slice(0, 7) || '?', o = by[m] || (by[m] = { rows:0, published:0, counted:0 }); o.rows++;
    if(r.status === 'Published'){ o.published++; if(/^https?:\/\//i.test(r.link)) o.counted++; } });
  out.rows = rows.length; out.byMonth = by; out.url = ss.getUrl() + '#gid=' + s.getSheetId();
  return out;
}

/* data rows (any status) — header found by name in the first 6 rows */
function evcRows_(){
  var s = evSS_().getSheetByName(EVCT.SHEET); if(!s) return [];
  var lr = s.getLastRow(); if(lr < 2) return [];
  var lc = Math.min(Math.max(s.getLastColumn(), EVCT.COLS.length), 20);
  var V = s.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
  for(var i = 0; i < Math.min(6, V.length) && hr < 0; i++){
    var h = V[i].map(function(x){ return evStr_(x).toLowerCase(); });
    if(h.indexOf('date posted') >= 0 && h.indexOf('link') >= 0){ hr = i; h.forEach(function(x, k){ if(x && C[x] == null) C[x] = k; }); }
  }
  if(hr < 0) return [];
  function g(r, name){ var k = C[name]; return k == null ? '' : r[k]; }
  var out = [];
  for(var r = hr + 1; r < V.length; r++){
    var x = V[r], d = g(x, 'date posted'), link = evStr_(g(x, 'link')), title = evStr_(g(x, 'title / topic'));
    if(!d && !link && !title) continue;
    var iso = (d instanceof Date && !isNaN(d)) ? Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd') : (evParseDate_(d).start || '');
    out.push({ row: r + 1, date: iso, channel: evStr_(g(x, 'channel')), type: evStr_(g(x, 'content type')), product: evStr_(g(x, 'product')),
               title: title, link: link, pic: evStr_(g(x, 'pic')), status: evStr_(g(x, 'status')) });
  }
  return out;
}

function evcSetup_(){
  var ss = evSS_(), s = ss.getSheetByName(EVCT.SHEET), made = false;
  if(!s){
    s = ss.insertSheet(EVCT.SHEET, ss.getSheets().length); made = true;
    var n = EVCT.COLS.length;
    s.getRange(1, 1).setValue(EVCT.TITLE).setFontSize(14).setFontWeight('bold').setFontColor('#003047');
    s.getRange(2, 1, 1, n).merge().setValue(EVCT.HOW).setWrap(true).setFontColor('#595959').setFontStyle('italic').setVerticalAlignment('top');
    s.setRowHeight(2, 48);
    s.getRange(EVCT.HDR, 1, 1, n).setValues([EVCT.COLS]).setFontWeight('bold').setBackground('#CFE2F3').setFontColor('#003047')
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    s.setFrozenRows(EVCT.HDR);
    EVCT.WIDTH.forEach(function(w, i){ s.setColumnWidth(i + 1, w); });
    if(s.getMaxColumns() > n + 2) s.deleteColumns(n + 3, s.getMaxColumns() - n - 2);
    if(s.getMaxRows() < EVCT.LAST) s.insertRowsAfter(s.getMaxRows(), EVCT.LAST - s.getMaxRows());
    s.getRange(EVCT.FIRST, 1, EVCT.LAST - EVCT.FIRST + 1, 1).setNumberFormat('dd mmm yyyy');
    s.getRange(EVCT.FIRST, 5, EVCT.LAST - EVCT.FIRST + 1, 2).setWrap(true);
  }
  var added = evcRules_(s);
  SpreadsheetApp.flush();
  evLog_('system', 'content-setup', '', EVCT.SHEET, made ? 'sheet created' : 'sheet existed · drop-downs added: ' + added);
  var st = evcStatus_(); st.created = made; st.rulesAdded = added;
  return st;
}

/* drop-downs / date picker / link check on the data rows — only where a column has none yet */
function evcRules_(s){
  var n = EVCT.LAST - EVCT.FIRST + 1, f = EVCT.FIRST, added = [];
  function list(vals, help){ return SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(false).setHelpText(help).build(); }
  var R = {
    1: SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText('Date the post went online — double-click to pick a date.').build(),
    2: list(EVCT.CHANNELS, 'Where the post was published.'),
    3: list(EVCT.TYPES, 'What the post is about.'),
    4: list(EVCT.PRODUCTS, 'Main product of the post ("-" = none).'),
    6: SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=OR(F' + f + '="",REGEXMATCH(F' + f + ',"^https?://"))')
         .setAllowInvalid(false).setHelpText('Paste the full link of the post (https://…). Required for Status = Published.').build(),
    7: list(EV_CFG.KPI_PICS, 'Who made / posted the content.'),
    8: list(EVCT.STATUS, 'Published = online (counted in KPI C17-07) · Planned · Cancelled.')
  };
  Object.keys(R).forEach(function(c){
    var rg = s.getRange(f, +c, n, 1);
    if(rg.getCell(1, 1).getDataValidation()) return;
    rg.setDataValidation(R[c]); added.push(EVCT.COLS[+c - 1]);
  });
  return added.join(', ') || 'none';
}
