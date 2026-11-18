// TÊN CHUNG (v2, 18/11/2026): đối chiếu tên chủ đầu tư (Báo Đấu Thầu / muasamcong) ⇄ khách CRM Surgical / Dental / Eyeless VN ⇄ danh mục cơ sở y tế
// (csyt.js của Tender Map = Working Map). KHÔNG sửa tên ở nguồn nào — kết quả ghi bảng riêng "TÊN CHUNG · ĐỐI CHIẾU" của tender-info (botNameSync).
// Bộ so tên = CHÍNH các hàm wn* của backends/tender-info/MMH_WatchNames.gs (nạp bằng vm) ⇒ giống hệt máy chủ.
// Chạy trong workflow "Theo dõi gói thầu — đối chiếu tên" (WT_BOT_KEY). NAMES_MODE=report ⇒ chỉ in báo cáo, không ghi.
import fs from 'node:fs';
import vm from 'node:vm';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const KEY = process.env.WT_BOT_KEY, MODE = process.env.NAMES_MODE || 'sync';
const W = { console };
vm.createContext(W);
vm.runInContext(fs.readFileSync('backends/tender-info/MMH_WatchNames.gs', 'utf8'), W);
try { vm.runInContext(fs.readFileSync('backends/crm-surgical/MMH_AccNames.gs', 'utf8'), W); } catch (e) { console.log('Không đọc được tên chuẩn Surgical:', e.message); }
const STD = W.VM_STD || {};
const get = async (u) => { const r = await fetch(u, { redirect: 'follow' }); return r.text(); };
const post = async (u, b) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), redirect: 'follow' }); return JSON.parse(await r.text()); };

const T = await post(B['tender-info'].url, { action: 'botNames', key: KEY });
if (!T.ok) { console.log('botNames lỗi:', JSON.stringify(T).slice(0, 300)); process.exit(1); }
const IX = W.wnIndex_(T.inv);
console.log('Chủ đầu tư Báo Đấu Thầu:', IX.all.length, '· có tỉnh:', IX.all.filter(x => x.p).length);

// quyết định đã có (người dùng bấm Đúng / Không phải) ⇒ giữ, và dùng cho khách cùng tên + tỉnh ở nguồn khác
const DEC = T.dec || [], okBy = {}, noBy = {};
const ek = (name, prov) => W.wnKey_(name) + '|' + (W.wnProv_(prov) || W.wnProv_(name));
DEC.forEach(d => { const k = ek(d[2], d[3]); if (d[4] === 'ok' && d[5]) okBy[k] = d[5]; else (noBy[k] = noBy[k] || []).push(...(d[6] || [])); });
console.log('Quyết định của người dùng:', DEC.length);

// danh mục cơ sở y tế
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(await get('https://manimedicalhanoi.github.io/Tender-Result/map/csyt.js'), ctx);
const C = ctx.window.CSYT, ix = {}; C.cols.forEach((c, i) => ix[c] = i);
const FAC = C.rows.map(r => ({ id: r[ix.id], n: r[ix.n], alias: String(r[ix.alias] || '').split('|').filter(Boolean), p: W.wnProv_(r[ix.p]) || W.wnProv_(r[ix.o]), o: r[ix.o], t: r[ix.t] }));
const facBy = {}; FAC.forEach(f => [f.n, ...f.alias].forEach(n => { const k = W.wnKey_(n); if (k.length >= 6) (facBy[k] = facBy[k] || []).push(f); }));
const facOf = (names, prov) => { const P = W.wnProv_(prov) || names.map(n => W.wnProv_(n)).find(Boolean) || '';
  for (const n of names) { const L = (facBy[W.wnKey_(n)] || []).filter(f => !P || !f.p || f.p === P); if (L.length === 1) return L[0]; } return null; };

const rows = [], stat = {};
const add = (src, e, extra) => {
  const k = ek(e.name, e.prov), r = W.wnMatch_(IX, { name: e.name, alt: e.alt, prov: e.prov, no: noBy[k] || [], ok: okBy[k] || '' });
  rows.push(Object.assign({ src, code: e.code, name: e.name, prov: e.prov, type: e.type || '', pic: e.pic || '', inv: r.st === 'none' ? '' : r.inv, also: r.also || [], score: r.score, how: r.how, st: r.st, cands: r.cands }, extra || {}));
  const s = stat[src] = stat[src] || { total: 0, auto: 0, ask: 0, none: 0 }; s.total++; s[r.st]++;
};
// 1. danh mục cơ sở y tế
FAC.forEach(f => add('csyt', { code: f.id, name: f.n, alt: f.alias, prov: f.o || f.p, type: f.t }));
// 2. khách CRM 3 nhóm VN (tên giữ nguyên — tên chuẩn Surgical + tên danh mục chỉ dùng thêm để so)
for (const team of ['surgical', 'dental', 'eyeless']) {
  const k = 'crm-' + team; if (!B[k] || !B[k].url) continue;
  let L = [];
  try { const j = JSON.parse(await get(B[k].url + '?action=customerIndex')); L = j.rows || []; } catch (e) { console.log(k, 'lỗi đọc customerIndex:', e.message); continue; }
  L.filter(c => c.code && c.name).forEach(c => {
    const alt = []; if (team === 'surgical' && STD[c.code]) alt.push(STD[c.code][0]);
    const f = facOf([c.name, ...alt], c.province); if (f) alt.push(f.n, ...f.alias);
    add(k, { code: c.code, name: c.name, alt, prov: c.province, type: c.type, pic: c.pic }, f ? { csyt: f.id, csytName: f.n } : {});
  });
}
console.log('\nKết quả đối chiếu (tự khớp · cần xác nhận · chưa thấy):');
for (const s in stat) console.log(' ', s.padEnd(13), JSON.stringify(stat[s]));
const ask = rows.filter(r => r.st === 'ask' && r.src !== 'csyt');
console.log('\n— Khách CRM cần xác nhận (' + ask.length + '):');
ask.slice(0, 80).forEach(r => console.log('  ' + r.src.replace('crm-', '') + ' · ' + r.code + ' · ' + r.name + ' (' + r.prov + ')  ⇒  ' + r.cands.map(c => c[0] + ' [' + c[1] + ']').join('  |  ')));
console.log('\n— Ví dụ tự khớp:');
rows.filter(r => r.st === 'auto' && r.src !== 'csyt' && r.how !== 'tên trùng').slice(0, 40).forEach(r => console.log('  ' + r.src.replace('crm-', '') + ' · ' + r.name + ' (' + r.prov + ')  ⇒  ' + r.inv + '  · ' + r.how));
fs.writeFileSync('names-report.json', JSON.stringify({ at: new Date().toISOString(), stat, ask, rows: rows.filter(r => r.src !== 'csyt') }, null, 1));

if (MODE !== 'sync') { console.log('\n(NAMES_MODE=' + MODE + ' — không ghi)'); process.exit(0); }
let n = 0, last = null;
for (let i = 0; i < rows.length; i += 500) {
  let r = null;
  for (let t = 0; t < 4; t++) { try { r = await post(B['tender-info'].url, { action: 'botNameSync', key: KEY, rows: rows.slice(i, i + 500) }); if (r.ok) break; } catch (e) { r = { ok: false, error: e.message }; } await new Promise(z => setTimeout(z, 4000 * (t + 1))); }
  if (!r || !r.ok) { console.log('botNameSync lỗi ở dòng', i, JSON.stringify(r).slice(0, 300)); process.exit(1); }
  n += r.add + r.upd + r.keep; last = r;
}
console.log('\nĐã ghi bảng đối chiếu:', n, 'dòng · tổng', last && last.total, '· trạng thái', JSON.stringify(last && last.stat));
