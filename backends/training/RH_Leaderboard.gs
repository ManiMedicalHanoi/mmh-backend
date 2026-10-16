/* ════════════════════════════════════════════════════════════════════
   Training Hub · RH_Leaderboard.gs  (v1.0 — 16/10/2026, HUB v3.30)
   BẢNG XẾP HẠNG HỌC VIÊN (người dùng yêu cầu): mọi thành viên xem được ai đã hoàn thành khoá nào, ai đứng top.
   · action 'leaderboard' (auth 1, mọi người đăng nhập) ⇒ {items:[…], courses:{sid:{t,n}}, at}
   · Điểm = 100 × số chứng chỉ + 10 × số bài học đã xong (video ≥ 70%, tài liệu đọc hết trang).
   · Tính cả khoá không được giao (ai cũng học được mọi khoá, lấy chứng chỉ bất kỳ lúc nào).
   · Bỏ khoá đã huỷ (Cancel), tài khoản ngừng hoạt động, tên / email bắt đầu "TEST".
   · Chỉ đọc, đệm 10 phút (khoá 'lb'); dữ liệu thay đổi ⇒ thế hệ đệm 'enroll' / 'progress' đổi ⇒ đọc lại khi hết hạn.
   ════════════════════════════════════════════════════════════════════ */

var LB = { CERT_PTS: 100, LESSON_PTS: 10, TTL: 600 };

function apiLeaderboard(p, user) {
  var key = 'lb';
  var c = hubBool(p.fresh) ? null : hubCacheGet(key);
  if (c && c.at) return c;
  var out = hubLeaderboardBuild_();
  hubCachePut(key, out, LB.TTL);
  return out;
}

function hubLeaderboardBuild_() {
  var ses = {}, courses = {};
  (hubReadSessions() || []).forEach(function(s){ if (s && s.sid && s.status !== 'Cancel') ses[s.sid] = s; });
  var mon = hubFmt(new Date(), 'yyyy-MM');
  var by = {};
  hubReadUsers().forEach(function(u){
    if (!u.active || /^test/i.test(u.name || '') || /^test/i.test(hubPrefix(u.email))) return;
    by[hubPrefix(u.email)] = {k: hubPrefix(u.email), name: u.name || hubPrefix(u.email), dept: u.dept || '', pos: u.position || '',
      certs: 0, lessons: 0, mCerts: 0, mLessons: 0, last: '', done: [], run: {}};
  });
  hubReadEnrollment().forEach(function(e){
    var o = by[hubPrefix(e.email)], s = ses[e.sid];
    if (!o || !s || !(e.certUrl || (e.status === 'Completed' && e.pass))) return;
    o.certs++; o.done.push(e.sid);
    var at = e.completedAt || e.certSentAt;
    var d = at ? hubFmt(new Date(at), 'yyyy-MM-dd') : '';
    if (d && d.slice(0, 7) === mon) o.mCerts++;
    if (d > o.last) o.last = d;
    var cc = courses[e.sid] || (courses[e.sid] = {t: s.topic || '', n: 0});
    cc.n++;
  });
  hubReadProgress().forEach(function(x){
    var o = by[x.email];
    if (!o || !ses[x.sid] || !x.completed) return;
    o.lessons++; o.run[x.sid] = 1;
    var d = x.last ? x.last.slice(0, 10) : '';
    if (d && d.slice(0, 7) === mon) o.mLessons++;
    if (d > o.last) o.last = d;
  });
  var items = Object.keys(by).map(function(k){
    var o = by[k];
    o.pts = o.certs * LB.CERT_PTS + o.lessons * LB.LESSON_PTS;
    o.mPts = o.mCerts * LB.CERT_PTS + o.mLessons * LB.LESSON_PTS;
    o.learning = Object.keys(o.run).filter(function(sid){ return o.done.indexOf(sid) < 0; }).length;
    delete o.run;
    return o;
  }).filter(function(o){ return o.pts > 0; })
    .sort(function(a, b){ return (b.pts - a.pts) || (b.certs - a.certs) || (a.last < b.last ? 1 : -1); });
  var rank = 0, prev = null;
  items.forEach(function(o, i){ if (o.pts !== prev) { rank = i + 1; prev = o.pts; } o.rank = rank; });
  return {ok: true, at: new Date().toISOString(), month: mon, pts: {cert: LB.CERT_PTS, lesson: LB.LESSON_PTS},
          users: Object.keys(by).length, items: items, courses: courses};
}
