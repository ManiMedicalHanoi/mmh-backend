/* Ảnh cho HDSD MMH CRM bản v34.4 (VN + EN), dữ liệu GIẢ hoàn toàn (crm_mock.cjs).
   Chạy:  NODE_PATH=$(npm root -g) node crm_guide.cjs [vi|en|all] [cảnh …]
   Ảnh:   ../shots/crmg/<id>.jpg (tiếng Việt, nhóm Dental VN — Viet) · ../shots/crmg_en/<id>.jpg (tiếng Anh, nhóm Thailand Surgical — Dao)
   Cần app chạy qua http (service worker / cài app): CRM_APP=http://127.0.0.1:8790/index.html (python3 -m http.server trong MMH-CRM). */
const { newPage, chromium } = require('./lib.cjs');
const MOCK = require('./crm_mock.cjs');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const W = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..', 'shots');
const CRM = process.env.CRM_REPO || '/home/user/MMH-CRM';
/* ẩn mọi thông báo cập nhật đã có (đọc thẳng notes.js) */
const NOTE_IDS = (() => { const w = {}; try { new Function('window', fs.readFileSync(CRM + '/updates/notes.js', 'utf8'))(w); } catch (e) {} return (w.MMH_UPDATES || []).map(u => u.id); })();
const HIDE = JSON.stringify(Object.fromEntries(NOTE_IDS.map(i => [i, 1])));
const hideLs = () => Object.fromEntries(['Viet','Vinh','Phuong','Tuyen','Nguyen Ha','Giang','Dao','Miew','_'].map(p => ['mmh_upd_hide_' + p, HIDE]));

/* đơn chờ duyệt (orderPending) dựng từ dữ liệu giả */
function pendingOf(me){
  const D = MOCK.buildVN(); const g = {};
  D.order.filter(o => o.month === '202610').forEach(o => {
    const k = o.orderNo + '|' + o.pic;
    const x = g[k] = g[k] || { key:'k' + o._row, rows:[], lines:[], appr:/Chờ/.test(o.appr) ? 'wait' : /Đã duyệt/.test(o.appr) ? 'ok' : 'no', apprBy:o.apprBy || '', apprAt:'', pic:o.pic, account:o.name, name:o.name, code:o.code,
      orderNo:o.orderNo, day:o.day, month:o.month, amount:0, kpi:0, otype:o.otype || '', tender:0, kqtt:'', partner:o.partner, need:true, apprNote:o.apprNote || '',
      docs:o.docs ? [{ name:o.docs.split(' | ')[0], url:o.docs.split(' | ')[1] }] : [] };
    x.rows.push(o._row); x.amount += o.amount; x.kpi += o.amount;
    x.lines.push({ row:o._row, detail:o.detail, ptype:o.ptype, qty:o.qty, amount:o.amount }); });
  Object.values(g).forEach(x => { x.warn = x.docs.length ? [] : ['Thiếu phiếu bán hàng & xuất kho của NPP']; x.ready = !x.warn.length; x.canDecide = me === 'Tuyen' && x.appr === 'wait'; });
  const groups = {}; Object.values(g).forEach(o => { (groups[o.pic] = groups[o.pic] || { pic:o.pic, month:'202610', orders:[] }).orders.push(o); });
  return { ok:true, approver:me === 'Tuyen', pending:Object.values(g).filter(o => o.appr === 'wait').length, groups:Object.values(groups) };
}
function onReq(me){ return (h, a, q, d) => {
  if (a === 'orderPending') return pendingOf(me);
  if (a === 'orderRequest' || a === 'orderDecide') return { ok:true, message:'OK' };
  if (a === 'rpStatus') return { ok:true, sent:{ Viet:{ from:'2026-09-28', at:'2026-10-03 17:20' }, Vinh:{ from:'2026-09-21', at:'' }, Phuong:{ from:'2026-09-28', at:'2026-10-04 09:10' } }, since:'2026-09-14' };
  if (a === 'evList') return { ok:true, items:[] };
  if (a === 'rhCustTrain') return { ok:true, items:[
    { sid:'TE-2610-01', date:'2026-10-03', title:'Workshop nội nha JIZAI', team:'Dental', product:'Jizai', place:'PK Nha khoa Kim', target:15, actual:13, status:'Completed', trainer:'Viet', audience:['BS. Lan','BS. Hùng'], review:'' },
    { sid:'TE-2610-02', date:'2026-10-15', title:'Hướng dẫn sử dụng Mani Bond', team:'Dental', product:'Mani Bond', place:'Viện Đào tạo RHM – ĐH Y Hà Nội', target:30, actual:'', status:'Planned', trainer:'Viet', audience:[], review:'' }] };
  return null;
}; }

async function open(b, o){
  o = Object.assign({}, o);
  const en = o.lang === 'en';
  if (en && !o.pic){ o.pic = 'Dao'; o.team = 'thai'; o.level = o.level || 'lead'; }
  o.ls = Object.assign(hideLs(), o.ls || {});
  o.onReq = o.onReq || onReq(o.pic || 'Viet');
  o.wait = o.wait || (en ? 7000 : 6000);
  if (o.gate && !o.time) o.time = '2026-11-02T09:00:00+07:00';     /* hết hạn đăng nhập bằng mật khẩu cũ ⇒ màn đăng nhập như hiện nay */
  if (en && o.gate) o.locale = 'en-US';
  const p = await newPage(b, o);
  /* ảnh sạch: ẩn thông báo nổi + hộp "Đơn hàng cần chỉnh sửa" tự mở (trừ cảnh cần) */
  await p.addStyleTag({ content: o.toast ? '' : '#toast{display:none!important}' }).catch(() => {});
  if (!o.keepOx) await p.evaluate(() => { const k = () => { const x = document.getElementById('oxv'); if (x && !window.__keepOx) x.remove(); }; k(); setInterval(k, 250); }).catch(() => {});
  return p;
}
async function shot(p, dir, id, o){
  o = o || {};
  const out = path.join(ROOT, dir), png = path.join(out, 'png', id + '.png'); fs.mkdirSync(path.dirname(png), { recursive:true });
  if (o.el) await p.locator(o.el).first().screenshot({ path:png });
  else await p.screenshot({ path:png, fullPage:!!o.full, clip:o.clip });
  execFileSync('python3', ['-c', `
from PIL import Image
im=Image.open(${JSON.stringify(png)}).convert('RGB')
if im.width>2000: im=im.resize((2000,round(im.height*2000/im.width)),Image.LANCZOS)
im.save(${JSON.stringify(path.join(out, id + '.jpg'))},quality=84,optimize=True)
`]);
}
const ev = (p, fn, arg) => p.evaluate(fn, arg);
const clickText = (p, re, sel) => p.evaluate(([re, sel]) => { const R = new RegExp(re); const e = [...document.querySelectorAll(sel || 'button,a,.chip,[onclick]')].find(x => x.offsetParent && R.test((x.textContent || '').trim())); if (e){ e.click(); return true; } return false; }, [re, sel]);
const box = (p, sel, pad) => p.evaluate(([s, pd]) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x:Math.max(0, r.x - pd), y:Math.max(0, r.y - pd), width:Math.min(innerWidth, r.width + pd * 2), height:Math.min(innerHeight, r.height + pd * 2) }; }, [sel, pad || 8]);
async function myCal(p){ await p.evaluate(() => { const b = [...document.querySelectorAll('.chip')].find(e => /\((tôi|me)\)\s*$/.test((e.textContent || '').trim()) && e.offsetParent); if (b) b.click(); }); await W(600); }
async function cal(p, view){ await ev(p, () => go('weekly')); await W(900); await ev(p, () => { try { if (typeof setWkTab === 'function') setWkTab('visit'); } catch (e) {} }); await W(500);
  await ev(p, () => { const b = [...document.querySelectorAll('#v33-wkseg button, button')].find(x => /^(Lịch|Calendar)$/.test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); }); await W(900);
  if (view) await ev(p, v => { const b = [...document.querySelectorAll('button')].find(x => new RegExp('^(' + v + ')$').test(x.textContent.trim()) && x.offsetParent); if (b) b.click(); }, view);
  await W(700); }
const rowOf = (p, re, date) => p.evaluate(([re, date]) => ((S.cache.weekly && S.cache.weekly.rows || []).find(r => (!date || String(r.start).slice(0, 10) === date) && new RegExp(re).test(r.account)) || {})._row, [re, date]);
const MO = { mobile:true };

/* ═════════════ CẢNH ═════════════ (mỗi cảnh: async (b, lang, dir) ⇒ page) */
const SC = {};
const both = (id, fn) => { SC[id] = fn; };
/* đăng nhập + cài app */
both('login', async (b, L, d) => { const p = await open(b, { lang:L, gate:true, wait:4000 }); if (L === 'en') await ev(p, () => {}); await shot(p, d, 'login'); return p; });
both('m_login', async (b, L, d) => { const p = await open(b, { lang:L, gate:true, mobile:true, wait:4000 }); await shot(p, d, 'm_login'); return p; });
both('login_code', async (b, L, d) => { const p = await open(b, { lang:L, gate:true, wait:4000 });
  await ev(p, () => { const i = document.querySelector('input[type=email],input[placeholder*="@"]'); if (i){ i.value = 'dao@example.com'; i.dispatchEvent(new Event('input', { bubbles:true })); } });
  await clickText(p, '^(Gửi mã|Send code|Send the code)'); await W(1500); await shot(p, d, 'login_code'); return p; });
both('install_desk', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await ev(p, () => MMHApp.guide()); await W(600); await shot(p, d, 'install_desk'); return p; });
both('install_btn', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); const bx = await box(p, '#app header', 0); await shot(p, d, 'install_btn', { clip:{ x:bx.x + bx.width * 0.35, y:0, width:bx.width * 0.65, height:bx.height + 6 } }); return p; });
both('m_install_more', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => V30.more()); await W(800); await shot(p, d, 'm_install_more'); return p; });
both('m_install_android', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => MMHApp.guide()); await W(600); await shot(p, d, 'm_install_android'); return p; });
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
both('m_install_ios', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true, ua:IOS_UA }); await ev(p, () => MMHApp.guide()); await W(600); await shot(p, d, 'm_install_ios'); return p; });
/* bố cục */
both('home', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await myCal(p); await shot(p, d, 'home'); return p; });
both('m_today', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => V31.today()); await W(1200); await shot(p, d, 'm_today'); return p; });
both('m_cal', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('weekly')); await W(1500); await shot(p, d, 'm_cal'); return p; });
both('m_more', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => V30.more()); await W(800); await shot(p, d, 'm_more'); return p; });
both('search', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await p.click('#qsBtn'); await W(500); await p.keyboard.type(L === 'en' ? 'dent' : 'kim'); await W(900); await shot(p, d, 'search'); return p; });
both('tour', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await ev(p, () => TOUR.open()); await W(900); await shot(p, d, 'tour'); return p; });
both('whats_new', async (b, L, d) => { const p = await open(b, { lang:L, ls:{ ['mmh_upd_hide_' + (L === 'en' ? 'Dao' : 'Viet')]:'{}' }, keepPopups:true, time:'2026-11-02T09:00:00+07:00' }); await W(800); await ev(p, () => { if (!UPD.isOpen()) UPD.open(true); }); await W(800); await shot(p, d, 'whats_new'); return p; });
/* lịch + đi địa bàn */
both('cal_month', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p, 'Tháng|Month'); await myCal(p); await shot(p, d, 'cal_month'); return p; });
both('cal_list', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('weekly')); await W(1500); await shot(p, d, 'cal_list'); return p; });
both('add_menu', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await myCal(p); await ev(p, () => calAdd(todayISO())); await W(700); await shot(p, d, 'add_menu'); return p; });
both('visit_new', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await ev(p, () => formWeekly(null)); await W(1000);
  await ev(p, L => { const a = document.getElementById('nt_accName'); if (a){ a.value = L === 'en' ? '' : 'PK Nha khoa Kim'; } }, L); await shot(p, d, 'visit_new'); return p; });
both('visit_result', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p);
  const r = await rowOf(p, L === 'en' ? '.' : 'Minh Anh', '2026-10-07'); await ev(p, r => openTask(r), r); await W(1300);
  await ev(p, () => { const s = document.getElementById('tk-status'); if (s){ s.value = [...s.options].find(o => /complet/i.test(o.value)).value; s.dispatchEvent(new Event('change', { bubbles:true })); } });
  await ev(p, () => { const t = ['Demo trâm JIZAI cho BS Lan, hướng dẫn quy trình 3 bước.', 'Đang dùng trâm hãng khác, chi phí cao.', 'Hài lòng với độ dẻo, muốn dùng thử 2 tuần.', 'Gửi báo giá + mẫu dùng thử trong tuần sau.'];
    t.forEach((x, i) => { const e = document.getElementById('tk-result-p' + i); if (e){ e.value = x; e.dispatchEvent(new Event('input', { bubbles:true })); } }); });
  await W(600); await shot(p, d, 'visit_result'); return p; });
both('visit_finish', async (b, L, d) => { const p = await open(b, { lang:L, time:'2026-10-10T09:00:00+07:00' }); await cal(p);
  const r = await p.evaluate(() => ((S.cache.weekly && S.cache.weekly.rows || []).find(r => { const d = String(r.start).slice(0, 10); return d >= '2026-10-08' && d <= '2026-10-09' && !/complet/i.test(r.status); }) || {})._row); await ev(p, r => openTask(r), r); await W(1300);
  await ev(p, () => { const s = document.getElementById('tk-status'); s.value = [...s.options].find(o => /complet/i.test(o.value)).value; s.dispatchEvent(new Event('change', { bubbles:true })); }); await W(500);
  await ev(p, () => { const f = document.getElementById('v343-fin'); if (f) f.scrollIntoView({ block:'center' }); }); await W(300);
  const bx = await box(p, '#v343-fin', 0); if (bx){ await shot(p, d, 'visit_finish', { clip:{ x:bx.x - 20, y:bx.y - 120, width:Math.min(900, bx.width + 40), height:bx.height + 150 } }); } else await shot(p, d, 'visit_finish'); return p; });
both('m_visit_result', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('weekly')); await W(800);
  const r = await rowOf(p, L === 'en' ? '.' : 'Minh Anh', '2026-10-07'); await ev(p, r => V30.done(r), r); await W(1500); await shot(p, d, 'm_visit_result'); return p; });
both('m_photo', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('weekly')); await W(800);
  const r = await rowOf(p, 'Kim', '2026-10-06'); await ev(p, r => openTask(r), r); await W(1500);
  await ev(p, () => { const e = document.querySelector('#tk-ph, .ph-sec, [id*="photo"]'); if (e) e.scrollIntoView({ block:'start' }); }); await W(300); await shot(p, d, 'm_photo'); return p; });
both('photos', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('photos')); await W(2500); await shot(p, d, 'photos'); return p; });
/* công việc khác */
both('other', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1600); await shot(p, d, 'other'); return p; });
both('other_keys', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1200); await ev(p, () => { try { fxOpen(todayISO()); } catch (e) { formOtherKey(''); } }); await W(1000); await shot(p, d, 'other_keys'); return p; });
both('m_other', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1500); await shot(p, d, 'm_other'); return p; });
/* công tác */
both('trip_propose', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await ev(p, () => tripProposeOpen('2026-10-26')); await W(1800); await shot(p, d, 'trip_propose'); return p; });
both('m_trip_propose', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('weekly')); await W(800); await ev(p, () => tripProposeOpen('2026-10-26')); await W(1800); await shot(p, d, 'm_trip_propose'); return p; });
both('trip_report', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await ev(p, () => { const it = calItems().find(i => i.kind === 't'); if (it) calOpen(it.id); }); await W(2500); await shot(p, d, 'trip_report'); return p; });
/* khách hàng */
both('cust', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('cust')); await W(1600); await shot(p, d, 'cust'); return p; });
both('cust_profile', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('cust')); await W(900);
  await ev(p, () => { const c = (S.custIndex || [])[0]; if (c) openAcc(c.code, c.name); }); await W(2600); await shot(p, d, 'cust_profile'); return p; });
both('m_cust', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('cust')); await W(1600); await shot(p, d, 'm_cust'); return p; });
both('newacc_form', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('cust')); await W(900); await ev(p, () => openNewAccount({ name:'', withCbc:true })); await W(900);
  await ev(p, L => { const v = (id, x) => { const e = document.getElementById(id); if (e){ e.value = x; } }; v('na_name', L === 'en' ? 'Siam Smile Dental Clinic' : 'PK Nha khoa Thiên Phúc'); v('na_contact', L === 'en' ? 'Dr. Somchai' : 'BS. Trần Minh'); v('na_phone', '0900 000 123'); }, L);
  await shot(p, d, 'newacc_form'); return p; });
both('stake', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('stake')); await W(2000); await shot(p, d, 'stake'); return p; });
both('m_stake', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('stake')); await W(2000); await shot(p, d, 'm_stake'); return p; });
/* đơn hàng (chỉ VN) */
SC.orders = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('order')); await W(2500); await shot(p, d, 'orders'); return p; };
SC.m_orders = async (b, L, d) => { const p = await open(b, MO); await ev(p, () => go('order')); await W(2500); await shot(p, d, 'm_orders'); return p; };
SC.order_form = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('order')); await W(1500); await ev(p, () => formOrder(null)); await W(900);
  await ev(p, () => { const c = (S.custIndex || []).find(x => /Hạ Long/.test(x.name)); if (c){ ordSetAcc(c); document.getElementById('o_accName').value = c.name; } }); await W(800);
  await shot(p, d, 'order_form'); return p; };
SC.order_care = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('order')); await W(1500); await ev(p, () => formOrder(null)); await W(900);
  await ev(p, () => { const c = { code:'NEW-0001', name:'PK Nha khoa Thiên Phúc', type:'Clinic', province:'Hà Nội', area:'North', pic:'Viet' }; ordSetAcc(c); document.getElementById('o_accName').value = c.name; }); await W(700);
  await ev(p, () => v322CareAdd()); await W(500); await ev(p, () => { const w = document.getElementById('v343c-w'); if (w) w.value = 'BS. Trần Minh'; const n = document.getElementById('v343c-n'); if (n) n.value = 'Gọi tư vấn Mani Bond, khách đồng ý đặt thử'; });
  await ev(p, () => document.getElementById('v322-care').scrollIntoView({ block:'start' })); await W(300);
  const a = await box(p, '#v322-care', 0), c = await box(p, '#v343-care', 0);
  await shot(p, d, 'order_care', a && c ? { clip:{ x:a.x - 16, y:a.y - 16, width:a.width + 32, height:c.y + c.height - a.y + 32 } } : {}); return p; };
SC.order_lines = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('order')); await W(1500); await ev(p, () => formOrder(null)); await W(900);
  await ev(p, () => { const c = (S.custIndex || []).find(x => /Hạ Long/.test(x.name)); if (c){ ordSetAcc(c); document.getElementById('o_accName').value = c.name; } }); await W(600);
  await p.click('#op_q0'); await p.keyboard.type('20'); await p.click('#op_u0'); await p.keyboard.type('480000');
  await ev(p, () => { const c = document.getElementById('o_contact'); if (c){ c.value = 'BS. Hoàng Long'; c.dispatchEvent(new Event('input', { bubbles:true })); } });
  await ev(p, () => document.getElementById('o_cbcWrap').scrollIntoView({ block:'start' })); await W(400);
  await shot(p, d, 'order_lines'); return p; };
SC.order_detail = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('order')); await W(2500); await ev(p, () => { const k = Object.keys(window.__ordG || {})[0]; if (k && window.v329Open) v329Open(k); }); await W(1200); await shot(p, d, 'order_detail'); return p; };
SC.order_bulk = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('order')); await W(2500); await ev(p, () => v342Open()); await W(1000); await shot(p, d, 'order_bulk'); return p; };
SC.order_approve = async (b, L, d) => { const p = await open(b, { pic:'Tuyen', level:'hod' }); await ev(p, () => go('order')); await W(2500); await ev(p, () => oaOpen()); await W(1800); await shot(p, d, 'order_approve'); return p; };
SC.m_order_approve = async (b, L, d) => { const p = await open(b, { pic:'Tuyen', level:'hod', mobile:true }); await ev(p, () => go('order')); await W(2500); await ev(p, () => oaOpen()); await W(1800); await shot(p, d, 'm_order_approve'); return p; };
SC.order_fix = async (b, L, d) => { const p = await open(b, { keepOx:true }); await ev(p, () => go('order')); await W(2500); await ev(p, () => { window.__keepOx = 1; oxOpen(); }); await W(1000); await shot(p, d, 'order_fix'); return p; };
/* thuyết trình · T&E · kế hoạch tháng · ADP · mở mới */
both('present', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('present')); await W(2000); await shot(p, d, 'present'); return p; });
both('present_form', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('present')); await W(1500); await ev(p, () => formPresent((S.cache.present && S.cache.present.rows || [])[0] || null)); await W(1200); await shot(p, d, 'present_form'); return p; });
both('te', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('present')); await W(1200); await ev(p, () => { try { teView(); } catch (e) {} }); await W(1800); await shot(p, d, 'te'); return p; });
both('monthly', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('monthly')); await W(2000); await shot(p, d, 'monthly'); return p; });
both('monthly_drawer', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('monthly')); await W(1500); await ev(p, () => { const r = (S.cache.monthly && S.cache.monthly.rows || [])[0]; openMonthly(r ? r._row : 4); }); await W(1300); await shot(p, d, 'monthly_drawer'); return p; });
SC.word_report = async (b, L, d) => { const p = await open(b, {}); await ev(p, () => go('monthly')); await W(1500); await ev(p, () => MRW.open()); await W(4000); await shot(p, d, 'word_report'); return p; };
both('adp', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('adp')); await W(2000); await shot(p, d, 'adp'); return p; });
both('m_adp', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('adp')); await W(2000); await shot(p, d, 'm_adp'); return p; });
both('newacc', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('newacc')); await W(2000); await shot(p, d, 'newacc'); return p; });
both('newacc_case', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('newacc')); await W(1500); await ev(p, () => naForm()); await W(1200); await shot(p, d, 'newacc_case'); return p; });
SC.newacc_review = async (b, L, d) => { const p = await open(b, { naDecide:true, pic:'Tuyen', level:'hod' }); await ev(p, () => go('newacc')); await W(1500); await ev(p, () => naView('NA-DE-261005161500-731')); await W(2000); await shot(p, d, 'newacc_review'); return p; };
/* KPI · dashboard · họp tuần · báo cáo */
both('dash', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('dash')); await W(2800); await shot(p, d, 'dash'); return p; });
both('dash_cust', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('dash')); await W(2000); await clickText(p, '^(Khách hàng|Customers)$', '#d4-tabs button, #d4-tabs *'); await W(1500); await shot(p, d, 'dash_cust'); return p; });
both('m_dash', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('dash')); await W(2800); await shot(p, d, 'm_dash'); return p; });
both('kpi', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('kpi')); await W(3000); await shot(p, d, 'kpi'); return p; });
both('m_kpi', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('kpi')); await W(3000); await shot(p, d, 'm_kpi'); return p; });
both('meet', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('meet')); await W(2800); await shot(p, d, 'meet'); return p; });
both('m_meet', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('meet')); await W(2800); await shot(p, d, 'm_meet'); return p; });
both('report', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('report')); await W(2600); await shot(p, d, 'report'); return p; });
both('m_report', async (b, L, d) => { const p = await open(b, { lang:L, mobile:true }); await ev(p, () => go('report')); await W(2600); await shot(p, d, 'm_report'); return p; });
both('kpi_report', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('kpi')); await W(2000); await ev(p, P => KR.open(P, '202609'), L === 'en' ? 'Dao' : 'Viet'); await W(2200); await shot(p, d, 'kpi_report'); return p; });
both('kpi_se', async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => go('kpi')); await W(2000); await ev(p, P => SE.open(P, 68, 'Q1'), L === 'en' ? 'Dao' : 'Viet'); await W(2200); await shot(p, d, 'kpi_se'); return p; });
SC.team_switch = async (b, L, d) => { const p = await open(b, { pic:'Tuyen', level:'hod' }); await W(500); await ev(p, () => go('dash')); await W(1500); await shot(p, d, 'team_switch', { clip:{ x:0, y:0, width:300, height:900 } }); return p; };
SC.mgr_dash = async (b, L, d) => { const p = await open(b, { pic:'Tuyen', level:'hod' }); await ev(p, () => go('dash')); await W(3000); await shot(p, d, 'mgr_dash'); return p; };
both('theme', async (b, L, d) => { const p = await open(b, { lang:L }); await cal(p); await ev(p, () => { const t = document.getElementById('thBtn'); if (t){ t.style.setProperty('display', 'inline-flex', 'important'); t.click(); } }); await W(800); await shot(p, d, 'theme'); return p; });
both('deadline', async (b, L, d) => { const p = await open(b, { lang:L, keepPopups:true, time:'2026-10-14T09:00:00+07:00' }); await W(1200); await ev(p, () => { if (window.DL && !DL.isOpen()) DL.open(); }); await W(700); await shot(p, d, 'deadline'); return p; });
SC.mmhcal = async (b, L, d) => { const p = await open(b, { lang:L }); await ev(p, () => openMMHCalendar()); await W(2200); await shot(p, d, 'mmhcal'); return p; };

module.exports = { SC };
if (require.main === module) (async () => {
  const args = process.argv.slice(2); let langs = ['vi', 'en'];
  if (args[0] === 'vi' || args[0] === 'en'){ langs = [args.shift()]; } else if (args[0] === 'all') args.shift();
  const ids = args.length ? args : Object.keys(SC);
  const VN_ONLY = /^(orders|m_orders|order_|m_order_|word_report|newacc_review|team_switch|mgr_dash|m_photo|photos)/;
  const b = await chromium.launch();
  for (const L of langs) for (const id of ids){
    if (!SC[id]) { console.log('? ' + id); continue; }
    if (L === 'en' && VN_ONLY.test(id)) continue;
    const dir = L === 'en' ? 'crmg_en' : 'crmg';
    try { const p = await SC[id](b, L, dir); console.log('✓ ' + L + ' ' + id + (p && p._errs.length ? '  JS: ' + p._errs.slice(0, 2).join(' | ') : '')); if (p) await p.context().close(); }
    catch (e) { console.log('✗ ' + L + ' ' + id + ': ' + e.message.split('\n')[0]); }
  }
  await b.close();
})();
