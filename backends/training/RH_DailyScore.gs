/**
 * ============================================================================
 *  ★ v3.48 (24/11/2026) — ĐIỂM HỌC + BẢNG XẾP HẠNG của app MMH Daily Podcast ("Học bài này")
 * ----------------------------------------------------------------------------
 *  Người dùng: mỗi người đăng nhập (phiên email `tk`, dùng chung Report Hub / CRM) làm bài kiểm tra nghe / nói theo ⇒ điểm lưu theo
 *  tài khoản; mọi người thấy bảng xếp hạng tuần / tháng và hoạt động gần đây (thi đua).
 *  Sheet DAILY_SCORES (Training Master): At · Date (số podcast) · Show · PIC · Dept · Quiz · QuizN · Speak (%) · Spoken · Words · Points · Rid · Plays
 *  Mỗi người · mỗi số podcast = 1 dòng; làm lại ⇒ cập nhật dòng đó, Points giữ LẦN CAO NHẤT (Plays + 1).
 *  Điểm = Quiz × 10 + Speak% ÷ 5 (khi có nói theo, tối đa 20) + 10 hoàn thành bài.
 *
 *  API (auth:0 — tự kiểm phiên):
 *    dailyScore  tk, date, show, quiz, quizN, speak, spoken, words, rid ⇒ { ok, points, best, rank }
 *    dailyBoard  tk, [period=week|month] ⇒ { ok, from, to, rows:[{pic, dept, points, lessons, quiz, quizN, speak, last}], me, recent:[…] }
 * ============================================================================
 */
var RH_DS = {
  SHEET: 'DAILY_SCORES',
  HEADER: ['At', 'Date', 'Show', 'PIC', 'Dept', 'Quiz', 'QuizN', 'Speak', 'Spoken', 'Words', 'Points', 'Rid', 'Plays'],
  TZ: 'Asia/Ho_Chi_Minh'
};
function rhdsSheet_() { return hubEnsureHeader(hubSheet(RH_DS.SHEET, true), RH_DS.HEADER); }
function rhdsNum_(v, lo, hi) { var n = Number(v); if (!isFinite(n)) n = 0; return Math.max(lo, Math.min(hi, Math.round(n))); }
function rhdsYmd_(d) { return Utilities.formatDate(d, RH_DS.TZ, 'yyyy-MM-dd'); }
function rhdsDate_(v) { if (v instanceof Date) return rhdsYmd_(v); var s = hubNorm(v); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; }
function rhdsRead_() {
  var sh = rhdsSheet_(), last = sh.getLastRow(); if (last < 2) return { sh: sh, rows: [] };
  var V = sh.getRange(2, 1, last - 1, RH_DS.HEADER.length).getValues(), rows = [];
  for (var i = 0; i < V.length; i++) {
    var r = V[i]; if (!hubNorm(r[3])) continue;
    rows.push({ row: i + 2, at: r[0] instanceof Date ? r[0].toISOString() : hubNorm(r[0]), date: rhdsDate_(r[1]), show: hubNorm(r[2]), pic: hubNorm(r[3]), dept: hubNorm(r[4]),
      quiz: Number(r[5]) || 0, quizN: Number(r[6]) || 0, speak: r[7] === '' ? null : Number(r[7]), spoken: Number(r[8]) || 0, words: Number(r[9]) || 0, points: Number(r[10]) || 0,
      rid: hubNorm(r[11]), plays: Number(r[12]) || 1 });
  }
  return { sh: sh, rows: rows };
}
function rhdsPoints_(quiz, speak, spoken) { return quiz * 10 + (spoken > 0 && speak != null ? Math.min(20, Math.round(speak / 5)) : 0) + 10; }

function apiDailyScore(p) {
  var a = rhCheck(p.tk);
  if (a.err) return { ok: false, code: 'AUTH', error: a.err + ' Vui lòng đăng nhập bằng email công ty.' };
  var u = a.u, date = hubNorm(p.date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Thiếu ngày của số podcast.' };
  var quizN = rhdsNum_(p.quizN, 0, 20), quiz = rhdsNum_(p.quiz, 0, quizN), spoken = rhdsNum_(p.spoken, 0, 30);
  var speak = spoken > 0 && p.speak !== '' && p.speak != null ? rhdsNum_(p.speak, 0, 100) : null, words = rhdsNum_(p.words, 0, 50);
  var pts = rhdsPoints_(quiz, speak, spoken), rid = hubNorm(p.rid).slice(0, 40);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var R = rhdsRead_(), now = new Date();
    if (rid) { var dup = R.rows.filter(function (x) { return x.rid === rid; })[0]; if (dup) return { ok: true, points: dup.points, best: dup.points, dup: true }; }
    var mine = R.rows.filter(function (x) { return x.date === date && rhaSame(x.pic, u.pic); })[0];
    var vals = [now, date, hubNorm(p.show).slice(0, 40), u.pic, hubNorm(u.dept || ''), quiz, quizN, speak == null ? '' : speak, spoken, words, pts, rid, 1];
    var best = pts;
    if (mine) {
      best = Math.max(mine.points, pts);
      if (pts < mine.points) { vals[5] = mine.quiz; vals[7] = mine.speak == null ? '' : mine.speak; vals[8] = mine.spoken; }   // giữ lần cao nhất
      vals[9] = Math.max(mine.words, words); vals[10] = best; vals[12] = mine.plays + 1;
      R.sh.getRange(mine.row, 1, 1, vals.length).setValues([vals]);
    } else R.sh.appendRow(vals);
  } finally { lock.releaseLock(); }
  try { CacheService.getScriptCache().remove('dsb_week'); CacheService.getScriptCache().remove('dsb_month'); } catch (e) {}
  var b = rhdsBoard_('week'), rank = 0;
  b.rows.forEach(function (r, i) { if (rhaSame(r.pic, u.pic)) rank = i + 1; });
  return { ok: true, points: pts, best: best, rank: rank, of: b.rows.length };
}

function rhdsRange_(period) {
  var t = new Date(Utilities.formatDate(new Date(), RH_DS.TZ, "yyyy-MM-dd'T'00:00:00"));
  var from;
  if (period === 'month') from = new Date(t.getFullYear(), t.getMonth(), 1);
  else { var dow = (t.getDay() + 6) % 7; from = new Date(t.getTime() - dow * 864e5); }   // thứ Hai
  var to = period === 'month' ? new Date(t.getFullYear(), t.getMonth() + 1, 0) : new Date(from.getTime() + 6 * 864e5);
  return { from: rhdsYmd_(from), to: rhdsYmd_(to) };
}
function rhdsBoard_(period) {
  var c = CacheService.getScriptCache(), key = 'dsb_' + period, hit = c.get(key);
  if (hit) return JSON.parse(hit);
  var rg = rhdsRange_(period), R = rhdsRead_().rows, by = {};
  // ngày làm bài (At) nằm trong kỳ — tính cả bài của số cũ làm bù trong tuần
  R.forEach(function (x) {
    var d = x.at ? rhdsYmd_(new Date(x.at)) : x.date; if (d < rg.from || d > rg.to) return;
    var k = x.pic.toLowerCase(), o = by[k] || (by[k] = { pic: x.pic, dept: x.dept, points: 0, lessons: 0, quiz: 0, quizN: 0, spk: 0, spkN: 0, last: '' });
    o.points += x.points; o.lessons++; o.quiz += x.quiz; o.quizN += x.quizN;
    if (x.speak != null && x.spoken > 0) { o.spk += x.speak; o.spkN++; }
    if (x.at > o.last) o.last = x.at;
  });
  var rows = Object.keys(by).map(function (k) { var o = by[k]; return { pic: o.pic, dept: o.dept, points: o.points, lessons: o.lessons, quiz: o.quiz, quizN: o.quizN, speak: o.spkN ? Math.round(o.spk / o.spkN) : null, last: o.last }; })
    .sort(function (a, b) { return b.points - a.points || b.lessons - a.lessons || (a.last < b.last ? -1 : 1); });
  var recent = R.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).slice(0, 25)
    .map(function (x) { return { pic: x.pic, date: x.date, show: x.show, quiz: x.quiz, quizN: x.quizN, speak: x.speak, points: x.points, at: x.at, plays: x.plays }; });
  var out = { from: rg.from, to: rg.to, rows: rows, recent: recent };
  try { c.put(key, JSON.stringify(out), 120); } catch (e) {}
  return out;
}
function apiDailyBoard(p) {
  var a = rhCheck(p.tk);
  if (a.err) return { ok: false, code: 'AUTH', error: a.err + ' Vui lòng đăng nhập bằng email công ty.' };
  var period = p.period === 'month' ? 'month' : 'week', b = rhdsBoard_(period);
  return { ok: true, period: period, from: b.from, to: b.to, rows: b.rows, recent: b.recent, me: a.u.pic };
}
