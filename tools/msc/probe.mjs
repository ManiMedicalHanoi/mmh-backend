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
p.on('requestfailed', q => { if (/muasamcong/.test(q.url())) log.push({ m: q.method(), u: q.url(), s: 'FAIL', pd: q.postData() || '', b: (q.failure() || {}).errorText || '' }); });
p.on('download', d => say('  ⬇ download sự kiện:', d.suggestedFilename(), d.url().slice(0, 200)));

async function closePopups(tag, pg) {
  pg = pg || p;
  for (let i = 0; i < 5; i++) {
    const info = await pg.evaluate(() => {
      const ov = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.8 && e.offsetHeight > innerHeight * 0.8 && +cs.zIndex >= 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; });
      return ov.map(e => ({ cls: String(e.className).slice(0, 80), txt: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
        btns: [...e.querySelectorAll('button,a,[role=button],svg,img,span')].filter(b => b.offsetParent).map(b => (b.tagName + ':' + ((b.innerText || b.getAttribute('aria-label') || b.getAttribute('alt') || b.className.baseVal || b.className || '') + '')).slice(0, 60)).slice(0, 15) }));
    }).catch(() => []);
    if (!info.length) return;
    say('  popup (' + tag + '):', JSON.stringify(info).slice(0, 900));
    let done = false;
    for (const re of [/^(đóng|close|bỏ qua|tôi đã hiểu|đã hiểu|ok|x|×|✕)$/i]) {
      const n = await pg.evaluate(src => {
        const re = new RegExp(src, 'i');
        const ov = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.8 && e.offsetHeight > innerHeight * 0.8 && +cs.zIndex >= 50; });
        for (const o of ov) for (const b of o.querySelectorAll('button,a,[role=button]')) {
          const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
          if (re.test(t) || (!t && b.querySelector('svg'))) { b.click(); return t || '(nút biểu tượng)'; }
        }
        return '';
      }, re.source).catch(() => '');
      if (n) { say('  ✕ bấm đóng popup:', n); done = true; await pg.waitForTimeout(800); }
    }
    if (!done) {
      const r = await pg.evaluate(() => { let k = 0; [...document.querySelectorAll('body *')].forEach(e => { const cs = getComputedStyle(e); if (cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.8 && e.offsetHeight > innerHeight * 0.8 && +cs.zIndex >= 50) { e.remove(); k++; } }); document.body.style.overflow = 'auto'; return k; }).catch(() => 0);
      say('  ✕ gỡ lớp phủ:', r); await pg.waitForTimeout(300);
    }
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
  const modals = await p.$$eval('.modal, [role=dialog], [class*="popup"], [class*="Popup"]', els => els.filter(e => e.offsetParent).map(e => (e.innerText || '').trim().slice(0, 200)));
  say('   popup còn hiện:', JSON.stringify(modals));
  const ins = await p.$$eval('input', els => els.map(e => ({ id: e.id, ph: e.placeholder, vis: !!e.offsetParent, type: e.type })).filter(x => x.ph));
  say('   ô nhập:', JSON.stringify(ins));
  const box = p.locator('input[placeholder*="IB000202"]:visible').first();
  await box.fill(NO, { timeout: 15000 });
  await Promise.all([p.waitForLoadState('domcontentloaded').catch(() => {}), p.keyboard.press('Enter')]);
  await p.waitForTimeout(10000); await closePopups('kết quả tìm'); await shot('2-search'); await texts('kết quả tìm');
  /* gọi thử API tìm kiếm ngay trong trang (cùng cookie) */
  for (const path of ['/o/egp-portal-contractor-selection-v2/services/smart/search', '/o/egp-portal-contractor-selection-v2/services/smart/search_prc']) {
    const body = [{ pageSize: 5, pageNumber: 0, query: [{ index: 'es-contractor-selection', keyWord: NO, matchType: 'all-1', matchFields: ['notifyNo', 'bidName'], filters: [] }] }];
    const r = await p.evaluate(async ({ path, body }) => { try { const x = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return x.status + ' ' + (await x.text()).slice(0, 1500); } catch (e) { return 'ERR ' + e.message; } }, { path, body });
    say('   thử API', path, '⇒', r.replace(/\s+/g, ' '));
  }
  say('3) Mở gói');
  const sr = log.filter(x => /smart\/search\?token/.test(x.u)).pop();
  let item = null; try { item = JSON.parse(sr.b).page.content[0]; } catch (e) {}
  if (item) say('   kết quả tìm (khoá):', JSON.stringify(Object.fromEntries(Object.entries(item).filter(([k, v]) => typeof v !== 'object' || Array.isArray(v)).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 2) : v]))).slice(0, 2500));
  const anchors = await p.$$eval('a', els => els.filter(e => e.offsetParent).map(e => ({ t: (e.innerText || '').trim().slice(0, 80), h: (e.getAttribute('href') || '').slice(0, 300) })).filter(x => /IB\d|Bệnh viện|Mua sắm|contractor-selection/i.test(x.t + x.h)));
  say('   link trong kết quả:', JSON.stringify(anchors).slice(0, 2000));
  const href = await p.$$eval('a', els => (els.find(e => /render=detail/.test(e.getAttribute('href') || '')) || {}).href || '');
  say('   link chi tiết (đủ):', href);
  const np = null;
  if (href) await p.goto(href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const pg = np || p; if (np) { say('   mở tab mới'); }
  await pg.waitForLoadState('domcontentloaded').catch(() => {});
  await pg.waitForTimeout(9000); await closePopups('gói', pg); await shot('3-goi');
  { const t = await pg.evaluate(() => document.body.innerText).catch(() => ''); say('--- [gói] URL:', pg.url()); say(short(t.slice(t.indexOf('Quay trở lại') >= 0 ? t.indexOf('Quay trở lại') : 0), 2500));
    const bt = await pg.$$eval('a,button,[role=tab],li,span', els => [...new Set(els.filter(e => e.offsetParent).map(e => (e.innerText || '').trim()).filter(s => s && s.length < 40))]).catch(() => []);
    say('   nút / tab trang gói:', bt.slice(0, 200).join(' | ').slice(0, 2500)); }
  for (const tab of ['Thông báo mời thầu', 'Hồ sơ mời thầu', 'Biên bản mở thầu', 'Kết quả lựa chọn nhà thầu']) {
    say('4) Tab: ' + tab);
    try { await pg.locator(`:is(a,button,li,span,div,[role=tab]):text-is("${tab}")`).last().click({ timeout: 8000 }); await pg.waitForTimeout(5000); await shot('4-' + tab.replace(/\s+/g, '_'));
      const t = await pg.evaluate(() => document.body.innerText).catch(() => ''); say(short(t.slice(t.indexOf(tab)), 1200)); }
    catch (e) { say('   không bấm được tab:', e.message.split('\n')[0]); }
    for (const dl of ['Tải TBMT', 'Tải HSMT', 'Tải về', 'Tải xuống', 'Xuất Excel', 'Tải file', 'Tải KQLCNT', 'Tải biên bản', 'Tải tất cả']) {
      const el = pg.getByText(dl, { exact: true }).first();
      if (!(await el.isVisible({ timeout: 500 }).catch(() => false))) continue;
      say('   bấm', dl);
      const d = await Promise.all([pg.waitForEvent('download', { timeout: 30000 }).catch(() => null), el.click().catch(() => null)]).then(x => x[0]);
      if (d) { const f = `${OUT}/${d.suggestedFilename()}`; await d.saveAs(f); say('   ✅ TẢI ĐƯỢC:', d.suggestedFilename(), fs.statSync(f).size, 'byte'); }
      else say('   (không có file tải về sau 30 giây)');
    }
  }
} catch (e) { say('LỖI:', e.message.split('\n')[0]); }

say('\n=== XHR / fetch trang đã gọi (' + log.length + ') ===');
for (const x of log) {
  if (/\.(js|css|png|svg|woff2?)(\?|$)|js_resolve_modules|egp-portal-home|google-analytics|ngsp\.gov\.vn|get-time-now/.test(x.u)) continue;
  say(`${x.s} ${x.m} ${x.u.slice(0, 220)}`);
  if (x.pd) say('   gửi: ' + short(x.pd, 700));
  say('   nhận: ' + short(x.b, 500));
}
fs.writeFileSync(`${OUT}/network.json`, JSON.stringify(log, null, 1));
await b.close();
