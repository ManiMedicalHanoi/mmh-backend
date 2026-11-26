/* ════════════════════════════════════════════════════════════════════
   MMH_WatchBulk.gs v1.3 (20/11/2026, người dùng yêu cầu) — ĐẶT TẢI HÀNG LOẠT THEO NHÓM CHỦ ĐẦU TƯ + RÀ HÀNG HÓA THEO TỪ KHOÁ
   (khoá bot WT_BOT_KEY, gọi từ workflow "Theo dõi gói thầu — tải hàng loạt" ▸ tools/msc/bulk.mjs)

   botGrabInv {key, re, from, to, types, want, op: dry|run, max, mail}
     Đọc 3 tab dữ liệu Báo Đấu Thầu (wtLoad_) ⇒ gói có tên chủ đầu tư khớp re (mặc định "mắt", so chữ có dấu, không phân biệt hoa thường,
     nên "Răng Hàm Mặt" không khớp) · ngày tin trong [from, to] · loại trong types (mặc định kqdt + tbmt, KHÔNG lấy KHLCNT).
     Mỗi số TBMT 1 việc: có kết quả ⇒ khoá kqdt:<số>, chưa có ⇒ tbmt:<số> (bot mở cùng 1 trang gói: TBMT, HSMT, mở thầu, kết quả).
     Gói đã có trong GÓI TÌM THẤY (mọi loại trừ khmt, cùng số) ⇒ wtReq_ (đang tải / chờ tải ⇒ gộp loại tài liệu; đã tải ⇒ bỏ qua).
     want mặc định = mọi loại trừ kh. mail (tuỳ chọn, email công ty) = người theo dõi gói ⇒ thấy trong app. op=dry chỉ đếm.
     invs (tuỳ chọn, v1.1) = mảng tên chủ đầu tư đúng như Báo Đấu Thầu ⇒ chỉ lấy gói của các chủ đầu tư này (bỏ qua re).
     pri (số, thấp = trước) · ag=1 (chỉ máy có Agent) · types thêm khmt (KHLCNT, số PL) · op=auto (tự đặt hằng ngày, xem wtbAuto_) · op=autoStatus.
     nameInc / nameExc / nameStrong / nameHard / nameWeak / nameIncOpt (tuỳ chọn, regex chữ thường có dấu) = lọc theo TÊN GÓI, xét TỪNG VẾ (v2 21/11/2026, xem WTB.VT).
     v1.3: op=targets (tồn đọng ĐỊA BÀN MMH, run=1 mới đặt tải) · op=sum (ghi ngay tab "Tổng hợp gói thầu") · op=scan&text= (thử bộ từ khoá) — MMH_WatchTarget.gs.
     Bộ lọc vật tư (WTB.VT) nay nhận cả gói nha khoa / răng (trước bị loại).
   botGoodsScan {key, inc, exc, codes, re, from}
     Rà 2 file tổng hàng hóa trúng thầu (wtgData_, MMH_WatchMerge.gs): dòng có Danh mục / Hãng / Cấu hình chứa 1 cụm trong inc
     hoặc 1 mã trong codes (so không dấu, theo nguyên từ) và không chứa cụm trong exc ⇒ trả từng dòng (chỉ đọc).
   ════════════════════════════════════════════════════════════════════ */
const WTB = { MAX: 3000, WANT_DEF: ['tbmt', 'hsmt', 'mo', 'kq', 'nt', 'hh', 'qd'],
  // bộ lọc TÊN GÓI "vật tư y tế" v2 (21/11/2026, người dùng yêu cầu) — xét TỪNG VẾ của tên gói (tách ở "và", dấu phẩy, ; + / ( ) " - "):
  //   Tên có từ LOẠI CẢ GÓI (all: dịch vụ, sửa chữa, kiểm định…) ⇒ bỏ. Còn lại: 1 vế đạt khi: không có từ LOẠI VẾ (hard) VÀ (có từ CHẮC CHẮN (strong) HOẶC (có từ VẬT TƯ (inc) và không có từ LOẠI MỀM (exc)))
  //   ⇒ "Hóa chất xét nghiệm và vật tư tiêu hao", "Thuốc và vật tư tiêu hao" vẫn nhận; "Thuốc generic … Bệnh viện Mắt" bị bỏ.
  //   Hóa chất / xét nghiệm (weak) KHÔNG còn loại khi vế có từ vật tư; chỉ dùng cho địa bàn MMH (nameIncOpt: vế không có từ vật tư nào
  //   thì cả tên phải sạch hard + exc + weak). GIỐNG tools/msc/knife-extra.json (sửa 1 nơi chép nơi kia).
  VT: {
    inc: ['vật tư', 'vật liệu (?:y tế|nha khoa|tiêu hao|cầm máu|phẫu thuật|cấy ghép|khâu)', 'vtyt', 'vtth', 'dụng cụ', 'y cụ', 'áo choàng', 'trang thiết bị y tế', 'thiết bị y tế', 'phẫu thuật', 'phẫu', '(?<!viện |bv |tâm )mắt', 'nhãn khoa', 'nhãn cầu',
      '(?<!hóa chất |hoá chất )tiêu hao', 'dùng một lần', 'sử dụng một lần', '(?:^|[^a-zà-ỹđ])chỉ(?![a-zà-ỹđ])(?!\\s+(?:định|số|đạo|tiêu|thị|huy|dẫn|có|được|là|riêng|cần|mới|còn|cho phép))',
      'khâu', '\\bdao\\b(?! động)', 'lưỡi dao', '\\bkim\\b(?! loại)', 'kéo(?! dài)', 'kẹp', 'kìm', '\\bpanh', 'nhíp', 'ghim', 'trocar', 'catheter', 'sonde', 'ống thông',
      'dẫn lưu', 'stent', 'găng', 'băng gạc', 'băng dính', 'băng keo', '\\bgạc', 'bông y tế', 'bông gòn', 'bông hút', 'thủy tinh thể', 'thuỷ tinh thể', '\\biol\\b',
      'dịch kính', 'phaco', 'dịch nhầy', '\\bnhầy', 'chỉnh hình', 'implant', 'nha khoa', 'răng', 'nội nha', 'trâm',
      'mũi khoan', 'kim cương', 'composite', '\\btrám', 'keo dán', 'tẩy trắng', 'chỉnh nha'].join('|'),
    // LOẠI CẢ GÓI: dịch vụ / sửa chữa / kiểm định / xây dựng… (có vật tư đi kèm vẫn là gói dịch vụ)
    all: 'kiểm định|hiệu chuẩn|sửa chữa|bảo dưỡng|bảo trì|xây dựng|xây lắp|cải tạo|dịch vụ|phần mềm|in ấn|văn phòng phẩm|bảo hiểm|tư vấn|giám sát|đồng phục|' +
      'xăng|nhiên liệu|điện năng|thu gom|rác thải|bảo vệ|ô tô',
    // LOẠI VẾ: thuốc / sinh phẩm / đồ nội thất y tế… — vế khác có vật tư thì gói vẫn nhận ("Thuốc và vật tư tiêu hao")
    hard: 'thuốc|dược liệu|dược phẩm|vắc xin|vaccine|sinh phẩm|châm cứu|thực phẩm|suất ăn|\\bthuê|ghế|giường|bàn mổ|đèn mổ|bồn rửa|\\btủ |xe đẩy|\\bcáng',
    exc: 'khí y tế|\\boxy|lọc máu|chạy thận|thận nhân tạo|x-quang|x quang|\\bphim|máy|hệ thống|vệ sinh|mua sắm tài sản|\\bxe |siêu âm|nội soi|linh kiện',
    weak: 'hóa chất|hoá chất|xét nghiệm',
    strong: 'phẫu thuật|dụng cụ|y cụ|(?<!viện |bv |tâm )mắt|phaco|nhãn khoa|chỉ khâu|thủy tinh thể|thuỷ tinh thể|dịch kính|vật tư y tế|vật tư nha khoa|vật liệu nha khoa|' +
      'nha khoa|răng hàm mặt|nội nha' },
  SPLIT: /\s+và\s+|\s+&\s+|\s+[-–]\s+|[,;+()\/]/,
  // tự đặt tải hằng ngày (wtbAuto_): Kết quả ⇒ bot cloud (KQ + 2 Excel; QĐ chỉ ghi tên cho Agent) · TBMT / KHLCNT ⇒ CHỈ máy có Agent (ag)
  AUTO: { kqdt: ['kq', 'nt', 'hh', 'qd'], tbmt: ['tbmt', 'hsmt', 'mo'], khmt: ['kh'], BACK_DAYS: 3, PRI: 1 } };

/** tham số lọc tên gói vật tư (WTB.VT) cho wtbPick_; incOpt = địa bàn MMH (không bắt buộc từ vật tư) */
function wtbVtP_(incOpt) {
  return { nameInc: WTB.VT.inc, nameExc: WTB.VT.exc, nameStrong: WTB.VT.strong, nameHard: WTB.VT.hard, nameWeak: WTB.VT.weak, nameAll: WTB.VT.all, nameIncOpt: incOpt ? 1 : '' };
}

function wtbList_(v) {
  if (Array.isArray(v)) return v.map(wtS_).filter(String);
  const s = wtS_(v);
  if (!s) return [];
  if (/^\[/.test(s)) { const j = wtJson_(s, []); return Array.isArray(j) ? j.map(wtS_).filter(String) : []; }
  return s.split(/[,;\n]/).map(wtS_).filter(String);
}

/** hàm lọc tên gói theo vế (dùng ở wtbPick_ + thử nghiệm): p.nameInc / nameExc / nameStrong / nameHard / nameWeak / nameIncOpt */
function wtbNameFn_(p, rx) {
  rx = rx || function (v) { const t = wtS_(v); return t ? new RegExp(t.normalize('NFC').toLowerCase()) : null; };
  const NI = rx(p.nameInc), NE = rx(p.nameExc), NS = rx(p.nameStrong), NH = rx(p.nameHard), NW = rx(p.nameWeak), NA = rx(p.nameAll), opt = wtTrue_(p.nameIncOpt);
  if (!NI && !NE && !NS && !NH && !NW && !NA) return function () { return true; };
  return function (nm) {
    // bỏ tiền tố "Mã TBMT : IB…-00-" / "Gói thầu số 13:" (mã gói như "TBYT 01" không phải từ vật tư)
    const t = wtS_(nm).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').replace(/^mã tbmt\s*:\s*\S+?-\d{2}-/, '')
      .replace(/^gói(?: thầu)?(?: số)?(?:\s*[\w.\/-]+){0,3}\s*:\s*/, '');
    if (NA && NA.test(t)) return false;
    const seg = t.split(WTB.SPLIT).map(function (x) { return x.trim(); }).filter(String);
    for (let i = 0; i < seg.length; i++) {
      const g = seg[i];
      if (NH && NH.test(g)) continue;
      if (NS && NS.test(g)) return true;
      if (NI && NI.test(g) && !(NE && NE.test(g))) return true;
    }
    if (NI && !opt) return false;
    // không có vế vật tư rõ ràng: (địa bàn MMH / bộ lọc không có từ vật tư) ⇒ nhận khi cả tên sạch từ loại
    return !(NH && NH.test(t)) && !(NE && NE.test(t)) && !(NW && NW.test(t));
  };
}

function wtbPick_(p, data0) {
  const re = new RegExp(wtS_(p.re) || 'mắt', 'i');
  // invs = danh sách TÊN CHỦ ĐẦU TƯ đúng y như Báo Đấu Thầu (bulk.mjs đã đối chiếu, vd. bệnh viện từng có KQTT dao nhãn khoa) ⇒ thay cho re
  const IV = {}; wtbList_(p.invs).forEach(function (n) { IV[n.normalize('NFC').replace(/\s+/g, ' ').trim()] = 1; });
  const useIv = Object.keys(IV).length > 0;
  // lọc theo TÊN GÓI v2 (21/11/2026): xét từng vế — xem WTB.VT
  const rx = function (v) { const t = wtS_(v); return t ? new RegExp(t.normalize('NFC').toLowerCase()) : null; };
  const nameOk = wtbNameFn_(p, rx);
  const from = wtS_(p.from) || '2026-01-01', to = wtS_(p.to) || '9999-12-31';
  const types = wtbList_(p.types).filter(function (t) { return t === 'kqdt' || t === 'tbmt' || t === 'khmt'; });
  const T = types.length ? types : ['kqdt', 'tbmt'];
  const data = data0 || wtLoad_(wtBook_()), g = {};
  T.forEach(function (type) {
    (data[type] || []).forEach(function (r) {
      const inv = wtS_(r.inv).normalize('NFC');
      if (!r.no || !(useIv ? IV[inv.replace(/\s+/g, ' ').trim()] : re.test(inv))) return;
      if (!nameOk(r.name)) return;
      const d = r.date || r.upd || '';
      if (!d || d < from || d > to) return;
      const b = wtBare_(r.no);
      if (type === 'khmt') { if (!/^PL/.test(b)) return; g['K|' + b] = g['K|' + b] || r; return; }   // KHLCNT (số PL…) — việc riêng
      if (!/^IB/.test(b)) return;
      const cur = g[b];
      if (!cur || (cur.type !== 'kqdt' && type === 'kqdt')) g[b] = r;
    });
  });
  return Object.keys(g).map(function (b) { return g[b]; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

/** Dòng đã có trong GÓI TÌM THẤY cho 1 gói theo ĐÚNG LOẠI (v1.2): Kết quả chỉ khớp dòng kqdt (trước khớp cả dòng TBMT đã tải ⇒ kết quả không bao giờ được tải);
 *  TBMT khớp dòng tbmt hoặc kqdt cùng số; KHLCNT khớp dòng khmt cùng số. */
function wtbExMap_(H) {
  const m = {};
  H.forEach(function (h) { const k = (h.type === 'khmt' ? 'khmt|' : h.type === 'kqdt' ? 'kqdt|' : 'tbmt|') + wtBare_(h.no); m[k] = m[k] || h; });
  return m;
}
function wtbExOf_(m, r) {
  const b = wtBare_(r.no);
  if (r.type === 'khmt') return m['khmt|' + b];
  if (r.type === 'kqdt') return m['kqdt|' + b];
  return m['tbmt|' + b] || m['kqdt|' + b];
}
/** Đưa list vào hàng đợi (giữ khoá ghi ngoài). opt: {want (mảng theo loại hoặc chung), pri, ag, by, mail, force, max, promote} */
function wtbQueue_(ss, list, opt) {
  const res = { queued: 0, merged: 0, skipDone: 0, skipWork: 0, added: 0 };
  const me = { mail: opt.mail || '', pic: opt.by || 'Tải hàng loạt', local: wtLocal_(opt.mail || '') };
  const sh = wtSheet_(ss, WT.SH_H, WT.HH), ex = wtbExMap_(wtHits_(ss)), now = wtNow_(), add = [];
  const wantOf = function (t) { const w = opt.want || []; return Array.isArray(w) ? w : (w[t] || []); };
  list.slice(0, opt.max || 5000).forEach(function (r) {
    const want = wantOf(r.type), h = wtbExOf_(ex, r);
    if (h) {
      const q = wtReq_(sh, h, me, want, opt.force, !me.mail);
      if (!q.skip && h.row > 0) {   // vào lại hàng đợi ⇒ gắn mức ưu tiên / cờ chỉ cho Agent của lượt này
        const ag0 = typeof opt.ag === 'function' ? opt.ag(r) : opt.ag, inf = Object.assign({}, h.info || {});
        if (want.length) inf.want = want; else delete inf.want;
        if (typeof opt.pri === 'number') inf.pri = opt.pri;
        if (ag0) inf.ag = 1; else delete inf.ag;
        sh.getRange(h.row, 7).setValue(JSON.stringify(inf));
      }
      if (q.skip === 'wait' && opt.promote && h.row > 0) {   // v1.3: gói địa bàn MMH đang chờ (vd. chờ máy Agent) ⇒ nâng ưu tiên + cho bot cloud nhận
        const inf = Object.assign({}, h.info || {}), cur = (wtJson_(wtS_(sh.getRange(h.row, 7).getValue()), {}) || {}).want;
        if (Array.isArray(cur)) { if (cur.length) inf.want = cur; else delete inf.want; }
        let ch = false;
        if (typeof opt.pri === 'number' && !(typeof inf.pri === 'number' && inf.pri <= opt.pri)) { inf.pri = opt.pri; ch = true; }
        if (!opt.ag && inf.ag) { delete inf.ag; ch = true; }
        if (ch) { sh.getRange(h.row, 7).setValue(JSON.stringify(inf)); res.promoted = (res.promoted || 0) + 1; }
      }
      if (!q.skip) res.queued++; else if (q.skip === 'wait') res.merged++; else if (q.skip === 'work') res.skipWork++; else res.skipDone++;
      return;
    }
    const info = { proj: wtS_(r.proj), price: wtS_(r.price), win: wtS_(r.win), winner: wtS_(r.winner), form: wtS_(r.form), open: wtS_(r.open), prov: wtS_(r.prov), n: r.n || 1, grab: 1, bulk: 1, by: me.pic, want: want };
    if (typeof opt.pri === 'number') info.pri = opt.pri;
    const ag = typeof opt.ag === 'function' ? opt.ag(r) : opt.ag;
    if (ag) info.ag = 1;
    add.push([r.type + ':' + r.no, r.type, r.no, r.inv, r.invKey, wtS_(r.name).slice(0, 400), JSON.stringify(info), r.date || '', now, me.mail, WT.ST.WAIT, '[]', 0, now, '', '', r.type + '!' + r.row]);
    ex[(r.type === 'khmt' ? 'khmt|' : r.type === 'kqdt' ? 'kqdt|' : 'tbmt|') + wtBare_(r.no)] = { status: WT.ST.WAIT, watchers: [], info: info, row: -1 };
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, WT.HH.length).setValues(add);
  res.added = add.length;
  try { CacheService.getScriptCache().remove('wt_q'); } catch (e) {}
  return res;
}

function wtbGrabInv_(p) {
  if (wtS_(p.op) === 'narrow') return wtbNarrow_(p);
  if (wtS_(p.op) === 'auto') return wtbAuto_(null, { dry: wtTrue_(p.dry), from: wtS_(p.from) });
  if (wtS_(p.op) === 'targets') return wttBacklog_(p);                                   // MMH_WatchTarget.gs — tồn đọng địa bàn MMH
  if (wtS_(p.op) === 'errs') return wtbErrs_(p);                                          // thống kê gói Lỗi (chỉ đọc)
  if (wtS_(p.op) === 'refind') return wtbRefind_(p);
  if (wtS_(p.op) === 'vtcmp') return wtbVtCmp_(p);                                        // so bộ lọc tên gói cũ / mới (chỉ đọc)                                      // gói "Không tìm thấy số" ⇒ Chờ tải lại (run=1)
  if (wtS_(p.op) === 'sum') return wttSumBuild_(true);
  if (wtS_(p.op) === 'sumheal') return wtdSumHeal_();                                     // dọn dòng "cần Agent" đã tải xong (tab Tài liệu)                                    // ghi ngay tab "Tổng hợp gói thầu"
  if (wtS_(p.op) === 'scan') { try { wttKwLoad_(wtdSumBook_()); } catch (e) {} const sc = wttScan_(wtS_(p.text)); delete sc.cover; return { ok: true, scan: sc, ctx: wttCtx_(wtS_(p.text)), groups: WTT_KW.length }; }   // thử bộ từ khoá
  if (wtS_(p.op) === 'autoStatus') { const P = PropertiesService.getScriptProperties(); return { ok: true, mark: P.getProperty('WT_AUTO_FROM') || '', last: wtJson_(P.getProperty('WT_AUTO_LAST') || '', null), targets: wttStat_(), sum: wtJson_(P.getProperty('WT_PSUM_LAST') || '', null) }; }
  const run = wtS_(p.op) === 'run', force = wtTrue_(p.force);
  const max = Math.min(+p.max || 2000, 10000);
  let want = wtWant_(wtbList_(p.want));
  if (!wtbList_(p.want).length) want = WTB.WANT_DEF.slice();
  const mail = wtS_(p.mail).toLowerCase();
  if (mail && !/@(manimedicalhanoi\.com|mani\.inc)$/.test(mail)) return { ok: false, error: 'mail phải là email công ty.' };
  const list = wtbPick_(p);
  const byInv = {}, byType = { kqdt: 0, tbmt: 0 }, byMonth = {};
  list.forEach(function (r) { byInv[r.inv] = (byInv[r.inv] || 0) + 1; byType[r.type]++; const m = String(r.date).slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; });
  const out = { ok: true, op: run ? 'run' : 'dry', want: want, total: list.length, byType: byType, byMonth: byMonth,
    byInv: Object.keys(byInv).map(function (k) { return [k, byInv[k]]; }).sort(function (a, b) { return b[1] - a[1]; }) };
  const ss = wtBook_(), exM = wtbExMap_(wtHits_(ss));
  const st = {}; let fresh = 0;
  list.forEach(function (r) { const h = wtbExOf_(exM, r); if (h) st[h.status || '(trống)'] = (st[h.status || '(trống)'] || 0) + 1; else fresh++; });
  out.existing = st; out.fresh = fresh;
  out.sample = list.slice(-15).map(function (r) { return [r.type, r.no, r.date, r.inv, wtS_(r.name).slice(0, 90)]; });
  if (!run) return out;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  let res;
  const pri = p.pri === undefined || p.pri === '' ? undefined : +p.pri;
  try { res = wtbQueue_(ss, list, { want: want, pri: isNaN(pri) ? undefined : pri, ag: wtTrue_(p.ag), mail: mail, force: force, max: max, by: 'Tải hàng loạt' }); }
  finally { lock.releaseLock(); }
  PropertiesService.getScriptProperties().setProperty('WT_BULK_LAST', JSON.stringify({ at: wtNow_(), re: wtbList_(p.invs).length ? 'danh sách ' + wtbList_(p.invs).length + ' CĐT' : (wtS_(p.re) || 'mắt'), from: wtS_(p.from) || '2026-01-01', total: list.length, res: res }));
  out.res = res;
  return out;
}

function wtbGoodsScan_(p) {
  const d = wtgData_();
  const inc = wtbList_(p.inc).map(wtmK_).filter(String), exc = wtbList_(p.exc).map(wtmK_).filter(String);
  const codes = wtbList_(p.codes).map(wtmK_).filter(String);
  const brands = wtbList_(p.brands).map(wtmK_).filter(String);   // so với cột Hãng sản xuất
  const re = wtS_(p.re) ? new RegExp(wtS_(p.re), 'i') : null;
  const has = function (txt, ph) { return (' ' + txt + ' ').indexOf(' ' + ph + ' ') >= 0; };
  const rows = [];
  d.rows.forEach(function (r) {
    if (re && !re.test(wtS_(r[2]).normalize('NFC'))) return;
    const txt = wtmK_([r[7], r[8], r[11]].join(' '));
    const hi = inc.filter(function (x) { return has(txt, x); }), hc = codes.filter(function (x) { return has(txt, x); });
    const hk = wtmK_(r[8]), hb = brands.filter(function (x) { return has(hk, x); });
    if (!hi.length && !hc.length && !hb.length) return;
    if (!hb.length && exc.some(function (x) { return has(txt, x); })) return;
    rows.push({ inv: r[2], prov: r[1], pkg: r[3], no: r[4], lot: r[5], win: r[6], item: r[7], hang: r[8], dvt: r[9], qty: r[10], price: r[12], amount: r[13],
      cfg: wtS_(r[11]).slice(0, 400), kw: hi, code: hc, brand: hb });
  });
  const pk = {}; d.rows.forEach(function (r) { pk[r[14]] = 1; });
  return { ok: true, scanned: d.rows.length, pkgs: Object.keys(pk).length, n: rows.length, rows: rows.slice(0, +p.max || 8000), cut: rows.length > (+p.max || 8000), mg: wtmUrls_() };
}

/** botSheetRead {key, tab, off, n, cols, re} (26/11/2026, phân tích thị trường nha khoa — CHỈ ĐỌC) ⇒ đọc 1 tab của file tổng hàng hóa theo trang.
 *  tab: mặc định sheet chính "Hàng hóa trúng thầu"; chỉ nhận sheet chính, "SP liên quan · …", "LỌC · …". cols = tên tiêu đề cần lấy (JSON / phẩy, trống = mọi cột).
 *  re = biểu thức (không phân biệt hoa thường) lọc trên các cột đã chọn ghép lại. off = dòng dữ liệu bắt đầu (0 = dòng ngay sau tiêu đề), n ≤ 20000. */
function wtbSheetRead_(p) {
  const id = PropertiesService.getScriptProperties().getProperty(WTM.KIND.hh.prop);
  if (!id) return { ok: false, error: 'Chưa có file tổng hàng hóa.' };
  const tab = wtS_(p.tab) || WTM.KIND.hh.sheet;
  if (tab !== WTM.KIND.hh.sheet && tab.indexOf('SP liên quan') !== 0 && tab.indexOf('LỌC · ') !== 0) return { ok: false, error: 'Tab không được phép.' };
  const sh = SpreadsheetApp.openById(id).getSheetByName(tab);
  if (!sh) return { ok: false, error: 'Không có tab ' + tab };
  const last = sh.getLastRow(), lc = sh.getLastColumn();
  let hr = 1; const top = sh.getRange(1, 1, Math.min(3, last), lc).getValues();
  for (let i = 0; i < top.length; i++) { if (top[i].filter(String).length >= 5) { hr = i + 1; break; } }
  const head = top[hr - 1].map(wtS_);
  const want = typeof p.cols === 'string' ? (wtS_(p.cols).charAt(0) === '[' ? wtJson_(p.cols, []) : wtbList_(p.cols)) : (p.cols || []);
  const ix = want.length ? want.map(function (c) { return head.indexOf(c); }) : head.map(function (_, i) { return i; });
  const off = Math.max(0, +p.off || 0), n = Math.min(20000, Math.max(1, +p.n || 5000));
  const r0 = hr + 1 + off, cnt = Math.min(n, last - r0 + 1);
  const re = wtS_(p.re) ? new RegExp(wtS_(p.re), 'i') : null;
  const rows = [];
  if (cnt > 0) sh.getRange(r0, 1, cnt, lc).getValues().forEach(function (r) {
    const v = ix.map(function (j) { const x = j >= 0 ? r[j] : ''; return x instanceof Date ? Utilities.formatDate(x, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : x; });
    if (re && !re.test(v.join(' | '))) return;
    if (!v.some(function (x) { return x !== '' && x !== null; })) return;
    rows.push(v);
  });
  return { ok: true, tab: tab, last: last, headRow: hr, dataRows: Math.max(0, last - hr), off: off, read: Math.max(0, cnt), next: cnt > 0 && r0 + cnt <= last ? off + cnt : -1,
    head: ix.map(function (j) { return j >= 0 ? head[j] : ''; }), allHead: head, rows: rows };
}

/** botGoodsWrite {key, tab, head:[...], rows:[[...]], note} ⇒ ghi (thay toàn bộ) 1 tab kết quả lọc trong file tổng hàng hóa (tên tab bắt đầu "LỌC · ") */
function wtbGoodsWrite_(p) {
  const id = PropertiesService.getScriptProperties().getProperty(WTM.KIND.hh.prop);
  if (!id) return { ok: false, error: 'Chưa có file tổng hàng hóa.' };
  let tab = wtS_(p.tab) || 'LỌC · KÌM VI PHẪU & MÓC';
  if (tab.indexOf('LỌC · ') !== 0) tab = 'LỌC · ' + tab;
  const head = typeof p.head === 'string' ? wtJson_(p.head, []) : (p.head || []);
  const rows = typeof p.rows === 'string' ? wtJson_(p.rows, []) : (p.rows || []);
  if (!head.length) return { ok: false, error: 'Thiếu tiêu đề cột.' };
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName(tab);
  if (!sh) sh = ss.insertSheet(tab);
  sh.clear();
  const note = wtS_(p.note);
  sh.getRange(1, 1).setValue(note || ('Cập nhật ' + wtNow_()));
  sh.getRange(2, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#2C4A5E').setFontColor('#FFFFFF');
  const W = head.length, data = rows.map(function (r) { const a = r.slice(0, W); while (a.length < W) a.push(''); return a.map(function (c) { return c === null || c === undefined ? '' : c; }); });
  if (data.length) sh.getRange(3, 1, data.length, W).setValues(data);
  sh.setFrozenRows(2);
  try { if (sh.getFilter()) sh.getFilter().remove(); sh.getRange(2, 1, Math.max(data.length, 1) + 1, W).createFilter(); } catch (e) {}
  return { ok: true, tab: tab, n: data.length, url: 'https://docs.google.com/spreadsheets/d/' + id + '/edit#gid=' + sh.getSheetId() };
}

/** op=narrow (19/11/2026, người dùng: "chỉ cần KQTT + 2 file Excel, file cần Agent để Agent tải"): gói do tải hàng loạt đưa vào (info.bulk) còn Chờ tải
 *  ⇒ gói chưa có kết quả (tbmt:) = Không tải · gói có kết quả (kqdt:) = ghi đè loại tài liệu bằng want (mặc định kq, nt, hh, qd — qd chỉ ghi tên cho Agent). dry=1 chỉ đếm. */
function wtbNarrow_(p) {
  let want = wtWant_(wtbList_(p.want));
  if (!wtbList_(p.want).length) want = ['kq', 'nt', 'hh', 'qd'];
  const dry = wtTrue_(p.dry);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  const res = { off: 0, narrowed: 0, keep: 0, done: 0, work: 0 };
  try {
    const ss = wtBook_(), sh = wtSheet_(ss, WT.SH_H, WT.HH);
    wtHits_(ss).forEach(function (h) {
      if (!(h.info && h.info.bulk)) return;
      if (h.status === WT.ST.DONE || h.status === WT.ST.NOFILE) { res.done++; return; }
      if (h.status === WT.ST.WORK) { res.work++; return; }
      if (h.status !== WT.ST.WAIT) { res.keep++; return; }
      if (h.type === 'tbmt') { res.off++; if (!dry) { sh.getRange(h.row, 11).setValue(WT.ST.OFF); sh.getRange(h.row, 15).setValue('Chỉ tải kết quả: gói chưa có KQ'); } return; }
      res.narrowed++; if (!dry) sh.getRange(h.row, 7).setValue(wtInfoWant_(h.info, want));
    });
    if (!dry) { try { CacheService.getScriptCache().remove('wt_q'); } catch (e) {} }
  } finally { lock.releaseLock(); }
  return { ok: true, op: 'narrow', dry: dry, want: want, res: res };
}

/* ════════════════════════════════════════════════════════════════════
   TỰ ĐẶT TẢI HẰNG NGÀY GÓI VẬT TƯ Y TẾ (v1.2, 19/11/2026 — người dùng: "gói thầu vật tư y tế có kết quả cần được tải về;
   TBMT, KHLCNT tải về ngày hôm sau khi bật bot tải qua Agent")
   Gọi ở cuối mỗi wtTick (30 phút, dùng lại dữ liệu đã đọc). Gói vật tư (WTB.VT, mọi chủ đầu tư) có ngày tin ≥ mốc − 3 ngày:
     Kết quả ⇒ hàng đợi bot cloud (want kq · nt · hh · qd, pri 1 — sau địa bàn đã trao đổi, trước tồn đọng pri 3)
     TBMT / KHLCNT ⇒ hàng đợi CHỈ cho tiện ích trên máy có VNeGP Agent (info.ag = 1, bot cloud không nhận ⇒ không tốn phút GitHub)
   Gói đã có ⇒ wtReq_ (đã tải ⇒ bỏ qua). Mốc lưu Script Property WT_AUTO_FROM; kết quả lượt cuối WT_AUTO_LAST.
   Xem trước / chạy tay: botGrabInv op=auto (dry=1 chỉ đếm, from=yyyy-mm-dd ghi đè mốc).
   ════════════════════════════════════════════════════════════════════ */
function wtbAuto_(data, o) {
  o = o || {};
  const P = PropertiesService.getScriptProperties(), tz = 'Asia/Ho_Chi_Minh';
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  let mark = wtS_(o.from) || P.getProperty('WT_AUTO_FROM') || '';
  if (!mark) mark = Utilities.formatDate(new Date(Date.now() - 2 * 864e5), tz, 'yyyy-MM-dd');   // lần đầu: chỉ tin 2 ngày gần nhất (tồn đọng đặt riêng)
  const from = wtS_(o.from) || Utilities.formatDate(new Date(new Date(mark + 'T00:00:00+07:00').getTime() - WTB.AUTO.BACK_DAYS * 864e5), tz, 'yyyy-MM-dd');
  data = data || wtLoad_(wtBook_());
  const base = Object.assign({ re: '.', from: from, to: today }, wtbVtP_());
  // v1.3 (20/11/2026): ĐỊA BÀN MMH (MMH_WatchTarget.gs — BV mắt, Răng Hàm Mặt / nha khoa, khách CRM Surgical + Dental, BV có KQTT dao) ⇒ TBMT + Kết quả qua bot cloud, ưu tiên 0
  const TG = wttTargets_(), isT = function (r) { return wttLabels_(TG, r.inv).length > 0; };
  const LT = { kqdt: wttPick_(data, 'kqdt', from, today, TG), tbmt: wttPick_(data, 'tbmt', from, today, TG) };
  const L = {
    kqdt: wtbPick_(Object.assign({ types: 'kqdt' }, base), data).filter(function (r) { return !isT(r); }),
    tbmt: wtbPick_(Object.assign({ types: 'tbmt' }, base), data).filter(function (r) { return !isT(r); }),
    khmt: wtbPick_(Object.assign({ types: 'khmt' }, base), data)
  };
  const out = { ok: true, op: 'auto', from: from, to: today, target: { kqdt: LT.kqdt.length, tbmt: LT.tbmt.length }, n: { kqdt: L.kqdt.length, tbmt: L.tbmt.length, khmt: L.khmt.length } };
  if (o.dry) { out.sampleTarget = LT.kqdt.concat(LT.tbmt).slice(-20).map(function (r) { return [r.type, r.no, r.date, r.inv, wttLabels_(TG, r.inv).join(' · '), wtS_(r.name).slice(0, 90)]; }); out.sample = L.kqdt.concat(L.tbmt, L.khmt).slice(-15).map(function (r) { return [r.type, r.no, r.date, r.inv, wtS_(r.name).slice(0, 90)]; }); return out; }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) { out.busy = 1; return out; }
  try {
    const ss = wtBook_();
    out.resTarget = wttQueue_(ss, LT);
    out.res = {
      kqdt: wtbQueue_(ss, L.kqdt, { want: WTB.AUTO.kqdt, pri: WTB.AUTO.PRI, by: 'Tự động hằng ngày' }),
      tbmt: wtbQueue_(ss, L.tbmt, { want: WTB.AUTO.tbmt, pri: WTB.AUTO.PRI, ag: 1, by: 'Tự động hằng ngày' }),
      khmt: wtbQueue_(ss, L.khmt, { want: WTB.AUTO.khmt, pri: WTB.AUTO.PRI, ag: 1, by: 'Tự động hằng ngày' })
    };
  } finally { lock.releaseLock(); }
  P.setProperty('WT_AUTO_FROM', today);
  P.setProperty('WT_AUTO_LAST', JSON.stringify({ at: wtNow_(), from: from, target: out.target, resTarget: out.resTarget, n: out.n, res: out.res }));
  return out;
}

/** op=errs (chỉ đọc, 21/11/2026): gói đang Lỗi / Chờ tải — lý do, hình thức LCNT, số lần thử, địa bàn MMH hay không, vài ví dụ */
/** so bộ lọc tên gói v1 (trước 21/11/2026) với v2 trên tin thật [from, to] (mặc định 7 ngày) — chỉ đọc */
function wtbVtCmp_(p) {
  const tz = 'Asia/Ho_Chi_Minh', to = wtS_(p.to) || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const from = wtS_(p.from) && wtS_(p.from) !== '2026-01-01' ? wtS_(p.from) : Utilities.formatDate(new Date(Date.now() - 7 * 864e5), tz, 'yyyy-MM-dd');
  const OLD = { nameInc: 'vật tư|vtyt|dụng cụ|phẫu thuật|mắt|nhãn|tiêu hao|chỉ khâu|\\bdao\\b|kim|thủy tinh thể|thuỷ tinh thể|dịch kính|trang thiết bị y tế|thiết bị y tế|nha khoa|răng|nội nha|composite',
    nameExc: 'kiểm định|hiệu chuẩn|thuốc|dược liệu|vị thuốc|hóa chất|hoá chất|xét nghiệm|sửa chữa|bảo dưỡng|bảo trì|xây dựng|xây lắp|cải tạo|dịch vụ|\\bthuê|phần mềm|in ấn|văn phòng phẩm|thực phẩm|suất ăn|khí y tế|\\boxy|lọc máu|chạy thận|thận nhân tạo|x-quang|x quang|\\bphim|máy|hệ thống|vắc xin|vaccine|sinh phẩm',
    nameStrong: 'phẫu thuật|mắt|nhãn khoa|chỉ khâu|thủy tinh thể|thuỷ tinh thể|dịch kính|vật tư y tế|vật tư nha khoa|vật liệu nha khoa|răng hàm mặt|nội nha' };
  const OLDT = { nameExc: OLD.nameExc + '|bảo hiểm|tư vấn|giám sát|đồng phục|xăng|nhiên liệu|điện năng|vệ sinh|thu gom|rác thải|bảo vệ|mua sắm tài sản|ô tô|xe ',
    nameStrong: 'phẫu thuật|mắt|phaco|nhãn khoa|chỉ khâu|thủy tinh thể|thuỷ tinh thể|dịch kính|vật tư y tế|vật tư nha khoa|vật liệu nha khoa|nha khoa|răng hàm mặt|nội nha' };
  const fo = wtbNameFn_(OLD), fn = wtbNameFn1_(), fot = wtbNameFn_(OLDT), fnt = wtbNameFn_(wtbVtP_(true));
  const data = wtLoad_(wtBook_()), TG = wttTargets_(), seen = {};
  const out = { ok: true, from: from, to: to, total: 0, other: { old: 0, now: 0, add: [], drop: [] }, target: { old: 0, now: 0, add: [], drop: [] } };
  ['kqdt', 'tbmt'].forEach(function (type) {
    (data[type] || []).forEach(function (r) {
      const d = r.date || r.upd || '', b = wtBare_(r.no);
      if (!r.no || !d || d < from || d > to || seen[type + b]) return;
      seen[type + b] = 1; out.total++;
      const tg = wttLabels_(TG, r.inv).length > 0, o = tg ? fot(r.name) : fo(r.name), n = tg ? fnt(r.name) : fn(r.name), X = tg ? out.target : out.other;
      if (o) X.old++; if (n) X.now++;
      const row = [type === 'kqdt' ? 'KQ' : 'TBMT', b, d, wtS_(r.inv).slice(0, 45), wtS_(r.name).slice(0, 110)];
      if (n && !o && X.add.length < 60) X.add.push(row);
      if (o && !n && X.drop.length < 60) X.drop.push(row);
    });
  });
  return out;
}
function wtbNameFn1_() { return wtbNameFn_(wtbVtP_()); }

/** 21/11/2026: bot đã bỏ bộ lọc caseKHKQ (tìm được Chỉ định thầu rút gọn / Mua sắm trực tiếp)
 *  ⇒ đặt lại các gói Lỗi "Không tìm thấy số" về Chờ tải (số lần thử = 0). Không run=1 ⇒ chỉ đếm. */
function wtbRefind_(p) {
  const ss = wtBook_(), H = wtHits_(ss), re = /Không tìm thấy số/;
  const pick = H.filter(function (h) { return h.status === WT.ST.ERR && re.test(h.note); });
  const out = { ok: true, op: wtTrue_(p.run) ? 'run' : 'dry', total: pick.length, byType: {}, byForm: {} };
  pick.forEach(function (h) { out.byType[h.type] = (out.byType[h.type] || 0) + 1; const f = wtS_((h.info || {}).form) || '(không rõ)'; out.byForm[f] = (out.byForm[f] || 0) + 1; });
  if (!wtTrue_(p.run) || !pick.length) return out;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  try {
    const sh = wtSheet_(ss, WT.SH_H, WT.HH), n = sh.getLastRow() - 1;
    const rg = sh.getRange(2, 11, n, 5), v = rg.getValues();          // K Trạng thái … O Ghi chú
    let k = 0;
    v.forEach(function (r) {
      if (wtS_(r[0]) === WT.ST.ERR && re.test(wtS_(r[4]))) { r[0] = WT.ST.WAIT; r[2] = 0; r[4] = 'Tìm lại (bot đã sửa tìm kiếm 21/11/2026)'; k++; }
    });
    if (k) rg.setValues(v);
    out.reset = k;
  } finally { lock.releaseLock(); }
  try { CacheService.getScriptCache().removeAll(['wt_docs', 'wt_q']); } catch (e) {}
  return out;
}

function wtbErrs_(p) {
  const H = wtHits_(wtBook_()), T = wttTargets_(), out = { ok: true, err: 0, wait: 0, byNote: {}, byForm: {}, byTries: {}, byType: {}, target: 0, waitBy: {}, sample: [] };
  const cut = function (s) { return wtS_(s).replace(/IB\d{10}(-\d+)?|PL\d{10}/g, '#').slice(0, 70) || '(trống)'; };
  H.forEach(function (h) {
    const I = h.info || {}, tg = wttLabels_(T, h.investor).length > 0;
    if (h.status === WT.ST.WAIT) {
      out.wait++;
      const k = (I.ag ? 'máy Agent' : 'cloud') + ' · ưu tiên ' + (typeof I.pri === 'number' ? I.pri : '-') + ' · ' + h.type;
      out.waitBy[k] = (out.waitBy[k] || 0) + 1; return;
    }
    if (h.status !== WT.ST.ERR) return;
    out.err++; if (tg) out.target++;
    const n = cut(h.note), f = wtS_(I.form) || '(không rõ)';
    out.byNote[n] = (out.byNote[n] || 0) + 1;
    out.byForm[f] = (out.byForm[f] || 0) + 1;
    out.byTries[h.tries] = (out.byTries[h.tries] || 0) + 1;
    out.byType[h.type] = (out.byType[h.type] || 0) + 1;
    if (out.sample.length < 25) out.sample.push([h.no, h.type, h.tries, f, wtS_(h.investor).slice(0, 50), wtS_(h.name).slice(0, 60), cut(h.note)]);
  });
  return out;
}
