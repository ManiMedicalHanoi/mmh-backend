const fs=require('fs'),vm=require('vm');
const T=JSON.parse(fs.readFileSync('tpl.json','utf8'));
function mkSheet(name,g){
  const cells=new Map(); // "r,c" -> value (string formula or value)
  for(const k in g){ let v=g[k]; if(v&&v.d){const [y,m,d]=v.d.split('-').map(Number);v=new Date(y,m-1,d);} cells.set(k,v); }
  const sh={name,cells,
    getLastRow(){let m=0;for(const k of cells.keys()){const r=+k.split(',')[0]; const v=cells.get(k); if(v!==''&&v!=null&&r>m)m=r;}return m;},
    getRange(r,c,nr=1,nc=1){return mkRange(sh,r,c,nr,nc);},
    insertRowsBefore(r,n){const nm=new Map();for(const [k,v] of cells){let [rr,cc]=k.split(',').map(Number);if(rr>=r){ if(typeof v==='string'&&v[0]==='=') v=shiftF(v,r,n); nm.set((rr+n)+','+cc,v);} else { if(typeof v==='string'&&v[0]==='=') v=shiftF(v,r,n); nm.set(k,v);} } cells.clear();for(const [k,v] of nm)cells.set(k,v);},
    deleteRows(r,n){const nm=new Map();for(const [k,v] of cells){let [rr,cc]=k.split(',').map(Number);if(rr>=r&&rr<r+n)continue;let vv=v; if(typeof vv==='string'&&vv[0]==='=') vv=shiftF(vv,r+n,-n); nm.set((rr>=r+n?rr-n:rr)+','+cc,vv);}cells.clear();for(const [k,v] of nm)cells.set(k,v);}
  };
  return sh;
}
// dời số dòng trong tham chiếu cùng tab (A1 tương đối ≥ r) — đơn giản: chỉ tham chiếu không có '!' và không có $ trước số dòng
function shiftF(f,r,n){ return f.replace(/(^|[^A-Za-z!$'])(\$?[A-Z]{1,2})(\d+)\b/g,(m,p,col,row)=>{row=+row; if(col.includes('$')&&false)return m; return p+col+(row>=r?row+n:row);}); }
function mkRange(sh,r,c,nr,nc){
  const get=(f)=>{const out=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++){let v=sh.cells.get((r+i)+','+(c+j));const isF=typeof v==='string'&&v[0]==='=';row.push(f?(isF?v:''):(isF?'':(v==null?'':v)));}out.push(row);}return out;};
  return {getValues(){return get(false);},getFormulas(){return get(true);},
    setValues(v){v.forEach((row,i)=>row.forEach((x,j)=>sh.cells.set((r+i)+','+(c+j),x)));},
    setFormulas(v){this.setValues(v);}, setValue(x){sh.cells.set(r+','+c,x);}, getValue(){const v=sh.cells.get(r+','+c);return v==null?'':v;}, setNotes(){}, getSheet:()=>sh, getRow:()=>r, getColumn:()=>c, getNumRows:()=>nr, getNumColumns:()=>nc,
    clearContent(){for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)sh.cells.delete((r+i)+','+(c+j));}};
}
const sheets={};for(const n in T)sheets[n]=mkSheet(n,T[n]);
const ss={getId:()=>'FILE1',getSheetByName:n=>sheets[n]||null};for(const n in sheets)sheets[n].getParent=()=>ss,sheets[n].getName=()=>n;
const props={};
const ctx={console,Date,JSON,Math,String,Object,Number,RegExp,
  SpreadsheetApp:{openById:()=>ss,flush(){}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=v;}})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  CacheService:{getScriptCache:()=>({get:()=>null,put(){}})},
  Utilities:{formatDate:(d,tz,f)=>{const p=x=>String(x).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}},
  Logger:{log:console.log}, ScriptApp:{getProjectTriggers:()=>[],newTrigger:()=>({forSpreadsheet:()=>({onEdit:()=>({create(){}})})})}, Session:{getActiveUser:()=>({getEmail:()=>'owner@x'})}};
vm.createContext(ctx);
const B='/home/user/mmh-backend/backends/marketing/';
vm.runInContext(fs.readFileSync(B+'Event_Sync.gs','utf8'),ctx);
vm.runInContext(fs.readFileSync(B+'MKT_EventPlan.gs','utf8'),ctx);
vm.runInContext("EP.ID='FILE1';",ctx);
let EV=[
 {src:'P',name:'Hội thảo Nội nha Hà Nội',nk:'',start:'2026-11-14',end:'2026-11-14',type:'Workshop',place:'Hà Nội',kol:'BS X',plan:'Confirmed',action:'',form:'',ym:'202611'},
 {src:'P',name:'Webinar Composite tháng 12',nk:'',start:'2026-12-03',end:'2026-12-03',type:'Webinar',place:'Online',kol:'BS Y',plan:'',action:'',form:'Webinar',ym:'202612'},
 {src:'P',name:'Hội thảo Đà Nẵng',nk:'',start:'2026-12-12',end:'2026-12-13',type:'Seminar',place:'Đà Nẵng',kol:'',plan:'',action:'',form:'',ym:'202612'},
 {src:'R',name:'Sự kiện đã qua',nk:'',start:'2026-10-10',end:'2026-10-10',type:'Seminar',place:'HCM',kol:'',plan:'',action:'As planned',form:'',ym:'202610'},
 {src:'P',name:'Sự kiện tháng 2 chưa có ngày',nk:'',start:'2027-02-01',end:'2027-02-28',approx:true,type:'Seminar',place:'HN',kol:'',plan:'',action:'',form:'',ym:'202702'},
];
const fix=()=>EV.forEach(e=>e.nk=vm.runInContext('evsNorm_',ctx)(e.name));
fix(); ctx.evsReadEvents_=()=>EV.map(e=>Object.assign({},e));
const run=()=>{const r=vm.runInContext('epSync({})',ctx);console.log(r.message||r.error);};
run();
// lần 2: đổi tên 1 sự kiện (cùng ngày), dời ngày 1 sự kiện, thêm 1 sự kiện mới chen giữa
EV[0].name='Hội thảo Nội nha Hà Nội (đổi tên)'; EV[2].start='2026-12-19'; EV[2].end='2026-12-20';
EV.push({src:'P',name:'Workshop chen giữa',nk:'',start:'2026-11-25',end:'2026-11-25',type:'Workshop',place:'Hải Phòng',kol:'',plan:'',action:'',form:'',ym:'202611'});
EV[4].start='2027-02-20';EV[4].end='2027-02-20';EV[4].approx=false;
fix(); run();
// đổi đội: Digital của sự kiện Đà Nẵng ⇒ 'Lan', Owner giao tay 1 việc Digital của sự kiện đó cho 'Huy'
const ev=sheets['Sự kiện'], tk=sheets['Giao việc'];
let rD=0; for(let r=5;r<20;r++){ if(String(ev.cells.get(r+',2')||'').includes('Đà Nẵng')) rD=r; }
ev.cells.set(rD+',11','Owner A'); ev.cells.set(rD+',12','Lan');
const kD=ev.cells.get(rD+',1'); let manual=0, digi=[];
for(let r=5;r<400;r++){ if(tk.cells.get(r+',15')===kD && tk.cells.get(r+',6')==='Digital MKT'){ digi.push(r);} }
manual=digi[0]; tk.cells.set(manual+',7','Huy');
run();
console.log('Digital rows', digi.map(r=>tk.cells.get(r+',7')+'/'+tk.cells.get(r+',21')).join(', '));
console.log('Owner rows', [...Array(400).keys()].filter(r=>tk.cells.get(r+',15')===kD && tk.cells.get(r+',6')==='MKT Leader').map(r=>tk.cells.get(r+',7')).join(', '));
// onEdit: đặt Xong
const r1=digi[1]; tk.cells.set(r1+',10','Xong');
vm.runInContext('epOnEdit',ctx)({range:tk.getRange(r1,10,1,1),user:{getEmail:()=>'lan@mmh'}});
console.log('onEdit', tk.cells.get(r1+',11'), tk.cells.get(r1+',14'));
console.log('Điều phối B3:', sheets['Điều phối'].cells.get('3,2'));
const lg=sheets['Nhật ký']; console.log('Nhật ký rows còn:', [...lg.cells.keys()].filter(k=>+k.split(',')[0]>=5 && k.endsWith(',2')).length);
run();
const dump={};for(const n of ['Sự kiện','Giao việc','Cài đặt','Nhật ký','Điều phối']){const g={};for(const [k,v] of sheets[n].cells){g[k]=v instanceof Date?{d:v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0')}:v;}dump[n]=g;}
fs.writeFileSync('after.json',JSON.stringify(dump));
{const ev=sheets['Sự kiện'];for(let r=5;r<13;r++)console.log(r,ev.getRange(r,1,1,16).getValues()[0].map(v=>v instanceof Date?v.toISOString().slice(0,10):v).join(' | '));
}console.log(props.EP_GEN_FILE1);
