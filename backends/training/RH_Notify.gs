/**
 * ============================================================================
 *  ★ v3.38 (02/11/2026) — HỘP THÔNG BÁO CHUNG (sheet RH_Notify trong Training Master)
 * ----------------------------------------------------------------------------
 *  App khác ghi thông báo cho từng PIC (hiện có: app "Sự kiện MKT" — backend marketing ▸ MKT_EventHubPlus.gs ghi
 *  THẲNG vào sheet này bằng SpreadsheetApp khi có người được @nhắc tên, được giao việc, có việc chờ duyệt / bị trả lại…).
 *  Report Hub + CRM đọc để hiện nút chuông "Thông báo" (mỗi người chỉ thấy thông báo của mình, bấm ⇒ mở đúng việc ở app nguồn).
 *  Cột: Id · At · To (PIC) · App (event…) · Kind (mention, assign, review, return, comment, remind, team, note) · Title · Text · Url · By ·
 *       EventId · TaskId · SeenAt
 *  API (danh tính như RH_Assign: phiên email tk, hoặc khoá cầu nối + actor):
 *    rhNotifyList  ⇒ {items (60 ngày gần nhất, mới trước, ≤ 80), unseen}
 *    rhNotifySeen  ids = "a,b,c" | all=1 ⇒ ghi SeenAt
 * ============================================================================
 */
var RH_NOTIFY = {
  SHEET: 'RH_Notify',
  HEADER: ['Id', 'At', 'To', 'App', 'Kind', 'Title', 'Text', 'Url', 'By', 'EventId', 'TaskId', 'SeenAt'],
  KEEP_DAYS: 60, MAX: 80
};
function rhnSheet_() { return hubEnsureHeader(hubSheet(RH_NOTIFY.SHEET, true), RH_NOTIFY.HEADER); }
function rhnRead_() {
  var sh = rhnSheet_(), last = sh.getLastRow(); if (last < 2) return [];
  var V = sh.getRange(2, 1, last - 1, RH_NOTIFY.HEADER.length).getValues(), out = [];
  for (var i = 0; i < V.length; i++) {
    var r = V[i]; if (!hubNorm(r[0])) continue;
    out.push({ row: i + 2, id: hubNorm(r[0]), at: rhaIso(r[1]), to: hubNorm(r[2]), app: hubNorm(r[3]) || 'event', kind: hubNorm(r[4]), title: hubNorm(r[5]),
               text: hubNorm(r[6]), url: hubNorm(r[7]), by: hubNorm(r[8]), eventId: hubNorm(r[9]), taskId: hubNorm(r[10]), seenAt: rhaIso(r[11]) });
  }
  return out;
}
function apiRhNotifyList(p) {
  var me = rhaActor(p), cut = new Date(Date.now() - RH_NOTIFY.KEEP_DAYS * 86400000);
  var mine = rhnRead_().filter(function(n){ var d = new Date(n.at); return rhaSame(n.to, me.pic) && (isNaN(d.getTime()) || d >= cut); })
    .sort(function(a, b){ return a.at < b.at ? 1 : -1; }).slice(0, RH_NOTIFY.MAX)
    .map(function(n){ return { id: n.id, at: n.at, app: n.app, kind: n.kind, title: n.title, text: n.text, url: n.url, by: n.by, seen: !!n.seenAt }; });
  return { ok: true, items: mine, unseen: mine.filter(function(n){ return !n.seen; }).length };
}
function apiRhNotifySeen(p) {
  var me = rhaActor(p), all = String(p.all || '') === '1', ids = all ? [] : rhaIds(p), sh = rhnSheet_(), now = new Date(), n = 0;
  rhnRead_().forEach(function(x){
    if (x.seenAt || !rhaSame(x.to, me.pic) || (!all && ids.indexOf(x.id) < 0)) return;
    sh.getRange(x.row, 12).setValue(now); n++;
  });
  return { ok: true, marked: n };
}
