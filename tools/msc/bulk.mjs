// TẢI HÀNG LOẠT + RÀ HÀNG HÓA (19/11/2026, MMH_WatchBulk.gs của tender-info). Chạy trong workflow "Theo dõi gói thầu — tải hàng loạt" (WT_BOT_KEY).
//   BULK_MODE=dry   ⇒ botGrabInv op=dry (chỉ đếm gói của chủ đầu tư khớp BULK_RE từ BULK_FROM)
//   BULK_MODE=run   ⇒ botGrabInv op=run (đưa vào hàng đợi tải; bot tender-dl tải dần)
//   BULK_MODE=goods ⇒ botGoodsScan theo tools/msc/kw-forceps-hook.json ⇒ goods-report.json + goods-report.csv (artifact)
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
const MODE = process.env.BULK_MODE || 'dry', RE = process.env.BULK_RE || 'mắt', FROM = process.env.BULK_FROM || '2026-01-01';
const WANT = process.env.BULK_WANT || 'tbmt,hsmt,mo,kq,nt,hh,qd', MAIL = process.env.BULK_MAIL || '';
const post = async (b) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: KEY }, b)), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { console.log('Phản hồi không phải JSON:', t.slice(0, 300)); }
    } catch (e) { console.log('Lỗi mạng:', e.message); }
    await new Promise(r => setTimeout(r, 5000 * (i + 1)));
  }
  return { ok: false, error: 'không gọi được máy chủ' };
};
if (!KEY) { console.log('Thiếu secret WT_BOT_KEY.'); process.exit(1); }

if (MODE === 'dry' || MODE === 'run') {
  const r = await post({ action: 'botGrabInv', op: MODE, re: RE, from: FROM, want: WANT, mail: MAIL, max: 5000 });
  if (!r.ok) { console.log('Lỗi:', JSON.stringify(r).slice(0, 500)); process.exit(1); }
  console.log(`Chủ đầu tư khớp "${RE}" · từ ${FROM} · ${r.total} gói (có kết quả ${r.byType.kqdt} · mới mời thầu ${r.byType.tbmt}) · tài liệu: ${r.want.join(', ')}`);
  console.log('Theo tháng:', JSON.stringify(r.byMonth));
  console.log('Đã có trong danh sách tải:', JSON.stringify(r.existing), '· gói mới:', r.fresh);
  console.log(`Chủ đầu tư (${r.byInv.length}):`);
  r.byInv.forEach(([n, c]) => console.log(`  ${String(c).padStart(4)}  ${n}`));
  console.log('Mẫu gói mới nhất:'); r.sample.forEach(s => console.log('  ' + s.join(' | ')));
  if (r.res) console.log('KẾT QUẢ ĐẶT TẢI:', JSON.stringify(r.res));
  fs.writeFileSync('bulk-report.json', JSON.stringify(r, null, 1));
  process.exit(0);
}

// ---------- rà hàng hóa
const K = JSON.parse(fs.readFileSync('tools/msc/kw-forceps-hook.json', 'utf8'));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (t, p) => (' ' + t + ' ').includes(' ' + norm(p) + ' ');
const G = K.groups, codes = Object.entries(K.codes).flatMap(([b, l]) => l.map(c => [b, c]));
const inc = [...G.forceps_strict, ...G.forceps_broad, ...G.hook_strict, ...G.hook_broad];
const r = await post({ action: 'botGoodsScan', inc, exc: K.exclude, codes: codes.map(x => x[1]), re: process.env.BULK_RE_GOODS || '' });
if (!r.ok) { console.log('Lỗi:', JSON.stringify(r).slice(0, 500)); process.exit(1); }
console.log(`File tổng hàng hóa: ${r.scanned} dòng · ${r.pkgs} gói · khớp sơ bộ ${r.n} dòng${r.cut ? ' (đã cắt 3.000)' : ''}`);
// phân loại lại CÓ DẤU (không dấu thì "kìm" = "kim" tiêm, "móc" = "mọc", "kẹp" = "kép"): máy chủ chỉ lọc sơ bộ
const vn = s => String(s ?? '').toLowerCase().normalize('NFC');
const hasV = (t, w) => new RegExp('(^|[^\\p{L}\\p{N}])' + vn(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}\\p{N}])', 'u').test(t);
const FW = ['forceps', 'forcep', 'panh', 'pince', 'kẹp', 'kìm'];
const VR = ['dịch kính', 'võng mạc', 'ilm', 'erm', 'nội nhãn', 'bóc màng', 'màng ngăn trong', 'màng giới hạn', 'vitreoretinal', 'vitreous', 'retina'];
const EYE = ['mắt', 'nhãn', 'glôcôm', 'glocom', 'glaucoma', 'tiền phòng', 'vùng bè', 'bè củng', 'schlemm', 'gonio', 'trabecul'];
const out = { A_forceps: [], A_hook: [], B_forceps: [], B_hook: [], code_hits: [], not_target: [], noise: 0 };
for (const x of r.rows) {
  const t = norm([x.item, x.hang, x.cfg].join(' ')), tv = vn([x.item, x.hang, x.cfg].join(' '));
  const code = codes.filter(([, c]) => has(t, c)).map(([b, c]) => b + ' ' + c);
  const row = Object.assign({}, x, { code });
  if (code.length) out.code_hits.push(row);
  if (G.forceps_strict.some(p => hasV(tv, p))) { out.A_forceps.push(row); continue; }
  if (G.hook_strict.some(p => hasV(tv, p))) { out.A_hook.push(row); continue; }
  if (K.not_target.some(p => hasV(tv, p))) { out.not_target.push(row); continue; }
  if (FW.some(p => hasV(tv, p)) && VR.some(p => hasV(tv, p))) { out.B_forceps.push(row); continue; }
  if ((hasV(tv, 'móc') || hasV(tv, 'hook')) && EYE.some(p => tv.includes(vn(p)))) { out.B_hook.push(row); continue; }
  if (!code.length) out.noise++;
}
for (const k of Object.keys(out)) if (Array.isArray(out[k])) console.log(`${k}: ${out[k].length} dòng`);
const show = (k, n = 60) => { console.log(`\n== ${k} ==`); out[k].slice(0, n).forEach(x => console.log(`  ${x.inv} | ${x.no} | ${x.item} | ${x.hang} | SL ${x.qty} | giá ${x.price} | ${x.win}${x.code && x.code.length ? ' | MÃ ' + x.code.join(', ') : ''}`)); };
['A_forceps', 'A_hook', 'code_hits', 'B_forceps', 'B_hook', 'not_target'].forEach(k => show(k));
fs.writeFileSync('goods-report.json', JSON.stringify(Object.assign({ scanned: r.scanned, pkgs: r.pkgs, mg: r.mg }, out), null, 1));
const csv = [['Nhóm', 'Chủ đầu tư', 'Tỉnh', 'Số TBMT', 'Tên gói', 'Phần / lô', 'Danh mục hàng hóa', 'Hãng', 'ĐVT', 'Khối lượng', 'Đơn giá', 'Thành tiền', 'Nhà thầu trúng', 'Mã đối thủ', 'Từ khoá']];
for (const k of ['A_forceps', 'A_hook', 'code_hits', 'B_forceps', 'B_hook', 'not_target'])
  for (const x of out[k]) csv.push([k, x.inv, x.prov, x.no, x.pkg, x.lot, x.item, x.hang, x.dvt, x.qty, x.price, x.amount, x.win, (x.code || []).join('; '), (x.kw || []).join('; ')]);
fs.writeFileSync('goods-report.csv', '﻿' + csv.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'));
