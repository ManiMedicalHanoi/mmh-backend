/*************************************************************************************************
 * MMH — MKT_EventHubFolder.gs   (Event Hub v2.0 · 18/11/2026) — người dùng chốt 18/11/2026:
 *  ① 2 thư mục gốc (ghi nhớ ở đây): Event FY68 = EH.ROOT · MKT Online = EH_DIR.ONLINE (bản nháp bài đăng / thiết kế — luồng duyệt làm sau).
 *  ② Tạo sự kiện trên app ⇒ hệ thống TẠO FOLDER sự kiện theo bố cục đang dùng:
 *       "yyyymmdd[-dd] <Tên>_<Loại>" / Plan (file Google Sheet tổng, chép từ file mẫu EH_PLAN_TPL) · Event Access (ấn phẩm) · Media · Survey
 *     Người tạo chọn nơi đặt: folder riêng ở gốc Event FY68 (place = 'root') hoặc trong folder báo cáo viên có sẵn (place = 'dr:<id>')
 *     hoặc folder báo cáo viên mới (place = 'drnew:<Tên>' ⇒ "DR. <TÊN>"). Sự kiện cũ GIỮ NGUYÊN chỗ (không di chuyển).
 *  ③ File tải lên từ app vào đúng folder con của sự kiện: ảnh ở giai đoạn "Trong sự kiện" ⇒ Media, còn lại ⇒ Event Access
 *     (sự kiện cũ: tìm folder qua file kế hoạch / cột folder ở MKT Offline; không có mới dùng "Event Hub · Tệp tải lên" như trước).
 *  ④ Quét file kế hoạch sâu 4 cấp (folder báo cáo viên ▸ sự kiện ▸ Plan), bỏ qua folder ảnh / ấn phẩm cho nhanh.
 *  Action ehFolders (phiên tk): danh sách folder báo cáo viên + link 2 thư mục gốc + file mẫu · op=tpl&id=<file> (quản lý) đặt file mẫu.
 *************************************************************************************************/
var EH_DIR = {
  ONLINE: '1005C31Tlu1OBD813XJmn_NbgQksS3vcG',   /* thư mục Drive "MKT Online" */
  SUB: ['Plan', 'Event Access', 'Media', 'Survey'],
  SKIP_RE: /^(media|photo|event access|survey|logo|holiday|.*retouch)/i,
  DR_RE: /^\s*(dr|ths|ts|pgs|bs)\b\.?/i
};
function ehDirOnlineUrl_(){ return 'https://drive.google.com/drive/folders/' + EH_DIR.ONLINE; }

/* folder báo cáo viên ở gốc Event FY68 (đệm 10 phút) */
function ehSpeakers_(force){
  var c = CacheService.getScriptCache(), hit = !force && c.get('eh_spk');
  if (hit){ try { return JSON.parse(hit); } catch(e){} }
  var out = [];
  try { var it = DriveApp.getFolderById(EH.ROOT).getFolders();
    while (it.hasNext()){ var f = it.next(), n = f.getName(); if (EH_DIR.DR_RE.test(n)) out.push({ id: f.getId(), name: n }); } } catch(e){}
  out.sort(function(a, b){ return a.name.localeCompare(b.name); });
  try { c.put('eh_spk', JSON.stringify(out), 600); } catch(e){}
  return out;
}
/* file mẫu Plan: riêng theo loại (EH_PLAN_TPL_EXHIBITION / _SEMINAR / _WORKSHOP) ⇒ chung EH_PLAN_TPL */
function ehPlanTpl_(type){
  var pr = PropertiesService.getScriptProperties(), k = type ? ehFormKeyOf_(type) : '';
  return (k && pr.getProperty('EH_PLAN_TPL_' + k)) || pr.getProperty('EH_PLAN_TPL') || '';
}

function ehFoldersApi_(p){
  var ss = ehBook_(), me = ehMe_(p, ss); if (me.err && String(p.key || '') !== ehKey_()) return { ok:false, code:'AUTH', error: me.err };
  var op = String(p.op || ''), boss = me.manager || String(p.key || '') === ehKey_();
  if (op === 'tpl' || op === 'tplmake'){
    if (!boss) return { ok:false, code:'PERM', error:'Chỉ quản lý được đặt file mẫu.' };
    var m = /[-\w]{25,}/.exec(String(p.id || '')); if (!m) return { ok:false, error:'Dán link file Google Sheet.' };
    var f; try { f = DriveApp.getFileById(m[0]); } catch(e){ return { ok:false, error:'Không mở được file.' }; }
    var kind = /^(EXHIBITION|SEMINAR|WORKSHOP)$/.test(String(p.kind || '')) ? '_' + p.kind : '';
    if (op === 'tplmake'){   /* chép 1 file kế hoạch có sẵn thành file MẪU (tên không bắt đầu bằng ngày ⇒ đồng bộ bỏ qua) — người dùng xoá nội dung cũ 1 lần, giữ bố cục */
      var dir = DriveApp.getFolderById(EH.ROOT), it = dir.getFoldersByName('_MẪU file kế hoạch'), md = it.hasNext() ? it.next() : dir.createFolder('_MẪU file kế hoạch');
      f = f.makeCopy('MẪU · File kế hoạch sự kiện' + (kind ? ' · ' + kind.slice(1) : '') + ' (xoá nội dung cũ, giữ bố cục)', md);
    }
    PropertiesService.getScriptProperties().setProperty('EH_PLAN_TPL' + kind, f.getId());
    return { ok:true, tpl: { id: f.getId(), name: f.getName(), url: f.getUrl(), kind: kind.slice(1) } };
  }
  var tid = ehPlanTpl_(), tpl = null;
  if (tid){ try { var tf = DriveApp.getFileById(tid); tpl = { id: tid, name: tf.getName(), url: tf.getUrl() }; } catch(e){ tpl = { id: tid, error: 'không mở được' }; } }
  return { ok:true, root: 'https://drive.google.com/drive/folders/' + EH.ROOT, online: ehDirOnlineUrl_(), speakers: ehSpeakers_(String(p.force || '') === '1'), tpl: tpl, sub: EH_DIR.SUB };
}

/* tên folder / file tổng: "yyyymmdd[-dd] <Tên>_<Loại>" (ehNameMeta_ đọc lại được ngày + loại) */
function ehEvDirName_(ev){
  var s = ehS_(ev.start).replace(/-/g, ''), e = ehS_(ev.end).replace(/-/g, ''), d = s;
  if (e && e !== s) d += '-' + (e.slice(0, 6) === s.slice(0, 6) ? e.slice(6) : e.slice(4));
  var nm = ehS_(ev.name).replace(/[\\\/:*?"<>|#]+/g, ' ').replace(/\s+/g, ' ').trim(), n = ehNorm_(nm);
  var tEn = { 'Triển lãm': 'Exhibition', 'Hội thảo': 'Seminar', 'Workshop': 'Workshop', 'Webinar': 'Webinar' }[ehS_(ev.type)] || '';
  var has = /exhibition|trien lam|booth|workshop|hands on|webinar|seminar|hoi thao|training|course/.test(n);
  return (d + ' ' + nm + (tEn && !has ? '_' + tEn : '')).slice(0, 150);
}

/* tạo folder + 4 folder con + file tổng cho sự kiện mới ⇒ ghi folderId / folderUrl / planFileId / planUrl vào ev (chưa lưu sheet) */
function ehMakeEvFolder_(ev, place){
  place = String(place || 'root');
  var parent = DriveApp.getFolderById(EH.ROOT), where = 'Event FY68';
  if (/^dr:/.test(place)){ try { parent = DriveApp.getFolderById(place.slice(3)); where = parent.getName(); } catch(e){ parent = DriveApp.getFolderById(EH.ROOT); } }
  else if (/^drnew:/.test(place)){
    var dn = place.slice(6).replace(/[\\\/:*?"<>|#]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (dn){ dn = EH_DIR.DR_RE.test(dn) ? dn.toUpperCase() : 'DR. ' + dn.toUpperCase();
      var ex = parent.getFoldersByName(dn); parent = ex.hasNext() ? ex.next() : parent.createFolder(dn); where = dn;
      try { CacheService.getScriptCache().remove('eh_spk'); } catch(e){} }
  }
  var name = ehEvDirName_(ev), it = parent.getFoldersByName(name), fo = it.hasNext() ? it.next() : parent.createFolder(name), subs = {};
  EH_DIR.SUB.forEach(function(s){ var x = fo.getFoldersByName(s); subs[s] = x.hasNext() ? x.next() : fo.createFolder(s); });
  ev.folderId = fo.getId(); ev.folderUrl = fo.getUrl();
  var note = '';
  var tid = ehPlanTpl_(ev.type);
  if (tid){
    try { var cp = DriveApp.getFileById(tid).makeCopy(name, subs['Plan']); ev.planFileId = cp.getId(); ev.planUrl = cp.getUrl(); }
    catch(e){ note = 'Chưa chép được file mẫu: ' + String(e.message || e).slice(0, 120); }
  } else note = 'Chưa đặt file Google Sheet mẫu (Cài đặt ▸ File mẫu) — folder Plan đang trống.';
  return { folder: fo.getUrl(), where: where, plan: ev.planUrl || '', note: note };
}

/* folder thật của sự kiện (không tạo mới): folderId (trừ folder cũ trong "Event Hub · Tệp tải lên") ⇒ cha của file kế hoạch ⇒ cột folder ở MKT Offline */
function ehEvDirOf_(ev){
  var up = PropertiesService.getScriptProperties().getProperty('EH_FILES') || '-';
  var inUp = function(f){ try { var ps = f.getParents(); return ps.hasNext() && ps.next().getId() === up; } catch(e){ return false; } };
  if (ehS_(ev.folderId)){ try { var f0 = DriveApp.getFolderById(ev.folderId); if (!inUp(f0)) return f0; } catch(e){} }
  if (ehS_(ev.planFileId)){
    try { var ps = DriveApp.getFileById(ev.planFileId).getParents(); if (ps.hasNext()){ var p = ps.next();
      if (/^plan$/i.test(p.getName().trim())){ var gp = p.getParents(); if (gp.hasNext()) return gp.next(); }
      if (p.getId() !== EH.ROOT && !EH_DIR.DR_RE.test(p.getName())) return p; } } catch(e){}
  }
  try { var L = ehLinkGet_(ehBook_())[ehS_(ev.id)], u = L && L.off && L.off.folderUrl, m = u && /folders\/([-\w]{20,})/.exec(u);
    if (m) return DriveApp.getFolderById(m[1]); } catch(e){}
  return null;
}
/* folder con để lưu 1 file tải lên: ảnh của việc "Trong sự kiện" ⇒ Media, khảo sát ⇒ Survey, còn lại ⇒ Event Access */
function ehEvSubFor_(fo, tk, mime){
  var ph = ehS_(tk && (tk.phase || tk.group)), t = ehNorm_(tk && tk.title);
  var nm = /^image\/|^video\//.test(String(mime || '')) && /^ii\b|trong/i.test(ehNorm_(ph)) ? 'Media' : /khao sat|survey/.test(t) ? 'Survey' : 'Event Access';
  var cands = [nm, nm.toLowerCase(), nm.replace(/ (\w)/, function(a, b){ return ' ' + b.toLowerCase(); })];
  for (var i = 0; i < cands.length; i++){ var it = fo.getFoldersByName(cands[i]); if (it.hasNext()) return it.next(); }
  return fo.createFolder(nm);
}
