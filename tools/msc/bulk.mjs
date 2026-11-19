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

if (MODE === 'narrow' || MODE === 'narrow-dry') {
  const r = await post({ action: 'botGrabInv', op: 'narrow', want: process.env.BULK_WANT || 'kq,nt,hh,qd', dry: MODE === 'narrow-dry' ? 1 : 0 });
  console.log('THU HẸP HÀNG ĐỢI:', JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
}
if (MODE === 'dry' || MODE === 'run') {
  const r = await post({ action: 'botGrabInv', op: MODE, re: RE, from: FROM, want: WANT, mail: MAIL, max: 5000, types: process.env.BULK_TYPES || 'kqdt' });
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

// ---------- rà hàng hóa (kìm vi phẫu · móc mở vùng bè · hãng đối thủ) ⇒ log + goods-report.csv + tab "LỌC · KÌM VI PHẪU & MÓC" trong file tổng hàng hóa
const K = JSON.parse(fs.readFileSync('tools/msc/kw-forceps-hook.json', 'utf8'));
const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (t, p) => (' ' + t + ' ').includes(' ' + norm(p) + ' ');
// phân loại CÓ DẤU (không dấu thì "kìm" = "kim" tiêm, "móc" = "mọc", "kẹp" = "kép"): máy chủ chỉ lọc sơ bộ
const vn = s => String(s ?? '').toLowerCase().normalize('NFC');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasV = (t, w) => new RegExp('(^|[^\\p{L}\\p{N}])' + esc(vn(w)) + '($|[^\\p{L}\\p{N}])', 'u').test(t);
const G = K.groups, codes = Object.entries(K.codes).flatMap(([b, l]) => l.map(c => [b, c]));
const brandTerms = Object.entries(K.brands).flatMap(([b, l]) => l.map(t => [b, t]));
const inc = [...G.forceps_strict, ...G.forceps_broad, ...G.hook_strict, ...G.hook_broad];
const r = await post({ action: 'botGoodsScan', inc, exc: K.exclude, codes: codes.map(x => x[1]), brands: brandTerms.map(x => x[1]), re: process.env.BULK_RE_GOODS || '', max: 8000 });
if (!r.ok) { console.log('Lỗi:', JSON.stringify(r).slice(0, 500)); process.exit(1); }
console.log(`File tổng hàng hóa: ${r.scanned} dòng · ${r.pkgs} gói · khớp sơ bộ ${r.n} dòng${r.cut ? ' (đã cắt)' : ''}`);

const FW = ['forceps', 'forcep', 'panh', 'pince', 'kẹp', 'kìm'];
const VR = ['dịch kính', 'võng mạc', 'ilm', 'erm', 'nội nhãn', 'bóc màng', 'màng ngăn trong', 'màng giới hạn', 'vitreoretinal', 'vitreous', 'retina'];
const EYE = ['mắt', 'nhãn', 'glôcôm', 'glocom', 'glaucoma', 'tiền phòng', 'vùng bè', 'bè củng', 'schlemm', 'gonio', 'trabecul'];
// độ giống với 29 dòng kìm / panh bóc màng đã trúng thầu 2019 đến 2025 (Product Team): tỷ lệ từ chung, bỏ từ quá phổ biến
const STOP = new Set(['dung', 'trong', 'phau', 'thuat', 'cho', 'cac', 'loai', 'va', 'co', 'cai', 'chiec', 'bo', 'the', 'mot', 'lan', 'su']);
const toks = s => new Set(norm(s).split(' ').filter(w => w.length > 1 && !STOP.has(w)));
const HIST = K.history.map(h => ({ h, t: toks(h[4] + ' ' + h[3]) }));
const simOf = (txt) => {
  const t = toks(txt); let best = null, bs = 0;
  for (const x of HIST) { let c = 0; x.t.forEach(w => { if (t.has(w)) c++; }); const s = 2 * c / Math.max(x.t.size + t.size, 1); /* hệ số Dice */ if (s > bs) { bs = s; best = x.h; } }
  return { s: Math.round(bs * 100), h: best };
};
const LABEL = { A_forceps: '1 · Kìm / kẹp bóc màng (từ khoá chính)', A_hook: '2 · Móc mở vùng bè / MIGS (từ khoá chính)', code_hits: '3 · Mã đối thủ đã trúng trước', B_forceps: '4 · Kìm / kẹp có chữ dịch kính, võng mạc (xem tay)',
  C_brand_vr: '5 · Hãng đối thủ · hàng dịch kính võng mạc', B_hook: '6 · Móc / hook có chữ mắt (xem tay)', C_brand: '7 · Hãng đối thủ · sản phẩm khác', not_target: '8 · Loại trừ (không phải sản phẩm này)' };
const out = Object.fromEntries(Object.keys(LABEL).map(k => [k, []])); let noise = 0;
for (const x of r.rows) {
  const t = norm([x.item, x.hang, x.cfg].join(' ')), tv = vn([x.item, x.hang, x.cfg].join(' '));
  const code = codes.filter(([, c]) => has(t, c)).map(([b, c]) => b + ' ' + c);
  const brand = [...new Set(brandTerms.filter(([, b]) => has(norm(x.hang), b)).map(([b]) => b))];
  const sim = simOf(x.item + ' ' + x.cfg.slice(0, 200));
  const row = Object.assign({}, x, { code, brand, sim });
  const vrCtx = VR.some(p => hasV(tv, p));
  let g;
  if (code.length) g = 'code_hits';
  else if (G.forceps_strict.some(p => hasV(tv, p))) g = 'A_forceps';
  else if (G.hook_strict.some(p => hasV(tv, p))) g = 'A_hook';
  else if (K.not_target.some(p => hasV(tv, p))) g = 'not_target';
  else if (FW.some(p => hasV(tv, p)) && vrCtx) g = 'B_forceps';
  else if (brand.length && vrCtx) g = 'C_brand_vr';
  else if ((hasV(tv, 'móc') || hasV(tv, 'hook')) && EYE.some(p => tv.includes(vn(p)))) g = 'B_hook';
  else if (brand.length) g = 'C_brand';
  if (g) out[g].push(row); else noise++;
}
for (const k of Object.keys(LABEL)) console.log(`${LABEL[k]}: ${out[k].length} dòng`);
console.log('Không liên quan (bỏ):', noise);
const byBrand = {}; for (const k of ['A_forceps', 'code_hits', 'B_forceps', 'C_brand_vr', 'C_brand']) for (const x of out[k]) for (const b of (x.brand.length ? x.brand : ['(hãng khác)'])) { const o = byBrand[b] = byBrand[b] || { vr: 0, other: 0, inv: new Set() }; if (k === 'C_brand') o.other++; else { o.vr++; o.inv.add(x.inv); } }
console.log('\nTheo hãng (dòng hàng dịch kính / kìm · dòng khác · số CĐT có hàng dịch kính):');
Object.entries(byBrand).sort((a, b) => b[1].vr - a[1].vr).forEach(([b, o]) => console.log(`  ${b}: ${o.vr} · ${o.other} · ${o.inv.size}`));
const show = (k, n = 80) => { if (!out[k].length) return; console.log(`\n== ${LABEL[k]} ==`); out[k].slice(0, n).forEach(x => console.log(`  ${x.inv} | ${x.no} | ${x.item} | ${x.hang} | SL ${x.qty} | giá ${x.price} | ${x.win}${x.code.length ? ' | MÃ ' + x.code.join(', ') : ''}${x.sim.s >= 40 ? ' | giống ' + x.sim.s + '%: ' + x.sim.h[0] + ' ' + x.sim.h[2] + ' ' + x.sim.h[4] : ''}`)); };
['A_forceps', 'code_hits', 'A_hook', 'B_forceps', 'C_brand_vr', 'B_hook'].forEach(k => show(k));

const HEAD = ['Nhóm', 'Chủ đầu tư', 'Tỉnh', 'Số TBMT', 'Tên gói', 'Phần / lô', 'Danh mục hàng hóa', 'Hãng sản xuất', 'Hãng đối thủ', 'ĐVT', 'Khối lượng', 'Đơn giá trúng', 'Thành tiền', 'Nhà thầu trúng', 'Mã đối thủ khớp', 'Từ khoá khớp',
  'Giống dòng đã trúng trước (%)', 'Dòng đã trúng giống nhất (năm · CĐT · hãng · tên · đơn giá)', 'Cấu hình (rút gọn)'];
const rowsOut = [];
for (const k of Object.keys(LABEL)) for (const x of out[k].sort((a, b) => b.sim.s - a.sim.s))
  rowsOut.push([LABEL[k], x.inv, x.prov, x.no, x.pkg, x.lot, x.item, x.hang, x.brand.join(', '), x.dvt, x.qty, x.price, x.amount, x.win, x.code.join('; '), (x.kw || []).join('; '),
    x.sim.s, x.sim.h && x.sim.s >= 30 ? [x.sim.h[0], x.sim.h[1], x.sim.h[2], x.sim.h[4] + ' ' + x.sim.h[3], x.sim.h[7]].join(' · ') : '', String(x.cfg || '').slice(0, 300)]);
fs.writeFileSync('goods-report.json', JSON.stringify({ scanned: r.scanned, pkgs: r.pkgs, mg: r.mg, out }, null, 1));
fs.writeFileSync('goods-report.csv', '﻿' + [HEAD, ...rowsOut].map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'));
if (process.env.BULK_WRITE !== '0') {
  const note = `Lọc ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${r.scanned} dòng / ${r.pkgs} gói trong file tổng · từ khoá + mã đối thủ + hãng: tools/msc/kw-forceps-hook.json (mmh-backend). Nhóm 1-6 cần rà; 7-8 để đối chiếu.`;
  const w = await post({ action: 'botGoodsWrite', tab: 'LỌC · KÌM VI PHẪU & MÓC', head: HEAD, rows: rowsOut.slice(0, 20000), note });
  console.log('\nGhi tab Google Sheet:', w.ok ? `${w.n} dòng ⇒ ${w.url}` : JSON.stringify(w).slice(0, 300));
}
