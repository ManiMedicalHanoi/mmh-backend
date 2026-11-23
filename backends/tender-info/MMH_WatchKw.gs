/* ════════════════════════════════════════════════════════════════════
   MMH_WatchKw.gs v1.0 (23/11/2026, người dùng yêu cầu) — XEM / THÊM TỪ KHOÁ SẢN PHẨM MMH TRÊN APP
   Nguồn duy nhất = tab "Từ khoá sản phẩm MMH" của file tổng "Kết quả trúng thầu - Tổng hợp danh mục hàng hóa" (MMH_WatchSuspect ▸ wtqKwLoad_).
   Dùng cho: tab SP liên quan · Nha khoa / Ngoại khoa & Nhãn khoa, báo cáo thầu buổi sáng (MMH_WatchRoute), đọc chữ HSMT (MMH_WatchText).
   App (phiên email công ty):
     wKw  {op: list}                       ⇒ { kw: [{kw, spec, groups, level, sp, noise, mail, apply, by, at, st, row}], groups: [[mã, chuyên khoa, tên, sản phẩm MMH]], today }
     wKwSave {op: add|edit|off|on|del, key (từ khoá cũ — edit/off/on/del), kw, spec, groups, level, sp, noise, mail}
       · add / sửa chữ từ khoá ⇒ "Áp dụng từ" = NGÀY HÔM SAU (người dùng: "thêm từ khoá thì bắt đầu tìm từ ngày hôm sau")
       · off = Tạm tắt · on = Đang dùng · del = quản lý hoặc người đã thêm (từ khoá Mặc định chỉ tạm tắt, không xoá)
   ════════════════════════════════════════════════════════════════════ */
const WTK = { SPEC: ['Nha khoa', 'Nhãn khoa', 'Ngoại khoa'], LEVEL: ['Cao', 'Trung bình', 'Thấp'] };

function wtkSheet_() {
  const book = wtmBook_('hh').book;
  wtqKwLoad_(book);   // tạo tab + cột mới nếu thiếu
  return book.getSheetByName(WTQ.KW_SHEET);
}
function wtkDay_(d) { return Utilities.formatDate(d || new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function wtkRows_(sh) {
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, WTQ.KW_HEAD.length).getValues().map(function (r, i) {
    const ap = r[7] instanceof Date ? wtkDay_(r[7]) : wtS_(r[7]), at = r[9] instanceof Date ? Utilities.formatDate(r[9], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm') : wtS_(r[9]);
    return { row: i + 2, kw: wtS_(r[0]), spec: wtS_(r[1]), groups: wtS_(r[2]), level: wtS_(r[3]), sp: wtS_(r[4]), noise: wtS_(r[5]),
      mail: !/^(không|no|0|false)$/i.test(wtS_(r[6])) && wtS_(r[6]) !== '' ? true : wtS_(r[6]) === '' ? (WTQ.LEVEL[wtS_(r[3])] || 0) >= 2 : false,
      apply: ap, by: wtS_(r[8]), at: at, st: wtS_(r[10]) || 'Đang dùng' };
  }).filter(function (x) { return x.kw; }) : [];
}
function wtkList_() {
  const sh = wtkSheet_();
  return { ok: true, today: wtkDay_(), kw: wtkRows_(sh), groups: WTQ_GROUPS, spec: WTK.SPEC, levels: WTK.LEVEL };
}
function wtkSave_(me, p) {
  const op = wtS_(p.op) || 'add', who = wtS_(me.pic) || wtS_(me.mail).split('@')[0] || 'App';
  const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY', error: 'Máy chủ đang bận — thử lại sau ít giây.' };
  try {
    const sh = wtkSheet_(), R = wtkRows_(sh), now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm');
    const tomorrow = wtkDay_(new Date(Date.now() + 864e5));
    const fk = function (s) { return wtqFold_(s).replace(/\s+/g, ' ').trim(); };
    const cur = R.filter(function (x) { return fk(x.kw) === fk(p.key || p.kw); })[0];
    const clean = function () {
      const kw = wtS_(p.kw).replace(/\s+/g, ' ').trim();
      if (kw.replace(/\*/g, '').length < 2) return { error: 'Từ khoá quá ngắn.' };
      const spec = String(p.spec || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(function (x) { return WTK.SPEC.indexOf(x) >= 0; });
      if (!spec.length) return { error: 'Chọn chuyên khoa (Nha khoa / Nhãn khoa / Ngoại khoa).' };
      const codes = {}; WTQ_GROUPS.forEach(function (g) { codes[g[0]] = 1; });
      const groups = String(p.groups || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(function (x) { return codes[x]; });
      const level = WTK.LEVEL.indexOf(wtS_(p.level)) >= 0 ? wtS_(p.level) : 'Trung bình';
      return { kw: kw, spec: spec.join('; '), groups: groups.join('; '), level: level, sp: wtS_(p.sp).slice(0, 300), noise: wtS_(p.noise).slice(0, 300),
        mail: wtTrue_(p.mail) || p.mail === undefined && (WTQ.LEVEL[level] || 0) >= 2 ? 'Có' : 'Không' };
    };
    if (op === 'add') {
      const c = clean(); if (c.error) return { ok: false, error: c.error };
      if (R.some(function (x) { return fk(x.kw) === fk(c.kw); })) return { ok: false, code: 'DUP', error: 'Từ khoá "' + c.kw + '" đã có trong danh sách.' };
      sh.getRange(sh.getLastRow() + 1, 1, 1, WTQ.KW_HEAD.length).setValues([[c.kw, c.spec, c.groups, c.level, c.sp, c.noise, c.mail, tomorrow, who, now, 'Đang dùng']]);
    } else {
      if (!cur) return { ok: false, error: 'Không tìm thấy từ khoá "' + wtS_(p.key || p.kw) + '".' };
      if (op === 'edit') {
        const c = clean(); if (c.error) return { ok: false, error: c.error };
        if (fk(c.kw) !== fk(cur.kw) && R.some(function (x) { return fk(x.kw) === fk(c.kw); })) return { ok: false, code: 'DUP', error: 'Từ khoá "' + c.kw + '" đã có trong danh sách.' };
        const ap = fk(c.kw) !== fk(cur.kw) ? tomorrow : (cur.apply || '');   // đổi chữ từ khoá ⇒ áp dụng lại từ ngày hôm sau
        sh.getRange(cur.row, 1, 1, WTQ.KW_HEAD.length).setValues([[c.kw, c.spec, c.groups, c.level, c.sp, c.noise, c.mail, ap, cur.by || who, now + ' · ' + who, cur.st]]);
      } else if (op === 'off' || op === 'on') {
        sh.getRange(cur.row, 10, 1, 2).setValues([[now + ' · ' + who, op === 'off' ? 'Tạm tắt' : 'Đang dùng']]);
      } else if (op === 'del') {
        if (cur.by === 'Mặc định') return { ok: false, error: 'Từ khoá mặc định (bộ KQTT) chỉ tạm tắt được, không xoá.' };
        if (!me.boss && cur.by !== who) return { ok: false, error: 'Chỉ người đã thêm hoặc quản lý mới xoá được.' };
        sh.deleteRow(cur.row);
      } else return { ok: false, error: 'op = add | edit | off | on | del' };
    }
    PropertiesService.getScriptProperties().setProperty('WTQ_DIRTY', '1');   // lượt gộp kế dựng lại 2 tab SP liên quan theo bộ từ khoá mới
    WTQ_KW = null;
  } finally { lock.releaseLock(); }
  const out = wtkList_(); out.saved = op; return out;
}
