/* ════════════════════════════════════════════════════════════════════════════════════════════════
   MMH_CrmSandbox.gs — v1.0 (13/10/2026) · HỘP CÁT TEST CỦA CRM · GIỐNG HỆT ở crm-dental / crm-surgical / crm-eyeless
   ─────────────────────────────────────────────────────────────────────────────────────────────
   Admin bấm TEST trên app ⇒ mọi lệnh gửi tm=1 + tmSb=1 + tmAs=<người đóng vai> + phiên email Admin (MMH_TestMode.gs v2.0 kiểm Admin).
   ① FILE TEST RIÊNG: bản sao file CRM của nhóm ("TEST · <tên file>") trong thư mục Drive "MMH CRM TEST/<Nhóm>" — dữ liệu thật
      bị xoá sạch (chỉ giữ tiêu đề, công thức, danh mục MASTER / NPP / mã sản phẩm, tab KPI), rồi sinh DỮ LIỆU ẢO cho từng PIC của nhóm:
      khách hàng + người liên hệ (CBC), lịch đi địa bàn có ảnh, đơn hàng qua đúng NPP của PIC (có đơn chờ duyệt), thuyết trình,
      Công việc khác (ALL TASK), 1 đề xuất công tác chờ Giám đốc duyệt. Mỗi PIC có 2 "địa bàn mới" đã đi thăm trên báo cáo tuần
      (1 cái đã có đơn đầu tiên tháng này) ⇒ thử được Mở mới → gửi duyệt → Quản lý / Giám đốc xác nhận.
   ② THƯ MỤC TEST RIÊNG: Ảnh đi địa bàn · Mở mới & chứng từ (kèm chứng từ đơn hàng) · Công tác · Báo cáo PDF.
   ③ Mở hộp cát (tmSbOpen_): ss() / thư mục ảnh / thư mục chứng từ / file Business Trip / thư mục công tác ⇒ bản TEST; phiên bản dữ liệu
      (VER_MAP_SB), đệm CacheService, nhật ký đều tách riêng; KHÔNG đẩy số sang file KPI thật; email vẫn chỉ về Admin (tmMailHook_).
   ④ Danh tính: whoAmI theo tmAs (app gửi pic = người đóng vai); tmSbWho_ thay phiên email ở các chỗ kiểm phiên (duyệt công tác,
      duyệt đơn hàng…) ⇒ đóng vai Giám đốc / HOD / trưởng nhóm / sales chạy đúng quy tắc của người đó.
   ⑤ tmSetup (lần đầu) / tmReset · tmClean (làm lại từ đầu): chạy nền bằng trigger 1 lần, app hỏi tmInfo tới khi ready.
   Không dùng dịch vụ Google mới (Spreadsheet / Drive / ScriptApp đã có) ⇒ không phải cấp quyền lại.
   ════════════════════════════════════════════════════════════════════════════════════════════════ */
var SBX_VER = '1.0';
var SB = null, _SBSS = null, SB_BUILD = false;
var SB_P = { sheet:'TM_SB_SHEET', folder:'TM_SB_FOLDER', sub:'TM_SB_SUB', state:'TM_SB_STATE', at:'TM_SB_AT', log:'TM_SB_LOG', who:'TM_SB_WHO', old:'TM_SB_OLD' };
var SB_ROOT = 'MMH CRM TEST';
var SB_KEEP = 400;                                   /* số dòng dữ liệu giữ lại mỗi tab của file TEST */
var SB_IMG = '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';

function sbOn_(){ return SB_BUILD || (typeof tmSb_ === 'function' && tmSb_()); }
function sbBook_(){
  if (!SB || !SB.id) throw new Error('Dữ liệu TEST chưa sẵn sàng — đợi ít phút rồi thử lại.');
  return _SBSS || (_SBSS = SpreadsheetApp.openById(SB.id));
}
function sbSub_(){ try { return JSON.parse(props_().getProperty(SB_P.sub) || '{}') || {}; } catch(e){ return {}; } }
/* đổi mọi đích ghi sang bản TEST (chỉ trong lượt gọi này) */
function sbRedirect_(){
  var sub = SB.sub || {};
  WEEKLY_PDF_FOLDER_ID = sub.pdf || SB.folder || WEEKLY_PDF_FOLDER_ID;
  TRIP_FILE_ID = SB.id; TRIP_URL = 'https://docs.google.com/spreadsheets/d/' + SB.id + '/edit';
  if (typeof TF !== 'undefined'){ TF.TRIP_ID = SB.id; TF.PARENT_FOLDER = sub.trip || SB.folder || TF.PARENT_FOLDER; }
  LOG_BUF_KEY = 'ACTBUF_SB';
  _VER = null; _SH = {}; _RAW = {}; _SBSS = null;
  try { _ST = null; } catch(e){}
}
/* gọi từ tmBegin_ (MMH_TestMode.gs) khi app gửi tmSb=1 */
function tmSbOpen_(p){
  var P = props_(), id = P.getProperty(SB_P.sheet), a = String((p && p.action) || '');
  if (!id){
    if (/^tm(Info|Setup|Reset|Clean)$/.test(a)) return null;
    return { err:'Dữ liệu TEST đang được chuẩn bị — đợi ít phút rồi thử lại.', code:'SB_NONE' };
  }
  SB = { id:id, folder:P.getProperty(SB_P.folder) || '', sub:sbSub_() };
  sbRedirect_();
  return null;
}
/* danh tính người Admin đang đóng vai (thay phiên email ở tfWho_ / ordMe_) */
function tmSbWho_(){
  if (!(typeof tmSb_ === 'function' && tmSb_())) return null;
  var as = String(MMH_TEST.as || '').trim(), u = as ? userByPic(as) : null;
  if (!u) return { local:MMH_TEST.local, pic:MMH_TEST.pic, level:'admin', admin:true, email:MMH_TEST.email };
  var email = String(u.email || '').toLowerCase(), local = email.split('@')[0];
  return { local:local, pic:u.pic, level:String(u.level || '').toLowerCase(), admin:local === MMH_TEST.local, email:email, sb:true };
}
/* người có thể đóng vai: thành viên nhóm + quản lý */
function sbPeople_(){
  var team = (TEAM_CFG[TEAM()] || TEAM_CFG.dental).team, out = [], seen = {};
  var add = function(e, u){ if (seen[u.pic]) return; seen[u.pic] = 1; out.push({ pic:u.pic, title:u.title || '', level:u.level || '', role:u.role || '', team:u.team || '' }); };
  for (var e in USER_MAP) if (USER_MAP[e].team === team) add(e, USER_MAP[e]);
  for (var e2 in USER_MAP){ var u2 = USER_MAP[e2]; if (/^(hod|director)$/.test(u2.level) || u2.team === 'Product Team') add(e2, u2); }
  return out;
}
function tmSbInfo_(){
  var P = props_(), id = P.getProperty(SB_P.sheet), st = P.getProperty(SB_P.state) || '', at = +(P.getProperty(SB_P.at) || 0);
  var building = st === 'building' && Date.now() - at < 15 * 60000;
  var out = { ok:true, sb:true, ver:SBX_VER, team:TEAM(), ready:!!id && !building, building:building, state:st, at:at, log:P.getProperty(SB_P.log) || '', people:sbPeople_() };
  if (id) out.url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  var fo = P.getProperty(SB_P.folder); if (fo) out.folderUrl = 'https://drive.google.com/drive/folders/' + fo;
  return out;
}
/* tmSetup / tmReset / tmClean ⇒ dựng lại bằng trigger chạy 1 lần (app hỏi tmInfo tới khi ready) */
function tmSbSetupStart_(reset){
  var P = props_(), st = P.getProperty(SB_P.state), at = +(P.getProperty(SB_P.at) || 0);
  if (st === 'building' && Date.now() - at < 15 * 60000) return tmSbInfo_();
  if (!reset && P.getProperty(SB_P.sheet)) return tmSbInfo_();
  var cur = P.getProperty(SB_P.sheet);
  var m = {}; m[SB_P.state] = 'building'; m[SB_P.at] = String(Date.now()); m[SB_P.who] = (MMH_TEST && MMH_TEST.email) || '';
  if (cur) m[SB_P.old] = cur;
  P.setProperties(m);
  P.deleteProperty(SB_P.sheet);                       /* trong lúc dựng: mọi lệnh TEST chờ (SB_NONE), không ghi vào file cũ */
  try {
    ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'tmSbBuild') ScriptApp.deleteTrigger(t); });
    ScriptApp.newTrigger('tmSbBuild').timeBased().after(1000).create();
  } catch(e){ sbBuild_(); }
  return tmSbInfo_();
}
function tmSbBuild(){
  try { ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'tmSbBuild') ScriptApp.deleteTrigger(t); }); } catch(e){}
  return sbBuild_();
}
function tmSbBuildNow(){ var r = sbBuild_(); Logger.log(JSON.stringify(r)); return r; }   /* chạy tay trong trình soạn */

/* ───────── dựng file TEST ───────── */
function sbFolder_(parent, name){ var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function sbBuild_(){
  var P = props_(), t0 = Date.now(), log = [], team = TEAM(), cfg = TEAM_CFG[team] || TEAM_CFG.dental;
  var realTrip = TRIP_FILE_ID, out = { ok:true };
  try {
    var real = ssReal_(), ctx = sbRealCtx_(real);                                 /* thống kê địa bàn / NPP từ file thật (không chép dữ liệu) */
    var root = sbFolder_(DriveApp.getRootFolder(), SB_ROOT), tf = sbFolder_(root, cfg.label);
    var sub = { photo:sbFolder_(tf, 'Ảnh đi địa bàn').getId(), na:sbFolder_(tf, 'Mở mới & chứng từ').getId(),
                trip:sbFolder_(tf, 'Công tác').getId(), pdf:sbFolder_(tf, 'Báo cáo PDF').getId() };
    try { ensureFolderShared_(DriveApp.getFolderById(sub.photo)); ensureFolderShared_(DriveApp.getFolderById(sub.na)); } catch(e){}
    var who = P.getProperty(SB_P.who);
    if (who){ try { if (Session.getEffectiveUser().getEmail().toLowerCase() !== who.toLowerCase()) root.addEditor(who); } catch(e){} }
    var old = P.getProperty(SB_P.old);
    if (old){ try { DriveApp.getFileById(old).setTrashed(true); } catch(e){} }
    var copy = DriveApp.getFileById(real.getId()).makeCopy('TEST · ' + real.getName(), tf);
    SB = { id:copy.getId(), folder:tf.getId(), sub:sub }; SB_BUILD = true; sbRedirect_();
    var book = sbBook_();
    log.push(sbWipe_(book));
    try { log.push(sbTripTabs_(book, realTrip)); } catch(eT){ log.push('công tác: ' + eT.message); }
    log.push(sbSeed_(book, ctx));
    SpreadsheetApp.flush();
    var m = {}; m[SB_P.sheet] = SB.id; m[SB_P.folder] = SB.folder; m[SB_P.sub] = JSON.stringify(sub); m[SB_P.state] = 'ready'; m[SB_P.at] = String(Date.now());
    m[SB_P.log] = (Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm') + ' · ' + Math.round((Date.now() - t0) / 1000) + 's · ' + log.join(' · ')).slice(0, 8000);
    P.setProperties(m); P.deleteProperty(SB_P.old); P.deleteProperty('VER_MAP_SB');
    out.log = m[SB_P.log]; out.url = copy.getUrl();
  } catch(err){
    var e = {}; e[SB_P.state] = 'error'; e[SB_P.at] = String(Date.now()); e[SB_P.log] = 'LỖI ' + String(err && err.message || err) + ' · ' + log.join(' · ');
    P.setProperties(e); out = { ok:false, error:String(err && err.message || err) };
  } finally { SB_BUILD = false; }
  return out;
}
/* xoá dữ liệu thật: giữ tiêu đề + công thức, chỉ giữ SB_KEEP dòng */
function sbClear_(sh, r0){
  if (!sh) return 0;
  var max = sh.getMaxRows();
  if (max > r0 + SB_KEEP) sh.deleteRows(r0 + SB_KEEP, max - (r0 + SB_KEEP) + 1);
  var lr = Math.min(sh.getLastRow(), r0 + SB_KEEP - 1), lc = sh.getLastColumn();
  if (lr < r0 || lc < 1) return 0;
  var n = lr - r0 + 1, F = sh.getRange(r0, 1, n, lc).getFormulas();
  for (var c = 0; c < lc; c++){
    var any = false; for (var r = 0; r < n && !any; r++) if (F[r][c]) any = true;
    if (!any){ sh.getRange(r0, c + 1, n, 1).clearContent(); continue; }
    for (var i = 0; i < n; i++){
      if (F[i][c]) continue;
      var k = i; while (k + 1 < n && !F[k + 1][c]) k++;
      sh.getRange(r0 + i, c + 1, k - i + 1, 1).clearContent(); i = k;
    }
  }
  return n;
}
function sbWipe_(book){
  var R = {}, n = 0;
  ['customer', 'cbc', 'order', 'monthly', 'weekly', 'present', 'adp'].forEach(function(k){ R[TABS[k]] = DATA_ROW; });
  R[NA_ENV.sheet] = NA_DR; R['ALL TASK'] = (typeof ST !== 'undefined' ? ST.DATA : 7);
  ['_LOG', '_ORDER_LOG', '_CUSTOMER_LOG', '_NA_THUMBS', '15. TENDER PRICE LOG', '13. WEEKLY MEETING', '14. TENDER TRACK',
   (typeof TF !== 'undefined' ? TF.LOG_TAB : 'Business Trip Log'), '_KPI_EMAIL_LOG'].forEach(function(nm){ R[nm] = 2; });
  book.getSheets().forEach(function(sh){
    var nm = sh.getName();
    if (/^9\.\s*(kpi cũ|old kpi)/i.test(nm)){ try { book.deleteSheet(sh); } catch(e){} return; }
    var r0 = R[nm]; if (!r0) return;
    try { sbClear_(sh, r0); n++; } catch(e){}
  });
  return 'dọn ' + n + ' tab';
}
/* tab "MMH Travel report" + "Master" của file Business Trip ⇒ chép vào file TEST (trống dữ liệu) */
function sbTripTabs_(book, realTrip){
  var src = SpreadsheetApp.openById(realTrip), k = 0;
  [(typeof TF !== 'undefined' ? TF.TRIP_TAB : 'MMH Travel report'), (typeof TRIP_MASTER !== 'undefined' ? TRIP_MASTER : 'Master')].forEach(function(nm){
    var s = src.getSheetByName(nm); if (!s) return;
    var ex = book.getSheetByName(nm); if (ex) book.deleteSheet(ex);
    var c = s.copyTo(book); c.setName(nm); k++;
  });
  sbClear_(book.getSheetByName(typeof TF !== 'undefined' ? TF.TRIP_TAB : 'MMH Travel report'), typeof TF !== 'undefined' ? TF.DATA_ROW : 5);
  return 'công tác ' + k + ' tab';
}

/* ───────── số liệu nền từ file thật: tỉnh / miền / loại khách / NPP theo PIC (không chép tên khách thật) ───────── */
function sbRealCtx_(real){
  var ctx = { pics:{}, npp:{}, nppAcc:{} };
  try {
    var s = real.getSheetByName(TABS.customer), C = COL.customer, lr = s.getLastRow();
    if (lr >= DATA_ROW){
      var V = s.getRange(DATA_ROW, 1, lr - DATA_ROW + 1, Math.max(C.pic, C.area, C.type, C.province)).getValues();
      V.forEach(function(r){
        var pic = S(r[C.pic - 1]); if (!pic) return;
        var x = ctx.pics[pic] = ctx.pics[pic] || { prov:{}, type:{} };
        var pv = S(r[C.province - 1]) + '|' + S(r[C.area - 1]); if (S(r[C.province - 1])) x.prov[pv] = (x.prov[pv] || 0) + 1;
        var ty = S(r[C.type - 1]); if (ty) x.type[ty] = (x.type[ty] || 0) + 1;
        if (/distributor/i.test(ty)) ctx.nppAcc[S(r[C.name - 1])] = [S(r[C.name - 1]), ty, S(r[C.province - 1]), S(r[C.area - 1]), S(r[C.address - 1])];
      });
    }
  } catch(e){}
  try {
    var o = real.getSheetByName(TABS.order), O = COL.order, lo = o.getLastRow(), cnt = {};
    if (lo >= DATA_ROW){
      var W = o.getRange(Math.max(DATA_ROW, lo - 1500), 1, Math.min(1501, lo - DATA_ROW + 1), Math.max(O.partner, O.partnerType, O.pic)).getValues();
      W.forEach(function(r){
        var pic = S(r[O.pic - 1]), pa = S(r[O.partner - 1]); if (!pic || !pa || !/\//.test(pa) || !/distributor/i.test(S(r[O.partnerType - 1]) + pa)) return;
        cnt[pic] = cnt[pic] || {}; cnt[pic][pa] = (cnt[pic][pa] || 0) + 1;
      });
    }
    Object.keys(cnt).forEach(function(pic){ ctx.npp[pic] = Object.keys(cnt[pic]).sort(function(a, b){ return cnt[pic][b] - cnt[pic][a]; }); });
  } catch(e){}
  return ctx;
}
function sbTop_(m){ return Object.keys(m || {}).sort(function(a, b){ return m[b] - m[a]; }); }
/* NPP của PIC: đúng từ khoá K68_NPP (Dental) trong các NPP PIC đó hay dùng, không có ⇒ NPP PIC dùng nhiều nhất */
function sbNppOf_(pic, ctx){
  var used = ctx.npp[pic] || [], keys = ((typeof K68_NPP !== 'undefined' && K68_NPP[TEAM()]) || {})[pic] || [], out = [];
  keys.forEach(function(k){
    var kk = naNorm_(k), hit = used.filter(function(x){ return naNorm_(x).indexOf(kk) >= 0; })[0];
    if (!hit) hit = Object.keys(ctx.nppAcc).map(function(n){ return ctx.nppAcc[n].slice(0, 4).join('/'); }).filter(function(x){ return naNorm_(x).indexOf(kk) >= 0; })[0];
    if (hit && out.indexOf(hit) < 0) out.push(hit);
  });
  if (!out.length && used.length) out.push(used[0]);
  return out;
}

/* ───────── sinh dữ liệu ảo ───────── */
var SB_NAMES = {
  clinic:   ['Nha khoa An Phúc', 'Nha khoa Bình Minh', 'Nha khoa Hồng Ngọc', 'Nha khoa Thiện Tâm', 'Nha khoa Sao Mai', 'Nha khoa Kim Long', 'Nha khoa Phúc An', 'Nha khoa Minh Khang', 'Nha khoa Hạnh Phúc'],
  lab:      ['Labo Hoàng Gia', 'Labo Phương Đông', 'Labo Ánh Dương', 'Labo Trường Thành', 'Labo Đại Phát', 'Labo Tân Tiến'],
  hospital: ['Bệnh viện Đa khoa Hòa An', 'Bệnh viện Mắt Ánh Sáng', 'Bệnh viện Đa khoa Bình An', 'Bệnh viện Mắt Quang Minh', 'Bệnh viện Đa khoa Phú Thịnh', 'Bệnh viện Mắt Thiên Ân'],
  dealer:   ['Cửa hàng nha khoa Thành Công', 'Đại lý vật tư y tế Phúc Lộc', 'Cửa hàng TTB nha khoa Kim Ngân', 'Đại lý nha khoa Hưng Thịnh', 'Cửa hàng vật tư Đức Tín', 'Đại lý TTB Minh Phát'],
  uni:      ['Khoa Răng Hàm Mặt - ĐH Y Mẫu', 'Viện Đào tạo RHM Mẫu', 'Khoa Mắt - ĐH Y Dược Mẫu', 'Trung tâm Đào tạo Nha khoa Mẫu'],
  other:    ['Phòng khám Đa khoa Tâm Bình', 'Phòng khám Mắt Hoàng Long', 'Trung tâm Y tế Mẫu An Khang', 'Phòng khám Đa khoa Minh Đức', 'Phòng khám Mắt Bảo Châu', 'Phòng khám An Tâm']
};
var SB_PEOPLE = ['BS. Nguyễn Văn An', 'BS. Trần Thị Bình', 'BS. Lê Minh Châu', 'KTV. Phạm Quốc Dũng', 'Chị Hoàng Thu Hà', 'Anh Vũ Đức Hải', 'BS. Đặng Ngọc Lan',
                 'Chị Bùi Thanh Mai', 'Anh Đỗ Trọng Nam', 'BS. Phan Thu Oanh', 'BS. Ngô Đức Phúc', 'Chị Lý Thanh Quyên', 'Anh Tạ Minh Sơn', 'BS. Mai Anh Thư'];
function sbPool_(type){
  var t = naNorm_(type);
  if (/lab/.test(t)) return SB_NAMES.lab;
  if (/hospital|benh vien/.test(t)) return SB_NAMES.hospital;
  if (/dealer|distributor|shop|cua hang/.test(t)) return SB_NAMES.dealer;
  if (/clinic|nha khoa/.test(t)) return SB_NAMES.clinic;
  if (/univ|truong|vien/.test(t)) return SB_NAMES.uni;
  return SB_NAMES.other;
}
function sbIso_(d){ return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function sbDay_(iso){ return s2d(iso); }
function sbAdd_(d, k){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + k); return x; }
function sbWork_(d, back){ var x = new Date(d.getTime()); while (x.getDay() === 0 || x.getDay() === 6) x = sbAdd_(x, back ? -1 : 1); return x; }
function sbList_(book, field){
  var out = [];
  try {
    var s = book.getSheetByName(TABS.master), c = COL.master[field], lr = s.getLastRow(); if (!c || lr < DATA_ROW) return out;
    s.getRange(DATA_ROW, c, lr - DATA_ROW + 1, 1).getDisplayValues().forEach(function(r){ var v = S(r[0]); if (v && out.indexOf(v) < 0) out.push(v); });
  } catch(e){}
  return out;
}
function sbPick_(list, re, dflt){ for (var i = 0; i < list.length; i++) if (re.test(naNorm_(list[i]))) return list[i]; return dflt; }
/* ghi khối dòng theo map cột — bỏ qua cột đang có công thức */
function sbPut_(sh, r0, map, rows){
  if (!rows.length) return 0;
  var need = r0 + rows.length - 1; if (sh.getMaxRows() < need) sh.insertRowsAfter(sh.getMaxRows(), need - sh.getMaxRows());
  var fields = {}; rows.forEach(function(o){ for (var k in o) if (map[k]) fields[k] = 1; });
  Object.keys(fields).forEach(function(k){
    var c = map[k], rg = sh.getRange(r0, c, rows.length, 1), F = rg.getFormulas();
    if (F.some(function(x){ return !!x[0]; })) return;
    rg.setValues(rows.map(function(o){ var v = o[k]; return [v === undefined || v === null ? '' : v]; }));
  });
  return rows.length;
}
function sbSeed_(book, ctx){
  var team = TEAM(), tm = (TEAM_CFG[team] || TEAM_CFG.dental), pics = [], cnt = { acc:0, cbc:0, wk:0, ord:0, pres:0, task:0, trip:0, img:0 };
  for (var e in USER_MAP) if (USER_MAP[e].team === tm.team) pics.push(Object.assign({ email:e }, USER_MAP[e]));
  if (!pics.length) return 'không có PIC';
  var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var ymNow = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMM'), lastM = new Date(today.getFullYear(), today.getMonth() - 1, 12);
  var ymLast = Utilities.formatDate(lastM, Session.getScriptTimeZone(), 'yyyyMM');
  var L = { typeTask:sbList_(book, 'typeTask'), typeAction:sbList_(book, 'typeAction'), process:sbList_(book, 'process'), product:sbList_(book, 'product'),
            job:sbList_(book, 'jobTitle'), role:sbList_(book, 'role'), infl:sbList_(book, 'influence'), feedback:sbList_(book, 'feedback'), status:sbList_(book, 'status') };
  var done = sbPick_(L.status, /^complet/, 'Completed'), todo = sbPick_(L.status, /not started|to do/, 'Not Started');
  var visit = sbPick_(L.typeAction, /^visit/, 'Visiting');
  var prods = L.product.length ? L.product : ['Jizai', 'Composite', 'Bur'];
  var imgFolder = DriveApp.getFolderById(SB.sub.photo), naFolder = DriveApp.getFolderById(SB.sub.na);
  var blob = function(name){ return Utilities.newBlob(Utilities.base64Decode(SB_IMG), 'image/png', name); };
  var doc = naFolder.createFile(blob('Phieu ban hang NPP (mau).png')), docUrl = 'https://drive.google.com/file/d/' + doc.getId() + '/view';
  var CUS = [], CBC = [], WK = [], ORD = [], PRE = [], nppAcc = {}, people = 0, ord = 0;
  pics.forEach(function(u, pi){
    var x = ctx.pics[u.pic] || { prov:{}, type:{} }, pv = (sbTop_(x.prov)[0] || (pi % 3 === 0 ? 'Hanoi|North' : pi % 3 === 1 ? 'Ho Chi Minh|South' : 'Da Nang|Central')).split('|');
    var prov = pv[0], area = pv[1] || '', types = sbTop_(x.type).filter(function(t){ return !/distributor/i.test(t); });
    if (!types.length) types = team === 'dental' ? ['Clinic', 'Laboratory'] : ['Hospital', 'Clinic'];
    var newType = team === 'dental' ? 'Dealer' : types[0];                /* Dental: C1 chỉ tính Account type = Dealer */
    var accs = [];
    for (var i = 0; i < 6; i++){
      var isNew = i >= 4, ty = isNew ? newType : types[i % types.length], pool = sbPool_(ty), nm = pool[(pi * 2 + i) % pool.length];
      if (accs.some(function(a){ return a.name === nm; }) || CUS.some(function(c){ return c.name === nm; })) nm = nm + ' ' + (pi + 1);
      var a = { name:nm, type:ty, province:prov, area:area, isNew:isNew, check:nm + '/' + ty + '/' + prov + '/' + area, contact:SB_PEOPLE[(people++) % SB_PEOPLE.length] };
      accs.push(a);
      CUS.push({ name:nm, type:ty, address:'Số ' + (10 + i * 7) + ' đường Mẫu, ' + prov, province:prov, area:area, pic:u.pic, fy:isNew ? '' : 'FY67',
                 openDate:isNew ? '' : sbAdd_(today, -400 - i * 30), note:isNew ? 'Địa bàn mới (dữ liệu TEST)' : '' });
      CBC.push({ type:ty, name:nm, address:'Số ' + (10 + i * 7) + ' đường Mẫu, ' + prov, province:prov, area:area, pic:u.pic, contact:a.contact,
                 phone:'0900' + ('000000' + (100000 + pi * 1000 + i * 17)).slice(-6), jobTitle:L.job[0] || 'Bác sĩ', role:L.role[0] || '', influence:L.infl[0] || '', log:'Dữ liệu TEST' });
    }
    /* đi địa bàn: 10 ngày làm việc gần nhất (đã xong, có ảnh) + 3 ngày tới (kế hoạch) */
    var d = sbWork_(sbAdd_(today, -1), true), k = 0;
    for (var v = 0; v < 10; v++){
      var acc = accs[v % accs.length], iso = sbIso_(d), task = sbPick_(L.typeTask, new RegExp(naNorm_(acc.type).slice(0, 4)), sbPick_(L.typeTask, /^sale/, 'Sale-Clinic'));
      var nmImg = u.pic + '_' + iso.replace(/-/g, '') + '_' + safeSeg_(acc.name) + '_01.png', f = imgFolder.createFile(blob(nmImg)); cnt.img++;
      WK.push({ fy:fyOfMonth(iso.slice(0, 7).replace('-', '')), month:+iso.slice(0, 7).replace('-', ''), start:sbDay_(iso), finish:sbDay_(iso), pic:u.pic, account:acc.check,
                type:acc.type, province:acc.province, area:acc.area, product:prods[v % prods.length], typeTask:task, typeAction:visit, process:L.process[Math.min(1, L.process.length - 1)] || '',
                plan:'Giới thiệu ' + prods[v % prods.length] + ' và chương trình tháng', result:'Người gặp: ' + acc.contact + '\nĐã giới thiệu sản phẩm, khách quan tâm, hẹn lần sau demo.',
                status:done, feedback:L.feedback[0] || '', nextAction:'Gửi báo giá / hẹn demo', photo:'https://drive.google.com/file/d/' + f.getId() + '/view',
                gpsInfo:'📍 ' + acc.province + ' (dữ liệu TEST)\n🕒 ' + iso + ' 10:' + ('0' + (10 + v)).slice(-2) });
      d = sbWork_(sbAdd_(d, -1), true); k++;
    }
    var fd = sbWork_(sbAdd_(today, 1), false);
    for (var w = 0; w < 3; w++){
      var ac2 = accs[(w + 2) % accs.length], iso2 = sbIso_(fd);
      WK.push({ fy:fyOfMonth(iso2.slice(0, 7).replace('-', '')), month:+iso2.slice(0, 7).replace('-', ''), start:sbDay_(iso2), finish:sbDay_(iso2), pic:u.pic, account:ac2.check,
                type:ac2.type, province:ac2.province, area:ac2.area, product:prods[w % prods.length], typeTask:sbPick_(L.typeTask, /^sale/, 'Sale-Clinic'), typeAction:visit,
                process:L.process[0] || '', plan:'Thăm lại, demo ' + prods[w % prods.length], result:'', status:todo });
      fd = sbWork_(sbAdd_(fd, 1), false);
    }
    /* đơn hàng: qua đúng NPP của PIC — tháng trước (đã duyệt) + tháng này (chờ duyệt) + đơn đầu tiên của địa bàn mới #1 */
    var npps = sbNppOf_(u.pic, ctx); npps.forEach(function(n){ nppAcc[n] = 1; });
    var npp = function(j){ return npps.length ? npps[j % npps.length] : ''; };
    var mk = function(acc, day, ym, qty, price, otype, appr, j){
      ord++; return { channel:'Offline', fy:fyOfMonth(ym), month:+ym, day:day, orderNo:'TEST-' + ('00' + ord).slice(-3), name:acc.name, contact:acc.contact,
        detail:prods[j % prods.length] + ' (mẫu)', ptype:prods[j % prods.length], qty:qty, price:price, amount:qty * price, partner:npp(j), partnerType:npp(j) ? 'Distributor' : '',
        source:'Dữ liệu TEST', otype:otype, docs:otype ? 'Phiếu bán hàng NPP (mẫu) | ' + docUrl : '', appr:appr, apprBy:appr === ORDER_ST.ok ? 'Tuyen' : '', apprAt:appr === ORDER_ST.ok ? sbAdd_(today, -10) : '' };
    };
    ORD.push(mk(accs[0], sbWork_(lastM, true), ymLast, 10, 450000, '', '', 0));
    ORD.push(mk(accs[1], sbWork_(sbAdd_(lastM, 6), true), ymLast, 6, 600000, '', '', 1));
    ORD.push(mk(accs[2], sbWork_(sbAdd_(today, -3), true), ymNow, 8, 500000, ORDER_TYPES[2], ORDER_ST.wait, 2));
    ORD.push(mk(accs[3], sbWork_(sbAdd_(today, -2), true), ymNow, 5, 700000, ORDER_TYPES[2], ORDER_ST.wait, 3));
    ORD.push(mk(accs[4], sbWork_(sbAdd_(today, -1), true), ymNow, 4, 650000, ORDER_TYPES[1], ORDER_ST.wait, 4));   /* địa bàn mới #1: đơn đầu tiên */
    /* thuyết trình: 1 buổi đã xong + 1 kế hoạch */
    var tpl = ['Số lượng tham dự thực tế: 12', 'Tóm tắt hoạt động: giới thiệu ' + prods[0] + ', thực hành trên mẫu', 'Phản hồi khách hàng: quan tâm, hỏi giá',
               'Doanh số: 2 đơn sau buổi', 'Hành động tiếp theo: gửi báo giá, hẹn demo'].map(function(l){ return '-' + l; }).join('\n');
    var pd = sbWork_(sbAdd_(today, -6), true), pd2 = sbWork_(sbAdd_(today, 9), false);
    PRE.push({ account:accs[0].check, pic:u.pic, province:prov, area:area, fy:fyOfMonth(Utilities.formatDate(pd, Session.getScriptTimeZone(), 'yyyyMM')), month:+Utilities.formatDate(pd, Session.getScriptTimeZone(), 'yyyyMM'), day:pd, review:tpl, target:15, actual:12 });
    PRE.push({ account:accs[1].check, pic:u.pic, province:prov, area:area, fy:fyOfMonth(Utilities.formatDate(pd2, Session.getScriptTimeZone(), 'yyyyMM')), month:+Utilities.formatDate(pd2, Session.getScriptTimeZone(), 'yyyyMM'), day:pd2, review:'', target:15, actual:'' });
  });
  /* NPP dùng trong đơn hàng phải có trong danh mục khách hàng (dò mã / tỉnh) */
  Object.keys(nppAcc).forEach(function(chk){
    var p = parseCheckName(chk), src = ctx.nppAcc[p.name] || [p.name, p.type || 'Distributor', p.province, p.area, ''];
    CUS.push({ name:src[0], type:src[1], address:src[4], province:src[2], area:src[3], pic:'', fy:'FY65', openDate:'', note:'Nhà phân phối' });
  });
  var C = COL;
  try { cnt.acc = sbPut_(sh('customer'), DATA_ROW, C.customer, CUS); } catch(e){ cnt.accErr = e.message; }
  try { cnt.cbc = sbPut_(sh('cbc'), DATA_ROW, C.cbc, CBC); } catch(e){ cnt.cbcErr = e.message; }
  try { WK.forEach(function(o, i){ o.no = i + 1; }); cnt.wk = sbPut_(sh('weekly'), DATA_ROW, C.weekly, WK); } catch(e){ cnt.wkErr = e.message; }
  try { if (typeof ordX_ === 'function') ordX_(); cnt.ord = sbPut_(sh('order'), DATA_ROW, C.order, ORD); } catch(e){ cnt.ordErr = e.message; }
  try { PRE.forEach(function(o, i){ o.no = i + 1; }); cnt.pres = sbPut_(sh('present'), DATA_ROW, C.present, PRE); } catch(e){ cnt.presErr = e.message; }
  /* cột công thức (mã khách, mã CBC, thông tin khách trên đơn…) phủ đủ các dòng vừa sinh */
  [['customer', CUS.length], ['cbc', CBC.length], ['order', ORD.length]].forEach(function(x){
    try { if (x[1]) ensureFormulas_(sh(x[0]), DATA_ROW, FORMULA_FIELDS[x[0]] || {}, C[x[0]], x[1]); } catch(e){}
  });
  /* Công việc khác (ALL TASK): 1 key + 2 sub mỗi PIC */
  try {
    if (typeof stWrite_ === 'function'){
      var row = ST.DATA, ty = 'Sales-' + tm.label, mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      pics.forEach(function(u){
        stWrite_(row++, { type:ty, keyTask:'Kế hoạch tháng ' + ymNow.slice(4) + '/' + ymNow.slice(0, 4) + ' · ' + u.pic, subTask:'', pic:u.pic, result:'', start:sbIso_(new Date(today.getFullYear(), today.getMonth(), 1)), planned:sbIso_(mEnd), revised:'', status:'In Progress', progress:30 });
        stWrite_(row++, { type:'', keyTask:'', subTask:'Hoàn thành báo cáo tuần', pic:u.pic, result:'', start:sbIso_(sbAdd_(today, -2)), planned:sbIso_(sbAdd_(today, 2)), revised:'', status:'In Progress', progress:50 });
        stWrite_(row++, { type:'', keyTask:'', subTask:'Gửi báo giá cho khách mới', pic:u.pic, result:'', start:sbIso_(today), planned:sbIso_(sbAdd_(today, 5)), revised:'', status:'To Do', progress:0 });
        cnt.task += 3;
      });
      _ST = null; stRenumber_();
    }
  } catch(e){ cnt.taskErr = e.message; }
  /* 1 đề xuất công tác chờ Giám đốc duyệt */
  try {
    var tr = sbBook_().getSheetByName(typeof TF !== 'undefined' ? TF.TRIP_TAB : 'MMH Travel report');
    if (tr && typeof TF !== 'undefined'){
      var T = TF.C, u0 = pics[0], s0 = sbWork_(sbAdd_(today, 8), false), f0 = sbAdd_(s0, 1), r = TF.DATA_ROW, v = [];
      var put = function(c, val){ tr.getRange(r, c).setValue(val); };
      put(T.NO, 1); put(T.PIC, u0.pic); put(T.START, s0); put(T.FINISH, f0); put(T.DEST, 'Tỉnh Mẫu (dữ liệu TEST)'); put(T.PURPOSE, 'Thăm khách hàng & hỗ trợ NPP');
      put(T.EXPECT, 'Mở 1 địa bàn mới, 2 buổi demo'); put(T.ESTCOST, 'Công tác phí: 1.000.000'); put(T.APPROVAL, 'Already sent propose email'); put(T.EMAIL_PIC, u0.email);
      cnt.trip = 1;
    }
  } catch(e){ cnt.tripErr = e.message; }
  try { bumpVersion(); } catch(e){}
  return 'dữ liệu ảo: ' + cnt.acc + ' khách · ' + cnt.cbc + ' CBC · ' + cnt.wk + ' đi địa bàn (' + cnt.img + ' ảnh) · ' + cnt.ord + ' đơn · ' + cnt.pres + ' thuyết trình · ' + cnt.task + ' việc · ' + cnt.trip + ' công tác' +
    Object.keys(cnt).filter(function(k){ return /Err$/.test(k); }).map(function(k){ return ' · ' + k + ': ' + cnt[k]; }).join('');
}
