#!/usr/bin/env node
/* Kiểm cú pháp mọi file .gs/.js trong backends/ (biên dịch, không chạy) + appsscript.json hợp lệ. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

let n = 0, bad = 0;
(function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    try {
      if (/\.(gs|js)$/.test(e.name)) { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); n++; }
      else if (e.name === 'appsscript.json') { JSON.parse(fs.readFileSync(f, 'utf8')); n++; }
    } catch (err) {
      bad++;
      console.log(`❌ ${f}: ${err.message}`);
      if (err.stack) console.log(err.stack.split('\n').slice(0, 3).join('\n'));
    }
  }
})('backends');
console.log(`${n} file đã kiểm, ${bad} lỗi.`);
process.exitCode = bad ? 1 : 0;
