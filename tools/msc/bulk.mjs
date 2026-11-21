// TẢI HÀNG LOẠT + RÀ HÀNG HÓA (19/11/2026, MMH_WatchBulk.gs của tender-info). Chạy trong workflow "Theo dõi gói thầu — tải hàng loạt" (WT_BOT_KEY).
//   BULK_MODE=dry   ⇒ botGrabInv op=dry (chỉ đếm gói của chủ đầu tư khớp BULK_RE từ BULK_FROM)
//   BULK_MODE=run   ⇒ botGrabInv op=run (đưa vào hàng đợi tải; bot tender-dl tải dần)
//   BULK_MODE=knife(-dry) ⇒ mọi bệnh viện từng có KQTT dao nhãn khoa (kqttMap) ⇒ botGrabInv invs (gói đã tải bỏ qua)
//   BULK_MODE=targets(-dry) ⇒ lưu BV có KQTT dao làm ĐỊA BÀN MMH (botTargets) + xem trước tồn đọng; BULK_BACKLOG=1 ⇒ đặt tải tồn đọng
//   BULK_MODE=sum ⇒ ghi ngay tab "Tổng hợp gói thầu" · BULK_MODE=scan ⇒ thử bộ từ khoá trên chữ BULK_RE
//   BULK_MODE=auto(-dry|-status) ⇒ botGrabInv op=auto (gói vật tư mới hằng ngày — máy chủ tự chạy ở wtTick)
//   BULK_PRI = mức ưu tiên (0 địa bàn đã trao đổi · 1 gói mới hằng ngày · 3 tồn đọng "tải sau")
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
// ---------- knife / knife-dry: mọi bệnh viện từng có KQTT dao nhãn khoa (file tender tổng "Data xử lý", đọc qua tender-hungvi ?action=kqttMap)
//   ⇒ tên chủ đầu tư Báo Đấu Thầu (so bằng chính wn* của MMH_WatchNames.gs) ⇒ botGrabInv invs=[…] (gói đã tải / đang chờ ⇒ wtReq_ bỏ qua, không tải lặp)
if (MODE === 'knife' || MODE === 'knife-dry' || MODE === 'targets' || MODE === 'targets-dry') {
  const vm = await import('node:vm');
  const W = { console }; vm.createContext(W);
  vm.runInContext(fs.readFileSync('backends/tender-info/MMH_WatchNames.gs', 'utf8'), W);
  const kq = JSON.parse(await (await fetch(B['tender-hungvi'].url + '?action=kqttMap&from=' + (process.env.KNIFE_FROM || '201901'), { redirect: 'follow' })).text());
  if (!kq.ok) { console.log('kqttMap lỗi:', JSON.stringify(kq).slice(0, 300)); process.exit(1); }
  const ci = Object.fromEntries(kq.cols.map((c, i) => [c, i])), buy = {};
  kq.rows.forEach(r => { const n = String(r[ci.buyer] || '').normalize('NFC').replace(/\s+/g, ' ').trim(); if (!n) return; const b = buy[n] = buy[n] || { n, prov: '', rows: 0, last: '' }; b.rows++; if (!b.prov && r[ci.prov]) b.prov = String(r[ci.prov]); const m = String(r[ci.month] || ''); if (m > b.last) b.last = m; });
  const BUY = Object.values(buy);
  console.log(`KQTT dao nhãn khoa: ${kq.rows.length} dòng · ${BUY.length} chủ đầu tư (từ ${process.env.KNIFE_FROM || '201901'})`);
  const T = await post({ action: 'botNames' });
  if (!T.ok) { console.log('botNames lỗi:', JSON.stringify(T).slice(0, 300)); process.exit(1); }
  const IX = W.wnIndex_(T.inv), exact = {};
  T.inv.forEach(r => { const n = String(r[0] || '').normalize('NFC').replace(/\s+/g, ' ').trim(); if (n) exact[n] = 1; });
  const pick = new Set(), how = { exact: 0, key: 0, auto: 0, ask: 0, none: 0 }, ask = [], none = [];
  for (const b of BUY) {
    if (exact[b.n]) { pick.add(b.n); how.exact++; continue; }
    const k = W.wnKey_(b.n), P = W.wnProv_(b.prov) || W.wnProv_(b.n), same = (IX.byKey[k] || []).filter(x => !P || !x.p || x.p === P);
    if (k.length >= 8 && same.length) { same.forEach(x => pick.add(x.name)); how.key++; continue; }
    const m = W.wnMatch_(IX, { name: b.n, prov: b.prov });
    if (m.st === 'auto') { pick.add(m.inv); (m.also || []).forEach(a => pick.add(a)); how.auto++; }
    else if (m.st === 'ask') { how.ask++; ask.push(b.n + ' (' + b.prov + ') ⇒ ' + m.cands.map(c => c[0] + ' [' + c[1] + ']').join(' | ')); }
    else { how.none++; none.push(b.n + ' (' + b.prov + ', ' + b.rows + ' dòng, gần nhất ' + b.last + ')'); }
  }
  console.log('Đối chiếu tên:', JSON.stringify(how), '⇒', pick.size, 'tên chủ đầu tư Báo Đấu Thầu');
  if (ask.length) { console.log('\nChưa chắc (KHÔNG đưa vào, ' + ask.length + '):'); ask.forEach(x => console.log('  ' + x)); }
  if (none.length) { console.log('\nKhông thấy trên Báo Đấu Thầu (' + none.length + '):'); none.forEach(x => console.log('  ' + x)); }
  const X = JSON.parse(fs.readFileSync('tools/msc/knife-extra.json', 'utf8'));
  let nAdd = 0; (X.add || []).forEach(n => { if (exact[n.normalize('NFC').replace(/\s+/g, ' ').trim()] && !pick.has(n)) { pick.add(n); nAdd++; } else if (!exact[n.normalize('NFC').replace(/\s+/g, ' ').trim()]) console.log('  (tên lọc tay không có trên Báo Đấu Thầu:', n + ')'); });
  console.log('Thêm từ danh sách lọc tay:', nAdd, '⇒ tổng', pick.size, 'tên chủ đầu tư');
  // ĐỊA BÀN MMH (MMH_WatchTarget.gs): lưu danh sách BV có KQTT dao lên máy chủ ⇒ lượt tự tải hằng ngày lấy TBMT + Kết quả của các BV này
  if (MODE === 'knife' || MODE === 'targets') {
    const t = await post({ action: 'botTargets', src: 'kqtt-dao', names: [...pick], note: 'bulk.mjs ' + MODE + ' · KQTT từ ' + (process.env.KNIFE_FROM || '201901') });
    console.log('\nLƯU ĐỊA BÀN MMH (BV có KQTT dao):', JSON.stringify(t));
    if (!t.ok) process.exit(1);
  }
  if (MODE === 'targets' || MODE === 'targets-dry') {
    // tồn đọng của mọi địa bàn MMH (BV mắt · Răng Hàm Mặt / nha khoa · khách CRM Surgical + Dental · BV có KQTT dao): Kết quả từ FROM + TBMT ≤ 45 ngày
    const r = await post({ action: 'botGrabInv', op: 'targets', from: FROM, run: MODE === 'targets' && process.env.BULK_BACKLOG === '1' ? 1 : 0 });
    console.log('\nĐỊA BÀN MMH — TỒN ĐỌNG' + (r.res ? ' (ĐÃ ĐẶT TẢI)' : ' (xem trước)') + ':', JSON.stringify(r, null, 1));
    fs.writeFileSync('bulk-report.json', JSON.stringify({ how, pick: [...pick], ask, none, r }, null, 1));
    process.exit(r.ok ? 0 : 1);
  }
  const r = await post({ action: 'botGrabInv', op: MODE === 'knife' ? 'run' : 'dry', invs: [...pick], nameInc: X.nameInc, nameExc: X.nameExc, nameStrong: X.nameStrong, from: FROM, want: process.env.BULK_WANT || 'kq,nt,hh,qd', mail: MAIL, max: 5000, types: process.env.BULK_TYPES || 'kqdt' });
  if (!r.ok) { console.log('Lỗi:', JSON.stringify(r).slice(0, 500)); process.exit(1); }
  console.log(`\nGói từ ${FROM}: ${r.total} (có kết quả ${r.byType.kqdt} · mới mời thầu ${r.byType.tbmt}) · tài liệu: ${r.want.join(', ')}`);
  console.log('Theo tháng:', JSON.stringify(r.byMonth));
  console.log('Đã có trong danh sách tải (không tải lặp):', JSON.stringify(r.existing), '· gói mới:', r.fresh);
  console.log(`Chủ đầu tư có gói (${r.byInv.length}):`); r.byInv.forEach(([n, c]) => console.log(`  ${String(c).padStart(4)}  ${n}`));
  if (r.res) console.log('KẾT QUẢ ĐẶT TẢI:', JSON.stringify(r.res));
  fs.writeFileSync('bulk-report.json', JSON.stringify({ how, pick: [...pick], ask, none, r }, null, 1));
  process.exit(0);
}
if (MODE === 'sum') {
  const r = await post({ action: 'botGrabInv', op: 'sum' });
  console.log('TỔNG HỢP GÓI THẦU:', JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}
if (MODE === 'errs') {
  const r = await post({ action: 'botGrabInv', op: 'errs' });
  console.log('GÓI LỖI / CHỜ TẢI:', JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}
if (MODE === 'sumheal') {   // dọn dòng "cần Agent" đã tải xong ở tab Tài liệu
  const r = await post({ action: 'botGrabInv', op: 'sumheal' });
  console.log('DỌN TAB TÀI LIỆU:', JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
}
if (MODE === 'scan') {   // thử bộ từ khoá: BULK_RE = đoạn chữ
  const r = await post({ action: 'botGrabInv', op: 'scan', text: process.env.BULK_RE || '' });
  console.log('TỪ KHOÁ:', JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}
if (MODE === 'auto' || MODE === 'auto-dry' || MODE === 'auto-status') {
  const r = await post(MODE === 'auto-status' ? { action: 'botGrabInv', op: 'autoStatus' } : { action: 'botGrabInv', op: 'auto', dry: MODE === 'auto-dry' ? 1 : 0, from: process.env.BULK_AUTO_FROM || '' });
  console.log('TỰ ĐẶT TẢI HẰNG NGÀY (gói vật tư: Kết quả ⇒ bot cloud · TBMT / KHLCNT ⇒ máy có Agent):', JSON.stringify(r, null, 1));
  process.exit(r.ok ? 0 : 1);
}
if (MODE === 'dry' || MODE === 'run') {
  // BULK_NAMEF=vt ⇒ chỉ gói vật tư / dụng cụ (bộ lọc tên gói của tools/msc/knife-extra.json)
  const NF = process.env.BULK_NAMEF === 'vt' ? JSON.parse(fs.readFileSync('tools/msc/knife-extra.json', 'utf8')) : {};
  const r = await post({ action: 'botGrabInv', op: MODE, re: RE, from: FROM, to: process.env.BULK_TO || '', want: WANT, mail: MAIL, max: 8000, types: process.env.BULK_TYPES || 'kqdt', pri: process.env.BULK_PRI || '',
    nameInc: NF.nameInc || '', nameExc: NF.nameExc || '', nameStrong: NF.nameStrong || '' });
  if (process.env.BULK_NAMEF === 'vt') console.log('Lọc tên gói: chỉ vật tư / dụng cụ (bỏ thuốc, hóa chất, máy, sửa chữa, dịch vụ…)');
  if (!r.ok) { console.log('Lỗi:', JSON.stringify(r).slice(0, 500)); process.exit(1); }
  console.log(`Chủ đầu tư khớp "${RE}" · từ ${FROM} · ${r.total} gói (có kết quả ${r.byType.kqdt} · mới mời thầu ${r.byType.tbmt}) · tài liệu: ${r.want.join(', ')}`);
  console.log('Theo tháng:', JSON.stringify(r.byMonth));
  console.log('Đã có trong danh sách tải:', JSON.stringify(r.existing), '· gói mới:', r.fresh);
  console.log(`Chủ đầu tư (${r.byInv.length}):`);
  r.byInv.slice(0, +process.env.BULK_TOPN || 9999).forEach(([n, c]) => console.log(`  ${String(c).padStart(4)}  ${n}`));
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
