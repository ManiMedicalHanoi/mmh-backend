/* ════════════════════════════════════════════════════════════════════
   MMH_WatchAgent.gs v1.0 (18/11/2026, người dùng yêu cầu) — MÁY TÍNH TỰ TẢI FILE "CẦN AGENT" RỒI ĐƯA LÊN DRIVE
   File đính kèm muasamcong (QĐ phê duyệt, Báo cáo đánh giá, HSMT, Biên bản mở thầu…) chỉ tải được qua VNeGP Client Agent
   (http://localhost:1234) trên máy tính đã cài Agent ⇒ bot GitHub chỉ ghi tên + fileId vào info.agentFiles.
   Chương trình chạy ngầm trên máy người dùng (Tender-Result/theo-doi/agent/agent_worker.py, khoá bot WT_BOT_KEY) hỏi việc mỗi 2 phút:
     botAgentList {key, worker, agent: 1|0}  ⇒ { items: [{hit, no, inv, url, files: [{name, fileId, tab, type, tries}]}] }
       (file chưa done, thử < WTA.MAX_TRY lần; ghi WT_AGW_SEEN / WT_AGW_NAME / WT_AGW_AGENT để app hiện "Máy tải Agent: đang bật")
     botAgentPut  {key, hit, orig, name, mime, b64}  ⇒ lưu như wUpload (đúng thư mục + tên chuẩn + Sheet tổng hợp, đánh dấu done)
     botAgentPut  {key, hit, orig, err}              ⇒ ghi lỗi (tries + 1, lastErr) — quá WTA.MAX_TRY ⇒ không đưa lại (app vẫn có nút Thêm file)
   Máy tính xoá file tạm ngay sau khi tải lên (không lưu lại trên máy).
   ════════════════════════════════════════════════════════════════════ */
const WTA = { MAX_TRY: 4, MAX_ITEMS: 25, SEC: { tbmt: 'tbmt', mo: 'mo', kq: 'kq', kh: 'kh' } };

function wtaSeen_(p) {
  const P = PropertiesService.getScriptProperties();
  P.setProperty('WT_AGW_SEEN', wtNow_());
  if (wtS_(p.worker)) P.setProperty('WT_AGW_NAME', wtS_(p.worker).slice(0, 60));
  if (wtS_(p.agent) !== '') P.setProperty('WT_AGW_AGENT', wtTrue_(p.agent) ? '1' : '0');
}
function wtaStatus_() {
  const P = PropertiesService.getScriptProperties();
  return { seen: P.getProperty('WT_AGW_SEEN') || '', name: P.getProperty('WT_AGW_NAME') || '', agent: P.getProperty('WT_AGW_AGENT') || '', last: JSON.parse(P.getProperty('WT_AGW_LAST') || 'null') };
}

function wtaList_(p) {
  wtaSeen_(p);
  const items = [];
  let n = 0;
  wtHits_(wtBook_()).forEach(function (h) {
    if (n >= WTA.MAX_ITEMS || h.status === WT.ST.WORK) return;
    const I = h.info || {}, fs = (I.agentFiles || []).filter(function (a) { return a && typeof a === 'object' && !a.done && a.fileId && (+a.tries || 0) < WTA.MAX_TRY; });
    if (!fs.length) return;
    items.push({ hit: h.key, no: h.no, inv: h.investor, url: wtS_(I.url), files: fs.map(function (a) { return { name: a.name, fileId: a.fileId, tab: a.tab || '', type: a.type || '', tries: +a.tries || 0 }; }) });
    n += fs.length;
  });
  return { ok: true, items: items, n: n };
}

function wtaPut_(p) {
  wtaSeen_(p);
  const key = wtS_(p.hit), orig = wtS_(p.orig);
  const ss = wtBook_(), h = wtHits_(ss).filter(function (x) { return x.key === key; })[0];
  if (!h) return { ok: false, error: 'Không tìm thấy gói ' + key };
  const a = ((h.info || {}).agentFiles || []).filter(function (x) { return x && x.name === orig; })[0];
  if (!a) return { ok: false, error: 'Gói không có tài liệu "' + orig + '"' };
  if (a.done) return { ok: true, already: true };
  const P = PropertiesService.getScriptProperties();
  if (wtS_(p.err) || !wtS_(p.b64)) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận.' };
    try {
      const cur = wtHits_(ss).filter(function (x) { return x.key === key; })[0], info = Object.assign({}, cur.info);
      info.agentFiles = (info.agentFiles || []).map(function (x) { return x && x.name === orig ? Object.assign({}, x, { tries: (+x.tries || 0) + 1, lastErr: wtS_(p.err).slice(0, 200) || 'không có dữ liệu', at: wtNow_() }) : x; });
      wtSheet_(ss, WT.SH_H, WT.HH).getRange(cur.row, 7).setValue(JSON.stringify(info));
    } finally { lock.releaseLock(); }
    P.setProperty('WT_AGW_LAST', JSON.stringify({ at: wtNow_(), no: h.no, name: orig, ok: false, err: wtS_(p.err).slice(0, 160) }));
    wtBotLog_(ss, 'Máy tải Agent · ' + wtS_(p.worker || P.getProperty('WT_AGW_NAME')), key, 'agent', 'lỗi', orig + ': ' + wtS_(p.err).slice(0, 160));
    return { ok: true, recorded: true };
  }
  const docType = wtS_(a.type) || wtS_(orig).replace(/\.[a-z0-9]{2,5}$/i, '');
  const sec = WTA.SEC[wtS_(a.tab)] || '';
  const r = wtdUpload_({ boss: true, pic: 'Máy tải Agent', local: '' }, { key: key, b64: p.b64, name: wtS_(p.name) || orig, docType: docType, sec: sec, orig: orig, mime: wtS_(p.mime) });
  if (r && r.ok) P.setProperty('WT_AGW_LAST', JSON.stringify({ at: wtNow_(), no: h.no, name: r.name, ok: true }));
  return r;
}
