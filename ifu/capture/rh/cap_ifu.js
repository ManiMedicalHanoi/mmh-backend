/* Bộ ảnh IFU — MMH Report Hub (giao diện tiếng Việt, backend GIẢ LẬP).
   Chạy: NODE_PATH=$(npm root -g) node cap_ifu.js [cảnh…]   (không tham số = chụp tất cả)
   Ảnh: /home/claude/ifu/shots/rh/<id>.png + <id>.jpg (q85, rộng ≤ 2000px) · manifest: manifest.json (từ manifest_src.js) */
const { chromium } = require('playwright');
const path=require('path'), fs=require('fs'), { execFileSync }=require('child_process');
process.chdir(__dirname);
const M=require('./mock');
const APP='file:///home/user/MMH-Report/index.html';
const OUT='/home/claude/ifu/shots/rh'; fs.mkdirSync(OUT,{recursive:true});
const ONLY=process.argv.slice(2);
const W=1440,H=860, MOB={width:390,height:844};
const TODAY='2026-10-07T09:30:00+07:00';     /* thứ Tư — tuần dữ liệu mẫu 05–11/10/2026 */
const TK={Giang:'mmh.product',Thuong:'mmh.marketing',Tuyen:'mmh.sales','Minh Trang':'mmh.admin',Khang:'mmh.saigon2','Viet Ha':'mmh.surgical','Nguyen Ha':'nt.ha',Vinh:'mmh.dental2',Viet:'mmh.dental','Duc Anh':'mmh.design'};
const PRODUCED=[];

async function newPage(b,o){
  o=o||{}; const pic=o.pic||'Giang', tk=o.tk===false?'':(o.tk||TK[pic]||'');
  const ctx=await b.newContext({viewport:o.vp||(o.mobile?MOB:{width:W,height:H}),deviceScaleFactor:2,locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh',isMobile:!!o.mobile,hasTouch:!!o.mobile});
  const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  p.on('dialog',d=>d.accept().catch(()=>{}));
  await p.addInitScript((o)=>{ try{ if(sessionStorage.getItem('__init')) return; sessionStorage.setItem('__init','1');
    if(!o.nopic) localStorage.setItem('mmh_pic',o.who); localStorage.setItem('mmh_src',o.src||'marketing');
    if(o.lang) localStorage.setItem('mmh_lang',o.lang);
    if(o.theme) localStorage.setItem('mmh_theme',o.theme);
    localStorage.setItem('mmh_tour_seen',JSON.stringify({start:1,addtask:1,update:1,calendar:1,mmhcal:1,search:1,assign:1,trip:1,approve:1,report:1,kpi:1,meet:1,news:1,theme:1,admin:1}));
    if(o.tk) localStorage.setItem('mmh_tk',JSON.stringify({tk:'mocktk.'+o.tk,exp:Date.now()+30*864e5,user:{email:(o.admin?'admin@example.com':o.tk+'@mani.inc'),local:o.tk,pic:o.who,level:'pic',admin:!!o.admin}}));
    Object.keys(o.ls||{}).forEach(k=>localStorage.setItem(k,o.ls[k])); }catch(_){} },
    {who:pic,nopic:!!o.nopic,tk,src:o.src,lang:o.lang,theme:o.theme,admin:!!o.admin,ls:o.ls||{}});
  await p.clock.setFixedTime(new Date(o.time||TODAY));
  await M.install(p,o);
  await p.goto(APP);
  await p.evaluate((o)=>{
    if(!o.upd && window.UPD) UPD.active=function(){ return []; };
    if(!o.asg && window.ASG) ASG.unseen=function(){ return []; };
    if(!o.dl && window.DL){ DL.info0=DL.info; DL.info=function(n){ var i=DL.info0(n); i.due=false; return i; }; }
    if(!o.letter && window.NT){ var f=NT.open; NT.open=function(m){ if(m===true) return f.apply(this,arguments); }; }
  },o);
  if(o.gate) return p;
  await p.waitForFunction((who)=>window.S&&S.user&&S.user.pic===who&&document.getElementById('app').style.display==='block',o.ls&&o.ls.mmh_test_rh?'TEST':pic,{timeout:25000});
  await p.waitForFunction(()=>window.MC&&MC.st&&MC.st.trip&&MC.st.trip.s&&MC.st.trip.s!=='load',null,{timeout:25000}).catch(()=>{});
  await p.waitForTimeout(o.wait||1500);
  if(o.admin) await p.evaluate(()=>{ var u0=AUTH.user; AUTH.user=function(){ var u=u0.apply(AUTH,arguments); if(u) u.email='admin@example.com'; return u; }; try{ var o=JSON.parse(localStorage.getItem('mmh_tk')); o.user.email='admin@example.com'; localStorage.setItem('mmh_tk',JSON.stringify(o)); }catch(_){} });
  await clean(p,o);
  return p;
}
async function clean(p,o){ o=o||{};
  await p.evaluate((o)=>{ try{ if(!o.letter && window.NT&&NT.close) NT.close(); }catch(_){}
    try{ if(!o.upd && window.UPD&&UPD.isOpen&&UPD.isOpen()) UPD.close(); }catch(_){}
    try{ if(!o.tfa){ var t=document.getElementById('tfa-ov'); if(t) t.remove(); } }catch(_){}
    try{ var n=document.getElementById('au-nudge'); if(n) n.classList.remove('show'); }catch(_){}
    try{ var s=document.getElementById('toast'); if(s) s.classList.remove('show'); }catch(_){} },o);
}
async function shot(p,id,o){
  o=o||{}; let clip=null;
  if(o.clip){ clip=typeof o.clip==='string'? await p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:Math.max(0,r.left),y:Math.max(0,r.top),width:r.width,height:r.height}; }, o.clip) : o.clip; }
  if(o.clip && !clip) console.log('  !! clip not found',id,o.clip);
  if(clip && o.pad){ const vp=p.viewportSize(); const x=Math.max(0,clip.x-o.pad), y=Math.max(0,clip.y-o.pad); clip={x,y,width:Math.min(vp.width-x,clip.width+2*o.pad),height:Math.min(vp.height-y,clip.height+2*o.pad)}; }
  const file=path.join(OUT,id+'.png');
  if(o.full) await p.screenshot({path:file,fullPage:true}); else await p.screenshot({path:file, clip:clip||undefined});
  execFileSync('python3',['-c',`
from PIL import Image
im=Image.open(${JSON.stringify(file)}).convert('RGB')
if im.width>2000: im=im.resize((2000,round(im.height*2000/im.width)),Image.LANCZOS)
im.save(${JSON.stringify(file.replace(/\.png$/,'.jpg'))},quality=85,optimize=True)
print(im.width,im.height)`]);
  PRODUCED.push(id);
  console.log('shot',id,p.errs.length?('ERRS '+p.errs.slice(0,2).join(' | ')):'');
}
const ev=(p,f,a)=>p.evaluate(f,a);
const wait=(p,ms)=>p.waitForTimeout(ms);
const openCal=async(p,ref,view)=>{ await ev(p,([y,m,d,v])=>{ MC.f.kinds.trip=1; MC.ref=new Date(y,m,d); openMMHCalendar(); MC.setView(v); },[ref[0],ref[1],ref[2],view]); await wait(p,1400); await clean(p); };
const S={};

/* ═══════════ 1. ĐĂNG NHẬP ═══════════ */
S.login=async b=>{ const p=await newPage(b,{nopic:true,gate:true,tk:false});
  await p.waitForSelector('#gate #au-email'); await wait(p,500);
  await p.fill('#au-email','mmh.product@mani.inc'); await wait(p,200); await shot(p,'login_email');
  await p.click('#gate .au-btn'); await p.waitForSelector('#au-code'); await p.fill('#au-code','1234'); await wait(p,300); await shot(p,'login_code'); };

/* ═══════════ 2. MÀN HÌNH CHÍNH & PHÒNG BAN ═══════════ */
S.main=async b=>{ const p=await newPage(b,{}); await wait(p,1500); await clean(p); await shot(p,'main'); };
S.dept=async b=>{ const p=await newPage(b,{pic:'Tuyen'});
  await ev(p,()=>switchSource('backoffice')); await wait(p,2500); await clean(p); await ev(p,()=>{ switchTab('detail'); S.detailPics=[]; setDetailTime('week'); }); await wait(p,900); await shot(p,'dept_backoffice');
  await ev(p,()=>switchSource('management')); await wait(p,2500); await clean(p); await ev(p,()=>{ switchTab('overview'); try{ setDateMode('month'); }catch(_){} }); await wait(p,1200); await shot(p,'dept_management'); };

/* ═══════════ 3. CÔNG VIỆC ═══════════ */
S.tasks=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}});
  await ev(p,()=>{ switchTab('detail'); }); await wait(p,600);
  await ev(p,()=>{ S.detailPics=[]; setDetailTime('week'); });
  await ev(p,()=>setDetailView('list')); await wait(p,800); await clean(p); await shot(p,'task_list');
  await p.setViewportSize({width:1920,height:1000}); await ev(p,()=>setDetailView('table')); await wait(p,900); await shot(p,'task_table');
  await ev(p,()=>setDetailView('list')); };
S.taskadd=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}});
  await ev(p,()=>c10Add('2026-10-08')); await p.waitForSelector('#c10a-name'); await wait(p,300);
  await ev(p,()=>ksMode('key')); await p.fill('#c10a-name','Chuẩn bị tài liệu hội thảo Ophthalmic Q1'); await p.fill('#c10a-type','Product - Plan').catch(()=>{});
  await p.selectOption('#c10a-pic','Minh Trang').catch(()=>{}); await ev(p,()=>{ var e=document.getElementById('c10a-pic'); e&&e.dispatchEvent(new Event('change',{bubbles:true})); var d=document.getElementById('c10a-due'); if(d) d.value='2026-10-15'; });
  await wait(p,300); await shot(p,'task_add_key',{clip:'#modals .modal-box',pad:8});
  await ev(p,()=>closeModal()); await ev(p,()=>c10Add('2026-10-08','1')); await p.waitForSelector('#c10a-name'); await wait(p,300);
  await p.fill('#c10a-name','Gửi bảng giá cho NPP miền Bắc'); await ev(p,()=>{ var d=document.getElementById('c10a-due'); if(d) d.value='2026-10-09'; }); await wait(p,200);
  await shot(p,'task_add_sub',{clip:'#modals .modal-box',pad:8}); };
S.taskedit=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}});
  await ev(p,()=>openEdit('1.1')); await wait(p,900); await shot(p,'task_edit',{clip:'#modals .modal-box',pad:8}); };
S.gantt=async b=>{ const p=await newPage(b,{pic:'Giang'}); await ev(p,()=>{ switchTab('gantt'); S.ganttPics=[]; setDateMode('week'); }); await wait(p,1200); await clean(p); await shot(p,'task_progress'); };
S.overview=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1500}}); await ev(p,()=>{ switchTab('overview'); try{ setDateMode('week'); }catch(_){} }); await wait(p,1800); await clean(p); await shot(p,'overview'); };
S.report=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}});
  await ev(p,()=>switchTab('report')); await wait(p,1000); await clean(p); await shot(p,'weekly_report');
  await ev(p,()=>openSendReport()); await wait(p,900); await shot(p,'weekly_send',{clip:'#modals .modal-box',pad:8}); };
S.monthly=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:960}});
  await ev(p,()=>{ S.monthPics=[]; S._monthPicInit=true; switchTab('month'); }); await wait(p,1000); await clean(p); await shot(p,'monthly_report'); };
S.workcal=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:960}});
  await ev(p,()=>{ switchTab('calendar'); C10.pics=[]; c10View('week'); }); await wait(p,900); await clean(p); await shot(p,'work_cal_week');
  await ev(p,()=>c10View('month')); await wait(p,900); await shot(p,'work_cal_month');
  await ev(p,()=>c10View('list')); await wait(p,900); await shot(p,'work_cal_list');
  await ev(p,()=>{ c10View('week'); c10Face('pend'); }); await wait(p,900); await shot(p,'work_cal_pending'); };
S.minutes=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}});
  await ev(p,()=>switchTab('meet')); await wait(p,1500); await clean(p); await shot(p,'minutes'); };


/* ═══════════ 4. THANH BÊN & HOẠT ĐỘNG ═══════════ */
S.side=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}}); await wait(p,1500); await clean(p);
  await shot(p,'my_tasks',{clip:{x:0,y:60,width:560,height:380}});
  await ev(p,()=>{ var d=document.querySelector('#sd-team details'); if(d) d.open=true; }); await wait(p,300);
  await shot(p,'team_status',{clip:{x:0,y:60,width:560,height:940}});
  await shot(p,'quick_links',{clip:'#side .sd-links',pad:14});
  await ev(p,()=>{ var d=document.querySelector('#sd-team details'); if(d) d.open=false; toggleActivityRail(); }); await wait(p,900);
  await shot(p,'activity'); };

/* ═══════════ 5. MMH CALENDAR ═══════════ */
S.mmhcal=async b=>{ const p=await newPage(b,{pic:'Giang'});
  await openCal(p,[2026,9,1],'month'); await shot(p,'mmh_cal_month');
  await shot(p,'cal_filters',{clip:'#mc-side'});
  await ev(p,()=>{ MC.ref=new Date(2026,9,6); MC.setView('week'); }); await wait(p,1000); await shot(p,'mmh_cal_week');
  await ev(p,()=>{ MC.ref=new Date(2026,9,1); MC.setView('list'); }); await wait(p,1000); await shot(p,'mmh_cal_list');
  await ev(p,()=>{ MC.setView('month'); }); await wait(p,800); await ev(p,()=>MC.addAt('2026-10-14')); await wait(p,500); await shot(p,'cal_new'); };
S.mkevents=async b=>{ const p=await newPage(b,{pic:'Thuong',vp:{width:1440,height:1100}}); await openCal(p,[2026,9,1],'month');
  const id=await ev(p,()=>{ const e=MC.ev.find(x=>x.k==='offline'&&/Contemporary/.test(x.title))||MC.ev.find(x=>x.k==='offline'); return e.id; });
  await ev(p,id=>MC.open(id),id); await wait(p,900); await shot(p,'offline_event');
  await p.click('#mc-dr .mk-hbtn').catch(()=>{}); await p.waitForSelector('#mk-type',{timeout:8000}).catch(()=>{}); await wait(p,500); await shot(p,'offline_edit',{clip:'#mc-dr'});
  await ev(p,()=>{ MK.cancel&&MK.cancel(); MC.closeDr&&MC.closeDr(); }); await wait(p,400);
  await ev(p,()=>{ MC.ref=new Date(2026,9,1); MC.setView('month'); }); await wait(p,600);
  const id2=await ev(p,()=>{ const e=MC.ev.find(x=>x.k==='pevent'&&x.n&&x.n.link)||MC.ev.find(x=>x.k==='pevent')||MC.ev.find(x=>x.k==='pproduct'); return e&&e.id; });
  if(id2){ await ev(p,id=>MC.open(id),id2); await wait(p,900); await shot(p,'online_post');
    await p.click('#mc-dr .mk-hbtn').catch(()=>{}); await wait(p,1200); await shot(p,'online_edit',{clip:'#mc-dr'}); } };

/* ═══════════ 6. ĐÀO TẠO ═══════════ */
S.training=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1240}}); await openCal(p,[2026,9,1],'month');
  await ev(p,()=>trnOpen('2026-10-14')); await p.waitForSelector('#trn-topic');
  await p.fill('#trn-topic','Mani Dental product — Key SKUs FY68');
  await p.fill('#trn-purpose','Nắm chắc 20 SKU chủ lực FY68: tính năng, USP, giá & chính sách; luyện tình huống tư vấn cho bác sĩ.').catch(()=>{});
  await ev(p,()=>{ const a=document.getElementById('trn-from'), z=document.getElementById('trn-to'); if(a){a.value='09:00';a.dispatchEvent(new Event('change',{bubbles:true}));} if(z){z.value='10:30';z.dispatchEvent(new Event('change',{bubbles:true}));} });
  await p.selectOption('#trn-aud-add','g:MMH - Sales team').catch(()=>{}); await wait(p,300);
  await shot(p,'training_create',{clip:'#modals .modal-box',pad:8});
  await p.click('#trn-save2'); await p.waitForSelector('#trn-send',{timeout:8000}).catch(()=>{}); await wait(p,600);
  await shot(p,'training_invite',{clip:'#modals .modal-box',pad:8}); };
S.trndetail=async b=>{ const p=await newPage(b,{pic:'Giang'}); await openCal(p,[2026,8,1],'month');
  await ev(p,()=>MC.open('training:S20260925-01')); await wait(p,1500); await shot(p,'training_detail');
  const q=await newPage(b,{pic:'Minh Trang'}); await openCal(q,[2026,9,1],'month');
  await ev(q,()=>MC.open('training:S20261008-01')); await wait(q,1500); await shot(q,'training_viewer'); };

/* ═══════════ 7. CÔNG TÁC ═══════════ */
S.trip=async b=>{ const p=await newPage(b,{pic:'Giang',vp:{width:1440,height:1240}}); await openCal(p,[2026,9,1],'month');
  await ev(p,()=>MC.create('trip','2026-10-27')); await p.waitForSelector('#tp-purpose',{timeout:8000});
  await ev(p,()=>{ const v=(id,x)=>{ const e=document.getElementById(id); e.value=x; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); };
    v('tp-start','2026-10-27'); v('tp-finish','2026-10-29'); try{ tpDays(); }catch(_){}
    MS.dest.sel=['Can Tho']; msPaint('dest'); MS.co.sel=['Khang']; msPaint('co'); MS.eq.sel=['Laptop','Standee']; msPaint('eq');
    v('tp-purpose','Hỗ trợ workshop sản phẩm & đi thị trường Cần Thơ');
    v('tp-expect','1. Workshop đạt ≥ 30 BS tham dự\n2. Chốt kế hoạch FY68 với 3 đại lý miền Tây');
    v('tp-sched','27/10: HN → Cần Thơ, set up sự kiện · 28/10: Workshop · 29/10: Gặp đại lý, về HN');
    TPC=[{d:'Vé máy bay khứ hồi',a:4600000},{d:'Khách sạn 2 đêm',a:1800000},{d:'Công tác phí',a:900000}]; tpCostPaint(); });
  await wait(p,300); await shot(p,'trip_propose',{clip:'#modals .modal-box',pad:8}); };
S.tripdet=async b=>{ const p=await newPage(b,{pic:'Giang'}); await openCal(p,[2026,8,1],'month');
  const r=await ev(p,()=>{ const e=MC.raw.trip.events.find(x=>x.pic==='Giang'&&x.date==='2026-09-19'); return e&&e.row; }); await ev(p,r=>MC.open('trip:'+r),r); await wait(p,1100); await shot(p,'trip_detail');
  const q=await newPage(b,{pic:'Giang',vp:{width:1440,height:1240}}); await openCal(q,[2026,9,1],'month');
  await ev(q,()=>MC.tripOpen('trip:999')); await wait(q,1400);
  await ev(q,()=>{ const t=document.querySelectorAll('#tr6 textarea'); const v=['1. Tham dự hội nghị, gian hàng Mani Ophthalmic\n2. Gặp NPP miền Trung','1. 40+ BS ghé gian hàng, quan tâm chỉ khâu 8-0 / 10-0\n2. NPP đề xuất tăng tồn kho dao phaco Q3','1. Gửi báo giá chỉ khâu cho 5 BV\n2. Chốt kế hoạch FY68 với NPP trước 20/10']; t.forEach((x,i)=>{ if(v[i]) x.value=v[i]; }); });
  await shot(q,'trip_report',{clip:'#tr6',pad:6}); };
S.tripapprove=async b=>{ const p=await newPage(b,{pic:'Nguyen Ha',tfa:true}); await wait(p,1500);
  await ev(p,()=>{ var o=JSON.parse(localStorage.getItem('mmh_tk')); o.user.level='director'; localStorage.setItem('mmh_tk',JSON.stringify(o)); });
  await p.waitForSelector('#tfa-btn',{timeout:15000}).catch(()=>{}); await wait(p,2500); await ev(p,()=>{ var o=document.getElementById('tfa-ov'); if(o) o.remove(); });
  await ev(p,()=>TFA.open()); await p.waitForSelector('.tfa-it'); await p.click('.tfa-it[data-r="605"] .tfa-t'); await p.click('.tfa-it[data-r="606"] .tfa-t');
  await p.fill('[data-cm="606"]','Đồng ý, nhớ gửi báo cáo trong 3 ngày'); await wait(p,300);
  await shot(p,'trip_approve',{clip:'#tfa-ov .tfa-box',pad:8});
  await p.click('#tfa-ov .tfa-ok'); await wait(p,1500); await shot(p,'trip_approve_done',{clip:'#tfa-ov .tfa-box',pad:8}); };
S.tripvis=async b=>{ const p=await newPage(b,{pic:'Giang'}); await openCal(p,[2026,8,1],'month'); await shot(p,'trip_visibility_off');
  await ev(p,()=>VIS.toggle()); await wait(p,1200); await shot(p,'trip_visibility_on'); await ev(p,()=>VIS.toggle()); };

/* ═══════════ 8. GIAO VIỆC ═══════════ */
S.assign=async b=>{ const p=await newPage(b,{pic:'Thuong',vp:{width:1440,height:1000}});
  await ev(p,()=>c10Add('2026-10-07','4',true)); await p.waitForSelector('#c10a-name',{timeout:8000});
  await p.fill('#c10a-name','Truyền thông: Agenda sự kiện'); await p.selectOption('#c10a-pic','Minh Trang').catch(()=>{});
  await ev(p,()=>{ const e=document.getElementById('c10a-pic'); if(e) e.dispatchEvent(new Event('change',{bubbles:true})); const d=document.getElementById('c10a-due'); if(d){ d.value='2026-10-08'; } });
  await wait(p,300); await shot(p,'assign_add',{clip:'#modals .modal-box',pad:8});
  const q=await newPage(b,{pic:'Giang',vp:{width:1440,height:1000}});
  await ev(q,()=>mailComposeAssign({pic:'Minh Trang',name:'Viết bài giới thiệu Key SKUs',key:'FY68 Product plan — Dental',start:'2026-10-06',due:'2026-10-10'})); await q.waitForSelector('#m11-trk .at-row').catch(()=>{}); await wait(q,500);
  await shot(q,'assign_mail',{clip:'#modals .modal-box',pad:8});
  await ev(q,()=>closeModal()); await ev(q,()=>AT.open('byme')); await q.waitForSelector('#at.show .at-row'); await wait(q,400);
  await shot(q,'assign_track',{clip:'#at .at-card',pad:8});
  await q.click('#at .at-row[data-id="A2610050930"]'); await q.waitForSelector('#at-txt'); await q.fill('#at-txt','Ok em, chị duyệt ngay khi nhận bản nháp nhé.'); await wait(q,300);
  await shot(q,'assign_thread',{clip:'#at .at-card',pad:8}); };
S.asgpopup=async b=>{ const p=await newPage(b,{pic:'Minh Trang',asg:true}); await p.waitForFunction(()=>ASG.isOpen(),null,{timeout:20000}).catch(()=>{}); await wait(p,500);
  await shot(p,'assign_popup'); };

/* ═══════════ 9. NHẮC VIỆC & THÔNG BÁO ═══════════ */
S.letter=async b=>{ const p=await newPage(b,{pic:'Giang',letter:true,wait:600});
  await ev(p,()=>{ NT.trnReady=true; NT.tripReady=true; NT.open(true); }); await wait(p,1200); await shot(p,'letter'); };
S.deadline=async b=>{ const p=await newPage(b,{dl:true,time:'2026-10-15T09:30:00+07:00',vp:{width:1440,height:900},wait:600}); await p.waitForFunction(()=>DL.isOpen(),null,{timeout:15000}).catch(()=>{}); await wait(p,500); await shot(p,'deadline'); };
S.kpn=async b=>{ const p=await newPage(b,{pic:'Giang',time:'2026-12-09T09:00:00+07:00',wait:600}); await p.waitForSelector('#kpn.show',{timeout:30000}).catch(()=>{}); await wait(p,400);
  await shot(p,'kpi_reminder'); await shot(p,'kpi_reminder_card',{clip:'#kpn .c',pad:10}); };
S.whatsnew=async b=>{ const p=await newPage(b,{pic:'Giang',upd:true,time:'2026-10-12T09:00:00+07:00',wait:600}); await p.waitForFunction(()=>UPD.isOpen(),null,{timeout:15000}).catch(()=>{}); await wait(p,700);
  await shot(p,'whats_new');
  await ev(p,()=>{ UPD.close(); UPM.open(); }); await wait(p,2000); await shot(p,'update_email'); };


/* ═══════════ 10. ĐIỆN THOẠI (cặp với ảnh máy tính) ═══════════ */
const MOBP={mobile:true,pic:'Giang'};
S.mob=async b=>{
  let p=await newPage(b,MOBP); await ev(p,()=>{ switchTab('detail'); S.detailPics=[]; setDetailTime('week'); setDetailView('list'); }); await wait(p,1000); await clean(p); await shot(p,'m_task_list');
  await ev(p,()=>{ switchTab('overview'); try{ setDateMode('week'); }catch(_){} }); await wait(p,1500); await clean(p); await shot(p,'m_overview');
  await ev(p,()=>{ switchTab('gantt'); S.ganttPics=[]; setDateMode('week'); }); await wait(p,1200); await clean(p); await shot(p,'m_progress');
  await ev(p,()=>switchTab('report')); await wait(p,1000); await clean(p); await shot(p,'m_weekly_report');
  await ev(p,()=>{ S.monthPics=[]; S._monthPicInit=true; switchTab('month'); }); await wait(p,1000); await clean(p); await shot(p,'m_monthly');
  await ev(p,()=>switchTab('meet')); await wait(p,1500); await clean(p); await shot(p,'m_minutes');
  await ev(p,()=>switchTab('kpi')); await wait(p,3000); await clean(p); await shot(p,'m_kpi');
  await ev(p,()=>{ switchTab('calendar'); C10.pics=[]; c10View('week'); }); await wait(p,900); await clean(p); await shot(p,'m_work_cal');
  await p.context().close();
  p=await newPage(b,MOBP); await openCal(p,[2026,9,1],'month'); await shot(p,'m_mmh_cal');
  await ev(p,()=>MC.open('training:S20261014-01')); await wait(p,1300); await shot(p,'m_training');
  await p.context().close();
  p=await newPage(b,MOBP); await openCal(p,[2026,9,1],'month'); await ev(p,()=>MC.create('trip','2026-10-27')); await p.waitForSelector('#tp-purpose',{timeout:8000}).catch(()=>{}); await wait(p,600); await shot(p,'m_trip_propose');
  await p.context().close();
  p=await newPage(b,{mobile:true,pic:'Nguyen Ha',tfa:true}); await wait(p,1500);
  await ev(p,()=>{ var o=JSON.parse(localStorage.getItem('mmh_tk')); o.user.level='director'; localStorage.setItem('mmh_tk',JSON.stringify(o)); });
  await wait(p,2500); await ev(p,()=>{ var o=document.getElementById('tfa-ov'); if(o) o.remove(); TFA.open(); }); await p.waitForSelector('.tfa-it').catch(()=>{}); await wait(p,600); await shot(p,'m_trip_approve');
  await p.context().close();
  p=await newPage(b,{mobile:true,pic:'Thuong'}); await ev(p,()=>AT.open('byme')); await wait(p,900); await shot(p,'m_assign_track'); await p.context().close();
};
/* ═══════════ 11. CHẾ ĐỘ TEST ═══════════ */
const TFO=(mobile,role)=>({mobile,pic:'Giang',tk:'mmh.product',admin:true,tfa:role==='dir',ls:{mmh_test_rh:JSON.stringify({on:1,scope:'marketing',role:role||'staff',at:Date.now()})}});
async function tfRun(p){
  await ev(p,()=>apiPost({action:'addKey',keyTask:'TEST — chuẩn bị hội thảo nha khoa',pic:'Vinh',status:'To Do',start:'2026-10-07',planned:'2026-10-10'})); await wait(p,900);
  await ev(p,()=>apiPost({action:'tripPropose',trip:JSON.stringify({destination:'Da Nang',startDate:'2026-10-24',finishDate:'2026-10-25',purpose:'TEST — thử luồng công tác'}),rid:'t1'})); await wait(p,900);
  await ev(p,()=>apiPost({action:'weeklyReport',from:'2026-10-05',to:'2026-10-11',rid:'w1'})); await wait(p,900);
  await ev(p,()=>{ var t=document.getElementById('tf-ts'); if(t) t.innerHTML=''; });
}
async function tfPanel(p){ await ev(p,()=>TESTFLOW.open()); await wait(p,600); await ev(p,()=>{ var s=document.querySelector('#tf-pn .tf-sc'),h=s&&s.querySelector('.tf-tl'); if(h) s.scrollTop=h.offsetTop-10; }); await wait(p,300); }
S.testmode=async b=>{
  let p=await newPage(b,{pic:'Giang',tk:'mmh.product',admin:true}); await wait(p,800); await ev(p,()=>TESTFLOW.pick()); await wait(p,600); await shot(p,'test_pick'); await p.context().close();
  p=await newPage(b,{mobile:true,pic:'Giang',tk:'mmh.product',admin:true}); await wait(p,800); await ev(p,()=>TESTFLOW.pick()); await wait(p,600); await shot(p,'m_test_pick'); await p.context().close();
  p=await newPage(b,TFO(false)); await tfRun(p); await tfPanel(p); await shot(p,'test_flow'); await p.context().close();
  p=await newPage(b,TFO(true)); await tfRun(p); await tfPanel(p); await shot(p,'m_test_flow'); await p.context().close();
  p=await newPage(b,TFO(false,'dir')); await wait(p,1500); await ev(p,()=>{ var o=document.getElementById('tfa-ov'); if(o) o.remove(); TFA.open(); }); await wait(p,1500);
  await ev(p,()=>{ var c=document.querySelector('#tfa-ov [data-ck="612"]'); if(c){ c.click(); c.scrollIntoView({block:'center'}); } }); await wait(p,400); await shot(p,'test_tfa'); await p.context().close();
  p=await newPage(b,TFO(true,'dir')); await wait(p,1500); await ev(p,()=>{ var o=document.getElementById('tfa-ov'); if(o) o.remove(); TFA.open(); }); await wait(p,1500);
  await ev(p,()=>{ var c=document.querySelector('#tfa-ov [data-ck="612"]'); if(c){ c.click(); c.scrollIntoView({block:'center'}); } }); await wait(p,400); await shot(p,'m_test_tfa'); await p.context().close();
};
module.exports={S,newPage,shot,ev};
if(require.main===module)(async()=>{
  const b=await chromium.launch({args:['--lang=vi-VN']});
  for(const k of Object.keys(S)){ if(ONLY.length && !ONLY.includes(k)) continue; try{ await S[k](b); }catch(e){ console.log('ERR',k,e.message.split('\n')[0]); } }
  await b.close();
  console.log('produced',PRODUCED.length);
})();
