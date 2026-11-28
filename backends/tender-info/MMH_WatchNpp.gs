/**************************************************************************************************
 * MMH · BÁO CÁO GÓI THẦU NPP CỦA MANI ĐANG THAM DỰ (28/11/2026, người dùng yêu cầu) — MMH_WatchNpp.gs v1.3
 *
 * ⭐ v1.3 (28/11/2026, người dùng yêu cầu): email thầu CHỈ gửi từ hộp thư mmh.notify@gmail.com (GitHub SMTP: op=prep ⇒ gửi ⇒ op=mark).
 *   op=send (gửi bằng tài khoản chạy máy chủ mmh.product) bị TẮT — chỉ mở lại khi Script Property NPPM_PRODUCT = 1.
 * ⭐ v1.4 (28/11/2026, người dùng yêu cầu): gói NPP đang Pending được ƯU TIÊN tải hồ sơ trước mọi gói khác —
 *   botNpp {key, op:'queue', no, want:'tbmt,hsmt,mo'|'kq,nt,hh', hold:giờ} ⇒ dòng GÓI TÌM THẤY của gói: info.pri = -1 (bot lấy trước, wtBotNext_), info.npp = 1,
 *   vào hàng đợi với đúng loại tài liệu còn thiếu; mỗi gói + bộ tài liệu chỉ đặt lại sau `hold` giờ (mặc định 6) ⇒ trả {queued, why}.
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
 *           testTo = tên PIC (vd. Giang) ⇒ CHỈ gửi người đó, tiêu đề [Thử], trạng thái riêng NPPMT_<số> (thử cả luồng trả lời), không cần NPPM_ON
 *   botNpp {key, op:'on'|'off'}                            ⇒ bật / tắt gửi thật (Script Property NPPM_ON = 1)
 *   botNpp {key, op:'wkstate', wk, test}                    ⇒ {sent, seen}: tuần đã gửi chưa + dấu kết quả các gói lần gửi thật trước (tools/npp/npp_weekly.py)
 *   botNpp {key, op:'send', stage:'wk', wk:'yyyy-mm-dd', …, seen} ⇒ email tổng hợp tuần: To Viet Ha + Khang · CC như trên; live ⇒ lưu `seen`
 *   botNpp {key, op:'prep', …như send, không có nội dung}  ⇒ {to, cc, me, reply:{msgId, subject}} — v1.2: thư gửi bằng mmh.notify (SMTP, GitHub) thay mmh.product
 *   botNpp {key, op:'mark', …, msgId, subject}             ⇒ ghi đã gửi (như send)
 * Trạng thái: Script Property NPPM_<số TBMT> (JSON), tuần: NPPM_W<thứ Bảy đầu tuần>, dấu kết quả: NPPMW_SEEN_<n>. Chỉ khoá bot (không cho tiện ích dùng phiên email).
 **************************************************************************************************/
const NPPM = { VER: '1.4', CC: ['Tuyen', 'Nguyen Ha', 'Giang'], TO: { N: 'Viet Ha', S: 'Khang' }, MAX_B64: 24 * 1048576 };

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
  if (op === 'quota') { let q = -1; try { q = MailApp.getRemainingDailyQuota(); } catch (e) {} return { ok: true, quota: q }; }
  if (op === 'kq') return nppmKq_(p);
  if (op === 'send') return nppmSend_(p);
  if (op === 'prep') return nppmPrep_(p);
  if (op === 'mark') return nppmMark_(p);
  if (op === 'queue') return nppmQueue_(p);
  if (op === 'wkstate') {
    const wk = wtS_(p.wk); if (!/^\d{4}-\d{2}-\d{2}$/.test(wk)) return { ok: false, error: 'thiếu wk' };
    const st = wtJson_(P.getProperty((wtS_(p.test) ? 'NPPMT_W' : 'NPPM_W') + wk), {}) || {};
    return { ok: true, wk: wk, sent: st.wk || null, seen: nppmSeenGet_(P) };
  }
  if (op === 'sheet') {   // đọc Google Sheet bot đã tải (Nhà thầu tham dự / Danh sách nhà thầu / hàng hóa) — chỉ file thuộc 1 gói trong GÓI TÌM THẤY
    const id = wtS_(p.id); if (!id) return { ok: false, error: 'thiếu id' };
    const own = wtHits_(wtBook_()).some(function (h) { return (h.files || []).some(function (f) { return f && f.id === id; }); });
    if (!own) return { ok: false, error: 'File không thuộc gói nào đã tải.' };
    try {
      const ss = SpreadsheetApp.openById(id);
      return { ok: true, id: id, name: ss.getName(), sheets: ss.getSheets().slice(0, 3).map(function (sh) { return { name: sh.getName(), values: sh.getDataRange().getDisplayValues().slice(0, 6000) }; }) };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  }
  if (op === 'reset') { const b = wtBare_(p.no); if (!b) return { ok: false, error: 'thiếu no' }; P.deleteProperty((wtS_(p.testTo) ? 'NPPMT_' : 'NPPM_') + b); return { ok: true, reset: b }; }
  return { ok: false, error: 'op không hợp lệ' };
}

/** dấu kết quả các gói (chuỗi "mã:dấu,…") — chia mảnh ≤ 8.000 ký tự / Script Property */
function nppmSeenGet_(P) {
  let s = '', i = 0, x;
  while ((x = P.getProperty('NPPMW_SEEN_' + i)) !== null && i < 40) { s += x; i++; }
  return i ? s : null;
}
function nppmSeenSet_(P, s) {
  let i = 0;
  for (; i * 8000 < s.length; i++) P.setProperty('NPPMW_SEEN_' + i, s.slice(i * 8000, (i + 1) * 8000));
  if (!s.length) { P.setProperty('NPPMW_SEEN_0', ''); i = 1; }
  for (let j = i; P.getProperty('NPPMW_SEEN_' + j) !== null && j < 40; j++) P.deleteProperty('NPPMW_SEEN_' + j);
}

/** người nhận theo địa bàn (tỉnh bệnh viện) — chỉ trả TÊN, email tra lúc gửi */
function nppmWho_(p) {
  if (wtS_(p.stage) === 'wk') return { terr: 'NS', to: [NPPM.TO.N, NPPM.TO.S], cc: NPPM.CC.slice() };
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
  if (PropertiesService.getScriptProperties().getProperty('NPPM_PRODUCT') !== '1')
    return { ok: false, code: 'NOTIFY_ONLY', error: 'Email thầu chỉ gửi bằng hộp thư mmh.notify (op=prep / op=mark), không gửi bằng tài khoản máy chủ.' };
  const wk = wtS_(p.stage) === 'wk' ? wtS_(p.wk) : '';
  if (wtS_(p.stage) === 'wk' && !/^\d{4}-\d{2}-\d{2}$/.test(wk)) return { ok: false, error: 'thiếu wk' };
  const b = wk ? 'W' + wk : wtBare_(String(p.no || '').toUpperCase()), stage = wk ? 'wk' : wtS_(p.stage) === 'kq' ? 'kq' : 'mo';
  if (!b) return { ok: false, error: 'thiếu no' };
  const testTo = wtS_(p.testTo);
  const P = PropertiesService.getScriptProperties(), key = (testTo ? 'NPPMT_' : 'NPPM_') + b, st = wtJson_(P.getProperty(key), {}) || {};
  const preview = !testTo && wtS_(p.mode) !== 'live';
  if (!preview && !testTo && P.getProperty('NPPM_ON') !== '1') return { ok: false, code: 'OFF', error: 'Chưa bật gửi thật (botNpp op=on).' };
  if (!preview && st[stage] && !wtTrue_(p.force)) return { ok: true, skip: 'đã gửi lúc ' + st[stage].at };
  if (stage === 'mo' && st.mo && wtTrue_(p.force)) delete st.kq;
  if (!preview && stage === 'kq' && !(st.mo && st.mo.at)) return { ok: false, error: 'Chưa gửi thư mở thầu.' };
  const dec = function (a) { const x = typeof a === 'string' ? wtJson_(a, []) : (a || []); return Array.isArray(x) ? x : []; };
  const inl = {}, att = [];
  let size = 0;
  dec(p.inl).forEach(function (x) { if (!x || !x.b64 || !x.cid) return; size += x.b64.length; inl[x.cid] = Utilities.newBlob(Utilities.base64Decode(x.b64), x.mime || 'image/jpeg', x.name || (x.cid + '.jpg')); });
  dec(p.att).forEach(function (x) { if (!x || !x.b64) return; size += x.b64.length; att.push(Utilities.newBlob(Utilities.base64Decode(x.b64), x.mime || 'application/pdf', x.name || 'bao-cao.pdf')); });
  if (size > NPPM.MAX_B64) return { ok: false, error: 'Ảnh + file đính kèm quá lớn.' };
  const who = nppmWho_(p), me = Session.getEffectiveUser().getEmail();
  let to = preview ? [me] : testTo ? nppmMails_([testTo]) : nppmMails_(who.to), cc = preview || testTo ? [] : nppmMails_(who.cc).filter(function (m) { return to.indexOf(m) < 0; });
  if (!to.length) return { ok: false, error: 'Không tra được email người nhận ' + who.to.join(', ') };
  to = mmhAddr_(to); cc = mmhAddr_(cc);
  const subject = (preview ? '[Xem trước] ' : testTo ? '[Thử] ' : '') + wtS_(p.subject);
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
    let q0 = -1; try { q0 = MailApp.getRemainingDailyQuota(); } catch (_q) {}
    try { mmhGmail_(Object.assign({ to: to.join(','), subject: subj, body: body }, opt)); }   // GmailApp (để tìm lại luồng thư) qua lớp chung: đổi miền @mani.inc, TEST, hạn mức
    catch (e) { return { ok: false, error: String(e.message || e), quota: q0, htmlKB: Math.round(opt.htmlBody.length / 1024), fileKB: Math.round(size * 0.75 / 1024), images: Object.keys(inl).length }; }
    if (stage === 'mo' || !thread) {
      Utilities.sleep(1500);
      try {
        const q = 'in:sent subject:"' + subj.replace(/"/g, '') + '" newer_than:1d';
        const th = GmailApp.search(q, 0, 1)[0]; if (th) thread = th.getId();
      } catch (e) { Logger.log('nppm thread: ' + e.message); }
    }
  }
  const rec = { at: wtNow_(), thread: thread, subject: (testTo ? '[Thử] ' : '') + wtS_(p.subject), to: testTo || who.to.join(', '), cc: testTo ? '' : who.cc.join(', '), replied: replied };
  if (!preview) { st[stage] = rec; P.setProperty(key, JSON.stringify(st)); }
  if (wk && !preview && !testTo && typeof p.seen === 'string') nppmSeenSet_(P, p.seen);
  return { ok: true, no: b, stage: stage, preview: preview, test: !!testTo, to: preview ? 'tài khoản chạy máy chủ' : testTo || who.to.join(', '), cc: preview || testTo ? '' : who.cc.join(', '), wouldTo: who.to.join(', '), wouldCc: who.cc.join(', '), thread: thread, replied: replied };
}

/* ⭐ v1.2 (28/11/2026, người dùng yêu cầu: gửi từ mmh.notify cho đỡ quá tải mmh.product) — GitHub gửi qua SMTP mmh.notify;
   máy chủ chỉ kiểm điều kiện + tra email người nhận (đã đổi miền @mani.inc) + ghi trạng thái. Lỗi SMTP ⇒ GitHub gửi lại qua op=send (mmh.product). */
function nppmCtx_(p) {
  const wk = wtS_(p.stage) === 'wk' ? wtS_(p.wk) : '';
  if (wtS_(p.stage) === 'wk' && !/^\d{4}-\d{2}-\d{2}$/.test(wk)) return { err: 'thiếu wk' };
  const b = wk ? 'W' + wk : wtBare_(String(p.no || '').toUpperCase()), stage = wk ? 'wk' : wtS_(p.stage) === 'kq' ? 'kq' : 'mo';
  if (!b) return { err: 'thiếu no' };
  const testTo = wtS_(p.testTo), P = PropertiesService.getScriptProperties(), key = (testTo ? 'NPPMT_' : 'NPPM_') + b;
  return { b: b, stage: stage, testTo: testTo, P: P, key: key, st: wtJson_(P.getProperty(key), {}) || {}, preview: !testTo && wtS_(p.mode) !== 'live' };
}
function nppmPrep_(p) {
  const c = nppmCtx_(p); if (c.err) return { ok: false, error: c.err };
  if (!c.preview && !c.testTo && c.P.getProperty('NPPM_ON') !== '1') return { ok: false, code: 'OFF', error: 'Chưa bật gửi thật (botNpp op=on).' };
  if (!c.preview && c.st[c.stage] && !wtTrue_(p.force)) return { ok: true, skip: 'đã gửi lúc ' + c.st[c.stage].at };
  if (!c.preview && c.stage === 'kq' && !(c.st.mo && c.st.mo.at)) return { ok: false, error: 'Chưa gửi thư mở thầu.' };
  const who = nppmWho_(p);
  let me = ''; try { me = Session.getEffectiveUser().getEmail(); } catch (e) {}
  let to = c.preview ? [me] : c.testTo ? nppmMails_([c.testTo]) : nppmMails_(who.to);
  let cc = c.preview || c.testTo ? [] : nppmMails_(who.cc).filter(function (m) { return to.indexOf(m) < 0; });
  to = mmhAddr_(to.filter(Boolean)); cc = mmhAddr_(cc);
  if (!to.length) return { ok: false, error: 'Không tra được email người nhận ' + who.to.join(', ') };
  const mo = c.st.mo || {};
  return { ok: true, stage: c.stage, preview: c.preview, test: !!c.testTo, to: to, cc: cc, toNames: c.testTo ? [c.testTo] : who.to, ccNames: c.testTo || c.preview ? [] : who.cc,
    reply: c.stage === 'kq' && !c.preview ? { msgId: mo.msgId || '', subject: mo.subject || '' } : null };
}
function nppmMark_(p) {
  const c = nppmCtx_(p); if (c.err) return { ok: false, error: c.err };
  if (c.preview) return { ok: true, preview: true };
  const who = nppmWho_(p);
  if (c.stage === 'mo' && c.st.mo && wtTrue_(p.force)) delete c.st.kq;
  c.st[c.stage] = { at: wtNow_(), msgId: wtS_(p.msgId), subject: (c.testTo ? '[Thử] ' : '') + wtS_(p.subject), to: c.testTo || who.to.join(', '), cc: c.testTo ? '' : who.cc.join(', '), via: 'notify', replied: !!wtS_(p.replied) };
  c.P.setProperty(c.key, JSON.stringify(c.st));
  if (c.stage === 'wk' && !c.testTo && typeof p.seen === 'string') nppmSeenSet_(c.P, p.seen);
  return { ok: true, stage: c.stage, rec: c.st[c.stage] };
}

/* ⭐ v1.4 — gói NPP Pending: đưa lên ĐẦU hàng đợi tải (info.pri = -1), chỉ loại tài liệu còn thiếu */
function nppmQueue_(p) {
  const b = wtBare_(String(p.no || '').toUpperCase()); if (!/^IB\d{8,12}$/.test(b)) return { ok: false, error: 'thiếu no (IB…)' };
  const want = wtWant_(p.want), hold = Math.min(48, Math.max(1, Number(p.hold) || 6));
  const c = CacheService.getScriptCache(), ck = 'nppmQ:' + b + ':' + want.join(',');
  if (c.get(ck) && !wtTrue_(p.force)) return { ok: true, no: b, queued: false, why: 'đã đặt tải lúc ' + c.get(ck) };
  const lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) return { ok: false, error: 'busy' };
  let why = '';
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH);
    const H = wtHits_(ss).filter(function (h) { return wtBare_(h.no) === b; });
    const h = H.filter(function (x) { return x.type === 'tbmt'; })[0] || H[0];
    const me = { mail: '', pic: 'Gói thầu NPP' };
    if (!h) {
      sh.appendRow(['n:' + b, 'tbmt', b, '(đang tra)', '', b, wtInfoWant_({ quick: 1, by: me.pic, pri: -1, npp: 1 }, want), '', wtNow_(), '', WT.ST.WAIT, '[]', 0, '', '', '', 'gói thầu NPP']);
      why = 'thêm mới';
    } else {
      h.info = Object.assign({}, h.info || {}, { pri: -1, npp: 1 });
      const r = wtReq_(sh, h, me, want, true, true);
      why = r.skip === 'work' ? 'đang tải' : r.skip === 'wait' ? 'đã trong hàng đợi (đưa lên đầu)' : 'vào hàng đợi';
      if (r.skip === 'work') return { ok: true, no: b, queued: false, why: why };
    }
    c.put(ck, Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm dd/MM'), hold * 3600);
    try { c.remove('wt_q'); } catch (e) {}
  } finally { lock.releaseLock(); }
  return { ok: true, no: b, queued: true, why: why, want: want };
}
