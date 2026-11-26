// XUẤT DÒNG HÀNG HÓA TRÚNG THẦU NHA KHOA (26/11/2026, phân tích thị trường nha khoa kênh thầu — chỉ ĐỌC, botGoodsScan của tender-info)
// ⇒ work/dental-<nhóm>.json (workflow mã hoá rồi commit lên nhánh phiên Claude).
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
if (!KEY) { console.log('Thiếu WT_BOT_KEY'); process.exit(1); }
const post = async (b) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: KEY }, b)), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { console.log('Không phải JSON:', t.slice(0, 300)); }
    } catch (e) { console.log('Lỗi mạng:', e.message); }
    await new Promise(r => setTimeout(r, 8000 * (i + 1)));
  }
  return { ok: false, error: 'không gọi được máy chủ' };
};
const G = JSON.parse(fs.readFileSync('research/dental/groups.json', 'utf8'));
fs.mkdirSync('work', { recursive: true });
for (const [name, inc] of Object.entries(G)) {
  const t0 = Date.now();
  const r = await post({ action: 'botGoodsScan', inc: inc.join(','), max: 200000 });
  console.log(name, 'ok=' + r.ok, 'scanned=' + r.scanned, 'pkgs=' + r.pkgs, 'n=' + r.n, 'cut=' + r.cut, ((Date.now() - t0) / 1000).toFixed(1) + 's', r.error || '');
  fs.writeFileSync('work/dental-' + name + '.json', JSON.stringify(r));
}
