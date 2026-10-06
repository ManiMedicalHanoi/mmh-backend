#!/usr/bin/env node
/* Đồng bộ code Apps Script ↔ repo qua Apps Script API (không cần cài clasp).
 *
 *   node tools/gas.mjs status                    kiểm tra chìa khoá + tình trạng từng backend
 *   node tools/gas.mjs discover                  tự tìm Script ID còn thiếu (qua URL /exec, rồi dò Drive)
 *   node tools/gas.mjs whois <url…>              tra dự án + danh sách deployment của URL /exec
 *   node tools/gas.mjs pull <key|all|new>        kéo code từ Apps Script về backends/<key>/
 *   node tools/gas.mjs deploy-changed <before> <after>   deploy các backend có thay đổi giữa 2 commit
 *   node tools/gas.mjs deploy <key>              deploy 1 backend (so với HEAD)
 *   node tools/gas.mjs rollback <key> [version]  đưa web app về phiên bản trước (hoặc số phiên bản chỉ định)
 *
 * Chìa khoá: biến môi trường CLASPRC_JSON (nội dung ~/.clasprc.json của clasp) hoặc file ~/.clasprc.json.
 * Cấu hình: backends.json — mỗi backend: name, deploymentId, scriptId, url.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const CFG_FILE = path.join(ROOT, 'backends.json');
const API = process.env.GAS_SCRIPT_API || 'https://script.googleapis.com/v1';
const DRIVE = process.env.GAS_DRIVE_API || 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = process.env.GAS_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const SMOKE_WAIT = Number(process.env.GAS_SMOKE_WAIT_MS ?? 4000);
const SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const CODE_EXT = /\.(gs|js|html)$/;
const ORDER_FILE = '.files.json';
const VERSION_WARN = 180;

class Stop extends Error {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function say(s = '') { console.log(s); if (SUMMARY) fs.appendFileSync(SUMMARY, s + '\n'); }
function stop(msg) { throw new Stop(msg); }

/* ───────── cấu hình ───────── */
function loadCfg() { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); }
function saveCfg(cfg) { fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2) + '\n'); }
function backendDir(key) { return path.join(ROOT, 'backends', key); }
function pickKeys(cfg, arg) {
  if (!arg || arg === 'all') return Object.keys(cfg);
  if (arg === 'new') return Object.keys(cfg).filter(k => !fs.existsSync(path.join(backendDir(k), 'appsscript.json')));
  if (!cfg[arg]) stop(`Không có backend "${arg}". Có: ${Object.keys(cfg).join(', ')}`);
  return [arg];
}

/* ───────── chìa khoá & gọi API ───────── */
function creds() {
  let raw = process.env.CLASPRC_JSON;
  const f = path.join(os.homedir(), '.clasprc.json');
  if (!raw && fs.existsSync(f)) raw = fs.readFileSync(f, 'utf8');
  if (!raw || !raw.trim()) stop('Chưa có chìa khoá: vào Settings ▸ Secrets and variables ▸ Actions của repo, tạo secret CLASPRC_JSON (nội dung file ~/.clasprc.json sau khi chạy "clasp login").');
  const j = parseCreds(raw);
  let c = null;
  if (j.tokens) c = j.tokens.default || Object.values(j.tokens).find(Boolean);
  else if (j.token) c = { ...j.token, client_id: j.oauth2ClientSettings?.clientId, client_secret: j.oauth2ClientSettings?.clientSecret };
  else if (j.refresh_token) c = j;
  if (!c || !c.refresh_token || !c.client_id) stop('Secret CLASPRC_JSON thiếu refresh_token / client_id — hãy đăng nhập lại bằng clasp bản 3 (npx -y @google/clasp@3 login --no-localhost).');
  return c;
}

/* Copy từ màn hình terminal hay dính: chữ thừa trước { / sau }, dấu xuống dòng chèn giữa chuỗi dài (do màn hình
 * tự ngắt dòng). JSON của clasp không có xuống dòng hợp lệ nào trong chuỗi ⇒ bỏ hết xuống dòng là an toàn.
 * Lỗi thì chỉ báo đặc điểm (độ dài, ký tự đầu/cuối, số ngoặc) — KHÔNG in nội dung chìa khoá. */
function parseCreds(raw) {
  const tries = [raw];
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  if (a >= 0 && b > a) tries.push(raw.slice(a, b + 1));
  tries.push(tries[tries.length - 1].replace(/[\r\n]+/g, ''));
  tries.push(tries[tries.length - 1].replace(/[“”]/g, '"').replace(/ /g, ' '));
  for (const t of tries) { try { return JSON.parse(t); } catch (_) {} }
  // Copy thiếu phần cuối (thường là access_token — mã ngắn hạn, không cần): cắt về cặp "khoá": "giá trị" đầy đủ
  // cuối cùng rồi đóng ngoặc. refresh_token có bị cụt hay không sẽ được Google xác nhận ở bước đổi mã.
  const t = tries[tries.length - 1];
  for (let i = t.lastIndexOf('",'); i > 0; i = t.lastIndexOf('",', i - 1)) {
    const head = t.slice(0, i + 1);
    const open = head.split('{').length - head.split('}').length;
    if (open <= 0) continue;
    try {
      const j = JSON.parse(head + '}'.repeat(open));
      say('⚠️ Chìa khoá CLASPRC_JSON bị copy thiếu phần cuối — đã tự bỏ đoạn cụt và dùng phần còn lại.');
      return j;
    } catch (_) {}
  }
  const s = raw.trim();
  const cnt = ch => s.split(ch).length - 1;
  const why = [];
  if (!s.startsWith('{')) why.push('không bắt đầu bằng dấu {');
  if (!s.endsWith('}')) why.push('không kết thúc bằng dấu } (có thể copy thiếu phần cuối)');
  if (cnt('{') !== cnt('}')) why.push(`số dấu { (${cnt('{')}) và } (${cnt('}')}) không bằng nhau ⇒ copy thiếu`);
  if (!/refresh_token/.test(s)) why.push('không thấy chữ refresh_token');
  if (/[“”]/.test(s)) why.push('có dấu ngoặc kép kiểu “ ” (bị trình soạn thảo đổi)');
  stop(`Secret CLASPRC_JSON không phải JSON hợp lệ (dài ${s.length} ký tự, ${cnt('\n') + 1} dòng${why.length ? '; ' + why.join('; ') : ''}). ` +
    'Cách copy chắc chắn: trong Cloud Shell gõ  cloudshell download ~/.clasprc.json  ⇒ tải file về máy, mở bằng Notepad, Ctrl+A, Ctrl+C, rồi dán lại vào secret (Update secret).');
}

let ACCESS = null;
async function token() {
  if (ACCESS) return ACCESS;
  const c = creds();
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret || '', refresh_token: c.refresh_token, grant_type: 'refresh_token' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) stop(`Chìa khoá không dùng được (${j.error || r.status}${j.error_description ? ': ' + j.error_description : ''}). Có thể đã bị thu hồi — đăng nhập clasp lại và cập nhật secret CLASPRC_JSON.`);
  ACCESS = j.access_token;
  return ACCESS;
}

async function api(method, url, body) {
  const t = await token();
  for (let i = 0; ; i++) {
    const r = await fetch(url, {
      method,
      headers: { authorization: 'Bearer ' + t, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await r.text();
    let j; try { j = txt ? JSON.parse(txt) : {}; } catch (_) { j = { raw: txt }; }
    if (r.ok) return j;
    if ((r.status === 429 || r.status >= 500) && i < 3) { await sleep(2000 * (i + 1)); continue; }
    let msg = j.error?.message || txt.slice(0, 300);
    if (/Apps Script API|has not enabled|has not been used/i.test(msg)) msg += '\n→ Bật Google Apps Script API tại https://script.google.com/home/usersettings (đúng tài khoản sở hữu script), đợi ~5 phút rồi chạy lại.';
    const e = new Error(`${method} ${url.replace(/\?.*/, '')} → ${r.status}: ${msg}`);
    e.status = r.status;
    throw e;
  }
}

async function pages(urlBase, field) {
  const out = []; let tok = '';
  do {
    const sep = urlBase.includes('?') ? '&' : '?';
    const j = await api('GET', urlBase + sep + 'pageSize=50' + (tok ? '&pageToken=' + encodeURIComponent(tok) : ''));
    out.push(...(j[field] || []));
    tok = j.nextPageToken || '';
  } while (tok);
  return out;
}

const getContent = (id, ver) => api('GET', `${API}/projects/${id}/content${ver ? '?versionNumber=' + ver : ''}`).then(j => fromRemote(j.files || []));
const getDeployment = (id, did) => api('GET', `${API}/projects/${id}/deployments/${did}`);
const listDeployments = id => pages(`${API}/projects/${id}/deployments`, 'deployments');
const listVersions = id => pages(`${API}/projects/${id}/versions`, 'versions');
const setDeployment = (id, did, versionNumber, description) => api('PUT', `${API}/projects/${id}/deployments/${did}`, {
  deploymentConfig: { scriptId: id, versionNumber, manifestFileName: 'appsscript', description: (description || '').slice(0, 100) },
});

/* ───────── bộ file: {order:[đường dẫn], map:{đường dẫn: nội dung}} ───────── */
function fromRemote(files) {
  const order = [], map = {};
  for (const f of files) {
    const p = f.type === 'JSON' ? 'appsscript.json' : f.name + (f.type === 'HTML' ? '.html' : '.gs');
    order.push(p); map[p] = f.source || '';
  }
  return { order, map };
}
function toRemote(set) {
  return set.order.map(p => p === 'appsscript.json'
    ? { name: 'appsscript', type: 'JSON', source: set.map[p] }
    : { name: p.replace(CODE_EXT, ''), type: p.endsWith('.html') ? 'HTML' : 'SERVER_JS', source: set.map[p] });
}
function isCode(p) { return p === 'appsscript.json' || CODE_EXT.test(p); }
function assemble(entries, orderJson) {
  const map = {};
  for (const [p, src] of entries) if (isCode(p)) map[p] = src;
  if (!Object.keys(map).length) return null;
  let saved = [];
  try { saved = JSON.parse(orderJson || '[]'); } catch (_) {}
  const order = saved.filter(p => p in map);
  for (const p of Object.keys(map).sort()) if (!order.includes(p)) order.push(p);
  // appsscript.json luôn đứng đầu như trình soạn Apps Script
  return { order: ['appsscript.json', ...order.filter(p => p !== 'appsscript.json')].filter(p => p in map), map };
}
function readLocal(key) {
  const dir = backendDir(key);
  if (!fs.existsSync(dir)) return null;
  const entries = [];
  (function walk(d, rel) {
    for (const n of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? rel + '/' + n.name : n.name;
      if (n.isDirectory()) walk(path.join(d, n.name), r);
      else entries.push([r, fs.readFileSync(path.join(d, n.name), 'utf8')]);
    }
  })(dir, '');
  const ord = entries.find(([p]) => p === ORDER_FILE);
  return assemble(entries, ord && ord[1]);
}
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }); }
function validSha(sha) { if (!sha || /^0+$/.test(sha)) return false; try { git('cat-file', '-e', sha + '^{commit}'); return true; } catch (_) { return false; } }
function readAt(sha, key) {
  const pre = `backends/${key}/`;
  const names = git('ls-tree', '-r', '--name-only', sha, '--', pre).split('\n').filter(Boolean);
  if (!names.length) return null;
  const entries = names.map(n => [n.slice(pre.length), git('show', `${sha}:${n}`)]);
  const ord = entries.find(([p]) => p === ORDER_FILE);
  return assemble(entries, ord && ord[1]);
}
function writeLocal(key, set) {
  const dir = backendDir(key);
  fs.mkdirSync(dir, { recursive: true });
  (function clean(d) {
    for (const n of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, n.name);
      if (n.isDirectory()) { clean(f); if (!fs.readdirSync(f).length) fs.rmdirSync(f); }
      else if (isCode(path.relative(dir, f).split(path.sep).join('/'))) fs.unlinkSync(f);
    }
  })(dir);
  for (const p of set.order) {
    const f = path.join(dir, ...p.split('/'));
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, set.map[p]);
  }
  fs.writeFileSync(path.join(dir, ORDER_FILE), JSON.stringify(set.order, null, 2) + '\n');
}

function canonJson(s) {
  const sort = v => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k) => (o[k] = sort(v[k]), o), {}) : v;
  try { return JSON.stringify(sort(JSON.parse(s))); } catch (_) { return norm(s); }
}
function norm(s) { return String(s).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\s+$/, ''); }
function same(p, a, b) { return p === 'appsscript.json' ? canonJson(a) === canonJson(b) : norm(a) === norm(b); }
function diff(a, b) {
  const names = new Set([...(a ? a.order : []), ...(b ? b.order : [])]);
  return [...names].filter(p => !a || !b || !(p in a.map) || !(p in b.map) || !same(p, a.map[p], b.map[p])).sort();
}
function webapp(set) {
  try { return JSON.stringify(JSON.parse(set.map['appsscript.json'] || '{}').webapp || null); } catch (_) { return 'invalid'; }
}

/* ───────── gọi thử web app sau deploy ───────── */
async function smoke(b) {
  if (b.smoke === false || !b.url) return { skip: 'không cấu hình gọi thử' };
  if (/\/a\/macros\//.test(b.url)) return { skip: 'web app giới hạn trong domain — không gọi thử ẩn danh được' };
  const u = b.url + (b.smokeQuery ?? '?action=ping');
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const t = await r.text();
    const ct = r.headers.get('content-type') || '';
    if (/html/i.test(ct) && (/<title>\s*Error\s*<\/title>/i.test(t) || /Script function not found/i.test(t) || /\(line \d+, file (&quot;|")/.test(t))) {
      const txt = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      const m = txt.match(/[A-Za-z]*(Error|Exception)[^.]{0,200}\(line \d+, file "[^"]+"\)/) || txt.match(/Script function not found[^.]{0,80}/);
      return { bad: m ? m[0] : txt.slice(0, 200) };
    }
    if (r.status >= 500) return { bad: 'HTTP ' + r.status };
    return { ok: `HTTP ${r.status}` };
  } catch (e) {
    return { skip: 'không gọi được (' + e.message + ')' };
  }
}

/* ───────── lệnh ───────── */
async function cmdStatus() {
  const cfg = loadCfg();
  await token();
  say('### Kiểm tra kết nối Apps Script');
  say('✅ Chìa khoá CLASPRC_JSON dùng được.');
  say('');
  say('| Backend | Script ID | Phiên bản đang chạy | Số phiên bản | Ghi chú |');
  say('|---|---|---|---|---|');
  let bad = 0;
  for (const [k, b] of Object.entries(cfg)) {
    if (!b.scriptId) { say(`| ${b.name} (\`${k}\`) | — | | | chưa có Script ID |`); bad++; continue; }
    try {
      const d = await getDeployment(b.scriptId, b.deploymentId);
      const vs = await listVersions(b.scriptId);
      const warn = vs.length >= VERSION_WARN ? `⚠️ gần giới hạn 200 phiên bản — xoá bớt trong Lịch sử dự án` : (fs.existsSync(backendDir(k)) ? 'OK' : 'chưa kéo code về');
      say(`| ${b.name} (\`${k}\`) | \`${b.scriptId.slice(0, 10)}…\` | ${d.deploymentConfig?.versionNumber ?? 'HEAD'} | ${vs.length} | ${warn} |`);
    } catch (e) {
      say(`| ${b.name} (\`${k}\`) | \`${b.scriptId.slice(0, 10)}…\` | | | ❌ ${e.status === 404 ? 'Script ID / Deployment ID không khớp' : e.status === 403 ? 'tài khoản không có quyền sửa script này' : e.message.slice(0, 120)} |`);
      bad++;
    }
  }
  if (bad) process.exitCode = 1;
}

/* URL /exec của web app trả JSON (ContentService) chuyển hướng tới script.googleusercontent.com/macros/echo?…&lib=<Script ID>.
 * Web app giới hạn domain thì thử kèm mã truy cập. Gọi kèm action=ping (lệnh đọc vô hại). */
async function scriptIdFromUrl(url) {
  if (!url) return null;
  const u = url + (url.includes('?') ? '&' : '?') + 'action=ping';
  for (const auth of [false, true]) {
    try {
      const headers = auth ? { authorization: 'Bearer ' + await token() } : {};
      const r = await fetch(u, { redirect: 'manual', headers, signal: AbortSignal.timeout(60000) });
      const m = (r.headers.get('location') || '').match(/[?&]lib=([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    } catch (e) { if (e instanceof Stop) throw e; }
  }
  return null;
}

async function cmdWhois(urls) {
  say('### Tra dự án theo URL /exec');
  for (const url of urls) {
    const did = (url.match(/\/s\/([A-Za-z0-9_-]+)\/exec/) || url.match(/\/([A-Za-z0-9_-]+)\/?$/) || [])[1] || '?';
    const id = await scriptIdFromUrl(url);
    if (!id) { say(`- ❓ ${did.slice(0, 14)}…: không đọc được Script ID từ URL`); continue; }
    try {
      const p = await api('GET', `${API}/projects/${id}`);
      const deps = await listDeployments(id);
      say(`- ${did.slice(0, 14)}… ⇒ dự án "${p.title}" · Script ID \`${id}\`${p.parentId ? ' · gắn với file ' + p.parentId : ''}`);
      for (const d of deps) {
        const ep = (d.entryPoints || []).find(e => e.entryPointType === 'WEB_APP');
        say(`  - ${d.deploymentId === did ? '👉 ' : ''}\`${d.deploymentId.slice(0, 14)}…\` phiên bản ${d.deploymentConfig?.versionNumber ?? 'HEAD'} · ${d.deploymentConfig?.description || ''} · cập nhật ${d.updateTime || ''}${ep ? ' · ' + (ep.webApp?.entryPointConfig?.access || '') : ''}`);
      }
    } catch (e) {
      if (e instanceof Stop) throw e;
      say(`- ⚠️ ${did.slice(0, 14)}… ⇒ Script ID \`${id}\` nhưng không đọc được dự án (${e.status === 403 || e.status === 404 ? 'không có quyền Chỉnh sửa' : e.message.slice(0, 120)})`);
    }
  }
}

async function cmdDiscover() {
  const cfg = loadCfg();
  const want = new Map(Object.entries(cfg).filter(([, b]) => !b.scriptId).map(([k, b]) => [b.deploymentId, k]));
  if (!want.size) { say('Tất cả backend đã có Script ID.'); return; }
  say(`### Tự tìm Script ID cho ${want.size} backend`);
  // Cách 1: gọi URL /exec ⇒ Google chuyển hướng sang …/macros/echo?…&lib=<Script ID> (cả script gắn file Sheet)
  for (const [did, k] of [...want]) {
    const id = await scriptIdFromUrl(cfg[k].url);
    if (!id) continue;
    try {
      const deps = await listDeployments(id);
      if (!deps.some(d => d.deploymentId === did)) { say(`- ⚠️ ${cfg[k].name}: URL trỏ tới dự án ${id.slice(0, 10)}… nhưng dự án này không có deployment ${did.slice(0, 14)}…`); continue; }
      const p = await api('GET', `${API}/projects/${id}`).catch(() => ({}));
      cfg[k].scriptId = id; want.delete(did);
      say(`- ✅ ${cfg[k].name}: dự án "${p.title || '?'}"${p.parentId ? ' (gắn với file Drive ' + p.parentId.slice(0, 10) + '…)' : ''}`);
    } catch (e) {
      if (e instanceof Stop) throw e;
      say(`- ⚠️ ${cfg[k].name}: tìm được Script ID qua URL nhưng không đọc được dự án (${e.status === 403 || e.status === 404 ? 'tài khoản trong chìa khoá không có quyền Chỉnh sửa script này' : e.message.slice(0, 160)})`);
    }
  }
  if (!want.size) { saveCfg(cfg); return; }
  // Cách 2: dò mọi dự án Apps Script riêng trên Drive
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.script' and trashed=false");
  let files = [];
  try {
    files = await pages(`${DRIVE}/files?q=${q}&fields=nextPageToken,files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`, 'files');
  } catch (e) {
    if (e instanceof Stop) throw e;  // chìa khoá hỏng ⇒ dừng hẳn, đừng báo nhầm "chưa tìm thấy"
    say('⚠️ Không liệt kê được dự án trên Drive: ' + e.message);
  }
  let scanned = 0;
  const errs = new Map();  // thông báo lỗi → số dự án gặp lỗi đó
  for (const f of files) {
    if (!want.size) break;
    let deps = [];
    try { deps = await listDeployments(f.id); scanned++; }
    catch (e) {
      if (/Apps Script API|has not enabled|has not been used/i.test(e.message)) stop(e.message.replace(/^[^:]*→ \d+: /, ''));
      const m = e.message.replace(/^[^:]*→ /, '').slice(0, 160);
      errs.set(m, (errs.get(m) || 0) + 1);
      continue;
    }
    for (const d of deps) {
      const k = want.get(d.deploymentId);
      if (k) { cfg[k].scriptId = f.id; want.delete(d.deploymentId); say(`- ✅ ${cfg[k].name}: tìm thấy trong dự án "${f.name}"`); }
    }
  }
  saveCfg(cfg);
  say(`Đã dò ${scanned}/${files.length} dự án Apps Script riêng (không gắn file) trên Drive.`);
  for (const [m, n] of errs) say(`- ⚠️ ${n} dự án không đọc được: ${m}`);
  for (const k of want.values()) say(`- ❓ ${cfg[k].name}: chưa tìm thấy (thường là script gắn với file Sheet) — cần Script ID: mở Sheet ▸ Tiện ích mở rộng ▸ Apps Script ▸ ⚙ Cài đặt dự án ▸ Mã tập lệnh.`);
}

async function cmdPull(arg) {
  const cfg = loadCfg();
  const keys = pickKeys(cfg, arg).filter(k => cfg[k].scriptId);
  if (!keys.length) { say('Không có backend nào để kéo về (thiếu Script ID hoặc đã có code).'); return; }
  say('### Kéo code từ Apps Script về repo');
  let bad = 0;
  for (const k of keys) {
    const b = cfg[k];
    try {
      const deps = await listDeployments(b.scriptId);
      if (!deps.some(d => d.deploymentId === b.deploymentId)) stop(`Script ID của ${b.name} không chứa deployment ${b.deploymentId.slice(0, 14)}… — kiểm tra lại Script ID.`);
      const set = await getContent(b.scriptId);
      writeLocal(k, set);
      say(`- ✅ ${b.name}: ${set.order.length} file (${set.order.join(', ')})`);
    } catch (e) {
      say(`- ❌ ${b.name}: ${e.message}`); bad++;
    }
  }
  if (bad) process.exitCode = 1;
}

function changedKeys(before, after) {
  const cfg = loadCfg();
  if (!validSha(before)) return Object.keys(cfg).filter(k => fs.existsSync(backendDir(k)));
  const out = git('diff', '--name-only', before, after, '--', 'backends/').split('\n').filter(Boolean);
  return [...new Set(out.map(p => p.split('/')[1]))].filter(k => cfg[k]);
}

async function deployOne(key, before, description) {
  const cfg = loadCfg();
  const b = cfg[key];
  if (!b) stop(`Không có backend "${key}" trong backends.json`);
  if (!b.scriptId) stop(`${b.name}: chưa có Script ID trong backends.json`);
  const local = readLocal(key);
  if (!local) stop(`${b.name}: thư mục backends/${key}/ trống — chạy workflow "Kéo code về" trước.`);
  if (!local.map['appsscript.json']) stop(`${b.name}: thiếu appsscript.json`);
  try { JSON.parse(local.map['appsscript.json']); } catch (e) { stop(`${b.name}: appsscript.json sai cú pháp JSON (${e.message})`); }

  const remote = await getContent(b.scriptId);
  const dep = await getDeployment(b.scriptId, b.deploymentId);
  const prevVer = dep.deploymentConfig?.versionNumber;

  if (webapp(local) !== webapp(remote)) stop(`${b.name}: cài đặt web app (executeAs / access) trong appsscript.json khác với bản đang chạy — dừng để không đổi quyền truy cập. Nếu thật sự muốn đổi, làm trên giao diện Apps Script rồi "Kéo code về".`);

  if (diff(remote, local).length) {
    const base = validSha(before) ? readAt(before, key) : null;
    if (!base) stop(`${b.name}: chưa có bản gốc trong repo để đối chiếu — chạy "Kéo code về" trước.`);
    const drift = diff(remote, base);
    if (drift.length) stop(`${b.name}: code trên Apps Script đã bị sửa trực tiếp (ngoài GitHub) ở: ${drift.join(', ')}. Dừng để không ghi đè. Chạy workflow "Kéo code về" cho backend này, rồi áp lại thay đổi.`);
    await api('PUT', `${API}/projects/${b.scriptId}/content`, { scriptId: b.scriptId, files: toRemote(local) });
  } else if (prevVer) {
    const live = await getContent(b.scriptId, prevVer);
    if (!diff(live, local).length) { say(`- ➖ ${b.name}: không có gì mới (đang chạy phiên bản ${prevVer}).`); return; }
  }

  const v = await api('POST', `${API}/projects/${b.scriptId}/versions`, { description: (description || '').slice(0, 100) });
  await setDeployment(b.scriptId, b.deploymentId, v.versionNumber, description);
  await sleep(SMOKE_WAIT);
  const sm = await smoke(b);
  if (sm.bad) {
    if (prevVer) await setDeployment(b.scriptId, b.deploymentId, prevVer, 'Tự quay lại sau lỗi: ' + (description || ''));
    stop(`${b.name}: phiên bản ${v.versionNumber} lỗi khi chạy thử (${sm.bad}) → đã tự quay lại phiên bản ${prevVer ?? '?'}.`);
  }
  say(`- ✅ ${b.name}: phiên bản ${prevVer ?? '—'} → **${v.versionNumber}** · URL giữ nguyên · gọi thử: ${sm.ok || sm.skip}`);
  if (v.versionNumber >= VERSION_WARN) {
    const n = (await listVersions(b.scriptId)).length;
    if (n >= VERSION_WARN) say(`  ⚠️ ${b.name} có ${n}/200 phiên bản — vào Apps Script ▸ Lịch sử dự án để xoá bớt bản cũ.`);
  }
}

async function cmdDeploy(keys, before, description) {
  if (!keys.length) { say('Không có backend nào thay đổi.'); return; }
  say('### Deploy backend');
  let bad = 0;
  for (const k of keys) {
    try { await deployOne(k, before, description); }
    catch (e) { say(`- ❌ ${e.message}`); bad++; }
  }
  if (bad) process.exitCode = 1;
}

async function cmdRollback(key, version) {
  const cfg = loadCfg();
  const b = cfg[key];
  if (!b || !b.scriptId) stop(`Không có backend "${key}" (hoặc thiếu Script ID).`);
  const cur = (await getDeployment(b.scriptId, b.deploymentId)).deploymentConfig?.versionNumber;
  let target = Number(version) || 0;
  if (!target) {
    const vs = (await listVersions(b.scriptId)).map(v => v.versionNumber).filter(n => !cur || n < cur).sort((a, c) => c - a);
    target = vs[0];
    if (!target) stop(`${b.name}: không có phiên bản nào cũ hơn ${cur}.`);
  }
  await setDeployment(b.scriptId, b.deploymentId, target, `Quay lại phiên bản ${target}`);
  say(`### Quay lại bản trước`);
  say(`- ↶ ${b.name}: phiên bản ${cur ?? 'HEAD'} → **${target}** (URL giữ nguyên).`);
  say(`- Lưu ý: code trong repo không đổi. Lần gộp tiếp theo vào backends/${key}/ sẽ deploy code trong repo.`);
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  const desc = (process.env.DEPLOY_DESC || '').replace(/\s+/g, ' ').trim();
  switch (cmd) {
    case 'status': return cmdStatus();
    case 'discover': return cmdDiscover();
    case 'whois': return cmdWhois(process.argv.slice(3));
    case 'pull': return cmdPull(a);
    case 'changed': console.log(changedKeys(a, b).join(' ')); return;
    case 'deploy-changed': return cmdDeploy(changedKeys(a, b), a, desc);
    case 'deploy': return cmdDeploy(pickKeys(loadCfg(), a), 'HEAD', desc);
    case 'rollback': return cmdRollback(a, b);
    default:
      console.log('Lệnh: status | discover | pull <key|all|new> | deploy-changed <before> <after> | deploy <key|all> | rollback <key> [version]');
      process.exitCode = 2;
  }
}

main().catch(e => { say('❌ ' + (e instanceof Stop ? e.message : (e.stack || e.message))); process.exitCode = 1; });
