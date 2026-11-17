// Bot tải hồ sơ gói thầu từ muasamcong.mof.gov.vn — chạy trên GitHub Actions (workflow "Theo dõi gói thầu — tải hồ sơ")
// hoặc trên 1 máy Windows đã cài Agent của muasamcong (WT_AGENT=1 ⇒ tải được cả file PDF đính kèm).
// Hàng đợi: backend tender-info ▸ MMH_Watch.gs (botNext / botFile / botDone). App: Tender-Result/theo-doi/ (điện thoại + máy tính).
//
// Các bước (đã chạy thử với IB2500491794, 17/11/2026):
//  1. Trang chủ ⇒ gỡ popup ⇒ gõ số vào ô tìm kiếm (trang tự sinh mã reCAPTCHA — không gọi API tìm kiếm trực tiếp được)
//  2. Đọc JSON kết quả (smart/search) ⇒ mở thẳng trang chi tiết (link render=detail-v2)
//  3. Tab Thông báo mời thầu: file đính kèm + "Tải TBMT"; tab Kết quả lựa chọn nhà thầu: file đính kèm + mọi nút "Xuất Excel"
//     (Danh sách nhà thầu, Danh sách hàng hóa — trang tự tạo file, không cần Agent)
//  4. File đính kèm (thẻ tags-fileAttach): trang gọi Agent http://localhost:1234/api/download/file/browser/public?fileId=…
//     ⇒ bot bắt fileId; có Agent ⇒ tự lấy file; không ⇒ ghi tên file vào info.agentFiles (app hiện nút mở trang gói).
// Biến môi trường: WT_URL, WT_BOT_KEY, WT_N (gói / lượt, mặc định 6), WT_PAR (song song, mặc định 3), WT_AGENT (1 = có Agent).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.WT_URL, KEY = process.env.WT_BOT_KEY, BOT = process.env.WT_BOT_NAME || 'github-actions';
const N = +(process.env.WT_N || 6), PAR = Math.max(1, Math.min(+(process.env.WT_PAR || 3), 5)), AGENT = process.env.WT_AGENT === '1';
const OUT = process.env.WT_OUT || 'wt-out';
const HOME = 'https://muasamcong.mof.gov.vn/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const safe = (s, n = 150) => String(s || '').replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, n) || 'file';
if (!URL || !KEY) { say('Thiếu WT_URL / WT_BOT_KEY — dừng.'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { say('⏱ quá 20 phút — dừng'); process.exit(3); }, 20 * 60e3).unref();

async function api(action, body) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action, key: KEY, bot: BOT }, body || {})), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { throw new Error('trả về không phải JSON: ' + t.slice(0, 160)); }
    } catch (e) { say('  ! ' + action + ' lỗi lần ' + (i + 1) + ': ' + e.message); await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  return { ok: false, error: 'không gọi được máy chủ' };
}
const MIME = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip', rar: 'application/vnd.rar' };

async function closePopups(pg) {
  for (let i = 0; i < 4; i++) {
    const r = await pg.evaluate(() => {
      const big = e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.6 && e.offsetHeight > innerHeight * 0.6 && +cs.zIndex >= 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const ov = [...document.querySelectorAll('body *')].filter(big);
      if (!ov.length) return '';
      for (const o of ov) for (const b of o.querySelectorAll('button,a,[role=button]')) {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
        if (/^(đóng|đóng thông báo|close|bỏ qua|đã hiểu|tôi đã hiểu|ok|x|×|✕)$/i.test(t)) { b.click(); return 'bấm ' + t; }
      }
      ov.forEach(e => e.remove()); document.body.style.overflow = 'auto'; return 'gỡ';
    }).catch(() => '');
    if (!r) return;
    await pg.waitForTimeout(300);
  }
}
const waitText = (pg, src, ms) => pg.waitForFunction(s => new RegExp(s, 'i').test(document.body.innerText), src, { timeout: ms }).then(() => true, () => false);

/* tìm số ⇒ mở trang chi tiết; trả { url, investor, bidName } */
async function openPackage(pg, no) {
  const bare = no.toUpperCase().replace(/-\d+$/, '');
  await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 });
  await closePopups(pg);
  if (/^PL/.test(bare)) await pg.locator('label:has-text("KHLCNT"):visible').first().click({ timeout: 3000 }).catch(() => {});
  const box = pg.locator('input[placeholder*="IB000202"]:visible').first();
  await box.fill(bare);
  const [res] = await Promise.all([pg.waitForResponse(r => /\/smart\/search\?token/.test(r.url()) && (r.request().postData() || '').includes(bare), { timeout: 45000 }), box.press('Enter')]);
  let items = []; try { items = (await res.json()).page.content || []; } catch (e) {}
  const hit = items.find(x => String(x.notifyNo || x.planNo || '').toUpperCase().startsWith(bare)) || items[0];
  if (!hit) return null;
  const link = pg.locator('a[href*="render=detail"]').first();
  await link.waitFor({ timeout: 20000 });
  let url = await link.getAttribute('href');
  if (url && url.startsWith('/')) url = 'https://muasamcong.mof.gov.vn' + url;
  await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const bn = Array.isArray(hit.bidName) ? hit.bidName[0] : (hit.bidName || hit.planName || '');
  return { url, investor: hit.investorName || hit.procuringEntityName || '', bidName: bn };
}

async function attachments(pg, job, tag, files, agentFiles, cap) {
  const items = pg.locator('tags.tags-fileAttach:visible');
  const n = await items.count(), seen = new Set();
  for (let i = 0; i < n; i++) {
    const el = items.nth(i), name = safe((await el.innerText().catch(() => '')).trim());
    if (!name || seen.has(name)) continue; seen.add(name);
    cap.length = 0;
    await el.click({ timeout: 5000 }).catch(() => {});
    for (let k = 0; k < 30 && !cap.length; k++) await pg.waitForTimeout(100);
    await closePopups(pg);
    const fid = cap[cap.length - 1] || '';
    if (AGENT && fid) {
      try {
        const r = await fetch('http://localhost:1234/api/download/file/browser/public?fileId=' + encodeURIComponent(fid), { headers: { Origin: 'https://muasamcong.mof.gov.vn' } });
        const buf = Buffer.from(await r.arrayBuffer());
        if (r.ok && buf.length > 100) { const f = path.join(OUT, job.no + '_' + name); fs.writeFileSync(f, buf); files.push({ name, file: f, kind: tag }); say(`    ⬇ ${name} (Agent, ${buf.length} byte)`); continue; }
      } catch (e) { say('    ! Agent: ' + e.message); }
    }
    agentFiles.push({ name, fileId: fid, tab: tag });
    say(`    · ${name} — cần Agent (fileId ${fid || '?'})`);
  }
}

async function buttons(pg, job, labels, tag, files) {
  for (const lb of labels) {
    const btns = pg.locator(`:is(a,button):text-is("${lb}"):visible`);
    const n = await btns.count();
    for (let k = 0; k < n; k++) {
      const b = btns.nth(k);
      await b.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      const d = await Promise.all([pg.waitForEvent('download', { timeout: 40000 }).catch(() => null), b.click({ timeout: 5000 }).catch(() => null)]).then(x => x[0]);
      await closePopups(pg);
      if (!d) { say(`    · "${lb}" #${k + 1}: không ra file`); continue; }
      const name = safe(d.suggestedFilename()), f = path.join(OUT, job.no + '_' + name);
      await d.saveAs(f);
      files.push({ name, file: f, kind: tag });
      say(`    ⬇ ${name} (${fs.statSync(f).size} byte)`);
    }
  }
}

async function doJob(pg, job, cap) {
  const t0 = Date.now();
  say(`▶ ${job.key} · ${job.investor} · ${String(job.name).slice(0, 70)}`);
  const pk = await openPackage(pg, job.no);
  if (!pk) { await api('botDone', { hit: job.key, status: 'error', note: 'Không tìm thấy số ' + job.no + ' trên muasamcong' }); return; }
  await waitText(pg, 'Mã TBMT|Mã KHLCNT', 30000); await closePopups(pg);
  const files = [], agentFiles = [];
  await attachments(pg, job, 'Thông báo mời thầu', files, agentFiles, cap);
  await buttons(pg, job, ['Tải TBMT'], 'Thông báo mời thầu', files);
  const kq = pg.locator(':is(a,button,li,span,[role=tab]):text-is("Kết quả lựa chọn nhà thầu"):visible').last();
  if (await kq.count()) {
    await kq.click({ timeout: 8000 }).catch(async () => { await closePopups(pg); await kq.click({ timeout: 8000 }).catch(() => {}); });
    await waitText(pg, 'Xuất Excel|Quyết định phê duyệt', 25000); await pg.waitForTimeout(800); await closePopups(pg);
    await attachments(pg, job, 'Kết quả LCNT', files, agentFiles, cap);
    await buttons(pg, job, ['Xuất Excel'], 'Kết quả LCNT', files);
  }
  let up = 0;
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const r = await api('botFile', { hit: job.key, name: f.name, kind: f.kind, investor: pk.investor, bidName: pk.bidName, mime: MIME[ext] || 'application/octet-stream', b64: fs.readFileSync(f.file).toString('base64') });
    if (r.ok) up++; else say('    ! gửi file lỗi: ' + (r.error || ''));
  }
  const info = { url: pk.url, investor: pk.investor, bidName: pk.bidName, agentFiles };
  await api('botDone', { hit: job.key, status: up ? 'done' : (agentFiles.length ? 'nofile' : 'nofile'), note: up + ' file' + (agentFiles.length ? ' · ' + agentFiles.length + ' file cần Agent' : ''), info: JSON.stringify(info) });
  say(`  ✓ ${job.no}: ${up} file${agentFiles.length ? ' + ' + agentFiles.length + ' cần Agent' : ''} · ${Math.round((Date.now() - t0) / 1000)} giây`);
}

const b = await chromium.launch(process.env.WT_CHANNEL ? { channel: process.env.WT_CHANNEL } : {});
const ctx = await b.newContext({ locale: 'vi-VN', acceptDownloads: true, viewport: { width: 1440, height: 900 }, userAgent: UA });
let total = 0;
async function worker() {
  const pg = await ctx.newPage(), cap = [];
  await pg.route(/^https?:\/\/(localhost|127\.0\.0\.1):1234\//, async route => {
    const m = route.request().url().match(/fileId=([\w-]+)/); if (m) cap.push(m[1]);
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });   // bot tự gọi Agent (nếu có) ⇒ trang không tải lần 2
  });
  for (;;) {
    const q = await api('botNext', { n: 1 });
    if (!q.ok || !q.jobs || !q.jobs.length) break;
    const job = q.jobs[0]; total++;
    try { await doJob(pg, job, cap); }
    catch (e) {
      say('  ✗ ' + job.no + ': ' + e.message.split('\n')[0]);
      await pg.screenshot({ path: path.join(OUT, job.no + '_loi.png') }).catch(() => {});
      await api('botDone', { hit: job.key, status: 'error', note: e.message.split('\n')[0].slice(0, 300) });
    }
    if (total >= N) break;
  }
  await pg.close();
}
await Promise.all(Array.from({ length: PAR }, worker));
await b.close();
say(`Xong: ${total} gói.`);
