/* MMH_VisitDup.gs — v1.0 (27/11/2026)
   Chẩn đoán CHỈ ĐỌC: báo cáo đi địa bàn (tab 6. WEEKLY REPORT) bị lặp / trùng tại một số khách hàng.
   GET action=fuDupDiag key=<8 ký tự cuối ID Sheet> q=<regex trên tên account đã bỏ dấu, vd. buudien|giaothong> [pic=<tên>] [op=dup|list] [off] [n]
   - op=dup (mặc định): tóm tắt số dòng theo account + các nhóm trùng:
       same  = cùng account · cùng ngày bắt đầu · cùng Type action (dòng nhân đôi)
       res   = cùng nội dung Task Result (sau khi bỏ dấu / khoảng trắng, ≥ 20 ký tự) ở nhiều dòng
       near  = Task Result gần giống (≥ 85% từ chung) ở 2 dòng khác ngày
       plan  = cùng Plan ở nhiều dòng (khác ngày)
       photo = cùng 1 file ảnh Drive ở nhiều dòng
   - op=list: từng dòng (dòng sheet | No | start | finish | PIC | account | Type action | Status | ảnh | đầu Task Result), phân trang off / n.
   Không ghi gì vào Sheet (đọc rawValues, không qua readTab / wkHeal_). */
function fuDupDiag_(p){
  if(!(tfS_(p.key) && tfS_(p.key) === String(ssReal_().getId()).slice(-8))) return { ok:false, code:'AUTH', error:'Cần khoá file.' };
  var q = tfS_(p.q); if(!q) return { ok:false, error:'Thiếu q (tên khách hàng).' };
  var re = new RegExp(q, 'i'), pic = normName_(p.pic), W = COL.weekly, V = rawValues('weekly');
  var tz = ss().getSpreadsheetTimeZone();
  var dv = function(v){ return v instanceof Date && !isNaN(v) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : S(v).slice(0, 10); };
  var nt = function(v){ return normName_(v); };
  var rows = [];
  for(var i = 0; i < V.length; i++){
    var r = V[i], acc = S(r[W.account - 1]);
    if(!acc || !re.test(nt(acc))) continue;
    if(pic && nt(r[W.pic - 1]).indexOf(pic) < 0) continue;
    var ph = String(r[W.photo - 1] || ''), ids = ph.match(/[-\w]{25,}/g) || [];
    rows.push({ row:DATA_ROW + i, no:S(r[W.no - 1]), st:dv(r[W.start - 1]), fin:dv(r[W.finish - 1]), pic:S(r[W.pic - 1]), acc:acc,
                act:S(r[W.typeAction - 1]), task:S(r[W.typeTask - 1]), status:S(r[W.status - 1]), plan:S(r[W.plan - 1]), res:S(r[W.result - 1]),
                fb:S(r[W.feedback - 1]), next:S(r[W.nextAction - 1]), ph:ids });
  }
  rows.sort(function(a, b){ return a.st < b.st ? -1 : a.st > b.st ? 1 : a.row - b.row; });
  var cut = function(s, n){ s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  var line = function(o, n){ return [o.row, o.no, o.st, o.fin, o.pic, cut(o.acc, 34), o.act, o.status, o.ph.length ? o.ph.map(function(x){ return x.slice(-6); }).join(',') : '-', cut(o.res, n || 90)].join(' | '); };
  var op = tfS_(p.op) || 'dup';
  if(op === 'list'){
    var off = parseInt(p.off, 10) || 0, n = Math.min(80, parseInt(p.n, 10) || 25), w = parseInt(p.w, 10) || 90;
    return { ok:true, n:rows.length, off:off, rows:rows.slice(off, off + n).map(function(o){ return line(o, w); }) };
  }
  if(op === 'row'){                                                                   /* đủ nội dung các dòng sheet `rows=1,2,3` */
    var want = tfS_(p.rows).split(',').map(function(x){ return parseInt(x, 10); });
    return { ok:true, rows:rows.filter(function(o){ return want.indexOf(o.row) >= 0; }).map(function(o){
      return { row:o.row, no:o.no, st:o.st, fin:o.fin, pic:o.pic, acc:o.acc, task:o.task, act:o.act, status:o.status, plan:cut(o.plan, 400), res:cut(o.res, 700), fb:cut(o.fb, 200), next:cut(o.next, 200), ph:o.ph.map(function(x){ return x.slice(-6); }) }; }) };
  }
  var byAcc = {}; rows.forEach(function(o){ var k = o.acc; byAcc[k] = byAcc[k] || { n:0, from:o.st, to:o.st, pics:{} }; var b = byAcc[k]; b.n++; if(o.st < b.from) b.from = o.st; if(o.st > b.to) b.to = o.st; b.pics[o.pic] = (b.pics[o.pic] || 0) + 1; });
  var grp = function(keyFn){ var m = {}; rows.forEach(function(o){ var k = keyFn(o); if(!k) return; (m[k] = m[k] || []).push(o); });
    return Object.keys(m).filter(function(k){ return m[k].length > 1; }).map(function(k){ return m[k]; }); };
  var accK = function(o){ return nt(o.acc); };
  var same = grp(function(o){ return o.st ? accK(o) + '|' + o.st + '|' + nt(o.act) : ''; });
  var res = grp(function(o){ var t = nt(o.res); return t.length >= 20 ? t : ''; });
  var plan = grp(function(o){ var t = nt(o.plan); return t.length >= 20 ? t : ''; }).filter(function(g){ return g.some(function(o){ return o.st !== g[0].st; }); });
  var pm = {}; rows.forEach(function(o){ o.ph.forEach(function(id){ (pm[id] = pm[id] || []).push(o); }); });
  var photo = Object.keys(pm).filter(function(id){ return pm[id].length > 1; }).map(function(id){ return pm[id]; });
  var words = function(s){ var o = {}; String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').split(/[^a-z0-9]+/).forEach(function(w){ if(w.length > 1) o[w] = 1; }); return o; };
  var near = [], W2 = rows.map(function(o){ return words(o.res); }), resSet = {};
  res.forEach(function(g){ g.forEach(function(o){ resSet[o.row] = 1; }); });
  for(var a = 0; a < rows.length; a++){
    var ka = Object.keys(W2[a]); if(ka.length < 8) continue;
    for(var b = a + 1; b < rows.length; b++){
      if(accK(rows[a]) !== accK(rows[b])) continue;
      var kb = Object.keys(W2[b]); if(kb.length < 8) continue;
      var c = 0; ka.forEach(function(w){ if(W2[b][w]) c++; });
      var sim = c / Math.max(ka.length, kb.length);
      if(sim >= 0.85 && !(resSet[rows[a].row] && resSet[rows[b].row] && nt(rows[a].res) === nt(rows[b].res))) near.push([Math.round(sim * 100), rows[a], rows[b]]);
    }
  }
  var fmt = function(L){ return L.slice(0, 15).map(function(g){ return g.map(function(o){ return line(o, 60); }); }); };
  return { ok:true, n:rows.length, acc:byAcc,
           same:fmt(same), res:fmt(res), plan:fmt(plan), photo:fmt(photo),
           near:near.slice(0, 15).map(function(x){ return [x[0] + '%', line(x[1], 60), line(x[2], 60)]; }),
           count:{ same:same.length, res:res.length, plan:plan.length, photo:photo.length, near:near.length } };
}
