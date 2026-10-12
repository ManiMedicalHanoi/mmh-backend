/* Bổ sung backend giả lập cho bộ ảnh IFU (dữ liệu GIẢ, số GIẢ). Không sửa repo MMH-Report. */
const TYPES_MKT=['Product - Plan','Product - Tender','Product - Training','Marketing - Event','Marketing - Digital','Marketing - Design','Sales - Market','Management - Routine'];
const TYPE_FIX={'Plan':'Product - Plan','Tender':'Product - Tender','Event':'Marketing - Event','Routine':'Management - Routine'};
const sub=(no,row,subTask,pic,status,start,planned,extra)=>Object.assign({no,row,subTask,pic,status,start,planned},extra||{});
const EXTRA_MKT=[
 {no:'5',row:50,keyTask:'Mani Dental Fanpage — nội dung tháng 10',pic:'Minh Trang',status:'In Progress',type:'Marketing - Digital',start:'2026-10-01',planned:'2026-10-31',subs:[
   sub('5.1',51,'Bài case lâm sàng Jizai (Dr. demo)','Minh Trang','In Progress','2026-10-05','2026-10-08',{progress:50,result:'Bản nháp đã gửi duyệt — link Canva'}),
   sub('5.2',52,'Video Reels Dia-burs 30s','Duc Anh','To Do','2026-10-08','2026-10-10'),
   sub('5.3',53,'Báo cáo hiệu quả fanpage tháng 9','Minh Trang','Completed','2026-10-01','2026-10-03',{progress:100,result:'Reach 18.2K · 64 tin nhắn hỏi (số giả lập)'}),
   sub('5.4',54,'Lịch đăng bài tuần 3','Minh Trang','To Do','2026-10-12','2026-10-16')]},
 {no:'6',row:60,keyTask:'Surgical — khảo sát thị trường dao Phaco',pic:'Tuyen',status:'In Progress',type:'Sales - Market',start:'2026-09-28',planned:'2026-10-16',subs:[
   sub('6.1',61,'Gặp NPP miền Nam — lấy phản hồi giá','Khang','In Progress','2026-09-29','2026-10-03',{progress:70}),
   sub('6.2',62,'Tổng hợp giá đối thủ khu vực Bắc','Viet Ha','To Do','2026-10-09','2026-10-14'),
   sub('6.3',63,'Báo cáo tuần 1 — khảo sát BV tuyến tỉnh','Viet Ha','Completed','2026-09-28','2026-10-02',{progress:100,result:'Đã khảo sát 6 BV (dữ liệu giả lập)'})]},
 {no:'7',row:70,keyTask:'Design — POSM workshop Contemporary Endodontics',pic:'Duc Anh',status:'In Progress',type:'Marketing - Design',start:'2026-10-01',planned:'2026-10-20',subs:[
   sub('7.1',71,'Standee + backdrop sự kiện','Duc Anh','In Progress','2026-10-05','2026-10-12',{progress:40}),
   sub('7.2',72,'Thư mời điện tử','Duc Anh','Completed','2026-10-01','2026-10-04',{progress:100,result:'Đã gửi bản cuối cho Marketing'})]},
 {no:'8',row:80,keyTask:'Training — kiến thức sản phẩm cho Sales',pic:'Giang',status:'In Progress',type:'Product - Training',start:'2026-10-06',planned:'2026-10-20',subs:[
   sub('8.1',81,'Soạn slide Key SKUs FY68','Giang','In Progress','2026-10-06','2026-10-13',{progress:30}),
   sub('8.2',82,'Bài test sau đào tạo','Giang','To Do','2026-10-14','2026-10-15')]},
];
const KEYS_BO=[
 {no:'1',row:10,keyTask:'Nhập hàng lô tháng 10 (MANI Japan)',pic:'Dam Viet',status:'In Progress',type:'Purchasing - Import',start:'2026-10-01',planned:'2026-10-25',subs:[
   sub('1.1',11,'Đặt PO & xác nhận lịch giao','Dam Viet','Completed','2026-10-01','2026-10-03',{progress:100,result:'PO số demo-1026 đã xác nhận'}),
   sub('1.2',12,'Theo dõi thông quan','Ngoc','In Progress','2026-10-06','2026-10-10',{progress:50}),
   sub('1.3',13,'Nhập kho & đối chiếu số lượng','Hau','To Do','2026-10-12','2026-10-14')]},
 {no:'2',row:20,keyTask:'Kiểm kê kho quý 1 FY68',pic:'Dam Ha',status:'In Progress',type:'Stock - Inventory',start:'2026-10-05',planned:'2026-10-09',subs:[
   sub('2.1',21,'Kiểm kê kho Hà Nội','Hau','In Progress','2026-10-05','2026-10-07',{progress:60}),
   sub('2.2',22,'Đối chiếu tồn kho với kế toán','Mai','To Do','2026-10-08','2026-10-09')]},
 {no:'3',row:30,keyTask:'Báo cáo thuế & chứng từ tháng 9',pic:'Mai',status:'In Progress',type:'Accounting - Tax',start:'2026-10-01',planned:'2026-10-20',subs:[
   sub('3.1',31,'Tổng hợp chứng từ chi phí','Mai','In Progress','2026-10-01','2026-10-06',{progress:80}),
   sub('3.2',32,'Kê khai thuế GTGT','Ngoc','To Do','2026-10-14','2026-10-20')]},
];
const KEYS_MG=[
 {no:'1',row:10,keyTask:'FY68 Business plan — review quý 1',pic:'Nguyen Ha',status:'In Progress',type:'Strategy',start:'2026-10-01',planned:'2026-10-31',subs:[
   sub('1.1',11,'Họp review KPI tháng 9','Nguyen Ha','Completed','2026-10-05','2026-10-05',{progress:100,result:'Biên bản đã gửi các trưởng nhóm'}),
   sub('1.2',12,'Duyệt ngân sách Marketing Q1','Tuyen','In Progress','2026-10-06','2026-10-09',{progress:50}),
   sub('1.3',13,'Kế hoạch tuyển dụng Sales miền Nam','Nguyen Ha','To Do','2026-10-12','2026-10-16')]},
 {no:'2',row:20,keyTask:'Cải tiến quy trình Back-office',pic:'Hoa',status:'In Progress',type:'Process',start:'2026-10-01',planned:'2026-10-30',subs:[
   sub('2.1',21,'Chuẩn hoá quy trình duyệt chi phí','Hoa','In Progress','2026-10-02','2026-10-09',{progress:40})]},
];
const MONTHLY={
 marketing:[
  {row:5,no:'1',month:'202610',type:'Product - Plan',keyTask:'Key SKUs Dental FY68',text:'- Chốt danh mục 20 SKU chủ lực\n- Bảng giá & chính sách KM Q1\n- Đào tạo Sales trước 20/10',pic:'Giang'},
  {row:6,no:'2',month:'202610',type:'Marketing - Event',keyTask:'Seminar Dental Products — Ho Chi Minh 19/10',text:'- Mục tiêu 40 bác sĩ tham dự (số giả lập)\n- Truyền thông 2 tuần trước sự kiện',pic:'Thuong, Minh Trang'},
  {row:7,no:'3',month:'202610',type:'Marketing - Digital',keyTask:'Fanpage Mani Dental',text:'- 12 bài / tháng, 2 Reels\n- Tỉ lệ đăng đúng hạn ≥ 95%',pic:'Minh Trang'},
  {row:8,no:'4',month:'202610',type:'Sales - Market',keyTask:'Khảo sát thị trường dao Phaco',text:'- Gặp 3 NPP miền Nam, 6 BV tuyến tỉnh\n- Báo cáo giá đối thủ',pic:'Khang, Viet Ha'},
  {row:9,no:'5',month:'202609',type:'Product - Tender',keyTask:'Hồ sơ thầu Ophthalmic FY68',text:'- Nộp 3 hồ sơ thầu BV (giả lập)\n- Review spec chỉ khâu với NPP',pic:'Giang'},
  {row:10,no:'6',month:'202609',type:'Marketing - Design',keyTask:'POSM quý 1',text:'- Standee Jizai, catalogue Composite',pic:'Duc Anh'}],
 backoffice:[
  {row:5,no:'1',month:'202610',type:'Purchasing - Import',keyTask:'Nhập hàng tháng 10',text:'- 2 lô MANI Japan, 1 lô MMG',pic:'Dam Viet'},
  {row:6,no:'2',month:'202610',type:'Stock - Inventory',keyTask:'Kiểm kê quý 1',text:'- Kiểm kê kho HN, đối chiếu kế toán',pic:'Dam Ha, Hau'},
  {row:7,no:'3',month:'202610',type:'Accounting - Tax',keyTask:'Thuế tháng 9',text:'- Kê khai GTGT trước 20/10',pic:'Mai, Ngoc'}],
 management:[]
};
const ACT={
 marketing:[
  {ts:'2026-10-07 09:12:00',pic:'Minh Trang',type:'progress',detail:'cập nhật tiến độ 50% — "Bài case lâm sàng Jizai (Dr. demo)"',keyTask:'',subNo:'5.1'},
  {ts:'2026-10-07 08:55:00',pic:'Giang',type:'add',detail:'thêm sub-task "Soạn slide Key SKUs FY68"',keyTask:'Training — kiến thức sản phẩm cho Sales',subNo:'8.1'},
  {ts:'2026-10-06 17:40:00',pic:'Duc Anh',type:'complete',detail:'hoàn thành — "Thư mời điện tử"',keyTask:'',subNo:'7.2'},
  {ts:'2026-10-06 16:05:00',pic:'Thuong',type:'assign',detail:'giao/nhắc việc cho Minh Trang (1 việc)',keyTask:'',subNo:''},
  {ts:'2026-10-06 10:30:00',pic:'Khang',type:'update',detail:'cập nhật kết quả "Gặp NPP miền Nam — lấy phản hồi giá"',keyTask:'',subNo:'6.1'},
  {ts:'2026-10-05 15:20:00',pic:'Giang',type:'report',detail:'gửi báo cáo tuần 28/09–04/10',keyTask:'',subNo:''},
  {ts:'2026-10-05 09:00:00',pic:'Giang',type:'add',detail:'tạo Key Task mới',keyTask:'Weekly report & meeting',subNo:'3'}],
 backoffice:[{ts:'2026-10-07 08:30:00',pic:'Hau',type:'progress',detail:'cập nhật tiến độ 60% — "Kiểm kê kho Hà Nội"',keyTask:'',subNo:'2.1'}],
 management:[{ts:'2026-10-05 11:00:00',pic:'Nguyen Ha',type:'complete',detail:'hoàn thành — "Họp review KPI tháng 9"',keyTask:'',subNo:'1.1'}]
};
/* ── Biên bản họp (sheet MEETING LOG) ── */
const MMREC={id:'MM20260929-1',group:'Product',date:'2026-09-29',from:'2026-09-22',to:'2026-09-29',title:'Product Meeting 29092026',titleAuto:true,
  attendees:['Giang','Tuyen','Viet'],topics:['Product - Plan','Product - Tender'],notes:{'Product - Plan':{note:'Chốt khung danh mục Key SKUs',act:'Giang gửi bản nháp trước 06/10',keys:{}},'Product - Tender':{note:'2 hồ sơ thầu đang chuẩn bị',act:'Review spec với NPP',keys:{}}},
  others:[{t:'Lịch đào tạo Sales',note:'Đề xuất 14/10',act:'Giang gửi thư mời'}],concl:'Giữ tiến độ kế hoạch FY68.',createdBy:'Giang',snap:{}};
const MMLIST=[{id:'MM20260929-1',group:'Product',date:'2026-09-29',from:'2026-09-22',to:'2026-09-29',title:'Product Meeting 29092026',createdBy:'Giang',updatedAt:'29/09/2026 17:05',emailedAt:'29/09/2026 17:10'},
  {id:'MM20260922-1',group:'Marketing',date:'2026-09-22',from:'2026-09-15',to:'2026-09-22',title:'Marketing Meeting 22092026',createdBy:'Thuong',updatedAt:'22/09/2026 16:40',emailedAt:''}];

/* ── KPI (file MMH KPI FY68 — số GIẢ) ── */
function rng(seed){ let s=seed; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
const KMONTHS=['202609','202610','202611','202612','202701','202702','202703','202704','202705','202706','202707','202708'];
const PERIODS=['FY68','Q1','Q2','Q3','Q4'].concat(KMONTHS);
const KSTAFF={
  Giang:{full:'Lê Thu Giang',title:'Product Team Leader',role:'Team Leader',team:'Product Team',dept:'Sales & Marketing VN',level:'Manager'},
  'Viet Ha':{full:'Phạm Việt Hà',title:'Surgical Sales PIC — North',role:'',team:'Surgical Sales team',dept:'Sales & Marketing VN',level:'Staff'},
  Khang:{full:'Trần Minh Khang',title:'Surgical Sales PIC — South',role:'',team:'Surgical Sales team',dept:'Sales & Marketing VN',level:'Staff'},
  'Minh Trang':{full:'Đỗ Minh Trang',title:'Marketing PIC — Digital',role:'',team:'Marketing Team',dept:'Sales & Marketing VN',level:'Staff'},
  Thuong:{full:'Vũ Thị Thương',title:'Marketing Team Leader',role:'Team Leader',team:'Marketing Team',dept:'Sales & Marketing VN',level:'Manager'},
  Tuyen:{full:'Ngô Văn Tuyến',title:'Head of Sales & Marketing VN',role:'HOD',team:'Sales & Marketing VN',dept:'Sales & Marketing VN',level:'Manager'}
};
const KDEF={
  Giang:[['F2-03','Sales – Turnover','MMH Sales Amount to Distributors – Knife / Sutures – Vietnam North','USD',0.25,9000],
         ['C3-05','Sales – Customer Visits & Co-visits','Number of Co-visits with Distributor Sales Representatives – Surgical – Vietnam North','Visit',0.15,6],
         ['C12-02','Marketing – Event Number','Number of T&E Events – Led by MMH Members – Product Presentation / Case Demonstration – Vietnam','Event',0.15,2],
         ['L2-01','People – Training & Development','Number of Internal Product Training Sessions','Session',0.15,2],
         ['C16-01','Marketing – Digital & Design','Number of Product Content Items Published – Vietnam','Item',0.1,4],
         ['L2-04','Marketing – New Product Launch','Product Knowledge Test Pass Rate of Distributor Sales – Vietnam','%',0.1,0.8],
         ['L3-01','People – Behaviour','Key Behavioural Indicator Score','Point',0.1,4]],
  'Viet Ha':[['F2-04','Sales – Turnover','MMH Sales Amount to Distributors – Knife / Sutures – Vietnam North','USD',0.4,7000],
         ['C3-02','Sales – Customer Visits & Co-visits','Number of Customer Visits – Distributors/End Customers – Vietnam North','Visit',0.25,30],
         ['C1-04','Sales – New Customer Accounts','Number of New Customer Accounts & New SKU Listings – Vietnam North','Account',0.25,2],
         ['L3-01','People – Behaviour','Key Behavioural Indicator Score','Point',0.1,4]],
  Khang:[['F2-05','Sales – Turnover','MMH Sales Amount to Distributors – Knife / Sutures – Vietnam South','USD',0.4,8000],
         ['C3-03','Sales – Customer Visits & Co-visits','Number of Customer Visits – Distributors/End Customers – Vietnam South','Visit',0.25,30],
         ['C1-05','Sales – New Customer Accounts','Number of New Customer Accounts & New SKU Listings – Vietnam South','Account',0.25,2],
         ['L3-01','People – Behaviour','Key Behavioural Indicator Score','Point',0.1,4]],
  'Minh Trang':[['C16-02','Marketing – Digital & Design','Number of Digital Content Items Created – Facebook & Zalo OA','Item',0.4,12],
         ['C16-03','Marketing – Digital & Design','On-time Social Media Publishing Rate','%',0.3,0.95],
         ['C17-01','Marketing – Digital & Design','Message Inquiry Rate – Products','%',0.2,0.03],
         ['L3-01','People – Behaviour','Key Behavioural Indicator Score','Point',0.1,4]],
  Thuong:[['C10-01','Marketing – Event Number','Number of T&E Events Led by KOLs & Exhibitions – Vietnam','Event',0.4,2],
         ['C13-01','Marketing – Event Participants','Number of Participants in T&E Events – Led by KOLs – Vietnam','Person',0.3,60],
         ['L2-02','People – Training & Development','Number of Internal Training Sessions Delivered by Team Leaders & Managers','Session',0.2,1],
         ['L3-01','People – Behaviour','Key Behavioural Indicator Score','Point',0.1,4]],
  Tuyen:[['F0-01','Sales – Turnover','MMH Sales Amount to Distributors – Total','USD',0.5,60000],
         ['C3-01','Sales – Customer Visits & Co-visits','Number of Customer Visits – Field Coaching for Dental Sales Staff','Visit',0.3,8],
         ['L3-01','People – Behaviour','Key Behavioural Indicator Score','Point',0.2,4]]
};
const KACT={Giang:[1.08,null],'Viet Ha':[0.74,null],Khang:[1.12,null],'Minh Trang':[0.97,null],Thuong:[1.25,null],Tuyen:[0.93,null]};
function kpiRows(){
  const rows=[]; const r=rng(7);
  Object.keys(KDEF).forEach(mem=>{
    const s=KSTAFF[mem];
    KDEF[mem].forEach(([code,group,name,unit,w,tg],ix)=>{
      const lvl=KACT[mem][0]; const isPct=unit==='%';
      const v=PERIODS.map(p=>{
        if(/^\d{6}$/.test(p)){
          const t=tg; let a=null;
          if(p==='202609'){ const f=Math.max(0.55,Math.min(1.45,lvl+(r()-0.5)*0.5)); a=isPct?Math.round(t*f*1000)/1000:(unit==='USD'?Math.round(t*f):Math.max(0,Math.round(t*f))); }
          const pr=a===null?null:(/^F/.test(code)?a/t:Math.min(1.3,a/t)); return [t,a,w,pr,pr===null?null:pr*w];
        }
        return null;
      });
      /* quý & năm = tổng hợp từ tháng 9 */
      const sep=v[PERIODS.indexOf('202609')];
      const q1=[tg, sep[1]===null?null:sep[1], w, null, null];
      if(q1[1]!==null){ q1[3]=/^F/.test(code)?q1[1]/q1[0]:Math.min(1.3,q1[1]/q1[0]); q1[4]=q1[3]*w; }
      const fy=[tg, sep[1], w, null, null]; if(fy[1]!==null){ fy[3]=/^F/.test(code)?fy[1]/fy[0]:Math.min(1.3,fy[1]/fy[0]); fy[4]=fy[3]*w; }
      v[PERIODS.indexOf('Q1')]=q1; v[PERIODS.indexOf('FY68')]=fy;
      ['Q2','Q3','Q4'].forEach(q=>{ v[PERIODS.indexOf(q)]=[isPct||unit==='Point'?tg:tg*3,null,w,null,null]; });
      rows.push({dept:s.dept,member:mem,pos:s.title,code,group,name,unit,agg:isPct||unit==='Point'?'AVG':'SUM',v});
    });
  });
  return rows;
}
const KSYNC=[
  {src:'Doanh số NPP (Turnover)',file:'MMH Turnover Report',codes:'F*',mode:'auto',at:'07/10/2026 08:00',status:'OK',note:'Tháng đã đóng: 202609'},
  {src:'Training Hub',file:'Training Master',codes:'L2-*',mode:'auto',at:'07/10/2026 08:00',status:'OK',note:''},
  {src:'KBI',file:'KBI form',codes:'L3-01',mode:'auto',at:'07/10/2026 08:00',status:'OK',note:''},
  {src:'MKT (bài đăng, sự kiện)',file:'MKT Online / Offline',codes:'C10-C17',mode:'auto',at:'07/10/2026 08:00',status:'OK',note:''},
  {src:'CRM (viếng thăm, mở mới)',file:'MMH CRM',codes:'C1, C3',mode:'auto',at:'07/10/2026 08:00',status:'OK',note:''}];
function kpiFor(local){
  const rows=kpiRows();
  let me='Giang', scope='team', see=m=>['Giang','Viet Ha','Khang'].includes(m), total=true;
  if(local==='nt.ha'){ me='Nguyen Ha'; scope='all'; see=()=>true; }
  else if(local==='mmh.admin'){ me='Minh Trang'; scope='self'; see=m=>m==='Minh Trang'; total=false; }
  else if(local==='mmh.marketing'){ me='Thuong'; scope='team'; see=m=>m==='Thuong'||m==='Minh Trang'; total=false; }
  const R=rows.filter(x=>see(x.member)), staff={}; R.forEach(x=>staff[x.member]=KSTAFF[x.member]);
  const org=Object.keys(KSTAFF).map(k=>Object.assign({key:k},KSTAFF[k]));
  return {ok:true,me,scope,periods:PERIODS,rows:R,staff,org,sync:KSYNC,total,at:'2026-10-07T01:00:00.000Z',v:'1.3'};
}
function kpiMailData(pic,month){
  const rows=kpiRows().filter(x=>x.member===pic), i=PERIODS.indexOf(month), qi=PERIODS.indexOf('Q1');
  let tot=null, qt=null; const out=rows.map(r=>{ const v=r.v[i]; if(v[4]!==null) tot=(tot||0)+v[4]; const q=r.v[qi]; if(q[4]!==null) qt=(qt||0)+q[4];
    return {link:r.code,url:'',type:r.group,kpi:r.name,w:r.v[qi][2],unit:r.unit,t:v[0],a:v[1],p:v[3],pw:v[4]}; });
  return {ok:true,pic,full:KSTAFF[pic].full,month,q:'Q1',fy:'FY68',total:tot,qtotal:qt,rows:out,
    to:'mmh.sales@mani.inc',cc:'nt.ha@mani.inc',toName:'anh Tuyến',miss:[]};
}
function kscMailHtml(d,f){ /* chép cấu trúc kscMailHtml_ (KpiSyncCenter.gs) để bản xem trước giống bản thật */
  const e=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'), mm=d.month.slice(4)+'/'+d.month.slice(0,4), td='border:1px solid #808080;padding:3px 6px;font-size:10.5pt;';
  const pc=v=>v==null?'':Math.round(v*100)+'%', num=v=>v==null?'':(Math.abs(v)>=1000?Math.round(v).toLocaleString('en-US'):String(Math.round(v*100)/100));
  const lines=t=>String(t||'').split(/\n/).map(x=>x.replace(/^\s*[-•*·]\s*/,'').trim()).filter(x=>x);
  const color=d.total==null?'#1A1A1A':d.total>=1?'#1E7B34':d.total>=0.9?'#B45309':'#C00000';
  const h=['<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1A1A1A">'];
  h.push('<div>'+e(f.greeting||'').replace(/\n/g,'<br>')+'</div>'); if(f.intro) h.push('<div>'+e(f.intro).replace(/\n/g,'<br>')+'</div>');
  h.push('<div>KPI T'+mm+' : <b style="color:'+color+'">'+(d.total==null?'chưa có số':pc(d.total))+'</b></div>');
  if(String(f.showQ)!=='0' && d.qtotal!=null) h.push('<div>KPI '+d.q+' '+d.fy+' (đến T'+mm+') : <b>'+pc(d.qtotal)+'</b></div>');
  h.push('<div>Chi tiết :</div><div style="margin-top:6px"><b>1. Performance Summary KPI</b></div>');
  const th=(t,c)=>'<th style="'+td+'background:'+c+';font-weight:normal;text-align:center;vertical-align:bottom">'+t+'</th>';
  h.push('<table style="border-collapse:collapse;margin:6px 0 10px 0"><tr>',th('Link','#D0D0D0'),th('Type','#D0D0D0'),th('KPI','#D0D0D0'),th('Weight<br>'+d.q,'#D0D0D0'),th('Unit','#EAD1DC'),
    th(d.month+'<br>Target','#EAD1DC'),th(d.month+' Actual','#CFE2F3'),th('Unit','#FFF2CC'),th(d.month+'<br>%','#FFF2CC'),th(d.month+' %<br>*Weight','#FFF2CC'),'</tr>');
  d.rows.forEach(r=>{ const P=/%/.test(r.unit); h.push('<tr><td style="'+td+'">'+e(r.link)+'</td><td style="'+td+'background:#EDEDED">'+e(r.type)+'</td><td style="'+td+'">'+e(r.kpi)+'</td><td style="'+td+'">'+pc(r.w)+'</td><td style="'+td+'">'+e(r.unit)+'</td><td style="'+td+'">'+(P?pc(r.t):num(r.t))+'</td><td style="'+td+'">'+(P?pc(r.a):num(r.a))+'</td><td style="'+td+'">'+e(r.unit)+'</td><td style="'+td+'">'+pc(r.p)+'</td><td style="'+td+'">'+pc(r.pw)+'</td></tr>'); });
  h.push('<tr>'+new Array(10).join('<td style="'+td+'"></td>')+'<td style="'+td+'"><b>'+pc(d.total)+'</b></td></tr></table>');
  [['2. Analysis & Next Actions KPI',f.analysis],['3. Highlights & Challenges KPI',f.highlights]].forEach(s=>{ const ls=lines(s[1]); if(!ls.length) return; h.push('<div style="margin-top:8px"><b>'+s[0]+'</b></div><ul style="margin:4px 0 8px 0">'+ls.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>'); });
  if(f.sign) h.push('<div style="margin-top:10px">'+e(f.sign).replace(/\n/g,'<br>')+'</div>'); h.push('</div>'); return h.join('');
}
/* ── Total KPI (sheet 1 / 3 / 4 / 6 — số GIẢ) ── */
function kpiTotal(){
  const M=KMONTHS, r=rng(11);
  const mk=(code,parent,level,gc,p,group,name,unit,agg,tgtM,lvl)=>{ const t=M.map(()=>tgtM), a=M.map((_,i)=>i===0?(unit==='%'?Math.round(tgtM*lvl*1000)/1000:Math.round(tgtM*lvl)):null);
    const tgt=agg==='SUM'?tgtM*12:tgtM, act=a[0]; return {code,parent,level,gc,p,group,seg:'',name,unit,agg,ref:'',fy67:null,tgt,act,pct:act===null?null:act/tgt,mem:'',t,a}; };
  const kpi=[
    mk('F0-00','', 'Total','F0','F','Sales – Turnover','MMH Sales Amount to Distributors – Total','USD','SUM',100000,1.04),
    mk('F1-00','', 'Group','F1','F','Sales – Turnover','MMH Sales Amount to Distributors – Dental & MMG Vietnam & Other Markets','USD','SUM',52000,0.98),
    mk('F1-01','F1-00','Detail','F1','F','Sales – Turnover','MMH Sales Amount to Distributors – Dental Vietnam North','USD','SUM',20000,1.06),
    mk('F1-02','F1-00','Detail','F1','F','Sales – Turnover','MMH Sales Amount to Distributors – Dental Vietnam South','USD','SUM',18000,0.91),
    mk('F2-00','', 'Group','F2','F','Sales – Turnover','MMH Sales Amount to Distributors – Knife / Sutures – Vietnam','USD','SUM',30000,1.12),
    mk('F5-00','', 'Group','F5','F','Sales – New & Relaunched Product Turnover','MMH Sales Amount to Distributors – New & Relaunched Products – Jizai – Vietnam','USD','SUM',8000,0.84),
    mk('C1-00','', 'Group','C1','C','Sales – New Customer Accounts','Number of New Customer Accounts & New SKU Listings – Vietnam','Account','SUM',10,1.1),
    mk('C3-00','', 'Group','C3','C','Sales – Customer Visits & Co-visits','Number of Customer Visits – Vietnam','Visit','SUM',160,0.95),
    mk('C10-00','','Group','C10','C','Marketing – Event Number','Number of T&E Events – Led by MMH Members – Vietnam','Event','SUM',4,1.25),
    mk('C17-00','','Group','C17','C','Marketing – Digital & Design','Design Output Score','Point','AVG',4,0.97),
    mk('P2-00','', 'Group','P2','P','Back-office – Order Fulfilment','Delivery Performance Score','Point','AVG',4,1.0),
    mk('P3-00','', 'Group','P3','P','Back-office – Inventory','Inventory Holding Period','Month','LAST',4,0.9),
    mk('P4-00','', 'Group','P4','P','Back-office – Documentation','Number of Product Registration Certificates Obtained – Vietnam','Cert','SUM',1,1),
    mk('L2-00','', 'Group','L2','L','People – Training & Development','Number of Internal Product Training Sessions','Session','SUM',3,1.33),
    mk('L3-00','', 'Group','L3','L','People – Behaviour','Key Behavioural Indicator Score','Point','AVG',4,0.96)];
  const persp=[
    {k:'F',title:'Financial',obj:[{code:'F1',obj:'Dental',init:'',link:'F1',anchor:'FY68'},{code:'F2',obj:'Surgical',init:'',link:'F2',anchor:'FY68'},{code:'F5',obj:'New products',init:'',link:'F5',anchor:'FY68'}]},
    {k:'C',title:'Customer',obj:[{code:'C1',obj:'Distributor',init:'',link:'C1, C3',anchor:''},{code:'C4',obj:'KOL',init:'',link:'C10',anchor:''},{code:'C5',obj:'Brand',init:'',link:'C17',anchor:''}]},
    {k:'P',title:'Process',obj:[{code:'P2',obj:'Delivery',init:'',link:'P2',anchor:''},{code:'P3',obj:'Inventory',init:'',link:'P3',anchor:''},{code:'P4',obj:'Registration',init:'',link:'P4',anchor:''}]},
    {k:'L',title:'Learning',obj:[{code:'L2',obj:'Product skill',init:'',link:'L2',anchor:''},{code:'L3',obj:'Leadership',init:'',link:'L3',anchor:''}]}];
  const mp=['FY68 TOTAL','Q1','Q2','Q3','Q4'].concat(M);
  const mems=[['Sales & Marketing VN','Tuyen','Head of Sales & Marketing VN',0.93],['Sales & Marketing VN','Giang','Product Team Leader',1.08],['Sales & Marketing VN','Thuong','Marketing Team Leader',1.25],
    ['Sales & Marketing VN','Minh Trang','Marketing PIC — Digital',0.97],['Sales & Marketing VN','Viet Ha','Surgical Sales PIC — North',0.86],['Sales & Marketing VN','Khang','Surgical Sales PIC — South',1.12],
    ['Back-office','Hoa','Head of Back Office',1.02],['Back-office','Dam Ha','Stock Team Leader',0.94],['Back-office','Mai','Accounting PIC',1.0]].map(x=>({dept:x[0],member:x[1],full:'',pos:x[2],v:mp.map(p=>p==='202609'||p==='Q1'||p==='FY68 TOTAL'?(p==='FY68 TOTAL'?x[3]/12*1:x[3]):null)}));
  mems.forEach(m=>{ m.v[0]=Math.round(m.v[mp.indexOf('202609')]*1000)/1000; });
  const rules=[
    {group:'Sales – Turnover\n(F codes)',kpis:'F0-F5',vi:'Doanh số NPP theo tháng lấy từ MMH Turnover Report (kế toán chốt). % đạt = Actual / Target, không giới hạn trần. Quý / năm = lũy kế. (Nội dung minh hoạ — dữ liệu giả lập.)',en:'',ref:''},
    {group:'Sales – Customer Visits & Co-visits\n(C3 codes)',kpis:'C3',vi:'Đếm số lượt viếng thăm hợp lệ trên MMH CRM (có báo cáo kết quả). Trần 130%. (Minh hoạ)',en:'',ref:''},
    {group:'People – Behaviour\n(KBI)',kpis:'L3-01',vi:'Điểm KBI trung bình theo form đánh giá hành vi (thang 1–5). (Minh hoạ)',en:'',ref:''}];
  const guide=['1. KPI is summarised and closed monthly.','2. Deadline for KPI completion is the 2nd of the following month.','3. Email the KPI result to Part leader and Director.','4. If 10% of reports are late/missing: -20% bonus; over 50%: no bonus.','5. Result cap 130% per KPI except Turnover.','6. Quarterly result = sum of 3 months.'];
  return {ok:true,v:'1.3',me:'Giang',scope:'team',sync:KSYNC,head:[{label:'BUDGET FY68',value:'$1,200,000',sub:''}],persp,kpi,months:M,rules,guide,members:mems,mperiods:mp,colors:['<90%','90-<100%','100-120%','>120%'],at:'2026-10-07T01:00:00.000Z'};
}
const PEOPLE={'S20260925-01':['Viet Ha','Khang','Giang'],'S20261003-01':['Viet','Vinh','Phuong','Giang'],'S20261008-01':['Giang','Minh Trang','Khang','Viet Ha','Vinh','Phuong','Duc Anh'],'S20261014-01':[],'S20261022-01':['Vinh','Phuong','Giang']};
module.exports={TYPES_MKT,TYPE_FIX,EXTRA_MKT,KEYS_BO,KEYS_MG,MONTHLY,ACT,MMREC,MMLIST,kpiFor,kpiMailData,kscMailHtml,kpiTotal,PEOPLE};
