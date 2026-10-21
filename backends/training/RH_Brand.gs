/* ════════════════════════════════════════════════════════════════════
   Training Hub · RH_Brand.gs  (v1.0 — 21/10/2026, HUB v3.33)
   ẢNH THƯƠNG HIỆU CHO GIAO DIỆN (người dùng yêu cầu: thêm ảnh sản phẩm, ảnh công ty, hoạt động đào tạo ⇒ giao diện phong phú)
   · Danh sách ảnh trên Drive (HB_LIST: tên ngắn + mã file) ⇒ ảnh thu nhỏ (thumbnail Drive, cạnh dài ≤ HB.W) ⇒ GitHub
     Training-Hub/media/brand/<tên>.<jpg|png> + media/brand/brand.json (danh mục). App đọc brand.json để dựng trang chủ / ảnh bìa.
   · Chạy NỀN 1 lần cho mỗi HB.VER: hubBrandTick_ (gọi trong hubDispatch, ≤ 1 lần thử / 10 phút) cài trigger chạy 1 lần
     hubBrandSync sau 30 giây; mỗi lượt tối đa ~4,5 phút, chưa xong ⇒ tự hẹn lượt sau. Ảnh đã đẩy ghi ở Script Property HB_DONE.
   · Cần GitHub token (Admin đã kết nối — HUB_GH_TOKEN). Không đổi dữ liệu Sheet, không gửi email. Quyền: drive + script.external_request (đã có).
   · Xem kết quả: action brandStatus (không cần đăng nhập, chỉ trả số lượng / lỗi). Chạy tay trong trình soạn: hubBrandSync().
   · Thêm / đổi ảnh: sửa HB_LIST + tăng HB.VER (ảnh trùng tên được ghi đè) — HOẶC thả ảnh vào thư mục Drive "Training Hub — Ảnh trang chủ"
     (trong thư mục gốc của Hub): kiểm ≤ 15 phút / lần, có ảnh mới ⇒ tự đẩy (tên f-<tên file>, danh mục brand.json có folder:true).
   ════════════════════════════════════════════════════════════════════ */

var HB = { VER: '1', DIR: 'media/brand/', W: 1600, BUDGET_MS: 270000 };
var HB_LIST = [
  // ── sản phẩm nha khoa ──
  ['jizai-orifice', '15-CFBW3SSwoFRU-7yMpKPPA1CQZWihR6'], ['jizai-glider', '10prtyugntcHP5fnfSx3NwNy-AUfxT6gv'],
  ['jizai-set', '180jZToPH5nMfJs2dhxOGp4mMXpAkxk5k'], ['jizai-1', '1GkTrNn6oNKENAYZ5rwjbqoVdDA5pqYN7'],
  ['carbide-catalog', '17YJnlqEsD7b4MIeUhr2yrBcnhESy0FlM'], ['carbide-app', '1eIVEN46c70kIpIsAIWHDNFvR6zsaTmv1'],
  ['diabur-clinical', '1lJp2X8FrNioy9YYvnRYoNEC2_cjRMgYx'], ['diabur-ipr', '1uPGxMfBRcDBBcjX5xLKLeRQsE3654FRA'],
  ['comp-micro', '1xRKUToU3NQlDLBDlO0YeQyK-XYI3FUxk'], ['comp-flov', '1ue6UZyLWVPLHKN7i4UmZOnI_nakEuEsa'],
  ['comp-flov-tube', '1f87MYR0FRe1_4snp4MEeKq3-2DZzZsHI'], ['comp-nano', '179PdrfLB9Ap9q-e4BtWizKkzkbkwQcv2'],
  ['comp-bulk', '1f_p8-kdMTKID_qOF7RHqNy-kDnznNLat'], ['mani-bond', '1Ns0m2Tjyavg3BYP_vREZH_SrvMKfcoqW'],
  ['bleach-shine', '1AbFn9JQ3hQaQnT4F8zOXTshoJ3mcHb73'],
  // ── nhãn khoa / ngoại khoa ──
  ['knife-hero', '1uo82psT6loVuodqWkhSUGPVQqAd8r_Wa'], ['knife-5a', '13tFJB3FRxGJRN99pJp-00iMknGP6BWKT'],
  ['knife-5b', '1bgNgSSH1scoccr2W-gMxH68Nkogl7D54'], ['knife-3', '1wXrYBYIhQphY0xZQ1YO3NRaUlZRh_qJU'],
  ['knife-arched', '1OV1t-surSvwMMrhUqCTgQTKii5QE0Lu7'],
  ['manipler-3', '1wqnfxA1xY-rocVDkqn20GNTHu3tp_J2O'], ['manipler-4', '1nFGa4t7bvOa1whTrL-NWTMuCU7Ye6AjQ'],
  ['manipler-5', '1FRzwFqyVP_13CYHDRkpePMFMq8orU5PZ'], ['manipler-catalog', '1BDFtLboZ1Hkl0sArOI7fCO4PlmKrpse_'],
  // ── thương hiệu / catalogue / chương trình ──
  ['standee', '1SV55wx_0BaYFMlFJfadYbDPXKVzLSdUA'], ['catalog-p3', '1QzH-UXTSv-TbjXD45cVsDc8IcFpXFzuc'],
  ['line-01', '1B-zFlNX_0MGopss0T3IRzsCrVHm79QBQ'], ['line-02', '1gHwY0kgRSEiuFoacWDZFRkqojKaqvUeR'],
  ['line-03', '121_ik5iShESYM1t_QnIsMDPWHQLS_UJw'], ['line-04', '1lDakCnuxLQgRVmOkAV4l45vs_0Kilvu1'],
  ['line-05', '16thOLTqST3utPasqcXz26y5z3gKVvveE'], ['line-06', '1evy6u-NVXhD1-G2z66Rlsp-tI910001O'],
  ['company-video', '11K1kTasflyr8CnDD5MEIqYf96pAO_BuG'], ['mmg-video', '1w4k4HvDfMQDOtqREbbWOpzyCVp1L6Ale'],
  // ── hoạt động đào tạo / workshop ──
  ['ws-comp-1', '1mlPs07i2GE3Oayz3pj014w1UDcMCezE3'], ['ws-comp-2', '1JUbOFfJ9DQrTT0IamM-upUxWzEWCnv0e'],
  ['ws-comp-3', '1JxFuSIbOxZyYVg8_H-NWxz8foj8eGS3V'], ['ws-jizai-1', '1V759ZEQkO0lcYnDuV6i6N4r0U1HDlax8'],
  ['ws-jizai-2', '1cM5d6YKod4-nK3PAE07xXmx99iptCL_J'], ['ws-jizai-3', '19XYI2sUHYyXR-VRUIZ3sXHagP0qYCmJf'],
  ['ws-jizai-kit', '1K2hThw4NJ7wbmXvG2NTxjmOelfOTJ1y5'], ['ws-restorative', '1tQjsqyP20cPYjalDTuW0iES4fRReyy8Q'],
  ['ws-led-hn', '1kpBY-CqsiTvKs73nhcMIjzyJq2EZRQKL'], ['ws-led-vp', '19JLvMl2M2cPGv3r-wHvIG0dMqWNZatVE']
];

function hbProps_() { return PropertiesService.getScriptProperties(); }
/** Thư mục Drive để Admin / trainer thả thêm ảnh trang chủ (ảnh company profile…): mọi ảnh trong đó cũng được đẩy lên GitHub (tên f-<tên file>) */
var HB_FOLDER_NAME = 'Training Hub — Ảnh trang chủ';
function hbFolder_() { return hubSubFolder(DriveApp.getFolderById(HUB.DRIVE.PARENT), HB_FOLDER_NAME); }
function hbFolderList_() {
  var out = [], it = hbFolder_().getFiles();
  while (it.hasNext() && out.length < 80) { var f = it.next(); if (/^image\//.test(f.getMimeType())) out.push(['f-' + hubGhSafe_(f.getName().replace(/\.[^.]+$/, '')).toLowerCase(), f.getId(), f.getName()]); }
  return out.sort(function(a, b){ return a[2] < b[2] ? -1 : 1; });
}
function hbAll_() { var x = []; try { x = hbFolderList_(); } catch (e) {} return HB_LIST.concat(x); }
function hbDone_() { try { return JSON.parse(hbProps_().getProperty('HB_DONE') || '{}') || {}; } catch (e) { return {}; } }

/** Gọi trong hubDispatch: chưa đồng bộ bản HB.VER ⇒ hẹn chạy nền 1 lần (≤ 1 lần thử / 10 phút) */
function hubBrandTick_() {
  var P = hbProps_();
  if (!hubGhToken_()) return;
  if (P.getProperty('HB_VER') === HB.VER) {
    var lc = Number(P.getProperty('HB_FCHK') || 0); if (Date.now() - lc < 15 * 60000) return;
    P.setProperty('HB_FCHK', String(Date.now()));
    var sig = ''; try { sig = hbFolderList_().map(function(x){ return x[1]; }).join(','); } catch (e) { return; }
    if (sig === (P.getProperty('HB_FSIG') || '')) return;
    P.deleteProperty('HB_VER');                     // thư mục có ảnh mới ⇒ chạy lại (ảnh cũ đã đẩy được bỏ qua)
  }
  var last = Number(P.getProperty('HB_TRY') || 0); if (Date.now() - last < 10 * 60000) return;
  P.setProperty('HB_TRY', String(Date.now()));
  hbSchedule_(30);
}
function hbSchedule_(sec) {
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'hubBrandSync') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('hubBrandSync').timeBased().after(sec * 1000).create();
}

/** Ảnh thu nhỏ của 1 file Drive (ảnh / PDF / video đều có) ⇒ blob, hoặc null */
function hbThumb_(id) {
  var tok = ScriptApp.getOAuthToken(), H = {headers: {Authorization: 'Bearer ' + tok}, muteHttpExceptions: true};
  var m = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?fields=name,mimeType,size,thumbnailLink&supportsAllDrives=true', H);
  if (m.getResponseCode() !== 200) throw new Error('Drive ' + m.getResponseCode());
  var j = JSON.parse(m.getContentText());
  if (j.thumbnailLink) {
    var link = j.thumbnailLink.replace(/=s\d+(-[a-z]+)?$/, '') + '=s' + HB.W;
    var r = UrlFetchApp.fetch(link, H);
    if (r.getResponseCode() === 200 && r.getBlob().getBytes().length > 2000) return {blob: r.getBlob(), name: j.name};
  }
  // không có ảnh thu nhỏ ⇒ ảnh gốc nhỏ (≤ 1,2 MB)
  if (/^image\//.test(j.mimeType) && Number(j.size || 0) <= 1200 * 1024) return {blob: DriveApp.getFileById(id).getBlob(), name: j.name};
  return null;
}

/** Trigger nền: đẩy lần lượt ảnh chưa có lên GitHub; hết giờ ⇒ hẹn lượt sau; xong ⇒ ghi brand.json + HB_VER */
function hubBrandSync() {
  var t0 = Date.now(), P = hbProps_(), sc = CacheService.getScriptCache();
  if (sc.get('hb:run')) return 'Đang chạy — bỏ qua.';
  sc.put('hb:run', '1', 330);
  var done = hbDone_(), errs = [], n = 0;
  try {
    if (!hubGhToken_()) return 'Chưa có GitHub token.';
    var ALL = hbAll_();
    for (var i = 0; i < ALL.length; i++) {
      var slug = ALL[i][0], id = ALL[i][1];
      if (done[slug] && done[slug].id === id && done[slug].v === HB.VER) continue;
      if (Date.now() - t0 > HB.BUDGET_MS) { hbSchedule_(60); P.setProperty('HB_LAST', JSON.stringify({at: new Date().toISOString(), partial: true, n: n, errors: errs})); return 'Chưa xong — hẹn lượt sau.'; }
      try {
        var th = hbThumb_(id);
        if (!th) { errs.push(slug + ': không có ảnh thu nhỏ'); done[slug] = {id: id, v: HB.VER, err: 1}; continue; }
        var ct = String(th.blob.getContentType() || 'image/jpeg'), ext = /png/.test(ct) ? 'png' : 'jpg';
        hubGhPut_(HB.DIR + slug + '.' + ext, Utilities.base64Encode(th.blob.getBytes()), 'Training Hub: ảnh thương hiệu ' + slug);
        done[slug] = {id: id, v: HB.VER, f: slug + '.' + ext, kb: Math.round(th.blob.getBytes().length / 1024), src: String(th.name || '').substring(0, 80)};
        n++;
      } catch (e) { errs.push(slug + ': ' + e.message); }
      P.setProperty('HB_DONE', JSON.stringify(done));
    }
    var list = ALL.map(function(x){ var d = done[x[0]]; return d && d.f ? {k: x[0], f: d.f, kb: d.kb, src: d.src, folder: x[0].indexOf('f-') === 0 || undefined} : null; }).filter(Boolean);
    hubGhPut_(HB.DIR + 'brand.json', Utilities.base64Encode(Utilities.newBlob(JSON.stringify({ver: HB.VER, at: new Date().toISOString(), items: list}, null, 1)).getBytes()),
      'Training Hub: danh mục ảnh thương hiệu v' + HB.VER);
    if (!errs.length || list.length >= ALL.length - 3) P.setProperty('HB_VER', HB.VER);
    P.setProperty('HB_FSIG', ALL.filter(function(x){ return x[0].indexOf('f-') === 0; }).map(function(x){ return x[1]; }).join(','));
    P.setProperty('HB_LAST', JSON.stringify({at: new Date().toISOString(), n: n, total: list.length, errors: errs}));
    ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'hubBrandSync') ScriptApp.deleteTrigger(t); });
    hubLog('INFO', 'brandSync', 'đẩy ' + n + ' ảnh · tổng ' + list.length + (errs.length ? ' · lỗi: ' + errs.join(' | ') : ''), '');
    return {n: n, total: list.length, errors: errs};
  } finally { try { sc.remove('hb:run'); } catch (e) {} }
}

/** action brandStatus (công khai, chỉ số lượng) */
function apiBrandStatus(p, user) {
  var P = hbProps_(), last = null;
  try { last = JSON.parse(P.getProperty('HB_LAST') || 'null'); } catch (e) {}
  var fu = ''; try { fu = hbFolder_().getUrl(); } catch (e) {}
  return {ok: true, ver: HB.VER, synced: P.getProperty('HB_VER') === HB.VER, gh: !!hubGhToken_(), list: HB_LIST.length, folder: fu,
          done: Object.keys(hbDone_()).length, last: last,
          trig: ScriptApp.getProjectTriggers().some(function(t){ return t.getHandlerFunction() === 'hubBrandSync'; })};
}
