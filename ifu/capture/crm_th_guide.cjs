/* Ảnh cho "MMH CRM — Sales Guide (Thailand Dental)", tiếng Anh, dữ liệu GIẢ hoàn toàn (crm_mock.cjs ▸ buildTHD, nhóm thaid, Yong).
   Chạy:  CRM_APP=http://127.0.0.1:8790/index.html NODE_PATH=$(npm root -g) node crm_th_guide.cjs [cảnh …]
   Ảnh:   ../shots/crmth/<id>.jpg  (máy tính 1440×900 · điện thoại 390×844, deviceScaleFactor 2) */
const { newPage, chromium } = require('./lib.cjs');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const W = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, '..', 'shots', 'crmth');
const CRM = process.env.CRM_REPO || '/home/user/MMH-CRM';
const NOTE_IDS = (() => { const w = {}; try { new Function('window', fs.readFileSync(CRM + '/updates/notes.js', 'utf8'))(w); } catch (e) {} return (w.MMH_UPDATES || []).map(u => u.id); })();
const HIDE = JSON.stringify(Object.fromEntries(NOTE_IDS.map(i => [i, 1])));

async function open(b, o){
  o = Object.assign({ pic:'Yong', team:'thaid', level:'pic', locale:'en-US', wait:7500 }, o);
  o.ls = Object.assign({ mmh_upd_hide_Yong:HIDE, mmh_upd_hide__:HIDE, mmh_lang:'en' }, o.gate ? { mmh_last_email:'name@manimedicalhanoi.com' } : {}, o.ls || {});
  if (o.gate && !o.time) o.time = '2026-11-02T09:00:00+07:00';
  const p = await newPage(b, o);
  await p.addStyleTag({ content:'#toast{display:none!important} #rhn-pop,.rhn-pop{display:none!important}' }).catch(() => {});
  await p.evaluate(() => { const k = () => ['oxv','pha-ov'].forEach(i => { const x = document.getElementById(i); if (x) x.remove(); }); k(); setInterval(k, 300); }).catch(() => {});
  return p;
}
async function shot(p, id, o){
  o = o || {};
  const png = path.join(OUT, 'png', id + '.png'); fs.mkdirSync(path.dirname(png), { recursive:true });
  if (o.el) await p.locator(o.el).first().screenshot({ path:png });
  else await p.screenshot({ path:png, clip:o.clip });
  execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open(${JSON.stringify(png)}).convert('RGB')
if im.width>2000: im=im.resize((2000,round(im.height*2000/im.width)),Image.LANCZOS)
im.save(${JSON.stringify(path.join(OUT, id + '.jpg'))},quality=84,optimize=True)
`]);
}
const ev = (p, fn, arg) => p.evaluate(fn, arg);
const box = (p, sel, pad) => p.evaluate(([s, pd]) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x:Math.max(0, r.x - pd), y:Math.max(0, r.y - pd), width:Math.min(innerWidth, r.width + pd * 2), height:Math.min(innerHeight - Math.max(0, r.y - pd), r.height + pd * 2) }; }, [sel, pad || 8]);
const clickText = (p, re, sel) => p.evaluate(([re, sel]) => { const R = new RegExp(re); const e = [...document.querySelectorAll(sel || 'button,a,.chip,[onclick]')].find(x => x.offsetParent && R.test((x.textContent || '').trim())); if (e){ e.click(); return true; } return false; }, [re, sel]);
async function cal(p, view){ await ev(p, () => go('weekly')); await W(900); await ev(p, () => { try { setWkTab('visit'); } catch (e) {} }); await W(400);
  await clickText(p, '^Calendar$', '#v33-wkseg button, button'); await W(900);
  if (view) await clickText(p, '^(' + view + ')$', 'button'); await W(600); }
const rowOf = (p, re, date) => p.evaluate(([re, date]) => ((S.cache.weekly && S.cache.weekly.rows || []).find(r => (!date || String(r.start).slice(0, 10) === date) && new RegExp(re).test(r.account)) || {})._row, [re, date]);
const fill = (p, map) => ev(p, m => { Object.keys(m).forEach(id => { const e = document.getElementById(id); if (e){ e.value = m[id]; e.dispatchEvent(new Event('input', { bubbles:true })); e.dispatchEvent(new Event('change', { bubbles:true })); } }); }, map);
const M = { mobile:true };

const SC = {};
/* 1 · sign in */
SC.login = async b => { const p = await open(b, { gate:true, wait:4000 }); await shot(p, 'login'); return p; };
SC.login_code = async b => { const p = await open(b, { gate:true, wait:4000 });
  await ev(p, () => { const i = document.querySelector('input[type=email],input[placeholder*="@"]'); if (i){ i.value = 'name@manimedicalhanoi.com'; i.dispatchEvent(new Event('input', { bubbles:true })); } });
  await clickText(p, '^Send sign-in code'); await W(1500); await shot(p, 'login_code'); return p; };
SC.m_login = async b => { const p = await open(b, Object.assign({ gate:true, wait:4000 }, M)); await shot(p, 'm_login'); return p; };
SC.install = async b => { const p = await open(b); await cal(p); await ev(p, () => MMHApp.guide()); await W(700); await shot(p, 'install'); return p; };
SC.m_install = async b => { const p = await open(b, M); await ev(p, () => V30.more()); await W(800); await shot(p, 'm_install'); return p; };
/* 2 · screen layout */
SC.home = async b => { const p = await open(b); await cal(p); await shot(p, 'home'); return p; };
SC.m_today = async b => { const p = await open(b, M); await ev(p, () => V31.today()); await W(1300); await shot(p, 'm_today'); return p; };
SC.m_cal = async b => { const p = await open(b, M); await ev(p, () => go('weekly')); await W(1600); await shot(p, 'm_cal'); return p; };
SC.m_more = async b => { const p = await open(b, M); await ev(p, () => V30.more()); await W(800); await shot(p, 'm_more'); return p; };
/* 3 · data entry: customer task */
SC.add_menu = async b => { const p = await open(b); await cal(p); await ev(p, () => calAdd(todayISO())); await W(700); await shot(p, 'add_menu'); return p; };
SC.task_new = async b => { const p = await open(b); await cal(p); await ev(p, () => formWeekly(null)); await W(1100);
  await ev(p, () => { const a = document.getElementById('nt_accName'); if (a){ a.value = 'Chao Phraya Dental Hospital (demo)'; a.dispatchEvent(new Event('input', { bubbles:true })); a.dispatchEvent(new Event('change', { bubbles:true })); } }); await W(700);
  await p.evaluate(() => { const e = [...document.querySelectorAll('#ov *')].filter(x => x.children.length < 3 && /^Chao Phraya Dental Hospital \(demo\)$/.test((x.textContent || '').trim()) && x.offsetParent && x.id !== 'nt_accName'); const t = e[e.length - 1]; if (t){ (t.closest('[onclick],[onmousedown],li,.it,.row') || t).dispatchEvent(new MouseEvent('mousedown', { bubbles:true })); (t.closest('[onclick],li,.it,.row') || t).click(); } }); await W(800);
  await ev(p, () => { const s = document.getElementById('nt_typeAction'); if (s){ const o = [...s.options].find(x => /Co-visiting/i.test(x.value)); if (o){ s.value = o.value; s.dispatchEvent(new Event('change', { bubbles:true })); } } }); await W(400);
  await shot(p, 'task_new'); return p; };
SC.m_task_new = async b => { const p = await open(b, M); await ev(p, () => go('weekly')); await W(900); await ev(p, () => formWeekly(null)); await W(1200); await shot(p, 'm_task_new'); return p; };
SC.task_result = async b => { const p = await open(b); await cal(p);
  const r = await rowOf(p, 'Nonthaburi', '2026-10-07'); await ev(p, r => openTask(r), r); await W(1300);
  await ev(p, () => { const s = document.getElementById('tk-status'); if (s){ s.value = [...s.options].find(o => /complet/i.test(o.value)).value; s.dispatchEvent(new Event('change', { bubbles:true })); } }); await W(500);
  await ev(p, () => { const t = ['Hands-on demo of MMG Composite with Dr. Anan.', 'Uses a competitor composite; shade matching is an issue.', 'Likes the polishability; wants to try A2 and A3.', 'Send 2 sample syringes through DDI next week.'];
    t.forEach((x, i) => { const e = document.getElementById('tk-result-p' + i); if (e){ e.value = x; e.dispatchEvent(new Event('input', { bubbles:true })); } }); });
  await W(500); await ev(p, () => { const e = document.getElementById('tk-result-p0'); if (e) e.scrollIntoView({ block:'center' }); }); await W(400);
  await shot(p, 'task_result'); return p; };
SC.m_task_result = async b => { const p = await open(b, M); await ev(p, () => go('weekly')); await W(900);
  const r = await rowOf(p, 'Nonthaburi', '2026-10-07'); await ev(p, r => V30.done(r), r); await W(1600); await shot(p, 'm_task_result'); return p; };
SC.task_list = async b => { const p = await open(b); await ev(p, () => go('weekly')); await W(800); await clickText(p, '^List$', '#v33-wkseg button, button'); await W(1400); await shot(p, 'task_list'); return p; };
/* other tasks */
SC.other = async b => { const p = await open(b); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1600); await shot(p, 'other'); return p; };
SC.other_keys = async b => { const p = await open(b); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1200); await ev(p, () => { try { fxOpen(todayISO()); } catch (e) { formOtherKey(''); } }); await W(1000); await shot(p, 'other_keys'); return p; };
SC.m_other = async b => { const p = await open(b, M); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1600); await shot(p, 'm_other'); return p; };
/* business trip */
SC.trip_propose = async b => { const p = await open(b); await cal(p); await ev(p, () => tripProposeOpen('2026-10-27')); await W(1800); await shot(p, 'trip_propose'); return p; };
SC.m_trip_propose = async b => { const p = await open(b, M); await ev(p, () => go('weekly')); await W(800); await ev(p, () => tripProposeOpen('2026-10-27')); await W(1800); await shot(p, 'm_trip_propose'); return p; };
SC.trip_card = async b => { const p = await open(b, { time:'2026-10-14T09:00:00+07:00' }); await cal(p); await ev(p, () => { const it = calItems().find(i => i.kind === 't'); if (it) calOpen(it.id); }); await W(2500); await shot(p, 'trip_card'); return p; };
/* event */
SC.event = async b => { const p = await open(b); await ev(p, () => go('event')); await W(2500); await shot(p, 'event'); return p; };
SC.event_form = async b => { const p = await open(b); await ev(p, () => go('event')); await W(2000); await ev(p, () => evForm(null, '2026-10-24')); await W(1500); await shot(p, 'event_form'); return p; };
/* customers */
SC.cust = async b => { const p = await open(b); await ev(p, () => go('cust')); await W(1600); await shot(p, 'cust'); return p; };
SC.cust_new = async b => { const p = await open(b); await ev(p, () => go('cust')); await W(900); await ev(p, () => openNewAccount({ name:'', withCbc:true })); await W(1000);
  await fill(p, { na_name:'Siam Smile Dental Clinic', na_contact:'Dr. Kanya S.', na_phone:'080 000 0123' }); await W(400); await shot(p, 'cust_new'); return p; };
SC.cust_profile = async b => { const p = await open(b); await ev(p, () => go('cust')); await W(900);
  await ev(p, () => { const c = (S.custIndex || []).find(x => /Chao Phraya/.test(x.name)) || (S.custIndex || [])[0]; if (c) openAcc(c.code, c.name); }); await W(2600); await shot(p, 'cust_profile'); return p; };
SC.m_cust = async b => { const p = await open(b, M); await ev(p, () => go('cust')); await W(1600); await shot(p, 'm_cust'); return p; };
/* 4 · reports */
SC.report = async b => { const p = await open(b); await ev(p, () => { S.rpKind = 'week'; go('report'); }); await W(2600); await shot(p, 'report'); return p; };
SC.m_report = async b => { const p = await open(b, M); await ev(p, () => { S.rpKind = 'week'; go('report'); }); await W(2600); await shot(p, 'm_report'); return p; };
SC.monthly = async b => { const p = await open(b); await ev(p, () => go('monthly')); await W(2000); await shot(p, 'monthly'); return p; };
SC.monthly_drawer = async b => { const p = await open(b); await ev(p, () => go('monthly')); await W(1500); await ev(p, () => { const r = (S.cache.monthly && S.cache.monthly.rows || []).find(x => x.pic === 'Yong'); openMonthly(r ? r._row : 4); }); await W(1300); await shot(p, 'monthly_drawer'); return p; };
SC.kpi_report = async b => { const p = await open(b); await ev(p, () => go('kpi')); await W(2000); await ev(p, () => KR.open('Yong', '202609')); await W(2500); await shot(p, 'kpi_report'); return p; };
/* 5 · overview */
SC.dash = async b => { const p = await open(b); await ev(p, () => go('dash')); await W(2800); await shot(p, 'dash'); return p; };
SC.m_dash = async b => { const p = await open(b, M); await ev(p, () => go('dash')); await W(2800); await shot(p, 'm_dash'); return p; };
SC.kpi = async b => { const p = await open(b); await ev(p, () => go('kpi')); await W(3000); await shot(p, 'kpi'); return p; };
SC.m_kpi = async b => { const p = await open(b, M); await ev(p, () => go('kpi')); await W(3000); await shot(p, 'm_kpi'); return p; };
SC.cal_month = async b => { const p = await open(b); await cal(p, 'Month'); await shot(p, 'cal_month'); return p; };
SC.search = async b => { const p = await open(b); await cal(p); await p.click('#qsBtn').catch(() => ev(p, () => QS && QS.open && QS.open())); await W(500); await p.keyboard.type('chao'); await W(900); await shot(p, 'search'); return p; };

module.exports = { SC };
if (require.main === module) (async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SC);
  const b = await chromium.launch();
  for (const id of ids){
    if (!SC[id]){ console.log('? ' + id); continue; }
    try { const p = await SC[id](b); console.log('✓ ' + id + (p && p._errs.length ? '  JS: ' + p._errs.slice(0, 2).join(' | ') : '')); if (p) await p.context().close(); }
    catch (e){ console.log('✗ ' + id + ': ' + e.message.split('\n')[0]); }
  }
  await b.close();
})();
