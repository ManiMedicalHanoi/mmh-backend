// Bot tải hồ sơ gói thầu từ muasamcong.mof.gov.vn (chạy trên GitHub Actions — workflow "Theo dõi gói thầu — tải hồ sơ").
// 1) botNext (backend tender-info ▸ MMH_Watch.gs) ⇒ danh sách gói cần tải (số TBMT / KHLCNT)
// 2) mở muasamcong như người thật: đóng popup, gõ số vào ô tìm kiếm, mở đúng gói, bấm các tab, bấm nút tải
// 3) botFile (từng file, base64) ⇒ Drive "Theo dõi gói thầu · Hồ sơ tải về/<chủ đầu tư>/<loại · số · tên gói>"
// 4) botDone (done | nofile | error + ghi chú) ⇒ thông báo người theo dõi
// Biến môi trường: WT_URL (web app tender-info), WT_BOT_KEY (khoá bot — Admin lấy trong app ▸ Cài đặt bot), WT_N (số gói / lượt, mặc định 5).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.WT_URL, KEY = process.env.WT_BOT_KEY, N = +(process.env.WT_N || 5), BOT = process.env.WT_BOT_NAME || 'github-actions';
const OUT = process.env.WT_OUT || 'wt-out';
const HOME = 'https://muasamcong.mof.gov.vn/';
const say = (...a) => console.log(...a);
if (!URL || !KEY) { say('Thiếu WT_URL / WT_BOT_KEY — dừng.'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });

async function api(action, body) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action, key: KEY, bot: BOT }, body || {})), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { throw new Error('trả về không phải JSON: ' + t.slice(0, 200)); }
    } catch (e) { say('  ! ' + action + ' lỗi lần ' + (i + 1) + ': ' + e.message); await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  return { ok: false, error: 'không gọi được máy chủ' };
}

const MIME = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip', rar: 'application/vnd.rar' };

/* ── lớp phủ / popup: bấm nút đóng nếu có, không thì gỡ khỏi trang ── */
async function closePopups(pg) {
  for (let i = 0; i < 5; i++) {
    const r = await pg.evaluate(() => {
      const big = e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.8 && e.offsetHeight > innerHeight * 0.8 && +cs.zIndex >= 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const ov = [...document.querySelectorAll('body *')].filter(big);
      if (!ov.length) return '';
      for (const o of ov) for (const b of o.querySelectorAll('button,a,[role=button]')) {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
        if (/^(đóng|close|bỏ qua|tôi đã hiểu|đã hiểu|ok|x|×|✕)$/i.test(t) || (!t && b.querySelector('svg'))) { b.click(); return 'bấm ' + (t || 'nút đóng'); }
      }
      ov.forEach(e => e.remove()); document.body.style.overflow = 'auto';
      return 'gỡ ' + ov.length + ' lớp phủ';
    }).catch(() => '');
    if (!r) return;
    say('    popup: ' + r);
    await pg.waitForTimeout(700);
  }
}

/* ── tìm 1 số TBMT / KHLCNT và mở trang chi tiết; trả trang (có thể là tab mới) ── */
async function openPackage(ctx, pg, no) {
  const bare = no.replace(/-\d+$/, '');
  await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForTimeout(4000); await closePopups(pg);
  if (/^PL/i.test(no)) { const r = pg.locator('label:has-text("KHLCNT"), text=KHLCNT').first(); await r.click({ timeout: 3000 }).catch(() => {}); }
  const box = pg.locator('input[placeholder*="IB000202"]:visible').first();
  await box.fill(bare, { timeout: 15000 });
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(7000); await closePopups(pg);
  const link = pg.locator(`a:has-text("${bare}"), :text("${bare}")`).first();
  if (!(await link.count())) return null;
  const [np] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), link.click({ timeout: 15000 })]);
  const page = np || pg;
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(6000); await closePopups(page);
  return page;
}

/* ── bấm tab + nút tải trên trang chi tiết, lưu mọi file tải được ── */
const TABS = { tbmt: ['Thông báo mời thầu', 'Hồ sơ mời thầu', 'Làm rõ HSMT'], kqdt: ['Kết quả lựa chọn nhà thầu', 'Thông báo mời thầu', 'Hồ sơ mời thầu'], khmt: ['Kế hoạch lựa chọn nhà thầu', 'Thông tin chung'] };
const DL_TEXT = /^(tải|tải về|tải xuống|tải tbmt|tải hsmt|tải file|xuất excel|tải excel|tải kqlcnt|download|xem file)$/i;
async function grabFiles(page, job) {
  const files = [], seen = new Set(), info = { url: page.url() };
  for (const tab of TABS[job.type] || []) {
    const t = page.locator(`text="${tab}"`).first();
    if (await t.isVisible({ timeout: 1500 }).catch(() => false)) { await t.click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(3500); await closePopups(page); }
    const btns = await page.locator('a:visible, button:visible').evaluateAll((els, src) => {
      const re = new RegExp(src, 'i');
      return els.map((e, i) => ({ i, t: (e.innerText || '').trim(), href: e.getAttribute('href') || '' })).filter(x => re.test(x.t) || /\.(pdf|xlsx?|docx?|zip|rar)(\?|$)/i.test(x.href));
    }, DL_TEXT.source);
    for (const b of btns) {
      const sig = tab + '|' + b.t + '|' + b.href;
      if (seen.has(sig)) continue; seen.add(sig);
      const el = page.locator('a:visible, button:visible').nth(b.i);
      const d = await Promise.all([page.waitForEvent('download', { timeout: 40000 }).catch(() => null), el.click({ timeout: 8000 }).catch(() => null)]).then(x => x[0]);
      if (!d) { say(`    (không có file sau khi bấm "${b.t}" ở tab ${tab})`); continue; }
      const name = d.suggestedFilename(), f = path.join(OUT, job.no + '_' + name);
      await d.saveAs(f);
      files.push({ name, file: f, kind: tab });
      say(`    ⬇ ${name} (${fs.statSync(f).size} byte) — tab ${tab}`);
    }
  }
  return { files, info };
}

const b = await chromium.launch();
let total = 0;
for (let round = 0; round < 4; round++) {
  const q = await api('botNext', { n: N });
  if (!q.ok) { say('botNext lỗi: ' + (q.error || '')); break; }
  if (!q.jobs.length) { say(round ? 'Hết hàng đợi.' : 'Không có gói nào cần tải.'); break; }
  for (const job of q.jobs) {
    total++;
    say(`\n▶ ${job.key} · ${job.investor} · ${job.name}`);
    const ctx = await b.newContext({ locale: 'vi-VN', acceptDownloads: true, viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
    const pg = await ctx.newPage();
    try {
      const page = await openPackage(ctx, pg, job.no);
      if (!page) { await api('botDone', { hit: job.key, status: 'error', note: 'Không tìm thấy số ' + job.no + ' trên muasamcong' }); continue; }
      const { files, info } = await grabFiles(page, job);
      let up = 0;
      for (const f of files) {
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        const r = await api('botFile', { hit: job.key, name: f.name, kind: f.kind, mime: MIME[ext] || 'application/octet-stream', b64: fs.readFileSync(f.file).toString('base64') });
        if (r.ok) up++; else say('    ! gửi file lỗi: ' + (r.error || ''));
      }
      await api('botDone', { hit: job.key, status: up ? 'done' : 'nofile', note: up ? up + ' file' : 'Trang gói thầu chưa có file tải về', info: JSON.stringify(info) });
      say(`  ✓ ${up} file`);
    } catch (e) {
      say('  ✗ ' + e.message.split('\n')[0]);
      await pg.screenshot({ path: path.join(OUT, job.no + '_loi.png') }).catch(() => {});
      await api('botDone', { hit: job.key, status: 'error', note: e.message.split('\n')[0].slice(0, 300) });
    } finally { await ctx.close(); }
  }
}
await b.close();
say(`\nXong: ${total} gói.`);
