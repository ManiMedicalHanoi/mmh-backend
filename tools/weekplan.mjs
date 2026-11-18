/* Chỉ ĐỌC: kế hoạch làm việc trong tuần của mọi thành viên (Report Hub Marketing + CRM Sales).
 * node tools/weekplan.mjs [yyyy-mm-dd thứ Hai]  — in dòng gọn ra log (dùng cho Claude tổng hợp). */
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync(new URL('../backends.json', import.meta.url)));
const vn = new Date(Date.now() + 7 * 3600e3);
let mon = process.argv[2];
if (!mon) { const d = new Date(vn); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); mon = d.toISOString().slice(0, 10); }
const sunD = new Date(mon + 'T00:00:00Z'); sunD.setUTCDate(sunD.getUTCDate() + 6);
const sun = sunD.toISOString().slice(0, 10), today = vn.toISOString().slice(0, 10);
const iso = (v) => { v = String(v || '').trim(); let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return ''; };
const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
async function get(key, q) {
  const b = cfg[key]; if (!b?.url) return { err: 'không có URL' };
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(b.url + q, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
      const t = await r.text(); try { return JSON.parse(t); } catch { return { err: 'không phải JSON: ' + cut(t.replace(/<[^>]+>/g, ' '), 200) }; }
    } catch (e) { if (i === 2) return { err: e.message }; }
  }
}
const done = (s) => /complet|done|hoàn thành|xong|finish/i.test(s), cancel = (s) => /cancel|huỷ|hủy|dừng/i.test(s);
console.log(`=== TUẦN ${mon} → ${sun} · hôm nay ${today}`);
/* Report Hub: key + sub có khoảng [start, hạn] giao tuần; quá hạn chưa xong */
function rh(name, keys) {
  const out = [], od = [];
  for (const k of keys || []) {
    const items = (k.subs && k.subs.length) ? k.subs.map((s) => ({ ...s, _k: k.keyTask, type: s.type || k.type })) : [{ ...k, _k: k.keyTask, _self: 1 }];
    for (const s of items) {
      const st = iso(s.start), due = iso(s.revised) || iso(s.planned) || st, pic = s.pic || k.pic || '(trống)';
      if (cancel(s.status)) continue;
      const nm = s._self ? s._k : `${s._k} › ${s.subTask || s.name}`;
      if (st && st <= sun && due >= mon) out.push([pic, st, due, s.status || '', s.progress ?? '', s.type || '', cut(nm, 140), cut(s.result, 120)]);
      else if (due && due < mon && !done(s.status) && due >= '2026-09-01') od.push([pic, due, s.status || '', cut(nm, 110)]);
    }
  }
  out.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  console.log(`\n### ${name} — trong tuần ${out.length} việc`);
  for (const r of out) console.log(`T|${r.join('|')}`);
  const c = {}; od.forEach((r) => { c[r[0]] = (c[r[0]] || 0) + 1; });
  console.log(`OD|${name}|` + Object.entries(c).map(([p, n]) => `${p}=${n}`).join(', '));
  od.sort((a, b) => a[0].localeCompare(b[0]) || b[1].localeCompare(a[1]));
  for (const r of od.slice(0, 80)) console.log(`O|${r.join('|')}`);
}
for (const k of ['marketing']) {
  const d = await get(k, '?action=weekly&fresh=1');
  if (!d || d.err || !d.ok) console.log(`\n### ${k}: LỖI ${d?.err || d?.error}`); else rh(`RH ${k}`, d.keyTasks);
}
const CRM = ['crm-dental', 'crm-surgical', 'crm-eyeless', 'crm-thai', 'crm-thai-dental'];
for (const k of CRM) {
  const d = await get(k, `?action=visitFeed&from=${mon}&to=${sun}`);
  if (!d || d.err || !d.ok) { console.log(`\n### ${k} visitFeed: LỖI ${d?.err || d?.error}`); }
  else {
    const rows = (d.rows || []).filter((r) => !/^TEST/i.test(r.pic || ''));
    rows.sort((a, b) => String(a.pic).localeCompare(String(b.pic)) || String(iso(a.start)).localeCompare(String(iso(b.start))));
    console.log(`\n### ${k} — đi địa bàn / hoạt động khách hàng: ${rows.length} lượt`);
    for (const r of rows) console.log(`V|${r.pic}|${iso(r.start)}|${iso(r.finish)}|${r.status || ''}|${r.typeAction || r.typeTask || ''}|${cut(r.accName || r.account, 60)}|${r.accProv || ''}|${cut(r.plan, 110)}|${cut(r.result, 80)}`);
  }
  const a = await get(k, '?action=weekly&at=1');
  if (!a || a.err || !a.ok) console.log(`### ${k} ALL TASK: LỖI ${a?.err || a?.error}`); else rh(`${k} công việc khác`, a.keyTasks);
}
console.log('\n=== XONG');
