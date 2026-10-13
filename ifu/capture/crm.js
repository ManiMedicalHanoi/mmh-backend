/* Chụp ảnh HDSD MMH CRM với backend giả lập.
   Chạy: NODE_PATH=$(npm root -g) node crm.js [sceneId …]   (không tham số = tất cả)
   Ảnh: /home/claude/ifu/shots/crm/<id>.jpg (+ png/<id>.png). Dữ liệu giả hoàn toàn (crm_mock.js). */
const { newPage, shot, chromium } = require('./lib');
const W = ms => new Promise(r => setTimeout(r, ms));
const ev = (p, fn, arg) => p.evaluate(fn, arg);
async function myCal(p){ /* lịch: chỉ việc của tôi (Viet là Team Leader ⇒ mặc định thấy cả đội) */
  await p.evaluate(() => { const b = [...document.querySelectorAll('button,.chip,span,div')].find(e => /\(tôi\)\s*$/.test((e.textContent || '').trim()) && e.children.length < 3 && e.offsetParent); if (b) b.click(); });
  await W(600);
}
async function openCal(p, view){ await ev(p, () => go('weekly')); await W(800);
  if (view) await ev(p, v => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === v && x.offsetParent); if (b) b.click(); }, view);
  await W(800); }
const clickText = (p, re, sel) => p.evaluate(([re, sel]) => { const R = new RegExp(re); const e = [...document.querySelectorAll(sel || 'button,a,.chip,[onclick]')].find(x => x.offsetParent && R.test((x.textContent || '').trim())); if (e){ e.click(); return true; } return false; }, [re, sel]);

const SC = {};
/* ───── ĐĂNG NHẬP ───── */
SC.login_email = async b => { const p = await newPage(b, { gate:true }); await shot(p, 'login_email'); return p; };
SC.login_code = async b => { const p = await newPage(b, { gate:true });
  await p.evaluate(() => { const i = document.querySelector('input[type=email],input[placeholder*="@"]'); if (i){ i.value = 'viet@example.com'; i.dispatchEvent(new Event('input', { bubbles:true })); } });
  await clickText(p, 'Gửi mã'); await W(1500); await shot(p, 'login_code'); return p; };
SC.m_login = async b => { const p = await newPage(b, { gate:true, mobile:true }); await shot(p, 'm_login'); return p; };

/* ───── LỊCH ───── */
SC.cal_week = async b => { const p = await newPage(b, {}); await openCal(p); await myCal(p); await shot(p, 'cal_week'); return p; };
SC.cal_month = async b => { const p = await newPage(b, {}); await openCal(p, 'Tháng'); await myCal(p); await shot(p, 'cal_month'); return p; };
SC.cal_list = async b => { const p = await newPage(b, {}); await openCal(p, 'Danh sách'); await myCal(p); await shot(p, 'cal_list'); return p; };
SC.cal_filters = async b => { const p = await newPage(b, {}); await openCal(p); await clickText(p, '^Ẩn việc đã xong'); await W(600); await shot(p, 'cal_filters'); return p; };
SC.add_menu = async b => { const p = await newPage(b, {}); await openCal(p); await myCal(p); await ev(p, () => calAdd(todayISO())); await W(700); await shot(p, 'add_menu'); return p; };
SC.fieldvisit_form = async b => { const p = await newPage(b, {}); await openCal(p); await ev(p, () => calAddVisit('2026-10-08')); await W(1000); await shot(p, 'fieldvisit_form'); return p; };
SC.fieldvisit_result = async b => { const p = await newPage(b, {}); await openCal(p);
  const row = await ev(p, () => (S.cache.weekly.rows.find(r => r.pic === 'Viet' && r.start === '2026-10-07' && /Minh Anh/.test(r.account)) || {})._row);
  await ev(p, r => V30.done(r), row); await W(1200); await shot(p, 'fieldvisit_result'); return p; };
SC.photo = async b => { const p = await newPage(b, {}); await ev(p, () => go('photos')); await W(2500); await shot(p, 'photo'); return p; };
SC.other_task = async b => { const p = await newPage(b, {}); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1500); await shot(p, 'other_task'); return p; };
SC.trip_propose = async b => { const p = await newPage(b, {}); await openCal(p); await ev(p, () => tripProposeOpen('2026-10-26')); await W(1800); await shot(p, 'trip_propose'); return p; };
SC.trip_card = async b => { const p = await newPage(b, {}); await openCal(p); await myCal(p);
  const box = await p.evaluate(() => { const c = [...document.querySelectorAll('.cal-day')].find(d => /8\/10/.test(d.textContent)); return c ? (r => ({ x:r.x - 8, y:r.y - 8, width:r.width * 2 + 40, height:Math.min(520, r.height + 16) }))(c.getBoundingClientRect()) : null; });
  await shot(p, 'trip_card', box ? { clip:box } : {}); return p; };
SC.trip_report = async b => { const p = await newPage(b, {}); await openCal(p);
  await ev(p, () => { const k = (S.other.keys || []).find(k => /BT598|598/.test(JSON.stringify(k.vMeta || '') + k.no)); const it = calItems().find(i => i.kind === 't' && /Bac Ninh/.test(i.title)); if (it) calOpen(it.id); });
  await W(2500); await shot(p, 'trip_report'); return p; };

/* ───── KHÁCH HÀNG & DỮ LIỆU ───── */
SC.cust_list = async b => { const p = await newPage(b, {}); await ev(p, () => go('cust')); await W(1500); await shot(p, 'cust_list'); return p; };
SC.cust_profile = async b => { const p = await newPage(b, {}); await ev(p, () => go('cust')); await W(800); await ev(p, () => openAcc('NHN-HP0001', 'BV Răng Hàm Mặt TW Hà Nội')); await W(2500); await shot(p, 'cust_profile'); return p; };
SC.stakeholder = async b => { const p = await newPage(b, {}); await ev(p, () => go('stake')); await W(2000); await shot(p, 'stakeholder'); return p; };
SC.orders = async b => { const p = await newPage(b, {}); await ev(p, () => go('order')); await W(2000); await shot(p, 'orders'); return p; };
SC.presentation = async b => { const p = await newPage(b, {}); await ev(p, () => go('present')); await W(2000); await shot(p, 'presentation'); return p; };
SC.monthly_tasks = async b => { const p = await newPage(b, {}); await ev(p, () => go('monthly')); await W(2000); await shot(p, 'monthly_tasks'); return p; };
SC.monthly_drawer = async b => { const p = await newPage(b, {}); await ev(p, () => go('monthly')); await W(1500); await ev(p, () => openMonthly(4)); await W(1200); await shot(p, 'monthly_drawer'); return p; };
SC.adp = async b => { const p = await newPage(b, {}); await ev(p, () => go('adp')); await W(2000); await shot(p, 'adp'); return p; };
SC.dashboard = async b => { const p = await newPage(b, {}); await ev(p, () => go('dash')); await W(2500); await shot(p, 'dashboard'); return p; };

/* ───── MỞ MỚI & SKU MỚI ───── */
SC.newacc_list = async b => { const p = await newPage(b, {}); await ev(p, () => go('newacc')); await W(2000); await shot(p, 'newacc_list'); return p; };
SC.newacc_form = async b => { const p = await newPage(b, {}); await ev(p, () => go('newacc')); await W(1500); await ev(p, () => naForm()); await W(1200); await shot(p, 'newacc_form'); return p; };
SC.newacc_review = async b => { const p = await newPage(b, { naDecide:true }); await ev(p, () => go('newacc')); await W(1500); await ev(p, () => naView('NA-DE-261005161500-731')); await W(2000); await shot(p, 'newacc_review'); return p; };

/* ───── KPI ───── */
SC.kpi_tab = async b => { const p = await newPage(b, {}); await ev(p, () => go('kpi')); await W(3000); await shot(p, 'kpi_tab'); return p; };
SC.kpi_report = async b => { const p = await newPage(b, {}); await ev(p, () => go('kpi')); await W(2000); await ev(p, () => KR.open('Viet', '202609')); await W(2000); await shot(p, 'kpi_report'); return p; };
SC.kpi_se = async b => { const p = await newPage(b, {}); await ev(p, () => go('kpi')); await W(2000); await ev(p, () => SE.open('Viet', 68, 'Q1')); await W(2000); await shot(p, 'kpi_se'); return p; };
SC.total_kpi = async b => { const p = await newPage(b, { pic:'Nguyen Ha', level:'director', team:'dental' }); await ev(p, () => KT.open()); await W(2500); await shot(p, 'total_kpi'); return p; };

/* ───── CÔNG CỤ ───── */
SC.weekly_meeting = async b => { const p = await newPage(b, {}); await ev(p, () => go('meet')); await W(2500); await shot(p, 'weekly_meeting'); return p; };
SC.send_report = async b => { const p = await newPage(b, {}); await ev(p, () => go('report')); await W(2500); await shot(p, 'send_report'); return p; };
SC.quick_search = async b => { const p = await newPage(b, {}); await openCal(p); await ev(p, () => qsOpen()); await W(500); await p.keyboard.type('kim'); await W(800); await shot(p, 'quick_search'); return p; };
SC.links = async b => { const p = await newPage(b, {}); await openCal(p); await p.click('#lkBtn'); await W(700); await shot(p, 'links'); return p; };
SC.team_switch = async b => { const p = await newPage(b, { pic:'Tuyen', level:'hod' }); await W(500); await ev(p, () => teamPicker()); await W(700); await shot(p, 'team_switch'); return p; };
SC.whats_new = async b => { const p = await newPage(b, { keep:{ upd:true }, keepPopups:true, time:'2026-10-12T09:00:00+07:00' }); await W(1500); await ev(p, () => { if (!UPD.isOpen()) UPD.open(true); }); await W(800); await shot(p, 'whats_new'); return p; };
SC.tour_catalog = async b => { const p = await newPage(b, {}); await openCal(p); await ev(p, () => TOUR.open()); await W(900); await shot(p, 'tour_catalog'); return p; };
SC.theme = async b => { const p = await newPage(b, {}); await openCal(p); await ev(p, () => { const t = document.getElementById('thBtn') || document.querySelector('[title*="àu giao diện"]'); if (t) t.click(); }); await W(800); await shot(p, 'theme'); return p; };
SC.deadline_popup = async b => { const p = await newPage(b, { keepPopups:true, time:'2026-10-14T09:00:00+07:00' }); await W(1500); await ev(p, () => { if (!DL.isOpen()) DL.open(); }); await W(600); await shot(p, 'deadline_popup'); return p; };
SC.kpi_reminder = async b => { const p = await newPage(b, { keepPopups:true, time:'2026-10-02T09:00:00+07:00' }); await W(3000); await shot(p, 'kpi_reminder'); return p; };
SC.trip_approve = async b => { const p = await newPage(b, { pic:'Nguyen Ha', level:'director', keep:{ tfa:true } }); await W(1000); await ev(p, () => TFA.open()); await W(2000); await shot(p, 'trip_approve'); return p; };
SC.test_mode = async b => { const p = await newPage(b, { pic:'Giang', level:'lead', admin:true }); await W(800); await ev(p, () => CRMTEST.pick()); await W(800); await shot(p, 'test_mode'); return p; };

/* ───── ĐIỆN THOẠI ───── */
SC.m_today = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => V31.today()); await W(1200); await shot(p, 'm_today'); return p; };
SC.m_cal = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => go('weekly')); await W(1500); await shot(p, 'm_cal'); return p; };
SC.m_add = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => go('weekly')); await W(1000); await ev(p, () => V30.add()); await W(900); await shot(p, 'm_add'); return p; };
SC.m_result = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => go('weekly')); await W(800);
  const row = await ev(p, () => (S.cache.weekly.rows.find(r => r.pic === 'Viet' && r.start === '2026-10-07' && /Minh Anh/.test(r.account)) || {})._row);
  await ev(p, r => V30.done(r), row); await W(1500); await shot(p, 'm_result'); return p; };
SC.m_photo = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => go('weekly')); await W(800);
  const row = await ev(p, () => (S.cache.weekly.rows.find(r => r.pic === 'Viet' && r.start === '2026-10-06' && /Kim/.test(r.account)) || {})._row);
  await ev(p, r => openTask(r), row); await W(1500); await shot(p, 'm_photo'); return p; };
SC.m_cust = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => go('cust')); await W(1500); await shot(p, 'm_cust'); return p; };
SC.m_more = async b => { const p = await newPage(b, { mobile:true }); await ev(p, () => V30.more()); await W(900); await shot(p, 'm_more'); return p; };

/* ───── ĐIỆN THOẠI: bản điện thoại của các màn chính (cặp máy tính + điện thoại) ───── */
const MO = { mobile:true };
SC.m_cust_profile = async b => { const p = await newPage(b, MO); await ev(p, () => go('cust')); await W(800); await ev(p, () => openAcc('NHN-HP0001', 'BV Răng Hàm Mặt TW Hà Nội')); await W(2500); await shot(p, 'm_cust_profile'); return p; };
SC.m_stake = async b => { const p = await newPage(b, MO); await ev(p, () => go('stake')); await W(2000); await shot(p, 'm_stake'); return p; };
SC.m_adp = async b => { const p = await newPage(b, MO); await ev(p, () => go('adp')); await W(2000); await shot(p, 'm_adp'); return p; };
SC.m_orders = async b => { const p = await newPage(b, MO); await ev(p, () => go('order')); await W(2000); await shot(p, 'm_orders'); return p; };
SC.m_present = async b => { const p = await newPage(b, MO); await ev(p, () => go('present')); await W(2000); await shot(p, 'm_present'); return p; };
SC.m_monthly = async b => { const p = await newPage(b, MO); await ev(p, () => go('monthly')); await W(2000); await shot(p, 'm_monthly'); return p; };
SC.m_other = async b => { const p = await newPage(b, MO); await ev(p, () => go('weekly')); await W(600); await ev(p, () => setWkTab('other')); await W(1500); await shot(p, 'm_other'); return p; };
SC.m_trip_propose = async b => { const p = await newPage(b, MO); await ev(p, () => go('weekly')); await W(800); await ev(p, () => tripProposeOpen('2026-10-26')); await W(1800); await shot(p, 'm_trip_propose'); return p; };
SC.m_trip_report = async b => { const p = await newPage(b, MO); await ev(p, () => go('weekly')); await W(800);
  await ev(p, () => { const it = calItems().find(i => i.kind === 't' && /Bac Ninh/.test(i.title)); if (it) calOpen(it.id); }); await W(2500); await shot(p, 'm_trip_report'); return p; };
SC.m_trip_approve = async b => { const p = await newPage(b, { mobile:true, pic:'Nguyen Ha', level:'director', keep:{ tfa:true } }); await W(1000); await ev(p, () => TFA.open()); await W(2000); await shot(p, 'm_trip_approve'); return p; };
SC.m_newacc = async b => { const p = await newPage(b, MO); await ev(p, () => go('newacc')); await W(2000); await shot(p, 'm_newacc'); return p; };
SC.m_newacc_review = async b => { const p = await newPage(b, { mobile:true, naDecide:true }); await ev(p, () => go('newacc')); await W(1500); await ev(p, () => naView('NA-DE-261005161500-731')); await W(2000); await shot(p, 'm_newacc_review'); return p; };
SC.m_kpi = async b => { const p = await newPage(b, MO); await ev(p, () => go('kpi')); await W(3000); await shot(p, 'm_kpi'); return p; };
SC.m_kpi_report = async b => { const p = await newPage(b, MO); await ev(p, () => go('kpi')); await W(2000); await ev(p, () => KR.open('Viet', '202609')); await W(2000); await shot(p, 'm_kpi_report'); return p; };
SC.m_dashboard = async b => { const p = await newPage(b, MO); await ev(p, () => go('dash')); await W(2500); await shot(p, 'm_dashboard'); return p; };
SC.m_meet = async b => { const p = await newPage(b, MO); await ev(p, () => go('meet')); await W(2500); await shot(p, 'm_meet'); return p; };
SC.m_send_report = async b => { const p = await newPage(b, MO); await ev(p, () => go('report')); await W(2500); await shot(p, 'm_send_report'); return p; };
SC.mmhcal = async b => { const p = await newPage(b, {}); await ev(p, () => openMMHCalendar()); await W(2000); await shot(p, 'mmhcal'); return p; };
SC.m_mmhcal = async b => { const p = await newPage(b, MO); await ev(p, () => openMMHCalendar()); await W(2000); await shot(p, 'm_mmhcal'); return p; };

/* ───── CHẾ ĐỘ TEST (testflow.js) ───── */
function tfOpt(mobile, role){ return { mobile, pic:'Giang', level:'lead', admin:true, keep:{ tfa:true }, ls:{ mmh_test_crm:JSON.stringify({ on:1, scope:'dental', role:role || 'sales', at:Date.now() }) } }; }
async function tfRun(p){
  const post = b => p.evaluate(b => apiPost(b).catch(() => null), b);
  await post({ action:'saveWeekly', pic:'TEST', row:0, data:JSON.stringify({ account:'TEST Nha khoa Minh Tam/Clinic/Ha Noi/North', status:'Completed', typeAction:'Visiting sales' }), rid:'t1' }); await W(400);
  await post({ action:'uploadPhoto', pic:'TEST', row:1287, account:'TEST Nha khoa Minh Tam/Clinic/Ha Noi/North', b64:'x'.repeat(160000), rid:'t2' }); await W(400);
  await post({ action:'saveOrders', pic:'TEST', data:JSON.stringify({ account:'TEST Nha khoa Minh Tam', qty:20, ptype:'Composite' }), rid:'t3' }); await W(400);
  await post({ action:'tripPropose2', pic:'TEST', forPic:'TEST', trip:JSON.stringify({ destination:'Da Nang', startDate:'2026-10-26', finishDate:'2026-10-27', purpose:'TEST — thử luồng công tác' }), rid:'t4' }); await W(400);
  await post({ action:'weeklyReport', pic:'TEST', from:'2026-10-06', to:'2026-10-12', rid:'t5' }); await W(400);
  await post({ action:'naSubmit', pic:'TEST', id:'NA-DE-261007091500-417', rid:'t6' }); await W(400);
  await p.evaluate(() => fetch(KPI_HUB_URL, { method:'POST', body:new URLSearchParams({ action:'rhKpiMailSend', payload:JSON.stringify({ pic:'Vinh', month:'202609', subject:'KPI T09/2026 · Vinh' }) }) }).catch(() => null)); await W(1200);
  await p.evaluate(() => { const t = document.getElementById('tf-ts'); if (t) t.innerHTML = ''; });
}
async function tfPanel(p){ await ev(p, () => TESTFLOW.open()); await W(600); await ev(p, () => { const s = document.querySelector('#tf-pn .tf-sc'), h = s && s.querySelector('.tf-tl'); if (h) s.scrollTop = h.offsetTop - 10; }); await W(300); }
SC.test_pick = async b => { const p = await newPage(b, { pic:'Giang', level:'lead', admin:true }); await W(500); await ev(p, () => TESTFLOW.pick()); await W(600); await shot(p, 'test_pick'); return p; };
SC.m_test_pick = async b => { const p = await newPage(b, { mobile:true, pic:'Giang', level:'lead', admin:true }); await W(500); await ev(p, () => TESTFLOW.pick()); await W(600); await shot(p, 'm_test_pick'); return p; };
SC.test_flow = async b => { const p = await newPage(b, tfOpt(false)); await tfRun(p); await tfPanel(p); await shot(p, 'test_flow'); return p; };
SC.m_test_flow = async b => { const p = await newPage(b, tfOpt(true)); await tfRun(p); await tfPanel(p); await shot(p, 'm_test_flow'); return p; };
SC.test_steps = async b => { const p = await newPage(b, tfOpt(false)); await tfRun(p); await ev(p, () => TESTFLOW.open()); await W(700); await shot(p, 'test_steps'); return p; };
SC.test_tfa = async b => { const p = await newPage(b, Object.assign(tfOpt(false, 'dir'), { onReq:(h, a, q, d) => a === 'tfPending' ? Object.assign({}, d, { director:true, testOnly:true, items:(d.items || []).concat([{ row:612, no:'608', pic:'TEST', start:'2026-10-26', finish:'2026-10-27', days:2, dest:'Da Nang', co:'No', purpose:'TEST — thử luồng công tác', expect:'Kiểm tra email duyệt', estCost:'Công tác phí: 760.000', total:760000, schedule:'26/10: Hà Nội → Đà Nẵng', equip:'Laptop', status:'Already sent propose email', test:true }]) }) : null })); await W(800);
  await ev(p, () => { const o = document.getElementById('tfa-ov'); if (o) o.remove(); TFA.open(); }); await W(1800);
  await ev(p, () => { const c = document.querySelector('#tfa-ov [data-ck="612"]'); if (c){ c.click(); c.scrollIntoView({ block:'center' }); } }); await W(500); await shot(p, 'test_tfa'); return p; };
SC.m_test_tfa = async b => { const p = await newPage(b, Object.assign(tfOpt(true, 'dir'), { onReq:(h, a, q, d) => a === 'tfPending' ? Object.assign({}, d, { director:true, testOnly:true, items:[{ row:612, no:'608', pic:'TEST', start:'2026-10-26', finish:'2026-10-27', days:2, dest:'Da Nang', co:'No', purpose:'TEST — thử luồng công tác', expect:'Kiểm tra email duyệt', estCost:'Công tác phí: 760.000', total:760000, schedule:'26/10: Hà Nội → Đà Nẵng', equip:'Laptop', status:'Already sent propose email', test:true }].concat(d.items || []) }) : null })); await W(800);
  await ev(p, () => { const o = document.getElementById('tfa-ov'); if (o) o.remove(); TFA.open(); }); await W(1800);
  await ev(p, () => { const c = document.querySelector('#tfa-ov [data-ck="612"]'); if (c) c.click(); }); await W(500); await shot(p, 'm_test_tfa'); return p; };

/* ───── THÁI (tiếng Anh) ───── */
SC.thai_cal = async b => { const p = await newPage(b, { pic:'Dao', team:'thai', level:'lead', wait:7000 }); await openCal(p); await shot(p, 'thai_cal'); return p; };
SC.thai_kpi = async b => { const p = await newPage(b, { pic:'Dao', team:'thai', level:'lead', wait:7000 }); await ev(p, () => go('kpi')); await W(3000); await shot(p, 'thai_kpi'); return p; };

module.exports = { SC };
if (require.main === module) (async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SC);
  const b = await chromium.launch();
  for (const id of ids){
    if (!SC[id]){ console.log('? ' + id); continue; }
    try { const p = await SC[id](b); console.log('✓ ' + id + (p && p._errs.length ? '  JS: ' + p._errs.slice(0, 2).join(' | ') : ''));
      if (process.env.LOG && p) console.log(p._mock.LOG.map(x => x[0] + ':' + x[1]).join(' '));
      if (p) await p.context().close(); }
    catch (e){ console.log('✗ ' + id + ': ' + e.message.split('\n')[0]); }
  }
  await b.close();
})();
