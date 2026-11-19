/* ════════════════════════════════════════════════════════════════════
   ⭐ 19/11/2026 · MMH_ExpenseApi.gs v1.0 — Claude tạo đề xuất chi phí thay PIC (người dùng yêu cầu)
   Web app (doGet, JSON / callback). Gọi từ phiên Claude qua workflow Kiểm tra ▸ ping, khoá `key` = 8 ký tự cuối ID Sheet.

   ?action=exInfo   — danh mục: PIC được dùng, loại chứng từ, hình thức thanh toán, loại chi phí (Master expense FY67),
                      tỷ giá gần nhất, dòng trống đầu tiên, chứng từ gần đây (&pic=… &doc=<Document No> để lọc, &n=…)
   ?action=exAdd    — p = JSON (hoặc pz = gzip base64url JSON):
        { pic, docType:'PO'|'Travel Bill', date:'yyyy-mm-dd', no?:1, required?:'yyyy-mm-dd', expMonth?:'yyyyMM', rate?,
          payType?, expType?, supplier?, unit?, currency?:'VND', send?:true, ccAcc?:false, force?:0,
          items:[{ desc, qty, unit?, price, payType?, expType?, supplier?, required? }] }
        &op=dry (mặc định) — chỉ kiểm + xem trước, KHÔNG ghi.
        &op=run&rid=<mã lượt> — ghi dòng mới vào tab Expense Approval (chỉ cột nhập tay, không đụng công thức)
                      rồi bấm "Confirm Proposal" thay PIC (proposeCore_ của Mã.gs: AD Proposed, khoá dòng, email HOD…).
                      Cùng rid gọi lại ⇒ trả kết quả cũ, không ghi lần 2.
   ?action=exPropose&rows=177,178&pic=…&op=dry|run&rid=… — đề xuất các dòng ĐÃ điền sẵn trên Sheet.

   Viết tắt: payType  post-mmh | post-personal | pre-mmh | pre-personal (hoặc đúng chữ trong file)
             expType  số đầu (vd. 39 = công tác phí VN, 29 = tổ chức sự kiện, 33 = POSM, 36 = vật tư workshop) hoặc đúng chữ
   ════════════════════════════════════════════════════════════════════ */

const EXA = {
  VER: '1.1',
  TZ: 'Asia/Ho_Chi_Minh',                   // "hôm nay" theo giờ VN (múi giờ của file Sheet lệch ngày)
  PICS: ['Giang', 'Minh Trang'],            // PIC của file này được tạo đề xuất qua API
  DOC_TYPES: ['PO', 'Travel Bill'],
  CURRENCIES: ['VND'],
  MAX_ITEMS: 25,
  MASTER: 'Master expense FY67',
  PAY: { 'post-mmh': 'Post- Pay/ MMH account', 'post-personal': 'Post- Pay/ Personal account',
         'pre-mmh': 'Pre- Pay/ MMH account', 'pre-personal': 'Pre- Pay/ Personal account' },
  DEF_EXP: { 'Travel Bill': '39' }           // loại chi phí mặc định theo loại chứng từ (vé máy bay VN = 41, tiếp khách thường 4 / 57 — xem dòng cũ)
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  try { out = exaRoute_(p); }
  catch (err) { out = { ok: false, error: String((err && err.message) || err) }; }
  const s = JSON.stringify(out);
  if (p.callback && /^[\w.$]+$/.test(p.callback)) return ContentService.createTextOutput(p.callback + '(' + s + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function exaRoute_(p) {
  const a = String(p.action || 'ping');
  if (a === 'ping') return { ok: true, app: 'expense-approval', ver: EXA.VER };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (String(p.key || '') !== ss.getId().slice(-8)) return { ok: false, code: 'KEY', error: 'Sai khoá.' };
  if (a === 'exInfo') return exaInfo_(p);
  if (a === 'exAdd') return exaOnce_(p, () => exaAdd_(p));
  if (a === 'exPropose') return exaOnce_(p, () => exaPropose_(p));
  return { ok: false, error: 'Không có action ' + a };
}

/* ---------- tiện ích ---------- */
function exaPayload_(p) {
  if (p.pz) {
    const b = Utilities.base64DecodeWebSafe(String(p.pz).replace(/=+$/, '') + '==='.slice((String(p.pz).length + 3) % 4));
    return JSON.parse(Utilities.ungzip(Utilities.newBlob(b, 'application/x-gzip')).getDataAsString('UTF-8'));
  }
  return JSON.parse(String(p.p || '{}'));
}
function exaIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);            // dd/mm/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function exaNum_(v) { const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/[.,\s](?=\d{3}(\D|$))/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
function exaExpTypes_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXA.MASTER);
  if (!sh) return [];
  return sh.getRange(3, 2, Math.max(1, sh.getLastRow() - 2), 1).getDisplayValues().map(r => String(r[0]).trim()).filter(x => /^\d+\//.test(x));
}
function exaExpType_(v, list) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (list.indexOf(s) >= 0) return s;
  if (/^\d+$/.test(s)) return list.find(x => x.indexOf(s + '/') === 0) || '';
  const k = s.toLowerCase();
  return list.find(x => x.toLowerCase() === k) || '';
}
function exaPay_(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  if (CONFIG.PAYMENT_TYPES.indexOf(s) >= 0) return s;
  const k = s.toLowerCase().replace(/[\s_\/]+/g, '-');
  return EXA.PAY[k] || CONFIG.PAYMENT_TYPES.find(x => x.toLowerCase().replace(/\s/g, '') === s.toLowerCase().replace(/\s/g, '')) || '';
}
function exaDocNo_(type, pic, no, iso) { return type + '/' + pic + '-' + no + '-' + iso.replace(/-/g, ''); }

/* Dòng cuối có dữ liệu nhập tay (bỏ cột công thức G, L và các cột tự động) */
function exaLastUsed_(sh) {
  const start = CONFIG.START_ROW, last = sh.getLastRow();
  if (last < start) return start - 1;
  const v = sh.getRange(start, 3, last - start + 1, 15).getValues();   // C..Q
  for (let i = v.length - 1; i >= 0; i--) {
    const r = v[i];
    for (let j = 0; j < r.length; j++) {
      if (j === 4 || j === 9) continue;                                   // G (Document No), L (Amount) = công thức
      if (r[j] !== '' && r[j] !== null) return start + i;
    }
  }
  return start - 1;
}
function exaRate_(all, expMonth) {
  let same = '', any = '';
  all.forEach(x => { if (x.rate) { any = x.rate; if (x.expensedMonth === expMonth) same = x.rate; } });
  return { rate: same || any, from: same ? 'cùng tháng ghi nhận ' + expMonth : 'dòng gần nhất' };
}

/* rid: chống gửi trùng (gọi lại cùng rid ⇒ kết quả cũ) */
function exaOnce_(p, fn) {
  if (String(p.op || 'dry') !== 'run') return fn();
  const rid = String(p.rid || '').trim();
  if (!/^[\w-]{6,64}$/.test(rid)) return { ok: false, code: 'RID', error: 'Lệnh run cần rid (6–64 ký tự chữ / số / - / _).' };
  const c = CacheService.getScriptCache(), k = 'exa:' + rid, prev = c.get(k);
  if (prev) { const o = JSON.parse(prev); o.repeat = true; return o; }
  const props = PropertiesService.getScriptProperties(), pk = 'EXA_' + rid;
  const old = props.getProperty(pk);
  if (old) { const o = JSON.parse(old); o.repeat = true; return o; }
  const out = fn();
  const s = JSON.stringify(out);
  try { c.put(k, s, 21600); } catch (e) {}
  try { if (out && (out.ok || out.rows) && s.length < 8000) props.setProperty(pk, s); } catch (e) {}   // đã ghi dòng ⇒ không bao giờ ghi lại
  return out;
}

/* ---------- exInfo ---------- */
function exaInfo_(p) {
  const all = loadItems_(), sh = sh_();
  const pic = String(p.pic || '').trim(), doc = String(p.doc || '').trim(), n = Math.min(Number(p.n) || 25, 200);
  let rows = all.filter(x => x.desc || x.docNo && x.picName);
  if (pic) rows = rows.filter(x => x.picName === pic);
  if (doc) rows = rows.filter(x => x.docNo === doc);
  rows = rows.slice(-n);
  const nowM = Utilities.formatDate(new Date(), EXA.TZ, 'yyyyMM');
  return {
    ok: true, ver: EXA.VER, today: Utilities.formatDate(new Date(), EXA.TZ, 'yyyy-MM-dd'),
    sheet: SpreadsheetApp.getActiveSpreadsheet().getName(), firstFree: exaLastUsed_(sh) + 1,
    pics: EXA.PICS.map(n2 => { const m = picInfo_(n2) || {}; return { name: n2, email: m.picEmail, hod: m.hodEmail, cc: m.ccEmails }; }),
    director: CONFIG.DIRECTOR_EMAILS, docTypes: EXA.DOC_TYPES, payTypes: CONFIG.PAYMENT_TYPES, currencies: EXA.CURRENCIES,
    expTypes: exaExpTypes_(), rate: exaRate_(all, nowM),
    rows: rows.map(x => ({ row: x.row, pic: x.picName, date: x.proposalDate, docNo: x.docNo, desc: x.desc.slice(0, 160), qty: x.qty, unit: x.unit,
      price: x.unitPrice, amount: x.amount, cur: x.currency, exp: x.expenseType, sup: x.supplier, pay: x.paymentType, em: x.expensedMonth, rate: x.rate,
      st: x.status, hod: x.hodStatus, hodC: x.hodComment, dir: x.directorStatus, dirC: x.directorComment, apr: x.approvedAmount, folder: x.folderUrl }))
  };
}

/* ---------- exAdd ---------- */
function exaPlan_(d, all) {
  const errs = [], warns = [], list = exaExpTypes_();
  const pic = String(d.pic || '').trim();
  if (EXA.PICS.indexOf(pic) < 0) errs.push('PIC phải là một trong: ' + EXA.PICS.join(', '));
  const map = picInfo_(pic);
  if (!map) errs.push('PIC "' + pic + '" không có trong PIC_MAPPING');
  const docType = EXA.DOC_TYPES.find(t => t.toLowerCase() === String(d.docType || '').trim().toLowerCase()) || '';
  if (!docType) errs.push('docType phải là PO hoặc Travel Bill');
  const today = Utilities.formatDate(new Date(), EXA.TZ, 'yyyy-MM-dd');
  const date = d.date ? exaIso_(d.date) : today;
  if (!date) errs.push('date sai định dạng (yyyy-mm-dd)');
  const no = Number(d.no) || 1;
  const required = d.required ? exaIso_(d.required) : date;
  if (!required) errs.push('required sai định dạng');
  const cur = String(d.currency || 'VND').trim();
  if (EXA.CURRENCIES.indexOf(cur) < 0) errs.push('currency chỉ nhận ' + EXA.CURRENCIES.join(', '));
  const expMonth = String(d.expMonth || (required || date || today).slice(0, 7).replace('-', '')).replace(/\D/g, '');
  if (!/^20\d{2}(0[1-9]|1[0-2])$/.test(expMonth)) errs.push('expMonth (Expensed Record Month) phải dạng yyyyMM');
  const rr = exaRate_(all, expMonth), rate = exaNum_(d.rate) || exaNum_(rr.rate);
  if (!rate) errs.push('Chưa có tỷ giá (rate)');
  if (!d.rate) warns.push('Tỷ giá ' + rate + ' lấy từ ' + rr.from + ' — kế toán có thể điều chỉnh.');
  const items = Array.isArray(d.items) ? d.items : [];
  if (!items.length) errs.push('items trống');
  if (items.length > EXA.MAX_ITEMS) errs.push('Tối đa ' + EXA.MAX_ITEMS + ' dòng / lần');
  const docNo = docType && date ? exaDocNo_(docType, pic, no, date) : '';
  const plan = items.map((it, i) => {
    const r = {
      desc: String(it.desc || '').trim(), qty: exaNum_(it.qty), unit: String(it.unit || d.unit || 'Lần').trim(), price: exaNum_(it.price),
      expType: exaExpType_(it.expType || d.expType || EXA.DEF_EXP[docType] || '', list),
      payType: exaPay_(it.payType || d.payType), supplier: String(it.supplier || d.supplier || '').trim(),
      required: it.required ? exaIso_(it.required) : required
    };
    r.amount = r.qty * r.price;
    const tag = 'Dòng ' + (i + 1) + ': ';
    if (!r.desc) errs.push(tag + 'thiếu nội dung (desc)');
    if (!(r.qty > 0)) errs.push(tag + 'số lượng phải > 0');
    if (!r.unit) errs.push(tag + 'thiếu đơn vị');
    if (!(r.price > 0)) errs.push(tag + 'đơn giá phải > 0');
    if (!r.expType) errs.push(tag + 'Type of expense không khớp Master expense (' + (it.expType || d.expType || 'trống') + ')');
    if (!r.payType) errs.push(tag + 'Payment type không hợp lệ (' + (it.payType || d.payType || 'trống') + ')');
    if (!r.required) errs.push(tag + 'Required date sai định dạng');
    return r;
  });
  const same = all.filter(x => x.docNo && x.docNo === docNo);
  if (same.length) {
    warns.push('Document No ' + docNo + ' đã có ' + same.length + ' dòng (' + same.map(x => x.row + (x.status ? ' ' + x.status : '')).join(', ') +
      ') — dòng mới sẽ chung chứng từ này. Muốn chứng từ riêng thì đặt no = ' + (no + 1) + '.');
    plan.forEach((r, i) => {
      if (same.some(x => x.desc === r.desc && Math.abs(x.amount - r.amount) < 1)) {
        if (d.force) warns.push('Dòng ' + (i + 1) + ' trùng nội dung + số tiền dòng đã có (force=1 ⇒ vẫn ghi).');
        else errs.push('Dòng ' + (i + 1) + ' trùng nội dung + số tiền với dòng đã có trong ' + docNo + ' (gửi force:1 nếu đúng là thêm mới).');
      }
    });
  }
  const tot = plan.reduce((s, r) => s + r.amount, 0);
  return { errs, warns, pic, map, docType, date, no, docNo, cur, expMonth, rate, plan, total: tot };
}

function exaView_(P, rows) {
  return {
    pic: P.pic, picEmail: P.map && P.map.picEmail, hod: P.map && P.map.hodEmail, cc: P.map && P.map.ccEmails,
    docType: P.docType, docNo: P.docNo, proposalDate: P.date, proposalMonth: P.date.slice(0, 7).replace('-', ''),
    expensedMonth: P.expMonth, currency: P.cur, rate: P.rate, total: P.total, totalText: fmtAmt_(P.total, P.cur),
    items: P.plan.map((r, i) => ({ row: rows ? rows[i] : null, desc: r.desc, qty: r.qty, unit: r.unit, price: r.price, amount: r.amount,
      required: r.required, expType: r.expType, supplier: r.supplier, payType: r.payType }))
  };
}

function exaAdd_(p) {
  const op = String(p.op || 'dry'), d = exaPayload_(p), all = loadItems_();
  const P = exaPlan_(d, all);
  if (P.errs.length) return { ok: false, code: 'CHECK', errors: P.errs, warnings: P.warns, preview: exaView_(P) };
  const sh = sh_(), start0 = exaLastUsed_(sh) + 1;
  const rowsPlan = P.plan.map((_, i) => start0 + i);
  if (op !== 'run') return { ok: true, op: 'dry', warnings: P.warns, preview: exaView_(P, rowsPlan),
    send: d.send !== false, note: 'Chưa ghi gì. Gọi lại op=run&rid=… để ghi và đề xuất.' };

  // 1. Ghi dòng (khoá tài liệu, đọc lại vị trí trong khoá)
  const rows = withLock_(() => {
    const start = exaLastUsed_(sh) + 1, C = CONFIG.COL;
    if (start + P.plan.length - 1 > sh.getMaxRows()) throw new Error('Sheet hết dòng trống (cần thêm dòng mẫu có công thức).');
    const out = [];
    P.plan.forEach((r, i) => {
      const row = start + i;
      writeCells_(sh, row, C.PROPOSAL_DATE, [P.date, P.pic, P.docType, P.no]);                                    // C..F
      writeCells_(sh, row, C.DESC, [r.desc, r.qty, r.unit, r.price, '=I' + row + '*K' + row, P.cur, r.required,  // H..Q
        r.expType, r.supplier, r.payType]);
      writeCells_(sh, row, C.EXPENSED_MONTH, [P.expMonth]);                                                        // AM
      writeCells_(sh, row, C.RATE, [P.rate]);                                                                      // AO
      out.push(row);
    });
    SpreadsheetApp.flush();
    return out;
  });

  // 2. Đọc lại, kiểm ngày / Document No / số tiền đúng như dự định (chống lệch ngày dd/mm ↔ mm/dd)
  const byRow = index_(loadItems_()), bad = [];
  rows.forEach((row, i) => {
    const it = byRow[row], r = P.plan[i];
    if (!it) { bad.push('Dòng ' + row + ': không đọc lại được'); return; }
    if (it.docNo !== P.docNo) bad.push('Dòng ' + row + ': Document No trên Sheet = "' + it.docNo + '" (dự kiến ' + P.docNo + ')');
    if (Math.abs(it.amount - r.amount) > 0.5) bad.push('Dòng ' + row + ': Estimate Amount = ' + it.amount + ' (dự kiến ' + r.amount + ')');
    if (it.picName !== P.pic) bad.push('Dòng ' + row + ': PIC = "' + it.picName + '"');
  });
  if (bad.length) return { ok: false, code: 'VERIFY', rows, errors: bad,
    note: 'Đã ghi dòng nhưng CHƯA đề xuất (số liệu đọc lại không khớp). Kiểm tra trên Sheet trước khi đề xuất bằng exPropose.' };

  // 3. Bấm "Confirm Proposal" thay PIC
  let msg;
  try { msg = proposeCore_({ rows: rows, months: {}, sendToHOD: d.send !== false, ccAccountant: !!d.ccAcc }, P.map.picEmail); }
  catch (e) { return { ok: false, code: 'PROPOSE', rows, error: String(e.message || e), note: 'Đã ghi dòng, đề xuất bị từ chối.' }; }
  const after = index_(loadItems_());
  return { ok: true, op: 'run', rows, result: msg, warnings: P.warns, preview: exaView_(P, rows),
    status: rows.map(r => ({ row: r, st: after[r] && after[r].status, hod: after[r] && after[r].hodStatus, lock: after[r] && after[r].locked })),
    link: sheetLink_() };
}

/* ---------- exPropose: đề xuất dòng đã điền sẵn ---------- */
function exaPropose_(p) {
  const rows = String(p.rows || '').split(/[,\s]+/).map(Number).filter(n => n >= CONFIG.START_ROW);
  const pic = String(p.pic || '').trim(), map = picInfo_(pic);
  if (EXA.PICS.indexOf(pic) < 0 || !map) return { ok: false, error: 'PIC phải là một trong: ' + EXA.PICS.join(', ') };
  if (!rows.length) return { ok: false, error: 'Thiếu rows' };
  const byRow = index_(loadItems_()), errs = [], view = [];
  rows.forEach(r => {
    const it = byRow[r];
    if (!it) { errs.push('Dòng ' + r + ': trống'); return; }
    view.push({ row: r, docNo: it.docNo, desc: it.desc, qty: it.qty, unit: it.unit, price: it.unitPrice, amount: it.amount, cur: it.currency,
      exp: it.expenseType, pay: it.paymentType, em: it.expensedMonth, rate: it.rate, st: it.status });
    if (it.picName !== pic) errs.push('Dòng ' + r + ': PIC trên Sheet là "' + it.picName + '"');
    else if (it.locked || it.status === 'Proposed') errs.push('Dòng ' + r + ': đã đề xuất / đang khoá');
    else {
      const m = missingBase_(it);
      if (!it.expensedMonth) m.unshift('Expensed Record Month');
      if (m.length) errs.push('Dòng ' + r + ': thiếu ' + m.join(', '));
    }
  });
  if (errs.length) return { ok: false, code: 'CHECK', errors: errs, items: view };
  if (String(p.op || 'dry') !== 'run') return { ok: true, op: 'dry', items: view, note: 'Chưa đề xuất. Gọi lại op=run&rid=…' };
  const msg = proposeCore_({ rows: rows, months: {}, sendToHOD: p.send !== '0', ccAccountant: p.ccAcc === '1' }, map.picEmail);
  return { ok: true, op: 'run', rows, result: msg, link: sheetLink_() };
}
