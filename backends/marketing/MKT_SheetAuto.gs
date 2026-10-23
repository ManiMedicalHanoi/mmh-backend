/*************************************************************************************************
 * MMH REPORT HUB — MKT_SheetAuto.gs   (v1.2 · 23/10/2026 · v1.2: rule KPI người tham dự mới (4 trường + đồng ý dữ liệu) · v1.1: file Ads nhiều cấp ⇒ chỉ cộng dòng chiến dịch · thư mục Ads Manager: MKT_AdsImport.gs)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * TỰ ĐỘNG HOÁ 2 FILE MARKETING — chạy trong project marketing (có quyền Drive / Sheets của mọi file).
 * Gọi từ: evsOnChange (trigger onChange 2 file MKT) · evsSyncTick (10 phút/lần) · action=mktAuto.
 * Mọi bước: đọc cả vùng 1 lần, chỉ ghi ô thay đổi, ghi theo lô; lỗi 1 bước không chặn bước khác / đồng bộ sự kiện.
 *
 * FILE "3. Vietnam - Digital Marketing & Design FY68"
 *  ① EVENT REPORT / PRODUCT REPORT (tìm cột theo TÊN tiêu đề):
 *     · Month = CÔNG THỨC từng dòng theo "On-air dự kiến" (yyyymm). Dòng chưa có On-air dự kiến mà Month gõ tay ⇒ giữ nguyên.
 *     · "Ngày điền link (auto)": có Link report mà ô trống ⇒ hôm nay · xoá link ⇒ xoá ngày.
 *     · "On-air thực tế" = CÔNG THỨC = Ngày điền link (chỉ khi có link). Ai gõ tay ngày vào On-air thực tế (có link)
 *       ⇒ ngày đó được chép sang "Ngày điền link" trước khi đặt lại công thức (giữ ý người sửa).
 *     · Status (có link + có On-air dự kiến): thực tế ≤ dự kiến ⇒ "On air đúng hạn", ngược lại "On air muộn"
 *       (đúng chính tả trong danh sách chọn của sheet). KHÔNG đụng dòng "Cancel". Dòng chưa có link giữ Status gõ tay.
 *  ② ORDER REPORT: "Ngày điền link (auto)" (Q) = hôm nay khi có Task Result mà Q trống ·
 *     "Check deadline report" = CÔNG THỨC: Q ≤ Deadline ⇒ On time · Q > Deadline ⇒ Late · chưa xong & quá hạn ⇒ Late.
 *     Bỏ danh sách chọn cũ ở cột này. (KPI C17-05 đếm "On time" — giữ đúng chữ.)
 *  ③ ADS REPORT: cột "File Report" (link Google Drive của file xuất từ Facebook Ads Manager — .xlsx / .csv / Google Sheet)
 *     ⇒ tự điền Tiếp cận, Lượt hiển thị, Kết quả (Inbox), CPR, Ngân sách đã chi tiêu, Ngày bắt đầu / kết thúc
 *     (cộng mọi dòng dữ liệu, bỏ dòng tổng). Chỉ ghi ô trống hoặc ô còn giữ số tự điền lần trước. Mỗi link đọc 1 lần
 *     (nhớ dấu link theo dòng ở Script Property MKTA_ADS) · trạng thái ghi vào GHI CHÚ (note) của ô File Report.
 * FILE "2. Vietnam - Marketing Offline FY68"
 *  ④ REPORT_EVENT / PLAN_EVENT: Month = CÔNG THỨC theo Date ("20261026-29" ⇒ 202610) — chỉ dòng có Date.
 *     REPORT_EVENT thêm cột "Hình thức" (Trực tiếp / Webinar) + "Bằng chứng tham dự (scan ký tên / báo cáo Zoom)".
 *     "Actual Participant" = số SĐT KHÁC NHAU ở CUSTOMER LIST cùng sự kiện + tháng (mỗi người 1 lần / sự kiện), đủ 4 trường bắt buộc
 *     Họ tên (Name) · SĐT (Tel) · Nơi công tác (Workplace) · Email, và: trực tiếp = "Xác nhận tham dự" Ký tay + "Đồng ý sử dụng dữ liệu" = Đã đồng ý…;
 *     webinar = "Xác nhận tham dự" Zoom (báo cáo người tham dự xuất từ Zoom). Chưa có bằng chứng tham dự ⇒ 0 (không tính KPI).
 *     v1.2 (23/10/2026 — rule KPI mới của chị Tuyên): bỏ điều kiện Province / Tittle, thêm Email; trực tiếp phải có đồng ý dữ liệu / hình ảnh.
 *     Chỉ áp cho sự kiện bắt đầu từ MKTA.RULE_FROM (14/10/2026) — sự kiện cũ giữ công thức cũ (KPI quá khứ không đổi).
 *  ⑤ CUSTOMER LIST: thêm "Xác nhận tham dự" (Ký tay / Zoom / Chưa xác nhận) + "Đồng ý sử dụng dữ liệu" + "Email" (nếu tab chưa có cột Email).
 *  ⑥ action=evProof — tải bằng chứng tham dự vào folder sự kiện (op=list | upload).
 * Chuyển đổi bố cục 1 lần (thêm cột, danh sách chọn, công thức): Script Property MKT_AUTO_V = MKTA_VER.
 *************************************************************************************************/

var MKTA_VER = '1';
var MKTA = {
  OFF_ID: '16vIDYRhm6Cj9DN4C26rvbBPW1hF3vAnZ7lgl6Bd02w8',     // 2. Vietnam - Marketing Offline FY68
  ON_ID:  '1JbuvmdfJAX2f8fl49tpcJhgepyGLm81GOS4xXiEKSfc',     // 3. Vietnam - Digital Marketing & Design FY68
  H_FILE: 'File Report',
  H_FORM: 'Hình thức',
  H_PROOF: 'Bằng chứng tham dự (scan ký tên / báo cáo Zoom)',
  H_CONF: 'Xác nhận tham dự',
  H_CONSENT: 'Đồng ý sử dụng dữ liệu',
  H_EMAIL: 'Email',
  FORM_LIST: ['Trực tiếp', 'Webinar'],
  CONF_LIST: ['Ký tay', 'Zoom', 'Chưa xác nhận'],
  CONSENT_LIST: ['Đã đồng ý (form online)', 'Đã đồng ý (ký tay)', 'Chưa'],
  ADS_PER_RUN: 6,
  RULE_FROM: '20261014',   // sự kiện bắt đầu từ ngày này mới áp quy định xác nhận tham dự (sự kiện cũ giữ công thức cũ ⇒ KPI quá khứ không đổi)
  PROOF_MAX_MB: 25,
  PROOF_EXT: { pdf:'application/pdf', jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
               xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv:'text/csv' },
  NOTE_CONF: 'QUY ĐỊNH XÁC NHẬN THAM DỰ (theo quản lý):\n' +
    '• Sự kiện trực tiếp: phải có danh sách check-in KÝ TÊN — chữ ký xác nhận người đó đã tham dự.\n' +
    '• Sự kiện trực tiếp còn phải có xác nhận ĐỒNG Ý sử dụng dữ liệu / hình ảnh cá nhân — ghi ở cột "Đồng ý sử dụng dữ liệu" (Đã đồng ý…).\n' +
    '• Webinar: phải có báo cáo người tham dự xuất từ Zoom (người THỰC SỰ vào phòng, không phải danh sách đăng ký).\n' +
    '• Mỗi người chỉ tính 1 lần / sự kiện (bỏ trùng theo SĐT) và phải đủ 4 thông tin bắt buộc: Họ tên (Name), SĐT (Tel), Nơi công tác (Workplace), Email.\n' +
    'Chọn "Ký tay" / "Zoom" khi đã đối chiếu; chưa đối chiếu ⇒ "Chưa xác nhận" (không tính).',
  NOTE_EMAIL: 'Email của khách — 1 trong 4 thông tin bắt buộc để tính KPI người tham dự (Họ tên, SĐT, Nơi công tác, Email).',
  NOTE_CONSENT: 'Bắt buộc với sự kiện TRỰC TIẾP để tính KPI người tham dự. Khách đã đồng ý cho MMH sử dụng dữ liệu cá nhân chưa: "Đã đồng ý (form online)" (tick trên form đăng ký), ' +
    '"Đã đồng ý (ký tay)" (ký trên tờ check-in / phiếu đồng ý), "Chưa".',
  NOTE_FORM: 'Trực tiếp ⇒ bằng chứng = scan danh sách ký tên · Webinar ⇒ bằng chứng = báo cáo người tham dự xuất từ Zoom.',
  NOTE_PROOF: 'Link file bằng chứng tham dự (scan danh sách ký tên / báo cáo Zoom) — nằm trong folder sự kiện (cột Detail event folder link). ' +
    'Tải lên từ Report Hub (tự ghi link vào đây) hoặc dán link tay, mỗi link 1 dòng.\n' +
    'Ô này TRỐNG ⇒ "Actual Participant" = 0 (sự kiện chưa được tính KPI).',
  NOTE_FILE: 'Dán link Google Drive của file xuất từ Facebook Ads Manager (.xlsx, .csv hoặc Google Sheet). Hệ thống tự điền Tiếp cận, ' +
    'Lượt hiển thị, Kết quả (Inbox), CPR, Ngân sách đã chi tiêu, Ngày bắt đầu / kết thúc (cộng mọi dòng, bỏ dòng tổng) trong ~10 phút. ' +
    'Ô đã gõ tay khác số tự điền thì giữ nguyên. Đọc lại file: xoá link rồi dán lại.'
};

/* ══════════════ TIỆN ÍCH ══════════════ */
function mktaS_(v){ return v === null || v === undefined ? '' : String(v).trim(); }
function mktaNorm_(s){
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');
}
function mktaHash_(s){ var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function mktaA1_(c){ var s = ''; while (c > 0){ var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = (c - m - 1) / 26; } return s; }
function mktaIsDate_(v){ return v instanceof Date && !isNaN(v.getTime()); }
function mktaDay_(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function mktaToday_(){ return mktaDay_(new Date()); }
function mktaIso_(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
/* ô ngày: Date · "17/10/2026" · "2026-10-17" ⇒ Date (chỉ ngày) hoặc null */
function mktaDate_(v){
  if (mktaIsDate_(v)) return mktaDay_(v);
  var s = mktaS_(v), m;
  if (!s) return null;
  if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/.exec(s))) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
function mktaFx_(f){ return String(f || '').replace(/\s+/g, '').toUpperCase(); }
/* công thức của ta? (dấu hiệu riêng + tham chiếu đúng dòng) */
function mktaOurs_(f, marks){
  var x = mktaFx_(f); if (!x) return false;
  for (var i = 0; i < marks.length; i++) if (x.indexOf(mktaFx_(marks[i])) < 0) return false;
  return true;
}

/* Dò hàng tiêu đề (≤ 10 hàng đầu) có cột `must` ⇒ { row, map{norm:cột}, last (cột tiêu đề cuối có chữ), lc } */
function mktaHead_(sh, must){
  var lr = sh.getLastRow(), lc = Math.max(1, sh.getLastColumn());
  if (lr < 1) return null;
  var top = sh.getRange(1, 1, Math.min(10, lr), lc).getValues(), want = mktaNorm_(must);
  for (var r = 0; r < top.length; r++){
    var hit = false;
    for (var c = 0; c < top[r].length; c++) if (mktaNorm_(top[r][c]) === want){ hit = true; break; }
    if (!hit) continue;
    var map = {}, last = 0;
    top[r].forEach(function(h, i){ var k = mktaNorm_(h); if (k){ last = i + 1; if (!(k in map)) map[k] = i + 1; } });
    return { row:r + 1, map:map, last:last, lc:lc, raw:top[r] };
  }
  return null;
}
/* tìm cột theo tên (khớp đúng trước, rồi khớp tiền tố) ⇒ số cột (1…) hoặc 0 */
function mktaCol_(H, names){
  if (!H) return 0;
  for (var i = 0; i < names.length; i++){ var k = mktaNorm_(names[i]); if (H.map[k]) return H.map[k]; }
  for (var j = 0; j < names.length; j++){
    var p = mktaNorm_(names[j]);
    for (var h in H.map) if (h.indexOf(p) === 0) return H.map[h];
  }
  return 0;
}

/* Bộ ghi theo lô: gom ô cùng cột + cùng loại liền nhau ⇒ 1 lệnh setValues / setFormulas / setNotes / setNumberFormats */
function mktaW_(sh){ return { sh:sh, m:{}, errs:[] }; }
function mktaPut_(W, r, c, v, k){ W.m[r + '|' + c + '|' + (k || 'v')] = { r:r, c:c, v:v, k:k || 'v' }; }
function mktaFlush_(W){
  var by = {}, n = 0;
  Object.keys(W.m).forEach(function(key){ var x = W.m[key]; (by[x.c + '|' + x.k] = by[x.c + '|' + x.k] || []).push(x); });
  Object.keys(by).forEach(function(key){
    var L = by[key].sort(function(a, b){ return a.r - b.r; }), i = 0;
    while (i < L.length){
      var j = i; while (j + 1 < L.length && L[j + 1].r === L[j].r + 1) j++;
      var rg = W.sh.getRange(L[i].r, L[i].c, j - i + 1, 1), arr = L.slice(i, j + 1).map(function(x){ return [x.v]; }), k = L[i].k;
      try {
        if (k === 'f') rg.setFormulas(arr); else if (k === 'n') rg.setNotes(arr);
        else if (k === 'fmt') rg.setNumberFormats(arr); else rg.setValues(arr);
        n += j - i + 1;
      } catch(e){ W.errs.push(W.sh.getName() + '!' + mktaA1_(L[i].c) + L[i].r + ': ' + (e && e.message || e)); }   // không xoá danh sách chọn
      i = j + 1;
    }
  });
  W.m = {};
  return n;
}
/* chữ đúng chính tả trong danh sách chọn của ô (vd "On air đúng hạn") — không có thì dùng fallback */
function mktaDvPick_(sh, row, col, want, fallback){
  try {
    var dv = sh.getRange(row, col).getDataValidation();
    if (dv && dv.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST){
      var L = dv.getCriteriaValues()[0] || [], w = mktaNorm_(want);
      for (var i = 0; i < L.length; i++) if (mktaNorm_(L[i]) === w) return String(L[i]);
    }
  } catch(e){}
  return fallback;
}
/* danh sách chọn cho cả cột (từ dòng first tới hết) — chỉ đặt lại khi số dòng của sheet đổi */
function mktaEnsureDv_(sh, col, first, list, key, force){
  var pr = PropertiesService.getScriptProperties(), pk = 'MKTA_DV_' + key, mr = sh.getMaxRows();
  var sig = mr + '|' + col;
  if (!force && pr.getProperty(pk) === sig) return false;
  if (mr < first) return false;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build();
  sh.getRange(first, col, mr - first + 1, 1).setDataValidation(rule);
  pr.setProperty(pk, sig);
  return true;
}
/* thêm cột tiêu đề ở cuối (sau cột tiêu đề cuối có chữ) nếu chưa có ⇒ số cột */
function mktaAddHeader_(sh, H, text, note, width, hintRow, hintText){
  var have = mktaCol_(H, [text]);
  if (have) return have;
  var col = H.last + 1;
  if (sh.getMaxColumns() < col) sh.insertColumnsAfter(sh.getMaxColumns(), col - sh.getMaxColumns());
  try { if (H.last) sh.getRange(H.row, H.last).copyTo(sh.getRange(H.row, col), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); } catch(e){}
  sh.getRange(H.row, col).setValue(text);
  if (note) sh.getRange(H.row, col).setNote(note);
  if (hintRow){
    try { if (H.last) sh.getRange(hintRow, H.last).copyTo(sh.getRange(hintRow, col), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); } catch(e){}
    sh.getRange(hintRow, col).setValue(hintText || '');
  }
  try { if (width) sh.setColumnWidth(col, width); } catch(e){}
  H.map[mktaNorm_(text)] = col; H.last = col; H.lc = Math.max(H.lc, col);
  return col;
}

/* ══════════════ ① EVENT REPORT / PRODUCT REPORT ══════════════ */
function mktaPostFormulas_(K, O, P, r){
  return {
    month: '=IF(' + K + r + '="","",IFERROR(VALUE(TEXT(IF(ISNUMBER(' + K + r + '),' + K + r + ',DATEVALUE(' + K + r + ')),"yyyymm")),""))',
    real:  '=IF(OR(TRIM(' + O + r + ')="",' + P + r + '=""),"",IFERROR(INT(' + P + r + '),""))'
  };
}
function mktaPosts_(sh, kind, rep){
  var H = mktaHead_(sh, 'On-air thực tế');
  if (!H) return rep.errors.push(sh.getName() + ': không thấy hàng tiêu đề');
  var C = {
    month: mktaCol_(H, ['Month']), plan: mktaCol_(H, ['On-air dự kiến']), real: mktaCol_(H, ['On-air thực tế']),
    status: mktaCol_(H, ['Status']), link: mktaCol_(H, ['Link report']), stamp: mktaCol_(H, ['Ngày điền link']),
    a: mktaCol_(H, kind === 'event' ? ['Event'] : ['Type']), b: mktaCol_(H, kind === 'event' ? ['Type of content'] : ['Topic'])
  };
  if (!C.plan || !C.real || !C.status || !C.link || !C.stamp) return rep.errors.push(sh.getName() + ': thiếu cột On-air / Status / Link report / Ngày điền link');
  var first = H.row + 1, last = sh.getLastRow();
  if (last < first) return;
  var nc = Math.max(C.month, C.plan, C.real, C.status, C.link, C.stamp, C.a, C.b);
  var n = last - first + 1, V = sh.getRange(first, 1, n, nc).getValues(), F = sh.getRange(first, 1, n, nc).getFormulas();
  var W = mktaW_(sh), today = mktaToday_(), stats = { stamp:0, clear:0, status:0, fx:0 };
  var Kl = mktaA1_(C.plan), Ol = mktaA1_(C.link), Pl = mktaA1_(C.stamp);
  var ON = mktaDvPick_(sh, first, C.status, 'On air đúng hạn', 'On air đúng hạn');
  var LATE = mktaDvPick_(sh, first, C.status, 'On air muộn', 'On air muộn');
  for (var i = 0; i < n; i++){
    var r = first + i, v = V[i], f = F[i];
    var link = mktaS_(v[C.link - 1]), plan = v[C.plan - 1];
    var has = link || mktaS_(plan) || (C.a && mktaS_(v[C.a - 1])) || (C.b && mktaS_(v[C.b - 1]));
    if (!has) continue;
    var fx = mktaPostFormulas_(Kl, Ol, Pl, r);
    /* Ngày điền link */
    var stamp = v[C.stamp - 1], sDay = mktaDate_(stamp);
    var realManual = !f[C.real - 1] ? mktaDate_(v[C.real - 1]) : null;
    if (link){
      if (realManual && (!sDay || sDay.getTime() !== realManual.getTime())){ sDay = realManual; mktaPut_(W, r, C.stamp, sDay); stats.stamp++; }
      else if (!sDay){ sDay = today; mktaPut_(W, r, C.stamp, today); stats.stamp++; }
    } else if (mktaS_(stamp) !== ''){ sDay = null; mktaPut_(W, r, C.stamp, ''); stats.clear++; }
    /* On-air thực tế = công thức */
    if (!mktaOurs_(f[C.real - 1], ['IFERROR(INT(' + Pl + r + ')', 'TRIM(' + Ol + r + ')'])){
      mktaPut_(W, r, C.real, fx.real, 'f'); mktaPut_(W, r, C.real, 'dd/mm/yyyy', 'fmt'); stats.fx++;
    }
    /* Month = công thức (dòng chưa có On-air dự kiến mà Month gõ tay ⇒ giữ) */
    if (C.month && (mktaS_(plan) || mktaS_(v[C.month - 1]) === '') && !mktaOurs_(f[C.month - 1], ['"yyyymm"', Kl + r])){
      mktaPut_(W, r, C.month, fx.month, 'f'); stats.fx++;
    }
    /* Status */
    var pDay = mktaDate_(plan), st = mktaS_(v[C.status - 1]);
    if (link && pDay && sDay && !/cancel/i.test(st)){
      var want = sDay.getTime() <= pDay.getTime() ? ON : LATE;
      if (mktaNorm_(st) !== mktaNorm_(want)){ mktaPut_(W, r, C.status, want); stats.status++; }
    }
  }
  var w = mktaFlush_(W); rep.errors = rep.errors.concat(W.errs);
  if (w) rep.parts.push(sh.getName() + ': ngày điền link ' + stats.stamp + ' · xoá ' + stats.clear + ' · status ' + stats.status + ' · công thức ' + stats.fx);
}

/* ══════════════ ② ORDER REPORT ══════════════ */
function mktaOrderFormula_(D, Q, r){
  return '=IFERROR(IF(' + D + r + '="","",IF(' + Q + r + '<>"",IF(INT(' + Q + r + ')<=INT(' + D + r + '),"On time","Late"),' +
         'IF(TODAY()>INT(' + D + r + '),"Late",""))),"")';
}
function mktaOrder_(sh, rep, mig){
  var H = mktaHead_(sh, 'Deadline');
  if (!H) return rep.errors.push('ORDER REPORT: không thấy hàng tiêu đề');
  var C = { dl: mktaCol_(H, ['Deadline']), task: mktaCol_(H, ['Key Task/ Event', 'Key Task']), res: mktaCol_(H, ['Task Result']),
            chk: mktaCol_(H, ['Check deadline report']), stamp: mktaCol_(H, ['Ngày điền link']) };
  if (!C.dl || !C.res || !C.chk || !C.stamp) return rep.errors.push('ORDER REPORT: thiếu cột Deadline / Task Result / Check deadline report / Ngày điền link');
  var first = H.row + 1, lr = sh.getLastRow();
  if (lr < first) return;
  /* cột G / I kéo công thức tới hàng chục nghìn dòng ⇒ dò dòng cuối có Deadline / Key task */
  var c1 = Math.min(C.dl, C.task || C.dl), c2 = Math.max(C.dl, C.task || C.dl);
  var probe = sh.getRange(first, c1, lr - first + 1, c2 - c1 + 1).getValues(), last = first - 1;
  for (var p = probe.length - 1; p >= 0; p--){
    if (mktaS_(probe[p][C.dl - c1]) || (C.task && mktaS_(probe[p][C.task - c1]))){ last = first + p; break; }
  }
  if (mig){ try { sh.getRange(first, C.chk, sh.getMaxRows() - first + 1, 1).clearDataValidations(); rep.parts.push('ORDER REPORT: bỏ danh sách chọn cột Check deadline report'); } catch(e){ rep.errors.push('ORDER REPORT DV: ' + e.message); } }
  if (last < first) return;
  var n = last - first + 1, nc = Math.max(C.dl, C.task, C.res, C.chk, C.stamp);
  var V = sh.getRange(first, 1, n, nc).getValues(), Fc = sh.getRange(first, C.chk, n, 1).getFormulas();
  var W = mktaW_(sh), today = mktaToday_(), Dl = mktaA1_(C.dl), Ql = mktaA1_(C.stamp), st = { stamp:0, est:0, fx:0 };
  var nowTxt = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  for (var i = 0; i < n; i++){
    var r = first + i, v = V[i];
    if (!mktaS_(v[C.dl - 1]) && !(C.task && mktaS_(v[C.task - 1]))) continue;
    var q = v[C.stamp - 1], isF = !!Fc[i][0];
    /* chuyển đổi 1 lần: dòng cũ ghi tay "On time" mà chưa có ngày hoàn thành ⇒ ước tính = Deadline (giữ kết quả cũ) */
    if (mig && mktaS_(q) === '' && !isF && mktaNorm_(v[C.chk - 1]) === 'ontime' && mktaDate_(v[C.dl - 1])){
      q = mktaDate_(v[C.dl - 1]); mktaPut_(W, r, C.stamp, q);
      mktaPut_(W, r, C.stamp, 'Ước tính khi chuyển sang công thức (' + nowTxt + '): trước đây ghi tay "On time", chưa có ngày điền link ⇒ lấy = Deadline.', 'n');
      st.est++;
    } else if (mktaS_(v[C.res - 1]) && mktaS_(q) === ''){ mktaPut_(W, r, C.stamp, today); st.stamp++; }
    if (!mktaOurs_(Fc[i][0], ['"On time"', 'INT(' + Ql + r + ')', 'INT(' + Dl + r + ')'])){ mktaPut_(W, r, C.chk, mktaOrderFormula_(Dl, Ql, r), 'f'); st.fx++; }
  }
  var wo = mktaFlush_(W); rep.errors = rep.errors.concat(W.errs);
  if (wo) rep.parts.push('ORDER REPORT: ngày hoàn thành ' + st.stamp + ' · ước tính ' + st.est + ' · công thức ' + st.fx);
}

/* ══════════════ ③ ADS REPORT — đọc file Facebook Ads Manager ══════════════ */
function mktaDriveId_(s){
  s = mktaS_(s); var m;
  if ((m = /\/d\/([\w-]{20,})/.exec(s)) || (m = /[?&]id=([\w-]{20,})/.exec(s)) || (m = /^([\w-]{25,})$/.exec(s))) return m[1];
  return '';
}
function mktaCellLink_(rt, txt){
  var u = '';
  try { if (rt){ u = rt.getLinkUrl() || ''; if (!u) rt.getRuns().forEach(function(x){ if (!u && x.getLinkUrl()) u = x.getLinkUrl(); }); } } catch(e){}
  if (!u){ var m = /https?:\/\/\S+/.exec(mktaS_(txt)); u = m ? m[0] : mktaS_(txt); }
  return u;
}
/* đọc file ⇒ mảng 2 chiều (hàng × cột) */
function mktaAdsRows_(id){
  var file = DriveApp.getFileById(id), mime = String(file.getMimeType() || ''), name = file.getName();
  if (mime === 'application/vnd.google-apps.spreadsheet') return { rows:SpreadsheetApp.openById(id).getSheets()[0].getDataRange().getValues(), name:name };
  var blob = file.getBlob();
  if (/spreadsheetml|officedocument|excel/i.test(mime) || /\.xlsx$/i.test(name)){
    var parts = Utilities.unzip(blob.setContentType('application/zip')), files = {};
    parts.forEach(function(b){
      var nm = b.getName();
      if (/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^\/]+\.xml)$/.test(nm)) files[nm] = b.getDataAsString('UTF-8');
    });
    return { rows:mktaXlsxRows_(files), name:name };
  }
  return { rows:mktaCsvRows_(mktaDecode_(blob.getBytes())), name:name };
}
/* byte ⇒ chữ: UTF-16 (có / không BOM — Ads Manager hay xuất UTF-16) hoặc UTF-8 */
function mktaDecode_(bytes){
  var b0 = bytes[0] & 255, b1 = bytes[1] & 255, cs = 'UTF-8';
  if (b0 === 0xFF && b1 === 0xFE) cs = 'UTF-16LE';
  else if (b0 === 0xFE && b1 === 0xFF) cs = 'UTF-16BE';
  else if (bytes.length > 3 && b1 === 0 && (bytes[3] & 255) === 0) cs = 'UTF-16LE';
  else if (bytes.length > 3 && b0 === 0 && (bytes[2] & 255) === 0) cs = 'UTF-16BE';
  return Utilities.newBlob(bytes).getDataAsString(cs).replace(/^﻿/, '');
}
function mktaXmlText_(s){
  return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function(_, n){ return String.fromCharCode(+n); })
    .replace(/&#x([0-9a-f]+);/gi, function(_, h){ return String.fromCharCode(parseInt(h, 16)); }).replace(/&amp;/g, '&');
}
function mktaXmlTs_(body){
  var t = '', re = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g, k;
  body = String(body || '').replace(/<(?:\w+:)?rPh\b[\s\S]*?<\/(?:\w+:)?rPh>/g, '');
  while ((k = re.exec(body))) t += mktaXmlText_(k[1]);
  return t;
}
/* xlsx (đã giải nén: { 'xl/…': xml }) ⇒ hàng × cột của worksheet ĐẦU TIÊN */
function mktaXlsxRows_(files){
  var ss = [], m, re = /<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g, xs = files['xl/sharedStrings.xml'] || '';
  while ((m = re.exec(xs))) ss.push(mktaXmlTs_(m[1]));
  var path = '', wb = files['xl/workbook.xml'] || '', rels = files['xl/_rels/workbook.xml.rels'] || '';
  var sm = /<(?:\w+:)?sheet\b[^>]*?\br:id="([^"]+)"/.exec(wb);
  if (sm){
    var rr = /<Relationship\b[^>]*>/g, x;
    while ((x = rr.exec(rels))){
      if ((/\bId="([^"]+)"/.exec(x[0]) || [])[1] !== sm[1]) continue;
      var tg = (/\bTarget="([^"]+)"/.exec(x[0]) || [])[1] || '';
      path = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, '');
    }
  }
  var xml = files[path] || files['xl/worksheets/sheet1.xml'];
  if (!xml){ for (var k in files) if (/^xl\/worksheets\//.test(k)){ xml = files[k]; break; } }
  if (!xml) throw new Error('File xlsx không có trang tính');
  var rows = [], cre = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, c;
  while ((c = cre.exec(xml))){
    var at = c[1], body = c[2] || '', ref = /\br="([A-Z]+)(\d+)"/.exec(at);
    if (!ref) continue;
    var col = 0; for (var i = 0; i < ref[1].length; i++) col = col * 26 + ref[1].charCodeAt(i) - 64;
    var t = (/\bt="(\w+)"/.exec(at) || [])[1] || '', vv = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body), raw = vv ? mktaXmlText_(vv[1]) : null, val;
    if (t === 's') val = raw == null ? '' : (ss[+raw] || '');
    else if (t === 'inlineStr') val = mktaXmlTs_(body);
    else if (t === 'str' || t === 'e') val = raw == null ? '' : raw;
    else if (t === 'b') val = raw === '1';
    else val = raw == null || raw === '' ? '' : (isNaN(+raw) ? raw : +raw);
    var rIdx = +ref[2] - 1;
    (rows[rIdx] = rows[rIdx] || [])[col - 1] = val;
  }
  for (var r = 0; r < rows.length; r++){ rows[r] = rows[r] || []; for (var j = 0; j < rows[r].length; j++) if (rows[r][j] === undefined) rows[r][j] = ''; }
  return rows;
}
/* CSV (tự nhận dấu phân cách , ; tab) */
function mktaCsvRows_(text){
  text = String(text || '').replace(/^﻿/, '');
  var line = text.split(/\r?\n/)[0] || '', cnt = { ',':0, ';':0, '\t':0 }, q = false;
  for (var i = 0; i < line.length; i++){ var ch = line.charAt(i); if (ch === '"') q = !q; else if (!q && cnt.hasOwnProperty(ch)) cnt[ch]++; }
  var d = cnt['\t'] > cnt[','] && cnt['\t'] >= cnt[';'] ? '\t' : (cnt[';'] > cnt[','] ? ';' : ',');
  var rows = [], row = [], cur = '', inq = false;
  for (var k = 0; k < text.length; k++){
    var c = text.charAt(k);
    if (inq){
      if (c === '"'){ if (text.charAt(k + 1) === '"'){ cur += '"'; k++; } else inq = false; }
      else cur += c;
    } else if (c === '"') inq = true;
    else if (c === d){ row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r'){
      if (c === '\r' && text.charAt(k + 1) === '\n') k++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows;
}
/* số: 1234 · "1,234" · "1.234" (VN) · "1.234,5" · "12,345.67" · "₫1,234" */
function mktaNum_(v){
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = mktaS_(v).replace(/[\s ₫$%]|VNĐ|VND|USD/gi, '');
  if (!/\d/.test(s)) return null;
  var neg = /^-|^\(.*\)$/.test(s); s = s.replace(/[()+\-]/g, '');
  var hc = s.indexOf(',') >= 0, hd = s.indexOf('.') >= 0;
  if (hc && hd){ if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); }
  else if (hc) s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (hd && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  var n = parseFloat(s);
  return isNaN(n) ? null : (neg ? -n : n);
}
/* ngày trong file Ads ⇒ "yyyy-mm-dd" (Date · số seri Excel · 2026-10-01 · 01/10/2026 (ngày/tháng)) */
function mktaAdsDate_(v){
  if (mktaIsDate_(v)) return mktaIso_(v);
  if (typeof v === 'number' && v > 20000 && v < 80000){
    var d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  var s = mktaS_(v), m;
  if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/.exec(s))){
    var a = +m[1], b = +m[2], dd = a, mm = b;
    if (a <= 12 && b > 12){ dd = b; mm = a; }
    return m[3] + '-' + ('0' + mm).slice(-2) + '-' + ('0' + dd).slice(-2);
  }
  return '';
}
/* tiêu đề Ads Manager (Việt / Anh, không phân biệt hoa thường / dấu) */
var MKTA_ADS_H = {
  reach:   { eq:['reach', 'nguoitiepcan', 'tiepcan', 'luottiepcan', 'songuoitiepcan'] },
  impr:    { eq:['impressions', 'luothienthi', 'hienthi', 'soluothienthi'] },
  msg:     { eq:['messagingconversationsstarted', 'luotbatdaucuoctrochuyenquatinnhan', 'cuoctrochuyenquatinnhanduocbatdau', 'soluotbatdaucuoctrochuyenquatinnhan'],
             pre:['messagingconversationsstarted', 'luotbatdaucuoctrochuyenquatinnhan'] },
  results: { eq:['results', 'ketqua'] },
  spend:   { eq:['amountspent', 'sotiendachitieu'], pre:['amountspent', 'sotiendachitieu', 'sotiendachi'] },
  cpr:     { eq:['costperresult', 'chiphitrenmoiketqua', 'chiphimoiketqua'],
             pre:['costpermessagingconversationstarted', 'chiphitrenmoiluotbatdaucuoctrochuyenquatinnhan', 'chiphimoiluotbatdaucuoctrochuyenquatinnhan', 'costperresult', 'chiphitrenmoiketqua', 'chiphimoiketqua'] },
  start:   { eq:['reportingstarts', 'batdaubaocao', 'ngaybatdaubaocao', 'luotbatdaubaocao'], pre:['reportingstart'] },
  end:     { eq:['reportingends', 'ketthucbaocao', 'ngayketthucbaocao', 'luotketthucbaocao'], pre:['reportingend'] },
  start2:  { eq:['starts', 'batdau', 'ngaybatdau'] },
  end2:    { eq:['ends', 'ketthuc', 'ngayketthuc'] },
  level:   { eq:['deliverylevel', 'capdophanphoi', 'level'] },                       // 15/10/2026: file có cả dòng chiến dịch + nhóm QC ⇒ chỉ cộng dòng chiến dịch
  ident:   { eq:['campaignname', 'adsetname', 'adname', 'tenchiendich', 'tennhomquangcao', 'tenquangcao', 'campaign', 'adset', 'chiendich', 'nhomquangcao', 'quangcao'] }
};
/* cộng các dòng dữ liệu (bỏ dòng tổng) ⇒ { n, reach, impr, results, spend, cpr, start, end, found{} } */
function mktaAdsSum_(rows){
  var hr = -1, M = null;
  for (var r = 0; r < Math.min(rows.length, 12) && hr < 0; r++){
    var hk = (rows[r] || []).map(mktaNorm_), map = {}, hits = 0;
    Object.keys(MKTA_ADS_H).forEach(function(k){
      var a = MKTA_ADS_H[k], idx = [];
      hk.forEach(function(h, i){
        if (!h) return;
        if (a.eq.indexOf(h) >= 0 || (a.pre || []).some(function(p){ return h.indexOf(p) === 0; })) idx.push(i);
      });
      if (idx.length){ map[k] = k === 'ident' ? idx : idx[0]; if (k !== 'ident' && k !== 'start2' && k !== 'end2' && k !== 'level') hits++; }
    });
    if (hits >= 2 && (map.reach != null || map.impr != null || map.spend != null)){ hr = r; M = map; }
  }
  if (hr < 0) return { error:'Không nhận ra tiêu đề cột của file Ads Manager (cần có Reach / Impressions / Amount spent — hoặc tiếng Việt).' };
  if (M.start == null && M.start2 != null) M.start = M.start2;
  if (M.end == null && M.end2 != null) M.end = M.end2;
  var res = M.msg != null ? M.msg : M.results;
  var out = { n:0, reach:0, impr:0, results:0, spend:0, cpr:null, start:'', end:'', found:{} }, cprs = [];
  ['reach', 'impr', 'spend', 'cpr', 'start', 'end'].forEach(function(k){ out.found[k] = M[k] != null; });
  out.found.results = res != null;
  var metric = [M.reach, M.impr, res, M.spend].filter(function(x){ return x != null; });
  /* 15/10/2026: file xuất có cả dòng "campaign" lẫn "adset" / "ad" (cột Cấp độ phân phối) ⇒ chỉ cộng dòng chiến dịch (tránh tính 2 lần) */
  var lvOnly = '';
  if (M.level != null){
    for (var q = hr + 1; q < rows.length && !lvOnly; q++) if (mktaNorm_((rows[q] || [])[M.level]) === 'campaign') lvOnly = 'campaign';
  }
  for (var i = hr + 1; i < rows.length; i++){
    var row = rows[i] || [];
    if (lvOnly && mktaNorm_(row[M.level]) !== lvOnly) continue;
    if (!metric.some(function(c){ return mktaNum_(row[c]) != null; })) continue;            // dòng trống / chú thích
    if (M.ident){
      if (!M.ident.some(function(c){ return mktaS_(row[c]) !== ''; })) continue;            // dòng tổng (không có tên chiến dịch / nhóm / quảng cáo)
    } else {
      var firstTxt = ''; for (var j = 0; j < row.length && !firstTxt; j++) if (typeof row[j] === 'string' && mktaS_(row[j])) firstTxt = mktaNorm_(row[j]);
      if (/^(total|tong|summary|resultsfrom|ketquatu)/.test(firstTxt)) continue;
    }
    out.n++;
    if (M.reach != null) out.reach += mktaNum_(row[M.reach]) || 0;
    if (M.impr != null) out.impr += mktaNum_(row[M.impr]) || 0;
    if (res != null) out.results += mktaNum_(row[res]) || 0;
    if (M.spend != null) out.spend += mktaNum_(row[M.spend]) || 0;
    if (M.cpr != null && mktaNum_(row[M.cpr]) != null) cprs.push(mktaNum_(row[M.cpr]));
    var s = M.start != null ? mktaAdsDate_(row[M.start]) : '', e = M.end != null ? mktaAdsDate_(row[M.end]) : '';
    if (s && (!out.start || s < out.start)) out.start = s;
    if (e && (!out.end || e > out.end)) out.end = e;
  }
  if (!out.n) return { error:'File không có dòng dữ liệu (chỉ có tiêu đề / dòng tổng).' };
  if (out.results > 0 && out.spend > 0) out.cpr = Math.round(out.spend / out.results);
  else if (cprs.length === 1) out.cpr = cprs[0];
  out.spend = Math.round(out.spend * 100) / 100;
  return out;
}
function mktaSame_(cur, prev){
  if (prev === undefined || prev === null) return false;
  if (mktaIsDate_(cur)) return mktaIso_(cur) === String(prev);
  if (typeof cur === 'number' && typeof prev === 'number') return Math.abs(cur - prev) < 0.01;
  return mktaS_(cur) === mktaS_(prev);
}
/* ghi 1 ô số liệu Ads: ô trống hoặc còn đúng số tự điền lần trước ⇒ ghi; gõ tay khác ⇒ giữ */
function mktaAdsPut_(W, r, col, cur, val, prev, nv, k){
  if (!col || val === null || val === undefined || val === '') return;
  if (mktaS_(cur) === '' || mktaSame_(cur, prev[k])){
    var m = (k === 'start' || k === 'end') ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(val)) : null;
    if (!mktaSame_(cur, val)) mktaPut_(W, r, col, m ? new Date(+m[1], +m[2] - 1, +m[3]) : val);
    nv[k] = val;
  } else if (prev[k] !== undefined) nv[k] = prev[k];
}
function mktaAds_(sh, rep, mig){
  var H = mktaHead_(sh, 'Tiếp cận');
  if (!H) return rep.errors.push('ADS REPORT: không thấy hàng tiêu đề');
  var fc = mktaCol_(H, [MKTA.H_FILE]);
  if (!fc && mig){ fc = mktaAddHeader_(sh, H, MKTA.H_FILE, MKTA.NOTE_FILE, 260); rep.parts.push('ADS REPORT: thêm cột "' + MKTA.H_FILE + '" (' + mktaA1_(fc) + ')'); }
  if (!fc) return;
  var C = { reach: mktaCol_(H, ['Tiếp cận']), impr: mktaCol_(H, ['Lượt hiển thị']), results: mktaCol_(H, ['Kết quả']),
            mir: mktaCol_(H, ['MIR']), cpr: mktaCol_(H, ['CPR']), spend: mktaCol_(H, ['Ngân sách đã chi tiêu', 'Ngân sách']),
            start: mktaCol_(H, ['Ngày bắt đầu']), end: mktaCol_(H, ['Ngày kết thúc']) };
  var first = H.row + 1, last = sh.getLastRow();
  if (last < first) return;
  var n = last - first + 1, nc = Math.max(fc, C.reach, C.impr, C.results, C.mir, C.cpr, C.spend, C.start, C.end);
  var V = sh.getRange(first, 1, n, nc).getValues(), FL = sh.getRange(first, fc, n, 1), RT = FL.getRichTextValues();
  var Fm = C.mir ? sh.getRange(first, C.mir, n, 1).getFormulas() : null;
  var pr = PropertiesService.getScriptProperties(), state = {};
  try { state = JSON.parse(pr.getProperty('MKTA_ADS') || '{}') || {}; } catch(e){ state = {}; }
  var W = mktaW_(sh), done = 0, changed = false, now = Date.now();
  var stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  for (var i = 0; i < n && done < MKTA.ADS_PER_RUN; i++){
    var r = first + i, txt = mktaS_(V[i][fc - 1]), key = 'r' + r;
    if (!txt){ if (state[key]){ delete state[key]; changed = true; } continue; }
    var link = mktaCellLink_(RT[i][0], txt), h = mktaHash_(link), old = state[key];
    if (old && old.h === h && (!old.err || now - (old.at || 0) < 6 * 3600000)) continue;
    done++;
    var id = mktaDriveId_(link), res;
    try {
      if (!id) throw new Error('Link không phải file Google Drive');
      var got = mktaAdsRows_(id);
      res = mktaAdsSum_(got.rows);
      if (res.error) throw new Error(res.error);
    } catch(e){
      state[key] = { h:h, err:1, at:now, v:(old && old.v) || {} }; changed = true;
      mktaPut_(W, r, fc, 'Không đọc được file lúc ' + stamp + ': ' + String(e && e.message || e).slice(0, 300), 'n');
      continue;
    }
    var prev = (old && old.v) || {}, nv = {};
    var plan = [['reach', C.reach, res.found.reach ? Math.round(res.reach) : null], ['impr', C.impr, res.found.impr ? Math.round(res.impr) : null],
                ['results', C.results, res.found.results ? Math.round(res.results) : null], ['spend', C.spend, res.found.spend ? res.spend : null],
                ['cpr', C.cpr, res.cpr], ['start', C.start, res.start || null], ['end', C.end, res.end || null]];
    plan.forEach(function(x){ mktaAdsPut_(W, r, x[1], V[i][x[1] - 1], x[2], prev, nv, x[0]); });
    if (C.mir && !Fm[i][0] && mktaS_(V[i][C.mir - 1]) === '' && C.results && C.reach)
      mktaPut_(W, r, C.mir, '=IFERROR(' + mktaA1_(C.results) + r + '/' + mktaA1_(C.reach) + r + ',"")', 'f');
    state[key] = { h:h, at:now, v:nv }; changed = true;
    mktaPut_(W, r, fc, 'Đã đọc file lúc ' + stamp + ' · ' + res.n + ' dòng dữ liệu · Tiếp cận ' + Math.round(res.reach) +
      ' · Hiển thị ' + Math.round(res.impr) + ' · Kết quả ' + Math.round(res.results) + ' · Chi tiêu ' + res.spend +
      (res.start ? ' · ' + res.start + ' → ' + res.end : '') + '\n(Ô đã gõ tay khác số tự điền thì giữ nguyên. Đọc lại: xoá link rồi dán lại.)', 'n');
  }
  var w = mktaFlush_(W); rep.errors = rep.errors.concat(W.errs);
  if (changed) pr.setProperty('MKTA_ADS', JSON.stringify(state));
  if (done) rep.parts.push('ADS REPORT: đọc ' + done + ' file Ads · ghi ' + w + ' ô');
}

/* ══════════════ ④ REPORT_EVENT / PLAN_EVENT · ⑤ CUSTOMER LIST ══════════════ */
function mktaOffMonthF_(D, r){ return '=IF(ISNUMBER(' + D + r + '),VALUE(TEXT(' + D + r + ',"yyyymm")),IF(LEN(TRIM(TO_TEXT(' + D + r + ')))<6,"",IFERROR(VALUE(LEFT(TRIM(TO_TEXT(' + D + r + ')),6)),"")))'; }
/* ngày bắt đầu sự kiện (yyyymmdd) từ ô Date: ngày thật hoặc chữ "20261026-29" */
function mktaEvDay_(v){
  if (mktaIsDate_(v)) return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var m = /^(\d{8})/.exec(mktaS_(v).replace(/\s+/g, '')); return m ? m[1] : '';
}
/* Actual Participant (v1.2): SĐT khác nhau (9 số cuối) của khách cùng sự kiện + tháng, đủ Họ tên · SĐT · Nơi công tác · Email,
   và (Ký tay + Đã đồng ý dữ liệu) hoặc Zoom; chưa có bằng chứng ⇒ 0 */
function mktaPartF_(L, r){
  var q = "'CUSTOMER LIST'!", rg = function(c){ return q + '$' + c + '$' + L.first + ':$' + c; };
  var tel = 'REGEXREPLACE(TO_TEXT(' + rg(L.tel) + '),"[^0-9]","")';
  return '=IF(LEN(TRIM($' + L.proof + r + '))=0,0,IFERROR(COUNTUNIQUE(FILTER(RIGHT(' + tel + ',9),' +
    'TRIM(' + rg(L.ev) + ')=TRIM($' + L.evR + r + '),' + rg(L.mo) + '=$' + L.moR + r + ',' +
    'LEN(TRIM(' + rg(L.name) + '))>0,LEN(' + tel + ')>=9,LEN(TRIM(' + rg(L.work) + '))>0,' +
    'REGEXMATCH(TRIM(TO_TEXT(' + rg(L.mail) + ')),"^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"),' +
    '(TRIM(TO_TEXT(' + rg(L.conf) + '))="Zoom")+(TRIM(TO_TEXT(' + rg(L.conf) + '))="Ký tay")*REGEXMATCH(TRIM(TO_TEXT(' + rg(L.cons) + ')),"^Đã đồng ý")>0)),0))';
}
function mktaCust_(ss, rep, mig){
  var sh = ss.getSheetByName('CUSTOMER LIST');
  if (!sh){ rep.errors.push('Không thấy tab CUSTOMER LIST'); return null; }
  var H = mktaHead_(sh, 'Tel');
  if (!H){ rep.errors.push('CUSTOMER LIST: không thấy hàng tiêu đề'); return null; }
  var hint = H.row + 1, hintIsHelp = /^(form|auto|text|texting|select|date)/i.test(mktaS_(sh.getRange(hint, mktaCol_(H, ['Name']) || 2).getValue()));
  var first = hintIsHelp ? H.row + 2 : H.row + 1;
  var conf = mktaCol_(H, [MKTA.H_CONF]), cons = mktaCol_(H, [MKTA.H_CONSENT]), mail = mktaCol_(H, ['Email', 'E-mail', 'Mail']);
  if (!mail){ mail = mktaAddHeader_(sh, H, MKTA.H_EMAIL, MKTA.NOTE_EMAIL, 200, hintIsHelp ? hint : 0, 'Text'); H = mktaHead_(sh, 'Tel') || H; rep.parts.push('CUSTOMER LIST: thêm cột "' + MKTA.H_EMAIL + '" (' + mktaA1_(mail) + ')'); }
  if (mig || !conf || !cons){
    if (!conf){ conf = mktaAddHeader_(sh, H, MKTA.H_CONF, MKTA.NOTE_CONF, 140, hintIsHelp ? hint : 0, 'Select'); rep.parts.push('CUSTOMER LIST: thêm cột "' + MKTA.H_CONF + '" (' + mktaA1_(conf) + ')'); }
    if (!cons){ cons = mktaAddHeader_(sh, H, MKTA.H_CONSENT, MKTA.NOTE_CONSENT, 190, hintIsHelp ? hint : 0, 'Select'); rep.parts.push('CUSTOMER LIST: thêm cột "' + MKTA.H_CONSENT + '" (' + mktaA1_(cons) + ')'); }
  }
  mktaEnsureDv_(sh, conf, first, MKTA.CONF_LIST, 'CONF', mig);
  mktaEnsureDv_(sh, cons, first, MKTA.CONSENT_LIST, 'CONSENT', mig);
  var L = { first:first, name:mktaA1_(mktaCol_(H, ['Name'])), tel:mktaA1_(mktaCol_(H, ['Tel'])),
            work:mktaA1_(mktaCol_(H, ['Workplace'])), ev:mktaA1_(mktaCol_(H, ['Event name'])),
            mo:mktaA1_(mktaCol_(H, ['Event month'])), conf:mktaA1_(conf), cons:mktaA1_(cons), mail:mktaA1_(mail) };
  for (var k in L) if (L[k] === '' && k !== 'first'){ rep.errors.push('CUSTOMER LIST: thiếu cột ' + k); return null; }
  return L;
}
function mktaOffline_(ss, rep, mig){
  var L = null;
  try { L = mktaCust_(ss, rep, mig); } catch(e){ rep.errors.push('CUSTOMER LIST: ' + (e.message || e)); }
  /* REPORT_EVENT */
  try {
    var sh = ss.getSheetByName('REPORT_EVENT'), H = sh && mktaHead_(sh, 'Event Name');
    if (!H) rep.errors.push('REPORT_EVENT: không thấy hàng tiêu đề');
    else {
      var form = mktaCol_(H, [MKTA.H_FORM]), proof = mktaCol_(H, ['Bằng chứng tham dự']);
      if (!form){ form = mktaAddHeader_(sh, H, MKTA.H_FORM, MKTA.NOTE_FORM, 110); rep.parts.push('REPORT_EVENT: thêm cột "' + MKTA.H_FORM + '" (' + mktaA1_(form) + ')'); }
      if (!proof){ proof = mktaAddHeader_(sh, H, MKTA.H_PROOF, MKTA.NOTE_PROOF, 280); rep.parts.push('REPORT_EVENT: thêm cột "' + MKTA.H_PROOF + '" (' + mktaA1_(proof) + ')'); }
      mktaEnsureDv_(sh, form, H.row + 1, MKTA.FORM_LIST, 'FORM', mig);
      var C = { month: mktaCol_(H, ['Month']), date: mktaCol_(H, ['Date']), ev: mktaCol_(H, ['Event Name']), part: mktaCol_(H, ['Actual Participant']),
                type: mktaCol_(H, ['Type of event']), prod: mktaCol_(H, ['Target product']) };
      var first = H.row + 1, last = sh.getLastRow();
      if (last >= first && C.date){
        var n = last - first + 1, nc = Math.max(C.month, C.date, C.ev, C.part, C.type, C.prod, proof);
        var V = sh.getRange(first, 1, n, nc).getValues(), F = sh.getRange(first, 1, n, nc).getFormulas();
        var W = mktaW_(sh), Dl = mktaA1_(C.date), fx = 0;
        if (L){ L.proof = mktaA1_(proof); L.evR = mktaA1_(C.ev); L.moR = mktaA1_(C.month); }
        for (var i = 0; i < n; i++){
          var r = first + i, v = V[i], f = F[i];
          var has = mktaS_(v[C.date - 1]) || (C.type && mktaS_(v[C.type - 1])) || (C.prod && mktaS_(v[C.prod - 1]));
          if (!has) continue;
          if (C.month && mktaS_(v[C.date - 1]) && !mktaOurs_(f[C.month - 1], ['LEFT(TRIM(TO_TEXT(' + Dl + r + ')'])){ mktaPut_(W, r, C.month, mktaOffMonthF_(Dl, r), 'f'); fx++; }
          var evDay = mktaEvDay_(v[C.date - 1]);
          if (L && C.part && C.ev && C.month && evDay && evDay >= MKTA.RULE_FROM && !mktaOurs_(f[C.part - 1], ['COUNTUNIQUE(FILTER(', '$' + L.proof + r, "'CUSTOMER LIST'!$" + L.conf + '$', "'CUSTOMER LIST'!$" + L.mail + '$', "'CUSTOMER LIST'!$" + L.cons + '$'])){
            mktaPut_(W, r, C.part, mktaPartF_(L, r), 'f'); fx++;
          }
        }
        var wr = mktaFlush_(W); rep.errors = rep.errors.concat(W.errs);
        if (wr) rep.parts.push('REPORT_EVENT: công thức Month / Actual Participant ' + fx + ' ô');
      }
    }
  } catch(e){ rep.errors.push('REPORT_EVENT: ' + (e.message || e)); }
  /* PLAN_EVENT — chỉ dòng có Date */
  try {
    var sp = ss.getSheetByName('PLAN_EVENT'), HP = sp && mktaHead_(sp, 'Event Name');
    var cm = HP ? mktaCol_(HP, ['Month']) : 0, cd = HP ? mktaCol_(HP, ['Date']) : 0;
    if (HP && cm && cd && sp.getLastRow() > HP.row){
      var fP = HP.row + 1, nP = sp.getLastRow() - fP + 1;
      var VP = sp.getRange(fP, cd, nP, 1).getValues(), FP = sp.getRange(fP, cm, nP, 1).getFormulas(), WP = mktaW_(sp), Dp = mktaA1_(cd), k2 = 0;
      for (var j = 0; j < nP; j++){
        var rr = fP + j;
        if (!mktaS_(VP[j][0]) || mktaOurs_(FP[j][0], ['LEFT(TRIM(TO_TEXT(' + Dp + rr + ')'])) continue;
        mktaPut_(WP, rr, cm, mktaOffMonthF_(Dp, rr), 'f'); k2++;
      }
      var wp = mktaFlush_(WP); rep.errors = rep.errors.concat(WP.errs);
      if (wp) rep.parts.push('PLAN_EVENT: công thức Month ' + k2 + ' ô');
    }
  } catch(e){ rep.errors.push('PLAN_EVENT: ' + (e.message || e)); }
}

/* ══════════════ CHẠY ══════════════ */
function mktaDigital_(ss, rep, mig){
  [['EVENT REPORT', 'event'], ['PRODUCT REPORT', 'product']].forEach(function(x){
    try { var sh = ss.getSheetByName(x[0]); if (sh) mktaPosts_(sh, x[1], rep); else rep.errors.push('Không thấy tab ' + x[0]); }
    catch(e){ rep.errors.push(x[0] + ': ' + (e.message || e)); }
  });
  try { var so = ss.getSheetByName('ORDER REPORT'); if (so) mktaOrder_(so, rep, mig); } catch(e){ rep.errors.push('ORDER REPORT: ' + (e.message || e)); }
  try { var sa = ss.getSheetByName('ADS REPORT'); if (sa) mktaAds_(sa, rep, mig); } catch(e){ rep.errors.push('ADS REPORT: ' + (e.message || e)); }
  try { if (typeof adsiRun_ === 'function') adsiRun_(ss, rep, {}); } catch(e){ rep.errors.push('Ads Manager (thư mục): ' + (e.message || e)); }   /* ⭐ 15/10/2026: MKT_AdsImport.gs */
}
function mktaNeedMig_(){ try { return PropertiesService.getScriptProperties().getProperty('MKT_AUTO_V') !== MKTA_VER; } catch(e){ return false; } }
/* opt.only = ID file vừa đổi (onChange) ⇒ chỉ xử lý file đó (trừ khi còn bước chuyển đổi 1 lần) */
function mktaRun_(opt){
  opt = opt || {};
  var c = CacheService.getScriptCache();
  if (!opt.force && c.get('mkta_busy')){ c.put('mkta_again', '1', 300); return { ok:true, skipped:true }; }
  c.put('mkta_busy', '1', 240);
  var rep = { ok:true, parts:[], errors:[] }, T0 = Date.now();
  try {
    var mig = mktaNeedMig_(), only = mig ? '' : String(opt.only || '');
    if (mig && !opt.force && typeof throttleOk === 'function' && !throttleOk('mkta_mig_try', 900)) mig = false;
    if (!only || only === MKTA.ON_ID){
      try { mktaDigital_(SpreadsheetApp.openById(MKTA.ON_ID), rep, mig); } catch(e){ rep.errors.push('File Digital: ' + (e.message || e)); }
    }
    if (!only || only === MKTA.OFF_ID){
      try { mktaOffline_(SpreadsheetApp.openById(MKTA.OFF_ID), rep, mig); } catch(e){ rep.errors.push('File Offline: ' + (e.message || e)); }
    }
    SpreadsheetApp.flush();
    if (mig && !rep.errors.length){ PropertiesService.getScriptProperties().setProperty('MKT_AUTO_V', MKTA_VER); rep.migrated = MKTA_VER; }
    else if (mig) rep.migrateRetry = true;
  } catch(err){ rep.ok = false; rep.errors.push(String(err && err.message || err)); }
  finally {
    c.remove('mkta_busy');
    rep.seconds = Math.round((Date.now() - T0) / 1000);
    rep.message = 'MKT tự động — ' + (rep.parts.length ? rep.parts.join(' · ') : 'không có gì thay đổi') + ' · ' + rep.seconds + 's' +
      (rep.errors.length ? ' · ⚠ ' + rep.errors.slice(0, 5).join(' | ') : '');
    try { PropertiesService.getScriptProperties().setProperty('MKTA_LAST', JSON.stringify({ at:Date.now(), msg:rep.message.slice(0, 4000) })); } catch(e){}
  }
  if (c.get('mkta_again') && !opt.again){ c.remove('mkta_again'); return mktaRun_({ again:true, force:true }); }
  return rep;
}
/* evsOnChange ⇒ chỉ file vừa đổi */
function mktaOnChange_(e){
  var id = '';
  try { id = e && e.source ? e.source.getId() : ''; } catch(x){}
  /* gõ liên tục ⇒ tối đa 1 lượt / 20 giây / file (lượt sau: lần sửa kế tiếp hoặc trigger 10 phút) — tiết kiệm quota trigger */
  if (typeof throttleOk === 'function' && !throttleOk('mkta_chg_' + (id || 'x').slice(0, 12), 20)) return { ok:true, skipped:true };
  return mktaRun_({ only:id });
}
/* doGet ping: còn bước chuyển đổi 1 lần ⇒ hẹn 1 trigger chạy sau 30 giây (ping vẫn trả lời ngay) */
function mktaPing_(){
  if (!mktaNeedMig_()) return;
  if (typeof throttleOk === 'function' && !throttleOk('mkta_ping', 1800)) return;
  var has = ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'mktaMigrateTick'; });
  if (!has) ScriptApp.newTrigger('mktaMigrateTick').timeBased().after(30 * 1000).create();
}
function mktaMigrateTick(){
  try { ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'mktaMigrateTick') ScriptApp.deleteTrigger(t); }); } catch(e){}
  mktaRun_({ force:true });
}
/* action=mktAuto — mode=status (xem lần chạy gần nhất) · mặc định chạy ngay (tối đa 1 lần / 30 giây) */
function mktaApi_(user, p){
  p = p || {};
  var pr = PropertiesService.getScriptProperties();
  if (String(p.mode || '') === 'status'){
    var last = {}; try { last = JSON.parse(pr.getProperty('MKTA_LAST') || '{}'); } catch(e){}
    return { ok:true, ver:MKTA_VER, migrated:pr.getProperty('MKT_AUTO_V') || '', last:last };
  }
  if (typeof throttleOk === 'function' && !throttleOk('mkta_api', 30)) return { ok:true, skipped:true, message:'Vừa chạy — đợi vài giây.' };
  return mktaRun_({ force:true });
}
/* chạy tay trong trình soạn */
function mktaRunNow(){ var r = mktaRun_({ force:true }); Logger.log(JSON.stringify(r, null, 2)); return r; }
function mktaRedoMigration(){ PropertiesService.getScriptProperties().deleteProperty('MKT_AUTO_V'); return mktaRunNow(); }

/* ══════════════ ⑥ BẰNG CHỨNG THAM DỰ — action=evProof ══════════════
 * op=list&event=<Event Name>  ⇒ { ok, event, row, folder, folderUrl, files:[{name,url,mime,at,proof}], proof:<chữ trong ô> }
 * op=upload  { event, name, mime, data(base64), rid }  ⇒ lưu vào folder sự kiện (link cột "Detail event folder link"),
 *     tên "<yyyyMMdd>_Bang chung tham du_<tên gốc>", ghi link vào ô "Bằng chứng tham dự" (mỗi link 1 dòng) ⇒ { ok, url, name }.
 *     ≤ 25 MB · pdf / jpg / png / xlsx / csv. Chia sẻ: theo folder sự kiện (như uploadRef).
 *     Chế độ TEST (tm=1, Admin): file tên "TEST_…", KHÔNG ghi vào ô của sự kiện thật (không làm đổi KPI), tmClean bỏ được file.
 * ════════════════════════════════════════════════════════════════════════════════════════ */
var TMODE_FOLDERS = (function(){ try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('MKT_PROOF_TEST_DIRS') || '[]'); } catch(e){ return []; } })();
function mktProofFind_(name){
  var want = mktaNorm_(name);
  if (!want) throw new Error('Thiếu tên sự kiện (event).');
  var ss = SpreadsheetApp.openById(MKTA.OFF_ID), sh = ss.getSheetByName('REPORT_EVENT'), H = sh && mktaHead_(sh, 'Event Name');
  if (!H) throw new Error('Không thấy tab REPORT_EVENT / hàng tiêu đề.');
  var ce = mktaCol_(H, ['Event Name']), cf = mktaCol_(H, ['Detail event folder link']), cp = mktaCol_(H, ['Bằng chứng tham dự']);
  if (!cp) throw new Error('REPORT_EVENT chưa có cột "' + MKTA.H_PROOF + '" — hệ thống tự thêm trong ~10 phút, thử lại sau.');
  var first = H.row + 1, last = sh.getLastRow();
  if (last < first) throw new Error('REPORT_EVENT chưa có sự kiện.');
  var E = sh.getRange(first, ce, last - first + 1, 1).getValues(), row = 0;
  for (var i = 0; i < E.length && !row; i++) if (mktaNorm_(E[i][0]) === want) row = first + i;
  if (!row) throw new Error('Không thấy sự kiện "' + name + '" ở REPORT_EVENT.');
  var fc = cf ? sh.getRange(row, cf) : null, link = fc ? mktaCellLink_(fc.getRichTextValue(), fc.getValue()) : '';
  var m = /folders\/([\w-]{20,})/.exec(link) || /[?&]id=([\w-]{20,})/.exec(link);
  return { sh:sh, row:row, name:mktaS_(E[row - first][0]), proofCol:cp, proof:mktaS_(sh.getRange(row, cp).getValue()), folderId:m ? m[1] : '', link:link };
}
function mktProofHandler_(user, p){
  p = p || {};
  var op = String(p.op || 'list');
  try {
    if (op === 'list') return mktProofList_(p);
    if (op !== 'upload') return { ok:false, error:'op không hợp lệ (list | upload).' };
    var rid = String(p.rid || '').trim(), key = 'evp_' + rid;
    if (rid && typeof ridGet === 'function'){ var prev = ridGet(key); if (prev){ prev.dedup = true; return prev; } }
    var out;
    try { out = mktProofUpload_(user, p); } catch(e){ out = { ok:false, error:'Lỗi tải file: ' + String(e && e.message || e) }; }
    if (rid && out && out.ok && typeof ridPut === 'function') ridPut(key, out);
    return out;
  } catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}
function mktProofList_(p){
  var ev = mktProofFind_(p.event), files = [], folderUrl = '';
  if (ev.folderId){
    var fo = DriveApp.getFolderById(ev.folderId), it = fo.getFiles(), k = 0;
    folderUrl = fo.getUrl();
    while (it.hasNext() && k < 200){
      var f = it.next(); k++;
      if (!(typeof tmOn_ === 'function' && tmOn_()) && /^TEST_/.test(f.getName())) continue;
      files.push({ name:f.getName(), url:f.getUrl(), mime:f.getMimeType(), at:f.getDateCreated().getTime(), proof:mktaNorm_(f.getName()).indexOf('bangchungthamdu') >= 0 });
    }
    files.sort(function(a, b){ return b.at - a.at; });
  }
  return { ok:true, event:ev.name, row:ev.row, folder:ev.folderId, folderUrl:folderUrl, files:files, proof:ev.proof,
           error:ev.folderId ? undefined : 'Sự kiện chưa có link folder (cột Detail event folder link)' };
}
function mktProofUpload_(user, p){
  if (!user || !mktaS_(user.pic)) return { ok:false, error:'Cần đăng nhập để tải bằng chứng tham dự.' };
  var orig = mktaS_(p.name || p.fileName) || 'file', ext = ((/\.([A-Za-z0-9]{1,5})$/.exec(orig) || [])[1] || '').toLowerCase();
  if (!MKTA.PROOF_EXT[ext]) return { ok:false, error:'Chỉ nhận file PDF, JPG, PNG, XLSX hoặc CSV.' };
  var b64 = String(p.data || '').replace(/^data:[^,]*,/, '');
  if (!b64) return { ok:false, error:'Không có dữ liệu file.' };
  if (b64.length * 0.75 > MKTA.PROOF_MAX_MB * 1024 * 1024) return { ok:false, error:'File lớn hơn ' + MKTA.PROOF_MAX_MB + ' MB.' };
  var ev = mktProofFind_(p.event);
  if (!ev.folderId) return { ok:false, error:'Sự kiện chưa có link folder (cột Detail event folder link)' };
  var test = typeof tmOn_ === 'function' && tmOn_();
  var folder = DriveApp.getFolderById(ev.folderId);
  var safe = orig.replace(/[\\\/:*?"<>|#%\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  var base = (test ? 'TEST_' : '') + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd') + '_Bang chung tham du_' + safe.replace(/\.[^.]+$/, '');
  var name = base + '.' + ext, n = 1;
  while (folder.getFilesByName(name).hasNext() && n < 99){ n++; name = base + '_' + n + '.' + ext; }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây.' }; }
  try {
    var file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), String(p.mime || p.mimeType || MKTA.PROOF_EXT[ext]), name));
    try { file.setDescription('MMH Report Hub · Bằng chứng tham dự · ' + ev.name + ' · tải lên bởi ' + user.pic + ' · tên file gốc: ' + orig); } catch(e){}
    var url = file.getUrl(), proof = ev.proof;
    if (test){
      var pr = PropertiesService.getScriptProperties(), dirs = [];
      try { dirs = JSON.parse(pr.getProperty('MKT_PROOF_TEST_DIRS') || '[]'); } catch(e){}
      if (dirs.indexOf(ev.folderId) < 0){ dirs.unshift(ev.folderId); pr.setProperty('MKT_PROOF_TEST_DIRS', JSON.stringify(dirs.slice(0, 60))); }
    } else {
      var cell = ev.sh.getRange(ev.row, ev.proofCol), cur = mktaS_(cell.getValue());
      proof = (cur ? cur + '\n' : '') + url;
      cell.setValue(proof);
      SpreadsheetApp.flush();
      try { if (typeof logActivity === 'function') logActivity(user.pic, 'update', 'tải bằng chứng tham dự "' + name + '" — ' + ev.name, '', ''); } catch(e){}
    }
    return { ok:true, url:url, name:name, event:ev.name, folderUrl:folder.getUrl(), proof:proof, test:test || undefined,
             message:test ? 'Chế độ TEST: đã lưu ' + name + ' (không ghi vào ô Bằng chứng tham dự của sự kiện thật).' : 'Đã tải lên ' + name };
  } finally { try { lock.releaseLock(); } catch(e){} }
}
