/* ════════════════ CHẨN ĐOÁN GIỚI HẠN 130% (chỉ đọc) — 19/11/2026 ════════════════
   Rule (4. Rule · MMHSOP_009): mọi KPI tối đa 130% (tháng, quý, năm); CHỈ doanh số NPP / sản phẩm mới
   (mã F0–F6, nhóm Kết quả) không giới hạn. Hỗ trợ bán C5 / C6 / C7 thuộc nhóm Quá trình ⇒ tối đa 130%.
   ?action=capDiag&key=<8 ký tự cuối ID file KPI>[&code=C5]
   ⇒ sheet 5. Member KPI Monthly: mọi ô "<kỳ> %" của mã KHÔNG phải F mà > 130% hoặc "% x W" > 130% × trọng số
      (vi phạm), số ô đã kiểm, mẫu công thức ô % của mã C5 / C6 / C7, mã F vượt 130% (đúng rule, để đối chiếu);
      3. Detail KPI: cột "<tháng> %" / "FY68 %" của mã không phải F mà > 130%.
   Không ghi gì. */
function kscCapDiag_(p) {
  var KEY = '1m3F8NEI1QuvzFnpHVrvQ903R1lNQvm_qRkgSI5mBkx0';
  if (String(p.key || '') !== KEY.slice(-8)) return { ok: false, error: 'key' };
  var ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(KEY), CAP = 1.3, EPS = 1e-6;
  var only = String(p.code || '').trim().toUpperCase();
  var num = function (v) { var n = rkvNum_(v); return n == null ? null : n; };
  var isF = function (c) { return /^F/i.test(String(c || '').trim()); };
  var out = { ok: true, rule: 'non-F ≤ 130% · F không giới hạn', m5: null, d3: null };

  /* ── 5. Member KPI Monthly ── */
  var sh = ss.getSheetByName(RKV.SHEET);
  if (sh) {
    var lr = sh.getLastRow(), lc = sh.getLastColumn(), hr = RKV.HEADER_ROW;
    var rg = sh.getRange(hr, 1, Math.max(1, lr - hr + 1), lc), V = rg.getValues(), F = rg.getFormulas();
    var hd = V[0].map(function (x) { return String(x || '').trim(); }), col = function (n) { return hd.indexOf(n); };
    var cM = col('Member'), cC = col('KPI Code'), cG = col('KPI Group'), P = {}, per = [];
    hd.forEach(function (h, i) { var m = h.match(/^(.+?) (Target|Actual|Weight|%|% x W)$/); if (!m) return; if (!P[m[1]]) { P[m[1]] = {}; per.push(m[1]); } P[m[1]][m[2]] = i; });
    var res = { rows: 0, cells: 0, bad: [], badN: 0, fOver: 0, fOverEx: [], supp: [], groups: {} };
    for (var r = 1; r < V.length; r++) {
      var code = String(V[r][cC] || '').trim(), mem = String(V[r][cM] || '').trim();
      if (!code || !mem || /^TOTAL/i.test(String(V[r][1] || ''))) continue;
      if (only && code.toUpperCase().indexOf(only) !== 0) continue;
      res.rows++;
      var supp = /^C[5-7]-/i.test(code), sx = supp ? { member: mem, code: code, group: String(V[r][cG] || ''), maxP: null, f: {} } : null;
      if (cG >= 0) { var g = String(V[r][cG] || '').trim(); if (g) res.groups[g] = (res.groups[g] || 0) + 1; }
      per.forEach(function (k) {
        var c = P[k]; if (c['%'] == null) return;
        var pc = num(V[r][c['%']]), w = c.Weight == null ? null : num(V[r][c.Weight]), pw = c['% x W'] == null ? null : num(V[r][c['% x W']]);
        if (pc == null && pw == null) return;
        res.cells++;
        if (sx) { if (pc != null && (sx.maxP == null || pc > sx.maxP)) sx.maxP = pc; var kk = /^\d{6}$/.test(k) ? 'month' : /^Q/.test(k) ? 'quarter' : 'fy'; if (!sx.f[kk]) sx.f[kk] = { period: k, pct: String(F[r][c['%']] || '').slice(0, 220), pw: c['% x W'] == null ? '' : String(F[r][c['% x W']] || '').slice(0, 160) }; }
        var over = (pc != null && pc > CAP + EPS) || (pw != null && w != null && w > 0 && pw > CAP * w + EPS);
        if (!over) return;
        if (isF(code)) { res.fOver++; if (res.fOverEx.length < 5) res.fOverEx.push(mem + ' · ' + code + ' · ' + k + ' · ' + Math.round(pc * 1000) / 10 + '%'); return; }
        res.badN++;
        if (res.bad.length < 60) res.bad.push({ member: mem, code: code, period: k, t: num(V[r][c.Target]), a: num(V[r][c.Actual]), w: w, pct: pc, pw: pw,
          fPct: String(F[r][c['%']] || '').slice(0, 220), fPw: c['% x W'] == null ? '' : String(F[r][c['% x W']] || '').slice(0, 160) });
      });
      if (sx) res.supp.push(sx);
    }
    res.periods = per.length;
    out.m5 = res;
  } else out.m5 = { error: 'Không thấy sheet ' + RKV.SHEET };

  /* ── 3. Detail KPI ── */
  var s3 = ss.getSheetByName('3. Detail KPI');
  if (s3) {
    var v3 = s3.getRange(4, 1, Math.max(1, s3.getLastRow() - 3), s3.getLastColumn()).getValues(), f3 = s3.getRange(4, 1, v3.length, v3[0].length).getFormulas();
    var h3 = v3[0].map(function (x) { return String(x || '').trim(); }), cc = h3.indexOf('KPI Code'), pcs = [];
    h3.forEach(function (x, i) { if (/^(\d{6}|Q[1-4]|FY\d+) %$/.test(x)) pcs.push(i); });
    var d = { cols: pcs.map(function (i) { return h3[i]; }), bad: [], badN: 0, supp: [] };
    for (var i = 1; i < v3.length; i++) {
      var cd = String(v3[i][cc] || '').trim(); if (!cd || isF(cd)) continue;
      if (only && cd.toUpperCase().indexOf(only) !== 0) continue;
      var sp = /^C[5-7]-/i.test(cd) ? { code: cd, maxP: null, f: '' } : null;
      pcs.forEach(function (j) {
        var v = num(v3[i][j]); if (v == null) return;
        if (sp) { if (sp.maxP == null || v > sp.maxP) sp.maxP = v; if (!sp.f && f3[i][j]) sp.f = h3[j] + ': ' + String(f3[i][j]).slice(0, 200); }
        if (v > CAP + EPS) { d.badN++; if (d.bad.length < 40) d.bad.push({ code: cd, col: h3[j], pct: v, f: String(f3[i][j] || '').slice(0, 200) }); }
      });
      if (sp) d.supp.push(sp);
    }
    out.d3 = d;
  } else out.d3 = { error: 'Không thấy sheet 3. Detail KPI' };
  return out;
}
