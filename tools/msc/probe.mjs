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

setTimeout(() => { console.log('⏱ quá 7 phút — dừng'); process.exit(3); }, 7 * 60e3).unref();
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
const grabbed = [];
ctx.on('response', async r => {
  try {
    const h = r.headers(), ct = h['content-type'] || '', cd = h['content-disposition'] || '';
    if (!/pdf|spreadsheet|excel|octet-stream|msword|zip/i.test(ct) && !/attachment|filename/i.test(cd)) return;
    const body = await r.body(); if (!body || body.length < 200) return;
    let name = (cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i) || [])[1] || r.url().split('/').pop().split('?')[0] || ('file_' + Date.now());
    try { name = decodeURIComponent(name); } catch (e) {}
    name = name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150);
    fs.writeFileSync(`${OUT}/resp_${name}`, body); grabbed.push(name);
    console.log(`   📥 bắt được file qua mạng: ${name} · ${body.length} byte · ${ct} · ${r.url().slice(0, 160)}`);
  } catch (e) {}
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
  const race = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(() => r(null), ms))]);
  async function dl(label, el) {
    say('   … bấm: ' + label);
    const wait = pg.waitForEvent('download', { timeout: 40000 }).catch(() => null);
    const pop = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
    await race(el.click({ timeout: 8000, force: true }).catch(e => say('     bấm lỗi:', e.message.split('\n')[0])), 10000);
    const np2 = await race(pop, 9000);
    if (np2) { say('     mở tab mới: ' + np2.url().slice(0, 200)); await np2.close().catch(() => {}); }
    const d = await race(wait, 42000);
    if (!d) { say('   ✗ ' + label + ': không có file'); return; }
    const f = `${OUT}/${d.suggestedFilename()}`;
    if (!(await race(d.saveAs(f).then(() => 1), 60000))) { say('   ✗ lưu file quá lâu'); return; }
    const buf = fs.readFileSync(f);
    say(`   ✅ TẢI ĐƯỢC (${label}): ${d.suggestedFilename()} · ${buf.length} byte · đầu file "${buf.slice(0, 8).toString('latin1').replace(/[^\x20-\x7e]/g, '.')}"`);
  }
  const listFiles = () => race(pg.evaluate(() => {
    const out = [];
    document.querySelectorAll('a,span,button,p,div').forEach(e => { if (e.children.length > 2) return; const t = (e.innerText || '').trim(); if (e.offsetParent && /\.(pdf|xlsx?|docx?|zip|rar)$/i.test(t) && t.length < 160 && !out.includes(t)) out.push(t); });
    return out;
  }), 15000).then(x => x || []);
  async function tryPdf(tag) {
    const names = await listFiles(); say('   file trên ' + tag + ':', JSON.stringify(names));
    for (const nm of names.filter(n => /\.pdf$/i.test(n)).slice(0, 2)) {
      const host = pg.getByText(nm, { exact: true }).first();
      const html = await host.evaluate(e => { let x = e; for (let i = 0; i < 2 && x.parentElement; i++) x = x.parentElement; return x.outerHTML.replace(/\s+/g, ' ').slice(0, 1200); }).catch(() => '');
      say('   HTML quanh "' + nm + '":', html);
      const reqs = []; const on = q => reqs.push(q.method() + ' ' + q.resourceType() + ' ' + q.url().slice(0, 250) + (q.postData() ? ' · gửi ' + q.postData().slice(0, 300) : ''));
      ctx.on('request', on);
      await dl(nm, host);
      await pg.waitForTimeout(2000);
      ctx.off('request', on);
      say('   yêu cầu sau khi bấm:\n     ' + reqs.filter(u => !/google|recaptcha|analytics|ngsp|woff/.test(u)).join('\n     '));
    }
  }
  /* PDF đi qua Agent (localhost:1234) ⇒ tìm trong mã JS của trang địa chỉ máy chủ thật để gọi thẳng bằng fileId */
  say('4) Tìm đường tải file trong mã JS của trang');
  const srcs = await pg.$$eval('script[src]', els => els.map(e => e.src)).catch(() => []);
  const seen = new Set(); let hits = [];
  for (const u of srcs) {
    if (seen.has(u) || !/muasamcong/.test(u)) continue; seen.add(u);
    const t = await race(pg.evaluate(async x => { try { return await (await fetch(x)).text(); } catch (e) { return ''; } }, u), 20000) || '';
    const re = /.{0,160}(download\/file|fileId=|\/download|localhost:1234|file\/browser|viewFile|getFile|file-attach|attach-file).{0,160}/gi; let m;
    while ((m = re.exec(t)) && hits.length < 60) hits.push(u.split('/').slice(-2).join('/') + ' ⇒ ' + m[0].replace(/\s+/g, ' '));
  }
  say('   ' + srcs.length + ' file JS, đoạn có chữ download/fileId:\n     ' + [...new Set(hits)].join('\n     '));
  /* gắn fileId: bấm file PDF, bắt yêu cầu localhost:1234 để lấy fileId */
  let fileId = '';
  const onq = q => { const m = q.url().match(/fileId=([\w-]+)/); if (m) fileId = m[1]; };
  ctx.on('request', onq);
  const pdfEl = pg.locator('tags.tags-fileAttach').first();
  if (await pdfEl.count()) { await race(pdfEl.click({ timeout: 8000 }).catch(() => {}), 10000); await pg.waitForTimeout(3000); }
  ctx.off('request', onq);
  await closePopups('agent', pg);
  say('   fileId:', fileId);
  if (fileId) {
    const cands = [
      '/api/download/file/browser/public?fileId=', '/o/egp-portal-contractor-selection-v2/services/download/file/browser/public?fileId=',
      '/o/egp-portal-contractor-selection-v2/services/api/download/file/browser/public?fileId=', '/o/egp-portal-contractor-selection-v2/services/file/download?fileId=',
      '/o/egp-portal-file/services/download/file/browser/public?fileId=', '/o/egp-portal-personal-page/services/download/file/browser/public?fileId=',
      '/egp/download/file/browser/public?fileId=', '/o/egp-portal-contractor-selection-v2/services/expose/download-file?fileId='];
    for (const c of cands) {
      const r = await race(pg.evaluate(async u => { try { const x = await fetch(u); const b = new Uint8Array(await x.arrayBuffer()); return x.status + ' ' + (x.headers.get('content-type') || '') + ' ' + b.length + ' "' + String.fromCharCode(...b.slice(0, 8)).replace(/[^\x20-\x7e]/g, '.') + '"'; } catch (e) { return 'ERR ' + e.message; } }, c + fileId), 20000);
      say('   thử ' + c + ' ⇒ ' + r);
    }
  }
  say('   file bắt qua mạng:', JSON.stringify(grabbed));
} catch (e) { say('LỖI:', e.message.split('\n')[0]); }

say('\n=== (bỏ in danh sách mạng) ===');
for (const x of []) {
  if (/\.(js|css|png|svg|woff2?)(\?|$)|js_resolve_modules|egp-portal-home|google-analytics|ngsp\.gov\.vn|get-time-now/.test(x.u)) continue;
  say(`${x.s} ${x.m} ${x.u.slice(0, 220)}`);
  if (x.pd) say('   gửi: ' + short(x.pd, 700));
  say('   nhận: ' + short(x.b, 500));
}
fs.writeFileSync(`${OUT}/network.json`, JSON.stringify(log, null, 1));
await b.close();
