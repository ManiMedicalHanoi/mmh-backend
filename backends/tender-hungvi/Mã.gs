/**************************************************************************************************
 * MMH · HÙNG VĨ TENDER FEED — Google Apps Script Web App backend  (v7 · FULL / dán-là-chạy)
 * ------------------------------------------------------------------------------------------------
 * Gắn vào Spreadsheet "1.3 Tender Authorization list MMH- Hung Vi FY66.xlsx"
 *   • sheet "Tender FY66"          — header dòng 7, data từ dòng 8
 *   • sheet "Master Hospital name" — bảng BV (header DÒNG 4: STT|Name|Address|Provinces|Type)
 *                                    + cột "Master City name" (danh sách tỉnh chuẩn)
 *   • sheet "FC_LOG"               — ẩn, lưu chỉnh sửa forecast (dòng Duy trì/Mở mới điền tay)
 *   • sheet "ACCT_PLAN"            — ẩn, lưu kế hoạch địa bàn (opp/note/SL Mani) theo BV × kỳ
 *
 * BẢN NÀY GỘP SẴN v3 (core) + v4 (sync + delete) + v5 (ACCT_PLAN) + v6 (masterList) + v7
 * (provinceList + addMaster). doGet/doPost đã route đủ MỌI action — KHÔNG cần chèn tay gì thêm.
 *
 * ENDPOINT:
 *   GET  ?                          → { ok, meta, rows[], summary{}, log{}, acctPlan{}, master[], provinces[] }
 *   GET  ?action=ping               → health check
 *   GET  ?action=acctPlan[&fy=FY68] → kế hoạch địa bàn
 *   GET  ?action=masterList         → danh sách chủ đầu tư [{name,prov,type}]
 *   GET  ?action=provinceList       → danh sách tỉnh/thành chuẩn
 *   GET  ?action=syncPreview        → thử đồng bộ dao Win → tender tổng (không ghi)
 *   GET  ?action=syncTender         → đồng bộ thật
 *   POST { action:'saveLog',     rows:[…] }            → ghi FC_LOG
 *   POST { action:'clearLog' }                         → xoá FC_LOG
 *   POST { action:'deleteLog',   rowKeys:[…] }         → xoá dòng plan
 *   POST { action:'saveAcctPlan',rows:[…] }            → upsert ACCT_PLAN
 *   POST { action:'delAcctPlan', keys:[…] }            → xoá dòng ACCT_PLAN
 *   POST { action:'addMaster',   name, prov, type }    → thêm BV vào Master Hospital name
 *   POST { action:'syncTender',  dryRun }              → đồng bộ dao Win → tender tổng
 *
 * Deploy: Deploy → Manage deployments → Edit → New version → Deploy (giữ URL /exec).
 * © MANI Medical Hanoi — internal tool.
 **************************************************************************************************/

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  CONFIG
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
var CONFIG = {
  NPP:        'HUNGVI',
  REGION:     'North',
  SHEET_NAME: 'Tender FY66',
  START_ROW:  8,
  HEADER_ROW: 7,
  MASTER_SHEET: 'Master Hospital name'
};

var PERIODS = {
  FY66: { start: '2024-09-01', end: '2025-08-31' },
  FY67: { start: '2025-09-01', end: '2026-08-31' },
  FY68: { start: '2026-09-01', end: '2027-08-31' },
  FY69: { start: '2027-09-01', end: '2028-08-31' }
};

var PRICE_NPP_DEFAULT = { MST: 70000, MSL: 120000, MCU: 125000, MVR: 0 };
var FX_DEFAULT = 26400;   // VND/USD

var COL_ALIASES = {
  tbmt:      ['Số thông báo mời thầu', 'So thong bao moi thau', 'TBMT'],
  hospital:  ['Hospital name', 'Tên bệnh viện', 'Chủ đầu tư', 'Hospital'],
  city:      ['City', 'Tỉnh', 'Tỉnh/Thành', 'Province'],
  effDate:   ['Ngày hiệu lực', 'Ngay hieu luc'],
  expDate:   ['Ngày hết hạn', 'Ngay het han'],
  signed:    ['Singed date yyyymmdd', 'Singed date', 'Signed date'],
  fy:        ['FY'],
  month:     ['Month', 'Tháng'],
  pcode:     ['Product code', 'Ma san pham', 'Mã sản phẩm'],
  qty:       ['Quantity', 'Số lượng', 'So luong'],
  price:     ['Price (VND)', 'Giá (VND)', 'Gia (VND)'],
  unit:      ['Unit', 'Đơn vị'],
  result:    ['Result of Tender', 'Ket qua', 'Kết quả', 'Result'],
  wonProduct:['Product'],
  wonQty:    ['Quantity'],
  wonPrice:  ['Price (VND)'],
  approve:   ['Ngày phê duyệt gói thầu', 'Ngay phe duyet goi thau', 'Ngày phê duyệt'],
  duration:  ['Thời gian thực hiện gói thầu ( Tháng)', 'Thời gian thực hiện gói thầu (Tháng)',
              'Thoi gian thuc hien goi thau', 'Thời gian thực hiện'],
  tenFolder: ['Ten folder', 'Ten Folder']
};

var LOG_SHEET  = 'FC_LOG';
var LOG_HEADERS = ['rowKey','group','account','tbmt','region','potential','dur','expMonth','mst','msl','mcu','note','updatedBy','ts'];

/* ACCT_PLAN (kế hoạch địa bàn) */
var ACCT_SHEET   = 'ACCT_PLAN';
var ACCT_HEADERS = ['key','fy','account','accountNorm','city','opp','note',
                    'msl','mst','mcu','group','startMonth','dur','updatedBy','ts'];

/* Master Hospital name — header thật ở DÒNG 4 */
var MASTER_HEADER_ROW = 4;

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  ENTRY POINTS — đã route đủ MỌI action (v3+v4+v5+v6+v7)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function doGet(e) {
  var payload;
  try {
    if (e && e.parameter && e.parameter.action === 'winMap') return jsonOut_(e, wmPayload_(e.parameter));   // MMH_WinMap.gs — Bản đồ trúng thầu
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'ping')         return jsonOut_(e, { ok:true, ts:new Date().toISOString(), npp:CONFIG.NPP });
    if (action === 'acctPlan')     return jsonOut_(e, { ok:true, plan: readAcctPlan_(e && e.parameter && e.parameter.fy) });
    if (action === 'masterList')   return jsonOut_(e, { ok:true, master: readMasterList_() });
    if (action === 'provinceList') return jsonOut_(e, { ok:true, provinces: readProvinceList_() });
    if (action === 'syncTender')   return jsonOut_(e, syncKnifeWinsToTender_(false));
    if (action === 'syncPreview')  return jsonOut_(e, syncKnifeWinsToTender_(true));

    var price = parsePriceParam_(e && e.parameter && e.parameter.price) || PRICE_NPP_DEFAULT;
    var fx    = (e && e.parameter && +e.parameter.fx > 0) ? +e.parameter.fx : FX_DEFAULT;

    payload = buildPayload(price, fx);
    payload.log       = readLog_();
    payload.acctPlan  = readAcctPlan_();       // gửi kèm để frontend đỡ request
    payload.master    = readMasterList_();
    payload.provinces = readProvinceList_();
  } catch (err) {
    payload = { ok:false, error:String(err && err.stack || err), npp:CONFIG.NPP };
  }
  return jsonOut_(e, payload);
}

function doPost(e) {
  var res;
  try {
    var body   = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || 'saveLog';
    if (action === 'saveLog')            res = { ok:true, saved:   writeLog_(body.rows || []), npp:CONFIG.NPP };
    else if (action === 'clearLog')    { clearLog_(); res = { ok:true, cleared:true, npp:CONFIG.NPP }; }
    else if (action === 'deleteLog')     res = { ok:true, deleted: deleteLog_(body.rowKeys || []), npp:CONFIG.NPP };
    else if (action === 'saveAcctPlan')  res = { ok:true, saved:   writeAcctPlan_(body.rows || []), npp:CONFIG.NPP };
    else if (action === 'delAcctPlan')   res = { ok:true, deleted: deleteAcctPlan_(body.keys || []), npp:CONFIG.NPP };
    else if (action === 'addMaster')     res = addMasterHospital_(body.name, body.prov, body.type);
    else if (action === 'syncTender')    res = syncKnifeWinsToTender_(!!body.dryRun);
    else                                 res = { ok:false, error:'Unknown action: ' + action };
  } catch (err) {
    res = { ok:false, error:String(err && err.message || err) };
  }
  return jsonOut_(e, res);
}

function jsonOut_(e, payload) {
  var s = JSON.stringify(payload);
  if (e && e.parameter && e.parameter.callback) {
    return ContentService.createTextOutput(e.parameter.callback + '(' + s + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function parsePriceParam_(s) {
  if (!s) return null;
  var out = {}, any = false;
  String(s).split(',').forEach(function (kv) {
    var p = kv.split(':');
    if (p.length === 2) {
      var k = p[0].trim().toUpperCase(), v = +String(p[1]).replace(/[^\d.]/g, '');
      if (k && isFinite(v)) { out[k] = v; any = true; }
    }
  });
  if (!any) return null;
  Object.keys(PRICE_NPP_DEFAULT).forEach(function (k) { if (out[k] == null) out[k] = PRICE_NPP_DEFAULT[k]; });
  return out;
}

function buildPayload(priceNPP, fx) {
  priceNPP = priceNPP || PRICE_NPP_DEFAULT;
  fx = fx || FX_DEFAULT;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_NAME + '"');

  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < CONFIG.START_ROW) {
    return { ok: true, meta: metaObj_(0, 0, priceNPP, fx), rows: [], summary: emptySummary_() };
  }

  var headerVals = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var colIdx = resolveColumns_(headerVals);

  var nRows = lastRow - CONFIG.START_ROW + 1;
  var data  = sh.getRange(CONFIG.START_ROW, 1, nRows, lastCol).getValues();
  var tz    = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';

  var master = readMasterHospitals_(ss);   // {normName: cleanName}

  var out = [], scanned = 0;
  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    var pcodeRaw  = getCell_(row, colIdx.pcode);
    var resultRaw = getCell_(row, colIdx.result);
    var tbmtRaw   = getCell_(row, colIdx.tbmt);
    if (isBlank_(pcodeRaw) && isBlank_(resultRaw) && isBlank_(tbmtRaw)) continue;
    scanned++;

    /* ── LỌC DAO: Product code (O) bắt đầu MST/MSL/MSK/MCU/MVR ──
       Chỉ khâu = mã thuần số (1406, 2090…) → tự loại.
       Ghim da  = MANIPLER/MSU/AZ            → loại trong classifyKnife_. */
    var knife = classifyKnife_(pcodeRaw);
    if (!knife.isKnife) continue;

    /* SL: ưu tiên cột U (SL TRÚNG thực tế) khi Win; fallback cột P (SL dự thầu). */
    var qtyBid = toNum_(getCell_(row, colIdx.qty));
    var qtyWon = toNum_(getCell_(row, colIdx.wonQty));
    var result = normResult_(resultRaw);
    var qty    = (result === 'Win' && qtyWon > 0) ? qtyWon : (qtyBid || qtyWon || knife.qtyHint || 0);

    /* Phân bổ SL theo nhóm dao (1 dòng = 1 loại → toàn bộ qty vào loại đó). */
    var grp  = knifeGroups_(knife.codes);
    var nGrp = (grp.MST?1:0) + (grp.MSL?1:0) + (grp.MCU?1:0) + (grp.MVR?1:0);
    var qMST = 0, qMSL = 0, qMCU = 0, qMVR = 0, mixedFlag = false;
    if (nGrp === 1) {
      if (grp.MST) qMST = qty; else if (grp.MSL) qMSL = qty;
      else if (grp.MCU) qMCU = qty; else if (grp.MVR) qMVR = qty;
    } else if (nGrp > 1) {
      mixedFlag = true;
      var per = qty / nGrp;
      if (grp.MST) qMST = per;
      if (grp.MSL) qMSL = per;
      if (grp.MCU) qMCU = per;
      if (grp.MVR) qMVR = per;
    }

    var price = toNum_(getCell_(row, colIdx.price));
    if (!price) price = toNum_(getCell_(row, colIdx.wonPrice));

    /* ⚠ Cột G/H = hạn NỘP thầu (vài tuần), KHÔNG phải hợp đồng.
       Hợp đồng thật = Ngày phê duyệt (Y) → +Z tháng. */
    var approve = parseDate_(getCell_(row, colIdx.approve), tz);
    var effDate = parseDate_(getCell_(row, colIdx.effDate), tz);

    var durRaw   = getCell_(row, colIdx.duration);
    var hasDur   = !isBlank_(durRaw);
    var duration = parseDuration_(durRaw);
    if (duration < 1 || duration > 36) duration = 12;

    var startDate  = approve.iso ? approve : (effDate.iso ? effDate : null);
    var expiration = startDate ? addMonths_(startDate.dateObj, duration, tz) : null;

    /* ⭐ Đủ điều kiện tính demand/doanh số? (§0 + §3.2 nguồn A)
       Cần: Win + qty>0 + có ngày phê duyệt + có số tháng.  Thiếu → loại khỏi demand. */
    var demandOK = (result === 'Win') && qty > 0 && !!approve.iso && hasDur;

    /* Overlap / usage / revenue theo từng FY (chỉ khi demandOK). */
    var fyMetrics = {};
    Object.keys(PERIODS).forEach(function (fyk) {
      var ov = demandOK ? overlapMonths_(startDate.dateObj, duration, PERIODS[fyk]) : 0;
      var usg = (demandOK && duration) ? (qty * ov / duration) : 0;
      var unitPrice =
        qMST ? (priceNPP.MST || 0) :
        qMSL ? (priceNPP.MSL || 0) :
        qMCU ? (priceNPP.MCU || 0) :
        qMVR ? (priceNPP.MVR || 0) : 0;
      fyMetrics[fyk] = {
        overlap: ov,
        usage:   usg,
        usageMST: qty ? usg * (qMST / qty) : 0,
        usageMSL: qty ? usg * (qMSL / qty) : 0,
        usageMCU: qty ? usg * (qMCU / qty) : 0,
        revenueVND: usg * unitPrice,
        revenueUSD: usg * unitPrice / fx
      };
    });

    var hospRaw = String(getCell_(row, colIdx.hospital) || '').trim();
    var tenFold = String(getCell_(row, colIdx.tenFolder) || '').trim();
    var signed  = String(getCell_(row, colIdx.signed) || '').trim();

    out.push({
      npp:        CONFIG.NPP,
      region:     CONFIG.REGION,
      tbmt:       normTBMT_(tbmtRaw),
      tbmtRaw:    String(tbmtRaw == null ? '' : tbmtRaw).trim(),
      pkgKey:     packageKey_(normTBMT_(tbmtRaw), tenFold, hospRaw, signed),
      hospital:   hospRaw,
      hospitalStd: master[normName_(hospRaw)] || hospRaw,   // join Master Hospital name
      city:       String(getCell_(row, colIdx.city) || '').trim(),
      fy:         normFY_(getCell_(row, colIdx.fy)),
      month:      normMonth_(getCell_(row, colIdx.month), startDate),
      pcodeRaw:   String(pcodeRaw || '').trim(),
      unit:       String(getCell_(row, colIdx.unit) || '').trim(),
      knifeType:  knife.type,
      knifeCodes: knife.codes,
      qty:        qty,
      qtyBid:     qtyBid,
      qtyWon:     qtyWon,
      qtyMST:     qMST,
      qtyMSL:     qMSL,
      qtyMCU:     qMCU,
      qtyMVR:     qMVR,
      mixedType:  mixedFlag,
      price:      price,
      value:      qty * price,
      result:     result,
      approveISO: approve.iso,
      approveSerial: approve.serial,
      effISO:     effDate.iso,
      effSerial:  effDate.serial,
      durationMonths: duration,
      hasDuration: hasDur,
      expirationISO:  expiration ? expiration.iso : '',
      expirationSerial: expiration ? expiration.serial : null,
      demandOK:   demandOK,          // ⭐ false = KHÔNG tính vào demand/doanh số
      fy:         normFY_(getCell_(row, colIdx.fy)),
      m:          fyMetrics,         // { FY66:{overlap,usage,revenueUSD…}, FY67:{…}, FY68:{…} }
      row:        CONFIG.START_ROW + i
    });
  }

  return {
    ok: true,
    meta: metaObj_(out.length, scanned, priceNPP, fx),
    rows: out,
    summary: buildSummary_(out, priceNPP, fx)
  };
}

function metaObj_(knifeRows, scannedRows, priceNPP, fx) {
  return {
    npp:      CONFIG.NPP,
    region:   CONFIG.REGION,
    sheet:    CONFIG.SHEET_NAME,
    startRow: CONFIG.START_ROW,
    exported: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'),
    rows:     scannedRows,
    knifeRows: knifeRows,
    periods:  PERIODS,
    priceNPP: priceNPP,
    fx:       fx
  };
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  §2 — OVERLAP THEO CHỈ SỐ THÁNG (không tính theo ngày)
 *  Gói KQTT T03/2026 hiệu lực 12 tháng, FY67 kết thúc T08/2026 ⇒ chỉ 6 tháng rơi vào FY67.
 *  ⇒ Demand FY67 = SL × 6 / 12   (giả định tiêu thụ đều theo tháng)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function monthIndex_(d) { return d.getFullYear() * 12 + (d.getMonth() + 1); }

function overlapMonths_(startDate, durationMonths, period) {
  if (!startDate || !durationMonths) return 0;
  var ms = monthIndex_(startDate);                        // tháng bắt đầu gói
  var me = ms + Number(durationMonths);                   // tháng kết thúc (exclusive)
  var ps = monthIndex_(new Date(period.start));           // tháng đầu kỳ
  var pe = monthIndex_(new Date(period.end)) + 1;         // tháng cuối kỳ + 1 (exclusive)
  return Math.max(0, Math.min(me, pe) - Math.max(ms, ps));
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  §4 — KHOÁ GÓI THẦU + FUNNEL THAM DỰ / WIN / FAIL
 *  Ưu tiên TBMT. 93/204 dòng dao KHÔNG có TBMT → fallback "Ten folder" (= signedDate + hospital).
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function packageKey_(tbmt, tenFolder, hospital, signed) {
  var t = String(tbmt || '').trim();
  if (t && t !== '—') return t.toUpperCase();
  var f = String(tenFolder || '').trim();
  if (f) return 'NOTBMT|' + f.toUpperCase();
  return 'NOTBMT|' + String(hospital || '').toUpperCase() + '|' + String(signed || '');
}

/* Gộp trạng thái nhiều DÒNG dao trong 1 GÓI → 1 trạng thái gói (theo thứ tự ưu tiên). */
function packageStatus_(results) {
  if (results.indexOf('Win')     >= 0) return 'Win';      // trúng ít nhất 1 mã dao
  if (results.indexOf('Fail')    >= 0) return 'Fail';     // không mã nào trúng, có mã trượt
  if (results.indexOf('Pending') >= 0) return 'Pending';
  return 'Cancel';
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  SUMMARY — tiền-tính cho frontend (FY67 sales · Hùng Vĩ performance · FY68 forecast)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function emptySummary_() {
  return { funnel: {}, byFY: {}, byRegion: {}, byProvince: {}, byKnife: {}, expiring: [] };
}

function buildSummary_(rows, priceNPP, fx) {
  var S = emptySummary_();

  /* ── A. FUNNEL theo cột FY (M) — dùng CẢ dòng Fail/Pending (không có ngày phê duyệt) ── */
  var byFYpkg = {};                       // { FY67: { pkgKey: [results…] } }
  rows.forEach(function (r) {
    var fy = r.fy || 'N/A';
    if (!byFYpkg[fy]) byFYpkg[fy] = {};
    if (!byFYpkg[fy][r.pkgKey]) byFYpkg[fy][r.pkgKey] = { results: [], hospital: r.hospitalStd, city: r.city };
    byFYpkg[fy][r.pkgKey].results.push(r.result);
  });
  Object.keys(byFYpkg).forEach(function (fy) {
    var pk = byFYpkg[fy];
    var st = { joined: 0, Win: 0, Fail: 0, Pending: 0, Cancel: 0, hospitals: 0 };
    var hosp = {};
    Object.keys(pk).forEach(function (k) {
      st.joined++;
      st[packageStatus_(pk[k].results)]++;
      if (pk[k].hospital) hosp[pk[k].hospital.toUpperCase()] = 1;
    });
    st.hospitals = Object.keys(hosp).length;
    st.winRate = st.joined ? (st.Win / st.joined * 100) : 0;
    S.funnel[fy] = st;
  });

  /* ── B. DEMAND / DOANH SỐ theo kỳ (chỉ dòng demandOK) ── */
  Object.keys(PERIODS).forEach(function (fyk) {
    var live = rows.filter(function (r) { return r.demandOK && r.m[fyk].overlap > 0; });
    var pkgs = {}, hosp = {};
    var agg = { qty: 0, usage: 0, usageMST: 0, usageMSL: 0, usageMCU: 0, revVND: 0, revUSD: 0, lines: live.length };
    live.forEach(function (r) {
      var mm = r.m[fyk];
      agg.qty      += r.qty;
      agg.usage    += mm.usage;
      agg.usageMST += mm.usageMST;
      agg.usageMSL += mm.usageMSL;
      agg.usageMCU += mm.usageMCU;
      agg.revVND   += mm.revenueVND;
      agg.revUSD   += mm.revenueUSD;
      pkgs[r.pkgKey] = 1;
      if (r.hospitalStd) hosp[r.hospitalStd.toUpperCase()] = 1;
    });
    agg.packages  = Object.keys(pkgs).length;
    agg.hospitals = Object.keys(hosp).length;
    S.byFY[fyk] = agg;

    /* theo Tỉnh (địa bàn) */
    var prov = {};
    live.forEach(function (r) {
      var p = r.city || '(Không rõ)';
      if (!prov[p]) prov[p] = { province: p, qty: 0, usage: 0, revUSD: 0, packages: {}, hospitals: {} };
      prov[p].qty    += r.qty;
      prov[p].usage  += r.m[fyk].usage;
      prov[p].revUSD += r.m[fyk].revenueUSD;
      prov[p].packages[r.pkgKey] = 1;
      if (r.hospitalStd) prov[p].hospitals[r.hospitalStd.toUpperCase()] = 1;
    });
    S.byProvince[fyk] = Object.keys(prov).map(function (k) {
      var o = prov[k];
      return { province: o.province, qty: o.qty, usage: o.usage, revUSD: o.revUSD,
               packages: Object.keys(o.packages).length, hospitals: Object.keys(o.hospitals).length };
    }).sort(function (a, b) { return b.usage - a.usage; });

    /* theo Loại dao */
    S.byKnife[fyk] = {
      MST: { usage: agg.usageMST, revUSD: agg.usageMST * (priceNPP.MST || 0) / fx },
      MSL: { usage: agg.usageMSL, revUSD: agg.usageMSL * (priceNPP.MSL || 0) / fx },
      MCU: { usage: agg.usageMCU, revUSD: agg.usageMCU * (priceNPP.MCU || 0) / fx }
    };
  });

  /* ── C. GÓI SẮP HẾT HIỆU LỰC (≤ 4 tháng tới) → cơ hội renew cho FY68 ── */
  var now = new Date(), horizon = new Date(now.getFullYear(), now.getMonth() + 4, now.getDate());
  var seen = {};
  rows.forEach(function (r) {
    if (!r.demandOK || !r.expirationSerial) return;
    if (seen[r.pkgKey]) return;
    var ed = new Date(r.expirationSerial);
    if (ed >= now && ed <= horizon) {
      seen[r.pkgKey] = 1;
      S.expiring.push({
        pkgKey: r.pkgKey, tbmt: r.tbmt, hospital: r.hospitalStd, city: r.city,
        expirationISO: r.expirationISO, qty: r.qty, durationMonths: r.durationMonths,
        monthsLeft: Math.max(0, Math.round((ed - now) / 2592000000))
      });
    }
  });
  S.expiring.sort(function (a, b) { return a.monthsLeft - b.monthsLeft; });

  return S;
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  MASTER HOSPITAL NAME (chuẩn hoá tên BV)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function readMasterHospitals_(ss) {
  var map = {};
  var sh = ss.getSheetByName(CONFIG.MASTER_SHEET);
  if (!sh) return map;
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 2 || lc < 1) return map;
  var vals = sh.getRange(1, 1, lr, Math.min(lc, 3)).getValues();
  vals.forEach(function (r) {
    var raw = String(r[0] || '').trim();
    var std = String(r[1] || '').trim() || raw;
    if (raw) map[normName_(raw)] = std;
  });
  return map;
}
function normName_(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  FC_LOG (sheet ẩn — lưu chỉnh sửa forecast của user)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function getLogSheet_(create) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(LOG_SHEET);
  if (!sh && create) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
    sh.setFrozenRows(1);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}
function readLog_() {
  var sh = getLogSheet_(false);
  if (!sh) return {};
  var lr = sh.getLastRow();
  if (lr < 2) return {};
  var vals = sh.getRange(2, 1, lr - 1, LOG_HEADERS.length).getValues();
  var map = {};
  vals.forEach(function (r) {
    var key = r[0]; if (!key) return;
    map[key] = {
      group: r[1], account: r[2], tbmt: r[3], region: r[4],
      potential: r[5] || '', dur: numOrNull_(r[6]), expMonth: r[7] || '',
      mst: numOrNull_(r[8]), msl: numOrNull_(r[9]), mcu: numOrNull_(r[10]),
      note: r[11] || '', updatedBy: r[12] || '', ts: r[13] || ''
    };
  });
  return map;
}
function writeLog_(rows) {
  if (!rows || !rows.length) return 0;
  var sh = getLogSheet_(true);
  var lr = sh.getLastRow();
  var existing = {};
  if (lr >= 2) {
    var keys = sh.getRange(2, 1, lr - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0]) existing[keys[i][0]] = i + 2;
  }
  var who = '';
  try { who = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  rows.forEach(function (r) {
    var row = [ r.rowKey||'', r.group||'', r.account||'', r.tbmt||'', r.region||'',
      r.potential||'', r.dur==null?'':r.dur, r.expMonth||'',
      r.mst==null?'':r.mst, r.msl==null?'':r.msl, r.mcu==null?'':r.mcu,
      r.note||'', who, now ];
    if (existing[r.rowKey]) sh.getRange(existing[r.rowKey], 1, 1, LOG_HEADERS.length).setValues([row]);
    else sh.appendRow(row);
  });
  return rows.length;
}
function clearLog_() {
  var sh = getLogSheet_(false);
  if (!sh) return;
  var lr = sh.getLastRow();
  if (lr >= 2) sh.getRange(2, 1, lr - 1, LOG_HEADERS.length).clearContent();
}
function numOrNull_(v) { if (v === '' || v == null) return null; var n = +v; return isFinite(n) ? n : null; }

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  COLUMN RESOLUTION
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function resolveColumns_(headerVals) {
  var norm = headerVals.map(function (h) { return normHeader_(h); });

  function findAll(aliases) {
    var hits = [];
    aliases.forEach(function (a) {
      var an = normHeader_(a);
      for (var i = 0; i < norm.length; i++) {
        if (norm[i] === an && hits.indexOf(i) < 0) hits.push(i);
      }
    });
    return hits;
  }
  function first(aliases) { var h = findAll(aliases).sort(function(a,b){return a-b;}); return h.length ? h[0] : -1; }

  /* Cột TRÙNG tên (Quantity, Price, Product xuất hiện 2 lần):
   *   cột thứ 1 = "Document from MMH" (dự trù) → qty/price
   *   cột thứ 2 = "Result of Tender"  (kết quả) → wonQty/wonPrice/wonProduct */
  var qtyHits   = findAll(COL_ALIASES.qty).sort(function(a,b){return a-b;});
  var priceHits = findAll(COL_ALIASES.price).sort(function(a,b){return a-b;});
  var prodHits  = findAll(COL_ALIASES.wonProduct).sort(function(a,b){return a-b;});

  var map = {
    tbmt:     first(COL_ALIASES.tbmt),
    hospital: first(COL_ALIASES.hospital),
    city:     first(COL_ALIASES.city),
    effDate:  first(COL_ALIASES.effDate),
    expDate:  first(COL_ALIASES.expDate),
    signed:   first(COL_ALIASES.signed),
    fy:       first(COL_ALIASES.fy),
    month:    first(COL_ALIASES.month),
    pcode:    first(COL_ALIASES.pcode),
    unit:     first(COL_ALIASES.unit),
    qty:      qtyHits.length   ? qtyHits[0]   : -1,
    price:    priceHits.length ? priceHits[0] : -1,
    wonProduct: prodHits.length ? prodHits[0] : -1,
    wonQty:   qtyHits.length   > 1 ? qtyHits[1]   : -1,
    wonPrice: priceHits.length > 1 ? priceHits[1] : -1,
    result:   first(COL_ALIASES.result),
    approve:  first(COL_ALIASES.approve),
    duration: first(COL_ALIASES.duration),
    tenFolder: first(COL_ALIASES.tenFolder)
  };

  /* Fallback cứng theo layout Hùng Vĩ (0-based):
   *  C=2 TBMT · D=3 hosp · E=4 city · G=6 eff · H=7 exp · L=11 signed · M=12 FY · N=13 month
   *  O=14 pcode · P=15 qty · Q=16 price · R=17 unit · S=18 result · T=19 prod
   *  U=20 wonQty · V=21 wonPrice · Y=24 approve · Z=25 duration · AB=27 tenFolder */
  var HARD = { tbmt:2, hospital:3, city:4, effDate:6, expDate:7, signed:11, fy:12, month:13,
               pcode:14, qty:15, price:16, unit:17, result:18, wonProduct:19, wonQty:20,
               wonPrice:21, approve:24, duration:25, tenFolder:27 };
  Object.keys(HARD).forEach(function (k) { if (map[k] < 0) map[k] = HARD[k]; });

  return map;
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  HELPERS
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function getCell_(row, idx) { return (idx == null || idx < 0 || idx >= row.length) ? '' : row[idx]; }
function isBlank_(v) { return v === null || v === undefined || String(v).trim() === ''; }

function normHeader_(h) {
  return String(h == null ? '' : h).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
function normTBMT_(t) {
  if (t == null) return '';
  return String(t).replace(/[\s\r\n]+/g, '').replace(/-\d+$/, '');   // IB2400456868-01 → IB2400456868
}
function normResult_(r) {
  var s = String(r || '').trim().toLowerCase();
  if (!s) return '';
  if (s.indexOf('win') >= 0)    return 'Win';
  if (s.indexOf('pend') >= 0)   return 'Pending';
  if (s.indexOf('cancel') >= 0) return 'Cancel';
  if (s.indexOf('fail') >= 0 || s.indexOf('lose') >= 0 || s.indexOf('lost') >= 0) return 'Fail';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function normFY_(v) {
  if (isBlank_(v)) return '';
  var s = String(v).replace(/[^\d]/g, '');
  return s ? ('FY' + s) : '';
}
function normMonth_(v, startDate) {
  if (!isBlank_(v)) {
    if (v instanceof Date) return pad2_(v.getMonth() + 1) + '/' + v.getFullYear();
    var s = String(v).trim().replace(/\.0$/, '');
    var m6 = s.match(/^(\d{4})(\d{2})$/);           if (m6) return m6[2] + '/' + m6[1];
    var m1 = s.match(/^(\d{4})[-\/](\d{1,2})$/);    if (m1) return pad2_(m1[2]) + '/' + m1[1];
    var m2 = s.match(/^(\d{1,2})[\/-](\d{4})$/);    if (m2) return pad2_(m2[1]) + '/' + m2[2];
  }
  if (startDate && startDate.dateObj) {
    var d = startDate.dateObj;
    return pad2_(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  return '';
}
function parseDuration_(v) {
  if (isBlank_(v)) return 12;
  var s = String(v).replace(/[^\d]/g, '');
  var n = parseInt(s, 10);
  return (isFinite(n) && n > 0) ? n : 12;
}
function parseDate_(v, tz) {
  var empty = { iso: '', serial: null, dateObj: null };
  if (isBlank_(v)) return empty;
  if (v instanceof Date && !isNaN(v.getTime())) return dateOut_(v, tz);
  if (typeof v === 'number') {
    if (v > 19000000 && v < 30000000) return fromYYYYMMDD_(String(Math.round(v)), tz);   // YYYYMMDD
    if (v > 20000 && v < 80000) {                                                        // Sheets serial
      var d = new Date(Math.round((v - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return dateOut_(d, tz);
    }
  }
  var s = String(v).trim().replace(/\.0$/, '');
  if (/^\d{8}$/.test(s)) return fromYYYYMMDD_(s, tz);
  var dm = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dm) { var d2 = new Date(+dm[3], (+dm[2]) - 1, +dm[1]); if (!isNaN(d2.getTime())) return dateOut_(d2, tz); }
  var ymd = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (ymd) { var d3 = new Date(+ymd[1], (+ymd[2]) - 1, +ymd[3]); if (!isNaN(d3.getTime())) return dateOut_(d3, tz); }
  return empty;
}
function fromYYYYMMDD_(s, tz) {
  var y = +s.substr(0, 4), m = +s.substr(4, 2), d = +s.substr(6, 2);
  var dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return { iso: '', serial: null, dateObj: null };
  return dateOut_(dt, tz);
}
function dateOut_(d, tz) {
  return {
    iso:    Utilities.formatDate(d, tz || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'),
    serial: d.getTime(),
    dateObj: d
  };
}
function addMonths_(dateObj, months, tz) {
  return dateOut_(new Date(dateObj.getFullYear(), dateObj.getMonth() + months, dateObj.getDate()), tz);
}
function toNum_(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  var n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return isFinite(n) ? n : 0;
}
function pad2_(x) { x = String(x); return x.length < 2 ? '0' + x : x; }

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  PHÂN LOẠI DAO
 *    MST… → Stab  |  MSL…/MSK… → Slit  |  MCU… → Crescent  |  MVR… → MVR
 *    Chỉ khâu (1406, 2090…) và ghim da (MANIPLER, MSU, AZ) → LOẠI.
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function knifeGroups_(codes) {
  var g = { MST:false, MSL:false, MCU:false, MVR:false };
  (codes || []).forEach(function (c) {
    var s = String(c).toUpperCase();
    if (/^MST/.test(s))           g.MST = true;
    else if (/^MSL|^MSK/.test(s)) g.MSL = true;
    else if (/^MCU/.test(s))      g.MCU = true;
    else if (/^MVR/.test(s))      g.MVR = true;
  });
  return g;
}

function classifyKnife_(raw) {
  var res = { isKnife: false, type: 'Other', codes: [], qtyHint: 0 };
  if (isBlank_(raw)) return res;

  var parts = String(raw).split(/[,;\/]+/);
  var hasStab = false, hasSlit = false, hasMCU = false, hasMVR = false;

  parts.forEach(function (p) {
    var s = String(p).trim();
    if (!s) return;

    // "MSL28SK 300 cái" / "MST15(200)" → tách qty hint
    var qh = s.match(/\(?\s*(\d{2,6})\s*(?:c[áa]i|chi[eế]c|tép)?\s*\)?\s*$/i);
    if (qh && qh[1]) {
      var qn = parseInt(qh[1], 10);
      if (isFinite(qn) && qn > res.qtyHint) res.qtyHint = qn;
    }

    var clean = s.replace(/\(.*?\)/g, '')
                 .replace(/\d{2,6}\s*(?:c[áa]i|chi[eế]c|tép)/gi, '')
                 .replace(/\s+/g, '')
                 .toUpperCase();
    if (!clean) return;

    // ⛔ loại ghim da / vật tư khác dù bắt đầu bằng M
    if (/^MANIPLER|^MSU|^AZ/.test(clean)) return;
    // ⛔ chỉ nhận mã dao đúng tiền tố
    if (!/^(MST|MSL|MSK|MCU|MVR)/.test(clean)) return;

    res.codes.push(clean);
    if (/^MST/.test(clean))           hasStab = true;
    else if (/^MSL|^MSK/.test(clean)) hasSlit = true;
    else if (/^MCU/.test(clean))      hasMCU  = true;
    else if (/^MVR/.test(clean))      hasMVR  = true;
  });

  if (!res.codes.length) return res;
  res.isKnife = true;
  var n = (hasStab?1:0) + (hasSlit?1:0) + (hasMCU?1:0) + (hasMVR?1:0);
  if (n > 1)          res.type = 'Mixed';
  else if (hasMCU)    res.type = 'MCU';
  else if (hasSlit)   res.type = 'Slit';
  else if (hasStab)   res.type = 'Stab';
  else if (hasMVR)    res.type = 'MVR';
  return res;
}

/* ── Test nhanh trong editor: Run → xem Logs ── */
function _test() {
  var p = buildPayload(PRICE_NPP_DEFAULT, FX_DEFAULT);
  Logger.log('meta: ' + JSON.stringify(p.meta));
  Logger.log('knife rows: ' + p.rows.length);
  Logger.log('funnel: ' + JSON.stringify(p.summary.funnel));
  Logger.log('FY67: ' + JSON.stringify(p.summary.byFY.FY67));
  Logger.log('FY68: ' + JSON.stringify(p.summary.byFY.FY68));
  Logger.log('expiring: ' + p.summary.expiring.length);
}


/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  v4 — XOÁ DÒNG PLAN  (frontend gọi action:'deleteLog' khi user xoá dòng Duy trì / Mở mới)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function deleteLog_(rowKeys) {
  if (!rowKeys || !rowKeys.length) return 0;
  var sh = getLogSheet_(false);
  if (!sh) return 0;
  var lr = sh.getLastRow();
  if (lr < 2) return 0;
  var keys = sh.getRange(2, 1, lr - 1, 1).getValues();
  var want = {}; rowKeys.forEach(function (k) { want[String(k)] = 1; });
  var del = 0;
  // xoá từ dưới lên để index không lệch
  for (var i = keys.length - 1; i >= 0; i--) {
    if (want[String(keys[i][0])]) { sh.deleteRow(i + 2); del++; }
  }
  return del;
}


/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  v4 — ĐỒNG BỘ DAO PHẪU THUẬT TRÚNG THẦU (Win) → SHEET TENDER TỔNG
 *  ---------------------------------------------------------------------------------------------
 *  Nguồn : sheet "Tender FY66" (chính spreadsheet Hùng Vĩ này) — header dòng 7, data dòng 8.
 *  Đích  : spreadsheet "Data xử lý" tender tổng (SYNC.DEST_SS_ID), header dòng 2.
 *
 *  LỌC (BẮT BUỘC đủ 3 điều kiện):
 *    ① Result of Tender = "Win"
 *    ② Product code là DAO PT: bắt đầu MSL / MST / MCU  (chỉ khâu, ghim da, mã số → LOẠI)
 *    ③ Có "Số thông báo mời thầu" (TBMT) — để đối chiếu với "KQTT Code"
 *
 *  ĐỐI CHIẾU (Rule 1): TBMT (đã chuẩn hoá) so với cột "KQTT Code" ở đích.
 *    • Đã tồn tại  → BỎ QUA (gói đã có ở tender tổng).
 *    • Chưa có     → THÊM vào dòng trống gần nhất (sau dữ liệu cuối) + BÔI VÀNG cả dòng.
 *
 *  MAPPING nguồn → đích:
 *    Số thông báo mời thầu   → KQTT Code               (để lần sau không thêm lại)
 *    Hospital name           → Buyer (Hospital / Health Facility)
 *    City                    → Province_Clean
 *    Address                 → Location
 *    Product code            → Product Code
 *    (cố định)               → Country of Origin = "Viet Nam"
 *    (cố định)               → Manufacturer = "Mani"  (+ Manufacturer_Norm nếu có cột)
 *    (cố định)               → Unit = "Cái"
 *    (cố định)               → Region_by_Distributor = "North"
 *    theo Product code       → Knife Type   (MSL→Slit · MST→Straight · MCU→Crescent)
 *    Quantity (SL trúng)     → Quantity
 *    Ngày phê duyệt gói thầu → Decision Issue Date
 *    → Month = mm/yyyy của Ngày phê duyệt   ·  Year (duplicate) = yyyy
 *    Thời gian thực hiện (Tháng) → Contract Duration (Month)
 *
 *  ⚠ QUYỀN: script chạy "Execute as: Me" nên tài khoản deploy phải có quyền SỬA sheet đích.
 *  ⚠ Sao lưu sheet đích trước lần chạy đầu. Chạy thử: ?action=syncPreview (không ghi).
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */

var SYNC = {
  DEST_SS_ID:       '1lI1s1nEyRtSluQiCJu2sdkgZdP38A35qYFdzOvVXE7I',
  DEST_GID:         1603394577,        // sheet đích (fallback theo tên bên dưới nếu không thấy gid)
  DEST_SHEET_NAME:  'Data xử lý',
  DEST_HEADER_ROW:  2,                 // dòng 1 = timestamp export · dòng 2 = header
  HL_COLOR:         '#FFF3B0',         // vàng nhạt bôi dòng mới dán (dễ nhìn, chữ vẫn đọc rõ)
  // nhãn Knife Type mặc định (sẽ tự khớp nhãn sẵn có ở đích nếu tìm được — xem resolveKnifeLabels_)
  KNIFE_LABEL_DEFAULT: { MSL: 'Slit knife', MST: 'Straight knife', MCU: 'Crescent knife' }
};

/* Alias header cho sheet ĐÍCH (khớp backend tender tổng) */
var DEST_ALIASES = {
  kqtt:    ['KQTT Code', 'mã kqtt'],
  buyer:   ['Buyer (Hospital / Health Facility)', 'Buyer', 'Chủ đầu tư', 'Hospital name'],
  prov:    ['Province_Clean', 'Tỉnh', 'Province'],
  location:['Location', 'Địa chỉ', 'Address'],
  pcode:   ['Product Code', 'Mã sản phẩm'],
  country: ['Country of Origin', 'Xuất xứ'],
  mfr:     ['Manufacturer', 'Hãng'],
  mfrNorm: ['Manufacturer_Norm'],
  unit:    ['Unit', 'Đơn vị'],
  regionD: ['Region_by_Distributor'],
  ktype:   ['Knife Type', 'Product Type', 'Loại sản phẩm'],
  qty:     ['Quantity', 'Số lượng'],
  issue:   ['Decision Issue Date', 'Ngày ra quyết định', 'Ngày quyết định', 'Issue Date'],
  month:   ['Month', 'Tháng'],
  year:    ['Year (duplicate)', 'Year'],
  cdur:    ['Contract Duration (Month)', 'Contract Duration', 'Thời hạn hợp đồng', 'Thời hạn']
};

/* Product code → prefix dao (ưu tiên MST > MSL > MCU nếu combo, nhưng gộp nhãn nếu nhiều loại) */
function knifePrefixType_(code) {
  var s = String(code || '').toUpperCase();
  if (!/(MSL|MST|MCU)/.test(s)) return null;   // không phải dao PT
  var has = { MSL: /MSL|MSK/.test(s), MST: /MST/.test(s), MCU: /MCU/.test(s) };
  var order = ['MSL', 'MST', 'MCU'];
  var found = order.filter(function (k) { return has[k]; });
  return { prefixes: found, main: found[0] };
}

/* Tìm index cột (0-based) trong 1 mảng header theo danh sách alias */
function findHeaderIdx_(headerVals, aliases) {
  var norm = headerVals.map(function (h) { return normHeader_(h); });
  for (var a = 0; a < aliases.length; a++) {
    var an = normHeader_(aliases[a]);
    for (var i = 0; i < norm.length; i++) if (norm[i] === an) return i;
  }
  // partial match dự phòng
  for (var a2 = 0; a2 < aliases.length; a2++) {
    var an2 = normHeader_(aliases[a2]);
    for (var j = 0; j < norm.length; j++) if (norm[j] && norm[j].indexOf(an2) >= 0) return j;
  }
  return -1;
}

/* Map toàn bộ cột đích theo DEST_ALIASES */
function resolveDestCols_(headerVals) {
  var out = {};
  Object.keys(DEST_ALIASES).forEach(function (k) { out[k] = findHeaderIdx_(headerVals, DEST_ALIASES[k]); });
  return out;
}

/* Lấy sheet theo gid (fallback null nếu không có) */
function resolveSheetByGid_(ss, gid) {
  var shs = ss.getSheets();
  for (var i = 0; i < shs.length; i++) if (shs[i].getSheetId() === gid) return shs[i];
  return null;
}

/* Khớp nhãn Knife Type với dữ liệu SẴN CÓ ở đích (để dòng mới gộp đúng nhóm trên dashboard).
 * Quét các giá trị Knife Type hiện có, dò keyword → dùng nhãn gốc của đích; nếu không có → nhãn mặc định. */
function resolveKnifeLabels_(destSheet, d, headerRow, lastCol) {
  var lab = { MSL: SYNC.KNIFE_LABEL_DEFAULT.MSL, MST: SYNC.KNIFE_LABEL_DEFAULT.MST, MCU: SYNC.KNIFE_LABEL_DEFAULT.MCU };
  if (d.ktype < 0) return lab;
  var n = Math.max(0, destSheet.getLastRow() - headerRow);
  if (n <= 0) return lab;
  var vals = destSheet.getRange(headerRow + 1, d.ktype + 1, n, 1).getValues();
  var seen = {};
  for (var i = 0; i < vals.length; i++) {
    var v = String(vals[i][0] || '').trim(); if (!v) continue;
    var lo = v.toLowerCase();
    if (!seen.MSL && /slit|kh[íi]a|r[aạ]ch/.test(lo)) { lab.MSL = v; seen.MSL = 1; }
    if (!seen.MST && /straight|stab|th[aẳ]ng|đ[aâ]m/.test(lo)) { lab.MST = v; seen.MST = 1; }
    if (!seen.MCU && /cres|cong|li[eề]m/.test(lo)) { lab.MCU = v; seen.MCU = 1; }
  }
  return lab;
}

/* Nhãn Knife Type cho 1 product code (combo nhiều loại → nối bằng " / ") */
function knifeLabelFor_(kt, labelMap) {
  if (!kt || !kt.prefixes.length) return '';
  var names = kt.prefixes.map(function (p) { return labelMap[p] || p; });
  // loại trùng
  var uniq = names.filter(function (x, i) { return names.indexOf(x) === i; });
  return uniq.join(' / ');
}

/* ── HÀM CHÍNH ── */
function syncKnifeWinsToTender_(dryRun) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var src = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!src) throw new Error('Không tìm thấy sheet nguồn "' + CONFIG.SHEET_NAME + '"');

  var sLastRow = src.getLastRow(), sLastCol = src.getLastColumn();
  if (sLastRow < CONFIG.START_ROW) return { ok: true, dryRun: !!dryRun, added: 0, skipped: 0, note: 'Nguồn trống' };

  var sHeader = src.getRange(CONFIG.HEADER_ROW, 1, 1, sLastCol).getValues()[0];
  var c = resolveColumns_(sHeader);
  var addrIdx = findHeaderIdx_(sHeader, ['Address', 'Địa chỉ', 'Dia chi']);
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Ho_Chi_Minh';
  var data = src.getRange(CONFIG.START_ROW, 1, sLastRow - CONFIG.START_ROW + 1, sLastCol).getValues();

  // ── SHEET ĐÍCH ──
  var destSS = SpreadsheetApp.openById(SYNC.DEST_SS_ID);
  var dest = resolveSheetByGid_(destSS, SYNC.DEST_GID) || destSS.getSheetByName(SYNC.DEST_SHEET_NAME);
  if (!dest) throw new Error('Không tìm thấy sheet đích (gid ' + SYNC.DEST_GID + ' / "' + SYNC.DEST_SHEET_NAME + '")');

  var dLastCol = dest.getLastColumn();
  var dHeader = dest.getRange(SYNC.DEST_HEADER_ROW, 1, 1, dLastCol).getValues()[0];
  var d = resolveDestCols_(dHeader);
  if (d.kqtt < 0) throw new Error('Sheet đích thiếu cột "KQTT Code"');

  var knifeLabel = resolveKnifeLabels_(dest, d, SYNC.DEST_HEADER_ROW, dLastCol);

  // set KQTT đã tồn tại + dòng append (trống gần nhất sau dữ liệu cuối)
  var dFirst = SYNC.DEST_HEADER_ROW + 1;
  var dCount = Math.max(0, dest.getLastRow() - SYNC.DEST_HEADER_ROW);
  var existing = {}, appendAt = dFirst;
  if (dCount > 0) {
    var kqttCol = dest.getRange(dFirst, d.kqtt + 1, dCount, 1).getValues();
    for (var r = 0; r < kqttCol.length; r++) {
      var key = normTBMT_(kqttCol[r][0]);
      if (key) { existing[key] = 1; appendAt = dFirst + r + 1; }
    }
  }

  // ── LỌC nguồn ──
  var toAdd = [], seenBatch = {};
  var stat = { winKnife: 0, noTbmt: 0, dupExisting: 0, dupBatch: 0 };
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (normResult_(getCell_(row, c.result)) !== 'Win') continue;

    var pcodeRaw = String(getCell_(row, c.pcode) || '').trim();
    var kt = knifePrefixType_(pcodeRaw);
    if (!kt) continue;                         // không phải dao PT
    stat.winKnife++;

    var tbmtRaw = getCell_(row, c.tbmt);
    var tbmt = normTBMT_(tbmtRaw);
    if (!tbmt) { stat.noTbmt++; continue; }    // không có TBMT → không đối chiếu được
    if (existing[tbmt]) { stat.dupExisting++; continue; }

    var batchKey = tbmt + '|' + pcodeRaw.toUpperCase();
    if (seenBatch[batchKey]) { stat.dupBatch++; continue; }
    seenBatch[batchKey] = 1;

    var qty  = toNum_(getCell_(row, c.wonQty)) || toNum_(getCell_(row, c.qty));
    var appr = parseDate_(getCell_(row, c.approve), tz);
    var dur  = parseDuration_(getCell_(row, c.duration));
    var mm = appr.dateObj ? (pad2_(appr.dateObj.getMonth() + 1) + '/' + appr.dateObj.getFullYear()) : '';
    var yy = appr.dateObj ? appr.dateObj.getFullYear() : '';

    toAdd.push({
      kqtt:   (tbmtRaw != null ? String(tbmtRaw).trim() : tbmt),
      buyer:  String(getCell_(row, c.hospital) || '').trim(),
      prov:   String(getCell_(row, c.city) || '').trim(),
      loc:    addrIdx >= 0 ? String(getCell_(row, addrIdx) || '').trim() : '',
      pcode:  pcodeRaw,
      ktype:  knifeLabelFor_(kt, knifeLabel),
      qty:    qty,
      issue:  appr.dateObj || '',
      month:  mm,
      year:   yy,
      cdur:   dur
    });
  }

  var result = {
    ok: true, dryRun: !!dryRun, added: 0,
    candidates: toAdd.length,
    scanned: { winKnifeLines: stat.winKnife, noTBMT: stat.noTbmt, alreadyInTender: stat.dupExisting, dupInBatch: stat.dupBatch },
    destSheet: dest.getName(), appendStartRow: appendAt
  };
  if (dryRun || !toAdd.length) return result;

  // ── GHI ── đọc block trống hiện tại → chỉ set các cột mapping → ghi lại → bôi vàng
  var nNew = toAdd.length;
  var needRows = appendAt + nNew - 1;
  if (needRows > dest.getMaxRows()) dest.insertRowsAfter(dest.getMaxRows(), needRows - dest.getMaxRows());
  var block = dest.getRange(appendAt, 1, nNew, dLastCol).getValues();
  function put(rowArr, idx0, val) { if (idx0 != null && idx0 >= 0 && idx0 < rowArr.length) rowArr[idx0] = val; }

  for (var k = 0; k < nNew; k++) {
    var a = toAdd[k], rr = block[k];
    put(rr, d.kqtt,    a.kqtt);
    put(rr, d.buyer,   a.buyer);
    put(rr, d.prov,    a.prov);
    put(rr, d.location,a.loc);
    put(rr, d.pcode,   a.pcode);
    put(rr, d.country, 'Viet Nam');
    put(rr, d.mfr,     'Mani');
    put(rr, d.mfrNorm, 'Mani');
    put(rr, d.unit,    'Cái');
    put(rr, d.regionD, 'North');
    put(rr, d.ktype,   a.ktype);
    put(rr, d.qty,     a.qty);
    put(rr, d.issue,   a.issue);       // Date thật
    put(rr, d.month,   a.month);       // "mm/yyyy"
    put(rr, d.year,    a.year);        // yyyy (số)
    put(rr, d.cdur,    a.cdur);
  }

  dest.getRange(appendAt, 1, nNew, dLastCol).setValues(block);
  dest.getRange(appendAt, 1, nNew, dLastCol).setBackground(SYNC.HL_COLOR);   // bôi vàng dòng mới
  SpreadsheetApp.flush();

  result.added = nNew;
  return result;
}

/* Test nhanh trong editor: Run → xem Logs (không ghi) */
function _testSync() {
  Logger.log(JSON.stringify(syncKnifeWinsToTender_(true), null, 2));   // dryRun = true
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  SHEET PHỤ "ACCT_PLAN" — kế hoạch địa bàn (opp/note/SL Mani) theo BV × kỳ (v5)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function acctNorm_(s){
  // chuẩn hoá tên BV để làm khoá ổn định (bỏ dấu, gộp khoảng trắng, upper)
  var x = String(s == null ? '' : s);
  try { x = x.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  x = x.replace(/đ/g,'d').replace(/Đ/g,'D');
  return x.replace(/\s+/g, ' ').trim().toUpperCase();
}
function acctKey_(fy, account){ return String(fy||'FY68') + '|' + acctNorm_(account); }

function getAcctSheet_(create){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ACCT_SHEET);
  if (!sh && create){
    sh = ss.insertSheet(ACCT_SHEET);
    sh.getRange(1, 1, 1, ACCT_HEADERS.length).setValues([ACCT_HEADERS]);
    sh.setFrozenRows(1);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}

/* Đọc toàn bộ (hoặc lọc theo fy) → map { key : {…} } */
function readAcctPlan_(fyFilter){
  var sh = getAcctSheet_(false);
  if (!sh) return {};
  var lr = sh.getLastRow();
  if (lr < 2) return {};
  var vals = sh.getRange(2, 1, lr - 1, ACCT_HEADERS.length).getValues();
  var H = {};
  ACCT_HEADERS.forEach(function(h,i){ H[h]=i; });
  var out = {};
  vals.forEach(function(r){
    var key = r[H.key]; if (!key) return;
    if (fyFilter && String(r[H.fy]) !== String(fyFilter)) return;
    out[key] = {
      key: key, fy: r[H.fy], account: r[H.account], accountNorm: r[H.accountNorm],
      city: r[H.city], opp: r[H.opp] || '', note: r[H.note] || '',
      msl: numOrNull_(r[H.msl]), mst: numOrNull_(r[H.mst]), mcu: numOrNull_(r[H.mcu]),
      group: r[H.group] || '', startMonth: r[H.startMonth] || '', dur: numOrNull_(r[H.dur]),
      updatedBy: r[H.updatedBy] || '', ts: r[H.ts] || ''
    };
  });
  return out;
}

/* Upsert nhiều dòng (khoá = fy|accountNorm; nếu client gửi kèm 'key' thì tôn trọng key đó) */
function writeAcctPlan_(rows){
  if (!rows || !rows.length) return 0;
  var sh = getAcctSheet_(true);
  var lr = sh.getLastRow();
  var pos = {};   // key → row index
  if (lr >= 2){
    var keys = sh.getRange(2, 1, lr - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0]) pos[keys[i][0]] = i + 2;
  }
  var who = '';
  try { who = Session.getActiveUser().getEmail() || ''; } catch (e) {}
  var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');

  rows.forEach(function(r){
    var fy  = r.fy || 'FY68';
    var acc = r.account || '';
    var key = r.key || acctKey_(fy, acc);
    var line = [
      key, fy, acc, acctNorm_(acc), r.city || '',
      r.opp || '', r.note || '',
      r.msl == null ? '' : r.msl, r.mst == null ? '' : r.mst, r.mcu == null ? '' : r.mcu,
      r.group || '', r.startMonth || '', r.dur == null ? '' : r.dur,
      who, now
    ];
    if (pos[key]) sh.getRange(pos[key], 1, 1, ACCT_HEADERS.length).setValues([line]);
    else          sh.appendRow(line);
  });
  return rows.length;
}

/* Xoá dòng theo danh sách key */
function deleteAcctPlan_(keys){
  if (!keys || !keys.length) return 0;
  var sh = getAcctSheet_(false);
  if (!sh) return 0;
  var lr = sh.getLastRow();
  if (lr < 2) return 0;
  var col = sh.getRange(2, 1, lr - 1, 1).getValues();
  var want = {}; keys.forEach(function(k){ want[String(k)] = 1; });
  var del = 0;
  for (var i = col.length - 1; i >= 0; i--){
    if (want[String(col[i][0])]) { sh.deleteRow(i + 2); del++; }
  }
  return del;
}

/* Test nhanh trong editor */
function _testAcctPlan(){
  writeAcctPlan_([{ fy:'FY68', account:'Bệnh viện Quân Y 103', city:'Hà Nội',
                    opp:'Cao', note:'Đang đấu gói mới', msl:2000, mst:2500, mcu:0 }]);
  Logger.log(JSON.stringify(readAcctPlan_('FY68'), null, 2));
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  MASTER HOSPITAL LIST — danh sách chủ đầu tư [{name,prov,type}] (v6)
 *  (đọc header DÒNG 4: STT|Name|Address|Provinces|Type)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function readMasterList_(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.MASTER_SHEET);
  if (!sh) return [];
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr <= MASTER_HEADER_ROW) return [];

  // dò cột theo header dòng 4
  var hdr = sh.getRange(MASTER_HEADER_ROW, 1, 1, lc).getValues()[0];
  function col(names){
    for (var i=0;i<hdr.length;i++){
      var h=String(hdr[i]||'').trim().toLowerCase();
      for (var j=0;j<names.length;j++) if (h===names[j]) return i;
    }
    return -1;
  }
  var ci = {
    name: col(['name','tên','tên bệnh viện']),
    prov: col(['provinces','province','tỉnh','tỉnh/thành']),
    type: col(['type','loại'])
  };
  if (ci.name < 0) ci.name = 2;   // fallback: cột C
  if (ci.prov < 0) ci.prov = 4;   // fallback: cột E

  var n = lr - MASTER_HEADER_ROW;
  var vals = sh.getRange(MASTER_HEADER_ROW + 1, 1, n, lc).getValues();
  var out = [], seen = {};
  for (var r = 0; r < vals.length; r++){
    var nm = String(vals[r][ci.name] || '').trim();
    if (!nm) continue;
    var key = nm.toUpperCase();
    if (seen[key]) continue; seen[key] = 1;
    out.push({
      name: nm,
      prov: String(vals[r][ci.prov] || '').trim(),
      type: ci.type >= 0 ? String(vals[r][ci.type] || '').trim() : ''
    });
  }
  return out;
}

/* Test nhanh */
function _testMasterList(){
  var m = readMasterList_();
  Logger.log('master count: ' + m.length);
  Logger.log(JSON.stringify(m.slice(0, 5), null, 2));
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
 *  PROVINCES + THÊM ĐỊA BÀN MỚI vào "Master Hospital name" (v7)
 * ═════════════════════════════════════════════════════════════════════════════════════════════ */
function readProvinceList_(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.MASTER_SHEET);
  if (!sh) return [];
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr <= MASTER_HEADER_ROW) return [];

  var hdr = sh.getRange(MASTER_HEADER_ROW, 1, 1, lc).getValues()[0];
  // tìm cột "Provinces" THỨ HAI (danh sách tỉnh chuẩn) — không phải cột Provinces của bảng BV
  var provCols = [];
  for (var i = 0; i < hdr.length; i++){
    var h = String(hdr[i] || '').trim().toLowerCase();
    if (h === 'provinces' || h === 'province' || h === 'tỉnh' || h === 'master city name') provCols.push(i);
  }
  var listCol = provCols.length >= 2 ? provCols[1] : (provCols.length ? provCols[0] : 7);

  var n = lr - MASTER_HEADER_ROW;
  var vals = sh.getRange(MASTER_HEADER_ROW + 1, listCol + 1, n, 1).getValues();
  var out = [], seen = {};
  for (var r = 0; r < vals.length; r++){
    var v = String(vals[r][0] || '').trim();
    if (!v) continue;
    var key = v.toUpperCase();
    if (seen[key]) continue; seen[key] = 1;
    out.push(v);
  }
  // fallback: nếu cột chuẩn rỗng → gom distinct từ bảng BV
  if (!out.length){
    var master = readMasterList_();
    master.forEach(function(m){ if (m.prov){ var k=m.prov.toUpperCase(); if(!seen[k]){seen[k]=1; out.push(m.prov);} } });
  }
  out.sort(function(a,b){ return a.localeCompare(b, 'vi'); });
  return out;
}

/* Thêm 1 BV mới vào bảng Master (Name/Provinces). Trả kết quả; bỏ qua nếu trùng tên. */
function addMasterHospital_(name, prov, type){
  name = String(name || '').trim();
  prov = String(prov || '').trim();
  type = String(type || 'Tender').trim() || 'Tender';
  if (!name) return { ok:false, error:'Thiếu tên bệnh viện' };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG.MASTER_SHEET);
  if (!sh) return { ok:false, error:'Không thấy sheet "' + CONFIG.MASTER_SHEET + '"' };

  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  var hdr = sh.getRange(MASTER_HEADER_ROW, 1, 1, lc).getValues()[0];
  function col(names){
    for (var i=0;i<hdr.length;i++){ var h=String(hdr[i]||'').trim().toLowerCase();
      for (var j=0;j<names.length;j++) if (h===names[j]) return i; }
    return -1;
  }
  var ci = {
    stt:  col(['stt']),
    name: col(['name','tên','tên bệnh viện']),
    prov: col(['provinces','province','tỉnh','tỉnh/thành']),
    type: col(['type','loại'])
  };
  if (ci.name < 0) ci.name = 2;
  if (ci.prov < 0) ci.prov = 4;
  if (ci.stt  < 0) ci.stt  = 1;

  // kiểm tra trùng tên (trong cột Name của bảng BV)
  var nStart = MASTER_HEADER_ROW + 1;
  var nRows  = Math.max(0, lr - MASTER_HEADER_ROW);
  var nameNorm = name.replace(/\s+/g,' ').trim().toUpperCase();
  var lastStt = 0, appendRow = nStart;
  if (nRows > 0){
    var body = sh.getRange(nStart, 1, nRows, lc).getValues();
    for (var r = 0; r < body.length; r++){
      var existName = String(body[r][ci.name] || '').replace(/\s+/g,' ').trim().toUpperCase();
      if (existName){ appendRow = nStart + r + 1; }
      var sttv = parseInt(body[r][ci.stt], 10); if (isFinite(sttv) && sttv > lastStt) lastStt = sttv;
      if (existName && existName === nameNorm){
        return { ok:true, added:false, dup:true, name:name, prov:String(body[r][ci.prov]||prov), row:nStart + r };
      }
    }
  }

  // ghi dòng mới
  var line = new Array(lc).fill('');
  line[ci.stt]  = lastStt + 1;
  line[ci.name] = name;
  line[ci.prov] = prov;
  if (ci.type >= 0) line[ci.type] = type;
  if (appendRow > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), appendRow - sh.getMaxRows());
  sh.getRange(appendRow, 1, 1, lc).setValues([line]);
  try { sh.getRange(appendRow, 1, 1, lc).setBackground('#E6F4EA'); } catch(e){}   // xanh nhạt = mới thêm
  SpreadsheetApp.flush();

  return { ok:true, added:true, name:name, prov:prov, type:type, row:appendRow };
}

function _testProvince(){
  Logger.log('provinces: ' + readProvinceList_().length);
  Logger.log(JSON.stringify(readProvinceList_().slice(0,10)));
}