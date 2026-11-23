/* ════════════════════════════════════════════════════════════════════
   MMH_WatchDigest.gs v1.0 (23/11/2026, người dùng yêu cầu) — BÁO CÁO GÓI THẦU ĐÃ TẢI HẰNG NGÀY (PDF + 1 email / ngày)

   Mỗi ngày làm việc (T2–T7) sau WTZ.HOUR:WTZ.MIN giờ VN (chạy trong wtTick 30 phút / lần, không thêm trigger):
   ① Gom mọi gói tải xong (GÓI TÌM THẤY ▸ "Xong lúc") từ lần báo cáo trước — gộp TBMT + Kết quả cùng số.
   ② Xếp hạng theo bộ từ khoá / quy tắc của MMH_WatchSuspect.gs (keywords.csv + kqtt_rules.csv của người dùng):
      · "Có sản phẩm cùng nhóm MMH"  = mặt hàng trúng thầu (Danh sách hàng hóa) / tên gói khớp QUY TẮC làm sạch
      · "Có từ khoá sản phẩm MMH"    = chỉ khớp từ khoá (chưa chắc đúng loại — cần xem lại)
      · "Gói khác đã tải"            = không thấy từ khoá (thường là TBMT chưa đọc được danh mục hàng hóa trong HSMT)
      Trong mỗi nhóm: địa bàn MMH (bệnh viện mắt, RHM, khách CRM, bệnh viện từng có KQTT dao) trước, rồi ngày mới trước.
   ③ PDF (Google tự dựng từ HTML — Utilities…getAs PDF, không tốn phí API) lưu thư mục "Báo cáo gói thầu hằng ngày" cạnh các thư mục hồ sơ,
      mỗi gói có link bấm được: Thông báo mời thầu · Hồ sơ mời thầu · Kết quả · Danh sách hàng hóa · trang gói muasamcong · app.
   ④ 1 email / người nhận (PDF đính kèm + 15 gói đầu bảng) + RH_Notify. Người nhận: Script Property WTZ_TO (email cách dấu phẩy),
      trống ⇒ mọi người có mục theo dõi đang bật "Báo email". Kết quả chưa gộp kịp danh sách hàng hóa ⇒ mang sang báo cáo hôm sau (WTZ_CARRY).
   Chạy tay / xem trước: action botDigest {key, op: dry|pdf|send, from?} (khoá bot) · wDigest (quản lý). Trình soạn: wtzRunNow().
   ════════════════════════════════════════════════════════════════════ */
const WTZ = {
  VER: '1.0',
  HOUR: 17, MIN: 30,
  FOLDER: 'Báo cáo gói thầu hằng ngày',
  MAX_ROWS_PDF: 500,       // gói khác đã tải: tối đa trong PDF
  MAIL_TOP: 15,
  CARRY_DAYS: 3,
  LV: ['Gói khác đã tải', 'Có từ khoá sản phẩm MMH', 'Có sản phẩm cùng nhóm MMH'],
  DOC: [   // [nhãn link, mẫu nhận diện file theo loại tài liệu / tên]
    ['TBMT', /thông báo mời thầu|\btbmt\b/i],
    ['HSMT', /hồ sơ mời thầu|hsmt|chương|yêu cầu kỹ thuật|phạm vi cung cấp/i],
    ['Kết quả', /kết quả|quyết định|kqlcnt|báo cáo đánh giá/i],
    ['Hàng hóa', /danh sách hàng hóa/i],
    ['Nhà thầu', /danh sách nhà thầu/i],
    ['Mở thầu', /mở thầu|mở hồ sơ/i]
  ]
};

function wtzT_(s) { const t = new Date(String(s || '').replace(' ', 'T') + '+07:00').getTime(); return isNaN(t) ? 0 : t; }
function wtzDay_(d) { return Utilities.formatDate(d || new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function wtzVn_(d) { return Utilities.formatDate(d || new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy'); }

/** gom gói đã tải trong [from, to) ⇒ danh sách đã xếp hạng */
function wtzCollect_(from, to, carry) {
  const ss = wtBook_(), H = wtHits_(ss), G = {};
  let T = {}; try { T = wttTargets_(); } catch (e) {}
  carry = carry || {};
  H.forEach(function (h) {
    const b = wtBare_(h.no); if (!b) return;
    const t = wtzT_(h.done);
    if (!((t >= from && t < to) || carry[b])) return;
    if (h.status !== WT.ST.DONE && h.status !== WT.ST.NOFILE && !carry[b]) return;
    (G[b] = G[b] || { b: b, hs: [] }).hs.push(h);
  });
  // cả dòng khác cùng số (TBMT đã tải hôm trước + Kết quả hôm nay) ⇒ đủ link tài liệu
  H.forEach(function (h) { const b = wtBare_(h.no); if (G[b] && G[b].hs.indexOf(h) < 0) G[b].hs.push(h); });
  const B = wtqBuild_({ dry: true }), KW = WTQ_KW || wtqKwCompile_(WTQ_KWDEF), GR = wtqGroups_();
  const out = [], carryNext = {};
  Object.keys(G).forEach(function (b) {
    const g = G[b], hs = g.hs;
    const pick = function (f) { for (let i = 0; i < hs.length; i++) { const v = wtS_(f(hs[i], hs[i].info || {})); if (v) return v; } return ''; };
    const types = hs.map(function (h) { return h.type; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
    const isKq = types.indexOf('kqdt') >= 0;
    const inv = pick(function (h, I) { return I.investor || (h.investor !== '(đang tra)' ? h.investor : ''); });
    const name = pick(function (h, I) { return I.bidName || h.name; });
    // từ khoá / quy tắc trên tên gói + tên dự án + tên tài liệu
    const docs = []; hs.forEach(function (h) { (h.files || []).forEach(function (f) { docs.push(f); }); });
    const nameTxt = [name, pick(function (h, I) { return I.proj || I.planName; }), docs.map(function (f) { return wtS_(f.name); }).join(' · ')].join(' · ');
    const kwN = wtqKwHits_(KW, nameTxt), ruleN = wtqClassify_(name, nameTxt);
    // mặt hàng trúng thầu (file tổng hàng hóa)
    const P0 = B.per[b] || null, inHH = !!B.bares[b];
    const high = (P0 && P0.mail.some(function (x) { return x.high; })) || ruleN.length > 0;
    const anyKw = (P0 && P0.n > 0) || kwN.length > 0;
    const lv = high ? 2 : anyKw ? 1 : 0;
    if (isKq && !inHH && !carry[b]) carryNext[b] = Date.now();   // kết quả chưa gộp danh sách hàng hóa ⇒ báo cáo sau
    const grp = {};
    ruleN.forEach(function (c) { grp[(GR[c] || {}).name || c] = 1; });
    const L0 = P0 ? (P0.mail.length ? P0.mail : P0.top || []) : [];
    const gName = function (t) { t = wtS_(t); if (/^[A-Z]+-[A-Z-]+ · /.test(t)) return t.replace(/^[A-Z-]+ · /, ''); return t.split(/\s*[;·]\s*/).map(function (c) { return (GR[c] || {}).name || c; }).filter(function (c) { return c && !/^Mọi nhóm/.test(c); }).join(' · '); };
    L0.forEach(function (x) { const t = gName(x.grp); if (t) grp[t] = 1; });
    L0.concat(kwN).forEach(function (k) { if (!Object.keys(grp).length && k.kw) grp['Từ khoá: ' + k.kw] = 1; });
    const items = L0.slice().sort(function (a, c) { return (c.high ? 1 : 0) - (a.high ? 1 : 0); }).slice(0, 4)
      .map(function (x) { return x.name.slice(0, 80) + (x.brand ? ' (' + x.brand.slice(0, 40) + ')' : ''); });
    // link tài liệu
    const links = [];
    WTZ.DOC.forEach(function (d) {
      const f = docs.filter(function (x) { return d[1].test(wtS_(x.kind) + ' ' + wtS_(x.name)); })[0];
      if (f && f.url) links.push([d[0], f.url]);
    });
    const url = pick(function (h, I) { return I.url; });
    if (url) links.push(['Trang gói', url]);
    links.push(['App', WT.APP_URL + '#g=' + encodeURIComponent(hs[0].key)]);
    const close = pick(function (h, I) { return I.close || I.open; });
    out.push({
      b: b, lv: lv, inv: inv, prov: pick(function (h, I) { return I.prov; }), name: name, no: pick(function (h) { return h.no; }) || b,
      types: types.map(function (t) { return WT.TYPES[t] || t; }), price: wtdMoney_(pick(function (h, I) { return I.price; })),
      win: wtdMoney_(pick(function (h, I) { return I.win; })), winner: pick(function (h, I) { return I.winner; }), close: close,
      target: wttLabels_(T, inv), groups: Object.keys(grp).slice(0, 4), items: items, nLines: P0 ? P0.n : 0,
      kw: kwN.map(function (k) { return k.kw; }).slice(0, 5), links: links, files: docs.length,
      date: hs.map(function (h) { return h.done; }).filter(Boolean).sort().pop() || '', waitGoods: isKq && !inHH
    });
  });
  out.sort(function (a, c) { return c.lv - a.lv || (c.target.length ? 1 : 0) - (a.target.length ? 1 : 0) || String(c.date).localeCompare(String(a.date)); });
  return { list: out, carry: carryNext, kwUrl: wtJson_(PropertiesService.getScriptProperties().getProperty('WTQ_URL'), {}) };
}

/* ── HTML / PDF ── */
function wtzMoney_(n) { return typeof n === 'number' && n ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ' : ''; }
function wtzHtml_(D, day, forPdf) {
  const C = { navy: '#2C4A5E', steel: '#5A84A6', line: '#BCD4E6', cream: '#FBE9B7', ink: '#1F2937', mute: '#6B7280' };
  const td = 'padding:5px 6px;border-bottom:1px solid ' + C.line + ';vertical-align:top;font-size:' + (forPdf ? '9px' : '12px');
  const th = 'padding:5px 6px;background:' + C.navy + ';color:#fff;text-align:left;font-size:' + (forPdf ? '9px' : '12px');
  const n = [0, 0, 0]; D.list.forEach(function (x) { n[x.lv]++; });
  const row = function (x, i) {
    const meta = [x.types.join(' + '), x.no, x.price ? 'Giá gói ' + wtzMoney_(x.price) : '', x.win ? 'Giá trúng ' + wtzMoney_(x.win) : '',
      x.winner ? 'Trúng: ' + x.winner.slice(0, 60) : '', x.close && !x.win ? 'Đóng / mở thầu ' + x.close : ''].filter(String).join(' · ');
    const prod = (x.groups.length ? '<b>' + (x.lv === 1 ? 'Có thể: ' : '') + wtH_(x.groups.join(' · ')) + '</b>' : '') +
      (x.items.length ? '<br>' + x.items.map(wtH_).join('<br>') + (x.nLines > x.items.length ? '<br><span style="color:' + C.mute + '">+ ' + (x.nLines - x.items.length) + ' mặt hàng</span>' : '') : '') +
      (!x.items.length && x.kw.length ? '<br><span style="color:' + C.mute + '">Từ khoá: ' + wtH_(x.kw.join(', ')) + '</span>' : '') +
      (x.waitGoods ? '<br><span style="color:' + C.mute + '">Danh sách hàng hóa đang gộp</span>' : '');
    const links = x.links.map(function (l) { return '<a href="' + wtH_(l[1]) + '" style="color:' + C.steel + ';text-decoration:none">' + wtH_(l[0]) + '</a>'; }).join(' · ');
    return '<tr' + (x.lv === 2 ? ' style="background:' + C.cream + '33"' : '') + '><td style="' + td + '">' + (i + 1) + '</td>' +
      '<td style="' + td + '"><b>' + wtH_(x.inv) + '</b>' + (x.prov ? '<br><span style="color:' + C.mute + '">' + wtH_(x.prov) + '</span>' : '') +
      (x.target.length ? '<br><span style="color:' + C.navy + ';font-size:' + (forPdf ? '8px' : '11px') + '">' + wtH_(x.target.join(' · ')) + '</span>' : '') + '</td>' +
      '<td style="' + td + '">' + wtH_(String(x.name).slice(0, 220)) + '<br><span style="color:' + C.mute + '">' + wtH_(meta) + '</span></td>' +
      '<td style="' + td + '">' + (prod || '<span style="color:' + C.mute + '">—</span>') + '</td>' +
      '<td style="' + td + '">' + links + '</td></tr>';
  };
  const table = function (lv, max) {
    const L = D.list.filter(function (x) { return x.lv === lv; });
    if (!L.length) return '';
    const shown = L.slice(0, max || L.length);
    return '<h3 style="color:' + C.navy + ';font-size:' + (forPdf ? '12px' : '15px') + ';margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid ' + C.line + ';padding-bottom:3px">' +
      wtH_(WTZ.LV[lv]) + ' · ' + L.length + ' gói</h3>' +
      '<table style="border-collapse:collapse;width:100%"><tr><th style="' + th + ';width:18px">#</th><th style="' + th + ';width:22%">Bệnh viện / chủ đầu tư</th><th style="' + th + '">Gói thầu</th>' +
      '<th style="' + th + ';width:26%">Sản phẩm liên quan</th><th style="' + th + ';width:15%">Xem tài liệu</th></tr>' + shown.map(row).join('') + '</table>' +
      (L.length > shown.length ? '<p style="color:' + C.mute + ';font-size:11px">+ ' + (L.length - shown.length) + ' gói khác — xem trên app.</p>' : '');
  };
  const sheetLinks = [D.kwUrl.dent ? '<a href="' + D.kwUrl.dent + '">' + WTQ.TABS.dent + '</a>' : '', D.kwUrl.surg ? '<a href="' + D.kwUrl.surg + '">' + WTQ.TABS.surg + '</a>' : ''].filter(String).join(' · ');
  return '<div style="font-family:Aptos,Arial,sans-serif;color:' + C.ink + '">' +
    '<div style="font-size:' + (forPdf ? '16px' : '18px') + ';font-weight:bold;color:' + C.navy + ';text-transform:uppercase">Báo cáo gói thầu đã tải · ' + wtH_(day) + '</div>' +
    '<div style="color:' + C.steel + ';font-size:' + (forPdf ? '10px' : '13px') + ';margin:4px 0 10px">' + D.list.length + ' gói · ' + n[2] + ' gói có sản phẩm cùng nhóm MMH · ' + n[1] + ' gói có từ khoá sản phẩm MMH · ' + n[0] + ' gói khác</div>' +
    (forPdf ? table(2) + table(1) + table(0, WTZ.MAX_ROWS_PDF) : (table(2, WTZ.MAIL_TOP) + table(1, Math.max(5, WTZ.MAIL_TOP - n[2]))) ||
      '<p>Hôm nay chưa thấy gói nào có sản phẩm / từ khoá sản phẩm MMH. Danh sách gói đã tải có trong file PDF.</p>') +
    (sheetLinks ? '<p style="font-size:' + (forPdf ? '9px' : '12px') + ';color:' + C.mute + ';margin-top:12px">Toàn bộ mặt hàng liên quan (có cột Đánh giá để điền): ' + sheetLinks + '</p>' : '') +
    '<p style="font-size:' + (forPdf ? '8px' : '11px') + ';color:' + C.mute + '">"Cùng nhóm MMH" = khớp quy tắc làm sạch của bộ KQTT · "Có từ khoá" = mới khớp từ khoá, cần xem lại · Gói TBMT chưa đọc danh mục hàng hóa trong HSMT nên thường nằm ở "Gói khác".</p></div>';
}
function wtzFolder_() {
  const P = PropertiesService.getScriptProperties(), root = DriveApp.getFolderById(P.getProperty('WT_DL_ROOT') || WTD.ROOT);
  return wtSub_(root, WTZ.FOLDER);
}
function wtzPdf_(D, day) {
  const html = '<html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{margin:0}</style></head><body>' + wtzHtml_(D, day, true) + '</body></html>';
  const name = 'Báo cáo gói thầu ' + day.split('/').reverse().join('') + '.pdf';
  const blob = Utilities.newBlob(html, 'text/html', 'bc.html').getAs(MimeType.PDF).setName(name);
  const f = wtzFolder_().createFile(blob);
  return { blob: blob, url: f.getUrl(), id: f.getId(), name: name };
}
/** người nhận: WTZ_TO hoặc người theo dõi đang bật Báo email */
function wtzTo_() {
  const P = PropertiesService.getScriptProperties(), set = wtS_(P.getProperty('WTZ_TO'));
  if (set) return set.split(/[,;\s]+/).filter(function (x) { return /@/.test(x); }).map(function (m) { return { mail: m.toLowerCase(), pic: '' }; });
  const seen = {}, out = [];
  wtWatches_(wtBook_()).forEach(function (w) { if (w.active && w.email && w.mail && !seen[w.mail]) { seen[w.mail] = 1; out.push({ mail: w.mail, pic: w.pic }); } });
  return out;
}

/** op: dry (đếm) · pdf (dựng PDF, không email) · send (PDF + email) */
function wtzRun_(opt) {
  opt = opt || {};
  const P = PropertiesService.getScriptProperties(), now = Date.now();
  const from = opt.from ? wtzT_(opt.from + ' 00:00:00') : (+(P.getProperty('WTZ_LAST_AT') || 0) || now - 864e5);
  let carry = {}; try { carry = JSON.parse(P.getProperty('WTZ_CARRY') || '{}') || {}; } catch (e) {}
  Object.keys(carry).forEach(function (b) { if (now - carry[b] > WTZ.CARRY_DAYS * 864e5) delete carry[b]; });
  const D = wtzCollect_(from, now, carry), day = wtzVn_(new Date(now)), n = [0, 0, 0];
  D.list.forEach(function (x) { n[x.lv]++; });
  const res = { ok: true, from: Utilities.formatDate(new Date(from), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'), total: D.list.length, high: n[2], kw: n[1], other: n[0],
    carry: Object.keys(D.carry).length, top: D.list.slice(0, 12).map(function (x) { return [WTZ.LV[x.lv], x.inv, x.no, x.groups.join(' · ')]; }) };
  if (opt.op === 'dry') return res;
  const pdf = wtzPdf_(D, day);
  res.pdf = pdf.url;
  if (opt.op === 'send') {
    const to = wtzTo_(), feed = [];
    const subj = '[Theo dõi gói thầu] Báo cáo ngày ' + day + ': ' + D.list.length + ' gói đã tải · ' + n[2] + ' gói có sản phẩm cùng nhóm MMH';
    const body = wtzHtml_(D, day, false);
    to.forEach(function (r) {
      try {
        mmhMail_({ to: r.mail, subject: subj, name: CFG.EMAIL_FROM_NAME, attachments: [pdf.blob],
          htmlBody: '<div style="font-family:Aptos,Arial,sans-serif;font-size:14px;color:#1F2937">Dear ' + wtH_(r.pic || 'anh/chị') + ',<br><br>Báo cáo các gói thầu đã tải hôm nay, gói có sản phẩm liên quan nhóm sản phẩm MMH ở đầu. ' +
            'Bản đầy đủ: file PDF đính kèm (<a href="' + pdf.url + '">mở trên Drive</a>).<br><br>' + body + '<br>Best regards,<br>MMH Product Team</div>' });
        if (r.pic) feed.push(wtFeedRow_(r.pic, 'digest', 'Báo cáo gói thầu ' + day + ': ' + n[2] + ' gói có sản phẩm cùng nhóm MMH', D.list.slice(0, 8).map(function (x) { return '• ' + x.inv + ' · ' + String(x.name).slice(0, 80); }).join('\n'), pdf.url));
      } catch (e) { Logger.log('wtz mail ' + r.mail + ': ' + e.message); res.mailErr = e.message; }
    });
    wtFeed_(feed);
    res.sent = to.length;
    P.setProperty('WTZ_LAST_AT', String(now));
    P.setProperty('WTZ_DAY', wtzDay_(new Date(now)));
    P.setProperty('WTZ_CARRY', JSON.stringify(D.carry).slice(0, 8000));
    P.setProperty('WTZ_LAST', JSON.stringify({ at: wtNow_(), total: res.total, high: n[2], kw: n[1], other: n[0], sent: res.sent, pdf: pdf.url }));
  }
  return res;
}
/** wtTick: đúng 1 lần / ngày làm việc, sau giờ hẹn */
function wtzTick_() {
  const P = PropertiesService.getScriptProperties(), d = new Date();
  if (P.getProperty('WTZ_OFF') === '1' || P.getProperty('WTR_ON') === '1' || P.getProperty('WTZ_DAY') === wtzDay_(d)) return null;
  const hm = +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'H') * 60 + +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'm');
  const wd = +Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'u');   // 1 = thứ Hai … 7 = Chủ nhật
  if (wd === 7 || hm < WTZ.HOUR * 60 + WTZ.MIN) return null;
  return wtzRun_({ op: 'send' });
}
function wtzAction_(p) {
  const op = wtS_(p.op) || 'status';
  if (op === 'status') { const P = PropertiesService.getScriptProperties(); return { ok: true, v: WTZ.VER, last: wtJson_(P.getProperty('WTZ_LAST'), null), day: P.getProperty('WTZ_DAY') || '', to: wtzTo_().map(function (r) { return r.pic || r.mail.split('@')[0]; }), at: WTZ.HOUR + ':' + WTZ.MIN }; }
  if (op === 'dry' || op === 'pdf' || op === 'send') return wtzRun_({ op: op, from: wtS_(p.from) });
  return { ok: false, error: 'op = status | dry | pdf | send' };
}
function wtzRunNow() { return wtzRun_({ op: 'send' }); }
