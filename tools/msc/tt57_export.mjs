// XUẤT DỮ LIỆU TRACKER CHO RÀ SOÁT TT 57/2025/TT-BYT (24/11/2026). Chạy trong workflow "TT57 — xuất dữ liệu" (WT_BOT_KEY).
// Đọc danh sách việc ở research/tt57/jobs.json ⇒ gọi tender-info botTT57 (MMH_WatchTT57.gs, chỉ đọc) ⇒ ghi work/ (gzip);
// workflow MÃ HOÁ work/ bằng khoá công khai research/tt57/pub.pem rồi mới commit (kho công khai) ⇒ research/tt57/enc/.
//   { "type": "status" }
//   { "type": "rows", "book": "hh|nt|sum|tender", "tab": "...", "cols": "A|B|C", "out": "x.jsonl.gz", "n": 3000 }
//   { "type": "hits", "out": "hits.json.gz" }
//   { "type": "texts", "re": "regex trên kind + name", "max": 400, "conc": 4 }   ⇒ data/text/<id>.txt.gz + data/text/index.jsonl (bỏ qua file đã có)
//   { "type": "prio", "keys": ["kqdt:IB…"], "pri": 0 }
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
const B = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const URL = B['tender-info'].url, KEY = process.env.WT_BOT_KEY;
const ROOT = 'research/tt57', OUT = 'work', T0 = Date.now(), BUDGET = (+process.env.TT57_MIN || 45) * 60000;
if (!KEY) { console.log('Thiếu secret WT_BOT_KEY.'); process.exit(1); }
fs.mkdirSync(OUT + '/text', { recursive: true });
const post = async (b, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ key: KEY, action: 'botTT57' }, b)), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { console.log('Phản hồi không phải JSON:', t.slice(0, 300)); }
    } catch (e) { console.log('Lỗi mạng:', e.message); }
    await new Promise(r => setTimeout(r, 5000 * (i + 1)));
  }
  return { ok: false, error: 'không gọi được máy chủ' };
};
const gz = (file, s) => fs.writeFileSync(path.join(OUT, file), zlib.gzipSync(Buffer.from(s, 'utf8')));
const jobs = JSON.parse(fs.readFileSync(ROOT + '/jobs.json', 'utf8'));
const log = [], jdF = ROOT + '/done_jobs.txt';
const jdone = new Set(fs.existsSync(jdF) ? fs.readFileSync(jdF, 'utf8').split('\n').filter(Boolean) : []);
let more = false;
for (const j of jobs) {
  if (Date.now() - T0 > BUDGET) { more = true; break; }
  const jid = j.id || (j.type + ':' + (j.out || j.re || ''));
  if (jdone.has(jid)) { log.push('bỏ qua (đã xong) ' + jid); continue; }
  const moreBefore = more;
  if (j.type === 'status') {
    const r = await post({ op: 'status' });
    fs.writeFileSync(OUT + '/status.json', JSON.stringify(r, null, 1));
    log.push('status ' + (r.ok ? 'ok' : r.error));
  } else if (j.type === 'rows') {
    if (j.skipIfExists && fs.existsSync(path.join(OUT, j.out))) { log.push('rows ' + j.out + ' đã có'); continue; }
    const lines = []; let off = 1, head = null, last = 0, err = '';
    while (off) {
      const r = await post({ op: 'rows', book: j.book, tab: j.tab, cols: j.cols || '', off, n: j.n || 3000 });
      if (!r.ok) { err = r.error; break; }
      if (!head) head = r.head;
      last = r.last;
      r.rows.forEach((row, i) => { if (off + i > 1) lines.push(JSON.stringify(row)); });
      console.log(j.out, 'dòng', off, '→', off + r.n - 1, '/', last);
      off = r.next;
    }
    gz(j.out, JSON.stringify({ book: j.book, tab: j.tab, head, last, err }) + '\n' + lines.join('\n'));
    log.push('rows ' + j.out + ' ' + lines.length + ' dòng' + (err ? ' · LỖI ' + err : ''));
  } else if (j.type === 'hits') {
    const all = []; let off = 0, total = 0;
    do {
      const r = await post({ op: 'hits', off, n: 1500 });
      if (!r.ok) { log.push('hits LỖI ' + r.error); break; }
      all.push(...r.hits); total = r.total; off = r.next;
      console.log('hits', all.length, '/', total);
    } while (off);
    gz(j.out || 'hits.json.gz', JSON.stringify(all));
    log.push('hits ' + all.length + '/' + total);
  } else if (j.type === 'texts') {
    let hf = OUT + '/' + (j.hits || 'hits.json.gz');
    if (!fs.existsSync(hf)) { const r0 = []; let o = 0; do { const r = await post({ op: 'hits', off: o, n: 1500 }); if (!r.ok) break; r0.push(...r.hits); o = r.next; } while (o); fs.writeFileSync(hf, zlib.gzipSync(Buffer.from(JSON.stringify(r0)))); }
    const hits = JSON.parse(zlib.gunzipSync(fs.readFileSync(hf)).toString('utf8'));
    const re = new RegExp(j.re, 'i'), idxF = OUT + '/text/index.jsonl', doneF = ROOT + '/done_ids.txt';
    const have = new Set(fs.existsSync(doneF) ? fs.readFileSync(doneF, 'utf8').split('\n').filter(Boolean) : []);
    const only = j.nos ? new Set(j.nos) : null, seen = new Set(), todo = [];
    for (const h of hits) {
      const bare = String(h.no || '').toUpperCase().replace(/-\d+$/, '');
      if (only && !only.has(bare)) continue;
      for (const f of h.files || []) {
        if (!f.id || f.gsheet || seen.has(f.id) || have.has(f.id)) continue;
        if (!re.test((f.kind || '') + ' ' + (f.name || ''))) continue;
        seen.add(f.id); todo.push({ id: f.id, no: bare, type: h.type, kind: f.kind, name: f.name, sec: f.sec, url: f.url });
      }
    }
    console.log('texts: cần đọc', todo.length, '· đã có', have.size);
    const max = j.max || 400, conc = j.conc || 4; let i = 0, done = 0, bad = 0;
    const worker = async () => {
      while (i < Math.min(todo.length, max)) {
        if (Date.now() - T0 > BUDGET) { more = true; return; }
        const d = todo[i++];
        const r = await post({ op: 'text', id: d.id }, 2);
        const rec = Object.assign({}, d, { how: r.how || '', chars: r.chars || 0, skip: r.skip || '', err: r.ok ? '' : (r.error || 'lỗi'), mime: r.mime || '', size: r.size || 0, ms: r.ms || 0 });
        if (r.ok && r.text) fs.writeFileSync(OUT + '/text/' + d.id + '.txt.gz', zlib.gzipSync(Buffer.from(r.text, 'utf8')));
        if (!r.ok) bad++;
        fs.appendFileSync(idxF, JSON.stringify(rec) + '\n'); fs.appendFileSync(doneF, d.id + '\n'); done++;
        if (done % 10 === 0) console.log('texts', done, '/', Math.min(todo.length, max), '· lỗi', bad);
      }
    };
    await Promise.all(Array.from({ length: conc }, worker));
    if (todo.length > max) more = true;
    log.push('texts đọc ' + done + ' · lỗi ' + bad + ' · còn ' + Math.max(0, todo.length - done));
  } else if (j.type === 'blobs') {   // nguyên file ⇒ work/raw/<id>__<tên> (bước sau: tools/msc/tt57_text.py đọc chữ)
    const dF = ROOT + '/done_blobs.txt', have = new Set(fs.existsSync(dF) ? fs.readFileSync(dF, 'utf8').split('\n').filter(Boolean) : []);
    fs.mkdirSync(OUT + '/raw', { recursive: true });
    const todo = (j.files || []).filter(f => !have.has(f.id)); let i = 0, done = 0, bad = 0;
    const worker = async () => {
      while (i < todo.length) {
        if (Date.now() - T0 > BUDGET) { more = true; return; }
        const d = todo[i++];
        const r = await post({ op: 'blob', id: d.id, maxMb: 40 }, 2);
        const meta = Object.assign({}, d, { name: r.name || d.name, mime: r.mime || '', size: r.size || 0, skip: r.skip || '', err: r.ok ? '' : (r.error || 'lỗi') });
        if (r.ok && r.b64) { const nm = d.id + '__' + String(r.name || 'file').replace(/[\/\\:*?"<>|]+/g, '_').slice(-120); fs.writeFileSync(OUT + '/raw/' + nm, Buffer.from(r.b64, 'base64')); meta.raw = nm; } else bad++;
        fs.appendFileSync(OUT + '/raw/_meta.jsonl', JSON.stringify(meta) + '\n'); fs.appendFileSync(dF, d.id + '\n'); done++;
        if (done % 10 === 0) console.log('blobs', done, '/', todo.length, '· lỗi', bad);
      }
    };
    await Promise.all(Array.from({ length: j.conc || 4 }, worker));
    log.push('blobs tải ' + done + ' · lỗi ' + bad + ' · còn ' + Math.max(0, todo.length - done));
  } else if (j.type === 'prio') {
    const r = await post({ op: 'prio', keys: (j.keys || []).join(','), pri: j.pri == null ? '' : j.pri });
    log.push('prio ' + JSON.stringify(r));
  }
  if (!more || moreBefore) { if (j.type !== 'status') fs.appendFileSync(jdF, jid + '\n'); }
}
fs.writeFileSync(OUT + '/last-run.txt', new Date().toISOString() + '\n' + log.join('\n') + '\n' + (more ? 'CÒN VIỆC' : 'XONG') + '\n');
console.log(log.join('\n'));
if (more) fs.writeFileSync(ROOT + '/.more', String(Date.now())); else { try { fs.unlinkSync(ROOT + '/.more'); } catch (e) {} }
