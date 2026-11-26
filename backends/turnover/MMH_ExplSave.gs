/* ════════════════════════════════════════════════════════════════════
   MMH_ExplSave.gs v1.1 (26/11/2026) — EXPLANATION theo khung MANI HQ
   ────────────────────────────────────────────────────────────────────
   Dòng "… Total" theo Segment (Single, Ver ≥ EXF.FROM_VER = 20261127, hoặc
   Script Property EXF_FROM_VER) của tab "Forecast Explanation Input" LUÔN có
   cùng một bố cục (MMH_ExplFormat.gs — EXF, GIỐNG HỆT app exfmt/exfmt.js):
     ■ Results (máy tự ghi: Monthly / Quarterly + Cumulative, Sales · YoY · vs. Budget)
     ■ Key Factors · ■ Market and Competitor situation ·
     ■ Outlook and Actions Going Forward · ■ Requests to Other Departments
   dù nhập bằng cách nào:
     ① App Turnover ▸ Explanations ▸ Edit ⇒ action exSave (JSONP; chữ dài ⇒ exPart từng khúc).
     ② Gõ / dán thẳng trên Sheet ⇒ GIỮ NGUYÊN (v1.1 — hệ thống không tự sửa ô người dùng đang điền);
        app vẫn hiển thị ô đó theo khung.
     ④ Menu 📊 MMH Report ▸ ✍️ Explanations — apply HQ format (chỉ khi người dùng tự bấm).
   Dòng NPP (Distributor) chỉ được chuẩn hoá dấu ✅ ❌ ➡️ (không thêm tiêu đề).
   Số liệu Results: Sales / Budget lấy từ chính dòng Single (cột Forecast/Actual · Budget Mani)
   và dòng Culmulative cùng Ver / tháng / nước / segment (thiếu ⇒ cộng SUM TURNOVER);
   YoY = so cùng kỳ năm trước trong SUM TURNOVER (Actual nếu tháng đã có Actual, không thì Forecast).
   ════════════════════════════════════════════════════════════════════ */
var EXS = { AGG_KEY: "exf_agg_v1", AGG_TTL: 600, MAX_ROWS: 600, WIN: 90, READ_WRITES: 80 };

function exsFrom_() {
  try { return PropertiesService.getScriptProperties().getProperty("EXF_FROM_VER") || EXF.FROM_VER; }
  catch (e) { return EXF.FROM_VER; }
}

/* cột của tab Explanation (cùng cách dò với getExplanations_) */
function exsIdx_(sh) {
  var lastCol = sh.getLastColumn(), lastRow = sh.getLastRow();
  var head = sh.getRange(1, 1, Math.max(1, Math.min(8, lastRow)), lastCol).getValues();
  var best = CONFIG.EXPL_HEADER_ROW - 1, idx = autoDetectColumns_(head[best] || [], CONFIG.EXPL_COLUMN_MAP);
  var hits = function (o) { return Object.keys(o).filter(function (k) { return o[k] >= 0; }).length; };
  var bh = hits(idx);
  for (var r = 0; r < head.length; r++) {
    if (r === best) continue;
    var c = autoDetectColumns_(head[r], CONFIG.EXPL_COLUMN_MAP);
    if (hits(c) > bh) { bh = hits(c); best = r; idx = c; }
  }
  function between(a, b, m) { if (idx[m] < 0 && idx[a] >= 0 && idx[b] >= 0 && idx[b] - idx[a] === 2) idx[m] = idx[a] + 1; }
  between("country", "distributor", "segment");
  between("forecast", "pctVsb", "vsb");
  between("budget", "vsb", "forecast");
  idx._start = Math.max(CONFIG.EXPL_DATA_START_ROW, best + 2);
  idx._lastCol = lastCol;
  return idx;
}

function exsRow_(v, idx, n) {
  function g(k) { return idx[k] >= 0 ? v[idx[k]] : ""; }
  return {
    n: n,
    fy: String(g("fy") || "").toUpperCase().trim(),
    ver: normalizeVer_(g("ver")),
    ft: String(g("fctTime") || "").trim().replace(/\.0+$/, ""),
    tFct: String(g("typeFct") || "").trim(),
    sc: String(g("single") || "").trim(),
    country: String(g("country") || "").trim(),
    segment: String(g("segment") || "").trim(),
    distributor: String(g("distributor") || "").trim(),
    b: toNumF_(g("budget")), f: toNumF_(g("forecast")),
    e: String(g("explanation") == null ? "" : g("explanation"))
  };
}
function exsCtyG_(country) { return String(country || "").toLowerCase().indexOf("thai") >= 0 ? "TH" : "VN"; }
function exsKey_(r) {
  return [r.fy, r.ver, r.ft, r.tFct.toLowerCase(), exsCtyG_(r.country), EXF.segClean(r.segment).toLowerCase()].join("|");
}
function exsIsSegTotal_(r) {
  var d = r.distributor;
  return !!r.segment && !/total$/i.test(r.country) && !/^grand/i.test(r.country) && (!d || /total$/i.test(d));
}
function exsIsFrame_(r, from) {
  return EXF.isFrame({ ver: r.ver, sc: r.sc, country: r.country, segment: r.segment, distributor: r.distributor, from: from });
}

/* ── SUM TURNOVER gom theo nước thật | country report | segment | tháng ⇒ [value, budget] ── */
function exsAgg_(ss) {
  var cache = CacheService.getScriptCache();
  try { var hit = cacheGetBig_(cache, EXS.AGG_KEY); if (hit) return JSON.parse(hit); } catch (e) {}
  var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  var out = {};
  if (!sh || sh.getLastRow() < CONFIG.DATA_START_ROW) return out;
  var lastCol = sh.getLastColumn();
  var header = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var idx = autoDetectColumns_(header, CONFIG.COLUMN_MAP);
  if (idx.month < 0 || idx.segment < 0 || idx.budget < 0) return out;
  var data = sh.getRange(CONFIG.DATA_START_ROW, 1, sh.getLastRow() - CONFIG.DATA_START_ROW + 1, lastCol).getValues();
  var split = idx.fcRaw >= 0 && idx.actual >= 0;
  var recs = [], act = {};
  data.forEach(function (row) {
    if (idx.type >= 0 && typeKind_(row[idx.type]) !== "turnover") return;
    var m = normMonth_(row[idx.month]); if (!/^\d{6}$/.test(m)) return;
    var seg = String(row[idx.segment] || "").trim(); if (!seg) return;
    var a = split ? toNumF_(row[idx.actual]) : 0;
    if (a) act[m] = (act[m] || 0) + a;
    recs.push([m, String(idx.countryPhys >= 0 ? row[idx.countryPhys] || "" : "").trim(),
      String(idx.country >= 0 ? row[idx.country] || "" : "").trim(), seg, toNumF_(row[idx.budget]),
      split ? toNumF_(row[idx.fcRaw]) : toNumF_(row[idx.forecast]), a]);
  });
  var now = todayKeyDay_();
  recs.forEach(function (x) {
    var m = x[0], past = m < now.key || (m === now.key && now.day >= CONFIG.ACTUAL_CUTOFF_DAY);
    var v = split && past && act[m] ? x[6] : x[5];
    if (!v && !x[4]) return;
    var k = [x[1], x[2], x[3], m].join("|");
    var o = out[k] || (out[k] = [0, 0]);
    o[0] += v; o[1] += x[4];
  });
  try { cachePutBig_(cache, EXS.AGG_KEY, JSON.stringify(out), EXS.AGG_TTL); } catch (e) {}
  return out;
}
/* tổng {v, b} của 1 nhóm nước (TH | VN, theo cách gom của FY xem) × segment × các tháng */
function exsSum_(agg, grp, seg, months, fy) {
  var cfg = countryGroupCfg_(fy), want = {}, s = { v: 0, b: 0 };
  months.forEach(function (m) { want[m] = 1; });
  seg = String(seg).toLowerCase();
  Object.keys(agg).forEach(function (k) {
    var p = k.split("|");
    if (!want[p[3]]) return;
    if (String(p[2]).toLowerCase() !== seg) return;
    if (ctyGroupCode_(p[0], p[1], cfg) !== grp) return;
    s.v += agg[k][0]; s.b += agg[k][1];
  });
  return s;
}
function exsLy_(months) {
  return months.map(function (m) { return String(parseInt(m.slice(0, 4), 10) - 1) + m.slice(4, 6); });
}

/* dòng Single ⇒ chữ chuẩn (Results tính lại + 4 mục giữ nguyên nội dung) */
function exsCanon_(r, cum, agg) {
  var ft = r.ft, fy = r.fy || (/^\d{6}$/.test(ft) ? "FY" + fyOfMonthKey_(ft) : "");
  var keys = fyInfo_(fy).keys, sm = [], cm = [];
  if (/^\d{6}$/.test(ft)) { sm = [ft]; var i = keys.indexOf(ft); cm = i >= 0 ? keys.slice(0, i + 1) : [ft]; }
  else if (/^Q[1-4]$/i.test(ft)) { var q = parseInt(ft.slice(1), 10); sm = keys.slice((q - 1) * 3, q * 3); cm = keys.slice(0, q * 3); }
  var res = null;
  if (sm.length && agg) {
    var grp = exsCtyG_(r.country), seg = EXF.segClean(r.segment);
    var lyS = exsSum_(agg, grp, seg, exsLy_(sm), fy), lyC = exsSum_(agg, grp, seg, exsLy_(cm), fy);
    var c = cum ? { v: cum.f, b: cum.b } : exsSum_(agg, grp, seg, cm, fy);
    res = EXF.results({ ft: ft, fy: fy, tFct: r.tFct,
      single: { v: r.f, b: r.b, ly: lyS.v },
      cum: { v: c.v, b: c.b, ly: lyC.v, from: cm[0], to: cm[cm.length - 1] } });
  }
  return EXF.render(EXF.parse(r.e), res);
}

/* ── ghi lại các dòng [r1..r2] (số dòng Sheet) theo khung ─────────────────── */
function exsApply_(ss, sh, r1, r2, opt) {
  opt = opt || {};
  var idx = exsIdx_(sh), from = exsFrom_();
  if (idx.explanation < 0 || idx.ver < 0 || idx.country < 0 || idx.segment < 0) return { ok: false, error: "columns" };
  var last = sh.getLastRow(), start = idx._start;
  r1 = Math.max(r1, start); r2 = Math.min(r2, last);
  if (r2 < r1) return { ok: true, changed: 0 };
  var w1 = Math.max(start, r1 - EXS.WIN), w2 = Math.min(last, r2 + EXS.WIN);
  var vals = sh.getRange(w1, 1, w2 - w1 + 1, idx._lastCol).getValues();
  var rows = vals.map(function (v, i) { return exsRow_(v, idx, w1 + i); });
  var cumBy = {}, singleBy = {};
  rows.forEach(function (r) {
    if (!exsIsSegTotal_(r)) return;
    var k = exsKey_(r);
    if (/^cu/i.test(r.sc)) cumBy[k] = r; else if (!singleBy[k]) singleBy[k] = r;
  });
  var ec = idx.explanation + 1, explEdited = !opt.c1 || (opt.c1 <= ec && ec <= opt.c2);
  var target = {}, light = [];
  rows.forEach(function (r) {
    if (r.n < r1 || r.n > r2 || !r.ver || r.ver < from) return;
    if (exsIsFrame_(r, from)) { target[r.n] = r; return; }
    if (exsIsSegTotal_(r) && /^cu/i.test(r.sc)) { var s = singleBy[exsKey_(r)]; if (s && exsIsFrame_(s, from)) target[s.n] = s; return; }
    if (explEdited && r.distributor && !/total$/i.test(r.distributor)) light.push(r);
  });
  var agg = null, changed = 0, list = [];
  Object.keys(target).forEach(function (n) {
    var r = target[n];
    if (/^not\s*requirement\s*$/i.test(r.e.trim())) return;
    if (!agg) agg = exsAgg_(ss);
    var t = exsCanon_(r, cumBy[exsKey_(r)], agg);
    if (t !== r.e) { if (!opt.dry) sh.getRange(r.n, ec).setValue(t); changed++; list.push(r.n); }
  });
  light.forEach(function (r) {
    var t = EXF.marksOnly(r.e);
    if (t !== r.e) { if (!opt.dry) sh.getRange(r.n, ec).setValue(t); changed++; list.push(r.n); }
  });
  return { ok: true, changed: changed, rows: list, frames: Object.keys(target).length };
}

/* ② v1.1 (26/11/2026, người dùng: "các data đang điền thì không được đụng vào") — KHÔNG còn simple trigger onEdit:
   gõ / dán trên Sheet giữ NGUYÊN chữ người nhập. Chỉ ghi khi người dùng chủ động: bấm Save trên app (exSave) hoặc chạy menu ✍️. */

/* ④ Menu — áp khung cho mọi dòng Ver ≥ mốc */
function exfFormatAll() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(CONFIG.EXPL_SHEET_NAME);
  var r = sh ? exsFormatAllCore_(ss, sh, false) : { ok: false, error: "no sheet" };
  try {
    SpreadsheetApp.getUi().alert("Explanations — HQ format",
      r.ok ? ("Rows using the HQ layout (Ver ≥ " + exsFrom_() + "): " + r.frames + "\nCells rewritten: " + r.changed)
           : ("Not done: " + (r.error || "?")), SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (ignore) {}
  return r;
}
function exsFormatAllCore_(ss, sh, dry) {
  var idx = exsIdx_(sh), from = exsFrom_();
  if (idx.ver < 0) return { ok: false, error: "columns" };
  var start = idx._start, last = sh.getLastRow();
  if (last < start) return { ok: true, frames: 0, changed: 0 };
  var vers = sh.getRange(start, idx.ver + 1, last - start + 1, 1).getValues();
  var a = -1, b = -1;
  vers.forEach(function (v, i) { var s = normalizeVer_(v[0]); if (/^\d{8}$/.test(s) && s >= from) { if (a < 0) a = i; b = i; } });
  if (a < 0) return { ok: true, frames: 0, changed: 0 };
  var r = exsApply_(ss, sh, start + a, start + b, { dry: dry });
  if (!dry && r.changed) bumpCacheGen_();
  return r;
}

/* ③ getExplanations_: thay chữ dòng khung bằng chữ chuẩn + ghi lại ô còn khác (tối đa READ_WRITES ô / lượt) */
function exsDecorate_(ss, sh, idx, list) {
  var from = exsFrom_(), cumBy = {}, frames = [];
  list.forEach(function (x) {
    if (!exsIsSegTotal_(x.r)) return;
    if (/^cu/i.test(x.r.sc)) cumBy[exsKey_(x.r)] = x.r;
    else if (exsIsFrame_(x.r, from)) frames.push(x);
  });
  if (!frames.length) return 0;
  var agg = exsAgg_(ss), writes = 0, ec = idx.explanation + 1;
  frames.forEach(function (x) {
    x.num.fr = 1;
    if (/^not\s*requirement\s*$/i.test(x.r.e.trim())) return;
    x.num.e = exsCanon_(x.r, cumBy[exsKey_(x.r)], agg);     // v1.1: chỉ HIỂN THỊ theo khung trên app — KHÔNG ghi vào Sheet
  });
  return writes;
}

/* ① App: exSave / exPart / exFmt (JSONP) ──────────────────────────────── */
function exsRoute_(action, p) {
  if (action === "exPart") return exsPart_(p);
  if (action === "exSave") return exsSave_(p);
  if (action === "exFmt") {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.EXPL_SHEET_NAME);
    if (!sh) return { ok: false, error: "Tab '" + CONFIG.EXPL_SHEET_NAME + "' not found." };
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return { ok: false, code: "BUSY", error: "Busy — try again." };
    try { return exsFormatAllCore_(ss, sh, true); } finally { lock.releaseLock(); }   // v1.1: chỉ xem trước, không ghi
  }
  return { ok: false, error: "Unknown action: " + action };
}
function exsPart_(p) {
  var id = String(p.pid || "").replace(/[^\w-]/g, "").slice(0, 40), i = parseInt(p.i, 10);
  if (!id || isNaN(i) || i < 0 || i > 40) return { ok: false, error: "bad part" };
  CacheService.getScriptCache().put("exsp_" + id + "_" + i, String(p.d || ""), 900);
  return { ok: true, i: i };
}
function exsWho_() {
  var u = "";
  try { u = Session.getActiveUser().getEmail() || ""; } catch (e) {}
  return u || "Someone";
}
function exsSave_(p) {
  var cache = CacheService.getScriptCache();
  var rid = String(p.rid || "").replace(/[^\w-]/g, "").slice(0, 48);
  if (rid) { var done = cache.get("exs_rid_" + rid); if (done) { try { return JSON.parse(done); } catch (e) {} } }
  var text = String(p.text == null ? "" : p.text);
  if (p.pid) {
    var n = parseInt(p.pn, 10), parts = [], id = String(p.pid).replace(/[^\w-]/g, "").slice(0, 40);
    if (!(n > 0 && n <= 40)) return { ok: false, error: "bad parts" };
    var keys = []; for (var i = 0; i < n; i++) keys.push("exsp_" + id + "_" + i);
    var got = cache.getAll(keys);
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) return { ok: false, code: "PARTS", error: "Text did not arrive completely — try again." }; parts.push(got[keys[j]]); }
    text = parts.join("");
  }
  if (text.length > 20000) return { ok: false, error: "Explanation is too long (max 20,000 characters)." };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, code: "BUSY", error: "The sheet is busy — try again in a moment." };
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.EXPL_SHEET_NAME);
    if (!sh) return { ok: false, error: "Tab '" + CONFIG.EXPL_SHEET_NAME + "' not found." };
    var idx = exsIdx_(sh);
    if (idx.explanation < 0) return { ok: false, error: "Column Explanation not found." };
    var want = {
      ver: normalizeVer_(p.ver), ft: String(p.ft || "").trim(), sc: /^cu/i.test(String(p.sc || "")) ? "c" : "s",
      grp: String(p.cty || "") === "t" ? "TH" : (String(p.cty || "") === "g" ? "G" : "VN"),
      seg: String(p.seg || "").trim().toLowerCase(), dist: String(p.dist || "").trim().toLowerCase(),
      tFct: String(p.tfct || "").trim().toLowerCase()
    };
    function same(r) {
      if (r.ver !== want.ver || r.ft !== want.ft) return false;
      if (want.tFct && r.tFct.toLowerCase() !== want.tFct) return false;
      if ((/^cu/i.test(r.sc) ? "c" : "s") !== want.sc) return false;
      var g = /^grand/i.test(r.country) ? "G" : exsCtyG_(r.country);
      if (g !== want.grp) return false;
      if (want.grp === "G") return true;
      var d = r.distributor && !/total$/i.test(r.distributor) ? r.distributor.toLowerCase() : "";
      if (d !== want.dist) return false;
      if (!want.seg) return !r.segment && /total$/i.test(r.country);      // country total
      return EXF.segClean(r.segment).toLowerCase() === want.seg && (d || exsIsSegTotal_(r));
    }
    var start = idx._start, last = sh.getLastRow(), row = parseInt(p.row, 10), r = null;
    if (row >= start && row <= last) {
      var one = exsRow_(sh.getRange(row, 1, 1, idx._lastCol).getValues()[0], idx, row);
      if (same(one)) r = one;
    }
    if (!r) {                                                   // dòng đã dời ⇒ tìm lại theo khoá
      var all = sh.getRange(start, 1, last - start + 1, idx._lastCol).getValues();
      for (var k = 0; k < all.length && !r; k++) { var x = exsRow_(all[k], idx, start + k); if (same(x)) r = x; }
    }
    if (!r) return { ok: false, code: "STALE", error: "This row is no longer in the sheet (it was moved or deleted). Refresh and try again." };

    var from = exsFrom_(), frame = exsIsFrame_(r, from), out;
    r.e = text;
    if (frame) {
      var w1 = Math.max(start, r.n - EXS.WIN), w2 = Math.min(last, r.n + EXS.WIN), cum = null, key = exsKey_(r);
      sh.getRange(w1, 1, w2 - w1 + 1, idx._lastCol).getValues().forEach(function (v, i) {
        var c = exsRow_(v, idx, w1 + i);
        if (!cum && /^cu/i.test(c.sc) && exsIsSegTotal_(c) && exsKey_(c) === key) cum = c;
      });
      out = exsCanon_(r, cum, exsAgg_(ss));
    } else {
      out = r.ver >= from ? EXF.marksOnly(text) : text.trim();
    }
    sh.getRange(r.n, idx.explanation + 1).setValue(out);
    SpreadsheetApp.flush();
    var who = exsWho_();
    try {
      var log = ss.getSheetByName(EDITLOG_SHEET);
      if (log) {
        var a1 = sh.getRange(r.n, idx.explanation + 1).getA1Notation();
        log.appendRow([new Date(), who, CONFIG.EXPL_SHEET_NAME, a1, a1.replace(/[0-9]/g, ""), "Explanation (app)", out.length > 60 ? out.slice(0, 59) + "…" : out]);
      }
    } catch (e) {}
    bumpCacheGen_();
    var res = { ok: true, row: r.n, text: out, fr: frame ? 1 : 0, by: who, at: Date.now() };
    if (rid) { try { cache.put("exs_rid_" + rid, JSON.stringify(res), 600); } catch (e) {} }
    return res;
  } finally { lock.releaseLock(); }
}

/* ── v1.2 (26/11/2026) KHÔI PHỤC 1 LẦN: bản v1.0 lỡ ghi đè 35 ô Explanation của Ver 20261127 (khi app đọc dữ liệu ~12:56).
   Trả về đúng chữ cũ — CHỈ ô vẫn còn đúng chữ máy ghi (4 mục không ai sửa thêm); ô đã có người sửa ⇒ giữ nguyên, ghi vào báo cáo.
   Chạy 1 lần (Script Property EXS_RESTORE_1126) ở onOpen (mở Sheet) hoặc lần app đọc dữ liệu kế tiếp. ── */
var EXS_RS = {
  PROP: "EXS_RESTORE_1126", VER: "20261127",
  TPL: "■ Results\nMonthly Result for [Month]: Sales XXXX / YoY ±XX% / vs. Budget ±XX%\nCumulative Result: Sales XXXX / YoY ±XX% / vs. Budget ±XX%\n■ Key Factors\n■ Market and Competitor situation\n■ Outlook and Actions Going Forward\n■ Requests to Other Departments",
  OLD: { "202611": "TPL", "202612": "", "202701": "keeping information", "202702": "keeping information", "Q2": "" }
};
function exsRestore1126_(ss) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(EXS_RS.PROP)) return null;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return null;
  try {
    if (props.getProperty(EXS_RS.PROP)) return null;
    var sh = ss.getSheetByName(CONFIG.EXPL_SHEET_NAME);
    if (!sh) return null;
    var idx = exsIdx_(sh), start = idx._start, last = sh.getLastRow(), ec = idx.explanation + 1;
    var vals = sh.getRange(start, 1, last - start + 1, idx._lastCol).getValues();
    var done = [], kept = [];
    function secs(t) { var o = EXF.parse(t); return JSON.stringify([o.key, o.mkt, o.out, o.req]); }
    vals.forEach(function (v, i) {
      var r = exsRow_(v, idx, start + i);
      if (r.ver !== EXS_RS.VER || /^cu/i.test(r.sc) || !exsIsSegTotal_(r)) return;
      if (!(r.ft in EXS_RS.OLD)) return;
      var old = EXS_RS.OLD[r.ft] === "TPL" ? EXS_RS.TPL : EXS_RS.OLD[r.ft];
      var cur = r.e;
      if (cur === old) return;
      var machine = /^■ Results\n(Monthly|Quarterly) Result for /.test(cur) && !/XXXX/.test(cur);   // chữ do bản v1.0 ghi
      if (machine && secs(cur) === secs(old)) { sh.getRange(r.n, ec).setValue(old); done.push(r.n); }
      else kept.push(r.n);
    });
    var rep = { at: new Date().toISOString(), restored: done.length, rows: done, kept: kept };
    props.setProperty(EXS_RS.PROP, JSON.stringify(rep));
    if (done.length) bumpCacheGen_();
    return rep;
  } finally { lock.releaseLock(); }
}
