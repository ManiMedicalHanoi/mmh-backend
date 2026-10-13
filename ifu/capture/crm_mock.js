/* Backend GIẢ LẬP cho MMH CRM (chụp ảnh HDSD). Dữ liệu hoàn toàn giả: tên khách hàng, số liệu KPI, điện thoại, email @example.com.
   Định dạng phản hồi theo đúng code backend (mmh-backend/backends/crm-dental/Mã.gs, MMH_SalesTasks.gs, MMH_TripFlow.gs,
   kpi/RH_KpiView.gs, training/RH_Auth.gs …). install(page, opt) gắn page.route(/script\.google\.com/). */
const fs = require('fs'), path = require('path');

/* ── cấu trúc cột (COL trong Mã.gs) ── */
const COL = {
  customer: ['code','name','type','address','province','area','pic','fy','openDate','openMonth','nCbc','nOrder','note'],
  cbc: ['code','cbcCode','type','name','address','province','area','pic','cbcNo','contact','phone','jobTitle','specialize','role','influence','trust','note','log'],
  order: ['code','cbcCode','channel','fy','month','day','orderNo','type','name','address','province','area','contact','jobTitle','phone','pic','detail','ptype','qty','price','amount','partner','partnerType','zaloQty','source','note'],
  npp: ['code','nppName','name'],
  monthly: ['no','typeTask','pic','area','fy','period','plan','result'],
  weekly: ['no','fy','month','start','finish','pic','account','type','province','area','product','typeTask','typeAction','process','plan','result','status','feedback','nextAction','stopReason','photo','gpsInfo'],
  present: ['no','account','pic','province','area','fy','month','day','folder','review','target','actual'],
  adp: ['no','account','pic','fy','abcd','caseInfo','analysis','objective','tactic','keyAction','targetAmt','actualAmt','m09','m10','m11','rQ1','m12','m01','m02','rQ2','m03','m04','m05','rQ3','m06','m07','m08','rQ4','rFY','created','updated']
};

/* ═════════════ DỮ LIỆU NHÓM DENTAL ═════════════ */
const MASTER_VN = {
  pic: ['Viet','Vinh','Phuong'],
  accountType: ['Hospital','Clinic','University','Dealer','Distributor'],
  typeTask: ['Sale-Hospital','Sale-Clinics','Sale-University','Sale-Dealer','Sale-Distributor','Marketing-Event','Management-KPI','Management-Turnover'],
  typeAction: ['Visiting','Phone call','Online meeting','Co-visit with distributor','Demo / Workshop'],
  process: ['TÌM HIỂU','TIẾP CẬN','DEMO / DÙNG THỬ','ĐÀM PHÁN','CHỐT ĐƠN','CHĂM SÓC SAU BÁN'],
  status: ['Not started','In Progress','Completed','Cancel'],
  feedback: ['Tích cực','Trung lập','Cần thêm thông tin','Chưa hài lòng'],
  product: ['Jizai','Dia-burs','Hand files','Composite (MMG)','Mani Bond','Dental suture','Bleach\'N Shine'],
  area: ['North','Central','South'],
  fy: ['FY68','FY67'],
  abcd: ['A','B','C','D'],
  jobTitle: ['Trưởng khoa','Phó khoa','Bác sĩ','Giám đốc phòng khám','Trưởng phòng vật tư','Giảng viên','Chủ đại lý','Sales NPP'],
  role: ['Decision maker','Influencer','User','Gatekeeper'],
  influence: ['Cao','Trung bình','Thấp'],
  journey: ['Biết đến','Quan tâm','Dùng thử','Sử dụng thường xuyên','Trung thành'],
  partnerType: ['Distributor','Dealer','Direct'],
  channel: ['Distributor','Dealer','Event','Zalo'],
  province: ['Hà Nội','Hải Phòng','Quảng Ninh','Bắc Ninh','Đà Nẵng','Huế','Nghệ An','Hồ Chí Minh','Cần Thơ','Bình Dương'],
  month: [], nextAction: ['Tiếp tục chăm - Tăng tốc','Tiếp tục chăm - Duy trì','Chờ - Thử lại sau 30 ngày','Dừng lại']
};
const AREA_OF = { 'Hà Nội':'North','Hải Phòng':'North','Quảng Ninh':'North','Bắc Ninh':'North','Đà Nẵng':'Central','Huế':'Central','Nghệ An':'Central','Hồ Chí Minh':'South','Cần Thơ':'South','Bình Dương':'South' };
const CUST_VN = [
  ['NHN-HP0001','BV Răng Hàm Mặt TW Hà Nội','Hospital','Hà Nội','Viet','2024-03-12','Khách hàng trọng điểm — khoa Nội nha'],
  ['NHN-CL0001','PK Nha khoa Kim','Clinic','Hà Nội','Viet','2025-05-20',''],
  ['NHN-CL0002','PK Nha khoa Minh Anh','Clinic','Hà Nội','Viet','2026-09-15','Mở mới FY68'],
  ['NHN-UN0001','Viện Đào tạo RHM – ĐH Y Hà Nội','University','Hà Nội','Viet','2023-11-02',''],
  ['NHP-HP0001','BV Đa khoa Quốc tế Hải Phòng','Hospital','Hải Phòng','Viet','2025-01-08',''],
  ['NHP-CL0001','PK Nha khoa Sao Mai','Clinic','Hải Phòng','Viet','2025-08-19',''],
  ['NQN-CL0001','PK Nha khoa Hạ Long Smile','Clinic','Quảng Ninh','Viet','2026-02-11',''],
  ['NHN-DL0001','Đại lý Nha khoa Thành Công','Dealer','Hà Nội','Viet','2024-06-30',''],
  ['NHN-DT0001','NPP Nam Dũng','Distributor','Hà Nội','Viet','2022-09-01','NPP miền Bắc'],
  ['NBN-CL0001','PK Nha khoa An Khang','Clinic','Bắc Ninh','Viet','2026-10-02','Mở mới FY68'],
  ['CDN-HP0001','BV Răng Hàm Mặt Đà Nẵng','Hospital','Đà Nẵng','Vinh','2023-04-17',''],
  ['CDN-CL0001','PK Nha khoa Hải Châu','Clinic','Đà Nẵng','Vinh','2025-03-03',''],
  ['CHU-CL0001','PK Nha khoa Cố Đô','Clinic','Huế','Vinh','2026-09-22','Mở mới FY68'],
  ['CNA-CL0001','PK Nha khoa Vinh Smile','Clinic','Nghệ An','Vinh','2025-10-09',''],
  ['CDN-DT0001','NPP S.P.I','Distributor','Đà Nẵng','Vinh','2022-09-01','NPP miền Trung'],
  ['CHU-UN0001','Khoa RHM – ĐH Y Dược Huế','University','Huế','Vinh','2024-02-26',''],
  ['SHC-HP0001','BV Răng Hàm Mặt TP.HCM','Hospital','Hồ Chí Minh','Phuong','2023-07-14',''],
  ['SHC-CL0001','PK Nha khoa Sài Gòn Xanh','Clinic','Hồ Chí Minh','Phuong','2025-12-01',''],
  ['SHC-CL0002','PK Nha khoa Tâm Đức','Clinic','Hồ Chí Minh','Phuong','2026-09-28','Mở mới FY68'],
  ['SCT-CL0001','PK Nha khoa Tây Đô','Clinic','Cần Thơ','Phuong','2025-06-23',''],
  ['SHC-DT0001','NPP Meci','Distributor','Hồ Chí Minh','Phuong','2022-09-01',''],
  ['SHC-DT0002','NPP Việt Thái','Distributor','Hồ Chí Minh','Phuong','2022-09-01',''],
  ['SBD-CL0001','PK Nha khoa Bình Dương Care','Clinic','Bình Dương','Phuong','2026-01-15',''],
  ['SHC-DL0001','Đại lý Nha khoa Phú Nhuận','Dealer','Hồ Chí Minh','Phuong','2024-10-05','']
];
const ADDR = { 'Hà Nội':'Đống Đa, Hà Nội','Hải Phòng':'Lê Chân, Hải Phòng','Quảng Ninh':'Hạ Long, Quảng Ninh','Bắc Ninh':'TP Bắc Ninh','Đà Nẵng':'Hải Châu, Đà Nẵng','Huế':'TP Huế','Nghệ An':'TP Vinh, Nghệ An','Hồ Chí Minh':'Quận 5, TP.HCM','Cần Thơ':'Ninh Kiều, Cần Thơ','Bình Dương':'Thủ Dầu Một, Bình Dương' };
const fyOfIso = iso => { const y = +iso.slice(0,4), m = +iso.slice(5,7); return 'FY' + ((m >= 9 ? y : y - 1) - 1958); };
const ymOf = iso => iso.slice(0,4) + iso.slice(5,7);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); };
const DOW = iso => new Date(iso + 'T00:00:00Z').getUTCDay();

function buildVN(){
  const D = { customer:[], cbc:[], order:[], npp:[], monthly:[], weekly:[], present:[], adp:[] };
  const byName = {};
  /* contacts */
  const DOCS = ['BS. Nguyễn Văn An','BS. Trần Thu Hà','BS. Lê Minh Đức','BS. Phạm Hồng Nhung','BS. Hoàng Quốc Bảo','BS. Đỗ Thanh Tâm','BS. Vũ Ngọc Lan','BS. Bùi Đức Long','BS. Đặng Thùy Linh','BS. Ngô Gia Huy','BS. Mai Phương Thảo','BS. Lý Hải Nam'];
  CUST_VN.forEach((c, i) => {
    const [code, name, type, prov, pic, open, note] = c;
    const o = { _row: 4 + i, code, name, type, address: ADDR[prov], province: prov, area: AREA_OF[prov], pic, fy: fyOfIso(open), openDate: open, openMonth: ymOf(open), nCbc: 0, nOrder: 0, note };
    D.customer.push(o); byName[name] = o;
  });
  let cr = 4;
  D.customer.forEach((c, i) => {
    const n = c.type === 'Hospital' ? 3 : c.type === 'University' ? 2 : c.type === 'Distributor' ? 2 : 1 + (i % 2);
    for (let k = 0; k < n; k++){
      const isD = c.type === 'Distributor' || c.type === 'Dealer';
      const nm = isD ? ['Anh Nguyễn Hữu Tài','Chị Trần Mai Anh','Anh Lê Văn Phúc'][k % 3] : DOCS[(i * 3 + k) % DOCS.length];
      const jt = isD ? (k ? 'Sales NPP' : 'Chủ đại lý') : c.type === 'Hospital' ? ['Trưởng khoa','Bác sĩ','Trưởng phòng vật tư'][k] : c.type === 'University' ? 'Giảng viên' : 'Giám đốc phòng khám';
      D.cbc.push({ _row: cr++, code: c.code, cbcCode: c.code + '-' + String(k + 1).padStart(2, '0'), type: c.type, name: c.name, address: c.address, province: c.province, area: c.area, pic: c.pic,
        cbcNo: k + 1, contact: nm, phone: '0900 000 ' + String(100 + cr).slice(-3), jobTitle: jt, specialize: isD ? 'Phân phối' : ['Nội nha','Phục hình','Nha chu','Chỉnh nha'][(i + k) % 4],
        role: ['Decision maker','Influencer','User'][k % 3], influence: ['Cao','Trung bình','Thấp'][k % 3], trust: ['Sử dụng thường xuyên','Dùng thử','Quan tâm'][(i + k) % 3], note: '', log: '2026-09-' + String(10 + (i % 18)).padStart(2,'0') + ' · ' + c.pic });
    }
    c.nCbc = n;
  });
  /* orders: Sep–Oct FY68 + FY67 (Jun–Aug) for history */
  const PROD = [['Jizai','JIZAI #25 .04 25mm',  'Jizai', 480000],['Dia-burs','DIA-BURS FG TR-13',  'Dia-burs', 95000],['Composite (MMG)','MMG Composite A2 4g','Composite',  520000],
    ['Mani Bond','Mani Bond 5ml','Bond', 690000],['Hand files','K-File 25mm #15-40','Hand files', 85000],['Dental suture','Dental Suture 4-0 PGA','Suture', 210000]];
  const NPP_OF = { Viet:'NPP Nam Dũng', Vinh:'NPP S.P.I', Phuong:'NPP Meci' };
  let orow = 4, ono = 1001;
  const odates = ['2026-06-12','2026-07-08','2026-07-22','2026-08-05','2026-08-19','2026-09-03','2026-09-09','2026-09-15','2026-09-18','2026-09-24','2026-09-29','2026-10-01','2026-10-05','2026-10-06'];
  D.customer.filter(c => c.type !== 'Distributor').forEach((c, i) => {
    const cnt = (i % 4) + 1;
    for (let k = 0; k < cnt; k++){
      const d = odates[(i * 2 + k * 3) % odates.length], p = PROD[(i + k) % PROD.length], qty = [10, 20, 5, 30, 12, 8][(i + k) % 6];
      const ct = D.cbc.find(x => x.code === c.code);
      D.order.push({ _row: orow++, code: c.code, cbcCode: ct.cbcCode, channel: c.type === 'Dealer' ? 'Dealer' : 'Distributor', fy: fyOfIso(d), month: ymOf(d), day: d, orderNo: 'SO-' + (ono++),
        type: c.type, name: c.name, address: c.address, province: c.province, area: c.area, contact: ct.contact, jobTitle: ct.jobTitle, phone: ct.phone, pic: c.pic,
        detail: p[1], ptype: p[2], qty, price: p[3], amount: qty * p[3], partner: NPP_OF[c.pic], partnerType: 'Distributor', zaloQty: '', source: 'Sales', note: '' });
    }
    c.nOrder = D.order.filter(o => o.code === c.code).length;
  });
  D.npp = [{ _row:4, code:'NHN-DT0001', nppName:'Nam Dũng', name:'NPP Nam Dũng' },{ _row:5, code:'CDN-DT0001', nppName:'S.P.I', name:'NPP S.P.I' },{ _row:6, code:'SHC-DT0001', nppName:'Meci', name:'NPP Meci' },{ _row:7, code:'SHC-DT0002', nppName:'Việt Thái', name:'NPP Việt Thái' }];

  /* ── đi địa bàn ── */
  let wr = 4, wno = 1;
  const acc = c => `${c.name}/${c.type}/${c.province}/${c.area}`;
  const W = (pic, start, cname, o) => {
    const c = byName[cname]; o = o || {};
    const st = o.status || (start < '2026-10-07' ? 'Completed' : 'Not started');
    const meet = D.cbc.find(x => x.code === c.code);
    const res = o.result !== undefined ? o.result : (st === 'Completed' ? `Người gặp: ${meet.contact} (${meet.jobTitle})\n1. Actions Taken: ${o.act || 'Giới thiệu ' + (o.product || 'Jizai') + ', để lại tài liệu và hàng mẫu.'}\n2. Current Situation: ${o.sit || 'Đang dùng sản phẩm của hãng khác, quan tâm độ bền và giá.'}\n3. Customer Feedback: ${o.fbk || 'Đánh giá tốt độ dẻo và độ cắt; muốn dùng thử thêm 2 tuần.'}\n4. Opportunities / Next Steps: ${o.next || 'Hẹn demo cho cả khoa, gửi báo giá qua NPP.'}` : '');
    const photo = (st === 'Completed' && (o.typeAction || 'Visiting') === 'Visiting' && !o.noPhoto) ? 'https://drive.google.com/file/d/' + ('1PHOTO' + String(wno).padStart(3,'0')).padEnd(33,'x') + '/view' : '';
    const gps = photo ? `📍 ${o.lat || '21.0' + (300 + wno)}, ${o.lng || '105.8' + (200 + wno)} (±12 m) · ${c.address}\n🕒 ${start} ${o.time || '10:3' + (wno % 10)}` : '';
    D.weekly.push({ _row: wr++, no: wno++, fy: fyOfIso(start), month: ymOf(start), start, finish: o.finish || start, pic, account: acc(c), type: c.type, province: c.province, area: c.area,
      product: o.product || 'Jizai', typeTask: o.typeTask || ({Hospital:'Sale-Hospital',Clinic:'Sale-Clinics',University:'Sale-University',Dealer:'Sale-Dealer',Distributor:'Sale-Distributor'}[c.type]),
      typeAction: o.typeAction || 'Visiting', process: o.process || 'TIẾP CẬN', plan: o.plan || 'Giới thiệu ' + (o.product || 'Jizai') + ' và chính sách Q2',
      result: res, status: st, feedback: st === 'Completed' ? (o.feedback || 'Tích cực') : '', nextAction: st === 'Completed' ? (o.nextAction || 'Tiếp tục chăm - Tăng tốc') : '', stopReason: '', photo, gpsInfo: gps });
  };
  /* tuần này 05–11/10 — Viet */
  W('Viet','2026-10-05','BV Răng Hàm Mặt TW Hà Nội',{ product:'Jizai', process:'DEMO / DÙNG THỬ', typeAction:'Demo / Workshop', plan:'Demo Jizai cho khoa Nội nha', act:'Demo Jizai trên răng nhựa cho 6 bác sĩ khoa Nội nha.', noPhoto:true });
  W('Viet','2026-10-05','NPP Nam Dũng',{ product:'Composite (MMG)', typeAction:'Co-visit with distributor', process:'CHĂM SÓC SAU BÁN', plan:'Đi kèm sales NPP, rà tồn kho Composite', act:'Rà tồn kho Composite, thống nhất chương trình tháng 10.' });
  W('Viet','2026-10-06','PK Nha khoa Kim',{ product:'Dia-burs', process:'ĐÀM PHÁN', plan:'Chốt đơn mũi khoan Dia-burs quý 4', time:'09:15' });
  W('Viet','2026-10-06','Viện Đào tạo RHM – ĐH Y Hà Nội',{ product:'Hand files', process:'TIẾP CẬN', plan:'Gặp giảng viên, đề xuất bộ trâm cho lớp thực hành', time:'14:20' });
  W('Viet','2026-10-07','PK Nha khoa Minh Anh',{ product:'Composite (MMG)', status:'In Progress', process:'DEMO / DÙNG THỬ', plan:'Theo dõi dùng thử Composite A2 — lấy phản hồi', result:'Người gặp: BS. Vũ Ngọc Lan (Giám đốc phòng khám)\n1. Actions Taken: Hướng dẫn kỹ thuật đắp lớp.' });
  W('Viet','2026-10-07','Đại lý Nha khoa Thành Công',{ product:'Dia-burs', process:'CHĂM SÓC SAU BÁN', plan:'Giao tài liệu khuyến mãi tháng 10' });
  W('Viet','2026-10-07','PK Nha khoa An Khang',{ product:'Jizai', process:'TÌM HIỂU', plan:'Thu thập thông tin phòng khám mới mở' });
  W('Viet','2026-10-08','BV Đa khoa Quốc tế Hải Phòng',{ product:'Jizai', process:'TIẾP CẬN', plan:'Giới thiệu Jizai cho khoa RHM (đi công tác Hải Phòng)' });
  W('Viet','2026-10-08','PK Nha khoa Sao Mai',{ product:'Mani Bond', process:'DEMO / DÙNG THỬ', plan:'Demo Mani Bond' });
  W('Viet','2026-10-09','PK Nha khoa Hạ Long Smile',{ product:'Composite (MMG)', process:'ĐÀM PHÁN', plan:'Báo giá Composite + Mani Bond' });
  /* tuần trước + tháng 9 — Viet */
  const pastV = [['2026-09-28','BV Răng Hàm Mặt TW Hà Nội','Jizai'],['2026-09-29','PK Nha khoa Kim','Composite (MMG)'],['2026-09-30','NPP Nam Dũng','Dia-burs'],['2026-10-01','PK Nha khoa Minh Anh','Composite (MMG)'],['2026-10-02','PK Nha khoa An Khang','Jizai'],
    ['2026-09-21','Đại lý Nha khoa Thành Công','Hand files'],['2026-09-22','PK Nha khoa Sao Mai','Mani Bond'],['2026-09-23','BV Đa khoa Quốc tế Hải Phòng','Jizai'],['2026-09-24','Viện Đào tạo RHM – ĐH Y Hà Nội','Hand files'],
    ['2026-09-15','PK Nha khoa Minh Anh','Jizai'],['2026-09-16','BV Răng Hàm Mặt TW Hà Nội','Dia-burs'],['2026-09-17','PK Nha khoa Hạ Long Smile','Composite (MMG)'],['2026-09-09','PK Nha khoa Kim','Jizai'],['2026-09-10','NPP Nam Dũng','Composite (MMG)'],['2026-09-03','BV Răng Hàm Mặt TW Hà Nội','Jizai']];
  pastV.forEach((x, i) => W('Viet', x[0], x[1], { product: x[2], process: MASTER_VN.process[i % 5], feedback: MASTER_VN.feedback[i % 3], status: i === 7 ? 'Cancel' : undefined, time: '1' + (i % 6) + ':0' + (i % 9) }));
  /* Vinh / Phuong */
  const vinh = [['2026-10-05','BV Răng Hàm Mặt Đà Nẵng'],['2026-10-06','PK Nha khoa Hải Châu'],['2026-10-07','PK Nha khoa Cố Đô'],['2026-10-08','NPP S.P.I'],['2026-10-09','Khoa RHM – ĐH Y Dược Huế'],['2026-09-29','PK Nha khoa Vinh Smile'],['2026-09-30','BV Răng Hàm Mặt Đà Nẵng'],['2026-09-23','PK Nha khoa Cố Đô'],['2026-09-16','PK Nha khoa Hải Châu'],['2026-09-10','NPP S.P.I']];
  vinh.forEach((x, i) => W('Vinh', x[0], x[1], { product: MASTER_VN.product[i % 5], process: MASTER_VN.process[(i + 1) % 5], lat:'16.06' + i, lng:'108.2' + i }));
  const phuong = [['2026-10-05','BV Răng Hàm Mặt TP.HCM'],['2026-10-06','PK Nha khoa Sài Gòn Xanh'],['2026-10-07','PK Nha khoa Tây Đô'],['2026-10-08','PK Nha khoa Tâm Đức'],['2026-10-09','NPP Meci'],['2026-09-28','NPP Việt Thái'],['2026-09-29','PK Nha khoa Bình Dương Care'],['2026-09-30','Đại lý Nha khoa Phú Nhuận'],['2026-09-22','BV Răng Hàm Mặt TP.HCM'],['2026-09-15','PK Nha khoa Tâm Đức'],['2026-09-08','PK Nha khoa Sài Gòn Xanh']];
  phuong.forEach((x, i) => W('Phuong', x[0], x[1], { product: MASTER_VN.product[(i + 2) % 6], process: MASTER_VN.process[i % 5], lat:'10.7' + (60 + i), lng:'106.6' + (60 + i) }));

  /* ── công việc trong tháng ── */
  let mr = 4, mno = 1;
  const M = (pic, tt, per, plan, result) => D.monthly.push({ _row: mr++, no: mno++, typeTask: tt, pic, area: pic === 'Viet' ? 'North' : pic === 'Vinh' ? 'Central' : 'South', fy: fyOfIso(per.slice(0,4) + '-' + per.slice(4) + '-01'), period: per, plan, result });
  M('Viet','Sale-Hospital','202610','1. Customer visit:\n- Focus areas: Hà Nội, Hải Phòng\n- Key Account: BV RHM TW Hà Nội, BV ĐKQT Hải Phòng\n- Focus products: Jizai, Dia-burs\n\n2. Key customer Follow up\n- Main Action: Demo Jizai cho khoa Nội nha\n- Highlight result: \n- Issue and Corrective action: ', '1. Customer visit:\n- Focus areas: Hà Nội\n- Key Account: BV RHM TW Hà Nội (demo 05/10)\n- Focus products: Jizai\n\n2. Key customer Follow up\n- Main Action: Demo cho 6 bác sĩ\n- Highlight result: 2 bác sĩ đăng ký dùng thử\n- Issue and Corrective action: Chờ phòng vật tư báo giá');
  M('Viet','Sale-Clinics','202610','1. Customer visit:\n- Focus areas: Hà Nội, Bắc Ninh, Quảng Ninh\n- Key Account: PK Kim, PK Minh Anh, PK Hạ Long Smile\n- Focus products: Composite, Mani Bond\n\n2. Key customer Follow up\n- Main Action: Dùng thử Composite A2\n- Highlight result / Sale Impact: \n- Issue and Corrective action: ', '1. Customer visit:\n- Focus areas: Hà Nội\n- Key Account: PK Kim (chốt Dia-burs), PK Minh Anh (dùng thử)\n- Focus products: Composite, Dia-burs\n\n2. Key customer Follow up\n- Main Action: Chốt đơn Q4 PK Kim\n- Highlight result / Sale Impact: Đơn 30 vỉ Dia-burs\n- Issue and Corrective action: —');
  M('Viet','Sale-Distributor','202610','Distributor Name: Nam Dũng\n1. Coordination & Support Activities\n- Meeting: họp kế hoạch Q2\n- Fieldwork: 4 ngày đi kèm\n- Co-marketing: workshop Jizai 24/10\n\n2. Distributor sales activities\n- Focus areas: Hà Nội, Hải Phòng\n- Focus products: Jizai, Composite\n- Tender: BV RHM TW\n\n3. Distributor marketing activities: tờ rơi KM tháng 10','');
  M('Viet','Sale-Hospital','202609','1. Customer visit:\n- Focus areas: Hà Nội\n- Key Account: BV RHM TW Hà Nội\n- Focus products: Jizai','1. Customer visit:\n- Focus areas: Hà Nội\n- Key Account: BV RHM TW (2 lượt)\n- Focus products: Jizai, Dia-burs\n\n2. Key customer Follow up\n- Highlight result: Được mời demo tháng 10');
  M('Viet','Sale-Clinics','202609','1. Customer visit:\n- Focus areas: Hà Nội, Hải Phòng\n- Key Account: PK Kim, PK Sao Mai','1. Customer visit:\n- 6 lượt phòng khám\n- Mở mới PK Minh Anh (15/09)\n\n2. Key customer Follow up\n- Highlight result / Sale Impact: 3 đơn hàng mới');
  M('Vinh','Sale-Clinics','202610','1. Customer visit:\n- Focus areas: Đà Nẵng, Huế\n- Key Account: PK Hải Châu, PK Cố Đô','');
  M('Phuong','Sale-Hospital','202610','1. Customer visit:\n- Focus areas: TP.HCM\n- Key Account: BV RHM TP.HCM','');
  /* ── thuyết trình ── */
  let pr = 4;
  [['Viet','BV Răng Hàm Mặt TW Hà Nội','2026-10-05','Demo Jizai — khoa Nội nha. Bác sĩ đánh giá cao độ dẻo.',8,6],['Viet','Viện Đào tạo RHM – ĐH Y Hà Nội','2026-09-24','Giới thiệu bộ trâm tay cho lớp thực hành nội nha.',30,26],
   ['Viet','PK Nha khoa Kim','2026-09-09','Case lâm sàng Composite MMG.',5,5],['Vinh','BV Răng Hàm Mặt Đà Nẵng','2026-09-30','Jizai cho nhóm bác sĩ trẻ.',12,10],['Phuong','BV Răng Hàm Mặt TP.HCM','2026-09-22','Dia-burs & Mani Bond.',15,11],['Phuong','PK Nha khoa Tâm Đức','2026-10-08','Composite MMG — kỹ thuật đắp lớp.',6,'']]
   .forEach((x, i) => { const c = byName[x[1]]; D.present.push({ _row: pr++, no: i + 1, account: acc(c), pic: x[0], province: c.province, area: c.area, fy: fyOfIso(x[2]), month: ymOf(x[2]), day: x[2], folder: 'https://drive.google.com/drive/folders/1FAKEFOLDERPRESENT' + i, review: x[3], target: x[4], actual: x[5] }); });
  /* ── ADP ── */
  let ar = 4;
  [['Viet','BV Răng Hàm Mặt TW Hà Nội','A','Khoa Nội nha 12 bác sĩ, đang dùng trâm hãng khác','Ưu tiên độ bền, cần chứng minh hiệu quả lâm sàng','Chuyển 50% lượng trâm máy sang Jizai','Demo + dùng thử 2 tuần, mời hội thảo','Demo 05/10, dùng thử đến 20/10',12000,3100],
   ['Viet','PK Nha khoa Kim','B','Phòng khám 4 ghế, mua qua NPP Nam Dũng','Nhạy giá, mua theo quý','Đơn Dia-burs đều mỗi quý','Gói KM quý, chăm sóc 2 tuần/lần','Chốt đơn quý 4',4000,1450],
   ['Viet','BV Đa khoa Quốc tế Hải Phòng','B','Khoa RHM mới mở rộng','Chưa có nhà cung cấp ổn định','Vào danh mục thầu 2027','Gặp trưởng khoa, gửi hồ sơ năng lực','Đi công tác 08/10',6000,0],
   ['Viet','PK Nha khoa Minh Anh','C','Phòng khám mới mở 09/2026','Bác sĩ trẻ, thích công nghệ mới','Dùng Composite MMG làm vật liệu chính','Dùng thử A2, đào tạo kỹ thuật','Theo dõi dùng thử',2500,600],
   ['Viet','NPP Nam Dũng','A','NPP miền Bắc','Cần hỗ trợ đi kèm & marketing','Tăng 15% doanh số Dental','Workshop Jizai, đi kèm 4 ngày/tháng','Họp kế hoạch Q2',60000,14200],
   ['Vinh','BV Răng Hàm Mặt Đà Nẵng','A','Bệnh viện tuyến cuối miền Trung','Ưu tiên hàng Nhật','Vào thầu Jizai','Demo, hồ sơ thầu','',9000,2300],
   ['Phuong','BV Răng Hàm Mặt TP.HCM','A','Bệnh viện lớn, nhiều khoa','Đấu thầu tập trung','Giữ thầu Dia-burs','Chăm sóc phòng vật tư','',15000,4200]]
   .forEach((x, i) => { const c = byName[x[1]]; const m = [x[9] * 0.55, x[9] * 0.45]; D.adp.push({ _row: ar++, no: i + 1, account: acc(c), pic: x[0], fy: 'FY68', abcd: x[2], caseInfo: x[3], analysis: x[4], objective: x[5], tactic: x[6], keyAction: x[7], targetAmt: x[8], actualAmt: x[9],
     m09: Math.round(m[0]), m10: Math.round(m[1]), m11: '', rQ1: '', m12: '', m01: '', m02: '', rQ2: '', m03: '', m04: '', m05: '', rQ3: '', m06: '', m07: '', m08: '', rQ4: '', rFY: '', created: '2026-09-0' + (i + 2) + ' 09:00', updated: '2026-10-0' + (1 + i % 6) + ' 16:20' }); });
  return D;
}

/* ═════════════ DỮ LIỆU NHÓM THÁI (tiếng Anh) ═════════════ */
const MASTER_TH = {
  pic: ['Dao','Miew'], accountType: ['Hospital','Clinic','Distributor'], typeTask: ['Sale-Hospital','Sale-Clinics','Sale-Distributor','Marketing-Event','Management-KPI'],
  typeAction: ['Visiting','Phone call','Online meeting','Co-visit with distributor'], process: ['IDENTIFY','APPROACH','DEMO / TRIAL','NEGOTIATE','CLOSE','AFTER-SALES'],
  status: ['Not started','In Progress','Completed','Cancel'], feedback: ['Positive','Neutral','Need more info','Not satisfied'], product: ['Ophthalmic knife','Ophthalmic suture','Manipler','MVR knife'],
  area: ['Bangkok','Central','North','Northeast','South'], fy: ['FY68'], province: ['Bangkok','Chiang Mai','Khon Kaen','Nakhon Ratchasima','Songkhla','Phitsanulok'],
  jobTitle: ['Head of Department','Surgeon','Purchasing Manager','Distributor sales'], role: ['Decision maker','Influencer','User'], influence: ['High','Medium','Low'],
  nextAction: ['Tiếp tục chăm - Tăng tốc','Tiếp tục chăm - Duy trì','Chờ - Thử lại sau 30 ngày','Dừng lại']
};
const AREA_TH = { Bangkok:'Bangkok','Chiang Mai':'North','Khon Kaen':'Northeast','Nakhon Ratchasima':'Northeast',Songkhla:'South',Phitsanulok:'North' };
function buildTH(){
  const D = { customer:[], cbc:[], order:[], npp:[], monthly:[], weekly:[], present:[], adp:[] }, byName = {};
  const C = [['BKK-HP0001','Rajavithi Eye Center (demo)','Hospital','Bangkok','Dao'],['BKK-HP0002','Siam Vision Hospital (demo)','Hospital','Bangkok','Miew'],['CMI-HP0001','Lanna Eye Hospital (demo)','Hospital','Chiang Mai','Miew'],
    ['KKN-HP0001','Isan Eye Clinic (demo)','Clinic','Khon Kaen','Dao'],['NMA-HP0001','Korat Surgical Center (demo)','Hospital','Nakhon Ratchasima','Miew'],['SKA-CL0001','Hat Yai Eye Care (demo)','Clinic','Songkhla','Dao'],['BKK-DT0001','Bangkok Medical Supply (demo)','Distributor','Bangkok','Dao']];
  C.forEach((c, i) => { const o = { _row: 4 + i, code: c[0], name: c[1], type: c[2], address: c[3], province: c[3], area: AREA_TH[c[3]], pic: c[4], fy: 'FY68', openDate: '2025-0' + (i + 1) + '-10', openMonth: '20250' + (i + 1), nCbc: 1, nOrder: 0, note: '' }; D.customer.push(o); byName[c[1]] = o;
    D.cbc.push({ _row: 4 + i, code: c[0], cbcCode: c[0] + '-01', type: c[2], name: c[1], address: c[3], province: c[3], area: AREA_TH[c[3]], pic: c[4], cbcNo: 1, contact: ['Dr. Somchai P.','Dr. Nattaya K.','Dr. Anan S.','Dr. Pimchanok R.','Dr. Kittipong W.','Dr. Supaporn L.','Khun Chai T.'][i], phone: '080 000 01' + i + '0', jobTitle: i === 6 ? 'Distributor sales' : 'Surgeon', specialize: 'Ophthalmology', role: 'Decision maker', influence: 'High', trust: '', note: '', log: '' }); });
  let wr = 4, wno = 1;
  const W = (pic, start, cn, o) => { const c = byName[cn]; o = o || {}; const st = o.status || (start < '2026-10-07' ? 'Completed' : 'Not started'); const ct = D.cbc.find(x => x.code === c.code);
    D.weekly.push({ _row: wr++, no: wno++, fy: 'FY68', month: ymOf(start), start, finish: start, pic, account: `${c.name}/${c.type}/${c.province}/${c.area}`, type: c.type, province: c.province, area: c.area, product: o.product || 'Ophthalmic knife',
      typeTask: c.type === 'Hospital' ? 'Sale-Hospital' : c.type === 'Clinic' ? 'Sale-Clinics' : 'Sale-Distributor', typeAction: o.ta || 'Visiting', process: o.process || 'APPROACH', plan: o.plan || 'Introduce MVR knife and suture range',
      result: st === 'Completed' ? `Person met: ${ct.contact} (${ct.jobTitle})\n1. Actions Taken: Product presentation and samples.\n2. Current Situation: Using a competitor knife.\n3. Customer Feedback: Interested in the sharpness, asked for a price list.\n4. Opportunities / Next Steps: Trial for 2 weeks via distributor.` : '',
      status: st, feedback: st === 'Completed' ? 'Positive' : '', nextAction: st === 'Completed' ? 'Tiếp tục chăm - Tăng tốc' : '', stopReason: '', photo: '', gpsInfo: '' }); };
  [['Dao','2026-10-05','Rajavithi Eye Center (demo)'],['Dao','2026-10-06','Bangkok Medical Supply (demo)',{ta:'Co-visit with distributor'}],['Dao','2026-10-07','Isan Eye Clinic (demo)',{status:'In Progress'}],['Dao','2026-10-08','Hat Yai Eye Care (demo)'],
   ['Miew','2026-10-05','Siam Vision Hospital (demo)',{product:'Manipler'}],['Miew','2026-10-06','Korat Surgical Center (demo)',{product:'Manipler'}],['Miew','2026-10-07','Lanna Eye Hospital (demo)'],['Miew','2026-10-09','Siam Vision Hospital (demo)',{product:'Ophthalmic suture'}],
   ['Dao','2026-09-29','Rajavithi Eye Center (demo)'],['Miew','2026-09-30','Lanna Eye Hospital (demo)'],['Dao','2026-09-22','Isan Eye Clinic (demo)']].forEach(x => W(x[0], x[1], x[2], x[3]));
  D.monthly.push({ _row:4, no:1, typeTask:'Sale-Hospital', pic:'Dao', area:'Bangkok', fy:'FY68', period:'202610', plan:'1. Customer visit:\n- Focus areas: Bangkok\n- Key Account: Rajavithi\n- Focus products: MVR knife', result:'' });
  return D;
}

/* ═════════════ CÔNG VIỆC KHÁC (sheet ALL TASK) ═════════════ */
function allTasks(team){
  let row = 7;
  const K = (keyTask, type, pic, start, planned, subs) => {
    const k = { row: row++, no: '', fy: 'FY68', month: ymOf(start), type, keyTask, subTask: '', pic, result: '', start, planned, revised: '', leadtime: '', status: 'In Progress', progress: 0, actual: '', priority: false, priorityMailAt: '', vSrc: '', vMeta: null, subs: [] };
    subs.forEach(s => { const o = { row: row++, fy: 'FY68', month: ymOf(s[2]), type, keyTask: '', subTask: s[0], name: s[0], pic: s[1] || pic, result: s[6] || '', start: s[2], planned: s[3], revised: s[7] || '', leadtime: '', status: s[4], progress: s[5], actual: '', priority: !!s[8], priorityMailAt: '', vSrc: '', vMeta: null }; k.subs.push(o); });
    const pc = k.subs.map(x => /complet/i.test(x.status) ? 100 : x.progress); k.progress = Math.round(pc.reduce((a, b) => a + b, 0) / pc.length);
    k.status = k.subs.every(x => /complet/i.test(x.status)) ? 'Completed' : k.progress > 0 ? 'In Progress' : 'To Do';
    return k;
  };
  let keys;
  if (team === 'thai') keys = [
    K('Tender — Rajavithi Eye Center FY68','Sales-Thailand Surgical','Dao','2026-10-01','2026-10-20',[['Prepare technical spec MVR knife','Dao','2026-10-05','2026-10-08','In Progress',50],['Price proposal to purchasing','Dao','2026-10-09','2026-10-12','To Do',0]]),
    K('Distributor support — October','Sales-Thailand Surgical','Miew','2026-10-01','2026-10-31',[['Stock check with distributor','Miew','2026-10-06','2026-10-06','Completed',100],['Q2 sales plan meeting','Miew','2026-10-13','2026-10-13','To Do',0]])];
  else keys = [
    K('Hồ sơ thầu BV Răng Hàm Mặt TW — Q4','Sales-Dental','Viet','2026-10-01','2026-10-20',[['Soạn TSKT mũi khoan Dia-burs','Viet','2026-10-05','2026-10-08','In Progress',50,'Bản nháp: https://docs.google.com/document/d/FAKE-TSKT'],['Báo giá Jizai cho phòng vật tư','Viet','2026-10-09','2026-10-12','To Do',0],['Nộp hồ sơ năng lực','Viet','2026-10-14','2026-10-16','To Do',0]]),
    K('Hỗ trợ NPP Nam Dũng — tháng 10','Sales-Dental','Viet','2026-10-01','2026-10-31',[['Đối soát tồn kho Composite tại NPP','Viet','2026-10-05','2026-10-06','Completed',100,'Đã gửi bảng đối soát cho NPP'],['Họp kế hoạch bán hàng Q2 với NPP','Viet','2026-10-12','2026-10-12','To Do',0],['Chuẩn bị workshop Jizai 24/10','Viet','2026-10-07','2026-10-20','In Progress',30,'',  '',true]]),
    K('Báo cáo & quản lý nhóm Dental','Sales-Dental','Viet','2026-10-01','2026-10-31',[['Họp tuần Dental Sales','Viet','2026-10-05','2026-10-05','Completed',100],['Cập nhật ADP Key account Q1','Viet','2026-09-28','2026-10-03','In Progress',60],['Báo cáo tháng 9','Viet','2026-10-01','2026-10-02','Completed',100]]),
    K('Thu thập báo giá đối thủ miền Trung','Sales-Dental','Vinh','2026-10-02','2026-10-16',[['Báo giá trâm máy tại Đà Nẵng','Vinh','2026-10-06','2026-10-09','In Progress',40],['Tổng hợp báo cáo','Vinh','2026-10-12','2026-10-16','To Do',0]]),
    K('Sự kiện Composite tại TP.HCM','Sales-Dental','Phuong','2026-10-01','2026-10-25',[['Mời bác sĩ tham dự','Phuong','2026-10-05','2026-10-15','In Progress',35],['Đặt hội trường','Phuong','2026-10-06','2026-10-08','Completed',100]])];
  keys.forEach((k, i) => { k.no = String(i + 1); k.subs.forEach((s, j) => { s.no = k.no + '.' + (j + 1); s.parentNo = k.no; }); });
  return keys;
}

/* ═════════════ CÔNG TÁC (file Business Trip) ═════════════ */
const TRIPS = [
  { no:'611', pic:'Viet', start:'2026-10-08', finish:'2026-10-09', dest:'Hai Phong, Quang Ninh', purpose:'Thăm khách hàng bệnh viện & phòng khám Hải Phòng, Quảng Ninh', expect:'Gặp trưởng khoa RHM BV ĐKQT Hải Phòng; 1 đơn Composite', ap:'Approved', rep:'' },
  { no:'598', pic:'Viet', start:'2026-10-01', finish:'2026-10-02', dest:'Bac Ninh', purpose:'Đi kèm sales NPP Nam Dũng tại Bắc Ninh, gặp PK Nha khoa An Khang', expect:'4 khách hàng phòng khám', ap:'Approved', rep:'' },
  { no:'590', pic:'Viet', start:'2026-09-22', finish:'2026-09-23', dest:'Hai Phong', purpose:'Đi kèm sales NPP Nam Dũng tại Hải Phòng', expect:'4 khách hàng phòng khám', ap:'Approved',
    rep:'1. Key Activities: Đi kèm NPP 2 ngày, thăm 5 phòng khám.\n2. Key Findings: Nhu cầu Composite tăng; đối thủ giảm giá 5%.\n3. Next Actions: Gửi chính sách KM quý cho NPP.' },
  { no:'615', pic:'Vinh', start:'2026-10-14', finish:'2026-10-16', dest:'Hue, Quang Tri', purpose:'Mở mới phòng khám tại Quảng Trị', expect:'2 khách hàng mới', ap:'Already sent propose email', rep:'' },
  { no:'609', pic:'Phuong', start:'2026-10-07', finish:'2026-10-09', dest:'Can Tho', purpose:'Chăm sóc khách hàng Cần Thơ & demo Composite', expect:'Demo cho 8 bác sĩ', ap:'Approved', rep:'' }
];
const dmy = iso => iso.slice(8,10) + '/' + iso.slice(5,7) + '/' + iso.slice(0,4);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1;
function tfTripsOut(pics){
  const today = '2026-10-07';
  return TRIPS.filter(t => pics.includes(t.pic)).map(t => {
    const days = daysBetween(t.start, t.finish), m = t.start.replace(/-/g, '').slice(0, 6);
    let s = { status:'To Do', pct:0 };
    if (/reject/i.test(t.ap)) s = { status:'Cancelled', pct:0 }; else if (t.rep) s = { status:'Completed', pct:100 };
    else if (/approv/i.test(t.ap)) s = today < t.start ? { status:'To Do', pct:0 } : today <= t.finish ? { status:'In Progress', pct:50 } : { status:'In Progress', pct:75 };
    return { no:'BT' + t.no, row:0, keyTask:'Lịch công tác ' + m.slice(4,6) + m.slice(0,4), type:'Business trip', pic:t.pic,
      subTask:'Đi công tác ' + t.dest + ' · ' + days + ' ngày · Từ ' + dmy(t.start) + ' đến ' + dmy(t.finish),
      result:'Kế hoạch công tác\n1. Mục đích: ' + t.purpose + '\n2. Kết quả mong đợi: ' + t.expect + '\n\nCập nhật\n' + (t.rep || '(Chưa có Business trip Report)') + '\n\nPhê duyệt: ' + t.ap,
      start:t.start, planned:t.finish, revised:'', status:s.status, progress:s.pct, approval:t.ap, vSrc:'trip', vMeta:{ id:'T' + t.no + '|' + t.pic, r:600 + (+t.no % 100), m } };
  });
}
function tripInfo(id){
  const t = TRIPS.find(x => ('T' + x.no) === String(id).split('|')[0] || String(600 + (+x.no % 100)) === String(id) || x.no === String(id)) || TRIPS[0];
  const days = daysBetween(t.start, t.finish);
  return { ok:true, trip:{ id:600 + (+t.no % 100), no:t.no, pic:t.pic, hubPic:t.pic, dest:t.dest, start:t.start, finish:t.finish, days, co:'No', equip:'Laptop, Hàng mẫu', purpose:t.purpose, expect:t.expect,
    schedule: t.start === '2026-10-08' ? '08/10: Hà Nội → Hải Phòng, thăm BV ĐKQT Hải Phòng, PK Sao Mai\n09/10: Hải Phòng → Hạ Long, thăm PK Hạ Long Smile, về Hà Nội' : 'Theo lịch đi kèm NPP',
    estCost:'Công tác phí: 760.000\nXăng xe & cầu đường: 1.200.000\nKhách sạn: 900.000', total:2860000, approval:t.ap, approved:/approv/i.test(t.ap) && !/not/i.test(t.ap), folder:'https://drive.google.com/drive/folders/1FAKETRIPFOLDER',
    report:t.rep, reportDate:t.rep ? '2026-09-25' : '', canReport:/approv/i.test(t.ap), canEdit:!/approv/i.test(t.ap), canDelete:!/approv/i.test(t.ap) } };
}

/* ═════════════ ĐÀO TẠO (Training Hub rhSessions) ═════════════ */
const SESS = [
  { sid:'S20261007-01', date:'2026-10-07', timeFrom:'14:00', timeTo:'15:30', topic:'Jizai — kỹ thuật tạo hình ống tủy cho Sales', trainer:'Giang', audience:'MMH - Dental Sales team', status:'Plan', type:'Internal', category:'Product', invited:true, canEdit:false, location:'Phòng họp tầng 5', people:['Viet','Vinh','Phuong','Giang'] },
  { sid:'S20261009-01', date:'2026-10-09', timeFrom:'09:00', timeTo:'10:00', topic:'Composite MMG — case lâm sàng & USP', trainer:'Giang', audience:'MMH - Dental Sales team', status:'Plan', type:'Internal', category:'Product', invited:true, canEdit:false, location:'Online · Google Meet', people:['Viet','Vinh','Phuong','Giang'] },
  { sid:'S20261002-01', date:'2026-10-02', timeFrom:'15:00', timeTo:'16:00', topic:'Quy trình đề xuất & báo cáo công tác', trainer:'Tuyen', audience:'MMH - Sales team', status:'Done', type:'Internal', category:'SOP', invited:true, canEdit:false, location:'Phòng họp tầng 5', people:['Viet','Vinh','Phuong','Khang','Viet Ha','Tuyen'] },
  { sid:'S20261006-01', date:'2026-10-06', timeFrom:'10:00', timeTo:'11:30', topic:'Ophthalmic knife — sản phẩm & thầu', trainer:'Giang', audience:'MMH - Surgical Sales team', status:'Done', type:'Internal', category:'Product', invited:true, canEdit:false, location:'Phòng họp tầng 5', people:['Khang','Viet Ha','Giang'] }
];

/* ═════════════ MỞ MỚI & SKU MỚI (sheet NEW ACCOUNT & SKU) ═════════════ */
function naRows(){
  const P = id => 'https://drive.google.com/file/d/1NAFILE' + id + 'xxxxxxxxxxxxxxxxxxxxxxx/view';
  const files = (k) => [{ id:'1NAFILE' + k + 'axxxxxxxxxxxxxxxxxxxxxxx', name:'Xac_nhan_NPP_' + k + '.jpg', url:P(k + 'a'), kind:'dist', mime:'image/jpeg', at:'2026-10-03 10:20' },
                        { id:'1NAFILE' + k + 'bxxxxxxxxxxxxxxxxxxxxxxx', name:'Hoa_don_don_dau_' + k + '.jpg', url:P(k + 'b'), kind:'order', mime:'image/jpeg', at:'2026-10-03 10:22' }];
  const base = { team:'Dental', fy:'FY68', folder:'https://drive.google.com/drive/folders/1FAKENAFOLDER', log:'' };
  return [
    Object.assign({}, base, { id:'NA-DE-261003102201-417', created:'2026-10-03 10:22', pic:'Viet', month:'202610', type:'new_account', kpi:'C1-01', account:'PK Nha khoa An Khang', code:'NBN-CL0001', accType:'Clinic', province:'Bắc Ninh', npp:'NPP Nam Dũng', ptype:'Composite', sku:'MMG Composite A2 4g', orderDate:'2026-10-02', orderNo:'SO-1052', qty:10, amount:5200000,
      lines:[{ sku:'MMG Composite A2 4g', qty:10, amount:5200000 }], weekly:'2 lượt trên báo cáo tuần · gần nhất 2026-10-02', note:'Phòng khám mới mở 4 ghế.', checklist:{ weekly:true, npp:true, format:true, order:true }, files:files('01'),
      status:'Pending', subAt:'2026-10-03 10:25', subTo:'Tuyen', decBy:'', decAt:'', comment:'', updated:'2026-10-03 10:25' }),
    Object.assign({}, base, { id:'NA-DE-260916090011-208', created:'2026-09-16 09:00', pic:'Viet', month:'202609', type:'new_account', kpi:'C1-01', account:'PK Nha khoa Minh Anh', code:'NHN-CL0002', accType:'Clinic', province:'Hà Nội', npp:'NPP Nam Dũng', ptype:'Jizai', sku:'JIZAI #25 .04 25mm', orderDate:'2026-09-15', orderNo:'SO-1031', qty:20, amount:9600000,
      lines:[{ sku:'JIZAI #25 .04 25mm', qty:20, amount:9600000 }], weekly:'3 lượt trên báo cáo tuần · gần nhất 2026-09-15', note:'', checklist:{ weekly:true, npp:true, format:true, order:true }, files:files('02'),
      status:'Approved', subAt:'2026-09-16 09:05', subTo:'Tuyen', decBy:'Tuyen', decAt:'2026-09-17 08:40', comment:'Đủ điều kiện', updated:'2026-09-17 08:40' }),
    Object.assign({}, base, { id:'NA-DE-260925143000-552', created:'2026-09-25 14:30', pic:'Viet', month:'202609', type:'new_sku', kpi:'C1-01', account:'PK Nha khoa Kim', code:'NHN-CL0001', accType:'Clinic', province:'Hà Nội', npp:'NPP Nam Dũng', ptype:'Mani Bond', sku:'Mani Bond 5ml', orderDate:'2026-09-24', orderNo:'SO-1040', qty:6, amount:4140000,
      lines:[{ sku:'Mani Bond 5ml', qty:6, amount:4140000 }], weekly:'4 lượt trên báo cáo tuần · gần nhất 2026-09-29', note:'SKU mới: lần đầu mua Mani Bond.', checklist:{ weekly:true, npp:false, format:true, order:true }, files:files('03').slice(1),
      status:'Draft', subAt:'2026-09-25 14:35', subTo:'Tuyen', decBy:'Tuyen', decAt:'2026-09-26 09:10', comment:'Bổ sung ảnh xác nhận của NPP Nam Dũng giúp anh', updated:'2026-09-26 09:10' }),
    Object.assign({}, base, { id:'NA-DE-261005161500-731', created:'2026-10-05 16:15', pic:'Vinh', month:'202609', type:'new_account', kpi:'C1-02', account:'PK Nha khoa Cố Đô', code:'CHU-CL0001', accType:'Clinic', province:'Huế', npp:'NPP S.P.I', ptype:'Dia-burs', sku:'DIA-BURS FG TR-13', orderDate:'2026-09-29', orderNo:'SO-1046', qty:30, amount:2850000,
      lines:[{ sku:'DIA-BURS FG TR-13', qty:30, amount:2850000 }], weekly:'2 lượt trên báo cáo tuần · gần nhất 2026-10-07', note:'', checklist:{ weekly:true, npp:true, format:true, order:true }, files:files('04'),
      status:'Pending', subAt:'2026-10-05 16:20', subTo:'Viet, Tuyen', decBy:'', decAt:'', comment:'', updated:'2026-10-05 16:20' }),
    Object.assign({}, base, { id:'NA-DE-261001110000-119', created:'2026-10-01 11:00', pic:'Phuong', month:'202609', type:'new_account', kpi:'C1-03', account:'PK Nha khoa Tâm Đức', code:'SHC-CL0002', accType:'Clinic', province:'Hồ Chí Minh', npp:'NPP Meci', ptype:'Composite', sku:'MMG Composite A3 4g', orderDate:'2026-09-29', orderNo:'SO-1047', qty:12, amount:6240000,
      lines:[{ sku:'MMG Composite A3 4g', qty:12, amount:6240000 }], weekly:'1 lượt trên báo cáo tuần · gần nhất 2026-09-15', note:'', checklist:{ weekly:true, npp:true, format:true, order:true }, files:files('05'),
      status:'Approved', subAt:'2026-10-01 11:05', subTo:'Viet, Tuyen', decBy:'Viet', decAt:'2026-10-02 08:30', comment:'', updated:'2026-10-02 08:30' })
  ];
}

/* ═════════════ KPI ═════════════ */
const FYM = ['202609','202610','202611','202612','202701','202702','202703','202704','202705','202706','202707','202708'];
const KPI_DEF = {
  Viet: [ ['F1-01','Sales – Turnover','MMH Sales Amount to Distributors – Dental & MMG Vietnam North','USD','Lũy kế',0.30,[18000,36000,55000,74000,92000,110000,130000,150000,170000,190000,210000,230000],[16800,30900]],
          ['C1-01','Sales – New Customer Accounts','Number of New Customer Accounts & New SKU Listings – Vietnam North','Account','Cộng dồn',0.15,[2,2,2,2,2,2,2,2,2,2,2,2],[2,1]],
          ['C3-01','Sales – Customer Visits & Co-visits','Number of Customer Visits – Vietnam North','Visit','Cộng dồn',0.15,[24,24,24,20,24,24,24,24,24,24,20,20],[22,9]],
          ['C4-01','Sales – Customer Visits & Co-visits','Number of Co-visits with Distributor Sales Representatives – Nam Dung – Vietnam North','Visit','Cộng dồn',0.10,[4,4,4,4,4,4,4,4,4,4,4,4],[5,1]],
          ['C6-01','Sales – Sales Supported by MMH Team','Sales Quantity Supported by MMH Team – Composite – Vietnam North','Pcs','Cộng dồn',0.10,[40,40,40,40,40,40,40,40,40,40,40,40],[46,12]],
          ['C7-01','Sales – Sales Supported by MMH Team','Sales Quantity Supported by MMH Team – Jizai – Vietnam North','Pcs','Cộng dồn',0.10,[30,30,30,30,30,30,30,30,30,30,30,30],[24,20]],
          ['P2-01','People – Behaviour','Key Behavioural Indicator Score','Point','Bình quân',0.10,[4,4,4,4,4,4,4,4,4,4,4,4],[4.2,null]] ],
  Vinh: [ ['F1-02','Sales – Turnover','MMH Sales Amount to Distributors – Dental & MMG Vietnam Central','USD','Lũy kế',0.30,[9000,18000,27000,36000,45000,54000,63000,72000,81000,90000,99000,108000],[9800,15600]],
          ['C1-02','Sales – New Customer Accounts','Number of New Customer Accounts & New SKU Listings – Vietnam Central','Account','Cộng dồn',0.15,[1,1,1,1,1,1,1,1,1,1,1,1],[1,0]],
          ['C3-02','Sales – Customer Visits & Co-visits','Number of Customer Visits – Vietnam Central','Visit','Cộng dồn',0.25,[20,20,20,16,20,20,20,20,20,20,16,16],[17,6]],
          ['C7-02','Sales – Sales Supported by MMH Team','Sales Quantity Supported by MMH Team – Jizai – Vietnam Central','Pcs','Cộng dồn',0.20,[20,20,20,20,20,20,20,20,20,20,20,20],[15,6]],
          ['P2-01','People – Behaviour','Key Behavioural Indicator Score','Point','Bình quân',0.10,[4,4,4,4,4,4,4,4,4,4,4,4],[3.8,null]] ],
  Phuong: [ ['F1-03','Sales – Turnover','MMH Sales Amount to Distributors – Dental & MMG Vietnam South','USD','Lũy kế',0.30,[15000,30000,45000,60000,75000,90000,105000,120000,135000,150000,165000,180000],[17500,33100]],
          ['C1-03','Sales – New Customer Accounts','Number of New Customer Accounts & New SKU Listings – Vietnam South','Account','Cộng dồn',0.15,[2,2,2,2,2,2,2,2,2,2,2,2],[1,0]],
          ['C3-03','Sales – Customer Visits & Co-visits','Number of Customer Visits – Vietnam South','Visit','Cộng dồn',0.25,[24,24,24,20,24,24,24,24,24,24,20,20],[25,8]],
          ['C6-03','Sales – Sales Supported by MMH Team','Sales Quantity Supported by MMH Team – Composite – Vietnam South','Pcs','Cộng dồn',0.20,[40,40,40,40,40,40,40,40,40,40,40,40],[38,9]],
          ['P2-01','People – Behaviour','Key Behavioural Indicator Score','Point','Bình quân',0.10,[4,4,4,4,4,4,4,4,4,4,4,4],[4.0,null]] ],
  Dao: [ ['F1-21','Sales – Turnover','MMH Sales Amount to Distributors – Thailand','USD','Lũy kế',0.30,[12000,24000,36000,48000,60000,72000,84000,96000,108000,120000,132000,144000],[11800,20500]],
         ['C2-01','Sales – New Customer Accounts','Number of New Accounts & New SKU Listings – Thailand','Account','Cộng dồn',0.20,[1,1,1,1,1,1,1,1,1,1,1,1],[1,0]],
         ['C3-21','Sales – Customer Visits & Co-visits','Number of Customer Visits – Thailand','Visit','Cộng dồn',0.25,[16,16,16,16,16,16,16,16,16,16,16,16],[18,6]],
         ['P2-01','People – Behaviour','Key Behavioural Indicator Score','Point','Bình quân',0.25,[4,4,4,4,4,4,4,4,4,4,4,4],[4.1,null]] ],
  Miew: [ ['C2-03','Sales – New Customer Accounts','Number of New Accounts & New SKU Listings – Manipler – Thailand','Account','Cộng dồn',0.30,[1,1,1,1,1,1,1,1,1,1,1,1],[1,1]],
          ['C3-22','Sales – Customer Visits & Co-visits','Number of Customer Visits – Thailand','Visit','Cộng dồn',0.40,[16,16,16,16,16,16,16,16,16,16,16,16],[15,7]],
          ['P2-01','People – Behaviour','Key Behavioural Indicator Score','Point','Bình quân',0.30,[4,4,4,4,4,4,4,4,4,4,4,4],[3.9,null]] ]
};
const STAFF = { Viet:{ full:'Nguyễn Minh Việt (demo)', title:'Dental Sales Team Leader', role:'Team Leader', team:'Dental Sales team', dept:'Sales & Marketing VN', level:'Leader' },
  Vinh:{ full:'Trần Quang Vinh (demo)', title:'Dental Sales PIC — Central', role:'', team:'Dental Sales team', dept:'Sales & Marketing VN', level:'Staff' },
  Phuong:{ full:'Lê Thu Phương (demo)', title:'Dental Sales PIC — South', role:'', team:'Dental Sales team', dept:'Sales & Marketing VN', level:'Staff' },
  Tuyen:{ full:'Trần Thanh Tuyền (demo)', title:'Head of Sales & Marketing VN', role:'HOD', team:'Sales & Marketing VN', dept:'Sales & Marketing VN', level:'Manager' },
  Giang:{ full:'Phạm Hương Giang (demo)', title:'Product Team Leader', role:'Team Leader', team:'Product team', dept:'Sales & Marketing VN', level:'Leader' },
  Dao:{ full:'Dao S. (demo)', title:'Thailand Surgical Team Leader', role:'Team Leader', team:'Thailand Surgical team', dept:'Sales Thailand', level:'Leader' },
  Miew:{ full:'Miew K. (demo)', title:'Thailand Surgical Sales PIC', role:'', team:'Thailand Surgical team', dept:'Sales Thailand', level:'Staff' } };
const nz = v => v == null ? null : v;
function rkvRows(members){
  const periods = ['FY68','Q1','Q2','Q3','Q4'].concat(FYM), out = [];
  members.forEach(mem => (KPI_DEF[mem] || []).forEach(d => {
    const [code, group, name, unit, agg, w, t, a] = d, last = /Lũy kế/.test(agg), avg = /Bình quân/.test(agg);
    const tm = FYM.map((m, i) => last ? (i ? t[i] - t[i - 1] : t[0]) : t[i]);
    const am = FYM.map((m, i) => i < a.length && a[i] != null ? (last ? (i ? a[i] - a[i - 1] : a[0]) : a[i]) : null);
    const agg2 = (idx) => { const T = idx.map(i => tm[i]), A = idx.map(i => am[i]).filter(x => x != null); if (avg) return [4, A.length ? A.reduce((x, y) => x + y, 0) / A.length : null]; return [T.reduce((x, y) => x + y, 0), A.length ? A.reduce((x, y) => x + y, 0) : null]; };
    const per = p => { let ta; if (p === 'FY68') ta = agg2([0,1,2,3,4,5,6,7,8,9,10,11]); else if (/^Q/.test(p)){ const q = +p[1] - 1; ta = agg2([q*3, q*3+1, q*3+2]); } else { const i = FYM.indexOf(p); ta = [tm[i], am[i]]; }
      const pc = ta[1] == null ? null : Math.min(1.3, ta[1] / ta[0]); return [ta[0], ta[1], w, pc, pc == null ? null : pc * w]; };
    out.push({ dept: STAFF[mem].dept, member: mem, pos: STAFF[mem].title, code, group, name, unit, agg: agg, v: periods.map(per) });
  }));
  return { periods, rows: out };
}
function crmKpi(team){
  const pics = team === 'thai' ? ['Dao','Miew'] : ['Viet','Vinh','Phuong'];
  const P = pics.map(pic => {
    const rows = (KPI_DEF[pic] || []).map(d => {
      const [code, group, name, unit, agg, w, t, a] = d, last = /Lũy kế/.test(agg);
      const tt = t.map((v, i) => last ? (i ? v - t[i - 1] : v) : v), aa = FYM.map((m, i) => i < a.length ? nz(a[i]) : null).map((v, i) => v == null ? null : (last ? (i ? v - a[i - 1] : v) : v));
      const tFY = last ? t[11] : tt.reduce((x, y) => x + y, 0), aFY = aa.filter(x => x != null).reduce((x, y) => x + y, 0);
      const tYtd = last ? t[1] : tt[0] + tt[1];
      const q = [0, 1, 2, 3].map(k => { if (k) return null; const T = tt.slice(0, 3).reduce((x, y) => x + y, 0); return Math.min(1.3, aFY / T); });
      return { code, name, unit, agg, w, tFY, aFY, pct: aFY / tFY, ytd: Math.min(1.3, aFY / tYtd), t: last ? t.map((v, i) => i ? v - t[i - 1] : v) : tt, a: aa, q, manual: /^F/.test(code) };
    });
    const sw = rows.reduce((x, r) => x + r.w, 0), score = rows.reduce((x, r) => x + r.w * r.ytd, 0) / sw;
    return { pic, role: STAFF[pic].title, total: { pct: rows.reduce((x, r) => x + r.w * r.pct, 0) / sw, ytd: score, score, w: sw, q: [score, null, null, null] }, rows };
  });
  const groups = team === 'thai' ? [] : [
    { code:'F1', name:'Doanh số NPP Dental & MMG', unit:'USD', tFY:518000, aFY:79600, ytd:0.948, pct:0.154 },
    { code:'C1', name:'Mở mới khách hàng / SKU', unit:'Account', tFY:60, aFY:5, ytd:0.833, pct:0.083 },
    { code:'C3', name:'Viếng thăm khách hàng', unit:'Visit', tFY:780, aFY:87, ytd:0.637, pct:0.112 },
    { code:'C6', name:'SL Composite hỗ trợ bán', unit:'Pcs', tFY:960, aFY:105, ytd:0.656, pct:0.109 } ];
  return { ok:true, v68:true, fy:'FY68', prevFY:'FY67', quarters:[['202609','202610','202611'],['202612','202701','202702'],['202703','202704','202705'],['202706','202707','202708']],
    months:FYM, monthLabels:FYM.map(m => 'T' + (+m.slice(4))), groups, pics:P, blocks:[], partA:[], settings:{ cur:'202610', sync:'07/10/2026 08:55', checked:'07/10/2026 09:00', hasLink:true, rateVal:26050 }, npp:{} };
}
function totalKpi(){
  const months = FYM;
  const mk = (code, parent, level, p, group, seg, name, unit, agg, tgt, act, mem) => { const t = months.map((_, i) => Math.round(tgt / 12)), a = months.map((_, i) => i < 2 ? Math.round(act / 2) : null);
    return { code, parent, level, gc:code.slice(0,2), p, group, seg, name, unit, agg, ref:'', fy67:Math.round(tgt * 0.88), tgt, act, pct:act / tgt, mem, t, a }; };
  return { ok:true, v:'1.3', me:'Nguyen Ha', scope:'all', sync:[{ src:'MMH_Dental_CRM', at:'2026-10-07 08:55' },{ src:'MMH_Surgical_CRM', at:'2026-10-07 08:56' }],
    head:[{ label:'FY68 BUDGET', value:'2,450 KUSD', sub:'Toàn công ty (số giả lập)' },{ label:'ACTUAL YTD', value:'402 KUSD', sub:'Đến 10/2026' },{ label:'GROWTH', value:'+12%', sub:'so với FY67' },{ label:'RELAUNCH', value:'3', sub:'nhóm sản phẩm' }],
    persp:[{ k:'F', title:'Financial', obj:[{ code:'F1', obj:'Tăng doanh số NPP 12%', init:'Mở rộng Jizai & Composite', link:'F1-xx', anchor:'' }] },{ k:'C', title:'Customer', obj:[{ code:'C1', obj:'Mở mới khách hàng & SKU', init:'60 account mới', link:'C1-xx', anchor:'' },{ code:'C3', obj:'Tăng tần suất viếng thăm', init:'780 lượt / năm', link:'C3-xx', anchor:'' }] },
      { k:'P', title:'People', obj:[{ code:'P1', obj:'Đào tạo nội bộ', init:'24 buổi', link:'P1-xx', anchor:'' }] },{ k:'L', title:'Learning', obj:[{ code:'L1', obj:'Số hoá báo cáo', init:'CRM + Report Hub', link:'', anchor:'' }] }],
    kpi:[ mk('F1','', '1','F','Sales – Turnover','Total','MMH Sales Amount to Distributors – Total','USD','Lũy kế',2450000,402000,'All sales'),
      mk('F1-01','F1','2','F','Sales – Turnover','Dental & MMG Vietnam North','MMH Sales Amount to Distributors – Dental & MMG Vietnam North','USD','Lũy kế',230000,30900,'Viet'),
      mk('F1-02','F1','2','F','Sales – Turnover','Dental & MMG Vietnam Central','MMH Sales Amount to Distributors – Dental & MMG Vietnam Central','USD','Lũy kế',108000,15600,'Vinh'),
      mk('F1-03','F1','2','F','Sales – Turnover','Dental & MMG Vietnam South','MMH Sales Amount to Distributors – Dental & MMG Vietnam South','USD','Lũy kế',180000,33100,'Phuong'),
      mk('C1','', '1','C','Sales – New Customer Accounts','Total','Number of New Customer Accounts & New SKU Listings – Total','Account','Cộng dồn',60,8,'Sales'),
      mk('C3','', '1','C','Sales – Customer Visits & Co-visits','Total','Number of Customer Visits – Total','Visit','Cộng dồn',780,112,'Sales'),
      mk('M1','', '1','C','Marketing – Event Number','Total','Number of T&E Events Led by KOLs & Exhibitions – Vietnam','Event','Cộng dồn',24,4,'Marketing'),
      mk('P1','', '1','P','People – Training & Development','Total','Number of Internal Product Training Sessions','Session','Cộng dồn',24,5,'Product') ],
    months, rules:[{ group:'Sales – Turnover', kpis:'F1-01, F1-02, F1-03', vi:'Doanh số lũy kế bán cho NPP theo file Turnover; % = actual / target, không giới hạn.', en:'Cumulative distributor turnover from the Turnover file; % = actual / target, no cap.', ref:'MMH Turnover' },
      { group:'Sales – New Customer Accounts', kpis:'C1-01 … C1-05, C2-03', vi:'Chỉ tính case Approved trên CRM (Mở mới & SKU mới), tháng phát sinh đơn đầu tiên; tối đa 130%.', en:'Approved CRM cases only, month of first order; capped at 130%.', ref:'MMH CRM' },
      { group:'Sales – Customer Visits & Co-visits', kpis:'C3-xx, C4-xx', vi:'Số lượt Visiting có trạng thái Completed trên báo cáo tuần.', en:'Completed Visiting rows in the weekly report.', ref:'MMH CRM' }],
    guide:['Màu: xám < 90% · xanh 90–<100% · vàng 100–120% · xanh lá > 120%.','Số liệu trong tài liệu là số GIẢ LẬP.'],
    members:[['Sales & Marketing VN','Viet','Nguyễn Minh Việt (demo)','Dental Sales Team Leader',[0.82,0.91,0.74]],['Sales & Marketing VN','Vinh','Trần Quang Vinh (demo)','Dental Sales PIC — Central',[0.71,0.79,0.62]],['Sales & Marketing VN','Phuong','Lê Thu Phương (demo)','Dental Sales PIC — South',[0.95,1.04,0.86]],
      ['Sales & Marketing VN','Viet Ha','Đỗ Việt Hà (demo)','Surgical Sales PIC — North',[1.06,1.12,0.99]],['Sales & Marketing VN','Khang','Võ Minh Khang (demo)','Surgical Sales PIC — South',[0.88,0.93,0.81]],['Sales & Marketing VN','Giang','Phạm Hương Giang (demo)','Product Team Leader',[1.21,1.25,1.15]],['Sales Thailand','Dao','Dao S. (demo)','Thailand Surgical Team Leader',[0.97,1.01,0.92]]]
      .map(x => ({ dept:x[0], member:x[1], full:x[2], pos:x[3], v:x[4] })), mperiods:['FY68 TOTAL','Q1','202609'], colors:['< 90%','90% – < 100%','100% – 120%','> 120%'], at:'2026-10-07T01:55:00Z' };
}
function turnover(){
  const rows = [], NPP = [['Nam Dung','Viet'],['Meci','Phuong'],['Viet Thai Medical','Phuong'],['SPI','Vinh']];
  NPP.forEach((n, j) => FYM.forEach((m, i) => { ['Dental file and bur','MMG'].forEach((prod, k) => {
    const b = [9000, 6500, 5500, 4500][j] * (k ? 0.4 : 0.6), f = i < 2 ? Math.round(b * (0.85 + ((i + j + k) % 4) * 0.08)) : (i < 5 ? Math.round(b * 0.95) : 0);
    rows.push({ segment: k ? 'MMG' : 'Dental', distributor: n[0], month: m, budget: Math.round(b), forecast: f, product: prod, type: '1 Turnover', fy:'FY68' }); }); }));
  const jz = NPP.map((n, j) => FYM.slice(0, 2).map(m => ({ segment:'Dental', distributor:n[0], month:m, budget:60, forecast:40 + j * 8, product:'Jizai', type:'2 Jizai Qty' }))).flat();
  return { ok:true, rows, rowsJizai: jz, rowsComposite: [] };
}

/* ═════════════ ẢNH GIẢ (Drive thumbnail) ═════════════ */
const PHOTO_DIR = path.join(__dirname, 'photos');
function photoFor(url){
  let files = []; try { files = fs.readdirSync(PHOTO_DIR).filter(f => /\.jpg$/.test(f)).sort(); } catch(e){}
  if (!files.length) return null;
  const m = /PHOTO(\d+)|NAFILE(\d+)/.exec(url); const k = m ? +(m[1] || m[2]) : url.length;
  return fs.readFileSync(path.join(PHOTO_DIR, files[k % files.length]));
}

/* ═════════════ ROUTER ═════════════ */
function lean(tab, rows){ const cols = ['_row'].concat(COL[tab]); return { ok:true, tab, total:rows.length, offset:0, limit:15000, cols, lean:rows.map(r => cols.map(c => r[c] === undefined ? '' : r[c])) }; }
function filt(tab, rows, p){ return rows.filter(r => {
  if (p.pic && tab !== 'cbc' && tab !== 'npp'){ if (tab === 'order' ? String(r.pic).indexOf(p.pic) < 0 : r.pic !== p.pic) return false; }
  if (p.fy && tab !== 'cbc' && tab !== 'npp' && r.fy !== undefined && r.fy !== p.fy) return false;
  return true; }); }

async function install(page, opt){
  opt = opt || {};
  const team = opt.team || 'dental', me = opt.pic || 'Viet';
  const D = team === 'thai' ? buildTH() : buildVN(), master = team === 'thai' ? MASTER_TH : MASTER_VN;
  master.month = FYM.slice();
  const LOG = opt.log || [];
  const users = { 'mmh.hanoi':'Viet','mmh.danang':'Vinh','mmh.saigon':'Phuong','tt.tuyen':'Tuyen','nt.ha':'Nguyen Ha','mmh.product':'Giang','manithailand':'Dao','manithailand4':'Miew','mmh.saigon1':'Khang','mmh.hanoi2':'Viet Ha' };
  const sess = opt.session || {};
  const cidx = D.customer.map(c => ['_row','code','name','type','province','area','pic','fy','openDate','nCbc','nOrder','note'].map(k => k === '_row' ? c._row : c[k]));
  const picList = Object.keys(STAFF).filter(k => team === 'thai' ? ['Dao','Miew'].includes(k) : ['Viet','Vinh','Phuong','Tuyen','Giang'].includes(k))
    .map(k => ({ pic:k, email:k.toLowerCase().replace(/\s/g,'') + '@example.com', role:/Leader|HOD/.test(STAFF[k].role) ? 'manager' : 'pic', title:STAFF[k].title, initials:k.slice(0,2).toUpperCase(), team:STAFF[k].team, level:/Leader/.test(STAFF[k].role) ? 'lead' : 'pic' }));
  const AT = allTasks(team);
  let NA = naRows();
  let tfPend = [
    { row:615, no:'615', pic:'Vinh', start:'2026-10-14', finish:'2026-10-16', days:3, dest:'Hue, Quang Tri', co:'No', purpose:'Mở mới phòng khám tại Quảng Trị', expect:'2 khách hàng mới', estCost:'Công tác phí: 1.140.000\nXe khách: 900.000\nKhách sạn: 1.200.000', total:3240000, schedule:'14/10: Đà Nẵng → Huế\n15/10: Quảng Trị\n16/10: về Đà Nẵng', equip:'Hàng mẫu', status:'Already sent propose email' },
    { row:617, no:'617', pic:'Khang', start:'2026-10-20', finish:'2026-10-21', days:2, dest:'Can Tho', co:'No', purpose:'Demo dao mổ nhãn khoa tại BV Mắt Cần Thơ', expect:'Vào danh mục dùng thử', estCost:'Công tác phí: 760.000\nVé xe: 500.000\nKhách sạn: 600.000', total:1860000, schedule:'20/10: TP.HCM → Cần Thơ\n21/10: demo, về TP.HCM', equip:'Hàng mẫu, Laptop', status:'Already sent propose email' },
    { row:618, no:'618', pic:'Viet', start:'2026-10-26', finish:'2026-10-28', days:3, dest:'Ho Chi Minh', co:'Phuong', purpose:'Hỗ trợ workshop Jizai tại TP.HCM', expect:'40 bác sĩ tham dự', estCost:'Công tác phí: 1.140.000\nVé máy bay: 3.600.000\nKhách sạn: 2.400.000', total:7140000, schedule:'26/10: HN → HCM\n27/10: workshop\n28/10: về HN', equip:'Laptop, Standee', status:'Already sent propose email' } ];

  const handle = async route => {
    const req = route.request(), u = new URL(req.url());
    let p = Object.fromEntries(u.searchParams.entries());
    if (req.method() === 'POST'){ const raw = req.postData() || ''; try { Object.assign(p, JSON.parse(raw)); } catch(e){ const pd = new URLSearchParams(raw); pd.forEach((v, k) => p[k] = v); if (p.payload){ try { Object.assign(p, JSON.parse(p.payload)); } catch(_){} } } }
    const cb = p.callback, a = p.action || '', dep = u.pathname.split('/')[3] || '';
    const host = /AKfycbwsX4cQ/.test(dep) ? 'training' : /AKfycbx58htP/.test(dep) ? 'kpi' : /AKfycbzn-5ch/.test(dep) ? 'reporthub' : /AKfycbz26knl/.test(dep) ? 'turnover' : /AKfycbz1qIyw|AKfycbykuiMS/.test(dep) ? 'event' : 'crm';
    LOG.push([host, a, req.method(), JSON.stringify(Object.assign({}, p, { callback:undefined, tk:undefined })).slice(0, 160)]);
    let d = { ok:true };
    const tkLocal = String(p.tk || '').replace(/^mocktk\./, '');
    if (host === 'training'){
      if (a === 'rhAuthStart'){ const e = String(p.email || '').toLowerCase(); d = { ok:true, sentTo:e, expiresIn:600, gap:45 }; }
      else if (a === 'rhAuthVerify'){ const l = String(p.email || '').split('@')[0]; d = p.code !== '123456' ? { ok:false, code:'CODE', left:4, error:'Mã chưa đúng. Còn 4 lần thử.' } : { ok:true, token:'mocktk.' + l, exp:Date.now() + 30 * 864e5, user:{ email:p.email, local:l, pic:users[l] || me, level:sess.level || 'pic', admin:!!sess.admin } }; }
      else if (a === 'rhAuthMe') d = { ok:true, user:{ email:(tkLocal || 'x') + '@example.com', local:tkLocal, pic:users[tkLocal] || me, level:sess.level || 'pic', admin:!!sess.admin, perms:{} } };
      else if (a === 'rhSessions') d = { ok:true, sessions:SESS };
      else if (a === 'rhUpdMail' || a === 'rhUpdMailPreview') d = { ok:true, sent:12, message:'Đã gửi' };
      else if (a === 'rhDirectory') d = { ok:true, people:Object.keys(STAFF).map(k => ({ pic:k, email:k.toLowerCase() + '@example.com' })) };
      else if (a === 'ping') d = { ok:true, pong:true };
    } else if (host === 'kpi'){
      const viewer = users[tkLocal] || me, lvl = sess.level || 'pic';
      if (a === 'rhKpi'){ const scope = (lvl === 'director' || sess.admin) ? 'all' : lvl === 'hod' ? 'dept' : lvl === 'lead' ? 'team' : 'self';
        const mem = scope === 'self' ? [viewer] : team === 'thai' ? ['Dao','Miew'] : ['Viet','Vinh','Phuong'];
        const r = rkvRows(mem); d = { ok:true, me:viewer, scope, periods:r.periods, rows:r.rows, staff:Object.fromEntries(mem.map(m => [m, STAFF[m]])),
          org:Object.keys(STAFF).map(k => ({ key:k, full:STAFF[k].full, role:STAFF[k].role, team:STAFF[k].team, dept:STAFF[k].dept, level:STAFF[k].level })).concat([{ key:'', full:'Nguyễn Thị Hà (demo)', role:'Director', level:'Director' }]),
          sync:[{ month:'202609', at:'2026-10-07 08:55', src:'Doanh số NPP (Turnover)', status:'OK', file:'MMH Turnover Report', note:'202609' }, { src:'CRM Dental', status:'OK', file:'FY68_Dental CRM', at:'2026-10-07 08:55', note:'' }, { src:'Training Master', status:'OK', file:'Training Master', at:'2026-10-07 08:55', note:'' }, { src:'Marketing Offline', status:'OK', file:'MKT Offline', at:'2026-10-07 08:55', note:'' }, { src:'KBI', status:'OK', file:'KBI', at:'2026-10-07 08:55', note:'' }], total:(lvl === 'director' || lvl === 'hod' || !!sess.admin), at:'2026-10-07T01:58:00Z', v:'1.3' }; }
      else if (a === 'rhKpiTotal') d = totalKpi();
      else if (a === 'rhKpiMailPreview' || a === 'rhKpiMail'){ d = { ok:true, data:{ member:me, month:p.month || '202609' }, message:'Đã gửi' }; }
    } else if (host === 'turnover'){ d = turnover(); }
    else if (host === 'reporthub'){
      if (a === 'weekly' || a === 'boot') d = { ok:true, source:'marketing', picList:[], keyTasks:[], monthly:[], activityLog:[] };
      else if (a === 'tripMaster') d = { ok:true, to:'Nguyen Ha (Director)', cc:'Tuyen (HOD)', master:{ destinations:['Ha Noi','Hai Phong','Quang Ninh','Bac Ninh','Da Nang','Hue','Quang Tri','Nghe An','Ho Chi Minh','Can Tho'], coTravelers:['Vinh','Phuong','Tuyen','Giang'], equipment:['Laptop','Hàng mẫu','Standee','Máy chiếu'] } };
      else if (a === 'tripInfo') d = tripInfo(p.r || p.id);
    } else if (host === 'event'){ d = { ok:true, rows:[], events:[] }; }
    else {
      /* backend CRM nhóm */
      if (p.at === '1' && /^(weekly|boot)$/.test(a)) d = { ok:true, keyTasks:AT, source:'crm', statusOptions:['To Do','In Progress','Completed','Cancelled'] };
      else if (p.at === '1') d = { ok:true, message:'Đã cập nhật task trong sheet ALL TASK', keyTasks:AT, source:'crm', no:p.no || '9', row:99 };
      else if (a === 'bundle') d = { ok:true, source:team, team, app:'MMH ' + (team === 'thai' ? 'Thailand Surgical' : 'Dental') + ' CRM', user:{ pic:me }, picList, fyList:['FY68','FY67'], master, fyCurrent:'FY68',
        cidxCols:['_row','code','name','type','province','area','pic','fy','openDate','nCbc','nOrder','note'], cidx, kpi:crmKpi(team), stats:{ customers:D.customer.length, cbc:D.cbc.length, orders:D.order.length, weekly:D.weekly.length }, driveFolder:'1FAKEDRIVE', activity:[], ver:'101', vers:{ _all:'101', weekly:'1', cbc:'1', order:'1', customer:'1', master:'1', kpi:'1', monthly:'1', present:'1', adp:'1', pcode:'1' } };
      else if (a === 'version') d = { ok:true, ver:'101', vers:{ _all:'101', weekly:'1', cbc:'1', order:'1', customer:'1', master:'1', kpi:'1', monthly:'1', present:'1', adp:'1', pcode:'1' } };
      else if (a === 'ping') d = { ok:true, pong:true, source:team, ver:'10.10', meeting:true, trip2:true, kpi68:true, tenderPrice:true, custLog:true, deleteAccount:true, na:true, kr:true, idem:true, kpiPush:true };
      else if (a === 'master') d = { ok:true, master };
      else if (a === 'customerIndex') d = { ok:true, rows:D.customer.map(c => ({ _row:c._row, code:c.code, name:c.name, type:c.type, province:c.province, area:c.area, pic:c.pic, nCbc:c.nCbc, nOrder:c.nOrder })) };
      else if (a === 'visitFeed'){ const rows = D.weekly.filter(r => (!p.pic || r.pic === p.pic) && (!p.from || r.finish >= p.from) && (!p.to || r.start <= p.to)).map(r => { const o = Object.assign({}, r);
          const g = /📍\s*(-?[\d.]+),\s*(-?[\d.]+)([^\n]*)/.exec(r.gpsInfo || ''); o.gps = g ? g[1] + ', ' + g[2] + ' (±12 m)' : ''; o.gpsAddr = g ? (g[3].split('·')[1] || '').trim() : ''; const t = /🕒\s*(\S+ \S+)/.exec(r.gpsInfo || ''); o.upAt = t ? t[1] : '';
          delete o.gpsInfo; const s = r.account.split('/'); o.accName = s[0]; o.accType = s[1]; o.accProv = s[2]; return o; }).sort((x, y) => y.start.localeCompare(x.start));
        d = { ok:true, rows }; }
      else if (a === 'multi'){ d = { ok:true, tabs:{}, ver:'101' }; String(p.tabs || '').split(',').forEach(t => { if (D[t]) d.tabs[t] = lean(t, filt(t, D[t], { fy:t === 'cbc' || t === 'npp' ? '' : p.fy, pic:p.pic })); }); }
      else if (a === 'list'){ const t = p.tab; d = D[t] ? (p.lean === '1' ? lean(t, filt(t, D[t], p)) : { ok:true, tab:t, total:D[t].length, rows:filt(t, D[t], p) }) : { ok:false, error:'Tab không hợp lệ' }; }
      else if (a === 'kpi') d = crmKpi(team);
      else if (a === 'tfTrips'){ let pics = []; try { pics = JSON.parse(p.pics || '[]'); } catch(e){} d = { ok:true, trips:tfTripsOut(pics), at:'2026-10-07T02:00:00Z' }; }
      else if (a === 'tfPending'){ const dir = sess.level === 'director'; d = (dir || sess.admin) ? { ok:true, director:dir, items:tfPend, count:tfPend.length, file:'https://docs.google.com/spreadsheets/d/FAKE/edit' } : { ok:true, director:false, items:[], count:0 }; }
      else if (a === 'tfDecide'){ let its = []; try { its = JSON.parse(p.items || '[]'); } catch(e){} tfPend = tfPend.filter(x => !its.some(y => y.row === x.row)); d = { ok:true, results:its.map(y => ({ row:y.row, pic:y.pic, ok:true, status:y.decision === 'reject' ? 'Rejected' : 'Approved', mailed:'x@example.com' })), done:its.length, failed:0 }; }
      else if (a === 'tfLog') d = { ok:true, items:[] };
      else if (a === 'tripMaster2') d = { ok:true, master:{ destinations:['Ha Noi','Hai Phong','Quang Ninh','Bac Ninh','Da Nang','Hue','Quang Tri','Nghe An','Ho Chi Minh','Can Tho','Binh Duong'], coTravelers:['Vinh','Phuong','Tuyen','Giang','Khang','Viet Ha'], equipment:['Laptop','Hàng mẫu','Standee','Máy chiếu'] },
        tripName:me, to:'director@example.com', cc:'hod@example.com, ' + me.toLowerCase() + '@example.com', file:'https://docs.google.com/spreadsheets/d/FAKE/edit' };
      else if (a === 'tripInfo') d = tripInfo(p.r || p.id);
      else if (a === 'naList'){ const mgr = ['Tuyen','Nguyen Ha','Giang'].includes(me) || me === 'Viet';
        const rows = NA.filter(o => mgr || o.pic === me).map(o => Object.assign({}, o, { canDecide:!opt.noNaDecide && o.status === 'Pending' && ((me === 'Tuyen') || (me === 'Viet' && o.pic !== 'Viet')), canEdit:o.pic === me && o.status !== 'Approved', approvers:o.pic === 'Viet' ? ['Tuyen'] : ['Viet','Tuyen'] }));
        d = { ok:true, na:true, ver:'5', _ver:'5', rows, pending:rows.filter(o => o.canDecide).length, me:{ pic:me, all:['Tuyen','Nguyen Ha','Giang'].includes(me), approverOf:me === 'Viet' ? ['Vinh','Phuong'] : me === 'Tuyen' ? ['Viet','Vinh','Phuong'] : [] },
          cfg:{ team, lang:team === 'thai' ? 'en' : 'vi', pics:team === 'thai' ? ['Dao','Miew'] : ['Viet','Vinh','Phuong'], kpi:team === 'thai' ? { Dao:'', Miew:'C2-03' } : { Viet:'C1-01', Vinh:'C1-02', Phuong:'C1-03' }, dealerOnly:{}, folder:'https://drive.google.com/drive/folders/1FAKENAFOLDER', hasOrders:team !== 'thai', needOrder:team === 'dental', admins:['Nguyen Ha','Tuyen','Hoa','Giang'], deciders:['Nguyen Ha','Tuyen'] } }; }
      else if (a === 'naPending'){ d = { ok:true, n:NA.filter(o => o.status === 'Pending' && o.pic !== me).length, ids:NA.filter(o => o.status === 'Pending' && o.pic !== me).map(o => o.id), drafts:NA.filter(o => o.pic === me && o.status === 'Draft').length, ver:'5' }; }
      else if (a === 'naDecide' || a === 'naSave' || a === 'naSubmit'){ d = { ok:true, message:'Đã lưu', row:NA[0] }; }
      else if (a === 'account360'){ const c = D.customer.find(x => x.code === p.code) || D.customer.find(x => x.name === p.name) || D.customer[0];
        const cbc = D.cbc.filter(x => x.code === c.code), orders = D.order.filter(x => x.code === c.code), weekly = D.weekly.filter(x => x.account.split('/')[0] === c.name), present = D.present.filter(x => x.account.split('/')[0] === c.name), adp = D.adp.filter(x => x.account.split('/')[0] === c.name);
        const tl = []; orders.forEach(o => tl.push({ kind:'order', date:o.day, title:'Đơn hàng ' + o.orderNo, pic:o.pic, amount:o.amount, qty:o.qty, product:o.ptype, channel:o.channel, row:o._row, detail:o.detail + ' · SL ' + o.qty }));
        weekly.forEach(w => tl.push({ kind:'visit', date:w.start, title:w.typeAction, pic:w.pic, typeTask:w.typeTask, process:w.process, status:w.status, feedback:w.feedback, product:w.product, photos:[], row:w._row, plan:w.plan, result:w.result, next:w.nextAction, detail:w.result || w.plan }));
        present.forEach(x => tl.push({ kind:'present', date:x.day, title:'Thuyết trình sản phẩm', pic:x.pic, target:x.target, actual:x.actual, link:x.folder, row:x._row, detail:x.review }));
        tl.sort((x, y) => String(y.date).localeCompare(String(x.date)));
        const byMonth = {}, byProduct = {}; let tot = 0; orders.forEach(o => { tot += o.amount; byMonth[o.month] = (byMonth[o.month] || 0) + o.amount; byProduct[o.ptype] = (byProduct[o.ptype] || 0) + o.amount; });
        d = { ok:true, customer:c, cbc, orders, weekly, present, adp, timeline:tl, photos:[], stats:{ totalAmount:tot, orderCount:orders.length, visitCount:weekly.length, presentCount:present.length, cbcCount:cbc.length, lastVisit:(weekly.map(w => w.start).sort().pop() || ''), lastOrder:(orders.map(o => o.day).sort().pop() || ''), byMonth, byProduct, daysSinceVisit:2 } }; }
      else if (a === 'customerDetail'){ const c = D.customer.find(x => x.code === p.code) || D.customer[0]; d = { ok:true, customer:c, cbc:D.cbc.filter(x => x.code === c.code), orders:D.order.filter(x => x.code === c.code) }; }
      else if (a === 'activity') d = { ok:true, rows:[] };
      else if (a === 'custLog') d = { ok:true, rows:[], first:'' };
      else if (a === 'productCodes') d = { ok:true, rows:[] };
      else if (a === 'photoMeta') d = { ok:true, meta:{} };
      else if (a === 'krData' || a === 'krPreview') d = { ok:true, data:{}, html:'<p>Báo cáo KPI tháng (xem trước)</p>', subject:'KPI report' };
      else if (a === 'mtList' || a === 'mtTenders' || a === 'mtPrices') d = { ok:true, rows:[], items:[] };
      else if (a === 'kpiLate') d = { ok:true, late:{ month:'', until:'', open:false }, kpiFile:'MMH KPI FY68' };
      else d = { ok:true, message:'Đã lưu (giả lập)', row:999 };
    }
    if (opt.onReq) { try { const o2 = opt.onReq(host, a, p, d); if (o2) d = o2; } catch(e){} }
    /* chế độ TEST (testflow.js + MMH_TestMode.gs) */
    if (String(p.tm) === '1'){
      const FN = { kpi:'MMH KPI FY68', training:'Training Master', reporthub:'MKT Weekly & Monthly Report' }[host] || (team === 'thai' ? 'FY68_Thailand_Surgical_CRM' : 'MMH_Dental_CRM');
      if (a === 'tmInfo') d = { ok:true, test:true, file:{ name:FN, url:'https://docs.google.com/spreadsheets/d/FAKE/edit' } };
      if (a === 'tmClean') d = { ok:true, rows:6, sheets:[{ name:'6. WEEKLY REPORT', rows:3 }, { name:'1. CUSTOMER', rows:1 }, { name:'16. NEW ACCOUNT & SKU', rows:1 }, { name:'Business Trip Log', rows:1 }], trip:1, folders:1, files:2, message:'Đã xoá 6 dòng TEST · 1 dòng Business Trip · 1 folder công tác · 2 file Drive' };
      if (a === 'saveWeekly') d = Object.assign({}, d, { row:1287 });
      if (a === 'uploadPhoto') d = { ok:true, url:'https://drive.google.com/file/d/FAKE/view', name:'TEST_20261007_TEST Nha khoa Minh Tam_01.jpg', message:'Đã tải ảnh lên Drive' };
      if (a === 'saveCustomer') d = { ok:true, row:842, message:'Đã lưu khách hàng' };
      if (a === 'saveOrders' || a === 'saveOrder') d = { ok:true, row:2311, message:'Đã lưu đơn hàng' };
      if (a === 'tripPropose2') d = { ok:true, row:612, no:'608', message:'Đã ghi đề xuất công tác vào file Business Trip (dòng 612)' };
      if (a === 'naSubmit') d = { ok:true, rec:{ id:'NA-DE-261007091500-417', _row:58 }, message:'Đã gửi email xin xác nhận' };
      const ML = { weeklyReport:[{ to:'leader@example.com, sales2@example.com', cc:'hod@example.com, director@example.com, hr@example.com', subject:'Báo cáo tuần — TEST — 06/10 → 12/10/2026' }],
        monthlyReport:[{ to:'leader@example.com', cc:'hod@example.com, director@example.com', subject:'Báo cáo tháng 10/2026 — TEST' }],
        tripPropose2:[{ to:'director@example.com', cc:'hod@example.com', subject:'Approval Business trip - 26102026 - TEST' }],
        tfDecide:[{ to:'admin@example.com', cc:'director@example.com', subject:'[Approved] Business trip - TEST - Da Nang' }],
        naSubmit:[{ to:'leader@example.com, hod@example.com', cc:'director@example.com, hr@example.com', subject:'[MMH CRM] Xin xác nhận Đại lý / khách hàng mới · TEST Nha khoa Minh Tam · TEST' }],
        naDecide:[{ to:'admin@example.com', cc:'director@example.com, hr@example.com', subject:'[MMH CRM] ĐÃ XÁC NHẬN Đại lý / khách hàng mới · TEST Nha khoa Minh Tam · TEST' }],
        rhKpiMailSend:[{ to:'sales2@example.com', cc:'leader@example.com, hod@example.com', subject:'KPI T09/2026 · Vinh' }] };
      if (d && typeof d === 'object') d = Object.assign({}, d, { _tm:{ on:true, admin:'admin@example.com', as:p.tmAs || '', mails:ML[a] || [] } });
    }
    const body = JSON.stringify(d);
    if (cb) return route.fulfill({ status:200, contentType:'application/javascript', headers:{ 'access-control-allow-origin':'*' }, body: cb + '(' + body + ');' });
    return route.fulfill({ status:200, contentType:'application/json', headers:{ 'access-control-allow-origin':'*' }, body });
  };
  await page.route(/script\.google\.com/, handle);
  await page.route(/drive\.google\.com\/thumbnail|googleusercontent|drive\.google\.com\/uc/, route => { const b = photoFor(route.request().url()); if (b) return route.fulfill({ status:200, contentType:'image/jpeg', body:b }); return route.fulfill({ status:404, body:'' }); });
  return { D, LOG, NA:() => NA };
}
module.exports = { install, buildVN, buildTH, STAFF, KPI_DEF };
