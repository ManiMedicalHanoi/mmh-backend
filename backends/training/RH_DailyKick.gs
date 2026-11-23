/* ════════════════════════════════════════════════════════════════════
   RH_DailyKick.gs — TỰ TẠO SỐ MMH DAILY PODCAST ĐÚNG GIỜ (24/11/2026, HUB v3.49)
   Lịch cron của GitHub (daily.yml, hẹn 05:45 giờ VN) chạy trễ 4–5 giờ (thực tế 10:00–11:50) ⇒ sáng mở app vẫn là số hôm qua.
   Trigger hwWarm (5 phút / lần, chạy đúng giờ) gọi dkTick_: 05:40–11:00 giờ VN, nếu data/index.json của kho MMH-Daily chưa có số HÔM NAY
   và GitHub không có lượt daily.yml nào đang chạy / chờ ⇒ workflow_dispatch (kind=daily, by="Tự động lúc sáng"), tối đa 3 lần / ngày, cách nhau ≥ 25 phút.
   Workflow có chốt: lượt cron trễ thấy đã có số hôm nay ⇒ bỏ qua (không tạo trùng, không tốn ElevenLabs).
   Token: DAILY_GH_TOKEN (RH_DailyRun.gs). Kết quả lượt cuối: Script Property DK_LAST (trả trong dailyStatus ▸ auto).
   ════════════════════════════════════════════════════════════════════ */
var DK = { FROM: '05:40', TO: '11:00', MAX: 3, GAP_MIN: 25,
  INDEX: 'https://raw.githubusercontent.com/ManiMedicalHanoi/MMH-Daily/main/data/index.json' };
function dkTick_() {
  var P = PropertiesService.getScriptProperties(), now = new Date();
  var hm = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'HH:mm'), today = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  if (hm < DK.FROM || hm > DK.TO) return { skip: 'ngoài giờ' };
  if (P.getProperty('DK_DONE') === today) return { skip: 'đã có số hôm nay' };
  var st = {}; try { st = JSON.parse(P.getProperty('DK_STATE') || '{}'); } catch (e) {}
  if (st.date !== today) st = { date: today, n: 0, at: 0 };
  var out = { at: Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') };
  try {
    var r = UrlFetchApp.fetch(DK.INDEX + '?t=' + now.getTime(), { muteHttpExceptions: true }), j = null;
    try { j = JSON.parse(r.getContentText()); } catch (e) {}
    var last = j && j.editions && j.editions[0] && j.editions[0].date;
    out.last = last || '?';
    if (last === today) { P.setProperty('DK_DONE', today); out.skip = 'đã có số hôm nay'; }
    else if (!P.getProperty('DAILY_GH_TOKEN')) out.skip = 'chưa có token GitHub (Admin ▸ Tổng hợp ngay ▸ Thiết lập)';
    else if (st.n >= DK.MAX) out.skip = 'đã gọi ' + st.n + ' lần hôm nay';
    else if (now.getTime() - st.at < DK.GAP_MIN * 60e3) out.skip = 'vừa gọi, chờ lượt đang chạy';
    else {
      var busy = 0;
      ['in_progress', 'queued'].forEach(function (s) { var g = drGh_('get', '/actions/workflows/' + DR.WF + '/runs?per_page=1&status=' + s); if (g.code === 200 && g.json) busy += +g.json.total_count || 0; else out.err = 'GitHub ' + g.code; });
      if (out.err) out.skip = out.err;
      else if (busy) out.skip = 'GitHub đang chạy một lượt';
      else {
        var d = drGh_('post', '/actions/workflows/' + DR.WF + '/dispatches', { ref: 'main', inputs: { kind: 'daily', by: 'Tự động lúc sáng' } });
        out.kick = d.code;
        if (d.code === 204) { st.n++; st.at = now.getTime(); } else out.skip = 'không gọi được workflow (' + d.code + ')';
      }
    }
  } catch (e) { out.skip = 'lỗi: ' + String(e.message || e).slice(0, 160); }
  P.setProperty('DK_STATE', JSON.stringify(st));
  P.setProperty('DK_LAST', JSON.stringify(out));
  return out;
}
