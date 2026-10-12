// Dữ liệu GIẢ cho MMH Training Hub + máy chủ giả lập trả đúng cấu trúc phản hồi của Backend Training Hub.gs (v3.14).
// Không có tên / email / số điện thoại thật: email @example.com, số liệu tự sinh.
const fs = require('fs');
const GAS = require('./gasvm');
const TODAY = '2026-10-12';
const NOW = new Date('2026-10-12T09:00:00+07:00');
const APP_URL = 'https://training-hub.example.com/';
const MAIL = p => p + '@example.com';

/* ---------------- NGƯỜI DÙNG ---------------- */
const USERS = [
  // name, prefix, role, dept, position, manager, activated, lastLogin
  ['Giang', 'giang', 'admin', 'Product Team', 'Product Team Leader', 'tuyen', 1, '12/10/2026 08:52'],
  ['Tuyen', 'tuyen', 'trainer', 'Sales & Marketing VN', 'HOD Sales & Marketing', 'director', 1, '11/10/2026 17:40'],
  ['Thuong', 'thuong', 'trainer', 'Marketing Team', 'Marketing Team Leader', 'tuyen', 1, '12/10/2026 08:15'],
  ['Minh Trang', 'minhtrang', 'trainer', 'Marketing Team', 'Marketing PIC', 'thuong', 1, '10/10/2026 16:02'],
  ['Duc Anh', 'ducanh', 'trainer', 'Marketing Team', 'Marketing PIC', 'thuong', 1, '09/10/2026 10:21'],
  ['Minh Viet', 'minhviet', 'trainer', 'Dental Sale Team', 'Dental Sale Team Leader', 'tuyen', 1, '12/10/2026 07:58'],
  ['Vinh', 'vinh', 'trainer', 'Dental Sale Team', 'Sales Rep — Da Nang', 'minhviet', 1, '08/10/2026 21:13'],
  ['Phuong', 'phuong', 'trainer', 'Dental Sale Team', 'Sales Rep — Ho Chi Minh', 'minhviet', 1, '11/10/2026 09:30'],
  ['Viet Ha', 'vietha', 'trainer', 'Surgical Sale Team', 'Sales Rep — North', 'giang', 1, '10/10/2026 11:47'],
  ['Khang', 'khang', 'audience', 'Surgical Sale Team', 'Sales Rep — South', 'giang', 1, '12/10/2026 08:40'],
  ['Trang', 'trang', 'trainer', 'Eyeless Sale Team', 'Sales Rep — Eyeless', 'tuyen', 1, '07/10/2026 14:05'],
  ['Hoa', 'hoa', 'trainer', 'Back Office', 'HOD Back Office', 'director', 1, '12/10/2026 08:05'],
  ['Ngoc', 'ngoc', 'trainer', 'Back Office', 'Accounting & Import–Export', 'hoa', 1, '11/10/2026 15:22'],
  ['Dam Ha', 'damha', 'trainer', 'Stock Team', 'Stock Team Leader', 'hoa', 0, ''],
  ['Hau', 'hau', 'audience', 'Stock Team', 'Stock PIC', 'damha', 0, '']
].map(([name, pre, role, dept, position, mgr, act, last]) => ({name, pre, email: MAIL(pre), role, dept, position, manager: MAIL(mgr), active: true, activated: !!act, lastLogin: last}));
const UBY = Object.fromEntries(USERS.map(u => [u.pre, u]));
const pub = u => ({email: u.email, name: u.name, role: u.role, dept: u.dept, position: u.position, manager: u.manager, active: true, isTrainer: u.role !== 'audience', isAdmin: u.role === 'admin'});

const GROUPS = {
  'MMH - All member': USERS.filter(u => u.pre !== 'hau').map(u => u.pre),
  'MMH - Sales team': ['khang', 'vietha', 'minhviet', 'phuong', 'vinh', 'tuyen', 'trang'],
  'MMH - Sales Dental': ['minhviet', 'phuong', 'vinh', 'tuyen'],
  'MMH - Sales Surgical': ['khang', 'vietha', 'tuyen'],
  'MMH - Marketing team': ['giang', 'thuong', 'minhtrang', 'ducanh', 'tuyen'],
  'MMH - Sales & MKT': ['khang', 'vietha', 'minhviet', 'phuong', 'vinh', 'tuyen', 'trang', 'giang', 'thuong', 'minhtrang', 'ducanh'],
  'MMH - Back office team': ['hoa', 'ngoc', 'damha', 'hau'],
  'MMH - Leaders': ['tuyen', 'giang', 'thuong', 'minhviet', 'hoa', 'damha']
};
function groupList() {
  const g = Object.entries(GROUPS).map(([name, l]) => ({name, type: 'group', emails: l.map(MAIL), count: l.length}));
  const by = {};
  USERS.forEach(u => (by[u.dept] = by[u.dept] || []).push(u.email));
  Object.entries(by).forEach(([d, e]) => g.push({name: 'Phòng ban — ' + d, type: 'dept', emails: e, count: e.length}));
  return g;
}
function audienceOf(a) {
  const out = new Set();
  String(a || '').split(/[;,|\n]/).map(x => x.trim()).filter(Boolean).forEach(x => {
    if (GROUPS[x]) GROUPS[x].forEach(p => out.add(p));
    else { const u = USERS.find(u => u.name === x); if (u) out.add(u.pre); }
  });
  return [...out];
}

/* ---------------- BUỔI ĐÀO TẠO ---------------- */
// [sid, date, category, type, topic, trainer, audience, status, from, to, folder, quiz]
// quiz: [total, pass, minutes, attempts, deadline, active, requireMaterials, note]
const RAW = [
  ['S090', '2025-12-10', 'Product', 'Internal', 'Ophthalmic Suture: mã kim & độ cong', 'Giang', 'MMH - Sales Surgical', 'Completed', '09:00', '10:30', 1, [10, 80, 15, 2, '2025-12-20', 0, 1]],
  ['S091', '2026-01-14', 'SOP', 'Internal', 'Quy trình lập báo giá & hợp đồng', 'Ngoc', 'MMH - Sales team', 'Completed', '14:00', '15:30', 1, [8, 70, 10, 2, '2026-01-25', 0, 0]],
  ['S092', '2026-02-25', 'Compliance', 'Internal', 'Quy định về quà tặng & tài trợ hội thảo', 'Hoa', 'MMH - All member', 'Completed', '15:00', '16:00', 1, [8, 80, 10, 2, '2026-03-06', 0, 0]],
  ['S093', '2026-03-11', 'Product', 'Internal', 'Carbide burs: phân loại theo chỉ định', 'Giang', 'MMH - Sales Dental', 'Completed', '09:00', '10:30', 1, [10, 80, 15, 2, '2026-03-20', 0, 1]],
  ['S094', '2026-03-26', 'Funtional skills', 'Internal', 'Kỹ năng lập kế hoạch đi địa bàn tuần', 'Minh Viet', 'MMH - Sales team', 'Completed', '16:00', '17:00', 1, null],
  ['S095', '2026-04-15', 'Product', 'External', 'Trocar Kit & Micro Forceps: demo cho bác sĩ', 'Viet Ha', 'MMH - Sales Surgical', 'Completed', '09:00', '11:00', 1, [8, 80, 10, 2, '2026-04-25', 0, 0]],
  ['S096', '2026-05-20', 'SOP', 'Internal', 'Quy trình nhập kho & kiểm hạn dùng', 'Dam Ha', 'MMH - Back office team', 'Completed', '10:00', '11:00', 1, [6, 70, 10, 2, '2026-05-30', 0, 0]],
  ['S097', '2026-06-17', 'Compliance', 'Internal', 'Bảo vệ dữ liệu cá nhân khách hàng', 'Hoa', 'MMH - All member', 'Completed', '15:00', '16:00', 1, [8, 80, 10, 2, '2026-06-27', 0, 0]],
  ['S098', '2026-07-08', 'Product', 'Internal', 'EndoCompath & trâm tay inox: cập nhật', 'Giang', 'MMH - Sales Dental', 'Completed', '09:00', '10:30', 1, [10, 80, 15, 2, '2026-07-18', 0, 1]],
  ['S099', '2026-08-19', 'Funtional skills', 'Internal', 'Kỹ năng viết email chuyên nghiệp', 'Thuong', 'MMH - All member', 'Completed', '14:00', '15:00', 1, null],
  ['S118', '2026-09-03', 'SOP', 'Internal', 'Onboarding FY68: hệ thống báo cáo & công cụ', 'Tuyen', 'MMH - All member', 'Completed', '09:00', '11:00', 1, [8, 70, 10, 2, '2026-09-12', 0, 0]],
  ['S100', '2026-09-08', 'Product', 'Internal', 'Ophthalmic Knife: dòng dao MANI và chỉ định', 'Giang', 'MMH - Sales Surgical', 'Completed', '09:00', '10:30', 1, [8, 80, 10, 2, '2026-09-18', 0, 1]],
  ['S101', '2026-09-15', 'SOP', 'Internal', 'Quy trình đề xuất & báo cáo công tác trên Report Hub', 'Thuong', 'MMH - All member', 'Completed', '14:00', '15:00', 1, [8, 80, 10, 2, '2026-10-15', 1, 0]],
  ['S102', '2026-09-18', 'Product', 'Internal', 'DIA-BURS: phân loại & chỉ định lâm sàng', 'Giang', 'MMH - Sales team', 'Completed', '09:00', '10:30', 1, [10, 80, 15, 2, '2026-10-02', 1, 1]],
  ['S103', '2026-09-24', 'Compliance', 'Internal', 'Luật Quảng cáo thiết bị y tế: những điều Sales cần biết', 'Hoa', 'MMH - All member', 'Completed', '15:00', '16:00', 1, null],
  ['S105', '2026-09-29', 'SOP', 'Internal', 'Hướng dẫn sử dụng MMH CRM cho Sales', 'Thuong', 'MMH - Sales team', 'Completed', '10:00', '11:00', 1, [6, 70, 10, 2, '2026-10-06', 0, 0]],
  ['S104', '2026-10-01', 'Funtional skills', 'Internal', 'Kỹ năng trình bày sản phẩm với bác sĩ', 'Minh Trang', 'MMH - Sales & MKT', 'Completed', '14:00', '15:30', 1, [10, 80, 15, 2, '2026-10-19', 1, 0, 'Xem lại phần đóng vai (slide 12–18) trước khi làm bài.']],
  ['S106', '2026-10-06', 'Product', 'Internal', 'Chỉ khâu nhãn khoa MANI: mã kim & ứng dụng', 'Giang', 'MMH - Sales Surgical', 'Completed', '09:00', '10:30', 1, null],
  ['S107', '2026-10-08', 'Product', 'Internal', 'Mani Dental product: Key SKUs FY68', 'Giang', 'MMH - Sales team', 'Completed', '09:00', '10:30', 1, [10, 80, 15, 2, '2026-10-20', 1, 1, 'Ôn kỹ slide 3–5 (3 nhóm sản phẩm chủ lực) trước khi làm bài.']],
  ['S108', '2026-10-09', 'Compliance', 'External', 'Hội thảo online: cập nhật quy định nhập khẩu', 'Hoa', 'MMH - Back office team', 'Cancel', '10:00', '11:00', 0, null],
  ['S109', '2026-10-12', 'SOP', 'Internal', 'Quy trình đặt hàng & giao hàng cho NPP', 'Ngoc', 'MMH - All member', 'Plan', '14:00', '15:30', 1, null],
  ['S110', '2026-10-14', 'Funtional skills', 'Internal', 'Kỹ năng xử lý từ chối khi thăm phòng khám nha', 'Minh Trang', 'MMH - Sales Dental', 'Plan', '09:00', '10:30', 1, null],
  ['S111', '2026-10-16', 'Compliance', 'Internal', 'Quy trình xử lý khiếu nại chất lượng sản phẩm', 'Hoa', 'MMH - All member', 'Plan', '15:00', '16:00', 0, null],
  ['S112', '2026-10-21', 'Product', 'Internal', 'JIZAI: kỹ thuật tạo hình ống tuỷ với trâm NiTi', 'Giang', 'MMH - Sales Dental', 'Plan', '09:00', '11:00', 0, null],
  ['S113', '2026-10-23', 'Product', 'External', 'Manipler: ghim da phẫu thuật — demo sản phẩm', 'Viet Ha', 'MMH - Sales Surgical', 'Plan', '10:00', '11:30', 1, null],
  ['S114', '2026-10-28', 'SOP', 'Internal', 'Quản lý tồn kho & hạn dùng tại kho Hà Nội', 'Dam Ha', 'MMH - Back office team', 'Plan', '10:00', '11:00', 0, null],
  ['S115', '2026-10-30', 'Product', 'Internal', 'Mani Bond & composite MMG: quy trình dán', 'Giang', 'MMH - Sales Dental', 'Plan', '14:00', '16:00', 1, null],
  ['S116', '2026-11-05', 'Compliance', 'Internal', 'Bảo mật thông tin khách hàng trên CRM', 'Hoa', 'MMH - All member', 'Plan', '15:00', '16:00', 0, null],
  ['S117', '2026-10-14', 'SOP', 'Internal', 'Quy trình đề nghị thanh toán & hoàn ứng', 'Ngoc', 'MMH - Leaders', 'Plan', '15:00', '16:00', 0, null]
];
const PURPOSE = {
  Product: 'Nắm vững đặc điểm, chỉ định và thông điệp chính của sản phẩm để tư vấn bác sĩ đúng và đủ.',
  SOP: 'Thực hiện thống nhất quy trình, giảm sai sót và thời gian xử lý.',
  Compliance: 'Hiểu đúng quy định và tuân thủ trong mọi hoạt động bán hàng, truyền thông.',
  'Funtional skills': 'Nâng cao kỹ năng làm việc với khách hàng và đồng nghiệp.'
};
const BASE = RAW.map(r => {
  const [sid, date, category, type, topic, trainer, audience, status, from, to, folder, q] = r;
  const d = date.split('-');
  return {sid, no: '', month: date.slice(0, 7), folderName: '', folderUrl: folder ? 'https://drive.google.com/drive/folders/FAKE_' + sid : '',
    date, dateText: d[2] + '/' + d[1] + '/' + d[0], type, category, topic, purpose: PURPOSE[category], trainer, audience, status,
    meetingLink: status === 'Plan' ? 'https://teams.example.com/meet/' + sid.toLowerCase() : '', recordLink: status === 'Completed' && sid >= 'S100' ? 'https://drive.google.com/file/d/REC_' + sid + '/view' : '',
    summary: status === 'Completed' ? 'Buổi học diễn ra đúng kế hoạch; học viên tham gia thảo luận tích cực.' : '',
    quizStatus: q ? (q[5] ? 'Published' : 'Closed') : 'None', preSent: status !== 'Plan' || ['S109', 'S110'].includes(sid), afterSent: !!(q && status === 'Completed'),
    completion: '', timeFrom: from, timeTo: to,
    _q: q ? {total: q[0], passScore: q[1], durationMin: q[2], maxAttempts: q[3], deadline: q[4], active: !!q[5], requireMaterials: !!q[6], note: q[7] || '', shuffle: true, showResult: true,
      optionalFiles: sid === 'S107' ? ['F107_4', 'F107_5'] : []} : null};
});
const SBY = Object.fromEntries(BASE.map(s => [s.sid, s]));

/* ---------------- KẾT QUẢ (ghi danh + bài làm) ---------------- */
// percent các lượt làm; 'P' = đang làm; [] = chưa làm
const OVR = {
  S100: {khang: [88], vietha: [100], tuyen: [63, 75]},
  S101: {giang: [], khang: [], tuyen: [], minhtrang: [100], ducanh: [88], hoa: [75], ngoc: [100], damha: [88], vinh: [63], phuong: [100], minhviet: [88], trang: [88], vietha: [100], thuong: []},
  S102: {khang: [90], vietha: [70, 80], minhviet: [100], phuong: [90], vinh: [60, 70], tuyen: [90], trang: []},
  S104: {khang: [60], giang: [90], vietha: [80], minhviet: [90], phuong: [70, 80], vinh: [], tuyen: [100], trang: [70], thuong: [90], ducanh: [80], minhtrang: []},
  S105: {khang: [83], vietha: [100], minhviet: [83], phuong: [100], vinh: [67, 83], tuyen: [100], trang: [83]},
  S107: {minhviet: [100], phuong: [90], vietha: [70, 80], tuyen: [90], vinh: [60], trang: 'P', khang: []}
};
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ENR = [], RESP = [];
BASE.forEach((s, si) => {
  const aud = audienceOf(s.audience); const q = s._q;
  aud.forEach((pre, ui) => {
    const e = {sid: s.sid, topic: s.topic, email: MAIL(pre), pre, name: UBY[pre].name, status: 'Assigned', percent: '', pass: false, attempt: 0, certUrl: '', certSentAt: '', completedAt: ''};
    ENR.push(e);
    if (!q || s.status !== 'Completed') return;
    let tries = OVR[s.sid] && OVR[s.sid][pre];
    if (tries === undefined) {
      const r = rng(si * 97 + ui * 13 + 5); const step = 100 / q.total;
      if (r() < 0.12) tries = [];
      else { const a = Math.round(Math.min(q.total, Math.floor(q.total * (0.55 + r() * 0.5))) * step); tries = [a]; if (a < q.passScore && q.maxAttempts > 1 && r() < 0.7) tries.push(Math.round(Math.min(q.total, Math.ceil(q.passScore / step) + Math.floor(r() * 2)) * step)); }
    }
    if (tries === 'P') { e.status = 'In progress'; return; }
    tries.forEach((pct, k) => {
      const d = new Date(s.date + 'T10:00:00+07:00'); d.setDate(d.getDate() + 1 + k * 2 + (ui % 3));
      if (d > NOW) d.setTime(NOW.getTime() - 86400e3 * (2 - k));
      const at = new Date(d.getTime() + ((ui * 37) % 300) * 60e3);
      const pass = pct >= q.passScore;
      RESP.push({respId: 'R' + s.sid + pre + k, sid: s.sid, topic: s.topic, email: MAIL(pre), name: UBY[pre].name, attempt: k + 1, at,
        durationSec: 240 + ((ui * 53 + k * 71 + si * 11) % 420), percent: pct, score: pct, maxScore: 100, result: pass ? 'Pass' : 'Fail',
        certUrl: pass ? 'https://drive.google.com/file/d/CERT_' + s.sid + '_' + pre + '/view' : ''});
      e.status = 'Completed'; e.attempt = k + 1; e.completedAt = at;
      if (e.percent === '' || pct > e.percent) e.percent = pct;
      if (pass && !e.pass) { e.pass = true; e.certUrl = 'https://drive.google.com/file/d/CERT_' + s.sid + '_' + pre + '/view'; e.certSentAt = at; }
    });
  });
});
const pad = n => String(n).padStart(2, '0');
const fmtDT = d => { const t = new Date(d.getTime() + 7 * 3600e3); return pad(t.getUTCDate()) + '/' + pad(t.getUTCMonth() + 1) + '/' + t.getUTCFullYear() + ' ' + pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()); };
const respOut = r => ({respId: r.respId, sid: r.sid, topic: r.topic, email: r.email, name: r.name, attempt: r.attempt, startedAt: fmtDT(new Date(r.at - r.durationSec * 1000)), submittedAt: fmtDT(r.at), submittedIso: r.at.toISOString(), durationSec: r.durationSec, score: r.score, maxScore: 100, percent: r.percent, result: r.result, certUrl: r.certUrl});

/* ---------------- TÀI LIỆU ---------------- */
const KB = 1024, MB = 1048576;
function file(id, name, size, path, upd) {
  const n = name.toLowerCase();
  const kind = /\.pdf$/.test(n) ? 'pdf' : /\.pptx?$/.test(n) ? 'slide' : /\.docx?$/.test(n) ? 'doc' : /\.xlsx?$/.test(n) ? 'sheet' : /\.(mp4|mov)$/.test(n) ? 'video' : /\.(png|jpe?g)$/.test(n) ? 'image' : 'file';
  const view = kind === 'pdf' ? 'pdf' : ['slide', 'doc', 'sheet'].includes(kind) ? 'office' : kind === 'image' ? 'image' : 'drive';
  const mime = {pdf: 'application/pdf', slide: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', doc: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sheet: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', video: 'video/mp4', image: 'image/jpeg'}[kind] || 'application/octet-stream';
  const pathArr = path ? path.split(' / ') : [];
  return {id, name, mime, kind, view, path: path || '', pathArr, size, sizeText: size < MB ? Math.round(size / KB) + ' KB' : (size / MB).toFixed(1) + ' MB',
    url: 'https://drive.google.com/file/d/' + id + '/view', preview: 'https://drive.google.com/file/d/' + id + '/preview', download: '', updated: upd || '07/10/2026 17:20', updatedMs: 1791000000000, linkShared: true};
}
const MATS = {
  S107: {files: [file('F107_1', '01_Mani Dental Key SKUs FY68.pdf', 117 * KB, '', '07/10/2026 17:20'), file('F107_2', '02_Thong diep chinh theo nhom bac si.pptx', 6.8 * MB, '', '07/10/2026 17:24'),
    file('F107_3', '03_Cau hoi thuong gap khi tu van.docx', 420 * KB, '', '07/10/2026 17:31'), file('F107_4', 'Bang so lieu SKU (mau).xlsx', 96 * KB, 'Tai lieu tham khao', '08/10/2026 11:02'),
    file('F107_5', 'Video demo JIZAI.mp4', 148 * MB, 'Tai lieu tham khao', '08/10/2026 11:15')],
    folders: [{id: 'D107_1', name: 'Tai lieu tham khao', path: 'Tai lieu tham khao', pathArr: ['Tai lieu tham khao'], url: 'https://drive.google.com/drive/folders/D107_1'}],
    crumb: ['MMH Training', 'Product', '20261008_Internal_Product_MMH - Sales team'], folderName: '20261008_Internal_Product_MMH - Sales team'}
};
function matsOf(sid) {
  const s = SBY[sid];
  if (MATS[sid]) return MATS[sid];
  if (!s.folderUrl) return {files: [], folders: [], crumb: [], folderName: '', message: 'Buổi đào tạo chưa có thư mục tài liệu.'};
  const fn = s.dateText.split('/').reverse().join('') + '_' + s.type + '_' + s.category;
  const short = s.topic.split(':')[0].replace(/[^\w\s-]/g, '').trim() || 'Bai giang';
  return {files: [file('F' + sid + '_1', short + ' - slide bai giang.pdf', 2.1 * MB), file('F' + sid + '_2', short + ' - tom tat.docx', 380 * KB)], folders: [], crumb: ['MMH Training', s.category, fn], folderName: fn};
}
// tiến độ đọc: user → sid → fileId → percent
const PROG0 = {
  khang: {S107: {F107_1: 100, F107_2: 60}, S102: {F102_1: 100, F102_2: 100}, S104: {F104_1: 100}, S100: {F100_1: 100, F100_2: 100}},
  giang: {S101: {F101_1: 100}, S104: {F104_1: 100, F104_2: 100}},
  minhviet: {S107: {F107_1: 100, F107_2: 100, F107_3: 100}}, phuong: {S107: {F107_1: 100, F107_2: 100, F107_3: 100}},
  vietha: {S107: {F107_1: 100, F107_2: 100, F107_3: 100, F107_4: 100}}, tuyen: {S107: {F107_1: 100, F107_2: 100, F107_3: 100}},
  vinh: {S107: {F107_1: 100, F107_2: 100, F107_3: 100}}, trang: {S107: {F107_1: 100, F107_2: 100, F107_3: 100}}
};

/* ---------------- CÂU HỎI ---------------- */
const BANK = {
  S107: [
    ['single', 'JIZAI thuộc nhóm sản phẩm nào?', 'Trâm máy NiTi nội nha', 'Mũi khoan kim cương', 'Keo dán nha khoa', 'Chỉ khâu nhãn khoa', 'A', 'JIZAI là dòng trâm máy NiTi dùng tạo hình ống tuỷ (slide 4).'],
    ['single', 'DIA-BURS là dòng sản phẩm gì?', 'Trâm tay inox', 'Mũi khoan kim cương', 'Composite phục hồi', 'Ghim da phẫu thuật', 'B', 'DIA-BURS là dòng mũi khoan kim cương (slide 3).'],
    ['single', 'Mani Bond thuộc nhóm vật liệu nào?', 'Vật liệu lấy dấu', 'Vật liệu trám tạm', 'Keo dán (bond)', 'Thuốc tê', 'C', 'Mani Bond là keo dán trong nhóm vật liệu phục hồi MMG.'],
    ['single', 'Sản phẩm nào thuộc nhóm nhãn khoa?', 'Carbide bur', 'Ophthalmic Knife', 'JIZAI', 'IPR', 'B', ''],
    ['multi', 'Những nhóm nào thuộc danh mục nha khoa chủ lực FY68?', 'Nội nha', 'Mũi khoan', 'Vật liệu phục hồi', 'Ghim da phẫu thuật', 'ABC', 'Ghim da (Manipler) thuộc nhóm ngoại khoa.'],
    ['truefalse', 'Sales được dùng thông tin ngoài tài liệu chính thức khi tư vấn bác sĩ.', 'Đúng', 'Sai', '', '', 'B', 'Chỉ dùng thông tin có trong tài liệu chính thức (slide 7).'],
    ['single', 'Sau buổi gặp bác sĩ, phản hồi cần được ghi nhận ở đâu?', 'MMH CRM', 'Nhóm chat cá nhân', 'Sổ tay riêng', 'Không cần ghi nhận', 'A', 'Ghi nhận vào MMH CRM ngay sau buổi gặp (slide 7).'],
    ['single', 'Manipler là sản phẩm gì?', 'Ghim da phẫu thuật', 'Trâm nội nha', 'Dao mổ nhãn khoa', 'Composite', 'A', ''],
    ['single', 'Theo bảng SKU ưu tiên (số liệu mẫu), kênh chính của Carbide burs là gì?', 'Bệnh viện', 'Phòng khám tư', 'Chỉnh nha', 'Bán online', 'A', 'Xem bảng ở slide 5.'],
    ['single', 'Bước đầu tiên khi gặp bác sĩ theo thông điệp của buổi học là gì?', 'Báo giá ngay', 'Lắng nghe nhu cầu', 'Tặng mẫu dùng thử', 'Gửi catalogue', 'B', 'Lắng nghe nhu cầu trước khi giới thiệu sản phẩm.']
  ].map((q, i) => ({qid: 'Q107_' + (i + 1), qno: i + 1, type: q[0], question: q[1], a: q[2], b: q[3], c: q[4], d: q[5], correct: q[6], points: 1, explanation: q[7]}))
};
const optsOf = q => q.type === 'truefalse' ? [{k: 'A', t: 'Đúng'}, {k: 'B', t: 'Sai'}] : ['a', 'b', 'c', 'd'].map(k => ({k: k.toUpperCase(), t: q[k]})).filter(o => o.t);

/* ---------------- THÔNG BÁO ---------------- */
function notiFor(pre) {
  const ago = (h) => new Date(NOW.getTime() - h * 3600e3).toISOString();
  const L = {
    khang: [['N1', 0.3, 'session', 'S109', 'Hôm nay: Quy trình đặt hàng & giao hàng cho NPP', '14:00 · Trainer: Ngoc', 'Ngoc', 0],
      ['N2', 20, 'quiz', 'S107', 'Mời làm bài kiểm tra: Mani Dental product: Key SKUs FY68', 'Từ Giang · Hạn 20/10/2026', 'Giang', 0],
      ['N3', 26, 'reminder', 'S101', 'Bạn còn 3 chứng chỉ cần hoàn thành', 'Xem ở mục Chứng chỉ của tôi', '', 0],
      ['N4', 50, 'material', 'S107', 'Tài liệu mới: Mani Dental product: Key SKUs FY68', '2 tài liệu vừa được bổ sung', 'Giang', 1],
      ['N5', 140, 'cert', 'S102', 'Chứng chỉ: DIA-BURS: phân loại & chỉ định lâm sàng', 'Bạn đạt 90%. Chứng chỉ đã được cấp.', '', 1],
      ['N6', 160, 'session', 'S110', 'Buổi đào tạo mới: Kỹ năng xử lý từ chối khi thăm phòng khám nha', 'Ngày 14/10/2026 · Trainer: Minh Trang', 'Minh Trang', 1],
      ['N7', 260, 'invite', 'S104', 'Thư mời đào tạo: Kỹ năng trình bày sản phẩm với bác sĩ', 'Từ Minh Trang', 'Minh Trang', 1]],
    giang: [['N1', 0.3, 'session', 'S109', 'Hôm nay: Quy trình đặt hàng & giao hàng cho NPP', '14:00 · Trainer: Ngoc', 'Ngoc', 0],
      ['N2', 4, 'reminder', 'S101', 'Nhắc làm bài: Quy trình đề xuất & báo cáo công tác trên Report Hub', 'Còn 3 ngày — hạn 15/10/2026', 'Thuong', 0],
      ['N3', 30, 'session', 'S117', 'Buổi đào tạo mới: Quy trình đề nghị thanh toán & hoàn ứng', 'Ngày 14/10/2026 · Trainer: Ngoc', 'Ngoc', 1],
      ['N4', 98, 'cert', 'S104', 'Chứng chỉ: Kỹ năng trình bày sản phẩm với bác sĩ', 'Bạn đạt 90%. Chứng chỉ đã được cấp.', '', 1],
      ['N5', 200, 'invite', 'S104', 'Thư mời đào tạo: Kỹ năng trình bày sản phẩm với bác sĩ', 'Từ Minh Trang', 'Minh Trang', 1]]
  }[pre] || [];
  return L.map(([id, h, type, sid, title, message, by, read]) => ({id, at: ago(h), type, sid, title, message, by, read: !!read}));
}

/* ---------------- CẤU HÌNH ---------------- */
const CONFIG = {APP_TITLE: 'MMH Training Hub', APP_SUBTITLE: 'Hệ thống quản lý đào tạo — Mani Medical Hanoi', FISCAL_YEAR: 'FY68', COLOR_PRIMARY: '#003047', COLOR_ACCENT: '#3A5CAA', COLOR_HIGHLIGHT: '#FFE100', LOGO_TEXT: 'MANI',
  DEFAULT_PASS_SCORE: '80', DEFAULT_DURATION_MIN: '15', DEFAULT_MAX_ATTEMPTS: '2', DEFAULT_DEADLINE_DAYS: '7', TARGET_AVG_SCORE: '80', FY_START_MONTH: '9', FY_BASE_YEAR: '1959',
  CERT_SIGNER_NAME: 'Le Minh Chau (mẫu)', CERT_SIGNER_TITLE: 'Director, Mani Medical Hanoi', ENABLE_CERT_EMAIL: 'true', ENABLE_AUTO_REMINDER: 'true', REMINDER_DAYS_BEFORE: '1', APP_URL};
const META = {categories: ['Product', 'SOP', 'Compliance', 'Funtional skills'], types: ['Internal', 'External'], trainers: ['Giang', 'Thuong', 'Minh Trang', 'Hoa', 'Ngoc', 'Viet Ha', 'Minh Viet', 'Dam Ha', 'Tuyen'], audiences: Object.keys(GROUPS), statuses: ['Plan', 'Completed', 'Cancel']};

/* ================= MÁY CHỦ GIẢ LẬP ================= */
function createServer(opt) {
  opt = Object.assign({user: 'giang'}, opt || {});
  const me = UBY[opt.user];
  const log = [];
  const UPS = {}; let UPN = 0;
  const PROG = JSON.parse(JSON.stringify(PROG0));
  if (opt.matsDone) PROG.khang.S107 = {F107_1: 100, F107_2: 100, F107_3: 100};
  if (opt.matsNone) PROG.khang.S107 = {};
  const resp = RESP.slice(), enr = ENR.map(e => Object.assign({}, e));
  const canEdit = s => me.role === 'admin' || (me.role === 'trainer' && s.trainer.split(/[,;]/).some(n => n.trim() === me.name));
  const myProg = (pre, sid) => { const m = (PROG[pre] || {})[sid] || {}; return Object.entries(m).map(([fileId, p]) => ({email: pre, sid, fileId, fileName: (matsOf(sid).files.find(f => f.id === fileId) || {}).name || '', percent: p, completed: p >= 100, last: new Date(NOW.getTime() - (p >= 100 ? 50 : 20) * 3600e3).toISOString(), first: '', opens: 2, maxPage: 0, total: 0})); };
  function sessionsFor(test) {
    return BASE.filter(s => !test).map(s => {
      const o = Object.assign({}, s); delete o._q;
      const q = s._q, E = enr.filter(e => e.sid === s.sid), mine = E.find(e => e.pre === me.pre);
      Object.assign(o, {enrolled: E.length, completed: E.filter(e => e.status === 'Completed').length, passed: E.filter(e => e.pass).length,
        myStatus: mine ? mine.status : '', myScore: mine ? mine.percent : '', myPass: mine ? mine.pass : false, myCert: mine ? mine.certUrl : '', assigned: !!mine,
        hasQuiz: !!q, quizActive: q ? q.active : false, passScore: q ? q.passScore : '', durationMin: q ? q.durationMin : '', maxAttempts: q ? q.maxAttempts : 0,
        deadline: q ? q.deadline : '', questionCount: q ? q.total : 0, requireMaterials: q ? q.requireMaterials : false,
        myAttempts: resp.filter(r => r.sid === s.sid && r.email === me.email).length, hasFolder: !!s.folderUrl, canEdit: canEdit(s)});
      return o;
    });
  }
  function todo(list) {
    return list.filter(s => s.hasQuiz && s.quizActive && s.assigned && !s.myPass && s.status !== 'Cancel' && s.questionCount > 0 && s.myAttempts < (s.maxAttempts || 1))
      .map(s => ({sid: s.sid, topic: s.topic, category: s.category, trainer: s.trainer, deadline: s.deadline, overdue: !!(s.deadline && s.deadline < TODAY), questionCount: s.questionCount, durationMin: s.durationMin, passScore: s.passScore, attemptsLeft: (s.maxAttempts || 1) - s.myAttempts, myScore: s.myScore, requireMaterials: !!s.requireMaterials}))
      .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  }
  function gate(s, user) {
    const q = s._q; const optional = q ? q.optionalFiles : [];
    if (!q || !q.requireMaterials) return {required: false, passed: true, optional};
    if (canEdit(s) && !opt.asLearner) return {required: true, passed: true, bypass: true, optional};
    const req = matsOf(s.sid).files.filter(f => !optional.includes(f.id));
    const done = new Set(myProg(user.pre, s.sid).filter(x => x.completed).map(x => x.fileId));
    const missing = req.filter(f => !done.has(f.id)).map(f => ({id: f.id, name: f.name, path: f.path}));
    return {required: true, total: req.length, done: req.length - missing.length, missing, optional, passed: !missing.length};
  }
  function quizStatus(sid) {
    const s = SBY[sid], q = s._q;
    if (!q) return {available: false, hasQuiz: false, reason: 'Buổi đào tạo này chưa có bài kiểm tra.'};
    const mine = resp.filter(r => r.sid === sid && r.email === me.email).map(respOut);
    let best = null; mine.forEach(r => { if (!best || r.percent > best.percent) best = r; });
    const g = gate(s, me);
    let reason = '';
    if (!q.active) reason = 'Bài kiểm tra đang đóng.';
    else if (mine.length >= q.maxAttempts) reason = 'Bạn đã dùng hết ' + q.maxAttempts + ' lượt làm bài.';
    else if (!g.passed) reason = 'Cần học xong ' + g.missing.length + ' tài liệu còn lại trước khi làm bài.';
    return {hasQuiz: true, active: q.active, gate: g, requireMaterials: q.requireMaterials, available: q.active && q.total > 0 && mine.length < q.maxAttempts && g.passed,
      attempts: mine.length, maxAttempts: q.maxAttempts, passScore: q.passScore, durationMin: q.durationMin, totalQuestions: q.total, deadline: q.deadline,
      overdue: !!(q.deadline && q.deadline < TODAY), note: q.note, showResult: q.showResult, best, history: mine.slice().reverse(), inProgress: null, passed: !!(best && best.result === 'Pass'), reason};
  }
  function matsResp(sid) {
    const m = matsOf(sid);
    return {data: m.files, folders: m.folders || [], crumb: m.crumb || [], single: false, truncated: false, folderUrl: SBY[sid].folderUrl, folderName: m.folderName, message: m.message || '',
      myProgress: myProg(me.pre, sid), chunkSize: opt.chunkSize || 8388608, maxMb: 1024};
  }
  function learnerRows(s) {
    return enr.filter(e => e.sid === s.sid).map(e => {
      const pg = myProg(e.pre, s.sid);
      const last = pg.map(x => x.last).sort().pop();
      return {email: e.email, name: e.name, dept: UBY[e.pre].dept, status: e.status, percent: e.percent, pass: e.pass, attempt: e.attempt, certUrl: e.certUrl,
        completedAt: e.completedAt ? fmtDT(e.completedAt) : '', filesDone: pg.filter(x => x.completed).length, lastOpened: last ? fmtDT(new Date(last)) : ''};
    }).sort((a, b) => a.name.localeCompare(b.name));
  }
  function sessionFull(p) {
    const base = SBY[p.sid]; if (!base) return {ok: false, error: 'Không tìm thấy buổi đào tạo.'};
    const s = sessionsFor().find(x => x.sid === p.sid); const q = base._q;
    s.quizNote = q ? q.note : '';
    const E = enr.filter(e => e.sid === s.sid), mine = E.find(e => e.pre === me.pre);
    const out = {ok: true, data: s, my: mine ? {status: mine.status, percent: mine.percent, pass: mine.pass, attempt: mine.attempt, certUrl: mine.certUrl} : null,
      quiz: quizStatus(p.sid), myProgress: myProg(me.pre, p.sid),
      counts: {audience: audienceOf(s.audience).length, enrolled: E.length, completed: E.filter(e => e.status === 'Completed').length, passed: E.filter(e => e.pass).length}};
    if (canEdit(base)) { if (String(p.learners) === '1') out.learners = learnerRows(base); out.quizFileUrl = 'https://docs.google.com/spreadsheets/d/FAKE_QUIZ_FILE/edit'; }
    if (!p.noMats) out.materials = matsResp(p.sid);
    return out;
  }
  function results(sid) {
    const base = SBY[sid], q = base._q, bank = BANK[sid] || [];
    const s = Object.assign({}, base); delete s._q;
    const learners = learnerRows(base);
    const R = resp.filter(r => r.sid === sid);
    const best = {}, tries = {};
    R.forEach(r => { tries[r.email] = (tries[r.email] || 0) + 1; if (!best[r.email] || r.percent > best[r.email].percent) best[r.email] = r; });
    learners.forEach(l => { l.attempts = tries[l.email] || 0; l.best = best[l.email] ? best[l.email].percent : ''; l.bestTime = best[l.email] ? best[l.email].durationSec : ''; l.lastSubmit = best[l.email] ? fmtDT(best[l.email].at) : ''; });
    // phân tích từng câu: giả lập lựa chọn của mỗi lượt theo số câu đúng
    const diff = [0.95, 0.9, 0.85, 0.8, 0.45, 0.7, 0.92, 0.88, 0.4, 0.78];
    const items = bank.map((qq, i) => ({qid: qq.qid, no: qq.qno, question: qq.question, type: qq.type, correct: qq.correct, options: optsOf(qq), attempts: 0, correctN: 0, dist: {}, current: true}));
    R.forEach((r, ri) => {
      const nOk = Math.round(r.percent / 10);
      const order = items.map((it, i) => [i, diff[i] + ((ri * 7 + i * 3) % 10) / 40]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
      order.forEach((i, k) => { const it = items[i]; it.attempts++; if (k < nOk) { it.correctN++; it.dist[it.correct] = (it.dist[it.correct] || 0) + 1; } else { const w = it.options.map(o => o.k).filter(x => !it.correct.includes(x)); const g = it.type === 'multi' ? 'AB' : w[(ri + i) % w.length]; it.dist[g] = (it.dist[g] || 0) + 1; } });
    });
    items.forEach(it => { it.rate = it.attempts ? Math.round(it.correctN / it.attempts * 100) : null; let wr = null; for (const k in it.dist) if (k !== it.correct && (!wr || it.dist[k] > it.dist[wr])) wr = k; it.topWrong = wr; });
    const bl = Object.values(best), attempted = bl.length, passed = learners.filter(l => l.pass).length;
    const bins = [['< 50', 0, 49.99], ['50–59', 50, 59.99], ['60–69', 60, 69.99], ['70–79', 70, 79.99], ['80–89', 80, 89.99], ['90–100', 90, 100]];
    return {ok: true, session: s, config: Object.assign({sid}, q),
      kpi: {enrolled: learners.length, attempted, passed, notStarted: Math.max(0, learners.length - attempted), passRate: attempted ? Math.round(passed / attempted * 100) : 0,
        avgScore: attempted ? Math.round(bl.reduce((a, r) => a + r.percent, 0) / attempted * 10) / 10 : 0, avgTime: R.length ? Math.round(R.reduce((a, r) => a + r.durationSec, 0) / R.length) : 0, totalAttempts: R.length, target: 80},
      histogram: bins.map(([label, a, b]) => ({label, count: bl.filter(r => r.percent >= a && r.percent <= b).length})), items, learners,
      responses: R.slice().sort((a, b) => b.at - a.at).map(respOut), quizFileUrl: 'https://docs.google.com/spreadsheets/d/FAKE_QUIZ_FILE/edit'};
  }
  function stats() {
    const active = BASE.filter(s => s.status !== 'Cancel'), completed = active.filter(s => s.status === 'Completed');
    const qmap = {}; BASE.forEach(s => { if (s._q) qmap[s.sid] = s._q; });
    const byCat = {}, byTrainer = {}, byMonth = {};
    active.forEach(s => {
      const c = byCat[s.category] = byCat[s.category] || {name: s.category, total: 0, done: 0, withQuiz: 0, _s: 0, _n: 0}; c.total++; if (s.status === 'Completed') c.done++; if (qmap[s.sid]) c.withQuiz++;
      const t = byTrainer[s.trainer] = byTrainer[s.trainer] || {name: s.trainer, total: 0, done: 0, learners: 0, withQuiz: 0}; t.total++; if (s.status === 'Completed') t.done++; if (qmap[s.sid]) t.withQuiz++;
      const m = byMonth[s.month] = byMonth[s.month] || {name: s.month, total: 0, done: 0, _s: 0, _n: 0}; m.total++; if (s.status === 'Completed') m.done++;
    });
    enr.forEach(e => { const s = SBY[e.sid]; if (s.status === 'Cancel') return; byTrainer[s.trainer].learners++; if (e.percent !== '') { byCat[s.category]._s += e.percent; byCat[s.category]._n++; byMonth[s.month]._s += e.percent; byMonth[s.month]._n++; } });
    const fin = o => Object.values(o).map(x => { if ('_s' in x) { x.avg = x._n ? Math.round(x._s / x._n * 10) / 10 : null; delete x._s; delete x._n; } return x; });
    const sc = enr.filter(e => e.percent !== ''), done = enr.filter(e => e.status === 'Completed').length, pass = enr.filter(e => e.pass).length;
    const learners = USERS.map(u => { const E = enr.filter(e => e.pre === u.pre); const S = E.filter(e => e.percent !== ''); const ps = E.filter(e => e.pass).length;
      return {name: u.name, email: u.email, dept: u.dept, position: u.position, assigned: E.length, completed: E.filter(e => e.status === 'Completed').length, passed: ps, avg: S.length ? Math.round(S.reduce((a, e) => a + e.percent, 0) / S.length * 10) / 10 : 0, certs: E.filter(e => e.certUrl).length, rate: E.length ? Math.round(ps / E.length * 100) : 0}; })
      .sort((a, b) => b.passed - a.passed || b.avg - a.avg);
    const withQuiz = completed.filter(s => qmap[s.sid]);
    return {ok: true, kpi: {totalSessions: active.length, completedSessions: completed.length, plannedSessions: active.filter(s => s.status === 'Plan').length, cancelledSessions: BASE.length - active.length,
      sessionsWithQuiz: withQuiz.length, quizCoverage: Math.round(withQuiz.length / completed.length * 100), totalLearners: USERS.length, totalEnroll: enr.length, totalDone: done, totalPass: pass,
      passRate: done ? Math.round(pass / done * 100) : 0, completionRate: Math.round(done / enr.length * 100), avgScore: Math.round(sc.reduce((a, e) => a + e.percent, 0) / sc.length * 10) / 10, targetAvg: 80,
      totalCerts: enr.filter(e => e.certUrl).length, totalResponses: resp.length, openQuizzes: BASE.filter(s => s._q && s._q.active).length},
      byCategory: fin(byCat), byTrainer: fin(byTrainer).sort((a, b) => b.total - a.total), byMonth: fin(byMonth).sort((a, b) => a.name.localeCompare(b.name)), byType: [], learners, upcoming: [], recent: []};
  }
  function bootstrap(p) {
    const test = String(p.test) === '1';
    let sessions = sessionsFor();
    if (test) sessions = TEST_SESSIONS(p);
    const progressBySid = {}, recent = [];
    Object.keys(PROG[me.pre] || {}).forEach(sid => myProg(me.pre, sid).forEach(x => { const o = progressBySid[sid] = progressBySid[sid] || {opened: 0, done: 0}; o.opened++; if (x.completed) o.done++; recent.push({sid, fileId: x.fileId, fileName: x.fileName, percent: x.percent, completed: x.completed, last: x.last, topic: SBY[sid].topic}); }));
    recent.sort((a, b) => a.completed - b.completed || (a.last < b.last ? 1 : -1));
    return {ok: true, user: Object.assign(pub(me)), config: CONFIG, meta: META, sessions, todo: test ? [] : todo(sessions), recentMaterials: test ? [] : recent.slice(0, 8), progressBySid: test ? {} : progressBySid,
      unread: test ? 0 : notiFor(me.pre).filter(n => !n.read).length, groups: groupList(), users: USERS.map(u => ({email: u.email, name: u.name, role: u.role, dept: u.dept, position: u.position})),
      quizFileUrl: me.role !== 'audience' ? 'https://docs.google.com/spreadsheets/d/FAKE_QUIZ_FILE/edit' : '', driveFolders: {parent: 'https://drive.google.com/drive/folders/FAKE_PARENT', certificate: 'https://drive.google.com/drive/folders/FAKE_CERT'}, today: TODAY};
  }
  function TEST_SESSIONS() {
    const s = Object.assign({}, SBY.S107); delete s._q;
    return [Object.assign(s, {sid: 'TEST-20261012-5', topic: 'Buổi test: Mani Dental Key SKUs', date: '2026-10-13', dateText: '13/10/2026', status: 'Plan', audience: 'Giang', enrolled: 1, completed: 0, passed: 0,
      myStatus: '', myScore: '', myPass: false, myCert: '', assigned: true, hasQuiz: true, quizActive: true, passScore: 80, durationMin: 10, maxAttempts: 2, deadline: '2026-10-19', questionCount: 5, requireMaterials: true,
      myAttempts: 0, hasFolder: true, canEdit: true, preSent: true})];
  }
  const H = {
    ping: () => ({ok: true, service: 'MMH Training Hub', version: '3.14', time: NOW.toISOString()}),
    login: p => ({ok: true, message: 'Đăng nhập thành công.', token: 'tok-' + me.pre, expiresAt: Date.now() + 30 * 864e5, user: pub(me)}),
    requestOtp: p => ({ok: true, message: 'Đã gửi mã kích hoạt tới ' + String(p.email || '').split('@')[0] + '@example.com', expiresIn: 600}),
    verifyOtp: p => H.login(p),
    me: () => ({ok: true, user: pub(me)}),
    bootstrap, pulse: () => ({ok: true, unread: notiFor(me.pre).filter(n => !n.read).length, latest: [], todo: todo(sessionsFor()).length}),
    sessionFull, listMaterials: p => Object.assign({ok: true, pending: false, noAccess: false, runner: ''}, matsResp(p.sid)),
    myQuizStatus: p => Object.assign(quizStatus(p.sid), {ok: true}),
    notifications: () => { const L = notiFor(me.pre); return {ok: true, unread: L.filter(n => !n.read).length, items: L}; },
    markRead: () => ({ok: true, updated: 1}),
    myCertificates: () => ({ok: true, data: enr.filter(e => e.pre === me.pre && e.certUrl).map(e => { const s = SBY[e.sid]; return {sid: e.sid, topic: e.topic, category: s.category, trainer: s.trainer, dateText: s.dateText, percent: e.percent, certUrl: e.certUrl, issuedAt: fmtDT(e.certSentAt).slice(0, 10), issuedIso: e.certSentAt.toISOString()}; }).sort((a, b) => a.issuedIso < b.issuedIso ? 1 : -1)}),
    getStats: stats, sessionResults: p => results(p.sid),
    getQuiz: p => { const q = SBY[p.sid]._q; return {ok: true, config: q ? Object.assign({sid: p.sid}, q) : null, questions: (BANK[p.sid] || []).map(x => ({qid: x.qid, type: x.type, question: x.question, a: x.a, b: x.b, c: x.c, d: x.d, correct: x.correct, points: 1, explanation: x.explanation})), session: {sid: p.sid}}; },
    quizStart: p => { const s = SBY[p.sid], q = s._q, bank = BANK[p.sid]; const w = Math.round(100 / bank.length * 10) / 10;
      return {ok: true, attemptId: 'A-' + p.sid + '-1', startedAt: Date.now(), resumed: false, durationSec: q.durationMin * 60, remainingSec: q.durationMin * 60, passScore: q.passScore, showResult: true, deadline: q.deadline, note: q.note,
        session: {sid: s.sid, topic: s.topic, category: s.category, trainer: s.trainer, dateText: s.dateText}, questions: bank.map((x, i) => ({qid: x.qid, no: i + 1, type: x.type, question: x.question, options: optsOf(x), points: w, multi: x.type === 'multi'})),
        attemptNo: resp.filter(r => r.sid === p.sid && r.email === me.email).length + 1, maxAttempts: q.maxAttempts}; },
    quizSubmit: p => { const sid = String(p.attemptId).split('-')[1], s = SBY[sid], q = s._q, bank = BANK[sid]; const ans = typeof p.answers === 'string' ? JSON.parse(p.answers) : (p.answers || {});
      let n = 0; const detail = bank.map((x, i) => { const g = String(ans[x.qid] || '').split('').sort().join(''); const ok = !!g && g === x.correct; if (ok) n++; return {no: i + 1, qid: x.qid, type: x.type, question: x.question, options: optsOf(x), given: g, correct: x.correct, isCorrect: ok, points: 10, explanation: x.explanation}; });
      const pct = Math.round(n * 100 / bank.length), pass = pct >= q.passScore; const no = resp.filter(r => r.sid === sid && r.email === me.email).length + 1;
      return {ok: true, score: pct, maxScore: 100, percent: pct, correctCount: n, totalQuestions: bank.length, passScore: q.passScore, pass, overtime: false, durationSec: 512, attemptNo: no, maxAttempts: q.maxAttempts,
        canRetry: !pass && no < q.maxAttempts, detail, certificate: pass ? {id: 'CERT1', name: 'cert.pdf', url: 'https://drive.google.com/file/d/CERT_' + sid + '_' + me.pre + '/view', certNo: 'MMH-20261012-' + me.pre.toUpperCase().slice(0, 6) + '-417', emailed: true} : null,
        message: pass ? 'Chúc mừng! Bạn đã hoàn thành bài kiểm tra.' : 'Bạn chưa đạt điểm yêu cầu (' + q.passScore + '%).'}; },
    trackProgress: p => ({ok: true, percent: 30, completed: false, maxPage: 2, total: 8, sessionDone: false}),
    fileMeta: p => { const pdf = fs.readFileSync(__dirname + '/assets/deck.pdf'); return {ok: true, id: p.fileId, name: 'deck', view: 'pdf', targetId: 'T_' + p.fileId, mime: 'application/pdf', size: pdf.length, chunk: 1572864, parts: 1, updatedMs: 1791000000000}; },
    fileChunk: p => { const pdf = fs.readFileSync(__dirname + '/assets/deck.pdf'); return {ok: true, i: 0, size: pdf.length, data: pdf.toString('base64')}; },
    fileConvert: () => ({ok: true, stage: 'ready'}),
    previewInvite: p => { const s = SBY[p.sid]; const c = GAS.invite(Object.assign({}, s), {name: me.name, email: me.email, position: me.position}, {kind: p.kind, appUrl: APP_URL, note: p.note, subject: p.subject, deadline: p.deadline}, CONFIG, s._q);
      const rec = (Array.isArray(p.recipients) ? p.recipients : JSON.parse(p.recipients || '[]')); return {ok: true, subject: c.subject, html: c.html, text: c.text, recipients: rec, quota: 1384}; },
    listUsers: () => ({ok: true, data: USERS.map((u, i) => Object.assign(pub(u), {activated: u.activated, lastLogin: u.lastLogin, row: i + 2})), groups: groupList()}),
    getLogs: () => ({ok: true, data: [['12/10/2026 08:30:04', 'INFO', 'dayReminder', 'Nhắc lịch hôm nay: Quy trình đặt hàng & giao hàng cho NPP: 14 email'], ['12/10/2026 08:30:09', 'INFO', 'dailyReminder', 'Đã nhắc: Quy trình đề xuất & báo cáo công tác trên Report Hub: 3 người'], ['12/10/2026 08:30:15', 'INFO', 'weeklyDigest', 'Nhắc hằng tuần: đã gửi 9 email.']].map(r => ({time: r[0], level: r[1], action: r[2], message: r[3], detail: ''}))}),
    uploadInit: p => { const id = 'U' + (++UPN), ch = opt.chunkSize || 8388608; UPS[id] = +p.size; const done = ch >= +p.size;
      return {ok: true, uploadId: id, next: Math.min(ch, +p.size), done, file: done ? {id: 'NEW' + id, name: p.name, view: 'pdf'} : null}; },
    uploadChunk: p => { const ch = opt.chunkSize || 8388608, nx = (+p.offset) + ch, done = nx >= UPS[p.uploadId]; return {ok: true, next: Math.min(nx, UPS[p.uploadId]), done, file: done ? {id: 'NEW' + p.uploadId, view: 'pdf'} : null}; },
    uploadStatus: p => ({ok: true, next: 0, done: false}),
    clientLog: () => ({ok: true}), logout: () => ({ok: true})
  };
  function handle(action, params) {
    log.push(action);
    const fn = H[action];
    const r = fn ? fn(params) : {ok: false, error: 'MOCK: chưa giả lập ' + action};
    if (r && typeof r === 'object') r._v = '3.14';
    return r;
  }
  return {handle, log, me};
}

module.exports = {createServer, USERS, BASE, SBY, BANK, CONFIG, GAS, NOW, TODAY, APP_URL, ENR};
