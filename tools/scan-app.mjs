#!/usr/bin/env node
/* Dò các backend Apps Script mà một app (repo GitHub khác) đang gọi, đối chiếu với backends.json.
 *
 *   node tools/scan-app.mjs <thư mục app> <owner/repo>          chỉ liệt kê
 *   node tools/scan-app.mjs <thư mục app> <owner/repo> --add    thêm backend mới vào backends.json (scriptId để trống)
 *
 * Sau --add: gộp vào main ⇒ workflow "Kéo code về" tự tìm Script ID (script riêng trên Drive) và kéo code;
 * script gắn với file Sheet thì cần người dùng gửi địa chỉ trang Apps Script (…/projects/<Script ID>/edit).
 */
import fs from 'node:fs';
import path from 'node:path';

const [dir, repo, flag] = process.argv.slice(2);
if (!dir || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.log('Cách dùng: node tools/scan-app.mjs <thư mục app> <owner/repo> [--add]');
  process.exit(2);
}
const CFG_FILE = path.join(process.cwd(), 'backends.json');
const cfg = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'));
const URL_RE = /https:\/\/script\.google\.com\/(?:a\/macros\/[\w.-]+|macros)\/s\/(AKfycb[\w-]+)\/exec/g;
const EXT = /\.(html?|m?js|ts|jsx|tsx|vue|json|gs)$/i;

const found = new Map();  // deploymentId → { url, where: [file:line], ident }
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    if (!EXT.test(e.name) || fs.statSync(f).size > 8 << 20) continue;
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(URL_RE)) {
        const did = m[1];
        // tên biến / khoá đứng ngay trước URL: `marketing: "…`, `var TRAINING_HUB_API="…`
        const before = line.slice(0, m.index);
        const id = (before.match(/([A-Za-z_$][\w$]*)\s*["']?\s*[:=]\s*["'`]?\s*$/) || [])[1] || '';
        const rec = found.get(did) || { url: m[0], where: [], ident: '' };
        rec.where.push(`${path.relative(dir, f)}:${i + 1}`);
        if (!rec.ident && id) rec.ident = id;
        found.set(did, rec);
      }
    });
  }
})(dir);

const byDid = new Map(Object.entries(cfg).map(([k, b]) => [b.deploymentId, k]));
const short = repo.split('/')[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = s => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

console.log(`### Backend mà ${repo} đang gọi (${found.size})`);
console.log('| Mã triển khai | Biến trong code | Vị trí | Trong mmh-backend |');
console.log('|---|---|---|---|');
let added = 0, linked = 0;
for (const [did, r] of found) {
  let key = byDid.get(did);
  let state = key ? `có sẵn: \`${key}\`` : 'MỚI';
  if (flag === '--add') {
    if (key) {
      const b = cfg[key];
      b.apps = b.apps || [];
      if (!b.apps.includes(repo)) { b.apps.push(repo); linked++; state += ' (thêm app)'; }
    } else {
      key = `${short}-${slug(r.ident) || did.slice(6, 12).toLowerCase()}`;
      while (cfg[key]) key += '-2';
      cfg[key] = { name: `${repo.split('/')[1]} – ${r.ident || did.slice(0, 14)}`, apps: [repo], deploymentId: did, scriptId: '', sheetId: '', url: r.url };
      byDid.set(did, key);
      added++;
      state = `đã thêm: \`${key}\``;
    }
  }
  console.log(`| \`${did.slice(0, 14)}…\` | ${r.ident || '—'} | ${r.where.slice(0, 3).join(', ')}${r.where.length > 3 ? ' …' : ''} | ${state} |`);
}
if (flag === '--add') {
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`\nĐã thêm ${added} backend mới, gắn thêm app cho ${linked} backend có sẵn vào backends.json.`);
}
