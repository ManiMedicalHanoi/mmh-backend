// MMH Daily Podcast — thông báo "tinh tinh" khi có số podcast mới (Web Push).
// Training Hub (trigger hwWarm ▸ dypTick_, RH_DailySocial.gs) thấy data/index.json của MMH-Daily có số HÔM NAY ⇒ gọi workflow daily-push.yml ⇒ file này:
// dyPushList (key = 8 ký tự cuối Script ID training) ⇒ gửi bằng khoá VAPID vapid.json (dùng chung MMH Survey; khoá công khai nằm trong MMH-Daily ▸ rank.js)
// ⇒ máy hết hạn (404 / 410) ⇒ dyPushGone. Chạy tay: Actions ▸ "MMH Daily — thông báo số mới" ▸ Run workflow.
import webpush from 'web-push';
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const url = cfg.training.url, key = String(cfg.training.scriptId).slice(-8);
const v = JSON.parse(fs.readFileSync(new URL('./vapid.json', import.meta.url), 'utf8'));
webpush.setVapidDetails('https://manimedicalhanoi.github.io/MMH-Daily/', v.publicKey, v.privateKey);
const idx = await (await fetch('https://raw.githubusercontent.com/ManiMedicalHanoi/MMH-Daily/main/data/index.json?t=' + Date.now())).json();
const ed = (idx.editions || [])[0] || {};
const SHOW = { talk: 'MMH Talk', clinicroom: 'The Clinic Room', lawdesk: 'Law & Tender Desk', headlines: 'Morning Headlines', english: 'English at Work', aipulse: 'AI Pulse', weekly: 'Week in Review' };
const title = String(ed.title || SHOW[ed.show] || 'MMH Daily Podcast').replace(/^[^:]+:\s*/, '');
const show = SHOW[ed.show] || 'MMH Daily Podcast';
const r = await fetch(`${url}?action=dyPushList&key=${encodeURIComponent(key)}`, { redirect: 'follow' });
const d = await r.json().catch(() => ({ ok: false, error: 'HTTP ' + r.status }));
if (!d.ok) { console.log('Không đọc được danh sách máy:', d.error || d.code); process.exit(1); }
const gone = []; let sent = 0;
for (const s of d.subs || []) {
  const vi = s.lang !== 'en';
  const msg = { title: vi ? `Số mới: ${show}` : `New episode: ${show}`, body: vi ? `${title} — nghe 8 phút và làm bài để giữ chuỗi nhé!` : `${title} — listen for 8 minutes and keep your streak!`,
    url: `https://manimedicalhanoi.github.io/MMH-Daily/#/listen/${ed.date || ''}`, tag: 'mmh-daily-' + (ed.date || '') };
  try { await webpush.sendNotification({ endpoint: s.ep, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 43200, urgency: 'normal' }); sent++; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.ep); console.log('Không gửi được tới 1 máy:', e.statusCode || e.message); }
}
if (gone.length) await fetch(`${url}?action=dyPushGone&key=${encodeURIComponent(key)}&eps=${encodeURIComponent(JSON.stringify(gone))}`, { redirect: 'follow' });
const out = `Số ${ed.date} · đã báo ${sent}/${(d.subs || []).length} máy · gỡ ${gone.length} máy hết hạn`;
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### MMH Daily Podcast\n${out}\n`);
