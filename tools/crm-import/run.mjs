/* Nhập bù lượt đi địa bàn (tab 6. WEEKLY REPORT) + ảnh vào CRM — chạy trên GitHub Actions (script.google.com bị chặn trong môi trường Claude).
   spec.json: backend (crm-dental / crm-surgical / crm-eyeless), pic, month (yyyy-mm), values, tasks.
   MODE = check ⇒ chỉ ĐỌC: danh mục, khách khớp từng ảnh, mọi dòng của PIC trong tháng, tải ảnh đã có (/tmp/drive) để so trùng.
   MODE = apply ⇒ task có row: mode photo (chỉ thêm ảnh) / complete (Completed + ảnh, giữ kết quả đã viết); task có code: tạo mới; skip: bỏ qua.
   Dùng tạm theo yêu cầu người dùng — không gộp vào main. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(ROOT, 'tools/crm-import');
const SPEC = JSON.parse(fs.readFileSync(path.join(DIR, 'spec.json'), 'utf8'));
const URL0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'backends.json'), 'utf8'))[SPEC.backend].url;
const MODE = process.env.MODE || fs.readFileSync(path.join(DIR, 'MODE'), 'utf8').trim();
const say = (...a) => console.log(...a);
const nd = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
const nm = a => String(a || '').split('/')[0].trim().toLowerCase();

async function call(q, body) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = body
        ? await fetch(URL0, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout(300000) })
        : await fetch(URL0 + '?' + new URLSearchParams(q), { redirect: 'follow', signal: AbortSignal.timeout(180000) });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { throw new Error(`${r.status} ${t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300)}`); }
    } catch (e) {
      say(`  ! lỗi lần ${i + 1} (${(body || q).action}): ${e.message}`);
      if (body) throw e;                                   /* lệnh ghi: không tự gửi lại */
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error('Không gọi được ' + q.action);
}
async function write(body) {
  for (let i = 0; i < 4; i++) {
    const b = Object.assign({}, body, i ? { rid: body.rid + '-b' + i } : {});
    const r = await call(null, b);
    if (!(r && r.ok === false && /bận/i.test(String(r.error || '')))) return r;
    say(`  … máy chủ bận (${body.action}), đợi ${20 * (i + 1)} giây rồi thử lại`);
    await new Promise(z => setTimeout(z, 20000 * (i + 1)));
  }
  return { ok: false, error: 'Máy chủ bận quá lâu' };
}
const pick = (list, re) => { if (!re) return ''; const R = new RegExp(re, 'i'); return (list || []).find(v => R.test(nd(v))) || ''; };

async function main() {
  say(`# ${SPEC.backend} — ${MODE === 'apply' ? 'GHI' : 'xem trước (chỉ đọc)'} · ${SPEC.tasks.length} task · PIC ${SPEC.pic} · tháng ${SPEC.month}`);
  const ping = await call({ action: 'ping' });
  say('ping:', JSON.stringify({ ok: ping.ok, ver: ping.ver, source: ping.source }));
  const master = (await call({ action: 'master' })).master || {};
  const V = SPEC.values;
  const val = {
    typeAction: V.typeAction, status: pick(master.status, '^' + nd(V.status)) || V.status,
    product: pick(master.product, V.product), process: pick(master.process, V.process),
    feedback: pick(master.feedback, V.feedback), nextAction: pick(master.nextAction, V.nextAction), typeTask: V.typeTask || ''
  };
  const cust = (await call({ action: 'customerIndex' })).rows || [];
  const [y, m] = SPEC.month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const wk = await call({ action: 'list', tab: 'weekly', pic: SPEC.pic, from: `${SPEC.month}-01`, to: `${SPEC.month}-${last}`, limit: 3000 });
  const mine = (wk.rows || []).sort((a, b) => String(a.start).localeCompare(String(b.start)) || a._row - b._row);

  if (MODE !== 'apply') {
    say('\n## Danh mục (master)');
    for (const k of ['typeTask', 'typeAction', 'process', 'status', 'feedback', 'product', 'nextAction', 'area', 'accountType', 'province', 'fy']) say(`- ${k}: ${JSON.stringify(master[k] || [])}`);
    say('\n## Giá trị khớp được', JSON.stringify(val));
    say(`\n## Khách hàng khớp từng ảnh (tổng ${cust.length} khách)`);
    for (const t of SPEC.tasks) {
      const R = new RegExp(t.find, 'i');
      const c = cust.filter(x => R.test(nd(x.name)));
      say(`- [${t.id}] ${t.label} (${t.date}) → ${c.length ? '' : 'KHÔNG THẤY'}`);
      c.slice(0, 12).forEach(x => say(`    · ${x.code} | ${x.name} | ${x.type} | ${x.province} | ${x.area} | PIC ${x.pic} | CBC ${x.nCbc} | đơn ${x.nOrder}`));
    }
    if (SPEC.tasks.some(t => t.find2)) {               /* tìm rộng: tên + địa chỉ trên MỌI khách (tab 1. CUSTOMER) */
      const all = (await call({ action: 'list', tab: 'customer', limit: 5000 })).rows || [];
      say(`\n## Tìm theo tên + địa chỉ (${all.length} khách)`);
      for (const t of SPEC.tasks.filter(t => t.find2)) {
        const R = new RegExp(t.find2, 'i');
        const c = all.filter(x => R.test(nd(x.name + ' | ' + x.address)));
        say(`- [${t.id}] ${t.label} → ${c.length ? '' : 'KHÔNG THẤY'}`);
        c.slice(0, 15).forEach(x => say(`    · ${x.code} | ${x.name} | ${x.type} | ${x.address} | ${x.province} | ${x.area} | PIC ${x.pic} | mở ${x.openDate || ''}`));
      }
    }
    say(`\n## Mọi dòng của ${SPEC.pic} tháng ${SPEC.month}: ${mine.length}`);
    for (const r of mine) say(`[dòng ${r._row}] No ${r.no} · ${r.start}→${r.finish} · ${r.account} · ${r.typeAction} · ${r.status} · tt=${r.typeTask} · sp=${r.product} · proc=${r.process} · fb=${r.feedback} · next=${r.nextAction}\n  plan=${JSON.stringify(String(r.plan || '').slice(0, 160))} · result=${JSON.stringify(String(r.result || '').slice(0, 200))} · ảnh=${r.photo ? 'có' : '—'}`);
    const ids = []; mine.forEach(r => { const mm = /\/d\/([-\w]{20,})/.exec(String(r.photo || '')); if (mm) ids.push([r._row, mm[1]]); });
    fs.mkdirSync('/tmp/drive', { recursive: true });
    for (let i = 0; i < ids.length; i += 3) {
      const part = ids.slice(i, i + 3), j = await call({ action: 'photoB64', ids: part.map(x => x[1]).join(',') });
      for (const [row, id] of part) { const o = (j.photos || {})[id]; if (o && o.b64) fs.writeFileSync(`/tmp/drive/${row}.jpg`, Buffer.from(o.b64, 'base64')); else say(`ảnh dòng ${row}: ✗ ${JSON.stringify(o).slice(0, 120)}`); }
    }
    say(`Đã tải ${ids.length} ảnh có sẵn để so.`);
    return;
  }

  /* ───── GHI ───── */
  for (const k of ['process', 'feedback', 'nextAction']) if (!val[k]) throw new Error('Chưa xác định được giá trị ' + k);
  say('Giá trị:', JSON.stringify(val));
  let okN = 0, skipN = 0, errN = 0;
  for (const t of SPEC.tasks) {
    if (t.skip) { say(`- [${t.id}] ${t.label}: bỏ qua — ${t.skip}`); skipN++; continue; }
    const img = fs.readFileSync(path.join(DIR, 'photos', t.id + '.jpg')).toString('base64');
    const product = t.product || val.product;
    let data, rid;
    if (t.row) {                                       /* dòng PIC đã có */
      const ex = mine.find(r => r._row === t.row);
      if (!ex || String(ex.start).slice(0, 10) !== t.date || nm(ex.account) !== nm(t.acc)) { say(`- [${t.id}] ${t.label}: ✗ dòng ${t.row} không còn khớp (${ex ? ex.start + ' · ' + ex.account : 'không thấy'}) — không ghi`); errN++; continue; }
      if (ex.photo) { say(`- [${t.id}] ${t.label}: bỏ qua — dòng ${t.row} đã có ảnh`); skipN++; continue; }
      const hint = { _no: ex.no, _acc: ex.account, _pic: ex.pic, _start: String(ex.start).slice(0, 10) };
      say(`- [${t.id}] trước khi sửa dòng ${ex._row}: ${JSON.stringify({ status: ex.status, typeTask: ex.typeTask, product: ex.product, process: ex.process, feedback: ex.feedback, nextAction: ex.nextAction, plan: ex.plan, result: ex.result })}`);
      if (t.mode === 'photo') {                        /* đã Completed ⇒ CHỈ thêm ảnh */
        if (!/complet/i.test(ex.status)) { say(`- [${t.id}] ✗ dòng ${t.row} không phải Completed`); errN++; continue; }
        const r = await call(null, Object.assign({ action: 'uploadPhoto', pic: SPEC.pic, rid: `imp-${SPEC.pic}-p${ex._row}-${t.date}`, b64: 'data:image/jpeg;base64,' + img, mime: 'image/jpeg',
                                                  row: ex._row, account: ex.account, date: hint._start, replace: 1 }, hint));
        if (r && r.ok) { okN++; say(`- [${t.id}] ${t.label} ${t.date}: ✓ thêm ảnh vào dòng ${ex._row} · ${r.name}`); }
        else { errN++; say(`- [${t.id}] ${t.label} ${t.date}: ✗ ${JSON.stringify(r).slice(0, 400)}`); }
        continue;
      }
      data = Object.assign({ _row: ex._row, account: ex.account, start: hint._start, finish: String(ex.finish || ex.start).slice(0, 10),
               status: val.status, process: val.process, feedback: val.feedback, nextAction: val.nextAction, stopReason: '' }, hint);
      if (product) data.product = product;
      if (!String(ex.typeTask || '').trim()) data.typeTask = t.typeTask || val.typeTask;
      if (!String(ex.result || '').trim()) data.result = t.result || SPEC.result;
      rid = `imp-${SPEC.pic}-u${ex._row}-${t.date}`;
    } else {                                           /* TẠO MỚI */
      let c = t.code ? cust.find(x => x.code === t.code) : null;
      if (!c && t.newAcc) {                            /* địa bàn chưa có ⇒ tạo như nút "Thêm địa bàn mới" của app (saveCustomerCbc) */
        const A = t.newAcc;
        c = cust.find(x => nd(x.name) === nd(A.name));
        if (c) say(`- [${t.id}] địa bàn "${A.name}" đã có (mã ${c.code}) — dùng lại`);
        else {
          if ((master.province || []).length && !(master.province || []).includes(A.province)) { say(`- [${t.id}] ✗ tỉnh "${A.province}" không có trong danh mục`); errN++; continue; }
          const cus = { _row: 0, name: A.name, type: A.type, province: A.province, area: A.area, address: A.address || '', pic: SPEC.pic, fy: A.fy, openDate: A.openDate || t.date };
          const ra = await write({ action: 'saveCustomerCbc', pic: SPEC.pic, push: '0', rid: `imp-${SPEC.pic}-acc-${nd(A.name).replace(/\W+/g, '-')}${SPEC.ridSuffix || ''}`, customer: cus, cbc: null });
          if (!ra || !ra.ok) { say(`- [${t.id}] ✗ tạo địa bàn lỗi: ${JSON.stringify(ra).slice(0, 300)}`); errN++; continue; }
          c = Object.assign({ code: ra.code || '' }, cus); cust.push(c);
          say(`- [${t.id}] ✓ tạo địa bàn mới "${A.name}" · dòng ${ra.row} · mã ${ra.code || '(chưa có)'}`);
        }
      }
      if (!c) { say(`- [${t.id}] ${t.label}: ✗ không có mã ${t.code}`); errN++; continue; }
      const account = [c.name, c.type, c.province, c.area].join('/');
      const dup = mine.find(r => String(r.start).slice(0, 10) === t.date && nm(r.account) === c.name.trim().toLowerCase() && r.typeAction === 'Visiting');
      if (dup) { say(`- [${t.id}] ${t.label} ${t.date}: bỏ qua — đã có dòng ${dup._row} (${dup.status}, ảnh ${dup.photo ? 'có' : 'chưa'})`); skipN++; continue; }
      if (!product || !(t.typeTask || val.typeTask)) { say(`- [${t.id}] ✗ thiếu product / typeTask`); errN++; continue; }
      data = { _row: 0, account, start: t.date, finish: t.date, pic: SPEC.pic,
               typeTask: t.typeTask || val.typeTask, typeAction: val.typeAction, process: val.process, product,
               plan: t.plan || SPEC.plan, result: t.result || SPEC.result, status: val.status, feedback: val.feedback, nextAction: val.nextAction, stopReason: '' };
      rid = `imp-${SPEC.pic}-${t.date}-${c.code || nd(c.name).replace(/\W+/g, '-')}${SPEC.ridSuffix || ""}`;
    }
    const r = await write({ action: 'saveWeekly', pic: SPEC.pic, push: '0', rid, data, photo: { b64: 'data:image/jpeg;base64,' + img, mime: 'image/jpeg' } });
    if (r && r.ok) { okN++; say(`- [${t.id}] ${t.label} ${t.date}: ✓ ${t.row ? 'cập nhật' : 'tạo'} dòng ${r.row} · No ${r.no || ''} · ảnh ${r.photo && r.photo.ok ? r.photo.name : '✗ ' + (r.photoError || JSON.stringify(r.photo || {}))}`); }
    else { errN++; say(`- [${t.id}] ${t.label} ${t.date}: ✗ ${JSON.stringify(r).slice(0, 400)}`); }
  }
  say(`\nKết quả: ghi ${okN} · bỏ qua ${skipN} · lỗi ${errN}`);
  if (okN) { const k = await call({ action: 'kpiPush' }); say('kpiPush:', JSON.stringify(k).slice(0, 300)); }
  if (errN) process.exitCode = 1;
}
main().catch(e => { say('✗', e.stack || e.message); process.exit(1); });
