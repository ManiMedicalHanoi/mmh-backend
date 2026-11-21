// Dò (CHỈ ĐỌC) cách muasamcong tìm gói Chỉ định thầu rút gọn / Chào giá trực tuyến rút gọn / Mua sắm trực tiếp — gói bot "không tìm thấy".
// Workflow "Theo dõi gói thầu — dò tìm kiếm" (tender-probe.yml). PROBE_NOS = các số cần thử. Không gọi máy chủ MMH.
import { chromium } from 'playwright';
import fs from 'node:fs';
const NOS = (process.env.PROBE_NOS || 'IB2600578840 DC2600100862 IB2600560840 IB2600466091').split(/[ ,]+/).filter(Boolean);
const OUT = process.env.PROBE_OUT || 'probe-out'; fs.mkdirSync(OUT, { recursive: true });
const HOME = 'https://muasamcong.mof.gov.vn/';
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const b = await chromium.launch();
const ctx = await b.newContext({ locale: 'vi-VN', viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
const pg = await ctx.newPage();
const log = [];
pg.on('request', r => { if (/search|smart/i.test(r.url()) && r.method() === 'POST') log.push({ t: 'req', url: r.url().replace(/token=[^&]+/, 'token=…'), body: (r.postData() || '').slice(0, 1500) }); });
pg.on('response', async r => { if (/search|smart/i.test(r.url()) && r.request().method() === 'POST') { let j = null; try { j = await r.json(); } catch (e) {} const pc = j && j.page ? j.page : (j || {}); const items = (pc.content || []); log.push({ t: 'res', url: r.url().replace(/token=[^&]+/, 'token=…'), status: r.status(), total: pc.totalElements, n: items.length, keys: items[0] ? Object.keys(items[0]).slice(0, 40) : [], first: items[0] ? JSON.stringify(items[0]).slice(0, 900) : '' }); } });
async function closePopups() { await pg.evaluate(() => { [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.6 && e.offsetHeight > innerHeight * 0.6 && +cs.zIndex >= 50; }).forEach(e => e.remove()); document.body.style.overflow = 'auto'; }).catch(() => {}); }
await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pg.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 45000 }).catch(() => say('không thấy ô tìm kiếm'));
await pg.waitForTimeout(3000); await closePopups();
// các lựa chọn quanh ô tìm kiếm
const opts = await pg.evaluate(() => {
  const box = document.querySelector('input[placeholder*="IB000202"]'); let root = box; for (let i = 0; i < 6 && root && root.parentElement; i++) root = root.parentElement;
  const lab = [...(root || document).querySelectorAll('label, [role=radio], [role=tab], .ant-radio-wrapper, .ant-tabs-tab, select option, button')].filter(e => e.offsetParent).map(e => (e.innerText || e.value || '').trim()).filter(Boolean);
  const ph = [...document.querySelectorAll('input')].filter(e => e.offsetParent).map(e => e.placeholder).filter(Boolean);
  return { lab: [...new Set(lab)].slice(0, 60), ph };
});
say('LỰA CHỌN QUANH Ô TÌM KIẾM:', JSON.stringify(opts));
await pg.screenshot({ path: OUT + '/home.png', fullPage: false });
const radios = opts.lab.filter(t => t.length < 40);
async function trySearch(no, tag) {
  const sel = 'input[placeholder*="IB000202"]:visible, input[placeholder*="KHLCNT"]:visible';
  const box = pg.locator(sel).first();
  const n0 = log.length;
  await box.fill('').catch(() => {}); await box.fill(no).catch(e => say('  fill lỗi', e.message.split('\n')[0]));
  await box.press('Enter').catch(() => {});
  await pg.waitForTimeout(7000);
  const got = log.slice(n0);
  say(`  [${tag}] ${no}:`); got.forEach(x => say('    ', JSON.stringify(x)));
  const links = await pg.evaluate(() => [...document.querySelectorAll('a[href*="render=detail"]')].slice(0, 5).map(a => a.getAttribute('href'))).catch(() => []);
  say('     link chi tiết:', JSON.stringify(links));
  await pg.screenshot({ path: `${OUT}/${no}_${tag.replace(/\W+/g, '_')}.png` }).catch(() => {});
}
for (const no of (process.env.PROBE_P1 === '0' ? [] : NOS)) {
  await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  await pg.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 45000 }).catch(() => {});
  await pg.waitForTimeout(2500); await closePopups();
  await trySearch(no.replace(/-\d+$/, ''), 'mặc định');
  await trySearch(no, 'kèm -00');
  for (const r of radios.slice(0, 8)) {
    const ok = await pg.locator(`label:has-text("${r}"):visible`).first().click({ timeout: 3000 }).then(() => true, () => false);
    if (!ok) continue;
    await pg.waitForTimeout(1200);
    await trySearch(no.replace(/-\d+$/, ''), 'chọn ' + r);
  }
}
// trang tra cứu nâng cao (nếu có)
for (const u of (process.env.PROBE_P1 === '0' ? [] : ['https://muasamcong.mof.gov.vn/web/guest/contractor-selection?render=search', 'https://muasamcong.mof.gov.vn/web/guest/contractor-selection?p_p_id=egpportalcontractorselectionv2_WAR_egpportalcontractorselectionv2&_egpportalcontractorselectionv2_WAR_egpportalcontractorselectionv2_render=search'])) {
  await pg.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => say('goto lỗi', e.message.split('\n')[0]));
  await pg.waitForTimeout(6000); await closePopups();
  const info = await pg.evaluate(() => ({ title: document.title, ph: [...document.querySelectorAll('input')].filter(e => e.offsetParent).map(e => e.placeholder).filter(Boolean).slice(0, 20), lab: [...new Set([...document.querySelectorAll('label, .ant-select-selection-item, .ant-tabs-tab, button')].filter(e => e.offsetParent).map(e => e.innerText.trim()).filter(t => t && t.length < 60))].slice(0, 60) })).catch(() => ({}));
  say('TRANG TRA CỨU', u.slice(-60), JSON.stringify(info));
  await pg.screenshot({ path: OUT + '/search_' + (u.length % 97) + '.png' }).catch(() => {});
}

// ── Lần 2: bỏ bộ lọc caseKHKQ ≠ 1 (trang tự gắn khi tìm theo số) rồi mở trang chi tiết, liệt kê tab / nút ──
if (process.env.PROBE_P2 !== '0') {
  await pg.route(/smart\/search/, async route => {
    const r = route.request(); let body = r.postData() || '';
    try { const j = JSON.parse(body); j.forEach(q => (q.query || []).forEach(x => { x.filters = (x.filters || []).filter(f => f.fieldName !== 'caseKHKQ'); })); body = JSON.stringify(j); } catch (e) {}
    await route.continue({ postData: body });
  });
  for (const no of NOS) {
    await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await pg.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 45000 }).catch(() => {});
    await pg.waitForTimeout(2500); await closePopups();
    await trySearch(no.replace(/-\d+$/, ''), 'bỏ caseKHKQ');
    const href = await pg.evaluate(() => { const a = document.querySelector('a[href*="render=detail"]'); return a ? a.getAttribute('href') : ''; }).catch(() => '');
    if (!href) { say('  ⇒ vẫn không có link'); continue; }
    const url = href.startsWith('/') ? 'https://muasamcong.mof.gov.vn' + href : href;
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => say('  goto lỗi', e.message.split('\n')[0]));
    await pg.waitForTimeout(9000); await closePopups();
    const d = await pg.evaluate(() => {
      const vis = e => e.offsetParent;
      const tabs = [...document.querySelectorAll('[role=tab], .ant-tabs-tab, .nav-link, li.tab, .tab-item')].filter(vis).map(e => e.innerText.trim()).filter(Boolean);
      const btns = [...new Set([...document.querySelectorAll('button, a')].filter(vis).map(e => e.innerText.trim()).filter(t => t && t.length < 40))].filter(t => /xuất|tải|excel|kết quả|thông báo|hồ sơ|quyết định/i.test(t));
      const kv = [...document.querySelectorAll('.infomation__content')].filter(vis).slice(0, 25).map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 120));
      const files = [...document.querySelectorAll('.tags-fileAttach, [class*=fileAttach]')].filter(vis).map(e => e.innerText.trim().slice(0, 80));
      return { title: document.title, tabs, btns, kv, files, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 600) };
    }).catch(e => ({ err: e.message }));
    say('  ⇒ TRANG CHI TIẾT', url.replace(/.*render=/, 'render=').slice(0, 220));
    say('     ', JSON.stringify(d).slice(0, 2500));
    await pg.screenshot({ path: `${OUT}/${no}_chitiet.png`, fullPage: true }).catch(() => {});
  }
}
await b.close();
fs.writeFileSync(OUT + '/log.json', JSON.stringify(log, null, 1));
