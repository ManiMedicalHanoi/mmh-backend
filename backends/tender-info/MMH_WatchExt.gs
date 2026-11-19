/* ════════════════════════════════════════════════════════════════════
   MMH_WatchExt.gs v1.0 (19/11/2026, người dùng: bộ cài máy Agent (.bat + Python) bị Kaspersky chặn là mã độc, cài phức tạp)
   TIỆN ÍCH CHROME / EDGE "MMH Tải hồ sơ thầu" (Tender-Result/theo-doi/tien-ich/) thay máy tải Python + bot cần token GitHub:
   - Không cài chương trình, không khoá bot: tiện ích lấy PHIÊN EMAIL (mmh_tk) khi người dùng mở app Theo dõi gói thầu.
   - Mỗi phút hỏi botHello ⇒ có gói Chờ tải ⇒ mở muasamcong trong 1 cửa sổ thu nhỏ của chính trình duyệt, làm đúng như bot GitHub
     (botNext ⇒ botFile ⇒ botDone); VNeGP Client Agent đang chạy ⇒ tải luôn file "cần Agent" (trang muasamcong gọi Agent như người bấm),
     và tải nốt file "cần Agent" của gói cũ (botAgentList ⇒ botAgentPut).
   Lệnh được dùng bằng phiên email: WTX.ACTIONS (không có botRequeue / botMerge / botNames…). Tên trong nhật ký: "Tiện ích · <PIC>".
   Trạng thái từng máy: Script Property WT_EXT = { "<tên>": {at, agent, v, job} } ⇒ wBoot.ext.
   ════════════════════════════════════════════════════════════════════ */
const WTX = { ACTIONS: ['botHello', 'botNext', 'botFile', 'botDone', 'botAgentList', 'botAgentPut'], KEEP_MIN: 60 * 24 * 14 };

function wtxName_(me, p) {
  const dev = wtS_(p.dev).replace(/[^\w .\-À-ỹ]/g, '').slice(0, 24);
  return ('Tiện ích · ' + (me.pic || me.local) + (dev ? ' (' + dev + ')' : '')).slice(0, 60);
}

/** nhịp tim của tiện ích (mỗi 1–2 phút): ghi trạng thái máy + trả số việc đang chờ */
function wtxHello_(p) {
  const P = PropertiesService.getScriptProperties(), name = wtS_(p.bot), now = wtNow_();
  let all = {};
  try { all = JSON.parse(P.getProperty('WT_EXT') || '{}') || {}; } catch (e) { all = {}; }
  Object.keys(all).forEach(function (k) { if (wtaAge_(all[k].at) > WTX.KEEP_MIN) delete all[k]; });
  all[name] = { at: now, agent: wtTrue_(p.agent) ? 1 : 0, v: wtS_(p.v).slice(0, 10), job: wtS_(p.job).slice(0, 80) };
  P.setProperty('WT_EXT', JSON.stringify(all));
  if (wtTrue_(p.agent)) wtaSeen_({ worker: name, agent: 1 });   // app cũ đọc boot.agw
  const c = CacheService.getScriptCache();
  let q = null;
  try { q = JSON.parse(c.get('wtx_q') || 'null'); } catch (e) {}
  if (!q) {
    const H = wtHits_(wtBook_());
    let ag = 0;
    H.forEach(function (h) { ((h.info || {}).agentFiles || []).forEach(function (a) { if (a && typeof a === 'object' && !a.done && a.fileId && (+a.tries || 0) < WTA.MAX_TRY) ag++; }); });
    q = { n: wtBotEligible_(H).length, ag: ag };
    try { c.put('wtx_q', JSON.stringify(q), 30); } catch (e) {}
  }
  return { ok: true, v: WT.VER, n: q.n, ag: q.ag, me: (p._ext || {}).pic || '' };
}

/** cho app: các máy đang bật tiện ích (≤ 3 phút) */
function wtxStatus_() {
  let all = {};
  try { all = JSON.parse(PropertiesService.getScriptProperties().getProperty('WT_EXT') || '{}') || {}; } catch (e) {}
  return Object.keys(all).map(function (k) { const x = all[k]; return { name: k, at: x.at, min: Math.round(wtaAge_(x.at)), agent: !!x.agent, v: x.v || '', job: x.job || '' }; })
    .sort(function (a, b) { return a.min - b.min; });
}
