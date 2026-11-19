// Đưa tài liệu kho ManiMedicalHanoi/tender-docs (ho-so/<Bệnh viện>/<Số TBMT>/…) vào thư mục Drive theo từng gói — tender-info ▸ botSaveTo.
// File đã có (cùng tên) ⇒ máy chủ bỏ qua. Chạy: WT_URL=… WT_BOT_KEY=… DOCS=<thư mục clone> MAP='{"IB…":"<folderId>"}' node tools/msc/docs2drive.mjs
import fs from 'node:fs';
import path from 'node:path';
const URL = process.env.WT_URL, KEY = process.env.WT_BOT_KEY, ROOT = process.env.DOCS || 'tender-docs';
const MAP = JSON.parse(process.env.MAP || '{}');
const MIME = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel', rar: 'application/vnd.rar', zip: 'application/zip' };
if (!URL || !KEY) { console.log('Thiếu WT_URL / WT_BOT_KEY'); process.exit(1); }
let up = 0, skip = 0, bad = 0;
const base = path.join(ROOT, 'ho-so');
for (const inv of fs.readdirSync(base)) for (const no of fs.readdirSync(path.join(base, inv))) {
  const folder = MAP[no];
  if (!folder) { console.log('· bỏ qua gói chưa có thư mục Drive:', no); continue; }
  for (const f of fs.readdirSync(path.join(base, inv, no))) {
    if (/\.url$/i.test(f)) continue;
    const buf = fs.readFileSync(path.join(base, inv, no, f)), ext = (f.match(/\.(\w+)$/) || [])[1] || '';
    const body = JSON.stringify({ action: 'botSaveTo', key: KEY, folder, name: f.normalize('NFC'), mime: MIME[ext.toLowerCase()] || 'application/octet-stream', b64: buf.toString('base64') });
    let r = null;
    for (let i = 0; i < 3 && !r; i++) {
      try { const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, redirect: 'follow' }); const t = await res.text(); r = JSON.parse(t); }
      catch (e) { console.log('  ! lần ' + (i + 1) + ': ' + e.message); await new Promise(s => setTimeout(s, 4000)); }
    }
    if (r && r.ok && r.skipped) { skip++; continue; }
    if (r && r.ok) { up++; console.log('⬆ ' + no + ' · ' + f + ' (' + Math.round(buf.length / 1024) + ' KB)'); }
    else { bad++; console.log('✗ ' + no + ' · ' + f + ': ' + ((r && r.error) || 'không gọi được máy chủ')); }
  }
}
console.log(`Xong: ${up} file mới · ${skip} file đã có · ${bad} lỗi`);
process.exit(bad ? 1 : 0);
