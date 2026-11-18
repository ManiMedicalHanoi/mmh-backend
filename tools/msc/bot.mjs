// Bot tải hồ sơ gói thầu từ muasamcong.mof.gov.vn — chạy trên GitHub Actions (workflow "Theo dõi gói thầu — tải hồ sơ")
// hoặc trên 1 máy Windows đã cài Agent của muasamcong (WT_AGENT=1 ⇒ tải được cả file PDF đính kèm).
// Hàng đợi: backend tender-info ▸ MMH_Watch.gs (botNext / botFile / botDone). App: Tender-Result/theo-doi/ (điện thoại + máy tính).
//
// Các bước (đã chạy thử với IB2500491794, 17/11/2026):
//  1. Trang chủ ⇒ gỡ popup ⇒ gõ số vào ô tìm kiếm (trang tự sinh mã reCAPTCHA — không gọi API tìm kiếm trực tiếp được)
//  2. Đọc JSON kết quả (smart/search) ⇒ mở thẳng trang chi tiết (link render=detail-v2)
//  3. Tab Thông báo mời thầu: file đính kèm + "Tải TBMT"; tab Kết quả lựa chọn nhà thầu: file đính kèm + mọi nút "Xuất Excel"
//     (Danh sách nhà thầu, Danh sách hàng hóa — trang tự tạo file, không cần Agent)
//  4. File đính kèm (thẻ tags-fileAttach): trang gọi Agent http://localhost:1234/api/download/file/browser/public?fileId=…
//     ⇒ bot bắt fileId; có Agent ⇒ tự lấy file; không ⇒ ghi tên file vào info.agentFiles (app hiện nút mở trang gói).
// Biến môi trường: WT_URL, WT_BOT_KEY, WT_N (gói / lượt, mặc định 6), WT_PAR (song song, mặc định 3), WT_AGENT (1 = có Agent).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.WT_URL, KEY = process.env.WT_BOT_KEY, BOT = process.env.WT_BOT_NAME || 'github-actions';
const N = +(process.env.WT_N || 6), PAR = Math.max(1, Math.min(+(process.env.WT_PAR || 3), 5)), AGENT = process.env.WT_AGENT === '1';
const OUT = process.env.WT_OUT || 'wt-out';
const HOME = 'https://muasamcong.mof.gov.vn/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const safe = (s, n = 150) => String(s || '').replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, n) || 'file';
const DRY = process.env.WT_DRY ? process.env.WT_DRY.split(/[ ,]+/).filter(Boolean) : null;   // chạy thử: WT_DRY="IB2500491794 PL2500276110" ⇒ không gọi máy chủ, in kết quả
if (!DRY && (!URL || !KEY)) { say('Thiếu WT_URL / WT_BOT_KEY — dừng.'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { say('⏱ quá 20 phút — dừng'); process.exit(3); }, 20 * 60e3).unref();

async function api(action, body) {
  if (DRY) {
    if (action === 'botNext') { const no = DRY.shift(); return { ok: true, jobs: no ? [{ key: 'dry:' + no, type: /^PL/i.test(no) ? 'khmt' : 'kqdt', no, investor: '', name: no }] : [] }; }
    if (action === 'botFile') { say(`    [thử] botFile sec=${body.sec} · ${body.name} · ${Math.round(body.b64.length * 0.75 / 1024)} KB`); return { ok: true, name: body.name, url: 'dry://' + body.name }; }
    if (action === 'botDone') { say('    [thử] botDone ' + body.status + ' · ' + body.note); say('    [thử] info ' + String(body.info).slice(0, 3000)); say('    [thử] docs ' + String(body.docs || '').slice(0, 2000)); return { ok: true, sum: 0 }; }
    return { ok: true };
  }
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action, key: KEY, bot: BOT }, body || {})), redirect: 'follow' });
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { throw new Error('trả về không phải JSON: ' + t.slice(0, 160)); }
    } catch (e) { say('  ! ' + action + ' lỗi lần ' + (i + 1) + ': ' + e.message); await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  return { ok: false, error: 'không gọi được máy chủ' };
}
const MIME = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip', rar: 'application/vnd.rar' };

async function closePopups(pg) {
  for (let i = 0; i < 4; i++) {
    const r = await pg.evaluate(() => {
      const big = e => { const cs = getComputedStyle(e); return cs.position === 'fixed' && e.offsetWidth > innerWidth * 0.6 && e.offsetHeight > innerHeight * 0.6 && +cs.zIndex >= 50 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
      const ov = [...document.querySelectorAll('body *')].filter(big);
      if (!ov.length) return '';
      for (const o of ov) for (const b of o.querySelectorAll('button,a,[role=button]')) {
        const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
        if (/^(đóng|đóng thông báo|close|bỏ qua|đã hiểu|tôi đã hiểu|ok|x|×|✕)$/i.test(t)) { b.click(); return 'bấm ' + t; }
      }
      ov.forEach(e => e.remove()); document.body.style.overflow = 'auto'; return 'gỡ';
    }).catch(() => '');
    if (!r) return;
    await pg.waitForTimeout(300);
  }
}
const waitText = (pg, src, ms) => pg.waitForFunction(s => new RegExp(s, 'i').test(document.body.innerText), src, { timeout: ms }).then(() => true, () => false);

/* gõ số + Enter, chờ đúng phản hồi tìm kiếm; trang chưa sẵn mã reCAPTCHA ⇒ thử lại (tối đa 3 lần) */
async function searchFor(pg, box, no) {
  for (let i = 0; i < 3; i++) {
    await pg.waitForTimeout(1500 + i * 2500);
    await box.fill(''); await box.fill(no);
    const r = await Promise.all([pg.waitForResponse(x => /search/.test(x.url()) && /token=/.test(x.url()) && (x.request().postData() || '').includes(no), { timeout: 25000 }).catch(() => null), box.press('Enter')]).then(x => x[0]);
    if (r) return r;
    await closePopups(pg);
  }
  throw new Error('Trang tìm kiếm muasamcong không phản hồi (thử 3 lần)');
}

/* tìm số ⇒ mở trang chi tiết; trả { url, investor, bidName, planNo, planName, prov } */
async function openPackage(pg, no) {
  const bare = no.toUpperCase().replace(/-\d+$/, ''), plan = /^PL/.test(bare);
  await pg.goto(HOME, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForSelector('input[placeholder*="IB000202"]:visible', { timeout: 30000 });
  await closePopups(pg);
  let sel = 'input[placeholder*="IB000202"]:visible';
  if (plan) {
    await pg.locator('label:has-text("KHLCNT"):visible').first().click({ timeout: 4000 }).catch(() => {});
    await pg.waitForTimeout(800);
    if (await pg.locator('input[placeholder*="KHLCNT"]:visible').count()) sel = 'input[placeholder*="KHLCNT"]:visible';
  }
  const box = pg.locator(sel).first();
  const res = await searchFor(pg, box, bare);
  let items = []; try { items = (await res.json()).page.content || []; } catch (e) {}
  const hit = items.find(x => String(x.notifyNo || x.planNo || '').toUpperCase().startsWith(bare)) || items[0];
  if (!hit) return null;
  const link = pg.locator('a[href*="render=detail"]').first();
  await link.waitFor({ timeout: 20000 });
  let url = await link.getAttribute('href');
  if (url && url.startsWith('/')) url = 'https://muasamcong.mof.gov.vn' + url;
  await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const one = v => Array.isArray(v) ? v[0] : (v || '');
  const loc = (hit.locations || [])[0] || {};
  return { url, plan, investor: one(hit.investorName) || one(hit.procuringEntityName) || '', bidName: plan ? (hit.name || one(hit.bidName)) : one(hit.bidName),
    planNo: one(hit.planNo), planName: one(hit.planName) || (plan ? hit.name || '' : ''), prov: loc.provName || loc.provinceName || '',
    posted: vnTime(one(hit.publicDate)), close: vnTime(hit.bidCloseDate), price: hit.investTotal || '' };
}

const vnTime = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '') : ''; };
/* nhãn hay gặp trên trang TBMT / KQLCNT / KHLCNT — dùng khi trang không theo khối .infomation__content */
const KNOWN = ['Mã TBMT', 'Ngày đăng tải', 'Mã KHLCNT', 'Tên KHLCNT', 'Phân loại KHLCNT', 'Tên dự toán mua sắm', 'Tên gói thầu', 'Bên mời thầu', 'Chủ đầu tư', 'Chi tiết nguồn vốn',
  'Lĩnh vực', 'Hình thức lựa chọn nhà thầu', 'Loại hợp đồng', 'Trong nước/ Quốc tế', 'Phương thức lựa chọn nhà thầu', 'Thời gian thực hiện hợp đồng', 'Thời gian thực hiện gói thầu',
  'Gói thầu có nhiều phần/lô', 'Số lượng phần (lô)', 'Hình thức dự thầu', 'Địa điểm thực hiện gói thầu', 'Thời điểm đóng thầu', 'Thời điểm mở thầu', 'Hiệu lực hồ sơ dự thầu',
  'Số tiền bảo đảm dự thầu', 'Số quyết định phê duyệt', 'Ngày phê duyệt', 'Cơ quan ban hành quyết định', 'Số lượng gói thầu', 'Dự toán mua sắm', 'Giá gói thầu', 'Giá dự toán',
  'Thời gian đăng tải', 'Trạng thái đăng tải', 'Giá trúng thầu', 'Nhà thầu trúng thầu', 'Tên nhà thầu trúng thầu', 'Ngày phê duyệt kết quả'];
/* đọc mọi cặp "nhãn ⇒ giá trị" đang hiện + bảng "Danh sách gói thầu" (KHLCNT) */
async function readFields(pg) {
  return pg.evaluate(KN => {
    const o = {};
    for (const r of document.querySelectorAll('.infomation__content')) {
      if (!r.offsetParent) continue;
      const t = r.querySelector('.infomation__content__title'); if (!t) continue;
      const k = t.innerText.trim().replace(/:$/, ''); if (!k || o[k]) continue;
      const v = r.innerText.replace(t.innerText, '').replace(/\s+\n/g, '\n').trim().slice(0, 500);
      if (v) o[k] = v;
    }
    const tb = [...document.querySelectorAll('table')].find(t => t.offsetParent && /Giá gói thầu/.test(t.innerText) && /Tên gói thầu/.test(t.innerText));
    let txt = document.body.innerText;
    if (tb) txt = txt.split(tb.innerText).join('\n');          // bảng gói thầu đọc riêng ở dưới, không lẫn vào nhãn ⇒ giá trị
    const lines = [].concat(...txt.split('\n').map(x => x.split('\t'))).map(x => x.trim()).filter(Boolean);
    const nInfo = Object.keys(o).length;
    for (let i = 0; nInfo < 5 && i < lines.length - 1; i++) {     // chỉ khi trang không theo khối .infomation__content (vd. KHLCNT dạng bảng)
      const k = lines[i];
      if (KN.indexOf(k) >= 0 && !o[k] && KN.indexOf(lines[i + 1]) < 0) o[k] = (lines[i + 1] + (/^\d\d:\d\d$/.test(lines[i + 1]) && /^\d\d\/\d\d\/\d{4}$/.test(lines[i + 2] || '') ? ' ' + lines[i + 2] : '')).slice(0, 500);
    }
    if (tb) {
      const hr = [...tb.querySelectorAll('tr')].find(tr => tr.querySelector('th') && /Giá gói thầu/.test(tr.innerText)) || tb.querySelector('tr');
      const head = [...hr.querySelectorAll('th,td')].map(th => th.innerText.trim().replace(/\s*\(VND\)\s*$/, ''));
      const rows = [...tb.querySelectorAll('tr')].filter(tr => tr !== hr && !tr.querySelector('th')).map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())).filter(r => r.length >= Math.min(head.length - 2, 6));
      o._pkgs = rows.slice(0, 30);
    }
    return o;
  }, KNOWN).catch(() => ({}));
}
/* chờ trang điền giá trị thật (nhãn hiện trước, số liệu đến sau) */
const waitValues = (pg, re) => pg.waitForFunction(s => { const R = new RegExp(s); return [...document.querySelectorAll('.infomation__content')].some(r => r.offsetParent && R.test(r.innerText)) || (/^PL/.test(s) && new RegExp('[\\n\\t]\\s*' + s).test(document.body.innerText)); }, re, { timeout: 40000 }).then(() => true, () => false);

/* nhãn của 1 phần tử (file đính kèm / nút Excel): tiêu đề dòng chứa nó, bỏ "Chương V:", "Phần 2:" và tên file */
async function labelOf(el) {
  return el.evaluate(e => {
    const own = (e.innerText || '').trim();
    const clean = s => String(s || '').replace(own, '').replace(/\s+/g, ' ').replace(/^\s*\d+(\.\d+)*\s*/, '').replace(/^(Chương|Phần)\s+[\dIVXLC]+[A-Z]?\s*[.:\-]?\s*/i, '').replace(/[\w.\- ()]+\.(pdf|docx?|xlsx?|zip|rar)\b/gi, '').replace(/\s*(Xuất Excel|Tải về|Tải xuống)\s*/gi, ' ').trim();
    const ic = e.closest('.infomation__content'); if (ic) { const t = ic.querySelector('.infomation__content__title'); if (t) return clean(t.innerText); }
    const tr = e.closest('tr');
    if (tr) { const tds = [...tr.querySelectorAll('th,td')].map(td => clean(td.innerText)).filter(x => x && !/^\d+(\.\d+)*$/.test(x)); if (tds[0]) return tds[0]; }
    let n = e;
    for (let i = 0; i < 6 && n; i++, n = n.parentElement) {
      let p = n.previousElementSibling;
      for (let k = 0; k < 3 && p; k++, p = p.previousElementSibling) { const t = clean(p.innerText); if (t && t.length < 120) return t; }
    }
    return '';
  }).catch(() => '');
}
/* 1 dòng bảng "Danh sách gói thầu" (KHLCNT): tiêu đề 2 tầng làm lệch cột ⇒ nhận theo nội dung ô */
function pkgRow(r) {
  const o = {}, dur = [];
  r.forEach(v => {
    if (!o['Giá gói thầu'] && /^\d{1,3}(\.\d{3}){2,}$/.test(v)) o['Giá gói thầu'] = v;
    else if (!o['Hình thức LCNT'] && /^(Đấu thầu|Chào hàng|Chỉ định|Mua sắm trực tiếp|Tự thực hiện|Đàm phán|Lựa chọn nhà thầu trong trường hợp đặc biệt)/i.test(v)) o['Hình thức LCNT'] = v;
    else if (!o['Phương thức LCNT'] && /^(Một|Hai) giai đoạn|túi hồ sơ/i.test(v)) o['Phương thức LCNT'] = v;
    else if (!o['Loại hợp đồng'] && /^(Trọn gói|Đơn giá|Theo thời gian|Theo chi phí|Theo kết quả|Hỗn hợp)/i.test(v)) o['Loại hợp đồng'] = v;
    else if (/^\d+([.,]\d+)?\s*(tháng|ngày|năm|tuần)$/i.test(v)) dur.push(v);
    else if (!o['Chi tiết nguồn vốn'] && /(nguồn|vốn|ngân sách|quỹ|thu sự nghiệp)/i.test(v) && v.length > 12) o['Chi tiết nguồn vốn'] = v;
  });
  if (dur.length) o['Thời gian thực hiện gói thầu'] = dur[dur.length - 1];   // ô thời gian cuối = thời gian thực hiện (trước là thời gian tổ chức LCNT)
  return o;
}
const extOf = n => ((String(n).match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toLowerCase();
function docName(no, label, ext, used) {
  let base = safe(no + ' - ' + (label || 'Tài liệu'), 140), nm = base + (ext ? '.' + ext : ''), k = 2;
  while (used.has(nm)) nm = base + ' (' + (k++) + ')' + (ext ? '.' + ext : '');
  used.add(nm); return nm;
}
/* tên loại tài liệu chuẩn theo nhãn trên trang */
function docType(sec, label, fname) {
  const t = (label + ' ' + fname).toLowerCase();
  if (sec === 'kq') {
    if (/quyết định|quyet dinh|qđ|qd/.test(t)) return 'Quyết định phê duyệt KQLCNT';
    if (/báo cáo|bao cao|đánh giá|danh gia/.test(t)) return 'Báo cáo đánh giá tổng hợp E-HSDT';
    if (/nhà thầu|nha.?thau/.test(t)) return 'Danh sách nhà thầu';
    if (/hàng hóa|hàng hoá|hang.?hoa/.test(t)) return 'Danh sách hàng hóa';
  }
  if (sec === 'tbmt' && /quyết định|quyet dinh/.test(t)) return 'Quyết định phê duyệt HSMT';
  if (sec === 'kh' && /quyết định|quyet dinh/.test(t)) return 'Quyết định phê duyệt KHLCNT';
  return label || (sec === 'kq' ? 'Tài liệu kết quả' : sec === 'kh' ? 'Tài liệu KHLCNT' : 'Tài liệu TBMT');
}

/* người dùng chọn tải 1 số loại tài liệu (app ▸ Chọn tài liệu ⇒ info.want): tbmt · hsmt · kq · nt · hh · qd · kh; trống = tất cả */
function wants(c, ...keys) { const W = (c.job.info || {}).want; return !W || !W.length || keys.some(k => W.indexOf(k) >= 0); }
function keyOf(sec, type, prefix) {
  if (/^Danh sách nhà thầu/.test(type)) return ['nt'];
  if (/^Danh sách hàng hóa/.test(type)) return ['hh'];
  if (/^(Quyết định|Báo cáo)/.test(type)) return sec === 'kh' ? ['qd', 'kh'] : ['qd'];
  if (prefix === 'HSMT') return ['hsmt'];
  return [sec === 'kq' ? 'kq' : sec];
}

async function attachments(pg, ctx2, sec, prefix) {
  const { job, files, docs, cap, used } = ctx2;
  // file đính kèm = thẻ tags.tags-fileAttach + mọi phần tử lá đang hiện có chữ là tên file (.pdf/.doc…) — trang KHLCNT, bảng HSMT không dùng thẻ tags
  await pg.evaluate(() => {
    document.querySelectorAll('[data-wtf]').forEach(e => e.removeAttribute('data-wtf'));
    const RX = /\.(pdf|docx?|xlsx?|zip|rar|7z)$/i; let n = 0;
    for (const e of document.querySelectorAll('tags.tags-fileAttach, body a, body span, body div, body td, body p, body li, body button')) {
      if (!e.offsetParent || e.closest('[data-wtf]') || e.querySelector('[data-wtf]')) continue;
      const t = (e.innerText || '').trim();
      if (!t || t.length > 250) continue;
      if (e.matches('tags.tags-fileAttach') || (RX.test(t) && ![...e.children].some(c => RX.test((c.innerText || '').trim())))) e.setAttribute('data-wtf', String(n++));
    }
  }).catch(() => {});
  const items = pg.locator('[data-wtf]');
  const n = await items.count(), seen = ctx2.seenF || (ctx2.seenF = new Set());
  for (let i = 0; i < n; i++) {
    const el = items.nth(i), orig = safe((await el.innerText().catch(() => '')).trim());
    if (!orig || seen.has(orig)) continue; seen.add(orig);
    const label = (await labelOf(el)) || orig.replace(/\.[a-z0-9]+$/i, '');
    const type = (prefix ? prefix + ' - ' : '') + docType(sec, label, orig);
    if (!wants(ctx2, ...keyOf(sec, type, prefix))) continue;
    const name = docName(ctx2.no, type, extOf(orig), used);
    cap.length = 0;
    await el.click({ timeout: 5000 }).catch(() => {});
    for (let k = 0; k < 30 && !cap.length; k++) await pg.waitForTimeout(100);
    await closePopups(pg);
    const fid = cap[cap.length - 1] || '';
    if (AGENT && fid) {
      try {
        const r = await fetch('http://localhost:1234/api/download/file/browser/public?fileId=' + encodeURIComponent(fid), { headers: { Origin: 'https://muasamcong.mof.gov.vn' } });
        const buf = Buffer.from(await r.arrayBuffer());
        if (r.ok && buf.length > 100) { const f = path.join(OUT, job.key.replace(/\W+/g, '_') + '_' + name); fs.writeFileSync(f, buf); files.push({ name, file: f, sec, type }); say(`    ⬇ ${name} (Agent, ${buf.length} byte)`); continue; }
      } catch (e) { say('    ! Agent: ' + e.message); }
    }
    ctx2.agentFiles.push({ name: orig, fileId: fid, tab: sec, type });
    docs.push({ sec, docType: type, name: orig, agent: true });
    say(`    · ${type} (${orig}) — cần Agent`);
  }
}

async function excels(pg, ctx2, sec) {
  if (!wants(ctx2, 'nt', 'hh')) return;
  const btns = pg.locator(':is(a,button):text-is("Xuất Excel"):visible');
  const n = await btns.count();
  for (let k = 0; k < n; k++) {
    const b = btns.nth(k);
    await b.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    const label = await labelOf(b);
    let d = null;
    for (let t = 0; t < 2 && !d; t++) {    // trang chậm ⇒ bấm lại 1 lần, chờ lâu hơn
      if (t) { say(`    · Xuất Excel #${k + 1}: chưa ra file — bấm lại`); await closePopups(pg); await pg.waitForTimeout(3000); }
      d = await Promise.all([pg.waitForEvent('download', { timeout: t ? 75000 : 45000 }).catch(() => null), b.click({ timeout: 8000, force: t > 0 }).catch(() => null)]).then(x => x[0]);
    }
    await closePopups(pg);
    if (!d) { say(`    · Xuất Excel #${k + 1}: không ra file`); ctx2.miss = (ctx2.miss || 0) + 1; continue; }
    const sug = d.suggestedFilename(), type = docType(sec, label, sug);
    if (!wants(ctx2, ...keyOf(sec, type, ''))) { say(`    · bỏ qua ${type} (không chọn)`); continue; }
    const name = docName(ctx2.no, type, extOf(sug) || 'xlsx', ctx2.used), f = path.join(OUT, ctx2.job.key.replace(/\W+/g, '_') + '_' + name);
    await d.saveAs(f);
    ctx2.files.push({ name, file: f, sec, type });
    say(`    ⬇ ${name} (${fs.statSync(f).size} byte)`);
  }
}
/* in trang đang xem thành PDF (bản lưu nội dung trang muasamcong — không cần Agent) */
async function printPage(pg, ctx2, sec, type) {
  if (!wants(ctx2, sec)) return;
  try {
    const name = docName(ctx2.no, type, 'pdf', ctx2.used), f = path.join(OUT, ctx2.job.key.replace(/\W+/g, '_') + '_' + name);
    await pg.emulateMedia({ media: 'screen' });
    await pg.evaluate(() => { document.querySelectorAll('header, footer, .header, .footer, #header, #footer').forEach(e => e.style.display = 'none'); }).catch(() => {});
    await pg.pdf({ path: f, format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    if (fs.statSync(f).size > 3000) { ctx2.files.push({ name, file: f, sec, type }); say(`    ⬇ ${name} (in trang)`); }
  } catch (e) { say('    ! in PDF: ' + e.message.split('\n')[0]); }
}
/* chờ số liệu; trang chậm ⇒ tải lại 1 lần rồi chờ tiếp */
async function ensureValues(pg, url, re, tabs) {
  for (let i = 0; i < 2; i++) {
    for (const t of tabs) await clickTab(pg, t);
    if (await waitValues(pg, re)) return true;
    if (i) break;
    say('    · trang chậm — tải lại');
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(3000); await closePopups(pg);
  }
  return false;
}
/* nút "Tải TBMT" (và "Tải KQLCNT" / "Tải KHLCNT" nếu có): trang tự dựng PDF bằng pdfmake trên trình duyệt (file như người dùng tải tay).
   Bắt file theo 3 đường: sự kiện download · móc pdfMake.createPdf lấy base64 · trang mới (blob:) ⇒ không được thì mới in trang. */
async function pagePdf(pg, ctx2, sec, type, re) {
  if (!wants(ctx2, sec)) return true;
  // phần tử NHỎ NHẤT đang hiện có chữ đúng "Tải TBMT"… (không lấy khối cha chứa cả đoạn chữ)
  const found = await pg.evaluate(src => {
    const R = new RegExp(src, 'i'); document.querySelectorAll('[data-wtb]').forEach(e => e.removeAttribute('data-wtb'));
    const C = [...document.querySelectorAll('body *')].filter(e => e.offsetParent && R.test((e.innerText || '').trim()) && (e.innerText || '').trim().length <= 30);
    const leaf = C.filter(e => !C.some(o => o !== e && e.contains(o)));
    const el = leaf[0]; if (!el) return '';
    const clickable = el.closest('a,button,[role=button],tags,span') || el; clickable.setAttribute('data-wtb', '1'); return (el.innerText || '').trim();
  }, re.source).catch(() => '');
  if (!found) return false;
  const btn = pg.locator('[data-wtb]').first(), txt = found;
  await pg.evaluate(() => {
    window.__wtPdf = null;
    const hook = () => { const M = window.pdfMake; if (!M || !M.createPdf || M.__wt) return;
      const o = M.createPdf; M.__wt = 1;
      M.createPdf = function () { const d = o.apply(this, arguments); const keep = b => { window.__wtPdf = b; };
        ['download', 'open', 'print'].forEach(k => { const f = d[k]; d[k] = function () { try { d.getBase64(keep); } catch (e) {} if (k !== 'download' && f) { /* không mở tab */ } }; });
        return d; };
    };
    hook(); window.__wtHookT = setInterval(hook, 200);
  }).catch(() => {});
  const ctx = pg.context();
  const dlP = pg.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  const popP = ctx.waitForEvent('page', { timeout: 60000 }).catch(() => null);
  await btn.click({ timeout: 8000 }).catch(() => {});
  let buf = null, how = '';
  const t0 = Date.now();
  while (!buf && Date.now() - t0 < 60000) {
    const b64 = await pg.evaluate(() => window.__wtPdf).catch(() => null);
    if (b64) { buf = Buffer.from(b64, 'base64'); how = 'pdfmake'; break; }
    const d = await Promise.race([dlP, new Promise(r => setTimeout(() => r(undefined), 700))]);
    if (d) { const f = path.join(OUT, 'tmp_' + Date.now() + '.pdf'); await d.saveAs(f); buf = fs.readFileSync(f); how = 'download'; break; }
    const pop = await Promise.race([popP, new Promise(r => setTimeout(() => r(undefined), 10))]);
    if (pop) {
      await pop.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      const b = await pop.evaluate(async () => { const r = await fetch(location.href); const a = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); }).catch(() => null);
      await pop.close().catch(() => {});
      if (b) { buf = Buffer.from(b, 'base64'); how = 'tab mới'; break; }
    }
    if (d === null) break;
  }
  await pg.evaluate(() => clearInterval(window.__wtHookT)).catch(() => {});
  await closePopups(pg);
  if (!buf || buf.length < 1500 || buf.slice(0, 4).toString() !== '%PDF') { say(`    · "${txt}": chưa lấy được file PDF${buf ? ' (' + buf.length + ' byte)' : ''}`); return false; }
  const name = docName(ctx2.no, type, 'pdf', ctx2.used), f = path.join(OUT, ctx2.job.key.replace(/\W+/g, '_') + '_' + name);
  fs.writeFileSync(f, buf); ctx2.files.push({ name, file: f, sec, type });
  say(`    ⬇ ${name} ("${txt}", ${how}, ${buf.length} byte)`);
  return true;
}
async function clickTab(pg, text) {
  const t = pg.locator(`:is(a,button,li,span,div,[role=tab]):text-is("${text}"):visible`).last();
  if (!(await t.count())) return false;
  await t.click({ timeout: 8000 }).catch(async () => { await closePopups(pg); await t.click({ timeout: 8000, force: true }).catch(() => {}); });
  await pg.waitForTimeout(1500); await closePopups(pg);
  return true;
}

async function doJob(pg, job, cap) {
  const t0 = Date.now();
  say(`▶ ${job.key} · ${job.investor} · ${String(job.name).slice(0, 70)}`);
  const pk = await openPackage(pg, job.no);
  if (!pk) { await api('botDone', { hit: job.key, status: 'error', note: 'Không tìm thấy số ' + job.no + ' trên muasamcong' }); return; }
  const c = { job, no: job.no.toUpperCase().replace(/-\d+$/, ''), files: [], docs: [], agentFiles: [], cap, used: new Set() };
  const info = { url: pk.url, investor: pk.investor, bidName: pk.bidName, planNo: pk.planNo, planName: pk.planName, prov: pk.prov, posted: pk.posted, fields: {}, kqFields: {} };
  if (pk.plan) {   // Kế hoạch lựa chọn nhà thầu
    if (!(await ensureValues(pg, pk.url, 'PL\\d{8}', []))) say('    · KHLCNT chưa hiện số liệu');
    await closePopups(pg);
    info.fields = await readFields(pg);
    const F = info.fields, PK = F._pkgs || [], P0 = pkgRow(PK[0] || []); delete F._pkgs;
    info.pkgs = PK.length;
    const put = (k, v) => { if (v && !F[k]) F[k] = v; };
    put('Giá gói thầu', F['Dự toán mua sắm'] || pk.price); put('Ngày đăng tải', pk.posted || F['Thời gian đăng tải']);
    put('Chi tiết nguồn vốn', P0['Chi tiết nguồn vốn']); put('Hình thức lựa chọn nhà thầu', P0['Hình thức LCNT']); put('Phương thức lựa chọn nhà thầu', P0['Phương thức LCNT']);
    put('Loại hợp đồng', P0['Loại hợp đồng']); put('Thời gian thực hiện gói thầu', P0['Thời gian thực hiện gói thầu']);
    info.planNo = info.fields['Mã KHLCNT'] || info.planNo || c.no;
    info.planName = info.fields['Tên KHLCNT'] || info.fields['Tên dự toán mua sắm'] || info.fields['Tên dự án'] || info.planName;
    if (!(await pagePdf(pg, c, 'kh', 'Kế hoạch lựa chọn nhà thầu', /^Tải\s*(KHLCNT|KH\s*LCNT|kế hoạch)/i))) await printPage(pg, c, 'kh', 'Kế hoạch lựa chọn nhà thầu');
    await attachments(pg, c, 'kh', '');
    await excels(pg, c, 'kh');
  } else {
    // dữ liệu tab chỉ tải khi mở tab (gói đã có kết quả mặc định mở tab Kết quả)
    if (!(await ensureValues(pg, pk.url, 'IB\\d{8}', ['Thông báo mời thầu', 'Thông tin chung']))) say('    · Thông tin chung chưa hiện số TBMT');
    await pg.waitForTimeout(800); await closePopups(pg);
    info.fields = await readFields(pg); delete info.fields._pkgs;
    const put = (k, v) => { if (v && !info.fields[k]) info.fields[k] = v; };
    put('Ngày đăng tải', pk.posted); put('Thời điểm đóng thầu', pk.close);
    if (!info.planNo) info.planNo = info.fields['Mã KHLCNT'] || '';
    if (!(await pagePdf(pg, c, 'tbmt', 'Thông báo mời thầu', /^Tải\s*(TBMT|thông báo)/i))) await printPage(pg, c, 'tbmt', 'Thông báo mời thầu');
    await attachments(pg, c, 'tbmt', '');
    if (wants(c, 'hsmt') && await clickTab(pg, 'Hồ sơ mời thầu')) {   // bảng chương HSMT tải chậm ⇒ chờ tới khi có tên file trong bảng
      await pg.waitForFunction(() => [...document.querySelectorAll('td')].some(td => td.offsetParent && /\.(pdf|docx?|xlsx?|zip|rar)\s*$/i.test(td.innerText)), null, { timeout: 20000 }).catch(() => say('    · tab HSMT chưa hiện file'));
      await attachments(pg, c, 'tbmt', 'HSMT');
    }
    if (await clickTab(pg, 'Kết quả lựa chọn nhà thầu')) {
      await waitText(pg, 'Xuất Excel|Quyết định phê duyệt|Nhà thầu trúng', 25000); await pg.waitForTimeout(1200); await closePopups(pg);
      info.kqFields = await readFields(pg); delete info.kqFields._pkgs;
      if (!(await pagePdf(pg, c, 'kq', 'Kết quả lựa chọn nhà thầu', /^Tải\s*(KQLCNT|KQ\s*LCNT|kết quả)/i))) await printPage(pg, c, 'kq', 'Kết quả lựa chọn nhà thầu');
      await attachments(pg, c, 'kq', '');
      await excels(pg, c, 'kq');
    }
  }
  let up = 0;
  for (const f of c.files) {
    const ext = extOf(f.name);
    const r = await api('botFile', { hit: job.key, name: f.name, kind: f.type, sec: f.sec, planNo: info.planNo, investor: pk.investor, bidName: pk.bidName, mime: MIME[ext] || 'application/octet-stream', b64: fs.readFileSync(f.file).toString('base64') });
    if (r.ok) { up++; c.docs.push({ sec: f.sec, docType: f.type, name: r.name || f.name, url: r.url }); }
    else say('    ! gửi file lỗi: ' + (r.error || ''));
  }
  info.agentFiles = c.agentFiles;
  const ag = c.agentFiles.length;
  const d = await api('botDone', { hit: job.key, status: up ? 'done' : 'nofile', note: up + ' file' + (ag ? ' · ' + ag + ' file cần Agent' : '') + (c.miss ? ' · ' + c.miss + ' file Excel chưa xuất được (bấm Tải lại)' : ''), info: JSON.stringify(info), docs: JSON.stringify(c.docs) });
  say(`  ✓ ${job.no}: ${up} file${ag ? ' + ' + ag + ' cần Agent' : ''} · tổng hợp ${d.sum || 0} dòng · ${Math.round((Date.now() - t0) / 1000)} giây`);
}

const b = await chromium.launch(process.env.WT_CHANNEL ? { channel: process.env.WT_CHANNEL } : {});
const ctx = await b.newContext({ locale: 'vi-VN', acceptDownloads: true, viewport: { width: 1440, height: 900 }, userAgent: UA });
let total = 0;
async function worker() {
  const pg = await ctx.newPage(), cap = [];
  await pg.route(/^https?:\/\/(localhost|127\.0\.0\.1):1234\//, async route => {
    const m = route.request().url().match(/fileId=([\w-]+)/); if (m) cap.push(m[1]);
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });   // bot tự gọi Agent (nếu có) ⇒ trang không tải lần 2
  });
  for (;;) {
    const q = await api('botNext', { n: 1 });
    if (!q.ok || !q.jobs || !q.jobs.length) break;
    const job = q.jobs[0]; total++;
    try { await doJob(pg, job, cap); }
    catch (e) {
      say('  ✗ ' + job.no + ': ' + e.message.split('\n')[0]);
      await pg.screenshot({ path: path.join(OUT, job.no + '_loi.png') }).catch(() => {});
      await api('botDone', { hit: job.key, status: 'error', note: e.message.split('\n')[0].slice(0, 300) });
    }
    if (total >= N) break;
  }
  await pg.close();
}
await Promise.all(Array.from({ length: PAR }, (_, i) => new Promise(r => setTimeout(r, i * 4000)).then(worker)));   // lệch nhau 4 giây — không tranh mã reCAPTCHA
await b.close();
say(`Xong: ${total} gói.`);
