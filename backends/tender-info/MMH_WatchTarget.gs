/* ════════════════════════════════════════════════════════════════════
   MMH_WatchTarget.gs v1.1 (20/11/2026, người dùng yêu cầu) — ĐỊA BÀN MMH + TỔNG HỢP NGẮN TỪNG GÓI THẦU

   ① ĐỊA BÀN MMH = chủ đầu tư được tự tải TBMT + Kết quả HẰNG NGÀY (bot cloud, ưu tiên 0, không tải lặp — wtReq_):
      · tên có chữ "mắt" (bệnh viện mắt) · tên có chữ "răng" / "nha khoa" (Răng Hàm Mặt, nha khoa)
      · khách CRM Surgical + CRM Dental đã khớp tên chủ đầu tư (sheet "TÊN CHUNG · ĐỐI CHIẾU": Tự khớp / Đã xác nhận)
      · sheet ẩn "THEO DÕI · ĐỊA BÀN MMH" (botTargets, nguồn kqtt-dao = bệnh viện từng có KQTT dao nhãn khoa — bulk.mjs mode targets / knife)
      Gói của địa bàn MMH: lấy mọi gói trừ gói rõ ràng không phải vật tư (WTT.EXC) — không cần tên gói chứa "vật tư".
      Gói của chủ đầu tư khác: như cũ (WTB.VT, Kết quả ⇒ bot cloud ưu tiên 1, TBMT / KHLCNT ⇒ chỉ máy có Agent).
   ② TỔNG HỢP GÓI THẦU = tab "Tổng hợp gói thầu" trong Sheet "Tổng hợp tài liệu thầu đã tải" (1 dòng / số TBMT):
      nguồn vốn · loại hợp đồng · trọn gói? · hình thức / phương thức · số lô · giá gói / giá trúng · nhà thầu trúng · chuyên khoa ·
      NHÓM SẢN PHẨM MANI có thể cung cấp · TỪ KHOÁ xuất hiện · mặt hàng khớp + hãng trúng · yêu cầu cấu hình (trích từ Danh sách hàng hóa).
      Nguồn: GÓI TÌM THẤY (thông tin bot đọc trên trang gói) + file tổng hàng hóa (MMH_WatchMerge.gs). Ghi lại ≤ 1 lần / 30 phút (wtmTick)
      hoặc ngay: botGrabInv op=sum. Từ khoá: tab "Từ khoá" của Sheet tổng hợp (mặc định WTT_KWDEF — từ gốc + cụm loại trừ).
   ════════════════════════════════════════════════════════════════════ */
const WTT = {
  SH: 'THEO DÕI · ĐỊA BÀN MMH',
  HEAD: ['Tên chủ đầu tư (Báo Đấu Thầu)', 'Khoá', 'Nguồn', 'Ghi chú', 'Cập nhật lúc'],
  SRC: { 'kqtt-dao': 'Có KQTT dao nhãn khoa', tay: 'Thêm tay' },
  RE_EYE: /mắt/i, RE_DENT: /răng|nha khoa/i,
  // gói của địa bàn MMH: bỏ gói rõ ràng không phải vật tư / dụng cụ (thuốc, hoá chất, xây dựng, dịch vụ, máy…) — trừ khi tên có WTT.STRONG
  EXC: 'kiểm định|hiệu chuẩn|thuốc|dược liệu|vị thuốc|hóa chất|hoá chất|xét nghiệm|sửa chữa|bảo dưỡng|bảo trì|xây dựng|xây lắp|cải tạo|dịch vụ|\\bthuê|phần mềm|in ấn|văn phòng phẩm|thực phẩm|suất ăn|khí y tế|\\boxy|lọc máu|chạy thận|thận nhân tạo|x-quang|x quang|\\bphim|máy|hệ thống|vắc xin|vaccine|sinh phẩm|bảo hiểm|tư vấn|giám sát|đồng phục|xăng|nhiên liệu|điện năng|vệ sinh|thu gom|rác thải|bảo vệ|mua sắm tài sản|ô tô|xe ',
  STRONG: 'phẫu thuật|mắt|phaco|nhãn khoa|chỉ khâu|thủy tinh thể|thuỷ tinh thể|dịch kính|vật tư y tế|vật tư nha khoa|vật liệu nha khoa|nha khoa|răng hàm mặt|nội nha',
  WANT: { kqdt: ['kq', 'nt', 'hh', 'qd'], tbmt: ['tbmt', 'hsmt', 'mo'] },   // TBMT: bot cloud đọc trang + "Tải TBMT"; HSMT / biên bản mở thầu ghi tên cho máy Agent tải
  TBMT_DAYS: 45,   // đặt tải tồn đọng (op=targets): TBMT chỉ lấy tin ≤ 45 ngày (gói cũ hơn đã / sắp có kết quả)
  SUM_SHEET: 'Tổng hợp gói thầu',
  SUM_EVERY_MIN: 30,
  HEAD_SUM: ['STT', 'Địa bàn MMH', 'Khu vực', 'Tỉnh thành', 'Chủ đầu tư', 'Số TBMT', 'Tên gói thầu', 'Giai đoạn', 'Ngày đăng tải', 'Đóng thầu',
    'Giá gói thầu (VND)', 'Nguồn vốn', 'Loại hợp đồng', 'Thầu trọn gói?', 'Hình thức LCNT', 'Phương thức LCNT', 'Nhiều phần / lô?', 'Số phần (lô)',
    'Thời gian thực hiện (tháng)', 'Giá trúng thầu (VND)', 'Nhà thầu trúng thầu', 'Số mặt hàng', 'Chuyên khoa', 'Nhóm sản phẩm MANI có thể cung cấp',
    'Từ khoá xuất hiện', 'Mặt hàng khớp từ khoá (hãng trúng)', 'Yêu cầu cấu hình (trích)', 'Tài liệu', 'Trang gói trên muasamcong', 'Cập nhật lúc', 'Khoá']
};
/* TỪ KHOÁ SẢN PHẨM (v1.1, 20/11/2026 — người dùng: "từ khoá cần chung hơn, không cần y hệt, có thể sót khi sản phẩm có cách diễn đạt khác")
   Mỗi nhóm = danh sách TỪ GỐC (chỉ cần chứa từ đó là bắt, "*" = mọi đuôi: "forcep*" bắt forceps / forcep) + cụm LOẠI TRỪ (bỏ khi bắt đầu bằng cụm đó, vd. "dao động", "chỉ định").
   So chữ thường, có dấu, theo nguyên từ. Cột "Từ khoá xuất hiện" ghi kèm ≤ 2 chữ phía sau để thấy ngữ cảnh.
   Người dùng tự sửa / thêm ở tab "Từ khoá" của Sheet "Tổng hợp tài liệu thầu đã tải" (tự tạo từ danh sách mặc định dưới đây; lượt ghi tổng hợp sau dùng ngay). */
const WTT_W = '[\\p{L}\\p{N}/°+%-]+(?:[.,]\\p{N}+[\\p{L}%]*)*';   // 1 chữ (số thập phân "2.2mm" giữ nguyên, dấu phẩy ngăn cách thì dừng)
const WTT_KWDEF = [
  // [nhóm, nhóm MANI / MMG?, từ gốc, loại trừ]
  ['Dao phẫu thuật (dao nhãn khoa MANI)', true, 'dao, lưỡi dao, knife, knives, blade*, scalpel*, keratome, crescent, slit, stab, mvr', 'dao động, dao cạo, slit lamp'],
  ['Chỉ khâu phẫu thuật', true, 'chỉ, suture*, vicryl, prolene, polyglactin, polyglycolic, polydioxanone, catgut, monofilament, multifilament, safil, monosyn',
    'chỉ định, chỉ số, chỉ thị, chỉ dẫn, chỉ có, chỉ được, chỉ dùng, chỉ cần, chỉ là, chỉ đạo, chỉ riêng, chỉ thêm, chỉ một, chỉ áp dụng, chỉ tính, chỉ nhận, chỉ sử dụng, chỉ khi, chỉ bao gồm, chỉ báo, chỉ hướng, chỉ điểm, chỉ huy, chỉ trong, chỉ với, chỉ cho, chỉ phục vụ, chỉ cung cấp, chỉ mang, chỉ thực hiện, chỉ chấp nhận, chỉ tiêu chuẩn, chỉ tiêu kỹ thuật'],
  ['Kim khâu / kim phẫu thuật (Eyeless)', true, 'kim khâu, kim phẫu thuật, kim tròn, kim tam giác, kim cong, kim thẳng, kim cắt, kim không lỗ, kim liền chỉ, kim spatula, needle*, eyeless, spatula', 'needle holder'],
  ['Kìm · kẹp · panh (Micro Forceps)', true, 'kìm, kềm, kẹp, panh, pince*, forcep*, ilm, bóc màng', ''],
  ['Móc (Trabeculotomy Hook)', true, 'móc, hook*, trabecul*, gonio*, sinskey, kuglen', 'móc treo, móc áo, móc khóa, móc khoá'],
  ['Trocar (Trocar Kit)', true, 'trocar*, troca, trô ca, cannula, canula, canuyn, cắt dịch kính, vitrectom*', ''],
  ['Ghim da / dập ghim (Manipler)', true, 'ghim, stapler*, staple*, bấm da, đính da, manipler', 'ghim giấy, ghim kẹp giấy, ghim bấm giấy'],
  ['Kéo phẫu thuật (rà lại)', false, 'kéo, scissor*', 'kéo dài, kéo giãn, kéo căng, kéo về, kéo theo'],
  ['Trâm nội nha (MANI / JIZAI)', true, 'trâm, file, files, k-file, h-file, k file, h file, reamer*, niti, ni-ti, jizai, protaper, nội nha, ống tủy, tủy răng, endodontic*, lentulo, gates, peeso', 'trâm cài'],
  ['Mũi khoan / mũi mài (DIA-BURS)', true, 'mũi khoan, mũi mài, mũi kim cương, mũi cắt, mũi carbide, mũi tungsten, mũi đánh bóng, mũi tròn, mũi trụ, mũi côn, bur, burs, fraise, diamond, kim cương, carbide, tungsten, dia-burs', ''],
  ['Composite / vật liệu trám (MMG)', true, 'composite*, compozit, composit, trám, nhựa trám, quang trùng hợp, flowable, nanohybrid', ''],
  ['Keo dán / Bond (Mani Bond)', true, 'bond, bonding, keo dán, chất dán, dán dính, adhesive, etch*, xoi mòn, xói mòn, acid phosphoric, axit phosphoric, primer', ''],
  ['Tẩy trắng (Mani Bleach)', true, 'tẩy trắng, làm trắng, bleach*, whitening, peroxide, carbamide', ''],
  ['Đánh bóng / mài kẽ (IPR)', true, 'đánh bóng, mài kẽ, ipr, strip, strips, polish*, đĩa mài', '']
];
const WTT_KW_SHEET = 'Từ khoá';
const WTT_KW_HEAD = ['Nhóm sản phẩm', 'Nhóm MANI / MMG? (Có / Không)', 'Từ gốc (cách nhau dấu phẩy · * = mọi đuôi)', 'Bỏ qua khi bắt đầu bằng (cách nhau dấu phẩy)'];
let WTT_KW = WTT_KWDEF;
const WTT_CTX = [
  ['Nhãn khoa', 'mắt|nhãn khoa|nhãn cầu|phaco|thủy tinh thể|thuỷ tinh thể|dịch kính|võng mạc|giác mạc|glôcôm|glaucom|mộng thịt|tiền phòng|lệ đạo|nội nhãn|\\biol\\b'],
  ['Nha khoa', 'nha khoa|răng|nội nha|ống tủy|tủy răng|implant|chỉnh nha|hàm mặt|nha chu'],
  ['Ngoại khoa', 'phẫu thuật|ngoại khoa|khâu da|vết mổ|nội soi|gây mê']
];
let WTT_RX = null;
function wttWords_(v) { return String(v || '').split(/[,;\n]/).map(function (x) { return x.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(); }).filter(String); }
function wttEsc_(w) { return w.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[\\p{L}\\p{N}-]*').replace(/ /g, '\\s+'); }
function wttRx_() {
  if (WTT_RX) return WTT_RX;
  const B0 = '(?<![\\p{L}\\p{N}])', B1 = '(?![\\p{L}\\p{N}])';
  WTT_RX = {
    kw: WTT_KW.map(function (k) {
      const w = wttWords_(k[2]).map(wttEsc_), x = wttWords_(k[3]).map(wttEsc_);
      if (!w.length) return null;
      w.sort(function (a, b) { return b.length - a.length; });   // cụm dài trước ("mũi khoan" trước "khoan")
      const ex = x.length ? '(?!(?:' + x.join('|') + ')' + B1 + ')' : '';
      return { g: k[0], mani: k[1], re: new RegExp(B0 + ex + '(?:' + w.join('|') + ')' + B1 + '(?:\\s+' + WTT_W + '){0,2}', 'gu') };
    }).filter(Boolean),
    ctx: WTT_CTX.map(function (k) { return { g: k[0], re: new RegExp(B0 + '(?:' + k[1] + ')' + B1, 'u') }; })
  };
  return WTT_RX;
}
/** đọc tab "Từ khoá" (tạo từ WTT_KWDEF nếu chưa có) ⇒ WTT_KW */
function wttKwLoad_(book) {
  try {
    let sh = book.getSheetByName(WTT_KW_SHEET);
    if (!sh) {
      sh = book.insertSheet(WTT_KW_SHEET);
      sh.getRange(1, 1, 1, WTT_KW_HEAD.length).setValues([WTT_KW_HEAD]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF').setWrap(true);
      sh.getRange(2, 1, WTT_KWDEF.length, 4).setValues(WTT_KWDEF.map(function (k) { return [k[0], k[1] ? 'Có' : 'Không', k[2], k[3]]; })).setWrap(true).setVerticalAlignment('top');
      sh.setFrozenRows(1); [260, 120, 520, 420].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
      try { sh.getRange(2, 2, 60, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Có', 'Không'], true).build()); } catch (e) {}
    }
    const V = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
    const K = V.filter(function (r) { return wtS_(r[0]) && wtS_(r[2]); }).map(function (r) { return [wtS_(r[0]), !/^(không|no|0|false)$/i.test(wtS_(r[1])), wtS_(r[2]), wtS_(r[3])]; });
    if (K.length) { WTT_KW = K; WTT_RX = null; }
  } catch (e) { Logger.log('wttKwLoad_: ' + e.message); }
  return WTT_KW;
}
function wttLow_(s) { return String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' '); }
/** text ⇒ { groups: {nhóm: số lần}, terms: {cụm: số lần} }. Cụm của nhóm "rà lại" trùng vị trí với cụm nhóm MANI ⇒ chỉ tính nhóm MANI. */
function wttScan_(text, acc) {
  const R = wttRx_(), t = wttLow_(text), o = acc || { groups: {}, terms: {}, cover: {} };
  if (!t) return o;
  R.kw.forEach(function (k) {
    k.re.lastIndex = 0;
    let m;
    while ((m = k.re.exec(t))) {
      const term = m[0].replace(/[\s.,;:/+-]+$/, '').trim();
      if (!term) { k.re.lastIndex++; continue; }
      const at = m.index + ':' + term.split(' ')[0];
      if (!k.mani && o.cover[at]) continue;           // đã thuộc nhóm MANI cụ thể hơn
      if (k.mani) o.cover[at] = 1;
      o.groups[k.g] = (o.groups[k.g] || 0) + 1;
      o.terms[term] = (o.terms[term] || 0) + 1;
    }
  });
  return o;
}
function wttCtx_(text) {
  const R = wttRx_(), t = wttLow_(text), out = [];
  R.ctx.forEach(function (c) { if (c.re.test(t)) out.push(c.g); });
  return out.length > 1 ? out.filter(function (x) { return x !== 'Ngoại khoa'; }) : out;
}

/* ══════════ ① ĐỊA BÀN MMH ══════════ */
function wttSheet_(ss) {
  const sh = wtSheet_(ss || wtBook_(), WTT.SH, WTT.HEAD);
  try { if (!sh.isSheetHidden()) sh.hideSheet(); } catch (e) {}
  return sh;
}
/** khoá CĐT (wtNorm_) ⇒ [nhãn địa bàn]. Đệm 30 phút. */
function wttTargets_(fresh) {
  const c = CacheService.getScriptCache();
  if (!fresh) { const hit = wtBigGet_(c, 'wtt_t'); if (hit) { try { return JSON.parse(hit); } catch (e) {} } }
  const ss = wtBook_(), T = {}, add = function (n, lb) { const k = wtNorm_(n); if (!k) return; T[k] = T[k] || []; if (T[k].indexOf(lb) < 0) T[k].push(lb); };
  try {
    wnRead_(ss).rows.forEach(function (x) {
      if (!x.inv || (x.st !== WN.ST.AUTO && x.st !== WN.ST.OK)) return;
      const lb = x.src === 'crm-surgical' ? 'Khách CRM Surgical' : x.src === 'crm-dental' ? 'Khách CRM Dental' : '';
      if (lb) [x.inv].concat(x.also || []).forEach(function (n) { add(n, lb); });
    });
  } catch (e) { Logger.log('wttTargets_ tên chung: ' + e.message); }
  try {
    wtRows_(wttSheet_(ss), WTT.HEAD.length).forEach(function (r) { if (wtS_(r[0])) add(r[0], WTT.SRC[wtS_(r[2])] || wtS_(r[2]) || 'Thêm tay'); });
  } catch (e) { Logger.log('wttTargets_ sheet: ' + e.message); }
  wtBigPut_(c, 'wtt_t', JSON.stringify(T), 1800);
  return T;
}
function wttLabels_(T, inv) {
  const n = wtS_(inv).normalize('NFC'), out = (T[wtNorm_(n)] || []).slice();
  if (WTT.RE_EYE.test(n)) out.unshift('Bệnh viện mắt');
  if (WTT.RE_DENT.test(n)) out.unshift('Răng Hàm Mặt / nha khoa');
  return out;
}
/** botTargets {key, src, names:[…], note} ⇒ thay toàn bộ dòng của nguồn src trong sheet ĐỊA BÀN MMH */
function wttSave_(p) {
  const src = wtS_(p.src) || 'tay';
  const names = wtbList_(p.names).map(function (n) { return n.normalize('NFC').replace(/\s+/g, ' ').trim(); }).filter(String);
  if (!names.length && !wtTrue_(p.clear)) return { ok: false, error: 'Thiếu danh sách tên chủ đầu tư.' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  try {
    const ss = wtBook_(), sh = wttSheet_(ss), keep = wtRows_(sh, WTT.HEAD.length).filter(function (r) { return wtS_(r[0]) && wtS_(r[2]) !== src; });
    const seen = {}, now = wtNow_(), note = wtS_(p.note).slice(0, 200);
    names.forEach(function (n) { const k = wtNorm_(n); if (!k || seen[k]) return; seen[k] = 1; keep.push([n, k, src, note, now]); });
    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, WTT.HEAD.length).clearContent();
    if (keep.length) sh.getRange(2, 1, keep.length, WTT.HEAD.length).setValues(keep);
  } finally { lock.releaseLock(); }
  wttTargets_(true);
  return { ok: true, src: src, n: names.length, stat: wttStat_() };
}
function wttStat_() {
  const T = wttTargets_(), st = {};
  Object.keys(T).forEach(function (k) { T[k].forEach(function (lb) { st[lb] = (st[lb] || 0) + 1; }); });
  return st;
}
/** gói của địa bàn MMH trong [from, to] (đã lọc WTT.EXC) */
function wttPick_(data, types, from, to, T) {
  T = T || wttTargets_();
  return wtbPick_({ re: '.', types: types, from: from, to: to, nameExc: WTT.EXC, nameStrong: WTT.STRONG }, data)
    .filter(function (r) { return wttLabels_(T, r.inv).length > 0; });
}
/** đặt tải gói địa bàn MMH (giữ khoá ghi ngoài): Kết quả + TBMT ⇒ bot cloud ưu tiên 0 (gói đang chờ cho máy Agent ⇒ chuyển sang cloud) */
function wttQueue_(ss, L) {
  return {
    kqdt: wtbQueue_(ss, L.kqdt || [], { want: WTT.WANT.kqdt, pri: 0, by: 'Địa bàn MMH', promote: 1 }),
    tbmt: wtbQueue_(ss, L.tbmt || [], { want: WTT.WANT.tbmt, pri: 0, by: 'Địa bàn MMH', promote: 1 })
  };
}
/** botGrabInv op=targets {from, dry} — đặt tải TỒN ĐỌNG của địa bàn MMH: Kết quả từ `from` (mặc định 01/01/2026) + TBMT ≤ 45 ngày */
function wttBacklog_(p) {
  const tz = 'Asia/Ho_Chi_Minh', today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const from = wtS_(p.from) || '2026-01-01', fromT = Utilities.formatDate(new Date(Date.now() - WTT.TBMT_DAYS * 864e5), tz, 'yyyy-MM-dd');
  const data = wtLoad_(wtBook_()), T = wttTargets_(true);
  const L = { kqdt: wttPick_(data, 'kqdt', from, today, T), tbmt: wttPick_(data, 'tbmt', from > fromT ? from : fromT, today, T) };
  const byLb = {}, byInv = {};
  L.kqdt.concat(L.tbmt).forEach(function (r) { wttLabels_(T, r.inv).forEach(function (lb) { byLb[lb] = (byLb[lb] || 0) + 1; }); byInv[r.inv] = (byInv[r.inv] || 0) + 1; });
  const ex = wtbExMap_(wtHits_(wtBook_())), st = {};
  L.kqdt.concat(L.tbmt).forEach(function (r) { const h = wtbExOf_(ex, r); const k = h ? (h.status || '(trống)') : 'mới'; st[k] = (st[k] || 0) + 1; });
  const out = { ok: true, op: 'targets', from: from, n: { kqdt: L.kqdt.length, tbmt: L.tbmt.length }, investors: Object.keys(byInv).length, byLabel: byLb, existing: st, targets: wttStat_(),
    top: Object.keys(byInv).map(function (k) { return [k, byInv[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 60) };
  if (!wtTrue_(p.run)) return out;   // mặc định chỉ xem trước; run=1 mới đặt tải
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  try { out.res = wttQueue_(wtBook_(), L); } finally { lock.releaseLock(); }
  return out;
}

/* ══════════ ② TỔNG HỢP GÓI THẦU ══════════ */
function wttSumSheet_(book) {
  let sh = book.getSheetByName(WTT.SUM_SHEET);
  if (!sh) { sh = book.insertSheet(WTT.SUM_SHEET, 0); }
  return sh;
}
/** ô ngày (Date / "yyyy-mm-dd" / "dd/mm/yyyy …") ⇒ "yyyy-mm-dd" */
function wttDay_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const t = wtS_(v); let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
}
function wttMonths_(s) { try { return wtdMonths_(s); } catch (e) { return ''; } }
/** dựng lại tab "Tổng hợp gói thầu" (≤ 1 lần / 30 phút trừ khi force) */
function wttSumBuild_(force) {
  const P = PropertiesService.getScriptProperties();
  const at = +(P.getProperty('WT_PSUM_AT') || 0);
  if (!force && Date.now() - at < WTT.SUM_EVERY_MIN * 6e4) return { skip: 'recent' };
  const t0 = Date.now(), ss = wtBook_(), H = wtHits_(ss), T = wttTargets_(), G = {};
  wttKwLoad_(wtdSumBook_());
  let heal = null; try { heal = wtdSumHeal_(); } catch (e) { Logger.log('wtdSumHeal_: ' + e.message); }   // dòng "cần Agent" đã tải xong ⇒ link thật
  // gom theo số TBMT (dòng TBMT + dòng Kết quả của cùng 1 gói)
  H.forEach(function (h) {
    if (h.type === 'khmt' || !/^IB/.test(wtBare_(h.no))) return;
    const I = h.info || {};
    const has = (I.fields && Object.keys(I.fields).length) || (I.kqFields && Object.keys(I.kqFields).length) || (h.files || []).length;
    if (!has && h.status !== WT.ST.DONE) return;
    const b = wtBare_(h.no), g = G[b] = G[b] || { b: b, hs: [], files: 0, ag: 0, agDone: 0, kq: false };
    g.hs.push(h);
    g.files += (h.files || []).length;
    (I.agentFiles || []).forEach(function (a) { g.ag++; if (a && a.done) g.agDone++; });
    if (h.type === 'kqdt' || (I.kqFields && Object.keys(I.kqFields).length)) g.kq = true;
  });
  // hàng hóa trúng thầu theo số TBMT
  let goods = { rows: [] };
  try { goods = wtgData_(); } catch (e) { Logger.log('wttSum goods: ' + e.message); }
  const GD = {};
  goods.rows.forEach(function (r) { const b = wtmBare_(r[14] || r[4]); if (!b) return; (GD[b] = GD[b] || []).push(r); if (!G[b]) G[b] = { b: b, hs: [], files: 0, ag: 0, agDone: 0, kq: true, gOnly: r }; });
  const today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'), now = wtNow_();
  const rows = [];
  Object.keys(G).forEach(function (b) {
    const g = G[b], hs = g.hs, gd = GD[b] || [];
    const pick = function (f) { for (let i = 0; i < hs.length; i++) { const v = f(hs[i], hs[i].info || {}); if (wtS_(v)) return wtS_(v); } return ''; };
    const fld = function (k) { return pick(function (h, I) { return (I.fields || {})[k] || (I.kqFields || {})[k] || (I.moFields || {})[k]; }); };
    const kqf = function (k) { return pick(function (h, I) { return (I.kqFields || {})[k]; }); };
    const gr = g.gOnly || gd[0] || [];
    const inv = pick(function (h, I) { return I.investor || (h.investor !== '(đang tra)' ? h.investor : ''); }) || wtS_(gr[2]);
    const name = pick(function (h, I) { return I.bidName || h.name; }) || wtS_(gr[3]);
    const place = fld('Địa điểm thực hiện gói thầu');
    let pr = wtdProvince_(pick(function (h, I) { return I.prov; }) || place);
    if (!pr[0] && gr[1]) pr = [wtS_(gr[1]), wtS_(gr[0])];
    const close = fld('Thời điểm đóng thầu') || pick(function (h, I) { return I.close; });
    const cDate = (close.match(/(\d{2})\/(\d{2})\/(\d{4})/) || []);
    const cIso = cDate.length ? cDate[3] + '-' + cDate[2] + '-' + cDate[1] : '';
    const stage = g.kq || gd.length ? 'Đã có kết quả' : (cIso && cIso >= today ? 'Đang mời thầu' : 'Đã đóng thầu · chưa có KQ');
    const lhd = fld('Loại hợp đồng');
    const tron = !lhd ? '' : /trọn gói/i.test(lhd) ? 'Có' : 'Không';
    const nv = fld('Chi tiết nguồn vốn') || fld('Nguồn vốn');
    const price = wtdMoney_(fld('Giá gói thầu') || pick(function (h, I) { return I.price; }));
    const win = wtdMoney_(kqf('Giá trúng thầu') || pick(function (h, I) { return I.win; }));
    const winner = kqf('Nhà thầu trúng thầu') || kqf('Tên nhà thầu trúng thầu') || pick(function (h, I) { return I.winner; }) ||
      gd.map(function (r) { return wtS_(r[6]); }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 4).join('; ');
    // từ khoá: tên gói + tên dự án + tên tài liệu HSMT + từng mặt hàng (tên · hãng · cấu hình)
    const acc = { groups: {}, terms: {}, cover: {} };
    const docNames = [];
    hs.forEach(function (h) { (h.files || []).forEach(function (f) { docNames.push(wtS_(f.name)); }); ((h.info || {}).agentFiles || []).forEach(function (a) { docNames.push(wtS_(a && a.name)); }); });
    wttScan_([name, pick(function (h, I) { return I.proj || I.planName; }), docNames.join(' · ')].join(' · '), acc);
    const hitItems = [], cfgs = [];
    gd.forEach(function (r) {
      const one = wttScan_([r[7], r[8], wtS_(r[11]).slice(0, 400)].join(' · '));
      const gs = Object.keys(one.groups);
      Object.keys(one.groups).forEach(function (k) { acc.groups[k] = (acc.groups[k] || 0) + one.groups[k]; });
      Object.keys(one.terms).forEach(function (k) { acc.terms[k] = (acc.terms[k] || 0) + one.terms[k]; });
      if (!gs.length) return;
      const mani = gs.some(function (k) { return WTT_KW.some(function (x) { return x[0] === k && x[1]; }); });
      hitItems.push({ mani: mani, t: wtS_(r[7]).slice(0, 90) + (wtS_(r[8]) ? ' (' + wtS_(r[8]).slice(0, 40) + ')' : '') + (wtS_(r[6]) ? ' — ' + wtS_(r[6]).slice(0, 50) : '') });
      if (wtS_(r[11])) cfgs.push({ mani: mani, t: '• ' + wtS_(r[7]).slice(0, 60) + ': ' + wtS_(r[11]).replace(/\s+/g, ' ').slice(0, 170) });
    });
    hitItems.sort(function (a, c) { return (c.mani ? 1 : 0) - (a.mani ? 1 : 0); });
    cfgs.sort(function (a, c) { return (c.mani ? 1 : 0) - (a.mani ? 1 : 0); });
    const maniG = WTT_KW.filter(function (k) { return k[1] && acc.groups[k[0]]; }).map(function (k) { return k[0]; });
    const terms = Object.keys(acc.terms).sort(function (a, c) { return acc.terms[c] - acc.terms[a]; }).slice(0, 14);
    const ctx = wttCtx_([inv, name, gd.slice(0, 40).map(function (r) { return r[7]; }).join(' ')].join(' '));
    let cfgTxt = cfgs.slice(0, 5).map(function (x) { return x.t; }).join('\n');
    if (!cfgTxt && !gd.length && g.ag) cfgTxt = '(chưa có danh mục hàng hóa — xem HSMT Chương V khi máy Agent tải xong)';
    const docTxt = (g.files ? g.files + ' file' : '') + (g.ag ? (g.files ? ' · ' : '') + 'cần Agent ' + (g.ag - g.agDone) + '/' + g.ag : '');
    rows.push(['', wttLabels_(T, inv).join(' · '), pr[1], pr[0], inv, b, name.slice(0, 400), stage,
      wttDay_(hs.map(function (h) { return h.date; }).filter(Boolean)[0]) || wttDay_(fld('Ngày đăng tải')), close, price, nv.slice(0, 300), lhd, tron,
      fld('Hình thức lựa chọn nhà thầu') || pick(function (h, I) { return I.form; }), fld('Phương thức lựa chọn nhà thầu'),
      fld('Gói thầu có nhiều phần/lô'), fld('Số lượng phần (lô)'),
      wttMonths_(fld('Thời gian thực hiện gói thầu') || fld('Thời gian thực hiện hợp đồng')), win, winner.slice(0, 300), gd.length || '',
      ctx.join(' · '), maniG.join(' · '), terms.join(' · '), hitItems.slice(0, 6).map(function (x) { return x.t; }).join('\n'), cfgTxt.slice(0, 1200),
      docTxt, pick(function (h, I) { return I.url; }), now, b]);
  });
  rows.sort(function (a, c) { return String(c[8]).localeCompare(String(a[8])); });
  rows.forEach(function (r, i) { r[0] = i + 1; });
  const book = wtdSumBook_(), sh = wttSumSheet_(book), W = WTT.HEAD_SUM.length;
  try { if (sh.getFilter()) sh.getFilter().remove(); } catch (e) {}
  sh.clearContents();
  sh.getRange(1, 1, 1, W).setValues([WTT.HEAD_SUM]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF').setWrap(true).setVerticalAlignment('middle');
  if (rows.length) sh.getRange(2, 1, rows.length, W).setValues(rows);
  const extra = sh.getMaxRows() - (rows.length + 1);
  if (extra > 50) { try { sh.deleteRows(rows.length + 52, extra - 50); } catch (e) {} }
  if (!P.getProperty('WT_PSUM_FMT')) {
    sh.setFrozenRows(1); sh.setFrozenColumns(6);
    [44, 170, 80, 100, 220, 120, 300, 120, 92, 120, 120, 220, 140, 70, 150, 150, 80, 60, 70, 120, 200, 60, 100, 230, 260, 300, 380, 110, 200, 120, 10]
      .forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange('K:K').setNumberFormat('#,##0'); sh.getRange('T:T').setNumberFormat('#,##0');
    sh.getRange('X:AA').setWrap(true);
    try { sh.hideColumns(W); } catch (e) {}
    P.setProperty('WT_PSUM_FMT', '1');
  }
  try { sh.getRange(1, 1, Math.max(rows.length, 1) + 1, W).createFilter(); } catch (e) {}
  const st = { at: now, heal: heal, rows: rows.length, mani: rows.filter(function (r) { return r[23]; }).length, target: rows.filter(function (r) { return r[1]; }).length, ms: Date.now() - t0 };
  P.setProperty('WT_PSUM_AT', String(Date.now()));
  P.setProperty('WT_PSUM_LAST', JSON.stringify(st));
  return Object.assign({ ok: true, url: 'https://docs.google.com/spreadsheets/d/' + book.getId() + '/edit#gid=' + sh.getSheetId() }, st);
}
