/* ════════════════════════════════════════════════════════════════════
   MMH KPI FY68  ·  KpiThaiEvents.gs                              v1.0 (29/10/2026)
   NGUỒN 9 · SỰ KIỆN THÁI LAN — đọc thẳng sheet REPORT_EVENT của 2 file sự kiện nhóm Thái
   (thay "KPI Hub" cũ: code đếm sự kiện Thái không còn trong project ⇒ C11 / C13 trống từ đầu FY68).
   ────────────────────────────────────────────────────────────────────
   File (cùng Shared Drive với file KPI ⇒ tài khoản chạy KpiSyncCenter đọc được, không cần cấp quyền mới):
     · th_surg  "4. Thailand - Surgical - Marketing Offline FY67-FY68"  ⇒ C13-00 · C11-01 (Dao) · C11-01a (Miew)
     · th_dent  "2. Thailand - Dental Event Report FY67"                ⇒ C14-00 (Sui) · C11-02 (Man)
     Đổi file: Script Property KSC_ID_THS / KSC_ID_THD.
   RULE (4. Rule nhóm 7 + 4B. Event Definitions + 3B. KPI Source Map — người dùng xác nhận 29/10/2026):
     · Phân loại theo NGƯỜI DẪN nội dung (cột KOL/PIC), mỗi sự kiện 1 loại, tính 1 lần:
         Type of event có Exhibition / Booth   ⇒ Triển lãm
         KOL/PIC bắt đầu bằng "MMH"            ⇒ Thành viên MMH dẫn
         còn lại (Dr. …)                        ⇒ KOL dẫn
     · Chỉ tính Action Status = As planned / Additional / Change schedule · theo cột Month.
     · Surgical: C13-00 = KOL + Triển lãm · C11-01 = MMH dẫn · C11-01a = MMH dẫn và Target product có "Manipler".
     · Dental:   C14-00 = mọi sự kiện (KOL + MMH + Triển lãm) · C11-02 = MMH dẫn.
   Ghi vào cột "<tháng> Actual" của 3. Detail KPI (tháng đã tới), tab KPI của CRM Thái tự nhận lại số (dòng event_hub).
   ════════════════════════════════════════════════════════════════════ */
var KSC_THEV = {
  SHEET     : 'REPORT_EVENT',
  OK_STATUS : ['as planned', 'additional', 'change schedule'],
  EXHIBIT_RE: /exhibit|booth/,
  MMH_RE    : /^mmh([\s_\-.:]|$)/,
  FILES: {
    th_surg: { id: '1s6ny0CSsF0WECR_8Zu41eU2kCFrmYHYbEa3GIWSbO1M', prop: 'KSC_ID_THS', label: 'Sự kiện Surgical Thái' },
    th_dent: { id: '12GnjS0esEOfW3_uWTrTwe0AQgOtAVsIuqDiSSCea308', prop: 'KSC_ID_THD', label: 'Sự kiện Dental Thái' }
  },
  /* mã KPI ⇒ [nguồn, điều kiện] */
  CODES: {
    'C13-00' : ['th_surg', function (e) { return e.kind !== 'mmh'; }],
    'C11-01' : ['th_surg', function (e) { return e.kind === 'mmh'; }],
    'C11-01a': ['th_surg', function (e) { return e.kind === 'mmh' && /manipler/.test(e.prodKey); }],
    'C14-00' : ['th_dent', function (e) { return true; }],
    'C11-02' : ['th_dent', function (e) { return e.kind === 'mmh'; }]
  },
  RULES: {
    'C13-00' : 'Số sự kiện Surgical Thái do KOL dẫn (cột KOL/PIC không phải "MMH …") cộng triển lãm (Exhibition, Booth activity) · REPORT_EVENT theo Month · Action Status = As planned / Additional / Change schedule.',
    'C11-01' : 'Số sự kiện Surgical Thái do thành viên MMH dẫn (cột KOL/PIC = "MMH …", không phải triển lãm) · REPORT_EVENT theo Month · Action Status = As planned / Additional / Change schedule.',
    'C11-01a': 'Như C11-01, chỉ sự kiện có Target product chứa Manipler.',
    'C14-00' : 'Số sự kiện Dental Thái (KOL dẫn, MMH dẫn và triển lãm) · REPORT_EVENT theo Month · Action Status = As planned / Additional / Change schedule.',
    'C11-02' : 'Số sự kiện Dental Thái do thành viên MMH dẫn (cột KOL/PIC = "MMH …", không phải triển lãm) · REPORT_EVENT theo Month · Action Status = As planned / Additional / Change schedule.'
  }
};
function kscThevId_(src) {
  var f = KSC_THEV.FILES[src], v = '';
  try { v = PropertiesService.getScriptProperties().getProperty(f.prop) || ''; } catch (e) {}
  return v || f.id;
}
function kscThevKind_(typeKey, kolKey) {
  if (KSC_THEV.EXHIBIT_RE.test(typeKey)) return 'exh';
  if (KSC_THEV.MMH_RE.test(kolKey)) return 'mmh';
  return 'kol';
}
/* đọc REPORT_EVENT: mọi dòng có Month, kèm loại + có được tính không */
function kscThevRead_(ss) {
  var sh = ss.getSheetByName(KSC_THEV.SHEET);
  if (!sh) return { err: 'File không có sheet "' + KSC_THEV.SHEET + '"' };
  var lr = sh.getLastRow(), lc = Math.min(sh.getLastColumn(), 40);
  if (lr < 2) return { rows: [], sheet: sh };
  var V = sh.getRange(1, 1, lr, lc).getValues(), hr = -1, C = {};
  for (var i = 0; i < Math.min(lr, 10) && hr < 0; i++) {
    var h = V[i].map(kscNorm_);
    if (h.indexOf('month') >= 0 && h.some(function (x) { return x.indexOf('type of event') === 0; })) { hr = i; h.forEach(function (x, k) { if (x && C[x] == null) C[x] = k; }); }
  }
  if (hr < 0) return { err: 'Sheet ' + KSC_THEV.SHEET + ' không có dòng tiêu đề (Month, Type of event)' };
  function col(re) { var k = null; Object.keys(C).forEach(function (x) { if (k == null && re.test(x)) k = C[x]; }); return k; }
  var cM = C['month'], cD = col(/^date$/), cN = col(/^event name/), cT = col(/^type of event/), cP = col(/^target product/),
      cK = col(/^kol/), cS = col(/^action status/), cL = col(/^detail event folder/), cPp = col(/^actual participant/);
  if ([cM, cT, cK, cS].some(function (x) { return x == null; })) return { err: 'Sheet ' + KSC_THEV.SHEET + ' thiếu cột (Month, Type of event, KOL/ PIC, Action Status)' };
  var rows = [];
  for (var r = hr + 1; r < lr; r++) {
    var x = V[r], ym = kscIsDate_(x[cM]) ? kscYm_(x[cM]) : kscYm_(null, x[cM]); if (!ym) continue;
    var name = cN == null ? '' : String(x[cN] || '').trim(), type = String(x[cT] || '').trim(), kol = String(x[cK] || '').trim();
    if (!name && !type && !kol) continue;
    var st = String(x[cS] || '').trim(), typeKey = kscNorm_(type), kolKey = kscNorm_(kol);
    rows.push({ row: r + 1, ym: ym, date: cD == null ? '' : x[cD], name: name, type: type, kol: kol, status: st,
      prodKey: cP == null ? '' : kscNorm_(x[cP]), link: cL == null ? '' : String(x[cL] || '').trim(), pp: cPp == null ? 0 : (kscNum_(x[cPp]) || 0),
      kind: kscThevKind_(typeKey, kolKey), counted: KSC_THEV.OK_STATUS.indexOf(kscNorm_(st)) >= 0 });
  }
  return { rows: rows, sheet: sh };
}
/* chạy 1 nguồn (th_surg / th_dent) */
function kscThev_(ctx, src, why) {
  var id = kscThevId_(src), ss = SpreadsheetApp.openById(id), L = ctx.L;
  var out = { title: kscLabel_(src), file: ss.getName(), sheet: KSC_THEV.SHEET, rules: {}, codeUrls: {} };
  var X = kscThevRead_(ss);
  if (X.err) { out.status = 'error'; out.msg = X.err; return out; }
  try { out.url = kscUrl_(ss, X.sheet); } catch (eu) {}
  var codes = Object.keys(KSC_THEV.CODES).filter(function (c) { return KSC_THEV.CODES[c][0] === src && L.rows[c] != null; });
  var fyRows = X.rows.filter(function (r) { return L.months.indexOf(r.ym) >= 0; });
  if (!fyRows.length) { out.status = 'error'; out.codes = []; out.msg = 'File "' + ss.getName() + '" ▸ ' + KSC_THEV.SHEET + ' chưa có sự kiện nào thuộc ' + L.fy + ' ⇒ chưa ghi số.'; return out; }
  var months = L.months.filter(function (m) { return m <= ctx.curYm; }), data = {};
  codes.forEach(function (c) {
    var fn = KSC_THEV.CODES[c][1]; data[c] = {};
    months.forEach(function (m) { data[c][m] = fyRows.filter(function (e) { return e.ym === m && e.counted && fn(e); }).length; });
    out.rules[c] = KSC_THEV.RULES[c];
    out.codeUrls[c] = out.url || '';
  });
  out.codes = codes;
  var st = kscWrite_(ctx, src, data, { why: why });
  var skip = fyRows.filter(function (e) { return !e.counted && months.indexOf(e.ym) >= 0; }).length;
  var last = months.slice(-2).map(function (m) {
    var ev = fyRows.filter(function (e) { return e.ym === m && e.counted; });
    var n = function (k) { return ev.filter(function (e) { return e.kind === k; }).length; };
    return m + ': ' + ev.length + ' sự kiện (KOL ' + n('kol') + ' · MMH ' + n('mmh') + ' · triển lãm ' + n('exh') + ')';
  }).join(' | ');
  return kscResult_(out, st, 'File "' + ss.getName() + '" · ' + fyRows.length + ' dòng ' + L.fy + ' · ' + last + (skip ? ' · ' + skip + ' dòng không tính (Action Status khác)' : ''));
}
function kscThevSrcOf_(code) { var x = KSC_THEV.CODES[code]; return x ? x[0] : ''; }
function kscThevRule_(code) { return KSC_THEV.RULES[code] || ''; }
/* câu giải thích cho PDF: liệt kê sự kiện được tính trong kỳ */
function kscThevExplain_(code, X, R, reach, A) {
  var src = kscThevSrcOf_(code); if (!src) return [A != null ? A + ' sự kiện' + reach + '.' : 'Chưa có số trong kỳ.'];
  var ss, Y;
  try { ss = SpreadsheetApp.openById(kscThevId_(src)); Y = kscThevRead_(ss); } catch (e) { Y = { err: String(e && e.message || e) }; }
  X.label = KSC_THEV.FILES[src].label; X.sheet = KSC_THEV.SHEET;
  if (Y.err) return ['Chưa đọc được file sự kiện (' + Y.err + ').'];
  try { X.url = kscUrl_(ss, Y.sheet); } catch (eu) {}
  var fn = KSC_THEV.CODES[code][1], KIND = { kol: 'KOL', mmh: 'MMH', exh: 'triển lãm' };
  var ev = Y.rows.filter(function (e) { return R.eff.indexOf(e.ym) >= 0 && e.counted && fn(e); }), out = [];
  out.push((ev.length ? ev.length + ' sự kiện' : 'Chưa có sự kiện nào được tính') + reach + (ev.length ? ':' : '.'));
  ev.slice(0, 12).forEach(function (e) {
    out.push('• ' + kscMoffDate_(e.date, e.ym) + ': ' + (String(e.name || '').replace(/^\s*\d{8}(-\d{1,2})?\s*/, '') || '(chưa ghi tên)') +
      ' (' + (e.type || 'chưa ghi loại') + ' · ' + KIND[e.kind] + (e.kol ? ' · ' + e.kol : '') + ')' + (e.pp ? ', ' + kscFmtNum_(e.pp) + ' người tham dự' : ''));
  });
  if (ev.length > 12) out.push('và ' + (ev.length - 12) + ' sự kiện khác.');
  return out;
}
