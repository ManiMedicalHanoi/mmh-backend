// Đối chiếu tên chủ đầu tư / cơ sở y tế giữa: Báo Đấu Thầu (app Theo dõi gói thầu) · file tổng hàng hóa trúng thầu · danh mục cơ sở y tế
// (csyt.js của Tender Map = Working Map) · khách CRM Surgical / Dental / Eyeless VN. CHỈ ĐỌC — in số liệu + danh sách chưa khớp.
// Chạy trong workflow "Theo dõi gói thầu — đối chiếu tên" (cần WT_BOT_KEY). Kết quả: names-report.json (artifact).
import fs from 'node:fs';
import vm from 'node:vm';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const KEY = process.env.WT_BOT_KEY;
const get = async (u) => { const r = await fetch(u, { redirect: 'follow' }); return r.text(); };
const post = async (u, b) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), redirect: 'follow' }); return JSON.parse(await r.text()); };
const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/\s+/g, ' ');
const fkey = s => fold(s).replace(/\bbvdk\b/g, 'benh vien da khoa').replace(/\bbv\b/g, 'benh vien').replace(/\bttyt\b/g, 'trung tam y te').replace(/\bdk\b/g, 'da khoa').replace(/\btw\b/g, 'trung uong').replace(/\b(tinh|thanh pho|tp)\b/g, ' ').replace(/[^a-z0-9]/g, '');
const pick = (o, ks) => { for (const k of ks) if (o[k] != null && o[k] !== '') return o[k]; return ''; };

const T = await post(B['tender-info'].url, { action: 'botNames', key: KEY });
if (!T.ok) { console.log('botNames lỗi:', JSON.stringify(T).slice(0, 300)); process.exit(1); }
const src = await get('https://manimedicalhanoi.github.io/Tender-Result/map/csyt.js');
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx);
const C = ctx.window.CSYT, ix = {}; C.cols.forEach((c, i) => ix[c] = i);
const cs = {}, csN = C.rows.length;
C.rows.forEach(r => { [r[ix.n]].concat(String(r[ix.alias] || '').split('|')).map(fkey).filter(Boolean).forEach(k => { if (!cs[k]) cs[k] = r; }); });
const inv = T.inv.map(r => ({ name: r[0], n: (+r[1] || 0) + (+r[2] || 0) + (+r[3] || 0), prov: r[5] }));
const invK = {}; inv.forEach(x => { invK[fkey(x.name)] = x; });
const out = { at: new Date().toISOString(), csyt: csN, inv: { total: inv.length }, goods: {}, crm: {} };

const mInv = inv.filter(x => cs[fkey(x.name)]);
out.inv.inCsyt = mInv.length;
out.inv.pkgInCsyt = mInv.reduce((a, x) => a + x.n, 0); out.inv.pkgTotal = inv.reduce((a, x) => a + x.n, 0);
out.inv.topMissing = inv.filter(x => !cs[fkey(x.name)]).sort((a, b) => b.n - a.n).slice(0, 60).map(x => x.name + ' · ' + x.prov + ' · ' + x.n + ' gói');

const gd = T.goods.map(r => ({ name: r[0], prov: r[1], n: r[2] }));
out.goods.total = gd.length;
out.goods.inInv = gd.filter(x => invK[fkey(x.name)]).length;
out.goods.inCsyt = gd.filter(x => cs[fkey(x.name)]).length;
out.goods.missingInv = gd.filter(x => !invK[fkey(x.name)]).slice(0, 40).map(x => x.name + ' · ' + x.prov);

for (const team of ['crm-surgical', 'crm-dental', 'crm-eyeless']) {
  if (!B[team] || !B[team].url) continue;
  let rows = [];
  try { const j = JSON.parse(await get(B[team].url + '?action=customerIndex')); rows = j.rows || []; } catch (e) { out.crm[team] = { error: String(e.message || e) }; continue; }
  const pub = rows.filter(r => /benh vien|trung tam|ttyt|bv|so y te|hospital/.test(fold(r.name + ' ' + r.type)));
  const R = { total: rows.length, hospitalLike: pub.length };
  R.inCsyt = pub.filter(r => cs[fkey(r.name)]).length;
  R.inInv = pub.filter(r => invK[fkey(r.name)]).length;
  R.sampleMissing = pub.filter(r => !cs[fkey(r.name)] && !invK[fkey(r.name)]).slice(0, 40).map(r => r.name + ' · ' + r.type + ' · ' + r.province);
  // gợi ý: tên CRM nằm trọn trong tên chủ đầu tư (hoặc ngược lại) cùng tỉnh
  R.near = pub.filter(r => !invK[fkey(r.name)]).map(r => { const k = fkey(r.name); if (k.length < 10) return null; const hit = inv.find(x => { const a = fkey(x.name); return a !== k && (a.includes(k) || k.includes(a)) && (!r.province || fold(x.prov).includes(fold(r.province).slice(0, 5))); }); return hit ? r.name + '  ⇔  ' + hit.name : null; }).filter(Boolean).slice(0, 30);
  out.crm[team] = R;
}
out.watches = (T.watches || []).map(w => w + (cs[fkey(w)] ? '' : '  (chưa có trong danh mục cơ sở y tế)'));
fs.writeFileSync('names-report.json', JSON.stringify(out, null, 1));
const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
console.log('Danh mục cơ sở y tế (Tender Map / Working Map):', csN);
console.log('Chủ đầu tư Báo Đấu Thầu:', inv.length, '· khớp danh mục:', out.inv.inCsyt, pc(out.inv.inCsyt, inv.length), '· theo số gói:', pc(out.inv.pkgInCsyt, out.inv.pkgTotal));
console.log('CĐT trong file tổng hàng hóa:', gd.length, '· trùng tên Báo Đấu Thầu:', out.goods.inInv, '· khớp danh mục:', out.goods.inCsyt);
for (const t in out.crm) { const R = out.crm[t]; console.log(t, JSON.stringify({ total: R.total, bv: R.hospitalLike, csyt: R.inCsyt, inv: R.inInv, error: R.error })); }
console.log('\n— CĐT nhiều gói chưa có trong danh mục:\n' + out.inv.topMissing.slice(0, 30).join('\n'));
console.log('\n— CĐT file tổng hàng hóa không trùng tên Báo Đấu Thầu:\n' + out.goods.missingInv.slice(0, 20).join('\n'));
for (const t in out.crm) { const R = out.crm[t]; if (R.sampleMissing) console.log('\n— ' + t + ' chưa khớp:\n' + R.sampleMissing.slice(0, 25).join('\n') + '\n  gần giống:\n  ' + (R.near || []).join('\n  ')); }
console.log('\n— Đang theo dõi:\n' + out.watches.join('\n'));
