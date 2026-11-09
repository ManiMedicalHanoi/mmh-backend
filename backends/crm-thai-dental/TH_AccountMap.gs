/*************************************************************************************************
 * TH_AccountMap.gs — v1.2 (09/11/2026 · v1.1 district from the address · v1.2 one spelling per district) · CRM Thailand Dental — Account tracking + Thailand map (user request)
 *
 * Sheet "ACCOUNT TRACKING" (English, visible, 1 row per account of CUSTOMER CODE, filled automatically):
 *   A Code · B Account name · C Account type · D Province · E District · F Distributor · G Distributor sales rep ·
 *   H Latitude · I Longitude · J Location source · K Updated · L Updated by
 *   · District: taken once from the note of CUSTOMER CODE ("District: …", the old Customer list column) — then edited in the app / sheet.
 *   · Distributor / Distributor sales rep: chosen in the app (Yong: territory of the 3 distributors and their sales reps).
 *   · Latitude / Longitude: the map of the app finds them (OpenStreetMap hospitals / dental clinics, then address search) ⇒ "osm" / "search";
 *     a pin moved by hand ⇒ "pin" (never overwritten by the automatic search); province centre ⇒ "province" (approximate).
 * Actions: acctList (read) · acctSave (write 1 account) · acctGeo (write found locations, batch, never over "pin").
 *************************************************************************************************/
var ACM = {
  SH: 'ACCOUNT TRACKING', HDR: 1, DATA: 2,
  COLS: ['Code', 'Account name', 'Account type', 'Province', 'District', 'Distributor', 'Distributor sales rep',
         'Latitude', 'Longitude', 'Location source', 'Updated', 'Updated by'],
  F: ['code', 'name', 'type', 'province', 'district', 'dist', 'dsr', 'lat', 'lng', 'src', 'at', 'by'],
  DISTRIBUTORS: ['DDI', 'Promptdent', 'VRP', 'Siamdent']
};
function acmSheet_(){
  var book = ss_(), s = book.getSheetByName(ACM.SH);
  if(!s){
    s = book.insertSheet(ACM.SH);
    s.getRange(1, 1, 1, ACM.COLS.length).setValues([ACM.COLS]).setFontWeight('bold').setBackground('#003047').setFontColor('#FFFFFF').setWrap(true);
    s.setFrozenRows(1); s.setFrozenColumns(2);
    [90, 260, 110, 130, 140, 120, 170, 90, 90, 110, 130, 100].forEach(function(w, i){ try{ s.setColumnWidth(i + 1, w); }catch(e){} });
    try{ s.getRange(1, 5).setNote('District of the account (Bangkok: the distributor splits the territory by district).'); }catch(e){}
    try{ s.getRange(1, 7).setNote('Sales rep of the distributor who covers this account.'); }catch(e){}
    try{ s.getRange(1, 10).setNote('pin = placed by hand · osm = OpenStreetMap hospital / clinic · search = address search · province = province centre (approximate).'); }catch(e){}
    try{ s.getRange(2, 6, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ACM.DISTRIBUTORS, true).setAllowInvalid(true).build()); }catch(e){}
  }
  return s;
}
function acmDistrictOf_(note){ var m = /District\s*:\s*([^·\n]+)/i.exec(String(note || '')); return m ? acmDisClean_(m[1]) : ''; }
/* v1.2 — one spelling per district: no house number, no "District" / "Amphoe" / "Khet", Muang ⇒ Mueang (filters of the app group by this text) */
function acmDisClean_(d){ return String(d || '').replace(/^[\s\d\/,.-]+/, '').replace(/\s+(district|amphoe)\s*$/i, '').replace(/^(khet|amphoe|amphur)\s+/i, '').replace(/^Muang\b/i, 'Mueang').replace(/\s+/g, ' ').trim(); }
/* v1.1 — district from the address: Bangkok = one of the 50 khet (comma part of the address), elsewhere "… District" / "Amphoe …" */
var ACM_BKK = ['Phra Nakhon','Dusit','Nong Chok','Bang Rak','Bang Khen','Bang Kapi','Pathum Wan','Pom Prap Sattru Phai','Phra Khanong','Min Buri',
  'Lat Krabang','Yan Nawa','Samphanthawong','Phaya Thai','Thon Buri','Bangkok Yai','Huai Khwang','Khlong San','Taling Chan','Bangkok Noi',
  'Bang Khun Thian','Phasi Charoen','Nong Khaem','Rat Burana','Bang Phlat','Din Daeng','Bueng Kum','Sathon','Bang Sue','Chatuchak',
  'Bang Kho Laem','Prawet','Khlong Toei','Suan Luang','Chom Thong','Don Mueang','Ratchathewi','Lat Phrao','Watthana','Bang Khae',
  'Lak Si','Sai Mai','Khan Na Yao','Saphan Sung','Wang Thonglang','Khlong Sam Wa','Bang Na','Thawi Watthana','Thung Khru','Bang Bon'];
function acmSk_(s){ return String(s || '').toLowerCase().replace(/\b(khet|district|amphoe|amphur|เขต)\b/g, '').replace(/[^a-z]/g, '')
  .replace(/h/g, '').replace(/y/g, 'i').replace(/rn/g, 'n').replace(/(.)\1+/g, '$1').replace(/^k(?=[lr])/, 'k'); }
var ACM_BKK_SK = null;
function acmDistrictAddr_(addr, prov){
  addr = String(addr || ''); if(!addr) return '';
  if(/^(bkk|bangkok|krung ?thep)/i.test(String(prov || '').trim()) || /bangkok|กรุงเทพ/i.test(addr)){
    if(!ACM_BKK_SK){ ACM_BKK_SK = {}; ACM_BKK.forEach(function(d){ ACM_BKK_SK[acmSk_(d)] = d; }); }
    var parts = addr.split(/[,\n]/);
    for(var i = parts.length - 1; i >= 0; i--){ var hit = ACM_BKK_SK[acmSk_(parts[i])]; if(hit) return hit; }
  }
  var m = /([^,\n]+?)\s+District\b/i.exec(addr) || /\bAmphoe\s+([^,\n]+)/i.exec(addr);
  return m ? acmDisClean_(m[1]) : '';
}
function acmRead_(s){
  var last = s.getLastRow(), out = [];
  if(last < ACM.DATA) return out;
  s.getRange(ACM.DATA, 1, last - ACM.DATA + 1, ACM.F.length).getValues().forEach(function(r, i){
    var o = { _row: ACM.DATA + i }; ACM.F.forEach(function(f, j){ o[f] = r[j] instanceof Date ? Utilities.formatDate(r[j], tz_(), 'yyyy-MM-dd HH:mm') : r[j]; });
    if(str_(o.code) || str_(o.name)) out.push(o);
  });
  return out;
}
/* one row per account of CUSTOMER CODE (new accounts appended, name / type / province refreshed, district from the note once) */
function acmSync_(){
  var s = acmSheet_(), have = acmRead_(s), byCode = {}, byName = {};
  have.forEach(function(r){ if(str_(r.code)) byCode[str_(r.code)] = r; byName[picKey_(r.name) + '|' + picKey_(r.province)] = r; });
  var cust = readTab_('customer'), add = [], upd = 0;
  cust.forEach(function(c){
    var code = str_(c.code), name = str_(c.name); if(!name) return;
    var r = (code && byCode[code]) || byName[picKey_(name) + '|' + picKey_(c.province)];
    if(!r){ add.push([code, name, str_(c.type), str_(c.province), acmDistrictOf_(c.note) || acmDistrictAddr_(c.address, c.province), '', '', '', '', '', '', '']); return; }
    var want = [code || str_(r.code), name, str_(c.type), str_(c.province)];
    if(want[0] !== str_(r.code) || want[1] !== str_(r.name) || want[2] !== str_(r.type) || want[3] !== str_(r.province)){
      s.getRange(r._row, 1, 1, 4).setValues([want]); upd++;
    }
    if(str_(r.district) && !str_(r.at) && acmDisClean_(r.district) !== str_(r.district)){ s.getRange(r._row, 5).setValue(acmDisClean_(r.district)); upd++; }   /* not edited yet ⇒ same spelling */
    if(!str_(r.district)){ var d = acmDistrictOf_(c.note) || acmDistrictAddr_(c.address, c.province); if(d){ s.getRange(r._row, 5).setValue(d); upd++; } }
  });
  if(add.length){
    var row = Math.max(s.getLastRow(), ACM.HDR) + 1;
    if(row + add.length > s.getMaxRows()) s.insertRowsAfter(s.getMaxRows(), row + add.length - s.getMaxRows() + 20);
    s.getRange(row, 1, add.length, ACM.F.length).setValues(add);
  }
  return { added: add.length, updated: upd };
}
function acmList(user, p){
  var c = CacheService.getScriptCache(), ck = 'acm_sync';
  if(!c.get(ck) || p.force){
    var L = lock_();
    try{ acmSync_(); } finally { L.releaseLock(); }
    try{ c.put(ck, '1', 600); }catch(e){}
  }
  var rows = acmRead_(acmSheet_());
  return { ok: true, cols: ACM.F, rows: rows.map(function(r){ return ACM.F.map(function(f){ return r[f] === undefined ? '' : r[f]; }).concat([r._row]); }),
           distributors: ACM.DISTRIBUTORS, sheet: ss_().getUrl() + '#gid=' + acmSheet_().getSheetId() };
}
function acmFind_(s, code, name){
  var rows = acmRead_(s);
  return rows.filter(function(r){ return code && str_(r.code) === code; })[0] || rows.filter(function(r){ return name && picKey_(r.name) === picKey_(name); })[0] || null;
}
function acmNum_(v){ var n = parseFloat(v); return isFinite(n) ? Math.round(n * 1e6) / 1e6 : ''; }
/* acctSave: {code | name} + any of district · dist · dsr · lat · lng (+ src: pin | clear) */
function acmSave(user, p){
  var code = str_(p.code), name = str_(p.name);
  if(!code && !name) return { ok: false, error: 'Missing account.' };
  var L = lock_();
  try{
    var s = acmSheet_(), r = acmFind_(s, code, name);
    if(!r){ acmSync_(); r = acmFind_(s, code, name); }
    if(!r) return { ok: false, error: 'Account not found in CUSTOMER CODE.' };
    var set = function(f, v){ s.getRange(r._row, ACM.F.indexOf(f) + 1).setValue(v); };
    ['district', 'dist', 'dsr'].forEach(function(f){ if(p[f] !== undefined) set(f, f === 'district' ? acmDisClean_(p[f]) : str_(p[f])); });
    if(str_(p.src) === 'clear'){ set('lat', ''); set('lng', ''); set('src', ''); }
    else if(p.lat !== undefined && p.lng !== undefined && acmNum_(p.lat) !== '' && acmNum_(p.lng) !== ''){
      set('lat', acmNum_(p.lat)); set('lng', acmNum_(p.lng)); set('src', str_(p.src) || 'pin');
    }
    set('at', new Date()); set('by', str_(user && user.pic));
    SpreadsheetApp.flush();
    try{ log_(user.pic, 'update', 'ACCOUNT TRACKING', r.name, ['district', 'dist', 'dsr', 'lat'].filter(function(f){ return p[f] !== undefined; }).join(', '), r._row); }catch(e){}
    return { ok: true, row: acmRead_(s).filter(function(x){ return x._row === r._row; }).map(function(x){ return ACM.F.map(function(f){ return x[f]; }).concat([x._row]); })[0] };
  } finally { L.releaseLock(); }
}
/* acctGeo: items [{code, name, lat, lng, src}] found by the map — rows with a hand-placed pin are kept */
function acmGeo(user, p){
  var items = p.items; if(typeof items === 'string'){ try{ items = JSON.parse(items); }catch(e){ items = []; } }
  if(!Array.isArray(items) || !items.length) return { ok: true, saved: 0 };
  var L = lock_(), n = 0;
  try{
    var s = acmSheet_(), rows = acmRead_(s), byCode = {}, byName = {};
    rows.forEach(function(r){ if(str_(r.code)) byCode[str_(r.code)] = r; byName[picKey_(r.name)] = r; });
    items.slice(0, 300).forEach(function(it){
      var r = byCode[str_(it.code)] || byName[picKey_(it.name)]; if(!r) return;
      var src = str_(it.src) || 'search'; if(src === 'pin') return;
      if(str_(r.src) === 'pin') return;
      var lat = acmNum_(it.lat), lng = acmNum_(it.lng); if(lat === '' || lng === '') return;
      if(lat < 5 || lat > 21 || lng < 97 || lng > 106) return;                 /* Thailand only */
      s.getRange(r._row, 8, 1, 5).setValues([[lat, lng, src, new Date(), str_(user && user.pic) || 'map']]); n++;
    });
    SpreadsheetApp.flush();
  } finally { L.releaseLock(); }
  return { ok: true, saved: n };
}
function acmRoute_(a, user, p){
  try{
    if(a === 'acctList') return acmList(user, p);
    if(a === 'acctSave') return acmSave(user, p);
    if(a === 'acctGeo') return acmGeo(user, p);
  }catch(e){ return { ok: false, error: String(e && e.message || e) }; }
  return null;
}
