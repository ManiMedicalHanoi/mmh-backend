// Chụp ảnh THẬT của MMH Training Hub (index.html, chỉ đọc) chạy với máy chủ GIẢ LẬP (fixtures.js).
// Chạy: NODE_PATH=$(npm root -g) node cap.js [tên cảnh ...]     → PNG + JPEG ở /home/claude/ifu/shots/th/
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');
const FX = require('./fixtures');
const APP = 'file:///home/user/manimedicalhanoi/training-hub/index.html';
const OUT = '/home/claude/ifu/shots/th/';
const VEN = __dirname + '/vendor/';
const FONT_CSS = [400, 500, 600, 700, 800].map(w => fs.readFileSync(VEN + 'bvp/package/' + w + '.css', 'utf8')).join('\n').replace(/\.\/files\//g, 'https://fonts.local/');
const ACTIONS = {};          // action → số lần gọi (mọi cảnh)
const DESK = {width: 1440, height: 860}, MOB = {width: 390, height: 844};
const T0 = new Date('2026-10-12T09:00:00+07:00');

async function open(b, o) {
  o = Object.assign({user: 'giang', mobile: false, hash: '#/home'}, o || {});
  const ctx = await b.newContext({viewport: o.mobile ? MOB : DESK, deviceScaleFactor: 2, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', isMobile: !!o.mobile, hasTouch: !!o.mobile});
  const p = await ctx.newPage();
  const srv = FX.createServer(o);
  p.srv = srv; p.errors = [];
  p.on('pageerror', e => { p.errors.push(e.message); console.log('  [pageerror]', e.message); });
  await p.clock.setFixedTime(o.time || T0);
  await p.addInitScript(([o, email]) => {
    try {
      if (!o.gate) { localStorage.setItem('mmh_hub_token', 'tok-' + o.user); }
      localStorage.setItem('mmh_hub_email', email);
      if (o.ls) Object.entries(o.ls).forEach(([k, v]) => localStorage.setItem(k, v));
      if (o.ss) Object.entries(o.ss).forEach(([k, v]) => sessionStorage.setItem(k, v));
    } catch (e) {}
  }, [{gate: o.gate, user: o.user, ls: o.ls, ss: o.ss}, o.user + '@example.com']);
  await p.route(/script\.google\.com/, async r => {
    const req = r.request(), u = new URL(req.url());
    const params = Object.fromEntries(u.searchParams);
    const pd = req.postData();
    if (pd && req.method() === 'POST') { const q = new URLSearchParams(pd); q.forEach((v, k) => params[k] = v); if (params.payload) { try { Object.assign(params, JSON.parse(params.payload)); } catch (e) {} } }
    const a = params.action || 'ping';
    ACTIONS[a] = (ACTIONS[a] || 0) + 1;
    const body = srv.handle(a, params);
    if (o.delay && o.delay[a]) await new Promise(res => setTimeout(res, o.delay[a]));
    if (o.hang && o.hang[a]) return;      // không trả lời (giữ trạng thái đang tải)
    const cb = params.callback, txt = JSON.stringify(body);
    await r.fulfill({status: 200, contentType: cb ? 'application/javascript' : 'application/json', body: cb ? `${cb}(${txt})` : txt});
  });
  await p.route(/fonts\.googleapis\.com/, r => r.fulfill({status: 200, contentType: 'text/css', body: FONT_CSS}));
  await p.route(/fonts\.local\//, r => { const f = VEN + 'bvp/package/files/' + path.basename(new URL(r.request().url()).pathname); return fs.existsSync(f) ? r.fulfill({status: 200, contentType: 'font/woff2', body: fs.readFileSync(f)}) : r.abort(); });
  await p.route(/fonts\.gstatic\.com/, r => r.abort());
  await p.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js/, r => r.fulfill({status: 200, contentType: 'application/javascript', body: fs.readFileSync(VEN + 'package/build/' + path.basename(new URL(r.request().url()).pathname))}));
  await p.route(/drive\.google\.com|docs\.google\.com|teams\.example\.com/, r => r.fulfill({status: 200, contentType: 'text/html', body: '<html><body style="font:14px sans-serif;color:#888;display:grid;place-items:center;height:100vh">Google Drive (giả lập)</body></html>'}));
  await p.goto(APP + o.hash);
  if (!o.gate) { await p.waitForFunction(() => document.querySelector('#nav .nv') && /Cập nhật/.test(document.getElementById('syncTxt').textContent), null, {timeout: 20000}); }
  else await p.waitForSelector('#authCard h2');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  if (!o.keepPopup && !o.gate) { await closeModals(p); }
  return p;
}
async function closeModals(p) { await p.evaluate(() => { if (typeof Modal !== 'undefined') Modal.stack.slice().forEach(m => Modal.close(m)); }); await p.waitForTimeout(350); }
async function go(p, hash, wait) { await p.evaluate(h => { location.hash = h; }, hash); await p.waitForTimeout(wait || 900); }
async function settle(p, ms) { await p.waitForTimeout(ms || 600); await p.evaluate(() => document.fonts.ready); }
async function shot(p, id, o) {
  o = o || {};
  const png = OUT + id + '.png';
  if (o.full) {
    const h = await p.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
    const vp = p.viewportSize();
    const H = Math.max(vp.height, Math.min(h, o.maxH || 2400));
    await p.setViewportSize({width: vp.width, height: H}); await p.waitForTimeout(500);
    await p.screenshot({path: png});
    await p.setViewportSize(vp);
  } else if (o.el) await (await p.$(o.el)).screenshot({path: png});
  else await p.screenshot({path: png});
  execFileSync('python3', ['-I', '-c', `
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
if im.width>2000: im=im.resize((2000,round(im.height*2000/im.width)),Image.LANCZOS)
im.save(sys.argv[2],quality=85,optimize=True)`, png, OUT + id + '.jpg']);
  DONE.push(id);
  console.log('  ✓', id, p.srv ? '[' + [...new Set(p.srv.log)].join(',') + ']' : '');
}
const DONE = [];
async function closePage(p) { await p.context().close(); }

/* =========================== CẢNH =========================== */
const S = {};
S.login = async b => { const p = await open(b, {gate: true, user: 'khang'}); await p.fill('#lgPin', '246810'); await p.evaluate(() => document.activeElement.blur()); await settle(p); await shot(p, 'login'); await closePage(p); };
S.activate = async b => {
  const p = await open(b, {gate: true, user: 'khang'});
  await p.click('[data-a="authStep"][data-s="otp"]'); await p.click('#btnOtp'); await p.waitForSelector('#otpIn input');
  const d = '481209'; const ins = await p.$$('#otpIn input'); for (let i = 0; i < 6; i++) await ins[i].type(d[i]);
  await p.fill('#otPin', '135790'); await p.evaluate(() => document.activeElement.blur()); await settle(p); await shot(p, 'activate'); await closePage(p);
};
S.home = async b => { const p = await open(b, {user: 'giang'}); await settle(p); await shot(p, 'home', {full: true, maxH: 1900}); await closePage(p); };
S.home_learner = async b => { const p = await open(b, {user: 'khang'}); await settle(p); await shot(p, 'home_learner', {full: true, maxH: 1700}); await closePage(p); };
S.todo_popup = async b => { const p = await open(b, {user: 'khang', keepPopup: true}); await p.waitForSelector('.ov.on .modal'); await settle(p, 500); await shot(p, 'todo_popup'); await closePage(p); };
S.library = async b => { const p = await open(b, {user: 'khang', hash: '#/library', ls: {mmh_hub_lib: JSON.stringify({range: 'month', layout: 'list'})}}); await settle(p); await shot(p, 'library'); await closePage(p); };
S.library_table = async b => { const p = await open(b, {user: 'giang', hash: '#/library', ls: {mmh_hub_lib: JSON.stringify({range: 'month', layout: 'table'})}}); await settle(p); await shot(p, 'library_table'); await closePage(p); };
for (const v of ['month', 'week', 'list']) S['calendar_' + v] = async b => { const p = await open(b, {user: 'giang', hash: '#/calendar', ls: {mmh_hub_calview: v}}); await settle(p); await shot(p, 'calendar_' + v, v === 'month' ? {full: true, maxH: 2000} : {}); await closePage(p); };
S.session_materials = async b => { const p = await open(b, {user: 'khang'}); await go(p, '#/s/S107?tab=materials', 1500); await shot(p, 'session_materials', {full: true, maxH: 1500}); await closePage(p); };
S.session_materials_trainer = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=materials', 1500); await shot(p, 'session_materials_trainer', {full: true, maxH: 1500}); await closePage(p); };
S.session_quiz = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=quiz', 1500); await shot(p, 'session_quiz', {full: true, maxH: 1300}); await closePage(p); };
S.session_quiz_learner = async b => { const p = await open(b, {user: 'khang'}); await go(p, '#/s/S104?tab=quiz', 1500); await shot(p, 'session_quiz_learner', {full: true, maxH: 1300}); await closePage(p); };
S.session_learners = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=learners', 1800); await shot(p, 'session_learners', {full: true, maxH: 1500}); await closePage(p); };
S.session_info = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=info', 1500); await shot(p, 'session_info', {full: true, maxH: 1300}); await closePage(p); };
S.reader = async b => {
  const p = await open(b, {user: 'khang', matsNone: true}); await go(p, '#/s/S107?tab=materials', 1500);
  await p.click('.mat .nm[data-fid="F107_1"]'); await p.waitForSelector('#rdPages .rd-page canvas', {timeout: 20000}); await settle(p, 1200);
  await p.evaluate(() => Reader.goto(3, true)); await settle(p, 1500); await shot(p, 'reader'); await closePage(p);
};
S.course_quizstep = async b => {
  const p = await open(b, {user: 'khang', matsDone: true}); await go(p, '#/s/S107?tab=materials', 1500);
  await p.click('.mat .nm[data-fid="F107_3"]'); await p.waitForSelector('#crsSide .crs-st'); await settle(p, 1500);
  await p.click('#crsSide [data-a="crsQuiz"]'); await settle(p, 800); await shot(p, 'course_quizstep'); await closePage(p);
};
S.session_course_cta = async b => { const p = await open(b, {user: 'khang', matsNone: true}); await go(p, '#/s/S107', 1500); await shot(p, 'session_course_cta'); await closePage(p); };
S.quiz_gate = async b => { const p = await open(b, {user: 'khang'}); await go(p, '#/s/S107', 1200); await p.evaluate(() => Quiz.intro('S107')); await p.waitForSelector('.qz-intro .rules'); await settle(p); await shot(p, 'quiz_gate'); await closePage(p); };
S.quiz_intro = async b => { const p = await open(b, {user: 'khang', matsDone: true}); await go(p, '#/s/S107', 1200); await p.evaluate(() => Quiz.intro('S107')); await p.waitForSelector('.qz-intro [data-a="qzStart"]'); await settle(p); await shot(p, 'quiz_intro'); await closePage(p); };
async function startQuiz(o) {
  const p = await open(o.b, Object.assign({user: 'khang', matsDone: true}, o.opt || {})); await go(p, '#/s/S107', 1200);
  await p.evaluate(() => Quiz.intro('S107')); await p.waitForSelector('[data-a="qzStart"]'); await p.click('[data-a="qzStart"]'); await p.waitForSelector('.qz-q');
  return p;
}
const ANS = {Q107_1: 'A', Q107_2: 'B', Q107_3: 'C', Q107_4: 'B', Q107_5: 'ABC', Q107_6: 'B', Q107_7: 'A', Q107_8: 'A', Q107_9: 'B', Q107_10: 'B'};   // câu 9 chọn sai
async function answer(p, n) {
  for (let i = 0; i < n; i++) {
    const qid = await p.evaluate(() => Quiz.A.r.questions[Quiz.A.idx].qid);
    for (const k of ANS[qid]) await p.click(`.opts [data-k="${k}"]`);
    if (i < n - 1) await p.click('.qz-nav [data-a="qzNav"][data-d="1"]');
  }
}
S.quiz_question = async b => {
  const p = await startQuiz({b}); await answer(p, 4); await p.click('[data-a="qzFlag"]'); await p.click('.qz-nav [data-a="qzNav"][data-d="1"]');
  await p.click('.opts [data-k="A"]'); await p.click('.opts [data-k="C"]');
  await p.clock.setFixedTime(new Date(T0.getTime() + 216e3)); await settle(p, 900); await shot(p, 'quiz_question'); await closePage(p);
};
S.quiz_review = async b => {
  const p = await startQuiz({b}); await answer(p, 8); await p.click('.qz-nav [data-a="qzNav"][data-d="1"]'); await p.click('[data-a="qzFlag"]');
  await p.clock.setFixedTime(new Date(T0.getTime() + 470e3)); await p.click('.qz-side [data-a="qzReview"]'); await settle(p, 900); await shot(p, 'quiz_review'); await closePage(p);
};
S.quiz_result = async b => {
  const p = await startQuiz({b}); await answer(p, 10); await p.clock.setFixedTime(new Date(T0.getTime() + 512e3));
  await p.click('.qz-nav [data-a="qzReview"]'); await p.click('[data-a="qzSubmit"]'); await p.waitForSelector('.ov.on [data-yes]'); await p.click('.ov.on [data-yes]');
  await p.waitForSelector('.result .verdict'); await p.waitForTimeout(3800); await shot(p, 'quiz_result'); await closePage(p);
};
S.certs = async b => { const p = await open(b, {user: 'khang', hash: '#/certs'}); await p.waitForSelector('#certBox .certs'); await settle(p, 800); await shot(p, 'certs', {full: true, maxH: 1700}); await closePage(p); };
S.cert_preview = async b => {
  const html = FX.GAS.certificate({name: 'Khang', email: 'khang@example.com', position: 'Sales Rep — South', dept: 'Surgical Sale Team', topic: 'DIA-BURS: phân loại & chỉ định lâm sàng', category: 'Product', trainer: 'Giang', trainingDate: '18/09/2026', issueDate: '20/09/2026', percent: 90, score: 90, maxScore: 100, certNo: 'MMH-20260920-KHANG-417'}, FX.CONFIG);
  const ctx = await b.newContext({viewport: {width: 1123, height: 794}, deviceScaleFactor: 2}); const p = await ctx.newPage();
  await p.setContent(html.replace('font-family:Aptos,Calibri,Arial,sans-serif', 'font-family:Aptos,Calibri,Carlito,Arial,sans-serif')); await settle(p, 500); await shot(p, 'cert_preview'); await ctx.close();
};
S.manage = async b => { const p = await open(b, {user: 'giang', hash: '#/manage', ls: {mmh_hub_mng: JSON.stringify({range: 'fy'})}}); await settle(p); await shot(p, 'manage', {full: true, maxH: 1700}); await closePage(p); };
S.create_session = async b => {
  const p = await open(b, {user: 'giang', hash: '#/manage'}); await p.click('.hello [data-a="sessionForm"]'); await p.waitForSelector('#sfTopic');
  await p.fill('#sfTopic', 'Kỹ năng demo DIA-BURS tại phòng khám'); await p.fill('#sfPurpose', 'Sau buổi học, Sales tự tin demo bộ mũi khoan và trả lời câu hỏi thường gặp của bác sĩ.');
  await p.fill('#sfDate', '2026-10-26'); await p.fill('#sfFrom', '09:00'); await p.fill('#sfTo', '10:30');
  await p.selectOption('#sfAudAdd', 'MMH - Sales Dental'); await p.selectOption('#sfAudAdd', 'Khang'); await p.dispatchEvent('#sfDate', 'change');
  await p.evaluate(() => document.activeElement.blur()); await settle(p); await shot(p, 'create_session'); await closePage(p);
};
S.edit_session = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S112', 1200); await p.evaluate(() => sessionForm('S112')); await p.waitForSelector('#sfTopic'); await settle(p); await shot(p, 'edit_session'); await closePage(p); };
S.invite = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S110', 1200); await p.evaluate(() => Composer.open('S110', 'pre')); await p.waitForSelector('#emFrame'); await p.waitForFunction(() => /MMH Training/.test(document.getElementById('emPh').textContent)); await settle(p, 900); await shot(p, 'invite'); await closePage(p); };
S.invite_reminder = async b => {
  const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=learners', 1500); await p.click('[data-a="compose"][data-k="reminder"]'); await p.waitForSelector('#emFrame');
  await p.fill('#emNote', 'Anh/chị ôn lại slide 3–5 trước khi làm bài nhé.'); await p.waitForTimeout(1500); await p.waitForFunction(() => /MMH Training/.test(document.getElementById('emPh').textContent));
  await settle(p, 900); await shot(p, 'invite_reminder'); await closePage(p);
};
S.quiz_builder = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=quiz', 1200); await p.click('[data-a="quizBuilder"]'); await p.waitForSelector('#qbList .qi'); await settle(p); await shot(p, 'quiz_builder'); await closePage(p); };
S.quiz_paste = async b => {
  const p = await open(b, {user: 'giang'}); await go(p, '#/s/S112', 1200); await p.evaluate(() => QB.open('S112')); await p.waitForSelector('#qbPaste'); await p.click('#qbPaste'); await p.waitForSelector('#pasteIn');
  await p.fill('#pasteIn', 'Câu 1: JIZAI là dòng sản phẩm nào?\nA. Trâm máy NiTi nội nha\nB. Mũi khoan kim cương\nC. Keo dán nha khoa\nD. Chỉ khâu\nĐáp án: A\nGiải thích: JIZAI là trâm máy NiTi dùng tạo hình ống tuỷ.\n\nCâu 2: Những bước nào cần làm trước khi tạo hình ống tuỷ?\nA. Mở đường vào buồng tuỷ\nB. Xác định chiều dài làm việc\nC. Trám bít ống tuỷ\nD. Tạo đường trượt\nĐáp án: A, B, D\n\nCâu 3: Trâm NiTi có thể dùng lại không giới hạn số lần.\nA. Đúng\nB. Sai\nĐáp án: Sai');
  await p.waitForTimeout(700); await settle(p); await shot(p, 'quiz_paste'); await closePage(p);
};
S.upload_drop = async b => {
  const p = await open(b, {user: 'giang'}); await go(p, '#/s/S107?tab=materials', 1500);
  await p.evaluate(() => {
    const dt = new DataTransfer(); dt.items.add(new File(['x'], 'Case lam sang 01.pdf', {type: 'application/pdf'}));
    const sec = document.querySelectorAll('.fsec')[1] || document.querySelector('.fsec');
    const r = sec.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - 260);
    const fire = () => sec.querySelector('.fsec-h').dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer: dt}));
    fire(); window.__dnd = setInterval(fire, 150);
  });
  await settle(p, 700); await shot(p, 'upload_drop'); await closePage(p);
};
S.upload_progress = async b => {
  const p = await open(b, {user: 'giang', chunkSize: 262144, delay: {uploadInit: 300, uploadChunk: 1800}}); await go(p, '#/s/S107?tab=materials', 1500);
  await p.evaluate(() => {
    const mk = (n, kb) => new File([new Uint8Array(kb * 1024)], n);
    Uploader.add('S107', [{file: mk('Checklist demo tai phong kham.docx', 300), rel: ['Case lam sang']}, {file: mk('Anh demo DIA-BURS.jpg', 700), rel: ['Case lam sang', 'Hinh anh']},
      {file: mk('Case lam sang 01 - Implant.pdf', 2600), rel: ['Case lam sang']}, {file: mk('Case lam sang 02 - Noi nha.pdf', 1800), rel: ['Case lam sang']}], []);
  });
  await p.waitForTimeout(9000); await shot(p, 'upload_progress'); await closePage(p);
};
S.results = async b => { const p = await open(b, {user: 'giang'}); await go(p, '#/results/S107', 1800); await p.waitForSelector('#rsBody .kpis'); await settle(p); await shot(p, 'results', {full: true, maxH: 2600}); await closePage(p); };
S.dashboard = async b => { const p = await open(b, {user: 'giang', hash: '#/dashboard'}); await p.waitForSelector('.dash-grid'); await settle(p); await shot(p, 'dashboard', {full: true, maxH: 2200}); await closePage(p); };
S.users = async b => { const p = await open(b, {user: 'giang', hash: '#/users'}); await p.waitForSelector('#uBox table'); await settle(p); await shot(p, 'users', {full: true, maxH: 1500}); await closePage(p); };
S.settings = async b => { const p = await open(b, {user: 'giang', hash: '#/settings'}); await p.waitForFunction(() => /v3/.test(document.getElementById('beVer').textContent)); await settle(p); await shot(p, 'settings', {full: true, maxH: 1900}); await closePage(p); };
S.notifications = async b => { const p = await open(b, {user: 'khang'}); await p.click('.top .bell'); await p.waitForSelector('#notiBox .noti'); await settle(p, 600); await shot(p, 'notifications'); await closePage(p); };
S.search = async b => { const p = await open(b, {user: 'khang'}); await p.keyboard.press('Control+k'); await p.waitForSelector('#ckRes .r'); await settle(p, 400); await shot(p, 'search'); await closePage(p); };
S.test_mode = async b => { const p = await open(b, {user: 'giang', ss: {mmh_hub_test: '1', mmh_hub_testrole: 'trainer'}}); await settle(p); await shot(p, 'test_mode'); await closePage(p); };
S.profile = async b => { const p = await open(b, {user: 'giang'}); await p.click('.side .me'); await p.waitForSelector('#pfRole'); await settle(p); await shot(p, 'profile'); await closePage(p); };
S.logs = async b => { const p = await open(b, {user: 'giang', hash: '#/settings'}); await p.click('[data-a="showLogs"]'); await p.waitForSelector('.ov.on table'); await settle(p); await shot(p, 'logs'); await closePage(p); };
// ---- điện thoại ----
S.m_home = async b => { const p = await open(b, {user: 'khang', mobile: true}); await settle(p); await shot(p, 'm_home'); await closePage(p); };
S.m_library = async b => { const p = await open(b, {user: 'khang', mobile: true, hash: '#/library', ls: {mmh_hub_lib: JSON.stringify({range: 'month', layout: 'list'})}}); await p.evaluate(() => window.scrollTo(0, 430)); await settle(p); await shot(p, 'm_library'); await closePage(p); };
S.m_calendar = async b => { const p = await open(b, {user: 'khang', mobile: true, hash: '#/calendar', ls: {mmh_hub_calview: 'list'}}); await settle(p); await shot(p, 'm_calendar'); await closePage(p); };
S.m_session = async b => { const p = await open(b, {user: 'khang', mobile: true}); await go(p, '#/s/S107?tab=materials', 1500); await shot(p, 'm_session'); await closePage(p); };
S.m_quiz = async b => {
  const p = await open(b, {user: 'khang', matsDone: true, mobile: true}); await go(p, '#/s/S107', 1200);
  await p.evaluate(() => Quiz.intro('S107')); await p.waitForSelector('[data-a="qzStart"]'); await p.click('[data-a="qzStart"]'); await p.waitForSelector('.qz-q');
  await answer(p, 2); await p.click('.qz-nav [data-a="qzNav"][data-d="1"]'); await p.click('.opts [data-k="C"]');
  await p.clock.setFixedTime(new Date(T0.getTime() + 140e3)); await settle(p, 900); await shot(p, 'm_quiz'); await closePage(p);
};
S.m_more = async b => { const p = await open(b, {user: 'giang', mobile: true}); await p.click('#tabbar [data-a="moreMenu"]'); await p.waitForSelector('.ov.on .nv'); await settle(p); await shot(p, 'm_more'); await closePage(p); };
S.m_reader = async b => {
  const p = await open(b, {user: 'khang', mobile: true}); await go(p, '#/s/S107?tab=materials', 1500);
  await p.click('.mat [data-a="course"][data-fid="F107_1"].btn'); await p.waitForSelector('#rdPages .rd-page canvas', {timeout: 20000}); await settle(p, 1500); await shot(p, 'm_reader'); await closePage(p);
};

/* =========================== CHẠY =========================== */
(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const want = process.argv.slice(2);
  const names = want.length ? want : Object.keys(S);
  const b = await chromium.launch();
  const failed = [];
  for (const n of names) {
    if (!S[n]) { console.log('?? không có cảnh', n); continue; }
    console.log('▶', n);
    try { await S[n](b); } catch (e) { failed.push(n); console.log('  ✗', n, e.message.split('\n')[0]); }
  }
  await b.close();
  const prev = fs.existsSync(OUT + '_actions.json') ? JSON.parse(fs.readFileSync(OUT + '_actions.json', 'utf8')) : {};
  Object.entries(ACTIONS).forEach(([k, v]) => prev[k] = Math.max(prev[k] || 0, v));
  fs.writeFileSync(OUT + '_actions.json', JSON.stringify(prev, null, 1));
  // manifest: chỉ các cảnh đã có ảnh
  const M = require('./manifest_src');
  const man = M.filter(m => fs.existsSync(OUT + m.id + '.jpg')).map(m => Object.assign({id: m.id, file: m.id + '.jpg'}, m));
  fs.writeFileSync(OUT + 'manifest.json', JSON.stringify(man, null, 1));
  console.log('Xong:', DONE.length, 'ảnh; lỗi:', failed.join(', ') || 'không', '; manifest', man.length, 'mục');
})();
