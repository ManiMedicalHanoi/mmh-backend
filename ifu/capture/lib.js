/* Hạ tầng chụp ảnh MMH CRM: mở trang với phiên giả lập + backend giả lập (crm_mock.js) */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const MOCK = require('./crm_mock');
const APP = 'file:///home/user/MMH-CRM/index.html';
const OUT = '/home/claude/ifu/shots/crm';
const LOCAL = { Viet:'mmh.hanoi', Vinh:'mmh.danang', Phuong:'mmh.saigon', Tuyen:'tt.tuyen', 'Nguyen Ha':'nt.ha', Giang:'mmh.product', Dao:'manithailand', Miew:'manithailand4' };

async function newPage(browser, o){
  o = o || {};
  const mobile = !!o.mobile;
  const ctx = await browser.newContext(mobile ? { viewport:{ width:390, height:844 }, deviceScaleFactor:2, isMobile:true, hasTouch:true, locale:'vi-VN', timezoneId:'Asia/Ho_Chi_Minh' }
                                             : { viewport:{ width:1440, height:900 }, deviceScaleFactor:2, locale:'vi-VN', timezoneId:'Asia/Ho_Chi_Minh' });
  const page = await ctx.newPage();
  page._errs = [];
  page.on('pageerror', e => page._errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(new Date(o.time || '2026-10-07T09:00:00+07:00'));
  const pic = o.pic || 'Viet', team = o.team || (pic === 'Dao' || pic === 'Miew' ? 'thai' : 'dental');
  const sess = { level:o.level || 'pic', admin:!!o.admin };
  await page.addInitScript(([pic, team, sess, gate, local, keep, extra]) => {
    try {
      if (!sessionStorage.getItem('__init')){
        sessionStorage.setItem('__init', '1');
        if (!gate){
          localStorage.setItem('mmh_tk', JSON.stringify({ tk:'mocktk.' + local, exp:Date.now() + 30 * 864e5, user:{ pic, email:local + '@example.com', local, level:sess.level, admin:sess.admin }, at:Date.now() }));
        }
        localStorage.setItem('mmh_auth_later', new Date().toISOString().slice(0, 10));
        localStorage.setItem('mmh_team', team);
        localStorage.setItem('mmh_cors_ok', '1');
        localStorage.setItem('mmh_last_email', local + '@example.com');
        if (!keep.upd){
          const ids = ['2026-10-12-v31.4','2026-10-12-v31.3','2026-10-12-v31.2','2026-10-11-v31.1','2026-10-11-v31.0','2026-10-10-v30.9','2026-10-10-v30.8','2026-10-08-v30.7','2026-10-08-v30.6','2026-10-08-v30.5','2026-10-08-v30.4','2026-10-07-v30.3','2026-10-07-v30.2','2026-10-06-v30.1','2026-10-06-v30.0'];
          const h = {}; ids.forEach(i => h[i] = 1); ['Viet','Vinh','Phuong','Tuyen','Nguyen Ha','Giang','Dao','Miew','_'].forEach(p => localStorage.setItem('mmh_upd_hide_' + p, JSON.stringify(h)));
        }
        if (!keep.tfa) localStorage.setItem('mmh_tfa_seen', new Date().toISOString().slice(0, 10));
        Object.keys(extra || {}).forEach(k => localStorage.setItem(k, extra[k]));
      }
    } catch(e){}
  }, [pic, team, sess, !!o.gate, LOCAL[pic] || 'user', o.keep || {}, o.ls || {}]);
  await page.route(/fonts\.(googleapis|gstatic)|cdnjs|jsdelivr|unpkg/, r => r.fulfill({ status:200, body:'' }));
  const m = await MOCK.install(page, { team, pic, session:sess, onReq:o.onReq, noNaDecide:!o.naDecide });
  page._mock = m;
  await page.goto(APP + (o.hash || ''));
  await page.waitForTimeout(o.wait || 6000);
  if (!o.keepPopups) await page.evaluate(() => { try { if (window.UPD && UPD.isOpen && UPD.isOpen()) UPD.close(); } catch(e){} try { if (window.DL && DL.isOpen && DL.isOpen()) DL.close(); } catch(e){}
    try { const k = document.getElementById('kpn'); if (k) k.classList.remove('show'); } catch(e){} try { window.__tourClean && __tourClean(); } catch(e){} });
  return page;
}

async function shot(page, id, o){
  o = o || {};
  fs.mkdirSync(OUT, { recursive:true });
  const png = path.join(OUT, 'png', id + '.png'); fs.mkdirSync(path.dirname(png), { recursive:true });
  if (o.el) await page.locator(o.el).first().screenshot({ path:png });
  else await page.screenshot({ path:png, fullPage:!!o.full, clip:o.clip });
  const { execFileSync } = require('child_process');
  execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open(${JSON.stringify(png)}).convert('RGB')
if im.width>2000: im=im.resize((2000,round(im.height*2000/im.width)),Image.LANCZOS)
im.save(${JSON.stringify(path.join(OUT, id + '.jpg'))},quality=85,optimize=True)
`]);
  return id + '.jpg';
}
module.exports = { newPage, shot, chromium, OUT };
