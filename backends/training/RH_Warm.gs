/* ════════════════════════════════════════════════════════════════════
   Training Hub · RH_Warm.gs  (v1.1 — 15/10/2026: bỏ khoá ghi — v1.0 làm thao tác ghi báo "bận")
   GIỮ BỘ NHỚ ĐỆM LUÔN "NÓNG" — người dùng mở app / mở khoá học không phải chờ máy chủ đọc Sheet / Drive.
   · Trigger hwWarm mỗi 5 phút (tự cài 1 lần qua hwTick_ trong hubDispatch, Script Property HW_TRIG):
       ① đọc lại các bảng dùng chung (buổi đào tạo, người dùng, ghi danh, tiến độ, bài KT, video, nhóm sản phẩm)
          rồi ghi đệm mới — sửa tay trên Sheet hiện lên app chậm nhất ~5 phút;
       ② danh sách tài liệu Drive của các khoá đang dùng (120 ngày trước → 45 ngày tới, không Cancel)
          — chỉ đọc khoá chưa có trong đệm, tối đa HW.MAT_MAX khoá / lượt.
   · Không đổi dữ liệu, không gửi email. Mọi thao tác GHI vẫn tự xoá đệm như trước (hubCacheClear).
   · Chạy tay trong trình soạn: hwWarm() — trả về tóm tắt.
   ════════════════════════════════════════════════════════════════════ */

var HW = { VER: '1', EVERY_MIN: 5, BUDGET_MS: 90000, MAT_MAX: 12, PAST_DAYS: 120, NEXT_DAYS: 45 };

/** Các bảng dùng chung: [khoá đệm, hàm đọc] */
function hwTables_() {
  return [
    ['sessions', function(){ return hubReadSessions(); }],
    ['users', function(){ return hubReadUsers(); }],
    ['enroll', function(){ return hubReadEnrollment(); }],
    ['progress', function(){ return hubReadProgress(); }],
    ['qcfg', function(){ return hubReadQuizConfigAll(); }],
    ['videos', function(){ return typeof hubReadVideos_ === 'function' ? hubReadVideos_() : null; }],
    ['smeta', function(){ return typeof hubMetaAll_ === 'function' ? hubMetaAll_() : null; }]
  ];
}

function hwWarm() {
  var t0 = Date.now(), out = { tables: 0, mats: 0, matsCached: 0, errors: [] };
  /* ★ v1.1 — KHÔNG dùng LockService (khoá ghi): v1.0 giữ khoá tới 150 giây ⇒ thao tác ghi của người dùng (tạo buổi, lưu tiến độ…)
     chờ 25 giây rồi báo "Hệ thống đang bận". Chống chạy chồng bằng cờ CacheService. */
  var sc = CacheService.getScriptCache();
  if (sc.get('hw:run')) return 'Lượt làm nóng trước chưa xong — bỏ qua.';
  sc.put('hw:run', String(t0), 240);
  try {
    HUB_CTX = { test: false, tester: null };
    /* ① bảng dùng chung: xoá đệm cũ rồi đọc lại ⇒ đệm mới đủ hạn tới lượt sau */
    hwTables_().forEach(function(t){
      try { delete HUB_MEM[t[0]]; hubCacheBust(t[0]); t[1](); out.tables++; }
      catch (e) { out.errors.push(t[0] + ': ' + e); }
    });
    /* ② tài liệu Drive của các khoá đang dùng — mới nhất trước */
    var now = new Date(), from = new Date(now.getTime() - HW.PAST_DAYS * 864e5), to = new Date(now.getTime() + HW.NEXT_DAYS * 864e5);
    var fromS = hubFmt(from, 'yyyy-MM-dd'), toS = hubFmt(to, 'yyyy-MM-dd');
    var list = (hubReadSessions() || []).filter(function(s){
      return s && s.sid && s.date && s.date >= fromS && s.date <= toS && s.status !== 'Cancel' && (s.folderUrl || s.folderName);
    }).sort(function(a, b){ return Math.abs(new Date(a.date) - now) - Math.abs(new Date(b.date) - now); });
    for (var i = 0; i < list.length && out.mats < HW.MAT_MAX; i++) {
      if (Date.now() - t0 > HW.BUDGET_MS) break;
      var s = list[i];
      try {
        if (hubCacheGet('mats:' + s.sid)) { out.matsCached++; continue; }
        var m = hubMaterialsDrive_(s, { noWait: true });
        if (m && !m.pending) out.mats++;
      } catch (e) { out.errors.push(s.sid + ': ' + e); }
    }
  } finally { try { sc.remove('hw:run'); } catch (e) {} }
  out.ms = Date.now() - t0;
  try { PropertiesService.getScriptProperties().setProperty('HW_LAST', JSON.stringify({ at: new Date().toISOString(), r: out })); } catch (e) {}
  if (out.errors.length) try { console.error('[hwWarm] ' + out.errors.join(' | ')); } catch (e) {}
  return out;
}

/** Cài trigger 1 lần (gọi từ hubDispatch, ≤ 1 lần thử / 10 phút) */
function hwTick_() {
  var P = PropertiesService.getScriptProperties();
  if (P.getProperty('HW_TRIG') === HW.VER) return;
  var last = Number(P.getProperty('HW_TRY') || 0); if (Date.now() - last < 10 * 60000) return;
  P.setProperty('HW_TRY', String(Date.now()));
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'hwWarm') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('hwWarm').timeBased().everyMinutes(HW.EVERY_MIN).create();
  P.setProperty('HW_TRIG', HW.VER);
}
