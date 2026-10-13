/* MMH IFU · dựng sách hướng dẫn sử dụng (PDF khổ A4, bố cục sách)
   Chạy:  NODE_PATH=$(npm root -g):<node_modules có marked, sharp, pagedjs> node build.mjs [all|crm|rh|kpi|th]
   - Nội dung: chapters/*.md (Markdown + mã rút gọn [[...]], xem README.md)
   - Ảnh: shots/<app>/<id>.jpg (chụp bằng capture/*), tự thu nhỏ vào .cache
   - Phiên bản app, link backend, lịch sử cập nhật: đọc trực tiếp từ các repo (config.json) ⇒ dựng lại là cập nhật */
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { marked } = require('marked'); const sharp = require('sharp'); const { chromium } = require('playwright');
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
/* config.local.json (không đưa lên git): ghi đè đường dẫn repo trên máy đang dựng */
if (fs.existsSync(path.join(ROOT, 'config.local.json'))) { const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.local.json'), 'utf8')); Object.assign(CFG, L, { apps: CFG.apps.map(a => ({ ...a, ...((L.repos || {})[a.key] ? { repo: L.repos[a.key] } : {}) })) }); }
const PAGED = CFG.pagedjs || require.resolve('pagedjs/dist/paged.polyfill.js');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'book.json'), 'utf8'));
const rp = p => path.resolve(ROOT, p);
const BACK = JSON.parse(fs.readFileSync(rp(CFG.backendRepo + '/backends.json'), 'utf8'));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const warn = []; const W = m => { warn.push(m); };

/* ---------- dữ liệu từ repo ---------- */
function appVersion(a) {
  const src = fs.readFileSync(rp(a.repo + '/' + (a.file || 'index.html')), 'utf8');
  const m = src.match(new RegExp(a.verRe)); return m ? m[1] : '?';
}
function updates(a, n) {
  if (!a.notes) return [];
  const f = rp(a.repo + '/' + a.notes); if (!fs.existsSync(f)) return [];
  const window = {}; try { new Function('window', fs.readFileSync(f, 'utf8'))(window); } catch (e) { W('notes ' + a.key + ': ' + e.message); return []; }
  const arr = window[a.notesVar] || []; return arr.slice(0, n);
}
const APPS = Object.fromEntries(CFG.apps.map(a => [a.key, { ...a, version: appVersion(a) }]));

/* ---------- ảnh ---------- */
const CACHE = path.join(ROOT, '.cache'); fs.mkdirSync(CACHE, { recursive: true });
const jobs = [];
function img(id, maxw = 1500) {
  const [app, name] = id.split('/');
  let src = ['jpg', 'png', 'jpeg'].map(e => path.join(ROOT, 'shots', app, name + '.' + e)).find(f => fs.existsSync(f));
  if (!src) { W('thiếu ảnh ' + id); return null; }
  const out = path.join(CACHE, app + '__' + name + '_' + maxw + '.jpg');
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs)
    jobs.push(sharp(src).resize({ width: maxw, withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toFile(out));
  return 'file://' + out;
}
const ICON = k => 'file://' + path.join(ROOT, 'theme/icons', k + (fs.existsSync(path.join(ROOT, 'theme/icons', k + '.svg')) ? '.svg' : '.png'));

/* ---------- mã rút gọn ---------- */
let chapNo = 0, figNo = 0, secNo = 0;
function figure(ids, cap, kind) {
  ids = ids.split(',').map(s => s.trim()).filter(Boolean); figNo++;
  const lab = `<b>Hình ${chapNo}.${figNo}.</b> `;
  const one = (id, w) => { const u = img(id, w); return `<div class="frame">${u ? `<img src="${u}">` : `<div class="missing">Chưa có ảnh: ${esc(id)}</div>`}</div>`; };
  if (ids.length > 1 || kind === 'phone') {
    const w = kind === 'phone' ? 700 : 1100;
    return `<figure class="${kind === 'phone' ? '' : kind}"><div class="figrow ${kind === 'phone' ? 'phone' : ''}">${ids.map(i => `<div>${one(i, w)}</div>`).join('')}</div><figcaption>${lab}${inline(cap)}</figcaption></figure>`;
  }
  return `<figure class="${kind || ''}">${one(ids[0], kind === 'narrow' ? 1000 : 1500)}<figcaption>${lab}${inline(cap)}</figcaption></figure>`;
}
const inline = s => marked.parseInline(String(s || '').trim());
function linkPill(href, icon, label) { return `<a href="${esc(href)}"><img src="${ICON(icon)}">${esc(label)}</a>`; }
function backendCard(key) {
  const b = BACK[key]; if (!b) { W('không có backend ' + key); return ''; }
  const L = [];
  if (b.sheetId) L.push(linkPill(`https://docs.google.com/spreadsheets/d/${b.sheetId}/edit`, 'googlesheets', 'Mở Google Sheet'));
  if (b.scriptId) L.push(linkPill(`https://script.google.com/home/projects/${b.scriptId}/edit`, 'googleappsscript', 'Mở Apps Script'));
  if (b.url) L.push(linkPill(b.url + (b.url.includes('?') ? '&' : '?') + 'action=ping', 'googlechrome', 'Web app (/exec)'));
  L.push(linkPill(`https://github.com/${CFG.backendGithub}/tree/main/backends/${key}`, 'github', 'Mã nguồn backend'));
  const apps = (b.apps || []).map(r => r.split('/')[1]).join(' · ');
  return `<div class="card"><div class="ch"><img class="ico" style="width:5mm;height:5mm" src="${ICON('googleappsscript')}"><b>${esc(b.name)}</b><span class="tag">backend: ${esc(key)}</span></div>
  <dl><dt>Dùng bởi app</dt><dd>${esc(apps)}</dd><dt>Dữ liệu nằm ở</dt><dd>Google Sheet ${b.sheetId ? 'gắn với backend (nút bên dưới)' : '(chưa khai báo)'}</dd></dl><div class="links">${L.join('')}</div></div>`;
}
function appCard(key) {
  const a = APPS[key]; if (!a) return '';
  const L = [linkPill(a.url, 'googlechrome', 'Mở app'), linkPill('https://github.com/' + a.github, 'github', 'Repo app')];
  (a.backends || []).forEach(k => { if (BACK[k]?.sheetId) L.push(linkPill(`https://docs.google.com/spreadsheets/d/${BACK[k].sheetId}/edit`, 'googlesheets', 'Sheet ' + k)); });
  return `<div class="card"><div class="ch"><img class="ico" style="width:6mm;height:6mm" src="${ICON('mmh_logo')}"><b>${esc(a.name)}</b><span class="tag">phiên bản ${esc(a.version)}</span></div>
  <dl><dt>Địa chỉ</dt><dd><a href="${esc(a.url)}">${esc(a.url.replace(/^https?:\/\//, ''))}</a></dd><dt>Người dùng</dt><dd>${inline(a.users)}</dd><dt>Thiết bị</dt><dd>Máy tính (Chrome, Edge, Safari) · điện thoại (Chrome, Safari) · không cần cài đặt</dd>
  <dt>Backend</dt><dd>${(a.backends || []).map(k => `<code>${k}</code>`).join(' ')}</dd></dl><div class="links">${L.join('')}</div></div>`;
}
function changelog(key, n) {
  const a = APPS[key]; const list = updates(a, +n || 6); if (!list.length) return '';
  return `<table><thead><tr><th style="width:18mm">Bản</th><th style="width:22mm">Ngày</th><th>Nội dung</th></tr></thead><tbody>${list.map(u =>
    `<tr><td>${esc(u.version)}</td><td>${esc(u.date)}</td><td><b>${esc(u.title)}</b><br><span class="small">${esc(u.summary || '')}</span></td></tr>`).join('')}</tbody></table>`;
}
function backendTable() {
  return `<table><thead><tr><th style="width:24mm">Khoá</th><th>Tên · app dùng</th><th style="width:62mm">Liên kết</th></tr></thead><tbody>${Object.entries(BACK).map(([k, b]) => {
    const L = []; if (b.sheetId) L.push(`<a href="https://docs.google.com/spreadsheets/d/${b.sheetId}/edit"><img class="ico" src="${ICON('googlesheets')}"> Sheet</a>`);
    if (b.scriptId) L.push(`<a href="https://script.google.com/home/projects/${b.scriptId}/edit"><img class="ico" src="${ICON('googleappsscript')}"> Script</a>`);
    if (b.url) L.push(`<a href="${esc(b.url)}"><img class="ico" src="${ICON('googlechrome')}"> /exec</a>`);
    L.push(`<a href="https://github.com/${CFG.backendGithub}/tree/main/backends/${k}"><img class="ico" src="${ICON('github')}"> Code</a>`);
    return `<tr><td><code>${k}</code></td><td>${esc(b.name)}<br><span class="small">${esc((b.apps || []).map(r => r.split('/')[1]).join(' · '))}</span></td><td>${L.join(' &nbsp; ')}</td></tr>`; }).join('')}</tbody></table>`;
}
function opener(md) { /* [[opener no | Tiêu đề | lead | ảnh | mục1; mục2…]] */
  const [no, title, lead, shot, items] = md.split('|').map(s => s.trim());
  const u = shot ? img(shot, 1600) : null;
  return `<section class="opener"><div class="no">${esc(no)}</div><h1 id="ch-${esc(no)}">${esc(title)}</h1><div class="lead">${inline(lead)}</div>${u ? `<div class="hero"><img src="${u}"></div>` : ''}
  <div class="inch"><b>TRONG CHƯƠNG NÀY</b>${(items || '').split(';').filter(Boolean).map(t => `<span>${inline(t)}</span>`).join('')}</div></section>`;
}
function expand(md) {
  md = md.replace(/^:::(tip|note|warn|rule)[ \t]*(.*)\n([\s\S]*?)\n:::[ \t]*$/gm, (m, k, t, body) =>
    `<div class="box ${k}">${t ? `<span class="bt">${inline(t)}</span>` : ''}${marked.parse(expand(body))}</div>\n`);
  return md.replace(/\[\[(\w+)\s*([^\]]*)\]\]/g, (m, cmd, arg) => {
    const parts = arg.split('|').map(s => s.trim());
    switch (cmd) {
      case 'fig': return figure(parts[0], parts[1], parts[2] || '');
      case 'phones': return figure(parts[0], parts[1], 'phone');
      case 'backend': return backendCard(parts[0]);
      case 'app': return appCard(parts[0]);
      case 'changelog': { const q = arg.split(/[\s|]+/); return changelog(q[0], q[1]); }
      case 'backends': return backendTable();
      case 'opener': return opener(arg);
      case 'icon': return `<img class="ico" src="${ICON(parts[0])}">`;
      case 'ver': return esc(APPS[parts[0]]?.version || '?');
      case 'key': return parts[0].split('+').map(k => `<kbd>${esc(k.trim())}</kbd>`).join('+');
      case 'link': return `<a href="${esc(parts[0])}">${esc(parts[1] || parts[0])}</a>`;
      default: return m;
    }
  });
}

/* giữ tiêu đề đi cùng khối ngay sau (ảnh, đoạn, hộp, danh sách) để tiêu đề không rơi xuống cuối trang */
function keep(html) {
  const blk = '(?:<figure[\\s\\S]*?</figure>|<p>[\\s\\S]*?</p>|<ol>[\\s\\S]*?</ol>|<ul>[\\s\\S]*?</ul>|<table>[\\s\\S]*?</table>)';
  const re = new RegExp('(<h[23][^>]*>[\\s\\S]*?</h[23]>\\s*(?:<h3[^>]*>[\\s\\S]*?</h3>\\s*)?)(' + blk + ')', 'g');
  return html.replace(re, (m, h, b) => b.length > 5000 && !b.startsWith('<figure') ? m : `<div class="keep">${h}${b}</div>`);
}
function chapterHtml(file, front) {
  chapNo++; figNo = 0; secNo = 0;
  let md = fs.readFileSync(path.join(ROOT, 'chapters', file), 'utf8');
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/); let meta = {};
  if (fm) { fm[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); md = md.slice(fm[0].length); }
  if (meta.number) chapNo = +meta.number;
  md = md.replace(/^## (.+)$/gm, (m, t) => { secNo++; return front ? `<h2>${esc(t)}</h2>` : `<h2 id="s${chapNo}-${secNo}"><span class="num">${chapNo}.${secNo}</span>${esc(t)}</h2>`; });
  return { html: `<section class="chapter" data-ch="${chapNo}">${keep(marked.parse(expand(md)))}</section>`, meta };
}
function tocHtml(chs) {
  const items = [];
  for (const c of chs) {
    const re = /<h1 id="([^"]+)">([^<]+)<\/h1>|<h2 id="([^"]+)"><span class="num">([^<]+)<\/span>([^<]+)<\/h2>/g; let m;
    while ((m = re.exec(c.html))) items.push(m[1] ? `<li class="t1"><a href="#${m[1]}">${m[2]}</a></li>` : `<li class="t2"><a href="#${m[3]}"><span class="n">${m[4]}</span>${m[5]}</a></li>`);
  }
  return `<section class="toc"><h2>Mục lục</h2><ol>${items.join('')}</ol></section>`;
}
function coverHtml(sel) {
  const today = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const t = sel.title || BOOK.title;
  return `<section class="cover"><div class="band"></div><div class="yel"></div><img class="logo" src="${ICON('mmh_logo')}">
  <div class="k">${esc(BOOK.kicker)}</div><h1>${esc(t)}</h1><div class="sub">${esc(sel.subtitle || BOOK.subtitle)}</div>
  <div class="apps">${CFG.apps.filter(a => !sel.apps || sel.apps.includes(a.key)).map(a => `<div><b>${esc(a.name)}</b><span>Phiên bản ${esc(APPS[a.key].version)} · ${esc(a.short)}</span></div>`).join('')}</div>
  <div class="meta">Bản dựng ${today} · ${esc(BOOK.edition)}<br>${esc(BOOK.owner)} · Tài liệu nội bộ, không chia sẻ ra ngoài công ty</div>
  <div class="gl">${['googlesheets', 'googleappsscript', 'googledrive', 'gmail', 'github'].map(k => `<img src="${ICON(k)}">`).join('')}</div></section>`;
}

/* ---------- dựng ---------- */
async function build(target) {
  const sel = BOOK.targets[target]; if (!sel) throw new Error('Không có mục tiêu ' + target);
  chapNo = 0; warn.length = 0;
  const chs = sel.chapters.map(f => chapterHtml(f));
  await Promise.all(jobs.splice(0));
  const front = sel.front ? sel.front.map(f => { const c = chapterHtml(f, true); return c.html.replace('class="chapter"', 'class="front"'); }).join('') : '';
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(sel.title || BOOK.title)}</title>
  <link rel="stylesheet" href="file://${ROOT}/theme/book.css"></head><body>${coverHtml(sel)}${front}${tocHtml(chs)}${chs.map(c => c.html).join('')}
  <script>window.PagedConfig={auto:true,after:()=>{window.__done=true}};</script><script src="file://${PAGED}"></script></body></html>`;
  const tmp = path.join(CACHE, 'book_' + target + '.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage();
  p.on('pageerror', e => W('JS: ' + e.message));
  await p.goto('file://' + tmp); await p.waitForFunction(() => window.__done === true, null, { timeout: 600000 });
  const pages = await p.evaluate(() => document.querySelectorAll('.pagedjs_page').length);
  const out = path.join(ROOT, 'dist', sel.out);
  await p.pdf({ path: out, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
  await b.close();
  console.log(`✓ ${sel.out} · ${pages} trang · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
  if (warn.length) console.log('  Cảnh báo:\n  - ' + [...new Set(warn)].join('\n  - '));
}
const targets = process.argv.slice(2); for (const t of (targets.length ? targets : ['all'])) await build(t);
