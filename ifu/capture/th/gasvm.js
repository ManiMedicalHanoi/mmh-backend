// Nạp code backend thật (Backend Training Hub.gs) vào sandbox Node để dựng ĐÚNG mẫu email / chứng chỉ
// với dữ liệu giả. Chỉ dùng các hàm dựng HTML (hubInviteContent, hubCertificateHtml) — không gọi Google.
const fs = require('fs'), vm = require('vm');
const SRC = '/home/user/mmh-backend/backends/training/Backend Training Hub.gs';
const pad = n => String(n).padStart(2, '0');
function fmt(d, pat) {               // Utilities.formatDate (múi giờ +07:00)
  const t = new Date(d.getTime() + 7 * 3600e3);
  const M = {yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds())};
  return pat.replace(/yyyy|MM|dd|HH|mm|ss/g, k => M[k]);
}
function load(cfgOverride, quizCfg) {
  const ctx = {console, Utilities: {formatDate: (d, tz, p) => fmt(d, p), getUuid: () => 'x'}, Logger: {log() {}},
    PropertiesService: {getScriptProperties: () => ({getProperty: () => null, setProperty() {}, deleteProperty() {}})},
    MimeType: {GOOGLE_SLIDES: 'application/vnd.google-apps.presentation', GOOGLE_DOCS: 'application/vnd.google-apps.document', GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet', FOLDER: 'application/vnd.google-apps.folder'}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), ctx, {filename: 'Backend Training Hub.gs'});
  vm.runInContext(`HUB.SEND_DOMAIN='example.com'; HUB.ADMIN_EMAIL='giang@example.com';`, ctx);
  ctx.__cfg = Object.assign({}, vm.runInContext('HUB_DEFAULT_CONFIG', ctx), cfgOverride || {});
  ctx.__q = quizCfg || null;
  vm.runInContext(`hubTz=function(){return 'Asia/Bangkok'}; hubGetConfig=function(){return __cfg}; hubReadQuizConfig=function(){return __q};`, ctx);
  return ctx;
}
module.exports = {
  invite(s, sender, opt, cfg, q) { const c = load(cfg, q); return c.hubInviteContent(s, sender, opt); },
  certificate(d, cfg) { const c = load(cfg); d.cfg = c.__cfg; return c.hubCertificateHtml(d); }
};
