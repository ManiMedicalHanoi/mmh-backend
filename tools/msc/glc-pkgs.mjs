// ĐẶT TẢI PHẦN CÒN THIẾU + LẤY PHÂN TÍCH NHÀ THẦU cho 1 danh sách gói — workflow "Theo dõi gói thầu — tải hàng loạt" mode pkgs.
//   BULK_RE = "nos=IB…,IB…[&prio=0][&fetch=0]" ⇒ mỗi gói botRoute op=pkg (thiếu phần nào ⇒ tự đặt tải, bot cloud) + html phân tích (nhà thầu, giá, lý do)
//   ⇒ botTT57 op=hits (file đã có / file cần Agent) ⇒ botTT57 op=prio (ưu tiên file cần Agent của các gói này). In log + pkgs-report.json.
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
if (!KEY) { console.log('Thiếu secret WT_BOT_KEY.'); process.exit(1); }
const Q = Object.fromEntries(new URLSearchParams(process.env.BULK_RE || ''));
const nos = [...new Set(String(Q.nos || '').toUpperCase().match(/IB\d{8,12}/g) || [])];
if (!nos.length) { console.log('BULK_RE cần nos=IB…,IB…'); process.exit(1); }
const post = async (b) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: KEY }, b)), redirect: 'follow' });
      const t = await r.text(); try { const j = JSON.parse(t); if (j.code !== 'BUSY') return j; } catch (e) { console.log('Phản hồi:', t.slice(0, 200)); }
    } catch (e) { console.log('Lỗi mạng:', e.message); }
    await new Promise(s => setTimeout(s, 5000 * (i + 1)));
  }
  return { ok: false, error: 'không gọi được' };
};
const txt = h => String(h || '').replace(/<br\s*\/?>/gi, ' / ').replace(/<\/(tr|p|li|h3)>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
const out = { pkgs: {}, hits: [], prio: null };
for (const no of nos) {
  const r = await post({ action: 'botRoute', op: 'pkg', no, html: 1, fetch: Q.fetch === '0' ? '0' : '' });
  out.pkgs[no] = r;
  console.log(`\n=== ${no} · ${r.inv || ''} (${r.prov || ''}) · ${r.name || r.error || r.note || ''}`);
  console.log(`thiếu: ${(r.missing || []).join(',') || '—'}${r.needKh ? ' + KHLCNT' : ''} · đặt tải: ${(r.queued || []).join(',') || '—'} · NT mở thầu ${r.bidders || 0} · không trúng ${r.losers || 0} · hàng hóa MMH ${r.goods || 0} · tài liệu ${r.docs || 0}`);
  if (r.html) console.log(txt(r.html).slice(0, 5000));
}
// GÓI TÌM THẤY: file đã có + file cần Agent
let off = 0;
for (let k = 0; k < 20; k++) {
  const r = await post({ action: 'botTT57', op: 'hits', off, n: 2000 });
  if (!r.ok) { console.log('hits lỗi:', r.error); break; }
  r.hits.forEach(h => { const b = String(h.no || '').toUpperCase().replace(/-\d+$/, ''); if (nos.includes(b)) out.hits.push(h); });
  if (!r.next) break; off = r.next;
}
console.log('\n=== FILE THEO GÓI');
out.hits.forEach(h => {
  console.log(`# ${h.key} · ${h.type} · ${h.status} · xong ${h.done || ''} · want ${(h.want || []).join(',') || 'tất cả'} · agPri ${h.agPri ?? ''}`);
  h.files.forEach(f => console.log(`   F ${f.sec || ''} | ${f.kind || ''} | ${f.name} | ${f.id}`));
  h.agent.forEach(a => console.log(`   A ${a.done ? 'ĐÃ' : 'CHỜ'} | ${a.tab} | ${a.type} | ${a.name} | thử ${a.tries} | ${a.url}`));
});
const keys = out.hits.filter(h => h.agent.some(a => !a.done)).map(h => h.key);
if (keys.length && Q.prio !== 'off') {
  out.prio = await post({ action: 'botTT57', op: 'prio', keys: keys.join(','), pri: Q.prio || '0' });
  console.log('\nƯu tiên file cần Agent:', keys.length, 'gói ⇒', JSON.stringify(out.prio));
}
fs.writeFileSync('pkgs-report.json', JSON.stringify(out, null, 1));
