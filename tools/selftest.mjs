#!/usr/bin/env node
/* Tự kiểm tools/gas.mjs với Apps Script API giả lập (không cần mạng / chìa khoá thật).
 * Kịch bản: tự tìm Script ID · kéo code · deploy thay đổi · không có gì mới · phát hiện sửa tay (drift)
 * · chặn đổi quyền web app · lỗi khi chạy thử ⇒ tự quay lại · quay lại bản trước bằng tay · thứ tự file giữ nguyên.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const clone = x => JSON.parse(JSON.stringify(x));
const MANIFEST = JSON.stringify({ timeZone: 'Asia/Ho_Chi_Minh', runtimeVersion: 'V8', webapp: { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' } }, null, 2);

/* ───── backend giả lập ───── */
const P = {
  S1: { name: 'Report Hub MKT', drive: true, head: [
    { name: 'appsscript', type: 'JSON', source: MANIFEST },
    { name: 'Z_Config', type: 'SERVER_JS', source: 'var A = 1;\n' },
    { name: 'Code', type: 'SERVER_JS', source: 'function doGet(e){ return ContentService.createTextOutput(JSON.stringify({ok:true,a:A})); }\n' },
    { name: 'ui/Page', type: 'HTML', source: '<p>hi</p>\n' },
  ], versions: {}, deps: { D1: 1 } },
  S2: { name: 'Training (gắn Sheet)', drive: false, head: [
    { name: 'appsscript', type: 'JSON', source: MANIFEST },
    { name: 'Code', type: 'SERVER_JS', source: 'function doGet(){}\n' },
  ], versions: {}, deps: { D2: 1 } },
};
for (const p of Object.values(P)) p.versions[1] = clone(p.head);
const calls = [];

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let body = ''; for await (const c of req) body += c;
  const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  calls.push(req.method + ' ' + u.pathname);
  if (u.pathname === '/token') return json(200, { access_token: 'tok' });
  if (req.headers.authorization !== 'Bearer tok' && !u.pathname.startsWith('/exec/')) return json(401, { error: { message: 'no auth' } });
  if (u.pathname === '/drive/files') return json(200, { files: Object.entries(P).filter(([, p]) => p.drive).map(([id, p]) => ({ id, name: p.name })) });
  let m;
  if ((m = u.pathname.match(/^\/exec\/(\w+)$/))) {
    const p = Object.values(P).find(p => m[1] in p.deps);
    const files = p.versions[p.deps[m[1]]];
    if (files.some(f => /BROKEN/.test(f.source))) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html><head><title>Error</title></head><body><div>TypeError: BROKEN is not a function (line 1, file &quot;Code&quot;)</div></body></html>'); }
    return json(200, { ok: true });
  }
  if (!(m = u.pathname.match(/^\/v1\/projects\/(\w+)(\/.*)?$/))) return json(404, { error: { message: 'nf' } });
  const p = P[m[1]], rest = m[2] || '';
  if (!p) return json(404, { error: { message: 'Requested entity was not found.' } });
  if (rest === '/content' && req.method === 'GET') {
    const v = u.searchParams.get('versionNumber');
    return json(200, { scriptId: m[1], files: clone(v ? p.versions[v] : p.head) });
  }
  if (rest === '/content' && req.method === 'PUT') { p.head = JSON.parse(body).files; return json(200, {}); }
  if (rest === '/versions' && req.method === 'POST') { const n = Math.max(...Object.keys(p.versions).map(Number)) + 1; p.versions[n] = clone(p.head); return json(200, { versionNumber: n }); }
  if (rest === '/versions') return json(200, { versions: Object.keys(p.versions).map(n => ({ versionNumber: +n })) });
  if (rest === '/deployments') return json(200, { deployments: Object.keys(p.deps).map(d => ({ deploymentId: d })) });
  if ((m = rest.match(/^\/deployments\/(\w+)$/))) {
    if (!(m[1] in p.deps)) return json(404, { error: { message: 'nf' } });
    if (req.method === 'PUT') { const c = JSON.parse(body).deploymentConfig; if (!p.versions[c.versionNumber]) return json(400, { error: { message: 'bad ver' } }); p.deps[m[1]] = c.versionNumber; }
    return json(200, { deploymentId: m[1], deploymentConfig: { versionNumber: p.deps[m[1]] } });
  }
  json(404, { error: { message: 'nf ' + rest } });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

/* ───── repo tạm ───── */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gas-selftest-'));
fs.mkdirSync(path.join(dir, 'tools'));
fs.copyFileSync(path.join(HERE, 'gas.mjs'), path.join(dir, 'tools', 'gas.mjs'));
fs.writeFileSync(path.join(dir, 'backends.json'), JSON.stringify({
  mkt: { name: 'MKT', deploymentId: 'D1', scriptId: '', url: `${BASE}/exec/D1` },
  trn: { name: 'Training', deploymentId: 'D2', scriptId: '', url: `${BASE}/exec/D2` },
}, null, 2));
const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
git('init', '-q', '-b', 'main'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
const commit = msg => { git('add', '-A'); git('commit', '-q', '-m', msg); return git('rev-parse', 'HEAD'); };
let sha = commit('init');

const ENV = { ...process.env, CLASPRC_JSON: JSON.stringify({ tokens: { default: { client_id: 'c', client_secret: 's', refresh_token: 'r', type: 'authorized_user' } } }),
  GAS_SCRIPT_API: BASE + '/v1', GAS_DRIVE_API: BASE + '/drive', GAS_TOKEN_URL: BASE + '/token', GAS_SMOKE_WAIT_MS: '0', GITHUB_STEP_SUMMARY: '' };
function run(...args) {
  return new Promise(res => {
    const c = spawn(process.execPath, ['tools/gas.mjs', ...args], { cwd: dir, env: ENV });
    let out = ''; c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d);
    c.on('close', code => res({ code, out }));
  });
}
let failed = 0;
function check(name, ok, info = '') { console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : '\n' + info}`); if (!ok) failed++; }
const cfg = () => JSON.parse(fs.readFileSync(path.join(dir, 'backends.json'), 'utf8'));
const rd = p => fs.readFileSync(path.join(dir, 'backends', p), 'utf8');
const wr = (p, s) => fs.writeFileSync(path.join(dir, 'backends', p), s);

try {
  let r = await run('discover');
  check('discover: tìm được Script ID qua Drive', cfg().mkt.scriptId === 'S1' && cfg().trn.scriptId === '', r.out);
  check('discover: báo backend không tìm thấy', /Training: chưa tìm thấy/.test(r.out), r.out);

  const c = cfg(); c.trn.scriptId = 'S2'; fs.writeFileSync(path.join(dir, 'backends.json'), JSON.stringify(c, null, 2));
  r = await run('pull', 'new');
  check('pull: kéo đủ 2 backend', r.code === 0 && fs.existsSync(path.join(dir, 'backends/mkt/ui/Page.html')) && fs.existsSync(path.join(dir, 'backends/trn/Code.gs')), r.out);
  check('pull: lưu thứ tự file', JSON.parse(rd('mkt/.files.json')).join() === 'appsscript.json,Z_Config.gs,Code.gs,ui/Page.html', rd('mkt/.files.json'));
  sha = commit('pull');

  r = await run('deploy-changed', sha, sha);
  check('không đổi gì ⇒ không deploy', r.code === 0 && /Không có backend nào thay đổi/.test(r.out) && P.S1.deps.D1 === 1, r.out);

  r = await run('deploy', 'mkt');
  check('deploy tay khi code = bản đang chạy ⇒ bỏ qua', r.code === 0 && /không có gì mới/.test(r.out) && Object.keys(P.S1.versions).length === 1, r.out);

  wr('mkt/Code.gs', rd('mkt/Code.gs').replace('ok:true', 'ok:true,v:2'));
  let before = sha; sha = commit('sửa mkt');
  r = await run('changed', before, sha);
  check('chỉ backend có thay đổi', r.out.trim() === 'mkt', r.out);
  r = await run('deploy-changed', before, sha);
  check('deploy: tạo phiên bản 2, deployment cũ trỏ sang 2', r.code === 0 && P.S1.deps.D1 === 2 && /v:2/.test(P.S1.head.find(f => f.name === 'Code').source), r.out);
  check('deploy: giữ thứ tự file khi đẩy', P.S1.head.map(f => f.name).join() === 'appsscript,Z_Config,Code,ui/Page', P.S1.head.map(f => f.name).join());
  check('deploy: báo gọi thử OK', /gọi thử: HTTP 200/.test(r.out), r.out);

  P.S1.head.find(f => f.name === 'Z_Config').source = 'var A = 99; // sửa tay\n';
  wr('mkt/Code.gs', rd('mkt/Code.gs').replace('v:2', 'v:3'));
  before = sha; sha = commit('sửa mkt lần 3');
  r = await run('deploy-changed', before, sha);
  check('drift: có người sửa tay ⇒ dừng, không ghi đè', r.code === 1 && /sửa trực tiếp/.test(r.out) && /Z_Config\.gs/.test(r.out) && /99/.test(P.S1.head.find(f => f.name === 'Z_Config').source) && P.S1.deps.D1 === 2, r.out);

  r = await run('pull', 'mkt');
  check('pull lại sau drift', /99/.test(rd('mkt/Z_Config.gs')), r.out);
  sha = commit('kéo code về (workflow tự lưu)');
  wr('mkt/Code.gs', rd('mkt/Code.gs').replace(/v:\d/, 'v:3'));
  before = sha; sha = commit('áp lại sau khi kéo về');
  r = await run('deploy-changed', before, sha);
  check('deploy sau khi kéo về: OK (phiên bản 3)', r.code === 0 && P.S1.deps.D1 === 3, r.out);

  const man = JSON.parse(rd('trn/appsscript.json')); man.webapp.access = 'DOMAIN'; wr('trn/appsscript.json', JSON.stringify(man, null, 2));
  before = sha; sha = commit('đổi quyền');
  r = await run('deploy-changed', before, sha);
  check('chặn đổi quyền web app', r.code === 1 && /executeAs \/ access/.test(r.out) && JSON.parse(P.S2.head[0].source).webapp.access === 'ANYONE_ANONYMOUS', r.out);
  git('checkout', '-q', before, '--', 'backends/trn'); before = sha; sha = commit('bỏ đổi quyền');

  wr('mkt/Code.gs', 'function doGet(){ BROKEN(); }\n');
  before = sha; sha = commit('code lỗi');
  r = await run('deploy-changed', before, sha);
  check('lỗi khi chạy thử ⇒ tự quay về phiên bản 3', r.code === 1 && P.S1.deps.D1 === 3 && /tự quay lại phiên bản 3/.test(r.out) && /line 1, file "Code"/.test(r.out), r.out);

  wr('mkt/Code.gs', rd('mkt/Code.gs').replace('BROKEN();', 'return 1;'));
  before = sha; sha = commit('sửa lỗi');
  r = await run('deploy-changed', before, sha);
  check('sửa lỗi ⇒ deploy tiếp được (HEAD = bản lỗi đã ghi vào repo)', r.code === 0 && P.S1.deps.D1 === 5, r.out);

  r = await run('rollback', 'mkt');
  check('quay lại bản ngay trước (5 → 4)', r.code === 0 && P.S1.deps.D1 === 4, r.out);
  r = await run('rollback', 'mkt', '2');
  check('quay lại phiên bản chỉ định (2)', r.code === 0 && P.S1.deps.D1 === 2, r.out);

  r = await run('deploy', 'mkt');
  check('deploy tay đưa bản trong repo lên lại (sau rollback)', r.code === 0 && P.S1.deps.D1 === 6, r.out);

  r = await run('status');
  check('status: bảng tình trạng', r.code === 0 && /\| MKT \(`mkt`\) \| `S1…` \| 6 \| 6 \| OK \|/.test(r.out), r.out);

  const good = JSON.stringify({ tokens: { default: { client_id: 'c', client_secret: 's', refresh_token: 'r', type: 'authorized_user', access_token: 'ya29.' + 'x'.repeat(180) } } }, null, 2);
  ENV.CLASPRC_JSON = 'mmh_product@cloudshell:~$ cat ~/.clasprc.json\n' + good.replace(/x{60}/g, m => m + '\n') + '\nmmh_product@cloudshell:~$ ';
  r = await run('status');
  check('chìa khoá copy từ terminal (bị ngắt dòng, dính dấu nhắc) ⇒ vẫn đọc được', r.code === 0 && /dùng được/.test(r.out), r.out);
  ENV.CLASPRC_JSON = good.slice(0, 120) + 'SECRETPART';
  r = await run('status');
  check('chìa khoá dán thiếu ⇒ báo dễ hiểu, không lộ nội dung', r.code === 1 && /không phải JSON hợp lệ/.test(r.out) && /copy thiếu/.test(r.out) && !/SECRETPART|authorized_user/.test(r.out), r.out);
  { const c2 = cfg(); c2.mkt.scriptId = ''; fs.writeFileSync(path.join(dir, 'backends.json'), JSON.stringify(c2, null, 2)); }
  r = await run('discover');
  check('discover: chìa khoá hỏng ⇒ dừng, không báo nhầm "chưa tìm thấy"', r.code === 1 && !/chưa tìm thấy/.test(r.out), r.out);
  ENV.CLASPRC_JSON = '';
  r = await run('status');
  check('chưa có chìa khoá ⇒ hướng dẫn tạo secret', r.code === 1 && /Chưa có chìa khoá/.test(r.out), r.out);
} finally {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} kịch bản LỖI` : '\nTất cả kịch bản đạt.');
process.exitCode = failed ? 1 : 0;
