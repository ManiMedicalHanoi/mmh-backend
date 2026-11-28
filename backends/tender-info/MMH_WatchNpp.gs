/**************************************************************************************************
 * MMH · BÁO CÁO GÓI THẦU NPP CỦA MANI ĐANG THAM DỰ (28/11/2026, người dùng yêu cầu) — MMH_WatchNpp.gs v1.0
 *
 * Gói có số TBMT trong file thầu của NPP (Hùng Vĩ · iCare, backend tender-hungvi / tender-icare ▸ winMap) còn "Pending"
 * ⇒ khi hệ thống đã tải biên bản mở thầu + HSMT ⇒ workflow "Gói thầu NPP — báo cáo mở thầu / kết quả" (tools/npp/npp_report.py)
 * phân tích, cắt ảnh bằng chứng, dựng email + PDF ⇒ gọi botNpp op=send ⇒ email gửi từ tài khoản chạy máy chủ:
 *   To = PIC địa bàn (Viet Ha: miền Bắc → hết Đà Nẵng cũ · Khang: từ Quảng Nam cũ, cùng luật Theo dõi thầu) · CC = Tuyen, Nguyen Ha, Giang.
 * Lần 2 (gói có kết quả) ⇒ op=send stage=kq trả lời TIẾP trong cùng luồng thư (GmailApp replyAll trên thư lần 1).
 *
 *   botNpp {key, op:'state'}                               ⇒ {state:{bare:{mo:{at,thread,subject,to}, kq:{at}}}, on}
 *   botNpp {key, op:'who', prov, text}                     ⇒ {to:[pic], cc:[pic], terr}  (không trả email)
 *   botNpp {key, op:'kq', no}                              ⇒ kết quả từng lô từ file tổng "Danh sách nhà thầu" + trường KQLCNT
 *   botNpp {key, op:'send', no, stage:'mo'|'kq', subject, body, html, inl:[{cid,name,mime,b64}], att:[{name,mime,b64}],
 *           prov, text, mode:'preview'|'live'}                ⇒ gửi; preview = chỉ gửi về tài khoản chạy máy chủ, tiêu đề [Xem trước], không ghi trạng thái
 *   botNpp {key, op:'on'|'off'}                            ⇒ bật / tắt gửi thật (Script Property NPPM_ON = 1)
 * Trạng thái: Script Property NPPM_<số TBMT> (JSON). Chỉ khoá bot (không cho tiện ích dùng phiên email).
 **************************************************************************************************/
const NPPM = { VER: '1.0', CC: ['Tuyen', 'Nguyen Ha', 'Giang'], TO: { N: 'Viet Ha', S: 'Khang' }, MAX_B64: 24 * 1048576 };

function nppmAction_(p) {
  const op = wtS_(p.op) || 'state', P = PropertiesService.getScriptProperties();
  if (op === 'on') { P.setProperty('NPPM_ON', '1'); return { ok: true, on: true }; }
  if (op === 'off') { P.deleteProperty('NPPM_ON'); return { ok: true, on: false }; }
  if (op === 'state') {
    const all = P.getProperties(), st = {};
    Object.keys(all).forEach(function (k) { if (/^NPPM_IB/.test(k)) st[k.slice(5)] = wtJson_(all[k], {}); });
    return { ok: true, v: NPPM.VER, on: all.NPPM_ON === '1', state: st };
  }
  if (op === 'who') return Object.assign({ ok: true }, nppmWho_(p));
  if (op === 'kq') return nppmKq_(p);
  if (op === 'send') return nppmSend_(p);
  if (op === 'sheet') {   // đọc Google Sheet bot đã tải (Nhà thầu tham dự / Danh sách nhà thầu / hàng hóa) — chỉ file thuộc 1 gói trong GÓI TÌM THẤY
    const id = wtS_(p.id); if (!id) return { ok: false, error: 'thiếu id' };
    const own = wtHits_(wtBook_()).some(function (h) { return (h.files || []).some(function (f) { return f && f.id === id; }); });
    if (!own) return { ok: false, error: 'File không thuộc gói nào đã tải.' };
    try {
      const ss = SpreadsheetApp.openById(id);
      return { ok: true, id: id, name: ss.getName(), sheets: ss.getSheets().slice(0, 3).map(function (sh) { return { name: sh.getName(), values: sh.getDataRange().getDisplayValues().slice(0, 6000) }; }) };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  }
  if (op === 'reset') { const b = wtBare_(p.no); if (!b) return { ok: false, error: 'thiếu no' }; P.deleteProperty('NPPM_' + b); return { ok: true, reset: b }; }
  return { ok: false, error: 'op không hợp lệ' };
}

/** người nhận theo địa bàn (tỉnh bệnh viện) — chỉ trả TÊN, email tra lúc gửi */
function nppmWho_(p) {
  const terr = wtrTerr_(wtS_(p.prov), wtS_(p.text)) || (/khang/i.test(wtS_(p.force)) ? 'S' : 'N');
  return { terr: terr, to: [NPPM.TO[terr] || NPPM.TO.N], cc: NPPM.CC.slice() };
}
function nppmMails_(pics) {
  const out = [];
  (pics || []).forEach(function (x) { const m = wtrMailOf_(x); if (m && out.indexOf(m) < 0) out.push(m); });
  return out;
}

/** kết quả lựa chọn nhà thầu của gói: từng lô [[nhà thầu, giá dự thầu, lý do, trúng?]] + trường KQLCNT (ngày phê duyệt, giá trúng, nhà thầu trúng) */
function nppmKq_(p) {
  const b = wtBare_(String(p.no || '').toUpperCase()); if (!b) return { ok: false, error: 'thiếu no' };
  const one = {}; one[b] = 1;
  let L = {}; try { L = wtrLose_(one)[b] || {}; } catch (e) {}
  const ss = wtBook_(), H = wtHits_(ss).filter(function (h) { return wtBare_(h.no) === b; });
  const I = Object.assign.apply(null, [{}].concat(H.map(function (h) { return h.info || {}; })));
  let kqRow = null; try { kqRow = wtLoad_(ss).kqdt.filter(function (r) { return wtBare_(r.no) === b; })[0] || null; } catch (e) {}
  const files = [].concat.apply([], H.map(function (h) { return (h.files || []).filter(Boolean).map(function (f) { return { id: f.id || '', kind: f.kind || '', name: f.name || '', sec: f.sec || '', url: f.url || '', gsheet: !!f.gsheet }; }); }));
  return { ok: true, no: b, lots: L, kqFields: I.kqFields || {}, winner: I.winner || (kqRow || {}).winner || '', win: I.win || (kqRow || {}).win || '',
    kqDate: (kqRow || {}).date || '', hasKq: !!(Object.keys(L).length || Object.keys(I.kqFields || {}).length || kqRow), files: files };
}

/** gửi email báo cáo (lần 1 = thư mới · lần 2 = trả lời trong luồng thư lần 1) */
function nppmSend_(p) {
  const b = wtBare_(String(p.no || '').toUpperCase()), stage = wtS_(p.stage) === 'kq' ? 'kq' : 'mo';
  if (!b) return { ok: false, error: 'thiếu no' };
  const P = PropertiesService.getScriptProperties(), key = 'NPPM_' + b, st = wtJson_(P.getProperty(key), {}) || {};
  const preview = wtS_(p.mode) !== 'live';
  if (!preview && P.getProperty('NPPM_ON') !== '1') return { ok: false, code: 'OFF', error: 'Chưa bật gửi thật (botNpp op=on).' };
  if (!preview && st[stage] && !wtTrue_(p.force)) return { ok: true, skip: 'đã gửi lúc ' + st[stage].at };
  if (!preview && stage === 'kq' && !(st.mo && st.mo.at)) return { ok: false, error: 'Chưa gửi thư mở thầu.' };
  const dec = function (a) { const x = typeof a === 'string' ? wtJson_(a, []) : (a || []); return Array.isArray(x) ? x : []; };
  const inl = {}, att = [];
  let size = 0;
  dec(p.inl).forEach(function (x) { if (!x || !x.b64 || !x.cid) return; size += x.b64.length; inl[x.cid] = Utilities.newBlob(Utilities.base64Decode(x.b64), x.mime || 'image/jpeg', x.name || (x.cid + '.jpg')); });
  dec(p.att).forEach(function (x) { if (!x || !x.b64) return; size += x.b64.length; att.push(Utilities.newBlob(Utilities.base64Decode(x.b64), x.mime || 'application/pdf', x.name || 'bao-cao.pdf')); });
  if (size > NPPM.MAX_B64) return { ok: false, error: 'Ảnh + file đính kèm quá lớn.' };
  const who = nppmWho_(p), me = Session.getEffectiveUser().getEmail();
  let to = preview ? [me] : nppmMails_(who.to), cc = preview ? [] : nppmMails_(who.cc).filter(function (m) { return to.indexOf(m) < 0; });
  if (!to.length) return { ok: false, error: 'Không tra được email người nhận ' + who.to.join(', ') };
  to = mmhAddr_(to); cc = mmhAddr_(cc);
  const subject = (preview ? '[Xem trước] ' : '') + wtS_(p.subject);
  const opt = { htmlBody: wtS_(p.html), inlineImages: inl, attachments: att, name: CFG.EMAIL_FROM_NAME };
  if (cc.length) opt.cc = cc.join(',');
  const body = wtS_(p.body) || 'Vui lòng xem email ở chế độ HTML.';
  let thread = '', replied = false;
  if (stage === 'kq' && st.mo && st.mo.thread && !preview) {
    try {
      const th = GmailApp.getThreadById(st.mo.thread);
      const ms = th ? th.getMessages() : [];
      if (ms.length) {
        const last = ms[ms.length - 1];
        const ro = { htmlBody: opt.htmlBody, inlineImages: inl, attachments: att, name: opt.name };
        if (cc.length) ro.cc = cc.join(',');
        last.replyAll(body, ro); replied = true; thread = st.mo.thread;
      }
    } catch (e) { Logger.log('nppm reply: ' + e.message); }
  }
  if (!replied) {
    const subj = stage === 'kq' && st.mo && st.mo.subject && !preview ? 'RE: ' + st.mo.subject : subject;
    mmhGmail_(Object.assign({ to: to.join(','), subject: subj, body: body }, opt));   // GmailApp (để tìm lại luồng thư) qua lớp chung: đổi miền @mani.inc, TEST, hạn mức
    if (stage === 'mo' || !thread) {
      Utilities.sleep(1500);
      try {
        const q = 'in:sent subject:"' + subj.replace(/"/g, '') + '" newer_than:1d';
        const th = GmailApp.search(q, 0, 1)[0]; if (th) thread = th.getId();
      } catch (e) { Logger.log('nppm thread: ' + e.message); }
    }
  }
  const rec = { at: wtNow_(), thread: thread, subject: wtS_(p.subject), to: who.to.join(', '), cc: who.cc.join(', '), replied: replied };
  if (!preview) { st[stage] = rec; P.setProperty(key, JSON.stringify(st)); }
  return { ok: true, no: b, stage: stage, preview: preview, to: preview ? 'tài khoản chạy máy chủ' : who.to.join(', '), cc: preview ? '' : who.cc.join(', '), thread: thread, replied: replied };
}
