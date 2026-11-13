// MMH Survey — gửi thông báo đẩy (Web Push) khi có câu trả lời khảo sát mới.
// Workflow "Khảo sát — quét câu trả lời mới" chạy file này: gọi survey ?action=rsTick (khoá) ⇒ máy chủ trả `jobs` (máy đã bật thông báo của người Theo dõi)
// ⇒ gửi bằng khoá VAPID trong vapid.json (kho riêng tư; khoá chỉ dùng để gửi thông báo của MMH Survey, đổi khoá ⇒ mọi máy phải bật lại thông báo,
// khoá công khai đi kèm nằm trong mmh-library ▸ wiki/public/survey/app.js) ⇒ máy hết hạn (404 / 410) ⇒ rsPushGone gỡ khỏi danh sách.
import webpush from 'web-push';
import fs from 'node:fs';
const cfg = JSON.parse(fs.readFileSync('backends.json', 'utf8'));
const url = cfg.survey.url;
const key = (fs.readFileSync('backends/survey/MMH_SurveyAPI.gs', 'utf8').match(/KEY: '([^']+)'/) || [])[1];
const v = JSON.parse(fs.readFileSync(new URL('./vapid.json', import.meta.url), 'utf8'));
webpush.setVapidDetails('https://manimedicalhanoi.github.io/mmh-library/survey/', v.publicKey, v.privateKey);
const r = await fetch(`${url}?action=rsTick&key=${encodeURIComponent(key)}`, { redirect: 'follow' });
const d = await r.json().catch(() => ({ ok: false, error: 'HTTP ' + r.status }));
console.log(JSON.stringify({ ok: d.ok, error: d.error, surveys: d.surveys, changed: d.changed, notified: d.notified, jobs: (d.jobs || []).length }));
const gone = []; let sent = 0;
for (const j of d.jobs || []) {
  try {
    await webpush.sendNotification({ endpoint: j.ep, keys: { p256dh: j.p256dh, auth: j.auth } },
      JSON.stringify({ title: j.title, body: j.body, url: j.url, tag: j.tag }), { TTL: 86400, urgency: 'high' });
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) gone.push(j.ep);
    console.log('Không gửi được tới 1 máy:', e.statusCode || e.message);
  }
}
if (gone.length) await fetch(`${url}?action=rsPushGone&key=${encodeURIComponent(key)}&eps=${encodeURIComponent(JSON.stringify(gone))}`, { redirect: 'follow' });
const msg = `Đã gửi ${sent} thông báo · gỡ ${gone.length} máy hết hạn`;
console.log(msg);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### MMH Survey\n${msg} · ${d.changed || 0} khảo sát có câu trả lời mới\n`);
