/*************************************************************************************************
 * MMH — MKT_EventHubDiag.gs   (v1.0 · 17/11/2026) — RÀ SOÁT DRIVE cho app "Sự kiện MKT" (CHỈ ĐỌC)
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Người dùng: thông báo đối tác / NPP cần đọc file ghi nhận người đăng ký trước mỗi sự kiện ⇒ rà Drive xem có file nào.
 * action ehDriveDiag&key=<8 ký tự cuối EH.ROOT>&part=…   (gọi qua workflow Kiểm tra ▸ ping marketing?action=ehDriveDiag&…&full=1)
 *   part=tree  [&depth=3&off=0&n=80]   cây thư mục Event FY68: [cấp, loại, tên, ngày sửa]
 *   part=find  [&q=đăng ký|registration…&since=2025-09-01]   tìm theo tên trên mọi Drive tài khoản chạy script thấy được
 *   part=sheet &id=<ID file>            tab · số dòng / cột · dòng tiêu đề (đoán) — KHÔNG trả nội dung dữ liệu
 *   part=cust                           CUSTOMER LIST (file MKT Offline): tiêu đề + số đăng ký theo sự kiện + phân bố cột nguồn / NPP / ngày
 *   part=off                            REPORT_EVENT / PLAN_EVENT: tiêu đề + Partner / mục tiêu người tham dự theo sự kiện
 * Không trả họ tên / SĐT / email của khách. Không ghi gì.
 *************************************************************************************************/
function ehDriveDiag_(p){
  if (String(p.key || '') !== ehKey_()) return { ok:false, error:'Sai khoá' };
  var part = String(p.part || 'tree'), t0 = Date.now(), out = { ok:true, part:part };
  var cut = function(s, n){ s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  var mt = function(m){ m = String(m || ''); return /spreadsheet/.test(m) ? 'GS' : /google-apps.form/.test(m) ? 'FORM' : /wordprocessing/.test(m) ? 'DOCX' : /document/.test(m) ? 'DOC' : /presentation/.test(m) ? 'SLIDE' :
    /folder/.test(m) ? 'DIR' : /sheet|excel/.test(m) ? 'XLSX' : /pdf/.test(m) ? 'PDF' : /image/.test(m) ? 'IMG' : /video/.test(m) ? 'VID' : m.split('/').pop().slice(0, 8); };
  var ymd = function(d){ try { return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); } catch(e){ return ''; } };
  try {
    if (part === 'tree'){
      var maxD = Math.min(4, +p.depth || 3), rows = [], skipImg = String(p.img || '') !== '1';
      var walk = function(fo, d){
        if (Date.now() - t0 > 240000) { rows.push([d, '…', 'HẾT GIỜ']); return; }
        var it = fo.getFiles(), nImg = 0;
        while (it.hasNext()){ var f = it.next(), k = mt(f.getMimeType()); if (skipImg && (k === 'IMG' || k === 'VID')) { nImg++; continue; } rows.push([d, k, cut(f.getName(), 70), ymd(f.getLastUpdated()), f.getId().slice(-6)]); }
        if (nImg) rows.push([d, 'IMG', '(' + nImg + ' ảnh / video)']);
        var sub = fo.getFolders();
        while (sub.hasNext()){ var s = sub.next(); rows.push([d, 'DIR', cut(s.getName(), 70), ymd(s.getLastUpdated()), s.getId().slice(-6)]); if (d < maxD) walk(s, d + 1); }
      };
      walk(DriveApp.getFolderById(EH.ROOT), 0);
      var off = +p.off || 0, n = +p.n || 80;
      out.total = rows.length; out.rows = rows.slice(off, off + n).map(function(r){ return r.join('|'); });
    }
    else if (part === 'find'){
      var since = String(p.since || '2025-09-01'), qs = String(p.q || 'đăng ký|Đăng ký|dang ky|Dang ky|registration|Registration|tuyển sinh|attendee|Attendee|danh sách|Danh sách|Customer list|CUSTOMER LIST|participant|Participant').split('|');
      var seen = {}, hits = [];
      qs.forEach(function(q){
        try {
          var it = DriveApp.searchFiles('title contains "' + q.replace(/"/g, '') + '" and modifiedDate > "' + since + 'T00:00:00" and trashed = false'), c = 0;
          while (it.hasNext() && c < 60){ var f = it.next(); c++; if (seen[f.getId()]) continue; seen[f.getId()] = 1;
            var par = ''; try { var ps = f.getParents(); if (ps.hasNext()) par = ps.next().getName(); } catch(e){}
            hits.push([mt(f.getMimeType()), cut(f.getName(), 80), ymd(f.getLastUpdated()), cut(par, 40), f.getId()]); }
        } catch(e){ hits.push(['ERR', q, String(e.message || e).slice(0, 80)]); }
      });
      try { var fit = DriveApp.searchFiles('mimeType = "application/vnd.google-apps.form" and modifiedDate > "' + since + 'T00:00:00" and trashed = false'), c2 = 0;
        while (fit.hasNext() && c2 < 80){ var g = fit.next(); c2++; if (seen[g.getId()]) continue; seen[g.getId()] = 1;
          var par2 = ''; try { var ps2 = g.getParents(); if (ps2.hasNext()) par2 = ps2.next().getName(); } catch(e){}
          hits.push(['FORM', cut(g.getName(), 80), ymd(g.getLastUpdated()), cut(par2, 40), g.getId()]); } } catch(e){}
      hits.sort(function(a, b){ return String(b[2]).localeCompare(String(a[2])); });
      var off2 = +p.off || 0, n2 = +p.n || 60;
      out.total = hits.length; out.rows = hits.slice(off2, off2 + n2).map(function(r){ return r.join('|'); });
    }
    else if (part === 'dirs'){
      var dit = DriveApp.searchFolders('title contains "' + String(p.q || 'ĐĂNG KÝ').replace(/"/g, '') + '" and trashed = false'), dl = [];
      while (dit.hasNext() && dl.length < 40){ var fo = dit.next(), nf = 0, fit2 = fo.getFiles(), names = [];
        while (fit2.hasNext() && nf < 200){ var ff = fit2.next(); nf++; if (names.length < 12) names.push(mt(ff.getMimeType()) + ':' + cut(ff.getName(), 50) + ':' + ymd(ff.getLastUpdated())); }
        dl.push(cut(fo.getName(), 50) + ' · ' + ymd(fo.getLastUpdated()) + ' · ' + nf + ' file · ' + fo.getId() + ' ‖ ' + names.join(' ¦ ')); }
      out.rows = dl;
    }
    else if (part === 'docx'){
      var dq = DriveApp.searchFiles('title contains "' + String(p.q || '').replace(/"/g, '') + '" and trashed = false'), df = dq.hasNext() ? dq.next() : null;
      if (!df) return { ok:false, error:'Không thấy file' };
      out.name = df.getName(); var txt = '';
      if (/google-apps.document/.test(df.getMimeType())) txt = DocumentApp.openById(df.getId()).getBody().getText();
      else { var z = Utilities.unzip(df.getBlob().setContentType('application/zip')), doc = z.filter(function(b){ return b.getName() === 'word/document.xml'; })[0];
        txt = doc ? doc.getDataAsString().replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{2,}/g, '\n') : ''; }
      var o3 = +p.off || 0; out.len = txt.length; out.text = txt.slice(o3, o3 + (+p.n || 5500));
    }
    else if (part === 'sheet'){
      var sid = String(p.id || '');
      if (!sid && p.q){ var sq = DriveApp.searchFiles('title contains "' + String(p.q).replace(/"/g, '') + '" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false'); if (sq.hasNext()) sid = sq.next().getId(); }
      var ss = SpreadsheetApp.openById(sid); out.name = ss.getName(); out.id = sid;
      out.tabs = ss.getSheets().map(function(sh){
        var lr = sh.getLastRow(), lc = Math.min(40, sh.getLastColumn()), hd = '';
        if (lr && lc){ var top = sh.getRange(1, 1, Math.min(8, lr), lc).getDisplayValues(), best = -1, bn = 0;
          top.forEach(function(r, i){ var k = r.filter(function(x){ return x && String(x).length <= 40; }).length; if (k > bn){ bn = k; best = i; } });
          if (best >= 0) hd = (best + 1) + ': ' + top[best].map(function(x){ return cut(x, 28); }).join(' ¦ ').replace(/( ¦ )+$/, ''); }
        return cut(sh.getName(), 40) + (sh.isSheetHidden() ? ' (ẩn)' : '') + ' · ' + lr + '×' + sh.getLastColumn() + (hd ? ' · ' + hd : '');
      });
    }
    else if (part === 'cust'){
      var t = evsReadTab_(SpreadsheetApp.openById(EVS_OFF_ID), ['CUSTOMER LIST'], 'Tel');
      if (!t) return { ok:false, error:'Không có tab CUSTOMER LIST' };
      var heads = Object.keys(t.col).sort(function(a, b){ return t.col[a] - t.col[b]; });
      out.rows = t.rows.length; out.first = t.first; out.heads = heads.map(function(h){ return t.col[h] + ':' + h; }).join(' ¦ ');
      var evc = {}, dist = {}, want = /nguon|source|kenh|npp|dai ly|distributor|partner|ngay dang ky|thoi gian|timestamp|xac nhan|hinh thuc|dong y|speciality|chuyen khoa|tinh|province|event month|bang chung/;
      heads.forEach(function(h){ if (want.test(h)) dist[h] = {}; });
      t.rows.forEach(function(r){
        var ev = evsS_(evsGet_(t, r, ['Event name'])); if (!ev) return;
        evc[ev] = (evc[ev] || 0) + 1;
        Object.keys(dist).forEach(function(h){ var v = r[t.col[h]]; v = v instanceof Date ? 'DATE ' + ymd(v).slice(0, 7) : cut(v, 30) || '(trống)'; dist[h][v] = (dist[h][v] || 0) + 1; });
      });
      out.events = Object.keys(evc).sort(function(a, b){ return evc[b] - evc[a]; }).slice(0, 40).map(function(k){ return evc[k] + ' · ' + cut(k, 60); });
      out.dist = {}; Object.keys(dist).forEach(function(h){ var d = dist[h]; out.dist[h] = Object.keys(d).sort(function(a, b){ return d[b] - d[a]; }).slice(0, 10).map(function(k){ return k + '=' + d[k]; }).join(' · '); });
    }
    else if (part === 'off'){
      var so = SpreadsheetApp.openById(EVS_OFF_ID); out.tabs = so.getSheets().map(function(sh){ return sh.getName() + ' ' + sh.getLastRow() + '×' + sh.getLastColumn(); });
      ['REPORT_EVENT', 'PLAN_EVENT'].forEach(function(nm){
        var tb = evsReadTab_(so, [nm], 'Event Name'); if (!tb) return;
        var hs = Object.keys(tb.col).sort(function(a, b){ return tb.col[a] - tb.col[b]; });
        var pick = hs.filter(function(h){ return /partner|target|participant|actual|nguoi tham du|so luong|npp|distributor|dong to chuc|budget|ngan sach|hinh thuc|place|date|month|status|pic/.test(h); });
        out[nm] = { first: tb.first, heads: hs.map(function(h){ return tb.col[h] + ':' + h; }).join(' ¦ '),
          rows: tb.rows.filter(function(r){ return evsS_(evsGet_(tb, r, ['Event Name'])); }).slice(-(+p.n || 25)).map(function(r){
            return cut(evsGet_(tb, r, ['Event Name']), 50) + ' ‖ ' + pick.map(function(h){ var v = r[tb.col[h]]; return h.slice(0, 14) + '=' + (v instanceof Date ? ymd(v) : cut(v, 24)); }).filter(function(s){ return !/=$/.test(s); }).join(' · '); }) };
      });
    }
    else return { ok:false, error:'part = tree | find | sheet | cust | off' };
  } catch(e){ out.ok = false; out.error = String(e && e.message || e); }
  out.ms = Date.now() - t0;
  return out;
}
