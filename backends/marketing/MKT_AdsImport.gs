/*************************************************************************************************
 * MMH REPORT HUB — MKT_AdsImport.gs   (v1.0 · 15/10/2026)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * MIR (Message / Inbox Rate) = Kết quả ÷ Người tiếp cận — KPI C17-01 (Event) · C17-02 (Product).
 * Nguồn: file xuất từ Facebook Ads Manager (.xlsx / .csv / Google Sheet), MỘT file có NHIỀU chiến dịch, ví dụ
 *   "Báo cáo … từ Tháng 10-1-2026 đến Tháng 10-13-2026.xlsx" (sheet "Raw Data Report" hoặc "Formatted Report"):
 *   Tên chiến dịch · Tên nhóm quảng cáo · Trạng thái phân phối · Cấp độ phân phối (campaign / adset / ad) · Người tiếp cận ·
 *   Lượt hiển thị · Tần suất · Cài đặt ghi nhận · Loại kết quả · Kết quả · Số tiền đã chi tiêu (VND) · Chi phí trên mỗi kết quả ·
 *   Bắt đầu · Kết thúc · Lượt bắt đầu báo cáo · Lượt kết thúc báo cáo.
 * Dữ liệu lấy (mỗi CHIẾN DỊCH = 1 dòng ADS REPORT, khoá = tên chiến dịch + Month):
 *   · số liệu = dòng cấp "campaign" (người tiếp cận của chiến dịch đã bỏ trùng giữa các nhóm QC — KHÔNG cộng dòng adset / ad);
 *     file không có dòng campaign ⇒ cộng các dòng của chiến dịch (ghi chú "ước tính").
 *   · Type: tên chiến dịch có "Event" / "Sự kiện" / hội thảo… ⇒ Event · "Product" / "Sản phẩm" / CTKM… ⇒ Product (quy ước đặt tên
 *     "d.m.yyyy - Event - <nội dung>" / "d.m.yyyy - Product - <nội dung>"); không nhận ra ⇒ để trống (chọn tay, KPI chưa tính).
 *   · Event / Product = phần nội dung sau loại · Status: completed ⇒ Finished, active ⇒ Active, paused ⇒ Tạm dừng.
 *   · Month = tháng của (ngày bắt đầu chạy muộn hơn giữa chiến dịch và kỳ báo cáo) ⇒ yyyymm.
 *   · Tiếp cận · Lượt hiển thị · Click (nếu file có) · Kết quả (Inbox) · CPR · Ngân sách đã chi tiêu · Ngày bắt đầu / kết thúc (nhóm QC sớm nhất / muộn nhất).
 *   · MIR = công thức Kết quả ÷ Tiếp cận.
 * Cách dùng: thả file vào thư mục Drive "ADS REPORT - file Ads Manager" (tự tạo cạnh file Digital, link ở ghi chú tiêu đề cột
 *   "Chiến dịch Ads Manager") hoặc tải lên từ Report Hub (action=adsReport op=upload) ⇒ đọc trong ~10 phút (tải từ app: ngay).
 *   File mới hơn (kỳ báo cáo kết thúc muộn hơn) ghi đè số của cùng chiến dịch + tháng; dòng gõ tay trùng tên ⇒ được nhận (chỉ điền ô trống).
 * KPI MIR report: tự thêm 2 dòng (Event / Product) cho tháng mới có quảng cáo, đúng công thức SUMIFS của tab.
 *************************************************************************************************/

var ADSI = {
  DIR_NAME: 'ADS REPORT - file Ads Manager',
  H_KEY: 'Chiến dịch Ads Manager',
  FILES_PER_RUN: 4,
  MAX_MB: 15,
  NOTE_KEY: 'Tên chiến dịch trong Ads Manager (hệ thống tự ghi). Dòng có ô này được cập nhật tự động từ file Ads Manager mới nhất ' +
            '(cùng chiến dịch + tháng). Xoá chữ trong ô ⇒ dòng thành dòng gõ tay, không tự cập nhật nữa.',
  MIR_TAB: 'KPI MIR report',
  EXT: { xlsx:1, csv:1 }
};

/* ── tiêu đề cột của file Ads Manager (Việt / Anh, so không dấu) ── */
var ADSI_H = {
  camp:   ['campaignname', 'tenchiendich', 'chiendich', 'campaign'],
  adset:  ['adsetname', 'tennhomquangcao', 'nhomquangcao', 'adset'],
  ad:     ['adname', 'tenquangcao', 'quangcao'],
  level:  ['deliverylevel', 'capdophanphoi', 'level'],
  status: ['deliverystatus', 'trangthaiphanphoi', 'trangthai'],
  reach:  ['reach', 'nguoitiepcan', 'tiepcan', 'luottiepcan'],
  impr:   ['impressions', 'luothienthi', 'hienthi'],
  rtype:  ['resulttype', 'loaiketqua'],
  res:    ['results', 'ketqua'],
  msg:    ['messagingconversationsstarted', 'luotbatdaucuoctrochuyenquatinnhan', 'cuoctrochuyenquatinnhanduocbatdau'],
  spend:  ['amountspentvnd', 'amountspent', 'sotiendachitieuvnd', 'sotiendachitieu', 'sotiendachi'],
  cpr:    ['costperresult', 'chiphitrenmoiketqua', 'chiphimoiketqua'],
  click:  ['linkclicks', 'luotclickvaoliênket', 'luotclickvaolienket', 'clicksall', 'luotclicktatca'],
  start:  ['starts', 'batdau', 'ngaybatdau'],
  end:    ['ends', 'ketthuc', 'ngayketthuc'],
  rstart: ['reportingstarts', 'luotbatdaubaocao', 'batdaubaocao', 'ngaybatdaubaocao'],
  rend:   ['reportingends', 'luotketthucbaocao', 'ketthucbaocao', 'ngayketthucbaocao']
};

function adsiS_(v){ return v === null || v === undefined ? '' : String(v).trim(); }
function adsiN_(s){ return (typeof mktaNorm_ === 'function') ? mktaNorm_(s) : String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, ''); }

/* ══════════════ PHÂN TÍCH FILE ⇒ danh sách chiến dịch (hàm thuần — test được ngoài Apps Script) ══════════════ */
function adsiParse_(rows){
  var hr = -1, M = null;
  for (var r = 0; r < Math.min(rows.length, 15) && hr < 0; r++){
    var hk = (rows[r] || []).map(adsiN_), map = {};
    Object.keys(ADSI_H).forEach(function(k){
      var want = ADSI_H[k];
      for (var i = 0; i < hk.length; i++) if (hk[i] && want.indexOf(hk[i]) >= 0 && map[k] == null){ map[k] = i; }
      if (map[k] == null && (k === 'spend' || k === 'cpr' || k === 'msg'))
        for (var j = 0; j < hk.length; j++) if (hk[j] && want.some(function(w){ return hk[j].indexOf(w) === 0; }) && map[k] == null) map[k] = j;
    });
    if (map.camp != null && map.reach != null && (map.res != null || map.msg != null || map.spend != null)){ hr = r; M = map; }
  }
  if (hr < 0) return { error:'Không nhận ra file Ads Manager (cần cột Tên chiến dịch + Người tiếp cận + Kết quả / Số tiền đã chi tiêu).' };
  var num = (typeof mktaNum_ === 'function') ? mktaNum_ : function(v){ var n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; };
  var day = (typeof mktaAdsDate_ === 'function') ? mktaAdsDate_ : function(v){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(adsiS_(v)); return m ? m[0] : ''; };
  var resCol = M.msg != null ? M.msg : M.res;
  var G = {}, order = [], rs = '', re = '';
  for (var i = hr + 1; i < rows.length; i++){
    var row = rows[i] || [], name = adsiS_(row[M.camp]).replace(/\s+/g, ' ');
    if (!name || /^(total|tong|ketquatu|resultsfrom)/.test(adsiN_(name))) continue;
    if (num(row[M.reach]) == null && (resCol == null || num(row[resCol]) == null) && (M.spend == null || num(row[M.spend]) == null)) continue;
    var lv = M.level != null ? adsiN_(row[M.level]) : '';
    var g = G[name];
    if (!g){ g = G[name] = { name:name, camp:null, rows:[], adsets:[], start:'', end:'', status:'', rtype:'' }; order.push(name); }
    if (lv === 'campaign') g.camp = row; else g.rows.push(row);
    if (M.adset != null){ var an = adsiS_(row[M.adset]); if (an && adsiN_(an) !== 'all' && g.adsets.indexOf(an) < 0) g.adsets.push(an); }
    var s = M.start != null ? day(row[M.start]) : '', e = M.end != null ? day(row[M.end]) : '';
    if (s && (!g.start || s < g.start)) g.start = s;
    if (e && (!g.end || e > g.end)) g.end = e;
    var a = M.rstart != null ? day(row[M.rstart]) : '', b = M.rend != null ? day(row[M.rend]) : '';
    if (a && (!rs || a < rs)) rs = a;
    if (b && (!re || b > re)) re = b;
    if (!g.status && M.status != null) g.status = adsiS_(row[M.status]);
    if (!g.rtype && M.rtype != null) g.rtype = adsiS_(row[M.rtype]);
  }
  var out = [];
  order.forEach(function(nm){
    var g = G[nm], src = g.camp ? [g.camp] : g.rows, approx = !g.camp && g.rows.length > 1;
    var t = { reach:0, impr:0, res:0, spend:0, click:0 }, cprs = [];
    src.forEach(function(row){
      t.reach += num(row[M.reach]) || 0;
      if (M.impr != null) t.impr += num(row[M.impr]) || 0;
      if (resCol != null) t.res += num(row[resCol]) || 0;
      if (M.spend != null) t.spend += num(row[M.spend]) || 0;
      if (M.click != null) t.click += num(row[M.click]) || 0;
      if (M.cpr != null && num(row[M.cpr]) != null) cprs.push(num(row[M.cpr]));
    });
    if (g.camp && M.status != null && adsiS_(g.camp[M.status])) g.status = adsiS_(g.camp[M.status]);
    var ty = adsiType_(nm, g.adsets);
    var from = [g.start, rs].filter(String).sort().pop() || rs || g.start || adsiNameDate_(nm);
    var ym = from ? from.slice(0, 4) + from.slice(5, 7) : '';
    out.push({
      name:nm, type:ty, label:adsiLabel_(nm), month:ym ? +ym : '', status:g.status, rtype:g.rtype, adsets:g.adsets,
      reach:Math.round(t.reach), impr:Math.round(t.impr), results:Math.round(t.res), spend:Math.round(t.spend * 100) / 100,
      click:M.click != null ? Math.round(t.click) : null,
      cpr:t.res > 0 && t.spend > 0 ? Math.round(t.spend / t.res) : (cprs.length === 1 ? Math.round(cprs[0]) : null),
      mir:t.reach > 0 ? t.res / t.reach : null, start:g.start, end:g.end, approx:approx
    });
  });
  if (!out.length) return { error:'File không có dòng chiến dịch nào.' };
  return { campaigns:out, rstart:rs, rend:re, resultCol:resCol === M.msg ? 'msg' : 'results' };
}
/* loại chiến dịch theo tên ("2.10.2026 - Event - Dr Hậu" / "… - Product- CTKM …") */
function adsiType_(name, adsets){
  var segs = String(name).split(/\s+-\s*|\s*-\s+/).map(adsiN_);
  for (var i = 0; i < segs.length; i++){
    if (/^(event|events|sukien)$/.test(segs[i])) return 'Event';
    if (/^(product|products|sanpham)$/.test(segs[i])) return 'Product';
  }
  var all = adsiN_(name + ' ' + (adsets || []).join(' '));
  if (/event|sukien|hoithao|seminar|workshop|webinar|trienlam|exhibition|khoahoc|tuyensinh/.test(all)) return 'Event';
  if (/product|sanpham|ctkm|khuyenmai|promotion|clearstock|sale/.test(all)) return 'Product';
  return '';
}
/* nội dung chiến dịch: bỏ phần ngày + chữ loại ở đầu */
function adsiLabel_(name){
  var parts = String(name).split(/\s+-\s*|\s*-\s+/).map(function(x){ return x.trim(); }).filter(String);
  var keep = parts.filter(function(x){
    var c = x.replace(/\s+/g, '');
    if (/^\d{1,2}[.\/]\d{1,2}([.\/]\d{2,4})?\.?$/.test(c) || /^\d{8}$/.test(c)) return false;
    return !/^(event|events|sukien|product|products|sanpham)$/.test(adsiN_(x));
  });
  return keep.join(' - ') || String(name);
}
/* ngày ở đầu tên chiến dịch "2.10.2026" ⇒ 2026-10-02 */
function adsiNameDate_(name){
  var m = /^(\d{1,2})[.\/](\d{1,2})[.\/]\s*(\d{4})/.exec(String(name).trim());
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
}
function adsiStatus_(s){
  var k = adsiN_(s);
  if (!k) return '';
  if (/complet|finish|ended|ketthuc|hoantat|dahoanthanh/.test(k)) return 'Finished';
  if (/paus|inactive|off|tamdung|ngung/.test(k)) return 'Tạm dừng';
  if (/active|dangchay|hoatdong|learning/.test(k)) return 'Active';
  if (/reject|deleted|archived|tuchoi|daxoa/.test(k)) return 'Cancel';
  return 'Pending';
}

/* ══════════════ ĐỌC FILE ⇒ hàng × cột (Google Sheet: tab "Raw Data Report" nếu có) ══════════════ */
function adsiRows_(file){
  var mime = String(file.getMimeType() || ''), name = file.getName();
  if (mime === 'application/vnd.google-apps.spreadsheet'){
    var ss = SpreadsheetApp.openById(file.getId()), sh = ss.getSheetByName('Raw Data Report') || ss.getSheets()[0];
    return sh.getDataRange().getValues();
  }
  if (/spreadsheetml|officedocument|excel/i.test(mime) || /\.xlsx$/i.test(name)){
    return adsiXlsx_(file.getBlob());
  }
  return mktaCsvRows_(mktaDecode_(file.getBlob().getBytes()));
}
/* xlsx ⇒ hàng × cột — ưu tiên trang "Raw Data Report" (trang "Formatted Report" để trống tên chiến dịch ở dòng nhóm QC) */
function adsiXlsx_(blob){
  var files = {};
  Utilities.unzip(blob.setContentType('application/zip')).forEach(function(b){
    var nm = b.getName();
    if (/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^\/]+\.xml)$/.test(nm)) files[nm] = b.getDataAsString('UTF-8');
  });
  return adsiXlsxFiles_(files);
}
function adsiXlsxFiles_(files){
  var wb = files['xl/workbook.xml'] || '', sheets = wb.match(/<(?:\w+:)?sheet\b[^>]*\/>/g) || [];
  var raw = sheets.filter(function(x){ return /name="Raw Data Report"/i.test(x); })[0];
  if (raw && sheets[0] !== raw) files['xl/workbook.xml'] = wb.replace(raw, '').replace(sheets[0], raw + sheets[0]);
  return mktaXlsxRows_(files);
}

/* ══════════════ THƯ MỤC "ADS REPORT - file Ads Manager" ══════════════ */
function adsiDir_(create){
  var pr = PropertiesService.getScriptProperties(), id = pr.getProperty('MKTA_ADS_DIR');
  if (id){ try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch(e){} }
  if (!create) return null;
  var parent = null;
  try { var it = DriveApp.getFileById(MKTA.ON_ID).getParents(); if (it.hasNext()) parent = it.next(); } catch(e){}
  var fo = null;
  try { if (parent){ var ex = parent.getFoldersByName(ADSI.DIR_NAME); if (ex.hasNext()) fo = ex.next(); } } catch(e){}
  if (!fo){
    try { fo = parent ? parent.createFolder(ADSI.DIR_NAME) : DriveApp.createFolder(ADSI.DIR_NAME); }
    catch(e){ fo = DriveApp.createFolder(ADSI.DIR_NAME); }
    try { fo.setDescription('Thả file xuất từ Facebook Ads Manager (.xlsx / .csv / Google Sheet) vào đây — Report Hub tự đọc vào tab ADS REPORT ' +
                            '(file 3. Vietnam - Digital Marketing & Design) trong ~10 phút, cập nhật MIR.'); } catch(e){}
  }
  pr.setProperty('MKTA_ADS_DIR', fo.getId());
  return fo;
}
function adsiState_(){ try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('MKTA_ADSI') || '{}') || {}; } catch(e){ return {}; } }
function adsiSaveState_(st){
  var ks = Object.keys(st.f || {}).sort(function(a, b){ return (st.f[b].at || 0) - (st.f[a].at || 0); });
  if (ks.length > 80){ var keep = {}; ks.slice(0, 80).forEach(function(k){ keep[k] = st.f[k]; }); st.f = keep; }
  try { PropertiesService.getScriptProperties().setProperty('MKTA_ADSI', JSON.stringify(st)); } catch(e){}
}

/* ══════════════ GHI VÀO ADS REPORT ══════════════ */
function adsiCols_(sh, H){
  return {
    no: mktaCol_(H, ['No']), month: mktaCol_(H, ['Month']), type: mktaCol_(H, ['Type']), page: mktaCol_(H, ['Page']),
    name: mktaCol_(H, ['Event / Product', 'Event/Product']), status: mktaCol_(H, ['Status']),
    reach: mktaCol_(H, ['Tiếp cận']), impr: mktaCol_(H, ['Lượt hiển thị']), click: mktaCol_(H, ['Click quan tâm', 'Click']),
    res: mktaCol_(H, ['Kết quả (Inbox)', 'Kết quả']), mir: mktaCol_(H, ['MIR']), cpr: mktaCol_(H, ['CPR']),
    spend: mktaCol_(H, ['Ngân sách đã chi tiêu', 'Ngân sách']), start: mktaCol_(H, ['Ngày bắt đầu']), end: mktaCol_(H, ['Ngày kết thúc']),
    note: mktaCol_(H, ['Note'])
  };
}
function adsiDate_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function adsiFmt_(iso){ return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
/* ghi danh sách chiến dịch của 1 file ⇒ { rows:[{name, type, month, row, act}], months:{} } */
function adsiWrite_(ss, P, fileName, rep){
  var sh = ss.getSheetByName('ADS REPORT');
  if (!sh) throw new Error('Không thấy tab ADS REPORT');
  var H = mktaHead_(sh, 'Tiếp cận');
  if (!H) throw new Error('ADS REPORT: không thấy hàng tiêu đề');
  var kc = mktaCol_(H, [ADSI.H_KEY]);
  if (!kc){
    kc = mktaAddHeader_(sh, H, ADSI.H_KEY, '', 300);
    var dir = adsiDir_(true);
    try { sh.getRange(H.row, kc).setNote(ADSI.NOTE_KEY + '\n\nThả file Ads Manager vào thư mục: ' + dir.getUrl()); } catch(e){}
  }
  var C = adsiCols_(sh, H);
  if (!C.month || !C.type || !C.reach || !C.res) throw new Error('ADS REPORT thiếu cột Month / Type / Tiếp cận / Kết quả (Inbox)');
  var first = H.row + 1, last = Math.max(sh.getLastRow(), first), n = last - first + 1;
  var nc = Math.max(kc, H.last);
  var V = sh.getRange(first, 1, n, nc).getValues(), KN = sh.getRange(first, kc, n, 1).getNotes();
  var Fm = C.mir ? sh.getRange(first, C.mir, n, 1).getFormulas() : null;
  /* dòng có dữ liệu cuối cùng + số No lớn nhất */
  var lastData = first - 1, maxNo = 0, byKey = {}, byManual = {};
  for (var i = 0; i < n; i++){
    var v = V[i], filled = [C.month, C.type, C.name, C.reach, C.res, C.spend, kc].some(function(c){ return c && adsiS_(v[c - 1]) !== ''; });
    if (filled) lastData = first + i;
    if (C.no){ var no = +v[C.no - 1]; if (no > maxNo) maxNo = no; }
    var mo = adsiS_(v[C.month - 1]).replace(/\.0$/, ''), key = adsiS_(v[kc - 1]);
    if (key) byKey[adsiN_(key) + '|' + mo] = i;
    else if (filled && C.name){ var mk = adsiN_(v[C.name - 1]) + '|' + mo + '|' + adsiN_(v[C.type - 1]); if (!(mk in byManual)) byManual[mk] = i; }
  }
  var W = mktaW_(sh), out = { rows:[], months:{} }, stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  var period = P.rstart ? (P.rstart + ' → ' + (P.rend || '?')) : '';
  P.campaigns.forEach(function(c){
    if (!c.month) return;
    var mo = String(c.month), key = adsiN_(c.name) + '|' + mo, idx = byKey[key], act = 'upd', adopt = false;
    if (idx === undefined){
      var mk1 = adsiN_(c.label) + '|' + mo + '|' + adsiN_(c.type), mk2 = adsiN_(c.name) + '|' + mo + '|' + adsiN_(c.type);
      if (c.type && (mk1 in byManual || mk2 in byManual)){ idx = mk1 in byManual ? byManual[mk1] : byManual[mk2]; adopt = true; act = 'adopt'; }
    } else {
      /* file cũ hơn (kỳ báo cáo kết thúc sớm hơn lần ghi trước) ⇒ bỏ qua */
      var pm = /kỳ báo cáo: (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2})/.exec(KN[idx][0] || '');
      if (pm && P.rend && P.rend < pm[2]){ out.rows.push({ name:c.name, type:c.type, month:c.month, row:first + idx, act:'older' }); return; }
    }
    var r;
    if (idx === undefined){
      r = ++lastData; act = 'new';
      if (r > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), r - sh.getMaxRows() + 10);
      if (r > first){
        try { sh.getRange(r - 1, 1, 1, nc).copyTo(sh.getRange(r, 1, 1, nc), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); } catch(e){}
        try { sh.getRange(r - 1, 1, 1, nc).copyTo(sh.getRange(r, 1, 1, nc), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false); } catch(e){}
      }
      if (C.no) mktaPut_(W, r, C.no, ++maxNo);
    } else r = first + idx;
    var cur = idx === undefined ? [] : V[idx];
    var put = function(col, val){
      if (!col || val === null || val === undefined || val === '') return;
      if (adopt && adsiS_(cur[col - 1]) !== '') return;           // dòng gõ tay được nhận: chỉ điền ô trống
      mktaPut_(W, r, col, val);
    };
    put(C.month, c.month); put(C.type, c.type);
    if (!adsiS_(cur[(C.name || 1) - 1])) put(C.name, c.label);
    var st = adsiStatus_(c.status); if (st && C.status) put(C.status, mktaDvPick_(sh, r, C.status, st, st));
    put(C.reach, c.reach); put(C.impr, c.impr); if (c.click) put(C.click, c.click);
    put(C.res, c.results); put(C.cpr, c.cpr); put(C.spend, c.spend);
    put(C.start, adsiDate_(c.start)); put(C.end, adsiDate_(c.end));
    if (C.mir && C.res && C.reach && !(idx !== undefined && ((Fm && Fm[idx][0]) || adsiS_(cur[C.mir - 1]) !== '')))
      mktaPut_(W, r, C.mir, '=IFERROR(' + mktaA1_(C.res) + r + '/' + mktaA1_(C.reach) + r + ',"")', 'f');
    mktaPut_(W, r, kc, c.name);
    mktaPut_(W, r, kc, 'Tự động từ file "' + fileName + '" lúc ' + stamp + (period ? '\nkỳ báo cáo: ' + period : '') +
      '\nKết quả = ' + (c.rtype || 'Kết quả') + (c.approx ? '\n⚠ File không có dòng cấp chiến dịch ⇒ Tiếp cận = cộng các nhóm quảng cáo (ước tính, có thể trùng người).' : '') +
      (c.adsets.length ? '\nNhóm quảng cáo: ' + c.adsets.join(' · ') : '') + (!c.type ? '\n⚠ Tên chiến dịch không có "Event" / "Product" ⇒ chọn Type tay để tính MIR.' : ''), 'n');
    out.rows.push({ name:c.name, label:c.label, type:c.type, month:c.month, row:r, act:act, reach:c.reach, results:c.results, mir:c.mir, spend:c.spend });
    if (c.type) out.months[mo] = 1;
  });
  var w = mktaFlush_(W); rep.errors = rep.errors.concat(W.errs);
  out.written = w;
  return out;
}

/* ══════════════ KPI MIR report: thêm dòng tháng mới (Event + Product) ══════════════ */
function adsiMirTab_(ss, months, rep){
  var sh = ss.getSheetByName(ADSI.MIR_TAB); if (!sh) return 0;
  var H = mktaHead_(sh, 'Tháng'); if (!H) return 0;
  var cm = mktaCol_(H, ['Tháng']), cc = mktaCol_(H, ['Chiến dịch']), cR = mktaCol_(H, ['Total Reach']), cI = mktaCol_(H, ['Total Inbox']),
      cM = mktaCol_(H, ['MIR']), cK = mktaCol_(H, ['KPI MIR']), cP = mktaCol_(H, ['% completed']), cS = mktaCol_(H, ['Trạng thái']);
  if (!cm || !cc || !cR || !cI) return 0;
  var as = ss.getSheetByName('ADS REPORT'), AH = as && mktaHead_(as, 'Tiếp cận'); if (!AH) return 0;
  var A = adsiCols_(as, AH);
  var aJ = mktaA1_(A.reach), aM = mktaA1_(A.res), aC = mktaA1_(A.month), aD = mktaA1_(A.type);
  var first = H.row + 1, last = sh.getLastRow(), have = {}, end = H.row, kpi = 0.003;
  if (last >= first){
    var V = sh.getRange(first, 1, last - first + 1, Math.max(cS || 0, cK || 0, cI, cc, cm)).getValues();
    for (var i = 0; i < V.length; i++){
      var mo = adsiS_(V[i][cm - 1]).replace(/\.0$/, ''), ty = adsiN_(V[i][cc - 1]);
      if (!mo && !ty){ break; }
      end = first + i; have[mo + '|' + ty] = 1;
      if (cK && +V[i][cK - 1] > 0) kpi = +V[i][cK - 1];
    }
  }
  var add = [];
  Object.keys(months).sort().forEach(function(mo){
    ['Event', 'Product'].forEach(function(t){ if (!have[mo + '|' + adsiN_(t)]) add.push([mo, t]); });
  });
  if (!add.length) return 0;
  var nextFree = end + 1;
  /* có nội dung khác ngay dưới bảng ⇒ chèn dòng thay vì ghi đè */
  var below = sh.getLastRow() >= nextFree ? sh.getRange(nextFree, 1, Math.min(add.length, sh.getLastRow() - nextFree + 1), sh.getLastColumn()).getValues() : [];
  if (below.some(function(r){ return r.some(function(x){ return adsiS_(x) !== ''; }); })) sh.insertRowsAfter(end, add.length);
  var W = mktaW_(sh);
  add.forEach(function(x, k){
    var r = nextFree + k, B = mktaA1_(cm) + r, Cc = mktaA1_(cc) + r;
    try { sh.getRange(end, 1, 1, sh.getLastColumn()).copyTo(sh.getRange(r, 1, 1, sh.getLastColumn()), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false); } catch(e){}
    mktaPut_(W, r, cm, +x[0]); mktaPut_(W, r, cc, x[1]);
    mktaPut_(W, r, cR, "=SUMIFS('ADS REPORT'!" + aJ + ':' + aJ + ",'ADS REPORT'!" + aC + ':' + aC + ',' + B + ",'ADS REPORT'!" + aD + ':' + aD + ',' + Cc + ')', 'f');
    mktaPut_(W, r, cI, "=SUMIFS('ADS REPORT'!" + aM + ':' + aM + ",'ADS REPORT'!" + aC + ':' + aC + ',' + B + ",'ADS REPORT'!" + aD + ':' + aD + ',' + Cc + ')', 'f');
    if (cM) mktaPut_(W, r, cM, '=IFERROR(' + mktaA1_(cI) + r + '/' + mktaA1_(cR) + r + ',"")', 'f');
    if (cK) mktaPut_(W, r, cK, kpi);
    if (cP && cM && cK) mktaPut_(W, r, cP, '=IFERROR(' + mktaA1_(cM) + r + '/' + mktaA1_(cK) + r + ',"")', 'f');
    if (cS && cP) mktaPut_(W, r, cS, '=IF(' + mktaA1_(cP) + r + '="","",IF(' + mktaA1_(cP) + r + '>=100%,"Pass","Failed"))', 'f');
  });
  var w = mktaFlush_(W); rep.errors = rep.errors.concat(W.errs);
  if (w) rep.parts.push(ADSI.MIR_TAB + ': thêm ' + add.length + ' dòng tháng (' + add.map(function(x){ return x[0] + ' ' + x[1]; }).join(', ') + ')');
  return add.length;
}

/* ══════════════ 1 FILE ⇒ ADS REPORT ══════════════ */
function adsiImportFile_(ss, file, rep){
  var rows = adsiRows_(file), P = adsiParse_(rows);
  if (P.error) throw new Error(P.error);
  var res = adsiWrite_(ss, P, file.getName(), rep);
  try { adsiMirTab_(ss, res.months, rep); } catch(e){ rep.errors.push(ADSI.MIR_TAB + ': ' + (e.message || e)); }
  var nNew = res.rows.filter(function(x){ return x.act === 'new'; }).length, nUpd = res.rows.filter(function(x){ return x.act === 'upd' || x.act === 'adopt'; }).length;
  rep.parts.push('Ads Manager "' + file.getName() + '": ' + P.campaigns.length + ' chiến dịch · thêm ' + nNew + ' · cập nhật ' + nUpd + ' dòng ADS REPORT');
  try { file.setDescription('Đã đọc vào ADS REPORT lúc ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + P.campaigns.length + ' chiến dịch'); } catch(e){}
  return { campaigns:P.campaigns, rows:res.rows, rstart:P.rstart, rend:P.rend };
}

/* ══════════════ CHẠY ĐỊNH KỲ (gọi từ mktaDigital_ — 10 phút/lần + onChange file Digital) ══════════════ */
function adsiRun_(ss, rep, opt){
  opt = opt || {};
  var dir = adsiDir_(true); if (!dir) return;
  var st = adsiState_(); st.f = st.f || {};
  var it = dir.getFiles(), list = [], k = 0;
  while (it.hasNext() && k < 300){
    var f = it.next(); k++;
    if (/^TEST_/.test(f.getName())) continue;
    var ext = ((/\.([A-Za-z0-9]{1,5})$/.exec(f.getName()) || [])[1] || '').toLowerCase();
    if (!ADSI.EXT[ext] && f.getMimeType() !== 'application/vnd.google-apps.spreadsheet') continue;
    var u = f.getLastUpdated().getTime(), old = st.f[f.getId()];
    if (old && old.u === u && (!old.err || Date.now() - (old.at || 0) < 6 * 3600000)) continue;
    list.push({ f:f, u:u });
  }
  list.sort(function(a, b){ return a.u - b.u; });                 // file cũ trước ⇒ file mới nhất ghi sau cùng
  var done = 0;
  list.slice(0, ADSI.FILES_PER_RUN).forEach(function(x){
    try { var r = adsiImportFile_(ss, x.f, rep); st.f[x.f.getId()] = { u:x.u, at:Date.now(), n:r.campaigns.length, nm:x.f.getName().slice(0, 80) }; done++; }
    catch(e){ st.f[x.f.getId()] = { u:x.u, at:Date.now(), err:String(e && e.message || e).slice(0, 200), nm:x.f.getName().slice(0, 80) }; rep.errors.push('Ads "' + x.f.getName() + '": ' + (e.message || e)); }
  });
  if (list.length) adsiSaveState_(st);
  return done;
}

/* ══════════════ action=adsReport ══════════════
 * op=status            ⇒ { ok, folderUrl, files:[{name, at, n, err}] }
 * op=upload {name, data(base64), rid} ⇒ lưu vào thư mục + đọc ngay ⇒ { ok, file, campaigns:[…], rows:[{name,type,month,row,act,reach,results,mir}] }
 *    Chế độ TEST (tm=1): chỉ phân tích, KHÔNG lưu file / ghi sheet ⇒ { ok, test:true, campaigns }
 * op=run               ⇒ đọc ngay các file mới trong thư mục
 * ════════════════════════════════════════════ */
function adsiHandler_(user, p){
  p = p || {};
  var op = String(p.op || 'status');
  try {
    if (op === 'status'){
      var dir = adsiDir_(true), st = adsiState_(), files = [];
      Object.keys(st.f || {}).forEach(function(id){ var x = st.f[id]; files.push({ name:x.nm || id, at:x.at, n:x.n, err:x.err }); });
      files.sort(function(a, b){ return (b.at || 0) - (a.at || 0); });
      return { ok:true, folderUrl:dir ? dir.getUrl() : '', files:files.slice(0, 15) };
    }
    if (op === 'run'){
      var rep = { parts:[], errors:[] }, n = adsiRun_(SpreadsheetApp.openById(MKTA.ON_ID), rep, {});
      try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
      return { ok:true, files:n, message:rep.parts.join(' · ') || 'Không có file mới.', errors:rep.errors };
    }
    if (op !== 'upload') return { ok:false, error:'op không hợp lệ (status | upload | run).' };
    if (!user || !adsiS_(user.pic)) return { ok:false, error:'Cần đăng nhập để tải file Ads Manager.' };
    var rid = adsiS_(p.rid), key = 'adsi_' + rid;
    if (rid && typeof ridGet === 'function'){ var prev = ridGet(key); if (prev){ prev.dedup = true; return prev; } }
    var orig = adsiS_(p.name) || 'Ads Manager.xlsx', ext = ((/\.([A-Za-z0-9]{1,5})$/.exec(orig) || [])[1] || '').toLowerCase();
    if (!ADSI.EXT[ext]) return { ok:false, error:'Chỉ nhận file .xlsx hoặc .csv xuất từ Ads Manager.' };
    var b64 = String(p.data || '').replace(/^data:[^,]*,/, '');
    if (!b64) return { ok:false, error:'Không có dữ liệu file.' };
    if (b64.length * 0.75 > ADSI.MAX_MB * 1024 * 1024) return { ok:false, error:'File lớn hơn ' + ADSI.MAX_MB + ' MB.' };
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), ext === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', orig);
    var test = typeof tmOn_ === 'function' && tmOn_();
    if (test){
      var rowsT;
      if (ext === 'csv') rowsT = mktaCsvRows_(mktaDecode_(blob.getBytes()));
      else rowsT = adsiXlsx_(blob);
      var PT = adsiParse_(rowsT);
      return PT.error ? { ok:false, error:PT.error } : { ok:true, test:true, campaigns:PT.campaigns, rstart:PT.rstart, rend:PT.rend,
        message:'Chế độ TEST: đã đọc ' + PT.campaigns.length + ' chiến dịch (không lưu file, không ghi ADS REPORT).' };
    }
    var lock = LockService.getScriptLock();
    try { lock.waitLock(25000); } catch(e){ return { ok:false, error:'Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây.' }; }
    var out;
    try {
      var dir2 = adsiDir_(true);
      var safe = orig.replace(/[\\\/:*?"<>|#%\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
      var name = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmm') + '_' + safe;
      blob.setName(name);
      var file = dir2.createFile(blob);
      var rep2 = { parts:[], errors:[] }, ss = SpreadsheetApp.openById(MKTA.ON_ID), r = adsiImportFile_(ss, file, rep2);
      SpreadsheetApp.flush();
      var st2 = adsiState_(); st2.f = st2.f || {};
      st2.f[file.getId()] = { u:file.getLastUpdated().getTime(), at:Date.now(), n:r.campaigns.length, nm:name.slice(0, 80) };
      adsiSaveState_(st2);
      try { if (typeof logActivity === 'function') logActivity(user.pic, 'update', 'tải file Ads Manager "' + orig + '" ⇒ ADS REPORT (' + r.campaigns.length + ' chiến dịch)', '', ''); } catch(e){}
      try { if (typeof touchVersion === 'function') touchVersion(); } catch(e){}
      out = { ok:true, file:{ name:name, url:file.getUrl() }, folderUrl:dir2.getUrl(), campaigns:r.campaigns, rows:r.rows, rstart:r.rstart, rend:r.rend,
              errors:rep2.errors, message:rep2.parts.join(' · ') };
    } catch(e){ out = { ok:false, error:'Lỗi đọc file: ' + String(e && e.message || e) }; }
    finally { try { lock.releaseLock(); } catch(e){} }
    if (rid && out.ok && typeof ridPut === 'function') ridPut(key, out);
    return out;
  } catch(e){ return { ok:false, error:String(e && e.message || e) }; }
}
/* chạy tay trong trình soạn */
function adsiRunNow(){ var rep = { parts:[], errors:[] }; adsiRun_(SpreadsheetApp.openById(MKTA.ON_ID), rep, {}); Logger.log(JSON.stringify(rep, null, 2)); return rep; }
