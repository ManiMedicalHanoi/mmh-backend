const fs=require('fs'); const X=require('./mock_ext');
const D=JSON.parse(fs.readFileSync(__dirname+'/data.json','utf8'));
const ROSTER_NAMES={Giang:'mmh.product',Thuong:'mmh.marketing',Tuyen:'mmh.sales','Minh Trang':'mmh.admin',Khang:'mmh.saigon2','Viet Ha':'mmh.surgical',Vinh:'mmh.dental2',Phuong:'mmh.dental3',Viet:'mmh.dental','Duc Anh':'mmh.design','Bui Trang':'mmh.oem'};
const SESS=[
 {sid:'S20260925-01',date:'2026-09-25',timeFrom:'14:00',timeTo:'16:00',topic:'Ophthalmic Suture & Knife — kiến thức sản phẩm',trainer:'Giang',audience:'MMH - Surgical Sales team',status:'Done',type:'Internal',category:'Product',invited:true,canEdit:true,location:'Phòng họp tầng 5',folderUrl:'https://drive.google.com/drive/folders/demo1'},
 {sid:'S20261003-01',date:'2026-10-03',timeFrom:'09:00',timeTo:'10:30',topic:'Dia-burs IPR-01EF — case lâm sàng & USP',trainer:'Giang',audience:'MMH - Dental Sales team',status:'Done',type:'Internal',category:'Product',invited:true,canEdit:true,location:'Online · Google Meet',folderUrl:'https://drive.google.com/drive/folders/demo2'},
 {sid:'S20261008-01',date:'2026-10-08',timeFrom:'15:00',timeTo:'16:00',topic:'Quy trình đề xuất & báo cáo công tác trên Report Hub',trainer:'Thuong',audience:'MMH - Sales & Marketing',status:'Plan',type:'Internal',category:'SOP',invited:true,canEdit:false,location:'Phòng họp tầng 5',folderUrl:'https://drive.google.com/drive/folders/demo3'},
 {sid:'S20261014-01',date:'2026-10-14',timeFrom:'09:00',timeTo:'10:30',topic:'Mani Dental product — Key SKUs FY68',trainer:'Giang',audience:'MMH - Sales team',status:'Plan',type:'Internal',category:'Product',invited:false,canEdit:true,location:'Phòng họp tầng 5'},
 {sid:'S20261022-01',date:'2026-10-22',timeFrom:'14:00',timeTo:'15:30',topic:'Jizai — kỹ thuật nội nha cơ bản cho Sales',trainer:'Viet',audience:'MMH - Dental Sales team',status:'Plan',type:'Internal',category:'Product',invited:true,canEdit:false,location:'Lab Kim · Hà Nội',folderUrl:'https://drive.google.com/drive/folders/demo4'},
];
const FILES={
 'S20260925-01':[['Ophthalmic Suture — Product Guide FY68.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','6.8 MB'],['Ophthalmic Knife — Catalogue.pdf','application/pdf','3.1 MB'],['Bài kiểm tra sau đào tạo','application/vnd.google-apps.form',''],['Ghi chú buổi học','application/vnd.google-apps.document','']],
 'S20261008-01':[['Hướng dẫn Business Trip trên Report Hub.pdf','application/pdf','2.4 MB'],['Mẫu báo cáo công tác','application/vnd.google-apps.document','']],
 'S20261022-01':[['Jizai — Endo basics.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation','12.6 MB']],
};
function mats(sid){ const f=(FILES[sid]||[]).map((x,i)=>({id:sid+'-'+i,name:x[0],mime:x[1],sizeText:x[2],url:'https://drive.google.com/file/d/'+sid+i+'/view',preview:'https://drive.google.com/file/d/'+sid+i+'/preview',download:'https://drive.google.com/uc?export=download&id='+sid+i}));
  return {ok:true,files:f,folderUrl:'https://drive.google.com/drive/folders/'+sid,canUpload:true}; }
const META={ok:true,me:{name:'Giang',email:'mmh.product@manimedicalhanoi.com',position:'Product Team Leader',canCreate:true},
  meta:{categories:['Product','SOP','Skill','Compliance'],types:['Internal','External'],trainers:['Giang','Thuong','Tuyen','Viet','Nguyen Ha'],locations:['Phòng họp tầng 5','Online · Google Meet','Lab Kim · Hà Nội']},
  groups:[{name:'MMH - Sales team',type:'group',count:9,emails:['a1','a2','a3','a4','a5','a6','a7','a8','a9'].map(x=>x+'@manimedicalhanoi.com')},{name:'MMH - Dental Sales team',type:'group',count:4,emails:[]},{name:'MMH - Surgical Sales team',type:'group',count:3,emails:[]},{name:'MMH - Marketing team',type:'group',count:5,emails:[]},{name:'MMH - Sales & Marketing',type:'group',count:14,emails:[]}],
  users:Object.keys(ROSTER_NAMES).map(n=>({name:n,email:ROSTER_NAMES[n]+'@manimedicalhanoi.com'}))};
function tripInfo(id){
  const t=D.trip.events.find(e=>String(e.row)===String(id)||String(e.id)===String(id))||D.trip.events.find(e=>e.pic==='Giang');
  return {ok:true,trip:{id:t.row,pic:t.pic,hubPic:t.pic,dest:t.destination,start:t.date,finish:t.endDate,days:t.days,co:t.coTraveler||'No',equip:t.equipment||'Laptop',purpose:t.purpose,expect:t.expected,schedule:t.schedule,
    estCost:'Vé máy bay: 4.200.000\nKhách sạn: 2.400.000\nDi chuyển & ăn uống: 1.850.000',total:t.costTotal,approval:t.status,approved:/approv/i.test(t.status),folder:t.folder,report:t.report||'',reportDate:t.reportDate||'',canReport:t.pic==='Giang'&&/approv/i.test(t.status),canEdit:false,canDelete:false}};
}
const KEY=[
 {no:'1',row:10,keyTask:'FY68 Product plan — Dental',pic:'Giang',status:'On going',type:'Plan',start:'2026-10-01',planned:'2026-10-31',progress:40,subs:[
   {no:'1.1',row:11,subTask:'Chốt danh mục Key SKUs Dental FY68',pic:'Giang',status:'On going',start:'2026-10-05',planned:'2026-10-07',progress:60},
   {no:'1.2',row:12,subTask:'Bảng giá & chính sách KM Q3',pic:'Giang',status:'Not started',start:'2026-10-08',planned:'2026-10-09'}]},
 {no:'2',row:20,keyTask:'Ophthalmic — tender FY68',pic:'Giang',status:'On going',type:'Tender',start:'2026-10-01',planned:'2026-10-20',subs:[
   {no:'2.1',row:21,subTask:'Hồ sơ thầu BV Mắt TW',pic:'Giang',status:'On going',start:'2026-10-06',planned:'2026-10-06'},
   {no:'2.2',row:22,subTask:'Review spec chỉ khâu với NPP I Care',pic:'Giang',status:'Not started',start:'2026-10-07',planned:'2026-10-08'}]},
 {no:'4',row:40,keyTask:'20261019 Dental Products_Seminar_Dr. Nguyen Thanh Dung, Dr. Hau_Ho Chi Minh',pic:'Thuong',status:'On going',type:'Event',start:'2026-10-01',planned:'2026-10-19',subs:[
   {no:'4.1',row:41,subTask:'Truyền thông: Agenda sự kiện',pic:'Minh Trang',status:'Not started',start:'2026-10-06',planned:'2026-10-08'},
   {no:'4.2',row:42,subTask:'Đặt phòng hội thảo',pic:'Thuong',status:'On going',start:'2026-10-05',planned:'2026-10-09'}]},
 {no:'3',row:30,keyTask:'Weekly report & meeting',pic:'Giang',status:'On going',type:'Routine',start:'2026-10-05',planned:'2026-10-09',subs:[
   {no:'3.1',row:31,subTask:'Weekly meeting Sales & Marketing',pic:'Giang',status:'Completed',start:'2026-10-05',planned:'2026-10-05'}]},
];
const ROSTER=require('./roster.json');
/* ★ v15.5 — giả lập Training Hub v3.12: việc được giao (rhAssign*) */
const ASSIGN=[{id:'A2610060901',createdAt:'2026-10-06 09:01',src:'marketing',no:'4.1',name:'Truyền thông: Agenda sự kiện',keyTask:'20261019 Dental Products_Seminar_Dr. Nguyen Thanh Dung, Dr. Hau_Ho Chi Minh',pic:'Minh Trang',assigner:'Thuong',start:'2026-10-06',due:'2026-10-08',seen:false,done:false},
  {id:'A2610020800',createdAt:'2026-10-02 08:00',src:'marketing',no:'2.2',name:'Review spec chỉ khâu với NPP I Care',keyTask:'Ophthalmic — tender FY68',pic:'Giang',assigner:'Tuyen',start:'2026-10-07',due:'2026-10-08',seen:true,done:false}];
/* ★ v16.3 — việc Giang đã giao (theo dõi + trao đổi) */
ASSIGN.push({id:'A2610050930',createdAt:'2026-10-05T09:30:00',src:'marketing',no:'1.1',name:'Viết bài giới thiệu Key SKUs',keyTask:'FY68 Product plan — Dental',pic:'Minh Trang',assigner:'Giang',start:'2026-10-05',due:'2026-10-10',seen:true,seenAt:'2026-10-06T09:41:00',done:false,via:'own',
    replies:[{by:'Minh Trang',at:'2026-10-06T10:05:00',text:'Em nhận việc ạ, thứ Sáu em gửi bản nháp để chị duyệt.'}]},
  {id:'A2610040800',createdAt:'2026-10-04T08:00:00',src:'marketing',no:'2.1',name:'Báo cáo thị trường Bạc Liêu',keyTask:'Ophthalmic — tender FY68',pic:'Khang',assigner:'Giang',start:'2026-10-04',due:'2026-10-07',seen:false,done:false,via:'system',replies:[]},
  {id:'A2610010800',createdAt:'2026-10-01T08:00:00',src:'marketing',no:'3.1',name:'Ảnh sự kiện Jizai',keyTask:'Weekly report & meeting',pic:'Thuong',assigner:'Giang',start:'2026-10-01',due:'2026-10-03',seen:true,seenAt:'2026-10-01T09:00:00',done:true,doneAt:'2026-10-03T16:20:00',via:'own',replies:[]});
const LOG=[];
/* ★ v15.5 — giả lập MMH Calendar Feed v3.2: danh mục chọn + ghi dữ liệu Marketing */
const MKOPT={
  offline:{type:['Seminar','Workshop','Exhibition','Presentation','Webinar'],prod:['Jizai','Composite','Dental Products','Acrylic','Dental Suture',"Bleach'N Shine",'Ophthalmic Suture','Ophthalmic knife','Ophthalmic Products'],
    seg:['Dental/MMG','Surgical/Eyeless'],place:['Hanoi','Hai Phong','Hue','Da Nang','Ho Chi Minh','Can Tho','Nghe An','Quang Ninh'],plan:['Fixed','Not yet fixed'],action:['As planned','Change schedule','Additional','Cancel']},
  event:{format:['Design post','Photo','Video','Reels','Album'],pillar:['Before event','At event','After event','Seasonal'],page:['Mani Dental','Mani Ophthalmic','Mani Thailand'],
    status:['Cancel','Phát sinh','Pending','On air đúng hạn','On air muộn','Chờ duyệt'],kol:['Dr. Lam Dai Phong','Dr. Nguyen Thanh Dung','Dr. Dinh Vu Hieu'],event:['20260927 Jizai_Seminar_Dr. Nguyet Anh, Dr. Phong_Ho Chi Minh','20261019 Dental Products_Seminar_Dr. Nguyen Thanh Dung, Dr. Hau_Ho Chi Minh','20261026-29 Jizai_Workshop_Contemporary Endodontics_Hanoi']},
  product:{ptype:['Burs','Composite','Endo','Dental Suture','Ophthalmic Knife','Ophthalmic Suture'],pillar:['Feature & Benefit','Promotion','Clinical case','How to use'],format:['Design post','Photo','Video','Reels'],
    reason:['New product','Clear stock','Push sales','Brand awareness'],page:['Mani Dental','Mani Ophthalmic'],status:['Cancel','Phát sinh','Pending','On air đúng hạn','On air muộn','Chờ duyệt']}
};
function ymdIso(s){ s=String(s||''); const m=s.match(/^(\d{4})(\d{2})(\d{2})(?:-(\d{2,4}))?/); if(!m) return ['','']; const a=m[1]+'-'+m[2]+'-'+m[3]; let b=a; if(m[4]) b=m[4].length===4?m[1]+'-'+m[4].slice(0,2)+'-'+m[4].slice(2):m[1]+'-'+m[2]+'-'+m[4]; return [a,b]; }
function mkWrite(body){
  const kind=body.kind, op=body.op, data=JSON.parse(body.data||'{}'), src=kind==='offline'?'off':'on', list=D[src].events;
  let row=+body.row||0, it=null;
  if(op==='add'){ row=Math.max(0,...list.filter(x=>kind==='offline'||x.kind===kind).map(x=>x.row))+1; it={kind:kind==='offline'?'offline':kind,row}; list.push(it); }
  else { it=list.find(x=>x.row===row&&(kind==='offline'||x.kind===kind)); if(!it) return {ok:false,error:'Không tìm thấy dòng '+row}; }
  if(op==='delete'){ D[src].events=list.filter(x=>x!==it); return {ok:true,op,kind,row,src:kind==='offline'?'offline':'online',data:D[src]}; }
  const M={offline:{type:'type',prod:'product',seg:'segment',place:'place',topic:'topic',kol:'kol',partner:'partner',plan:'planStatus',action:'actionStatus',tPart:'targetParticipant',tJizai:'targetJizai',tComp:'targetComposite',aSales:'actualSales',folder:'folder',review:'review'},
    event:{event:'event',ctype:'ctype',kol:'kol',format:'format',pillar:'pillar',page:'page',status:'status',plan:'planned',actual:'actual',link:'link',main:'main',note:'note'},
    product:{topic:'topic',ptype:'ptype',pillar:'pillar',format:'format',reason:'reason',page:'page',status:'status',plan:'planned',actual:'actual',link:'link',main:'main'}}[kind];
  Object.keys(data).forEach(k=>{ if(M[k]) it[M[k]]=data[k]; });
  if(data.month) it.month=data.month.slice(0,4)+'-'+data.month.slice(4);
  if(kind==='offline'){ if(data.date){ const [a,b]=ymdIso(data.date); it.date=a; it.endDate=b; } it.status=/cancel/i.test(it.actionStatus||'')?'Cancel':(/^fixed$/i.test(it.planStatus||'')?'Fixed':(it.planStatus||'Plan'));
    it.title=[it.product,it.type,it.kol,it.place].filter(Boolean).join('_'); it.fullName=(it.date||'').replace(/-/g,'')+' '+it.title; }
  else { it.date=it.actual||it.planned||''; it.design=/design/i.test(it.format||''); it.title=kind==='event'?((it.ctype?it.ctype+' · ':'')+(it.event||'').replace(/^\d{8}(?:\s*-\s*\d{2,4})?\s*/,'')):(it.topic||it.ptype); }
  return {ok:true,op,kind,row,src:kind==='offline'?'offline':'online',data:D[src]};
}

const RIDS={}, WLOG=[], TRIPS=[];
/* ★ v16.0 — giả lập đăng nhập email + mã 6 số (Training Hub v3.12). Mã đúng luôn là 123456. TKS ghi tham số tk của mọi lệnh gọi. */
const AUTH_USERS=Object.fromEntries(Object.entries(ROSTER_NAMES).map(([k,v])=>[v,k])), AUTHL=[], TKS=[];
AUTH_USERS['nt.ha']='Nguyen Ha';   /* Giám đốc (v17.4 duyệt công tác) */
/* ★ v16.2 — danh sách RH_Users giả lập cho trang phân quyền (email giả, không phải email thật) */
let _ADMU=null;
let TFP=null;
const ADMU=()=>_ADMU||(_ADMU=ROSTER.map((r,i)=>{ const local=ROSTER_NAMES[r.pic]||('mmh.'+r.pic.toLowerCase().replace(/\s+/g,''));
  return {local,email:local+'@mani.inc',pic:r.pic,level:r.level||'pic',admin:r.pic==='Giang',active:true,session:1,dept:'',title:'',perms:{},
    logins:i%5===4?0:3+i,lastLogin:i%5===4?'':new Date(Date.now()-(i%4)*86400000-3600000*(i%7)).toISOString(),lastEmail:''}; }));
Object.keys(ROSTER_NAMES).forEach(k=>{ AUTH_USERS[ROSTER_NAMES[k]]=k; });
async function install(page, o){
  o=o||{};
  const KK=JSON.parse(JSON.stringify(KEY.concat(X.EXTRA_MKT))); const STN={'On going':'In Progress','Not started':'To Do'}; KK.forEach(k=>{ if(X.TYPE_FIX[k.type]) k.type=X.TYPE_FIX[k.type]; if(STN[k.status]) k.status=STN[k.status]; (k.subs||[]).forEach(s=>{ if(STN[s.status]) s.status=STN[s.status]; }); }); let seq=50;   /* dữ liệu task có trạng thái: thêm / xoá / sửa được ghi nhớ như backend thật */
  const lag=o.lag||0; let staleCopy=null, staleUntil=0;
  const snap=()=>{ if(o.staleMs){ if(!staleCopy||Date.now()>staleUntil) staleCopy=JSON.parse(JSON.stringify(KK)); staleUntil=Date.now()+o.staleMs; } };   /* giả lập backend còn đệm dữ liệu cũ */
  let LOCKP=Promise.resolve();   /* như LockService: lệnh ghi xử lý lần lượt */
  const handle=async route=>{
    const req=route.request(); const u=new URL(req.url()); let a=u.searchParams.get('action'); const src=u.searchParams.get('src'); const cb=u.searchParams.get('callback');
    let body=null;
    if(req.method()==='POST'){ const pd=new URLSearchParams(req.postData()||''); a=pd.get('action')||a; try{ body=JSON.parse(pd.get('payload')||'{}'); }catch(_){ body={}; } }
    else { body=Object.fromEntries(u.searchParams.entries()); }
    let d={ok:true,events:[]};
    TKS.push([a||'',u.searchParams.get('tk')||'',req.method()]);
    const dep=(u.pathname.split('/')[3]||''), srcName=/^AKfycbzK/.test(dep)?'management':/^AKfycbxW/.test(dep)?'backoffice':'marketing';   /* 3 backend phòng ban */
    { const tkl=String((body&&body.tk)||u.searchParams.get('tk')||'').replace(/^mocktk\./,'');
      let ex=null;
      if(o.failAct && o.failAct[a]) ex={ok:false,error:o.failAct[a]};
      else if(a==='rhKpi') ex=X.kpiFor(tkl);
      else if(a==='rhKpiTotal') ex=X.kpiTotal();
      else if(a==='rhKpiMail') ex={ok:true,data:X.kpiMailData(body.pic,body.month)};
      else if(a==='rhKpiMailPreview') ex={ok:true,html:X.kscMailHtml(X.kpiMailData(body.pic,body.month),body)};
      else if(a==='rhKpiMailSend') ex={ok:true,msg:'Đã gửi email KPI T'+String(body.month).slice(4)+'/'+String(body.month).slice(0,4)+' tới '+body.to};
      else if(a==='mmList') ex={ok:true,list:srcName==='marketing'?X.MMLIST:[]};
      else if(a==='mmGet') ex={ok:true,rec:X.MMREC};
      else if(a==='mmSave') ex={ok:true,id:'MM20261007-1',message:'Đã lưu biên bản'};
      else if(a==='mmMail') ex={ok:true,message:'Đã gửi email biên bản họp'};
      else if(a==='myTasks'){ const L=srcName==='marketing'?KK:(srcName==='backoffice'?X.KEYS_BO:X.KEYS_MG), me=String(body.pic||'').toLowerCase(), out=[], today='2026-10-07';
        L.forEach(k=>(k.subs||[]).forEach(s=>{ if(String(s.pic).toLowerCase()!==me||/complet|cancel/i.test(s.status||'')) return; out.push({no:s.no,name:s.subTask,keyTask:k.keyTask,status:s.status,deadline:s.planned,progress:s.progress,overdue:String(s.planned)<today}); }));
        ex={ok:true,source:srcName,tasks:out}; }
      else if(a==='weeklyReport'||a==='sendWeeklyReport') ex={ok:true,message:'Đã gửi báo cáo tuần',sent:true};
      else if(a==='monthlyReport') ex={ok:true,message:'Đã gửi báo cáo tháng',sent:true};
      else if(a==='rhUpdSign') ex={ok:true,html:'<p style="margin:0">Best regards,<br><b>Giang</b><br>Product Team Leader · MANI Medical Hanoi</p>'};
      else if(a==='rhUpdMail') ex={ok:true,sent:18,to:['mmh.product@manimedicalhanoi.com'],linked:[]};
      else if(a==='refStatus') ex={ok:true,files:[]};
      else if(a==='activityLog') ex={ok:true,log:X.ACT[srcName]||[]};
      else if(a==='mailSend') ex={ok:true,message:'Đã gửi email'};
      if(ex){ TKS.push(['ext:'+a,srcName]); if(req.method()==='POST') return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(ex)});
        return route.fulfill({status:200,contentType:'application/javascript',body:(cb||'cb')+'('+JSON.stringify(ex)+');'}); } }
    if(srcName!=='marketing' && u.hostname==='script.google.com' && /^(boot|weekly|version)$/.test(a||'')){ const out={ok:true,source:srcName,picList:ROSTER,keyTasks:JSON.parse(JSON.stringify(srcName==='backoffice'?X.KEYS_BO:X.KEYS_MG)),monthly:X.MONTHLY[srcName],activityLog:X.ACT[srcName],typeOptions:[...new Set((srcName==='backoffice'?X.KEYS_BO:X.KEYS_MG).map(k=>k.type))]};
      return route.fulfill({status:200,contentType:'application/javascript',body:(cb||'cb')+'('+JSON.stringify(out)+');'}); }
    if(srcName!=='marketing' && /^(addKey|addSub|update|delete)/.test(a||'')){ WLOG.push(['wrongsrc',a,srcName]);
      return route.fulfill({status:200,contentType:'application/javascript',body:(cb||'cb')+'('+JSON.stringify({ok:false,error:'Không tìm thấy Key Task (backend '+srcName+')'})+');'}); }
    /* ⭐ v15.8: chống ghi trùng theo rid + giả lập sự cố: o.flaky={addKey:['drop','busy','lost',…]} (dùng lần lượt cho mỗi lần gọi) */
    const WR=/^(addKey|addSub|updateSub|updateKey|updateResult|updateProgress|updateStatus|deleteKey|deleteSub|deleteRow|tripPropose|addMonth|updateMonth)$/;
    if(WR.test(a||'') && body && body.rid && RIDS[body.rid]){ const r0=RIDS[body.rid]; const out={...r0,dedup:true}; if(o.dedupNoNo) delete out.no; WLOG.push(['dup',a,body.rid]);
      return route.fulfill({status:200,contentType:'application/javascript',body:(cb||'cb')+'('+JSON.stringify(out)+');'}); }
    const fl=(o.flaky&&o.flaky[a]&&o.flaky[a].length)?o.flaky[a].shift():null;
    if(fl==='busy'){ WLOG.push(['busy',a]); return route.fulfill({status:200,contentType:'application/javascript',body:(cb||'cb')+'('+JSON.stringify({ok:false,error:'Lock timeout: another process was holding the lock for too long.'})+');'}); }
    if(fl==='lost'){ WLOG.push(['lost',a]); return route.fulfill({status:500,contentType:'text/html',body:'<html>Error</html>'}); }
    if(src==='trip') d=D.trip; else if(src==='offline') d=D.off; else if(src==='online') d=D.on;
    else if(a==='calendar') d=D.trip;
    else if(a==='boot'||a==='weekly') d={ok:true,source:'marketing',picList:ROSTER,keyTasks:JSON.parse(JSON.stringify(o.staleMs&&Date.now()<staleUntil&&staleCopy?staleCopy:KK)),monthly:X.MONTHLY.marketing,activityLog:X.ACT.marketing,typeOptions:X.TYPES_MKT};
    else if(a==='addKey'){ if(lag) await new Promise(r=>setTimeout(r,lag)); snap(); const no=String(++seq); KK.push({no,row:+no*10,keyTask:body.keyTask,pic:body.pic,status:body.status||'To Do',type:body.type||'',start:body.start,planned:body.planned,subs:[]}); d={ok:true,no,row:+no*10,task:{}}; }
    else if(a==='deleteKey'){ if(lag) await new Promise(r=>setTimeout(r,lag)); snap(); const i=KK.findIndex(k=>k.no===String(body.no)); if(i>=0) KK.splice(i,1); d={ok:true}; }
    else if(a==='deleteSub'){ if(lag) await new Promise(r=>setTimeout(r,lag)); snap(); KK.forEach(k=>{ k.subs=(k.subs||[]).filter(x=>x.no!==String(body.no)); }); d={ok:true}; }
    else if(/^(updateSub|updateProgress)$/.test(a)){ KK.forEach(k=>(k.subs||[]).forEach(x=>{ if(x.no===String(body.no)){ if(body.status) x.status=body.status; if(body.progress!=null) x.progress=+body.progress; } })); d={ok:true}; }
    else if(a==='roster') d={ok:true,picList:ROSTER};
    else if(a==='rhAuthStart'){ const e=String(body.email||'').toLowerCase(), l=e.split('@')[0];
      if(!/^(mani\.inc|manimedicalhanoi\.com)$/.test(e.split('@')[1]||'')) d={ok:false,code:'EMAIL',error:'Chỉ dùng email công ty: @mani.inc hoặc @manimedicalhanoi.com.'};
      else if(!AUTH_USERS[l]) d={ok:false,code:'NOUSER',error:'Email này chưa được cấp quyền dùng Report Hub. Vui lòng liên hệ Admin (Giang – mmh.product).'};
      else { AUTHL.push(['start',e]); d={ok:true,sentTo:e,expiresIn:600,gap:45}; } }
    else if(a==='rhAuthVerify'){ const e=String(body.email||'').toLowerCase(), l=e.split('@')[0]; AUTHL.push(['verify',e,body.code]);
      d=body.code!=='123456'?{ok:false,code:'CODE',left:4,error:'Mã chưa đúng. Còn 4 lần thử.'}
        :{ok:true,token:'mocktk.'+l,exp:Date.now()+30*864e5,user:{email:e,local:l,pic:AUTH_USERS[l],level:'pic',admin:l==='mmh.product'}}; }
    else if(/^rhAdmin/.test(a)){ const l=String(body.tk||'').replace(/^mocktk\./,''), me=ADMU().find(x=>x.local===l);
      if(!me) d={ok:false,code:'AUTH',error:'Phiên đăng nhập không hợp lệ.'};
      else if(!(me.admin||/^(director|hod)$/.test(me.level))) d={ok:false,code:'FORBIDDEN',error:'Chỉ Admin, Director hoặc HOD được phân quyền.'};
      else if(a==='rhAdminList') d={ok:true,me,canTop:me.admin||me.level==='director',users:ADMU()};
      else if(a==='rhAdminSave'){ const u=JSON.parse(body.u||'{}'); AUTHL.push(['save',u]); const L=ADMU(); let x=L.find(y=>y.local===u.local);
        if(!x){ x={local:u.email.split('@')[0],session:1,logins:0,lastLogin:''}; L.push(x); }
        Object.assign(x,{email:u.email,local:u.email.split('@')[0],pic:u.pic,level:u.level,dept:u.dept,title:u.title,admin:u.admin,active:u.active,perms:u.perms});
        d={ok:true,message:'Đã lưu quyền của '+u.pic+'.',users:L}; }
      else if(a==='rhAdminKick'){ AUTHL.push(['kick',body.local]); const x=ADMU().find(y=>y.local===body.local); if(x) x.session++; d={ok:true,message:'Đã đăng xuất '+(x&&x.pic)+' khỏi mọi máy.',users:ADMU()}; } }
    else if(a==='rhAuthMe'){ const l=String(body.tk||'').replace(/^mocktk\./,''); AUTHL.push(['me',l]);
      const au=ADMU().find(x=>x.local===l);
      d=(o.revoked||!AUTH_USERS[l])?{ok:false,code:'AUTH',error:'Phiên đăng nhập đã bị đăng xuất từ xa.'}:{ok:true,user:{email:l+'@mani.inc',local:l,pic:AUTH_USERS[l],level:l==='nt.ha'?'director':((au&&au.level)||'pic'),admin:l==='mmh.product',perms:(o.perms)||(au&&au.perms)||{}}}; }
    else if(a==='rhMeta') d=META;
    else if(a==='rhSessions') d={ok:true,sessions:SESS.concat(o.extraSess||[]).map(x=>Object.assign({people:X.PEOPLE[x.sid]||[]},x))};
    else if(a==='rhMaterials') d=mats(body.sid||u.searchParams.get('sid'));
    else if(a==='rhMyChecks') d={ok:true,empty:o.noChecks?[]:[{sid:'S20261003-01',topic:'Dia-burs IPR-01EF — case lâm sàng & USP',date:'2026-10-03',due:'2026-10-04',overdue:true}]};
    else if(a==='rhSaveSession') d={ok:true,sid:'S20261014-01',message:'Đã tạo buổi đào tạo mới.'};
    else if(a==='rhPreviewInvite') d={ok:true,subject:'[MMH Training] Mani Dental product — Key SKUs FY68 · 14/10/2026',html:'<p>x</p>',recipients:['a']};
    else if(a==='rhSendInvite') d={ok:true,message:'Đã gửi thư mời tới 10 người',folderUrl:'https://drive.google.com/drive/folders/new'};
    else if(a==='addSub'){ if(lag) await new Promise(r=>setTimeout(r,lag)); snap(); const k=KK.find(x=>x.no===String(body.keyNo||body.parentNo)); const no=(k?k.no:'1')+'.'+((k&&k.subs?k.subs.length:0)+1+(++seq%1?0:0)); if(k){ k.subs=k.subs||[]; k.subs.push({no,row:+String(no).replace('.','')||99,subTask:body.name,pic:body.pic,status:body.status||'To Do',start:body.start,planned:body.planned}); d={ok:true,no,row:99,task:{}}; } else d={ok:false,error:'Không tìm thấy Key Task số '+(body.keyNo||'')}; }
    else if(a==='mmhOptions'){ if(lag) await new Promise(r=>setTimeout(r,lag)); d={ok:true,kind:body.kind,options:MKOPT[body.kind]||{}}; }
    else if(a==='mmhWrite'){ if(lag) await new Promise(r=>setTimeout(r,lag)); if(o.failWrite){ d={ok:false,error:'Không mở được file (giả lập lỗi)'}; } else { LOG.push(['mk',{op:body.op,kind:body.kind,row:body.row,check:body.check,actor:body.actor,data:JSON.parse(body.data||'{}')}]); d=mkWrite(body); } }
    else if(a==='rhAssignList'){ const me=(body.actor||'').toLowerCase(); d={ok:true,items:ASSIGN,mine:ASSIGN.filter(x=>x.pic.toLowerCase()===me&&!x.done),byMe:ASSIGN.filter(x=>x.assigner.toLowerCase()===me)}; }
    else if(a==='rhAssignReply'){ const x=ASSIGN.find(y=>y.id===body.id); LOG.push(['reply',body]); if(!x) d={ok:false,error:'Không tìm thấy'}; else { x.replies=(x.replies||[]).concat([{by:body.actor,at:new Date().toISOString(),text:body.text}]); d={ok:true,item:x}; } }
    else if(a==='rhDirectory'){ d=body.tk?{ok:true,people:Object.keys(ROSTER_NAMES).map(k=>({pic:k,email:ROSTER_NAMES[k]+'@mani.inc'}))}:{ok:false,code:'AUTH',error:'Chưa đăng nhập.'}; }
    else if(a==='rhAssignAdd'){ LOG.push(['add',body]); const id='A'+Date.now(); ASSIGN.push({id,createdAt:'2026-10-06 10:00',src:body.src,no:body.no,name:body.name,keyTask:body.keyTask,pic:body.pic,assigner:body.actor,start:body.start,due:body.due,seen:false,done:false}); d={ok:true,id}; }
    else if(a==='rhAssignSeen'){ LOG.push(['seen',body]); String(body.ids||'').split(',').forEach(id=>{ const x=ASSIGN.find(y=>y.id===id); if(x) x.seen=true; }); d={ok:true}; }
    else if(a==='rhAssignDone'){ LOG.push(['done',body]); const sent=[]; String(body.ids||'').split(',').forEach(id=>{ const x=ASSIGN.find(y=>y.id===id); if(x&&!x.done){ x.done=true; sent.push(id); } }); d={ok:true,sent}; }
    else if(a==='tripMaster') d={ok:true,to:'Nguyen Ha (Director)',cc:'Tuyen (HOD)',master:{destinations:['Ho Chi Minh','Da Nang','Nghe An','Can Tho','Hai Phong','Lao Cai','Dak Lak'],coTravelers:['Khang','Thuong','Tuyen','Viet Ha','Bui Trang'],equipment:['Laptop','Máy chiếu','Standee','Hàng mẫu']}};
    else if(a==='tripInfo') d=tripInfo(body.r||body.id);
    else if(a==='version'||a==='ping') d={ok:true};
    else if(a==='tfPending'){ const l=String(body.tk||'').replace(/^mocktk\./,''); const dir=l==='nt.ha'; TFP=TFP||[
        {row:605,no:'601',pic:'Thuong',start:'2026-10-18',finish:'2026-10-20',days:3,dest:'Ho Chi Minh',co:'Duc Anh',purpose:'Tổ chức sự kiện Dr. Hậu, Dr Dũng — HT nha Chu phục hình',expect:'40 bác sĩ tham dự',estCost:'Công tác phí: 1.140.000\nVé máy bay: 7.000.000\nKhách sạn: 3.000.000',total:11140000,schedule:'18/10: Di chuyển HN - HCM, set up sự kiện\n19/10: Tham gia sự kiện\n20/10: Di chuyển HCM - HN',equip:'Laptop',status:'Already sent propose email'},
        {row:606,no:'602',pic:'Vinh',start:'2026-10-22',finish:'2026-10-23',days:2,dest:'Hue',co:'No',purpose:'Thăm khách hàng phòng khám nha khoa',expect:'2 đơn hàng mới',estCost:'Công tác phí: 760.000\nXe khách: 600.000',total:1360000,schedule:'22/10: Huế\n23/10: Huế - Đà Nẵng',equip:'Hàng mẫu',status:'Already sent propose email'},
        {row:607,no:'603',pic:'Hau',start:'2026-10-27',finish:'2026-10-27',days:1,dest:'Hai Phong',co:'No',purpose:'Kiểm kê kho đại lý',expect:'Biên bản kiểm kê',estCost:'Công tác phí: 380.000',total:380000,schedule:'27/10: đi về trong ngày',equip:'Laptop',status:'Already sent propose email'}];
      d=(l==='nt.ha'||l==='mmh.product')?{ok:true,director:dir,items:TFP,count:TFP.length}:{ok:true,director:false,items:[],count:0}; }
    else if(a==='tfDecide'){ const its=JSON.parse(body.items||'[]'); LOG.push(['tf',its]); TFP=(TFP||[]).filter(x=>!its.some(y=>y.row===x.row)); d={ok:true,results:its.map(y=>({row:y.row,pic:y.pic,ok:true,status:y.decision==='reject'?'Rejected':'Approved',mailed:y.pic.toLowerCase()+'@mani.inc'}))}; }
    else if(a==='tripPropose'){ if(lag) await new Promise(r=>setTimeout(r,lag)); const t=JSON.parse(body.trip||'{}'); TRIPS.push(t); d={ok:true,message:'Đã ghi đề xuất & gửi email xin duyệt'}; }
    if(WR.test(a||'') && d && d.ok!==false){ if(body.rid) RIDS[body.rid]=d; WLOG.push(['ok',a,body.rid,body.no||body.keyNo||'',body.keyTask||body.name||'',u.pathname.split('/')[3]||'']); }
    /* ⭐ v17.7 — Chế độ TEST (testflow.js + MMH_TestMode.gs): tm=1 ⇒ kết quả kèm _tm (email lẽ ra gửi tới ai), tmInfo / tmClean */
    const tm=u.searchParams.get('tm')==='1'||(body&&String(body.tm)==='1');
    if(tm){ TMLOG.push([a,u.searchParams.get('tmAs')||(body&&body.tmAs)||'']);
      if(a==='tmInfo') d={ok:true,test:true,file:{name:{management:'Management Task Tracker',backoffice:'Back Office Task Tracker'}[srcName]||(/AKfycbwsX4/.test(dep)?'Training Master':'MKT Weekly & Monthly Report'),url:'https://docs.google.com/spreadsheets/d/mock'+srcName+'/edit'}};
      if(a==='tmClean') d={ok:true,rows:2,sheets:[{name:'WEEKYLY new',rows:2}],trip:1,folders:1,files:0,message:'Đã xoá 2 dòng TEST · 1 dòng Business Trip · 1 folder công tác'};
      if(a==='tfPending'){ const t={row:612,no:'608',pic:'TEST',start:'2026-10-24',finish:'2026-10-25',days:2,dest:'Da Nang',co:'No',purpose:'TEST — thử luồng đề xuất công tác',expect:'Kiểm tra email duyệt',estCost:'Công tác phí: 380.000',total:380000,schedule:'24/10: Hà Nội → Đà Nẵng',equip:'Laptop',status:'Already sent propose email',test:true};
        d={...d,director:true,testOnly:true,items:(d.items||[]).concat((TFP||[]).some(x=>x.row===612)?[]:[t])}; }
      if(d && typeof d==='object' && !Array.isArray(d)){ const ML={tripPropose:[{to:'director@example.com',cc:'hod@example.com',subject:'Approval Business trip - 24102026 - TEST'}],
          tfDecide:[{to:'admin@example.com',cc:'director@example.com',subject:'[Approved] Business trip - TEST - Da Nang'}],
          weeklyReport:[{to:'hod@example.com, leader@example.com',cc:'director@example.com',subject:'Weekly report — TEST'}],
          rhKpiMailSend:[{to:body&&body.to||'',cc:body&&body.cc||'',subject:body&&body.subject||'KPI'}]};
        d={...d,_tm:{on:true,admin:'admin@example.com',as:u.searchParams.get('tmAs')||'',mails:ML[a]||[]}}; } }
    if(fl==='drop'){ WLOG.push(['drop',a]); return route.fulfill({status:500,contentType:'text/html',body:'<html>Error</html>'}); }   /* đã ghi nhưng phản hồi hỏng */
    if(req.method()==='POST') return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(d)});
    return route.fulfill({status:200,contentType:'application/javascript',body:(cb||'cb')+'('+JSON.stringify(d)+');'});
  };
  await page.route(/script\.google\.com/, async route=>{
    const u=new URL(route.request().url()), a=u.searchParams.get('action')||'';
    if(!/^(add|update|delete|trip(Propose|Update|Report)|mmhWrite)/.test(a)) return handle(route);
    const prev=LOCKP; let rel; LOCKP=new Promise(r=>rel=r); await prev;
    try{ await handle(route); }catch(e){} finally{ rel(); }
  });
}
const TMLOG=[];
module.exports={TMLOG,install,D,SESS,ASSIGN,LOG,WLOG,TRIPS,RIDS,AUTHL,TKS,AUTH_USERS,ADMU};
