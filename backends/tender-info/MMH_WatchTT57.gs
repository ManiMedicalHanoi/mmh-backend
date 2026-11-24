/* ════════════════════════════════════════════════════════════════════
   MMH_WatchTT57.gs v1.0 (24/11/2026, người dùng yêu cầu — rà soát áp dụng TT 57/2025/TT-BYT trong hồ sơ thầu TBYT)
   Lệnh botTT57 (CHỈ khoá bot, không cho tiện ích): xuất dữ liệu tracker cho phân tích ngoài máy chủ (GitHub Actions ▸ tt57-export.yml).
   · op=status                      — các file / tab có thể đọc + số dòng, số cột
   · op=rows {book, tab, off, n, cols} — đọc 1 đoạn dòng (book: hh = file tổng hàng hóa · nt = file tổng nhà thầu · sum = "Tổng hợp tài liệu thầu đã tải" · tender = file Báo Đấu Thầu);
                                      off = dòng bắt đầu (1 = dòng tiêu đề), cols = tên cột cần lấy (cách dấu |, trống = mọi cột)
   · op=hits {off, n}               — GÓI TÌM THẤY dạng gọn (số, loại, CĐT, ngày, trạng thái, file đã tải, file cần Agent)
   · op=text {id, max}              — chữ của 1 tài liệu Drive (cách đọc như MMH_WatchText.gs: docx / OCR pdf / sheet), KHÔNG ghi gì
   · op=prio {keys, pri}            — đặt ưu tiên tải file "cần Agent" (info.agPri: số nhỏ tải trước) cho các gói (khoá GÓI TÌM THẤY, cách dấu phẩy); pri trống = bỏ ưu tiên
   Chỉ ĐỌC, trừ op=prio (ghi 1 trường trong cột thông tin gói, dưới ScriptLock).
   ════════════════════════════════════════════════════════════════════ */
const WT57 = { VER: '1.0', MAX_CELLS: 300000, MAX_TEXT: 900000 };

function wt57Book_(k) {
  if (k === 'hh' || k === 'nt') return wtmBook_(k).book;
  if (k === 'sum') return wtdSumBook_();
  if (k === 'tender') return wtBook_();
  throw new Error('book = hh | nt | sum | tender');
}
function wt57Cell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss').replace(' 00:00:00', '');
  return v;
}
function wt57Action_(p) {
  const op = wtS_(p.op) || 'status';
  if (op === 'status') {
    const out = { ok: true, v: WT57.VER, books: {} };
    ['hh', 'nt', 'sum', 'tender'].forEach(function (k) {
      try {
        const b = wt57Book_(k);
        out.books[k] = { id: b.getId(), name: b.getName(), tabs: b.getSheets().map(function (s) { return { name: s.getName(), rows: s.getLastRow(), cols: s.getLastColumn(), hidden: s.isSheetHidden() }; }) };
      } catch (e) { out.books[k] = { error: String(e.message || e) }; }
    });
    return out;
  }
  if (op === 'rows') {
    const b = wt57Book_(wtS_(p.book)), sh = b.getSheetByName(wtS_(p.tab));
    if (!sh) return { ok: false, error: 'Không có tab ' + p.tab };
    const last = sh.getLastRow(), lc = sh.getLastColumn();
    const head = lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : [];
    let idx = head.map(function (x, i) { return i; });
    const want = wtS_(p.cols) ? wtS_(p.cols).split('|').map(function (x) { return x.trim(); }) : [];
    if (want.length) idx = want.map(function (c) { return head.indexOf(c); }).filter(function (i) { return i >= 0; });
    const off = Math.max(1, parseInt(p.off, 10) || 1);
    let n = Math.max(1, parseInt(p.n, 10) || 2000);
    n = Math.min(n, Math.floor(WT57.MAX_CELLS / Math.max(1, lc)), Math.max(0, last - off + 1));
    let rows = [];
    if (n > 0 && lc) {
      const V = sh.getRange(off, 1, n, lc).getValues();
      rows = V.map(function (r) { return idx.map(function (i) { return wt57Cell_(r[i]); }); });
    }
    return { ok: true, tab: sh.getName(), last: last, cols: lc, head: idx.map(function (i) { return head[i]; }), off: off, n: rows.length, rows: rows, next: off + rows.length <= last ? off + rows.length : 0 };
  }
  if (op === 'hits') {
    const H = wtHits_(wtBook_()), off = Math.max(0, parseInt(p.off, 10) || 0), n = Math.min(3000, parseInt(p.n, 10) || 1500);
    const part = H.slice(off, off + n).map(function (h) {
      const I = h.info || {};
      return {
        key: h.key, type: h.type, no: h.no, inv: h.investor, name: h.name, date: h.date, found: h.found, status: h.status, done: h.done, src: h.src,
        prov: I.prov || '', form: I.form || '', price: I.price || '', win: I.win || '', winner: I.winner || '', open: I.open || '', close: I.close || '', url: I.url || '',
        want: I.want || [], ag: I.ag || 0, pri: I.pri, agPri: I.agPri, bulk: I.bulk || '',
        agent: (I.agentFiles || []).filter(function (a) { return a && typeof a === 'object'; }).map(function (a) { return { name: a.name, tab: a.tab || '', type: a.type || '', done: !!a.done, url: a.url || '', tries: +a.tries || 0 }; }),
        files: (h.files || []).filter(Boolean).map(function (f) { return { id: f.id || '', kind: f.kind || '', name: f.name || '', sec: f.sec || '', url: f.url || '', gsheet: !!f.gsheet }; })
      };
    });
    return { ok: true, total: H.length, off: off, n: part.length, next: off + part.length < H.length ? off + part.length : 0, hits: part };
  }
  if (op === 'text') {
    const id = wtS_(p.id); if (!id) return { ok: false, error: 'thiếu id' };
    const t0 = Date.now();
    try {
      const f = DriveApp.getFileById(id), r = wteRead_(id);
      if (r.skip) return { ok: true, id: id, name: f.getName(), skip: r.skip, ms: Date.now() - t0 };
      const max = Math.min(WT57.MAX_TEXT, parseInt(p.max, 10) || WT57.MAX_TEXT);
      return { ok: true, id: id, name: f.getName(), mime: f.getMimeType(), size: f.getSize(), how: r.how, chars: r.text.length, text: r.text.slice(0, max), ms: Date.now() - t0 };
    } catch (e) { return { ok: false, id: id, error: String(e.message || e), ms: Date.now() - t0 }; }
  }
  if (op === 'prio') {
    const keys = wtS_(p.keys).split(',').map(function (x) { return x.trim(); }).filter(String);
    if (!keys.length) return { ok: false, error: 'thiếu keys' };
    const pri = wtS_(p.pri) === '' ? null : (+p.pri || 0), want = {};
    keys.forEach(function (k) { want[k] = 1; });
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
    const res = { set: 0, missing: 0, noAgent: 0 };
    try {
      const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss), seen = {};
      H.forEach(function (h) {
        if (!want[h.key]) return;
        seen[h.key] = 1;
        const I = Object.assign({}, h.info);
        if (pri === null) delete I.agPri; else I.agPri = pri;
        if (!(I.agentFiles || []).some(function (a) { return a && !a.done; })) res.noAgent++;
        sh.getRange(h.row, 7).setValue(JSON.stringify(I));
        res.set++;
      });
      res.missing = keys.filter(function (k) { return !seen[k]; }).length;
    } finally { lock.releaseLock(); }
    return Object.assign({ ok: true }, res);
  }
  return { ok: false, error: 'op = status | rows | hits | text | prio' };
}
