/* ════════════════════════════════════════════════════════════════════════════════════════
   MMH_SalesTasks.gs — v1.0 (10/10/2026) · GIỐNG HỆT NHAU ở crm-dental · crm-surgical · crm-eyeless
   "AI VỀ NHÀ ĐẤY": Công việc khác (việc chung, không phải đi địa bàn) của Sales nhóm này lưu ở sheet
   "ALL TASK" trong CHÍNH file CRM của nhóm — không ghi vào file MKT (Report Hub ▸ WEEKYLY new) nữa.
   · Bố cục giống ALL TASK của CRM Thái / WEEKYLY new: header hàng 5, dữ liệu từ hàng 7, Key task ▸ Sub task.
   · API giống Report Hub (weekly · addKey · addSub · updateKey · updateSub · updateProgress · updateStatus ·
     deleteKey · deleteSub) — chỉ nhận khi app gửi kèm at=1 (để không trùng tên action cũ của CRM, vd. boot).
   · atImport: chuyển 1 lần các Công việc khác cũ của nhóm từ file MKT sang (chống trùng theo nội dung).
   · Báo cáo tuần / tháng vẫn tách riêng: đi địa bàn (6. WEEKLY REPORT) và Công việc khác (sheet này).
   ════════════════════════════════════════════════════════════════════════════════════════ */
var ST = { VER:'1.0', SHEET:'ALL TASK', HDR:5, DATA:7, W:21,
  HEAD:['No','FY','Month','Type','Key Task','Sub Task','PIC','Task result / Link','Start','Planned Deadline','Revised Deadline',
        'Leadtime','Status','% Progress','Actual finish','Behavior','Priority','Priority mail at','','Sync key','Sync meta'],
  ACTIONS:{ weekly:1, boot:1, addKey:1, addSub:1, updateKey:1, updateSub:1, updateProgress:1, updateStatus:1, deleteKey:1, deleteSub:1, atImport:1 } };

function stS_(v){ return v == null ? '' : String(v).trim(); }
function stTz_(){ try{ return Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh'; }catch(e){ return 'Asia/Ho_Chi_Minh'; } }
function stToday_(){ return Utilities.formatDate(new Date(), stTz_(), 'yyyy-MM-dd'); }
function stIso_(v){
  if(v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, stTz_(), 'yyyy-MM-dd');
  var s = stS_(v), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return m[0];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if(m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function stDate_(iso){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : ''; }
function stPct_(v){ if(v === '' || v == null) return 0; if(typeof v === 'number'){ var n = (v > 0 && v <= 1) ? Math.round(v * 100) : Math.round(v); return Math.max(0, Math.min(100, n)); }
  var m = /(-?\d+(?:\.\d+)?)/.exec(String(v)); if(!m) return 0; var x = parseFloat(m[1]); return Math.max(0, Math.min(100, Math.round(/%/.test(String(v)) || x > 1 ? x : x * 100))); }
function stNorm_(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim(); }
function stFy_(iso){ var m = /^(\d{4})-(\d{2})/.exec(iso || ''); if(!m) return ''; var y = +m[1], mo = +m[2]; return 'FY' + (y - (mo >= 9 ? 1958 : 1959)); }
function stYm_(iso){ return String(iso || '').replace(/-/g, '').slice(0, 6); }

function stSheet_(){
  var book = (typeof ss === 'function') ? ss() : SpreadsheetApp.getActiveSpreadsheet(), sh = book.getSheetByName(ST.SHEET);
  if(!sh){
    sh = book.insertSheet(ST.SHEET);
    sh.getRange(2, 2).setValue('CÔNG VIỆC KHÁC — ' + ((typeof reportTeamName_ === 'function') ? reportTeamName_() : 'Sales')).setFontWeight('bold').setFontSize(13);
    sh.getRange(3, 2).setValue('Việc chung của Sales (họp, hỗ trợ NPP, hồ sơ thầu, sự kiện…). Ghi từ MMH CRM; đi địa bàn vẫn ở tab 6. WEEKLY REPORT.').setFontColor('#5B6B7D');
    sh.getRange(ST.HDR, 2, 1, ST.W).setValues([ST.HEAD]).setFontWeight('bold').setBackground('#CFE2F3').setWrap(true);
    sh.setFrozenRows(ST.HDR);
    try{ sh.getRange(ST.DATA, 10, 500, 3).setNumberFormat('dd/mm/yyyy'); sh.getRange(ST.DATA, 15, 500, 1).setNumberFormat('0%'); }catch(e){}
  }
  return sh;
}
var _ST = null;
function stRead_(){
  if(_ST) return _ST;
  var sh = stSheet_(), last = sh.getLastRow(), keys = [], all = [];
  if(last >= ST.DATA){
    var v = sh.getRange(ST.DATA, 2, last - ST.DATA + 1, ST.W).getValues(), kn = 0, sn = 0, key = null;
    for(var i = 0; i < v.length; i++){
      var r = v[i], F = stS_(r[4]), G = stS_(r[5]), row = ST.DATA + i;
      if(!F && !G) continue;
      var o = { row:row, fy:stS_(r[1]), month:stS_(r[2]).replace(/\D/g, '').slice(0, 6), type:stS_(r[3]), keyTask:F, subTask:G,
        pic:stS_(r[6]), result:stS_(r[7]), start:stIso_(r[8]), planned:stIso_(r[9]), revised:stIso_(r[10]),
        leadtime:r[11] == null ? '' : String(r[11]), status:stS_(r[12]) || 'To Do', progress:stPct_(r[13]), actual:stIso_(r[14]),
        priority:(r[16] === true || String(r[16]).toLowerCase() === 'true' || r[16] === '⭐'), priorityMailAt:stIso_(r[17]), vSrc:'', vMeta:null };
      if(!o.fy && o.start) o.fy = stFy_(o.start);
      if(!o.month && o.start) o.month = stYm_(o.start);
      if(F){ kn++; sn = 0; o.no = String(kn); o.subs = []; key = o; keys.push(o); }
      else {
        sn++; o.no = (key ? key.no : '0') + '.' + sn; o.parentNo = key ? key.no : '0'; o.name = G;
        if(key){ if(!o.type) o.type = key.type; key.subs.push(o); }
        else { key = { row:0, no:'0', keyTask:'(Chưa có key task)', subs:[o], pic:o.pic, type:o.type, status:'', progress:0 }; keys.push(key); }
      }
      all.push(o);
    }
  }
  return (_ST = { keys:keys, all:all });
}
/* số No / FY / Month / Leadtime / Actual / Behavior tính bằng code (không cần công thức) */
function stRenumber_(){
  var sh = stSheet_(), last = sh.getLastRow(); if(last < ST.DATA) return;
  var n = last - ST.DATA + 1, v = sh.getRange(ST.DATA, 2, n, 16).getValues(), kn = 0, sn = 0, out = [], today = stToday_();
  v.forEach(function(r){
    var F = stS_(r[4]), G = stS_(r[5]), no = '';
    if(F){ kn++; sn = 0; no = String(kn); } else if(G){ sn++; no = kn + '.' + sn; }
    var st = stIso_(r[8]), pl = stIso_(r[9]), rv = stIso_(r[10]), dl = rv || pl, done = /complet/i.test(stS_(r[12]));
    var lead = (st && dl) ? Math.round((stDate_(dl) - stDate_(st)) / 86400000) : '';
    var beh = done ? ((rv && pl && rv > pl) ? 'Late' : 'On Time') : ((dl && dl < today && !/cancel/i.test(stS_(r[12]))) ? 'Overdue' : '');
    out.push((F || G) ? [no, st ? stFy_(st) : '', st ? +stYm_(st) : '', r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], lead, r[12], r[13], done && dl ? stDate_(dl) : '', beh]
                      : r.map(function(){ return ''; }));
  });
  sh.getRange(ST.DATA, 2, n, 16).setValues(out);
}
function stFind_(no){ no = String(no || '').replace(/\.0$/, ''); return stRead_().all.filter(function(x){ return x.no === no; })[0] || null; }
function stKeyEnd_(key){ var s = key.subs || []; return s.length ? s[s.length - 1].row : key.row; }
function stLastRow_(){ var a = stRead_().all; return a.length ? a[a.length - 1].row : ST.DATA - 1; }
function stWrite_(row, o){
  var sh = stSheet_(), put = function(c, v){ if(v !== undefined) sh.getRange(row, c).setValue(v); };
  put(5, o.type); put(6, o.keyTask); put(7, o.subTask); put(8, o.pic); put(9, o.result);
  put(10, o.start === undefined ? undefined : (stDate_(stIso_(o.start)) || ''));
  put(11, o.planned === undefined ? undefined : (stDate_(stIso_(o.planned)) || ''));
  put(12, o.revised === undefined ? undefined : (stDate_(stIso_(o.revised)) || ''));
  put(14, o.status); put(15, o.progress === undefined ? undefined : Math.max(0, Math.min(100, Number(o.progress) || 0)) / 100);
}
function stFix_(st, pg){
  st = stS_(st); pg = (pg === undefined || pg === '' || pg === null) ? undefined : Number(pg) || 0;
  if(/complet/i.test(st)) pg = 100; else if(/cancel|to\s*do/i.test(st) && pg === undefined) pg = 0;
  if(!st && pg !== undefined) st = pg >= 100 ? 'Completed' : pg > 0 ? 'In Progress' : 'To Do';
  return { status:st || undefined, progress:pg };
}
function stMe_(p){ try{ return whoAmI({ pic:stS_(p.actor) || stS_(p.pic) }); }catch(e){ return { pic:stS_(p.actor || p.pic), role:'pic' }; } }
function stCanEdit_(me, pic){
  if(!stS_(pic) || stNorm_(pic) === stNorm_(me.pic)) return true;
  if(me.role === 'manager' || /lead|director|hod/i.test(String(me.level || '') + ' ' + String(me.title || ''))) return true;
  throw new Error('Chỉ ' + pic + ' (hoặc quản lý) được sửa việc này.');
}
function stLock_(){ var l = LockService.getScriptLock(); if(!l.tryLock(25000)) throw new Error('Hệ thống đang bận, thử lại sau vài giây.'); return l; }
function stLog_(me, act, target, detail, row){ try{ if(typeof logAct === 'function') logAct(me, act, 'alltask', target, detail, row); }catch(e){} }
function stResp_(msg, row){ _ST = null; var t = row ? stRead_().all.filter(function(x){ return x.row === row; })[0] : null;
  return { ok:true, message:msg, no:t ? t.no : '', row:row || 0, task:t, keyTasks:stRead_().keys, source:'crm' }; }
function stRollup_(keyNo){
  try{
    _ST = null; var k = stFind_(String(keyNo || '').split('.')[0]);
    if(!k || !k.subs || !k.row) return null;
    var list = k.subs.filter(function(x){ return !/cancel/i.test(x.status); }); if(!list.length) return null;
    var pc = list.map(function(x){ var v = /complet/i.test(x.status) ? 100 : x.progress; if(/progress/i.test(x.status) && v < 25) v = 25; return v; });
    var allDone = list.every(function(x){ return /complet/i.test(x.status); });
    var avg = allDone ? 100 : Math.round(pc.reduce(function(a, b){ return a + b; }, 0) / pc.length);
    var o = { status:allDone ? 'Completed' : avg > 0 ? 'In Progress' : 'To Do', progress:avg };
    if(allDone && !/complet/i.test(k.status) && !k.revised) o.revised = stToday_();
    stWrite_(k.row, o); _ST = null; return true;
  }catch(e){ return null; }
}
function stAddKey_(me, p){
  var name = stS_(p.keyTask); if(!name) throw new Error('Thiếu tên Key task');
  var L = stLock_(), row;
  try{
    var sh = stSheet_(); row = stLastRow_() + 1;
    if(row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);
    var f = stFix_(p.status || 'To Do', p.progress);
    stWrite_(row, { type:p.type || '', keyTask:name, subTask:'', pic:p.pic || me.pic, result:p.result || '', start:p.start || stToday_(),
      planned:p.planned || '', revised:'', status:f.status || 'To Do', progress:f.progress || 0 });
    stRenumber_(); SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  stLog_(me, 'add', name, 'Key task', row);
  return stResp_('Đã thêm Key task vào sheet ALL TASK', row);
}
function stAddSub_(me, p){
  var name = stS_(p.name || p.subTask); if(!name) throw new Error('Thiếu tên Sub task');
  var L = stLock_(), row;
  try{
    var key = stFind_(p.parentNo);
    if(!key || !key.subs) throw new Error('Không tìm thấy Key task ' + p.parentNo + ' — tải lại rồi thử lại.');
    var sh = stSheet_(), after = stKeyEnd_(key);
    sh.insertRowsAfter(after, 1); row = after + 1;
    sh.getRange(row, 2, 1, ST.W).clearContent();
    var f = stFix_(p.status || 'To Do', p.progress);
    stWrite_(row, { type:'', keyTask:'', subTask:name, pic:p.pic || me.pic, result:p.result || '', start:p.start || stToday_(),
      planned:p.planned || '', revised:'', status:f.status || 'To Do', progress:f.progress || 0 });
    stRenumber_(); SpreadsheetApp.flush(); _ST = null;
    stRollup_(key.no); stRenumber_();
  } finally { L.releaseLock(); }
  stLog_(me, 'add', name, 'Sub task của key ' + p.parentNo, row);
  return stResp_('Đã thêm Sub task vào sheet ALL TASK', row);
}
function stUpdate_(me, p, isKey){
  var L = stLock_(), t;
  try{
    t = stFind_(p.no); if(!t) throw new Error('Không tìm thấy task ' + p.no + ' — tải lại rồi thử lại.');
    stCanEdit_(me, t.pic);
    var o = {};
    if(isKey && p.keyTask !== undefined) o.keyTask = stS_(p.keyTask);
    if(!isKey && p.name !== undefined) o.subTask = stS_(p.name);
    ['type','pic','result','start','planned','revised'].forEach(function(f){ if(p[f] !== undefined && !(f === 'type' && !isKey)) o[f] = p[f]; });
    var f = stFix_(p.status, p.progress);
    if(f.status !== undefined) o.status = f.status;
    if(f.progress !== undefined) o.progress = f.progress;
    if(o.status && /complet/i.test(o.status) && !/complet/i.test(t.status) && p.revised === undefined) o.revised = stToday_();
    stWrite_(t.row, o); SpreadsheetApp.flush();
    if(!t.subs && t.parentNo) stRollup_(t.parentNo);
    stRenumber_();
  } finally { L.releaseLock(); }
  stLog_(me, 'update', t.keyTask || t.subTask, (p.status || '') + (p.progress !== undefined ? ' · ' + p.progress + '%' : ''), t.row);
  return stResp_('Đã cập nhật task trong sheet ALL TASK', t.row);
}
function stDelete_(me, p, isKey){
  var L = stLock_(), t;
  try{
    t = stFind_(p.no); if(!t) throw new Error('Không tìm thấy task ' + p.no + ' — tải lại rồi thử lại.');
    stCanEdit_(me, t.pic);
    var sh = stSheet_();
    if(isKey && t.subs){ sh.deleteRows(t.row, stKeyEnd_(t) - t.row + 1); }
    else { sh.deleteRow(t.row); _ST = null; if(t.parentNo) stRollup_(t.parentNo); }
    _ST = null; stRenumber_(); SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  stLog_(me, 'delete', t.keyTask || t.subTask, isKey ? 'Key task' : 'Sub task', t.row);
  return stResp_('Đã xoá khỏi sheet ALL TASK', 0);
}
/* chuyển 1 lần: p.keys = [{ keyTask, type, pic, result, start, planned, revised, status, progress, subs:[{ name, pic, … }] }]
   — key trùng (tên + PIC + ngày bắt đầu) thì chỉ thêm các sub chưa có ⇒ gửi lại nhiều lần không sinh dòng trùng */
function stImport_(me, p){
  var keys = p.keys; if(typeof keys === 'string'){ try{ keys = JSON.parse(keys); }catch(e){ keys = null; } }
  if(!Array.isArray(keys)) throw new Error('Thiếu dữ liệu chuyển');
  var L = stLock_(), addK = 0, addS = 0, sh = stSheet_();
  var sig = function(name, pic, start){ return stNorm_(name) + '|' + stNorm_(pic) + '|' + stIso_(start); };
  try{
    keys.forEach(function(k){
      _ST = null;
      var cur = stRead_().keys.filter(function(x){ return x.row && sig(x.keyTask, x.pic, x.start) === sig(k.keyTask, k.pic, k.start); })[0];
      var rows = [];
      if(!cur){
        rows.push([ '', '', '', stS_(k.type), stS_(k.keyTask), '', stS_(k.pic), stS_(k.result), stDate_(stIso_(k.start)) || '', stDate_(stIso_(k.planned)) || '',
                    stDate_(stIso_(k.revised)) || '', '', stS_(k.status) || 'To Do', stPct_(k.progress) / 100 ]);
        addK++;
      }
      var have = {}; ((cur && cur.subs) || []).forEach(function(s){ have[sig(s.subTask, s.pic, s.start)] = 1; });
      (k.subs || []).forEach(function(s){
        var nm = stS_(s.name || s.subTask); if(!nm || have[sig(nm, s.pic, s.start)]) return;
        rows.push([ '', '', '', '', '', nm, stS_(s.pic), stS_(s.result), stDate_(stIso_(s.start)) || '', stDate_(stIso_(s.planned)) || '',
                    stDate_(stIso_(s.revised)) || '', '', stS_(s.status) || 'To Do', stPct_(s.progress) / 100 ]);
        addS++;
      });
      if(!rows.length) return;
      var at = cur ? stKeyEnd_(cur) + 1 : stLastRow_() + 1;
      if(cur) sh.insertRowsAfter(at - 1, rows.length);
      else if(at + rows.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 20);
      sh.getRange(at, 2, rows.length, 14).setValues(rows);
    });
    _ST = null; stRenumber_(); SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  stLog_(me, 'import', 'Công việc khác', addK + ' key · ' + addS + ' sub (từ file MKT)', 0);
  var r = stResp_('Đã chuyển ' + addK + ' key task · ' + addS + ' sub task sang sheet ALL TASK', 0); r.addedKeys = addK; r.addedSubs = addS;
  return r;
}
/* router — chỉ chạy khi app gửi at=1; trả null nếu không phải việc của module này */
function stRoute_(action, p){
  if(stS_(p.at) !== '1' || !ST.ACTIONS[action]) return null;
  var me = stMe_(p);
  try{
    switch(action){
      case 'weekly': case 'boot': return { ok:true, keyTasks:stRead_().keys, source:'crm', statusOptions:['To Do','In Progress','Completed','Cancelled'] };
      case 'addKey': return stAddKey_(me, p);
      case 'addSub': return stAddSub_(me, p);
      case 'updateKey': return stUpdate_(me, p, true);
      case 'updateSub': return stUpdate_(me, p, false);
      case 'updateProgress': case 'updateStatus': return stUpdate_(me, { no:p.no, status:p.status, progress:p.progress, actor:p.actor, pic:p.pic }, !!(stFind_(p.no) || {}).subs);
      case 'deleteKey': return stDelete_(me, p, true);
      case 'deleteSub': return stDelete_(me, p, false);
      case 'atImport': return stImport_(me, p);
    }
  }catch(e){ return { ok:false, error:String(e && e.message || e) }; }
  return null;
}
