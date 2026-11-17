// Dò thao tác trên muasamcong.mof.gov.vn (chạy trên GitHub Actions): mở trang, đóng popup, tìm theo số TBMT,
// mở gói, bấm các tab + nút tải; in ra mọi lệnh XHR / fetch trang gọi (để bot gọi thẳng API) + file tải được.
import { chromium } from 'playwright';
import fs from 'node:fs';
const NO = process.env.MSC_NO || 'IB2500491794';
const OUT = process.env.MSC_OUT || 'msc-out';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const say = (...a) => console.log(...a);
const short = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'vi-VN', acceptDownloads: true, viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
const p = await ctx.newPage();
p.on('response', async r => {
  const q = r.request(), t = q.resourceType();
  if (t !== 'xhr' && t !== 'fetch') return;
  let body = '';
  try { const ct = r.headers()['content-type'] || ''; body = /json|text|javascript/.test(ct) ? await r.text() : '[' + ct + ']'; } catch (e) { body = '(không đọc được)'; }
  log.push({ m: q.method(), u: q.url(), s: r.status(), pd: q.postData() || '', b: body.slice(0, 3000) });
});
p.on('download', d => say('  ⬇ download sự kiện:', d.suggestedFilename(), d.url().slice(0, 200)));

async function closePopups(tag) {
  for (let i = 0; i < 4; i++) {
    let n = 0;
    for (const sel of ['button:has-text("Đóng")', 'button:has-text("Bỏ qua")', 'button:has-text("Tôi đã hiểu")', 'button:has-text("Đồng ý")',
      '.modal.show .close', '.modal.show [aria-label="Close"]', '.ant-modal-close', 'button.close', '[class*="popup"] [class*="close"]']) {
      const el = p.locator(sel).first();
      try { if (await el.isVisible({ timeout: 300 })) { await el.click({ timeout: 2000 }); n++; say('  ✕ đóng popup (' + tag + '):', sel); await p.waitForTimeout(500); } } catch (e) {}
    }
    await p.keyboard.press('Escape').catch(() => {});
    if (!n) break;
  }
}
async function shot(name) { try { await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); } catch (e) {} }
async function texts(tag) {
  const t = await p.evaluate(() => document.body.innerText).catch(() => '');
  say(`--- [${tag}] URL: ${p.url()}`);
  say(short(t, 1500));
  const btn = await p.$$eval('a,button,[role=tab],li', els => els.map(e => (e.innerText || '').trim()).filter(s => s && s.length < 60)).catch(() => []);
  say('  nút / tab:', [...new Set(btn)].slice(0, 120).join(' | '));
}

try {
  say('1) Mở trang chủ');
  await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(6000); await closePopups('trang chủ'); await shot('1-home');
  say('   tiêu đề:', await p.title());

  say('2) Tìm số ' + NO);
  const box = p.locator('input[placeholder*="Nhập từ kho"], input[placeholder*="IB000202"]').first();
  await box.click({ timeout: 15000 }); await box.fill(NO); await p.keyboard.press('Enter');
  await p.waitForTimeout(8000); await closePopups('kết quả tìm'); await shot('2-search'); await texts('kết quả tìm');

  say('3) Mở gói');
  const link = p.locator(`a:has-text("${NO}"), :text("${NO}")`).first();
  const [np] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), link.click({ timeout: 15000 }).catch(e => say('   chưa bấm được:', e.message.slice(0, 200)))]);
  const pg = np || p; if (np) { say('   mở tab mới'); }
  await pg.waitForTimeout(8000); await shot('3-goi'); if (pg === p) await texts('gói thầu');
  else { const t = await pg.evaluate(() => document.body.innerText).catch(() => ''); say('--- [gói - tab mới] URL:', pg.url()); say(short(t, 1500)); }

  for (const tab of ['Thông báo mời thầu', 'Hồ sơ mời thầu', 'Biên bản mở thầu', 'Kết quả lựa chọn nhà thầu']) {
    say('4) Tab: ' + tab);
    try { await pg.locator(`text="${tab}"`).first().click({ timeout: 8000 }); await pg.waitForTimeout(5000); await shot('4-' + tab.replace(/\s+/g, '_'));
      const t = await pg.evaluate(() => document.body.innerText).catch(() => ''); say(short(t.slice(t.indexOf(tab)), 1200)); }
    catch (e) { say('   không bấm được tab:', e.message.slice(0, 150)); }
    for (const dl of ['Tải TBMT', 'Tải về', 'Tải xuống', 'Xuất Excel', 'Tải file', 'Tải KQLCNT']) {
      const el = pg.locator(`text="${dl}"`).first();
      if (!(await el.isVisible({ timeout: 500 }).catch(() => false))) continue;
      say('   bấm', dl);
      const d = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }).catch(() => null), el.click().catch(() => null)]).then(x => x[0]);
      if (d) { const f = `${OUT}/${d.suggestedFilename()}`; await d.saveAs(f); say('   ✅ TẢI ĐƯỢC:', d.suggestedFilename(), fs.statSync(f).size, 'byte'); }
      else say('   (không có file tải về sau 30 giây)');
    }
  }
} catch (e) { say('LỖI:', e.message); }

say('\n=== XHR / fetch trang đã gọi (' + log.length + ') ===');
for (const x of log) {
  if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(x.u)) continue;
  say(`${x.s} ${x.m} ${x.u.slice(0, 220)}`);
  if (x.pd) say('   gửi: ' + short(x.pd, 700));
  say('   nhận: ' + short(x.b, 500));
}
fs.writeFileSync(`${OUT}/network.json`, JSON.stringify(log, null, 1));
await b.close();
