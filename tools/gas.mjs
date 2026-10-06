#!/usr/bin/env node
/* Đồng bộ code Apps Script ↔ repo qua Apps Script API (không cần cài clasp).
 *
 *   node tools/gas.mjs status                    kiểm tra chìa khoá + tình trạng từng backend
 *   node tools/gas.mjs discover                  tự tìm Script ID còn thiếu (theo Deployment ID)
 *   node tools/gas.mjs pull <key|all|new>        kéo code từ Apps Script về backends/<key>/
 *   node tools/gas.mjs deploy-changed <before> <after>   deploy các backend có thay đổi giữa 2 commit
 *   node tools/gas.mjs deploy <key>              deploy 1 backend (so với HEAD)
 *   node tools/gas.mjs rollback <key> [version]  đưa web app về phiên bản trước (hoặc số phiên bản chỉ định), có gọi thử
 *   node tools/gas.mjs diff <key> [version]      so code repo với phiên bản đang chạy (hoặc chỉ định), in diff từng file
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
const PULL_FILE = '.pull.json';  // ghi lúc kéo về: { version: phiên bản đang chạy, pending: [file HEAD ≠ bản đang chạy] }
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
/* Quyền web app dạng "executeAs/access". Manifest (appsscript.json) chỉ là bản nháp; quyền THẬT của URL nằm ở
 * entryPoints của deployment (= manifest của phiên bản đang chạy). Deploy phải giữ đúng quyền thật. */
function webapp(set) {
  try { const w = JSON.parse(set.map['appsscript.json'] || '{}').webapp; return w ? `${w.executeAs || ''}/${w.access || ''}` : 'none'; } catch (_) { return 'invalid'; }
}
function liveWebapp(dep) {
  const ep = (dep.entryPoints || []).find(e => e.entryPointType === 'WEB_APP');
  const c = ep && ep.webApp && ep.webApp.entryPointConfig;
  return c ? `${c.executeAs || ''}/${c.access || ''}` : null;
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
  say('| Backend | Script ID | Phiên bản · quyền đang chạy | Số phiên bản | Ghi chú |');
  say('|---|---|---|---|---|');
  let bad = 0;
  for (const [k, b] of Object.entries(cfg)) {
    if (!b.scriptId) { say(`| ${b.name} (\`${k}\`) | — | | | chưa có Script ID |`); bad++; continue; }
    try {
      const d = await getDeployment(b.scriptId, b.deploymentId);
      const vs = await listVersions(b.scriptId);
      const cur = d.deploymentConfig?.versionNumber;
      const notes = [];
      if (vs.length >= VERSION_WARN) notes.push('⚠️ gần giới hạn 200 phiên bản — xoá bớt trong Lịch sử dự án');
      const local = readLocal(k);
      if (!local) notes.push('chưa kéo code về');
      const live = liveWebapp(d);
      if (local && live && webapp(local) !== live) notes.push(`⚠️ quyền trong appsscript.json (${webapp(local)}) ≠ quyền đang chạy (${live}) — phải sửa trước khi deploy`);
      if (cur) {
        const pend = diff(await getContent(b.scriptId), await getContent(b.scriptId, cur));
        if (pend.length) notes.push(`⚠️ code trong dự án khác bản đang chạy (chưa deploy) ở: ${pend.join(', ')} — lần deploy tới sẽ đưa lên cùng`);
      }
      for (const o of await listDeployments(b.scriptId)) {
        // bỏ qua bản thử nghiệm @HEAD (/dev) có sẵn trong mọi dự án
        if (o.deploymentId === b.deploymentId || !liveWebapp(o) || !o.deploymentConfig?.versionNumber) continue;
        const v = o.deploymentConfig?.versionNumber;
        notes.push(`có deployment khác \`${o.deploymentId.slice(0, 12)}…\` ở phiên bản ${v ?? 'HEAD'}${v && cur && v > cur ? ' (MỚI HƠN bản app đang gọi)' : ''}`);
      }
      say(`| ${b.name} (\`${k}\`) | \`${b.scriptId.slice(0, 10)}…\` | ${cur ?? 'HEAD'} · ${live || '?'} | ${vs.length} | ${notes.join('<br>') || 'OK'} |`);
    } catch (e) {
      say(`| ${b.name} (\`${k}\`) | \`${b.scriptId.slice(0, 10)}…\` | | | ❌ ${e.status === 404 ? 'Script ID / Deployment ID không khớp' : e.status === 403 ? 'tài khoản không có quyền sửa script này' : (e.status ? 'HTTP ' + e.status + ': ' : '') + e.message.replace(/^.*?→ \d+: /, '').slice(0, 200)} |`);
      bad++;
    }
  }
  if (bad) process.exitCode = 1;
}

async function cmdDiscover() {
  const cfg = loadCfg();
  const want = new Map(Object.entries(cfg).filter(([, b]) => !b.scriptId).map(([k, b]) => [b.deploymentId, k]));
  if (!want.size) { say('Tất cả backend đã có Script ID.'); return; }
  say(`### Tự tìm Script ID cho ${want.size} backend`);
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
      if (/^AKfycb/.test(b.scriptId)) stop(`"${b.scriptId.slice(0, 14)}…" là Mã triển khai, không phải Script ID (Script ID nằm trong địa chỉ trang Apps Script: …/projects/<Script ID>/edit).`);
      const p = await api('GET', `${API}/projects/${b.scriptId}`);
      if (b.sheetId && p.parentId && p.parentId !== b.sheetId) stop(`Script ID của ${b.name} là script "${p.title}" gắn với file khác (${p.parentId.slice(0, 10)}…), không phải Sheet ${b.sheetId.slice(0, 10)}… — có thể dán nhầm thứ tự.`);
      const deps = await listDeployments(b.scriptId);
      if (!deps.some(d => d.deploymentId === b.deploymentId)) stop(`Script "${p.title}" không có deployment ${b.deploymentId.slice(0, 14)}… mà app đang gọi. Các deployment hiện có: ${deps.map(d => d.deploymentId.slice(0, 14) + '…').join(', ') || 'không có'}.`);
      const set = await getContent(b.scriptId);
      writeLocal(k, set);
      const ver = deps.find(d => d.deploymentId === b.deploymentId).deploymentConfig?.versionNumber ?? null;
      const pending = ver ? diff(set, await getContent(b.scriptId, ver)) : [];
      fs.writeFileSync(path.join(backendDir(k), PULL_FILE), JSON.stringify({ version: ver, pending }, null, 2) + '\n');
      say(`- ✅ ${b.name}: ${set.order.length} file (${set.order.join(', ')})${pending.length ? ` · ⚠️ chưa deploy: ${pending.join(', ')}` : ''}`);
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

/* Bộ file này có khớp 1 trạng thái của backends/<key>/ trong lịch sử repo (tối đa 40 commit gần nhất) không */
function inHistory(set, before, key) {
  if (!validSha(before)) return false;
  const shas = git('log', '--format=%H', '-n', '40', before, '--', `backends/${key}/`).split('\n').filter(Boolean);
  return shas.some(h => { const s = readAt(h, key); return s && !diff(set, s).length; });
}

/* auto = deploy tự động khi gộp vào main: chỉ đưa lên thay đổi đến từ repo. Bỏ qua bản gốc vừa kéo về, và dừng nếu
 * bản đang chạy chứa thứ không có trong lịch sử repo (code sửa trên trình soạn nhưng chưa deploy) — phải deploy tay. */
async function deployOne(key, before, description, auto = false) {
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

  const live = liveWebapp(dep) || webapp(remote);
  if (webapp(local) !== live) stop(`${b.name}: quyền web app trong appsscript.json (${webapp(local)}) khác quyền URL đang chạy (${live}) — dừng để không đổi quyền truy cập. Sửa mục "webapp" trong appsscript.json cho khớp ${live} rồi gộp lại.`);

  if (auto) {
    const base = validSha(before) ? readAt(before, key) : null;
    if (!base) { say(`- ➖ ${b.name}: bản gốc vừa đưa vào repo — không deploy tự động.`); return; }
    if (!diff(base, local).length) { say(`- ➖ ${b.name}: code không đổi.`); return; }
    // Lúc kéo về đã ghi: phiên bản đang chạy + file HEAD khác bản đang chạy. Chưa ai deploy kể từ đó và repo vẫn giữ
    // các file đó khác bản đang chạy ⇒ code chưa ai duyệt, không đưa lên tự động.
    let pulled = {};
    try { pulled = JSON.parse(fs.readFileSync(path.join(backendDir(key), PULL_FILE), 'utf8')); } catch (_) {}
    if ((pulled.pending || []).length && pulled.version === prevVer) {
      const running = await getContent(b.scriptId, prevVer);
      const still = pulled.pending.filter(f => diff({ order: [f], map: f in running.map ? { [f]: running.map[f] } : {} }, { order: [f], map: f in local.map ? { [f]: local.map[f] } : {} }).length);
      if (still.length) stop(`${b.name}: lúc kéo về, code trên Apps Script đã khác bản đang chạy (phiên bản ${prevVer}) ở: ${still.join(', ')} — code chưa từng deploy. Deploy tự động dừng để không đưa lên thứ chưa ai duyệt. Muốn đưa lên tất cả: Actions ▸ Deploy backend ▸ Run workflow ▸ ${key}.`);
    }
  }


  let pushed = false;
  if (diff(remote, local).length) {
    const base = validSha(before) ? readAt(before, key) : null;
    if (!base) stop(`${b.name}: chưa có bản gốc trong repo để đối chiếu — chạy "Kéo code về" trước.`);
    let drift = diff(remote, base);
    // Code trên Apps Script khớp 1 bản từng có trong repo (vd. lần deploy trước bị chặn trước khi đẩy) ⇒ không phải sửa tay
    if (drift.length && inHistory(remote, before, key)) drift = [];
    if (drift.length) stop(`${b.name}: code trên Apps Script đã bị sửa trực tiếp (ngoài GitHub) ở: ${drift.join(', ')}. Dừng để không ghi đè. Chạy workflow "Kéo code về" cho backend này, rồi áp lại thay đổi.`);
    await api('PUT', `${API}/projects/${b.scriptId}/content`, { scriptId: b.scriptId, files: toRemote(local) });
    pushed = true;
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
    // Trigger hẹn giờ / menu trong Sheet chạy code HEAD (không phải bản deploy) ⇒ trả cả code HEAD về như trước
    if (pushed) await api('PUT', `${API}/projects/${b.scriptId}/content`, { scriptId: b.scriptId, files: toRemote(remote) });
    stop(`${b.name}: phiên bản ${v.versionNumber} lỗi khi chạy thử (${sm.bad}) → đã tự quay lại phiên bản ${prevVer ?? '?'}${pushed ? ' và trả code trong dự án về như trước' : ''}.`);
  }
  say(`- ✅ ${b.name}: phiên bản ${prevVer ?? '—'} → **${v.versionNumber}** · URL giữ nguyên · gọi thử: ${sm.ok || sm.skip}`);
  if (v.versionNumber >= VERSION_WARN) {
    const n = (await listVersions(b.scriptId)).length;
    if (n >= VERSION_WARN) say(`  ⚠️ ${b.name} có ${n}/200 phiên bản — vào Apps Script ▸ Lịch sử dự án để xoá bớt bản cũ.`);
  }
}

async function cmdDeploy(keys, before, description, auto = false) {
  if (!keys.length) { say('Không có backend nào thay đổi.'); return; }
  say('### Deploy backend');
  let bad = 0;
  for (const k of keys) {
    try { await deployOne(k, before, description, auto); }
    catch (e) { say(`- ❌ ${e.message}`); bad++; }
  }
  if (bad) process.exitCode = 1;
}

/* So code trong repo với phiên bản đang chạy (hoặc phiên bản chỉ định) — in diff từng file (repo riêng tư nên in code được) */
async function cmdDiff(key, version) {
  const cfg = loadCfg();
  const b = cfg[key];
  if (!b || !b.scriptId) stop(`Không có backend "${key}" (hoặc thiếu Script ID).`);
  const ver = Number(version) || (await getDeployment(b.scriptId, b.deploymentId)).deploymentConfig?.versionNumber;
  const live = await getContent(b.scriptId, ver);
  const local = readLocal(key);
  if (!local) stop(`${b.name}: chưa có code trong repo.`);
  const files = diff(live, local);
  say(`### ${b.name}: repo so với phiên bản ${ver} — ${files.length ? files.length + ' file khác' : 'giống hệt'}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gasdiff-'));
  for (const f of files) {
    const a = path.join(tmp, 'a'), c = path.join(tmp, 'b');
    fs.writeFileSync(a, (live.map[f] ?? '').replace(/\r\n/g, '\n')); fs.writeFileSync(c, (local.map[f] ?? '').replace(/\r\n/g, '\n'));
    let out = '';
    try { out = execFileSync('diff', ['-u', '--label', `v${ver}/${f}`, '--label', `repo/${f}`, a, c], { encoding: 'utf8' }); }
    catch (e) { out = e.stdout || ''; }
    say('```diff\n' + out.slice(0, 60000) + (out.length > 60000 ? '\n… (cắt bớt)' : '') + '\n```');
  }
  fs.rmSync(tmp, { recursive: true, force: true });
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
  await setDeployment(b.scriptId, b.deploymentId, target, `Chuyển sang phiên bản ${target}`);
  await sleep(SMOKE_WAIT);
  const sm = await smoke(b);
  if (sm.bad) {
    if (cur) await setDeployment(b.scriptId, b.deploymentId, cur, `Tự quay lại sau lỗi phiên bản ${target}`);
    stop(`${b.name}: phiên bản ${target} lỗi khi chạy thử (${sm.bad}) → đã giữ nguyên phiên bản ${cur}.`);
  }
  say(`### Chuyển phiên bản`);
  say(`- ↶ ${b.name}: phiên bản ${cur ?? 'HEAD'} → **${target}** (URL giữ nguyên) · gọi thử: ${sm.ok || sm.skip}.`);
  say(`- Lưu ý: code trong repo không đổi. Lần gộp tiếp theo vào backends/${key}/ sẽ deploy code trong repo.`);
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  const desc = (process.env.DEPLOY_DESC || '').replace(/\s+/g, ' ').trim();
  switch (cmd) {
    case 'status': return cmdStatus();
    case 'discover': return cmdDiscover();
    case 'pull': return cmdPull(a);
    case 'changed': console.log(changedKeys(a, b).join(' ')); return;
    case 'deploy-changed': return cmdDeploy(changedKeys(a, b), a, desc, true);
    case 'deploy': return cmdDeploy(pickKeys(loadCfg(), a), 'HEAD', desc);
    case 'rollback': return cmdRollback(a, b);
    case 'diff': return cmdDiff(a, b);
    default:
      console.log('Lệnh: status | discover | pull <key|all|new> | deploy-changed <before> <after> | deploy <key|all> | rollback <key> [version]');
      process.exitCode = 2;
  }
}

main().catch(e => { say('❌ ' + (e instanceof Stop ? e.message : (e.stack || e.message))); process.exitCode = 1; });
