/* Nhập bù lượt đi địa bàn (tab 6. WEEKLY REPORT) + ảnh vào CRM Surgical — chạy trên GitHub Actions (script.google.com bị chặn trong môi trường Claude).
   MODE = plan  ⇒ chỉ ĐỌC: danh mục (master), khách hàng khớp từng ảnh, việc tháng 09 của PIC, vài dòng gần nhất để chép đúng kiểu ghi.
   MODE = apply ⇒ ghi từng task bằng saveWeekly (kèm ảnh, như app), bỏ qua task đã có (cùng account + ngày + Visiting), cuối cùng kpiPush.
   Dùng 1 lần theo yêu cầu người dùng (04/11/2026) — không gộp vào main. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(ROOT, 'tools/crm-import');
const URL0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'backends.json'), 'utf8'))['crm-surgical'].url;
const SPEC = JSON.parse(fs.readFileSync(path.join(DIR, 'khang-202609.json'), 'utf8'));
const MODE = fs.readFileSync(path.join(DIR, 'MODE'), 'utf8').trim();
const say = (...a) => console.log(...a);
const nd = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

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
      if (body) throw e;                                   /* lệnh ghi: không tự gửi lại (rid vẫn chống trùng, nhưng để người xem log quyết định) */
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error('Không gọi được ' + q.action);
}
const pick = (list, re) => { if (!re) return ''; const R = new RegExp(re, 'i'); return (list || []).find(v => R.test(nd(v))) || ''; };

async function main() {
  say(`# CRM Surgical — ${MODE === 'apply' ? 'GHI' : 'xem trước (chỉ đọc)'} · ${SPEC.tasks.length} task · PIC ${SPEC.pic}`);
  const ping = await call({ action: 'ping' });
  say('ping:', JSON.stringify({ ok: ping.ok, ver: ping.ver, source: ping.source }));

  const master = (await call({ action: 'master' })).master || {};
  const V = SPEC.values;
  const val = {
    typeAction: V.typeAction, status: pick(master.status, '^' + nd(V.status)) || V.status,
    product: pick(master.product, V.product), process: pick(master.process, V.process),
    feedback: pick(master.feedback, V.feedback), nextAction: pick(master.nextAction, V.nextAction),
    typeTask: V.typeTask || ''
  };
  const cust = (await call({ action: 'customerIndex' })).rows || [];
  const wk = await call({ action: 'list', tab: 'weekly', pic: SPEC.pic, from: '2025-08-01', to: '2026-12-31', limit: 3000 });
  const mine = wk.rows || [];
  if (!val.typeTask) {                                   /* Type task Khang hay dùng cho Visiting */
    const cnt = {}; mine.filter(r => r.typeAction === 'Visiting' && r.typeTask).forEach(r => cnt[r.typeTask] = (cnt[r.typeTask] || 0) + 1);
    val.typeTask = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || (master.typeTask || [])[0] || '';
  }

  if (MODE === 'check') {                               /* chỉ đọc: chi tiết dòng tháng 09/2026 + tải ảnh đã có để so với ảnh Zalo */
    const sep = mine.filter(r => /^2026-09/.test(String(r.start))).sort((a, b) => String(a.start).localeCompare(String(b.start)));
    for (const r of sep) say(`\n[dòng ${r._row}] No ${r.no} · ${r.start}→${r.finish} · ${r.account} · ${r.typeAction} · ${r.status} · tt=${r.typeTask} · sp=${r.product} · proc=${r.process} · fb=${r.feedback} · next=${r.nextAction}\n  plan=${JSON.stringify(r.plan || '')}\n  result=${JSON.stringify(r.result || '')}\n  photo=${r.photo || ''} · gps=${JSON.stringify(r.gpsInfo || '')}`);
    const ids = []; sep.forEach(r => { const m = /\/d\/([-\w]{20,})/.exec(String(r.photo || '')); if (m) ids.push([r._row, m[1]]); });
    fs.mkdirSync('/tmp/drive', { recursive: true });
    for (let i = 0; i < ids.length; i += 3) {
      const part = ids.slice(i, i + 3), j = await call({ action: 'photoB64', ids: part.map(x => x[1]).join(',') });
      for (const [row, id] of part) { const o = (j.photos || {})[id]; if (o && o.b64) { fs.writeFileSync(`/tmp/drive/${row}.jpg`, Buffer.from(o.b64, 'base64')); say(`ảnh dòng ${row}: tải ${o.at}`); } else say(`ảnh dòng ${row}: ✗ ${JSON.stringify(o)}`); }
    }
    return;
  }
  if (MODE !== 'apply') {
    say('\n## Danh mục (master)');
    for (const k of ['typeTask', 'typeAction', 'process', 'status', 'feedback', 'product', 'nextAction', 'area', 'accountType']) say(`- ${k}: ${JSON.stringify(master[k] || [])}`);
    say('\n## Giá trị sẽ ghi', JSON.stringify(val));
    say(`\n## Khách hàng khớp từng ảnh (tổng ${cust.length} khách)`);
    for (const t of SPEC.tasks) {
      const R = new RegExp(t.find, 'i');
      const c = cust.filter(x => R.test(nd(x.name)));
      say(`- [${t.id}] ${t.label} (${t.date}) → ${c.length ? '' : 'KHÔNG THẤY'}`);
      c.forEach(x => say(`    · ${x.code} | ${x.name} | ${x.type} | ${x.province} | ${x.area} | PIC ${x.pic} | CBC ${x.nCbc} | đơn ${x.nOrder}`));
    }
    say(`\n## Việc của ${SPEC.pic}: ${mine.length} dòng (08/2025 → 12/2026)`);
    const byM = {}; mine.forEach(r => { const m = String(r.start || '').slice(0, 7); byM[m] = (byM[m] || 0) + 1; });
    say('Theo tháng:', JSON.stringify(byM));
    say('\n### Tháng 09/2025 và 09/2026');
    mine.filter(r => /^(2025|2026)-09/.test(String(r.start))).sort((a, b) => String(a.start).localeCompare(String(b.start)))
      .forEach(r => say(`  ${r.start} | ${r.account} | ${r.typeAction} | ${r.status} | ảnh ${r.photo ? 'có' : '—'} | dòng ${r._row}`));
    say('\n### 8 lượt Visiting Completed gần nhất (để chép đúng kiểu ghi)');
    mine.filter(r => r.typeAction === 'Visiting' && /complet/i.test(r.status)).slice(0, 8).forEach(r =>
      say(`  ${r.start} | ${r.account} | tt=${r.typeTask} | sp=${r.product} | proc=${r.process} | fb=${r.feedback} | next=${r.nextAction}\n     plan=${JSON.stringify(String(r.plan || '').slice(0, 120))}\n     result=${JSON.stringify(String(r.result || '').slice(0, 400))}`));
    return;
  }

  /* ───── GHI ───── */
  for (const k of ['product', 'process', 'feedback', 'nextAction', 'typeTask']) if (!val[k]) throw new Error('Chưa xác định được giá trị ' + k);
  say('Giá trị:', JSON.stringify(val));
  let okN = 0, skipN = 0, errN = 0;
  const nm = a => String(a || '').split('/')[0].trim().toLowerCase();
  for (const t of SPEC.tasks) {
    if (t.skip) { say(`- [${t.id}] ${t.label}: bỏ qua — ${t.skip}`); skipN++; continue; }
    const img = fs.readFileSync(path.join(DIR, 'khang-202609', t.id + '.jpg')).toString('base64');
    let data, rid;
    if (t.row) {                                       /* CẬP NHẬT dòng Khang đã có: chuyển Completed + ảnh, giữ kết quả đã viết */
      const ex = mine.find(r => r._row === t.row);
      if (!ex || String(ex.start).slice(0, 10) !== t.date || nm(ex.account) !== nm(t.acc)) { say(`- [${t.id}] ${t.label}: ✗ dòng ${t.row} không còn khớp (${ex ? ex.start + ' · ' + ex.account : 'không thấy'}) — không ghi`); errN++; continue; }
      if (ex.photo) { say(`- [${t.id}] ${t.label}: bỏ qua — dòng ${t.row} đã có ảnh`); skipN++; continue; }
      say(`- [${t.id}] trước khi sửa dòng ${ex._row}: ${JSON.stringify({ status: ex.status, typeTask: ex.typeTask, product: ex.product, process: ex.process, feedback: ex.feedback, nextAction: ex.nextAction, result: ex.result })}`);
      data = { _row: ex._row, _no: ex.no, _acc: ex.account, _pic: ex.pic, _start: String(ex.start).slice(0, 10),
               account: ex.account, start: String(ex.start).slice(0, 10), finish: String(ex.finish || ex.start).slice(0, 10),
               status: val.status, product: val.product, process: val.process, feedback: val.feedback, nextAction: val.nextAction, stopReason: '' };
      if (!String(ex.typeTask || '').trim()) data.typeTask = val.typeTask;
      if (!String(ex.result || '').trim()) data.result = SPEC.result;
      rid = `imp-khang-u${ex._row}-${t.date}`;
    } else {                                           /* TẠO MỚI */
      const c = cust.find(x => x.code === t.code);
      if (!c) { say(`- [${t.id}] ${t.label}: ✗ không có mã ${t.code}`); errN++; continue; }
      const account = [c.name, c.type, c.province, c.area].join('/');
      const dup = mine.find(r => String(r.start).slice(0, 10) === t.date && nm(r.account) === c.name.trim().toLowerCase() && r.typeAction === 'Visiting');
      if (dup) { say(`- [${t.id}] ${t.label} ${t.date}: bỏ qua — đã có dòng ${dup._row} (${dup.status}, ảnh ${dup.photo ? 'có' : 'chưa'})`); skipN++; continue; }
      data = { _row: 0, account, start: t.date, finish: t.date, pic: SPEC.pic,
               typeTask: val.typeTask, typeAction: val.typeAction, process: val.process, product: val.product,
               plan: SPEC.plan, result: SPEC.result, status: val.status, feedback: val.feedback, nextAction: val.nextAction, stopReason: '' };
      rid = `imp-khang-${t.date}-${t.code}`;
    }
    const r = await call(null, { action: 'saveWeekly', pic: SPEC.pic, push: '0', rid, data, photo: { b64: 'data:image/jpeg;base64,' + img, mime: 'image/jpeg' } });
    if (r && r.ok) { okN++; say(`- [${t.id}] ${t.label} ${t.date}: ✓ ${t.row ? 'cập nhật' : 'tạo'} dòng ${r.row} · No ${r.no || ''} · ảnh ${r.photo && r.photo.ok ? r.photo.name : '✗ ' + (r.photoError || JSON.stringify(r.photo || {}))}`); }
    else { errN++; say(`- [${t.id}] ${t.label} ${t.date}: ✗ ${JSON.stringify(r).slice(0, 400)}`); }
  }
  say(`\nKết quả: ghi ${okN} · bỏ qua ${skipN} · lỗi ${errN}`);
  if (okN) { const k = await call({ action: 'kpiPush' }); say('kpiPush:', JSON.stringify(k).slice(0, 300)); }
  if (errN) process.exitCode = 1;
}
main().catch(e => { say('✗', e.stack || e.message); process.exit(1); });
