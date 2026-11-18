// TẠM: dò Agent + nút tải hàng loạt + Thông tin chung + tìm KHLCNT trên muasamcong (chạy trên GitHub Actions). Xoá trước khi gộp.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const OUT = 'msc-out'; fs.mkdirSync(OUT, { recursive: true });
const say = (...a) => console.log(...a);
const short = (s, n = 300) => String(s || '').replace(/\s+/g, ' ').slice(0, n);
setTimeout(() => { say('⏱ dừng'); process.exit(3); }, 9 * 60e3).unref();
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'vi-VN', acceptDownloads: true, viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
const p = await ctx.newPage();
const reqs = []; ctx.on('request', q => { if (!/google|gstatic|analytics|ngsp|\.(js|css|png|svg|woff2?|jpg|gif)(\?|$)/.test(q.url())) reqs.push(q.method() + ' ' + q.url().slice(0, 260) + (q.postData() ? ' · ' + short(q.postData(), 300) : '')); });
await p.route(/^https?:\/\/(localhost|127\.0\.0\.1):1234\//, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
async function closePopups(pg) {
  for (let i = 0; i < 4; i++) {
    const r = await pg.evaluate(() => {
      const big = e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.6 && e.offsetHeight > innerHeight * 0.6 && +cs.zIndex >= 50 && cs.display !== 'none'; };
      const ov = [...document.querySelectorAll('body *')].filter(big); if (!ov.length) return '';
      for (const o of ov) for (const x of o.querySelectorAll('button,a')) { const t = (x.innerText || '').trim(); if (/^(đóng|đóng thông báo|đã hiểu|ok)$/i.test(t)) { x.click(); return t; } }
      ov.forEach(e => e.remove()); return 'gỡ';
    }).catch(() => ''); if (!r) return; await pg.waitForTimeout(300);
  }
}
const race = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(() => r(null), ms))]);
async function clickAndWatch(pg, label, el) {
  const n0 = reqs.length;
  const dl = pg.waitForEvent('download', { timeout: 25000 }).catch(() => null);
  await race(el.click({ timeout: 6000, force: true }).catch(e => say('   bấm lỗi', e.message.split('\n')[0])), 8000);
  const d = await race(dl, 26000);
  await closePopups(pg);
  say(`  [${label}] yêu cầu: ` + reqs.slice(n0).filter(u => !/smart\/search|get\/area|category/.test(u)).slice(0, 8).join(' || '));
  if (d) { const f = `${OUT}/${d.suggestedFilename()}`; await d.saveAs(f); say(`  ✅ [${label}] tải: ${d.suggestedFilename()} ${fs.statSync(f).size} byte`); }
}

// 1) tìm link Agent / hướng dẫn cài đặt
await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(5000); await closePopups(p);
const links = await p.$$eval('a', els => els.map(e => ({ t: (e.innerText || e.title || '').trim().slice(0, 80), h: e.href })).filter(x => /agent|cài đặt|cai-dat|bộ cài|setup|\.exe|\.msi|\.zip|plugin|tiện ích|huong-dan|tai-lieu/i.test(x.t + ' ' + x.h)));
say('1) link liên quan:', JSON.stringify(links).slice(0, 3000));
const html = await p.content();
const m = html.match(/[^"'\s]{0,200}(agent|Agent)[^"'\s]{0,200}\.(exe|msi|zip|jar|dmg)/g); say('   chuỗi file agent trong HTML:', JSON.stringify(m || []).slice(0, 1500));
let agentUrl = (m || []).map(s => s.match(/https?:\/\/[^"'\s]+/)).filter(Boolean).map(x => x[0])[0] || '';
for (const l of links.filter(x => /huong-dan|cai-dat|agent/i.test(x.h)).slice(0, 4)) {
  try {
    await p.goto(l.h, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(3000); await closePopups(p);
    const sub = await p.$$eval('a', els => els.map(e => ({ t: (e.innerText || '').trim().slice(0, 80), h: e.href })).filter(x => /agent|\.exe|\.msi|\.zip|cài đặt|bộ cài|tải về/i.test(x.t + ' ' + x.h)));
    say('   trang', l.h.slice(0, 120), '⇒', JSON.stringify(sub).slice(0, 1500));
    const ex = sub.find(x => /\.(exe|msi|zip)(\?|$)/i.test(x.h) && /agent|egp|client|cai/i.test(x.h + x.t)); if (ex && !agentUrl) agentUrl = ex.h;
  } catch (e) { say('   lỗi trang', e.message.split('\n')[0]); }
}
say('   => agentUrl:', agentUrl);
if (agentUrl) {
  try {
    execSync(`curl -sSL --max-time 120 -o ${OUT}/agent.bin "${agentUrl}"`); const sz = fs.statSync(`${OUT}/agent.bin`).size; say('   tải bộ cài', sz, 'byte');
    const s = execSync(`strings -n 8 ${OUT}/agent.bin | grep -Eio "https?://[a-zA-Z0-9./_?=&%-]{6,200}|/api/[a-zA-Z0-9/_?=&%-]{4,120}|download[a-zA-Z0-9/_?=&%-]{0,80}" | sort | uniq -c | sort -rn | head -60 || true`, { maxBuffer: 1 << 24 }).toString();
    say('   chuỗi trong bộ cài:\n' + s);
  } catch (e) { say('   lỗi bộ cài', e.message.split('\n')[0]); }
}

// 2) trang gói IB2500491794: Thông tin chung + HSMT + nút tải hàng loạt
await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 }); await closePopups(p);
const box = p.locator('input[placeholder*="IB000202"]:visible').first(); await box.fill('IB2500491794');
await Promise.all([p.waitForResponse(r => /smart\/search\?token/.test(r.url()) && (r.request().postData() || '').includes('IB2500491794'), { timeout: 45000 }), box.press('Enter')]);
const href = await p.locator('a[href*="render=detail"]').first().getAttribute('href');
await p.goto(href, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForFunction(() => /Mã TBMT/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {}); await closePopups(p);
const info = await p.evaluate(() => [...document.querySelectorAll('.infomation__content')].map(r => { const t = r.querySelector('.infomation__content__title'); const v = t && t.nextElementSibling; return [t ? t.innerText.trim() : '', v ? v.innerText.trim().slice(0, 200) : '']; }).filter(x => x[0]));
say('2) Thông tin chung (' + info.length + '):', JSON.stringify(info).slice(0, 4000));
const right = await p.evaluate(() => (document.body.innerText.match(/Thời điểm đóng thầu[\s\S]{0,80}/) || [''])[0]); say('   khung phải:', short(right, 200));
await clickAndWatch(p, 'Tải TBMT', p.locator(':is(a,button,tags,span):text-is("Tải TBMT")').first());
await p.locator(':is(a,button,li,span,div):text-is("Hồ sơ mời thầu"):visible').last().click({ timeout: 8000 }).catch(e => say('   tab HSMT lỗi', e.message.split('\n')[0]));
await p.waitForTimeout(4000); await closePopups(p);
const hsmt = await p.evaluate(() => [...document.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim().slice(0, 120))).filter(r => r.length));
say('   HSMT bảng:', JSON.stringify(hsmt).slice(0, 2500));
const tagsH = await p.$$eval('tags.tags-fileAttach', els => els.filter(e => e.offsetParent).map(e => e.innerText.trim()));
say('   HSMT file:', JSON.stringify(tagsH));
await clickAndWatch(p, 'Tải tất cả file đính kèm', p.locator(':is(a,button,span,tags):text-is("Tải tất cả file đính kèm")').first());
await clickAndWatch(p, 'Tải tất cả biểu mẫu webform', p.locator(':is(a,button,span,tags):text-is("Tải tất cả biểu mẫu webform")').first());
if (tagsH[0]) await clickAndWatch(p, 'file HSMT ' + tagsH[0], p.locator('tags.tags-fileAttach:visible').first());

// 3) tìm KHLCNT
await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 }); await closePopups(p);
await p.locator('label:has-text("KHLCNT"):visible').first().click({ timeout: 5000 }).catch(e => say('   radio KHLCNT lỗi', e.message.split('\n')[0]));
const ph = await p.$$eval('input:visible', els => els.map(e => e.placeholder).filter(Boolean)); say('3) ô nhập sau khi chọn KHLCNT:', JSON.stringify(ph));
const box2 = p.locator('input[type=text]:visible').first(); await box2.fill('PL2500276110');
const resp = await Promise.all([p.waitForResponse(r => /search/.test(r.url()) && (r.request().postData() || '').includes('PL2500276110'), { timeout: 45000 }).catch(() => null), box2.press('Enter')]).then(x => x[0]);
if (resp) say('   API KHLCNT:', resp.url().slice(0, 200), '·', short(resp.request().postData(), 500), '⇒', short(await resp.text().catch(() => ''), 1200));
await p.waitForTimeout(4000);
const hrefs2 = await p.$$eval('a', els => els.map(e => e.href).filter(h => /render=detail|plan/i.test(h))); say('   link KHLCNT:', JSON.stringify(hrefs2.slice(0, 3)));
if (hrefs2[0]) {
  await p.goto(hrefs2[0], { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(8000); await closePopups(p);
  say('   trang KHLCNT:', short(await p.evaluate(() => document.body.innerText), 2500));
  const tg = await p.$$eval('tags.tags-fileAttach', els => els.filter(e => e.offsetParent).map(e => e.innerText.trim())); say('   file KHLCNT:', JSON.stringify(tg));
  const bt = await p.$$eval('a,button', els => [...new Set(els.filter(e => e.offsetParent).map(e => (e.innerText || '').trim()).filter(s => /tải|xuất|excel/i.test(s)))]); say('   nút tải KHLCNT:', JSON.stringify(bt));
}
// 4) gói chỉ định thầu rút gọn IB2500572120: thử các lựa chọn tìm
await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 }); await closePopups(p);
const box3 = p.locator('input[placeholder*="IB000202"]:visible').first(); await box3.fill('IB2500572120');
const r3 = await Promise.all([p.waitForResponse(r => /smart\/search\?token/.test(r.url()) && (r.request().postData() || '').includes('IB2500572120'), { timeout: 45000 }).catch(() => null), box3.press('Enter')]).then(x => x[0]);
if (r3) say('4) CĐT rút gọn: gửi', short(r3.request().postData(), 600), '⇒', short(await r3.text().catch(() => ''), 600));
await p.waitForTimeout(3000);
say('   trang:', short((await p.evaluate(() => document.body.innerText)).replace(/^[\s\S]*Sửa tiêu chí tìm kiếm/, ''), 800));
await b.close();
