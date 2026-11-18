// Đọc (chỉ đọc) trang TBMT trên muasamcong để lấy bảng phần/lô + bảo đảm dự thầu từng phần — dùng suy ra giá kế hoạch từng phần.
// Chạy 1 lần trên GitHub Actions (workflow lots-probe, nhánh làm việc). Không gọi backend, không ghi dữ liệu thầu.
import { chromium } from 'playwright';
import fs from 'node:fs';
const NOS = (process.env.NOS || 'IB2500470103 IB2400564280 IB2500030200 IB2500602738 IB2300259536').split(/\s+/).filter(Boolean);
const OUT = process.env.OUT || 'probe-out';
fs.mkdirSync(OUT, { recursive: true });
const HOME = 'https://muasamcong.mof.gov.vn/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
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
async function searchFor(pg, box, no) {
  for (let i = 0; i < 3; i++) {
    await pg.waitForTimeout(1500 + i * 2500);
    await box.fill(''); await box.fill(no);
    const r = await Promise.all([pg.waitForResponse(x => /search/.test(x.url()) && /token=/.test(x.url()) && (x.request().postData() || '').includes(no), { timeout: 25000 }).catch(() => null), box.press('Enter')]).then(x => x[0]);
    if (r) return r;
    await closePopups(pg);
  }
  throw new Error('search không phản hồi');
}
const br = await chromium.launch();
const ctx = await br.newContext({ userAgent: UA, locale: 'vi-VN', viewport: { width: 1500, height: 1000 } });
for (const no of NOS) {
  const pg = await ctx.newPage();
  const resp = [];
  pg.on('response', async r => {
    try {
      const ct = r.headers()['content-type'] || '';
      if (!/json/.test(ct)) return;
      const t = await r.text();
      if (t.length < 800000) resp.push({ url: r.url(), post: (r.request().postData() || '').slice(0, 2000), body: t });
    } catch (e) {}
  });
  try {
    await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pg.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 });
    await closePopups(pg);
    const box = pg.locator('input[placeholder*="IB000202"]:visible').first();
    await searchFor(pg, box, no);
    const link = pg.locator('a[href*="render=detail"]').first();
    await link.waitFor({ timeout: 20000 });
    let url = await link.getAttribute('href');
    if (url && url.startsWith('/')) url = 'https://muasamcong.mof.gov.vn' + url;
    // ưu tiên bước TBMT (giá trị bảo đảm theo phần nằm ở thông báo mời thầu)
    url = url.replace(/stepCode=[^&]+/, 'stepCode=notify-contractor-step-1-tbmt');
    say(no, url);
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pg.waitForTimeout(9000);
    await closePopups(pg);
    const texts = { main: await pg.evaluate(() => document.body.innerText) };
    // bấm các tab / nút có chữ phần, lô, bảo đảm
    const cands = await pg.locator('a,button,li,[role=tab],span').filter({ hasText: /phần|lô|Lô|Phần|bảo đảm|Bảo đảm|Thông báo mời thầu/ }).all();
    let k = 0;
    for (const c of cands.slice(0, 25)) {
      try {
        if (!(await c.isVisible())) continue;
        const t = (await c.innerText()).trim().slice(0, 60);
        if (t.length > 50) continue;
        await c.click({ timeout: 3000 }); await pg.waitForTimeout(2500);
        texts['click_' + (k++) + '_' + t] = await pg.evaluate(() => document.body.innerText);
      } catch (e) {}
    }
    const tables = await pg.evaluate(() => [...document.querySelectorAll('table')].map(t => [...t.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(c => c.innerText.trim()))));
    await pg.screenshot({ path: `${OUT}/${no}.png`, fullPage: true }).catch(() => {});
    fs.writeFileSync(`${OUT}/${no}.json`, JSON.stringify({ no, url, texts, tables, resp }, null, 1));
    say(no, 'ok', Object.keys(texts).length, 'texts', resp.length, 'json responses');
  } catch (e) {
    say(no, 'LỖI', e.message);
    fs.writeFileSync(`${OUT}/${no}.err.txt`, String(e.stack || e));
  }
  await pg.close();
}
await br.close();
