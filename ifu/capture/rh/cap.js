const { chromium } = require("playwright"); const path=require("path"); process.chdir(__dirname); const fs0=require('fs'); if(!fs0.existsSync('shots')) fs0.mkdirSync('shots'); const M=require('./mock'); const fs=require('fs');
const ONLY=process.argv.slice(2);
const W=1440,H=860;
async function newPage(b, o){
  o=o||{};
  const ctx=await b.newContext({viewport:o.vp||{width:W,height:H},deviceScaleFactor:2,locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh',isMobile:!!o.mobile,hasTouch:!!o.mobile});
  const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  await p.addInitScript((o)=>{ try{ if(sessionStorage.getItem('__init')) return; sessionStorage.setItem('__init','1');
    if(!o.nopic) localStorage.setItem('mmh_pic',o.who); localStorage.setItem('mmh_src','marketing');
    if(o.tk) localStorage.setItem('mmh_tk',JSON.stringify({tk:'mocktk.'+o.tk,exp:Date.now()+864e5,user:{email:o.tk+'@mani.inc',local:o.tk,pic:o.who,level:'pic'}})); }catch(_){} }, {who:o.pic||'Giang',nopic:!!o.nopic,tk:o.tk||''});
  if(o.time) await p.clock.setFixedTime(new Date(o.time));   /* giả lập ngày (vd. popup hạn chứng từ) */
  await M.install(p,o);
  await p.goto('file://'+'/home/user/MMH-Report/index.html');
  if(!o.upd) await p.evaluate(()=>{ if(window.UPD) UPD.active=function(){ return []; }; });
  if(!o.asg) await p.evaluate(()=>{ if(window.ASG){ ASG.unseen=function(){ return []; }; } });
  if(!o.dl) await p.evaluate(()=>{ if(window.DL){ DL.info0=DL.info; DL.info=function(n){ var i=DL.info0(n); if(!window.__dlOn) i.due=false; return i; }; } });   /* ẩn thông báo cập nhật khi chụp cảnh khác */
  if(o.gate) return p;   /* ★ v16.0: dừng ở màn đăng nhập */
  await p.waitForFunction((who)=>window.S&&S.user&&S.user.pic===who&&document.getElementById('app').style.display==='block',o.pic||'Giang',{timeout:20000});
  if(!o.upd) await p.evaluate(()=>{ if(window.UPD && UPD.isOpen()) UPD.close(); });
  await p.waitForFunction(()=>window.MC&&MC.st&&MC.st.trip&&MC.st.trip.s&&MC.st.trip.s!=='load',null,{timeout:20000});
  await p.waitForTimeout(600);
  return p;
}
async function shot(p, name, o){
  o=o||{};
  let clip=null;
  if(o.clip){ clip=typeof o.clip==='string'? await p.evaluate(s=>{ const r=document.querySelector(s).getBoundingClientRect(); return {x:r.left,y:r.top,width:r.width,height:r.height}; }, o.clip) : o.clip; }
  const vp=p.viewportSize(); if(!clip) clip={x:0,y:0,width:vp.width,height:vp.height};
  const marks=[];
  for(const m of (o.marks||[])){
    const r=await p.evaluate(s=>{ const e=typeof s==='string'?document.querySelector(s):null; if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; }, m[0]);
    if(!r){ console.log('  !! missing mark', name, m[0]); continue; }
    marks.push({n:m[1], pos:m[2]||'tl', box:!!m[3], x:(r.x-clip.x)/clip.width, y:(r.y-clip.y)/clip.height, w:r.w/clip.width, h:r.h/clip.height});
  }
  await p.screenshot({path:'shots/'+name+'.png', clip});
  fs.writeFileSync('shots/'+name+'.json', JSON.stringify({w:clip.width,h:clip.height,marks}));
  console.log('shot', name, Math.round(clip.width)+'x'+Math.round(clip.height), marks.length+' marks', p.errs.length?p.errs:'');
}
const ev=(p,f,a)=>p.evaluate(f,a);
const S={};
S.main=async b=>{ const p=await newPage(b,{noChecks:true}); await p.waitForTimeout(4500); await ev(p,()=>{ NT.close&&NT.close(); NT.trips=[]; });
  await ev(p,()=>{ NT.paint(); NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); }); await p.waitForTimeout(900); await ev(p,()=>{ NT.close&&NT.close(); });
  await shot(p,'main',{marks:[['.cal-launch[onclick="openMMHCalendar()"]',1,'tr',1],['#v10-trip-btn, button[onclick*="tripProposeOpen"]',2,'tr'],['#rt-btn',3,'tl']]}); };
S.letter=async b=>{ const p=await newPage(b,{}); await p.waitForFunction(()=>document.getElementById('nt-letter').classList.contains('show'),null,{timeout:45000}).catch(()=>{});
  await ev(p,()=>{ if(!document.getElementById('nt-letter').classList.contains('show')){ NT.trnReady=true; NT.tripReady=true; NT.open(false); } });
  await p.waitForTimeout(700);
  await shot(p,'letter',{marks:[['.nt-hd h2',1,'tl'],['.nt-sec:nth-of-type(1) .nt-it button',2,'tr'],['.nt-sec:nth-of-type(2) .nt-it button',3,'tr'],['.nt-ft .go',4,'tr']]}); };
S.calmonth=async b=>{ const p=await newPage(b,{}); await ev(p,()=>{ NT.close(); MC.f.kinds.trip=1; MC.ref=new Date(2026,9,1); MC.view='month'; openMMHCalendar(); MC.setView('month'); });
  await p.waitForTimeout(1500); await ev(p,()=>{ NT.close(); });
  await shot(p,'calmonth',{marks:[['#mc-seg',1,'tl'],['#mc-side .mc-sg',2,'tr'],['#mc-bell',3,'tl'],['.mc-new',4,'tr'],['.mc-kpis, .mc-kpi',5,'tl']]}); };
S.calweek=async b=>{ const p=await newPage(b,{}); await ev(p,()=>{ NT.close(); MC.f.kinds.trip=1; MC.ref=new Date(2026,9,6); openMMHCalendar(); MC.setView('week'); });
  await p.waitForTimeout(1500); await ev(p,()=>NT.close());
  await shot(p,'calweek',{marks:[]}); };
S.newmenu=async b=>{ const p=await newPage(b,{}); await ev(p,()=>{ NT.close(); MC.ref=new Date(2026,9,1); openMMHCalendar(); MC.setView('month'); });
  await p.waitForTimeout(1200); await ev(p,()=>NT.close());
  await ev(p,()=>MC.addAt('2026-10-14')); await p.waitForTimeout(400);
  await shot(p,'newmenu',{marks:[['.mc-day[ondblclick*="2026-10-14"]',1,'tl',1],['#mc-menu button:nth-of-type(1)',2,'tr'],['#mc-menu button:nth-of-type(2)',3,'tr']]}); };

S.v159menu=async b=>{ const p=await newPage(b,{}); await p.waitForTimeout(3000); await ev(p,()=>{ NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); }); await p.waitForTimeout(900); await ev(p,()=>{ NT.close&&NT.close(); UM.open(); }); await p.waitForTimeout(300);
  await shot(p,'v159menu',{clip:{x:760,y:0,width:680,height:360},marks:[['#topbar .tb-user',1,'tl',1],['#um-color',2,'tr'],['#um-pop .um-row',3,'tr'],['#um-news',4,'tr'],['#um-out',5,'tr']]}); };
const openCal=async(p,ref,view)=>{ await ev(p,([y,m,d,v])=>{ NT.close(); MC.f.kinds.trip=1; MC.ref=new Date(y,m,d); openMMHCalendar(); MC.setView(v); },[ref[0],ref[1],ref[2],view]); await p.waitForTimeout(1200); await ev(p,()=>NT.close()); };
S.trnform=async b=>{ const p=await newPage(b,{vp:{width:1440,height:1240}}); await openCal(p,[2026,9,1],'month');
  await ev(p,()=>trnOpen('2026-10-14')); await p.waitForSelector('#trn-topic');
  await p.fill('#trn-topic','Mani Dental product — Key SKUs FY68');
  try{ await p.fill('#trn-purpose','Nắm chắc 20 SKU chủ lực FY68: tính năng, USP, giá & chính sách; luyện tình huống tư vấn cho bác sĩ.'); }catch(e){}
  await ev(p,()=>{ const a=document.getElementById('trn-from'), z=document.getElementById('trn-to'); if(a){a.value='09:00';a.dispatchEvent(new Event('change',{bubbles:true}));} if(z){z.value='10:30';z.dispatchEvent(new Event('change',{bubbles:true}));} });
  await p.selectOption('#trn-aud-add','g:MMH - Sales team').catch(()=>{});
  await p.selectOption('#trn-aud-add','u:mmh.admin@manimedicalhanoi.com').catch(()=>{});
  await p.waitForTimeout(300);
  await shot(p,'trnform',{clip:'#modals .modal-box',marks:[['#trn-topic',1,'tl'],['#trn-date',2,'tl'],['#trn-trainer',3,'tl'],['#trn-aud',4,'tl'],['#trn-save2',5,'tr']]});
  await p.click('#trn-save2'); await p.waitForSelector('#trn-send',{timeout:8000});
  await p.waitForTimeout(400);
  await shot(p,'trncompose',{clip:'#modals .modal-box',marks:[['#trn-to',1,'tl'],['.trn-ccme',2,'tl'],['#trn-send',3,'tr']]});
};
S.trnowner=async b=>{ const p=await newPage(b,{}); await openCal(p,[2026,8,1],'month');
  await ev(p,()=>MC.open('training:S20260925-01')); await p.waitForTimeout(1200);
  await shot(p,'trnowner',{marks:[['#mc-dr .mc-act',1,'tl'],['#mc-drop',2,'tl'],['#mc-mats .mc-fbt',3,'tr']]}); };
S.trnviewer=async b=>{ const p=await newPage(b,{}); await openCal(p,[2026,9,1],'month');
  await ev(p,()=>MC.open('training:S20261008-01')); await p.waitForTimeout(1200);
  await shot(p,'trnviewer',{marks:[['#mc-dr .mc-note, #mc-dr .mc-warn',1,'tl'],['#mc-mats .mc-file:nth-of-type(1) .mc-fbt a:nth-of-type(1)',2,'tl'],['#mc-mats .mc-file:nth-of-type(1) .mc-fbt a:nth-of-type(2)',3,'tr']]}); };
S.tripprop=async b=>{ const p=await newPage(b,{vp:{width:1440,height:1240}}); await openCal(p,[2026,9,1],'month');
  await ev(p,()=>MC.create('trip','2026-10-27')); await p.waitForSelector('#tp-purpose',{timeout:8000});
  await ev(p,()=>{ const v=(id,x)=>{ const e=document.getElementById(id); e.value=x; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
    v('tp-start','2026-10-27'); v('tp-finish','2026-10-29'); try{ tpDays(); }catch(_){}
    MS.dest.sel=['Can Tho']; msPaint('dest'); MS.co.sel=['Khang']; msPaint('co'); MS.eq.sel=['Laptop','Standee']; msPaint('eq');
    v('tp-purpose','Hỗ trợ workshop Jizai Dr. Lam Dai Phong & đi thị trường Cần Thơ');
    v('tp-expect','1. Workshop đạt ≥ 30 BS tham dự\n2. Chốt kế hoạch FY68 với 3 đại lý miền Tây');
    v('tp-sched','27/10: HN → Cần Thơ, set up sự kiện · 28/10: Workshop · 29/10: Gặp đại lý, về HN');
    TPC=[{d:'Vé máy bay khứ hồi',a:4600000},{d:'Khách sạn 2 đêm',a:1800000},{d:'Công tác phí',a:900000}]; tpCostPaint(); });
  await p.waitForTimeout(300);
  await shot(p,'tripprop',{clip:'#modals .modal-box',marks:[['#tp-start',1,'tl'],['.field:has(#ms-i-dest)',2,'tl'],['#tp-purpose',3,'tl'],['#tp-costs',4,'tl'],['#tp-send',5,'tr']]}); };
const tripRow=(p,pic,date)=>ev(p,([a,d])=>{ const e=MC.raw.trip.events.find(x=>x.pic===a&&x.date===d); return e&&e.row; },[pic,date]);
S.tripdrawer=async b=>{ const p=await newPage(b,{}); await openCal(p,[2026,8,1],'month');
  const r=await tripRow(p,'Giang','2026-09-19'); await ev(p,r=>MC.open('trip:'+r),r); await p.waitForTimeout(900);
  await shot(p,'tripdrawer',{marks:[['#mc-dr .mc-act button',1,'tl'],['#mc-dr .mc-kv',2,'tl'],['#mc-rep',3,'tl']]}); };
S.tripreport=async b=>{ const p=await newPage(b,{vp:{width:1440,height:1240}}); await openCal(p,[2026,9,1],'month');
  await ev(p,()=>MC.tripOpen('trip:999')); await p.waitForTimeout(1200);
  await ev(p,()=>{ const t=document.querySelectorAll('#tr6 textarea'); const v=['1. Tham dự hội nghị VOS Đà Nẵng, gian hàng Mani Ophthalmic\n2. Gặp NPP miền Trung','1. 40+ BS ghé gian hàng, quan tâm chỉ khâu 8-0 / 10-0\n2. NPP đề xuất tăng tồn kho dao phaco Q3','1. Gửi báo giá chỉ khâu cho 5 BV\n2. Chốt kế hoạch FY68 với NPP trước 20/10']; t.forEach((x,i)=>{ if(v[i]) x.value=v[i]; }); });
  await shot(p,'tripreport',{clip:'#tr6',marks:[['#tr6 .tr6-head',1,'tl'],['#tr6 .tr6-rep',2,'tl'],['#tr6-mail',3,'tl'],['#tr6 .modal-footer .btn-primary',4,'tr']]}); };
S.offline=async b=>{ const p=await newPage(b,{}); await openCal(p,[2026,9,1],'month');
  const id=await ev(p,()=>{ const e=MC.ev.find(x=>x.k==='offline'&&/Contemporary Endodontics/.test(x.title))||MC.ev.find(x=>x.k==='offline'); return e.id; });
  await ev(p,id=>MC.open(id),id); await p.waitForTimeout(700);
  await shot(p,'offline',{marks:[['#mc-dr .mc-kv',1,'tl'],['#mc-dr .mc-lks',2,'tl']]}); };
S.online=async b=>{ const p=await newPage(b,{}); await openCal(p,[2026,8,1],'month');
  const id=await ev(p,()=>{ const e=MC.ev.find(x=>x.k==='pevent'&&x.n&&x.n.link)||MC.ev.find(x=>x.k==='pevent'); return e.id; });
  await ev(p,id=>MC.open(id),id); await p.waitForTimeout(700);
  await shot(p,'online',{marks:[['#mc-dr .mc-kv',1,'tl'],['#mc-dr .mc-lks',2,'tl']]}); };
S.notice=async b=>{ const p=await newPage(b,{upd:true,noChecks:true}); await p.waitForFunction(()=>UPD.isOpen(),null,{timeout:10000}); await p.waitForTimeout(500);
  await shot(p,'notice',{marks:[['#upd .upd-hd .k',1,'tl'],['#upd .upd-it a.im',2,'tl'],['#upd-hide',3,'tl'],['#upd .upd-ft .doc',4,'tl']]}); };
S.deadline=async b=>{ const p=await newPage(b,{dl:true,noChecks:true,time:'2026-10-15T09:30:00+07:00',vp:{width:1440,height:900}}); await p.waitForFunction(()=>DL.isOpen(),null,{timeout:12000}); await p.waitForTimeout(400);
  await shot(p,'deadline',{marks:[['#dl .dl-hd h2',1,'tl'],['#dl .dl-r.on',2,'tl'],['#dl .dl-pt',3,'tl'],['#dl .dl-ft .off',4,'tr']]}); };
S.asgadd=async b=>{ const p=await newPage(b,{pic:'Thuong',noChecks:true,vp:{width:1440,height:1000}}); await ev(p,()=>NT.close());
  await ev(p,()=>c10Add('2026-10-07','4',true)); await p.waitForSelector('#c10a-name',{timeout:8000});
  await p.fill('#c10a-name','Truyền thông: Agenda sự kiện'); await p.selectOption('#c10a-pic','Minh Trang').catch(()=>{});
  await ev(p,()=>{ const e=document.getElementById('c10a-pic'); if(e) e.dispatchEvent(new Event('change',{bubbles:true})); const d=document.getElementById('c10a-due'); if(d){ d.value='2026-10-08'; } });
  await p.waitForTimeout(300);
  await shot(p,'asgadd',{clip:'#modals .modal-box',marks:[['#c10a-name',1,'tl'],['#c10a-pic',2,'tl'],['#c10a-mailw',3,'tl'],['#c10a-save',4,'tr']]}); };
S.asgpopup=async b=>{ const p=await newPage(b,{pic:'Minh Trang',asg:true,noChecks:true}); await p.waitForFunction(()=>ASG.isOpen(),null,{timeout:20000}); await p.waitForTimeout(400);
  await shot(p,'asgpopup',{marks:[['#asg .asg-hd h2',1,'tl'],['#asg .asg-it small',2,'tl'],['#asg .asg-it button',3,'tr']]});
  await p.click('#asg .ok'); await p.waitForTimeout(900); await ev(p,()=>NT.close()); await p.waitForTimeout(300);
  await shot(p,'asgcal',{marks:[['.c10-card .asg-flag',1,'tr']]});
  await ev(p,()=>{ switchTab('detail'); S.detailOpen['4']=true; renderDetail(); }); await p.waitForTimeout(800);
  await shot(p,'asgdetail',{marks:[['#app .asg-flag',1,'tr']]}); };
S.mkdrawer=async b=>{ const p=await newPage(b,{pic:'Thuong',noChecks:true,vp:{width:1440,height:1300}}); await openCal(p,[2026,9,1],'month');
  const id=await ev(p,()=>MC.ev.find(x=>x.k==='offline'&&/Contemporary/.test(x.title)).id); await ev(p,id=>MC.open(id),id); await p.waitForTimeout(500);
  await shot(p,'mkdrawer',{clip:'#mc-dr',marks:[['#mc-dr .mk-hbtn',1,'tr'],['#mc-dr .mkv-pills',2,'tl'],['#mc-dr .mkv-facts',3,'tl']]});
  await p.click('#mc-dr .mk-hbtn'); await p.waitForSelector('#mk-type',{timeout:8000}); await p.waitForTimeout(300);
  await shot(p,'mkedit',{clip:'#mc-dr',marks:[['#mc-dr .mkf .src',1,'tl'],['#mk-_start',2,'tl'],['#mk-plan',3,'tl'],['#mc-dr .mkf-ft .del',4,'tl'],['#mc-dr .mkf-ft .sv',5,'tr']]});
  await ev(p,()=>{ MK.cancel&&MK.cancel(); MC.closeDr(); MC.addAt('2026-10-20'); }); await p.waitForTimeout(400);
  await shot(p,'mkmenu',{marks:[['#mc-menu button:nth-of-type(3)',1,'tr']]}); };
S.listview=async b=>{ const p=await newPage(b,{}); await openCal(p,[2026,9,1],'list'); await shot(p,'listview',{marks:[]}); };
S.phone=async b=>{ const p=await newPage(b,{vp:{width:390,height:844},mobile:true}); await ev(p,()=>{ NT.close(); MC.f.kinds.trip=1; MC.ref=new Date(2026,9,6); openMMHCalendar(); MC.setView('list'); }); await p.waitForTimeout(1200); await ev(p,()=>NT.close());
  await shot(p,'phone',{marks:[]});
  await ev(p,()=>MC.open('training:S20260925-01')); await p.waitForTimeout(1000); await shot(p,'phone2',{marks:[]}); };
S.theme=async b=>{ const p=await newPage(b,{noChecks:true}); await p.waitForTimeout(3000); await ev(p,()=>{ NT.close&&NT.close(); });
  await ev(p,()=>THEME.open()); await p.waitForTimeout(250);
  await shot(p,'themepick',{marks:[['#th-btn',1,'tl'],['#th-pop button.op[data-k="sage"]',2,'tl']]});
  for(const k of ['sage','lavender','sand','slate','ocean','rose','teal','terracotta','forest']){ await ev(p,k=>{ THEME.set(k); THEME.close(); },k); await p.waitForTimeout(150); await shot(p,'theme_'+k,{marks:[]}); }
  await ev(p,()=>{ THEME.set('sage'); MC.f.kinds.trip=1; MC.ref=new Date(2026,9,1); openMMHCalendar(); MC.setView('month'); }); await p.waitForTimeout(1300); await ev(p,()=>NT.close());
  await shot(p,'theme_cal',{marks:[]}); };
/* ★ v16.0 — đăng nhập bằng email + mã 6 số */
S.v160gate=async b=>{ const p=await newPage(b,{nopic:true,gate:true,noChecks:true,vp:{width:1440,height:900}}); await p.waitForSelector('#gate #au-email'); await p.waitForTimeout(400);
  await p.fill('#au-email','mmh.product@mani.inc'); await p.waitForTimeout(150);
  await shot(p,'v160gate',{marks:[['#au-email',1,'tl'],['#gate .au-btn',2,'tl'],['#gate .au-legacy',3,'tl']]});
  await p.click('#gate .au-btn'); await p.waitForSelector('#au-code'); await p.fill('#au-code','4827'); await p.waitForTimeout(200);
  await shot(p,'v160code',{marks:[['#au-code',1,'tl'],['[data-act="resend"]',2,'tr']]}); };
S.v160nudge=async b=>{ const p=await newPage(b,{pic:'Giang',noChecks:true}); await ev(p,()=>{ NT.close&&NT.close(); }); await p.waitForSelector('#au-nudge.show',{timeout:15000}); await p.waitForTimeout(300); await ev(p,()=>{ NT.close&&NT.close(); });
  await shot(p,'v160nudge',{marks:[['#au-nudge .go',1,'tl']]});
  await p.click('#au-nudge .go'); await p.waitForSelector('#au-ov.show #au-email'); await p.fill('#au-ov #au-email','mmh.product@manimedicalhanoi.com'); await p.waitForTimeout(200);
  await shot(p,'v160modal',{marks:[]}); };
S.v160menu=async b=>{ const p=await newPage(b,{pic:'Giang',tk:'mmh.product',noChecks:true}); await p.waitForTimeout(5000); await ev(p,()=>{ NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); }); await p.waitForTimeout(400);
  await ev(p,()=>UM.open()); await p.waitForTimeout(300);
  await shot(p,'v160menu',{marks:[['#um-auth',1,'tl'],['#um-out',2,'tl']]}); };
/* ★ v16.1 — tìm nhanh Ctrl+K */
S.v161qs=async b=>{ const p=await newPage(b,{noChecks:true,tk:'mmh.product',vp:{width:1440,height:900}}); await p.waitForTimeout(2500); await ev(p,()=>{ NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); });
  await p.keyboard.press('Control+k'); await p.keyboard.type('jizai'); await p.waitForTimeout(400);
  await shot(p,'v161qs',{marks:[['#qs .qs-in',1,'tl'],['#qs .qs-it.on',2,'tr'],['#qs .qs-it:last-child',3,'tl'],['#qs-btn',4,'tl']]});
  await ev(p,()=>{ var i=document.querySelector('#qs .qs-in'); i.value=''; i.dispatchEvent(new Event('input')); }); await p.keyboard.type('bang gia km'); await p.waitForTimeout(400);
  await shot(p,'v161task',{marks:[['#qs .qs-it.on',1,'tr']]}); };
/* ★ v16.2 — phân quyền người dùng */
S.v174tf=async b=>{ const p=await newPage(b,{pic:'Nguyen Ha',tk:'nt.ha',noChecks:true,vp:{width:1440,height:860}}); await p.waitForTimeout(1500);
  await ev(p,()=>{ var o=JSON.parse(localStorage.getItem('mmh_tk')); o.user.level='director'; localStorage.setItem('mmh_tk',JSON.stringify(o)); NT.close&&NT.close(); });
  await p.waitForSelector('#tfa-btn',{timeout:15000}); await p.waitForTimeout(2500); await ev(p,()=>{ var o=document.getElementById('tfa-ov'); if(o) o.remove(); });
  await shot(p,'v174tf_btn',{clip:{x:700,y:0,width:740,height:64},marks:[['#tfa-btn',1,'tl']]});
  await ev(p,()=>TFA.open()); await p.waitForSelector('.tfa-it'); await p.click('.tfa-it[data-r="605"] .tfa-t'); await p.click('.tfa-it[data-r="606"] .tfa-t');
  await p.fill('[data-cm="606"]','Đồng ý, nhớ gửi báo cáo trong 3 ngày'); await p.waitForTimeout(300);
  await shot(p,'v174tf_list',{clip:'#tfa-ov .tfa-box',marks:[['#tfa-ov .tfa-it[data-r="605"] input',1,'tl'],['[data-cm="606"]',2,'tl'],['#tfa-ov .tfa-ok',3,'tl']]});
  p.on('dialog',d=>d.accept()); await p.click('#tfa-ov .tfa-ok'); await p.waitForTimeout(1200);
  await shot(p,'v174tf_done',{clip:'#tfa-ov .tfa-box'}); console.log('LOG', JSON.stringify(M.LOG?M.LOG.slice(-1):'')); };
S.v172pd=async b=>{ const p=await newPage(b,{pic:'Giang',tk:'mmh.product',noChecks:true,vp:{width:1440,height:860}}); await p.waitForTimeout(4500); await ev(p,()=>{ NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); });
  await ev(p,()=>{ ADM.open(); }); await p.waitForSelector('#adm tr.r'); await p.click('#adm tr.r[data-l="marketing.mmh1"]').catch(()=>p.click('#adm tr.r:nth-child(3)')); await p.waitForTimeout(200);
  await p.click('#adm .tg[data-k="pd"]'); await p.waitForTimeout(150);
  await shot(p,'v172pd',{marks:[['#adm .tg[data-k="pd"]',1,'tl'],['#af-save',2,'tl']]}); };
S.v162adm=async b=>{ const p=await newPage(b,{pic:'Giang',tk:'mmh.product',noChecks:true,vp:{width:1440,height:860}}); await p.waitForTimeout(4500); await ev(p,()=>{ NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); });
  await ev(p,()=>UM.open()); await p.waitForTimeout(250);
  await shot(p,'v162menu',{marks:[['#um-adm',1,'tl']]});
  await ev(p,()=>{ UM.close(); ADM.open(); }); await p.waitForSelector('#adm tr.r'); await p.click('#adm tr.r[data-l="mmh.admin"]'); await p.waitForTimeout(200);
  await p.click('#adm .tg[data-k="mkt"]'); await p.waitForTimeout(150);
  await shot(p,'v162adm',{marks:[['#ad-add',1,'tl'],['#adm tr.r.on',2,'tl'],['#adm .sec',3,'tl'],['#adm .ll.never',4,'tl'],['#af-save',5,'tl']]}); };
/* ★ v16.3 — email giao việc từ hộp thư của bạn + theo dõi + trao đổi */
S.v163=async b=>{ const p=await newPage(b,{pic:'Giang',tk:'mmh.product',noChecks:true,vp:{width:1440,height:1000}}); await p.waitForTimeout(5000); await ev(p,()=>{ NT.close&&NT.close(); if(window.UPD&&UPD.isOpen()) UPD.close(); });
  await ev(p,()=>mailComposeAssign({pic:'Minh Trang',name:'Viết bài giới thiệu Key SKUs',key:'FY68 Product plan — Dental',start:'2026-10-06',due:'2026-10-10'})); await p.waitForSelector('#m11-trk .at-row'); await p.waitForTimeout(300);
  await shot(p,'v163compose',{clip:'#modals .modal-box',marks:[['#m11-from button.on',1,'tl'],['#m11-trk',2,'tl'],['#m11-send',3,'tl']]});
  await ev(p,()=>closeModal()); await ev(p,()=>AT.open('byme')); await p.waitForSelector('#at.show .at-row'); await p.waitForTimeout(300);
  await shot(p,'v163track',{clip:'#at .at-card',marks:[['#at .at-row[data-id="A2610050930"] .at-st',1,'tl'],['#at .at-row[data-id="A2610040800"] .at-st',2,'tl'],['#at .at-sec',3,'tl']]});
  await p.click('#at .at-row[data-id="A2610050930"]'); await p.waitForSelector('#at-txt'); await p.fill('#at-txt','Ok em, chị duyệt ngay khi nhận bản nháp nhé.'); await p.waitForTimeout(200);
  await shot(p,'v163thread',{clip:'#at .at-card',marks:[['#at .rp',1,'tl'],['#at-send',2,'tl']]}); };
/* ★ v16.8 — nhắc tự đánh giá quý: chỉ ngày 09 tháng đầu quý, trước 17:00 */
S.v168kpn=async b=>{ const p=await newPage(b,{pic:'Giang',tk:'mmh.product',noChecks:true,time:'2026-12-09T09:00:00+07:00',vp:{width:1100,height:700}});
  await ev(p,()=>{ NT.close&&NT.close(); }); await p.waitForSelector('#kpn.show',{timeout:30000}); await p.waitForTimeout(300);
  await shot(p,'v168kpn',{clip:'#kpn .c'}); };
module.exports={S,newPage,shot,ev};
if(require.main===module)(async()=>{
  const b=await chromium.launch({args:['--lang=vi-VN']});
  for(const k of Object.keys(S)){ if(ONLY.length && !ONLY.includes(k)) continue; try{ await S[k](b); }catch(e){ console.log('ERR',k,e.message.split('\n')[0]); } }
  await b.close();
})();
