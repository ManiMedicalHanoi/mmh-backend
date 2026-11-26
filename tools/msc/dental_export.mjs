// XUẤT DÒNG HÀNG HÓA TRÚNG THẦU NHA KHOA (26/11/2026, phân tích thị trường nha khoa kênh thầu — CHỈ ĐỌC)
// tender-info ▸ botSheetRead: đọc sheet "Hàng hóa trúng thầu" của file tổng theo trang, máy chủ lọc bằng research/dental/query.json (re)
// ⇒ work/dental-rows.json (workflow mã hoá rồi commit lên nhánh phiên Claude).
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
if (!KEY) { console.log('Thiếu WT_BOT_KEY'); process.exit(1); }
const post = async (b) => {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: KEY }, b)), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { console.log('Không phải JSON:', t.slice(0, 200)); }
    } catch (e) { console.log('Lỗi mạng:', e.message); }
    await new Promise(r => setTimeout(r, 8000 * (i + 1)));
  }
  return { ok: false, error: 'không gọi được máy chủ' };
};
const Q0 = JSON.parse(fs.readFileSync('research/dental/query.json', 'utf8'));
fs.mkdirSync('work', { recursive: true });
for (const Q of (Q0.jobs || [Object.assign({ name: 'rows' }, Q0)])) {
const out = { at: new Date().toISOString(), q: Q, head: null, allHead: null, dataRows: 0, rows: [], pages: [] };
let off = 0;
while (off >= 0) {
  const t0 = Date.now();
  const r = await post({ action: 'botSheetRead', file: Q.file || '', tab: Q.tab || '', cols: JSON.stringify(Q.cols || []), re: Q.re, off, n: Q.n || 6000 });
  if (!r.ok) { console.log('Lỗi trang off=' + off + ':', r.error); out.err = r.error; break; }
  out.head = r.head; out.allHead = r.allHead; out.dataRows = r.dataRows;
  out.rows.push(...r.rows);
  out.pages.push([off, r.read, r.rows.length, ((Date.now() - t0) / 1000).toFixed(1)]);
  console.log('off=' + off, 'đọc=' + r.read, 'khớp=' + r.rows.length, 'tổng=' + r.dataRows, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  off = r.next;
}
fs.writeFileSync('work/dental-' + Q.name + '.json', JSON.stringify(out));
console.log('XONG ' + Q.name + ': ' + out.rows.length + ' dòng khớp / ' + out.dataRows);
}
