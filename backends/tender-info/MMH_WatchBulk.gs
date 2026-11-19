/* ════════════════════════════════════════════════════════════════════
   MMH_WatchBulk.gs v1.0 (19/11/2026, người dùng yêu cầu) — ĐẶT TẢI HÀNG LOẠT THEO NHÓM CHỦ ĐẦU TƯ + RÀ HÀNG HÓA THEO TỪ KHOÁ
   (khoá bot WT_BOT_KEY, gọi từ workflow "Theo dõi gói thầu — tải hàng loạt" ▸ tools/msc/bulk.mjs)

   botGrabInv {key, re, from, to, types, want, op: dry|run, max, mail}
     Đọc 3 tab dữ liệu Báo Đấu Thầu (wtLoad_) ⇒ gói có tên chủ đầu tư khớp re (mặc định "mắt", so chữ có dấu, không phân biệt hoa thường,
     nên "Răng Hàm Mặt" không khớp) · ngày tin trong [from, to] · loại trong types (mặc định kqdt + tbmt, KHÔNG lấy KHLCNT).
     Mỗi số TBMT 1 việc: có kết quả ⇒ khoá kqdt:<số>, chưa có ⇒ tbmt:<số> (bot mở cùng 1 trang gói: TBMT, HSMT, mở thầu, kết quả).
     Gói đã có trong GÓI TÌM THẤY (mọi loại trừ khmt, cùng số) ⇒ wtReq_ (đang tải / chờ tải ⇒ gộp loại tài liệu; đã tải ⇒ bỏ qua).
     want mặc định = mọi loại trừ kh. mail (tuỳ chọn, email công ty) = người theo dõi gói ⇒ thấy trong app. op=dry chỉ đếm.
     invs (tuỳ chọn, v1.1) = mảng tên chủ đầu tư đúng như Báo Đấu Thầu ⇒ chỉ lấy gói của các chủ đầu tư này (bỏ qua re).
   botGoodsScan {key, inc, exc, codes, re, from}
     Rà 2 file tổng hàng hóa trúng thầu (wtgData_, MMH_WatchMerge.gs): dòng có Danh mục / Hãng / Cấu hình chứa 1 cụm trong inc
     hoặc 1 mã trong codes (so không dấu, theo nguyên từ) và không chứa cụm trong exc ⇒ trả từng dòng (chỉ đọc).
   ════════════════════════════════════════════════════════════════════ */
const WTB = { MAX: 3000, WANT_DEF: ['tbmt', 'hsmt', 'mo', 'kq', 'nt', 'hh', 'qd'] };

function wtbList_(v) {
  if (Array.isArray(v)) return v.map(wtS_).filter(String);
  const s = wtS_(v);
  if (!s) return [];
  if (/^\[/.test(s)) { const j = wtJson_(s, []); return Array.isArray(j) ? j.map(wtS_).filter(String) : []; }
  return s.split(/[,;\n]/).map(wtS_).filter(String);
}

function wtbPick_(p) {
  const re = new RegExp(wtS_(p.re) || 'mắt', 'i');
  // invs = danh sách TÊN CHỦ ĐẦU TƯ đúng y như Báo Đấu Thầu (bulk.mjs đã đối chiếu, vd. bệnh viện từng có KQTT dao nhãn khoa) ⇒ thay cho re
  const IV = {}; wtbList_(p.invs).forEach(function (n) { IV[n.normalize('NFC').replace(/\s+/g, ' ').trim()] = 1; });
  const useIv = Object.keys(IV).length > 0;
  const from = wtS_(p.from) || '2026-01-01', to = wtS_(p.to) || '9999-12-31';
  const types = wtbList_(p.types).filter(function (t) { return t === 'kqdt' || t === 'tbmt'; });
  const T = types.length ? types : ['kqdt', 'tbmt'];
  const data = wtLoad_(wtBook_()), g = {};
  T.forEach(function (type) {
    (data[type] || []).forEach(function (r) {
      const inv = wtS_(r.inv).normalize('NFC');
      if (!r.no || !(useIv ? IV[inv.replace(/\s+/g, ' ').trim()] : re.test(inv))) return;
      const d = r.date || r.upd || '';
      if (!d || d < from || d > to) return;
      const b = wtBare_(r.no);
      if (!/^IB/.test(b)) return;
      const cur = g[b];
      if (!cur || (cur.type !== 'kqdt' && type === 'kqdt')) g[b] = r;
    });
  });
  return Object.keys(g).map(function (b) { return g[b]; }).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

function wtbGrabInv_(p) {
  if (wtS_(p.op) === 'narrow') return wtbNarrow_(p);
  const run = wtS_(p.op) === 'run', force = wtTrue_(p.force);
  const max = Math.min(+p.max || 2000, 5000);
  let want = wtWant_(wtbList_(p.want));
  if (!wtbList_(p.want).length) want = WTB.WANT_DEF.slice();
  const mail = wtS_(p.mail).toLowerCase();
  if (mail && !/@(manimedicalhanoi\.com|mani\.inc)$/.test(mail)) return { ok: false, error: 'mail phải là email công ty.' };
  const list = wtbPick_(p);
  const byInv = {}, byType = { kqdt: 0, tbmt: 0 }, byMonth = {};
  list.forEach(function (r) { byInv[r.inv] = (byInv[r.inv] || 0) + 1; byType[r.type]++; const m = String(r.date).slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; });
  const out = { ok: true, op: run ? 'run' : 'dry', want: want, total: list.length, byType: byType, byMonth: byMonth,
    byInv: Object.keys(byInv).map(function (k) { return [k, byInv[k]]; }).sort(function (a, b) { return b[1] - a[1]; }) };
  const ss = wtBook_(), H = wtHits_(ss), exBy = {};
  H.forEach(function (h) { if (h.type !== 'khmt') exBy[wtBare_(h.no)] = exBy[wtBare_(h.no)] || h; });
  const st = {}; let fresh = 0;
  list.forEach(function (r) { const h = exBy[wtBare_(r.no)]; if (h) st[h.status || '(trống)'] = (st[h.status || '(trống)'] || 0) + 1; else fresh++; });
  out.existing = st; out.fresh = fresh;
  out.sample = list.slice(-15).map(function (r) { return [r.type, r.no, r.date, r.inv, wtS_(r.name).slice(0, 90)]; });
  if (!run) return out;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  const me = { mail: mail, pic: 'Tải hàng loạt', local: wtLocal_(mail) };
  const res = { queued: 0, merged: 0, skipDone: 0, skipWork: 0, added: 0 };
  try {
    const sh = wtSheet_(ss, WT.SH_H, WT.HH), H2 = wtHits_(ss), ex2 = {}, now = wtNow_(), add = [];
    H2.forEach(function (h) { if (h.type !== 'khmt') ex2[wtBare_(h.no)] = ex2[wtBare_(h.no)] || h; });
    list.slice(0, max).forEach(function (r) {
      const h = ex2[wtBare_(r.no)];
      if (h) {
        const q = wtReq_(sh, h, me, want, force, !mail);
        if (!q.skip) res.queued++; else if (q.skip === 'wait') res.merged++; else if (q.skip === 'work') res.skipWork++; else res.skipDone++;
        return;
      }
      const info = { proj: wtS_(r.proj), price: wtS_(r.price), win: wtS_(r.win), winner: wtS_(r.winner), form: wtS_(r.form), open: wtS_(r.open), prov: wtS_(r.prov), n: 1, grab: 1, bulk: 1, by: me.pic, want: want };
      add.push([r.type + ':' + r.no, r.type, r.no, r.inv, r.invKey, wtS_(r.name).slice(0, 400), JSON.stringify(info), r.date || '', now, mail, WT.ST.WAIT, '[]', 0, now, '', '', r.type + '!' + r.row]);
    });
    if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, WT.HH.length).setValues(add);
    res.added = add.length;
    try { CacheService.getScriptCache().remove('wt_q'); } catch (e) {}
  } finally { lock.releaseLock(); }
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
