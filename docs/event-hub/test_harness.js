const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const PLANS=JSON.parse(fs.readFileSync('plans.json','utf8'));
// ── bảng tính giả lập
function mkSheet(name){ const rows=[]; const sh={name,rows,hidden:false,
  getName:()=>name, getLastRow(){let m=0;rows.forEach((r,i)=>{ if(r&&r.some(v=>v!==''&&v!=null)) m=i+1;});return m;},
  getLastColumn(){let m=0;rows.forEach(r=>{ if(r){ for(let j=r.length-1;j>=0;j--){ if(r[j]!==''&&r[j]!=null){ m=Math.max(m,j+1);break;}}}});return m;},
  getRange(r,c,nr=1,nc=1){ return mkRange(sh,r,c,nr,nc); }, setFrozenRows(){}, hideSheet(){sh.hidden=true;},
  deleteRow(r){ rows.splice(r-1,1); } };
  return sh; }
function mkRange(sh,r,c,nr,nc){ const g=()=>{const o=[];for(let i=0;i<nr;i++){const row=sh.rows[r-1+i]||[];const x=[];for(let j=0;j<nc;j++){const v=row[c-1+j];x.push(v==null?'':v);}o.push(x);}return o;};
  const self={ getValues:g, getDisplayValues:()=>g().map(r=>r.map(v=>String(v))),
    setValues(v){ v.forEach((row,i)=>{ const R=sh.rows[r-1+i]||(sh.rows[r-1+i]=[]); row.forEach((x,j)=>{ R[c-1+j]=x; }); }); return self; },
    clearContent(){ for(let i=0;i<nr;i++){ const R=sh.rows[r-1+i]; if(R) for(let j=0;j<nc;j++) R[c-1+j]=''; } return self; },
    setFontWeight(){return self;}, setBackground(){return self;}, setFontColor(){return self;}, getMergedRanges:()=>sh.merges||[] };
  return self; }
function mkBook(id,name){ const sheets=[mkSheet('Sheet1')]; const b={ id, getId:()=>id, getUrl:()=>'https://docs/'+id, getName:()=>name,
  getSheetByName:n=>sheets.find(s=>s.name===n)||null, getSheets:()=>sheets, insertSheet(n){const s=mkSheet(n);sheets.push(s);return s;},
  deleteSheet(s){ sheets.splice(sheets.indexOf(s),1); } }; return b; }
const BOOKS={};
PLANS.forEach(p=>{ const b=mkBook(p.id,p.name); b.getSheets().length=0; p.sheets.forEach(s=>{ const sh=mkSheet(s.name); s.grid.forEach((r,i)=>sh.rows[i]=r.slice());
  sh.merges=s.merges.map(m=>({getRow:()=>m[0],getColumn:()=>m[1],getLastRow:()=>m[2],getLastColumn:()=>m[3]})); b.getSheets().push(sh); }); BOOKS[p.id]=b; });
let created=null;
const SpreadsheetApp={ create(n){ created=mkBook('BOOK1',n); BOOKS.BOOK1=created; return created; }, openById(id){ if(!BOOKS[id]) throw new Error('no book '+id); return BOOKS[id]; }, flush(){} };
// ── Drive giả lập
const FOLDERS={}; let fseq=0;
function mkFolder(id,name){ const f={id,name,files:[],folders:[], getId:()=>id, getUrl:()=>'https://drive/'+id, getName:()=>name,
  getFilesByType:(mt)=>iter(f.files.filter(x=>x.mime===mt)), getFolders:()=>iter(f.folders), getFoldersByName:(n)=>iter(f.folders.filter(x=>x.name===n)),
  createFolder(n){ const c=mkFolder('FO'+(++fseq),n); f.folders.push(c); return c; },
  createFile(blob){ const x={id:'DF'+(++fseq),name:blob.name,mime:blob.mime, getId(){return this.id;}, getUrl(){return 'https://drive/file/'+this.id;}, setTrashed(){} }; f.files.push(x); return x; } };
  FOLDERS[id]=f; return f; }
function iter(a){ let i=0; return { hasNext:()=>i<a.length, next:()=>a[i++] }; }
const ROOT=mkFolder('1maHn2DD34aJBaNnH4q9Di0YH2wMurYuZ','Event FY68');
PLANS.forEach(p=>ROOT.files.push({ id:p.id, mime:'SHEETS', getId:()=>p.id, getName:()=>p.name, getUrl:()=>'https://docs/'+p.id, getLastUpdated:()=>new Date('2026-10-30T10:00:00Z') }));
const DriveApp={ getFolderById:id=>{ if(!FOLDERS[id]) throw new Error('no folder'); return FOLDERS[id]; }, getFileById:id=>({ moveTo(){}, setTrashed(){} }) };
const props={}; const cache={};
const ctx={ console, Date, JSON, Math, String, Object, Number, RegExp, Array,
  SpreadsheetApp, DriveApp, MimeType:{GOOGLE_SHEETS:'SHEETS',MICROSOFT_EXCEL:'XLSX'},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v;}})},
  CacheService:{getScriptCache:()=>({get:k=>cache[k]||null,put:(k,v)=>{cache[k]=v;},remove:k=>{delete cache[k];}})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  Utilities:{ formatDate:(d,tz,f)=>{const p=x=>String(x).padStart(2,'0'); const s=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); return f.indexOf('HH')>=0? s+'T'+p(d.getHours())+':'+p(d.getMinutes())+':00' : s;},
    getUuid:()=>crypto.randomUUID(), base64Decode:b=>Buffer.from(b,'base64'), newBlob:(d,m,n)=>({mime:m,name:n}) },
  Logger:{log:console.log}, TF:{MASTER_ID:'MASTER'}, RPL_CAL:{VN:{'2026':{off:['09-02']}}},
  ridGet:()=>null, ridPut:()=>{} };
vm.createContext(ctx);
const B='/home/user/mmh-backend/backends/marketing/';
vm.runInContext(fs.readFileSync(B+'Event_Sync.gs','utf8'),ctx);
vm.runInContext(fs.readFileSync(B+'MKT_EventHub.gs','utf8'),ctx);
// danh tính + sự kiện file Offline
const WHO={ 'tk-giang':{local:'giang',pic:'Giang',level:'admin',admin:true}, 'tk-ducanh':{local:'ducanh',pic:'Duc Anh',level:'staff',admin:false} };
ctx.tfWho_=p=>WHO[p.tk]||{err:'Cần đăng nhập'};
ctx.evsReadEvents_=()=>[
 {src:'P',name:'Hội nghị RHM ĐH Y Hà Nội',nk:'hoinghirhmdhyhanoi',start:'2026-11-09',end:'2026-11-11',type:'Exhibition',place:'Hà Nội',plan:'',action:'',form:''},
 {src:'P',name:'Webinar Composite tháng 12',nk:'webinarcompositethang12',start:'2026-12-03',end:'2026-12-03',type:'Webinar',place:'Online',plan:'',action:'',form:'Webinar',product:'Composite'},
 {src:'R',name:'Sự kiện tháng 9',nk:'sukienthang9',start:'2026-09-20',end:'2026-09-20',type:'Seminar',place:'HCM',plan:'',action:'As planned',form:''} ];
const run=c=>vm.runInContext(c,ctx);
let r=run('ehSync_({})'); console.log('SYNC1', r.message||r.error);
r=run('ehSync_({})'); console.log('SYNC2', r.message||r.error);
const boot=run('ehBoot_({tk:"tk-giang"})');
console.log('boot ok',boot.ok,'events',boot.events.length,'tasks',boot.tasks.length,'plan',Object.keys(boot.plan).length,'me',JSON.stringify(boot.me));
boot.events.forEach(e=>console.log(' ',e.id,e.start,e.type,e.city,'|',String(e.name).slice(0,40),'|',e.src,e.follow,e.state,e.dateWarn?'WARN':'' ,'|',e.products));
const ev=boot.events.find(e=>e.type==='Workshop'); const tks=boot.tasks.filter(t=>t.eventId===ev.id);
console.log('workshop tasks',tks.length, tks.filter(t=>!t.parentId).map(t=>t.title).join(' | '));
console.log(' sample', tks.slice(0,4).map(t=>[t.title,t.due,t.status,t.proof,t.parentId?'sub':'BIG'].join(' / ')).join('\n  '));
// ghi: đặt đội + giao việc + Xong cần bằng chứng
const design=tks.find(t=>t.role==='Design'&&t.parentId&&t.proof==='file'&&t.status!=='Bỏ qua');
console.log('team', JSON.stringify(run(`ehSave_({tk:'tk-giang',op:'event.update',data:{id:'${ev.id}',Design:'Duc Anh',Owner:'Giang'}})`).tasks.length));
console.log('dup→done (no proof):', JSON.stringify(run(`ehSave_({tk:'tk-ducanh',op:'task.update',data:{id:'${design.id}',status:'Xong'}})`)));
console.log('upload:', JSON.stringify(run(`ehUpload_({tk:'tk-ducanh',eventId:'${ev.id}',taskId:'${design.id}',name:'KV.pdf',mime:'application/pdf',data:'JVBERi0xLjQK'})`).ok));
console.log('done:', JSON.stringify(run(`ehSave_({tk:'tk-ducanh',op:'task.update',data:{id:'${design.id}',status:'Xong',due:'2026-11-01'}})`).task.status));
console.log('perm:', JSON.stringify(run(`ehSave_({tk:'tk-ducanh',op:'task.delete',data:{id:'${design.id}'}})`).error));
const fb=tks.find(t=>t.proof==='link'&&t.role==='Digital'&&t.status!=='Bỏ qua');
console.log('link:', run(`ehSave_({tk:'tk-giang',op:'link.add',data:{eventId:'${ev.id}',taskId:'${fb.id}',url:'https://www.facebook.com/mani/posts/1'}})`).file.name);
console.log('add sub:', run(`ehSave_({tk:'tk-giang',op:'task.add',data:{eventId:'${ev.id}',parentId:'${design.parentId}',title:'Banner Zalo',pic:'Duc Anh',due:'2026-11-05',proof:'file',id:'tmp-1'}})`).task.title);
const b2=run('ehBoot_({tk:"tk-ducanh"})'); console.log('boot2 files',b2.files.length,'log',b2.log.length, 'me',JSON.stringify(b2.me));
const T=created.getSheetByName('EVENTS'); console.log('tabs:', created.getSheets().map(s=>s.name).join(', '));
console.log('src:', JSON.stringify(created.getSheetByName('NGUỒN FILE').rows.slice(1).map(r=>[r[1].slice(0,22),r[6],r[8]])));
fs.writeFileSync('boot.json', JSON.stringify(b2));
