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


/* gõ số + Enter, chờ đúng phản hồi tìm kiếm; trang chưa sẵn mã reCAPTCHA ⇒ thử lại (tối đa 3 lần) */
async function searchFor(pg, box, no) {
  for (let i = 0; i < 3; i++) {
    await pg.waitForTimeout(1500 + i * 2500);
    await box.fill(''); await box.fill(no);
    const r = await Promise.all([pg.waitForResponse(x => /search/.test(x.url()) && /token=/.test(x.url()) && (x.request().postData() || '').includes(no), { timeout: 25000 }).catch(() => null), box.press('Enter')]).then(x => x[0]);
    if (r) return r;
    await closePopups(pg);
  }
  throw new Error('Trang tìm kiếm muasamcong không phản hồi (thử 3 lần)');
}

// A) Thông tin chung: chờ giá trị + JSON API + in PDF
await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 }); await closePopups(p);
const box = p.locator('input[placeholder*="IB000202"]:visible').first();
const sr = await searchFor(p, box, 'IB2500491794');
say('A0) search hit:', short(await sr.text(), 1500));
const href = await p.locator('a[href*="render=detail"]').first().getAttribute('href');
const jsons = []; p.on('response', async r => { if (/services\//.test(r.url()) && /json/.test(r.headers()['content-type'] || '')) { const t = await r.text().catch(() => ''); jsons.push(r.url().split('?')[0].split('/services/')[1] + ' ⇒ ' + short(t, 1800)); } });
await p.goto(href, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForFunction(() => { const r = [...document.querySelectorAll('.infomation__content')].find(x => /Mã TBMT/.test(x.innerText)); return r && /IB\d{6}/.test(r.innerText); }, null, { timeout: 40000 }).catch(() => say('   chờ giá trị hết giờ'));
await p.waitForTimeout(2500); await closePopups(p);
const info = await p.evaluate(() => [...document.querySelectorAll('.infomation__content')].map(r => { const t = r.querySelector('.infomation__content__title'); const tt = t ? t.innerText.trim() : ''; return [tt, r.innerText.replace(tt, '').trim().slice(0, 160)]; }).filter(x => x[0]));
say('A1) Thông tin chung:', JSON.stringify(info).slice(0, 5000));
say('A2) JSON API:\n' + jsons.slice(0, 12).join('\n'));
try { await p.pdf({ path: OUT + '/tbmt.pdf', format: 'A4', printBackground: true }); say('A3) page.pdf', fs.statSync(OUT + '/tbmt.pdf').size); } catch (e) { say('A3) pdf lỗi', e.message.split('\n')[0]); }
// B) Agent: bỏ chặn localhost, bấm file đính kèm ⇒ hộp thoại Agent
await p.unroute(/^https?:\/\/(localhost|127\.0\.0\.1):1234\//);
await p.locator(':is(a,button,li,span,div):text-is("Hồ sơ mời thầu"):visible').last().click({ timeout: 8000 }).catch(() => {});
await p.waitForTimeout(3000);
await p.locator('tags.tags-fileAttach:visible').first().click({ timeout: 6000, force: true }).catch(e => say('   bấm file lỗi', e.message.split('\n')[0]));
await p.waitForTimeout(6000);
const modal = await p.evaluate(() => { const m = [...document.querySelectorAll('.ant-modal, [role=dialog], .modal')].filter(e => e.offsetParent || getComputedStyle(e).display !== 'none'); return m.map(e => e.innerText.slice(0, 600) + ' || links: ' + JSON.stringify([...e.querySelectorAll('a')].map(a => a.innerText.trim() + ' ' + a.href))).join('\n---\n'); });
say('B1) hộp thoại:', modal.slice(0, 3000));
const allA = await p.$$eval('a', els => els.map(e => (e.innerText || '').trim().slice(0, 60) + ' ' + e.href).filter(x => /agent|\.exe|\.msi|\.zip|setup|cài/i.test(x)));
say('B2) link:', JSON.stringify(allA).slice(0, 2000));
const scripts = await p.$$eval('script[src]', els => els.map(e => e.src)); say('B3) script:', JSON.stringify(scripts).slice(0, 1500));
for (const u of scripts.filter(u => /muasamcong/.test(u)).slice(0, 12)) {
  try { const t = await (await ctx.request.get(u, { timeout: 30000 })).text(); const hits = [...new Set((t.match(/[^"'`\s]{0,80}(agent|Agent|1234)[^"'`\s]{0,120}/g) || []).filter(x => /http|\.exe|\.msi|\.zip|download|setup/i.test(x)))].slice(0, 15); if (hits.length) say('   ' + u.slice(-70) + ':', JSON.stringify(hits).slice(0, 2500)); } catch (e) {}
}
// C) KHLCNT: ghi mọi yêu cầu search
await p.goto('https://muasamcong.mof.gov.vn/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 }); await closePopups(p);
const radios = await p.$$eval('label:visible, .ant-radio-wrapper', els => els.map(e => e.innerText.trim()).filter(Boolean).slice(0, 20)); say('C0) radio:', JSON.stringify(radios));
await p.locator('label:has-text("KHLCNT"):visible').first().click({ timeout: 5000 }).catch(e => say('   radio lỗi', e.message.split('\n')[0]));
await p.waitForTimeout(1500);
const box2 = p.locator('input[placeholder*="KHLCNT"]:visible').first();
const n0 = reqs.length; const rk = await searchFor(p, box2, 'PL2500276110').catch(e => { say('   KHLCNT:', e.message); return null; }); await p.waitForTimeout(4000);
if (rk) say('C0b) KHLCNT API:', rk.url().split('?')[0], '·', short(rk.request().postData(), 500), '⇒', short(await rk.text().catch(() => ''), 1500));
say('C1) yêu cầu:', reqs.slice(n0).filter(u => /search|plan/i.test(u)).slice(0, 6).join(' || ').slice(0, 2500));
say('C2) url:', p.url().slice(0, 300));
const hrefs2 = await p.$$eval('a', els => els.map(e => e.href).filter(h => /render=detail|plan|khlcnt/i.test(h))); say('C3) link:', JSON.stringify(hrefs2.slice(0, 5)));
say('C4) trang:', short((await p.evaluate(() => document.body.innerText)).replace(/^[\s\S]*Sửa tiêu chí tìm kiếm/, ''), 1200));
if (hrefs2[0]) { await p.goto(hrefs2[0], { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(9000); await closePopups(p);
  say('C5) trang KHLCNT:', short(await p.evaluate(() => document.body.innerText), 3000));
  const bt = await p.$$eval('a,button,tags', els => [...new Set(els.filter(e => e.offsetParent).map(e => (e.innerText || '').trim()).filter(s => /tải|xuất|excel|\.pdf|\.doc/i.test(s)))]); say('C6) nút / file:', JSON.stringify(bt)); }
await b.close();
