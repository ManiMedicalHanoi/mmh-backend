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

/* ---------- ngôn ngữ (đích có "lang":"en" ⇒ nhãn tiếng Anh) ---------- */
const TXT = {
  vi: { fig:'Hình', toc:'Mục lục', inch:'TRONG CHƯƠNG NÀY', missing:'Chưa có ảnh', openSheet:'Mở Google Sheet', openScript:'Mở Apps Script', webapp:'Web app (/exec)', source:'Mã nguồn backend',
        usedBy:'Dùng bởi app', dataAt:'Dữ liệu nằm ở', dataSheet:'Google Sheet gắn với backend (nút bên dưới)', none:'(chưa khai báo)', ver:'phiên bản', openApp:'Mở app', repo:'Repo app',
        addr:'Địa chỉ', users:'Người dùng', device:'Thiết bị', deviceTxt:'Máy tính (Chrome, Edge, Safari) · điện thoại (Chrome, Safari) · cài được như ứng dụng', build:'Bản dựng', internal:'Tài liệu nội bộ, không chia sẻ ra ngoài công ty',
        verOf:'Phiên bản', clV:'Bản', clD:'Ngày', clC:'Nội dung', locale:'vi-VN' },
  en: { fig:'Figure', toc:'Contents', inch:'IN THIS CHAPTER', missing:'Missing image', openSheet:'Open Google Sheet', openScript:'Open Apps Script', webapp:'Web app (/exec)', source:'Backend source code',
        usedBy:'Used by app', dataAt:'Data is stored in', dataSheet:'the Google Sheet linked to this backend (button below)', none:'(not set)', ver:'version', openApp:'Open app', repo:'App repository',
        addr:'Address', users:'Users', device:'Devices', deviceTxt:'Computer (Chrome, Edge, Safari) · phone (Chrome, Safari) · installable as an app', build:'Built', internal:'Internal document — do not share outside the company',
        verOf:'Version', clV:'Ver.', clD:'Date', clC:'What changed', locale:'en-GB' } };
let LANG = 'vi'; const t = k => (TXT[LANG] || TXT.vi)[k];
let CHDIR = 'chapters';

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
  const lab = `<b>${t('fig')} \u0001FIG\u0001.</b> `;   /* số hình đánh lại theo thứ tự xuất hiện ở chapterHtml */
  const one = (id, w) => { const u = img(id, w); return `<div class="frame">${u ? `<img src="${u}">` : `<div class="missing">${t('missing')}: ${esc(id)}</div>`}</div>`; };
  const isM = id => /(^|\/)m_/.test(id);
  if (ids.length > 1 && kind !== 'phone' && ids.some(isM) && ids.some(i => !isM(i))) {   /* cặp máy tính + điện thoại */
    return `<figure class="dm ${kind}"><div class="figrow dm">${ids.map(i => isM(i) ? `<div class="pm phone">${one(i, 600)}</div>` : `<div class="pd">${one(i, 1400)}</div>`).join('')}</div><figcaption>${lab}${inline(cap)}</figcaption></figure>`;
  }
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
  if (b.sheetId) L.push(linkPill(`https://docs.google.com/spreadsheets/d/${b.sheetId}/edit`, 'googlesheets', t('openSheet')));
  if (b.scriptId) L.push(linkPill(`https://script.google.com/home/projects/${b.scriptId}/edit`, 'googleappsscript', t('openScript')));
  if (b.url) L.push(linkPill(b.url + (b.url.includes('?') ? '&' : '?') + 'action=ping', 'googlechrome', t('webapp')));
  L.push(linkPill(`https://github.com/${CFG.backendGithub}/tree/main/backends/${key}`, 'github', t('source')));
  const apps = (b.apps || []).map(r => r.split('/')[1]).join(' · ');
  return `<div class="card"><div class="ch"><img class="ico" style="width:5mm;height:5mm" src="${ICON('googleappsscript')}"><b>${esc(b.name)}</b><span class="tag">backend: ${esc(key)}</span></div>
  <dl><dt>${t('usedBy')}</dt><dd>${esc(apps)}</dd><dt>${t('dataAt')}</dt><dd>${b.sheetId ? t('dataSheet') : t('none')}</dd></dl><div class="links">${L.join('')}</div></div>`;
}
function appCard(key) {
  const a = APPS[key]; if (!a) return '';
  const L = [linkPill(a.url, 'googlechrome', t('openApp')), linkPill('https://github.com/' + a.github, 'github', t('repo'))];
  (a.backends || []).forEach(k => { if (BACK[k]?.sheetId) L.push(linkPill(`https://docs.google.com/spreadsheets/d/${BACK[k].sheetId}/edit`, 'googlesheets', 'Sheet ' + k)); });
  return `<div class="card"><div class="ch"><img class="ico" style="width:6mm;height:6mm" src="${ICON('mmh_logo')}"><b>${esc(a.name)}</b><span class="tag">${t('ver')} ${esc(a.version)}</span></div>
  <dl><dt>${t('addr')}</dt><dd><a href="${esc(a.url)}">${esc(a.url.replace(/^https?:\/\//, ''))}</a></dd><dt>${t('users')}</dt><dd>${inline((LANG === 'en' && a.usersEn) || a.users)}</dd><dt>${t('device')}</dt><dd>${t('deviceTxt')}</dd>
  <dt>Backend</dt><dd>${(a.backends || []).map(k => `<code>${k}</code>`).join(' ')}</dd></dl><div class="links">${L.join('')}</div></div>`;
}
function changelog(key, n) {
  const a = APPS[key]; const list = updates(a, +n || 6); if (!list.length) return '';
  return `<table><thead><tr><th style="width:18mm">${t('clV')}</th><th style="width:22mm">${t('clD')}</th><th>${t('clC')}</th></tr></thead><tbody>${list.map(u =>
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
  <div class="inch"><b>${t('inch')}</b>${(items || '').split(';').filter(Boolean).map(t => `<span>${inline(t)}</span>`).join('')}</div></section>`;
}
const TEAMS = { d:['vn','Dental VN','Dental VN'], s:['vn','Surgical VN','Surgical VN'], e:['vn','Eyeless VN','Eyeless VN'], ts:['th','Thailand Surgical','Thailand Surgical'], td:['th','Thailand Dental','Thailand Dental'],
  vn:['vn','3 nhóm Việt Nam','3 Vietnam teams'], th:['th','2 nhóm Thái Lan','2 Thailand teams'], all:['all','Mọi nhóm','All teams'] };
const teamChips = arg => arg.split(/[\s,]+/).filter(Boolean).map(k => { const x = TEAMS[k]; return x ? `<span class="team ${x[0]}">${esc(LANG === 'en' ? x[2] : x[1])}</span>` : esc(k); }).join('');
function expand(md) {
  md = md.replace(/^:::split(?:\.(\w+))?[ \t]+([^\n|]+?)(?:\|[ \t]*(.*))?\n([\s\S]*?)\n:::split-end[ \t]*$/gm, (m, kind, ids, cap, body) => {
    const ph = ids.split(',').map(x => x.trim()).every(i => /(^|\/)m_/.test(i));
    return `<section class="split ${kind || ''}"><div class="txt">${marked.parse(expand(body))}</div><div class="pic">${figure(ids.trim(), cap || '', ph ? 'phone' : '')}</div></section>\n`;
  });
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
      case 'teams': return teamChips(arg);
      case 'icon': return `<img class="ico" src="${ICON(parts[0])}">`;
      case 'ver': return esc(APPS[parts[0]]?.version || '?');
      case 'key': return parts[0].split('+').map(k => `<kbd>${esc(k.trim())}</kbd>`).join('+');
      case 'link': return `<a href="${esc(parts[0])}">${esc(parts[1] || parts[0])}</a>`;
      case 'sheet': { const b = BACK[parts[0]]; if (!b || !b.sheetId) { W('không có Sheet ' + parts[0]); return esc(parts[1] || parts[0]); }
        return `<a class="sh" href="https://docs.google.com/spreadsheets/d/${b.sheetId}/edit"><img class="ico" src="${ICON('googlesheets')}">${esc(parts[1] || b.name)}</a>`; }
      case 'drive': return `<a class="sh" href="${esc(parts[0])}"><img class="ico" src="${ICON('googledrive')}">${esc(parts[1] || 'Google Drive')}</a>`;
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
  let md = fs.readFileSync(path.join(ROOT, CHDIR, file), 'utf8');
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/); let meta = {};
  if (fm) { fm[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); md = md.slice(fm[0].length); }
  if (meta.number) chapNo = +meta.number;
  md = md.replace(/^## (.+)$/gm, (m, t) => { secNo++; return front ? `<h2>${esc(t)}</h2>` : `<h2 id="s${chapNo}-${secNo}"><span class="num">${chapNo}.${secNo}&nbsp;</span>${esc(t)}</h2>`; });
  let fn = 0; const body = keep(marked.parse(expand(md))).replace(/\u0001FIG\u0001/g, () => chapNo + '.' + (++fn));
  return { html: `<section class="chapter" data-ch="${chapNo}">${body}</section>`, meta };
}
function tocHtml(chs) {
  const items = [];
  for (const c of chs) {
    const re = /<h1 id="([^"]+)">([^<]+)<\/h1>|<h2 id="([^"]+)"><span class="num">([^<]+)<\/span>([\s\S]*?)<\/h2>/g; let m;
    while ((m = re.exec(c.html))) items.push(m[1] ? `<li class="t1"><a href="#${m[1]}">${m[2]}</a></li>` : `<li class="t2"><a href="#${m[3]}"><span class="n">${m[4]}</span>${m[5].replace(/<[^>]+>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').trim()}</a></li>`);
  }
  return `<section class="toc"><h2>${t('toc')}</h2><ol>${items.join('')}</ol></section>`;
}
function coverHtml(sel) {
  const today = new Date().toLocaleDateString(t('locale'), { day: '2-digit', month: '2-digit', year: 'numeric' });
  const ttl = sel.title || BOOK.title;
  return `<section class="cover"><div class="band"></div><div class="yel"></div><img class="logo" src="${ICON('mmh_logo')}">
  <div class="k">${esc(sel.kicker || BOOK.kicker)}</div><h1>${esc(ttl)}</h1><div class="sub">${esc(sel.subtitle || BOOK.subtitle)}</div>
  <div class="apps">${CFG.apps.filter(a => !sel.apps || sel.apps.includes(a.key)).map(a => `<div><b>${esc(a.name)}</b><span>${t('verOf')} ${esc(APPS[a.key].version)} · ${esc((LANG === 'en' && a.shortEn) || a.short)}</span></div>`).join('')}</div>
  ${sel.teamsCover ? `<div class="tl">${sel.teamsCover.map(x => `<span>${esc(x[0])}<small>${esc(x[1])}</small></span>`).join('')}</div>` : ''}<div class="meta">${t('build')} ${today} · ${esc(sel.edition || BOOK.edition)}<br>${esc(sel.owner || BOOK.owner)} · ${t('internal')}</div>
  <div class="gl">${['googlesheets', 'googleappsscript', 'googledrive', 'gmail', 'github'].map(k => `<img src="${ICON(k)}">`).join('')}</div></section>`;
}

/* ---------- dựng ---------- */
/* đích có "css" (vd. guide.css, khổ ngang): ghép book.css (đổi size A4 ⇒ A4 landscape) + file đó thành 1 file — Paged.js chỉ nhận 1 khai báo khổ trang */
function themeCss(sel) {
  if (!sel.css) return path.join(ROOT, 'theme/book.css');
  const base = fs.readFileSync(path.join(ROOT, 'theme/book.css'), 'utf8').replace("@import url('fonts/fonts.css');", `@import url('file://${ROOT}/theme/fonts/fonts.css');`).replace(/size:A4;/, 'size:A4 landscape;');
  const out = path.join(CACHE, 'theme_' + sel.css); fs.writeFileSync(out, base + '\n' + fs.readFileSync(path.join(ROOT, 'theme', sel.css), 'utf8')); return out;
}
async function build(target) {
  const sel = BOOK.targets[target]; if (!sel) throw new Error('Không có mục tiêu ' + target);
  chapNo = 0; warn.length = 0; LANG = sel.lang || 'vi'; CHDIR = sel.dir || 'chapters';
  const chs = sel.chapters.map(f => chapterHtml(f));
  await Promise.all(jobs.splice(0));
  const front = sel.front ? sel.front.map(f => { const c = chapterHtml(f, true); return c.html.replace('class="chapter"', 'class="front"'); }).join('') : '';
  const html = `<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><title>${esc(sel.title || BOOK.title)}</title>
  <link rel="stylesheet" href="file://${themeCss(sel)}">${sel.header ? `<style>@page{@top-right{content:${JSON.stringify(sel.header)}}} @page :left{@top-left{content:${JSON.stringify(sel.header)}}}</style>` : ''}</head><body>${coverHtml(sel)}${front}${tocHtml(chs)}${chs.map(c => c.html).join('')}
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
