// RÀ HÀNG HÓA TRÚNG THẦU THEO BỘ TỪ KHOÁ (chỉ đọc) — workflow "Theo dõi gói thầu — tải hàng loạt" mode find.
//   BULK_RE = tên file từ khoá trong tools/msc (mặc định kw-gonio.json: {inc:[…], brands:[…], exc:[…]}) ⇒ botGoodsScan ⇒ in log + find-report.json / .csv (artifact bulk-report)
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
if (!KEY) { console.log('Thiếu secret WT_BOT_KEY.'); process.exit(1); }
const f = /^kw-[\w-]+\.json$/.test(process.env.BULK_RE || '') ? process.env.BULK_RE : 'kw-gonio.json';
const K = JSON.parse(fs.readFileSync('tools/msc/' + f, 'utf8'));
let r = null;
for (let i = 0; i < 4 && !(r && r.ok); i++) {
  try {
    const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'follow',
      body: JSON.stringify({ key: KEY, action: 'botGoodsScan', inc: K.inc || [], exc: K.exc || [], codes: K.codes || [], brands: K.brands || [], max: 8000 }) });
    const t = await res.text(); try { r = JSON.parse(t); } catch (e) { console.log('Phản hồi:', t.slice(0, 300)); }
  } catch (e) { console.log('Lỗi mạng:', e.message); }
  if (!(r && r.ok)) await new Promise(s => setTimeout(s, 6000 * (i + 1)));
}
if (!r || !r.ok) { console.log('Lỗi:', JSON.stringify(r).slice(0, 500)); process.exit(1); }
console.log(`Bộ từ khoá ${f} · file tổng: ${r.scanned} dòng · ${r.pkgs} gói · khớp ${r.n} dòng${r.cut ? ' (đã cắt)' : ''}`);
fs.writeFileSync('find-report.json', JSON.stringify(r, null, 1));
const H = ['inv', 'prov', 'pkg', 'no', 'lot', 'win', 'item', 'hang', 'dvt', 'qty', 'price', 'amount', 'kw', 'brand', 'cfg'];
const q = v => '"' + String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""') + '"';
fs.writeFileSync('find-report.csv', '﻿' + [H.join(','), ...r.rows.map(x => H.map(h => q(x[h])).join(','))].join('\n'));
const cut = s => String(s ?? '').replace(/\s+/g, ' ').slice(0, 260);
r.rows.forEach((x, i) => console.log(`#${i + 1} ‖ ${x.no} ‖ ${x.inv} ‖ ${x.prov} ‖ ${cut(x.pkg)} ‖ lô ${cut(x.lot)} ‖ ${cut(x.item)} ‖ hãng ${cut(x.hang)} ‖ ${x.dvt} ‖ SL ${x.qty} ‖ ĐG ${x.price} ‖ TT ${x.amount} ‖ NT ${cut(x.win)} ‖ kw ${(x.kw || []).join('/')} ${(x.brand || []).join('/')} ‖ cfg ${cut(x.cfg)}`));
