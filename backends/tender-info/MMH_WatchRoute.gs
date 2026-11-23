/* ════════════════════════════════════════════════════════════════════
   MMH_WatchRoute.gs v1.0 (23/11/2026, người dùng yêu cầu) — BÁO CÁO THẦU BUỔI SÁNG THEO PIC + EMAIL 1 GÓI ĐỦ 4 BƯỚC

   ① NGƯỜI NHẬN = PIC phụ trách địa bàn, theo NHÓM SẢN PHẨM (WTR.PEOPLE):
      Nha khoa — Viet: Miền Bắc · Vinh: Miền Trung · Phuong: Miền Nam (miền theo WTD_REGION).
      Ngoại khoa & Nhãn khoa — Viet Ha: miền Bắc → hết Đà Nẵng cũ · Khang: từ Quảng Nam cũ trở vào (như Theo dõi thầu của CRM Surgical).
      Mỗi người nhận MỌI chủ đầu tư trong địa bàn (bệnh viện, trung tâm y tế, sở y tế… — chia theo TỈNH của tin thầu, không cần khớp tên)
      + chủ đầu tư ngoài địa bàn mà chính họ thêm trong app Theo dõi gói thầu (mục theo dõi = "add-on"). Email tra RH_Users theo tên PIC
      (đổi người / email: Script Property WTR_TO = {"Viet":"…@…"}). Chỉ báo sản phẩm thuộc nhóm của người đó.
   ② 4 BƯỚC trong 1 email / người / ngày (hạn mức email): 1 Kế hoạch LCNT · 2 Thông báo mời thầu · 3 Mở thầu (nhà thầu + giá dự thầu) ·
      4 Kết quả (bảng hàng hóa gộp mọi bệnh viện: 2 cột trái Bệnh viện · Gói thầu, hãng, SL, đơn giá, nhà thầu trúng, nhà thầu không trúng + lý do;
      đánh dấu hàng MANI / NPP của MMH). Từ khoá sản phẩm được TÔ VÀNG ngay trong tên gói / đoạn trích HSMT / tên hàng. PDF đính kèm = bản đầy đủ có link tài liệu.
   ③ Mở thầu: TBMT đã tải ⇒ sau giờ đóng thầu tự xếp hàng tải lại CHỈ phần mở thầu (wtrMoQueue_) ⇒ Excel "Nhà thầu tham dự".
   ④ Gửi tự động 06:30 (T2–T7) CHỈ KHI bật (Script Property WTR_ON = 1 — người dùng duyệt mẫu trước). Mẫu: action botRoute
      {key, op: find (gói có đủ 4 bước) · pkg (email 1 gói: no, to=<PIC>) · sample (báo cáo sáng của 1 PIC: pic, days, to=<PIC>) · dry · status · on · off}.
   ════════════════════════════════════════════════════════════════════ */
const WTR = {
  VER: '1.0',
  HOUR: 6, MIN: 30,
  PEOPLE: [
    { pic: 'Viet', line: 'dent', region: 'Miền Bắc', area: 'Miền Bắc' },
    { pic: 'Vinh', line: 'dent', region: 'Miền Trung', area: 'Miền Trung' },
    { pic: 'Phuong', line: 'dent', region: 'Miền Nam', area: 'Miền Nam' },
    { pic: 'Viet Ha', line: 'surg', terr: 'N', area: 'Miền Bắc đến hết Đà Nẵng cũ' },
    { pic: 'Khang', line: 'surg', terr: 'S', area: 'Từ Quảng Nam cũ đến miền Nam' }
  ],
  LINE: { dent: 'Nha khoa', surg: 'Ngoại khoa & Nhãn khoa' },
  // Theo dõi thầu CRM Surgical (FU.TERR_N_PROV): tỉnh của Viet Ha; Đà Nẵng mới = Đà Nẵng cũ (Viet Ha) + Quảng Nam cũ (Khang)
  TERR_N_PROV: ['Hà Nội', 'Bắc Ninh', 'Bắc Giang', 'Quảng Ninh', 'Hải Phòng', 'Hải Dương', 'Hưng Yên', 'Thái Bình', 'Ninh Bình', 'Nam Định', 'Hà Nam',
    'Cao Bằng', 'Tuyên Quang', 'Hà Giang', 'Lào Cai', 'Yên Bái', 'Thái Nguyên', 'Bắc Kạn', 'Lạng Sơn', 'Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình', 'Hoà Bình',
    'Điện Biên', 'Lai Châu', 'Sơn La', 'Thanh Hóa', 'Thanh Hoá', 'Nghệ An', 'Hà Tĩnh', 'Quảng Trị', 'Quảng Bình', 'Huế', 'Thừa Thiên Huế', 'Đà Nẵng'],
  QNAM_RE: /\b(quang nam|tam ky|hoi an|dien ban|duy xuyen|que son|thang binh|nui thanh|phu ninh|dai loc|nong son|hiep duc|tien phuoc|tra my|phuoc son|nam giang|dong giang|tay giang|chu lai)\b/,
  // NPP của MMH (so tên nhà thầu đã bỏ dấu)
  NPP: [['Hùng Vĩ', /hung vi/], ['I-Care', /\bi ?-? ?care\b/], ['Meci', /\bmeci\b/], ['S.P.I', /\bs ?\.? ?p ?\.? ?i\b/], ['Nam Dũng', /nam dung/], ['Việt Thái', /viet thai/]],
  CAP: { kh: 30, tb: 30, mo: 20, kq: 120 },       // số dòng trong email (PDF đầy đủ)
  CAP_PDF: { kh: 200, tb: 200, mo: 80, kq: 400 },
  MO_AFTER_H: 2, MO_WITHIN_D: 20, MO_MAX: 40,
  C: { navy: '#2C4A5E', steel: '#5A84A6', line: '#BCD4E6', cream: '#FBE9B7', ink: '#1F2937', mute: '#6B7280', soft: '#F4F8FB' }
};
const WTR_STAGE = { kh: 'Kế hoạch lựa chọn nhà thầu', tb: 'Thông báo mời thầu', mo: 'Mở thầu', kq: 'Kết quả lựa chọn nhà thầu' };

/* ══════════ ĐỊA BÀN ══════════ */
function wtrPk_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '').replace(/^(thanhpho|tp|tinh)/, '').replace(/^(hcm|tphcm|saigon)$/, 'hochiminh'); }
function wtrBare_(s) { return ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ') + ' '; }
/** tỉnh của tin: cột Tỉnh thành ⇒ tên chủ đầu tư ⇒ tên gói ⇒ [tỉnh, miền] */
function wtrProv_(prov, inv, name) {
  let p = wtdProvince_(prov); if (!p[0]) p = wtdProvince_(inv); if (!p[0]) p = wtdProvince_(name);
  return p;
}
/** 'N' (Viet Ha) · 'S' (Khang) · '' */
function wtrTerr_(prov, text) {
  const k = wtrPk_(prov); if (!k) return '';
  if (k === 'quangnam') return 'S';
  if (k === 'danang') return WTR.QNAM_RE.test(wtrBare_(text)) ? 'S' : 'N';
  if (!WTR._tn) { WTR._tn = {}; WTR.TERR_N_PROV.forEach(function (x) { WTR._tn[wtrPk_(x)] = 1; }); }
  return WTR._tn[k] ? 'N' : 'S';
}
/** người nhận + email (RH_Users theo PIC; WTR_TO ghi đè) + mục theo dõi thêm (add-on) */
function wtrPeople_() {
  const over = wtJson_(PropertiesService.getScriptProperties().getProperty('WTR_TO'), {}) || {}, byPic = {};
  try {
    const us = SpreadsheetApp.openById(WT.MASTER_ID).getSheetByName('RH_Users');
    us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 5).getValues().forEach(function (r) {
      const pic = wtS_(r[1]), raw = wtS_(r[0]); if (!pic || !raw) return;
      if (r[4] !== '' && !wtTrue_(r[4])) return;
      byPic[pic.toLowerCase()] = raw.indexOf('@') > 0 ? raw.toLowerCase() : raw.toLowerCase() + '@manimedicalhanoi.com';
    });
  } catch (e) { Logger.log('wtrPeople_: ' + e.message); }
  const W = wtWatches_(wtBook_());
  return WTR.PEOPLE.map(function (p) {
    const mail = wtS_(over[p.pic]) || byPic[p.pic.toLowerCase()] || '';
    const add = {}; W.forEach(function (w) { if (w.active && mail && w.mail === mail.toLowerCase()) add[w.invKey] = w.investor; });
    return Object.assign({}, p, { mail: mail, addon: add });
  });
}
function wtrMailOf_(pic) {
  const P = wtrPeople_().filter(function (x) { return x.pic.toLowerCase() === wtS_(pic).toLowerCase(); })[0];
  if (P) return P.mail;
  try {
    const us = SpreadsheetApp.openById(WT.MASTER_ID).getSheetByName('RH_Users');
    const r = us.getRange(2, 1, Math.max(1, us.getLastRow() - 1), 2).getValues().filter(function (x) { return wtS_(x[1]).toLowerCase() === wtS_(pic).toLowerCase(); })[0];
    if (r) { const raw = wtS_(r[0]).toLowerCase(); return raw.indexOf('@') > 0 ? raw : raw + '@manimedicalhanoi.com'; }
  } catch (e) {}
  return /@/.test(wtS_(pic)) ? wtS_(pic) : '';
}
/** tin này thuộc phạm vi của người p? 'area' · 'addon' · '' */
function wtrScope_(p, it) {
  if (p.addon[it.invKey]) return 'addon';
  if (p.line === 'dent') return it.region === p.region ? 'area' : '';
  return it.terr === p.terr ? 'area' : '';
}

/* ══════════ TỪ KHOÁ + TÔ VÀNG ══════════ */
function wtrKw_() { if (!WTQ_KW) { try { wtqKwLoad_(wtmBook_('hh').book); } catch (e) { WTQ_KW = wtqKwCompile_(WTQ_KWDEF); } } return WTQ_KW; }
/** chữ ⇒ { dent:{kw:[], rule:[]}, surg:{…} } */
function wtrRel_(text) {
  const KW = wtrKw_(), G = wtqGroups_(), o = { dent: { kw: [], rule: [] }, surg: { kw: [], rule: [] } };
  const t = wtS_(text); if (!t) return o;
  wtqKwHits_(KW, t).forEach(function (k) { k.spec.forEach(function (s) { const tb = wtqTabOf_(s); if (tb && o[tb].kw.indexOf(k.kw) < 0) o[tb].kw.push(k.kw); }); });
  wtqClassify_(t.slice(0, 240), t).forEach(function (c) { const tb = wtqTabOf_((G[c] || {}).spec || ''); if (tb) o[tb].rule.push((G[c] || {}).name || c); });
  return o;
}
/** tô vàng từ khoá (bộ từ khoá của MMH_WatchSuspect) trong 1 đoạn chữ — trả HTML đã escape */
function wtrMark_(s, only) {
  const t = String(s == null ? '' : s).normalize('NFC').replace(/\s+/g, ' ');
  if (!t) return '';
  const low = t.toLowerCase(), bare = low.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').normalize('NFC');
  const marks = [];
  if (low.length === t.length && bare.length === t.length) {
    wtrKw_().forEach(function (k) {
      if (only && !k.spec.some(function (sp) { return wtqTabOf_(sp) === only; })) return;
      const re = new RegExp(k.re.source, 'gu'), src = k.bare ? bare : low;
      let m; while ((m = re.exec(src))) { if (!m[0]) { re.lastIndex++; continue; } marks.push([m.index, m.index + m[0].length]); }
    });
  }
  if (!marks.length) return wtH_(t);
  marks.sort(function (a, b) { return a[0] - b[0]; });
  let out = '', pos = 0;
  marks.forEach(function (m) { if (m[0] < pos) return; out += wtH_(t.slice(pos, m[0])) + '<span style="background:' + WTR.C.cream + ';font-weight:bold">' + wtH_(t.slice(m[0], m[1])) + '</span>'; pos = m[1]; });
  return out + wtH_(t.slice(pos));
}
function wtrNpp_(name) { const b = wtrBare_(name); const m = WTR.NPP.filter(function (x) { return x[1].test(b); })[0]; return m ? m[0] : ''; }
function wtrMoney_(v) { const n = typeof v === 'number' ? v : wtmNum_(v); return typeof n === 'number' && n ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : wtS_(v); }
function wtrNum_(v) { const n = typeof v === 'number' ? v : wtmNum_(String(v || '').replace(/[^\d.,]/g, '')); return typeof n === 'number' ? n : 0; }
function wtrDay_(d) { return Utilities.formatDate(d || new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function wtrVn_(iso) { const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : wtS_(iso); }

/* ══════════ MỞ THẦU ══════════ */
/** Excel "Nhà thầu tham dự" (Google Sheet) của gói ⇒ [{name, id, bid, disc, after, lot}] */
function wtrBidders_(hs) {
  for (let i = 0; i < hs.length; i++) {
    const f = (hs[i].files || []).filter(function (x) { return x && x.id && x.gsheet && /nhà thầu tham dự/i.test(wtS_(x.kind) + ' ' + wtS_(x.name)); })[0];
    if (!f) continue;
    try {
      const V = SpreadsheetApp.openById(f.id).getSheets()[0].getDataRange().getValues();
      let hr = -1, ix = {};
      for (let r = 0; r < Math.min(V.length, 15); r++) {
        const K = V[r].map(wtmK_);
        const fi = function (re, not) { return K.findIndex(function (k) { return re.test(k) && !(not && not.test(k)); }); };
        if (fi(/ten nha thau/) >= 0 && fi(/gia du thau/) >= 0) {
          hr = r; ix = { name: fi(/ten nha thau/), id: fi(/ma dinh danh/), bid: fi(/gia du thau/, /sau|giam/), disc: fi(/ty le giam|giam gia/), after: fi(/sau giam|sau khi/), lot: fi(/ma phan|ten phan|lo/) };
          break;
        }
      }
      if (hr < 0) continue;
      const g = function (r, j) { return j >= 0 ? r[j] : ''; };
      const out = V.slice(hr + 1).filter(function (r) { return wtS_(g(r, ix.name)); }).map(function (r) {
        return { name: wtS_(g(r, ix.name)), id: wtS_(g(r, ix.id)), bid: wtrNum_(g(r, ix.bid)), disc: wtS_(g(r, ix.disc)), after: wtrNum_(g(r, ix.after)), lot: wtS_(g(r, ix.lot)) };
      });
      if (out.length) return { list: out, url: f.url || '' };
    } catch (e) { Logger.log('wtrBidders_: ' + e.message); }
  }
  return null;
}
/** TBMT đã tải mà đã qua giờ đóng thầu ⇒ xếp hàng tải lại CHỈ phần mở thầu (bot cloud) */
function wtrMoQueue_() {
  const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH), H = wtHits_(ss), now = Date.now(), res = { n: 0 };
  const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { busy: true };
  try {
    H.forEach(function (h) {
      if (res.n >= WTR.MO_MAX || h.type !== 'tbmt' || (h.status !== WT.ST.DONE && h.status !== WT.ST.NOFILE)) return;
      const I = h.info || {};
      if (I.moAt && ((+I.moTry || 1) >= 3 || now - new Date(String(I.moAt).replace(' ', 'T') + '+07:00').getTime() < 864e5)) return;   // thử lại ≤ 3 lần, cách 1 ngày
      if ((h.files || []).some(function (f) { return /nhà thầu tham dự|biên bản mở thầu/i.test(wtS_(f.kind) + ' ' + wtS_(f.name)); })) return;
      const c = wtS_(I.close || (I.fields || {})['Thời điểm đóng thầu'] || I.open), m = c.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
      if (!m) return;
      const t = new Date(m[3] + '-' + m[2] + '-' + m[1] + 'T' + (m[4] || '10') + ':' + (m[5] || '00') + ':00+07:00').getTime();
      if (!(now > t + WTR.MO_AFTER_H * 36e5 && now < t + WTR.MO_WITHIN_D * 864e5)) return;
      const info = Object.assign({}, I, { want: ['mo'], moAt: wtNow_(), moTry: (+I.moTry || 0) + 1, pri: typeof I.pri === 'number' ? Math.min(I.pri, 1) : 1 }); delete info.ag;
      sh.getRange(h.row, 7).setValue(JSON.stringify(info));
      sh.getRange(h.row, 11, 1, 1).setValue(WT.ST.WAIT);
      res.n++;
    });
  } finally { lock.releaseLock(); }
  return res;
}

/* ══════════ GOM DỮ LIỆU ══════════ */
/** tin trong cửa sổ: ngày (Báo Đấu Thầu) ∈ (fromDay, toDay] hoặc mốc giờ (tải xong / gộp) ≥ fromAt */
function wtrGather_(fromDay, toDay, fromAt) {
  const ss = wtBook_(), data = wtLoad_(ss), H = wtHits_(ss), hb = {};
  H.forEach(function (h) { const b = wtBare_(h.no); if (b) (hb[b] = hb[b] || []).push(h); });
  const B = wtqBuild_({ dry: true });
  let L = {}; try { L = wtgData_().lose || {}; } catch (e) {}
  let DOC = {}; try { DOC = wteHitsBy_(); } catch (e) {}
  let T = {}; try { T = wttTargets_(); } catch (e) {}
  const inDay = function (d) { return d && d > fromDay && d <= toDay; };
  const fromTs = Utilities.formatDate(new Date(fromAt), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  const mk = function (stage, r, extra) {
    const b = wtBare_(r.no), pr = wtrProv_(r.prov, r.inv, r.name);
    return Object.assign({ stage: stage, bare: b, no: r.no, inv: r.inv, invKey: r.invKey || wtNorm_(r.inv), name: r.name, proj: r.proj || '', price: wtrNum_(r.price),
      form: r.form || '', day: r.upd || r.date, prov: pr[0] || r.prov, region: pr[1], terr: wtrTerr_(pr[0] || r.prov, r.inv + ' ' + r.name),
      targets: wttLabels_(T, r.inv), hits: hb[b] || [], docs: DOC[b] || [] }, extra || {});
  };
  const out = { kh: [], tb: [], mo: [], kq: [], B: B, L: L };
  data.khmt.forEach(function (r) { if (inDay(r.upd || r.date)) out.kh.push(mk('kh', r)); });
  data.tbmt.forEach(function (r) { if (inDay(r.upd || r.date)) out.tb.push(mk('tb', r, { open: r.open })); });
  const kqSeen = {};
  data.kqdt.forEach(function (r) { if (inDay(r.upd || r.date)) { const it = mk('kq', r, { win: wtrNum_(r.win), winner: r.winner }); out.kq.push(it); kqSeen[it.bare] = 1; } });
  // kết quả có danh sách hàng hóa mới gộp trong cửa sổ (dù tin Báo Đấu Thầu cũ hơn)
  const kqRow = {}; data.kqdt.forEach(function (r) { const b = wtBare_(r.no); if (b && !kqRow[b]) kqRow[b] = r; });
  Object.keys(B.per).forEach(function (b) {
    if (kqSeen[b] || !(B.per[b].at >= fromTs)) return;
    const r = kqRow[b] || { no: B.per[b].no, inv: B.per[b].inv, name: B.per[b].pkg, prov: B.per[b].prov };
    out.kq.push(mk('kq', r, { win: wtrNum_(r.win), winner: r.winner || '' })); kqSeen[b] = 1;
  });
  // mở thầu: gói có Excel "Nhà thầu tham dự" tải xong trong cửa sổ
  const moSeen = {};
  H.forEach(function (h) {
    const b = wtBare_(h.no); if (!b || moSeen[b] || !(h.done >= fromTs)) return;
    if (!(h.files || []).some(function (f) { return /nhà thầu tham dự/i.test(wtS_(f.kind) + ' ' + wtS_(f.name)); })) return;
    moSeen[b] = 1;
    const I = h.info || {};
    out.mo.push(mk('mo', { no: h.no, inv: I.investor || h.investor, invKey: h.invKey, name: I.bidName || h.name, prov: I.prov, price: I.price || (I.fields || {})['Giá gói thầu'], date: wtS_(h.done).slice(0, 10) }, { mo: I.moFields || {} }));
  });
  return out;
}
/** độ liên quan của 1 tin với 1 nhóm SP */
function wtrRelOf_(it, line, B) {
  const rel = { kw: [], rule: [], doc: [], goods: [], target: it.targets.filter(function (x) { return line === 'surg' ? /mắt|KQTT dao|Surgical/i.test(x) : /Răng|nha khoa|Dental/i.test(x); }) };
  const r = wtrRel_([it.name, it.proj].join(' · '));
  const oth = line === 'dent' ? 'surg' : 'dent';
  rel.rule = r[line].rule;
  rel.kw = (r[oth].rule.length && !r[line].rule.length) ? [] : r[line].kw;   // "chỉ khâu nylon" đã khớp quy tắc nhãn khoa ⇒ không báo nha khoa vì chữ "chỉ"
  (it.docs || []).forEach(function (d) { (d.hits || []).forEach(function (h) { if ((h.spec || []).indexOf(line) >= 0) rel.doc.push(Object.assign({ file: d.name, url: d.url }, h)); }); });
  if (it.stage === 'kq' || it.stage === 'mo') { const P = B.per[it.bare]; if (P) rel.goods = (P.lines || []).filter(function (x) { return (x.tabs || []).indexOf(line) >= 0; }); }
  rel.hit = !!(rel.kw.length || rel.rule.length || rel.doc.length || rel.goods.length);
  rel.high = !!(rel.rule.length || rel.goods.some(function (x) { return x.high; }) || rel.doc.some(function (x) { return x.high; }));
  return rel;
}
/** link tài liệu của 1 gói (mọi file đã tải: TBMT · HSMT · mở thầu · kết quả · KHLCNT) */
function wtrLinks_(hs, kh) {
  const out = [], seen = {};
  (hs || []).concat(kh || []).forEach(function (h) {
    (h.files || []).forEach(function (f) {
      if (!f || !f.url || seen[f.url]) return; seen[f.url] = 1;
      out.push([wtS_(f.kind) || wtS_(f.name).replace(/^[A-Z]{2}\d+\s*-\s*/, '').replace(/\.[a-z0-9]+$/i, ''), f.url, wtS_(f.sec)]);
    });
    ((h.info || {}).agentFiles || []).forEach(function (a) { if (a && a.done && a.url && !seen[a.url]) { seen[a.url] = 1; out.push([wtS_(a.type) || wtS_(a.name), a.url, wtS_(a.tab)]); } });
  });
  const pg = (hs || []).map(function (h) { return (h.info || {}).url; }).filter(Boolean)[0];
  if (pg) out.push(['Trang gói trên muasamcong', pg, '']);
  if (hs && hs[0]) out.push(['Mở trên app', WT.APP_URL + '#g=' + encodeURIComponent(hs[0].key), '']);
  return out;
}
function wtrA_(l) { return '<a href="' + wtH_(l[1]) + '" style="color:' + WTR.C.steel + ';text-decoration:none">' + wtH_(l[0]) + '</a>'; }

/* ══════════ HTML ══════════ */
function wtrCss_(pdf) {
  const fs = pdf ? '9px' : '12.5px';
  return { td: 'padding:5px 7px;border-bottom:1px solid ' + WTR.C.line + ';vertical-align:top;font-size:' + fs,
    th: 'padding:6px 7px;background:' + WTR.C.navy + ';color:#fff;text-align:left;font-weight:bold;font-size:' + fs,
    h2: 'color:' + WTR.C.navy + ';font-size:' + (pdf ? '12px' : '15px') + ';margin:20px 0 6px;text-transform:uppercase;border-bottom:2px solid ' + WTR.C.line + ';padding-bottom:3px',
    mute: 'color:' + WTR.C.mute + ';font-size:' + (pdf ? '8px' : '11.5px') };
}
function wtrTable_(heads, rows, S, widths) {
  return '<table style="border-collapse:collapse;width:100%"><tr>' + heads.map(function (h, i) { return '<th style="' + S.th + (widths && widths[i] ? ';width:' + widths[i] : '') + '">' + h + '</th>'; }).join('') + '</tr>' +
    rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td style="' + S.td + '">' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
}
function wtrInvCell_(it, scope, S, rel) {
  const tags = [].concat(scope === 'addon' ? ['Bạn theo dõi thêm'] : [], rel && rel.target ? rel.target : []);
  return '<b>' + wtH_(it.inv) + '</b>' + (it.prov ? '<br><span style="' + S.mute + '">' + wtH_(it.prov) + '</span>' : '') + (tags.length ? '<br><span style="color:' + WTR.C.navy + ';font-size:10.5px">' + wtH_(tags.join(' · ')) + '</span>' : '');
}
function wtrRelCell_(rel, line, S) {
  const parts = [];
  if (rel.rule.length) parts.push('<b>' + wtH_(rel.rule.join(' · ')) + '</b>');
  if (rel.kw.length && !rel.rule.length) parts.push('Từ khoá trong tên gói: ' + wtH_(rel.kw.join(', ')));
  rel.doc.slice(0, 3).forEach(function (d) { parts.push('<span style="' + S.mute + '">' + wtH_(d.file) + ':</span> «' + wtrMark_(String(d.snip).slice(0, 240), line) + '»'); });
  if (rel.doc.length > 3) parts.push('<span style="' + S.mute + '">+ ' + (rel.doc.length - 3) + ' đoạn khác trong HSMT</span>');
  return parts.join('<br>') || '<span style="' + S.mute + '">—</span>';
}
/** 1 khối bước (kh / tb): bảng tin có sản phẩm liên quan + tin khu vực khác */
function wtrStageHtml_(key, list, line, S, pdf) {
  const relv = list.filter(function (x) { return x.rel.hit || x.rel.target.length || x.scope === 'addon'; });
  const rest = list.filter(function (x) { return relv.indexOf(x) < 0; });
  const cap = (pdf ? WTR.CAP_PDF : WTR.CAP)[key];
  let h = '<h3 style="' + S.h2 + '">' + ({ kh: '1', tb: '2' })[key] + '. ' + WTR_STAGE[key] + ' · ' + list.length + ' gói</h3>';
  if (!list.length) return h + '<p style="' + S.mute + '">Không có tin mới.</p>';
  if (relv.length) {
    h += wtrTable_(['Bệnh viện / chủ đầu tư', 'Gói thầu', 'Sản phẩm liên quan', 'Tài liệu'], relv.slice(0, cap).map(function (x) {
      const meta = [x.no, x.price ? 'Giá gói ' + wtrMoney_(x.price) + ' đ' : '', x.form, key === 'tb' && x.open ? 'Đóng / mở thầu ' + x.open : '', 'Đăng ' + wtrVn_(x.day)].filter(function (x) { return wtS_(x); }).join(' · ');
      return [wtrInvCell_(x, x.scope, S, x.rel), wtrMark_(x.name, line) + '<br><span style="' + S.mute + '">' + wtH_(meta) + '</span>', wtrRelCell_(x.rel, line, S),
        wtrLinks_(x.hits).map(wtrA_).join('<br>') || '<span style="' + S.mute + '">chưa tải</span>'];
    }), S, ['22%', '', '30%', '13%']);
    if (relv.length > cap) h += '<p style="' + S.mute + '">+ ' + (relv.length - cap) + ' gói — xem file PDF.</p>';
  } else h += '<p>Chưa thấy gói có sản phẩm thuộc nhóm ' + WTR.LINE[line] + '.</p>';
  if (rest.length) {
    if (pdf) h += '<p style="' + S.mute + ';margin-top:8px"><b>Các gói khác trong địa bàn (' + rest.length + '):</b> ' + rest.slice(0, cap).map(function (x) { return wtH_(x.inv) + ' — ' + wtH_(String(x.name).slice(0, 90)); }).join(' · ') + '</p>';
    else h += '<p style="' + S.mute + '">Ngoài ra ' + rest.length + ' gói khác trong địa bàn chưa thấy sản phẩm liên quan (danh sách trong file PDF).</p>';
  }
  return h;
}
function wtrMoHtml_(list, line, S, pdf) {
  const relv = list.filter(function (x) { return x.rel.hit || x.rel.target.length || x.scope === 'addon' || x.npp; });
  const cap = (pdf ? WTR.CAP_PDF : WTR.CAP).mo;
  let h = '<h3 style="' + S.h2 + '">3. ' + WTR_STAGE.mo + ' · ' + list.length + ' gói</h3>';
  if (!list.length) return h + '<p style="' + S.mute + '">Không có biên bản mở thầu mới.</p>';
  const show = (relv.length ? relv : list).slice(0, cap);
  h += wtrTable_(['Bệnh viện / chủ đầu tư', 'Gói thầu', 'Nhà thầu tham dự · giá dự thầu', 'Tài liệu'], show.map(function (x) {
    const bl = (x.bid && x.bid.list) || [];
    const lines = bl.slice(0, 8).map(function (b) {
      const p = b.after || b.bid, d = x.price && p ? Math.round((1 - p / x.price) * 1000) / 10 : null, npp = wtrNpp_(b.name);
      return (npp ? '<b>' : '') + wtH_(b.name) + (npp ? '</b> <span style="background:' + WTR.C.cream + '">NPP của MMH</span>' : '') + ': ' + wtrMoney_(p) + ' đ' + (d != null ? ' <span style="' + S.mute + '">(' + (d >= 0 ? 'thấp hơn' : 'cao hơn') + ' giá gói ' + Math.abs(d) + '%)</span>' : '');
    });
    const cnt = bl.length || wtS_(x.mo['Tổng số nhà thầu tham dự']);
    return [wtrInvCell_(x, x.scope, S, x.rel), wtrMark_(x.name, line) + '<br><span style="' + S.mute + '">' + wtH_([x.no, x.price ? 'Giá gói ' + wtrMoney_(x.price) + ' đ' : ''].filter(function (x) { return wtS_(x); }).join(' · ')) + '</span>',
      (cnt ? '<b>' + cnt + ' nhà thầu</b><br>' : '') + (lines.join('<br>') || '<span style="' + S.mute + '">chưa đọc được danh sách</span>') + (bl.length > 8 ? '<br><span style="' + S.mute + '">+ ' + (bl.length - 8) + ' nhà thầu</span>' : ''),
      wtrLinks_(x.hits).map(wtrA_).join('<br>')];
  }), S, ['22%', '', '38%', '12%']);
  if (!relv.length && list.length > show.length) h += '<p style="' + S.mute + '">+ ' + (list.length - show.length) + ' gói — xem file PDF.</p>';
  return h;
}
/** nhà thầu không trúng (Danh sách nhà thầu) của 1 lô / cả gói */
function wtrLosers_(L, bare, lot) {
  const P = L[bare]; if (!P) return [];
  const pp = String(lot || '').split(' · '), k1 = wtmK_(pp[0]), k2 = wtmK_(pp[1] || '');
  let A = (k1 && (P[k1] || P['n:' + k1])) || (k2 && P['n:' + k2]) || null;
  if (!A && !Object.keys(P).some(function (k) { return k !== '*' && k.indexOf('n:') !== 0; })) A = P['*'] || null;
  return wtrUniq_(A || []).filter(function (e) { return !e[3]; });
}
/** gộp mọi lô của 1 gói, bỏ trùng tên */
function wtrUniq_(A) { const seen = {}; return A.filter(function (e) { const k = wtmK_(e[0]); if (!k || seen[k]) return false; seen[k] = 1; return true; }); }
/** bước 4: bảng hàng hóa gộp mọi bệnh viện (2 cột trái Bệnh viện · Gói thầu) + nhận xét */
function wtrKqHtml_(list, line, S, pdf, L) {
  const cap = (pdf ? WTR.CAP_PDF : WTR.CAP).kq, rows = [], notes = [];
  let h = '<h3 style="' + S.h2 + '">4. ' + WTR_STAGE.kq + ' · ' + list.length + ' gói</h3>';
  if (!list.length) return h + '<p style="' + S.mute + '">Không có kết quả mới.</p>';
  const withGoods = list.filter(function (x) { return x.rel.goods.length; });
  const brands = {}, winners = {};
  withGoods.forEach(function (x) {
    x.rel.goods.slice().sort(function (a, b) { return (b.high ? 1 : 0) - (a.high ? 1 : 0); }).forEach(function (g) {
      const lose = wtrLosers_(L, x.bare, g.lot);
      const br = [g.brand, g.maker].filter(function (x) { return wtS_(x); }).join(' / ');
      if (g.maker || g.brand) brands[g.maker || g.brand] = (brands[g.maker || g.brand] || 0) + (wtrNum_(g.amt) || 1);
      if (g.win) winners[g.win] = (winners[g.win] || 0) + 1;
      const tagM = g.mani ? ' <span style="background:' + WTR.C.cream + ';font-weight:bold">MANI</span>' : '';
      const nppW = wtrNpp_(g.win);
      rows.push([wtH_(x.inv) + (x.prov ? '<br><span style="' + S.mute + '">' + wtH_(x.prov) + '</span>' : ''),
        wtH_(String(x.name).slice(0, 110)) + '<br><span style="' + S.mute + '">' + wtH_(x.no) + (g.lot ? ' · ' + wtH_(g.lot.slice(0, 60)) : '') + '</span>',
        (g.high ? '<b>' : '') + wtrMark_(g.name, line) + (g.high ? '</b>' : ''), wtH_(br.slice(0, 70)) + tagM,
        wtH_(g.win.slice(0, 70)) + (nppW ? ' <span style="background:' + WTR.C.cream + '">NPP của MMH</span>' : ''),
        wtH_(wtrMoney_(g.qty) + (g.unit ? ' ' + g.unit : '')), wtH_(wtrMoney_(g.price)), wtH_(wtrMoney_(g.amt)),
        lose.slice(0, 4).map(function (e) { const n = wtrNpp_(e[0]); return (n ? '<b>' : '') + wtH_(e[0].slice(0, 60)) + (n ? '</b> (NPP của MMH)' : '') + (e[1] ? ': ' + wtrMoney_(e[1]) + ' đ' : '') + (e[2] ? '<br><span style="' + S.mute + '">' + wtH_(e[2].slice(0, 160)) + '</span>' : ''); }).join('<br>') +
        (lose.length > 4 ? '<br><span style="' + S.mute + '">+ ' + (lose.length - 4) + '</span>' : '')]);
    });
  });
  if (rows.length) {
    h += wtrTable_(['Bệnh viện', 'Gói thầu', 'Mặt hàng', 'Nhãn hiệu / hãng', 'Nhà thầu trúng', 'Khối lượng', 'Đơn giá', 'Thành tiền', 'Nhà thầu không trúng · giá · lý do'],
      rows.slice(0, cap), S, ['11%', '13%', '15%', '9%', '11%', '6%', '7%', '8%', '']);
    if (rows.length > cap) h += '<p style="' + S.mute + '">+ ' + (rows.length - cap) + ' dòng — xem file PDF.</p>';
    const top = function (o, n) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).slice(0, n); };
    notes.push(withGoods.length + ' gói có mặt hàng thuộc nhóm ' + WTR.LINE[line] + ' (' + rows.length + ' dòng hàng).');
    if (Object.keys(brands).length) notes.push('Hãng trúng nhiều nhất (theo thành tiền): ' + top(brands, 4).join(', ') + '.');
    if (Object.keys(winners).length) notes.push('Nhà thầu trúng nhiều dòng nhất: ' + top(winners, 3).join(', ') + '.');
    const mani = rows.filter(function (r) { return /MANI<\/span>/.test(r[3]); }).length;
    notes.push(mani ? mani + ' dòng trúng là hàng MANI.' : 'Không có dòng trúng nào là hàng MANI.');
    h += '<p style="margin:8px 0 0"><b>Nhận xét:</b> ' + notes.map(wtH_).join(' ') + '</p>';
  } else h += '<p>Chưa thấy mặt hàng thuộc nhóm ' + WTR.LINE[line] + ' trong các kết quả mới (hoặc danh sách hàng hóa chưa tải xong).</p>';
  const rest = list.filter(function (x) { return !x.rel.goods.length; });
  if (rest.length) h += '<p style="' + S.mute + '">' + (pdf ? '<b>Kết quả khác trong địa bàn (' + rest.length + '):</b> ' + rest.slice(0, cap).map(function (x) { return wtH_(x.inv) + ' — ' + wtH_(String(x.name).slice(0, 80)) + (x.winner ? ' (trúng: ' + wtH_(String(x.winner).slice(0, 50)) + ')' : ''); }).join(' · ')
    : 'Ngoài ra ' + rest.length + ' kết quả khác trong địa bàn không có mặt hàng thuộc nhóm (danh sách trong file PDF).') + '</p>';
  return h;
}
/** báo cáo 1 người: { html (email), pdfHtml, n, rel } */
function wtrPersonReport_(p, G, range) {
  const S = wtrCss_(false), SP = wtrCss_(true), line = p.line;
  const pick = function (arr) {
    return arr.map(function (it) { const sc = wtrScope_(p, it); if (!sc) return null; return Object.assign({}, it, { scope: sc, rel: wtrRelOf_(it, line, G.B) }); }).filter(Boolean)
      .sort(function (a, b) { return (b.rel.high ? 2 : b.rel.hit ? 1 : 0) - (a.rel.high ? 2 : a.rel.hit ? 1 : 0) || String(b.day).localeCompare(String(a.day)); });
  };
  const kh = pick(G.kh), tb = pick(G.tb), kq = pick(G.kq);
  const mo = pick(G.mo).map(function (x) { const b = wtrBidders_(x.hits); return Object.assign(x, { bid: b, npp: b ? b.list.some(function (y) { return wtrNpp_(y.name); }) : false }); });
  const cnt = function (a) { return a.filter(function (x) { return x.rel.hit; }).length; };
  const sum = [['1. ' + WTR_STAGE.kh, kh.length, cnt(kh)], ['2. ' + WTR_STAGE.tb, tb.length, cnt(tb)], ['3. ' + WTR_STAGE.mo, mo.length, cnt(mo)], ['4. ' + WTR_STAGE.kq, kq.length, cnt(kq)]];
  const head = function (S) {
    return '<p>Hệ thống Theo dõi gói thầu xin gửi anh/chị tổng hợp tin đấu thầu mới tại địa bàn <b>' + wtH_(p.area) + '</b>, nhóm sản phẩm <b>' + WTR.LINE[line] + '</b>, cập nhật ' + wtH_(range) + '.</p>' +
      wtrTable_(['Bước', 'Số gói trong địa bàn', 'Có sản phẩm liên quan'], sum.map(function (r) { return [r[0], r[1], r[2] ? '<b>' + r[2] + '</b>' : '0']; }), S, ['', '22%', '22%']);
  };
  const body = function (S, pdf) {
    return head(S) + wtrStageHtml_('kh', kh, line, S, pdf) + wtrStageHtml_('tb', tb, line, S, pdf) + wtrMoHtml_(mo, line, S, pdf) + wtrKqHtml_(kq, line, S, pdf, G.L) +
      '<p style="' + S.mute + ';margin-top:14px">Từ khoá sản phẩm được tô vàng. "Sản phẩm liên quan" = tên gói / đoạn HSMT / mặt hàng chứa từ khoá của nhóm ' + WTR.LINE[line] +
      ' (bộ từ khoá KQTT); chữ đậm = khớp quy tắc làm sạch (khả năng cao đúng loại sản phẩm). Gói thầu ngoài địa bàn: thêm trong app Theo dõi gói thầu.</p>';
  };
  const n = sum.reduce(function (s, r) { return s + r[1]; }, 0), nrel = sum.reduce(function (s, r) { return s + r[2]; }, 0);
  return { n: n, rel: nrel, sum: sum,
    html: '<div style="font-family:Aptos,Arial,sans-serif;font-size:14px;color:' + WTR.C.ink + '">Kính gửi anh/chị ' + wtH_(p.pic) + ',' + body(S, false) +
      '<p>Bản đầy đủ (mọi gói trong địa bàn, link tài liệu) ở file PDF đính kèm.</p><p>Trân trọng,<br>MMH Product Team</p></div>',
    pdfHtml: '<div style="font-family:Aptos,Arial,sans-serif;color:' + WTR.C.ink + '"><div style="font-size:16px;font-weight:bold;color:' + WTR.C.navy + ';text-transform:uppercase">Báo cáo thầu · ' + wtH_(p.pic) + ' · ' + WTR.LINE[line] + '</div>' + body(SP, true) + '</div>' };
}
function wtrPdf_(html, name) {
  const doc = '<html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:10mm}body{margin:0}</style></head><body>' + html + '</body></html>';
  const blob = Utilities.newBlob(doc, 'text/html', 'r.html').getAs(MimeType.PDF).setName(name + '.pdf');
  let url = '';
  try { url = wtzFolder_().createFile(blob).getUrl(); } catch (e) { Logger.log('wtrPdf_: ' + e.message); }
  return { blob: blob, url: url };
}

/* ══════════ GỬI ══════════ */
function wtrRun_(opt) {
  opt = opt || {};
  const P = PropertiesService.getScriptProperties(), now = new Date(), today = wtrDay_(now);
  const yest = wtrDay_(new Date(now.getTime() - 864e5));
  const days = Math.max(1, +opt.days || 0);
  const fromDay = opt.days ? wtrDay_(new Date(now.getTime() - (days + 1) * 864e5)) : (P.getProperty('WTR_LAST_DAY') || wtrDay_(new Date(now.getTime() - 2 * 864e5)));
  const toDay = opt.days ? today : yest;
  const fromAt = opt.days ? now.getTime() - days * 864e5 : (+(P.getProperty('WTR_LAST_AT') || 0) || now.getTime() - 864e5);
  const G = wtrGather_(fromDay, toDay, fromAt);
  const range = 'từ ' + wtrVn_(wtrDay_(new Date(new Date(fromDay + 'T00:00:00+07:00').getTime() + 864e5))) + ' đến ' + wtrVn_(toDay);
  const people = wtrPeople_().filter(function (p) { return !opt.pic || p.pic.toLowerCase() === wtS_(opt.pic).toLowerCase(); });
  const res = { ok: true, range: range, total: { kh: G.kh.length, tb: G.tb.length, mo: G.mo.length, kq: G.kq.length }, people: [] };
  people.forEach(function (p) {
    const R = wtrPersonReport_(p, G, range), row = { pic: p.pic, area: p.area, mail: p.mail ? p.mail.split('@')[0] : '(chưa có email)', n: R.n, rel: R.rel, sum: R.sum.map(function (x) { return [x[1], x[2]]; }) };
    res.people.push(row);
    if (opt.op === 'dry') return;
    const to = opt.to ? wtrMailOf_(opt.to) : p.mail;
    if (!to || !R.n) { row.skip = !to ? 'không có email' : 'không có tin'; return; }
    const day = wtrVn_(today);
    const pdf = wtrPdf_(R.pdfHtml, 'Báo cáo thầu ' + today.replace(/-/g, '') + ' - ' + p.pic + ' - ' + WTR.LINE[p.line]);
    mmhMail_({ to: to, subject: (opt.to ? '[MẪU] ' : '') + '[MMH · Thông tin thầu] Báo cáo ngày ' + day + ' – ' + WTR.LINE[p.line] + ' – ' + p.area + (R.rel ? ' – ' + R.rel + ' gói có sản phẩm liên quan' : ''),
      htmlBody: R.html, attachments: [pdf.blob], name: CFG.EMAIL_FROM_NAME });
    row.sent = to.split('@')[0]; row.pdf = pdf.url;
  });
  if (opt.op === 'send' && !opt.to && !opt.pic) {
    P.setProperty('WTR_LAST_DAY', yest); P.setProperty('WTR_LAST_AT', String(now.getTime())); P.setProperty('WTR_DAY', today);
    P.setProperty('WTR_LAST', JSON.stringify({ at: wtNow_(), people: res.people.map(function (x) { return [x.pic, x.n, x.rel, x.sent ? 1 : 0]; }) }));
  }
  return res;
}
/** wtTick: 06:30 T2–T7, 1 lần / ngày, CHỈ khi WTR_ON = 1 */
function wtrTick_() {
  const P = PropertiesService.getScriptProperties();
  try { wtrMoQueue_(); } catch (e) { Logger.log('wtrMoQueue_: ' + e.message); }
  if (P.getProperty('WTR_ON') !== '1') return null;
  const d = new Date(), today = wtrDay_(d);
  if (P.getProperty('WTR_DAY') === today) return null;
  const hm = +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'H') * 60 + +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'm');
  if (+Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'u') === 7 || hm < WTR.HOUR * 60 + WTR.MIN || hm > 11 * 60) return null;
  return wtrRun_({ op: 'send' });
}

/* ══════════ 1 GÓI ĐỦ 4 BƯỚC ══════════ */
/** gói có đủ: KHLCNT (tin / file) · TBMT · mở thầu (Excel nhà thầu tham dự) · kết quả (hàng hóa đã gộp) */
function wtrFind_(p) {
  const ss = wtBook_(), H = wtHits_(ss), data = wtLoad_(ss), B = wtqBuild_({ dry: true }), hb = {}, kh = {};
  H.forEach(function (h) { const b = wtBare_(h.no); if (b) (hb[b] = hb[b] || []).push(h); });
  data.khmt.forEach(function (r) { kh[wtBare_(r.no)] = 1; });
  const out = [];
  Object.keys(hb).forEach(function (b) {
    if (!/^IB/.test(b)) return;
    const hs = hb[b], I = Object.assign({}, ...hs.map(function (h) { return h.info || {}; }));
    const plan = wtBare_(I.planNo || (I.fields || {})['Mã KHLCNT']);
    const has = { kh: !!(plan && (kh[plan] || hb[plan])), tb: hs.some(function (h) { return h.type === 'tbmt' && (h.files || []).length; }) || hs.some(function (h) { return (h.files || []).some(function (f) { return f.sec === 'tbmt'; }); }),
      mo: hs.some(function (h) { return (h.files || []).some(function (f) { return /nhà thầu tham dự|biên bản mở thầu/i.test(wtS_(f.kind) + ' ' + wtS_(f.name)); }); }),
      kq: !!B.bares[b] };
    const score = (has.kh ? 1 : 0) + (has.tb ? 1 : 0) + (has.mo ? 1 : 0) + (has.kq ? 1 : 0);
    if (score < (+p.min || 3)) return;
    const P0 = B.per[b];
    out.push({ no: b, plan: plan, inv: I.investor || hs[0].investor, name: String(I.bidName || hs[0].name).slice(0, 90), has: has, score: score, rel: P0 ? P0.n : 0, high: P0 ? P0.mail.filter(function (x) { return x.high; }).length : 0 });
  });
  out.sort(function (a, b) { return b.score - a.score || b.high - a.high || b.rel - a.rel; });
  return { ok: true, n: out.length, list: out.slice(0, +p.n || 25) };
}
/** email 1 gói theo 4 bước + nhận xét */
function wtrPkg_(p) {
  const b = wtBare_(p.no); if (!b) return { ok: false, error: 'cần no = số TBMT' };
  const ss = wtBook_(), H = wtHits_(ss), data = wtLoad_(ss), B = wtqBuild_({ dry: true });
  let L = {}; try { L = wtgData_().lose || {}; } catch (e) {}
  let DOC = {}; try { DOC = wteHitsBy_(); } catch (e) {}
  const hs = H.filter(function (h) { return wtBare_(h.no) === b; });
  if (!hs.length) return { ok: false, error: 'chưa có gói ' + b + ' trong danh sách đã tải' };
  const I = Object.assign({}, ...hs.map(function (h) { return h.info || {}; })), F = Object.assign({}, I.fields || {}), KF = I.kqFields || {}, MF = I.moFields || {};
  const plan = wtBare_(I.planNo || F['Mã KHLCNT']);
  const khHits = plan ? H.filter(function (h) { return wtBare_(h.no) === plan; }) : [];
  const khRow = plan ? data.khmt.filter(function (r) { return wtBare_(r.no) === plan; })[0] : null;
  const tbRow = data.tbmt.filter(function (r) { return wtBare_(r.no) === b; })[0];
  const kqRow = data.kqdt.filter(function (r) { return wtBare_(r.no) === b; })[0];
  const inv = I.investor || hs[0].investor, name = I.bidName || hs[0].name;
  const pr = wtrProv_(I.prov || (tbRow || {}).prov || (kqRow || {}).prov, inv, name);
  const P0 = B.per[b] || null, tabN = { dent: 0, surg: 0 };
  (P0 ? P0.lines || [] : []).forEach(function (x) { (x.tabs || []).forEach(function (t) { tabN[t]++; }); });
  const r0 = wtrRel_(name); tabN.dent += r0.dent.kw.length + r0.dent.rule.length * 3; tabN.surg += r0.surg.kw.length + r0.surg.rule.length * 3;
  const line = /^(dent|surg)$/.test(wtS_(p.line)) ? wtS_(p.line) : (tabN.dent > tabN.surg ? 'dent' : 'surg');
  const S = wtrCss_(false), SP = wtrCss_(true), C = WTR.C;
  const links = wtrLinks_(hs, khHits), price = wtrNum_(F['Giá gói thầu'] || I.price || (tbRow || {}).price || (kqRow || {}).price);
  const KH = (khHits[0] || {}).info || {}, KHF = KH.fields || {};
  const docHits = (DOC[b] || []).concat(plan ? DOC[plan] || [] : []);
  const bid = wtrBidders_(hs);
  const lose = L[b] ? wtrUniq_([].concat.apply([], Object.keys(L[b]).map(function (k) { return L[b][k]; }))) : [];
  const kv = function (rows) { return '<table style="border-collapse:collapse;width:100%">' + rows.filter(function (r) { return wtS_(r[1]); }).map(function (r) { return '<tr><td style="' + S.td + ';width:30%;color:' + C.mute + '">' + wtH_(r[0]) + '</td><td style="' + S.td + '">' + r[1] + '</td></tr>'; }).join('') + '</table>'; };
  const lk = function (re) { return links.filter(function (l) { return re.test(l[0] + ' ' + l[2]); }).map(wtrA_).join(' · '); };
  const build = function (S, pdf) {
    let h = '';
    // 1
    h += '<h3 style="' + S.h2 + '">1. Kế hoạch lựa chọn nhà thầu</h3>' + kv([
      ['Số KHLCNT', wtH_(plan)], ['Tên kế hoạch / dự toán', wtH_(KHF['Tên KHLCNT'] || KHF['Tên dự toán mua sắm'] || I.planName || (khRow || {}).proj || '')],
      ['Ngày đăng tải', wtH_(KHF['Ngày đăng tải'] || (khRow ? wtrVn_(khRow.date) : ''))], ['Giá gói thầu trong kế hoạch', (khRow && khRow.price) ? wtrMoney_(khRow.price) + ' đ' : ''],
      ['Hình thức · phương thức', wtH_([KHF['Hình thức lựa chọn nhà thầu'] || (khRow || {}).form, KHF['Phương thức lựa chọn nhà thầu']].filter(function (x) { return wtS_(x); }).join(' · '))],
      ['Nguồn vốn', wtH_(KHF['Chi tiết nguồn vốn'] || F['Chi tiết nguồn vốn'] || F['Nguồn vốn'] || '')], ['Tài liệu', lk(/KHLCNT|kế hoạch/i)]]);
    // 2
    const docH = docHits.filter(function (d) { return d.hits && d.hits.length; });
    h += '<h3 style="' + S.h2 + '">2. Thông báo mời thầu</h3>' + kv([
      ['Số TBMT · ngày đăng', wtH_([b, F['Ngày đăng tải']].filter(function (x) { return wtS_(x); }).join(' · '))], ['Tên gói thầu', wtrMark_(name, line)], ['Chủ đầu tư', wtH_(inv + (pr[0] ? ' (' + pr[0] + ')' : ''))],
      ['Giá gói thầu', price ? wtrMoney_(price) + ' đ' : ''], ['Hình thức · phương thức', wtH_([F['Hình thức lựa chọn nhà thầu'], F['Phương thức lựa chọn nhà thầu']].filter(function (x) { return wtS_(x); }).join(' · '))],
      ['Loại hợp đồng · thời gian', wtH_([F['Loại hợp đồng'], F['Thời gian thực hiện gói thầu']].filter(function (x) { return wtS_(x); }).join(' · '))], ['Đóng thầu', wtH_(F['Thời điểm đóng thầu'] || I.close || '')],
      ['Bảo đảm dự thầu', wtH_(F['Số tiền đảm bảo dự thầu'] || F['Số tiền bảo đảm dự thầu'] || '')],
      ['Sản phẩm liên quan trong HSMT', docH.length ? docH.map(function (d) { return d.hits.slice(0, 4).map(function (x) { return '<span style="' + S.mute + '">' + wtH_(d.name) + ':</span> «' + wtrMark_(String(x.snip).slice(0, 260)) + '»'; }).join('<br>'); }).join('<br>') : '<span style="' + S.mute + '">chưa đọc HSMT / không thấy từ khoá</span>'],
      ['Tài liệu', lk(/TBMT|thông báo|HSMT|hồ sơ mời|chương|yêu cầu|tiêu chuẩn/i)]]);
    // 3
    const bl = bid ? bid.list : [];
    h += '<h3 style="' + S.h2 + '">3. Mở thầu</h3>' + (bl.length ? wtrTable_(['#', 'Nhà thầu', 'Giá dự thầu (sau giảm giá)', 'Giảm giá', 'So với giá gói'], bl.map(function (x, i) {
      const pv = x.after || x.bid, d = price && pv ? Math.round((1 - pv / price) * 1000) / 10 : null, npp = wtrNpp_(x.name);
      return [i + 1, (npp ? '<b>' : '') + wtH_(x.name) + (npp ? '</b> <span style="background:' + C.cream + '">NPP của MMH</span>' : '') + (x.lot ? '<br><span style="' + S.mute + '">' + wtH_(x.lot) + '</span>' : ''), wtrMoney_(pv) + ' đ', wtH_(x.disc || '0'), d != null ? (d >= 0 ? 'thấp hơn ' : 'cao hơn ') + Math.abs(d) + '%' : ''];
    }), S, ['4%', '', '16%', '10%', '14%']) : '<p style="' + S.mute + '">' + (MF['Tổng số nhà thầu tham dự'] ? wtH_(MF['Tổng số nhà thầu tham dự']) + ' nhà thầu tham dự — chưa đọc được danh sách.' : 'Chưa có biên bản mở thầu.') + '</p>') +
      '<p style="margin:4px 0">' + lk(/mở thầu|nhà thầu tham dự/i) + '</p>';
    // 4
    const G = P0 ? (P0.lines || []).slice().sort(function (a, c) { return (c.high ? 1 : 0) - (a.high ? 1 : 0); }) : [];
    h += '<h3 style="' + S.h2 + '">4. Kết quả lựa chọn nhà thầu</h3>' + kv([
      ['Nhà thầu trúng', wtH_(KF['Nhà thầu trúng thầu'] || KF['Tên nhà thầu trúng thầu'] || I.winner || (kqRow || {}).winner || '')],
      ['Giá trúng thầu', wtH_(KF['Giá trúng thầu'] || ((kqRow || {}).win ? wtrMoney_((kqRow || {}).win) + ' đ' : ''))], ['Ngày phê duyệt', wtH_(KF['Ngày phê duyệt'] || (kqRow ? wtrVn_(kqRow.date) : ''))],
      ['Tài liệu', lk(/kết quả|quyết định phê duyệt kq|báo cáo đánh giá|danh sách/i)]]);
    if (G.length) h += '<p style="margin:8px 0 4px"><b>Mặt hàng liên quan nhóm sản phẩm MMH (' + G.length + ' dòng):</b></p>' + wtrTable_(['Lô', 'Mặt hàng', 'Nhãn hiệu / hãng', 'Nhà thầu trúng', 'Khối lượng', 'Đơn giá', 'Thành tiền'],
      G.slice(0, pdf ? 80 : 30).map(function (g) { return [wtH_(g.lot.slice(0, 50)), (g.high ? '<b>' : '') + wtrMark_(g.name) + (g.high ? '</b>' : ''), wtH_([g.brand, g.maker].filter(function (x) { return wtS_(x); }).join(' / ')) + (g.mani ? ' <span style="background:' + C.cream + ';font-weight:bold">MANI</span>' : ''), wtH_(g.win), wtH_(wtrMoney_(g.qty) + (g.unit ? ' ' + g.unit : '')), wtrMoney_(g.price), wtrMoney_(g.amt)]; }), S);
    const losers = lose.filter(function (e) { return !e[3]; });
    if (losers.length) h += '<p style="margin:8px 0 4px"><b>Nhà thầu không trúng và lý do:</b></p>' + wtrTable_(['Nhà thầu', 'Giá dự thầu', 'Lý do'], losers.slice(0, 20).map(function (e) { const n = wtrNpp_(e[0]); return [(n ? '<b>' : '') + wtH_(e[0]) + (n ? '</b> (NPP của MMH)' : ''), e[1] ? wtrMoney_(e[1]) + ' đ' : '', wtH_(e[2] || '')]; }), S, ['35%', '15%', '']);
    // nhận xét
    const an = [];
    if (bl.length) {
      const ps = bl.map(function (x) { return x.after || x.bid; }).filter(Boolean).sort(function (a, c) { return a - c; });
      an.push(bl.length + ' nhà thầu tham dự' + (ps.length && price ? '; giá dự thầu thấp nhất ' + wtrMoney_(ps[0]) + ' đ, thấp hơn giá gói ' + Math.round((1 - ps[0] / price) * 1000) / 10 + '%' : '') + '.');
    }
    const winP = wtrNum_(KF['Giá trúng thầu'] || (kqRow || {}).win);
    if (winP && price) an.push('Giá trúng ' + wtrMoney_(winP) + ' đ, bằng ' + Math.round(winP / price * 1000) / 10 + '% giá gói.');
    if (G.length) {
      const br = {}; G.forEach(function (g) { const k = g.maker || g.brand; if (k) br[k] = (br[k] || 0) + (wtrNum_(g.amt) || 0); });
      const tb = Object.keys(br).sort(function (a, c) { return br[c] - br[a]; });
      an.push('Mặt hàng cùng nhóm sản phẩm MMH: ' + G.length + ' dòng' + (tb.length ? ', hãng trúng: ' + tb.slice(0, 4).join(', ') : '') + '.');
      an.push(G.some(function (g) { return g.mani; }) ? 'Có hàng MANI trúng thầu.' : 'Không có hàng MANI trong danh sách trúng.');
    } else an.push('Danh sách hàng hóa trúng thầu không có mặt hàng thuộc nhóm sản phẩm MMH.');
    const nppIn = bl.concat(lose.map(function (e) { return { name: e[0] }; })).map(function (x) { return wtrNpp_(x.name); }).filter(Boolean);
    if (nppIn.length) {
      const npl = nppIn.filter(function (x, i, a) { return a.indexOf(x) === i; });
      const nppLose = losers.filter(function (e) { return wtrNpp_(e[0]); });
      an.push('NPP của MMH tham dự: ' + npl.join(', ') + (nppLose.length ? ' — không trúng: ' + nppLose.map(function (e) { return wtrNpp_(e[0]) + (e[2] ? ' (' + String(e[2]).slice(0, 120) + ')' : ''); }).join('; ') : ' — có trúng thầu') + '.');
    } else an.push('Không thấy NPP của MMH trong danh sách nhà thầu tham dự.');
    if (losers.length) { const why = losers.map(function (e) { return e[2]; }).filter(function (x) { return wtS_(x); }); if (why.length) an.push(losers.length + ' nhà thầu không trúng; lý do thường gặp: ' + why.slice(0, 2).map(function (x) { return String(x).slice(0, 100); }).join(' / ') + '.'); }
    h += '<h3 style="' + S.h2 + '">Nhận xét</h3><ol style="margin:4px 0 0 18px;padding:0">' + an.map(function (x) { return '<li style="margin:2px 0">' + wtH_(x) + '</li>'; }).join('') + '</ol>';
    if (pdf) h += '<h3 style="' + S.h2 + '">Tài liệu đã tải</h3><ol style="margin:4px 0 0 18px;padding:0;font-size:9px">' + links.map(function (l) { return '<li>' + wtrA_(l) + '</li>'; }).join('') + '</ol>';
    return h;
  };
  const title = 'Gói thầu ' + b + ' – ' + inv;
  const html = '<div style="font-family:Aptos,Arial,sans-serif;font-size:14px;color:' + C.ink + '">Kính gửi anh/chị,<p>Hệ thống Theo dõi gói thầu xin gửi anh/chị thông tin đầy đủ của gói thầu <b>' + wtH_(name) + '</b> (' + wtH_(b) + ') của <b>' + wtH_(inv) + '</b>, theo 4 bước: kế hoạch lựa chọn nhà thầu, thông báo mời thầu, mở thầu và kết quả, kèm nhận xét.</p>' +
    build(S, false) + '<p>File PDF đính kèm có đầy đủ bảng và link tới mọi tài liệu đã tải.</p><p>Trân trọng,<br>MMH Product Team</p></div>';
  const pdfHtml = '<div style="font-family:Aptos,Arial,sans-serif;color:' + C.ink + '"><div style="font-size:16px;font-weight:bold;color:' + C.navy + ';text-transform:uppercase">' + wtH_(title) + '</div><div style="color:' + C.steel + ';font-size:10px;margin:2px 0 8px">' + wtH_(name) + '</div>' + build(SP, true) + '</div>';
  const res = { ok: true, no: b, plan: plan, inv: inv, bidders: bid ? bid.list.length : 0, goods: P0 ? (P0.lines || []).length : 0, losers: lose.filter(function (e) { return !e[3]; }).length, docs: links.length, docHits: docHits.length };
  if (wtS_(p.dry) === '1') return res;
  const to = wtrMailOf_(p.to || 'Giang');
  if (!to) return Object.assign(res, { ok: false, error: 'không tìm thấy email của ' + (p.to || 'Giang') });
  const pdf = wtrPdf_(pdfHtml, title.replace(/[\\/:*?"<>|]/g, ' '));
  mmhMail_({ to: to, subject: '[MẪU] [MMH · Thông tin thầu] ' + title, htmlBody: html, attachments: [pdf.blob], name: CFG.EMAIL_FROM_NAME });
  return Object.assign(res, { sent: to.split('@')[0], pdf: pdf.url });
}
function wtrAction_(p) {
  const op = wtS_(p.op) || 'status', P = PropertiesService.getScriptProperties();
  if (op === 'status') return { ok: true, v: WTR.VER, on: P.getProperty('WTR_ON') === '1', last: wtJson_(P.getProperty('WTR_LAST'), null), lastDay: P.getProperty('WTR_LAST_DAY') || '', people: wtrPeople_().map(function (x) { return [x.pic, x.area, x.mail ? x.mail.split('@')[0] : '', Object.keys(x.addon).length]; }) };
  if (op === 'find') return wtrFind_(p);
  if (op === 'pkg') return wtrPkg_(p);
  if (op === 'dry') return wtrRun_({ op: 'dry', days: +p.days || 0, pic: p.pic });
  if (op === 'sample') return wtrRun_({ op: 'sample', days: +p.days || 3, pic: wtS_(p.pic) || 'Viet Ha', to: wtS_(p.to) || 'Giang' });
  if (op === 'moq') return Object.assign({ ok: true }, wtrMoQueue_());
  if (op === 'on') { P.setProperty('WTR_ON', '1'); return { ok: true, on: true }; }
  if (op === 'off') { P.deleteProperty('WTR_ON'); return { ok: true, on: false }; }
  return { ok: false, error: 'op = status | find | pkg | dry | sample | moq | on | off' };
}
